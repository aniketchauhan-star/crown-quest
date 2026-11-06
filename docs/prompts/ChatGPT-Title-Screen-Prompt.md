# ChatGPT prompts: the title screen, sharp and in separate pieces

Five pictures, made from the old title screen (the old thumbnail), so the title can be built cleanly:
1. **the background**: the same temple, empty (no monkey, title sign, monster or crown), sharp everywhere;
2. **Zippy**, 3. **the title sign**, 4. **Grumble**, 5. **the crown**: each one alone, on a transparent background.

Why: today the game cuts the characters out of the old thumbnail and paints the wall in where they were. The painted-in wall is soft and blurry, Grumble is drawn out of focus in the old picture, and the old picture is small (1672 px wide), so it looks soft on a big screen. Five new, large, sharp pictures fix all three.

## How to use it

1. Open ChatGPT (image generation must be available). Start a **new chat for each picture**.
2. In each chat, attach the old thumbnail: `assets/ui/start-screen.webp` in the game folder (or your original start screen picture, if you have it).
3. Paste one of the prompts below and send it. Download the picture.
4. Save the five pictures in `art/ui/` with these names:
   - `title background.png`
   - `title zippy.png`
   - `title sign.png`
   - `title grumble.png`
   - `title crown.png`
5. Tell Claude.

## Prompt 1: the background (copy everything in the box)

```
The attached picture is the title screen of my children's game "Zippy's Crown Quest". Make the same picture again, sharp and clean, but EMPTY: remove the monkey, the wooden title sign, the purple monster and the gold crown.

Where they were, continue what is behind them, so nobody can tell anything was there:
- behind the monkey: the blue stone-block wall and the vines;
- the vine the monkey holds: keep it, complete and unbroken, where his hand was;
- behind the title sign: the stone wall and the big stone arch;
- where the monster stood: an empty dark doorway, with the warm orange fire glow on its left side;
- where the crown stood: the flat, empty top of the round stone pedestal.

Keep everything else exactly as it is: the same framing and camera, the same blue temple stones, pillars, glowing doorways, hanging vines and leaves, and the big stone blocks at the front, in the same places, sizes and colours.

Style: the same cartoon style, with clean bold outlines and bright colours. Everything sharp and in focus: no blur, no soft or out-of-focus areas, no depth of field, no haze, no smudges.

Size: widescreen 16:9, as large as you can (for example 1920 × 1080). If the picture must be a different shape, keep the whole scene the same and add a little more floor at the bottom and vines at the top, rather than cropping or squeezing it.

No characters, no text, no logo, no new objects.
```

## Prompt 2: Zippy

```
From the attached picture (the title screen of my children's game), draw ONLY the monkey, Zippy, on his own, on a transparent background.

- Exactly the same Zippy: the same face and big open smile, orange-brown fur, cream face, hands and tummy, big round ears, curly tail, and the same bold dark-brown outline.
- Exactly the same pose as in the picture: hanging by his raised hand, the other arm stretched out to the right, his tail curled behind him, his legs bent.
- Do NOT draw the vine: his raised hand is closed in a fist, with nothing in it.
- Sharp and in focus, with clean crisp outlines. No blur, no glow, no shadow.

Canvas: square, as large as you can (for example 1536 × 1536), with a real transparent background (alpha), not a drawn checkerboard. If transparency is not possible, use one flat pure magenta (#FF00FF) background. Zippy fills most of the canvas, with about 40 px of empty space all round him; nothing touches the edges. No text, no other objects.
```

## Prompt 3: the title sign

```
From the attached picture (the title screen of my children's game), draw ONLY the title sign, on its own, on a transparent background: the wooden board with leaves around it and the words "Zippy's Crown Quest".

- Exactly the same sign: the same brown wooden board, the same green leaves at its corners and edges, and the same lettering: "Zippy's" in orange-yellow on the top line and "Crown Quest" in cream on the bottom line, in chunky rounded letters with thick dark-brown outlines.
- Spell it exactly: Zippy's Crown Quest (with the apostrophe). No other words.
- Sharp and in focus, with clean crisp outlines. No blur, no glow, no shadow.

Canvas: wide landscape, as large as you can (for example 1536 × 1024), with a real transparent background (alpha), not a drawn checkerboard. If transparency is not possible, use one flat pure magenta (#FF00FF) background. The sign fills most of the width, with about 40 px of empty space all round it; nothing touches the edges. No other objects.
```

