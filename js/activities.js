/*
 * Zippy's Crown Quest: activities.
 * Zippy's Notebook (concept explanations with Back), "Label the parts", "Sort it",
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

  // ------------------------------------------------------------------ Zippy's Notebook
  const EQ_X2 = [
    { t: "x", id: "x", k: "var" },
    { t: "+", id: "plus", k: "op" },
    { t: "2", id: "two", k: "num" },
    { t: "=", id: "eq", k: "eq" },
    { t: "7", id: "seven", k: "num" },
  ];
  const LHS = ["x", "plus", "two"];

  // Scroll heights: rolled up (the two rollers together) and open. See .scroll in styles.css.
  const SCROLL_CLOSED = 153;
  const SCROLL_OPEN = 730;
  CQ.notebook = {
    build(overlay) {
      this.el = CQ.el("div", "notebook hidden", overlay);
      this.dim = CQ.el("div", "nb-dim", this.el);
      this.scroll = CQ.el("div", "scroll", this.el); // the scroll art (see .scroll in styles.css)
      this.content = CQ.el("div", "nb-content", this.scroll);
      this.zWrap = CQ.el("div", "nb-zippy", this.el);
      const end = CQ.vineEndFor(200, 240, 0.72); // the rig below sits at (200, 240)
      this.zVine = CQ.hangVine(this.zWrap, end.x, end.y);
      this.zRig = CQ.el("div", "nb-zippy-rig", this.zWrap);
      this.z = new CQ.Sprite(this.zRig, "", 0.72);
      this.isOpen = false;
    },
    async open() {
      if (this.isOpen) return;
      this.isOpen = true;
      this.el.classList.remove("hidden");
      this.content.innerHTML = "";
      this.pose("point");
      CQ.zippy.setVisible(false); // the presenter Zippy takes over while the notebook is open
      CQ.audio.play("scroll.open");
      CQ.anim(this.dim, [{ opacity: 0 }, { opacity: 1 }], { duration: 400 });
      CQ.anim(this.zWrap, [{ transform: "translateY(-700px)" }, { transform: "translateY(0)" }], { duration: 700, easing: CQ.EASE.back, essential: true });
      CQ.anim(this.content, [{ opacity: 0 }, { opacity: 1 }], { duration: 300, delay: 450, essential: true });
      await CQ.anim(this.scroll, [{ height: SCROLL_CLOSED + "px" }, { height: SCROLL_OPEN + "px" }], { duration: 650, easing: CQ.EASE.out, essential: true });
    },
    async close() {
      if (!this.isOpen) return;
      this.isOpen = false;
      CQ.audio.play("scroll.open");
      CQ.anim(this.zWrap, [{ transform: "translateY(0)" }, { transform: "translateY(-700px)" }], { duration: 620, easing: CQ.EASE.in, essential: true });
      CQ.anim(this.content, [{ opacity: 1 }, { opacity: 0 }], { duration: 280, essential: true });
      await CQ.anim(this.scroll, [{ height: SCROLL_OPEN + "px" }, { height: SCROLL_CLOSED + "px" }], { duration: 620, easing: CQ.EASE.inOut, essential: true });
      await CQ.anim(this.dim, [{ opacity: 1 }, { opacity: 0 }], { duration: 400, essential: true });
      this.el.classList.add("hidden");
      this.z.stop();
      CQ.zippy.setVisible(true);
    },
    hideNow() {
      this.isOpen = false;
      this.el.classList.add("hidden");
      this.z.stop();
    },
    pose(p) {
      if (p === "point") this.z.play("zippy_reach", [2, 2, 2, 4, 2, 2, 3], [700, 700, 700, 260, 700, 700, 300], { loop: true });
      else if (p === "cheer") this.z.play("zippy_laugh", [6, 2, 6, 4], 160, { loop: true });
      else this.z.play("zippy_hold", [8, 7], 180, { loop: true });
    },
    cheer() {
      this.pose("cheer");
      setTimeout(() => this.isOpen && this.pose("point"), 1300);
    },
    // Draw one explanation state. s = { hl, crown, tags, box, mini, label, pulse, mini Balance, outline, lhs, rhs, ghost, title }
    render(s) {
      const c = this.content;
      c.innerHTML = "";
      if (s.title) CQ.el("div", "nb-title", c, s.title);
      const eqn = CQ.eqTokens(c, EQ_X2, "big");
      const tok = (id) => eqn.querySelector(`.tok[data-id="${id}"]`);
      (s.hl || []).forEach((id) => tok(id).classList.add("hl"));
      if (s.lhs) LHS.forEach((id) => tok(id).classList.add("lhs"));
      if (s.rhs) tok("seven").classList.add("rhs");
      (s.pulse || []).forEach((id) => tok(id).classList.add("pulse"));
      if (s.ghost) CQ.el("sup", "ghost-power", tok("x"), "1");
      const d = eqn.deco;
      if (s.box) {
        const r = groupRect(eqn, s.box);
        const b = CQ.el("div", "grp-box" + (s.boxColor ? " " + s.boxColor : ""), d);
        CQ.box(b, r.x - 18, r.y - 4, r.w + 36, r.h + 8);
      }
      if (s.outline) {
        const r = groupRect(eqn, EQ_X2.map((t) => t.id));
        const b = CQ.el("div", "grp-outline", d);
        CQ.box(b, r.x - 30, r.y - 14, r.w + 60, r.h + 28);
        if (s.outlineLabel) {
          const l = CQ.el("div", "grp-label above", d, s.outlineLabel);
          CQ.pos(l, r.cx, r.y - 30);
        }
      }
      if (s.label) {
        const r = groupRect(eqn, s.label.ids);
        const l = CQ.el("div", "grp-label above " + (s.label.color || ""), d, s.label.text);
        CQ.pos(l, r.cx, r.y - 22);
      }
      if (s.crown) {
        const r = groupRect(eqn, ["x"]);
        const i = CQ.img("crown", "mini-crown", d);
        CQ.pos(i, r.cx, r.y - 30);
      }
      if (s.mini) {
        const r = groupRect(eqn, LHS);
        const m = CQ.el("div", "mini-pic", d);
        CQ.img("crown", "mp-crown", m);
        CQ.img("coin", "mp-coin", m);
        CQ.img("coin", "mp-coin", m);
        CQ.pos(m, r.cx, r.y - 34);
      }
      if (s.miniBalance) {
        const r = groupRect(eqn, ["eq"]);
        const m = CQ.el("div", "mini-balance", d);
        m.appendChild(CQ.miniBalance({ width: 220 }));
        CQ.pos(m, r.cx, r.y - 40);
      }
      (s.tags || []).forEach((t) => {
        const ids = Array.isArray(t.ids) ? t.ids : [t.ids];
        const r = groupRect(eqn, ids);
        const row = t.row || 0;
        const y = r.y + r.h + 14 + row * 70;
        const line = CQ.el("div", "tag-line " + (t.color || ""), d);
        CQ.box(line, r.cx - 2, r.y + r.h - 6, 4, y - (r.y + r.h - 6));
        const tag = CQ.el("div", "tag " + (t.color || ""), d, CQ.rich(t.text));
        CQ.pos(tag, r.cx, y);
        if (t.bracket) {
          const br = CQ.el("div", "under-bracket " + (t.color || ""), d);
          CQ.box(br, r.x - 6, r.y + r.h - 2, r.w + 12, 18);
        }
      });
      CQ.anim(c, [{ opacity: 0.4 }, { opacity: 1 }], { duration: 260, keep: false });
      return eqn;
    },
    // Run a list of beats with Next / Back.
    async run(beats) {
      let i = 0;
      while (i < beats.length) {
        const b = beats[i];
        this.render(b.s);
        if (b.gem && !CQ.gems.have.has(b.gem)) {
          this.cheer();
          CQ.gems.collect(b.gem, { x: 1340, y: 360 });
        }
        const r = await CQ.say(b.id, { back: i > 0 });
        i += r === "back" ? -1 : 1;
        if (i < 0) i = 0;
      }
    },
  };

  CQ.NB_WORDS = [
    { id: "l4-9", s: {} },
    { id: "l4-10", s: { hl: ["x"], crown: true, tags: [{ ids: "x", text: "Variable", color: "var" }] } },
    { id: "l4-11", s: { hl: ["x"], crown: true, tags: [{ ids: "x", text: "Variable", color: "var" }] }, gem: "variable" },
    { id: "l4-12", s: { box: LHS, mini: true } },
    {
      id: "l4-13",
      s: {
        box: LHS,
        tags: [
          { ids: "x", text: "variable", color: "var" },
          { ids: "plus", text: "addition", color: "op", row: 1 },
          { ids: "two", text: "constant", color: "const" },
        ],
      },
      gem: "constant",
    },
    { id: "l4-14", s: { box: LHS, boxColor: "expr", label: { ids: LHS, text: "Algebraic expression", color: "expr" } }, gem: "expression" },
    { id: "l4-15", s: { pulse: ["eq"], miniBalance: true } },
    { id: "l4-16", s: { outline: true, outlineLabel: "Equation" }, gem: "equation" },
    { id: "l4-17", s: { lhs: true, tags: [{ ids: LHS, text: "Left-hand side (LHS)", color: "lhs", bracket: true }] }, gem: "lhs" },
    {
      id: "l4-18",
      s: {
        lhs: true,
        rhs: true,
        tags: [
          { ids: LHS, text: "Left-hand side (LHS)", color: "lhs", bracket: true },
          { ids: "seven", text: "Right-hand side (RHS)", color: "rhs", bracket: true, row: 1 },
        ],
      },
      gem: "rhs",
    },
  ];
  CQ.NB_LINEAR = [
    { id: "l4-19", s: { hl: ["x"], tags: [{ ids: "x", text: "One variable: x", color: "var" }] } },
    { id: "l4-20", s: { hl: ["x"], ghost: true, tags: [{ ids: "x", text: "x means x¹", color: "var" }] } },
    { id: "l4-21", s: { hl: ["x"], ghost: true, tags: [{ ids: "x", text: "One variable · highest power 1", color: "var" }] } },
    { id: "l4-22", s: { title: "Linear equation in one variable", outline: true }, gem: "linear" },
  ];

  // ------------------------------------------------------------------ shared board for activities
  function board(cls) {
    const wrap = CQ.el("div", "activity " + cls, CQ.ui.overlay);
    CQ.el("div", "nb-dim", wrap);
    const b = CQ.el("div", "board", wrap);
    CQ.anim(wrap, [{ opacity: 0 }, { opacity: 1 }], { duration: 420, essential: true });
    CQ.anim(b, [{ transform: "scale(.9)", opacity: 0 }, { transform: "scale(1)", opacity: 1 }], { duration: 600, easing: CQ.EASE.out, essential: true });
    CQ.audio.play("scroll.open");
    wrap.board = b;
    return wrap;
  }
  function closeBoard(wrap) {
    return CQ.anim(wrap, [{ opacity: 1 }, { opacity: 0 }], { duration: 480, essential: true }).then(() => wrap.remove());
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
    CQ.el("div", "board-note", b, CQ.rich(c.note));
    await CQ.run.wait(80);
    const d = eqn.deco;
    const all = ["four", "x", "plus", "three", "eq", "r"];
    const R = (ids) => groupRect(eqn, ids);
    const ra = R(all);
    const rx = R(["x"]);
    const rl = R(["four", "x", "plus", "three"]);
    const rr = R(["r"]);
    // braces + lines (in equation coordinates)
    const brace = (r, up, cls) => {
      const e = CQ.el("div", "brace " + (up ? "up" : "down") + " " + (cls || ""), d);
      CQ.box(e, r.x - 10, up ? r.y - 34 : r.y + r.h + 6, r.w + 20, 30);
      return e;
    };
    brace(ra, true, "b-eq");
    brace(rl, false, "b-lhs");
    brace(rr, false, "b-rhs");
    const vline = (x, y0, y1) => CQ.box(CQ.el("div", "lead", d), x - 2, Math.min(y0, y1), 4, Math.abs(y1 - y0));
    // boxes (targets), positioned in equation coordinates
    const targets = [];
    const mk = (answer, x, y) => {
      const t = CQ.el("button", "drop-box", d);
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
    mk("Variable", rx.cx - 120, topY);
    vline(rx.cx, topY + 40, rx.y + 10);
    mk("Equation", ra.cx + 230, topY);
    vline(ra.cx + 230, topY + 40, ra.y - 34);
    CQ.box(CQ.el("div", "lead", d), ra.cx, ra.y - 36, 230, 4);
    mk("LHS", rl.cx, botY);
    vline(rl.cx, rl.y + rl.h + 36, botY - 40);
    mk("RHS", rr.cx + 40, botY);
    vline(rr.cx, rr.y + rr.h + 36, botY - 40);
    CQ.box(CQ.el("div", "lead", d), rr.cx, botY - 42, 40, 4);
    // the parts each box describes (glow when correct)
    const parts = { Variable: ["x"], LHS: ["four", "x", "plus", "three"], RHS: ["r"], Equation: all };
    const colors = { Variable: "var", LHS: "lhs", RHS: "rhs", Equation: "eqall" };

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
          el.classList.add("placed");
          const tc = rectOf(t);
          CQ.pos(el, (tc.x0 + tc.x1) / 2, (tc.y0 + tc.y1) / 2);
          t.classList.add("ok");
          t.setAttribute("aria-label", t.answer);
          parts[t.answer].forEach((id) => eqn.querySelector(`.tok[data-id="${id}"]`).classList.add("glow-" + colors[t.answer]));
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
    await CQ.say("", { text: c.title, advance: "auto", pause: 100 });
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
    await closeBoard(wrap);
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
          el.classList.add(right === "linear" ? "show-1" : "show-2");
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
    await CQ.say("", { text: c.title, advance: "auto", pause: 100 });
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
    const brace = (r, up, cls) => CQ.box(CQ.el("div", "brace " + (up ? "up " : "down ") + cls, d), r.x - 8, up ? r.y - 22 : r.y + r.h + 2, r.w + 16, 20);
    if (show.includes("variable")) {
      eqn.querySelector('.tok[data-id="x"]').classList.add("rc-var");
      tag("var", labels.variable, rx.cx - 90, all.y - 46);
      CQ.box(CQ.el("div", "rc-arrow", d), rx.cx - 50, all.y - 44, 4, 52).style.transform = "rotate(-38deg)";
    }
    if (show.includes("equation")) {
      brace(all, true, "rc-eqb");
      tag("eqn", labels.equation, all.cx + 70, all.y - 46);
    }
    if (show.includes("lhs")) {
      brace(rl, false, "rc-lhs");
      tag("lhs", labels.lhs, rl.cx, rl.y + rl.h + 30, true);
    }
    if (show.includes("rhs")) {
      brace(rr, false, "rc-rhs");
      tag("rhs", labels.rhs, rr.cx + 40, rr.y + rr.h + 30, true);
    }
  }
  CQ.activityRecap = async function () {
    const c = C().recap;
    const wrap = board("recap-act");
    const b = wrap.board;
    CQ.el("div", "board-title", b, c.title);
    const grid = CQ.el("div", "rc-grid", b);
    const panels = c.panels.map((p, i) => {
      const card = CQ.el("div", "rc-panel", grid);
      CQ.el("div", "rc-n", card, String(i + 1));
      const box = CQ.el("div", "rc-eq-wrap", card);
      card.eqn = CQ.eqTokens(box, RECAP_EQ, "rc-eq");
      CQ.el("div", "rc-text", card, CQ.rich(p.text));
      return card;
    });
    await CQ.run.wait(80); // lay the equations out before measuring them for the labels
    panels.forEach((card, i) => recapLabels(card.eqn, c.panels[i].show, c.labels));
    await CQ.say("recap-0", { text: c.title + ".", advance: "auto", pause: 200 });
    for (let i = 0; i < panels.length; i++) {
      panels[i].classList.add("on");
      CQ.audio.play("ui.pop");
      CQ.anim(panels[i], [{ transform: "scale(.85)", opacity: 0 }, { transform: "scale(1)", opacity: 1 }], { duration: 420, easing: CQ.EASE.back, essential: true });
      await CQ.say(c.panels[i].id, { text: c.panels[i].text });
    }
    await CQ.run.wait(300);
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
    // Zippy hangs beside the board and cheers the child on.
    const zw = CQ.el("div", "pr-zippy", wrap);
    const end = CQ.vineEndFor(200, 240, 0.72);
    CQ.hangVine(zw, end.x, end.y);
    const zs = new CQ.Sprite(CQ.el("div", "nb-zippy-rig", zw), "", 0.72);
    const zpose = (p) => {
      if (p === "cheer") zs.play("zippy_laugh", [6, 2, 6, 4], 160, { loop: true });
      else if (p === "oops") zs.show("zippy_scared", 5);
      else if (p === "think") zs.show("zippy_hold", 3);
      else zs.play("zippy_reach", [2, 2, 2, 4, 2, 2, 3], [700, 700, 700, 260, 700, 700, 300], { loop: true });
    };
    zpose("point");
    CQ.zippy.setVisible(false); // the presenter Zippy takes over while the board is up
    CQ.anim(zw, [{ transform: "translateY(-700px)" }, { transform: "translateY(0)" }], { duration: 700, easing: CQ.EASE.back, essential: true });
    const b = CQ.el("div", "board pr-board", wrap);
    CQ.anim(b, [{ transform: "scale(.85)", opacity: 0 }, { transform: "scale(1)", opacity: 1 }], { duration: 420, easing: CQ.EASE.back, essential: true });
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
      CQ.anim(main, [{ transform: "translateY(16px)", opacity: 0 }, { transform: "translateY(0)", opacity: 1 }], { duration: 320, easing: CQ.EASE.out, keep: false });
    };
    const R = CQ.rich;
    const sides = (lhs, rhs) =>
      `<div class="pr-sides"><div class="pr-side lhs"><b>LHS:</b> ${lhs}</div><div class="pr-side rhs"><b>RHS:</b> ${rhs}</div></div>`;
    const typeRow = (prompt) => `<div class="pr-ans">${R(prompt)} <span class="pr-input empty">?</span></div>`;
    const markInput = (ok) => {
      const el = main.querySelector(".pr-input");
      if (el) el.classList.add(ok ? "ok" : "no");
    };
    const cheer = () => {
      zpose("cheer");
      setTimeout(() => wrap.isConnected && zpose("point"), 1400);
    };
    const sparkleAt = (sel) => {
      const c = CQ.centerOf(main.querySelector(sel)) || { x: 1100, y: 600 };
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
          cheer();
          return;
        }
        markInput(false);
        CQ.audio.play("tryagain");
        CQ.track("answer", { activity: "practice", expr, choice: v, correct: false, attempt: miss + 1 });
        zpose("think");
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
      zpose("point");
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
        cheer();
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
      zpose("oops");
      await CQ.run.wait(500);
      setStep(P.stepTitles.wrong);
      render(
        `<div class="pr-x no">${R(W.yourAnswer + " x = " + CQ.num(a))}</div><div class="pr-eq sm">${R(p.eq)}</div>` +
          sides(R(w.text), CQ.num(p.rhs)) +
          `<div class="pr-banner no">${R(CQ.num(w.value) + " ≠ " + CQ.num(p.rhs))}</div>` +
          `<div class="pr-note">${R(W.stepByStep)}</div>`
      );
      await CQ.say("", { text: T(P.lines.wrong, { l: CQ.num(w.value), r: CQ.num(p.rhs), a: CQ.num(a) }) });
      zpose("point");
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
                    cheer();
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
          cheer();
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
      cheer();
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
      zpose("cheer");
      CQ.fx.confetti(CQ.ui.layer, 1100, 420, 44);
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
    wrap.remove();
    return r;
  };
})();
