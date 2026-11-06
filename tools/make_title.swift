// Zippy's Crown Quest: the title screen's pictures, made from the original start screen.
//
// Run from the project folder (macOS):   swift -O tools/make_title.swift
//
// The title screen is the start screen as it was drawn, with its characters coming in one by one (the
// opening in js/main.js). This tool takes the start screen (art/ui/start screen.png, or else the game's
// own copy of it, assets/ui/start-screen.webp) and makes, in assets/title/:
//   plate.webp     the start screen with Zippy, the title sign, Grumble and the crown painted out: the
//                  wall's stones carry on softly where they were, Zippy's vine runs on through where his
//                  hand held it, and Grumble's doorway is empty
//   zippy.webp, logo.webp, grumble.webp, crown.webp
//                  each character cut out of the start screen, exactly as drawn (with a soft edge)
//   title.json     where each one goes, in the start screen's px (and Zippy's hand, Grumble's ledge)
// Laid back in place over the plate, they make the start screen again.
// Each character is found by its colours in its own part of the picture (the title sign by the shape of
// the sign on art/ui/thumbnail ui .png, laid over it). Needs cwebp (brew install webp) for the WebP files;
// without it they stay PNG.
import AppKit
import Foundation

let root = FileManager.default.currentDirectoryPath
let outDir = root + "/assets/title"

// ---------------------------------------------------------------- pictures (RGBA, premultiplied)
struct Img {
  var w: Int
  var h: Int
  var px: [UInt8]
}
let sRGB = CGColorSpace(name: CGColorSpace.sRGB)!
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
func savePNG(_ img: Img, _ p: String) {
  var px = img.px
  let ctx = CGContext(data: &px, width: img.w, height: img.h, bitsPerComponent: 8, bytesPerRow: img.w * 4, space: sRGB,
                      bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)!
  let dest = CGImageDestinationCreateWithURL(URL(fileURLWithPath: p) as CFURL, "public.png" as CFString, 1, nil)!
  CGImageDestinationAddImage(dest, ctx.makeImage()!, nil)
  CGImageDestinationFinalize(dest)
}

guard let P = load(root + "/art/ui/start screen.png") ?? load(root + "/assets/ui/start-screen.webp") else {
  print("make_title: no start screen (art/ui/start screen.png or assets/ui/start-screen.webp)")
  exit(1)
}
guard let sheet = load(root + "/art/ui/thumbnail ui .png") else {
  print("make_title: art/ui/thumbnail ui .png is missing")
  exit(1)
}
let W = P.w, H = P.h
func rgb(_ x: Int, _ y: Int) -> (Int, Int, Int) {
  let i = (y * W + x) * 4
  return (Int(P.px[i]), Int(P.px[i + 1]), Int(P.px[i + 2]))
}
let warm: (Int, Int, Int) -> Bool = { r, g, b in r > b + 18 && r + 8 >= g } // fur, skin, wood, gold, cream
let leaf: (Int, Int, Int) -> Bool = { r, g, b in g > r + 12 && g > b - 4 }
let purple: (Int, Int, Int) -> Bool = { r, g, b in r > g + 6 && b > g + 16 }
let dark: (Int, Int, Int) -> Bool = { r, g, b in r + g + b < 170 }

