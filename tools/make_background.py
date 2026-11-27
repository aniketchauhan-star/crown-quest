"""Zippy's Crown Quest: the jungle-lake background.

Arranges the pieces in art/background/pieces/ (cut from "background sheet.png") like reference.png, the
picture it is matched to, and writes into art/background/:
  background.png   the finished background, 1920 x 1080
  layers/          every layer, already sized (01-sky.png at the back ... at the front)
  layout.json      where each layer goes in the 1920 x 1080 frame, back to front (layout.js: the same,
                   for index.html)

The sheet has no sky, clouds or grass lawn, so those come from reference.png. The far mountains and
forest are colour-matched to the reference (it shows them hazier, so they look far away).
To move, resize or flip a piece, change LAYOUT at the bottom (x, y are in reference.png pixels) and
run it again.

Since 2026-11-23 the stone arch, with its steps and block, is left out (asked: "remove that wall... it
creates a distraction"). In its place the scene runs on to the right edge: the lake's open water and
the forest are carried on past the frame, the far mountains carry on down behind the trees there, and
the cloud the arch half hid in the reference is left out (see "Where the arch stood" below).
The same day the big tree and its branch were toned down (CALM), so they don't compete with the balance.
Later that day the scene got a tree on each side (asked: "right side there is nothing and left side is
tree... right side add something, zoom out"): the big tree's picture stood at the right edge, and the
trees and the branch are drawn smaller, so the scene looks wider. The right tree took three goes that
day and was still too much: on 2026-11-26 it went (asked: "the trees both side making a cluttered...
make uncluttered and best design"). Now one tree stands at the left, where Zippy hangs, and its leafy
branch, turned round, hangs into the top right corner as if from a tree just out of the picture, so
both top corners have leaves and the sky over the balance is open (see "One tree, and its branch at
the top right" below). The lawn's strip of grass at the right went on 2026-11-23, the big plant at the
front right on 2026-11-26; later that day the right got a lawn again, the left one turned round, with a
bank of the lake's own bushes along the shore (see "A lawn on the right too" below).
This tool used to live in art/background/tools/; the copy there (in the git history) still has the arch.

art/ is not in the project folder: bring art/background/ back first (README, "Replace the artwork").
Needs Python 3 with numpy, Pillow and scipy. Run from the project folder:
    python3 tools/make_background.py
then python3 tools/prepare_assets.py, which copies the layers into assets/bg/jungle/.
(BACKGROUND_DIR=<folder> runs it on another copy of art/background.)
"""
import json
import os

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageOps
from scipy import ndimage as ndi

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.environ.get("BACKGROUND_DIR") or os.path.join(os.path.dirname(HERE), "art", "background")
REF = np.array(Image.open(os.path.join(ROOT, "reference.png")).convert("RGB")).astype(np.float32)
RH, RW = REF.shape[:2]  # 941 x 1672
W, H = 1920, 1080
K = W / RW  # reference px -> output px


def piece(name):
    return Image.open(os.path.join(ROOT, "pieces", name + ".png")).convert("RGBA")


# ---------------------------------------------------------------- helpers
def push_pull_fill(rgb, known):
    """Fill the unknown pixels smoothly from the known ones (an image-pyramid push-pull)."""
    rgb = rgb.astype(np.float32)
    w = known.astype(np.float32)
    levels = []
    c, m = rgb * w[..., None], w
    while min(m.shape) > 2:
        levels.append((c, m))
        h2, w2 = (m.shape[0] + 1) // 2, (m.shape[1] + 1) // 2
        cp = np.zeros((h2 * 2, w2 * 2, 3), np.float32)
        mp = np.zeros((h2 * 2, w2 * 2), np.float32)
        cp[: c.shape[0], : c.shape[1]] = c
        mp[: m.shape[0], : m.shape[1]] = m
        c = cp.reshape(h2, 2, w2, 2, 3).sum((1, 3))
        m = mp.reshape(h2, 2, w2, 2).sum((1, 3))
    col = c / np.maximum(m, 1e-6)[..., None]
    for c_, m_ in reversed(levels):
        up = np.repeat(np.repeat(col, 2, 0), 2, 1)[: m_.shape[0], : m_.shape[1]]
        up = ndi.uniform_filter(up, size=(3, 3, 1))
        here = c_ / np.maximum(m_, 1e-6)[..., None]
        wgt = np.clip(m_, 0, 1)[..., None]
        col = here * wgt + up * (1 - wgt)
    return col


