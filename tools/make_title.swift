// Zippy's Crown Quest: the title screen's pictures.
//
// Run from the project folder (macOS):   swift -O tools/make_title.swift
//
// The title screen (js/main.js) is the temple with its characters coming in, one by one. Its pictures are
// drawn separately (the prompts: docs/prompts/ChatGPT-Title-Screen-Prompt.md), in art/ui:
//   title background.png   the temple, empty and sharp
//   title zippy.png, title grumble.png, title crown.png, title sign.png
//                          each alone, on a transparent background (or one flat pure magenta, #FF00FF,
//                          which is taken out here)
// This tool trims each piece to what is drawn, works out where it goes on the background and at what size
// (WHERE, below: the places and sizes the characters have on the old title screen), and writes, in
// assets/title:
//   plate.webp             the background
//   zippy.webp, grumble.webp, crown.webp, logo.webp
//                          the pieces, kept a little larger than they are shown, so they stay sharp on
//                          big screens
//   zippy-grip.webp        the bit of the vine that lies in front of Zippy's palm (his grip: see GRIP)
//   title.json             each piece's top-left on the background (x, y, in the background's px) and
//                          its scale there (s: background px per picture px); the grip's top-left is
//                          on the Zippy picture (in its px)
// If a piece's picture is missing, the one already in assets/title is kept (the sign, today: it was cut
// out of the old title screen), and so is the background: without art/ the tool still remakes Zippy's
// grip from the pictures in assets/title. Needs cwebp (brew install webp) for the WebP files.
import AppKit
import Foundation

let root = FileManager.default.currentDirectoryPath
let art = root + "/art/ui/"
let outDir = root + "/assets/title"
let sRGB = CGColorSpace(name: CGColorSpace.sRGB)!

// Where the pieces go, on a 1672 x 941 background (the old title screen's size; another size is scaled to
// it): the same places and sizes as on the old title screen.
let FRAME = (w: 1672.0, h: 941.0)
let WHERE = (
  zippyHand: (x: 452.0, y: 112.0), // the middle of the top of his fist (the vine runs across his palm)
  zippyHeight: 587.0, // from the top of his fist to his feet
  grumbleMid: 1140.0, // the middle between his horns
  grumbleHorns: 205.0, // from horn tip to horn tip
  grumbleTop: 452.0, // the top of his head (his lower half is behind the ledge)
  crownBottom: (x: 1420.0, y: 661.0), // the middle of its bottom rim, on the pedestal
  crownWidth: 298.0,
  signMid: (x: 1252.0, y: 303.0),
  signWidth: 772.0
)
let SHOWN = 1920.0 / 1672.0 * 1.04 // stage px per background px (the title is shown a touch zoomed)
let SHARP = 1.5 // pieces are kept this much larger than they are shown on the 1920-px stage

// ---------------------------------------------------------------- pictures (RGBA, premultiplied)
struct Img {
  var w: Int
  var h: Int
  var px: [UInt8]
}
func load(_ p: String) -> Img? {
  guard FileManager.default.fileExists(atPath: p),
        let src = CGImageSourceCreateWithURL(URL(fileURLWithPath: p) as CFURL, nil),
        let cg = CGImageSourceCreateImageAtIndex(src, 0, nil) else { return nil }
  let w = cg.width, h = cg.height
  var px = [UInt8](repeating: 0, count: w * h * 4)
  let ctx = CGContext(data: &px, width: w, height: h, bitsPerComponent: 8, bytesPerRow: w * 4, space: sRGB,
                      bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)!
  ctx.draw(cg, in: CGRect(x: 0, y: 0, width: w, height: h))
  return Img(w: w, h: h, px: px)
}
func cgImage(_ img: Img) -> CGImage {
  var px = img.px
  let ctx = CGContext(data: &px, width: img.w, height: img.h, bitsPerComponent: 8, bytesPerRow: img.w * 4, space: sRGB,
                      bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)!
  return ctx.makeImage()!
}
func savePNG(_ img: Img, _ p: String) {
  let dest = CGImageDestinationCreateWithURL(URL(fileURLWithPath: p) as CFURL, "public.png" as CFString, 1, nil)!
  CGImageDestinationAddImage(dest, cgImage(img), nil)
  CGImageDestinationFinalize(dest)
}
// a smaller copy, smoothly scaled
func resized(_ img: Img, _ w: Int, _ h: Int) -> Img {
  var px = [UInt8](repeating: 0, count: w * h * 4)
  let ctx = CGContext(data: &px, width: w, height: h, bitsPerComponent: 8, bytesPerRow: w * 4, space: sRGB,
                      bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)!
  ctx.interpolationQuality = .high
  ctx.draw(cgImage(img), in: CGRect(x: 0, y: 0, width: w, height: h))
  return Img(w: w, h: h, px: px)
}

