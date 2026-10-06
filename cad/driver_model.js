/**
 * driver_model.js: reusable racing driver for the 2026 Nimble Car (and the other teams in the game).
 * SREdesigns - Samuel R Erwin III
 *
 * Built to Samuel's round 4 references (refs/round4/driver D1 to D6, the Mercedes parts kit, and R9):
 *  - reclined F1 seating: hips low in the seat, legs stretched forward and up to the pedals with the
 *    knees slightly bent, torso laid back, neck bent forward so the head stays upright and looks ahead
 *  - smooth rounded limbs (no boxes), race suit with team colours, gloves whose fingers wrap the wheel
 *    grips and thumbs rest on the front of the wheel, boots on the pedals, helmet with visor and top
 *    vents, HANS collar at the back of the cockpit against the headrest (D6), carbon seat and harness
 *
 * Everything is driven by DRIVER_DEFAULTS (proportions, pose and colours) so another team or driver
 * only needs different settings. applyTeam(team) on the returned group recolours suit, gloves, boots
 * and helmet from a teams.js F1_TEAMS entry.
 *
 * Car frame, decimetres: X nose to tail (front axle 0), Y = car right, Z up. The driver group sits at
 * the car origin with no rotation, so all positions below are car positions.
 *
 * Exports (same names as before so the cockpit wiring stays): createArticulatedDriver,
 * createCarbonBeadSeatShell, updateDriverKinematics, solveTwoLinkArmIK, plus DRIVER_DEFAULTS,
 * driverSettingsFromTeam and computeDriverPose.
 */

import * as THREE from 'three';
import { materials as defaultMaterials } from '../materials.js';
import { createDriverHelmet, helmetTexture } from './driver_helmet.js';
import { sweepGeometry } from './sweep_section.js';

const V3 = (x, y, z) => new THREE.Vector3(x, y, z);

// =========================================================================
// 1. SETTINGS
// =========================================================================

export const DRIVER_DEFAULTS = {
  team: 'red-bull',
  // Proportions: a 1.75 m driver (dm). Segment lengths are joint to joint.
  body: {
    torso: 4.5,          // hip joint line to the base of the neck (C7)
    hipHalf: 0.85,       // hip joints either side of the centre line
    shoulderHalf: 1.72,  // shoulder joints either side of the centre line
    upperArm: 2.8, forearm: 2.55,
    thigh: 4.15, shin: 4.1,
  },
  pose: {
    helmetCentre: [13.75, 0, 5.2], // R9 / D4: low in the tub, just the helmet above the cockpit edge
    neckToHead: [-0.55, 1.65],     // C7 to head centre (x, z): the neck leans forward, head upright
    hipZ: 1.55,                    // hip joint height: seat pan on the tub floor
    footPitch: 1.22,               // rad from horizontal: soles face the pedals, toes up (D1)
    elbowHint: [0, 0.22, -1],      // elbows drop down and slightly out (y is mirrored per side)
    kneeHint: [0, 0.12, 1],        // knees rise (D1)
  },
  suit: { base: '#18245e', panel: '#d0021b', accent: '#f6c200', trim: '#ffffff', logo: 'Red Bull' },
  glove: '#14171c',
  boot: '#131417',
  helmet: { colours: { base: '#18245e', crown: '#f6c200', stripe: '#d0021b', accent: '#ffffff' } },
};

const hex = (n) => '#' + (n >>> 0).toString(16).padStart(6, '0');

/** Settings for a teams.js F1_TEAMS entry (falls back to the defaults for anything missing). */
export function driverSettingsFromTeam(team) {
  if (!team) return DRIVER_DEFAULTS;
  const d = DRIVER_DEFAULTS;
  return {
    ...d,
    team: team.id || d.team,
    suit: {
      base: team.driverSuit?.base || (team.bodyColor !== undefined ? hex(team.bodyColor) : d.suit.base),
      panel: team.driverSuit?.panel || (team.stripeColor !== undefined ? hex(team.stripeColor) : d.suit.panel),
      accent: team.driverSuit?.accent || (team.accentColor !== undefined ? hex(team.accentColor) : d.suit.accent),
      trim: team.driverSuit?.trim || '#ffffff',
      logo: team.driverSuit?.logo || (team.id === 'red-bull' ? 'Red Bull' : (team.shortName || '')),
    },
    // gloves stay black (D2, D3) unless the team runs light gloves (e.g. white)
    glove: team.driverGlove?.color !== undefined && new THREE.Color(team.driverGlove.color).getHSL({}).l > 0.6 ? hex(team.driverGlove.color) : d.glove,
    boot: team.driverSuit?.boot || d.boot,
    helmet: { colours: team.driverHelmetColours || d.helmet.colours },
  };
}

// =========================================================================
// 2. POSE (all joint positions, car frame)
// =========================================================================

/** Wheel-local glove layout (PCU-8D grips: axis along local Y at x = +-1.64, z 0.04, radii 0.24 x 0.28). */
export const GLOVE_ON_WHEEL = { gripX: 1.64, gripZ: 0.04, gripRx: 0.24, gripRz: 0.28, handY: -0.05, wrist: [1.98, -0.13, 0.42] };

export function computeDriverPose(settings = DRIVER_DEFAULTS) {
  const B = settings.body, P = settings.pose;
  const head = V3(...P.helmetCentre);
  const c7 = V3(head.x - P.neckToHead[0], 0, head.z - P.neckToHead[1]);
  const rise = c7.z - P.hipZ;
  const theta = Math.asin(THREE.MathUtils.clamp(rise / B.torso, -1, 1)); // torso angle from horizontal
  const u = V3(Math.cos(theta), 0, Math.sin(theta));   // up the spine (rearward and up)
  const n = V3(-Math.sin(theta), 0, Math.cos(theta));  // out of the chest (forward and up)
  const hip = c7.clone().addScaledVector(u, -B.torso);
  const shoulder = c7.clone().addScaledVector(u, -0.42).addScaledVector(n, 0.15);
  const f = V3(-Math.cos(P.footPitch), 0, Math.sin(P.footPitch)); // heel to toe
  const sole = V3(-Math.sin(P.footPitch), 0, -Math.cos(P.footPitch)); // out of the sole
  return { head, c7, hip, shoulder, u, n, theta, f, sole };
}

// =========================================================================
// 3. FABRIC TEXTURES (race suit, gloves, boots)
//    Colour maps carry the stitched panel layout, piping, elastic cuffs and sponsor patches.
//    Normal maps (made from a height field) carry the Nomex weave, stitch lines and the fold
//    and crease wrinkles at the waist, shoulders, elbows and knees (ref D2).
// =========================================================================

const SPONSORS = { chest: ['ORACLE', 'Mobil 1'], belt: 'TAG HEUER', arm: ['ORACLE', 'Bybit'], leg: ['Mobil 1', 'Red Bull'] };

function makeCanvas(w, h) { const cv = document.createElement('canvas'); cv.width = w; cv.height = h; return cv; }
function texFrom(cv, srgb = true) {
  const t = new THREE.CanvasTexture(cv); if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8; t.wrapS = THREE.RepeatWrapping; return t;
}

