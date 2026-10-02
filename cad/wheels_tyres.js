/**
 * wheels_tyres.js — 2026 Pirelli P Zero slick tyres & 18" wheels (visual build)
 * 2026 Formula 1 "Nimble Car" · SREdesigns - Samuel R Erwin III
 *
 * Runs once after the car is assembled (see app.js), before the livery pass.
 * It keeps every existing wheel group (Wheel_Spindle_* inside
 * Assembly_WheelCorner_*), with the same names, hub centres, pivots and spin axis
 * (local Y), and only swaps the visual meshes inside each spindle for:
 *
 *  - Tyre: 720 mm diameter, 18" rim, front 280 mm / rear 375 mm wide, with a
 *    rounded shoulder, a slightly bulged sidewall and a gently crowned slick tread.
 *    The tread has procedural graining/scuff colour, roughness and bump maps.
 *  - Sidewalls: raised yellow PIRELLI (long-P wordmark) and P ZERO lettering, a
 *    yellow chequered compound band, a barcode/ID label and the fine moulded
 *    text ring, as colour + bump maps. They use planar polar UVs, so the text
 *    wraps around the sidewall without stretching and reads correctly from
 *    outside on BOTH sides of the car, and on the inboard face too.
 *  - Wheel: deep blue anodised rim lip, carbon wheel cover / aero disc with a
 *    recessed vaned centre (the brake drum shows through the windows between
 *    the vanes), and a yellow centre-lock nut with a grey hub cap and retaining pin.
 *
 * Performance: one shared set of textures for all four tyres, shared
 * geometry per tyre size (front/rear), shared wheel-cover geometry for all four.
 * Builds in a few tens of ms; it adds no per-frame cost.
 *
 * Frames: spindle local Y = axle. The visual is built with the outboard face on
 * +Y; on corners whose outboard side is local -Y it is turned 180° about the
 * vertical axis (a proper rotation, never a mirror, so text never reads backwards).
 * Units are decimetres, like the rest of the CAD.
 */

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { addCarbonWeave } from '../materials.js';

export const TYRE_SPEC = {
  radius: 3.6,                // 720 mm diameter
  rimRadius: 2.286,           // 18" bead seat
  width: { front: 2.8, rear: 3.75 },
};

const R = TYRE_SPEC.radius;
const RIM = TYRE_SPEC.rimRadius;
const SEGMENTS = 128;         // around the wheel (smooth silhouette in close-ups)

const YELLOW = '#f5c400';     // Pirelli medium yellow
const RUBBER = '#141416';
const HEAVY = '900 {px}px "Arial Black", "Helvetica Neue", Helvetica, Arial, "Liberation Sans", sans-serif';
const BOLD = '700 {px}px "Helvetica Neue", Helvetica, Arial, "Liberation Sans", sans-serif';
const font = (tpl, px) => tpl.replace('{px}', Math.round(px));

