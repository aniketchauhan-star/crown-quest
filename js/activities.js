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
  // (CQ.balance.present). Then the equation is written in at the left, one sign at a time (review,
  // 2026-11-08: "the balance on the right and the equation steps on the left"). The part of
  // the balance a beat talks about lights up: the crown for x, a pan for a side, both pans when the
  // sides are equal. Each beat adds tags, boxes and highlights: what stays the same from one beat to
  // the next stays still, and what is new fades in where it stays, one piece at a time. The question
  // bar above says the line. Zippy isn't on this screen: the balance and the maths have it to
  // themselves. On closing, the maths fades and the view glides back to the whole scene.
  // the view: the balance at the right (x 910–1800 on screen), room at the left (x 50–890) for the maths
  // (review, 2026-11-08: "the balance on the right and the equation steps on the left", as the
  // reviewer's screenshots show; from 2026-11-07 it was the other way round). (With free: true and an x
  // past the middle, a view could look past the scene's right edge, where the scene goes on in a mirror
  // image: js/world.js, mirrorBackground. Not needed this way round.)
  const ASIDE = { x: 760, y: 472, z: 1.25 };
  CQ.ASIDE = ASIDE; // (the check uses it too: CQ.checkPanel in js/ui.js)
  // The gold frame round a part of the balance, the rest of it faded (CQ.focus): "crown", "left" (pan),
  // "right", "both" (pans), "level" or "whole" (the whole balance). Anything else: no frame.
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
      if (this.sub !== sub || !asCoins) return;
      glideLeft(() => b.items.left.forEach((it) => (it.slot = "group"))); // all the coins, one group
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
      level: () => [...CQ.world.balanceLayer.querySelectorAll(".bal-art, .pan-item")],
    };
    parts.whole = parts.level;
    if (!parts[part]) {
      CQ.focus.off();
      return false;
    }
    CQ.focus.on(parts[part], { pad: 20, radius: 26, quiet: true });
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
      CQ.balance.present(false);
      CQ.soft.set("notebook", false);
      await CQ.camera.to(960, 540, 1, 1300); // back to the whole scene
      if (n === this.opens) await CQ.run.hold(CQ.PACE.settle); // a moment before the story goes on
    },
    hideNow() {
      this.isOpen = false;
      this.opens++;
      this.shown = null;
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
    // s.cue = { title, outline (the outline and its label), label, hl, lhs, rhs }; x's power (x¹):
    // s.power = { in, out }.
    render(s) {
      const sig = JSON.stringify(s);
      if (this.shown && this.shown.sig === sig) return this.content.querySelector(".eqn");
      const c = this.content;
      c.innerHTML = "";
      CQ.balance.glowSides(false); // (a beat's pans glow only in that beat)
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
        const had = (was || "").split(" ");
        const waits = want.filter((k) => ["hl", "lhs", "rhs"].includes(k) && s.cue && s.cue[k] && !had.includes(k));
        const start = want.filter((k) => !waits.includes(k)).join(" ");
        if (was == null) {
          if (!waits.length) return;
          was = start;
        }
        if (was === now) return;
        t.className = was;
        void t.offsetWidth; // the old look is drawn first, so the change runs as a CSS transition
        t.className = start;
        waits.forEach((k) => this.onCue(s.cue[k], sig, () => t.classList.add(k)));
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
        CQ.pos(p, inkX(t).x1 - 2, t.offsetTop + t.offsetHeight * 0.02);
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
      if (s.rows) {
        const rows = CQ.el("div", "nb-rows", c);
        s.rows.forEach((r) => {
          const el = add(CQ.el("div", "nb-row " + (r.cls || ""), rows, CQ.rich(r.t)), "row:" + r.t);
          if (r.cue) el.dataset.cue = r.cue; // it waits until the voice says this
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
        // a wide tag slides along to stay on the screen and clear of the balance; its line still lands on it
        const half = tag.offsetWidth / 2;
        const lo = -eqn.offsetLeft - this.stage.offsetLeft + 24 + half;
        const hi = this.stage.offsetWidth - eqn.offsetLeft + 30 - half;
        CQ.pos(tag, Math.max(lo, Math.min(hi, r.cx)), y);
        if (t.cue) c.querySelectorAll(`[data-key="${CSS.escape(key)}"]`).forEach((el) => (el.dataset.cue = t.cue)); // it waits until the voice says this
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
      this.shown = { sig, keys, toks, bal: s.bal };
      // things a beat does as the voice gets to its words (s.steps: { cue, bal, pans, sub, restore,
      // tilt, flash }; a step with no cue happens at once): bal moves the frame to that part of the
      // balance (null: no frame); pans: the left pan glows like the LHS and the right pan like the RHS;
      // sub: that value is put in for x on the balance (substitute); restore: the crown is put back;
      // tilt: the balance tips (or levels) the way its pans now weigh; flash: its hub flashes (level)
      const runStep = (st) => {
        if ("bal" in st) {
          this.light(st.bal, this.shown.bal);
          this.shown.bal = st.bal;
        }
        if (st.pans) CQ.balance.glowSides(true);
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
    onCue(str, sig, fn) {
      const line = this.lineText;
      const t0 = performance.now();
      const tick = () => {
        if (!this.shown || this.shown.sig !== sig) return;
        const cap = CQ.caption;
        if ((cap.text === line && cap.reached(str)) || performance.now() - t0 > 15000) return fn();
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
    // A frame goes round the part of the balance this beat is about, and the rest of the balance fades
    // (CQ.focus: its window and gold ring; the maths stays bright above it). Returns whether the frame
    // moved to something new.
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
    // Run a list of beats with Next / Back. opts.lower: the equation sits lower on the screen (review,
    // 2026-11-07: "It can be little below"), for the runs with little written under it (the words, the
    // linear equation); trying values fills the screen under it, so that run keeps it higher.
    async run(beats, opts) {
      this.content.classList.toggle("lower", !!(opts && opts.lower));
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
    { id: "l4-10", s: { hl: ["x"], crown: true, bal: "crown" } },
    // the Variable tag comes in as the voice says "…our variable is x" (review, 2026-11-07: "This
    // should come when we say here x is our variable and its value is unknown")
    { id: "l4-11", s: { hl: ["x"], crown: true, bal: "crown", tags: [{ ids: "x", text: "Variable", color: "var", cue: "our variable is x" }] }, gem: "variable" },
    // No box round x + 2, so its labels read clearly; each label comes in as the voice names it (review,
    // 2026-11-07: "We don't need a box around x + 2 so that the labelling becomes clear. Labelling
    // should come synced with VO.")
    { id: "l4-12", s: { mini: true, bal: "left" } },
    {
      id: "l4-13",
      s: {
        mini: true,
        bal: "left",
        tags: [
          { ids: "x", text: "variable", color: "var", cue: "x is a variable" },
          { ids: "plus", text: "addition", color: "op", row: 1, cue: "We add" },
          { ids: "two", text: "constant", color: "const", cue: "2 is a constant" },
        ],
      },
      gem: "constant",
    },
    { id: "l4-14", s: { bal: "left", tags: [{ ids: LHS, text: "Algebraic expression", color: "expr", bracket: true, cue: "the algebraic expression" }] }, gem: "expression" },
    { id: "l4-15", s: { pulse: ["eq"], bal: "level" } },
    // the outline and its Equation label come at the end of the line, under the equation (review,
    // 2026-11-07: "equation should come at the end of the VO"; "it can come below")
    { id: "l4-16", s: { outline: true, outlineLabel: "Equation", cue: { outline: "an equation." }, bal: "level" }, gem: "equation" },
    // As the voice says "the expression to the left of the equals sign", x + 2 turns teal and a box is
    // drawn round it; its label only comes in as the voice names it ("the left-hand side"). The same
    // for 7 and the right-hand side. The = stays outside both boxes. (Review, 2026-11-07: "Please sync
    // the animations with the VO… Keep both labels hidden initially and leave the equal sign outside
    // the boxes.")
    {
      id: "l4-17",
      s: {
        lhs: true,
        bal: "left",
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
        bal: "right",
        cue: { rhs: "to the right" },
        tags: [
          { ids: LHS, text: "Left-hand side (LHS)", color: "lhs", box: true },
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
    // Trying 4, then 5, on the balance as well as in the equation (review, 2026-11-07): as the voice
    // says "Replace x with 4", the x becomes 4 and the crown on the left pan becomes four unit coins,
    // beside the two coins there, then all six gather into one group. Each side is worked out as the
    // voice says it, its pan framed; then 6 ≠ 7 and the balance tips, the right pan lower (7 > 6), and
    // "So, 4 is not a solution." The crown comes back for 5, the same, and the balance stays level
    // (7 = 7). No frame round both pans.
    { id: "l4-25", s: { x: 4, cue: { x: "Replace x with 4" }, steps: [{ cue: "Replace x with 4", sub: 4 }] } },
    {
      id: "l4-26",
      s: {
        x: 4,
        lhs: true,
        rhs: true,
        cue: { lhs: "The left side", rhs: "the right side" },
        rows: [
          { t: "LHS = 4 + 2 = 6", cue: "The left side equals 6" },
          { t: "RHS = 7", cue: "the right side equals 7" },
          { t: "6 ≠ 7", cls: "big no", cue: "different" },
          { t: "So, 4 is not a solution.", cls: "no", cue: "so 4 is not a solution" },
        ],
        steps: [{ sub: 4 }, { cue: "The left side", bal: "left" }, { cue: "the right side", bal: "right" }, { cue: "different", bal: null, tilt: true }],
      },
    },
    { id: "l4-27", s: { x: 5, cue: { x: "Replace x with 5" }, steps: [{ restore: true }, { cue: "Replace x with 5", sub: 5 }] } },
    {
      id: "l4-28",
      s: {
        x: 5,
        lhs: true,
        rhs: true,
        cue: { lhs: "Both sides", rhs: "Both sides" },
        rows: [
          { t: "LHS = 5 + 2 = 7", cue: "Both sides" },
          { t: "RHS = 7", cue: "Both sides" },
          { t: "7 = 7", cls: "big ok", cue: "equal 7" },
        ],
        steps: [{ sub: 5 }, { cue: "Both sides", pans: true }, { cue: "equal 7", tilt: true, flash: true }],
      },
    },
    {
      id: "l4-29",
      s: {
        x: 5,
        lhs: true,
        rhs: true,
        rows: [
          { t: "LHS = 5 + 2 = 7" },
          { t: "RHS = 7" },
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
  CQ.NB_LINEAR = [
    { id: "l4-19", s: { hl: ["x"], crown: true, cue: { hl: "one variable" }, bal: "crown" } },
    { id: "l4-20", s: { hl: ["x"], crown: true, power: { in: "its power is 1", out: "leave the 1" }, bal: "crown" } },
    { id: "l4-21", s: { hl: ["x"], crown: true, power: { in: "highest power is 1" }, bal: "crown" } },
    { id: "l4-22", s: { outline: true, cue: { outline: "a linear equation" }, bal: "whole" }, gem: "linear" },
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
    const rx = R(["x"]);
    const rl = R(["four", "x", "plus", "three"]);
    const rr = R(["r"]);
    const xInk = inkX(tok("x"));
    const eqInk = inkX(tok("eq"));
    const xMid = (xInk.x0 + xInk.x1) / 2; // the middle of the x itself (not of 4x)
    // Each box sits right over or under the part it names, joined to it by one straight line that ends
    // in a dot on the part (review, 2026-11-07: the faint grey brackets ran together, so it was hard to
    // tell which box points to what):
    //   Variable: right over x, its short line ending on x itself;
    //   Equation: one bracket over the whole of 4x + 3 = 19, its box over the bracket's right end, well
    //   clear of the Variable box;
    //   LHS, RHS: under their own brackets, under 4x + 3 and under 19; the = is outside both brackets.
    // (Equation coordinates.)
    const brace = (x0, x1, y, up, cls) => {
      const e = CQ.el("div", "brace " + (up ? "up " : "down ") + cls, d);
      CQ.box(e, x0, y, x1 - x0, 30);
      return e;
    };
    const braces = {
      Equation: brace(ra.x - 12, ra.x + ra.w + 12, ra.y - 34, true, "c-eq"),
      LHS: brace(rl.x - 10, Math.min(rl.x + rl.w + 10, eqInk.x0 - 16), rl.y + rl.h + 6, false, "c-lhs"),
      RHS: brace(Math.max(rr.x - 10, eqInk.x1 + 16), rr.x + rr.w + 10, rr.y + rr.h + 6, false, "c-rhs"),
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
      t.misses = 0;
      t.ready = false;
      t.addEventListener("click", () => ctl.tapTarget(t));
      targets.push(t);
      return t;
    };
    const topY = ra.y - 132;
    const botY = ra.y + ra.h + 96;
    const half = 48; // half a box's height, with its border
    const xEq = ra.x + ra.w - 110;
    mk("Variable", xMid, topY);
    mk("Equation", xEq, topY);
    mk("LHS", rl.cx, botY);
    mk("RHS", rr.cx, botY);
    const LW = 6; // the lines' thickness
    const leads = {
      Variable: leadLine(d, xMid, topY + half, rx.y - 8, "c-var hop", LW), // through the bracket, onto x
      Equation: leadLine(d, xEq, topY + half, ra.y - 31, "c-eq", LW),
      LHS: leadLine(d, rl.cx, botY - half, rl.y + rl.h + 33, "c-lhs", LW),
      RHS: leadLine(d, rr.cx, botY - half, rr.y + rr.h + 33, "c-rhs", LW),
    };
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

    let filled = 0;
    let selected = null;
    let finish;
    let nextPair;
    const done = new Promise((r) => (finish = r));
    const firstPairIn = new Promise((r) => (nextPair = r));
    const chips = [];
    const ctl = {
      busy: false,
      hover(p) {
        targets.forEach((t) => t.classList.toggle("hover", t.ready && !t.done && inRect(p, rectOf(t, 30))));
      },
      targetAt(p) {
        return targets.find((t) => t.ready && !t.done && inRect(p, rectOf(t, 40)));
      },
      select(el) {
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
      async drop(el, t) {
        if (el.label === t.answer) {
          el.placed = true;
          t.done = true;
          el.classList.remove("glow"); // (a hint's glow stops once it is in)
          el.classList.add("placed", COLOR[t.answer]);
          const tc = rectOf(t);
          CQ.pos(el, (tc.x0 + tc.x1) / 2, (tc.y0 + tc.y1) / 2);
          t.classList.add("ok");
          t.setAttribute("aria-label", t.answer);
          // the label's colour runs down its line, then its part lights up in it
          leads[t.answer].classList.add("on");
          setTimeout(() => {
            if (braces[t.answer]) braces[t.answer].classList.add("on");
            parts[t.answer].forEach((id) => tok(id).classList.add("glow-" + colors[t.answer]));
          }, 420);
          // A right label gets a short success sound and its box's border turns green (styles.css), and
          // nothing is said or written: the question bar keeps the instruction (review, 2026-11-07: "For
          // correct responses, remove the spoken and written feedback… Keep the instruction panel
          // unchanged"). After a hint it goes back to the instruction, shown, not said again.
          CQ.audio.play("correct");
          CQ.fx.sparkle(CQ.ui.layer, (tc.x0 + tc.x1) / 2, (tc.y0 + tc.y1) / 2, 8, 70);
          CQ.track("answer", { activity: "label", box: t.answer, choice: el.label, correct: true });
          if (CQ.caption.text !== c.title) CQ.say("", { text: c.title, advance: "none", quiet: true });
          filled++;
          const last = filled === targets.length;
          const turn = filled === PAIRS[0].length; // the first pair is in: the second comes next
          // a moment to see it go in (its line and part light up) before what comes next
          if (last) CQ.run.wait(1100).then(finish, () => {});
          else if (turn) CQ.run.wait(1100).then(nextPair, () => {});
        } else {
          t.misses++;
          CQ.track("answer", { activity: "label", box: t.answer, choice: el.label, correct: false, attempt: t.misses });
          CQ.audio.play("tryagain");
          el.from = { x: parseFloat(el.style.left), y: parseFloat(el.style.top) };
          el.goHome();
          CQ.anim(t, [{ transform: "translate(-50%,-50%) translateX(0)" }, { transform: "translate(-50%,-50%) translateX(-10px)" }, { transform: "translate(-50%,-50%) translateX(10px)" }, { transform: "translate(-50%,-50%) translateX(0)" }], { duration: 300, keep: false });
          // straight to what this box names; from the second miss on it, the right label glows too
          CQ.say("", { text: c.miss[t.answer], advance: "none" });
          if (t.misses >= 2) {
            const right = chips.find((ch) => ch.label === t.answer && !ch.placed);
            if (right) right.classList.add("glow");
          }
        }
      },
    };
    const rowY = 862;
    // A pair's boxes come in one at a time, the way they would be drawn (its bracket, the line drawn out
    // from its part, the empty box); then the pair's labels into the tray, one by one.
    const bringIn = async (k) => {
      for (const name of PAIRS[k]) {
        const t = targets.find((x) => x.answer === name);
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
        makeChip(el, { x: 840 + i * 240, y: rowY }, ctl);
        chips.push(el);
        hideAll([el]);
        comeIn(el, "rise", 360);
        await CQ.run.wait(180);
      }
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
    const tokens = [...eqn.querySelectorAll(".tok")];
    hideAll([...tokens, ...Object.values(braces), ...Object.values(leads), ...targets]);
    const said = CQ.say("", { text: c.title, advance: "auto", pause: 100 });
    await CQ.run.wait(350);
    for (const t of tokens) {
      comeIn(t, "rise", 360);
      await CQ.run.wait(170);
    }
    await CQ.run.wait(300);
    await bringIn(0);
    await said;
    showHow(chips.find((ch) => ch.label === "Variable"));
    CQ.idle.arm(() => {
      const ch = chips.find((x) => !x.placed);
      if (ch) showHow(ch);
    }, 9000);
    await CQ.run.when(firstPairIn);
    CQ.hand.stop();
    await bringIn(1);
    CQ.idle.reset();
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
    // what a label's part does when the label comes in: it lights up in its colour (x in its gold box,
    // as on the formula screen; the sides in their colours; the equation has its bracket)
    const lit = (ids, cls) => () => ids.forEach((id) => eqn.querySelector(`.tok[data-id="${id}"]`).classList.add(cls));
    if (show.includes("variable")) {
      const t = tag("c-var", labels.variable, rx.cx, above);
      parts.push({ name: "variable", lead: line(rx.cx, above, rx.y - 4, "c-var" + (show.includes("equation") ? " hop" : "")), tag: t, light: lit(["x"], "glow-var") });
    }
    if (show.includes("equation")) {
      const br = brace(all, true, "c-eq");
      const xe = show.includes("variable") ? Math.max(all.cx + 70, rx.cx + 170) : all.cx;
      const t = tag("c-eq", labels.equation, xe, above);
      parts.push({ name: "equation", brace: br, lead: line(xe, above, all.y - 19, "c-eq"), tag: t, light: () => {} });
    }
    const below = (r) => r.y + r.h + 36; // the top of a label under the equation
    if (show.includes("lhs") || show.includes("rhs")) eqn.closest(".rc-panel").classList.add("labels-below"); // a little higher, clear of the words
    if (show.includes("lhs")) {
      const br = brace(rl, false, "c-lhs");
      const t = tag("c-lhs", labels.lhs, rl.cx, below(rl), true);
      parts.push({ name: "lhs", brace: br, lead: line(rl.cx, below(rl), rl.y + rl.h + 19, "c-lhs"), tag: t, light: lit(["x", "plus", "four"], "glow-lhs") });
    }
    if (show.includes("rhs")) {
      const br = brace(rr, false, "c-rhs");
      const t = tag("c-rhs", labels.rhs, rr.cx, below(rr), true);
      parts.push({ name: "rhs", brace: br, lead: line(rr.cx, below(rr), rr.y + rr.h + 19, "c-rhs"), tag: t, light: lit(["nine"], "glow-rhs") });
    }
    parts.forEach((p) => [p.brace, p.lead, p.tag].forEach((e) => e && (e.style.opacity = "0")));
    return parts;
  }
  // Where a token's sign is actually drawn (its ink, not its padded box), across, in equation
  // coordinates: { x0, x1 }.
  function inkX(t) {
    const cs = getComputedStyle(t);
    const ctx = (inkX.ctx = inkX.ctx || document.createElement("canvas").getContext("2d"));
    ctx.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
    const m = ctx.measureText(t.textContent);
    const start = t.offsetLeft + parseFloat(cs.paddingLeft) + parseFloat(cs.borderLeftWidth);
    return { x0: start - m.actualBoundingBoxLeft, x1: start + m.actualBoundingBoxRight };
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
    // A part, as the voice names it: it lights up (x in its gold box, x + 4 teal, 9 orange; the whole
    // equation gets its bracket), then the dot on it and the line drawn out to its label, and the word
    // written in.
    const nameIt = async (part, text, cue) => {
      await CQ.run.when(untilSaid(text, cue));
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
    // the whole summary on the one equation, for a good look, then on to the next screen by itself
    await W(4500);
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
