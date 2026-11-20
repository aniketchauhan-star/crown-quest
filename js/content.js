/*
 * Zippy's Crown Quest: all words, numbers and feedback live here.
 * Teachers can edit any text or level number in this file without touching the game logic.
 * {n}, {v}, {a}, {b}, {s} are filled in by the game (see the comments next to each block).
 * Every line the game shows is also recorded (assets/vo/, matched by its exact text). If you change
 * the words of a line, record it again: see docs/VOICEOVER.md. Until then it is read by the device voice.
 *
 * Maths in any text: x is set in italics by itself; "x^2" shows a power; "[[x|4]]" is a fraction
 * (x over 4); "{{− 8}}" is the "same on both sides" highlight; "<<+ 4>>" is a red highlight.
 * A highlight lights the numbers only: its + − × ÷ stay plain ("{{− 8}}" shows − then a boxed 8).
 */
window.CONTENT = {
  title: {
    name: "Zippy's Crown Quest", // browser tab name (the title screen shows only its painted title)
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
    "intro-1": "Meet Zippy! He's spotted a golden crown!",
    "intro-2": "But Grumble guards the treasure.",
    "intro-3": "Luckily, he's asleep!",
    "intro-4": "If the balance tips, the alarm will wake him!",
    "intro-5": "Let's swap the crown without tipping the balance!",
    "intro-6": "Each coin weighs 1 unit.",

    // Levels 1–3: the swap
    "l1-1": "Which bar should Zippy choose?",
    "l1-2": "Drag it to Zippy, then tap Swap.",
    "l2-1": "Another crown! Let's collect it!",
    "l3-1": "One more crown! Grumble's still asleep!",
    "swap-hint2": "The crown balances {n} coins. Try the {n}-unit bar!",
    "swap-tap-swap": "Now tap Swap!",
    // after every wrong bar, in every level where the child picks a bar (user, 2026-11-19, with their own
    // recording; it took the place of "Give Zippy a gold bar." in Levels 1–3 and "Try another value!" in
    // Levels 6–7)
    "wrong-bar": "Oops! The balance tipped. Try another bar!",

    // Level 4: the mystery crown
    "l4-1": "Wait! This crown has two coins beside it.",
    "l4-2": "Together, they balance 7 coins.",
    "l4-3": "But Zippy needs to replace only the crown.",
    "l4-4": "How much does the crown weigh?",
    "l4-5": "Let's call the crown's mass x.",
    "l4-6": "Together, the crown and coins weigh x + 2 units.",
    "l4-7": "They balance 7 units on the other side.",
    "l4-8": "So, x + 2 = 7.",
    "l4-9": "Let's find x to help Zippy swap!", // (shorter: review, 2026-11-13; it was "Hmm… let's find the value of x so…")
    "l4-10": "Here, x represents the crown's mass.", // (review, 2026-11-13; it was "…mass — the value we want to find.")
    // a variable, in two lines (review, 2026-11-13: "Split the VO across two screens"; it was one line, "A
    // variable is a symbol used to represent a value. Here, our variable is x, and its value is unknown.")
    "l4-11": "A variable is a symbol that represents a value.",
    "l4-11b": "x is our variable. Its value is unknown.",
    "l4-12": "x + 2 represents the crown and two coins together.",
    "l4-13": "x is a variable, and 2 is a constant.",
    "l4-14": "Together, they form the algebraic expression x + 2.", // (review, 2026-11-13; it was "Joining x and 2 with addition gives…")
    "l4-15": "The balance shows x + 2 = 7.",
    "l4-16": "A statement that says two expressions have equal values is called an equation.",
    "l4-17": "The expression to the left of the equals sign is called the left-hand side, or LHS.",
    "l4-18": "The expression to the right of the equals sign is called the right-hand side, or RHS.",
    // back from the label activity to the formula screen (review, 2026-11-13: "Add a transition")
    "l4-19a": "Let's return to the crown's equation.",
    "l4-19": "This equation has one variable, x.",
    // x's power in two lines (review, 2026-11-13: "Split it into two screens"; it was "When we write x, its
    // power is 1. We usually leave the 1 unwritten.")
    "l4-20": "The power of x is 1.",
    "l4-20b": "We usually leave the power 1 unwritten.",
    "l4-21": "It has one variable with a highest power of 1.",
    "l4-22": "This is a linear equation in one variable.", // (review, 2026-11-13; it was "So, it is a linear equation in one variable.")
    "l4-23": "Now let's find the crown's mass.",
    "l4-24": "We need x to make both sides equal.",
    "l4-25": "Let's try x = 4. Find the value of each side.",
    // a side at a time (review, 2026-11-13: "Screen 1: 'The left-hand side equals 6.' Screen 2: 'The
    // right-hand side equals 7.'"), and the same for 5. Then, as in every check, two screens: the
    // balance (check-diff / check-same, below) and what the value is (check-not-sol; for 5, l4-29)
    // (review, 2026-11-18: "Split the ending into two screens… We can do like this for all values we are
    // trying and for every equation"; they were "They're different, so 4 is not a solution." and "Both
    // sides equal 7.")
    // In every spoken line the sides are named in full, "left-hand side" and "right-hand side", never
    // "LHS"/"RHS" (user, 2026-11-19); LHS and RHS stay only where they are written as names: the working's
    // rows (ui.lhs, ui.rhs), the labels, and "…called the left-hand side, or LHS." that introduces them.
    "l4-26": "The left-hand side is 6.",
    "l4-26b": "The right-hand side is 7.",
    "l4-27": "Now try x = 5. Find both sides.",
    "l4-28": "The left-hand side is 7.",
    "l4-28b": "The right-hand side is 7.",
    "l4-29": "A value that makes an equation true is its solution. So, x = 5!",
    "l4-30": "The crown weighs 5 units. Zippy can swap it!",
    "l4-give": "Drag the 5-unit bar to Zippy, then tap Swap.", // (x = 5 is known: review, 2026-11-08)

    // Levels 5–9: check before you swap.  {v} = value tried, {s} = the left side's value, {b} = the right side
    "l5-give": "Give Zippy the {v}-unit bar.",
    "check-replace": "Replace x with {v}.",
    // a side at a time (review, 2026-11-13: "Change the instruction to 'Find the value of the left-hand
    // side.' Only LHS is being asked here"; it was "Find the value of each side.")
    "check-find-lhs": "Find the left-hand side.",
    "check-find-rhs": "Now find the right-hand side.",
    "check-now-swap": "Now Zippy can swap. Tap Swap!",
    "check-lets": "Let's check {v}.",
    "check-next": "Now let's check {v}.", // Level 7 (levels: say.nextTry)
    "check-next-try": "Now try x = {v}.", // Level 6
    // Once both sides are worked out, a line each (review, 2026-11-13: "1. 'The left-hand side equals 7.'
    // 2. 'The right-hand side equals 9.'"). Then the ending, on two screens (review, 2026-11-18: "Split the
    // ending into two screens: 1. Check the value. Keep the aligned calculations… VO: 'Both sides have the
    // same value. The balance is level!' 2. Confirm the solution. Fade the calculations and change 'Try
    // x = 6' to a clear x = 6… VO: 'So, x = 6 is the solution.' … We can do like this for all values we
    // are trying and for every equation as one screen currently looks cluttered"): the balance first
    // (the same, or different: it tips), then what the value is. A value that is not a solution has the
    // same two screens, in the same words. (They were one screen: "Both sides equal 9. So, 6 is the
    // solution. Zippy can use the 6-unit bar!", and "They're different, so 4 is not a solution.", with
    // 9 = 9 or 7 ≠ 9 and a written verdict under the working.)
    "check-lhs-is": "The left-hand side is {s}.",
    "check-rhs-is": "The right-hand side is {b}.",
    "check-same": "Both sides are equal! The balance stays level!",
    "check-diff": "The values differ! The balance tips!",
    "check-sol": "So, x = {v} is the solution!",
    "check-not-sol": "So, x = {v} is not a solution.",
    // Level 6's question, with the user's own recording (2026-11-19; it was "Choose a value for x. Are both
    // sides equal?"): the crown glows on "Another crown!", the gold bars on "Which gold bar" (flow.js)
    "l6-prompt": "Another crown! Which gold bar will keep the balance level?",
    "l7-prompt": "Another crown! Together with two coins, it balances 10 coins. Find x!",
    "l7-support": "Replace x with your value. Compare both sides.",
    // (a wrong number in a check gets no hint, only the screen's shake and its red corners: asked
    // 2026-11-19; "Add 4 + 3. Count on: 5, 6, 7.", "2 × 7 = 14. Add 4 to get 18." and the right-hand side's
    // "The right-hand side is the number on the right of the equals sign." are no longer said)

    // Level 8: the smart way
    "l8-1": "Zippy spots another crown!",
    "l8-2": "The crown and 8 units balance 23 units.", // (review, 2026-11-08)
    // two tries on the balance, a line each (review, 2026-11-13; it was "Let's try different values of x.")
    "l8-try": "Let's try x = 10.",
    "l8-try2": "How about x = 12?",
    "l8-3": "Guessing could take a while!",
    "l8-4": "Can we solve this without guessing?", // (review, 2026-11-13; it was "Let's find the mass of the crown directly.")
    "l8-5": "Split 23 into 8 and 15.", // (review, 2026-11-13; it was "First, split 23 into 8 and 15.")
    "l8-6": "There are 8 extra units beside the crown. Let's remove them.",
    "l8-7": "Remove 8 units from both sides.", // (review, 2026-11-13; it was "To keep the balance level, we must remove 8 units from both sides.")
    "l8-8-drag": "Drag an 8-unit bar off each side.", // (review, 2026-11-08: one side at a time)
    "l8-other": "Now remove 8 from the other side.",
    "l8-9": "The crown balances 15 units. So, x = 15!",
    "l8-10": "Before swapping, let's check the original equation.",
    "l8-11": "Replace x with 15.",
    "l8-14": "The crown weighs 15 units. Time to swap!",
    "l8-give": "Give Zippy the 15-unit bar, then tap Swap.",

    // Level 9: two matching crowns
    "l9-1": "Each crown has the same mass, x.",
    "l9-2": "Two crowns together have a mass of 2x.",
    // as in Level 8 (review, 2026-11-13): the split first, then the 4 units beside the crowns, then
    // removing 4 from both sides (they were "First, let's remove these 4 units.", before the split, "Split
    // 18 into 4 and 14." and "Remove 4 from both sides.")
    "l9-4": "Split 18 into 4 and 14.",
    "l9-3": "There are 4 extra units beside the crowns. Let's remove them.",
    "l9-5": "Remove 4 units from both sides.",
    "l9-5-drag": "Drag a 4-unit bar off each side.", // (review, 2026-11-08: as in Level 8)
    "l9-other": "Now remove 4 from the other side.",
    "l9-two": "Two crowns balance 14 units.", // (review, 2026-11-08)
    "l9-6": "But what does one crown weigh?",
    "l9-7": "Divide both sides into two equal groups.", // (review, 2026-11-08)
    "l9-8": "Each crown weighs 7 units. So, x = 7!", // (review, 2026-11-08)
    "l9-9": "Let's check with x = 7.",
    "l9-give": "Give Zippy a 7-unit bar, then tap Swap.",
    "l9-give2": "One more crown! Give Zippy the other 7-unit bar.",

    // Every crown Zippy wins: once he has it, the only voice (user, 2026-11-19). His first crown (Level
    // 1) has the first line, only that once; every crown after it, to the last, has the second. (They
    // took the place of "Perfect swap! Both weigh 5 units!", "Perfect! Both weigh {n} units!" in Levels
    // 2–3, "It worked! Another crown collected, and Grumble's still asleep!" in Level 8, and Zippy's
    // "Hee hee! Sleep tight, Grumble!".)
    "crown-first": "Woohoo! Zippy got his first crown!",
    "crown-another": "Woohoo! Zippy got another crown!",

    // Practice: try a few equations (the words for each equation are in `practice` below)
    "p-intro": "You've helped Zippy find the crowns' masses. Now try a few equations!",

    // Finale (heard, not shown in the question bar: Zippy dances; the title and the replay button are
    // in `finale`, below)
    "fin-1": "Quest complete! Zippy collected all crowns, and Grumble's still snoring!",
  },

  // Zippy's own lines (speech bubble + his voice).
  zippy: {
    checked: "Phew! Good thing we checked!",
    tryN: "Let's try {v}.",
    tryNext: "Now let's try {v}.",
  },

  // Grumble's noises (comic text) and his one sleepy line.
  grumble: {
    tap: "Mmm… five more minutes…",
    stir: "HRRM?",
    roar: "GRRRUMBLE!",
    alarm: "RING! RING!",
  },

  ui: {
    tryWord: "Try", // the check's "Try x = 4" (review, 2026-11-13); it fades as the try's verdict comes (2026-11-18)
    back: "Back",
    next: "Next",
    swap: "SWAP",
    tried: "Tried",
    skip: "Skip",
    level: "Level",
    practice: "Practice",
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
    screens: "All the screens", // the list in the top left corner (read by screen readers)
    replay: "Play this screen again",
    unit: "1 unit",
    // the two sides, as they are written in the working (the check, Level 4's try, practice)
    lhs: "LHS",
    rhs: "RHS",
    // read by screen readers only (not shown): the question bar's hear-it-again button, the gold bars ({v} = the
    // bar's number; {side} = left or right), the boxes to fill in, practice's list of answers and its answer box
    // before its tiles are out
    hearAgain: "Hear it again",
    goldBar: "Gold bar {v}",
    goldBarTried: "Gold bar {v}, already tried",
    goldBarOff: "Gold bar {v} on the {side} pan: take it off the balance",
    sides: { left: "left", right: "right" },
    lhsValue: "Left-hand side value",
    rhsValue: "Right-hand side value",
    emptyBox: "Empty label box",
    answers: "Answers",
    showAnswers: "Answer box: tap to see the numbers",
  },

  // The words written on Level 4's formula screen, each as the voice names its part (js/activities.js:
  // NB_WORDS, NB_TRY, NB_LINEAR)
  formula: {
    variable: "Variable", // under x, on "Here, x is the variable."
    variableWord: "variable", // on "Here x is a variable, and 2 is a constant. We add them together."
    constant: "constant",
    addition: "addition",
    expression: "Algebraic expression",
    equation: "Equation",
    lhs: "Left-hand side (LHS)",
    rhs: "Right-hand side (RHS)",
    linear: "Linear equation in one variable",
  },

  // Every screen of the quest, in order: the list in the top left corner jumps to any of them (and
  // shows which one is on). id = where it starts; n = the badge in front of its name.
  screens: [
    { id: "intro", n: "★", title: "Intro: meet Zippy and Grumble" },
    { id: "L1", n: "1", title: "Level 1: which bar?" },
    { id: "L2", n: "2", title: "Level 2: another crown" },
    { id: "L3", n: "3", title: "Level 3: one more crown" },
    { id: "L4a", n: "4", title: "Level 4: the mystery crown, x + 2 = 7" },
    { id: "L4c", n: "4", title: "Level 4: label the parts" },
    { id: "L4e", n: "4", title: "Level 4: sort, and a quick recap" },
    { id: "L4g", n: "4", title: "Level 4: find the solution" },
    { id: "L5", n: "5", title: "Level 5: check it, step by step" },
    { id: "L6", n: "6", title: "Level 6: your turn" },
    { id: "L7", n: "7", title: "Level 7: your turn again" },
    { id: "L8", n: "8", title: "Level 8: the smart way" },
    { id: "L9", n: "9", title: "Level 9: two crowns" },
    { id: "P", n: "P", title: "Practice: six equations" },
    { id: "finale", n: "♛", title: "Finale: quest complete" },
  ],

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
   * (The line after each crown is "crown-first" / "crown-another", above.)
   */
  levels: {
    L1: { n: 1, kind: "swap", crown: 5, left: 0, right: [3, 2], bars: [3, 5, 7], intro: ["l1-1", "l1-2"] },
    L2: { n: 2, kind: "swap", crown: 7, left: 0, right: [4, 3], bars: [5, 7, 9], intro: ["l2-1"] },
    L3: { n: 3, kind: "swap", crown: 4, left: 0, right: [2, 2], bars: [3, 4, 6], intro: ["l3-1"] },
    L4: { n: 4, kind: "mystery", crown: 5, left: 2, right: [4, 3], bars: [4, 5, 7] },
    L5: {
      n: 5, kind: "guided", crown: 6, left: 3, right: [3, 3, 3], bars: [4, 6, 7], tries: [4, 6],
      chips: { 4: { lhs: [6, 7, 9], rhs: [3, 7, 9] }, 6: { lhs: [8, 9, 10], rhs: [3, 6, 9] } },
    },
    // Levels 6–7: the child chooses. say = the narrator's line for each moment of the check (its ending
    // is the same in every check: check-same / check-diff, then check-sol / check-not-sol).
    L6: {
      n: 6, kind: "independent", crown: 7, left: 4, right: [4, 4, 3], bars: [5, 8, 7],
      intro: [],
      say: { prompt: "l6-prompt", firstTry: "check-lets", nextTry: "check-next-try" },
      chips: {
        8: { lhs: [11, 12, 13], rhs: [4, 8, 11] },
        5: { lhs: [8, 9, 10], rhs: [4, 5, 11] },
        7: { lhs: [10, 11, 12], rhs: [4, 7, 11] },
      },
    },
    L7: {
      n: 7, kind: "independent", crown: 8, left: 2, right: [4, 4, 2], bars: [10, 8, 12],
      intro: [],
      say: { prompt: "l7-prompt", firstTry: "l7-support", nextTry: "check-next" },
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
    // (the question bar says it; there is no heading on the board: review, 2026-11-07. The labels come
    // in two pairs, Variable and Equation, then LHS and RHS: js/activities.js, activityLabel)
    // from Level 4's formula screen into the activity (review, 2026-11-13: the balance fades out and
    // 4x + 3 = 19 comes to the middle meanwhile)
    bridge: "Can you identify these parts in another equation?",
    title: "Drag each label to the correct box.", // (text of 2026-11-19; it was "…to the matching box.")
    // into the second pair, and its instruction in the question bar while the child places LHS and RHS
    // (review, 2026-11-13: "Add the transition: 'Now, label the left-hand side and right-hand side.'");
    // the LHS box comes in on the first words here, the RHS box on the second
    pair2: "Now label the left-hand side and right-hand side.",
    pair2Cue: { LHS: "the left-hand", RHS: "and right-hand" },
    // the four labels, as written on their tiles (the keys are the game's own names for them)
    names: { Variable: "Variable", Equation: "Equation", LHS: "LHS", RHS: "RHS" },
    // (a right label: no words, only a success sound and a green border: review, 2026-11-07; a wrong one:
    // no words either, the screen shakes with red light at its corners and the label goes back for
    // another try: asked 2026-11-19. Until then a wrong label was explained and put in its box for the
    // child, "Not quite! x is the unknown value, so it's the variable.": reviews of 2026-11-13 and -16)
    done: "Brilliant! You labelled every part!", // (every label in)
  },

  // Activity: sort linear / nonlinear
  sort: {
    title: "Drag each equation into the correct box.",
    linear: "Linear equations",
    nonlinear: "Nonlinear equations",
    cards: [
      { eq: "x^2 + 2 = 7", linear: false },
      { eq: "2x + 3 = 11", linear: true },
      { eq: "x^2 = 16", linear: false },
      { eq: "x - 4 = 6", linear: true },
      { eq: "2x^2 + 1 = 9", linear: false },
      { eq: "x + 2 = 7", linear: true },
    ],
    // (a right card: no words, it snaps into place with a success sound: review, 2026-11-07; a wrong
    // one: no words either, the screen shakes with red light at its corners and the card goes back to
    // the tray, its panel glowing if it was wrong before: asked 2026-11-19. It was "Check the highest
    // power of x.", then "The highest power of x is 1, so this equation is linear.")
    done: "Great sorting! You found every linear equation.",
  },

  // A quick recap: four panels on one equation; each panel adds one more label.
  recap: {
    title: "A quick recap",
    eq: "x + 4 = 9",
    labels: { variable: "Variable", equation: "Equation", lhs: "Left-hand side (LHS)", rhs: "Right-hand side (RHS)" },
    panels: [
      // cue: the words that name the panel's new label (it comes in, its part lit, as they are said);
      // look: words before them on which its part lights up already ("to the left of the equals sign")
      { id: "recap-1", text: "A variable is a symbol that represents a value.", show: ["variable"], cue: "A variable" },
      { id: "recap-2", text: "An equation states that two expressions have equal values.", show: ["variable", "equation"], cue: "An equation" },
      { id: "recap-3", text: "The expression to the left of the equals sign is the left-hand side.", show: ["variable", "equation", "lhs"], look: "to the left", cue: "the left-hand" },
      { id: "recap-4", text: "The expression to the right of the equals sign is the right-hand side.", show: ["variable", "equation", "lhs", "rhs"], look: "to the right", cue: "the right-hand" },
    ],
  },

  /*
   * Practice: six equations (review, 2026-11-18). Before the first, a line to start on, with the
   * equation big in the middle. Each equation: "Find the value of x.", and the child chooses x from a
   * list (choices) and taps Check.
   * Right: the next equation (no check of it, no words: "once correct move to the next ques").
   * Wrong: the screen shakes and red light glows in from its corners, with no words (asked 2026-11-19;
   * it was "Not quite! Let's solve it together."), and the equation is solved on the board step by step,
   * every step staying in view under the one before (no two-choice questions, no notes written under
   * the working: "Directly state the step: Subtract 5 from both sides"). For each step the question bar
   * says it (say), its working row is written in under the rows before (work), and the child chooses
   * what its left side (get) equals. A wrong choice: the shake and the red light, no words (it was "Not
   * quite!", and after a second "26 − 5 = 21." with the answer put in), and the child chooses again;
   * after two, the right tile glows. The last step's answer is x. No check in the original equation
   * ("This checking not required in these 6 questions").
   * choices: the list's numbers, as the review's picture has them for x + 6 = 17 (17, 6, 11, 23): the
   * equation's own numbers, the answer, and what the wrong operation would give.
   */
  practice: {
    lines: {
      start: "Your turn! Solve an equation.", // before the first equation
      find: "Find the value of x.", // each equation (asked 2026-11-19; it was "Find x." for a day)
    },
    words: {
      choose: "Choose", // the list, before a number is chosen
      check: "Check",
    },
    problems: [
      {
        eq: "x + 6 = 17", x: 11, choices: [17, 6, 11, 23],
        steps: [
          { say: "Subtract 6 from both sides.", work: "x + 6 {{− 6}} = 17 {{− 6}}", get: "x", answer: 11, choices: [17, 6, 11, 23] },
        ],
      },
      {
        eq: "3x + 5 = 26", x: 7, choices: [26, 5, 7, 21],
        steps: [
          { say: "Subtract 5 from both sides.", work: "3x + 5 {{− 5}} = 26 {{− 5}}", get: "3x", answer: 21, choices: [26, 21, 5, 31] },
          { say: "Divide both sides by 3.", work: "[[3x|3]] = [[21|3]]", get: "x", answer: 7, choices: [21, 3, 7, 63] },
        ],
      },
      {
        eq: "x - 7 = 12", x: 19, choices: [12, 19, 7, 5],
        steps: [
          { say: "Add 7 to both sides.", work: "x − 7 {{+ 7}} = 12 {{+ 7}}", get: "x", answer: 19, choices: [12, 19, 7, 5] },
        ],
      },
      {
        eq: "[[x|4]] = 6", x: 24, choices: [6, 4, 1.5, 24],
        steps: [
          { say: "Multiply both sides by 4.", work: "[[x|4]] {{× 4}} = 6 {{× 4}}", get: "x", answer: 24, choices: [6, 4, 1.5, 24] },
        ],
      },
      {
        eq: "2x + 7 = 1", x: -3, choices: [1, -3, 7, 4],
        steps: [
          { say: "Subtract 7 from both sides.", work: "2x + 7 {{− 7}} = 1 {{− 7}}", get: "2x", answer: -6, choices: [1, -6, 6, 8] },
          { say: "Divide both sides by 2.", work: "[[2x|2]] = [[−6|2]]", get: "x", answer: -3, choices: [-6, -3, 3, -12] },
        ],
      },
      {
        eq: "3(x + 2) = 21", x: 5, choices: [21, 7, 2, 5],
        steps: [
          { say: "Divide both sides by 3.", work: "[[3(x + 2)|3]] = [[21|3]]", get: "x + 2", answer: 7, choices: [21, 7, 3, 63] },
          { say: "Subtract 2 from both sides.", work: "x + 2 {{− 2}} = 7 {{− 2}}", get: "x", answer: 5, choices: [7, 2, 5, 9] },
        ],
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

  // The finale's words (asked 2026-11-18: "add a mission complete in a magical way in upper side…
  // monkey is dancing for 7 to 8 seconds. And then replay button will come in between"): the title across
  // the top, and the button that plays the quest again from the start
  finale: {
    title: "Mission Complete!",
    replay: "Play again",
  },

  // Sound effects: map any sound cue to a recorded file, e.g. overrides: { "zippy.laugh": "assets/audio/zippy-laugh.mp3" }.
  // (The voice lines are in assets/vo/, see docs/VOICEOVER.md.) The recordings here are made from the
  // ones in art/audio/ by tools/make_sounds.py (asked 2026-11-09: Grumble's snore, Zippy's laugh when
  // he wins a crown, and the wooden ring of the alarm when the balance tips).
  audio: {
    overrides: {
      "zippy.win": "assets/audio/zippy-win-laugh.mp3", // Zippy laughs when he has won the crown
      alarm: "assets/audio/alarm-wood-ring.mp3", // the alarm when the balance tips: a wooden ring, twice (asked 2026-11-09)
      // every shower of confetti (an equation solved, an activity's last answer, a crown won): a real
      // pop and real paper confetti falling, not a made sound (asked 2026-11-19: "should not like it's
      // generated by AI")
      confetti: "assets/audio/confetti.mp3",
      // Grumble's roar (a wrong swap wakes him, the title, the intro's cloud): a real recorded creature
      // roar, not the made one (asked 2026-11-20: "The raw [roar] of monster is like made by AI… make it
      // too real"; Freesound CC0, tools/make_sounds.py, roar)
      "grumble.roar": "assets/audio/grumble-roar.mp3",
      // Zippy's voice: real recordings of one person's monkey imitation, not made sounds (asked
      // 2026-11-20: "Monkey voice is also like this generated by AI… It should look natural"; Freesound
      // CC0, tools/make_sounds.py, ZIPPY); his gulp is a real swallow
      "zippy.giggle": "assets/audio/zippy-giggle.mp3",
      "zippy.laugh": "assets/audio/zippy-laugh.mp3",
      "zippy.whee": "assets/audio/zippy-whee.mp3",
      "zippy.eek": "assets/audio/zippy-eek.mp3",
      "zippy.hmm": "assets/audio/zippy-hmm.mp3",
      "zippy.catch": "assets/audio/zippy-catch.mp3",
      "zippy.gulp": "assets/audio/zippy-gulp.mp3",
      "grumble.snore1": "assets/audio/grumble-snore-1.mp3",
      "grumble.snore2": "assets/audio/grumble-snore-2.mp3",
      "grumble.snore3": "assets/audio/grumble-snore-3.mp3",
      "grumble.snore4": "assets/audio/grumble-snore-4.mp3",
      "grumble.snore5": "assets/audio/grumble-snore-5.mp3",
      "grumble.snore6": "assets/audio/grumble-snore-6.mp3",
    },
    // Grumble's recorded snores, one after another: each is a snore in, a pause and a snore out, which
    // starts `out` s in; it lasts `len` s. His breathing follows each one (js/world.js, sleep).
    // tools/make_sounds.py prints this list.
    snores: [
      { cue: "grumble.snore1", out: 2.46, len: 3.47 },
      { cue: "grumble.snore2", out: 3.29, len: 4.33 },
      { cue: "grumble.snore3", out: 3.3, len: 4.17 },
      { cue: "grumble.snore4", out: 3.19, len: 4.1 },
      { cue: "grumble.snore5", out: 3.33, len: 4.37 },
      { cue: "grumble.snore6", out: 3.26, len: 4.53 },
    ],
    // Zippy's win laugh lasts this long (s): he laughs only while it is heard, and his next line waits for
    // it (reviews of 2026-11-13 and 2026-11-18: "reduce the timing of Zippy's laugh"; it was 5.6, then 2.77)
    winLaugh: 1.75,
  },
};