// ---------------------------------------------------------------------------
// Deterministic RNG so every load looks identical
// ---------------------------------------------------------------------------
function rng(seed) {
  let s = seed >>> 0;
  return () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

function canvasTexture(canvas, { srgb = false, repeatU = 1, aniso = 8 } = {}) {
  const t = new THREE.CanvasTexture(canvas);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = repeatU > 1 ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping;
  t.wrapT = THREE.ClampToEdgeWrapping;
  t.repeat.set(repeatU, 1);
  t.anisotropy = aniso;
  t.generateMipmaps = true;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.needsUpdate = true;
  return t;
}

// ---------------------------------------------------------------------------
// Text on an arc (canvas). mode 'top': letters stand outward, read clockwise.
// mode 'bottom': letters stand toward the centre, read left-to-right (upright).
// Baseline sits on radius r (top) / letter tops on the inside of r (bottom).
// ---------------------------------------------------------------------------
function arcText(ctx, text, cx, cy, r, mode, { centre = mode === 'top' ? -Math.PI / 2 : Math.PI / 2, spacing = 0, sizes = null } = {}) {
  const chars = [...text];
  const fonts = chars.map((_, i) => (sizes ? sizes[i] : ctx.font));
  const widths = chars.map((ch, i) => { ctx.font = fonts[i]; return ctx.measureText(ch).width; });
  const total = widths.reduce((a, b) => a + b, 0) + spacing * (chars.length - 1);
  const span = total / r;
  let acc = 0;
  const placed = [];
  chars.forEach((ch, i) => {
    const mid = (acc + widths[i] / 2) / r;
    const th = mode === 'top' ? centre - span / 2 + mid : centre + span / 2 - mid;
    ctx.save();
    ctx.translate(cx + r * Math.cos(th), cy + r * Math.sin(th));
    ctx.rotate(mode === 'top' ? th + Math.PI / 2 : th - Math.PI / 2);
    ctx.font = fonts[i];
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(ch, -widths[i] / 2, 0);
    ctx.restore();
    placed.push({ th, w: widths[i] });
    acc += widths[i] + spacing;
  });
  return { span, start: mode === 'top' ? centre - span / 2 : centre + span / 2, end: mode === 'top' ? centre + span / 2 : centre - span / 2, placed };
}

// ---------------------------------------------------------------------------
// Sidewall artwork. Canvas covers the full tyre disc (diameter 2R).
// `paint(ctx, kind)` draws once into the colour canvas (kind 'color') and once
// into the height canvas (kind 'height': white = raised).
// ---------------------------------------------------------------------------
function paintSidewall(ctx, S, kind) {
  const C = S / 2;
  const px = S / (2 * R);                 // pixels per dm
  const isH = kind === 'height';
  const ink = isH ? '#ffffff' : YELLOW;
  const mould = isH ? '#9a9a9a' : '#1d1d20';   // moulded (unpainted) rubber detail
  const rand = rng(isH ? 7 : 7);

  // Base rubber + faint radial moulding texture
  ctx.fillStyle = isH ? '#000000' : RUBBER;
  ctx.fillRect(0, 0, S, S);
  if (!isH) {
    // subtle satin sheen variation (scuffs from tyre warmers / handling)
    for (let i = 0; i < 900; i++) {
      const a = rand() * Math.PI * 2, r0 = (2.45 + rand() * 1.1) * px, len = (0.05 + rand() * 0.25) * px;
      ctx.strokeStyle = `rgba(255,255,255,${0.012 + rand() * 0.02})`;
      ctx.lineWidth = 1 + rand() * 2;
      ctx.beginPath(); ctx.arc(C, C, r0, a, a + len / r0); ctx.stroke();
    }
  }

  // Moulded bead ring + fine knurl just outside the rim flange
  ctx.strokeStyle = mould;
  ctx.lineWidth = 0.035 * px;
  ctx.beginPath(); ctx.arc(C, C, 2.50 * px, 0, Math.PI * 2); ctx.stroke();
  ctx.lineWidth = 0.02 * px;
  ctx.beginPath(); ctx.arc(C, C, 2.77 * px, 0, Math.PI * 2); ctx.stroke();

  // Fine moulded text ring (size / construction / DOT style markings)
  ctx.fillStyle = mould;
  ctx.font = font(BOLD, 0.085 * px);
  const ring = [
    { t: 'FORMULA 1  ·  2026  ·  18"  ·  RADIAL  ·  TUBELESS', c: -Math.PI * 0.18 },
    { t: 'MADE IN ROMANIA  ·  PZ 26  ·  DOT S3PR 1826', c: Math.PI * 0.82 },
    { t: 'FIA  ·  SLICK  ·  NOT FOR HIGHWAY USE', c: Math.PI * 1.25 },
  ];
  ring.forEach(({ t, c }) => arcText(ctx, t, C, C, 2.58 * px, 'top', { centre: c, spacing: 0.012 * px }));

  // Thin outer compound line (full circle, broken where the wordmarks sit)
  ctx.strokeStyle = ink;
  ctx.lineWidth = 0.032 * px;
  const lineR = 3.30 * px;
  // right side: from ~1 o'clock to ~5 o'clock (canvas angles: 0 = 3 o'clock, clockwise)
  ctx.beginPath(); ctx.arc(C, C, lineR, -Math.PI * 0.30, Math.PI * 0.30); ctx.stroke();

  // PIRELLI long-P wordmark at 12 o'clock
  ctx.fillStyle = ink;
  const capPx = 0.255 * px;               // cap height of the small letters
  const fsz = capPx / 0.72;
  const base = 2.93 * px;                 // baseline radius
  const sizes = [...'PIRELLI'].map((_, i) => font(HEAVY, i === 0 ? fsz * 1.34 : fsz));
  const pw = arcText(ctx, 'PIRELLI', C, C, base, 'top', { spacing: 0.012 * px, sizes });
  // the long top bar of the P runs over the rest of the word
  const barR = base + capPx * 1.20;
  ctx.strokeStyle = ink;
  ctx.lineWidth = capPx * 0.17;
  ctx.lineCap = 'butt';
  const pStart = pw.placed[0].th + (pw.placed[0].w * 0.15) / base;
  ctx.beginPath(); ctx.arc(C, C, barR, pStart, pw.end + 0.004); ctx.stroke();

  // P ZERO at 6 o'clock (upright, tops toward the hub)
  ctx.fillStyle = ink;
  ctx.font = font(HEAVY, 0.34 * px);
  arcText(ctx, 'P ZERO', C, C, 3.22 * px, 'bottom', { spacing: 0.03 * px });
  // small "TM"
  ctx.font = font(BOLD, 0.06 * px);
  arcText(ctx, 'TM', C, C, 3.22 * px, 'bottom', { centre: Math.PI / 2 + 0.49, spacing: 0 });

  // Pirelli compound band (left side, ~11 o'clock down to ~7 o'clock), as on the 2026 tyre:
  // starts next to the wordmark as a 2-row chequer, then the outer row closes into a
  // solid stripe while the inner row carries on as dashes whose gaps open up.
  const sq = 0.10 * px;
  const rIn = 2.99 * px;                  // inner row (radial start)
  const rOut = rIn + sq;                  // outer row
  const aTop = Math.PI * 1.34, aEnd = Math.PI * 0.76;
  const cell = (a, rr, len, wid) => {     // tangential length `len`, radial width `wid`
    ctx.save();
    ctx.translate(C + (rr + wid / 2) * Math.cos(a), C + (rr + wid / 2) * Math.sin(a));
    ctx.rotate(a);
    ctx.fillRect(-wid / 2, -len / 2, wid, len);
    ctx.restore();
  };
  // 1) chequer section (about 5 cells per row)
  const step = sq / rOut;
  const nChq = 9;
  for (let k = 0; k < nChq; k++) {
    const a = aTop - (k + 0.5) * step;
    cell(a, (k % 2) ? rIn : rOut, sq * 0.98, sq * 0.98);
  }
  // 2) solid outer stripe + spaced inner dashes
  const aSolid = aTop - nChq * step;
  ctx.strokeStyle = ink;
  ctx.lineWidth = sq * 0.62;
  ctx.lineCap = 'butt';
  ctx.beginPath(); ctx.arc(C, C, rOut + sq * 0.62, aEnd, aSolid + step * 0.6); ctx.stroke();
  // short tie between the chequer and the stripe
  cell(aSolid - step * 0.1, rOut, sq * 0.9, sq * 0.98);
  for (let a = aSolid - step * 1.4, gap = 1.0; a > aEnd + step; ) {
    cell(a, rIn, sq * 0.95, sq * 0.82);
    a -= step * (0.95 + gap);
    gap = Math.min(2.6, gap * 1.18);
  }

  // Barcode / ID label near the rim at ~5 o'clock (paper label: white + black bars)
  const labA = Math.PI * 0.30, labR = 2.66 * px;
  ctx.save();
  ctx.translate(C + labR * Math.cos(labA), C + labR * Math.sin(labA));
  ctx.rotate(labA - Math.PI / 2);
  const lw = 0.36 * px, lh = 0.15 * px;
  ctx.fillStyle = isH ? '#3a3a3a' : '#e9e9e4';
  ctx.fillRect(-lw / 2, -lh / 2, lw, lh);
  if (!isH) {
    const br = rng(42);
    ctx.fillStyle = '#111';
    for (let x = -lw / 2 + lw * 0.06; x < lw / 2 - lw * 0.06;) { const w = (0.004 + br() * 0.012) * px; if (br() > 0.35) ctx.fillRect(x, -lh * 0.38, w, lh * 0.56); x += w + 0.004 * px; }
    ctx.font = font(BOLD, 0.03 * px);
    ctx.textAlign = 'center';
    ctx.fillText('C3 5353  26-0412', 0, lh * 0.42);
    ctx.textAlign = 'start';
  }
  ctx.restore();
  // small compound / sizing text, right side (moulded, painted yellow like the real tyre)
  ctx.fillStyle = ink;
  ctx.font = font(BOLD, 0.07 * px);
  arcText(ctx, 'F1  ·  MEDIUM  ·  C3', C, C, 3.38 * px, 'top', { centre: -Math.PI * 0.02, spacing: 0.01 * px });
  // FIA-style small emblem dot near the top-left of the wordmark
  ctx.beginPath(); ctx.arc(C + 3.12 * px * Math.cos(-Math.PI * 0.68), C + 3.12 * px * Math.sin(-Math.PI * 0.68), 0.05 * px, 0, Math.PI * 2); ctx.fill();
}

// ---------------------------------------------------------------------------
// Tread: graining + scuffs. Returns {color, detail} canvases.
// detail: R = height (bump), G = roughness. u = around the tyre, v = across.
// ---------------------------------------------------------------------------
function paintTread(W, H) {
  const rand = rng(1234);
  const hC = makeCanvas(W, H), hx = hC.getContext('2d');     // height
  const sC = makeCanvas(W, H), sx = sC.getContext('2d');     // scuff (lighter + rougher)
  hx.fillStyle = '#808080'; hx.fillRect(0, 0, W, H);
  sx.fillStyle = '#000'; sx.fillRect(0, 0, W, H);
  const wrap = (fn) => { fn(0); fn(-W); fn(W); };            // seamless around the tyre
  // Graining: short ridges roughly across the tread, denser near the shoulders
  for (let i = 0; i < 5200; i++) {
    const x = rand() * W;
    const yN = rand();
    const shoulder = Math.pow(Math.abs(yN - 0.5) * 2, 2);
    if (rand() > 0.35 + 0.65 * shoulder) continue;
    const y = yN * H, len = (6 + rand() * 26) * (H / 512), ang = Math.PI / 2 + (rand() - 0.5) * 0.7;
    const g = rand() > 0.5 ? 150 : 100;
    hx.strokeStyle = `rgba(${g},${g},${g},${0.2 + rand() * 0.3})`;
    hx.lineWidth = 1 + rand() * 1.5;
    wrap((o) => { hx.beginPath(); hx.moveTo(x + o, y); hx.lineTo(x + o + Math.cos(ang) * len, y + Math.sin(ang) * len); hx.stroke(); });
  }
  // Scuff streaks: long, slightly diagonal, lighter grey and rougher (like the reference)
  // soft, brushed streaks with a dominant diagonal (lateral sliding under load)
  for (let i = 0; i < 1400; i++) {
    const x = rand() * W, y = rand() * H, len = (80 + rand() * 300) * (W / 1024), ang = 0.32 + (rand() - 0.5) * 0.45;
    const a = 0.04 + rand() * 0.16;
    sx.strokeStyle = `rgba(255,255,255,${a})`;
    sx.lineWidth = 1.5 + rand() * 5;
    wrap((o) => { sx.beginPath(); sx.moveTo(x + o, y); sx.lineTo(x + o + Math.cos(ang) * len, y + Math.sin(ang) * len); sx.stroke(); });
  }
  // soften the streaks once (a single blur pass, cheap)
  {
    const tmp = makeCanvas(W, H), tx = tmp.getContext('2d');
    tx.filter = 'blur(1.5px)';
    tx.drawImage(sC, 0, 0);
    sx.clearRect(0, 0, W, H);
    sx.drawImage(tmp, 0, 0);
  }
  // Outer shoulder: heavy graining + rough scrub band (the shoulder that works hardest,
  // as on the reference). Outboard edge = v = 1 = top rows of the canvas.
  for (let i = 0; i < 6500; i++) {
    const yN = 0.26 * Math.pow(rand(), 1.5);
    const x = rand() * W, y = yN * H, len = (4 + rand() * 16) * (H / 512), ang = Math.PI / 2 + (rand() - 0.5) * 0.9;
    const g = rand() > 0.5 ? 190 : 60;
    hx.strokeStyle = `rgba(${g},${g},${g},${0.45 + rand() * 0.45})`;
    hx.lineWidth = 1 + rand() * 2.2;
    wrap((o) => { hx.beginPath(); hx.moveTo(x + o, y); hx.lineTo(x + o + Math.cos(ang) * len, y + Math.sin(ang) * len); hx.stroke(); });
  }
  for (let i = 0; i < 700; i++) {
    const yN = 0.24 * Math.pow(rand(), 1.3);
    const x = rand() * W, y = yN * H, len = (30 + rand() * 160) * (W / 1024), ang = 0.32 + (rand() - 0.5) * 0.6;
    sx.strokeStyle = `rgba(255,255,255,${0.12 + rand() * 0.28})`;
    sx.lineWidth = 1.5 + rand() * 4;
    wrap((o) => { sx.beginPath(); sx.moveTo(x + o, y); sx.lineTo(x + o + Math.cos(ang) * len, y + Math.sin(ang) * len); sx.stroke(); });
  }
  // Marbles / pick-up blobs
  for (let i = 0; i < 110; i++) {
    const x = rand() * W, y = rand() * H, r = 1 + rand() * 2.5;
    hx.fillStyle = 'rgba(175,175,175,0.7)';
    wrap((o) => { hx.beginPath(); hx.arc(x + o, y, r, 0, Math.PI * 2); hx.fill(); });
  }
  const hd = hx.getImageData(0, 0, W, H).data;
  const sd = sx.getImageData(0, 0, W, H).data;
  const color = makeCanvas(W, H), cx = color.getContext('2d');
  const detail = makeCanvas(W, H), dx = detail.getContext('2d');
  const ci = cx.createImageData(W, H), di = dx.createImageData(W, H);
  for (let i = 0; i < W * H; i++) {
    const h = hd[i * 4], s = sd[i * 4] / 255;
    const n = rand();
    // colour: dark rubber, lighter where scuffed, a hair of noise
    const base = 22 + n * 5 + (h - 128) * 0.09;
    const c = base + s * 48;
    ci.data[i * 4] = c; ci.data[i * 4 + 1] = c; ci.data[i * 4 + 2] = c + 1; ci.data[i * 4 + 3] = 255;
    di.data[i * 4] = Math.max(0, Math.min(255, h + (n - 0.5) * 18));   // height
    di.data[i * 4 + 1] = 200 + s * 55 - (h > 140 ? 25 : 0);           // roughness ~0.78..1
    di.data[i * 4 + 2] = 0; di.data[i * 4 + 3] = 255;
  }
  cx.putImageData(ci, 0, 0);
  dx.putImageData(di, 0, 0);
  return { color, detail };
}

// ---------------------------------------------------------------------------
// Tyre profile (r, y) for one half; mirrored for the other.
// ---------------------------------------------------------------------------
function tyreProfile(width) {
  const hw = width / 2;
  const crownEnd = hw - 0.30;
  const half = [];
  // crown (gentle drop toward the shoulders)
  for (let i = 0; i <= 10; i++) { const y = (crownEnd * i) / 10; half.push([R - 0.045 * Math.pow(y / crownEnd, 2), y]); }
  // rounded shoulder
  for (let i = 1; i <= 10; i++) { const t = (i / 10) * Math.PI / 2; half.push([(R - 0.42) + 0.375 * Math.pow(Math.cos(t), 0.85), crownEnd + 0.30 * Math.pow(Math.sin(t), 0.85)]); }
  const treadCount = half.length;  // index where the sidewall starts (shoulder end inside the tread)
  // bulged sidewall: max section width around r = 3.0
  const rTop = R - 0.42, rMax = 3.0, rBead = 2.40;
  for (let i = 1; i <= 12; i++) {
    const r = rTop - ((rTop - rBead) * i) / 12;
    const y = r >= rMax
      ? hw + 0.018 * Math.sin(((rTop - r) / (rTop - rMax)) * Math.PI / 2)
      : hw + 0.018 - 0.15 * Math.pow((rMax - r) / (rMax - rBead), 2);
    half.push([r, y]);
  }
  half.push([2.33, hw - 0.16], [RIM, hw - 0.17]);           // bead tucked under the rim flange
  return { half, treadCount, hw };
}

/** Lathe a list of [r,y] points (in order) around local Y. */
function lathe(points, segments = SEGMENTS) {
  return new THREE.LatheGeometry(points.map(([r, y]) => new THREE.Vector2(r, y)), segments);
}

function buildTyreGeometries(width) {
  const { half, treadCount, hw } = tyreProfile(width);
  // tread: shoulder (-) -> crown -> shoulder (+), split a few points into the shoulder
  const split = treadCount - 4;
  const treadPts = [];
  for (let i = split; i > 0; i--) treadPts.push([half[i][0], -half[i][1]]);
  for (let i = 0; i <= split; i++) treadPts.push(half[i]);
  const tread = lathe(treadPts);
  // UVs: u = around (repeats via texture.repeat), v = arc length across the tread
  {
    const pos = tread.attributes.position, uv = tread.attributes.uv;
    const lens = [0];
    for (let i = 1; i < treadPts.length; i++) lens.push(lens[i - 1] + Math.hypot(treadPts[i][0] - treadPts[i - 1][0], treadPts[i][1] - treadPts[i - 1][1]));
    const L = lens[lens.length - 1];
    const n = treadPts.length;
    for (let i = 0; i < pos.count; i++) {
      const j = i % n;               // LatheGeometry: (segments+1) columns of n points
      uv.setY(i, lens[j] / L);
    }
    uv.needsUpdate = true;
  }
  // Sidewalls. Lathe normal = profile tangent rotated (dy, -dr), so running
  // shoulder->bead faces +Y (outboard) and bead->shoulder faces -Y (inboard).
  const swOutPts = half.slice(split);
  const swInPts = swOutPts.map(([r, y]) => [r, -y]).reverse();
  const swOut = lathe(swOutPts);
  const swIn = lathe(swInPts);
  // planar polar UVs (texture covers the whole tyre disc)
  const planar = (g, outboard) => {
    const pos = g.attributes.position, uv = g.attributes.uv;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i);
      // viewed from outside: outboard face sees +X to the left, inboard face to the right
      uv.setXY(i, 0.5 + (outboard ? -x : x) / (2 * R), 0.5 + z / (2 * R));
    }
    uv.needsUpdate = true;
  };
  planar(swOut, true);
  planar(swIn, false);
  return { tread, swOut, swIn, hw };
}