/** Small sponsor patch, rotated (rot in radians) about its centre. */
function patch(g, x, y, w, h, text, { bg = '#ffffff', fg = '#18245e', rot = 0, font = '800', border = null } = {}) {
  g.save(); g.translate(x, y); g.rotate(rot);
  g.fillStyle = bg; const r = Math.min(w, h) * 0.18;
  g.beginPath(); g.roundRect ? g.roundRect(-w / 2, -h / 2, w, h, r) : g.rect(-w / 2, -h / 2, w, h); g.fill();
  if (border) { g.strokeStyle = border; g.lineWidth = Math.max(1.5, h * 0.06); g.stroke(); }
  g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
  let size = h * 0.62; g.font = `${font} ${size}px Arial, Helvetica, sans-serif`;
  while (g.measureText(text).width > w * 0.86 && size > 4) { size -= 1; g.font = `${font} ${size}px Arial, Helvetica, sans-serif`; }
  g.fillText(text, 0, h * 0.04); g.restore();
}
/** Dashed stitch line. */
function stitch(g, x0, y0, x1, y1, col = 'rgba(255,255,255,0.35)', dash = 5) {
  g.save(); g.strokeStyle = col; g.lineWidth = 1.4; g.setLineDash([dash, dash * 0.8]);
  g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); g.restore();
}
/** Ribbed elastic cuff band between canvas rows y0..y1. */
function ribbedCuff(g, w, y0, y1, col) {
  g.fillStyle = col; g.fillRect(0, y0, w, y1 - y0);
  g.fillStyle = 'rgba(0,0,0,0.28)'; for (let x = 0; x < w; x += 6) g.fillRect(x, y0, 2, y1 - y0);
}

/**
 * Height field -> tangent-space normal map. heightFn(x, y) returns 0..1 (x, y in pixels).
 * Includes a fine plain-weave Nomex texture everywhere.
 */
function normalMapFrom(w, h, heightFn, strength = 2.2) {
  const H = new Float32Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const weave = 0.03 * (((x >> 1) + (y >> 1)) & 1 ? 1 : -1) + 0.02 * Math.sin(x * 1.9) * Math.sin(y * 1.7);
    H[y * w + x] = heightFn(x, y) + weave;
  }
  const cv = makeCanvas(w, h), g = cv.getContext('2d'), img = g.createImageData(w, h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const xl = H[y * w + ((x - 1 + w) % w)], xr = H[y * w + ((x + 1) % w)];
    const yu = H[Math.max(0, y - 1) * w + x], yd = H[Math.min(h - 1, y + 1) * w + x];
    let nx = (xl - xr) * strength, ny = (yd - yu) * strength, nz = 1; // canvas y down = texture v down
    const l = Math.hypot(nx, ny, nz); nx /= l; ny /= l; nz /= l;
    const i = (y * w + x) * 4;
    img.data[i] = (nx * 0.5 + 0.5) * 255; img.data[i + 1] = (ny * 0.5 + 0.5) * 255; img.data[i + 2] = (nz * 0.5 + 0.5) * 255; img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  return texFrom(cv, false);
}

/** Wavy crease folds around a row yc (pixels): count folds spread over +-spread, depth amp. */
function creaseField(yc, spread, count, amp, seed, w) {
  const folds = [];
  for (let k = 0; k < count; k++) {
    const r = Math.sin(seed * 12.9898 + k * 78.233) * 43758.5453; const fr = r - Math.floor(r);
    folds.push({ y: yc + (k / Math.max(1, count - 1) - 0.5) * 2 * spread + (fr - 0.5) * spread * 0.4, ph: fr * 6.28, f: (2 + Math.floor(fr * 3)) * Math.PI * 2 / w, a: 4 + fr * 6, s: 3 + fr * 3, d: amp * (0.6 + 0.4 * fr) });
  }
  return (x, y) => {
    let v = 0;
    for (const F of folds) {
      const yy = y - F.y - F.a * Math.sin(x * F.f + F.ph);
      const side = 0.55 + 0.45 * Math.sin(x * Math.PI * 2 / w * 2 + F.ph); // folds fade round the limb
      v += F.d * side * Math.exp(-(yy * yy) / (F.s * F.s));
    }
    return v;
  };
}

// Torso map: u round the body (0 = spine, 0.25 / 0.75 = sides, 0.5 = chest), v seat (0) to collar (1).
const TORSO_W = 1024, TORSO_H = 512;
export function createSuitTorsoTexture(suit) {
  const w = TORSO_W, h = TORSO_H, cv = makeCanvas(w, h), g = cv.getContext('2d');
  const Y = (v) => h * (1 - v);
  g.fillStyle = suit.base; g.fillRect(0, 0, w, h);
  // side panels from the hips up under each arm, edged with yellow piping and stitching
  [0.25, 0.75].forEach((c) => {
    g.fillStyle = suit.panel; g.fillRect(w * (c - 0.05), 0, w * 0.1, h);
    g.fillStyle = suit.accent; g.fillRect(w * (c - 0.056), 0, w * 0.006, h); g.fillRect(w * (c + 0.05), 0, w * 0.006, h);
    stitch(g, w * (c - 0.062), 0, w * (c - 0.062), h); stitch(g, w * (c + 0.062), 0, w * (c + 0.062), h);
  });
  // yoke seam across the chest and back, waist band
  stitch(g, 0, Y(0.8), w, Y(0.8));
  g.fillStyle = 'rgba(0,0,0,0.22)'; g.fillRect(0, Y(0.2), w, h * 0.06);
  stitch(g, 0, Y(0.2), w, Y(0.2)); stitch(g, 0, Y(0.14), w, Y(0.14));
  // short stand-up collar edge (the collar itself is a separate part)
  g.fillStyle = suit.accent; g.fillRect(0, 0, w, h * 0.03);
  // front zip with a cover flap
  g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(w * 0.497, Y(0.97), w * 0.006, h * 0.75);
  stitch(g, w * 0.488, Y(0.97), w * 0.488, Y(0.22), 'rgba(255,255,255,0.25)', 4);
  // chest: big team logo across both sides of the zip, sponsor patches on each breast
  g.save(); g.translate(w * 0.5, Y(0.6)); g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = '900 50px "Arial Black", Impact, sans-serif'; g.lineWidth = 7; g.strokeStyle = suit.accent; g.fillStyle = suit.panel;
  g.strokeText(suit.logo || '', 0, 0); g.fillText(suit.logo || '', 0, 0); g.restore();
  patch(g, w * 0.43, Y(0.78), 70, 22, SPONSORS.chest[0], { bg: '#ffffff', fg: '#c8102e' });
  patch(g, w * 0.57, Y(0.78), 70, 22, SPONSORS.chest[1], { bg: '#ffffff', fg: '#0b3b8c' });
  patch(g, w * 0.5, Y(0.44), 90, 20, 'Visa', { bg: suit.base, fg: '#ffffff', border: suit.accent });
  // belt sponsor front and back
  patch(g, w * 0.5, Y(0.17), 110, 22, SPONSORS.belt, { bg: '#ffffff', fg: '#111111' });
  patch(g, w * 0.0, Y(0.17), 110, 22, SPONSORS.belt, { bg: '#ffffff', fg: '#111111' }); patch(g, w * 1.0, Y(0.17), 110, 22, SPONSORS.belt, { bg: '#ffffff', fg: '#111111' });
  // back: team logo between the shoulder blades
  [0, w].forEach((x) => { g.save(); g.translate(x, Y(0.62)); g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = '900 40px "Arial Black", Impact, sans-serif'; g.lineWidth = 6; g.strokeStyle = suit.accent; g.fillStyle = suit.panel; g.strokeText(suit.logo || '', 0, 0); g.fillText(suit.logo || '', 0, 0); g.restore(); });
  return texFrom(cv);
}
let _torsoNormal = null;
function torsoNormal() {
  if (_torsoNormal) return _torsoNormal;
  const w = 512, h = 256;
  const waist = creaseField(h * 0.78, 20, 6, 0.9, 1, w), belly = creaseField(h * 0.62, 22, 3, 0.25, 2, w), shoulder = creaseField(h * 0.13, 10, 3, 0.4, 3, w);
  const seams = [0.188, 0.312, 0.688, 0.812].map((u) => u * w);
  return (_torsoNormal = normalMapFrom(w, h, (x, y) => {
    let v = waist(x, y) + belly(x, y) + shoulder(x, y);
    for (const sx of seams) v -= 0.35 * Math.exp(-((x - sx) ** 2) / 1.5);
    v -= 0.3 * Math.exp(-((y - h * 0.2) ** 2) / 1.5);
    return v;
  }));
}

