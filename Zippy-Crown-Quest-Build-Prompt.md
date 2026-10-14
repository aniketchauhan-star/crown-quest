# Zippy's Crown Quest — build prompt

> **How to use:** paste everything below the line into your AI builder (Claude Code, Cursor, Lovable, Bolt, Gemini…) and upload the 15 PNG files from this folder with it. Attaching the PPT is optional: every line from it is already in this prompt.

---

## 1. Role and goal

Work as a senior game developer, a senior UI/motion designer and an experienced Class 8 maths teacher in one team.

Build **Zippy's Crown Quest**: a finished, polished 16:9 browser game that teaches **linear equations in one variable** to Class 8 students (ages 12–14). The story: Zippy the monkey swaps golden crowns off a balance scale for gold bars of the same mass. If the balance tips, Grumble, the sleeping monster, wakes up.

It must feel like a real children's game, not a slideshow. The child sees, hears and does every idea. Use the provided art (Section 4). Follow the story and wording in Section 10 exactly, except lines marked *(added)* or *(adapted)*. A full play-through takes about 20 minutes, and progress is saved so it can be split across two sittings.

## 2. What the child learns

By the end, the child can:
1. Read a level balance as "both sides are equal" (=).
2. Use a letter (x) for an unknown value — a **variable**.
3. Name the **constant**, **algebraic expression**, **equation**, **LHS** and **RHS**.
4. Tell a **linear equation in one variable** (one variable, highest power 1) from a nonlinear one.
5. Check a value by substituting it: if LHS = RHS, it is the **solution**.
6. Solve x + a = b directly by doing the same thing to both sides.

Teaching approach: concrete → pictorial → abstract. Real objects on the balance (crown, coins, bars) visibly turn into symbols (x, 2, =, 7). The balance *is* the equation from start to finish.

## 3. Format and tech

- **16:9 stage**, 1920×1080 logical units. Scale it uniformly to fit any window, centred, with dark teal letterbox bars and no scrollbars. Convert pointer coordinates by the scale factor so dragging stays accurate at every size.
- Devices: Chrome, Edge, Safari and Firefox on laptops, Chromebooks, Android tablets and iPads, with touch, mouse and keyboard. On a portrait phone, show a "Please turn your device sideways" screen.
- Stack: plain HTML + CSS + JavaScript, no build step. GSAP 3.12.5 (from cdnjs) is allowed for animation timelines. Use classic `<script>` tags, not ES modules. Draw sprites with CSS `background-position` or canvas `drawImage`, without reading pixels, so the game also runs when index.html is opened straight from disk. If your environment is React, keep the same architecture.
- Layers:
  - **World:** background, characters, balance and bars. A "camera" pans and zooms this layer with translate/scale.
  - **UI:** HUD, captions and buttons. This layer never moves.
  - **Overlay:** spotlight dim, notebook scroll and pop-ups.
- **Data-driven:** keep all captions, voice-line IDs, level numbers, feedback text and dropdown options in one file, `content.js`. A teacher can then change words or numbers without touching logic, and Hindi or other languages can be added later. Use the step numbers in Section 10 as line IDs (e.g. `intro-1`, `l4-25`).
- **Step engine:** the game is an ordered list of steps run by a small state machine.
  - Step types: `narration`, `swap`, `check`, `labelActivity`, `sortActivity`, `balanceMethod`, `recap`.
  - Each step declares its caption, voice line, camera target, character animations, which objects are interactive, and what it waits for: a Next tap, a child action, or the end of the voice line.
  - Only the objects the current step needs are interactive. Everything else is locked.
- Save progress (step, crowns, words) in localStorage, inside try/catch. When progress exists, the title screen shows "Continue".
- Performance: 60 fps on a mid-range Android tablet. Make compressed copies of the images (e.g. WebP) and preload everything behind a short loading screen (Zippy swinging across a progress bar).
- Add a `track(event, data)` hook that logs to the console by default. Events: `step_start`, `answer` {level, choice, correct, attempt}, `hint_shown`, `level_complete`, `game_complete`.

## 4. Art assets (provided)

Copy the originals into `/assets` under safe names. The originals contain spaces, and "when fail then monster roar .png" has a space before ".png", which breaks URLs.

| Provided file | Copy to | What it is |
|---|---|---|
| start screen.png | assets/ui/start-screen.png | 1920×1080 title art: Zippy swinging, Grumble in the doorway, crown. No text on it. |
| start button.png | assets/ui/start-button.png | Round wooden ▶ button with vines |
| background game.png | assets/bg/temple.png | 1920×1080 empty temple room. The wall torches have no flames. |
| tree bails.png | assets/bg/vines.png | 5 hanging vine pieces on one sheet |
| balanced game.png | assets/props/balance-parts.png | Balance kit: beam, top knob, 2 triangle hangers, post, base, 2 pans |
| crown.png | assets/props/crown.png | Crown |
| number bricks.png | assets/props/bar.png | Blank gold bar |
| number coin.png | assets/props/coin.png | Blank gold coin |
| monster slepping.png | assets/grumble/sleep.png | 8-frame snore loop, lying down |
| slightly open his eyes.png | assets/grumble/wake.png | 8 frames, lying down: eyes closed → one eye opens → both eyes open |
| when fail then monster roar .png | assets/grumble/roar.png | 8 frames, standing: startled → angry → roar |
| hold crown and up.png | assets/zippy/hold.png | 8 frames hanging by his tail, reaching or holding with both hands |
| hold crown.png | assets/zippy/reach.png | 8 frames hanging head-down, reaching down or holding |
| winning monkey.png | assets/zippy/laugh.png | 8 frames hanging by his tail, laughing and celebrating |
| fail monkey.png | assets/zippy/scared.png | 8 frames hanging by his tail: shocked, nervous, hiding, "phew" |

