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
  const PATCHED = ".caption, .check-panel, .eq-board, .eq-strip, .eq-sign, .gem-pop, .panel, .board, .idea-card, .bubble, .btn-wood";
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
      CQ.swapBtn.build(uiLayer);
      CQ.bubble.build(uiLayer);
      CQ.spot.build(overlay);
      CQ.focus.build(overlay);
      CQ.hand.build(uiLayer);
      CQ.checkPanel.build(uiLayer);
      CQ.eqBoard.build(uiLayer);
      CQ.treasure.build(modal);
      CQ.menu.build(modal);
      CQ.veil.build(CQ.stage.el);
      this.skip = button("pill skip hidden", `${C().ui.skip} ⏭`, C().ui.skip, uiLayer, () => CQ.flow && CQ.flow.skipIntro());
    },
    // Remove every transient piece of UI (used when a level or chapter starts).
    reset() {
      CQ.caption.hide(true);
      CQ.next.clear();
      CQ.swapBtn.hide(true);
      CQ.bubble.hide(true);
      CQ.spot.off(true);
      CQ.focus.off(true);
      CQ.hand.stop();
      CQ.checkPanel.hide(true);
      CQ.eqBoard.hide(true);
      CQ.idle.disarm();
      this.layer.querySelectorAll(".comic, .nameburst, .thought, .gem-pop, .flyer").forEach((e) => e.remove());
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
      return CQ.anim(this.el, [{ opacity: from }, { opacity: 1 }], { duration: ms || 420, easing: "ease-in", essential: true });
    },
    reveal(ms) {
      return CQ.anim(this.el, [{ opacity: 1 }, { opacity: 0 }], { duration: ms || 700, easing: "ease-out", essential: true }).then(() => {
        if (getComputedStyle(this.el).opacity === "0") this.el.classList.add("hidden");
      });
    },
  };

  // ------------------------------------------------------------------ crowns (no on-screen HUD)
  // The screen has no level sign, crown row or corner buttons. The game still counts the crowns; a
  // collected crown flies up out of the picture with a sparkle. (Esc opens the menu.)
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
    async flyCrown(fromWorld) {
      const from = CQ.camera.toScreen(fromWorld);
      const to = { x: CQ.clamp(from.x + 240, 200, CQ.W - 200), y: 70 };
      CQ.audio.play("crown.sparkle");
      await CQ.fly(CQ.ui.layer, CQ.crownFlyer(120), from, to, { duration: 1000, arc: -140, scaleTo: 0.45, spin: 360, fadeOut: true });
      CQ.fx.sparkle(CQ.ui.layer, to.x, to.y, 12, 50);
      this.crowns++;
    },
  };


  // ------------------------------------------------------------------ caption + narration
  CQ.caption = {
    build(ui) {
      this.el = CQ.el("div", "caption hidden", ui);
      this.el.setAttribute("aria-live", "polite");
      // Zippy's face at the left of the caption; tapping it plays the line again
      this.spk = button("spk", `<img src="${IMAGES.zippyFace.src}" alt="" draggable="false">`, "Hear it again", this.el, () => this.replay());
      this.txt = CQ.el("div", "cap-text", this.el);
      this.text = null;
      this.busy = false; // true while the child is listening to the line again
      this.replays = 0;
    },
    set(text, opts) {
      this.text = text;
      this.opts = opts || {};
      this.replays++;
      this.busy = false;
      this.el.classList.remove("hidden");
      this.txt.innerHTML = CQ.rich(text);
      this.fit();
      CQ.anim(this.el, [{ transform: "translateY(-12px)", opacity: 0.2 }, { transform: "translateY(0)", opacity: 1 }], {
        duration: 420,
        easing: CQ.EASE.out,
        keep: false,
      });
      CQ.anim(this.spk, [{ transform: "scale(.85)" }, { transform: "scale(1.08)" }, { transform: "scale(1)" }], { duration: 480, easing: CQ.EASE.back, keep: false });
    },
    fit() {
      let fs = 40;
      this.txt.style.fontSize = fs + "px";
      while (this.txt.scrollHeight > fs * 1.2 * 2 + 6 && fs > 28) {
        fs -= 2;
        this.txt.style.fontSize = fs + "px";
      }
    },
    hide(now) {
      this.text = null;
      this.replays++;
      this.busy = false;
      if (now || this.el.classList.contains("hidden")) {
        this.el.classList.add("hidden");
        return;
      }
      CQ.anim(this.el, [{ opacity: 1 }, { opacity: 0 }], { duration: 300, keep: false }).then(() => {
        if (this.text === null) this.el.classList.add("hidden"); // no new line arrived meanwhile
      });
    },
    // 🔊 Hear it again. The story waits until the line has been heard again.
    replay() {
      if (!this.text) return;
      CQ.audio.play("ui.tap");
      const n = ++this.replays;
      this.busy = true;
      CQ.audio.speak(CQ.speakable(this.text), { who: this.opts.who || "narrator", id: this.opts.id }).then(() => {
        if (n === this.replays) this.busy = false;
      });
    },
  };

  // Show + speak a narrator line, then move on by itself once it has been heard.
  //   advance 'hold' (default): after the voice, a pause to look at the screen (opts.hold, or sized to the line)
  //   advance 'auto': after the voice, a short pause (opts.pause, default 450 ms), for lines that flow on
  //   advance 'none': show + speak and return at once (an instruction while the child acts)
  // With the voice off, the caption gets time to be read instead. The clock stops while a menu is open,
  // the page is hidden, or the child is replaying the line (🔊). Teachers can skip ahead with → (or a
  // presenter clicker); notebook pages also have Back. Resolves 'next', or 'back' when Back was pressed.
  CQ.say = async function (id, opts) {
    opts = opts || {};
    const text = opts.text || CQ.T(id, opts.vars);
    CQ.caption.set(text, { id, who: opts.who });
    CQ.track("step_start", { id });
    const speech = CQ.audio.speak(CQ.speakable(text), { who: opts.who || "narrator", id });
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
      await CQ.run.hold(look, busy);
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

  // ------------------------------------------------------------------ focus: "look here!"
  // At a key teaching moment the rest of the screen fades back and one thing stays bright, in a soft
  // window with a gold ring. target: an element, a list of elements, a stage rect { x0, y0, x1, y1 },
  // or a function returning one of those (it is asked again every frame, so the window follows the
  // balance tipping or a new pan item). A new target while it is on: the window glides over to it.
  // Taps go through, so the child can still act. opts: { pad, radius, still (measure once), quiet,
  // ring: false (no gold ring) }. dimAll() fades everything back, with no window.
  // UI pieces (caption, panels, buttons) sit above it and stay bright.
  CQ.focus = {
    build(overlay) {
      this.el = CQ.el("div", "focus hidden", overlay);
      this.hole = CQ.el("div", "focus-hole", this.el);
      this.ring = CQ.el("div", "focus-ring", this.el);
      this.tok = 0;
      this.get = null;
      this.tick = null;
      this.shown = null;
    },
    rect(target) {
      if (typeof target === "function") target = target();
      if (!target) return null;
      if (target.x0 != null) return target;
      let r = null;
      (Array.isArray(target) ? target : [target]).forEach((e) => {
        if (!e || !e.isConnected) return;
        const b = e.getBoundingClientRect();
        if (!b.width || !b.height) return;
        const a = CQ.stage.toStage(b.left, b.top);
        const c = CQ.stage.toStage(b.right, b.bottom);
        r = r ? { x0: Math.min(r.x0, a.x), y0: Math.min(r.y0, a.y), x1: Math.max(r.x1, c.x), y1: Math.max(r.y1, c.y) } : { x0: a.x, y0: a.y, x1: c.x, y1: c.y };
      });
      return r;
    },
    apply() {
      const r = this.get && this.get();
      if (!r) return;
      const p = this.pad;
      let box = { x: r.x0 - p, y: r.y0 - p, w: r.x1 - r.x0 + 2 * p, h: r.y1 - r.y0 + 2 * p };
      if (this.from) {
        const k = CQ.ease.inOut(Math.min(1, (performance.now() - this.t0) / 550));
        const f = this.from;
        box = { x: CQ.lerp(f.x, box.x, k), y: CQ.lerp(f.y, box.y, k), w: CQ.lerp(f.w, box.w, k), h: CQ.lerp(f.h, box.h, k) };
        if (k >= 1) this.from = null;
      }
      this.shown = box;
      const rad = Math.min(this.radius, box.w / 2, box.h / 2) + "px";
      [this.hole, this.ring].forEach((e) => {
        CQ.box(e, box.x, box.y, box.w, box.h);
        e.style.borderRadius = rad;
      });
    },
    on(target, opts) {
      opts = opts || {};
      const t = ++this.tok;
      const wasOn = !this.el.classList.contains("hidden") && !!this.shown;
      if (opts.still) {
        const r = this.rect(target);
        this.get = () => r;
      } else this.get = () => this.rect(target);
      this.pad = opts.pad != null ? opts.pad : 24;
      this.radius = opts.radius != null ? opts.radius : 44;
      this.ring.style.display = opts.ring === false ? "none" : "";
      this.from = wasOn ? this.shown : null; // glide from where the window is now
      this.t0 = performance.now();
      this.el.classList.remove("hidden");
      this.apply();
      if (!this.tick) this.tick = CQ.ticker.add(() => this.apply());
      if (!wasOn) {
        if (!opts.quiet) CQ.audio.play("focus.in", { volume: 0.6 });
        CQ.anim(this.ring, [{ opacity: 0, transform: "scale(1.15)" }, { opacity: 1, transform: "scale(1)" }], { duration: 650, easing: CQ.EASE.out, keep: false });
      }
      const from = parseFloat(getComputedStyle(this.el).opacity) || 0;
      CQ.anim(this.el, [{ opacity: wasOn ? from : 0 }, { opacity: 1 }], { duration: 550, essential: true });
      return t;
    },
    dimAll(opts) {
      return this.on({ x0: -99, y0: -99, x1: -98, y1: -98 }, Object.assign({ pad: 0, ring: false }, opts));
    },
    // Turn it off in ms (unless something else was focused meanwhile).
    offAfter(ms) {
      const t = this.tok;
      setTimeout(() => t === this.tok && this.off(), ms);
    },
    off(now) {
      const t = ++this.tok;
      const done = () => {
        if (t !== this.tok) return;
        this.el.classList.add("hidden");
        if (this.tick) this.tick();
        this.tick = null;
        this.get = null;
        this.shown = null;
      };
      if (now || this.el.classList.contains("hidden")) {
        done();
        return Promise.resolve();
      }
      return CQ.anim(this.el, [{ opacity: parseFloat(getComputedStyle(this.el).opacity) || 1 }, { opacity: 0 }], { duration: 500, essential: true }).then(done);
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
  CQ.hand = {
    build(ui) {
      this.el = CQ.el("div", "hand hidden", ui);
      CQ.img("hand", "", this.el);
      this.k = 104 / IMAGES.hand.w; // drawn 104 px wide
      // The art points up; it is shown mirrored (flipped horizontally, see .hand img in styles.css), so the
      // finger points up at what to tap or drag and the hand sits just below it.
      this.tip = { x: (IMAGES.hand.w - window.GEOM.hand.tipX) * this.k, y: window.GEOM.hand.tipY * this.k };
      this.el.style.transformOrigin = `${this.tip.x}px ${this.tip.y}px`;
      this.seq = 0;
    },
    placeAt(p) {
      CQ.pos(this.el, p.x - this.tip.x, p.y - this.tip.y);
    },
    stop() {
      this.seq++;
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
    async drag(from, to, times, opts) {
      const id = ++this.seq;
      this.dropCarry();
      if (!from || !to) return;
      times = times || 2;
      opts = opts || {};
      const alive = () => id === this.seq;
      for (let n = 0; n < times; n++) {
        if (!alive()) return;
        this.el.classList.remove("hidden");
        this.placeAt(from);
        const c = opts.carry ? opts.carry() : null;
        if (c) {
          this.el.parentNode.insertBefore(c, this.el); // under the hand
          CQ.pos(c, from.x, from.y);
          this.carry = c;
          CQ.anim(c, [{ opacity: 0 }, { opacity: 1 }], { duration: 300, keep: false, essential: true });
        }
        await CQ.anim(this.el, [{ opacity: 0, transform: "scale(1.2)" }, { opacity: 1, transform: "scale(1)" }], { duration: 300, keep: false, essential: true });
        if (!alive()) return;
        await CQ.anim(this.el, [{ transform: "scale(1)" }, { transform: "scale(.88)" }], { duration: 200, keep: false, essential: true });
        const s1 = opts.carryScale || 1;
        await CQ.tween(
          1350,
          (k) => {
            const p = { x: CQ.lerp(from.x, to.x, k), y: CQ.lerp(from.y, to.y, k) };
            this.placeAt(p);
            if (c) {
              CQ.pos(c, p.x, p.y);
              c.firstChild.style.transform = `translate(-50%,-50%) scale(${CQ.lerp(1, s1, k)})`;
            }
          },
          CQ.ease.inOut,
          "hand"
        );
        if (!alive()) return;
        if (c) CQ.anim(c, [{ opacity: 1 }, { opacity: 0 }], { duration: 380, essential: true });
        await CQ.anim(this.el, [{ opacity: 1 }, { opacity: 0 }], { duration: 380, keep: false, essential: true });
        this.dropCarry();
        this.el.classList.add("hidden");
        await CQ.sleep(500);
      }
      if (alive()) this.el.classList.add("hidden");
    },
    async tapAt(p, times) {
      const id = ++this.seq;
      this.dropCarry();
      CQ.stopTween("hand"); // an earlier drag demo must not keep moving the hand
      if (!p) return;
      times = times || 2;
      this.el.classList.remove("hidden");
      this.placeAt(p);
      for (let n = 0; n < times; n++) {
        if (id !== this.seq) return;
        await CQ.anim(this.el, [{ transform: "translate(0,0) scale(1)" }, { transform: "translate(0,-14px) scale(.9)" }, { transform: "translate(0,0) scale(1)" }], {
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
    badge() {}, // (no Word Treasure button on screen any more)
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
        `<div class="gp-label">${C().ui.newWord}</div><div class="gp-gem">${CQ.gem(w.color, 96)}</div><div class="gp-word">${w.word}</div>`
      );
      CQ.pos(pop, from.x, from.y);
      await CQ.anim(pop, [{ transform: "translate(-50%,-50%) scale(.2)", opacity: 0 }, { transform: "translate(-50%,-50%) scale(1)", opacity: 1 }], {
        duration: 450,
        easing: CQ.EASE.back,
        essential: true,
      });
      CQ.fx.sparkle(CQ.ui.layer, from.x, from.y, 10, 90);
      await CQ.sleep(1300);
      CQ.fx.sparkle(CQ.ui.layer, from.x, from.y - 40, 8, 70);
      await CQ.anim(pop, [{ transform: "translate(-50%,-50%) scale(1)", opacity: 1 }, { transform: "translate(-50%,-50%) translateY(-50px) scale(.6)", opacity: 0 }], {
        duration: 450,
        easing: CQ.EASE.in,
        essential: true,
      });
      pop.remove();
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

  // ------------------------------------------------------------------ number picker
  // The child taps a dashed blank, then picks one of three number tiles. Shared by the Check panel
  // and the practice board. Resolves with the number of misses once the right tile is picked.
  CQ.fillBlank = function (b, v) {
    b.textContent = CQ.num(v);
    b.classList.add("filled");
    b.classList.remove("glow");
    CQ.anim(b, [{ transform: "scale(1.4)" }, { transform: "scale(1)" }], { duration: 360, easing: CQ.EASE.back, keep: false });
  };
  CQ.pickNumber = function (b, host, options, correct, onMiss) {
    let picker = host.querySelector(":scope > .cp-picker");
    if (!picker) picker = CQ.el("div", "cp-picker hidden", host);
    let misses = 0;
    let resolve;
    b.classList.add("glow");
    const pick = (v, chip) => {
      if (v === correct) {
        picker.classList.add("hidden");
        CQ.fillBlank(b, v);
        CQ.audio.play("correct");
        b.onclick = null;
        CQ.idle.disarm();
        CQ.hand.stop();
        resolve(misses);
        return;
      }
      misses++;
      CQ.track("answer", { step: b.dataset.k || "pick", choice: v, correct: false, attempt: misses });
      CQ.audio.play("tryagain");
      chip.classList.add("wrong");
      CQ.anim(chip, [{ transform: "translateX(0)" }, { transform: "translateX(-12px)" }, { transform: "translateX(12px)" }, { transform: "translateX(0)" }], {
        duration: 300,
        keep: false,
      });
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
      picker.style.left = (br.left + br.width / 2 - pr.left) / s + "px";
      picker.style.top = (br.top - pr.top) / s - 20 + "px";
      options.forEach((v) => {
        const chip = button("chip", CQ.num(v), CQ.num(v), picker, () => pick(v, chip));
        chip.num = v; // (a button's own .value is always text)
        if (misses >= 2 && v === correct) chip.classList.add("glow");
      });
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

  // ------------------------------------------------------------------ Check panel (substitute, find each side, compare)
  CQ.checkPanel = {
    build(ui) {
      this.el = CQ.el("div", "check-panel hidden", ui);
      this.eqRow = CQ.el("div", "cp-eq", this.el);
      this.row = CQ.el("div", "cp-row", this.el);
      this.lhs = CQ.el("div", "cp-side lhs", this.row);
      this.rhs = CQ.el("div", "cp-side rhs", this.row);
      this.cmp = CQ.el("div", "cp-compare", this.el);
    },
    // eq = { k, a, b, rhsGiven }: the equation k·x + a = b (k is 1 except for Level 9's two crowns)
    async show(eq) {
      this.eq = eq;
      const k = eq.k || 1;
      this.el.classList.remove("hidden");
      this.eqRow.innerHTML = CQ.rich(`${k > 1 ? k : ""}x + ${eq.a} = ${eq.b}`);
      this.lhs.innerHTML = `<span class="lab">LHS:</span>${k > 1 ? `<span class="op">${k} ×</span>` : ""}<span class="xslot"><i class="v">x</i></span><span class="op">+ ${eq.a} =</span><button type="button" class="blank" data-k="lhs" aria-label="Left-hand side value">?</button>`;
      this.rhs.innerHTML = `<span class="lab">RHS:</span><button type="button" class="blank" data-k="rhs" aria-label="Right-hand side value">?</button>`;
      if (eq.rhsGiven) {
        const r = this.blank("rhs");
        r.textContent = CQ.num(eq.b);
        r.classList.add("filled");
      }
      this.cmp.innerHTML = "";
      this.cmp.className = "cp-compare";
      const old = this.el.querySelector(":scope > .cp-picker");
      if (old) old.classList.add("hidden");
      CQ.audio.play("scroll.open");
      await CQ.anim(this.el, [{ transform: "translate(-50%, 60px)", opacity: 0 }, { transform: "translate(-50%, 0)", opacity: 1 }], {
        duration: 580,
        easing: CQ.EASE.out,
        essential: true,
      });
    },
    hide(now) {
      const p = this.el.querySelector(":scope > .cp-picker");
      if (p) p.classList.add("hidden");
      if (now) {
        this.el.classList.add("hidden");
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
    // The value flies (from Zippy's hands, or from the crown) into the x slot.
    async substitute(v, fromWorld) {
      const slot = this.lhs.querySelector(".xslot");
      const to = CQ.centerOf(slot);
      const from = fromWorld ? CQ.camera.toScreen(fromWorld) : to;
      const chip = CQ.el("div", "num-chip", null, CQ.num(v));
      CQ.audio.play("ui.swoosh");
      await CQ.fly(CQ.ui.layer, chip, from, to, { duration: 900, arc: -180 });
      slot.innerHTML = `<span class="subbed">${CQ.num(v)}</span>`;
      CQ.audio.play("ui.pop");
      CQ.anim(slot, [{ transform: "scale(1.5)" }, { transform: "scale(1)" }], { duration: 380, easing: CQ.EASE.back, keep: false });
    },
    setValue(k, v) {
      const b = this.blank(k);
      if (b) CQ.fillBlank(b, v);
    },
    fill(k, options, correct, onMiss) {
      return CQ.pickNumber(this.blank(k), this.el, options, correct, onMiss);
    },
    // LHS = RHS or LHS ≠ RHS, and under it what that means ("4 is not a solution").
    async compare(l, r, verdict) {
      const eq = l === r;
      this.cmp.innerHTML =
        `<div class="cp-cmp-row"><span class="cv lhs">${CQ.num(l)}</span><span class="csym ${eq ? "ok" : "no"}">${eq ? "=" : '<span class="neq">=</span>'}</span><span class="cv rhs">${CQ.num(r)}</span></div>` +
        (verdict ? `<div class="cp-verdict">${CQ.rich(verdict)}</div>` : "");
      this.cmp.className = "cp-compare " + (eq ? "ok" : "no");
      CQ.audio.play(eq ? "balance.level" : "tryagain");
      await CQ.anim(this.cmp, [{ transform: "scale(.3)", opacity: 0 }, { transform: "scale(1)", opacity: 1 }], { duration: 520, easing: CQ.EASE.back, essential: true });
      return eq;
    },
  };

  // ------------------------------------------------------------------ equation board (Levels 8 and 9)
  // One equation under the balance that changes as each step is done to the balance.
  CQ.eqBoard = {
    build(ui) {
      this.el = CQ.el("div", "eq-board hidden", ui);
      this.row = CQ.el("div", "eb-row", this.el);
    },
    show(text, opts) {
      this.el.classList.remove("hidden");
      this.set(text, Object.assign({}, opts, { quiet: true }));
      return CQ.anim(this.el, [{ transform: "translate(-50%, 60px)", opacity: 0 }, { transform: "translate(-50%, 0)", opacity: 1 }], {
        duration: 580,
        easing: CQ.EASE.out,
        essential: true,
      });
    },
    // opts.final: the answer (green)
    set(text, opts) {
      opts = opts || {};
      this.row.innerHTML = CQ.rich(text);
      this.row.classList.toggle("final", !!opts.final);
      if (opts.quiet) return;
      CQ.audio.play("ui.pop");
      CQ.anim(this.row, [{ transform: "scale(.85)", opacity: 0.15 }, { transform: "scale(1)", opacity: 1 }], { duration: 480, easing: CQ.EASE.out, keep: false });
    },
    hide(now) {
      if (now) {
        this.el.classList.add("hidden");
        return Promise.resolve();
      }
      return CQ.anim(this.el, [{ opacity: 1 }, { opacity: 0 }], { duration: 440, essential: true }).then(() => this.el.classList.add("hidden"));
    },
  };
})();
