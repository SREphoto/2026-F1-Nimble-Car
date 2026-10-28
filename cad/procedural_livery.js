/**
 * procedural_livery.js — Procedural Livery & Typography Engine
 * 2026 Formula 1 "Nimble Car" · SREdesigns - Samuel R Erwin III
 *
 * Generates every livery graphic as a high-resolution CanvasTexture (zero
 * external assets), matching the owner's 2026 Red Bull Racing livery
 * references: matte navy body, red/yellow charging bulls, yellow nose,
 * ORACLE / Red Bull / Mobil 1 / VISA / Gate / ROKT / TAG Heuer / AT&T /
 * 1Password and smaller partner marks, Pirelli P Zero sidewalls.
 * Sponsor marks are hand-drawn approximations (text + simple shapes).
 *
 * Two groups of exports:
 *  1. Decal artwork (create*DecalTexture) — transparent-background graphics that
 *     cad/livery_decals.js projects onto the bodywork with DecalGeometry so they
 *     wrap the real surface (no floating quads, no z-fighting, never mirrored).
 *  2. Legacy factory names (createSidepodLiveryTexture, createPirelliSidewallTexture, …)
 *     still imported by the CAD modules for their old flat decal quads. They now
 *     return a tiny transparent placeholder tagged `userData.sreLegacyQuad`, so
 *     livery_decals.js can strip those quads and project the real artwork instead.
 */

import * as THREE from 'three';

// ---------------------------------------------------------------------------
// Livery palette (sRGB)
// ---------------------------------------------------------------------------
export const LIVERY = {
  navy: '#1b2a6b',
  navyDeep: '#0e1638',
  red: '#d8102c',
  yellow: '#f6c200',
  white: '#f5f7fa',
  mobilBlue: '#1f3f9a',
  tagGreen: '#00843d',
  raceNumber: '1',
};

const SANS = '"Helvetica Neue", Helvetica, Arial, "Liberation Sans", sans-serif';
const HEAVY = '"Arial Black", "Helvetica Neue", Helvetica, Arial, "Liberation Sans", sans-serif';
const MONO = 'Menlo, Consolas, "Liberation Mono", monospace';

/** Configure a crisp, colour-correct CanvasTexture. */
function finalizeTexture(canvas, { legacy = false } = {}) {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace; // canvas pixels are sRGB — fixes washed-out colours
  tex.anisotropy = 8;                    // raised to the GPU max in livery_decals.js
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  if (legacy) tex.userData.sreLegacyQuad = true;
  tex.needsUpdate = true;
  return tex;
}

function makeCanvas(w, h) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, w, h);
  return { canvas, ctx };
}

/** Draw text shrunk (never stretched) to fit maxWidth. Returns drawn width. */
function fitText(ctx, text, x, y, maxWidth, sizePx, fontFn, { align = 'center', fill = null, stroke = null, strokeWidth = 0, spacing = 0 } = {}) {
  let size = sizePx;
  ctx.letterSpacing = `${spacing * size}px`;
  ctx.font = fontFn(size);
  let wText = ctx.measureText(text).width;
  if (wText > maxWidth) {
    size = Math.floor(size * maxWidth / wText);
    ctx.letterSpacing = `${spacing * size}px`;
    ctx.font = fontFn(size);
    wText = ctx.measureText(text).width;
  }
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  if (stroke && strokeWidth > 0) {
    ctx.lineJoin = 'round';
    ctx.lineWidth = strokeWidth;
    ctx.strokeStyle = stroke;
    ctx.strokeText(text, x, y);
  }
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fillText(text, x, y);
  }
  ctx.letterSpacing = '0px';
  return wText;
}

/** Mirror only the graphics (never the text) so the bull always charges forward. */
function withFacing(ctx, w, facingRight, fn) {
  ctx.save();
  if (!facingRight) { ctx.translate(w, 0); ctx.scale(-1, 1); }
  fn();
  ctx.restore();
}

// ---------------------------------------------------------------------------
// Logo drawing primitives
// ---------------------------------------------------------------------------

/**
 * Charging bull (Red Bull style), facing +x, fitted into a w×h box centred at (cx, cy).
 * Head lowered with horns forward, front legs braced, hind legs driving back and the
 * tail whipped up over the rump. Designed on a 400×220 grid; `keepAspect` scales
 * uniformly (use it on small decals so the bull never squashes into a "pig").
 */
