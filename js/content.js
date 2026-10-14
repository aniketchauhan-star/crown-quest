/*
 * Zippy's Crown Quest: all words, numbers and feedback live here.
 * Teachers can edit any text or level number in this file without touching the game logic.
 * {n}, {v}, {a}, {b}, {s} are filled in by the game (see the comments next to each block).
 * Each line ID is also the file name for an optional recorded voice line: assets/vo/<id>.mp3
 */
window.CONTENT = {
  title: {
    name: "Zippy's Crown Quest",
    subtitle: "Class 8 • Linear Equations",
    tagline: "Select a replacement. Swap. Keep Grumble asleep.",
    tap: "Tap to start",
    continue: "Continue",
    newGame: "Start again",
    loading: "Loading the treasure room…",
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
    "intro-1": "Shhh… This is Grumble. He guards the treasure.",
    "intro-2": "Luckily, he's fast asleep!",
    "intro-3": "Meet Zippy!",
    "intro-4": "He spots a golden crown in the treasure room.",
    "intro-5": "Careful! If the balance tips, Grumble will wake up.",
    "intro-6": "Let's swap the crown for something just as heavy. That should keep the balance level!",
    "intro-7": "Each gold coin has a mass of 1 unit.",
    "intro-8": "The number on each gold bar is its mass.",

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
    "l4-4": "How can we find its mass?",
    "l4-5": "The crown's mass is unknown. Let's call it x.",
    "l4-6": "The crown and two coins have a total mass of x + 2.",
    "l4-7": "They balance 7 units.",
    "l4-8": "So, x + 2 = 7.",
    "l4-9": "Hmm… let's find x, so Zippy can make the swap.",
    "l4-10": "Here, x represents the crown's mass — the value we want to find.",
    "l4-11": "A letter used to represent an unknown value is called a variable. Here, our variable is x.",
    "l4-12": "Now look at x + 2. It represents the crown and the two coins together.",
    "l4-13": "It consists of a variable, x, and a constant, 2, joined by addition.",
    "l4-13b": "A constant is a number with a fixed value.",
    "l4-14": "Joining x and 2 with addition gives the algebraic expression x + 2.",
    "l4-15": "The balance tells us that x + 2 equals 7.",
    "l4-16": "This statement of equality is an equation.",
    "l4-17": "Everything to the left of the equals sign is the left-hand side.",
    "l4-18": "Everything to the right is the right-hand side.",
    "l4-19": "This equation has one variable: x.",
    "l4-20": "When we write x, its power is 1.",
    "l4-21": "There is one variable, and its highest power is 1.",
    "l4-22": "This is a linear equation in one variable.",
    "l4-recap": "Look at all the words in your treasure! Now let's find the crown's mass.",
    "l4-23": "Now let's find the crown's mass.",
    "l4-24": "We need a value of x that makes both sides equal.",
    "l4-25": "Let's check 4 by replacing x with 4.",
    "l4-25-tap": "Tap the 4 bar.",
    "l4-26": "The left side is 6, but the right side is 7. So, 4 doesn't work.",
    "l4-27": "Now let's try 5 by replacing x with 5.",
    "l4-27-tap": "Tap the 5 bar.",
    "l4-28": "Both sides equal 7.",
    "l4-29": "A value that makes an equation true is called its solution. So, 5 is the solution.",
    "l4-30": "So, the crown is 5 units.",

    // Levels 5–7: check before you swap.  {v} = value tried, {a} = coins beside the crown, {b} = right side, {s} = v + a
    "l5-0": "Another crown, with 3 coins beside it. So, x + 3 = 9.",
    "l5-give": "Give the {v} bar to Zippy.",
    "l6-0": "Another crown, with 4 coins beside it. So, x + 4 = 11.",
    "l7-0": "Another crown! This crown and 2 coins balance 10 coins.",
    "l7-0b": "So, x + 2 = 10.",
    "choose": "Choose a value for x.",
    "check-intro": "Smart treasure hunters check before they swap!",
    "check-replace": "Replace x with {v}.",
    "check-lets": "Let's check {v}.",
    "check-find": "Find the value of each side.",
    "check-compare": "LHS = {s}, RHS = {b}.",
    "check-not-guided": "{s} ≠ {b}. {v} doesn't work. Try another value.",
    "check-not": "{s} ≠ {b}. {v} isn't a solution.",
    "check-try-another": "Try another value.",
    "check-equal": "Both sides equal {b}.",
    "check-confirm": "LHS: {v} + {a} = {b}. RHS: {b}. Both sides equal {b}.",
    "check-solution": "x = {v}. {v} is the solution!",
    "check-solution-short": "{v} is the solution!",
    "check-now-swap": "Now Zippy can swap. Tap Swap!",
    "crown-is": "The crown is {v} units, and Zippy collects it!",
    "hint-lhs": "Add: {v} + {a}. Count on from {v}: {seq}.",
    "hint-rhs": "RHS is the number on the right of =.",
    "l7-tip10": "10 balances the crown AND the 2 coins, so the crown alone must be less than 10.",
    "l7-tip12": "12 + 2 = 14. That's even heavier than all 10 coins!",

    // Level 8: the smart way
    "l8-1": "Zippy spots another crown!",
    "l8-2": "So many coins! This 8 bar is as heavy as 8 coins.",
    "l8-3": "We could try different values again. But that might take a while.",
    "l8-4": "Let's find the crown's mass directly.",
    "l8-5": "There are 8 extra units beside the crown. Let's remove them.",
    "l8-5-drag": "Drag the 8 off the left pan.",
    "l8-uhoh": "Uh-oh! The balance tipped.",
    "l8-6": "To keep the balance level, we remove 8 units from the other side too.",
    "l8-6-drag": "Drag the other 8 off the right pan.",
    "l8-7": "Subtracting 8 undoes adding 8. That leaves x = 15.",
    "l8-8": "Before Zippy swaps, let's check. Replace x with 15.",
    "l8-9": "Both sides equal 23. So, 15 is the solution.",
    "l8-10": "That's our match! Zippy can make the swap.",
    "l8-10-give": "Give the 15 bar to Zippy, then tap Swap.",

    // Finale
    "fin-1": "Quest complete! Zippy collected all 8 crowns — and Grumble is still snoring!",
    "fin-2": "Here's what you learned on your quest.",
  },

  // Zippy's own lines (speech bubble + his voice).
  zippy: {
    ooh: "Ooh!",
    sleepTight: "Hee hee! Sleep tight, Grumble!",
    phew: "Phew!",
    checked: "Phew! Good thing we checked.",
    tryN: "Let's try {v}.",
    thatWorks: "That works!",
    idea: "I know!",
    yawn: "This could take ages…",
  },

  // Grumble's noises (comic text) and his one sleepy line.
  grumble: {
    tap: "Mmm… five more minutes…",
    stir: "HRRM?",
    roar: "GRRRUMBLE!",
  },

  ui: {
    next: "Next",
    back: "Back",
    swap: "SWAP",
    tried: "Tried",
    skip: "Skip",
    level: "Level",
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
    coinsTag: "= {n} coins",
  },

  // Chapter select (menu). id = where the chapter starts.
  chapters: [
    { id: "intro", title: "Intro", sub: "Meet Zippy & Grumble" },
    { id: "L1", title: "The Swap", sub: "Levels 1–3" },
    { id: "L4a", title: "The Mystery Crown", sub: "Level 4" },
    { id: "L5", title: "Practice", sub: "Levels 5–7" },
    { id: "L8", title: "The Smart Way", sub: "Level 8" },
    { id: "finale", title: "Finale", sub: "Quest complete" },
  ],

  /*
   * Levels. crown = the crown's hidden mass. left = coins beside the crown. right = coins on the
   * right pan, stacked bottom row first (rows of at most 4). bars = the three gold bars (shown in a
   * new random order each time). chips = the three number choices for each blank in the check.
   */
  levels: {
    L1: { n: 1, kind: "swap", crown: 5, left: 0, right: [3, 2], bars: [3, 5, 7], intro: ["l1-1", "l1-2"] },
    L2: { n: 2, kind: "swap", crown: 7, left: 0, right: [4, 3], bars: [5, 7, 9], intro: ["l2-1"] },
    L3: { n: 3, kind: "swap", crown: 4, left: 0, right: [2, 2], bars: [3, 4, 6], intro: ["l3-1"] },
    L4: { n: 4, kind: "mystery", crown: 5, left: 2, right: [4, 3], bars: [4, 5, 7] },
    L5: {
      n: 5, kind: "guided", crown: 6, left: 3, right: [3, 3, 3], bars: [4, 6, 7], tries: [4, 6],
      intro: ["l5-0"],
      chips: { 4: { lhs: [6, 7, 9], rhs: [3, 7, 9] }, 6: { lhs: [8, 9, 10], rhs: [3, 6, 9] } },
    },
    L6: {
      n: 6, kind: "independent", crown: 7, left: 4, right: [4, 4, 3], bars: [5, 8, 7],
      intro: ["l6-0"],
      chips: {
        8: { lhs: [11, 12, 13], rhs: [4, 8, 11] },
        5: { lhs: [8, 9, 10], rhs: [4, 5, 11] },
        7: { lhs: [10, 11, 12], rhs: [4, 7, 11] },
      },
    },
    L7: {
      n: 7, kind: "independent", crown: 8, left: 2, right: [4, 4, 2], bars: [10, 8, 12],
      intro: ["l7-0", "l7-0b"],
      chips: {
        10: { lhs: [11, 12, 13], rhs: [2, 10, 12] },
        12: { lhs: [13, 14, 15], rhs: [2, 10, 12] },
        8: { lhs: [9, 10, 11], rhs: [2, 8, 10] },
      },
      tips: { 10: "l7-tip10", 12: "l7-tip12" },
    },
    L8: {
      n: 8, kind: "smart", crown: 15, leftBar: 8, rightBar: 23, bars: [15, 23, 31],
      chips: { 15: { lhs: [22, 23, 24] } },
    },
  },

  // Activity C: label the parts of 4x + 3 = 19
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
      Variable: "This line points to x, the letter for an unknown value. That's the variable.",
      Equation: "This bracket covers the whole statement with =. That's the equation.",
      LHS: "This bracket is left of =. That's the LHS.",
      RHS: "This bracket is right of =. That's the RHS.",
    },
    done: "Brilliant! You labelled every part.",
  },

  // Activity E: sort linear / nonlinear
  sort: {
    title: "Drop each equation into the correct box.",
    linear: "Linear equation",
    nonlinear: "Nonlinear equation",
    cards: [
      { eq: "x^2 + 2 = 7", linear: false },
      { eq: "2x + 3 = 11", linear: true, tip: "2x means 2 times x, so the power is still 1." },
      { eq: "x^2 = 16", linear: false },
      { eq: "x - 4 = 6", linear: true },
      { eq: "2x^2 + 1 = 9", linear: false, tip: "x² means x times x, so that's power 2." },
      { eq: "x + 2 = 7", linear: true },
    ],
    correctLinear: "Correct! The highest power of x is 1.",
    correctNonlinear: "Correct! The highest power of x is 2.",
    miss1: "Check the highest power of x.",
    miss2Linear: "The highest power of x is 1. So, it's a linear equation.",
    miss2Nonlinear: "The highest power of x is 2. So, it's a nonlinear equation.",
    done: "Great sorting! You found every linear equation.",
  },

  // Word Treasure (glossary). Gems are collected when each word is first taught.
  words: [
    { id: "variable", word: "Variable", meaning: "A letter for an unknown value", example: "x", color: "#F2C230" },
    { id: "constant", word: "Constant", meaning: "A number with a fixed value", example: "2", color: "#F08A24" },
    { id: "expression", word: "Algebraic expression", meaning: "Variables and constants joined by operations such as + and −", example: "x + 2", color: "#9B5DE5" },
    { id: "equation", word: "Equation", meaning: "A statement that two sides are equal", example: "x + 2 = 7", color: "#2BB673" },
    { id: "lhs", word: "LHS", meaning: "Everything to the left of the = sign", example: "x + 2", color: "#1FA3A3" },
    { id: "rhs", word: "RHS", meaning: "Everything to the right of the = sign", example: "7", color: "#D9971E" },
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
