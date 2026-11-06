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
//   title.json             each piece's top-left on the background (x, y, in the background's px) and
//                          its scale there (s: background px per picture px)
// If a piece's picture is missing, the one already in assets/title is kept (the sign, today: it was cut
// out of the old title screen). Needs cwebp (brew install webp) for the WebP files.
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
  zippyHand: (x: 452.0, y: 118.0), // his fist (the middle of the top of him) on the vine
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

guard let bg = load(art + "title background.png") else {
  print("make_title: art/ui/title background.png is missing")
  exit(1)
}
// the background's px per the frame's px
let fx = Double(bg.w) / FRAME.w, fy = Double(bg.h) / FRAME.h
var old: [String: Any] = [:]
if let d = try? Data(contentsOf: URL(fileURLWithPath: "\(outDir)/title.json")),
   let j = try? JSONSerialization.jsonObject(with: d) as? [String: Any] { old = j }
var json: [String: Any] = ["w": bg.w, "h": bg.h]
json["plate"] = ["src": publish(bg, "plate", 92), "w": bg.w, "h": bg.h]

// Each piece, kept SHARP x larger than shown (if it is bigger than that), and placed: its top-left on the
// background (x, y) and its scale there (s).
func place(_ name: String, _ out: String, _ fit: (Img) -> (s: Double, x: Double, y: Double)) {
  guard var img = piece(name) else {
    if let kept = old[out] {
      json[out] = kept
      print("title: \(out): no art/ui/title \(name).png, the one in assets/title is kept")
    } else {
      print("title: \(out): art/ui/title \(name).png is missing")
    }
    return
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
}

// Zippy: his fist is the top of him; its middle goes on the vine
place("zippy", "zippy") { img in
  let band = max(4, img.h / 11)
  var sx = 0.0, n = 0.0
  for y in 0..<band { for x in 0..<img.w where alpha(img, x, y) > 128 { sx += Double(x); n += 1 } }
  let handX = n > 0 ? sx / n : Double(img.w) / 2
  let handY = Double(band) * 0.55
  let s = WHERE.zippyHeight * fy / Double(img.h)
  return (s, WHERE.zippyHand.x * fx - handX * s, WHERE.zippyHand.y * fy - handY * s)
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
