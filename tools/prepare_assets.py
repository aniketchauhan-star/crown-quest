#!/usr/bin/env python3
"""
Prepare game assets from the designer's original PNGs (pure Python, no dependencies).

Run from anywhere:   python3 tools/prepare_assets.py

What it does
- Character sheets (4 x 2 frames): cuts every frame out by its OWN pixels (alpha connected
  components assigned to a grid cell by centroid), so hands / Zzz that cross the cell lines are
  kept and neighbouring frames never bleed in. Frames are re-packed into a clean horizontal strip
  with every frame aligned on one anchor point:
    Zippy   -> tip of his tail (he hangs from a vine by his tail)
    Grumble -> bottom-centre (he sits on the floor)
- Props: crops away empty margins and downsizes oversized images.
- Full-screen art: re-saved as JPEG when fully opaque (much smaller), otherwise copied.
- Writes assets/sprites.js with the sizes and anchors the game needs.

Re-run it whenever you replace any of the original PNGs (keep the same file names and the 4 x 2 layout).
"""
import os
import shutil
import struct
import subprocess
import sys
import zlib
from collections import deque

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "assets")
ALPHA_SOLID = 40      # alpha above this counts as "solid" for finding shapes
EDGE_RADIUS = 2       # soft edge pixels within this distance join the nearest frame
PAD = 4               # transparent padding around frames in the strips


# --------------------------------------------------------------------------- PNG I/O
def read_png(path):
    with open(path, "rb") as f:
        data = f.read()
    if data[:8] != b"\x89PNG\r\n\x1a\n":
        raise ValueError(f"{path} is not a PNG")
    pos, idat = 8, bytearray()
    w = h = bd = ct = inter = None
    while pos < len(data):
        length, ctype = struct.unpack(">I4s", data[pos:pos + 8])
        chunk = data[pos + 8:pos + 8 + length]
        pos += 12 + length
        if ctype == b"IHDR":
            w, h, bd, ct, _, _, inter = struct.unpack(">IIBBBBB", chunk)
        elif ctype == b"IDAT":
            idat += chunk
        elif ctype == b"IEND":
            break
    if bd != 8 or inter != 0 or ct not in (2, 6):
        raise ValueError(f"{path}: only 8-bit RGB/RGBA non-interlaced PNGs are supported")
    bpp = 4 if ct == 6 else 3
    raw = zlib.decompress(bytes(idat))
    stride = w * bpp
    out = bytearray(h * stride)
    prev = bytearray(stride)
    i = 0
    for y in range(h):
        ft = raw[i]
        i += 1
        line = bytearray(raw[i:i + stride])
        i += stride
        if ft == 1:
            for x in range(bpp, stride):
                line[x] = (line[x] + line[x - bpp]) & 255
        elif ft == 2:
            for x in range(stride):
                line[x] = (line[x] + prev[x]) & 255
        elif ft == 3:
            for x in range(stride):
                a = line[x - bpp] if x >= bpp else 0
                line[x] = (line[x] + ((a + prev[x]) >> 1)) & 255
        elif ft == 4:
            for x in range(stride):
                a = line[x - bpp] if x >= bpp else 0
                b = prev[x]
                c = prev[x - bpp] if x >= bpp else 0
                p = a + b - c
                pa, pb, pc = abs(p - a), abs(p - b), abs(p - c)
                line[x] = (line[x] + (a if (pa <= pb and pa <= pc) else (b if pb <= pc else c))) & 255
        out[y * stride:(y + 1) * stride] = line
        prev = line
    if ct == 2:  # expand RGB -> RGBA
        rgba = bytearray(w * h * 4)
        rgba[0::4], rgba[1::4], rgba[2::4] = out[0::3], out[1::3], out[2::3]
        rgba[3::4] = b"\xff" * (w * h)
        out = rgba
    return w, h, out