**Slicing the sprite sheets (important).** Every character sheet is laid out 4×2 (1448×1086). In 6 of the 7 sheets, though, hands, Zzz letters and motion lines cross the 362×543 cell lines, and the poses sit at different spots inside their cells. A plain grid crop would cut off hands and make the characters jump between frames. Use the measured frame rectangles and anchors in **Appendix A**: crop each frame by its rectangle, and place it so its **anchor** sits on the character's anchor point in the scene.
- **Zippy's anchor is the tip of his tail.** In every sheet he hangs from a vine by his tail, so the tail tip must stay glued to the end of his vine.
- **Grumble's anchor is bottom-centre**, so he stays planted on the floor.
- **roar.png overlap:** frames 6 and 7 overlap by 3 px, and frames 7 and 8 by 13 px. If your environment can read pixels (a build script, or the page served over http), cut those frames out by their own pixels instead of by rectangle. Otherwise accept a faint sliver.

**Animation map.** Frames are numbered 1–8, left to right, top row first.

| State | Sheet: frames | Notes |
|---|---|---|
| Grumble asleep (default) | sleep: 1→8 loop | ~0.4 s per frame. Zzz on 2 and 6, snore rumble on 3 and 7, whistly exhale on 4 and 8. |
| Grumble stirs (near miss) | wake: 1→2→3→4, hold 1 s, then 4→3→2→1 | One eye opens, looks around, closes. He mumbles "Hrrm…?" |
| Grumble wakes (wrong swap) | wake: 1→8, then pop up (squash + dust puff) into roar: 3→4→5→6→7 (hold 0.6 s, small screen shake)→8 | Comic, not scary |
| Grumble goes back to sleep | roar: 1 (looks around) → 2 (sleepy) → flop down (squash + dust puff) into the sleep loop | Big yawn sound |
| Zippy idle | hold: 7, with a gentle pendulum sway on the vine | Blink by showing frame 6 for 120 ms every ~3 s |
| Zippy talks | hold: 8 ↔ 7 | While his own lines play |
| Zippy ready to catch | hold: 1 or 3 (both hands out) | While a bar is being dragged |
| Zippy holding a bar or crown | hold: 5, 7 or 8 (hands together) | Draw the item at his hands; tune a hold point per frame |
| Zippy dangles to the pan and swaps | reach: 5 → 2 → 3 → 1 | He slides head-first down his vine |
| Zippy points (notebook screens) | reach: 2 | |
| Zippy laughs at Grumble | laugh: 6 ↔ 2, then 4 | Cover-mouth giggle: cheeky, never mean |
| Zippy celebrates | laugh: 1 → 7 → 3 → 8 → 5, looping | |
| Zippy shocked / nervous / hiding / "phew" | scared: 1 / 2 ↔ 4 / 3 ↔ 7 / 8 | Use the sad frames 5–6 only for a brief "oops" |

**Building the balance** (crop rectangles in Appendix A):
- Stack it from the floor up: base, post, then the beam's centre disc on top of the post (this disc is the pivot), then the knob above the disc.
- Hang one triangle from each beam end and set a pan under each triangle.
- The beam rotates around the disc. The triangles and pans stay upright and follow the beam ends.
- The kit is small (the beam is 570 px wide), so scale it ×1.35–1.4, to a beam of about 780 px.

**Bars and coins are blank on purpose.** Draw their numbers as live text so any value works.
- **Bar:** Baloo 2 ExtraBold, dark brown #6B3E00 with a light top highlight, centred on the front face at about 44% across and 57% down the cropped bar.
- **Coin:** a "1" in the centre of every coin. Stack coins in neat rows of at most 4 so they are easy to count, never in a random pile.

**Suggested sizes on the 1920×1080 stage:** Zippy ≈ 380 px tall · sleeping Grumble ≈ 420 px wide · balance beam ≈ 780 px · each pan ≈ 360 px · crown ≈ 170 px wide · coin ≈ 64 px · bar ≈ 220 px wide.

**What you need to draw yourself.** Match the art: thick dark outlines, glossy cel shading, warm wood + gold + leaf green.
- Flames on the two wall torches, at about (350, 188) and (1570, 188) on temple.png, with flicker and glow.
- The wooden "Level" sign, and round wooden HUD buttons that match start-button.png.
- Stone pedestals for the bars.
- The parchment caption bar, speech bubbles, the Check panel and the number chips.
- The comic name bursts, word gems, confetti, the title logo and the "=" emblem.

## 5. Visual style

- Match the art: bright 2D cartoon, a teal-blue jungle temple, gold props. Run vines from vines.png along the top edge and down the side pillars. Keep the middle of the room clean so the balance stands out.
- **Learning colours.** Use each colour only for its meaning, everywhere. Never use colour alone: pair it with ✓/✗, =/≠ and words.

  | Meaning | Colour |
  |---|---|
  | Ink text | #1B3A44 |
  | LHS | teal #177070 |
  | RHS | amber #B97A16 |
  | Equal / correct | green #1E7A55 |
  | Not equal / try again | coral #C8473B |
  | Variable / focus highlight | yellow #FFD84D |
  | Same move on both sides | blue #2F7BD8 |

