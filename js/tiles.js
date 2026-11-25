/*
 * Zippy's Crown Quest: number tiles, the practice board's answer control.
 *
 * No keypad (asked 2026-11-18: "calculator is looking very bad… remove that and place a drag and drop
 * on that equations… and place a hand nudge also, so that user can understand"). A row of golden number
 * tiles lies under the working; the child drags one into the answer box. A tap on a tile, or Enter on
 * it, sends it gliding in too. Dropping IS answering: there is no Check button.
 *
 * The tiles are not on show at first (asked 2026-11-19: "dont give options like this… let the user
 * click the box and then these appear as drop-down menu… And then user will drag"): the box waits with
 * a little arrow under it, and a tap on it (or Enter, Space) drops the tiles out of it into their row
 * under it, where they stay for the rest of that answer (a wrong one goes back to its tile).
 *
 *   const ctl = CQ.numberTiles(tray, box, options, { label, openLabel })
 *     tray     an empty element: it gets one tile per option, in a row (each keeps a faint tile in its
 *              place while it is away), unseen until the box is tapped (its room kept, so nothing moves
 *              when they come); then it stands under the box, as far as its parent lets it. label: what
 *              screen readers call the row.
 *     box      the answer box (the caller's: its size and place are left alone). It pulses while empty
 *              and lights up gold while a tile is held over it. openLabel: what screen readers call it
 *              while it waits to be tapped.
 *   ctl.show()       the tiles drop out of the box into their row (what a tap on the box does); resolves
 *                    when they are all in
 *   ctl.take()       the box can be tapped, then a tile taken; resolves with the number of the tile that
 *                    lands in the box (it now shows it, as CQ.num writes it), or with null if done() came
 *                    first
 *   ctl.right()      the box green, its tick, the chime (CQ.answer.right); the other tiles step back.
 *                    Resolves after the look, the box left holding only its number (its classes taken off)
 *   ctl.wrong(back)  the box red, it shakes its head, the try-again sound (CQ.answer.wrong). back: then the
 *                    number goes back to its tile, which stays struck out. Resolves when that is over
 *   ctl.glow(v)      the tile with v glows (the only one left to try, say)
 *   ctl.fill(v)      the game puts v in for the child: its tile glides into the box (no chime, no gate)
 *   ctl.demo()       the hand nudge: while the tiles are not out, the hand taps the box; then it carries a
 *                    faint tile from the row into the box. The tile is blank, so it never gives the answer
 *                    away (with one tile left, it is that one). The first time ever the tiles come out,
 *                    it shows the drag at once.
 *   ctl.nudge(ms)    the hand nudge whenever nothing happens for ms (CQ.idle; again every 12 s after)
 *   ctl.done()       hands off: no more dragging, no hand, no idle nudge; the tiles stay for the caller
 *
 * The look and sound of an answer are CQ.answer's and the hand is CQ.hand's, as everywhere in the game.
 * Motion is transform (translate, scale) and opacity only, time-based (CQ.anim / Web Animations): the
 * tiles come out of the box one after another, easing out into their places; a tile under a finger
 * follows it; dropped short of the box it glides home. Reduced motion: the tiles fade in where they lie,
 * the glides are shorter and the hand stands still (CQ.hand).
 */
