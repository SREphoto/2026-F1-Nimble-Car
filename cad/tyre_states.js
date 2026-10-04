/**
 * tyre_states.js — Pirelli tyre compounds × wear states × weather for the 2026 F1 Nimble Car
 * 2026 Formula 1 "Nimble Car" · SREdesigns - Samuel R Erwin III
 *
 * Runs after cad/wheels_tyres.js has built the wheels (it reuses that module's sidewall
 * artwork, tread painter and lathe profiles) and only swaps materials / geometry on the
 * tyre meshes inside each Wheel_Spindle_* group. Group names, hub centres and the spin
 * axis never change.
 *
 * Two independent axes per corner (FL, FR, RL, RR = physical corners from the driver's seat;
 * note the legacy CAD group names are mirrored: Wheel_Spindle_Rear_Left is the physical rear
 * RIGHT tyre, because CAD +Y is the driver's right):
 *   compound: soft (red band) · medium (yellow) · hard (white)   -> slick P ZERO, only the band colour differs
 *             inter (green, shallow-grooved CINTURATO intermediate tread)
 *             wet   (blue,  deep-grooved CINTURATO full-wet tread)
 *             (inter/wet grooves are real geometry: a finer lathe displaced from the groove mask)
 *   wear:     new · laps · medium · heavy · blown
 * plus one global weather flag: dry | wet (wet glistening rubber with water droplets,
 * wet track sheen and spray behind the car while driving).
 *
 * The six UI "Tyre state" presets map onto those axes:
 *   new / laps / medium / heavy -> wear on the selected corner(s), dry
 *   blown  -> corner 'all': rear left blown, others medium wear; a single corner: add it to the flats
 *   rainy  -> wet compound (or inter, if inter is fitted) + wet surface, a few laps old
 *
 * Performance: every texture is painted once and cached by (compound, level) /
 * (pattern, wear); materials are cached by (compound, wear, weather) and shared by all
 * corners in the same state. Only blown corners get their own material instances (a small
 * vertex-shader patch that deflates the tyre at the contact patch in the non-spinning frame
 * and flutters the torn flaps). No per-frame CPU geometry work.
 *
 * API (window.tyreStates, also returned by initTyreStates):
 *   setTyreState(state, corner = 'all')     state: new|laps|medium|heavy|blown|rainy
 *   setTyreCompound(corner, compound)       corner: FL|FR|RL|RR|all; compound: soft|medium|hard|inter|wet
 *   setTyreWear(corner, wear)               wear: new|laps|medium|heavy|blown
 *   setBlown(corner, on = true)             blow / repair any combination of corners (car settles on the flats)
 *   setBlownCorner(corner)                  legacy: makes `corner` the only blown tyre
 *   setWeather('dry' | 'wet')
 *   setOptions({ flap, spray, wetTrack })   blown-flap animation, rain spray, wet track sheen
 *   get()                                   current per-corner state
 * URL: ?tyre=<state>&compound=<compound>&blown=<corner[,corner]>&weather=<dry|wet>
 */

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { TYRE_SPEC, YELLOW, RUBBER, rng, makeCanvas, canvasTexture, paintSidewall, paintTread, buildTyreGeometries } from './wheels_tyres.js';

const R = TYRE_SPEC.radius;
const RIM = TYRE_SPEC.rimRadius;
const RIM_FLANGE = 2.40;
const BLOWN_DROP = 0.92;                 // dm: axle drops 92 mm, rim flange ~28 mm off the ground
const CORNERS = ['FL', 'FR', 'RL', 'RR'];

export const COMPOUNDS = {
  soft:   { label: 'Soft (C4)',     ink: '#e3122b', pattern: 'slick', main: 'P ZERO',    text: 'F1  ·  SOFT  ·  C4' },
  medium: { label: 'Medium (C3)',   ink: YELLOW,    pattern: 'slick', main: 'P ZERO',    text: 'F1  ·  MEDIUM  ·  C3' },
  hard:   { label: 'Hard (C2)',     ink: '#f2f2ee', pattern: 'slick', main: 'P ZERO',    text: 'F1  ·  HARD  ·  C2' },
  inter:  { label: 'Intermediate',  ink: '#25a84a', pattern: 'inter', main: 'CINTURATO', text: 'F1  ·  INTERMEDIATE' },
  wet:    { label: 'Full wet',      ink: '#1d6fe8', pattern: 'wet',   main: 'CINTURATO', text: 'F1  ·  FULL WET' },
};
export const WEAR_STATES = {
  new:    'Brand new',
  laps:   'A few laps',
  medium: 'Medium wear',
  heavy:  'Heavy wear',
  blown:  'Blown',
};
export const TYRE_STATES = { ...WEAR_STATES, rainy: 'Rainy weather' };

// sidewall artwork level per wear state
const SW_LEVEL = { new: 'new', laps: 'crisp', medium: 'dulled', heavy: 'faded', blown: 'faded' };
// material response per wear state
const WEAR_MAT = {
  new:    { swRough: 0.34, swCoat: 0.45, swCoatR: 0.22, trCoat: 0.5, trCoatR: 0.28, sheen: 0.7, bump: 0.25 },
  laps:   { swRough: 0.74, swCoat: 0,    swCoatR: 0,    trCoat: 0,   trCoatR: 0,    sheen: 0,   bump: 0.5 },
  medium: { swRough: 0.64, swCoat: 0,    swCoatR: 0,    trCoat: 0,   trCoatR: 0,    sheen: 0,   bump: 0.7 },
  heavy:  { swRough: 0.82, swCoat: 0,    swCoatR: 0,    trCoat: 0,   trCoatR: 0,    sheen: 0,   bump: 1.25 },
};
WEAR_MAT.blown = WEAR_MAT.heavy;
const PATTERN_BUMP = { slick: 1, inter: 1.3, wet: 1.5 };       // grooves are real geometry now; bump adds edge detail
// Grooved treads (inter / wet) are real geometry: a finer lathe displaced inward from the groove mask.
const GROOVE_SEGMENTS = 192;                                   // around the tyre (6 texture tiles × 32)
const GROOVE_DEPTH = { inter: 0.03, wet: 0.05 };                // dm: 3 mm intermediate, 5 mm full wet (new)

// simple grip model used by Drive mode (cad/track/track_mode.js reads state.tyreGrip)
const GRIP_COMPOUND = { dry: { soft: 1.03, medium: 1.0, hard: 0.97, inter: 0.84, wet: 0.74 }, wet: { soft: 0.52, medium: 0.5, hard: 0.48, inter: 0.8, wet: 0.76 } };
const GRIP_WEAR = { new: 0.98, laps: 1.0, medium: 0.97, heavy: 0.9, blown: 0.6 };

// ---------------------------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------------------------
const hex2rgb = (h) => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const mixHex = (a, b, t) => { const A = hex2rgb(a), B = hex2rgb(b); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join(''); };
const strHash = (s) => { let h = 2166136261; for (const ch of s) h = Math.imul(h ^ ch.charCodeAt(0), 16777619); return h >>> 0; };
const normCorner = (c) => {
  if (c == null || c === 'all' || c === 'ALL') return [...CORNERS];
  if (Array.isArray(c)) return c.flatMap(normCorner);
  const s = String(c).toLowerCase().replace(/[^a-z]/g, '');
  const map = { fl: 'FL', frontleft: 'FL', fr: 'FR', frontright: 'FR', rl: 'RL', rearleft: 'RL', rr: 'RR', rearright: 'RR' };
  if (!map[s]) throw new Error(`[tyres] unknown corner "${c}" (use FL, FR, RL, RR or all)`);
  return [map[s]];
};

// ---------------------------------------------------------------------------------------------
// Sidewall textures (1024² colour per compound × level, 1024² height per wordmark)
// ---------------------------------------------------------------------------------------------
const texCache = new Map();
const cached = (key, fn) => { if (!texCache.has(key)) texCache.set(key, fn()); return texCache.get(key); };
let ANISO = 8;

