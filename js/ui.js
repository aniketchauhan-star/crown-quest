/*
 * Zippy's Crown Quest: user interface.
 * HUD, captions + narration, Next/Back, the SWAP button, speech bubbles, comic sound words,
 * name bursts, spotlight, thought bubbles, hand demos, word gems + Word Treasure, menu, confirm,
 * the Check panel (LHS/RHS with number pickers) and the equation board.
 */
(function () {
  "use strict";
  const CQ = window.CQ;
  const C = () => window.CONTENT;

  // ------------------------------------------------------------------ icons
  const ICON = {
    speaker:
      '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M7 18h8l11-9v30l-11-9H7z" fill="currentColor" stroke="#5E3415" stroke-width="3" stroke-linejoin="round"/><path d="M31 17c2.6 2 4 4.6 4 7s-1.4 5-4 7M36 11c4.4 3.3 7 8 7 13s-2.6 9.7-7 13" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round"/></svg>',
    restart:
      '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M38 24a14 14 0 1 1-4.1-9.9" fill="none" stroke="currentColor" stroke-width="7" stroke-linecap="round"/><path d="M29 6l9 8-11 5z" fill="currentColor" stroke="currentColor" stroke-width="3" stroke-linejoin="round"/></svg>',
    menu: '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M10 13h28M10 24h28M10 35h28" stroke="currentColor" stroke-width="7" stroke-linecap="round"/></svg>',
    next: '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M15 8l26 16-26 16z" fill="currentColor" stroke="#6B3E00" stroke-width="3.5" stroke-linejoin="round"/></svg>',
    back: '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M33 8L7 24l26 16z" fill="currentColor" stroke="#6B3E00" stroke-width="3.5" stroke-linejoin="round"/></svg>',
    swap: '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M8 17h28M28 9l9 8-9 8M40 31H12M20 23l-9 8 9 8" fill="none" stroke="currentColor" stroke-width="5.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    close: '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M13 13l22 22M35 13L13 35" stroke="currentColor" stroke-width="7" stroke-linecap="round"/></svg>',
    check: '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M10 25l9 9 19-20" fill="none" stroke="currentColor" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  };
  CQ.ICON = ICON;
  CQ.gemSVG = (color, size) => {
    const s = size || 64;
    return `<svg class="gem" viewBox="0 0 64 56" width="${s}" height="${(s * 56) / 64}" aria-hidden="true">
      <polygon points="14,3 50,3 61,18 32,53 3,18" fill="${color}" stroke="#3a2a10" stroke-width="3" stroke-linejoin="round"/>
      <polygon points="14,3 22,18 32,3" fill="#fff" opacity=".45"/><polygon points="32,3 42,18 50,3" fill="#fff" opacity=".22"/>
      <polygon points="3,18 22,18 32,53" fill="#000" opacity=".1"/><polygon points="42,18 61,18 32,53" fill="#000" opacity=".22"/>
      <polyline points="3,18 61,18" stroke="#3a2a10" stroke-width="2" fill="none" opacity=".45"/>
      <polyline points="22,18 32,53 42,18" stroke="#3a2a10" stroke-width="2" fill="none" opacity=".3"/></svg>`;
  };
  const HAND_SVG =
    '<svg viewBox="0 0 100 124" width="118" height="146" aria-hidden="true"><path d="M38 9c0-7 11-7 11 0v39h3v-9c0-7 11-7 11 0v11h3v-7c0-7 11-7 11 0v9h2v-3c0-7 11-7 11 0v29c0 23-15 38-36 38h-6c-15 0-23-8-29-19L5 72c-3-6 4-12 10-6l9 10z" fill="#fff" stroke="#1B3A44" stroke-width="5" stroke-linejoin="round"/><path d="M52 50v14M66 52v12M79 56v9" stroke="#1B3A44" stroke-width="3" stroke-linecap="round" opacity=".35"/></svg>';

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
      this.overlay = overlay;
      this.modal = modal;
      CQ.hud.build(uiLayer);
      CQ.caption.build(uiLayer);
      CQ.next.build(uiLayer);
      CQ.swapBtn.build(uiLayer);
      CQ.bubble.build(uiLayer);
      CQ.spot.build(overlay);
      CQ.hand.build(uiLayer);
      CQ.checkPanel.build(uiLayer);
      CQ.eqBoard.build(uiLayer);
      CQ.treasure.build(modal);
      CQ.menu.build(modal);
      this.skip = button("pill skip hidden", `${C().ui.skip} ⏭`, C().ui.skip, uiLayer, () => CQ.flow && CQ.flow.skipIntro());
    },
    // Remove every transient piece of UI (used when a level or chapter starts).
    reset() {
      CQ.caption.hide();
      CQ.next.idle();
      CQ.swapBtn.hide();
      CQ.bubble.hide(true);
      CQ.spot.off(true);
      CQ.hand.stop();
      CQ.checkPanel.hide(true);
      CQ.eqBoard.hide(true);
      CQ.idle.disarm();
      this.layer.querySelectorAll(".comic, .nameburst, .thought, .gem-pop, .flyer").forEach((e) => e.remove());
      this.overlay.querySelectorAll(".thought, .flyer").forEach((e) => e.remove());
      this.skip.classList.add("hidden");
    },
  };

  // ------------------------------------------------------------------ HUD
  CQ.hud = {
    build(ui) {
      const c = C().ui;
      this.el = CQ.el("div", "hud hidden", ui);
      this.sign = CQ.el("div", "level-sign", this.el, `<span class="lv-word">${c.level}</span><span class="lv-num">1</span>`);
      this.pips = CQ.el("div", "pips", this.el);
      this.pips.setAttribute("aria-label", "Crowns collected");
      this.pipEls = [];
      for (let i = 0; i < 8; i++) {
        const p = CQ.el("div", "pip", this.pips);
        CQ.img("crown", "", p);
        this.pipEls.push(p);
      }
      this.bagBtn = button("wbtn hud-btn bag", CQ.gemSVG("#3D8BFD", 52) + '<span class="badge">0</span>', c.wordTreasure, this.el, () => CQ.treasure.open());
      this.restartBtn = button("wbtn hud-btn restart", ICON.restart, "Restart level", this.el, () => CQ.flow.askRestart());
      this.menuBtn = button("wbtn hud-btn menu", ICON.menu, "Menu", this.el, () => CQ.menu.open());
      this.crowns = 0;
    },
    show(on) {
      this.el.classList.toggle("hidden", !on);
    },
    setLevel(n) {
      this.sign.querySelector(".lv-num").textContent = n;
      CQ.anim(this.sign, [{ transform: "rotate(-2deg) scale(1)" }, { transform: "rotate(2deg) scale(1.12)" }, { transform: "rotate(-2deg) scale(1)" }], {
        duration: 520,
        easing: CQ.EASE.back,
        keep: false,
      });
    },
    setCrowns(n) {
      this.crowns = n;
      this.pipEls.forEach((p, i) => p.classList.toggle("got", i < n));
    },
    pipCenter(i) {
      const k = Math.min(7, Math.max(0, i));
      return CQ.centerOf(this.pipEls[k]) || { x: 50 + k * 33, y: 146 };
    },
    // A crown flies from a world point into the next pip.
    async flyCrown(fromWorld) {
      const i = this.crowns;
      const from = CQ.camera.toScreen(fromWorld);
      const to = this.pipCenter(i);
      CQ.audio.play("crown.sparkle");
      await CQ.fly(CQ.ui.layer, CQ.crownFlyer(120), from, to, { duration: 900, arc: -200, scaleTo: 0.3, spin: 360 });
      this.setCrowns(i + 1);
      CQ.fx.sparkle(CQ.ui.layer, to.x, to.y, 8, 30);
      CQ.anim(this.pipEls[i], [{ transform: "scale(1)" }, { transform: "scale(1.6)" }, { transform: "scale(1)" }], { duration: 500, easing: CQ.EASE.back, keep: false });
    },
  };

  // ------------------------------------------------------------------ caption + narration
  CQ.caption = {
    build(ui) {
      this.el = CQ.el("div", "caption hidden", ui);
      this.el.setAttribute("aria-live", "polite");
      this.spk = button("spk", ICON.speaker, "Hear it again", this.el, () => this.replay());
      this.txt = CQ.el("div", "cap-text", this.el);
      this.text = null;
    },
    set(text, opts) {
      this.text = text;
      this.opts = opts || {};
      this.el.classList.remove("hidden");
      this.txt.innerHTML = CQ.rich(text);
      this.fit();
      CQ.anim(this.el, [{ transform: "translateY(-14px)", opacity: 0.3 }, { transform: "translateY(0)", opacity: 1 }], {
        duration: 280,
        easing: CQ.EASE.out,
        keep: false,
      });
    },
    fit() {
      let fs = 40;
      this.txt.style.fontSize = fs + "px";
      while (this.txt.scrollHeight > fs * 1.2 * 2 + 6 && fs > 28) {
        fs -= 2;
        this.txt.style.fontSize = fs + "px";
      }
    },
    hide() {
      this.el.classList.add("hidden");
      this.text = null;
    },
    replay() {
      if (!this.text) return;
      CQ.audio.play("ui.tap");
      CQ.audio.speak(CQ.speakable(this.text), { who: this.opts.who || "narrator", id: this.opts.id });
    },
  };

  // Show + speak a narrator line. advance: 'next' (wait for Next), 'auto' (continue after the voice), 'none'.
  CQ.say = async function (id, opts) {
    opts = opts || {};
    const text = opts.text || CQ.T(id, opts.vars);
    CQ.caption.set(text, { id, who: opts.who });
    CQ.track("step_start", { id });
    const t0 = performance.now();
    const speech = CQ.audio.speak(CQ.speakable(text), { who: opts.who || "narrator", id });
    const advance = opts.advance || "next";
    if (advance === "none") return null;
    const r = await CQ.run.when(speech);
    const words = text.split(/\s+/).length;
    const minMs = r && r.spoken ? 300 : advance === "auto" ? 900 + words * 300 : 1500;
    const left = minMs - (performance.now() - t0);
    if (left > 0) await CQ.run.wait(left);
    if (advance === "auto") {
      await CQ.run.wait(opts.pause != null ? opts.pause : 450);
      return "next";
    }
    return CQ.next.wait({ back: opts.back });
  };

  // ------------------------------------------------------------------ Next / Back
  CQ.next = {
    build(ui) {
      this.btn = button("wbtn big next-btn disabled hidden", ICON.next, C().ui.next, ui, () => this.fire("next"));
      this.backBtn = button("wbtn back-btn hidden", ICON.back, C().ui.back, ui, () => this.fire("back"));
      this.resolver = null;
      window.addEventListener("keydown", (e) => {
        if (CQ.menu.isOpen || CQ.treasure.isOpen) return;
        if (e.key === "ArrowRight" || e.key === "PageDown") this.fire("next");
        if (e.key === "ArrowLeft" || e.key === "PageUp") this.fire("back");
      });
    },
    wait(opts) {
      opts = opts || {};
      this.btn.classList.remove("hidden", "disabled");
      this.btn.classList.add("ready");
      this.backBtn.classList.toggle("hidden", !opts.back);
      this.allowBack = !!opts.back;
      CQ.idle.arm(() => CQ.hand.tapAt(CQ.centerOf(this.btn)), 9000);
      const p = new Promise((res) => {
        this.resolver = res;
      });
      return CQ.run.when(p).finally(() => {
        this.resolver = null;
        this.idle();
        CQ.idle.disarm();
        CQ.hand.stop();
      });
    },
    fire(what) {
      if (!this.resolver) return;
      if (what === "back" && !this.allowBack) return;
      CQ.audio.play("ui.tap");
      const r = this.resolver;
      this.resolver = null;
      r(what);
    },
    idle() {
      this.btn.classList.add("disabled");
      this.btn.classList.remove("ready");
      this.backBtn.classList.add("hidden");
    },
    show(on) {
      this.btn.classList.toggle("hidden", !on);
      if (!on) this.backBtn.classList.add("hidden");
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
    },
    show(cb) {
      this.cb = cb;
      this.el.classList.remove("hidden");
      CQ.audio.play("ui.pop");
      CQ.anim(this.el, [{ transform: "translate(-50%,-50%) scale(.2)" }, { transform: "translate(-50%,-50%) scale(1)" }], {
        duration: 420,
        easing: CQ.EASE.back,
      });
    },
    hide() {
      this.el.classList.add("hidden");
      this.cb = null;
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
    place(el, wp) {
      const p = CQ.camera.toScreen(wp);
      const x = CQ.clamp(p.x + 90, 20, CQ.W - 560);
      const y = CQ.clamp(p.y - 250, 160, CQ.H - 200);
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
      CQ.anim(this.el, [{ opacity: 1 }, { opacity: 0 }], { duration: 200 }).then(() => {
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
    // keep the whole word on screen
    const half = e.offsetWidth / 2 + 20;
    CQ.pos(e, CQ.clamp(p.x, half, CQ.W - half), CQ.clamp(p.y, 180, CQ.H - 80));
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

  // ------------------------------------------------------------------ comic name bursts (intro)
  CQ.nameBurst = function (text, tag, sx, sy, theme) {
    const e = CQ.el("div", "nameburst " + theme, CQ.ui.layer);
    CQ.pos(e, sx, sy);
    const spikes = [];
    for (let i = 0; i < 32; i++) {
      const a = (i / 32) * Math.PI * 2;
      const r = i % 2 ? 210 : 290 + (i % 4 === 0 ? 20 : 0);
      spikes.push(`${(Math.cos(a) * r * 1.5).toFixed(1)},${(Math.sin(a) * r * 0.78).toFixed(1)}`);
    }
    CQ.el(
      "div",
      "nb-burst",
      e,
      `<svg viewBox="-470 -260 940 520" aria-hidden="true"><defs><radialGradient id="nbg-${theme}"><stop offset="0" stop-color="var(--nb-c1)"/><stop offset="1" stop-color="var(--nb-c2)"/></radialGradient></defs><polygon points="${spikes.join(" ")}" fill="url(#nbg-${theme})" stroke="var(--nb-ink)" stroke-width="10" stroke-linejoin="round"/></svg>`
    );
    const word = CQ.el("div", "nb-word", e);
    Array.from(text).forEach((ch, i) => {
      const s = CQ.el("span", "nb-ch", word, ch);
      s.setAttribute("data-ch", ch);
      const rot = CQ.rand(-9, 9).toFixed(1) + "deg";
      s.style.setProperty("--r", rot);
      CQ.anim(
        s,
        [
          { transform: `translateY(-260px) scale(.2) rotate(${CQ.rand(-80, 80)}deg)`, opacity: 0 },
          { transform: `translateY(0) scale(1) rotate(${rot})`, opacity: 1 },
        ],
        { duration: 560, delay: 120 + i * 85, easing: CQ.EASE.back, essential: true }
      ).then(() => {
        s.style.transform = "";
        s.classList.add("wave");
        s.style.animationDelay = i * 0.12 + "s";
      });
    });
    const t = CQ.el("div", "nb-tag", e, tag);
    CQ.anim(t, [{ transform: "translateX(-50%) scale(0)", opacity: 0 }, { transform: "translateX(-50%) scale(1)", opacity: 1 }], {
      duration: 420,
      delay: 220 + text.length * 85,
      easing: CQ.EASE.back,
    });
    CQ.anim(e, [{ transform: "translate(-50%,-50%) scale(.3)", opacity: 0 }, { transform: "translate(-50%,-50%) scale(1)", opacity: 1 }], {
      duration: 460,
      easing: CQ.EASE.back,
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
  CQ.spot = {
    build(overlay) {
      this.el = CQ.el("div", "spotlight hidden", overlay);
      this.r = 1600;
      this.get = () => ({ x: 960, y: 540 });
      this.tick = null;
    },
    apply() {
      const p = CQ.camera.toScreen(this.get());
      this.el.style.background = `radial-gradient(circle at ${p.x}px ${p.y}px, rgba(0,0,0,0) ${this.r}px, rgba(3,12,20,.76) ${this.r + 80}px)`;
    },
    on(target, r) {
      this.get = typeof target === "function" ? target : () => target;
      this.el.classList.remove("hidden");
      if (!this.tick) this.tick = CQ.ticker.add(() => this.apply());
      const r0 = 1400;
      return CQ.tween(650, (k) => (this.r = CQ.lerp(r0, r, k)), CQ.ease.out, "spot");
    },
    off(now) {
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

  // ------------------------------------------------------------------ thought bubble
  CQ.thought = function (wp, html, opts) {
    opts = opts || {};
    const p = CQ.camera.toScreen(wp);
    const e = CQ.el("div", "thought", CQ.ui.layer);
    CQ.pos(e, p.x, p.y);
    if (opts.w) e.style.width = opts.w + "px";
    if (opts.h) e.style.height = opts.h + "px";
    CQ.el("div", "th-dot d1", e);
    CQ.el("div", "th-dot d2", e);
    const body = CQ.el("div", "th-body", e, html);
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
      duration: 260,
      essential: true,
    }).then(() => e.remove());
  };

  // ------------------------------------------------------------------ hand pointer demos
  CQ.hand = {
    build(ui) {
      this.el = CQ.el("div", "hand hidden", ui, HAND_SVG);
      this.seq = 0;
    },
    placeAt(p) {
      CQ.pos(this.el, p.x - 41, p.y - 4);
    },
    stop() {
      this.seq++;
      this.el.classList.add("hidden");
    },
    // Show a drag gesture between two stage points (repeats a few times).
    async drag(from, to, times) {
      const id = ++this.seq;
      if (!from || !to) return;
      times = times || 2;
      for (let n = 0; n < times; n++) {
        if (id !== this.seq) return;
        this.el.classList.remove("hidden");
        this.placeAt(from);
        await CQ.anim(this.el, [{ opacity: 0, transform: "scale(1.2)" }, { opacity: 1, transform: "scale(1)" }], { duration: 300, keep: false, essential: true });
        if (id !== this.seq) return;
        await CQ.anim(this.el, [{ transform: "scale(1)" }, { transform: "scale(.88)" }], { duration: 180, keep: false, essential: true });
        await CQ.tween(1000, (k) => this.placeAt({ x: CQ.lerp(from.x, to.x, k), y: CQ.lerp(from.y, to.y, k) }), CQ.ease.inOut, "hand");
        if (id !== this.seq) return;
        await CQ.anim(this.el, [{ opacity: 1 }, { opacity: 0 }], { duration: 350, keep: false, essential: true });
        this.el.classList.add("hidden");
        await CQ.sleep(450);
      }
      if (id === this.seq) this.el.classList.add("hidden");
    },
    async tapAt(p, times) {
      const id = ++this.seq;
      if (!p) return;
      times = times || 2;
      this.el.classList.remove("hidden");
      this.placeAt(p);
      for (let n = 0; n < times; n++) {
        if (id !== this.seq) return;
        await CQ.anim(this.el, [{ transform: "translate(0,0) scale(1)" }, { transform: "translate(0,14px) scale(.9)" }, { transform: "translate(0,0) scale(1)" }], {
          duration: 650,
          keep: false,
          essential: true,
        });
      }
      if (id === this.seq) this.el.classList.add("hidden");
    },
  };

  // ------------------------------------------------------------------ word gems
  CQ.gems = {
    have: new Set(),
    set(ids) {
      this.have = new Set(ids);
      this.badge();
    },
    badge() {
      const b = CQ.hud.bagBtn && CQ.hud.bagBtn.querySelector(".badge");
      if (b) {
        b.textContent = this.have.size;
        b.style.display = this.have.size ? "" : "none";
      }
    },
    word(id) {
      return C().words.find((w) => w.id === id);
    },
    async collect(id, from) {
      if (this.have.has(id)) return;
      this.have.add(id);
      const w = this.word(id);
      if (!w) return;
      CQ.audio.play("gem.collect");
      const pop = CQ.el(
        "div",
        "gem-pop",
        CQ.ui.layer,
        `<div class="gp-label">${C().ui.newWord}</div><div class="gp-gem">${CQ.gemSVG(w.color, 96)}</div><div class="gp-word">${w.word}</div>`
      );
      CQ.pos(pop, from.x, from.y);
      await CQ.anim(pop, [{ transform: "translate(-50%,-50%) scale(.2)", opacity: 0 }, { transform: "translate(-50%,-50%) scale(1)", opacity: 1 }], {
        duration: 450,
        easing: CQ.EASE.back,
        essential: true,
      });
      CQ.fx.sparkle(CQ.ui.layer, from.x, from.y, 10, 90);
      await CQ.sleep(1300);
      const gem = CQ.el("div", "", null, CQ.gemSVG(w.color, 80));
      const start = CQ.centerOf(pop.querySelector(".gp-gem")) || from;
      pop.remove();
      const bag = CQ.centerOf(CQ.hud.bagBtn) || { x: 1596, y: 72 };
      await CQ.fly(CQ.ui.layer, gem, start, bag, { duration: 750, arc: -160, scaleTo: 0.5 });
      this.badge();
      CQ.anim(CQ.hud.bagBtn, [{ transform: "scale(1)" }, { transform: "scale(1.25)" }, { transform: "scale(1)" }], { duration: 420, easing: CQ.EASE.back, keep: false });
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
      CQ.el("h2", "panel-title", panel, `${CQ.gemSVG("#3D8BFD", 56)} ${C().ui.wordTreasure}`);
      this.list = CQ.el("div", "word-grid", panel);
      button("wbtn close-btn", ICON.close, C().ui.close, panel, () => this.close());
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
          `<div class="wc-gem">${CQ.gemSVG(w.color, 62)}</div><div class="wc-text"><div class="wc-word" style="--c:${w.color}">${w.word}</div><div class="wc-meaning">${CQ.rich(
            w.meaning
          )}</div></div><div class="wc-ex">${CQ.rich(w.example)}</div>`
        );
        if (animate)
          CQ.anim(c, [{ transform: "translateY(40px) scale(.7)", opacity: 0 }, { transform: "translateY(0) scale(1)", opacity: 1 }], {
            duration: 420,
            delay: i * 260,
            easing: CQ.EASE.back,
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
          CQ.flow.goto(ch.id);
        });
      });
      button("wbtn close-btn", ICON.close, C().ui.close, panel, () => this.close());
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

  CQ.confirm = function (text) {
    return new Promise((res) => {
      const c = C().ui;
      const wrap = CQ.el("div", "modal-wrap", CQ.ui.modal);
      const panel = CQ.el("div", "panel confirm-panel", wrap);
      panel.setAttribute("role", "alertdialog");
      CQ.el("h2", "panel-title", panel, text);
      const row = CQ.el("div", "confirm-row", panel);
      CQ.pauser.hold();
      const done = (v) => {
        wrap.remove();
        CQ.pauser.release();
        CQ.audio.play("ui.tap");
        res(v);
      };
      button("btn-wood big yes", `${ICON.check}<span>${c.yes}</span>`, c.yes, row, () => done(true));
      button("btn-wood big no", `${ICON.close}<span>${c.no}</span>`, c.no, row, () => done(false));
    });
  };

  // ------------------------------------------------------------------ Check panel (substitute, find each side, compare)
  CQ.checkPanel = {
    build(ui) {
      this.el = CQ.el("div", "check-panel hidden", ui);
      this.eqRow = CQ.el("div", "cp-eq", this.el);
      this.row = CQ.el("div", "cp-row", this.el);
      this.lhs = CQ.el("div", "cp-side lhs", this.row);
      this.rhs = CQ.el("div", "cp-side rhs", this.row);
      this.cmp = CQ.el("div", "cp-compare", this.el);
      this.picker = CQ.el("div", "cp-picker hidden", this.el);
    },
    async show(eq) {
      this.eq = eq;
      this.el.classList.remove("hidden");
      this.eqRow.innerHTML = CQ.rich(`x + ${eq.a} = ${eq.b}`);
      this.lhs.innerHTML = `<span class="lab">LHS:</span><span class="xslot"><i class="v">x</i></span><span class="op">+ ${eq.a} =</span><button type="button" class="blank" data-k="lhs" aria-label="Left-hand side value">?</button>`;
      this.rhs.innerHTML = `<span class="lab">RHS:</span><button type="button" class="blank" data-k="rhs" aria-label="Right-hand side value">?</button>`;
      this.cmp.innerHTML = "";
      this.picker.classList.add("hidden");
      CQ.audio.play("scroll.open");
      await CQ.anim(this.el, [{ transform: "translate(-50%, 60px)", opacity: 0 }, { transform: "translate(-50%, 0)", opacity: 1 }], {
        duration: 420,
        easing: CQ.EASE.back,
        essential: true,
      });
    },
    hide(now) {
      this.picker.classList.add("hidden");
      if (now) {
        this.el.classList.add("hidden");
        return Promise.resolve();
      }
      return CQ.anim(this.el, [{ transform: "translate(-50%, 0)", opacity: 1 }, { transform: "translate(-50%, 60px)", opacity: 0 }], {
        duration: 300,
        essential: true,
      }).then(() => this.el.classList.add("hidden"));
    },
    blank(k) {
      return this.el.querySelector(`.blank[data-k="${k}"]`);
    },
    // The bar's number flies from Zippy's hands into the x slot.
    async substitute(v, fromWorld) {
      const slot = this.lhs.querySelector(".xslot");
      const to = CQ.centerOf(slot);
      const from = fromWorld ? CQ.camera.toScreen(fromWorld) : to;
      const chip = CQ.el("div", "num-chip", null, String(v));
      CQ.audio.play("ui.swoosh");
      await CQ.fly(CQ.ui.layer, chip, from, to, { duration: 650, arc: -180 });
      slot.innerHTML = `<span class="subbed">${v}</span>`;
      CQ.audio.play("ui.pop");
      CQ.anim(slot, [{ transform: "scale(1.5)" }, { transform: "scale(1)" }], { duration: 380, easing: CQ.EASE.back, keep: false });
    },
    setValue(k, v) {
      const b = this.blank(k);
      if (!b) return;
      b.textContent = v;
      b.classList.add("filled");
      b.classList.remove("glow");
      CQ.anim(b, [{ transform: "scale(1.4)" }, { transform: "scale(1)" }], { duration: 360, easing: CQ.EASE.back, keep: false });
    },
    // Child taps the blank, then picks one of three number chips. Resolves when the right one is chosen.
    fill(k, options, correct, onMiss) {
      const b = this.blank(k);
      let misses = 0;
      b.classList.add("glow");
      const openPicker = () => {
        CQ.audio.play("ui.pop");
        this.picker.innerHTML = "";
        this.picker.classList.remove("hidden");
        const br = b.getBoundingClientRect();
        const pr = this.el.getBoundingClientRect();
        const s = CQ.stage.scale;
        this.picker.style.left = (br.left + br.width / 2 - pr.left) / s + "px";
        this.picker.style.top = (br.top - pr.top) / s - 20 + "px";
        return options.map((v) => {
          const chip = button("chip", String(v), String(v), this.picker, () => pick(v, chip));
          if (misses >= 2 && v === correct) chip.classList.add("glow");
          return chip;
        });
      };
      let resolve;
      const pick = (v, chip) => {
        if (v === correct) {
          this.picker.classList.add("hidden");
          this.setValue(k, v);
          CQ.audio.play("correct");
          b.onclick = null;
          CQ.idle.disarm();
          CQ.hand.stop();
          resolve(misses);
        } else {
          misses++;
          CQ.track("answer", { step: k, choice: v, correct: false, attempt: misses });
          CQ.audio.play("tryagain");
          chip.classList.add("wrong");
          CQ.anim(chip, [{ transform: "translateX(0)" }, { transform: "translateX(-12px)" }, { transform: "translateX(12px)" }, { transform: "translateX(0)" }], {
            duration: 300,
            keep: false,
          });
          if (onMiss) onMiss(misses);
          if (misses >= 2) this.picker.querySelectorAll(".chip").forEach((c) => c.textContent === String(correct) && c.classList.add("glow"));
        }
      };
      b.onclick = (e) => {
        e.stopPropagation();
        CQ.hand.stop();
        openPicker();
      };
      CQ.idle.arm(() => CQ.hand.tapAt(CQ.centerOf(b)), 8000);
      // First time ever: show the gesture straight away.
      if (!CQ.store.get("blankDemoSeen", false)) {
        CQ.store.set("blankDemoSeen", true);
        setTimeout(() => {
          if (b.classList.contains("glow") && this.picker.classList.contains("hidden")) CQ.hand.tapAt(CQ.centerOf(b));
        }, 700);
      }
      return CQ.run.when(
        new Promise((res) => {
          resolve = res;
        })
      );
    },
    async compare(l, r) {
      const eq = l === r;
      this.cmp.innerHTML = `<span class="cv lhs">${l}</span><span class="csym ${eq ? "ok" : "no"}">${eq ? "=" : '<span class="neq">=</span>'}</span><span class="cv rhs">${r}</span>`;
      this.cmp.className = "cp-compare " + (eq ? "ok" : "no");
      CQ.audio.play(eq ? "balance.level" : "tryagain");
      await CQ.anim(this.cmp, [{ transform: "scale(.3)", opacity: 0 }, { transform: "scale(1)", opacity: 1 }], { duration: 420, easing: CQ.EASE.back, essential: true });
      return eq;
    },
  };

  // ------------------------------------------------------------------ equation board (Level 8)
  CQ.eqBoard = {
    build(ui) {
      this.el = CQ.el("div", "eq-board hidden", ui);
    },
    show(rows) {
      this.el.classList.remove("hidden");
      this.setRows(rows);
      return CQ.anim(this.el, [{ transform: "translate(-50%, 60px)", opacity: 0 }, { transform: "translate(-50%, 0)", opacity: 1 }], {
        duration: 420,
        easing: CQ.EASE.back,
        essential: true,
      });
    },
    setRows(rows) {
      this.el.innerHTML = rows.map((r, i) => `<div class="eb-row r${i}">${r}</div>`).join("");
    },
    addRow(html) {
      const r = CQ.el("div", "eb-row", this.el, html);
      CQ.anim(r, [{ transform: "translateY(-20px)", opacity: 0 }, { transform: "translateY(0)", opacity: 1 }], { duration: 380, easing: CQ.EASE.out });
      return r;
    },
    hide(now) {
      if (now) {
        this.el.classList.add("hidden");
        return Promise.resolve();
      }
      return CQ.anim(this.el, [{ opacity: 1 }, { opacity: 0 }], { duration: 300, essential: true }).then(() => this.el.classList.add("hidden"));
    },
  };
})();