// A piece: a flat magenta background taken out (if the picture has no transparency of its own), faint
// specks cleared, and trimmed to what is drawn.
func piece(_ name: String) -> Img? {
  guard var img = load(art + "title \(name).png") else { return nil }
  let n = img.w * img.h
  var opaque = true
  for p in 0..<n where img.px[p * 4 + 3] < 250 { opaque = false; break }
  if opaque { // magenta out, with a soft edge
    for p in 0..<n {
      let r = Double(img.px[p * 4]), g = Double(img.px[p * 4 + 1]), b = Double(img.px[p * 4 + 2])
      let d = sqrt((r - 255) * (r - 255) + g * g + (b - 255) * (b - 255))
      let a = max(0, min(1, (d - 60) / 80))
      for c in 0..<4 { img.px[p * 4 + c] = UInt8(Double(img.px[p * 4 + c]) * a) }
    }
  }
  for p in 0..<n where img.px[p * 4 + 3] < 8 { for c in 0..<4 { img.px[p * 4 + c] = 0 } }
  var x0 = img.w, y0 = img.h, x1 = -1, y1 = -1
  for y in 0..<img.h { for x in 0..<img.w where img.px[(y * img.w + x) * 4 + 3] >= 24 {
    x0 = min(x0, x); y0 = min(y0, y); x1 = max(x1, x); y1 = max(y1, y)
  } }
  guard x1 >= x0 else { return nil }
  x0 = max(0, x0 - 2); y0 = max(0, y0 - 2); x1 = min(img.w - 1, x1 + 2); y1 = min(img.h - 1, y1 + 2)
  let w = x1 - x0 + 1, h = y1 - y0 + 1
  var out = Img(w: w, h: h, px: [UInt8](repeating: 0, count: w * h * 4))
  for y in 0..<h {
    let s = ((y0 + y) * img.w + x0) * 4
    out.px.replaceSubrange((y * w * 4)..<((y + 1) * w * 4), with: img.px[s..<(s + w * 4)])
  }
  return out
}
func alpha(_ img: Img, _ x: Int, _ y: Int) -> Int { Int(img.px[(y * img.w + x) * 4 + 3]) }

// ---------------------------------------------------------------- Zippy's grip (GRIP)
// On the old title screen his fist is closed round the vine: it runs across his palm and under his curled
// fingers (asked 2026-11-17: "monkey should hold this stem in his hand"). The vine is in the background
// and he is a picture of his own (he flies in and swings), so the bit of the vine that lies in front of
// his palm is a small picture of its own: the background's own pixels there, cut along the vine's edges
// and along the bottom of his fingers, shown over him once he has caught the vine (js/main.js). At rest
// it matches the vine behind him exactly.
// The vine's middle line near his hand, and half its thickness with its outlines (1672 x 941 frame px):
let VINE: [(Double, Double)] = [(330, 194), (340, 192), (350, 188), (360, 184.5), (370, 179.5), (380, 175), (390, 169.5),
  (400, 165), (410, 159), (420, 153), (430, 147), (440, 140), (450, 132), (460, 122.5), (490, 95), (500, 85), (510, 74),
  (520, 61), (530, 47)]
let VINE_HALF = 17.0
let VINE_SPAN = (370.0, 480.0) // the stretch of it that his hand can cover
// The bottom of his curled fingers on the Zippy picture (in its px when 1081 px wide), left to right: the
// vine is in front of his palm, below this line, and behind his fingers, above it (and its dark line).
let FINGERS: [(Double, Double)] = [(250, 40), (262, 60), (285, 95), (302.5, 113.75), (313.75, 120), (317, 130),
  (320, 142.5), (326.25, 152.5), (337.5, 159), (355, 157.5), (367.5, 148), (375, 139), (385, 136.25), (400, 137),
  (420, 143), (440, 140), (452, 128), (470, 120)]
let FINGERS_BOX = (x0: 250.0, x1: 470.0, y1: 215.0) // his hand, on the same picture