// ---------------------------------------------------------------- masks (1 per px, the size of the picture)
typealias Mask = [UInt8]
func newMask() -> Mask { [UInt8](repeating: 0, count: W * H) }
struct Box {
  var x0: Int, y0: Int, x1: Int, y1: Int
}
// the pixels in box that pass test
func pick(_ b: Box, _ test: (Int, Int) -> Bool) -> Mask {
  var m = newMask()
  for y in b.y0..<b.y1 { for x in b.x0..<b.x1 where test(x, y) { m[y * W + x] = 1 } }
  return m
}
// the 4-connected parts of m (in box), biggest first
func parts(_ m: Mask, _ b: Box) -> [[Int]] {
  var seen = [Bool](repeating: false, count: W * H)
  var out: [[Int]] = []
  for y in b.y0..<b.y1 { for x in b.x0..<b.x1 {
    let s = y * W + x
    if m[s] == 0 || seen[s] { continue }
    var stack = [s], part: [Int] = []
    seen[s] = true
    while let p = stack.popLast() {
      part.append(p)
      let px = p % W, py = p / W
      for (dx, dy) in [(1, 0), (-1, 0), (0, 1), (0, -1)] {
        let nx = px + dx, ny = py + dy
        if nx < b.x0 || ny < b.y0 || nx >= b.x1 || ny >= b.y1 { continue }
        let q = ny * W + nx
        if m[q] == 1 && !seen[q] { seen[q] = true; stack.append(q) }
      }
    }
    out.append(part)
  } }
  return out.sorted { $0.count > $1.count }
}
func only(_ ps: [[Int]]) -> Mask {
  var m = newMask()
  for p in ps { for i in p { m[i] = 1 } }
  return m
}
// grows m by r px (a round brush)
func dilate(_ m: Mask, _ r: Int) -> Mask {
  if r <= 0 { return m }
  var offs: [(Int, Int)] = []
  for dy in -r...r { for dx in -r...r where dx * dx + dy * dy <= r * r { offs.append((dx, dy)) } }
  var out = m
  for y in 0..<H { for x in 0..<W where m[y * W + x] == 1 {
    // only the edge of a part needs to grow
    let edge = x == 0 || y == 0 || x == W - 1 || y == H - 1 || m[y * W + x - 1] == 0 || m[y * W + x + 1] == 0 || m[(y - 1) * W + x] == 0 || m[(y + 1) * W + x] == 0
    if !edge { continue }
    for (dx, dy) in offs {
      let nx = x + dx, ny = y + dy
      if nx >= 0 && ny >= 0 && nx < W && ny < H { out[ny * W + nx] = 1 }
    }
  } }
  return out
}
// the holes in m (in box) that the outside can't reach are filled, if keep(hole) says so
func fillHoles(_ m: Mask, _ b: Box, _ keep: ([Int]) -> Bool = { _ in true }) -> Mask {
  var outside = [Bool](repeating: false, count: W * H)
  var stack: [Int] = []
  func seed(_ x: Int, _ y: Int) {
    let p = y * W + x
    if m[p] == 0 && !outside[p] { outside[p] = true; stack.append(p) }
  }
  for x in b.x0..<b.x1 { seed(x, b.y0); seed(x, b.y1 - 1) }
  for y in b.y0..<b.y1 { seed(b.x0, y); seed(b.x1 - 1, y) }
  while let p = stack.popLast() {
    let px = p % W, py = p / W
    for (dx, dy) in [(1, 0), (-1, 0), (0, 1), (0, -1)] {
      let nx = px + dx, ny = py + dy
      if nx < b.x0 || ny < b.y0 || nx >= b.x1 || ny >= b.y1 { continue }
      let q = ny * W + nx
      if m[q] == 0 && !outside[q] { outside[q] = true; stack.append(q) }
    }
  }
  var holes = newMask()
  for y in b.y0..<b.y1 { for x in b.x0..<b.x1 where m[y * W + x] == 0 && !outside[y * W + x] { holes[y * W + x] = 1 } }
  var out = m
  for h in parts(holes, b) where keep(h) { for i in h { out[i] = 1 } }
  return out
}
func union(_ ms: [Mask]) -> Mask {
  var out = newMask()
  for m in ms { for i in 0..<(W * H) where m[i] == 1 { out[i] = 1 } }
  return out
}

