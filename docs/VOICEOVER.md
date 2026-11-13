# Voice-over

Every line the game shows in its caption bar, and every line Zippy says in his speech bubble, is a recorded clip in `assets/vo/`. The narrator is a clear North Indian teacher's voice. Zippy has a bright, young boy's voice.

| | |
|---|---|
| Clips | `assets/vo/vo001.ogg` … one file per line, Ogg Opus, 24 kbps, mono: 269 clips, 30.2 minutes, 5.6 MB (49 lines are waiting for the studio: below). On 2026-11-13 every clip was re-encoded from 32 to 24 kbps (speech stays clear; the folder had to be smaller), and the 33 clips of lines the game no longer says were removed with their script entries. |
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

## Waiting for a recording

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

The activity's LHS and RHS lines for a wrong label ("Look to the left of the equal sign. 4x + 3 is the left-hand side." and "Look to the right of the equal sign. 19 is the right-hand side.", from the review of 2026-11-07) are not in the script yet, so they are read by the device voice too.

The studio could not make them that day: every try ended in "Exceeded monthly Gemini API spending cap" (a 402 billing error on the studio's own Gemini account; the lines after vo317 came later that day and were not tried), so until they are made the device voice reads these lines (and what waits for their words comes about when a voice would say them: `onCue` in js/activities.js, and `cueIn` in its label activity). To make one: the studio's *Single Generation* tab, Language Hindi, Voice Female Teacher (Standard), Format .MP3, the file name (`vo030`, `vo031`, `vo032`, `vo035`, `vo052`, `vo054`, `vo071`, `vo126`, `vo128`, `vo134`, `vo150` to `vo152`, `vo316` to `vo351`; `python3 tools/vo_build.py` lists them all) and its spoken form as the text; put the MP3s in a zip and run `python3 tools/vo_build.py that.zip`, then check their pauses as above.

## The rate limit

The studio sends every request through its own proxy, which allows **100 requests per 15 minutes per IP address**. Each line takes two requests (the script, then the voice), so at most about 48 lines fit in one 15-minute window. That window is shared with everyone else on the same network, such as an office, so leave some room for others. Over the limit, the proxy answers `429 Too many requests from this IP`.

The studio's Gemini key also has its own per-minute quota, shared by everyone who uses the studio. When it runs out, a row fails with "Resource has been exhausted" for a moment; a retry after about 20 seconds usually works. In the studio, use the row's Retry button or **Retry All Failed**.

In practice: on a quiet morning, 40 lines took about 5 minutes with no failures, and the 15-minute window was the only limit (all 315 lines need about 8 windows, two hours). On a busy afternoon, many rows failed and were retried, and only 15 to 25 lines fitted in a window. Concurrency 1 wastes the fewest requests on failures.

## Conversion

`tools/vo_build.py` turns the studio's MP3s into Ogg Opus, 24 kbps, mono (Opus's speech mode):

