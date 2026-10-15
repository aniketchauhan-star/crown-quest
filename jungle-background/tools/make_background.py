"""Arranges the pieces in ../pieces/ (cut from "background sheet.png") like reference.png, the picture
it is matched to, and writes:
  ../background.png   the finished background, 1920 x 1080
  ../layers/          every layer, already sized (01-sky.png at the back ... at the front)
  ../layout.json      where each layer goes in the 1920 x 1080 frame, back to front (layout.js: the same,
                      for index.html)

The sheet has no sky, clouds or grass lawn, so those come from reference.png. The far mountains and
forest are colour-matched to the reference (it shows them hazier, so they look far away).
To move, resize or flip a piece, change LAYOUT at the bottom (x, y are in reference.png pixels) and
run it again.

Needs Python 3 with numpy, Pillow and scipy.  Run:  python3 jungle-background/tools/make_background.py
"""
import json
import os

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageOps
from scipy import ndimage as ndi

from imaging import push_pull_fill

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
REF = np.array(Image.open(os.path.join(ROOT, "reference.png")).convert("RGB")).astype(np.float32)
RH, RW = REF.shape[:2]  # 941 x 1672
W, H = 1920, 1080
K = W / RW  # reference px -> output px


def piece(name):
    return Image.open(os.path.join(ROOT, "pieces", name + ".png")).convert("RGBA")


# ---------------------------------------------------------------- helpers
def resize_rgba(img, w, h):
    """Lanczos resize on premultiplied alpha (no dark fringes)."""
    return img.convert("RGBa").resize((max(1, round(w)), max(1, round(h))), Image.LANCZOS).convert("RGBA")


# ---------------------------------------------------------------- sky: gradient fitted to the reference
def sky_fit():
    ys, cols = [], []
    for x in (1000, 1050, 1100, 1300, 1350):  # clear-sky columns (between the canopy and the clouds)
        for y in range(20, 250, 2):
            p = REF[y, x]
            if p[2] > 245 and p[1] > 185 and p[0] < 150:
                ys.append(y)
                cols.append(p)
    ys = np.array(ys, np.float32)
    cols = np.array(cols)
    A = np.stack([np.ones_like(ys), ys, ys * ys], 1)
    coef = [np.linalg.lstsq(A, cols[:, i], rcond=None)[0] for i in range(3)]
    return coef


SKY = sky_fit()


def sky_color(y_ref):
    y = np.asarray(y_ref, np.float32)
    y = np.minimum(y, 470)  # the horizon haze stops brightening here
    return np.stack([SKY[i][0] + SKY[i][1] * y + SKY[i][2] * y * y for i in range(3)], -1)


def build_sky():
    yy = (np.arange(H) + 0.5) / K
    col = np.clip(sky_color(yy), 0, 255)
    img = np.repeat(col[:, None, :], W, 1)
    return Image.fromarray(img.astype(np.uint8)).convert("RGBA")


def build_clouds():
    """Clouds from the reference: pixels lighter than the sky gradient at their height."""
    yy = np.arange(RH)[:, None]
    sky = sky_color(np.repeat(yy, RW, 1))
    d = REF[..., 0] - sky[..., 0]
    whiteR = 214.0
    alpha = np.clip((d - 5) / np.maximum(whiteR - sky[..., 0] - 5, 1), 0, 1)
    ok = (REF[..., 2] > 242) & (REF[..., 1] > sky[..., 1] - 6)
    alpha = np.where(ok & (yy < 480), alpha, 0)
    # only big blobs (clouds), not specks on leaves
    lab, n = ndi.label(alpha > 0.15)
    sizes = ndi.sum(np.ones_like(lab), lab, range(1, n + 1))
    keep = np.isin(lab, [i + 1 for i, s in enumerate(sizes) if s > 400])
    keep = ndi.binary_dilation(keep, iterations=3)
    alpha = np.where(keep, alpha, 0)
    # where something stood in front of a cloud in the reference (trunk, arch, mountains) the cloud
    # stops in a hard line: fade every cloud out just before such places instead
    occluder = ~ok | (REF[..., 0] < sky[..., 0] - 25)
    alpha *= np.clip((ndi.distance_transform_edt(~occluder) - 2) / 26, 0, 1)
    # and fade out at the frame's sides, so the drift (index.html) never shows a cut edge
    xs = np.arange(RW)
    alpha *= np.clip(np.minimum(xs - 30, RW - 1 - 30 - xs) / 40, 0, 1)[None, :]
    alpha = ndi.gaussian_filter(alpha, 0.6)
    rgba = np.dstack([REF, alpha[..., None] * 255]).astype(np.uint8)
    img = Image.fromarray(rgba)
    return img