def resize_rgba(img, w, h):
    """Lanczos resize on premultiplied alpha (no dark fringes)."""
    return img.convert("RGBa").resize((max(1, round(w)), max(1, round(h))), Image.LANCZOS).convert("RGBA")


def over(front, back):
    """front over back (float RGBA arrays, 0-255, straight alpha)."""
    fa, ba = front[..., 3:] / 255, back[..., 3:] / 255
    oa = fa + ba * (1 - fa)
    rgb = (front[..., :3] * fa + back[..., :3] * ba * (1 - fa)) / np.maximum(oa, 1e-6)
    return np.concatenate([rgb, oa * 255], -1)


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
LAWN_END = (545, 14)  # reference px: where the lawn ends at the right, and over how many px it fades


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
    # it ends by the shore bush, soon and crisply (it faded out over 50 px until 2026-11-26, a smear on
    # the paving: "fix the this blurriness where this type of thing blurriness... I need to a natural look")
    x1, soft = LAWN_END
    alpha_left *= np.clip((x1 - xx) / soft, 0, 1)
    # (The lawn had a right part until late on 2026-11-23: the reference's own grass round the stone
    # arch's foot. Without the arch it was a flat strip of lime green under the tree there, with a tongue
    # out over the paving, and looked pasted on (asked: "the grass leaf its look weird"). Since
    # 2026-11-26 the right has this lawn turned round instead, with a bank of bushes: lawn_both_sides.)
    alpha = alpha_left
    return Image.fromarray(np.dstack([rgb, alpha[..., None] * 255]).astype(np.uint8)), known


# ---------------------------------------------------------------- a lawn on the right too (2026-11-26)
# With the right tree and the bush in front gone, the paving and the lake at the right looked empty
# (asked, with a crop of them: "add a grass in this area so this will not look empty space"). Now the
# right has what the left has: the lawn, turned round, so the paving runs between two lawns down to the
# lake, and a bank of bushes by the shore. The bank is the lake piece's own bushes at its right end
# (extend_lake leaves them out), lifted off the water by their colour.
# The turned-round lawn keeps only what lies below RIGHT_LAWN_TOP: above it is the strip that on the
# left is hidden behind the tree, a blurry smudge (filled in where the reference has the tree) with the
# cut-off feet of its plants, flat against the lake; on the right it showed (asked, with a crop of it:
# "please fix the this blurriness... I need to a natural look"). So the paving runs on to the shore there,
# and the lawn begins below the strip, where its grass is clean, its top a crisp row of small round
# clumps of grass (LAWN_CLUMPS, the shape of the lawn's own edges at the paving). The bank stands behind
# that edge, so the clumps grow in front of the bushes' feet and hide the piece's straight bottom, as at
# the left, where the lawn grows in front of the bank. (Tried and dropped the same day: the bank in front
# with its foot faded into the grass, a hazy band; the strip's own row of tufts as the edge, which has
# the smudge between its tufts, a hard dark band; asked for "a natural look" without blur.)
# The bank's edges are cleaned of the water's colour (it showed as a pale blue rim) and it is sharpened,
# like any piece drawn bigger than in the sheet. (Cutting the strip away along its grass, column by
# column, left blocky holes; tried and dropped.) Both are drawn in the lawn's own layer, so the game has
# no new picture to load and the layers keep their numbers.
RIGHT_LAWN_TOP = 822  # output y: the turned-round lawn from here down (its clumps rise above it)
LAWN_CLUMPS = (16, 38, 3.5, 8.5, 11)  # a clump's width and height ranges (px), and the random seed
RIGHT_BANK = (430, 1.4, 24, 834, 4)  # lake piece px where the bank begins, its scale, how far it reaches
# past the right edge (output px), the output y of its foot (behind the lawn's edge) and how many px of
# its foot fade (only to round off the piece's straight bottom)


