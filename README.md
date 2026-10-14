# Zippy's Crown Quest

A 16:9 browser game that teaches **linear equations in one variable** (Class 8, ages 12–14). Zippy the monkey swaps crowns off a balance scale for gold bars of the same mass. If the balance tips, Grumble the sleepy monster wakes up. A full play-through takes about 20 minutes.

## Run it

- **Easiest:** double-click `index.html`. It runs straight from the folder, with no internet and no install.
- **On a classroom network or website:** upload the whole folder as it is, then open `index.html`.
- Works on laptops, Chromebooks, iPads and Android tablets, with touch, mouse or keyboard. It was tested in Chrome and Safari's engine; Edge uses Chrome's engine. Phones and tablets need to be held sideways.

Progress is saved in the browser. Next time, the title screen shows **Continue**.

## Teacher shortcuts

| Do this | How |
|---|---|
| Jump to any chapter | Menu (≡) → Chapters |
| Share a link that starts at a chapter | Add `#` and the chapter to the address, e.g. `index.html#L5`. Start then opens that chapter. |
| Next / Back during explanations | → and ← arrow keys (handy for presenting on a projector) |
| Pause | The ≡ button or the Esc key. The story holds until you close the menu. |
| Sound | Menu → Music, Sound effects and Voice switches |

The chapter names you can use after `#`: `intro`, `L1`, `L2`, `L3`, `L4a` (mystery crown + words), `L4c` (label activity), `L4e` (sort activity + recap), `L4g` (try & check), `L5`, `L6`, `L7`, `L8`, `finale`.

## What the child does

| Chapter | Learning |
|---|---|
| Intro | Meet Grumble and Zippy. A level balance means both sides are equal. Each coin is 1 unit. |
| Levels 1–3: The Swap | Drag a gold bar to Zippy, tap SWAP. The right bar keeps the balance level. |
| Level 4: The Mystery Crown | The crown becomes **x**, so the scene turns into **x + 2 = 7**. Words: variable, constant, algebraic expression, equation, LHS, RHS, linear equation in one variable. Activities: label the parts of 4x + 3 = 19; sort linear and nonlinear equations. Try & Check finds the **solution**. |
| Levels 5–7: Practice | Check before you swap: replace x, find each side, compare. |
| Level 8: The Smart Way | x + 8 = 23: take 8 off **both** sides, so x = 15, then check. |
| Finale | Three key ideas and all 8 crowns. |

Mistakes are safe: Grumble wakes up, roars comically and goes back to sleep. Every task gives a short hint after the first miss and a full explanation after the second. If nothing happens for 8 seconds, a hand shows what to do.

## Edit the words or numbers

All text, voice lines, level numbers, answer choices and feedback live in **`js/content.js`**. You can edit them there without touching any game logic.

- Each narrator line has an ID (`"intro-1"`, `"l4-25"`, …), so a voice actor's recordings can be matched to it.
- The levels are in `CONTENT.levels`:
  - `crown`: the crown's hidden mass.
  - `left`: coins beside the crown.
  - `right`: coin rows on the right pan.
  - `bars`: the three gold bars (shown in a new random order every time).
  - `chips`: the three number choices for each blank in the check.
- Keep `crown + left = sum of right` true, and make sure one of the bars equals `crown`.
- Keep the special symbols as they are: `−` (minus), `≠`, `—`, `…`. To write a power, type `x^2`.

## Add real voice and sound recordings

The game is complete without any audio files: every sound effect, the music and the snoring are generated in code, and the voice uses the device's built-in speech. To use recordings instead:

1. **Voice:** record each line as `assets/vo/<line id>.mp3` (e.g. `assets/vo/intro-1.mp3`). Then set `recordedVoice: true` in the `audio` section at the bottom of `js/content.js`. Any line without a file still uses the built-in voice.
2. **Sound effects:** add a mapping in `overrides`, e.g. `"zippy.laugh": "assets/audio/zippy-laugh.mp3"`. Every cue name is listed in `js/audio.js` (`grumble.snoreIn`, `zippy.laugh`, `balance.clang`, …).

## Replace the artwork

The balance scale is drawn in code (`BalanceArt` in `js/world.js`): slim beam with ball ends, round hub, shallow bowls on thin rods, and a stepped base. `balanced game.png` is no longer used. Its sizes (beam length, bowl width and depth) are the `BAL` numbers at the top of that section.

The other original PNGs stay in this folder. If you change any of them (keep the same file names, and the 4 × 2 frame layout for character sheets), run:

```
python3 tools/prepare_assets.py
```

It needs only Python 3, with no extra packages. It cuts every character frame out by its own pixels, so hands and Zzz letters that cross the grid lines are kept. It lines all frames up (Zippy by the tip of his tail, Grumble by his feet), shrinks the props and rewrites `assets/`. It takes about a minute.

## Files

```
index.html          the page
styles.css          all styling
js/content.js       ← all words and numbers (edit this)
js/engine.js        stage scaling, tweens, camera, dragging, pause, save
js/world.js         temple, torches, vines, Grumble, Zippy, the balance, gold bars
js/ui.js            captions, buttons, SWAP, bubbles, name bursts, hints, Word Treasure, menu, Check panel
js/activities.js    Zippy's Notebook, label + sort activities, recap, finale
js/flow.js          the story: intro, levels 1–8, finale
js/audio.js         generated sound effects, music and voice
js/main.js          loading + title screen
assets/             game-ready images and sprites.js (generated; the fonts are embedded in styles.css)
tools/prepare_assets.py   rebuilds assets/ from the original PNGs
```

For analytics, `CQ.track(event, data)` in `js/engine.js` logs `step_start`, `answer`, `hint_shown`, `level_complete` and `game_complete` to the console. Point it at your platform's analytics call.
