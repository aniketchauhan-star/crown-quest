/*!
 * Zippy's Crown Quest - audio.js
 * =====================================================================
 * The complete sound system. Every sound effect, the three music loops and
 * the temple ambience are synthesised live with the Web Audio API; voice
 * lines use the Web Speech API. The game sounds complete with ZERO audio
 * files, and nothing is ever fetched (works when opened from file://).
 *
 * Load with a classic tag:  <script src="js/audio.js"></script>
 * Exposes exactly one global: window.CQAudio
 *
 *   CQAudio.init()                 call inside the START tap (user gesture)
 *   CQAudio.setEnabled(kind, on)   kind: 'music' | 'sfx' | 'voice'
 *   CQAudio.isEnabled(kind)        -> boolean
 *   CQAudio.play(cue, opts)        opts { volume 0..2, pitch x, index int }
 *   CQAudio.music(name)            'title' | 'game' | 'finale' | null
 *   CQAudio.ambience(on)           quiet torch crackle + water drips
 *   CQAudio.duck(on)               music bus to 20 %
 *   CQAudio.speak(text, opts)      -> Promise<{spoken}>; opts { who, id }
 *   CQAudio.stopSpeech()
 *   CQAudio.cues                   array of every cue name
 *   CQAudio._renderCueOffline(cue, opts)    test hook -> {peak, rms, duration}
 *   CQAudio._renderMusicOffline(name, secs) test hook -> {peak, rms, duration}
 *
 * Optional recorded audio (declared in content.js; only listed paths load):
 *   CONTENT.audio.recordedVoice = true  -> try assets/vo/<id>.mp3 first
 *   CONTENT.audio.overrides = { 'coin.clink': 'assets/audio/coin.mp3' }
 *
 * Every public method is wrapped so it can never throw into the game. If
 * AudioContext or speechSynthesis is missing, the game simply stays silent.
 * =====================================================================
 */