def right_bank():
    """The bushes at the lake piece's right end, without the water: green where the water is blue."""
    x0, s, _, _, fade = RIGHT_BANK
    a = np.array(piece("lake")).astype(np.float32)[:, x0:]
    g, b, al = a[..., 1], a[..., 2], a[..., 3]
    t = np.clip((g - b + 10) / 40.0, 0, 1)
    lab, n = ndi.label(ndi.binary_opening(t > 0.5, iterations=1))
    sizes = ndi.sum(np.ones_like(lab), lab, range(1, n + 1))
    keep = np.isin(lab, [i + 1 for i, v in enumerate(sizes) if v > 60])  # no specks
    keep = ndi.binary_erosion(keep, iterations=1)  # the outermost pixels are half water
    alpha = np.minimum(al / 255, ndi.gaussian_filter(keep.astype(np.float32), 0.6) * 1.15).clip(0, 1)
    # every pixel takes a bush colour (the half-water ones the nearest solid bush's), so no blue rim
    a[..., :3] = push_pull_fill(a[..., :3], keep & (alpha > 0.98))
    a[..., 3] = alpha * 255
    img = Image.fromarray(np.clip(a, 0, 255).astype(np.uint8))
    img = sharpen(resize_rgba(img, img.width * s * K, img.height * s * K))
    img = calm(img, 0.85, 0.95, 0.97)  # a little calmer, like the far bank at the left
    img = img.crop(img.getbbox())
    f = np.array(img).astype(np.float32)
    rows = np.arange(f.shape[0])[:, None]
    f[..., 3] *= np.clip((f.shape[0] - 1 - rows) / fade, 0, 1)  # its foot fades into the grass
    return Image.fromarray(np.clip(f, 0, 255).astype(np.uint8))


def clump_top(base, seed):
    """The output y of a lawn's top edge in each column: a crisp row of overlapping round clumps of
    grass (LAWN_CLUMPS) rising above the line y = base (a number, or one per column)."""
    w0, w1, h0, h1, _ = LAWN_CLUMPS
    rng = np.random.default_rng(seed)
    base = np.broadcast_to(np.asarray(base, np.float64), (W,))
    top = base.copy()
    x = 0.0
    while x < W:  # overlapping round clumps along the edge
        w, h = rng.uniform(w0, w1), rng.uniform(h0, h1)
        xs = np.arange(int(x), min(W, int(x + w) + 1))
        t = (xs - x) / w * 2 - 1
        top[xs] = np.minimum(top[xs], base[xs] - h * np.sqrt(np.clip(1 - t * t, 0, 1)))
        x += w * rng.uniform(0.55, 0.85)
    return top


def lawn_both_sides(full):
    """The finished lawn (a full frame) with its twin at the right: turned round, from RIGHT_LAWN_TOP
    down, and the bank behind its top edge."""
    twin = np.array(ImageOps.mirror(full)).astype(np.float32)
    top = clump_top(RIGHT_LAWN_TOP, LAWN_CLUMPS[4])
    rows = np.arange(H)[:, None]
    twin[..., 3] *= np.clip(rows - top[None, :] + 0.5, 0, 1)  # crisp: soft by a pixel only
    bank = right_bank()
    _, _, past, foot, _ = RIGHT_BANK
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    layer.paste(bank, (W - bank.width + past, foot - bank.height))  # (cut at the frame's edge)
    a = over(twin, np.array(layer).astype(np.float32))  # the lawn's tufts in front of the bushes' feet
    a = over(np.array(full).astype(np.float32), a)
    return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8))


