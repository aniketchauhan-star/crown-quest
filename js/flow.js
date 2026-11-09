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
  const BARS_HIDDEN = ["L4a", "L4c", "L4e", "L4g", "L8", "L9", "P", "finale"];
  // Where a level begins when a chapter is opened straight away (Grumble snores twice there; a level
  // reached in the story gets its two snores as Zippy peeks at him, see sneakBack)
  const SNORE_AT = ["L1", "L2", "L3", "L4a", "L5", "L6", "L7", "L8", "L9"];

  CQ.gen = 0;

  CQ.flow = {
    started: false,
    current: null,
    jumping: false, // a Next-button jump is under way
    arriving: false, // Zippy is sneaking back into a new level (see arrive)
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
          // a level won (he is wearing its crown) or a new room: Zippy swings off to the left and the light
          // closes in on the tree and sleeping Grumble (no fade to dark: asked 2026-11-09); the next part
          // is set up in the dimmed rest of the scene, and he peeks out and swings back into it
          const change = i > start && (SCENE_OF[ORDER[i - 1]] !== SCENE_OF[id] || CQ.zippy.wearing);
          if (i > start) await R.hold(CQ.PACE.between); // a moment before the next part (or before he swings off)
          if (change) await outro();
          this.current = id;
          CQ.next.showNext(id !== "finale");
          CQ.nav.show(true); // the screens list and replay, top left
          CQ.nav.setCurrent(id);
          CQ.store.set("progress", { cp: id });
          resetScene(id, { animate: change, keepSpot: change });
          if (i === start && SNORE_AT.includes(id)) CQ.grumble.snore(1); // a level begins: he snores once
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
    // The Next button when no line is on: the start of the next part of the quest. While Zippy is
    // arriving in a level, it starts that level at once instead (skipping only his entrance).
    next() {
      const i = ORDER.indexOf(this.current);
      if (i < 0 || i >= ORDER.length - 1 || this.jumping) return;
      this.jumping = true; // one jump per tap, even when tapped twice quickly
      setTimeout(() => (this.jumping = false), 1500);
      this.chapter(this.arriving ? this.current : ORDER[i + 1]);
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
    CQ.ui.reset({ keepSpot: opts.keepSpot });
    CQ.notebook.hideNow();
    document.querySelectorAll(".activity").forEach((e) => e.remove());
    CQ.world.drag.querySelectorAll(".wlabel, .ledge, .ledge-bar, .flyer").forEach((e) => e.remove());
    CQ.camera.set(960, 540, 1);
    CQ.world.dark.style.opacity = 0;
    CQ.screen.shade("dark", false);
    CQ.Give.disable();
    CQ.Give.busy = false;
    CQ.Give.heldBar = null;
    CQ.dropRing.hide();
    CQ.peek.hide();
    CQ.zippy.reset();
    CQ.grumble.hush();
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
    // a new level's crown, coins and gold bars are simply there when it begins (set up behind the fade):
    // nothing pops in by magic
    CQ.bars.setup(lv.bars);
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
  // When the voice of the line (text) gets to str: the question bar types with a recorded voice; a line
  // with no recording yet (or with the voice off) shows whole at once, so the time a voice takes to get
  // there is guessed from where str is in the line. At once if the line doesn't have str; at the latest
  // after 15 s.
  function untilSaid(text, str) {
    return new Promise((res) => {
      const at = String(text).indexOf(str);
      if (at < 0) return res();
      const t0 = performance.now();
      const guess = at * 65; // about 15 letters a second
      const tick = () => {
        const cap = CQ.caption;
        const here = cap.text === text;
        if ((here && cap.chars && cap.reached(str)) || (here && !cap.chars && performance.now() - t0 > guess) || performance.now() - t0 > 15000) return res();
        setTimeout(tick, 60);
      };
      tick();
    });
  }
  // On-pan sizes in stage pixels (Level 9 draws its crowns and bars smaller; a heavier crown is bigger).
  const barPx = () => CQ.L.PAN_BAR_PX * CQ.balance.itemK;
  const crownPx = () => CQ.balance.crownW() * CQ.BAL.S;
  const panNumPx = (item) => parseFloat(getComputedStyle(item.el.querySelector(".num")).fontSize) * CQ.BAL.S; // a pan bar's number
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
    // no fade to dark (asked 2026-11-09: "no need to come screen of transition"): the light closes in on
    // the tree and sleeping Grumble, the rest of the scene dims and blurs, and the next level is set up
    // there, unseen, while Zippy peeks out (arrive)
    await R.when(spotTree());
  }
  // the spotlight on the tree trunk (where Zippy peeks out) and sleeping Grumble; the background with the
  // tree and the peek, and Grumble, stay sharp
  function spotTree() {
    return CQ.spot.on({ x: 300, y: 640 }, 360, [CQ.world.decor, CQ.world.grumbleLayer]);
  }
  // The next level is ready in the dimmed scene. Under the spotlight Zippy's head peeks out from behind
  // the tree (is Grumble still asleep?) and blinks at him, then the light opens up as he swings back in
  // on his vine, and the new level is simply there.
  async function arrive() {
    const z = CQ.zippy;
    CQ.flow.arriving = true;
    try {
      z.offstage();
      await R.wait(500);
      await sneakBack({ lift: true });
      z.pose("idle");
    } finally {
      CQ.flow.arriving = false;
    }
  }
  // Zippy's smiling head leans out from behind the tree trunk ("hmm?"), blinks at Grumble twice with a
  // funny "bwip-bwip" (asked 2026-11-09), ducks back, and he swings in. opts.comic: words to pop up
  // beside his head; opts.pose and opts.sound: how he swings in; opts.lift: the spotlight opens up then.
  async function sneakBack(opts) {
    opts = opts || {};
    const z = CQ.zippy;
    CQ.grumble.snore(1); // is he still asleep? A snore says yes
    await R.when(CQ.peek.out(700));
    CQ.audio.play("zippy.hmm");
    if (opts.comic) {
      const pc = CQ.peek.center();
      CQ.comic(opts.comic, { x: pc.x + 150, y: pc.y - 95 }, { color: "yellow", size: 56, dur: 1500 });
    }
    await R.wait(900);
    await R.when(CQ.peek.blink(2));
    await R.wait(opts.comic ? 700 : 500);
    // he's snoring! back behind the tree... and here comes Zippy
    await R.when(CQ.peek.back(380));
    if (opts.lift) CQ.spot.off();
    await R.wait(380);
    z.pose(opts.pose || "swing");
    CQ.audio.play(opts.sound || "zippy.whee");
    if (opts.giggle) setTimeout(() => CQ.audio.play("zippy.giggle"), 700);
    await R.when(z.swingBack());
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
  const panEls = (side) => () => [CQ.balance.sides[side].g.querySelector(".bal-plate")].concat(CQ.balance.items[side].filter((it) => !it.ghost).map((it) => it.el));
  const bothPans = () => panEls("left")().concat(panEls("right")());
  const crownEls = () => CQ.balance.items.left.filter((it) => it.type === "crown" && !it.ghost).map((it) => it.el);
  const leftBarEls = () => CQ.balance.items.left.filter((it) => it.type === "bar" && !it.ghost).map((it) => it.el);
  const barEls = () => CQ.bars.list.reduce((a, bar) => a.concat(bar.slot, bar.ped), []);
  // The treasure room's alarm: it rings whenever the balance tips.
  function ringAlarm(volume) {
    CQ.audio.play("alarm", { volume: volume || 1 });
    CQ.comic(C().grumble.alarm, { x: CQ.L.BX, y: CQ.L.PIVOT_Y - 130 }, { color: "yellow", size: 64, dur: 1300 });
  }
  // Hint: hand drags from a bar to Zippy. Returns the gesture (it settles when the hand is done).
  function demoGive(v) {
    const bar = CQ.bars.get(v);
    // too late: a bar was given meanwhile (the SWAP hint must not be replaced), or the swap has begun
    if (!bar || bar.state !== "idle" || (CQ.zippy.held && CQ.zippy.held.type === "bar") || CQ.Give.busy || !CQ.Give.allowed) return null;
    const from = CQ.camera.toScreen(CQ.bars.center(v));
    const to = CQ.camera.toScreen(CQ.zippy.holdPoint("zippy_swap", 1)); // into his open hands
    return CQ.hand.drag(from, to, 2, { carry: () => CQ.bars.carried(v), carryScale: CQ.zippy.barBox(1).w / CQ.L.BAR_W });
  }
  // The child gives one of `values` to Zippy. Resolves with the value once he has caught it.
  // A child who does nothing for a while gets the hand showing how, and only that: the instruction is
  // not said again (review, 2026-11-07: "do not repeat the instruction. Give hand nudge only").
  function giveBar(values, opts) {
    opts = opts || {};
    CQ.balance.counting = true; // coins can be tapped to count them while the child decides
    if (opts.glow) values.forEach((v) => CQ.bars.glow(v, true));
    CQ.idle.arm(() => {
      const v = values.find((x) => CQ.bars.get(x) && CQ.bars.get(x).state === "idle");
      if (v != null) demoGive(v);
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
  // The child gives a bar to Zippy, then taps SWAP (they may change bars before tapping). Idle: the
  // hand only (as in giveBar), with the `show` bar if it is still on its stand (Level 1: the right one,
  // as in the first demo).
  function giveThenSwap(values, show) {
    let firstSwap = !CQ.store.get("swapDemoSeen", false);
    CQ.idle.arm(() => {
      if (CQ.zippy.held && CQ.zippy.held.type === "bar") CQ.hand.tapAt(CQ.centerOf(CQ.swapBtn.el));
      else {
        const v = [show].concat(values).find((x) => x != null && CQ.bars.get(x) && CQ.bars.get(x).state === "idle");
        if (v != null) demoGive(v);
      }
    }, 8000);
    return R.when(
      new Promise((res) => {
        CQ.Give.enable(values, () => {
          CQ.swapBtn.show(() => {
            const held = CQ.zippy.held;
            if (!held || held.type !== "bar" || CQ.Give.busy) return; // a new bar is still on its way: SWAP comes back when it lands
            CQ.focus.off();
            CQ.Give.disable();
            CQ.idle.disarm();
            res(held.value);
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
    if (z.held && z.held.type === "bar") {
      z.pose("giveBack"); // "not this one": he holds it out to give it back
      await R.wait(450);
    }
    const from = z.barBox(); // from his hands, before he lets go
    z.setHeld(null);
    z.pose("idle");
    if (bar) await R.when(CQ.Give.tossBack(bar, { tried: true, from, scaleFrom: from.w / CQ.L.BAR_W }));
  }

  // ------------------------------------------------------------------ the swap
  // the view during the swap: a little closer, on Zippy and the balance (its left pan, where the crown
  // is, a little left of the middle; his vine and Grumble stay in the picture)
  const SWAP_VIEW = { x: 990, y: 530, z: 1.18 };
  // Zippy swings over with the bar held out in both fists and stops with it just above the crown. He
  // lets go (the bar drops into the crown's place) as the crown jumps up into his hands: he lifts it up
  // in both hands, or, when the balance is about to tip, clutches it in fright.
  async function swapOnPan(v) {
    const z = CQ.zippy;
    const b = CQ.balance;
    CQ.hand.stop();
    CQ.idle.disarm();
    CQ.caption.hide();
    const crown = b.find("left", (it) => it.type === "crown" && !it.ghost);
    const target = b.itemCenter(crown);
    // the view comes a little closer to Zippy and the balance for the swap (asked 2026-11-09: "when
    // monkey change the crown then slightly zoom to the monkey and balance"), and goes back out as he
    // swings home, so what happens next (he wins, or the alarm wakes Grumble) is seen in full
    CQ.camera.to(SWAP_VIEW.x, SWAP_VIEW.y, SWAP_VIEW.z, 750);
    z.pose("reachBar"); // leaning down with the bar held out below him
    CQ.audio.play("zippy.whee", { volume: 0.6 });
    // he swings over until the bar, as he puts it down, is just above the crown (a big crown is taller)
    await R.when(z.swingTo({ x: target.x, y: target.y - (crown.h * CQ.BAL.S) / 2 - 27 }, 600, z.barOffset(7)));
    z.pose("putDown");
    await R.wait(120);
    // the swap: the bar drops from his hands into the crown's place, the crown jumps up into his hands
    const barFrom = z.barBox(7);
    const handNum = parseFloat(z.heldEl.style.fontSize) || 0; // the number printed on the bar in his hands
    z.setHeld(null);
    z.pose("exchange");
    crown.el.style.visibility = "hidden";
    const crownPxWas = crownPx();
    const panLook = getComputedStyle(crown.el).filter; // it leaves the plate looking as it did there
    const barItem = b.replaceItem(crown, { type: "bar", value: v, slot: "main" }); // the bar lands standing on the plate
    const barTo = b.itemCenter(barItem);
    const level = b.mass("left") === b.mass("right"); // (the bar already counts in the crown's place)
    const hands = z.crownInHands(!level); // where his crown sheet (or his scared one) draws the crown
    CQ.audio.play("ui.swoosh");
    await R.when(
      Promise.all([
        CQ.fly(CQ.world.drag, CQ.barFlyer(v, barPx()), barFrom, barTo, {
          duration: 300,
          arc: 0,
          scaleFrom: barFrom.w / barPx(),
          filterTo: getComputedStyle(barItem.el).filter,
          numFrom: handNum ? handNum / (barFrom.w / barPx()) : 0,
          numTo: panNumPx(barItem),
        }),
        CQ.fly(CQ.world.drag, CQ.crownFlyer(crownPxWas), target, hands, {
          duration: 340,
          arc: -40,
          scaleTo: hands.w / crownPxWas,
          spin: hands.tilt,
          filterFrom: panLook,
        }),
      ])
    );
    CQ.audio.play("bar.place");
    barItem.el.style.visibility = "";
    if (level) {
      z.setHeld({ type: "crown" });
      z.pose("lift"); // he lifts it up in both hands (his crown sheet draws it)
    } else {
      z.pose("crownUhOh"); // uh-oh! (his scared sheet draws the crown in his hands)
      CQ.audio.play("zippy.eek");
    }
    const d = b.evaluate();
    CQ.track("answer", { level: CQ.flow.current, swap: v, correct: d === 0 });
    await R.wait(d === 0 ? 450 : 250); // (a moment close up: he lifts it high, or uh-oh)
    // he swings back with the crown, so the child can watch the balance, and the view goes back out
    CQ.camera.to(960, 540, 1, d === 0 ? 900 : 650);
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
    const hp = z.crownInHands();
    CQ.fx.sparkle(CQ.world.fx, hp.x, hp.y, 12, 80);
    CQ.audio.play("correct");
    await R.wait(420);
    z.setHeld(null);
    z.pose("yes"); // thumbs up as it flies away
    await R.when(CQ.hud.flyCrown(hp, hp.w));
  }
  // Equal masses: celebration.
  async function celebrate(lineId, vars) {
    const z = CQ.zippy;
    const g = CQ.grumble;
    await collectCrown({ wear: true }); // he puts the crown on, and keeps it on until he swings away
    // He has won the crown: he laughs, in his own recorded laugh (asked 2026-11-09: "use this voice when
    // monkey win"); his "Hee hee! Sleep tight, Grumble!" and Grumble's loud snores wait until it has
    // nearly ended, so they don't talk over it.
    z.pose("laugh");
    CQ.audio.play("zippy.win", { volume: 1.3 });
    CQ.fx.confetti(CQ.world.fx, 700, 420, 44);
    CQ.audio.play("confetti");
    await R.wait(Math.max(0, ((C().audio && C().audio.winLaugh) || 1.2) * 1000 - 500));
    g.snore(1, 1.8, true); // "Sleep tight, Grumble!" (a moment about him: even if he snored a moment ago); the line waits for it
    await R.when(z.say(C().zippy.sleepTight, { keepPose: true }));
    z.pose("idle");
    CQ.track("level_complete", { level: CQ.hud.crowns });
    if (lineId) await say(lineId, { vars });
  }
  // Unequal masses: the alarm rings and Grumble wakes up. With a fright, Zippy lets go: the crown jumps
  // back onto the pan and the wrong bar goes back to its own stand (marked Tried); Zippy runs off the
  // screen. Grumble stands a moment, yawns and (after a soft fade: a little later) is asleep again. Zippy's
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
          const barAt = b.itemCenter(barItem); // the wrong bar flies home from here
          const barLook = getComputedStyle(barItem.el).filter;
          const barNum = panNumPx(barItem);
          const hand = z.holdPoint(); // the crown in his hands, in this frame
          const crownFrom = z.heldCrownW() / crownPx();
          const bar = CQ.Give.heldBar || CQ.bars.get(v);
          z.pose("shock");
          z.setHeld(null);
          // The crown flies back to its own place on the plate (it is taller than the bar, so it stands
          // higher) and lands exactly where it stays, looking as it does on the plate. The wrong bar
          // stays on the plate until the crown has nearly landed, then hops off home to its stand: the
          // plate is never empty and nothing jumps.
          const crownItem = b.replaceItem(barItem, { type: "crown" }, true);
          const crownLook = getComputedStyle(crownItem.el).filter;
          CQ.audio.play("zippy.eek");
          const landing = CQ.fly(CQ.world.drag, CQ.crownFlyer(crownPx()), hand, b.itemCenter(crownItem), {
            duration: 780,
            arc: -100,
            soft: true,
            scaleFrom: crownFrom,
            filterFrom: crownLook,
            filterTo: crownLook,
          });
          await R.wait(540);
          if (gen !== CQ.gen) return;
          barItem.el.remove();
          const s0 = barPx() / CQ.L.BAR_W;
          const home = bar ? CQ.Give.tossBack(bar, { tried: true, from: barAt, scaleFrom: s0, filterFrom: barLook, numFrom: barNum / s0 }) : null;
          await landing;
          if (gen !== CQ.gen) return;
          crownItem.el.style.visibility = "";
          b.evaluate();
          await home;
          if (gen !== CQ.gen) return;
          // ...and he swings away to the left!
          z.pose("hide");
          CQ.audio.play("slide.up");
          await z.swingAway();
        },
      })
    );
    // no fade (asked 2026-11-09): Grumble has gone back to sleep in plain view; a moment later only
    // Zippy's smiling head leans out from behind the tree: is he asleep? He blinks at him, then swings
    // back in.
    await R.wait(900);
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
    CQ.screen.shade("dark", 2);
    CQ.camera.set(600, 400, 1.3); // the corner Zippy drops into
    g.snore(1, 1.2); // Grumble's snoring is heard in the dark, then the jungle fades in
    await R.wait(1300);
    CQ.world.darkness(0, 1400);
    await R.wait(800);
    // Meet Zippy! He spots a golden crown.
    const drop = z.dropIn();
    await R.wait(650);
    CQ.spot.on(() => z.center(), 270, CQ.world.zippyLayer);
    await R.when(drop);
    const zp = CQ.camera.toScreen(z.center());
    const zb = CQ.nameBurst(C().names.zippy, C().names.zippyTag, zp.x + 640, zp.y - 110, "orange");
    z.pose("celebrate");
    CQ.audio.play("zippy.giggle");
    const meet = say("intro-1", { advance: "auto", pause: 700 });
    await R.wait(1500);
    CQ.hideBurst(zb);
    CQ.spot.off();
    z.pose("idle");
    await R.when(CQ.camera.to(960, 540, 1, 1100));
    const crown = b.find("left", (it) => it.type === "crown");
    const cc = b.itemCenter(crown);
    crown.el.classList.add("glint");
    crown.el.addEventListener("animationend", () => crown.el.classList.remove("glint"), { once: true }); // it glints twice, then rests
    CQ.fx.sparkle(CQ.world.fx, cc.x, cc.y, 14, 80);
    CQ.audio.play("crown.sparkle");
    await meet;
    // Grumble guards the treasure. Luckily, he's asleep!
    await R.when(CQ.camera.to(300, 760, 1.65, 1300));
    g.hush();
    g.snore(1, 2.2, true); // Grumble guards the treasure. Luckily, he's asleep! (the line waits for it)
    CQ.spot.on(() => g.center(), 430, CQ.world.grumbleLayer); // the same spotlight as Zippy's
    await R.wait(450);
    const gb = CQ.nameBurst(C().names.grumble, C().names.grumbleTag, 1250, 400, "purple");
    await say("intro-2", { advance: "auto" });
    await say("intro-3", { advance: "auto", pause: 700 });
    await CQ.hideBurst(gb);
    CQ.spot.off();
    await R.when(CQ.camera.to(960, 540, 1, 1300));
    // If the balance tips, the alarm will wake Grumble: a cloud above sleeping Grumble's head, its trail
    // pointing at him, shows it (the balance tips, RING! RING!, and he wakes up roaring). Everything else
    // fades back, so the cloud is all there is to look at.
    CQ.audio.play("zippy.gulp");
    const gh = g.headTop();
    const th = CQ.thought({ x: gh.x + 380, y: gh.y - 212 }, miniTipScene(), { w: 760, h: 500, cls: "over-grumble" }); // its trail ends at his head, its top clear of the question bar
    th.querySelector(".mini-scene").prepend(CQ.miniBalance({ width: 240, left: "bar", right: "coins3" })); // (sizes: all inside the cloud)
    const miniG = new CQ.Sprite(th.querySelector(".ms-grumble"), "", 0.34);
    miniG.show("grumble_roar", 7);
    CQ.focus.dimAll();
    setTimeout(() => {
      if (!th.isConnected) return;
      th.classList.add("tip");
      CQ.audio.play("alarm", { volume: 0.45 });
    }, 900);
    setTimeout(() => {
      if (th.isConnected) CQ.audio.play("grumble.roar", { volume: 0.35 });
    }, 1900);
    await say("intro-4", { advance: "auto", pause: 1000 });
    look(null);
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
    // the mini balance is added after; when it tips, the alarm word shows and an arrow points at Grumble
    const arrow = `<svg class="ms-arrow" viewBox="0 0 100 54" aria-hidden="true"><path d="M6 27 H66" stroke="#6b3e00" stroke-width="22" stroke-linecap="round"/><path d="M6 27 H66" stroke="#ffd84d" stroke-width="12" stroke-linecap="round"/><path d="M60 7 L95 27 L60 47 Z" fill="#ffd84d" stroke="#6b3e00" stroke-width="5" stroke-linejoin="round"/></svg>`;
    return `<div class="mini-scene"><div class="ms-alarm">${C().grumble.alarm}</div>${arrow}<div class="ms-grumble"></div></div>`;
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
    b.counting = true;
    if (key === "L1") look(barEls, { pad: 20 }); // which bar? these!
    if (key === "L3") CQ.grumble.snore(1); // One more crown. Grumble is still asleep!
    for (let i = 0; i < L.intro.length; i++) await say(L.intro[i], { advance: i < L.intro.length - 1 ? "auto" : "none" });
    // Level 1: the hand shows how with the right bar, the crown's mass (review, 2026-11-07: "for the
    // first time when we are explaining what to do, do it with the correct answer, 5")
    const show = key === "L1" ? L.crown : null;
    if (key === "L1") {
      CQ.focus.offAfter(2400); // before the hand shows how
      // after the bars have shown they can be picked up. The idle help waits: it counts from when the
      // hand is done (so the hand doesn't show it twice in a row).
      setTimeout(() => {
        const showing = demoGive(show);
        if (!showing) return;
        CQ.idle.reset();
        showing.then(() => CQ.idle.reset(), () => {});
      }, 2700);
    }
    let attempts = 0;
    for (;;) {
      const v = await giveThenSwap(L.bars.filter((x) => CQ.bars.get(x).state !== "tried"), show);
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
    look(strip, { text: true });
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
    // straight on into the formula screen, in the same dark (it never lifts in between): the strip
    // fades, the view glides to the balance at the right, and x + 2 = 7 is written in at the left
    await R.when(CQ.anim(strip, [{ opacity: 1 }, { opacity: 0 }], { duration: 450, essential: true }));
    strip.remove();
    const opening = CQ.notebook.open();
    look(null); // the look's dark hands over to the formula screen's
    b.setSign("x + 2 = 7"); // (for screen readers: nothing is shown over the balance)
    await R.when(opening);
    await CQ.notebook.run(CQ.NB_WORDS, { lower: true });
    await R.when(CQ.notebook.close());
  }
  async function runL4c() {
    await CQ.activityLabel();
    await R.when(CQ.notebook.open());
    await CQ.notebook.run(CQ.NB_LINEAR, { lower: true });
    await R.when(CQ.notebook.close());
  }
  async function runL4e() {
    await CQ.activitySort();
    await CQ.activityRecap();
  }
  // Finding the crown's mass, like the PPT: on the formula screen, try 4 (6 ≠ 7, not a solution), then
  // 5 (7 = 7, the solution). Back in the room: the crown's mass is 5 units, so the child gives Zippy
  // the 5 bar and he makes the swap.
  async function runL4g() {
    await R.when(CQ.notebook.open());
    await CQ.notebook.run(CQ.NB_TRY);
    await R.when(CQ.notebook.restore()); // the crown back on its pan (5 was put in for it), for the swap
    await R.when(CQ.notebook.close());
    CQ.bars.setVisible(true, 700); // the gold bars come back for the swap
    CQ.bars.glow(5, true); // x = 5 is the solution: the 5 bar glows as it comes back, "this one"
    await say("l4-30", { advance: "auto" });
    say("l4-give", { advance: "none" }); // Drag the 5 bar to Zippy, then tap Swap.
    const v = await giveThenSwap([5]);
    await swapAndCollect(v);
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
  // child), then LHS and RHS are compared.
  // o: { from, line, find, rhsGiven, calc, notLines, yesLines }  (line ids from content.js)
  async function checkRoutine(L, v, o) {
    o = o || {};
    const cp = CQ.checkPanel;
    const z = CQ.zippy;
    const b = CQ.balance;
    const k = L.crowns || 1;
    const a = L.leftBar || L.left;
    const bb = L.rightBar || sum(L.right);
    const s = k * v + a;
    const vars = { v, s, a, b: bb, k, kv: k * v };
    b.counting = false;
    b.clearCounts();
    CQ.bars.setVisible(false);
    if (z.held && z.held.type === "bar") z.pose("barThink"); // he looks at the bar while it is checked
    // Like the formula screen: the view glides until the balance stands at the right, bright, with the
    // rest dark, and the check is worked at the left, one row at a time, the equation itself kept in
    // sight at the top. The frame on the balance follows it: the crown (x), the left pan (LHS), the
    // right pan (RHS); then the balance shows the totals (review, 2026-11-08).
    await R.when(cp.open());
    CQ.frameBalance("crown");
    await R.when(cp.show({ k, a, b: bb, rhsGiven: o.rhsGiven }));
    // "Replace x with 4": the value comes out of the crown (x is the crown's mass) into x = 4, and on the
    // balance the crown makes way for four unit coins beside the coins there, all of them then gathered
    // into one group (a gold bar of the value, where a bar lies beside the crown), while it is said. The
    // balance stays level for now.
    const line = o.line ? say(o.line, { vars, advance: "auto", pause: 0 }) : null;
    if (line) line.catch(() => {}); // (a chapter jump during the flight cancels both: no stray error)
    const crown = b.items.left.find((it) => it.type === "crown" && !it.ghost) || b.items.left.find((it) => it.type === "crown");
    const from = o.from || (crown ? b.itemCenter(crown) : z.holdPoint());
    await R.when(Promise.all([cp.substitute(v, from), CQ.xPan.put(v)]));
    if (line) await line;
    // the left side: the left pan, and LHS: 4 + 3 = ? as "Find the value of each side" is said
    CQ.frameBalance("left");
    const ch = chipsFor(L, v);
    if (o.find) say(o.find, { vars, advance: "none" });
    await R.when(cp.lhsRow());
    await cp.fill("lhs", ch.lhs, s, (m) => {
      if (k > 1) return say("hint-lhs-k", { vars, advance: "none" });
      const seq = [];
      for (let i = 1; i <= a && i <= 8; i++) seq.push(v + i);
      say("hint-lhs", { vars: Object.assign({ seq: seq.join(", ") }, vars), advance: "none" });
      if (m >= 2 && L.left) b.autoCount("left", v).catch(() => {});
    });
    if (o.calc) await say(o.calc, { vars, advance: "auto" });
    // then the right side: the right pan, and RHS: 9 = ?
    CQ.frameBalance("right");
    await R.when(cp.side());
    if (!o.rhsGiven) await cp.fill("rhs", ch.rhs, bb, () => say("hint-rhs", { advance: "none" }));
    await R.wait(350);
    // The two compared, as the voice says so ("They're different" / "Both sides equal"): 7 ≠ 9 (or 9 = 9)
    // comes in, and the balance shows the totals: it tips, the heavier side lower (7 < 9: the right pan),
    // or stays level, its hub flashing. The conclusion is only said, in the question bar ("The sides
    // aren't equal, so 4 is not a solution."): nothing is written under the comparison (review,
    // 2026-11-08). No frame round both pans.
    const eq = s === bb;
    CQ.focus.off();
    let compared = null;
    const compareNow = () => {
      if (!compared) {
        b.evaluate();
        if (eq) b.flashEmblem();
        compared = R.when(cp.compare(s, bb));
      }
      return compared;
    };
    const lines = eq ? o.yesLines || [] : o.notLines || ["check-not", "check-not-so"];
    for (let i = 0; i < lines.length; i++) {
      const said = say(lines[i], { vars });
      if (i === 0) {
        await R.when(untilSaid(CQ.T(lines[i], vars), eq ? "equal" : "different"));
        compareNow();
      }
      await said;
    }
    await compareNow();
    b.clearCounts();
    // the crown back on its pan before the view goes back to the scene
    await R.when(CQ.xPan.restore());
    // back to the whole scene
    await R.when(cp.close());
    CQ.bars.setVisible(true);
    if (!eq) {
      CQ.grumble.stir();
      if (z.held && z.held.type === "bar") z.pose("hold");
      await R.when(z.say(C().zippy.checked));
      await tossTried(v);
      return false;
    }
    if (z.held && z.held.type === "bar") {
      z.pose("barShow"); // it works: he shows the bar off
      setTimeout(() => z.held && z.held.type === "bar" && z.pose("hold"), 1500);
    }
    return true;
  }
  // The checked bar is in Zippy's hands: tap SWAP. Only a checked value gets here, so the balance stays level.
  async function swapAfterCheck(v, o) {
    o = o || {};
    say(o.tapLine || "check-now-swap", { advance: "none" });
    CQ.idle.arm(() => CQ.hand.tapAt(CQ.centerOf(CQ.swapBtn.el)), 8000);
    await R.when(CQ.swapBtn.wait());
    CQ.idle.disarm();
    return swapAndCollect(v, o);
  }
  // SWAP was tapped with a bar that works: the swap, and he collects the crown. (No "That works!": not
  // needed, review 2026-11-08.)
  async function swapAndCollect(v, o) {
    o = o || {};
    const { d } = await swapOnPan(v);
    if (d !== 0) return d;
    CQ.Give.useHeld();
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
    CQ.balance.setSign(`x + ${L.left} = ${sum(L.right)}`);
    for (let i = 0; i < L.tries.length; i++) {
      const v = L.tries[i];
      await R.when(z.say(CQ.fmt(i ? C().zippy.tryNext : C().zippy.tryN, { v })));
      say("l5-give", { vars: { v }, advance: "none" });
      await giveBar([v], { glow: true });
      const ok = await checkRoutine(L, v, { line: "check-replace", find: "check-find", yesLines: ["l5-yes"] });
      if (ok) return swapAfterCheck(v);
    }
  }

  // ------------------------------------------------------------------ LEVELS 6–7: your turn
  async function runIndependent(key) {
    const L = LV()[key];
    const S = L.say;
    CQ.balance.setSign(`x + ${L.left} = ${sum(L.right)}`);
    for (const id of L.intro) await say(id, { advance: "auto" });
    await say(S.prompt, { advance: "auto", pause: 150 });
    let misses = 0;
    for (;;) {
      const left = L.bars.filter((x) => CQ.bars.get(x).state !== "tried");
      const v = await giveBar(left);
      let ok;
      // the same check whichever bar it is, the right one first too: the child works out each side (review,
      // 2026-11-08: "Do not automatically fill in 10 for the LHS… Compare both sides only after the learner
      // completes these steps")
      if (misses === 0) ok = await checkRoutine(L, v, { line: S.firstTry, find: S.find, yesLines: [v === L.crown ? S.firstRight : S.success] });
      else ok = await checkRoutine(L, v, { line: S.nextTry, find: "check-find", yesLines: [S.success] });
      if (ok) return swapAfterCheck(v);
      misses++;
      CQ.track("hint_shown", { level: L.n, tier: misses });
      say("check-try-another", { advance: "none" });
    }
  }

  // ------------------------------------------------------------------ Levels 8 and 9: the smart way
  // Levels 8 and 9: two small trays, one under each pan, in the side view (review, 2026-11-08: "Reveal
  // two small drop trays beneath the pans"): the stool art, small, low enough that a pan tipped right
  // down still clears it. A bar taken off rests on its tray at its size on the pan.
  function makeTrays() {
    const b = CQ.balance;
    const w = 150;
    const h = (w * IMAGES.brickStand.h) / IMAGES.brickStand.w;
    const restY = 822; // where a bar rests on it (world y): a pan tipped right down ends ~780
    const mk = (side) => {
      const x = b.panCenter(side).x;
      const t = CQ.el("div", "ledge tray " + side, CQ.world.drag);
      CQ.box(t, x - w / 2, restY - h * CQ.L.STAND_REST, w, h);
      t.rest = { x, y: restY };
      t.barW = barPx();
      CQ.anim(t, [{ opacity: 0, transform: "translateY(24px)" }, { opacity: 1, transform: "translateY(0)" }], { duration: 520, easing: CQ.EASE.out, keep: false });
      return t;
    };
    return { left: mk("left"), right: mk("right") };
  }
  // Values tried for x, quickly, on the balance (Level 8: review, 2026-11-08), with no child input and
  // no verdicts: for each, the crown (or the bar before) makes way for a gold bar of the value beside the
  // a bar, "v + a = sum" shows by the balance, and the balance tips the way the totals say, further the
  // further apart they are (20 is nearer 23 than 18 is). Then the crown is back and the balance level.
  async function tryValues(values, a, total) {
    const b = CQ.balance;
    let cur = b.items.left.find((it) => it.type === "crown" && !it.ghost);
    if (!cur) return;
    let label = null;
    const swapIn = async (spec) => {
      await R.when(CQ.anim(cur.el, [{ opacity: 1, transform: "scale(1)" }, { opacity: 0, transform: "scale(0.5)" }], { duration: 300, easing: CQ.EASE.in, essential: true }));
      cur = b.replaceItem(cur, spec);
      cur.el.style.visibility = "";
      CQ.anim(cur.el, [{ opacity: 0, transform: "scale(0.5)" }, { opacity: 1, transform: "scale(1)" }], { duration: 360, easing: CQ.EASE.back, keep: false });
      CQ.audio.play("ui.pop", { volume: 0.6 });
    };
    for (const v of values) {
      await swapIn({ type: "bar", value: v, slot: "main" });
      const sum = `${v} + ${a} = ${v + a}`;
      if (!label) {
        label = CQ.el("div", "wlabel trial", CQ.world.drag, CQ.rich(sum));
        CQ.pos(label, CQ.L.BX + 560, 470); // beside the balance, at its right
      } else label.innerHTML = CQ.rich(sum);
      CQ.anim(label, [{ transform: "translate(-50%,-50%) scale(.4)", opacity: 0 }, { transform: "translate(-50%,-50%) scale(1)", opacity: 1 }], { duration: 380, easing: CQ.EASE.back, keep: false });
      await R.wait(450);
      const d = total - (v + a);
      b.target = Math.sign(d) * Math.min(16, 4 + 2 * Math.abs(d)); // the right pan lower, by less as they near
      b.setEmblem(d === 0);
      CQ.audio.play("balance.creak");
      b.pendingClang = true;
      await R.wait(2300); // a moment to read it
    }
    // back as it was: the crown, and the balance level
    removeLabel(label);
    await swapIn({ type: "crown", slot: "main" });
    b.evaluate();
    await R.wait(1100);
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
  // The child takes a bar of value v off each pan, one at a time, with the working in view (Level 8:
  // review, 2026-11-08: "Let the learner remove either 8 bar first… The balance should tilt
  // temporarily… Now remove 8 from the other side… The learner performs the action, and the equation
  // updates alongside it"). Both bars glow gently and either can go first. A bar leaves its pan as it is
  // picked up, so the balance tips the moment one side is lighter and levels again when the other comes
  // off; wherever it is let go, it lands on the tray under its own pan. opts.off(side, n) runs as each
  // one is let go (n = 1, then 2), one after the other: it writes − v on that side of the equation. Then,
  // after the first, opts.next() if the other bar is still on its pan (the prompt for it); that bar is
  // highlighted from then on.
  function takeOffEach(v, trays, opts) {
    const b = CQ.balance;
    const items = {};
    ["left", "right"].forEach((s) => (items[s] = b.items[s].find((x) => x.type === "bar" && x.value === v && !x.ghost)));
    const numPx = panNumPx(items.left);
    const bar = () => {
      const f = CQ.barFlyer(v, barPx());
      f.style.fontSize = numPx + "px"; // its number as it reads on the pan
      return f;
    };
    const restPt = (s) => ({ x: trays[s].rest.x, y: trays[s].rest.y - (barPx() * IMAGES.bar.h) / IMAGES.bar.w / 2 }); // on the tray's top
    const onPan = (s) => !items[s].lifted;
    const demo = () => {
      const s = ["left", "right"].find(onPan);
      if (s) CQ.hand.drag(CQ.camera.toScreen(b.itemCenter(items[s])), CQ.camera.toScreen(restPt(s)), 1);
    };
    ["left", "right"].forEach((s) => {
      items[s].el.classList.add("draggable", "glow", "soft");
      trays[s].classList.add("active");
      trays[s].numPx = numPx;
    });
    CQ.idle.arm(demo, 7000);
    const demoTimer = setTimeout(demo, 600);
    return R.when(
      new Promise((res) => {
        let held = null; // the bar being carried: { s, proxy, grab }
        let n = 0;
        let chain = Promise.resolve();
        const lift = (s, pt) => {
          const it = items[s];
          clearTimeout(demoTimer);
          CQ.hand.stop();
          CQ.idle.disarm();
          const c = b.itemCenter(it);
          const proxy = bar();
          proxy.classList.add("flyer");
          CQ.world.drag.appendChild(proxy);
          CQ.pos(proxy, c.x, c.y);
          proxy.style.transform = "translate(-50%,-50%)";
          held = { s, proxy, grab: pt ? { dx: c.x - pt.x, dy: c.y - pt.y } : { dx: 0, dy: 0 } };
          // Off the pan now: one side is lighter and the balance tips (the second time, it levels). The bar
          // stays in the page, unseen, until it is let go: it owns the pointer capture.
          it.lifted = true;
          const list = b.items[s];
          list.splice(list.indexOf(it), 1);
          b.layout(s);
          it.el.style.opacity = "0";
          b.evaluate();
          CQ.audio.play("bar.pick");
        };
        const place = () => {
          if (!held) return;
          const { s, proxy } = held;
          held = null;
          items[s].el.remove();
          const from = { x: parseFloat(proxy.style.left), y: parseFloat(proxy.style.top) };
          proxy.remove();
          const k = ++n;
          const o = s === "left" ? "right" : "left";
          if (k === 1) items[o].el.classList.remove("soft"); // the one left: highlighted (the full orange glow)
          const fl = bar();
          const landed = CQ.fly(CQ.world.drag, fl, from, restPt(s), { duration: 560, arc: -70, remove: false }).then(() => {
            fl.classList.remove("flyer");
            fl.classList.add("ledge-bar");
            CQ.pos(fl, restPt(s).x, restPt(s).y);
            fl.style.transform = "translate(-50%,-50%)";
            trays[s].bar = fl;
            trays[s].classList.remove("active");
            CQ.audio.play("bar.place");
          });
          // the equation changes at once, while the bar is on its way to the tray
          chain = chain
            .then(() => opts.off && opts.off(s, k))
            .then(() => landed)
            .then(() => {
              if (k === 2) return res();
              if (!onPan(o)) return;
              if (opts.next) opts.next(o);
              CQ.idle.arm(demo, 7000);
            });
        };
        ["left", "right"].forEach((s) => {
          const it = items[s];
          CQ.drag(it.el, {
            enabled: () => !held && onPan(s),
            start: (pt) => lift(s, CQ.camera.toWorld(pt)),
            move: (pt) => {
              if (!held || held.s !== s) return;
              const w = CQ.camera.toWorld(pt);
              CQ.pos(held.proxy, w.x + held.grab.dx, w.y + held.grab.dy);
            },
            end: () => {
              if (held && held.s === s) place();
            },
            tap: () => {
              if (held && held.s === s) place();
            },
            key: () => {
              if (!held && onPan(s)) lift(s, null);
              if (held && held.s === s) place();
            },
          });
          it.el.tabIndex = 0;
          it.el.setAttribute("role", "button");
          it.el.setAttribute("aria-label", `Gold bar ${v} on the ${s} pan: take it off the balance`);
        });
      })
    );
  }
  // The bars are off, so the trays go, with the bars on them (review, 2026-11-08: "hide the drop trays
  // once the removal is complete"). Where the bars lay is kept: they come back from there for the check.
  function hideTrays(trays) {
    return Promise.all(
      ["left", "right"].map((s) => {
        const t = trays[s];
        t.from = { x: parseFloat(t.bar.style.left), y: parseFloat(t.bar.style.top) };
        const fade = (e) => CQ.anim(e, [{ opacity: 1 }, { opacity: 0 }], { duration: 500, easing: CQ.EASE.in });
        return Promise.all([fade(t), fade(t.bar)]).then(() => {
          t.bar.remove();
          t.bar = null;
          t.remove();
        });
      })
    );
  }
  // For the check, the two bars come back into view where they lay and go back onto their pans; then
  // the right pan's bars join back into one bar.
  async function putBack(trays, v, merged) {
    const b = CQ.balance;
    const moves = ["left", "right"].map((side) => {
      const t = trays[side];
      const fl = CQ.barFlyer(v, t.barW);
      fl.style.fontSize = t.numPx + "px";
      const to = b.panCenter(side);
      const flight = CQ.fly(CQ.world.drag, fl, t.from, { x: to.x + (side === "left" ? 80 : -80), y: to.y }, { duration: 850, arc: -160 });
      CQ.anim(fl, [{ opacity: 0 }, { opacity: 1 }], { duration: 320, keep: false });
      return flight;
    });
    CQ.audio.play("ui.swoosh");
    await R.when(Promise.all(moves));
    b.addItem("left", { type: "bar", value: v, slot: "extra" });
    b.addItem("right", { type: "bar", value: v }, 0);
    b.evaluate();
    CQ.audio.play("bar.place");
    await R.wait(500);
    CQ.audio.play("bar.merge");
    const c = b.panCenter("right");
    CQ.fx.sparkle(CQ.world.fx, c.x, c.y - 30, 12, 90);
    b.setPan("right", [{ type: "bar", value: merged, w: 170 }]);
    b.evaluate();
    await R.wait(600);
  }
  // ------------------------------------------------------------------ LEVEL 8: the smart way
  async function runL8() {
    const L = LV().L8;
    const z = CQ.zippy;
    const b = CQ.balance;
    const eb = CQ.eqBoard;
    b.setSign("x + 8 = 23");
    z.pose("curious");
    await say("l8-1", { advance: "auto" });
    // "The crown and 8 units balance 23 units." (review, 2026-11-08): the view comes a little closer, so
    // the numbers on the bars read easily, and the parts light up as the voice says them: the crown and
    // the 8 bar together, then the 23 bar. No box round both pans; the balance stays level. (The view
    // stays closer until the working opens.)
    await R.when(CQ.camera.to(CQ.L.BX, 560, 1.15, 900));
    const l82 = CQ.T("l8-2");
    const saying = say("l8-2");
    await R.when(untilSaid(l82, "The crown and 8 units"));
    b.glowItems("left");
    await R.when(untilSaid(l82, "balance 23"));
    b.glowItems("left", null, false);
    b.glowItems("right");
    await saying;
    b.clearGlow();
    z.pose("idle");
    // Trying values first, quickly, on the balance (review, 2026-11-08): "Let's try different values of
    // x." The crown makes way for a 10 bar (10 + 8 = 18: the balance tips, the right pan lower), then a
    // 12 bar (12 + 8 = 20: the beam comes nearer to level), then the crown is back and the balance level.
    // Then "Trying different values could take a while." (No "I know!": every line is in the question
    // bar.)
    await say("l8-try", { advance: "auto" });
    await tryValues([10, 12], 8, 23);
    await say("l8-3", { advance: "auto" });
    // The working, like the formula screen (CQ.eqBoard): as "Let's find the mass of the crown directly"
    // is said, the view glides until the balance stands at the right, the crown gently lit, and
    // x + 8 = 23 is written in at the left.
    b.setSign(null);
    glowCrown(true);
    const l84 = say("l8-4", { advance: "auto" });
    await R.when(eb.open());
    await R.when(eb.show("x + 8 = 23"));
    await l84;
    glowCrown(false);
    // "First, split 23 into 8 and 15": the 23 bar lights up and splits into an 8 bar and a 15 bar on its
    // pan, while x + 8 = 8 + 15 is written in under x + 8 = 23 (its = under the other, 8 + 15 lit). The
    // balance stays level: splitting a bar doesn't change its mass.
    const l85 = say("l8-5");
    look(panEls("right"));
    await Promise.all([splitBar("right", b.items.right[0], [8, 15]), R.when(eb.set("x + 8 = ##8 + 15##"))]);
    await l85;
    // There are 8 units beside the crown…
    b.glowItems("left", (it) => it.type === "bar");
    look(leftBarEls);
    await say("l8-6");
    // …so remove 8 from both sides. (Both 8 bars glow: no box round both pans.)
    b.glowItems("right", (it) => it.value === 8);
    look(null);
    await say("l8-7");
    b.clearGlow();
    // The child takes them off right here, one side at a time, with the working in view (review,
    // 2026-11-08: "Keep this interaction on the previous screen… The learner performs the action, and
    // the equation updates alongside it"; it used to go back to the whole scene, where one drag took
    // both off). Two small trays come in under the pans and both 8 bars glow gently: "Drag an 8 bar off
    // each side of the balance." As each lands on its tray, − 8 is written on its side of the equation
    // (x + 8 − 8 = 8 + 15 − 8, its = under the others). The first leaves the balance tipped; then "Now
    // remove 8 from the other side.", the other bar lit up; the second levels it.
    const trays = makeTrays();
    say("l8-8-drag", { advance: "none" });
    const minus = (s) => (s === "left" ? ".eb-l .same" : ".eb-r .same");
    await takeOffEach(8, trays, {
      off: (s, n) => R.when(n === 1 ? eb.set("x + 8 {{− 8}} = 8 + 15 {{− 8}}", { hold: minus(s === "left" ? "right" : "left"), each: 40 }) : eb.reveal(minus(s))),
      next: () => say("l8-other", { advance: "none" }),
    });
    CQ.audio.play("balance.level");
    b.flashEmblem();
    await R.wait(600);
    // The removal done, the trays go, with the 8 bars on them: the crown stands opposite the 15 bar on
    // their own (review, 2026-11-08: "hide the drop trays once the removal is complete").
    await R.when(hideTrays(trays));
    await R.wait(400);
    // "Now the crown balances 15 units. So, x = 15." (review, 2026-11-08): the crown lights up as it is
    // named, then the 15 bar as "15 units" is said, each by itself (no box round both pans); on "So,
    // x = 15" the answer is written under the subtraction step, big and green in its outline.
    const l89 = CQ.T("l8-9");
    const saying9 = say("l8-9", { hold: 2600 }); // key moment: x = 15
    await R.when(untilSaid(l89, "the crown"));
    b.glowItems("left", (it) => it.type === "crown");
    await R.when(untilSaid(l89, "15 units"));
    b.glowItems("left", null, false);
    b.glowItems("right", (it) => it.value === 15);
    await R.when(untilSaid(l89, "So, x = 15"));
    b.clearGlow();
    await R.when(eb.set("x = 15", { final: true }));
    CQ.audio.play("correct");
    await saying9;
    look(null);
    await R.when(eb.close());
    // Check it in the original equation (the number flies out of the crown: the crown is x).
    await say("l8-10", { advance: "auto" });
    await putBack(trays, 8, 23);
    b.setSign("x + 8 = 23");
    const crown = b.find("left", (it) => it.type === "crown");
    await checkRoutine(L, 15, { from: b.itemCenter(crown), rhsGiven: true, line: "l8-11", find: "check-find-lhs", calc: "l8-12", yesLines: ["l8-13"] });
    // The swap: only a checked value gets the SWAP button.
    await say("l8-14", { advance: "auto" });
    say("l8-give", { advance: "none" });
    for (;;) {
      const v = await giveBar(L.bars.filter((x) => CQ.bars.get(x).state !== "tried"));
      if (v !== 15) {
        await checkRoutine(L, v, { line: "check-lets", find: "check-find-lhs", rhsGiven: true });
        say("l8-give", { advance: "none", quiet: true }); // the same prompt again: shown, not said again
        continue;
      }
      await swapAfterCheck(15, { line: "l8-15", sign: "15 + 8 = 23" });
      return;
    }
  }

  // ------------------------------------------------------------------ LEVEL 9: two matching crowns
  async function runL9() {
    const L = LV().L9;
    const z = CQ.zippy;
    const b = CQ.balance;
    const eb = CQ.eqBoard;
    z.pose("curious");
    // The working, like the formula screen, from the start, and the whole solving sequence stays on it,
    // the bars taken off here too (review, 2026-11-08: "Keep the whole solving sequence on the same
    // learning screen, with the balance on the right and the equation steps on the left").
    await R.when(eb.open());
    z.pose("idle");
    // "Each crown has the same mass, x." (review, 2026-11-08): two crowns and a 4 bar on the left pan
    // balance an 18 bar. As x + x + 4 = 18 is written in, each x lights up with its own crown (and an x
    // comes over that crown), one after the other. No box round the crowns.
    const crowns = b.items.left.filter((it) => it.type === "crown");
    const xs = [];
    const said1 = say("l9-1");
    await R.when(
      eb.show("x + x + 4 = 18", {
        each: 140, // (slowly: the two x's come about half a second apart)
        onWrite: [
          "i.v",
          (el, i) => {
            el.classList.add("x-lit");
            crowns[i].el.classList.add("glow");
            const c = b.itemCenter(crowns[i]);
            xs[i] = worldLabel('<i class="v">x</i>', c.x, c.y - 80, "xlabel small");
          },
        ],
      })
    );
    await said1;
    eb.el.querySelectorAll(".x-lit").forEach((e) => e.classList.remove("x-lit"));
    glowCrown(false);
    await R.wait(450); // (a moment unlit, so both crowns lighting up together is seen as the next step)
    // "Two lots of x make 2x." (review, 2026-11-08: "Highlight x + x, then reveal 2x + 4 = 18 beneath
    // it. Highlight the two crowns together, keeping them as separate objects"): as the line starts,
    // x + x lights up as one in the first row and both crowns light up at once, each by itself (still two
    // crowns, each with its x over it: no box, no one label over both); on "make 2x", 2x + 4 = 18 is
    // written under it, 2x in gold. (From here on each line starts with its step, so the question bar
    // always shows the line for what is happening: same review, "Update the top instruction panel for
    // each VO line".)
    const l92 = CQ.T("l9-2");
    const said2 = say("l9-2");
    const [xa, xb] = eb.el.lastElementChild.querySelectorAll("i.v");
    const xx = eb.light(xa, xb);
    glowCrown(true);
    await R.when(untilSaid(l92, "make"));
    await R.when(eb.set("##2x## + 4 = 18"));
    await said2;
    xx.classList.remove("x-lit");
    glowCrown(false);
    xs.forEach(removeLabel);
    // First, let's remove these 4 units.
    b.glowItems("left", (it) => it.type === "bar");
    look(leftBarEls);
    eb.set("2x <<+ 4>> = 18", { same: true }); // the same step: these 4 units marked
    await say("l9-3");
    b.clearGlow();
    // Split 18 into 4 and 14: the 18 bar splits on its pan while 2x + 4 = 4 + 14 is written, 4 + 14 lit
    // (as in Level 8).
    const said4 = say("l9-4");
    look(panEls("right"));
    await Promise.all([splitBar("right", b.items.right[0], [4, 14]), R.when(eb.set("2x + 4 = ##4 + 14##"))]);
    await said4;
    // Remove 4 from both sides. (Both 4 bars glow: no box round both pans.)
    look(null);
    b.glowItems("left", (it) => it.type === "bar");
    b.glowItems("right", (it) => it.value === 4);
    await say("l9-5");
    b.clearGlow();
    // The child takes them off right here, one side at a time, with the working in view, as in Level 8
    // (review, 2026-11-08: "Keep the whole solving sequence on the same learning screen"; it used to go
    // back to the whole scene, where one drag took both off): two small trays under the pans, "Drag a 4
    // bar off each side of the balance.", − 4 written on each side as its bar comes off, "Now remove 4
    // from the other side." after the first; then the trays go, with the bars on them.
    const ledges = makeTrays();
    say("l9-5-drag", { advance: "none" });
    const minus = (s) => (s === "left" ? ".eb-l .same" : ".eb-r .same");
    await takeOffEach(4, ledges, {
      off: (s, n) => R.when(n === 1 ? eb.set("2x + 4 {{− 4}} = 4 + 14 {{− 4}}", { hold: minus(s === "left" ? "right" : "left"), each: 40 }) : eb.reveal(minus(s))),
      next: () => say("l9-other", { advance: "none" }),
    });
    CQ.audio.play("balance.level");
    b.flashEmblem();
    await R.wait(900);
    // "The two crowns balance 14 units." (review, 2026-11-08: "Highlight the terms that cancel, then
    // reveal 2x = 14. The balance now shows two crowns opposite the 14 bar. Hide the drop trays."): as
    // the line starts the trays go, with the 4 bars on them, and the terms that cancel light up (+ 4 − 4
    // at the left, 4 and − 4 at the right); the crowns light up as "two crowns" is said, the 14 bar on
    // "14 units", when 2x = 14 is written under the subtraction step. (The review lists "We need the mass
    // of one crown" before this, but its 14 bar is split there, so this comes first.)
    look(null);
    const l9t = CQ.T("l9-two");
    const saidT = say("l9-two");
    const traysGone = R.when(hideTrays(ledges));
    const r4 = eb.el.lastElementChild;
    const s4l = r4.querySelector(".eb-l");
    const s4r = r4.querySelector(".eb-r");
    const plus = Array.from(s4l.children).find((e) => e.textContent === "+");
    const cancels = [eb.light(plus, s4l.querySelector(".same"), "c-lit"), eb.light(s4r.firstElementChild, s4r.firstElementChild, "c-lit"), eb.light(s4r.querySelector(".same"), s4r.querySelector(".same"), "c-lit")];
    await R.when(untilSaid(l9t, "two crowns"));
    glowCrown(true);
    await R.when(untilSaid(l9t, "14 units"));
    glowCrown(false);
    b.glowItems("right", (it) => it.value === 14);
    await R.when(eb.set("2x = 14"));
    await saidT;
    await traysGone;
    cancels.forEach((e) => e.classList.remove("c-lit"));
    b.clearGlow();
    // "We need the mass of one crown.": one crown lights up.
    const said6 = say("l9-6");
    crowns[0].el.classList.add("glow");
    await said6;
    crowns[0].el.classList.remove("glow");
    // "Divide both sides into two equal groups." (review, 2026-11-08: "Visually separate the crowns into
    // two groups of one. Split the 14 bar into two equal 7 bars, pairing each crown with one 7 bar
    // through matching highlights. Keep all objects on their pans so the balance remains level." and
    // "As the equal groups form, reveal beneath 2x = 14: 2x ÷ 2 = 14 ÷ 2. Highlight division by 2 on both
    // sides. Show that each group contains one crown and 7 units."): the crowns move a little apart on
    // their pan, each lit in a colour of its own (two groups of one); the 14 bar splits into two 7 bars,
    // which move a little apart too, each lit in the colour of one crown (each group: a crown and 7
    // units); and as the groups form, 2x ÷ 2 = 14 ÷ 2 is written, ÷ 2 marked on both sides. Everything
    // stays on the pans: the balance stays level.
    const said7 = say("l9-7");
    const apart = (pair, d) => pair.forEach((it, i) => (it.el.style.marginLeft = (i ? d : -d) + "px"));
    crowns[0].el.classList.add("grp-a");
    crowns[1].el.classList.add("grp-b");
    apart(crowns, 14);
    await R.wait(600);
    const divRow = R.when(eb.set("2x {{÷ 2}} = 14 {{÷ 2}}"));
    const sevens = await splitBar("right", b.items.right.find((it) => it.value === 14), [7, 7]);
    sevens[0].el.classList.add("grp-a");
    sevens[1].el.classList.add("grp-b");
    apart(sevens, 8);
    await divRow;
    await said7;
    // "Each crown has a mass of 7 units. So, x = 7." (review, 2026-11-08: "Reveal x = 7 as the final
    // line. Keep both crown–7 pairings visible; do not make objects disappear without an explanation"):
    // both groups stay lit and nothing fades away; x = 7 is written on "So, x = 7", big and green in
    // its outline.
    const l98 = CQ.T("l9-8");
    const said8 = say("l9-8", { hold: 2600 }); // key moment: x = 7
    await R.when(untilSaid(l98, "So, x = 7"));
    await R.when(eb.set("x = 7", { final: true }));
    CQ.audio.play("correct");
    await said8;
    // the groups end: their colours go, and the crowns and the 7 bars stand together again
    crowns.concat(sevens).forEach((it) => {
      it.el.classList.remove("grp-a", "grp-b");
      it.el.style.marginLeft = "";
    });
    look(null);
    await R.when(eb.close());
    // Check in the original equation, as in the levels before: everything goes back, then 7 goes in for
    // x.
    await putBack(ledges, 4, 18);
    b.setSign("2x + 4 = 18");
    await checkRoutine(L, 7, { from: b.itemCenter(crowns[0]), rhsGiven: true, line: "l9-9", find: "check-find-lhs", calc: "l9-calc", yesLines: ["l9-10"] });
    // Two swaps, one 7 bar for each crown.
    say("l9-give", { advance: "none" });
    let swapped = 0;
    while (swapped < 2) {
      const v = await giveBar(L.bars.filter((x) => CQ.bars.list.some((bar) => bar.value === x && bar.state === "idle")));
      if (v !== 7) {
        await checkRoutine(L, v, { line: "check-lets", find: "check-find-lhs", rhsGiven: true });
        say(swapped ? "l9-give2" : "l9-give", { advance: "none", quiet: true }); // the same prompt again: shown, not said again
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