- **Typography:** "Baloo 2" (Google Fonts), ExtraBold for the logo, name bursts, buttons and numbers and SemiBold for captions. The variable x is always in a bold italic serif (e.g. Noto Serif Bold Italic) so it never looks like a times sign. Never show "×"; write 4x. Use the true minus sign "−", not a hyphen.
- **Sizes at 1920×1080:** captions ≥ 40 px · notebook equations ≥ 110 px · the in-scene equation sign ≥ 56 px · touch targets ≥ 120 px.
- **Motion:** squash and stretch, anticipation and overshoot (back/elastic easing). UI transitions take 250–500 ms. Keep constant idle life: torch flicker, vine sway, coin glints, Zippy swaying, Grumble breathing.
- **Seamless:** no hard cuts and no page changes. Every transition is a camera move, a scroll unrolling or a sparkle poof. Zippy and Grumble stay on screen the whole time, even on notebook screens.

## 6. Characters

- **Zippy:** a cheeky, clever treasure-hunting monkey and the child's buddy. Playful, quick, high-pitched voice. He always hangs from a vine by his tail. Tapping him makes him giggle.
- **Grumble:** the sleepy purple treasure guard. Goofy, never scary. Tapping him makes him mumble "Mmm… five more minutes…". A tap never wakes him.
- **Who says what:**
  - Narrator lines go in the caption bar.
  - Zippy's own lines (written as *Zippy: "…"*) appear in a speech bubble beside him.
  - Grumble's noises appear as comic sound-effect words: Zzz, HRRM?, GRRRUMBLE!

**Comic name bursts** play in the intro, on each character's first appearance:
- Big comic letters drop in one by one with a bounce and a random ±8° tilt, over a comic starburst. They have a thick dark outline, a glossy gradient fill and a drop shadow, and keep a gentle wave afterwards.
- **GRUMBLE:** purple/lilac letters with a slow, sleepy wobble. The whole word swells and shrinks with his snore, and a small "Zzz" floats off the last letter. Tagline: "The treasure guard".
- **ZIPPY!:** orange/yellow letters with speed lines, a fast "zip!" entrance and an energetic bounce. Tagline: "The clever treasure hunter".
- Later in the game, tapping a character shows a small name label.

## 7. Screen layout (gameplay)

```
┌────────────────────────────────────────────────────────────────────────┐
│ [Level 1]            [🔊  parchment caption, max 2 lines ]   [💎][↻][≡] │
│ ♛♛♛○○○○○                                                              │
│  vine                          ( = )   ← emblem on the beam's disc       │
│   Zippy            ╭───────────────●───────────────╮                    │
│                    △                                △                    │
│               [crown + coins]                  [coins]                   │
│  Grumble                         ║   [ x + 2 = 7 ]  sign on the post     │
│  (Zzz)                        ▁▁▁╨▁▁▁                                    │
│                  [ 3 ]        [ 5 ]        [ 7 ]   ← bars on pedestals    │
│ ◀ Back                                                       Next ▶     │
└────────────────────────────────────────────────────────────────────────┘
```
- **Top-left:** a wooden "Level N" sign with 8 small crown pips underneath (crowns collected).
- **Top-centre:** the parchment caption bar, with a 🔊 button that replays the voice line.
- **Top-right:**
  - 💎 Word Treasure bag (glossary).
  - ↻ Restart level, with a ✓/✗ confirm.
  - ≡ Menu: Resume, Music / Effects / Voice toggles, Reduced motion, Chapter select.
  - Chapters: Intro · The Swap (Levels 1–3) · The Mystery Crown (Level 4) · Practice (Levels 5–7) · The Smart Way (Level 8).
- **Centre:** the balance. Its centre disc shows a green **=** when level and a coral **≠** when tipped, which links the balance to the equals sign every time it moves.
- **Bottom:** three gold bars on stone pedestals.
- **Next ▶ (bottom-right):** greyed out until the step is done, then it pulses. On narration steps it activates when the voice line ends, or after 1.5 s with sound off.
- **Back ◀ (bottom-left):** narration steps only.
- The HUD is hidden on the title and during the intro, and slides in when Level 1 starts. A small "Skip" button shows during the intro.

## 8. Core mechanic — Catch & Swap

1. The bars bob gently and glint, so they look grabbable (cursor: grab).
2. The child drags a bar, using Pointer Events, `setPointerCapture` and `touch-action: none`. The bar lifts (scale 1.1, bigger shadow). Zippy slides down his vine toward the bars with both hands out, and a glowing dashed "drop" ring appears around his hands.
3. If the child drops the bar near Zippy (generous hit area, snaps within about 120 px), he **catches** it: "oof!", a bounce, and he holds it up. If they drop it anywhere else, it slides back to its pedestal.
4. To change their mind, the child drags a different bar to Zippy. He tosses the old one back to its pedestal and catches the new one.
5. A big **SWAP ⇄** button pops up next to Zippy and pulses. When it is tapped, Zippy dangles down to the left pan. In **one motion** he lifts the crown with one hand and sets the bar down with the other. The exchange is simultaneous, so only the masses decide what happens.
6. Outcome:
   - **Equal masses:**
     - The beam stays level (a tiny wobble, then it settles), the emblem flashes a green =, and a "ding" plays.
     - Grumble keeps snoring, with one extra-loud comic snore.
     - Zippy holds the crown up proudly (hold frames, crown drawn at his hands), turns to Grumble and giggles: *Zippy: "Hee hee! Sleep tight, Grumble!"*
     - Confetti and coin sparkle play, then the crown flies into a crown pip.
     - The caption gives the **reason** (see the levels). Next ▶ activates.
   - **Unequal masses:**
     - The beam tips toward the heavier side with a creak and a clang, and the emblem turns to ≠.
     - Grumble wakes up (see the animation map in Section 4).
     - Zippy is shocked, quickly swaps the crown back (the beam re-levels) and hides, nervous.
     - Grumble looks around, yawns and flops back to sleep. *Zippy: "Phew!"*
     - The bar returns to its pedestal with a "Tried" tag and dims, but stays visible.
     - The feedback caption and voice line play.
