/*
 * Zippy's Crown Quest: activities.
 * The formula screen (concept explanations with Back), "Label the parts", "Sort it",
 * the Word Treasure recap chest, and the finale.
 */
(function () {
  "use strict";
  const CQ = window.CQ;
  const C = () => window.CONTENT;
  const button = (...a) => CQ.button(...a);

  // ------------------------------------------------------------------ equation tokens
  // spec: [{ t: 'x', id: 'x', k: 'var' }, ...]  k: var | op | num | eq
  CQ.eqTokens = function (parent, spec, cls) {
    const e = CQ.el("div", "eqn " + (cls || ""), parent);
    spec.forEach((tk) => {
      const s = CQ.el("span", "tok " + (tk.k || "num") + (tk.cls ? " " + tk.cls : ""), e, tk.k === "var" ? '<i class="v">x</i>' : CQ.rich(tk.t));
      s.dataset.id = tk.id;
    });
    e.deco = CQ.el("div", "deco", e);
    return e;
  };
  // Rectangle of a token group relative to the equation element.
  function groupRect(eqn, ids) {
    let x0 = Infinity;
    let y0 = Infinity;
    let x1 = -Infinity;
    let y1 = -Infinity;
    ids.forEach((id) => {
      const t = eqn.querySelector(`.tok[data-id="${id}"]`);
      if (!t) return;
      x0 = Math.min(x0, t.offsetLeft);
      y0 = Math.min(y0, t.offsetTop);
      x1 = Math.max(x1, t.offsetLeft + t.offsetWidth);
      y1 = Math.max(y1, t.offsetTop + t.offsetHeight);
    });
    return { x: x0, y: y0, w: x1 - x0, h: y1 - y0, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 };
  }
  CQ.groupRect = groupRect;

  // ------------------------------------------------------------------ the formula screen
  const EQ_X2 = [
    { t: "x", id: "x", k: "var" },
    { t: "+", id: "plus", k: "op" },
    { t: "2", id: "two", k: "num" },
    { t: "=", id: "eq", k: "eq" },
    { t: "7", id: "seven", k: "num" },
  ];
  const LHS = ["x", "plus", "two"];

  // The formula screen. The view glides (zooms in and pans) until the balance stands at the right of
  // the screen, on its own ground, bright and sharp, while the rest of the scene goes soft and dark
  // (CQ.balance.present). Then the equation is written in at the left, one sign at a time. The part of
  // the balance a beat talks about lights up: the crown for x, a pan for a side, both pans when the
  // sides are equal. Each beat adds tags, boxes and highlights: what stays the same from one beat to
  // the next stays still, and what is new fades in where it stays, one piece at a time. The question
  // bar above says the line. Zippy isn't on this screen: the balance and the maths have it to
  // themselves. On closing, the maths fades and the view glides back to the whole scene.
  const ASIDE = { x: 760, y: 472, z: 1.25 }; // the view: the balance at the right (x 910–1800 on screen), room at the left
  CQ.notebook = {
    build(overlay) {
      this.el = CQ.el("div", "notebook hidden", overlay);
      this.stage = CQ.el("div", "nb-stage", this.el);
      this.content = CQ.el("div", "nb-content", this.stage);
      this.isOpen = false;
      this.opens = 0; // counts opens and closes, so a late step of an old one does nothing
      this.shown = null; // the beat on screen: { sig, keys, toks, bal }
    },
    async open() {
      if (this.isOpen) return;
      this.isOpen = true;
      const n = ++this.opens;
      this.el.classList.remove("hidden");
      this.content.innerHTML = "";
      this.stage.style.opacity = ""; // (a close leaves it faded out)
      this.shown = null;
      CQ.soft.set("notebook", [CQ.world.balanceLayer], 2); // all but the balance goes soft
      CQ.balance.present(true);
      CQ.audio.play("focus.in");
      await CQ.camera.to(ASIDE.x, ASIDE.y, ASIDE.z, 1400); // then the first beat writes the equation in
      if (n === this.opens) CQ.zippy.setVisible(false); // already unseen under the dark
    },
    async close() {
      if (!this.isOpen) return;
      this.isOpen = false;
      const n = ++this.opens;
      CQ.audio.play("ui.swoosh");
      CQ.focus.off();
      this.framed = false;
      await CQ.anim(this.stage, [{ opacity: 1 }, { opacity: 0 }], { duration: 400, easing: CQ.EASE.in, essential: true });
      if (n !== this.opens) return;
      this.el.classList.add("hidden");
      this.content.innerHTML = "";
      this.shown = null;
      CQ.zippy.setVisible(true); // still under the dark: he is simply there as it lifts
      CQ.balance.present(false);
      CQ.soft.set("notebook", false);
      await CQ.camera.to(960, 540, 1, 1300); // back to the whole scene
    },
    hideNow() {
      this.isOpen = false;
      this.opens++;
      this.shown = null;
      this.framed = false;
      this.content.innerHTML = "";
      this.el.classList.add("hidden");
      CQ.soft.set("notebook", false);
      CQ.balance.present(false, true);
    },
    // Draw one beat. s = { hl, crown, mini, tags, box, boxColor, label, pulse, outline, outlineLabel,
    // lhs, rhs, ghost, title, rows, bal }. crown: the crown over x; mini: the crown and two coins over
    // x + 2 (both fly over from the balance). rows are lines worked out under the equation ({ t, cls }:
    // cls "big", "no" red, "ok" green). bal is the part of the balance the frame goes round: "crown",
    // "left", "right", "both", or "level" (the whole balance, and its centre flashes: the sides are
    // equal). Each piece gets a key; pieces that were already on screen in the last beat stay as they
    // were, so only the new ones catch the eye.
    render(s) {
      const sig = JSON.stringify(s);
      if (this.shown && this.shown.sig === sig) return this.content.querySelector(".eqn");
      const c = this.content;
      c.innerHTML = "";
      const keys = new Set();
      const add = (el, key) => {
        el.dataset.key = key;
        keys.add(key);
        return el;
      };
      const eqn = CQ.eqTokens(c, EQ_X2, "big");
      if (s.title) add(CQ.el("div", "nb-title", c, s.title), "title:" + s.title);
      const tok = (id) => eqn.querySelector(`.tok[data-id="${id}"]`);
      (s.hl || []).forEach((id) => tok(id).classList.add("hl"));
      if (s.lhs) LHS.forEach((id) => tok(id).classList.add("lhs"));
      if (s.rhs) tok("seven").classList.add("rhs");
      (s.pulse || []).forEach((id) => tok(id).classList.add("pulse"));
      if (s.ghost) add(CQ.el("sup", "ghost-power", tok("x"), "1"), "ghost");
      const d = eqn.deco;
      if (s.box) {
        const r = groupRect(eqn, s.box);
        const b = add(CQ.el("div", "grp-box" + (s.boxColor ? " " + s.boxColor : ""), d), "box:" + s.box.join() + (s.boxColor || ""));
        CQ.box(b, r.x - 18, r.y - 4, r.w + 36, r.h + 8);
      }
      if (s.outline) {
        const r = groupRect(eqn, EQ_X2.map((t) => t.id));
        const b = add(CQ.el("div", "grp-outline", d), "outline");
        CQ.box(b, r.x - 30, r.y - 14, r.w + 60, r.h + 28);
        if (s.outlineLabel) {
          const l = add(CQ.el("div", "grp-label above", d, s.outlineLabel), "olabel:" + s.outlineLabel);
          CQ.pos(l, r.cx, r.y - 30);
        }
      }
      if (s.label) {
        const r = groupRect(eqn, s.label.ids);
        const l = add(CQ.el("div", "grp-label above " + (s.label.color || ""), d, s.label.text), "label:" + s.label.text);
        CQ.pos(l, r.cx, r.y - 22);
      }
      // pictures over the equation are copies of the things on the balance, and fly over from there
      // (data-fly: which thing on the left pan)
      if (s.crown) {
        const r = groupRect(eqn, ["x"]);
        const i = add(CQ.img("crown", "mini-crown", d), "crown");
        i.dataset.fly = "crown";
        CQ.pos(i, r.cx, r.y - 30);
      }
      if (s.mini) {
        // x + 2 is the crown and the two coins
        const r = groupRect(eqn, LHS);
        const m = add(CQ.el("div", "mini-pic", d), "mini");
        CQ.img("crown", "mp-crown", m).dataset.fly = "crown";
        CQ.img("coin", "mp-coin", m).dataset.fly = "coin:0";
        CQ.img("coin", "mp-coin", m).dataset.fly = "coin:1";
        CQ.pos(m, r.cx, r.y - 34);
      }
      if (s.rows) {
        const rows = CQ.el("div", "nb-rows", c);
        s.rows.forEach((r) => add(CQ.el("div", "nb-row " + (r.cls || ""), rows, CQ.rich(r.t)), "row:" + r.t));
      }
      // a tag hangs under its part on a straight line that starts with a dot on the part (or on the
      // middle of the part's bracket), like the labels of the activities
      (s.tags || []).forEach((t) => {
        const ids = Array.isArray(t.ids) ? t.ids : [t.ids];
        const r = groupRect(eqn, ids);
        const row = t.row || 0;
        const y = r.y + r.h + (t.bracket ? 34 : 14) + row * 66;
        const key = "tag:" + t.text;
        if (t.bracket) {
          const br = add(CQ.el("div", "under-bracket " + (t.color || ""), d), key);
          CQ.box(br, r.x - 6, r.y + r.h - 2, r.w + 12, 18);
        }
        const top = t.bracket ? r.y + r.h + 13 : r.y + r.h - 6;
        const line = add(CQ.el("div", "tag-line " + (t.color || ""), d), key);
        CQ.box(line, r.cx - 2, top, 4, y - top);
        CQ.el("div", "tag-dot", line);
        const tag = add(CQ.el("div", "tag " + (t.color || ""), d, CQ.rich(t.text)), key);
        // a wide tag slides along to stay on the screen and clear of the balance; its line still lands on it
        const half = tag.offsetWidth / 2;
        const lo = -eqn.offsetLeft - this.stage.offsetLeft + 24 + half;
        const hi = this.stage.offsetWidth - eqn.offsetLeft + 30 - half;
        CQ.pos(tag, Math.max(lo, Math.min(hi, r.cx)), y);
      });
      // the first beat: the equation is written in, one sign at a time; the beat's other pieces follow
      let start = 150;
      if (!this.shown) {
        const signs = eqn.querySelectorAll(".tok");
        signs.forEach((t, i) =>
          CQ.anim(t, [{ opacity: 0, translate: "0 14px" }, { opacity: 1, translate: "0 0" }], { duration: 480, delay: 120 + i * 190, easing: CQ.EASE.out, keep: false })
        );
        start = 120 + signs.length * 190 + 300;
      }
      // a part of the equation that changes (a highlight, a colour) eases from how it was to how it is
      const before = this.shown || { keys: new Set(), toks: {} };
      const toks = {};
      eqn.querySelectorAll(".tok").forEach((t) => {
        const now = t.className;
        const was = before.toks[t.dataset.id];
        toks[t.dataset.id] = now;
        if (was == null || was === now) return;
        t.className = was;
        void t.offsetWidth; // the old look is drawn first, so the change runs as a CSS transition
        t.className = now;
      });
      // First the frame goes round the part of the balance the line is about (the rest of it fades);
      // then what is new comes in, one piece at a time (a tag with its line and bracket): words fade
      // in where they stay, and pictures fly over from the balance last.
      const framed = this.light(s.bal, before.bal);
      if (framed && this.shown) start = Math.max(start, 550);
      const groups = new Map();
      c.querySelectorAll("[data-key]").forEach((el) => {
        const key = el.dataset.key;
        if (before.keys.has(key)) return;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(el);
      });
      const flying = (els) => els.some((el) => el.matches("[data-fly]") || el.querySelector("[data-fly]"));
      const order = [...groups.keys()].sort((a, b) => flying(groups.get(a)) - flying(groups.get(b)));
      let at = start;
      order.forEach((key) => {
        const els = groups.get(key);
        if (this.shown && !flying(els))
          setTimeout(() => {
            if (this.shown && this.shown.sig === sig) CQ.audio.play("ui.pop", { volume: 0.4 });
          }, at);
        if (key.startsWith("tag:")) {
          at = this.drawTag(els, at) + 250; // bracket, line, word: each after the other
          return;
        }
        els.forEach((el) => {
          const fliers = el.matches("[data-fly]") ? [el] : [...el.querySelectorAll("[data-fly]")];
          if (fliers.length) return this.flyIn(fliers, at, sig);
          CQ.anim(el, [{ opacity: 0, translate: "0 10px" }, { opacity: 1, translate: "0 0" }], { duration: 600, delay: at, easing: CQ.EASE.out, keep: false });
          if (el.classList.contains("grp-label")) writeIn(el, at + 150, 45); // a label's word is written in
        });
        at += 500;
      });
      this.shown = { sig, keys, toks, bal: s.bal };
      return eqn;
    },
    // Copies of things on the left pan fly over to their places on the formula screen (each picture in
    // fliers says which thing it is: "crown", "coin:0"…), one after another, starting at ms.
    flyIn(fliers, ms, sig) {
      fliers.forEach((f) => (f.style.opacity = "0"));
      const left = CQ.balance.items.left;
      const source = (spec) => (spec === "crown" ? left.find((it) => it.type === "crown") : left.filter((it) => it.type === "coin")[+spec.split(":")[1]]);
      fliers.forEach((f, i) =>
        setTimeout(() => {
          if (!this.shown || this.shown.sig !== sig || !f.isConnected) return;
          const it = source(f.dataset.fly);
          const from = it && CQ.centerOf(it.el);
          const to = CQ.centerOf(f);
          if (!from || !to) return void (f.style.opacity = "");
          const fw = f.getBoundingClientRect().width || 1;
          const copy = f.cloneNode(true);
          copy.removeAttribute("data-fly");
          copy.style.opacity = "";
          copy.style.width = f.getBoundingClientRect().width / CQ.stage.scale + "px";
          copy.classList.add("nb-flyer");
          if (i === 0) CQ.audio.play("ui.swoosh", { volume: 0.6 });
          CQ.fly(CQ.ui.layer, copy, from, to, { duration: 950, arc: -150, scaleFrom: it.el.getBoundingClientRect().width / fw, scaleTo: 1 }).then(() => {
            f.style.opacity = "";
            CQ.audio.play("ui.pop", { volume: 0.45 });
          });
        }, ms + i * 170)
      );
    },
    // A tag comes in as it would be drawn: its bracket, the dot on its part and the line drawn down from
    // it, then the word written in. Returns when it is done (ms from now).
    drawTag(els, at) {
      const br = els.find((e) => e.classList.contains("under-bracket"));
      const line = els.find((e) => e.classList.contains("tag-line"));
      const tag = els.find((e) => e.classList.contains("tag"));
      let t = at;
      if (br) {
        CQ.anim(br, [{ opacity: 0 }, { opacity: 1 }], { duration: 320, delay: t, easing: CQ.EASE.out, keep: false });
        t += 280;
      }
      if (line) {
        CQ.anim(line, [{ opacity: 0 }, { opacity: 1 }], { duration: 160, delay: t, keep: false });
        CQ.anim(line, [{ clipPath: "inset(-10px -10px calc(100% - 8px) -10px)" }, { clipPath: "inset(-10px -10px -10px -10px)" }], { duration: 440, delay: t + 120, easing: CQ.EASE.out, keep: false });
        t += 560;
      }
      if (tag) {
        CQ.anim(tag, [{ opacity: 0, scale: "0.85" }, { opacity: 1, scale: "1" }], { duration: 280, delay: t, easing: CQ.EASE.out, keep: false });
        t = writeIn(tag, t + 100, 45);
      }
      return t;
    },
    // A frame goes round the part of the balance this beat is about, and the rest of the balance fades
    // (CQ.focus: its window and gold ring; the maths stays bright above it). Returns whether the frame
    // moved to something new.
    light(bal, was) {
      const b = CQ.balance;
      if (bal === "level" && was !== "level") b.flashEmblem();
      const plate = (side) => b.sides[side].g.querySelector(".bal-plate");
      const els = (side, pred) => b.items[side].filter((it) => !pred || pred(it)).map((it) => it.el);
      const parts = {
        crown: () => els("left", (it) => it.type === "crown"),
        left: () => [plate("left")].concat(els("left")),
        right: () => [plate("right")].concat(els("right")),
        both: () => [plate("left"), plate("right")].concat(els("left"), els("right")),
        level: () => [...CQ.world.balanceLayer.querySelectorAll(".bal-art, .pan-item")],
      };
      parts.whole = parts.level; // the whole balance, without the flash
      if (!parts[bal]) {
        if (this.framed) CQ.focus.off();
        this.framed = false;
        return false;
      }
      if (bal !== was || !this.framed) CQ.focus.on(parts[bal], { pad: 20, radius: 26, quiet: true });
      this.framed = true;
      return bal !== was;
    },
    // Run a list of beats with Next / Back.
    async run(beats) {
      let i = 0;
      while (i < beats.length) {
        const b = beats[i];
        this.render(b.s);
        if (b.gem && !CQ.gems.have.has(b.gem)) CQ.gems.collect(b.gem);
        const r = await CQ.say(b.id, { back: i > 0 });
        i += r === "back" ? -1 : 1;
        if (i < 0) i = 0;
      }
    },
  };

  CQ.NB_WORDS = [
    { id: "l4-9", s: { bal: "crown" } },
    { id: "l4-10", s: { hl: ["x"], crown: true, bal: "crown", tags: [{ ids: "x", text: "Variable", color: "var" }] } },
    { id: "l4-11", s: { hl: ["x"], crown: true, bal: "crown", tags: [{ ids: "x", text: "Variable", color: "var" }] }, gem: "variable" },
    { id: "l4-12", s: { box: LHS, mini: true, bal: "left" } },
    {
      id: "l4-13",
      s: {
        box: LHS,
        mini: true,
        bal: "left",
        tags: [
          { ids: "x", text: "variable", color: "var" },
          { ids: "plus", text: "addition", color: "op", row: 1 },
          { ids: "two", text: "constant", color: "const" },
        ],
      },
      gem: "constant",
    },
    { id: "l4-14", s: { box: LHS, boxColor: "expr", bal: "left", label: { ids: LHS, text: "Algebraic expression", color: "expr" } }, gem: "expression" },
    { id: "l4-15", s: { pulse: ["eq"], bal: "level" } },
    { id: "l4-16", s: { outline: true, outlineLabel: "Equation", bal: "level" }, gem: "equation" },
    { id: "l4-17", s: { lhs: true, bal: "left", tags: [{ ids: LHS, text: "Left-hand side (LHS)", color: "lhs", bracket: true }] }, gem: "lhs" },
    {
      id: "l4-18",
      s: {
        lhs: true,
        rhs: true,
        bal: "right",
        tags: [
          { ids: LHS, text: "Left-hand side (LHS)", color: "lhs", bracket: true },
          { ids: "seven", text: "Right-hand side (RHS)", color: "rhs", bracket: true, row: 1 },
        ],
      },
      gem: "rhs",
    },
  ];
  // Trying values for x, like the PPT's slides 24–26: each side worked out for 4 (they differ, so 4 is
  // not a solution) and for 5 (both sides equal 7, so 5 is the solution). The equation stays at the top
  // all along, like on a board; the working goes under it.
  CQ.NB_TRY = [
    { id: "l4-23", s: { crown: true, bal: "crown" } },
    { id: "l4-24", s: { crown: true, bal: "both" } },
    { id: "l4-25", s: { crown: true, bal: "both", rows: [{ t: "LHS: 4 + 2 = 6" }, { t: "RHS: 7" }] } },
    { id: "l4-26", s: { crown: true, bal: "both", rows: [{ t: "6 ≠ 7", cls: "big no" }, { t: "4 is not a solution", cls: "no" }] } },
    { id: "l4-27", s: { crown: true, bal: "both", rows: [{ t: "LHS: 5 + 2 = 7" }, { t: "RHS: 7" }] } },
    { id: "l4-28", s: { crown: true, bal: "level", rows: [{ t: "LHS = 7" }, { t: "RHS = 7" }, { t: "7 = 7", cls: "big ok" }] } },
    { id: "l4-29", s: { crown: true, bal: "level", rows: [{ t: "LHS = 7" }, { t: "RHS = 7" }, { t: "7 = 7", cls: "big ok" }] }, gem: "solution" },
  ];

  CQ.NB_LINEAR = [
    { id: "l4-19", s: { hl: ["x"], crown: true, bal: "crown", tags: [{ ids: "x", text: "One variable: x", color: "var" }] } },
    { id: "l4-20", s: { hl: ["x"], crown: true, ghost: true, bal: "crown", tags: [{ ids: "x", text: "x means x¹", color: "var" }] } },
    { id: "l4-21", s: { hl: ["x"], crown: true, ghost: true, bal: "crown", tags: [{ ids: "x", text: "One variable · highest power 1", color: "var" }] } },
    { id: "l4-22", s: { title: "Linear equation in one variable", outline: true, bal: "whole" }, gem: "linear" },
  ];

  // Things come in one at a time, so a child can follow: each element fades up in turn, gap ms apart
  // (the CSS translate property, so their own transforms are left alone).
  function oneByOne(els, gap, start) {
    els.forEach((el, i) => {
      if (!el) return;
      el.style.opacity = "0";
      CQ.anim(el, [{ opacity: 0, translate: "0 18px" }, { opacity: 1, translate: "0 0" }], {
        duration: 420,
        delay: (start || 0) + i * (gap || 260),
        easing: CQ.EASE.out,
        keep: false,
        essential: true,
      }).then(() => (el.style.opacity = ""));
    });
  }
  CQ.oneByOne = oneByOne;

  // A straight line from a label (at y0) to the part of an equation it names (at y1), ending in a dot
  // on that part, in equation coordinates. cls gives its colour (c-var, c-eq, c-lhs, c-rhs); "hop"
  // leaves a little gap where it crosses a bracket, so it plainly goes on to its own part. It is drawn
  // faint; .on runs the colour down it from the label to the part (styles.css, "Labels joined to an
  // equation").
  function leadLine(d, x, y0, y1, cls) {
    const e = CQ.el("div", "lead " + (y1 > y0 ? "down " : "up ") + (cls || ""), d);
    CQ.box(e, x - 2, Math.min(y0, y1), 4, Math.abs(y1 - y0));
    CQ.el("div", "lead-fill", e);
    CQ.el("div", "lead-dot", e);
    return e;
  }

  // ------------------------------------------------------------------ shared board for activities
  function board(cls) {
    const wrap = CQ.el("div", "activity " + cls, CQ.ui.overlay);
    CQ.el("div", "nb-dim", wrap);
    CQ.soft.set("activity", []); // the scene blurs behind the activity
    const b = CQ.el("div", "board", wrap);
    CQ.anim(wrap, [{ opacity: 0 }, { opacity: 1 }], { duration: 420, essential: true });
    CQ.anim(b, [{ transform: "scale(.9)", opacity: 0 }, { transform: "scale(1)", opacity: 1 }], { duration: 600, easing: CQ.EASE.out, essential: true });
    CQ.audio.play("scroll.open");
    // no Zippy on an activity screen (like the formula screen): he rests once the dark is in
    setTimeout(() => wrap.isConnected && CQ.zippy.setVisible(false), 500);
    wrap.board = b;
    return wrap;
  }
  // ms, delay: how long it fades, and after how long (later and slower when the formula screen's dark
  // comes in under it meanwhile, so the scene never shows through in between)
  function closeBoard(wrap, ms, delay) {
    CQ.soft.set("activity", false);
    CQ.zippy.setVisible(true); // still under the dark: he is simply there as it lifts
    return CQ.anim(wrap, [{ opacity: 1 }, { opacity: 0 }], { duration: ms || 480, delay: delay || 0, essential: true }).then(() => wrap.remove());
  }
  // Drag + tap-to-place helper for chips/cards onto targets.
  function makeChip(el, home, ctl) {
    let grab = null;
    el.tabIndex = 0;
    const setPos = (p) => CQ.pos(el, p.x, p.y);
    setPos(home);
    CQ.drag(el, {
      enabled: () => !el.placed && !ctl.busy,
      start: (pt) => {
        grab = { dx: home.x - pt.x, dy: home.y - pt.y, cur: { x: home.x, y: home.y } };
        el.classList.add("dragging");
        CQ.audio.play("bar.pick");
        CQ.hand.stop();
      },
      move: (pt) => {
        grab.cur = { x: pt.x + grab.dx, y: pt.y + grab.dy };
        setPos(grab.cur);
        ctl.hover(grab.cur);
      },
      end: () => {
        el.classList.remove("dragging");
        ctl.hover(null);
        const target = ctl.targetAt(grab.cur);
        if (target) ctl.drop(el, target);
        else ctl.back(el);
      },
      tap: () => {
        el.classList.remove("dragging");
        ctl.select(el);
      },
      key: () => ctl.select(el),
    });
    el.home = home;
    el.goHome = () =>
      CQ.tween(
        280,
        (k) => {
          const from = el.from || home;
          setPos({ x: CQ.lerp(from.x, home.x, k), y: CQ.lerp(from.y, home.y, k) });
        },
        CQ.ease.out
      );
    return el;
  }
  function inRect(p, r) {
    return p && p.x > r.x0 && p.x < r.x1 && p.y > r.y0 && p.y < r.y1;
  }
  function rectOf(el, pad) {
    const r = el.getBoundingClientRect();
    const a = CQ.stage.toStage(r.left, r.top);
    const b = CQ.stage.toStage(r.right, r.bottom);
    pad = pad || 0;
    return { x0: a.x - pad, y0: a.y - pad, x1: b.x + pad, y1: b.y + pad };
  }

  // ------------------------------------------------------------------ Activity: label the parts of 4x + 3 = 19
  CQ.activityLabel = async function () {
    const c = C().label;
    const wrap = board("label-act");
    const b = wrap.board;
    CQ.el("div", "board-title", b, c.sub);
    const eqn = CQ.eqTokens(
      b,
      [
        { t: "4", id: "four", cls: "coef" },
        { t: "x", id: "x", k: "var", cls: "after-coef" },
        { t: "+", id: "plus", k: "op" },
        { t: "3", id: "three" },
        { t: "=", id: "eq", k: "eq" },
        { t: "19", id: "r" },
      ],
      "label-eq"
    );
    await CQ.run.wait(80);
    const d = eqn.deco;
    const all = ["four", "x", "plus", "three", "eq", "r"];
    const R = (ids) => groupRect(eqn, ids);
    const ra = R(all);
    const rx = R(["x"]);
    const rl = R(["four", "x", "plus", "three"]);
    const rr = R(["r"]);
    // Each box sits right over or under the part it names, joined to it by one straight line that
    // ends in a dot on the part: Variable over x, Equation over the bracket round the whole equation,
    // LHS under the bracket under 4x + 3, RHS under the bracket under 19. (Equation coordinates.)
    const brace = (r, up, cls) => {
      const e = CQ.el("div", "brace " + (up ? "up " : "down ") + cls, d);
      CQ.box(e, r.x - 10, up ? r.y - 34 : r.y + r.h + 6, r.w + 20, 30);
      return e;
    };
    const braces = { Equation: brace(ra, true, "c-eq"), LHS: brace(rl, false, "c-lhs"), RHS: brace(rr, false, "c-rhs") };
    const COLOR = { Variable: "c-var", Equation: "c-eq", LHS: "c-lhs", RHS: "c-rhs" };
    // boxes (targets), positioned in equation coordinates
    const targets = [];
    const mk = (answer, x, y) => {
      const t = CQ.el("button", "drop-box " + COLOR[answer], d);
      t.type = "button";
      t.setAttribute("aria-label", "Empty label box");
      CQ.pos(t, x, y);
      t.answer = answer;
      t.misses = 0;
      t.addEventListener("click", () => ctl.tapTarget(t));
      targets.push(t);
      return t;
    };
    const topY = ra.y - 132;
    const botY = ra.y + ra.h + 96;
    const half = 48; // half a box's height, with its border
    // the Equation box stands over the bracket's right half, clear of the Variable box over x
    const xEq = Math.min(ra.x + ra.w - 70, Math.max(rx.cx + 330, ra.cx + 140));
    mk("Variable", rx.cx, topY);
    mk("Equation", xEq, topY);
    mk("LHS", rl.cx, botY);
    mk("RHS", rr.cx, botY);
    const leads = {
      Variable: leadLine(d, rx.cx, topY + half, rx.y - 8, "c-var hop"), // over the bracket, onto x
      Equation: leadLine(d, xEq, topY + half, ra.y - 31, "c-eq"),
      LHS: leadLine(d, rl.cx, botY - half, rl.y + rl.h + 33, "c-lhs"),
      RHS: leadLine(d, rr.cx, botY - half, rr.y + rr.h + 33, "c-rhs"),
    };
    // the numbers each box names light up in its colour (Equation: its bracket round all of them)
    const parts = { Variable: ["x"], LHS: ["four", "x", "plus", "three"], RHS: ["r"], Equation: [] };
    const colors = { Variable: "var", LHS: "lhs", RHS: "rhs" };

    let filled = 0;
    let selected = null;
    let finish;
    const done = new Promise((r) => (finish = r));
    const chips = [];
    const ctl = {
      busy: false,
      hover(p) {
        targets.forEach((t) => t.classList.toggle("hover", !t.done && inRect(p, rectOf(t, 30))));
      },
      targetAt(p) {
        return targets.find((t) => !t.done && inRect(p, rectOf(t, 40)));
      },
      select(el) {
        chips.forEach((ch) => ch.classList.toggle("selected", ch === el && !ch.placed));
        selected = el.placed ? null : el;
        CQ.audio.play("ui.pop");
      },
      tapTarget(t) {
        if (selected && !t.done) {
          const el = selected;
          selected = null;
          el.classList.remove("selected");
          el.from = el.home;
          this.drop(el, t);
        }
      },
      back(el) {
        el.from = { x: parseFloat(el.style.left), y: parseFloat(el.style.top) };
        CQ.audio.play("bar.return");
        el.goHome();
      },
      async drop(el, t) {
        if (el.label === t.answer) {
          el.placed = true;
          t.done = true;
          el.classList.add("placed", COLOR[t.answer]);
          const tc = rectOf(t);
          CQ.pos(el, (tc.x0 + tc.x1) / 2, (tc.y0 + tc.y1) / 2);
          t.classList.add("ok");
          t.setAttribute("aria-label", t.answer);
          // the label's colour runs down its line, then its part lights up in it
          leads[t.answer].classList.add("on");
          setTimeout(() => {
            if (braces[t.answer]) braces[t.answer].classList.add("on");
            parts[t.answer].forEach((id) => eqn.querySelector(`.tok[data-id="${id}"]`).classList.add("glow-" + colors[t.answer]));
          }, 420);
          CQ.audio.play("correct");
          CQ.audio.play("zippy.giggle", { volume: 0.7 });
          CQ.fx.sparkle(CQ.ui.layer, (tc.x0 + tc.x1) / 2, (tc.y0 + tc.y1) / 2, 8, 70);
          CQ.track("answer", { activity: "label", box: t.answer, choice: el.label, correct: true });
          filled++;
          const last = filled === targets.length;
          const line = CQ.say("", { text: c.correct[t.answer], advance: last ? "auto" : "none", pause: 200 });
          if (last) line.then(finish, finish); // let the last "Yes!" finish before moving on
        } else {
          t.misses++;
          CQ.track("answer", { activity: "label", box: t.answer, choice: el.label, correct: false, attempt: t.misses });
          CQ.audio.play("tryagain");
          el.from = { x: parseFloat(el.style.left), y: parseFloat(el.style.top) };
          el.goHome();
          CQ.anim(t, [{ transform: "translate(-50%,-50%) translateX(0)" }, { transform: "translate(-50%,-50%) translateX(-10px)" }, { transform: "translate(-50%,-50%) translateX(10px)" }, { transform: "translate(-50%,-50%) translateX(0)" }], { duration: 300, keep: false });
          if (t.misses === 1) CQ.say("", { text: c.miss1, advance: "none" });
          else {
            CQ.say("", { text: c.miss2[t.answer], advance: "none" });
            const right = chips.find((ch) => ch.label === t.answer && !ch.placed);
            if (right) right.classList.add("glow");
          }
        }
      },
    };
    const rowY = 862;
    c.chips.forEach((label, i) => {
      const el = CQ.el("div", "label-chip", wrap, label);
      el.label = label;
      el.setAttribute("role", "button");
      el.setAttribute("aria-label", label);
      makeChip(el, { x: 600 + i * 240, y: rowY }, ctl);
      chips.push(el);
    });
    // One at a time, the way it would be drawn, while the line is said: the equation sign by sign; then
    // each box in turn (its bracket, the dot on its part and the line drawn out from it, the empty box);
    // then the labels, one by one.
    const tokens = [...eqn.querySelectorAll(".tok")];
    const ORDER = ["Variable", "Equation", "LHS", "RHS"];
    hideAll([...tokens, ...Object.values(braces), ...Object.values(leads), ...targets, ...chips]);
    const said = CQ.say("", { text: c.title, advance: "auto", pause: 100 });
    await CQ.run.wait(350);
    for (const t of tokens) {
      comeIn(t, "rise", 360);
      await CQ.run.wait(170);
    }
    await CQ.run.wait(300);
    for (const name of ORDER) {
      if (braces[name]) await comeIn(braces[name], "rise", 320);
      await comeIn(leads[name], "line", 420);
      await comeIn(targets.find((t) => t.answer === name), "pop", 300);
      await CQ.run.wait(120);
    }
    for (const ch of chips) {
      comeIn(ch, "rise", 360);
      await CQ.run.wait(180);
    }
    await said;
    const firstChip = chips.find((ch) => ch.label === "Variable");
    CQ.hand.drag(CQ.centerOf(firstChip), CQ.centerOf(targets[0]), 1);
    CQ.idle.arm(() => {
      const ch = chips.find((x) => !x.placed);
      const t = ch && targets.find((x) => x.answer === ch.label);
      if (ch && t) CQ.hand.drag(CQ.centerOf(ch), CQ.centerOf(t), 1);
    }, 9000);
    await CQ.run.when(done);
    CQ.idle.disarm();
    CQ.hand.stop();
    await CQ.say("", { text: c.done });
    closeBoard(wrap, 900, 550); // the formula screen comes in as the board fades (runL4c): the dark never lifts in between
  };

  // ------------------------------------------------------------------ Activity: sort linear / nonlinear
  CQ.activitySort = async function () {
    const c = C().sort;
    const wrap = board("sort-act");
    const b = wrap.board;
    const bins = {};
    [
      ["linear", c.linear, "lhs"],
      ["nonlinear", c.nonlinear, "rhs"],
    ].forEach(([k, label, color]) => {
      const bin = CQ.el("button", "bin " + color, b);
      bin.type = "button";
      CQ.el("div", "bin-head", bin, label);
      bin.list = CQ.el("div", "bin-list", bin);
      bin.kind = k;
      bin.setAttribute("aria-label", label);
      bin.addEventListener("click", () => ctl.tapTarget(bin));
      bins[k] = bin;
    });
    let placed = 0;
    let selected = null;
    let finish;
    const done = new Promise((r) => (finish = r));
    const cards = [];
    const ctl = {
      busy: false,
      hover(p) {
        Object.values(bins).forEach((bin) => bin.classList.toggle("hover", inRect(p, rectOf(bin, 10))));
      },
      targetAt(p) {
        return Object.values(bins).find((bin) => inRect(p, rectOf(bin, 20)));
      },
      select(el) {
        cards.forEach((cd) => cd.classList.toggle("selected", cd === el && !cd.placed));
        selected = el.placed ? null : el;
        CQ.audio.play("ui.pop");
      },
      tapTarget(bin) {
        if (selected) {
          const el = selected;
          selected = null;
          el.classList.remove("selected");
          el.from = el.home;
          this.drop(el, bin);
        }
      },
      back(el) {
        el.from = { x: parseFloat(el.style.left), y: parseFloat(el.style.top) };
        CQ.audio.play("bar.return");
        el.goHome();
      },
      async drop(el, bin) {
        const right = el.card.linear ? "linear" : "nonlinear";
        if (bin.kind === right) {
          el.placed = true;
          el.classList.add("placed");
          el.classList.remove("glow");
          bin.list.appendChild(el);
          el.style.left = "";
          el.style.top = "";
          if (right === "nonlinear") el.classList.add("show-2"); // its power 2 turns orange
          CQ.audio.play("correct");
          CQ.audio.play("zippy.giggle", { volume: 0.7 });
          const bc = rectOf(bin);
          CQ.fx.sparkle(CQ.ui.layer, (bc.x0 + bc.x1) / 2, bc.y0 + 120, 8, 120);
          CQ.track("answer", { activity: "sort", card: el.card.eq, choice: bin.kind, correct: true });
          placed++;
          const last = placed === cards.length;
          const line = CQ.say("", { text: right === "linear" ? c.correctLinear : c.correctNonlinear, advance: last ? "auto" : "none", pause: 200 });
          if (last) line.then(finish, finish);
        } else {
          el.misses = (el.misses || 0) + 1;
          CQ.track("answer", { activity: "sort", card: el.card.eq, choice: bin.kind, correct: false, attempt: el.misses });
          CQ.audio.play("tryagain");
          el.from = { x: parseFloat(el.style.left), y: parseFloat(el.style.top) };
          el.goHome();
          if (el.misses === 1) CQ.say("", { text: c.miss1, advance: "none" });
          else {
            const msg = (el.card.linear ? c.miss2Linear : c.miss2Nonlinear) + (el.card.tip ? " " + el.card.tip : "");
            CQ.say("", { text: msg, advance: "none" });
            bins[right].classList.add("glow");
            setTimeout(() => bins[right].classList.remove("glow"), 2600);
          }
        }
      },
    };
    CQ.shuffle(c.cards).forEach((card, i) => {
      const el = CQ.el("div", "eq-card", wrap, `<span class="eqc">${CQ.rich(card.eq)}</span>`);
      el.card = card;
      el.setAttribute("role", "button");
      el.setAttribute("aria-label", CQ.speakable(card.eq));
      makeChip(el, { x: 600 + (i % 3) * 360, y: 750 + Math.floor(i / 3) * 110 }, ctl);
      cards.push(el);
    });
    // One at a time, while the line is said: each box, with its name written in; then the cards, one by one.
    hideAll([bins.linear, bins.nonlinear, ...cards]);
    const said = CQ.say("", { text: c.title, advance: "auto", pause: 100 });
    await CQ.run.wait(300);
    for (const bin of [bins.linear, bins.nonlinear]) {
      comeIn(bin, "pop", 360);
      await CQ.run.wait(writeIn(bin.querySelector(".bin-head"), 300, 45) + 150);
    }
    for (const cd of cards) {
      comeIn(cd, "rise", 360);
      await CQ.run.wait(180);
    }
    await said;
    const demo = cards[0];
    CQ.hand.drag(CQ.centerOf(demo), CQ.centerOf(bins[demo.card.linear ? "linear" : "nonlinear"]), 1);
    CQ.idle.arm(() => {
      const cd = cards.find((x) => !x.placed);
      if (cd) CQ.hand.drag(CQ.centerOf(cd), CQ.centerOf(bins[cd.card.linear ? "linear" : "nonlinear"]), 1);
    }, 9000);
    await CQ.run.when(done);
    CQ.idle.disarm();
    CQ.hand.stop();
    await CQ.say("", { text: c.done });
    await closeBoard(wrap);
  };

  // ------------------------------------------------------------------ A quick recap
  // Four panels on one equation. Each panel adds one more label (variable, equation, LHS, RHS);
  // the panels appear one at a time while the narrator reads them.
  const RECAP_EQ = [
    { t: "x", id: "x", k: "var" },
    { t: "+", id: "plus", k: "op" },
    { t: "4", id: "four" },
    { t: "=", id: "eq", k: "eq" },
    { t: "9", id: "nine" },
  ];
  // A recap panel's labels, like the label activity's: each one right over or under the part it names,
  // joined to it by a straight line ending in a dot on the part, all in the label's colour. Returns them
  // in order, { brace, lead, tag } each, all hidden: the panel brings them in one by one (playPanel).
  function recapLabels(eqn, show, labels) {
    const d = eqn.deco;
    const all = groupRect(eqn, RECAP_EQ.map((t) => t.id));
    const rx = groupRect(eqn, ["x"]);
    const rl = groupRect(eqn, ["x", "plus", "four"]);
    const rr = groupRect(eqn, ["nine"]);
    const tag = (cls, text, x, y, below) => {
      const e = CQ.el("div", "rc-tag " + cls + (below ? " below" : ""), d, text);
      CQ.pos(e, x, y);
      return e;
    };
    const brace = (r, up, cls) => CQ.box(CQ.el("div", "brace on " + (up ? "up " : "down ") + cls, d), r.x - 8, up ? r.y - 22 : r.y + r.h + 2, r.w + 16, 20);
    // the line is drawn out from the part to the label
    const line = (x, y0, y1, cls) => {
      const l = leadLine(d, x, y0, y1, cls + " from-part");
      return l;
    };
    const above = all.y - 48; // the foot of a label over the equation
    const parts = [];
    if (show.includes("variable")) {
      eqn.querySelector('.tok[data-id="x"]').classList.add("rc-var");
      const t = tag("c-var", labels.variable, rx.cx, above);
      parts.push({ name: "variable", lead: line(rx.cx, above, rx.y - 4, "c-var" + (show.includes("equation") ? " hop" : "")), tag: t });
    }
    if (show.includes("equation")) {
      const br = brace(all, true, "c-eq");
      const xe = show.includes("variable") ? Math.max(all.cx + 70, rx.cx + 170) : all.cx;
      const t = tag("c-eq", labels.equation, xe, above);
      parts.push({ name: "equation", brace: br, lead: line(xe, above, all.y - 19, "c-eq"), tag: t });
    }
    const below = (r) => r.y + r.h + 36; // the top of a label under the equation
    if (show.includes("lhs") || show.includes("rhs")) eqn.closest(".rc-panel").classList.add("labels-below"); // a little higher, clear of the words
    if (show.includes("lhs")) {
      const br = brace(rl, false, "c-lhs");
      const t = tag("c-lhs", labels.lhs, rl.cx, below(rl), true);
      parts.push({ name: "lhs", brace: br, lead: line(rl.cx, below(rl), rl.y + rl.h + 19, "c-lhs"), tag: t });
    }
    if (show.includes("rhs")) {
      const br = brace(rr, false, "c-rhs");
      const t = tag("c-rhs", labels.rhs, rr.cx, below(rr), true);
      parts.push({ name: "rhs", brace: br, lead: line(rr.cx, below(rr), rr.y + rr.h + 19, "c-rhs"), tag: t });
    }
    parts.forEach((p) => [p.brace, p.lead, p.tag].forEach((e) => e && (e.style.opacity = "0")));
    return parts;
  }
  // Letters of el come in one after another, as if written: from `at` ms, `each` ms apart. Returns
  // when it will be done (ms).
  function writeIn(el, at, each) {
    each = each || 45;
    const chars = [];
    const walk = (node) =>
      Array.from(node.childNodes).forEach((c) => {
        if (c.nodeType === 1) return walk(c);
        if (c.nodeType !== 3) return;
        const frag = document.createDocumentFragment();
        for (const ch of c.textContent) {
          const sp = document.createElement("span");
          sp.className = "wch";
          sp.textContent = ch;
          frag.appendChild(sp);
          chars.push(sp);
        }
        c.replaceWith(frag);
      });
    walk(el);
    el.classList.add("writing");
    const t0 = performance.now() + (at || 0);
    let shown = 0;
    const step = (now) => {
      if (!el.isConnected) return;
      const k = Math.min(chars.length, Math.floor((now - t0) / each) + 1);
      while (shown < k) chars[shown++].classList.add("on");
      if (shown < chars.length) requestAnimationFrame(step);
      else el.classList.remove("writing");
    };
    requestAnimationFrame(step);
    return (at || 0) + chars.length * each;
  }
  CQ.writeIn = writeIn;
  // One step at a time, so a child can follow: something comes into view (fade + a little rise, or a
  // pop), and the steps wait for each other (CQ.run.wait stops while the menu is open).
  const showStep = (el, how, ms) => {
    if (!el) return Promise.resolve();
    const kf = how === "pop" ? [{ opacity: 0, scale: "0.6" }, { opacity: 1, scale: "1" }] : [{ opacity: 0, translate: "0 10px" }, { opacity: 1, translate: "0 0" }];
    el.style.opacity = "";
    return CQ.anim(el, kf, { duration: ms || 380, easing: how === "pop" ? CQ.EASE.back : CQ.EASE.out, keep: false, essential: true });
  };
  // A board's things come in one at a time, each the way it would be drawn, and wait hidden (and can't
  // be touched) until their turn: "rise" (fade in with a little rise), "pop", "line" (a line drawn out
  // from the part it starts at, its dot first).
  const hideAll = (els) =>
    els.forEach((e) => {
      if (!e) return;
      e.style.opacity = "0";
      e.style.pointerEvents = "none";
    });
  const comeIn = (el, how, ms) => {
    if (!el) return Promise.resolve();
    el.style.pointerEvents = "";
    if (how === "line") {
      el.style.opacity = "";
      // .up: its part is above it, so it is drawn downwards; otherwise upwards from the part below
      const from = el.classList.contains("up") ? "inset(-10px -10px calc(100% - 8px) -10px)" : "inset(calc(100% - 8px) -10px -10px -10px)";
      return CQ.anim(el, [{ clipPath: from }, { clipPath: "inset(-10px -10px -10px -10px)" }], { duration: ms || 420, easing: CQ.EASE.out, keep: false, essential: true });
    }
    return showStep(el, how, ms);
  };
  CQ.activityRecap = async function () {
    const c = C().recap;
    const wrap = board("recap-act");
    const b = wrap.board;
    CQ.el("div", "board-title", b, c.title);
    const grid = CQ.el("div", "rc-grid", b);
    const panels = c.panels.map((p, i) => {
      const card = CQ.el("div", "rc-panel", grid);
      card.num = CQ.el("div", "rc-n", card, String(i + 1));
      const box = CQ.el("div", "rc-eq-wrap", card);
      card.eqn = CQ.eqTokens(box, RECAP_EQ, "rc-eq");
      card.text = CQ.el("div", "rc-text", card, CQ.rich(p.text));
      [card.num, card.text, ...card.eqn.querySelectorAll(".tok")].forEach((e) => (e.style.opacity = "0"));
      return card;
    });
    await CQ.run.wait(80); // lay the equations out before measuring them for the labels
    panels.forEach((card, i) => (card.parts = recapLabels(card.eqn, c.panels[i].show, c.labels)));
    await CQ.say("recap-0", { text: c.title + ".", advance: "auto", pause: 200 });
    // One panel at a time, while its line is said: the panels before it step back (faded), and the new
    // one comes in step by step: its number, the equation sign by sign, the labels it shares with the
    // panels before (together), then its own new label: the bracket, the dot on the part, the line
    // drawn out to where the label goes, the word written in; last, the sentence under it.
    const W = (ms) => CQ.run.wait(ms);
    const playPanel = async (card) => {
      await showStep(card.num, "pop", 360);
      for (const t of card.eqn.querySelectorAll(".tok")) {
        showStep(t, "rise", 360);
        await W(150);
      }
      await W(250);
      const seen = card.parts.slice(0, -1);
      const fresh = card.parts[card.parts.length - 1];
      if (seen.length) {
        seen.forEach((p) => {
          [p.brace, p.tag].forEach((e) => showStep(e, "rise", 420));
          showStep(p.lead, "rise", 420);
          p.lead.classList.add("on", "drawn");
        });
        await W(520);
      }
      if (fresh) {
        if (fresh.brace) {
          await showStep(fresh.brace, "rise", 360);
        }
        fresh.lead.style.opacity = "";
        fresh.lead.classList.add("on"); // the dot on the part, then the line drawn out from it
        CQ.audio.play("ui.pop", { volume: 0.4 });
        await W(520);
        showStep(fresh.tag, "pop", 300);
        await W(writeIn(fresh.tag, 120, 55) + 150);
      }
      await showStep(card.text, "rise", 420);
    };
    for (let i = 0; i < panels.length; i++) {
      const card = panels[i];
      panels.slice(0, i).forEach((p) => p.classList.add("rest")); // the panels before step back
      card.classList.add("on");
      await Promise.all([playPanel(card), CQ.say(c.panels[i].id, { text: c.panels[i].text })]);
    }
    // all four together, for a good look, then on to the next screen by itself
    panels.forEach((p) => p.classList.remove("rest"));
    await CQ.run.wait(5000);
    await closeBoard(wrap);
  };

  // ------------------------------------------------------------------ Practice: try a few equations
  // The child types x on the keypad and taps Check. Right first time: the check is shown and the
  // next equation starts. Wrong: the board shows why (LHS ≠ RHS), then solves it step by step with
  // the child (undo each operation on both sides) and checks the answer in the original equation.

  // The left side worked out for x = a, the way a child would write it, and its value.
  function workLHS(l, a) {
    const n = CQ.num;
    const paren = (v) => (v < 0 ? `(${n(v)})` : n(v));
    if (l.div) return { text: `[[${n(a)}|${l.div}]] = ${n(a / l.div)}`, value: a / l.div };
    const add = (u) => (l.op === "+" ? u + l.c : u - l.c);
    if (l.mul) {
      const inner = add(a);
      return { text: `${l.mul}(${n(a)} ${l.op} ${l.c}) = ${l.mul} × ${paren(inner)} = ${n(l.mul * inner)}`, value: l.mul * inner };
    }
    const v = add(l.k * a);
    if (l.k === 1) return { text: `${n(a)} ${l.op} ${l.c} = ${n(v)}`, value: v };
    return { text: `${l.k} × ${paren(a)} ${l.op} ${l.c} = ${n(l.k * a)} ${l.op} ${l.c} = ${n(v)}`, value: v };
  }
  CQ.workLHS = workLHS;

  CQ.activityPractice = async function (startAt) {
    const P = C().practice;
    const W = P.words;
    const T = (s, v) => CQ.fmt(s, v);
    const wrap = CQ.el("div", "activity practice-act", CQ.ui.overlay);
    CQ.el("div", "nb-dim", wrap);
    CQ.soft.set("activity", []);
    // No Zippy on this screen (like the formula screen): the problems have it to themselves. The
    // scene's Zippy rests meanwhile, unseen under the dark.
    setTimeout(() => wrap.isConnected && CQ.zippy.setVisible(false), 700);
    const b = CQ.el("div", "board pr-board", wrap);
    CQ.anim(wrap, [{ opacity: 0 }, { opacity: 1 }], { duration: 420, essential: true }); // the dark comes in softly, like the other boards'
    CQ.anim(b, [{ transform: "scale(.9)", opacity: 0 }, { transform: "scale(1)", opacity: 1 }], { duration: 600, easing: CQ.EASE.out, essential: true });
    CQ.audio.play("scroll.open");
    const head = CQ.el("div", "pr-head", b);
    const stepEl = CQ.el("div", "pr-step", head);
    const prog = CQ.el("div", "pr-prog", head);
    const dots = P.problems.map(() => CQ.el("span", "pr-dot", prog));
    const body = CQ.el("div", "pr-body", b);
    const main = CQ.el("div", "pr-main", body);
    const pad = CQ.el("div", "pr-pad hidden", body);

    // ---- the keypad (the computer keyboard works too)
    let entry = "";
    let onCheck = null;
    const valid = () => /^−?\d+(\.\d+)?$/.test(entry);
    let checkKey = null;
    const showEntry = () => {
      const el = main.querySelector(".pr-input");
      if (el) {
        el.textContent = entry || "?";
        el.classList.toggle("empty", !entry);
      }
      if (checkKey) checkKey.disabled = !valid();
    };
    const press = (k) => {
      if (!onCheck) return;
      CQ.audio.play("ui.tap");
      const digits = entry.replace("−", "").replace(".", "");
      if (k === "⌫") entry = entry.slice(0, -1);
      else if (k === "−") entry = entry.startsWith("−") ? entry.slice(1) : "−" + entry;
      else if (k === ".") {
        if (!entry.includes(".")) entry += /\d$/.test(entry) ? "." : "0.";
      } else if (digits.length < 4) entry = (entry === "0" ? "" : entry === "−0" ? "−" : entry) + k;
      showEntry();
    };
    const submit = () => {
      if (!onCheck || !valid()) return;
      CQ.audio.play("ui.tap");
      const f = onCheck;
      onCheck = null;
      f(parseFloat(entry.replace("−", "-")));
    };
    ["7", "8", "9", "0", "−", "4", "5", "6", ".", "⌫", "1", "2", "3"].forEach((k) =>
      button("key" + (k === "⌫" ? " del" : ""), k, k === "⌫" ? "Delete" : k === "−" ? "Minus" : k === "." ? "Point" : k, pad, () => press(k))
    );
    checkKey = button("key check", W.check, W.check, pad, submit);
    const onKey = (e) => {
      if (!onCheck || CQ.pauser.count) return;
      if (/^[0-9]$/.test(e.key)) press(e.key);
      else if (e.key === "-" || e.key === "−") press("−");
      else if (e.key === ".") press(".");
      else if (e.key === "Backspace") press("⌫");
      else if (e.key === "Enter") submit();
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    CQ.run.onCancel(() => window.removeEventListener("keydown", onKey));
    // Wait for a number to be typed and Check to be tapped.
    const typed = () => {
      entry = "";
      pad.classList.remove("hidden");
      showEntry();
      return CQ.run.when(new Promise((res) => (onCheck = res)));
    };

    // ---- screens on the board
    const setStep = (title) => {
      stepEl.innerHTML = CQ.rich(title);
      CQ.anim(stepEl, [{ transform: "translateX(-20px)", opacity: 0 }, { transform: "translateX(0)", opacity: 1 }], { duration: 300, keep: false });
    };
    const render = (html, withPad) => {
      pad.classList.toggle("hidden", !withPad);
      body.classList.toggle("with-pad", !!withPad);
      main.innerHTML = html;
      oneByOne([...main.children], 320); // each line of the step comes in turn
    };
    const R = CQ.rich;
    const sides = (lhs, rhs) =>
      `<div class="pr-sides"><div class="pr-side lhs"><b>LHS:</b> ${lhs}</div><div class="pr-side rhs"><b>RHS:</b> ${rhs}</div></div>`;
    const typeRow = (prompt) => `<div class="pr-ans">${R(prompt)} <span class="pr-input empty">?</span></div>`;
    const markInput = (ok) => {
      const el = main.querySelector(".pr-input");
      if (el) el.classList.add(ok ? "ok" : "no");
    };
    const sparkleAt = (sel) => {
      const c = CQ.centerOf(main.querySelector(sel)) || { x: 960, y: 600 };
      CQ.fx.sparkle(CQ.ui.layer, c.x, c.y, 10, 90);
    };

    // A typing step that is not finished until the right number is typed.
    async function typeUntil(answer, expr) {
      for (let miss = 0; ; miss++) {
        const v = await typed();
        if (Math.abs(v - answer) < 1e-9) {
          markInput(true);
          CQ.audio.play("correct");
          sparkleAt(".pr-input");
          return;
        }
        markInput(false);
        CQ.audio.play("tryagain");
        CQ.track("answer", { activity: "practice", expr, choice: v, correct: false, attempt: miss + 1 });
        await CQ.run.wait(500);
        CQ.say("", { text: T(miss === 0 ? P.lines.typeAgain : P.lines.typeHint, { expr, ans: CQ.num(answer) }), advance: "none" });
        const el = main.querySelector(".pr-input");
        if (el) el.classList.remove("no");
      }
    }

    async function runProblem(i) {
      const p = P.problems[i];
      dots.forEach((d, k) => {
        d.classList.toggle("done", k < i);
        d.classList.toggle("now", k === i);
      });
      // 1) try on your own
      setStep(P.stepTitles.try);
      render(
        `<div class="pr-find">${R(P.find)}</div>` + (p.hint ? `<div class="pr-hint">${R(p.hint)}</div>` : "") + `<div class="pr-eq">${R(p.eq)}</div>` + typeRow("x ="),
        true
      );
      // The keypad works at once; the instructions are read meanwhile, and stop if the child answers first.
      let answered = false;
      const first = i === (startAt || 0);
      (async () => {
        if (p.hint) await CQ.say("", { text: p.hint, advance: "auto", pause: 150 });
        if (answered) return;
        if (!first) return CQ.say("", { text: T(P.lines.find, { eq: p.eq }), advance: "none" });
        await CQ.say("", { text: T(P.lines.find, { eq: p.eq }), advance: "auto", pause: 100 });
        if (!answered) CQ.say("", { text: P.lines.howTo, advance: "none" });
      })().catch(() => {});
      CQ.idle.arm(() => CQ.caption.replay(), 12000);
      const a = await typed();
      answered = true;
      CQ.idle.disarm();
      const right = Math.abs(a - p.x) < 1e-9;
      CQ.track("answer", { activity: "practice", eq: p.eq, choice: a, correct: right });
      if (right) {
        // 2) right first time: show the check
        const w = workLHS(p.lhs, p.x);
        markInput(true);
        CQ.audio.play("correct");
        await CQ.run.wait(500);
        setStep(T(P.stepTitles.right, { x: CQ.num(p.x) }));
        render(
          `<div class="pr-eq sm">${R(p.eq)}</div><div class="pr-x ok">${R("x = " + CQ.num(p.x))}</div>` +
            sides(R(w.text), CQ.num(p.rhs)) +
            `<div class="pr-banner ok">✓ ${R(T(W.bothEqual, { r: CQ.num(p.rhs) }))}</div>`
        );
        CQ.fx.confetti(CQ.ui.layer, 1150, 420, 26);
        CQ.audio.play("confetti");
        await CQ.say("", { text: T(P.lines.right, { r: CQ.num(p.rhs), x: CQ.num(p.x) }) });
        return;
      }
      // 3) wrong: why it doesn't work
      const w = workLHS(p.lhs, a);
      markInput(false);
      CQ.audio.play("tryagain");
      await CQ.run.wait(500);
      setStep(P.stepTitles.wrong);
      render(
        `<div class="pr-x no">${R(W.yourAnswer + " x = " + CQ.num(a))}</div><div class="pr-eq sm">${R(p.eq)}</div>` +
          sides(R(w.text), CQ.num(p.rhs)) +
          `<div class="pr-banner no">${R(CQ.num(w.value) + " ≠ " + CQ.num(p.rhs))}</div>` +
          `<div class="pr-note">${R(W.stepByStep)}</div>`
      );
      await CQ.say("", { text: T(P.lines.wrong, { l: CQ.num(w.value), r: CQ.num(p.rhs), a: CQ.num(a) }) });
      // 4–5) undo each operation on both sides
      for (const st of p.steps) {
        setStep(st.title);
        let html = "";
        if (st.show) html += `<div class="pr-eq">${R(st.show)}</div>`;
        if (st.note) html += `<div class="pr-note blue">${R(st.note)}</div>`;
        if (st.kind === "ask") {
          html += `<div class="pr-ask">${R(st.say)}</div><div class="pr-choices"></div>`;
          render(html);
          CQ.say("", { text: st.say, advance: "none" });
          const box = main.querySelector(".pr-choices");
          await CQ.run.when(
            new Promise((res) => {
              st.choices.forEach((label, k) => {
                const btn = button("btn-wood pr-choice", R(label), label, box, () => {
                  if (k === st.answer) {
                    btn.classList.add("ok");
                    CQ.audio.play("correct");
                    box.querySelectorAll("button").forEach((x) => (x.disabled = true));
                    res();
                  } else {
                    CQ.audio.play("tryagain");
                    btn.classList.add("no");
                    btn.disabled = true;
                    CQ.track("answer", { activity: "practice", step: st.title, choice: label, correct: false });
                    CQ.anim(btn, [{ transform: "translateX(0)" }, { transform: "translateX(-12px)" }, { transform: "translateX(12px)" }, { transform: "translateX(0)" }], { duration: 300, keep: false });
                    CQ.say("", { text: P.lines.askAgain, advance: "none" });
                  }
                });
              });
            })
          );
          if (st.right) await CQ.say("", { text: st.right, advance: "auto", pause: 300 });
          continue;
        }
        if (st.kind === "act") {
          html += `<div class="pr-choices"></div>`;
          render(html);
          CQ.say("", { text: st.say, advance: "none" });
          const box = main.querySelector(".pr-choices");
          const btn = button("btn-wood pr-act glow", R(st.button), st.button, box, () => {});
          CQ.idle.arm(() => CQ.hand.tapAt(CQ.centerOf(btn)), 8000);
          await CQ.run.when(new Promise((res) => (btn.onclick = res)));
          CQ.idle.disarm();
          CQ.hand.stop();
          btn.disabled = true;
          btn.classList.remove("glow");
          CQ.audio.play("correct");
          await CQ.run.wait(500);
          continue;
        }
        // type the result
        (st.lines || []).forEach((l) => (html += `<div class="pr-line">${R(l)}</div>`));
        html += typeRow(st.prompt);
        render(html, true);
        CQ.say("", { text: st.say, advance: "none" });
        await typeUntil(st.answer, st.expr);
        await CQ.run.wait(700);
      }
      // 6) check in the original equation
      setStep(P.stepTitles.check);
      const w2 = workLHS(p.lhs, p.x);
      render(
        `<div class="pr-eq sm">${R(p.eq)}</div><div class="pr-x">${R("x = " + CQ.num(p.x))}</div>` +
          sides(`${R(p.check.lhs)} = <button type="button" class="blank" data-k="lhs" aria-label="Left-hand side value">?</button>`, CQ.num(p.rhs)) +
          `<div class="pr-banner ok hidden"></div>`
      );
      CQ.say("", { text: T(P.lines.check, { x: CQ.num(p.x) }), advance: "none" });
      await CQ.pickNumber(main.querySelector(".blank"), main, p.check.options, w2.value, () =>
        CQ.say("", { text: T(P.lines.checkAgain, { expr: p.check.lhs }), advance: "none" })
      );
      const banner = main.querySelector(".pr-banner");
      banner.innerHTML = `✓ ${R(CQ.num(w2.value) + " = " + CQ.num(p.rhs))} · ${R(W.works)}`;
      banner.classList.remove("hidden");
      CQ.anim(banner, [{ transform: "scale(.6)", opacity: 0 }, { transform: "scale(1)", opacity: 1 }], { duration: 380, easing: CQ.EASE.back, essential: true });
      CQ.audio.play("balance.level");
      await CQ.say("", { text: P.lines.checkRight });
    }

    try {
      for (let i = startAt || 0; i < P.problems.length; i++) {
        CQ.store.set("practiceAt", i);
        await runProblem(i);
        dots[i].classList.add("done");
        CQ.fx.sparkle(CQ.ui.layer, CQ.centerOf(dots[i]).x, CQ.centerOf(dots[i]).y, 6, 30);
      }
      CQ.store.set("practiceAt", 0);
      dots.forEach((d) => d.classList.add("done"));
      setStep(P.stepTitles.done);
      // a gem for every equation solved
      const colors = ["#F2C230", "#2BB673", "#9B5DE5", "#1FA3A3", "#E5484D", "#3D8BFD"];
      render(`<div class="pr-done">${R(CQ.fmt(W.allDone, { n: P.problems.length }))}</div><div class="pr-gems">${P.problems.map((q, k) => CQ.gem(colors[k % colors.length], 96)).join("")}</div>`);
      CQ.fx.confetti(CQ.ui.layer, 960, 420, 44);
      CQ.audio.play("fanfare");
      await CQ.say("p-done");
      await closeBoard(wrap);
    } finally {
      window.removeEventListener("keydown", onKey);
      CQ.zippy.setVisible(true);
    }
  };

  // ------------------------------------------------------------------ Finale
  CQ.activityFinale = async function () {
    const c = C().finale;
    const wrap = CQ.el("div", "activity finale-act", CQ.ui.overlay);
    CQ.el("div", "nb-dim light", wrap);
    CQ.soft.set("activity", [], 1); // the finale's fade is lighter
    const title = CQ.el("div", "finale-title", wrap, c.title);
    title.setAttribute("data-t", c.title);
    const z = CQ.el("div", "finale-zippy", wrap);
    const end = CQ.vineEndFor(270, 165, 0.72); // the rig below sits at (270, 165)
    CQ.hangVine(z, end.x, end.y);
    const rig = CQ.el("div", "nb-zippy-rig", z);
    const sp = new CQ.Sprite(rig, "", 0.72);
    sp.play("zippy_laugh", [1, 7, 3, 8, 5], 230, { loop: true }); // celebrating next to his crown tower
    const tower = CQ.el("div", "crown-tower", rig);
    for (let i = 0; i < CQ.CROWNS_TOTAL; i++) {
      const cr = CQ.img("crown", "tower-crown", tower);
      cr.style.setProperty("--i", i);
      cr.style.setProperty("--r", CQ.rand(-8, 8).toFixed(1) + "deg");
    }
    const cards = CQ.el("div", "finale-cards", wrap);
    c.cards.forEach((t, i) => {
      const e = CQ.el("div", "idea-card", cards, `<span class="ic-n">${i + 1}</span><span>${CQ.rich(t)}</span>`);
      CQ.anim(e, [{ transform: "translateX(80px)", opacity: 0 }, { transform: "translateX(0)", opacity: 1 }], { duration: 500, delay: 900 + i * 450, easing: CQ.EASE.back });
    });
    const btns = CQ.el("div", "finale-btns", wrap);
    let choice;
    const chosen = new Promise((r) => (choice = r));
    CQ.button("btn-wood big", `${CQ.ICON.restart}<span>${C().ui.playAgain}</span>`, C().ui.playAgain, btns, () => choice("again"));
    CQ.button("btn-wood big", `${CQ.gem("#3D8BFD", 40)}<span>${C().ui.wordTreasure}</span>`, C().ui.wordTreasure, btns, () => CQ.treasure.open());
    CQ.button("btn-wood big", `${CQ.ICON.menu}<span>${c.chapters}</span>`, c.chapters, btns, () => CQ.menu.open());
    CQ.anim(title, [{ transform: "translateX(-50%) scale(.3)", opacity: 0 }, { transform: "translateX(-50%) scale(1)", opacity: 1 }], { duration: 700, easing: CQ.EASE.back, essential: true });
    CQ.anim(z, [{ transform: "translateY(-800px)" }, { transform: "translateY(0)" }], { duration: 900, easing: CQ.EASE.back, essential: true });
    CQ.audio.play("fanfare");
    CQ.audio.music("finale");
    const burst = () => {
      CQ.fx.confetti(CQ.ui.layer, CQ.rand(500, 1400), CQ.rand(250, 450), 40);
      CQ.audio.play("confetti");
    };
    burst();
    const iv = setInterval(burst, 2600);
    CQ.run.onCancel(() => clearInterval(iv));
    await CQ.say("fin-1", { advance: "auto" });
    await CQ.say("fin-2", { advance: "none" });
    const r = await CQ.run.when(chosen);
    clearInterval(iv);
    CQ.soft.set("activity", false);
    wrap.remove();
    return r;
  };
})();
