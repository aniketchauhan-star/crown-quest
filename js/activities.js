/*
 * Zippy's Crown Quest: activities.
 * Zippy's Notebook (concept explanations with Back), "Label the parts", "Sort it",
 * the Word Treasure recap chest, and the finale.
 */
(function () {
  "use strict";
  const CQ = window.CQ;
  const C = () => window.CONTENT;

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

  CQ.notebook = {
    build(overlay) {
      this.el = CQ.el("div", "notebook hidden", overlay);
      this.dim = CQ.el("div", "nb-dim", this.el);
      this.scroll = CQ.el("div", "scroll", this.el);
      this.paper = CQ.el("div", "paper", this.scroll);
      this.rollTop = CQ.el("div", "roller top", this.scroll);
      this.rollBot = CQ.el("div", "roller bottom", this.scroll);
      this.content = CQ.el("div", "nb-content", this.paper);
      this.zWrap = CQ.el("div", "nb-zippy", this.el);
      this.zVine = CQ.el("div", "zippy-vine nb-vine", this.zWrap);
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
      CQ.anim(this.rollBot, [{ transform: "translateY(-660px)" }, { transform: "translateY(0)" }], { duration: 650, easing: CQ.EASE.out, essential: true });
      await CQ.anim(this.paper, [{ clipPath: "inset(0 0 100% 0)" }, { clipPath: "inset(0 0 0% 0)" }], { duration: 650, easing: CQ.EASE.out, essential: true });
    },
    async close() {
      if (!this.isOpen) return;
      this.isOpen = false;
      CQ.audio.play("scroll.open");
      CQ.anim(this.zWrap, [{ transform: "translateY(0)" }, { transform: "translateY(-700px)" }], { duration: 450, easing: CQ.EASE.in, essential: true });
      CQ.anim(this.rollBot, [{ transform: "translateY(0)" }, { transform: "translateY(-660px)" }], { duration: 450, easing: CQ.EASE.in, essential: true });
      await CQ.anim(this.paper, [{ clipPath: "inset(0 0 0% 0)" }, { clipPath: "inset(0 0 100% 0)" }], { duration: 450, easing: CQ.EASE.in, essential: true });
      await CQ.anim(this.dim, [{ opacity: 1 }, { opacity: 0 }], { duration: 250, essential: true });
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
        const m = CQ.el("div", "mini-balance", d, CQ.miniBalanceSVG({ width: 220 }));
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
    },
    {
      id: "l4-13b",
      s: { box: LHS, hl: [], tags: [{ ids: "two", text: "constant: fixed value", color: "const" }] },
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
    CQ.anim(b, [{ transform: "scale(.85)", opacity: 0 }, { transform: "scale(1)", opacity: 1 }], { duration: 420, easing: CQ.EASE.back, essential: true });
    CQ.audio.play("scroll.open");
    wrap.board = b;
    return wrap;
  }
  function closeBoard(wrap) {
    return CQ.anim(wrap, [{ opacity: 1 }, { opacity: 0 }], { duration: 300, essential: true }).then(() => wrap.remove());
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

  // ------------------------------------------------------------------ Word Treasure recap (chest)
  CQ.activityRecap = async function (ids) {
    const wrap = board("recap-act");
    const b = wrap.board;
    CQ.el("div", "board-title", b, `${CQ.gemSVG("#3D8BFD", 52)} ${C().ui.wordTreasure}`);
    const chest = CQ.el("div", "chest", b, '<div class="chest-glow"></div><div class="chest-lid"></div><div class="chest-base"><div class="chest-lock"></div></div>');
    const grid = CQ.el("div", "word-grid recap-grid", b);
    await CQ.run.wait(500);
    chest.classList.add("open");
    CQ.audio.play("chest.open");
    const cc = CQ.centerOf(chest);
    CQ.fx.sparkle(CQ.ui.layer, cc.x, cc.y - 40, 14, 110);
    await CQ.run.wait(400);
    CQ.treasure.cards(grid, ids, true);
    await CQ.say("l4-recap");
    await closeBoard(wrap);
  };

  // ------------------------------------------------------------------ Finale
  CQ.activityFinale = async function () {
    const c = C().finale;
    const wrap = CQ.el("div", "activity finale-act", CQ.ui.overlay);
    CQ.el("div", "nb-dim light", wrap);
    const title = CQ.el("div", "finale-title", wrap, c.title);
    title.setAttribute("data-t", c.title);
    const z = CQ.el("div", "finale-zippy", wrap);
    const vine = CQ.el("div", "zippy-vine nb-vine", z);
    vine.style.height = "640px";
    const rig = CQ.el("div", "nb-zippy-rig", z);
    const sp = new CQ.Sprite(rig, "", 0.8);
    sp.play("zippy_laugh", [1, 7, 3, 8, 5], 230, { loop: true }); // celebrating next to his crown tower
    const tower = CQ.el("div", "crown-tower", rig);
    for (let i = 0; i < 8; i++) {
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
    CQ.button("btn-wood big", `${CQ.gemSVG("#3D8BFD", 40)}<span>${C().ui.wordTreasure}</span>`, C().ui.wordTreasure, btns, () => CQ.treasure.open());
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
