# Voice-over

Every line the game shows in its caption bar, and every line Zippy says in his speech bubble, is a recorded clip in `assets/vo/`. Since 2026-11-18 every line, Zippy's too, is in one man's voice, from the user's own recordings: first the 63 lines the studio couldn't make ("The lines from the user's recording", below), then all the rest, recorded in six parts from `docs/VO_RECORD_ALL.txt` and cut by ear the same way (each part's files matched to that part's lines in order). Until then the narrator was the studio's woman teacher (Female Teacher (Standard)) and Zippy a young boy (Male Child (Energetic)); those clips are in the git history (commit 9d2ffad).

| | |
|---|---|
| Clips | `assets/vo/vo001.ogg` … one file per line, Ogg Opus, 24 kbps, mono: 191 clips, 10.8 minutes, 2.1 MB, every line of the script (115 of them recorded again on 2026-11-19 for the new text: "The new text of 2026-11-19", below; 2026-11-19: the 168 clips of lines the game no longer says were removed with their script entries). On 2026-11-13 every clip was re-encoded from 32 to 24 kbps (speech stays clear; the folder had to be smaller), and the 33 clips of lines the game no longer says were removed with their script entries. |
| Script | `tools/vo_script.json`: each line as shown, as spoken, and the Devanagari the voice was given |
| Map | `js/vo_lines.js` (generated): line as shown → [clip, seconds] |
| Player | `js/voice.js` (finds and loads clips), played by `js/audio.js`, typed out by the caption in `js/ui.js` |
| Rebuild | `python3 tools/vo_build.py voiceovers_batch.zip …` |

## The studio