(function (win) {
  'use strict';
  if (!win || win.CQAudio) return; // never attach twice

  /* ================================================================== *
   * 1. Small utilities
   * ================================================================== */
  var AC = win.AudioContext || win.webkitAudioContext || null;
  var OAC = win.OfflineAudioContext || win.webkitOfflineAudioContext || null;
  var synth = win.speechSynthesis || null;
  var Utter = win.SpeechSynthesisUtterance || null;
  var doc = win.document || null;

  function noop() {}
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function num(v, d) {
    if (v === null || v === undefined || v === '') return d;
    v = +v;
    return isFinite(v) ? v : d;
  }
  function mtof(m) { return 440 * Math.pow(2, (m - 69) / 12); }
  function rng(seed) { // mulberry32: tiny seeded PRNG so cues can be reproduced in tests
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  var warned = {};
  function warnOnce(key, err) {
    if (warned[key]) return;
    warned[key] = true;
    try { console.warn('[CQAudio] ' + key, err || ''); } catch (e) { /* no console */ }
  }

  /* ================================================================== *
   * 2. Node building with automatic clean-up
   *    Every node a cue creates is "collected". When the last source of
   *    the cue ends, all of them are disconnected so long sessions on
   *    low-end tablets never pile up dead nodes.
   * ================================================================== */
  var COL = null; // collector of the sound currently being built

  function track(n) { if (COL) COL.nodes.push(n); return n; }
  function trackSrc(s, end) {
    if (COL) {
      COL.nodes.push(s);
      COL.srcs.push(s);
      if (end >= COL.end) { COL.end = end; COL.last = s; }
    }
    return s;
  }
  function disposeAll(list) {
    for (var i = 0; i < list.length; i++) {
      try { list[i].disconnect(); } catch (e) { /* already disconnected */ }
    }
    list.length = 0;
  }
  function stopAll(srcs, when) {
    for (var i = 0; i < srcs.length; i++) {
      try { srcs[i].stop(when); } catch (e) { /* not started / already stopped */ }
    }
  }
  function collect(build, onDone) {
    var prev = COL;
    var c = { nodes: [], srcs: [], end: -1, last: null, ret: 0, done: false };
    COL = c;
    try { c.ret = build(); } catch (e) {
      COL = prev; stopAll(c.srcs, 0); disposeAll(c.nodes); throw e;
    }
    COL = prev;
    c.finish = function () {
      if (c.done) return;
      c.done = true;
      disposeAll(c.nodes);
      if (onDone) onDone(c);
    };
    if (c.last) c.last.onended = c.finish; else c.finish();
    return c;
  }

  // Long-lived graphs (music pads, ambience): collect nodes, dispose later by hand.
  function hold(build) {
    var prev = COL, bag = { nodes: [], srcs: [], end: -1, last: null };
    COL = bag;
    try { build(); } catch (e) {
      COL = prev; stopAll(bag.srcs, 0); disposeAll(bag.nodes); throw e;
    }
    COL = prev;
    return bag;
  }

  // ---- shared resources ------------------------------------------------
  var noiseCache = {}; // ONE white-noise buffer per sample rate, reused everywhere
  function noiseBuffer(ctx) {
    var sr = ctx.sampleRate, b = noiseCache[sr];
    if (!b) {
      var len = Math.floor(sr * 2);
      b = ctx.createBuffer(1, len, sr);
      var d = b.getChannelData(0);
      for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      noiseCache[sr] = b;
    }
    return b;
  }
  var WAVES = { voice: [1, 0.42, 0.2, 0.1, 0.05] }; // soft "vocal" harmonic recipe
  var waveCache = typeof WeakMap !== 'undefined' ? new WeakMap() : null;
  function wave(ctx, name) {
    var m = waveCache ? waveCache.get(ctx) : null;
    if (!m) { m = {}; if (waveCache) waveCache.set(ctx, m); }
    if (!m[name]) {
      var h = WAVES[name], re = new Float32Array(h.length + 1), im = new Float32Array(h.length + 1);
      for (var i = 0; i < h.length; i++) im[i + 1] = h[i];
      m[name] = ctx.createPeriodicWave(re, im);
    }
    return m[name];
  }
  var curves = {};
  function softCurve(k) { // tanh soft-clip curve for warm growls
    if (!curves[k]) {
      var n = 1024, c = new Float32Array(n), norm = Math.tanh(k);
      for (var i = 0; i < n; i++) c[i] = Math.tanh(k * (i / (n - 1) * 2 - 1)) / norm;
      curves[k] = c;
    }
    return curves[k];
  }

  // ---- primitive nodes ---------------------------------------------------
  function G(ctx, v, dest) {
    var g = track(ctx.createGain());
    g.gain.value = v;
    if (dest) g.connect(dest);
    return g;
  }
  function F(ctx, type, f, q, dest) {
    var b = track(ctx.createBiquadFilter());
    b.type = type;
    b.frequency.value = f;
    if (q !== null && q !== undefined) b.Q.value = q;
    if (dest) b.connect(dest);
    return b;
  }
  function O(ctx, type, f, t0, t1, dest) {
    var o = ctx.createOscillator();
    if (typeof type === 'string') o.type = type; else o.setPeriodicWave(type);
    o.frequency.setValueAtTime(f, t0);
    if (dest) o.connect(dest);
    o.start(t0);
    o.stop(t1);
    return trackSrc(o, t1);
  }
  function N(ctx, t0, t1, dest) { // white noise from the shared buffer, random start point
    var s = ctx.createBufferSource(), b = noiseBuffer(ctx);
    s.buffer = b;
    s.loop = true;
    if (dest) s.connect(dest);
    s.start(t0, Math.random() * (b.duration - 0.1));
    s.stop(t1);
    return trackSrc(s, t1);
  }

  function OL(ctx, type, f, t0, dest) { // free-running oscillator (its owner stops it)
    var o = ctx.createOscillator();
    o.type = type;
    o.frequency.value = f;
    if (dest) o.connect(dest);
    o.start(t0);
    if (COL) { COL.nodes.push(o); COL.srcs.push(o); }
    return o;
  }
  function NL(ctx, t0, dest) { // free-running looped noise (its owner stops it)
    var s = ctx.createBufferSource();
    s.buffer = noiseBuffer(ctx);
    s.loop = true;
    if (dest) s.connect(dest);
    s.start(t0, Math.random());
    if (COL) { COL.nodes.push(s); COL.srcs.push(s); }
    return s;
  }

  // ---- envelopes ---------------------------------------------------------
  function env(p, t0, pts) { // piecewise-linear: pts = [[dt, value], ...]
    p.setValueAtTime(pts[0][1], t0 + pts[0][0]);
    for (var i = 1; i < pts.length; i++) p.linearRampToValueAtTime(pts[i][1], t0 + pts[i][0]);
  }
  function glide(p, t0, pts) { // exponential (musical) glide: pts = [[dt, hz], ...]
    p.setValueAtTime(pts[0][1], t0 + pts[0][0]);
    for (var i = 1; i < pts.length; i++) p.exponentialRampToValueAtTime(Math.max(0.01, pts[i][1]), t0 + pts[i][0]);
  }
  function ad(p, t0, a, peak, d) { // quick attack, smooth decay (~silent after a + d)
    p.setValueAtTime(0, t0);
    p.linearRampToValueAtTime(peak, t0 + a);
    p.setTargetAtTime(0, t0 + a, d / 5);
  }
  function spike(p, t, amp, len) { // one tiny crackle on a gain param
    p.setValueAtTime(0, t);
    p.linearRampToValueAtTime(amp, t + 0.0008);
    p.linearRampToValueAtTime(0, t + len);
  }

  // ---- building blocks ---------------------------------------------------
  // Pitched blip: oscillator with an exponential glide f0 -> f1 and an AD envelope.
  function blip(ctx, dest, t, type, f0, f1, gt, amp, a, d) {
    var g = G(ctx, 0, dest);
    ad(g.gain, t, a, amp, d);
    var o = O(ctx, type, f0, t, t + a + d + 0.02, g);
    if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + gt);
    return o;
  }
  // Filtered noise burst.
  function hiss(ctx, dest, t, type, f, q, amp, a, d) {
    var g = G(ctx, 0, dest);
    ad(g.gain, t, a, amp, d);
    var fl = F(ctx, type, f, q, g);
    N(ctx, t, t + a + d + 0.02, fl);
    return fl;
  }
  // Bells, clinks, chimes: decaying sine partials [[ratio, amp, decay], ...].
  function partials(ctx, dest, t, f, parts, level, attack) {
    var nyq = ctx.sampleRate * 0.45;
    for (var i = 0; i < parts.length; i++) {
      var pf = f * parts[i][0];
      if (pf < nyq) blip(ctx, dest, t, 'sine', pf, 0, 0, parts[i][1] * level, attack || 0.002, parts[i][2]);
    }
  }
  function chime(ctx, dest, t, f, amp, d) { // happy mallet/bell note
    partials(ctx, dest, t, f, [[1, 1, d], [2, 0.28, d * 0.45], [3, 0.1, d * 0.25], [4.2, 0.08, d * 0.12]], amp, 0.002);
  }
  // Vibrato: LFO into a frequency param. Returns the depth gain (automatable).
  function vib(ctx, param, t0, t1, rate, depth) {
    var d = G(ctx, depth, param);
    O(ctx, 'sine', rate, t0, t1, d);
    return d;
  }
  // Amplitude modulation stage: out = in * (1 - depth + depth * lfo).
  function amStage(ctx, dest, t0, t1, rate, depth, type) {
    var g = G(ctx, 1 - depth, dest);
    var d = G(ctx, depth, g.gain);
    var l = O(ctx, type || 'sine', rate, t0, t1, d);
    return { node: g, depth: d, lfo: l };
  }
  // Cartoon voice: buzzy source -> two formant band-passes + a soft dry path.
  function vox(ctx, dest, t0, t1, c) {
    var amp = G(ctx, 0, dest);
    var lp = F(ctx, 'lowpass', c.lp || 3000, 0.5, null);
    var f1 = F(ctx, 'bandpass', c.f1, c.q1 || 5, G(ctx, c.g1 || 2, amp));
    var f2 = F(ctx, 'bandpass', c.f2, c.q2 || 7, G(ctx, c.g2 || 1.5, amp));
    lp.connect(f1);
    lp.connect(f2);
    lp.connect(G(ctx, c.dry === undefined ? 0.3 : c.dry, amp));
    var src = O(ctx, c.wave || 'sawtooth', c.f0, t0, t1, lp);
    return { src: src, amp: amp, f1: f1, f2: f2, lp: lp };
  }
  // Creak: slow, irregular sawtooth "stick-slip" pulses ringing resonant band-passes.
  function creak(ctx, dest, t0, dur, r, c) {
    var amp = G(ctx, 0, dest);
    env(amp.gain, t0, [[0, 0], [0.05, c.amp], [dur * 0.65, c.amp * 0.8], [dur, 0]]);
    var b1 = F(ctx, 'bandpass', c.f1, c.q1, G(ctx, c.g1, amp));
    var b2 = F(ctx, 'bandpass', c.f2, c.q2, G(ctx, c.g2, amp));
    var s = O(ctx, 'sawtooth', c.lo, t0, t0 + dur + 0.02, null);
    s.connect(b1);
    s.connect(b2);
    for (var t = t0 + 0.03; t < t0 + dur; t += 0.025 + r() * 0.05) {
      s.frequency.linearRampToValueAtTime(c.lo + (c.hi - c.lo) * r(), t);
    }
    b1.frequency.setValueAtTime(c.f1, t0);
    b1.frequency.linearRampToValueAtTime(c.f1 * c.drift, t0 + dur);
    return dur;
  }

  /* ================================================================== *
   * 3. Cue library
   *    Each cue is (ctx, dest, t0, o) => durationSeconds, so the exact same
   *    code runs in the live AudioContext and in an OfflineAudioContext.
   *    o = { volume, pitch, index, rnd } (see normOpts). All frequencies are
   *    multiplied by o.pitch.
   * ================================================================== */
  var CUES = {};
  function cue(name, fn) { CUES[name] = fn; }

  // ---------------- Grumble: big, sleepy, purple ----------------
  cue('grumble.snoreIn', function (ctx, dest, t, o) { // "khrrrrr" inhale, rattling
    var p = o.pitch, r = o.rnd, v = clamp(o.volume, 0.3, 2), D = 1.3, e = t + D;
    var out = G(ctx, 0, dest);
    env(out.gain, t, [[0, 0], [0.12, 0.13], [0.6, 0.3], [1.06, 0.42], [1.14, 0.42], [1.26, 0]]);
    // soft-palate flutter (~28-34 Hz) rattles everything below
    var rattle = amStage(ctx, out, t, e, 28 + r() * 3, 0.46, 'triangle');
    rattle.lfo.frequency.linearRampToValueAtTime(33 + r() * 2, t + 1.15);
    // throat tone: low sawtooth (brighter when the snore is louder) + sine body
    var lp = F(ctx, 'lowpass', (300 + 140 * v) * p, 4, G(ctx, 0.75, rattle.node));
    O(ctx, 'sawtooth', 70 * p, t, e, lp).frequency.linearRampToValueAtTime((84 + r() * 6) * p, t + 1.15);
    O(ctx, 'sine', 70 * p, t, e, G(ctx, 0.3, rattle.node)).frequency.linearRampToValueAtTime(86 * p, t + 1.15);
    // raspy breath
    var bp = F(ctx, 'bandpass', 520 * p, 1.1, G(ctx, 1.3, rattle.node));
    bp.frequency.linearRampToValueAtTime(380 * p, t + 1.2);
    N(ctx, t, e, bp);
    return D;
  });

  cue('grumble.snoreOut', function (ctx, dest, t, o) { // whistly "phwooo" exhale
    var p = o.pitch, D = 0.9, e = t + D;
    hiss(ctx, dest, t, 'lowpass', 700 * p, 1, 0.35, 0.006, 0.07); // "ph" lip puff
    var br = G(ctx, 0, dest);
    env(br.gain, t, [[0, 0], [0.09, 0.6], [0.45, 0.45], [0.86, 0]]);
    var bp = F(ctx, 'bandpass', 1300 * p, 0.9, br);
    glide(bp.frequency, t, [[0, 1300 * p], [0.85, 600 * p]]);
    N(ctx, t, e, bp);
    var wg = G(ctx, 0, dest); // nose whistle 900 -> 550 Hz
    env(wg.gain, t, [[0, 0], [0.1, 0], [0.22, 0.1], [0.62, 0.08], [0.86, 0]]);
    var w = O(ctx, 'sine', 900 * p, t, e, wg);
    glide(w.frequency, t, [[0.1, 900 * p], [0.85, 550 * p]]);
    vib(ctx, w.frequency, t, e, 5.5, 10 * p);
    return D;
  });

  cue('grumble.mumble', function (ctx, dest, t, o) { // sleepy "hrrm... mmph?"
    var p = o.pitch, D = 0.7, e = t + D;
    var fl = amStage(ctx, dest, t, e, 24, 0.3, 'triangle'); // the "rr" flutter
    env(fl.depth.gain, t, [[0, 0.3], [0.25, 0.05]]);
    var v = vox(ctx, fl.node, t, e, { f0: 92 * p, f1: 420 * p, f2: 950 * p, q1: 4, q2: 6, g1: 3, g2: 1.5, lp: 1000 * p, dry: 0.35 });
    glide(v.src.frequency, t, [[0, 96 * p], [0.3, 84 * p], [0.42, 92 * p], [0.64, 128 * p]]); // question lift
    env(v.lp.frequency, t, [[0, 1000 * p], [0.18, 800 * p], [0.3, 330 * p], [0.42, 330 * p], [0.62, 420 * p]]);
    env(v.amp.gain, t, [[0, 0], [0.04, 0.43], [0.26, 0.35], [0.34, 0], [0.42, 0], [0.47, 0.38], [0.6, 0.35], [0.65, 0]]);
    hiss(ctx, dest, t + 0.63, 'lowpass', 1200 * p, 1, 0.12, 0.004, 0.05); // "ph"
    return D;
  });

  cue('grumble.roar', function (ctx, dest, t, o) { // comic "GRRR-UM-BLE!"
    var p = o.pitch, D = 1.3, e = t + D;
    hiss(ctx, dest, t, 'lowpass', 400 * p, 1, 0.4, 0.004, 0.06); // "G"
    var amp = G(ctx, 0, dest);
    env(amp.gain, t, [[0, 0], [0.06, 0.3], [0.4, 0.43], [0.55, 0.4], [0.82, 0.35], [0.86, 0.1], [0.92, 0.38], [1.05, 0.33], [1.28, 0]]);
    var f1 = F(ctx, 'bandpass', 650 * p, 3, G(ctx, 2.2, amp));
    var f2 = F(ctx, 'bandpass', 1100 * p, 5, G(ctx, 1.6, amp));
    var lp = F(ctx, 'lowpass', 500 * p, 1, null);
    lp.connect(f1);
    lp.connect(f2);
    lp.connect(G(ctx, 0.35, amp));
    env(lp.frequency, t, [[0, 500 * p], [0.25, 2200 * p], [0.55, 1400 * p], [0.8, 450 * p], [0.88, 320 * p], [0.95, 1500 * p], [1.3, 600 * p]]);
    env(f1.frequency, t, [[0, 650 * p], [0.55, 650 * p], [0.66, 380 * p], [0.95, 420 * p], [1.0, 480 * p]]);
    env(f2.frequency, t, [[0, 1100 * p], [0.55, 1100 * p], [0.66, 800 * p], [0.95, 900 * p], [1.02, 1600 * p]]);
    var rum = amStage(ctx, lp, t, e, 26, 0.42, 'triangle'); // rolling "rrr"
    env(rum.depth.gain, t, [[0, 0.42], [0.5, 0.42], [0.65, 0.15], [1.3, 0.12]]);
    var sh = track(ctx.createWaveShaper());
    sh.curve = softCurve(2.5);
    sh.oversample = '2x';
    sh.connect(rum.node);
    var pre = G(ctx, 0.45, sh);
    var pts = [[0, 120 * p], [0.35, 165 * p], [0.55, 158 * p], [0.85, 150 * p], [0.95, 152 * p], [1.25, 105 * p]];
    glide(O(ctx, 'sawtooth', 120 * p, t, e, pre).frequency, t, pts);
    glide(O(ctx, 'sawtooth', 121.4 * p, t, e, pre).frequency, t, pts.map(function (q) { return [q[0], q[1] * 1.012]; }));
    return D;
  });

  cue('grumble.stomp', function (ctx, dest, t, o) { // low thump
    var p = o.pitch;
    blip(ctx, dest, t, 'sine', 110 * p, 45 * p, 0.14, 0.9, 0.004, 0.34);
    blip(ctx, dest, t, 'triangle', 220 * p, 90 * p, 0.1, 0.22, 0.004, 0.14); // heard on small speakers
    hiss(ctx, dest, t, 'lowpass', 320 * p, 1, 0.7, 0.002, 0.08);
    return 0.4;
  });

  cue('grumble.yawn', function (ctx, dest, t, o) { // big "aaah-ohhm"
    var p = o.pitch, D = 1.5, e = t + D;
    var v = vox(ctx, dest, t, e, { f0: 250 * p, f1: 720 * p, f2: 1150 * p, q1: 4, q2: 6, g1: 2.4, g2: 1.6, lp: 2600 * p, dry: 0.25 });
    glide(v.src.frequency, t, [[0, 240 * p], [0.18, 300 * p], [1.3, 170 * p], [1.45, 160 * p]]);
    env(vib(ctx, v.src.frequency, t, e, 5, 0).gain, t, [[0, 0], [0.6, 2 * p], [1.35, 9 * p]]);
    env(v.f1.frequency, t, [[0, 700 * p], [0.5, 780 * p], [1.0, 520 * p], [1.3, 400 * p]]);
    env(v.f2.frequency, t, [[0, 1150 * p], [0.5, 1220 * p], [1.0, 860 * p], [1.3, 720 * p]]);
    env(v.lp.frequency, t, [[0, 2600 * p], [1.1, 1800 * p], [1.36, 380 * p]]); // mouth closes: "mm"
    env(v.amp.gain, t, [[0, 0], [0.22, 0.42], [0.9, 0.39], [1.25, 0.29], [1.46, 0]]);
    var bg = G(ctx, 0, dest); // breathy "hhh"
    env(bg.gain, t, [[0, 0], [0.06, 0.25], [0.3, 0.08], [1.2, 0.05], [1.4, 0]]);
    N(ctx, t, e, F(ctx, 'bandpass', 900 * p, 1.2, bg));
    return D;
  });

  cue('grumble.flop', function (ctx, dest, t, o) { // heavy, soft flop onto the floor
    var p = o.pitch;
    blip(ctx, dest, t, 'sine', 95 * p, 48 * p, 0.2, 0.65, 0.01, 0.45);
    blip(ctx, dest, t, 'triangle', 190 * p, 80 * p, 0.12, 0.18, 0.01, 0.16);
    var cg = G(ctx, 0, dest); // cloth / fur flaps
    env(cg.gain, t, [[0, 0], [0.012, 0.45], [0.06, 0.12], [0.075, 0.3], [0.14, 0.06], [0.24, 0]]);
    N(ctx, t, t + 0.26, F(ctx, 'bandpass', 950 * p, 0.8, cg));
    hiss(ctx, dest, t, 'lowpass', 260 * p, 1, 0.55, 0.006, 0.12);
    return 0.5;
  });

  // ---------------- Zippy: small, quick, cheeky ----------------
  cue('zippy.whee', function (ctx, dest, t, o) { // swing whoosh + "wheee!"
    var p = o.pitch, D = 0.9, e = t + D;
    var wg = G(ctx, 0, dest);
    env(wg.gain, t, [[0, 0], [0.3, 0.5], [0.5, 0.35], [0.86, 0]]);
    var bp = F(ctx, 'bandpass', 500 * p, 1.6, wg);
    glide(bp.frequency, t, [[0, 500 * p], [0.35, 2400 * p], [0.85, 700 * p]]);
    N(ctx, t, e, bp);
    var vg = G(ctx, 0, dest);
    env(vg.gain, t, [[0, 0], [0.05, 0.32], [0.6, 0.28], [0.87, 0]]);
    var s = O(ctx, wave(ctx, 'voice'), 600 * p, t, e, F(ctx, 'lowpass', 4000 * p, 0.5, vg));
    glide(s.frequency, t, [[0, 600 * p], [0.32, 1400 * p], [0.85, 900 * p]]);
    env(vib(ctx, s.frequency, t, e, 7, 0).gain, t, [[0, 0], [0.3, 15 * p], [0.8, 40 * p]]);
    return D;
  });

  // Monkey giggle: one buzzy voice re-pitched per syllable ("hee" bright, "hoo" dark).
  function monkeyLaugh(ctx, dest, t, o, pat, syl, gap, lift, lastMul) {
    var p = o.pitch, r = o.rnd, n = pat.length, step = syl + gap, last = syl * lastMul;
    var end = (n - 1) * step + last, D = end + 0.14, e = t + D;
    var v = vox(ctx, dest, t, e, { f0: 950 * p, f1: 1000 * p, f2: 3000 * p, q1: 3, q2: 5, g1: 1.6, g2: 1.4, lp: 5000 * p, dry: 0.25 });
    var breath = G(ctx, 0, dest);
    N(ctx, t, e, F(ctx, 'bandpass', 2500 * p, 1, breath));
    v.amp.gain.setValueAtTime(0, t);
    breath.gain.setValueAtTime(0, t);
    for (var i = 0; i < n; i++) {
      var s = t + i * step, hee = pat[i] === 'e', L = i === n - 1 ? last : syl;
      var f = (hee ? 950 : 600) * p * lift * (1 + (r() - 0.5) * 0.08) * (1 - i * 0.012);
      v.src.frequency.setValueAtTime(f * 0.93, s);
      v.src.frequency.linearRampToValueAtTime(f * 1.06, s + syl * 0.4);
      v.src.frequency.linearRampToValueAtTime(f * (L > syl ? 0.82 : 0.97), s + L);
      v.f1.frequency.setValueAtTime((hee ? 1000 : 650) * p, s);
      v.f2.frequency.setValueAtTime((hee ? 3000 : 1150) * p, s);
      breath.gain.setValueAtTime(0, s); // the "h"
      breath.gain.linearRampToValueAtTime(0.15, s + 0.006);
      breath.gain.linearRampToValueAtTime(0, s + 0.035);
      v.amp.gain.setValueAtTime(0, s + 0.01);
      v.amp.gain.linearRampToValueAtTime(0.4, s + 0.028);
      v.amp.gain.linearRampToValueAtTime(0.27, s + L - 0.02);
      v.amp.gain.linearRampToValueAtTime(0, s + L);
    }
    breath.gain.linearRampToValueAtTime(0.06, t + end + 0.03); // breathy little tail
    breath.gain.linearRampToValueAtTime(0, t + end + 0.13);
    return D;
  }
  cue('zippy.laugh', function (ctx, dest, t, o) {
    return monkeyLaugh(ctx, dest, t, o, ['e', 'e', 'o', 'o', 'e', 'e', 'o'], 0.095, 0.055, 1, 2.2);
  });
  cue('zippy.giggle', function (ctx, dest, t, o) {
    return monkeyLaugh(ctx, dest, t, o, ['e', 'e', 'e'], 0.09, 0.055, 1.08, 1.6);
  });

  cue('zippy.catch', function (ctx, dest, t, o) { // "oof!" + soft thud
    var p = o.pitch;
    blip(ctx, dest, t, 'sine', 150 * p, 60 * p, 0.1, 0.45, 0.003, 0.16);
    hiss(ctx, dest, t, 'lowpass', 500 * p, 1, 0.3, 0.002, 0.04);
    var v = vox(ctx, dest, t, t + 0.32, { f0: 300 * p, f1: 520 * p, f2: 950 * p, q1: 3, q2: 5, g1: 2.2, g2: 1.4, lp: 3000 * p, dry: 0.25 });
    glide(v.src.frequency, t, [[0.01, 300 * p], [0.2, 190 * p]]);
    env(v.amp.gain, t, [[0, 0], [0.025, 0.35], [0.13, 0.28], [0.21, 0]]);
    var fg = G(ctx, 0, dest); // the "f"
    env(fg.gain, t, [[0, 0], [0.17, 0], [0.2, 0.1], [0.32, 0]]);
    N(ctx, t, t + 0.33, F(ctx, 'highpass', 2500 * p, 0.7, fg));
    return 0.35;
  });

  cue('zippy.eek', function (ctx, dest, t, o) { // high yelp 1100 -> 1800 Hz
    var p = o.pitch, e = t + 0.3, g = G(ctx, 0, dest);
    env(g.gain, t, [[0, 0], [0.015, 0.4], [0.17, 0.36], [0.28, 0]]);
    var s = O(ctx, wave(ctx, 'voice'), 1100 * p, t, e, F(ctx, 'lowpass', 5000 * p, 0.5, g));
    glide(s.frequency, t, [[0, 1100 * p], [0.1, 1800 * p], [0.26, 1600 * p]]);
    vib(ctx, s.frequency, t, e, 16, 30 * p);
    return 0.3;
  });

  cue('zippy.phew', function (ctx, dest, t, o) { // relieved sigh
    var p = o.pitch, D = 0.8, e = t + D;
    hiss(ctx, dest, t, 'lowpass', 900 * p, 1, 0.3, 0.004, 0.05);
    var bg = G(ctx, 0, dest);
    env(bg.gain, t, [[0, 0], [0.08, 0.6], [0.35, 0.4], [0.78, 0]]);
    var bp = F(ctx, 'bandpass', 2600 * p, 1.1, bg);
    glide(bp.frequency, t, [[0, 2600 * p], [0.75, 600 * p]]);
    N(ctx, t, e, bp);
    var wg = G(ctx, 0, dest); // tiny falling whistle
    env(wg.gain, t, [[0, 0], [0.06, 0.09], [0.45, 0.06], [0.6, 0]]);
    glide(O(ctx, 'sine', 1300 * p, t, t + 0.62, wg).frequency, t, [[0, 1300 * p], [0.55, 800 * p]]);
    return D;
  });

  cue('zippy.ooh', function (ctx, dest, t, o) { // curious rising "ooh?"
    var p = o.pitch, e = t + 0.5, g = G(ctx, 0, dest);
    env(g.gain, t, [[0, 0], [0.05, 0.45], [0.36, 0.4], [0.48, 0]]);
    var s = O(ctx, wave(ctx, 'voice'), 420 * p, t, e, F(ctx, 'lowpass', 1300 * p, 1, g));
    glide(s.frequency, t, [[0, 420 * p], [0.08, 440 * p], [0.42, 650 * p]]);
    env(vib(ctx, s.frequency, t, e, 6, 0).gain, t, [[0, 0], [0.45, 14 * p]]);
    hiss(ctx, dest, t, 'bandpass', 900 * p, 1, 0.08, 0.01, 0.05);
    return 0.5;
  });

  cue('zippy.gulp', function (ctx, dest, t, o) { // cartoon gulp: "gl-ulp"
    var p = o.pitch;
    blip(ctx, dest, t, 'sine', 520 * p, 200 * p, 0.07, 0.5, 0.004, 0.08);
    blip(ctx, dest, t + 0.11, 'sine', 220 * p, 560 * p, 0.09, 0.45, 0.006, 0.2);
    hiss(ctx, dest, t + 0.1, 'bandpass', 1500 * p, 2, 0.12, 0.001, 0.012);
    return 0.35;
  });

  // ---------------- Objects ----------------
  cue('bar.pick', function (ctx, dest, t, o) { // stone scrape + sparkle pings
    var p = o.pitch, r = o.rnd, sg = G(ctx, 0, dest);
    env(sg.gain, t, [[0, 0], [0.015, 0.45], [0.12, 0.3], [0.16, 0]]);
    var grit = amStage(ctx, sg, t, t + 0.18, 55 + r() * 20, 0.4, 'square');
    var bp = F(ctx, 'bandpass', 1100 * p, 1.2, grit.node);
    glide(bp.frequency, t, [[0, 1100 * p], [0.15, 2300 * p]]);
    N(ctx, t, t + 0.18, bp);
    var notes = [2637, 3136, 3520, 4186];
    for (var i = 0; i < 3; i++) {
      partials(ctx, dest, t + 0.06 + i * 0.065, notes[(r() * 4) | 0] * p, [[1, 1, 0.12], [2.01, 0.25, 0.05]], 0.14, 0.001);
    }
    return 0.35;
  });

  cue('bar.place', function (ctx, dest, t, o) { // heavy gold clunk
    var p = o.pitch;
    blip(ctx, dest, t, 'sine', 190 * p, 90 * p, 0.06, 0.6, 0.002, 0.24);
    partials(ctx, dest, t, 520 * p, [[1, 1, 0.2], [2.32, 0.6, 0.12], [4.1, 0.3, 0.07]], 0.22, 0.001);
    hiss(ctx, dest, t, 'lowpass', 2500 * p, 0.7, 0.35, 0.001, 0.025);
    return 0.3;
  });

  cue('bar.return', function (ctx, dest, t, o) { // soft falling whoosh
    var p = o.pitch, g = G(ctx, 0, dest);
    env(g.gain, t, [[0, 0], [0.1, 0.7], [0.33, 0]]);
    var bp = F(ctx, 'bandpass', 1800 * p, 1.4, g);
    glide(bp.frequency, t, [[0, 1800 * p], [0.32, 450 * p]]);
    N(ctx, t, t + 0.35, bp);
    return 0.35;
  });

  cue('bar.crack', function (ctx, dest, t, o) { // gold bar splits: crack + shimmer
    var p = o.pitch, r = o.rnd;
    hiss(ctx, dest, t, 'highpass', 1200 * p, 0.7, 0.6, 0.0005, 0.025);
    hiss(ctx, dest, t + 0.028, 'bandpass', 3000 * p, 1, 0.45, 0.0005, 0.03);
    blip(ctx, dest, t, 'sine', 320 * p, 110 * p, 0.05, 0.35, 0.001, 0.06);
    for (var i = 0; i < 5; i++) {
      var f = (2200 + r() * 3000) * p;
      blip(ctx, dest, t + 0.02 + i * 0.02, 'sine', f, f * 0.97, 0.3, 0.07, 0.003, 0.3 + r() * 0.12);
    }
    return 0.5;
  });

  cue('bar.merge', function (ctx, dest, t, o) { // magical whoosh-shimmer
    var p = o.pitch, g = G(ctx, 0, dest);
    env(g.gain, t, [[0, 0], [0.3, 0.4], [0.5, 0.08], [0.6, 0]]);
    var bp = F(ctx, 'bandpass', 400 * p, 2, g);
    glide(bp.frequency, t, [[0, 400 * p], [0.45, 3200 * p]]);
    N(ctx, t, t + 0.6, bp);
    var notes = [1047, 1175, 1319, 1568, 1760, 2093];
    for (var i = 0; i < notes.length; i++) blip(ctx, dest, t + 0.04 + i * 0.05, 'sine', notes[i] * 2 * p, 0, 0, 0.1, 0.002, 0.14);
    partials(ctx, dest, t + 0.36, 1568 * p, [[1, 1, 0.22], [2, 0.3, 0.12], [3.01, 0.12, 0.08]], 0.28, 0.002);
    return 0.6;
  });

  cue('coin.clink', function (ctx, dest, t, o) { // inharmonic clink, rises with o.index
    var p = o.pitch, f = 1300 * Math.pow(1.06, clamp(o.index, -12, 24)) * p;
    var parts = [[1, 1, 0.34], [2.76, 0.6, 0.18], [5.4, 0.32, 0.08]];
    partials(ctx, dest, t, f, parts, 0.32, 0.0008);
    partials(ctx, dest, t + 0.055, f * 1.003, parts, 0.11, 0.0008); // tiny bounce
    hiss(ctx, dest, t, 'highpass', 5000, 0.7, 0.18, 0.0005, 0.006);
    return 0.4;
  });

  cue('balance.creak', function (ctx, dest, t, o) { // woody/metal creak
    var p = o.pitch;
    return creak(ctx, dest, t, 0.6, o.rnd, { lo: 24, hi: 52, f1: 760 * p, q1: 9, g1: 5, f2: 1650 * p, q2: 12, g2: 3, amp: 0.55, drift: 0.85 });
  });

  cue('balance.clang', function (ctx, dest, t, o) { // metal clang ~320/735/1180/1760 Hz
    var p = o.pitch;
    partials(ctx, dest, t, 320 * p, [[1, 1, 0.85], [2.297, 0.7, 0.6], [3.6875, 0.5, 0.42], [5.5, 0.34, 0.3],
      [1.006, 0.5, 0.8], [2.31, 0.35, 0.55]], 0.2, 0.002);
    hiss(ctx, dest, t, 'highpass', 1800 * p, 0.7, 0.35, 0.001, 0.03);
    return 0.9;
  });

  cue('balance.level', function (ctx, dest, t, o) { // bright reassuring "ding"
    var p = o.pitch;
    partials(ctx, dest, t, 1568 * p, [[1, 1, 0.66], [1.003, 0.35, 0.6], [2, 0.38, 0.36], [3, 0.1, 0.14]], 0.34, 0.003);
    return 0.7;
  });

  // ---------------- UI / feedback ----------------
  cue('ui.tap', function (ctx, dest, t, o) { // wooden "tok"
    var p = o.pitch;
    blip(ctx, dest, t, 'triangle', 900 * p, 640 * p, 0.02, 0.5, 0.001, 0.06);
    hiss(ctx, dest, t, 'bandpass', 2200 * p, 2, 0.3, 0.0005, 0.012);
    return 0.08;
  });

  cue('ui.pop', function (ctx, dest, t, o) { // bubble pop: fast upward glide
    var p = o.pitch, g = G(ctx, 0, dest);
    env(g.gain, t, [[0, 0], [0.004, 0.4], [0.05, 0.32], [0.11, 0]]);
    glide(O(ctx, 'sine', 380 * p, t, t + 0.12, g).frequency, t, [[0, 380 * p], [0.06, 1500 * p]]);
    return 0.12;
  });

  cue('ui.swoosh', function (ctx, dest, t, o) { // soft fly-in swoosh
    var p = o.pitch, g = G(ctx, 0, dest);
    env(g.gain, t, [[0, 0], [0.14, 0.6], [0.34, 0]]);
    var bp = F(ctx, 'bandpass', 600 * p, 1.2, g);
    glide(bp.frequency, t, [[0, 600 * p], [0.3, 3200 * p]]);
    N(ctx, t, t + 0.35, bp);
    return 0.35;
  });

  cue('name.burst', function (ctx, dest, t, o) { // comic "boing"
    var p = o.pitch, e = t + 0.6, g = G(ctx, 0, dest);
    env(g.gain, t, [[0, 0], [0.006, 0.5], [0.2, 0.38], [0.58, 0]]);
    var lp = F(ctx, 'lowpass', 2400 * p, 1, g);
    var s = O(ctx, 'triangle', 170 * p, t, e, lp);
    glide(s.frequency, t, [[0, 170 * p], [0.06, 330 * p], [0.55, 300 * p]]);
    var s2 = O(ctx, 'sine', 340 * p, t, e, G(ctx, 0.3, lp));
    glide(s2.frequency, t, [[0, 340 * p], [0.06, 660 * p], [0.55, 600 * p]]);
    var lfo = O(ctx, 'sine', 13, t, e, null); // spring wobble, dying away
    var d1 = G(ctx, 70 * p, s.frequency), d2 = G(ctx, 140 * p, s2.frequency);
    lfo.connect(d1);
    lfo.connect(d2);
    glide(d1.gain, t, [[0, 70 * p], [0.5, 3 * p]]);
    glide(d2.gain, t, [[0, 140 * p], [0.5, 6 * p]]);
    blip(ctx, dest, t, 'sine', 1200 * p, 350 * p, 0.04, 0.25, 0.001, 0.04); // twang
    return 0.6;
  });

  cue('torch.fwoom', function (ctx, dest, t, o) { // torch ignites: swell + crackle
    var p = o.pitch, r = o.rnd, e = t + 0.6, g = G(ctx, 0, dest);
    env(g.gain, t, [[0, 0], [0.12, 0.8], [0.25, 0.55], [0.58, 0]]);
    var lp = F(ctx, 'lowpass', 200 * p, 1.5, g);
    glide(lp.frequency, t, [[0, 200 * p], [0.15, 1400 * p], [0.55, 500 * p]]);
    N(ctx, t, e, lp);
    blip(ctx, dest, t, 'sine', 70 * p, 105 * p, 0.15, 0.4, 0.03, 0.4);
    var cg = G(ctx, 0, dest);
    N(ctx, t, e, F(ctx, 'highpass', 2500 * p, 0.7, cg));
    for (var c = t + 0.08; c < t + 0.55; c += 0.03 + r() * 0.07) spike(cg.gain, c, 0.15 + r() * 0.3, 0.003 + r() * 0.004);
    return 0.6;
  });

  cue('correct', function (ctx, dest, t, o) { // happy two-note chime E6 -> A6
    var p = o.pitch;
    chime(ctx, dest, t, 1318.5 * p, 0.3, 0.32);
    chime(ctx, dest, t + 0.12, 1760 * p, 0.36, 0.46);
    return 0.6;
  });

  cue('tryagain', function (ctx, dest, t, o) { // soft, friendly low "boop" (never a buzzer)
    var p = o.pitch, e = t + 0.35, g = G(ctx, 0, dest);
    env(g.gain, t, [[0, 0], [0.015, 0.42], [0.18, 0.36], [0.34, 0]]);
    glide(O(ctx, 'sine', 330 * p, t, e, g).frequency, t, [[0, 330 * p], [0.25, 260 * p]]);
    glide(O(ctx, 'sine', 660 * p, t, e, G(ctx, 0.15, g)).frequency, t, [[0, 660 * p], [0.25, 520 * p]]);
    return 0.35;
  });

  cue('gem.collect', function (ctx, dest, t, o) { // C-E-G-C arpeggio + shimmer
    var p = o.pitch, r = o.rnd, n = [1046.5, 1318.5, 1568, 2093], hi = [4186, 4699, 5274, 6272];
    for (var i = 0; i < 4; i++) chime(ctx, dest, t + i * 0.06, n[i] * p, 0.24, i === 3 ? 0.58 : 0.42);
    for (var j = 0; j < 8; j++) {
      blip(ctx, dest, t + 0.2 + j * 0.055 + r() * 0.02, 'sine', hi[(r() * 4) | 0] * p, 0, 0, 0.05, 0.001, 0.08);
    }
    return 0.8;
  });

  cue('crown.sparkle', function (ctx, dest, t, o) { // shimmering high pings 2-4 kHz
    var p = o.pitch, r = o.rnd, n = [2093, 2349, 2637, 3136, 3520, 3951];
    for (var i = 0; i < 10; i++) {
      partials(ctx, dest, t + i * 0.052 + r() * 0.02, n[(r() * n.length) | 0] * p,
        [[1, 1, 0.12 + r() * 0.08], [2, 0.15, 0.05]], 0.11 + r() * 0.1, 0.002);
    }
    var ag = G(ctx, 0, dest); // airy "sss"
    env(ag.gain, t, [[0, 0], [0.1, 0.05], [0.66, 0]]);
    N(ctx, t, t + 0.68, F(ctx, 'highpass', 7000, 0.7, ag));
    return 0.7;
  });

  cue('confetti', function (ctx, dest, t, o) { // party popper + paper crackles
    var p = o.pitch, r = o.rnd;
    hiss(ctx, dest, t, 'bandpass', 1100 * p, 0.8, 0.85, 0.001, 0.04);
    blip(ctx, dest, t, 'sine', 180 * p, 70 * p, 0.05, 0.55, 0.001, 0.07);
    var cg = G(ctx, 0, dest);
    N(ctx, t, t + 0.7, F(ctx, 'highpass', 3500 * p, 0.7, cg));
    for (var c = t + 0.06; c < t + 0.66; c += 0.015 + r() * 0.04 * (1 + (c - t) * 2)) {
      spike(cg.gain, c, (0.14 + r() * 0.22) * (1 - (c - t) * 0.9), 0.003 + r() * 0.003);
    }
    return 0.7;
  });

  // Brassy note: detuned saws through a "blat" low-pass envelope.
  function brass(ctx, dest, t, f, dur, vel, single) {
    var amp = G(ctx, 0, dest), end = t + dur + 0.3;
    amp.gain.setValueAtTime(0, t);
    amp.gain.linearRampToValueAtTime(vel, t + 0.03);
    amp.gain.setTargetAtTime(vel * 0.75, t + 0.03, 0.1);
    amp.gain.setTargetAtTime(0, t + dur, 0.05);
    var lp = F(ctx, 'lowpass', 300, 1.5, amp);
    lp.frequency.setValueAtTime(300, t);
    lp.frequency.linearRampToValueAtTime(Math.min(2800, f * 7), t + 0.04);
    lp.frequency.setTargetAtTime(Math.min(1600, f * 4), t + 0.05, 0.15);
    lp.frequency.setTargetAtTime(300, t + dur, 0.06);
    var o1 = O(ctx, 'sawtooth', f, t, end, lp);
    var o2 = single ? null : O(ctx, 'sawtooth', f * 1.0045, t, end, lp);
    return { amp: amp, o1: o1, o2: o2, end: end };
  }

  cue('fanfare', function (ctx, dest, t, o) { // quest complete! C-E-G-C' + final chord
    var p = o.pitch, mel = [[0, 72, 0.15], [0.17, 76, 0.15], [0.34, 79, 0.15], [0.51, 84, 1.45]];
    for (var i = 0; i < mel.length; i++) {
      var b = brass(ctx, dest, t + mel[i][0], mtof(mel[i][1]) * p, mel[i][2], 0.14);
      hiss(ctx, dest, t + mel[i][0], 'bandpass', 1800, 0.8, 0.12, 0.001, 0.08); // snare tap
      if (i === 3) { // delayed vibrato on the held top note
        var vd = G(ctx, 0, b.o1.detune);
        vd.connect(b.o2.detune);
        O(ctx, 'sine', 5.5, t + 0.51, b.end, vd);
        env(vd.gain, t, [[0.51, 0], [0.9, 0], [1.4, 14]]);
      }
    }
    var ch = [60, 64, 67];
    for (var j = 0; j < 3; j++) brass(ctx, dest, t + 0.51, mtof(ch[j]) * p, 1.45, 0.08);
    blip(ctx, dest, t + 0.51, 'sine', 98 * p, 65 * p, 0.08, 0.4, 0.003, 0.6); // timpani
    hiss(ctx, dest, t + 0.51, 'highpass', 6000, 0.7, 0.16, 0.002, 1.2);        // cymbal
    return 2.2;
  });

  cue('scroll.open', function (ctx, dest, t, o) { // parchment unrolling
    var p = o.pitch, e = t + 0.7, g = G(ctx, 0, dest);
    env(g.gain, t, [[0, 0], [0.04, 0.5], [0.5, 0.42], [0.66, 0]]);
    var fl = amStage(ctx, g, t, e, 28, 0.45, 'sawtooth'); // flutter slows as it unrolls
    glide(fl.lfo.frequency, t, [[0, 28], [0.62, 11]]);
    var src = N(ctx, t, e, null);
    src.connect(F(ctx, 'bandpass', 2600 * p, 1.3, fl.node));
    src.connect(F(ctx, 'highpass', 5500 * p, 0.7, G(ctx, 0.35, fl.node)));
    blip(ctx, dest, t + 0.58, 'sine', 150 * p, 95 * p, 0.05, 0.3, 0.002, 0.08); // final flap
    hiss(ctx, dest, t + 0.58, 'lowpass', 900 * p, 0.7, 0.2, 0.002, 0.05);
    return 0.7;
  });

  cue('tension', function (ctx, dest, t, o) { // gentle, slightly funny "uh-oh" sting
    var p = o.pitch, e = t + 1.0, g = G(ctx, 0, dest);
    env(g.gain, t, [[0, 0], [0.15, 0.45], [0.8, 0.5], [0.98, 0]]);
    var trem = amStage(ctx, g, t, e, 9, 0.4, 'sine');
    var lp = F(ctx, 'lowpass', 900 * p, 1, trem.node);
    glide(lp.frequency, t, [[0, 900 * p], [0.9, 1800 * p]]);
    var ch = [110, 130.8, 155.6]; // soft diminished cluster sliding up
    for (var i = 0; i < 3; i++) {
      var s = O(ctx, 'sawtooth', ch[i] * p, t, e, G(ctx, 0.3, lp));
      s.detune.value = (i - 1) * 6;
      glide(s.frequency, t, [[0, ch[i] * p], [0.95, ch[i] * 1.19 * p]]);
    }
    var wg = G(ctx, 0, dest); // slide-whistle rising on top
    env(wg.gain, t, [[0, 0], [0.25, 0], [0.4, 0.07], [0.85, 0.06], [0.98, 0]]);
    glide(O(ctx, 'sine', 600 * p, t, e, wg).frequency, t, [[0.25, 600 * p], [0.95, 900 * p]]);
    return 1.0;
  });

  cue('thought.pop', function (ctx, dest, t, o) { // soft bubble "bloop"
    var p = o.pitch, g = G(ctx, 0, dest);
    env(g.gain, t, [[0, 0], [0.006, 0.4], [0.08, 0.28], [0.2, 0]]);
    glide(O(ctx, 'sine', 280 * p, t, t + 0.21, F(ctx, 'lowpass', 1500 * p, 0.5, g)).frequency, t,
      [[0, 280 * p], [0.07, 680 * p], [0.18, 640 * p]]);
    blip(ctx, dest, t + 0.09, 'sine', 380 * p, 900 * p, 0.06, 0.22, 0.004, 0.18);
    return 0.3;
  });

  cue('chest.open', function (ctx, dest, t, o) { // lid creak + magical shimmer
    var p = o.pitch, r = o.rnd;
    creak(ctx, dest, t, 0.45, r, { lo: 16, hi: 38, f1: 520 * p, q1: 7, g1: 5, f2: 1200 * p, q2: 9, g2: 3, amp: 0.45, drift: 1.2 });
    var n = [784, 880, 1047, 1175, 1319, 1568, 1760];
    for (var i = 0; i < n.length; i++) chime(ctx, dest, t + 0.3 + i * 0.045, n[i] * p, 0.1, 0.3);
    var sg = G(ctx, 0, dest);
    env(sg.gain, t, [[0, 0], [0.35, 0], [0.5, 0.05], [0.88, 0]]);
    var trem = amStage(ctx, sg, t + 0.3, t + 0.9, 12, 0.5);
    O(ctx, 'sine', 2093 * p, t + 0.3, t + 0.9, trem.node);
    O(ctx, 'sine', 2637 * p, t + 0.3, t + 0.9, trem.node);
    return 0.9;
  });

  cue('dust.puff', function (ctx, dest, t, o) { // soft "poof"
    var p = o.pitch, g = G(ctx, 0, dest);
    env(g.gain, t, [[0, 0], [0.02, 0.65], [0.08, 0.38], [0.28, 0]]);
    var lp = F(ctx, 'lowpass', 1600 * p, 0.7, g);
    glide(lp.frequency, t, [[0, 1600 * p], [0.2, 350 * p]]);
    N(ctx, t, t + 0.3, lp);
    blip(ctx, dest, t, 'sine', 120 * p, 70 * p, 0.08, 0.28, 0.004, 0.12);
    return 0.3;
  });

  /* ================================================================== *
   * 4. Music: instruments, songs and a step player.
   *    A song is a step grid. step(c, out, i, t, st, silent) schedules the
   *    notes of grid step i at time t. The same player code drives the live
   *    lookahead scheduler and the offline test render, and the step counter
   *    simply wraps, so loops are seamless.
   * ================================================================== */
  function mallet(c, dest, t, f, vel, decay, plain) { // marimba-ish: sine + quick 4th harmonic
    var g = G(c, 0, dest);
    ad(g.gain, t, 0.002, 0.3 * vel, decay);
    O(c, 'sine', f, t, t + decay + 0.05, g);
    if (!plain) {
      var k = G(c, 0, dest);
      ad(k.gain, t, 0.001, 0.08 * vel, decay * 0.2);
      O(c, 'sine', f * 4, t, t + decay * 0.2 + 0.03, k);
    }
  }
  function pluckBass(c, dest, t, f, vel, d) {
    var g = G(c, 0, dest);
    ad(g.gain, t, 0.004, 0.26 * vel, d);
    var lp = F(c, 'lowpass', 1500, 3, g);
    glide(lp.frequency, t, [[0, 1500], [0.16, 240]]);
    O(c, 'sawtooth', f, t, t + d + 0.05, lp);
    O(c, 'triangle', f, t, t + d + 0.05, G(c, 0.6, g));
  }
  function kick(c, dest, t, vel) {
    var g = G(c, 0, dest);
    ad(g.gain, t, 0.002, 0.55 * vel, 0.2);
    glide(O(c, 'sine', 150, t, t + 0.25, g).frequency, t, [[0, 150], [0.08, 48]]);
  }
  function shaker(c, dest, t, vel) {
    var g = G(c, 0, dest);
    ad(g.gain, t, 0.006, 0.12 * vel, 0.045);
    N(c, t, t + 0.07, F(c, 'highpass', 6500, 0.7, g));
  }
  function bongo(c, dest, t, f, vel) {
    var g = G(c, 0, dest);
    ad(g.gain, t, 0.001, 0.26 * vel, 0.1);
    glide(O(c, 'sine', f * 1.2, t, t + 0.13, g).frequency, t, [[0, f * 1.2], [0.03, f]]);
  }
  function snare(c, dest, t, vel) {
    hiss(c, dest, t, 'bandpass', 1800, 0.7, 0.26 * vel, 0.001, 0.12);
    var b = G(c, 0, dest);
    ad(b.gain, t, 0.001, 0.18 * vel, 0.07);
    glide(O(c, 'triangle', 200, t, t + 0.1, b).frequency, t, [[0, 200], [0.05, 150]]);
  }
  function softTom(c, dest, t, vel) {
    var g = G(c, 0, dest);
    ad(g.gain, t, 0.004, 0.4 * vel, 0.35);
    glide(O(c, 'sine', 110, t, t + 0.4, g).frequency, t, [[0, 110], [0.2, 78]]);
  }

  var SONGS = {
    // Bouncy jungle-temple adventure: 112 BPM, C major pentatonic, 8 bars of 16ths.
    title: {
      bpm: 112, spb: 4, steps: 128, level: 0.8,
      roots: [48, 48, 45, 45, 41, 43, 48, 43],
      mel: [[76, 0, 79, 81, 79, 0, 76, 0], [72, 74, 76, 0, 79, 0, 76, 74],
        [72, 0, 69, 72, 76, 0, 74, 72], [69, 0, 0, 0, 76, 74, 72, 74],
        [81, 0, 84, 81, 79, 0, 81, 0], [79, 0, 74, 76, 79, 0, 81, 79],
        [76, 79, 84, 0, 86, 0, 84, 81], [79, 0, 76, 0, 74, 0, 0, 0]],
      comp: [[64, 67], [64, 67], [60, 64], [60, 64], [60, 65], [59, 62], [64, 67], [59, 62]],
      step: function (c, out, i, t, st, silent) {
        if (silent) return;
        var S = SONGS.title, bar = i >> 4, s = i & 15, root = S.roots[bar];
        if (s & 1) t += 0.016; // a little swing on the off-16ths
        collect(function () {
          if (!(s & 1)) {
            var m = S.mel[bar][s >> 1];
            if (m) mallet(c, out, t, mtof(m), (s & 3) ? 0.75 : 0.95, 0.5);
          }
          if (s % 4 === 0) pluckBass(c, out, t, mtof(root + [0, 7, 12, 7][s >> 2]), s === 0 ? 1 : 0.8, 0.28);
          if (s === 2 || s === 6 || s === 10 || s === 14) {
            var d = S.comp[bar];
            mallet(c, out, t, mtof(d[0]), 0.3, 0.14, true);
            mallet(c, out, t, mtof(d[1]), 0.3, 0.14, true);
          }
          if (s === 0 || s === 8 || (s === 14 && (bar & 1))) kick(c, out, t, s === 14 ? 0.5 : 0.9);
          shaker(c, out, t, [0.5, 0.18, 0.8, 0.18][s & 3]);
          if (s === 3 || s === 11) bongo(c, out, t, 400, 0.45);
          if (s === 6 || s === 14) bongo(c, out, t, 270, 0.5);
        });
      }
    },

    // Soft and a little mysterious: 84 BPM, A minor pentatonic, 8 bars of 8ths.
    // Sparse mallets with an echo over a warm drone; sits quietly under voice.
    game: {
      bpm: 84, spb: 2, steps: 64, level: 0.55,
      pad: [[45, 52], [45, 52], [41, 48], [43, 50], [45, 52], [45, 52], [41, 48], [40, 47]],
      mel: [[69, 0, 0, 76, 0, 0, 0, 0], [0, 0, 74, 0, 72, 0, 0, 0],
        [69, 0, 0, 72, 0, 0, 67, 0], [0, 0, 0, 0, 74, 0, 0, 0],
        [76, 0, 0, 79, 0, 0, 81, 0], [0, 0, 79, 0, 76, 0, 0, 0],
        [74, 0, 0, 72, 0, 0, 69, 0], [0, 0, 0, 0, 64, 0, 0, 0]],
      setup: function (c, out, pl) {
        var t = c.currentTime, P = SONGS.game.pad[0], st = {};
        var bag = hold(function () {
          st.mel = G(c, 1, out); // mallet bus -> dry + dotted-eighth echo (feedback 0.3)
          var dl = track(c.createDelay(2)), dlp = F(c, 'lowpass', 2000, null, G(c, 0.45, out));
          dl.delayTime.value = pl.dt * 1.5;
          st.mel.connect(dl);
          dl.connect(dlp);
          dlp.connect(G(c, 0.3, dl));
          var padG = G(c, 0, out), pf = F(c, 'lowpass', 480, 0.5, padG); // warm low drone
          padG.gain.setValueAtTime(0, t);
          padG.gain.linearRampToValueAtTime(0.16, t + 2);
          st.o1 = OL(c, 'triangle', mtof(P[0]), t, pf);
          st.o2 = OL(c, 'sawtooth', mtof(P[0]) * 1.004, t, G(c, 0.35, pf));
          st.o3 = OL(c, 'triangle', mtof(P[1]), t, pf);
          OL(c, 'sine', 0.08, t, G(c, 160, pf.frequency)); // slow filter "breathing"
        });
        pl.keep = bag.nodes;
        pl.srcs = bag.srcs;
        st.chord = function (time, ch) { // glide the drone to the next chord
          var a = mtof(ch[0]);
          st.o1.frequency.setTargetAtTime(a, time, 0.25);
          st.o2.frequency.setTargetAtTime(a * 1.004, time, 0.25);
          st.o3.frequency.setTargetAtTime(mtof(ch[1]), time, 0.25);
        };
        return st;
      },
      step: function (c, out, i, t, st, silent) {
        var S = SONGS.game, bar = i >> 3, s = i & 7;
        if (s === 0) st.chord(t, S.pad[bar]);
        if (silent) return;
        collect(function () {
          var m = S.mel[bar][s];
          if (m) mallet(c, st.mel, t, mtof(m), 0.6, 1.2);
          if (s === 2 || s === 6) shaker(c, out, t, 0.25);
          if (s === 0 && !(bar & 1)) softTom(c, out, t, 0.5);
        });
      }
    },

    // Triumphant and happy: 120 BPM, C major, 4 bars of 16ths.
    finale: {
      bpm: 120, spb: 4, steps: 64, level: 0.75,
      roots: [48, 41, 43, 48],
      triads: [[60, 64, 67], [60, 65, 69], [59, 62, 67], [60, 64, 67]],
      lead: [[0, 67, 2], [2, 72, 2], [4, 76, 2], [6, 79, 4], [10, 76, 2], [12, 79, 4],
        [16, 81, 6], [22, 79, 2], [24, 77, 2], [26, 81, 2], [28, 84, 4],
        [32, 83, 4], [36, 79, 2], [38, 74, 2], [40, 79, 4], [44, 83, 2], [46, 86, 2],
        [48, 84, 6], [54, 79, 2], [56, 76, 2], [58, 79, 2], [60, 84, 4]],
      leadAt: null,
      step: function (c, out, i, t, st, silent) {
        if (silent) return;
        var S = SONGS.finale, bar = i >> 4, s = i & 15, root = S.roots[bar], tri = S.triads[bar];
        var dt = 60 / S.bpm / S.spb, fill = bar === 3 && s >= 12;
        if (!S.leadAt) {
          S.leadAt = [];
          for (var k = 0; k < S.lead.length; k++) S.leadAt[S.lead[k][0]] = S.lead[k];
        }
        collect(function () {
          var L = S.leadAt[i];
          if (L) brass(c, out, t, mtof(L[1]), L[2] * dt - 0.03, 0.12);
          if (s === 0) for (var j = 0; j < 3; j++) brass(c, out, t, mtof(tri[j]), dt * 2.5, 0.05, true);
          if (!(s & 1)) mallet(c, out, t, mtof(tri[[0, 1, 2, 1][(s >> 1) & 3]] + 12), 0.4, 0.3);
          if (s % 4 === 0) pluckBass(c, out, t, mtof(root + (s === 8 ? 7 : 0)), 0.9, 0.25);
          if (s === 0 || s === 8 || (bar === 3 && s === 10)) kick(c, out, t, 1);
          if ((s === 4 || s === 12) && !fill) snare(c, out, t, 0.8);
          if (fill) snare(c, out, t, 0.35 + (s - 12) * 0.15);
          if (!(s & 1)) shaker(c, out, t, (s & 2) ? 0.7 : 0.35);
          if (i === 0) hiss(c, out, t, 'highpass', 5000, 0.7, 0.12, 0.002, 1.0); // soft crash
        });
      }
    }
  };

  function makePlayer(c, dest, name, fade) {
    var song = SONGS[name], t = c.currentTime, out = c.createGain();
    out.connect(dest);
    out.gain.setValueAtTime(fade ? 0 : song.level, t);
    if (fade) out.gain.linearRampToValueAtTime(song.level, t + fade);
    var pl = {
      name: name, song: song, ctx: c, out: out, step: 0, next: t + 0.06,
      dt: 60 / song.bpm / song.spb, stopAt: Infinity, disposeAt: null, keep: [], srcs: []
    };
    pl.st = song.setup ? song.setup(c, out, pl) : {};
    return pl;
  }
  function schedulePlayer(pl, horizon, silent) {
    var now = pl.ctx.currentTime;
    if (pl.next < now - 0.1) { // fell behind (jank / throttled timer): skip ahead on the grid, no burst
      var k = Math.ceil((now - pl.next) / pl.dt);
      pl.step += k;
      pl.next += k * pl.dt;
    }
    while (pl.next < horizon && pl.next < pl.stopAt) {
      pl.song.step(pl.ctx, pl.out, pl.step % pl.song.steps, pl.next, pl.st, silent);
      pl.step++;
      pl.next += pl.dt;
    }
  }
  function fadeOutPlayer(pl, secs) {
    var t = pl.ctx.currentTime;
    rampTo(pl.out.gain, 0, secs, pl.ctx);
    pl.stopAt = t + secs;
    pl.disposeAt = t + secs + 3; // let echoes and decays finish
    stopAll(pl.srcs, t + secs + 0.1);
  }
  function disposePlayer(pl) {
    stopAll(pl.srcs, 0);
    disposeAll(pl.keep);
    try { pl.out.disconnect(); } catch (e) { /* gone */ }
  }

  /* ================================================================== *
   * 5. Engine state, buses and levels
   *    musicBus (0.32) + sfxBus (0.8) -> master (0.9) -> gentle compressor
   *    -> safety soft-clip (transparent below 0.8) -> speakers.
   *    Ambience rides on sfxBus, so it follows the sfx toggle.
   * ================================================================== */
  var LV = { master: 0.9, music: 0.32, sfx: 0.8, amb: 0.3, duck: 0.2 };
  var enabled = { music: true, sfx: true, voice: true };
  var ctx = null, master = null, comp = null, musicBus = null, sfxBus = null;
  var duckGame = false, duckSpeech = false, autoSuspended = false, listening = false;

  function musicTarget() { return enabled.music ? LV.music * ((duckGame || duckSpeech) ? LV.duck : 1) : 0; }
  function sfxTarget() { return enabled.sfx ? LV.sfx : 0; }

  // Smoothly move a param from wherever it is now to v over secs.
  function rampTo(param, v, secs, c) {
    c = c || ctx;
    if (!c) return;
    var t = c.currentTime, cur = param.value;
    try {
      param.cancelScheduledValues(t);
      param.setValueAtTime(cur, t);
      param.linearRampToValueAtTime(v, t + secs);
    } catch (e) { param.value = v; }
  }

  function safetyCurve() { // input range +-3 (after the 1/3 pre-gain); linear up to 0.8, soft knee to 1.0
    var n = 4097, c = new Float32Array(n);
    for (var i = 0; i < n; i++) {
      var a = (i / (n - 1) * 2 - 1) * 3, m = Math.abs(a);
      c[i] = (m <= 0.8 ? m : 0.8 + 0.2 * Math.tanh((m - 0.8) / 0.2)) * (a < 0 ? -1 : 1);
    }
    return c;
  }
  function buildGraph() {
    comp = ctx.createDynamicsCompressor(); // gentle safety net so stacked cues never clip
    comp.threshold.value = -8;
    comp.knee.value = 8;
    comp.ratio.value = 3;
    comp.attack.value = 0.004;
    comp.release.value = 0.25;
    var pre = ctx.createGain(), clip = ctx.createWaveShaper(); // transparent below 0.8, never exceeds 1.0
    pre.gain.value = 1 / 3;
    clip.curve = safetyCurve();
    comp.connect(pre);
    pre.connect(clip);
    clip.connect(ctx.destination);
    master = ctx.createGain();
    master.gain.value = LV.master;
    master.connect(comp);
    musicBus = ctx.createGain();
    musicBus.gain.value = musicTarget();
    musicBus.connect(master);
    sfxBus = ctx.createGain();
    sfxBus.gain.value = sfxTarget();
    sfxBus.connect(master);
  }

  function isLive() { return !!ctx && ctx.state !== 'closed' && !autoSuspended && !(doc && doc.hidden); }
  function resumeCtx() {
    try { var p = ctx.resume(); if (p && p.catch) p.catch(noop); } catch (e) { /* ignore */ }
  }
  function onVisibility() { // pause everything while the tab is hidden (saves battery, no stale bursts)
    if (!ctx) return;
    try {
      if (doc.hidden) {
        if (ctx.state === 'running') {
          autoSuspended = true;
          var p = ctx.suspend();
          if (p && p.catch) p.catch(noop);
        }
      } else if (autoSuspended) {
        autoSuspended = false;
        resumeCtx();
      }
    } catch (e) { /* ignore */ }
  }
  function onGesture() { // iOS may "interrupt" the context; any later tap revives it
    if (ctx && !autoSuspended && ctx.state !== 'running' && ctx.state !== 'closed') resumeCtx();
  }
  function installListeners() {
    if (listening) return;
    listening = true;
    try {
      if (doc) doc.addEventListener('visibilitychange', onVisibility, false);
      var evs = ['pointerdown', 'touchend', 'mousedown', 'keydown'];
      for (var i = 0; i < evs.length; i++) win.addEventListener(evs[i], onGesture, true);
      ctx.onstatechange = function () { if (ctx.state === 'running') ensureTimer(); };
    } catch (e) { /* ignore */ }
  }

  /* ================================================================== *
   * 6. Sound-effect playback
   * ================================================================== */
  var CAP = { // max simultaneous voices per cue (default 3); oldest is faded out
    'coin.clink': 6, 'ui.tap': 4, 'ui.pop': 4, 'grumble.snoreIn': 2, 'grumble.snoreOut': 2,
    'grumble.roar': 1, 'grumble.yawn': 1, 'zippy.laugh': 2, 'fanfare': 1, 'tension': 1
  };
  var active = {};   // cue -> [voice]
  var lastPlay = {}; // cue|index -> ctx time (drops accidental double triggers)

  function normOpts(opts) {
    opts = opts || {};
    var seed = opts.seed !== undefined ? num(opts.seed, 1) : Math.floor(Math.random() * 4294967296);
    return {
      volume: clamp(num(opts.volume, 1), 0, 2),
      pitch: clamp(num(opts.pitch, 1), 0.25, 4),
      index: Math.round(clamp(num(opts.index, 0), -12, 24)),
      rnd: rng(seed)
    };
  }

  function finishVoice(v) {
    if (v.done) return;
    v.done = true;
    var list = active[v.cue], i = list ? list.indexOf(v) : -1;
    if (i >= 0) list.splice(i, 1);
    if (v.c) v.c.finish();
    try { v.gain.disconnect(); } catch (e) { /* gone */ }
  }
  function stealVoice(v) { // quick 40 ms fade, then stop its sources early
    var t = ctx.currentTime;
    rampTo(v.gain.gain, 0, 0.04);
    if (v.c) stopAll(v.c.srcs, t + 0.05);
    var list = active[v.cue], i = list ? list.indexOf(v) : -1;
    if (i >= 0) list.splice(i, 1);
  }

  function playSynth(name, o) {
    var fn = CUES[name];
    if (!fn) { warnOnce('unknown cue "' + name + '"'); return; }
    if (!isLive()) return;
    var now = ctx.currentTime, key = name + '|' + o.index;
    if (lastPlay[key] !== undefined && Math.abs(now - lastPlay[key]) < 0.015) return;
    lastPlay[key] = now;
    var list = active[name] || (active[name] = []), cap = CAP[name] || 3;
    while (list.length >= cap) stealVoice(list[0]);
    var vg = ctx.createGain();
    vg.gain.value = o.volume;
    vg.connect(sfxBus);
    var v = { cue: name, gain: vg, c: null, done: false };
    list.push(v);
    try {
      v.c = collect(function () { return fn(ctx, vg, now + 0.005, o); }, function () { finishVoice(v); });
    } catch (e) {
      finishVoice(v);
      throw e;
    }
    // wall-clock safety net in case 'ended' never fires (keeps the voice list honest)
    setTimeout(function () { finishVoice(v); }, ((v.c.ret || 1) + 4) * 1000);
  }

  // ---- recorded overrides (HTMLAudioElement works from file://) ----------
  var ovBase = {}, ovBad = {}, ovLive = {}, ovUsed = {};
  function contentAudio() {
    var C = null;
    try { C = (typeof CONTENT !== 'undefined' && CONTENT) || win.CONTENT || null; } catch (e) { C = win.CONTENT || null; }
    var a = C && typeof C === 'object' ? C.audio : null;
    return a && typeof a === 'object' ? a : null;
  }
  function overridePath(name) {
    var a = contentAudio(), m = a && a.overrides, p = m && typeof m === 'object' ? m[name] : null;
    return typeof p === 'string' && p ? p : null;
  }
  function playOverride(name, path, o) {
    if (ovBad[path] || typeof win.Audio !== 'function') return false;
    var base = ovBase[path];
    if (!base) {
      base = ovBase[path] = new win.Audio();
      base.preload = 'auto';
      base.addEventListener('error', function () { ovBad[path] = true; });
      base.src = path;
    }
    var el = ovUsed[path] ? base.cloneNode(false) : base, failed = false; // later plays clone, so overlaps work
    ovUsed[path] = true;
    var live = ovLive[name] || (ovLive[name] = []);
    function rm() { var i = live.indexOf(el); if (i >= 0) live.splice(i, 1); }
    function fail(bad) { // fall back to the synth version of the cue
      if (failed) return;
      failed = true;
      rm();
      if (bad) ovBad[path] = true;
      try { playSynth(name, o); } catch (e) { /* ignore */ }
    }
    while (live.length >= 4) { try { live.shift().pause(); } catch (e) { /* ignore */ } }
    el.volume = clamp(o.volume * LV.sfx * LV.master, 0, 1);
    if (o.pitch !== 1) {
      try {
        el.preservesPitch = el.mozPreservesPitch = el.webkitPreservesPitch = false;
        el.playbackRate = clamp(o.pitch, 0.5, 2);
      } catch (e) { /* ignore */ }
    }
    el.addEventListener('ended', rm);
    el.addEventListener('error', function () { fail(true); });
    live.push(el);
    try {
      var pr = el.play();
      if (pr && pr.catch) pr.catch(function (err) { if (!err || err.name !== 'AbortError') fail(false); });
    } catch (e) { fail(false); }
    return true;
  }
  function pauseOverrides() {
    for (var k in ovLive) {
      if (!Object.prototype.hasOwnProperty.call(ovLive, k)) continue;
      while (ovLive[k].length) { try { ovLive[k].shift().pause(); } catch (e) { /* ignore */ } }
    }
  }

  function play(name, opts) {
    if (!enabled.sfx) return;
    name = String(name);
    var o = normOpts(opts), path = overridePath(name);
    if (path && playOverride(name, path, o)) return;
    playSynth(name, o);
  }

  /* ================================================================== *
   * 7. Music control (crossfades) and the temple ambience
   * ================================================================== */
  var players = [], curPlayer = null, wantMusic = null, wantAmb = false, amb = null;

  function switchMusic(name) {
    if (curPlayer && curPlayer.name === name) return; // already playing
    var had = !!curPlayer;
    if (curPlayer) { fadeOutPlayer(curPlayer, 0.8); curPlayer = null; }
    if (name) {
      curPlayer = makePlayer(ctx, musicBus, name, had ? 0.8 : 0.03); // 0.8 s crossfade
      players.push(curPlayer);
      ensureTimer();
      tick();
    }
  }
  function music(name) {
    name = name ? String(name) : null;
    if (name && !SONGS[name]) { warnOnce('unknown music "' + name + '"'); return; }
    wantMusic = name; // remembered if called before init()
    if (ctx) switchMusic(name);
  }

  function ambStart() {
    if (!ctx) return;
    if (amb) {
      if (amb.stopAt === null) return;
      disposeAmb(); // was fading out: replace it
    }
    var t = ctx.currentTime, a = { stopAt: null, nextPop: t + 0.4, nextDrip: t + 1.5 + Math.random() * 3 };
    var bag = hold(function () {
      a.out = G(ctx, 0, sfxBus);
      a.out.gain.setValueAtTime(0, t);
      a.out.gain.linearRampToValueAtTime(LV.amb, t + 1.2);
      var src = NL(ctx, t, null), bedG = G(ctx, 0.22, a.out); // one looping noise feeds the flame bed...
      src.connect(F(ctx, 'lowpass', 380, null, bedG));
      OL(ctx, 'sine', 0.37, t, G(ctx, 0.09, bedG.gain)); // ...with a slow flicker
      a.crG = G(ctx, 0, a.out); // ...and the crackle pops (gain spikes)
      src.connect(F(ctx, 'bandpass', 2800, 0.8, a.crG));
      a.dl = track(ctx.createDelay(1)); // little cave echo for the drips
      a.dl.delayTime.value = 0.23;
      var dlp = F(ctx, 'lowpass', 2200, null, G(ctx, 0.5, a.out));
      a.dl.connect(dlp);
      dlp.connect(G(ctx, 0.35, a.dl));
    });
    a.nodes = bag.nodes;
    a.srcs = bag.srcs;
    amb = a;
    ensureTimer();
  }
  function ambStop() {
    if (!amb || amb.stopAt !== null) return;
    var t = ctx.currentTime;
    rampTo(amb.out.gain, 0, 0.6);
    amb.stopAt = t + 0.7;
    stopAll(amb.srcs, t + 0.7);
  }
  function disposeAmb() {
    if (!amb) return;
    stopAll(amb.srcs, 0);
    disposeAll(amb.nodes);
    amb = null;
  }
  function drip(t) { // pitch-dropping sine blip + echo
    var f = 1100 + Math.random() * 700, a = amb;
    collect(function () {
      var g = G(ctx, 0, a.out);
      g.connect(a.dl);
      ad(g.gain, t, 0.002, 0.18, 0.1);
      glide(O(ctx, 'sine', f, t, t + 0.14, g).frequency, t, [[0, f], [0.05, f * 0.45]]);
    });
  }
  function ambTick(now, horizon) {
    if (amb.stopAt !== null) { if (now > amb.stopAt + 0.1) disposeAmb(); return; }
    if (!enabled.sfx) { // skip work while effects are muted
      amb.nextPop = Math.max(amb.nextPop, horizon);
      amb.nextDrip = Math.max(amb.nextDrip, horizon + 2);
      return;
    }
    if (amb.nextPop < now - 0.2) amb.nextPop = now + 0.05;
    while (amb.nextPop < horizon) { // torch crackle: single pops and little clusters
      var t = amb.nextPop, cnt = Math.random() < 0.35 ? 2 + ((Math.random() * 2) | 0) : 1;
      for (var i = 0; i < cnt; i++) spike(amb.crG.gain, t + i * 0.022, 0.1 + Math.random() * 0.3, 0.003 + Math.random() * 0.005);
      amb.nextPop = t + cnt * 0.022 + 0.15 + Math.pow(Math.random(), 2) * 1.4;
    }
    if (amb.nextDrip < now - 0.2) amb.nextDrip = now + 1;
    while (amb.nextDrip < horizon) {
      drip(amb.nextDrip);
      amb.nextDrip += 3.5 + Math.random() * 6;
    }
  }
  function ambience(on) {
    wantAmb = !!on;
    if (!ctx) return;
    if (wantAmb) ambStart(); else ambStop();
  }

  /* ================================================================== *
   * 8. Lookahead scheduler: a 25 ms timer schedules notes ~0.12 s ahead on
   *    the AudioContext clock, so tab jank never makes the music stumble.
   *    It idles while the context is suspended and stops when unused.
   * ================================================================== */
  var timer = null, LOOKAHEAD = 0.12;
  function ensureTimer() {
    if (!timer && ctx && (players.length || amb)) timer = setInterval(tick, 25);
  }
  function tick() {
    try {
      if (!ctx) return;
      if (!players.length && !amb) {
        if (timer) { clearInterval(timer); timer = null; }
        return;
      }
      if (ctx.state !== 'running') return; // paused: resume picks up exactly where it left off
      var now = ctx.currentTime, horizon = now + LOOKAHEAD;
      for (var i = players.length - 1; i >= 0; i--) {
        var pl = players[i];
        if (pl.disposeAt !== null && now >= pl.disposeAt) {
          disposePlayer(pl);
          players.splice(i, 1);
          continue;
        }
        schedulePlayer(pl, horizon, !enabled.music);
      }
      if (amb) ambTick(now, horizon);
    } catch (e) { warnOnce('scheduler error', e); }
  }

  /* ================================================================== *
   * 9. Speech: Web Speech API voices, optional recorded voice lines
   * ================================================================== */
  var VOICE_CFG = {
    narrator: { rate: 0.95, pitch: 1.05 },
    zippy: { rate: 1.05, pitch: 1.6 },
    grumble: { rate: 0.8, pitch: 0.3 } // sleepy and low
  };
  var NOVELTY = /albert|bad news|bahh|bells|boing|bubbles|cellos|good news|jester|organ|superstar|trinoids|whisper|wobble|zarvox|deranged|hysterical/i;
  var bestVoice = null, speechUnlocked = false, curJob = null, lastCancelAt = 0, voEl = null;

  function langOf(v) { return String(v.lang || '').replace(/_/g, '-').toLowerCase(); }
  function voiceScore(v) {
    var n = String(v.name || ''), s = 0;
    if (/natural|neural|enhanced|premium/i.test(n)) s += 3;
    if (/google|microsoft/i.test(n)) s += 1;
    if (v.localService) s += 0.5;
    if (NOVELTY.test(n)) s -= 10;
    return s;
  }
  function pickVoice(list) { // en-IN, else en-GB, else en-US, else any English, else default
    var prefs = ['en-in', 'en-gb', 'en-us', 'en'];
    for (var i = 0; i < prefs.length; i++) {
      var best = null, bs = -1e9;
      for (var j = 0; j < list.length; j++) {
        var l = langOf(list[j]);
        if (i < 3 ? l !== prefs[i] : l.indexOf('en') !== 0) continue;
        var sc = voiceScore(list[j]);
        if (sc > bs) { bs = sc; best = list[j]; }
      }
      if (best) return best;
    }
    return null;
  }
  function refreshVoices() {
    if (!synth) return;
    try {
      var list = synth.getVoices();
      if (list && list.length) bestVoice = pickVoice(list);
    } catch (e) { /* ignore */ }
  }
  if (synth) { // voices arrive asynchronously in Chrome
    refreshVoices();
    try {
      if (synth.addEventListener) synth.addEventListener('voiceschanged', refreshVoices);
      else synth.onvoiceschanged = refreshVoices;
    } catch (e) { /* ignore */ }
  }

  function setSpeechDuck(on) {
    duckSpeech = on;
    if (ctx) rampTo(musicBus.gain, musicTarget(), 0.25);
  }
  function recordedVoiceOn() { var a = contentAudio(); return !!(a && a.recordedVoice === true); }
  function getVoEl() {
    if (!voEl && typeof win.Audio === 'function') { voEl = new win.Audio(); voEl.preload = 'auto'; }
    return voEl;
  }
  function silentWav() { // tiny silent WAV built in memory (unlocks the VO element on iOS)
    var n = 64, b = new Uint8Array(44 + n * 2), v = new DataView(b.buffer), s = '', i;
    function str(o, x) { for (var j = 0; j < x.length; j++) b[o + j] = x.charCodeAt(j); }
    str(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); str(8, 'WAVE'); str(12, 'fmt ');
    v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
    v.setUint32(24, 8000, true); v.setUint32(28, 16000, true); v.setUint16(32, 2, true);
    v.setUint16(34, 16, true); str(36, 'data'); v.setUint32(40, n * 2, true);
    for (i = 0; i < b.length; i++) s += String.fromCharCode(b[i]);
    return 'data:audio/wav;base64,' + win.btoa(s);
  }

  // Cancel whatever is speaking. Its promise resolves {spoken:false}.
  function cancelSpeech() {
    var j = curJob, busy = false;
    if (j) j.finish(false);
    if (synth) {
      try {
        busy = synth.speaking || synth.pending;
        if (j || busy) synth.cancel();
        if (busy) lastCancelAt = Date.now();
      } catch (e) { /* ignore */ }
    }
  }

  function speakSynth(job, text, who) {
    if (job.done) return;
    if (!synth || !Utter) { job.finish(false); return; }
    var cfg = VOICE_CFG[who], u = new Utter(text);
    u.rate = cfg.rate;
    u.pitch = cfg.pitch;
    u.volume = 1;
    if (!bestVoice) refreshVoices();
    if (bestVoice) { u.voice = bestVoice; u.lang = bestVoice.lang; } else u.lang = 'en-IN';
    u.onstart = function () { job.started = true; };
    u.onend = function () { job.finish(true); };
    u.onerror = function () { job.finish(false); };
    job.utter = u; // keep a reference: Chrome drops 'end' for garbage-collected utterances
    // safety net: 'end' sometimes never fires
    var words = text.split(' ').length;
    job.timers.push(setTimeout(function () { job.finish(job.started); }, (words * 0.45 / Math.min(1, cfg.rate) + 2) * 1000));
    var go = function () {
      if (job.done) return;
      try {
        if (synth.paused) synth.resume();
        synth.speak(u);
      } catch (e) { job.finish(false); }
    };
    var since = Date.now() - lastCancelAt; // Chrome can swallow a speak() issued right after cancel()
    if (since < 120) job.timers.push(setTimeout(go, 120 - since)); else go();
  }

  function speakRecorded(job, id, fallback) {
    var el = getVoEl(), fell = false, mySrc;
    function detach() { el.onended = el.onerror = el.onplaying = null; }
    function fb() {
      if (fell || job.done) return;
      fell = true;
      detach();
      try { el.pause(); } catch (e) { /* ignore */ }
      job.audio = null;
      fallback();
    }
    if (!el) { fallback(); return; }
    detach();
    el.src = 'assets/vo/' + encodeURIComponent(id) + '.mp3';
    mySrc = el.src;
    el.volume = 1;
    job.audio = el;
    el.onerror = function () { if (el.src === mySrc) fb(); };
    el.onended = function () { if (el.src === mySrc) job.finish(true); };
    el.onplaying = function () {
      if (el.src !== mySrc || job.started) return;
      job.started = true;
      var d = isFinite(el.duration) && el.duration > 0 ? el.duration : 15;
      job.timers.push(setTimeout(function () { job.finish(true); }, (d + 1.5) * 1000));
    };
    job.timers.push(setTimeout(function () { if (!job.started) fb(); }, 3000)); // stalled load
    try {
      var pr = el.play();
      if (pr && pr.catch) pr.catch(function () { if (!job.started) fb(); });
    } catch (e) { fb(); }
  }

  function startSpeech(text, opts, settle) {
    cancelSpeech();
    text = (text === null || text === undefined ? '' : String(text)).replace(/\s+/g, ' ').trim();
    var id = opts.id !== undefined && opts.id !== null && opts.id !== '' ? String(opts.id) : null;
    var useRec = !!id && recordedVoiceOn() && typeof win.Audio === 'function';
    if (!enabled.voice || !text || (!useRec && !(synth && Utter))) { settle(false); return; }
    var who = Object.prototype.hasOwnProperty.call(VOICE_CFG, opts.who) ? opts.who : 'narrator';
    var job = { done: false, started: false, timers: [], audio: null, utter: null };
    job.finish = function (spoken) { // resolves exactly once
      if (job.done) return;
      job.done = true;
      for (var i = 0; i < job.timers.length; i++) clearTimeout(job.timers[i]);
      if (job.audio) {
        var a = job.audio;
        job.audio = null;
        a.onended = a.onerror = a.onplaying = null;
        try { a.pause(); } catch (e) { /* ignore */ }
      }
      job.utter = null;
      if (curJob === job) { curJob = null; setSpeechDuck(false); }
      settle(spoken);
    };
    curJob = job;
    setSpeechDuck(true);
    if (useRec) speakRecorded(job, id, function () { speakSynth(job, text, who); });
    else speakSynth(job, text, who);
  }

  function speak(text, opts) {
    if (typeof Promise === 'undefined') return { then: function (f) { if (f) f({ spoken: false }); } };
    return new Promise(function (resolve) {
      var settled = false;
      function settle(spoken) {
        if (settled) return;
        settled = true;
        resolve({ spoken: !!spoken });
      }
      try { startSpeech(text, opts && typeof opts === 'object' ? opts : {}, settle); } catch (e) {
        warnOnce('speak failed', e);
        if (curJob) curJob.finish(false);
        settle(false);
      }
    });
  }
  function stopSpeech() {
    cancelSpeech();
    if (voEl) { try { voEl.pause(); } catch (e) { /* ignore */ } }
  }

  /* ================================================================== *
   * 10. init, toggles, ducking
   * ================================================================== */
  function init() {
    if (!ctx && AC) {
      try { ctx = new AC({ latencyHint: 'interactive' }); } catch (e) { ctx = new AC(); }
      buildGraph();
      installListeners();
    }
    if (ctx) {
      if (ctx.state !== 'running' && ctx.state !== 'closed') resumeCtx();
      try { // older iOS only unlocks after a buffer is played inside the gesture
        var s = ctx.createBufferSource();
        s.buffer = ctx.createBuffer(1, 1, 22050);
        s.connect(ctx.destination);
        s.start(0);
      } catch (e) { /* ignore */ }
      if (wantMusic && !curPlayer) switchMusic(wantMusic);
      if (wantAmb && (!amb || amb.stopAt !== null)) ambStart();
    }
    if (synth && Utter && !speechUnlocked) { // iOS/Safari: first utterance must come from a gesture
      speechUnlocked = true;
      try {
        var u = new Utter(' ');
        u.volume = 0;
        synth.speak(u);
      } catch (e) { /* ignore */ }
      refreshVoices();
    }
    if (recordedVoiceOn() && !curJob) { // unlock the shared VO element for later, non-gesture plays
      var el = getVoEl();
      if (el && !el.src) {
        try {
          el.src = silentWav();
          var pr = el.play();
          if (pr && pr.catch) pr.catch(noop);
        } catch (e) { /* ignore */ }
      }
    }
  }

  function setEnabled(kind, on) {
    if (!Object.prototype.hasOwnProperty.call(enabled, kind)) return;
    enabled[kind] = !!on;
    if (kind === 'voice' && !on) stopSpeech();
    if (kind === 'sfx' && !on) pauseOverrides();
    if (!ctx) return;
    if (kind === 'music') rampTo(musicBus.gain, musicTarget(), 0.2);
    if (kind === 'sfx') rampTo(sfxBus.gain, sfxTarget(), 0.2);
  }
  function isEnabled(kind) {
    return Object.prototype.hasOwnProperty.call(enabled, kind) && enabled[kind] === true;
  }
  function duck(on) {
    duckGame = !!on;
    if (ctx) rampTo(musicBus.gain, musicTarget(), 0.25);
  }

  /* ================================================================== *
   * 11. Test hooks: render into an OfflineAudioContext and measure
   * ================================================================== */
  function measure(buf, t0) {
    var d = buf.getChannelData(0), sr = buf.sampleRate, peak = 0, nan = false, last = -1, sum = 0, i;
    for (i = 0; i < d.length; i++) {
      var x = d[i];
      if (x !== x) { nan = true; continue; }
      var a = x < 0 ? -x : x;
      if (a > peak) peak = a;
      if (a > 0.001) last = i;
    }
    var start = Math.floor(t0 * sr), end = Math.max(start, last + 1);
    for (i = start; i < end; i++) if (d[i] === d[i]) sum += d[i] * d[i];
    return {
      peak: peak, rms: Math.sqrt(sum / Math.max(1, end - start)),
      duration: Math.max(0, end / sr - t0), nan: nan
    };
  }
  function renderOffline(oc, t0, extra, resolve) {
    var done = false;
    function fin(buf) {
      if (done) return;
      done = true;
      var m = measure(buf, t0);
      for (var k in extra) if (Object.prototype.hasOwnProperty.call(extra, k)) m[k] = extra[k];
      resolve(m);
    }
    function fail(e) {
      if (done) return;
      done = true;
      resolve({ peak: 0, rms: 0, duration: 0, error: String((e && e.message) || e) });
    }
    oc.oncomplete = function (ev) { fin(ev.renderedBuffer); };
    var p = oc.startRendering();
    if (p && p.then) p.then(fin, fail);
  }
  function renderCueOffline(name, opts) {
    return new Promise(function (resolve) {
      try {
        var fn = CUES[name];
        if (!OAC || !fn) { resolve({ peak: 0, rms: 0, duration: 0, error: OAC ? 'unknown cue' : 'no OfflineAudioContext' }); return; }
        var sr = 44100, t0 = 0.01, oc = new OAC(1, Math.ceil(sr * 3.5), sr), o = normOpts(opts);
        var vg = oc.createGain();
        vg.gain.value = o.volume;
        vg.connect(oc.destination);
        var c = collect(function () { return fn(oc, vg, t0, o); });
        renderOffline(oc, t0, { nominal: c.ret, nodes: c.nodes.length }, resolve);
      } catch (e) { resolve({ peak: 0, rms: 0, duration: 0, error: String((e && e.message) || e) }); }
    });
  }
  function renderMusicOffline(name, secs) {
    return new Promise(function (resolve) {
      try {
        if (!OAC || !SONGS[name]) { resolve({ peak: 0, rms: 0, duration: 0, error: OAC ? 'unknown music' : 'no OfflineAudioContext' }); return; }
        secs = clamp(num(secs, 6), 0.5, 60);
        var sr = 44100, oc = new OAC(1, Math.ceil(sr * secs), sr), pl = makePlayer(oc, oc.destination, name, 0);
        schedulePlayer(pl, secs - 0.05, false);
        stopAll(pl.srcs, secs);
        renderOffline(oc, 0, { loopSeconds: pl.song.steps * pl.dt, steps: pl.step }, resolve);
      } catch (e) { resolve({ peak: 0, rms: 0, duration: 0, error: String((e && e.message) || e) }); }
    });
  }

  /* ================================================================== *
   * 12. Public API - every entry point is guarded so it never throws
   * ================================================================== */
  function guard(name, fn) {
    return function () {
      try { return fn.apply(null, arguments); } catch (e) { warnOnce(name + ' failed', e); }
    };
  }
  win.CQAudio = {
    init: guard('init', init),
    setEnabled: guard('setEnabled', setEnabled),
    isEnabled: function (kind) { try { return isEnabled(kind); } catch (e) { return false; } },
    play: guard('play', play),
    music: guard('music', music),
    ambience: guard('ambience', ambience),
    duck: guard('duck', duck),
    speak: speak,
    stopSpeech: guard('stopSpeech', stopSpeech),
    cues: Object.keys(CUES),
    _renderCueOffline: renderCueOffline,
    _renderMusicOffline: renderMusicOffline
  };
})(typeof window !== 'undefined' ? window : this);
