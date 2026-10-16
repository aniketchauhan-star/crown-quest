# Zippy's Crown Quest

A 16:9 browser game that teaches **linear equations in one variable** (Class 8, ages 12–14). Zippy the monkey swaps crowns off a balance scale for gold bars of the same mass. If the balance tips, the alarm rings and Grumble the sleepy monster wakes up. A full play-through takes about 25–30 minutes.

## Run it

- **Easiest:** double-click `index.html`. It runs straight from the folder, with no internet and no install.
- **On a classroom network or website:** upload the whole folder as it is, then open `index.html`.
- Works on laptops, Chromebooks, iPads and Android tablets, with touch, mouse or keyboard. It was tested in Chrome and Safari's engine; Edge uses Chrome's engine. Phones and tablets need to be held sideways.

The title screen shows only the artwork and the play button. The play button always starts a new game from the intro. It forgets the saved progress and shows the first-time hints again, but keeps the sound settings.

The game screen has no level sign, crown row or corner buttons, so nothing distracts from the balance. The question bar shows Zippy's face; tap it to hear the line again. Collected crowns fly up out of the picture.

## Teacher shortcuts

| Do this | How |
|---|---|
| Jump to any chapter | Press Esc → Chapters (there is no menu button on screen) |
| Share a link that starts at a chapter | Add `#` and the chapter to the address, e.g. `index.html#L5`. Start then opens that chapter. |
| Pace | Each screen moves on by itself after its line is read, with a short pause to look. The **Next** button (top right) is always there: during a line it moves on to the next line, and at any other moment it goes on to the next part of the quest. → or a presenter clicker also moves on a line. ← goes back on formula screens. |
| Pause | The Esc key. The story holds until you close the menu. |
| Sound | Esc → Music, Sound effects and Voice switches |

The chapter names you can use after `#`: `intro`, `L1`, `L2`, `L3`, `L4a` (mystery crown + words), `L4c` (label activity), `L4e` (sort activity + quick recap), `L4g` (try & check), `L5`, `L6`, `L7`, `L8`, `L9` (two crowns), `P` (practice equations), `finale`.

## What the child does

| Chapter | Learning |
|---|---|
| Intro | Meet Zippy, then Grumble. If the balance tips, the alarm wakes Grumble: a cloud over sleeping Grumble shows it while the rest of the screen fades. Each coin is 1 unit. |
| Levels 1–3: The Swap | Drag a gold bar to Zippy, tap SWAP. The right bar keeps the balance level. |
| Level 4: The Mystery Crown | The crown becomes **x**, so the scene turns into **x + 2 = 7**. Words (on the formula screen): variable, constant, algebraic expression, equation, LHS, RHS, linear equation in one variable. Activities: label the parts of 4x + 3 = 19; sort linear and nonlinear equations; a quick recap. Try & Check finds the **solution**. |
| Levels 5–7: Check It | Check before you swap: replace x, find each side, compare. Level 5 is guided; in 6 and 7 the child chooses. |
| Level 8: The Smart Way | x + 8 = 23: split 23 into 8 + 15, take 8 off **both** sides (one drag moves both), so x = 15, then check. |
| Level 9: Two Crowns | 2x + 4 = 18: remove 4 from both sides, divide both sides by 2, so x = 7. Check 2 × 7 + 4 = 18, then swap each crown for a 7 bar. |
| Practice | Six equations typed on a keypad: x + 6 = 17, 3x + 5 = 26, x − 7 = 12, x ÷ 4 = 6, 2x + 7 = 1, 3(x + 2) = 21. Right first time: the check is shown. Otherwise the board explains why (LHS ≠ RHS) and solves it step by step with the child, then checks it. |
| Finale | Three key ideas and all 10 crowns. |

The story moves on by itself, so children only tap when there's something to do: dragging a bar, tapping SWAP, picking a number, or typing an answer and tapping Check. The Next button is for anyone who wants to move on sooner. Tapped during a line, it goes to the next line. Tapped while the child has something to do, it skips ahead to the next part of the quest. The pause after each line stops while the menu is open, and while a child taps Zippy's face in the question bar to hear the line again.

Mistakes are safe, and a little funny. When a wrong swap tips the balance:
- The alarm rings and Grumble wakes up and roars.
- Zippy gets a fright with the crown in his hands. He clutches it while the alarm rings, hides behind it when Grumble stands up, and jumps at the roar.
- He sheepishly gives it back: the crown jumps out of his hands onto the pan, and the wrong bar goes back to its own stand, marked "Tried".
- Zippy swings away on his vine, up and out of the picture, empty-handed.
- Grumble looks around and yawns, and after a soft fade he is asleep again.
- Only Zippy's smiling head peeks out from behind the tree ("Hmm?"). He ducks back, then swings in with a slide whistle and a giggle.

Every task gives a short hint after the first miss and a full explanation after the second.

Winning a level is a little story too:
- Zippy lifts the crown and puts it on his own head ("wow!"), then celebrates wearing it.
- He swings off on his vine, still wearing it and waving goodbye, and the screen fades.
- The next level is set up behind the fade.
- Zippy's head peeks out from behind the tree to check that Grumble is still asleep. He swings back in, and the new crown appears with a sparkle.