/**
 * Limb map (arm or leg): u round the limb, v from the shoulder / hip (0) to the wrist / ankle (1).
 * Side stripes at u 0.25 and 0.75, sponsor patches, ribbed elastic cuff at the end.
 */
const LIMB_W = 512, LIMB_H = 1024;
export function createSuitLimbTexture(suit, kind) {
  const w = LIMB_W, h = LIMB_H, cv = makeCanvas(w, h), g = cv.getContext('2d');
  const Y = (v) => h * v; // v measured from the canvas top (flipY is turned off for limb maps)
  g.fillStyle = suit.base; g.fillRect(0, 0, w, h);
  [0.25, 0.75].forEach((c) => {
    g.fillStyle = suit.panel; g.fillRect(w * (c - 0.045), 0, w * 0.09, h);
    g.fillStyle = suit.accent; g.fillRect(w * (c - 0.05), 0, w * 0.008, h); g.fillRect(w * (c + 0.042), 0, w * 0.008, h);
    stitch(g, w * (c - 0.058), 0, w * (c - 0.058), h); stitch(g, w * (c + 0.058), 0, w * (c + 0.058), h);
  });
  stitch(g, w * 0.5, 0, w * 0.5, h, 'rgba(255,255,255,0.2)'); // inside-leg / under-arm seam
  const cuffFrom = kind === 'arm' ? 0.9 : 0.93;
  ribbedCuff(g, w, Y(cuffFrom), Y(cuffFrom + 0.06), suit.base);
  g.fillStyle = suit.accent; g.fillRect(0, Y(cuffFrom) - 3, w, 3);
  const names = kind === 'arm' ? SPONSORS.arm : SPONSORS.leg;
  const pv = kind === 'arm' ? [0.22, 0.68] : [0.25, 0.7];
  // patches face outward on both sides of the limb (u 0.125 / 0.375 sit either side of the stripe)
  [0.0, 0.5].forEach((u0) => {
    patch(g, w * (u0 + 0.0), Y(pv[0]), 70, 34, names[0], { bg: '#ffffff', fg: names[0] === 'ORACLE' ? '#c8102e' : '#0b3b8c', rot: 0 });
    patch(g, w * (u0 + 0.0), Y(pv[1]), 70, 30, names[1], { bg: suit.base, fg: '#ffffff', border: suit.accent });
  });
  patch(g, w * 1.0, Y(pv[0]), 70, 34, names[0], { bg: '#ffffff', fg: names[0] === 'ORACLE' ? '#c8102e' : '#0b3b8c' });
  patch(g, w * 1.0, Y(pv[1]), 70, 30, names[1], { bg: suit.base, fg: '#ffffff', border: suit.accent });
  const t = texFrom(cv); t.flipY = false; return t;
}
const _limbNormal = {};
function limbNormal(kind, jointV) {
  const key = kind + jointV.toFixed(3);
  if (_limbNormal[key]) return _limbNormal[key];
  const w = 256, h = 512;
  const joint = creaseField(h * jointV, kind === 'arm' ? 30 : 34, 7, 1.0, kind === 'arm' ? 4 : 5, w);
  const root = creaseField(h * 0.06, 12, 3, 0.35, 6, w);
  const cuffFrom = kind === 'arm' ? 0.9 : 0.93;
  const t = normalMapFrom(w, h, (x, y) => {
    let v = joint(x, y) + root(x, y);
    for (const sx of [0.192, 0.308, 0.692, 0.808, 0.5].map((u) => u * w)) v -= 0.3 * Math.exp(-((x - sx) ** 2) / 1.2);
    const yc = y / h; if (yc > cuffFrom && yc < cuffFrom + 0.06) v += 0.25 * Math.abs(Math.sin(x * 0.55)); // ribbing
    return v;
  });
  t.flipY = false;
  return (_limbNormal[key] = t);
}

/** Plain fabric (gloves, boots, collar): weave + a little stitching noise. */
const _plainNormal = {};
function fabricNormal(kind = 'nomex') {
  if (_plainNormal[kind]) return _plainNormal[kind];
  const w = 256, h = 256;
  return (_plainNormal[kind] = normalMapFrom(w, h, (x, y) => kind === 'suede'
    ? 0.15 * Math.sin(x * 0.9 + Math.sin(y * 0.7) * 2) * Math.sin(y * 1.1)
    : 0, kind === 'suede' ? 1.4 : 2.0));
}

function fabricMat(name, colour, extra = {}) {
  return new THREE.MeshPhysicalMaterial({
    name, color: colour, roughness: 0.93, metalness: 0, clearcoat: 0,
    sheen: 0.6, sheenRoughness: 0.75, sheenColor: new THREE.Color(0x8890a0),
    normalScale: new THREE.Vector2(1.0, 1.0), ...extra,
  });
}

// =========================================================================
// 4. GEOMETRY HELPERS
// =========================================================================

/**
 * Loft through sections with UVs. Section: { c: Vector3, a: lateral unit, b: forward (chest) unit,
 * ra, rb, p? (superellipse exponent, 2 = ellipse) }. u around (0 at the back), v along. Caps both ends.
 */
function loftSections(secs, ring = 32) {
  const pos = [], uv = [], idx = [];
  const sp = (x, e) => Math.sign(x) * Math.pow(Math.abs(x), e);
  secs.forEach((s, i) => {
    const e = 2 / (s.p || 2);
    for (let j = 0; j <= ring; j++) {
      const ph = (j / ring) * Math.PI * 2;
      const p = s.c.clone().addScaledVector(s.a, s.ra * sp(Math.sin(ph), e)).addScaledVector(s.b, -s.rb * sp(Math.cos(ph), e));
      pos.push(p.x, p.y, p.z); uv.push(j / ring, i / (secs.length - 1));
    }
  });
  const R = ring + 1;
  for (let i = 0; i < secs.length - 1; i++) for (let j = 0; j < ring; j++) {
    const a = i * R + j, b = a + 1, c = a + R, d = c + 1;
    idx.push(a, c, b, b, c, d);
  }
  [0, secs.length - 1].forEach((i, k) => {
    const ci = pos.length / 3; const c = secs[i].c; pos.push(c.x, c.y, c.z); uv.push(0.5, k);
    for (let j = 0; j < ring; j++) { const a = i * R + j; k ? idx.push(ci, a, a + 1) : idx.push(ci, a + 1, a); }
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  // outward check (signed volume)
  let vol = 0; const A = new THREE.Vector3(), Bv = new THREE.Vector3(), C = new THREE.Vector3();
  for (let t = 0; t < idx.length; t += 3) { A.fromArray(pos, idx[t] * 3); Bv.fromArray(pos, idx[t + 1] * 3); C.fromArray(pos, idx[t + 2] * 3); vol += A.dot(Bv.clone().cross(C)); }
  if (vol < 0) { for (let t = 0; t < idx.length; t += 3) { const q = idx[t + 1]; idx[t + 1] = idx[t + 2]; idx[t + 2] = q; } g.setIndex(idx); }
  g.computeVertexNormals();
  return g;
}

/** Smooth limb along +Y from 0 to len. prof(t) = [halfWidth, halfDepth]; rounded ends. */
function limbGeometry(len, prof, ring = 20) {
  const secs = [];
  const N = 14;
  for (let i = 0; i <= N; i++) {
    const t = i / N; const [w, d] = prof(t);
    // round the ends a little so the joints blend into the spheres
    const k = i === 0 || i === N ? 0.72 : 1;
    secs.push({ c: V3(0, t * len, 0), a: V3(1, 0, 0), b: V3(0, 0, 1), ra: w * k, rb: d * k });
  }
  return loftSections(secs, ring);
}

/** Point a +Y-authored mesh from a to b (local coordinates of its parent). */
function placeAlong(mesh, a, b, rollRef) {
  const d = b.clone().sub(a); const len = d.length(); d.normalize();
  mesh.position.copy(a);
  if (rollRef) {
    const x = rollRef.clone().addScaledVector(d, -rollRef.dot(d)).normalize();
    const z = new THREE.Vector3().crossVectors(x, d).normalize();
    mesh.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, d, z));
  } else mesh.quaternion.setFromUnitVectors(V3(0, 1, 0), d);
  return len;
}