function sidewallColorTex(compound, level, base) {
  return cached(`sw|${compound}|${level}`, () => {
    if (compound === 'medium' && level === 'crisp' && base) return base.map;   // the original medium artwork
    const C = COMPOUNDS[compound];
    const S = 1024, px = S / (2 * R), cx = S / 2;
    const cv = makeCanvas(S, S), ctx = cv.getContext('2d');
    const fade = { new: 0, crisp: 0, dulled: 0.2, faded: 0.5 }[level];
    paintSidewall(ctx, S, 'color', { ink: mixHex(C.ink, '#6f6a60', fade), mainText: C.main, compoundText: C.text });
    const rand = rng(strHash(compound + level));
    const ringBlob = (n, r0, r1, size, style) => {
      for (let i = 0; i < n; i++) {
        const a = rand() * Math.PI * 2, r = (r0 + (r1 - r0) * Math.pow(rand(), 0.8)) * px;
        ctx.fillStyle = typeof style === 'function' ? style() : style;
        ctx.beginPath(); ctx.arc(cx + r * Math.cos(a), cx + r * Math.sin(a), size[0] + rand() * size[1], 0, Math.PI * 2); ctx.fill();
      }
    };
    if (level === 'new') {
      // mould-release sheen: faint silvery-blue film blotches + vent "hairs" near the shoulder
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 70; i++) {
        const a = rand() * Math.PI * 2, r = (2.6 + rand() * 0.9) * px, rad = (0.15 + rand() * 0.35) * px;
        const g = ctx.createRadialGradient(cx + r * Math.cos(a), cx + r * Math.sin(a), 0, cx + r * Math.cos(a), cx + r * Math.sin(a), rad);
        g.addColorStop(0, 'rgba(70,78,92,0.10)'); g.addColorStop(1, 'rgba(70,78,92,0)');
        ctx.fillStyle = g; ctx.fillRect(0, 0, S, S);
      }
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = 'rgba(40,40,44,0.9)'; ctx.lineWidth = 1.2;
      for (let i = 0; i < 260; i++) {
        const a = rand() * Math.PI * 2, r = (3.48 + rand() * 0.1) * px, l = (0.015 + rand() * 0.03) * px;
        ctx.beginPath(); ctx.moveTo(cx + r * Math.cos(a), cx + r * Math.sin(a)); ctx.lineTo(cx + (r + l) * Math.cos(a + 0.004), cx + (r + l) * Math.sin(a + 0.004)); ctx.stroke();
      }
    }
    if (level === 'dulled') {
      ringBlob(2600, 2.4, 3.6, [0.6, 1.4], () => `rgba(120,112,100,${0.05 + rand() * 0.07})`);   // rubber/brake dust
      ringBlob(500, 2.4, 3.6, [0.5, 1.6], 'rgba(18,18,20,0.75)');                              // tiny chips in the paint
      // scrub band on the outer edge
      const g = ctx.createRadialGradient(cx, cx, 3.30 * px, cx, cx, 3.6 * px);
      g.addColorStop(0, 'rgba(70,66,60,0)'); g.addColorStop(1, 'rgba(70,66,60,0.28)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, S, S);
    }
    if (level === 'faded') {
      // chipped, faded lettering
      ringBlob(9000, 2.5, 3.5, [0.6, 2.4], () => `rgba(24,23,24,${0.6 + rand() * 0.4})`);
      // dirt: brake dust at the bead, track grime + rubber pick-up on the outer third
      const dirt = (r0, r1, col) => { const g = ctx.createRadialGradient(cx, cx, r0 * px, cx, cx, r1 * px); g.addColorStop(0, col[0]); g.addColorStop(1, col[1]); return g; };
      ctx.fillStyle = dirt(2.30, 2.75, ['rgba(92,80,64,0.55)', 'rgba(92,80,64,0)']); ctx.fillRect(0, 0, S, S);
      ctx.fillStyle = dirt(3.05, 3.6, ['rgba(86,76,62,0)', 'rgba(86,76,62,0.6)']); ctx.fillRect(0, 0, S, S);
      for (let i = 0; i < 260; i++) {        // grime smears following the rotation
        const a = rand() * Math.PI * 2, r = (2.5 + rand() * 1.05) * px, len = (0.2 + rand() * 0.9);
        ctx.strokeStyle = `rgba(${95 + rand() * 30},${84 + rand() * 20},${66 + rand() * 15},${0.06 + rand() * 0.14})`;
        ctx.lineWidth = (0.01 + rand() * 0.05) * px;
        ctx.beginPath(); ctx.arc(cx, cx, r, a, a + len / (r / px)); ctx.stroke();
      }
      ringBlob(1400, 3.15, 3.6, [1.5, 5], () => `rgba(8,8,9,${0.7 + rand() * 0.3})`);           // marbles stuck on the shoulder
      ringBlob(5000, 2.4, 3.6, [0.5, 1.2], () => `rgba(150,138,118,${0.08 + rand() * 0.1})`);   // dust specks
    }
    return canvasTexture(cv, { srgb: true, aniso: ANISO });
  });
}

function sidewallHeightTex(compound, base) {
  const C = COMPOUNDS[compound];
  return cached(`swh|${C.main}`, () => {
    if (C.main === 'P ZERO' && base) return base.bumpMap;
    const cv = makeCanvas(1024, 1024);
    paintSidewall(cv.getContext('2d'), 1024, 'height', { mainText: C.main, compoundText: C.text });
    return canvasTexture(cv, { aniso: ANISO });
  });
}

// ---------------------------------------------------------------------------------------------
// Tread textures: pattern (slick / inter / wet grooves) × wear. u = around (×6 repeat), v = across.
// Canvas top rows = outboard shoulder.
// ---------------------------------------------------------------------------------------------
const TREAD_WEAR = {
  //        grains  gAlpha  gLen  scuffs sAlpha shoulder sh.alpha marbles blisters base rough  depth
  new:    { g: 0,    ga: 0,    gl: 0,  s: 0,    sa: 0,    sh: 0,     sha: 0,   m: 0,   b: 0,  base: 17, rough: 55,  depth: 1.0 },
  laps:   { g: 1200, ga: 0.14, gl: 14, s: 750,  sa: 0.085, sh: 900,   sha: 0.2, m: 18,  b: 0,  base: 22, rough: 222, depth: 0.95 },
  heavy:  { g: 9000, ga: 0.55, gl: 30, s: 1700, sa: 0.17, sh: 12000, sha: 0.7, m: 320, b: 46, base: 25, rough: 232, depth: 0.62 },
};
TREAD_WEAR.medium = { g: 3400, ga: 0.3, gl: 22, s: 1400, sa: 0.12, sh: 6500, sha: 0.55, m: 110, b: 0, base: 22, rough: 205, depth: 0.82 };

