#!/usr/bin/env python3
"""
Zippy's Crown Quest: makes the game's pictures small, so it loads quickly on any device.

Every PNG and JPEG picture the game uses (named in assets/sprites.js or styles.css) is saved again as
WebP, and the game is pointed at the WebP:
- pictures with transparency (sprite sheets, props, interface pieces, background layers): quality 88,
  with their transparency kept exactly;
- fully opaque pictures (the start screen): quality 85.
Side by side, the WebP looks the same as the PNG, at about a quarter of its size. (On 2026-11-13 the
characters' big sprite sheets and a few background layers were saved again at quality 80 to make the
folder smaller: they measured 0.985-0.999 SSIM against quality 88, i.e. the same to the eye. The
interface pieces, the balance, the title's logo, crown and Grumble stayed at 88, where the difference
could show.) If a WebP comes out
bigger than its original (it can, for a tiny picture), the original is kept.

Needs cwebp (brew install webp). tools/prepare_assets.py runs this at its end; it can also be run on its
own: python3 tools/compress_assets.py
"""
import os
import re
import shutil
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SPRITES_JS = os.path.join(ROOT, "assets", "sprites.js")
STYLES = os.path.join(ROOT, "styles.css")
PICTURE = re.compile(r"assets/[A-Za-z0-9_./-]+\.(?:png|jpg|jpeg)")


def has_alpha(path):
    """True if a PNG has an alpha channel (a JPEG never does)."""
    if not path.lower().endswith(".png"):
        return False
    with open(path, "rb") as f:
        head = f.read(26)
    return head[25] in (4, 6)  # colour type: grey + alpha, or RGBA


def to_webp(src, dst):
    if has_alpha(src):
        opts = ["-q", "88", "-alpha_q", "100"]
    else:
        opts = ["-q", "85"]
    r = subprocess.run(["cwebp", "-quiet", "-m", "6", "-sharp_yuv", *opts, src, "-o", dst], capture_output=True, text=True)
    return r.returncode == 0 and os.path.exists(dst)


def main():
    if not shutil.which("cwebp"):
        print("compress: cwebp not found (brew install webp): the pictures stay as they are")
        return 0
    texts = {p: open(p, encoding="utf-8").read() for p in (SPRITES_JS, STYLES)}
    paths = sorted({m for t in texts.values() for m in PICTURE.findall(t)})
    renamed, before, after = {}, 0, 0
    for rel in paths:
        src = os.path.join(ROOT, rel)
        if not os.path.exists(src):
            print(f"compress: {rel} is named but missing")
            continue
        dst_rel = os.path.splitext(rel)[0] + ".webp"
        dst = os.path.join(ROOT, dst_rel)
        size = os.path.getsize(src)
        if not to_webp(src, dst):
            print(f"compress: could not convert {rel}")
            continue
        new = os.path.getsize(dst)
        if new >= size:  # a tiny picture can come out bigger: keep the original
            os.remove(dst)
            before += size
            after += size
            continue
        os.remove(src)
        renamed[rel] = dst_rel
        before += size
        after += new
    for p, t in texts.items():
        for old, new in renamed.items():
            t = t.replace(old, new)
        with open(p, "w", encoding="utf-8") as f:
            f.write(t)
    if renamed:
        print(f"compress: {len(renamed)} pictures -> WebP, {before / 1e6:.1f} MB -> {after / 1e6:.1f} MB")
    else:
        print("compress: nothing to convert")
    return 0


if __name__ == "__main__":
    sys.exit(main())