7. **Tilt rule:** 0° when the sides are equal. Otherwise 10° + 2° × the difference in units, capped at 16°, toward the heavier side, with a springy settle. Even a 1-unit difference must clearly tip. The pans hang straight down from the beam ends.
8. **Coins are tappable for counting.** Each tap lights a coin, shows a running number above it (1, 2, 3…) and plays a clink that rises in pitch.
9. Accessible alternatives: tapping a bar makes it fly to Zippy. With a keyboard, Tab to a bar, press Enter to give it to Zippy, and press Enter on SWAP.
10. **From Level 4's "Try & Check" onward, Zippy checks before he swaps.** After he catches a bar, the Check routine (Section 9) runs. SWAP appears only once LHS = RHS has been shown for that value. Story reason: "Smart treasure hunters check before they swap!"

## 9. Feedback rules and the Check routine

- Respond within 100 ms of every action, with sound and motion.
- Use friendly words only: "Oops!", "Almost!", "Try again!". Never "Wrong", never a harsh buzzer.
- No timers, lives, score loss or game over. Grumble always goes back to sleep.
- **Two-tier hints on every task.** After the first miss, give a short nudge. After the second, give the full explanation and make the right answer glow.
- Correct feedback always says **why**.
- **Idle help:** after 8 s with no action, an animated hand shows the gesture and the instruction plays again.
- One instruction at a time. Whatever the child must use glows, and the rest of the scene dims slightly.
- **First-time demos:** a hand pointer shows each new gesture the first time it appears: drag to Zippy, tap SWAP, drag a label, pick from a blank.
- Grumble reacts only to the balance. He ignores mistakes in the drag-and-drop activities, where Zippy reacts instead: a giggle when right, "Hmm…" on a miss.
- **Show the bars in a new random order every time a level loads.** In the PPT the right bar is in the middle in 5 of 6 levels, and kids spot that pattern fast.

**Check routine.** A parchment Check panel slides up between the balance and the bars:
```
          x + 3 = 9
LHS:  4 + 3 = [ ▼ ]        RHS: [ ▼ ]
```
1. **Substitute:** the number of the chosen bar flies from Zippy's hands into the x slot with a "pop", and x becomes that number.
2. **Find each side:** tapping a blank opens 3 big number chips (a custom picker, not a native select). A wrong chip shakes and shows a hint.
   - LHS hint: "Add: 4 + 3. Count on from 4: 5, 6, 7." The coins light up as it counts.
   - RHS hint: "RHS is the number on the right of =."
3. **Compare:** LHS (teal) and RHS (amber) slide side by side, with a big green = or coral ≠ between them, e.g. "7 ≠ 9".
4. **Not equal:** "4 doesn't work. Try another value." Grumble only stirs, because we checked first: *Zippy: "Phew! Good thing we checked."* The bar goes back to its pedestal, tagged "Tried".
5. **Equal:** "Both sides equal 9." → "6 is the solution!" → SWAP appears → the normal swap → celebration.

## 10. Game flow and script

Each step has one caption, which is both spoken and shown. Lines in quotes are final copy.

### 10.1 Title screen
- start-screen.png with a slow Ken Burns zoom, vines swaying over it and sparkles on the crown.
- **Logo:** "Zippy's Crown Quest" in chunky, glossy gold letters with a small crown over the Q. Place it upper right, clear of Zippy (who fills the left half of this art), with a soft dark glow behind it for contrast.
  - Subtitle: "Class 8 • Linear Equations".
  - Tagline: "Select a replacement. Swap. Keep Grumble asleep."
- **Start button:** start-button.png at about 260 px, bottom-centre, pulsing, with "Tap to start" on a small wooden plank underneath.
- On tap: squash + boing, then an iris transition into the intro. **Audio unlocks on this tap; nothing plays before it.** Show "Continue" if progress is saved.

### 10.2 Intro (the camera moves the World layer; Skip available)
| # | What happens | Caption / voice |
|---|---|---|
| intro-1 | Dark room; the two torches light one after the other ("fwoom"). The camera starts zoomed ×1.8 on Grumble, bottom-left. Loud snore loop, Zzz rising. **GRUMBLE** name burst. | "Shhh… This is Grumble. He guards the treasure." |
| intro-2 | The snore gets comically louder; leaves rustle at the top. | "Luckily, he's fast asleep!" |
| intro-3 | The camera pans up-left. A vine drops from the top edge with Zippy hanging by his tail. He swings in like a pendulum (laugh 1, "Wheee!") and settles. **Spotlight:** the scene dims except for a soft circle on Zippy, with sparkles. **ZIPPY!** name burst; Zippy waves. | "Meet Zippy!" |
| intro-4 | The camera pulls out to the full room. The crown on the balance glints (shimmer sound). *Zippy: "Ooh!"* | "He spots a golden crown in the treasure room." |
| intro-5 | A thought bubble above Zippy shows a mini balance tipping, its emblem turning to ≠, and Grumble roaring. Zippy gulps. | "Careful! If the balance tips, Grumble will wake up." |
| intro-6 | Arrows show crown ⇄ gold bar. | "Let's swap the crown for something just as heavy. That should keep the balance level!" |
| intro-7 | One coin pops up and grows, with a "1 unit" tag and a clink. | "Each gold coin has a mass of 1 unit." |
| intro-8 *(added)* | The three bars glow in turn; the "3" bar gets a "= 3 coins" tag. | "The number on each gold bar is its mass." |