function treadTextures(pattern, wear, base) {
  return cached(`tr|${pattern}|${wear}`, () => {
    if (pattern === 'slick' && wear === 'medium' && base) return { map: base.map, detail: base.bumpMap, rough: base.roughnessMap };
    const W = 1024, H = 512;
    const P = TREAD_WEAR[wear];
    const k = pattern === 'slick' ? 1 : 0.45;          // grooved tyres grain less
    const rand = rng(strHash(pattern + wear));
    const hC = makeCanvas(W, H), hx = hC.getContext('2d');
    const sC = makeCanvas(W, H), sx = sC.getContext('2d');
    const gC = makeCanvas(W, H), gx = gC.getContext('2d');
    hx.fillStyle = '#808080'; hx.fillRect(0, 0, W, H);
    sx.fillStyle = '#000'; sx.fillRect(0, 0, W, H);
    gx.fillStyle = '#000'; gx.fillRect(0, 0, W, H);
    const wrap = (fn) => { fn(0); fn(-W); fn(W); };
    const line = (ctx, x, y, x2, y2) => wrap((o) => { ctx.beginPath(); ctx.moveTo(x + o, y); ctx.lineTo(x2 + o, y2); ctx.stroke(); });

    // --- groove pattern (white = groove) -------------------------------------------------------
    gx.lineCap = 'round'; gx.lineJoin = 'round'; gx.strokeStyle = '#fff';
    if (pattern === 'wet') {
      // Cinturato full wet: two deep circumferential channels + swept V grooves to the shoulders
      gx.lineWidth = 20;
      [0.34, 0.66].forEach((yN) => line(gx, 0, yN * H, W, yN * H));
      const n = 8, pitch = W / n;
      for (let i = 0; i < n; i++) {
        const x = i * pitch;
        gx.lineWidth = 15;
        wrap((o) => {
          gx.beginPath(); gx.moveTo(x + o, 0.5 * H); gx.bezierCurveTo(x + o + 30, 0.34 * H, x + o + 70, 0.16 * H, x + o + 120, -0.02 * H); gx.stroke();
          gx.beginPath(); gx.moveTo(x + o, 0.5 * H); gx.bezierCurveTo(x + o + 30, 0.66 * H, x + o + 70, 0.84 * H, x + o + 120, 1.02 * H); gx.stroke();
        });
        gx.lineWidth = 6;                         // sipes between the V grooves
        line(gx, x + pitch * 0.5, 0.42 * H, x + pitch * 0.5 + 18, 0.36 * H);
        line(gx, x + pitch * 0.5, 0.58 * H, x + pitch * 0.5 + 18, 0.64 * H);
        line(gx, x + pitch * 0.55 + 40, 0.10 * H, x + pitch * 0.55 + 60, 0.0);
        line(gx, x + pitch * 0.55 + 40, 0.90 * H, x + pitch * 0.55 + 60, 1.0 * H);
      }
    } else if (pattern === 'inter') {
      // Cinturato intermediate: shallow, narrow diagonal grooves, closed centre rib
      const n = 12, pitch = W / n;
      for (let i = 0; i < n; i++) {
        const x = i * pitch;
        gx.lineWidth = 9;
        line(gx, x, 0.40 * H, x + 42, 0.10 * H);
        line(gx, x, 0.60 * H, x + 42, 0.90 * H);
        gx.lineWidth = 5;
        line(gx, x + pitch * 0.5, 0.30 * H, x + pitch * 0.5 + 34, 0.0);
        line(gx, x + pitch * 0.5, 0.70 * H, x + pitch * 0.5 + 34, 1.0 * H);
        gx.lineWidth = 3;
        line(gx, x + pitch * 0.25, 0.46 * H, x + pitch * 0.25 + 10, 0.42 * H);
      }
    }
    if (pattern !== 'slick') { const t = makeCanvas(W, H), tx = t.getContext('2d'); tx.filter = 'blur(1.6px)'; tx.drawImage(gC, 0, 0); gx.clearRect(0, 0, W, H); gx.drawImage(t, 0, 0); }

    // --- wear features ------------------------------------------------------------------------
    for (let i = 0; i < P.g * k; i++) {             // graining ridges across the tread
      const x = rand() * W, yN = rand();
      const sh = Math.pow(Math.abs(yN - 0.5) * 2, 2);
      if (rand() > 0.35 + 0.65 * sh && wear !== 'heavy') continue;
      const len = (6 + rand() * P.gl) * (H / 512), ang = Math.PI / 2 + (rand() - 0.5) * 0.8;
      const g = rand() > 0.5 ? 185 : 70;
      hx.strokeStyle = `rgba(${g},${g},${g},${P.ga * (0.5 + rand())})`;
      hx.lineWidth = 1 + rand() * (wear === 'heavy' ? 2.6 : 1.5);
      line(hx, x, yN * H, x + Math.cos(ang) * len, yN * H + Math.sin(ang) * len);
    }
    for (let i = 0; i < P.s * k; i++) {             // scuff streaks
      const x = rand() * W, y = rand() * H, len = (80 + rand() * 300) * (W / 1024), ang = 0.32 + (rand() - 0.5) * 0.45;
      sx.strokeStyle = `rgba(255,255,255,${P.sa * (0.3 + rand())})`;
      sx.lineWidth = 1.5 + rand() * 5;
      line(sx, x, y, x + Math.cos(ang) * len, y + Math.sin(ang) * len);
    }
    for (let i = 0; i < P.sh * k; i++) {            // outer (outboard) shoulder
      const yN = (wear === 'heavy' ? 0.32 : 0.26) * Math.pow(rand(), 1.4);
      const x = rand() * W, len = (4 + rand() * 16) * (H / 512), ang = Math.PI / 2 + (rand() - 0.5) * 0.9;
      const g = rand() > 0.5 ? 200 : 55;
      hx.strokeStyle = `rgba(${g},${g},${g},${P.sha * (0.6 + rand() * 0.6)})`;
      hx.lineWidth = 1 + rand() * 2.2;
      line(hx, x, yN * H, x + Math.cos(ang) * len, yN * H + Math.sin(ang) * len);
      if (rand() < 0.12) { sx.strokeStyle = `rgba(255,255,255,${P.sha * 0.45})`; sx.lineWidth = 2 + rand() * 4; line(sx, x, yN * H, x + 60, yN * H + 20); }
    }
    if (wear === 'heavy') {
      // scrubbed, flattened outer shoulder band
      const g = sx.createLinearGradient(0, 0, 0, 0.3 * H); g.addColorStop(0, 'rgba(255,255,255,0.55)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      sx.fillStyle = g; sx.fillRect(0, 0, W, 0.3 * H);
      // blisters: craters with a raised torn rim, mostly on the centre-left of the tread
      for (let i = 0; i < P.b * k; i++) {
        const x = rand() * W, y = (0.25 + rand() * 0.55) * H, r = 4 + rand() * 9;
        wrap((o) => {
          hx.fillStyle = 'rgba(20,20,20,0.95)'; hx.beginPath(); hx.ellipse(x + o, y, r * 1.3, r, 0, 0, Math.PI * 2); hx.fill();
          hx.strokeStyle = 'rgba(235,235,235,0.9)'; hx.lineWidth = 2 + rand() * 1.5; hx.beginPath(); hx.ellipse(x + o, y, r * 1.3 + 1.5, r + 1.5, 0, 0, Math.PI * 2); hx.stroke();
          for (let b = 0; b < 4; b++) { hx.fillStyle = 'rgba(70,70,70,0.9)'; hx.beginPath(); hx.arc(x + o + (rand() - 0.5) * r * 1.6, y + (rand() - 0.5) * r, 1 + rand() * 2, 0, Math.PI * 2); hx.fill(); }
          sx.fillStyle = 'rgba(255,255,255,0.25)'; sx.beginPath(); sx.ellipse(x + o, y, r * 1.6, r * 1.2, 0, 0, Math.PI * 2); sx.fill();
        });
      }
    }
    for (let i = 0; i < P.m * k; i++) {             // marbles / rubber pick-up
      const x = rand() * W, y = rand() * H, r = 1 + rand() * (wear === 'heavy' ? 4 : 2.5);
      hx.fillStyle = 'rgba(190,190,190,0.8)';
      wrap((o) => { hx.beginPath(); hx.arc(x + o, y, r, 0, Math.PI * 2); hx.fill(); });
    }
    if (wear === 'new') {                            // vent nibs + faint mould parting line
      hx.fillStyle = 'rgba(200,200,200,0.9)';
      for (let i = 0; i < 160; i++) { const x = rand() * W, y = (0.08 + rand() * 0.84) * H; wrap((o) => { hx.beginPath(); hx.arc(x + o, y, 1.1 + rand() * 0.8, 0, Math.PI * 2); hx.fill(); }); }
      hx.strokeStyle = 'rgba(150,150,150,0.5)'; hx.lineWidth = 1.5; line(hx, 0, 0.5 * H, W, 0.5 * H);
    }
    if (wear !== 'new') { const t = makeCanvas(W, H), tx = t.getContext('2d'); tx.filter = 'blur(1.5px)'; tx.drawImage(sC, 0, 0); sx.clearRect(0, 0, W, H); sx.drawImage(t, 0, 0); }

    // --- combine ------------------------------------------------------------------------------
    const hd = hx.getImageData(0, 0, W, H).data, sd = sx.getImageData(0, 0, W, H).data, gd = gx.getImageData(0, 0, W, H).data;
    const color = makeCanvas(W, H), cx = color.getContext('2d');
    const detail = makeCanvas(W, H), dx = detail.getContext('2d');
    const ci = cx.createImageData(W, H), di = dx.createImageData(W, H);
    const floor = 128 - 120 * P.depth;
    for (let i = 0; i < W * H; i++) {
      const h = hd[i * 4], s = sd[i * 4] / 255, g = gd[i * 4] / 255;
      const n = rand();
      let c = P.base + n * (wear === 'new' ? 2.5 : 5) + (h - 128) * 0.09 + s * 48;
      c *= 1 - 0.6 * g;
      ci.data[i * 4] = c; ci.data[i * 4 + 1] = c; ci.data[i * 4 + 2] = c + (wear === 'new' ? 2 : 1); ci.data[i * 4 + 3] = 255;
      const ht = h + (n - 0.5) * (wear === 'new' ? 4 : 18);
      di.data[i * 4] = Math.max(0, Math.min(255, ht * (1 - g) + floor * g));
      const rough = wear === 'new' ? P.rough + n * 20 + (h > 160 ? 60 : 0) : P.rough + s * 55 - (h > 140 ? 25 : 0);
      di.data[i * 4 + 1] = Math.max(0, Math.min(255, rough * (1 - g) + 235 * g));
      di.data[i * 4 + 2] = 0; di.data[i * 4 + 3] = 255;
    }
    cx.putImageData(ci, 0, 0); dx.putImageData(di, 0, 0);
    const detailTex = canvasTexture(detail, { repeatU: 6, aniso: ANISO });
    let mask = null;
    if (pattern !== 'slick') { mask = { W, H, data: new Uint8Array(W * H) }; for (let i = 0; i < W * H; i++) mask.data[i] = gd[i * 4]; }
    return { map: canvasTexture(color, { srgb: true, repeatU: 6, aniso: ANISO }), detail: detailTex, rough: detailTex, mask };
  });
}

// water droplets: normal map for the clear-coat water film
function dropletNormalTex() {
  return cached('drops', () => {
    const S = 512, cv = makeCanvas(S, S), ctx = cv.getContext('2d');
    const img = ctx.createImageData(S, S);
    for (let i = 0; i < S * S; i++) { img.data[i * 4] = 128; img.data[i * 4 + 1] = 128; img.data[i * 4 + 2] = 255; img.data[i * 4 + 3] = 255; }
    const rand = rng(99);
    for (let d = 0; d < 520; d++) {
      const x0 = rand() * S, y0 = rand() * S, r = 1.8 + Math.pow(rand(), 2.2) * 10, ell = 1 + rand() * 0.35;
      for (let y = Math.floor(y0 - r - 1); y <= y0 + r + 1; y++) for (let x = Math.floor(x0 - r * ell - 1); x <= x0 + r * ell + 1; x++) {
        const dx = (x - x0) / (r * ell), dy = (y - y0) / r, q = dx * dx + dy * dy;
        if (q >= 1) continue;
        const nz = Math.sqrt(1 - q);
        const px = ((x % S) + S) % S, py = ((y % S) + S) % S, o = (py * S + px) * 4;
        img.data[o] = 128 + dx * 127 * 0.95; img.data[o + 1] = 128 - dy * 127 * 0.95; img.data[o + 2] = 128 + nz * 127;
      }
    }
    ctx.putImageData(img, 0, 0);
    const t = new THREE.CanvasTexture(cv);
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = ANISO; t.needsUpdate = true;
    return t;
  });
}
const dropletsAt = (ru, rv) => cached(`drops|${ru}|${rv}`, () => { const t = dropletNormalTex().clone(); t.repeat.set(ru, rv); t.needsUpdate = true; return t; });

// blown tyre: non-repeating damage overlay around the full tread (RGBA: carcass colour + coverage)
function blownDamageTex() {
  return cached('blownDmg', () => {
    const W = 2048, H = 512, cv = makeCanvas(W, H), ctx = cv.getContext('2d');
    const rand = rng(777);
    // on a left-hand (CAD -Y) wheel at rest: u = 0 top, 0.75 rear, 0.5 bottom (it spins when driving),
    // so the big tear faces a rear 3/4 camera on the default physical rear-left corner
    const patches = [{ u: 0.97, w: 0.07, v0: 0.12, v1: 0.92 }, { u: 0.79, w: 0.12, v0: 0.06, v1: 0.97 }, { u: 0.36, w: 0.05, v0: 0.3, v1: 0.75 }];
    // carcass cords pattern (pre-rendered)
    const cord = makeCanvas(W, H), cc = cord.getContext('2d');
    // fine bias-ply aramid/nylon cords, dirty and partly still coated in rubber
    cc.fillStyle = '#3e372c'; cc.fillRect(0, 0, W, H);
    for (const ang of [0.62, -0.62]) {
      for (let i = -H; i < W + H; i += 2.6) {
        cc.strokeStyle = `rgba(${128 + rand() * 30},${112 + rand() * 25},${80 + rand() * 20},${0.3 + rand() * 0.3})`; cc.lineWidth = 0.9;
        cc.beginPath(); cc.moveTo(i, 0); cc.lineTo(i + Math.tan(ang) * H, H); cc.stroke();
      }
    }
    for (let i = 0; i < 2600; i++) { const g = 14 + rand() * 26; cc.fillStyle = `rgba(${g},${g},${g},${0.35 + rand() * 0.55})`; cc.beginPath(); cc.ellipse(rand() * W, rand() * H, 1 + rand() * 5, 1 + rand() * 2.5, rand() * 3, 0, Math.PI * 2); cc.fill(); }
    for (let i = 0; i < 900; i++) { cc.fillStyle = `rgba(70,60,45,${0.2 + rand() * 0.3})`; cc.fillRect(rand() * W, rand() * H, 2 + rand() * 14, 1 + rand() * 2); }
    patches.forEach((p) => {
      const pts = [];
      const N = 46;
      for (let i = 0; i < N; i++) {
        const t = (i / N) * Math.PI * 2;
        const j = 0.75 + rand() * 0.35 + (rand() < 0.15 ? 0.25 : 0);
        pts.push([(p.u + Math.cos(t) * p.w * 0.5 * j) * W, ((p.v0 + p.v1) / 2 + Math.sin(t) * (p.v1 - p.v0) * 0.5 * Math.min(1, j)) * H]);
      }
      const path = () => { ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); };
      ctx.save(); path(); ctx.clip(); ctx.drawImage(cord, 0, 0); ctx.restore();
      // torn rubber lip + frayed cord ends
      path(); ctx.strokeStyle = '#0c0c0d'; ctx.lineWidth = 9; ctx.lineJoin = 'miter'; ctx.stroke();
      ctx.strokeStyle = 'rgba(190,170,125,0.9)'; ctx.lineWidth = 1.5;
      pts.forEach(([x, y]) => { for (let f = 0; f < 3; f++) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + (rand() - 0.5) * 26, y + (rand() - 0.5) * 26); ctx.stroke(); } });
      // grey abraded rubber around the tear
      for (let i = 0; i < 120; i++) { const [x, y] = pts[Math.floor(rand() * N)]; ctx.fillStyle = `rgba(60,58,56,${0.3 + rand() * 0.4})`; ctx.beginPath(); ctx.arc(x + (rand() - 0.5) * 50, y + (rand() - 0.5) * 50, 2 + rand() * 6, 0, Math.PI * 2); ctx.fill(); }
    });
    const t = canvasTexture(cv, { srgb: true, aniso: ANISO });
    t.wrapS = THREE.RepeatWrapping;
    t.userData.patches = patches;
    return t;
  });
}

