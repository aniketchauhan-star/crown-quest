/*
 * Zippy's Crown Quest: the story.
 * Checkpoints, save/continue, chapter jumps, and the script for the intro, every level and the finale.
 */
(function () {
  "use strict";
  const CQ = window.CQ;
  const C = () => window.CONTENT;
  const LV = () => C().levels;
  const R = CQ.run;
  const say = (id, o) => CQ.say(id, o);
  const sum = (a) => (a || []).reduce((x, y) => x + y, 0);

  const ORDER = ["intro", "L1", "L2", "L3", "L4a", "L4c", "L4e", "L4g", "L5", "L6", "L7", "L8", "finale"];
  const CROWNS_AT = { intro: 0, L1: 0, L2: 1, L3: 2, L4a: 3, L4c: 3, L4e: 3, L4g: 3, L5: 4, L6: 5, L7: 6, L8: 7, finale: 8 };
  const LEVEL_OF = { intro: 1, L1: 1, L2: 2, L3: 3, L4a: 4, L4c: 4, L4e: 4, L4g: 4, L5: 5, L6: 6, L7: 7, L8: 8, finale: 8 };
  const SCENE_OF = { intro: "L1", L1: "L1", L2: "L2", L3: "L3", L4a: "L4", L4c: "L4", L4e: "L4", L4g: "L4", L5: "L5", L6: "L6", L7: "L7", L8: "L8", finale: "L8" };
  const WORD_ORDER = ["variable", "constant", "expression", "equation", "lhs", "rhs", "linear", "solution"];
  const WORDS_AT = { L4c: 6, L4e: 7, L4g: 7, L5: 8, L6: 8, L7: 8, L8: 8, finale: 8 };

  CQ.gen = 0;

  CQ.flow = {
    started: false,
    current: null,
    async goto(cp) {
      if (!ORDER.includes(cp)) cp = "intro";
      CQ.run.restart();
      this.started = true;
      let start = ORDER.indexOf(cp);
      try {
        for (let i = start; i < ORDER.length; i++) {
          const id = ORDER[i];
          this.current = id;
          CQ.store.set("progress", { cp: id });
          resetScene(id);
          const res = await STEPS[id]();
          if (res === "again") {
            setTimeout(() => this.goto("intro"), 0);
            return;
          }
        }
      } catch (e) {
        if (!(e instanceof CQ.CancelError)) console.error(e);
      }
    },
    skipIntro() {
      CQ.audio.stopSpeech();
      this.goto("L1");
    },
    async askRestart() {
      if (!this.current) return;
      const ok = await CQ.confirm(C().ui.restartQ);
      if (ok) this.goto(this.current);
    },
  };

  // ------------------------------------------------------------------ scene reset for a checkpoint
  function resetScene(cp) {
    CQ.gen++;
    CQ.stopTweens();
    CQ.audio.stopSpeech();
    CQ.ui.reset();
    CQ.notebook.hideNow();
    document.querySelectorAll(".activity").forEach((e) => e.remove());
    CQ.world.drag.querySelectorAll(".wlabel, .ledge, .ledge-bar, .flyer, .melt-coin").forEach((e) => e.remove());
    CQ.camera.set(960, 540, 1);
    CQ.world.dark.style.opacity = 0;
    CQ.torches.set(true);
    CQ.Give.disable();
    CQ.Give.busy = false;
    CQ.dropRing.hide();
    CQ.zippy.reset();
    CQ.grumble.snoreVol = 1;
    CQ.grumble.squash.style.transform = "";
    CQ.grumble.sleep();
    CQ.hud.setCrowns(CROWNS_AT[cp] || 0);
    CQ.hud.setLevel(LEVEL_OF[cp] || 1);
    CQ.gems.set(WORD_ORDER.slice(0, WORDS_AT[cp] || 0));
    const intro = cp === "intro";
    CQ.hud.show(!intro);
    CQ.next.show(!intro);
    CQ.next.idle();
    CQ.audio.music(intro ? "title" : "game");
    CQ.audio.ambience(true);
    const lv = LV()[SCENE_OF[cp]];
    CQ.balance.setup(lv);
    CQ.bars.setup(lv.bars);
    CQ.bars.setVisible(!["L4a", "L4c", "L4e", "L8"].includes(cp));
    if (["L4c", "L4e", "L4g"].includes(cp)) CQ.balance.setSign("x + 2 = 7");
    if (cp === "finale") {
      CQ.balance.setPan("left", [
        { type: "bar", value: 15, slot: "main" },
        { type: "bar", value: 8, slot: "extra" },
      ]);
      CQ.balance.evaluate({ instant: true });
      CQ.balance.setSign("x = 15");
    }
  }

  // ------------------------------------------------------------------ small helpers
  function worldLabel(html, x, y, cls) {
    const e = CQ.el("div", "wlabel " + (cls || ""), CQ.world.drag, html);
    CQ.pos(e, x, y);
    CQ.anim(e, [{ transform: "translate(-50%,-50%) scale(.2)", opacity: 0 }, { transform: "translate(-50%,-50%) scale(1)", opacity: 1 }], {
      duration: 420,
      easing: CQ.EASE.back,
    });
    CQ.audio.play("ui.pop");
    return e;
  }
  function removeLabel(e) {
    if (!e) return;
    CQ.anim(e, [{ opacity: 1 }, { opacity: 0 }], { duration: 250 }).then(() => e.remove());
  }
  // New crown appears on the balance with a sparkle poof.
  function poof() {
    const b = CQ.balance;
    ["left", "right"].forEach((s) => {
      const p = b.panCenter(s);
      CQ.fx.sparkle(CQ.world.fx, p.x, p.y - 40, 10, 110);
      CQ.fx.dust(CQ.world.fx, p.x, p.y + 20, 6);
      b.items[s].forEach((it, i) =>
        CQ.anim(it.el, [{ transform: "scale(0) translateY(30px)", opacity: 0 }, { transform: "scale(1) translateY(0)", opacity: 1 }], {
          duration: 420,
          delay: 120 + i * 40,
          easing: CQ.EASE.back,
          keep: false,
        })
      );
    });
    CQ.audio.play("dust.puff");
    CQ.audio.play("crown.sparkle");
  }
  function glowCrown(on) {
    CQ.balance.glowItems("left", (it) => it.type === "crown", on);
  }
  // Hint: hand drags from a bar to Zippy.
  function demoGive(v) {
    const from = CQ.camera.toScreen(CQ.bars.center(v));
    const to = CQ.camera.toScreen(CQ.zippy.holdPoint("zippy_hold"));
    CQ.hand.drag(from, to, 2);
  }
  // The child gives one of `values` to Zippy. Resolves with the value once he has caught it.
  function giveBar(values, opts) {
    opts = opts || {};
    CQ.balance.counting = true; // coins can be tapped to count them while the child decides
    if (opts.glow) values.forEach((v) => CQ.bars.glow(v, true));
    CQ.idle.arm(() => {
      const v = values.find((x) => CQ.bars.get(x) && CQ.bars.get(x).state === "idle");
      if (v != null) demoGive(v);
      if (opts.idleLine) CQ.caption.replay();
    }, 8000);
    return R.when(
      new Promise((res) =>
        CQ.Give.enable(values, (v) => {
          CQ.Give.disable();
          CQ.bars.clearGlow();
          CQ.idle.disarm();
          res(v);
        })
      )
    );
  }
  // The child gives a bar to Zippy, then taps SWAP (they may change bars before tapping).
  function giveThenSwap(values) {
    let firstSwap = !CQ.store.get("swapDemoSeen", false);
    CQ.idle.arm(() => {
      if (CQ.zippy.held && CQ.zippy.held.type === "bar") CQ.hand.tapAt(CQ.centerOf(CQ.swapBtn.el));
      else {
        const v = values.find((x) => CQ.bars.get(x) && CQ.bars.get(x).state === "idle");
        if (v != null) demoGive(v);
      }
      CQ.caption.replay();
    }, 8000);
    return R.when(
      new Promise((res) => {
        CQ.Give.enable(values, () => {
          CQ.swapBtn.show(() => {
            CQ.Give.disable();
            CQ.idle.disarm();
            res(CQ.zippy.held.value);
          });
          if (firstSwap) {
            firstSwap = false;
            CQ.store.set("swapDemoSeen", true);
            say("swap-tap-swap", { advance: "none" });
            setTimeout(() => CQ.hand.tapAt(CQ.centerOf(CQ.swapBtn.el)), 500);
          }
        });
      })
    );
  }
  async function tossTried(v) {
    const z = CQ.zippy;
    const bar = CQ.bars.get(v);
    z.setHeld(null);
    z.pose("idle");
    if (bar) await R.when(CQ.Give.tossBack(bar, { tried: true }));
  }

  // ------------------------------------------------------------------ the swap (simultaneous exchange)
  async function swapOnPan(v) {
    const z = CQ.zippy;
    const b = CQ.balance;
    CQ.hand.stop();
    CQ.idle.disarm();
    CQ.caption.hide();
    const crown = b.find("left", (it) => it.type === "crown");
    const target = b.itemCenter(crown);
    z.pose("reach");
    CQ.audio.play("zippy.whee", { volume: 0.6 });
    await R.when(z.swingTo({ x: target.x, y: target.y - 6 }, 700));
    z.pose("grab");
    const hand = z.holdPoint();
    z.setHeld(null);
    crown.el.style.visibility = "hidden";
    CQ.audio.play("bar.place");
    await R.when(
      Promise.all([
        CQ.fly(CQ.world.drag, CQ.barFlyer(v, CQ.L.PAN_BAR_W), hand, target, { duration: 300, arc: -26 }),
        CQ.fly(CQ.world.drag, CQ.crownFlyer(), target, hand, { duration: 300, arc: -26 }),
      ])
    );
    b.removeItem(crown);
    const barItem = b.addItem("left", { type: "bar", value: v, slot: "main" }, 0);
    z.setHeld({ type: "crown" });
    const d = b.evaluate();
    CQ.track("answer", { level: CQ.flow.current, swap: v, correct: d === 0 });
    // Zippy hops back so the child can see the bar on the pan while the balance reacts.
    z.pose(d === 0 ? "hold" : "shock");
    if (d !== 0) CQ.audio.play("zippy.eek");
    await R.when(z.home(d === 0 ? 650 : 380));
    return { d, barItem };
  }
  // Equal masses: celebration.
  async function celebrate(lineId, vars) {
    const z = CQ.zippy;
    const b = CQ.balance;
    const g = CQ.grumble;
    b.wobble();
    CQ.audio.play("balance.level");
    b.flashEmblem();
    await R.wait(450);
    z.pose("hold");
    const hp = z.holdPoint();
    CQ.fx.sparkle(CQ.world.fx, hp.x, hp.y, 12, 80);
    CQ.audio.play("correct");
    await R.wait(400);
    await R.when(CQ.hud.flyCrown(hp));
    z.setHeld(null);
    g.snoreVol = 1.8;
    setTimeout(() => (g.snoreVol = 1), 4500);
    z.pose("laugh");
    CQ.audio.play("zippy.laugh");
    CQ.fx.confetti(CQ.world.fx, 700, 420, 44);
    CQ.audio.play("confetti");
    await R.when(z.say(C().zippy.sleepTight, { keepPose: true }));
    z.pose("idle");
    CQ.track("level_complete", { level: CQ.hud.crowns });
    if (lineId) await say(lineId, { vars });
  }
  // Unequal masses: Grumble wakes, Zippy swaps back, hides, and Grumble goes back to sleep.
  async function wakeAndUndo(v, barItem) {
    const z = CQ.zippy;
    const b = CQ.balance;
    const gen = CQ.gen;
    await R.when(
      CQ.grumble.wakeUp({
        onRoar: () => z.pose("nervous"),
        afterRoar: async () => {
          if (gen !== CQ.gen) return;
          // quick! swap the crown back
          z.pose("reach");
          await z.swingTo(b.itemCenter(barItem), 380);
          if (gen !== CQ.gen) return;
          z.pose("grab");
          const slot = b.itemCenter(barItem);
          const hand = z.holdPoint();
          z.setHeld(null);
          barItem.el.style.visibility = "hidden";
          await Promise.all([
            CQ.fly(CQ.world.drag, CQ.crownFlyer(), hand, slot, { duration: 260, arc: -20 }),
            CQ.fly(CQ.world.drag, CQ.barFlyer(v, CQ.L.PAN_BAR_W), slot, hand, { duration: 260, arc: -20 }),
          ]);
          if (gen !== CQ.gen) return;
          b.removeItem(barItem);
          b.addItem("left", { type: "crown" }, 0);
          z.setHeld({ type: "bar", value: v });
          b.evaluate();
          // ...and hide up the vine while Grumble looks around
          z.pose("hide");
          await z.moveTo(6, z.baseLen - 80, 420, CQ.ease.out);
        },
      })
    );
    z.pose("phew");
    CQ.audio.play("zippy.phew");
    z.home(500);
    await R.when(z.say(C().zippy.phew, { keepPose: true }));
  }

  // ------------------------------------------------------------------ INTRO
  async function runIntro() {
    const z = CQ.zippy;
    const g = CQ.grumble;
    const b = CQ.balance;
    CQ.ui.skip.classList.remove("hidden");
    z.setVisible(false);
    CQ.torches.set(false);
    CQ.world.dark.style.opacity = 0.92;
    CQ.camera.set(250, 760, 1.8);
    g.snoreVol = 1.6;
    await R.wait(900);
    await CQ.torches.lightUp();
    CQ.world.darkness(0, 1000);
    await R.wait(500);
    const gb = CQ.nameBurst(C().names.grumble, C().names.grumbleTag, 1250, 400, "purple");
    await say("intro-1", { advance: "auto" });
    g.snoreVol = 2.2;
    CQ.world.decor.classList.add("rustle");
    await say("intro-2", { advance: "auto" });
    CQ.world.decor.classList.remove("rustle");
    await CQ.hideBurst(gb);
    g.snoreVol = 1.1;
    await R.when(CQ.camera.to(560, 380, 1.3, 1300));
    const drop = z.dropIn();
    await R.wait(650);
    CQ.spot.on(() => z.center(), 270);
    await R.when(drop);
    const zp = CQ.camera.toScreen(z.center());
    const zb = CQ.nameBurst(C().names.zippy, C().names.zippyTag, zp.x + 640, zp.y - 110, "orange");
    z.pose("celebrate");
    CQ.audio.play("zippy.giggle");
    await say("intro-3", { advance: "auto", pause: 900 });
    z.pose("idle");
    CQ.hideBurst(zb);
    CQ.spot.off();
    await R.when(CQ.camera.to(960, 540, 1, 1300));
    g.snoreVol = 1;
    // the crown glints
    const crown = b.find("left", (it) => it.type === "crown");
    const cc = b.itemCenter(crown);
    crown.el.classList.add("glint");
    CQ.fx.sparkle(CQ.world.fx, cc.x, cc.y, 14, 80);
    CQ.audio.play("crown.sparkle");
    z.pose("curious");
    await R.when(z.say(C().zippy.ooh, { keepPose: true }));
    await say("intro-4", { advance: "auto" });
    crown.el.classList.remove("glint");
    z.pose("idle");
    // thought bubble: what happens if the balance tips
    CQ.audio.play("zippy.gulp");
    // above the real balance, so the crown on the left pan stays in view
    const th = CQ.thought({ x: z.center().x + 380, y: z.center().y - 40 }, miniTipScene(), { w: 500, h: 330 });
    const miniG = new CQ.Sprite(th.querySelector(".ms-grumble"), "", 0.3);
    miniG.show("grumble_roar", 7);
    setTimeout(() => th.classList.add("tip"), 900);
    setTimeout(() => {
      if (th.isConnected) CQ.audio.play("grumble.roar", { volume: 0.35 });
    }, 1500);
    await say("intro-5", { advance: "auto", pause: 900 });
    await CQ.hideThought(th);
    // arrows crown ⇄ bar
    const bar = CQ.bars.list[0];
    const arrow = swapArrow(cc, { x: bar.home.x, y: bar.home.y - 50 });
    await say("intro-6", { advance: "auto", pause: 700 });
    arrow.remove();
    // one coin pops up: 1 unit
    const coin = b.items.right[b.items.right.length - 1];
    const ccoin = b.itemCenter(coin);
    coin.el.classList.add("demo-pop");
    CQ.audio.play("coin.clink", { index: 3 });
    const unit = worldLabel(C().ui.unit, ccoin.x + 140, ccoin.y - 90, "unit-tag");
    await say("intro-7", { advance: "auto", pause: 600 });
    coin.el.classList.remove("demo-pop");
    removeLabel(unit);
    // the number on a bar is its mass
    for (const bb of CQ.bars.list) {
      CQ.bars.glow(bb.value, true);
      CQ.audio.play("ui.pop");
      await R.wait(380);
      CQ.bars.glow(bb.value, false);
    }
    const three = CQ.bars.get(3) || CQ.bars.list[0];
    const tag = worldLabel(
      `${CQ.fmt(C().ui.coinsTag, { n: three.value })} <span class="mini-coins">${`<img src="${IMAGES.coin.src}" alt="">`.repeat(Math.min(3, three.value))}</span>`,
      three.home.x,
      three.home.y - 110,
      "coins-tag"
    );
    await say("intro-8", { advance: "auto", pause: 700 });
    removeLabel(tag);
    CQ.ui.skip.classList.add("hidden");
  }
  function miniTipScene() {
    return `<div class="mini-scene">${CQ.miniBalanceSVG({ width: 270, left: "bar", right: "coins3" })}<div class="ms-grumble"></div></div>`;
  }
  // Curved double arrow between two world points (drawn in the world drag layer).
  function swapArrow(a, b) {
    const e = CQ.el("div", "wlabel swap-arrow", CQ.world.drag);
    CQ.pos(e, 0, 0);
    e.style.transform = "none";
    const mx = (a.x + b.x) / 2 - 120;
    const my = (a.y + b.y) / 2 + 40;
    e.innerHTML = `<svg width="1920" height="1080" viewBox="0 0 1920 1080"><defs><marker id="ah" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#FFD84D" stroke="#6B3E00" stroke-width="1"/></marker></defs><path class="sa-path" d="M${a.x} ${a.y + 70} Q${mx} ${my} ${b.x - 40} ${b.y}" fill="none" stroke="#FFD84D" stroke-width="12" stroke-linecap="round" marker-start="url(#ah)" marker-end="url(#ah)"/></svg>`;
    CQ.audio.play("ui.swoosh");
    return e;
  }

  // ------------------------------------------------------------------ LEVELS 1–3: the swap
  async function runSwapLevel(key) {
    const L = LV()[key];
    const b = CQ.balance;
    if (key !== "L1") poof();
    b.counting = true;
    for (let i = 0; i < L.intro.length; i++) await say(L.intro[i], { advance: i < L.intro.length - 1 ? "auto" : "none" });
    if (key === "L1") {
      const v = CQ.bars.list[0].value;
      setTimeout(() => demoGive(v), 400);
    }
    let attempts = 0;
    for (;;) {
      const v = await giveThenSwap(L.bars.filter((x) => CQ.bars.get(x).state !== "tried"));
      b.counting = false;
      b.clearCounts();
      const { d, barItem } = await swapOnPan(v);
      if (d === 0) {
        await celebrate("swap-correct", { n: L.crown });
        return;
      }
      await wakeAndUndo(v, barItem);
      await tossTried(v);
      attempts++;
      CQ.track("hint_shown", { level: L.n, tier: attempts >= 2 ? 2 : 1 });
      if (attempts === 1) {
        await say(v < L.crown ? "swap-light" : "swap-heavy", { advance: "auto" });
        say("swap-give", { advance: "none" });
      } else {
        say("swap-hint2", { vars: { n: L.crown }, advance: "none" });
        await R.when(b.autoCount("right"));
        CQ.bars.glow(L.crown, true);
      }
      b.counting = true;
    }
  }

  // ------------------------------------------------------------------ LEVEL 4: the mystery crown
  async function runL4a() {
    const z = CQ.zippy;
    const b = CQ.balance;
    poof();
    z.pose("curious");
    b.glowItems("left", (it) => it.type === "coin", true);
    await say("l4-1");
    b.clearGlow();
    b.glowItems("left");
    b.glowItems("right");
    await say("l4-2");
    b.clearGlow();
    glowCrown(true);
    z.pose("idle");
    await say("l4-3");
    const crown = b.find("left", (it) => it.type === "crown");
    const cc = b.itemCenter(crown);
    const q = worldLabel("?", cc.x, cc.y - 120, "qmark");
    await say("l4-4");
    removeLabel(q);
    glowCrown(false);
    const under = b.ends.left.y + CQ.BAL.PAN_BOTTOM + 56; // just below the left pan
    let lx = worldLabel('<i class="v">x</i>', cc.x, under, "xlabel");
    await say("l4-5");
    removeLabel(lx);
    lx = worldLabel(CQ.rich("x + 2"), b.ends.left.x, under, "xlabel wide");
    b.glowItems("left");
    await say("l4-6");
    b.clearGlow();
    const r7 = worldLabel("7", b.ends.right.x, under, "xlabel seven");
    b.glowItems("right");
    await say("l4-7");
    b.clearGlow();
    // key moment: the scene turns into the equation
    const strip = CQ.el("div", "eq-strip", CQ.ui.layer, `<span class="es a">${CQ.rich("x + 2")}</span><span class="es b">=</span><span class="es c">7</span>`);
    await R.wait(30);
    const slots = ["a", "b", "c"].map((k) => strip.querySelector(".es." + k));
    const targets = slots.map((s) => CQ.centerOf(s));
    const srcs = [CQ.centerOf(lx), CQ.camera.toScreen({ x: CQ.L.BX, y: CQ.L.PIVOT_Y }), CQ.centerOf(r7)];
    const pieces = [CQ.rich("x + 2"), "=", "7"];
    lx.style.opacity = 0;
    r7.style.opacity = 0;
    for (let i = 0; i < 3; i++) {
      const f = CQ.el("div", "piece " + ["a", "b", "c"][i], null, pieces[i]);
      CQ.audio.play("ui.swoosh");
      await R.when(CQ.fly(CQ.ui.layer, f, srcs[i], targets[i], { duration: 650, arc: -140, scaleTo: 1.5 }));
      slots[i].classList.add("in");
      CQ.audio.play("ui.pop");
    }
    lx.remove();
    r7.remove();
    CQ.fx.sparkle(CQ.ui.layer, targets[1].x, targets[1].y, 12, 200);
    CQ.audio.play("correct");
    await say("l4-8");
    await R.when(CQ.anim(strip, [{ opacity: 1 }, { opacity: 0, transform: "translate(-50%,-50%) scale(.4) translateY(-500px)" }], { duration: 600, essential: true }));
    strip.remove();
    b.setSign("x + 2 = 7");
    await R.when(CQ.notebook.open());
    await CQ.notebook.run(CQ.NB_WORDS);
    await R.when(CQ.notebook.close());
  }
  async function runL4c() {
    await CQ.activityLabel();
    await R.when(CQ.notebook.open());
    await CQ.notebook.run(CQ.NB_LINEAR);
    await R.when(CQ.notebook.close());
  }
  async function runL4e() {
    await CQ.activitySort();
    await CQ.activityRecap(Array.from(CQ.gems.have));
  }
  async function runL4g() {
    const z = CQ.zippy;
    const b = CQ.balance;
    const cp = CQ.checkPanel;
    await say("l4-23", { advance: "auto" });
    await say("l4-24");
    // try 4
    CQ.bars.setVisible(true);
    CQ.bars.glow(4, true);
    await say("l4-25", { advance: "auto", pause: 150 });
    say("l4-25-tap", { advance: "none" });
    await giveBar([4], { glow: true });
    CQ.bars.setVisible(false);
    await R.when(cp.show({ a: 2, b: 7 }));
    await R.when(cp.substitute(4, z.holdPoint()));
    await R.when(b.autoCount("left", 4));
    cp.setValue("lhs", 6);
    await R.wait(500);
    cp.setValue("rhs", 7);
    await R.wait(400);
    await R.when(cp.compare(6, 7));
    CQ.grumble.stir();
    await say("l4-26");
    b.clearCounts();
    await R.when(cp.hide());
    CQ.bars.setVisible(true);
    await tossTried(4);
    // try 5
    CQ.bars.glow(5, true);
    await say("l4-27", { advance: "auto", pause: 150 });
    say("l4-27-tap", { advance: "none" });
    await giveBar([5], { glow: true });
    CQ.bars.setVisible(false);
    await R.when(cp.show({ a: 2, b: 7 }));
    await R.when(cp.substitute(5, z.holdPoint()));
    await R.when(b.autoCount("left", 5));
    cp.setValue("lhs", 7);
    await R.wait(500);
    cp.setValue("rhs", 7);
    await R.wait(400);
    await R.when(cp.compare(7, 7));
    await say("l4-28", { advance: "auto" });
    CQ.gems.collect("solution", { x: 1340, y: 420 });
    await say("l4-29");
    b.clearCounts();
    await R.when(cp.hide());
    CQ.bars.setVisible(true);
    // swap with 5 (Zippy is already holding it)
    say("check-now-swap", { advance: "none" });
    await R.when(CQ.swapBtn.wait());
    const { d } = await swapOnPan(5);
    if (d === 0) {
      CQ.zippy.say(C().zippy.thatWorks, { keepPose: true });
      await celebrate("l4-30");
    }
  }

  // ------------------------------------------------------------------ the Check routine (Levels 5–8)
  function chipsFor(L, v) {
    const a = L.leftBar || L.left;
    const bb = L.rightBar || sum(L.right);
    const s = v + a;
    const given = L.chips && L.chips[v];
    return {
      lhs: (given && given.lhs) || CQ.shuffle([s - 1, s, s + 1]),
      rhs: (given && given.rhs) || [a, v, bb].filter((x, i, arr) => arr.indexOf(x) === i).concat(bb + 1).slice(0, 3).sort((x, y) => x - y),
    };
  }
  async function checkRoutine(L, v, opts) {
    opts = opts || {};
    const cp = CQ.checkPanel;
    const z = CQ.zippy;
    const a = L.leftBar || L.left;
    const bb = L.rightBar || sum(L.right);
    const s = v + a;
    CQ.balance.counting = false;
    CQ.balance.clearCounts();
    CQ.bars.setVisible(false);
    await R.when(cp.show({ a, b: bb }));
    // The line is spoken while the number flies into x; both finish before the next instruction.
    let line = null;
    if (opts.introLine) line = say(opts.introLine, { advance: "auto", pause: 0 });
    else if (!opts.auto) line = say(opts.lets ? "check-lets" : "check-replace", { vars: { v }, advance: "auto", pause: 0 });
    await R.when(cp.substitute(v, opts.from || z.holdPoint()));
    if (line) await line;
    if (opts.auto) {
      cp.setValue("lhs", s);
      await R.wait(450);
      cp.setValue("rhs", bb);
    } else {
      const ch = chipsFor(L, v);
      say("check-find", { advance: "none" });
      await cp.fill("lhs", ch.lhs, s, (m) => {
        const seq = [];
        for (let i = 1; i <= a && i <= 8; i++) seq.push(v + i);
        say("hint-lhs", { vars: { v, a, seq: seq.join(", ") }, advance: "none" });
        if (m >= 2 && L.left) CQ.balance.autoCount("left", v).catch(() => {});
      });
      if (opts.rhsGiven) cp.setValue("rhs", bb);
      else await cp.fill("rhs", ch.rhs, bb, () => say("hint-rhs", { advance: "none" }));
    }
    await R.wait(350);
    const eq = await R.when(cp.compare(s, bb));
    CQ.balance.clearCounts();
    if (!eq) {
      CQ.grumble.stir();
      await R.when(z.say(C().zippy.checked));
      if (opts.guided) await say("check-compare", { vars: { s, b: bb }, advance: "auto" });
      await say(opts.guided ? "check-not-guided" : "check-not", { vars: { s, b: bb, v } });
      await R.when(cp.hide());
      CQ.bars.setVisible(true);
      await tossTried(v);
      return false;
    }
    if (opts.equalLine) await say(opts.equalLine);
    else if (opts.auto) {
      await say("check-confirm", { vars: { v, a, b: bb }, advance: "auto" });
      await say("check-solution-short", { vars: { v } });
    } else {
      await say("check-equal", { vars: { b: bb }, advance: "auto" });
      await say("check-solution", { vars: { v } });
    }
    await R.when(cp.hide());
    CQ.bars.setVisible(true);
    return true;
  }
  async function swapAfterCheck(L, v) {
    say("check-now-swap", { advance: "none" });
    CQ.idle.arm(() => CQ.hand.tapAt(CQ.centerOf(CQ.swapBtn.el)), 8000);
    await R.when(CQ.swapBtn.wait());
    CQ.idle.disarm();
    const { d } = await swapOnPan(v);
    if (d === 0) {
      CQ.zippy.say(C().zippy.thatWorks, { keepPose: true });
      await celebrate("crown-is", { v });
    }
  }

  // ------------------------------------------------------------------ LEVEL 5: guided practice
  async function runL5() {
    const L = LV().L5;
    const z = CQ.zippy;
    poof();
    await say(L.intro[0], { advance: "auto" });
    CQ.balance.setSign(`x + ${L.left} = ${sum(L.right)}`);
    await say("check-intro", { advance: "auto" });
    for (const v of L.tries) {
      await R.when(z.say(CQ.fmt(C().zippy.tryN, { v })));
      say("l5-give", { vars: { v }, advance: "none" });
      await giveBar([v], { glow: true, idleLine: true });
      const ok = await checkRoutine(L, v, { guided: true });
      if (ok) return swapAfterCheck(L, v);
    }
  }

  // ------------------------------------------------------------------ LEVELS 6–7: your turn
  async function runIndependent(key) {
    const L = LV()[key];
    poof();
    for (let i = 0; i < L.intro.length; i++) {
      await say(L.intro[i], { advance: "auto" });
      if (i === L.intro.length - 1) CQ.balance.setSign(`x + ${L.left} = ${sum(L.right)}`);
    }
    let misses = 0;
    for (;;) {
      say("choose", { advance: "none" });
      const left = L.bars.filter((x) => CQ.bars.get(x).state !== "tried");
      const v = await giveBar(left, { idleLine: true });
      let ok;
      if (v === L.crown && misses === 0) ok = await checkRoutine(L, v, { auto: true });
      else ok = await checkRoutine(L, v, { lets: v !== L.crown });
      if (ok) return swapAfterCheck(L, v);
      misses++;
      CQ.track("hint_shown", { level: L.n, tier: misses });
      if (L.tips && L.tips[v] && misses >= 2) await say(L.tips[v]);
      await say("check-try-another", { advance: "auto" });
    }
  }

  // ------------------------------------------------------------------ LEVEL 8: the smart way
  async function runL8() {
    const L = LV().L8;
    const z = CQ.zippy;
    const b = CQ.balance;
    const g = CQ.grumble;
    poof();
    b.setSign("x + 8 = 23");
    z.pose("curious");
    await say("l8-1", { advance: "auto" });
    await meltCoins();
    await say("l8-2");
    z.pose("idle");
    const bubbles = await trialThoughts();
    await R.when(z.say(C().zippy.yawn));
    await say("l8-3");
    bubbles.forEach((t) => CQ.hideThought(t));
    z.pose("celebrate");
    CQ.audio.play("zippy.ooh");
    await R.when(z.say(C().zippy.idea, { keepPose: true }));
    await say("l8-4", { advance: "auto" });
    z.pose("idle");
    // 23 splits into 8 + 15
    await splitRight();
    const ledges = makeLedges();
    await say("l8-5", { advance: "auto", pause: 150 });
    say("l8-5-drag", { advance: "none" });
    await dragOff("left", ledges.left, {
      onLift: () => {
        b.evaluate();
        CQ.audio.play("tension");
        g.stirHold();
      },
    });
    await say("l8-uhoh", { advance: "auto" });
    await say("l8-6", { advance: "auto", pause: 150 });
    say("l8-6-drag", { advance: "none" });
    await dragOff("right", ledges.right, {
      onLift: () => {
        b.evaluate();
        b.wobble(4);
        CQ.audio.play("balance.level");
        g.settle();
        z.pose("phew");
        CQ.audio.play("zippy.phew");
      },
    });
    setTimeout(() => z.pose("idle"), 1400);
    // the equation follows the balance
    await R.when(
      CQ.eqBoard.show([`${CQ.rich("x + 8")} <span class="same">− 8</span> = 23 <span class="same">− 8</span>`])
    );
    drawSameArc();
    await say("l8-6", { advance: "next" });
    CQ.eqBoard.addRow(CQ.rich("x + 0 = 15"));
    await R.wait(900);
    CQ.eqBoard.addRow(`<span class="final">${CQ.rich("x = 15")}</span>`);
    CQ.audio.play("correct");
    await say("l8-7");
    await R.when(CQ.eqBoard.hide());
    await putBack(ledges);
    // check it (the number flies out of the crown: the crown is x)
    const crown = b.find("left", (it) => it.type === "crown");
    await checkRoutine(L, 15, { from: b.itemCenter(crown), rhsGiven: true, introLine: "l8-8", equalLine: "l8-9" });
    // the swap: only a checked value gets the SWAP button
    await say("l8-10", { advance: "auto" });
    say("l8-10-give", { advance: "none" });
    for (;;) {
      const v = await giveBar(L.bars.filter((x) => CQ.bars.get(x).state !== "tried"), { idleLine: true });
      if (v !== 15) {
        const okOther = await checkRoutine(L, v, { lets: true });
        if (!okOther) {
          say("l8-10-give", { advance: "none" });
          continue;
        }
      }
      say("check-now-swap", { advance: "none" });
      await R.when(CQ.swapBtn.wait());
      const { d } = await swapOnPan(v);
      if (d === 0) {
        CQ.zippy.say(C().zippy.thatWorks, { keepPose: true });
        b.setSign("x = 15");
        await celebrate("crown-is", { v });
        return;
      }
    }
  }
  async function meltCoins() {
    const b = CQ.balance;
    const bar8 = b.find("left", (it) => it.type === "bar");
    const c = b.itemCenter(bar8);
    const coins = [];
    for (let i = 0; i < 8; i++) {
      const e = CQ.img("coin", "melt-coin", CQ.world.drag);
      const x = c.x - 4 * 52 + 26 + i * 52;
      CQ.pos(e, x, c.y - 170);
      CQ.anim(e, [{ transform: "translate(-50%,-50%) scale(0)" }, { transform: "translate(-50%,-50%) scale(1)" }], { duration: 300, delay: i * 90, easing: CQ.EASE.back });
      coins.push({ e, x });
    }
    for (let i = 0; i < 8; i++) {
      setTimeout(() => CQ.audio.play("coin.clink", { index: i + 1 }), i * 90);
    }
    await R.wait(1300);
    CQ.audio.play("bar.merge");
    await R.when(
      Promise.all(
        coins.map(({ e, x }) =>
          CQ.anim(e, [{ transform: "translate(-50%,-50%) translate(0,0) scale(1)", opacity: 1 }, { transform: `translate(-50%,-50%) translate(${c.x - x}px, 170px) scale(.3)`, opacity: 0 }], {
            duration: 600,
            easing: CQ.EASE.in,
            essential: true,
          }).then(() => e.remove())
        )
      )
    );
    bar8.el.classList.add("glow");
    CQ.fx.sparkle(CQ.world.fx, c.x, c.y, 12, 70);
    setTimeout(() => bar8.el.classList.remove("glow"), 1500);
  }
  async function trialThoughts() {
    const rows = [
      [10, 18],
      [12, 20],
      [14, 22],
    ];
    const out = [];
    for (let i = 0; i < rows.length; i++) {
      const [x, s] = rows[i];
      const t = CQ.thought(
        { x: 620 + i * 330, y: 230 + (i % 2) * 40 },
        `<div class="trial">${CQ.rich("x = " + x)}<br>${CQ.rich(x + " + 8 = " + s)} <span class="xmark">✗</span></div>`,
        { w: 300, h: 190 }
      );
      out.push(t);
      await R.wait(700);
      CQ.audio.play("tryagain");
    }
    const dots = CQ.thought({ x: 1600, y: 250 }, '<div class="trial dots">…</div>', { w: 150, h: 120 });
    out.push(dots);
    return out;
  }
  async function splitRight() {
    const b = CQ.balance;
    const big = b.items.right[0];
    const c = b.itemCenter(big);
    big.el.classList.add("glow", "cracking");
    await R.wait(700);
    CQ.audio.play("bar.crack");
    CQ.fx.sparkle(CQ.world.fx, c.x, c.y, 14, 80);
    b.setPan("right", [
      { type: "bar", value: 8 },
      { type: "bar", value: 15 },
    ]);
    b.items.right.forEach((it) => CQ.anim(it.el, [{ transform: "scale(.6)" }, { transform: "scale(1)" }], { duration: 420, easing: CQ.EASE.back, keep: false }));
    b.evaluate();
    const tag = worldLabel(CQ.rich("23 = 8 + 15"), c.x, c.y - 140, "split-tag");
    setTimeout(() => removeLabel(tag), 5200);
  }
  function makeLedges() {
    const mk = (x, side) => {
      const l = CQ.el("div", "ledge " + side, CQ.world.drag, `<span>${C().ui.takenOff}</span>`);
      CQ.pos(l, x, 985);
      return l;
    };
    return { left: mk(520, "left"), right: mk(1560, "right") };
  }
  // The child drags the 8 bar off a pan onto its ledge.
  function dragOff(side, ledge, hooks) {
    const b = CQ.balance;
    const it = b.items[side].find((x) => x.type === "bar" && x.value === 8);
    it.el.classList.add("draggable", "glow");
    ledge.classList.add("active");
    const ledgePt = { x: parseFloat(ledge.style.left), y: parseFloat(ledge.style.top) - 30 };
    CQ.idle.arm(() => CQ.hand.drag(CQ.camera.toScreen(b.itemCenter(it)), CQ.camera.toScreen(ledgePt), 1), 7000);
    setTimeout(() => CQ.hand.drag(CQ.camera.toScreen(b.itemCenter(it)), CQ.camera.toScreen(ledgePt), 1), 600);
    return R.when(
      new Promise((res) => {
        let proxy = null;
        let lifted = false;
        let grab = null;
        let done = false;
        const lift = (pt) => {
          const c = b.itemCenter(it);
          grab = pt ? { dx: c.x - pt.x, dy: c.y - pt.y } : { dx: 0, dy: 0 };
          proxy = CQ.barFlyer(8, CQ.L.PAN_BAR_W);
          proxy.classList.add("glow");
          CQ.world.drag.appendChild(proxy);
          proxy.classList.add("flyer");
          CQ.pos(proxy, c.x, c.y);
          proxy.style.transform = "translate(-50%,-50%)";
          // Take the bar's mass off the pan, but keep its (invisible) element in the page until it is
          // dropped: it owns the pointer capture, and removing it would end the drag.
          const list = b.items[side];
          list.splice(list.indexOf(it), 1);
          it.el.style.opacity = "0";
          b.layout(side);
          lifted = true;
          CQ.audio.play("bar.pick");
          CQ.hand.stop();
          if (hooks.onLift) hooks.onLift();
        };
        const place = () => {
          if (done) return;
          done = true;
          it.el.remove();
          CQ.idle.disarm();
          ledge.classList.remove("active");
          const from = { x: parseFloat(proxy.style.left), y: parseFloat(proxy.style.top) };
          proxy.remove();
          const fl = CQ.barFlyer(8, CQ.L.PAN_BAR_W);
          CQ.fly(CQ.world.drag, fl, from, ledgePt, { duration: 300, arc: -40, remove: false }).then(() => {
            fl.classList.remove("flyer");
            fl.classList.add("ledge-bar");
            CQ.pos(fl, ledgePt.x, ledgePt.y);
            fl.style.transform = "translate(-50%,-50%)";
            ledge.bar = fl;
            CQ.audio.play("bar.place");
            res();
          });
        };
        CQ.drag(it.el, {
          enabled: () => !lifted,
          start: (pt) => lift(CQ.camera.toWorld(pt)),
          move: (pt) => {
            if (!proxy || done) return;
            const w = CQ.camera.toWorld(pt);
            CQ.pos(proxy, w.x + grab.dx, w.y + grab.dy);
          },
          end: () => {
            if (!done && lifted) place();
          },
          tap: () => {
            if (!done && lifted) place();
          },
          key: () => {
            if (!lifted) lift(null);
            place();
          },
        });
        it.el.tabIndex = 0;
        it.el.setAttribute("role", "button");
        it.el.setAttribute("aria-label", "Gold bar 8: drag it off the pan");
      })
    );
  }
  function drawSameArc() {
    const spans = CQ.eqBoard.el.querySelectorAll(".same");
    if (spans.length < 2) return;
    const row = spans[0].parentElement;
    const a = spans[0];
    const c = spans[1];
    const x1 = a.offsetLeft + a.offsetWidth / 2;
    const x2 = c.offsetLeft + c.offsetWidth / 2;
    const y = a.offsetTop - 6;
    const svg = CQ.el(
      "div",
      "same-arc",
      row,
      `<svg width="${row.offsetWidth}" height="80" viewBox="0 0 ${row.offsetWidth} 80"><path d="M${x1} 76 Q${(x1 + x2) / 2} -10 ${x2} 76" fill="none" stroke="#2F7BD8" stroke-width="6" stroke-linecap="round" stroke-dasharray="14 10"/></svg>`
    );
    svg.style.top = y - 76 + "px";
  }
  async function putBack(ledges) {
    const b = CQ.balance;
    const moves = ["left", "right"].map((side) => {
      const l = ledges[side];
      const from = { x: parseFloat(l.bar.style.left), y: parseFloat(l.bar.style.top) };
      l.bar.remove();
      const to = b.panCenter(side);
      return CQ.fly(CQ.world.drag, CQ.barFlyer(8, CQ.L.PAN_BAR_W), from, { x: to.x + (side === "left" ? 80 : -80), y: to.y }, { duration: 650, arc: -160 });
    });
    CQ.audio.play("ui.swoosh");
    await R.when(Promise.all(moves));
    b.addItem("left", { type: "bar", value: 8, slot: "extra" });
    b.addItem("right", { type: "bar", value: 8 }, 0);
    b.evaluate();
    CQ.audio.play("bar.place");
    ledges.left.remove();
    ledges.right.remove();
    await R.wait(500);
    // 8 + 15 join back into 23
    CQ.audio.play("bar.merge");
    const c = b.panCenter("right");
    CQ.fx.sparkle(CQ.world.fx, c.x, c.y - 30, 12, 90);
    b.setPan("right", [{ type: "bar", value: 23, w: 170 }]);
    b.evaluate();
    await R.wait(600);
  }

  // ------------------------------------------------------------------ FINALE
  async function runFinale() {
    CQ.next.show(false);
    CQ.zippy.setVisible(false); // the finale Zippy (with the crown tower) takes over
    CQ.track("game_complete", {});
    const r = await CQ.activityFinale();
    return r;
  }

  const STEPS = {
    intro: runIntro,
    L1: () => runSwapLevel("L1"),
    L2: () => runSwapLevel("L2"),
    L3: () => runSwapLevel("L3"),
    L4a: runL4a,
    L4c: runL4c,
    L4e: runL4e,
    L4g: runL4g,
    L5: runL5,
    L6: () => runIndependent("L6"),
    L7: () => runIndependent("L7"),
    L8: runL8,
    finale: runFinale,
  };
  CQ.flow.ORDER = ORDER;
})();
