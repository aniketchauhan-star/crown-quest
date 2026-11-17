---
name: learning-section
description: How a learning section of a maths game is built -- the beat grammar, instruction-to-animation sync and highlighting, the explanation flow, the activity pattern, and the motion rules it must obey. Apply to every new section, scene, page or activity, before writing the first beat.
---

# Learning Section

A section teaches ONE idea in a handful of pages, on the shared board, with
the mascot as the voice. It is built on the engine every game here shares:
`Flow` (the scene clock), `Motion` + `Beats` (every tween), `Pages` (the kit:
bird, header, Next, drag-match, pacing), `Tri`/figure builders, `W`
(widgets: dropdown, pills, slider, table) and `I18n` (every word by key).
This skill is the way those are put together. It sits on top of
`animation_skill.md`, `motion_catalog_prompt.md` and `localization_skill.md`;
where they say how a thing moves or where a word lives, they win.

## 1. The grammar: beats, pages, scenes

- A **beat** is one thing happening: a line said, a mark drawn, a word landing,
  a pause. A beat is one `await` through `Flow` (`Flow.wait`, `Flow.anim`,
  `Flow.once`) -- never a raw `setTimeout` or a bare `await tween`.
- A **page** is the stretch between two hand-overs: it ends on `K.handOver()`
  (Next arrives and is waited on) or `K.autoTurn()` (a self-turning page, held
  `AUTO_TURN` ms to be looked at). Use Next where the learner should study the
  board; use autoTurn for a page that only shows a step.
- A **scene** is one `await` chain of pages, registered through
  `Pages.addSection({ name, scenes, build, parts, wipe, reset, stage })`.
  Every hook is mandatory:
  - `build(kit)` -- make the marks once, into the scene's own `<g>`.
  - `parts()` -- everything on the figure, so a wipe can fade it.
  - `wipe()` -- promises for anything kept OUTSIDE the figure (pane, table).
  - `reset()` -- back to rest with no animation; clear every class and word.
  - `stage(i)` -- the board exactly as scene i expects to FIND it, written in
    with no animation, so a jump from the page bar opens a true board.
- Each scene's first beat decides its opening: `K.wipeBoard()` for a fresh
  board, or an `ensure…()` that writes the previous scene's end state in if
  it is missing (a jump), and otherwise continues from it.
- Skip and Replay are not features to add; they come free when every wait is
  Flow's and every tween is tracked. Test both on every page.

## 2. Instruction first, animation on the word

The learner must always be able to tell WHICH words a movement belongs to.

- **Nothing appears before it is spoken of.** A mark lands as the line that
  names it is said, never a beat earlier.
- **Every line is a key** (`K.say('s2Both45')`, `K.speakBySentence(key)`).
  A line of more than one piece is shown a piece at a time: split at `. ! ?`
  and at clause commas, each piece capitalised, never a broken list. The
  splitter is `sentencesOf` in `pages.js`; run it over new lines and read the
  pieces before shipping.
- **Time a beat to its word with `K.onPhrase(key, phrase, fn)`**, armed BEFORE
  the line starts. Pick the phrase that names the thing ("theta", "equal",
  "hypotenuse", "slider"). With a recording and word cues the beat lands on
  the heard word; without, on the typed word.
- **A thing drawn WHILE a line is said** goes in the line's `along` callback
  (`K.say(key, mood, along)`) -- the words and the pen start together and the
  beat is over when both are.
- **One thing at a time.** While a side is being named, only that side is lit.
  Never two marks pulsing, never a slide and a pop in the same beat.
- **Highlight = the thing in its own ink.** A line swells (`Beats.linePulse`,
  `Beats.pulseHold`/`pulseRelease` for an unknown length), a word breathes
  (`Beats.textPulse`), a group blooms under `#partGlow`. No arrows, boxes or
  colour changes that are not the part's own colour. The word that names a
  part wears the part's colour (`--side-opp`, `--side-adj`, `--side-hyp`,
  `--angle-ink`) wherever it appears: on the figure, in an equation slot, in
  a fact line.
- **The bird's mood follows the line:** `talking` by default, `happy` for a
  right answer or praise, `confused` for "Not quite!", `celebrating` only at a
  section's end. Settle back to idle after every line.
- Voice-only lines (no words shown) use `voiceOver`/`birdVoice` and keep their
  fallback hold when no clip exists, so beats around them keep their pace.

## 3. The flow of an explanation

Order every teaching page the way a teacher's hand moves:

1. **Draw** -- the shape is made by a pen (`Beats.drawOutline` with the tip
   riding the stroke), the colour poured in after (`fillShape`), the right
   angle marked last. The learner watches it being made; hold `SHORT` between
   acts and `LOOK` after.
2. **Name** -- labels land one by one (`Beats.labelIn`, ~120-220 ms apart),
   each on its own word, with the pop every label in the game lands with.
3. **Relate** -- the mark the line is about is lit while the line is said;
   a value replaces a word in place (`Beats.relabel`), a role moves
   (`Tri.moveTheta`), halves part (`splitApart`). Each relation is its own
   beat with a hold.
4. **Stand aside** -- when working is needed, the figure slides smoothly to
   the LEFT half (`Beats.slideGroup(g, K.SHIFT)`) and the right pane opens;
   rows arrive one at a time (`Beats.rowIn`), each after the line that asks
   for it. Never fill the pane in one go. Rows the lesson has finished with
   step back (`is-done`), they do not leave, until the page does.
5. **Collect** -- values found go into the table (`W.table.fill`) one by one,
   each with its chime, with the figure and pane cleared first so the table
   is the only thing on the board.
6. **Close** -- `handOver`; on the next scene, either continue the board or
   wipe it (`K.wipeBoard` fades everything together: one wipe, not an undo).