// ---------------------------------------------------------------- the characters
// The title sign: the sign on the sheet (its biggest piece in this box), laid where it is in the start
// screen (scale 1.27, its corner at 857, 138: measured by matching the two), grown 10 px, and the wood,
// letters, leaves and outlines inside that shape.
let SIGN = (sheetBox: Box(x0: 492, y0: 21, x1: 1118, y1: 288), scale: 1.27, x: 857.0, y: 138.0)
var guide = newMask()
do {
  let sb = SIGN.sheetBox
  var piece = [Bool](repeating: false, count: sheet.w * sheet.h)
  // the biggest solid piece in the box
  var seen = [Bool](repeating: false, count: sheet.w * sheet.h)
  var best: [Int] = []
  for y in sb.y0..<sb.y1 { for x in sb.x0..<sb.x1 {
    let s = y * sheet.w + x
    if seen[s] || sheet.px[s * 4 + 3] <= 40 { continue }
    var stack = [s], part: [Int] = []
    seen[s] = true
    while let p = stack.popLast() {
      part.append(p)
      let px = p % sheet.w, py = p / sheet.w
      for (dx, dy) in [(1, 0), (-1, 0), (0, 1), (0, -1)] {
        let nx = px + dx, ny = py + dy
        if nx < sb.x0 || ny < sb.y0 || nx >= sb.x1 || ny >= sb.y1 { continue }
        let q = ny * sheet.w + nx
        if !seen[q] && sheet.px[q * 4 + 3] > 40 { seen[q] = true; stack.append(q) }
      }
    }
    if part.count > best.count { best = part }
  } }
  var minx = Int.max, miny = Int.max
  for p in best { piece[p] = true; minx = min(minx, p % sheet.w); miny = min(miny, p / sheet.w) }
  for y in 100..<500 { for x in 820..<1672 {
    let sx = minx + Int((Double(x) - SIGN.x) / SIGN.scale), sy = miny + Int((Double(y) - SIGN.y) / SIGN.scale)
    if sx >= 0 && sy >= 0 && sx < sheet.w && sy < sheet.h && piece[sy * sheet.w + sx] { guide[y * W + x] = 1 }
  } }
}
let signBox = Box(x0: 820, y0: 100, x1: 1672, y1: 500)
let guideBig = dilate(guide, 10)
var logo = pick(signBox) { x, y in
  guard guideBig[y * W + x] == 1 else { return false }
  let (r, g, b) = rgb(x, y)
  return warm(r, g, b) || leaf(r, g, b) || dark(r, g, b)
}
logo = fillHoles(only(Array(parts(logo, signBox).prefix(1))), signBox)

// Zippy: his warm colours (fur, face, hands; outlines are dark brown) in his part of the picture, clear of
// the sign, the biggest piece; his eyes' whites filled in, but not the bits of vine between his fingers.
let zippyBox = Box(x0: 150, y0: 25, x1: 992, y1: 692)
let nearLogo = dilate(logo, 6)
var zippy = pick(zippyBox) { x, y in
  if nearLogo[y * W + x] == 1 { return false }
  let (r, g, b) = rgb(x, y)
  return warm(r, g, b)
}
zippy = fillHoles(only(Array(parts(zippy, zippyBox).prefix(1))), zippyBox) { hole in
  var green = 0
  for i in hole { let (r, g, b) = rgb(i % W, i / W); if leaf(r, g, b) { green += 1 } }
  return green * 2 < hole.count
}

// The crown: gold, its red gems and dark outline, on its pedestal (whose top starts at y 653).
let crownBox = Box(x0: 1275, y0: 455, x1: 1596, y1: 653)
var crown = pick(crownBox) { x, y in
  let (r, g, b) = rgb(x, y)
  return warm(r, g, b) || (r > 150 && g < 90 && b < 100) || (dark(r, g, b) && r >= b)
}
crown = fillHoles(only(Array(parts(crown, crownBox).prefix(1))), crownBox)