## Prompt 4: Grumble

```
From the attached picture (the title screen of my children's game), draw ONLY the purple monster, Grumble, on his own, on a transparent background.

- Exactly the same monster: the same shaggy purple fur, the same two cream horns, the same angry eyes and frown, the same two little white fangs.
- In the picture he is blurry and dark because he stands in a doorway at the back. Draw him SHARP, in focus and in full colour, like the monkey, in the same cartoon style with clean dark outlines.
- Draw the whole monster, from his horns down to his feet, standing and facing us, his arms down by his sides. (In the game only his top half shows above a stone ledge, but draw all of him.)
- No blur, no glow, no shadow.

Canvas: square, as large as you can (for example 1536 × 1536), with a real transparent background (alpha), not a drawn checkerboard. If transparency is not possible, use one flat pure magenta (#FF00FF) background. He fills most of the canvas, with about 40 px of empty space all round him; nothing touches the edges. No text, no other objects.
```

## Prompt 5: the crown

```
From the attached picture (the title screen of my children's game), draw ONLY the gold crown, on its own, on a transparent background.

- Exactly the same crown: shiny gold, five points each topped with a gold ball (the middle point tallest), a big red six-sided gem in the middle and a small round red gem on each side, a gold band along the bottom, and the same dark-brown outline.
- Seen from the same angle as in the picture, straight on, complete with its bottom rim.
- Sharp and in focus, with clean crisp outlines. No blur, no glow, no sparkles, no shadow.

Canvas: wide landscape, as large as you can (for example 1536 × 1024), with a real transparent background (alpha), not a drawn checkerboard. If transparency is not possible, use one flat pure magenta (#FF00FF) background. The crown fills most of the canvas, with about 40 px of empty space all round it; nothing touches the edges. No text, no other objects.
```

## If something goes wrong (follow-up messages for the same chat)

- **The background still shows a character, or a smudge where one was:**
  > Remove the [monkey / sign / monster / crown] completely and continue the wall behind it, so nothing was ever there. Keep everything else the same.
  (Or use ChatGPT's Select tool: paint over the leftover, and send "Remove this and continue what is behind it.")
- **The background is blurry or soft anywhere:**
  > Make the whole picture sharp and in focus, with clean bold outlines, like a crisp cartoon. No blur or haze anywhere. Keep the scene the same.
- **The background is framed differently (zoomed in, cropped or moved):**
  > Keep the whole scene framed exactly like the attached picture: the same things at the same places and sizes. Keep it empty.
- **The vine Zippy held is broken or missing:**
  > Draw the vine the monkey held complete and unbroken, from the top of the picture down through where his hand was and on to the left edge. Keep everything else the same.
- **The background behind a piece is not transparent, or a checkerboard is drawn:**
  > Make the background really transparent (not a drawn checkerboard). If you can't, use one flat pure magenta (#FF00FF). Keep everything else the same.
- **Zippy is holding a vine:**
  > Draw only Zippy, without the vine: his raised hand closed in an empty fist. Keep his pose.
- **The sign is spelled wrongly, or has other words:**
  > Spell the sign exactly "Zippy's Crown Quest", with no other words. Keep the board, leaves and letter style the same.
- **Grumble is blurry or dark:**
  > Draw Grumble sharp, bright and in focus, like the monkey, with clean outlines. Keep his look the same.
- **A piece is cut off, or touches the edge:**
  > Show the whole [monkey / sign / monster / crown] with empty space all round it. Keep everything else the same.
- **A piece looks different from the attached picture:**
  > Make it look exactly like the one in the attached picture: the same shapes, colours and outlines. Keep it on a transparent background.

## What happens next

Claude checks each picture (a real transparent background, nothing cut off), trims the four pieces and places each one on the new background where it stands in the old title screen, at the same size. The title's opening stays the same (Zippy flies in and grabs his vine, the crown drops, Grumble rises and roars, the sign slams in, then the play button), but every part is sharp, there is no painted-in wall, and the larger pictures stay crisp on big screens.