Pacing: `SHORT` (280 ms) between marks of one drawing, `BEAT` (560 ms) between
lines, `LOOK` (1.4 s) after a finished mark, `AUTO_TURN` (2.5 s) for a
self-turning page. The first drawing of a lesson is slow; later ones brisker
(`time` on `Tri.draw`). The header stays open while the bird speaks; close it
(`K.collapseHeader`) only when the figure needs the whole board.

## 4. The activity

Every question follows one pattern, so a learner meets one game:

1. **Ask once.** The instruction is said once, from the header, with the
   control arriving as it ends (pills, dropdown blanks, slider, boxes + tray).
   It is never repeated after a wrong answer.
2. **Show the gesture, faintly.** After a short wait with nothing done, the
   pointing hand (`W.handNudge`, `W.handSlide`, `K.dragGuide`) demonstrates:
   tap here, slide there, drag to there. It stops the moment the learner
   touches anything.
3. **Wrong:** the control shakes its head (`Beats.shakeWrong`, `boxWrong`,
   `choiceWrong`), goes red for a beat, the wrong chime sounds, the bird says
   "Not quite!" in `confused` mood (or the specific reason, if the storyboard
   gives one), and the option is struck out / sent home. The learner tries
   again until right -- there is no dead end.
4. **Right:** green, a tick, the right chime, one outward pulse, the small
   burst beside it; the bird says "Correct!" in `happy` mood -- except for the
   LAST answer of a set, which gets praise (`K.praise()`, a praise key over a
   confetti shower) instead.
5. **The board ends right.** Whatever the answer path, the words and values
   the explanation that follows refers to are on the board.
6. **Skip answers for the learner.** Every wait on a person goes through the
   hidden gate (`Flow.once(dom.gate, { auto: true })` or `W.waitPick`), so a
   skipped page lands on a finished board; `fill()`/`fillIn()` puts the right
   answer in without firing the gate again.
7. **Controls are real controls:** `<button>`s or `role="button"`/`"slider"`
   with `aria-label`s, usable by keyboard (Enter/Space, arrow keys), spent
   (`is-done`, `pointer-events: none`) once answered.

Choice design: options come from the storyboard; when it gives none, use what
is on the figure (the side names, the lengths shown) rather than invented
distractors, and say so in the hand-over notes.

## 5. Motion rules this skill assumes

From `animation_skill.md` and `motion_catalog_prompt.md`, restated as the
rules a section author actually trips on:

- Only `transform`, `opacity`, `stroke-dasharray/offset`, `stroke-width` and
  colour are animated. Position in the figure is rewritten as attributes
  (`t.set`, `layout`), never tweened as `left/top/width`.
- Every tween is made through `Motion` (`M.timeline`, `M.to`, `M.fromTo`) and
  waited on with `Flow.anim`, so Skip lands it and Replay kills it. Durations
  through `M.dur`, gaps through `M.gap`; the only numbers are Motion's
  (`FAST .15`, `NORMAL .25`, `SLOW .4`, `REVEAL .6`) and the few named holds.
- Eases: `power3.out`/`power2.out` to arrive, `power2.in` to leave,
  `power2.inOut` to travel, `back.out(1.2–1.7)` for a landing pop. Nothing
  elastic, nothing that bounces twice.
- Lines are drawn with the dash trick, with a pen dot at the tip for the
  first drawing of a page; dashed lines through a mask (`Beats.dashedIn`).
- Loops of unknown length (a breathing blank, a lit side) are CSS classes
  (`is-asking`, `is-pulsing`), turned on by a beat and off in `reset()`;
  endless GSAP loops are marked `__motionEndless` so Skip leaves them.
- Layout changes glide through Flip (`M.relayout`) -- the bird between
  slots, a box resizing round a line -- never a snap.
- Faded marks hand their inline styles back (`revert`, `clearProps`); a scene
  that is torn down leaves nothing inline, nothing lit, nothing dashed.
- `prefers-reduced-motion` collapses every duration (through `M.dur`) and
  stops the demonstrations; the board must still read right standing still.
- Words arrive through the typer (`Typer`, word by word, no reflow), never by
  setting `textContent` while a line is on screen.

## 6. Words and keys

- Every string the learner sees or hears is a key in `locales/locales.json`
  (`T('key')`, `data-i18n`), English only; storyboard lines are copied
  verbatim, never edited. Fractions are spelled with U+2044 (`1⁄√2`) and
  stood up by `mathtext.js`; roots as `√3`.
- A voiced key is listed under `voiceOver.en.files` even before its clip
  exists, so the recording drops in with no code change.
- Generic feedback (`fbNotQuite`, `fbCorrect`, `praise*`) is shared; a
  storyboard's own verdict lines get their own keys.

## 7. Definition of done for a section

- [ ] Every page reaches its Next (or turns itself) at full speed AND under
      Skip; Replay and a page-bar jump open on a true board (`stage`).
- [ ] Every mark lands on the word that names it; nothing appears unspoken.
- [ ] One thing lit at a time; every highlight in the part's own ink.
- [ ] Lines shown a capitalised piece at a time; no list broken.
- [ ] The activity: ask once, hand after a pause, wrong = shake + "Not
      quite!" + retry, right = green + tick + chime + burst, last = praise.
- [ ] Nothing hard-coded: words by key, timings from Motion, colours from
      the palette tokens.
- [ ] `reset()` leaves no class, word, dash or inline style behind; a wipe
      fades everything in under a second.
- [ ] Works with reduced motion and from the keyboard.
- [ ] Walked once in a real browser (headless Chrome over CDP if automated),
      every page screenshotted and read for collisions and overflow.
