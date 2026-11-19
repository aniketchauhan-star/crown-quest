# Voice-over

Every line the game shows in its caption bar, and every line Zippy says in his speech bubble, is a recorded clip in `assets/vo/`. Since 2026-11-18 every line, Zippy's too, is in one man's voice, from the user's own recordings: first the 63 lines the studio couldn't make ("The lines from the user's recording", below), then all the rest, recorded in six parts from `docs/VO_RECORD_ALL.txt` and cut by ear the same way (each part's files matched to that part's lines in order). Until then the narrator was the studio's woman teacher (Female Teacher (Standard)) and Zippy a young boy (Male Child (Energetic)); those clips are in the git history (commit 9d2ffad).

| | |
|---|---|
| Clips | `assets/vo/vo001.ogg` … one file per line, Ogg Opus, 24 kbps, mono: 197 clips, 12.4 minutes, 2.4 MB, every line of the script (2026-11-19: the 168 clips of lines the game no longer says were removed with their script entries). On 2026-11-13 every clip was re-encoded from 32 to 24 kbps (speech stays clear; the folder had to be smaller), and the 33 clips of lines the game no longer says were removed with their script entries. |
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

**Older Safari versions** (older iPads and Macs that have not been updated) cannot play Ogg Opus. The game checks (`canPlayType('audio/ogg; codecs="opus"')`), and on those it reads every line with the device's own voice, as it did before it had recordings. No other file format is shipped. Chrome and the Safari engine on an up-to-date Mac both play the clips (tested).

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
| vo001 | Meet Zippy! He spots a golden crown. | = | मीट ज़िप्पी! ही स्पॉट्स अ गोल्डन क्राउन। | 3.5 |
| vo002 | Grumble guards the treasure. | = | ग्रम्बल गार्ड्स द ट्रेजर। | 1.8 |
| vo003 | Luckily, he's asleep! | = | लकली, हीज़ अस्लीप! | 2.3 |
| vo004 | If the balance tips, the alarm will wake Grumble. | = | इफ द बैलेंस टिप्स, द अलार्म विल वेक ग्रम्बल। | 3.1 |
| vo005 | Let's replace the crown with something just as heavy. That will keep the balance level! | = | लेट्स रिप्लेस द क्राउन विद समथिंग जस्ट एज़ हैवी। दैट विल कीप द बैलेंस लेवल! | 5.7 |
| vo006 | Each coin has a mass of 1 unit. | Each coin has a mass of one unit. | ईच कॉइन हैज़ अ मास ऑफ़ वन यूनिट। | 3.2 |
| vo007 | Which bar should Zippy use? | Which bar should ज़िप्पी use? | विच बार शुड ज़िप्पी यूज़? | 2.2 |
| vo008 | Drag it to Zippy, then tap Swap. | = | ड्रैग इट टू ज़िप्पी, देन टैप स्वैप। | 2.9 |
| vo009 | Now tap Swap! | = | नाउ टैप स्वैप! | 1.6 |
| vo010 | Oops! That bar is too light — the balance tipped! | Oops! That bar is too light, the balance tipped! | ऊप्स! दैट बार इज टू लाइट, द बैलेंस टिप्ड! | 3.7 |
| vo011 | Oops! That bar is too heavy — the balance tipped! | Oops! That bar is too heavy, the balance tipped! | उप्स! दैट बार इज़ टू हैवी, द बैलेंस टिप्ड! | 3.2 |
| vo012 | Drag a gold bar to Zippy. | = | ड्रैग ए गोल्ड बार टू ज़िप्पी। | 2.5 |
| vo013 | Each coin is 1 unit. The crown balances 5 coins, so it is 5 units. Try the 5 bar! | Each coin is one unit. The crown balances five coins, so it is five units. Try the five bar! | ईच कॉइन इज़ वन यूनिट। द क्राउन बैलेंसेज़ फाइव कॉइन्स, सो इट इज़ फाइव यूनिट्स। ट्राई द फाइव बार! | 7.7 |
| vo014 | Perfect swap! The crown is 5 units — just like the 5 coins. | Perfect swap! The crown is five units, just like the five coins. | परफेक्ट स्वैप! द क्राउन इज फाइव यूनिट्स, जस्ट लाइक द फाइव कॉइन्स। | 5.4 |
| vo015 (Zippy) | Hee hee! Sleep tight, Grumble! | = | ही ही! स्लीप टाइट, ग्रंबल! | 2.5 |
| vo016 | There's another crown! Let's help Zippy collect it too. | There's another crown! Let's help ज़िप्पी collect it too. | देअर्स अनदर क्राउन! लेट्स हेल्प ज़िप्पी कलेक्ट इट टू। | 4.1 |
| vo017 | Each coin is 1 unit. The crown balances 7 coins, so it is 7 units. Try the 7 bar! | Each coin is one unit. The crown balances seven coins, so it is seven units. Try the seven bar! | ईच कॉइन इज़ वन यूनिट। द क्राउन बैलेंसेज़ सेवन कॉइन्स, सो इट इज़ सेवन यूनिट्स। ट्राई द सेवन बार! | 8.4 |
| vo018 | Perfect swap! The crown is 7 units — just like the 7 coins. | Perfect swap! The crown is seven units, just like the seven coins. | परफेक्ट स्वैप! द क्राउन इज सेवन यूनिट्स, जस्ट लाइक द सेवन कॉइन्स. | 5.2 |
| vo019 | One more crown. Grumble is still asleep! | = | वन मोर क्राउन. ग्रंबल इज़ स्टिल अस्लीप! | 3.5 |
| vo020 | Each coin is 1 unit. The crown balances 4 coins, so it is 4 units. Try the 4 bar! | Each coin is one unit. The crown balances four coins, so it is four units. Try the four bar! | ईच कॉइन इज़ वन यूनिट। द क्राउन बैलेंसेज़ फोर कॉइन्स, सो इट इज़ फोर यूनिट्स। ट्राय द फोर बार! | 8.0 |
| vo021 | Perfect swap! The crown is 4 units — just like the 4 coins. | Perfect swap! The crown is four units, just like the four coins. | परफेक्ट स्वैप! द क्राउन इज़ फोर यूनिट्स, जस्ट लाइक द फोर कॉइन्स। | 4.5 |
| vo022 | Wait… this crown has two coins beside it. | Wait... this crown has two coins beside it. | वेट... दिस क्राउन हैज टू कॉइन्स बिसाइड इट. | 3.5 |
| vo023 | The crown and these two coins together balance seven coins. | = | द क्राउन एंड दीज़ टू कॉइन्स टुगेदर बैलेंस सेवन कॉइन्स। | 4.0 |
| vo024 | But Zippy needs a replacement for just the crown. | But ज़िप्पी needs a replacement for just the crown. | बट ज़िप्पी नीड्स अ रिप्लेसमेंट फॉर जस्ट द क्राउन. | 3.5 |
| vo025 | How can we find the crown's mass? | = | हाउ कैन वी फाइंड द क्राउन्स मास? | 2.1 |
| vo026 | Let's call the crown's mass x. | = | लेट्स कॉल द क्राउन्स मास एक्स। | 3.1 |
| vo027 | The crown and two coins have a total mass of x + 2. | The crown and two coins have a total mass of x plus two. | द क्राउन एंड टू कॉइन्स हैव ए टोटल मास ऑफ एक्स प्लस टू। | 4.4 |
| vo028 | They balance 7 units on the other side. | They balance seven units on the other side. | दे बैलेंस सेवन यूनिट्स ऑन द अदर साइड। | 2.8 |
| vo029 | So, we can write x + 2 = 7. | So, we can write x plus two equals seven. | सो, वी कैन राइट एक्स प्लस टू इक्वल्स सेवन। | 3.9 |
| vo030 | Let's find x so Zippy can make the swap. | Let's find x so ज़िप्पी can make the swap. |  | 3.5 |
| vo031 | Here, x represents the crown's mass. We need to find its value. | = |  | 5.8 |
| vo032 | Here, x is the variable. Its value is unknown. | = |  | 4.4 |
| vo033 | Now look at x + 2. It represents the total mass of the crown and the two coins. | Now look at x plus two. It represents the total mass of the crown and the two coins. | नाउ लुक एट एक्स प्लस टू। इट रिप्रेजेंट्स द टोटल मास ऑफ द क्राउन एंड द टू कॉइन्स। | 5.9 |
| vo034 | Here x is a variable, and 2 is a constant. We add them together. | Here x is a variable, and two is a constant. We add them together. | हीयर एक्स इज ए वैरिएबल, एंड टू इज ए कांस्टेंट। वी ऐड देम टुगेदर। | 5.4 |
| vo035 | Adding x and 2 gives the algebraic expression x + 2. | Adding x and two gives the algebraic expression x plus two. |  | 5.1 |
| vo036 | The balance shows that x + 2 equals 7. | The balance shows that x plus two equals seven. | द बैलेंस शोज दैट एक्स प्लस टू इक्वल्स सेवन। | 3.9 |
| vo037 | A statement that says two expressions have equal values is called an equation. | = | ए स्टेटमेंट दैट सेज़ टू एक्सप्रेशन्स हैव इक्वल वैल्यूज़ इज़ कॉल्ड एन इक्वेशन। | 5.5 |
| vo038 | The expression to the left of the equals sign is called the left-hand side, or LHS. | The expression to the left of the equals sign is called the left-hand side, or L H S. | द एक्सप्रेशन टू द लेफ्ट ऑफ़ द इक्वल्स साइन इज़ कॉल्ड द लेफ्ट हैंड साइड, ऑर एल एच एस। | 6.6 |
| vo039 | The expression to the right of the equals sign is called the right-hand side, or RHS. | The expression to the right of the equals sign is called the right-hand side, ऑर R H S. | दी एक्सप्रेशन टू दी राइट ऑफ दी ईक्वल्स साइन इज़ कॉल्ड दी राइट-हैंड साइड, ऑर आर एच एस। | 6.5 |
| vo050 | Brilliant! You labelled every part. | = | ब्रिलियंट! यू लेबल्ड एव्री पार्ट. | 3.2 |
| vo051 | This equation has one variable: x. | = | दिस इक्वेशन हैज़ वन वेरिएबल: एक्स। | 2.9 |
| vo052 | The power of x is 1. | The power of x is one. |  | 2.8 |
| vo053 | This equation has one variable, and its highest power is 1. | This equation has one variable, and its highest power is one. | दिस इक्वेशन हैज वन वेरिएबल, एंड इट्स हाईएस्ट पावर इज वन। | 4.7 |
| vo054 | This is called a linear equation in one variable. | = |  | 3.9 |
| vo058 | Check the highest power of x. | = | चेक द हायेस्ट पावर ऑफ एक्स। | 2.2 |
| vo059 | The highest power of x is 1, so this equation is linear. | The highest power of x is one, so this equation is linear. | द हाइऐस्ट पावर ऑफ एक्स इज़ वन, सो दिस इक्वेशन इज़ लीनियर। | 4.3 |
| vo060 | The highest power of x is 2, so this equation is nonlinear. | The highest power of x is two, so this equation is nonlinear. | द हाइयेस्ट पावर ऑफ एक्स इज टू सो दिस इक्वेशन इज नॉन-लीनियर। | 4.6 |
| vo061 | Great sorting! You found every linear equation. | = | ग्रेट सॉर्टिंग! यू फाउंड एवरी लीनियर इक्वेशन। | 3.7 |
| vo062 | A quick recap. | = | ए क्विक रीकैप। | 1.5 |
| vo063 | A variable is a symbol that represents a value. | = | ए वेरिएबल इज ए सिंबल दैट रिप्रेजेंट्स ए वैल्यू। | 3.0 |
| vo064 | An equation states that two expressions have equal values. | = | एन इक्वेशन स्टेट्स दैट टू एक्सप्रेशन्स हैव इक्वल वैल्यूज़। | 3.5 |
| vo065 | The expression to the left of the equals sign is the left-hand side. | = | द एक्सप्रेशन टू द लेफ्ट ऑफ द इक्वल्स साइन इज द लेफ्ट-हैंड साइड। | 4.9 |
| vo066 | The expression to the right of the equals sign is the right-hand side. | = | द एक्सप्रेशन टू द राइट ऑफ द इक्वल्स साइन इज द राइट-हैंड साइड। | 4.8 |
| vo067 | Now let's find the crown's mass. | = | नाउ लेट्स फाइंड द क्राउन्स मास। | 2.8 |
| vo068 | We need a value of x that makes both sides equal. | = | वी नीड ए वैल्यू ऑफ एक्स दैट मेक्स बोथ साइड्स इक्वल। | 3.7 |
| vo069 | Let's check 4. Replace x with 4 and find the value of each side. | Let's check four. Replace x with four and find the value of each side. | लेट्स चेक फोर। रिप्लेस एक्स विथ फोर एंड फाइंड द वैल्यू ऑफ़ ईच साइड। | 6.3 |
| vo071 | The left-hand side equals 6. | The left-hand side equals six. |  | 2.2 |
| vo072 | Now, let's check 5. Replace x with 5 and find the value of each side. | Now, let's check five. Replace x with five and find the value of each side. | नाउ, लेट्स चेक फाइव। रिप्लेस एक्स विद फाइव एंड फाइंड द वैल्यू ऑफ ईच साइड। | 6.4 |
| vo075 | A value that makes an equation true is called its solution. So, 5 is the solution. | A value that makes an equation true is called its solution. So, five is the solution. | ए वैल्यू दैट मेक्स एन इक्वेशन ट्रू इज़ कॉल्ड इट्स सोल्यूशन। सो, फाइव इज़ द सोल्यूशन। | 6.9 |
| vo076 | The crown's mass is 5 units. Zippy can use the 5-unit bar! | The crown's mass is five units. ज़िप्पी can use the five-unit bar! | द क्राउन्स मास इज फाइव यूनिट्स। ज़िप्पी कैन यूज़ द फाइव-यूनिट बार! | 5.5 |
| vo077 | Now Zippy can swap. Tap Swap! | Now ज़िप्पी can swap. Tap Swap! | नाउ ज़िप्पी कैन स्वैप. टैप स्वैप! | 3.0 |
| vo081 (Zippy) | Let's try 4. | Let's try four. | लेट्स ट्राई फोर। | 1.6 |
| vo082 | Give the 4 bar to Zippy. | Give the four bar to ज़िप्पी. | गिव द फोर बार टू ज़िप्पी। | 1.1 |
| vo083 | Replace x with 4. | Replace x with four. | रिप्लेस एक्स विद फोर। | 2.2 |
| vo085 | Add: 4 + 3. Count on from 4: 5, 6, 7. | Add: four plus three. Count on from four: five, six, seven. | ऐड: फोर प्लस थ्री। काउंट ऑन फ्रॉम फोर: फाइव, सिक्स, सेवन। | 6.3 |
| vo086 | RHS is the number on the right of =. | R H S is the number on the right of the equals sign. | आर एच एस इज़ द नंबर ऑन द राइट ऑफ द इक्वल्स साइन। | 4.0 |
| vo087 (Zippy) | Phew! Good thing we checked. | = | फ़्यू! गुड थिंग वी चेक्ड। | 1.7 |
| vo089 (Zippy) | Now, let's try 6. | Now, let's try six. | नाउ, लेट्स ट्राई सिक्स। | 1.8 |
| vo090 | Give the 6 bar to Zippy. | Give the six bar to ज़िप्पी. | गिव द सिक्स बार टू ज़िप्पी. | 1.4 |
| vo091 | Replace x with 6. | Replace x with six. | रिप्लेस एक्स विद सिक्स। | 2.3 |
| vo092 | Add: 6 + 3. Count on from 6: 7, 8, 9. | Add: six plus three. Count on from six: seven, eight, nine. | ऐड: सिक्स प्लस थ्री। काउंट ऑन फ्रॉम सिक्स: सेवन, एट, नाइन। | 6.5 |
| vo095 | Choose a value for x. Check whether both sides are equal. | = | चूज़ अ वैल्यू फॉर एक्स। चेक वेदर बोथ साइड्स आर इक्वल। | 4.2 |
| vo097 | Let's check 5. | Let's check five. | लेट्स चेक फाइव। | 1.4 |
| vo098 | Replace x with 5 and find the value of each side. | Replace x with five and find the value of each side. | रिप्लेस एक्स विद फाइव एंड फाइंड द वैल्यू ऑफ ईच साइड। | 4.2 |
| vo099 | Add: 5 + 4. Count on from 5: 6, 7, 8, 9. | Add: five plus four. Count on from five: six, seven, eight, nine. | ऐड: फाइव प्लस फोर। काउंट ऑन फ्रॉम फाइव: सिक्स, सेवन, एइट, नाइन। | 7.4 |
| vo101 | Try another value. | = | ट्राई अनदर वैल्यू. | 1.7 |
| vo102 | Let's check 8. | Let's check eight. | लेट्स चेक एट। | 1.6 |
| vo103 | Replace x with 8 and find the value of each side. | Replace x with eight and find the value of each side. | रिप्लेस एक्स विद ऐट एंड फाइंड द वैल्यू ऑफ ईच साइड। | 4.4 |
| vo104 | Add: 8 + 4. Count on from 8: 9, 10, 11, 12. | Add: eight plus four. Count on from eight: nine, ten, eleven, twelve. | ऐड: एट प्लस फोर। काउंट ऑन फ्रॉम एट: नाइन, टेन, इलेवन, ट्वेल्व। | 7.1 |
| vo106 | Now, let's check 5. | Now, let's check five. | नाउ, लेट्स चेक फाइव। | 1.9 |
| vo107 | Now, let's check 8. | Now, let's check eight. | नाउ लेट्स चेक ऐट। | 2.0 |
| vo108 | Now, let's check 7. | Now, let's check seven. | नाउ, लेट्स चेक सेवन। | 1.9 |
| vo109 | Add: 7 + 4. Count on from 7: 8, 9, 10, 11. | Add: seven plus four. Count on from seven: eight, nine, ten, eleven. | ऐड: सेवन प्लस फोर। काउंट ऑन फ्रॉम सेवन: ऐट, नाइन, टेन, इलेवन। | 7.4 |
| vo111 | Another crown and two coins balance ten coins. Which value of x makes both sides equal? | = | अनदर क्राउन एंड टू कॉइन्स बैलेंस टेन कॉइन्स। विच वैल्यू ऑफ एक्स मेक्स बोथ साइड्स इक्वल? | 7.0 |
| vo113 | Replace x with your chosen value. Then compare the two sides. | = | रिप्लेस एक्स विद योर चोजन वैल्यू। देन कम्पेयर द टू साइड्स। | 5.0 |
| vo114 | Add: 10 + 2. Count on from 10: 11, 12. | Add: ten plus two. Count on from ten: eleven, twelve. | ऐड: टेन प्लस टू. काउंट ऑन फ्रॉम टेन: इलेवन, ट्वेलव. | 6.0 |
| vo116 | Add: 12 + 2. Count on from 12: 13, 14. | Add: twelve plus two. Count on from twelve: thirteen, fourteen. | ऐड: ट्वेल्व प्लस टू. काउंट ऑन फ्रॉम ट्वेल्व: थर्टीन, फोर्टीन. | 6.2 |
| vo118 | Now, let's check 10. | Now, let's check ten. | नाउ, लेट्स चेक टेन। | 1.9 |
| vo119 | Add: 8 + 2. Count on from 8: 9, 10. | Add: eight plus two. Count on from eight: nine, ten. | ऐड: एट प्लस टू। काउंट ऑन फ्रॉम एट: नाइन, टेन। | 5.9 |
| vo120 | Now, let's check 12. | Now, let's check twelve. | नाउ, लेट्स चेक ट्वेल्व। | 2.3 |
| vo121 | Zippy spots another crown! | ज़िप्पी spots another crown! | ज़िप्पी स्पॉट्स अनदर क्राउन! | 2.1 |
| vo126 | We can split 23 units into 8 and 15. | We can split twenty-three units into eight and fifteen. |  | 3.7 |
| vo127 | There are 8 units beside the crown. Let's see how we can remove them. | There are eight units beside the crown. Let's see how we can remove them. | देयर आर एइट यूनिट्स बिसाइड द क्राउन। लेट्स सी हाउ वी कैन रिमूव देम। | 4.4 |
| vo128 | Let's remove 8 units from both sides. | Let's remove eight units from both sides. |  | 3.3 |
| vo131 | Now the crown balances 15 units. So, x = 15. | Now the crown balances fifteen units. So, x equals fifteen. | नाउ द क्राउन बैलेंसिस फिफ्टीन यूनिट्स. सो, एक्स ईक्वल्स फिफ्टीन. | 5.6 |
| vo132 | Before Zippy swaps, let's check the answer in the original equation. | Before ज़िप्पी swaps, let's check the answer in the original equation. | बिफोर ज़िप्पी स्वैप्स, लेट्स चेक द आंसर इन द ओरिजिनल इक्वेशन। | 4.7 |
| vo133 | Replace x with 15. | Replace x with fifteen. | रिप्लेस एक्स विद फिफ्टीन। | 2.3 |
| vo134 | Find the value of the left-hand side. | = |  | 2.6 |
| vo135 | Add: 15 + 8. Count on from 15: 16, 17, 18, 19, 20, 21, 22, 23. | Add: fifteen plus eight. Count on from fifteen: sixteen, seventeen, eighteen, nineteen, twenty, twenty-one, twenty-two, twenty-three. | ऐड: फिफ्टीन प्लस एइट. काउंट ऑन फ्रॉम फिफ्टीन: सिक्सटीन, सेवेंटीन, एटीन, नाइंटीन, ट्वेंटी, ट्वेंटी वन, ट्वेंटी टू, ट्वेंटी थ्री. | 13.0 |
| vo138 | The crown's mass is 15 units. Zippy can use the 15-unit bar! | The crown's mass is fifteen units. ज़िप्पी can use the fifteen-unit bar! | द क्राउन्स मास इज़ फिफ्टीन यूनिट्स। ज़िप्पी कैन यूज़ द फिफ्टीन यूनिट बार! | 5.4 |
| vo139 | Give the 15 bar to Zippy, then tap Swap. | Give the fifteen bar to ज़िप्पी, then tap Swap. | गिव द फिफ्टीन बार टू ज़िप्पी, देन टैप स्वैप। | 3.3 |
| vo140 | Let's check 23. | Let's check twenty-three. | लेट्स चेक ट्वेंटी-थ्री। | 1.8 |
| vo141 | Add: 23 + 8. Count on from 23: 24, 25, 26, 27, 28, 29, 30, 31. | Add: twenty-three plus eight. Count on from twenty-three: twenty-four, twenty-five, twenty-six, twenty-seven, twenty-eight, twenty-nine, thirty, thirty-one. | ऐड: ट्वेंटी-थ्री प्लस एइट। काउंट ऑन फ्रॉम ट्वेंटी-थ्री: ट्वेंटी-फोर, ट्वेंटी-फाइव, ट्वेंटी-सिक्स, ट्वेंटी-सेवन, ट्वेंटी-एइट, ट्वेंटी-नाइन, थर्टी, थर्टी-वन। | 13.2 |
| vo143 | Let's check 31. | Let's check thirty-one. | लेट्स चेक थर्टी वन। | 1.8 |
| vo144 | Add: 31 + 8. Count on from 31: 32, 33, 34, 35, 36, 37, 38, 39. | Add: thirty-one plus eight. Count on from thirty-one: thirty-two, thirty-three, thirty-four, thirty-five, thirty-six, thirty-seven, thirty-eight, thirty-nine. | ऐड: थर्टी-वन प्लस ऐट। काउंट ऑन फ्रॉम थर्टी-वन: थर्टी-टू, थर्टी-थ्री, थर्टी-फोर, थर्टी-फाइव, थर्टी-सिक्स, थर्टी-सेवन, थर्टी-ऐट, थर्टी-नाइन। | 12.9 |
| vo146 | That works! Zippy collects the crown, and Grumble stays asleep. | That works! ज़िप्पी collects the crown, and Grumble stays asleep. | दैट वर्क्स! ज़िप्पी कलेक्ट्स द क्राउन, एंड ग्रंबल स्टेज़ अस्लीप। | 4.7 |
| vo148 | Each crown has the same mass, x. | = | ईच क्राउन हैज द सेम मास, एक्स। | 2.5 |
| vo149 | Two lots of x make 2x. | Two lots of x make two x. | टू लॉट्स ऑफ़ एक्स मेक टू एक्स। | 2.4 |
| vo150 | There are 4 units beside the crowns. Let's see how we can remove them. | There are four units beside the crowns. Let's see how we can remove them. |  | 5.0 |
| vo151 | We can split 18 units into 4 and 14. | We can split eighteen units into four and fourteen. |  | 3.4 |
| vo152 | Let's remove 4 units from both sides. | Let's remove four units from both sides. |  | 3.0 |
| vo154 | We need the mass of one crown. | = | वी नीड द मास ऑफ़ वन क्राउन। | 2.7 |
| vo157 | Let's check. Put 7 in place of x. | Let's check. Put seven in place of x. | लेट्स चेक। पुट सेवन इन प्लेस ऑफ़ एक्स। | 2.9 |
| vo158 | 2 × 7 = 14. Then add 4. | Two times seven equals fourteen. Then add four. | टू टाइम्स सेवन ईक्वल्स फोर्टीन. देन ऐड फोर. | 4.9 |
| vo161 | Give a 7 bar to Zippy, then tap Swap. | Give a seven bar to ज़िप्पी, then tap Swap. | गिव अ सेवन बार टू ज़िप्पी, देन टैप स्वैप। | 3.2 |
| vo162 | Let's check 9. | Let's check nine. | लेट्स चेक नाइन। | 1.5 |
| vo163 | 2 × 9 = 18. Then add 4. | Two times nine equals eighteen. Then add four. | टू टाइम्स नाइन इक्वल्स एटीन। देन एड फोर। | 4.6 |
| vo165 | One more crown! Give the other 7 bar to Zippy. | One more crown! Give the other seven bar to ज़िप्पी. | वन मोर क्राउन! गिव द अदर सेवन बार टू ज़िप्पी। | 3.5 |
| vo166 | You've helped Zippy find the crowns' masses. Let's try a few equations. | You've helped ज़िप्पी find the crowns' masses. Let's try a few equations. | यूव हेल्प्ड ज़िप्पी फाइंड द क्राउन्स मासेस। लेट्स ट्राई अ फ्यू इक्वेशन्स। | 5.1 |
| vo314 | Quest complete! Zippy collected all 10 crowns — and Grumble is still snoring! | Quest complete! ज़िप्पी collected all ten crowns, and Grumble is still snoring! | क्वेस्ट कंप्लीट! ज़िप्पी कलेक्टेड ऑल टेन क्राउन्स, एंड ग्रंबल इज़ स्टिल स्नोरिंग! | 6.7 |
| vo316 | Now, can you spot these parts in another equation? | = |  | 3.8 |
| vo317 | Drag each label to the matching box. | = |  | 2.8 |
| vo318 | Not quite. x represents the unknown value. It is the variable. | = |  | 5.6 |
| vo319 | The complete statement is an equation. | = |  | 2.2 |
| vo320 | Now, label the left-hand side and right-hand side. | = |  | 4.0 |
| vo321 | Let's return to the crown's equation. | = |  | 1.9 |
| vo322 | We usually leave the 1 unwritten. | We usually leave the one unwritten. |  | 2.5 |
| vo323 | The right-hand side equals 7. | The right-hand side equals seven. |  | 2.7 |
| vo325 | The left-hand side equals 7. | The left-hand side equals seven. |  | 2.2 |
| vo326 | Now find the value of the right-hand side. | = |  | 3.1 |
| vo327 | The left-hand side equals 9. | The left-hand side equals nine. |  | 2.2 |
| vo328 | The right-hand side equals 9. | The right-hand side equals nine. |  | 2.6 |
| vo330 | The left-hand side equals 12. | The left-hand side equals twelve. |  | 2.3 |
| vo332 | The left-hand side equals 11. | The left-hand side equals eleven. |  | 2.3 |
| vo333 | The right-hand side equals 11. | The right-hand side equals eleven. |  | 2.7 |
| vo335 | The left-hand side equals 10. | The left-hand side equals ten. |  | 2.5 |
| vo336 | The left-hand side equals 14. | The left-hand side equals fourteen. |  | 2.7 |
| vo338 | The right-hand side equals 10. | The right-hand side equals ten. |  | 2.0 |
| vo339 | The left-hand side equals 23. | The left-hand side equals twenty-three. |  | 3.1 |
| vo340 | The left-hand side equals 31. | The left-hand side equals thirty-one. |  | 2.8 |
| vo342 | The left-hand side equals 39. | The left-hand side equals thirty-nine. |  | 2.6 |
| vo344 | The right-hand side equals 23. | The right-hand side equals twenty-three. |  | 2.8 |
| vo345 | The left-hand side equals 18. | The left-hand side equals eighteen. |  | 2.4 |
| vo346 | The left-hand side equals 22. | The left-hand side equals twenty-two. |  | 3.2 |
| vo348 | The right-hand side equals 18. | The right-hand side equals eighteen. |  | 2.7 |
| vo349 | Let's try x = 10. | Let's try x equals ten. |  | 2.3 |
| vo350 | How about x = 12? | How about x equals twelve? |  | 2.3 |
| vo351 | Can we find the crown's mass without guessing? | = |  | 3.2 |
| vo352 | Look to the left of the equal sign. 4x + 3 is the left-hand side. | Look to the left of the equal sign. Four x plus three is the left-hand side. |  | 5.8 |
| vo353 | Look to the right of the equal sign. 19 is the right-hand side. | Look to the right of the equal sign. Nineteen is the right-hand side. |  | 5.5 |
| vo354 | Drag the 5 bar to Zippy, then tap Swap. | Drag the five bar to ज़िप्पी, then tap Swap. |  | 4.2 |
| vo355 | The crown and 8 units balance 23 units. | The crown and eight units balance twenty-three units. |  | 4.3 |
| vo356 | Trying different values could take a while. | = |  | 2.8 |
| vo357 | Drag an 8 bar off each side of the balance. | Drag an eight bar off each side of the balance. |  | 4.0 |
| vo358 | Now remove 8 from the other side. | Now remove eight from the other side. |  | 3.0 |
| vo359 | Drag a 4 bar off each side of the balance. | Drag a four bar off each side of the balance. |  | 3.8 |
| vo360 | Now remove 4 from the other side. | Now remove four from the other side. |  | 3.3 |
| vo361 | The two crowns balance 14 units. | The two crowns balance fourteen units. |  | 3.0 |
| vo362 | Divide both sides into two equal groups. | = |  | 3.9 |
| vo363 | Each crown has a mass of 7 units. So, x = 7. | Each crown has a mass of seven units. So, x equals seven. |  | 6.1 |
| vo364 | Let's check 7. | Let's check seven. |  | 1.2 |
| vo365 | Drag each equation into the correct box. | = |  | 3.7 |
| vo366 | Both sides have the same value. The balance is level! | = |  | 5.1 |
| vo367 | The two sides have different values. The balance tips! | = |  | 4.6 |
| vo368 | So, x = 6 is the solution. | So, x equals six is the solution. |  | 3.4 |
| vo369 | So, x = 7 is the solution. | So, x equals seven is the solution. |  | 3.4 |
| vo370 | So, x = 8 is the solution. | So, x equals eight is the solution. |  | 3.3 |
| vo371 | So, x = 15 is the solution. | So, x equals fifteen is the solution. |  | 3.5 |
| vo372 | So, x = 4 is not a solution. | So, x equals four is not a solution. |  | 3.9 |
| vo373 | So, x = 5 is not a solution. | So, x equals five is not a solution. |  | 3.8 |
| vo374 | So, x = 8 is not a solution. | So, x equals eight is not a solution. |  | 4.2 |
| vo375 | So, x = 9 is not a solution. | So, x equals nine is not a solution. |  | 4.0 |
| vo376 | So, x = 10 is not a solution. | So, x equals ten is not a solution. |  | 3.6 |
| vo377 | So, x = 12 is not a solution. | So, x equals twelve is not a solution. |  | 4.0 |
| vo378 | So, x = 23 is not a solution. | So, x equals twenty-three is not a solution. |  | 4.6 |
| vo379 | So, x = 31 is not a solution. | So, x equals thirty-one is not a solution. |  | 4.4 |
| vo380 | Now, use what you've learned to solve an equation. | = |  | 3.8 |
| vo381 | Find the value of x. | = |  | 2.5 |
| vo382 | Not quite! Let's do it together. | = |  | 2.0 |
| vo383 | Not quite. | = |  | 1.1 |
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