function drawBull(ctx, cx, cy, w, h, { fill = LIVERY.red, horn = null, outline = null, keepAspect = false } = {}) {
  ctx.save();
  ctx.translate(cx, cy);
  if (keepAspect) { const k = Math.min(w / 400, h / 220); ctx.scale(k, k); } else ctx.scale(w / 400, h / 220);
  const body = new Path2D();
  // Wedge-shaped bull: massive shoulders/chest, small hindquarters (like the emblem)
  // tail: whipped up from the rump with a tufted tip
  body.moveTo(-132, -34);
  body.bezierCurveTo(-158, -50, -176, -78, -166, -104);
  body.quadraticCurveTo(-156, -116, -144, -108);         // tuft
  body.quadraticCurveTo(-154, -102, -152, -92);
  body.bezierCurveTo(-150, -70, -138, -54, -118, -44);
  // back rising steeply to the big shoulder hump
  body.bezierCurveTo(-70, -60, -10, -88, 40, -96);
  body.bezierCurveTo(80, -100, 108, -86, 122, -64);      // hump -> poll of the head
  // forehead down to a lowered, deep head
  body.bezierCurveTo(140, -42, 162, -6, 178, 22);
  body.quadraticCurveTo(194, 44, 190, 58);               // muzzle (head low)
  body.quadraticCurveTo(176, 72, 158, 64);               // chin
  body.bezierCurveTo(146, 60, 134, 62, 124, 70);         // jaw -> dewlap
  // near front leg thrust forward, hoof planted
  body.lineTo(158, 98);
  body.lineTo(168, 110);
  body.lineTo(146, 112);
  body.lineTo(104, 82);
  // far front leg folded under the chest
  body.lineTo(98, 86);
  body.lineTo(110, 104);
  body.lineTo(92, 110);
  body.lineTo(64, 80);
  // belly rising toward the small rear
  body.bezierCurveTo(20, 76, -40, 56, -86, 40);
  // near hind leg driving back, fully extended
  body.lineTo(-150, 78);
  body.lineTo(-194, 92);
  body.lineTo(-198, 80);
  body.lineTo(-160, 62);
  body.lineTo(-118, 30);
  // far hind leg
  body.lineTo(-126, 48);
  body.lineTo(-170, 62);
  body.lineTo(-172, 52);
  body.lineTo(-134, 30);
  // haunch back up to the rump
  body.bezierCurveTo(-148, 12, -150, -16, -132, -34);
  body.closePath();
  // horns: long, sweeping forward from the top of the lowered head
  const horns = new Path2D();
  horns.moveTo(132, -50);
  horns.bezierCurveTo(158, -78, 196, -88, 226, -76);
  horns.bezierCurveTo(196, -70, 172, -52, 158, -26);
  horns.closePath();
  horns.moveTo(114, -66);
  horns.bezierCurveTo(130, -100, 160, -116, 190, -112);
  horns.bezierCurveTo(164, -100, 146, -82, 138, -56);
  horns.closePath();
  if (outline) {
    ctx.lineJoin = 'round';
    ctx.lineWidth = 12; ctx.strokeStyle = outline;
    ctx.stroke(body); ctx.stroke(horns);
  }
  ctx.fillStyle = fill;
  ctx.fill(body);
  ctx.fillStyle = horn || fill;
  ctx.fill(horns);
  // eye + ear notch in the outline colour so the head reads
  const accent = outline || LIVERY.yellow;
  ctx.fillStyle = accent;
  ctx.beginPath(); ctx.ellipse(160, 14, 7, 4.5, 0.9, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.moveTo(126, -40); ctx.lineTo(106, -52); ctx.lineTo(128, -54); ctx.closePath(); ctx.fill();
  ctx.restore();
}

/** Two bulls charging at a yellow sun disc (the classic Red Bull emblem). */
function drawTwinBullEmblem(ctx, cx, cy, size) {
  ctx.fillStyle = LIVERY.yellow;
  ctx.beginPath(); ctx.arc(cx, cy - size * 0.05, size * 0.22, 0, Math.PI * 2); ctx.fill();
  drawBull(ctx, cx - size * 0.29, cy + size * 0.02, size * 0.56, size * 0.3, { horn: LIVERY.yellow });
  ctx.save(); ctx.translate(cx * 2, 0); ctx.scale(-1, 1);
  drawBull(ctx, cx - size * 0.29, cy + size * 0.02, size * 0.56, size * 0.3, { horn: LIVERY.yellow });
  ctx.restore();
}

function drawRedBullText(ctx, cx, cy, maxW, h, { fill = LIVERY.red, stroke = LIVERY.white } = {}) {
  fitText(ctx, 'Red Bull', cx, cy, maxW, h, s => `900 ${s}px ${HEAVY}`, { fill, stroke, strokeWidth: h * 0.12, spacing: -0.02 });
}

function drawOracle(ctx, cx, cy, maxW, h, fill = LIVERY.white) {
  fitText(ctx, 'ORACLE', cx, cy, maxW, h, s => `600 ${s}px ${SANS}`, { fill, spacing: 0.12 });
}

/** "Mobil" with red 'o' and the boxed "1". */
function drawMobil1(ctx, cx, cy, maxW, h, { text = LIVERY.white, o = LIVERY.red } = {}) {
  const font = s => `700 ${s}px ${SANS}`;
  let size = h;
  ctx.font = font(size);
  const parts = ['M', 'o', 'bil'];
  const measure = () => { ctx.font = font(size); return parts.reduce((t, p) => t + ctx.measureText(p).width, 0) + size * 0.95; };
  let total = measure();
  if (total > maxW) { size *= maxW / total; total = measure(); }
  let x = cx - total / 2;
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  parts.forEach((p, i) => { ctx.fillStyle = i === 1 ? o : text; ctx.fillText(p, x, cy); x += ctx.measureText(p).width; });
  x += size * 0.18;
  const bw = size * 0.72, bh = size * 0.86;
  ctx.lineWidth = size * 0.07; ctx.strokeStyle = text;
  ctx.strokeRect(x, cy - bh / 2, bw, bh);
  ctx.fillStyle = text;
  fitText(ctx, '1', x + bw / 2, cy + size * 0.02, bw * 0.8, size * 0.78, s => `700 ${s}px ${SANS}`, { fill: text });
}

function drawVisa(ctx, cx, cy, maxW, h, fill = LIVERY.white) {
  fitText(ctx, 'VISA', cx, cy, maxW, h, s => `italic 900 ${s}px ${HEAVY}`, { fill, spacing: 0.02 });
}

/** Circular "G" mark + "Gate". */
function drawGate(ctx, cx, cy, maxW, h, fill = LIVERY.white) {
  const font = s => `700 ${s}px ${SANS}`;
  let size = h;
  ctx.font = font(size);
  let tw = ctx.measureText('Gate').width;
  let total = size * 1.05 + tw;
  if (total > maxW) { size *= maxW / total; ctx.font = font(size); tw = ctx.measureText('Gate').width; total = size * 1.05 + tw; }
  const left = cx - total / 2;
  const r = size * 0.4, gx = left + r, gy = cy;
  ctx.lineWidth = size * 0.16; ctx.strokeStyle = fill; ctx.lineCap = 'butt';
  ctx.beginPath(); ctx.arc(gx, gy, r, Math.PI * 0.25, Math.PI * 1.95); ctx.stroke();
  ctx.fillStyle = fill; ctx.fillRect(gx, gy - size * 0.08, r, size * 0.16);
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.fillText('Gate', left + size * 1.05, cy + size * 0.02);
}

/** TAG Heuer shield: green "TAG" over red "HEUER", white keyline. */
function drawTagHeuer(ctx, cx, cy, w, h) {
  ctx.save(); ctx.translate(cx, cy);
  const hw = w / 2, hh = h / 2;
  const shield = () => { ctx.beginPath(); ctx.moveTo(-hw, -hh); ctx.lineTo(hw, -hh); ctx.lineTo(hw, hh * 0.35); ctx.lineTo(0, hh); ctx.lineTo(-hw, hh * 0.35); ctx.closePath(); };
  shield(); ctx.fillStyle = LIVERY.white; ctx.fill();
  ctx.save(); ctx.scale(0.9, 0.88); shield(); ctx.clip();
  ctx.fillStyle = LIVERY.tagGreen; ctx.fillRect(-hw, -hh, w, hh * 0.95);
  ctx.fillStyle = LIVERY.red; ctx.fillRect(-hw, -hh * 0.05, w, hh * 1.2);
  ctx.restore();
  fitText(ctx, 'TAG', 0, -hh * 0.48, w * 0.7, hh * 0.62, s => `900 ${s}px ${HEAVY}`, { fill: LIVERY.white });
  fitText(ctx, 'HEUER', 0, hh * 0.3, w * 0.74, hh * 0.46, s => `900 ${s}px ${HEAVY}`, { fill: LIVERY.white });
  ctx.restore();
}

function drawATT(ctx, cx, cy, maxW, h, fill = LIVERY.white) {
  const font = s => `700 ${s}px ${SANS}`;
  ctx.font = font(h);
  let size = h; let tw = ctx.measureText('AT&T').width; let total = size * 1.2 + tw;
  if (total > maxW) { size *= maxW / total; ctx.font = font(size); tw = ctx.measureText('AT&T').width; total = size * 1.2 + tw; }
  const left = cx - total / 2, r = size * 0.48, gx = left + r;
  ctx.save();
  ctx.beginPath(); ctx.arc(gx, cy, r, 0, Math.PI * 2); ctx.fillStyle = fill; ctx.fill();
  ctx.clip();
  ctx.strokeStyle = 'rgba(0,0,0,0.55)'; ctx.lineWidth = size * 0.07;
  for (let k = -2; k <= 2; k++) { ctx.beginPath(); ctx.moveTo(gx - r, cy + k * r * 0.38 + r * 0.1); ctx.lineTo(gx + r, cy + k * r * 0.38 - r * 0.15); ctx.stroke(); }
  ctx.restore();
  ctx.fillStyle = fill; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.fillText('AT&T', left + size * 1.2, cy + size * 0.03);
}

function drawOnePassword(ctx, cx, cy, maxW, h, fill = LIVERY.white) {
  const font = s => `700 ${s}px ${SANS}`;
  let size = h; ctx.font = font(size);
  let tw = ctx.measureText('1Password').width; let total = size * 1.1 + tw;
  if (total > maxW) { size *= maxW / total; ctx.font = font(size); tw = ctx.measureText('1Password').width; total = size * 1.1 + tw; }
  const left = cx - total / 2, r = size * 0.45;
  ctx.beginPath(); ctx.arc(left + r, cy, r, 0, Math.PI * 2); ctx.fillStyle = fill; ctx.fill();
  fitText(ctx, '1', left + r, cy + size * 0.03, r * 1.2, size * 0.62, s => `900 ${s}px ${SANS}`, { fill: LIVERY.navyDeep });
  ctx.fillStyle = fill; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.font = font(size); ctx.fillText('1Password', left + size * 1.1, cy + size * 0.03);
}

function drawSmall(ctx, text, cx, cy, maxW, h, style = 'bold', fill = LIVERY.white) {
  const fonts = {
    bold: s => `800 ${s}px ${SANS}`,
    italic: s => `italic 700 ${s}px ${SANS}`,
    serif: s => `700 ${s}px Georgia, "Times New Roman", serif`,
    script: s => `italic 700 ${s}px "Brush Script MT", "Segoe Script", Georgia, serif`,
    heavy: s => `900 ${s}px ${HEAVY}`,
  };
  fitText(ctx, text, cx, cy, maxW, h, fonts[style] || fonts.bold, { fill });
}

/** White race-number plate with red number (nose top). */
function drawNumberPlate(ctx, cx, cy, w, h) {
  const r = h * 0.18;
  ctx.beginPath();
  ctx.roundRect(cx - w / 2, cy - h / 2, w, h, r);
  ctx.fillStyle = LIVERY.white; ctx.fill();
  ctx.lineWidth = h * 0.06; ctx.strokeStyle = LIVERY.red; ctx.stroke();
  fitText(ctx, LIVERY.raceNumber, cx, cy + h * 0.04, w * 0.6, h * 0.86, s => `900 ${s}px ${HEAVY}`, { fill: LIVERY.red });
}

// ===========================================================================
// 1. PROJECTED DECAL ARTWORK (used by livery_decals.js)
// ===========================================================================

/** Sidepod flank: huge ORACLE wordmark + small partner row (CLEAR · SIEMENS · HEXAGON). */
export function createSidepodDecalTexture({ frontIsLeft = true } = {}) {
  const w = 2048, h = 512;
  const { canvas, ctx } = makeCanvas(w, h);
  drawOracle(ctx, w * 0.5, h * 0.42, w * 0.9, 250);
  const row = ['CLEAR', 'SIEMENS', 'HEXAGON'];
  const rowX = frontIsLeft ? w * 0.62 : w * 0.38; // partner row sits toward the rear of the pod
  row.forEach((t, i) => drawSmall(ctx, t, rowX + (i - 1) * 260, h * 0.88, 230, 52, i === 0 ? 'italic' : 'bold'));
  return finalizeTexture(canvas);
}

/** Sidepod top: ROKT. */
export function createRoktDecalTexture() {
  const { canvas, ctx } = makeCanvas(1024, 256);
  drawSmall(ctx, 'ROKT', 512, 132, 900, 200, 'heavy');
  return finalizeTexture(canvas);
}

/** Engine cover flank: big red charging bull with yellow outline, yellow sweep toward the airbox. */
export function createEngineCoverDecalTexture({ frontIsLeft = true } = {}) {
  const w = 2048, h = 1024;
  const { canvas, ctx } = makeCanvas(w, h);
  withFacing(ctx, w, !frontIsLeft, () => {
    // (drawn as if the car's front = canvas right)
    ctx.fillStyle = LIVERY.yellow;
    ctx.beginPath();
    ctx.moveTo(w * 0.78, 0); ctx.lineTo(w, 0); ctx.lineTo(w, h * 0.62);
    ctx.quadraticCurveTo(w * 0.9, h * 0.2, w * 0.78, 0);
    ctx.closePath(); ctx.fill();
    drawBull(ctx, w * 0.5, h * 0.55, w * 0.8, h * 0.8, { outline: LIVERY.yellow, keepAspect: true });
  });
  return finalizeTexture(canvas);
}

/** Engine cover top: yellow sun around the airbox base + a red bull each side of the spine. */
export function createEngineTopDecalTexture() {
  const w = 2048, h = 1024;
  const { canvas, ctx } = makeCanvas(w, h);
  // canvas right = car front; canvas vertical = across the car
  ctx.fillStyle = LIVERY.yellow;
  ctx.beginPath(); ctx.ellipse(w * 0.9, h * 0.5, w * 0.12, h * 0.36, 0, 0, Math.PI * 2); ctx.fill();
  drawBull(ctx, w * 0.54, h * 0.27, w * 0.7, h * 0.48, { outline: LIVERY.yellow, keepAspect: true });
  ctx.save(); ctx.translate(0, h); ctx.scale(1, -1);
  drawBull(ctx, w * 0.54, h * 0.27, w * 0.7, h * 0.48, { outline: LIVERY.yellow, keepAspect: true });
  ctx.restore();
  return finalizeTexture(canvas);
}

/**
 * Nose top (reads from the front): yellow tip with red flare, partner stack, number plate.
 * Canvas bottom = nose tip, canvas top = toward the cockpit.
 */
export function createNoseTopDecalTexture() {
  const w = 1024, h = 3072;
  const { canvas, ctx } = makeCanvas(w, h);
  const yEdge = h * 0.6; // yellow zone = front 40 %
  ctx.fillStyle = LIVERY.yellow; ctx.fillRect(0, yEdge, w, h - yEdge);
  // Red flares where yellow meets navy
  ctx.fillStyle = LIVERY.red;
  [[0, 1], [w, -1]].forEach(([x0, d]) => {
    ctx.beginPath();
    ctx.moveTo(x0, yEdge - h * 0.07); ctx.lineTo(x0 + d * w * 0.46, yEdge + h * 0.005); ctx.lineTo(x0, yEdge + h * 0.03);
    ctx.closePath(); ctx.fill();
  });
  // Small mark on the yellow (car maker roundel stand-in)
  ctx.beginPath(); ctx.ellipse(w / 2, h * 0.8, w * 0.17, h * 0.022, 0, 0, Math.PI * 2);
  ctx.fillStyle = LIVERY.mobilBlue; ctx.fill(); ctx.lineWidth = 8; ctx.strokeStyle = LIVERY.white; ctx.stroke();
  drawSmall(ctx, 'Ford', w / 2, h * 0.8, w * 0.26, 70, 'script');
  // Partner stack (front → rear)
  const rows = [
    ['Mobil 1', 'mobil'], ['PIRELLI', 'heavy'], ['neat', 'bold'], ['CARLYLE', 'serif'],
    ['Hard Rock', 'script'], ['AT&T', 'att'], ['Gate', 'gate'], ['VISA', 'visa'],
  ];
  let y = yEdge - h * 0.075;
  rows.forEach(([t, k]) => {
    const rh = 74;
    if (k === 'mobil') drawMobil1(ctx, w / 2, y, w * 0.42, rh);
    else if (k === 'att') drawATT(ctx, w / 2, y, w * 0.42, rh);
    else if (k === 'gate') drawGate(ctx, w / 2, y, w * 0.4, rh);
    else if (k === 'visa') drawVisa(ctx, w / 2, y, w * 0.38, rh * 1.15);
    else drawSmall(ctx, t, w / 2, y, w * 0.44, rh, k);
    y -= rh * 1.55;
  });
  drawTagHeuer(ctx, w / 2, y - 40, w * 0.26, 200);
  drawNumberPlate(ctx, w / 2, y - 330, w * 0.5, 230);
  return finalizeTexture(canvas);
}

/** Nose flank: yellow tip zone, charging bull at the yellow edge, AT&T on the yellow. */
export function createNoseSideDecalTexture({ frontIsLeft = true } = {}) {
  const w = 3072, h = 768;
  const { canvas, ctx } = makeCanvas(w, h);
  withFacing(ctx, w, !frontIsLeft, () => {
    // (drawn as if front = right)
    ctx.fillStyle = LIVERY.yellow;
    ctx.beginPath();
    ctx.moveTo(w * 0.56, 0); ctx.lineTo(w, 0); ctx.lineTo(w, h); ctx.lineTo(w * 0.5, h);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = LIVERY.red;
    ctx.beginPath(); ctx.moveTo(w * 0.53, 0); ctx.lineTo(w * 0.58, 0); ctx.lineTo(w * 0.52, h); ctx.lineTo(w * 0.47, h); ctx.closePath(); ctx.fill();
    // yellow sun disc the bull charges into, then the bull (uniform scale: never squashed)
    ctx.fillStyle = LIVERY.yellow;
    ctx.beginPath(); ctx.arc(w * 0.47, h * 0.42, h * 0.3, 0, Math.PI * 2); ctx.fill();
    drawBull(ctx, w * 0.40, h * 0.5, w * 0.24, h * 0.66, { outline: LIVERY.navyDeep, keepAspect: true });
  });
  drawATT(ctx, frontIsLeft ? w * 0.22 : w * 0.78, h * 0.46, w * 0.2, 150, LIVERY.navyDeep);
  return finalizeTexture(canvas);
}

/** Front wing mainplane: big Red Bull (reads from the front). */
export function createFrontWingRedBullTexture(word = null) {
  if (word) { // one big word per side ('Red' right, 'Bull' left), spread over all three elements (R7, R11, R12)
    const { canvas, ctx } = makeCanvas(2048, 1024);
    fitText(ctx, word, 1024, 530, 1950, 900, s => `900 ${s}px ${HEAVY}`, { fill: LIVERY.red, stroke: LIVERY.white, strokeWidth: 60, spacing: -0.02 });
    return finalizeTexture(canvas);
  }
  const { canvas, ctx } = makeCanvas(2048, 512);
  drawRedBullText(ctx, 1024, 260, 1900, 360);
  return finalizeTexture(canvas);
}

/** Front wing upper flap: VISA. */
export function createVisaDecalTexture() {
  const { canvas, ctx } = makeCanvas(1024, 256);
  drawVisa(ctx, 512, 132, 900, 210);
  return finalizeTexture(canvas);
}

/** Endplates: Mobil 1 (+ optional Player 00 underneath for the rear wing). */
export function createMobilEndplateTexture({ withPlayer = false } = {}) {
  const w = 1024, h = withPlayer ? 768 : 384;
  const { canvas, ctx } = makeCanvas(w, h);
  drawMobil1(ctx, w / 2, 190, w * 0.9, 210);
  if (withPlayer) {
    drawSmall(ctx, 'Player', w * 0.62, h * 0.66, w * 0.5, 80, 'bold');
    drawSmall(ctx, '—00—', w * 0.62, h * 0.79, w * 0.3, 60, 'bold');
  }
  return finalizeTexture(canvas);
}

/** Rear wing upper flap: ORACLE (reads from behind). */
export function createRearWingFlapDecalTexture() {
  const { canvas, ctx } = makeCanvas(2048, 256);
  drawOracle(ctx, 1024, 132, 1900, 190);
  return finalizeTexture(canvas);
}

/** Rear wing main plane: Gate (reads from behind). */
export function createGateDecalTexture() {
  const { canvas, ctx } = makeCanvas(2048, 384);
  drawGate(ctx, 1024, 196, 1800, 300);
  return finalizeTexture(canvas);
}

/** Halo marks. */
export function createHaloMarkTexture(kind) {
  const { canvas, ctx } = makeCanvas(1024, 256);
  if (kind === 'oracle') drawOracle(ctx, 512, 130, 960, 170);
  else if (kind === 'att') drawATT(ctx, 512, 130, 900, 170);
  else if (kind === '1password') drawOnePassword(ctx, 512, 130, 960, 150);
  return finalizeTexture(canvas);
}
export function createTagHeuerDecalTexture() {
  const { canvas, ctx } = makeCanvas(512, 512);
  drawTagHeuer(ctx, 256, 256, 400, 440);
  return finalizeTexture(canvas);
}

/** Ford Racing (RB22 = Red Bull Ford): blue oval + RACING, for the engine cover flank. */
export function createFordRacingTexture() {
  const { canvas, ctx } = makeCanvas(1024, 512);
  ctx.beginPath(); ctx.ellipse(512, 200, 420, 150, 0, 0, Math.PI * 2);
  ctx.fillStyle = LIVERY.mobilBlue; ctx.fill(); ctx.lineWidth = 18; ctx.strokeStyle = LIVERY.white; ctx.stroke();
  drawSmall(ctx, 'Ford', 512, 200, 640, 200, 'script');
  drawSmall(ctx, 'RACING', 512, 440, 700, 90, 'heavy');
  return finalizeTexture(canvas);
}

/** Chassis top ahead of the cockpit: Red Bull (reads from the driver's seat). */
export function createRedBullTextTexture() {
  const { canvas, ctx } = makeCanvas(2048, 512);
  drawRedBullText(ctx, 1024, 260, 1900, 330);
  return finalizeTexture(canvas);
}

/**
 * Pirelli-style tyre sidewall: yellow PIRELLI + P ZERO (medium compound), thin
 * yellow arcs, blue wheel-rim lip at the bead. Square texture centred on the axle,
 * transparent outside the markings so it can be projected onto the sidewall.
 */
export function createTyreSidewallDecalTexture({ rimFrac = 0.62, compound = 'MEDIUM' } = {}) {
  const size = 2048;
  const { canvas, ctx } = makeCanvas(size, size);
  const cx = size / 2, cy = size / 2;
  const R = size / 2;
  const rRim = R * rimFrac;
  const band = R - rRim;
  const col = { SOFT: '#e8202a', MEDIUM: LIVERY.yellow, HARD: '#f2f2f2' }[compound] || LIVERY.yellow;
  const rText = rRim + band * 0.5;

  // Blue rim lip just inside the bead (wheel rim edge) + dark bead seat
  ctx.strokeStyle = '#1d3fbf'; ctx.lineWidth = band * 0.12;
  ctx.beginPath(); ctx.arc(cx, cy, rRim - band * 0.02, 0, Math.PI * 2); ctx.stroke();
  // Thin compound-colour rings
  ctx.strokeStyle = col; ctx.lineWidth = band * 0.025;
  ctx.beginPath(); ctx.arc(cx, cy, rRim + band * 0.12, 0, Math.PI * 2); ctx.stroke();
  ctx.lineWidth = band * 0.02;
  [[-0.5, 0.5], [Math.PI - 0.5, Math.PI + 0.5]].forEach(([a0, a1]) => { ctx.beginPath(); ctx.arc(cx, cy, rRim + band * 0.86, a0, a1); ctx.stroke(); });

  function curvedText(text, radius, centreAngle, px, font, colour, top, spacingK = 0.05) {
    ctx.save();
    ctx.font = font(px); ctx.fillStyle = colour; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const widths = [...text].map(ch => ctx.measureText(ch).width);
    const spacing = px * spacingK;
    const total = widths.reduce((s, v) => s + v + spacing, -spacing);
    let a = top ? centreAngle - (total / radius) / 2 : centreAngle + (total / radius) / 2;
    [...text].forEach((ch, i) => {
      const half = (widths[i] / 2) / radius;
      a += top ? half : -half;
      ctx.save();
      ctx.translate(cx + Math.cos(a) * radius, cy + Math.sin(a) * radius);
      ctx.rotate(top ? a + Math.PI / 2 : a - Math.PI / 2);
      ctx.fillText(ch, 0, 0);
      ctx.restore();
      a += top ? half + spacing / radius : -(half + spacing / radius);
    });
    ctx.restore();
  }
  const heavyIt = s => `italic 900 ${s}px ${HEAVY}`;
  const heavy = s => `900 ${s}px ${HEAVY}`;
  // Big P ZERO top & bottom, PIRELLI left & right — top arcs read clockwise,
  // bottom arcs read left-to-right, so nothing is ever mirrored.
  curvedText('P ZERO', rText, -Math.PI / 2, band * 0.4, heavyIt, col, true, 0.02);
  curvedText('P ZERO', rText, Math.PI / 2, band * 0.4, heavyIt, col, false, 0.02);
  curvedText('PIRELLI', rText, 0, band * 0.26, heavy, col, true, 0.04);
  curvedText('PIRELLI', rText, Math.PI, band * 0.26, heavy, col, true, 0.04);
  curvedText('305/720 R18 · FOR RACE USE ONLY', rRim + band * 0.22, -Math.PI * 0.18, band * 0.065, s => `700 ${s}px ${MONO}`, 'rgba(190,196,204,0.7)', true);
  curvedText('2026 F1 · MEDIUM C3', rRim + band * 0.22, Math.PI * 1.18, band * 0.065, s => `700 ${s}px ${MONO}`, 'rgba(190,196,204,0.7)', true);
  return finalizeTexture(canvas);
}

// ===========================================================================
// 2. LEGACY FACTORIES (old flat quads in CAD modules — stripped at runtime)
// ===========================================================================

// The CAD modules still call these for their old flat quads. They now return a
// tiny transparent placeholder (cheap at load time); livery_decals.js removes the
// quads and replaces them with projected decals using the artwork above.
function legacyPlaceholder() {
  const { canvas } = makeCanvas(4, 4);
  return finalizeTexture(canvas, { legacy: true });
}
export function createPirelliSidewallTexture(isLeft = true) { return legacyPlaceholder(); }
export function createSidepodLiveryTexture(isLeft = true) { return legacyPlaceholder(); }
export function createEngineCoverLiveryTexture(isLeft = true) { return legacyPlaceholder(); }
export function createNoseconeLiveryTexture() { return legacyPlaceholder(); }
export function createRearWingOracleTexture() { return legacyPlaceholder(); }
export function createEndplateTexture(isLeft = true) { return legacyPlaceholder(); }
export function createHaloApexDecalTexture() { return legacyPlaceholder(); }
export function createHaloArmDecalTexture(isLeft = true) { return legacyPlaceholder(); }
export function createCockpitRimDecals(isLeft = true) { return legacyPlaceholder(); }
export function createRearWingEndplateInnerTexture(isLeft = true) { return legacyPlaceholder(); }

// ---------------------------------------------------------------------------
// Data-driven team decals (data/team_liveries.json). One artwork per decal spec.
// Returns { texture, aspect } where aspect = width / height of the artwork.
// ---------------------------------------------------------------------------
const TEAM_FONTS = {
  heavy: (s) => `900 ${s}px ${HEAVY}`,
  sans: (s) => `700 ${s}px ${SANS}`,
  serif: (s) => `700 ${s}px Georgia, "Times New Roman", "Liberation Serif", serif`,
};

/* --- Authentic 2026 Team Logo & Sponsor Art Drawing Primitives --- */

function drawFerrariShield(ctx, cx, cy, w, h) {
  ctx.save();
  ctx.translate(cx, cy);
  const hw = w / 2, hh = h / 2;
  const shield = () => {
    ctx.beginPath();
    ctx.moveTo(-hw, -hh + w * 0.1);
    ctx.quadraticCurveTo(-hw, -hh, -hw + w * 0.1, -hh);
    ctx.lineTo(hw - w * 0.1, -hh);
    ctx.quadraticCurveTo(hw, -hh, hw, -hh + w * 0.1);
    ctx.lineTo(hw, hh * 0.25);
    ctx.bezierCurveTo(hw, hh * 0.65, hw * 0.45, hh * 0.9, 0, hh);
    ctx.bezierCurveTo(-hw * 0.45, hh * 0.9, -hw, hh * 0.65, -hw, hh * 0.25);
    ctx.closePath();
  };

  shield();
  ctx.fillStyle = '#FFE500'; // Giallo Modena yellow canary
  ctx.fill();

  // Italian Flag at top (Green, White, Red vertical bands)
  ctx.save();
  shield();
  ctx.clip();
  const topH = h * 0.14;
  ctx.fillStyle = '#009246';
  ctx.fillRect(-hw, -hh, w / 3, topH);
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(-hw + w / 3, -hh, w / 3, topH);
  ctx.fillStyle = '#CE2B37';
  ctx.fillRect(-hw + 2 * w / 3, -hh, w / 3, topH);
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = Math.max(1, w * 0.015);
  ctx.beginPath();
  ctx.moveTo(-hw, -hh + topH);
  ctx.lineTo(hw, -hh + topH);
  ctx.stroke();
  ctx.restore();

  // Prancing Horse (Cavallino Rampante) in silhouette black
  ctx.save();
  ctx.translate(0, -hh * 0.04);
  const sc = Math.min(w * 0.55 / 100, h * 0.55 / 130);
  ctx.scale(sc, sc);
  ctx.fillStyle = '#000000';
  ctx.beginPath();
  ctx.moveTo(8, -55);
  ctx.lineTo(12, -68); ctx.lineTo(9, -65); ctx.lineTo(5, -67); ctx.lineTo(4, -58);
  ctx.bezierCurveTo(-8, -50, -22, -35, -20, -10);
  ctx.lineTo(-24, -20); ctx.lineTo(-20, -10);
  ctx.lineTo(-27, -5); ctx.lineTo(-21, 5);
  ctx.bezierCurveTo(-22, 18, -25, 30, -18, 42);
  ctx.bezierCurveTo(-28, 30, -38, 12, -35, -5);
  ctx.bezierCurveTo(-32, -18, -42, -10, -42, 5);
  ctx.bezierCurveTo(-42, 28, -26, 52, -16, 55);
  ctx.lineTo(-20, 68); ctx.lineTo(-14, 70); ctx.lineTo(-11, 62); ctx.lineTo(-8, 52);
  ctx.lineTo(-4, 66); ctx.lineTo(2, 68); ctx.lineTo(1, 58);
  ctx.bezierCurveTo(4, 46, 5, 32, 2, 22);
  ctx.bezierCurveTo(8, 15, 12, 5, 15, -8);
  ctx.lineTo(28, 2); ctx.lineTo(34, -2); ctx.lineTo(24, -14);
  ctx.lineTo(36, -24); ctx.lineTo(42, -30); ctx.lineTo(36, -34); ctx.lineTo(22, -22);
  ctx.lineTo(16, -25);
  ctx.bezierCurveTo(18, -38, 22, -48, 16, -54);
  ctx.lineTo(22, -58);
  ctx.bezierCurveTo(20, -63, 14, -60, 8, -55);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // "S" and "F" (Scuderia Ferrari) in black
  ctx.fillStyle = '#000000';
  ctx.font = `900 ${Math.round(h * 0.16)}px "Times New Roman", Georgia, serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('S', -hw * 0.45, hh * 0.65);
  ctx.fillText('F', hw * 0.45, hh * 0.65);

  // Black shield border
  shield();
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = Math.max(1.5, w * 0.04);
  ctx.stroke();

  ctx.restore();
}

function drawHpLogo(ctx, cx, cy, size) {
  ctx.save();
  ctx.translate(cx, cy);
  const r = size / 2;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fillStyle = '#0096D6'; // Official HP Blue
  ctx.fill();

  ctx.rotate(-13 * Math.PI / 180);
  ctx.fillStyle = '#FFFFFF';
  const barW = size * 0.11;
  const barR = barW / 2;
  ctx.beginPath();
  ctx.roundRect(-size * 0.25, -size * 0.46, barW, size * 0.82, barR);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(-size * 0.11, -size * 0.04, size * 0.16, -Math.PI * 0.5, Math.PI * 0.5);
  ctx.lineTo(-size * 0.11, size * 0.12);
  ctx.arc(-size * 0.11, -size * 0.04, size * 0.16 - barW, Math.PI * 0.5, -Math.PI * 0.5, true);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.roundRect(size * 0.03, -size * 0.22, barW, size * 0.68, barR);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(size * 0.17, -size * 0.04, size * 0.16, -Math.PI * 0.5, Math.PI * 0.5);
  ctx.lineTo(size * 0.17, size * 0.12);
  ctx.arc(size * 0.17, -size * 0.04, size * 0.16 - barW, Math.PI * 0.5, -Math.PI * 0.5, true);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawShellLogo(ctx, cx, cy, size) {
  ctx.save();
  ctx.translate(cx, cy);
  const sc = size / 100;
  ctx.scale(sc, sc);

  ctx.fillStyle = '#D4001F';
  ctx.beginPath();
  ctx.moveTo(-22, 44); ctx.lineTo(22, 44); ctx.lineTo(26, 38); ctx.lineTo(-26, 38);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(-22, 38);
  ctx.quadraticCurveTo(-46, 28, -48, 8);
  ctx.quadraticCurveTo(-48, -12, -36, -28);
  const angles = [-0.75, -0.5, -0.25, 0, 0.25, 0.5, 0.75];
  angles.forEach((a, i) => {
    const r = 46;
    const px = Math.sin(a * Math.PI * 0.5) * r;
    const py = -Math.cos(a * Math.PI * 0.5) * r + 5;
    if (i === 0) ctx.lineTo(px, py);
    else ctx.quadraticCurveTo(px * 0.9, py * 0.9, px, py);
  });
  ctx.quadraticCurveTo(48, -12, 48, 8);
  ctx.quadraticCurveTo(46, 28, 22, 38);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#FFD500';
  angles.forEach((a) => {
    ctx.save();
    ctx.rotate(a * 0.42);
    ctx.beginPath();
    ctx.moveTo(-3, 34); ctx.lineTo(3, 34); ctx.lineTo(5.5, -34);
    ctx.quadraticCurveTo(0, -39, -5.5, -34);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  });
  ctx.restore();
}

function drawItalianTricolore(ctx, cx, cy, w, h) {
  ctx.save();
  ctx.translate(cx, cy);
  const segW = w / 3;
  ctx.fillStyle = '#009246'; ctx.fillRect(-w / 2, -h / 2, segW, h);
  ctx.fillStyle = '#FFFFFF'; ctx.fillRect(-w / 2 + segW, -h / 2, segW, h);
  ctx.fillStyle = '#CE2B37'; ctx.fillRect(-w / 2 + 2 * segW, -h / 2, segW, h);
  ctx.restore();
}

function drawMclarenSpeedmark(ctx, cx, cy, w, h, { color = '#47C7FC', frontIsLeft = true } = {}) {
  ctx.save();
  ctx.translate(cx, cy);
  if (!frontIsLeft) ctx.scale(-1, 1);
  const sc = Math.min(w / 100, h / 45);
  ctx.scale(sc, sc);

  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(-45, -18);
  ctx.bezierCurveTo(-15, -24, 25, -20, 48, -8);
  ctx.bezierCurveTo(32, -4, 10, -2, -15, -3);
  ctx.bezierCurveTo(-38, -4, -48, 5, -45, 18);
  ctx.bezierCurveTo(-52, 6, -48, -12, -45, -18);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawMastercard(ctx, cx, cy, w, h) {
  ctx.save();
  ctx.translate(cx, cy);
  const r = h * 0.45;
  const d = r * 0.65;

  ctx.fillStyle = '#EB001B';
  ctx.beginPath(); ctx.arc(-d, 0, r, 0, Math.PI * 2); ctx.fill();

  ctx.fillStyle = '#F79E1B';
  ctx.beginPath(); ctx.arc(d, 0, r, 0, Math.PI * 2); ctx.fill();

  ctx.save();
  ctx.beginPath(); ctx.arc(-d, 0, r, 0, Math.PI * 2); ctx.clip();
  ctx.fillStyle = '#FF5F00';
  ctx.beginPath(); ctx.arc(d, 0, r, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  ctx.restore();
}

function drawGoogleChrome(ctx, cx, cy, size) {
  ctx.save();
  ctx.translate(cx, cy);
  const r = size / 2, rInner = r * 0.42;

  ctx.fillStyle = '#EA4335';
  ctx.beginPath();
  ctx.arc(0, 0, r, -Math.PI * 0.5, Math.PI * 0.17);
  ctx.lineTo(Math.cos(Math.PI * 0.17) * rInner, Math.sin(Math.PI * 0.17) * rInner);
  ctx.arc(0, 0, rInner, Math.PI * 0.17, -Math.PI * 0.5, true);
  ctx.closePath(); ctx.fill();

  ctx.fillStyle = '#34A853';
  ctx.beginPath();
  ctx.arc(0, 0, r, Math.PI * 0.17, Math.PI * 0.83);
  ctx.lineTo(Math.cos(Math.PI * 0.83) * rInner, Math.sin(Math.PI * 0.83) * rInner);
  ctx.arc(0, 0, rInner, Math.PI * 0.83, Math.PI * 0.17, true);
  ctx.closePath(); ctx.fill();

  ctx.fillStyle = '#FBBC05';
  ctx.beginPath();
  ctx.arc(0, 0, r, Math.PI * 0.83, Math.PI * 1.5);
  ctx.lineTo(Math.cos(Math.PI * 1.5) * rInner, Math.sin(Math.PI * 1.5) * rInner);
  ctx.arc(0, 0, rInner, Math.PI * 1.5, Math.PI * 0.83, true);
  ctx.closePath(); ctx.fill();

  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath(); ctx.arc(0, 0, rInner + size * 0.04, 0, Math.PI * 2); ctx.fill();

  ctx.fillStyle = '#4285F4';
  ctx.beginPath(); ctx.arc(0, 0, rInner, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function drawAndroidBug(ctx, cx, cy, size) {
  ctx.save();
  ctx.translate(cx, cy);
  const r = size * 0.42;
  ctx.fillStyle = '#3DDC84';
  ctx.beginPath(); ctx.arc(0, r * 0.2, r, Math.PI, 0); ctx.closePath(); ctx.fill();

  ctx.lineWidth = size * 0.06; ctx.lineCap = 'round'; ctx.strokeStyle = '#3DDC84';
  ctx.beginPath();
  ctx.moveTo(-r * 0.5, -r * 0.5); ctx.lineTo(-r * 0.8, -r * 0.95);
  ctx.moveTo(r * 0.5, -r * 0.5); ctx.lineTo(r * 0.8, -r * 0.95);
  ctx.stroke();

  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.arc(-r * 0.42, -r * 0.35, size * 0.05, 0, Math.PI * 2);
  ctx.arc(r * 0.42, -r * 0.35, size * 0.05, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawMercedesStar(ctx, cx, cy, size, { embossed = true } = {}) {
  ctx.save();
  ctx.translate(cx, cy);
  const r = size / 2;

  ctx.strokeStyle = '#E0E6ED';
  ctx.lineWidth = size * 0.06;
  ctx.beginPath(); ctx.arc(0, 0, r - size * 0.03, 0, Math.PI * 2); ctx.stroke();

  const rTip = r * 0.92;
  const angles = [-Math.PI / 2, Math.PI / 6, 5 * Math.PI / 6];
  angles.forEach((a) => {
    const tipX = Math.cos(a) * rTip, tipY = Math.sin(a) * rTip;
    const midL = a - Math.PI / 3, midR = a + Math.PI / 3;
    const baseW = size * 0.08;
    const baseLX = Math.cos(midL) * baseW, baseLY = Math.sin(midL) * baseW;
    const baseRX = Math.cos(midR) * baseW, baseRY = Math.sin(midR) * baseW;

    if (embossed) {
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(baseLX, baseLY); ctx.lineTo(tipX, tipY); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#A0AAB5';
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(tipX, tipY); ctx.lineTo(baseRX, baseRY); ctx.closePath(); ctx.fill();
    } else {
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath(); ctx.moveTo(baseLX, baseLY); ctx.lineTo(tipX, tipY); ctx.lineTo(baseRX, baseRY); ctx.closePath(); ctx.fill();
    }
  });
  ctx.restore();
}

function drawMercedesStarfield(ctx, cx, cy, w, h, { frontIsLeft = true } = {}) {
  ctx.save();
  ctx.translate(cx, cy);
  const cols = 8, rows = 4;
  for (let c = 0; c < cols; c++) {
    const fx = c / (cols - 1);
    const alpha = frontIsLeft ? (1.0 - fx * 0.8) : (0.2 + fx * 0.8);
    const starSz = (h / rows) * (0.35 + alpha * 0.35);
    for (let r = 0; r < rows; r++) {
      const stagger = (r % 2 === 1) ? (w / cols) * 0.5 : 0;
      const x = -w / 2 + c * (w / cols) + stagger;
      const y = -h / 2 + (r + 0.5) * (h / rows);
      if (x < w / 2 - 10) {
        ctx.globalAlpha = Math.max(0.12, alpha);
        drawMercedesStar(ctx, x, y, starSz, { embossed: false });
      }
    }
  }
  ctx.restore();
}

function drawPetronasSwoosh(ctx, cx, cy, w, h, { frontIsLeft = true } = {}) {
  ctx.save();
  ctx.translate(cx, cy);
  if (!frontIsLeft) ctx.scale(-1, 1);

  const g = ctx.createLinearGradient(-w / 2, 0, w / 2, 0);
  g.addColorStop(0, '#00D2BE');
  g.addColorStop(0.7, '#00D2BE');
  g.addColorStop(1, '#00D2BE00');

  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(-w / 2, h * 0.2);
  ctx.bezierCurveTo(-w * 0.1, h * 0.2, w * 0.2, -h * 0.3, w / 2, -h * 0.4);
  ctx.lineTo(w / 2, -h * 0.1);
  ctx.bezierCurveTo(w * 0.2, 0, -w * 0.1, h * 0.45, -w / 2, h * 0.45);
  ctx.closePath(); ctx.fill();

  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = Math.max(2, h * 0.08);
  ctx.beginPath();
  ctx.moveTo(-w / 2, h * 0.22);
  ctx.bezierCurveTo(-w * 0.1, h * 0.22, w * 0.2, -h * 0.28, w / 2, -h * 0.38);
  ctx.stroke();
  ctx.restore();
}

function drawAmgBadge(ctx, cx, cy, w, h) {
  ctx.save();
  ctx.translate(cx, cy);
  const slashW = h * 0.18, slashGap = h * 0.12;
  const startX = -w / 2;
  for (let i = 0; i < 5; i++) {
    const x = startX + i * (slashW + slashGap);
    ctx.fillStyle = `rgb(${150 + i * 22}, ${150 + i * 22}, ${160 + i * 20})`;
    ctx.beginPath();
    ctx.moveTo(x + h * 0.25, -h * 0.4); ctx.lineTo(x + h * 0.25 + slashW, -h * 0.4);
    ctx.lineTo(x + slashW, h * 0.4); ctx.lineTo(x, h * 0.4);
    ctx.closePath(); ctx.fill();
  }
  const textX = startX + 5 * (slashW + slashGap) + h * 0.1;
  fitText(ctx, 'AMG', (textX + w / 2) / 2, 0, w - (textX - startX), h * 0.85, s => `italic 900 ${s}px ${HEAVY}`, { fill: '#FFFFFF' });
  ctx.restore();
}

function drawIneosCrown(ctx, cx, cy, w, h) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.fillStyle = '#D8102C'; // Ineos Dark Crimson
  ctx.beginPath();
  ctx.roundRect(-w / 2, -h / 2, w, h, h * 0.15);
  ctx.fill();
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = Math.max(1.5, h * 0.04);
  ctx.stroke();
  fitText(ctx, 'INEOS', 0, 0, w * 0.85, h * 0.72, s => `900 ${s}px ${HEAVY}`, { fill: '#FFFFFF', spacing: 0.06 });
  ctx.restore();
}

function drawAstonWings(ctx, cx, cy, w, h) {
  ctx.save();
  ctx.translate(cx, cy);
  const sc = Math.min(w / 140, h / 35);
  ctx.scale(sc, sc);

  ctx.fillStyle = '#FFFFFF';
  ctx.strokeStyle = '#A8B4C0';
  ctx.lineWidth = 1.2;

  ctx.beginPath();
  ctx.moveTo(-15, -4); ctx.lineTo(-65, -8); ctx.quadraticCurveTo(-68, -4, -62, 4); ctx.lineTo(-15, 6);
  ctx.closePath(); ctx.fill(); ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(15, -4); ctx.lineTo(65, -8); ctx.quadraticCurveTo(68, -4, 62, 4); ctx.lineTo(15, 6);
  ctx.closePath(); ctx.fill(); ctx.stroke();

  ctx.beginPath();
  [-50, -35, -22, 22, 35, 50].forEach(x => { ctx.moveTo(x, -6); ctx.lineTo(x * 0.95, 5); });
  ctx.stroke();

  ctx.fillStyle = '#00594F';
  ctx.beginPath(); ctx.roundRect(-22, -9, 44, 18, 3); ctx.fill();
  ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 1; ctx.stroke();

  fitText(ctx, 'ASTON MARTIN', 0, 0, 38, 7.5, s => `700 ${s}px ${SANS}`, { fill: '#FFFFFF', spacing: 0.08 });
  ctx.restore();
}

function drawAramcoWave(ctx, cx, cy, w, h) {
  ctx.save();
  ctx.translate(cx, cy);
  const iconSz = h * 0.75;
  const left = -w / 2;

  ctx.lineWidth = iconSz * 0.22; ctx.lineCap = 'round';
  ctx.strokeStyle = '#00A3E0';
  ctx.beginPath(); ctx.arc(left + iconSz * 0.5, -iconSz * 0.1, iconSz * 0.35, Math.PI * 0.8, Math.PI * 1.95); ctx.stroke();
  ctx.strokeStyle = '#00843D';
  ctx.beginPath(); ctx.arc(left + iconSz * 0.5, iconSz * 0.1, iconSz * 0.35, -Math.PI * 0.2, Math.PI * 0.95); ctx.stroke();

  const tw = w - iconSz * 1.25;
  fitText(ctx, 'aramco', left + iconSz * 1.2 + tw / 2, 0, tw, h * 0.75, s => `700 ${s}px ${SANS}`, { fill: '#FFFFFF', spacing: 0.02 });
  ctx.restore();
}

function drawHondaHrc(ctx, cx, cy, w, h) {
  ctx.save();
  ctx.translate(cx, cy);
  fitText(ctx, 'HONDA', 0, -h * 0.22, w * 0.88, h * 0.48, s => `900 ${s}px ${HEAVY}`, { fill: '#E60215' });
  fitText(ctx, 'HRC', 0, h * 0.25, w * 0.5, h * 0.4, s => `italic 900 ${s}px ${HEAVY}`, { fill: '#00519E' });
  ctx.restore();
}

function drawWilliamsW(ctx, cx, cy, w, h) {
  ctx.save();
  ctx.translate(cx, cy);
  const sc = Math.min(w / 80, h / 60);
  ctx.scale(sc, sc);

  ctx.fillStyle = '#00A0DE';
  ctx.beginPath(); ctx.moveTo(-36, -26); ctx.lineTo(-20, -26); ctx.lineTo(-6, 26); ctx.lineTo(-22, 26); ctx.closePath(); ctx.fill();

  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath(); ctx.moveTo(-16, -26); ctx.lineTo(-2, -26); ctx.lineTo(12, 26); ctx.lineTo(-2, 26); ctx.closePath(); ctx.fill();

  ctx.fillStyle = '#00A0DE';
  ctx.beginPath(); ctx.moveTo(4, -26); ctx.lineTo(18, -26); ctx.lineTo(32, 26); ctx.lineTo(18, 26); ctx.closePath(); ctx.fill();
  ctx.restore();
}

function drawDuracellAirbox(ctx, cx, cy, w, h) {
  ctx.save();
  ctx.translate(cx, cy);
  const copperH = h * 0.38;

  const g = ctx.createLinearGradient(0, -h / 2, 0, -h / 2 + copperH);
  g.addColorStop(0, '#E8984E'); g.addColorStop(0.5, '#C87538'); g.addColorStop(1, '#9C5422');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.roundRect(-w / 2, -h / 2, w, copperH, [6, 6, 0, 0]); ctx.fill();

  ctx.fillStyle = '#111215';
  ctx.fillRect(-w / 2, -h / 2 + copperH, w, h - copperH);

  fitText(ctx, 'DURACELL', 0, -h / 2 + copperH + (h - copperH) * 0.5, w * 0.88, (h - copperH) * 0.65, s => `900 ${s}px ${HEAVY}`, { fill: '#FFFFFF', spacing: 0.05 });
  ctx.restore();
}

function drawAtlassian(ctx, cx, cy, w, h) {
  ctx.save();
  ctx.translate(cx, cy);
  const sc = Math.min(w / 60, h / 60);
  ctx.scale(sc, sc);
  ctx.fillStyle = '#0052CC';
  ctx.beginPath(); ctx.moveTo(-18, 22); ctx.quadraticCurveTo(-18, -12, -4, -22); ctx.quadraticCurveTo(-12, 5, 2, 22); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(18, -22); ctx.quadraticCurveTo(18, 12, 4, 22); ctx.quadraticCurveTo(12, -5, -2, -22); ctx.closePath(); ctx.fill();
  ctx.restore();
}

function drawGulf(ctx, cx, cy, size) {
  ctx.save();
  ctx.translate(cx, cy);
  const r = size / 2;
  ctx.fillStyle = '#FF7300';
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();

  ctx.strokeStyle = '#002B49';
  ctx.lineWidth = size * 0.08; ctx.stroke();

  fitText(ctx, 'Gulf', 0, size * 0.02, size * 0.72, size * 0.42, s => `900 ${s}px ${HEAVY}`, { fill: '#FFFFFF' });
  ctx.restore();
}

function drawVcarbBull(ctx, cx, cy, w, h, { frontIsLeft = true } = {}) {
  withFacing(ctx, w, frontIsLeft, () => {
    drawBull(ctx, cx, cy, w, h, { fill: '#E0E6ED', horn: '#FFFFFF', outline: '#FFFFFF', keepAspect: true });
  });
}

function drawCashApp(ctx, cx, cy, size) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.fillStyle = '#00D632';
  ctx.beginPath(); ctx.roundRect(-size / 2, -size / 2, size, size, size * 0.22); ctx.fill();

  ctx.rotate(-12 * Math.PI / 180);
  fitText(ctx, '$', 0, size * 0.02, size * 0.7, size * 0.75, s => `900 ${s}px ${HEAVY}`, { fill: '#FFFFFF' });
  ctx.restore();
}

function drawVcarbStripes(ctx, cx, cy, w, h, { frontIsLeft = true } = {}) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(-w / 2, -h * 0.15, w, h * 0.3);
  ctx.fillStyle = '#FF1801';
  ctx.fillRect(-w / 2, -h * 0.3, w, h * 0.1);
  ctx.fillRect(-w / 2, h * 0.2, w, h * 0.1);
  ctx.restore();
}

function drawAudiRings(ctx, cx, cy, w, h, color = '#FFFFFF') {
  ctx.save();
  ctx.translate(cx, cy);
  const r = h * 0.42;
  const spacing = r * 1.55;
  const startX = -spacing * 1.5;

  ctx.strokeStyle = color;
  ctx.lineWidth = h * 0.11;
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.arc(startX + i * spacing, 0, r, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

function drawAudiSport(ctx, cx, cy, w, h) {
  ctx.save();
  ctx.translate(cx, cy);
  const rw = h * 0.95;
  ctx.fillStyle = '#FF1801';
  ctx.beginPath();
  ctx.moveTo(-w / 2 + rw * 0.35, -h * 0.45);
  ctx.lineTo(-w / 2 + rw, -h * 0.45);
  ctx.lineTo(-w / 2 + rw * 0.65, h * 0.45);
  ctx.lineTo(-w / 2, h * 0.45);
  ctx.closePath(); ctx.fill();

  const tw = w - rw * 1.2;
  fitText(ctx, 'Audi Sport', -w / 2 + rw * 1.2 + tw / 2, 0, tw, h * 0.75, s => `900 ${s}px ${HEAVY}`, { fill: '#FFFFFF', spacing: 0.02 });
  ctx.restore();
}

function drawRevolut(ctx, cx, cy, w, h) {
  ctx.save();
  ctx.translate(cx, cy);
  const sz = h * 0.85;
  const left = -w / 2;
  fitText(ctx, 'R', left + sz * 0.35, 0, sz * 0.7, sz, s => `900 ${s}px ${HEAVY}`, { fill: '#FFFFFF' });
  const tw = w - sz * 0.9;
  fitText(ctx, 'Revolut', left + sz * 0.8 + tw / 2, 0, tw, h * 0.75, s => `700 ${s}px ${SANS}`, { fill: '#FFFFFF' });
  ctx.restore();
}

function drawAudiChevron(ctx, cx, cy, w, h, { frontIsLeft = true } = {}) {
  ctx.save();
  ctx.translate(cx, cy);
  if (!frontIsLeft) ctx.scale(-1, 1);
  ctx.fillStyle = '#FF1801';
  ctx.beginPath();
  ctx.moveTo(-w / 2, -h / 2); ctx.lineTo(0, -h / 2); ctx.lineTo(w / 2, h / 2); ctx.lineTo(0, h / 2);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#F0F2F5';
  ctx.beginPath();
  ctx.moveTo(-w / 2 + w * 0.15, -h / 2); ctx.lineTo(-w / 2 + w * 0.28, -h / 2); ctx.lineTo(w * 0.28, h / 2); ctx.lineTo(w * 0.15, h / 2);
  ctx.closePath(); ctx.fill();
  ctx.restore();
}

function drawTgr(ctx, cx, cy, w, h) {
  ctx.save();
  ctx.translate(cx, cy);
  const sz = h * 0.9;
  const left = -w / 2;

  ctx.fillStyle = '#E6002B';
  ctx.beginPath();
  ctx.arc(left + sz * 0.4, 0, sz * 0.45, Math.PI * 0.25, Math.PI * 1.75);
  ctx.lineTo(left + sz * 0.4, 0); ctx.lineTo(left + sz * 0.65, 0);
  ctx.arc(left + sz * 0.4, 0, sz * 0.22, 0, Math.PI * 1.75, true);
  ctx.closePath(); ctx.fill();

  ctx.fillStyle = '#FFFFFF';
  fitText(ctx, 'R', left + sz * 0.85, 0, sz * 0.55, sz * 0.9, s => `900 ${s}px ${HEAVY}`, { fill: '#FFFFFF' });

  const tw = w - sz * 1.35;
  fitText(ctx, 'TOYOTA GAZOO', left + sz * 1.35 + tw / 2, -h * 0.2, tw, h * 0.38, s => `900 ${s}px ${HEAVY}`, { fill: '#FFFFFF' });
  fitText(ctx, 'Racing', left + sz * 1.35 + tw / 2, h * 0.25, tw, h * 0.35, s => `700 ${s}px ${SANS}`, { fill: '#E6002B' });
  ctx.restore();
}

function drawHaasH(ctx, cx, cy, size) {
  ctx.save();
  ctx.translate(cx, cy);
  const r = size / 2;
  ctx.fillStyle = '#E6002B';
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();

  ctx.fillStyle = '#FFFFFF';
  const barW = size * 0.16, barH = size * 0.65;
  ctx.fillRect(-size * 0.28, -barH / 2, barW, barH);
  ctx.fillRect(size * 0.12, -barH / 2, barW, barH);
  ctx.fillRect(-size * 0.28, -size * 0.08, size * 0.56, size * 0.16);
  ctx.restore();
}

function drawMoneyGram(ctx, cx, cy, w, h) {
  ctx.save();
  ctx.translate(cx, cy);
  const r = h * 0.42;
  const left = -w / 2 + r;

  ctx.fillStyle = '#E6002B';
  ctx.beginPath(); ctx.arc(left, 0, r, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = r * 0.22;
  ctx.beginPath(); ctx.arc(left, 0, r * 0.55, -Math.PI * 0.3, Math.PI * 0.8); ctx.stroke();

  const tw = w - r * 2.4;
  fitText(ctx, 'MoneyGram', left + r * 1.4 + tw / 2, 0, tw, h * 0.72, s => `700 ${s}px ${SANS}`, { fill: '#FFFFFF' });
  ctx.restore();
}

function drawAlpineArrow(ctx, cx, cy, w, h, { color = '#FFFFFF', frontIsLeft = true } = {}) {
  ctx.save();
  ctx.translate(cx, cy);
  if (!frontIsLeft) ctx.scale(-1, 1);
  const sc = Math.min(w / 80, h / 70);
  ctx.scale(sc, sc);

  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, -32); ctx.lineTo(8, -32); ctx.lineTo(24, 32); ctx.lineTo(10, 32);
  ctx.lineTo(5, 12); ctx.lineTo(-24, 12); ctx.lineTo(-30, 32); ctx.lineTo(-44, 32);
  ctx.closePath(); ctx.fill();

  ctx.beginPath();
  ctx.moveTo(5, 12); ctx.lineTo(38, 12); ctx.lineTo(30, 2); ctx.lineTo(44, 12); ctx.lineTo(30, 22); ctx.lineTo(38, 12);
  ctx.closePath(); ctx.fill();

  ctx.fillStyle = '#0078D0';
  ctx.beginPath(); ctx.moveTo(3, -12); ctx.lineTo(-18, 0); ctx.lineTo(0, 0); ctx.closePath(); ctx.fill();
  ctx.restore();
}

function drawBwtWave(ctx, cx, cy, w, h) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.fillStyle = '#FD4BC7';
  ctx.beginPath(); ctx.roundRect(-w / 2, -h / 2, w, h, h * 0.2); ctx.fill();
  fitText(ctx, 'BWT', 0, -h * 0.05, w * 0.85, h * 0.72, s => `900 ${s}px ${HEAVY}`, { fill: '#FFFFFF', spacing: 0.06 });
  ctx.fillStyle = '#00D2BE';
  ctx.beginPath(); ctx.arc(-w * 0.28, h * 0.18, h * 0.1, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function drawRenaultEtech(ctx, cx, cy, size) {
  ctx.save();
  ctx.translate(cx, cy);
  const r = size * 0.44;
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.moveTo(0, -r); ctx.lineTo(r * 0.65, 0); ctx.lineTo(0, r); ctx.lineTo(-r * 0.65, 0);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#0078D0';
  ctx.beginPath();
  ctx.moveTo(0, -r * 0.6); ctx.lineTo(r * 0.38, 0); ctx.lineTo(0, r * 0.6); ctx.lineTo(-r * 0.38, 0);
  ctx.closePath(); ctx.fill();
  ctx.restore();
}

function drawCadillacCrest(ctx, cx, cy, w, h) {
  ctx.save();
  ctx.translate(cx, cy);
  const sc = Math.min(w / 100, h / 45);
  ctx.scale(sc, sc);

  ctx.fillStyle = '#C0C8D0';
  ctx.beginPath();
  ctx.moveTo(-22, -6); ctx.lineTo(-48, -4); ctx.lineTo(-44, 4); ctx.lineTo(-20, 6); ctx.closePath(); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(22, -6); ctx.lineTo(48, -4); ctx.lineTo(44, 4); ctx.lineTo(20, 6); ctx.closePath(); ctx.fill();

  const shield = () => {
    ctx.beginPath();
    ctx.moveTo(-16, -14); ctx.lineTo(16, -14); ctx.lineTo(16, 4); ctx.lineTo(0, 18); ctx.lineTo(-16, 4);
    ctx.closePath();
  };

  shield(); ctx.fillStyle = '#D4AF37'; ctx.fill();

  ctx.save();
  shield(); ctx.clip();
  ctx.fillStyle = '#D8102C'; ctx.fillRect(-14, -12, 14, 12);
  ctx.fillStyle = '#1A1C20'; ctx.fillRect(0, -12, 14, 12);
  ctx.fillStyle = '#0052CC'; ctx.fillRect(-14, 0, 14, 16);
  ctx.fillStyle = '#D4AF37'; ctx.fillRect(0, 0, 14, 16);
  ctx.restore();

  shield(); ctx.strokeStyle = '#D4AF37'; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.restore();
}

export function createTeamDecalTexture(spec, { frontIsLeft = true } = {}) {
  if (spec.kind === 'panel') {
    // Solid paint panel. Shapes are described relative to the car: 'diagRear' leans back toward the
    // tail, 'fadeRear' fades out toward the tail, 'fadeFront' fades out toward the nose.
    const W = 1024, H = 512;
    const { canvas, ctx } = makeCanvas(W, H);
    const fwd = frontIsLeft ? 1 : -1;
    const shape = spec.shape || 'rect';
    if (shape === 'fadeRear' || shape === 'fadeFront') {
      const noseLeft = fwd > 0;
      const solidLeft = shape === 'fadeRear' ? noseLeft : !noseLeft;
      const g = solidLeft ? ctx.createLinearGradient(0, 0, W, 0) : ctx.createLinearGradient(W, 0, 0, 0);
      g.addColorStop(0, spec.color); g.addColorStop(0.55, spec.color); g.addColorStop(1, spec.color + '00');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
    } else {
      ctx.fillStyle = spec.color;
      ctx.beginPath();
      if (shape === 'diagRear') {
        const k = W * 0.18;
        if (fwd > 0) { ctx.moveTo(k, 0); ctx.lineTo(W, 0); ctx.lineTo(W - k, H); ctx.lineTo(0, H); }
        else { ctx.moveTo(0, 0); ctx.lineTo(W - k, 0); ctx.lineTo(W, H); ctx.lineTo(k, H); }
      } else ctx.rect(0, 0, W, H);
      ctx.closePath(); ctx.fill();
    }
    return { texture: finalizeTexture(canvas), aspect: null };
  }

  // --- Authentic Team Art Emblems ---
  if (spec.kind === 'art') {
    if (spec.art === 'ferrariShield') {
      const W = 512, H = 640;
      const { canvas, ctx } = makeCanvas(W, H);
      drawFerrariShield(ctx, W / 2, H / 2, W * 0.94, H * 0.94);
      return { texture: finalizeTexture(canvas), aspect: W / H };
    }
    if (spec.art === 'hpLogo') {
      const W = 512, H = 512;
      const { canvas, ctx } = makeCanvas(W, H);
      drawHpLogo(ctx, W / 2, H / 2, W * 0.92);
      return { texture: finalizeTexture(canvas), aspect: 1 };
    }
    if (spec.art === 'shellLogo') {
      const W = 512, H = 512;
      const { canvas, ctx } = makeCanvas(W, H);
      drawShellLogo(ctx, W / 2, H / 2, W * 0.92);
      return { texture: finalizeTexture(canvas), aspect: 1 };
    }
    if (spec.art === 'italianTricolore') {
      const W = 1024, H = 256;
      const { canvas, ctx } = makeCanvas(W, H);
      drawItalianTricolore(ctx, W / 2, H / 2, W, H);
      return { texture: finalizeTexture(canvas), aspect: W / H };
    }
    if (spec.art === 'mclarenSpeedmark') {
      const W = 1024, H = 400;
      const { canvas, ctx } = makeCanvas(W, H);
      drawMclarenSpeedmark(ctx, W / 2, H / 2, W * 0.94, H * 0.90, { color: spec.color || '#47C7FC', frontIsLeft });
      return { texture: finalizeTexture(canvas), aspect: W / H };
    }
    if (spec.art === 'mastercard') {
      const W = 1024, H = 640;
      const { canvas, ctx } = makeCanvas(W, H);
      drawMastercard(ctx, W / 2, H / 2, W * 0.94, H * 0.94);
      return { texture: finalizeTexture(canvas), aspect: W / H };
    }
    if (spec.art === 'googleChrome') {
      const W = 512, H = 512;
      const { canvas, ctx } = makeCanvas(W, H);
      drawGoogleChrome(ctx, W / 2, H / 2, W * 0.92);
      return { texture: finalizeTexture(canvas), aspect: 1 };
    }
    if (spec.art === 'androidBug') {
      const W = 512, H = 512;
      const { canvas, ctx } = makeCanvas(W, H);
      drawAndroidBug(ctx, W / 2, H / 2, W * 0.92);
      return { texture: finalizeTexture(canvas), aspect: 1 };
    }
    if (spec.art === 'mercedesStar') {
      const W = 512, H = 512;
      const { canvas, ctx } = makeCanvas(W, H);
      drawMercedesStar(ctx, W / 2, H / 2, W * 0.92);
      return { texture: finalizeTexture(canvas), aspect: 1 };
    }
    if (spec.art === 'mercedesStarfield') {
      const W = 1024, H = 512;
      const { canvas, ctx } = makeCanvas(W, H);
      drawMercedesStarfield(ctx, W / 2, H / 2, W, H, { frontIsLeft });
      return { texture: finalizeTexture(canvas), aspect: W / H };
    }
    if (spec.art === 'petronasSwoosh') {
      const W = 1024, H = 256;
      const { canvas, ctx } = makeCanvas(W, H);
      drawPetronasSwoosh(ctx, W / 2, H / 2, W, H, { frontIsLeft });
      return { texture: finalizeTexture(canvas), aspect: W / H };
    }
    if (spec.art === 'amgBadge') {
      const W = 1024, H = 320;
      const { canvas, ctx } = makeCanvas(W, H);
      drawAmgBadge(ctx, W / 2, H / 2, W * 0.94, H * 0.88);
      return { texture: finalizeTexture(canvas), aspect: W / H };
    }
    if (spec.art === 'ineosCrown') {
      const W = 1024, H = 450;
      const { canvas, ctx } = makeCanvas(W, H);
      drawIneosCrown(ctx, W / 2, H / 2, W * 0.94, H * 0.88);
      return { texture: finalizeTexture(canvas), aspect: W / H };
    }
    if (spec.art === 'astonWings') {
      const W = 1024, H = 320;
      const { canvas, ctx } = makeCanvas(W, H);
      drawAstonWings(ctx, W / 2, H / 2, W * 0.96, H * 0.88);
      return { texture: finalizeTexture(canvas), aspect: W / H };
    }
    if (spec.art === 'aramcoWave') {
      const W = 1024, H = 360;
      const { canvas, ctx } = makeCanvas(W, H);
      drawAramcoWave(ctx, W / 2, H / 2, W * 0.94, H * 0.88);
      return { texture: finalizeTexture(canvas), aspect: W / H };
    }
    if (spec.art === 'limeEssence') {
      const W = 1024, H = 256;
      const { canvas, ctx } = makeCanvas(W, H);
      ctx.fillStyle = '#CEDC00';
      ctx.beginPath();
      ctx.moveTo(0, H * 0.4); ctx.lineTo(W, 0); ctx.lineTo(W, H); ctx.lineTo(0, H * 0.6);
      ctx.closePath(); ctx.fill();
      return { texture: finalizeTexture(canvas), aspect: W / H };
    }
    if (spec.art === 'hondaHrc') {
      const W = 1024, H = 400;
      const { canvas, ctx } = makeCanvas(W, H);
      drawHondaHrc(ctx, W / 2, H / 2, W * 0.94, H * 0.88);
      return { texture: finalizeTexture(canvas), aspect: W / H };
    }
    if (spec.art === 'williamsW') {
      const W = 512, H = 512;
      const { canvas, ctx } = makeCanvas(W, H);
      drawWilliamsW(ctx, W / 2, H / 2, W * 0.92, H * 0.92);
      return { texture: finalizeTexture(canvas), aspect: 1 };
    }
    if (spec.art === 'duracellAirbox') {
      const W = 512, H = 300;
      const { canvas, ctx } = makeCanvas(W, H);
      drawDuracellAirbox(ctx, W / 2, H / 2, W * 0.96, H * 0.92);
      return { texture: finalizeTexture(canvas), aspect: W / H };
    }
    if (spec.art === 'atlassian') {
      const W = 512, H = 512;
      const { canvas, ctx } = makeCanvas(W, H);
      drawAtlassian(ctx, W / 2, H / 2, W * 0.92, H * 0.92);
      return { texture: finalizeTexture(canvas), aspect: 1 };
    }
    if (spec.art === 'gulf') {
      const W = 512, H = 512;
      const { canvas, ctx } = makeCanvas(W, H);
      drawGulf(ctx, W / 2, H / 2, W * 0.92);
      return { texture: finalizeTexture(canvas), aspect: 1 };
    }
    if (spec.art === 'vcarbBull') {
      const W = 1024, H = 512;
      const { canvas, ctx } = makeCanvas(W, H);
      drawVcarbBull(ctx, W / 2, H / 2, W * 0.92, H * 0.92, { frontIsLeft });
      return { texture: finalizeTexture(canvas), aspect: 2 };
    }
    if (spec.art === 'visaLogo') {
      const W = 1024, H = 400;
      const { canvas, ctx } = makeCanvas(W, H);
      // Italic VISA with gold winglet on the V
      fitText(ctx, 'VISA', W / 2, H / 2, W * 0.92, H * 0.82, s => `italic 900 ${s}px ${HEAVY}`, { fill: spec.color || '#FFFFFF', spacing: 0.02 });
      ctx.fillStyle = '#F6C200';
      ctx.beginPath();
      ctx.moveTo(W * 0.16, H * 0.18); ctx.lineTo(W * 0.23, H * 0.18); ctx.lineTo(W * 0.18, H * 0.42);
      ctx.closePath(); ctx.fill();
      return { texture: finalizeTexture(canvas), aspect: W / H };
    }
    if (spec.art === 'cashApp') {
      const W = 512, H = 512;
      const { canvas, ctx } = makeCanvas(W, H);
      drawCashApp(ctx, W / 2, H / 2, W * 0.92);
      return { texture: finalizeTexture(canvas), aspect: 1 };
    }
    if (spec.art === 'vcarbStripes') {
      const W = 1024, H = 256;
      const { canvas, ctx } = makeCanvas(W, H);
      drawVcarbStripes(ctx, W / 2, H / 2, W, H, { frontIsLeft });
      return { texture: finalizeTexture(canvas), aspect: W / H };
    }
    if (spec.art === 'audiRings') {
      const W = 1024, H = 320;
      const { canvas, ctx } = makeCanvas(W, H);
      drawAudiRings(ctx, W / 2, H / 2, W * 0.94, H * 0.88, spec.color || '#FFFFFF');
      return { texture: finalizeTexture(canvas), aspect: W / H };
    }
    if (spec.art === 'audiSport') {
      const W = 1024, H = 320;
      const { canvas, ctx } = makeCanvas(W, H);
      drawAudiSport(ctx, W / 2, H / 2, W * 0.94, H * 0.88);
      return { texture: finalizeTexture(canvas), aspect: W / H };
    }
    if (spec.art === 'revolut') {
      const W = 1024, H = 400;
      const { canvas, ctx } = makeCanvas(W, H);
      drawRevolut(ctx, W / 2, H / 2, W * 0.94, H * 0.88);
      return { texture: finalizeTexture(canvas), aspect: W / H };
    }
    if (spec.art === 'audiChevron') {
      const W = 1024, H = 512;
      const { canvas, ctx } = makeCanvas(W, H);
      drawAudiChevron(ctx, W / 2, H / 2, W, H, { frontIsLeft });
      return { texture: finalizeTexture(canvas), aspect: W / H };
    }
    if (spec.art === 'tgrLogo') {
      const W = 1024, H = 400;
      const { canvas, ctx } = makeCanvas(W, H);
      drawTgr(ctx, W / 2, H / 2, W * 0.94, H * 0.88);
      return { texture: finalizeTexture(canvas), aspect: W / H };
    }
    if (spec.art === 'haasH') {
      const W = 512, H = 512;
      const { canvas, ctx } = makeCanvas(W, H);
      drawHaasH(ctx, W / 2, H / 2, W * 0.92);
      return { texture: finalizeTexture(canvas), aspect: 1 };
    }
    if (spec.art === 'moneyGram') {
      const W = 1024, H = 400;
      const { canvas, ctx } = makeCanvas(W, H);
      drawMoneyGram(ctx, W / 2, H / 2, W * 0.94, H * 0.88);
      return { texture: finalizeTexture(canvas), aspect: W / H };
    }
    if (spec.art === 'alpineArrow') {
      const W = 512, H = 512;
      const { canvas, ctx } = makeCanvas(W, H);
      drawAlpineArrow(ctx, W / 2, H / 2, W * 0.92, H * 0.92, { color: spec.color || '#FFFFFF', frontIsLeft });
      return { texture: finalizeTexture(canvas), aspect: 1 };
    }
    if (spec.art === 'bwtWave') {
      const W = 1024, H = 400;
      const { canvas, ctx } = makeCanvas(W, H);
      drawBwtWave(ctx, W / 2, H / 2, W * 0.94, H * 0.88);
      return { texture: finalizeTexture(canvas), aspect: W / H };
    }
    if (spec.art === 'renaultEtech') {
      const W = 512, H = 512;
      const { canvas, ctx } = makeCanvas(W, H);
      drawRenaultEtech(ctx, W / 2, H / 2, W * 0.92);
      return { texture: finalizeTexture(canvas), aspect: 1 };
    }
    if (spec.art === 'cadillacCrest') {
      const W = 1024, H = 512;
      const { canvas, ctx } = makeCanvas(W, H);
      drawCadillacCrest(ctx, W / 2, H / 2, W * 0.94, H * 0.88);
      return { texture: finalizeTexture(canvas), aspect: W / H };
    }
    if (spec.art === 'rbBull') {
      return { texture: createEngineCoverDecalTexture({ frontIsLeft }), aspect: 2 };
    }
  }

  // text (2048x512: sharp at close-up camera distances)
  const W = 2048, H = 512;
  const { canvas, ctx } = makeCanvas(W, H);
  ctx.save();
  if (spec.skew) { ctx.translate(W / 2, H / 2); ctx.transform(1, 0, spec.skew, 1, 0, 0); ctx.translate(-W / 2, -H / 2); }
  fitText(ctx, spec.text, W / 2, H / 2 + 6, W * 0.94, H * 0.78, TEAM_FONTS[spec.font || 'heavy'],
    { fill: spec.color || '#ffffff', stroke: spec.stroke || null, strokeWidth: spec.stroke ? 28 : 0 });
  ctx.restore();
  // crop the aspect to the drawn text so the projector box hugs the letters
  ctx.font = TEAM_FONTS[spec.font || 'heavy'](H * 0.78);
  const tw = Math.min(W * 0.94, ctx.measureText(spec.text).width);
  const crop = makeCanvas(Math.ceil(tw + 80), H);
  crop.ctx.drawImage(canvas, (W - crop.canvas.width) / 2, 0, crop.canvas.width, H, 0, 0, crop.canvas.width, H);
  return { texture: finalizeTexture(crop.canvas), aspect: crop.canvas.width / H };
}
