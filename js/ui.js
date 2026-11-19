/*
 * Zippy's Crown Quest: user interface.
 * HUD, captions + narration, Next/Back, the SWAP button, speech bubbles, comic sound words,
 * name bursts, spotlight, thought bubbles, hand demos, word gems + Word Treasure, menu,
 * the Check panel (LHS/RHS with number pickers) and the equation board.
 */
(function () {
  "use strict";
  const CQ = window.CQ;
  const C = () => window.CONTENT;

  // ------------------------------------------------------------------ icons
  const ICON = {
    restart:
      '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M38 24a14 14 0 1 1-4.1-9.9" fill="none" stroke="currentColor" stroke-width="7" stroke-linecap="round"/><path d="M29 6l9 8-11 5z" fill="currentColor" stroke="currentColor" stroke-width="3" stroke-linejoin="round"/></svg>',
    menu: '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M10 13h28M10 24h28M10 35h28" stroke="currentColor" stroke-width="7" stroke-linecap="round"/></svg>',
    next: '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M15 8l26 16-26 16z" fill="currentColor" stroke="#6B3E00" stroke-width="3.5" stroke-linejoin="round"/></svg>',
    back: '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M33 8L7 24l26 16z" fill="currentColor" stroke="#6B3E00" stroke-width="3.5" stroke-linejoin="round"/></svg>',
    swap: '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M8 17h28M28 9l9 8-9 8M40 31H12M20 23l-9 8 9 8" fill="none" stroke="currentColor" stroke-width="5.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  };
  CQ.ICON = ICON;
  // A gem from elements.png, picked by a word's colour (see CONTENT.words).
  const GEM_BY_COLOR = {
    "#F2C230": "gemYellow",
    "#F08A24": "gemOrange",
    "#9B5DE5": "gemPurple",
    "#2BB673": "gemGreen",
    "#1FA3A3": "gemTeal",
    "#D9971E": "gemAmber",
    "#3D8BFD": "gemBlue",
    "#E5484D": "gemRed",
  };
  CQ.gem = (color, size) => {
    const key = GEM_BY_COLOR[String(color).toUpperCase()] || "gemBlue";
    return `<img class="gem" src="${IMAGES[key].src}" alt="" draggable="false" style="width:${size || 64}px">`;
  };

  // ------------------------------------------------------------------ stretchable art (elements.png)
  // Panels, speech bubbles, the notebook scroll and the wooden buttons stretch pieces of
  // elements.png. styles.css says which piece and where to cut it (border-image), but browsers
  // paint the nine parts separately and thin seams show between them on a scaled stage. So each
  // one is repainted into a single canvas behind the element, with the parts overlapping by a
  // pixel, and again whenever the element changes size.
  const PATCHED = ".caption, .panel, .bubble, .btn-wood";
  const patchImgs = {};
  const four = (v) => [v[0], v.length > 1 ? v[1] : v[0], v.length > 2 ? v[2] : v[0], v.length > 3 ? v[3] : v.length > 1 ? v[1] : v[0]]; // top right bottom left
  const patchRO = typeof ResizeObserver === "function" ? new ResizeObserver((list) => list.forEach((e) => paintPatch(e.target))) : null;
  function readPatch(el) {
    const cs = getComputedStyle(el);
    const m = /url\(["']?(.*?)["']?\)/.exec(cs.borderImageSource || "");
    if (!m) return null;
    const border = [cs.borderTopWidth, cs.borderRightWidth, cs.borderBottomWidth, cs.borderLeftWidth].map(parseFloat);
    const toks = cs.borderImageSlice.trim().split(/\s+/);
    const slice = four(toks.filter((t) => t !== "fill").map(parseFloat));
    const len = (list, auto) => four(list.trim().split(/\s+/)).map((t, i) => (/px$/.test(t) ? parseFloat(t) : t === "auto" ? auto[i] : parseFloat(t) * border[i]) || 0);
    if (!patchImgs[m[1]]) {
      patchImgs[m[1]] = new Image();
      patchImgs[m[1]].src = m[1];
    }
    return { img: patchImgs[m[1]], border, slice, fill: toks.includes("fill"), widths: len(cs.borderImageWidth, slice), outset: len(cs.borderImageOutset, [0, 0, 0, 0]) };
  }
  function paintPatch(el) {
    const P = el._patch;
    const im = P && P.img;
    const bw = el.offsetWidth;
    const bh = el.offsetHeight;
    if (!P || !bw || !bh || !im.naturalWidth) return;
    const [ot, or, ob, ol] = P.outset;
    const W = bw + ol + or;
    const H = bh + ot + ob;
    const res = Math.min(3, Math.max(1, (window.devicePixelRatio || 1) * CQ.stage.scale));
    const c = P.canvas;
    const cw = Math.round(W * res);
    const ch = Math.round(H * res);
    if (c.width !== cw) c.width = cw;
    if (c.height !== ch) c.height = ch;
    Object.assign(c.style, { left: -(P.border[3] + ol) + "px", top: -(P.border[0] + ot) + "px", width: W + "px", height: H + "px" });
    const g = c.getContext("2d");
    g.clearRect(0, 0, cw, ch);
    g.imageSmoothingQuality = "high";
    // the CSS rule: if opposite parts don't fit, all four shrink by the same factor
    const [dt, dr, db, dl] = P.widths;
    const k = Math.min(1, W / Math.max(1, dl + dr), H / Math.max(1, dt + db)) * res;
    const X = [0, Math.round(dl * k), cw - Math.round(dr * k), cw];
    const Y = [0, Math.round(dt * k), ch - Math.round(db * k), ch];
    const [st, sr, sb, sl] = P.slice;
    const SX = [0, sl, im.naturalWidth - sr, im.naturalWidth];
    const SY = [0, st, im.naturalHeight - sb, im.naturalHeight];
    for (let r = 0; r < 3; r++)
      for (let q = 0; q < 3; q++) {
        if (r === 1 && q === 1 && !P.fill) continue;
        const sw = SX[q + 1] - SX[q];
        const sh = SY[r + 1] - SY[r];
        const dw = X[q + 1] - X[q];
        const dh = Y[r + 1] - Y[r];
        // each part reaches 1px into the next one, so no gap can open between them
        if (sw > 0 && sh > 0 && dw > 0 && dh > 0) g.drawImage(im, SX[q], SY[r], sw, sh, X[q], Y[r], dw + (q < 2), dh + (r < 2));
      }
  }
  function patch(el) {
    if (el._patch || !patchRO) return;
    const P = readPatch(el);
    if (!P) return;
    el._patch = P;
    P.canvas = CQ.el("canvas", "patch");
    el.insertBefore(P.canvas, el.firstChild);
    el.classList.add("patched");
    if (getComputedStyle(el).position === "static") el.style.position = "relative";
    el.style.borderImageSource = "none"; // the canvas paints it now; the border keeps its size
    el.style.borderColor = "transparent";
    if (P.img.complete) paintPatch(el);
    else P.img.addEventListener("load", () => paintPatch(el), { once: true });
    patchRO.observe(el);
  }
  CQ.patch = {
    // Patches matching elements under root now and whenever they are added later.
    watch(root) {
      if (!patchRO) return; // older browsers keep the CSS border-image
      root.querySelectorAll(PATCHED).forEach(patch);
      new MutationObserver((muts) =>
        muts.forEach((m) => {
          const t = m.target;
          // innerHTML on a patched element (the post sign, the equation board) removes its canvas
          if (t._patch && !t._patch.canvas.isConnected) {
            t.insertBefore(t._patch.canvas, t.firstChild);
            paintPatch(t);
          }
          m.addedNodes.forEach((n) => {
            if (n.nodeType !== 1) return;
            if (n.matches(PATCHED)) patch(n);
            n.querySelectorAll(PATCHED).forEach(patch);
          });
        })
      ).observe(root, { childList: true, subtree: true });
      // sharper or softer canvases after the stage is rescaled
      window.addEventListener("resize", () => document.querySelectorAll(".patched").forEach(paintPatch));
    },
  };

  function button(cls, html, label, parent, onClick) {
    const b = CQ.el("button", cls, parent, html);
    b.type = "button";
    if (label) b.setAttribute("aria-label", label);
    b.addEventListener("click", (e) => {
      e.stopPropagation();
      onClick(e);
    });
    return b;
  }
  CQ.button = button;
  // Stage-coordinate centre of any element (works inside the scaled stage).
  // Returns null when the element is not on screen (e.g. display:none).
  CQ.centerOf = (el) => {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    if (!r.width && !r.height) return null;
    return CQ.stage.toStage(r.left + r.width / 2, r.top + r.height / 2);
  };

  CQ.ui = {
    build(uiLayer, overlay, modal) {
      this.layer = uiLayer;
      CQ.patch.watch(CQ.stage.el);
      CQ.stage.el.style.setProperty("--bx", CQ.L.BX + "px");
      this.overlay = overlay;
      this.modal = modal;
      CQ.hud.build(uiLayer);
      CQ.caption.build(uiLayer);
      CQ.next.build(uiLayer);
      CQ.nav.build(uiLayer);
      CQ.swapBtn.build(uiLayer);
      CQ.bubble.build(uiLayer);
      CQ.spot.build(overlay);
      CQ.focus.build();
      CQ.hand.build(uiLayer);
      CQ.checkPanel.build(uiLayer);
      CQ.eqBoard.build(uiLayer);
      CQ.treasure.build(modal);
      CQ.menu.build(modal);
      CQ.veil.build(CQ.stage.el);
      this.skip = button("pill skip hidden", `${C().ui.skip} ⏭`, C().ui.skip, uiLayer, () => CQ.flow && CQ.flow.skipIntro());
    },
    // Remove every transient piece of UI (used when a level or chapter starts).
    // opts.keepSpot: the spotlight stays on (a new level set up while Zippy peeks: js/flow.js, outro);
    // opts.keepSoft: a blur that stays too (the formula screen's, handed over: js/flow.js, resetScene)
    reset(opts) {
      const keepSpot = !!(opts && opts.keepSpot);
      CQ.caption.hide(true);
      CQ.next.clear();
      CQ.swapBtn.hide(true);
      CQ.bubble.hide(true);
      if (!keepSpot) CQ.spot.off(true);
      CQ.focus.off(true);
      CQ.soft.clear([keepSpot ? "spot" : null, opts && opts.keepSoft].filter(Boolean));
      CQ.hand.stop();
      CQ.checkPanel.hide(true);
      CQ.eqBoard.hide(true);
      CQ.idle.disarm();
      // and anything a step left behind when a chapter jump cut it short (Level 4's x + 2 = 7 strip)
      this.layer.querySelectorAll(".comic, .nameburst, .thought, .flyer, .eq-strip, .answer-tick").forEach((e) => e.remove());
      this.overlay.querySelectorAll(".thought, .flyer").forEach((e) => e.remove());
      this.skip.classList.add("hidden");
    },
  };

  // ------------------------------------------------------------------ veil (a soft dip to dark between chapters)
  CQ.veil = {
    build(stage) {
      this.el = CQ.el("div", "veil hidden", stage);
    },
    cover(ms) {
      const from = this.el.classList.contains("hidden") ? 0 : parseFloat(getComputedStyle(this.el).opacity) || 0;
      this.el.classList.remove("hidden");
      CQ.screen.shade("veil", 3);
      return CQ.anim(this.el, [{ opacity: from }, { opacity: 1 }], { duration: ms || 420, easing: "ease-in", essential: true });
    },
    reveal(ms) {
      CQ.screen.shade("veil", false);
      return CQ.anim(this.el, [{ opacity: 1 }, { opacity: 0 }], { duration: ms || 700, easing: "ease-out", essential: true }).then(() => {
        if (getComputedStyle(this.el).opacity === "0") this.el.classList.add("hidden");
      });
    },
  };

  // ------------------------------------------------------------------ crowns (no on-screen HUD)
  // The screen has no level sign or crown row. (Its only corner buttons are the screens list and Play
  // this screen again, top left: CQ.nav.) The game still counts the crowns; a collected crown flies up
  // out of the picture with a sparkle. (Esc opens the menu.)
  CQ.hud = {
    crowns: 0,
    level: 1,
    build() {},
    show() {},
    setLevel(n) {
      this.level = n;
    },
    setCrowns(n) {
      this.crowns = n;
    },
    async flyCrown(fromWorld, width) {
      const from = CQ.camera.toScreen(fromWorld);
      const to = { x: CQ.clamp(from.x + 240, 200, CQ.W - 200), y: 70 };
      const w = width || 120; // its width as it sets off; it ends 54 px wide
      CQ.audio.play("crown.sparkle");
      await CQ.fly(CQ.ui.layer, CQ.crownFlyer(w), from, to, { duration: 1000, arc: -140, scaleTo: 54 / w, spin: 360, fadeOut: true });
      CQ.fx.sparkle(CQ.ui.layer, to.x, to.y, 12, 50);
      this.crowns++;
    },
  };


  // ------------------------------------------------------------------ when the voice says each word
  // How long the words of a line take to say, roughly: their syllables as they are said ("7" is
  // "seven", "LHS" is "L H S", "=" is "equals"), about a fifth of a second each, and a pause after a full
  // stop or a comma. For a line read by the device voice when it doesn't say where it is, and for a line
  // shown without a voice. (The recordings have their own word timings: tools/vo_timing.py, which works
  // them out the same way when it has to guess.) The device voice's own speed is learnt as it speaks.
  CQ.voiceTime = {
    unit: 0.2, // s per unit
    ones: "zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen".split(" "),
    tens: "_ _ twenty thirty forty fifty sixty seventy eighty ninety".split(" "),
    numberWords(n) {
      n = Math.round(Math.abs(n));
      if (n < 20) return [this.ones[n]];
      if (n < 100) return [this.tens[Math.floor(n / 10)]].concat(n % 10 ? [this.ones[n % 10]] : []);
      return ["hundred", "and", "more"];
    },
    spoken(word) {
      const SYM = { "+": ["plus"], "=": ["equals"], "−": ["minus"], "-": ["minus"], "×": ["times"], "÷": ["divided", "by"], "≠": ["is", "not", "equal", "to"], "—": [], "–": [], "…": [] };
      const out = [];
      String(word)
        .replace(/\[\[|\]\]|\{\{|\}\}|<<|>>|##/g, " ")
        .replace(/\|/g, " divided by ")
        .replace(/\^2|²/g, " squared")
        .trim()
        .split(/\s+/)
        .forEach((part) => {
          const core = part.replace(/^[.,!?;:"“”'’()]+|[.,!?;:"“”'’()]+$/g, "");
          if (!core) return;
          if (SYM[core]) return out.push(...SYM[core]);
          if (/^[lr]hs$/i.test(core)) return out.push("l", "h", "s");
          const m = core.match(/^([−-]?)(\d+(?:\.\d+)?)(x?)(?:-(\w+))?$/);
          if (m) {
            if (m[1]) out.push("negative");
            out.push(...this.numberWords(parseFloat(m[2])));
            if (m[3]) out.push("x");
            if (m[4]) out.push(m[4]);
            return;
          }
          out.push(...core.split(/[-–(]/).filter(Boolean));
        });
      return out;
    },
    syllables(t) {
      let w = String(t).toLowerCase().replace(/[^a-z]/g, "");
      if (!w) return 0;
      const SPECIAL = { zippy: 2, grumble: 2, every: 2, equals: 2, equal: 2, equation: 3, variable: 4, value: 2, values: 2, one: 1, seven: 2, eleven: 3, linear: 3, nonlinear: 4, solution: 3 };
      if (SPECIAL[w]) return SPECIAL[w];
      if (w.length <= 3) return 1;
      w = w.replace(/(?:[^laeiouy]es|[^laeiouy]ed|[^laeiouy]e)$/, "").replace(/^y/, "");
      return Math.max(1, (w.match(/[aeiouy]{1,2}/g) || []).length);
    },
    weight(word) {
      const toks = this.spoken(word);
      if (!toks.length) return 0.15;
      return toks.reduce((w, t) => {
        if (t.length === 1 && t !== "a") return w + 1.35; // letters said one by one (x, L H S)
        if (/^(a|an|the|of|to|is|it|and|or|in|on|at|as)$/i.test(t)) return w + 0.75;
        return w + 0.45 + this.syllables(t);
      }, 0);
    },
    pauseAfter(word) {
      if (/[.!?…]["”’)]?$/.test(word)) return 0.35;
      if (/[,;:—–]$/.test(word) || word === "—") return 0.18;
      return 0;
    },
    // when each word of the line starts, s from when the voice starts (and .end: when it is all said)
    plan(text) {
      const out = [];
      let t = 0;
      String(text)
        .trim()
        .split(/\s+/)
        .forEach((w) => {
          out.push(t);
          t += this.weight(w) * this.unit + this.pauseAfter(w);
        });
      out.end = t;
      return out;
    },
    // the device voice took secs to say text: its speed, learnt a little at a time
    learn(text, secs) {
      const words = String(text).trim().split(/\s+/);
      const units = words.reduce((u, w) => u + this.weight(w), 0);
      const pauses = words.reduce((p, w) => p + this.pauseAfter(w), 0);
      if (!(units > 3) || !(secs > 0.5)) return;
      const u = (secs - pauses) / units;
      this.unit = CQ.clamp(0.7 * this.unit + 0.3 * u, 0.12, 0.4);
    },
  };
  // The words of a line: where each starts and ends in it (split at spaces, as its timings are).
  function wordsOf(text) {
    const out = [];
    const re = /\S+/g;
    let m;
    while ((m = re.exec(String(text)))) out.push({ a: m.index, b: m.index + m[0].length });
    return out;
  }
  // The word of the line at a letter (a space: the word after it).
  function wordAt(words, i) {
    for (let k = 0; k < words.length; k++) if (i < words[k].b) return k;
    return words.length - 1;
  }
  // The device voice reads the line its own way (CQ.speakable: "x + 2" as "x plus 2", "LHS" as "L H S"):
  // for a letter of what it reads, the word of the line it belongs to (the two lined up, letter by letter).
  function spokenToShown(shown, spoken) {
    const a = String(shown);
    const b = String(spoken);
    const n = a.length;
    const m = b.length;
    const L = [];
    for (let i = 0; i <= n; i++) L.push(new Uint16Array(m + 1));
    for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) L[i][j] = a[i] === b[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
    const map = new Int32Array(m).fill(-1);
    for (let i = 0, j = 0; i < n && j < m; ) {
      if (a[i] === b[j]) {
        map[j] = i;
        i++;
        j++;
      } else if (L[i + 1][j] >= L[i][j + 1]) i++;
      else j++;
    }
    const words = wordsOf(a);
    return (k) => {
      k = CQ.clamp(k | 0, 0, Math.max(0, m - 1));
      if (map[k] >= 0) return wordAt(words, map[k]);
      let p = k - 1;
      while (p >= 0 && map[p] < 0) p--;
      if (p < 0) return 0;
      const d = map[p];
      return /\s/.test(a[d]) ? wordAt(words, d + 1) : wordAt(words, d);
    };
  }

  // ------------------------------------------------------------------ caption + narration
  // A line types itself out as it is said, word by word, each word as the voice says it: a recorded line
  // by when each of its words is said in its clip (js/vo_lines.js, from tools/vo_timing.py), a line read
  // by the device voice by the words the voice says it has got to (or, if it doesn't say, by how long its
  // words take). A tap on the words shows the whole line at once (the voice carries on). A line with no
  // voice shows at once. Whatever a line names can come in on screen as the voice says it: when(text,
  // str) (review, 2026-11-16: "when the VO says 7, 7 should appear").
  // The question bar shows the whole line at once (review, 2026-11-07: "One text in the instruction
  // panel should not be split into two screens"; from 2026-11-05 it showed one row at a time). A line
  // too long for one row is cut, at whole words, into rows (as even as they can be, broken after a full
  // stop or comma where one is near), shown one under the other, and the bar grows to fit them. Every
  // row is the same size.
  const LEAD = 0.08; // s: a word counts as said this much before its sound begins (what it names has a moment to come in)
  // The room the bar stands in the middle of (stage px, styles.css): from the right of the two buttons at
  // the top left (.nav: 36 + 140 + 14 + 140) to the left of Next (.next-btn: 1920 − 36 − 190). It stays
  // put when Next is hidden, so the bar doesn't move between screens.
  const CAP_ROOM = { from: 330, to: 1694 };
  CQ.caption = {
    build(ui) {
      this.el = CQ.el("div", "caption hidden", ui);
      // No speaker beside the words (asked 2026-11-18: "remove this speaker icon and the question template
      // text should come in between of question panel and it should be fully wrapped in this"; since
      // 2026-11-07 a speaker in a gold medallion sat at the bar's left): the line starts at the bar's left
      // and types itself out left to right, its rows inside the frame (asked 2026-11-18: "should come from
      // left to right. Not in between."; it was centred for a moment). A tap on the bar still plays the
      // line again once it is all shown (while it is typing, a tap shows it all at once). Keyboards and
      // screen readers have an unseen "Hear it again" button for that.
      this.txt = CQ.el("div", "cap-text", this.el);
      this.txt.setAttribute("aria-hidden", "true"); // screen readers get the whole line at once instead:
      this.probe = CQ.el("span", "cap-text cap-probe", this.el); // measures rows (unseen)
      this.probe.setAttribute("aria-hidden", "true");
      this.sr = CQ.el("div", "sr-only", this.el);
      this.sr.setAttribute("aria-live", "polite");
      this.again = button("sr-only cap-again", "", C().ui.hearAgain, this.el, () => this.replay());
      this.el.addEventListener("click", (e) => {
        if (e.target === this.again) return;
        if (this.chars) this.reveal();
        else this.replay();
      });
      this.text = null;
      this.rows = [""];
      this.busy = false; // true while the child is listening to the line again
      this.replays = 0;
      this.line = 0; // counts lines, so a voice that starts late can tell its line has gone
      this.chars = null; // the line's letters while they wait to be typed
      this.typing = 0; // the line whose voice has started typing it
      this.pass = 0; // counts replays, so only a replay's own voice types the line
      // how far the voice has got: "wait" (it hasn't started), "voice" (it is saying the line: heard is
      // the last word it has got to), "whole" (no voice: the line is simply shown), "done" (all said)
      this.mode = "whole";
      this.heard = -1;
      this.words = [];
      this.shownAt = 0;
    },
    set(text, opts) {
      this.text = text;
      this.opts = opts || {};
      this.replays++;
      this.busy = false;
      const n = ++this.line;
      this.el.classList.remove("hidden");
      this.el.style.width = ""; // at its widest (styles.css) to cut the line into rows, then fitted to them
      this.el.style.left = "";
      this.rows = this.split(text);
      this.fit();
      this.sr.textContent = CQ.speakable(text);
      this.words = wordsOf(text);
      this.heard = -1;
      this.shownAt = performance.now();
      // a line with a voice (its recording, or the device's) waits for it to start; if it never does, the
      // line is shown in full
      const voiceOn = !this.opts.quiet && CQ.audio.isEnabled("voice");
      const voiced = voiceOn && ((window.CQVoice && CQVoice.lookup(text)) || ("speechSynthesis" in window && window.SpeechSynthesisUtterance));
      this.mode = voiced ? "wait" : "whole";
      this.render(!!voiced);
      if (voiced)
        setTimeout(() => {
          if (this.typing === n || n !== this.line) return;
          this.mode = "whole"; // (no voice after all: as if shown without one, from now)
          this.shownAt = performance.now();
          this.reveal(n);
        }, 3500);
      CQ.anim(this.el, [{ transform: "translateY(-12px)", opacity: 0.2 }, { transform: "translateY(0)", opacity: 1 }], {
        duration: 420,
        easing: CQ.EASE.out,
        keep: false,
      });
    },
    // The line in as few rows as it needs, each fitting the bar, as even as they can be: cut at whole
    // words, best at the end of a sentence or at a comma or dash where one is near, and never on a
    // little word that leads into the next (…equals | 7). A fraction or a marked group of the line
    // ([[…]], {{…}}, <<…>>) is never cut.
    split(text) {
      const max = this.txt.clientWidth - 6;
      if (!(max > 0)) return [text];
      const widths = new Map();
      const width = (str) => {
        if (!widths.has(str)) {
          this.probe.innerHTML = CQ.rich(str);
          widths.set(str, this.probe.offsetWidth);
        }
        return widths.get(str);
      };
      if (width(String(text)) <= max) return [text];
      const open = (w) => ["[[", "{{", "<<"].some((o, i) => w.split(o).length > w.split(["]]", "}}", ">>"][i]).length);
      const words = [];
      String(text).split(" ").forEach((w) => {
        const last = words.length - 1;
        if (last >= 0 && open(words[last])) words[last] += " " + w;
        else words.push(w);
      });
      const WEAK = /^(a|an|the|of|to|and|or|but|is|are|be|can|will|equals|=|\+|−|-|×|÷|with|by|for|from|in|into|on|at|as|than|so|its|his|our|your|their|this|that|these|those|each|every|\d+)$/i;
      const END = /[.!?…]["”’)]?$/; // a word that ends a sentence
      const row = (i, j) => words.slice(i, j).join(" ");
      // as few rows as it needs (filling each row in turn gives the fewest)
      let k = 0;
      for (let i = 0; i < words.length; k++) {
        let j = i + 1;
        while (j < words.length && width(row(i, j + 1)) <= max) j++;
        i = j;
      }
      // then the most even cut into that many rows
      const cost = (i, j, last) => {
        const w = width(row(i, j));
        if (w > max && j - i > 1) return Infinity;
        const slack = (max - w) / max;
        if (last) return slack * slack * 0.5; // the last row may be shorter
        let c = slack * slack;
        if (END.test(words[j - 1])) c -= 0.12; // the end of a sentence: the best place
        else if (/[,;:—]$/.test(words[j - 1])) c -= 0.08; // a good place to pause
        else if (WEAK.test(words[j - 1])) c += 0.25; // it leads into the next row
        if (words[j] === "—") c += 0.2; // a dash doesn't begin a row
        if (END.test(words[j]) && !END.test(words[j - 1])) c += 0.2; // nor does a sentence's last word
        return c;
      };
      const n = words.length;
      let layer = new Map([[0, { c: 0, cuts: [] }]]);
      for (let r = 1; r <= k; r++) {
        const next = new Map();
        layer.forEach((prev, i) => {
          for (let j = i + 1; j <= n - (k - r); j++) {
            if (r === k && j !== n) continue;
            const c = prev.c + cost(i, j, r === k);
            if (c === Infinity) break;
            if (!next.has(j) || c < next.get(j).c) next.set(j, { c, cuts: prev.cuts.concat(j) });
          }
        });
        layer = next;
      }
      const end = layer.get(n);
      if (!end) return [text];
      let i = 0;
      return end.cuts.map((j) => {
        const r = row(i, j);
        i = j;
        return r;
      });
    },
    // The bar as wide as its line (asked 2026-11-19, of "Meet Zippy!" in the long bar: "resize the box
    // according to the sentence. Width of the box"): its widest row and the frame round it, from where the
    // bar starts at the left, never wider than styles.css has it. It changes with the line, as the new
    // line comes in (set's fade), not as a slide: the bar's width itself is never animated.
    fit() {
      const full = this.el.offsetWidth;
      const room = this.txt.clientWidth;
      if (!(full > 0 && room > 0)) return;
      let w = 0;
      this.rows.forEach((r) => {
        this.probe.innerHTML = CQ.rich(r);
        w = Math.max(w, this.probe.getBoundingClientRect().width / CQ.stage.scale);
      });
      const width = Math.min(full, Math.ceil(full - room + w + 4));
      this.el.style.width = width + "px";
      // and in the middle of the room between the buttons at the top left and Next (asked 2026-11-19: "This
      // question template need to be come in between not in side"; it stood at the left of that room, its
      // right side short). A long line still keeps to the room styles.css gives it: never further left
      // (Zippy's tail), never nearer Next. The words in it stay at its left, typed left to right.
      const left = this.el.offsetLeft;
      const mid = (CAP_ROOM.from + CAP_ROOM.to) / 2;
      this.el.style.left = Math.round(Math.max(left, Math.min(mid - width / 2, left + full - width))) + "px";
    },
    // Show the whole line, row under row: its letters hidden, to be typed with the voice (typed), or in full.
    render(typed) {
      this.txt.innerHTML = this.rows.map((r) => `<span class="cap-row">${CQ.rich(r)}</span>`).join("");
      this.txt.classList.toggle("typing", !!typed);
      this.chars = typed ? this.hideLetters() : null;
    },
    // Each letter of the line in its own span, hidden until it is typed: the rows keep their final layout.
    // The letters of each word are kept together (wordChars[k]: word k's letters, with the space before it),
    // to come in as that word is said.
    hideLetters() {
      const chars = [];
      const groups = [[]];
      const walk = (node) =>
        Array.from(node.childNodes).forEach((c) => {
          if (c.nodeType === 1) return walk(c);
          if (c.nodeType !== 3) return;
          const frag = document.createDocumentFragment();
          for (const ch of c.textContent) {
            const s = document.createElement("span");
            s.className = "ch";
            s.textContent = ch;
            frag.appendChild(s);
            chars.push(s);
            const g = groups[groups.length - 1];
            if (/\s/.test(ch)) {
              if (g.some((x) => !/\s/.test(x.textContent))) groups.push([s]);
              else g.push(s);
            } else g.push(s);
          }
          c.replaceWith(frag);
        });
      Array.from(this.txt.querySelectorAll(".cap-row")).forEach((row, i) => {
        if (i > 0 && groups[groups.length - 1].length) groups.push([]); // a new row: a new word
        walk(row);
      });
      const filled = groups.filter((g) => g.some((x) => !/\s/.test(x.textContent)));
      // (one group of letters per word of the line; if the rich text ever splits them otherwise, the
      // letters are shared out over the words by their place in the line instead)
      if (filled.length === this.words.length) this.wordChars = filled;
      else {
        const per = this.words.map(() => []);
        chars.forEach((c, i) => per[Math.min(per.length - 1, Math.floor((i / Math.max(1, chars.length)) * per.length))].push(c));
        this.wordChars = per;
      }
      return chars;
    },
    // For CQ.say: when line n's voice starts, the line types itself out with it, word by word: a recording
    // ({ clip, secs, rate, words, now }) by when each word is said in it, the device voice ({ synth }) by
    // the words it says it has got to; with no voice ({ clip: false }) it is shown in full. (pass: a
    // replay's own voice, see replay.)
    voiced(n, pass) {
      return (v) => {
        if (n !== this.line) return;
        if (!v || (!v.clip && !v.synth)) {
          if (pass === undefined) {
            this.mode = "whole";
            this.shownAt = performance.now();
          }
          return this.reveal(n, pass);
        }
        if (v.clip) return this.typeClip(n, pass, v);
        return this.typeSynth(n, pass, v.synth);
      };
    },
    // the line's words up to word k, each one whole as the voice gets to it (asked 2026-11-19: "do not make
    // letter by letter. Just make a word by word come in question template only"; a word's letters used to
    // come in one after another over the time it took to say). styles.css fades each word in.
    showUpTo(chars, k) {
      const W = this.wordChars || [];
      for (let i = 0; i <= Math.min(k, W.length - 1); i++) W[i].forEach((c) => c.classList.add("on"));
    },
    typeClip(n, pass, v) {
      this.typing = n;
      if (pass === undefined) this.mode = "voice";
      const chars = this.chars; // (null: shown in full already, by a tap; the voice is still followed)
      const W = v.words && v.words.length === 2 * this.words.length ? v.words : null;
      const rate = v.rate || 1;
      const t0 = performance.now();
      // where the voice is in its clip (s): the clip's own clock, or the time since it started
      const clock = () => {
        const wall = ((performance.now() - t0) / 1000) * rate;
        const t = v.now ? v.now() : NaN;
        if (t === Infinity) return Infinity;
        return t > 0 ? t : wall > 0.25 ? wall : 0;
      };
      const per = Math.max(0.016, (v.secs - 0.35) / Math.max(1, String(this.text).length)); // (no word timings: the words by their place in the line, at an even pace)
      const step = () => {
        if (n !== this.line) return;
        const T = clock() + LEAD;
        let k = -1;
        if (W) {
          while (k + 1 < this.words.length && T >= W[2 * (k + 1)]) k++;
        } else k = T === Infinity ? this.words.length - 1 : Math.min(this.words.length - 1, wordAt(this.words, Math.floor(T / per)));
        if (k > this.heard) this.heard = k; // (a replay's voice too: what waits for a word comes as it says it)
        if (chars && this.chars === chars && k >= 0) this.showUpTo(chars, k);
        const done = T === Infinity || (W ? T >= W[W.length - 1] + 0.1 : k >= this.words.length - 1);
        if (done) {
          if (pass === undefined) this.heard = this.words.length - 1;
          return this.reveal(n, pass);
        }
        requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    },
    typeSynth(n, pass, synth) {
      const toShown = spokenToShown(this.text, synth.text);
      const plan = CQ.voiceTime.plan(this.text);
      const text = this.text;
      let start = 0;
      let over = false; // its voice has ended
      let byWords = false; // the voice says where it is
      const at = []; // when each word was reached (performance.now)
      const reach = (k) => {
        k = Math.min(k, this.words.length - 1);
        for (let i = 0; i <= k; i++) if (at[i] == null) at[i] = performance.now();
        if (k > this.heard) this.heard = k;
      };
      const step = () => {
        if (n !== this.line || !start) return;
        const now = performance.now();
        // the device voice doesn't say which word it is on (some don't): by how long its words take
        if (!byWords) {
          const T = (now - start) / 1000 + LEAD;
          let k = -1;
          while (k + 1 < plan.length && T >= plan[k + 1]) k++;
          if (k >= 0) reach(k);
        }
        const chars = this.chars;
        if (chars && at.length) this.showUpTo(chars, at.length - 1);
        if (!over) requestAnimationFrame(step);
      };
      const begin = () => {
        if (start) return;
        start = performance.now();
        this.typing = n;
        if (pass === undefined) this.mode = "voice";
        requestAnimationFrame(step);
      };
      synth.on((ev) => {
        if (n !== this.line) return;
        if (ev.type === "start") begin();
        else if (ev.type === "word") {
          begin();
          byWords = true;
          reach(toShown(ev.charIndex));
        } else if (ev.type === "end") {
          over = true;
          if (start && pass === undefined) CQ.voiceTime.learn(text, (performance.now() - start) / 1000);
        }
      });
    },
    // How far the voice has got in the line on screen: the last word it has said (−1: none yet).
    saidUpTo() {
      if (this.mode === "done") return Infinity;
      if (this.mode === "whole") {
        // no voice: about where a voice would be by now
        const plan = CQ.voiceTime.plan(this.text || "");
        const T = (performance.now() - this.shownAt) / 1000 + LEAD;
        let k = -1;
        while (k + 1 < plan.length && T >= plan[k + 1]) k++;
        return k;
      }
      return this.heard;
    },
    // Resolves when the voice of the line `text` gets to str (as it begins its last word), with that line
    // on screen (the one there now, or the next to come); or once the line has gone (skipped on); or after
    // 15 s at the latest. At once if the line doesn't have str.
    when(text, str) {
      text = String(text);
      const at = str ? text.indexOf(str) : -1;
      if (at < 0) return Promise.resolve();
      const target = wordAt(wordsOf(text), at + String(str).replace(/\s+$/, "").length - 1);
      const from = this.line;
      const t0 = performance.now();
      return new Promise((res) => {
        let seen = false;
        const check = () => {
          const here = this.text === text && this.line >= from;
          if (here) seen = true;
          if ((here && this.saidUpTo() >= target) || (seen && !here) || performance.now() - t0 > 15000) return res();
          setTimeout(check, 25);
        };
        check();
      });
    },
    // Line n's voice has ended (or was cut short): it has all been said, and is shown in full. (Not when
    // its voice never started (the device has no voice after all): then things come about when a voice
    // would have said them, as for a line with no voice. Not when a replay cut it short: the replay's
    // voice carries on, and what waits for a word comes as it says it.)
    ended(n) {
      if (n !== this.line || this.busy) return;
      if (this.mode === "wait" && this.typing !== n) this.mode = "whole";
      else if (this.mode !== "whole") this.mode = "done";
      this.reveal(n);
    },
    // Line n (or the line on screen) is done typing: its voice has ended, or the child tapped it, or
    // the voice never started. The whole line is shown.
    reveal(n, pass) {
      if (n != null && n !== this.line) return;
      if (pass !== undefined ? pass !== this.pass : this.busy) return; // a replay is typing it meanwhile
      if (!this.chars) return; // already in full
      this.chars = null;
      this.txt.classList.remove("typing");
    },
    hide(now) {
      this.text = null;
      this.line++;
      this.chars = null;
      this.replays++;
      this.busy = false;
      this.mode = "whole";
      this.heard = -1;
      if (now || this.el.classList.contains("hidden")) {
        this.el.classList.add("hidden");
        return;
      }
      CQ.anim(this.el, [{ opacity: 1 }, { opacity: 0 }], { duration: 300, keep: false }).then(() => {
        if (this.text === null) this.el.classList.add("hidden"); // no new line arrived meanwhile
      });
    },
    // 🔊 Hear it again: the line types itself out again with the voice. The story waits until the line
    // has been heard again.
    replay() {
      if (!this.text) return;
      CQ.audio.play("ui.tap");
      const n = ++this.replays;
      const line = this.line;
      const pass = ++this.pass; // the first voice ending now (cut short) must not touch the line
      this.busy = true;
      this.typing = 0;
      this.render(true);
      CQ.audio.speak(CQ.speakable(this.text), { who: this.opts.who || "narrator", line: this.text, onStart: this.voiced(line, pass) }).then(() => {
        this.reveal(line, pass);
        if (n === this.replays) {
          this.busy = false;
          if (line === this.line && this.mode !== "whole") this.mode = "done"; // all said now
        }
      });
    },
  };

  // How long the story pauses (review, 2026-11-07: "The transitions are fast. Please add pauses."):
  //   breath: added after every line, before the next thing happens (CQ.say)
  //   between: between two parts of the quest, and after a won level before Zippy swings off (js/flow.js)
  //   settle: when the formula screen has opened, before the equation is written in, and when it has
  //   closed, before the story goes on (CQ.notebook in js/activities.js)
  // The clock of each stops while a menu is open.
  CQ.PACE = { breath: 600, between: 1200, settle: 500 };

  // Show + speak a narrator line, then move on by itself once it has been heard.
  //   advance 'hold' (default): after the voice, a pause to look at the screen (opts.hold, or sized to the line)
  //   advance 'auto': after the voice, a short pause (opts.pause, default 450 ms), for lines that flow on
  //   (both: plus CQ.PACE.breath)
  //   advance 'none': show + speak and return at once (an instruction while the child acts)
  // With the voice off, the caption gets time to be read instead. The clock stops while a menu is open,
  // the page is hidden, or the child is replaying the line (🔊). Teachers can skip ahead with → (or a
  // presenter clicker); notebook pages also have Back. Resolves 'next', or 'back' when Back was pressed.
  //   opts.quiet: a prompt brought back after a hint is shown again but not said again
  CQ.say = async function (id, opts) {
    opts = opts || {};
    // never over a snore: if Grumble is snoring (or about to), his snore ends first, then the line and
    // its voice come (asked 2026-11-09: "do not mix the voice")
    if (!opts.quiet && CQ.grumble) await CQ.run.when(CQ.grumble.quiet());
    const text = opts.text || CQ.T(id, opts.vars);
    CQ.caption.set(text, { id, who: opts.who, quiet: opts.quiet });
    const line = CQ.caption.line;
    CQ.track("step_start", { id });
    const speech = opts.quiet
      ? Promise.resolve({ spoken: false })
      : CQ.audio.speak(CQ.speakable(text), { who: opts.who || "narrator", line: text, onStart: CQ.caption.voiced(line) });
    speech.then(() => CQ.caption.ended(line)); // however the voice ended, it has all been said, and the whole line is on screen
    const advance = opts.advance || "hold";
    if (advance === "none") return null;
    const words = text.split(/\s+/).length;
    const busy = () => CQ.caption.busy;
    const skip = CQ.next.listen({ back: opts.back });
    const timeline = (async () => {
      const t0 = performance.now();
      const r = await speech;
      // voice off or unavailable: time to read the caption (a replay already gave that time)
      const heard = (r && r.spoken) || CQ.caption.busy;
      const readMs = heard ? 300 : advance === "auto" ? 900 + words * 300 : 1000 + words * 320;
      const left = readMs - (performance.now() - t0);
      if (left > 0) await CQ.run.hold(left, busy);
      const look = advance === "auto" ? (opts.pause != null ? opts.pause : 450) : opts.hold != null ? opts.hold : CQ.next.lookTime(words);
      await CQ.run.hold(look + CQ.PACE.breath, busy);
      return "next";
    })();
    timeline.catch(() => {}); // a skipped or cancelled step has nothing left to do
    try {
      const res = await CQ.run.when(Promise.race([skip.promise, timeline]));
      if (res !== "next") CQ.audio.stopSpeech(); // skipped ahead or went back
      return res === "back" ? "back" : "next";
    } finally {
      CQ.next.unlisten(skip.id);
    }
  };

  // ------------------------------------------------------------------ pacing: Next, → and Back
  // Narrated screens move on by themselves (see CQ.say). The Next button (top right) is always there
  // during the quest: while a line is on it moves on to the next line at once (so do → and PageDown);
  // at any other moment (the child's turn, an animation) it goes on to the next part of the quest
  // (CQ.flow.next). On formula screens Back (or ←) goes back a line.
  CQ.next = {
    seq: 0,
    build(ui) {
      this.backBtn = button("wbtn back-btn hidden", "", C().ui.back, ui, () => this.fire("back"));
      this.nextBtn = button("btn-wood next-btn hidden", `<span>${C().ui.next}</span>`, C().ui.next, ui, () => this.tapNext());
      this.resolver = null;
      this.allowBack = false;
      window.addEventListener("keydown", (e) => {
        if (CQ.pauser.count) return; // a menu, Word Treasure or a question is open
        if (e.key === "ArrowRight" || e.key === "PageDown") this.fire("next");
        if (e.key === "ArrowLeft" || e.key === "PageUp") this.fire("back");
      });
    },
    listen(opts) {
      const id = ++this.seq;
      this.allowBack = !!(opts && opts.back);
      this.backBtn.classList.toggle("hidden", !this.allowBack);
      const promise = new Promise((res) => (this.resolver = res));
      return { id, promise };
    },
    // The Next button is shown from the first chapter on, and hidden on the finale (it has its own buttons).
    showNext(on) {
      const hidden = this.nextBtn.classList.contains("hidden");
      if (on && hidden) {
        this.nextBtn.classList.remove("hidden");
        CQ.anim(this.nextBtn, [{ opacity: 0, transform: "translateY(-10px)" }, { opacity: 1, transform: "translateY(0)" }], { duration: 300, easing: CQ.EASE.out, keep: false });
      } else if (!on) this.nextBtn.classList.add("hidden");
    },
    tapNext() {
      if (this.resolver) return this.fire("next"); // a line is on: the next line
      if (CQ.pauser.count) return;
      CQ.audio.play("ui.tap");
      if (CQ.flow) CQ.flow.next(); // otherwise: the next part of the quest
    },
    unlisten(id) {
      if (id === this.seq) this.clear(); // otherwise a newer screen is listening now
    },
    clear() {
      this.resolver = null;
      this.allowBack = false;
      this.backBtn.classList.add("hidden");
    },
    fire(what) {
      if (!this.resolver) return;
      if (what === "back" && !this.allowBack) return;
      CQ.audio.play("ui.tap");
      const r = this.resolver;
      this.resolver = null;
      r(what === "back" ? "back" : "skip");
    },
    // How long a screen stays after its line has been read, so children can look at it.
    lookTime(words) {
      return CQ.clamp(900 + words * 70, 1300, 2600);
    },
  };

  // ------------------------------------------------------------------ SWAP button
  CQ.swapBtn = {
    build(ui) {
      this.el = button("swap-btn hidden", `${ICON.swap}<span>${C().ui.swap}</span>`, C().ui.swap, ui, () => {
        if (!this.cb) return;
        const cb = this.cb;
        this.cb = null;
        CQ.audio.play("ui.tap");
        this.hide();
        cb();
      });
      this.cb = null;
      const B = CQ.BAL;
      CQ.pos(this.el, CQ.L.BX - B.R * B.S, CQ.L.PIVOT_Y + (B.HANG_Y + B.PAN_BOTTOM) * B.S + 52); // between the left plate and the bars
    },
    show(cb) {
      this.cb = cb;
      this.tok = (this.tok || 0) + 1;
      this.el.classList.remove("hidden");
      CQ.audio.play("ui.pop");
      CQ.anim(this.el, [{ transform: "translate(-50%,-50%) scale(.2)" }, { transform: "translate(-50%,-50%) scale(1)" }], {
        duration: 420,
        easing: CQ.EASE.back,
      });
    },
    hide(now) {
      this.cb = null;
      const t = (this.tok = (this.tok || 0) + 1);
      if (now || this.el.classList.contains("hidden")) {
        this.el.classList.add("hidden");
        return;
      }
      CQ.anim(this.el, [{ opacity: 1, transform: "translate(-50%,-50%) scale(1)" }, { opacity: 0, transform: "translate(-50%,-50%) scale(.85)" }], {
        duration: 260,
        keep: false,
      }).then(() => {
        if (t === this.tok) this.el.classList.add("hidden");
      });
    },
    wait() {
      return CQ.run.when(new Promise((res) => this.show(res)));
    },
  };

  // ------------------------------------------------------------------ speech bubbles + comic words
  CQ.bubble = {
    build(ui) {
      this.el = CQ.el("div", "bubble hidden", ui);
      this.txt = CQ.el("div", "bubble-text", this.el);
      this.off = null;
      this.owner = 0;
    },
    // To Zippy's right, below the question bar, and well left of the equation over the balance (its
    // pop-in grows it a little, so it keeps a margin).
    place(el, wp) {
      const p = CQ.camera.toScreen(wp);
      const w = el.offsetWidth || 440;
      const x = CQ.clamp(p.x + 90, 20, Math.max(20, 930 - w));
      const y = CQ.clamp(p.y - 250, 196, CQ.H - 200);
      CQ.pos(el, x, y);
    },
    // Returns an owner id: hide(false, id) only hides the bubble if nobody has replaced it since.
    show(text, anchor, opts) {
      opts = opts || {};
      const get = typeof anchor === "function" ? anchor : () => anchor;
      this.el.className = "bubble " + (opts.who || "zippy");
      this.txt.innerHTML = CQ.rich(text);
      this.place(this.el, get());
      if (this.off) this.off();
      this.off = CQ.ticker.add(() => this.place(this.el, get()));
      CQ.anim(this.el, [{ transform: "scale(.3)", opacity: 0 }, { transform: "scale(1)", opacity: 1 }], { duration: 300, easing: CQ.EASE.back });
      return ++this.owner;
    },
    hide(now, owner) {
      if (owner != null && owner !== this.owner) return;
      if (this.off) this.off();
      this.off = null;
      if (now) {
        this.el.className = "bubble hidden";
        return;
      }
      CQ.anim(this.el, [{ opacity: 1 }, { opacity: 0 }], { duration: 320 }).then(() => {
        if (!this.off) this.el.className = "bubble hidden";
      });
    },
    // A short-lived extra bubble (e.g. Grumble mumbling) that does not disturb Zippy's bubble.
    flash(text, wp, opts) {
      const el = CQ.el("div", "bubble " + ((opts && opts.who) || "zippy"), CQ.ui.layer);
      CQ.el("div", "bubble-text", el, CQ.rich(text));
      this.place(el, wp);
      CQ.anim(el, [{ transform: "scale(.3)", opacity: 0 }, { transform: "scale(1)", opacity: 1 }], { duration: 300, easing: CQ.EASE.back });
      setTimeout(() => CQ.anim(el, [{ opacity: 1 }, { opacity: 0 }], { duration: 300 }).then(() => el.remove()), 2300);
    },
  };

  CQ.comic = function (text, wp, opts) {
    opts = opts || {};
    const p = CQ.camera.toScreen(wp);
    const e = CQ.el("div", "comic " + (opts.color || "purple"), CQ.ui.layer);
    e.style.fontSize = (opts.size || 72) + "px";
    Array.from(text).forEach((ch, i) => {
      const s = CQ.el("span", "", e, ch === " " ? "&nbsp;" : ch);
      s.style.setProperty("--r", CQ.rand(-12, 12).toFixed(1) + "deg");
      s.style.animationDelay = i * 40 + "ms";
    });
    // keep the whole word on screen, even at its pop-in's biggest (1.15 times its size)
    const half = (e.offsetWidth * 1.15) / 2 + 16;
    CQ.pos(e, CQ.clamp(p.x, half, CQ.W - half), CQ.clamp(p.y, 200, CQ.H - 80));
    const dur = opts.dur || 1100;
    CQ.anim(
      e,
      [
        { transform: "translate(-50%,-50%) scale(.2)", opacity: 0 },
        { transform: "translate(-50%,-50%) scale(1.15)", opacity: 1, offset: 0.18 },
        { transform: "translate(-50%,-50%) scale(1)", opacity: 1, offset: 0.3 },
        { transform: "translate(-50%,-80%) scale(1)", opacity: 0 },
      ],
      { duration: dur, easing: "ease-out", keep: false, essential: true }
    ).then(() => e.remove());
  };

  // ------------------------------------------------------------------ character name reveal (intro)
  // Text only: the name drops in letter by letter (straight, never tilted), with a tagline under it.
  CQ.nameBurst = function (text, tag, sx, sy, theme) {
    const e = CQ.el("div", "nameburst " + theme, CQ.ui.layer);
    CQ.pos(e, sx, sy);
    const word = CQ.el("div", "nb-word", e);
    Array.from(text).forEach((ch, i) => {
      const s = CQ.el("span", "nb-ch", word, ch);
      s.setAttribute("data-ch", ch);
      CQ.anim(s, [{ transform: "translateY(-180px) scale(.4)", opacity: 0 }, { transform: "translateY(0) scale(1)", opacity: 1 }], {
        duration: 520,
        delay: 120 + i * 85,
        easing: CQ.EASE.back,
        essential: true,
      });
    });
    const t = CQ.el("div", "nb-tag", e, tag);
    CQ.anim(t, [{ transform: "translateY(18px)", opacity: 0 }, { transform: "translateY(0)", opacity: 1 }], {
      duration: 420,
      delay: 220 + text.length * 85,
      easing: CQ.EASE.out,
      essential: true,
    });
    CQ.audio.play("name.burst");
    return e;
  };
  CQ.hideBurst = function (e) {
    if (!e) return Promise.resolve();
    return CQ.anim(e, [{ transform: "translate(-50%,-50%) scale(1)", opacity: 1 }, { transform: "translate(-50%,-50%) scale(.5)", opacity: 0 }], {
      duration: 300,
      essential: true,
    }).then(() => e.remove());
  };

  // ------------------------------------------------------------------ spotlight
  // A character is introduced: the rest of the scene fades to dark and blurs (CQ.soft) while the
  // character stays bright and sharp in a circle of light. layer: the world layer of the character.
  CQ.spot = {
    build(overlay) {
      this.el = CQ.el("div", "spotlight hidden", overlay);
      this.r = 1600;
      this.get = () => ({ x: 960, y: 540 });
      this.tick = null;
    },
    // (only when the light has moved or changed size: drawing the whole screen's gradient again at every
    // frame while it stood still made the browser fall behind on big screens, asked 2026-11-17)
    apply() {
      const p = CQ.camera.toScreen(this.get());
      const r = Math.round(this.r * 2) / 2;
      const bg = `radial-gradient(circle at ${Math.round(p.x * 2) / 2}px ${Math.round(p.y * 2) / 2}px, rgba(0,0,0,0) ${r}px, rgba(3,12,20,.76) ${r + 80}px)`;
      if (bg === this.bg) return;
      this.bg = bg;
      this.el.style.background = bg;
    },
    on(target, r, layer) {
      this.get = typeof target === "function" ? target : () => target;
      this.el.classList.remove("hidden");
      CQ.soft.set("spot", Array.isArray(layer) ? layer : layer ? [layer] : []); // (the layers kept sharp)
      if (!this.tick) this.tick = CQ.ticker.add(() => this.apply());
      const r0 = 1400;
      return CQ.tween(650, (k) => (this.r = CQ.lerp(r0, r, k)), CQ.ease.out, "spot");
    },
    off(now) {
      CQ.soft.set("spot", false);
      if (now) {
        this.el.classList.add("hidden");
        if (this.tick) this.tick();
        this.tick = null;
        return Promise.resolve();
      }
      const r0 = this.r;
      return CQ.tween(500, (k) => (this.r = CQ.lerp(r0, 1700, k)), CQ.ease.in, "spot").then(() => this.off(true));
    },
  };

  // ------------------------------------------------------------------ soft: the scene blurred
  // The scene's layers (background, Grumble, Zippy, the gold bars…) go soft, blurred and a little paler,
  // so that what matters stands out: a look-here moment keeps the balance sharp, and a formula screen or
  // an activity blurs the whole scene behind it. Each owner ("focus", "notebook", "activity") asks for
  // the layers it keeps sharp ([] = none); a layer is soft while any owner wants it soft.
  CQ.soft = {
    owners: new Map(),
    // shade: how dark the screen is meanwhile (see CQ.screen.shade); by default nearly black when the
    // whole scene is blurred (behind a formula screen or an activity), a fade otherwise.
    set(owner, keep, shade) {
      if (keep === false) this.owners.delete(owner);
      else this.owners.set(owner, keep);
      CQ.screen.shade("soft:" + owner, keep === false ? false : shade != null ? shade : keep.length ? 1 : 2);
      this.apply();
    },
    // every owner but except (one owner or a list of them)
    clear(except) {
      const kept = [].concat(except || []);
      this.owners.forEach((keep, owner) => !kept.includes(owner) && CQ.screen.shade("soft:" + owner, false));
      [...this.owners.keys()].forEach((owner) => !kept.includes(owner) && this.owners.delete(owner));
      this.apply();
    },
    apply() {
      const root = CQ.world && CQ.world.root;
      if (!root) return;
      root.querySelectorAll(":scope > .layer").forEach((l) => {
        let soft = false;
        this.owners.forEach((keep) => {
          if (!keep.includes(l)) soft = true;
        });
        l.classList.toggle("soft", soft);
      });
    },
  };

  // ------------------------------------------------------------------ focus: "look here!"
  // At a key teaching moment what the line is about glows softly, and the rest of the scene fades back a
  // little and blurs (review, 2026-11-13: "Remove the cyan-filled rectangle. A soft glow around the
  // relevant objects would fit the wooden, forest theme better… Keep the full balance visible…
  // Reduce the background dimming slightly"; until then a window with a gold ring went round it, the
  // lake showing through it, and the rest of the balance was in the dark). No window, no frame: the fade
  // is in the world (.world-shade.look), under the balance, the labels on it, sparkles and the layer of
  // whatever is looked at, which stay above it, bright and sharp (#world.looking in styles.css); each
  // thing looked at glows (.looked: a coin, a crown, a gold bar, a button, or the whole balance); the
  // rest of the scene blurs (CQ.soft). On a formula screen, the check or a side view, which have a
  // dark of their own, only the glow comes.
  // target: an element, a list of elements, or a function returning one of those (asked again every
  // frame, so whatever comes onto a pan meanwhile glows too). A new target while it is on: the glow
  // moves over to it. Taps go through, so the child can still act. opts: { quiet (no sound), text }.
  // opts.text: a look at words and numbers under the balance (the x + 2 = 7 strip): the whole scene
  // goes dark but for the balance, which stays bright and sharp in its place, and the words turn bright
  // and flat on the dark (styles.css, .lit). dimAll(): everything fades back and blurs, nothing kept.
  // UI pieces (caption, panels, buttons) sit above it all and stay bright.
  CQ.focus = {
    build() {
      this.tok = 0;
      this.active = false;
      this.get = null; // what glows
      this.tick = null;
      this.glowing = new Set();
      this.raised = [];
    },
    els(target) {
      if (typeof target === "function") target = target();
      return (Array.isArray(target) ? target : [target]).filter((e) => e && e.isConnected);
    },
    // the glow follows the target: what joins it starts to glow, what leaves it stops
    apply() {
      const now = new Set(this.get ? this.els(this.get) : []);
      this.glowing.forEach((e) => now.has(e) || e.classList.remove("looked"));
      now.forEach((e) => e.classList.add("looked"));
      this.glowing = now;
    },
    // the world layers of the things looked at go above the fade too (the gold bars, Zippy…)
    raise(layers) {
      this.raised.forEach((l) => layers.includes(l) || l.classList.remove("lift"));
      layers.forEach((l) => l.classList.add("lift"));
      this.raised = layers;
    },
    on(target, opts) {
      opts = opts || {};
      const t = ++this.tok;
      const w = CQ.world;
      const wasOn = this.active;
      const lit = !!opts.text;
      const all = !!opts.blurAll;
      this.active = true;
      this.get = lit || all ? null : target;
      const keep = all ? [] : lit ? [w.balanceLayer] : [w.balanceLayer, w.drag, w.fx]; // the layers kept sharp
      const own = [];
      if (this.get)
        this.els(target).forEach((e) => {
          const l = e.closest ? e.closest(".layer") : null;
          if (l && l.parentNode === w.root && !keep.includes(l)) own.push(l);
        });
      this.raise(own);
      w.root.classList.toggle("looking", !lit);
      w.root.classList.toggle("look-all", all);
      this.lit(lit);
      CQ.soft.set("focus", keep.concat(own), lit ? 2 : 1);
      this.apply();
      if (this.get && !this.tick) this.tick = CQ.ticker.add(() => this.apply());
      if (!this.get && this.tick) {
        this.tick();
        this.tick = null;
      }
      if (!wasOn && !opts.quiet) CQ.audio.play("focus.in", { volume: 0.6 });
      return t;
    },
    lit(on) {
      CQ.world.root.classList.toggle("lit", on);
      document.body.classList.toggle("lit", on);
    },
    dimAll(opts) {
      return this.on(null, Object.assign({ blurAll: true }, opts));
    },
    // Turn it off in ms (unless something else was focused meanwhile).
    offAfter(ms) {
      const t = this.tok;
      setTimeout(() => t === this.tok && this.off(), ms);
    },
    // The glow stops, and the scene sharpens and brightens again (styles.css: the fade takes 0.7 s; the
    // promise waits for it).
    off(now) {
      ++this.tok;
      const was = this.active;
      this.active = false;
      CQ.soft.set("focus", false);
      this.lit(false);
      const root = CQ.world && CQ.world.root;
      if (root) root.classList.remove("looking", "look-all");
      this.raise([]);
      if (this.tick) this.tick();
      this.tick = null;
      this.get = null;
      this.apply();
      return now || !was ? Promise.resolve() : CQ.sleep(700);
    },
  };

  // ------------------------------------------------------------------ thought bubble
  CQ.thought = function (wp, html, opts) {
    opts = opts || {};
    const p = CQ.camera.toScreen(wp);
    const e = CQ.el("div", "thought" + (opts.cls ? " " + opts.cls : ""), CQ.ui.layer);
    CQ.pos(e, p.x, p.y);
    if (opts.w) e.style.width = opts.w + "px";
    if (opts.h) e.style.height = opts.h + "px";
    const body = CQ.el("div", "th-body", e, html);
    const T = window.GEOM.thought;
    const im = IMAGES.thought;
    Object.assign(body.style, {
      left: (T.x0 / im.w) * 100 + "%",
      top: (T.y0 / im.h) * 100 + "%",
      width: ((T.x1 - T.x0) / im.w) * 100 + "%",
      height: ((T.y1 - T.y0) / im.h) * 100 + "%",
    });
    CQ.audio.play("thought.pop");
    CQ.anim(e, [{ transform: "translate(-50%,-50%) scale(.2)", opacity: 0 }, { transform: "translate(-50%,-50%) scale(1)", opacity: 1 }], {
      duration: 420,
      easing: CQ.EASE.back,
      essential: true,
    });
    e.body = body;
    return e;
  };
  CQ.hideThought = function (e) {
    if (!e) return Promise.resolve();
    return CQ.anim(e, [{ transform: "translate(-50%,-50%) scale(1)", opacity: 1 }, { transform: "translate(-50%,-50%) scale(.4)", opacity: 0 }], {
      duration: 380,
      essential: true,
    }).then(() => e.remove());
  };

  // ------------------------------------------------------------------ hand pointer demos
  // The hand shows how (tap here, drag that there) when a child has done nothing for a while (CQ.idle).
  // It goes the moment the child touches anything or presses a key, and comes back only if they wait
  // again (the learning-section skill: "It stops the moment the learner touches anything"). With Reduced
  // motion it doesn't move: it points, standing still, at what to take and then at where it goes (or at
  // what to tap), so the gesture still reads standing still ("stops the demonstrations").
  CQ.hand = {
    build(ui) {
      this.el = CQ.el("div", "hand hidden", ui);
      this.k = 104 / IMAGES.hand.w; // drawn 104 px wide
      // The art (the user's own hand nudge since 2026-11-09: art/ui/hand nudge.png) points up, with the
      // finger at the left of the hand (shown as drawn, not mirrored: asked 2026-11-05), so the finger
      // points up at what to tap or drag and the hand sits just below it.
      this.tip = { x: window.GEOM.hand.tipX * this.k, y: window.GEOM.hand.tipY * this.k };
      // Rings at the fingertip, under the finger: each grows from small to big as it fades, again and
      // again while the hand shows, two half a beat apart (asked 2026-11-09: "circle shrink to big").
      ["a", "b"].forEach((n) => CQ.pos(CQ.el("div", "hand-ring " + n, this.el), this.tip.x, this.tip.y));
      CQ.img("hand", "", this.el);
      this.el.style.transformOrigin = `${this.tip.x}px ${this.tip.y}px`;
      this.seq = 0;
      this.active = false; // a gesture is being shown (between its repeats too)
      ["pointerdown", "keydown"].forEach((t) => window.addEventListener(t, () => this.active && this.stop(), true));
    },
    placeAt(p) {
      CQ.pos(this.el, p.x - this.tip.x, p.y - this.tip.y);
    },
    stop() {
      this.seq++;
      this.active = false;
      CQ.stopTween("hand");
      this.el.classList.add("hidden");
      this.dropCarry();
    },
    dropCarry() {
      if (this.carry) this.carry.remove();
      this.carry = null;
    },
    // Show a drag gesture between two stage points (repeats a few times).
    // opts.carry() makes what the hand carries along (a faded gold bar); opts.carryScale: its size at the end.
    // opts.carryAt { x, y }: where the carried thing's middle is from the fingertip (a label held by its
    // end, so the hand stays clear of what the label's box points to).
    async drag(from, to, times, opts) {
      const id = ++this.seq;
      this.dropCarry();
      if (!from || !to) return;
      this.active = true;
      times = times || 2;
      opts = opts || {};
      const off = opts.carryAt || { x: 0, y: 0 };
      const alive = () => id === this.seq;
      const s1 = opts.carryScale || 1;
      for (let n = 0; n < times; n++) {
        if (!alive()) return;
        this.el.classList.remove("hidden");
        this.placeAt(from);
        const c = opts.carry ? opts.carry() : null;
        if (c) {
          this.el.parentNode.insertBefore(c, this.el); // under the hand
          CQ.pos(c, from.x + off.x, from.y + off.y);
          this.carry = c;
          CQ.anim(c, [{ opacity: 0 }, { opacity: 1 }], { duration: 300, keep: false, essential: true });
        }
        if (CQ.motion.reduced) {
          // standing still: at what to take, then at where it goes, the faded copy with it
          await CQ.anim(this.el, [{ opacity: 0 }, { opacity: 1 }], { duration: 300, keep: false, essential: true });
          await CQ.sleep(1100);
          if (!alive()) return;
          this.placeAt(to);
          if (c) {
            CQ.pos(c, to.x + off.x, to.y + off.y);
            c.firstChild.style.transform = `translate(-50%,-50%) scale(${s1})`;
          }
          await CQ.sleep(1300);
        } else {
          await CQ.anim(this.el, [{ opacity: 0, transform: "scale(1.2)" }, { opacity: 1, transform: "scale(1)" }], { duration: 300, keep: false, essential: true });
          if (!alive()) return;
          await CQ.anim(this.el, [{ transform: "scale(1)" }, { transform: "scale(.88)" }], { duration: 200, keep: false, essential: true });
          await CQ.tween(
            1350,
            (k) => {
              const p = { x: CQ.lerp(from.x, to.x, k), y: CQ.lerp(from.y, to.y, k) };
              this.placeAt(p);
              if (c) {
                CQ.pos(c, p.x + off.x, p.y + off.y);
                c.firstChild.style.transform = `translate(-50%,-50%) scale(${CQ.lerp(1, s1, k)})`;
              }
            },
            CQ.ease.inOut,
            "hand"
          );
        }
        if (!alive()) return;
        if (c) CQ.anim(c, [{ opacity: 1 }, { opacity: 0 }], { duration: 380, essential: true });
        await CQ.anim(this.el, [{ opacity: 1 }, { opacity: 0 }], { duration: 380, keep: false, essential: true });
        this.dropCarry();
        this.el.classList.add("hidden");
        await CQ.sleep(500);
      }
      if (alive()) {
        this.el.classList.add("hidden");
        this.active = false;
      }
    },
    tapAt(p, times) {
      return this.tapEach(p ? [p] : [], times);
    },
    // Taps each point in turn (two answers to choose from: "one of these"), gliding from one to the next:
    // times taps on each (default: twice on one point, once each on several).
    async tapEach(points, times) {
      const id = ++this.seq;
      this.dropCarry();
      CQ.stopTween("hand"); // an earlier drag demo must not keep moving the hand
      points = (points || []).filter(Boolean);
      if (!points.length) return;
      this.active = true;
      times = times || (points.length > 1 ? 1 : 2);
      const alive = () => id === this.seq;
      this.el.classList.remove("hidden");
      this.placeAt(points[0]);
      for (let i = 0; i < points.length; i++) {
        if (i > 0) {
          const a = points[i - 1];
          const b = points[i];
          if (CQ.motion.reduced) this.placeAt(b);
          else await CQ.tween(420, (k) => this.placeAt({ x: CQ.lerp(a.x, b.x, k), y: CQ.lerp(a.y, b.y, k) }), CQ.ease.inOut, "hand");
        }
        for (let n = 0; n < times; n++) {
          if (!alive()) return;
          if (CQ.motion.reduced) await CQ.sleep(650);
          else
            await CQ.anim(this.el, [{ transform: "translate(0,0) scale(1)" }, { transform: "translate(0,-14px) scale(.9)" }, { transform: "translate(0,0) scale(1)" }], {
              duration: 650,
              keep: false,
              essential: true,
            });
        }
      }
      if (alive()) {
        this.el.classList.add("hidden");
        this.active = false;
      }
    },
  };

  // ------------------------------------------------------------------ word gems
  CQ.gems = {
    have: new Set(),
    set(ids) {
      this.have = new Set(ids);
      this.badge();
    },
    badge() {}, // (no Word Treasure button on screen any more)
    // A word just taught goes into the Word Treasure (quietly: no "New word!" card pops up).
    collect(id) {
      this.have.add(id);
    },
  };

  // ------------------------------------------------------------------ Word Treasure (glossary)
  CQ.treasure = {
    build(modal) {
      this.el = CQ.el("div", "modal-wrap hidden", modal);
      this.el.addEventListener("click", (e) => {
        if (e.target === this.el) this.close();
      });
      const panel = CQ.el("div", "panel treasure-panel", this.el);
      panel.setAttribute("role", "dialog");
      panel.setAttribute("aria-label", C().ui.wordTreasure);
      CQ.el("h2", "panel-title", panel, `<img class="pt-chest" src="${IMAGES.chestOpen.src}" alt="" draggable="false"> ${C().ui.wordTreasure}`);
      this.list = CQ.el("div", "word-grid", panel);
      button("wbtn close-btn", "", C().ui.close, panel, () => this.close());
      this.isOpen = false;
    },
    cards(container, ids, animate) {
      container.innerHTML = "";
      const words = C().words.filter((w) => ids.includes(w.id));
      if (!words.length) {
        CQ.el("p", "empty", container, C().ui.wordTreasureEmpty);
        return [];
      }
      return words.map((w, i) => {
        const c = CQ.el(
          "div",
          "word-card",
          container,
          `<div class="wc-gem">${CQ.gem(w.color, 62)}</div><div class="wc-text"><div class="wc-word" style="--c:${w.color}">${w.word}</div><div class="wc-meaning">${CQ.rich(
            w.meaning
          )}</div></div><div class="wc-ex">${CQ.rich(w.example)}</div>`
        );
        if (animate)
          CQ.anim(c, [{ transform: "translateY(40px) scale(.7)", opacity: 0 }, { transform: "translateY(0) scale(1)", opacity: 1 }], {
            duration: 420,
            delay: i * 260,
            easing: CQ.EASE.back,
            keep: false,
          });
        return c;
      });
    },
    open() {
      if (this.isOpen) return;
      this.cards(this.list, Array.from(CQ.gems.have), false);
      this.el.classList.remove("hidden");
      this.isOpen = true;
      CQ.pauser.hold();
      CQ.audio.play("chest.open");
    },
    close() {
      if (!this.isOpen) return;
      this.el.classList.add("hidden");
      this.isOpen = false;
      CQ.pauser.release();
      CQ.audio.play("ui.tap");
    },
  };

  // ------------------------------------------------------------------ pause (any open panel pauses the story)
  CQ.pauser = {
    count: 0,
    hold() {
      if (this.count++ === 0) {
        CQ.run.pause();
        CQ.audio.duck(true);
        CQ.idle.disarm();
        CQ.hand.stop();
      }
    },
    release() {
      if (this.count === 0) return;
      if (--this.count === 0) {
        CQ.run.resume();
        CQ.audio.duck(false);
      }
    },
  };

  // ------------------------------------------------------------------ the screens list + replay (top left)
  // Two wooden buttons in the top left corner, from the first screen on (asked 2026-11-06): the list of
  // every screen of the quest (tap one to go straight there; the one on now is marked), and Play this
  // screen again (it starts the screen on now from its beginning). While the list is open the game
  // waits; a tap outside it, or Escape, closes it.
  CQ.nav = {
    build(ui) {
      this.el = CQ.el("div", "nav hidden", ui);
      this.listBtn = button("btn-wood nav-btn", ICON.menu, C().ui.screens, this.el, () => this.toggle());
      this.replayBtn = button("btn-wood nav-btn", ICON.restart, C().ui.replay, this.el, () => this.replay());
      this.listBtn.setAttribute("aria-haspopup", "true");
      this.listBtn.setAttribute("aria-expanded", "false");
      this.list = CQ.el("div", "panel nav-list hidden", ui);
      this.list.setAttribute("role", "menu");
      this.items = C().screens.map((s) => {
        const b = button("nav-item", `<span class="ni-n">${s.n}</span><span class="ni-t">${CQ.rich(s.title)}</span>`, s.title, this.list, () => this.go(s.id));
        b.setAttribute("role", "menuitem");
        b.dataset.cp = s.id;
        return b;
      });
      this.isOpen = false;
      // a tap anywhere else closes the list
      document.addEventListener(
        "pointerdown",
        (e) => {
          if (this.isOpen && !e.target.closest(".nav-list, .nav")) this.close();
        },
        true
      );
      window.addEventListener(
        "keydown",
        (e) => {
          if (e.key === "Escape" && this.isOpen) {
            e.stopImmediatePropagation(); // (not the pause menu as well)
            this.close();
          }
        },
        true
      );
    },
    show(on) {
      this.el.classList.toggle("hidden", !on);
      if (!on) this.close();
    },
    // the screen on now is marked in the list
    setCurrent(cp) {
      this.current = cp;
      this.items.forEach((b) => b.classList.toggle("now", b.dataset.cp === cp));
    },
    toggle() {
      if (this.isOpen) this.close();
      else this.open();
    },
    open() {
      if (this.isOpen) return;
      this.isOpen = true;
      // just under the question bar (it grows for a long line), and never higher than styles.css has it
      const cap = CQ.caption.el;
      this.list.style.top = cap.classList.contains("hidden") ? "" : Math.max(178, cap.offsetTop + cap.offsetHeight + 15) + "px";
      this.list.classList.remove("hidden");
      this.listBtn.setAttribute("aria-expanded", "true");
      CQ.pauser.hold();
      CQ.audio.play("ui.tap");
      CQ.anim(this.list, [{ opacity: 0, transform: "translateY(-12px)" }, { opacity: 1, transform: "translateY(0)" }], { duration: 220, easing: CQ.EASE.out, keep: false });
      const now = this.items.find((b) => b.classList.contains("now"));
      if (now) now.focus({ preventScroll: true });
    },
    close() {
      if (!this.isOpen) return;
      this.isOpen = false;
      this.list.classList.add("hidden");
      this.listBtn.setAttribute("aria-expanded", "false");
      CQ.pauser.release();
    },
    go(cp) {
      this.close();
      CQ.audio.play("ui.tap");
      if (CQ.flow) CQ.flow.chapter(cp);
    },
    replay() {
      this.close();
      if (!CQ.flow || !CQ.flow.current) return;
      CQ.audio.play("ui.tap");
      CQ.anim(this.replayBtn.querySelector("svg"), [{ transform: "rotate(0)" }, { transform: "rotate(360deg)" }], { duration: 500, easing: CQ.EASE.out, keep: false });
      CQ.flow.chapter(CQ.flow.current);
    },
  };

  // ------------------------------------------------------------------ menu + settings
  CQ.settings = {
    data: { music: true, sfx: true, voice: true, reducedMotion: null },
    load() {
      Object.assign(this.data, CQ.store.get("settings", {}));
      this.apply();
    },
    save() {
      CQ.store.set("settings", this.data);
    },
    apply() {
      ["music", "sfx", "voice"].forEach((k) => CQ.audio.setEnabled(k, this.data[k] !== false));
      if (this.data.reducedMotion != null) CQ.motion.reduced = !!this.data.reducedMotion;
      document.documentElement.classList.toggle("reduced-motion", CQ.motion.reduced);
    },
  };
  CQ.menu = {
    build(modal) {
      const c = C().ui;
      this.el = CQ.el("div", "modal-wrap hidden", modal);
      this.el.addEventListener("click", (e) => {
        if (e.target === this.el) this.close();
      });
      const panel = CQ.el("div", "panel menu-panel", this.el);
      panel.setAttribute("role", "dialog");
      panel.setAttribute("aria-label", c.paused);
      CQ.el("h2", "panel-title", panel, c.paused);
      button("btn-wood big resume", `${ICON.next}<span>${c.resume}</span>`, c.resume, panel, () => this.close());
      const toggles = CQ.el("div", "toggles", panel);
      this.toggles = {};
      [
        ["music", c.music],
        ["sfx", c.sfx],
        ["voice", c.voice],
        ["reducedMotion", c.reducedMotion],
      ].forEach(([k, label]) => {
        const t = button("toggle", `<span class="t-label">${label}</span><span class="t-switch"><span class="t-knob"></span></span>`, label, toggles, () => {
          if (k === "reducedMotion") CQ.settings.data[k] = !CQ.motion.reduced;
          else CQ.settings.data[k] = CQ.settings.data[k] === false;
          CQ.settings.apply();
          CQ.settings.save();
          this.refresh();
          CQ.audio.play("ui.tap");
        });
        t.setAttribute("role", "switch");
        this.toggles[k] = t;
      });
      CQ.el("h3", "sub-title", panel, c.chapters);
      const grid = CQ.el("div", "chapter-grid", panel);
      C().chapters.forEach((ch, i) => {
        button("chapter", `<span class="ch-n">${i + 1}</span><span class="ch-t">${ch.title}</span><span class="ch-s">${ch.sub}</span>`, ch.title, grid, () => {
          this.close();
          CQ.flow.chapter(ch.id);
        });
      });
      button("wbtn close-btn", "", C().ui.close, panel, () => this.close());
      this.isOpen = false;
      window.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
          if (CQ.treasure.isOpen) CQ.treasure.close();
          else if (this.isOpen) this.close();
          else if (CQ.flow && CQ.flow.started) this.open();
        }
      });
    },
    refresh() {
      Object.keys(this.toggles).forEach((k) => {
        const on = k === "reducedMotion" ? CQ.motion.reduced : CQ.settings.data[k] !== false;
        this.toggles[k].classList.toggle("on", on);
        this.toggles[k].setAttribute("aria-checked", on ? "true" : "false");
      });
    },
    open() {
      if (this.isOpen) return;
      this.refresh();
      this.el.classList.remove("hidden");
      this.isOpen = true;
      CQ.pauser.hold();
      CQ.audio.play("ui.tap");
    },
    close() {
      if (!this.isOpen) return;
      this.el.classList.add("hidden");
      this.isOpen = false;
      CQ.pauser.release();
    },
  };

  // ------------------------------------------------------------------ an answer: right or wrong
  // Every answer a child gives looks and sounds the same, wherever it is given (the learning-section
  // skill: "Every question follows one pattern, so a learner meets one game"):
  //   wrong: the control shakes its head and goes red for a beat, with the soft "try again" sound;
  //   right: it turns green for a moment, a tick draws itself on its corner, the success chime plays, it
  //   swells once and a small burst of sparkles goes off beside it.
  // What is said stays with each activity: a hint or the reason after a wrong answer, and nothing after a
  // right one (reviews of 2026-11-07: a right label or card gets no words), except praise with confetti
  // for the last of a set. With Reduced motion nothing moves: the colours and the tick only.
  //   opts.silent: no sound (the caller plays its own); opts.pulse: false where the control pops by itself
  CQ.answer = {
    BEAT: 700, // ms a wrong answer stays red
    LOOK: 1200, // ms a right answer stays green, with its tick
    wrong(el, opts) {
      opts = opts || {};
      if (!opts.silent) CQ.audio.play("tryagain");
      if (!el) return Promise.resolve();
      el.classList.add("is-wrong");
      setTimeout(() => el.classList.remove("is-wrong"), this.BEAT);
      if (CQ.motion.reduced) return CQ.sleep(this.BEAT / 2);
      // (the translate property: the control's own transform, a centring one too, is left alone)
      const shake = ["0px", "-12px", "10px", "-7px", "4px", "0px"].map((x) => ({ translate: x + " 0px" }));
      return CQ.anim(el, shake, { duration: 460, easing: "ease-in-out", keep: false, essential: true });
    },
    right(el, opts) {
      opts = opts || {};
      if (!opts.silent) CQ.audio.play("correct");
      if (!el) return;
      el.classList.add("is-right");
      setTimeout(() => el.classList.remove("is-right"), this.LOOK);
      const r = el.getBoundingClientRect();
      if (!r.width) return;
      const a = CQ.stage.toStage(r.left, r.top);
      const b = CQ.stage.toStage(r.right, r.bottom);
      this.tick(b.x - 4, a.y + 4, el);
      if (CQ.motion.reduced) return;
      if (opts.pulse !== false) this.pulse(el);
      CQ.fx.sparkle(CQ.ui.layer, b.x + 6, (a.y + b.y) / 2, 7, 46);
    },
    // one outward pulse: it swells a little and settles (about its own middle, whatever its transform)
    pulse(el) {
      if (!el || CQ.motion.reduced) return;
      const t = getComputedStyle(el).transform;
      const base = t && t !== "none" ? t + " " : "";
      CQ.anim(el, [{ transform: base + "scale(1)" }, { transform: base + "scale(1.08)", offset: 0.4 }, { transform: base + "scale(1)" }], {
        duration: 380,
        easing: "ease-out",
        keep: false,
        essential: true,
      });
    },
    // a green tick in a disc, at (x, y) on the stage: it pops in, its tick drawn by a pen, and fades away;
    // at once if its control goes first (the board moves on to its next screen)
    tick(x, y, owner) {
      const t = CQ.el("div", "answer-tick", CQ.ui.layer, '<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="21"/><path d="M13.5 25l7 7L35 17.5"/></svg>');
      CQ.pos(t, x, y);
      if (!CQ.motion.reduced) {
        CQ.anim(t, [{ transform: "scale(.4)", opacity: 0 }, { transform: "scale(1)", opacity: 1 }], { duration: 260, easing: CQ.EASE.back, keep: false, essential: true });
        CQ.anim(t.querySelector("path"), [{ strokeDashoffset: 33 }, { strokeDashoffset: 0 }], { duration: 280, delay: 140, easing: "ease-out", keep: false, essential: true });
      }
      const off = CQ.ticker.add(() => {
        if (!t.isConnected) off();
        else if (owner && !owner.isConnected) {
          off();
          t.remove();
        }
      });
      CQ.anim(t, [{ opacity: 1 }, { opacity: 0 }], { duration: 320, delay: this.LOOK - 320, fill: "forwards", essential: true }).then(() => {
        off();
        t.remove();
      });
    },
  };

  // ------------------------------------------------------------------ layout glides (FLIP)
  // When a change of layout moves things (a box melting into its number, a row coming in under others),
  // they glide from where they were to where they now stand instead of jumping: change() is run, then
  // each of els (none of them inside another) slides over (the translate property, so its own transform is
  // left alone; ms long, easing out). opts.scale: a thing that changed size grows or shrinks to it too.
  CQ.flip = function (els, change, ms, opts) {
    opts = opts || {};
    const k = CQ.stage.scale || 1;
    const was = els.map((e) => e.getBoundingClientRect());
    change();
    els.forEach((e, i) => {
      const a = was[i];
      if (!e.isConnected || (!a.width && !a.height)) return; // (not shown before)
      const r = e.getBoundingClientRect();
      if (!r.width && !r.height) return;
      const dx = (a.left + a.width / 2 - (r.left + r.width / 2)) / k;
      const dy = (a.top + a.height / 2 - (r.top + r.height / 2)) / k;
      const s = opts.scale ? a.width / r.width : 1;
      if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5 && Math.abs(s - 1) < 0.01) return;
      const from = { translate: `${dx}px ${dy}px` };
      const to = { translate: "0px 0px" };
      if (Math.abs(s - 1) >= 0.01) {
        from.scale = String(s);
        to.scale = "1";
      }
      CQ.anim(e, [from, to], { duration: ms || 480, easing: CQ.EASE.out, keep: false });
    });
  };

  // ------------------------------------------------------------------ number picker
  // The child taps a dashed blank, then picks one of three number tiles. Used by the Check panel.
  // Resolves with the number of misses once the right tile is picked.
  // A filled blank is done with: out of the keyboard's way, read as its number.
  CQ.fillBlank = function (b, v) {
    b.textContent = CQ.num(v);
    b.classList.add("filled");
    b.classList.remove("glow");
    b.tabIndex = -1;
    b.setAttribute("aria-disabled", "true");
    b.removeAttribute("aria-label");
    CQ.anim(b, [{ transform: "scale(1.4)" }, { transform: "scale(1)" }], { duration: 360, easing: CQ.EASE.back, keep: false });
  };
  CQ.pickNumber = function (b, host, options, correct, onMiss) {
    let picker = host.querySelector(":scope > .cp-picker");
    if (!picker) picker = CQ.el("div", "cp-picker hidden", host);
    let misses = 0;
    let resolve;
    const struck = new Set(); // the wrong tiles picked: struck out until the blank is filled
    b.classList.add("glow");
    const pick = (v, chip) => {
      if (v === correct) {
        picker.classList.add("hidden");
        CQ.fillBlank(b, v);
        CQ.answer.right(b, { pulse: false }); // (fillBlank pops it already)
        b.onclick = null;
        CQ.idle.disarm();
        CQ.hand.stop();
        resolve(misses);
        return;
      }
      if (struck.has(v)) return;
      misses++;
      struck.add(v);
      CQ.track("answer", { step: b.dataset.k || "pick", choice: v, correct: false, attempt: misses });
      chip.classList.add("wrong");
      chip.disabled = true;
      CQ.answer.wrong(chip);
      if (onMiss) onMiss(misses);
      if (misses >= 2) picker.querySelectorAll(".chip").forEach((c) => c.num === correct && c.classList.add("glow"));
    };
    const open = () => {
      CQ.audio.play("ui.pop");
      picker.innerHTML = "";
      picker.classList.remove("hidden");
      const br = b.getBoundingClientRect();
      const pr = host.getBoundingClientRect();
      const s = CQ.stage.scale;
      const below = host.classList.contains("check-panel"); // under the balance: the tiles open below the blank
      picker.classList.toggle("below", below);
      picker.style.left = (br.left + br.width / 2 - pr.left) / s + "px";
      picker.style.top = (below ? (br.bottom - pr.top) / s + 18 : (br.top - pr.top) / s - 20) + "px";
      options.forEach((v) => {
        const chip = button("chip", CQ.num(v), CQ.num(v), picker, () => pick(v, chip));
        chip.num = v; // (a button's own .value is always text)
        if (struck.has(v)) {
          chip.classList.add("wrong");
          chip.disabled = true;
        }
        if (misses >= 2 && v === correct) chip.classList.add("glow");
      });
      // the tiles stay within the check, clear of the balance beside it
      const half = picker.offsetWidth / 2;
      const cx = parseFloat(picker.style.left);
      picker.style.left = Math.max(half, Math.min(host.offsetWidth - half, cx)) + "px";
    };
    b.onclick = (e) => {
      e.stopPropagation();
      CQ.hand.stop();
      open();
    };
    CQ.idle.arm(() => CQ.hand.tapAt(CQ.centerOf(b)), 8000);
    // First time ever: show the gesture straight away.
    if (!CQ.store.get("blankDemoSeen", false)) {
      CQ.store.set("blankDemoSeen", true);
      setTimeout(() => {
        if (b.classList.contains("glow") && picker.classList.contains("hidden")) CQ.hand.tapAt(CQ.centerOf(b));
      }, 700);
    }
    return CQ.run.when(new Promise((res) => (resolve = res)));
  };

  // ------------------------------------------------------------------ Check panel (substitute, find each side, the ending)
  // The check is shown like the formula screen (asked 2026-11-05): the view glides until the balance
  // stands at the left, bright, with the rest of the scene dark (Zippy, holding the bar, waits unseen),
  // and the check is worked at the right, big, one row under another, each piece coming in by itself.
  // Pieces appear one at a time (styles.css: body.checking).
  // Pieces of the check written in one after another, as if by hand, as the voice gets to cue in line
  // (at once with no cue): words letter by letter, a blank popping in. each: ms per letter. (Review,
  // 2026-11-16: "animation se dikhao likhte hue", "ekdum appear kyu horha hai".)
  async function writePieces(els, line, cue, each) {
    each = each || 70;
    els.forEach((e) => (e.style.opacity = "0"));
    if (cue && line) await CQ.run.when(CQ.caption.when(line, cue));
    CQ.audio.play("ui.pop", { volume: 0.55 });
    for (const e of els) {
      e.style.opacity = "";
      if (e.matches(".blank")) {
        CQ.anim(e, [{ opacity: 0, transform: "scale(.6)" }, { opacity: 1, transform: "scale(1)" }], { duration: 260, easing: CQ.EASE.back, keep: false });
        await CQ.run.wait(180);
      } else await CQ.run.wait(CQ.writeIn(e, 0, each) + 30);
    }
  }
  // the words of a line up to where it says the number v ("Replace x with 4": "Replace x with 4"), for
  // CQ.caption.when; null if it doesn't say it
  function numberCue(line, v) {
    if (!line) return null;
    const n = String(CQ.num(v)).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const m = new RegExp("(^|[^\\d.])" + n + "(?![\\d])").exec(line);
    return m ? line.slice(0, m.index + m[0].length) : null;
  }
  CQ.numberCue = numberCue;
  CQ.checkPanel = {
    build(ui) {
      this.el = CQ.el("div", "check-panel hidden", ui);
      // One grid, a row each, every row's = under the one above (review, 2026-11-18: "Check the alignment
      // of text in x = 8 for all equations": the equation and "Try x = 8" stood centred by themselves,
      // and only the two sides were lined up with each other): the equation, kept in sight all through
      // the check; Try x = 4; LHS = 4 + 3 = □; RHS = □. A row's parts are the grid's cells: its name (or
      // left side) | = | the rest.
      this.row = CQ.el("div", "cp-row", this.el);
      this.eqRow = CQ.el("div", "cp-side eqn", this.row);
      this.xRow = CQ.el("div", "cp-side try", this.row); // Try x = 4: the value put in for x
      this.lhs = CQ.el("div", "cp-side lhs", this.row);
      this.rhs = CQ.el("div", "cp-side rhs", this.row);
      this.isOpen = false;
    },
    // The view glides: the balance to the left, the rest dark, the check at the right (CQ.ASIDE).
    // (close: back to the whole scene.)
    async open() {
      if (this.isOpen) return;
      this.isOpen = true;
      document.body.classList.add("checking");
      CQ.soft.set("check", [CQ.world.balanceLayer], 2);
      CQ.balance.present(true);
      CQ.audio.play("focus.in");
      const A = CQ.ASIDE;
      await CQ.camera.to(A.x, A.y, A.z, 1400, null, A.free);
      if (this.isOpen) CQ.zippy.setVisible(false); // already unseen under the dark
    },
    async close() {
      if (!this.isOpen) return;
      this.isOpen = false;
      CQ.focus.off();
      const p = this.el.querySelector(":scope > .cp-picker");
      if (p) p.classList.add("hidden");
      await CQ.anim(this.el, [{ opacity: 1 }, { opacity: 0 }], { duration: 420, easing: CQ.EASE.in, essential: true });
      this.el.classList.add("hidden");
      this.el.style.opacity = "";
      document.body.classList.remove("checking");
      CQ.zippy.setVisible(true); // still under the dark: he is simply there as it lifts
      CQ.balance.present(false);
      CQ.soft.set("check", false);
      await CQ.camera.to(960, 540, 1, 1300);
    },
    // eq = { k, a, b, rhsGiven }: the equation k·x + a = b (k is 1 except for Level 9's two crowns).
    // The check, one row under another (review, 2026-11-13): the equation itself at the top, kept in
    // sight; "Try x = 4", the value tried for x, clearly a try ("'Try x = 4' so it is clearly a trial
    // value"), the value plain, with no box round it (review, 2026-11-18: "4 is not required to put in a
    // box. SAME WHEN WE TRY FOR x = 6 and other values"); LHS = 4 + 3 = □, when the left side is worked
    // out; RHS = □ under it, when the right side is (or RHS = 23, when it is given); then the ending's two
    // screens (flow.js, checkRoutine; confirm, below).
    async show(eq) {
      this.eq = eq;
      const k = eq.k || 1;
      const U = C().ui;
      this.el.classList.remove("hidden");
      this.eqRow.className = "cp-side eqn";
      this.eqRow.innerHTML = `<span class="lab">${CQ.rich(`${k > 1 ? k : ""}x + ${eq.a}`)}</span><span class="op e1">=</span><span class="rest">${CQ.num(eq.b)}</span>`;
      this.xRow.className = "cp-side try";
      this.xRow.innerHTML = `<span class="lab"><span class="tw">${U.tryWord}</span> <i class="v">x</i></span><span class="op e1">=</span><span class="rest"><span class="xval"></span></span>`;
      // each side: its name, =, then the rest (its expression, = and its value; or only its value), the
      // sides' first = signs under the equation's, so the right side's box stands under the 4 (same review:
      // "After the answer, reveal RHS = □ directly below, with the first equals signs aligned", "place a
      // single input box directly after RHS:, aligned beneath the 4 in the LHS row"; it was RHS: 9 = ?).
      // x in the left side is plain too: the value takes its place, unboxed. The left side's value stays on
      // its own line, after the expression, all on one baseline: LHS = 15 + 8 = 23 (review, 2026-11-19:
      // "23 is equal to should same line in 15 is equal to"; = 23 put on a line of its own under it, left
      // of 15 + 8, was turned down the same day: "Please don't do this like this… in all game").
      this.lhs.className = "cp-side lhs";
      this.rhs.className = "cp-side rhs";
      this.lhs.innerHTML = `<span class="lab">${U.lhs}</span><span class="op e1">=</span><span class="rest"><span class="ex">${k > 1 ? `<span class="op">${k} ×</span>` : ""}<span class="xslot"><i class="v">x</i></span><span class="op">+ ${eq.a}</span></span><span class="eqv"><span class="op">=</span><button type="button" class="blank" data-k="lhs" aria-label="${U.lhsValue}">?</button></span></span>`;
      this.rhs.innerHTML = eq.rhsGiven
        ? `<span class="lab">${U.rhs}</span><span class="op e1">=</span><span class="rest"><span class="ex"><span class="op">${CQ.num(eq.b)}</span></span></span>`
        : `<span class="lab">${U.rhs}</span><span class="op e1">=</span><span class="rest"><span class="eqv"><button type="button" class="blank" data-k="rhs" aria-label="${U.rhsValue}">?</button></span></span>`;
      const old = this.el.querySelector(":scope > .cp-picker");
      if (old) old.classList.add("hidden");
      this.el.style.opacity = "";
      this.el.style.transform = "";
      // the equation comes in; Try x = …, the left side and the right side wait for their turns
      [...this.xRow.children, ...this.pieces(this.lhs), ...this.pieces(this.rhs)].forEach((e) => (e.style.opacity = "0"));
      CQ.audio.play("ui.pop");
      [...this.eqRow.children].forEach((e) => {
        e.style.opacity = "";
        CQ.anim(e, [{ opacity: 0, translate: "0 16px" }, { opacity: 1, translate: "0 0" }], { duration: 420, easing: CQ.EASE.out, keep: false, essential: true });
      });
      await CQ.run.wait(660);
    },
    // a side's pieces, one by one (its name, =, the parts of its expression, =, its value)
    pieces(side) {
      return [...side.querySelectorAll(":scope > .lab, :scope > .e1, :scope > .rest > .ex > *, :scope > .rest > .eqv > *")];
    },
    // The left side is written in as the voice names it (line: the line being said; cue: its words,
    // "left-hand"), with the value already in for x.
    async lhsRow(line, cue) {
      await writePieces(this.pieces(this.lhs), line, cue);
      await CQ.run.wait(200);
    },
    // The right side, the same way ("right-hand"; or straight on, when it is given).
    async side(line, cue) {
      await writePieces(this.pieces(this.rhs), line, cue);
      await CQ.run.wait(250);
    },
    hide(now) {
      const p = this.el.querySelector(":scope > .cp-picker");
      if (p) p.classList.add("hidden");
      if (now) {
        // (a chapter jump: the scene, the blur and the camera are put back by the reset; the rows lose
        // their looks, the ending's too)
        this.isOpen = false;
        document.body.classList.remove("checking");
        this.el.classList.add("hidden");
        [this.lhs, this.rhs, this.xRow].forEach((s) => s.classList.remove("lit", "faded", "sure", "lit-ok", "lit-no"));
        return Promise.resolve();
      }
      return CQ.anim(this.el, [{ transform: "translate(-50%, 0)", opacity: 1 }, { transform: "translate(-50%, 60px)", opacity: 0 }], {
        duration: 440,
        easing: CQ.EASE.in,
        essential: true,
      }).then(() => this.el.classList.add("hidden"));
    },
    blank(k) {
      return this.el.querySelector(`.blank[data-k="${k}"]`);
    },
    // Try x = …: "Try x =" written in, then the value flies (from Zippy's hands, or out of the crown) to
    // its place as the voice says it (line: the line being said; at once if it doesn't say the value),
    // and stands there as a plain number, gold like the rest of the try; the left side's x takes the value
    // too (it shows when the left side is written).
    async substitute(v, fromWorld, line) {
      const [lab, e1, rest] = this.xRow.children;
      await writePieces([lab, e1], null, null);
      const cue = numberCue(line, v);
      if (cue) await CQ.run.when(CQ.caption.when(line, cue));
      const val = rest.querySelector(".xval");
      val.textContent = CQ.num(v);
      val.style.visibility = "hidden";
      rest.style.opacity = "";
      const to = CQ.centerOf(val);
      const from = fromWorld ? CQ.camera.toScreen(fromWorld) : to;
      CQ.audio.play("ui.swoosh");
      await CQ.fly(CQ.ui.layer, CQ.el("div", "num-fly", null, CQ.num(v)), from, to, { duration: 700, arc: -160, scaleFrom: 0.55 });
      val.style.visibility = "";
      this.lhs.querySelector(".xslot").innerHTML = `<span class="subbed">${CQ.num(v)}</span>`;
      CQ.audio.play("ui.pop");
      CQ.anim(val, [{ transform: "scale(1.35)" }, { transform: "scale(1)" }], { duration: 380, easing: CQ.EASE.back, keep: false });
    },
    // The child picks a side's value; once it is in, its box melts away (settle).
    fill(k, options, correct, onMiss) {
      return CQ.pickNumber(this.blank(k), this.el, options, correct, onMiss).then((misses) => {
        this.settle(k);
        return misses;
      });
    },
    // A right number in its box: once it has stood green for a moment, its box melts away and it stays in
    // the row as a plain number in its side's colour (review, 2026-11-18: the picture's "LHS = 6 + 3 = 9,
    // RHS = 9", no boxes round the numbers of the working); what stands beside it glides, nothing jumps.
    settle(k) {
      const b = this.blank(k);
      if (!b) return;
      setTimeout(() => {
        if (!b.isConnected || b.classList.contains("melt")) return;
        b.classList.add("melt"); // its box fades out
        setTimeout(() => b.isConnected && CQ.flip(this.cells(), () => b.classList.add("plain"), 460), 340);
      }, CQ.answer.LOOK);
    },
    // every part of the working that stands by itself (none inside another), for a glide
    cells() {
      return [...this.eqRow.children, ...this.xRow.children, ...this.pieces(this.lhs), ...this.pieces(this.rhs)];
    },
    // Screen 2 of the check's ending (review, 2026-11-18: "change 'Try x = 6' to a clear x = 6"): "Try"
    // fades, leaving x = 6 under the equation, its = under the equation's; it lights green as the voice
    // says "x = 6" (red for a value that is not a solution: "So, x = 4 is not a solution."). The working
    // under it, LHS and RHS, stays in full view, unlit (review, 2026-11-19: "before we remove LHS and RHS
    // part, so please add this part again"; it faded away, 2026-11-18). Nothing is written under x = 6,
    // no Solution / Not a solution (review, 2026-11-19: "do not write not a solution and this kind of
    // things in this game"): the voice says it. cue = { lit }: the words the light waits for in line.
    async confirm(ok, line, cue) {
      this.lightSide(null);
      this.xRow.classList.add("sure");
      if (cue.lit) await CQ.run.when(CQ.caption.when(line, cue.lit));
      this.xRow.classList.add(ok ? "lit-ok" : "lit-no");
    },
    // The side the voice is saying the value of glows in its colour; the other side's glow fades, the
    // row itself staying as it is, in full view ("The left-hand side equals 7" with LHS = 4 + 3 = 7 lit:
    // review, 2026-11-13, "Fade the previous highlight"); and as the right side is talked about, the left
    // side's row fades back a little (review, 2026-11-16: "jab RHS ki baat hoti toh LHS thda fade ho skta
    // hai"); "both": the two lit together, in full ("Both sides have the same value"); null: neither lit,
    // both in full.
    lightSide(which) {
      [
        ["lhs", this.lhs],
        ["rhs", this.rhs],
      ].forEach(([k, el]) => {
        el.classList.toggle("lit", which === k || which === "both");
        el.classList.toggle("faded", which === "rhs" && k === "lhs");
      });
    },
    // A side's value, as the voice says it: it swells a moment (it was worked out a moment ago).
    sayValue(k) {
      const side = k === "lhs" ? this.lhs : this.rhs;
      const v = side.querySelector(".eqv .blank") || side.querySelector(".rest .ex > :last-child");
      if (v) CQ.anim(v, [{ transform: "scale(1)" }, { transform: "scale(1.22)", offset: 0.35 }, { transform: "scale(1)" }], { duration: 650, easing: "ease-out", keep: false });
    },
  };

  // ------------------------------------------------------------------ equation board (Levels 8 and 9)
  // The working of Levels 8 and 9, shown like the formula screen (asked 2026-11-05): the view glides
  // until the balance stands at the left, bright, and the steps are written at the right, one row under
  // another, each one written in; the earlier rows fade back a little. The child takes bars off with the
  // working in view, and each − 8 (− 4) is written as its bar comes off (set's hold, then reveal:
  // review, 2026-11-08).
  CQ.eqBoard = {
    build(ui) {
      this.el = CQ.el("div", "eq-board hidden", ui);
      this.isOpen = false;
    },
    async open() {
      if (this.isOpen) return;
      this.isOpen = true;
      document.body.classList.add("solving");
      CQ.world.root.classList.add("solving");
      CQ.soft.set("solve", [CQ.world.balanceLayer, CQ.world.drag], 2);
      CQ.balance.present(true);
      CQ.audio.play("focus.in");
      const A = CQ.ASIDE; // the balance at the left, the working at the right
      await CQ.camera.to(A.x, A.y, A.z, 1400, null, A.free);
      if (!this.isOpen) return;
      CQ.zippy.setVisible(false); // already unseen under the dark
      if (this.el.children.length) {
        // the rows so far come back, faded, before the next one is written
        this.el.classList.remove("hidden");
        await CQ.anim(this.el, [{ opacity: 0 }, { opacity: 1 }], { duration: 450, essential: true });
      }
    },
    async close() {
      if (!this.isOpen) return;
      this.isOpen = false;
      CQ.focus.off();
      if (!this.el.classList.contains("hidden")) await CQ.anim(this.el, [{ opacity: 1 }, { opacity: 0 }], { duration: 420, easing: CQ.EASE.in, essential: true });
      this.el.classList.add("hidden");
      this.el.style.opacity = "";
      document.body.classList.remove("solving");
      CQ.world.root.classList.remove("solving");
      CQ.zippy.setVisible(true); // still under the dark: he is simply there as it lifts
      CQ.balance.present(false);
      CQ.soft.set("solve", false);
      await CQ.camera.to(960, 540, 1, 1300);
    },
    // The first row of the working (a fresh board).
    show(text, opts) {
      this.el.innerHTML = "";
      return this.set(text, opts);
    },
    // The next step: a new row under the others, written in, while the earlier rows fade back.
    // opts.same: the last row changes instead (a highlight); opts.final: the answer (green);
    // opts.hold: a selector for parts of the row left out until reveal() (taking no room meanwhile);
    // opts.each: ms per letter as it is written in (55); opts.onWrite [selector, fn(el, i)]: fn runs for
    // each part of the row matching the selector as its first letter is written (Level 9: each x with
    // its crown).
    set(text, opts) {
      opts = opts || {};
      if (this.isOpen) this.el.classList.remove("hidden");
      let row = opts.same ? this.el.lastElementChild : null;
      // the rows already there, where they stand now: the board keeps its rows in the middle of its room
      // (asked 2026-11-09: "utilise the negative space"), so they glide up as a new one comes (below)
      const before = row ? null : Array.from(this.el.children).map((r) => [r, r.getBoundingClientRect().top]);
      if (!row) {
        this.el.querySelectorAll(".eb-row").forEach((r) => r.classList.add("done"));
        this.unmark(); // the step before is done: its − 8 / ÷ 2 marks go back to plain
        row = CQ.el("div", "eb-row", this.el);
      }
      // its left side, =, its right side: every row's = stands in the middle of the board, under the
      // one above (review, 2026-11-08: "Keep the equal signs vertically aligned")
      const i = text.indexOf(" = ");
      row.innerHTML =
        i < 0
          ? `<span class="eb-all">${CQ.rich(text)}</span>`
          : `<span class="eb-l">${CQ.rich(text.slice(0, i))}</span><span class="eb-eq">=</span><span class="eb-r">${CQ.rich(text.slice(i + 3))}</span>`;
      row.classList.toggle("final", !!opts.final);
      if (opts.hold) row.querySelectorAll(opts.hold).forEach((e) => (e.style.display = "none"));
      if (before) {
        const k = CQ.stage.scale || 1;
        before.forEach(([r, top]) => {
          const dy = (top - r.getBoundingClientRect().top) / k;
          if (Math.abs(dy) > 0.5) CQ.anim(r, [{ transform: `translateY(${dy}px)` }, { transform: "translateY(0px)" }], { duration: 560, easing: CQ.EASE.out, keep: false });
        });
      }
      CQ.audio.play("ui.pop", { volume: 0.6 });
      if (opts.same) {
        CQ.anim(row, [{ opacity: 0.35 }, { opacity: 1 }], { duration: 480, easing: CQ.EASE.out, keep: false });
        return CQ.sleep(480);
      }
      const each = opts.each || 55;
      // opts.parts = [{ text, cue }] with opts.line: the row is written part by part, each part as the
      // voice of the line says its word (review, 2026-11-16: "jab VO bole 7 tb 7 aana chahie")
      if (opts.parts && CQ.writeOut) return CQ.writeOut(row, opts.parts, opts.line, each + 15);
      const took = CQ.writeIn ? CQ.writeIn(row, 0, each) : 0;
      if (opts.onWrite) {
        const [sel, fn] = opts.onWrite;
        const chars = Array.from(row.querySelectorAll(".wch"));
        row.querySelectorAll(sel).forEach((el, n) => {
          const k = Math.max(0, chars.indexOf(el.querySelector(".wch"))); // its first letter comes at k × each
          setTimeout(() => el.isConnected && fn(el, n), k * each);
        });
      }
      return CQ.sleep(took);
    },
    // A stretch of a row lit up as one, from one of its parts to a later one in the same side (Level 9:
    // x + x; the terms that cancel): they are wrapped in a span, lit with a ring that takes no room (cls:
    // x-lit, gold; c-lit, red). Returns the span (its class off: unlit).
    light(first, last, cls) {
      const span = document.createElement("span");
      span.className = "x-span " + (cls || "x-lit");
      first.parentNode.insertBefore(span, first);
      for (let n = first; n; ) {
        const next = n.nextSibling;
        span.appendChild(n);
        if (n === last) break;
        n = next;
      }
      return span;
    },
    // The {{…}} marks of the rows so far (− 8 on both sides, ÷ 2) back to plain, their boxes fading: lit
    // only while their step is talked about (asked 2026-11-19: "after this no need to highlight").
    unmark() {
      this.el.querySelectorAll(".same").forEach((e) => e.classList.add("unmark"));
    },
    // Parts of the last row left out by set's hold come in, gently: what stands beside them glides
    // over to make room (the left side grows to the left, its = staying under the others).
    reveal(sel) {
      const row = this.el.lastElementChild;
      const els = row ? [...row.querySelectorAll(sel)].filter((e) => e.style.display === "none") : [];
      if (!els.length) return Promise.resolve();
      const parts = [...row.children];
      const was = parts.map((e) => e.getBoundingClientRect().left);
      els.forEach((e) => (e.style.display = ""));
      parts.forEach((e, i) => {
        const dx = (was[i] - e.getBoundingClientRect().left) / CQ.stage.scale;
        if (Math.abs(dx) > 0.5) CQ.anim(e, [{ transform: `translateX(${dx}px)` }, { transform: "translateX(0px)" }], { duration: 520, easing: CQ.EASE.out, keep: false });
      });
      els.forEach((e) => CQ.anim(e, [{ opacity: 0 }, { opacity: 1 }], { duration: 520, easing: CQ.EASE.out, keep: false }));
      CQ.audio.play("ui.pop", { volume: 0.6 });
      return CQ.sleep(520);
    },
    hide(now) {
      // (a chapter jump: the scene, the blur and the camera are put back by the reset)
      this.isOpen = false;
      document.body.classList.remove("solving");
      if (CQ.world.root) CQ.world.root.classList.remove("solving");
      this.el.classList.add("hidden");
      this.el.style.opacity = "";
      this.el.innerHTML = "";
      return Promise.resolve();
    },
  };
})();