// y on a line through points (left to right), level beyond its ends
func lineAt(_ pts: [(Double, Double)], _ x: Double) -> Double {
  if x <= pts[0].0 { return pts[0].1 }
  for i in 1..<pts.count where x <= pts[i].0 {
    let (x0, y0) = pts[i - 1], (x1, y1) = pts[i]
    return y0 + (y1 - y0) * (x - x0) / (x1 - x0)
  }
  return pts[pts.count - 1].1
}
// a smooth curve (y = a + b t + c t², t = x - mid) through points, leaving out the ones far off it (a
// leaf's dark edge touching the vine's)
func smoothCurve(_ xs: [Double], _ ys: [Double]) -> (Double) -> Double {
  let mid = xs.reduce(0, +) / Double(max(1, xs.count))
  var keep = [Bool](repeating: true, count: xs.count)
  var c = [ys.reduce(0, +) / Double(max(1, ys.count)), 0, 0]
  for _ in 0..<4 {
    var m = [[Double]](repeating: [0, 0, 0, 0], count: 3)
    for i in xs.indices where keep[i] {
      let t = xs[i] - mid, v = [1, t, t * t]
      for r in 0..<3 {
        for k in 0..<3 { m[r][k] += v[r] * v[k] }
        m[r][3] += v[r] * ys[i]
      }
    }
    for p in 0..<3 { // Gauss-Jordan
      guard abs(m[p][p]) > 1e-9 else { return { _ in c[0] } }
      for r in 0..<3 where r != p {
        let q = m[r][p] / m[p][p]
        for k in p..<4 { m[r][k] -= q * m[p][k] }
      }
    }
    c = (0..<3).map { m[$0][3] / m[$0][$0] }
    for i in xs.indices {
      let t = xs[i] - mid
      keep[i] = abs(c[0] + c[1] * t + c[2] * t * t - ys[i]) < 2.5
    }
  }
  return { x in let t = x - mid; return c[0] + c[1] * t + c[2] * t * t }
}

// The grip picture and its top-left on the Zippy picture (its px).
func grip(_ z: Placed, _ bg: Img) -> (img: Img, x: Int, y: Int)? {
  let fx = Double(bg.w) / FRAME.w, fy = Double(bg.h) / FRAME.h
  // the vine's outer edges, column by column (the outermost dark pixels of its outlines), smoothed
  var cols: [Double] = [], tops: [Double] = [], bots: [Double] = []
  let dark = { (x: Int, y: Int) -> Bool in
    let i = (y * bg.w + x) * 4
    return Int(bg.px[i]) + Int(bg.px[i + 1]) + Int(bg.px[i + 2]) < 110
  }
  for x in Int(VINE_SPAN.0 * fx)...Int(VINE_SPAN.1 * fx) where x > 0 && x < bg.w {
    let f = Double(x) / fx
    let c = lineAt(VINE, f) * fy
    let slope = (lineAt(VINE, f + 1) - lineAt(VINE, f - 1)) / 2
    let hw = VINE_HALF * (1 + slope * slope).squareRoot() * fy
    let lo = max(0, Int(c - hw - 6 * fy)), hi = min(bg.h - 1, Int(c + hw + 6 * fy))
    guard let t = (lo..<Int(c)).first(where: { dark(x, $0) }),
          let b = (Int(c)...hi).reversed().first(where: { dark(x, $0) }) else { continue }
    cols.append(Double(x)); tops.append(Double(t)); bots.append(Double(b))
  }
  guard cols.count > 20 else { return nil }
  let top = smoothCurve(cols, tops), bot = smoothCurve(cols, bots)
  // over his hand: the vine where it is in front of his palm
  let u = Double(z.img.w) / 1081.0 // Zippy's picture px per FINGERS px
  let fingers = FINGERS.map { ($0.0 * u, $0.1 * u) }
  let i0 = max(0, Int(FINGERS_BOX.x0 * u)), i1 = min(z.img.w - 1, Int(FINGERS_BOX.x1 * u))
  let j1 = min(z.img.h - 1, Int(FINGERS_BOX.y1 * u))
  let rim = max(1, Int((2 * u).rounded())) // his outline's soft edge is covered too
  let near = 9 * u // the fingers' dark line: the vine fades out under it
  var a = [Double](repeating: 0, count: z.img.w * z.img.h)
  var bx0 = Int.max, by0 = Int.max, bx1 = -1, by1 = -1
  for j in 0...j1 {
    for i in i0...i1 {
      // where this pixel's middle is on the background (its pixel index)
      let bx = z.x + (Double(i) + 0.5) * z.s - 0.5, by = z.y + (Double(j) + 0.5) * z.s - 0.5
      guard bx >= cols[0], bx <= cols[cols.count - 1] else { continue }
      let va = max(0, min(1, by - top(bx) + 1)) * max(0, min(1, bot(bx) - by + 1))
      if va <= 0 { continue }
      let cl = lineAt(fingers, Double(i))
      var hm = max(0, min(1, Double(j) - cl + 1))
      if hm <= 0 { continue }
      let p = (j * z.img.w + i) * 4
      if abs(Double(j) - cl) < near {
        let pa = Double(z.img.px[p + 3])
        if pa > 0 {
          let l = (0.299 * Double(z.img.px[p]) + 0.587 * Double(z.img.px[p + 1]) + 0.114 * Double(z.img.px[p + 2])) * 255 / pa
          hm *= 1 - max(0, min(1, (215 - l) / 155))
        }
      }
      var pa = 0
      for dy in -rim...rim { for dx in -rim...rim {
        let x = i + dx, y = j + dy
        if x >= 0, y >= 0, x < z.img.w, y < z.img.h { pa = max(pa, alpha(z.img, x, y)) }
      } }
      let v = va * hm * Double(pa) / 255
      if v < 0.004 { continue }
      a[j * z.img.w + i] = v
      bx0 = min(bx0, i); by0 = min(by0, j); bx1 = max(bx1, i); by1 = max(by1, j)
    }
  }
  guard bx1 >= bx0 else { return nil }
  // the vine's own colours there (the background is opaque)
  let w = bx1 - bx0 + 1, h = by1 - by0 + 1
  var out = Img(w: w, h: h, px: [UInt8](repeating: 0, count: w * h * 4))
  for j in 0..<h {
    for i in 0..<w {
      let v = a[(by0 + j) * z.img.w + bx0 + i]
      if v <= 0 { continue }
      let bx = z.x + (Double(bx0 + i) + 0.5) * z.s - 0.5, by = z.y + (Double(by0 + j) + 0.5) * z.s - 0.5
      let x0 = max(0, min(bg.w - 2, Int(bx.rounded(.down)))), y0 = max(0, min(bg.h - 2, Int(by.rounded(.down))))
      let tx = max(0, min(1, bx - Double(x0))), ty = max(0, min(1, by - Double(y0)))
      for k in 0..<3 {
        let q = { (x: Int, y: Int) in Double(bg.px[(y * bg.w + x) * 4 + k]) }
        let col = (q(x0, y0) * (1 - tx) + q(x0 + 1, y0) * tx) * (1 - ty) + (q(x0, y0 + 1) * (1 - tx) + q(x0 + 1, y0 + 1) * tx) * ty
        out.px[(j * w + i) * 4 + k] = UInt8(max(0, min(255, (col * v).rounded())))
      }
      out.px[(j * w + i) * 4 + 3] = UInt8(max(0, min(255, (255 * v).rounded())))
    }
  }
  return (out, bx0, by0)
}

