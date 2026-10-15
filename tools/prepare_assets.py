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
- The background: copies the layers made by jungle-background/tools/make_background.py into
  assets/bg/jungle/ (see jungle-background/README.md; that tool needs numpy, Pillow and scipy).
- Writes assets/sprites.js with the sizes and anchors the game needs.

Re-run it whenever you replace any of the original PNGs (keep the same file names and the 4 x 2 layout).
"""
import json
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
    # (The balance is built from the elements.png pieces: see the balance section of js/world.js.)
    ("vineE", "tree bails.png", "bg/vine-e.png", (1260, 136, 176, 814), 1),  # the vine Zippy hangs from
    ("bar", "number bricks.png", "props/bar.png", None, 2),
    ("coin", "number coin.png", "props/coin.png", None, 4),
    ("crown", "crown.png", "props/crown.png", None, 3),
    ("brickStand", "break stand .png", "props/brick-stand.png", None, 2),  # the stone stand under each gold bar
    ("startButton", "start button.png", "ui/start-button.png", None, 2),
]

FULLSCREEN = [
    ("startScreen", "start screen.png", "ui/start-screen"),
]

# The game's background: the layers of jungle-background/ (built from "background sheet.png").
BACKGROUND_DIR = "jungle-background"


def copy_background(images):
    """Copies the background layers into assets/bg/jungle/ and returns their placements."""
    layout_path = os.path.join(ROOT, BACKGROUND_DIR, "layout.json")
    if not os.path.exists(layout_path):
        sys.exit(f"Missing {BACKGROUND_DIR}/layout.json: run jungle-background/tools/make_background.py first.")
    layout = json.load(open(layout_path))
    out_dir = os.path.join(OUT, "bg", "jungle")
    if os.path.isdir(out_dir):
        shutil.rmtree(out_dir)  # layers that were renamed or removed go too
    os.makedirs(out_dir)
    layers = []
    for ly in layout["layers"]:
        name = os.path.basename(ly["file"])
        shutil.copyfile(os.path.join(ROOT, BACKGROUND_DIR, ly["file"]), os.path.join(out_dir, name))
        key = "bg" + "".join(part.capitalize() for part in ly["id"].split("-"))
        images[key] = {"src": f"assets/bg/jungle/{name}", "w": ly["w"], "h": ly["h"]}
        layers.append({"key": key, "x": ly["x"], "y": ly["y"], "w": ly["w"], "h": ly["h"], "anim": ly["anim"]})
    print(f"background: {len(layers)} layers -> assets/bg/jungle/")
    return layers

# --------------------------------------------------------------------------- UI elements sheet
# elements.png holds the UI and prop pieces made in ChatGPT (see ChatGPT-Asset-Sheet-Prompt.md), in six
# rows. Each piece is found by its own pixels (tiny satellites, like the thought bubble's circles, join
# the piece next to them), put in reading order, and named in this order:
ELEMENTS_FILE = "elements.png"
ELEMENT_ROWS = [
    ["beam"],
    ["stand", "pan", "chestClosed", "chestOpen", "pedestal"],
    ["scroll", "panel", "speech", "thought"],
    ["levelSign", "pillGreen", "pillWood", "tile", "medalGreen", "medalRed"],
    ["btnGem", "btnRestart", "btnMenu", "btnBack", "btnClose", "btnSound"],
    ["gemYellow", "gemOrange", "gemPurple", "gemGreen", "gemTeal", "gemAmber", "gemBlue", "gemRed",
     "flame", "sparkle", "dust", "hand"],
]


def _label(w, h, solid):
    """Connected components of `solid`; returns (labels, comps) with comps[id] = [x0, y0, x1, y1, n, sx, sy]."""
    labels = [0] * (w * h)
    comps = {}
    nxt = 0
    for s in range(w * h):
        if not solid[s] or labels[s]:
            continue
        nxt += 1
        labels[s] = nxt
        q = deque([s])
        c = [w, h, -1, -1, 0, 0, 0]
        while q:
            p = q.popleft()
            y, x = divmod(p, w)
            if x < c[0]: c[0] = x
            if y < c[1]: c[1] = y
            if x > c[2]: c[2] = x
            if y > c[3]: c[3] = y
            c[4] += 1
            c[5] += x
            c[6] += y
            for np_, ok in ((p + 1, x + 1 < w), (p - 1, x > 0), (p + w, y + 1 < h), (p - w, y > 0)):
                if ok and solid[np_] and not labels[np_]:
                    labels[np_] = nxt
                    q.append(np_)
        comps[nxt] = c
    return labels, comps


def cut_elements(path):
    w, h, px = read_png(path)
    px = bytearray(px)
    for i in range(3, len(px), 4):  # clear the faint haze, make the (98-99 % opaque) art fully solid
        a = px[i]
        if a < 24:
            px[i] = 0
        elif a >= 232:
            px[i] = 255
    alpha = px[3::4]
    solid = bytearray(1 if a > 40 else 0 for a in alpha)
    labels, comps = _label(w, h, solid)
    comps = {k: c for k, c in comps.items() if c[4] >= 30}  # ignore specks
    group = {k: k for k in comps}

    def gap(a, b):
        return max(0, b[0] - a[2], a[0] - b[2], b[1] - a[3], a[1] - b[3])

    for k in sorted(comps, key=lambda k: comps[k][4]):  # small satellites join a much bigger piece touching them
        c = comps[k]
        best = None
        for j, d in comps.items():
            if j != k and d[4] >= 5 * c[4] and gap(c, d) <= 8 and (best is None or gap(c, d) < gap(c, comps[best])):
                best = j
        if best is not None:
            group[k] = best
    def root(k):
        while group[k] != k:
            k = group[k]
        return k
    members = {}
    for k in comps:
        members.setdefault(root(k), []).append(k)
    owner = {k: root(k) for k in comps}
    # soft edge pixels join the nearest solid pixel's piece
    item_of = [0] * (w * h)
    for p in range(w * h):
        if labels[p] in owner:
            item_of[p] = owner[labels[p]]
    for p in range(w * h):
        if alpha[p] and not item_of[p]:
            y, x = divmod(p, w)
            for r in (1, 2, 3):
                hit = 0
                for dy in range(-r, r + 1):
                    for dx in range(-r, r + 1):
                        xx, yy = x + dx, y + dy
                        if 0 <= xx < w and 0 <= yy < h and solid[yy * w + xx] and item_of[yy * w + xx]:
                            hit = item_of[yy * w + xx]
                            break
                    if hit:
                        break
                if hit:
                    item_of[p] = hit
                    break
    # piece boxes and centres
    pieces = []
    for g, ks in members.items():
        x0 = min(comps[k][0] for k in ks); y0 = min(comps[k][1] for k in ks)
        x1 = max(comps[k][2] for k in ks); y1 = max(comps[k][3] for k in ks)
        n = sum(comps[k][4] for k in ks)
        cx = sum(comps[k][5] for k in ks) / n; cy = sum(comps[k][6] for k in ks) / n
        pieces.append({"g": g, "box": [max(0, x0 - 3), max(0, y0 - 3), min(w, x1 + 4), min(h, y1 + 4)], "cx": cx, "cy": cy})
    # reading order: rows by centre height, then left to right
    pieces.sort(key=lambda q: q["cy"])
    rows, cur = [], []
    for q in pieces:
        if cur and q["cy"] - cur[-1]["cy"] > 60:
            rows.append(cur)
            cur = []
        cur.append(q)
    if cur:
        rows.append(cur)
    want = [len(r) for r in ELEMENT_ROWS]
    got = [len(r) for r in rows]
    if got != want:
        raise SystemExit(f"{path}: expected rows of {want} pieces, found {got}. Check the sheet layout.")
    out = {}
    for names, row in zip(ELEMENT_ROWS, rows):
        for name, q in zip(names, sorted(row, key=lambda q: q["cx"])):
            x0, y0, x1, y1 = q["box"]
            cw, ch = x1 - x0, y1 - y0
            img = bytearray(cw * ch * 4)
            for y in range(y0, y1):
                for x in range(x0, x1):
                    p = y * w + x
                    if item_of[p] == q["g"]:
                        o = ((y - y0) * cw + (x - x0)) * 4
                        img[o:o + 4] = px[p * 4:p * 4 + 4]
            out[name] = (cw, ch, img)
    return out


def _rows(w, h, px, thr=128):
    """For each row: list of [x0, x1] runs of opaque pixels."""
    res = []
    for y in range(h):
        runs = []
        for x in range(w):
            if px[(y * w + x) * 4 + 3] > thr:
                if runs and runs[-1][1] == x - 1:
                    runs[-1][1] = x
                else:
                    runs.append([x, x])
        res.append(runs)
    return res


def measure_elements(items):
    """Joints and borders the game needs, in the cut pieces' own pixels."""
    g = {}
    # beam: end balls, hub and the plain bar between them
    w, h, px = items["beam"]
    cols = []
    for x in range(w):
        ys = [y for y in range(h) if px[(y * w + x) * 4 + 3] > 128]
        cols.append((ys[0], ys[-1]) if ys else None)
    heights = sorted(c[1] - c[0] + 1 for c in cols if c)
    bar = heights[len(heights) // 2]
    tall, runs = [i for i, c in enumerate(cols) if c and c[1] - c[0] + 1 > bar * 1.6], []
    for x in tall:
        if runs and runs[-1][1] == x - 1:
            runs[-1][1] = x
        else:
            runs.append([x, x])
    runs = [r for r in runs if r[1] - r[0] >= 6]
    hub = min(runs, key=lambda r: abs((r[0] + r[1]) / 2 - w / 2))
    def centre(r):
        mid = (r[0] + r[1]) // 2
        return {"x": round((r[0] + r[1]) / 2, 1), "y": round((cols[mid][0] + cols[mid][1]) / 2, 1), "r": round((r[1] - r[0] + 1) / 2, 1)}
    bar_cols = [c for c in cols if c and c[1] - c[0] + 1 <= bar * 1.1]
    # the plain bar on each side of the hub (between the collars): the part the game may stretch
    pruns = []
    for x in (i for i, c in enumerate(cols) if c and c[1] - c[0] + 1 <= bar * 1.1):
        if pruns and pruns[-1][1] == x - 1:
            pruns[-1][1] = x
        else:
            pruns.append([x, x])
    longest = lambda rs: max(rs, key=lambda r: r[1] - r[0])
    plain_l = longest([r for r in pruns if r[0] > runs[0][1] and r[1] < hub[0]])
    plain_r = longest([r for r in pruns if r[0] > hub[1] and r[1] < runs[-1][0]])
    g["beam"] = {"left": centre(runs[0]), "right": centre(runs[-1]), "hub": centre(hub),
                 "barTop": sorted(c[0] for c in bar_cols)[len(bar_cols) // 2],
                 "barBottom": sorted(c[1] for c in bar_cols)[len(bar_cols) // 2],
                 "plainL": plain_l, "plainR": plain_r}
    # pan: hanging ring (centre of its hole), rim (widest row), bottom
    w, h, px = items["pan"]
    rows = _rows(w, h, px)
    hole = [y for y in range(min(h, 80)) if len(rows[y]) == 2 and rows[y][1][0] - rows[y][0][1] < 30]
    ring_y = sum(hole) / len(hole)
    ring_x = sum((rows[y][0][1] + rows[y][1][0]) / 2 for y in hole) / len(hole)
    widths = [(r[-1][1] - r[0][0], y) for y, r in enumerate(rows) if r]
    rim_w, rim_y = max(widths)
    rim_top = next(y for y in range(int(ring_y) + 20, h) if any(a <= w // 2 <= b for a, b in rows[y]))
    g["pan"] = {"ringX": round(ring_x, 1), "ringY": round(ring_y, 1), "rimTop": rim_top, "rimY": rim_y,
                "rimL": rows[rim_y][0][0], "rimR": rows[rim_y][-1][1], "bottom": max(y for y, r in enumerate(rows) if r)}
    # stand: top ball, post, base
    w, h, px = items["stand"]
    rows = _rows(w, h, px)
    span = {y: (r[0][0], r[-1][1]) for y, r in enumerate(rows) if r}
    top = min(span)
    ball_y = max(range(top, top + int(h * 0.3)), key=lambda y: span[y][1] - span[y][0])
    post_w = min(span[y][1] - span[y][0] for y in range(ball_y, top + int(h * 0.75)))
    post_top = next(y for y in range(ball_y, h) if span[y][1] - span[y][0] <= post_w * 1.3)
    base_top = next(y for y in range(post_top, h) if span[y][1] - span[y][0] > post_w * 1.6)
    g["stand"] = {"cx": round(sum(a + b for a, b in span.values()) / 2 / len(span), 1), "top": top, "ballY": ball_y,
                  "postTop": post_top, "baseTop": base_top, "bottom": max(span)}
    # hand: fingertip
    w, h, px = items["hand"]
    rows = _rows(w, h, px)
    tip_y = next(y for y, r in enumerate(rows) if r)
    xs = [x for y in range(tip_y, tip_y + 6) for a, b in rows[y] for x in range(a, b + 1)]
    g["hand"] = {"tipX": round(sum(xs) / len(xs)), "tipY": tip_y}
    # thought bubble: the main cloud (without the trailing circles)
    w, h, px = items["thought"]
    _, comps = _label(w, h, bytearray(1 if px[i * 4 + 3] > 40 else 0 for i in range(w * h)))
    c = max(comps.values(), key=lambda c: c[4])
    g["thought"] = {"x0": c[0], "y0": c[1], "x1": c[2], "y1": c[3]}
    # speech bubble: where the body ends and the tail begins
    w, h, px = items["speech"]
    rows = _rows(w, h, px)
    widest = max(r[-1][1] - r[0][0] for r in rows if r)
    body_bottom = max(y for y, r in enumerate(rows) if r and r[-1][1] - r[0][0] > widest * 0.6)
    tail = [x for y in range(body_bottom + 4, h) for a, b in rows[y] for x in (a, b)]
    g["speech"] = {"bodyBottom": body_bottom, "tailX0": min(tail) if tail else 0, "tailX1": max(tail) if tail else 0}
    # parchment panel and scroll: border thickness (where the light paper starts)
    def light(px, w, x, y):
        i = (y * w + x) * 4
        return px[i + 3] > 200 and (px[i] + px[i + 1] + px[i + 2]) / 3 > 200
    for key in ("panel", "scroll"):
        w, h, px = items[key]
        my, mx = h // 2, w // 2
        g[key] = {"left": next(x for x in range(w) if light(px, w, x, my)),
                  "right": w - 1 - next(x for x in range(w - 1, -1, -1) if light(px, w, x, my)),
                  "top": next(y for y in range(h) if light(px, w, mx, y)),
                  "bottom": h - 1 - next(y for y in range(h - 1, -1, -1) if light(px, w, mx, y))}
    return g


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

    bg_layers = copy_background(images)

    for key, src, dst, mode in SHEETS:
        sw, sh, strip, meta = split_sheet(os.path.join(ROOT, src), mode)
        write_png(os.path.join(OUT, dst), sw, sh, strip)
        meta["src"] = "assets/" + dst
        sprites[key] = meta
        print(f"sheet  {key:14s} -> assets/{dst} cell {meta['w']}x{meta['h']} anchor ({meta['ax']},{meta['ay']})")

    geom = {}
    if os.path.exists(os.path.join(ROOT, ELEMENTS_FILE)):
        items = cut_elements(os.path.join(ROOT, ELEMENTS_FILE))
        for name, (cw, ch, img) in items.items():
            write_png(os.path.join(OUT, "elements", name + ".png"), cw, ch, img)
            images[name] = {"src": f"assets/elements/{name}.png", "w": cw, "h": ch}
        geom = measure_elements(items)
        print(f"elements: {len(items)} pieces -> assets/elements/ (measured: {', '.join(geom)})")

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
        f.write("\n// The background, back to front: where each layer goes in the 1920 x 1080 scene, and its idle motion.\n")
        f.write("window.BG_LAYERS = " + json.dumps(bg_layers, indent=2) + ";\n")
        if geom:
            f.write("\n// Joints and borders measured on the elements.png pieces (in each piece's own pixels).\n")
            f.write("window.GEOM = " + json.dumps(geom, indent=2) + ";\n")
    print("wrote assets/sprites.js")


if __name__ == "__main__":
    sys.exit(main())