### 10.3 Levels 1–3: The Swap
| Level | Left pan | Right pan | Bars | Answer | Opening line |
|---|---|---|---|---|---|
| 1 | crown | 5 coins (2 on 3) | 3, 5, 7 | 5 | "Which bar should Zippy use?" then *(adapted)* "Drag it to Zippy, then tap Swap.", with the hand demo |
| 2 | crown | 7 coins (3 on 4) | 5, 7, 9 | 7 | "There's another crown! Let's help Zippy collect it too." |
| 3 | crown | 4 coins (2 on 2) | 3, 4, 6 | 4 | "One more crown. Grumble is still asleep!" |

Feedback (N = the answer):
- Correct: "Perfect swap! The crown is N units — just like the N coins."
- Too light, first miss: "Oops! That bar is too light — the balance tipped!"
- Too heavy, first miss: "Oops! That bar is too heavy — the balance tipped!"
- Second miss: "Each coin is 1 unit. The crown balances N coins, so it is N units. Try the N bar!" The coins count up one by one and the right bar glows.
- Between levels, a sparkle poof sets up the next crown on the balance.

If you were also given an earlier mock-up image (crown + 2 coins vs 6 coins, bars 3/5/7), use it for style only. Its numbers have no correct answer.

### 10.4 Level 4: The Mystery Crown (crown + 2 coins | 7 coins · bars 4, 5, 7)

**A. Naming the unknown (in the scene)**
| # | What happens | Caption / voice |
|---|---|---|
| l4-1 | Zippy looks curious (hold 3). The new crown has 2 coins beside it. | "Wait… this crown has two coins beside it." |
| l4-2 | Everything on the left pan glows together, then the right-pan coins glow. | "The crown and these two coins together balance seven coins." |
| l4-3 | Only the crown glows. | "But Zippy needs a replacement for just the crown." |
| l4-4 | A big "?" pops up over the crown. | "How can we find its mass?" |
| l4-5 | The "?" morphs into a yellow-highlighted **x** under the crown. | "The crown's mass is unknown. Let's call it x." |
| l4-6 | The label grows to **x + 2** under the left pan. | "The crown and two coins have a total mass of x + 2." |
| l4-7 | **7** appears under the right pan. | "They balance 7 units." |
| l4-8 | **Key moment:** x + 2 flies down, the green = flies off the beam's disc, the 7 flies down, and they snap together into a big **x + 2 = 7**. | "So, x + 2 = 7." |

**B. Zippy's Notebook.** The scene dims and a parchment scroll unrolls. Zippy hangs at the side and points (reach 2) while Grumble keeps snoring. Every new word triggers a "New word!" gem that flies into the Word Treasure bag.
| # | What happens | Caption / voice |
|---|---|---|
| l4-9 | x + 2 = 7, large. | "Hmm… let's find x, so Zippy can make the swap." |
| l4-10 | Yellow box on x with a small crown icon beside it; tag "Variable". | "Here, x represents the crown's mass — the value we want to find." |
| l4-11 | 💎 VARIABLE | "A letter used to represent an unknown value is called a variable. Here, our variable is x." |
| l4-12 | A rounded box around x + 2, with a mini crown + 2 coins above it. | "Now look at x + 2. It represents the crown and the two coins together." |
| l4-13 | Tags: x → "variable", 2 → "constant", + → "addition". 💎 CONSTANT | "It consists of a variable, x, and a constant, 2, joined by addition. A constant is a number with a fixed value." |
| l4-14 | 💎 ALGEBRAIC EXPRESSION | "Joining x and 2 with addition gives the algebraic expression x + 2." |
| l4-15 | The = sign pulses beside a mini balance icon. | "The balance tells us that x + 2 equals 7." |
| l4-16 | The whole equation is outlined. 💎 EQUATION | "This statement of equality is an equation." |
| l4-17 | x + 2 turns teal, labelled "Left-hand side (LHS)". 💎 LHS | "Everything to the left of the equals sign is the left-hand side." |
| l4-18 | 7 turns amber, labelled "Right-hand side (RHS)". 💎 RHS | "Everything to the right is the right-hand side." |

**C. Activity: Label the parts** (drag and drop)
- Title "Label the parts of the equation." Subtitle "Drop each label into its box."
- The equation is **4x + 3 = 19**, with four empty boxes on leader lines:
  - top-left → x
  - top-right → a bracket over the whole equation
  - bottom-left → a bracket under 4x + 3
  - bottom-right → a bracket under 19
- Chips, shuffled: RHS, Variable, Equation, LHS. A small helper note says "4x means 4 times x."
- **Correct:** the chip snaps in and turns green with a ✓, and its part of the equation glows in its colour. Voice: "Yes! x is the variable." / "Yes! 4x + 3 is the LHS." / "Yes! 19 is the RHS." / "Yes! The whole statement is an equation."
- **First miss:** the chip bounces back: "Look where the line points."
- **Second miss on the same box:** explain, and make the right chip glow.
  - Variable box: "This line points to x, the letter for an unknown value. That's the variable."
  - Equation box: "This bracket covers the whole statement with =. That's the equation."
  - LHS box: "This bracket is left of =. That's the LHS."
  - RHS box: "This bracket is right of =. That's the RHS."

**D. Linear in one variable (notebook)**
| # | What happens | Caption / voice |
|---|---|---|
| l4-19 | Tag "One variable: x". | "This equation has one variable: x." |
| l4-20 | A ghost "1" appears as a power on x (x¹), then fades away. | "When we write x, its power is 1." |
| l4-21 | | "There is one variable, and its highest power is 1." |
| l4-22 | 💎 LINEAR EQUATION IN ONE VARIABLE | "This is a linear equation in one variable." |