function flapTex() {
  return cached('flap', () => {
    const W = 256, H = 128, cv = makeCanvas(W, H), ctx = cv.getContext('2d');
    const rand = rng(31);
    ctx.clearRect(0, 0, W, H);
    // jagged-edged strip: u along the flap (0 = hinge), v across
    ctx.beginPath(); ctx.moveTo(0, 6);
    for (let x = 0; x <= W; x += 8) ctx.lineTo(x, 4 + rand() * 18 + (x / W) * 14);
    ctx.lineTo(W - rand() * 30, H * 0.5);
    for (let x = W; x >= 0; x -= 8) ctx.lineTo(x, H - 4 - rand() * 18 - (x / W) * 14);
    ctx.closePath();
    ctx.fillStyle = '#1a1a1c'; ctx.fill();
    ctx.save(); ctx.clip();
    for (let i = 0; i < 500; i++) { const g = 14 + rand() * 30; ctx.fillStyle = `rgba(${g},${g},${g + 2},0.6)`; ctx.fillRect(rand() * W, rand() * H, 2 + rand() * 6, 1 + rand() * 2); }
    // exposed carcass on the underside / torn tip
    ctx.fillStyle = 'rgba(125,108,79,0.9)'; ctx.fillRect(W - 46, 0, 46, H);
    ctx.strokeStyle = 'rgba(180,160,115,0.9)'; ctx.lineWidth = 1.5;
    for (let i = 0; i < 40; i++) { const y = rand() * H; ctx.beginPath(); ctx.moveTo(W - 50, y); ctx.lineTo(W, y + (rand() - 0.5) * 20); ctx.stroke(); }
    ctx.restore();
    const t = canvasTexture(cv, { srgb: true, aniso: ANISO });
    return t;
  });
}

// ---------------------------------------------------------------------------------------------
// Blown tyre vertex patch (deflation in the non-spinning frame + flap flutter)
// ---------------------------------------------------------------------------------------------
const GLSL_COMMON = /* glsl */`
uniform vec3 uTyreDown; uniform float uTyreGround; uniform float uTyreRim; uniform float uTyreR; uniform float uTyreHalfW; uniform float uTyreFlat;
uniform float uTyreTime; uniform float uTyreFlap; uniform float uTyreDmgMirror;
#ifdef TYRE_FLAP
attribute vec2 aFlap;
#endif
float tyreSmin(float a, float b, float k) { float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0); return mix(b, a, h) - k * h * (1.0 - h); }
vec3 tyreDeform(vec3 p, out float flatW) {
  float r = length(p.xz);
  vec2 dir = p.xz / max(r, 1e-4);
  vec2 dn = normalize(uTyreDown.xz + vec2(1e-6, 0.0));
  float c = dot(dir, dn);
  float flatR = c > 0.02 ? uTyreGround / c : 1000.0;
  float rr = tyreSmin(uTyreR, flatR, 0.45);
  float s = mix(1.0, clamp((rr - uTyreRim) / (uTyreR - uTyreRim), 0.0, 1.0), uTyreFlat);
  // whole carcass sags a little everywhere (no pressure)
  s *= mix(1.0, 0.985, uTyreFlat);
  float w = clamp((r - uTyreRim) / (uTyreR - uTyreRim), 0.0, 1.0);
  float rn = r > uTyreRim ? uTyreRim + (r - uTyreRim) * s : r;
  float sq = 1.0 - s;
  vec3 q = vec3(dir.x * rn, p.y, dir.y * rn);
  float side = clamp(p.y / uTyreHalfW, -1.3, 1.3);
  q.y += side * sq * (0.5 * sin(3.14159 * w) + 0.12);
  float ang = atan(dir.y, dir.x);
  q.y += side * sq * 0.06 * sin(ang * 34.0 + p.y * 3.0) * w;           // sidewall creases
  float sqMax = 1.0 - (uTyreGround - uTyreRim) / (uTyreR - uTyreRim);
  flatW = smoothstep(0.3, 0.95, sq / max(sqMax, 1e-3)) * smoothstep(0.8, 1.0, w);
  return q;
}`;

function patchBlown(mat, U, { flap = false, damage = null } = {}) {
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U);
    if (damage) sh.uniforms.uTyreDmg = { value: damage };
    if (flap) sh.defines = { ...(sh.defines || {}), TYRE_FLAP: '' };
    let vs = sh.vertexShader.replace('#include <common>', '#include <common>\n' + GLSL_COMMON + (damage ? '\nvarying vec2 vTyreDmgUv;' : ''));
    if (vs.includes('#include <beginnormal_vertex>')) {
      vs = vs.replace('#include <beginnormal_vertex>', `#include <beginnormal_vertex>
        { float tfw; tyreDeform(position, tfw); objectNormal = normalize(mix(objectNormal, normalize(uTyreDown), tfw)); }`);
    }
    vs = vs.replace('#include <begin_vertex>', `#include <begin_vertex>
      #ifdef TYRE_FLAP
      { float t = aFlap.x; vec2 d = normalize(transformed.xz);
        float fl = uTyreFlap * t * t * (0.65 * sin(uTyreTime * 37.0 + aFlap.y + t * 3.0) + 0.35 * sin(uTyreTime * 59.0 + aFlap.y * 1.7));
        transformed.xz += d * fl * 0.9; transformed.y += fl * 0.25; }
      #endif
      { float tfw; transformed = tyreDeform(transformed, tfw); }
      ${damage ? 'vTyreDmgUv = vec2(uTyreDmgMirror > 0.5 ? 1.0 - uv.x : uv.x, uv.y);' : ''}`);
    sh.vertexShader = vs;
    if (damage) {
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', '#include <common>\nuniform sampler2D uTyreDmg; varying vec2 vTyreDmgUv;')
        .replace('#include <map_fragment>', '#include <map_fragment>\n vec4 tyreDmg = texture2D(uTyreDmg, vTyreDmgUv); diffuseColor.rgb = mix(diffuseColor.rgb, tyreDmg.rgb, tyreDmg.a);')
        .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\n roughnessFactor = mix(roughnessFactor, 0.92, tyreDmg.a);');
    }
  };
  mat.customProgramCacheKey = () => `${mat.type}|${mat.name || ''}|tyreBlown|${flap ? 1 : 0}|${damage ? 1 : 0}`;
  mat.needsUpdate = true;
  return mat;
}

