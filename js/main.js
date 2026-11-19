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
  const ZIPPY_HAND = { x: 416, y: 155 }; // where his fist holds the vine (its middle, under his curled fingers): he swings from it
  const GRUMBLE_FRONT = [[840, 686], [1234, 686], [1238, 664], [1252, 654], [1290, 648], [1340, 645]]; // the ledge and the pedestal's corner in front of him (left to right)
  const FIRES = [[646, 748, 1.0], [995, 630, 1.3]]; // the glowing doorways (where, and how big)
  const PLAY_AT = { x: 1000, y: 905, w: 320 }; // the play button's centre on the stage, and its width
  const DISC = { x: 0.4875, y: 0.504 }; // the middle of its wooden disc, across and down its picture (a touch left of the picture's middle)
  // Play: when each part of the absorb happens (ms after the button springs back up from the press; see go)
  const TL = {
    up: 170, // the button has sprung up, glowing
    wind: 290, // it has wound back a little, ready to spin
    gone: 850, // it has spun away into its own centre (the sound's "gulp": GULP in js/audio.js, 'title.absorb')
    drain: 760, // the dark has come in from the edges to the button
    dusk: 520, // the rest of the light goes, over duskFor ms: then the screen is dark, and the game begins under it
    duskFor: 420,
    wink: 830, // the last glint
  };
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
      // his grip: the bit of the vine that lies in front of his palm, under his curled fingers, so his fist
      // is closed round the vine (asked 2026-11-17). Its own picture (tools/make_title.swift, GRIP), shown
      // once he has caught the vine (x, y: its top-left on the Zippy picture)
      const g = IMAGES.tZippyGrip;
      if (g) {
        const k = (IMAGES.tZippy.s || 1) * K();
        CQ.box(CQ.img("tZippyGrip", "t-grip", this.zippy), g.x * k, g.y * k, g.w * k, g.h * k);
      }
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
      // Enter or Space does the same, then presses the play button (the keyboard's way in)
      this.onKey = (e) => {
        if ((e.key !== "Enter" && e.key !== " ") || this.going || (CQ.pauser && CQ.pauser.count)) return;
        e.preventDefault();
        if (this.playing) this.finish();
        else if (!this.startBtn.classList.contains("t-hidden")) this.startBtn.click();
      };
      window.addEventListener("keydown", this.onKey);
      root.classList.remove("t-caught");
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
        this.root.classList.add("t-caught"); // his fist closes round the vine
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
    // The play button starts the game: it is pressed in, then it ABSORBS the title (asked 2026-11-17:
    // "when i click on the play button then its absorb then smoothly transition to the game screen").
    // It springs up glowing while the light of the scene is drawn into it (golden motes and leaves
    // spiral in, rings of light close in, the dark comes in from the edges), winds back a little, then
    // spins away into its own centre with a soft "gulp" and a last glint. The screen is then dark: the
    // dark the game's first scene starts from (Grumble snoring in the night). The game begins under that
    // dark and the title melts away into it, so there is no cut and no bright flash on the way.
    // (Only transform and opacity move, each on the browser's clock; with Reduced motion the title only
    // fades into that dark.) opts.reset: forget saved progress and which hints have been seen.
    async go(cp, opts) {
      if (this.going) return;
      this.going = true;
      window.removeEventListener("keydown", this.onKey);
      if (opts && opts.reset) ["progress", "practiceAt", "swapDemoSeen", "blankDemoSeen"].forEach((k) => CQ.store.remove(k));
      CQ.audio.init();
      CQ.settings.apply();
      CQ.screen.fullscreen(); // phones and tablets: the whole screen, held sideways
      const b = this.startBtn;
      const s = scaleOf(b); // (where its pulse has it now, so the press starts there, without a jump)
      b.style.transformOrigin = b.firstChild.style.transformOrigin = `${DISC.x * 100}% ${DISC.y * 100}%`; // it turns and shrinks about its disc's middle
      b.classList.add("t-going"); // (its pulse stops)
      CQ.audio.play("ui.tap"); // the wooden "tok" of the press
      if (!CQ.motion.reduced) await CQ.anim(b, [{ transform: `scale(${s})` }, { transform: "scale(.86)" }], { duration: 130, easing: CQ.EASE.out, essential: true });
      if (CQ.ready) {
        // the rest of the pictures are still on their way: the play button waits, gently, until they are in
        b.classList.add("waiting");
        if (!CQ.motion.reduced) CQ.anim(b, [{ transform: "scale(.86)" }, { transform: "scale(1)" }], { duration: 300, easing: CQ.EASE.out, essential: true });
        await CQ.ready;
        b.classList.remove("waiting");
      }
      await this.absorb(); // ...until the screen is dark
      // under the dark the game begins (and the bands round the stage show its jungle from now on)...
      document.documentElement.classList.remove("on-title");
      CQ.flow.chapter(cp, { noVeil: true });
      await CQ.sleep(90); // (its first picture is drawn)
      // ...and the title melts away into it (the bands round the stage with it)
      this.root.classList.add("t-leaving"); // (taps go to the game now)
      CQ.screen.shade("title", false);
      await CQ.anim(this.root, [{ opacity: 1 }, { opacity: 0 }], { duration: 520, easing: CQ.EASE.inOut, essential: true });
      this.close();
    },
    // The absorb (see go). Resolves once the screen is dark.
    absorb() {
      const root = this.root;
      const b = this.startBtn;
      const P = this.playPoint();
      const anims = (this.absorbAnims = []);
      const run = (el, kf, o) => {
        const a = el.animate(kf, Object.assign({ fill: "both", easing: "linear" }, o));
        anims.push(a);
        return a;
      };
      // under the button: the dark coming in, the glow it gathers, the rings closing in; over it: what it
      // draws in, and its last glint
      const under = CQ.el("div", "t-absorb");
      const over = CQ.el("div", "t-absorb over");
      root.insertBefore(under, b);
      b.after(over);
      this.absorbLayers = [under, over];
      clearInterval(this.sparkle); // (the crown's glints stop)
      // the dark it ends in, the game's own dark colour (with Reduced motion the title only fades into
      // it, button and all); the bands round the stage go as dark as the stage, step by step
      const dusk = CQ.el("div", "t-dusk", CQ.motion.reduced ? over : null);
      if (CQ.motion.reduced) {
        CQ.screen.shade("title", 4);
        return run(dusk, [{ opacity: 0 }, { opacity: 1 }], { duration: 350, easing: "ease-in-out" }).finished;
      }
      CQ.screen.shade("title", 1);
      this.timers.push(setTimeout(() => this.absorbLayers && CQ.screen.shade("title", 4), TL.dusk));
      const lite = document.documentElement.classList.contains("lite");
      // the dark comes in from the edges, a soft hole round the button closing in on it (the hole's edge
      // is 60 px out per unit of scale: from past the farthest corner to just round the button)
      const drain = CQ.box(CQ.el("div", "t-drain", under), P.x - 300, P.y - 300, 600, 600);
      run(drain, [{ transform: "scale(23)" }, { transform: "scale(3.4)" }], { duration: TL.drain, easing: "cubic-bezier(.4,0,.25,1)" });
      under.appendChild(dusk);
      const dark = run(dusk, [{ opacity: 0 }, { opacity: 1 }], { delay: TL.dusk, duration: TL.duskFor, easing: "ease-in-out" });
      // the glow the button gathers as it springs up, which goes into it with it
      const halo = CQ.pos(CQ.el("div", "t-halo", under), P.x, P.y);
      run(halo, [
        { transform: "scale(.5)", opacity: 0, easing: "cubic-bezier(.3,.8,.4,1)" },
        { transform: "scale(1)", opacity: 1, offset: 0.26 },
        { transform: "scale(1.02)", opacity: 1, offset: 0.29, easing: "cubic-bezier(.55,.085,.68,.53)" },
        { transform: "scale(.06)", opacity: 0.95, offset: 0.85 },
        { transform: "scale(0)", opacity: 0 },
      ], { duration: TL.gone / 0.85 });
      // rings of light closing in on it, one after another
      [140, 300, 460].forEach((d) => {
        const r = CQ.pos(CQ.el("div", "t-suck", under), P.x, P.y);
        run(r, [
          { transform: "scale(2.3)", opacity: 0 },
          { transform: "scale(1.5)", opacity: 0.85, offset: 0.35 },
          { transform: "scale(.22)", opacity: 0 },
        ], { delay: d, duration: 520, easing: "cubic-bezier(.55,.085,.68,.53)" });
      });
      // the button: up (glowing), a little wind back, then it spins away into its own centre, faster and
      // faster (it shrinks; its picture turns, so its shadow stays below it: styles.css)
      const up = TL.up / TL.gone;
      const wind = TL.wind / TL.gone;
      const spin = run(b, [
        { transform: `scale(${scaleOf(b)})`, easing: "cubic-bezier(.3,.8,.4,1)" },
        { transform: "scale(1.13)", offset: up, easing: "ease-in-out" },
        { transform: "scale(1.06)", offset: wind, easing: "cubic-bezier(.55,.085,.68,.53)" },
        { transform: "scale(0)" },
      ], { duration: TL.gone });
      run(b.firstChild, [
        { transform: "rotate(0deg)" },
        { transform: "rotate(0deg)", offset: up, easing: "ease-in-out" },
        { transform: "rotate(-10deg)", offset: wind, easing: "cubic-bezier(.55,.055,.675,.19)" },
        { transform: "rotate(360deg)" },
      ], { duration: TL.gone });
      run(b, [{ opacity: 1 }, { opacity: 1, offset: 0.93 }, { opacity: 0 }], { duration: TL.gone });
      // its sound keeps in step with the button (an animation can begin a frame or two after it is made,
      // so the sound begins with it, from as far as it has got), and the "gulp" comes as it has gone
      spin.ready.then(() => CQ.audio.play("title.absorb", { volume: 0.9, ago: Math.max(0, spin.currentTime || 0) / 1000 }), () => {});
      // the light of the scene drawn into it: golden motes from all round it, and a few leaves from the
      // jungle above, spiralling in faster and faster (each starts inside the stage, where it is seen)
      const edge = (a) => {
        const c = Math.cos(a);
        const sn = Math.sin(a);
        const tx = c > 1e-6 ? (CQ.W - P.x) / c : c < -1e-6 ? -P.x / c : Infinity;
        const ty = sn > 1e-6 ? (CQ.H - P.y) / sn : sn < -1e-6 ? -P.y / sn : Infinity;
        return Math.min(tx, ty);
      };
      // (a mote is a streak of light pointing the way it goes, longer the faster it goes; a leaf tumbles)
      const N = 12;
      const spiral = (cls, o) => {
        const el = CQ.pos(CQ.el("div", cls, over), P.x, P.y);
        const pts = [];
        for (let i = 0; i <= N; i++) {
          const u = i / N;
          const r = o.r * (1 - Math.pow(u, 2.2));
          const a = o.a + o.sweep * u * u;
          pts.push({ u, x: r * Math.cos(a), y: r * Math.sin(a) });
        }
        const step = pts.map((p, i) => {
          const next = pts[Math.min(i + 1, N)];
          const prev = pts[Math.max(i - 1, 0)];
          return { dx: next.x - prev.x, dy: next.y - prev.y, v: Math.hypot(next.x - prev.x, next.y - prev.y) };
        });
        const vmax = Math.max(...step.map((s) => s.v)) || 1;
        let turn = 0;
        const kf = pts.map((p, i) => {
          const k = o.size * (1 - 0.7 * Math.pow(p.u, 1.5));
          let shape;
          if (o.spin != null) shape = `rotate(${(o.spin * p.u * p.u).toFixed(1)}deg) scale(${k.toFixed(3)})`;
          else {
            const d = (Math.atan2(step[i].dy, step[i].dx) * 180) / Math.PI;
            turn = i ? turn + ((((d - turn) % 360) + 540) % 360) - 180 : d; // (the shorter way round)
            const sp = step[i].v / vmax;
            shape = `rotate(${turn.toFixed(1)}deg) scale(${(k * (1 + 1.6 * sp)).toFixed(3)}, ${(k * (1 - 0.25 * sp)).toFixed(3)})`;
          }
          return {
            transform: `translate(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px) ${shape}`,
            opacity: Math.max(0, Math.min(1, p.u / 0.15, (1 - p.u) / 0.08)),
          };
        });
        const delay = CQ.rand(0, o.spin != null ? 160 : 220);
        run(el, kf, { delay, duration: CQ.rand(640, 830) - delay });
      };
      const motes = lite ? 10 : 18;
      for (let i = 0; i < motes; i++) {
        const a = -Math.PI / 2 + (i * 2 * Math.PI) / motes + CQ.rand(-0.2, 0.2);
        spiral("t-mote", { a, r: CQ.clamp(CQ.rand(300, 660), 110, edge(a) - 20), sweep: CQ.rand(1.2, 2), size: CQ.rand(0.75, 1.25) });
      }
      const leaves = lite ? 3 : 6;
      for (let i = 0; i < leaves; i++) {
        const a = -Math.PI + ((i + 0.5) * Math.PI) / leaves + CQ.rand(-0.15, 0.15);
        spiral("t-leaf", { a, r: Math.min(CQ.rand(560, 860), edge(a) + 30), sweep: CQ.rand(1, 1.6), size: CQ.rand(1.1, 1.5), spin: CQ.pick([-1, 1]) * CQ.rand(300, 600) });
      }
      // its last glint, as it closes
      const wink = CQ.pos(CQ.el("div", "t-wink", over), P.x, P.y);
      run(wink, [
        { transform: "scale(0) rotate(0deg)", opacity: 0, easing: "cubic-bezier(.3,.8,.4,1)" },
        { transform: "scale(1.25) rotate(45deg)", opacity: 1, offset: 0.35, easing: "cubic-bezier(.55,.085,.68,.53)" },
        { transform: "scale(0) rotate(110deg)", opacity: 0 },
      ], { delay: TL.wink, duration: 460 });
      return dark.finished;
    },
    // the middle of the play button's wooden disc, on the stage
    playPoint() {
      const pw = PLAY_AT.w;
      const ph = (pw * IMAGES.startButton.h) / IMAGES.startButton.w;
      return { x: PLAY_AT.x - pw / 2 + pw * DISC.x, y: PLAY_AT.y - ph / 2 + ph * DISC.y };
    },
    // The title is gone: everything of it stops (its timers, the crown's glints, the absorb).
    close() {
      this.gen++;
      this.timers.forEach(clearTimeout);
      clearInterval(this.sparkle);
      this.root.classList.add("hidden");
      (this.absorbAnims || []).forEach((a) => a.cancel());
      (this.absorbLayers || []).forEach((l) => l.remove());
      this.absorbAnims = this.absorbLayers = null;
      CQ.screen.shade("title", false);
    },
  };
  // how big an element is drawn now (its transform's scale, as its animation has it at this moment)
  function scaleOf(el) {
    const m = getComputedStyle(el).transform;
    const v = m && m !== "none" ? m.replace(/^[^(]*\(|\)$/g, "").split(",").map(parseFloat) : null;
    if (!v) return 1;
    return Math.hypot(v[0], v[1], v.length === 16 ? v[2] : 0) || 1;
  }

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
    // (CQ.ready), and Play waits for them if it has to.
    const first = Object.keys(IMAGES).filter((k) => /^t[A-Z]/.test(k)).map((k) => IMAGES[k].src).concat(IMAGES.startButton.src, IMAGES.coin.src);
    const rest = [].concat(
      Object.values(window.IMAGES).map((i) => i.src),
      Object.values(window.SPRITES).map((s) => s.src)
    ).filter((u, i, all) => !first.includes(u) && all.indexOf(u) === i);
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
    // Straight into the start screen and its opening, out of the dark of the loading screen (asked
    // 2026-11-15: "fir load screen come then start screen come please fix this"; there used to be a screen
    // with only a play button in between, which a tap had to start the opening's sound). Most browsers only
    // let sound start after a tap: where they let it start now, the opening has its sounds; otherwise it
    // plays without them, and the sound begins with the first tap, the play button's. (In a tab opened in
    // the background, the opening waits until the tab is shown.)
    const begin = () => {
      if (soundAllowed()) CQ.audio.init();
      open();
      CQ.title.play();
    };
    if (!document.hidden) return begin();
    const shown = () => {
      if (document.hidden) return;
      document.removeEventListener("visibilitychange", shown);
      begin();
    };
    document.addEventListener("visibilitychange", shown);
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
