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

  CQ.title = {
    // Only the start-screen artwork and the play button: no words on screen.
    // The play button always starts the game afresh from the intro (a chapter link like #L5 starts at
    // that chapter instead). Saved progress and the "first time" hints are reset; settings are kept.
    build(root) {
      this.root = root;
      root.innerHTML = "";
      root.setAttribute("aria-label", C().title.name);
      CQ.img("startScreen", "title-bg", root);
      document.documentElement.classList.add("on-title"); // the bands round the stage show the title art
      this.startBtn = CQ.button(
        "start-btn",
        `<img src="${IMAGES.startButton.src}" alt="" draggable="false">`,
        C().title.start, // read by screen readers only
        root,
        () => this.go(linkCp() || "intro", { reset: true })
      );
      this.sparkle = setInterval(() => CQ.fx.sparkle(root, 1648, 640, 3, 100), 1300); // the crown glints
    },
    // While the rest of the pictures load behind the title, a slim golden bar at its foot fills up.
    progress(p) {
      if (!this.root) return;
      if (!this.bar) this.bar = CQ.el("div", "title-load", this.root, '<div class="tl-fill"></div>');
      this.bar.firstChild.style.width = Math.round(p * 100) + "%";
      this.bar.classList.toggle("done", p >= 1);
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
      CQ.anim(this.startBtn, [{ transform: "translate(-50%,-50%) scale(1)" }, { transform: "translate(-50%,-50%) scale(.85, 1.1)" }, { transform: "translate(-50%,-50%) scale(1.1, .9)" }], {
        duration: 260,
        essential: true,
      });
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
      this.root.classList.add("hidden");
      document.documentElement.classList.remove("on-title"); // ...and from now on the game's jungle
      clearInterval(this.sparkle);
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
    // First only what the title screen shows, so it appears quickly even on a slow connection; the
    // rest of the pictures load behind the title (CQ.ready), and Play waits for them if it has to.
    const first = [IMAGES.startScreen.src, IMAGES.startButton.src, IMAGES.coin.src];
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
            document.fonts.load('italic 700 40px "Noto Serif"'),
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
    loading.classList.add("done");
    setTimeout(() => loading.remove(), 600);
    CQ.ready = CQ.preload(rest, (p) => CQ.title.progress(p)).then(() => (CQ.ready = null));
    if (params.get("autostart")) CQ.title.go(linkCp() || "intro"); // for automated tests (no sound until a tap)
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
