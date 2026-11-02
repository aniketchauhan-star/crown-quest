#!/usr/bin/env python3
"""
Build the game's voice lines from the TTS studio's zip files (see docs/VOICEOVER.md).

Run from anywhere:   python3 tools/vo_build.py [voiceovers_batch.zip ...]

What it does
- Every voNNN.mp3 in the zip(s) becomes assets/vo/voNNN.ogg: Ogg Opus, 32 kbps, mono. With several
  zips, a later one wins, so a zip of re-made lines can go last. It uses ffmpeg when that is
  installed, and otherwise macOS's own afconvert (its Opus packets are copied into an Ogg file).
- Rebuilds js/vo_lines.js from tools/vo_script.json: { "<line as shown>": ["voNNN", seconds] }.
- Deletes anything in assets/vo/ that no line uses, then lists the lines that have no clip yet
  (the game reads those with the device's own voice).
- Rewrites the table of every line in docs/VOICEOVER.md (between its vo-table markers).

Safe to run again. With no zip it only rebuilds the map. Needs only Python 3 (and ffmpeg or macOS).
"""
import json
import os
import re
import shutil
import struct
import subprocess
import sys
import tempfile
import zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SCRIPT = os.path.join(ROOT, "tools", "vo_script.json")
VO_DIR = os.path.join(ROOT, "assets", "vo")
MAP = os.path.join(ROOT, "js", "vo_lines.js")
DOC = os.path.join(ROOT, "docs", "VOICEOVER.md")
BITRATE = 32000


# --------------------------------------------------------------------------- Ogg pages
def crc32_ogg(data):
    """The Ogg page checksum: CRC-32, polynomial 0x04C11DB7, no reflection, starting at 0."""
    crc = 0
    for b in data:
        crc ^= b << 24
        for _ in range(8):
            crc = ((crc << 1) ^ 0x04C11DB7) if crc & 0x80000000 else crc << 1
            crc &= 0xFFFFFFFF
    return crc


