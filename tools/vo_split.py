#!/usr/bin/env python3
"""
One long recording of several voice lines, read one after another, cut into one clip per line.

    ~/.cache/crown-quest/venv/bin/python tools/vo_split.py recording.mp3 vo030 vo031 vo032 ...
    ~/.cache/crown-quest/venv/bin/python tools/vo_split.py recording.mp3 --check vo030 vo031 ...

The ids are the lines of tools/vo_script.json in the order they are read in the recording. The offline
speech recogniser (Vosk: docs/VOICEOVER.md, "Word timings"; it must be installed) hears the recording,
its words are matched to the lines' words in that order, each line runs from its first word to its last,
and the cut between two lines is made in the quietest moment between them. Each clip keeps at most
0.35 s of quiet before its first word and 0.5 s after its last, like the studio's own clips.

The recording is brought to the loudness of the clips already in the game (the median of assets/vo/),
with a limiter so nothing distorts. The clips go to tools/split_out/ (voNNN.mp3) and are zipped as
tools/split_out/split.zip; then, into the game:

    ~/.cache/crown-quest/venv/bin/python tools/vo_build.py tools/split_out/split.zip

--check only reports where each line was found and how well it was heard. It stops without cutting
when a line was heard poorly (less than half its words) or lines are out of order: check the recording
and the ids. (Written 2026-11-18 for the user's recording of the 51 lines the studio couldn't make.)
"""
import json
import os
import re
import statistics
import subprocess
import sys
import zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "tools"))
import vo_timing as T  # noqa: E402

OUT = os.path.join(ROOT, "tools", "split_out")  # (not studio_out: vo_studio.mjs would take these for its own)


def lufs(path):
    """Integrated loudness (LUFS) of an audio file (ffmpeg's ebur128)."""
    err = subprocess.run(["ffmpeg", "-v", "info", "-i", path, "-af", "ebur128=framelog=quiet", "-f", "null", "-"], capture_output=True, text=True).stderr
    m = re.findall(r"^\s+I:\s+(-?[\d.]+) LUFS", err, re.M)
    return float(m[-1]) if m else None


def main(args):
    check = "--check" in args
    args = [a for a in args if a != "--check"]
    if len(args) < 2:
        sys.exit(__doc__)
    src, ids = args[0], args[1:]
    script = {e["id"]: e for e in json.load(open(os.path.join(ROOT, "tools", "vo_script.json"), encoding="utf-8"))}
    unknown = [i for i in ids if i not in script]
    if unknown:
        sys.exit("No such line in tools/vo_script.json: " + " ".join(unknown))
    if not T.models():
        sys.exit("The recogniser (Vosk) is not installed: see docs/VOICEOVER.md, \"Word timings\".")

    samples = T.decode(src)
    dur = len(samples) / T.SR
    toks, owner = [], []
    for li, vid in enumerate(ids):
        for w in script[vid]["line"].split():
            for t in T.spoken(w):
                if T.norm(t):
                    toks.append(T.norm(t))
                    owner.append(li)
    best = None
    for model in T.models():
        got = T.heard(samples, model)
        pairs, score = T.match(toks, [T.norm(g[0]) for g in got])
        if best is None or score > best[0]:
            best = (score, pairs, got)
    _, pairs, got = best

    lines, ok = [], True
    for li, vid in enumerate(ids):
        mine = sorted(j for i, j in pairs.items() if owner[i] == li)
        n = sum(1 for o in owner if o == li)
        L = {"id": vid, "n": n, "hit": len(mine), "t0": got[mine[0]][1] if mine else None, "t1": got[mine[-1]][2] if mine else None}
        lines.append(L)
        good = L["t0"] is not None and L["hit"] >= max(1, 0.5 * n)
        ok = ok and good
        print("%s%s heard %d/%d  %s–%s  %s" % ("" if good else "!! ", vid, L["hit"], n, "%.2f" % L["t0"] if L["t0"] is not None else "-",
                                           "%.2f" % L["t1"] if L["t1"] is not None else "-", script[vid]["line"]))
    db = T.loudness(samples)
    cuts = []
    for k in range(len(lines) - 1):
        a, b = lines[k]["t1"], lines[k + 1]["t0"]
        if a is None or b is None or b <= a:
            print("!! %s and %s run into each other" % (lines[k]["id"], lines[k + 1]["id"]))
            ok = False
            cuts.append(None)
            continue
        i0, i1 = int(a / T.HOP), max(int(a / T.HOP) + 1, int(b / T.HOP))
        seg = db[i0:i1] or [0]
        cuts.append((i0 + min(range(len(seg)), key=lambda i: seg[i])) * T.HOP)
    if not ok:
        sys.exit("Not cut: check the recording and the order of the ids.")
    if check:
        print("Found every line (--check: nothing cut).")
        return

    # the game's own loudness: the median of the clips already in it
    have = sorted(f for f in os.listdir(T.VO_DIR) if f.endswith(".ogg"))
    sample = [os.path.join(T.VO_DIR, f) for f in have[:: max(1, len(have) // 25)]]
    target = statistics.median([v for v in (lufs(p) for p in sample) if v is not None]) if sample else -16.5
    gain = target - (lufs(src) or target)
    print("loudness: recording %.1f LUFS, the game's clips %.1f LUFS: %+.1f dB" % (target - gain, target, gain))

    os.makedirs(OUT, exist_ok=True)
    made = []
    for k, L in enumerate(lines):
        a = cuts[k - 1] if k > 0 else 0.0
        b = cuts[k] if k < len(cuts) else dur
        s, e = max(a, L["t0"] - 0.35), min(b, L["t1"] + 0.5)
        mp3 = os.path.join(OUT, L["id"] + ".mp3")
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", "%.3f" % s, "-to", "%.3f" % e, "-i", src, "-ac", "1",
                        "-af", "volume=%.2fdB,alimiter=limit=0.84:level=false,afade=t=in:d=0.02,areverse,afade=t=in:d=0.04,areverse" % gain,
                        "-c:a", "libmp3lame", "-q:a", "2", mp3], check=True)
        made.append(mp3)
        print("%s  %.2f–%.2f s  (%.2f s)" % (L["id"], s, e, e - s))
    z = os.path.join(OUT, "split.zip")
    with zipfile.ZipFile(z, "w") as zf:
        for p in made:
            zf.write(p, os.path.basename(p))
    print("\n%d clips in tools/split_out/. Into the game:\n  ~/.cache/crown-quest/venv/bin/python tools/vo_build.py tools/split_out/split.zip" % len(made))


if __name__ == "__main__":
    main(sys.argv[1:])
