/**
 * track_textures.js — procedural canvas textures for the Red Bull Ring circuit build.
 * SREdesigns - Samuel R Erwin III
 * All textures are generated at runtime (no image downloads, no third-party logos).
 */
import * as THREE from 'three';

function rng(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

function canvasTex(w, h, draw, { repeat = true, aniso = 8 } = {}) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = aniso;
  return t;
}

function speckle(ctx, w, h, n, colors, rMin, rMax, rand) {
  for (let i = 0; i < n; i++) {
    ctx.fillStyle = colors[(rand() * colors.length) | 0];
    const r = rMin + rand() * (rMax - rMin);
    ctx.fillRect(rand() * w, rand() * h, r, r);
  }
}

export function makeTrackTextures() {
  const rand = rng(1234);
  const asphalt = canvasTex(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#3a3d42'; ctx.fillRect(0, 0, w, h);
    speckle(ctx, w, h, 9000, ['#2c2f33', '#45484e', '#34373b', '#50535a', '#26282c'], 1, 2.5, rand);
  });
  const runoff = canvasTex(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#55595f'; ctx.fillRect(0, 0, w, h);
    speckle(ctx, w, h, 7000, ['#4a4e54', '#62666c', '#5a5e64', '#6c7076'], 1, 2.5, rand);
  });
  const gravel = canvasTex(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#b7a684'; ctx.fillRect(0, 0, w, h);
    speckle(ctx, w, h, 14000, ['#a39271', '#c8b895', '#8f8063', '#d6c8a8', '#9d8c6a'], 1, 3, rand);
  });
  const grass = canvasTex(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#4f7d36'; ctx.fillRect(0, 0, w, h);
    speckle(ctx, w, h, 12000, ['#466f2f', '#5a8a3e', '#41672b', '#679645', '#3d6128'], 1, 3, rand);
  });
  // Kerb: one red + one white block per texture repeat (along V)
  const kerb = canvasTex(64, 128, (ctx, w, h) => {
    ctx.fillStyle = '#d4202c'; ctx.fillRect(0, 0, w, h / 2);
    ctx.fillStyle = '#f2f2ee'; ctx.fillRect(0, h / 2, w, h / 2);
    ctx.fillStyle = 'rgba(0,0,0,0.12)'; ctx.fillRect(0, 0, 6, h);
  });
  // Chequered finish strip: 2 rows across, repeat across track
  const chequer = canvasTex(128, 32, (ctx, w, h) => {
    for (let i = 0; i < 8; i++) for (let j = 0; j < 2; j++) {
      ctx.fillStyle = (i + j) % 2 ? '#111' : '#f4f4f4';
      ctx.fillRect(i * 16, j * 16, 16, 16);
    }
  });
  // Catch fence: diamond wire mesh with alpha
  const fence = canvasTex(64, 64, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(200,205,210,0.95)'; ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 0); ctx.lineTo(w, h); ctx.moveTo(w, 0); ctx.lineTo(0, h);
    ctx.stroke();
    ctx.fillStyle = 'rgba(160,165,170,1)'; ctx.fillRect(0, 0, w, 3); // top cable
  });
  const tyres = canvasTex(128, 64, (ctx, w, h) => {
    ctx.fillStyle = '#16171a'; ctx.fillRect(0, 0, w, h);
    for (let x = 0; x < 4; x++) for (let y = 0; y < 2; y++) {
      const cx = 16 + x * 32, cy = 16 + y * 32;
      ctx.fillStyle = '#26282c'; ctx.beginPath(); ctx.arc(cx, cy, 15, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#0c0c0e'; ctx.beginPath(); ctx.arc(cx, cy, 7, 0, Math.PI * 2); ctx.fill();
    }
    // conveyor belt facing: alternate red/white bands like real tyre-wall belts
    ctx.fillStyle = 'rgba(210,30,40,0.55)'; ctx.fillRect(0, 0, w / 2, 6);
    ctx.fillStyle = 'rgba(240,240,240,0.55)'; ctx.fillRect(w / 2, 0, w / 2, 6);
  });
  const crowd = canvasTex(256, 64, (ctx, w, h) => {
    ctx.fillStyle = '#5b6470'; ctx.fillRect(0, 0, w, h);
    const cols = ['#e8e8e8', '#1d2a4a', '#c8202a', '#f3c623', '#2f6db5', '#ffffff', '#ff7a1a', '#3a3a3a', '#d8b48a', '#8a5a3c'];
    for (let x = 0; x < w; x += 4) for (let y = 4; y < h; y += 16) {
      if (rand() < 0.82) {
        ctx.fillStyle = cols[(rand() * cols.length) | 0];
        ctx.fillRect(x, y, 3, 6);
        ctx.fillStyle = '#d9b38c'; ctx.fillRect(x + 0.5, y - 3, 2, 2.5);
      }
    }
  });
  const seats = canvasTex(256, 64, (ctx, w, h) => {
    ctx.fillStyle = '#5b6470'; ctx.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 4) for (let y = 4; y < h; y += 16) {
      ctx.fillStyle = (x / 4 + y) % 7 < 3 ? '#1e3c78' : '#c22430'; ctx.fillRect(x, y, 3, 6);
    }
  });
  const garage = canvasTex(512, 128, (ctx, w, h) => {
    ctx.fillStyle = '#d9dde2'; ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 4; i++) {
      const x = 10 + i * 128;
      ctx.fillStyle = '#20252c'; ctx.fillRect(x, 26, 108, 102);
      const g = ctx.createLinearGradient(0, 26, 0, 128);
      g.addColorStop(0, '#5f6a78'); g.addColorStop(1, '#a8b2bd');
      ctx.fillStyle = g; ctx.fillRect(x + 6, 32, 96, 96);
      ctx.fillStyle = '#e9edf2'; ctx.fillRect(x + 4, 6, 100, 14);
      ctx.fillStyle = '#20252c'; ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('GARAGE', x + 54, 17);
    }
  }, { repeat: true });
  const glass = canvasTex(256, 64, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#8fb3cf'); g.addColorStop(1, '#2d4a63');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#c9d2da';
    for (let x = 0; x < w; x += 32) ctx.fillRect(x, 0, 3, h);
    ctx.fillRect(0, h - 4, w, 4);
  });
  return { asphalt, runoff, gravel, grass, kerb, chequer, fence, tyres, crowd, seats, garage, glass };
}

