/**
 * Generic team garage builder. Reads a layout from garage_data.js and team colours from garage_team_colors.js.
 * One shared garage: setTeam(id) recolours the wall panels, cabinets, cases, canopy and sponsor boards.
 *
 * Look: glossy light grey epoxy floor with grey chevron lanes and a mirror image of the car (Reflector, high quality),
 * team colour wall panels over a black band, pale brick above, a ceiling with aluminium truss, ducting, cable trays and
 * rows of tube lights, a hanging light canopy over the car with coiled air lines, flight cases with aluminium edges,
 * corner caps, latches and castors, and a view out of the roller door to the pit lane and the pit wall.
 * Lighting: soft area lights (RectAreaLight) under the canopy and the tube rows, one shadow casting spot light over the
 * car, sunlight outside, and an environment map captured from the garage itself so paint and floor reflect the room.
 *
 * Efficiency only (never fewer details): the room shell is merged per material, every prop kind is one InstancedMesh
 * per part with shared geometry and materials, textures are small canvases, and dispose() frees all GPU memory when
 * you leave the garage. Units: dm, floor at y = 0, open door toward -x (see garage_data.js).
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { GARAGE_LAYOUT, REGULATIONS } from './garage_data.js';
import { GARAGE_TEAM_COLORS } from './garage_team_colors.js';

export const REFLECT_LAYER = 5;   // objects seen in the floor mirror (garage, car, lights)
export const SHELL_LAYER = 6;     // room shell and pit building: the only casters for the outside sunlight shadow
let rectInit = false;

function canvasTex(w, h, draw, { aniso = 8, repeat = false } = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = aniso;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.userData.canvas = c; t.userData.draw = draw;
  return t;
}
const redraw = (t) => { const c = t.userData.canvas; t.userData.draw(c.getContext('2d'), c.width, c.height); t.needsUpdate = true; };
function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

/** regulations sheet drawing, shared by the desk monitor and the printed sheet */
export function drawRegulations(x, w, h, { dark = false, team = 'Team' } = {}) {
  x.fillStyle = dark ? '#0b1220' : '#f7f7f2'; x.fillRect(0, 0, w, h);
  const fg = dark ? '#e6edf5' : '#15181d', sub = dark ? '#7fd3ff' : '#4a5260';
  const s = w / 512;
  x.fillStyle = fg; x.font = `bold ${30 * s}px Arial, sans-serif`; x.textBaseline = 'top';
  x.fillText(REGULATIONS.title, 24 * s, 20 * s);
  x.fillStyle = sub; x.font = `${16 * s}px Arial, sans-serif`; x.fillText(`${team} · technical check sheet`, 24 * s, 58 * s);
  const top = 92 * s, rh = (h - top - 16 * s) / REGULATIONS.rows.length;
  REGULATIONS.rows.forEach(([k, v], i) => {
    const y = top + i * rh;
    if (i % 2 === 0) { x.fillStyle = dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'; x.fillRect(16 * s, y, w - 32 * s, rh); }
    x.fillStyle = fg; x.font = `${Math.min(18 * s, rh * 0.55)}px Arial, sans-serif`; x.fillText(k, 24 * s, y + rh * 0.22);
    x.fillStyle = sub; x.textAlign = 'right'; x.fillText(v, w - 24 * s, y + rh * 0.22); x.textAlign = 'left';
  });
}

// ------------------------------------------------------------------------------------------------ geometry helpers
const B = (w, h, d, x = 0, y = 0, z = 0) => new THREE.BoxGeometry(w, h, d).translate(x, y, z);
const Cy = (r, h, x = 0, y = 0, z = 0, seg = 16, r2 = r) => new THREE.CylinderGeometry(r, r2, h, seg).translate(x, y, z);
const CyX = (r, h, x, y, z, seg = 16) => new THREE.CylinderGeometry(r, r, h, seg).rotateZ(Math.PI / 2).translate(x, y, z);
const CyZ = (r, h, x, y, z, seg = 16) => new THREE.CylinderGeometry(r, r, h, seg).rotateX(Math.PI / 2).translate(x, y, z);
const flat = (g) => { const n = g.index ? g.toNonIndexed() : g; if (n.attributes.uv) n.deleteAttribute('uv'); return n; };
const merged = (list) => mergeGeometries(list.map(flat));
/** a bar between two points (round tube) */
function rod(a, b, r, seg = 8) {
  const A = new THREE.Vector3(...a), Bv = new THREE.Vector3(...b), d = Bv.clone().sub(A), L = d.length();
  const g = new THREE.CylinderGeometry(r, r, L, seg); g.translate(0, L / 2, 0);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()));
  return g.translate(A.x, A.y, A.z);
}
/** coiled air line: helix from (x, y0, z) down to y1 with a straight tail */
function coil(x, y0, y1, z, R = 0.8, turns = 9, r = 0.11) {
  const pts = [new THREE.Vector3(x, y0, z)];
  const top = y0 - 1.5, bot = y1 + 2;
  for (let i = 0; i <= turns * 16; i++) { const t = i / (turns * 16), a = t * turns * Math.PI * 2; pts.push(new THREE.Vector3(x + Math.cos(a) * R, top + (bot - top) * t, z + Math.sin(a) * R)); }
  pts.push(new THREE.Vector3(x + R, y1 + 0.6, z), new THREE.Vector3(x + R * 0.6, y1, z + 0.3));
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), turns * 40, r, 6, false);
}
/** flight case parts (local frame: centred on x / z, castors on the floor, front face +z) */
function caseParts(w, h, d, { castor = 1.7, t = 0.32 } = {}) {
  const y0 = castor, y1 = castor + h, body = [B(w - 0.1, h - 0.1, d - 0.1, 0, y0 + h / 2, 0)], alu = [], caps = [], dark = [];
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) alu.push(B(t, h, t, sx * w / 2, y0 + h / 2, sz * d / 2));
  for (const yy of [y0, y1]) for (const s of [-1, 1]) { alu.push(B(w, t, t, 0, yy, s * d / 2)); alu.push(B(t, t, d, s * w / 2, yy, 0)); }
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) for (const yy of [y0 + 0.35, y1 - 0.35]) caps.push(B(0.85, 0.85, 0.85, sx * (w / 2 - 0.1), yy, sz * (d / 2 - 0.1)));
  for (const sx of [-1, 1]) {   // butterfly latches front and back, recessed handles on the sides
    for (const sz of [-1, 1]) { caps.push(B(1.3, 0.9, 0.22, sx * w * 0.3, y1 - 1.2, sz * (d / 2 + 0.12))); caps.push(CyZ(0.32, 0.12, sx * w * 0.3, y1 - 1.2, sz * (d / 2 + 0.28), 10)); }
    dark.push(B(0.25, 1.1, 2.6, sx * (w / 2 + 0.05), y0 + h * 0.6, 0)); caps.push(B(0.2, 0.25, 2.2, sx * (w / 2 + 0.25), y0 + h * 0.6 + 0.3, 0));
  }
  const wheels = [], forks = [];
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const cx = sx * (w / 2 - 1.1), cz = sz * (d / 2 - 1.1);
    wheels.push(CyX(0.62, 0.45, cx, 0.62, cz, 14));
    forks.push(B(1.5, 0.18, 1.5, cx, castor - 0.1, cz), B(0.12, 0.9, 1.0, cx - 0.3, castor - 0.6, cz), B(0.12, 0.9, 1.0, cx + 0.3, castor - 0.6, cz));
  }
  return { body, alu, caps, dark, wheels, forks, y0, y1 };
}