// ---------------------------------------------------------------------------
// Wheel: rim lip, barrel, carbon cover with vaned centre, hub, nut, cap.
// Built around a reference plane P = 0 (the outboard rim face); positioned per size.
// ---------------------------------------------------------------------------
const VANES = 10;
const vaneAngle = (a0, r) => a0 + 0.38 * (r - 0.5) / 1.0;   // swept vanes

function buildWheelGeometries() {
  const g = {};
  // Blue rim lip (flange), outboard side, from cover edge out to tyre bead
  g.lip = lathe([[2.40, -0.10], [2.395, -0.02], [2.36, 0.02], [2.28, 0.03], [2.20, 0.01], [2.16, -0.06]], SEGMENTS);
  // Rim barrel (inside, mostly hidden)
  g.barrel = new THREE.CylinderGeometry(2.24, 2.24, 1, 64, 1, true);
  // Carbon cover: concave annulus from the lip down to the vaned recess
  g.cover = lathe([[2.18, -0.06], [2.10, -0.11], [1.95, -0.17], [1.75, -0.24], [1.58, -0.30], [1.53, -0.40], [1.50, -0.62]], SEGMENTS);
  // Back plate of the recess with windows between the vanes (shows brake drum behind)
  const shape = new THREE.Shape();
  shape.absarc(0, 0, 1.52, 0, Math.PI * 2, false);
  const pitch = (Math.PI * 2) / VANES;
  for (let k = 0; k < VANES; k++) {
    const hole = new THREE.Path();
    const a0 = k * pitch + pitch * 0.5;
    const span = pitch * 0.42;
    const steps = 8;
    const rin = 0.70, rout = 1.40;
    for (let s = 0; s <= steps; s++) { const r = rin + ((rout - rin) * s) / steps; const a = vaneAngle(a0 - span / 2, r); hole[s ? 'lineTo' : 'moveTo'](r * Math.cos(a), r * Math.sin(a)); }
    for (let s = steps; s >= 0; s--) { const r = rin + ((rout - rin) * s) / steps; const a = vaneAngle(a0 + span / 2, r); hole.lineTo(r * Math.cos(a), r * Math.sin(a)); }
    shape.holes.push(hole);
  }
  g.back = new THREE.ShapeGeometry(shape, 24).rotateX(-Math.PI / 2).translate(0, -0.64, 0);
  // Vanes: thin swept blades between the hub and the recess wall
  const vanes = [];
  for (let k = 0; k < VANES; k++) {
    const a0 = k * pitch;
    const s = new THREE.Shape();
    const t = 0.028;                           // half thickness (angular at r)
    const steps = 10, rin = 0.52, rout = 1.50;
    for (let i = 0; i <= steps; i++) { const r = rin + ((rout - rin) * i) / steps; const a = vaneAngle(a0, r) - t / r; s[i ? 'lineTo' : 'moveTo'](r * Math.cos(a), r * Math.sin(a)); }
    for (let i = steps; i >= 0; i--) { const r = rin + ((rout - rin) * i) / steps; const a = vaneAngle(a0, r) + t / r; s.lineTo(r * Math.cos(a), r * Math.sin(a)); }
    const v = new THREE.ExtrudeGeometry(s, { depth: 0.30, bevelEnabled: false, curveSegments: 1 });
    vanes.push(v.rotateX(-Math.PI / 2).translate(0, -0.64, 0));
  }
  g.vanes = mergeGeometries(vanes);
  vanes.forEach((v) => v.dispose());
  // Yellow hub carrier cup + centre-lock nut
  g.hub = lathe([[0.66, -0.63], [0.62, -0.56], [0.52, -0.47], [0.40, -0.43], [0.30, -0.42]], 64);
  const nutShape = [[0.30, -0.44], [0.305, -0.30], [0.29, -0.24], [0.255, -0.215], [0.17, -0.21]];
  g.nut = lathe(nutShape, 48);
  // drive notches on the nut face (6 lugs) as small blocks
  const lugs = [];
  for (let k = 0; k < 6; k++) {
    const a = (k * Math.PI * 2) / 6;
    lugs.push(new THREE.BoxGeometry(0.09, 0.05, 0.07).translate(0.235, -0.2, 0).rotateY(a));
  }
  g.lugs = mergeGeometries(lugs);
  lugs.forEach((l) => l.dispose());
  // Hub cap (grey dome) + retaining pin
  g.cap = lathe([[0.175, -0.215], [0.165, -0.17], [0.13, -0.13], [0.07, -0.11], [0.0, -0.105]], 40);
  g.pin = new THREE.CylinderGeometry(0.035, 0.035, 0.09, 16).translate(0, -0.07, 0);
  return g;
}