def write_png(path, w, h, rgba):
    def chunk(tag, payload):
        return struct.pack(">I", len(payload)) + tag + payload + struct.pack(">I", zlib.crc32(tag + payload) & 0xFFFFFFFF)

    stride = w * 4
    raw = bytearray()
    for y in range(h):
        row = rgba[y * stride:(y + 1) * stride]
        if not any(row[3::4]):          # fully transparent row
            raw += b"\x00" + bytes(stride)
            continue
        sub = bytearray(stride)          # "Sub" filter compresses flat cartoon colours well
        sub[:4] = row[:4]
        for x in range(4, stride):
            sub[x] = (row[x] - row[x - 4]) & 255
        raw += b"\x01" + sub
    data = b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 6, 0, 0, 0))
    data += chunk(b"IDAT", zlib.compress(bytes(raw), 9)) + chunk(b"IEND", b"")
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "wb") as f:
        f.write(data)


# --------------------------------------------------------------------------- helpers
def crop(w, h, px, x, y, cw, chh):
    out = bytearray(cw * chh * 4)
    for yy in range(chh):
        sy = y + yy
        if 0 <= sy < h:
            x0, x1 = max(0, x), min(w, x + cw)
            if x1 > x0:
                out[(yy * cw + (x0 - x)) * 4:(yy * cw + (x1 - x)) * 4] = px[(sy * w + x0) * 4:(sy * w + x1) * 4]
    return out


def downscale(w, h, px, k):
    """Box filter by an integer factor k, with premultiplied alpha (no dark fringes)."""
    nw, nh = w // k, h // k
    out = bytearray(nw * nh * 4)
    area = k * k
    for oy in range(nh):
        for ox in range(nw):
            sa = sr = sg = sb = 0
            for yy in range(oy * k, oy * k + k):
                base = (yy * w + ox * k) * 4
                for xx in range(k):
                    i = base + xx * 4
                    a = px[i + 3]
                    if a:
                        sa += a
                        sr += px[i] * a
                        sg += px[i + 1] * a
                        sb += px[i + 2] * a
            o = (oy * nw + ox) * 4
            if sa:
                out[o] = sr // sa
                out[o + 1] = sg // sa
                out[o + 2] = sb // sa
                out[o + 3] = sa // area
    return nw, nh, out


def content_box(w, h, px, thr=8):
    x0, y0, x1, y1 = w, h, -1, -1
    for y in range(h):
        row = px[y * w * 4 + 3:(y + 1) * w * 4:4]
        if max(row) > thr:
            xs = [i for i, a in enumerate(row) if a > thr]
            x0, x1 = min(x0, xs[0]), max(x1, xs[-1])
            y0 = min(y0, y)
            y1 = y
    return x0, y0, x1 + 1, y1 + 1


