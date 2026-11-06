# Zippy's Crown Quest

A 16:9 browser game that teaches **linear equations in one variable** (Class 8, ages 12–14). Zippy the monkey swaps crowns off a balance scale for gold bars of the same mass. If the balance tips, the alarm rings and Grumble the sleepy monster wakes up. A full play-through takes about 25–30 minutes.

## Run it

- **Easiest:** double-click `index.html`. It runs straight from the folder, with no internet and no install.
- **On a classroom network or website:** upload the whole folder as it is, then open `index.html`.
- Works on laptops, Chromebooks, iPads, Android tablets and phones, with touch, mouse or keyboard. It was tested in Chrome and Safari's engine; Edge uses Chrome's engine. Phones and tablets need to be held sideways.
- **Any screen:** the game keeps its 16:9 picture and fits it to the screen. A screen close to 16:9 (most laptops and browser windows) is filled edge to edge, with no frame round the game: a sliver of at most 1.5% a side, where nothing sits, is cut off. On a screen of another shape, the game's jungle carries on, blurred, in the bands at the sides or the top and bottom (`assets/bg/band.webp`). When the game fades to dark, the bands go dark with it, in the same colour, and the game's edge melts into them, so there is no line between them. On a phone or tablet, Play makes the game fill the whole screen and holds it sideways (Android, iPad). On an iPhone, add the game to the home screen (Share → Add to Home Screen): it then opens full screen (`manifest.webmanifest`).
- **Quick to load:** the pictures are WebP (4.5 MB in all), and the title screen appears as soon as its own pictures are in (0.3 MB). The rest load behind it, shown by a slim golden bar at its foot; if Play is tapped sooner, it waits for them. The voice clips load quietly during play.
- **Smooth on slow devices:** on a device with little memory or few cores, or if the game runs below about 40 frames a second, it switches to a light mode. There is no blur behind "look here" moments (the dark fade stays) and no idle motion in the background.

**The title screen** is the start screen as it was drawn, with only its characters coming in, in a 5-second opening like a film, with sound:
- 0 s: out of the dark, the camera glides back from close up into the temple (a deep "boom"), and the fires in its doorways flare up;
- 0.6 s: Zippy flies in from the top left corner ("wheee!"), swoops down and catches his vine at 1.5 s, and swings on it (then a laugh);
- 1.8 s: the crown drops onto its pedestal and sparkles;
- 2.4 s: Grumble rises behind the ledge (a stomp), and at 2.9 s he ROARS: the screen shakes, rings burst from his mouth, a comic "ROAR!" pops up, leaves fall and the fires flare;
- 3.9 s: the title sign "Zippy's Crown Quest" slams in (a boom and a boing);
- 4.5 s: the play button pops up; at 5 s the title music begins.

The background is the start screen itself, with the characters painted out; each character is cut out of the start screen, so once they are all in, the title is the start screen exactly (`tools/make_title.swift`, below). Afterwards the scene stays alive: it turns gently in 3D on its own and with the mouse (the title sign stands a little in front of the wall), Zippy swings from his vine, Grumble breathes, a shine runs over the title sign, the crown glints, fireflies drift in the light falling from above and the fires flicker. A tap during the opening skips to its end. With Reduced motion it shows the finished title at once; light mode leaves out the fireflies, the light and the drift.

Most browsers only let sound start after a tap, so the loading screen ends on the play button, and the opening starts (with its sounds) when it is tapped (or Enter is pressed). Where sound may start without a tap (some apps and tablets), the opening plays straight after loading.

The play button always starts a new game from the intro. It forgets the saved progress and shows the first-time hints again, but keeps the sound settings. The play button is the wooden one from `art/ui/start button.png`. (When each character comes in: `play()` in `js/main.js`.)

The game screen has no level sign, crown row or corner buttons, so nothing distracts from the balance. The question bar shows Zippy's face; tap it to hear the line again. Every line in it is the same size (40 px), and the bar shows one row at a time: a line too long for one row is cut, at whole words, into rows that each fit (as even as they can be, broken after a full stop or comma where one is near). A recorded line types itself out with its voice, row after row: when the voice is past a row, the next row takes its place. A line without a recording shows each row long enough to be read. Tapping Zippy's face plays the line again, rows and all. Collected crowns fly up out of the picture.

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