- with ffmpeg: `ffmpeg -i voNNN.mp3 -ac 1 -c:a libopus -b:a 24k -application voip voNNN.ogg`;
- without ffmpeg, on any Mac: `afconvert -f caff -d opus -b 24000` makes the Opus packets, and the tool copies them into an Ogg file (RFC 7845) without re-encoding. Ogg Opus counts at 48 kHz even though the clips are 24 kHz, so the tool scales the timing (and the encoder's start-up delay) by 2. The last page ends on the last real sample, so the encoder's padding is cut off.

The tool reads each clip's length from the file itself, writes `js/vo_lines.js`, deletes anything in `assets/vo/` that no line uses, rewrites the table below and lists any line that has no clip yet.

**Older Safari versions** (older iPads and Macs that have not been updated) cannot play Ogg Opus. The game checks (`canPlayType('audio/ogg; codecs="opus"')`), and on those it reads every line with the device's own voice, as it did before it had recordings. No other file format is shipped. Chrome and the Safari engine on an up-to-date Mac both play the clips (tested).

## How the game uses the clips

- **Found by the text on screen.** `CQ.say` (the caption) and `Zippy.say` (his bubble) pass the exact line they show. `js/vo_lines.js` gives its clip and length. A line without a clip is read by the device voice.
- **One audio element.** Every line plays on the same `<audio>` element. The Play button unlocks it (it plays muted, then pauses), because tablets only play sound that a tap started.
- **The words appear as they are said.** A recorded line types itself into the caption, letter by letter, at the voice's pace: each letter takes max(16, (seconds − 0.35) × 1000 ÷ letters) ms, so the last letter appears just as the voice says the last word. Its layout and size are set before it types, so nothing jumps. Tapping the words shows the whole line at once, and the voice carries on.
- **The story waits for the voice.** The game moves on by itself (there is no "tap to continue"). It waits until the line has been heard, then gives a moment to look. If a clip stalls, the game waits at most its remaining length plus 0.6 seconds. The Next button still skips to the next line at once and stops the voice.
- **Stopping.** A new line stops the one before it. So does a chapter jump, a restart, the Next button, hiding the page, or switching Voice off in the menu (Esc).
- **Not said twice.** In Levels 8 and 9, when a wrong bar has been checked, the "Give the … bar to Zippy" instruction comes back on screen without being said again. If the child then does nothing for 8 seconds, it is said again as a reminder, like every reminder in the game.
- **Music and jungle sounds step back** while a voice speaks (music to 20 %, the ambience to 40 %) and come back afterwards.
- **Loading.** On a website, after Play, the game quietly downloads every clip one at a time, in the order they are heard. Opened straight from the folder, the files are already at hand.
- **Address options.** `?vo=0` turns the recordings off (the device voice reads every line); `?vospeed=2` plays them at double speed (0.5 to 4), handy for checking lines quickly.

## Practice: the wrong-answer line

When a child's practice answer is wrong, the line repeats the number they typed: "The left side equals 14, and the right side equals 17. They're different, so 8 is not a solution. Let's find x step by step." Any number can be typed, so not every one can have a clip. Clips exist for every whole number up to 6 away from the right answer, and for the usual mistakes (for x + 6 = 17, also 23; for 3x + 5 = 26, 21 and 31; for x − 7 = 12, 5, 7 and 12; for x ÷ 4 = 6, 2, 4, 6 and 10; for 2x + 7 = 1, 4, 6 and 8; for 3(x + 2) = 21, 19 and 21). Any other number is read by the device voice. To add one, add its line to `tools/vo_script.json` (copy a neighbour and change the numbers) and make it as below.

## Remaking a line

1. Edit the line in `tools/vo_script.json`: `line` must match the text the game shows exactly, and `spoken` is what the voice reads (follow the rules above). For a new line, add an entry with the next free id. The game finds clips by their text, so if you change a line's words in `js/content.js`, change `line` here too.
2. Make it in the studio: an .xlsx with the columns `filename` and `text` (the id and the spoken form), the settings above, then **Download All (.zip)**. You can paste the speaker script the studio shows into the line's `devanagari` field, so the table below stays complete.
3. Run `python3 tools/vo_build.py voiceovers_batch.zip` (several zips: oldest first).

## Every line

<!-- vo-table -->
| Clip | Line as shown | Spoken as | Devanagari sent to the voice | Seconds |
|---|---|---|---|---|
| vo001 | Meet Zippy! He spots a golden crown. | = | मीट ज़िप्पी! ही स्पॉट्स अ गोल्डन क्राउन। | 4.3 |
| vo002 | Grumble guards the treasure. | = | ग्रम्बल गार्ड्स द ट्रेजर। | 2.4 |
| vo003 | Luckily, he's asleep! | = | लकली, हीज़ अस्लीप! | 2.6 |
| vo004 | If the balance tips, the alarm will wake Grumble. | = | इफ द बैलेंस टिप्स, द अलार्म विल वेक ग्रम्बल। | 4.0 |
| vo005 | Let's replace the crown with something just as heavy. That will keep the balance level! | = | लेट्स रिप्लेस द क्राउन विद समथिंग जस्ट एज़ हैवी। दैट विल कीप द बैलेंस लेवल! | 5.6 |
| vo006 | Each coin has a mass of 1 unit. | Each coin has a mass of one unit. | ईच कॉइन हैज़ अ मास ऑफ़ वन यूनिट। | 3.0 |
| vo007 | Which bar should Zippy use? | Which bar should ज़िप्पी use? | विच बार शुड ज़िप्पी यूज़? | 2.3 |
| vo008 | Drag it to Zippy, then tap Swap. | = | ड्रैग इट टू ज़िप्पी, देन टैप स्वैप। | 3.5 |
| vo009 | Now tap Swap! | = | नाउ टैप स्वैप! | 2.3 |
| vo010 | Oops! That bar is too light — the balance tipped! | Oops! That bar is too light, the balance tipped! | ऊप्स! दैट बार इज टू लाइट, द बैलेंस टिप्ड! | 4.2 |
| vo011 | Oops! That bar is too heavy — the balance tipped! | Oops! That bar is too heavy, the balance tipped! | उप्स! दैट बार इज़ टू हैवी, द बैलेंस टिप्ड! | 3.9 |
| vo012 | Drag a gold bar to Zippy. | = | ड्रैग ए गोल्ड बार टू ज़िप्पी। | 2.6 |
| vo013 | Each coin is 1 unit. The crown balances 5 coins, so it is 5 units. Try the 5 bar! | Each coin is one unit. The crown balances five coins, so it is five units. Try the five bar! | ईच कॉइन इज़ वन यूनिट। द क्राउन बैलेंसेज़ फाइव कॉइन्स, सो इट इज़ फाइव यूनिट्स। ट्राई द फाइव बार! | 7.8 |
| vo014 | Perfect swap! The crown is 5 units — just like the 5 coins. | Perfect swap! The crown is five units, just like the five coins. | परफेक्ट स्वैप! द क्राउन इज फाइव यूनिट्स, जस्ट लाइक द फाइव कॉइन्स। | 5.0 |
| vo015 (Zippy) | Hee hee! Sleep tight, Grumble! | = | ही ही! स्लीप टाइट, ग्रंबल! | 3.5 |
| vo016 | There's another crown! Let's help Zippy collect it too. | There's another crown! Let's help ज़िप्पी collect it too. | देअर्स अनदर क्राउन! लेट्स हेल्प ज़िप्पी कलेक्ट इट टू। | 4.5 |
| vo017 | Each coin is 1 unit. The crown balances 7 coins, so it is 7 units. Try the 7 bar! | Each coin is one unit. The crown balances seven coins, so it is seven units. Try the seven bar! | ईच कॉइन इज़ वन यूनिट। द क्राउन बैलेंसेज़ सेवन कॉइन्स, सो इट इज़ सेवन यूनिट्स। ट्राई द सेवन बार! | 8.7 |
| vo018 | Perfect swap! The crown is 7 units — just like the 7 coins. | Perfect swap! The crown is seven units, just like the seven coins. | परफेक्ट स्वैप! द क्राउन इज सेवन यूनिट्स, जस्ट लाइक द सेवन कॉइन्स. | 5.3 |
| vo019 | One more crown. Grumble is still asleep! | = | वन मोर क्राउन. ग्रंबल इज़ स्टिल अस्लीप! | 4.6 |
| vo020 | Each coin is 1 unit. The crown balances 4 coins, so it is 4 units. Try the 4 bar! | Each coin is one unit. The crown balances four coins, so it is four units. Try the four bar! | ईच कॉइन इज़ वन यूनिट। द क्राउन बैलेंसेज़ फोर कॉइन्स, सो इट इज़ फोर यूनिट्स। ट्राय द फोर बार! | 7.8 |
| vo021 | Perfect swap! The crown is 4 units — just like the 4 coins. | Perfect swap! The crown is four units, just like the four coins. | परफेक्ट स्वैप! द क्राउन इज़ फोर यूनिट्स, जस्ट लाइक द फोर कॉइन्स। | 5.1 |
| vo022 | Wait… this crown has two coins beside it. | Wait... this crown has two coins beside it. | वेट... दिस क्राउन हैज टू कॉइन्स बिसाइड इट. | 3.6 |
| vo023 | The crown and these two coins together balance seven coins. | = | द क्राउन एंड दीज़ टू कॉइन्स टुगेदर बैलेंस सेवन कॉइन्स। | 5.4 |
| vo024 | But Zippy needs a replacement for just the crown. | But ज़िप्पी needs a replacement for just the crown. | बट ज़िप्पी नीड्स अ रिप्लेसमेंट फॉर जस्ट द क्राउन. | 3.8 |
| vo025 | How can we find the crown's mass? | = | हाउ कैन वी फाइंड द क्राउन्स मास? | 2.7 |
| vo026 | Let's call the crown's mass x. | = | लेट्स कॉल द क्राउन्स मास एक्स। | 3.4 |
| vo027 | The crown and two coins have a total mass of x + 2. | The crown and two coins have a total mass of x plus two. | द क्राउन एंड टू कॉइन्स हैव ए टोटल मास ऑफ एक्स प्लस टू। | 5.9 |
| vo028 | They balance 7 units on the other side. | They balance seven units on the other side. | दे बैलेंस सेवन यूनिट्स ऑन द अदर साइड। | 3.3 |
| vo029 | So, we can write x + 2 = 7. | So, we can write x plus two equals seven. | सो, वी कैन राइट एक्स प्लस टू इक्वल्स सेवन। | 4.2 |
| vo030 | Let's find x so Zippy can make the swap. | Let's find x so ज़िप्पी can make the swap. |  | no clip yet |
| vo031 | Here, x represents the crown's mass. We need to find its value. | = |  | no clip yet |
| vo032 | Here, x is the variable. Its value is unknown. | = |  | no clip yet |
| vo033 | Now look at x + 2. It represents the total mass of the crown and the two coins. | Now look at x plus two. It represents the total mass of the crown and the two coins. | नाउ लुक एट एक्स प्लस टू। इट रिप्रेजेंट्स द टोटल मास ऑफ द क्राउन एंड द टू कॉइन्स। | 6.5 |
| vo034 | Here x is a variable, and 2 is a constant. We add them together. | Here x is a variable, and two is a constant. We add them together. | हीयर एक्स इज ए वैरिएबल, एंड टू इज ए कांस्टेंट। वी ऐड देम टुगेदर। | 6.2 |
| vo035 | Adding x and 2 gives the algebraic expression x + 2. | Adding x and two gives the algebraic expression x plus two. |  | no clip yet |
| vo036 | The balance shows that x + 2 equals 7. | The balance shows that x plus two equals seven. | द बैलेंस शोज दैट एक्स प्लस टू इक्वल्स सेवन। | 4.1 |
| vo037 | A statement that says two expressions have equal values is called an equation. | = | ए स्टेटमेंट दैट सेज़ टू एक्सप्रेशन्स हैव इक्वल वैल्यूज़ इज़ कॉल्ड एन इक्वेशन। | 6.2 |
| vo038 | The expression to the left of the equals sign is called the left-hand side, or LHS. | The expression to the left of the equals sign is called the left-hand side, or L H S. | द एक्सप्रेशन टू द लेफ्ट ऑफ़ द इक्वल्स साइन इज़ कॉल्ड द लेफ्ट हैंड साइड, ऑर एल एच एस। | 7.2 |
| vo039 | The expression to the right of the equals sign is called the right-hand side, or RHS. | The expression to the right of the equals sign is called the right-hand side, ऑर R H S. | दी एक्सप्रेशन टू दी राइट ऑफ दी ईक्वल्स साइन इज़ कॉल्ड दी राइट-हैंड साइड, ऑर आर एच एस। | 6.4 |
| vo050 | Brilliant! You labelled every part. | = | ब्रिलियंट! यू लेबल्ड एव्री पार्ट. | 3.3 |
| vo051 | This equation has one variable: x. | = | दिस इक्वेशन हैज़ वन वेरिएबल: एक्स। | 3.9 |
| vo052 | The power of x is 1. | The power of x is one. |  | no clip yet |
| vo053 | This equation has one variable, and its highest power is 1. | This equation has one variable, and its highest power is one. | दिस इक्वेशन हैज वन वेरिएबल, एंड इट्स हाईएस्ट पावर इज वन। | 5.0 |
| vo054 | This is called a linear equation in one variable. | = |  | no clip yet |
| vo058 | Check the highest power of x. | = | चेक द हायेस्ट पावर ऑफ एक्स। | 2.7 |
| vo059 | The highest power of x is 1, so this equation is linear. | The highest power of x is one, so this equation is linear. | द हाइऐस्ट पावर ऑफ एक्स इज़ वन, सो दिस इक्वेशन इज़ लीनियर। | 4.9 |
| vo060 | The highest power of x is 2, so this equation is nonlinear. | The highest power of x is two, so this equation is nonlinear. | द हाइयेस्ट पावर ऑफ एक्स इज टू सो दिस इक्वेशन इज नॉन-लीनियर। | 5.4 |
| vo061 | Great sorting! You found every linear equation. | = | ग्रेट सॉर्टिंग! यू फाउंड एवरी लीनियर इक्वेशन। | 4.4 |
| vo062 | A quick recap. | = | ए क्विक रीकैप। | 1.8 |
| vo063 | A variable is a symbol that represents a value. | = | ए वेरिएबल इज ए सिंबल दैट रिप्रेजेंट्स ए वैल्यू। | 4.2 |
| vo064 | An equation states that two expressions have equal values. | = | एन इक्वेशन स्टेट्स दैट टू एक्सप्रेशन्स हैव इक्वल वैल्यूज़। | 4.3 |
| vo065 | The expression to the left of the equals sign is the left-hand side. | = | द एक्सप्रेशन टू द लेफ्ट ऑफ द इक्वल्स साइन इज द लेफ्ट-हैंड साइड। | 5.0 |
| vo066 | The expression to the right of the equals sign is the right-hand side. | = | द एक्सप्रेशन टू द राइट ऑफ द इक्वल्स साइन इज द राइट-हैंड साइड। | 4.6 |
| vo067 | Now let's find the crown's mass. | = | नाउ लेट्स फाइंड द क्राउन्स मास। | 2.9 |
| vo068 | We need a value of x that makes both sides equal. | = | वी नीड ए वैल्यू ऑफ एक्स दैट मेक्स बोथ साइड्स इक्वल। | 4.4 |
| vo069 | Let's check 4. Replace x with 4 and find the value of each side. | Let's check four. Replace x with four and find the value of each side. | लेट्स चेक फोर। रिप्लेस एक्स विथ फोर एंड फाइंड द वैल्यू ऑफ़ ईच साइड। | 5.7 |
| vo071 | The left-hand side equals 6. | The left-hand side equals six. |  | no clip yet |
| vo072 | Now, let's check 5. Replace x with 5 and find the value of each side. | Now, let's check five. Replace x with five and find the value of each side. | नाउ, लेट्स चेक फाइव। रिप्लेस एक्स विद फाइव एंड फाइंड द वैल्यू ऑफ ईच साइड। | 6.6 |
| vo074 | Both sides equal 7. | Both sides equal seven. | बोथ साइड्स इक्वल सेवन। | 2.7 |
| vo075 | A value that makes an equation true is called its solution. So, 5 is the solution. | A value that makes an equation true is called its solution. So, five is the solution. | ए वैल्यू दैट मेक्स एन इक्वेशन ट्रू इज़ कॉल्ड इट्स सोल्यूशन। सो, फाइव इज़ द सोल्यूशन। | 7.2 |
| vo076 | The crown's mass is 5 units. Zippy can use the 5-unit bar! | The crown's mass is five units. ज़िप्पी can use the five-unit bar! | द क्राउन्स मास इज फाइव यूनिट्स। ज़िप्पी कैन यूज़ द फाइव-यूनिट बार! | 6.3 |
| vo077 | Now Zippy can swap. Tap Swap! | Now ज़िप्पी can swap. Tap Swap! | नाउ ज़िप्पी कैन स्वैप. टैप स्वैप! | 4.0 |
| vo081 (Zippy) | Let's try 4. | Let's try four. | लेट्स ट्राई फोर। | 1.9 |
| vo082 | Give the 4 bar to Zippy. | Give the four bar to ज़िप्पी. | गिव द फोर बार टू ज़िप्पी। | 2.2 |
| vo083 | Replace x with 4. | Replace x with four. | रिप्लेस एक्स विद फोर। | 3.0 |
| vo085 | Add: 4 + 3. Count on from 4: 5, 6, 7. | Add: four plus three. Count on from four: five, six, seven. | ऐड: फोर प्लस थ्री। काउंट ऑन फ्रॉम फोर: फाइव, सिक्स, सेवन। | 8.8 |
| vo086 | RHS is the number on the right of =. | R H S is the number on the right of the equals sign. | आर एच एस इज़ द नंबर ऑन द राइट ऑफ द इक्वल्स साइन। | 4.0 |
| vo087 (Zippy) | Phew! Good thing we checked. | = | फ़्यू! गुड थिंग वी चेक्ड। | 2.6 |
| vo089 (Zippy) | Now, let's try 6. | Now, let's try six. | नाउ, लेट्स ट्राई सिक्स। | 2.6 |
| vo090 | Give the 6 bar to Zippy. | Give the six bar to ज़िप्पी. | गिव द सिक्स बार टू ज़िप्पी. | 2.4 |
| vo091 | Replace x with 6. | Replace x with six. | रिप्लेस एक्स विद सिक्स। | 3.1 |
| vo092 | Add: 6 + 3. Count on from 6: 7, 8, 9. | Add: six plus three. Count on from six: seven, eight, nine. | ऐड: सिक्स प्लस थ्री। काउंट ऑन फ्रॉम सिक्स: सेवन, एट, नाइन। | 7.6 |
| vo093 | Both sides equal 9. So, 6 is the solution. Zippy can use the 6-unit bar! | Both sides equal nine. So, six is the solution. ज़िप्पी can use the six-unit bar! | बोथ साइड्स इक्वल नाइन। सो, सिक्स इज द सोल्यूशन। ज़िप्पी कैन यूज़ द सिक्स-यूनिट बार! | 7.7 |
| vo095 | Choose a value for x. Check whether both sides are equal. | = | चूज़ अ वैल्यू फॉर एक्स। चेक वेदर बोथ साइड्स आर इक्वल। | 4.5 |
| vo096 | Both sides equal 11. So, 7 is the solution. | Both sides equal eleven. So, seven is the solution. | बोथ साइड्स इक्वल इलेवन। सो, सेवन इज द सलूशन। | 5.3 |
| vo097 | Let's check 5. | Let's check five. | लेट्स चेक फाइव। | 1.7 |
| vo098 | Replace x with 5 and find the value of each side. | Replace x with five and find the value of each side. | रिप्लेस एक्स विद फाइव एंड फाइंड द वैल्यू ऑफ ईच साइड। | 4.9 |
| vo099 | Add: 5 + 4. Count on from 5: 6, 7, 8, 9. | Add: five plus four. Count on from five: six, seven, eight, nine. | ऐड: फाइव प्लस फोर। काउंट ऑन फ्रॉम फाइव: सिक्स, सेवन, एइट, नाइन। | 8.9 |
| vo100 | The left side equals 9, and the right side equals 11. They're different, so 5 is not a solution. | The left side equals nine, and the right side equals eleven. They're different, so five is not a solution. | द लेफ्ट साइड इक्वल्स नाइन, एंड द राइट साइड इक्वल्स इलेवन। देआर डिफरेंट, सो फाइव इज नॉट अ सलूशन। | 8.0 |
| vo101 | Try another value. | = | ट्राई अनदर वैल्यू. | 2.0 |
| vo102 | Let's check 8. | Let's check eight. | लेट्स चेक एट। | 1.9 |
| vo103 | Replace x with 8 and find the value of each side. | Replace x with eight and find the value of each side. | रिप्लेस एक्स विद ऐट एंड फाइंड द वैल्यू ऑफ ईच साइड। | 4.8 |
| vo104 | Add: 8 + 4. Count on from 8: 9, 10, 11, 12. | Add: eight plus four. Count on from eight: nine, ten, eleven, twelve. | ऐड: एट प्लस फोर। काउंट ऑन फ्रॉम एट: नाइन, टेन, इलेवन, ट्वेल्व। | 9.7 |
| vo105 | The left side equals 12, and the right side equals 11. They're different, so 8 is not a solution. | The left side equals twelve, and the right side equals eleven. They're different, so eight is not a solution. | द लेफ्ट साइड इक्वल्स ट्वेल्व, एंड द राइट साइड इक्वल्स इलेवन. दे आर डिफरेंट, सो ऐट इज नॉट अ सोल्यूशन. | 8.3 |
| vo106 | Now, let's check 5. | Now, let's check five. | नाउ, लेट्स चेक फाइव। | 2.1 |
| vo107 | Now, let's check 8. | Now, let's check eight. | नाउ लेट्स चेक ऐट। | 1.9 |
| vo108 | Now, let's check 7. | Now, let's check seven. | नाउ, लेट्स चेक सेवन। | 2.9 |
| vo109 | Add: 7 + 4. Count on from 7: 8, 9, 10, 11. | Add: seven plus four. Count on from seven: eight, nine, ten, eleven. | ऐड: सेवन प्लस फोर। काउंट ऑन फ्रॉम सेवन: ऐट, नाइन, टेन, इलेवन। | 7.8 |
| vo110 | Both sides equal 11. Zippy can use the 7-unit bar! | Both sides equal eleven. ज़िप्पी can use the seven-unit bar! | बोथ साइड्स इक्वल इलेवन। ज़िप्पी कैन यूज़ द सेवन-यूनिट बार। | 4.8 |
| vo111 | Another crown and two coins balance ten coins. Which value of x makes both sides equal? | = | अनदर क्राउन एंड टू कॉइन्स बैलेंस टेन कॉइन्स। विच वैल्यू ऑफ एक्स मेक्स बोथ साइड्स इक्वल? | 8.5 |
| vo112 | Both sides equal 10. So, 8 is the solution. | Both sides equal ten. So, eight is the solution. | बोथ साइड्स इक्वल टेन। सो, एट इज द सोल्यूशन। | 4.3 |
| vo113 | Replace x with your chosen value. Then compare the two sides. | = | रिप्लेस एक्स विद योर चोजन वैल्यू। देन कम्पेयर द टू साइड्स। | 5.4 |
| vo114 | Add: 10 + 2. Count on from 10: 11, 12. | Add: ten plus two. Count on from ten: eleven, twelve. | ऐड: टेन प्लस टू. काउंट ऑन फ्रॉम टेन: इलेवन, ट्वेलव. | 6.2 |
| vo115 | The left side equals 12, and the right side equals 10. They're different, so 10 is not a solution. | The left side equals twelve, and the right side equals ten. They're different, so ten is not a solution. | द लेफ्ट साइड इक्वल्स ट्वेल्व, एंड द राइट साइड इक्वल्स टेन। दे आर डिफरेंट, सो टेन इज़ नॉट अ सॉल्यूशन। | 7.7 |
| vo116 | Add: 12 + 2. Count on from 12: 13, 14. | Add: twelve plus two. Count on from twelve: thirteen, fourteen. | ऐड: ट्वेल्व प्लस टू. काउंट ऑन फ्रॉम ट्वेल्व: थर्टीन, फोर्टीन. | 8.5 |
| vo117 | The left side equals 14, and the right side equals 10. They're different, so 12 is not a solution. | The left side equals fourteen, and the right side equals ten. They're different, so twelve is not a solution. | द लेफ्ट साइड इक्वल्स फ़ोर्टीन, एंड द राइट साइड इक्वल्स टेन। दे आर डिफरेंट, सो ट्वेल्व इज़ नॉट अ सलूशन। | 7.4 |
| vo118 | Now, let's check 10. | Now, let's check ten. | नाउ, लेट्स चेक टेन। | 2.4 |
| vo119 | Add: 8 + 2. Count on from 8: 9, 10. | Add: eight plus two. Count on from eight: nine, ten. | ऐड: एट प्लस टू। काउंट ऑन फ्रॉम एट: नाइन, टेन। | 6.5 |
| vo120 | Now, let's check 12. | Now, let's check twelve. | नाउ, लेट्स चेक ट्वेल्व। | 2.7 |
| vo121 | Zippy spots another crown! | ज़िप्पी spots another crown! | ज़िप्पी स्पॉट्स अनदर क्राउन! | 3.2 |
| vo126 | We can split 23 units into 8 and 15. | We can split twenty-three units into eight and fifteen. |  | no clip yet |
| vo127 | There are 8 units beside the crown. Let's see how we can remove them. | There are eight units beside the crown. Let's see how we can remove them. | देयर आर एइट यूनिट्स बिसाइड द क्राउन। लेट्स सी हाउ वी कैन रिमूव देम। | 5.2 |
| vo128 | Let's remove 8 units from both sides. | Let's remove eight units from both sides. |  | no clip yet |
| vo131 | Now the crown balances 15 units. So, x = 15. | Now the crown balances fifteen units. So, x equals fifteen. | नाउ द क्राउन बैलेंसिस फिफ्टीन यूनिट्स. सो, एक्स ईक्वल्स फिफ्टीन. | 5.5 |
| vo132 | Before Zippy swaps, let's check the answer in the original equation. | Before ज़िप्पी swaps, let's check the answer in the original equation. | बिफोर ज़िप्पी स्वैप्स, लेट्स चेक द आंसर इन द ओरिजिनल इक्वेशन। | 4.9 |
| vo133 | Replace x with 15. | Replace x with fifteen. | रिप्लेस एक्स विद फिफ्टीन। | 2.9 |
| vo134 | Find the value of the left-hand side. | = |  | no clip yet |
| vo135 | Add: 15 + 8. Count on from 15: 16, 17, 18, 19, 20, 21, 22, 23. | Add: fifteen plus eight. Count on from fifteen: sixteen, seventeen, eighteen, nineteen, twenty, twenty-one, twenty-two, twenty-three. | ऐड: फिफ्टीन प्लस एइट. काउंट ऑन फ्रॉम फिफ्टीन: सिक्सटीन, सेवेंटीन, एटीन, नाइंटीन, ट्वेंटी, ट्वेंटी वन, ट्वेंटी टू, ट्वेंटी थ्री. | 13.3 |
| vo137 | Both sides equal 23. So, 15 is the solution. | Both sides equal twenty-three. So, fifteen is the solution. | बोथ साइड्स इक्वल ट्वेंटी-थ्री। सो, फिफ्टीन इज द सलूशन। | 4.8 |
| vo138 | The crown's mass is 15 units. Zippy can use the 15-unit bar! | The crown's mass is fifteen units. ज़िप्पी can use the fifteen-unit bar! | द क्राउन्स मास इज़ फिफ्टीन यूनिट्स। ज़िप्पी कैन यूज़ द फिफ्टीन यूनिट बार! | 5.9 |
| vo139 | Give the 15 bar to Zippy, then tap Swap. | Give the fifteen bar to ज़िप्पी, then tap Swap. | गिव द फिफ्टीन बार टू ज़िप्पी, देन टैप स्वैप। | 3.9 |
| vo140 | Let's check 23. | Let's check twenty-three. | लेट्स चेक ट्वेंटी-थ्री। | 2.1 |
| vo141 | Add: 23 + 8. Count on from 23: 24, 25, 26, 27, 28, 29, 30, 31. | Add: twenty-three plus eight. Count on from twenty-three: twenty-four, twenty-five, twenty-six, twenty-seven, twenty-eight, twenty-nine, thirty, thirty-one. | ऐड: ट्वेंटी-थ्री प्लस एइट। काउंट ऑन फ्रॉम ट्वेंटी-थ्री: ट्वेंटी-फोर, ट्वेंटी-फाइव, ट्वेंटी-सिक्स, ट्वेंटी-सेवन, ट्वेंटी-एइट, ट्वेंटी-नाइन, थर्टी, थर्टी-वन। | 14.8 |
| vo142 | The left side equals 31, and the right side equals 23. They're different, so 23 is not a solution. | The left side equals thirty-one, and the right side equals twenty-three. They're different, so twenty-three is not a solution. | द लेफ्ट साइड इक्वल्स थर्टी वन, एंड द राइट साइड इक्वल्स ट्वेंटी थ्री। देयर डिफरेंट, सो ट्वेंटी थ्री इज़ नॉट अ सोल्यूशन। | 8.7 |
| vo143 | Let's check 31. | Let's check thirty-one. | लेट्स चेक थर्टी वन। | 2.9 |
| vo144 | Add: 31 + 8. Count on from 31: 32, 33, 34, 35, 36, 37, 38, 39. | Add: thirty-one plus eight. Count on from thirty-one: thirty-two, thirty-three, thirty-four, thirty-five, thirty-six, thirty-seven, thirty-eight, thirty-nine. | ऐड: थर्टी-वन प्लस ऐट। काउंट ऑन फ्रॉम थर्टी-वन: थर्टी-टू, थर्टी-थ्री, थर्टी-फोर, थर्टी-फाइव, थर्टी-सिक्स, थर्टी-सेवन, थर्टी-ऐट, थर्टी-नाइन। | 14.8 |
| vo145 | The left side equals 39, and the right side equals 23. They're different, so 31 is not a solution. | The left side equals thirty-nine, and the right side equals twenty-three. They're different, so thirty-one is not a solution. | द लेफ्ट साइड इक्वल्स थर्टी नाइन, एंड द राइट साइड इक्वल्स ट्वेंटी थ्री। देआर डिफरेंट, सो थर्टी वन इज नॉट अ सॉल्यूशन। | 8.7 |
| vo146 | That works! Zippy collects the crown, and Grumble stays asleep. | That works! ज़िप्पी collects the crown, and Grumble stays asleep. | दैट वर्क्स! ज़िप्पी कलेक्ट्स द क्राउन, एंड ग्रंबल स्टेज़ अस्लीप। | 5.2 |
| vo148 | Each crown has the same mass, x. | = | ईच क्राउन हैज द सेम मास, एक्स। | 3.5 |
| vo149 | Two lots of x make 2x. | Two lots of x make two x. | टू लॉट्स ऑफ़ एक्स मेक टू एक्स। | 2.8 |
| vo150 | There are 4 units beside the crowns. Let's see how we can remove them. | There are four units beside the crowns. Let's see how we can remove them. |  | no clip yet |
| vo151 | We can split 18 units into 4 and 14. | We can split eighteen units into four and fourteen. |  | no clip yet |
| vo152 | Let's remove 4 units from both sides. | Let's remove four units from both sides. |  | no clip yet |
| vo154 | We need the mass of one crown. | = | वी नीड द मास ऑफ़ वन क्राउन। | 2.8 |
| vo157 | Let's check. Put 7 in place of x. | Let's check. Put seven in place of x. | लेट्स चेक। पुट सेवन इन प्लेस ऑफ़ एक्स। | 3.3 |
| vo158 | 2 × 7 = 14. Then add 4. | Two times seven equals fourteen. Then add four. | टू टाइम्स सेवन ईक्वल्स फोर्टीन. देन ऐड फोर. | 4.2 |
| vo160 | Both sides equal 18! Zippy can make the swap. | Both sides equal eighteen! ज़िप्पी can make the swap. | बोथ साइड्स इक्वल एटीन! ज़िप्पी कैन मेक द स्वैप। | 4.3 |
| vo161 | Give a 7 bar to Zippy, then tap Swap. | Give a seven bar to ज़िप्पी, then tap Swap. | गिव अ सेवन बार टू ज़िप्पी, देन टैप स्वैप। | 3.2 |
| vo162 | Let's check 9. | Let's check nine. | लेट्स चेक नाइन। | 2.5 |
| vo163 | 2 × 9 = 18. Then add 4. | Two times nine equals eighteen. Then add four. | टू टाइम्स नाइन इक्वल्स एटीन। देन एड फोर। | 4.9 |
| vo164 | The left side equals 22, and the right side equals 18. They're different, so 9 is not a solution. | The left side equals twenty-two, and the right side equals eighteen. They're different, so nine is not a solution. | द लेफ्ट साइड इक्वल्स ट्वेंटी टू एंड द राइट साइड इक्वल्स एटीन। दे आर डिफरेंट सो नाइन इज नॉट ए सोल्यूशन। | 8.3 |
| vo165 | One more crown! Give the other 7 bar to Zippy. | One more crown! Give the other seven bar to ज़िप्पी. | वन मोर क्राउन! गिव द अदर सेवन बार टू ज़िप्पी। | 4.4 |
| vo166 | You've helped Zippy find the crowns' masses. Let's try a few equations. | You've helped ज़िप्पी find the crowns' masses. Let's try a few equations. | यूव हेल्प्ड ज़िप्पी फाइंड द क्राउन्स मासेस। लेट्स ट्राई अ फ्यू इक्वेशन्स। | 5.9 |
| vo167 | Find x: x + 6 = 17. | Find x: x plus six equals seventeen. | फाइंड एक्स एक्स प्लस सिक्स इक्वल्स सेवेन्टीन | 5.0 |
| vo168 | Type your answer on the keypad, then tap Check. | = | टाइप योर आंसर ऑन द कीपैड, देन टैप चेक। | 4.0 |
| vo169 | Both sides equal 17. So, 11 is the solution. | Both sides equal seventeen. So, eleven is the solution. | बोथ साइड्स इक्वल सेवेन्टीन। सो, इलेवन इज द सोल्यूशन। | 4.4 |
| vo170 | The left side equals 11, and the right side equals 17. They're different, so 5 is not a solution. Let's find x step by step. | The left side equals eleven, and the right side equals seventeen. They're different, so five is not a solution. Let's find x step by step. | द लेफ्ट साइड ईक्वल्स इलेवन, एंड द राइट साइड ईक्वल्स सेवेनटीन. देअर डिफरेंट, सो फाइव इज नॉट अ सोल्यूशन. लेट्स फाइंड एक्स स्टेप बाय स्टेप. | 10.1 |
| vo171 | The left side equals 12, and the right side equals 17. They're different, so 6 is not a solution. Let's find x step by step. | The left side equals twelve, and the right side equals seventeen. They're different, so six is not a solution. Let's find x step by step. | द लेफ्ट साइड इक्वल्स ट्वेल्व, एंड द राइट साइड इक्वल्स सेवेन्टीन। दियर डिफरेंट, सो सिक्स इज नॉट अ सोल्यूशन। लेट्स फाइंड एक्स स्टेप बाय स्टेप। | 9.9 |
| vo172 | The left side equals 13, and the right side equals 17. They're different, so 7 is not a solution. Let's find x step by step. | The left side equals thirteen, and the right side equals seventeen. They're different, so seven is not a solution. Let's find x step by step. | द लेफ्ट साइड इक्वल्स थर्टीन, एंड द राइट साइड इक्वल्स सेवेनटीन। देअर डिफरेंट, सो सेवन इज नॉट अ सोल्यूशन। लेट्स फाइंड एक्स स्टेप बाई स्टेप। | 9.7 |
| vo173 | The left side equals 14, and the right side equals 17. They're different, so 8 is not a solution. Let's find x step by step. | The left side equals fourteen, and the right side equals seventeen. They're different, so eight is not a solution. Let's find x step by step. | द लेफ्ट साइड इक्वल्स फोर्टीन, एंड द राइट साइड इक्वल्स सेवेन्टीन। देयर डिफरेंट, सो एट इज नॉट ए सोल्यूशन। लेट्स फाइंड एक्स स्टेप बाय स्टेप। | 11.1 |
| vo174 | The left side equals 15, and the right side equals 17. They're different, so 9 is not a solution. Let's find x step by step. | The left side equals fifteen, and the right side equals seventeen. They're different, so nine is not a solution. Let's find x step by step. | द लेफ्ट साइड इक्वल्स फिफ्टीन, एंड द राइट साइड इक्वल्स सेवेन्टीन। देअर डिफरेंट, सो नाइन इज नॉट अ सोल्यूशन। लेट्स फाइंड एक्स स्टेप बाई स्टेप। | 10.3 |
| vo175 | The left side equals 16, and the right side equals 17. They're different, so 10 is not a solution. Let's find x step by step. | The left side equals sixteen, and the right side equals seventeen. They're different, so ten is not a solution. Let's find x step by step. | द लेफ्ट साइड ईक्वल्स सिक्सटीन, एंड द राइट साइड ईक्वल्स सेवेनटीन। दे आर डिफरेंट, सो टेन इज नॉट अ सॉल्यूशन। लेट्स फाइंड एक्स स्टेप बाय स्टेप। | 10.6 |
| vo176 | The left side equals 18, and the right side equals 17. They're different, so 12 is not a solution. Let's find x step by step. | The left side equals eighteen, and the right side equals seventeen. They're different, so twelve is not a solution. Let's find x step by step. | द लेफ्ट साइड इक्वल्स एटीन, एंड द राइट साइड इक्वल्स सेवेन्टीन। दे आर डिफरेंट, सो ट्वेल्व इज नॉट ए सोल्यूशन। लेट्स फाइंड एक्स स्टेप बाई स्टेप। | 10.2 |
| vo177 | The left side equals 19, and the right side equals 17. They're different, so 13 is not a solution. Let's find x step by step. | The left side equals nineteen, and the right side equals seventeen. They're different, so thirteen is not a solution. Let's find x step by step. | द लेफ्ट साइड इक्वल्स नाइनटीन, एंड द राइट साइड इक्वल्स सेवेंटीन। देयर डिफरेंट, सो थर्टीन इज नॉट अ सोल्यूशन। लेट्स फाइंड एक्स स्टेप बाय स्टेप। | 11.0 |
| vo178 | The left side equals 20, and the right side equals 17. They're different, so 14 is not a solution. Let's find x step by step. | The left side equals twenty, and the right side equals seventeen. They're different, so fourteen is not a solution. Let's find x step by step. | द लेफ्ट साइड इक्वल्स ट्वेंटी, एंड द राइट साइड इक्वल्स सेवेंटीन। देयर डिफरेंट, सो फोर्टीन इज नॉट अ सलूशन। लेट्स फाइंड एक्स स्टेप बाय स्टेप। | 10.8 |
| vo179 | The left side equals 21, and the right side equals 17. They're different, so 15 is not a solution. Let's find x step by step. | The left side equals twenty-one, and the right side equals seventeen. They're different, so fifteen is not a solution. Let's find x step by step. | द लेफ्ट साइड इक्वल्स ट्वेंटी वन, एंड द राइट साइड इक्वल्स सेवेनटीन। देयर डिफरेंट, सो फिफ्टीन इज नॉट अ सलूशन। लेट्स फाइंड एक्स स्टेप बाय स्टेप। | 10.8 |
| vo180 | The left side equals 22, and the right side equals 17. They're different, so 16 is not a solution. Let's find x step by step. | The left side equals twenty-two, and the right side equals seventeen. They're different, so sixteen is not a solution. Let's find x step by step. | द लेफ्ट साइड इक्वल्स ट्वेंटी टू, एंड द राइट साइड इक्वल्स सेवेन्टीन। देयर डिफरेंट, सो सिक्सटीन इज नॉट ए सोल्यूशन। लेट्स फाइंड एक्स स्टेप बाई स्टेप। | 11.2 |
| vo181 | The left side equals 23, and the right side equals 17. They're different, so 17 is not a solution. Let's find x step by step. | The left side equals twenty-three, and the right side equals seventeen. They're different, so seventeen is not a solution. Let's find x step by step. | द लेफ्ट साइड इक्वल्स ट्वेंटी थ्री एंड द राइट साइड इक्वल्स सेवेन्टीन। देयर डिफरेंट सो सेवेन्टीन इज नॉट ए सोल्यूशन। लेट्स फाइंड एक्स स्टेप बाय स्टेप। | 9.6 |
| vo182 | The left side equals 29, and the right side equals 17. They're different, so 23 is not a solution. Let's find x step by step. | The left side equals twenty-nine, and the right side equals seventeen. They're different, so twenty-three is not a solution. Let's find x step by step. | द लेफ्ट साइड इक्वल्स ट्वेंटी-नाइन, एंड द राइट साइड इक्वल्स सेवेंटीन। देअर डिफरेंट, सो ट्वेंटी-थ्री इज़ नॉट अ सोल्यूशन। लेट्स फाइंड एक्स स्टेप बाय स्टेप। | 10.1 |
| vo183 | What undoes adding 6? | What undoes adding six? | वॉट अनडज़ एडिंग सिक्स? | 2.7 |
| vo184 | Not quite. Try the other one. | = | नॉट क्वाइट। ट्राई द अदर वन। | 2.8 |
| vo185 | Yes! Subtracting 6 undoes adding 6. | Yes! Subtracting six undoes adding six. | येस! सबट्रैक्टिंग सिक्स अनडज़ ऐडिंग सिक्स। | 4.5 |
| vo186 | Subtract 6 from both sides. What is 17 − 6? | Subtract six from both sides. What is seventeen minus six? | सबट्रैक्ट सिक्स फ्रॉम बोथ साइड्स। व्हाट इज सेवेंटीन माइनस सिक्स? | 5.3 |
| vo187 | Not quite. Work out 17 − 6. | Not quite. Work out seventeen minus six. | नॉट क्वाइट। वर्क आउट सेवेनटीन माइनस सिक्स। | 4.2 |
| vo188 | 17 − 6 = 11. Type 11. | Seventeen minus six equals eleven. Type eleven. | सेवेन्टीन माइनस सिक्स इक्वल्स इलेवन। टाइप इलेवन। | 4.6 |
| vo189 | Now check in the original equation. Put 11 in place of x. | Now check in the original equation. Put eleven in place of x. | नाउ चेक इन द ओरिजिनल इक्वेशन। पुट इलेवन इन प्लेस ऑफ एक्स। | 4.7 |
| vo190 | Not quite. Work out 11 + 6. | Not quite. Work out eleven plus six. | नॉट क्वाइट। वर्क आउट इलेवन प्लस सिक्स। | 4.0 |
| vo191 | Both sides are equal. Your solution works! | = | बोथ साइड्स आर इक्वल। योर सॉल्यूशन वर्क्स! | 3.6 |
| vo192 | Find x: 3x + 5 = 26. | Find x: three x plus five equals twenty-six. | फाइंड एक्स: थ्री एक्स प्लस फाइव इक्वल्स ट्वेन्टी सिक्स | 3.9 |
| vo193 | Both sides equal 26. So, 7 is the solution. | Both sides equal twenty-six. So, seven is the solution. | बोथ साइड्स इक्वल ट्वेंटी-सिक्स। सो, सेवन इज़ द सोल्यूशन। | 5.0 |
| vo194 | The left side equals 8, and the right side equals 26. They're different, so 1 is not a solution. Let's find x step by step. | The left side equals eight, and the right side equals twenty-six. They're different, so one is not a solution. Let's find x step by step. | द लेफ्ट साइड ईक्वल्स एट, एंड द राइट साइड ईक्वल्स ट्वेंटी सिक्स। देआर डिफरेंट, सो वन इज़ नॉट अ सोल्यूशन। लेट्स फाइंड एक्स स्टेप बाई स्टेप। | 11.4 |
| vo195 | The left side equals 11, and the right side equals 26. They're different, so 2 is not a solution. Let's find x step by step. | The left side equals eleven, and the right side equals twenty-six. They're different, so two is not a solution. Let's find x step by step. | द लेफ्ट साइड ईक्वल्स इलेवन, एंड द राइट साइड ईक्वल्स ट्वेंटी सिक्स। दे आर डिफरेंट, सो टू इज नॉट अ सोल्यूशन। लेट्स फाइंड एक्स स्टेप बाई स्टेप। | 10.0 |
| vo196 | The left side equals 14, and the right side equals 26. They're different, so 3 is not a solution. Let's find x step by step. | The left side equals fourteen, and the right side equals twenty-six. They're different, so three is not a solution. Let's find x step by step. | द लेफ्ट साइड इक्वल्स फोर्टीन, एंड द राइट साइड इक्वल्स ट्वेन्टी-सिक्स। देयर डिफरेंट, सो थ्री इज नॉट अ सोल्यूशन। लेट्स फाइंड एक्स स्टेप बाय स्टेप। | 10.5 |
| vo197 | The left side equals 17, and the right side equals 26. They're different, so 4 is not a solution. Let's find x step by step. | The left side equals seventeen, and the right side equals twenty-six. They're different, so four is not a solution. Let's find x step by step. | द लेफ्ट साइड इक्वल्स सेवेनटीन, एंड द राइट साइड इक्वल्स ट्वेंटी सिक्स। देयर डिफरेंट, सो फोर इज नॉट अ सॉल्यूशन। लेट्स फाइंड एक्स स्टेप बाई स्टेप। | 10.7 |
| vo198 | The left side equals 20, and the right side equals 26. They're different, so 5 is not a solution. Let's find x step by step. | The left side equals twenty, and the right side equals twenty-six. They're different, so five is not a solution. Let's find x step by step. | द लेफ्ट साइड इक्वल्स ट्वेंटी, एंड द राइट साइड इक्वल्स ट्वेंटी-सिक्स. दे आर डिफरेंट, सो फाइव इज नॉट अ सॉल्यूशन. लेट्स फाइंड एक्स स्टेप बाय स्टेप. | 11.0 |
| vo199 | The left side equals 23, and the right side equals 26. They're different, so 6 is not a solution. Let's find x step by step. | The left side equals twenty-three, and the right side equals twenty-six. They're different, so six is not a solution. Let's find x step by step. | द लेफ्ट साइड इक्वल्स ट्वेंटी-थ्री, एंड द राइट साइड इक्वल्स ट्वेंटी-सिक्स। दे आर डिफरेंट, सो सिक्स इज नॉट अ सोल्यूशन। लेट्स फाइंड एक्स स्टेप बाई स्टेप। | 11.1 |
| vo200 | The left side equals 29, and the right side equals 26. They're different, so 8 is not a solution. Let's find x step by step. | The left side equals twenty-nine, and the right side equals twenty-six. They're different, so eight is not a solution. Let's find x step by step. | द लेफ्ट साइड इक्वल्स ट्वेंटी नाइन, एंड द राइट साइड इक्वल्स ट्वेंटी सिक्स। दे आर डिफरेंट, सो ऐट इज नॉट अ सोल्यूशन। लेट्स फाइंड एक्स स्टेप बाई स्टेप। | 10.5 |
| vo201 | The left side equals 32, and the right side equals 26. They're different, so 9 is not a solution. Let's find x step by step. | The left side equals thirty-two, and the right side equals twenty-six. They're different, so nine is not a solution. Let's find x step by step. | द लेफ्ट साइड इक्वल्स थर्टी-टू, एंड द राइट साइड इक्वल्स ट्वेंटी-सिक्स. दे आर डिफरेंट, सो नाइन इज नॉट अ सोल्यूशन. लेट्स फाइंड एक्स स्टेप बाय स्टेप. | 10.3 |
| vo202 | The left side equals 35, and the right side equals 26. They're different, so 10 is not a solution. Let's find x step by step. | The left side equals thirty-five, and the right side equals twenty-six. They're different, so ten is not a solution. Let's find x step by step. | द लेफ्ट साइड इक्वल्स थर्टी-फाइव, एंड द राइट साइड इक्वल्स ट्वेंटी-सिक्स। दे आर डिफरेंट, सो टेन इज़ नॉट अ सोल्यूशन। लेट्स फाइंड एक्स स्टेप बाई स्टेप। | 11.2 |
| vo203 | The left side equals 38, and the right side equals 26. They're different, so 11 is not a solution. Let's find x step by step. | The left side equals thirty-eight, and the right side equals twenty-six. They're different, so eleven is not a solution. Let's find x step by step. | द लेफ्ट साइड इक्वल्स थर्टी ऐट, एंड द राइट साइड इक्वल्स ट्वेन्टी सिक्स. दे आर डिफरेंट, सो इलेवन इज नॉट अ सोल्यूशन. लेट्स फाइंड एक्स स्टेप बाय स्टेप. | 11.0 |
| vo204 | The left side equals 41, and the right side equals 26. They're different, so 12 is not a solution. Let's find x step by step. | The left side equals forty-one, and the right side equals twenty-six. They're different, so twelve is not a solution. Let's find x step by step. | द लेफ्ट साइड ईक्वल्स फोर्टी वन, एंड द राइट साइड ईक्वल्स ट्वेंटी सिक्स। दे आर डिफरेंट, सो ट्वेल्व इज नॉट अ सोल्यूशन। लेट्स फाइंड एक्स स्टेप बाई स्टेप। | 10.6 |
| vo205 | The left side equals 44, and the right side equals 26. They're different, so 13 is not a solution. Let's find x step by step. | The left side equals forty-four, and the right side equals twenty-six. They're different, so thirteen is not a solution. Let's find x step by step. | द लेफ्ट साइड इक्वल्स फोर्टी-फोर, एंड द राइट साइड इक्वल्स ट्वेंटी-सिक्स। देयर डिफरेंट, सो थर्टीन इज़ नॉट अ सॉल्यूशन। लेट्स फाइंड एक्स स्टेप बाय स्टेप। | 10.6 |
| vo206 | The left side equals 68, and the right side equals 26. They're different, so 21 is not a solution. Let's find x step by step. | The left side equals sixty-eight, and the right side equals twenty-six. They're different, so twenty-one is not a solution. Let's find x step by step. | द लेफ्ट साइड इक्वल्स सिक्सटी-ऐट, एंड द राइट साइड इक्वल्स ट्वेंटी-सिक्स। देयर डिफरेंट, सो ट्वेंटी-वन इज नॉट अ सोल्यूशन। लेट्स फाइंड एक्स स्टेप बाय स्टेप। | 11.5 |
| vo207 | The left side equals 98, and the right side equals 26. They're different, so 31 is not a solution. Let's find x step by step. | The left side equals ninety-eight, and the right side equals twenty-six. They're different, so thirty-one is not a solution. Let's find x step by step. | द लेफ्ट साइड ईक्वल्स नाइन्टी ऐट एंड द राइट साइड ईक्वल्स ट्वेंटी सिक्स। देयर डिफरेंट सो थर्टी वन इज नॉट अ सोल्यूशन। लेट्स फाइंड एक्स स्टेप बाय स्टेप। | 11.0 |
| vo208 | What undoes adding 5? | What undoes adding five? | वॉट अनडज़ एडिंग फाइव? | 2.9 |
| vo209 | Yes! Subtracting 5 undoes adding 5. | Yes! Subtracting five undoes adding five. | येस! सबट्रैक्टिंग फाइव अनडज़ एडिंग फाइव। | 4.7 |
| vo210 | Subtract 5 from both sides. What is 26 − 5? | Subtract five from both sides. What is twenty-six minus five? | सब्ट्रैक्ट फाइव फ्रोम बोथ साइड्स। वॉट इज़ ट्वेन्टी सिक्स माइनस फाइव? | 6.1 |
| vo211 | Not quite. Work out 26 − 5. | Not quite. Work out twenty-six minus five. | नॉट क्वाइट। वर्क आउट ट्वेंटी सिक्स माइनस फाइव। | 4.7 |
| vo212 | 26 − 5 = 21. Type 21. | Twenty-six minus five equals twenty-one. Type twenty-one. | ट्वेंटी-सिक्स माइनस फाइव इक्वल्स ट्वेंटी-वन। टाइप ट्वेंटी-वन। | 6.0 |
| vo213 | 3x = 21. Divide both sides by 3. What is 21 ÷ 3? | Three x equals twenty-one. Divide both sides by three. What is twenty-one divided by three? | थ्री एक्स इक्वल्स ट्वेंटी वन। डिवाइड बोथ साइड्स बाय थ्री। व्हाट इज ट्वेंटी वन डिवाइडेड बाय थ्री? | 7.8 |
| vo214 | Not quite. Work out 21 ÷ 3. | Not quite. Work out twenty-one divided by three. | नॉट क्वाइट। वर्क आउट ट्वेंटी वन डिवाइडेड बाय थ्री। | 4.1 |
| vo215 | 21 ÷ 3 = 7. Type 7. | Twenty-one divided by three equals seven. Type seven. | ट्वेंटी वन डिवाइडेड बाई थ्री इक्वल्स सेवन। टाइप सेवन। | 6.3 |
| vo216 | Now check in the original equation. Put 7 in place of x. | Now check in the original equation. Put seven in place of x. | नाउ चेक इन द ओरिजिनल इक्वेशन. पुट सेवन इन प्लेस ऑफ एक्स. | 5.0 |
| vo217 | Not quite. Work out 3 × 7 + 5. | Not quite. Work out three times seven, plus five. | नॉट क्वाइट। वर्क आउट थ्री टाइम्स सेवन, प्लस फाइव। | 4.5 |
| vo218 | Find x: x - 7 = 12. | Find x: x minus seven equals twelve. | फाइंड एक्स एक्स माइनस सेवन इक्वल्स ट्वेल्व | 4.4 |
| vo219 | Both sides equal 12. So, 19 is the solution. | Both sides equal twelve. So, nineteen is the solution. | बोथ साइड्स इक्वल ट्वेल्व। सो, नाइन्टीन इज द सोल्यूशन। | 4.8 |
| vo220 | The left side equals −2, and the right side equals 12. They're different, so 5 is not a solution. Let's find x step by step. | The left side equals minus two, and the right side equals twelve. They're different, so five is not a solution. Let's find x step by step. | द लेफ्ट साइड इक्वल्स माइनस टू, एंड द राइट साइड इक्वल्स ट्वेल्व। देअर डिफरेंट, सो फाइव इज नॉट ए सोल्यूशन। लेट्स फाइंड एक्स स्टेप बाई स्टेप। | 10.6 |
| vo221 | The left side equals 0, and the right side equals 12. They're different, so 7 is not a solution. Let's find x step by step. | The left side equals zero, and the right side equals twelve. They're different, so seven is not a solution. Let's find x step by step. | द लेफ्ट साइड इक्वल्स जीरो, एंड द राइट साइड इक्वल्स ट्वेल्व। देयर डिफरेंट, सो सेवन इज नॉट ए सोल्यूशन। लेट्स फाइंड एक्स स्टेप बाई स्टेप। | 9.4 |
| vo222 | The left side equals 5, and the right side equals 12. They're different, so 12 is not a solution. Let's find x step by step. | The left side equals five, and the right side equals twelve. They're different, so twelve is not a solution. Let's find x step by step. | द लेफ्ट साइड ईक्वल्स फाइव, एंड द राइट साइड ईक्वल्स ट्वेल्व। देयर डिफरेंट, सो ट्वेल्व इज नॉट अ सोल्यूशन। लेट्स फाइंड एक्स स्टेप बाइ स्टेप। | 10.0 |
| vo223 | The left side equals 6, and the right side equals 12. They're different, so 13 is not a solution. Let's find x step by step. | The left side equals six, and the right side equals twelve. They're different, so thirteen is not a solution. Let's find x step by step. | द लेफ्ट साइड इक्वल्स सिक्स, एंड द राइट साइड इक्वल्स ट्वेल्व. दे आर डिफरेंट, सो थर्टीन इज नॉट अ सॉल्यूशन. लेट्स फाइंड एक्स स्टेप बाय स्टेप. | 11.4 |
| vo224 | The left side equals 7, and the right side equals 12. They're different, so 14 is not a solution. Let's find x step by step. | The left side equals seven, and the right side equals twelve. They're different, so fourteen is not a solution. Let's find x step by step. | द लेफ्ट साइड ईक्वल्स सेवन, एंड द राइट साइड ईक्वल्स ट्वेल्व। देयर डिफरेंट, सो फोर्टीन इज नॉट अ सोल्यूशन। लेट्स फाइंड एक्स स्टेप बाय स्टेप। | 10.6 |
| vo225 | The left side equals 8, and the right side equals 12. They're different, so 15 is not a solution. Let's find x step by step. | The left side equals eight, and the right side equals twelve. They're different, so fifteen is not a solution. Let's find x step by step. | द लेफ्ट साइड इक्वल्स एइट, एंड द राइट साइड इक्वल्स ट्वेल्व. देआर डिफरेंट, सो फिफ्टीन इज नॉट ए सोल्यूशन. लेट्स फाइंड एक्स स्टेप बाय स्टेप. | 9.9 |
| vo226 | The left side equals 9, and the right side equals 12. They're different, so 16 is not a solution. Let's find x step by step. | The left side equals nine, and the right side equals twelve. They're different, so sixteen is not a solution. Let's find x step by step. | द लेफ्ट साइड इक्वल्स नाइन, एंड द राइट साइड इक्वल्स ट्वेल्व। दे आर डिफरेंट, सो सिक्सटीन इज़ नॉट अ सोल्यूशन। लेट्स फाइंड एक्स स्टेप बाई स्टेप। | 10.8 |
| vo227 | The left side equals 10, and the right side equals 12. They're different, so 17 is not a solution. Let's find x step by step. | The left side equals ten, and the right side equals twelve. They're different, so seventeen is not a solution. Let's find x step by step. | द लेफ्ट साइड ईक्वल्स टेन, एंड द राइट साइड ईक्वल्स ट्वेल्व। देयर डिफरेंट, सो सेवेनटीन इज़ नॉट अ सोल्यूशन। लेट्स फाइंड एक्स स्टेप बाय स्टेप। | 10.2 |
| vo228 | The left side equals 11, and the right side equals 12. They're different, so 18 is not a solution. Let's find x step by step. | The left side equals eleven, and the right side equals twelve. They're different, so eighteen is not a solution. Let's find x step by step. | द लेफ्ट साइड इक्वल्स इलेवन, एंड द राइट साइड इक्वल्स ट्वेल्व. देयर डिफरेंट, सो एटीन इज नॉट अ सोल्यूशन. लेट्स फाइंड एक्स स्टेप बाई स्टेप. | 10.6 |
| vo229 | The left side equals 13, and the right side equals 12. They're different, so 20 is not a solution. Let's find x step by step. | The left side equals thirteen, and the right side equals twelve. They're different, so twenty is not a solution. Let's find x step by step. | द लेफ्ट साइड इक्वल्स थर्टीन, एंड द राइट साइड इक्वल्स ट्वेल्व. दे आर डिफरेंट, सो ट्वेंटी इज नॉट अ सॉल्यूशन. लेट्स फाइंड एक्स स्टेप बाइ स्टेप. | 9.8 |
| vo230 | The left side equals 14, and the right side equals 12. They're different, so 21 is not a solution. Let's find x step by step. | The left side equals fourteen, and the right side equals twelve. They're different, so twenty-one is not a solution. Let's find x step by step. | द लेफ्ट साइड इक्वल्स फोर्टीन्, एंड द राइट साइड इक्वल्स ट्वेल्व। दे आर डिफरेंट, सो ट्वेंटी-वन इज नॉट अ सोल्यूशन। लेट्स फाइंड एक्स स्टेप बाय स्टेप। | 10.8 |
| vo231 | The left side equals 15, and the right side equals 12. They're different, so 22 is not a solution. Let's find x step by step. | The left side equals fifteen, and the right side equals twelve. They're different, so twenty-two is not a solution. Let's find x step by step. | द लेफ्ट साइड इक्वल्स फिफ्टीन, एंड द राइट साइड इक्वल्स ट्वेल्व. दे आर डिफरेंट, सो ट्वेंटी टू इज नॉट अ सॉल्यूशन. लेट्स फाइंड एक्स स्टेप बाय स्टेप. | 10.3 |
| vo232 | The left side equals 16, and the right side equals 12. They're different, so 23 is not a solution. Let's find x step by step. | The left side equals sixteen, and the right side equals twelve. They're different, so twenty-three is not a solution. Let's find x step by step. | द लेफ्ट साइड इक्वल्स सिक्सटीन, एंड द राइट साइड इक्वल्स ट्वेल्व। देयर डिफरेंट, सो ट्वेंटी-थ्री इज नॉट अ सोल्यूशन। लेट्स फाइंड एक्स स्टेप बाय स्टेप। | 10.6 |
| vo233 | The left side equals 17, and the right side equals 12. They're different, so 24 is not a solution. Let's find x step by step. | The left side equals seventeen, and the right side equals twelve. They're different, so twenty-four is not a solution. Let's find x step by step. | द लेफ्ट साइड ईक्वल्स सेवेंटीन, एंड द राइट साइड ईक्वल्स ट्वेल्व। देयर डिफरेंट, सो ट्वेंटी फोर इज नॉट अ सॉल्यूशन। लेट्स फाइंड एक्स स्टेप बाय स्टेप। | 11.1 |
| vo234 | The left side equals 18, and the right side equals 12. They're different, so 25 is not a solution. Let's find x step by step. | The left side equals eighteen, and the right side equals twelve. They're different, so twenty-five is not a solution. Let's find x step by step. | द लेफ्ट साइड इक्वल्स एटीन, एंड द राइट साइड इक्वल्स ट्वेल्व। देयर डिफरेंट, सो ट्वेंटी फाइव इज नॉट अ सोल्यूशन। लेट्स फाइंड एक्स स्टेप बाई स्टेप। | 9.7 |
| vo235 | Adding 7 undoes subtracting 7. Tap the button to add 7 to both sides. | Adding seven undoes subtracting seven. Tap the button to add seven to both sides. | एडिंग सेवन अनडज़ सब्ट्रैक्टिंग सेवन। टैप द बटन टू ऐड सेवन टू बोथ साइड्स। | 6.8 |
| vo236 | Add 7 to both sides. What is 12 + 7? | Add seven to both sides. What is twelve plus seven? | एड सेवन टू बोथ साइड्स। वाट इज ट्वेल्व प्लस सेवन? | 4.8 |
| vo237 | Not quite. Work out 12 + 7. | Not quite. Work out twelve plus seven. | नॉट क्वाइट। वर्क आउट ट्वेल्व प्लस सेवन। | 4.2 |
| vo238 | 12 + 7 = 19. Type 19. | Twelve plus seven equals nineteen. Type nineteen. | ट्वेल्व प्लस सेवन इक्वल्स नाइनटीन। टाइप नाइनटीन। | 5.2 |
| vo239 | Now check in the original equation. Put 19 in place of x. | Now check in the original equation. Put nineteen in place of x. | नाउ चेक इन द ओरिजिनल इक्वेशन। पुट नाइन्टीन इन प्लेस ऑफ एक्स। | 5.2 |
| vo240 | Not quite. Work out 19 − 7. | Not quite. Work out nineteen minus seven. | नॉट क्वाइट। वर्क आउट नाइन्टीन माइनस सेवन। | 4.3 |
| vo241 | Find x: [[x\|4]] = 6. | Find x: x divided by four equals six. | फाइंड एक्स एक्स डिवाइडेड बाय फोर इक्वल्स सिक्स। | 5.3 |
| vo242 | Both sides equal 6. So, 24 is the solution. | Both sides equal six. So, twenty-four is the solution. | बोथ साइड्स इक्वल सिक्स। सो, ट्वेंटी फोर इज द सॉल्यूशन। | 4.9 |
| vo243 | The left side equals 0.5, and the right side equals 6. They're different, so 2 is not a solution. Let's find x step by step. | The left side equals zero point five, and the right side equals six. They're different, so two is not a solution. Let's find x step by step. | द लेफ्ट साइड इक्वल्स ज़ीरो पॉइंट फाइव, एंड द राइट साइड इक्वल्स सिक्स। देअर डिफरेंट, सो टू इज़ नॉट अ सॉल्यूशन। लेट्स फाइंड एक्स स्टेप बाय स्टेप। | 11.3 |
| vo244 | The left side equals 1, and the right side equals 6. They're different, so 4 is not a solution. Let's find x step by step. | The left side equals one, and the right side equals six. They're different, so four is not a solution. Let's find x step by step. | द लेफ्ट साइड इक्वल्स वन, एंड द राइट साइड इक्वल्स सिक्स। देआर डिफरेंट, सो फोर इज नॉट अ सोल्यूशन। लेट्स फाइंड एक्स स्टेप बाय स्टेप। | 10.9 |
| vo245 | The left side equals 1.5, and the right side equals 6. They're different, so 6 is not a solution. Let's find x step by step. | The left side equals one point five, and the right side equals six. They're different, so six is not a solution. Let's find x step by step. | द लेफ्ट साइड इक्वल्स वन पॉइंट फाइव एंड द राइट साइड इक्वल्स सिक्स। दे आर डिफरेंट सो सिक्स इज नॉट अ सोल्यूशन। लेट्स फाइंड एक्स स्टेप बाय स्टेप। | 10.7 |
| vo246 | The left side equals 2.5, and the right side equals 6. They're different, so 10 is not a solution. Let's find x step by step. | The left side equals two point five, and the right side equals six. They're different, so ten is not a solution. Let's find x step by step. | द लेफ्ट साइड इक्वल्स टू पॉइंट फाइव, एंड द राइट साइड इक्वल्स सिक्स। दे आर डिफरेंट, सो टेन इज़ नॉट अ सॉल्यूशन। लेट्स फाइंड एक्स स्टेप बाय स्टेप। | 11.1 |
| vo247 | The left side equals 4.5, and the right side equals 6. They're different, so 18 is not a solution. Let's find x step by step. | The left side equals four point five, and the right side equals six. They're different, so eighteen is not a solution. Let's find x step by step. | द लेफ्ट साइड इक्वल्स फोर पॉइंट फाइव, एंड द राइट साइड इक्वल्स सिक्स। देयर डिफरेंट, सो एटीन इज नॉट अ सोल्यूशन। लेट्स फाइंड एक्स स्टेप बाई स्टेप। | 11.1 |
| vo248 | The left side equals 4.75, and the right side equals 6. They're different, so 19 is not a solution. Let's find x step by step. | The left side equals four point seven five, and the right side equals six. They're different, so nineteen is not a solution. Let's find x step by step. | द लेफ्ट साइड ईक्वल्स फोर पॉइंट सेवन फाइव, एंड द राइट साइड ईक्वल्स सिक्स। देयर डिफरेंट, सो नाइनटीन इज नॉट अ सोल्यूशन। लेट्स फाइंड एक्स स्टेप बाई स्टेप। | 10.8 |
| vo249 | The left side equals 5, and the right side equals 6. They're different, so 20 is not a solution. Let's find x step by step. | The left side equals five, and the right side equals six. They're different, so twenty is not a solution. Let's find x step by step. | द लेफ्ट साइड इक्वल्स फाइव, एंड द राइट साइड इक्वल्स सिक्स. दे आर डिफरेंट, सो ट्वेंटी इज नॉट अ सोल्यूशन. लेट्स फाइंड एक्स स्टेप बाई स्टेप. | 9.7 |
| vo250 | The left side equals 5.25, and the right side equals 6. They're different, so 21 is not a solution. Let's find x step by step. | The left side equals five point two five, and the right side equals six. They're different, so twenty-one is not a solution. Let's find x step by step. | द लेफ्ट साइड इक्वल्स फाइव पॉइंट टू फाइव, एंड द राइट साइड इक्वल्स सिक्स। दे आर डिफरेंट, सो ट्वेंटी वन इज नॉट ए सोल्यूशन। लेट्स फाइंड एक्स स्टेप बाय स्टेप। | 11.8 |
| vo251 | The left side equals 5.5, and the right side equals 6. They're different, so 22 is not a solution. Let's find x step by step. | The left side equals five point five, and the right side equals six. They're different, so twenty-two is not a solution. Let's find x step by step. | द लेफ्ट साइड इक्वल्स फाइव पॉइंट फाइव, एंड द राइट साइड इक्वल्स सिक्स. देयर डिफरेंट, सो ट्वेंटी टू इज नॉट अ सोल्यूशन. लेट्स फाइंड एक्स स्टेप बाय स्टेप. | 11.0 |
| vo252 | The left side equals 5.75, and the right side equals 6. They're different, so 23 is not a solution. Let's find x step by step. | The left side equals five point seven five, and the right side equals six. They're different, so twenty-three is not a solution. Let's find x step by step. | द लेफ्ट साइड इक्वल्स फाइव पॉइंट सेवन फाइव, एंड द राइट साइड इक्वल्स सिक्स। दे आर डिफरेंट, सो ट्वेंटी-थ्री इज़ नॉट अ सलूशन। लेट्स फाइंड एक्स स्टेप बाय स्टेप। | 11.6 |
| vo253 | The left side equals 6.25, and the right side equals 6. They're different, so 25 is not a solution. Let's find x step by step. | The left side equals six point two five, and the right side equals six. They're different, so twenty-five is not a solution. Let's find x step by step. | द लेफ्ट साइड इक्वल्स सिक्स पॉइंट टू फाइव एंड द राइट साइड इक्वल्स सिक्स। दे आर डिफरेंट सो ट्वेंटी फाइव इज नॉट ए सलूशन। लेट्स फाइंड एक्स स्टेप बाय स्टेप। | 11.3 |
| vo254 | The left side equals 6.5, and the right side equals 6. They're different, so 26 is not a solution. Let's find x step by step. | The left side equals six point five, and the right side equals six. They're different, so twenty-six is not a solution. Let's find x step by step. | द लेफ्ट साइड इक्वल्स सिक्स पॉइंट फाइव, एंड द राइट साइड इक्वल्स सिक्स। दे आर डिफरेंट, सो ट्वेन्टी सिक्स इज नॉट अ सोल्यूशन। लेट्स फाइंड एक्स स्टेप बाई स्टेप। | 11.3 |
| vo255 | The left side equals 6.75, and the right side equals 6. They're different, so 27 is not a solution. Let's find x step by step. | The left side equals six point seven five, and the right side equals six. They're different, so twenty-seven is not a solution. Let's find x step by step. | द लेफ्ट साइड इक्वल्स सिक्स पॉइंट सेवन फाइव, एंड द राइट साइड इक्वल्स सिक्स। देयर डिफरेंट, सो ट्वेंटी सेवन इज नॉट अ सोल्यूशन। लेट्स फाइंड एक्स स्टेप बाई स्टेप। | 11.9 |
| vo256 | The left side equals 7, and the right side equals 6. They're different, so 28 is not a solution. Let's find x step by step. | The left side equals seven, and the right side equals six. They're different, so twenty-eight is not a solution. Let's find x step by step. | द लेफ्ट साइड इक्वल्स सेवन, एंड द राइट साइड इक्वल्स सिक्स। दे आर डिफरेंट, सो ट्वेंटी एट इज नॉट अ सलूशन। लेट्स फाइंड एक्स स्टेप बाई स्टेप। | 10.7 |
| vo257 | The left side equals 7.25, and the right side equals 6. They're different, so 29 is not a solution. Let's find x step by step. | The left side equals seven point two five, and the right side equals six. They're different, so twenty-nine is not a solution. Let's find x step by step. | द लेफ्ट साइड इक्वल्स सेवन पॉइंट टू फाइव, एंड द राइट साइड इक्वल्स सिक्स। देयर डिफरेंट, सो ट्वेंटी नाइन इज नॉट अ सलूशन। लेट्स फाइंड एक्स स्टेप बाई स्टेप। | 12.1 |
| vo258 | The left side equals 7.5, and the right side equals 6. They're different, so 30 is not a solution. Let's find x step by step. | The left side equals seven point five, and the right side equals six. They're different, so thirty is not a solution. Let's find x step by step. | द लेफ्ट साइड इक्वल्स सेवन पॉइंट फाइव एंड द राइट साइड इक्वल्स सिक्स। दे आर डिफरेंट सो थर्टी इज नॉट अ सोल्यूशन। लेट्स फाइंड एक्स स्टेप बाई स्टेप। | 11.9 |
| vo259 | Multiplying by 4 undoes dividing by 4. Tap the button to multiply both sides by 4. | Multiplying by four undoes dividing by four. Tap the button to multiply both sides by four. | मल्टीप्लाइंग बाई फोर अनडज़ डिवाइडिंग बाई फोर। टैप द बटन टू मल्टीप्लाई बोथ साइड्स बाई फोर। | 7.6 |
| vo260 | Multiply both sides by 4. What is 6 × 4? | Multiply both sides by four. What is six times four? | मल्टिप्लाय बोथ साइड्स बाय फोर। वाट इज सिक्स टाइम्स फोर? | 4.4 |
| vo261 | Not quite. Work out 6 × 4. | Not quite. Work out six times four. | नॉट क्वाइट। वर्क आउट सिक्स टाइम्स फोर। | 3.6 |
| vo262 | 6 × 4 = 24. Type 24. | Six times four equals twenty-four. Type twenty-four. | सिक्स टाइम्स फोर इक्वल्स ट्वेंटी फोर। टाइप ट्वेंटी फोर। | 5.0 |
| vo263 | Now check in the original equation. Put 24 in place of x. | Now check in the original equation. Put twenty-four in place of x. | नाउ चैक इन द ओरिजिनल इक्वेशन. पुट ट्वेंटी फोर इन प्लेस ऑफ एक्स. | 5.4 |
| vo264 | Not quite. Work out [[24\|4]]. | Not quite. Work out twenty-four divided by four. | नॉट क्वाइट। वर्क आउट ट्वेंटी फोर डिवाइडेड बाय फोर। | 4.4 |
| vo265 | x can be negative too. | = | एक्स कैन बी नेगेटिव टू। | 2.4 |
| vo266 | Find x: 2x + 7 = 1. | Find x: two x plus seven equals one. | फाइंड एक्स कोलन टू एक्स प्लस सेवन इक्वल्स वन | 4.8 |
| vo267 | Both sides equal 1. So, −3 is the solution. | Both sides equal one. So, minus three is the solution. | बोथ साइड्स इक्वल वन। सो, माइनस थ्री इज द सलूशन। | 4.8 |
| vo268 | The left side equals −11, and the right side equals 1. They're different, so −9 is not a solution. Let's find x step by step. | The left side equals minus eleven, and the right side equals one. They're different, so minus nine is not a solution. Let's find x step by step. | द लेफ्ट साइड ईक्वल्स माइनस इलेवन, एंड द राइट साइड ईक्वल्स वन। दे आर डिफरेंट, सो माइनस नाइन इज़ नॉट अ सोल्यूशन। लेट्स फाइंड एक्स स्टेप बाइ स्टेप। | 11.3 |
| vo269 | The left side equals −9, and the right side equals 1. They're different, so −8 is not a solution. Let's find x step by step. | The left side equals minus nine, and the right side equals one. They're different, so minus eight is not a solution. Let's find x step by step. | द लेफ्ट साइड इक्वल्स माइनस नाइन, एंड द राइट साइड इक्वल्स वन। दे आर डिफरेंट, सो माइनस एइट इज़ नॉट अ सोल्यूशन। लेट्स फाइंड एक्स स्टेप बाय स्टेप। | 11.8 |
| vo270 | The left side equals −7, and the right side equals 1. They're different, so −7 is not a solution. Let's find x step by step. | The left side equals minus seven, and the right side equals one. They're different, so minus seven is not a solution. Let's find x step by step. | द लेफ्ट साइड इक्वल्स माइनस सेवन, एंड द राइट साइड इक्वल्स वन। देअर डिफरेंट, सो माइनस सेवन इज नॉट अ सोल्यूशन। लेट्स फाइंड एक्स स्टेप बाय स्टेप। | 11.4 |
| vo271 | The left side equals −5, and the right side equals 1. They're different, so −6 is not a solution. Let's find x step by step. | The left side equals minus five, and the right side equals one. They're different, so minus six is not a solution. Let's find x step by step. | द लेफ्ट साइड ईक्वल्स माइनस फाइव, एंड द राइट साइड ईक्वल्स वन। देयर डिफरेंट, सो माइनस सिक्स इज नॉट अ सॉल्यूशन। लेट्स फाइंड एक्स स्टेप बाय स्टेप। | 11.0 |
| vo272 | The left side equals −3, and the right side equals 1. They're different, so −5 is not a solution. Let's find x step by step. | The left side equals minus three, and the right side equals one. They're different, so minus five is not a solution. Let's find x step by step. | द लेफ्ट साइड इक्वल्स माइनस थ्री, एंड द राइट साइड इक्वल्स वन। दे आर डिफरेंट, सो माइनस फाइव इज नॉट अ सोल्यूशन। लेट्स फाइंड एक्स स्टेप बाय स्टेप। | 10.2 |
| vo273 | The left side equals −1, and the right side equals 1. They're different, so −4 is not a solution. Let's find x step by step. | The left side equals minus one, and the right side equals one. They're different, so minus four is not a solution. Let's find x step by step. | द लेफ्ट साइड इक्वल्स माइनस वन, एंड द राइट साइड इक्वल्स वन। दे आर डिफरेंट, सो माइनस फोर इज़ नॉट अ सोल्यूशन। लेट्स फाइंड एक्स स्टेप बाय स्टेप। | 10.8 |
| vo274 | The left side equals 3, and the right side equals 1. They're different, so −2 is not a solution. Let's find x step by step. | The left side equals three, and the right side equals one. They're different, so minus two is not a solution. Let's find x step by step. | द लेफ्ट साइड इक्वल्स थ्री, एंड द राइट साइड इक्वल्स वन। देअर डिफरेंट, सो माइनस टू इज नॉट अ सोल्यूशन। लेट्स फाइंड एक्स स्टेप बाई स्टेप। | 10.2 |
| vo275 | The left side equals 5, and the right side equals 1. They're different, so −1 is not a solution. Let's find x step by step. | The left side equals five, and the right side equals one. They're different, so minus one is not a solution. Let's find x step by step. | द लेफ्ट साइड ईक्वल्स फाइव, एंड द राइट साइड ईक्वल्स वन। दे आर डिफरेंट, सो माइनस वन इज़ नॉट अ सॉल्यूशन। लेट्स फाइंड एक्स स्टेप बाय स्टेप। | 11.3 |
| vo276 | The left side equals 7, and the right side equals 1. They're different, so 0 is not a solution. Let's find x step by step. | The left side equals seven, and the right side equals one. They're different, so zero is not a solution. Let's find x step by step. | द लेफ्ट साइड इक्वल्स सेवन, एंड द राइट साइड इक्वल्स वन। देयर डिफरेंट, सो जीरो इज नॉट अ सोल्यूशन। लेट्स फाइंड एक्स स्टेप बाई स्टेप। | 10.5 |
| vo277 | The left side equals 9, and the right side equals 1. They're different, so 1 is not a solution. Let's find x step by step. | The left side equals nine, and the right side equals one. They're different, so one is not a solution. Let's find x step by step. | द लेफ्ट साइड इक्वल्स नाइन, एंड द राइट साइड इक्वल्स वन। देयर डिफरेंट, सो वन इज नॉट अ सोल्यूशन। लेट्स फाइंड एक्स स्टेप बाय स्टेप। | 9.6 |
| vo278 | The left side equals 11, and the right side equals 1. They're different, so 2 is not a solution. Let's find x step by step. | The left side equals eleven, and the right side equals one. They're different, so two is not a solution. Let's find x step by step. | द लेफ्ट साइड इक्वल्स इलेवन, एंड द राइट साइड इक्वल्स वन। दे आर डिफरेंट, सो टू इज नॉट अ सोल्यूशन। लेट्स फाइंड एक्स स्टेप बाई स्टेप। | 10.0 |
| vo279 | The left side equals 13, and the right side equals 1. They're different, so 3 is not a solution. Let's find x step by step. | The left side equals thirteen, and the right side equals one. They're different, so three is not a solution. Let's find x step by step. | द लेफ्ट साइड ईक्वल्स थर्टीन, एंड द राइट साइड ईक्वल्स वन। देयर डिफरेंट, सो थ्री इज नॉट अ सॉल्यूशन। लेट्स फाइंड एक्स स्टेप बाय स्टेप। | 9.5 |
| vo280 | The left side equals 15, and the right side equals 1. They're different, so 4 is not a solution. Let's find x step by step. | The left side equals fifteen, and the right side equals one. They're different, so four is not a solution. Let's find x step by step. | द लेफ्ट साइड इक्वल्स फिफ्टीन, एंड द राइट साइड इक्वल्स वन। दे आर डिफरेंट, सो फोर इज नॉट अ सोल्यूशन। लेट्स फाइंड एक्स स्टेप बाय स्टेप। | 11.1 |
| vo281 | The left side equals 19, and the right side equals 1. They're different, so 6 is not a solution. Let's find x step by step. | The left side equals nineteen, and the right side equals one. They're different, so six is not a solution. Let's find x step by step. | द लेफ्ट साइड ईक्वल्स नाइन्टीन, ऐंड द राइट साइड ईक्वल्स वन। दे आर डिफरेंट, सो सिक्स इज़ नॉट अ सोल्यूशन। लेट्स फाइंड एक्स स्टेप बाइ स्टेप। | 9.6 |
| vo282 | The left side equals 23, and the right side equals 1. They're different, so 8 is not a solution. Let's find x step by step. | The left side equals twenty-three, and the right side equals one. They're different, so eight is not a solution. Let's find x step by step. | द लेफ्ट साइड ईक्वल्स ट्वेन्टी थ्री, एंड द राइट साइड ईक्वल्स वन। देयर डिफरेंट, सो एइट इज नॉट अ सोल्यूशन। लेट्स फाइंड एक्स स्टेप बाइ स्टेप। | 10.1 |
| vo283 | Subtract 7 from both sides. What is 1 − 7? | Subtract seven from both sides. What is one minus seven? | सबट्रैक्ट सेवन फ्रॉम बोथ साइड्स। वॉट इज वन माइनस सेवन? | 4.7 |
| vo284 | Not quite. Work out 1 − 7. | Not quite. Work out one minus seven. | नॉट क्वाइट। वर्क आउट वन माइनस सेवन। | 3.9 |
| vo285 | 1 − 7 = −6. Type −6. | One minus seven equals minus six. Type minus six. | वन माइनस सेवन इक्वल्स माइनस सिक्स। टाइप माइनस सिक्स। | 5.5 |
| vo286 | Divide both sides by 2. What is −6 ÷ 2? | Divide both sides by two. What is minus six divided by two? | डिवाइड बोथ साइड्स बाय टू। वॉट इज माइनस सिक्स डिवाइडेड बाय टू? | 5.1 |
| vo287 | Not quite. Work out −6 ÷ 2. | Not quite. Work out minus six divided by two. | नॉट क्वाइट। वर्क आउट माइनस सिक्स डिवाइडेड बाय टू। | 5.3 |
| vo288 | −6 ÷ 2 = −3. Type −3. | Minus six divided by two equals minus three. Type minus three. | माइनस सिक्स डिवाइडेड बाय टू इक्वल्स माइनस थ्री। टाइप माइनस थ्री। | 6.6 |
| vo289 | Now check in the original equation. Put −3 in place of x. | Now check in the original equation. Put minus three in place of x. | नाओ चेक इन द ओरिजिनल इक्वेशन। पुट माइनस थ्री इन प्लेस ऑफ एक्स। | 5.1 |
| vo290 | Not quite. Work out 2 × (−3) + 7. | Not quite. Work out two times minus three, plus seven. | नॉट क्वाइट। वर्क आउट टू टाइम्स माइनस थ्री, प्लस सेवन। | 5.0 |
| vo291 | 3 multiplies the whole bracket. | Three multiplies the whole bracket. | थ्री मल्टीप्लायज़ द होल ब्रैकेट | 2.8 |
| vo292 | Find x: 3(x + 2) = 21. | Find x: three times, x plus two, equals twenty-one. | फाइंड एक्स थ्री टाइम्स एक्स प्लस टू इक्वल्स ट्वेंटी वन | 5.0 |
| vo293 | Both sides equal 21. So, 5 is the solution. | Both sides equal twenty-one. So, five is the solution. | बोथ साइड्स इक्वल ट्वेंटी-वन। सो, फाइव इज द सोल्यूशन। | 4.5 |
| vo294 | The left side equals 6, and the right side equals 21. They're different, so 0 is not a solution. Let's find x step by step. | The left side equals six, and the right side equals twenty-one. They're different, so zero is not a solution. Let's find x step by step. | द लेफ्ट साइड ईक्वल्स सिक्स, एंड द राइट साइड ईक्वल्स ट्वेंटी-वन। दे आर डिफरेंट, सो जीरो इज नॉट अ सोल्यूशन। लेट्स फाइंड एक्स स्टेप बाय स्टेप। | 10.3 |
| vo295 | The left side equals 9, and the right side equals 21. They're different, so 1 is not a solution. Let's find x step by step. | The left side equals nine, and the right side equals twenty-one. They're different, so one is not a solution. Let's find x step by step. | द लेफ्ट साइड ईक्वल्स नाइन, एंड द राइट साइड ईक्वल्स ट्वेंटी-वन। देयर डिफरेंट, सो वन इज़ नॉट अ सॉल्यूशन। लेट्स फाइंड एक्स स्टेप बाय स्टेप। | 9.8 |
| vo296 | The left side equals 12, and the right side equals 21. They're different, so 2 is not a solution. Let's find x step by step. | The left side equals twelve, and the right side equals twenty-one. They're different, so two is not a solution. Let's find x step by step. | द लेफ्ट साइड इक्वल्स ट्वेल्व, एंड द राइट साइड इक्वल्स ट्वेंटी-वन। दे आर डिफरेंट, सो टू इज नॉट अ सोल्यूशन। लेट्स फाइंड एक्स स्टेप बाय स्टेप। | 9.9 |
| vo297 | The left side equals 15, and the right side equals 21. They're different, so 3 is not a solution. Let's find x step by step. | The left side equals fifteen, and the right side equals twenty-one. They're different, so three is not a solution. Let's find x step by step. | द लेफ्ट साइड इक्वल्स फिफ्टीन, एंड द राइट साइड इक्वल्स ट्वेंटी वन। दे आर डिफरेंट, सो थ्री इज नॉट अ सोल्यूशन। लेट्स फाइंड एक्स स्टेप बाय स्टेप। | 10.2 |
| vo298 | The left side equals 18, and the right side equals 21. They're different, so 4 is not a solution. Let's find x step by step. | The left side equals eighteen, and the right side equals twenty-one. They're different, so four is not a solution. Let's find x step by step. | द लेफ्ट साइड ईक्वल्स एटीन, एंड द राइट साइड ईक्वल्स ट्वेंटी वन। देयर डिफरेंट, सो फोर इज नॉट अ सोल्यूशन। लेट्स फाइंड एक्स स्टेप बाय स्टेप। | 11.1 |
| vo299 | The left side equals 24, and the right side equals 21. They're different, so 6 is not a solution. Let's find x step by step. | The left side equals twenty-four, and the right side equals twenty-one. They're different, so six is not a solution. Let's find x step by step. | द लेफ्ट साइड इक्वल्स ट्वेंटी फोर, एंड द राइट साइड इक्वल्स ट्वेंटी वन। देयर डिफरेंट, सो सिक्स इज नॉट ए सोल्यूशन। लेट्स फाइंड एक्स स्टेप बाय स्टेप। | 10.8 |
| vo300 | The left side equals 27, and the right side equals 21. They're different, so 7 is not a solution. Let's find x step by step. | The left side equals twenty-seven, and the right side equals twenty-one. They're different, so seven is not a solution. Let's find x step by step. | द लेफ्ट साइड ईक्वल्स ट्वेंटी-सेवन, एंड द राइट साइड ईक्वल्स ट्वेंटी-वन। दे आर डिफरेंट, सो सेवन इज नॉट अ सोल्यूशन। लेट्स फाइंड एक्स स्टेप बाय स्टेप। | 11.7 |
| vo301 | The left side equals 30, and the right side equals 21. They're different, so 8 is not a solution. Let's find x step by step. | The left side equals thirty, and the right side equals twenty-one. They're different, so eight is not a solution. Let's find x step by step. | द लेफ्ट साइड इक्वल्स थर्टी, एंड द राइट साइड इक्वल्स ट्वेंटी वन। दे आर डिफरेंट, सो ऐट इज नॉट अ सोल्यूशन। लेट्स फाइंड एक्स स्टेप बाई स्टेप। | 10.4 |
| vo302 | The left side equals 33, and the right side equals 21. They're different, so 9 is not a solution. Let's find x step by step. | The left side equals thirty-three, and the right side equals twenty-one. They're different, so nine is not a solution. Let's find x step by step. | द लेफ्ट साइड इक्वल्स थर्टी थ्री एंड द राइट साइड इक्वल्स ट्वेंटी वन। दे आर डिफरेंट सो नाइन इज़ नॉट अ सॉल्यूशन। लेट्स फाइंड एक्स स्टेप बाय स्टेप। | 11.0 |
| vo303 | The left side equals 36, and the right side equals 21. They're different, so 10 is not a solution. Let's find x step by step. | The left side equals thirty-six, and the right side equals twenty-one. They're different, so ten is not a solution. Let's find x step by step. | द लेफ्ट साइड इक्वल्स थर्टी-सिक्स, एंड द राइट साइड इक्वल्स ट्वेंटी-वन। दे आर डिफरेंट, सो टेन इज नॉट अ सलूशन। लेट्स फाइंड एक्स स्टेप बाय स्टेप। | 11.9 |
| vo304 | The left side equals 39, and the right side equals 21. They're different, so 11 is not a solution. Let's find x step by step. | The left side equals thirty-nine, and the right side equals twenty-one. They're different, so eleven is not a solution. Let's find x step by step. | द लेफ्ट साइड ईक्वल्स थर्टी-नाइन, एंड द राइट साइड ईक्वल्स ट्वेंटी-वन। देयर डिफरेंट, सो इलेवन इज नॉट अ सॉल्यूशन। लेट्स फाइंड एक्स स्टेप बाई स्टेप। | 10.3 |
| vo305 | The left side equals 63, and the right side equals 21. They're different, so 19 is not a solution. Let's find x step by step. | The left side equals sixty-three, and the right side equals twenty-one. They're different, so nineteen is not a solution. Let's find x step by step. | द लेफ्ट साइड इक्वल्स सिक्सटी-थ्री, एंड द राइट साइड इक्वल्स ट्वेन्टी-वन। देयर डिफरेंट, सो नाइन्टीन इज नॉट ए सोल्यूशन। लेट्स फाइंड एक्स स्टेप बाय स्टेप। | 11.2 |
| vo306 | The left side equals 69, and the right side equals 21. They're different, so 21 is not a solution. Let's find x step by step. | The left side equals sixty-nine, and the right side equals twenty-one. They're different, so twenty-one is not a solution. Let's find x step by step. | द लेफ्ट साइड इक्वल्स सिक्सटी-नाइन, एंड द राइट साइड इक्वल्स ट्वेंटी-वन। देयर डिफरेंट, सो ट्वेंटी-वन इज नॉट ए सॉल्यूशन। लेट्स फाइंड एक्स स्टेप बाई स्टेप। | 11.6 |
| vo307 | Divide both sides by 3. What is 21 ÷ 3? | Divide both sides by three. What is twenty-one divided by three? | डिवाइड बोथ साइड्स बाय थ्री। वॉट इज ट्वेंटी वन डिवाइडेड बाय थ्री? | 5.5 |
| vo308 | Subtract 2 from both sides. What is 7 − 2? | Subtract two from both sides. What is seven minus two? | सब्ट्रैक्ट टू फ्रॉम बोथ साइड्स। वॉट इज सेवन माइनस टू? | 4.8 |
| vo309 | Not quite. Work out 7 − 2. | Not quite. Work out seven minus two. | नॉट क्वाइट. वर्क आउट सेवन माइनस टू. | 3.7 |
| vo310 | 7 − 2 = 5. Type 5. | Seven minus two equals five. Type five. | सेवेन माइनस टू इक्वल्स फाइव। टाइप फाइव। | 6.3 |
| vo311 | Now check in the original equation. Put 5 in place of x. | Now check in the original equation. Put five in place of x. | नाउ चेक इन द ओरिजिनल इक्वेशन। पुट फाइव इन प्लेस ऑफ एक्स। | 5.3 |
| vo312 | Not quite. Work out 3(5 + 2). | Not quite. Work out three times, five plus two. | नॉट क्वाइट। वर्क आउट थ्री टाइम्स, फाइव प्लस टू। | 4.7 |
| vo313 | Great work! You solved every equation. | = | ग्रेट वर्क! यू सॉल्व्ड एवरी इक्वेशन। | 3.8 |
| vo314 | Quest complete! Zippy collected all 10 crowns — and Grumble is still snoring! | Quest complete! ज़िप्पी collected all ten crowns, and Grumble is still snoring! | क्वेस्ट कंप्लीट! ज़िप्पी कलेक्टेड ऑल टेन क्राउन्स, एंड ग्रंबल इज़ स्टिल स्नोरिंग! | 7.4 |
| vo315 | Here's what you learned on your quest. | = | हियर्स वॉट यू लर्न्ड ऑन योर क्वेस्ट। | 2.7 |
| vo316 | Now, can you spot these parts in another equation? | = |  | no clip yet |
| vo317 | Drag each label to the matching box. | = |  | no clip yet |
| vo318 | Not quite. x represents the unknown value. It is the variable. | = |  | no clip yet |
| vo319 | The complete statement is an equation. | = |  | no clip yet |
| vo320 | Now, label the left-hand side and right-hand side. | = |  | no clip yet |
| vo321 | Let's return to the crown's equation. | = |  | no clip yet |
| vo322 | We usually leave the 1 unwritten. | We usually leave the one unwritten. |  | no clip yet |
| vo323 | The right-hand side equals 7. | The right-hand side equals seven. |  | no clip yet |
| vo324 | They're different, so 4 is not a solution. | They're different, so four is not a solution. |  | no clip yet |
| vo325 | The left-hand side equals 7. | The left-hand side equals seven. |  | no clip yet |
| vo326 | Now find the value of the right-hand side. | = |  | no clip yet |
| vo327 | The left-hand side equals 9. | The left-hand side equals nine. |  | no clip yet |
| vo328 | The right-hand side equals 9. | The right-hand side equals nine. |  | no clip yet |
| vo329 | They're different, so 5 is not a solution. | They're different, so five is not a solution. |  | no clip yet |
| vo330 | The left-hand side equals 12. | The left-hand side equals twelve. |  | no clip yet |
| vo331 | They're different, so 8 is not a solution. | They're different, so eight is not a solution. |  | no clip yet |
| vo332 | The left-hand side equals 11. | The left-hand side equals eleven. |  | no clip yet |
| vo333 | The right-hand side equals 11. | The right-hand side equals eleven. |  | no clip yet |
| vo334 | They're different, so 10 is not a solution. | They're different, so ten is not a solution. |  | no clip yet |
| vo335 | The left-hand side equals 10. | The left-hand side equals ten. |  | no clip yet |
| vo336 | The left-hand side equals 14. | The left-hand side equals fourteen. |  | no clip yet |
| vo337 | They're different, so 12 is not a solution. | They're different, so twelve is not a solution. |  | no clip yet |
| vo338 | The right-hand side equals 10. | The right-hand side equals ten. |  | no clip yet |
| vo339 | The left-hand side equals 23. | The left-hand side equals twenty-three. |  | no clip yet |
| vo340 | The left-hand side equals 31. | The left-hand side equals thirty-one. |  | no clip yet |
| vo341 | They're different, so 23 is not a solution. | They're different, so twenty-three is not a solution. |  | no clip yet |
| vo342 | The left-hand side equals 39. | The left-hand side equals thirty-nine. |  | no clip yet |
| vo343 | They're different, so 31 is not a solution. | They're different, so thirty-one is not a solution. |  | no clip yet |
| vo344 | The right-hand side equals 23. | The right-hand side equals twenty-three. |  | no clip yet |
| vo345 | The left-hand side equals 18. | The left-hand side equals eighteen. |  | no clip yet |
| vo346 | The left-hand side equals 22. | The left-hand side equals twenty-two. |  | no clip yet |
| vo347 | They're different, so 9 is not a solution. | They're different, so nine is not a solution. |  | no clip yet |
| vo348 | The right-hand side equals 18. | The right-hand side equals eighteen. |  | no clip yet |
| vo349 | Let's try x = 10. | Let's try x equals ten. |  | no clip yet |
| vo350 | How about x = 12? | How about x equals twelve? |  | no clip yet |
| vo351 | Can we find the crown's mass without guessing? | = |  | no clip yet |
<!-- /vo-table -->