# ---------------------------------------------------------------- no smudge by the tree's foot (2026-11-27)
# The left lawn is filled in smoothly (push_pull_fill) where the reference has the tree's foot and the
# bank bushes, and it stops at reference y 640, which cuts the bushes along a straight line. The tree
# was meant to hide all that, but it did not: right of its foot (x ~470 to 626) a dark band of bush
# bottoms, cut straight along the top and ending in a soft vertical fade over the water, and a smoothed
# wedge under the foot showed between Grumble and the balance (asked 2026-11-27, with a crop of it: "fix
# this blur fast"; the same strip that showed on the right on 2026-11-26). Now, right of PAVE_EDGE, the
# lawn begins at the shore below a crisp row of small clumps, as on the right (LAWN_CLUMPS), and keeps
# only its own grass there: the water meets the paving as it does all along the lake, and the paving
# runs up to the tree's foot. Left of it the soft shade under the foot stays, behind Grumble (a shadow
# there; the floor does not reach that far left, x < ~311, so the sky would show without it), and ends
# in a slanting edge of small clumps, like the lawn's own edges (in the finale Grumble is not there).
# (Tried and dropped the same day: the filled pixels under the foot given the lawn's own grass from a
# little way below them, which repeated its tufts in plain stripes.)
PAVE_EDGE = (470, 792, 1.6, 5)  # output px: where the shade's slanting end meets the lawn (behind Grumble's
# horn), how many px it goes left for each px up, and its clumps' random seed
SHORE = (762, 27)  # output y the lawn there begins at (its clumps rise above it), and the clumps' seed
BAND_END = 810  # output y: only the lawn above this is changed (below it, and its twin, as they were)


def lawn_by_the_foot(full, known):
    """The left lawn (a full frame) with no filled-in pixel showing right of PAVE_EDGE (known: where
    the reference has grass, in reference px)."""
    a = np.array(full).astype(np.float32)
    kn = np.array(Image.fromarray(known.astype(np.uint8) * 255).resize((W, H), Image.BILINEAR)) / 255.0
    rows = np.arange(H)[:, None]
    top = clump_top(SHORE[0], SHORE[1])
    x0, y0, slope, seed = PAVE_EDGE
    edge = x0 + (rows - y0) * slope + (SHORE[0] - clump_top(SHORE[0], seed)[:H, None])  # (bumps to the right)
    cut = (np.arange(W)[None, :] >= edge) & (rows < BAND_END)
    a[..., 3] = np.where(cut, a[..., 3] * np.clip(rows - top[None, :] + 0.5, 0, 1) * kn, a[..., 3])
    return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8))


# ---------------------------------------------------------------- where the arch stood (2026-11-23)
# The reference has a stone arch on the right, with steps and a block. It is left out, and what stood
# behind it is carried on to the right edge and past it (a side view looks past that edge at the
# scene's mirror image: js/world.js, mirrorBackground).

LAKE_JOIN, LAKE_WIDTH = 640, 990  # lake piece px: from the join on, the water before it, mirrored


def extend_lake(p):
    """The lake's open water runs on to the right, out past the frame. From LAKE_JOIN on it is the
    water just before the join, mirrored: clean open water, no bank bushes (the bushes at the piece's
    right end, under the arch, go)."""
    a = np.array(p)
    xs = np.arange(LAKE_JOIN, LAKE_WIDTH)
    return Image.fromarray(np.concatenate([a[:, :LAKE_JOIN], a[:, 2 * LAKE_JOIN - 1 - xs]], 1))


# forest piece px: the stretch of trees copied (x0, x1), where its copy starts, and how much hazier it
# is (it stands further away)
FOREST_FILL = (140, 470, 1250, 0.12)