// Grumble: drawn a little out of focus, with the doorway's fire lighting his left side, so he is found
// softly: how purple each pixel is (blue over green, and red over green: the doorway's dark blue and the
// fire's orange are neither), plus his two horns (cream); his eyes and teeth filled in; down to the ledge
// in front of him (y 690). His cut-out keeps that soft edge.
let grumbleBox = Box(x0: 985, y0: 420, x1: 1335, y1: 690)
let HORNS = [(1065.0, 515.0), (1215.0, 505.0)]
var gSoft = [Float](repeating: 0, count: W * H)
for y in grumbleBox.y0..<grumbleBox.y1 { for x in grumbleBox.x0..<grumbleBox.x1 {
  let (r, g, b) = rgb(x, y)
  var a = max(0, min(1, Float(b - g - 6) / 30)) * max(0, min(1, Float(r - g + 4) / 20))
  if HORNS.contains(where: { hypot(Double(x) - $0.0, Double(y) - $0.1) < 42 }) && r + g + b > 420 && r >= b - 10 { a = 1 }
  gSoft[y * W + x] = a
} }
var grumble = pick(grumbleBox) { x, y in gSoft[y * W + x] > 0.5 }
let gParts = parts(grumble, grumbleBox)
grumble = only(gParts.filter { $0.count >= gParts[0].count / 30 }) // his body and his horns
grumble = fillHoles(grumble, grumbleBox)
// all of him, as far as his soft fur reaches (it is painted out of the plate)
let gFar = dilate(grumble, 30)
let grumbleAll = pick(grumbleBox) { x, y in gFar[y * W + x] == 1 && gSoft[y * W + x] > 0.04 }
let gNear = dilate(grumble, 7)
for i in 0..<(W * H) { if grumble[i] == 1 { gSoft[i] = 1 } else if gNear[i] == 0 { gSoft[i] = 0 } }

