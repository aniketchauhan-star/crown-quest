"""Small image helpers shared by cut_pieces.py and make_background.py."""
import numpy as np
from scipy import ndimage as ndi


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
