/*
 * Zippy's Crown Quest: boot + title screen.
 * Chapter links (handy for teachers): index.html#L5 makes Start begin at that checkpoint
 * (intro, L1–L3, L4a, L4c, L4e, L4g, L5–L8, finale). ?cp=L5 does the same when opened locally.
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
    build(root) {
      const t = C().title;
      this.root = root;
      root.innerHTML = "";
      CQ.img("startScreen", "title-bg", root);
      const vines = CQ.el("div", "title-vines", root);
      [
        { k: "vineC", x: 900, y: -300, s: 0.66 },
        { k: "vineD", x: 1700, y: -330, s: 0.8 },
      ].forEach((v, i) => {
        const im = IMAGES[v.k];
        const w = CQ.el("div", "vine-deco", vines);
        CQ.box(w, v.x, v.y, im.w * v.s, im.h * v.s);
        w.style.animationDelay = -i * 1.4 + "s";
        CQ.img(v.k, "", w);
      });
      const gold = (txt) => `<span class="gold" data-t="${txt}">${txt}</span>`;
      this.logo = CQ.el(
        "div",
        "logo",
        root,
        `<div class="logo-line l1">${gold("Zippy's")}</div><div class="logo-line l2">${gold("Crown")} <span class="q-wrap">${gold("Quest")}<img class="logo-crown" src="${IMAGES.crown.src}" alt=""></span></div><div class="logo-sub">${t.subtitle}</div>`
      );
      this.logo.setAttribute("role", "heading");
      this.logo.setAttribute("aria-level", "1");
      this.logo.setAttribute("aria-label", t.name);
      CQ.el("div", "title-tag", root, t.tagline);
      // A returning child: the big button continues, a smaller one starts again from the intro.
      const prog = CQ.store.get("progress", null);
      const resume = prog && prog.cp && prog.cp !== "intro" && CQ.flow.ORDER.includes(prog.cp) && !linkCp() ? prog.cp : null;
      const label = resume ? t.continue : t.tap;
      this.startBtn = CQ.button(
        "start-btn",
        `<img src="${IMAGES.startButton.src}" alt="" draggable="false"><span class="plank">${label}</span>`,
        label,
        root,
        () => this.go(resume || linkCp() || "intro")
      );
      if (resume) {
        CQ.button("btn-wood restart-game-btn", `${CQ.ICON.restart}<span>${t.newGame}</span>`, t.newGame, root, () => this.go("intro"));
      }
      this.sparkle = setInterval(() => CQ.fx.sparkle(root, 1648, 640, 3, 100), 1300);
    },
    async go(cp) {
      if (this.going) return;
      this.going = true;
      CQ.audio.init();
      CQ.settings.apply();
      CQ.audio.play("name.burst");
      CQ.anim(this.startBtn, [{ transform: "translate(-50%,-50%) scale(1)" }, { transform: "translate(-50%,-50%) scale(.85, 1.1)" }, { transform: "translate(-50%,-50%) scale(1.1, .9)" }], {
        duration: 260,
        essential: true,
      });
      await CQ.sleep(240);
      CQ.audio.play("ui.swoosh");
      await CQ.anim(this.root, [{ clipPath: "circle(150% at 50% 84%)" }, { clipPath: "circle(0% at 50% 84%)" }], {
        duration: 850,
        easing: CQ.EASE.in,
        essential: true,
      });
      this.root.classList.add("hidden");
      clearInterval(this.sparkle);
      CQ.flow.goto(cp);
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
    const urls = [].concat(
      Object.values(window.IMAGES).map((i) => i.src),
      Object.values(window.SPRITES).map((s) => s.src)
    );
    await CQ.preload(urls, (p) => (fill.style.width = Math.round(p * 100) + "%"));
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
    if (params.get("autostart")) CQ.title.go(linkCp() || "intro"); // for automated tests (no sound until a tap)
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
