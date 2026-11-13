#!/usr/bin/env python3
"""Makes the game's recorded sound effects from the recordings in art/audio/ (needs ffmpeg).
(art/ was taken out of the folder on 2026-11-13 to keep it small: bring it back first, README.md,
"Replace the artwork".)

- art/audio/snore.mp3 -> assets/audio/grumble-snore-1.mp3 ... (one file per snore): the recording is
  cut on its silences into its snores, each a snore in, a pause and a snore out, and each is levelled
  to -20 LUFS (under the voice). It prints each snore's timing: paste the list into `snores` in the
  `audio` section of js/content.js (Grumble's breathing follows each sound: js/world.js, sleep).
- art/audio/monkey laugh.mp3 -> assets/audio/zippy-win-laugh.mp3: Zippy's laugh when he wins a crown,
  short (review, 2026-11-13: "reduce the timing of Zippy's laugh"): its run of loud "ha"s, from 0.55 s
  (after the quiet first ones) to 3.32 s (a gap between two "ha"s), the last two faded out from 2.85 s,
  2.77 s in all, levelled to -16 LUFS. (It was the first 5.6 s, with the tail of chuckles.)
- art/audio/wood ring.mp3 -> assets/audio/alarm-wood-ring.mp3: the treasure room's alarm when the balance
  tips (a wrong swap, and the intro's "what if" cloud): its one wooden strike, struck twice 0.42 s apart
  (RING! RING!), levelled to -17 LUFS.

Run from the project folder:  python3 tools/make_sounds.py
"""
import json
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "art" / "audio"
OUT = ROOT / "assets" / "audio"


def run(args):
    return subprocess.run(args, capture_output=True, text=True, check=True)


def loudness(path, start=None, dur=None):
    """Integrated loudness (LUFS) of a file, or of a stretch of it."""
    args = ["ffmpeg", "-hide_banner", "-nostats"]
    if start is not None:
        args += ["-ss", f"{start:.3f}", "-t", f"{dur:.3f}"]
    args += ["-i", str(path), "-af", "ebur128", "-f", "null", "-"]
    out = run(args).stderr
    vals = re.findall(r"I:\s+(-?[\d.]+) LUFS", out)
    return float(vals[-1])


def true_peak(path):
    out = run(["ffmpeg", "-hide_banner", "-nostats", "-i", str(path), "-af", "ebur128=peak=true", "-f", "null", "-"]).stderr
    return float(re.findall(r"Peak:\s+(-?[\d.]+) dBFS", out)[-1])


def make(src, dst, start, dur, target, fade_from=None, mono=True, rate=44100):
    """Cut [start, start + dur], level it to `target` LUFS, keep its peaks under -1 dBFS once encoded
    (a clip whose sharp snorts still poke over is made a little quieter), write MP3."""
    gain = target - loudness(src, start, dur)
    for _ in range(3):
        encode(src, dst, start, dur, gain, fade_from, mono, rate)
        over = true_peak(dst) + 1.0
        if over <= 0:
            return
        gain -= over + 0.1


def encode(src, dst, start, dur, gain, fade_from, mono, rate):
    filters = [f"volume={gain:.2f}dB", "alimiter=limit=0.66:level=false", "afade=t=in:d=0.03"]
    if fade_from is not None:
        filters.append(f"afade=t=out:st={fade_from - start:.3f}:d={start + dur - fade_from:.3f}")
    else:
        filters.append(f"afade=t=out:st={max(0.0, dur - 0.08):.3f}:d=0.08")
    args = ["ffmpeg", "-v", "error", "-y", "-ss", f"{start:.3f}", "-t", f"{dur:.3f}", "-i", str(src), "-af", ",".join(filters)]
    args += ["-ac", "1" if mono else "2", "-ar", str(rate), "-c:a", "libmp3lame", "-q:a", "4", str(dst)]
    run(args)


def snores():
    src = SRC / "snore.mp3"
    out = run(["ffmpeg", "-hide_banner", "-nostats", "-i", str(src), "-af", "silencedetect=noise=-42dB:d=0.25", "-f", "null", "-"]).stderr
    total = float(re.search(r"Duration: (\d+):(\d+):([\d.]+)", out).groups()[2]) + 60 * int(re.search(r"Duration: (\d+):(\d+)", out).groups()[1])
    starts = [float(x) for x in re.findall(r"silence_start: ([\d.]+)", out)]
    ends = [float(x) for x in re.findall(r"silence_end: ([\d.]+)", out)]
    # the sounds between the silences: a snore in, then its snore out
    sounds, t = [], 0.0
    for s, e in zip(starts, ends + [total]):
        if s > t + 0.05:
            sounds.append((t, s))
        t = e
    if t < total - 0.05:
        sounds.append((t, total))
    timing = []
    for k in range(0, len(sounds) - 1, 2):
        (a, _), (o, b) = sounds[k], sounds[k + 1]
        start, end = max(0.0, a - 0.05), b + 0.15
        n = k // 2 + 1
        make(src, OUT / f"grumble-snore-{n}.mp3", start, end - start, -20.0, rate=24000)
        timing.append({"cue": f"grumble.snore{n}", "out": round(o - start, 2), "len": round(end - start, 2)})
    return timing


def laugh():
    make(SRC / "monkey laugh.mp3", OUT / "zippy-win-laugh.mp3", 0.55, 2.77, -16.0, fade_from=2.85)


def alarm():
    src = SRC / "wood ring.mp3"
    one = OUT / "_strike.wav"
    two = OUT / "_rings.wav"
    # the strike, from just before it to the end of its ring (the rest of the file is silence)
    run(["ffmpeg", "-v", "error", "-y", "-ss", "0.08", "-t", "0.72", "-i", str(src), "-af", "afade=t=out:st=0.6:d=0.12", "-ac", "1", "-ar", "44100", str(one)])
    # struck twice, 0.42 s apart
    run(["ffmpeg", "-v", "error", "-y", "-i", str(one), "-i", str(one), "-filter_complex", "[1]adelay=420|420[b];[0][b]amix=inputs=2:duration=longest:normalize=0", str(two)])
    make(two, OUT / "alarm-wood-ring.mp3", 0.0, 1.14, -17.0)
    one.unlink()
    two.unlink()


if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    t = snores()
    laugh()
    alarm()
    print("snores:", json.dumps(t))
    sys.exit(0)
