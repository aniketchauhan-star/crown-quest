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
      this.bgImgs = buildBackground(this.decor);
      CQ.peek.build(this.decor, this.bgImgs.bgTree); // Zippy's head peeking out from behind the tree trunk
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
    const imgs = {};
    (window.BG_LAYERS || []).forEach((ly, i) => {
      const img = CQ.img(ly.key, ly.anim && ly.anim !== "shimmer" ? "anim-" + ly.anim : "", layer);
      CQ.box(img, ly.x, ly.y, ly.w, ly.h);
      if (ly.anim) img.style.animationDelay = (-(i * 1.37) % 6).toFixed(2) + "s"; // no two sway in step
      imgs[ly.key] = img;
    });
    return imgs;
  }

  // ================================================================== Zippy peeking from behind the tree
  // After a wrong swap Zippy checks on Grumble: only his smiling head leans out from behind the trunk.
  // A copy of his sprite sits in the background, behind the tree layer, with a soft oval mask around his
  // head (the tail and body fade away); the trunk hides the rest.
  const PEEK = {
    frame: 7, // zippy_hold frame 7: eyes open, smiling
    face: { x: 210, y: 300 }, // his face centre in that frame (sprite pixels)
    mask: { x: 180, y: 278, rx: 170, ry: 125 }, // the oval kept around his head (sprite pixels)
    y: 412, // stage: where his face is
    hidden: 150, // stage x of his face when he is fully behind the trunk
    out: 300, // ...and when he leans out (the trunk's edge is at x ~285 here)
  };
  CQ.peek = {
    build(layer, before) {
      const k = L.ZIPPY.scale;
      const s = window.SPRITES.zippy_hold;
      this.el = CQ.el("div", "zippy-peek hidden");
      layer.insertBefore(this.el, before || null);
      this.sprite = new CQ.Sprite(this.el, "peek-sprite", k);
      this.sprite.show("zippy_hold", PEEK.frame);
      const m = PEEK.mask;
      const mask = `radial-gradient(${m.rx * k}px ${m.ry * k}px at ${m.x * k}px ${m.y * k}px, #000 88%, transparent 100%)`;
      Object.assign(this.sprite.el.style, { maskImage: mask, webkitMaskImage: mask, maskRepeat: "no-repeat", webkitMaskRepeat: "no-repeat" });
      this.face = { x: (PEEK.face.x - s.ax) * k, y: (PEEK.face.y - s.ay) * k }; // from the sprite's anchor
      this.el.style.transformOrigin = `${this.face.x}px ${this.face.y}px`;
    },
    place(x, tilt) {
      CQ.pos(this.el, x - this.face.x, PEEK.y - this.face.y);
      this.el.style.transform = `rotate(${(tilt || 0).toFixed(2)}deg)`;
    },
    // lean out from behind the trunk (smiling), and back again
    out(dur) {
      this.sprite.show("zippy_hold", PEEK.frame);
      this.place(PEEK.hidden, 0);
      this.el.classList.remove("hidden");
      return CQ.tween(dur || 700, (k) => this.place(CQ.lerp(PEEK.hidden, PEEK.out, k), 10 * k), CQ.ease.out, "peek");
    },
    back(dur) {
      return CQ.tween(dur || 380, (k) => this.place(CQ.lerp(PEEK.out, PEEK.hidden, k), 10 * (1 - k)), CQ.ease.in, "peek").then(() => this.hide());
    },
    hide() {
      if (this.el) this.el.classList.add("hidden");
    },
    center() {
      return { x: PEEK.out, y: PEEK.y };
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
    // The top of his head as he sleeps (his head is on the right), where a thought about him points.
    headTop() {
      return { x: this.x + 140 * this.k, y: this.y - 212 * this.k };
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
      if (hooks.beforeSleep) await hooks.beforeSleep();
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
  // His swap sheet (zippy swap.png) has empty hands. grip is where the game puts what he holds in each
  // frame, in the cut frame's own pixels (assets/zippy/swap.png): frame 1 is between his open hands (a
  // bar comes to him there), frame 4 is the hand that grabs the crown. When he holds the crown (frames
  // 4-8), his fists are drawn again over it (zippy_swap_hands, see SWAP_FISTS in
  // tools/prepare_assets.py), so his fingers wrap around it. A bar is held with his bar sheet instead
  // (zippy bar.png, below). Re-measure both if the sheet is replaced.
  const SWAP = {
    grip: [null, [243, 415], [228, 359], [244, 432], [282, 393], [166, 341], [197, 351], [291, 335], [168, 342]],
    nudge: { crown: [0, -16] }, // his fingers curl round the crown's band
  };
  function swapOffset(frame, item) {
    const S = window.SPRITES.zippy_swap;
    const g = SWAP.grip[frame] || SWAP.grip[2];
    const n = SWAP.nudge[item] || [0, 0];
    return { x: (g[0] + n[0] - S.ax) * L.ZIPPY.scale, y: (g[1] + n[1] - S.ay) * L.ZIPPY.scale };
  }
  // After a level's last swap Zippy puts the crown on his own head and wears it while he celebrates and
  // swings away (zippy crown.png: 1 lift it up, 2 put it on, 3 wow, 4 proud, 5 thumbs up, 6 wave,
  // 7 laugh, 8 straighten it). Where it sits on his head, from the tip of his tail (sheet pixels):
  const CROWN_HEAD = { x: 42, y: 160 };
  const CROWN_POSE = { crownLift: 1, crownOn: 2, wow: 3, proud: 4 };
  // Scared after a wrong swap, the crown in his hands (zippy scared crown.png): 1 uh-oh, 2 gritted
  // teeth, 3 side glance, 4 trembling, 5 hiding behind it, 6 gulp, 7 eek! (crown up high), 8 sheepish.
  // Where the crown is in each frame (centre x, y and its width, in the cut frame's pixels), so it can
  // jump back to the pan from his hands. Re-measure if the sheet is replaced.
  const SCARED_CROWN = [null, [208, 361, 144], [203, 355, 131], [201, 361, 151], [213, 361, 95], [186, 292, 182], [194, 345, 109], [205, 161, 150], [245, 363, 120]];
  const SCARED_POSE = { crownUhOh: 1, crownTeeth: 2, crownGlance: 3, crownShake: 4, crownHide: 5, crownGulp: 6, crownEek: 7, crownSorry: 8 };
  // Holding a gold bar (zippy bar.png): his fingers hold a blank bar by its ends, and the game prints the
  // bar's number on its front face. 1 catch, 2 hold, 3 talk, 4 think, 5 show it off, 6 reach down, 7 put
  // it down, 8 give it back. GEOM.zippyBar (measured by tools/prepare_assets.py) says for each frame where
  // the bar is (cx, cy, w), the middle of its front face (fx, fy), the face's height (fh) and the bar's
  // tilt, in the cut frame's pixels.
  const BAR_POSE = { barCatch: 1, hold: 2, idle: 2, barThink: 4, barShow: 5, reachBar: 6, putDown: 7, giveBack: 8 };
  const BAR_NUM = 0.75; // the number's size, as a part of the front face's height
  const BAR_FULL = 1.08; // the whole bar's width, as a part of the gold that shows between his fingers
  const barGeom = (frame) => window.GEOM.zippyBar[(frame || 2) - 1] || window.GEOM.zippyBar[1];
  // Zippy leaves the picture (after a wrong swap, and after each level he wins) and swings back in. He
  // stays hanging from his vine and swings in big curves; the top of the vine (A) slides along above
  // the screen, so each big swing carries him out of the picture or into it.
  const OFF_X = -560; // the vine's top when Zippy is out of the picture
  const OFF_TH = -85; // ...and the vine's angle there: he is high up on the left, beyond the edge
  const TILT = 0.35; // how much his body leans with the vine (more in a big swing)
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
      this.tilt = TILT;
      // the green vine he hangs from (drawn behind him, so his tail wraps in front of it)
      this.vine = CQ.makeVine(layer, "zippy-vine");
      this.tipOff = CQ.vineEndFor(0, 0, this.k);
      this.rig = CQ.el("div", "zippy-rig", layer);
      this.body = CQ.el("div", "zippy-body", this.rig);
      this.sprite = new CQ.Sprite(this.body, "zippy-sprite", this.k);
      this.heldEl = CQ.el("div", "held hidden", this.body);
      // his fists, drawn again over what he holds (swap sheet only)
      this.fists = new CQ.Sprite(this.body, "zippy-fists", this.k);
      this.fists.el.style.display = "none";
      this.held = null;
      this.wearing = false; // the crown he won is on his head (until the level ends)
      this.poseName = "";
      this.lastTap = 0;
      this.sprite.onShow = () => this.placeHeld(); // what he holds follows his hands, frame by frame
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
    // Where he holds things now (or in another sheet and frame), from the tip of his tail.
    // item ("bar" or "crown") nudges it to sit in his fists on the swap sheet.
    holdOffset(sheet, frame, item) {
      sheet = sheet || this.sprite.sheet;
      item = item || (this.held && this.held.type);
      if (sheet === "zippy_swap") return swapOffset(frame || this.sprite.frame, item);
      if (sheet === "zippy_bar") {
        // the middle of the bar's front face, where its number is
        const S = window.SPRITES.zippy_bar;
        const g = barGeom(frame || this.sprite.frame);
        return { x: (g.fx - S.ax) * this.k, y: (g.fy - S.ay) * this.k };
      }
      if (sheet === "zippy_scared_crown") {
        const S = window.SPRITES.zippy_scared_crown;
        const c = SCARED_CROWN[frame || this.sprite.frame] || SCARED_CROWN[1];
        return { x: (c[0] - S.ax) * this.k, y: (c[1] - S.ay) * this.k };
      }
      return HOLD_OFFSET[sheet] || HOLD_OFFSET.zippy_hold;
    }
    holdPoint(sheet, frame, item) {
      const P = this.P;
      const o = this.holdOffset(sheet, frame, item);
      const a = -(this.theta + this.sway) * this.tilt * deg;
      return { x: P.x + o.x * Math.cos(a) - o.y * Math.sin(a), y: P.y + o.x * Math.sin(a) + o.y * Math.cos(a) };
    }
    // The bar in his hands in a frame of his bar sheet (by default the frame on show, or his "hold"
    // frame): barOffset is its middle from the tip of his tail; barBox is its middle on the stage, its
    // width and its tilt. Bars flying to and from his hands match it.
    barOffset(frame) {
      const S = window.SPRITES.zippy_bar;
      const g = barGeom(frame);
      return { x: (g.cx - S.ax) * this.k, y: (g.cy - S.ay) * this.k };
    }
    barBox(frame) {
      frame = frame || (this.sprite.sheet === "zippy_bar" ? this.sprite.frame : 2);
      const o = this.barOffset(frame);
      const P = this.P;
      const a = -(this.theta + this.sway) * this.tilt * deg;
      return {
        x: P.x + o.x * Math.cos(a) - o.y * Math.sin(a),
        y: P.y + o.x * Math.sin(a) + o.y * Math.cos(a),
        w: barGeom(frame).w * BAR_FULL * this.k,
        tilt: barGeom(frame).tilt - (this.theta + this.sway) * this.tilt,
      };
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
      s.stop(); // a still pose must not be overwritten by the animation that was playing
      if (SCARED_POSE[name] || name === "crownNervous") {
        // scared, with the crown in his hands (the sheet draws it)
        if (name === "crownNervous") s.play("zippy_scared_crown", [2, 3, 2, 6, 4, 2], [420, 380, 420, 380, 460, 380], { loop: true });
        else s.show("zippy_scared_crown", SCARED_POSE[name]);
        this.placeHeld();
        return;
      }
      if (CROWN_POSE[name] || this.wearing) {
        this.crownPose(name);
        this.placeHeld();
        return;
      }
      if (this.held && this.held.type === "bar" && (BAR_POSE[name] || name === "holdTalk" || name === "talk")) {
        // holding a gold bar: his bar sheet draws it, and its number is printed on it (placeHeld)
        if (name === "holdTalk" || name === "talk") s.play("zippy_bar", [3, 2], 170, { loop: true });
        else s.show("zippy_bar", BAR_POSE[name]);
        this.placeHeld();
        return;
      }
      switch (name) {
        case "idle":
          s.play("zippy_hold", [7, 7, 7, 6, 7, 7, 7, 7], [650, 650, 650, 140, 650, 650, 650, 650], { loop: true });
          break;
        case "talk":
          s.play("zippy_hold", [8, 7], 170, { loop: true });
          break;
        case "ready": // a bar is on its way: hands open, ready to take it
          s.show("zippy_swap", 1);
          break;
        case "hold": // a bar held at his chest (or the crown hugged)
        case "holdTalk":
          s.show("zippy_swap", this.held && this.held.type === "crown" ? 6 : 2);
          break;
        case "reachBar": // swinging over with the bar held out in both fists
          s.show("zippy_swap", 3);
          break;
        case "exchange": // one hand lets go of the bar, the other grabs the crown
          s.show("zippy_swap", 4);
          break;
        case "lift":
          s.show("zippy_swap", 5);
          break;
        case "ooh":
          s.show("zippy_swap", 6);
          break;
        case "look":
          s.show("zippy_swap", 7);
          break;
        case "yes":
          s.show("zippy_swap", 8);
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
        case "cheeky":
          s.play("zippy_hold", [4, 6], 220, { loop: true }); // eyes closed, grinning: "hee hee"
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
    // His poses with the crown on his head (zippy crown.png); everyday names map to the nearest one.
    crownPose(name) {
      const s = this.sprite;
      const C = "zippy_crown";
      if (CROWN_POSE[name]) return s.show(C, CROWN_POSE[name]);
      switch (name) {
        case "idle":
        case "hold":
          return s.play(C, [4, 4, 4, 8, 4, 4], [900, 900, 900, 700, 900, 900], { loop: true }); // proud, now and then he straightens it
        case "talk":
        case "holdTalk":
          return s.play(C, [6, 4], 320, { loop: true });
        case "laugh":
          return s.play(C, [7, 5, 7, 6], 230, { loop: true });
        case "celebrate":
          return s.play(C, [5, 6, 7, 4], 260, { loop: true });
        case "swing": // waving goodbye as he swings off
          return s.show(C, 6);
        case "yes":
          return s.show(C, 5);
        case "ooh":
          return s.show(C, 3);
        default:
          return s.show(C, 4);
      }
    }
    // He puts on (or loses) the crown he won: his poses use the crown sheet while it is on his head.
    wear(on) {
      this.wearing = !!on;
      if (on) this.setHeld(null);
      this.pose(this.poseName || "idle");
    }
    // How wide the crown in his hands is drawn now (scared crown sheet), in stage pixels.
    heldCrownW() {
      const c = SCARED_CROWN[this.sprite.sheet === "zippy_scared_crown" ? this.sprite.frame : 1] || SCARED_CROWN[1];
      return c[2] * this.k;
    }
    // Where the crown on his head is now (world), for its sparkle.
    headPoint() {
      const P = this.P;
      const o = { x: CROWN_HEAD.x * this.k, y: CROWN_HEAD.y * this.k };
      const a = -(this.theta + this.sway) * this.tilt * deg;
      return { x: P.x + o.x * Math.cos(a) - o.y * Math.sin(a), y: P.y + o.x * Math.sin(a) + o.y * Math.cos(a) };
    }
    setHeld(spec) {
      this.held = spec;
      if (!spec) {
        this.heldEl.className = "held hidden";
        this.heldEl.innerHTML = "";
      } else if (spec.type === "bar") {
        this.heldEl.className = "held hbar";
        this.heldEl.innerHTML = `<span class="num">${spec.value}</span>`;
      } else {
        this.heldEl.className = "held hcrown";
        this.heldEl.innerHTML = `<img src="${IM().crown.src}" alt="" draggable="false">`;
      }
      this.placeHeld();
    }
    placeHeld() {
      // A bar on his bar sheet: the sheet draws the bar, so only its number goes on (on its front face,
      // as big as the face allows, tilted with the bar). Anywhere else the whole bar is drawn.
      const bar = !!(this.held && this.held.type === "bar");
      const onSheet = bar && this.sprite.sheet === "zippy_bar";
      this.heldEl.classList.toggle("hbar", bar && !onSheet);
      this.heldEl.classList.toggle("hnum", onSheet);
      const g = onSheet ? barGeom(this.sprite.frame) : null;
      this.heldEl.style.fontSize = g ? (g.fh * BAR_NUM * this.k).toFixed(1) + "px" : "";
      this.heldEl.style.setProperty("--tilt", (g ? g.tilt : 0) + "deg");
      const o = this.holdOffset();
      CQ.pos(this.heldEl, o.x, o.y);
      // on the swap sheet his fists are drawn again over what he holds
      const f = this.sprite.sheet === "zippy_swap" ? this.sprite.frame : 0;
      const on = !!(this.held && f > 1);
      if (on) this.fists.show("zippy_swap_hands", f);
      this.fists.el.style.display = on ? "" : "none"; // display, not visibility: hiding Zippy must hide it too
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
    // Vine angle + length that put a point of Zippy on a target: his hands in a sheet (its name), or
    // any point given from the tip of his tail.
    solveFor(target, grip) {
      const o = typeof grip === "string" ? HOLD_OFFSET[grip] : grip;
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
    swingTo(target, dur, grip) {
      this.swayAmp = 0;
      const s = this.solveFor(target, grip || "zippy_reach");
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
      this.pose("barCatch"); // his fingers close round its ends...
      setTimeout(() => this.poseName === "barCatch" && this.pose("hold"), 380); // ...and he holds it
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
    // Out of the picture on his vine: a little swing back to the right for a run-up, then one big swing
    // down and up to the left that carries him away over the left edge.
    async swingAway(dur) {
      this.swayAmp = 0;
      const a = { th: this.theta, len: this.len };
      await CQ.tween(
        280,
        (k) => {
          this.theta = CQ.lerp(a.th, 20, k);
          this.len = CQ.lerp(a.len, this.baseLen, k);
        },
        CQ.ease.out,
        "zippy"
      );
      const x0 = this.A.x;
      return CQ.tween(
        dur || 1100,
        (k) => {
          const sw = CQ.ease.sine(k); // like a pendulum: fastest at the bottom of the swing
          this.theta = CQ.lerp(20, OFF_TH, sw);
          this.tilt = CQ.lerp(TILT, 0.6, sw);
          this.A.x = CQ.lerp(x0, OFF_X, CQ.ease.in(k)); // the swing carries him off at the end
        },
        CQ.ease.linear,
        "zippy"
      );
    }
    // Out of the picture, ready to swing back in (a new level).
    offstage() {
      CQ.stopTween("zippy");
      this.swayAmp = 0;
      this.A.x = OFF_X;
      this.theta = OFF_TH;
      this.tilt = 0.6;
      this.len = this.baseLen;
      this.update(0);
    }
    // In from the left edge on his vine: one big swing down and up to the right, then smaller swings
    // that settle at home (like his first entrance).
    async swingBack() {
      const x0 = this.A.x;
      const th0 = Math.min(this.theta, -30);
      this.swayAmp = 0;
      this.len = this.baseLen;
      await CQ.tween(
        1200,
        (k) => {
          this.A.x = CQ.lerp(x0, L.ZIPPY.ax, CQ.ease.out(k)); // the swing brings him in, then he swings on the spot
          this.theta = CQ.lerp(th0, 26, CQ.ease.sine(k));
          this.tilt = CQ.lerp(0.6, TILT, k);
        },
        CQ.ease.linear,
        "zippy"
      );
      await CQ.tween(
        1600,
        (k, t) => {
          const tt = t * 1.6;
          this.theta = 26 * Math.exp(-2.4 * tt) * Math.cos(2 * Math.PI * 0.9 * tt);
        },
        CQ.ease.linear,
        "zippy"
      );
      this.A.x = L.ZIPPY.ax;
      this.theta = 0;
      this.tilt = TILT;
      this.swayAmp = 2.2;
    }
    setVisible(on) {
      this.rig.style.visibility = on ? "visible" : "hidden";
      this.vine.style.visibility = on ? "visible" : "hidden";
    }
    reset() {
      this.A = { x: L.ZIPPY.ax, y: L.ZIPPY.ay };
      this.theta = 0;
      this.tilt = TILT;
      this.wearing = false;
      this.len = this.baseLen;
      this.swayAmp = 2.2;
      this.setHeld(null);
      this.setVisible(true);
      this.body.style.transform = "";
      this.pose("idle");
    }
  }

  // ================================================================== balance (art: new balance .png)
  // The balance is put together from the parts of "new balance .png" (cut into assets/balance/ by
  // tools/prepare_assets.py), laid out like the user's picture of the finished balance. Sizes are
  // "balance units": the whole balance, with everything on its pans, is drawn at scale S around the
  // pivot (the hub's centre). The parts are drawn at ART_K of their art size. ART says where they go,
  // in pixels measured on the sheet (GEOM.balance has where each cut part was on it).
  // Back to front: floor shadow, base, the leaves at the post's foot, post, pans (plate, rope hanger,
  // the things on the plate), the leaves beside the hub, beam (it tips), hub (it stays upright: the
  // beam turns behind it). Re-measure ART if the sheet is replaced.
  const GB = window.GEOM.balance;
  const ART_K = 0.795; // sheet pixels -> balance units
  const ART = {
    pivot: { x: 1124.5, y: 171.5 }, // the hub's centre
    R: 425, // pivot to each hanging point, under the rope wrapped round the beam
    hangY: 58, // ...just below the beam: the hanger's knot tucks behind it
    beam: { axisY: 167, wrapL: 139, wrapR: 869, cutL: 170, cutR: 840 }, // between the cuts it is stretched, so the wraps sit at ±R
    knot: { x: 658.5, y: 254 }, // the top of the rope hanger's knot: it hangs from the hanging point
    ropeEnd: 682, // where the hanger's ropes end, on the plate's top
    plate: { x: 253, y: 434, top: 488 }, // the plate's centre, its top edge, and the line across its top (where the ropes land)
    post: { x: 1414, y: 24, at: 100 }, // the post's centre and top; its top goes `at` below the pivot, behind the hub
    base: { x: 1075, y: 432, at: 603 }, // the base's centre and top; its top goes `at` below the pivot
    feet: { x: 200, y: 922, k: 0.62, dx: 95, at: 683 }, // the three leaves (bottom centre), twice beside the post's foot; the post hides each inner leaf
    hubLeaves: { l: [518, 916], r: [524, 916], dx: 145, at: -50, tilt: 20 }, // each leaf's stem, set beside the hub, leaning out
  };
  const BAL = {
    S: 0.7, // drawn size (1 = full size)
    R: ART.R * ART_K, // pivot to each hanging point
    HANG_Y: ART.hangY * ART_K,
    PLATE_TOP: (ART.ropeEnd - ART.knot.y - 5 - (ART.plate.top - ART.plate.y)) * ART_K, // hanging point down to the plate's top edge
  };
  // Things stand on the plate's top, a little in front of the line across it.
  BAL.ITEMS_Y = BAL.PLATE_TOP + (ART.plate.top - ART.plate.y + 7) * ART_K;
  BAL.PAN_BOTTOM = BAL.PLATE_TOP + IM().balPlate.h * ART_K; // hanging point down to the plate's bottom
  BAL.FLOOR = (ART.base.at + IM().balBase.h) * ART_K; // pivot down to the bottom of the base
  BAL.HUB_R = (IM().balHub.w / 2) * ART_K;
  // Coins: stacked rows overlap a little, like a heap; spacing in a row.
  BAL.COIN_ROW = Math.round(L.COIN_W * 0.78);
  BAL.COIN_STEP = L.COIN_W + 2;
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

  // One part at ART_K (times k): its point (ax, ay) on the sheet lands at (x, y), in balance units.
  // turn: degrees, about that point.
  function part(key, parent, ax, ay, x, y, cls, k, turn) {
    k = ART_K * (k || 1);
    const im = IM()[key];
    const o = GB[key];
    const e = CQ.img(key, "bal-art " + (cls || ""), parent);
    const ox = (ax - o.x) * k;
    const oy = (ay - o.y) * k;
    Object.assign(e.style, { width: im.w * k + "px", height: im.h * k + "px", left: x - ox + "px", top: y - oy + "px" });
    if (turn) {
      e.style.transformOrigin = `${ox}px ${oy}px`;
      e.style.transform = `rotate(${turn}deg)`;
    }
    return e;
  }

  // The beam, with its middle (between the two rope wraps) stretched so the wraps sit at ±R. It
  // turns about the pivot: the point midway between the wraps, on its axis.
  function beamCanvas() {
    const B = ART.beam;
    const im = IM().balBeam;
    const o = GB.balBeam;
    const cutL = B.cutL - o.x;
    const cutR = B.cutR - o.x;
    const mid = 2 * ART.R - (B.cutL - B.wrapL) - (B.wrapR - B.cutR); // the stretched middle's width
    const W = Math.round(cutL + mid + (im.w - cutR));
    const c = document.createElement("canvas");
    c.width = W;
    c.height = im.h;
    c.className = "bal-art bal-beam";
    whenReady(artImage("balBeam"), () => {
      const g = c.getContext("2d");
      const img = artImage("balBeam");
      g.drawImage(img, 0, 0, cutL, im.h, 0, 0, cutL, im.h); // left end + wrap
      g.drawImage(img, cutL, 0, cutR - cutL, im.h, cutL, 0, mid, im.h); // the middle, stretched
      g.drawImage(img, cutR, 0, im.w - cutR, im.h, cutL + mid, 0, im.w - cutR, im.h); // right wrap + end
    });
    const k = ART_K;
    const cx = B.wrapL - o.x + ART.R; // the pivot, in the canvas
    const cy = B.axisY - o.y;
    Object.assign(c.style, { width: W * k + "px", height: im.h * k + "px", left: -cx * k + "px", top: -cy * k + "px" });
    c.style.transformOrigin = `${cx * k}px ${cy * k}px`;
    return c;
  }

  // The parts that stay still, behind the pans: base, the leaves at the post's foot, and the post.
  function standParts(parent) {
    const A = ART;
    const k = ART_K;
    part("balBase", parent, A.base.x, A.base.y, 0, A.base.at * k, "bal-base");
    [-1, 1].forEach((side) => part("balLeaves", parent, A.feet.x, A.feet.y, side * A.feet.dx * k, A.feet.at * k, "bal-feet", A.feet.k));
    part("balPost", parent, A.post.x, A.post.y, 0, A.post.at * k, "bal-post");
  }
  // The leaves beside the hub (behind the beam) and the hub itself (in front of it).
  function hubLeaves(parent) {
    const H = ART.hubLeaves;
    part("balLeafL", parent, H.l[0], H.l[1], -H.dx * ART_K, H.at * ART_K, "bal-leaf", 1, -H.tilt);
    part("balLeafR", parent, H.r[0], H.r[1], H.dx * ART_K, H.at * ART_K, "bal-leaf", 1, H.tilt);
  }
  function hubPart(parent) {
    return part("balHub", parent, ART.pivot.x, ART.pivot.y, 0, 0, "bal-hub");
  }
  // One pan, at its hanging point (its group follows the beam): the plate, its rope hanger, and the
  // things on the plate in front of both.
  function panParts(group) {
    part("balPlate", group, ART.plate.x, ART.plate.y, 0, BAL.PLATE_TOP, "bal-plate");
    part("balHanger", group, ART.knot.x, ART.knot.y, 0, 0, "bal-hanger");
    const items = CQ.el("div", "bal-items", group);
    CQ.pos(items, 0, BAL.ITEMS_Y);
    return items;
  }
  // A soft shadow on the floor under the base.
  function shadows(parent) {
    const sh = CQ.el("div", "bal-shadow", parent);
    const rx = (IM().balBase.w / 2) * ART_K * 1.05;
    CQ.box(sh, -rx, BAL.FLOOR - 18, rx * 2, 36);
  }

  // A small, complete balance (formula screen, intro thought bubble). opts: { width, left: 'bar',
  // right: 'coins3' }. A parent with .tip tips it (CSS; --tl and --tr say where its pans go).
  CQ.miniBalance = function (opts) {
    opts = opts || {};
    const w = opts.width || 150;
    const halfW = BAL.R + (IM().balPlate.w / 2) * ART_K + 6; // the whole balance, in balance units
    const top = 200 * ART_K; // above the pivot: the leaves beside the hub
    const s = w / (2 * halfW);
    const box = CQ.el("div", "mini-bal");
    Object.assign(box.style, { width: w + "px", height: Math.round((top + BAL.FLOOR + 10) * s) + "px" });
    const rig = CQ.el("div", "mini-rig", box);
    rig.style.transform = `translate(${halfW * s}px, ${top * s}px) scale(${s})`;
    shadows(rig);
    standParts(rig);
    [
      ["l", -1, opts.left],
      ["r", 1, opts.right],
    ].forEach(([n, side, what]) => {
      const holder = CQ.el("div", "mini-side", rig);
      holder.style.transform = `translate(${side * BAL.R}px, ${BAL.HANG_Y}px)`;
      const g = CQ.el("div", `mb-pan mb-pan-${n}`, holder);
      // tipped 14°, its hanging point turns about the pivot
      const th = 14 * deg;
      const x = side * BAL.R;
      const y = BAL.HANG_Y;
      box.style.setProperty(`--t${n}`, `translate(${(x * Math.cos(th) - y * Math.sin(th) - x).toFixed(1)}px, ${(x * Math.sin(th) + y * Math.cos(th) - y).toFixed(1)}px)`);
      const items = panParts(g);
      if (what === "bar") {
        const b = CQ.img("bar", "mini-item", items);
        Object.assign(b.style, { width: "160px", left: "-80px", top: "-74px" });
      } else if (what === "coins3") {
        [-70, 0, 70].forEach((cx) => {
          const c = CQ.el("div", "mini-item mini-coin", items, '<span class="one">1</span>');
          Object.assign(c.style, { left: cx - 32 + "px", top: "-64px" });
        });
      }
    });
    hubLeaves(rig);
    CQ.el("div", "mb-beam", rig).appendChild(beamCanvas());
    hubPart(rig);
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
      standParts(rig);
      this.sides = {};
      ["left", "right"].forEach((side) => {
        const g = CQ.el("div", "bal-side " + side, rig);
        this.sides[side] = { g, items: panParts(g) };
      });
      hubLeaves(rig);
      this.beam = rig.appendChild(beamCanvas());
      this.hub = hubPart(rig);
      this.level = true;
      this.setEmblem(true, true);
      // The equation sign hangs on the post, below the hub, at full size (outside the scaled container).
      this.sign = CQ.el("div", "eq-sign hidden", layer);
      CQ.pos(this.sign, BX, PY + 270 * BAL.S);
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
      // the hanging points (just under the beam) turn with it about the pivot
      const hy = BAL.HANG_Y;
      this.localEnds = {
        left: { x: -this.R * c - hy * s, y: -this.R * s + hy * c },
        right: { x: this.R * c - hy * s, y: this.R * s + hy * c },
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
      const cw = BAL.COIN_STEP;
      let extraW = 0;
      if (coins.length) extraW = Math.min(2, coins.length) * cw - (cw - L.COIN_W);
      if (bars.length) extraW = Math.max(extraW, bars[0].w);
      // the crown (or crowns, side by side: two crowns overlap a little), then what lies beside them
      const MAIN_GAP = -10;
      const mainW = main.reduce((w, m) => w + m.w, 0) + Math.max(0, main.length - 1) * MAIN_GAP;
      const gap = mainW && extraW ? 8 : 0;
      let x0 = -(mainW + gap + extraW) / 2;
      const res = new Map();
      let mx = x0;
      main.forEach((m) => {
        res.set(m, { x: mx + m.w / 2, y: 0, z: 2 });
        mx += m.w + MAIN_GAP;
      });
      x0 += mainW + gap;
      coins.forEach((c, i) => {
        const row = Math.floor(i / 2);
        const inRow = Math.min(2, coins.length - row * 2);
        const rowW = inRow * cw - (cw - L.COIN_W);
        res.set(c, { x: x0 + (extraW - rowW) / 2 + (i % 2) * cw + L.COIN_W / 2, y: -row * BAL.COIN_ROW, z: 3 + row });
      });
      bars.forEach((b, i) => res.set(b, { x: x0 + extraW / 2, y: -i * 64, z: 3 + i }));
      return items.map((it) => res.get(it));
    }
    layoutRight(items) {
      const coins = items.filter((it) => it.type === "coin");
      const bars = items.filter((it) => it.type !== "coin");
      const res = new Map();
      const cw = BAL.COIN_STEP;
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
        const rowW = n * cw - (cw - L.COIN_W);
        for (let i = 0; i < n && idx < coins.length; i++) {
          res.set(coins[idx++], { x: -rowW / 2 + i * cw + L.COIN_W / 2, y: -r * BAL.COIN_ROW, z: 3 + r });
        }
      });
      while (idx < coins.length) res.set(coins[idx++], { x: 0, y: -this.rows.length * BAL.COIN_ROW, z: 9 });
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
    // Level or not: said for screen readers on the hub, and a flash at the hub when it changes.
    setEmblem(eq, quiet) {
      const was = this.level;
      this.level = eq;
      this.hub.alt = eq ? "The balance is level: both sides are equal" : "The balance is tipped: the sides are not equal";
      if (!quiet && was !== eq) this.flashEmblem();
    }
    flashEmblem() {
      CQ.anim(this.hub, [{ transform: "scale(1)" }, { transform: "scale(1.12)" }, { transform: "scale(1)" }], {
        duration: 520,
        easing: CQ.EASE.back,
        keep: false,
        essential: true,
      });
      CQ.fx.ring(CQ.world.fx, L.BX, L.PIVOT_Y, this.level ? "#2BB673" : "#C8473B");
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

  // ================================================================== gold bars on wooden stools
  // The stool art (props/brick-stand.png): a bar rests on its plank top, at y = L.BAR_BASE.
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
      this.cueN = -1; // the first hint starts at the left-hand bar
      const order = opts.shuffle === false ? values.slice() : CQ.shuffle(values);
      const xs = [L.BX - 270, L.BX, L.BX + 270];
      order.forEach((v, i) => {
        const x = xs[i];
        // the stool: the bar rests on its plank top
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
    // "This can be picked up and given to Zippy": a faded copy of ONE bar lifts off it and floats part
    // of the way towards Zippy's hands, then fades. Each time it is the next bar (left to right), so the
    // hint never points at the answer. The bars themselves stay still.
    cue(values) {
      const list = this.list
        .filter((b) => b.state === "idle" && (!values || values.includes(b.value)))
        .sort((p, q) => p.home.x - q.home.x);
      if (!list.length) return;
      const b = list[(this.cueN = (this.cueN || 0) + 1) % list.length];
      const to = CQ.zippy.holdPoint("zippy_swap", 1);
      const g = barGhost(b.value, "lift");
      this.layer.appendChild(g);
      CQ.pos(g, b.home.x, b.home.y);
      const dx = (to.x - b.home.x) * 0.32;
      const dy = (to.y - b.home.y) * 0.32;
      // up off the stand first, then along a gentle curve towards Zippy
      const at = (k) =>
        `translate(-50%,-50%) translate(${(dx * k).toFixed(1)}px, ${(dy * k - 55 * Math.sin(Math.PI * Math.min(1, k * 1.4))).toFixed(1)}px) scale(${(1 - 0.12 * k).toFixed(3)})`;
      CQ.anim(
        g,
        [
          { transform: at(0), opacity: 0 },
          { transform: at(0.15), opacity: 0.75, offset: 0.2 },
          { transform: at(0.6), opacity: 0.6, offset: 0.65 },
          { transform: at(1), opacity: 0 },
        ],
        { duration: 1900, delay: 200, easing: "ease-in-out", keep: false, essential: true }
      ).then(() => g.remove());
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
      this.startCue(values);
    },
    disable() {
      this.allowed = null;
      this.onGive = null;
      this.stopCue();
      CQ.bars.refresh();
    },
    // While the child is choosing, the faded-copy hint (CQ.bars.cue) plays at once and then every few
    // seconds, until a bar is in Zippy's hands. It waits while a bar is dragged, the hint hand is
    // showing, or a menu is open.
    startCue(values) {
      this.stopCue();
      const run = () => {
        if (!this.allowed || this.dragging || this.busy || CQ.pauser.count || document.hidden) return;
        if (CQ.zippy.held && CQ.zippy.held.type === "bar") return; // SWAP is the next step
        if (!CQ.hand.el.classList.contains("hidden")) return;
        CQ.bars.cue(values);
      };
      this.cueStart = setTimeout(run, 300);
      this.cueTimer = setInterval(run, 6000);
    },
    stopCue() {
      clearTimeout(this.cueStart);
      clearInterval(this.cueTimer);
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
      z.pose("ready"); // hands open as it comes
      const to = z.barBox(1); // it lands where his fingers close round it (his catch frame)
      await CQ.fly(CQ.world.drag, CQ.barFlyer(bar.value), from, to, { duration: 520, arc: -80, scaleTo: to.w / L.BAR_W });
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
      const box = CQ.zippy.barBox(); // from his hands, at the size he holds it
      const from = opts.from || box;
      const scaleFrom = opts.scaleFrom != null ? opts.scaleFrom : box.w / L.BAR_W;
      await CQ.fly(CQ.world.drag, CQ.barFlyer(bar.value), from, bar.home, { duration: 780, arc: -170, scaleFrom });
      CQ.audio.play("bar.place");
      bar.slot.classList.remove("gone");
      if (opts.tried) CQ.bars.markTriedBar(bar);
      else if (bar.state === "held") bar.state = "idle";
      CQ.bars.refresh();
    },
  };
})();