export function buildGarage(L = GARAGE_LAYOUT, teamId = 'red-bull', { quality = 'high' } = {}) {
  if (!rectInit) { RectAreaLightUniformsLib.init(); rectInit = true; }
  const high = quality !== 'low';
  const g = new THREE.Group(); g.name = 'Team_Garage';
  const T = () => GARAGE_TEAM_COLORS[teamId] || GARAGE_TEAM_COLORS['red-bull'];
  const W = L.halfWidth, X0 = L.x0, X1 = L.x1, H = L.height, D = X1 - X0, XM = (X0 + X1) / 2;
  const F = L.floor, LN = F.lanes;

  // ---------------------------------------------------------------- textures (small canvases)
  const floorTex = canvasTex(1536, 584, (x, w, h) => {
    const sx = w / D, sz = h / (2 * W), px = v => (v - X0) * sx, pz = v => (v + W) * sz, r = rng(11);
    x.fillStyle = F.color; x.fillRect(0, 0, w, h);
    for (let i = 0; i < 2600; i++) { x.fillStyle = `rgba(${r() < 0.5 ? '120,124,130' : '255,255,255'},${0.025 + r() * 0.035})`; const s = 2 + r() * 10; x.fillRect(r() * w, r() * h, s, s); }
    // grey chevron parking lanes on both sides of the car, chevrons point out to the pit lane
    for (const s of [-1, 1]) {
      const za = s > 0 ? LN.z0 : -LN.z1, zb = s > 0 ? LN.z1 : -LN.z0;
      x.fillStyle = LN.color; x.fillRect(px(LN.x0), pz(za), (LN.x1 - LN.x0) * sx, (zb - za) * sz);
      x.strokeStyle = LN.chevron; x.lineWidth = 5; x.lineCap = 'square';
      for (let cx = LN.x0 + 10; cx < LN.x1 - 4; cx += 9) { x.beginPath(); x.moveTo(px(cx + 4), pz(za + 1)); x.lineTo(px(cx), pz((za + zb) / 2)); x.lineTo(px(cx + 4), pz(zb - 1)); x.stroke(); }
    }
    x.strokeStyle = 'rgba(40,42,46,0.45)'; x.lineWidth = 3; x.strokeRect(1, 1, w - 2, h - 2);
    // painted direction signs
    x.fillStyle = 'rgba(38,40,44,0.85)'; x.font = 'bold 30px Arial, sans-serif'; x.textBaseline = 'middle';
    for (const [txt, fx, fz, ang] of F.signs) { x.save(); x.translate(px(fx), pz(fz)); x.rotate(-(ang || 0) + Math.PI / 2); x.textAlign = 'center'; x.fillText(txt, 0, 0); x.restore(); }
    // red PIT-LANE threshold strip at the door, lettering reads from the pit lane
    x.fillStyle = L.pitLaneStrip.color; x.fillRect(0, 0, L.pitLaneStrip.width * sx, h);
    x.save(); x.translate(L.pitLaneStrip.width * sx * 0.5, h / 2); x.rotate(Math.PI / 2); x.fillStyle = '#ffffff'; x.font = 'bold 34px Arial'; x.textAlign = 'center'; x.fillText(L.pitLaneStrip.text, 0, 2); x.restore();
  }, { aniso: 16 });
  const brickTex = canvasTex(256, 256, (x, w, h) => {
    const r = rng(3); x.fillStyle = '#b9b2a4'; x.fillRect(0, 0, w, h);
    for (let row = 0; row < 16; row++) for (let c = 0; c < 5; c++) {
      const bx = c * 64 + (row % 2) * 32 - 32, v = r() * 18 - 9; x.fillStyle = `rgb(${221 + v},${214 + v},${200 + v})`; x.fillRect(bx + 2, row * 16 + 2, 60, 12);
    }
  }, { repeat: true });
  brickTex.repeat.set(D / 26, 1.0);
  const sideBrick = brickTex.clone(); sideBrick.repeat.set(2 * W / 26, 1.0); sideBrick.needsUpdate = true;
  const greyBrickTex = canvasTex(256, 256, (x, w, h) => {
    const r = rng(7); x.fillStyle = '#6c6e72'; x.fillRect(0, 0, w, h);
    for (let row = 0; row < 16; row++) for (let c = 0; c < 5; c++) { const bx = c * 64 + (row % 2) * 32 - 32, v = r() * 14 - 7; x.fillStyle = `rgb(${142 + v},${144 + v},${148 + v})`; x.fillRect(bx + 2, row * 16 + 2, 60, 12); }
  }, { repeat: true });
  greyBrickTex.repeat.set(2 * W / 26, H / 26);
  const ceilTex = canvasTex(256, 256, (x, w, h) => {
    const r = rng(9); x.fillStyle = '#5b5e63'; x.fillRect(0, 0, w, h);
    for (let i = 0; i < 900; i++) { x.fillStyle = `rgba(${r() < 0.5 ? '30,30,30' : '200,200,200'},0.06)`; x.fillRect(r() * w, r() * h, 3, 3); }
    x.fillStyle = 'rgba(25,26,28,0.7)'; x.fillRect(0, 0, w, 4); x.fillRect(0, 0, 4, h);
  }, { repeat: true });
  ceilTex.repeat.set(D / 30, 2 * W / 30);
  const concreteTex = canvasTex(256, 256, (x, w, h) => {
    const r = rng(5); x.fillStyle = '#86898c'; x.fillRect(0, 0, w, h);
    for (let i = 0; i < 1600; i++) { x.fillStyle = `rgba(${r() < 0.5 ? '70,70,70' : '255,255,255'},${0.05 + r() * 0.06})`; x.fillRect(r() * w, r() * h, 2, 2); }
    x.fillStyle = 'rgba(60,62,66,0.5)'; x.fillRect(0, 0, w, 2); x.fillRect(0, 0, 2, h);
  }, { repeat: true });
  concreteTex.repeat.set(L.pitLane.length / 60, (L.pitLane.apron + L.pitLane.fastLane) / 60);
  const slatTex = canvasTex(128, 256, (x, w, h) => {   // closed roller shutters of the neighbouring garages
    x.fillStyle = '#9ea3a9'; x.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 8) { x.fillStyle = 'rgba(40,44,50,0.35)'; x.fillRect(0, y, w, 2); x.fillStyle = 'rgba(255,255,255,0.25)'; x.fillRect(0, y + 2, w, 1); }
  }, { repeat: true });
  const doorTex = canvasTex(512, 128, (x, w, h) => {      // our raised roller door: bottom slats with a row of windows
    x.fillStyle = '#a7acb2'; x.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 10) { x.fillStyle = 'rgba(40,44,50,0.4)'; x.fillRect(0, y, w, 2); }
    const n = L.rollerDoor.windows; for (let k = 0; k < n; k++) { const cx = (k + 0.5) * w / n; x.fillStyle = '#20262e'; x.fillRect(cx - 26, 46, 52, 30); x.fillStyle = 'rgba(160,190,220,0.55)'; x.fillRect(cx - 24, 48, 48, 12); }
    x.fillStyle = '#2b2e33'; x.fillRect(0, h - 10, w, 10);
  });
  const glassTex = canvasTex(256, 128, (x, w, h) => {      // glazed upper floor of the pit building
    const gr = x.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#7f97ad'); gr.addColorStop(1, '#3a4a5a'); x.fillStyle = gr; x.fillRect(0, 0, w, h);
    x.fillStyle = '#20252b'; for (let k = 0; k <= 8; k++) x.fillRect(k * w / 8 - 2, 0, 4, h); x.fillRect(0, h * 0.62, w, 3);
  }, { repeat: true });
  glassTex.repeat.set(10, 1);
  const gaugeTex = canvasTex(64, 64, (x, w, h) => {
    x.fillStyle = '#f4f4f0'; x.beginPath(); x.arc(32, 32, 30, 0, Math.PI * 2); x.fill();
    x.strokeStyle = '#222'; x.lineWidth = 2; for (let k = 0; k <= 10; k++) { const a = Math.PI * 0.75 + k * Math.PI * 0.15; x.beginPath(); x.moveTo(32 + Math.cos(a) * 22, 32 + Math.sin(a) * 22); x.lineTo(32 + Math.cos(a) * 28, 32 + Math.sin(a) * 28); x.stroke(); }
    x.strokeStyle = '#c8161d'; x.lineWidth = 3; x.beginPath(); x.moveTo(32, 32); x.lineTo(48, 18); x.stroke();
  });
  const telemTex = canvasTex(512, 256, (x, w, h) => {
    x.fillStyle = '#07101c'; x.fillRect(0, 0, w, h);
    x.strokeStyle = 'rgba(120,160,200,0.15)'; x.lineWidth = 1; for (let i = 0; i < 8; i++) { x.beginPath(); x.moveTo(0, i * h / 8); x.lineTo(w, i * h / 8); x.stroke(); }
    ['#00e0ff', '#ffcc00', '#ff4d6d', '#7cff6b'].forEach((cc, k) => { x.strokeStyle = cc; x.lineWidth = 2; x.beginPath(); for (let i = 0; i <= 64; i++) { const yy = h * (0.2 + k * 0.2) + Math.sin(i * 0.4 + k) * 12 + Math.sin(i * 1.7 + k * 3) * 5; i ? x.lineTo(i * w / 64, yy) : x.moveTo(0, yy); } x.stroke(); });
  });
  const timingTex = canvasTex(512, 256, (x, w, h) => {
    x.fillStyle = '#0a0d12'; x.fillRect(0, 0, w, h); x.font = 'bold 20px Arial'; x.textBaseline = 'middle';
    for (let i = 0; i < 10; i++) { x.fillStyle = i % 2 ? '#121821' : '#0e131a'; x.fillRect(0, i * 25 + 4, w, 25); x.fillStyle = '#ffffff'; x.fillText(`${i + 1}`, 10, i * 25 + 17); x.fillStyle = ['#e3122b', '#f5c400', '#f2f2ee'][i % 3]; x.fillRect(44, i * 25 + 8, 6, 17); x.fillStyle = '#cfd8e3'; x.fillText(`CAR ${String((i * 7 + 3) % 99).padStart(2, '0')}`, 60, i * 25 + 17); x.fillStyle = '#7fe7ff'; x.fillText(`1:${(18 + i * 0.137).toFixed(3)}`, w - 120, i * 25 + 17); }
  });
  // sponsor and team name boards (plain text, made-up sponsor names) in one atlas
  const SP = [T().name.toUpperCase(), ...L.sponsors];
  const atlasTex = canvasTex(1024, 1024, (x, w, h) => {
    const names = [T().name.toUpperCase(), ...L.sponsors];
    const cellH = h / 8;
    names.forEach((nm, k) => {
      const y = k * cellH; x.fillStyle = k === 0 ? T().panel : '#111214'; x.fillRect(0, y, w, cellH);
      x.fillStyle = k === 0 ? '#ffffff' : (k % 2 ? '#ffffff' : T().panel); x.font = `bold ${k === 0 ? 66 : 58}px "Helvetica Neue", Arial, sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle';
      x.fillText(nm, w / 2, y + cellH / 2, w - 60);
      if (k === 0) { x.fillStyle = 'rgba(0,0,0,0.35)'; x.fillRect(0, y + cellH - 10, w, 10); }
    });
    // row 7: fire point sign
    const y = 7 * cellH; x.fillStyle = '#c8161d'; x.fillRect(0, y, w / 2, cellH); x.fillStyle = '#ffffff'; x.font = 'bold 44px Arial'; x.fillText('FIRE POINT', w / 4, y + cellH / 2);
    x.fillStyle = '#ffffff'; x.fillRect(w / 2, y, w / 2, cellH); x.fillStyle = '#111'; x.font = 'bold 40px Arial'; x.fillText('NO SMOKING', w * 0.75, y + cellH / 2);
  }, { aniso: 16 });
  const atlasUV = (k, half = 0) => (half ? [half === 1 ? 0 : 0.5, 1 - (k + 1) / 8, half === 1 ? 0.5 : 1, 1 - k / 8] : [0, 1 - (k + 1) / 8, 1, 1 - k / 8]);
  // tyre blanket labels: 4 rows, each label twice around the blanket
  const LABELS = ['LEFT FRONT', 'RIGHT FRONT', 'LEFT REAR', 'RIGHT REAR'];
  const blanketTex = canvasTex(1024, 256, (x, w, h) => {
    LABELS.forEach((lab, k) => {
      const y = k * 64; x.fillStyle = '#17181b'; x.fillRect(0, y, w, 64);
      x.fillStyle = T().panel; x.fillRect(0, y + 2, w, 4); x.fillRect(0, y + 58, w, 4);
      x.fillStyle = '#f2f2ee'; x.font = 'bold 34px Arial, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
      for (const cx of [0.25, 0.75]) x.fillText(lab, cx * w, y + 33);
    });
  }, { aniso: 16 });

  // ---------------------------------------------------------------- materials (shared)
  const std = (o) => new THREE.MeshStandardMaterial(o);
  const M = {
    floor: new THREE.MeshPhysicalMaterial({ map: floorTex, roughness: F.roughness, metalness: 0.0, clearcoat: F.clearcoat, clearcoatRoughness: F.clearcoatRoughness, envMapIntensity: 0.45, transparent: high, opacity: high ? 1 - F.reflect : 1 }),
    lane: std({ map: concreteTex, roughness: 0.85 }),
    asphalt: std({ color: 0x3d4045, roughness: 0.9 }),
    redLane: std({ color: 0xb3262b, roughness: 0.8 }),
    whiteLine: std({ color: 0xeeeeea, roughness: 0.7 }),
    brick: std({ map: brickTex, roughness: 0.92 }),
    sideBrick: std({ map: sideBrick, roughness: 0.92 }),
    greyBrick: std({ map: greyBrickTex, roughness: 0.9 }),
    band: std({ color: 0x111214, roughness: 0.42, metalness: 0.1 }),
    team: std({ color: T().panel, roughness: 0.32, metalness: 0.12 }),
    teamMatte: std({ color: T().panel, roughness: 0.55, metalness: 0.05 }),
    accent: std({ color: T().accent, roughness: 0.5 }),
    ceiling: std({ map: ceilTex, roughness: 0.95 }),
    alu: std({ color: 0xd3d7dc, roughness: 0.28, metalness: 0.9 }),
    galv: std({ color: 0xaab0b6, roughness: 0.42, metalness: 0.85 }),
    chrome: std({ color: 0xe6e9ee, roughness: 0.12, metalness: 1.0 }),
    tube: std({ color: 0xffffff, emissive: 0xf6f8ff, emissiveIntensity: 3.0 }),
    housing: std({ color: 0x2b2d31, roughness: 0.5, metalness: 0.5 }),
    canopyPanel: std({ color: 0xffffff, emissive: 0xf8faff, emissiveIntensity: 2.6 }),
    dark: std({ color: 0x1d1f23, roughness: 0.45, metalness: 0.35 }),
    black: std({ color: 0x0e0f11, roughness: 0.6 }),
    rubber: std({ color: 0x111113, roughness: 0.85 }),
    tyre: std({ color: 0x151517, roughness: 0.88 }),
    blanket: std({ map: blanketTex, roughness: 0.9 }),
    yellowHose: std({ color: 0xe2b100, roughness: 0.55 }),
    red: std({ color: 0xc8161d, roughness: 0.35, metalness: 0.25 }),
    bottle: std({ color: 0x18191c, roughness: 0.3, metalness: 0.6 }),
    gauge: std({ map: gaugeTex, roughness: 0.3 }),
    screen: std({ map: telemTex, emissive: 0xffffff, emissiveMap: telemTex, emissiveIntensity: 0.9, roughness: 0.25 }),
    timing: std({ map: timingTex, emissive: 0xffffff, emissiveMap: timingTex, emissiveIntensity: 0.9, roughness: 0.25 }),
    seat: std({ color: 0x18181b, roughness: 0.5 }),
    cloth: std({ color: 0x232327, roughness: 0.92, side: THREE.DoubleSide }),
    visor: std({ color: 0x0c0f14, roughness: 0.05, metalness: 0.9 }),
    signs: std({ map: atlasTex, roughness: 0.4 }),
    slats: std({ map: slatTex, roughness: 0.6, metalness: 0.4 }),
    door: std({ map: doorTex, roughness: 0.55, metalness: 0.45, side: THREE.DoubleSide }),
    glass: std({ map: glassTex, roughness: 0.08, metalness: 0.6 }),
    facade: std({ color: 0xd2d4d6, roughness: 0.75 }),
    facadeDark: std({ color: 0x3b3f45, roughness: 0.6, metalness: 0.3 }),
    fence: std({ color: 0x9aa3ad, roughness: 0.45, metalness: 0.7, transparent: true, opacity: 0.35, side: THREE.DoubleSide }),
    shadow: new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, depthWrite: false, opacity: 0.75, alphaMap: canvasTex(128, 128, (x, w, h) => { const gr = x.createRadialGradient(w / 2, h / 2, 4, w / 2, h / 2, w / 2); gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.55, '#8a8a8a'); gr.addColorStop(1, '#000000'); x.fillStyle = gr; x.fillRect(0, 0, w, h); }), polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }),
  };
  M.shadow.alphaMap.colorSpace = THREE.NoColorSpace;
  g.userData.materials = M;
  const parts = new Map();   // material -> geometry list (static shell, merged at the end)
  const put = (mat, geo) => { if (!parts.has(mat)) parts.set(mat, []); parts.get(mat).push(geo); return geo; };
  const box = (mat, w, h, d, x, y, z, ry = 0) => { const b = new THREE.BoxGeometry(w, h, d); if (ry) b.rotateY(ry); b.translate(x, y, z); return put(mat, b); };
  const rot = (x, z, ox, oz, a) => [ox + x * Math.cos(a) + z * Math.sin(a), oz - x * Math.sin(a) + z * Math.cos(a)];
  // textured quads (sign atlas, screens) merged per material: corners from centre, along-axis and face normal
  const quads = new Map();
  const quad = (mat, cx, cy, cz, w, h, nx, nz, uv = [0, 0, 1, 1]) => {
    const ax = -nz, az = nx;   // right-hand axis when looking at the face (u grows to the viewer's right)
    const p = new THREE.PlaneGeometry(w, h);
    p.applyMatrix4(new THREE.Matrix4().makeBasis(new THREE.Vector3(-ax, 0, -az), new THREE.Vector3(0, 1, 0), new THREE.Vector3(nx, 0, nz)));
    p.translate(cx, cy, cz);
    const a = p.attributes.uv; for (let i = 0; i < a.count; i++) a.setXY(i, uv[0] + a.getX(i) * (uv[2] - uv[0]), uv[1] + a.getY(i) * (uv[3] - uv[1]));
    if (!quads.has(mat)) quads.set(mat, []); quads.get(mat).push(p);
  };

  // ---------------------------------------------------------------- floor (glossy epoxy over a mirror image)
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(D, 2 * W), M.floor); floor.rotation.x = -Math.PI / 2; floor.position.set(XM, 0.03, 0); floor.receiveShadow = true; floor.name = 'Garage_Floor'; floor.renderOrder = 1; g.add(floor);
  let mirror = null;
  if (high) {
    mirror = new Reflector(new THREE.PlaneGeometry(D, 2 * W), { textureWidth: 1024, textureHeight: 512, clipBias: 0.003, color: 0x8f9298, multisample: 4 });
    mirror.rotation.x = -Math.PI / 2; mirror.position.set(XM, 0.0, 0); mirror.name = 'Garage_Floor_Mirror';
    mirror.camera.layers.set(REFLECT_LAYER);
    // the mirror image is only redrawn when the view changed (camera moved, wheels or bodywork toggled, part picked), and
    // at most once per screen frame (three.js would otherwise redo it inside the transmission pass of the car's glass).
    // A still view keeps the last image, which is identical, so nothing is lost.
    const drawMirror = mirror.onBeforeRender; let fresh = false, dirty = true; const lastM = new Float64Array(32);
    mirror.onBeforeRender = function (renderer, scene, cam, ...rest) {
      if (fresh) return;
      const a = cam.matrixWorld.elements, b = cam.projectionMatrix.elements; let same = !dirty;
      for (let i = 0; same && i < 16; i++) same = Math.abs(a[i] - lastM[i]) < 1e-7 && Math.abs(b[i] - lastM[16 + i]) < 1e-7;
      if (same) return;
      fresh = true; requestAnimationFrame(() => (fresh = false)); lastM.set(a); lastM.set(b, 16); dirty = false;
      drawMirror.call(this, renderer, scene, cam, ...rest);
    };
    g.userData.refreshMirror = () => { fresh = false; dirty = true; };
    g.add(mirror);
  }
  // soft contact shadow under the car
  { const s = new THREE.Mesh(new THREE.PlaneGeometry(70, 30), M.shadow); s.rotation.x = -Math.PI / 2; s.position.set(17, 0.06, 0); s.name = 'Garage_Contact_Shadow'; s.renderOrder = 2; g.add(s); }

  // ---------------------------------------------------------------- walls: black band, team panels, pale brick, grey brick back wall
  for (const s of [-1, 1]) {
    const zw = s * W;
    box(M.band, D, L.lowerBand, 1, XM, L.lowerBand / 2, zw);
    for (let x = X0 + 6; x < X1 - 4; x += 12.4) {   // team colour panels with shadow gaps
      box(M.team, 12, L.panelTop - L.lowerBand - 0.6, 0.6, x + 6, (L.panelTop + L.lowerBand) / 2, zw - s * 0.7);
    }
    box(M.band, D, 0.8, 1.2, XM, L.panelTop + 0.4, zw - s * 0.4);
    const up = new THREE.PlaneGeometry(D, H - L.panelTop - 0.8); up.rotateY(s > 0 ? Math.PI : 0); up.translate(XM, (H + L.panelTop + 0.8) / 2, zw - s * 0.02); put(M.brick, up);
  }
  box(M.greyBrick, 1, H, 2 * W, X1 + 0.5, H / 2, 0);
  box(M.band, 0.8, L.lowerBand, 2 * W - 2, X1 - 0.6, L.lowerBand / 2, 0);
  for (const z of [-28, 28]) box(M.team, 0.6, L.panelTop - L.lowerBand, 14, X1 - 0.7, (L.panelTop + L.lowerBand) / 2, z);
  // sponsor and team name boards: team name over the back wall, sponsor boards high on the side walls
  quad(M.signs, X1 - 0.8, 39, 0, 40, 5, -1, 0, atlasUV(0));
  [[-20, 1], [10, 2], [40, 3], [70, 4]].forEach(([x, k]) => quad(M.signs, x, 38.5, -W + 0.9, 18, 2.6, 0, 1, atlasUV(k)));
  [[-20, 5], [10, 6], [40, 1], [70, 2]].forEach(([x, k]) => quad(M.signs, x, 38.5, W - 0.9, 18, 2.6, 0, -1, atlasUV(k)));
  quad(M.signs, X0 + 14, 26, -W + 0.85, 9, 2.2, 0, 1, atlasUV(0)); quad(M.signs, X0 + 14, 26, W - 0.85, 9, 2.2, 0, -1, atlasUV(0));

  // ---------------------------------------------------------------- front: door opening, raised roller door with windows, pit building facade
  const OW = W;   // the door opening is the full garage width
  box(M.facadeDark, 2, H - L.rollerDoor.y, 2 * OW + 8, X0 - 1, (H + L.rollerDoor.y) / 2, 0);                  // header
  for (const s of [-1, 1]) box(M.facade, 4, H, 4, X0 - 1, H / 2, s * (OW + 2));                                // door pillars
  box(M.galv, 5, 5, 2 * OW, X0 + 2.5, H - 3, 0);                                                                // roller door drum
  { const d = new THREE.PlaneGeometry(2 * OW - 0.4, H - 3 - L.rollerDoor.y); d.rotateY(-Math.PI / 2); d.translate(X0 + 0.3, (H - 3 + L.rollerDoor.y) / 2, 0); put(M.door, d); }
  for (const s of [-1, 1]) box(M.galv, 1, L.rollerDoor.y, 1.2, X0 + 0.6, L.rollerDoor.y / 2, s * (OW - 0.6));      // door guide rails
  // neighbouring garages: closed shutters between pillars, then the glazed upper floor that overhangs the pit lane
  for (const s of [-1, 1]) {
    for (let k = 0; k < 2; k++) {
      const zc = s * (OW + 4 + 38 + k * 80);
      box(M.facade, 4, H, 4, X0 - 1, H / 2, zc + s * 40);
      const sh = new THREE.PlaneGeometry(76, L.rollerDoor.y + 4); sh.rotateY(-Math.PI / 2); sh.translate(X0 - 0.5, (L.rollerDoor.y + 4) / 2, zc); sh.attributes.uv.array.forEach((v, i, a) => { if (i % 2) a[i] = v * 4; else a[i] = v * 3; }); put(M.slats, sh);
      box(M.facadeDark, 2, H - L.rollerDoor.y - 4, 76, X0 - 1, (H + L.rollerDoor.y + 4) / 2, zc);
    }
  }
  const FL = 2 * (OW + 4 + 160);
  box(M.facade, 18, 4, FL, X0 - 8, H + 2, 0);                                     // first floor slab edge
  { const gl = new THREE.BoxGeometry(2, 26, FL); gl.translate(X0 - 16, H + 17, 0); put(M.glass, gl); }
  box(M.facadeDark, 30, 2, FL, X0 - 4, H + 31, 0);                                // roof
  box(M.facade, 0.6, 26, FL, X0 + 1, H + 17, 0);                                  // back of the upper floor (seen through the glass)
  for (let z = -FL / 2; z <= FL / 2; z += 20) box(M.alu, 0.4, 7, 0.4, X0 - 16.8, H + 7.5, z);   // balustrade posts
  box(M.alu, 0.4, 0.4, FL, X0 - 16.8, H + 11, 0);

  // ---------------------------------------------------------------- outside: pit lane apron, fast lane, pit wall with fence, stanchions
  const PL = L.pitLane, xa = X0 - PL.apron, xf = xa - PL.fastLane;
  { const ap = new THREE.PlaneGeometry(PL.apron + 0.1, PL.length); ap.rotateX(-Math.PI / 2); ap.translate(X0 - PL.apron / 2, 0.01, 0); put(M.lane, ap); }
  { const fl = new THREE.PlaneGeometry(PL.fastLane, PL.length); fl.rotateX(-Math.PI / 2); fl.translate(xa - PL.fastLane / 2, 0.0, 0); put(M.asphalt, fl); }
  box(M.whiteLine, 1.2, 0.05, PL.length, xa - 0.6, 0.04, 0);
  box(M.redLane, 10, 0.05, PL.length, xf + 5.5, 0.04, 0);                         // red strip along the pit wall side
  box(M.facade, 6, PL.wall * 10, PL.length, xf - 3, PL.wall * 5, 0);              // pit wall
  { const fz = new THREE.PlaneGeometry(PL.length, 32); fz.rotateY(Math.PI / 2); fz.translate(xf - 3, PL.wall * 10 + 16, 0); put(M.fence, fz); }
  for (let z = -PL.length / 2; z <= PL.length / 2; z += 30) box(M.galv, 0.8, 32, 0.8, xf - 3, PL.wall * 10 + 16, z);
  { const far = new THREE.PlaneGeometry(PL.length * 2, 120); far.rotateY(Math.PI / 2); far.translate(xf - 260, 40, 0); put(M.facadeDark, far); }   // grandstand mass beyond the track
  { const tr = new THREE.PlaneGeometry(250, PL.length * 2); tr.rotateX(-Math.PI / 2); tr.translate(xf - 130, -0.05, 0); put(M.asphalt, tr); }

  // ---------------------------------------------------------------- ceiling: slab, truss grid, ducts, cable trays, tube lights
  { const c = new THREE.PlaneGeometry(D, 2 * W); c.rotateX(Math.PI / 2); c.translate(XM, H, 0); put(M.ceiling, c); }
  for (let x = X0 + 15; x < X1; x += 30) box(M.dark, 3, 3, 2 * W, x, H - 1.5, 0);   // ceiling beams
  const DU = L.ducts;
  for (const z of DU.zs) {
    put(M.galv, CyX(DU.r, D - 6, XM, DU.y, z, 20));
    for (let x = X0 + 8; x < X1 - 4; x += 16) { put(M.galv, new THREE.TorusGeometry(DU.r + 0.08, 0.12, 6, 20).rotateY(Math.PI / 2).translate(x, DU.y, z)); put(M.dark, B(0.2, H - DU.y - DU.r, 0.2, x, (H + DU.y + DU.r) / 2, z)); }
  }
  const CT = L.cableTrays;
  for (const z of CT.zs) {
    for (const s of [-1, 1]) put(M.galv, B(D - 6, 0.8, 0.12, XM, CT.y, z + s * CT.width / 2));
    for (const dz of [-0.9, 0, 0.9]) put(M.black, CyX(0.32, D - 8, XM, CT.y + 0.1, z + dz, 8));
    for (let x = X0 + 10; x < X1 - 4; x += 20) put(M.dark, B(0.2, H - CT.y, 0.2, x, (H + CT.y) / 2, z));
  }

  // ---------------------------------------------------------------- instanced kinds (one InstancedMesh per part)
  const PROP = {};
  const place = {};   // kind -> list of Matrix4
  const at = (kind, x, z, a = 0, y = 0) => { (place[kind] || (place[kind] = [])).push(new THREE.Matrix4().makeRotationY(a).setPosition(x, y, z)); };
  // aluminium box truss segment (seg long along x, size square)
  {
    const S = L.truss.size, len = L.truss.seg, h = S / 2, list = [];
    for (const sy of [-h, h]) for (const sz of [-h, h]) list.push(CyX(0.2, len, 0, sy, sz, 8));
    const n = 4;
    for (let k = 0; k < n; k++) {
      const xa2 = -len / 2 + k * len / n, xb = xa2 + len / n;
      for (const sz of [-h, h]) list.push(rod([xa2, -h, sz], [xb, h, sz], 0.08, 5));          // side faces
      for (const sy of [-h, h]) list.push(rod([xa2, sy, -h], [xb, sy, h], 0.08, 5));          // top / bottom faces
    }
    list.push(rod([-len / 2, -h, -h], [-len / 2, h, -h], 0.1, 5), rod([-len / 2, -h, h], [-len / 2, h, h], 0.1, 5));
    PROP.truss = [[M.alu, merged(list)]];
    const TR = L.truss;
    for (const z of TR.runsX) for (let x = X0 + 2 + len / 2; x < X1 - 2; x += len) at('truss', x, z, 0, TR.y);
    for (const x of TR.runsZ) for (let z = -W + 1 + len / 2; z < W - 1; z += len) at('truss', x, z, Math.PI / 2, TR.y + S);
    for (const z of TR.runsX) for (let x = X0 + 12; x < X1; x += 40) put(M.dark, B(0.15, H - TR.y - S / 2, 0.15, x, (H + TR.y + S / 2) / 2, z));
  }
  // tube light fixture: housing with a diffuser lip and two tubes
  const TL = L.tubeLights;
  PROP.tubeLight = [[M.housing, merged([B(TL.length, 0.5, 1.6, 0, 0.35, 0), B(TL.length, 0.25, 0.15, 0, 0, -0.75), B(TL.length, 0.25, 0.15, 0, 0, 0.75)])], [M.tube, merged([CyX(0.2, TL.length - 0.6, 0, -0.02, -0.38, 8), CyX(0.2, TL.length - 0.6, 0, -0.02, 0.38, 8)])]];
  for (const z of TL.zs) for (let x = TL.x0; x <= TL.x1; x += TL.step) at('tubeLight', x, z, 0, TL.y);
  for (const x of L.truss.runsZ) for (const z of [-6, 6]) at('tubeLight', x + 1.5, z, Math.PI / 2, L.truss.y + 2 * L.truss.size + 0.6);
  // built-in wall unit: drawer base with worktop, open wall panel, upper cupboard
  PROP.wallUnit = [
    [M.team, merged([B(9, 9.2, 6, 0, 5.6, 3), B(9, 8.5, 4, 0, 27.5, 2)])],
    [M.band, merged([B(9.1, 1, 5.6, 0, 0.5, 3.1), B(9.4, 0.5, 6.6, 0, 10.45, 3.3)])],
    [M.dark, merged([...[0, 1, 2, 3].map(d => B(8.4, 0.12, 0.1, 0, 2.4 + d * 2.1, 6.02)), B(0.12, 8.2, 0.1, 0, 27.5, 4.02)])],
    [M.chrome, merged([...[0, 1, 2, 3].map(d => B(4.5, 0.22, 0.35, 0, 3.0 + d * 2.1, 6.2)), B(0.25, 2.4, 0.35, -0.6, 26, 4.2), B(0.25, 2.4, 0.35, 0.6, 26, 4.2)])],
  ];
  // helmet shelf: two shelves with three helmets
  {
    const helm = (x, y) => new THREE.SphereGeometry(1.45, 18, 12).scale(1, 1.05, 1.15).translate(x, y + 1.45, 1.6);
    const vis = (x, y) => new THREE.SphereGeometry(1.5, 18, 8, -Math.PI * 0.32, Math.PI * 0.64, Math.PI * 0.36, Math.PI * 0.2).scale(1, 1.05, 1.15).translate(x, y + 1.45, 1.6);
    const hs = [[-4.5, 13.3], [0, 13.3], [4.5, 13.3], [-2.2, 18.6], [2.2, 18.6]];
    PROP.helmetShelf = [[M.band, merged([B(16, 0.4, 3.4, 0, 13.3, 1.7), B(16, 0.4, 3.4, 0, 18.6, 1.7), B(16, 10, 0.3, 0, 17.5, 0.15)])], [M.team, merged(hs.map(([x, y]) => helm(x, y + 0.2)))], [M.visor, merged(hs.map(([x, y]) => vis(x, y + 0.2)))], [M.chrome, merged([B(0.3, 0.3, 3, -7.5, 12.9, 1.7), B(0.3, 0.3, 3, 7.5, 12.9, 1.7), B(0.3, 0.3, 3, -7.5, 18.2, 1.7), B(0.3, 0.3, 3, 7.5, 18.2, 1.7)])]];
  }
  // flight case (castor case with aluminium edges, corner caps, latches and handles)
  { const c = caseParts(8, 9, 6); PROP.flightCase = [[M.teamMatte, merged(c.body)], [M.alu, merged(c.alu)], [M.chrome, merged(c.caps)], [M.black, merged(c.dark)], [M.rubber, merged(c.wheels)], [M.dark, merged(c.forks)]]; }
  // 12 locker case: 6 by 2 doors with vents and handles
  {
    const w = 26, h = 13, d = 9, c = caseParts(w, h, d), doors = [], vents = [], handles = [];
    for (let i = 0; i < 6; i++) for (let j = 0; j < 2; j++) {
      const cx = -w / 2 + (i + 0.5) * w / 6, cy = c.y0 + (j + 0.5) * h / 2;
      doors.push(B(w / 6 - 0.55, h / 2 - 0.55, 0.25, cx, cy, d / 2 + 0.1));
      vents.push(B(w / 6 - 2.4, 1.6, 0.12, cx, cy + 1.3, d / 2 + 0.27));
      handles.push(B(0.3, 1.6, 0.35, cx + w / 12 - 0.9, cy - 0.8, d / 2 + 0.35));
    }
    PROP.lockerCase = [[M.teamMatte, merged([...c.body, ...doors])], [M.alu, merged(c.alu)], [M.chrome, merged([...c.caps, ...handles])], [M.black, merged([...c.dark, ...vents])], [M.rubber, merged(c.wheels)], [M.dark, merged(c.forks)]];
  }
  // drawer case with the lid open: five drawers, monitor in the lid, fold-out work shelf
  {
    const w = 10, h = 16, d = 7, c = caseParts(w, h, d), drawers = [], slots = [];
    for (let k = 0; k < 5; k++) { const cy = c.y0 + 0.6 + (k + 0.5) * (h - 1.2) / 5; drawers.push(B(w - 0.8, (h - 1.2) / 5 - 0.35, 0.25, 0, cy, d / 2 + 0.1)); slots.push(B(3.2, 0.5, 0.12, 0, cy + 0.6, d / 2 + 0.27)); }
    const lid = new THREE.BoxGeometry(w, 0.6, d).translate(0, 0.3, d / 2).rotateX(-1.75).translate(0, c.y1, -d / 2);
    const lidEdge = new THREE.BoxGeometry(w + 0.3, 0.3, d + 0.3).translate(0, 0.15, d / 2).rotateX(-1.75).translate(0, c.y1 + 0.02, -d / 2);
    const shelf = [B(w + 0.4, 0.4, 6, 0, c.y1 - 3, d / 2 + 3)], struts = [rod([-w / 2 + 0.4, c.y1 - 6.5, d / 2], [-w / 2 + 0.4, c.y1 - 3.2, d / 2 + 5.5], 0.12, 5), rod([w / 2 - 0.4, c.y1 - 6.5, d / 2], [w / 2 - 0.4, c.y1 - 3.2, d / 2 + 5.5], 0.12, 5)];
    const mon = new THREE.PlaneGeometry(w - 2, d - 2).rotateX(-1.75 + Math.PI / 2).translate(0, c.y1 + (d / 2) * Math.cos(1.75 - Math.PI / 2) + 0.2, -d / 2 + 0.42);
    PROP.drawerCase = [[M.teamMatte, merged([...c.body, ...drawers, lid, ...shelf])], [M.alu, merged([...c.alu, lidEdge])], [M.chrome, merged([...c.caps, ...struts])], [M.black, merged([...c.dark, ...slots])], [M.rubber, merged(c.wheels)], [M.dark, merged(c.forks)], [M.screen, mon]];
  }
  // tyre trolley frame (the four blanketed tyres are added per trolley below)
  {
    const wheels = [], frame = [B(10, 0.6, 9, 0, 1.6, 0)];
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) wheels.push(CyX(0.7, 0.5, sx * 4, 0.7, sz * 3.6, 12));
    frame.push(rod([-4.6, 1.6, -4.2], [-4.6, 16, -4.2], 0.22, 8), rod([-4.6, 1.6, 4.2], [-4.6, 16, 4.2], 0.22, 8), rod([-4.6, 16, -4.2], [-4.6, 16, 4.2], 0.22, 8), rod([-4.6, 9, -4.2], [-4.6, 9, 4.2], 0.15, 6));
    PROP.trolley = [[M.alu, merged(frame)], [M.rubber, merged(wheels)]];
    PROP.tyre = [[M.tyre, merged([Cy(3.4, 2.9, 0, 1.45, 0, 28), Cy(3.42, 0.1, 0, 2.95, 0, 28, 3.42)])], [M.dark, Cy(1.9, 3.0, 0, 1.5, 0, 20)]];
  }
  // gas cart: three bottles, gauge panel, coiled hose
  {
    const bottles = [-2.2, 0, 2.2].map(z => Cy(1.0, 10, -0.8, 7, z, 16)), caps = [-2.2, 0, 2.2].map(z => new THREE.SphereGeometry(1.0, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2).translate(-0.8, 12, z));
    const frame = [B(6, 0.5, 8, 0, 1.6, 0), rod([2.4, 1.6, -3.6], [2.4, 14, -3.6], 0.2, 6), rod([2.4, 1.6, 3.6], [2.4, 14, 3.6], 0.2, 6), rod([2.4, 14, -3.6], [2.4, 14, 3.6], 0.2, 6), B(1.6, 3, 7.5, 2.0, 11, 0)];
    const wheels = [CyZ(1.3, 0.6, 1.5, 1.3, -4.2, 16), CyZ(1.3, 0.6, 1.5, 1.3, 4.2, 16), CyZ(0.6, 0.4, -2.5, 0.6, -3, 10), CyZ(0.6, 0.4, -2.5, 0.6, 3, 10)];
    const gauges = [-2.7, -0.9, 0.9, 2.7].map(z => new THREE.CircleGeometry(0.75, 20).rotateY(Math.PI / 2).translate(2.85, 11.4, z));
    const rims = [-2.7, -0.9, 0.9, 2.7].map(z => new THREE.TorusGeometry(0.8, 0.12, 6, 20).rotateY(Math.PI / 2).translate(2.85, 11.4, z));
    const hose = [coil(3.2, 10, 2.5, -4.6, 0.9, 7, 0.14), new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(2.9, 10.2, 2.7), new THREE.Vector3(4, 8, 3.5), new THREE.Vector3(4.4, 3, 4.6), new THREE.Vector3(3.8, 0.4, 6.5)]), 24, 0.14, 6, false)];
    PROP.gasCart = [[M.bottle, merged([...bottles, ...caps])], [M.alu, merged(frame)], [M.rubber, merged([...wheels, ...hose])], [M.gauge, mergeGeometries(gauges)], [M.chrome, merged(rims)]];
  }
  // fuel drum with rolling hoops and bungs
  PROP.fuelDrum = [[M.red, Cy(2.9, 8.8, 0, 4.4, 0, 24)], [M.chrome, merged([new THREE.TorusGeometry(2.92, 0.12, 6, 24).rotateX(Math.PI / 2).translate(0, 3, 0), new THREE.TorusGeometry(2.92, 0.12, 6, 24).rotateX(Math.PI / 2).translate(0, 6, 0), Cy(0.35, 0.3, 1.4, 8.9, 0, 10), Cy(0.25, 0.3, -1.6, 8.9, 0.6, 10)])]];
  // extinguisher stand: base, post, sign board, two extinguishers
  PROP.extinguisherStand = [
    [M.red, merged([Cy(0.85, 5.2, -1.3, 3.4, 0.6, 14), Cy(0.85, 5.2, 1.3, 3.4, 0.6, 14), B(4.2, 3, 0.3, 0, 13.5, 0)])],
    [M.dark, merged([B(5, 0.4, 3, 0, 0.2, 0), B(0.5, 15, 0.5, 0, 7.5, -0.5), Cy(0.3, 0.9, -1.3, 6.4, 0.6, 8), Cy(0.3, 0.9, 1.3, 6.4, 0.6, 8)])],
    [M.black, merged([rod([-1.3, 6.6, 0.6], [-2.0, 4, 1.1], 0.12, 5), rod([1.3, 6.6, 0.6], [2.0, 4, 1.1], 0.12, 5)])],
  ];
  // director chair: X legs, canvas seat and back, arm rests
  PROP.directorChair = [
    [M.alu, merged([rod([-2.2, 0, -2.2], [-2.2, 7, 2.2], 0.16, 6), rod([-2.2, 0, 2.2], [-2.2, 7, -2.2], 0.16, 6), rod([2.2, 0, -2.2], [2.2, 7, 2.2], 0.16, 6), rod([2.2, 0, 2.2], [2.2, 7, -2.2], 0.16, 6),
      rod([-2.2, 7, -2.2], [-2.2, 12.5, -2.4], 0.16, 6), rod([2.2, 7, -2.2], [2.2, 12.5, -2.4], 0.16, 6), rod([-2.2, 9.5, -2.2], [-2.2, 9.5, 2.2], 0.14, 6), rod([2.2, 9.5, -2.2], [2.2, 9.5, 2.2], 0.14, 6), rod([-2.2, 2.4, 0], [2.2, 2.4, 0], 0.12, 6)])],
    [M.cloth, merged([B(4.4, 0.15, 4.2, 0, 7.1, 0), B(4.4, 2.6, 0.15, 0, 11.2, -2.35)])],
  ];
  // bar stool: padded seat, splayed chrome legs, foot ring
  PROP.barStool = [[M.seat, Cy(1.75, 1.0, 0, 7.6, 0, 22, 1.65)], [M.chrome, merged([rod([1.6, 0, 1.6], [0.7, 7.1, 0.7], 0.12, 6), rod([-1.6, 0, 1.6], [-0.7, 7.1, 0.7], 0.12, 6), rod([1.6, 0, -1.6], [0.7, 7.1, -0.7], 0.12, 6), rod([-1.6, 0, -1.6], [-0.7, 7.1, -0.7], 0.12, 6), new THREE.TorusGeometry(1.45, 0.1, 6, 20).rotateX(Math.PI / 2).translate(0, 2.8, 0), Cy(1.3, 0.3, 0, 7.0, 0, 16)])]];
  // racing seat style chair
  PROP.racingSeat = [[M.seat, merged([B(5, 1.5, 5, 0, 5, 0), B(5, 8, 1.2, 0, 9.5, -2.4), B(1, 3, 5, -2.5, 6.5, 0), B(1, 3, 5, 2.5, 6.5, 0)])], [M.accent, merged([B(1.4, 7.6, 1.25, 0, 9.6, -2.38)])], [M.chrome, merged([Cy(0.3, 3.4, 0, 2.4, 0, 8), ...[0, 1, 2, 3, 4].map(k => rod([0, 0.6, 0], [Math.cos(k * 1.2566) * 3, 0.4, Math.sin(k * 1.2566) * 3], 0.15, 5))])]];
  // pillar TV by the door with live timing
  PROP.pillarTV = [[M.team, B(3, H, 3, 0, H / 2, 0)], [M.dark, B(7, 4.4, 0.5, 0, 27, 1.8)], [M.timing, new THREE.PlaneGeometry(6.4, 3.8).translate(0, 27, 2.08)]];
  // stanchions with belts in front of the garages
  PROP.stanchion = [[M.chrome, merged([Cy(0.3, 9.5, 0, 4.75, 0, 10), Cy(1.6, 0.4, 0, 0.2, 0, 18, 1.8), Cy(0.5, 0.6, 0, 9.6, 0, 10)])]];
  const stanX = X0 - 14;
  for (let z = -150; z <= 150; z += 12) if (Math.abs(z) > W + 4) at('stanchion', stanX, z);
  for (const s of [-1, 1]) box(M.accent, 0.12, 0.9, 150 - W - 4, stanX, 8.8, s * (W + 4 + (150 - W - 4) / 2));

  // props from the layout
  const blankets = [];
  for (const p of L.props) {
    const [px, pz] = p.at, a = p.rot || 0, n = p.count || 1;
    for (let k = 0; k < n; k++) {
      const [x, z] = rot(k * (p.step || 0), 0, px, pz, a);
      if (p.kind === 'tyreTrolley') {
        at('trolley', x, z, a);
        (p.labels || LABELS).forEach((lab, li) => {
          const y = 2.0 + li * 3.05; at('tyre', x, z, a + li * 0.7, y);
          const row = Math.max(0, LABELS.indexOf(lab));
          const bl = new THREE.CylinderGeometry(3.55, 3.55, 2.7, 32, 1, true);
          const uv = bl.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setY(i, 1 - (row + 1) / 4 + uv.getY(i) * 0.25);
          bl.rotateY(a + li * 0.9).translate(x, y + 1.45, z); blankets.push(bl);
        });
        { const top = new THREE.RingGeometry(1.9, 3.55, 32).rotateX(-Math.PI / 2).translate(x, 2.0 + 4 * 3.05 + 0.02 - 0.12, z); const uv = top.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, 0.02, 0.99); blankets.push(top); }
      } else if (PROP[p.kind]) at(p.kind, x, z, p.kind === 'pillarTV' ? (z < 0 ? 0 : Math.PI) : a);
      if (p.kind === 'extinguisherStand') quad(M.signs, x + Math.sin(a) * 0.17, 13.5, z + Math.cos(a) * 0.17, 4.0, 1.0, Math.sin(a), Math.cos(a), [0, 1 - 8 / 8, 0.5, 1 - 7 / 8]);
    }
  }
  if (blankets.length) { const bm = new THREE.Mesh(mergeGeometries(blankets), M.blanket); bm.name = 'Garage_Tyre_Blankets'; bm.castShadow = true; bm.receiveShadow = true; g.add(bm); }
  for (const [kind, mats] of Object.entries(place)) {
    PROP[kind].forEach(([mat, geo], pi) => {
      const im = new THREE.InstancedMesh(geo, mat, mats.length);
      mats.forEach((m, i) => im.setMatrixAt(i, m));
      im.name = `Garage_${kind}_${pi}`; im.castShadow = !['truss', 'tubeLight'].includes(kind); im.receiveShadow = true; im.computeBoundingSphere(); g.add(im);
    });
  }

  // ---------------------------------------------------------------- light canopy over the car: team colour frame, black band, glowing panel, air lines
  const C = L.canopy, CW = C.x1 - C.x0, CX = (C.x0 + C.x1) / 2, CHW = C.halfWidth;
  {
    const t = 1.6, top = C.y + C.depth;
    for (const s of [-1, 1]) {
      box(M.team, CW + 2 * t, C.depth * 0.55, t, CX, top - C.depth * 0.275, s * (CHW + t / 2));
      box(M.band, CW + 2 * t, C.depth * 0.45, t, CX, C.y + C.depth * 0.225, s * (CHW + t / 2));
      box(M.team, t, C.depth * 0.55, 2 * CHW, CX + s * (CW / 2 + t / 2), top - C.depth * 0.275, 0);
      box(M.band, t, C.depth * 0.45, 2 * CHW, CX + s * (CW / 2 + t / 2), C.y + C.depth * 0.225, 0);
    }
    box(M.dark, CW, 0.3, 2 * CHW, CX, top - 0.15, 0);
    { const p = new THREE.PlaneGeometry(CW - 0.4, 2 * CHW - 0.4); p.rotateX(Math.PI / 2); p.translate(CX, C.y + 0.4, 0); put(M.canopyPanel, p); }
    for (let x = C.x0 + 9; x < C.x1 - 4; x += 9) box(M.dark, 0.25, 0.4, 2 * CHW, x, C.y + 0.5, 0);   // panel ribs
    for (const x of [C.x0 + 3, C.x1 - 3]) for (const z of [-CHW + 1, CHW - 1]) put(M.galv, rod([x, top, z], [x, L.truss.y - L.truss.size / 2, Math.sign(z) * 13], 0.08, 4));
    // number boards at the ends of the canopy (team name on the atlas)
    quad(M.signs, C.x0 - t - 0.05, C.y + C.depth * 0.7, 0, 12, 1.2, -1, 0, atlasUV(0)); quad(M.signs, C.x1 + t + 0.05, C.y + C.depth * 0.7, 0, 12, 1.2, 1, 0, atlasUV(0));
    // coiled air lines hanging from the canopy (wheel guns and jacks)
    const hoses = [], yel = [];
    [[C.x0 + 4, -CHW + 2], [C.x0 + 4, CHW - 2], [C.x1 - 6, -CHW + 2], [C.x1 - 6, CHW - 2], [CX, -CHW + 1.5], [CX, CHW - 1.5]].forEach(([x, z], k) => (k % 3 === 2 ? yel : hoses).push(coil(x, C.y, 15 + (k % 2) * 3, z, 0.85, 8)));
    put(M.rubber, mergeGeometries(hoses)); put(M.yellowHose, mergeGeometries(yel));
  }

  // ---------------------------------------------------------------- engineers' desk with the monitor wall, regulations monitor and printed sheet
  const DK = L.desk, [dx, dz] = DK.at;
  box(M.band, DK.depth, 0.5, DK.length, dx, DK.height, dz);
  box(M.team, 0.6, DK.height - 0.3, DK.length, dx - DK.depth / 2 + 0.3, (DK.height - 0.3) / 2, dz);
  for (const s of [-1, 1]) box(M.dark, DK.depth - 1, DK.height, 0.6, dx, DK.height / 2, dz + s * (DK.length / 2 - 0.5));
  const MW = DK.monitorWall, mwX = X1 - 0.9;
  box(M.band, 0.6, MW.rows * (MW.h + 0.9) + 1.4, MW.cols * (MW.w + 0.9) + 1.4, mwX, 17 + (MW.rows - 1) * (MW.h + 0.9) / 2, dz);
  for (let r = 0; r < MW.rows; r++) for (let c = 0; c < MW.cols; c++) {
    const cz = dz - (MW.cols - 1) / 2 * (MW.w + 0.9) + c * (MW.w + 0.9), cy = 17 + r * (MW.h + 0.9);
    box(M.dark, 0.5, MW.h + 0.45, MW.w + 0.45, mwX - 0.5, cy, cz);
    quad((r + c) % 3 === 1 ? M.timing : M.screen, mwX - 0.8, cy, cz, MW.w, MW.h, -1, 0);
  }
  const team = () => T().name;
  const regMon = canvasTex(1024, 768, (x, w, h) => drawRegulations(x, w, h, { dark: true, team: team() }), { aniso: 16 });
  const regSheet = canvasTex(768, 1024, (x, w, h) => drawRegulations(x, w, h, { dark: false, team: team() }), { aniso: 16 });
  const mon = new THREE.Mesh(new THREE.PlaneGeometry(8, 6), std({ map: regMon, emissive: 0xffffff, emissiveMap: regMon, emissiveIntensity: 0.9 }));
  mon.rotation.y = -Math.PI / 2; mon.position.set(dx + 1.5, DK.height + 4.6, dz - 6); mon.name = 'Garage_Desk_Monitor'; mon.userData.click = 'regulations'; g.add(mon);
  box(M.dark, 0.5, 6.6, 8.6, dx + 1.85, DK.height + 4.6, dz - 6); box(M.dark, 0.5, 3, 0.5, dx + 2, DK.height + 1.5, dz - 6); box(M.dark, 2.5, 0.3, 2.5, dx + 2, DK.height + 0.4, dz - 6);
  for (const oz of [3, 11]) { box(M.dark, 0.5, 4.6, 6.6, dx + 1.85, DK.height + 3.6, dz + oz); quad(M.screen, dx + 1.55, DK.height + 3.6, dz + oz, 6, 4, -1, 0); box(M.dark, 0.5, 2, 0.5, dx + 2, DK.height + 1, dz + oz); }
  const sheet = new THREE.Mesh(new THREE.PlaneGeometry(2.1, 2.97), std({ map: regSheet, roughness: 0.9 }));
  sheet.rotation.set(-Math.PI / 2, 0, Math.PI / 2 + 0.2); sheet.position.set(dx - 1, DK.height + 0.27, dz + 2); sheet.name = 'Garage_Regs_Sheet'; sheet.userData.click = 'regulations'; g.add(sheet);
  box(M.dark, 2.4, 0.15, 3.4, dx - 1.2, DK.height + 0.33, dz + 7.2); quad(M.screen, dx + 0.05, DK.height + 1.5, dz + 7.2, 3.4, 2.2, -1, 0);
  g.userData.clickables = [mon, sheet];
  g.userData.deskView = { target: [dx + 1, DK.height + 3, dz - 2], pos: [dx - 22, DK.height + 9, dz - 2] };

  // ---------------------------------------------------------------- car stands and jacks (shown when the wheels are off, placed from the car)
  const stands = new THREE.Group(); stands.name = 'Garage_Car_Stands'; stands.visible = false;
  {
    // corner stand: tripod, post and hub cup, 1 unit tall (scaled to the hub height when placed)
    const legs = [0, 1, 2].map(k => rod([Math.cos(k * 2.094) * 2.2, 0, Math.sin(k * 2.094) * 2.2], [0, 0.25, 0], 0.14, 6));
    const post = Cy(0.32, 1, 0, 0.5, 0, 10), cup = Cy(0.75, 0.6, 0, 1.0, 0, 14, 0.55);
    const standRed = std({ color: 0xc8161d, roughness: 0.35, metalness: 0.3 });
    M.standRed = standRed;
    const legI = new THREE.InstancedMesh(merged(legs), M.chrome, 4), postI = new THREE.InstancedMesh(merged([post, cup]), standRed, 4);
    legI.name = 'Garage_Stand_Legs'; postI.name = 'Garage_Stand_Posts'; legI.castShadow = postI.castShadow = true;
    stands.add(legI, postI);
    // front and rear jacks: low frame on two wheels, saddle, long handle angled out
    const jack = (dir) => merged([B(6, 0.8, 3, 0, 0.9, 0), CyZ(0.8, 0.5, -2.5, 0.8, -1.7, 12), CyZ(0.8, 0.5, -2.5, 0.8, 1.7, 12), CyZ(0.8, 0.5, 2.5, 0.8, -1.7, 12), CyZ(0.8, 0.5, 2.5, 0.8, 1.7, 12), B(3, 0.5, 5, 0, 2.4, 0), B(0.6, 1.6, 0.6, 0, 1.6, 0), rod([dir * 2.8, 1.2, 0], [dir * 16, 9, 0], 0.28, 8), rod([dir * 16, 9, -1.8], [dir * 16, 9, 1.8], 0.25, 8)]);
    const fj = new THREE.Mesh(jack(-1), standRed), rj = new THREE.Mesh(jack(1), standRed); fj.name = 'Garage_Front_Jack'; rj.name = 'Garage_Rear_Jack'; fj.castShadow = rj.castShadow = true;
    stands.add(fj, rj);
    stands.userData.place = (hubs, raise, carBox) => {
      const m4 = new THREE.Matrix4(), q = new THREE.Quaternion();
      hubs.slice(0, 4).forEach((h, i) => {
        const ht = Math.max(0.5, h.y - 0.7);
        legI.setMatrixAt(i, m4.makeTranslation(h.x, 0, h.z));
        postI.setMatrixAt(i, m4.compose(new THREE.Vector3(h.x, 0, h.z), q, new THREE.Vector3(1, ht, 1)));
      });
      legI.instanceMatrix.needsUpdate = postI.instanceMatrix.needsUpdate = true; legI.computeBoundingSphere(); postI.computeBoundingSphere();
      fj.position.set(carBox.min.x + 1.5, Math.max(0, raise - 1.6), (carBox.min.z + carBox.max.z) / 2);
      rj.position.set(carBox.max.x - 1.0, Math.max(0, raise - 1.6), (carBox.min.z + carBox.max.z) / 2);
    };
  }
  g.add(stands);
  g.userData.stands = stands;

  // ---------------------------------------------------------------- merge the static shell and the textured quads
  for (const [mat, list] of parts) {
    const withUv = list.every(x => x.attributes.uv);
    const m = new THREE.Mesh(mergeGeometries(list.map(x => { const n = x.index ? x.toNonIndexed() : x; if (!withUv && n.attributes.uv) n.deleteAttribute('uv'); return n; })), mat);
    m.receiveShadow = true; m.castShadow = ![M.tube, M.canopyPanel, M.fence, M.glass].includes(mat); m.name = 'Garage_Shell'; m.layers.enable(SHELL_LAYER); g.add(m);
  }
  for (const [mat, list] of quads) { const m = new THREE.Mesh(mergeGeometries(list), mat); m.name = 'Garage_Boards'; m.receiveShadow = true; g.add(m); }

  // ---------------------------------------------------------------- lights: soft area lights, a shadow casting spot over the car, sun outside
  const lights = [];
  const hemi = new THREE.HemisphereLight(0xf2f5ff, 0x5c6066, 0.28); lights.push(hemi);
  const area = (w, h, x, y, z, I) => { const r = new THREE.RectAreaLight(0xf4f7ff, I, w, h); r.position.set(x, y, z); r.lookAt(x, 0, z); lights.push(r); return r; };
  area(CW - 1, 2 * CHW - 1, CX, C.y + 0.2, 0, 4.0);                         // the canopy panel
  for (const z of [-25, 25]) area(TL.x1 - TL.x0, 9, (TL.x0 + TL.x1) / 2, TL.y - 0.4, z, 1.5);   // tube light rows
  area(30, 10, 92, TL.y - 0.4, 0, 2.2);                                     // over the desk
  const spot = new THREE.SpotLight(0xffffff, 1.6, 0, 0.95, 1.0, 0);
  spot.position.set(CX, C.y - 0.5, 0); spot.target.position.set(CX, 0, 0); spot.castShadow = true;
  spot.shadow.mapSize.set(2048, 2048); spot.shadow.bias = -0.0004; spot.shadow.normalBias = 0.02; spot.shadow.camera.near = 4; spot.shadow.camera.far = 60;
  lights.push(spot, spot.target);
  const sun = new THREE.DirectionalLight(0xfff1dc, 1.1);
  sun.position.set(X0 - 260, 300, -140); sun.target.position.set(X0 - 40, 0, 0); sun.castShadow = true;
  Object.assign(sun.shadow.camera, { left: -260, right: 260, top: 260, bottom: -260, near: 10, far: 1000 }); sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.05;
  sun.shadow.camera.layers.set(SHELL_LAYER);   // sunlight only needs the walls, roof and facade to cast shadows (keeps the car out of this pass)
  lights.push(sun, sun.target);
  lights.forEach(l => g.add(l));
  g.userData.lights = lights;

  // every garage object is also seen by the floor mirror
  g.traverse(o => { if (o !== mirror) o.layers.enable(REFLECT_LAYER); });

  // ---------------------------------------------------------------- environment map captured from the garage (reflections on paint, floor and metal)
  let envRT = null;
  g.userData.captureEnv = (renderer, scene, hide = []) => {
    const cubeRT = new THREE.WebGLCubeRenderTarget(256, { type: THREE.HalfFloatType });
    const cam = new THREE.CubeCamera(1, 2000, cubeRT); cam.position.set(18, 14, 0);
    const vis = hide.map(o => o.visible); hide.forEach(o => (o.visible = false)); if (mirror) mirror.visible = false;
    cam.update(renderer, scene);
    hide.forEach((o, i) => (o.visible = vis[i])); if (mirror) mirror.visible = true;
    const pm = new THREE.PMREMGenerator(renderer); envRT = pm.fromCubemap(cubeRT.texture); pm.dispose(); cubeRT.dispose();
    return envRT.texture;
  };

  g.userData.setTeam = (id) => {
    teamId = GARAGE_TEAM_COLORS[id] ? id : 'red-bull';
    M.team.color.set(T().panel); M.teamMatte.color.set(T().panel); M.accent.color.set(T().accent);
    for (const t of [regMon, regSheet, atlasTex, blanketTex]) redraw(t);
  };
  g.userData.setReflections = (on) => { if (mirror) { mirror.visible = on; M.floor.opacity = on ? 1 - F.reflect : 1; M.floor.transparent = on; M.floor.needsUpdate = true; } };
  g.userData.layout = L;
  g.userData.mirror = mirror;
  /** free every geometry, material, texture and render target of the garage (called when leaving the garage) */
  g.userData.dispose = () => {
    const mats = new Set(), texs = new Set();
    g.traverse(o => {
      if (o.geometry) o.geometry.dispose();
      if (o.isInstancedMesh) o.dispose();
      if (o.isLight && o.shadow?.map) o.shadow.map.dispose();
      (Array.isArray(o.material) ? o.material : o.material ? [o.material] : []).forEach(m => mats.add(m));
    });
    Object.values(M).forEach(m => mats.add(m));
    mats.forEach(m => { for (const k of ['map', 'emissiveMap', 'normalMap', 'roughnessMap', 'bumpMap', 'alphaMap']) if (m[k]) texs.add(m[k]); m.dispose(); });
    texs.forEach(t => t.dispose());
    if (mirror) mirror.dispose?.();
    if (envRT) envRT.dispose();
    g.removeFromParent();
  };
  return g;
}