The story follows the PPT `Zippy_Crown_Quest.pptx.pdf` screen by screen: each slide's line, in the slide's order, with the game's own art. The game only adds what it needs to be played, such as how to drag a bar or tap SWAP, hints after a wrong answer, and the celebrations.

| Chapter | Learning |
|---|---|
| Intro | Meet Zippy, then Grumble (each stays bright in a circle of light while the rest of the scene darkens and blurs). If the balance tips, the alarm wakes Grumble: a cloud over sleeping Grumble shows it while the rest of the screen darkens. Each coin is 1 unit. |
| Levels 1–3: The Swap | Drag a gold bar to Zippy, tap SWAP. The right bar keeps the balance level. |
| Level 4: The Mystery Crown | The crown becomes **x**, so the scene turns into **x + 2 = 7**. Words (on the formula screen): variable, constant, algebraic expression, equation, LHS, RHS, linear equation in one variable. Activities: label the parts of 4x + 3 = 19; sort linear and nonlinear equations; a quick recap. Then, on the formula screen, trying 4 (LHS: 4 + 2 = 6, RHS: 7, 6 ≠ 7) and 5 (7 = 7) finds the **solution**, and the child gives Zippy the 5 bar for the swap. |
| Levels 5–7: Check It | Check before you swap: replace x, find each side, compare. Level 5 is guided; in 6 and 7 the child chooses. |
| Level 8: The Smart Way | x + 8 = 23: split 23 into 8 + 15, take 8 off **both** sides (one drag moves both), so x = 15, then check. |
| Level 9: Two Crowns | 2x + 4 = 18: remove 4 from both sides, divide both sides by 2, so x = 7. Check 2 × 7 + 4 = 18, then swap each crown for a 7 bar. |
| Practice | Six equations typed on a keypad: x + 6 = 17, 3x + 5 = 26, x − 7 = 12, x ÷ 4 = 6, 2x + 7 = 1, 3(x + 2) = 21. The problem and the keypad sit side by side in the middle; the problem's lines come in one by one, then the keys, and the typed number shows in the answer box. Right first time: the check is shown. Otherwise the board explains why (your answer, the equation, LHS, RHS, then LHS ≠ RHS, each by itself) and solves it step by step with the child, then checks it. No step titles or progress dots. |
| Finale | Three key ideas and all 10 crowns. |

The story moves on by itself, so children only tap when there's something to do: dragging a bar, tapping SWAP, picking a number, or typing an answer and tapping Check. The Next button is for anyone who wants to move on sooner. Tapped during a line, it goes to the next line. Tapped while the child has something to do, it skips ahead to the next part of the quest. The pause after each line stops while the menu is open, and while a child taps Zippy's face in the question bar to hear the line again.

Mistakes are safe, and a little funny. When a wrong swap tips the balance:
- The alarm rings and Grumble wakes up and roars.
- Zippy gets a fright with the crown in his hands. He clutches it while the alarm rings, hides behind it when Grumble stands up, and jumps at the roar.
- He sheepishly gives it back: the crown jumps out of his hands onto the pan, and the wrong bar goes back to its own stand, marked "Tried".
- Zippy swings away on his vine, up and out of the picture, empty-handed.
- Grumble stands a moment (facing front) and yawns, and after a soft fade he is asleep again.
- Only Zippy's smiling head peeks out from behind the tree ("Hmm?"). He ducks back, then swings in with a slide whistle and a giggle.

Every task gives a short hint after the first miss and a full explanation after the second.

Winning a level is a little story too:
- Zippy lifts the crown and puts it on his own head ("wow!"), then celebrates wearing it.
- He swings off on his vine, still wearing it and waving goodbye, and the screen fades.
- The next level is set up behind the fade.
- Zippy's head peeks out from behind the tree to check that Grumble is still asleep. He swings back in. The new level's crown, coins and gold bars are already in their places: nothing pops in by magic.