def ogg_page(packets, granule, serial, seq, flags):
    """One Ogg page holding whole packets (each under 255 * 255 bytes, which Opus packets always are)."""
    lacing = b""
    for p in packets:
        lacing += b"\xff" * (len(p) // 255) + bytes([len(p) % 255])
    head = struct.pack("<4sBBqIIIB", b"OggS", 0, flags, granule, serial, seq, 0, len(lacing)) + lacing
    page = head + b"".join(packets)
    return page[:22] + struct.pack("<I", crc32_ogg(page)) + page[26:]


def ogg_duration(path):
    """Seconds of audio in an Ogg Opus file: the last page's granule position minus the pre-skip."""
    data = open(path, "rb").read()
    head = data.find(b"OpusHead")
    pre_skip = struct.unpack_from("<H", data, head + 10)[0]
    last = data.rfind(b"OggS")
    granule = struct.unpack_from("<q", data, last + 6)[0]
    return max(0, granule - pre_skip) / 48000.0


# --------------------------------------------------------------------------- CAF (afconvert) -> Ogg Opus
def read_caf(path):
    """The Opus packets afconvert wrote into a CAF file, with its rate and frame counts."""
    data = open(path, "rb").read()
    if data[:4] != b"caff":
        raise ValueError("not a CAF file: " + path)
    pos, chunks = 8, {}
    while pos + 12 <= len(data):
        kind, size = struct.unpack_from(">4sq", data, pos)
        pos += 12
        if size < 0:  # the data chunk may run to the end of the file
            size = len(data) - pos
        chunks[kind] = data[pos:pos + size]
        pos += size
    rate, fmt, _flags, _bpp, frames_per_packet, channels = struct.unpack_from(">d4sIIII", chunks[b"desc"])
    if fmt != b"opus":
        raise ValueError("CAF is not Opus: %r" % fmt)
    pakt = chunks[b"pakt"]
    n_packets, valid, priming, _remainder = struct.unpack_from(">qqii", pakt)
    sizes, i = [], 24
    for _ in range(n_packets):  # each packet's size: a big-endian base-128 number
        v = 0
        while True:
            b = pakt[i]
            i += 1
            v = (v << 7) | (b & 0x7F)
            if not b & 0x80:
                break
        sizes.append(v)
    audio = chunks[b"data"][4:]  # after the edit count
    packets, off = [], 0
    for s in sizes:
        packets.append(audio[off:off + s])
        off += s
    return {"rate": rate, "channels": channels, "fpp": frames_per_packet, "valid": valid, "priming": priming, "packets": packets}


def caf_to_ogg(caf_path, ogg_path, source_rate):
    """Copy the Opus packets into an Ogg Opus file (RFC 7845). Granule positions always count at
    48 kHz, so frame counts from a 24 kHz CAF are scaled up; the last page ends on the last real
    sample, so the encoder's padding is trimmed."""
    c = read_caf(caf_path)
    k = 48000.0 / c["rate"]
    pre_skip = int(round(c["priming"] * k))
    per_packet = int(round(c["fpp"] * k))
    end = pre_skip + int(round(c["valid"] * k))
    serial = 0x5A1A1A1A
    head = b"OpusHead" + struct.pack("<BBHIhB", 1, c["channels"], pre_skip, int(source_rate), 0, 0)
    vendor = b"crown-quest vo_build (afconvert)"
    tags = b"OpusTags" + struct.pack("<I", len(vendor)) + vendor + struct.pack("<I", 0)
    pages = [ogg_page([head], 0, serial, 0, 0x02), ogg_page([tags], 0, serial, 1, 0)]
    seq, granule, batch = 2, 0, []
    packets = c["packets"]
    for n, p in enumerate(packets):
        batch.append(p)
        granule += per_packet
        last = n == len(packets) - 1
        if last or len(batch) == 50:  # about one second of audio per page
            pages.append(ogg_page(batch, min(granule, end) if last else granule, serial, seq, 0x04 if last else 0))
            seq += 1
            batch = []
    with open(ogg_path, "wb") as f:
        f.write(b"".join(pages))


def mp3_rate(path):
    """The sample rate of an MP3, from its first frame header (the studio writes 24 kHz)."""
    data = open(path, "rb").read(64 * 1024)
    i = 0
    if data[:3] == b"ID3":
        i = 10 + ((data[6] & 0x7F) << 21 | (data[7] & 0x7F) << 14 | (data[8] & 0x7F) << 7 | (data[9] & 0x7F))
    while i + 4 <= len(data):
        if data[i] == 0xFF and data[i + 1] & 0xE0 == 0xE0:
            version = (data[i + 1] >> 3) & 3
            idx = (data[i + 2] >> 2) & 3
            base = [44100, 48000, 32000][idx] if idx < 3 else 0
            if base:
                return base // {3: 1, 2: 2, 0: 4}.get(version, 1)
        i += 1
    return 24000


# --------------------------------------------------------------------------- convert
def convert(mp3, ogg):
    if shutil.which("ffmpeg"):
        subprocess.run(["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-i", mp3, "-ac", "1", "-c:a", "libopus",
                        "-b:a", "32k", "-map_metadata", "-1", ogg], check=True)
        return
    if not shutil.which("afconvert"):
        sys.exit("Needs ffmpeg (https://ffmpeg.org) or macOS (afconvert) to make Ogg Opus files.")
    with tempfile.TemporaryDirectory() as tmp:
        caf = os.path.join(tmp, "clip.caf")
        subprocess.run(["afconvert", "-f", "caff", "-d", "opus", "-b", str(BITRATE), mp3, caf], check=True)
        caf_to_ogg(caf, ogg, mp3_rate(mp3))


def write_table(script, secs_of):
    """The table of every line in docs/VOICEOVER.md, between <!-- vo-table --> and <!-- /vo-table -->."""
    if not os.path.exists(DOC):
        return
    doc = open(DOC, encoding="utf-8").read()
    a, b = doc.find("<!-- vo-table -->"), doc.find("<!-- /vo-table -->")
    if a < 0 or b < a:
        return
    cell = lambda s: str(s).replace("|", "\\|").replace("\n", " ")
    out = ["| Clip | Line as shown | Spoken as | Devanagari sent to the voice | Seconds |", "|---|---|---|---|---|"]
    for e in script:
        voice = " (Zippy)" if e.get("voice") == "zippy" else ""
        spoken = "=" if e["spoken"] == e["line"] else cell(e["spoken"])
        secs = "%.1f" % secs_of[e["id"]] if e["id"] in secs_of else "no clip yet"
        out.append("| %s%s | %s | %s | %s | %s |" % (e["id"], voice, cell(e["line"]), spoken, cell(e.get("devanagari", "")), secs))
    doc = doc[:a] + "<!-- vo-table -->\n" + "\n".join(out) + "\n" + doc[b:]
    with open(DOC, "w", encoding="utf-8") as f:
        f.write(doc)


def main(zips):
    script = json.load(open(SCRIPT, encoding="utf-8"))
    ids = {e["id"] for e in script}
    os.makedirs(VO_DIR, exist_ok=True)
    for z in zips:
        made = 0
        with zipfile.ZipFile(z) as zf, tempfile.TemporaryDirectory() as tmp:
            for name in zf.namelist():
                m = re.search(r"(?:^|/)(vo\d+)\.mp3$", name)
                if not m:
                    continue
                if m.group(1) not in ids:
                    print("  skipped %s: no such line in tools/vo_script.json" % name)
                    continue
                mp3 = os.path.join(tmp, m.group(1) + ".mp3")
                with open(mp3, "wb") as f:
                    f.write(zf.read(name))
                convert(mp3, os.path.join(VO_DIR, m.group(1) + ".ogg"))
                made += 1
        print("%s: %d clips" % (z, made))
    # assets/vo holds one file per voiced line and nothing else
    for name in sorted(os.listdir(VO_DIR)):
        if name.startswith("."):
            continue
        if not (name.endswith(".ogg") and name[:-4] in ids):
            os.remove(os.path.join(VO_DIR, name))
            print("  removed assets/vo/%s (no line uses it)" % name)
    rows, missing, total, secs_of = [], [], 0.0, {}
    for e in script:
        path = os.path.join(VO_DIR, e["id"] + ".ogg")
        if not os.path.exists(path):
            missing.append(e)
            continue
        secs = secs_of[e["id"]] = ogg_duration(path)
        total += secs
        rows.append("  %s: [%s, %.2f]," % (json.dumps(e["line"], ensure_ascii=False), json.dumps(e["id"]), secs))
    with open(MAP, "w", encoding="utf-8") as f:
        f.write("// Generated by tools/vo_build.py from tools/vo_script.json. Do not edit by hand: change\n"
                "// tools/vo_script.json, re-make the clips and run the tool again (docs/VOICEOVER.md).\n"
                "// Each line exactly as the game shows it -> [its clip in assets/vo/, its length in seconds].\n"
                "const VO_LINES = {\n" + "\n".join(rows) + "\n};\n")
    size = sum(os.path.getsize(os.path.join(VO_DIR, n)) for n in os.listdir(VO_DIR) if n.endswith(".ogg"))
    print("%d of %d lines voiced, %.1f minutes, assets/vo/ %.1f MB" % (len(rows), len(script), total / 60, size / 1e6))
    write_table(script, secs_of)
    if missing:
        print("No clip yet (read by the device voice):")
        for e in missing:
            print("  %s  %s" % (e["id"], e["line"]))


if __name__ == "__main__":
    main(sys.argv[1:])
