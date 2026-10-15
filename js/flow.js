/*
 * Zippy's Crown Quest: the story.
 * Checkpoints, save/continue, chapter jumps, and the script for the intro, every level, the
 * practice equations and the finale. The words are in js/content.js.
 */
(function () {
  "use strict";
  const CQ = window.CQ;
  const C = () => window.CONTENT;
  const LV = () => C().levels;
  const R = CQ.run;
  const say = (id, o) => CQ.say(id, o);
  const sum = (a) => (a || []).reduce((x, y) => x + y, 0);

  const ORDER = ["intro", "L1", "L2", "L3", "L4a", "L4c", "L4e", "L4g", "L5", "L6", "L7", "L8", "L9", "P", "finale"];
  const CROWNS_AT = { intro: 0, L1: 0, L2: 1, L3: 2, L4a: 3, L4c: 3, L4e: 3, L4g: 3, L5: 4, L6: 5, L7: 6, L8: 7, L9: 8, P: 10, finale: 10 };
  const LEVEL_OF = { intro: 1, L1: 1, L2: 2, L3: 3, L4a: 4, L4c: 4, L4e: 4, L4g: 4, L5: 5, L6: 6, L7: 7, L8: 8, L9: 9, P: "P", finale: "P" };
  const SCENE_OF = { intro: "L1", L1: "L1", L2: "L2", L3: "L3", L4a: "L4", L4c: "L4", L4e: "L4", L4g: "L4", L5: "L5", L6: "L6", L7: "L7", L8: "L8", L9: "L9", P: "L9", finale: "L9" };
  const WORD_ORDER = ["variable", "constant", "expression", "equation", "lhs", "rhs", "linear", "solution"];
  const WORDS_AT = { L4c: 6, L4e: 7, L4g: 7, L5: 8, L6: 8, L7: 8, L8: 8, L9: 8, P: 8, finale: 8 };
  // The gold bars wait off screen while the balance is being explained or solved.
  const BARS_HIDDEN = ["L4a", "L4c", "L4e", "L8", "L9", "P", "finale"];
  // Levels that open with a new crown appearing on the balance (poof)
  const POOF_AT = ["L2", "L3", "L4a", "L5", "L6", "L7", "L8", "L9"];

  CQ.gen = 0;

  CQ.flow = {
    started: false,
    current: null,
    // opts.noVeil: the title screen's own transition already covers the change
    async goto(cp, opts) {
      opts = opts || {};
      if (!ORDER.includes(cp)) cp = "intro";
      CQ.run.restart();
      const veil = this.started && !opts.noVeil; // a chapter jump or a restart mid-game: dip softly to dark and back
      this.started = true;
      let start = ORDER.indexOf(cp);
      try {
        if (veil) await R.when(CQ.veil.cover());
        for (let i = start; i < ORDER.length; i++) {
          const id = ORDER[i];
          // a level won (he is wearing its crown) or a new room: Zippy swings off and the screen fades;
          // the next part is set up behind the fade, and he sneaks back into it
          const change = i > start && (SCENE_OF[ORDER[i - 1]] !== SCENE_OF[id] || CQ.zippy.wearing);
          if (change) await outro();
          this.current = id;
          CQ.store.set("progress", { cp: id });
          resetScene(id, { animate: change });
          if (veil && i === start) CQ.veil.reveal();
          if (change) await arrive();
          const res = await STEPS[id]();
          if (res === "again") {
            setTimeout(() => this.chapter("intro"), 0);
            return;
          }
        }
      } catch (e) {
        if (!(e instanceof CQ.CancelError)) console.error(e);
      }
    },
    // Start a chapter from its beginning (menu, chapter links, Play again). goto() on its own
    // carries on where the child left off (the practice equations remember which one was next).
    chapter(cp, opts) {
      CQ.store.set("practiceAt", 0);
      return this.goto(cp, opts);
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
  function resetScene(cp, opts) {
    opts = opts || {};
    CQ.gen++;
    CQ.stopTweens();
    CQ.audio.stopSpeech();
    CQ.ui.reset();
    CQ.notebook.hideNow();
    document.querySelectorAll(".activity").forEach((e) => e.remove());
    CQ.world.drag.querySelectorAll(".wlabel, .ledge, .ledge-bar, .flyer").forEach((e) => e.remove());
    CQ.camera.set(960, 540, 1);
    CQ.world.dark.style.opacity = 0;
    CQ.Give.disable();
    CQ.Give.busy = false;
    CQ.Give.heldBar = null;
    CQ.dropRing.hide();
    CQ.peek.hide();
    CQ.zippy.reset();
    CQ.grumble.snoreVol = 1;
    CQ.grumble.squash.style.transform = "";
    CQ.grumble.sleep();
    CQ.hud.setCrowns(CROWNS_AT[cp] || 0);
    CQ.hud.setLevel(LEVEL_OF[cp] || 1);
    CQ.gems.set(WORD_ORDER.slice(0, WORDS_AT[cp] || 0));
    const intro = cp === "intro";
    CQ.hud.show(!intro);
    CQ.audio.music(intro ? "title" : "game");
    CQ.audio.ambience(true);
    const lv = LV()[SCENE_OF[cp]];
    CQ.balance.setup(lv);
    // a new level: its crown and coins appear with a poof once Zippy is back (see poof)
    if (opts.animate && POOF_AT.includes(cp)) ["left", "right"].forEach((s) => CQ.balance.items[s].forEach((it) => (it.el.style.opacity = "0")));
    CQ.bars.setup(lv.bars, { animate: opts.animate && !BARS_HIDDEN.includes(cp) });
    CQ.bars.setVisible(!BARS_HIDDEN.includes(cp));
    if (["L4c", "L4e", "L4g"].includes(cp)) CQ.balance.setSign("x + 2 = 7");
    if (cp === "P" || cp === "finale") {
      // Level 9 solved: two 7 bars where the crowns were
      CQ.balance.setPan("left", [
        { type: "bar", value: 7, slot: "main" },
        { type: "bar", value: 7, slot: "main" },
        { type: "bar", value: 4, slot: "extra" },
      ]);
      CQ.balance.evaluate({ instant: true });
      CQ.balance.setSign("2 × 7 + 4 = 18");
    }
  }

  // ------------------------------------------------------------------ small helpers
  // On-pan sizes in stage pixels (Level 9 draws its crowns and bars smaller).
  const barPx = () => CQ.L.PAN_BAR_PX * CQ.balance.itemK;
  const crownPx = () => CQ.L.CROWN_PX * CQ.balance.itemK;
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
  // A level is won: Zippy swings off on his vine, out of the picture, wearing the crown he won (and
  // waving goodbye), and the screen fades to dark.
  async function outro() {
    const z = CQ.zippy;
    CQ.caption.hide();
    CQ.bubble.hide();
    CQ.hand.stop();
    CQ.idle.disarm();
    z.pose("swing");
    CQ.audio.play("zippy.whee");
    setTimeout(() => CQ.audio.play("slide.up"), 300);
    await R.when(z.swingAway());
    await R.when(CQ.veil.cover(700));
  }
  // The next level is ready behind the fade. The screen fades in on the sleeping Grumble, Zippy's head
  // peeks out from behind the tree (is Grumble still asleep?), and he swings back in on his vine.
  async function arrive() {
    const z = CQ.zippy;
    z.offstage();
    CQ.veil.reveal(900);
    await R.wait(1100);
    await sneakBack();
    z.pose("idle");
  }
  // Zippy's smiling head leans out from behind the tree trunk ("hmm?"), ducks back, and he swings in.
  // opts.comic: words to pop up beside his head; opts.pose and opts.sound: how he swings in.
  async function sneakBack(opts) {
    opts = opts || {};
    const z = CQ.zippy;
    await R.when(CQ.peek.out(700));
    CQ.audio.play("zippy.hmm");
    if (opts.comic) {
      const pc = CQ.peek.center();
      CQ.comic(opts.comic, { x: pc.x + 150, y: pc.y - 95 }, { color: "yellow", size: 56, dur: 1500 });
    }
    await R.wait(opts.comic ? 1500 : 1100);
    // he's snoring! back behind the tree... and here comes Zippy
    await R.when(CQ.peek.back(380));
    await R.wait(380);
    z.pose(opts.pose || "swing");
    CQ.audio.play(opts.sound || "zippy.whee");
    if (opts.giggle) setTimeout(() => CQ.audio.play("zippy.giggle"), 700);
    await R.when(z.swingBack());
  }
  // A new crown appears on the balance with a sparkle poof.
  function poof() {
    const b = CQ.balance;
    ["left", "right"].forEach((s) => {
      const p = b.panCenter(s);
      CQ.fx.sparkle(CQ.world.fx, p.x, p.y - 40, 10, 110);
      CQ.fx.dust(CQ.world.fx, p.x, p.y + 20, 6);
      b.items[s].forEach((it, i) => {
        it.el.style.opacity = ""; // they waited hidden while the level changed (resetScene)
        CQ.anim(it.el, [{ transform: "scale(0) translateY(30px)", opacity: 0 }, { transform: "scale(1) translateY(0)", opacity: 1 }], {
          duration: 600,
          delay: 160 + i * 70,
          easing: CQ.EASE.back,
          keep: false,
        });
      });
    });
    CQ.audio.play("dust.puff");
    CQ.audio.play("crown.sparkle");
  }
  function glowCrown(on) {
    CQ.balance.glowItems("left", (it) => it.type === "crown", on);
  }
  // "Look here!" (CQ.focus): the rest of the screen fades back while a line is about one thing.
  // look(what) moves the bright window there (it glides over from the last thing); look(null) ends it.
  function look(what, opts) {
    if (!what) return CQ.focus.off();
    CQ.focus.on(what, opts);
  }
  // what to look at (functions: the pans' contents change while they are looked at)
  const panEls = (side) => () => [CQ.balance.sides[side].g.querySelector(".bal-back")].concat(CQ.balance.items[side].filter((it) => !it.ghost).map((it) => it.el));
  const bothPans = () => panEls("left")().concat(panEls("right")());
  const crownEls = () => CQ.balance.items.left.filter((it) => it.type === "crown" && !it.ghost).map((it) => it.el);
  const leftBarEls = () => CQ.balance.items.left.filter((it) => it.type === "bar" && !it.ghost).map((it) => it.el);
  const barEls = () => CQ.bars.list.reduce((a, bar) => a.concat(bar.slot, bar.ped), []);
  // The treasure room's alarm: it rings whenever the balance tips.
  function ringAlarm(volume) {
    CQ.audio.play("alarm", { volume: volume || 1 });
    CQ.comic(C().grumble.alarm, { x: CQ.L.BX, y: CQ.L.PIVOT_Y - 130 }, { color: "yellow", size: 64, dur: 1300 });
  }
  // Hint: hand drags from a bar to Zippy.
  function demoGive(v) {
    const bar = CQ.bars.get(v);
    // too late: a bar was given meanwhile (the SWAP hint must not be replaced)
    if (!bar || bar.state !== "idle" || (CQ.zippy.held && CQ.zippy.held.type === "bar") || CQ.Give.busy) return;
    const from = CQ.camera.toScreen(CQ.bars.center(v));
    const to = CQ.camera.toScreen(CQ.zippy.holdPoint("zippy_swap", 1)); // into his open hands
    CQ.hand.drag(from, to, 2, { carry: () => CQ.bars.carried(v), carryScale: CQ.L.HELD_BAR_W / CQ.L.BAR_W });
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
    const given = R.when(
      new Promise((res) =>
        CQ.Give.enable(values, (v) => {
          CQ.Give.disable();
          CQ.bars.clearGlow();
          CQ.idle.disarm();
          res(v);
        })
      )
    );
    return given;
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
            CQ.focus.off();
            CQ.Give.disable();
            CQ.idle.disarm();
            res(CQ.zippy.held.value);
          });
          if (firstSwap) {
            firstSwap = false;
            CQ.store.set("swapDemoSeen", true);
            say("swap-tap-swap", { advance: "none" });
            setTimeout(() => {
              if (!CQ.swapBtn.cb) return; // already tapped
              look(CQ.swapBtn.el, { still: true, pad: 18 }); // measured once it has popped in
              CQ.focus.offAfter(5000);
              CQ.hand.tapAt(CQ.centerOf(CQ.swapBtn.el));
            }, 500);
          }
        });
      })
    );
  }
  async function tossTried(v) {
    const z = CQ.zippy;
    const bar = CQ.Give.heldBar || CQ.bars.get(v);
    const from = z.holdPoint(); // from his fists, before he lets go
    z.setHeld(null);
    z.pose("idle");
    if (bar) await R.when(CQ.Give.tossBack(bar, { tried: true, from }));
  }

  // ------------------------------------------------------------------ the swap
  // Zippy swings over with the bar held out in both fists and stops with it just above the crown. One
  // hand lets go (the bar drops into the crown's place) as the other grabs the crown, and he lifts it.
  async function swapOnPan(v) {
    const z = CQ.zippy;
    const b = CQ.balance;
    CQ.hand.stop();
    CQ.idle.disarm();
    CQ.caption.hide();
    const crown = b.find("left", (it) => it.type === "crown" && !it.ghost);
    const slot = b.items.left.indexOf(crown);
    const target = b.itemCenter(crown);
    z.pose("reachBar");
    CQ.audio.play("zippy.whee", { volume: 0.6 });
    await R.when(z.swingTo({ x: target.x, y: target.y - 70 }, 600, z.holdOffset("zippy_swap", 3, "bar")));
    // the swap: the bar drops from his hands into the crown's place, the crown jumps into his other hand
    const barFrom = z.holdPoint("zippy_swap", 3, "bar");
    z.pose("exchange");
    z.setHeld(null);
    crown.el.style.visibility = "hidden";
    const grab = z.holdPoint("zippy_swap", 4, "crown");
    CQ.audio.play("ui.swoosh");
    await R.when(
      Promise.all([
        CQ.fly(CQ.world.drag, CQ.barFlyer(v, barPx()), barFrom, target, { duration: 300, arc: 0, scaleFrom: CQ.L.HELD_BAR_W / barPx() }),
        CQ.fly(CQ.world.drag, CQ.crownFlyer(crownPx()), target, grab, { duration: 340, arc: -40, scaleTo: CQ.L.HELD_CROWN_W / crownPx() }),
      ])
    );
    CQ.audio.play("bar.place");
    b.removeItem(crown);
    const barItem = b.addItem("left", { type: "bar", value: v, slot: "main" }, slot);
    z.setHeld({ type: "crown" });
    const d = b.evaluate();
    CQ.track("answer", { level: CQ.flow.current, swap: v, correct: d === 0 });
    await R.wait(150);
    // he lifts the crown and swings back, so the child can watch the balance
    if (d === 0) z.pose("lift");
    else {
      z.setHeld(null); // uh-oh! (his scared sheet draws the crown in his hands)
      z.pose("crownUhOh");
      CQ.audio.play("zippy.eek");
    }
    await R.when(z.home(d === 0 ? 620 : 460));
    if (d === 0) z.pose("ooh");
    return { d, barItem };
  }
  // The crown Zippy holds is collected: "ooh!" With opts.wear (a level won) he lifts it up and puts it
  // on his own head, and wears it while he celebrates and swings away. Otherwise (the first of Level
  // 9's two crowns) he shows it off and it flies up out of the picture.
  async function collectCrown(opts) {
    opts = opts || {};
    const z = CQ.zippy;
    const b = CQ.balance;
    b.wobble();
    CQ.audio.play("balance.level");
    b.flashEmblem();
    z.pose("ooh");
    await R.wait(380);
    if (opts.wear) {
      z.setHeld(null); // from here on, the crown is drawn in his crown sheet
      z.pose("crownLift");
      CQ.audio.play("ui.swoosh");
      await R.wait(480);
      z.pose("crownOn");
      await R.wait(320);
      z.wear(true);
      z.pose("wow");
      const hp = z.headPoint();
      CQ.fx.sparkle(CQ.world.fx, hp.x, hp.y, 16, 100);
      CQ.audio.play("crown.sparkle");
      CQ.audio.play("correct");
      CQ.hud.setCrowns(CQ.hud.crowns + 1);
      await R.wait(700);
      z.pose("proud");
      await R.wait(450);
      return;
    }
    z.pose("look");
    const hp = z.holdPoint();
    CQ.fx.sparkle(CQ.world.fx, hp.x, hp.y, 12, 80);
    CQ.audio.play("correct");
    await R.wait(420);
    z.setHeld(null);
    z.pose("yes"); // thumbs up as it flies away
    await R.when(CQ.hud.flyCrown(hp));
  }
  // Equal masses: celebration.
  async function celebrate(lineId, vars) {
    const z = CQ.zippy;
    const g = CQ.grumble;
    await collectCrown({ wear: true }); // he puts the crown on, and keeps it on until he swings away
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
  // Unequal masses: the alarm rings and Grumble wakes up. With a fright, Zippy lets go: the crown jumps
  // back onto the pan and the wrong bar goes back to its own stand (marked Tried); Zippy runs off the
  // screen. Grumble looks around, yawns and (after a soft fade: a little later) is asleep again. Zippy's
  // smiling head peeks out from behind the tree, "hmm?", ducks back, then he swings back in.
  async function wakeAndUndo(v, barItem) {
    const z = CQ.zippy;
    const b = CQ.balance;
    const gen = CQ.gen;
    ringAlarm();
    z.pose("crownNervous"); // he clutches the crown while the alarm rings
    await R.wait(600);
    await R.when(
      CQ.grumble.wakeUp({
        onStand: () => z.pose("crownHide"), // Grumble gets up: Zippy hides behind the crown
        onRoar: () => z.pose("crownEek"), // ROAR! a jolt of fright, the crown up high
        afterRoar: async () => {
          if (gen !== CQ.gen) return;
          // "here, take it back!": the crown jumps out of his hands back onto the pan, and the bar goes
          // home to its stand
          z.pose("crownSorry");
          await R.wait(420);
          if (gen !== CQ.gen) return;
          const slot = b.itemCenter(barItem);
          const hand = z.holdPoint(); // the crown in his hands, in this frame
          const crownFrom = z.heldCrownW() / crownPx();
          const bar = CQ.Give.heldBar || CQ.bars.get(v);
          z.pose("shock");
          z.setHeld(null);
          barItem.el.style.visibility = "hidden";
          CQ.audio.play("zippy.eek");
          await Promise.all([
            CQ.fly(CQ.world.drag, CQ.crownFlyer(crownPx()), hand, slot, { duration: 560, arc: -110, scaleFrom: crownFrom }),
            bar ? CQ.Give.tossBack(bar, { tried: true, from: slot, scaleFrom: barPx() / CQ.L.BAR_W }) : null,
          ]);
          if (gen !== CQ.gen) return;
          const at = b.items.left.indexOf(barItem);
          b.removeItem(barItem);
          b.addItem("left", { type: "crown" }, at);
          b.evaluate();
          // ...and he swings away!
          z.pose("hide");
          CQ.audio.play("slide.up");
          await z.swingAway();
        },
        beforeSleep: () => CQ.veil.cover(700), // a little later...
      })
    );
    await R.wait(350);
    CQ.veil.reveal(900);
    await R.wait(1200);
    // only his smiling head leans out from behind the tree: is Grumble asleep? Then he swings back in.
    await sneakBack({ comic: "Hmm?", pose: "cheeky", sound: "slide.down", giggle: true });
    z.pose("idle"); // and straight on to the hint
  }

  // ------------------------------------------------------------------ INTRO
  async function runIntro() {
    const z = CQ.zippy;
    const g = CQ.grumble;
    const b = CQ.balance;
    CQ.ui.skip.classList.remove("hidden");
    z.setVisible(false);
    CQ.world.dark.style.opacity = 0.92;
    CQ.camera.set(600, 400, 1.3); // the corner Zippy drops into
    g.snoreVol = 1.2; // Grumble's snoring is heard in the dark, then the jungle fades in
    await R.wait(1300);
    CQ.world.darkness(0, 1400);
    await R.wait(800);
    // Meet Zippy! He spots a golden crown.
    const drop = z.dropIn();
    await R.wait(650);
    CQ.spot.on(() => z.center(), 270);
    await R.when(drop);
    const zp = CQ.camera.toScreen(z.center());
    const zb = CQ.nameBurst(C().names.zippy, C().names.zippyTag, zp.x + 640, zp.y - 110, "orange");
    z.pose("celebrate");
    CQ.audio.play("zippy.giggle");
    const meet = say("intro-1", { advance: "auto", pause: 700 });
    await R.wait(1500);
    CQ.hideBurst(zb);
    CQ.spot.off();
    z.pose("curious");
    await R.when(CQ.camera.to(960, 540, 1, 1100));
    const crown = b.find("left", (it) => it.type === "crown");
    const cc = b.itemCenter(crown);
    crown.el.classList.add("glint");
    CQ.fx.sparkle(CQ.world.fx, cc.x, cc.y, 14, 80);
    CQ.audio.play("crown.sparkle");
    await meet;
    await R.when(z.say(C().zippy.ooh, { keepPose: true }));
    crown.el.classList.remove("glint");
    z.pose("idle");
    // Grumble guards the treasure. Luckily, he's asleep!
    await R.when(CQ.camera.to(300, 760, 1.65, 1300));
    g.snoreVol = 2.2;
    CQ.spot.on(() => g.center(), 430); // the same spotlight as Zippy's
    await R.wait(450);
    const gb = CQ.nameBurst(C().names.grumble, C().names.grumbleTag, 1250, 400, "purple");
    await say("intro-2", { advance: "auto" });
    await say("intro-3", { advance: "auto", pause: 700 });
    await CQ.hideBurst(gb);
    CQ.spot.off();
    g.snoreVol = 1;
    await R.when(CQ.camera.to(960, 540, 1, 1300));
    // If the balance tips, the alarm will wake Grumble. (Zippy imagines it.)
    CQ.audio.play("zippy.gulp");
    const th = CQ.thought({ x: z.center().x + 340, y: z.center().y - 20 }, miniTipScene(), { w: 500, h: 300, cls: "from-left" });
    th.querySelector(".mini-scene").prepend(CQ.miniBalance({ width: 270, left: "bar", right: "coins3" }));
    const miniG = new CQ.Sprite(th.querySelector(".ms-grumble"), "", 0.3);
    miniG.show("grumble_roar", 7);
    setTimeout(() => {
      if (!th.isConnected) return;
      th.classList.add("tip");
      CQ.audio.play("alarm", { volume: 0.45 });
    }, 900);
    setTimeout(() => {
      if (th.isConnected) CQ.audio.play("grumble.roar", { volume: 0.35 });
    }, 1900);
    await say("intro-4", { advance: "auto", pause: 1000 });
    await CQ.hideThought(th);
    // Let's replace the crown with something just as heavy.
    const bar = CQ.bars.list[0];
    const arrow = swapArrow(cc, { x: bar.home.x, y: bar.home.y - 50 });
    await say("intro-5", { advance: "auto", pause: 700 });
    arrow.remove();
    // Each coin has a mass of 1 unit.
    const coin = b.items.right[b.items.right.length - 1];
    const ccoin = b.itemCenter(coin);
    coin.el.classList.add("demo-pop");
    CQ.audio.play("coin.clink", { index: 3 });
    const unit = worldLabel(C().ui.unit, ccoin.x + 140, ccoin.y - 90, "unit-tag");
    look([coin.el, unit], { pad: 30 });
    await say("intro-6", { advance: "auto", pause: 700 });
    look(null);
    coin.el.classList.remove("demo-pop");
    removeLabel(unit);
    CQ.ui.skip.classList.add("hidden");
  }
  function miniTipScene() {
    // the mini balance is added after; the alarm word shows when it tips
    return `<div class="mini-scene"><div class="ms-alarm">${C().grumble.alarm}</div><div class="ms-grumble"></div></div>`;
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
    if (key === "L1") look(barEls, { pad: 20 }); // which bar? these!
    for (let i = 0; i < L.intro.length; i++) await say(L.intro[i], { advance: i < L.intro.length - 1 ? "auto" : "none" });
    if (key === "L1") {
      CQ.focus.offAfter(2400); // before the hand shows how
      const v = CQ.bars.list[0].value;
      setTimeout(() => demoGive(v), 2700); // after the bars have shown they can be picked up
    }
    let attempts = 0;
    for (;;) {
      const v = await giveThenSwap(L.bars.filter((x) => CQ.bars.get(x).state !== "tried"));
      b.counting = false;
      b.clearCounts();
      const { d, barItem } = await swapOnPan(v);
      if (d === 0) {
        CQ.Give.useHeld();
        await celebrate("swap-correct", { n: L.crown });
        return;
      }
      await wakeAndUndo(v, barItem); // the bar is back on its stand, marked Tried
      attempts++;
      CQ.track("hint_shown", { level: L.n, tier: attempts >= 2 ? 2 : 1 });
      if (attempts === 1) {
        await say(v < L.crown ? "swap-light" : "swap-heavy", { advance: "auto" });
        say("swap-give", { advance: "none" });
      } else {
        say("swap-hint2", { vars: { n: L.crown }, advance: "none" });
        look(panEls("right"));
        await R.when(b.autoCount("right"));
        look(null);
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
    look(panEls("left"));
    await say("l4-1");
    b.clearGlow();
    b.glowItems("left");
    b.glowItems("right");
    look(bothPans);
    await say("l4-2");
    b.clearGlow();
    glowCrown(true);
    z.pose("idle");
    const crown = b.find("left", (it) => it.type === "crown");
    const cc = b.itemCenter(crown);
    look([crown.el]);
    await say("l4-3");
    const q = worldLabel("?", cc.x, cc.y - 120, "qmark");
    look([crown.el, q]);
    await say("l4-4");
    removeLabel(q);
    glowCrown(false);
    const under = b.ends.left.y + CQ.BAL.PAN_BOTTOM * CQ.BAL.S + 50; // just below the left pan
    let lx = worldLabel('<i class="v">x</i>', cc.x, under, "xlabel");
    look([crown.el, lx]);
    await say("l4-5");
    removeLabel(lx);
    lx = worldLabel(CQ.rich("x + 2"), b.ends.left.x, under, "xlabel wide");
    const lx2 = lx;
    b.glowItems("left");
    look(() => panEls("left")().concat(lx2));
    await say("l4-6");
    b.clearGlow();
    const r7 = worldLabel("7", b.ends.right.x, under, "xlabel seven");
    b.glowItems("right");
    look(() => panEls("right")().concat(r7));
    await say("l4-7");
    b.clearGlow();
    // key moment: the scene turns into the equation
    const strip = CQ.el("div", "eq-strip", CQ.ui.layer, `<span class="es a">${CQ.rich("x + 2")}</span><span class="es b">=</span><span class="es c">7</span>`);
    await R.wait(30);
    look(strip, { pad: 18 });
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
    await say("l4-8", { hold: 2600 }); // key moment: the scene became an equation
    look(null);
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
    await CQ.activityRecap();
  }
  async function runL4g() {
    const z = CQ.zippy;
    const b = CQ.balance;
    const cp = CQ.checkPanel;
    await say("l4-23", { advance: "auto" });
    await say("l4-24");
    // Try a value: Zippy is given that bar, it goes in for x, and the coins are counted on from it.
    const check = async (v, line, tap) => {
      CQ.bars.setVisible(true);
      CQ.bars.glow(v, true);
      await say(line, { advance: "auto", pause: 150 });
      say(tap, { advance: "none" });
      await giveBar([v], { glow: true });
      CQ.bars.setVisible(false);
      await R.when(cp.show({ a: 2, b: 7 }));
      await R.when(cp.substitute(v, z.holdPoint()));
      await R.when(b.autoCount("left", v));
      cp.setValue("lhs", v + 2);
      await R.wait(500);
      cp.setValue("rhs", 7);
      await R.wait(400);
      const eq = v + 2 === 7;
      await R.when(cp.compare(v + 2, 7, CQ.fmt(eq ? C().ui.verdictYes : C().ui.verdictNot, { v })));
      return eq;
    };
    await check(4, "l4-25", "l4-25-tap");
    CQ.grumble.stir();
    look(cp.el, { pad: 16 });
    await say("l4-26");
    look(null);
    b.clearCounts();
    await R.when(cp.hide());
    CQ.bars.setVisible(true);
    await tossTried(4);
    await check(5, "l4-27", "l4-27-tap");
    look(cp.el, { pad: 16 });
    await say("l4-28", { advance: "auto" });
    CQ.gems.collect("solution", { x: 1340, y: 420 });
    await say("l4-29");
    look(null);
    b.clearCounts();
    await R.when(cp.hide());
    CQ.bars.setVisible(true);
    // The crown's mass is 5 units. Zippy can use the 5-unit bar! (He is already holding it.)
    await say("l4-30", { advance: "auto" });
    await swapAfterCheck(5);
  }

  // ------------------------------------------------------------------ the Check routine (Levels 5–9)
  function chipsFor(L, v) {
    const k = L.crowns || 1;
    const a = L.leftBar || L.left;
    const bb = L.rightBar || sum(L.right);
    const s = k * v + a;
    const given = L.chips && L.chips[v];
    return {
      lhs: (given && given.lhs) || CQ.shuffle([s - 1, s, s + 1]),
      rhs: (given && given.rhs) || [a, v, bb].filter((x, i, arr) => arr.indexOf(x) === i).concat(bb + 1).slice(0, 3).sort((x, y) => x - y),
    };
  }
  // v goes in for x (flying from Zippy's hands, or from the crown), each side is worked out (by the
  // child, or shown when o.auto), then LHS and RHS are compared.
  // o: { from, line, find, auto, rhsGiven, calc, notLines, yesLines }  (line ids from content.js)
  async function checkRoutine(L, v, o) {
    o = o || {};
    const cp = CQ.checkPanel;
    const z = CQ.zippy;
    const k = L.crowns || 1;
    const a = L.leftBar || L.left;
    const bb = L.rightBar || sum(L.right);
    const s = k * v + a;
    const vars = { v, s, a, b: bb, k, kv: k * v };
    CQ.balance.counting = false;
    CQ.balance.clearCounts();
    CQ.bars.setVisible(false);
    await R.when(cp.show({ k, a, b: bb, rhsGiven: o.rhsGiven }));
    // The line is spoken while the number flies into x; both finish before the next instruction.
    const line = o.line ? say(o.line, { vars, advance: "auto", pause: 0 }) : null;
    await R.when(cp.substitute(v, o.from || z.holdPoint()));
    if (line) await line;
    if (o.auto) {
      cp.setValue("lhs", s);
      await R.wait(450);
      if (!o.rhsGiven) cp.setValue("rhs", bb);
    } else {
      const ch = chipsFor(L, v);
      if (o.find) say(o.find, { vars, advance: "none" });
      await cp.fill("lhs", ch.lhs, s, (m) => {
        if (k > 1) return say("hint-lhs-k", { vars, advance: "none" });
        const seq = [];
        for (let i = 1; i <= a && i <= 8; i++) seq.push(v + i);
        say("hint-lhs", { vars: Object.assign({ seq: seq.join(", ") }, vars), advance: "none" });
        if (m >= 2 && L.left) CQ.balance.autoCount("left", v).catch(() => {});
      });
      if (o.calc) await say(o.calc, { vars, advance: "auto" });
      if (!o.rhsGiven) await cp.fill("rhs", ch.rhs, bb, () => say("hint-rhs", { advance: "none" }));
    }
    await R.wait(350);
    const eq = s === bb;
    const verdict = CQ.fmt(eq ? C().ui.verdictYes : L.verdictNot || C().ui.verdictNot, vars);
    await R.when(cp.compare(s, bb, verdict));
    CQ.balance.clearCounts();
    if (!eq) {
      CQ.grumble.stir();
      await R.when(z.say(C().zippy.checked));
      look(cp.el, { pad: 16 });
      for (const id of o.notLines || ["check-not"]) await say(id, { vars });
      look(null);
      await R.when(cp.hide());
      CQ.bars.setVisible(true);
      await tossTried(v);
      return false;
    }
    if (o.yesLines && o.yesLines.length) look(cp.el, { pad: 16 });
    for (const id of o.yesLines || []) await say(id, { vars });
    look(null);
    await R.when(cp.hide());
    CQ.bars.setVisible(true);
    return true;
  }
  // The checked bar is in Zippy's hands: tap SWAP. Only a checked value gets here, so the balance stays level.
  async function swapAfterCheck(v, o) {
    o = o || {};
    say(o.tapLine || "check-now-swap", { advance: "none" });
    CQ.idle.arm(() => CQ.hand.tapAt(CQ.centerOf(CQ.swapBtn.el)), 8000);
    await R.when(CQ.swapBtn.wait());
    CQ.idle.disarm();
    const { d } = await swapOnPan(v);
    if (d !== 0) return d;
    CQ.Give.useHeld();
    if (!o.noCheer) CQ.zippy.say(C().zippy.thatWorks, { keepPose: true });
    if (o.oneOfTwo) await collectCrown();
    else await celebrate();
    if (o.sign !== false) CQ.balance.setSign(o.sign || `x = ${v}`);
    if (o.line) await say(o.line, { vars: { v } });
    return d;
  }

  // ------------------------------------------------------------------ LEVEL 5: guided practice
  async function runL5() {
    const L = LV().L5;
    const z = CQ.zippy;
    poof();
    await say(L.intro[0], { advance: "auto" });
    CQ.balance.setSign(`x + ${L.left} = ${sum(L.right)}`);
    for (let i = 1; i < L.intro.length; i++) await say(L.intro[i], { advance: "auto" });
    for (let i = 0; i < L.tries.length; i++) {
      const v = L.tries[i];
      await R.when(z.say(CQ.fmt(i ? C().zippy.tryNext : C().zippy.tryN, { v })));
      say("l5-give", { vars: { v }, advance: "none" });
      await giveBar([v], { glow: true, idleLine: true });
      const ok = await checkRoutine(L, v, { line: "check-replace", find: "check-find", notLines: ["l5-not"], yesLines: ["l5-yes"] });
      if (ok) return swapAfterCheck(v);
    }
  }

  // ------------------------------------------------------------------ LEVELS 6–7: your turn
  async function runIndependent(key) {
    const L = LV()[key];
    const S = L.say;
    poof();
    CQ.balance.setSign(`x + ${L.left} = ${sum(L.right)}`);
    for (const id of L.intro) await say(id, { advance: "auto" });
    await say(S.prompt, { advance: "auto", pause: 150 });
    let misses = 0;
    for (;;) {
      const left = L.bars.filter((x) => CQ.bars.get(x).state !== "tried");
      const v = await giveBar(left, { idleLine: true });
      let ok;
      if (v === L.crown && misses === 0) ok = await checkRoutine(L, v, { auto: true, yesLines: [S.firstRight] });
      else if (misses === 0) ok = await checkRoutine(L, v, { line: S.firstTry, find: S.find, yesLines: [S.success] });
      else ok = await checkRoutine(L, v, { line: S.nextTry, find: "check-find", yesLines: [S.success] });
      if (ok) return swapAfterCheck(v);
      misses++;
      CQ.track("hint_shown", { level: L.n, tier: misses });
      say("check-try-another", { advance: "none" });
    }
  }

  // ------------------------------------------------------------------ Levels 8 and 9: the smart way
  // Two "Taken off" stone ledges just outside the pans.
  function makeLedges() {
    const mk = (x, side) => {
      const l = CQ.el("div", "ledge " + side, CQ.world.drag, `<span>${C().ui.takenOff}</span>`);
      CQ.placeStand(l, x); // a stone stand, like the ones under the gold bars
      l.rest = { x, y: CQ.L.BAR_BASE }; // where a bar rests on it
      CQ.anim(l, [{ opacity: 0, transform: "translateY(24px)" }, { opacity: 1, transform: "translateY(0)" }], { duration: 520, easing: CQ.EASE.out, keep: false });
      return l;
    };
    const off = CQ.BAL.R * CQ.BAL.S + 150;
    return { left: mk(CQ.L.BX - off, "left"), right: mk(CQ.L.BX + off, "right") };
  }
  // A bar on a pan cracks into smaller bars (e.g. 23 into 8 and 15). Returns the new pan items.
  async function splitBar(side, it, parts) {
    const b = CQ.balance;
    const c = b.itemCenter(it);
    it.el.classList.add("glow", "cracking");
    await R.wait(700);
    CQ.audio.play("bar.crack");
    CQ.fx.sparkle(CQ.world.fx, c.x, c.y, 14, 80);
    const at = b.items[side].indexOf(it);
    b.removeItem(it);
    const made = parts.map((p, i) => b.addItem(side, { type: "bar", value: p }, at + i));
    made.forEach((m) => CQ.anim(m.el, [{ transform: "scale(.6)" }, { transform: "scale(1)" }], { duration: 420, easing: CQ.EASE.back, keep: false }));
    b.evaluate();
    return made;
  }
  // The child drags a bar of value v off either pan. The matching bar on the other pan comes off
  // with it, so both sides lose the same mass and the balance stays level. Both land on the ledges.
  function dragOffBoth(v, ledges) {
    const b = CQ.balance;
    const items = {};
    ["left", "right"].forEach((s) => (items[s] = b.items[s].find((x) => x.type === "bar" && x.value === v && !x.ghost)));
    const ledgePt = (s) => ({ x: ledges[s].rest.x, y: ledges[s].rest.y - (barPx() * IMAGES.bar.h) / IMAGES.bar.w / 2 }); // the bar rests on its top face
    ["left", "right"].forEach((s) => {
      items[s].el.classList.add("draggable", "glow");
      ledges[s].classList.add("active");
    });
    const demo = () => CQ.hand.drag(CQ.camera.toScreen(b.itemCenter(items.left)), CQ.camera.toScreen(ledgePt("left")), 1);
    CQ.idle.arm(demo, 7000);
    const demoTimer = setTimeout(demo, 600);
    return R.when(
      new Promise((res) => {
        let lifted = false;
        let done = false;
        let side = null;
        let proxy = null;
        let grab = null;
        let otherLanded = null;
        const land = (s, from) =>
          new Promise((ok) => {
            const fl = CQ.barFlyer(v, barPx());
            CQ.fly(CQ.world.drag, fl, from, ledgePt(s), { duration: 620, arc: -90, remove: false }).then(() => {
              fl.classList.remove("flyer");
              fl.classList.add("ledge-bar");
              CQ.pos(fl, ledgePt(s).x, ledgePt(s).y);
              fl.style.transform = "translate(-50%,-50%)";
              ledges[s].bar = fl;
              ledges[s].classList.remove("active");
              CQ.audio.play("bar.place");
              ok();
            });
          });
        const lift = (s, pt) => {
          side = s;
          clearTimeout(demoTimer);
          CQ.hand.stop();
          CQ.idle.disarm();
          const other = s === "left" ? "right" : "left";
          const c = b.itemCenter(items[s]);
          const co = b.itemCenter(items[other]);
          grab = pt ? { dx: c.x - pt.x, dy: c.y - pt.y } : { dx: 0, dy: 0 };
          proxy = CQ.barFlyer(v, barPx());
          proxy.classList.add("glow", "flyer");
          CQ.world.drag.appendChild(proxy);
          CQ.pos(proxy, c.x, c.y);
          proxy.style.transform = "translate(-50%,-50%)";
          // Both bars leave their pans together. The dragged one stays in the page (invisible) until it
          // is dropped: it owns the pointer capture, and removing it would end the drag.
          ["left", "right"].forEach((k) => {
            const list = b.items[k];
            list.splice(list.indexOf(items[k]), 1);
            b.layout(k);
          });
          items[s].el.style.opacity = "0";
          items[other].el.remove();
          b.evaluate();
          lifted = true;
          CQ.audio.play("bar.pick");
          otherLanded = land(other, co);
        };
        const place = () => {
          if (done) return;
          done = true;
          items[side].el.remove();
          const from = { x: parseFloat(proxy.style.left), y: parseFloat(proxy.style.top) };
          proxy.remove();
          Promise.all([land(side, from), otherLanded]).then(() => res());
        };
        ["left", "right"].forEach((s) => {
          const it = items[s];
          CQ.drag(it.el, {
            enabled: () => !lifted,
            start: (pt) => lift(s, CQ.camera.toWorld(pt)),
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
              if (!lifted) lift(s, null);
              place();
            },
          });
          it.el.tabIndex = 0;
          it.el.setAttribute("role", "button");
          it.el.setAttribute("aria-label", `Gold bar ${v}: drag it off the balance`);
        });
      })
    );
  }
  // The two bars go back onto their pans, then the right pan's bars join back into one bar.
  async function putBack(ledges, v, merged) {
    const b = CQ.balance;
    const moves = ["left", "right"].map((side) => {
      const l = ledges[side];
      const from = { x: parseFloat(l.bar.style.left), y: parseFloat(l.bar.style.top) };
      l.bar.remove();
      const to = b.panCenter(side);
      return CQ.fly(CQ.world.drag, CQ.barFlyer(v, barPx()), from, { x: to.x + (side === "left" ? 80 : -80), y: to.y }, { duration: 850, arc: -160 });
    });
    CQ.audio.play("ui.swoosh");
    await R.when(Promise.all(moves));
    b.addItem("left", { type: "bar", value: v, slot: "extra" });
    b.addItem("right", { type: "bar", value: v }, 0);
    b.evaluate();
    CQ.audio.play("bar.place");
    ledges.left.remove();
    ledges.right.remove();
    await R.wait(500);
    CQ.audio.play("bar.merge");
    const c = b.panCenter("right");
    CQ.fx.sparkle(CQ.world.fx, c.x, c.y - 30, 12, 90);
    b.setPan("right", [{ type: "bar", value: merged, w: 170 }]);
    b.evaluate();
    await R.wait(600);
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
        { w: 330, h: 200 }
      );
      out.push(t);
      await R.wait(700);
      CQ.audio.play("tryagain");
    }
    const dots = CQ.thought({ x: 1600, y: 250 }, '<div class="trial dots">…</div>', { w: 150, h: 120 });
    out.push(dots);
    return out;
  }

  // ------------------------------------------------------------------ LEVEL 8: the smart way
  async function runL8() {
    const L = LV().L8;
    const z = CQ.zippy;
    const b = CQ.balance;
    const eb = CQ.eqBoard;
    poof();
    b.setSign("x + 8 = 23");
    z.pose("curious");
    await say("l8-1", { advance: "auto" });
    b.glowItems("left");
    b.glowItems("right");
    look(bothPans);
    await say("l8-2");
    look(null);
    b.clearGlow();
    z.pose("idle");
    const bubbles = await trialThoughts();
    await say("l8-3");
    bubbles.forEach((t) => CQ.hideThought(t));
    z.pose("celebrate");
    CQ.audio.play("zippy.ooh");
    await R.when(z.say(C().zippy.idea, { keepPose: true }));
    z.pose("idle");
    glowCrown(true);
    look(crownEls);
    await say("l8-4", { advance: "auto" });
    glowCrown(false);
    // First, split 23 into 8 and 15.
    b.setSign(null);
    look(panEls("right"));
    await splitBar("right", b.items.right[0], [8, 15]);
    await R.when(eb.show("x + 8 = 8 + 15"));
    await say("l8-5");
    // There are 8 units beside the crown…
    b.glowItems("left", (it) => it.type === "bar");
    look(leftBarEls);
    await say("l8-6");
    // …so remove 8 from both sides.
    b.glowItems("right", (it) => it.value === 8);
    look(bothPans);
    await say("l8-7");
    look(null);
    b.clearGlow();
    const ledges = makeLedges();
    eb.set("x + 8 {{− 8}} = 8 + 15 {{− 8}}");
    await say("l8-8", { advance: "auto", pause: 150 });
    say("l8-8-drag", { advance: "none" });
    await dragOffBoth(8, ledges);
    CQ.audio.play("balance.level");
    b.flashEmblem();
    z.pose("phew");
    setTimeout(() => z.pose("idle"), 1400);
    // Now the crown balances 15 units. So, x = 15.
    eb.set("x = 15", { final: true });
    CQ.audio.play("correct");
    look(eb.el, { pad: 16 });
    await say("l8-9", { hold: 2600 }); // key moment: x = 15
    look(null);
    await R.when(eb.hide());
    // Check it in the original equation (the number flies out of the crown: the crown is x).
    await say("l8-10", { advance: "auto" });
    await putBack(ledges, 8, 23);
    b.setSign("x + 8 = 23");
    const crown = b.find("left", (it) => it.type === "crown");
    await checkRoutine(L, 15, { from: b.itemCenter(crown), rhsGiven: true, line: "l8-11", find: "check-find-lhs", calc: "l8-12", yesLines: ["l8-13"] });
    // The swap: only a checked value gets the SWAP button.
    await say("l8-14", { advance: "auto" });
    say("l8-give", { advance: "none" });
    for (;;) {
      const v = await giveBar(L.bars.filter((x) => CQ.bars.get(x).state !== "tried"), { idleLine: true });
      if (v !== 15) {
        await checkRoutine(L, v, { line: "check-lets", find: "check-find-lhs", rhsGiven: true });
        say("l8-give", { advance: "none" });
        continue;
      }
      await swapAfterCheck(15, { noCheer: true, line: "l8-15", sign: "15 + 8 = 23" });
      return;
    }
  }

  // ------------------------------------------------------------------ LEVEL 9: two matching crowns
  async function runL9() {
    const L = LV().L9;
    const z = CQ.zippy;
    const b = CQ.balance;
    const eb = CQ.eqBoard;
    poof();
    z.pose("curious");
    await say("l9-0", { advance: "auto" });
    // Each crown has the same mass, x.
    const crowns = b.items.left.filter((it) => it.type === "crown");
    const xs = crowns.map((cr) => {
      const c = b.itemCenter(cr);
      return worldLabel('<i class="v">x</i>', c.x, c.y - 80, "xlabel small");
    });
    glowCrown(true);
    look(() => crownEls().concat(xs));
    await R.when(eb.show("x + x + 4 = 18"));
    z.pose("idle");
    await say("l9-1");
    // Two lots of x make 2x.
    xs.forEach(removeLabel);
    const c0 = b.itemCenter(crowns[0]);
    const c1 = b.itemCenter(crowns[1]);
    const two = worldLabel(CQ.rich("2x"), (c0.x + c1.x) / 2, c0.y - 96, "xlabel");
    look(() => crownEls().concat(two));
    eb.set("2x + 4 = 18");
    await say("l9-2");
    removeLabel(two);
    glowCrown(false);
    // First, let's remove these 4 units.
    b.glowItems("left", (it) => it.type === "bar");
    look(leftBarEls);
    eb.set("2x <<+ 4>> = 18");
    await say("l9-3");
    b.clearGlow();
    // Split 18 into 4 and 14.
    look(panEls("right"));
    await splitBar("right", b.items.right[0], [4, 14]);
    eb.set("2x + 4 = 4 + 14");
    await say("l9-4");
    look(null);
    // Remove 4 from both sides.
    const ledges = makeLedges();
    eb.set("2x + 4 {{− 4}} = 4 + 14 {{− 4}}");
    await say("l9-5", { advance: "auto", pause: 150 });
    say("l9-5-drag", { advance: "none" });
    await dragOffBoth(4, ledges);
    CQ.audio.play("balance.level");
    b.flashEmblem();
    // We need the mass of one crown.
    eb.set("2x = 14");
    await say("l9-6");
    // Two identical crowns: divide both sides by 2.
    const halves = await splitBar("right", b.items.right.find((it) => it.value === 14), [7, 7]);
    const lp = b.panCenter("left");
    const rp = b.panCenter("right");
    const d1 = worldLabel("÷ 2", lp.x, lp.y - 150, "xlabel half");
    const d2 = worldLabel("÷ 2", rp.x, rp.y - 150, "xlabel half");
    glowCrown(true);
    b.glowItems("right");
    look(() => bothPans().concat(d1, d2));
    eb.set("[[2x|2]] = [[14|2]]");
    await say("l9-7");
    look(null);
    b.clearGlow();
    removeLabel(d1);
    removeLabel(d2);
    // One crown has a mass of 7 units.
    b.ghost(crowns[1], true);
    b.ghost(halves[1], true);
    CQ.audio.play("ui.swoosh");
    b.evaluate();
    eb.set("x = 7", { final: true });
    CQ.audio.play("correct");
    glowCrown(true);
    b.glowItems("right", (it) => !it.ghost);
    look(eb.el, { pad: 16 });
    await say("l9-8", { hold: 2600 }); // key moment: x = 7
    look(null);
    b.clearGlow();
    await R.when(eb.hide());
    // Check in the original equation: everything goes back, then 7 goes in for x.
    b.ghost(crowns[1], false);
    b.ghost(halves[1], false);
    await putBack(ledges, 4, 18);
    b.setSign("2x + 4 = 18");
    await checkRoutine(L, 7, { from: b.itemCenter(crowns[0]), rhsGiven: true, line: "l9-9", find: "check-find-lhs", calc: "l9-calc", yesLines: ["l9-10"] });
    // Two swaps, one 7 bar for each crown.
    say("l9-give", { advance: "none" });
    let swapped = 0;
    while (swapped < 2) {
      const v = await giveBar(L.bars.filter((x) => CQ.bars.list.some((bar) => bar.value === x && bar.state === "idle")), { idleLine: true });
      if (v !== 7) {
        await checkRoutine(L, v, { line: "check-lets", find: "check-find-lhs", rhsGiven: true });
        say(swapped ? "l9-give2" : "l9-give", { advance: "none" });
        continue;
      }
      swapped++;
      if (swapped === 1) {
        await swapAfterCheck(7, { oneOfTwo: true, sign: false });
        say("l9-give2", { advance: "none" });
      } else await swapAfterCheck(7, { sign: "2 × 7 + 4 = 18" });
    }
  }

  // ------------------------------------------------------------------ Practice: try a few equations
  async function runPractice() {
    const start = CQ.store.get("practiceAt", 0) || 0;
    if (!start) await say("p-intro");
    await CQ.activityPractice(start);
  }

  // ------------------------------------------------------------------ FINALE
  async function runFinale() {
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
    L9: runL9,
    P: runPractice,
    finale: runFinale,
  };
  CQ.flow.ORDER = ORDER;
})();
