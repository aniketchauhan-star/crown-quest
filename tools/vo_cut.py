#!/usr/bin/env python3
"""
A voice line made from the start (or, since 2026-11-23, the end) of another line's recording, when the
new line is that recording's opening (or last) sentence, word for word (2026-11-18: practice's steps are said by themselves now, "Subtract 6 from
both sides.", and they open the recorded hints "Subtract 6 from both sides. What is 17 − 6?"; "17 − 6 = 11."
opens "17 − 6 = 11. Type 11."; "Not quite." opens "Not quite. Try the other one."). The same voice, with
no new recording.

    python3 tools/vo_cut.py          the lines of tools/vo_script.json with "from" and no clip yet
    python3 tools/vo_cut.py vo384    those lines only (made again even if they have a clip)

Each such line has "from": the id of the recording it comes from. That recording's words are timed
(js/vo_lines.js, from tools/vo_timing.py), so the cut goes in the pause between the new line's last word
and the next one (found by its sound: 0.3 s after the voice stops, or the pause's middle), with a short
fade. The source is
the recording as it was cut from the long one (tools/split_out/voNNN.mp3, tools/vo_split.py), or else
the game's own clip (assets/vo/voNNN.ogg). Its loudness is kept as it is (it is the game's already).
The clips go to tools/split_out/ and are zipped as tools/split_out/cut.zip; then, into the game:

    ~/.cache/crown-quest/venv/bin/python tools/vo_build.py tools/split_out/cut.zip
"""
import json
import os
import re
import subprocess
import sys
import zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "tools"))
import vo_timing as T  # noqa: E402

OUT = os.path.join(ROOT, "tools", "split_out")
MAP = os.path.join(ROOT, "js", "vo_lines.js")
TAIL = 0.5  # s kept after the last word at most (when no clear pause is found)
QUIET = -55.0  # dB: quieter than this, the voice has stopped


def word_times():
    """{clip id: [start, end, start, end…]} from js/vo_lines.js."""
    out = {}
    for m in re.finditer(r'^\s*(".*?"):\s*\["(vo\d+)",\s*[\d.]+,\s*\[([^\]]*)\]\],?\s*$', open(MAP, encoding="utf-8").read(), re.M):
        out[m.group(2)] = [float(x) for x in m.group(3).split(",") if x.strip()]
    return out


def main(args):
    script = json.load(open(os.path.join(ROOT, "tools", "vo_script.json"), encoding="utf-8"))
    by_id = {e["id"]: e for e in script}
    todo = [by_id[a] for a in args] if args else [e for e in script if e.get("from") and not os.path.exists(os.path.join(T.VO_DIR, e["id"] + ".ogg"))]
    todo = [e for e in todo if e.get("from")]
    if not todo:
        print("Nothing to cut.")
        return
    times = word_times()
    os.makedirs(OUT, exist_ok=True)
    made = []
    for e in todo:
        src_e = by_id[e["from"]]
        words, src_words = e["line"].split(), src_e["line"].split()
        n = len(words)
        head = src_words[:n] == words and n < len(src_words)
        tail = src_words[-n:] == words and n < len(src_words)
        if not (head or tail):
            sys.exit("%s is neither the start nor the end of %s: %r / %r" % (e["id"], src_e["id"], e["line"], src_e["line"]))
        W = times.get(src_e["id"])
        if not W or len(W) != 2 * len(src_words):
            sys.exit("%s has no word timings in js/vo_lines.js" % src_e["id"])
        src = os.path.join(OUT, src_e["id"] + ".mp3")
        if not os.path.exists(src):
            src = os.path.join(T.VO_DIR, src_e["id"] + ".ogg")
        if not head:
            # The end of the recording (its last sentence, design review of 2026-11-23: a line of two
            # sentences said as two lines). The cut goes in the pause before the new line's first word:
            # the last run of quiet between the word before it and its start, a little before the voice
            # starts again (0.12 s, or the pause's middle, whichever is later), with a short fade in.
            k = len(src_words) - n
            a, b = W[2 * k - 1], W[2 * k]
            db = T.loudness(T.decode(src))
            lo, hi = int(W[2 * k - 2] / T.HOP), int(b / T.HOP)
            runs, start = [], None
            for i in range(lo, hi + 1):
                quiet = i < hi and i < len(db) and db[i] <= QUIET
                if quiet and start is None:
                    start = i
                elif not quiet and start is not None:
                    runs.append((start, i))
                    start = None
            runs = [r for r in runs if (r[1] - r[0]) * T.HOP >= 0.08]
            if runs:
                s0, s1 = runs[-1][0] * T.HOP, runs[-1][1] * T.HOP
                begin = max(s1 - 0.12, (s0 + s1) / 2)
            else:
                i0, i1 = int(a / T.HOP), max(int(a / T.HOP) + 1, hi)
                seg = db[i0:i1] or [0]
                begin = min(b - 0.05, (i0 + min(range(len(seg)), key=lambda i: seg[i])) * T.HOP)
            mp3 = os.path.join(OUT, e["id"] + ".mp3")
            subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", "%.3f" % begin, "-i", src, "-ac", "1",
                            "-af", "afade=t=in:d=0.04", "-c:a", "libmp3lame", "-q:a", "2", mp3], check=True)
            made.append(mp3)
            print("%s  from %s, %.2f s to the end (its first word at %.2f s)  %s" % (e["id"], src_e["id"], begin, b, e["line"]))
            continue
        # The cut goes in the pause before the next word: the last run of quiet (under QUIET dB, at least
        # 0.08 s) between the start of the new line's last word and the next word's start, 0.3 s after
        # the voice stops or in the middle of the pause, whichever is earlier (a word's timed end often
        # runs on into the pause, so the pause is found by its sound). With no clear pause: the quietest
        # moment between the last word's timed end and the next word.
        a, b = W[2 * n - 1], W[2 * n]
        db = T.loudness(T.decode(src))
        lo, hi = int(W[2 * n - 2] / T.HOP), int(b / T.HOP)
        runs, start = [], None
        for i in range(lo, hi + 1):
            quiet = i < hi and i < len(db) and db[i] <= QUIET
            if quiet and start is None:
                start = i
            elif not quiet and start is not None:
                runs.append((start, i))
                start = None
        runs = [r for r in runs if (r[1] - r[0]) * T.HOP >= 0.08]
        if runs:
            s0, s1 = runs[-1][0] * T.HOP, runs[-1][1] * T.HOP
            end = min(s0 + 0.3, (s0 + s1) / 2)
        else:
            i0, i1 = int(a / T.HOP), max(int(a / T.HOP) + 1, hi)
            seg = db[i0:i1] or [0]
            end = max(a + 0.08, min((i0 + min(range(len(seg)), key=lambda i: seg[i])) * T.HOP, a + TAIL))
        mp3 = os.path.join(OUT, e["id"] + ".mp3")
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", src, "-t", "%.3f" % end, "-ac", "1",
                        "-af", "areverse,afade=t=in:d=0.04,areverse", "-c:a", "libmp3lame", "-q:a", "2", mp3], check=True)
        made.append(mp3)
        print("%s  from %s, 0–%.2f s (its next word at %.2f s)  %s" % (e["id"], src_e["id"], end, b, e["line"]))
    z = os.path.join(OUT, "cut.zip")
    with zipfile.ZipFile(z, "w") as zf:
        for p in made:
            zf.write(p, os.path.basename(p))
    print("\n%d clips in tools/split_out/. Into the game:\n  ~/.cache/crown-quest/venv/bin/python tools/vo_build.py tools/split_out/cut.zip" % len(made))


if __name__ == "__main__":
    main(sys.argv[1:])
