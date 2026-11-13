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

  // The formula screen. The view glides (zooms in and pans) until the balance stands at the left of
  // the screen, on its own ground, bright and sharp, while the rest of the scene goes soft and dark
  // (CQ.balance.present). Then the equation is written in at the right, one sign at a time (review,
  // 2026-11-13: "Animate the balance moving left and the equation moving right"; coming from Level 4's
  // x + 2 = 7 under the balance, that equation glides over instead: run's landed). The part of
  // the balance a beat talks about lights up: the crown for x, a pan for a side, both pans when the
  // sides are equal. Each beat adds tags, boxes and highlights: what stays the same from one beat to
  // the next stays still, and what is new fades in where it stays, one piece at a time. The question
  // bar above says the line. Zippy isn't on this screen: the balance and the maths have it to
  // themselves. On closing, the maths fades and the view glides back to the whole scene.
  // the view: the balance at the LEFT, with room round both pans (x about 80–996 on screen, from under
  // the question bar to near the bottom), and the maths in the room at the right (x 1050–1870). Review,
  // 2026-11-13: "Reduce the balance slightly to give both pans comfortable margins. Animate the balance
  // moving left and the equation moving right", which the user chose over keeping the balance at the
  // right (2026-11-08 to 11-13, "the balance on the right and the equation steps on the left"; it was
  // 1.42 then, its right pan 30 px from the screen's edge). So the view looks past the scene's right
  // edge: there the scene goes on in a mirror image (free: js/world.js, mirrorBackground), blurred and
  // dark under the maths.
  const ASIDE = { x: 1403, y: 550, z: 1.3, free: true };
  CQ.ASIDE = ASIDE; // (the check uses it too: CQ.checkPanel in js/ui.js)
  // A part of the balance glows softly (CQ.focus; review, 2026-11-13: a soft glow round the things, no
  // frame round them): "crown", "left" (the things on the left pan), "right", "both" (both pans' things),
  // "level" or "whole" (the whole balance). Anything else: no glow.
  // The left pan's things glide from where they were to where change() puts them (things it adds come
  // in where they belong; the caller brings them in).
  function glideLeft(change) {
    const b = CQ.balance;
    const was = new Map(b.items.left.map((it) => [it, { x: it.x, y: it.y }]));
    change();
    b.layout("left");
    b.items.left.forEach((it) => {
      const p = was.get(it);
      if (!p || (p.x === it.x && p.y === it.y)) return;
      CQ.anim(it.el, [{ transform: `translate(${p.x - it.x}px, ${p.y - it.y}px)` }, { transform: "translate(0px, 0px)" }], { duration: 560, easing: CQ.EASE.out, keep: false });
    });
  }
  // Putting a value in for x on the balance (review, 2026-11-07: "show the substitution through
  // animation… replace the crown on the left pan with four unit coins. Keep the two existing coins
  // visible, then group all six together"; the same in the check, 2026-11-08). Each crown on the left
  // pan stands for x: it goes, and in its place come that many unit coins, one by one, beside what is
  // there, and then all the coins gather into one group. Where a bar lies beside the crown, or the
  // value is big (Levels 8 and 9), a gold bar of the value takes the crown's place instead. The
  // balance stays level until the working says otherwise (CQ.balance.evaluate: it tips, or levels, the
  // way the pans now weigh). restore puts the crowns back (quick: at once). Both are safe to repeat.
  CQ.xPan = {
    sub: null,
    reset() {
      this.sub = null;
    },
    async put(v) {
      const b = CQ.balance;
      b.target = 0; // level, until the working says otherwise
      if (this.sub && this.sub.v === v) return;
      if (this.sub) await this.restore(true);
      const crowns = b.items.left.filter((it) => it.type === "crown" && !it.ghost);
      if (!crowns.length) return;
      const others = b.items.left.filter((it) => !crowns.includes(it));
      const asCoins = others.every((it) => it.type === "coin") && Number.isInteger(v) && v > 0 && v * crowns.length + others.length <= 12;
      const sub = (this.sub = {
        v,
        added: [],
        asCoins,
        crowns: crowns.map((c) => ({ at: b.items.left.indexOf(c), slot: c.slot })),
        slots: new Map(others.map((it) => [it, it.slot])),
      });
      CQ.audio.play("ui.swoosh");
      await Promise.all(crowns.map((c) => CQ.anim(c.el, [{ opacity: 1, transform: "scale(1)" }, { opacity: 0, transform: "scale(0.4)" }], { duration: 380, easing: CQ.EASE.in, essential: true })));
      if (this.sub !== sub) return;
      glideLeft(() => {
        crowns.forEach((c) => b.removeItem(c));
        if (asCoins) for (let i = 0; i < v * crowns.length; i++) sub.added.push(b.addItem("left", { type: "coin", slot: "subst" }, i));
        else sub.crowns.forEach((c, n) => sub.added.push(b.addItem("left", { type: "bar", value: v, slot: "main" }, n)));
        sub.added.forEach((it) => {
          it.el.style.opacity = "0";
          it.forX = true; // (counting on from x's value skips these: Balance.autoCount)
        });
      });
      const gap = asCoins ? 170 : 320;
      sub.added.forEach((it, i) =>
        setTimeout(() => {
          if (this.sub !== sub) return;
          it.el.style.opacity = "";
          CQ.anim(it.el, [{ opacity: 0, transform: "scale(0.3)" }, { opacity: 1, transform: "scale(1)" }], { duration: 320, easing: CQ.EASE.back, keep: false });
          CQ.audio.play(asCoins ? "coin.clink" : "ui.pop", { volume: 0.5 });
        }, 120 + i * gap)
      );
      await CQ.run.wait(120 + sub.added.length * gap + 650);
      // (the coins put in for x stay a group of their own beside the others, so 4 + 3 can be seen on the
      // pan: review, 2026-11-13, "Show four replacement coins and three additional coins as distinct
      // groups"; Level 4's try gathers them into one as the left side's value is said: gather)
    },
    // All the coins on the left pan gather into one group (Level 4's try, as "The left-hand side equals
    // 6" is said: review, 2026-11-07, "Keep the two existing coins visible, then group all six together").
    async gather() {
      const sub = this.sub;
      if (!sub || !sub.asCoins || sub.gathered) return;
      sub.gathered = true;
      glideLeft(() => CQ.balance.items.left.forEach((it) => (it.slot = "group")));
      await CQ.run.wait(560);
    },
    async restore(quick) {
      const b = CQ.balance;
      const sub = this.sub;
      if (!sub) return;
      this.sub = null;
      if (!quick) {
        sub.added.forEach((it) => CQ.anim(it.el, [{ opacity: 1 }, { opacity: 0 }], { duration: 300, easing: CQ.EASE.in }));
        await CQ.run.wait(320);
      }
      glideLeft(() => {
        sub.added.forEach((it) => b.removeItem(it));
        sub.slots.forEach((slot, it) => (it.slot = slot));
        sub.crowns.forEach((c) => {
          const crown = b.addItem("left", { type: "crown", slot: c.slot }, c.at);
          if (!quick) CQ.anim(crown.el, [{ opacity: 0, transform: "scale(0.4)" }, { opacity: 1, transform: "scale(1)" }], { duration: 420, easing: CQ.EASE.back, keep: false });
        });
      });
      b.evaluate(); // the crown is back: level again
    },
  };
  CQ.frameBalance = function (part) {
    const b = CQ.balance;
    const plate = (side) => b.sides[side].g.querySelector(".bal-plate");
    const els = (side, pred) => b.items[side].filter((it) => !pred || pred(it)).map((it) => it.el);
    const parts = {
      crown: () => els("left", (it) => it.type === "crown"),
      left: () => [plate("left")].concat(els("left")),
      right: () => [plate("right")].concat(els("right")),
      both: () => [plate("left"), plate("right")].concat(els("left"), els("right")),
      level: () => [b.rig], // (one glow round all of it)
    };
    parts.whole = parts.level;
    if (!parts[part]) {
      CQ.focus.off();
      return false;
    }
    CQ.focus.on(parts[part], { quiet: true });
    return true;
  };
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
      CQ.xPan.reset(); // no value put in for x yet
      this.shown = null;
      CQ.soft.set("notebook", [CQ.world.balanceLayer], 2); // all but the balance goes soft
      CQ.balance.present(true);
      CQ.audio.play("focus.in");
      await CQ.camera.to(ASIDE.x, ASIDE.y, ASIDE.z, 1400, null, ASIDE.free); // then the first beat writes the equation in
      if (n !== this.opens) return;
      CQ.zippy.setVisible(false); // already unseen under the dark
      await CQ.run.hold(CQ.PACE.settle); // a moment before the equation is written in
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
      CQ.balance.glowSides(false);
      CQ.balance.beam.classList.remove("glow-eq");
      this.panLights(null);
      CQ.balance.present(false);
      CQ.soft.set("notebook", false);
      await CQ.camera.to(960, 540, 1, 1300); // back to the whole scene
      if (n === this.opens) await CQ.run.hold(CQ.PACE.settle); // a moment before the story goes on
    },
    // The formula screen stays open with nothing written on it: Level 4's label activity comes in over it
    // (runL4c), and its next run writes its equation in afresh.
    blank() {
      this.content.innerHTML = "";
      this.stage.style.opacity = "";
      this.shown = null;
      this.landing = null;
      this.framed = false;
      CQ.focus.off(true);
      CQ.balance.glowSides(false);
      CQ.balance.beam.classList.remove("glow-eq");
      this.panLights(null);
      CQ.xPan.reset();
    },
    hideNow() {
      this.isOpen = false;
      this.opens++;
      this.shown = null;
      this.landing = null;
      CQ.balance.beam.classList.remove("glow-eq");
      this.panLights(null);
      CQ.xPan.reset(); // (the scene is set up again: the crown is back)
      this.framed = false;
      this.content.innerHTML = "";
      this.el.classList.add("hidden");
      CQ.soft.set("notebook", false);
      CQ.balance.present(false, true);
    },
    // Draw one beat. s = { hl, crown, mini, tags, box, boxColor, label, pulse, outline, outlineLabel,
    // lhs, rhs, ghost, title, rows, bal, cue }. crown: the crown over x; mini: the crown and two coins
    // over x + 2 (both fly over from the balance). rows are lines worked out under the equation
    // ({ t, cls }: cls "big", "no" red, "ok" green). bal is the part of the balance the frame goes
    // round: "crown", "left", "right", "both", or "level" (the whole balance, and its centre flashes:
    // the sides are equal). Each piece gets a key; pieces that were already on screen in the last beat
    // stay as they were, so only the new ones catch the eye. A new piece can wait for the words of the
    // line that name it (the question bar types with the voice): a tag's or a row's cue, or
    // s.cue = { title, outline (the outline and its label), label, hl, hlOut, lhs, rhs, bal }; x's power (x¹):
    // s.power = { in, out }.
    render(s) {
      const sig = JSON.stringify(s);
      if (this.shown && this.shown.sig === sig) return this.content.querySelector(".eqn");
      const c = this.content;
      c.innerHTML = "";
      CQ.balance.glowSides(false); // (a beat's pans glow only in that beat)
      this.panLights(null);
      CQ.balance.beam.classList.remove("glow-eq");
      const keys = new Set();
      const add = (el, key) => {
        el.dataset.key = key;
        keys.add(key);
        return el;
      };
      const cueFor = (el, part) => {
        if (s.cue && s.cue[part]) el.dataset.cue = s.cue[part];
        return el;
      };
      const eqn = CQ.eqTokens(c, EQ_X2, "big");
      if (s.title) cueFor(add(CQ.el("div", "nb-title", c, s.title), "title:" + s.title), "title");
      const tok = (id) => eqn.querySelector(`.tok[data-id="${id}"]`);
      (s.hl || []).forEach((id) => tok(id).classList.add("hl"));
      if (s.lhs) LHS.forEach((id) => tok(id).classList.add("lhs"));
      if (s.rhs) tok("seven").classList.add("rhs");
      (s.pulse || []).forEach((id) => tok(id).classList.add("pulse"));
      // a part of the equation that changes (a highlight, a colour) eases from how it was to how it is.
      // A new highlight or side colour can wait for the voice, each for its own words (s.cue.hl,
      // s.cue.lhs, s.cue.rhs): x can light up on one word and turn teal with x + 2 on a later one. (On a
      // first beat, a part waits in its plain look. Done before anything below measures the page, so a
      // new look is never drawn too early.)
      const before = this.shown || { keys: new Set(), toks: {} };
      const toks = {};
      eqn.querySelectorAll(".tok").forEach((t) => {
        const now = t.className;
        toks[t.dataset.id] = now;
        const want = now.split(" ");
        let was = before.toks[t.dataset.id];
        // (a highlight with a word of its own waits for it even if the line before ended with it on: it
        // fades back as the line starts and comes again on its word, so = lights on "equal values")
        const waits = want.filter((k) => ["hl", "lhs", "rhs"].includes(k) && s.cue && s.cue[k]);
        const start = want.filter((k) => !waits.includes(k)).join(" ");
        if (was == null) {
          if (!waits.length) return;
          was = start;
        }
        if (was === now && !waits.length) return;
        t.className = was;
        void t.offsetWidth; // the old look is drawn first, so the change runs as a CSS transition
        t.className = start;
        waits.forEach((k) => this.onCue(s.cue[k], sig, () => t.classList.add(k)));
      });
      // s.cue.hlOut: the word on which the highlight goes off again (x lit for "one variable", then only its
      // power 1 for "highest power"); the next beat starts from x plain
      if (s.cue && s.cue.hlOut)
        this.onCue(s.cue.hlOut, sig, () =>
          (s.hl || []).forEach((id) => {
            tok(id).classList.remove("hl");
            if (this.shown && this.shown.sig === sig) this.shown.toks[id] = tok(id).className;
          })
        );
      // The side a line brings in glows on the balance in its colour as the voice names it, with its
      // maths (LHS teal, RHS orange: review, 2026-11-13, "Highlight the seven coins and 7 when
      // introducing the RHS"); a side already brought in stays plain.
      ["lhs", "rhs"].forEach((k) => {
        if (s[k] && s.cue && s.cue[k]) this.onCue(s.cue[k], sig, () => this.sideGlow(k === "lhs" ? "left" : "right"));
      });
      // s.beam: the word on which the level beam lights up, in the same soft gold as the = it goes with,
      // its hub flashing green (level); it stays lit for the rest of the line
      if (s.beam)
        this.onCue(s.beam, sig, () => {
          CQ.balance.beam.classList.add("glow-eq");
          CQ.balance.flashEmblem();
        });
      const d = eqn.deco;
      // x with a value put in for it (s.x): the value stands over the x in a gold box (the x stays
      // underneath, so nothing moves), coming in as the voice says "Replace x with…" (s.cue.x)
      if (s.x != null) {
        const t = tok("x");
        const o = add(CQ.el("div", "x-sub", d, String(s.x)), "xsub:" + s.x);
        CQ.box(o, t.offsetLeft, t.offsetTop, t.offsetWidth, t.offsetHeight);
        if (s.cue && s.cue.x) o.dataset.cue = s.cue.x;
      }
      // x's power: a 1 at the top right of the x (x¹), in its own layer so the equation never moves. It
      // appears as the voice gets to s.power.in and fades as it gets to s.power.out.
      if (s.power) {
        const t = tok("x");
        const p = add(CQ.el("div", "x-power", d, "1"), "power:" + (s.power.in || ""));
        CQ.pos(p, inkX(t).x1 + 3, t.offsetTop + t.offsetHeight * 0.02); // (just clear of the x's arm)
        if (s.power.in) p.dataset.cue = s.power.in;
        if (s.power.out) this.onCue(s.power.out, sig, () => CQ.anim(p, [{ opacity: 1 }, { opacity: 0 }], { duration: 700, easing: CQ.EASE.out }));
      }
      if (s.box) {
        const r = groupRect(eqn, s.box);
        const b = add(CQ.el("div", "grp-box" + (s.boxColor ? " " + s.boxColor : ""), d), "box:" + s.box.join() + (s.boxColor || ""));
        CQ.box(b, r.x - 18, r.y - 4, r.w + 36, r.h + 8);
      }
      if (s.outline) {
        const r = groupRect(eqn, EQ_X2.map((t) => t.id));
        const b = cueFor(add(CQ.el("div", "grp-outline", d), "outline"), "outline");
        CQ.box(b, r.x - 30, r.y - 14, r.w + 60, r.h + 28);
        if (s.outlineLabel) {
          // under the outline, where there is room (review, 2026-11-07: over it, against the question
          // bar, "it looks congested")
          const l = cueFor(add(CQ.el("div", "grp-label below", d, s.outlineLabel), "olabel:" + s.outlineLabel), "outline");
          CQ.pos(l, r.cx, r.y + r.h + 30);
        }
      }
      if (s.label) {
        const r = groupRect(eqn, s.label.ids);
        const l = cueFor(add(CQ.el("div", "grp-label above " + (s.label.color || ""), d, s.label.text), "label:" + s.label.text), "label");
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
      const rowCls = {};
      if (s.rows) {
        const rows = CQ.el("div", "nb-rows", c);
        s.rows.forEach((r) => {
          // a side worked out (cls "side": LHS = 4 + 2 = 6): its name, =, and the rest, in columns, so
          // the two sides' first = signs stand one under the other (review, 2026-11-13)
          const i = /\bside\b/.test(r.cls || "") ? r.t.indexOf(" = ") : -1;
          const html = i > 0 ? `<span class="sl">${CQ.rich(r.t.slice(0, i))}</span><span class="se">=</span><span class="sr">${CQ.rich(r.t.slice(i + 3))}</span>` : CQ.rich(r.t);
          const key = "row:" + r.t;
          const el = add(CQ.el("div", "nb-row " + (r.cls || ""), rows, html), key);
          if (r.cue) el.dataset.cue = r.cue; // it waits until the voice says this
          // a row already there that changes (lit, faded back) eases from how it was
          const was = before.rowCls && before.rowCls[key];
          if (was && was !== el.className) {
            const now = el.className;
            el.className = was;
            void el.offsetWidth;
            el.className = now;
          }
          rowCls[key] = el.className;
          // r.lit = { cue, cls }: it lights up on a word (the try, as what it means is said)
          if (r.lit) this.onCue(r.lit.cue, sig, () => el.classList.add(r.lit.cls));
        });
      }
      // a tag hangs under its part on a straight line that starts with a dot on the part (or on the
      // middle of the part's bracket, or on the bottom of the box round it), like the labels of the
      // activities. t.box: a box in the tag's colour round the part, drawn in when the voice gets to
      // t.boxCue (the line and the word wait for t.cue).
      (s.tags || []).forEach((t) => {
        const ids = Array.isArray(t.ids) ? t.ids : [t.ids];
        const r = groupRect(eqn, ids);
        const row = t.row || 0;
        const y = r.y + r.h + (t.bracket || t.box ? 34 : 14) + row * 66;
        const key = "tag:" + t.text;
        if (t.box) {
          // round the part; the = stays outside, with room on either side of it
          let x0 = r.x - 14;
          let x1 = r.x + r.w + 14;
          const eq = tok("eq");
          if (eq && !ids.includes("eq")) {
            const e = inkX(eq);
            if (r.x + r.w <= eq.offsetLeft + 1) x1 = Math.min(x1, e.x0 - 16); // the box left of the =
            else if (r.x >= eq.offsetLeft + eq.offsetWidth - 1) x0 = Math.max(x0, e.x1 + 16); // right of it
          }
          const bx = add(CQ.el("div", "grp-box tag-box " + (t.color || ""), d), "tagbox:" + t.text);
          CQ.box(bx, x0, r.y - 4, x1 - x0, r.h + 8);
          if (t.boxCue) bx.dataset.cue = t.boxCue;
        }
        if (t.bracket) {
          const br = add(CQ.el("div", "under-bracket " + (t.color || ""), d), key);
          CQ.box(br, r.x - 6, r.y + r.h - 2, r.w + 12, 18);
        }
        const top = t.box ? r.y + r.h + 4 : t.bracket ? r.y + r.h + 13 : r.y + r.h - 6;
        const line = add(CQ.el("div", "tag-line " + (t.color || ""), d), key);
        CQ.box(line, r.cx - 2, top, 4, y - top);
        CQ.el("div", "tag-dot", line);
        const tag = add(CQ.el("div", "tag " + (t.color || ""), d, CQ.rich(t.text)), key);
        if (t.lights) tag.lights = { ids, tok: t.lights.tok, pan: t.lights.pan }; // lit as it comes in (lightTag)
        // a wide tag slides along to stay on the screen and clear of the balance (inside the room at the
        // left, now that the balance is bigger: 2026-11-09); its line still lands on it
        const half = tag.offsetWidth / 2;
        const lo = -eqn.offsetLeft - this.stage.offsetLeft + 24 + half;
        const hi = this.stage.offsetWidth - eqn.offsetLeft - 12 - half;
        CQ.pos(tag, Math.max(lo, Math.min(hi, r.cx)), y);
        if (t.cue) c.querySelectorAll(`[data-key="${CSS.escape(key)}"]`).forEach((el) => (el.dataset.cue = t.cue)); // it waits until the voice says this
        // a side brought in before fades back as the voice moves on to the other side (t.fade: the word),
        // its box, line and label staying in sight, so the new side has the focus (Level 4's RHS line:
        // review, 2026-11-13, "Keep the LHS label visible but fade its highlight so RHS gets the focus")
        if (t.fade)
          this.onCue(t.fade, sig, () => {
            c.querySelectorAll(`[data-key="${CSS.escape(key)}"], [data-key="${CSS.escape("tagbox:" + t.text)}"]`).forEach((el) => el.classList.add("faded"));
            ids.forEach((id) => {
              const k = tok(id);
              if (k) k.classList.add("faded");
            });
          });
      });
      // the first beat: the equation is written in, one sign at a time; the beat's other pieces follow.
      // (Unless it glided in from the scene, Level 4's x + 2 = 7 (run's landed): it takes that one's place
      // at once, under it, and that one fades away.)
      let start = 150;
      if (!this.shown && this.landing) {
        const from = this.landing;
        this.landing = null;
        CQ.anim(from, [{ opacity: 1 }, { opacity: 0 }], { duration: 260, essential: true }).then(() => from.remove());
        start = 450;
      } else if (!this.shown) {
        const signs = eqn.querySelectorAll(".tok");
        signs.forEach((t, i) =>
          CQ.anim(t, [{ opacity: 0, translate: "0 14px" }, { opacity: 1, translate: "0 0" }], { duration: 480, delay: 120 + i * 190, easing: CQ.EASE.out, keep: false })
        );
        start = 120 + signs.length * 190 + 300;
      }
      // First the frame goes round the part of the balance the line is about (the rest of it fades);
      // then what is new comes in, one piece at a time (a tag with its line and bracket): words fade
      // in where they stay, and pictures fly over from the balance last. (s.cue.bal: the part lights up
      // on its word instead, with the maths that waits for the same word: x and the crown together.)
      let framed;
      if (s.bal && s.cue && s.cue.bal) {
        framed = this.light(null, before.bal);
        this.onCue(s.cue.bal, sig, () => this.light(s.bal, null));
      } else framed = this.light(s.bal, before.bal);
      if (framed && this.shown) start = Math.max(start, 550);
      const groups = new Map();
      c.querySelectorAll("[data-key]").forEach((el) => {
        const key = el.dataset.key;
        if (before.keys.has(key)) return;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(el);
      });
      const flying = (els) => els.some((el) => el.matches("[data-fly]") || el.querySelector("[data-fly]"));
      // a piece with a cue comes in when the voice says its word (in order, if several share it); a tag
      // with a cue is drawn in then, as tags always are: bracket, line, then its word written in
      const cued = new Map();
      groups.forEach((els, key) => {
        if (!els[0].dataset.cue) return;
        const cue = els[0].dataset.cue;
        if (!cued.has(cue)) cued.set(cue, []);
        cued.get(cue).push([key, els]);
        groups.delete(key);
      });
      cued.forEach((list, cue) => {
        // unseen until then (visibility: a piece's own animation, like the faint 1's blink, can't show it)
        list.forEach(([, els]) => els.forEach((el) => (el.style.visibility = "hidden")));
        this.onCue(cue, sig, () => {
          let n = 0;
          list.forEach(([key, els]) => {
            if (key.startsWith("tag:")) {
              els.forEach((el) => (el.style.visibility = ""));
              CQ.audio.play("ui.pop", { volume: 0.55 });
              this.drawTag(els, 0);
              els.forEach((el) => el.lights && this.lightTag(el.lights));
              return;
            }
            els.forEach((el) => {
              const i = n++;
              setTimeout(() => {
                if (!this.shown || this.shown.sig !== sig) return;
                el.style.visibility = "";
                // a worked-out row pops in; a tag's box is drawn; anything else fades in where it
                // stays, as it does uncued
                if (el.classList.contains("nb-row") || el.classList.contains("x-sub")) CQ.anim(el, [{ opacity: 0, scale: "0.7" }, { opacity: 1, scale: "1.08", offset: 0.7 }, { opacity: 1, scale: "1" }], { duration: 520, easing: CQ.EASE.out, keep: false });
                else if (el.classList.contains("tag-box") || el.classList.contains("grp-outline")) drawBox(el, 0); // a box is drawn
                else CQ.anim(el, [{ opacity: 0, translate: "0 10px" }, { opacity: 1, translate: "0 0" }], { duration: 600, easing: CQ.EASE.out, keep: false });
                if (i === 0) CQ.audio.play("ui.pop", { volume: 0.55 });
                if (el.classList.contains("sol-name") || el.classList.contains("grp-label")) writeIn(el, 150, 45); // its name is written in
              }, i * 450);
            });
          });
        });
      });
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
          if (el.classList.contains("tag-box") || el.classList.contains("grp-outline")) return drawBox(el, at); // a box is drawn
          CQ.anim(el, [{ opacity: 0, translate: "0 10px" }, { opacity: 1, translate: "0 0" }], { duration: 600, delay: at, easing: CQ.EASE.out, keep: false });
          if (el.classList.contains("grp-label")) writeIn(el, at + 150, 45); // a label's word is written in
        });
        at += 500;
      });
      this.shown = { sig, keys, toks, bal: s.bal, rowCls };
      // things a beat does as the voice gets to its words (s.steps: { cue, bal, pans, side, sub, gather,
      // restore, tilt, flash }; a step with no cue happens at once): bal moves the frame to that part of
      // the balance (null: no frame); pans: the left pan glows like the LHS and the right pan like the
      // RHS; side: only that pan's things glow, in its side's colour ("left", "right", null: none); sub:
      // that value is put in for x on the balance (substitute); gather: the coins on the left pan gather
      // into one group; restore: the crown is put back; tilt: the balance tips (or levels) the way its
      // pans now weigh; flash: its hub flashes (level)
      const runStep = (st) => {
        if ("bal" in st) {
          this.light(st.bal, this.shown.bal);
          this.shown.bal = st.bal;
        }
        if (st.pans) CQ.balance.glowSides(true);
        if ("side" in st) ["left", "right"].forEach((sd) => CQ.balance.items[sd].forEach((it) => it.el.classList.toggle(sd === "left" ? "glow-lhs" : "glow-rhs", sd === st.side)));
        if (st.gather) CQ.xPan.gather().catch(() => {});
        if (st.restore) this.restore().catch(() => {});
        if (st.sub != null) this.substitute(st.sub).catch(() => {});
        if (st.tilt) CQ.balance.evaluate();
        if (st.flash) CQ.balance.flashEmblem();
      };
      (s.steps || []).forEach((st) => (st.cue ? this.onCue(st.cue, sig, () => runStep(st)) : runStep(st)));
      return eqn;
    },
    // A value put in for x on the balance, and the crown put back (CQ.xPan, below).
    substitute(v) {
      return CQ.xPan.put(v);
    },
    restore(quick) {
      return CQ.xPan.restore(quick);
    },
    // fn, when the voice of this beat's line gets to str (the question bar types with it), as long as
    // the beat is still on screen; at the latest after 15 s.
    // A label that names a sign lights it as it comes in, in the label's colour, and what it stands for on
    // the balance (Level 4: "Here x is a variable, and 2 is a constant. We add them together." Review,
    // 2026-11-13: "Reveal labels with the VO: Variable → Constant → Addition, highlighting each matching
    // symbol. Highlight the crown for x, then the two coins for 2. +: Highlight the plus sign"). L = { ids,
    // tok: the colour ("var", "const", "op"), pan: panLights' }.
    lightTag(L) {
      const eqn = this.content.querySelector(".eqn");
      L.ids.forEach((id) => {
        const t = eqn && eqn.querySelector(`.tok[data-id="${id}"]`);
        if (t) t.classList.add("lit-" + L.tok);
      });
      if (L.pan) this.panLights(L.pan);
    },
    // The left pan's crown and coins lit with the signs they stand for: "crown" (gold, like x), "coins"
    // (orange, like the constant 2), "both", or null (none).
    panLights(which) {
      CQ.balance.items.left.forEach((it) => {
        it.el.classList.toggle("glow", it.type === "crown" && (which === "crown" || which === "both"));
        it.el.classList.toggle("glow-const", it.type === "coin" && (which === "coins" || which === "both"));
      });
    },
    // One pan's things in its side's colour (left: teal, like the LHS; right: orange, like the RHS).
    sideGlow(side) {
      CQ.balance.items[side].forEach((it) => it.el.classList.add(side === "left" ? "glow-lhs" : "glow-rhs"));
    },
    // fn when the voice gets to str in this beat's line (the question bar types with a recorded voice).
    // A line shown whole (no recording yet, or the voice off) has no letters to follow: then about when a
    // voice would have said it (15 letters a second from the line's start), so a label still comes with
    // its words (review, 2026-11-13: "Reveal Algebraic expression when the VO names it"); at the latest
    // after 15 s.
    onCue(str, sig, fn) {
      const line = this.lineText;
      const at = String(line || "").indexOf(str);
      const guess = at < 0 ? 0 : (at + str.length) * 65;
      const t0 = performance.now();
      const tick = () => {
        if (!this.shown || this.shown.sig !== sig) return;
        const cap = CQ.caption;
        const here = cap.text === line;
        const typedAll = here && !cap.chars && cap.typing === cap.line; // its voice has typed it all
        if ((here && cap.chars && cap.reached(str)) || typedAll || (here && !cap.chars && performance.now() - t0 > guess) || performance.now() - t0 > 15000) return fn();
        setTimeout(tick, 60);
      };
      setTimeout(tick, 60);
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
    // The part of the balance this beat is about glows softly (CQ.frameBalance; the maths stays bright
    // beside it). Returns whether the glow moved to something new.
    light(bal, was) {
      if (bal === "level" && was !== "level") CQ.balance.flashEmblem(); // ("whole": the same frame, no flash)
      if (!bal) {
        if (this.framed) CQ.focus.off();
        this.framed = false;
        return false;
      }
      if (bal !== was || !this.framed) CQ.frameBalance(bal);
      this.framed = true;
      return bal !== was;
    },
    // Where the equation will stand when a run begins (stage px): each sign's middle, and the size of its
    // letters, for an equation gliding in to land on (Level 4's x + 2 = 7). Call it once open() has begun.
    placeOf(lower) {
      this.content.classList.toggle("lower", !!lower);
      const e = CQ.eqTokens(this.content, EQ_X2, "big");
      e.style.visibility = "hidden";
      const at = {};
      e.querySelectorAll(".tok").forEach((t) => {
        const r = t.getBoundingClientRect();
        at[t.dataset.id] = CQ.stage.toStage(r.left + r.width / 2, r.top + r.height / 2);
      });
      const size = parseFloat(getComputedStyle(e).fontSize);
      e.remove();
      return { at, size };
    },
    // Run a list of beats with Next / Back. opts.lower: the equation sits lower on the screen (review,
    // 2026-11-07: "It can be little below"), for the runs with little written under it (the words, the
    // linear equation); trying values fills the screen under it, so that run keeps it higher.
    // opts.landed: an equation on screen that has glided to where this one stands (placeOf), which the
    // first beat takes over instead of writing it in.
    async run(beats, opts) {
      this.content.classList.toggle("lower", !!(opts && opts.lower));
      this.landing = (opts && opts.landed) || null;
      let i = 0;
      while (i < beats.length) {
        const b = beats[i];
        this.lineText = CQ.T(b.id); // what the line says (things can wait for a word of it)
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
    // x and its crown light up together, in the same soft gold, and no little crown stands over x
    // (review, 2026-11-13: "Highlight x and the crown together with a soft gold glow. Remove the extra
    // crown above x to reduce clutter"; s.crown is no longer used on these lines)
    { id: "l4-10", s: { hl: ["x"], bal: "crown" } },
    // a variable, in two lines (review, 2026-11-13: "Split the VO across two screens: 1. 'A variable is a
    // symbol that represents a value.' (Highlight x only. No label.) 2. 'Here, x is the variable. Its value
    // is unknown.' (Keep x highlighted and reveal the Variable label beneath it.)"): x lit, with its crown,
    // on both; the Variable label comes in under x as the voice says "x is the variable" (as it came on
    // "…our variable is x" when this was one line: review, 2026-11-07)
    { id: "l4-11", s: { hl: ["x"], bal: "crown" } },
    { id: "l4-11b", s: { hl: ["x"], bal: "crown", tags: [{ ids: "x", text: "Variable", color: "var", cue: "x is the variable" }] }, gem: "variable" },
    // No box round x + 2, so its labels read clearly; each label comes in as the voice names it (review,
    // 2026-11-07: "We don't need a box around x + 2 so that the labelling becomes clear. Labelling
    // should come synced with VO.")
    // x + 2 lights up together with the crown and the two coins, all in the same soft gold, and no copy
    // of them stands over the equation (review, 2026-11-13: "Highlight x + 2 together with the crown and
    // two coins. Remove the duplicate crown and coins above the equation"; s.mini is no longer used)
    { id: "l4-12", s: { hl: ["x", "plus", "two"], bal: "left" } },
    // each label comes in as the voice names it (variable, constant, addition), lighting its sign in its
    // colour and what it stands for on the balance: the crown for x, then the two coins for 2, then both
    // as "We add them together" is said (review, 2026-11-13)
    {
      id: "l4-13",
      s: {
        tags: [
          { ids: "x", text: "variable", color: "var", cue: "x is a variable", lights: { tok: "var", pan: "crown" } },
          { ids: "plus", text: "addition", color: "op", row: 1, cue: "We add", lights: { tok: "op", pan: "both" } },
          { ids: "two", text: "constant", color: "const", cue: "2 is a constant", lights: { tok: "const", pan: "coins" } },
        ],
      },
      gem: "constant",
    },
    // x + 2 glows with the crown and the two coins all along, as on "Now look at x + 2"; its bracket and
    // the Algebraic expression label come in as the voice names it (review, 2026-11-13: "Highlight x + 2
    // and the crown with two coins together. Keep the bracket under x + 2 only. Reveal Algebraic
    // expression when the VO names it")
    { id: "l4-14", s: { hl: ["x", "plus", "two"], bal: "left", tags: [{ ids: LHS, text: "Algebraic expression", color: "expr", bracket: true, cue: "the algebraic expression" }] }, gem: "expression" },
    // the level beam and = light up together, in gold, as the voice says "equals" (review, 2026-11-13:
    // "Highlight the level beam and = together when the VO says 'equals'"; the whole balance used to
    // glow, and = to pulse, from the start of the line)
    { id: "l4-15", s: { hl: ["eq"], cue: { hl: "equals" }, beam: "equals" } },
    // = lights up as the voice says "equal values"; then, at the end of the line, the whole equation is
    // outlined and its Equation label comes in under it (review, 2026-11-07: "equation should come at the
    // end of the VO"; "it can come below"; 2026-11-13: "Remove the large frame around the balance.
    // Highlight = when the VO says 'equal values.' Then highlight the complete equation and reveal
    // Equation beneath it" — nothing on the balance glows on this line any more)
    { id: "l4-16", s: { hl: ["eq"], outline: true, outlineLabel: "Equation", cue: { hl: "equal values", outline: "an equation." } }, gem: "equation" },
    // As the voice says "the expression to the left of the equals sign", x + 2 turns teal and a box is
    // drawn round it; its label only comes in as the voice names it ("the left-hand side"). The same
    // for 7 and the right-hand side. The = stays outside both boxes. (Review, 2026-11-07: "Please sync
    // the animations with the VO… Keep both labels hidden initially and leave the equal sign outside
    // the boxes.")
    {
      id: "l4-17",
      s: {
        lhs: true,
        cue: { lhs: "to the left" },
        tags: [{ ids: LHS, text: "Left-hand side (LHS)", color: "lhs", box: true, boxCue: "to the left", cue: "the left-hand side" }],
      },
      gem: "lhs",
    },
    {
      id: "l4-18",
      s: {
        lhs: true,
        rhs: true,
        cue: { rhs: "to the right" },
        tags: [
          { ids: LHS, text: "Left-hand side (LHS)", color: "lhs", box: true, fade: "to the right" },
          { ids: "seven", text: "Right-hand side (RHS)", color: "rhs", box: true, row: 1, boxCue: "to the right", cue: "the right-hand side" },
        ],
      },
      gem: "rhs",
    },
  ];
  // Trying values for x, like the PPT's slides 24–26: each side worked out for 4 (they differ, so 4 is
  // not a solution) and for 5 (both sides equal 7, so 5 is the solution). The equation stays at the top
  // all along, like on a board; the working goes under it.
  CQ.NB_TRY = [
    { id: "l4-23", s: { bal: "crown" } },
    // No floating crown over x and no big frame round both pans (review, 2026-11-07): on "a value of x",
    // x and the crown on the left pan light up; on "makes both sides equal", x + 2 and 7 light up
    // together, each with its own pan (teal, orange). The balance is level: the equality we want.
    {
      id: "l4-24",
      s: {
        hl: ["x"],
        lhs: true,
        rhs: true,
        cue: { hl: "a value of x", lhs: "makes both sides", rhs: "makes both sides" },
        steps: [
          { cue: "a value of x", bal: "crown" },
          { cue: "makes both sides", bal: null, pans: true },
        ],
      },
    },
    // Trying 4, then 5 (review, 2026-11-13: "Don't leave 4 + 2 = 7 displayed as true. Show the original
    // x + 2 = 7, then 'Try x = 4' and the calculations below… Reveal sequentially: LHS = 4 + 2 = 6 → RHS = 7
    // → 6 ≠ 7. Tilt the balance as the unequal values appear… Reduce the oversized conclusion to '4 is not
    // a solution.'… Do the same x = 5"). x + 2 = 7 stays as it is at the top, and the working goes under
    // it: "Try x = 4" as the voice says "check 4", and on the balance the crown makes way for four unit
    // coins beside the two there as it says "Replace x with 4" (the balance held level). Then a line for
    // each side: its row comes in on its words, lit in its colour, with its pan's things (the left ones
    // gathering into one group of six as "equals 6" is said), the side before back to plain, in full view
    // ("Keep the previous calculation visible"); then 6 ≠ 7 on
    // "different", the balance tipping (the seven-coin pan lower), and "4 is not a solution." under it,
    // smaller, the try lit with it. The sides' first = signs stand one under the other.
    { id: "l4-25", s: { rows: [{ t: "Try x = 4", cls: "try", cue: "check 4" }], steps: [{ cue: "Replace x with 4", sub: 4 }] } },
    {
      id: "l4-26",
      s: {
        rows: [{ t: "Try x = 4", cls: "try" }, { t: "LHS = 4 + 2 = 6", cls: "side lit lhs", cue: "left-hand side" }],
        steps: [{ sub: 4 }, { side: "left" }, { cue: "equals 6", gather: true }],
      },
    },
    {
      id: "l4-26b",
      s: {
        rows: [{ t: "Try x = 4", cls: "try" }, { t: "LHS = 4 + 2 = 6", cls: "side" }, { t: "RHS = 7", cls: "side lit rhs", cue: "right-hand side" }],
        steps: [{ sub: 4 }, { side: "right" }],
      },
    },
    {
      id: "l4-26c",
      s: {
        rows: [
          { t: "Try x = 4", cls: "try", lit: { cue: "not a solution", cls: "lit-no" } },
          { t: "LHS = 4 + 2 = 6", cls: "side" },
          { t: "RHS = 7", cls: "side" },
          { t: "6 ≠ 7", cls: "big no", cue: "different" },
          { t: "4 is not a solution.", cls: "no verdict", cue: "not a solution" },
        ],
        steps: [{ sub: 4 }, { cue: "different", tilt: true }],
      },
    },
    { id: "l4-27", s: { rows: [{ t: "Try x = 5", cls: "try", cue: "check 5" }], steps: [{ restore: true }, { cue: "Replace x with 5", sub: 5 }] } },
    {
      id: "l4-28",
      s: {
        rows: [{ t: "Try x = 5", cls: "try" }, { t: "LHS = 5 + 2 = 7", cls: "side lit lhs", cue: "left-hand side" }],
        steps: [{ sub: 5 }, { side: "left" }, { cue: "equals 7", gather: true }],
      },
    },
    {
      id: "l4-28b",
      s: {
        rows: [{ t: "Try x = 5", cls: "try" }, { t: "LHS = 5 + 2 = 7", cls: "side" }, { t: "RHS = 7", cls: "side lit rhs", cue: "right-hand side" }],
        steps: [{ sub: 5 }, { side: "right" }],
      },
    },
    {
      id: "l4-28c",
      s: {
        rows: [
          { t: "Try x = 5", cls: "try", lit: { cue: "equal 7", cls: "lit-ok" } },
          { t: "LHS = 5 + 2 = 7", cls: "side" },
          { t: "RHS = 7", cls: "side" },
          { t: "7 = 7", cls: "big ok", cue: "equal 7" },
        ],
        steps: [{ sub: 5 }, { cue: "equal 7", tilt: true, flash: true }],
      },
    },
    {
      id: "l4-29",
      s: {
        rows: [
          { t: "Try x = 5", cls: "try lit-ok" },
          { t: "LHS = 5 + 2 = 7", cls: "side" },
          { t: "RHS = 7", cls: "side" },
          { t: "7 = 7", cls: "big ok" },
          { t: "x = 5", cls: "sol", cue: "So, 5" }, // the 5 comes when the voice says it
          { t: "Solution", cls: "sol-name", cue: "So, 5" },
        ],
        steps: [{ sub: 5 }],
      },
      gem: "solution",
    },
  ];

  // The linear equation is shown in the equation itself, in step with the voice, with no labels
  // (review, 2026-11-07: "use labels only when naming specific parts… sync animations and highlights
  // directly within the equation with the VO… Remove the separate 'x means x¹' label"): x lights up as
  // "one variable" is said; a 1 comes on x (x¹) as "its power is 1" is said, and fades as "we usually
  // leave the 1 unwritten"; it comes back for "its highest power is 1"; and a box is drawn round the
  // whole equation as "a linear equation" is said.
  // After the label activity (review, 2026-11-13): "Let's return to the crown's equation." as x + 2 = 7
  // is written in again, the balance at the left; then x and the crown light up together, on "one
  // variable" (same review: "Highlight lowercase x and the crown together"; the crown used to light as
  // the line began, x only on its word).
  CQ.NB_LINEAR = [
    { id: "l4-19a", s: {} },
    { id: "l4-19", s: { hl: ["x"], bal: "crown", cue: { hl: "one variable", bal: "one variable" } } },
    // x's power, in two lines, with nothing on the balance lit (review, 2026-11-13: "Split it into two
    // screens… Remove the extra crown icon and crown highlight. The focus here is the power, so keep the
    // balance visible without highlighting it"): the 1 comes in at the top right of x, lit, as "is 1" is
    // said, x itself plain; then it fades as "unwritten" is said, leaving x.
    { id: "l4-20", s: { power: { in: "is 1" } } },
    { id: "l4-20b", s: { power: { in: "is 1", out: "unwritten" } } },
    // x lights up on "one variable", then only the 1 on "highest power", x going back to plain (same
    // review: "Highlight x for 'one variable,' then only the superscript 1 for 'highest power'")
    { id: "l4-21", s: { hl: ["x"], power: { in: "highest power" }, cue: { hl: "one variable", hlOut: "highest power" } } },
    // its name comes in under the whole equation, on a bracket, as it is said; no box round the equation
    // and nothing lit on the balance (same review: "Follow with: 'This is called a linear equation in one
    // variable.' Reveal that label beneath the equation when spoken", "Remove the large frame around the
    // balance and the dashed equation box"). The 1 fades as the line begins.
    {
      id: "l4-22",
      s: { power: { in: "highest power", out: "This is" }, tags: [{ ids: EQ_X2.map((t) => t.id), text: "Linear equation in one variable", color: "lin", bracket: true, cue: "a linear equation" }] },
      gem: "linear",
    },
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
  // equation"). w: how thick it is.
  function leadLine(d, x, y0, y1, cls, w) {
    w = w || 4;
    const e = CQ.el("div", "lead " + (y1 > y0 ? "down " : "up ") + (cls || ""), d);
    CQ.box(e, x - w / 2, Math.min(y0, y1), w, Math.abs(y1 - y0));
    CQ.el("div", "lead-fill", e);
    CQ.el("div", "lead-dot", e);
    return e;
  }

  // The balance fades out (op 0: the label activity is about another equation) and back in (op 1).
  CQ.balanceTo = function (op, ms) {
    const l = CQ.world.balanceLayer;
    const from = parseFloat(getComputedStyle(l).opacity);
    l.style.opacity = op >= 1 ? "" : String(op);
    if (from === op) return Promise.resolve();
    return CQ.anim(l, [{ opacity: from }, { opacity: op }], { duration: ms || 600, easing: "ease", keep: false, essential: true });
  };

  // ------------------------------------------------------------------ shared board for activities
  // opts.still: the board doesn't grow in (its content comes in by itself: the label activity)
  function board(cls, opts) {
    const wrap = CQ.el("div", "activity " + cls, CQ.ui.overlay);
    CQ.el("div", "nb-dim", wrap);
    CQ.soft.set("activity", []); // the scene blurs behind the activity
    const b = CQ.el("div", "board", wrap);
    CQ.anim(wrap, [{ opacity: 0 }, { opacity: 1 }], { duration: 420, essential: true });
    if (!(opts && opts.still)) CQ.anim(b, [{ transform: "scale(.9)", opacity: 0 }, { transform: "scale(1)", opacity: 1 }], { duration: 600, easing: CQ.EASE.out, essential: true });
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
    if (!CQ.notebook.isOpen) CQ.zippy.setVisible(true); // still under the dark: he is simply there as it lifts (not over a formula screen kept under it)
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
    const nb = CQ.notebook;
    // Straight on from Level 4's formula screen (handed over as it was: js/flow.js, handOver), or from the
    // menu, over the scene. Where the formula screen's equation stands, for the new one to come in there.
    const formula = nb.isOpen ? nb.content.querySelector(".eqn") : null;
    const fromAt = formula ? CQ.centerOf(formula) : null;
    const fromSize = formula ? parseFloat(getComputedStyle(formula).fontSize) : 0;
    // No Next until every label is in: the child does this one (review, 2026-11-13: "Show Next after
    // both labels are correctly placed")
    CQ.next.showNext(false);
    // "Now, can you spot these parts in another equation?": the balance fades out, and x + 2 = 7 with it,
    // and 4x + 3 = 19 comes in where it stood and glides to the middle; then the activity comes in round
    // it (review, 2026-11-13: "Fade out the balance and bring 4x + 3 = 19 to the centre. Then reveal the
    // activity").
    const bridge = CQ.say("", { text: c.bridge, advance: "auto", pause: 200 });
    CQ.balanceTo(0, 900);
    if (formula) CQ.anim(nb.stage, [{ opacity: 1 }, { opacity: 0 }], { duration: 500, essential: true });
    const wrap = board("label-act", { still: true });
    const b = wrap.board;
    // (no heading on the board: the question bar says what to do; review, 2026-11-07)
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
    const tok = (id) => eqn.querySelector(`.tok[data-id="${id}"]`);
    const ra = R(all);
    const rl = R(["four", "x", "plus", "three"]);
    const rr = R(["r"]);
    const xInk = inkX(tok("x"));
    const eqInk = inkX(tok("eq"));
    const xMid = (xInk.x0 + xInk.x1) / 2; // the middle of the x itself (not of 4x)
    const xTop = inkTop(tok("x")); // the top of the x itself
    const eqTop = CQ.stage.toStage(0, eqn.getBoundingClientRect().top).y; // the equation's top, on the stage
    // Each box sits right over or under the part it names, joined to it by one straight line that ends
    // in a dot on the part (review, 2026-11-07: the faint grey brackets ran together, so it was hard to
    // tell which box points to what):
    //   Variable: right over x, its line straight down to the top of the x itself, crossing nothing
    //   (review, 2026-11-13: "It should point directly to lowercase x, not 4x");
    //   Equation: one bracket under the whole of 4x + 3 = 19, its line down to its box under the middle,
    //   so it never meets the Variable line (same review: "Keep the Equation bracket spanning the complete
    //   equation. Separate its connector from the variable pointer so they do not intersect"; it was a
    //   bracket over the equation, which the Variable line went through);
    //   LHS, RHS: under their own brackets, under 4x + 3 and under 19; the = is outside both brackets.
    //   As they come in (the second pair), the Equation bracket, line, box and label glide down (DROP),
    //   under them and out of their way.
    // (Equation coordinates.)
    const under = ra.y + ra.h; // the equation's foot
    const L1 = under + 6; // the brackets right under it
    const DROP = 170;
    const brace = (x0, x1, y, up, cls) => {
      const e = CQ.el("div", "brace " + (up ? "up " : "down ") + cls, d);
      CQ.box(e, x0, y, x1 - x0, 30);
      return e;
    };
    const braces = {
      Equation: brace(ra.x - 12, ra.x + ra.w + 12, L1, false, "c-eq"),
      LHS: brace(rl.x - 10, Math.min(rl.x + rl.w + 10, eqInk.x0 - 16), L1, false, "c-lhs"),
      RHS: brace(Math.max(rr.x - 10, eqInk.x1 + 16), rr.x + rr.w + 10, L1, false, "c-rhs"),
    };
    const COLOR = { Variable: "c-var", Equation: "c-eq", LHS: "c-lhs", RHS: "c-rhs" };
    // boxes (targets), positioned in equation coordinates; a box takes a label once it has come in
    const targets = [];
    const mk = (answer, x, y) => {
      const t = CQ.el("button", "drop-box " + COLOR[answer], d);
      t.type = "button";
      t.setAttribute("aria-label", "Empty label box");
      CQ.pos(t, x, y);
      t.answer = answer;
      t.ready = false;
      t.addEventListener("click", () => ctl.tapTarget(t));
      targets.push(t);
      return t;
    };
    const topY = ra.y - 110;
    const botY = under + 110;
    const half = 48; // half a box's height, with its border
    mk("Variable", xMid, topY);
    mk("Equation", ra.cx, botY);
    mk("LHS", rl.cx, botY);
    mk("RHS", rr.cx, botY);
    const LW = 6; // the lines' thickness
    const leads = {
      Variable: leadLine(d, xMid, topY + half, xTop - 10, "c-var", LW), // straight down onto x
      Equation: leadLine(d, ra.cx, botY - half, L1 + 27, "c-eq", LW),
      LHS: leadLine(d, rl.cx, botY - half, L1 + 27, "c-lhs", LW),
      RHS: leadLine(d, rr.cx, botY - half, L1 + 27, "c-rhs", LW),
    };
    // the labels to drag lie just under the boxes (review, 2026-11-13: "Bring the draggable labels closer
    // to the equation"): the first pair's under the Equation box, the second pair's under it once it has
    // glided down (stage coordinates)
    const ROWS = [eqTop + botY + half + 82, eqTop + botY + DROP + half + 82];
    // the numbers each box names light up in its colour (Equation: its bracket round all of them)
    const parts = { Variable: ["x"], LHS: ["four", "x", "plus", "three"], RHS: ["r"], Equation: [] };
    const colors = { Variable: "var", LHS: "lhs", RHS: "rhs" };
    // Variable and Equation first, then LHS and RHS, on the same board (review, 2026-11-07: fewer lines
    // to make sense of at once). Each pair's labels lie in the tray in another order than their boxes.
    const PAIRS = [
      ["Variable", "Equation"],
      ["LHS", "RHS"],
    ];
    const TRAY = [
      ["Equation", "Variable"],
      ["RHS", "LHS"],
    ];

    let selected = null;
    let pair = 0; // the pair being labelled (0: Variable and Equation, 1: LHS and RHS)
    const ask = [c.title, c.pair2]; // each pair's instruction in the question bar
    const fixed = [false, false]; // a pair put in for the child, after a wrong label
    // each pair is in (put in by the child, or for the child after a wrong label): what comes next waits
    const pairDone = [];
    const pairIn = PAIRS.map((p, k) => new Promise((r) => (pairDone[k] = r)));
    let bringing = Promise.resolve(); // a pair's boxes and labels coming in
    const chips = [];
    const target = (name) => targets.find((t) => t.answer === name);
    // A label goes into its box: it settles in the middle as a word in its colour, the box's border turns
    // green, the colour runs down its line, and then its part lights up.
    const place = (el, t) => {
      el.placed = true;
      t.done = true;
      el.classList.remove("glow", "selected", "dragging");
      el.classList.add("placed", COLOR[t.answer]);
      const tc = rectOf(t);
      CQ.pos(el, (tc.x0 + tc.x1) / 2, (tc.y0 + tc.y1) / 2);
      t.classList.add("ok");
      t.setAttribute("aria-label", t.answer);
      leads[t.answer].classList.add("on");
      setTimeout(() => {
        if (braces[t.answer]) braces[t.answer].classList.add("on");
        parts[t.answer].forEach((id) => tok(id).classList.add("glow-" + colors[t.answer]));
      }, 420);
      return tc;
    };
    const ctl = {
      busy: false, // while a pair is put in for the child: hands off
      hover(p) {
        targets.forEach((t) => t.classList.toggle("hover", t.ready && !t.done && inRect(p, rectOf(t, 30))));
      },
      targetAt(p) {
        return targets.find((t) => t.ready && !t.done && inRect(p, rectOf(t, 40)));
      },
      select(el) {
        if (this.busy) return;
        chips.forEach((ch) => ch.classList.toggle("selected", ch === el && !ch.placed));
        selected = el.placed ? null : el;
        CQ.audio.play("ui.pop");
      },
      tapTarget(t) {
        if (selected && t.ready && !t.done && !this.busy) {
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
      drop(el, t) {
        if (el.label === t.answer) {
          const tc = place(el, t);
          // A right label gets a short success sound and its box's border turns green (styles.css), and
          // nothing is said or written: the question bar keeps the instruction (review, 2026-11-07: "For
          // correct responses, remove the spoken and written feedback… Keep the instruction panel
          // unchanged").
          CQ.audio.play("correct");
          CQ.fx.sparkle(CQ.ui.layer, (tc.x0 + tc.x1) / 2, (tc.y0 + tc.y1) / 2, 8, 70);
          CQ.track("answer", { activity: "label", box: t.answer, choice: el.label, correct: true });
          if (CQ.caption.text !== ask[pair]) CQ.say("", { text: ask[pair], advance: "none", quiet: true });
          // the pair is in: Next is back at once, then a moment to see it go in (lookThenOn)
          if (PAIRS[pair].every((name) => target(name).done)) pairDone[pair]();
        } else {
          CQ.track("answer", { activity: "label", box: t.answer, choice: el.label, correct: false });
          putIn(el).catch(() => {}); // (cancelled: the quest went on elsewhere meanwhile)
        }
      },
    };
    // When the voice of a line (sp = { line, said }) gets to str: the question bar types with a recorded
    // voice; a line with no recording yet is shown whole, so about when a voice would get there, 15
    // letters a second from when the line came on (as the formula screen's cues). Or when the line is over
    // (skipped with → or Next); at the latest after 15 s.
    const cueIn = (sp, str) =>
      CQ.run.when(
        Promise.race([
          sp.said,
          new Promise((res) => {
            const at = sp.line.indexOf(str);
            const guess = at < 0 ? 0 : (at + str.length) * 65;
            const w0 = performance.now();
            const tick = () => {
              const cap = CQ.caption;
              const here = cap.text === sp.line;
              if (here && sp.on == null) sp.on = performance.now(); // (the line came on)
              const typedAll = here && !cap.chars && cap.typing === cap.line;
              if ((here && cap.chars && cap.reached(str)) || typedAll || (here && !cap.chars && performance.now() - sp.on > guess) || performance.now() - w0 > 15000) return res();
              setTimeout(tick, 60);
            };
            tick();
          }),
        ])
      );
    // The game takes a label to its box: it lifts off its place under the boxes, glides over and settles
    // in. Variable's box is over the equation: it rises first, then goes across, so it never covers the x
    // it is about (lit meanwhile).
    const glideIn = (el, t) => {
      const a = { x: parseFloat(el.style.left), y: parseFloat(el.style.top) };
      const r = rectOf(t);
      const z = { x: (r.x0 + r.x1) / 2, y: (r.y0 + r.y1) / 2 };
      const m = t.answer === "Variable" ? { x: a.x, y: z.y } : { x: (a.x + z.x) / 2, y: (a.y + z.y) / 2 }; // (the curve's pull)
      const q = (k, p0, p1, p2) => (1 - k) * (1 - k) * p0 + 2 * k * (1 - k) * p1 + k * k * p2;
      el.classList.add("dragging"); // (lifted, over everything)
      CQ.audio.play("bar.pick");
      return CQ.run.when(CQ.tween(850, (k) => CQ.pos(el, q(k, a.x, m.x, z.x), q(k, a.y, m.y, z.y)), CQ.ease.inOut));
    };
    // A part stops glowing: from its glow, softly, to how it stays.
    const unlook = (ids, cls) =>
      ids.forEach((id) => {
        const e = tok(id);
        const from = getComputedStyle(e).textShadow;
        e.classList.remove(cls);
        const to = getComputedStyle(e).textShadow;
        if (from !== to) CQ.anim(e, [{ textShadow: from }, { textShadow: to }], { duration: 600, easing: "ease-out", keep: false });
      });
    // A wrong label in a box (review, 2026-11-13): it shakes where it was put and goes back to its place;
    // then the pair's labels are put in for the child, one after the other, each with its line from
    // c.miss. As the line gets to the part, the part lights up in the label's colour (x, and only x, in
    // gold; the whole statement with a green glow; 4x + 3; 19), and as it says what the part is, the label
    // glides up into its box. A wrong label in one box of a pair is always the other box's, so the two are
    // put in. Then Next is back.
    const putIn = async (wrong) => {
      const k = pair;
      fixed[k] = true;
      ctl.busy = true;
      selected = null;
      chips.forEach((ch) => ch.classList.remove("selected"));
      CQ.idle.disarm();
      CQ.hand.stop();
      CQ.audio.play("tryagain");
      const shake = ["0px", "-14px", "12px", "-9px", "6px", "-3px", "0px"].map((x) => ({ translate: x + " 0px" }));
      await CQ.run.when(CQ.anim(wrong, shake, { duration: 520, easing: "ease-in-out", keep: false, essential: true }));
      wrong.from = { x: parseFloat(wrong.style.left), y: parseFloat(wrong.style.top) };
      CQ.audio.play("bar.return");
      await CQ.run.when(wrong.goHome());
      await CQ.run.when(bringing); // (both labels of the pair are under the boxes)
      for (const name of PAIRS[k]) {
        const t = target(name);
        const ch = chips.find((x) => x.label === name && !x.placed);
        if (!ch || t.done) continue;
        const last = PAIRS[k].every((n) => n === name || target(n).done);
        const line = c.miss[name];
        const cue = c.missCue[name];
        const sp = { line, said: CQ.say("", { text: line, advance: last ? "hold" : "auto", pause: 300 }) };
        await cueIn(sp, cue.look);
        const ids = name === "Equation" ? all : parts[name];
        const cls = "look-" + (colors[name] || "eq");
        ids.forEach((id) => tok(id).classList.add(cls));
        await cueIn(sp, cue.go);
        await glideIn(ch, t);
        place(ch, t);
        CQ.audio.play("ui.pop");
        setTimeout(() => unlook(ids, cls), 1100); // (its own light is on by then)
        if (last) CQ.next.showNext(true); // the correction is complete: Next is back (review, 2026-11-13)
        await CQ.run.when(sp.said);
      }
      ctl.busy = false;
      pairDone[k]();
    };
    // A pair's boxes come in one at a time, the way they would be drawn (its bracket, the line drawn out
    // from its part, the empty box), each as its line names it when cues are given ({ sp, LHS, RHS });
    // then the pair's labels into the tray, one by one.
    const bringIn = async (k, cues) => {
      for (const name of PAIRS[k]) {
        const t = targets.find((x) => x.answer === name);
        if (cues) await cueIn(cues.sp, cues[name]);
        if (braces[name]) await comeIn(braces[name], "rise", 320);
        await comeIn(leads[name], "line", 420);
        await comeIn(t, "pop", 300);
        t.ready = true;
        await CQ.run.wait(120);
      }
      for (const [i, label] of TRAY[k].entries()) {
        const el = CQ.el("div", "label-chip", wrap, label);
        el.label = label;
        el.setAttribute("role", "button");
        el.setAttribute("aria-label", label);
        makeChip(el, { x: 840 + i * 240, y: ROWS[k] }, ctl);
        chips.push(el);
        hideAll([el]);
        comeIn(el, "rise", 360);
        await CQ.run.wait(180);
      }
    };
    // A pair that is done fades back, so the next one stands out (review, 2026-11-13: "Fade the completed
    // Variable and Equation labels and remove the yellow x highlight"): its boxes and labels, lines and
    // bracket, and its part is no longer lit (x).
    const settle = (names) =>
      names.forEach((name) => {
        [target(name), leads[name], braces[name], chips.find((ch) => ch.label === name)].forEach((el) => el && el.classList.add("settled"));
        parts[name].forEach((id) => tok(id).classList.remove("glow-" + colors[name]));
      });
    // Room for LHS and RHS under the equation: the Equation bracket, line, box and its label glide down,
    // under where they will go.
    const makeRoom = () => {
      const set = [braces.Equation, leads.Equation, targets.find((t) => t.answer === "Equation"), chips.find((ch) => ch.label === "Equation")];
      CQ.audio.play("ui.swoosh", { volume: 0.5 });
      return Promise.all(set.map((el) => el && CQ.anim(el, [{ translate: "0px 0px" }, { translate: `0px ${DROP}px` }], { duration: 700, easing: CQ.EASE.inOut, essential: true })));
    };
    // The hand shows how: it takes a label from the tray to its box, holding it by its right end, so it
    // never covers the part the box names (review, 2026-11-07: it covered x).
    const showHow = (ch) => {
      const t = targets.find((x) => x.answer === ch.label);
      if (!t) return;
      const grip = { x: 92, y: 14 }; // the fingertip, from the label's middle
      const a = CQ.centerOf(ch);
      const z = CQ.centerOf(t);
      CQ.hand.drag({ x: a.x + grip.x, y: a.y + grip.y }, { x: z.x + grip.x, y: z.y + grip.y }, 1, {
        carry: () => {
          const w = CQ.el("div", "hand-carry");
          CQ.el("div", "label-chip carried", w, ch.label);
          return w;
        },
        carryAt: { x: -grip.x, y: -grip.y },
      });
    };
    // Next is back once a pair is in (review, 2026-11-13: "Show Next after both labels are correctly
    // placed"; after a wrong label, "Show Next once the correction is complete"): a moment to look, then
    // the activity goes on by itself, or at once on Next (or →).
    const lookThenOn = async (ms) => {
      CQ.next.showNext(true);
      if (!(ms > 0)) return;
      const skip = CQ.next.listen();
      try {
        await CQ.run.when(Promise.race([skip.promise, CQ.run.hold(ms)]));
      } finally {
        CQ.next.unlisten(skip.id);
      }
    };
    // the hand shows how again when nothing happens for a while (not while a pair is put in)
    const hint = () => {
      const ch = chips.find((x) => !x.placed);
      if (ch && !ctl.busy) showHow(ch);
    };
    hideAll([...Object.values(braces), ...Object.values(leads), ...targets]);
    // The equation comes in: from where x + 2 = 7 stood, at its size, as that one fades, and glides to its
    // place in the middle; from the menu, it rises in at its place.
    if (fromAt) {
      const cur = CQ.centerOf(eqn);
      const from = { translate: `${fromAt.x - cur.x}px ${fromAt.y - cur.y}px`, scale: String(fromSize / parseFloat(getComputedStyle(eqn).fontSize)) };
      eqn.style.transformOrigin = "0 50%"; // (its middle, after its own -50% shift: it grows and shrinks about it)
      Object.assign(eqn.style, from);
      await CQ.run.wait(700);
      await CQ.run.when(CQ.anim(eqn, [from, { translate: "0px 0px", scale: "1" }], { duration: 1000, easing: CQ.EASE.inOut, essential: true }));
    } else {
      hideAll([eqn]);
      await CQ.run.wait(400);
      comeIn(eqn, "rise", 600);
    }
    await bridge;
    if (formula) nb.blank(); // (the formula screen under the activity is left empty, to write afresh after it)
    const said = CQ.say("", { text: c.title, advance: "auto", pause: 100 });
    await CQ.run.wait(350);
    bringing = bringIn(0);
    await bringing;
    await said;
    const first = chips.find((ch) => ch.label === "Variable" && !ch.placed);
    if (first && !ctl.busy) showHow(first);
    CQ.idle.arm(hint, 9000);
    await CQ.run.when(pairIn[0]);
    CQ.idle.disarm();
    CQ.hand.stop();
    await lookThenOn(fixed[0] ? 1200 : 2300); // (after a wrong label, its line had a look already)
    // LHS and RHS: the child's turn again, so no Next until they are in. "Now, label the left-hand side
    // and right-hand side." (it stays in the question bar as this pair's instruction): as it begins,
    // Variable and Equation fade back and x is no longer lit, and the Equation bracket, line, box and
    // label glide down out of the way; the LHS box comes in as the line gets to "the left…", the RHS box
    // on "…and right…", then their labels (review, 2026-11-13).
    CQ.next.showNext(false);
    pair = 1;
    const sp = { line: c.pair2, said: CQ.say("", { text: c.pair2, advance: "auto", pause: 100 }) };
    settle(PAIRS[0]);
    await CQ.run.when(makeRoom());
    bringing = bringIn(1, Object.assign({ sp }, c.pair2Cue));
    await bringing;
    await CQ.run.when(sp.said);
    CQ.idle.arm(hint, 9000);
    await CQ.run.when(pairIn[1]);
    CQ.idle.disarm();
    CQ.hand.stop();
    // every label is in: Next comes back, and a moment to see the last one go in; praise only when the
    // child put every label in themselves
    await lookThenOn(fixed[1] ? 800 : 1100);
    if (!fixed[0] && !fixed[1]) await CQ.say("", { text: c.done });
    else if (!fixed[1]) await lookThenOn(1200);
    closeBoard(wrap, 900, 550); // the formula screen comes in as the board fades (runL4c): the dark never lifts in between
  };

  // ------------------------------------------------------------------ Activity: sort linear / nonlinear
  CQ.activitySort = async function () {
    const c = C().sort;
    const wrap = board("sort-act");
    // Three panels across the screen (review, 2026-11-07): Linear equations at the left, the six
    // equation cards stacked in a narrower tray in the middle, Nonlinear equations at the right, the two
    // equal in size. Each category panel has three placeholders, so the sorted cards line up neatly; a
    // card taken out of the tray leaves its placeholder there. (Stage coordinates.)
    const TOP = 200;
    const H = 780;
    const PANEL_W = 560;
    const TRAY_W = 400;
    const GAP = 50;
    const CARD = { w: 330, h: 100 };
    const X = { linear: 960 - TRAY_W / 2 - GAP - PANEL_W, tray: 960 - TRAY_W / 2, nonlinear: 960 + TRAY_W / 2 + GAP };
    const at = (cls, x, y, w, h) => {
      const e = CQ.el("div", cls, wrap);
      CQ.box(e, x, y, w, h);
      return e;
    };
    // a placeholder round a card's place (its middle at p)
    const slotAt = (cls, p) => {
      const e = at("card-slot" + (cls ? " " + cls : ""), p.x - CARD.w / 2 - 8, p.y - CARD.h / 2 - 8, CARD.w + 16, CARD.h + 16);
      e.at = p;
      return e;
    };
    const bins = {};
    [
      ["linear", c.linear, "lhs"],
      ["nonlinear", c.nonlinear, "rhs"],
    ].forEach(([k, label, color]) => {
      const bin = CQ.el("button", "bin " + color, wrap);
      CQ.box(bin, X[k], TOP, PANEL_W, H);
      bin.type = "button";
      CQ.el("div", "bin-head", bin, label);
      bin.kind = k;
      bin.setAttribute("aria-label", label);
      bin.addEventListener("click", () => ctl.tapTarget(bin));
      // three placeholders, one under another, under the heading
      const room = (H - 110) / 3;
      bin.slots = [0, 1, 2].map((j) => slotAt(color, { x: X[k] + PANEL_W / 2, y: TOP + 90 + room * (j + 0.5) }));
      bin.used = 0;
      bins[k] = bin;
    });
    const tray = at("sort-tray", X.tray, TOP, TRAY_W, H);
    const pitch = H / 6;
    const traySlots = [0, 1, 2, 3, 4, 5].map((i) => slotAt("", { x: 960, y: TOP + pitch * (i + 0.5) }));
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
          // Right: it snaps into the panel's next placeholder with a short success sound, and nothing is
          // said or written: the question bar keeps the instruction (review, 2026-11-07; as in the label
          // activity). After a hint it goes back to the instruction, shown, not said again.
          const slot = bin.slots[bin.used++];
          el.placed = true;
          el.classList.add("placed", right === "linear" ? "lin" : "nonlin");
          el.classList.remove("glow", "selected");
          if (right === "nonlinear") el.classList.add("show-2"); // its power 2 turns orange
          const from = el.from && el.from !== el.home ? el.from : { x: parseFloat(el.style.left), y: parseFloat(el.style.top) };
          CQ.tween(260, (k) => CQ.pos(el, CQ.lerp(from.x, slot.at.x, k), CQ.lerp(from.y, slot.at.y, k)), CQ.ease.out);
          slot.classList.add("filled");
          CQ.audio.play("correct");
          CQ.fx.sparkle(CQ.ui.layer, slot.at.x, slot.at.y, 8, 90);
          CQ.track("answer", { activity: "sort", card: el.card.eq, choice: bin.kind, correct: true });
          if (CQ.caption.text !== c.title) CQ.say("", { text: c.title, advance: "none", quiet: true });
          placed++;
          if (placed === cards.length) CQ.run.wait(1100).then(finish, () => {}); // a moment to see it go in
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
      makeChip(el, traySlots[i].at, ctl);
      cards.push(el);
    });
    // The hand shows how: it takes a card from the tray to its panel's placeholder, holding it by its
    // right end, so the equation stays in sight.
    const showHow = (cd) => {
      const bin = bins[cd.card.linear ? "linear" : "nonlinear"];
      const slot = bin.slots[bin.used];
      if (!slot) return;
      const grip = { x: 120, y: 16 };
      const a = CQ.centerOf(cd);
      CQ.hand.drag({ x: a.x + grip.x, y: a.y + grip.y }, { x: slot.at.x + grip.x, y: slot.at.y + grip.y }, 1, {
        carry: () => {
          const w = CQ.el("div", "hand-carry");
          CQ.el("div", "eq-card carried", w, cd.innerHTML);
          return w;
        },
        carryAt: { x: -grip.x, y: -grip.y },
      });
    };
    // One at a time, while the line is said: each panel, with its name written in, and its
    // placeholders; then the tray, and its cards one by one.
    const allSlots = [...bins.linear.slots, ...bins.nonlinear.slots, ...traySlots];
    hideAll([bins.linear, bins.nonlinear, tray, ...allSlots, ...cards]);
    const said = CQ.say("", { text: c.title, advance: "auto", pause: 100 });
    await CQ.run.wait(300);
    for (const bin of [bins.linear, bins.nonlinear]) {
      comeIn(bin, "pop", 360);
      await CQ.run.wait(writeIn(bin.querySelector(".bin-head"), 300, 45) + 100);
      for (const sl of bin.slots) {
        comeIn(sl, "rise", 300);
        await CQ.run.wait(120);
      }
    }
    comeIn(tray, "rise", 360);
    traySlots.forEach((sl) => comeIn(sl, "rise", 300));
    await CQ.run.wait(250);
    for (const cd of cards) {
      comeIn(cd, "rise", 360);
      await CQ.run.wait(160);
    }
    await said;
    showHow(cards[0]);
    CQ.idle.arm(() => {
      const cd = cards.find((x) => !x.placed);
      if (cd) showHow(cd);
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
    // What a label's part does when the label comes in: only that part is lit, each in its own way
    // (review, 2026-11-13): x glows gold ("Variable: Highlight lowercase x"); then x goes back to plain
    // and the whole equation glows green ("Equation: Remove the yellow x highlight. Highlight the full
    // equation"); then all of x + 4 is teal, x too ("highlight the whole x + 4 uniformly in teal,
    // including x"); then x + 4 fades to a pale teal and only 9 is orange ("RHS: Fade the LHS highlight.
    // Highlight only 9"). (The labels before it fade back meanwhile: activityRecap.)
    const tk = (id) => eqn.querySelector(`.tok[data-id="${id}"]`);
    const ALL = RECAP_EQ.map((t) => t.id);
    const LEFT = ["x", "plus", "four"];
    if (show.includes("variable")) {
      const t = tag("c-var", labels.variable, rx.cx, above);
      parts.push({ name: "variable", lead: line(rx.cx, above, rx.y - 4, "c-var" + (show.includes("equation") ? " hop" : "")), tag: t, light: () => tk("x").classList.add("glow-var") });
    }
    if (show.includes("equation")) {
      const br = brace(all, true, "c-eq");
      const xe = show.includes("variable") ? Math.max(all.cx + 70, rx.cx + 170) : all.cx;
      const t = tag("c-eq", labels.equation, xe, above);
      const light = () => {
        tk("x").classList.remove("glow-var");
        ALL.forEach((id) => tk(id).classList.add("look-eq"));
      };
      parts.push({ name: "equation", brace: br, lead: line(xe, above, all.y - 19, "c-eq"), tag: t, light });
    }
    const below = (r) => r.y + r.h + 36; // the top of a label under the equation
    if (show.includes("lhs") || show.includes("rhs")) eqn.closest(".rc-panel").classList.add("labels-below"); // a little higher, clear of the words
    if (show.includes("lhs")) {
      const br = brace(rl, false, "c-lhs");
      const t = tag("c-lhs", labels.lhs, rl.cx, below(rl), true);
      const light = () => {
        ALL.forEach((id) => tk(id).classList.remove("look-eq", "glow-var"));
        LEFT.forEach((id) => tk(id).classList.add("glow-lhs"));
      };
      parts.push({ name: "lhs", brace: br, lead: line(rl.cx, below(rl), rl.y + rl.h + 19, "c-lhs"), tag: t, light });
    }
    if (show.includes("rhs")) {
      const br = brace(rr, false, "c-rhs");
      const t = tag("c-rhs", labels.rhs, rr.cx, below(rr), true);
      const light = () => {
        LEFT.forEach((id) => tk(id).classList.add("faded"));
        tk("nine").classList.add("glow-rhs");
      };
      parts.push({ name: "rhs", brace: br, lead: line(rr.cx, below(rr), rr.y + rr.h + 19, "c-rhs"), tag: t, light });
    }
    parts.forEach((p) => [p.brace, p.lead, p.tag].forEach((e) => e && (e.style.opacity = "0")));
    return parts;
  }
  // Where a token's sign is actually drawn (its ink, not its padded box), across, in equation
  // coordinates: { x0, x1 }. An x is measured in its own face, where it stands in its token (its italic
  // leans out past its box: measured in the token's face, the ink of Swifty Math's x came out 25 px
  // short, and the 1 of x¹ sat on its arm).
  function inkX(t) {
    const v = t.querySelector ? t.querySelector(".v") : null;
    const e = v || t;
    const cs = getComputedStyle(e);
    const ctx = (inkX.ctx = inkX.ctx || document.createElement("canvas").getContext("2d"));
    ctx.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
    const m = ctx.measureText(e.textContent);
    const left = e === t || e.offsetParent === t.offsetParent ? e.offsetLeft : t.offsetLeft + e.offsetLeft;
    const start = left + parseFloat(cs.paddingLeft) + parseFloat(cs.borderLeftWidth);
    return { x0: start - m.actualBoundingBoxLeft, x1: start + m.actualBoundingBoxRight };
  }
  // Where a token's sign starts at the top (the top of its ink), down from the top of its equation: its
  // baseline (found with a probe), less how far the glyph stands above it (an x in its own face).
  function inkTop(t) {
    const v = t.querySelector(".v") || t;
    const eqn = t.closest(".eqn");
    const probe = document.createElement("span");
    probe.style.cssText = "display:inline-block;width:0;height:0;vertical-align:baseline";
    v.appendChild(probe);
    const k = eqn.offsetHeight ? eqn.getBoundingClientRect().height / eqn.offsetHeight : 1;
    const base = (probe.getBoundingClientRect().top - eqn.getBoundingClientRect().top) / k;
    probe.remove();
    const cs = getComputedStyle(v);
    const ctx = (inkX.ctx = inkX.ctx || document.createElement("canvas").getContext("2d"));
    ctx.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
    return base - ctx.measureText(v.textContent).actualBoundingBoxAscent;
  }
  // A box is drawn round its part, from left to right, from `at` ms (hidden until then).
  function drawBox(el, at) {
    return CQ.anim(el, [{ clipPath: "inset(-16px 100% -16px -16px)" }, { clipPath: "inset(-16px -16px -16px -16px)" }], { duration: 560, delay: at || 0, easing: CQ.EASE.out, keep: false });
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
    // One equation, x + 4 = 9, large and centred, and the summary built up on it with the voice (review,
    // 2026-11-07: "avoid repeating the same equation in four sections. Use one large, centred x + 4 = 9
    // and build the summary progressively with the VO… At the end, retain the single equation with all
    // four labels clearly spaced"). Each definition is only in the question bar, while its part comes
    // in; there are no number badges and no sentences under the equation. No title on screen: the
    // narrator says it (asked 2026-11-05).
    const card = CQ.el("div", "rc-panel", wrap);
    const box = CQ.el("div", "rc-eq-wrap", card);
    const eqn = CQ.eqTokens(box, RECAP_EQ, "rc-eq");
    const tokens = [...eqn.querySelectorAll(".tok")];
    tokens.forEach((e) => (e.style.opacity = "0"));
    await CQ.run.wait(80); // lay the equation out before measuring it for the labels
    // all four labels, hidden, in the order the lines name them: variable, equation, lhs, rhs
    const parts = recapLabels(eqn, c.panels[c.panels.length - 1].show, c.labels);
    // large, with the equation's middle a little above the middle of the space under the question bar
    const S = 1.9;
    const MID = { x: 960, y: 560 };
    card.style.setProperty("--cs", S);
    CQ.pos(card, MID.x - S * (eqn.offsetLeft + eqn.offsetWidth / 2), MID.y - S * (eqn.offsetTop + eqn.offsetHeight / 2));
    await CQ.say("recap-0", { text: c.title + ".", advance: "auto", pause: 200 });
    const W = (ms) => CQ.run.wait(ms);
    // When the voice gets to str in the line text (the question bar types with it); at the latest
    // after 15 s.
    const untilSaid = (text, str) =>
      new Promise((res) => {
        const t0 = performance.now();
        const tick = () => {
          const cap = CQ.caption;
          if ((cap.text === text && cap.reached(str)) || performance.now() - t0 > 15000) return res();
          setTimeout(tick, 60);
        };
        tick();
      });
    // The labels before the one being named fade back, so the new one has the focus (review, 2026-11-13:
    // "LHS: Fade earlier labels", "RHS: Fade the LHS highlight"): its bracket, line and word.
    const fadeBack = (names) => parts.filter((p) => names.includes(p.name)).forEach((p) => [p.brace, p.lead, p.tag].forEach((e) => e && e.classList.add("settled")));
    const BEFORE = { lhs: ["variable", "equation"], rhs: ["variable", "equation", "lhs"] };
    // A part, as the voice names it: it lights up (x gold, then the whole equation green, x + 4 teal, 9
    // orange: recapLabels), the labels before it fading back, then the dot on it and the line drawn out to
    // its label, and the word written in.
    const nameIt = async (part, text, cue) => {
      await CQ.run.when(untilSaid(text, cue));
      fadeBack(BEFORE[part.name] || []);
      part.light();
      if (part.brace) await showStep(part.brace, "rise", 360);
      part.lead.style.opacity = "";
      part.lead.classList.add("on");
      CQ.audio.play("ui.pop", { volume: 0.4 });
      await W(520);
      showStep(part.tag, "pop", 300);
      await W(writeIn(part.tag, 120, 55) + 150);
    };
    // the equation, sign by sign
    for (const t of tokens) {
      showStep(t, "rise", 360);
      await W(150);
    }
    await W(400);
    // then its parts, one line each: the variable, the equation, the LHS, the RHS
    for (let i = 0; i < c.panels.length; i++) {
      const P = c.panels[i];
      await Promise.all([nameIt(parts[i], P.text, P.cue), CQ.say(P.id, { text: P.text })]);
    }
    // the whole summary on the one equation, for a good look, all four labels clear again (review,
    // 2026-11-07: "At the end, retain the single equation with all four labels clearly spaced"), x + 4
    // back to its teal; then on to the next screen by itself
    await W(900);
    wrap.querySelectorAll(".settled").forEach((e) => e.classList.remove("settled"));
    tokens.forEach((t) => t.classList.remove("faded"));
    await W(3600);
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
    // (no step title and no progress marks over it: asked 2026-11-05)
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
      showPad(0);
      showEntry();
      return CQ.run.when(new Promise((res) => (onCheck = res)));
    };

    // ---- screens on the board
    // The keypad comes in key by key (after the step's lines) when it appears.
    function showPad(delay) {
      if (!pad.classList.contains("hidden")) return;
      pad.classList.remove("hidden");
      oneByOne([...pad.children], 70, delay || 0);
    }
    // One thing at a time, each by itself: every line of the step, and the two sides of an LHS/RHS
    // pair one after the other; then the keypad, key by key.
    const render = (html, withPad) => {
      body.classList.toggle("with-pad", !!withPad);
      main.innerHTML = html;
      const parts = [];
      [...main.children].forEach((el) => (el.classList.contains("pr-sides") ? parts.push(...el.children) : parts.push(el)));
      oneByOne(parts, 560);
      if (withPad) showPad(parts.length * 560 + 250);
      else pad.classList.add("hidden");
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
      // 1) try on your own
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
      render(
        `<div class="pr-x no">${R(W.yourAnswer + " x = " + CQ.num(a))}</div><div class="pr-eq sm">${R(p.eq)}</div>` +
          sides(R(w.text), CQ.num(p.rhs)) +
          `<div class="pr-banner no">${R(CQ.num(w.value) + " ≠ " + CQ.num(p.rhs))}</div>` +
          `<div class="pr-note">${R(W.stepByStep)}</div>`
      );
      await CQ.say("", { text: T(P.lines.wrong, { l: CQ.num(w.value), r: CQ.num(p.rhs), a: CQ.num(a) }) });
      // 4–5) undo each operation on both sides
      for (const st of p.steps) {
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
      }
      CQ.store.set("practiceAt", 0);
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