# ---------------------------------------------------------------- the paving: the tile piece in perspective
def homography(src, dst):
    """coefficients for PIL PERSPECTIVE: maps output (dst) points to input (src) points"""
    A, b = [], []
    for (x, y), (u, v) in zip(dst, src):
        A.append([x, y, 1, 0, 0, 0, -u * x, -u * y])
        A.append([0, 0, 0, x, y, 1, -v * x, -v * y])
        b += [u, v]
    return np.linalg.solve(np.array(A, float), np.array(b, float))


def clean_tiles():
    """The tile piece as solid stone: the grass along its edges becomes stone, and the piece is opaque
    right up to its outline (so copies can sit edge to edge)."""
    tiles = piece("tiles")
    t = np.array(tiles).astype(np.float32)
    green = (t[..., 1] > t[..., 0] + 8) & (t[..., 1] > t[..., 2] + 25)
    green = ndi.binary_dilation(green, iterations=2)
    m = Image.new("L", tiles.size, 0)
    ImageDraw.Draw(m).polygon(TILE_CORNERS, fill=255)
    inside = np.array(m) > 0
    stone_known = (~green) & (t[..., 3] > 200)
    filled = push_pull_fill(t[..., :3], stone_known)
    t[..., :3] = np.where((inside & ~stone_known)[..., None], filled, t[..., :3])
    # bleed the stone's edge colours past its outline, so a copy has no soft edge where it meets the next
    inner = ndi.binary_erosion(inside, iterations=1)
    t[..., :3] = np.where(inner[..., None], t[..., :3], push_pull_fill(t[..., :3], inner))
    t[..., 3] = 255
    return Image.fromarray(np.clip(t, 0, 255).astype(np.uint8))


TILE_CORNERS = [(86, 9), (408, 9), (481, 128), (5, 128)]  # the stone's corners in the tile piece: TL TR BR BL


def floor_texture(cw=640, ch=220):
    """Copies of the tile piece laid flat in two bands (the second shifted by half a copy, alternately
    mirrored), as one seamless texture. Returns (texture, x of u=0, cw, ch)."""
    tiles = clean_tiles()
    w = tiles.size[0]
    c = TILE_CORNERS
    cm = [(w - c[1][0], c[1][1]), (w - c[0][0], c[0][1]), (w - c[3][0], c[3][1]), (w - c[2][0], c[2][1])]
    tex = Image.new("RGBA", (3 * cw, 2 * ch), (0, 0, 0, 0))
    cells = [(0.5, 0, False), (1.5, 0, True), (0, 1, True), (1, 1, False), (2, 1, True)]  # (u - u_min, v, mirrored)
    for (u, v, flip) in cells:
        src = ImageOps.mirror(tiles) if flip else tiles
        corners = cm if flip else c
        x0, y0 = u * cw, v * ch
        rect = [(x0, y0), (x0 + cw, y0), (x0 + cw, y0 + ch), (x0, y0 + ch)]
        coef = homography(corners, rect)
        layer = src.convert("RGBa").transform(tex.size, Image.PERSPECTIVE, tuple(coef), Image.BICUBIC).convert("RGBA")
        box = tuple(int(round(v_)) for v_ in (x0, y0, x0 + cw, y0 + ch))
        tex.paste(layer.crop(box), box[:2])  # each copy fills exactly its own cell
    # solid everywhere (the cells cover the texture edge to edge)
    a = np.array(tex)
    known = a[..., 3] > 250
    if not known.all():
        a[..., :3] = np.where(known[..., None], a[..., :3], push_pull_fill(a[..., :3], known)).astype(np.uint8)
    a[..., 3] = 255
    return Image.fromarray(a), 0.5 * cw, cw, ch


