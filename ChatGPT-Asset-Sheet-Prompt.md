# ChatGPT prompt: Zippy's Crown Quest asset sheet

## How to use it

1. Open ChatGPT and start a new chat (image generation must be available).
2. Attach these four images from this folder, so ChatGPT copies your style:
   - `start screen.png`: overall style and colours.
   - `background game.png`: the temple stone colour, for the pedestal.
   - `start button.png`: the wooden button style.
   - `number bricks.png`: the gold material.
3. Paste the prompt below and send it.
4. Download the image and save it in this folder as `asset sheet.png`, then tell Claude. Claude will cut out every piece and put it into the game in place of the drawings it made in code.

## The prompt (copy everything in the box)

```
Create ONE game asset sheet: separate UI pieces and props for a cartoon children's math game called "Zippy's Crown Quest", set in a teal-blue jungle temple. Match the art style of the attached images exactly: bold, thick dark-brown outlines; soft cel shading with glossy white highlights; light coming from the top-left; warm gold, honey-coloured wood and cream parchment against teal-blue stone. Use the same outline thickness and finish on every item.

Canvas and rules:
- Wide landscape image, 1536 × 1024.
- Background: fully transparent. If transparency is not possible, use one flat, solid, pure magenta (#FF00FF) background with no gradient, texture or shadow.
- Every item is a separate, complete object with at least 40 px of empty space around it. Nothing touches or overlaps, and nothing is cut off by the edge of the image.
- All items are upright and face the viewer, drawn flat with no perspective tilt, unless the description says "seen slightly from above".
- No text, letters, numbers or labels anywhere: not on the items and not beside them. The numbers in this list are only for reference; do not draw them.
- No characters (no monkey, no monster), no coins, no crowns, no gold bars, no scenery, and no shadows cast on the background.

Lay the items out in rows, top to bottom:

Row 1
1. Balance beam: one long, slim, perfectly straight and level golden bar with a shiny gold ball at each end, and a round gold ring hub in the exact centre (the middle of the hub is a flat, empty disc). Both ends identical. Make it about 85% of the image width.

Row 2 (the tallest row)
2. Balance stand: a slim, straight, vertical golden post standing on a round base of three stacked steps, with a small gold ball on top of the post. Symmetrical. The base is seen slightly from above, so the tops of the steps show as ellipses. No beam and no pans attached.
3. Balance pan: a shallow, empty golden bowl seen slightly from above (the rim shows as a flat ellipse and we can see inside the bowl), hanging from two thin golden rods that rise from the left and right edges of the rim and meet at a small ring at the top, forming a tall triangle. Symmetrical.
4. Treasure chest, closed: a wooden chest with gold metal bands and a gold lock, three-quarter front view.
5. Treasure chest, open: the same chest with the lid open backwards and warm golden light glowing inside. Empty.
6. Stone pedestal: a short, wide block of the same teal-blue temple stone as the attached background, seen slightly from above, with a flat top.

Row 3
7. Notebook scroll: an open, wide, horizontal parchment scroll with a wooden roller along the top edge and another along the bottom edge; each roller has small gold end caps. Blank paper.
8. Parchment panel: a plain rectangle of cream parchment with a wooden border of even thickness and softly rounded corners. Flat, empty centre.
9. Speech bubble: white, rounded, thick dark outline, with a short tail at the bottom-left. Empty.
10. Thought bubble: a white, puffy cloud with two small circles trailing down to the bottom-left. Empty.

Row 4
11. Level sign: a small horizontal wooden plank sign with rounded corners and two little nails. Blank.
12. Green button: a wide, glossy green capsule (pill-shaped) button with a dark green outline. Blank.
13. Wooden button: a wide wooden capsule (pill-shaped) button in the same wood as the attached start button. Blank.
14. Number tile: a square golden tile with rounded corners and a darker gold edge. Blank.
15. Green medallion: a round, glossy emerald-green enamel disc with a thin gold rim. Blank.
16. Red medallion: the same disc in coral red. Blank.

Row 5: six round buttons, all the same size, in the style of the attached start button but simpler (no leaves), each with one bold icon:
17. a blue gem icon
18. a circular "restart" arrow
19. three horizontal bars (menu)
20. a triangle pointing left (back)
21. an X (close)
22. a round golden button with a dark-brown loudspeaker icon (sound)

Row 6
23–30. Eight gems with the same cut (a wide flat top and a pointed bottom, like a shield-shaped diamond, with facets and a white sparkle): one each in golden yellow, orange, purple, emerald green, teal, amber, blue and ruby red.
31. Torch flame: a single cartoon fire flame pointing up, with a white-yellow core and orange-red edges (no torch).
32. Sparkle: a four-pointed twinkle star, white in the centre fading to gold.
33. Dust puff: a small, soft cartoon cloud puff in pale grey-blue.
34. Pointing hand: a white cartoon glove hand with the index finger pointing up and the other fingers curled, thick dark outline.

Before you finish, check: 34 separate items; transparent (or flat magenta) background; generous gaps; no text or numbers anywhere; nothing cropped.
```

## If something goes wrong (follow-up messages for the same chat)

- **ChatGPT added labels or numbers:**
  > Recreate the same sheet with no text, numbers or labels anywhere, and a transparent background.
- **The balance pieces came out small or blurry.** They are the biggest things on screen:
  > Make a second sheet with only items 1, 2 and 3 (the balance beam, stand and pan), each as large as possible, same style and rules.
- **Optional: the comic name titles.** The starbursts behind "GRUMBLE" and "ZIPPY!" are drawn very large, so they need their own image:
  > Make a sheet with two big, empty, spiky comic-book starbursts (about 16 points each, thick dark outline): one lilac-to-purple, one yellow-to-orange. Same style and rules, no text.
- **Some items are missing:**
  > Make a sheet with only these items: (list the numbers). Same style and rules.

## What each piece replaces in the game

| # | Asset | Used for (now drawn in code) |
|---|---|---|
| 1–3 | Balance beam, stand, pan | The balance scale, plus the small balances in Zippy's thought bubble and the notebook |
| 4–5 | Treasure chest closed / open | The Word Treasure chest in the word recap |
| 6 | Stone pedestal | The blocks the gold bars sit on, and the ledges in Level 8 |
| 7 | Notebook scroll | Zippy's Notebook |
| 8 | Parchment panel | Caption bar, check panel, equation board, word cards, menu and activity boards |
| 9 | Speech bubble | Zippy's and Grumble's lines |
| 10 | Thought bubble | The intro "what if it tips?" bubble and Level 8's trial thoughts |
| 11 | Level sign | The "Level 1" sign (the words stay as text) |
| 12 | Green pill button | SWAP (the word stays as text) |
| 13 | Wooden pill button | Resume, Yes, No and Play again buttons |
| 14 | Number tile | The number choices when checking a value |
| 15–16 | Green / red medallion | The = and ≠ sign in the centre of the balance |
| 17–22 | Round buttons | Word Treasure, Restart, Menu, Back, Close and 🔊 |
| 23–30 | Eight gems | The "New word!" gems and the Word Treasure |
| 31 | Torch flame | The two wall torches |
| 32–33 | Sparkle, dust puff | Sparkles, and the dust when Grumble flops down |
| 34 | Pointing hand | The hand that shows children what to tap or drag |

All words and numbers (captions, "SWAP", "Level 1", the numbers on bars and coins) stay as live text, so teachers can edit them and they stay sharp at every screen size.