// ---------------------------------------------------------------------------
// Materials (shared)
// ---------------------------------------------------------------------------
function buildMaterials(maxAniso) {
  // Sidewall: colour 2048², height 1024² (raised lettering via bump)
  const S = 2048;
  const swColor = makeCanvas(S, S); paintSidewall(swColor.getContext('2d'), S, 'color');
  const swHeight = makeCanvas(1024, 1024); paintSidewall(swHeight.getContext('2d'), 1024, 'height');
  const tread = paintTread(1024, 512);
  const aniso = Math.min(16, maxAniso || 8);

  const m = {};
  m.sidewall = new THREE.MeshStandardMaterial({
    name: 'Pirelli_Sidewall_PZero',
    map: canvasTexture(swColor, { srgb: true, aniso }),
    bumpMap: canvasTexture(swHeight, { aniso }),
    bumpScale: 2.2,
    roughness: 0.62,
    metalness: 0.0,
  });
  const treadRepeat = 6;
  m.tread = new THREE.MeshStandardMaterial({
    name: 'Pirelli_Tread_Slick',
    map: canvasTexture(tread.color, { srgb: true, repeatU: treadRepeat, aniso }),
    bumpMap: canvasTexture(tread.detail, { repeatU: treadRepeat, aniso }),
    roughnessMap: canvasTexture(tread.detail, { repeatU: treadRepeat, aniso }),
    bumpScale: 0.7,
    roughness: 1.0,
    metalness: 0.0,
  });
  m.rimBlue = new THREE.MeshPhysicalMaterial({
    name: 'Rim_Lip_AnodisedBlue',
    color: 0x1828a8, metalness: 0.6, roughness: 0.36, clearcoat: 0.6, clearcoatRoughness: 0.2,
    side: THREE.DoubleSide,
  });
  // dark, double-sided barrel so the cavity behind the vanes reads dark like the real wheel
  m.barrel = new THREE.MeshStandardMaterial({ name: 'Rim_Barrel_Magnesium', color: 0x15171a, metalness: 0.6, roughness: 0.55, side: THREE.DoubleSide });
  m.coverCarbon = addCarbonWeave(new THREE.MeshPhysicalMaterial({
    name: 'WheelCover_Carbon_Gloss',
    color: 0x2a2c30, metalness: 0.35, roughness: 0.32, clearcoat: 1.0, clearcoatRoughness: 0.08,
    side: THREE.DoubleSide,
  }), { towsPerDm: 10.0, contrast: 0.55 });
  m.coverCarbon.userData.envMapIntensity = 0.8;
  m.recessCarbon = addCarbonWeave(new THREE.MeshPhysicalMaterial({
    name: 'WheelCover_Recess_Carbon',
    color: 0x121316, metalness: 0.05, roughness: 0.55, clearcoat: 0.4, clearcoatRoughness: 0.3,
    side: THREE.DoubleSide,
  }), { towsPerDm: 10.0, contrast: 0.42 });
  m.recessCarbon.userData.envMapIntensity = 0.3;
  m.yellow = new THREE.MeshPhysicalMaterial({
    name: 'Hub_CentreLock_Yellow',
    color: 0xe6d200, metalness: 0.35, roughness: 0.3, clearcoat: 0.8, clearcoatRoughness: 0.15,
    side: THREE.DoubleSide,
  });
  m.cap = new THREE.MeshStandardMaterial({ name: 'Hub_Cap_Grey', color: 0x8a8d92, metalness: 0.85, roughness: 0.35, side: THREE.DoubleSide });
  m.pin = new THREE.MeshStandardMaterial({ name: 'Hub_Pin_Black', color: 0x111111, metalness: 0.6, roughness: 0.4 });
  return m;
}