/** Torn tread flaps for one tyre (merged, aFlap = [along 0..1, phase]). Lathe angle convention: (x, z) = r (sin φ, cos φ). */
function buildFlapGeometry(hw, patches, mirror = false) {
  const geos = [];
  const defs = [
    { u: patches[1].u + patches[1].w * 0.46, dir: 1, span: 0.85, vc: 0.55, half: 0.5, lift: 1.05, ph: 0.0 },
    { u: patches[1].u - patches[1].w * 0.46, dir: -1, span: 0.5, vc: 0.30, half: 0.24, lift: 0.6, ph: 2.1 },
    { u: patches[0].u - patches[0].w * 0.45, dir: -1, span: 0.45, vc: 0.62, half: 0.3, lift: 0.6, ph: 4.0 },
    { u: patches[1].u + patches[1].w * 0.1, dir: 1, span: 1.1, vc: 0.88, half: 0.07, lift: 1.2, ph: 1.3 },        // long thin strip
  ];
  defs.forEach((d) => {
    const nT = 16, nQ = 6;
    const pos = [], uv = [], fl = [], idx = [];
    for (let i = 0; i <= nT; i++) {
      const t = i / nT;
      for (let j = 0; j <= nQ; j++) {
        const q = (j / nQ) * 2 - 1;
        const phi = (mirror ? 1 - d.u : d.u) * Math.PI * 2 + (mirror ? -d.dir : d.dir) * d.span * t;   // right-hand wheels: mirrored like the damage map
        const r = R + 0.012 + d.lift * Math.pow(t, 1.7) + 0.05 * q * q * t;      // peeled away, edges curl
        const y = (d.vc - 0.5) * 2 * hw * 0.92 + q * d.half * hw * (1 - 0.35 * t) + 0.15 * t * t * hw * d.dir * 0.4;
        pos.push(r * Math.sin(phi), y, r * Math.cos(phi));
        uv.push(t, (q + 1) / 2);
        fl.push(t, d.ph + q * 0.6);
        if (i < nT && j < nQ) { const a = i * (nQ + 1) + j, b = a + nQ + 1; idx.push(a, b, a + 1, b, b + 1, a + 1); }
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setAttribute('aFlap', new THREE.Float32BufferAttribute(fl, 2));
    g.setIndex(idx);
    g.computeVertexNormals();
    geos.push(g);
  });
  const m = mergeGeometries(geos);
  geos.forEach((g) => g.dispose());
  return m;
}

// ---------------------------------------------------------------------------------------------
// Rain spray (one Points draw call, world space)
// ---------------------------------------------------------------------------------------------
function createSpray(scene) {
  const N = 3000;
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(N * 3), life = new Float32Array(N), vel = new Float32Array(N * 3), seed = new Float32Array(N);
  for (let i = 0; i < N; i++) { pos[i * 3 + 1] = -1e5; seed[i] = Math.random(); }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
  geo.setAttribute('aLife', new THREE.BufferAttribute(life, 1).setUsage(THREE.DynamicDrawUsage));
  geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { uScale: { value: 1500 }, uColor: { value: new THREE.Color(0xc9d2db) }, uOpacity: { value: 0.42 } },
    vertexShader: `#include <common>
      #include <logdepthbuf_pars_vertex>
      attribute float aLife; attribute float aSeed; uniform float uScale; varying float vLife;
      void main() { vLife = aLife; vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = aLife > 0.0 ? uScale * (1.2 + (1.0 - aLife) * 3.5) * (0.6 + aSeed) / -mv.z : 0.0;
        gl_Position = projectionMatrix * mv;
        #include <logdepthbuf_vertex>
      }`,
    fragmentShader: `#include <common>
      #include <logdepthbuf_pars_fragment>
      uniform vec3 uColor; uniform float uOpacity; varying float vLife;
      void main() {
        #include <logdepthbuf_fragment>
        vec2 c = gl_PointCoord - 0.5; float d = dot(c, c); if (d > 0.25) discard;
        float a = (1.0 - d * 4.0); a *= a; gl_FragColor = vec4(uColor, a * uOpacity * clamp(vLife * 1.6, 0.0, 1.0)); }`,
  });
  const pts = new THREE.Points(geo, mat);
  pts.name = 'Tyre_Rain_Spray';
  pts.frustumCulled = false;
  pts.renderOrder = 10;
  pts.visible = false;
  scene.add(pts);
  let head = 0;
  return {
    pts,
    emit(p, v, n, lifeS) {
      for (let k = 0; k < n; k++) {
        const i = head; head = (head + 1) % N;
        pos[i * 3] = p.x + (Math.random() - 0.5) * 2.5; pos[i * 3 + 1] = p.y + Math.random() * 0.8; pos[i * 3 + 2] = p.z + (Math.random() - 0.5) * 2.5;
        vel[i * 3] = v.x * (0.6 + Math.random() * 0.5) + (Math.random() - 0.5) * 25; vel[i * 3 + 1] = v.y * (0.4 + Math.random()) ; vel[i * 3 + 2] = v.z * (0.6 + Math.random() * 0.5) + (Math.random() - 0.5) * 25;
        life[i] = lifeS * (0.6 + Math.random() * 0.6);
      }
    },
    step(dt) {
      let any = false;
      for (let i = 0; i < N; i++) {
        if (life[i] <= 0) continue;
        any = true;
        life[i] -= dt;
        vel[i * 3 + 1] -= 60 * dt;                          // dm/s², softened gravity for mist
        const drag = Math.exp(-dt * 2.2);
        vel[i * 3] *= drag; vel[i * 3 + 2] *= drag;
        pos[i * 3] += vel[i * 3] * dt; pos[i * 3 + 1] += vel[i * 3 + 1] * dt; pos[i * 3 + 2] += vel[i * 3 + 2] * dt;
        if (life[i] <= 0) { life[i] = 0; pos[i * 3 + 1] = -1e5; }
      }
      geo.attributes.position.needsUpdate = true; geo.attributes.aLife.needsUpdate = true;
      return any;
    },
  };
}

