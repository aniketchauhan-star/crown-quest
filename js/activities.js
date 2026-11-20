/*
 * Zippy's Crown Quest: activities.
 * The formula screen (concept explanations with Back), "Label the parts", "Sort it",
 * the Word Treasure recap chest, and the finale (Zippy dancing).
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
      if (this.sub && this.sub.v === v) return; // (already in: the balance stays as the working left it)
      b.target = 0; // level, until the working says otherwise
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
      this.renders = (this.renders || 0) + 1; // (cues of a beat drawn before don't act on this one)
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
      // (s.cue.hlBy: a sign's own word for its highlight, ahead of s.cue.hl: on "A statement that says two
      // expressions have equal values…", x + 2 lights on "two", then 7 on "have", then = on "equal
      // values": review, 2026-11-18, "highlight first x + 2 and then 7")
      const cueOf = (k, id) => (k === "hl" && s.cue && s.cue.hlBy && s.cue.hlBy[id]) || (s.cue && s.cue[k]);
      eqn.querySelectorAll(".tok").forEach((t) => {
        const now = t.className;
        toks[t.dataset.id] = now;
        const want = now.split(" ");
        let was = before.toks[t.dataset.id];
        // (a highlight with a word of its own waits for it even if the line before ended with it on: it
        // fades back as the line starts and comes again on its word, so = lights on "equal values")
        const waits = want.filter((k) => ["hl", "lhs", "rhs"].includes(k) && cueOf(k, t.dataset.id));
        const start = want.filter((k) => !waits.includes(k)).join(" ");
        if (was == null) {
          if (!waits.length) return;
          was = start;
        }
        if (was === now && !waits.length) return;
        t.className = was;
        void t.offsetWidth; // the old look is drawn first, so the change runs as a CSS transition
        t.className = start;
        waits.forEach((k) => this.onCue(cueOf(k, t.dataset.id), sig, () => t.classList.add(k)));
      });
      // s.fade = { cue, ids }: those signs fade back a little as the voice gets to the word (the side
      // before, as the other side is introduced: review, 2026-11-16, "jab RHS ki baat hoti toh LHS thda
      // fade ho skta hai")
      if (s.fade)
        s.fade.ids.forEach((id) => {
          toks[id] = (toks[id] || "") + " faded";
          this.onCue(s.fade.cue, sig, () => tok(id).classList.add("faded"));
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
          // each row written plainly, all of them starting under the equation's x (below): x + 2 = 7 /
          // Try x = 4 / LHS = 4 + 2 = 6 / RHS = 7, flush left (review, 2026-11-20, the user's picture and
          // choice: "downside 3 equations need to be left side"; until then they stood in columns, their
          // last = signs under the equation's: review, 2026-11-19). "Try" smaller, by itself (.tw). A
          // side's value stays on its line, after its expression:
          // LHS = 4 + 2 = 6 (review, 2026-11-19: "23 is equal to should same line in 15 is equal to"; = 6
          // on a line of its own under it, left of 4 + 2, was turned down the same day: "Please don't do
          // this like this… in all game").
          let html = CQ.rich(r.t);
          if (/\btry\b/.test(r.cls || "")) html = html.replace(UI.tryWord, `<span class="tw">${UI.tryWord}</span>`);
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
          rowCls[key] = el.className + (r.lit ? " " + r.lit.cls : "");
          // r.lit = { cue, cls }: it lights up on a word (the try, as what it means is said; the side
          // before, faded a little as the voice moves on to the other side; both sides, in their
          // colours, on "two sides"). cls: one class or more.
          if (r.lit) this.onCue(r.lit.cue, sig, () => el.classList.add(...r.lit.cls.split(" ")));
          // (no verdict written under the try: the voice says it, x = 4 lit red or green; review,
          // 2026-11-19: "do not write not a solution and this kind of things in this game")
          // r.write = [{ text, cue }]: a new row is written in by hand, part by part, each part as the
          // voice says its word (LHS on "left-hand side", 4 + 2 straight after, = on "equals", 6 on "6")
          if (r.write && !before.keys.has(key)) {
            el.dataset.writes = "1";
            const n = this.renders;
            CQ.writeOut(el, r.write, this.lineText, r.each || 75, () => this.renders === n).catch(() => {});
          }
        });
        // the rows' left edge under the left edge of the equation's x (its letter, inside the token's
        // padding), where they are laid out (no transforms)
        const x = tok("x");
        if (x) {
          const left = (el) => {
            let v = 0;
            for (let e = el; e && e !== c; e = e.offsetParent) v += e.offsetLeft;
            return v;
          };
          const pad = parseFloat(getComputedStyle(x).paddingLeft) || 0;
          rows.style.translate = `${Math.round(left(x) + pad - left(rows))}px 0`;
        }
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
        const writeEq = () =>
          signs.forEach((t, i) => {
            t.style.opacity = "";
            CQ.anim(t, [{ opacity: 0, translate: "0 14px" }, { opacity: 1, translate: "0 0" }], { duration: 480, delay: 120 + i * 190, easing: CQ.EASE.out, keep: false });
          });
        // s.cue.eqn: the equation is written in as the voice gets to that word ("Let's return to the
        // crown's equation.")
        if (s.cue && s.cue.eqn) {
          signs.forEach((t) => (t.style.opacity = "0"));
          this.onCue(s.cue.eqn, sig, writeEq);
        } else writeEq();
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
        if (el.dataset.writes) return; // (a row that writes itself in, with the voice)
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
              this.drawTag(els, 0, true); // (quickly: its word lands while the voice is saying it)
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
                if (el.classList.contains("grp-label")) writeIn(el, 150, 45); // its name is written in
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
    // The rows worked out under the equation fade away (a new try begins).
    async clearRows() {
      const rows = this.content.querySelector(".nb-rows");
      if (!rows || !rows.children.length) return;
      await CQ.run.when(CQ.anim(rows, [{ opacity: 1 }, { opacity: 0 }], { duration: 420, easing: CQ.EASE.in, essential: true }));
    },
    // What happens on the balance before a beat's line is said (b.before): the value tried is put in for
    // x (sub: the crown makes way for that many coins, beside the coins there), then the balance tips the
    // way the pans now weigh (tilt), its hub flashing when they are equal (flash); a moment to see it.
    // (Level 4's try, once both sides have been worked out: review, 2026-11-16, "jab LHS and RHS nikal le
    // tb crown ko replace kro and balance tilt kro".)
    async before(o) {
      if (o.sub != null) {
        await CQ.run.when(this.substitute(o.sub));
        await CQ.run.wait(250);
      }
      if (o.tilt) {
        const d = CQ.balance.evaluate();
        if (d === 0 && o.flash) CQ.balance.flashEmblem();
        await CQ.run.wait(d === 0 ? 900 : 1500);
      }
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
    // symbol. Highlight the crown for x, then the two coins for 2. +: Highlight the plus sign"; since
    // 2026-11-19 the + is not lit: "plus sign will not highlighted"). L = { ids, tok: the colour ("var",
    // "const"; none: the sign stays plain), pan: panLights' }.
    lightTag(L) {
      const eqn = this.content.querySelector(".eqn");
      L.ids.forEach((id) => {
        const t = eqn && eqn.querySelector(`.tok[data-id="${id}"]`);
        if (t && L.tok) t.classList.add("lit-" + L.tok);
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
    // fn when the voice gets to str in this beat's line, as it begins its last word (CQ.caption.when:
    // the question bar follows the voice word by word; a line with no voice, about when a voice would
    // have got there), as long as the beat is still the one on screen.
    onCue(str, sig, fn) {
      const r = this.renders;
      CQ.caption.when(this.lineText, str).then(() => {
        if (this.renders === r && this.shown && this.shown.sig === sig) fn();
      });
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
    drawTag(els, at, quick) {
      const br = els.find((e) => e.classList.contains("under-bracket"));
      const line = els.find((e) => e.classList.contains("tag-line"));
      const tag = els.find((e) => e.classList.contains("tag"));
      const k = quick ? 0.5 : 1; // (a tag that comes on its word is drawn in half the time)
      let t = at;
      if (br) {
        CQ.anim(br, [{ opacity: 0 }, { opacity: 1 }], { duration: 320 * k, delay: t, easing: CQ.EASE.out, keep: false });
        t += 280 * k;
      }
      if (line) {
        CQ.anim(line, [{ opacity: 0 }, { opacity: 1 }], { duration: 160 * k, delay: t, keep: false });
        CQ.anim(line, [{ clipPath: "inset(-10px -10px calc(100% - 8px) -10px)" }, { clipPath: "inset(-10px -10px -10px -10px)" }], { duration: 440 * k, delay: t + 120 * k, easing: CQ.EASE.out, keep: false });
        t += 560 * k;
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
        this.lineText = CQ.T(b.id, b.vars); // what the line says (things can wait for a word of it)
        if (b.clear) await this.clearRows(); // (the working so far fades away first)
        this.render(b.s);
        if (b.before) await this.before(b.before);
        if (b.gem && !CQ.gems.have.has(b.gem)) CQ.gems.collect(b.gem);
        const r = await CQ.say(b.id, { back: i > 0, vars: b.vars });
        i += r === "back" ? -1 : 1;
        if (i < 0) i = 0;
      }
    },
  };

  // (the words written on the formula screen are in js/content.js: formula, and ui for LHS, RHS and Try)
  const F = C().formula;
  const UI = C().ui;
  CQ.NB_WORDS = [
    // x and its crown light up as the voice says "find x" (review, 2026-11-16: things come with their words)
    { id: "l4-9", s: { hl: ["x"], bal: "crown", cue: { hl: "find x", bal: "find x" } } },
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
    { id: "l4-11b", s: { hl: ["x"], bal: "crown", tags: [{ ids: "x", text: F.variable, color: "var", cue: "x is our variable" }] }, gem: "variable" },
    // No box round x + 2, so its labels read clearly; each label comes in as the voice names it (review,
    // 2026-11-07: "We don't need a box around x + 2 so that the labelling becomes clear. Labelling
    // should come synced with VO.")
    // x + 2 lights up together with the crown and the two coins, all in the same soft gold, and no copy
    // of them stands over the equation (review, 2026-11-13: "Highlight x + 2 together with the crown and
    // two coins. Remove the duplicate crown and coins above the equation"; s.mini is no longer used).
    // Only x and 2 light up: the + between them stays plain, as everywhere (asked 2026-11-19: "plus sign
    // will not highlighted. Only digit highlight… Do this in all game").
    { id: "l4-12", s: { hl: ["x", "two"], bal: "left", cue: { hl: "x", bal: "x" } } },
    // each label comes in as the voice names it, lighting its sign in its colour and what it stands for
    // on the balance: variable and the crown for x, addition and both for + as the voice joins them
    // ("and"), then constant and the two coins for 2 (review, 2026-11-13; the line's "We add them
    // together", on which addition came last, is not in the text of 2026-11-19). The + itself stays
    // plain, its label joined to it by its line (no plus sign lit anywhere: asked 2026-11-19).
    {
      id: "l4-13",
      s: {
        tags: [
          { ids: "x", text: F.variableWord, color: "var", cue: "x is a variable", lights: { tok: "var", pan: "crown" } },
          { ids: "plus", text: F.addition, color: "op", row: 1, cue: "variable, and", lights: { pan: "both" } },
          { ids: "two", text: F.constant, color: "const", cue: "2 is a constant", lights: { tok: "const", pan: "coins" } },
        ],
      },
      gem: "constant",
    },
    // x + 2 glows with the crown and the two coins all along, as on "Now look at x + 2" (x and 2: the +
    // stays plain); its bracket and the Algebraic expression label come in as the voice names it (review,
    // 2026-11-13: "Highlight x + 2 and the crown with two coins together. Keep the bracket under x + 2
    // only. Reveal Algebraic expression when the VO names it")
    { id: "l4-14", s: { hl: ["x", "two"], bal: "left", tags: [{ ids: LHS, text: F.expression, color: "expr", bracket: true, cue: "the algebraic" }] }, gem: "expression" },
    // the level beam and = light up together, in gold, as the voice says "equals" (review, 2026-11-13:
    // "Highlight the level beam and = together when the VO says 'equals'"; the whole balance used to
    // glow, and = to pulse, from the start of the line)
    { id: "l4-15", s: { hl: ["eq"], cue: { hl: "2 =" }, beam: "2 =" } },
    // "…says two expressions have equal values…": the two expressions light up one after the other, x + 2
    // on "two", then 7 on "have" (review, 2026-11-18: "when we are saying the two expressions have equal
    // values, highlight first x + 2 and then 7"), then = as the voice says "equal values"; at the end of
    // the line the whole equation is outlined and its Equation label comes in under it (review,
    // 2026-11-07: "equation should come at the end of the VO"; "it can come below"; 2026-11-13: "Remove
    // the large frame around the balance. Highlight = when the VO says 'equal values.' Then highlight the
    // complete equation and reveal Equation beneath it" — nothing on the balance glows on this line). Of
    // x + 2, x and 2 light up, the + staying plain (asked 2026-11-19).
    {
      id: "l4-16",
      s: {
        hl: ["x", "two", "seven", "eq"],
        outline: true,
        outlineLabel: F.equation,
        cue: { hl: "equal values", hlBy: { x: "says two", two: "says two", seven: "expressions have" }, outline: "an equation." },
      },
      gem: "equation",
    },
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
        tags: [{ ids: LHS, text: F.lhs, color: "lhs", box: true, boxCue: "to the left", cue: "called the left-hand" }],
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
          { ids: LHS, text: F.lhs, color: "lhs", box: true, fade: "to the right" },
          { ids: "seven", text: F.rhs, color: "rhs", box: true, row: 1, boxCue: "to the right", cue: "called the right-hand" },
        ],
      },
      gem: "rhs",
    },
  ];
  // Trying values for x, like the PPT's slides 24–26: each side worked out for 4 (they differ, so 4 is
  // not a solution) and for 5 (both sides equal 7, so 5 is the solution). The equation stays at the top
  // all along, like on a board; the working goes under it.
  // Each row of the working is written in by hand as the voice says it, every number as it is said
  // (review, 2026-11-16: "animation se dikhao likhte hue: LHS: 4 + 2 = 6", "ekdum appear kyu horha hai",
  // "jab VO bole 7 tb 7 aana chahie"): "Try x =" on "try", its 4 on "4"; LHS on "left-hand",
  // 4 + 2 straight after, = on "is", 6 on "6". The side the voice is on lights up with its pan and its part
  // of the equation, and the side before fades a little ("jab RHS ki baat hoti toh LHS thda fade ho skta
  // hai"). "Try x = 4", LHS and RHS stand on one = under another (review, 2026-11-18: "Check the alignment
  // of text in x = 8 for all equations"). The crown is only replaced once both sides have been worked
  // out ("jab LHS and RHS nikal le tb crown ko replace kro and balance tilt kro"). Then, as in every check
  // (review, 2026-11-18: "Split the ending into two screens… for all values we are trying and for every
  // equation as one screen currently looks cluttered"; it was one screen, with 6 ≠ 7 and "4 is not a
  // solution." written under the working): first the balance, the working kept as it is, both sides lit
  // with their pans on "two sides" and the balance tipping on "tips" (for 5: level, its hub flashing, on
  // "level"); then, on the same screen, everything staying as it is, x = 4 is written in under it all in
  // red as the voice says it (for 5: green, on "So, x = 5"; review, 2026-11-20: "Do not make separate
  // screen… X is equal to 4 come downside in red"; nothing else written: review, 2026-11-19).
  const tryText = (v) => `${UI.tryWord} x = ${v}`;
  const lhsText = (v, s) => `${UI.lhs} = ${v} + 2 = ${s}`;
  const rhsText = `${UI.rhs} = 7`;
  const tryRow = (v, more) => Object.assign({ t: tryText(v), cls: "try side" }, more);
  const tryWrite = (v) => tryRow(v, { write: [{ cue: "try", text: `${UI.tryWord} x =` }, { cue: `${v}.`, text: String(v) }] });
  const lhsWrite = (v, s) => ({ t: lhsText(v, s), cls: "side lit lhs", write: [{ cue: "left-hand", text: `${UI.lhs} =` }, { text: `${v} + 2` }, { cue: "side is", text: "=" }, { cue: `${s}.`, text: String(s) }] });
  const rhsWrite = { t: rhsText, cls: "side lit rhs", write: [{ cue: "right-hand", text: `${UI.rhs} =` }, { cue: "7.", text: "7" }] };
  // the ending's first screen: the working as it is, both sides lit with their pans on "two sides" ("Both
  // sides"), the balance as the voice says it (cue: its word)
  const balanceBeat = (id, v, s, cue, steps) => ({
    id,
    before: { sub: v },
    s: {
      rows: [tryRow(v), { t: lhsText(v, s), cls: "side", lit: { cue: cue.both, cls: "lit lhs" } }, { t: rhsText, cls: "side", lit: { cue: cue.both, cls: "lit rhs" } }],
      steps: [{ cue: cue.both, pans: true }].concat(steps),
    },
  });
  // the second, the same screen: the equation and the working stay (the sides unlit), and x = v is written
  // in under them on cue, red (cls "lit-no": not a solution) or green ("lit-ok": the solution)
  const verdictRows = (v, s, cue, cls) => [
    tryRow(v),
    { t: lhsText(v, s), cls: "side" },
    { t: rhsText, cls: "side" },
    { t: `x = ${v}`, cls: "sol " + cls, write: [{ cue, text: `x = ${v}` }] },
  ];
  CQ.NB_TRY = [
    // the crown lights up as the voice names it
    { id: "l4-23", s: { bal: "crown", cue: { bal: "crown's" } } },
    // No floating crown over x and no big frame round both pans (review, 2026-11-07): on "a value of x",
    // x and the crown on the left pan light up; on "makes both sides equal", x + 2 and 7 light up
    // together, each with its own pan (teal, orange). The balance is level: the equality we want.
    {
      id: "l4-24",
      s: {
        hl: ["x"],
        lhs: true,
        rhs: true,
        cue: { hl: "need x", lhs: "make both sides", rhs: "make both sides" },
        steps: [
          { cue: "need x", bal: "crown" },
          { cue: "make both sides", bal: null, pans: true },
        ],
      },
    },
    // "Let's check 4. Replace x with 4…": Try x = 4 written under the equation (its 4 as "4" is said); x
    // lights up as "Replace x" is said (the x that gets the 4), until "find the value"
    { id: "l4-25", s: { hl: ["x"], cue: { hl: "try x", hlOut: "Find the" }, rows: [tryWrite(4)], steps: [{ restore: true }] } },
    // "The left-hand side is 6.": LHS = 4 + 2 = 6 written as it is said; x + 2 and the left pan's things
    // (the crown and its two coins) light up teal on "left-hand"
    {
      id: "l4-26",
      s: { lhs: true, cue: { lhs: "left-hand" }, rows: [tryRow(4), lhsWrite(4, 6)], steps: [{ restore: true }, { cue: "left-hand", side: "left" }] },
    },
    // "The right-hand side is 7.": RHS = 7 written as it is said; 7 and the right pan's coins light up
    // orange on "right-hand", while the left side (its row, x + 2, its pan) fades back a little
    {
      id: "l4-26b",
      s: {
        lhs: true,
        rhs: true,
        cue: { rhs: "right-hand" },
        fade: { cue: "right-hand", ids: LHS },
        rows: [tryRow(4), { t: lhsText(4, 6), cls: "side", lit: { cue: "right-hand", cls: "faded" } }, rhsWrite],
        steps: [{ restore: true }, { cue: "right-hand", side: "right" }],
      },
    },
    // both sides worked out: the crown makes way for 4 coins; "The two sides have different values. The
    // balance tips!", the balance tipping on "tips"
    balanceBeat("check-diff", 4, 6, { both: "The values" }, [{ cue: "balance tips", tilt: true }]),
    // "So, x = 4 is not a solution.": x = 4 written in red under the working on "x = 4"
    // (the balance stays tipped; come back to with Back, the coins are put in again and it tips once more)
    {
      id: "check-not-sol",
      vars: { v: 4 },
      s: { rows: verdictRows(4, 6, "x = 4", "lit-no"), steps: [{ sub: 4 }, { cue: "not a", tilt: true }] },
    },
    // "Now, let's check 5…": the 4 coins go and the crown is back (level again), the working for 4 is
    // cleared, and Try x = 5 is written (its 5 as "5" is said)
    { id: "l4-27", clear: true, s: { hl: ["x"], cue: { hl: "try x", hlOut: "Find both" }, rows: [tryWrite(5)], steps: [{ restore: true }] } },
    {
      id: "l4-28",
      s: { lhs: true, cue: { lhs: "left-hand" }, rows: [tryRow(5), lhsWrite(5, 7)], steps: [{ restore: true }, { cue: "left-hand", side: "left" }] },
    },
    {
      id: "l4-28b",
      s: {
        lhs: true,
        rhs: true,
        cue: { rhs: "right-hand" },
        fade: { cue: "right-hand", ids: LHS },
        rows: [tryRow(5), { t: lhsText(5, 7), cls: "side", lit: { cue: "right-hand", cls: "faded" } }, rhsWrite],
        steps: [{ restore: true }, { cue: "right-hand", side: "right" }],
      },
    },
    // both sides worked out: the crown makes way for 5 coins; "Both sides have the same value. The balance
    // is level!", its hub flashing on "level"
    balanceBeat("check-same", 5, 7, { both: "Both sides" }, [{ cue: "stays level", tilt: true, flash: true }]),
    // "A value that makes an equation true is its solution. So, x = 5!": x = 5 written in green under the
    // working on "So, x = 5"
    { id: "l4-29", s: { rows: verdictRows(5, 7, "So, x = 5", "lit-ok"), steps: [{ sub: 5 }] }, gem: "solution" },
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
    { id: "l4-19a", s: { cue: { eqn: "the crown's" } } },
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
      s: { power: { in: "highest power", out: "This is" }, tags: [{ ids: EQ_X2.map((t) => t.id), text: F.linear, color: "lin", bracket: true, cue: "a linear" }] },
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
  // The last answer of a set is praised (the line says it) over a shower of confetti, wherever it is: the
  // label and sort activities, and each practice equation (the learning-section skill: "the LAST answer
  // of a set gets praise, a praise key over a confetti shower").
  function praise(x, y) {
    CQ.fx.confetti(CQ.ui.layer, x || 960, y || 420, 44);
    CQ.audio.play("confetti");
  }
  // ms, delay: how long it fades, and after how long (later and slower when the formula screen's dark
  // comes in under it meanwhile, so the scene never shows through in between)
  function closeBoard(wrap, ms, delay) {
    CQ.soft.set("activity", false);
    if (!CQ.notebook.isOpen) CQ.zippy.setVisible(true); // still under the dark: he is simply there as it lifts (not over a formula screen kept under it)
    return CQ.anim(wrap, [{ opacity: 1 }, { opacity: 0 }], { duration: ms || 480, delay: delay || 0, essential: true }).then(() => wrap.remove());
  }
  // Drag + tap-to-place helper for chips/cards onto targets. (el.sending: a wrong one shaking its head on
  // its way home, out of reach meanwhile.)
  function makeChip(el, home, ctl) {
    let grab = null;
    el.tabIndex = 0;
    const setPos = (p) => CQ.pos(el, p.x, p.y);
    setPos(home);
    CQ.drag(el, {
      enabled: () => !el.placed && !el.sending,
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
  // A control that has been answered is done with: no longer in the keyboard's way (the learning-section
  // skill: controls are "spent once answered").
  function spend(...els) {
    els.forEach((e) => {
      if (!e) return;
      e.tabIndex = -1; // (if it has the focus, Tab still goes on from it to the next one)
      e.setAttribute("aria-disabled", "true");
    });
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
      t.setAttribute("aria-label", C().ui.emptyBox);
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
    // each pair is in (the child has put both its labels in): what comes next waits
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
      t.setAttribute("aria-label", c.names[t.answer] || t.answer);
      spend(el, t);
      leads[t.answer].classList.add("on");
      setTimeout(() => {
        if (braces[t.answer]) braces[t.answer].classList.add("on");
        parts[t.answer].forEach((id) => tok(id).classList.add("glow-" + colors[t.answer]));
      }, 420);
      return tc;
    };
    const ctl = {
      hover(p) {
        targets.forEach((t) => t.classList.toggle("hover", t.ready && !t.done && inRect(p, rectOf(t, 30))));
      },
      targetAt(p) {
        return targets.find((t) => t.ready && !t.done && inRect(p, rectOf(t, 40)));
      },
      select(el) {
        if (el.sending) return; // (on its way back after a wrong box)
        chips.forEach((ch) => ch.classList.toggle("selected", ch === el && !ch.placed));
        selected = el.placed ? null : el;
        CQ.audio.play("ui.pop");
      },
      tapTarget(t) {
        if (selected && t.ready && !t.done) {
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
          place(el, t);
          // A right label gets a short success sound and its box's border turns green (styles.css), and
          // nothing is said or written: the question bar keeps the instruction (review, 2026-11-07: "For
          // correct responses, remove the spoken and written feedback… Keep the instruction panel
          // unchanged"). Like every right answer: a tick on the box's corner, the box and its label swell
          // once together, a small burst of sparkles beside it (CQ.answer).
          CQ.answer.right(t);
          CQ.answer.pulse(el);
          CQ.track("answer", { activity: "label", box: t.answer, choice: el.label, correct: true });
          if (CQ.caption.text !== ask[pair]) CQ.say("", { text: ask[pair], advance: "none", quiet: true });
          // the pair is in: Next is back at once, then a moment to see it go in (lookThenOn)
          if (PAIRS[pair].every((name) => target(name).done)) pairDone[pair]();
        } else {
          CQ.track("answer", { activity: "label", box: t.answer, choice: el.label, correct: false });
          sendBack(el).catch(() => {}); // (cancelled: the quest went on elsewhere meanwhile)
        }
      },
    };
    // When the voice of a line (sp = { line, said }) gets to str (CQ.caption.when), or when the line is
    // over (skipped with → or Next).
    const cueIn = (sp, str) => CQ.run.when(Promise.race([sp.said, CQ.caption.when(sp.line, str)]));
    // A wrong label in a box: the screen shakes and red light glows in from its corners, the label red for
    // a beat where it was put (CQ.answer); then it goes back to its place under the boxes, and the child
    // tries again, the instruction staying in the question bar (the hand shows how when nothing happens).
    // Nothing is said or written (asked 2026-11-19: "glat krne pr yh text ki need ni… bs shake krdo… sbme
    // implement kr dena"). Until then the label was explained and put in its box by the game ("Not quite!
    // x is the unknown value, so it's the variable.": reviews of 2026-11-13 and 2026-11-16).
    const sendBack = async (wrong) => {
      wrong.sending = true; // (not to be picked up again on its way back)
      if (selected === wrong) selected = null;
      wrong.classList.remove("selected");
      CQ.hand.stop();
      try {
        await CQ.run.when(CQ.answer.wrong(wrong));
        wrong.from = { x: parseFloat(wrong.style.left), y: parseFloat(wrong.style.top) };
        CQ.audio.play("bar.return");
        await CQ.run.when(wrong.goHome());
      } finally {
        wrong.sending = false;
      }
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
        const el = CQ.el("div", "label-chip", wrap, c.names[label] || label);
        el.label = label;
        el.setAttribute("role", "button");
        el.setAttribute("aria-label", c.names[label] || label);
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
          CQ.el("div", "label-chip carried", w, c.names[ch.label] || ch.label);
          return w;
        },
        carryAt: { x: -grip.x, y: -grip.y },
      });
    };
    // Next is back once a pair is in (review, 2026-11-13: "Show Next after both labels are correctly
    // placed"): a moment to look, then the activity goes on by itself, or at once on Next (or →).
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
    // the hand shows how again when nothing happens for a while (with a label that is in its place)
    const hint = () => {
      const ch = chips.find((x) => !x.placed && !x.sending);
      if (ch) showHow(ch);
    };
    hideAll([...Object.values(braces), ...Object.values(leads), ...targets]);
    // The equation comes in: from where x + 2 = 7 stood, at its size, as that one fades, and glides to its
    // place in the middle; from the menu, it rises in at its place.
    // (it comes as the voice says "another equation": review, 2026-11-16, things come with their words)
    const another = CQ.run.when(Promise.race([bridge, CQ.caption.when(c.bridge, "another")]));
    if (fromAt) {
      const cur = CQ.centerOf(eqn);
      const from = { translate: `${fromAt.x - cur.x}px ${fromAt.y - cur.y}px`, scale: String(fromSize / parseFloat(getComputedStyle(eqn).fontSize)) };
      eqn.style.transformOrigin = "0 50%"; // (its middle, after its own -50% shift: it grows and shrinks about it)
      Object.assign(eqn.style, from);
      eqn.style.opacity = "0";
      await another;
      eqn.style.opacity = "";
      CQ.anim(eqn, [{ opacity: 0 }, { opacity: 1 }], { duration: 320, keep: false });
      CQ.audio.play("ui.pop", { volume: 0.5 });
      await CQ.run.wait(300);
      await CQ.run.when(CQ.anim(eqn, [from, { translate: "0px 0px", scale: "1" }], { duration: 1000, easing: CQ.EASE.inOut, essential: true }));
    } else {
      hideAll([eqn]);
      await another;
      comeIn(eqn, "rise", 600);
    }
    await bridge;
    if (formula) nb.blank(); // (the formula screen under the activity is left empty, to write afresh after it)
    const said = CQ.say("", { text: c.title, advance: "auto", pause: 100 });
    await CQ.run.wait(350);
    bringing = bringIn(0);
    await bringing;
    await said;
    const first = chips.find((ch) => ch.label === "Variable" && !ch.placed && !ch.sending);
    if (first) showHow(first);
    CQ.idle.arm(hint, 9000);
    await CQ.run.when(pairIn[0]);
    CQ.idle.disarm();
    CQ.hand.stop();
    await lookThenOn(2300);
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
    // every label is in: Next comes back, and a moment to see the last one go in; then praise (the child
    // put every label in: a wrong one only went back for another try)
    await lookThenOn(1100);
    praise(); // (the last answer of the set: praise, over a shower of confetti)
    await CQ.say("", { text: c.done });
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
          // activity).
          const slot = bin.slots[bin.used++];
          el.placed = true;
          el.classList.add("placed", right === "linear" ? "lin" : "nonlin");
          el.classList.remove("glow", "selected");
          spend(el);
          if (right === "nonlinear") el.classList.add("show-2"); // its power 2 turns orange
          const from = el.from && el.from !== el.home ? el.from : { x: parseFloat(el.style.left), y: parseFloat(el.style.top) };
          // the chime as it goes in; green, its tick, one swell and a little burst as it lands (CQ.answer)
          CQ.tween(260, (k) => CQ.pos(el, CQ.lerp(from.x, slot.at.x, k), CQ.lerp(from.y, slot.at.y, k)), CQ.ease.out).then(() => el.isConnected && CQ.answer.right(el, { silent: true }));
          slot.classList.add("filled");
          CQ.audio.play("correct");
          CQ.track("answer", { activity: "sort", card: el.card.eq, choice: bin.kind, correct: true });
          placed++;
          if (placed === cards.length) CQ.run.wait(1100).then(finish, () => {}); // a moment to see it go in
        } else {
          el.misses = (el.misses || 0) + 1;
          CQ.track("answer", { activity: "sort", card: el.card.eq, choice: bin.kind, correct: false, attempt: el.misses });
          // The screen shakes and red light glows in from its corners, the card red for a beat where it
          // was put (with the "try again" sound), then it goes back to its place in the tray, for another
          // try; nothing is said or written (asked 2026-11-19: "glat krne pr yh text ki need ni… bs shake
          // krdo… sbme implement kr dena"; it was "Check the highest power of x.", then "The highest
          // power of x is 1, so this equation is linear."). The same card wrong again: its panel glows.
          el.sending = true;
          el.from = { x: parseFloat(el.style.left), y: parseFloat(el.style.top) };
          CQ.answer
            .wrong(el)
            .then(() => el.isConnected && el.goHome())
            .then(() => (el.sending = false));
          if (el.misses >= 2) {
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
    // as the voice says them (review, 2026-11-16: things come with their words): the cards in their tray
    // on "each equation", the two panels on "the correct box"
    const said = CQ.say("", { text: c.title, advance: "auto", pause: 100 });
    const onWord = (cue) => CQ.run.when(Promise.race([said, CQ.caption.when(c.title, cue)]));
    await onWord("each equation");
    comeIn(tray, "rise", 360);
    traySlots.forEach((sl) => comeIn(sl, "rise", 300));
    await CQ.run.wait(200);
    for (const cd of cards) {
      comeIn(cd, "rise", 360);
      await CQ.run.wait(140);
    }
    await onWord("the correct");
    for (const bin of [bins.linear, bins.nonlinear]) {
      comeIn(bin, "pop", 360);
      await CQ.run.wait(writeIn(bin.querySelector(".bin-head"), 250, 40) + 80);
      for (const sl of bin.slots) {
        comeIn(sl, "rise", 300);
        await CQ.run.wait(100);
      }
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
    praise(); // (the last card in: praise, over a shower of confetti)
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
  // Letters of el written in one after another, as if by hand, part by part, each part as the voice of
  // the line says its word (review, 2026-11-16: "animation se dikhao likhte hue: LHS: 4 + 2 = 6", and
  // "when the VO says 7, 7 should appear"): parts = [{ text, cue }] in order, their letters (spaces
  // aside) the letters of el; a part with no cue follows straight on from the one before. each: ms per
  // letter. alive(): false once el's screen has moved on (it stops). Resolves when all is written.
  CQ.writeOut = async function (el, parts, line, each, alive) {
    each = each || 70;
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
    el.style.visibility = "hidden"; // (a row with a box round it: the box too, until its first part)
    const ok = () => el.isConnected && (!alive || alive());
    // each part's letters (with the spaces before them)
    let k = 0;
    const groups = parts.map((p, i) => {
      const n = String(p.text).replace(/\s+/g, "").length;
      const g = [];
      let got = 0;
      while (k < chars.length && (got < n || (i === parts.length - 1 && k < chars.length))) {
        if (!/\s/.test(chars[k].textContent)) got++;
        g.push(chars[k++]);
      }
      return g;
    });
    for (let i = 0; i < parts.length; i++) {
      if (parts[i].cue) await CQ.caption.when(line, parts[i].cue);
      if (!ok()) return;
      if (i === 0) {
        el.style.visibility = "";
        CQ.anim(el, [{ opacity: 0 }, { opacity: 1 }], { duration: 180, keep: false });
      }
      if (i === 0 || parts[i].cue) CQ.audio.play("ui.pop", { volume: 0.45 });
      for (const ch of groups[i]) {
        if (!ok()) return;
        ch.classList.add("on");
        if (!/\s/.test(ch.textContent)) await CQ.sleep(each);
      }
    }
    el.classList.remove("writing");
  };
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
    // When the voice gets to str in the line text (CQ.caption.when).
    const untilSaid = (text, str) => CQ.caption.when(text, str);
    // The labels before the one being named fade back, so the new one has the focus (review, 2026-11-13:
    // "LHS: Fade earlier labels", "RHS: Fade the LHS highlight"): its bracket, line and word.
    const fadeBack = (names) => parts.filter((p) => names.includes(p.name)).forEach((p) => [p.brace, p.lead, p.tag].forEach((e) => e && e.classList.add("settled")));
    const BEFORE = { lhs: ["variable", "equation"], rhs: ["variable", "equation", "lhs"] };
    // A part, as the voice names it: it lights up (x gold, then the whole equation green, x + 4 teal, 9
    // orange: recapLabels), the labels before it fading back, then the dot on it and the line drawn out to
    // its label, and the word written in.
    // (look: the words on which the part lights up, the labels before it fading back, when they come
    // before its name: "The expression to the left of the equals sign…")
    const nameIt = async (part, text, cue, lookCue) => {
      if (lookCue) {
        await CQ.run.when(untilSaid(text, lookCue));
        fadeBack(BEFORE[part.name] || []);
        part.light();
      }
      await CQ.run.when(untilSaid(text, cue));
      if (!lookCue) {
        fadeBack(BEFORE[part.name] || []);
        part.light();
      }
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
      await Promise.all([nameIt(parts[i], P.text, P.cue, P.look), CQ.say(P.id, { text: P.text })]);
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
  // Six equations (review, 2026-11-18). Before the first, "Now, use what you've learned to solve an
  // equation.", the equation written in big in the middle as the voice gets to "equation". Then for each:
  // "Find the value of x.", and x = □ comes in under the equation (its = under the equation's), with
  // number tiles under it (js/tiles.js: a tile dragged, tapped or entered into the box is the answer; no
  // keypad and no Check button, asked 2026-11-18: "calculator is looking very bad… place a drag and
  // drop… and place a hand nudge also"). Right: no check and no words ("Not required, once correct move
  // to the next ques"); Next comes in, and the next equation on its tap (asked 2026-11-19: "next button
  // add krdo x is value aane pr"; no Next while solving). Wrong: the screen shakes and red light glows in
  // from its corners, with no words (asked 2026-11-19; it was "Not quite! Let's solve it together."),
  // and the equation is solved on the board step by step: each step is said in the question
  // bar ("Subtract 5 from both sides."; no "What undoes adding 5?" screen, no note written under the
  // working), its working row is written in as it is said, then its answer row with the tiles, and every
  // row stays in view, one under another, every = under the equation's ("Do not remove the previous step
  // from the screen. All steps will be visible one after the other"). A wrong tile: the screen shakes,
  // the red light, no words, and the child tries again; after two, the right tile glows. The last step's
  // answer is x, in green. No check in the original equation ("This checking not required in
  // these 6 questions").
  CQ.activityPractice = async function (startAt) {
    const P = C().practice;
    const L = P.lines;
    const R = CQ.rich;
    const wrap = CQ.el("div", "activity practice-act", CQ.ui.overlay);
    // No Next while an equation is being solved: it comes in once x's value is in (nextQuestion)
    CQ.next.showNext(false);
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
    const main = CQ.el("div", "pr-main", b);
    const work = CQ.el("div", "pr-work", main); // the working: rows of left side | = | right side
    let tray = null; // the number tiles of the answer being asked for, under the working

    // The board keeps what is on it in its middle, so a change of layout (a row in or out, a box melting
    // into its number) moves the rest: it glides there (CQ.flip), one glide at a time.
    const parts = () => [...work.querySelectorAll(".pr-row > *")].concat(tray && tray.isConnected ? [tray] : []);
    const GLIDE = 520;
    let glideEnd = 0;
    const glide = async (change, scale) => {
      const left = glideEnd - performance.now();
      if (left > 0) await CQ.run.wait(left);
      CQ.flip(parts(), change, GLIDE, { scale });
      glideEnd = performance.now() + GLIDE;
    };
    // A row of the working: its left side, = and its right side, each a cell of the grid (cls "hero": the
    // equation big by itself; "ask": an answer row, x = □, its box the right side). Not in yet.
    const makeRow = (text, cls) => {
      const i = text.indexOf(" = ");
      const row = CQ.el("div", "pr-row " + (cls || ""));
      row.cells = [
        CQ.el("span", "pl", row, R(text.slice(0, i))),
        CQ.el("span", "pe", row, "="),
        CQ.el("span", "pr", row, cls === "ask" ? '<span class="pr-box">?</span>' : R(text.slice(i + 3))),
      ];
      row.cells.forEach((c) => (c.style.opacity = "0"));
      return row;
    };
    // a row written in by hand, one cell after another (each: ms per letter); the box pops in. Resolves
    // when it is all in.
    const writeRow = async (row, each) => {
      let at = 0;
      CQ.audio.play("ui.pop", { volume: 0.5 });
      row.cells.forEach((c) => {
        c.style.opacity = "";
        if (c.querySelector(".pr-box")) {
          CQ.anim(c, [{ opacity: 0, transform: "scale(.6)" }, { opacity: 1, transform: "scale(1)" }], { duration: 300, delay: at, easing: CQ.EASE.back, keep: false });
          at += 300;
        } else at = writeIn(c, at, each || 45) + 90;
      });
      await CQ.run.wait(at);
    };
    // a new row of the working under the others, written in (also: a change made in the same glide)
    const addRow = async (text, cls, also) => {
      const row = makeRow(text, cls);
      await glide(() => {
        if (also) also();
        work.appendChild(row);
      }, true);
      await writeRow(row, cls === "hero" ? 60 : 45);
      return row;
    };
    // things on the board fade away and are gone, what stays gliding into the room they leave (a row
    // fades cell by cell: the row itself has no box of its own)
    const drop = async (els) => {
      els = els.filter((e) => e && e.isConnected);
      if (!els.length) return;
      const faded = els.reduce((a, e) => a.concat(e.classList.contains("pr-row") ? [...e.children] : [e]), []);
      await CQ.run.when(Promise.all(faded.map((e) => CQ.anim(e, [{ opacity: 1 }, { opacity: 0 }], { duration: 360, easing: CQ.EASE.in, essential: true }))));
      if (els.includes(tray)) tray = null;
      await glide(() => els.forEach((e) => e.remove()));
    };
    // The answer asked for: an answer row (left = □) under the working, its number tiles' room under it,
    // in one glide (also: a change made with them). The tiles stay in the box until the child taps it
    // (asked 2026-11-19: "let the user click the box and then these appear as drop-down menu"). Returns
    // the tiles' control (CQ.numberTiles: its box is the row's).
    const ask = async (left, choices, also) => {
      const row = makeRow(`${left} = ?`, "ask");
      const t = CQ.el("div", "pr-tray");
      await glide(() => {
        if (also) also();
        work.appendChild(row);
        main.appendChild(t);
      }, true);
      tray = t;
      const ctl = CQ.numberTiles(t, row.querySelector(".pr-box"), choices, { label: C().ui.answers, openLabel: C().ui.showAnswers });
      ctl.row = row;
      await writeRow(row);
      return ctl;
    };
    // The answer is in (right, or put in for the child): the tiles go, the box melts away and the number
    // stands in the row as plain text, green when it is x at last. The step is done, so its − 7 on both
    // sides goes back to plain with it: lit only while the step is talked about (asked 2026-11-19: "This
    // should highlight in start… after this no need to highlight").
    const settle = async (ctl, final) => {
      ctl.done();
      const box = ctl.box;
      box.classList.remove("nt-drop", "nt-empty", "nt-hover", "nt-ok", "nt-no");
      box.classList.add("melt");
      work.querySelectorAll(".same").forEach((e) => e.classList.add("unmark"));
      if (final) ctl.row.classList.add("final");
      const t = tray;
      tray = null;
      if (t) CQ.anim(t, [{ opacity: 1 }, { opacity: 0 }], { duration: 340, easing: CQ.EASE.in, essential: true });
      await CQ.run.wait(340);
      await glide(() => {
        box.classList.add("plain");
        if (t) t.remove();
      });
      await CQ.run.wait(GLIDE);
    };
    // Waits for the child's tile; the first time ever they meet the box, the hand taps it at once (and
    // the first time its tiles come out, it shows the drag: js/tiles.js), and whenever they wait, it shows
    // again (the instruction is not said again).
    const answer = (ctl) => {
      const taking = ctl.take();
      ctl.nudge(8000);
      if (!CQ.store.get("tileMenuSeen", false)) {
        CQ.store.set("tileMenuSeen", true);
        setTimeout(() => ctl.demo(), 700);
      }
      return CQ.run.when(taking);
    };
    const isRight = (v, want) => v != null && Math.abs(v - want) < 1e-9;
    // An equation solved, x's value in (the child's, or put in with them): Next comes in, bottom right, and
    // the next equation waits for its tap, or → (asked 2026-11-19: "next button add krdo x is value aane
    // pr… Next button tap, next question"). As after the last equation (its Next leads into the finale:
    // below), the question bar goes meanwhile, and the hand taps Next if the child waits. Next goes again
    // at the tap, so it is never there while an equation is being solved.
    const nextQuestion = async () => {
      CQ.caption.hide();
      CQ.next.showNext(true);
      const nudge = () => CQ.hand.tapAt(CQ.next.tapPoint());
      CQ.idle.arm(nudge, 8000);
      const next = CQ.next.listen();
      try {
        await CQ.run.when(next.promise);
      } finally {
        CQ.next.unlisten(next.id);
        if (CQ.idle.fn === nudge) CQ.idle.disarm(); // (after a jump elsewhere, that screen's own help stays)
      }
      // gone at once: a quick second tap would find it with nothing listening, and skip the practice
      CQ.next.showNext(false);
      if (CQ.hand.active) CQ.hand.stop();
    };

    async function runProblem(i, first) {
      const p = P.problems[i];
      // the equation: before the first one, written in big by itself as the voice gets to "equation"
      let eq;
      if (first) {
        const said = CQ.say("", { text: L.start, advance: "auto", pause: 300 });
        await CQ.run.when(CQ.caption.when(L.start, "an equation"));
        eq = await addRow(p.eq, "hero");
        await said;
      } else eq = await addRow(p.eq);
      // "Find the value of x.", said once: as it gets to x, x = □ comes in under the equation with the
      // tiles (the big equation taking its place at the top meanwhile)
      CQ.say("", { text: L.find, advance: "none" });
      await CQ.run.when(CQ.caption.when(L.find, L.find));
      const ctl = await ask("x", p.choices, eq.classList.contains("hero") ? () => eq.classList.remove("hero") : null);
      const v = await answer(ctl);
      const right = isRight(v, p.x);
      CQ.track("answer", { activity: "practice", eq: p.eq, choice: v, correct: right });
      if (right) {
        await CQ.run.when(ctl.right());
        await settle(ctl, true);
        praise(1150, 420); // each equation solved: praise, over a shower of confetti
        await CQ.run.wait(1400);
        return;
      }
      // wrong: the screen shakes and red light glows in from its corners, the number red in its box, and
      // nothing is said or written (asked 2026-11-19: "glat krne pr yh text ki need ni… bs shake krdo";
      // it was "Not quite! Let's solve it together."); then, as the light fades, the answer row and its
      // tiles go, the equation stays, and the steps are written under it
      await CQ.run.when(ctl.wrong(false));
      await CQ.run.wait(450);
      ctl.done();
      await drop([ctl.row, tray]);
      for (let k = 0; k < p.steps.length; k++) await solveStep(p.steps[k], k === p.steps.length - 1);
      await CQ.run.wait(1600);
    }
    // One step, said in the question bar: its working row written in as the voice says it, then its
    // answer row and tiles as the line ends. A wrong tile: the screen shakes and red light glows in from
    // its corners, the number goes back to its tile, struck out, and the child tries again, the step
    // staying in the bar; nothing is said or written (asked 2026-11-19; it was "Not quite!", and after a
    // second wrong tile "26 − 5 = 21." with the answer put in). After two, the right tile glows.
    async function solveStep(st, last) {
      CQ.say("", { text: st.say, advance: "none" });
      await CQ.run.when(CQ.caption.when(st.say, st.say.split(" ")[0]));
      await addRow(st.work);
      await CQ.run.when(CQ.caption.when(st.say, st.say));
      const ctl = await ask(st.get, st.choices);
      for (let miss = 0; ; miss++) {
        const v = await answer(ctl);
        if (isRight(v, st.answer)) {
          await CQ.run.when(ctl.right());
          await settle(ctl, last);
          if (last) praise(1150, 420);
          return;
        }
        if (v == null) return; // (no tile: the quest went on elsewhere meanwhile)
        CQ.track("answer", { activity: "practice", step: st.say, choice: v, correct: false, attempt: miss + 1 });
        await CQ.run.when(ctl.wrong(true));
        if (miss >= 1) ctl.glow(st.answer);
      }
    }

    try {
      for (let i = startAt || 0; i < P.problems.length; i++) {
        CQ.store.set("practiceAt", i);
        await drop([...work.children]); // the board cleared for the next equation
        await runProblem(i, i === 0);
        if (i < P.problems.length - 1) await nextQuestion(); // (the last one's Next is below: into the finale)
      }
      CQ.store.set("practiceAt", 0);
      // The last equation solved, the board stays, its working on it, until the child taps Next (or →),
      // and the finale comes straight in from it (asked 2026-11-19: "equation ke baad bacha next click
      // kre and direct yh aae"; and no "You solved all 6 equations!" screen: "This screen not
      // required"). The question bar goes, so "Find the value of x." isn't left over it. Behind the
      // board's dark the scene becomes the finale's meanwhile: the balance, Grumble, the bars and the
      // hanging Zippy fade away, unseen, so the last balance never shows before "Mission Complete!"
      // (until then the board closed on them, and they stood there a moment before the finale faded
      // them out). If the child waits, the hand taps Next.
      CQ.caption.hide();
      const W = CQ.world;
      [W.balanceLayer, W.grumbleLayer, W.barLayer, W.zippyLayer].forEach((l) => {
        l.style.opacity = "0"; // (what stays once the fade is done; resetScene brings them back)
        CQ.anim(l, [{ opacity: 1 }, { opacity: 0 }], { duration: 600, easing: CQ.EASE.in, keep: false, essential: true });
      });
      CQ.next.showNext(true); // (hidden while an equation is being solved)
      const nudge = () => CQ.hand.tapAt(CQ.next.tapPoint());
      CQ.idle.arm(nudge, 8000);
      const next = CQ.next.listen();
      try {
        await CQ.run.when(next.promise);
      } finally {
        CQ.next.unlisten(next.id);
        if (CQ.idle.fn === nudge) CQ.idle.disarm(); // (not the help of a screen chosen meanwhile)
      }
      CQ.next.showNext(false); // tapped: gone at once, so a quick second tap can't start the finale again
      CQ.hand.stop();
      wrap.classList.add("handover"); // the finale takes the board over and lifts its dark (CQ.activityFinale)
      CQ.flow.handOver = "finale";
    } finally {
      CQ.zippy.setVisible(true);
    }
  };

  // ------------------------------------------------------------------ Finale
  // Only the jungle and Zippy dancing (asked 2026-11-18: "nothing I want, only Zippy is dancing", the
  // voice-over, "without any text", "some magic things happen around him"). The balance, Grumble, the
  // bars and the hanging Zippy are not there (asked 2026-11-19: the last balance showed a moment before
  // it; now the child taps Next on the last practice equation and the board's dark lifts straight onto
  // the jungle); a burst of gold sparkles, and there Zippy stands on the paving, the crown on his head and his bag over his shoulder, dancing and laughing to the finale
  // music: one frame of his sheet per eighth note, so his 8 frames are one bar. Around him a soft gold
  // glow breathes, stars twinkle, gold specks float up, and at the start of every bar a little burst of
  // sparkles pops up somewhere round him. He laughs, and the narrator's line is heard (not shown in the
  // question bar). Then (asked 2026-11-18: "add a mission complete in a magical way in upper side. Upper
  // top. And monkey is dancing for 7 to 8 seconds. And then replay button will come in between. And
  // nothing"): "Mission Complete!" drops in across the top letter by letter, each with a little burst of
  // sparkles, stars twinkling round it and a wave of light running through its letters now and then; he
  // dances for four bars (8 s), then holds his pose, fist up and laughing; and the Play again button pops
  // up between the title and his crown, breathing gently, to play the quest again from the start.
  // Nothing else: the corner buttons (the screens list, Play this screen again) stay as everywhere.
  // Smooth: the frames sit side by side on one strip behind a window, and the strip slides (transform
  // only: nothing is redrawn), each frame landing on a whole pixel; the frame on show is worked out from
  // the clock at every screen refresh, so a late refresh never slows the dance or puts it out of step.
  // The magic runs as browser animations (transform and opacity). With Reduced motion he stands still,
  // laughing, and the magic is held lit.
  const DANCE = {
    x: 960, // stage px: the middle of his cell, between his feet...
    y: 1000, // ...and the paving under them
    scale: 1.25,
    beat: 250, // ms a frame: an eighth note of the finale music (120 BPM, js/audio.js)
    still: 2, // with Reduced motion: frame 2 (fist up, laughing)
    body: -280, // his middle, from his feet (stage px)
  };
  // Where the stars twinkle, from between his feet (stage px): all round him, clear of him, his raised
  // hand and his bag.
  // (the ones over his crown sit either side of the Play again button, clear of it)
  const STARS = [
    [-300, -470], [-360, -250], [-260, -90], [290, -500], [370, -300], [300, -110],
    [-340, -650], [340, -660], [-430, -420], [440, -170], [450, -460],
  ];
  const SPECKS = 22; // gold specks floating up from the paving round him
  const BAR = 2000; // ms: a bar of the finale music (8 frames); a sparkle burst on each
  const DANCE_FOR = 4 * BAR; // he dances four bars ("7 to 8 seconds"), then holds his pose
  const TITLE = { x: 960, y: 170 }; // "Mission Complete!": its middle, across the top, clear of the corner buttons
  const AGAIN = { x: 960, y: 350 }; // Play again: between the title and his crown
  // stars twinkling round the title, from its middle (stage px), clear of its letters
  const TITLE_STARS = [[-640, -50], [655, -40], [-590, 70], [600, 75], [-700, 20], [710, 25]];

  CQ.activityFinale = async function () {
    const s = window.SPRITES.zippy_dance;
    const still = CQ.motion.reduced;
    const wrap = CQ.el("div", "activity finale-act", CQ.ui.overlay);
    const back = CQ.el("div", "finale-magic", wrap); // behind him: the glow and the specks
    const glow = CQ.el("div", "finale-glow", back);
    CQ.pos(glow, DANCE.x, DANCE.y + DANCE.body);
    const shadow = CQ.el("div", "finale-shadow", wrap);
    CQ.pos(shadow, DANCE.x, DANCE.y);

    // Zippy: a window one frame big, and the strip of frames inside it
    const fw = Math.round(s.w * DANCE.scale);
    const fh = Math.round(s.h * DANCE.scale);
    const k = fw / s.w;
    const fig = CQ.el("div", "finale-dancer", wrap);
    CQ.box(fig, DANCE.x - s.ax * k, DANCE.y - s.ay * k, fw, fh);
    fig.style.transformOrigin = `${s.ax * k}px ${s.ay * k}px`; // he grows from his feet
    const strip = CQ.el("img", "finale-strip", fig);
    strip.alt = "";
    strip.draggable = false;
    strip.src = s.src;
    CQ.box(strip, 0, 0, fw * s.count, fh);
    const show = (f) => (strip.style.transform = `translate3d(${-(f - 1) * fw}px, 0, 0)`);
    show(still ? DANCE.still : 1);
    const front = CQ.el("div", "finale-magic", wrap); // in front: the stars
    [back, shadow, fig, front].forEach((e) => e.setAttribute("aria-hidden", "true")); // (only the title and the button are read)

    // "Mission Complete!" across the top, its letters waiting to drop in (the name titles' gold letters in
    // a dark edge: CQ.nameBurst's look), and the Play again button, waiting for the dance to end
    const c = C().finale;
    const title = CQ.el("div", "nameburst orange finale-title", wrap);
    title.setAttribute("role", "heading");
    title.setAttribute("aria-level", "1");
    title.setAttribute("aria-label", c.title);
    CQ.pos(title, TITLE.x, TITLE.y);
    const word = CQ.el("div", "nb-word", title);
    word.setAttribute("aria-hidden", "true");
    const letters = Array.from(c.title).map((ch) => {
      const l = CQ.el("span", "nb-ch" + (ch === " " ? " gap" : ""), word, ch === " " ? "\u00a0" : ch);
      l.setAttribute("data-ch", ch === " " ? "\u00a0" : ch);
      l.style.opacity = "0";
      return l;
    });
    const titleStars = TITLE_STARS.map(([dx, dy]) => {
      const st = CQ.el("div", "sparkle finale-star", front);
      CQ.pos(st, TITLE.x + dx, TITLE.y + dy);
      return st;
    });

    // the magic round him (built while he is still unseen)
    const loop = (el, kf, dur, delay, opts) =>
      el.animate(kf, Object.assign({ duration: dur, delay: -delay, iterations: Infinity, easing: "ease-in-out" }, opts));
    STARS.forEach(([dx, dy], i) => {
      const st = CQ.el("div", "sparkle finale-star", front);
      CQ.pos(st, DANCE.x + dx + CQ.rand(-18, 18), DANCE.y + dy + CQ.rand(-18, 18));
      const size = CQ.rand(0.75, 1.3).toFixed(2);
      if (still) return (st.style.transform = `translate(-50%,-50%) scale(${(size * 0.8).toFixed(2)})`);
      const at = (sc, r) => `translate(-50%,-50%) scale(${(sc * size).toFixed(2)}) rotate(${r}deg)`;
      const dur = CQ.rand(1800, 2800);
      loop(st, [
        { transform: at(0, 0), opacity: 0 },
        { transform: at(1, 45), opacity: 1, offset: 0.3 },
        { transform: at(0.8, 75), opacity: 0.9, offset: 0.5 },
        { transform: at(0, 120), opacity: 0, offset: 0.8 },
        { transform: at(0, 120), opacity: 0 },
      ], dur, (i / STARS.length) * dur);
    });
    if (!still)
      for (let i = 0; i < SPECKS; i++) {
        const sp = CQ.el("div", "finale-speck", back);
        CQ.pos(sp, DANCE.x + CQ.rand(-420, 420), DANCE.y + CQ.rand(-60, 10));
        const size = CQ.rand(0.6, 1.3).toFixed(2);
        const dx = CQ.rand(-70, 70);
        const up = CQ.rand(380, 640);
        const dur = CQ.rand(3600, 6000);
        loop(sp, [
          { transform: `translate(-50%,-50%) scale(${size})`, opacity: 0 },
          { transform: `translate(-50%,-50%) translate(${dx * 0.3}px, ${-up * 0.25}px) scale(${size})`, opacity: 1, offset: 0.25 },
          { transform: `translate(-50%,-50%) translate(${dx}px, ${-up}px) scale(${size * 0.4})`, opacity: 0 },
        ], dur, (i / SPECKS) * dur, { easing: "linear" });
      }

    // a little burst of sparkles somewhere round him (each sparkle goes when it has faded)
    const burst = () => {
      const [dx, dy] = CQ.pick(STARS);
      const x = DANCE.x + dx * 0.9;
      const y = DANCE.y + dy * 0.9;
      for (let i = 0; i < 5; i++) {
        const sp = CQ.el("div", "sparkle finale-star", front);
        CQ.pos(sp, x + CQ.rand(-50, 50), y + CQ.rand(-50, 50));
        const at = (sc, r) => `translate(-50%,-50%) scale(${sc.toFixed(2)}) rotate(${r}deg)`;
        const sc = CQ.rand(0.5, 1);
        sp.animate([
          { transform: at(0, 0), opacity: 0 },
          { transform: at(sc, 60), opacity: 1, offset: 0.35 },
          { transform: at(0, 140), opacity: 0 },
        ], { duration: CQ.rand(700, 1000), delay: i * 70, easing: "ease-out", fill: "both" }).finished.then(() => sp.remove(), () => sp.remove());
      }
    };

    // the dance: the frame for this moment, at every screen refresh, for four bars; then he holds his pose
    let t0 = 0;
    let shown = 0;
    let bar = 0;
    let danced;
    const danceOver = new Promise((r) => (danced = r));
    const dance = () => {
      if (still) return danced();
      strip.style.willChange = "transform"; // (only while he dances)
      const off = CQ.ticker.add((dt, now) => {
        if (!wrap.isConnected) return off(); // another screen has been chosen
        if (!t0) t0 = now;
        if (now - t0 >= DANCE_FOR) {
          off();
          show((shown = DANCE.still)); // fist up, laughing
          strip.style.willChange = "";
          return danced();
        }
        const f = (Math.floor((now - t0) / DANCE.beat) % s.count) + 1;
        if (f !== shown) show((shown = f));
        const b = Math.floor((now - t0) / BAR) + 1;
        if (b !== bar) {
          bar = b;
          burst();
        }
      });
    };

    // The title comes in: each letter drops in from above and lands with a little pop, one after the
    // other, a few sparkles bursting from every other one as it lands; then the stars round it twinkle,
    // and every few seconds a wave of light runs through the letters (each lifts and swells a little in
    // turn). With Reduced motion the letters simply fade in, one after the other, and stay still.
    const titleIn = () => {
      CQ.audio.play("name.burst");
      letters.forEach((l, i) => {
        const kf = still ? [{ opacity: 0 }, { opacity: 1 }] : [{ transform: "translateY(-150px) scale(.4)", opacity: 0 }, { transform: "translateY(0) scale(1)", opacity: 1 }];
        CQ.anim(l, kf, { duration: still ? 300 : 520, delay: i * (still ? 40 : 85), easing: CQ.EASE.back, keep: false, essential: true }).then(() => {
          l.style.opacity = "";
          if (still || !wrap.isConnected || l.classList.contains("gap")) return;
          if (i % 2 === 0) {
            const p = CQ.centerOf(l);
            if (p) CQ.fx.sparkle(front, p.x, p.y, 4, 70);
          }
          // the wave of light, every 3.6 s, running from the first letter to the last
          loop(l, [
            { transform: "translateY(0) scale(1)" },
            { transform: "translateY(-12px) scale(1.12)", offset: 0.07 },
            { transform: "translateY(0) scale(1)", offset: 0.15 },
            { transform: "translateY(0) scale(1)" },
          ], 3600, -(1400 + i * 60), { easing: "ease-in-out" });
        });
      });
      titleStars.forEach((st, i) => {
        const size = 0.8 + (i % 3) * 0.2;
        if (still) {
          st.style.transform = `translate(-50%,-50%) scale(${size * 0.8})`;
          return CQ.anim(st, [{ opacity: 0 }, { opacity: 1 }], { duration: 400, delay: 400 + i * 120, essential: true });
        }
        const at = (sc, r) => `translate(-50%,-50%) scale(${(sc * size).toFixed(2)}) rotate(${r}deg)`;
        loop(st, [
          { transform: at(0, 0), opacity: 0 },
          { transform: at(1, 45), opacity: 1, offset: 0.3 },
          { transform: at(0.8, 75), opacity: 0.9, offset: 0.5 },
          { transform: at(0, 120), opacity: 0, offset: 0.8 },
          { transform: at(0, 120), opacity: 0 },
        ], 2200, -(i * 380) - 1400);
      });
    };
    // Play again pops up between the title and him, with a burst of sparkles, and breathes gently (CSS)
    // to be tapped: the quest starts again from the beginning.
    const againIn = () => {
      const holder = CQ.el("div", "finale-again", wrap);
      CQ.pos(holder, AGAIN.x, AGAIN.y);
      const btn = CQ.button("btn-wood", `${CQ.ICON.restart}<span>${c.replay}</span>`, c.replay, holder, () => {
        btn.disabled = true;
        CQ.audio.play("ui.tap");
        CQ.flow.chapter("intro");
      });
      CQ.audio.play("ui.pop");
      CQ.anim(holder, [{ scale: "0.3", opacity: 0 }, { scale: "1", opacity: 1 }], { duration: 520, easing: CQ.EASE.back, keep: false, essential: true }).then(() => holder.classList.add("on"));
      if (!still) CQ.fx.sparkle(front, AGAIN.x, AGAIN.y, 14, 220);
    };

    // his sheet ready to show (it is loaded with the game; this only waits for it on a slow device)
    if (strip.decode) await CQ.run.when(strip.decode().catch(() => {}));

    // The scene is only the jungle from the start (the balance, Grumble, the bars and the hanging Zippy
    // are gone: js/flow.js, resetScene). Handed the last practice board (the child tapped Next on it),
    // its dark lifts as a burst of sparkles comes where he will stand...
    const board = CQ.ui.overlay.querySelector(".activity.handover");
    CQ.audio.music("finale");
    CQ.audio.play("bar.merge");
    if (board) {
      CQ.soft.set("activity", false); // the jungle sharp again as the dark lifts
      CQ.anim(board, [{ opacity: 1 }, { opacity: 0 }], { duration: 600, easing: CQ.EASE.in, essential: true }).then(() => board.remove());
    }
    CQ.fx.sparkle(front, DANCE.x, DANCE.y + DANCE.body, 18, 240);
    await CQ.run.wait(350);
    // ...and there he is, dancing
    CQ.audio.play("fanfare");
    CQ.anim(glow, [{ opacity: 0 }, { opacity: 0.75 }], { duration: 900, easing: "ease-out", essential: true }).then(() => {
      if (!still && glow.isConnected)
        loop(glow, [
          { transform: "translate(-50%,-50%) scale(.94)", opacity: 0.6 },
          { transform: "translate(-50%,-50%) scale(1.06)", opacity: 0.9 },
        ], 2000, 0, { direction: "alternate" }); // breathing with the music, a bar each way
    });
    CQ.anim(shadow, [{ opacity: 0 }, { opacity: 1 }], { duration: 500, easing: "ease-out", essential: true });
    CQ.anim(
      fig,
      still ? [{ opacity: 0 }, { opacity: 1 }] : [{ opacity: 0, transform: "scale(.6)" }, { opacity: 1, transform: "scale(1)" }],
      { duration: still ? 300 : 600, easing: CQ.EASE.back, essential: true }
    );
    dance();
    const danceStart = performance.now();
    // the title, as he lands
    await CQ.run.wait(600);
    titleIn();
    await CQ.run.wait(300);
    // he laughs, then the narrator (not in the question bar: only the title is written on this screen);
    // the voice goes on by itself, the button doesn't wait for it
    (async () => {
      CQ.audio.play("zippy.win", { volume: 1.3 });
      await CQ.run.wait(Math.max(0, ((C().audio && C().audio.winLaugh) || 1.2) * 1000 - 300));
      const text = CQ.T("fin-1");
      await CQ.run.when(CQ.audio.speak(CQ.speakable(text), { who: "narrator", line: text }));
    })().catch(() => {}); // (cancelled: another screen was chosen)
    // the dance over (with Reduced motion he stands still meanwhile), he strikes his pose; then Play again
    await CQ.run.when(danceOver);
    const left = DANCE_FOR - (performance.now() - danceStart);
    if (still && left > 0) await CQ.run.wait(left);
    if (!still) CQ.anim(fig, [{ transform: "scale(1)" }, { transform: "scale(1.07)", offset: 0.4 }, { transform: "scale(1)" }], { duration: 460, easing: "ease-out", keep: false, essential: true });
    await CQ.run.wait(500);
    againIn();
    await CQ.run.when(new Promise(() => {})); // the screen stays: Play again, the menu or ↻ ends it
  };
})();