(The first of Level 9's two crowns flies up out of the picture instead, because he still needs his hands for the second swap.)

**No panels in front of the scene.** When something needs looking at, the rest of the scene fades back to dark and blurs, and the thing being explained stays bright. Text sits straight on the scene as clear, dark letters with a soft white glow, or as bright letters on the dark fade. Around the balance:
- **above the balance**: nothing. The level's equation (x + 3 = 9) and its answer are not shown over the balance while the child plays; the scene keeps to the balance (they are there for screen readers);
- **the balance** in the middle stays sharp;
- **below the balance**: x + 2 = 7 being built in Level 4. The check, and the working of Levels 8 and 9, have their own side view (below).

At key teaching moments the thing being explained stays bright inside a soft gold ring while the rest of the scene darkens and blurs:
- the coin's "1 unit";
- the bars, and SWAP, the first time;
- the coins being counted after a second miss;
- each step of Level 4 (the crown, the coins, x, x + 2, 7, then the equation);
- the key steps of Levels 8 and 9.

The ring glides from one thing to the next. Taps still work while it is on. (`CQ.focus` and `CQ.soft` in `js/ui.js`; the moments are the `look(…)` calls in `js/flow.js`.)

**The check** (Levels 5–9: is this bar's value the crown's mass?) is shown like the formula screen. When Zippy has the bar, the view glides until the balance stands at the right, bright, and the rest of the scene goes dark (Zippy waits unseen). The check is worked at the left, big, one piece at a time, while a gold frame on the balance follows it: the crown while the value flies out of it into x ("Replace x with 4"), the left pan while the child works out the LHS (4 + 3 = ?, picking the number from tiles), the right pan for the RHS, then both pans as the two are compared (7 ≠ 9) and the verdict is written in ("4 doesn't work"), or the whole balance with a flash when they are equal. Then the view glides back: Zippy swaps, or says "Phew! Good thing we checked." and hands the bar back (`CQ.checkPanel` in js/ui.js, `checkRoutine` in js/flow.js).

**Levels 8 and 9's working** is shown the same way. The view glides until the balance stands at the right, and the steps are written at the left, one row under another, each written in while the earlier rows fade back (x + 8 = 8 + 15, then x + 8 − 8 = 8 + 15 − 8; Level 9 also 2x/2 = 14/2). The frame on the balance follows each step. When the child drags the bars off both pans, the view goes back to the whole scene, with no equation, and two stools stand ready close together in the middle; then the working comes back for the answer (x = 15, x = 7), in green (`CQ.eqBoard` in js/ui.js). Level 8 no longer shows clouds of tried values.

When the x + 2 = 7 strip is built in Level 4, there is no window: the whole scene goes dark, the balance stays bright and sharp in its place with a gold frame round its beam and pans, and the words turn bright, with no shadow (`look(…, { text: true })`).

The Level 4 words are explained on the **formula screen**. The view glides: it zooms in and pans until the balance stands at the right of the screen, on its own ground, bright and sharp, while the rest of the scene goes soft and dark, darkest at the left. Then x + 2 = 7 is written in at the left, one sign at a time, in plain bright letters with no shadow. Zippy is not on this screen. Each line (every one of them) first puts a gold frame round the part of the balance it talks about, and the rest of the balance fades: the crown for x, the left pan for x + 2 and the LHS, the right pan for the RHS, both pans when the two sides are compared, and the whole balance (with a flash at its centre) when the sides are equal. Then the line's new label, box or highlight comes in on the left, one piece at a time, fading in gently where it stays. Last, pictures fly over from the balance: a copy of the crown flies from its pan and lands over x, and for x + 2 the crown and the two coins fly up over x + 2, so the child sees that x is the crown. Worked-out lines (LHS: 4 + 2 = 6, RHS: 7, then 6 ≠ 7) appear under the equation, which stays at the top all along. A piece can wait for a word of the line: on "So, 5 is the solution.", x = 5 and its name appear as the voice says "5" (`cue` in a row; the question bar types with the voice). When the screen closes, the maths fades and the view glides back to the whole scene. Coming from x + 2 = 7 being built (Level 4a) or from the label activity (4c), the dark never lifts in between: the view glides straight on into the formula screen (`ASIDE` in js/activities.js is the view).

**Labels joined to the numbers.** Wherever a word names a part of an equation (the label activity, the quick recap, the formula screen's tags), it sits right over or under that part, joined to it by one straight line that ends in a dot on the part. Each word has its own colour, and its box, line, dot, bracket and part all share it: gold for variable, green for equation, teal for LHS, orange for RHS. In the label activity the lines are faint until the right label goes in; then the colour runs down the line and the part lights up. Where the line to x crosses the equation's bracket, the bracket gives way round it, so the line plainly goes on to x. The sort activity's sorted cards have no "power 1" / "power 2" badges; a nonlinear card's ² turns orange.

**Step by step.** Things come one at a time (a level's crown, coins and bars are already in place when it begins): the check's left side, then its right side; each piece of the formula screen; the activities' equation, boxes and cards; and each line of a practice step. A label joined to a part of an equation is drawn the way it would be by hand: its bracket, the dot on the part, the line drawn out to where the label goes, then the word written in, letter by letter (the formula screen's tags and labels, the quick recap). The activities build up the same way while their instruction is read: the label activity writes 4x + 3 = 19 sign by sign, then draws each box in turn (bracket, dot, line, empty box), then brings in the labels one by one; the sort activity brings in each box with its name written in, then the cards one by one. Nothing can be dragged before it has come in.

**The quick recap** shows one equation at a time, big in the middle of the screen, while its sentence is read out. It comes in step by step: its number, the equation sign by sign, the labels it shares with the equations before, then its own new label (bracket, dot, line, word), and last its sentence, written in right under it. When it is complete it glides to its own corner (1 top left, 2 top right, 3 bottom left, 4 bottom right), small and faded, and the next equation is built in the middle. At the end all four take their places together, full size, for 5 seconds, and the game moves on by itself. There is no title on screen; the narrator says "A quick recap.".

The gold bars sit still on their stands, and which one to give Zippy is the child's own choice: nothing floats off a bar to suggest one. While a bar is being dragged, a faded copy stays on its stand. If nothing happens for 8 seconds, a hand (pointing up, from below, its finger at the left) carries a faded bar to Zippy to show how it's done; it takes a different bar each time, left to right, so it never points at the answer.

Movement is slow and smooth so children can follow it. Zippy swings over and the bar and crown pass each other as they swap (about 2½ seconds). The balance tips slowly. Zippy never just slides: he stays hanging from his vine, and he leaves and comes back in big swinging curves. A chapter jump or a restart fades softly to dark and back.

## Edit the words or numbers

All text, voice lines, level numbers, answer choices and feedback live in **`js/content.js`**. You can edit them there without touching any game logic.

- Each narrator line has an ID (`"intro-1"`, `"l4-25"`, …). Its recording is found by the line's exact text, so a line whose words you change is read by the device voice until it is recorded again (see [docs/VOICEOVER.md](docs/VOICEOVER.md)).
- The levels are in `CONTENT.levels`:
  - `crown`: the crown's hidden mass.
  - `left`: coins beside the crown.
  - `right`: coin rows on the right pan.
  - `bars`: the three gold bars (shown in a new random order every time).
  - `chips`: the three number choices for each blank in the check.
- Keep `crown + left = sum of right` true, and make sure one of the bars equals `crown`.
- The practice equations are in `CONTENT.practice.problems`. Each one lists its steps (`ask`: two choices, `act`: one button, `type`: a number on the keypad) and its check. `lhs` describes the left side, so the game can work it out for any answer a child types.
- Keep the special symbols as they are: `−` (minus), `≠`, `×`, `÷`, `—`, `…`. To write a power, type `x^2`. In equations, `[[x|4]]` shows a fraction (x over 4), `{{− 8}}` the blue "same on both sides" highlight and `<<+ 4>>` a red highlight.

## Voice and sound

**Voice:** every line is a recorded voice-over in `assets/vo/` (315 Ogg Opus clips, 34 minutes, 7.8 MB). The narrator is a clear North Indian teacher's voice, and Zippy has his own young voice. A recorded line types itself into the caption as it is said. How the clips were made, how the game plays them, and how to remake a line are in **[docs/VOICEOVER.md](docs/VOICEOVER.md)**. A line without a recording, or a browser that can't play the clips (an older Safari, on an iPad or Mac that hasn't been updated), uses the device's built-in voice instead. `?vo=0` in the address turns the recordings off.

If you change the words of a line in `js/content.js`, its recording no longer matches, so the device voice reads it until you make a new one (docs/VOICEOVER.md, "Remaking a line").

**Grumble's snoring:** he sleeps quietly, and his breathing and Zzz show he is asleep. He snores out loud only twice at a time: when a level begins (as Zippy peeks at him), and when the story talks about him ("Grumble guards the treasure", "Grumble is still asleep!", "Sleep tight, Grumble!"). Two requests close together never add up (`snore()` in `js/world.js`).

**Sound effects:** every sound effect, the music and the snoring are generated in code, with no audio files. To use a recording for one, add a mapping in `overrides` (the `audio` section at the bottom of `js/content.js`), e.g. `"zippy.laugh": "assets/audio/zippy-laugh.mp3"`. Every cue name is listed in `js/audio.js` (`grumble.snoreIn`, `zippy.laugh`, `balance.clang`, …).

## Replace the artwork

All the original pictures are in **`art/`**, by kind:

```
art/zippy/        Zippy's sheets: hold crown, hold crown and up, winning monkey, fail monkey,
                  zippy swap, zippy crown., zippy scared crown, zippy bar
art/grumble/      Grumble's sheets: monster slepping, slightly open his eyes, when fail then monster roar
art/props/        crown, number coin, number bricks (the gold bar), break stand (the stool),
                  new balance (the balance parts), tree bails (Zippy's vine)
art/ui/           elements (the interface sheet), start button (the play button), thumbnail ui (the title sign's shape, for make_title)
art/background/   the jungle lake: background sheet, its pieces and layers, the tools that make them
```

To change a picture, save the new one over the old one in its folder, with the same name, and run the tool (below).

**The background** is the jungle lake in `art/background/`, built from the pieces in `art/background/background sheet.png` (see `art/background/README.md`). The game draws it as 12 separate layers, so it can move naturally (off with Menu → Reduced motion, and in light mode; it rests while the scene is blurred): the clouds glide slowly across the sky and come round again (4 minutes a screen width); soft wave lines roll across the lake and glints of light come and go on it; the tree's leafy top sways in the breeze, bending from the middle of its trunk while the roots stay still (the tree is drawn twice, cut across the solid trunk: `CROWN` in js/world.js); the leafy branch overhead sways in gusts and its leaves flutter; the big plant at the front sways from its foot. Each layer's motion is its `anim` in `art/background/tools/make_background.py` (`drift`, `shimmer`, `crown`, `branch`, `sway`). To change it:
1. Edit `LAYOUT` in `art/background/tools/make_background.py` and run it. This tool needs numpy, Pillow and scipy.
2. Run `python3 tools/prepare_assets.py`, which copies the layers into `assets/bg/jungle/`. It also makes `assets/bg/band.webp` from `art/background/background.png`: a small copy of the whole scene for the bands round the game on a screen that isn't 16:9.

**The wooden stool** under each gold bar (and the two stools the bars are taken off onto in Levels 8–9, close together in the middle, with no words on them; a bar on one is full size, like the gold bars on theirs) is `art/props/break stand .png`. The tool copies it to `assets/props/brick-stand.webp`. `STAND_REST` in `js/engine.js` says where a bar rests on its top.

**The balance** is the wooden one in `art/props/new balance .png`, a sheet of separate parts: beam, hub, post, base, plate, rope hanger and leaves. `tools/prepare_assets.py` cuts each part out by its box (`BALANCE_PARTS`) into `assets/balance/`. The game puts the parts together like the picture of the finished balance (`ART` in the balance section of `js/world.js`):
- The beam tips behind the hub, which stays upright.
- Each plate hangs from its rope under the beam and stays level.
- Things stand on the plates.

If the sheet is replaced, re-measure `BALANCE_PARTS` and `ART`.

**The interface pieces** come from `art/ui/elements.png`, a sheet of 34 pieces made with the prompt in `docs/prompts/ChatGPT-Asset-Sheet-Prompt.md`. `tools/prepare_assets.py` cuts the sheet into `assets/elements/`, one PNG for each of the 20 pieces the game uses (`UNUSED_ELEMENTS` in the tool lists the 14 it leaves out, the old gold balance among them). It also measures the points the game needs and writes them as `GEOM` in `assets/sprites.js`: the hand's fingertip, the thought cloud, the speech bubble and the panel's border, plus where each balance part was on its sheet. To change a piece, make a new sheet with the same rows in the same order (`ELEMENT_ROWS` in the tool) and run the tool. If a row has the wrong number of pieces, it stops and says which row.

- **Balance.** `BAL.S` is its overall size, and `ART_K` matches the parts to the size of the things on the plates. The beam's middle stretches a little so the ropes hang where they do in the picture.
- **Stretched pieces.** The caption bar, the menu panels, speech bubbles and the wooden buttons all stretch without bending their corners. Each rule in `styles.css` names its piece and where to cut it (`border-image`). `CQ.patch` in `js/ui.js` then paints each piece in one go, so no seams show. If new art has a thicker or thinner frame, change the cut numbers in those rules:
  - panel: `30 35 34 30`
  - speech bubble: `82 132 94 130` (cut through the middle of the oval)
  - wooden button: `0 51 0 51`
- **Zippy holding a gold bar:** `art/zippy/zippy bar.png` (made with `docs/prompts/ChatGPT-Zippy-Bar-Prompt.md`) has his fingers really round a blank bar. The game prints the bar's number on its front face, and the frames match what he does:
  - catch it (1), hold it (2), talk (3);
  - look at it while the child checks it (4), and show it off when it works (5);
  - reach down to the plate (6) and put it down (7);
  - hand a wrong bar back (8).

  `tools/prepare_assets.py` finds the bar in each frame by its gold colour. It measures where the bar is, the middle of its front face and its tilt (`GEOM.zippyBar`), so the number lands on the face and bars flying to or from his hands match his. A new sheet needs no re-measuring, as long as the bar stays gold with its front face clear.
- **Zippy's swap:** `art/zippy/zippy swap.png` (made with `docs/prompts/ChatGPT-Zippy-Swap-Prompt.md`) has empty hands. His open hands are ready to catch a bar, and in the swap he lets go of the bar as the crown jumps up into his hands. Nothing is drawn in his hands on this sheet. `SWAP` in `js/world.js` has where his hands are in each frame; re-measure it if you replace the sheet. The tool also cuts Zippy's face for the question bar from it (`FACE`).
- **Scared Zippy holding the crown:** `art/zippy/zippy scared crown.png` (made with `docs/prompts/ChatGPT-Zippy-Scared-Crown-Prompt.md`) is used after a wrong swap, until he gives the crown back. `SCARED_CROWN` in `js/world.js` is where the crown is in each frame (and how wide). The crown he grabs flies into his hands in frame 1, and jumps back to the pan from his hands. Re-measure it if the sheet is replaced.
- **Zippy wears the crown:** `art/zippy/zippy crown..png` (made with `docs/prompts/ChatGPT-Zippy-Crown-Prompt.md`; the tool also finds it as `zippy crown.png`) has him lifting the crown, putting it on, then wow, proud, thumbs up, wave, laugh and straightening it. After a right swap he holds the crown like frame 1, lifted up in both hands, until he puts it on. `CROWN_LIFT` in `js/world.js` is where the crown is in that frame (centre, width and tilt), so the crown he grabs from the pan lands exactly there. While he wears it, his everyday poses use this sheet (`crownPose`). `CROWN_HEAD` is where the crown sits on his head, for its sparkle.
- **Still drawn in code:** the character name titles (text only), Grumble's shadow, comic sound words, confetti, drop rings, the menu toggles, word cards, label chips, equation cards, the sort activity's two drop zones, the number picker box and the practice board's labels. The keypad keys use the number tile, Check uses the green pill, and the chest sits in the Word Treasure title.

**Sizes and positions** are set in one place, `CQ.L` near the top of `js/engine.js`:
- `ZIPPY.scale`: Zippy's size.
- `ZIPPY.ax`: how far right his vine hangs.
- `GRUMBLE.scale`: Grumble's size, with `x` and `y` for where he sits.
- `BX` and `PIVOT_Y`: where the balance stands. `PIVOT_Y` is set so its base stands on the paving.
- `BAR_BASE`, `BAR_W` and `STAND_W`: where the gold bars rest, and the bars' and stands' sizes. `STAND_REST` is where a bar sits on the stand's top face.
- `CROWN_W`, `COIN_W` and `PAN_BAR_W`: the sizes of things on the plates (they stand on the plate's top). Keep coin faces fully visible: children tap them to count. `CROWN_W` is a crown of 5 units: a heavier crown is drawn bigger (its width goes with the cube root of its mass, `crownW()` in js/world.js), so Level 8's 15-unit crown and its 8 bar just fill the plate.

Zippy hangs by his tail from the longest vine in `art/props/tree bails.png` (`vineE`; see `CQ.makeVine` in `js/world.js`). The vine comes down from the tree's branch, and its tip sits in the curl of his tail.

The original PNGs stay in `art/`. If you change any of them (keep the same file names, and the 4 × 2 frame layout for character sheets), run:

```
python3 tools/prepare_assets.py
```

It needs only Python 3, with no extra packages. It cuts every character frame out by its own pixels, so hands and Zzz letters that cross the grid lines are kept. It lines all frames up (Zippy by the tip of his tail, Grumble by his feet), shrinks the props, cuts `art/ui/elements.png`, copies the background layers and rewrites `assets/`. It takes about a minute.

At its end it runs `tools/compress_assets.py`, which saves every picture as WebP: quality 88 with transparency, or 85 for opaque pictures. That looks the same as the PNG at about a fifth of the size (21.3 MB → 4.2 MB), and the game and `styles.css` are pointed at the WebP files. It needs `cwebp` (`brew install webp`); without it the pictures stay PNG. The compression takes several minutes. If `art/ui/start screen.png` isn't there, the tool keeps the title picture already in `assets/`.

**The title screen's pictures** are made by a separate tool (macOS), from the start screen (`art/ui/start screen.png`, or else the game's copy, `assets/ui/start-screen.webp`):

```
swift -O tools/make_title.swift
```

It paints Zippy, the title sign, Grumble and the crown out of the start screen (the wall's stones carry on softly where they were, Zippy's vine runs on through where his hand held it, and Grumble's doorway is left empty), and cuts each of them out of it, with a soft edge, into `assets/title/` (`plate`, `zippy`, `logo`, `grumble`, `crown`, and `title.json` with where each goes). Each character is found by its colours in its own part of the picture; the title sign by its shape on `art/ui/thumbnail ui .png`. It takes about ten seconds; `tools/prepare_assets.py` then lists the pictures in `assets/sprites.js` (`tPlate`, `tZippy`…). Run it again if the start screen changes.

## Files

The game itself is the top of the folder (`index.html`, `styles.css`, `manifest.webmanifest`, `js/`, `assets/`): open `index.html` to play. The rest is what it is made from.

```
index.html          the page
styles.css          all styling
js/content.js       ← all words and numbers (edit this)
js/engine.js        stage scaling, tweens, camera, dragging, pause, save
js/world.js         the background layers, Grumble, Zippy, the balance, gold bars
js/ui.js            captions (with Zippy's face), SWAP, bubbles, name titles, focus + scene blur, hints, Word Treasure, menu, the check
js/activities.js    the formula screen, label + sort activities, quick recap, practice board + keypad, finale
js/flow.js          the story: intro, levels 1–9, practice, finale
js/audio.js         generated sound effects and music; plays the voice lines
js/voice.js         finds and loads the recorded voice lines
js/vo_lines.js      every line as shown → its clip and length (generated by tools/vo_build.py)
js/main.js          loading, the tap to start, the title screen and its opening
assets/             game-ready images and sprites.js (generated; the fonts are embedded in styles.css)
assets/vo/          the voice-over: one Ogg Opus clip per line (see docs/VOICEOVER.md)
assets/elements/    the pieces cut from art/ui/elements.png (generated)
manifest.webmanifest      lets a phone or tablet open the game full screen from its home screen
art/                the original pictures (see "Replace the artwork")
art/background/     the background: the sheet, pieces, layers, the tools that make them, and a preview page
docs/VOICEOVER.md         how the voice-over was made, how the game plays it, how to remake a line
docs/prompts/             the prompts that made the art sheets (ChatGPT-*.md) and the game's first build prompt
tools/prepare_assets.py   rebuilds assets/ from the original PNGs in art/
tools/make_title.swift    makes the title screen's pictures from the start screen (macOS)
tools/compress_assets.py  saves the game's pictures as WebP (run by prepare_assets.py)
tools/vo_script.json      every voice line: as shown, as spoken, and the Devanagari the voice read
tools/vo_build.py         turns the TTS studio's zips into assets/vo/ and js/vo_lines.js
```

For analytics, `CQ.track(event, data)` in `js/engine.js` logs `step_start`, `answer`, `hint_shown`, `level_complete` and `game_complete` to the console. Point it at your platform's analytics call.
