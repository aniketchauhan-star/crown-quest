/*
 * Zippy's Crown Quest: the world.
 * The temple room, torches, vines, Grumble, Zippy, the balance scale, the gold bars on their pedestals,
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
      CQ.img("temple", "bg", root);
      this.decor = CQ.el("div", "layer decor", root);
      buildVines(this.decor);
      this.torchLayer = CQ.el("div", "layer torch-layer", root);
      CQ.torches.build(this.torchLayer);
      this.balanceLayer = CQ.el("div", "layer balance-layer", root);
      this.grumbleLayer = CQ.el("div", "layer grumble-layer", root);
      this.barLayer = CQ.el("div", "layer bar-layer", root);
      this.zippyLayer = CQ.el("div", "layer zippy-layer", root);
      this.fx = CQ.el("div", "layer fx-layer", root);
      this.drag = CQ.el("div", "layer drag-layer", root);
      this.dark = CQ.el("div", "world-dark", root);
      CQ.torches.buildDark(this.dark);
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

  // Decorative vines along the top edge and down the pillars (positions tuned to temple.jpg).
  const VINES = [
    { k: "vineA", x: -40, y: -170, s: 0.95 },
    { k: "vineB", x: 150, y: -330, s: 0.8 },
    { k: "vineC", x: 640, y: -360, s: 0.62 },
    { k: "vineC", x: 1210, y: -380, s: 0.6, flip: true },
    { k: "vineD", x: 1470, y: -300, s: 0.82 },
    { k: "vineA", x: 1560, y: -150, s: 0.95, flip: true },
    { k: "vineE", x: 1800, y: -230, s: 0.78 },
  ];
  function buildVines(layer) {
    VINES.forEach((v, i) => {
      const im = IM()[v.k];
      const wrap = CQ.el("div", "vine-deco", layer);
      CQ.box(wrap, v.x, v.y, im.w * v.s, im.h * v.s);
      wrap.style.animationDuration = 5 + (i % 3) * 1.3 + "s";
      wrap.style.animationDelay = -i * 0.9 + "s";
      const img = CQ.img(v.k, "", wrap);
      if (v.flip) img.style.transform = "scaleX(-1)";
    });
  }

  // ================================================================== torches
  // Each torch exists twice: the real one in the room, and a copy inside the darkness overlay so the
  // flames still shine while the room is dark at the start of the intro.
  const TORCH_SPOTS = [
    [352, 190],
    [1568, 190],
  ];
  function makeTorch(layer, x, y) {
    const t = CQ.el("div", "torch lit", layer);
    CQ.pos(t, x, y);
    CQ.el("div", "torch-glow", t);
    CQ.el("div", "flame", t);
    CQ.el("div", "flame core", t);
    return t;
  }
  CQ.torches = {
    list: [],
    darkList: [],
    build(layer) {
      this.list = TORCH_SPOTS.map(([x, y]) => makeTorch(layer, x, y));
    },
    buildDark(layer) {
      this.darkList = TORCH_SPOTS.map(([x, y]) => makeTorch(layer, x, y));
    },
    set(on) {
      this.list.concat(this.darkList).forEach((t) => t.classList.toggle("lit", on));
    },
    async lightUp() {
      for (let i = 0; i < this.list.length; i++) {
        this.list[i].classList.add("lit");
        if (this.darkList[i]) this.darkList[i].classList.add("lit");
        CQ.audio.play("torch.fwoom");
        CQ.fx.sparkle(CQ.world.fx, TORCH_SPOTS[i][0], TORCH_SPOTS[i][1] - 30, 5, 30);
        await CQ.run.wait(420);
      }
    },
  };

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
    head() {
      return this.state === "awake" ? { x: this.x + 10, y: this.y - 430 } : { x: this.x + 95, y: this.y - 215 };
    }
    sleep() {
      this.state = "sleep";
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
      CQ.comic(CONTENT.grumble.roar, { x: this.x + 40, y: this.y - 520 }, { color: "purple", size: 96, dur: 1300 });
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
      this.vine = CQ.el("div", "zippy-vine", layer);
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
      // The vine is drawn 600px longer above the attach point (off-screen) and pivots on the
      // attach point itself (transform-origin: 50% 600px in the CSS), so its end meets Zippy's tail.
      this.vine.style.left = this.A.x - 44 + "px";
      this.vine.style.top = this.A.y - 600 + "px";
      this.vine.style.height = Math.max(0, this.len + 600 + 10) + "px";
      this.vine.style.transform = `rotate(${-th}deg)`;
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
        this.moveTo(0, this.baseLen + 70, 320, CQ.ease.out);
      } else {
        this.pose(this.held ? "hold" : "idle");
        this.home(320);
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
      await this.home(320);
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
    // Intro: Zippy drops in from the top on his vine and swings to a stop.
    async dropIn() {
      this.swayAmp = 0;
      this.setHeld(null);
      this.pose("swing");
      this.setVisible(true);
      const y0 = -820;
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

  // ================================================================== balance art
  // A classic gold scale drawn in SVG: slim beam with ball ends, a round hub with a ball on top,
  // slim post on a stepped round base, and shallow bowl pans hung from thin rods at their rims.
  // All sizes are stage pixels. Items sit inside the bowls: the back of the bowl is drawn behind
  // them and the front lip in front of them.
  const BAL = {
    R: 365, // pivot to each hanging point
    RIM_Y: 268, // hanging point down to the pan rim
    ITEMS_Y: 276, // where items rest, just inside the bowl
    PAN_RX: 186, // rim half-width
    PAN_RY: 18, // rim half-height (perspective)
    BOWL: 78, // bowl depth below the rim
  };
  BAL.PAN_BOTTOM = BAL.RIM_Y + BAL.BOWL;
  CQ.BAL = BAL;
  const INK = "#6b4200";
  let artUid = 0;
  const BalanceArt = {
    defs(u) {
      return `<defs>
        <linearGradient id="gv${u}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff3b0"/><stop offset=".28" stop-color="#ffd54f"/><stop offset=".62" stop-color="#f4b52c"/><stop offset="1" stop-color="#d9921b"/></linearGradient>
        <linearGradient id="gh${u}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#b47610"/><stop offset=".2" stop-color="#f0b02a"/><stop offset=".42" stop-color="#ffe489"/><stop offset=".6" stop-color="#ffd54f"/><stop offset=".84" stop-color="#e9a823"/><stop offset="1" stop-color="#b47610"/></linearGradient>
        <linearGradient id="gt${u}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff6c4"/><stop offset="1" stop-color="#f7c948"/></linearGradient>
        <radialGradient id="gb${u}" cx=".36" cy=".32" r=".72"><stop offset="0" stop-color="#fffbe0"/><stop offset=".35" stop-color="#ffd54f"/><stop offset=".78" stop-color="#e9a823"/><stop offset="1" stop-color="#b47610"/></radialGradient>
        <linearGradient id="gi${u}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c08012"/><stop offset=".6" stop-color="#e9a823"/><stop offset="1" stop-color="#f7c948"/></linearGradient>
        <linearGradient id="go${u}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe489"/><stop offset=".3" stop-color="#f7c948"/><stop offset=".7" stop-color="#e9a823"/><stop offset="1" stop-color="#bd7e12"/></linearGradient>
        <radialGradient id="gs${u}"><stop offset="0" stop-color="#03141a" stop-opacity=".42"/><stop offset="1" stop-color="#03141a" stop-opacity="0"/></radialGradient>
      </defs>`;
    },
    // Post, stepped base and soft floor shadows. Origin = pivot.
    stand(u) {
      const tier = (y, rx, ry, h) =>
        `<path d="M ${-rx} ${y} L ${-rx} ${y + h} A ${rx} ${ry} 0 0 0 ${rx} ${y + h} L ${rx} ${y} Z" fill="url(#gh${u})" stroke="${INK}" stroke-width="3.5" stroke-linejoin="round"/>` +
        `<ellipse cx="0" cy="${y}" rx="${rx}" ry="${ry}" fill="url(#gt${u})" stroke="${INK}" stroke-width="3.5"/>`;
      return `<ellipse cx="0" cy="506" rx="220" ry="26" fill="url(#gs${u})"/>
        <ellipse cx="${-BAL.R}" cy="510" rx="150" ry="13" fill="url(#gs${u})" opacity=".6"/>
        <ellipse cx="${BAL.R}" cy="510" rx="150" ry="13" fill="url(#gs${u})" opacity=".6"/>
        ${tier(452, 160, 20, 30)}${tier(420, 100, 14, 26)}${tier(392, 60, 10, 22)}
        <rect x="-16" y="30" width="32" height="352" fill="url(#gh${u})" stroke="${INK}" stroke-width="3.5"/>
        <rect x="-10" y="40" width="5" height="330" rx="2.5" fill="#fff6c4" opacity=".55"/>
        <rect x="-28" y="366" width="56" height="18" rx="7" fill="url(#gv${u})" stroke="${INK}" stroke-width="3.5"/>`;
    },
    // The beam that tips. Origin = pivot.
    beam(u) {
      const R = BAL.R;
      return `<rect x="${-R}" y="-9" width="${2 * R}" height="18" rx="9" fill="url(#gv${u})" stroke="${INK}" stroke-width="3.5"/>
        <rect x="${-R + 22}" y="-6" width="${2 * R - 44}" height="4" rx="2" fill="#fff8d6" opacity=".75"/>
        <circle cx="${-R}" cy="0" r="16" fill="url(#gb${u})" stroke="${INK}" stroke-width="3.5"/>
        <circle cx="${R}" cy="0" r="16" fill="url(#gb${u})" stroke="${INK}" stroke-width="3.5"/>
        <circle cx="${-R - 5}" cy="-5" r="4" fill="#fffbe6" opacity=".85"/>
        <circle cx="${R - 5}" cy="-5" r="4" fill="#fffbe6" opacity=".85"/>`;
    },
    // Hub ring (the = / ≠ sign sits inside it), ball finial on top, collar below. Origin = pivot.
    hub(u) {
      return `<rect x="-9" y="-60" width="18" height="18" rx="4" fill="url(#gv${u})" stroke="${INK}" stroke-width="3.5"/>
        <circle cx="0" cy="-76" r="20" fill="url(#gb${u})" stroke="${INK}" stroke-width="3.5"/>
        <circle cx="-6" cy="-82" r="5" fill="#fffbe6" opacity=".85"/>
        <rect x="-27" y="38" width="54" height="20" rx="7" fill="url(#gv${u})" stroke="${INK}" stroke-width="3.5"/>
        <circle cx="0" cy="0" r="45" fill="url(#gb${u})" stroke="${INK}" stroke-width="3.5"/>
        <circle cx="0" cy="0" r="37" fill="none" stroke="#b47610" stroke-width="2" opacity=".55"/>`;
    },
    // Behind the items: hanging ring, the two rods to the rim, and the inside of the bowl. Origin = hanging point.
    panBack(u) {
      const { RIM_Y: y, PAN_RX: rx, PAN_RY: ry } = BAL;
      const rods = `M -3 30 L ${-rx + 6} ${y} M 3 30 L ${rx - 6} ${y}`;
      return `<path d="${rods}" stroke="${INK}" stroke-width="8.5" stroke-linecap="round" fill="none"/>
        <path d="${rods}" stroke="#ffd54f" stroke-width="4" stroke-linecap="round" fill="none"/>
        <circle cx="0" cy="25" r="9" fill="url(#gb${u})" stroke="${INK}" stroke-width="2.5"/>
        <ellipse cx="0" cy="${y}" rx="${rx}" ry="${ry}" fill="url(#gi${u})" stroke="${INK}" stroke-width="3.5"/>
        <ellipse cx="0" cy="${y + 3}" rx="${rx - 26}" ry="${ry - 7}" fill="#9c6408" opacity=".22"/>`;
    },
    // In front of the items: the bowl's outside and its front lip. Origin = hanging point.
    panFront(u) {
      const { RIM_Y: y, PAN_RX: rx, PAN_RY: ry, BOWL: d } = BAL;
      return `<path d="M ${-rx} ${y} A ${rx} ${ry} 0 0 0 ${rx} ${y} A ${rx} ${d} 0 0 1 ${-rx} ${y} Z" fill="url(#go${u})" stroke="${INK}" stroke-width="3.5" stroke-linejoin="round"/>
        <path d="M ${-rx + 10} ${y + 4} A ${rx - 8} ${ry - 4} 0 0 0 ${rx - 10} ${y + 4}" fill="none" stroke="#fff4c2" stroke-width="3.5" opacity=".85"/>
        <path d="M ${-rx + 36} ${y + 24} Q ${-rx + 66} ${y + 50} ${-rx + 118} ${y + 58}" fill="none" stroke="#fffbe6" stroke-width="7" stroke-linecap="round" opacity=".45"/>`;
    },
    // An absolutely placed SVG block in stage pixels.
    place(parent, cls, x, y, w, h, viewBox, body) {
      const u = "b" + ++artUid;
      const wrap = CQ.el("div", "bal-svg " + cls, parent);
      CQ.box(wrap, x, y, w, h);
      wrap.innerHTML = `<svg viewBox="${viewBox}" width="${w}" height="${h}" aria-hidden="true">${this.defs(u)}${body(u)}</svg>`;
      return wrap;
    },
  };
  CQ.BalanceArt = BalanceArt;

  // A small, complete balance as one SVG (notebook icon, intro thought bubble).
  // opts: { width, left: 'bar' | null, right: 'coins3' | null }. Tipping is done in CSS (.tip on a parent).
  CQ.miniBalanceSVG = function (opts) {
    opts = opts || {};
    const u = "m" + ++artUid;
    const A = BalanceArt;
    const w = opts.width || 150;
    const coinText = (cx) => `<text x="${cx}" y="258" text-anchor="middle" font-family="Baloo 2, sans-serif" font-weight="800" font-size="34" fill="#8a5a00">1</text>`;
    const stuff = {
      bar: `<image href="${IMAGES.bar.src}" x="-80" y="202" width="160" height="74"/>`,
      coins3: [-70, 0, 70].map((cx) => `<image href="${IMAGES.coin.src}" x="${cx - 32}" y="212" width="64" height="64"/>${coinText(cx)}`).join(""),
    };
    const pan = (side, what) =>
      `<g transform="translate(${side * BAL.R} 0)"><g class="mb-pan mb-pan-${side < 0 ? "l" : "r"}">${A.panBack(u)}${stuff[what] || ""}${A.panFront(u)}</g></g>`;
    return `<svg class="mini-bal" viewBox="-565 -110 1130 660" width="${w}" height="${Math.round((w * 660) / 1130)}" aria-hidden="true">${A.defs(u)}
      <g>${A.stand(u)}</g>${pan(-1, opts.left)}${pan(1, opts.right)}
      <g class="mb-beam">${A.beam(u)}</g><g>${A.hub(u)}</g>
      <circle class="mb-em" cx="0" cy="0" r="33" stroke="${INK}" stroke-width="3.5"/>
      <rect x="-15" y="-10" width="30" height="7" rx="3.5" fill="#fff"/><rect x="-15" y="4" width="30" height="7" rx="3.5" fill="#fff"/>
      <rect class="mb-neq" x="-3.5" y="-20" width="7" height="40" rx="3.5" fill="#fff" transform="rotate(35)"/></svg>`;
  };

  // ================================================================== Balance scale
  class Balance {
    constructor(layer) {
      const BX = L.BX;
      const PY = L.PIVOT_Y;
      const A = BalanceArt;
      this.layer = layer;
      this.R = BAL.R;
      this.angle = 0;
      this.vel = 0;
      this.target = 0;
      this.items = { left: [], right: [] };
      this.rows = [4, 4, 4];
      this.crownMass = 5;
      this.counting = false;
      this.countN = 0;

      this.stand = A.place(layer, "bal-stand", BX - 565, PY, 1130, 560, "-565 0 1130 560", (u) => A.stand(u));
      this.sides = {};
      ["left", "right"].forEach((side) => {
        const g = CQ.el("div", "bal-side " + side, layer);
        A.place(g, "bal-back", -200, 0, 400, 350, "-200 0 400 350", (u) => A.panBack(u));
        const items = CQ.el("div", "bal-items", g);
        CQ.pos(items, 0, BAL.ITEMS_Y);
        A.place(g, "bal-front", -200, 0, 400, 350, "-200 0 400 350", (u) => A.panFront(u));
        this.sides[side] = { g, items };
      });
      this.beam = A.place(layer, "bal-beam", BX - 400, PY - 30, 800, 60, "-400 -30 800 60", (u) => A.beam(u));
      this.hub = A.place(layer, "bal-hub", BX - 60, PY - 110, 120, 190, "-60 -110 120 190", (u) => A.hub(u));
      this.emblem = CQ.el("div", "emblem eq", layer);
      CQ.pos(this.emblem, BX, PY);
      this.setEmblem(true, true);
      this.sign = CQ.el("div", "eq-sign hidden", layer);
      CQ.pos(this.sign, BX, 548);
      this.pendingClang = false;
      CQ.ticker.add((dt) => this.step(dt));
      this.apply();
    }
    step(dt) {
      const k = 55;
      const c = 7.5;
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
    apply() {
      const th = this.angle * deg;
      const c = Math.cos(th);
      const s = Math.sin(th);
      this.beam.style.transform = `rotate(${this.angle}deg)`;
      this.ends = {
        left: { x: L.BX - this.R * c, y: L.PIVOT_Y - this.R * s },
        right: { x: L.BX + this.R * c, y: L.PIVOT_Y + this.R * s },
      };
      this.sides.left.g.style.transform = `translate(${this.ends.left.x}px, ${this.ends.left.y}px)`;
      this.sides.right.g.style.transform = `translate(${this.ends.right.x}px, ${this.ends.right.y}px)`;
    }
    makeItem(spec) {
      const im = IM();
      let el;
      let w;
      let h;
      if (spec.type === "crown") {
        el = CQ.img("crown", "pan-item crown");
        w = L.CROWN_W;
        h = (w * im.crown.h) / im.crown.w;
      } else if (spec.type === "coin") {
        el = CQ.el("div", "pan-item coin", null, '<span class="one">1</span><span class="count"></span>');
        w = h = L.COIN_W;
      } else {
        el = CQ.el("div", "pan-item pbar", null, `<span class="num">${spec.value}</span>`);
        w = spec.w || L.PAN_BAR_W;
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
    mass(side) {
      return this.items[side].reduce((m, it) => m + (it.type === "coin" ? 1 : it.type === "bar" ? it.value : this.crownMass), 0);
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
      const mainW = main.length ? L.CROWN_W : 0;
      const gap = mainW && extraW ? 12 : 0;
      let x0 = -(mainW + gap + extraW) / 2;
      const res = new Map();
      main.forEach((m) => res.set(m, { x: x0 + mainW / 2, y: 0, z: 2 }));
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
      const side = this.sideOf(it);
      const e = this.ends[side];
      return { x: e.x + it.x, y: e.y + BAL.ITEMS_Y + it.y - it.h / 2 };
    }
    // Where a main item (crown, or the bar that replaced it) sits on the left pan.
    mainSlotCenter() {
      const main = this.items.left.find((it) => it.slot === "main");
      if (main) return this.itemCenter(main);
      const e = this.ends.left;
      return { x: e.x, y: e.y + BAL.ITEMS_Y - 60 };
    }
    panCenter(side) {
      const e = this.ends[side];
      return { x: e.x, y: e.y + BAL.ITEMS_Y - 40 };
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
      this.emblem.classList.toggle("neq", !eq);
      this.emblem.innerHTML = eq ? '<span class="em-sym">=</span>' : '<span class="em-sym neq">=</span>';
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
      this.sign.classList.remove("hidden");
      CQ.anim(this.sign, [{ transform: "translate(-50%,-50%) scale(.6)", opacity: 0 }, { transform: "translate(-50%,-50%) scale(1)", opacity: 1 }], {
        duration: 420,
        easing: CQ.EASE.back,
      });
    }
    // Coin counting: tap coins to count them (1, 2, 3…), rising clinks.
    countCoin(it) {
      if (!this.counting || it.counted) return;
      it.counted = true;
      this.countN++;
      it.el.classList.add("counted");
      it.el.querySelector(".count").textContent = this.countN;
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
        })
      );
    }
    async autoCount(side, startAt) {
      this.clearCounts();
      this.countN = startAt || 0;
      const coins = this.items[side].filter((it) => it.type === "coin");
      for (const c of coins) {
        c.counted = true;
        this.countN++;
        c.el.classList.add("counted");
        c.el.querySelector(".count").textContent = this.countN;
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
      const left = [{ type: "crown" }];
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

  // ================================================================== gold bars on pedestals
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
        const ped = CQ.el("div", "pedestal", this.layer);
        CQ.pos(ped, x, L.PEDESTAL_TOP);
        const slot = CQ.el("div", "bar-slot", this.layer);
        slot.setAttribute("role", "button");
        slot.setAttribute("aria-label", `Gold bar ${v}`);
        const g = CQ.el("div", "gbar", slot, `<span class="num">${v}</span><span class="shine"></span>`);
        g.style.animationDelay = -i * 0.7 + "s";
        const tag = CQ.el("div", "tried-tag", slot, CONTENT.ui.tried);
        const bar = { value: v, slot, g, ped, tag, home: { x, y: L.PEDESTAL_TOP - 46 }, cur: null, state: "idle" };
        CQ.pos(slot, bar.home.x, bar.home.y);
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
    get(v) {
      return this.list.find((b) => b.value === v);
    }
    refresh() {
      this.list.forEach((b) => {
        const can = CQ.Give.can(b);
        b.slot.classList.toggle("locked", !can);
        b.slot.tabIndex = can ? 0 : -1;
      });
    }
    markTried(v) {
      const b = this.get(v);
      if (!b) return;
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
          e.style.transition = `opacity ${dur || 300}ms`;
          e.style.opacity = on ? "" : "0";
          e.style.pointerEvents = on ? "" : "none";
        });
      });
    }
    center(v) {
      const b = this.get(v);
      return b ? { x: b.home.x, y: b.home.y } : { x: L.BX, y: L.PEDESTAL_TOP - 46 };
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
    e.style.width = (width || L.CROWN_W) + "px";
    return e;
  };

  // ================================================================== giving a bar to Zippy (drag, tap or keyboard)
  CQ.Give = {
    allowed: null,
    onGive: null,
    busy: false,
    dragging: false,
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
      if (z.held && z.held.type === "bar" && z.held.value !== bar.value) {
        const old = CQ.bars.get(z.held.value);
        z.setHeld(null);
        if (old) this.tossBack(old);
      }
      bar.slot.classList.remove("dragging");
      const from = bar.cur || bar.home;
      bar.state = "held";
      bar.slot.classList.add("gone");
      CQ.pos(bar.slot, bar.home.x, bar.home.y);
      bar.cur = null;
      const to = z.holdPoint("zippy_hold");
      await CQ.fly(CQ.world.drag, CQ.barFlyer(bar.value), from, to, { duration: 360, arc: -50, scaleTo: 0.78 });
      await z.catchBar(bar.value);
      this.busy = false;
      CQ.bars.refresh();
      const cb = this.onGive;
      if (cb) cb(bar.value);
    },
    returnHome(bar) {
      bar.slot.classList.remove("dragging");
      CQ.dropRing.hide();
      CQ.zippy.ready(false);
      CQ.audio.play("bar.return");
      const from = bar.cur || bar.home;
      bar.cur = null;
      CQ.tween(
        300,
        (k) => CQ.pos(bar.slot, CQ.lerp(from.x, bar.home.x, k), CQ.lerp(from.y, bar.home.y, k)),
        CQ.ease.out
      );
    },
    // Zippy throws a bar he is holding back onto its pedestal.
    async tossBack(bar, opts) {
      opts = opts || {};
      CQ.audio.play("bar.return");
      const from = CQ.zippy.holdPoint();
      await CQ.fly(CQ.world.drag, CQ.barFlyer(bar.value), from, bar.home, { duration: 520, arc: -140, scaleFrom: 0.78, spin: 360 });
      CQ.audio.play("bar.place");
      bar.slot.classList.remove("gone");
      if (opts.tried) CQ.bars.markTried(bar.value);
      else if (bar.state === "held") bar.state = "idle";
      CQ.bars.refresh();
    },
  };
})();
