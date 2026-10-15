/*
 * Zippy's Crown Quest: the world.
 * The jungle lake background, Grumble, Zippy, the balance scale, the gold bars on their pedestals,
 * and the "give a bar to Zippy" drag controller. All positions are stage units (1920 x 1080).
 */
(function () {
  "use strict";
  const CQ = window.CQ;
  const L = CQ.L;
  const IM = () => window.IMAGES;
  const deg = Math.PI / 180;

  // ================================================================== world construction
  CQ.world = {
    build(root) {
      this.root = root;
      // the jungle lake, in layers (made from "background sheet.png": see jungle-background/README.md)
      this.decor = CQ.el("div", "layer bg-scene", root);
      buildBackground(this.decor);
      this.balanceLayer = CQ.el("div", "layer balance-layer", root);
      this.grumbleLayer = CQ.el("div", "layer grumble-layer", root);
      this.barLayer = CQ.el("div", "layer bar-layer", root);
      this.zippyLayer = CQ.el("div", "layer zippy-layer", root);
      this.fx = CQ.el("div", "layer fx-layer", root);
      this.drag = CQ.el("div", "layer drag-layer", root);
      this.dark = CQ.el("div", "world-dark", root); // the intro fades in from dark
      CQ.balance = new Balance(this.balanceLayer);
      CQ.grumble = new Grumble(this.grumbleLayer);
      CQ.bars = new Bars(this.barLayer);
      CQ.zippy = new Zippy(this.zippyLayer);
      CQ.dropRing.build(this.drag);
    },
    darkness(level, dur) {
      return CQ.anim(this.dark, [{ opacity: getComputedStyle(this.dark).opacity }, { opacity: level }], {
        duration: dur || 600,
        easing: "ease-out",
        essential: true,
      });
    },
  };

  // The background layers, back to front (BG_LAYERS in assets/sprites.js). Some have a gentle idle
  // motion: the clouds drift, the branch and the bushes sway (off with Reduced motion).
  function buildBackground(layer) {
    (window.BG_LAYERS || []).forEach((ly, i) => {
      const img = CQ.img(ly.key, ly.anim && ly.anim !== "shimmer" ? "anim-" + ly.anim : "", layer);
      CQ.box(img, ly.x, ly.y, ly.w, ly.h);
      if (ly.anim) img.style.animationDelay = (-(i * 1.37) % 6).toFixed(2) + "s"; // no two sway in step
    });
  }

  // ================================================================== the drop ring around Zippy's hands
  CQ.dropRing = {
    build(layer) {
      this.el = CQ.el("div", "drop-ring hidden", layer);
      this.off = null;
    },
    show() {
      this.el.classList.remove("hidden", "hot");
      if (!this.off)
        this.off = CQ.ticker.add(() => {
          const p = CQ.zippy.holdPoint();
          CQ.pos(this.el, p.x, p.y);
        });
    },
    hot(on) {
      this.el.classList.toggle("hot", !!on);
    },
    hide() {
      this.el.classList.add("hidden");
      if (this.off) this.off();
      this.off = null;
    },
  };

  // ================================================================== Grumble
  class Grumble {
    constructor(layer) {
      const G = L.GRUMBLE;
      this.k = G.scale;
      this.x = G.x;
      this.y = G.y;
      this.rig = CQ.el("div", "grumble-rig", layer);
      CQ.pos(this.rig, this.x, this.y);
      // his shadow on the ground (it stays put when he squashes, and narrows when he stands up)
      this.shadow = CQ.el("div", "grumble-shadow", this.rig);
      const sw = window.SPRITES.grumble_sleep.w * this.k * 1.05;
      const sh = sw * 0.15;
      CQ.box(this.shadow, -sw / 2, -sh * 0.5, sw, sh);
      this.squash = CQ.el("div", "grumble-squash", this.rig);
      this.sprite = new CQ.Sprite(this.squash, "grumble-sprite", this.k);
      this.sprite.show("grumble_sleep", 1);
      this.snoreVol = 1;
      this.state = "sleep";
      this.lastTap = 0;
      this.sprite.el.addEventListener("pointerdown", (e) => {
        e.stopPropagation();
        this.tapped();
      });
    }
    // Body centre in world coordinates (for the spotlight).
    center() {
      return { x: this.x, y: this.y - (this.state === "awake" ? 200 : 111) * this.k };
    }
    head() {
      const f = this.k / 1.15; // offsets were tuned at scale 1.15
      return this.state === "awake" ? { x: this.x + 10 * f, y: this.y - 430 * f } : { x: this.x + 95 * f, y: this.y - 215 * f };
    }
    sleep() {
      this.state = "sleep";
      this.rig.classList.remove("standing");
      this.squash.style.transform = "";
      this.sprite.play("grumble_sleep", [1, 2, 3, 4, 5, 6, 7, 8], [700, 600, 800, 900], {
        loop: true,
        onFrame: (f) => {
          if (f === 2 || f === 6) {
            CQ.audio.play("grumble.snoreIn", { volume: this.snoreVol });
            const h = this.head();
            CQ.fx.zzz(CQ.world.fx, h.x, h.y, this.snoreVol > 1.3);
          }
          if (f === 4 || f === 8) CQ.audio.play("grumble.snoreOut", { volume: this.snoreVol * 0.85 });
        },
      });
    }
    // A near miss: one eye opens, he mumbles, and goes back to sleep.
    async stir() {
      if (this.state !== "sleep") return;
      this.state = "stir";
      CQ.audio.play("grumble.mumble");
      const h = this.head();
      CQ.comic(CONTENT.grumble.stir, h, { color: "purple", size: 70 });
      await this.sprite.play("grumble_wake", [1, 2, 3, 4], 150);
      await CQ.sleep(1000);
      await this.sprite.play("grumble_wake", [4, 3, 2, 1], 150);
      if (this.state === "stir") this.sleep();
    }
    // Stays stirring (eye open, no snoring) until settle() is called. Used in Level 8.
    async stirHold() {
      if (this.state !== "sleep") return;
      this.state = "stir";
      CQ.audio.play("grumble.mumble");
      const h = this.head();
      CQ.comic(CONTENT.grumble.stir, h, { color: "purple", size: 70 });
      await this.sprite.play("grumble_wake", [1, 2, 3, 4, 5], 160);
    }
    async settle() {
      if (this.state !== "stir") return;
      await this.sprite.play("grumble_wake", [5, 4, 3, 2, 1], 140);
      this.sleep();
    }
    // A wrong swap: wake up, pop up, roar, look around, yawn and flop back to sleep.
    // hooks.afterRoar runs while he is standing (Zippy swaps the crown back then).
    async wakeUp(hooks) {
      hooks = hooks || {};
      const gen = CQ.gen;
      const stale = () => gen !== CQ.gen; // the level was restarted: stop quietly
      this.state = "awake-ing";
      this.sprite.stop();
      CQ.audio.play("grumble.mumble");
      await this.sprite.play("grumble_wake", [1, 2, 3, 4, 5, 6, 7, 8], 105);
      if (stale()) return;
      this.state = "awake";
      this.rig.classList.add("standing");
      CQ.audio.play("dust.puff");
      CQ.fx.dust(CQ.world.fx, this.x, this.y - 10, 9);
      this.sprite.show("grumble_roar", 3);
      CQ.anim(this.squash, [{ transform: "scale(1.15, .8)" }, { transform: "scale(.92, 1.12)" }, { transform: "scale(1,1)" }], {
        duration: 380,
        easing: CQ.EASE.back,
        essential: true,
      });
      if (hooks.onStand) hooks.onStand();
      await CQ.sleep(380);
      if (stale()) return;
      await this.sprite.play("grumble_roar", [4, 5, 6], 130);
      if (stale()) return;
      this.sprite.show("grumble_roar", 7);
      CQ.audio.play("grumble.roar");
      CQ.audio.play("grumble.stomp");
      CQ.camera.shake(16, 650);
      const f = this.k / 1.15;
      CQ.comic(CONTENT.grumble.roar, { x: this.x + 30 * f, y: this.y - 200 * f }, { color: "purple", size: 88, dur: 1300 });
      if (hooks.onRoar) hooks.onRoar();
      await CQ.sleep(800);
      if (stale()) return;
      this.sprite.show("grumble_roar", 8);
      await CQ.sleep(300);
      if (stale()) return;
      if (hooks.afterRoar) await hooks.afterRoar();
      if (stale()) return;
      // looks around suspiciously
      this.sprite.show("grumble_roar", 1);
      await CQ.anim(this.squash, [{ transform: "scaleX(1)" }, { transform: "scaleX(-1)" }], { duration: 160, essential: true });
      await CQ.sleep(520);
      if (stale()) return;
      await CQ.anim(this.squash, [{ transform: "scaleX(-1)" }, { transform: "scaleX(1)" }], { duration: 160, essential: true });
      await CQ.sleep(420);
      if (stale()) return;
      this.sprite.show("grumble_roar", 2);
      CQ.audio.play("grumble.yawn");
      await CQ.sleep(1000);
      if (stale()) return;
      CQ.audio.play("grumble.flop");
      CQ.fx.dust(CQ.world.fx, this.x, this.y - 10, 8);
      this.sleep();
      CQ.anim(this.squash, [{ transform: "scale(1.1, .82)" }, { transform: "scale(1,1)" }], {
        duration: 420,
        easing: CQ.EASE.back,
        essential: true,
      });
      if (hooks.onAsleep) hooks.onAsleep();
    }
    tapped() {
      const now = performance.now();
      if (this.state !== "sleep" || now - this.lastTap < 3500) return;
      this.lastTap = now;
      const h = this.head();
      // Only a mumble sound and a bubble: tapping him must never cut off the narrator.
      CQ.audio.play("grumble.mumble");
      CQ.comic("Zzz…", h, { color: "purple", size: 54 });
      CQ.bubble.flash(CONTENT.grumble.tap, h, { who: "grumble" });
      this.state = "stir";
      this.sprite.play("grumble_wake", [1, 2, 3, 3, 3, 2, 1], 220).then(() => {
        if (this.state === "stir") this.sleep();
      });
    }
  }

  // ================================================================== Zippy's vine (tree bails.png)
  // Zippy hangs by his tail from the longest green vine in tree bails.png. It comes down from above
  // the screen and its pointed end sits in the curl of his tail; the vine is drawn behind him, so his
  // tail wraps in front of it.
  const VINE = {
    key: "vineE",
    scale: 0.6,
    end: { x: 117, y: 808 }, // the vine's pointed end in vine-e.png
    top: { x: 85, y: 44 }, // the middle of its top (the strand leans a little)
  };
  // Where the vine's end sits in the curl of Zippy's tail, measured from the top of his tail in
  // source-art pixels (the same "?" curl appears in every pose).
  const VINE_END_SRC = { x: 4, y: 120 };
  const VINE_LEAN = Math.atan2(VINE.top.x - VINE.end.x, VINE.end.y - VINE.top.y);
  // Vine end position for a Zippy sprite drawn at `scale` whose tail top is at (x, y).
  CQ.vineEndFor = (x, y, scale) => ({ x: x + VINE_END_SRC.x * scale, y: y + VINE_END_SRC.y * scale });
  CQ.makeVine = function (parent, cls) {
    const im = IMAGES[VINE.key];
    const e = CQ.img(VINE.key, "hang-vine" + (cls ? " " + cls : ""), parent);
    e.style.width = im.w * VINE.scale + "px";
    e.style.height = im.h * VINE.scale + "px";
    e.style.transformOrigin = `${VINE.end.x * VINE.scale}px ${VINE.end.y * VINE.scale}px`;
    return e;
  };
  // Put the vine's end at (x, y), pointing up at `angle` (radians, clockwise from straight up).
  CQ.placeVine = function (e, x, y, angle) {
    e.style.left = x - VINE.end.x * VINE.scale + "px";
    e.style.top = y - VINE.end.y * VINE.scale + "px";
    e.style.transform = `rotate(${((angle || 0) - VINE_LEAN).toFixed(4)}rad)`;
  };
  // A vine hanging straight down to (x, y) (notebook and finale).
  CQ.hangVine = function (parent, x, y) {
    const e = CQ.makeVine(parent);
    CQ.placeVine(e, x, y, 0);
    return e;
  };

  // ================================================================== Zippy
  // Where Zippy's hands are, measured from the tip of his tail, in source-art pixels (scaled at use).
  const HOLD_SRC = {
    zippy_hold: { x: 75, y: 417 },
    zippy_reach: { x: 67, y: 489 },
    zippy_laugh: { x: 42, y: 417 },
    zippy_scared: { x: 42, y: 417 },
  };
  const HOLD_OFFSET = {};
  Object.keys(HOLD_SRC).forEach((k) => {
    HOLD_OFFSET[k] = { x: HOLD_SRC[k].x * L.ZIPPY.scale, y: HOLD_SRC[k].y * L.ZIPPY.scale };
  });
  class Zippy {
    constructor(layer) {
      const Z = L.ZIPPY;
      this.k = Z.scale;
      this.A = { x: Z.ax, y: Z.ay };
      this.baseLen = Z.len;
      this.len = Z.len;
      this.theta = 0;
      this.swayAmp = 2.2;
      this.swayT = 0;
      this.sway = 0;
      this.tilt = 0.35;
      // the green vine he hangs from (drawn behind him, so his tail wraps in front of it)
      this.vine = CQ.makeVine(layer, "zippy-vine");
      this.tipOff = CQ.vineEndFor(0, 0, this.k);
      this.rig = CQ.el("div", "zippy-rig", layer);
      this.body = CQ.el("div", "zippy-body", this.rig);
      this.sprite = new CQ.Sprite(this.body, "zippy-sprite", this.k);
      this.heldEl = CQ.el("div", "held hidden", this.body);
      this.held = null;
      this.poseName = "";
      this.lastTap = 0;
      this.pose("idle");
      CQ.ticker.add((dt) => this.update(dt));
      this.sprite.el.addEventListener("pointerdown", (e) => {
        e.stopPropagation();
        this.tapped();
      });
    }
    get P() {
      const th = (this.theta + this.sway) * deg;
      return { x: this.A.x + this.len * Math.sin(th), y: this.A.y + this.len * Math.cos(th) };
    }
    update(dt) {
      this.swayT += dt;
      this.sway = this.swayAmp * Math.sin(this.swayT * 1.7);
      const th = this.theta + this.sway;
      const P = this.P;
      // The vine swings from A (above the screen); its pointed end sits in the curl of his tail.
      const a = -th * this.tilt * deg;
      const o = this.tipOff;
      const ex = P.x + o.x * Math.cos(a) - o.y * Math.sin(a);
      const ey = P.y + o.x * Math.sin(a) + o.y * Math.cos(a);
      CQ.placeVine(this.vine, ex, ey, Math.atan2(this.A.x - ex, ey - this.A.y));
      this.rig.style.transform = `translate(${P.x}px, ${P.y}px) rotate(${-th * this.tilt}deg)`;
    }
    holdOffset() {
      return HOLD_OFFSET[this.sprite.sheet] || HOLD_OFFSET.zippy_hold;
    }
    holdPoint(sheet) {
      const P = this.P;
      const o = sheet ? HOLD_OFFSET[sheet] : this.holdOffset();
      const a = -(this.theta + this.sway) * this.tilt * deg;
      return { x: P.x + o.x * Math.cos(a) - o.y * Math.sin(a), y: P.y + o.x * Math.sin(a) + o.y * Math.cos(a) };
    }
    // Generous drop zone around Zippy for little fingers.
    zone() {
      const m = this.sprite.metrics();
      const P = this.P;
      return { x0: P.x - m.ax - 120, y0: P.y - m.ay - 60, x1: P.x - m.ax + m.w + 130, y1: P.y - m.ay + m.h + 150 };
    }
    // Body centre in world coordinates (for bubbles, spotlight, name tags).
    center() {
      const P = this.P;
      const m = this.sprite.metrics();
      return { x: P.x + m.w / 2 - m.ax, y: P.y + m.h * 0.55 };
    }
    pose(name) {
      const s = this.sprite;
      this.poseName = name;
      switch (name) {
        case "idle":
          s.play("zippy_hold", [7, 7, 7, 6, 7, 7, 7, 7], [650, 650, 650, 140, 650, 650, 650, 650], { loop: true });
          break;
        case "talk":
          s.play("zippy_hold", [8, 7], 170, { loop: true });
          break;
        case "ready":
          s.play("zippy_hold", [1, 3], 380, { loop: true });
          break;
        case "hold":
          s.play("zippy_hold", [5, 8, 5, 6], [700, 500, 700, 140], { loop: true });
          break;
        case "holdTalk":
          s.play("zippy_hold", [8, 5], 170, { loop: true });
          break;
        case "curious":
          s.show("zippy_hold", 3);
          break;
        case "reach":
          s.play("zippy_reach", [5, 2, 3], 130);
          break;
        case "grab":
          s.show("zippy_reach", 1);
          break;
        case "point":
          s.play("zippy_reach", [2, 2, 2, 4], [700, 700, 700, 300], { loop: true });
          break;
        case "laugh":
          s.play("zippy_laugh", [6, 2, 6, 2, 4, 6, 2], 150, { loop: true });
          break;
        case "celebrate":
          s.play("zippy_laugh", [1, 7, 3, 8, 5], 190, { loop: true });
          break;
        case "swing":
          s.show("zippy_laugh", 1);
          break;
        case "shock":
          s.show("zippy_scared", 1);
          break;
        case "nervous":
          s.play("zippy_scared", [2, 4], 220, { loop: true });
          break;
        case "hide":
          s.play("zippy_scared", [3, 7], 280, { loop: true });
          break;
        case "phew":
          s.show("zippy_scared", 8);
          break;
        case "oops":
          s.show("zippy_scared", 5);
          break;
        default:
          s.show("zippy_hold", 7);
      }
      this.placeHeld();
    }
    setHeld(spec) {
      this.held = spec;
      if (!spec) {
        this.heldEl.className = "held hidden";
        this.heldEl.innerHTML = "";
        return;
      }
      if (spec.type === "bar") {
        this.heldEl.className = "held hbar";
        this.heldEl.innerHTML = `<span class="num">${spec.value}</span>`;
      } else {
        this.heldEl.className = "held hcrown";
        this.heldEl.innerHTML = `<img src="${IM().crown.src}" alt="" draggable="false">`;
      }
      this.placeHeld();
    }
    placeHeld() {
      const o = this.holdOffset();
      CQ.pos(this.heldEl, o.x, o.y);
    }
    moveTo(theta, len, dur, ease) {
      const a = { th: this.theta, len: this.len };
      return CQ.tween(
        dur,
        (k) => {
          this.theta = a.th + (theta - a.th) * k;
          this.len = a.len + (len - a.len) * k;
        },
        ease || CQ.ease.inOut,
        "zippy"
      );
    }
    home(dur) {
      this.swayAmp = 2.2;
      return this.moveTo(0, this.baseLen, dur == null ? 400 : dur);
    }
    // Vine angle + length that put Zippy's hands (for a given sheet) on a target point.
    solveFor(target, sheet) {
      const o = HOLD_OFFSET[sheet];
      let th = 0;
      let len = this.len;
      for (let i = 0; i < 5; i++) {
        const a = -th * this.tilt * deg;
        const ox = o.x * Math.cos(a) - o.y * Math.sin(a);
        const oy = o.x * Math.sin(a) + o.y * Math.cos(a);
        const px = target.x - ox;
        const py = target.y - oy;
        th = Math.atan2(px - this.A.x, py - this.A.y) / deg;
        len = Math.hypot(px - this.A.x, py - this.A.y);
      }
      return { th, len };
    }
    swingTo(target, dur) {
      this.swayAmp = 0;
      const s = this.solveFor(target, "zippy_reach");
      return this.moveTo(s.th, s.len, dur || 650, CQ.ease.inOut);
    }
    ready(on) {
      if (on) {
        this.pose("ready");
        this.swayAmp = 1;
        this.moveTo(0, this.baseLen + 35, 420, CQ.ease.out); // reach down a little (stays clear of Grumble)
      } else {
        this.pose(this.held ? "hold" : "idle");
        this.home(460);
      }
    }
    async catchBar(value) {
      this.setHeld({ type: "bar", value });
      this.pose("hold");
      CQ.audio.play("zippy.catch");
      CQ.anim(this.body, [{ transform: "translateY(0)" }, { transform: "translateY(22px) scale(1.04,.96)" }, { transform: "translateY(0)" }], {
        duration: 360,
        easing: CQ.EASE.back,
        keep: false,
      });
      await this.home(480);
    }
    async say(text, opts) {
      opts = opts || {};
      const prev = this.poseName;
      const talkPose = this.held ? "holdTalk" : "talk";
      if (!opts.keepPose) this.pose(talkPose);
      const owner = CQ.bubble.show(text, () => this.center(), { who: "zippy" });
      const r = await CQ.audio.speak(CQ.speakable(text), { who: "zippy", id: opts.id });
      if (!r || !r.spoken) await CQ.sleep(Math.max(1100, text.split(" ").length * 330));
      if (!opts.keepPose && this.poseName === talkPose) this.pose(prev === talkPose ? (this.held ? "hold" : "idle") : prev);
      if (!opts.keepBubble) CQ.bubble.hide(false, owner);
    }
    tapped() {
      const now = performance.now();
      if (now - this.lastTap < 2500 || CQ.Give.dragging) return;
      if (!["idle", "hold"].includes(this.poseName)) return;
      this.lastTap = now;
      const prev = this.poseName;
      CQ.audio.play("zippy.giggle");
      CQ.bubble.flash(CONTENT.names.zippy.replace("!", ""), this.center(), { who: "name" });
      if (!this.held) {
        this.pose("laugh");
        setTimeout(() => {
          if (this.poseName === "laugh") this.pose(prev);
        }, 900);
      }
    }
    // Intro: Zippy drops in from above the screen on his tree root and swings to a stop.
    async dropIn() {
      this.swayAmp = 0;
      this.setHeld(null);
      this.pose("swing");
      this.setVisible(true);
      const y0 = -900; // starts fully above the screen
      const yEnd = L.ZIPPY.ay;
      this.A.y = y0;
      this.theta = -40;
      CQ.audio.play("zippy.whee");
      await CQ.tween(
        800,
        (k) => {
          this.A.y = CQ.lerp(y0, yEnd, k);
          this.theta = CQ.lerp(-40, 24, k);
        },
        CQ.ease.out,
        "zippy"
      );
      await CQ.tween(
        1800,
        (k, t) => {
          const tt = t * 1.8;
          this.theta = 24 * Math.exp(-2.3 * tt) * Math.cos(2 * Math.PI * 0.95 * tt);
        },
        CQ.ease.linear,
        "zippy"
      );
      this.theta = 0;
      this.swayAmp = 2.2;
      this.pose("idle");
    }
    setVisible(on) {
      this.rig.style.visibility = on ? "visible" : "hidden";
      this.vine.style.visibility = on ? "visible" : "hidden";
    }
    reset() {
      this.A = { x: L.ZIPPY.ax, y: L.ZIPPY.ay };
      this.theta = 0;
      this.len = this.baseLen;
      this.swayAmp = 2.2;
      this.setHeld(null);
      this.setVisible(true);
      this.body.style.transform = "";
      this.pose("idle");
    }
  }

  // ================================================================== balance (art from elements.png)
  // The balance is put together from the beam, stand and pan pieces in elements.png; GEOM (in
  // assets/sprites.js) says where their joints are. Sizes are "balance units": the whole balance,
  // with everything on its pans, is drawn at scale S around the pivot. Only plain parts are stretched
  // (the bar between the balls and hub, and the post); balls, hub, base and pans keep their shape.
  // Each pan is drawn twice: whole behind the items, and just its front lip in front of them, so
  // things sit inside the bowl.
  const GM = window.GEOM;
  const BAL = {
    S: 0.78, // drawn size (1 = full size)
    R: 365, // pivot to each hanging point (the centre of an end ball)
    BEAM_K: 0.85, // beam art pixels -> balance units
    PAN_K: 1.55, // pan art pixels -> balance units
    STAND_K: 1.55, // stand art pixels -> balance units
    FLOOR: 480, // pivot down to the bottom of the base
  };
  BAL.HANG_DY = GM.beam.left.r * BAL.BEAM_K * 0.75; // the pan's ring hooks just under the end ball
  BAL.PAN_LEFT = -GM.pan.ringX * BAL.PAN_K;
  BAL.PAN_TOP = BAL.HANG_DY - GM.pan.ringY * BAL.PAN_K;
  BAL.RIM_Y = BAL.PAN_TOP + GM.pan.rimY * BAL.PAN_K; // hanging point down to the rim's centre line
  BAL.ITEMS_Y = BAL.RIM_Y + 6; // where items rest, just inside the bowl
  BAL.PAN_RX = ((GM.pan.rimR - GM.pan.rimL) / 2) * BAL.PAN_K; // rim half-width
  BAL.PAN_BOTTOM = BAL.PAN_TOP + GM.pan.bottom * BAL.PAN_K;
  BAL.HUB_R = GM.beam.hub.r * BAL.BEAM_K;
  CQ.BAL = BAL;
  // On-pan sizes in stage pixels (for bars and crowns flying to and from the pans).
  L.PAN_BAR_PX = L.PAN_BAR_W * BAL.S;
  L.CROWN_PX = L.CROWN_W * BAL.S;

  // Draw an image onto a canvas as soon as it is ready (it is preloaded, so normally at once).
  const imgCache = {};
  function artImage(key) {
    if (!imgCache[key]) {
      const i = new Image();
      i.src = IM()[key].src;
      imgCache[key] = i;
    }
    return imgCache[key];
  }
  function whenReady(img, fn) {
    if (img.complete && img.naturalWidth) fn();
    else img.addEventListener("load", fn, { once: true });
  }

  // The beam, at its art's own resolution, with the plain bar shortened so the balls sit at ±R.
  function beamCanvas() {
    const b = GM.beam;
    const im = IM().beam;
    const half = BAL.R / BAL.BEAM_K; // hub centre to ball centre, in beam-art pixels
    const W = Math.ceil(2 * (half + b.right.r + 6));
    const c = document.createElement("canvas");
    c.width = W;
    c.height = im.h;
    c.className = "bal-art bal-beam";
    const cx = W / 2;
    const leftX = cx - half - b.left.x; // where the beam art's x=0 lands for the left ball
    const rightX = cx + half - b.right.x;
    const hubX = cx - b.hub.x;
    whenReady(artImage("beam"), () => {
      const g = c.getContext("2d");
      const img = artImage("beam");
      const [l0, l1] = b.plainL;
      const [r0, r1] = b.plainR;
      g.drawImage(img, 0, 0, l0, im.h, leftX, 0, l0, im.h); // left ball + collar
      g.drawImage(img, l0, 0, l1 - l0 + 1, im.h, leftX + l0, 0, hubX + l1 + 1 - (leftX + l0), im.h); // left bar
      g.drawImage(img, l1 + 1, 0, r0 - l1 - 1, im.h, hubX + l1 + 1, 0, r0 - l1 - 1, im.h); // hub + collars
      g.drawImage(img, r0, 0, r1 - r0 + 1, im.h, hubX + r0, 0, rightX + r1 + 1 - (hubX + r0), im.h); // right bar
      g.drawImage(img, r1 + 1, 0, im.w - r1 - 1, im.h, rightX + r1 + 1, 0, im.w - r1 - 1, im.h); // right collar + ball
    });
    const k = BAL.BEAM_K;
    Object.assign(c.style, { width: W * k + "px", height: im.h * k + "px", left: -cx * k + "px", top: -b.hub.y * k + "px" });
    c.style.transformOrigin = `${cx * k}px ${b.hub.y * k}px`;
    return c;
  }

  // The stand, at its art's own resolution, with the post stretched so the base reaches the floor and
  // the ball on top peeks out just above the hub.
  function standCanvas() {
    const s = GM.stand;
    const im = IM().stand;
    const k = BAL.STAND_K;
    const ballR = s.ballY - s.top;
    const ballCentre = -(BAL.HUB_R + ballR * k * 0.55); // in balance units, above the pivot
    const need = (BAL.FLOOR - ballCentre) / k; // ball centre to the bottom, in stand-art pixels
    const extra = Math.max(0, Math.round(need - (s.bottom - s.ballY)));
    const c = document.createElement("canvas");
    c.width = im.w;
    c.height = im.h + extra;
    c.className = "bal-art bal-stand";
    whenReady(artImage("stand"), () => {
      const g = c.getContext("2d");
      const img = artImage("stand");
      g.drawImage(img, 0, 0, im.w, s.postTop, 0, 0, im.w, s.postTop); // ball and the top of the post
      g.drawImage(img, 0, s.postTop, im.w, s.baseTop - s.postTop, 0, s.postTop, im.w, s.baseTop - s.postTop + extra); // post
      g.drawImage(img, 0, s.baseTop, im.w, im.h - s.baseTop, 0, s.baseTop + extra, im.w, im.h - s.baseTop); // base
    });
    Object.assign(c.style, {
      width: im.w * k + "px",
      height: (im.h + extra) * k + "px",
      left: -s.cx * k + "px",
      top: ballCentre - s.ballY * k + "px",
    });
    return c;
  }

  // One pan: the whole pan behind the items, the items, then the pan's front lip in front of them.
  function panParts(group) {
    const im = IM().pan;
    const k = BAL.PAN_K;
    const size = { width: im.w * k + "px", height: im.h * k + "px", left: BAL.PAN_LEFT + "px", top: BAL.PAN_TOP + "px" };
    const back = CQ.img("pan", "bal-art bal-back", group);
    Object.assign(back.style, size);
    const items = CQ.el("div", "bal-items", group);
    CQ.pos(items, 0, BAL.ITEMS_Y);
    const front = CQ.img("pan", "bal-art bal-front", group);
    Object.assign(front.style, size);
    front.style.clipPath = `inset(${GM.pan.rimY * k}px 0 0 0)`;
    return items;
  }

  // The = / ≠ medallion in the hub (green when level, red when tipped; the sign itself is drawn here).
  function emblemParts(parent, cls) {
    const e = CQ.el("div", "emblem eq" + (cls ? " " + cls : ""), parent);
    const d = BAL.HUB_R * 2 * 0.94;
    Object.assign(e.style, { width: d + "px", height: d + "px", fontSize: Math.round(d * 0.72) + "px" });
    CQ.img("medalGreen", "medal green", e);
    CQ.img("medalRed", "medal red", e);
    CQ.el("span", "em-sym", e, "=");
    return e;
  }

  // Floor shadows under the base and the pans.
  function shadows(parent) {
    [
      [0, 1, 220],
      [-BAL.R, 0.55, 150],
      [BAL.R, 0.55, 150],
    ].forEach(([x, o, rx]) => {
      const sh = CQ.el("div", "bal-shadow", parent);
      CQ.box(sh, x - rx, BAL.FLOOR - 14, rx * 2, 34);
      sh.style.opacity = o;
    });
  }

  // A small, complete balance (notebook icon, intro thought bubble). opts: { width, left: 'bar',
  // right: 'coins3' }. Tipping is done in CSS (.tip on a parent).
  CQ.miniBalance = function (opts) {
    opts = opts || {};
    const w = opts.width || 150;
    const s = w / 1130; // the same frame as before: x -565..565, y -110..550 around the pivot
    const box = CQ.el("div", "mini-bal");
    Object.assign(box.style, { width: w + "px", height: Math.round(w * (660 / 1130)) + "px" });
    const rig = CQ.el("div", "mini-rig", box);
    rig.style.transform = `translate(${565 * s}px, ${110 * s}px) scale(${s})`;
    shadows(rig);
    rig.appendChild(standCanvas());
    [
      ["l", -1, opts.left],
      ["r", 1, opts.right],
    ].forEach(([n, side, what]) => {
      const holder = CQ.el("div", "mini-side", rig);
      holder.style.transform = `translate(${side * BAL.R}px, 0px)`;
      const g = CQ.el("div", `mb-pan mb-pan-${n}`, holder);
      const items = panParts(g);
      if (what === "bar") {
        const b = CQ.img("bar", "mini-item", items);
        Object.assign(b.style, { width: "160px", left: "-80px", top: "-74px" });
      } else if (what === "coins3") {
        [-70, 0, 70].forEach((x) => {
          const c = CQ.el("div", "mini-item mini-coin", items, '<span class="one">1</span>');
          Object.assign(c.style, { left: x - 32 + "px", top: "-64px" });
        });
      }
      // the front lip covers the bottom of the items
      g.appendChild(g.querySelector(".bal-front"));
    });
    const beamWrap = CQ.el("div", "mb-beam", rig);
    beamWrap.appendChild(beamCanvas());
    emblemParts(rig, "mb-em");
    return box;
  };

  // ================================================================== Balance scale
  class Balance {
    constructor(layer) {
      const BX = L.BX;
      const PY = L.PIVOT_Y;
      this.layer = layer;
      this.R = BAL.R;
      this.angle = 0;
      this.vel = 0;
      this.target = 0;
      this.items = { left: [], right: [] };
      this.rows = [4, 4, 4];
      this.crownMass = 5;
      this.itemK = 1; // crowns and bars are drawn smaller in Level 9, so two crowns and a bar fit on a pan
      this.counting = false;
      this.countN = 0;

      // Everything below is placed relative to the pivot inside one scaled container.
      this.rig = CQ.el("div", "bal-rig", layer);
      this.rig.style.transform = `translate(${BX}px, ${PY}px) scale(${BAL.S})`;
      const rig = this.rig;
      shadows(rig);
      this.stand = rig.appendChild(standCanvas());
      this.sides = {};
      ["left", "right"].forEach((side) => {
        const g = CQ.el("div", "bal-side " + side, rig);
        this.sides[side] = { g, items: panParts(g) };
      });
      this.beam = rig.appendChild(beamCanvas());
      this.emblem = emblemParts(rig);
      this.setEmblem(true, true);
      // The equation sign hangs on the post at full size (outside the scaled container).
      this.sign = CQ.el("div", "eq-sign hidden", layer);
      CQ.pos(this.sign, BX, PY + 218 * BAL.S);
      this.pendingClang = false;
      CQ.ticker.add((dt) => this.step(dt));
      this.apply();
    }
    step(dt) {
      const k = 32; // a soft spring: the beam tips and settles slowly enough to watch
      const c = 6.2;
      const acc = -k * (this.angle - this.target) - c * this.vel;
      this.vel += acc * dt;
      this.angle += this.vel * dt;
      if (Math.abs(this.angle - this.target) < 0.02 && Math.abs(this.vel) < 0.02) {
        this.angle = this.target;
        this.vel = 0;
      }
      if (this.pendingClang && Math.abs(this.angle - this.target) < Math.abs(this.target) * 0.12) {
        this.pendingClang = false;
        CQ.audio.play("balance.clang");
      }
      this.apply();
    }
    // Balance units (relative to the pivot) -> stage position.
    toWorld(p) {
      return { x: L.BX + p.x * BAL.S, y: L.PIVOT_Y + p.y * BAL.S };
    }
    apply() {
      const th = this.angle * deg;
      const c = Math.cos(th);
      const s = Math.sin(th);
      this.beam.style.transform = `rotate(${this.angle}deg)`;
      this.localEnds = {
        left: { x: -this.R * c, y: -this.R * s },
        right: { x: this.R * c, y: this.R * s },
      };
      // stage positions of the two hanging points (used by labels, flights and Zippy)
      this.ends = { left: this.toWorld(this.localEnds.left), right: this.toWorld(this.localEnds.right) };
      this.sides.left.g.style.transform = `translate(${this.localEnds.left.x}px, ${this.localEnds.left.y}px)`;
      this.sides.right.g.style.transform = `translate(${this.localEnds.right.x}px, ${this.localEnds.right.y}px)`;
    }
    makeItem(spec) {
      const im = IM();
      let el;
      let w;
      let h;
      if (spec.type === "crown") {
        el = CQ.img("crown", "pan-item crown");
        w = L.CROWN_W * this.itemK;
        h = (w * im.crown.h) / im.crown.w;
      } else if (spec.type === "coin") {
        el = CQ.el("div", "pan-item coin", null, '<span class="one">1</span><span class="count"></span>');
        w = h = L.COIN_W;
      } else {
        el = CQ.el("div", "pan-item pbar", null, `<span class="num">${spec.value}</span>`);
        w = (spec.w || L.PAN_BAR_W) * this.itemK;
        if (this.itemK !== 1) el.firstChild.style.fontSize = Math.round(44 * Math.sqrt(this.itemK)) + "px"; // small bars keep a readable number
        h = (w * im.bar.h) / im.bar.w;
      }
      el.style.width = w + "px";
      el.style.height = h + "px";
      const it = { type: spec.type, value: spec.value, el, w, h, slot: spec.slot || (spec.type === "crown" ? "main" : "extra") };
      if (spec.type === "coin") {
        el.addEventListener("pointerdown", (e) => {
          e.stopPropagation();
          this.countCoin(it);
        });
      }
      return it;
    }
    // A faded ("ghost") item is only a reminder of where something was: it has no mass.
    mass(side) {
      return this.items[side].reduce((m, it) => m + (it.ghost ? 0 : it.type === "coin" ? 1 : it.type === "bar" ? it.value : this.crownMass), 0);
    }
    ghost(it, on) {
      it.ghost = !!on;
      it.el.classList.toggle("ghost", !!on);
    }
    setPan(side, specs, opts) {
      opts = opts || {};
      this.sides[side].items.innerHTML = "";
      if (opts.rows) this.rows = opts.rows;
      this.items[side] = specs.map((s) => this.makeItem(s));
      this.items[side].forEach((it) => this.sides[side].items.appendChild(it.el));
      this.layout(side);
    }
    addItem(side, spec, index) {
      const it = this.makeItem(spec);
      if (index == null) this.items[side].push(it);
      else this.items[side].splice(index, 0, it);
      this.sides[side].items.appendChild(it.el);
      this.layout(side);
      return it;
    }
    removeItem(it) {
      ["left", "right"].forEach((side) => {
        const i = this.items[side].indexOf(it);
        if (i >= 0) this.items[side].splice(i, 1);
      });
      it.el.remove();
    }
    sideOf(it) {
      return this.items.left.includes(it) ? "left" : "right";
    }
    find(side, pred) {
      return this.items[side].find(pred);
    }
    layout(side) {
      const items = this.items[side];
      const pos = side === "left" ? this.layoutLeft(items) : this.layoutRight(items);
      items.forEach((it, i) => {
        const p = pos[i] || { x: 0, y: 0, z: 1 };
        it.x = p.x;
        it.y = p.y;
        CQ.box(it.el, p.x - it.w / 2, p.y - it.h, it.w, it.h);
        it.el.style.zIndex = p.z || 1;
      });
    }
    layoutLeft(items) {
      const main = items.filter((it) => it.slot === "main");
      const extra = items.filter((it) => it.slot !== "main");
      const coins = extra.filter((it) => it.type === "coin");
      const bars = extra.filter((it) => it.type === "bar");
      const cw = L.COIN_W + 4;
      let extraW = 0;
      if (coins.length) extraW = Math.min(2, coins.length) * cw - 4;
      if (bars.length) extraW = Math.max(extraW, bars[0].w);
      // the crown (or crowns, side by side), then what lies beside them
      const mainW = main.reduce((w, m) => w + m.w, 0) + Math.max(0, main.length - 1) * 8;
      const gap = mainW && extraW ? 12 : 0;
      let x0 = -(mainW + gap + extraW) / 2;
      const res = new Map();
      let mx = x0;
      main.forEach((m) => {
        res.set(m, { x: mx + m.w / 2, y: 0, z: 2 });
        mx += m.w + 8;
      });
      x0 += mainW + gap;
      coins.forEach((c, i) => {
        const row = Math.floor(i / 2);
        const inRow = Math.min(2, coins.length - row * 2);
        const rowW = inRow * cw - 4;
        res.set(c, { x: x0 + (extraW - rowW) / 2 + (i % 2) * cw + L.COIN_W / 2, y: -row * 50, z: 3 + row });
      });
      bars.forEach((b, i) => res.set(b, { x: x0 + extraW / 2, y: -i * 64, z: 3 + i }));
      return items.map((it) => res.get(it));
    }
    layoutRight(items) {
      const coins = items.filter((it) => it.type === "coin");
      const bars = items.filter((it) => it.type !== "coin");
      const res = new Map();
      const cw = L.COIN_W + 4;
      if (bars.length) {
        const total = bars.reduce((s, b) => s + b.w, 0) + (bars.length - 1) * 12;
        let x = -total / 2;
        bars.forEach((b) => {
          res.set(b, { x: x + b.w / 2, y: 0, z: 2 });
          x += b.w + 12;
        });
      }
      let idx = 0;
      this.rows.forEach((n, r) => {
        const rowW = n * cw - 4;
        for (let i = 0; i < n && idx < coins.length; i++) {
          res.set(coins[idx++], { x: -rowW / 2 + i * cw + L.COIN_W / 2, y: -r * 50, z: 3 + r });
        }
      });
      while (idx < coins.length) res.set(coins[idx++], { x: 0, y: -this.rows.length * 50, z: 9 });
      return items.map((it) => res.get(it));
    }
    // World position of an item's centre (follows the beam).
    itemCenter(it) {
      const e = this.localEnds[this.sideOf(it)];
      return this.toWorld({ x: e.x + it.x, y: e.y + BAL.ITEMS_Y + it.y - it.h / 2 });
    }
    panCenter(side) {
      const e = this.localEnds[side];
      return this.toWorld({ x: e.x, y: e.y + BAL.ITEMS_Y - 40 });
    }
    evaluate(opts) {
      opts = opts || {};
      const d = this.mass("right") - this.mass("left");
      const t = d === 0 ? 0 : Math.sign(d) * Math.min(16, 10 + 2 * Math.abs(d));
      const changed = t !== this.target;
      this.target = t;
      if (opts.instant) {
        this.angle = t;
        this.vel = 0;
        this.apply();
      } else if (changed && t !== 0) {
        CQ.audio.play("balance.creak");
        this.pendingClang = true;
      }
      this.setEmblem(d === 0, opts.instant);
      return d;
    }
    wobble(v) {
      this.vel += v || 9;
    }
    setEmblem(eq, quiet) {
      const was = this.emblem.classList.contains("eq");
      this.emblem.classList.toggle("eq", eq);
      this.emblem.classList.toggle("ne", !eq); // not "neq": that class draws the ≠ slash
      this.emblem.querySelector(".em-sym").classList.toggle("neq", !eq); // the slash makes = into ≠
      this.emblem.setAttribute("aria-label", eq ? "The balance is level: both sides are equal" : "The balance is tipped: the sides are not equal");
      if (!quiet && was !== eq) this.flashEmblem();
    }
    flashEmblem() {
      CQ.anim(this.emblem, [{ transform: "translate(-50%,-50%) scale(1)" }, { transform: "translate(-50%,-50%) scale(1.5)" }, { transform: "translate(-50%,-50%) scale(1)" }], {
        duration: 520,
        easing: CQ.EASE.back,
        keep: false,
        essential: true,
      });
      const c = { x: L.BX, y: L.PIVOT_Y };
      CQ.fx.ring(CQ.world.fx, c.x, c.y, this.emblem.classList.contains("eq") ? "#2BB673" : "#C8473B");
    }
    setSign(text) {
      if (!text) {
        this.sign.classList.add("hidden");
        return;
      }
      this.sign.innerHTML = CQ.rich(text);
      this.sign.classList.toggle("long", text.length > 11); // e.g. 2 × 7 + 4 = 18 stays between the pans
      this.sign.classList.remove("hidden");
      CQ.anim(this.sign, [{ transform: "translate(-50%,-50%) scale(.6)", opacity: 0 }, { transform: "translate(-50%,-50%) scale(1)", opacity: 1 }], {
        duration: 420,
        easing: CQ.EASE.back,
      });
    }
    // Coin counting: tap coins to count them (1, 2, 3…), rising clinks. The running count shows on
    // the coin's own face, so a coin in the row above can never hide it.
    markCount(it, n) {
      it.counted = true;
      it.el.classList.add("counted");
      const c = it.el.querySelector(".count");
      c.textContent = n;
      c.classList.toggle("two", n >= 10);
    }
    countCoin(it) {
      if (!this.counting || it.counted) return;
      this.countN++;
      this.markCount(it, this.countN);
      CQ.audio.play("coin.clink", { index: this.countN });
    }
    clearCounts() {
      this.countN = 0;
      ["left", "right"].forEach((side) =>
        this.items[side].forEach((it) => {
          if (it.type !== "coin") return;
          it.counted = false;
          it.el.classList.remove("counted");
          it.el.querySelector(".count").textContent = "";
          it.el.querySelector(".count").classList.remove("two");
        })
      );
    }
    async autoCount(side, startAt) {
      this.clearCounts();
      this.countN = startAt || 0;
      const coins = this.items[side].filter((it) => it.type === "coin");
      for (const c of coins) {
        this.countN++;
        this.markCount(c, this.countN);
        CQ.audio.play("coin.clink", { index: this.countN });
        await CQ.run.wait(360);
      }
      return this.countN;
    }
    glowItems(side, pred, on) {
      this.items[side].forEach((it) => {
        if (!pred || pred(it)) it.el.classList.toggle("glow", on !== false);
      });
    }
    clearGlow() {
      ["left", "right"].forEach((s) => this.items[s].forEach((it) => it.el.classList.remove("glow")));
    }
    // Set up a whole level instantly and level the beam.
    setup(cfg) {
      this.crownMass = cfg.crown;
      this.itemK = cfg.itemScale || 1;
      const left = [];
      for (let i = 0; i < (cfg.crowns || 1); i++) left.push({ type: "crown" });
      if (cfg.leftBar) left.push({ type: "bar", value: cfg.leftBar, slot: "extra" });
      for (let i = 0; i < (cfg.left || 0); i++) left.push({ type: "coin", slot: "extra" });
      this.setPan("left", left);
      const right = [];
      if (cfg.rightBar) right.push({ type: "bar", value: cfg.rightBar, w: 170 });
      const rows = cfg.right || [];
      const n = rows.reduce((a, b) => a + b, 0);
      for (let i = 0; i < n; i++) right.push({ type: "coin" });
      this.setPan("right", right, { rows: rows.length ? rows : [4] });
      this.counting = false;
      this.clearCounts();
      this.evaluate({ instant: true });
      this.setSign(null);
    }
  }

  // ================================================================== gold bars on stone stands
  // The stand art (props/brick-stand.png): a bar rests on its top face, at y = L.BAR_BASE.
  const STAND = { w: L.STAND_W, h: (L.STAND_W * IM().brickStand.h) / IM().brickStand.w };
  STAND.rest = STAND.h * L.STAND_REST;
  CQ.STAND = STAND;
  CQ.placeStand = (el, x) => CQ.box(el, x - STAND.w / 2, L.BAR_BASE - STAND.rest, STAND.w, STAND.h);
  const BAR_H = (L.BAR_W * IM().bar.h) / IM().bar.w; // a bar on its stand
  // A faded copy of a gold bar (drag hints).
  function barGhost(v, cls) {
    const g = CQ.el("div", "gbar bar-ghost" + (cls ? " " + cls : ""), null, `<span class="num">${v}</span>`);
    g.style.width = L.BAR_W + "px";
    g.style.height = BAR_H + "px";
    return g;
  }

  class Bars {
    constructor(layer) {
      this.layer = layer;
      this.list = [];
    }
    setup(values, opts) {
      opts = opts || {};
      this.clear();
      const order = opts.shuffle === false ? values.slice() : CQ.shuffle(values);
      const xs = [L.BX - 270, L.BX, L.BX + 270];
      order.forEach((v, i) => {
        const x = xs[i];
        // the stone stand: the bar rests on its top face
        const ped = CQ.el("div", "pedestal", this.layer);
        CQ.placeStand(ped, x);
        const slot = CQ.el("div", "bar-slot", this.layer);
        slot.setAttribute("role", "button");
        slot.setAttribute("aria-label", `Gold bar ${v}`);
        slot.style.width = L.BAR_W + "px";
        slot.style.height = BAR_H + "px";
        const g = CQ.el("div", "gbar", slot, `<span class="num">${v}</span>`);
        const tag = CQ.el("div", "tried-tag", slot, CONTENT.ui.tried);
        const bar = { value: v, slot, g, ped, tag, home: { x, y: L.BAR_BASE - BAR_H / 2 }, cur: null, state: "idle" };
        CQ.pos(slot, bar.home.x, bar.home.y);
        // a new level: the bars come down onto their stands one after another
        if (opts.animate)
          CQ.anim(slot, [{ opacity: 0, transform: "translate(-50%,-50%) translateY(-30px)" }, { opacity: 1, transform: "translate(-50%,-50%) translateY(0)" }], {
            duration: 520,
            delay: 200 + i * 130,
            easing: CQ.EASE.out,
            keep: false,
          });
        this.list.push(bar);
        CQ.Give.bind(bar);
      });
      this.refresh();
    }
    clear() {
      this.list.forEach((b) => {
        b.slot.remove();
        b.ped.remove();
      });
      this.list = [];
    }
    // Level 9 has two bars of the same value: prefer the one Zippy holds, then one still on its pedestal.
    get(v) {
      const all = this.list.filter((b) => b.value === v);
      return all.find((b) => b.state === "held") || all.find((b) => b.state === "idle") || all[0];
    }
    refresh() {
      this.list.forEach((b) => {
        const can = CQ.Give.can(b);
        b.slot.classList.toggle("locked", !can);
        b.slot.tabIndex = can ? 0 : -1;
      });
    }
    markTried(v) {
      this.markTriedBar(this.get(v));
    }
    markTriedBar(b) {
      if (!b) return;
      const v = b.value;
      b.state = "tried";
      b.slot.classList.add("tried");
      b.slot.classList.remove("gone", "glow");
      b.slot.setAttribute("aria-label", `Gold bar ${v}, already tried`);
      this.refresh();
    }
    glow(v, on) {
      const b = this.get(v);
      if (b) b.slot.classList.toggle("glow", on !== false);
    }
    clearGlow() {
      this.list.forEach((b) => b.slot.classList.remove("glow"));
    }
    setVisible(on, dur) {
      this.list.forEach((b) => {
        [b.slot, b.ped].forEach((e) => {
          e.style.transition = `opacity ${dur || 500}ms ease`;
          e.style.opacity = on ? "" : "0";
          e.style.pointerEvents = on ? "" : "none";
        });
      });
    }
    center(v) {
      const b = this.get(v);
      return b ? { x: b.home.x, y: b.home.y } : { x: L.BX, y: L.BAR_BASE - BAR_H / 2 };
    }
    // "These can be picked up": a faded copy of each bar lifts off it and floats away, one after another.
    cue(values) {
      const list = this.list
        .filter((b) => b.state === "idle" && (!values || values.includes(b.value)))
        .sort((p, q) => p.home.x - q.home.x);
      list.forEach((b, i) => {
        const g = barGhost(b.value, "lift");
        this.layer.appendChild(g);
        CQ.pos(g, b.home.x, b.home.y);
        CQ.anim(
          g,
          [
            { transform: "translate(-50%,-50%) translateY(0) scale(1)", opacity: 0 },
            { transform: "translate(-50%,-50%) translateY(-24px) scale(1.03)", opacity: 0.62, offset: 0.35 },
            { transform: "translate(-50%,-50%) translateY(-52px) scale(1.06)", opacity: 0 },
          ],
          { duration: 1300, delay: 250 + i * 320, easing: "ease-out", keep: false, essential: true }
        ).then(() => g.remove());
      });
    }
    // The faded copy the hint hand carries from a bar to Zippy (screen coordinates, in the UI layer).
    carried(v) {
      const c = CQ.el("div", "hand-carry");
      c.appendChild(barGhost(v));
      return c;
    }
  }

  // A floating copy of a gold bar (for flights between pedestal, Zippy and pans).
  CQ.barFlyer = function (value, width) {
    const e = CQ.el("div", "gbar flying", null, `<span class="num">${value}</span>`);
    const w = width || L.BAR_W;
    e.style.width = w + "px";
    e.style.height = (w * IM().bar.h) / IM().bar.w + "px";
    e.style.fontSize = Math.round(w * 0.29) + "px";
    return e;
  };
  CQ.crownFlyer = function (width) {
    const e = CQ.img("crown", "crown-flyer");
    e.style.width = (width || L.CROWN_PX) + "px";
    return e;
  };

  // ================================================================== giving a bar to Zippy (drag, tap or keyboard)
  CQ.Give = {
    allowed: null,
    onGive: null,
    busy: false,
    dragging: false,
    heldBar: null, // the pedestal bar Zippy is holding
    enable(values, onGive) {
      this.allowed = new Set(values);
      this.onGive = onGive;
      this.busy = false;
      CQ.bars.refresh();
    },
    disable() {
      this.allowed = null;
      this.onGive = null;
      CQ.bars.refresh();
    },
    can(bar) {
      return !!(this.allowed && this.allowed.has(bar.value) && bar.state === "idle" && !this.busy);
    },
    bind(bar) {
      let grab = null;
      CQ.drag(bar.slot, {
        enabled: () => this.can(bar),
        start: (pt) => {
          const w = CQ.camera.toWorld(pt);
          grab = { dx: bar.home.x - w.x, dy: bar.home.y - w.y };
          bar.cur = { x: bar.home.x, y: bar.home.y };
          this.dragging = true;
          // a faded copy stays on the stand: where the bar came from (and goes back to)
          if (!bar.restGhost) {
            bar.restGhost = barGhost(bar.value, "rest");
            CQ.bars.layer.insertBefore(bar.restGhost, bar.slot);
            CQ.pos(bar.restGhost, bar.home.x, bar.home.y);
          }
          bar.slot.classList.add("dragging");
          CQ.audio.play("bar.pick");
          CQ.zippy.ready(true);
          CQ.dropRing.show();
          CQ.hand.stop();
        },
        move: (pt) => {
          const w = CQ.camera.toWorld(pt);
          bar.cur = { x: w.x + grab.dx, y: w.y + grab.dy };
          CQ.pos(bar.slot, bar.cur.x, bar.cur.y);
          CQ.dropRing.hot(this.inZone(bar));
        },
        end: () => {
          this.dragging = false;
          if (this.inZone(bar)) this.catch(bar);
          else this.returnHome(bar);
        },
        tap: () => {
          this.dragging = false;
          this.catch(bar);
        },
        key: () => this.catch(bar),
      });
    },
    inZone(bar) {
      const z = CQ.zippy.zone();
      const c = bar.cur || bar.home;
      return c.x > z.x0 && c.x < z.x1 && c.y > z.y0 && c.y < z.y1;
    },
    async catch(bar) {
      if (this.busy || !this.allowed) return;
      this.busy = true;
      CQ.bars.refresh();
      CQ.dropRing.hide();
      CQ.hand.stop();
      const z = CQ.zippy;
      const old = this.heldBar;
      if (old && old !== bar && z.held && z.held.type === "bar") {
        z.setHeld(null);
        this.tossBack(old);
      }
      bar.slot.classList.remove("dragging");
      const from = bar.cur || bar.home;
      bar.state = "held";
      bar.slot.classList.add("gone");
      this.dropRestGhost(bar);
      CQ.pos(bar.slot, bar.home.x, bar.home.y);
      bar.cur = null;
      const to = z.holdPoint("zippy_hold");
      await CQ.fly(CQ.world.drag, CQ.barFlyer(bar.value), from, to, { duration: 560, arc: -80, scaleTo: L.HELD_BAR_W / L.BAR_W });
      await z.catchBar(bar.value);
      this.heldBar = bar;
      this.busy = false;
      CQ.bars.refresh();
      const cb = this.onGive;
      if (cb) cb(bar.value);
    },
    // After a level swap the held bar is on the pan for good.
    useHeld() {
      const b = this.heldBar;
      this.heldBar = null;
      if (b) b.state = "used";
      CQ.bars.refresh();
    },
    returnHome(bar) {
      bar.slot.classList.remove("dragging");
      CQ.dropRing.hide();
      CQ.zippy.ready(false);
      CQ.audio.play("bar.return");
      const from = bar.cur || bar.home;
      bar.cur = null;
      CQ.tween(
        460,
        (k) => CQ.pos(bar.slot, CQ.lerp(from.x, bar.home.x, k), CQ.lerp(from.y, bar.home.y, k)),
        CQ.ease.out
      ).then(() => this.dropRestGhost(bar));
    },
    dropRestGhost(bar) {
      if (bar.restGhost) bar.restGhost.remove();
      bar.restGhost = null;
    },
    // Zippy throws a bar he is holding back onto its pedestal.
    async tossBack(bar, opts) {
      opts = opts || {};
      if (this.heldBar === bar) this.heldBar = null;
      CQ.audio.play("bar.return");
      const from = CQ.zippy.holdPoint();
      await CQ.fly(CQ.world.drag, CQ.barFlyer(bar.value), from, bar.home, { duration: 780, arc: -170, scaleFrom: L.HELD_BAR_W / L.BAR_W });
      CQ.audio.play("bar.place");
      bar.slot.classList.remove("gone");
      if (opts.tried) CQ.bars.markTriedBar(bar);
      else if (bar.state === "held") bar.state = "idle";
      CQ.bars.refresh();
    },
  };
})();
