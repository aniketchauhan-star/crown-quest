#!/usr/bin/env python3
"""
When each word of a voice line is said: the word timings the game types the question bar with, so that
what a line names comes in on screen as the voice says it ("when the VO says 7, 7 should appear":
review, 2026-11-16).

    python3 tools/vo_timing.py            work out the timings of every clip that has none yet (or changed)
    python3 tools/vo_timing.py vo038 ...  show how these clips were cut into words (for checking by eye)

tools/vo_build.py runs this by itself and writes the timings into js/vo_lines.js, so nothing has to be
done by hand when new clips come in. The results are kept in tools/vo_timing.json (by clip, with the
clip's size, so a re-made clip is worked out again).

How: the clip is decoded (ffmpeg, or macOS's afconvert) and its loudness measured every 10 ms. The voice
starts after a short silence and pauses at full stops and commas, and the loudness dips between most
words. Each word of the line (as the question bar shows it: "x + 2 = 7" is five words) gets an expected
length from its syllables, as it is said ("7" is "seven", "LHS" is "L H S", "=" is "equals"). Then the
best cut of the voice into the words is found (dynamic programming): words close to their expected
lengths, word ends at dips in the loudness or at the pauses, and pauses where the line has a full stop or
a comma. Needs only Python 3 (and ffmpeg or macOS).
"""
import json
import math
import os
import re
import shutil
import struct
import subprocess
import sys
import tempfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SCRIPT = os.path.join(ROOT, "tools", "vo_script.json")
VO_DIR = os.path.join(ROOT, "assets", "vo")
CACHE = os.path.join(ROOT, "tools", "vo_timing.json")
VERSION = 4  # (bump when the method changes: every clip is worked out again)

SR = 16000  # samples a second, decoded
HOP = 0.01  # s between loudness measurements
WIN = 0.02  # s of sound in each


