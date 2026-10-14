/*
 * Zippy's Crown Quest: engine.
 * Small helpers shared by every other file: DOM + text helpers, stage scaling, a frame ticker,
 * tweens, cancellable game flow, sprites, camera, particles, dragging and idle help.
 * Everything lives on the global `CQ` object (classic scripts, no modules, so it runs from file://).
 */
(function () {
  "use strict";
  const CQ = (window.CQ = window.CQ || {});
  const W = 1920;
  const H = 1080;
  CQ.W = W;
  CQ.H = H;

  // Scene layout in stage units (the stage is always 1920 x 1080).
  CQ.L = {
    BX: 1085, // balance centre x
    PIVOT_Y: 330, // beam pivot y
    GRUMBLE: { x: 262, y: 950, scale: 1.35 },
    // Zippy hangs by his tail from a tree root that comes down from above the screen.
    // (ax, ay) = where the root swings from (off-screen), len = root length to his tail.
    ZIPPY: { ax: 420, ay: -120, len: 236, scale: 0.72 },
    HELD_BAR_W: 146, // a gold bar in Zippy's hands
    PEDESTAL_TOP: 968,
    BAR_W: 220,
    // sizes of things on the pans, in balance units (the whole balance is drawn at BAL.S)
    PAN_BAR_W: 150,
    CROWN_W: 160,
    COIN_W: 60,
  };

  // ------------------------------------------------------------------ DOM + text helpers
  CQ.el = function (tag, cls, parent, html) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    if (parent) parent.appendChild(e);
    return e;
  };
  CQ.qs = (s, r) => (r || document).querySelector(s);
  CQ.pos = (e, x, y) => {
    e.style.left = x + "px";
    e.style.top = y + "px";
    return e;
  };
  CQ.box = (e, x, y, w, h) => {
    e.style.left = x + "px";
    e.style.top = y + "px";
    if (w != null) e.style.width = w + "px";
    if (h != null) e.style.height = h + "px";
    return e;
  };
  CQ.img = (key, cls, parent) => {
    const i = CQ.el("img", cls, parent);
    i.src = window.IMAGES[key].src;
    i.alt = "";
    i.draggable = false;
    return i;
  };

  CQ.fmt = (s, v) => String(s).replace(/\{(\w+)\}/g, (m, k) => (v && v[k] != null ? v[k] : m));
  CQ.T = (id, v) => {
    const lines = (window.CONTENT && CONTENT.lines) || {};
    return CQ.fmt(lines[id] != null ? lines[id] : id, v);
  };

  const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  // Rich text for captions, bubbles and equations: the variable x in italic serif, real minus signs,
  // superscript powers and a drawn ≠ sign. "x" inside ordinary words (Next, box…) is left alone.
  CQ.rich = function (s) {
    return esc(s)
      .replace(/ - /g, " − ")
      .replace(/\^(\d)/g, "<sup>$1</sup>")
      .replace(/²/g, "<sup>2</sup>")
      .replace(/(^|[^A-Za-z])x(?![A-Za-z])/g, '$1<i class="v">x</i>')
      .replace(/≠/g, '<span class="neq">=</span>');
  };
  // Text for the speech engine: read maths the way a teacher would say it.
  CQ.speakable = function (s) {
    return String(s)
      .replace(/(\d)x(\^2|²)/g, "$1 x squared")
      .replace(/x(\^2|²)/g, "x squared")
      .replace(/(\d)x\b/g, "$1 x")
      .replace(/≠/g, " is not equal to ")
      .replace(/ = /g, " equals ")
      .replace(/ =$/g, " equals")
      .replace(/ \+ /g, " plus ")
      .replace(/ [−-] /g, " minus ")
      .replace(/\bLHS\b/g, "L H S")
      .replace(/\bRHS\b/g, "R H S")
      .replace(/…/g, "... ")
      .replace(/—/g, ", ");
  };

  // ------------------------------------------------------------------ maths + easing
  CQ.clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  CQ.lerp = (a, b, t) => a + (b - a) * t;
  CQ.rand = (a, b) => a + Math.random() * (b - a);
  CQ.pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  CQ.shuffle = (arr) => {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
  CQ.ease = {
    linear: (t) => t,
    in: (t) => t * t * t,
    out: (t) => 1 - Math.pow(1 - t, 3),
    inOut: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
    sine: (t) => -(Math.cos(Math.PI * t) - 1) / 2,
    back: (t) => {
      const c1 = 1.70158;
      const c3 = c1 + 1;
      return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
    },
  };
  CQ.EASE = {
    out: "cubic-bezier(.22,1,.36,1)",
    back: "cubic-bezier(.34,1.56,.64,1)",
    inOut: "cubic-bezier(.65,0,.35,1)",
    in: "cubic-bezier(.55,0,1,.45)",
  };

  CQ.motion = {
    reduced: !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches),
  };

  // ------------------------------------------------------------------ storage + analytics hook
  CQ.store = {
    get(k, d) {
      try {
        const v = localStorage.getItem("cq." + k);
        return v == null ? d : JSON.parse(v);
      } catch (e) {
        return d;
      }
    },
    set(k, v) {
      try {
        localStorage.setItem("cq." + k, JSON.stringify(v));
      } catch (e) {
        /* storage blocked: progress just isn't saved */
      }
    },
  };
  // Replace with a real analytics call when the game is embedded in a platform.
  CQ.track = function (event, data) {
    try {
      console.log("[track]", event, data || {});
    } catch (e) {
      /* ignore */
    }
  };

  // ------------------------------------------------------------------ audio facade (never throws)
  // Note: speak() cuts off whatever is being said. When writing story steps, await a line (or use
  // CQ.say with advance "auto") before starting the next one, or the child will miss words.
  const A = () => window.CQAudio;
  const safe = (fn, d) => {
    try {
      return fn();
    } catch (e) {
      return d;
    }
  };
  CQ.audio = {
    init: () => safe(() => A() && A().init()),
    play: (c, o) => safe(() => A() && A().play(c, o)),
    music: (n) => safe(() => A() && A().music(n)),
    ambience: (on) => safe(() => A() && A().ambience(on)),
    duck: (on) => safe(() => A() && A().duck(on)),
    stopSpeech: () => safe(() => A() && A().stopSpeech()),
    setEnabled: (k, on) => safe(() => A() && A().setEnabled(k, on)),
    isEnabled: (k) => safe(() => (A() ? !!A().isEnabled(k) : false), false),
    speak(text, opts) {
      try {
        if (A()) return Promise.resolve(A().speak(text, opts)).catch(() => ({ spoken: false }));
      } catch (e) {
        /* fall through */
      }
      return Promise.resolve({ spoken: false });
    },
  };

  // ------------------------------------------------------------------ cancellable game flow
  class CancelError extends Error {
    constructor() {
      super("cancelled");
      this.name = "CancelError";
    }
  }
  CQ.CancelError = CancelError;
  function makeToken() {
    const t = { cancelled: false, fns: new Set() };
    t.cancel = () => {
      if (t.cancelled) return;
      t.cancelled = true;
      t.fns.forEach((f) => safe(f));
      t.fns.clear();
    };
    return t;
  }
  CQ.sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  // Every step of the story awaits through CQ.run, so jumping to another chapter (or restarting a
  // level) cancels whatever was running cleanly instead of leaving it half-finished.
  // While paused (menu, Word Treasure or a confirm is open) the story holds at its next step.
  CQ.run = {
    token: makeToken(),
    gate: null,
    openGate: null,
    restart() {
      this.token.cancel();
      this.token = makeToken();
      this.resume();
      return this.token;
    },
    pause() {
      if (!this.gate) this.gate = new Promise((r) => (this.openGate = r));
    },
    resume() {
      const open = this.openGate;
      this.gate = null;
      this.openGate = null;
      if (open) open();
    },
    when(p) {
      const t = this.token;
      if (t.cancelled) return Promise.reject(new CancelError());
      return new Promise((res, rej) => {
        const off = () => rej(new CancelError());
        t.fns.add(off);
        Promise.resolve(p).then(
          async (v) => {
            while (this.gate && !t.cancelled) await this.gate;
            t.fns.delete(off);
            if (t.cancelled) rej(new CancelError());
            else res(v);
          },
          (e) => {
            t.fns.delete(off);
            rej(e);
          }
        );
      });
    },
    wait(ms) {
      return this.when(CQ.sleep(ms));
    },
    onCancel(fn) {
      if (this.token.cancelled) fn();
      else this.token.fns.add(fn);
    },
  };

  // ------------------------------------------------------------------ frame ticker + tweens
  const tickers = new Set();
  CQ.ticker = {
    add(fn) {
      tickers.add(fn);
      return () => tickers.delete(fn);
    },
  };
  let last = performance.now();
  function loop(now) {
    const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
    last = now;
    tickers.forEach((fn) => {
      try {
        fn(dt, now);
      } catch (e) {
        console.error(e);
      }
    });
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  const channels = new Map();
  // Value tween. Starting a new tween on the same channel stops the old one.
  CQ.tween = function (dur, fn, ease, channel) {
    ease = ease || CQ.ease.inOut;
    if (channel && channels.has(channel)) channels.get(channel).stop();
    return new Promise((res) => {
      let off = null;
      let done = false;
      const start = performance.now();
      const ctl = {
        stop() {
          if (done) return;
          done = true;
          if (off) off();
          if (channel && channels.get(channel) === ctl) channels.delete(channel);
          res(false);
        },
      };
      if (!(dur > 0)) {
        fn(1, 1);
        res(true);
        return;
      }
      if (channel) channels.set(channel, ctl);
      off = CQ.ticker.add((dt, now) => {
        if (done) return;
        const t = Math.min(1, Math.max(0, (now - start) / dur));
        fn(ease(t), t);
        if (t >= 1) {
          done = true;
          off();
          if (channel && channels.get(channel) === ctl) channels.delete(channel);
          res(true);
        }
      });
    });
  };
  CQ.stopTween = (channel) => {
    const c = channels.get(channel);
    if (c) c.stop();
  };
  CQ.stopTweens = () => {
    Array.from(channels.values()).forEach((c) => c.stop());
    channels.clear();
  };

  // Web Animations helper. keep:true (default) commits the final state to inline styles.
  CQ.anim = function (el, keyframes, opts) {
    if (!el || !el.animate) return Promise.resolve();
    const o = Object.assign({ duration: 400, easing: "ease", fill: "both" }, opts || {});
    const keep = o.keep !== false;
    delete o.keep;
    if (CQ.motion.reduced && o.duration > 300 && !o.essential) o.duration = Math.max(200, o.duration * 0.6);
    delete o.essential;
    let a;
    try {
      a = el.animate(keyframes, o);
    } catch (e) {
      return Promise.resolve();
    }
    return a.finished.then(
      () => {
        if (keep) safe(() => a.commitStyles());
        a.cancel();
      },
      () => {}
    );
  };

  // Fly an element (centre-anchored) from one stage point to another along an arc.
  CQ.fly = function (layer, el, from, to, opts) {
    opts = opts || {};
    const dur = opts.duration || 600;
    const arc = opts.arc != null ? opts.arc : -120;
    el.classList.add("flyer");
    layer.appendChild(el);
    CQ.pos(el, from.x, from.y);
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const s0 = opts.scaleFrom != null ? opts.scaleFrom : 1;
    const s1 = opts.scaleTo != null ? opts.scaleTo : 1;
    const kf = [];
    for (let i = 0; i <= 14; i++) {
      const t = i / 14;
      const e = CQ.ease.inOut(t);
      kf.push({
        transform: `translate(-50%,-50%) translate(${dx * e}px, ${dy * e + arc * 4 * t * (1 - t)}px) scale(${
          s0 + (s1 - s0) * e
        }) rotate(${(opts.spin || 0) * e}deg)`,
        opacity: opts.fadeOut && i === 14 ? 0 : 1,
      });
    }
    return CQ.anim(el, kf, { duration: dur, easing: "linear", essential: true }).then(() => {
      if (opts.remove !== false) el.remove();
    });
  };

  // ------------------------------------------------------------------ stage scaling (16:9 letterbox)
  CQ.stage = {
    scale: 1,
    ox: 0,
    oy: 0,
    el: null,
    init(el) {
      this.el = el;
      // #viewport is fixed to the window; its padding keeps the stage clear of notches + a side margin.
      const vp = el.parentElement;
      const fit = () => {
        const cs = getComputedStyle(vp);
        const pl = parseFloat(cs.paddingLeft) || 0;
        const pt = parseFloat(cs.paddingTop) || 0;
        const vw = vp.clientWidth - pl - (parseFloat(cs.paddingRight) || 0);
        const vh = vp.clientHeight - pt - (parseFloat(cs.paddingBottom) || 0);
        const s = Math.max(0.05, Math.min(vw / W, vh / H));
        this.scale = s;
        this.ox = pl + (vw - W * s) / 2;
        this.oy = pt + (vh - H * s) / 2;
        el.style.transform = `translate(${this.ox}px, ${this.oy}px) scale(${s})`;
      };
      window.addEventListener("resize", fit);
      window.addEventListener("orientationchange", () => setTimeout(fit, 250));
      fit();
    },
    toStage(cx, cy) {
      return { x: (cx - this.ox) / this.scale, y: (cy - this.oy) / this.scale };
    },
  };

  // ------------------------------------------------------------------ camera (moves the World layer)
  CQ.camera = {
    x: 0,
    y: 0,
    z: 1,
    el: null,
    shakeEl: null,
    init(worldEl, shakeEl) {
      this.el = worldEl;
      this.shakeEl = shakeEl;
      this.apply();
    },
    apply() {
      if (this.el) this.el.style.transform = `translate(${this.x}px, ${this.y}px) scale(${this.z})`;
    },
    frame(fx, fy, z) {
      const x = CQ.clamp(W / 2 - fx * z, W - W * z, 0);
      const y = CQ.clamp(H / 2 - fy * z, H - H * z, 0);
      return { x, y, z };
    },
    set(fx, fy, z) {
      Object.assign(this, this.frame(fx, fy, z));
      this.apply();
    },
    to(fx, fy, z, dur, ease) {
      const a = { x: this.x, y: this.y, z: this.z };
      const b = this.frame(fx, fy, z);
      if (CQ.motion.reduced) dur = Math.min(dur || 0, 300);
      return CQ.tween(
        dur,
        (k) => {
          this.x = a.x + (b.x - a.x) * k;
          this.y = a.y + (b.y - a.y) * k;
          this.z = a.z + (b.z - a.z) * k;
          this.apply();
        },
        ease || CQ.ease.inOut,
        "camera"
      );
    },
    reset(dur) {
      return this.to(W / 2, H / 2, 1, dur || 0);
    },
    toScreen(p) {
      return { x: p.x * this.z + this.x, y: p.y * this.z + this.y };
    },
    toWorld(p) {
      return { x: (p.x - this.x) / this.z, y: (p.y - this.y) / this.z };
    },
    shake(power, dur) {
      if (CQ.motion.reduced || !this.shakeEl) return;
      power = power || 14;
      const kf = [];
      for (let i = 0; i <= 10; i++) {
        const f = (1 - i / 10) * power;
        kf.push({ transform: `translate(${CQ.rand(-f, f)}px, ${CQ.rand(-f, f)}px)` });
      }
      kf[kf.length - 1] = { transform: "translate(0px, 0px)" };
      CQ.anim(this.shakeEl, kf, { duration: dur || 500, easing: "linear", keep: false, essential: true });
    },
  };

  // ------------------------------------------------------------------ sprites (strips made by tools/prepare_assets.py)
  class Sprite {
    constructor(parent, cls, scale) {
      this.el = CQ.el("div", "sprite " + (cls || ""), parent);
      this.scale = scale;
      this.sheet = null;
      this.frame = 0;
      this.timer = null;
      this.seq = 0;
      this._res = null;
    }
    show(sheet, frame) {
      const s = window.SPRITES[sheet];
      if (!s) return;
      const k = this.scale;
      if (this.sheet !== sheet) {
        this.sheet = sheet;
        Object.assign(this.el.style, {
          backgroundImage: `url("${s.src}")`,
          backgroundSize: `${s.w * s.count * k}px ${s.h * k}px`,
          width: s.w * k + "px",
          height: s.h * k + "px",
          left: -s.ax * k + "px",
          top: -s.ay * k + "px",
        });
      }
      this.frame = frame;
      this.el.style.backgroundPosition = `${-(frame - 1) * s.w * k}px 0px`;
    }
    // Play frames (1-based). dur = ms per frame or an array. Resolves true when finished, false if interrupted.
    play(sheet, frames, dur, opts) {
      opts = opts || {};
      this.stop();
      const id = ++this.seq;
      let i = 0;
      return new Promise((res) => {
        this._res = res;
        const step = () => {
          if (id !== this.seq) return;
          if (i >= frames.length) {
            if (opts.loop) i = 0;
            else {
              this.timer = null;
              this._res = null;
              res(true);
              return;
            }
          }
          const f = frames[i];
          this.show(sheet, f);
          if (opts.onFrame) safe(() => opts.onFrame(f, i));
          const d = Array.isArray(dur) ? dur[i % dur.length] : dur;
          i++;
          this.timer = setTimeout(step, d);
        };
        step();
      });
    }
    stop() {
      this.seq++;
      clearTimeout(this.timer);
      this.timer = null;
      if (this._res) {
        const r = this._res;
        this._res = null;
        r(false);
      }
    }
    // Sprite size and anchor in stage units for the current sheet.
    metrics() {
      const s = window.SPRITES[this.sheet];
      const k = this.scale;
      return s ? { w: s.w * k, h: s.h * k, ax: s.ax * k, ay: s.ay * k } : { w: 0, h: 0, ax: 0, ay: 0 };
    }
  }
  CQ.Sprite = Sprite;

  // ------------------------------------------------------------------ particles
  const CONFETTI = ["#FFD84D", "#F08A24", "#2BB673", "#3D8BFD", "#E5484D", "#9B5DE5", "#FFFFFF"];
  CQ.fx = {
    confetti(layer, x, y, n) {
      n = CQ.motion.reduced ? 14 : n || 40;
      for (let i = 0; i < n; i++) {
        const p = CQ.el("div", "confetti", layer);
        p.style.background = CQ.pick(CONFETTI);
        if (Math.random() < 0.35) p.style.borderRadius = "50%";
        CQ.pos(p, x, y);
        const dx = CQ.rand(-420, 420);
        const up = CQ.rand(160, 420);
        const fall = CQ.rand(260, 560);
        const r = CQ.rand(-720, 720);
        CQ.anim(
          p,
          [
            { transform: "translate(-50%,-50%) translate(0,0) rotate(0deg)", opacity: 1 },
            { transform: `translate(-50%,-50%) translate(${dx * 0.55}px, ${-up}px) rotate(${r * 0.4}deg)`, opacity: 1, offset: 0.35 },
            { transform: `translate(-50%,-50%) translate(${dx}px, ${fall}px) rotate(${r}deg)`, opacity: 0 },
          ],
          { duration: CQ.rand(1300, 2100), easing: "cubic-bezier(.2,.6,.4,1)", keep: false, essential: true }
        ).then(() => p.remove());
      }
    },
    sparkle(layer, x, y, n, spread) {
      n = n || 8;
      spread = spread || 80;
      for (let i = 0; i < n; i++) {
        const s = CQ.el("div", "sparkle", layer);
        CQ.pos(s, x + CQ.rand(-spread, spread), y + CQ.rand(-spread, spread));
        const size = CQ.rand(0.6, 1.3);
        CQ.anim(
          s,
          [
            { transform: "translate(-50%,-50%) scale(0) rotate(0deg)", opacity: 0 },
            { transform: `translate(-50%,-50%) scale(${size}) rotate(90deg)`, opacity: 1, offset: 0.4 },
            { transform: "translate(-50%,-50%) scale(0) rotate(180deg)", opacity: 0 },
          ],
          { duration: CQ.rand(600, 1000), delay: CQ.rand(0, 400), easing: "ease-out", keep: false, essential: true }
        ).then(() => s.remove());
      }
    },
    dust(layer, x, y, n) {
      n = n || 7;
      for (let i = 0; i < n; i++) {
        const d = CQ.el("div", "dust", layer);
        CQ.pos(d, x + CQ.rand(-60, 60), y + CQ.rand(-14, 6));
        const dx = CQ.rand(-110, 110);
        CQ.anim(
          d,
          [
            { transform: "translate(-50%,-50%) scale(.3)", opacity: 0.85 },
            { transform: `translate(-50%,-50%) translate(${dx}px, ${CQ.rand(-50, -10)}px) scale(${CQ.rand(1.1, 1.8)})`, opacity: 0 },
          ],
          { duration: CQ.rand(600, 900), easing: "ease-out", keep: false, essential: true }
        ).then(() => d.remove());
      }
    },
    zzz(layer, x, y, big) {
      const z = CQ.el("div", "zzz", layer, "Z");
      const size = (big ? 1.5 : 1) * CQ.rand(0.8, 1.15);
      CQ.pos(z, x, y);
      z.style.fontSize = Math.round(44 * size) + "px";
      CQ.anim(
        z,
        [
          { transform: "translate(-50%,-50%) translate(0,0) scale(.4) rotate(-10deg)", opacity: 0 },
          { transform: "translate(-50%,-50%) translate(26px,-60px) scale(1) rotate(6deg)", opacity: 1, offset: 0.35 },
          { transform: "translate(-50%,-50%) translate(70px,-170px) scale(1.3) rotate(-8deg)", opacity: 0 },
        ],
        { duration: 2300, easing: "ease-out", keep: false, essential: true }
      ).then(() => z.remove());
    },
    ring(layer, x, y, color) {
      const r = CQ.el("div", "fx-ring", layer);
      CQ.pos(r, x, y);
      if (color) r.style.borderColor = color;
      CQ.anim(
        r,
        [
          { transform: "translate(-50%,-50%) scale(.2)", opacity: 0.9 },
          { transform: "translate(-50%,-50%) scale(1.6)", opacity: 0 },
        ],
        { duration: 700, easing: "ease-out", keep: false, essential: true }
      ).then(() => r.remove());
    },
  };

  // ------------------------------------------------------------------ dragging (mouse, touch, pen + keyboard)
  // h: { enabled(), start(pt), move(pt), end(pt, moved), tap(pt), key() }
  CQ.drag = function (el, h) {
    let active = null;
    el.addEventListener("pointerdown", (e) => {
      if (e.button > 0) return;
      if (h.enabled && !h.enabled()) return;
      e.preventDefault();
      e.stopPropagation();
      safe(() => el.setPointerCapture(e.pointerId));
      const pt = CQ.stage.toStage(e.clientX, e.clientY);
      active = { id: e.pointerId, start: pt, last: pt, t0: performance.now(), moved: false };
      if (h.start) h.start(pt);
    });
    el.addEventListener("pointermove", (e) => {
      if (!active || e.pointerId !== active.id) return;
      const pt = CQ.stage.toStage(e.clientX, e.clientY);
      if (!active.moved && Math.hypot(pt.x - active.start.x, pt.y - active.start.y) > 12) active.moved = true;
      active.last = pt;
      if (active.moved && h.move) h.move(pt);
    });
    const finish = (e, cancelled) => {
      if (!active || e.pointerId !== active.id) return;
      const a = active;
      active = null;
      safe(() => el.releasePointerCapture(e.pointerId));
      const pt = cancelled ? a.last : CQ.stage.toStage(e.clientX, e.clientY);
      if (!a.moved && !cancelled && performance.now() - a.t0 < 700 && h.tap) h.tap(pt);
      else if (h.end) h.end(pt, a.moved);
    };
    el.addEventListener("pointerup", (e) => finish(e, false));
    el.addEventListener("pointercancel", (e) => finish(e, true));
    el.addEventListener("lostpointercapture", (e) => finish(e, true));
    el.addEventListener("keydown", (e) => {
      if ((e.key === "Enter" || e.key === " ") && (!h.enabled || h.enabled())) {
        e.preventDefault();
        if (h.key) h.key();
        else if (h.tap) h.tap(null);
      }
    });
  };

  // ------------------------------------------------------------------ idle help (no action for a while)
  CQ.idle = {
    timer: null,
    fn: null,
    ms: 8000,
    arm(fn, ms) {
      this.fn = fn;
      this.ms = ms || 8000;
      this.reset();
    },
    reset() {
      clearTimeout(this.timer);
      if (!this.fn) return;
      this.timer = setTimeout(() => {
        const f = this.fn;
        if (f) {
          safe(f);
          this.ms = Math.max(this.ms, 12000);
          this.reset();
        }
      }, this.ms);
    },
    disarm() {
      clearTimeout(this.timer);
      this.fn = null;
    },
  };
  ["pointerdown", "keydown"].forEach((t) => window.addEventListener(t, () => CQ.idle.reset(), true));

  // ------------------------------------------------------------------ image preloading
  CQ.preload = function (urls, onProgress) {
    let done = 0;
    CQ._imgs = [];
    return Promise.all(
      urls.map(
        (u) =>
          new Promise((res) => {
            const img = new Image();
            CQ._imgs.push(img);
            const fin = () => {
              done++;
              if (onProgress) onProgress(done / urls.length);
              res();
            };
            img.onload = () => {
              if (img.decode) img.decode().then(fin, fin);
              else fin();
            };
            img.onerror = fin;
            img.src = u;
          })
      )
    );
  };
})();
