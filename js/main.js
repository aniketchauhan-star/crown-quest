/*
 * Zippy's Crown Quest: boot + title screen.
 * Chapter links (handy for teachers): index.html#L5 makes Start begin at that checkpoint
 * (intro, L1–L3, L4a, L4c, L4e, L4g, L5–L9, P for the practice equations, finale).
 * ?cp=L5 does the same when opened locally.
 */
(function () {
  "use strict";
  const CQ = window.CQ;
  const C = () => window.CONTENT;
  const params = new URLSearchParams(location.search);
  const linkCp = () => {
    const h = (location.hash || "").replace(/^#/, "");
    const cp = params.get("cp") || h;
    return CQ.flow.ORDER.includes(cp) ? cp : null;
  };

  // ------------------------------------------------------------------ the title screen
  // The temple, with only its characters coming in, in a 5-second opening like a film (asked
  // 2026-11-06): out of the dark the camera glides back into the
  // temple (a deep "boom"), Zippy flies in and catches his vine ("wheee!"), the crown drops onto its
  // pedestal, Grumble rises behind the ledge and ROARS (the screen shakes, leaves fall, the fires flare),
  // the title sign slams in, and the play button pops up. Afterwards the scene stays alive: it turns
  // gently in 3D (on its own and with the mouse; the sign is a little in front of the wall), Zippy
  // swings from his vine, Grumble breathes, a shine runs over the sign, the crown glints, fireflies drift
  // and the fires flicker. A tap during the opening skips to its end.
  // The pictures (art/ui/title *.png, made with docs/prompts/ChatGPT-Title-Screen-Prompt.md): the empty
  // temple (tPlate) and each character alone (tZippy, tLogo, tCrown, tGrumble: x, y = its top-left on the
  // background, in the background's px; s = its scale there), put in place by tools/make_title.swift so
  // the title looks like the old title screen, but sharp.
  // The play button (or Enter) starts the game afresh from the intro (a chapter link like #L5 starts at
  // that chapter instead). Saved progress and the "first time" hints are reset; settings are kept.
  const TITLE = { P: 1400, ox: 960, oy: 486, zoom: 1.04 }; // the perspective (px), its vanishing point, and a touch of zoom so the edges never show as the scene turns
  const K = () => CQ.W / IMAGES.tPlate.w; // background px -> stage px
  const st = (x, y) => ({ x: x * K(), y: y * K() });
  // On the background (title background.png, in its px):
  const ZIPPY_HAND = { x: 452, y: 118 }; // his fist on the vine: he swings from it
  const GRUMBLE_FRONT = [[840, 686], [1234, 686], [1238, 664], [1252, 654], [1290, 648], [1340, 645]]; // the ledge and the pedestal's corner in front of him (left to right)
  const FIRES = [[646, 748, 1.0], [995, 630, 1.3]]; // the glowing doorways (where, and how big)
  const PLAY_AT = { x: 1000, y: 905, w: 320 }; // the play button's centre on the stage, and its width
  const SIGN_Z = 110; // the title sign stands this far in front of the wall

  CQ.title = {
    // Only the start screen and the play button: no other words.
    build(root) {
      this.root = root;
      root.innerHTML = "";
      root.setAttribute("aria-label", C().title.name);
      document.documentElement.classList.add("on-title"); // the bands round the stage show the start screen
      this.gen = 0;
      this.timers = [];
      this.played = false;
      this.cam = CQ.el("div", "t-cam", root); // the camera's move in the opening (and its touch of zoom)
      this.drift = CQ.el("div", "t-drift", this.cam); // its slow turn afterwards
      this.tilt = CQ.el("div", "t-tilt", this.drift); // and its turn with the mouse
      // the wall: the start screen without its characters, with the doorways' fires and the light
      this.card = CQ.el("div", "t-layer t-card", this.tilt);
      CQ.img("tPlate", "t-plate", this.card);
      FIRES.forEach(([x, y, k]) => {
        const f = CQ.el("div", "t-fire", this.card);
        const p = st(x, y);
        CQ.pos(f, p.x, p.y);
        f.style.setProperty("--k", k);
        f.style.animationDelay = (-Math.random() * 3).toFixed(2) + "s";
      });
      ["t-shaft a", "t-shaft b"].forEach((c) => CQ.el("div", c, this.card));
      // each character where it is in the start screen
      const put = (key, cls, parent) => {
        const im = IMAGES[key];
        const p = st(im.x, im.y);
        const k = (im.s || 1) * K(); // the picture is kept larger than shown, so it stays sharp
        const wrap = CQ.el("div", "t-piece " + cls, parent);
        CQ.box(wrap, p.x, p.y, im.w * k, im.h * k);
        CQ.img(key, "", wrap);
        return wrap;
      };
      // Grumble stands in his doorway behind the ledge: he is only seen above it (a fixed clip, so he can
      // rise from behind it)
      this.grumbleBay = CQ.el("div", "t-bay", this.card);
      const front = GRUMBLE_FRONT.map(([x, y]) => st(x, y));
      this.grumbleBay.style.clipPath = `polygon(0 0, 1920px 0, 1920px ${front[front.length - 1].y.toFixed(1)}px, ` +
        front.slice().reverse().map((q) => `${q.x.toFixed(1)}px ${q.y.toFixed(1)}px`).join(", ") +
        `, 0 ${front[0].y.toFixed(1)}px)`;
      this.grumble = put("tGrumble", "t-grumble", this.grumbleBay);
      this.crown = put("tCrown", "t-crown", this.card);
      this.zippy = put("tZippy", "t-zippy", this.card);
      const hand = st(ZIPPY_HAND.x - IMAGES.tZippy.x, ZIPPY_HAND.y - IMAGES.tZippy.y); // (in the piece, as shown)
      this.zippy.style.transformOrigin = `${hand.x.toFixed(1)}px ${hand.y.toFixed(1)}px`;
      // the fireflies drift in the air in front of the wall, and the sign stands a little in front of it
      // (each layer drawn so that, seen through the perspective, it is exactly in place at rest)
      const layer = (cls, z) => {
        const el = CQ.el("div", "t-layer " + cls, this.tilt);
        el.style.transform = `translateZ(${z}px) scale(${((TITLE.P - z) / TITLE.P).toFixed(4)})`;
        return el;
      };
      const air = layer("t-air", 60);
      for (let i = 0; i < 16; i++) {
        const f = CQ.el("div", "t-fly", air);
        CQ.pos(f, 120 + ((i * 457) % 1700), 160 + ((i * 263) % 760));
        f.style.animationDuration = (5 + (i % 5) * 1.3).toFixed(1) + "s";
        f.style.animationDelay = (-(i * 0.9) % 7).toFixed(1) + "s";
      }
      this.sign = put("tLogo", "t-logo", layer("t-front", SIGN_Z));
      this.sign.style.setProperty("--shape", `url(${IMAGES.tLogo.src})`); // the shine runs over the sign only
      this.fx = CQ.el("div", "t-fx", root); // sparkles, dust, the roar (flat, over the scene)
      this.black = CQ.el("div", "t-black", root); // the opening starts in the dark
      // the play button: the wooden one (start button.png), at the foot of the scene
      const pw = PLAY_AT.w;
      const ph = (PLAY_AT.w * IMAGES.startButton.h) / IMAGES.startButton.w;
      this.startBtn = CQ.button(
        "start-btn",
        `<img src="${IMAGES.startButton.src}" alt="" draggable="false">`,
        C().title.start, // read by screen readers only
        root,
        () => this.go(linkCp() || "intro", { reset: true })
      );
      CQ.box(this.startBtn, PLAY_AT.x - pw / 2, PLAY_AT.y - ph / 2, pw, ph);
      this.startBtn.classList.add("t-hidden");
      // the scene turns a little with the mouse, as if seen from where it points
      root.addEventListener("pointermove", (e) => {
        if (CQ.motion.reduced || document.documentElement.classList.contains("lite")) return;
        const p = CQ.stage.toStage(e.clientX, e.clientY);
        const nx = Math.max(-1, Math.min(1, p.x / 960 - 1));
        const ny = Math.max(-1, Math.min(1, p.y / 540 - 1));
        this.tilt.style.transform = `rotateY(${(nx * 1.8).toFixed(2)}deg) rotateX(${(-ny * 1.2).toFixed(2)}deg)`;
      });
      // a tap during the opening skips to its end
      root.addEventListener("pointerdown", (e) => {
        if (this.playing && !e.target.closest(".start-btn")) this.finish();
      });
      root.classList.add("t-waiting"); // before the opening: the characters wait, unseen, in the dark
    },
    // While the rest of the pictures load behind the title, a slim golden bar at its foot fills up.
    progress(p) {
      if (!this.root) return;
      if (!this.bar) this.bar = CQ.el("div", "title-load", this.root, '<div class="tl-fill"></div>');
      this.bar.firstChild.style.width = Math.round(p * 100) + "%";
      this.bar.classList.toggle("done", p >= 1);
    },
    // Stage points for the effects: on a character (fx, fy: 0..1 across and down it)
    at(key, fx, fy) {
      const im = IMAGES[key];
      const k = im.s || 1;
      return st(im.x + im.w * k * fx, im.y + im.h * k * fy);
    },
    // The opening: 5 seconds, then the title and the play button. Each step at its time (ms).
    play() {
      if (this.played) return;
      this.played = true;
      const gen = ++this.gen;
      this.root.classList.remove("t-waiting");
      if (CQ.motion.reduced) return this.finish(); // no film: straight to the title
      this.playing = true;
      this.root.classList.add("t-opening");
      const at = (ms, fn) => this.timers.push(setTimeout(() => gen === this.gen && fn(), ms));
      const sfx = (name, o) => CQ.audio.play(name, o);
      const A = (el, kf, o) => CQ.anim(el, kf, Object.assign({ keep: false, essential: true, fill: "backwards" }, o));
      const Z = TITLE.zoom;
      // 0 s: out of the dark, the camera glides back from close up into the temple
      sfx("title.boom", { volume: 0.9 });
      A(this.black, [{ opacity: 1 }, { opacity: 0 }], { duration: 1100, easing: "ease-out" }).then(() => this.black.classList.add("gone"));
      A(this.cam, [{ transform: `translateZ(420px) rotateX(8deg) rotateY(-10deg) scale(${Z})` }, { transform: `translateZ(0) rotateX(0) rotateY(0) scale(${Z})` }], {
        duration: 2600,
        easing: "cubic-bezier(.16,1,.3,1)",
      });
      at(250, () => {
        sfx("torch.fwoom", { volume: 0.7 });
        this.flare(700);
      });
      // 0.6 s: Zippy flies in from the top left, swoops down and catches his vine (his fist lands on it at
      // 1.5 s), and swings on it a little, from his fist
      A(this.zippy, [
        { transform: "translate(-860px, -420px) rotate(-34deg)", easing: "cubic-bezier(.45,0,.75,.6)" }, // swooping down, faster and faster
        { transform: "translate(-300px, 90px) rotate(-16deg)", offset: 0.4, easing: "cubic-bezier(.2,.6,.4,1)" }, // up to the vine
        { transform: "translate(0, 0) rotate(13deg)", offset: 0.62, easing: "ease-in-out" }, // caught: he swings on from his fist
        { transform: "rotate(-7deg)", offset: 0.77, easing: "ease-in-out" },
        { transform: "rotate(3deg)", offset: 0.9, easing: "ease-in-out" },
        { transform: "rotate(0)" },
      ], { duration: 1500, delay: 600, easing: "linear" });
      at(650, () => sfx("zippy.whee"));
      at(1500, () => {
        sfx("bar.pick", { volume: 0.6 }); // the vine caught
        CQ.fx.sparkle(this.fx, st(ZIPPY_HAND.x, ZIPPY_HAND.y).x, st(ZIPPY_HAND.x, ZIPPY_HAND.y).y, 6, 40);
      });
      at(1700, () => sfx("zippy.laugh", { volume: 0.7 }));
      // 1.8 s: the crown drops onto its pedestal and sparkles
      A(this.crown, [
        { transform: "translateY(-720px) rotate(-14deg)", opacity: 0 },
        { transform: "translateY(0) rotate(0)", opacity: 1, offset: 0.62 },
        { transform: "translateY(-34px) rotate(3deg)", offset: 0.8 },
        { transform: "translateY(0) rotate(0)" },
      ], { duration: 800, delay: 1800, easing: "cubic-bezier(.5,0,.6,1)" });
      at(2300, () => {
        const c = this.at("tCrown", 0.5, 0.55);
        sfx("crown.sparkle");
        CQ.fx.sparkle(this.fx, c.x, c.y - 40, 14, 120);
        CQ.fx.ring(this.fx, c.x, c.y, "#ffd84d");
      });
      // 2.4 s: Grumble rises behind the ledge, and at 2.9 s he ROARS
      A(this.grumble, [{ transform: "translateY(300px)" }, { transform: "translateY(0)" }], { duration: 560, delay: 2400, easing: "cubic-bezier(.2,.9,.3,1.2)" });
      at(2450, () => sfx("grumble.stomp"));
      at(2900, () => this.roar());
      // 3.9 s: the title sign slams in
      A(this.sign, [
        { transform: "translateZ(500px) scale(2.2) rotateX(-30deg)", opacity: 0 },
        { transform: "translateZ(0) scale(.94) rotateX(0)", opacity: 1, offset: 0.6 },
        { transform: "scale(1.04)", offset: 0.8 },
        { transform: "scale(1)", opacity: 1 },
      ], { duration: 700, delay: 3900, easing: "cubic-bezier(.3,.6,.4,1)" });
      at(4300, () => {
        const s = this.at("tLogo", 0.5, 0.5);
        sfx("title.boom", { volume: 0.7 });
        sfx("name.burst", { volume: 0.6 });
        this.shake(10, 380);
        CQ.fx.sparkle(this.fx, s.x, s.y, 22, 330);
        CQ.fx.dust(this.fx, s.x - 260, s.y + 160, 7);
        CQ.fx.dust(this.fx, s.x + 260, s.y + 160, 7);
      });
      // 4.5 s: the play button pops up, and the scene settles into its idle life
      at(4500, () => this.showPlay(true));
      at(5000, () => this.finish());
    },
    // the doorways' fires flare up for ms
    flare(ms) {
      this.root.classList.add("t-flare");
      clearTimeout(this.flareT);
      this.flareT = setTimeout(() => this.root.classList.remove("t-flare"), ms);
    },
    // Grumble's roar: he swells, the screen shakes, rings burst from his mouth, leaves fall, the fires flare.
    roar() {
      CQ.audio.play("grumble.roar", { volume: 1 });
      CQ.anim(this.grumble, [{ transform: "scale(1)" }, { transform: "scale(1.13) rotate(-2deg)", offset: 0.25 }, { transform: "scale(1.09) rotate(2deg)", offset: 0.55 }, { transform: "scale(1)" }], {
        duration: 900,
        keep: false,
        essential: true,
      });
      this.shake(16, 800);
      this.flare(900);
      const m = this.at("tGrumble", 0.5, 0.36); // his mouth
      [0, 160, 320].forEach((d) => setTimeout(() => this.ring(m.x, m.y), d));
      const word = CQ.el("div", "t-roar", this.fx, C().title.roar || "ROAR!");
      CQ.pos(word, m.x - 30, m.y - 230);
      CQ.anim(word, [{ transform: "translate(-50%,-50%) scale(.2) rotate(-12deg)", opacity: 0 }, { transform: "translate(-50%,-50%) scale(1.15) rotate(-6deg)", opacity: 1, offset: 0.25 }, { transform: "translate(-50%,-50%) scale(1) rotate(-6deg)", opacity: 1, offset: 0.75 }, { transform: "translate(-50%,-60%) scale(1.05) rotate(-6deg)", opacity: 0 }], {
        duration: 1100,
        keep: false,
        essential: true,
      }).then(() => word.remove());
      for (let i = 0; i < 12; i++) this.leaf(160 + i * 140 + Math.random() * 80, -20 - Math.random() * 60, i * 60);
    },
    ring(x, y) {
      const r = CQ.el("div", "t-ring", this.fx);
      CQ.pos(r, x, y);
      CQ.anim(r, [{ transform: "translate(-50%,-50%) scale(.2)", opacity: 0.9 }, { transform: "translate(-50%,-50%) scale(3.2)", opacity: 0 }], { duration: 750, easing: "ease-out", keep: false, essential: true }).then(() => r.remove());
    },
    leaf(x, y, delay) {
      const l = CQ.el("div", "t-leaf", this.fx);
      CQ.pos(l, x, y);
      const dx = CQ.rand(-160, 160);
      const fall = CQ.rand(520, 880);
      const spin = CQ.rand(-260, 260);
      CQ.anim(
        l,
        [
          { transform: "translate(-50%,-50%) rotate(0deg)", opacity: 0 },
          { transform: `translate(-50%,-50%) translate(${dx * 0.4}px, ${fall * 0.3}px) rotate(${spin * 0.4}deg)`, opacity: 1, offset: 0.25 },
          { transform: `translate(-50%,-50%) translate(${dx}px, ${fall}px) rotate(${spin}deg)`, opacity: 0 },
        ],
        { duration: CQ.rand(1800, 2600), delay, easing: "ease-in", keep: false, essential: true }
      ).then(() => l.remove());
    },
    shake(power, ms) {
      if (CQ.motion.reduced) return;
      const kf = [];
      for (let i = 0; i <= 12; i++) {
        const f = (1 - i / 12) * power;
        kf.push({ transform: `translate(${CQ.rand(-f, f).toFixed(1)}px, ${CQ.rand(-f, f).toFixed(1)}px)` });
      }
      kf[12] = { transform: "translate(0, 0)" };
      CQ.anim(this.root, kf, { duration: ms, easing: "linear", keep: false, essential: true });
    },
    showPlay(pop) {
      const b = this.startBtn;
      if (!b.classList.contains("t-hidden")) return;
      b.classList.remove("t-hidden");
      if (!pop) return;
      CQ.audio.play("ui.pop");
      CQ.anim(b, [{ transform: "scale(0) rotate(-20deg)" }, { transform: "scale(1.18) rotate(4deg)", offset: 0.6 }, { transform: "scale(.94) rotate(-2deg)", offset: 0.8 }, { transform: "scale(1) rotate(0)" }], {
        duration: 600,
        easing: "ease-out",
        keep: false,
        essential: true,
      });
      CQ.fx.sparkle(this.fx, PLAY_AT.x, PLAY_AT.y, 10, 130);
    },
    // The end of the opening (also straight away on a tap during it, or with Reduced motion): every
    // character in its place, the play button shown and the idle life begins. No background music on
    // the title screen (asked 2026-11-09: "in this thumbnail no need bg music"): it begins with the game.
    finish() {
      if (this.done) return;
      this.done = true;
      this.playing = false;
      this.gen++;
      this.timers.forEach(clearTimeout);
      this.timers = [];
      [this.cam, this.black, this.zippy, this.crown, this.grumble, this.sign].forEach((el) => el.getAnimations().forEach((a) => a.cancel()));
      this.black.classList.add("gone");
      this.root.classList.remove("t-opening", "t-waiting");
      this.root.classList.add("t-idle");
      this.showPlay(false);
      CQ.audio.music(null);
      clearInterval(this.sparkle);
      this.sparkle = setInterval(() => {
        if (document.hidden) return;
        const c = this.at("tCrown", 0.5, 0.35);
        CQ.fx.sparkle(this.fx, c.x + CQ.rand(-90, 90), c.y, 3, 40); // the crown glints
      }, 1500);
    },
    // opts.reset: forget saved progress and which hints have been seen (a brand new game)
    async go(cp, opts) {
      if (this.going) return;
      this.going = true;
      if (opts && opts.reset) ["progress", "practiceAt", "swapDemoSeen", "blankDemoSeen"].forEach((k) => CQ.store.remove(k));
      CQ.audio.init();
      CQ.settings.apply();
      CQ.screen.fullscreen(); // phones and tablets: the whole screen, held sideways
      CQ.audio.play("name.burst");
      if (CQ.ready) {
        // the rest of the pictures are still on their way: the play button waits, gently, until they are in
        this.startBtn.classList.add("waiting");
        await CQ.ready;
        this.startBtn.classList.remove("waiting");
      }
      CQ.anim(this.startBtn, [{ transform: "scale(1)" }, { transform: "scale(.85, 1.1)" }, { transform: "scale(1.1, .9)" }], { duration: 260, essential: true });
      await CQ.sleep(240);
      CQ.audio.play("ui.swoosh");
      // the title closes in a circle onto the play button
      const c = CQ.centerOf(this.startBtn) || { x: CQ.W / 2, y: CQ.H * 0.85 };
      const at = `${((c.x / CQ.W) * 100).toFixed(1)}% ${((c.y / CQ.H) * 100).toFixed(1)}%`;
      await CQ.anim(this.root, [{ clipPath: `circle(150% at ${at})` }, { clipPath: `circle(0% at ${at})` }], {
        duration: 850,
        easing: CQ.EASE.in,
        essential: true,
      });
      this.gen++;
      this.timers.forEach(clearTimeout);
      clearInterval(this.sparkle);
      this.root.classList.add("hidden");
      document.documentElement.classList.remove("on-title"); // ...and from now on the game's jungle
      CQ.flow.chapter(cp, { noVeil: true });
    },
  };

  async function boot() {
    const stage = document.getElementById("stage");
    CQ.stage.init(stage);
    document.title = C().title.name;
    const loading = document.getElementById("loading");
    loading.querySelector(".lb-text").textContent = C().title.loading;
    document.querySelector("#rotate .rot-text").textContent = C().title.rotate;
    const fill = loading.querySelector(".lb-fill");
    // First only what the title screen shows (its pieces, assets/title, and the play button), so it
    // appears quickly even on a slow connection; the rest of the pictures load behind the title
    // (CQ.ready), and Play waits for them if it has to. (The old title picture is not used any more.)
    const first = Object.keys(IMAGES).filter((k) => /^t[A-Z]/.test(k)).map((k) => IMAGES[k].src).concat(IMAGES.startButton.src, IMAGES.coin.src);
    const unused = [IMAGES.startScreen].filter(Boolean).map((i) => i.src);
    const rest = [].concat(
      Object.values(window.IMAGES).map((i) => i.src),
      Object.values(window.SPRITES).map((s) => s.src)
    ).filter((u, i, all) => !first.includes(u) && !unused.includes(u) && all.indexOf(u) === i);
    await CQ.preload(first, (p) => (fill.style.width = Math.round(p * 100) + "%"));
    try {
      if (document.fonts && document.fonts.load)
        await Promise.race([
          Promise.all([
            document.fonts.load('800 40px "Baloo 2"'),
            document.fonts.load('600 40px "Baloo 2"'),
            document.fonts.load('italic 400 40px "Swifty Math"', "x"), // the x of the equations
          ]),
          CQ.sleep(2500),
        ]);
    } catch (e) {
      /* fallback fonts are fine */
    }
    CQ.camera.init(document.getElementById("world"), document.getElementById("shake"));
    CQ.world.build(document.getElementById("world"));
    CQ.ui.build(document.getElementById("ui"), document.getElementById("overlay"), document.getElementById("modal"));
    CQ.notebook.build(document.getElementById("overlay"));
    CQ.settings.load();
    CQ.title.build(document.getElementById("title"));
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) CQ.audio.stopSpeech();
    });
    CQ.ready = CQ.preload(rest, (p) => CQ.title.progress(p)).then(() => (CQ.ready = null));
    const open = () => {
      loading.classList.add("done");
      setTimeout(() => loading.remove(), 600);
    };
    if (params.get("autostart")) {
      // for automated tests: straight into the game (no sound until a tap)
      open();
      CQ.title.finish();
      return CQ.title.go(linkCp() || "intro");
    }
    // The opening has sound, and most browsers only let sound start after a tap. So unless it can play
    // already, the loading screen ends on the play button, and the opening starts on its tap.
    if (soundAllowed()) {
      CQ.audio.init();
      open();
      return CQ.title.play();
    }
    loading.classList.add("gate");
    const go = CQ.el("button", "lb-go", loading, `<img src="${IMAGES.startButton.src}" alt="" draggable="false">`);
    go.type = "button";
    go.setAttribute("aria-label", C().title.start);
    const start = () => {
      if (!loading.classList.contains("gate")) return;
      loading.classList.remove("gate");
      CQ.audio.init(); // inside the tap: sound may start now
      CQ.screen.fullscreen(); // phones and tablets: the whole screen, held sideways
      CQ.audio.play("ui.tap");
      open();
      CQ.title.play();
    };
    loading.addEventListener("click", start); // anywhere on it
    const key = (e) => {
      if (e.key !== "Enter" && e.key !== " ") return;
      document.removeEventListener("keydown", key);
      e.preventDefault();
      start();
    };
    document.addEventListener("keydown", key); // or Enter / Space
  }
  // Can sound start without a tap? (A quick, silent try with a throwaway audio context.)
  function soundAllowed() {
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      const t = new AC();
      const ok = t.state === "running";
      if (t.close) t.close();
      return ok;
    } catch (e) {
      return false;
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