(function () {
  "use strict";
  const CQ = window.CQ;
  const ZERO = { x: 0, y: 0 };
  const PAD = 50; // stage px round the box that still count as "in it" for a dropped tile
  const GRIP = { x: 0, y: 30 }; // the hand's fingertip on the tile it carries: under its middle, so the hand never hides the box
  const shift = (d) => `${d.x}px ${d.y}px`;
  const same = (a, b) => Math.abs(a - b) < 1e-9;
  const rectOf = (el, pad) => {
    const r = el.getBoundingClientRect();
    const a = CQ.stage.toStage(r.left, r.top);
    const z = CQ.stage.toStage(r.right, r.bottom);
    return { x0: a.x - pad, y0: a.y - pad, x1: z.x + pad, y1: z.y + pad };
  };
  const inside = (p, r) => p.x >= r.x0 && p.x <= r.x1 && p.y >= r.y0 && p.y <= r.y1;

  CQ.numberTiles = function (tray, box, options, opts) {
    opts = opts || {};
    tray.classList.add("nt-tray");
    tray.setAttribute("role", "group");
    if (opts.label) tray.setAttribute("aria-label", opts.label);
    const blank = box.innerHTML; // what the box shows while it waits ("?")
    box.classList.add("nt-drop", "nt-empty", "nt-shut");
    tray.classList.add("nt-shut");
    // shown: the tiles are out of the box (they stay out until done)
    const ctl = { tray, box, list: [], open: false, shown: false, alive: true, last: null };
    let showing = null; // show()'s promise, while the tiles come out
    let waiting = null; // take()'s resolve
    let nudgeFn = null; // the idle nudge armed by nudge()
    let held = null; // the tile under the child's finger (the hand never shows how meanwhile)
    // taking a tile or not (the row says so too: .nt-open, the tiles' grab hand only then)
    const setOpen = (v) => {
      ctl.open = v;
      tray.classList.toggle("nt-open", v);
    };

    // A tile's translate, from one shift to another (the end shift is set first, so nothing jumps when the
    // animation lets go of it).
    const glide = (t, from, to, ms, easing) => {
      t.at = to;
      t.style.translate = shift(to);
      return CQ.anim(t, [{ translate: shift(from) }, { translate: shift(to) }], { duration: ms, easing, keep: false });
    };
    // Lifted over the row, it goes into the box: it glides to the box's middle, and there its number is
    // in the box (the tile itself out of sight meanwhile).
    const land = async (t, ms, easing, quiet) => {
      setOpen(false);
      box.classList.remove("nt-hover");
      CQ.hand.stop();
      const from = t.at || ZERO;
      const at = CQ.centerOf(t);
      const z = CQ.centerOf(box);
      t.classList.add("nt-lifted");
      if (at && z) await glide(t, from, { x: from.x + z.x - at.x, y: from.y + z.y - at.y }, ms, easing);
      if (!ctl.alive && !quiet) return;
      t.classList.remove("nt-lifted");
      t.classList.add("nt-in");
      box.textContent = CQ.num(t.num);
      box.classList.remove("nt-empty");
      if (!quiet) CQ.audio.play("ui.pop");
      CQ.anim(box, [{ scale: "1.18" }, { scale: "1" }], { duration: 320, easing: CQ.EASE.back, keep: false });
      ctl.last = t;
      const r = waiting;
      waiting = null;
      if (r && !quiet) r(t.num);
    };
    // Dropped short of the box: back to its place in the row.
    const home = (t) => {
      t.moving = true;
      CQ.audio.play("bar.return");
      return glide(t, t.at || ZERO, ZERO, 300, CQ.EASE.out).then(() => {
        t.moving = false;
        t.classList.remove("nt-lifted");
        t.style.translate = "";
      });
    };
    // A tile that can't be picked any more: out of the keyboard's way too (the focus, if it had it, goes
    // on to the next tile still open, or off the row).
    const spend = (t) => {
      t.tabIndex = -1;
      t.setAttribute("aria-disabled", "true");
      if (document.activeElement === t) {
        const next = ctl.alive && ctl.list.find((x) => x !== t && !x.struck && x.tabIndex === 0);
        if (next) next.focus();
        else t.blur();
      }
    };

    options.forEach((v) => {
      const slot = CQ.el("div", "nt-slot", tray);
      const t = CQ.el("div", "nt-tile", slot, CQ.num(v));
      t.num = v;
      t.at = ZERO;
      t.tabIndex = -1; // (not to be reached until it is out of the box)
      t.setAttribute("role", "button");
      t.setAttribute("aria-label", CQ.num(v));
      const free = () => ctl.open && ctl.shown && ctl.alive && !t.struck && !t.moving;
      const over = (g) => g.at && inside({ x: g.at.x + t.at.x, y: g.at.y + t.at.y }, rectOf(box, PAD));
      let grab = null;
      CQ.drag(t, {
        enabled: free,
        start: (pt) => {
          grab = { pt, at: CQ.centerOf(t) };
          held = t;
          t.at = ZERO;
          t.classList.add("nt-lifted");
          CQ.audio.play("bar.pick");
          CQ.hand.stop();
        },
        move: (pt) => {
          if (!grab) return;
          t.at = { x: pt.x - grab.pt.x, y: pt.y - grab.pt.y };
          t.style.translate = shift(t.at);
          box.classList.toggle("nt-hover", !!over(grab));
        },
        end: () => {
          const g = grab;
          grab = null;
          held = null;
          box.classList.remove("nt-hover");
          if (!g) return;
          if (free() && over(g)) land(t, 160, CQ.EASE.out);
          else home(t);
        },
        tap: () => {
          grab = null;
          held = null;
          if (free()) land(t, 420, CQ.EASE.inOut);
          else t.classList.remove("nt-lifted");
        },
        key: () => {
          if (free()) land(t, 420, CQ.EASE.inOut);
        },
      });
      ctl.list.push(t);
    });

    // The row stands under the box (a drop-down from it), as far as the row's parent lets it go: it is
    // put there while it is still unseen, so it never moves in sight (left: not animated).
    const underBox = () => {
      const host = tray.parentNode;
      if (!host) return;
      tray.style.position = "relative";
      tray.style.left = "0px";
      const k = CQ.stage.scale || 1;
      const b = box.getBoundingClientRect();
      const t = tray.getBoundingClientRect();
      const h = host.getBoundingClientRect();
      const dx = (b.left + b.width / 2 - (t.left + t.width / 2)) / k;
      tray.style.left = Math.max((h.left - t.left) / k, Math.min((h.right - t.right) / k, dx)) + "px";
    };
    // The tiles drop out of the box, one after another, each from the box's middle to its place in the
    // row, small and faint to full size (Reduced motion: they fade in where they lie). The first time ever,
    // the hand then shows how one goes in.
    ctl.show = () => {
      if (showing) return showing;
      underBox();
      const z = CQ.centerOf(box);
      const from = ctl.list.map((t) => {
        const c = CQ.centerOf(t);
        return z && c ? { x: z.x - c.x, y: z.y - c.y } : ZERO;
      });
      ctl.shown = true;
      box.classList.remove("nt-shut");
      tray.classList.remove("nt-shut");
      box.removeAttribute("role");
      box.removeAttribute("aria-label");
      box.removeAttribute("aria-expanded");
      box.removeAttribute("tabindex");
      CQ.audio.play("ui.pop");
      CQ.hideNow(ctl.list); // (just measured: hidden at once, not faded out by .nt-tile's transition)
      const all = ctl.list.map((t, i) => {
        const kf = CQ.motion.reduced
          ? [{ opacity: 0 }, { opacity: 1 }]
          : [
              { opacity: 0, translate: shift(from[i]), scale: "0.4" },
              { opacity: 1, translate: "0px 0px", scale: "1" },
            ];
        return CQ.anim(t, kf, {
          duration: CQ.motion.reduced ? 200 : 460,
          delay: i * 80,
          easing: CQ.EASE.out,
          keep: false,
          essential: true,
        }).then(() => (t.style.opacity = ""));
      });
      ctl.list.forEach((t) => !t.struck && (t.tabIndex = 0));
      showing = Promise.all(all).then(() => {
        if (!ctl.alive || !ctl.open) return;
        if (!CQ.store.get("tileDragSeen", false)) {
          CQ.store.set("tileDragSeen", true);
          ctl.demo();
        }
      });
      return showing;
    };
    // The box, while the tiles are in it: a button that lets them out (read as such; it gets the focus's
    // ring). Tapped again once they are out, they give a little hop: here they are.
    box.setAttribute("role", "button");
    box.setAttribute("aria-expanded", "false");
    if (opts.openLabel) box.setAttribute("aria-label", opts.openLabel);
    const tapBox = () => {
      if (!ctl.alive || !ctl.open) return;
      CQ.hand.stop();
      CQ.anim(box, [{ scale: "0.9" }, { scale: "1" }], { duration: 220, easing: CQ.EASE.out, keep: false });
      if (!ctl.shown) {
        const kb = document.activeElement === box; // (from the keyboard: then on to the first tile)
        CQ.audio.play("ui.tap");
        ctl.show().then(() => {
          if (!kb || !ctl.alive || held) return;
          const first = ctl.list.find((x) => !x.struck && x.tabIndex === 0);
          if (first) first.focus();
        });
      } else if (!CQ.motion.reduced && !held) {
        CQ.anim(tray, [{ translate: "0px 0px" }, { translate: "0px -12px" }, { translate: "0px 0px" }], { duration: 280, easing: CQ.EASE.out, keep: false });
      }
    };
    box.addEventListener("click", tapBox);
    box.addEventListener("keydown", (e) => {
      if (e.key !== "Enter" && e.key !== " ") return;
      e.preventDefault();
      tapBox();
    });

    ctl.take = () => {
      if (!ctl.alive) return Promise.resolve(null);
      setOpen(true);
      if (!ctl.shown) box.tabIndex = 0;
      return new Promise((res) => (waiting = res));
    };

    ctl.right = () => {
      box.classList.add("nt-ok");
      CQ.answer.right(box, { pulse: false }); // (it popped as the number went in)
      ctl.list.forEach((t) => {
        spend(t);
        if (t !== ctl.last) t.classList.add("nt-spent");
      });
      return CQ.sleep(900).then(() => {
        box.classList.remove("nt-drop", "nt-empty", "nt-hover", "nt-ok", "nt-no", "is-right");
      });
    };

    ctl.wrong = async (back) => {
      const t = ctl.last;
      box.classList.add("nt-no");
      const shook = CQ.answer.wrong(box);
      await shook;
      if (!back || !t) return;
      await CQ.sleep(250);
      // its number goes back to its tile, which stays struck out
      box.innerHTML = blank;
      box.classList.remove("nt-no");
      box.classList.add("nt-empty");
      t.struck = true;
      spend(t);
      t.classList.remove("nt-in", "nt-glow");
      t.classList.add("nt-struck");
      ctl.last = null;
      CQ.audio.play("bar.return");
      await glide(t, t.at || ZERO, ZERO, 420, CQ.EASE.inOut);
      t.style.translate = "";
    };

    ctl.glow = (v) => ctl.list.forEach((t) => t.classList.toggle("nt-glow", same(t.num, v) && !t.struck));

    ctl.fill = async (v) => {
      const t = ctl.list.find((x) => same(x.num, v));
      if (!t) return;
      CQ.idle.disarm();
      if (!ctl.shown) await ctl.show(); // (the tiles out of the box first)
      t.classList.remove("nt-glow");
      return land(t, 520, CQ.EASE.inOut, true);
    };

    ctl.demo = () => {
      if (!ctl.open || !ctl.alive || held || !box.isConnected) return;
      // (the wait for the next showing counts from the end of this one, as in Level 1)
      const again = () => nudgeFn && CQ.idle.fn === nudgeFn && CQ.idle.reset();
      if (!ctl.shown) {
        CQ.hand.tapAt(CQ.centerOf(box)).then(again); // first, the box is tapped: the tiles are in it
        return;
      }
      const open = ctl.list.filter((t) => !t.struck);
      if (!open.length) return;
      const a = CQ.centerOf(open[0]);
      const b = CQ.centerOf(open[open.length - 1]);
      const z = CQ.centerOf(box);
      if (!a || !b || !z) return;
      const one = open.length === 1;
      // (it comes up from just under the row, so the hand doesn't rest on the tiles while it shows the drag:
      // design review, 2026-11-23, "the tutorial hand sits on top of the 6 and 11 tiles. Point at them from
      // below")
      CQ.hand.drag({ x: (a.x + b.x) / 2 + GRIP.x, y: (a.y + b.y) / 2 + GRIP.y + 96 }, { x: z.x + GRIP.x, y: z.y + GRIP.y }, 1, {
        carry: () => {
          const w = CQ.el("div", "hand-carry");
          CQ.el("div", "nt-tile nt-carried", w, one ? CQ.num(open[0].num) : "");
          return w;
        },
        carryAt: { x: -GRIP.x, y: -GRIP.y },
      }).then(again);
    };

    ctl.nudge = (ms) => {
      nudgeFn = () => ctl.demo();
      CQ.idle.arm(nudgeFn, ms || 8000);
    };

    ctl.done = () => {
      ctl.alive = false;
      setOpen(false);
      box.classList.remove("nt-hover", "nt-empty", "nt-shut");
      ["role", "aria-label", "aria-expanded", "tabindex"].forEach((a) => box.removeAttribute(a));
      if (nudgeFn && CQ.idle.fn === nudgeFn) CQ.idle.disarm();
      nudgeFn = null;
      if (CQ.hand.active) CQ.hand.stop();
      ctl.list.forEach(spend);
      const r = waiting;
      waiting = null;
      if (r) r(null);
    };
    // (a jump to another screen ends it too)
    CQ.run.onCancel(() => ctl.done());
    return ctl;
  };
})();