/**
 * One continuous sleeve / trouser leg from the shoulder (hip) through the elbow (knee) to the wrist
 * (ankle): no separate tubes and ball joints. The centre line rounds off through the joint; the
 * mesh is rebuilt in place each frame by poseLimb (about 750 vertices, cheap).
 * prof(s) -> [half width across the bend plane, half depth in the bend plane], s 0..1 along.
 */
function makeLimbMesh(name, mat, prof, NS = 40, ring = 24) {
  const R = ring + 1, nV = (NS + 1) * R + 2;
  const pos = new Float32Array(nV * 3), uv = new Float32Array(nV * 2), idx = [];
  for (let i = 0; i <= NS; i++) for (let j = 0; j <= ring; j++) { uv[(i * R + j) * 2] = j / ring; uv[(i * R + j) * 2 + 1] = i / NS; }
  for (let i = 0; i < NS; i++) for (let j = 0; j < ring; j++) { const a = i * R + j, b = a + 1, c = a + R, d = c + 1; idx.push(a, b, c, b, d, c); }
  const c0 = (NS + 1) * R, c1 = c0 + 1;
  for (let j = 0; j < ring; j++) { idx.push(c0, j + 1, j); idx.push(c1, NS * R + j, NS * R + j + 1); }
  uv[c0 * 2] = 0.5; uv[c1 * 2] = 0.5; uv[c1 * 2 + 1] = 1;
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); g.setIndex(idx);
  const m = new THREE.Mesh(g, mat); m.name = name; m.castShadow = true; m.frustumCulled = false;
  m.userData.limb = { NS, ring, prof };
  return m;
}
const _ta = new THREE.Vector3(), _tb = new THREE.Vector3(), _tc = new THREE.Vector3(), _tt = new THREE.Vector3(), _tn = new THREE.Vector3();
function poseLimb(mesh, A, B, C, hint, rBend, flip = 1) {
  const { NS, ring, prof } = mesh.userData.limb, R = ring + 1;
  const d1 = _ta.subVectors(B, A), L1 = d1.length(); d1.normalize();
  const d2 = _tb.subVectors(C, B), L2 = d2.length(); d2.normalize();
  const a = _tn.crossVectors(d1, d2);
  if (a.lengthSq() < 1e-6) a.crossVectors(d1, hint);
  a.normalize().multiplyScalar(flip);
  const r = Math.min(rBend, 0.45 * L1, 0.45 * L2), L = L1 + L2;
  const P1 = B.clone().addScaledVector(d1, -r), P2 = B.clone().addScaledVector(d2, r);
  const pos = mesh.geometry.attributes.position.array;
  const c = _tc, t = _tt, bb = new THREE.Vector3();
  for (let i = 0; i <= NS; i++) {
    const s = i / NS, l = s * L;
    if (l <= L1 - r) { c.copy(A).addScaledVector(d1, l); t.copy(d1); }
    else if (l >= L1 + r) { c.copy(B).addScaledVector(d2, l - L1); t.copy(d2); }
    else {
      const u = (l - (L1 - r)) / (2 * r), w0 = (1 - u) * (1 - u), w1 = 2 * (1 - u) * u, w2 = u * u;
      c.set(0, 0, 0).addScaledVector(P1, w0).addScaledVector(B, w1).addScaledVector(P2, w2);
      t.subVectors(B, P1).multiplyScalar(2 * (1 - u)).addScaledVector(bb.subVectors(P2, B), 2 * u).normalize();
    }
    bb.crossVectors(t, a).normalize();
    const [ra, rb] = prof(s);
    for (let j = 0; j <= ring; j++) {
      const ph = (j / ring) * Math.PI * 2, k = (i * R + j) * 3;
      const x = -Math.sin(ph) * ra, y = -Math.cos(ph) * rb; // minus: keeps patch lettering readable (not mirrored)
      pos[k] = c.x + a.x * x + bb.x * y; pos[k + 1] = c.y + a.y * x + bb.y * y; pos[k + 2] = c.z + a.z * x + bb.z * y;
    }
  }
  const c0 = (NS + 1) * R;
  pos[c0 * 3] = A.x; pos[c0 * 3 + 1] = A.y; pos[c0 * 3 + 2] = A.z;
  pos[c0 * 3 + 3] = C.x; pos[c0 * 3 + 4] = C.y; pos[c0 * 3 + 5] = C.z;
  mesh.geometry.attributes.position.needsUpdate = true;
  mesh.geometry.computeVertexNormals();
  mesh.geometry.computeBoundingSphere();
}

/** Flat strap along points; width lies along widthHint(t, tangent, point). */
function strap(points, width, thick, widthHint, mat, name) {
  const m = new THREE.Mesh(sweepGeometry(points, () => width, () => thick, { samples: 40, ring: 8, n: 4, widthHint }), mat);
  m.name = name; m.castShadow = true; return m;
}

// =========================================================================
// 5. 2-LINK IK
// =========================================================================

/** Elbow / knee position for a 2-link chain from S to W with lengths L1, L2, bending toward bendHint. */
export function solveTwoLinkArmIK(S, W, L1, L2, bendHint) {
  const D = new THREE.Vector3().subVectors(W, S);
  const d = THREE.MathUtils.clamp(D.length(), Math.abs(L1 - L2) * 1.002, (L1 + L2) * 0.999);
  const uD = D.normalize();
  const cosA = THREE.MathUtils.clamp((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d), -1, 1);
  const sinA = Math.sqrt(Math.max(0, 1 - cosA * cosA));
  const perp = bendHint.clone().addScaledVector(uD, -bendHint.dot(uD));
  if (perp.lengthSq() < 1e-6) perp.set(0, 0, 1);
  perp.normalize();
  return S.clone().addScaledVector(uD, L1 * cosA).addScaledVector(perp, L1 * sinA);
}

// =========================================================================
// 6. CARBON SEAT SHELL (follows the driver's back, thighs and sides)
// =========================================================================