// ---------------------------------------------------------------------------------------------
// Public
// ---------------------------------------------------------------------------------------------
export function initTyreStates({ carModel, renderer, scene, state = {}, trackMode = null } = {}) {
  const W = carModel?.userData?.wheels;
  if (!W || !W.corners?.length) { console.warn('[tyres] no wheels to configure'); return null; }
  ANISO = Math.min(16, renderer?.capabilities?.getMaxAnisotropy?.() ?? 8);
  const base = W.materials;
  const corners = Object.fromEntries(W.corners.map((c) => [c.key, c]));
  const geo = { base: W.tyreGeo, worn: null };
  const wornGeo = () => (geo.worn ||= { front: buildTyreGeometries(TYRE_SPEC.width.front, { worn: true }), rear: buildTyreGeometries(TYRE_SPEC.width.rear, { worn: true }) });

  const cs = Object.fromEntries(CORNERS.map((k) => [k, { compound: 'medium', wear: 'medium', lastSlick: 'medium' }]));
  const opts = { weather: 'dry', flap: true, spray: true, wetTrack: true, blown: [] };
  const matCache = new Map();
  const envOf = () => base.sidewall.envMap || base.tread.envMap || null;
  const withEnv = (m, intensity = 1.0) => { const e = envOf(); if (e) { m.envMap = e; m.envMapIntensity = intensity; } return m; };

  function getMaterials(compound, wear, wet) {
    const key = `${compound}|${wear}|${wet ? 1 : 0}`;
    if (matCache.has(key)) return matCache.get(key);
    const C = COMPOUNDS[compound], P = WEAR_MAT[wear];
    const treadWear = wear === 'blown' ? 'heavy' : wear;
    const tr = treadTextures(C.pattern, treadWear, base.tread);
    const sw = new THREE.MeshPhysicalMaterial({
      name: `Pirelli_Sidewall_${compound}_${wear}${wet ? '_Wet' : ''}`,
      map: sidewallColorTex(compound, SW_LEVEL[wear], base.sidewall),
      bumpMap: sidewallHeightTex(compound, base.sidewall), bumpScale: 2.2,
      roughness: P.swRough, metalness: 0,
      clearcoat: P.swCoat, clearcoatRoughness: P.swCoatR,
      sheen: P.sheen, sheenColor: new THREE.Color(0x56606e), sheenRoughness: 0.35,
    });
    const td = new THREE.MeshPhysicalMaterial({
      name: `Pirelli_Tread_${C.pattern}_${compound}_${wear}${wet ? '_Wet' : ''}`,
      map: tr.map, bumpMap: tr.detail, roughnessMap: tr.rough,
      bumpScale: P.bump * PATTERN_BUMP[C.pattern], roughness: 1.0, metalness: 0,
      clearcoat: P.trCoat, clearcoatRoughness: P.trCoatR,
      sheen: P.sheen * 0.8, sheenColor: new THREE.Color(0x4c5562), sheenRoughness: 0.4,
    });
    if (wet) {
      // water film: glossy clear coat with droplet normals, darker saturated rubber
      [[sw, dropletsAt(9, 9), 0.75], [td, dropletsAt(30, 4), 0.25]].forEach(([m, drops, rough]) => {
        m.clearcoat = 1.0; m.clearcoatRoughness = 0.035;
        m.clearcoatNormalMap = drops; m.clearcoatNormalScale = new THREE.Vector2(1.1, 1.1);
        m.color.setScalar(0.72); m.sheen = 0;
        m.roughness = Math.min(m.roughness, rough);
      });
      td.roughness = 0.45;
    }
    withEnv(sw, wet ? 1.1 : wear === 'new' ? 0.9 : 0.6);
    withEnv(td, wet ? 1.0 : wear === 'new' ? 0.8 : 0.5);
    const out = { tread: td, sidewall: sw };
    matCache.set(key, out);
    return out;
  }

  // ---- grooved tread geometry (inter / wet): real cut grooves, displaced from the groove mask ----
  const grooveCache = new Map();
  function groovedTread(pattern, wear, size, worn) {
    const depthF = TREAD_WEAR[wear === 'blown' ? 'heavy' : wear].depth;
    const key = `${pattern}|${size}|${worn ? 1 : 0}|${depthF}`;
    if (grooveCache.has(key)) return grooveCache.get(key);
    const mask = treadTextures(pattern, wear === 'blown' ? 'heavy' : wear, base.tread).mask;
    const src = (worn ? wornGeo() : geo.base)[size].tread.parameters.points;
    // resample the tread profile evenly by arc length (fine enough across for the groove walls)
    const lens = [0];
    for (let i = 1; i < src.length; i++) lens.push(lens[i - 1] + src[i].distanceTo(src[i - 1]));
    const L = lens[lens.length - 1], N = 84;
    const pts = [], vs = [];
    for (let j = 0; j < N; j++) {
      const t = (j / (N - 1)) * L;
      let i = 1; while (i < lens.length - 1 && lens[i] < t) i++;
      const f = (t - lens[i - 1]) / Math.max(1e-6, lens[i] - lens[i - 1]);
      pts.push(src[i - 1].clone().lerp(src[i], f)); vs.push(t / L);
    }
    const SEG = GROOVE_SEGMENTS;
    const g = new THREE.LatheGeometry(pts, SEG);
    const pos = g.attributes.position, nor = g.attributes.normal, uv = g.attributes.uv;
    const depth = GROOVE_DEPTH[pattern] * depthF;
    const sample = (u, v) => {        // bilinear, u wraps (6 tiles around), canvas top row = v 1
      const x = ((u * 6) % 1) * mask.W - 0.5, y = (1 - v) * (mask.H - 1);
      const x0 = Math.floor(x), y0 = Math.floor(y), fx = x - x0, fy = y - y0;
      const at = (xx, yy) => mask.data[THREE.MathUtils.clamp(yy, 0, mask.H - 1) * mask.W + (((xx % mask.W) + mask.W) % mask.W)];
      return ((at(x0, y0) * (1 - fx) + at(x0 + 1, y0) * fx) * (1 - fy) + (at(x0, y0 + 1) * (1 - fx) + at(x0 + 1, y0 + 1) * fx) * fy) / 255;
    };
    for (let i = 0; i < pos.count; i++) {
      const col = Math.floor(i / N), j = i % N;
      const u = col / SEG, v = vs[j];
      uv.setY(i, v);
      const fade = THREE.MathUtils.smoothstep(v, 0.015, 0.06) * (1 - THREE.MathUtils.smoothstep(v, 0.94, 0.985));
      const d = depth * Math.pow(sample(u, v), 0.8) * fade;
      if (d > 0) pos.setXYZ(i, pos.getX(i) - nor.getX(i) * d, pos.getY(i) - nor.getY(i) * d, pos.getZ(i) - nor.getZ(i) * d);
    }
    g.computeVertexNormals();
    grooveCache.set(key, g);
    return g;
  }

  // ---- blown tyres: per-corner uniforms / materials / flaps (any combination of corners) ----
  const TIME = { value: 0 };
  const blown = {};                  // key -> { U, mats: Map, depth, flapMat, flapDepth, flapMesh }
  function blownRig(k) {
    if (blown[k]) return blown[k];
    const c = corners[k];
    const U = {
      uTyreDown: { value: new THREE.Vector3(0, 0, -1) }, uTyreGround: { value: R - BLOWN_DROP }, uTyreRim: { value: RIM_FLANGE - 0.02 },
      uTyreR: { value: R }, uTyreHalfW: { value: c.hw }, uTyreFlat: { value: 1 }, uTyreTime: TIME, uTyreFlap: { value: 0 },
      uTyreDmgMirror: { value: c.key[1] === 'R' ? 1 : 0 },        // right-hand wheels see the lathe u mirrored
    };
    const mirror = U.uTyreDmgMirror.value === 1;
    const flapMat = patchBlown(withEnv(new THREE.MeshStandardMaterial({ name: `Tyre_Blown_Flaps_${k}`, map: flapTex(), alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.85, metalness: 0 }), 0.4), U, { flap: true });
    const flapDepth = patchBlown(new THREE.MeshDepthMaterial({ name: `Tyre_Blown_FlapDepth_${k}`, depthPacking: THREE.RGBADepthPacking, map: flapTex(), alphaTest: 0.5 }), U, { flap: true });
    const fkey = `${c.size}|${mirror ? 1 : 0}`;
    flapGeoCache[fkey] ||= buildFlapGeometry(c.hw, blownDamageTex().userData.patches, mirror);
    const flapMesh = new THREE.Mesh(flapGeoCache[fkey], flapMat);
    flapMesh.name = 'Tyre_Blown_Flaps'; flapMesh.customDepthMaterial = flapDepth; flapMesh.castShadow = c.tread.castShadow; flapMesh.frustumCulled = false;
    blown[k] = { U, mats: new Map(), depth: patchBlown(new THREE.MeshDepthMaterial({ name: `Tyre_Blown_Depth_${k}`, depthPacking: THREE.RGBADepthPacking }), U), flapMat, flapMesh };
    return blown[k];
  }
  const flapGeoCache = {};
  function getBlownMaterials(k, compound, wet) {
    const rig = blownRig(k);
    const key = `${compound}|${wet ? 1 : 0}`;
    if (rig.mats.has(key)) return rig.mats.get(key);
    const src = getMaterials(compound, 'blown', wet);
    const tread = patchBlown(src.tread.clone(), rig.U, { damage: blownDamageTex() });
    tread.name = `${src.tread.name}_Blown_${k}`;
    withEnv(tread, src.tread.envMapIntensity);
    const sidewall = patchBlown(src.sidewall.clone(), rig.U);
    sidewall.name = `${src.sidewall.name}_Blown_${k}`;
    withEnv(sidewall, src.sidewall.envMapIntensity);
    const out = { tread, sidewall };
    rig.mats.set(key, out);
    return out;
  }

  // stance group: tilts / lowers the whole car onto the flat tyre(s)
  let stance = carModel.getObjectByName('TyreState_Stance');
  const carInv = new THREE.Matrix4();
  carModel.updateMatrixWorld(true);
  carInv.copy(carModel.matrixWorld).invert();
  const cornerXY = Object.fromEntries(CORNERS.filter((k) => corners[k]).map((k) => { const p = corners[k].spindle.getWorldPosition(new THREE.Vector3()).applyMatrix4(carInv); return [k, [p.x, p.y]]; }));
  const travel = { fl: 0, fr: 0, rl: 0, rr: 0 };
  /**
   * Rigid chassis plane dz = c0 + cx·x + cy·y, least-squares fit to the target axle drops
   * (BLOWN_DROP on a flat corner, 0 elsewhere), then lowered so no corner rises above its static
   * height (springs only compress under a lost corner). Each wheel's suspension travel takes up
   * the rest: travel = target − plane (bump +, rebound −), so every tyre still meets the ground.
   * 1 flat: car rolls/pitches onto it (diagonal corner stays put). 2 flats on one side / axle:
   * exact roll / pitch. 2 diagonal flats: car sits ½·drop lower, suspension takes the twist. 4: all down.
   */
  function applyStance(blownKeys) {
    if (!stance && !blownKeys.length) return;
    if (!stance) {
      stance = new THREE.Group(); stance.name = 'TyreState_Stance';
      [...carModel.children].forEach((ch) => stance.add(ch));
      carModel.add(stance);
      carModel.userData.stanceFrame = stance;
    }
    Object.keys(travel).forEach((k) => (travel[k] = 0));
    stance.position.set(0, 0, 0); stance.rotation.set(0, 0, 0);
    stance.userData.solve = null;
    const ks = CORNERS.filter((k) => cornerXY[k]);
    if (!blownKeys.length || ks.length < 3) return;
    const target = (k) => (blownKeys.includes(k) ? -BLOWN_DROP : 0);
    // normal equations (3x3) for least squares
    const M = [[0, 0, 0], [0, 0, 0], [0, 0, 0]], bv = [0, 0, 0];
    ks.forEach((k) => { const r = [1, cornerXY[k][0], cornerXY[k][1]]; for (let i = 0; i < 3; i++) { bv[i] += r[i] * target(k); for (let j = 0; j < 3; j++) M[i][j] += r[i] * r[j]; } });
    const det3 = (m) => m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) - m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) + m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);
    const D = det3(M);
    if (!Number.isFinite(D) || Math.abs(D) < 1e-7) return;
    let [c0, cx, cy] = [0, 1, 2].map((c) => det3(M.map((row, i) => row.map((v, j) => (j === c ? bv[i] : v)))) / D);
    const plane = (k) => c0 + cx * cornerXY[k][0] + cy * cornerXY[k][1];
    const rise = Math.max(...ks.map(plane));
    if (rise > 0) c0 -= rise;
    stance.rotation.set(
      Math.asin(Math.max(-1, Math.min(1, cy))),
      Math.asin(Math.max(-1, Math.min(1, -cx))),
      0
    );
    stance.position.z = c0;
    ks.forEach((k) => { travel[corners[k].kinKey] = target(k) - plane(k); });
    stance.userData.solve = { c0, cx, cy, travel: { ...travel } };
  }

  function applyCorner(k) {
    const c = corners[k]; if (!c) return;
    const st = cs[k];
    const wet = opts.weather === 'wet';
    const isBlown = st.wear === 'blown';
    const worn = st.wear === 'heavy' || isBlown;
    const g = worn ? wornGeo()[c.size] : geo.base[c.size];
    const pattern = COMPOUNDS[st.compound].pattern;
    c.tread.geometry = pattern === 'slick' ? g.tread : groovedTread(pattern, st.wear, c.size, worn);
    c.swOut.geometry = g.swOut; c.swIn.geometry = g.swIn;
    const m = isBlown ? getBlownMaterials(k, st.compound, wet) : getMaterials(st.compound, st.wear, wet);
    // wireframe mode (app state) also applies to freshly swapped tyre materials
    [m.tread, m.sidewall].forEach((mm) => { if (mm.wireframe !== !!state.wireframe) mm.wireframe = !!state.wireframe; });
    c.tread.material = m.tread; c.swOut.material = m.sidewall; c.swIn.material = m.sidewall;
    const rig = isBlown ? blownRig(k) : blown[k];
    [c.tread, c.swOut, c.swIn].forEach((mesh) => { mesh.customDepthMaterial = isBlown ? rig.depth : undefined; });
    if (rig) {
      if (isBlown) { rig.flapMat.wireframe = !!state.wireframe; c.vis.add(rig.flapMesh); }
      else if (rig.flapMesh.parent) rig.flapMesh.parent.remove(rig.flapMesh);
    }
  }

  function refresh() {
    const blownKeys = CORNERS.filter((k) => cs[k].wear === 'blown');
    opts.blown = blownKeys;
    CORNERS.forEach(applyCorner);
    applyStance(blownKeys);
    wetTrack(opts.weather === 'wet' && opts.wetTrack);
    // Drive-mode grip (read by cad/track/track_mode.js)
    const wx = opts.weather === 'wet' ? 'wet' : 'dry';
    let g = CORNERS.reduce((a, k) => a + GRIP_COMPOUND[wx][cs[k].compound] * GRIP_WEAR[cs[k].wear], 0) / 4;
    if (blownKeys.length) g = Math.min(g, 0.62 - 0.1 * (blownKeys.length - 1));
    state.tyreGrip = +g.toFixed(3);
    syncUi();
    window.dispatchEvent(new CustomEvent('tyrestatechange', { detail: api.get() }));
  }

  // ---- wet track sheen (Red Bull Ring + classic set) ----
  // Darker, glossier surfaces with a soft env reflection; the direct (sun) specular is clamped in
  // the shader so the low roughness gives a wet sheen instead of a blown-out white streak.
  const trackMats = [];
  const WET_SPEC_MAX = { value: 0.06 };
  function wetPatch(m) {
    const prev = m.onBeforeCompile;
    m.onBeforeCompile = (sh, r) => {
      prev?.call(m, sh, r);
      sh.uniforms.uWetSpecMax = WET_SPEC_MAX;
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', '#include <common>\n#ifdef WET_TRACK\nuniform float uWetSpecMax;\n#endif')
        .replace('#include <lights_fragment_end>', '#include <lights_fragment_end>\n#ifdef WET_TRACK\n reflectedLight.directSpecular = min(reflectedLight.directSpecular, vec3(uWetSpecMax));\n#endif');
    };
    const prevKey = m.customProgramCacheKey?.bind(m);
    m.customProgramCacheKey = () => (prevKey ? prevKey() : '') + '|wetTrack';
  }
  function collectTrackMats() {
    if (trackMats.length) return;
    const roots = [trackMode?.circuit?.group || window.__RBR__?.group, scene?.getObjectByName('F1_GrandPrix_FinishLine_Environment')].filter(Boolean);
    const seen = new Set();
    roots.forEach((root) => root.traverse((o) => {
      if (!o.isMesh || !/^(RBR_(Asphalt|PitLane|Runoff|Kerbs|StartFinish|White_Lines|Pit_Boxes)|Classic_Track_)/.test(o.name)) return;
      const m = o.material; if (!m || seen.has(m) || !m.isMeshStandardMaterial) return;
      seen.add(m);
      wetPatch(m);
      trackMats.push({ m, rough: m.roughness, metal: m.metalness, color: m.color.clone(), env: m.envMap, envI: m.envMapIntensity });
    }));
  }
  let trackWet = false;
  function wetTrack(on) {
    collectTrackMats();
    if (on === trackWet) return;
    trackWet = on;
    trackMats.forEach((t) => {
      if (on) {
        t.m.roughness = Math.max(0.26, t.rough * 0.42); t.m.metalness = 0; t.m.color.copy(t.color).multiplyScalar(0.55);
        if (envOf()) { t.m.envMap = envOf(); t.m.envMapIntensity = 0.3; }
        t.m.defines = { ...(t.m.defines || {}), WET_TRACK: '' };
      } else {
        t.m.roughness = t.rough; t.m.metalness = t.metal; t.m.color.copy(t.color); t.m.envMap = t.env; t.m.envMapIntensity = t.envI;
        if (t.m.defines) delete t.m.defines.WET_TRACK;
      }
      t.m.needsUpdate = true;
    });
  }

  // ---- spray ----
  const spray = scene ? createSpray(scene) : null;
  const tmpV = new THREE.Vector3(), tmpF = new THREE.Vector3(), tmpU = new THREE.Vector3(), tmpI = new THREE.Matrix4();
  let emitAcc = 0;

  // ---- public API ----
  const api = {
    COMPOUNDS, WEAR_STATES, TYRE_STATES,
    get() { return { corners: JSON.parse(JSON.stringify(cs)), weather: opts.weather, blown: [...opts.blown], stance: stance?.userData?.solve || null, options: { flap: opts.flap, spray: opts.spray, wetTrack: opts.wetTrack }, grip: state.tyreGrip }; },
    setTyreCompound(corner, compound) {
      if (!COMPOUNDS[compound]) throw new Error(`[tyres] unknown compound "${compound}"`);
      normCorner(corner).forEach((k) => { cs[k].compound = compound; if (COMPOUNDS[compound].pattern === 'slick') cs[k].lastSlick = compound; });
      refresh();
    },
    setTyreWear(corner, wear) {
      if (!WEAR_STATES[wear]) throw new Error(`[tyres] unknown wear state "${wear}"`);
      normCorner(corner).forEach((k) => { if (wear === 'blown' && cs[k].wear !== 'blown') cs[k].preBlown = cs[k].wear; cs[k].wear = wear; });
      refresh();
    },
    /** blow (true) or repair (false, back to the wear it had before) one or more corners; any combination */
    setBlown(corner, on = true) {
      normCorner(corner).forEach((k) => {
        if (on && cs[k].wear !== 'blown') { cs[k].preBlown = cs[k].wear; cs[k].wear = 'blown'; }
        else if (!on && cs[k].wear === 'blown') cs[k].wear = cs[k].preBlown && cs[k].preBlown !== 'blown' ? cs[k].preBlown : 'medium';
      });
      refresh();
    },
    /** legacy (single flat): makes `corner` the only blown tyre */
    setBlownCorner(corner) {
      const k = normCorner(corner)[0];
      CORNERS.forEach((c) => { if (c !== k && cs[c].wear === 'blown') cs[c].wear = cs[c].preBlown && cs[c].preBlown !== 'blown' ? cs[c].preBlown : 'medium'; });
      api.setBlown(k, true);
    },
    setWeather(w) { opts.weather = w === 'wet' ? 'wet' : 'dry'; refresh(); },
    setOptions(o = {}) { ['flap', 'spray', 'wetTrack'].forEach((k) => { if (k in o) opts[k] = !!o[k]; }); refresh(); },
    /** UI preset: new|laps|medium|heavy|blown|rainy on corner(s) */
    setTyreState(name, corner = 'all') {
      if (!TYRE_STATES[name]) throw new Error(`[tyres] unknown tyre state "${name}"`);
      const keys = normCorner(corner);
      if (name === 'rainy') {
        opts.weather = 'wet';
        keys.forEach((k) => { if (cs[k].compound !== 'inter') cs[k].compound = 'wet'; if (cs[k].wear === 'blown' || cs[k].wear === 'heavy') cs[k].wear = 'laps'; else if (cs[k].wear === 'new') cs[k].wear = 'laps'; });
        refresh(); return;
      }
      if (opts.weather === 'wet') {        // back to the dry: refit the last slick compound
        opts.weather = 'dry';
        CORNERS.forEach((k) => { if (COMPOUNDS[cs[k].compound].pattern !== 'slick') cs[k].compound = cs[k].lastSlick || 'medium'; });
      }
      if (name === 'blown') {
        // 'all' = the race-scenario preset: only the rear left goes flat, the rest are medium-worn.
        // A single corner ADDS that corner to the flats (pick several corners one after another).
        if (keys.length === 4) {
          CORNERS.forEach((k) => { if (cs[k].wear === 'blown' || cs[k].wear === 'new' || cs[k].wear === 'laps') cs[k].wear = 'medium'; });
          api.setBlown('RL', true);
        } else api.setBlown(keys, true);
        return;
      }
      keys.forEach((k) => (cs[k].wear = name));
      refresh();
    },
    /** call once per frame right before rendering */
    update(dt = 1 / 60) {
      TIME.value += dt;
      const speed = state.speedKmH || 0;
      if (opts.blown.length) {
        carModel.updateWorldMatrix(true, false);
        tmpV.set(0, 0, -1).transformDirection(carModel.matrixWorld);       // ground normal (car frame -Z)
        const target = opts.flap ? THREE.MathUtils.clamp(speed / 140, 0, 1) : 0;
        opts.blown.forEach((k) => {
          const c = corners[k], rig = blown[k]; if (!c || !rig) return;
          c.tread.updateWorldMatrix(true, false);
          tmpI.copy(c.tread.matrixWorld).invert();
          rig.U.uTyreDown.value.copy(tmpV).transformDirection(tmpI);
          rig.U.uTyreFlap.value += (target - rig.U.uTyreFlap.value) * Math.min(1, dt * 4);
        });
      }
      if (spray) {
        const on = opts.weather === 'wet' && opts.spray && speed > 25;
        if (on) {
          spray.pts.visible = true;
          carModel.updateWorldMatrix(true, false);
          tmpF.set(-1, 0, 0).transformDirection(carModel.matrixWorld);     // car forward (CAD -X)
          tmpU.set(0, 0, 1).transformDirection(carModel.matrixWorld);
          const v = speed / 3.6 * 10;                                       // dm/s
          emitAcc += dt * Math.min(2400, speed * 9);
          const n = Math.floor(emitAcc); emitAcc -= n;
          if (n > 0) {
            CORNERS.forEach((k) => {
              const c = corners[k]; if (!c) return;
              const rear = k[0] === 'R';
              const share = Math.round(n * (rear ? 0.34 : 0.16));
              c.spindle.getWorldPosition(tmpV).addScaledVector(tmpU, -R * 0.85).addScaledVector(tmpF, -R * 0.9);
              const vel = tmpF.clone().multiplyScalar(v * 0.55).addScaledVector(tmpU, 18 + v * 0.05);   // caught in the wake: trails the car
              spray.emit(tmpV, vel, share, 0.9);
            });
          }
        }
        if (!spray.step(Math.min(dt, 0.05)) && !on) spray.pts.visible = false;
      }
    },
    get suspensionTravel() { return travel; },
  };

  // ---- UI ----
  const $ = (id) => document.getElementById(id);
  const ui = {};
  function syncUi() {
    if (!ui.state) return;
    const k = ui.corner.value === 'all' ? (opts.blown[0] || 'RL') : ui.corner.value;
    const st = cs[k];
    ui.state.value = opts.weather === 'wet' && COMPOUNDS[st.compound].pattern !== 'slick' ? 'rainy' : st.wear;
    ui.compound.value = st.compound;
    ui.flapRow.style.display = opts.blown.length ? '' : 'none';
    ui.wetRow.style.display = opts.weather === 'wet' ? '' : 'none';
    ui.flap.checked = opts.flap; ui.spray.checked = opts.spray && opts.wetTrack;
    if (ui.hud) ui.hud.value = ui.state.value;
    ui.summary.textContent = CORNERS.map((c) => `${c} ${cs[c].compound} · ${WEAR_STATES[cs[c].wear].toLowerCase()}`).join('  |  ') + (opts.weather === 'wet' ? '  |  WET' : '') + `  ·  grip ×${state.tyreGrip}`;
  }
  function buildUi() {
    const host = $('slider-exploded')?.closest('.ctrl-group')?.parentElement;
    if (!host) return;
    const opt = (o) => Object.entries(o).map(([v, l]) => `<option value="${v}">${l}</option>`).join('');
    const box = document.createElement('div');
    box.className = 'ctrl-group tyre-ctrl';
    box.id = 'tyre-controls';
    box.innerHTML = `
      <label class="ctrl-label"><span>Tyre state</span><span id="tyre-grip"></span></label>
      <div class="tyre-row">
        <select id="tyre-state" aria-label="Tyre state">${opt(TYRE_STATES)}</select>
        <select id="tyre-corner" aria-label="Tyre corner" title="Which tyre(s) the state / compound applies to">
          <option value="all">All 4</option><option value="FL">Front L</option><option value="FR">Front R</option><option value="RL">Rear L</option><option value="RR">Rear R</option>
        </select>
      </div>
      <label class="ctrl-label"><span>Compound</span><span></span></label>
      <div class="tyre-row"><select id="tyre-compound" aria-label="Tyre compound">${opt(Object.fromEntries(Object.entries(COMPOUNDS).map(([k, v]) => [k, v.label])))}</select></div>
      <div class="tyre-row tyre-check" id="tyre-flap-row"><label><input type="checkbox" id="tyre-flap" checked /> Flapping rubber when driving</label></div>
      <div class="tyre-row tyre-check" id="tyre-wet-row"><label><input type="checkbox" id="tyre-spray" checked /> Wet track sheen + spray</label></div>
      <div class="tyre-summary" id="tyre-summary"></div>`;
    host.appendChild(box);
    const css = document.createElement('style');
    css.textContent = `
      .tyre-ctrl .tyre-row{display:flex;gap:6px;margin-bottom:6px}
      .tyre-ctrl select{flex:1;background:var(--key,#141b26);color:var(--text,#e6edf5);border:1px solid var(--border,#2a3545);border-radius:4px;padding:3px 5px;font-size:.76rem}
      .tyre-ctrl .tyre-check label{font-size:.72rem;color:var(--muted,#8b9bb0);display:flex;gap:6px;align-items:center}
      .tyre-ctrl .tyre-summary{font-size:.66rem;color:var(--muted,#8b9bb0);font-family:var(--mono,monospace);line-height:1.35}
      #rbr-hud .rbr-tyre{background:#141b26;color:#cfd8e3;border:1px solid #2a3545;border-radius:5px;padding:2px 4px;font-size:11px}`;
    document.head.appendChild(css);
    Object.assign(ui, { state: $('tyre-state'), corner: $('tyre-corner'), compound: $('tyre-compound'), flap: $('tyre-flap'), spray: $('tyre-spray'), flapRow: $('tyre-flap-row'), wetRow: $('tyre-wet-row'), summary: $('tyre-summary') });
    ui.state.addEventListener('change', () => api.setTyreState(ui.state.value, ui.corner.value));
    ui.compound.addEventListener('change', () => api.setTyreCompound(ui.corner.value, ui.compound.value));
    ui.corner.addEventListener('change', syncUi);
    ui.flap.addEventListener('change', () => api.setOptions({ flap: ui.flap.checked }));
    ui.spray.addEventListener('change', () => api.setOptions({ spray: ui.spray.checked, wetTrack: ui.spray.checked }));
    // compact copy in the Red Bull Ring HUD (Drive mode)
    const row = document.querySelector('#rbr-hud .rbr-row:nth-of-type(2)') || document.querySelector('#rbr-hud .rbr-row');
    if (row) {
      const sel = document.createElement('select');
      sel.className = 'rbr-tyre'; sel.id = 'rbr-tyre-state'; sel.title = 'Tyre state (all four tyres; blown = rear left)';
      sel.innerHTML = opt(TYRE_STATES);
      sel.addEventListener('change', () => { ui.corner.value = 'all'; api.setTyreState(sel.value, 'all'); });
      sel.addEventListener('keydown', (e) => e.stopPropagation());
      row.appendChild(sel);
      ui.hud = sel;
    }
  }
  buildUi();

  // initial state from the URL (?tyre=blown&compound=soft&blown=RR&weather=wet)
  const q = new URLSearchParams(typeof location !== 'undefined' ? location.search : '');
  try {
    if (q.get('compound')) CORNERS.forEach((k) => { cs[k].compound = q.get('compound'); if (COMPOUNDS[q.get('compound')]?.pattern === 'slick') cs[k].lastSlick = q.get('compound'); });
    if (!COMPOUNDS[cs.FL.compound]) CORNERS.forEach((k) => (cs[k].compound = 'medium'));
    const t = q.get('tyre');
    if (q.get('weather') === 'wet') opts.weather = 'wet';
    if (t === 'blown') { CORNERS.forEach((k) => (cs[k].wear = 'medium')); normCorner((q.get('blown') || 'RL').split(',')).forEach((k) => (cs[k].wear = 'blown')); refresh(); }
    else if (t && TYRE_STATES[t]) api.setTyreState(t);
    else refresh();
  } catch (e) { console.warn('[tyres] bad URL tyre params', e.message); refresh(); }

  window.tyreStates = api;
  window.setTyreCompound = api.setTyreCompound;
  console.info('[tyres]', JSON.stringify({ compounds: Object.keys(COMPOUNDS), wear: Object.keys(WEAR_STATES), state: api.get().corners }));
  return api;
}