def extend_forest(p):
    """The forest is low at its right end (the arch stood in front of it there): a stretch of the same
    forest, mirrored and a little hazier, stands behind it there, out past the frame, so the tree line
    goes on at its usual height. Its start fades in softly (it was behind a tree at the right until
    2026-11-26; it shows now, and needs nothing more)."""
    x0, x1, at, haze = FOREST_FILL
    a = np.array(p).astype(np.float32)
    h, w = a.shape[:2]
    seg = a[:, x0:x1][:, ::-1].copy()
    n = seg.shape[1]
    seg[..., :3] = seg[..., :3] * (1 - haze) + sky_color(470) * haze
    seg[..., 3] *= np.clip(np.arange(n) / 60.0, 0, 1)[None, :]
    wide = max(w, at + n)
    back = np.zeros((h, wide, 4), np.float32)
    back[:, at : at + n] = seg
    front = np.zeros((h, wide, 4), np.float32)
    front[:, :w] = a
    return Image.fromarray(np.clip(over(front, back), 0, 255).astype(np.uint8))


MOUNTAINS_DOWN = 80  # piece px the far mountains' foot is carried on down


def extend_down(p):
    """The mountain piece ends in a straight line along its foot, which stood behind the forest. The
    far mountains' foot is carried on down (its last row, smoothed along the row), so between the
    trees at the right only far-off hills show, never the sky."""
    a = np.array(p).astype(np.float32)
    last = a[-1]
    alpha = ndi.gaussian_filter1d(last[:, 3], 6)
    rgb = ndi.gaussian_filter1d(last[:, :3] * last[:, 3:], 6, axis=0) / np.maximum(alpha, 1e-3)[:, None]
    foot = np.concatenate([rgb, alpha[:, None]], 1)
    out = np.concatenate([a, np.repeat(foot[None], MOUNTAINS_DOWN, 0)])
    return Image.fromarray(np.clip(out, 0, 255).astype(np.uint8))


CLOUD_END = (1452, 26)  # output px: the clouds end here, softly (over this many px)


def end_clouds(img):
    """In the reference the arch half hid the cloud beside it, and build_clouds fades that cloud out in
    a straight line just before the arch. Without the arch it would look cut off, so it goes: the clouds
    end with the round puff left of it, and the thin haze joining the two fades out softly."""
    a = np.array(img).astype(np.float32)
    x0, soft = CLOUD_END
    t = np.clip((x0 - np.arange(W)) / soft + 0.5, 0, 1)
    a[..., 3] *= (t * t * (3 - 2 * t))[None, :]
    return Image.fromarray(a.astype(np.uint8))


# each piece's change, by layer id
EXTEND = {"mountains-far": extend_down, "forest": extend_forest, "lake": extend_lake}


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


# The big tree and its branch, calmer (2026-11-23, design review: the tree drew the eye from the
# balance): (saturation, contrast, brightness) for the finished layer. Saturation goes about each
# pixel's own luma, contrast about the layer's mean colour (its pixels with alpha > 128, after the
# saturation), then brightness; the alpha is not touched, so the outline is the same as before.
CALM = {"branch": (0.72, 0.86, 0.93), "tree": (0.72, 0.86, 0.93)}


def calm(img, sat, contrast, bright):
    a = np.asarray(img.convert("RGBA")).astype(np.float32)
    rgb, al = a[..., :3], a[..., 3:4]
    lum = (rgb * np.array([0.299, 0.587, 0.114])).sum(axis=-1, keepdims=True)
    rgb = lum + (rgb - lum) * sat
    mean = rgb[al[..., 0] > 128].mean(axis=0)
    rgb = mean + (rgb - mean) * contrast
    rgb = np.clip(rgb * bright, 0, 255)
    return Image.fromarray(np.concatenate([rgb, al], axis=-1).astype(np.uint8))


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