// ---------------------------------------------------------------------------
// Public: swap the visuals inside every Wheel_Spindle_* group
// ---------------------------------------------------------------------------
export function buildWheelsTyres(carModel, renderer, { verbose = false } = {}) {
  const t0 = (typeof performance !== 'undefined') ? performance.now() : 0;
  const report = { wheels: [], removedMeshes: 0 };
  carModel.updateMatrixWorld(true);
  const spindles = [];
  carModel.traverse((o) => { if (/^Wheel_Spindle_(Front|Rear)_(Left|Right)$/.test(o.name)) spindles.push(o); });
  if (!spindles.length) return report;

  const maxAniso = renderer?.capabilities?.getMaxAnisotropy?.() ?? 8;
  const mats = buildMaterials(maxAniso);
  const wheelGeo = buildWheelGeometries();
  const tyreGeo = { front: buildTyreGeometries(TYRE_SPEC.width.front), rear: buildTyreGeometries(TYRE_SPEC.width.rear) };
  const carInv = new THREE.Matrix4().copy(carModel.matrixWorld).invert();

  spindles.forEach((sp) => {
    const isRear = sp.name.includes('_Rear_');
    const size = isRear ? 'rear' : 'front';
    // Remove the old visual meshes (tyre, sidewall ring, rim, dish, vents, nut, pins)
    [...sp.children].forEach((c) => {
      if (c.isMesh) { sp.remove(c); c.geometry?.dispose(); report.removedMeshes++; }
    });
    // Which local Y direction points outboard?
    const posCar = sp.getWorldPosition(new THREE.Vector3()).applyMatrix4(carInv);
    const axleCar = new THREE.Vector3(0, 1, 0).transformDirection(sp.matrixWorld).transformDirection(carInv);
    const outSign = Math.sign(axleCar.y * Math.sign(posCar.y || 1)) || 1;

    const { tread, swOut, swIn, hw } = tyreGeo[size];
    const vis = new THREE.Group();
    vis.name = `Wheel_Visual_${sp.name.replace('Wheel_Spindle_', '')}`;
    if (outSign < 0) vis.rotation.z = Math.PI;   // turn, don't mirror

    const add = (geo, mat, name, y = 0, extra) => {
      const mesh = new THREE.Mesh(geo, mat);
      mesh.name = name; mesh.position.y = y;
      if (extra) extra(mesh);
      vis.add(mesh);
      return mesh;
    };
    add(tread, mats.tread, 'Tyre_Tread_Slick');
    add(swOut, mats.sidewall, 'Tyre_Sidewall_Outboard');
    add(swIn, mats.sidewall, 'Tyre_Sidewall_Inboard');
    const P = hw - 0.10;                           // outboard rim face plane
    add(wheelGeo.lip, mats.rimBlue, 'Rim_Lip_Outboard', P);
    add(wheelGeo.lip, mats.rimBlue, 'Rim_Lip_Inboard', -P, (m) => { m.rotation.z = Math.PI; });
    add(wheelGeo.barrel, mats.barrel, 'Rim_Barrel', 0, (m) => { m.scale.y = 2 * P - 0.1; });
    add(wheelGeo.cover, mats.coverCarbon, 'WheelCover_Carbon', P);
    add(wheelGeo.back, mats.recessCarbon, 'WheelCover_Recess_Back', P);
    add(wheelGeo.vanes, mats.recessCarbon, 'WheelCover_Vanes', P);
    add(wheelGeo.hub, mats.yellow, 'Hub_Carrier_Yellow', P);
    add(wheelGeo.nut, mats.yellow, 'Centerlock_Nut_Yellow', P);
    add(wheelGeo.lugs, mats.yellow, 'Centerlock_Nut_Lugs', P);
    add(wheelGeo.cap, mats.cap, 'Hub_Cap', P);
    add(wheelGeo.pin, mats.pin, 'Hub_RetainingPin', P);
    sp.add(vis);
    report.wheels.push(`${sp.name}:${outSign > 0 ? '+Y' : '-Y'}`);
  });

  report.ms = Math.round(((typeof performance !== 'undefined') ? performance.now() : 0) - t0);
  if (verbose || (typeof location !== 'undefined' && /[?&]liveryDebug/.test(location.search))) console.info('[wheels]', JSON.stringify(report));
  carModel.userData.wheels = { report, materials: mats };
  return report;
}