/**
 * Sign atlas: every trackside board shares ONE texture so all signs merge into one draw call.
 * Only plain text — the circuit name, place names, turn numbers and marshal/pit info. No third-party logos.
 */
export const SIGN_CELLS = [
  { key: 'RBR', text: 'RED BULL RING', bg: '#0b1630', fg: '#ffffff', sub: 'SPIELBERG' },
  { key: 'SPIELBERG', text: 'SPIELBERG', bg: '#ffffff', fg: '#0b1630', sub: 'STEIERMARK · AUSTRIA' },
  { key: 'STYRIA', text: 'STEIERMARK', bg: '#1f6b34', fg: '#ffffff', sub: 'AUSTRIA' },
  { key: 'SF', text: 'START · FINISH', bg: '#111111', fg: '#ffffff', sub: 'RED BULL RING' },
  { key: 'PITIN', text: 'PIT IN', bg: '#f4f4f4', fg: '#111111', sub: '80 KM/H' },
  { key: 'PITOUT', text: 'PIT EXIT', bg: '#f4f4f4', fg: '#111111', sub: 'BLEND LINE' },
  { key: 'PIT80', text: '80', bg: '#ffffff', fg: '#111111', ring: true },
  { key: 'B100', text: '100', bg: '#ffffff', fg: '#111111' },
  { key: 'B200', text: '200', bg: '#ffffff', fg: '#111111' },
  { key: 'B300', text: '300', bg: '#ffffff', fg: '#111111' },
  { key: 'SRE', text: 'SREdesigns', bg: '#0c1626', fg: '#00d4e8', sub: '2026 NIMBLE CAR' },
  { key: 'GRANDPRIX', text: 'GRAND PRIX', bg: '#c8102e', fg: '#ffffff', sub: 'SPIELBERG 2026' },
  { key: 'DRSDET', text: 'DRS', bg: '#111111', fg: '#ffffff', sub: 'DETECTION' },
  { key: 'DRSACT', text: 'DRS', bg: '#ffffff', fg: '#111111', sub: 'ACTIVATION' },
  { key: 'S1', text: 'SECTOR 1', bg: '#f2c200', fg: '#111111' },
  { key: 'S2', text: 'SECTOR 2', bg: '#f2c200', fg: '#111111' },
  { key: 'TRAP', text: 'SPEED TRAP', bg: '#f2c200', fg: '#111111' },
];
// corner names from the FIA circuit map (2025)
const TURN_NAME = { 1: 'NIKI LAUDA', 3: 'REMUS', 4: 'RAUCH', 9: 'JOCHEN RINDT' };
for (let i = 1; i <= 10; i++) SIGN_CELLS.push({ key: 'T' + i, text: String(i), bg: '#0b1630', fg: '#ffffff', sub: TURN_NAME[i] || 'TURN', turn: true });

export function makeSignAtlas() {
  const cw = 512, ch = 128, cols = 4;
  const rows = Math.ceil(SIGN_CELLS.length / cols);
  const c = document.createElement('canvas');
  c.width = cw * cols; c.height = ch * rows;
  const ctx = c.getContext('2d');
  const uv = {};
  SIGN_CELLS.forEach((cell, idx) => {
    const x = (idx % cols) * cw, y = Math.floor(idx / cols) * ch;
    ctx.fillStyle = cell.bg; ctx.fillRect(x, y, cw, ch);
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 6; ctx.strokeRect(x + 4, y + 4, cw - 8, ch - 8);
    ctx.fillStyle = cell.fg; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    if (cell.ring) {
      ctx.fillStyle = '#ffffff'; ctx.fillRect(x, y, cw, ch);
      ctx.strokeStyle = '#d0021b'; ctx.lineWidth = 14;
      ctx.beginPath(); ctx.arc(x + cw / 2, y + ch / 2, 50, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = '#111'; ctx.font = 'bold 54px sans-serif'; ctx.fillText(cell.text, x + cw / 2, y + ch / 2 + 2);
    } else if (cell.turn) {
      ctx.font = `bold ${cell.sub.length > 8 ? 26 : 30}px sans-serif`; ctx.fillText(cell.sub, x + 150, y + ch / 2 + 2, 270);
      ctx.font = 'bold 96px sans-serif'; ctx.fillText(cell.text, x + 340, y + ch / 2 + 6);
    } else if (cell.sub) {
      ctx.font = 'bold 56px sans-serif'; ctx.fillText(cell.text, x + cw / 2, y + 50);
      ctx.font = 'bold 26px sans-serif'; ctx.globalAlpha = 0.85; ctx.fillText(cell.sub, x + cw / 2, y + 100); ctx.globalAlpha = 1;
    } else {
      ctx.font = `bold ${cell.text.length > 6 ? 64 : 92}px sans-serif`; ctx.fillText(cell.text, x + cw / 2, y + ch / 2 + 6, cw - 30);
    }
    uv[cell.key] = [x / c.width, 1 - (y + ch) / c.height, (x + cw) / c.width, 1 - y / c.height];
  });
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return { tex, uv };
}