def build_floor(dst_ref):
    """The paving in perspective. dst_ref = where the floor's corners go (reference px): TL TR BR BL.
    The floor is 2 copies wide and 2 bands deep."""
    tex, ux0, cw, ch = floor_texture()
    ss = 2
    dst = [(x * K * ss, y * K * ss) for x, y in dst_ref]
    src = [(ux0, 0), (ux0 + 2 * cw, 0), (ux0 + 2 * cw, 2 * ch), (ux0, 2 * ch)]
    coef = homography(src, dst)
    big = tex.convert("RGBa").transform((W * ss, H * ss), Image.PERSPECTIVE, tuple(coef), Image.BICUBIC)
    return big.resize((W, H), Image.LANCZOS).convert("RGBA")


# ---------------------------------------------------------------- the lawn: grass from the reference
def build_lawn():
    r, g, b = REF[..., 0], REF[..., 1], REF[..., 2]
    yy, xx = np.mgrid[0:RH, 0:RW]
    floor = (r > 170) & (g > 145) & (b > 95) & (r > b + 40) & (r >= g)
    floor = ndi.binary_opening(floor, iterations=2)
    floor = ndi.binary_closing(floor, iterations=4)
    lab, n = ndi.label(floor)
    sizes = ndi.sum(np.ones_like(lab), lab, range(1, n + 1))
    floor = lab == (np.argmax(sizes) + 1)
    floor = ndi.binary_fill_holes(floor)
    grass = (g > r + 10) & (g > b + 40) & (g > 80)
    left = (xx < 560) & (yy > 640) & ~floor
    known = grass & left
    filled = push_pull_fill(REF, known)
    rgb = np.where(known[..., None], REF, filled)
    alpha_left = ndi.gaussian_filter(left.astype(np.float32), 0.8)
    alpha_left[yy < 640] = 0
    alpha_left *= np.clip((560 - xx) / 50.0, 0, 1)  # fades out under the shore bush, no straight edge
    # right: only the reference's own grass (how green a pixel is), faded in at the region's edges
    greenness = np.clip((g - r - 6) / 30, 0, 1) * (b < g - 40) * (g > 120)
    right_zone = ((xx > 1300) & (yy > 668) & (yy < 800)).astype(np.float32)
    right_zone = ndi.gaussian_filter(right_zone, 3)
    alpha_right = greenness * right_zone * ~floor
    rgb = np.where((alpha_right > alpha_left)[..., None], REF, rgb)
    alpha = np.maximum(alpha_left, alpha_right)
    return Image.fromarray(np.dstack([rgb, alpha[..., None] * 255]).astype(np.uint8)), floor


# ---------------------------------------------------------------- composition
def to_out(img_ref_size):
    return img_ref_size.convert("RGBa").resize((W, H), Image.LANCZOS).convert("RGBA")


# Far layers in the reference are hazier (lighter, bluer) than the sheet's pieces: match each one's
# colour (mean and contrast per channel) to the same part of the reference.
GRADE = {
    "forest": [(600, 450, 1250, 560)],
    "mountains": [(1160, 350, 1300, 400), (470, 365, 600, 410)],
}


def grade(p, boxes):
    a = np.array(p).astype(np.float32)
    m = a[..., 3] > 200
    src = a[m][:, :3]
    dst = np.concatenate([REF[y0:y1, x0:x1].reshape(-1, 3) for x0, y0, x1, y1 in boxes])
    ms, ss_ = src.mean(0), src.std(0) + 1e-3
    md, sd = dst.mean(0), dst.std(0)
    k = np.clip(sd / ss_, 0.6, 1.0)
    a[..., :3] = np.clip((a[..., :3] - ms) * k + md, 0, 255)
    return Image.fromarray(a.astype(np.uint8))


def sharpen(img, radius=2.0, percent=70, threshold=2):
    """Unsharp mask on the colour only (the edge colours are first spread past the outline, so no
    dark or light halo appears at soft edges); the alpha is kept as it is."""
    a = np.array(img).astype(np.float32)
    known = a[..., 3] > 127
    rgb = a[..., :3]
    if not known.all() and known.any():
        rgb = np.where(known[..., None], rgb, push_pull_fill(rgb, known))
    sh = Image.fromarray(np.clip(rgb, 0, 255).astype(np.uint8)).filter(ImageFilter.UnsharpMask(radius, percent, threshold))
    return Image.fromarray(np.dstack([np.array(sh), a[..., 3].astype(np.uint8)]))