The clips come from the TTS studio **Ai Wala Human By Aamir** (https://ai-wala-human-by-aamir-809572708022.asia-southeast1.run.app/), tab *Batch Generation*, with these settings:

| Setting | Narrator lines | Zippy's lines |
|---|---|---|
| Language | Hindi | Hindi |
| Voice | Female Teacher (Standard): Gemini voice *Kore* | Male Child (Energetic): Gemini voice *Puck* |
| Format | .MP3 (the studio makes 24 kHz mono MP3s; the game ships them as Ogg Opus) | .MP3 |
| Text Column / Filename Column | `text` / `filename` | `text` / `filename` |
| Concurrency | 1 (Safest) | 1 (Safest) |

**Why Hindi, for English lines?** The studio works in two steps. First Gemini rewrites the text in the chosen language's script, then a Gemini voice reads that script. With Hindi chosen, "Meet Zippy!" becomes "मीट ज़िप्पी!": the words stay English, but the voice reads them with a natural Indian accent, which is what the children hear in class. (Choosing English gives a neutral accent.)

## Spoken forms

The voice reads exactly what it is given, so `tools/vo_script.json` keeps two forms of each line. `line` is the text the game shows (never changed for the voice), and `spoken` is what the voice is given:

- Maths in words: `=` "equals", `+` "plus", `−` "minus", `×` "times", `÷` "divided by", a fraction "x divided by four", −3 "minus three". Commas group a bracket: 3(x + 2) = 21 is "three times, x plus two, equals twenty-one".
- **Every number in English words** ("twenty-three", "four point seven five"). Given digits, the studio's first step sometimes writes the Hindi number word (23 → तेईस), and the voice then says it in Hindi.
- LHS and RHS as "L H S" and "R H S"; "…" as "..."; a dash as a comma.
- **Zippy's name is written in Devanagari, ज़िप्पी**, inside the English. Left in English, the studio sometimes wrote जिप्पी, which the voice reads as "Jippy". Devanagari text is kept as it is, so the name always comes out with a z.
- The same trick fixes any other word the studio gets wrong. In vo039 "or" is written ऑर, because the studio once wrote और, the Hindi word for "and".
- Lines whose spoken form differs from the text shown are marked in the table below (`=` means the same).

### Checking every clip

Before a clip goes into the game, its Devanagari (logged from the studio) is checked:

- no Hindi number words (एक, दो, तीन … बीस, तीस, पचास, सौ, and compounds like तेईस);
- no English translated into Hindi (Hindi grammar words such as है, और, का, में, or बराबर in place of "equals");
- names, possessives and the variable x read as they should be (ज़िप्पी, ग्रम्बल, एक्स);
- pace: the spoken form's characters ÷ the clip's seconds should be about 6 to 22. Short lines can fall just below that because every clip starts and ends with about a third of a second of quiet (for example "Now tap Swap!").

The sound itself is checked too (ffmpeg's `silencedetect`). A take with a pause of a second or more in the middle of a sentence, or a pause after almost every word, is made again with the same spoken form; the next take is normally fine.

A flagged line gets a corrected spoken form if it needs one, and is made again. Made again this way: vo007 and vo016 (Zippy read as "Jippy"), vo039 (और), vo161 (two 2-second pauses), vo188 and vo310 (word-by-word delivery).

## The lines from the user's recording

51 lines, new or reworded at the reviews of 2026-11-13 (listed below), could not be made in the studio: from 2026-11-13 every try ended in "Exceeded monthly Gemini API spending cap" ("Your prepayment credits are depleted", a 402 billing error on the studio's own Gemini account, which only its owner can top up; still so on 2026-11-18).

On 2026-11-18 the user recorded all 51 themselves, in one file, read one after another in the order of `docs/VO_LINES_TO_MAKE.txt`, **in a man's voice**, and chose to use it although every other narrator line is the woman teacher ("Use it anyway": the narrator's voice now changes on these lines, sometimes within one screen). `tools/vo_split.py` cut it into one clip per line: the speech recogniser found every line in the recording (402 of their 403 words), each cut is in the quiet between two lines, and the recording was brought up 5 dB, from −21.5 LUFS to the loudness of the other clips (about −16.5), with a limiter so nothing distorts. Their word timings were heard by the recogniser, like every other clip's.

**To give them the one woman's voice later**, once the studio works: `caffeinate -i node tools/vo_studio.mjs vo030 vo031 …` with these ids (`vo030`, `vo031`, `vo032`, `vo035`, `vo052`, `vo054`, `vo071`, `vo126`, `vo128`, `vo134`, `vo150` to `vo152`, `vo316` to `vo365`; given ids, it makes them even though they have clips), then `python3 tools/vo_build.py tools/studio_out/studio.zip`, which replaces these clips. **Another long recording** of several lines goes in the same way: `~/.cache/crown-quest/venv/bin/python tools/vo_split.py recording.mp3 vo030 vo031 …` (the ids in the order they are read; `--check` first, to see that every line is found), then `~/.cache/crown-quest/venv/bin/python tools/vo_build.py tools/split_out/split.zip` (run with the recogniser's Python, so the new clips are timed by ear; the clips wait in `tools/split_out/`, apart from the studio's `tools/studio_out/`).

### 12 more lines, recorded the same way

12 lines the game says were never in the script, so they never had a clip and no list showed them: they came in with the reviews of 2026-11-08 and 2026-11-13 (Level 8's and 9's working, the take-off with the trays, the sort's reworded instruction) and the right-bar-first try of Level 6. They were found on 2026-11-18 (by playing the game through, and by working out every line `js/content.js` can make with the levels' numbers) and added as **vo354** to **vo365**: "Drag the 5 bar to Zippy, then tap Swap.", "The crown and 8 units balance 23 units.", "Trying different values could take a while.", "Drag an 8 bar off each side of the balance.", "Now remove 8 from the other side.", "Drag a 4 bar off each side of the balance.", "Now remove 4 from the other side.", "The two crowns balance 14 units.", "Divide both sides into two equal groups.", "Each crown has a mass of 7 units. So, x = 7.", "Let's check 7." and "Drag each equation into the correct box.". The user recorded them the same day, in the same voice and the same way (one file, `2 (1).mp3`, read in that order), and `tools/vo_split.py` cut it like the first (it heard 92 of their 94 words; +4.8 dB to the game's loudness). Since then every line of the script has a clip.

### The review of 2026-11-18

The review of 13 screenshots changed the check's ending and the practice screen (README, "The check" and "Practice"), which brought 34 new lines (**vo366** to **vo399**):

- **17 made from the user's own recordings, with no new recording** (**vo383** to **vo399**). Each is the opening sentence, word for word, of a line already recorded: "Not quite." (from vo184 "Not quite. Try the other one."), the eight steps practice now says by themselves, such as "Subtract 6 from both sides." (from vo186 "Subtract 6 from both sides. What is 17 − 6?"), and the eight answers it says after a second wrong try, such as "17 − 6 = 11." (from vo188 "17 − 6 = 11. Type 11."). `tools/vo_cut.py` cuts them: the source line's words are timed, so the cut goes in the pause before its next sentence (found by its sound), with a short fade; their `"from"` in `tools/vo_script.json` says which recording each comes from. Then `~/.cache/crown-quest/venv/bin/python tools/vo_build.py tools/split_out/cut.zip`, as for any new clips.
- **17 recorded by the user** (**vo366** to **vo382**), new words: the check's two endings ("Both sides have the same value. The balance is level!" and "The two sides have different values. The balance tips!"), what the value tried is ("So, x = 6 is the solution.", "So, x = 4 is not a solution.", one line per value a child can try: 6, 7, 8 and 15; 4, 5, 8, 9, 10, 12, 23 and 31), and practice's "Now, use what you've learned to solve an equation.", "Find the value of x." and "Not quite! Let's do it together.". The user read them in one recording the same day (`new.mp3`, in the order of `docs/VO_LINES_TO_MAKE.txt`, in the same voice as the rest); `tools/vo_split.py` heard every word of every line (133 of 133), cut it in the quiet between lines and brought it up 3 dB to the game's loudness. (The recording stops right as the last word, "together", fades; the clip's short fade-out finishes it.)
- **No longer said, removed on 2026-11-19** (168 clips, 4.4 MB, with their entries in `tools/vo_script.json`; the last commit that has them is 7f4da8a): the old practice lines (the typed answer's "The left side equals …, so … is not a solution. Let's find x step by step." for every number, "What undoes adding 6?", "Type your answer on the keypad, then tap Check.", the hints with "Type …", the check in the original equation), the check's old one-screen endings ("Both sides equal 9. So, 6 is the solution. Zippy can use the 6-unit bar!", "They're different, so 4 is not a solution." …). They were found by matching every recorded line against every line `js/` can make (a line no text or template in the code can produce is not said), then checked by hand; "A quick recap." (the recap's title plus a full stop) and practice's answers ("17 − 6 = 11." …) stay. vo383 to vo399's `"from"` still names the recording each was cut from, though those lines are gone now: to cut one again, take its source line back from 7f4da8a first.
- **The user's recordings** (`1 (1).mp3`, `2 (1).mp3`, `part 1.mp3` … `part 6 (1).mp3`, `new.mp3`) are not in the game folder since 2026-11-19: they are in the folder `crown quest recordings` beside it (all but `new.mp3` are also in git at 7f4da8a). Give `tools/vo_split.py` the recording's path there.

### The new text of 2026-11-19

The user gave new words for the game's 194 spoken lines (shorter, simpler: "The LHS is 7." for "The left-hand side equals 7.", "Give Zippy the 4-unit bar." for "Give the 4 bar to Zippy." …), and `js/content.js` took them on. Of the lines whose text changed:

- **14 kept their clips**: the words are the same, only the punctuation changed ("Now, let's check 10." → "Now let's check 10.", "So, x = 6 is the solution." → "…solution!", "Wait… this crown…" → "Wait! This crown…"). Their entries in `tools/vo_script.json` have the new text; the clips were timed again by the recogniser.
- **115 recorded again** (their old clips are in git at d398223): new words. Each kept its id with its new text and spoken form. `docs/VO_LINES_TO_MAKE.txt` lists them in game order, in three parts of under 4 minutes each. The user recorded them the same day, in the same voice as the rest (`part 1.mp3`, `part 2.mp3`, `part 3.mp3`, 2:05, 2:26 and 2:39, in the game folder; not the older parts of the same names in `crown quest recordings`), and `tools/vo_split.py` cut each part against its own lines: every line found in order, 855 of 881 words heard (the misses are the recogniser's weak words, such as "weigh" and the letters of L H S), +3.2 dB to the game's loudness (−18.4 LUFS against the other clips' −18.5), no long pauses. Their word timings were heard by the recogniser, like every other clip's.
- **One new line, vo400** "Now try x = 8.": Level 6's next try is now "Now try x = …" and Level 7's "Now let's check …", so "Now, let's check 8.", said in both levels, became two lines (vo107 keeps its clip as Level 7's "Now let's check 8.").

Two lines now differ by level, set in `levels` in `js/content.js` (a third, the win line of Levels 1–3, `win`, went later that day: every crown now has "Woohoo! Zippy got his first crown!" or "…another crown!", below): the next try (`say.nextTry`, above) and the left side's hint (`hintLhs`: Level 8 "Add 15 + 8 to get 23." instead of counting on eight numbers). Every cue that waits for a word was moved to the new words (`CQ.caption.when`; for example the LHS row is written on "LHS", no longer "left-hand"). Level 4's "addition" label now comes on "and" ("x is a variable, and 2 is a constant."), as the line no longer says "We add them together". "Now let's find the crown's mass." was not in the new list (it had "Check the highest power of x." twice instead), so it stays as it was.

**vo401** "Woohoo! Zippy got his first crown!" (2026-11-19, later): Level 1's win line, in place of "Perfect swap! Both weigh 5 units!" (vo014, removed), asked with the words "This voice will come when he got crown first time. Only this voice will come." After Zippy's laugh it is the only voice: in Level 1 he no longer says "Hee hee! Sleep tight, Grumble!" (it was `zippyLine: false` on L1 in `levels` for a moment; since vo402 no crown has that line), and Grumble's snore for that line goes too. The user recorded it themselves, in the same voice as the rest (`Woohoo! Zippy got his first crown!.mp3`, one line, so no cutting): brought up 1.7 dB to the game's loudness (−18.9 LUFS), with the usual short fades and 0.3 s of quiet added at the end (the recording stops 50 ms after "crown"), then `vo_build.py` with the recogniser's Python timed its words by ear.

**vo402** "Woohoo! Zippy got another crown!" (2026-11-19, later): the line after every crown but the first, to the last ("After first time woohoo Zippy got another crown. This sound will come after one stole of crown … Last tak. Only first time Zippy got his first crown"). Asked whether the old lines after a crown stay, the user chose "Woohoo line only": after Zippy's laugh the Woohoo line is the only voice for every crown, so "Perfect! Both weigh 7 units!" and "…4 units!" (Levels 2–3, vo018/vo021), "It worked! Another crown collected, and Grumble's still asleep!" (Level 8, vo146) and Zippy's "Hee hee! Sleep tight, Grumble!" (vo015) were removed with their clips. Which of the two lines is said goes by the crowns Zippy has (`crownLine` in `js/flow.js`, keys `crown-first` / `crown-another` in `js/content.js`): his first crown is Level 1's, also when a level is started from the screens list; Level 9's first crown (the one that flies up) has "another crown" too. On "crown" the crown he wears sparkles. The user recorded it themselves, in the same voice as the rest (`Woohoo! Zippy got another crown!.mp3`, one line): already at the game's loudness (−18.9 LUFS, so no gain), the usual limiter and short fades and 0.3 s of quiet added at the end, then `vo_build.py` with the recogniser's Python heard all 5 words.

**vo403** "Oops! The balance tipped. Try another bar!" (2026-11-19, later): said after every wrong bar, in every level where the child picks one ("When user choose a wrong bar, so this voice will come … Do this in all game"). Levels 1–3: after the alarm and Zippy's return, in place of "Give Zippy a gold bar." (vo012, removed; the "Oops! Too light/heavy!" lines, vo010/vo011, had gone the same day), staying up while the child picks again; after a second miss the hint ("The crown balances … Try the …-unit bar!") follows it. Levels 6–7: in place of "Try another value!" (vo101, removed). Levels 8–9: after "Phew! Good thing we checked!", before the prompt comes back. The user recorded it themselves, in the same voice as the rest (`Oops! The balance tipped. Try another bar!.mp3`, one line): `tools/vo_split.py` heard all 7 words and brought it to the game's loudness (−18.6 LUFS), then `vo_build.py` with the recogniser's Python timed its words by ear.

**"Left-hand side", not "LHS"** (2026-11-19, later; user: "LHS ko left-hand side and RHS ko right-hand side krdo"): every spoken line that named a side by its letters now says it in full. LHS and RHS stay where they are written as names (the working's rows "LHS = 4 + 2 = 6", the labels, "Left-hand side (LHS)") and in the two lines that introduce them ("…is called the left-hand side, or LHS.", vo038 and vo039). 24 lines, keeping their ids: "The left-hand side is 6." … for every value (vo071, vo323, vo325, vo327, vo328, vo330, vo332, vo333, vo335, vo336, vo338, vo339, vo340, vo342, vo344, vo345, vo346, vo348), "Find the left-hand side." (vo134), "Now find the right-hand side." (vo326), "The right-hand side is the number on the right of the equals sign." (vo086), "Now label the left-hand side and right-hand side." (vo320), "4x + 3 is on the left. That's the left-hand side." (vo352) and "19 is on the right. That's the right-hand side." (vo353). **No new recording:** each clip is made from the user's own recordings, the clips of the text before 2026-11-19 (git, d398223: "The left-hand side equals 6.", "Find the value of the left-hand side." …) and that day's ("The L H S is six." …), joined in the pause between two words, mostly in the stop after "side" (−60 to −90 dB), with a 12 ms crossfade, each part brought to the clip's level. Each entry's `"splice"` in `tools/vo_script.json` says what it was joined from. The pauses at the joins (35–115 ms) are those of the recordings themselves (35–185 ms), and the pitch steps across them are the ones the voice makes there anyway. The recogniser, listening freely, heard all 24 as written; loudness −18.3 to −19.3 LUFS, like the rest. vo320 is the old clip unchanged (its words are the same; only its comma went). Then `vo_build.py` with the recogniser's Python timed their words by ear, and every cue that waited for "LHS" or "RHS" now waits for "left-hand" or "right-hand" (the row "LHS =" is written on "left-hand", = on "is", the value on its number). If a join ever sounds wrong, record that line again and cut it with `tools/vo_split.py` (its id as above).

What the 51 lines are, and why they changed:

Four of Level 4's formula-screen lines were reworded on 2026-11-13 at the review's request:

- **vo030** "Let's find x so Zippy can make the swap." (it was "Hmm… let's find the value of x so Zippy can make the swap."), spoken `Let's find x so ज़िप्पी can make the swap.`
- **vo031** "Here, x represents the crown's mass. We need to find its value." (it was "Here, x represents the crown's mass — the value we want to find."), spoken the same.
- **vo032** "Here, x is the variable. Its value is unknown.", spoken the same: the second half of "A variable is a symbol used to represent a value. Here, our variable is x, and its value is unknown.", which became two lines. Its first half, "A variable is a symbol that represents a value.", is the recap's line and already has a clip (vo063), which the game finds by its words.
- **vo035** "Adding x and 2 gives the algebraic expression x + 2." (it was "Joining x and 2 with addition gives the algebraic expression x + 2."), spoken `Adding x and two gives the algebraic expression x plus two.`

Six lines of the label activity (Level 4c) and the formula screen after it, new on 2026-11-13 at the review's request, spoken as shown:
- **vo316** "Now, can you spot these parts in another equation?" (from the formula screen into the activity);
- **vo317** "Drag each label to the matching box." (its instruction; it was "Drag each label to the correct box.", which had no clip either);
- **vo318** "Not quite. x represents the unknown value. It is the variable." and **vo319** "The complete statement is an equation." (said while the game puts Variable and Equation in after a wrong label; they were "Look at x. It represents the unknown value." and "The whole statement, 4x + 3 = 19, is the equation.", which had no clips either);
- **vo320** "Now, label the left-hand side and right-hand side." (into the second pair, and its instruction);
- **vo321** "Let's return to the crown's equation." (from the activity back to the formula screen and x + 2 = 7).

More of the review of 2026-11-13, later that day, spoken as shown with the numbers in words (each spoken form is in `tools/vo_script.json`):
- Level 4's linear equation (4c): **vo052** "The power of x is 1." and **vo322** "We usually leave the 1 unwritten." (they were one line, "When we write x, its power is 1. We usually leave the 1 unwritten."); **vo054** "This is called a linear equation in one variable." (it was "So, it is a linear equation in one variable.").
- Level 4's try (4g), a side at a time: **vo071** "The left-hand side equals 6." (it was "The left side equals 6, and the right side equals 7. They're different, so 4 is not a solution."), **vo323** "The right-hand side equals 7.", **vo324** "They're different, so 4 is not a solution.", **vo325** "The left-hand side equals 7." ("Both sides equal 7." keeps its clip, vo074).
- The check in Levels 5 to 9, a side at a time: **vo134** "Find the value of the left-hand side." (it was "…of the left side."), **vo326** "Now find the value of the right-hand side.", and for each value a child can try, "The left-hand side equals …", "The right-hand side equals …" and "They're different, so … is not a solution." (**vo327** to **vo348**). ("Find the value of each side.", "15 + 8 = 23." and "2 × 7 + 4 = 18." are no longer said; their clips were removed.)
- Level 8: **vo349** "Let's try x = 10." and **vo350** "How about x = 12?" (they replace "Let's try different values of x.", which had no clip); **vo351** "Can we find the crown's mass without guessing?" (it replaces "Let's find the mass of the crown directly.", which had no clip); **vo126** "We can split 23 units into 8 and 15." (it was "First, split 23 into 8 and 15."); **vo128** "Let's remove 8 units from both sides." (it was "To keep the balance level, we must remove 8 units from both sides.").
- Level 9, in a new order: **vo151** "We can split 18 units into 4 and 14." (it was "Split 18 into 4 and 14."), then **vo150** "There are 4 units beside the crowns. Let's see how we can remove them." (it was "First, let's remove these 4 units.", before the split), then **vo152** "Let's remove 4 units from both sides." (it was "Remove 4 from both sides.").

The activity's LHS and RHS lines for a wrong label ("Look to the left of the equal sign. 4x + 3 is the left-hand side." and "Look to the right of the equal sign. 19 is the right-hand side.", from the review of 2026-11-07) went into the script on 2026-11-17 as **vo352** and **vo353** (spoken with "four x plus three" and "nineteen").

A line with no clip (a practice answer far from the right one, above) or a browser that can't play the clips is read by the device's own voice, a woman's when the device has one (`pickVoice` in js/audio.js picks by name, Indian English first: Tara on a Mac, Heera or Neerja on Windows), so it sounds closer to the recorded teacher; a device with no known woman's voice keeps its best English voice.

**The quick way to make lines, when the studio works:** `caffeinate -i node tools/vo_studio.mjs` makes every line that has no clip yet (or `node tools/vo_studio.mjs vo030 vo031` for some), in Female Teacher (Standard), Hindi, through the Single Generation tab. Each clip is kept in `tools/studio_out/` as soon as it is made (a rerun skips those), and at the end they are zipped for `python3 tools/vo_build.py tools/studio_out/studio.zip`. It stops at the first error the studio shows. Then check the clips as above.

## The rate limit

The studio sends every request through its own proxy, which allows **100 requests per 15 minutes per IP address**. Each line takes two requests (the script, then the voice), so at most about 48 lines fit in one 15-minute window. That window is shared with everyone else on the same network, such as an office, so leave some room for others. Over the limit, the proxy answers `429 Too many requests from this IP`.

The studio's Gemini key also has its own per-minute quota, shared by everyone who uses the studio. When it runs out, a row fails with "Resource has been exhausted" for a moment; a retry after about 20 seconds usually works. In the studio, use the row's Retry button or **Retry All Failed**.

In practice: on a quiet morning, 40 lines took about 5 minutes with no failures, and the 15-minute window was the only limit (all 315 lines need about 8 windows, two hours). On a busy afternoon, many rows failed and were retried, and only 15 to 25 lines fitted in a window. Concurrency 1 wastes the fewest requests on failures.

## Conversion

`tools/vo_build.py` turns the studio's MP3s into Ogg Opus, 24 kbps, mono (Opus's speech mode):

- with ffmpeg: `ffmpeg -i voNNN.mp3 -ac 1 -c:a libopus -b:a 24k -application voip voNNN.ogg`;
- without ffmpeg, on any Mac: `afconvert -f caff -d opus -b 24000` makes the Opus packets, and the tool copies them into an Ogg file (RFC 7845) without re-encoding. Ogg Opus counts at 48 kHz even though the clips are 24 kHz, so the tool scales the timing (and the encoder's start-up delay) by 2. The last page ends on the last real sample, so the encoder's padding is cut off.

The tool reads each clip's length from the file itself, works out when each word of its line is said (see "Word timings" below), writes `js/vo_lines.js`, deletes anything in `assets/vo/` that no line uses, rewrites the table below and lists any line that has no clip yet.

## Word timings

So that whatever a line names comes in on screen as the voice says it ("when the VO says 7, 7 should appear": review, 2026-11-16), the game knows when each word of every recorded line is said. `js/vo_lines.js` holds them, per line: `[clip, seconds, [start, end, start, end, …]]`, one start and end (in seconds into the clip) per word of the line as it is shown, split at spaces ("x + 2 = 7" is five words).

`tools/vo_timing.py` works them out, and `tools/vo_build.py` runs it by itself. Results are kept in `tools/vo_timing.json` (by clip, with the clip's size and line), so only new or re-made clips are worked out again.

- **Best: an offline speech recogniser.** [Vosk](https://alphacephei.com/vosk/) hears each clip and says when each word starts and ends, to a few hundredths of a second; its words are then matched to the line's (numbers as words, "LHS" as L H S, "=" as equals…). All 269 clips were timed this way on 2026-11-16 (`"how": "heard"` in `tools/vo_timing.json`). To time new clips the same way, once:

  ```sh
  python3 -m venv ~/.cache/crown-quest/venv && ~/.cache/crown-quest/venv/bin/pip install vosk
  mkdir -p ~/.cache/crown-quest/vosk && cd ~/.cache/crown-quest/vosk
  curl -LO https://alphacephei.com/vosk/models/vosk-model-small-en-in-0.4.zip && unzip vosk-model-small-en-in-0.4.zip
  curl -LO https://alphacephei.com/vosk/models/vosk-model-small-en-us-0.15.zip && unzip vosk-model-small-en-us-0.15.zip
  ```

  then, after `tools/vo_build.py`: `~/.cache/crown-quest/venv/bin/python tools/vo_timing.py` and `python3 tools/vo_build.py` again (it writes the new timings into `js/vo_lines.js`). (`VOSK_MODELS=dir1:dir2` points it at models kept elsewhere.)
- **Without it** the tool cuts each clip by its loudness alone (the pauses at full stops and commas, the dips between words, and how long each word should take by its syllables): good to about half a second (`"how": "loudness"`).
- **To check a clip by eye:** `python3 tools/vo_timing.py vo038` prints its loudness with a mark where each word starts.

**Apple devices get an AAC copy (since 2026-11-20).** Older iPhones, iPads and Macs can't play Ogg Opus, and used to read every line with the device's own voice. Now every `voNNN.ogg` has a `voNNN.m4a` next to it (HE-AAC, 24 kbps, mono, made from the .ogg by `tools/vo_build.py`'s `make_m4a`, so both start and end together and the word timings fit both; 3.1 MB). `js/voice.js` picks `.m4a` on Apple devices (`navigator.vendor` "Apple…": every browser on an iPhone or iPad), `.ogg` everywhere else, the other one if the first won't play, and the device voice only if neither will. Each device fetches only its own copy. Tested: Chromium fetches the .ogg, the Safari engine (WebKit) the .m4a, both play. To remake the copies after changing clips: run `tools/vo_build.py` (it makes any missing or older .m4a).

## How the game uses the clips

- **Found by the text on screen.** `CQ.say` (the caption) and `Zippy.say` (his bubble) pass the exact line they show. `js/vo_lines.js` gives its clip and length. A line without a clip is read by the device voice.
- **One audio element.** Every line plays on the same `<audio>` element. The Play button unlocks it (it plays muted, then pauses), because tablets only play sound that a tap started.
- **The words appear as they are said.** A recorded line types itself into the caption word by word, each word as the voice says it (its word timings, above, against the clip's own clock), its letters coming in over the time the word takes. Its layout and size are set before it types, so nothing jumps. Tapping the words shows the whole line at once, and the voice carries on.
- **Things come on their words.** Whatever a line names waits for the voice to get to it: `CQ.caption.when(line, words)` (js/ui.js) resolves as the voice begins the last of those words (0.08 s ahead, so it has a moment to come in). The formula screen's cues, the check, Levels 8–9's working, the label activity and the recap all use it.
- **Lines with no recording yet** are read by the device voice, which says which word it is on (its word "boundary" events): the caption types along with it and the cues follow it the same way. A device voice that doesn't say where it is is followed by how long its words should take (their syllables), at a speed learnt from the lines it has read. With the voice off, things come about when a voice would have said them.
- **The story waits for the voice.** The game moves on by itself (there is no "tap to continue"). It waits until the line has been heard, then gives a moment to look. If a clip stalls, the game waits at most its remaining length plus 0.6 seconds. The Next button still skips to the next line at once and stops the voice.
- **Stopping.** A new line stops the one before it. So does a chapter jump, a restart, the Next button, hiding the page, or switching Voice off in the menu (Esc).
- **Not said twice.** In Levels 8 and 9, when a wrong bar has been checked, the "Give the … bar to Zippy" instruction comes back on screen without being said again. If the child then does nothing for 8 seconds, it is said again as a reminder, like every reminder in the game.
- **Music and jungle sounds step back** while a voice speaks (music to 20 %, the ambience to 40 %) and come back afterwards.
- **Loading.** On a website, after Play, the game quietly downloads every clip one at a time, in the order they are heard. Opened straight from the folder, the files are already at hand.
- **Address options.** `?vo=0` turns the recordings off (the device voice reads every line); `?vospeed=2` plays them at double speed (0.5 to 4), handy for checking lines quickly.

## Practice's lines

Since 2026-11-18 practice says only fixed lines, so every one of them can have a clip: "Now, use what you've learned to solve an equation." (before the first equation), "Find the value of x." (each equation), "Not quite! Let's do it together." (a wrong first answer), each step ("Subtract 5 from both sides.", "Divide both sides by 3." …), "Not quite." (a wrong step) and, after a second wrong step, its answer ("26 − 5 = 21."). The child picks x from number tiles, so no answer repeats a number the child made up; a right answer is not followed by any line. (Until then a wrong typed answer was repeated back, "The left side equals 14, and the right side equals 17. They're different, so 8 is not a solution. Let's find x step by step.", with clips for the numbers near the right one.)

## Remaking a line

1. Edit the line in `tools/vo_script.json`: `line` must match the text the game shows exactly, and `spoken` is what the voice reads (follow the rules above). For a new line, add an entry with the next free id. The game finds clips by their text, so if you change a line's words in `js/content.js`, change `line` here too.
2. Make it in the studio: an .xlsx with the columns `filename` and `text` (the id and the spoken form), the settings above, then **Download All (.zip)**. You can paste the speaker script the studio shows into the line's `devanagari` field, so the table below stays complete.
3. Run `python3 tools/vo_build.py voiceovers_batch.zip` (several zips: oldest first).

## Every line

<!-- vo-table -->
| Clip | Line as shown | Spoken as | Devanagari sent to the voice | Seconds |
|---|---|---|---|---|
| vo001 | Meet Zippy! He's spotted a golden crown! | = |  | 3.6 |
| vo002 | But Grumble guards the treasure. | = |  | 2.3 |
| vo003 | Luckily, he's asleep! | = | लकली, हीज़ अस्लीप! | 2.3 |
| vo004 | If the balance tips, the alarm will wake him! | = |  | 3.1 |
| vo005 | Let's swap the crown without tipping the balance! | = |  | 2.9 |
| vo006 | Each coin weighs 1 unit. | Each coin weighs one unit. |  | 2.2 |
| vo007 | Which bar should Zippy choose? | = |  | 2.4 |
| vo008 | Drag it to Zippy, then tap Swap. | = | ड्रैग इट टू ज़िप्पी, देन टैप स्वैप। | 2.9 |
| vo009 | Now tap Swap! | = | नाउ टैप स्वैप! | 1.6 |
| vo403 | Oops! The balance tipped. Try another bar! | = |  | 3.7 |
| vo011 | Oops! Too heavy! The balance tipped! | = |  | 3.0 |
| vo010 | Oops! Too light! The balance tipped! | = |  | 3.0 |
| vo012 | Give Zippy a gold bar. | = |  | 1.7 |
| vo405 | The crown balances 5 coins. | The crown balances five coins. |  | 2.5 |
| vo401 | Woohoo! Zippy got his first crown! | Woohoo! ज़िप्पी got his first crown! |  | 3.9 |
| vo016 | Another crown! Let's collect it! | = |  | 2.6 |
| vo406 | The crown balances 7 coins. | The crown balances seven coins. |  | 2.5 |
| vo402 | Woohoo! Zippy got another crown! | Woohoo! ज़िप्पी got another crown! |  | 3.6 |
| vo019 | One more crown! Grumble's still asleep! | = |  | 3.3 |
| vo407 | The crown balances 4 coins. | The crown balances four coins. |  | 2.6 |
| vo022 | Wait! This crown has two coins beside it. | = | वेट... दिस क्राउन हैज टू कॉइन्स बिसाइड इट. | 3.5 |
| vo023 | Together, they balance 7 coins. | Together, they balance seven coins. |  | 2.8 |
| vo024 | But Zippy needs to replace only the crown. | = |  | 2.9 |
| vo025 | How much does the crown weigh? | = |  | 1.8 |
| vo026 | Let's call the crown's mass x. | = | लेट्स कॉल द क्राउन्स मास एक्स। | 3.1 |
| vo027 | Together, the crown and coins weigh x + 2 units. | Together, the crown and coins weigh x plus two units. |  | 4.4 |
| vo028 | They balance 7 units on the other side. | They balance seven units on the other side. | दे बैलेंस सेवन यूनिट्स ऑन द अदर साइड। | 2.8 |
| vo029 | So, x + 2 = 7. | So, x plus two equals seven. |  | 3.1 |
| vo030 | Let's find x to help Zippy swap! | = |  | 2.6 |
| vo031 | Here, x represents the crown's mass. | = |  | 2.8 |
| vo032 | x is our variable. Its value is unknown. | = |  | 3.6 |
| vo033 | x + 2 represents the crown and two coins together. | x plus two represents the crown and two coins together. |  | 3.7 |
| vo034 | x is a variable, and 2 is a constant. | x is a variable, and two is a constant. |  | 3.1 |
| vo035 | Together, they form the algebraic expression x + 2. | Together, they form the algebraic expression x plus two. |  | 4.1 |
| vo036 | The balance shows x + 2 = 7. | The balance shows x plus two equals seven. |  | 3.6 |
| vo037 | Two expressions with equal values make an equation. | = |  | 3.9 |
| vo038 | Left of the equals sign is the left-hand side, or LHS. | Left of the equals sign is the left-hand side, or L H S. |  | 5.4 |
| vo039 | Right of the equals sign is the right-hand side, or RHS. | Right of the equals sign is the right-hand side, or R H S. |  | 5.4 |
| vo418 | Tap the variable. | = |  | 1.8 |
| vo419 | Tap the constant. | = |  | 1.6 |
| vo420 | Tap the expression. | = |  | 2.0 |
| vo050 | Brilliant! You labelled every part! | = | ब्रिलियंट! यू लेबल्ड एव्री पार्ट. | 3.2 |
| vo051 | This equation has one variable, x. | = | दिस इक्वेशन हैज़ वन वेरिएबल: एक्स। | 2.9 |
| vo052 | The power of x is 1. | The power of x is one. |  | 2.8 |
| vo053 | It has one variable with a highest power of 1. | It has one variable with a highest power of one. |  | 3.2 |
| vo054 | This is a linear equation in one variable. | = |  | 3.2 |
| vo058 | Check the highest power of x. | = | चेक द हायेस्ट पावर ऑफ एक्स। | 2.2 |
| vo059 | The highest power of x is 1, so this equation is linear. | The highest power of x is one, so this equation is linear. | द हाइऐस्ट पावर ऑफ एक्स इज़ वन, सो दिस इक्वेशन इज़ लीनियर। | 4.3 |
| vo060 | The highest power of x is 2, so this equation is nonlinear. | The highest power of x is two, so this equation is nonlinear. | द हाइयेस्ट पावर ऑफ एक्स इज टू सो दिस इक्वेशन इज नॉन-लीनियर। | 4.6 |
| vo061 | Great sorting! You found every linear equation. | = | ग्रेट सॉर्टिंग! यू फाउंड एवरी लीनियर इक्वेशन। | 3.7 |
| vo062 | A quick recap. | = | ए क्विक रीकैप। | 1.5 |
| vo063 | A variable is a symbol that represents a value. | = | ए वेरिएबल इज ए सिंबल दैट रिप्रेजेंट्स ए वैल्यू। | 3.0 |
| vo064 | An equation states that two expressions have equal values. | = | एन इक्वेशन स्टेट्स दैट टू एक्सप्रेशन्स हैव इक्वल वैल्यूज़। | 3.5 |
| vo065 | The expression to the left of the equals sign is the left-hand side. | = | द एक्सप्रेशन टू द लेफ्ट ऑफ द इक्वल्स साइन इज द लेफ्ट-हैंड साइड। | 4.9 |
| vo066 | The expression to the right of the equals sign is the right-hand side. | = | द एक्सप्रेशन टू द राइट ऑफ द इक्वल्स साइन इज द राइट-हैंड साइड। | 4.8 |
| vo426 | x^2 means x times x, so its power is 2. | x squared means x times x, so its power is two. |  | 5.3 |
| vo427 | Left of the equals sign is the left-hand side. | = |  | 3.3 |
| vo428 | Right of the equals sign is the right-hand side. | = |  | 3.4 |
| vo067 | Now let's find the crown's mass. | = | नाउ लेट्स फाइंड द क्राउन्स मास। | 2.8 |
| vo068 | We need x to make both sides equal. | = |  | 2.5 |
| vo409 | Let's try x = 4. | Let's try x equals four. |  | 2.6 |
| vo410 | Find the value of each side. | = |  | 2.6 |
| vo071 | The left-hand side is 6. | The left-hand side is six. |  | 2.7 |
| vo421 | Which value should we try? | = |  | 2.1 |
| vo422 | Let's try x = 5. | Let's try x equals five. |  | 2.9 |
| vo423 | Let's try x = 6. | Let's try x equals six. |  | 2.5 |
| vo424 | The left-hand side is 8. | The left-hand side is eight. |  | 1.9 |
| vo425 | So, x = 6 is not a solution. | So, x equals six is not a solution. |  | 3.8 |
| vo411 | A value that makes an equation true is its solution. | = |  | 3.9 |
| vo412 | So, x = 5! | So, x equals five! |  | 2.8 |
| vo076 | The crown weighs 5 units. Zippy can swap it! | The crown weighs five units. Zippy can swap it! |  | 4.2 |
| vo077 | Now Zippy can swap. Tap Swap! | Now ज़िप्पी can swap. Tap Swap! | नाउ ज़िप्पी कैन स्वैप. टैप स्वैप! | 3.0 |
| vo081 (Zippy) | Let's try 4. | Let's try four. | लेट्स ट्राई फोर। | 1.6 |
| vo082 | Give Zippy the 4-unit bar. | Give Zippy the four-unit bar. |  | 2.7 |
| vo083 | Replace x with 4. | Replace x with four. | रिप्लेस एक्स विद फोर। | 2.2 |
| vo085 | Add 4 + 3. Count on: 5, 6, 7. | Add four plus three. Count on: five, six, seven. |  | 5.6 |
| vo086 | The right-hand side is the number on the right of the equals sign. | = |  | 4.4 |
| vo087 (Zippy) | Phew! Good thing we checked! | = | फ़्यू! गुड थिंग वी चेक्ड। | 1.7 |
| vo089 (Zippy) | Now let's try 6. | Now let's try six. | नाउ, लेट्स ट्राई सिक्स। | 1.8 |
| vo091 | Replace x with 6. | Replace x with six. | रिप्लेस एक्स विद सिक्स। | 2.3 |
| vo092 | Add 6 + 3. Count on: 7, 8, 9. | Add six plus three. Count on: seven, eight, nine. |  | 5.6 |
| vo404 | Another crown! Which gold bar will keep the balance level? | = |  | 4.7 |
| vo097 | Let's check 5. | Let's check five. | लेट्स चेक फाइव। | 1.4 |
| vo098 | Replace x with 5 and find the value of each side. | Replace x with five and find the value of each side. | रिप्लेस एक्स विद फाइव एंड फाइंड द वैल्यू ऑफ ईच साइड। | 4.2 |
| vo099 | Add 5 + 4. Count on: 6, 7, 8, 9. | Add five plus four. Count on: six, seven, eight, nine. |  | 6.0 |
| vo102 | Let's check 8. | Let's check eight. | लेट्स चेक एट। | 1.6 |
| vo103 | Replace x with 8 and find the value of each side. | Replace x with eight and find the value of each side. | रिप्लेस एक्स विद ऐट एंड फाइंड द वैल्यू ऑफ ईच साइड। | 4.4 |
| vo104 | Add 8 + 4. Count on: 9, 10, 11, 12. | Add eight plus four. Count on: nine, ten, eleven, twelve. |  | 6.5 |
| vo106 | Now try x = 5. | Now try x equals five. |  | 3.0 |
| vo107 | Now let's check 8. | Now let's check eight. | नाउ लेट्स चेक ऐट। | 2.0 |
| vo400 | Now try x = 8. | Now try x equals eight. |  | 2.4 |
| vo108 | Now try x = 7. | Now try x equals seven. |  | 3.0 |
| vo109 | Add 7 + 4. Count on: 8, 9, 10, 11. | Add seven plus four. Count on: eight, nine, ten, eleven. |  | 6.2 |
| vo113 | Replace x with your value. Compare both sides. | = |  | 4.2 |
| vo114 | Add 10 + 2. Count on: 11, 12. | Add ten plus two. Count on: eleven, twelve. |  | 5.1 |
| vo116 | Add 12 + 2. Count on: 13, 14. | Add twelve plus two. Count on: thirteen, fourteen. |  | 5.2 |
| vo118 | Now let's check 10. | Now let's check ten. | नाउ, लेट्स चेक टेन। | 1.9 |
| vo119 | Add 8 + 2. Count on: 9, 10. | Add eight plus two. Count on: nine, ten. |  | 5.3 |
| vo120 | Now let's check 12. | Now let's check twelve. | नाउ, लेट्स चेक ट्वेल्व। | 2.3 |
| vo121 | Zippy spots another crown! | ज़िप्पी spots another crown! | ज़िप्पी स्पॉट्स अनदर क्राउन! | 2.1 |
| vo126 | Split 23 into 8 and 15. | Split twenty-three into eight and fifteen. |  | 3.9 |
| vo413 | There are 8 extra units beside the crown. | There are eight extra units beside the crown. |  | 3.2 |
| vo414 | Let's remove them. | = |  | 1.6 |
| vo128 | Remove 8 units from both sides. | Remove eight units from both sides. |  | 3.1 |
| vo131 | The crown balances 15 units. So, x = 15! | The crown balances fifteen units. So, x equals fifteen! |  | 6.2 |
| vo132 | Before swapping, let's check the original equation. | = |  | 4.0 |
| vo133 | Replace x with 15. | Replace x with fifteen. | रिप्लेस एक्स विद फिफ्टीन। | 2.3 |
| vo134 | Find the left-hand side. | = |  | 1.7 |
| vo135 | Add 15 + 8 to get 23. | Add fifteen plus eight to get twenty-three. |  | 3.8 |
| vo138 | The crown weighs 15 units. Time to swap! | The crown weighs fifteen units. Time to swap! |  | 4.7 |
| vo140 | Let's check 23. | Let's check twenty-three. | लेट्स चेक ट्वेंटी-थ्री। | 1.8 |
| vo141 | Add 23 + 8 to get 31. | Add twenty-three plus eight to get thirty-one. |  | 4.2 |
| vo143 | Let's check 31. | Let's check thirty-one. | लेट्स चेक थर्टी वन। | 1.8 |
| vo144 | Add 31 + 8 to get 39. | Add thirty-one plus eight to get thirty-nine. |  | 3.9 |
| vo148 | Each crown has the same mass, x. | = | ईच क्राउन हैज द सेम मास, एक्स। | 2.5 |
| vo149 | Two crowns together have a mass of 2x. | Two crowns together have a mass of two x. |  | 3.8 |
| vo415 | There are 4 extra units beside the crowns. | There are four extra units beside the crowns. |  | 3.5 |
| vo151 | Split 18 into 4 and 14. | Split eighteen into four and fourteen. |  | 3.7 |
| vo152 | Remove 4 units from both sides. | Remove four units from both sides. |  | 3.4 |
| vo154 | But what does one crown weigh? | = |  | 2.2 |
| vo157 | Let's check with x = 7. | Let's check with x equals seven. |  | 2.4 |
| vo158 | 2 × 7 = 14. Add 4 to get 18. | Two times seven equals fourteen. Add four to get eighteen. |  | 6.0 |
| vo162 | Let's check 9. | Let's check nine. | लेट्स चेक नाइन। | 1.5 |
| vo163 | 2 × 9 = 18. Add 4 to get 22. | Two times nine equals eighteen. Add four to get twenty-two. |  | 5.5 |
| vo408 | One more crown! | = |  | 1.5 |
| vo416 | You've helped Zippy find the crowns' masses. | = |  | 3.2 |
| vo417 | Now try a few equations! | = |  | 2.1 |
| vo314 | Quest complete! Zippy collected all crowns, and Grumble's still snoring! | = |  | 6.3 |
| vo316 | Can you identify these parts in another equation? | = |  | 2.9 |
| vo317 | Drag each label to the correct box. | = |  | 2.7 |
| vo318 | Not quite! x is the unknown value, so it's the variable. | = |  | 4.3 |
| vo319 | The complete statement is an equation. | = |  | 2.2 |
| vo320 | Now label the left-hand side and right-hand side. | = |  | 4.0 |
| vo321 | Let's return to the crown's equation. | = |  | 1.9 |
| vo322 | We usually leave the power 1 unwritten. | We usually leave the power one unwritten. |  | 2.7 |
| vo323 | The right-hand side is 7. | The right-hand side is seven. |  | 2.8 |
| vo325 | The left-hand side is 7. | The left-hand side is seven. |  | 2.5 |
| vo326 | Now find the right-hand side. | = |  | 2.5 |
| vo327 | The left-hand side is 9. | The left-hand side is nine. |  | 2.5 |
| vo328 | The right-hand side is 9. | The right-hand side is nine. |  | 2.9 |
| vo330 | The left-hand side is 12. | The left-hand side is twelve. |  | 2.4 |
| vo332 | The left-hand side is 11. | The left-hand side is eleven. |  | 2.4 |
| vo333 | The right-hand side is 11. | The right-hand side is eleven. |  | 2.6 |
| vo335 | The left-hand side is 10. | The left-hand side is ten. |  | 2.5 |
| vo336 | The left-hand side is 14. | The left-hand side is fourteen. |  | 2.5 |
| vo338 | The right-hand side is 10. | The right-hand side is ten. |  | 2.0 |
| vo339 | The left-hand side is 23. | The left-hand side is twenty-three. |  | 3.0 |
| vo340 | The left-hand side is 31. | The left-hand side is thirty-one. |  | 2.7 |
| vo342 | The left-hand side is 39. | The left-hand side is thirty-nine. |  | 2.7 |
| vo344 | The right-hand side is 23. | The right-hand side is twenty-three. |  | 2.6 |
| vo345 | The left-hand side is 18. | The left-hand side is eighteen. |  | 2.5 |
| vo346 | The left-hand side is 22. | The left-hand side is twenty-two. |  | 3.1 |
| vo348 | The right-hand side is 18. | The right-hand side is eighteen. |  | 2.4 |
| vo349 | Let's try x = 10. | Let's try x equals ten. |  | 2.3 |
| vo350 | How about x = 12? | How about x equals twelve? |  | 2.3 |
| vo351 | Can we solve this without guessing? | = |  | 2.8 |
| vo352 | 4x + 3 is on the left. That's the left-hand side. | Four x plus three is on the left. That's the left-hand side. |  | 4.1 |
| vo353 | 19 is on the right. That's the right-hand side. | Nineteen is on the right. That's the right-hand side. |  | 3.7 |
| vo355 | The crown and 8 units balance 23 units. | The crown and eight units balance twenty-three units. |  | 4.3 |
| vo356 | Guessing could take a while! | = |  | 1.5 |
| vo357 | Drag an 8-unit bar off each side. | Drag an eight-unit bar off each side. |  | 3.8 |
| vo358 | Now remove 8 from the other side. | Now remove eight from the other side. |  | 3.0 |
| vo359 | Drag a 4-unit bar off each side. | Drag a four-unit bar off each side. |  | 3.6 |
| vo360 | Now remove 4 from the other side. | Now remove four from the other side. |  | 3.3 |
| vo361 | Two crowns balance 14 units. | Two crowns balance fourteen units. |  | 3.0 |
| vo362 | Divide both sides into two equal groups. | = |  | 3.9 |
| vo363 | Each crown weighs 7 units. So, x = 7! | Each crown weighs seven units. So, x equals seven! |  | 5.3 |
| vo364 | Let's check 7. | Let's check seven. |  | 1.2 |
| vo365 | Drag each equation into the correct box. | = |  | 3.7 |
| vo366 | Both sides are equal! The balance stays level! | = |  | 4.5 |
| vo367 | The values differ! The balance tips! | = |  | 2.6 |
| vo368 | So, x = 6 is the solution! | So, x equals six is the solution! |  | 3.4 |
| vo369 | So, x = 7 is the solution! | So, x equals seven is the solution! |  | 3.4 |
| vo370 | So, x = 8 is the solution! | So, x equals eight is the solution! |  | 3.3 |
| vo371 | So, x = 15 is the solution! | So, x equals fifteen is the solution! |  | 3.5 |
| vo372 | So, x = 4 is not a solution. | So, x equals four is not a solution. |  | 3.9 |
| vo373 | So, x = 5 is not a solution. | So, x equals five is not a solution. |  | 3.8 |
| vo374 | So, x = 8 is not a solution. | So, x equals eight is not a solution. |  | 4.2 |
| vo375 | So, x = 9 is not a solution. | So, x equals nine is not a solution. |  | 4.0 |
| vo376 | So, x = 10 is not a solution. | So, x equals ten is not a solution. |  | 3.6 |
| vo377 | So, x = 12 is not a solution. | So, x equals twelve is not a solution. |  | 4.0 |
| vo378 | So, x = 23 is not a solution. | So, x equals twenty-three is not a solution. |  | 4.6 |
| vo379 | So, x = 31 is not a solution. | So, x equals thirty-one is not a solution. |  | 4.4 |
| vo380 | Your turn! Solve an equation. | = |  | 3.4 |
| vo381 | Find the value of x. | = |  | 2.5 |
| vo382 | Not quite! Let's solve it together. | = |  | 3.0 |
| vo383 | Not quite! | = |  | 1.1 |
| vo384 | Subtract 6 from both sides. | Subtract six from both sides. |  | 2.7 |
| vo385 | Subtract 5 from both sides. | Subtract five from both sides. |  | 2.8 |
| vo386 | Divide both sides by 3. | Divide both sides by three. |  | 2.2 |
| vo387 | Add 7 to both sides. | Add seven to both sides. |  | 2.1 |
| vo388 | Multiply both sides by 4. | Multiply both sides by four. |  | 2.6 |
| vo389 | Subtract 7 from both sides. | Subtract seven from both sides. |  | 2.5 |
| vo390 | Divide both sides by 2. | Divide both sides by two. |  | 2.1 |
| vo391 | Subtract 2 from both sides. | Subtract two from both sides. |  | 2.9 |
| vo392 | 17 − 6 = 11. | Seventeen minus six equals eleven. |  | 3.2 |
| vo393 | 26 − 5 = 21. | Twenty-six minus five equals twenty-one. |  | 3.5 |
| vo394 | 21 ÷ 3 = 7. | Twenty-one divided by three equals seven. |  | 3.5 |
| vo395 | 12 + 7 = 19. | Twelve plus seven equals nineteen. |  | 2.9 |
| vo396 | 6 × 4 = 24. | Six times four equals twenty-four. |  | 3.0 |
| vo397 | 1 − 7 = −6. | One minus seven equals minus six. |  | 3.0 |
| vo398 | −6 ÷ 2 = −3. | Minus six divided by two equals minus three. |  | 3.7 |
| vo399 | 7 − 2 = 5. | Seven minus two equals five. |  | 2.8 |
<!-- /vo-table -->