def piece_layer(name, x, y, s, flip=False, lid=None):
    p = piece(name)
    if name in GRADE:
        p = grade(p, GRADE[name])
    if flip:
        p = ImageOps.mirror(p)
    if lid in EXTEND:
        p = EXTEND[lid](p)
    w, h = p.size
    q = resize_rgba(p, w * s * K, h * s * K)
    if s * K > 1.05:
        q = sharpen(q)
    return q, round(x * K), round(y * K)


def render_layers(layout):
    """[(id, image, x, y, anim)] from the back to the front, in output px (1920 x 1080)."""
    out = [("sky", build_sky(), 0, 0, None)]
    img, x, y = crop_bbox(end_clouds(to_out(build_clouds())))  # soft already: no sharpening
    out.append(("clouds", img, x, y, "drift"))
    lawn, known = build_lawn()
    for item in layout:
        kind = item[0]
        if kind == "floor":
            img, x, y = crop_bbox(sharpen(build_floor(item[1]), 1.6, 60))
            out.append(("floor", img, x, y, None))
        elif kind == "lawn":
            img, x, y = crop_bbox(lawn_both_sides(lawn_by_the_foot(sharpen(to_out(lawn), 1.2, 50), known)))
            out.append(("lawn", img, x, y, None))
        else:
            name, px, py, sc, flip, lid, anim = (list(item) + [None, None])[:7]
            lid = lid or name
            img, x, y = piece_layer(name, px, py, sc, flip, lid)
            if lid in CALM:
                img = calm(img, *CALM[lid])
            out.append((lid, img, x, y, anim))
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
    # layers drawn from a mirrored piece say so ("flip": a mirrored tree would sway about its own trunk,
    # js/world.js, bgCrown; the near mountains and, since 2026-11-26, the branch are, now)
    flipped = {(list(it) + [None] * 7)[5] or it[0] for it in layout if it[0] not in ("floor", "lawn") and len(it) > 4 and it[4]}
    entries = []
    for i, (lid, img, x, y, anim) in enumerate(layers, 1):
        name = f"{i:02d}-{lid}.png"
        img.save(os.path.join(ldir, name), optimize=True)
        entries.append({"id": lid, "file": "layers/" + name, "x": x, "y": y, "w": img.size[0], "h": img.size[1], "anim": anim})
        if lid in flipped:
            entries[-1]["flip"] = True
    data = {"width": W, "height": H, "layers": entries}
    json.dump(data, open(os.path.join(ROOT, "layout.json"), "w"), indent=1)
    with open(os.path.join(ROOT, "layout.js"), "w") as f:
        f.write("// Made by tools/make_background.py (the same as layout.json, for index.html)\nwindow.LAYOUT = ")
        json.dump(data, f, indent=1)
        f.write(";\n")
    print(f"wrote background.png and {len(entries)} layers")