export function createCarbonBeadSeatShell(materials = defaultMaterials, settings = DRIVER_DEFAULTS) {
  const P = computeDriverPose(settings);
  const seat = new THREE.Group();
  seat.name = 'Driver_Seat_CarbonShell_Assembly';
  const mat = (materials.carbonGloss || materials.carbonSatinChassis).clone();
  mat.side = THREE.DoubleSide; mat.name = 'Driver_Seat_Carbon';

  // Path of the seat surface in the side view (x, z) and its inward normal, front lip to the top
  const thighDir = V3(-0.97, 0, 0.24).normalize(); // seat pan under the thighs rises toward the knees
  const back = (t) => P.hip.clone().addScaledVector(P.u, t * settings.body.torso).addScaledVector(P.n, -(t < 0.1 ? 0.95 : 0.9));
  const stations = [
    { c: P.hip.clone().addScaledVector(thighDir, 1.55).add(V3(0, 0, -0.62)), nrm: V3(0.24, 0, 0.97), w: 1.55, wall: 0.25 },
    { c: P.hip.clone().addScaledVector(thighDir, 0.8).add(V3(0, 0, -0.72)), nrm: V3(0.15, 0, 0.99), w: 1.7, wall: 0.45 },
    { c: P.hip.clone().add(V3(0.15, 0, -0.9)), nrm: V3(0, 0, 1), w: 1.8, wall: 0.7 },
    { c: back(0.05).add(V3(0.1, 0, -0.1)), nrm: P.n.clone().lerp(V3(0, 0, 1), 0.5).normalize(), w: 1.85, wall: 0.85 },
    { c: back(0.3), nrm: P.n.clone(), w: 1.85, wall: 1.1 },
    { c: back(0.6), nrm: P.n.clone(), w: 2.2, wall: 1.2 },
    { c: back(0.88), nrm: P.n.clone(), w: 2.45, wall: 1.15 },
    { c: back(1.05), nrm: P.n.clone(), w: 1.7, wall: 0.55 },
    { c: back(1.13), nrm: P.n.clone(), w: 1.3, wall: 0.45 },
  ];
  const NR = 24, pos = [], uv = [], idx = [];
  stations.forEach((st, i) => {
    for (let j = 0; j <= NR; j++) {
      const q = 1 - 2 * (j / NR);           // +1 .. -1 across
      const lift = Math.pow(Math.abs(q), 2.6) * st.wall;
      const p = st.c.clone().add(V3(0, q * st.w * (1 - 0.08 * Math.abs(q)), 0)).addScaledVector(st.nrm, lift);
      pos.push(p.x, p.y, p.z); uv.push(j / NR, i / (stations.length - 1));
    }
  });
  for (let i = 0; i < stations.length - 1; i++) for (let j = 0; j < NR; j++) {
    const a = i * (NR + 1) + j, b = a + 1, c = a + NR + 1, d = c + 1; idx.push(a, b, c, b, d, c);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals();
  const shell = new THREE.Mesh(g, mat); shell.name = 'Driver_Seat_CarbonShell_Mesh'; shell.castShadow = true; shell.receiveShadow = true;
  seat.add(shell);
  // rolled lip round the side edges and the top
  [1, -1].forEach((s) => {
    const pts = stations.map((st) => st.c.clone().add(V3(0, s * st.w * 0.92, 0)).addScaledVector(st.nrm, st.wall));
    const lip = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.06, 8, false), mat);
    lip.name = `Driver_Seat_RolledLip_${s > 0 ? 'R' : 'L'}`; seat.add(lip);
  });
  return seat;
}

// =========================================================================
// 7. THE DRIVER
// =========================================================================

/**
 * @param options.materials  car materials
 * @param options.steeringWheel  the wheel group (PCU-8D). The gloves are attached to it so they turn
 *        with it; the arms follow by IK in updateDriverKinematics.
 * @param options.settings  overrides for DRIVER_DEFAULTS (or use options.team = F1_TEAMS entry)
 */