(The first of Level 9's two crowns flies up out of the picture instead, because he still needs his hands for the second swap.)

At key teaching moments the rest of the screen fades back and the thing being explained stays bright, inside a soft gold ring:
- the coin's "1 unit";
- the bars, and SWAP, the first time;
- the coins being counted after a second miss;
- each step of Level 4 (the crown, the coins, x, x + 2, 7, then the equation);
- every verdict on the Check panel;
- the key steps of Levels 8 and 9.

The ring glides from one thing to the next. Taps still work while it is on. (`CQ.focus` in `js/ui.js`; the moments are the `look(…)` calls in `js/flow.js`.)

The Level 4 words are explained on **Zippy's formula screen**. The game fades to a calm dark and x + 2 = 7 stands big and bright in the middle. Each line adds one colour-coded label, box or highlight, and only the new piece pops in, so the child's eye goes straight to it.

The gold bars sit still on their stands. When it's time to choose, a faded copy of one bar lifts off and floats toward Zippy, to show it can be picked up and given to him. It is a different bar each time, left to right, so the hint never points at the answer. It repeats every 6 seconds until a bar is in Zippy's hands. While a bar is being dragged, a faded copy stays on its stand. If nothing happens for 8 seconds, a hand (pointing up, from below) carries a faded bar to Zippy to show what to do.

Movement is slow and smooth so children can follow it. Zippy swings over and the bar and crown pass each other as they swap (about 2½ seconds). The balance tips slowly. Zippy never just slides: he stays hanging from his vine, and he leaves and comes back in big swinging curves. A chapter jump or a restart fades softly to dark and back.

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
- The practice equations are in `CONTENT.practice.problems`. Each one lists its steps (`ask`: two choices, `act`: one button, `type`: a number on the keypad) and its check. `lhs` describes the left side, so the game can work it out for any answer a child types.
- Keep the special symbols as they are: `−` (minus), `≠`, `×`, `÷`, `—`, `…`. To write a power, type `x^2`. In equations, `[[x|4]]` shows a fraction (x over 4), `{{− 8}}` the blue "same on both sides" highlight and `<<+ 4>>` a red highlight.

## Add real voice and sound recordings

The game is complete without any audio files: every sound effect, the music and the snoring are generated in code, and the voice uses the device's built-in speech. To use recordings instead:

1. **Voice:** record each line as `assets/vo/<line id>.mp3` (e.g. `assets/vo/intro-1.mp3`). Then set `recordedVoice: true` in the `audio` section at the bottom of `js/content.js`. Any line without a file still uses the built-in voice.
2. **Sound effects:** add a mapping in `overrides`, e.g. `"zippy.laugh": "assets/audio/zippy-laugh.mp3"`. Every cue name is listed in `js/audio.js` (`grumble.snoreIn`, `zippy.laugh`, `balance.clang`, …).

## Replace the artwork

**The background** is the jungle lake in `jungle-background/`, built from the pieces in `background sheet.png` (see `jungle-background/README.md`). The game draws it as 12 separate layers, so the clouds drift and the branch and the big plant sway gently (off with Menu → Reduced motion). To change it:
1. Edit `LAYOUT` in `jungle-background/tools/make_background.py` and run it. This tool needs numpy, Pillow and scipy.
2. Run `python3 tools/prepare_assets.py`, which copies the layers into `assets/bg/jungle/`.

**The stone stand** under each gold bar (and the Level 8–9 "Taken off" stands) is `break stand .png`. The tool copies it to `assets/props/brick-stand.png`.

**The balance** is the wooden one in `new balance .png`, a sheet of separate parts: beam, hub, post, base, plate, rope hanger and leaves. `tools/prepare_assets.py` cuts each part out by its box (`BALANCE_PARTS`) into `assets/balance/`. The game puts the parts together like the picture of the finished balance (`ART` in the balance section of `js/world.js`):
- The beam tips behind the hub, which stays upright.
- Each plate hangs from its rope under the beam and stays level.
- Things stand on the plates.

If the sheet is replaced, re-measure `BALANCE_PARTS` and `ART`.

**The interface pieces** come from `elements.png`, a sheet of 34 pieces made with the prompt in `ChatGPT-Asset-Sheet-Prompt.md`. `tools/prepare_assets.py` cuts the sheet into `assets/elements/`, one PNG for each of the 20 pieces the game uses (`UNUSED_ELEMENTS` in the tool lists the 14 it leaves out, the old gold balance among them). It also measures the points the game needs and writes them as `GEOM` in `assets/sprites.js`: the hand's fingertip, the thought cloud, the speech bubble and the panel's border, plus where each balance part was on its sheet. To change a piece, make a new sheet with the same rows in the same order (`ELEMENT_ROWS` in the tool) and run the tool. If a row has the wrong number of pieces, it stops and says which row.

- **Balance.** `BAL.S` is its overall size, and `ART_K` matches the parts to the size of the things on the plates. The beam's middle stretches a little so the ropes hang where they do in the picture.
- **Stretched pieces.** The caption bar, panels and boards, speech bubbles and the wooden buttons all stretch without bending their corners. Each rule in `styles.css` names its piece and where to cut it (`border-image`). `CQ.patch` in `js/ui.js` then paints each piece in one go, so no seams show. If new art has a thicker or thinner frame, change the cut numbers in those rules:
  - panel: `30 35 34 30`
  - speech bubble: `82 132 94 130` (cut through the middle of the oval)
  - wooden button: `0 51 0 51`
- **Zippy's swap:** `zippy swap.png` (made with `ChatGPT-Zippy-Swap-Prompt.md`) has empty hands. The game puts the real gold bar, with its number, and the crown in his hands. It then draws his fists again over them, so his fingers curl over the bar's top edge and its number stays in view. The fists are redrawn cleanly: the art's skin and creases inside one smooth outline, with a soft shadow where they press, so no fur, tummy or stray marks show on the bar or crown. To set this up:
  - `SWAP_FISTS` in `tools/prepare_assets.py` has a box around the fists and a seed point on each piece of fist skin.
  - `SWAP` in `js/world.js` has where he grips in each frame.

  If you replace the sheet, both need re-measuring. The tool also cuts Zippy's face for the question bar from it (`FACE`).
- **Scared Zippy holding the crown:** `zippy scared crown.png` (made with `ChatGPT-Zippy-Scared-Crown-Prompt.md`) is used after a wrong swap, until he gives the crown back. `SCARED_CROWN` in `js/world.js` is where the crown is in each frame (and how wide), so it jumps back to the pan from his hands. Re-measure it if the sheet is replaced.
- **Zippy wears the crown:** `zippy crown.png` (made with `ChatGPT-Zippy-Crown-Prompt.md`; the tool also finds it as `zippy crown..png`) has him lifting the crown, putting it on, then wow, proud, thumbs up, wave, laugh and straightening it. While he wears it, his everyday poses use this sheet (`crownPose` in `js/world.js`). `CROWN_HEAD` is where the crown sits on his head, for its sparkle.
- **Still drawn in code:** the character name titles (text only), Grumble's shadow, comic sound words, confetti, drop rings, the menu toggles, word cards, label chips, equation cards, the number picker box, the recap panels and the practice board's labels. The keypad keys use the number tile, Check uses the green pill, and the chest sits in the Word Treasure title.

**Sizes and positions** are set in one place, `CQ.L` near the top of `js/engine.js`:
- `ZIPPY.scale`: Zippy's size.
- `ZIPPY.ax`: how far right his vine hangs.
- `GRUMBLE.scale`: Grumble's size, with `x` and `y` for where he sits.
- `BX` and `PIVOT_Y`: where the balance stands. `PIVOT_Y` is set so its base stands on the paving.
- `BAR_BASE`, `BAR_W` and `STAND_W`: where the gold bars rest, and the bars' and stands' sizes. `STAND_REST` is where a bar sits on the stand's top face.
- `CROWN_W`, `COIN_W` and `PAN_BAR_W`: the sizes of things on the plates (they stand on the plate's top). Keep coin faces fully visible: children tap them to count.

Zippy hangs by his tail from the longest vine in `tree bails.png` (`vineE`; see `CQ.makeVine` in `js/world.js`). The vine comes down from the tree's branch, and its tip sits in the curl of his tail.

The original PNGs stay in this folder. If you change any of them (keep the same file names, and the 4 × 2 frame layout for character sheets), run:

```
python3 tools/prepare_assets.py
```

It needs only Python 3, with no extra packages. It cuts every character frame out by its own pixels, so hands and Zzz letters that cross the grid lines are kept. It lines all frames up (Zippy by the tip of his tail, Grumble by his feet), shrinks the props, cuts `elements.png`, copies the background layers and rewrites `assets/`. It takes about a minute.

## Files

```
index.html          the page
styles.css          all styling
js/content.js       ← all words and numbers (edit this)
js/engine.js        stage scaling, tweens, camera, dragging, pause, save
js/world.js         the background layers, Grumble, Zippy, the balance, gold bars
js/ui.js            captions (with Zippy's face), SWAP, bubbles, name titles, focus, hints, Word Treasure, menu, Check panel
js/activities.js    Zippy's formula screen, label + sort activities, quick recap, practice board + keypad, finale
js/flow.js          the story: intro, levels 1–9, practice, finale
js/audio.js         generated sound effects, music and voice
js/main.js          loading + title screen
assets/             game-ready images and sprites.js (generated; the fonts are embedded in styles.css)
jungle-background/  the background: pieces, layers, the tools that make them, and a preview page
assets/elements/    the pieces cut from elements.png (generated)
elements.png        the interface sheet; ChatGPT-Asset-Sheet-Prompt.md is the prompt that made it
tools/prepare_assets.py   rebuilds assets/ from the original PNGs
```

For analytics, `CQ.track(event, data)` in `js/engine.js` logs `step_start`, `answer`, `hint_shown`, `level_complete` and `game_complete` to the console. Point it at your platform's analytics call.
