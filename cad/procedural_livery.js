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

/** Stylised charging bull, facing +x, fitted into a w×h box centred at (cx, cy). */
function drawBull(ctx, cx, cy, w, h, { fill = LIVERY.red, horn = LIVERY.yellow, outline = null } = {}) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(w / 400, h / 200);
  ctx.beginPath();
  // Head lowered to the right, horns forward, tail flicked up at the left
  ctx.moveTo(-190, -48);                               // tail tip
  ctx.quadraticCurveTo(-176, -22, -150, -26);           // tail
  ctx.bezierCurveTo(-110, -70, -20, -78, 60, -62);      // back
  ctx.bezierCurveTo(100, -70, 130, -58, 150, -36);      // shoulder hump
  ctx.lineTo(196, 2);                                   // forehead down to muzzle
  ctx.lineTo(186, 26);                                  // muzzle
  ctx.lineTo(150, 18);                                  // jaw
  ctx.bezierCurveTo(132, 30, 122, 40, 110, 46);         // dewlap
  ctx.lineTo(128, 92);                                  // front leg forward
  ctx.lineTo(108, 96);
  ctx.lineTo(84, 52);
  ctx.lineTo(60, 60);
  ctx.lineTo(40, 98);                                   // second front leg
  ctx.lineTo(22, 96);
  ctx.lineTo(30, 52);
  ctx.bezierCurveTo(-20, 50, -60, 46, -96, 36);         // belly
  ctx.lineTo(-150, 92);                                 // hind leg pushing back
  ctx.lineTo(-172, 86);
  ctx.lineTo(-128, 22);
  ctx.bezierCurveTo(-150, 6, -158, -6, -156, -18);      // haunch
  ctx.quadraticCurveTo(-182, -20, -190, -48);
  ctx.closePath();
  if (outline) { ctx.lineJoin = 'round'; ctx.lineWidth = 10; ctx.strokeStyle = outline; ctx.stroke(); }
  ctx.fillStyle = fill;
  ctx.fill();
  // Horn
  ctx.beginPath();
  ctx.moveTo(150, -34);
  ctx.quadraticCurveTo(176, -66, 214, -62);
  ctx.quadraticCurveTo(184, -48, 168, -22);
  ctx.closePath();
  ctx.fillStyle = horn;
  ctx.fill();
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
    drawBull(ctx, w * 0.5, h * 0.48, w * 0.86, h * 0.78, { outline: LIVERY.yellow, horn: LIVERY.yellow });
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
  drawBull(ctx, w * 0.48, h * 0.3, w * 0.7, h * 0.36, { outline: LIVERY.yellow });
  ctx.save(); ctx.translate(0, h); ctx.scale(1, -1);
  drawBull(ctx, w * 0.48, h * 0.3, w * 0.7, h * 0.36, { outline: LIVERY.yellow });
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
    drawBull(ctx, w * 0.42, h * 0.44, w * 0.2, h * 0.62, { outline: LIVERY.yellow });
  });
  drawATT(ctx, frontIsLeft ? w * 0.22 : w * 0.78, h * 0.46, w * 0.2, 150, LIVERY.navyDeep);
  return finalizeTexture(canvas);
}

/** Front wing mainplane: big Red Bull (reads from the front). */
export function createFrontWingRedBullTexture() {
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