export function createArticulatedDriver(options = {}) {
  const mats = options.materials || defaultMaterials;
  let S = options.team ? driverSettingsFromTeam(options.team) : { ...DRIVER_DEFAULTS, ...(options.settings || {}) };
  const P = computeDriverPose(S);
  const root = new THREE.Group();
  root.name = 'Assembly_Articulated_Driver';

  // ---- materials (own instances so team changes never touch the car)
  // matte Nomex fabric everywhere on the suit; dark suede-like gloves; fabric boots with rubber soles
  const jointV = { arm: S.body.upperArm / (S.body.upperArm + S.body.forearm), leg: S.body.thigh / (S.body.thigh + S.body.shin) };
  const suitTorsoMat = fabricMat('Driver_RaceSuit_Torso', 0xffffff, { map: createSuitTorsoTexture(S.suit), normalMap: torsoNormal() });
  const armMat = fabricMat('Driver_RaceSuit_Sleeve', 0xffffff, { map: createSuitLimbTexture(S.suit, 'arm'), normalMap: limbNormal('arm', jointV.arm) });
  const legMat = fabricMat('Driver_RaceSuit_Leg', 0xffffff, { map: createSuitLimbTexture(S.suit, 'leg'), normalMap: limbNormal('leg', jointV.leg) });
  const suitMat = fabricMat('Driver_RaceSuit_Fabric', S.suit.base, { normalMap: fabricNormal() });
  const suitPanelMat = fabricMat('Driver_RaceSuit_Panel', S.suit.panel, { normalMap: fabricNormal() });
  const gloveMat = fabricMat('Driver_Glove_Suede', S.glove, { normalMap: fabricNormal('suede'), roughness: 0.97, sheen: 0.8, sheenColor: new THREE.Color(0x5a5e66) });
  const bootMat = fabricMat('Driver_Boot_Fabric', S.boot, { normalMap: fabricNormal(), sheen: 0.5 });
  const soleMat = new THREE.MeshStandardMaterial({ name: 'Driver_Boot_Sole', color: 0x2a2c30, roughness: 0.9 });
  const laceMat = fabricMat('Driver_Boot_Laces', 0xd9dade, { sheen: 0.2 });
  const beltMat = new THREE.MeshStandardMaterial({ name: 'Driver_Harness_Webbing', color: 0x6d7178, roughness: 0.9 });
  const metal = mats.titaniumBright || new THREE.MeshStandardMaterial({ color: 0xc8ccd2, metalness: 0.9, roughness: 0.3 });
  const carbon = mats.carbonGlossAero || mats.carbonGloss;
  const nomex = fabricMat('Driver_Balaclava', 0x15161a, { normalMap: fabricNormal() });
  const add = (parent, geo, mat, name) => { const m = new THREE.Mesh(geo, mat); m.name = name; m.castShadow = true; parent.add(m); return m; };

  const nodes = { arms: {}, legs: {} };

  // ---- torso: one smooth loft from the seat to the neck, cross-sections square to the spine
  const T = S.body.torso;
  const tSecs = [
    [-0.1, 1.05, 0.62, -0.02], [-0.03, 1.42, 0.86, -0.08], [0.06, 1.52, 0.94, -0.1], [0.18, 1.46, 0.93, -0.06],
    [0.34, 1.37, 0.9, 0.0], [0.52, 1.48, 0.98, 0.05], [0.7, 1.62, 1.05, 0.08], [0.86, 1.72, 0.95, 0.04],
    [0.96, 1.34, 0.74, 0.0], [1.04, 0.62, 0.55, 0.02],
  ].map(([t, ra, rb, off]) => ({ c: P.hip.clone().addScaledVector(P.u, t * T).addScaledVector(P.n, off), a: V3(0, -1, 0), b: P.n.clone(), ra, rb, p: 2.3 }));
  add(root, loftSections(tSecs, 40), suitTorsoMat, 'Driver_RaceSuit_Torso');

  // ---- neck (balaclava) from C7 up to the helmet
  const neckTop = P.head.clone().add(V3(0.2, 0, -0.75));
  const neck = add(root, limbGeometry(1, () => [0.5, 0.48]), nomex, 'Driver_Neck_Balaclava');
  neck.scale.y = placeAlong(neck, P.c7.clone().addScaledVector(P.n, 0.05), neckTop);

  // ---- short stand-up collar round the neck with a coloured edge (D2)
  {
    const nd = neckTop.clone().sub(P.c7).normalize();
    const base = P.c7.clone().addScaledVector(P.n, 0.05).addScaledVector(nd, -0.1);
    const collar = add(root, limbGeometry(0.42, (t) => [0.66 - 0.06 * t, 0.62 - 0.06 * t], 28), suitMat, 'Driver_RaceSuit_Collar');
    placeAlong(collar, base, base.clone().add(nd));
    const edge = add(root, new THREE.TorusGeometry(0.6, 0.035, 8, 32), suitPanelMat, 'Driver_RaceSuit_CollarEdge');
    edge.position.copy(base).addScaledVector(nd, 0.42); edge.quaternion.setFromUnitVectors(V3(0, 0, 1), nd);
  }

  // ---- head: helmet on a neck pivot (head tracking)
  const neckPivot = new THREE.Group(); neckPivot.name = 'Kinematic_Driver_NeckJoint';
  neckPivot.position.copy(P.c7);
  root.add(neckPivot);
  const helmet = createDriverHelmet({ ...(S.helmet || {}), centre: P.head.toArray() });
  // this driver has its own HANS and neck, so drop the helmet's simple ones
  ['Driver_HANS_Device', 'Driver_Neck_Balaclava'].forEach((nm) => { const o = helmet.getObjectByName(nm); if (o) o.parent.remove(o); });
  helmet.position.sub(P.c7);
  neckPivot.add(helmet);
  nodes.neckPivot = neckPivot; nodes.helmet = helmet;

  // ---- HANS: collar behind the neck (against the headrest, D6) with two flat prongs down the chest
  {
    const pts = [];
    const back = P.c7.clone().addScaledVector(P.n, -0.75);
    const prong = (s) => [
      P.c7.clone().addScaledVector(P.u, -1.25).addScaledVector(P.n, 1.0).add(V3(0, s * 0.72, 0)),
      P.c7.clone().addScaledVector(P.u, -0.7).addScaledVector(P.n, 1.0).add(V3(0, s * 0.88, 0)),
      P.c7.clone().addScaledVector(P.u, -0.1).addScaledVector(P.n, 0.75).add(V3(0, s * 1.0, 0)),
      P.c7.clone().addScaledVector(P.u, 0.25).addScaledVector(P.n, 0.0).add(V3(0, s * 0.85, 0)),
    ];
    pts.push(...prong(-1), back.clone().add(V3(0, -0.35, 0.25)), back.clone().add(V3(0, 0, 0.35)), back.clone().add(V3(0, 0.35, 0.25)), ...prong(1).reverse());
    const hint = (t, tg, c) => { const rel = c.clone().sub(P.c7); rel.y = 0; const out = rel.lengthSq() > 1e-6 ? rel.normalize() : P.n.clone(); return new THREE.Vector3().crossVectors(tg, out); };
    const hans = new THREE.Mesh(sweepGeometry(pts, (t) => 0.5 + 0.25 * Math.sin(Math.PI * t), () => 0.13, { samples: 60, ring: 12, n: 3, widthHint: hint }), carbon);
    hans.name = 'Driver_HANS_Device'; hans.castShadow = true; root.add(hans);
    // tethers from the collar up to the helmet posts
    [1, -1].forEach((s) => {
      const post = helmet.getObjectByName(`Helmet_HANSPost_${s > 0 ? 'Left' : 'Right'}`);
      const a = back.clone().add(V3(0, s * 0.3, 0.3));
      const b = post ? post.position.clone().add(P.head) : P.head.clone().add(V3(1.0, s * 0.8, -0.55));
      const tether = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([a, a.clone().lerp(b, 0.5).add(V3(0.05, 0, 0)), b]), 8, 0.03, 6), nomex);
      tether.name = `Driver_HANS_Tether_${s > 0 ? 'L' : 'R'}`; root.add(tether);
    });
  }

  // ---- arms: one continuous sleeve each (shoulder -> elbow -> wrist, posed by IK), with the
  //      dark glove gauntlet pulled over the sleeve end
  const armProf = (s) => {
    const k = s / jointV.arm, f = (s - jointV.arm) / (1 - jointV.arm);
    if (s < jointV.arm) return [0.45 - 0.13 * k + 0.035 * Math.sin(Math.PI * k), 0.43 - 0.13 * k];
    return [0.32 + 0.045 * Math.sin(Math.PI * Math.min(1, f * 1.6)) - 0.08 * f, 0.3 - 0.06 * f];
  };
  [1, -1].forEach((s) => {
    const sn = s > 0 ? 'L' : 'R'; // +Y is the driver's left (same as the helmet)
    const sh = P.shoulder.clone().add(V3(0, s * S.body.shoulderHalf, 0));
    add(root, new THREE.SphereGeometry(0.46, 24, 16), suitMat, `Driver_RaceSuit_Shoulder_${sn}`).position.copy(sh);
    const sleeve = makeLimbMesh(`Driver_RaceSuit_Arm_${sn}`, armMat, armProf); root.add(sleeve);
    const cuff = add(root, limbGeometry(0.85, (t) => [0.37 - 0.1 * t, 0.35 - 0.09 * t]), gloveMat, `Driver_Glove_Gauntlet_${sn}`);
    const cuffRim = add(root, new THREE.TorusGeometry(0.275, 0.03, 8, 28), gloveMat, `Driver_Glove_GauntletRim_${sn}`);
    nodes.arms[s] = { sh, sleeve, cuff, cuffRim };
  });

  // ---- gloves on the wheel: palm on the outside of each grip, fingers wrapped round the back,
  //      thumb resting on the front face (D3, D4)
  const G = GLOVE_ON_WHEEL;
  const wheel = options.steeringWheel || null;
  const hands = new THREE.Group(); hands.name = 'Driver_Glove_Hands';
  [1, -1].forEach((s) => {
    const sn = s > 0 ? 'L' : 'R'; // +Y is the driver's left (same as the helmet)
    const hand = new THREE.Group(); hand.name = `Driver_Glove_Hand_${sn}`;
    const gx = s * G.gripX, gy = G.handY, gz = G.gripZ;
    // back of the hand: a flattened rounded pad outside the grip, toward the driver
    const backHand = add(hand, new THREE.SphereGeometry(1, 24, 16), gloveMat, `Driver_Glove_Back_${sn}`);
    backHand.scale.set(0.17, 0.42, 0.34); backHand.position.set(gx + s * 0.38, gy, gz + 0.17); backHand.rotation.y = s * 0.35;
    // four fingers wrapping the grip: from the knuckles outside, round the far side, ending inboard
    const fingers = [[0.27, 0.075, -165], [0.09, 0.08, -172], [-0.1, 0.077, -165], [-0.28, 0.068, -145]];
    fingers.forEach(([dy, r, end], k) => {
      const pts = [];
      const rx = G.gripRx + r * 0.95, rz = G.gripRz + r * 0.95;
      pts.push(V3(gx + s * 0.4, gy + dy, gz + 0.2));
      for (let a = 15; a >= end; a -= 20) {
        const ar = THREE.MathUtils.degToRad(a);
        pts.push(V3(gx + s * rx * Math.cos(ar), gy + dy * (1 - 0.05 * k), gz + rz * Math.sin(ar)));
      }
      const fg = add(hand, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, r, 10, false), gloveMat, `Driver_Glove_Finger_${k}_${sn}`);
      fg.userData.finger = k;
      const tip = add(hand, new THREE.SphereGeometry(r, 10, 8), gloveMat, `Driver_Glove_FingerTip_${k}_${sn}`);
      tip.position.copy(pts[pts.length - 1]);
    });
    // thumb: from the base of the palm across the front of the grip onto the wheel face
    const th = [V3(gx + s * 0.36, gy + 0.08, gz + 0.36), V3(gx + s * 0.2, gy + 0.2, gz + 0.42), V3(gx - s * 0.05, gy + 0.3, gz + 0.36), V3(gx - s * 0.26, gy + 0.36, gz + 0.27)];
    add(hand, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(th), 20, 0.09, 10, false), gloveMat, `Driver_Glove_Thumb_${sn}`);
    add(hand, new THREE.SphereGeometry(0.09, 10, 8), gloveMat, `Driver_Glove_ThumbTip_${sn}`).position.copy(th[3]);
    // wrist marker: where the forearm ends (IK target)
    const wristMark = new THREE.Object3D(); wristMark.name = `Driver_Glove_WristTarget_${sn}`;
    wristMark.position.set(s * G.wrist[0], G.wrist[1], G.wrist[2]);
    hand.add(wristMark);
    const knuckle = new THREE.Object3D(); knuckle.name = `Driver_Glove_HandCentre_${sn}`;
    knuckle.position.set(gx + s * 0.34, gy, gz + 0.18); hand.add(knuckle);
    hands.add(hand);
    nodes.arms[s].wristMark = wristMark; nodes.arms[s].handCentre = knuckle;
  });
  if (wheel) wheel.add(hands); else { hands.position.set(9.0, 0, 4.2); root.add(hands); }
  nodes.hands = hands;

  // ---- legs: thigh, knee, shin, boot (posed by IK onto the pedals)
  [1, -1].forEach((s) => {
    const sn = s > 0 ? 'L' : 'R'; // +Y is the driver's left (same as the helmet)
    const legProf = (t) => {
      const k = t / jointV.leg, f = (t - jointV.leg) / (1 - jointV.leg);
      if (t < jointV.leg) return [0.68 - 0.24 * k, 0.64 - 0.2 * k + 0.04 * Math.sin(Math.PI * k)];
      const calf = Math.sin(Math.PI * Math.min(1, f * 1.7));
      return [0.44 - 0.14 * f + 0.03 * calf, 0.44 - 0.14 * f + 0.06 * calf];
    };
    const leg = makeLimbMesh(`Driver_RaceSuit_Leg_${sn}`, legMat, legProf, 44, 24); root.add(leg);
    // boot: built in a foot frame (x = heel to toe, z = up from the sole) at the ankle
    const boot = new THREE.Group(); boot.name = `Driver_Boot_${sn}`;
    const bootSecs = [
      [-0.28, 0.0, 0.3, 0.42], [-0.18, 0.0, 0.36, 0.48], [0.1, 0.0, 0.38, 0.45], [0.45, 0.0, 0.4, 0.37],
      [0.8, 0.0, 0.42, 0.3], [1.05, 0.0, 0.4, 0.24], [1.22, 0.0, 0.32, 0.18], [1.3, 0.0, 0.2, 0.12],
    ].map(([x, , w, h]) => ({ c: V3(x, 0, -0.35 + h), a: V3(0, 1, 0), b: V3(0, 0, 1), ra: w, rb: h, p: 2.6 }));
    add(boot, loftSections(bootSecs, 28), bootMat, `Driver_Boot_Upper_${sn}`);
    const sole = add(boot, new THREE.BoxGeometry(1.5, 0.74, 0.06), soleMat, `Driver_Boot_Sole_${sn}`);
    sole.position.set(0.5, 0, -0.36);
    const collar = add(boot, limbGeometry(0.5, () => [0.33, 0.33]), bootMat, `Driver_Boot_Collar_${sn}`);
    collar.position.set(-0.05, 0, -0.1); collar.rotation.x = 0; // along +Y? turned below
    collar.quaternion.setFromUnitVectors(V3(0, 1, 0), V3(-0.25, 0, 1).normalize());
    // laces across the instep (D3)
    const topZ = (x) => -0.35 + 2 * (x < 0.45 ? 0.45 + (0.37 - 0.45) * (x - 0.1) / 0.35 : 0.37 + (0.3 - 0.37) * (x - 0.45) / 0.35);
    [0.18, 0.32, 0.46, 0.6, 0.74].forEach((x, k) => {
      const z = topZ(x) + 0.005;
      const lace = add(boot, new THREE.TubeGeometry(new THREE.CatmullRomCurve3([V3(x - 0.04, -0.17, z - 0.03), V3(x + 0.02, 0, z + 0.015), V3(x - 0.04, 0.17, z - 0.03)]), 8, 0.018, 5), laceMat, `Driver_Boot_Lace_${k}_${sn}`);
      void lace;
    });
    const tongue = add(boot, new THREE.BoxGeometry(0.7, 0.2, 0.03), bootMat, `Driver_Boot_Tongue_${sn}`);
    tongue.position.set(0.45, 0, topZ(0.45) - 0.01); tongue.rotation.y = 0.2;
    root.add(boot);
    nodes.legs[s] = { leg, boot, hip: P.hip.clone().add(V3(0, s * S.body.hipHalf, 0)) };
  });

  // ---- harness: shoulder belts over the HANS prongs to the buckle, lap belts, crotch strap
  {
    const harness = new THREE.Group(); harness.name = 'Driver_Harness_Assembly';
    const onChest = (t, y, extra = 0.06) => {
      // point on the front of the torso at spine fraction t, lateral y
      const sec = tSecs.reduce((best, s2) => Math.abs((s2.c.clone().sub(P.hip).dot(P.u) / T) - t) < Math.abs((best.c.clone().sub(P.hip).dot(P.u) / T) - t) ? s2 : best);
      const k = Math.min(1, Math.abs(y) / sec.ra);
      const depth = sec.rb * Math.pow(Math.max(0, 1 - Math.pow(k, 2.3)), 1 / 2.3);
      return P.hip.clone().addScaledVector(P.u, t * T).addScaledVector(P.n, depth + extra + (sec === tSecs[0] ? 0 : 0)).add(V3(0, y, 0));
    };
    const buckle = onChest(0.32, 0, 0.1);
    const cam = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.07, 28), metal);
    cam.quaternion.setFromUnitVectors(V3(0, 1, 0), P.n); cam.position.copy(buckle); cam.name = 'Driver_Harness_RotaryBuckle';
    harness.add(cam);
    const chestHint = () => V3(0, 1, 0);
    [1, -1].forEach((s) => {
      const sn = s > 0 ? 'L' : 'R'; // +Y is the driver's left (same as the helmet)
      const over = P.c7.clone().addScaledVector(P.u, 0.1).addScaledVector(P.n, 0.25).add(V3(0, s * 0.8, 0));
      const behind = P.c7.clone().addScaledVector(P.u, 0.35).addScaledVector(P.n, -0.9).add(V3(0, s * 0.75, 0));
      harness.add(strap([behind, over, onChest(0.85, s * 0.78, 0.2), onChest(0.6, s * 0.55, 0.08), onChest(0.42, s * 0.25), buckle], 0.36, 0.035, chestHint, beltMat, `Driver_Harness_Shoulder_${sn}`));
      const hipSide = P.hip.clone().add(V3(0.2, s * 1.55, 0.1));
      harness.add(strap([hipSide.clone().add(V3(0.15, 0, -0.5)), hipSide, onChest(0.16, s * 0.9, 0.06), onChest(0.28, s * 0.3, 0.08), buckle], 0.34, 0.035, (t, tg) => new THREE.Vector3().crossVectors(tg, P.n), beltMat, `Driver_Harness_Lap_${sn}`));
      // adjusters and the loose tails hanging down beside the seat (D1)
      const adj = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.42, 0.05), metal);
      adj.position.copy(onChest(0.68, s * 0.65, 0.13)); adj.quaternion.setFromUnitVectors(V3(0, 0, 1), P.n); adj.name = `Driver_Harness_Adjuster_${sn}`;
      harness.add(adj);
      const tail0 = hipSide.clone().add(V3(0.1, s * 0.12, 0.05));
      harness.add(strap([tail0, tail0.clone().add(V3(0.05, s * 0.08, -0.6)), tail0.clone().add(V3(0.1, s * 0.06, -1.2))], 0.3, 0.03, () => V3(1, 0, 0), beltMat, `Driver_Harness_Tail_${sn}`));
    });
    harness.add(strap([P.hip.clone().add(V3(-0.6, 0, -0.75)), P.hip.clone().add(V3(-0.75, 0, -0.1)), onChest(0.12, 0, 0.12), buckle], 0.3, 0.035, () => V3(0, 1, 0), beltMat, 'Driver_Harness_Crotch'));
    root.add(harness);
  }

  root.userData.rigNodes = nodes;
  root.userData.settings = S;
  root.userData.pose = P;
  root.userData.steeringWheel = wheel;
  /** Recolour the suit, gloves, boots and helmet from an F1_TEAMS entry (teams.js) or a settings object. */
  root.userData.applyTeam = (teamOrSettings) => {
    S = teamOrSettings && teamOrSettings.suit ? { ...S, ...teamOrSettings } : driverSettingsFromTeam(teamOrSettings);
    if (suitTorsoMat.map) suitTorsoMat.map.dispose();
    suitTorsoMat.map = createSuitTorsoTexture(S.suit); suitTorsoMat.needsUpdate = true;
    [[armMat, 'arm'], [legMat, 'leg']].forEach(([m, k]) => { if (m.map) m.map.dispose(); m.map = createSuitLimbTexture(S.suit, k); m.needsUpdate = true; });
    suitMat.color.set(S.suit.base); suitPanelMat.color.set(S.suit.panel);
    gloveMat.color.set(S.glove); bootMat.color.set(S.boot);
    const shell = helmet.getObjectByName('Helmet_OuterShell');
    if (shell && S.helmet?.colours) {
      shell.material.map = helmetTexture(S.helmet.colours); shell.material.needsUpdate = true;
    }
    root.userData.settings = S;
  };

  updateDriverKinematics(root, {}, wheel, null);
  return root;
}