# --------------------------------------------------------------------------- sprite sheets
def split_sheet(path, anchor_mode, cols=4, rows=2):
    w, h, px = read_png(path)
    n = w * h
    alpha = px[3::4]
    solid = bytearray(1 if a > ALPHA_SOLID else 0 for a in alpha)
    label = bytearray(n)              # 0 = none, 1..cols*rows = frame number
    seen = bytearray(n)
    cw, chh = w / cols, h / rows
    for start in range(n):
        if not solid[start] or seen[start]:
            continue
        seen[start] = 1
        q = deque([start])
        comp = []
        sx = sy = 0
        while q:
            p = q.popleft()
            comp.append(p)
            y, x = divmod(p, w)
            sx += x
            sy += y
            for np_, ok in ((p + 1, x + 1 < w), (p - 1, x > 0), (p + w, y + 1 < h), (p - w, y > 0)):
                if ok and solid[np_] and not seen[np_]:
                    seen[np_] = 1
                    q.append(np_)
        if len(comp) < 3:
            continue
        col = min(int((sx / len(comp)) // cw), cols - 1)
        row = min(int((sy / len(comp)) // chh), rows - 1)
        f = row * cols + col + 1
        for p in comp:
            label[p] = f
    # soft anti-aliased edge pixels join the nearest solid frame pixel
    offsets = sorted(((dx, dy) for dx in range(-EDGE_RADIUS, EDGE_RADIUS + 1)
                      for dy in range(-EDGE_RADIUS, EDGE_RADIUS + 1) if dx or dy),
                     key=lambda d: d[0] * d[0] + d[1] * d[1])
    for p in range(n):
        if alpha[p] and not label[p]:
            y, x = divmod(p, w)
            for dx, dy in offsets:
                xx, yy = x + dx, y + dy
                if 0 <= xx < w and 0 <= yy < h and solid[yy * w + xx]:
                    label[p] = label[yy * w + xx]
                    break
    frames = []
    count = cols * rows
    boxes = {f: [w, h, -1, -1] for f in range(1, count + 1)}
    for p in range(n):
        f = label[p]
        if f:
            y, x = divmod(p, w)
            b = boxes[f]
            if x < b[0]: b[0] = x
            if y < b[1]: b[1] = y
            if x > b[2]: b[2] = x
            if y > b[3]: b[3] = y
    for f in range(1, count + 1):
        x0, y0, x1, y1 = boxes[f]
        x1 += 1
        y1 += 1
        if anchor_mode == "top":
            top = next(yy for yy in range(y0, y1) if any(label[yy * w + xx] == f and solid[yy * w + xx] for xx in range(x0, x1)))
            band = [xx for yy in range(top, min(top + 12, y1)) for xx in range(x0, x1)
                    if label[yy * w + xx] == f and solid[yy * w + xx]]
            ax, ay = round(sum(band) / len(band)), top
        else:
            bot = next(yy for yy in range(y1 - 1, y0 - 1, -1) if any(label[yy * w + xx] == f and solid[yy * w + xx] for xx in range(x0, x1)))
            band = [xx for yy in range(max(y0, bot - 40), bot + 1) for xx in range(x0, x1)
                    if label[yy * w + xx] == f and solid[yy * w + xx]]
            ax, ay = round((min(band) + max(band)) / 2), bot
        frames.append({"f": f, "box": (x0, y0, x1, y1), "anchor": (ax, ay)})
    left = max(fr["anchor"][0] - fr["box"][0] for fr in frames)
    right = max(fr["box"][2] - fr["anchor"][0] for fr in frames)
    top = max(fr["anchor"][1] - fr["box"][1] for fr in frames)
    bottom = max(fr["box"][3] - fr["anchor"][1] for fr in frames)
    cell_w, cell_h = left + right + 2 * PAD, top + bottom + 2 * PAD
    ax_cell, ay_cell = left + PAD, top + PAD
    strip_w = cell_w * count
    strip = bytearray(strip_w * cell_h * 4)
    for i, fr in enumerate(frames):
        fax, fay = fr["anchor"]
        ox = i * cell_w + ax_cell - fax
        oy = ay_cell - fay
        x0, y0, x1, y1 = fr["box"]
        f = fr["f"]
        for y in range(y0, y1):
            dy = y + oy
            for x in range(x0, x1):
                p = y * w + x
                if label[p] == f:
                    d = (dy * strip_w + x + ox) * 4
                    strip[d:d + 4] = px[p * 4:p * 4 + 4]
    return strip_w, cell_h, strip, {"w": cell_w, "h": cell_h, "count": count, "ax": ax_cell, "ay": ay_cell}


# --------------------------------------------------------------------------- main
SHEETS = [
    ("grumble_sleep", "monster slepping.png", "grumble/sleep.png", "bottom"),
    ("grumble_wake", "slightly open his eyes.png", "grumble/wake.png", "bottom"),
    ("grumble_roar", "when fail then monster roar .png", "grumble/roar.png", "bottom"),
    ("zippy_hold", "hold crown and up.png", "zippy/hold.png", "top"),
    ("zippy_reach", "hold crown.png", "zippy/reach.png", "top"),
    ("zippy_laugh", "winning monkey.png", "zippy/laugh.png", "top"),
    ("zippy_scared", "fail monkey.png", "zippy/scared.png", "top"),
]

# (key, source file, output, crop box or None for auto, downscale factor)
PROPS = [
    # (The balance scale is drawn in code: see BalanceArt in js/world.js.)
    ("vineA", "tree bails.png", "bg/vine-a.png", (16, 136, 392, 472), 1),
    ("vineB", "tree bails.png", "bg/vine-b.png", (418, 136, 182, 726), 1),
    ("vineC", "tree bails.png", "bg/vine-c.png", (618, 136, 370, 582), 1),
    ("vineD", "tree bails.png", "bg/vine-d.png", (994, 136, 248, 686), 1),
    ("vineE", "tree bails.png", "bg/vine-e.png", (1260, 136, 176, 814), 1),
    ("bar", "number bricks.png", "props/bar.png", None, 2),
    ("coin", "number coin.png", "props/coin.png", None, 4),
    ("crown", "crown.png", "props/crown.png", None, 3),
    ("startButton", "start button.png", "ui/start-button.png", None, 2),
]

FULLSCREEN = [
    ("temple", "background game.png", "bg/temple"),
    ("startScreen", "start screen.png", "ui/start-screen"),
]


def main():
    os.makedirs(OUT, exist_ok=True)
    sprites, images = {}, {}

    for key, src, dst, box, k in PROPS:
        w, h, px = read_png(os.path.join(ROOT, src))
        if box is None:
            x0, y0, x1, y1 = content_box(w, h, px)
            box = (max(0, x0 - 4), max(0, y0 - 4), min(w, x1 + 4) - max(0, x0 - 4), min(h, y1 + 4) - max(0, y0 - 4))
        cw, chh = box[2], box[3]
        img = crop(w, h, px, box[0], box[1], cw, chh)
        if k > 1:
            cw, chh, img = downscale(cw, chh, img, k)
        write_png(os.path.join(OUT, dst), cw, chh, img)
        images[key] = {"src": "assets/" + dst, "w": cw, "h": chh}
        print(f"prop   {key:12s} -> assets/{dst} ({cw}x{chh})")

    for key, src, dst in FULLSCREEN:
        path = os.path.join(ROOT, src)
        w, h, px = read_png(path)
        opaque = min(px[3::4]) == 255
        out_path = os.path.join(OUT, dst + (".jpg" if opaque else ".png"))
        os.makedirs(os.path.dirname(out_path), exist_ok=True)
        done = False
        if opaque and shutil.which("sips"):
            r = subprocess.run(["sips", "-s", "format", "jpeg", "-s", "formatOptions", "86", path, "--out", out_path],
                               capture_output=True)
            done = r.returncode == 0
        if not done:
            out_path = os.path.join(OUT, dst + ".png")
            shutil.copyfile(path, out_path)
        rel = os.path.relpath(out_path, ROOT).replace(os.sep, "/")
        images[key] = {"src": rel, "w": w, "h": h}
        print(f"screen {key:12s} -> {rel}")

    for key, src, dst, mode in SHEETS:
        sw, sh, strip, meta = split_sheet(os.path.join(ROOT, src), mode)
        write_png(os.path.join(OUT, dst), sw, sh, strip)
        meta["src"] = "assets/" + dst
        sprites[key] = meta
        print(f"sheet  {key:14s} -> assets/{dst} cell {meta['w']}x{meta['h']} anchor ({meta['ax']},{meta['ay']})")

    def js_obj(d):
        lines = []
        for k, v in d.items():
            inner = ", ".join(f"{kk}: {repr(vv) if isinstance(vv, str) else vv}" for kk, vv in v.items())
            lines.append(f"  {k}: {{ {inner} }},")
        return "\n".join(lines).replace("'", '"')

    with open(os.path.join(OUT, "sprites.js"), "w") as f:
        f.write("// Generated by tools/prepare_assets.py. Do not edit by hand: re-run the tool instead.\n")
        f.write("// Sprite strips: frames sit side by side in cells of w x h; (ax, ay) is the anchor inside a cell\n")
        f.write("// (Zippy = tip of his tail, Grumble = bottom-centre).\n")
        f.write("window.SPRITES = {\n" + js_obj(sprites) + "\n};\n\n")
        f.write("window.IMAGES = {\n" + js_obj(images) + "\n};\n")
    print("wrote assets/sprites.js")


if __name__ == "__main__":
    sys.exit(main())