// ---------------------------------------------------------------- the pictures out
try? FileManager.default.createDirectory(atPath: outDir, withIntermediateDirectories: true)
let hasWebp = ["/opt/homebrew/bin/cwebp", "/usr/local/bin/cwebp", "/usr/bin/cwebp"].contains { FileManager.default.isExecutableFile(atPath: $0) }
func publish(_ img: Img, _ name: String, _ q: Int) -> String {
  let png = "\(outDir)/\(name).png"
  savePNG(img, png)
  guard hasWebp else { return "assets/title/\(name).png" }
  let task = Process()
  task.executableURL = URL(fileURLWithPath: "/usr/bin/env")
  task.arguments = ["cwebp", "-quiet", "-m", "6", "-sharp_yuv", "-q", String(q), "-alpha_q", "100", png, "-o", "\(outDir)/\(name).webp"]
  try? task.run()
  task.waitUntilExit()
  if task.terminationStatus == 0 {
    try? FileManager.default.removeItem(atPath: png)
    return "assets/title/\(name).webp"
  }
  return "assets/title/\(name).png"
}

// the background: art/ui/title background.png, or (without it) the one already in assets/title
var plateKept = false
var loaded = load(art + "title background.png")
if loaded == nil, let kept = load(outDir + "/plate.webp") ?? load(outDir + "/plate.png") {
  loaded = kept
  plateKept = true
}
guard let bg = loaded else {
  print("make_title: art/ui/title background.png is missing")
  exit(1)
}
// the background's px per the frame's px
let fx = Double(bg.w) / FRAME.w, fy = Double(bg.h) / FRAME.h
var old: [String: Any] = [:]
if let d = try? Data(contentsOf: URL(fileURLWithPath: "\(outDir)/title.json")),
   let j = try? JSONSerialization.jsonObject(with: d) as? [String: Any] { old = j }
