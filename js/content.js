/*
 * Zippy's Crown Quest: all words, numbers and feedback live here.
 * Teachers can edit any text or level number in this file without touching the game logic.
 * {n}, {v}, {a}, {b}, {s} are filled in by the game (see the comments next to each block).
 * Each line ID is also the file name for an optional recorded voice line: assets/vo/<id>.mp3
 *
 * Maths in any text: x is set in italics by itself; "x^2" shows a power; "[[x|4]]" is a fraction
 * (x over 4); "{{− 8}}" is the "same on both sides" highlight; "<<+ 4>>" is a red highlight.
 */
window.CONTENT = {
  title: {
    name: "Zippy's Crown Quest", // browser tab name (the title screen itself shows no words)
    start: "Start", // the play button's name for screen readers (not shown)
    loading: "Loading the jungle…",
    rotate: "Please turn your device sideways",
  },

  names: {
    grumble: "GRUMBLE",
    grumbleTag: "The treasure guard",
    zippy: "ZIPPY!",
    zippyTag: "The clever treasure hunter",
  },

  // Narrator lines (shown in the caption bar and spoken).
  lines: {
    // Intro
    "intro-1": "Meet Zippy! He spots a golden crown.",
    "intro-2": "Grumble guards the treasure.",
    "intro-3": "Luckily, he's asleep!",
    "intro-4": "If the balance tips, the alarm will wake Grumble.",
    "intro-5": "Let's replace the crown with something just as heavy. That will keep the balance level!",
    "intro-6": "Each coin has a mass of 1 unit.",

    // Levels 1–3: the swap
    "l1-1": "Which bar should Zippy use?",
    "l1-2": "Drag it to Zippy, then tap Swap.",
    "l2-1": "There's another crown! Let's help Zippy collect it too.",
    "l3-1": "One more crown. Grumble is still asleep!",
    "swap-correct": "Perfect swap! The crown is {n} units — just like the {n} coins.",
    "swap-light": "Oops! That bar is too light — the balance tipped!",
    "swap-heavy": "Oops! That bar is too heavy — the balance tipped!",
    "swap-hint2": "Each coin is 1 unit. The crown balances {n} coins, so it is {n} units. Try the {n} bar!",
    "swap-tap-swap": "Now tap Swap!",
    "swap-give": "Drag a gold bar to Zippy.",

    // Level 4: the mystery crown
    "l4-1": "Wait… this crown has two coins beside it.",
    "l4-2": "The crown and these two coins together balance seven coins.",
    "l4-3": "But Zippy needs a replacement for just the crown.",
    "l4-4": "How can we find the crown's mass?",
    "l4-5": "Let's call the crown's mass x.",
    "l4-6": "The crown and two coins have a total mass of x + 2.",
    "l4-7": "They balance 7 units on the other side.",
    "l4-8": "So, we can write x + 2 = 7.",
    "l4-9": "Hmm… let's find the value of x so Zippy can make the swap.",
    "l4-10": "Here, x represents the crown's mass — the value we want to find.",
    "l4-11": "A variable is a symbol used to represent a value. Here, our variable is x, and its value is unknown.",
    "l4-12": "Now look at x + 2. It represents the total mass of the crown and the two coins.",
    "l4-13": "Here x is a variable, and 2 is a constant. We add them together.",
    "l4-14": "Joining x and 2 with addition gives the algebraic expression x + 2.",
    "l4-15": "The balance shows that x + 2 equals 7.",
    "l4-16": "A statement that says two expressions have equal values is called an equation.",
    "l4-17": "The expression to the left of the equals sign is called the left-hand side, or LHS.",
    "l4-18": "The expression to the right of the equals sign is called the right-hand side, or RHS.",
    "l4-19": "This equation has one variable: x.",
    "l4-20": "When we write x, its power is 1. We usually leave the 1 unwritten.",
    "l4-21": "This equation has one variable, and its highest power is 1.",
    "l4-22": "So, it is a linear equation in one variable.",
    "l4-23": "Now let's find the crown's mass.",
    "l4-24": "We need a value of x that makes both sides equal.",
    "l4-25": "Let's check 4. Replace x with 4 and find the value of each side.",
    "l4-25-tap": "Tap the 4 bar.",
    "l4-26": "The left side equals 6, and the right side equals 7. They're different, so 4 is not a solution.",
    "l4-27": "Now, let's check 5. Replace x with 5 and find the value of each side.",
    "l4-27-tap": "Tap the 5 bar.",
    "l4-28": "Both sides equal 7.",
    "l4-29": "A value that makes an equation true is called its solution. So, 5 is the solution.",
    "l4-30": "The crown's mass is 5 units. Zippy can use the 5-unit bar!",

    // Levels 5–9: check before you swap.  {v} = value tried, {s} = the left side's value, {b} = the right side
    "l5-0": "Another crown, with 3 coins beside it. So, x + 3 = 9.",
    "check-intro": "Smart treasure hunters check before they swap!",
    "l5-give": "Give the {v} bar to Zippy.",
    "check-replace": "Replace x with {v}.",
    "check-find": "Find the value of each side.",
    "check-find-lhs": "Find the value of the left side.",
    "l5-not": "The left side equals {s}, and the right side equals {b}. They're different, so {v} doesn't work.",
    "l5-yes": "Both sides equal {b}. So, {v} is the solution. Zippy can use the {v}-unit bar!",
    "check-now-swap": "Now Zippy can swap. Tap Swap!",
    "check-lets": "Let's check {v}.",
    "check-next": "Now, let's check {v}.",
    "check-not": "The left side equals {s}, and the right side equals {b}. They're different, so {v} is not a solution.",
    "check-try-another": "Try another value.",
    "l6-0": "Another crown, with 4 coins beside it. So, x + 4 = 11.",
    "l6-prompt": "Choose a value for x. Check whether both sides are equal.",
    "l6-right": "Both sides equal {b}. So, {v} is the solution.",
    "l6-find": "Replace x with {v} and find the value of each side.",
    "l6-success": "Both sides equal {b}. Zippy can use the {v}-unit bar!",
    "l7-prompt": "Another crown and two coins balance ten coins. Which value of x makes both sides equal?",
    "l7-support": "Replace x with your chosen value. Then compare the two sides.",
    "l7-success": "Both sides equal {b}. So, {v} is the solution.",
    "hint-lhs": "Add: {v} + {a}. Count on from {v}: {seq}.",
    "hint-lhs-k": "{k} × {v} = {kv}. Then add {a}.",
    "hint-rhs": "RHS is the number on the right of =.",

    // Level 8: the smart way
    "l8-1": "Zippy spots another crown!",
    "l8-2": "This crown and an 8-unit bar together balance 23 units.",
    "l8-3": "We could try different values again. But that might take a while.",
    "l8-4": "Let's find the crown's mass directly.",
    "l8-5": "First, split 23 into 8 and 15.",
    "l8-6": "There are 8 units beside the crown. Let's see how we can remove them.",
    "l8-7": "To keep the balance level, we must remove 8 units from both sides.",
    "l8-8": "Remove 8 from both sides to keep the balance level.",
    "l8-8-drag": "Drag an 8 bar off the balance.",
    "l8-9": "Now the crown balances 15 units. So, x = 15.",
    "l8-10": "Before Zippy swaps, let's check the answer in the original equation.",
    "l8-11": "Replace x with 15.",
    "l8-12": "15 + 8 = 23.",
    "l8-13": "Both sides equal 23. So, 15 is the solution.",
    "l8-14": "The crown's mass is 15 units. Zippy can use the 15-unit bar!",
    "l8-give": "Give the 15 bar to Zippy, then tap Swap.",
    "l8-15": "That works! Zippy collects the crown, and Grumble stays asleep.",

    // Level 9: two matching crowns
    "l9-0": "Zippy spots two matching crowns!",
    "l9-1": "Each crown has the same mass, x.",
    "l9-2": "Two lots of x make 2x.",
    "l9-3": "First, let's remove these 4 units.",
    "l9-4": "Split 18 into 4 and 14.",
    "l9-5": "Remove 4 from both sides.",
    "l9-5-drag": "Drag a 4 bar off the balance.",
    "l9-6": "We need the mass of one crown.",
    "l9-7": "There are two identical crowns, so divide both sides by 2.",
    "l9-8": "One crown has a mass of 7 units.",
    "l9-9": "Let's check. Put 7 in place of x.",
    "l9-calc": "2 × 7 + 4 = 18.",
    "l9-10": "Both sides equal 18! Zippy can make the swap.",
    "l9-give": "Give a 7 bar to Zippy, then tap Swap.",
    "l9-give2": "One more crown! Give the other 7 bar to Zippy.",

    // Practice: try a few equations (the words for each equation are in `practice` below)
    "p-intro": "You've helped Zippy find the crowns' masses. Let's try a few equations.",
    "p-done": "Great work! You solved every equation.",

    // Finale
    "fin-1": "Quest complete! Zippy collected all 10 crowns — and Grumble is still snoring!",
    "fin-2": "Here's what you learned on your quest.",
  },

  // Zippy's own lines (speech bubble + his voice).
  zippy: {
    ooh: "Ooh!",
    sleepTight: "Hee hee! Sleep tight, Grumble!",
    checked: "Phew! Good thing we checked.",
    tryN: "Let's try {v}.",
    tryNext: "Now, let's try {v}.",
    thatWorks: "That works!",
    idea: "I know!",
  },

  // Grumble's noises (comic text) and his one sleepy line.
  grumble: {
    tap: "Mmm… five more minutes…",
    stir: "HRRM?",
    roar: "GRRRUMBLE!",
    alarm: "RING! RING!",
  },

  ui: {
    back: "Back",
    next: "Next",
    swap: "SWAP",
    tried: "Tried",
    skip: "Skip",
    level: "Level",
    practice: "Practice",
    newWord: "New word!",
    wordTreasure: "Word Treasure",
    wordTreasureEmpty: "Your treasure is empty. New words appear here as you play!",
    close: "Close",
    paused: "Paused",
    resume: "Resume",
    music: "Music",
    sfx: "Sound effects",
    voice: "Voice",
    reducedMotion: "Reduced motion",
    chapters: "Chapters",
    restartQ: "Start this level again?",
    yes: "Yes",
    no: "No",
    takenOff: "Taken off",
    playAgain: "Play again",
    unit: "1 unit",
    // what the check panel shows under LHS ≠ RHS or LHS = RHS ({v} = the value tried)
    verdictNot: "{v} is not a solution",
    verdictYes: "{v} is the solution!",
  },

  // Chapter select (menu). id = where the chapter starts.
  chapters: [
    { id: "intro", title: "Intro", sub: "Meet Zippy & Grumble" },
    { id: "L1", title: "The Swap", sub: "Levels 1–3" },
    { id: "L4a", title: "The Mystery Crown", sub: "Level 4" },
    { id: "L5", title: "Check It", sub: "Levels 5–7" },
    { id: "L8", title: "The Smart Way", sub: "Level 8" },
    { id: "L9", title: "Two Crowns", sub: "Level 9" },
    { id: "P", title: "Practice", sub: "Six equations" },
    { id: "finale", title: "Finale", sub: "Quest complete" },
  ],

  /*
   * Levels. crown = the crown's hidden mass. left = coins beside the crown. right = coins on the
   * right pan, stacked bottom row first (rows of at most 4). bars = the three gold bars (shown in a
   * new random order each time). chips = the three number choices for each blank in the check.
   * crowns = how many matching crowns (Level 9), itemScale = smaller crowns and bars so all fit.
   */
  levels: {
    L1: { n: 1, kind: "swap", crown: 5, left: 0, right: [3, 2], bars: [3, 5, 7], intro: ["l1-1", "l1-2"] },
    L2: { n: 2, kind: "swap", crown: 7, left: 0, right: [4, 3], bars: [5, 7, 9], intro: ["l2-1"] },
    L3: { n: 3, kind: "swap", crown: 4, left: 0, right: [2, 2], bars: [3, 4, 6], intro: ["l3-1"] },
    L4: { n: 4, kind: "mystery", crown: 5, left: 2, right: [4, 3], bars: [4, 5, 7] },
    L5: {
      n: 5, kind: "guided", crown: 6, left: 3, right: [3, 3, 3], bars: [4, 6, 7], tries: [4, 6],
      intro: ["l5-0", "check-intro"],
      chips: { 4: { lhs: [6, 7, 9], rhs: [3, 7, 9] }, 6: { lhs: [8, 9, 10], rhs: [3, 6, 9] } },
      verdictNot: "{v} doesn't work. Try another value.",
    },
    // Levels 6–7: the child chooses. say = the narrator's line for each moment of the check.
    L6: {
      n: 6, kind: "independent", crown: 7, left: 4, right: [4, 4, 3], bars: [5, 8, 7],
      intro: ["l6-0"],
      say: { prompt: "l6-prompt", firstRight: "l6-right", firstTry: "check-lets", find: "l6-find", nextTry: "check-next", success: "l6-success" },
      verdictNot: "{v} isn't a solution.",
      chips: {
        8: { lhs: [11, 12, 13], rhs: [4, 8, 11] },
        5: { lhs: [8, 9, 10], rhs: [4, 5, 11] },
        7: { lhs: [10, 11, 12], rhs: [4, 7, 11] },
      },
    },
    L7: {
      n: 7, kind: "independent", crown: 8, left: 2, right: [4, 4, 2], bars: [10, 8, 12],
      intro: [],
      say: { prompt: "l7-prompt", firstRight: "l7-success", firstTry: null, find: "l7-support", nextTry: "check-next", success: "l7-success" },
      verdictNot: "{v} isn't a solution.",
      chips: {
        10: { lhs: [11, 12, 13], rhs: [2, 10, 12] },
        12: { lhs: [13, 14, 15], rhs: [2, 10, 12] },
        8: { lhs: [9, 10, 11], rhs: [2, 8, 10] },
      },
    },
    L8: {
      n: 8, kind: "smart", crown: 15, leftBar: 8, rightBar: 23, bars: [15, 23, 31],
      chips: { 15: { lhs: [22, 23, 24] } },
    },
    L9: {
      n: 9, kind: "two", crown: 7, crowns: 2, leftBar: 4, rightBar: 18, bars: [7, 7, 9], itemScale: 0.68,
      chips: { 7: { lhs: [14, 18, 21] } },
    },
  },

  // Activity: label the parts of 4x + 3 = 19
  label: {
    title: "Label the parts of the equation.",
    sub: "Drop each label into its box.",
    note: "4x means 4 times x.",
    chips: ["RHS", "Variable", "Equation", "LHS"],
    correct: {
      Variable: "Yes! x is the variable.",
      LHS: "Yes! 4x + 3 is the LHS.",
      RHS: "Yes! 19 is the RHS.",
      Equation: "Yes! The whole statement is an equation.",
    },
    miss1: "Look where the line points.",
    miss2: {
      Variable: "This line points to x, the symbol for an unknown value. That's the variable.",
      Equation: "This bracket covers the whole statement with =. That's the equation.",
      LHS: "This bracket is left of =. That's the LHS.",
      RHS: "This bracket is right of =. That's the RHS.",
    },
    done: "Brilliant! You labelled every part.",
  },

  // Activity: sort linear / nonlinear
  sort: {
    title: "Drop each equation into the correct box.",
    linear: "Linear equation",
    nonlinear: "Nonlinear equation",
    cards: [
      { eq: "x^2 + 2 = 7", linear: false },
      { eq: "2x + 3 = 11", linear: true },
      { eq: "x^2 = 16", linear: false },
      { eq: "x - 4 = 6", linear: true },
      { eq: "2x^2 + 1 = 9", linear: false },
      { eq: "x + 2 = 7", linear: true },
    ],
    correctLinear: "Correct! The highest power of x is 1.",
    correctNonlinear: "Correct! The highest power of x is 2.",
    miss1: "Check the highest power of x.",
    miss2Linear: "The highest power of x is 1, so this equation is linear.",
    miss2Nonlinear: "The highest power of x is 2, so this equation is nonlinear.",
    done: "Great sorting! You found every linear equation.",
  },

  // A quick recap: four panels on one equation; each panel adds one more label.
  recap: {
    title: "A quick recap",
    eq: "x + 4 = 9",
    labels: { variable: "Variable", equation: "Equation", lhs: "Left-hand side (LHS)", rhs: "Right-hand side (RHS)" },
    panels: [
      { id: "recap-1", text: "A variable is a symbol that represents a value.", show: ["variable"] },
      { id: "recap-2", text: "An equation states that two expressions have equal values.", show: ["variable", "equation"] },
      { id: "recap-3", text: "The expression to the left of the equals sign is the left-hand side.", show: ["variable", "equation", "lhs"] },
      { id: "recap-4", text: "The expression to the right of the equals sign is the right-hand side.", show: ["variable", "equation", "lhs", "rhs"] },
    ],
  },

  /*
   * Practice: six equations. The child types x on the keypad.
   * Right first time: the check is shown and the next equation starts.
   * Wrong: the game shows why (LHS ≠ RHS), then solves it step by step with the child and checks it.
   * lhs describes the left side so the game can work it out for any answer the child types:
   *   { k, op, c } = k·x + c or k·x − c;  { div } = x ÷ div;  { mul, op, c } = mul(x + c).
   * Step kinds: ask (two choices), act (one button), type (type a number on the keypad).
   */
  practice: {
    stepTitles: { try: "Try independently", right: "Correct answer: {x}", wrong: "Let's find x step by step", check: "Check the solution", done: "All done!" },
    find: "Find x.",
    lines: {
      find: "Find x: {eq}.",
      howTo: "Type your answer on the keypad, then tap Check.",
      right: "Both sides equal {r}. So, {x} is the solution.",
      wrong: "The left side equals {l}, and the right side equals {r}. They're different, so {a} is not a solution. Let's find x step by step.",
      typeAgain: "Not quite. Work out {expr}.",
      typeHint: "{expr} = {ans}. Type {ans}.",
      askAgain: "Not quite. Try the other one.",
      check: "Now check in the original equation. Put {x} in place of x.",
      checkAgain: "Not quite. Work out {expr}.",
      checkRight: "Both sides are equal. Your solution works!",
    },
    words: {
      yourAnswer: "Your answer:",
      bothEqual: "Both sides equal {r}.",
      stepByStep: "Let's find x step by step.",
      works: "When the sides match, your solution works.",
      allDone: "You solved all {n} equations!",
      check: "Check",
    },
    problems: [
      {
        eq: "x + 6 = 17", x: 11, lhs: { k: 1, op: "+", c: 6 }, rhs: 17,
        steps: [
          { kind: "ask", title: "Undo the addition", show: "x <<+ 6>> = 17", say: "What undoes adding 6?",
            choices: ["Add 6", "Subtract 6"], answer: 1, right: "Yes! Subtracting 6 undoes adding 6." },
          { kind: "type", title: "Subtract from BOTH sides", lines: ["x + 6 {{− 6}} = 17 {{− 6}}"], prompt: "x = 17 − 6 =",
            say: "Subtract 6 from both sides. What is 17 − 6?", expr: "17 − 6", answer: 11 },
        ],
        check: { lhs: "11 + 6", options: [16, 17, 18] },
      },
      {
        eq: "3x + 5 = 26", x: 7, lhs: { k: 3, op: "+", c: 5 }, rhs: 26,
        steps: [
          { kind: "ask", title: "Undo adding 5", show: "3x <<+ 5>> = 26", say: "What undoes adding 5?",
            choices: ["Add 5", "Subtract 5"], answer: 1, right: "Yes! Subtracting 5 undoes adding 5." },
          { kind: "type", title: "Undo adding 5", lines: ["3x + 5 {{− 5}} = 26 {{− 5}}"], prompt: "3x =",
            say: "Subtract 5 from both sides. What is 26 − 5?", expr: "26 − 5", answer: 21 },
          { kind: "type", title: "Find one lot of x", lines: ["3x = 21", "Divide both sides by 3.", "[[3x|3]] = [[21|3]]"], prompt: "x =",
            say: "3x = 21. Divide both sides by 3. What is 21 ÷ 3?", expr: "21 ÷ 3", answer: 7 },
        ],
        check: { lhs: "3 × 7 + 5", options: [23, 26, 28] },
      },
      {
        eq: "x - 7 = 12", x: 19, lhs: { k: 1, op: "−", c: 7 }, rhs: 12,
        steps: [
          { kind: "act", title: "Undo subtracting 7", show: "x <<− 7>> = 12", note: "Adding 7 undoes subtracting 7.",
            button: "Add 7 to BOTH sides", say: "Adding 7 undoes subtracting 7. Tap the button to add 7 to both sides." },
          { kind: "type", title: "Add to both sides", lines: ["x − 7 {{+ 7}} = 12 {{+ 7}}"], prompt: "x = 12 + 7 =",
            say: "Add 7 to both sides. What is 12 + 7?", expr: "12 + 7", answer: 19 },
        ],
        check: { lhs: "19 − 7", options: [11, 12, 26] },
      },
      {
        eq: "[[x|4]] = 6", x: 24, lhs: { div: 4 }, rhs: 6,
        steps: [
          { kind: "act", title: "Undo dividing by 4", show: "[[x|<<4>>]] = 6", note: "Multiplying by 4 undoes dividing by 4.",
            button: "Multiply BOTH sides by 4", say: "Multiplying by 4 undoes dividing by 4. Tap the button to multiply both sides by 4." },
          { kind: "type", title: "Multiply both sides", lines: ["[[x|4]] {{× 4}} = 6 {{× 4}}"], prompt: "x = 6 × 4 =",
            say: "Multiply both sides by 4. What is 6 × 4?", expr: "6 × 4", answer: 24 },
        ],
        check: { lhs: "[[24|4]]", options: [4, 6, 8] },
      },
      {
        eq: "2x + 7 = 1", x: -3, lhs: { k: 2, op: "+", c: 7 }, rhs: 1, hint: "x can be negative too.",
        steps: [
          { kind: "type", title: "Undo adding 7", show: "2x <<+ 7>> = 1", note: "Subtract 7 from both sides.", lines: ["2x + 7 {{− 7}} = 1 {{− 7}}"],
            prompt: "2x =", say: "Subtract 7 from both sides. What is 1 − 7?", expr: "1 − 7", answer: -6 },
          { kind: "type", title: "Divide both sides by 2", lines: ["2x = −6", "[[2x|2]] = [[−6|2]]"], prompt: "x =",
            say: "Divide both sides by 2. What is −6 ÷ 2?", expr: "−6 ÷ 2", answer: -3 },
        ],
        check: { lhs: "2 × (−3) + 7", options: [-1, 1, 13] },
      },
      {
        eq: "3(x + 2) = 21", x: 5, lhs: { mul: 3, op: "+", c: 2 }, rhs: 21, hint: "3 multiplies the whole bracket.",
        steps: [
          { kind: "type", title: "Undo multiplying by 3", show: "<<3>>(x + 2) = 21", note: "Divide BOTH sides by 3.", lines: ["[[3(x + 2)|3]] = [[21|3]]"],
            prompt: "x + 2 =", say: "Divide both sides by 3. What is 21 ÷ 3?", expr: "21 ÷ 3", answer: 7 },
          { kind: "type", title: "Undo adding 2", show: "x <<+ 2>> = 7", note: "Subtract 2 from BOTH sides.", lines: ["x + 2 {{− 2}} = 7 {{− 2}}"],
            prompt: "x =", say: "Subtract 2 from both sides. What is 7 − 2?", expr: "7 − 2", answer: 5 },
        ],
        check: { lhs: "3(5 + 2)", options: [17, 21, 27] },
      },
    ],
  },

  // Word Treasure (glossary). Gems are collected when each word is first taught.
  words: [
    { id: "variable", word: "Variable", meaning: "A symbol that represents a value", example: "x", color: "#F2C230" },
    { id: "constant", word: "Constant", meaning: "A number with a fixed value", example: "2", color: "#F08A24" },
    { id: "expression", word: "Algebraic expression", meaning: "Variables and constants joined by operations such as + and −", example: "x + 2", color: "#9B5DE5" },
    { id: "equation", word: "Equation", meaning: "A statement that two expressions have equal values", example: "x + 2 = 7", color: "#2BB673" },
    { id: "lhs", word: "LHS", meaning: "The expression to the left of the equals sign", example: "x + 2", color: "#1FA3A3" },
    { id: "rhs", word: "RHS", meaning: "The expression to the right of the equals sign", example: "7", color: "#D9971E" },
    { id: "linear", word: "Linear equation in one variable", meaning: "One variable, and its highest power is 1", example: "x + 2 = 7", color: "#3D8BFD" },
    { id: "solution", word: "Solution", meaning: "A value that makes an equation true", example: "x = 5", color: "#E5484D" },
  ],

  finale: {
    title: "Quest complete!",
    cards: [
      "A level balance shows an equation: LHS = RHS.",
      "To check a value, replace x. If LHS = RHS, it's the solution.",
      "Do the same thing to both sides to find x directly.",
    ],
    chapters: "Chapters",
  },

  // Sound settings. To use recorded audio, set recordedVoice: true and add assets/vo/<line id>.mp3,
  // or map any sound cue to a file, e.g. overrides: { "zippy.laugh": "assets/audio/zippy-laugh.mp3" }.
  audio: {
    recordedVoice: false,
    overrides: {},
  },
};
