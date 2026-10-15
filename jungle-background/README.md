# Jungle lake background

The pieces from `background sheet.png`, arranged like `reference.png`. This is the game's background (Zippy's Crown Quest copies the layers into `assets/bg/jungle/`). To keep the game screens calm, it leaves out the small details: the grass tufts, the bushes and fern along the lake, and the leaves and bush where Grumble sleeps.

| File | What it is |
|---|---|
| `background.png` | The finished background, 1920 × 1080. |
| `layers/` | The same picture as 12 separate layers, already sized: `01-sky.png` at the back to `12-bush-front-right.png` at the front. The game moves some of them (drifting clouds, swaying branch and plant). |
| `layout.json` | Where each layer goes in the 1920 × 1080 frame (`x`, `y`, `w`, `h`), back to front, plus a suggested idle motion. `layout.js` is the same data for `index.html`. |
| `index.html` | A preview: open it in a browser. It has gentle motion, a slider to compare with the reference, and a list to show or hide layers. |
| `pieces/` | All 18 pieces cut from the sheet, untouched in size (the unused ones too). |
| `reference.png` | The picture the layout is matched to. |

The sheet has no sky, clouds or grass lawn, so those come from `reference.png`. The far mountains and forest are colour-matched to it, so they look as far away as they do there.

## Changing it

1. `tools/cut_pieces.py` cuts the sheet into `pieces/`. Run it again if the sheet changes.
2. `tools/make_background.py` arranges the pieces and writes everything else. To move, resize or flip a piece, edit `LAYOUT` at the bottom of that file (x and y are in `reference.png` pixels), then run it again.

Both need Python 3 with numpy, Pillow and scipy (`pip3 install numpy pillow scipy`). Run them from the project folder, for example `python3 jungle-background/tools/make_background.py`.