# ---------------------------------------------------------------- one tree, and its branch at the top right
# (2026-11-26; asked: "the trees both side making a cluttered... make uncluttered and best design")
# The big tree stands at the left: Zippy's vine comes down out of its leaves (it crosses the frame's top
# edge between x 420 and ~510, even when he swings over to the crown, and the leaves there are solid up
# to x ~780), he peeks out from behind its trunk (js/world.js, PEEK) and Grumble sleeps at its foot. Its leafy branch, which hung over the middle of the top (x 333 to
# 1004) until 2026-11-26, now hangs into the top right corner, turned round, as if from a tree just out of
# the picture (BRANCH_AT): its leaves are solid from x ~1420 to the edge between y ~30 and 150 (the crown
# count sits on them), its lowest leaf hangs to y 282 at x 1778, far from the balance. Along the top
# edge, from x 782 to 1350, there is only sky: over the balance and behind the question bar (51% of the
# top 300 px is leaves; with a tree on each side it was 65%, and the leaves met over the bar). The left
# has the tree, Zippy, Grumble and the lawn; the right the balance and the open lake.
# A tree on each side (2026-11-23 to 11-26; asked, once the arch had gone: "right side there is nothing
# and left side is tree... equal left and right side"), the big tree's picture at the right:
# - mirrored at (1168, -176): its crown leaned in over the balance, the two crowns met across the top
#   (about three quarters of the top 300 px was leaves), like a keyhole ("it's make a cluttered");
# - not mirrored at (1600, -176): a bare trunk, its top cut off by the frame, with a leafy plant at its
#   foot in front of the lake ("its like cut the tree and the grass leaf its look weird");
# - mirrored at (1340, -176): its crown filled the top right corner and its trunk bent out to the edge and
#   down to its roots at the lake's edge. Still two trunks closing the scene in, and leaves along the
#   whole top but the middle: cluttered (2026-11-26).
# Tried on 2026-11-26 and left out (rendered over the game and compared): the right tree further out (at
# 1460 its trunk leaves the picture half way down, so its crown and roots look like two things), a
# smaller tree at the right (its trunk stands just beside the right pan), the branch kept at the left as
# well (leaves along the top again) and a low bank of the lake piece's own bushes at the right shore
# (tidy, but one more thing on the right when the ask was for less).
# The scene stays zoomed out a little (2026-11-23: "zoomout screen"): the big tree and the branch are
# drawn FRAME_ZOOM as big, the tree about FRAME_ANCHOR (on the frame's left edge, so the trunk's far side
# stays out of the picture; at the height where its foot stays on the lawn). The balance, Zippy and
# Grumble keep their size. (js/world.js: Zippy's peek follows the trunk's edge, PEEK; three birds fly in
# from the right into the tree's leaves, two fly out of them and away under the branch: .bird-flock in
# styles.css.)
FRAME_ZOOM = 0.88
FRAME_ANCHOR = (0, 560 / K)  # reference px (output px (0, 560))
BRANCH_AT = (1350, -14)  # output px: the branch's top-left, turned round (1.2 x FRAME_ZOOM as big, as before)


def framed(x, y, s):
    """A framing piece's place and scale (reference px), zoomed out about FRAME_ANCHOR."""
    ax, ay = FRAME_ANCHOR
    return ax + (x - ax) * FRAME_ZOOM, ay + (y - ay) * FRAME_ZOOM, s * FRAME_ZOOM


LAYOUT = [
    # (piece, x, y, scale, mirrored, layer id, idle animation)  x, y = top-left in reference px
    ("mountains", 1330, 305, 1.25, False, "mountains-far"),
    ("mountains", -117, 285, 1.7, True, "mountains"),
    ("forest", 200, 421, 1.0, False, "forest"),
    ("lake", 405, 556, 1.32, False, "lake", "shimmer"),
    ("floor", [(300, 652), (1500, 652), (2300, 1010), (-500, 1010)]),
    ("lawn",),
    # ("arch", 1308, 145, 1.1, False, "arch"): left out since 2026-11-23 (see "Where the arch stood")
    # the branch at the top right, turned round (until 2026-11-26 at the left, over the middle of the top:
    # *framed(330, -70, 1.2), not mirrored)
    ("branch", BRANCH_AT[0] / K, BRANCH_AT[1] / K, 1.2 * FRAME_ZOOM, True, "branch", "branch"),
    ("tree", *framed(-130, -250, 1.42), False, "tree", "crown"),  # (before the zoom: -130, -250, 1.42)
    # ("tree", 1340 / K, -176 / K, 1.42 * FRAME_ZOOM, True, "tree-right", "crown"): the big tree's picture
    # turned round at the right edge, left out since 2026-11-26 (see "One tree, and its branch...")
    # ("bushBig", 1395, 700, 1.45, False, "bush-front-right", "sway"): left out since 2026-11-26 (asked,
    # with a picture of it: "remove this from the right side front of the screen")
]

if __name__ == "__main__":
    main(LAYOUT)