**E. Activity: Sort it** (drag and drop)
- Title "Drop each equation into the correct box." There are two big bins: "Linear equation" (teal) and "Nonlinear equation" (amber).
- Cards, shuffled: x² + 2 = 7 · 2x + 3 = 11 · x² = 16 · x − 4 = 6 · 2x² + 1 = 9 · x + 2 = 7. Render powers as real superscripts, never as raw LaTeX like "\(x\)".
- **Correct, linear:** "Correct! The highest power of x is 1." A ghost ¹ pops up above x.
- **Correct, nonlinear:** "Correct! The highest power of x is 2." The ² glows.
- **First miss:** "Check the highest power of x."
- **Second miss:**
  - Linear card: "The highest power of x is 1. So, it's a linear equation."
  - Nonlinear card: "The highest power of x is 2. So, it's a nonlinear equation."
  - *(added)* For 2x + 3 = 11, add: "2x means 2 times x, so the power is still 1."
  - *(added)* For 2x² + 1 = 9, add: "x² means x times x, so that's power 2."

**F. Word Treasure recap** *(added; the PPT's summary slide is empty).* A chest opens and the gems pop out onto a tidy board:
- Variable — a letter for an unknown value → x
- Constant — a number with a fixed value → 2
- Algebraic expression — variables and constants joined by operations such as + and − → x + 2
- Equation — a statement that two sides are equal → x + 2 = 7
- LHS / RHS — everything left / right of the = sign → x + 2 and 7
- Linear equation in one variable — one variable, highest power 1 → x + 2 = 7

Voice: "Look at all the words in your treasure! Now let's find the crown's mass."

**G. Try & Check.** A worked example with light taps, back in the scene with the sign "x + 2 = 7" on the post.
| # | What happens | Caption / voice |
|---|---|---|
| l4-23 | | "Now let's find the crown's mass." |
| l4-24 | | "We need a value of x that makes both sides equal." |
| l4-25 | The 4 bar glows. The child taps it, and its number drops into x on the Check panel. LHS: 4 + 2 = 6 (the coins count on: "5, 6"). RHS: 7. | "Let's check 4 by replacing x with 4." |
| l4-26 | A big coral "6 ≠ 7", then "4 is not a solution". Grumble stirs. | "The left side is 6, but the right side is 7. So, 4 doesn't work." |
| l4-27 | The child taps 5: LHS: 5 + 2 = 7. RHS: 7. | "Now let's try 5 by replacing x with 5." |
| l4-28 | "LHS = 7, RHS = 7", then a green "7 = 7". | "Both sides equal 7." |
| l4-29 | 💎 SOLUTION | "A value that makes an equation true is called its solution. So, 5 is the solution." |
| l4-30 | The child drags 5 (already checked) to Zippy → SWAP → the beam stays level. *Zippy: "That works!"* He collects the crown, celebrates and giggles at Grumble. | "So, the crown is 5 units." |

### 10.5 Level 5: Guided practice, x + 3 = 9 (crown + 3 coins | 9 coins in 3 rows of 3 · bars 4, 6, 7)
1. *Zippy: "Let's try 4."* The 4 bar glows, and the child gives it to Zippy.
2. Check: "Replace x with 4." LHS 4 + 3 = [6 / 7 / 9] · RHS [3 / 7 / 9].
3. Compare: "LHS = 7, RHS = 9." Then "7 ≠ 9" and "4 doesn't work. Try another value." The 4 bar is marked Tried; Grumble stirs.
4. *Zippy: "Let's try 6."* LHS 6 + 3 = [8 / 9 / 10] · RHS [3 / 6 / 9]. Then "Both sides equal 9."
5. "x = 6. 6 is the solution!" → SWAP → the child collects the crown.

### 10.6 Level 6: Your turn, x + 4 = 11 (crown + 4 coins | 11 coins in rows of 4, 4, 3 · bars 5, 8, 7)
- "Choose a value for x." Zippy makes no suggestion.
- **Picks 7:** "LHS: 7 + 4 = 11. RHS: 11. Both sides equal 11." → SWAP → "7 is the solution!" → "Next question".
- **Picks 8:**
  - "Let's check 8." then "Find the value of each side."
  - LHS 8 + 4 = [11 / 12 / 13] · RHS [4 / 8 / 11].
  - "12 ≠ 11. 8 isn't a solution." The 8 bar is marked Tried. "Try another value."
- **Picks 5:** the same routine. LHS 5 + 4 = [8 / 9 / 10] · RHS [4 / 5 / 11]. Then "9 ≠ 11. 5 isn't a solution."

### 10.7 Level 7: Your turn, x + 2 = 10 (crown + 2 coins | 10 coins in rows of 4, 4, 2 · bars 10, 8, 12)
- Same flow as Level 6. Opening line: "Another crown! This crown and 2 coins balance 10 coins."
- The distractors are deliberate:
  - 10 = took the whole right side.
  - 12 = added instead of subtracting.
- LHS chips: if 10 is picked [11 / 12 / 13], if 12 [13 / 14 / 15], if 8 [9 / 10 / 11]. RHS chips: [2 / the picked number / 10].
- Extra second-miss tips:
  - Picked 10: "10 balances the crown AND the 2 coins, so the crown alone must be less than 10."
  - Picked 12: "12 + 2 = 14. That's even heavier than all 10 coins!"

### 10.8 Level 8: The Smart Way, x + 8 = 23 (crown + an 8 bar | a 23 bar · pedestal bars 15, 23, 31)
| # | What happens | Caption / voice |
|---|---|---|
| l8-1 | New set-up: crown + an "8" bar on the left, a "23" bar on the right; the sign reads "x + 8 = 23". Zippy thinks. | "Zippy spots another crown!" |
| l8-2 *(added)* | 8 coins melt together into one "8" bar. | "So many coins! This 8 bar is as heavy as 8 coins." |
| l8-3 | Thought bubbles appear one after another: x = 10 → 10 + 8 = 18 ✗ · x = 12 → 12 + 8 = 20 ✗ · x = 14 → 14 + 8 = 22 ✗ · "…". Zippy yawns and droops. | "We could try different values again. But that might take a while." |
| l8-4 | Zippy perks up with an idea; a crown icon sits beside a yellow x. | "Let's find the crown's mass directly." |
| l8-5 | The 23 bar cracks along a glowing seam into an 8 bar and a 15 bar, tagged "23 = 8 + 15". The left 8 glows, and the child drags it off the pan onto a stone ledge beside the balance. **As it lifts, the beam tips right, the emblem shows ≠, the snoring stops and Grumble stirs**, with a tension sting. This is a teaching moment, not a mistake. | "There are 8 extra units beside the crown. Let's remove them." |
| l8-6 | The right 8 glows, and the child drags it off. The beam levels, the emblem shows =, Grumble settles and the snoring resumes. *Zippy: "Phew!"* The equation board under the balance now reads **x + 8 − 8 = 23 − 8**; both "− 8" pop in together in blue, joined by an arc. | "To keep the balance level, we remove 8 units from the other side too." |
| l8-7 | The rows animate: x + 8 − 8 = 23 − 8 → x + 0 = 15 → **x = 15**. The crown now balances the 15 bar. | "Subtracting 8 undoes adding 8. That leaves x = 15." |
| l8-8 | Both 8 bars slide back together, and the 15 + 8 re-merge into 23 (the beam stays level). Check panel: x = 15 → LHS 15 + 8 = [22 / 23 / 24] · RHS 23. | "Before Zippy swaps, let's check. Replace x with 15." |
| l8-9 | A green "23 = 23". | "Both sides equal 23. So, 15 is the solution." |
| l8-10 | The child drags the 15 bar to Zippy → SWAP → the beam stays level. Final shot: 15 + 8 on the left, 23 on the right, the sign "x = 15", and Zippy's crown celebration. | "That's our match! Zippy can make the swap." |

### 10.9 Finale *(added)*
- Zippy holds up a wobbly stack of all 8 crowns and celebrates, while Grumble is still snoring. Confetti and a fanfare play.
- "Quest complete! Zippy collected all 8 crowns — and Grumble is still snoring!"
- Three key-idea cards:
  - "A level balance shows an equation: LHS = RHS."
  - "To check a value, replace x. If LHS = RHS, it's the solution."
  - "Do the same thing to both sides to find x directly."
- Buttons: Play again · Word Treasure · Chapter select.

## 11. Sound

Nothing plays before the START tap. Build an `AudioManager` with named cues.

**Generate every sound effect in code with the Web Audio API** (oscillators, filtered noise, envelopes), so the game is complete with zero audio files. If `/assets/audio/<cue>.mp3` exists, it replaces that cue. Load audio files with HTMLAudioElement so they also work when the game is opened from disk.

| Cue | Sound |
|---|---|
| music.title | bouncy jungle-temple adventure loop (marimba, light drums) |
| music.game | soft, mysterious loop; ducks to 20% under voice |
| amb.temple | torch crackle and water drips, very quiet |
| grumble.snore | the "kharrate" snore loop: a rumbly inhale snore + a whistly exhale, ~3 s per cycle, synced to the sleep frames; louder when the camera is close |
| grumble.mumble | sleepy "hrrm… mmph?" |
| grumble.roar | comic "GRRRUMBLE!" + a stomp (funny, not frightening) |
| grumble.yawn | big yawn + flop |
| zippy.whee | swing whoosh + "wheee!" |
| zippy.laugh | cheeky monkey giggle, "hee-hee-hoo-hoo" |
| zippy.catch | "oof!" + a soft thud |
| zippy.eek / zippy.phew | a yelp / a relieved sigh |
| bar.pick / bar.place / bar.return | stone scrape with a sparkle / heavy clunk / soft whoosh |
| coin.clink | a clink whose pitch rises with each coin counted |
| balance.creak / balance.clang / balance.level | creak / metal clang / bright "ding" |
| ui.tap / ui.pop / name.burst | wooden tok / bubble pop / comic boing |
| correct / tryagain | happy two-note chime / soft low "boop" (never a buzzer) |
| gem.collect / crown.sparkle / confetti / fanfare | magic chime / shimmer / party pop / quest-complete fanfare |
| scroll.open | parchment unrolling |

**Voice:**
- Every caption has a voice line with an ID. If `/assets/vo/<lineId>.mp3` exists, play it; otherwise fall back to the Web Speech API (an en-IN voice if available, rate 0.95).
- The narrator is warm, clear and unhurried. Zippy is playful and higher-pitched.
- Captions are always on.

## 12. Make it clear for kids (non-negotiable)

- Keep sentences short (≤ 15 words), always shown and spoken. 🔊 replays the line.
- The balance is the hero visual: level means equal. The = / ≠ emblem reacts every time the balance moves.
- Same colour, same meaning, everywhere (Section 5).
- Objects visibly turn into symbols: crown → x, coins → numbers, the balance → =.
- When something matters, it glows and the rest dims slightly.
- Every new word arrives with a "New word!" gem and a one-line meaning. Word Treasure is always one tap away.
- At most 3 choices at a time. Tried choices are tagged, not removed.
- Mistakes are safe and funny; there are no fail states.
- Respect `prefers-reduced-motion`: no shake and a gentler camera. Every button has a screen-reader label, and the keyboard works everywhere. Presenter keys: → next, ← back.

## 13. Acceptance checklist

- [ ] 16:9 at every window size, no scrollbars, dragging accurate after scaling.
- [ ] No sound before START. Snoring is audible in the intro. Zippy laughs at Grumble after every correct swap, and Grumble roars after every wrong one.
- [ ] Intro order: the camera on sleeping Grumble with his name burst → Zippy drops in from the top, spotlit, with his name burst → the rules.
- [ ] Every line in Section 10 appears in order, as both a caption and a voice line.
- [ ] Wrong swap: the beam tips the right way (lighter side up), Grumble wakes and falls asleep again, the bar is tagged Tried, then the first-tier hint, then the second-tier hint.
- [ ] Equal masses never tip the beam.
- [ ] From Level 4's Try & Check onward, SWAP stays blocked until LHS = RHS has been shown.
- [ ] x + 8 = 23: removing one 8 tips the beam, and removing the other re-levels it.
- [ ] Sprites follow Appendix A: no clipped hands, no jitter, Zippy's tail stays on the vine, Grumble stays on the floor.
- [ ] The bars appear in a different order every time a level loads.
- [ ] Powers render as superscripts; no raw "\(x\)" anywhere.
- [ ] Touch, mouse and keyboard all work. Progress survives a reload. The game runs from index.html with no build step.

**Deliver:** `index.html`, `styles.css`, `content.js` (all text and level data), `game.js` (engine), `audio.js`, `/assets`, and a short README covering how to run the game, how to edit text and levels, and how to drop in real audio and voice files.

## Appendix A — sprite atlas (measured from the provided files)

Character frames use the format `[x, y, w, h, ax, ay]`: the crop rectangle in the sheet plus the anchor point inside that rectangle. Frames 1–8 run left to right, top row first. Single images use `[x, y, w, h]`, the crop of the visible art.

```js
const ATLAS = {
  // Grumble: anchor = bottom-centre (keep him on the floor)
  grumble_sleep: { src: "assets/grumble/sleep.png", frames: [[3,270,363,236,181,231],[367,191,361,314,178,309],[728,250,361,256,178,251],[1089,270,361,235,178,230],[3,689,363,229,181,224],[367,603,361,315,179,310],[728,663,361,255,179,250],[1089,685,362,233,179,228]] },
  grumble_wake:  { src: "assets/grumble/wake.png",  frames: [[4,262,358,255,180,250],[365,262,358,255,181,250],[726,262,358,255,180,250],[1088,262,357,255,180,250],[3,592,359,253,181,248],[365,592,358,253,181,248],[726,592,358,253,181,248],[1088,592,357,253,180,248]] },
  grumble_roar:  { src: "assets/grumble/roar.png",  frames: [[8,107,361,421,180,416],[371,107,355,422,179,417],[726,100,360,429,184,424],[1091,108,353,421,177,416],[9,623,358,392,179,387],[368,609,364,407,180,402],[721,594,397,422,197,417],[1097,619,347,397,175,392]] }, // frames 6–7 overlap 3 px, 7–8 overlap 13 px

  // Zippy: anchor = tip of his tail (keep it on the end of his vine)
  zippy_hold:    { src: "assets/zippy/hold.png",    frames: [[30,11,365,482,123,4],[408,10,354,492,104,4],[776,8,341,499,116,4],[1136,7,294,503,108,4],[39,545,310,496,137,4],[400,540,304,500,141,4],[780,538,300,506,126,4],[1137,541,283,518,122,4]] },
  zippy_reach:   { src: "assets/zippy/reach.png",   frames: [[75,8,261,507,126,4],[453,8,254,531,101,4],[822,8,259,522,104,4],[1171,8,272,521,105,4],[97,550,305,494,101,4],[448,550,261,507,111,4],[809,550,325,505,107,4],[1164,550,273,503,105,4]] },
  zippy_laugh:   { src: "assets/zippy/laugh.png",   frames: [[30,16,366,505,173,4],[414,14,299,527,137,4],[795,18,326,522,103,4],[1134,15,292,526,111,4],[38,553,375,466,176,4],[443,551,258,515,116,4],[762,552,303,500,146,4],[1112,551,314,514,140,4]] },
  zippy_scared:  { src: "assets/zippy/scared.png",  frames: [[28,11,379,524,149,4],[430,11,283,532,102,4],[775,11,285,527,117,4],[1118,11,313,534,136,4],[59,546,285,527,117,4],[431,547,277,517,103,4],[775,547,286,512,123,4],[1160,545,273,530,103,4]] },
};

const PARTS = {
  balance: { src: "assets/props/balance-parts.png",
    beam: [84,48,578,86], knob: [690,44,74,100], hangerL: [36,194,282,220], post: [364,158,80,286],
    hangerR: [488,192,282,222], panL: [16,460,270,86], base: [292,456,224,106], panR: [524,460,268,86] },
  vines: { src: "assets/bg/vines.png",
    a: [16,136,392,472], b: [418,136,182,726], c: [618,136,370,582], d: [994,136,248,686],
    e: [1260,136,176,814] },                                    // e = longest strand → Zippy's vine
  bar:         { src: "assets/props/bar.png",          crop: [58,356,1120,516] }, // number centre ≈ (44%, 57%) of the crop
  coin:        { src: "assets/props/coin.png",         crop: [76,80,890,880] },
  crown:       { src: "assets/props/crown.png",        crop: [6,132,1242,1016] },
  startButton: { src: "assets/ui/start-button.png",    crop: [222,42,1120,930] },
};
```

Balance assembly points, relative to each crop (fine-tune by eye):
- Beam pivot: the centre of the disc, at about (50%, 50%) of the beam.
- Beam end knobs: about 3.5% and 96% across the beam.
- Each hanger's top knob: about (50%, 7%) of the hanger.
- Pans: they sit just under each hanger's bottom bar.