# --------------------------------------------------------------------------- the sound
def decode(path):
    """The clip as 16 kHz mono samples (ffmpeg, or macOS's afconvert)."""
    if shutil.which("ffmpeg"):
        raw = subprocess.run(["ffmpeg", "-v", "quiet", "-i", path, "-ac", "1", "-ar", str(SR), "-f", "s16le", "-"], capture_output=True, check=True).stdout
        return struct.unpack("<%dh" % (len(raw) // 2), raw)
    with tempfile.TemporaryDirectory() as tmp:
        wav = os.path.join(tmp, "a.wav")
        subprocess.run(["afconvert", "-f", "WAVE", "-d", "LEI16@%d" % SR, "-c", "1", path, wav], check=True, capture_output=True)
        data = open(wav, "rb").read()
        at = data.find(b"data") + 8
        return struct.unpack("<%dh" % ((len(data) - at) // 2), data[at:])


def hiss(samples):
    """How hissy each 10 ms step is (its zero-crossing rate): s, z, sh, ch and the ks of x are high."""
    hop, win = int(SR * HOP), int(SR * WIN)
    out = []
    for i in range(0, max(1, len(samples) - win), hop):
        seg = samples[i:i + win]
        z = 0
        for a, b in zip(seg, seg[1:]):
            if (a >= 0) != (b >= 0):
                z += 1
        out.append(z / max(1, len(seg)))
    return out


def loudness(samples):
    """dB (full scale) of each 10 ms step."""
    hop, win = int(SR * HOP), int(SR * WIN)
    out = []
    for i in range(0, max(1, len(samples) - win), hop):
        seg = samples[i:i + win]
        e = sum(x * x for x in seg) / max(1, len(seg))
        out.append(10 * math.log10(e / (32768.0 * 32768.0) + 1e-12))
    return out


# --------------------------------------------------------------------------- the words
ONES = "zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen".split()
TENS = "_ _ twenty thirty forty fifty sixty seventy eighty ninety".split()


def number_words(n):
    n = int(n)
    if n < 0:
        return ["negative"] + number_words(-n)
    if n < 20:
        return [ONES[n]]
    if n < 100:
        return [TENS[n // 10]] + ([ONES[n % 10]] if n % 10 else [])
    if n < 1000:
        return [ONES[n // 100], "hundred"] + (number_words(n % 100) if n % 100 else [])
    return ["thousand"] * 3


SYMBOLS = {"+": ["plus"], "=": ["equals"], "−": ["minus"], "-": ["minus"], "×": ["times"], "÷": ["divided", "by"], "≠": ["is", "not", "equal", "to"], "—": [], "–": [], "…": []}
LETTERS = {"lhs": ["l", "h", "s"], "rhs": ["r", "h", "s"]}


def spoken(word):
    """What is said for one word of the line, as words (best guess)."""
    w = word.replace("[[", "").replace("]]", " ").replace("{{", "").replace("}}", "").replace("<<", "").replace(">>", "").replace("##", "")
    w = w.replace("|", " divided by ").replace("^2", " squared").replace("²", " squared")
    out = []
    for part in re.split(r"\s+", w.strip()):
        if not part:
            continue
        core = part.strip(".,!?;:\"“”'’()")
        if core in SYMBOLS:
            out += SYMBOLS[core]
            continue
        if core.lower() in LETTERS:
            out += LETTERS[core.lower()]
            continue
        # numbers, with x after them (2x), a unit after a dash (5-unit), or a sign before them (−6)
        m = re.match(r"^([−-]?)(\d+(?:\.\d+)?)(x?)(?:-(\w+))?$", core)
        if m:
            if m.group(1):
                out.append("negative")
            out += number_words(float(m.group(2)))
            if m.group(3):
                out.append("x")
            if m.group(4):
                out.append(m.group(4))
            continue
        if core in ("x", "x)"):
            out.append("x")
            continue
        out += [p for p in re.split(r"[-–(]", core) if p]
    return out


def syllables(token):
    """Syllables in an English word (a rule of thumb, good enough for timing)."""
    w = re.sub(r"[^a-z]", "", token.lower())
    if not w:
        return 0
    special = {"x": 1, "l": 1, "h": 1, "s": 1, "r": 1, "zippy": 2, "grumble": 2, "every": 2, "equals": 2, "equal": 2, "equation": 3, "equations": 3, "variable": 4, "value": 2, "values": 2, "one": 1, "seven": 2, "eleven": 3, "being": 2, "idea": 3, "area": 3, "quiet": 2, "lion": 2, "create": 2, "linear": 3, "nonlinear": 4, "solution": 3}
    if w in special:
        return special[w]
    if len(w) <= 3:
        return 1
    w = re.sub(r"(?:[^laeiouy]es|[^laeiouy]ed|[^laeiouy]e)$", "", w)
    w = re.sub(r"^y", "", w)
    return max(1, len(re.findall(r"[aeiouy]{1,2}", w)))


def weight(word):
    """How long a word of the line takes, in syllable-ish units."""
    toks = spoken(word)
    if not toks:
        return 0.15  # (a dash: only a pause)
    w = 0.0
    for t in toks:
        s = syllables(t)
        if len(t) == 1 and t.isalpha() and t not in ("a",):
            w += 1.35  # letters said one by one (x, L H S) are said slowly and clearly
        elif t in ("a", "an", "the", "of", "to", "is", "it", "and", "or", "in", "on", "at", "as"):
            w += 0.75  # little words are said quickly
        else:
            w += 0.45 + s
    return w


def pause_after(word):
    """How much a pause is expected after this word: 2 after a sentence, 1 after a comma, else 0."""
    if re.search(r"[.!?…][\"”’)]?$", word):
        return 2
    if re.search(r"[,;:—–]$", word) or word in ("—", "–"):
        return 1
    return 0


# --------------------------------------------------------------------------- the cut
SIB_START = re.compile(r"^(sh|s|z|ch|c[eiy]|ps|j)")
SIB_END = re.compile(r"(s|z|x|ce|se|ze|sh|ch|ge|ks)$")
SIB_ANY = re.compile(r"(s|z|x|c[eiy]|sh|ch|j)")


def sibilants(word):
    """Does the word start with a hiss (s, z, sh, ch…), end with one, have one at all?"""
    toks = [t.lower() for t in spoken(word) if re.sub(r"[^a-z]", "", t.lower())]
    toks = [re.sub(r"[^a-z]", "", t) for t in toks]
    if not toks:
        return False, False, False
    first, last = toks[0], toks[-1]
    if first in ("x", "s"):  # (said "eks", "ess": a vowel first)
        start = False
    else:
        start = bool(SIB_START.match(first)) and len(first) > 1
    end = (bool(SIB_END.search(last)) and len(last) > 1) or last in ("h", "x", "s")
    anyw = any(SIB_ANY.search(t) for t in toks if len(t) > 1) or any(t in ("h", "x", "s") for t in toks)
    return start, end, anyw


def edges(db, peak):
    """Where the voice starts and ends (steps): the first and last steps above a soft level that lead to
    loud ones (so a soft s or h at the start counts, and a click alone doesn't)."""
    F = len(db)
    soft, loud = peak - 40, peak - 30
    T0, T1 = 0, F
    for f in range(F):
        if db[f] > soft and any(db[k] > loud for k in range(f, min(F, f + 15))):
            T0 = f
            break
    for f in range(F - 1, -1, -1):
        if db[f] > soft and any(db[k] > loud for k in range(max(0, f - 14), f + 1)):
            T1 = f + 1
            break
    return T0, max(T0 + 1, T1)


def cut_once(F, T0, T1, words, gaps, depth, hissy, rates):
    """One pass of the best cut. rates: expected steps per unit for each word."""
    N = len(words)
    wts = [weight(w) * (1.25 if pause_after(w) else 1.0) for w in words]  # (words before a pause are drawn out)
    pz = [pause_after(w) for w in words]
    sib = [sibilants(w) for w in words]
    # hissy steps counted up, for quick sums
    acc = [0]
    for h in hissy:
        acc.append(acc[-1] + (1 if h else 0))
    hs = lambda a, b: acc[max(0, min(F, b))] - acc[max(0, min(F, a))]
    INF = float("inf")
    gap_at = {a: b for a, b in gaps}
    gap_list = gaps

    def join_cost(i, u, v):
        """Word i ends at u, word i + 1 starts at v (v > u: a pause between)."""
        c = 0.0
        if sib[i][1]:
            c += -0.45 if hs(u - 5, u) >= 2 else 0.45
        if sib[i + 1][0]:
            c += -0.45 if hs(v, v + 5) >= 2 else 0.45
        if v == u and not sib[i][1] and not sib[i + 1][0] and hissy[max(0, u - 1)] and hissy[min(F - 1, u)]:
            c += 0.4  # (no word boundary in the middle of a hiss neither word makes)
        return c

    best = [dict() for _ in range(N + 1)]
    back = [dict() for _ in range(N + 1)]
    best[0][T0] = 0.0
    for i in range(N):
        exp = max(3.0, rates[i] * wts[i])
        lo = max(2, int(exp * 0.35))
        hi = max(lo + 2, int(exp * 2.6) + 4)
        last = i == N - 1
        for t, c0 in best[i].items():
            for u in range(t + lo, min(T1, t + hi) + 1):
                if last and u != T1:
                    continue
                if not last and u >= T1:
                    break
                c = c0 + 1.6 * (math.log((u - t) / exp)) ** 2  # its length near the expected one
                # a quiet run left inside a word (its letters can't be silent that long)
                inside = 0
                for a, b in gap_list:
                    if a > t + 2 and b < u - 2:
                        inside += b - a
                c += 0.04 * max(0, inside - 9)
                # hiss inside a word that has none, or none in a word that has one
                h = hs(t + 2, u - 2)
                if not sib[i][2] and h >= 6:
                    c += min(1.2, 0.1 * h)
                elif sib[i][2] and h == 0 and u - t > 8:
                    c += 0.35
                if last:
                    ends = [(u, u, 0.0)]
                else:
                    # straight on into the next word, best at a dip in the loudness
                    ends = [(u, u, -1.0 * depth[u] + (0.6 if pz[i] == 2 else 0.25 if pz[i] == 1 else 0.0) + join_cost(i, u, u))]
                    # or a pause first (a quiet run starting here)
                    if u in gap_at:
                        v = gap_at[u]
                        g = (v - u) * HOP
                        bonus = -1.4 if pz[i] == 2 else -0.9 if pz[i] == 1 else 0.3 + 3.0 * max(0.0, g - 0.12)
                        ends.append((u, v, bonus + join_cost(i, u, v)))
                for (e, v, extra) in ends:
                    cc = c + extra
                    if cc < best[i + 1].get(v, INF):
                        best[i + 1][v] = cc
                        back[i + 1][v] = (t, e)
    if not best[N]:
        return None
    v = min(best[N], key=best[N].get)
    cut = []
    for i in range(N, 0, -1):
        t, e = back[i][v]
        cut.append((t, e))
        v = t
    return cut[::-1]


def align(db, words, zc=None):
    """[(start, end)] in s for each word: the best cut of the voice into the words."""
    F = len(db)
    N = len(words)
    if not words or F < 5:
        return [(0.0, F * HOP)] * N
    peak = sorted(db)[int(F * 0.98)]
    T0, T1 = edges(db, peak)
    quiet = peak - 36  # silence
    # the voice's own quiet moments: runs of 7+ quiet steps (70 ms) inside it
    gaps = []
    i = T0
    while i < T1:
        if db[i] < quiet:
            j = i
            while j < T1 and db[j] < quiet:
                j += 1
            if j - i >= 7 and i > T0:
                gaps.append((i, j))
            i = j
        else:
            i += 1
    # how deep a dip is at each step: the loudness, smoothed, under the loudest near it
    sm = [sum(db[max(0, k - 1):k + 2]) / len(db[max(0, k - 1):k + 2]) for k in range(F)]
    depth = []
    for k in range(F):
        lo, hi = max(0, k - 9), min(F, k + 10)
        depth.append(max(0.0, min(18.0, max(sm[lo:hi]) - sm[k])) / 18.0)
    hissy = [bool(zc and zc[k] > 0.2 and db[k] > peak - 42) for k in range(F)]
    wts = [weight(w) * (1.25 if pause_after(w) else 1.0) for w in words]
    gap_time = sum(b - a for a, b in gaps if b - a >= 15)
    rate = max(4.0, (T1 - T0 - gap_time) / max(0.5, sum(wts)))  # steps per unit
    cut = cut_once(F, T0, T1, words, gaps, depth, hissy, [rate] * N)
    if cut is None:
        tot = sum(wts)
        out, a = [], 0.0
        for w in wts:
            s0 = T0 + (T1 - T0) * a / tot
            a += w
            out.append((s0 * HOP, (T0 + (T1 - T0) * a / tot) * HOP))
        return out
    # again, each sentence at its own pace (half its own, half the line's)
    rates, k = [], 0
    while k < N:
        j = k
        while j < N - 1 and pause_after(words[j]) < 2:
            j += 1
        took = sum(cut[m][1] - cut[m][0] for m in range(k, j + 1))
        r = took / max(0.5, sum(wts[k:j + 1]))
        rates += [0.5 * rate + 0.5 * r] * (j + 1 - k)
        k = j + 1
    cut2 = cut_once(F, T0, T1, words, gaps, depth, hissy, rates) or cut
    return [(a * HOP, b * HOP) for a, b in cut2]


# --------------------------------------------------------------------------- the words, heard
# Best: an offline speech recogniser (Vosk) hears the clip and says when each word starts and ends, to a
# few hundredths of a second; its words are then matched to the line's. Only when it isn't installed are
# the words cut by the loudness alone (align, above: up to half a second out). See docs/VOICEOVER.md,
# "Word timings", for setting it up (a Python venv with vosk, and its small English models).
MODEL_DIRS = [d for d in os.environ.get("VOSK_MODELS", "").split(os.pathsep) if d] or [
    os.path.expanduser("~/.cache/crown-quest/vosk/vosk-model-small-en-in-0.4"),
    os.path.expanduser("~/.cache/crown-quest/vosk/vosk-model-small-en-us-0.15"),
]
_models = None


def models():
    """The recogniser's models ([] when it isn't installed)."""
    global _models
    if _models is None:
        _models = []
        try:
            import vosk  # noqa: F401  (only in the venv: see docs/VOICEOVER.md)
            vosk.SetLogLevel(-1)
            for d in MODEL_DIRS:
                if os.path.isdir(d):
                    _models.append(vosk.Model(d))
        except Exception:  # (not installed: the loudness alone, then)
            _models = []
    return _models


def heard(samples, model):
    """The words the recogniser hears: [(word, start, end)]."""
    import vosk
    raw = struct.pack("<%dh" % len(samples), *samples)
    r = vosk.KaldiRecognizer(model, SR)
    r.SetWords(True)
    out = []
    for i in range(0, len(raw), 8000):
        if r.AcceptWaveform(raw[i:i + 8000]):
            out += json.loads(r.Result()).get("result", [])
    out += json.loads(r.FinalResult()).get("result", [])
    return [(w["word"], w["start"], w["end"]) for w in out]


def norm(t):
    return re.sub(r"[^a-z0-9]", "", t.lower())


def like(a, b):
    """How well a heard word matches a word of the line: 3 the same, 0.5–1.5 near, −1 not."""
    if a == b:
        return 3.0
    import difflib
    r = difflib.SequenceMatcher(None, a, b).ratio()
    if r >= 0.6:
        return 1.5
    if r >= 0.4 and a[:1] == b[:1]:
        return 0.5
    return -1.0


def match(toks, got):
    """Line words (toks) to heard words (got), in order (dynamic programming): {tok index: got index}."""
    n, m = len(toks), len(got)
    GAP = -1.2
    S = [[0.0] * (m + 1) for _ in range(n + 1)]
    B = [[None] * (m + 1) for _ in range(n + 1)]
    for i in range(1, n + 1):
        S[i][0] = S[i - 1][0] + GAP
        B[i][0] = "u"
    for j in range(1, m + 1):
        S[0][j] = S[0][j - 1] + GAP
        B[0][j] = "l"
    for i in range(1, n + 1):
        for j in range(1, m + 1):
            d = S[i - 1][j - 1] + like(toks[i - 1], got[j - 1])
            u = S[i - 1][j] + GAP
            l = S[i][j - 1] + GAP
            S[i][j], B[i][j] = max((d, "d"), (u, "u"), (l, "l"))
    pairs, i, j = {}, n, m
    while i > 0 or j > 0:
        b = B[i][j]
        if b == "d":
            if like(toks[i - 1], got[j - 1]) > 0:
                pairs[i - 1] = j - 1
            i, j = i - 1, j - 1
        elif b == "u":
            i -= 1
        else:
            j -= 1
    return pairs, S[n][m]


def vosk_align(samples, words):
    """[(start, end)] for each word of the line, from what the recogniser hears (None: not installed, or
    it heard too little of the line to trust)."""
    ms = models()
    if not ms:
        return None
    toks, owner = [], []
    for k, w in enumerate(words):
        for t in spoken(w):
            if norm(t):
                toks.append(norm(t))
                owner.append(k)
    if not toks:
        return None
    best = None
    for model in ms:
        got = heard(samples, model)
        pairs, score = match(toks, [norm(g[0]) for g in got])
        if best is None or score > best[0]:
            best = (score, pairs, got)
    score, pairs, got = best
    if len(pairs) < max(1, 0.5 * len(toks)):
        return None
    # each word of the line: its heard words' times; a word not heard is fitted in between its neighbours
    # by its length
    ts = [None] * len(toks)
    for i, j in pairs.items():
        ts[i] = (got[j][1], got[j][2])
    wt = [weight(t) for t in toks]
    i = 0
    while i < len(toks):
        if ts[i] is not None:
            i += 1
            continue
        j = i
        while j < len(toks) and ts[j] is None:
            j += 1
        a = ts[i - 1][1] if i > 0 else (ts[j][0] - 0.25 * sum(wt[i:j]) if j < len(toks) else 0.0)
        b = ts[j][0] if j < len(toks) else (ts[i - 1][1] + 0.25 * sum(wt[i:j]))
        if j < len(toks) and i > 0 and b - a < 0.06 * (j - i):
            # (squeezed between two heard words: take a share of the word before)
            a = ts[i - 1][0] + 0.55 * (ts[i - 1][1] - ts[i - 1][0])
            ts[i - 1] = (ts[i - 1][0], a)
        tot = sum(wt[i:j]) or 1.0
        acc = 0.0
        for k in range(i, j):
            s0 = a + (b - a) * acc / tot
            acc += wt[k]
            ts[k] = (s0, a + (b - a) * acc / tot)
        i = j
    out = []
    for k, w in enumerate(words):
        mine = [ts[i] for i in range(len(toks)) if owner[i] == k]
        if mine:
            out.append((mine[0][0], mine[-1][1]))
        else:
            # (a dash: nothing said; it comes with the pause after the word before)
            prev = out[-1][1] if out else 0.0
            out.append((prev, prev))
    return out


# --------------------------------------------------------------------------- all the clips
def load_cache():
    try:
        c = json.load(open(CACHE))
        return c if c.get("version") == VERSION else {"version": VERSION, "clips": {}}
    except (OSError, ValueError):
        return {"version": VERSION, "clips": {}}


def timings(only=None, quiet=False):
    """{clip id: [start, end, start, end, …] in s, one pair per word of its line} for every clip there
    is, worked out where they aren't known yet (or the clip has changed). Saves them."""
    script = json.load(open(SCRIPT))
    cache = load_cache()
    clips = cache["clips"]
    changed = False
    out = {}
    for e in script:
        path = os.path.join(VO_DIR, e["id"] + ".ogg")
        if not os.path.exists(path):
            continue
        if only and e["id"] not in only:
            continue
        key = "%d:%s" % (os.path.getsize(path), e["line"])
        got = clips.get(e["id"])
        if not got or got.get("key") != key or only or (models() and got.get("how") != "heard"):
            words = e["line"].split()
            smp = decode(path)
            cut = vosk_align(smp, words)
            how = "heard"
            if cut is None:
                if got and got.get("how") == "heard" and got.get("key") == key:
                    out[e["id"]] = got["t"]  # (heard before: keep it)
                    continue
                cut = align(loudness(smp), words, hiss(smp))
                how = "loudness"
            got = {"key": key, "how": how, "t": [round(x, 2) for pair in cut for x in pair]}
            clips[e["id"]] = got
            changed = True
            if not quiet:
                print("  timed %s (%d words, by %s)" % (e["id"], len(words), how))
        out[e["id"]] = got["t"]
    if changed and not only:
        json.dump(cache, open(CACHE, "w"), indent=0, separators=(",", ":"))
    return out


def show(ids):
    """The clips' loudness, with where each word starts (for checking by eye)."""
    script = {e["id"]: e for e in json.load(open(SCRIPT))}
    t = timings(only=set(ids), quiet=True)
    for cid in ids:
        e = script[cid]
        smp = decode(os.path.join(VO_DIR, cid + ".ogg"))
        db = loudness(smp)
        zc = hiss(smp)
        peak = sorted(db)[int(len(db) * 0.98)]
        bar = "".join(" .:-=+*#%@"[int(max(0, min(9, (v - (peak - 45)) / 5)))] for v in db)
        hb = "".join(("S" if z > 0.25 else "s" if z > 0.2 else " ") if d > peak - 42 else " " for z, d in zip(zc, db))
        words = e["line"].split()
        marks = [" "] * len(bar)
        for k, w in enumerate(words):
            a = int(round(t[cid][2 * k] / HOP))
            if 0 <= a < len(marks):
                marks[a] = "|"
        print("\n%s  %s" % (cid, e["line"]))
        for k in range(0, len(bar), 100):
            print("%5.2f %s" % (k * HOP, bar[k:k + 100]))
            print("      %s" % hb[k:k + 100])
            print("      %s" % "".join(marks[k:k + 100]))
        print("  " + "  ".join("%s@%.2f" % (w, t[cid][2 * k]) for k, w in enumerate(words)))


if __name__ == "__main__":
    if len(sys.argv) > 1:
        show(sys.argv[1:])
    else:
        n = len(timings())
        print("%d clips timed (tools/vo_timing.json)" % n)