// ---------------------------------------------------------------- the plate
// Where they were, the wall carries on: each painted-out area is filled smoothly from the colours round
// it (coarse to fine), with a soft pattern of stone blocks laid over it like the wall's own, out of focus.
let gone = union([dilate(union([zippy, logo, crown]), 5), dilate(union([grumbleAll, grumble]), 6)])
let doorway = dilate(grumble, 10) // (Grumble's doorway stays dark: no blocks there)
var levels: [(w: Int, h: Int, img: [Float], known: [UInt8])] = []
do {
  var img = [Float](repeating: 0, count: W * H * 3)
  var known = [UInt8](repeating: 0, count: W * H)
  for p in 0..<(W * H) {
    img[p * 3] = Float(P.px[p * 4]); img[p * 3 + 1] = Float(P.px[p * 4 + 1]); img[p * 3 + 2] = Float(P.px[p * 4 + 2])
    known[p] = gone[p] == 1 ? 0 : 1
  }
  levels.append((W, H, img, known))
  while levels.last!.w > 40 {
    let (w, h, img, known) = levels.last!
    let w2 = w / 2, h2 = h / 2
    var im2 = [Float](repeating: 0, count: w2 * h2 * 3)
    var kn2 = [UInt8](repeating: 0, count: w2 * h2)
    for y in 0..<h2 { for x in 0..<w2 {
      var s0: Float = 0, s1: Float = 0, s2: Float = 0, n: Float = 0
      for dy in 0..<2 { for dx in 0..<2 {
        let q = (y * 2 + dy) * w + x * 2 + dx
        if known[q] == 1 { s0 += img[q * 3]; s1 += img[q * 3 + 1]; s2 += img[q * 3 + 2]; n += 1 }
      } }
      if n > 0 {
        let i = (y * w2 + x) * 3
        im2[i] = s0 / n; im2[i + 1] = s1 / n; im2[i + 2] = s2 / n
        kn2[y * w2 + x] = 1
      }
    } }
    levels.append((w2, h2, im2, kn2))
  }
}
func relax(_ w: Int, _ h: Int, _ img: inout [Float], _ known: [UInt8], _ iters: Int) {
  var next = img
  for _ in 0..<iters {
    for y in 0..<h { for x in 0..<w where known[y * w + x] == 0 {
      var s0: Float = 0, s1: Float = 0, s2: Float = 0, n: Float = 0
      for (dx, dy) in [(1, 0), (-1, 0), (0, 1), (0, -1)] {
        let nx = x + dx, ny = y + dy
        if nx < 0 || ny < 0 || nx >= w || ny >= h { continue }
        let j = (ny * w + nx) * 3
        s0 += img[j]; s1 += img[j + 1]; s2 += img[j + 2]; n += 1
      }
      let i = (y * w + x) * 3
      next[i] = s0 / n; next[i + 1] = s1 / n; next[i + 2] = s2 / n
    } }
    swap(&img, &next)
    next = img
  }
}
var L = levels.count - 1
var cur = levels[L]
relax(cur.w, cur.h, &cur.img, cur.known, 400)
while L > 0 {
  L -= 1
  var nxt = levels[L]
  for y in 0..<nxt.h { for x in 0..<nxt.w where nxt.known[y * nxt.w + x] == 0 {
    let cx = min(x / 2, cur.w - 1), cy = min(y / 2, cur.h - 1)
    let j = (cy * cur.w + cx) * 3, i = (y * nxt.w + x) * 3
    nxt.img[i] = cur.img[j]; nxt.img[i + 1] = cur.img[j + 1]; nxt.img[i + 2] = cur.img[j + 2]
  } }
  relax(nxt.w, nxt.h, &nxt.img, nxt.known, L == 0 ? 60 : 120)
  cur = nxt
}
var fillImg = cur.img
// Under the crown: the wall's colour from just above it carried down, meeting the pedestal's top only in
// the last 10 px (a smooth fill there would glow, mixing the wall with the pedestal's light top).
for x in crownBox.x0..<crownBox.x1 {
  var y0 = -1, y1 = -1
  for y in (crownBox.y0 - 10)..<(crownBox.y1 + 8) where gone[y * W + x] == 1 && doorway[y * W + x] == 0 {
    if y0 < 0 { y0 = y }
    y1 = y
  }
  if y0 < 2 || y1 - y0 < 4 { continue }
  let ti = ((y0 - 2) * W + x) * 3, bi = (min(y1 + 2, H - 1) * W + x) * 3
  for y in y0...y1 {
    let t = Float(max(0, min(1, Double(y - (y1 - 10)) / 10)))
    let i = (y * W + x) * 3
    for c in 0..<3 { fillImg[i + c] = fillImg[ti + c] * (1 - t) + fillImg[bi + c] * t }
  }
}
// The soft stone blocks: rows of blocks (every other row shifted by half a block), their joints a little
// darker and their faces a little lighter at the top, blurred.
var shade = [Float](repeating: 0, count: W * H)
for y in 0..<H { for x in 0..<W where gone[y * W + x] == 1 && doorway[y * W + x] == 0 {
  let bh = 64.0, bw = 124.0
  let row = floor(Double(y) / bh)
  let fy = Double(y) - row * bh
  let fx = (Double(x) + (Int(row) % 2 == 0 ? 0 : bw / 2)).truncatingRemainder(dividingBy: bw)
  let joint = min(fy, bh - fy) < 5 || min(fx, bw - fx) < 5
  shade[y * W + x] = joint ? -0.11 : Float(0.05 - 0.07 * fy / bh)
} }
for _ in 0..<3 {
  var tmp = shade
  for y in 0..<H { for x in 4..<(W - 4) where gone[y * W + x] == 1 {
    var s: Float = 0
    for d in -4...4 { s += shade[y * W + x + d] }
    tmp[y * W + x] = s / 9
  } }
  for y in 4..<(H - 4) { for x in 0..<W where gone[y * W + x] == 1 {
    var s: Float = 0
    for d in -4...4 { s += tmp[(y + d) * W + x] }
    shade[y * W + x] = s / 9
  } }
}
var plate = P
for p in 0..<(W * H) where gone[p] == 1 {
  let k = 1 + shade[p]
  for c in 0..<3 { plate.px[p * 4 + c] = UInt8(max(0, min(255, fillImg[p * 3 + c] * k))) }
  plate.px[p * 4 + 3] = 255
}
// Zippy's vine, on through where his hand held it: its dark edge, green body and light top, along the
// curve it follows into and out of his fist.
plate.px.withUnsafeMutableBytes { buf in
  let ctx = CGContext(data: buf.baseAddress, width: W, height: H, bitsPerComponent: 8, bytesPerRow: W * 4, space: sRGB,
                      bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)!
  ctx.translateBy(x: 0, y: CGFloat(H))
  ctx.scaleBy(x: 1, y: -1)
  let vine = CGMutablePath()
  vine.move(to: CGPoint(x: 404, y: 152))
  vine.addCurve(to: CGPoint(x: 502, y: 66), control1: CGPoint(x: 436, y: 140), control2: CGPoint(x: 468, y: 104))
  ctx.setLineCap(.round)
  for (wid, c, dx, dy) in [(30.0, (24, 44, 22), 0.0, 0.0), (22.0, (64, 150, 42), 0.0, 0.0), (7.0, (150, 208, 76), -3.0, -4.0)] {
    ctx.saveGState()
    ctx.translateBy(x: CGFloat(dx), y: CGFloat(dy))
    ctx.setStrokeColor(red: CGFloat(c.0) / 255, green: CGFloat(c.1) / 255, blue: CGFloat(c.2) / 255, alpha: 1)
    ctx.setLineWidth(CGFloat(wid))
    ctx.addPath(vine)
    ctx.strokePath()
    ctx.restoreGState()
  }
}