// =========================================================================
// 8. PER-FRAME UPDATE: arms follow the wheel, feet follow the pedals, head looks into the turn
// =========================================================================

const _w = new THREE.Vector3(), _c = new THREE.Vector3();

export function updateDriverKinematics(driver, state = {}, steeringWheel = null, pedalAssembly = null) {
  if (!driver || !driver.userData.rigNodes) return;
  const N = driver.userData.rigNodes, S = driver.userData.settings, P = driver.userData.pose;
  const { steeringAngle = 0, throttle = 0, brakeKgf = 0 } = state;
  const brake = THREE.MathUtils.clamp(brakeKgf / 160, 0, 1), thr = THREE.MathUtils.clamp(throttle, 0, 1);

  // Arms: the gloves ride on the wheel; solve shoulder -> elbow -> wrist in the driver's frame
  const wheel = steeringWheel || driver.userData.steeringWheel;
  if (wheel) wheel.updateWorldMatrix(true, true);
  driver.updateWorldMatrix(true, false);
  [1, -1].forEach((s) => {
    const A = N.arms[s]; if (!A || !A.wristMark) return;
    A.wristMark.getWorldPosition(_w); driver.worldToLocal(_w);
    A.handCentre.getWorldPosition(_c); driver.worldToLocal(_c);
    const hint = V3(S.pose.elbowHint[0], s * S.pose.elbowHint[1], S.pose.elbowHint[2]);
    const E = solveTwoLinkArmIK(A.sh, _w, S.body.upperArm, S.body.forearm, hint);
    poseLimb(A.sleeve, A.sh, E, _w, hint, 0.5);
    // gauntlet: from just before the wrist toward the hand
    const dirWH = _c.clone().sub(_w).normalize();
    const cuffStart = _w.clone().addScaledVector(_w.clone().sub(E).normalize(), -0.55);
    const cuffDir = _w.clone().addScaledVector(dirWH, 0.3).sub(cuffStart).normalize();
    placeAlong(A.cuff, cuffStart, cuffStart.clone().add(cuffDir));
    A.cuffRim.position.copy(cuffStart); A.cuffRim.quaternion.setFromUnitVectors(V3(0, 0, 1), cuffDir);
  });

  // Legs: each ball of the foot sits on its pedal pad; ankle and knee solved from the hip
  // +Y (left foot) is on the brake, -Y (right foot) on the throttle
  const pads = { 1: { name: 'Body_Pedal_Brake_Footpad', press: brake * 0.28 }, '-1': { name: 'Body_Pedal_Throttle_Footpad', press: thr * 0.24 } };
  if (pedalAssembly) {
    const bp = pedalAssembly.getObjectByName('Body_Pedal_Brake_Footpad'); if (bp) bp.position.x = 0.12 - brake * 0.28;
    const tp = pedalAssembly.getObjectByName('Body_Pedal_Throttle_Footpad'); if (tp) tp.position.x = 0.24 - thr * 0.24;
  }
  [1, -1].forEach((s) => {
    const L = N.legs[s]; if (!L) return;
    if (!L.ball) {
      // first call: find the pedal pad this foot works, otherwise use the standard footwell spot
      const pedals = pedalAssembly || driver.parent?.getObjectByName?.('Body_PedalSled_Assembly');
      const pad = pedals?.getObjectByName?.(pads[s].name);
      if (pad) {
        pad.updateWorldMatrix(true, false); const pw = pad.getWorldPosition(new THREE.Vector3()); driver.worldToLocal(pw);
        const half = pad.geometry?.parameters?.width ? pad.geometry.parameters.width / 2 : 0.04;
        L.ball = pw.addScaledVector(P.sole, -(half + 0.07)).add(V3(pads[s].press, 0, 0));
      }
    }
    const ball = (L.ball || V3(1.55, s * 0.45, 3.1)).clone().add(V3(-pads[s].press, 0, 0));
    const ankle = ball.clone().addScaledVector(P.f, -0.95).addScaledVector(P.sole, -0.35);
    const hint = V3(S.pose.kneeHint[0], s * S.pose.kneeHint[1], S.pose.kneeHint[2]);
    const K = solveTwoLinkArmIK(L.hip, ankle, S.body.thigh, S.body.shin, hint);
    poseLimb(L.leg, L.hip, K, ankle, hint, 0.75);
    // boot frame: x = heel to toe (f), z = up out of the instep (-sole)
    const x = P.f.clone(), z = P.sole.clone().negate(), y = new THREE.Vector3().crossVectors(z, x);
    L.boot.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z));
    L.boot.position.copy(ankle);
  });

  // Head: looks a little into the turn, nods under braking (kept small so the helmet stays clear
  // of the headrest wings)
  if (N.neckPivot) {
    const yaw = THREE.MathUtils.clamp(-steeringAngle * 0.25, -0.12, 0.12);
    const pitch = brake * 0.05 - thr * 0.02;
    N.neckPivot.rotation.set(0, pitch, yaw, 'ZYX');
  }
}