def crop_bbox(img):
    """A full-frame layer cropped to what is drawn in it: (image, x, y)."""
    box = img.getchannel("A").point(lambda v: 255 if v > 2 else 0).getbbox()
    return img.crop(box), box[0], box[1]


def piece_layer(name, x, y, s, flip=False):
    p = piece(name)
    if name in GRADE:
        p = grade(p, GRADE[name])
    if flip:
        p = ImageOps.mirror(p)
    w, h = p.size
    q = resize_rgba(p, w * s * K, h * s * K)
    if s * K > 1.05:
        q = sharpen(q)
    return q, round(x * K), round(y * K)


def render_layers(layout):
    """[(id, image, x, y, anim)] from the back to the front, in output px (1920 x 1080)."""
    out = [("sky", build_sky(), 0, 0, None)]
    img, x, y = crop_bbox(to_out(build_clouds()))  # soft already: no sharpening
    out.append(("clouds", img, x, y, "drift"))
    lawn, _ = build_lawn()
    for item in layout:
        kind = item[0]
        if kind == "floor":
            img, x, y = crop_bbox(sharpen(build_floor(item[1]), 1.6, 60))
            out.append(("floor", img, x, y, None))
        elif kind == "lawn":
            img, x, y = crop_bbox(sharpen(to_out(lawn), 1.2, 50))
            out.append(("lawn", img, x, y, None))
        else:
            name, px, py, sc, flip, lid, anim = (list(item) + [None, None])[:7]
            img, x, y = piece_layer(name, px, py, sc, flip)
            out.append((lid or name, img, x, y, anim))
    return out


def composite(layers):
    canvas = Image.new("RGBA", (W, H), (0, 0, 0, 255))
    for _, img, x, y, _ in layers:
        full = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        full.paste(img, (x, y))  # a plain paste: the layer keeps its own alpha
        canvas.alpha_composite(full)
    return canvas.convert("RGB")


def main(layout):
    layers = render_layers(layout)
    composite(layers).save(os.path.join(ROOT, "background.png"), optimize=True)
    ldir = os.path.join(ROOT, "layers")
    os.makedirs(ldir, exist_ok=True)
    for f in os.listdir(ldir):
        if f.endswith(".png"):
            os.remove(os.path.join(ldir, f))
    entries = []
    for i, (lid, img, x, y, anim) in enumerate(layers, 1):
        name = f"{i:02d}-{lid}.png"
        img.save(os.path.join(ldir, name), optimize=True)
        entries.append({"id": lid, "file": "layers/" + name, "x": x, "y": y, "w": img.size[0], "h": img.size[1], "anim": anim})
    data = {"width": W, "height": H, "layers": entries}
    json.dump(data, open(os.path.join(ROOT, "layout.json"), "w"), indent=1)
    with open(os.path.join(ROOT, "layout.js"), "w") as f:
        f.write("// Made by tools/make_background.py (the same as layout.json, for index.html)\nwindow.LAYOUT = ")
        json.dump(data, f, indent=1)
        f.write(";\n")
    print(f"wrote background.png and {len(entries)} layers")


LAYOUT = [
    # (piece, x, y, scale, mirrored, layer id, idle animation)  x, y = top-left in reference px
    ("mountains", 1330, 305, 1.25, False, "mountains-far"),
    ("mountains", -117, 285, 1.7, True, "mountains"),
    ("forest", 200, 421, 1.0, False, "forest"),
    ("lake", 405, 556, 1.32, False, "lake", "shimmer"),
    ("floor", [(300, 652), (1500, 652), (2300, 1010), (-500, 1010)]),
    ("lawn",),
    ("arch", 1308, 145, 1.1, False, "arch"),
    ("branch", 330, -70, 1.2, False, "branch", "branch"),
    ("tree", -130, -250, 1.42, False, "tree"),
    ("bushBig", 1395, 700, 1.45, False, "bush-front-right", "sway"),
]

if __name__ == "__main__":
    main(LAYOUT)