// ---------------------------------------------------------------- the cut-outs
// Each character as drawn, with a soft edge 1 px out (its outline's own anti-aliasing comes with it), or
// with its own soft edge (alpha: Grumble).
func cutOut(_ m: Mask, soft: Int, alpha: [Float]? = nil) -> (Img, Int, Int) {
  let g = dilate(m, 1)
  var a = [Float](repeating: 0, count: W * H)
  for i in 0..<(W * H) where g[i] == 1 { a[i] = 1 }
  if let al = alpha { a = al }
  for _ in 0..<soft { // a small blur of the edge
    var t = a
    for y in 1..<(H - 1) { for x in 1..<(W - 1) {
      let i = y * W + x
      t[i] = (a[i] * 4 + a[i - 1] + a[i + 1] + a[i - W] + a[i + W]) / 8
    } }
    a = t
  }
  var x0 = W, y0 = H, x1 = 0, y1 = 0
  for y in 0..<H { for x in 0..<W where a[y * W + x] > 0.01 { x0 = min(x0, x); y0 = min(y0, y); x1 = max(x1, x); y1 = max(y1, y) } }
  let w = x1 - x0 + 1, h = y1 - y0 + 1
  var out = Img(w: w, h: h, px: [UInt8](repeating: 0, count: w * h * 4))
  for y in 0..<h { for x in 0..<w {
    let i = (y0 + y) * W + x0 + x
    let al = max(0, min(1, a[i]))
    if al <= 0.01 { continue }
    let o = (y * w + x) * 4
    for c in 0..<3 { out.px[o + c] = UInt8(Float(P.px[i * 4 + c]) * al) }
    out.px[o + 3] = UInt8(al * 255)
  } }
  return (out, x0, y0)
}

try? FileManager.default.removeItem(atPath: outDir)
try! FileManager.default.createDirectory(atPath: outDir, withIntermediateDirectories: true)
let hasWebp = FileManager.default.isExecutableFile(atPath: "/opt/homebrew/bin/cwebp") || FileManager.default.isExecutableFile(atPath: "/usr/local/bin/cwebp")
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
var json: [String: Any] = ["w": W, "h": H]
json["plate"] = ["src": publish(plate, "plate", 90), "w": W, "h": H]
for (name, m, soft) in [("zippy", zippy, 1), ("logo", logo, 1), ("crown", crown, 1), ("grumble", grumble, 1)] {
  let (img, x, y) = cutOut(m, soft: soft, alpha: name == "grumble" ? gSoft : nil)
  json[name] = ["src": publish(img, name, 92), "x": x, "y": y, "w": img.w, "h": img.h]
  print("title: \(name) at \(x), \(y), \(img.w) x \(img.h)")
}
// Zippy swings from his fist on the vine; Grumble stands behind the ledge (and the pedestal's corner)
json["zippyHand"] = ["x": 452, "y": 118]
json["grumbleFront"] = [[990, 690], [1252, 690], [1266, 667], [1292, 659], [1330, 656]]
let data = try! JSONSerialization.data(withJSONObject: json, options: [.prettyPrinted, .sortedKeys])
try! data.write(to: URL(fileURLWithPath: "\(outDir)/title.json"))
print("title: plate + 4 characters -> assets/title/ (title.json)")
