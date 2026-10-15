"""Cuts the 18 pieces out of "background sheet.png" (in the project folder) into ../pieces/.

Each piece is trimmed to its own size and keeps its transparency. The mountains and the forest touch
on the sheet, so they are separated by colour, the small gap left in the mountains is filled, and
the mountain strip's two cut ends fade out.

Needs Python 3 with numpy, Pillow and scipy.  Run:  python3 jungle-background/tools/cut_pieces.py
"""
import json
import os

import numpy as np
from PIL import Image
from scipy import ndimage as ndi

from imaging import push_pull_fill

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
SHEET = os.path.join(os.path.dirname(ROOT), "background sheet.png")
OUT = os.path.join(ROOT, "pieces")

# Where each piece is on the sheet (x0, y0, x1, y1).
BOXES = {
    "tree": (21, 24, 658, 696), "branch": (588, 32, 1141, 276), "arch": (1156, 33, 1518, 524),
    "rocks": (873, 227, 1150, 400), "bushBig": (401, 364, 681, 578), "bushRound": (695, 412, 936, 562),
    "fern": (953, 419, 1162, 536), "tuft1": (944, 545, 1085, 604), "tuft2": (1116, 555, 1235, 598),
    "tuft3": (1267, 565, 1368, 598), "tuft4": (1403, 565, 1503, 604), "lake": (24, 859, 806, 990),
    "tiles": (811, 853, 1296, 986), "tileA": (1263, 856, 1461, 902), "tileB": (1294, 913, 1424, 987),
    "tileC": (1419, 921, 1519, 966),
}
STRIP = (30, 584, 1512, 838)  # the mountains + forest strip (they touch)


def main():
    im = np.array(Image.open(SHEET).convert("RGBA"))
    joined = ndi.binary_closing(im[..., 3] > 40, structure=np.ones((9, 9)))
    lab, _ = ndi.label(joined)

    def grab(x0, y0, x1, y1):
        """Only the biggest piece inside the box (with a small margin), nothing that pokes in."""
        m = 6
        X0, Y0 = max(0, x0 - m), max(0, y0 - m)
        X1, Y1 = min(im.shape[1], x1 + m), min(im.shape[0], y1 + m)
        sub = im[Y0:Y1, X0:X1].copy()
        L = lab[Y0:Y1, X0:X1]
        ids, cnt = np.unique(L[L > 0], return_counts=True)
        mask = ndi.binary_dilation(L == ids[np.argmax(cnt)], iterations=3)
        sub[..., 3] = np.where(mask, sub[..., 3], 0)
        return sub, (X0, Y0)

    def trim(arr, origin):
        ys, xs = np.where(arr[..., 3] > 8)
        y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
        return arr[y0:y1, x0:x1], (origin[0] + x0, origin[1] + y0)

    out = {k: trim(*grab(*b)) for k, b in BOXES.items()}

    # mountains: the blue band above y 712 (from x 500); the forest's green tree tops poke into it
    comb, org = grab(*STRIP)
    g, b = comb[..., 1].astype(int), comb[..., 2].astype(int)
    yy, xx = np.mgrid[0:comb.shape[0], 0:comb.shape[1]]
    Y, X = yy + org[1], xx + org[0]
    mount = (Y < 712) & (X >= 500) & (comb[..., 3] > 0) & ~((Y >= 680) & (g > b + 8))
    m_arr = comb.copy()
    m_arr[..., 3] = np.where(mount, comb[..., 3], 0)
    f_arr = comb.copy()
    f_arr[..., 3] = np.where(~mount, comb[..., 3], 0)
    out["forest"] = trim(f_arr, org)
    m_arr, m_org = trim(m_arr, org)
    M = m_arr.astype(np.float32)
    a = M[..., 3].copy()
    h, w = a.shape
    fill = np.zeros((h, w), bool)
    for x in range(w):
        col = np.where(a[:, x] > 128)[0]
        if len(col):
            fill[col[0] + 4:, x] = True  # below its soft outline a mountain is solid down to its base
    fill &= a < 250
    M[..., :3] = np.where(fill[..., None], push_pull_fill(M[..., :3], a >= 250), M[..., :3])
    M[..., 3] = np.where(fill, 255, a)
    ramp = np.clip(np.minimum(np.arange(w), w - 1 - np.arange(w)) / 36.0, 0, 1)
    M[..., 3] *= ramp[None, :]  # the strip's straight cut ends fade out
    out["mountains"] = (M.astype(np.uint8), m_org)

    os.makedirs(OUT, exist_ok=True)
    meta = {}
    for k, (arr, o) in out.items():
        Image.fromarray(arr).save(os.path.join(OUT, k + ".png"), optimize=True)
        meta[k] = {"sheet_x": int(o[0]), "sheet_y": int(o[1]), "w": int(arr.shape[1]), "h": int(arr.shape[0])}
    json.dump(meta, open(os.path.join(OUT, "pieces.json"), "w"), indent=1)
    print(f"cut {len(out)} pieces into {OUT}")


if __name__ == "__main__":
    main()