var json: [String: Any] = ["w": bg.w, "h": bg.h]
if plateKept, let kept = old["plate"] {
  json["plate"] = kept
  print("title: plate: no art/ui/title background.png, the one in assets/title is kept")
} else {
  json["plate"] = ["src": publish(bg, "plate", 92), "w": bg.w, "h": bg.h]
}

// Each piece, kept SHARP x larger than shown (if it is bigger than that), and placed: its top-left on the
// background (x, y) and its scale there (s). Returns the picture and its place (the kept one's too).
typealias Placed = (img: Img, s: Double, x: Double, y: Double)
@discardableResult
func place(_ name: String, _ out: String, _ fit: (Img) -> (s: Double, x: Double, y: Double)) -> Placed? {
  guard var img = piece(name) else {
    guard let kept = old[out] as? [String: Any] else {
      print("title: \(out): art/ui/title \(name).png is missing")
      return nil
    }
    json[out] = kept
    print("title: \(out): no art/ui/title \(name).png, the one in assets/title is kept")
    guard let src = kept["src"] as? String, let im = load(root + "/" + src),
          let x = kept["x"] as? Double, let y = kept["y"] as? Double else { return nil }
    return (im, kept["s"] as? Double ?? 1, x, y)
  }
  var f = fit(img) // s: background px per picture px
  let want = Double(img.w) * f.s * SHOWN * SHARP / fx
  if want < Double(img.w) * 0.95 {
    let k = want / Double(img.w)
    img = resized(img, max(1, Int((Double(img.w) * k).rounded())), max(1, Int((Double(img.h) * k).rounded())))
    f.s /= k
  }
  json[out] = ["src": publish(img, out, 92), "w": img.w, "h": img.h, "x": (f.x * 10).rounded() / 10, "y": (f.y * 10).rounded() / 10, "s": (f.s * 10000).rounded() / 10000]
  print("title: \(out) \(img.w) x \(img.h), at \(Int(f.x)), \(Int(f.y)), shown \(Int(Double(img.w) * f.s)) x \(Int(Double(img.h) * f.s))")
  return (img, f.s, f.x, f.y)
}

// Zippy: his fist is the top of him; its middle goes on the vine
let zippy = place("zippy", "zippy") { img in
  let band = max(4, img.h / 11)
  var sx = 0.0, n = 0.0
  for y in 0..<band { for x in 0..<img.w where alpha(img, x, y) > 128 { sx += Double(x); n += 1 } }
  let handX = n > 0 ? sx / n : Double(img.w) / 2
  let handY = Double(band) * 0.55
  let s = WHERE.zippyHeight * fy / Double(img.h)
  return (s, WHERE.zippyHand.x * fx - handX * s, WHERE.zippyHand.y * fy - handY * s)
}
if let z = zippy, let g = grip(z, bg) {
  json["zippyGrip"] = ["src": publish(g.img, "zippy-grip", 92), "w": g.img.w, "h": g.img.h, "x": g.x, "y": g.y]
  print("title: zippyGrip \(g.img.w) x \(g.img.h), at \(g.x), \(g.y) on Zippy")
} else {
  print("title: zippyGrip: Zippy's grip could not be made")
}
// Grumble: his horns are the widest part of his top third
place("grumble", "grumble") { img in
  var l = img.w, r = -1
  for y in 0..<(img.h * 3 / 10) { for x in 0..<img.w where alpha(img, x, y) > 128 { l = min(l, x); r = max(r, x) } }
  if r < l { l = 0; r = img.w - 1 }
  let s = WHERE.grumbleHorns * fx / Double(r - l + 1)
  return (s, WHERE.grumbleMid * fx - Double(l + r) / 2 * s, WHERE.grumbleTop * fy)
}
place("crown", "crown") { img in
  let s = WHERE.crownWidth * fx / Double(img.w)
  return (s, WHERE.crownBottom.x * fx - Double(img.w) * s / 2, WHERE.crownBottom.y * fy - Double(img.h) * s)
}
place("sign", "logo") { img in
  let s = WHERE.signWidth * fx / Double(img.w)
  return (s, WHERE.signMid.x * fx - Double(img.w) * s / 2, WHERE.signMid.y * fy - Double(img.h) * s / 2)
}
let data = try! JSONSerialization.data(withJSONObject: json, options: [.prettyPrinted, .sortedKeys])
try! data.write(to: URL(fileURLWithPath: "\(outDir)/title.json"))
print("title: -> assets/title/ (title.json)")
