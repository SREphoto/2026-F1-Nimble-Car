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
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { fabricMaterial, dyed, createSuitTorsoTexture, createSuitLimbTexture, createPatchAtlas, patchMaterial, buildTorso, makeSuitLimb, poseSuitLimb } from './driver_suit.js';

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

/** Wheel-local glove layout on the rebuilt PCU-8D (cad/wheel_parts.json): grip axis along local Y at
 *  x = +-1.276, z 0, half width 0.17 x half depth 0.185; F = front face z; hand centre height handY. */
export const GLOVE_ON_WHEEL = { gripX: 1.276, gripZ: 0, gripRx: 0.17, gripRz: 0.185, handY: -0.2, F: 0.12 };

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
// 3. FABRIC: materials, colour maps, patches, displaced suit geometry live in driver_suit.js
// =========================================================================
export { createSuitTorsoTexture, createSuitLimbTexture } from './driver_suit.js';

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
 * Merge a group's direct child meshes that share one material into a single mesh (same geometry
 * and look, one draw call). Only static parts (fingers on a glove, laces, straps) are merged.
 */
/**
 * A gloved hand round a vertical wheel grip, every finger in three phalanges with knuckle joints
 * (W1, D3, D4). Wheel-local frame: grip axis along Y, face +Z toward the driver; s = side (+-1).
 * phi on the grip section: 0 = outer side, +90 deg = front (driver side), -90 deg = back.
 * Fingers start at the knuckles on the outer side and wrap round the back of the grip toward the
 * paddles; the thumb lies across the front of the grip onto the wheel face. Returns a group with
 * userData.wrist / userData.knuckle (IK targets).
 */
function buildGlovedHand(s, G, gloveMat, padMat) {
  const hand = new THREE.Group();
  const gx = G.gripX, rx = G.gripRx, rz = G.gripRz, rbar = (rx + rz) / 2;
  const gp = (phi, y, off) => V3(s * (gx + (rx + off) * Math.cos(phi)), y, G.gripZ + (rz + off) * Math.sin(phi));
  const add = (geo, mat, name) => { const m = new THREE.Mesh(geo, mat); m.name = name; m.castShadow = true; hand.add(m); return m; };
  const capsule = (A, B, r0, r1, mat, name) => {
    const L = A.distanceTo(B), g = new THREE.CylinderGeometry(r1, r0, L, 14, 1, true);
    const m = add(g, mat, name); m.position.copy(A).lerp(B, 0.5); m.quaternion.setFromUnitVectors(V3(0, 1, 0), B.clone().sub(A).normalize()); return m;
  };
  const ball = (P, r, mat, name, sc) => { const m = add(new THREE.SphereGeometry(r, 16, 12), mat, name); m.position.copy(P); if (sc) m.scale.copy(sc); return m; };
  // fingers: [y offset from handY, radius, phalanx lengths (dm, gloved), splay]
  const FING = [[0.27, 0.083, [0.45, 0.27, 0.22], 0.05], [0.09, 0.087, [0.49, 0.3, 0.23], 0.0], [-0.09, 0.083, [0.46, 0.29, 0.22], -0.03], [-0.26, 0.072, [0.36, 0.22, 0.19], -0.07]];
  const phi0 = THREE.MathUtils.degToRad(32), mcps = [];
  FING.forEach(([dy, fr, Ls, splay], k) => {
    const y0 = G.handY + dy;
    // knuckles stand off the grip by the palm thickness; the later joints hug the alcantara. Each
    // joint is found by walking round the grip until the phalanx length is reached (true chords).
    const offs = [0.13, fr * 0.92, fr * 0.86, fr * 0.8];
    // where the grip joins the body (neck, wheel_parts.json) the tips stop on the back of the neck
    const phiMin = (y0 < 0.03 && y0 > -0.31) ? -Math.PI * 0.95 : -Math.PI * 1.2;
    let phi = phi0, y = y0;
    const J = [gp(phi, y, offs[0])];
    Ls.forEach((L, i) => {
      const prev = J[J.length - 1]; let q = prev;
      y += splay * L;
      for (let n = 0; n < 400 && q.distanceTo(prev) < L && phi > phiMin; n++) { phi -= 0.01; q = gp(phi, y, offs[i + 1]); }
      if (q.distanceTo(prev) < 0.06) q = prev.clone().add(V3(0, 0, -0.06)); // never a zero-length phalanx
      J.push(q);
    });
    mcps.push(J[0]);
    const r = [fr * 1.05, fr, fr * 0.93, fr * 0.86];
    for (let i = 0; i < 3; i++) capsule(J[i], J[i + 1], r[i], r[i + 1], gloveMat, `Driver_Glove_Phalanx_${k}_${i}`);
    for (let i = 0; i < 4; i++) ball(J[i], r[i] * (i === 0 ? 1.08 : 1.04), gloveMat, `Driver_Glove_Joint_${k}_${i}`);
    // raised knuckle pad on the back of the proximal phalanx
    const mid = J[0].clone().lerp(J[1], 0.45), out = mid.clone().sub(V3(s * gx, mid.y, G.gripZ)).setY(0).normalize();
    const pad = ball(mid.clone().addScaledVector(out, fr * 0.72), fr * 0.62, padMat, `Driver_Glove_KnucklePad_${k}`, V3(1, 0.75, 1));
    pad.quaternion.setFromUnitVectors(V3(0, 0, 1), out);
  });
  // back of the hand: loft from the wrist to the knuckle line
  const kc = mcps.reduce((a, b) => a.add(b), V3(0, 0, 0)).multiplyScalar(1 / mcps.length);
  const axisOut = V3(s * 0.45, -0.35, 0.82).normalize(); // knuckles -> wrist (toward the forearm)
  const wrist = kc.clone().addScaledVector(axisOut, 1.0);
  const across = mcps[0].clone().sub(mcps[3]).normalize();
  const nrm = new THREE.Vector3().crossVectors(axisOut, across).normalize();
  const outward = V3(s, 0, 0.6).normalize(); if (nrm.dot(outward) < 0) nrm.negate();
  {
    const NS = 14, ring = 24, pos = [], uv = [], idx = [];
    for (let i = 0; i <= NS; i++) {
      const t = i / NS; // 0 knuckles -> 1 wrist
      const c = kc.clone().addScaledVector(axisOut, t * 1.02).addScaledVector(nrm, -0.05 + 0.02 * Math.sin(Math.PI * t));
      const hw = THREE.MathUtils.lerp(0.4, 0.29, t) + 0.03 * Math.sin(Math.PI * Math.min(1, t * 1.5));
      const ht = THREE.MathUtils.lerp(0.12, 0.16, t) + 0.025 * Math.sin(Math.PI * t);
      for (let j = 0; j <= ring; j++) {
        const a = (j / ring) * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a);
        const p = c.clone().addScaledVector(across, Math.sign(ca) * Math.pow(Math.abs(ca), 0.75) * hw).addScaledVector(nrm, Math.sign(sa) * Math.pow(Math.abs(sa), 0.85) * ht);
        pos.push(p.x, p.y, p.z); uv.push(j / ring * 1.5, t);
      }
    }
    const R = ring + 1;
    for (let i = 0; i < NS; i++) for (let j = 0; j < ring; j++) { const a = i * R + j, b = a + 1, c = a + R, d = c + 1; idx.push(a, b, c, b, d, c); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx);
    // outward winding
    g.computeVertexNormals();
    const n0 = new THREE.Vector3().fromBufferAttribute(g.attributes.normal, Math.round(ring / 4)), p0 = new THREE.Vector3().fromBufferAttribute(g.attributes.position, Math.round(ring / 4));
    if (n0.dot(p0.clone().sub(kc)) < 0) { const ix = g.index.array; for (let t = 0; t < ix.length; t += 3) { const q = ix[t + 1]; ix[t + 1] = ix[t + 2]; ix[t + 2] = q; } g.computeVertexNormals(); }
    add(g, gloveMat, 'Driver_Glove_BackOfHand');
    ball(wrist.clone().addScaledVector(axisOut, -0.02), 0.22, gloveMat, 'Driver_Glove_WristCap', V3(1.15, 0.7, 1)).quaternion.setFromUnitVectors(V3(0, 1, 0), nrm);
  }
  // thumb: base on the inner side of the hand, across the front of the grip onto the wheel face
  {
    const F = G.F, tr = 0.092;
    // CMC on the index side of the palm near the wrist; MCP on the front of the grip; tip resting
    // on the face just inboard of the grip, by the thumbwheels (W1)
    const T0 = kc.clone().lerp(wrist, 0.5).add(V3(-s * 0.06, 0.24, -0.06));
    const T1 = V3(s * (gx + 0.03), G.handY + 0.24, G.gripZ + rz + tr + 0.02);
    const T2 = V3(s * (gx - rx + 0.02), G.handY + 0.29, G.gripZ + rz + tr * 0.6);
    const T3 = V3(s * (gx - rx - 0.15), G.handY + 0.32, F + tr * 0.95);
    capsule(T0, T1, 0.13, tr * 1.05, gloveMat, 'Driver_Glove_Thumb_Metacarpal');
    capsule(T1, T2, tr * 1.05, tr, gloveMat, 'Driver_Glove_Thumb_Proximal');
    capsule(T2, T3, tr, tr * 0.88, gloveMat, 'Driver_Glove_Thumb_Distal');
    ball(T0, 0.13, gloveMat, 'Driver_Glove_Thenar', V3(1.1, 1, 0.9)); ball(T1, tr * 1.1, gloveMat, 'Driver_Glove_Thumb_MCP');
    ball(T2, tr * 1.04, gloveMat, 'Driver_Glove_Thumb_IP'); ball(T3, tr * 0.88, gloveMat, 'Driver_Glove_Thumb_Tip');
    const tp = ball(T1.clone().lerp(T2, 0.5).add(V3(0, 0, tr * 0.7)), tr * 0.55, padMat, 'Driver_Glove_ThumbPad', V3(1, 0.7, 1));
    void tp;
  }
  const wristMark = new THREE.Object3D(); wristMark.name = `Driver_Glove_WristTarget_${s > 0 ? 'L' : 'R'}`; wristMark.position.copy(wrist); hand.add(wristMark);
  const knuckle = new THREE.Object3D(); knuckle.name = `Driver_Glove_HandCentre_${s > 0 ? 'L' : 'R'}`; knuckle.position.copy(kc); hand.add(knuckle);
  hand.userData.wrist = wristMark; hand.userData.knuckle = knuckle;
  return hand;
}

function mergeChildren(group, mat, name) {
  const parts = group.children.filter((o) => o.isMesh && o.material === mat);
  if (parts.length < 2) return null;
  const geos = parts.map((m) => {
    m.updateMatrix(); let g = m.geometry.index ? m.geometry : m.geometry; g = g.clone().applyMatrix4(m.matrix);
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    return g.index ? g : g.setIndex([...Array(g.attributes.position.count).keys()]);
  });
  const merged = mergeGeometries(geos, false);
  if (!merged) return null;
  parts.forEach((m) => { group.remove(m); m.geometry.dispose(); });
  geos.forEach((g) => g.dispose());
  const mesh = new THREE.Mesh(merged, mat); mesh.name = name; mesh.castShadow = true; mesh.receiveShadow = true;
  group.add(mesh); return mesh;
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
  mergeChildren(seat, mat, 'Driver_Seat_CarbonShell_Mesh');
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
  const suitTorsoMat = fabricMaterial('Driver_RaceSuit_Torso', 0xffffff, { map: createSuitTorsoTexture(S.suit), size: [9, 5.2] });
  const armMat = fabricMaterial('Driver_RaceSuit_Sleeve', 0xffffff, { map: createSuitLimbTexture(S.suit, 'arm'), size: [2.4, 5.35] });
  const legMat = fabricMaterial('Driver_RaceSuit_Leg', 0xffffff, { map: createSuitLimbTexture(S.suit, 'leg'), size: [3.6, 8.25] });
  const suitMat = fabricMaterial('Driver_RaceSuit_Fabric', dyed(S.suit.base), { size: [2.9, 1.45] });
  const suitPanelMat = fabricMaterial('Driver_RaceSuit_Panel', dyed(S.suit.panel), { size: [3.8, 0.2] });
  const pipingMat = fabricMaterial('Driver_RaceSuit_Piping', dyed(S.suit.accent), { size: [0.1, 4], side: THREE.DoubleSide });
  const seamMat = fabricMaterial('Driver_RaceSuit_Seam', dyed(S.suit.base), { size: [0.1, 9], side: THREE.DoubleSide });
  let atlas = createPatchAtlas(S.suit);
  const patchMat = patchMaterial(atlas.tex);
  const gloveMat = fabricMaterial('Driver_Glove_Suede', S.glove, { kind: 'suede', size: [1, 0.5], sheenColor: 0x6a6e76 });
  const bootMat = fabricMaterial('Driver_Boot_Fabric', S.boot, { size: [2.4, 1.6], sheenColor: 0x70747c });
  const soleMat = new THREE.MeshStandardMaterial({ name: 'Driver_Boot_Sole', color: 0x2a2c30, roughness: 0.9 });
  const laceMat = fabricMaterial('Driver_Boot_Laces', 0xd9dade, { size: [0.4, 0.05], sheenColor: 0xffffff });
  const beltMat = new THREE.MeshStandardMaterial({ name: 'Driver_Harness_Webbing', color: 0x6d7178, roughness: 0.9 });
  const metal = mats.titaniumBright || new THREE.MeshStandardMaterial({ color: 0xc8ccd2, metalness: 0.9, roughness: 0.3 });
  const carbon = mats.carbonGlossAero || mats.carbonGloss;
  const nomex = fabricMaterial('Driver_Balaclava', 0x15161a, { size: [3, 1], sheenColor: 0x50545c });
  const add = (parent, geo, mat, name) => { const m = new THREE.Mesh(geo, mat); m.name = name; m.castShadow = true; parent.add(m); return m; };

  const nodes = { arms: {}, legs: {} };

  // ---- torso: one smooth loft from the seat to the neck, cross-sections square to the spine
  const T = S.body.torso;
  // D1 / D2 volume: deep rib cage and chest, broad shoulders, the chest standing up off the seat back
  // (the lower back lies in the seat, the chest rises more steeply toward the collar)
  const tSecs = [
    [-0.1, 1.08, 0.66, -0.02], [-0.03, 1.48, 0.92, -0.08], [0.06, 1.58, 1.0, -0.11], [0.18, 1.5, 0.98, -0.1],
    [0.34, 1.42, 0.98, -0.04], [0.52, 1.56, 1.1, 0.06], [0.7, 1.72, 1.2, 0.16], [0.86, 1.82, 1.08, 0.13],
    [0.96, 1.4, 0.8, 0.04], [1.04, 0.64, 0.56, 0.02],
  ].map(([t, ra, rb, off]) => ({ c: P.hip.clone().addScaledVector(P.u, t * T).addScaledVector(P.n, off), a: V3(0, 1, 0), b: P.n.clone(), ra, rb, p: 2.3 }));
  // dense displaced loft with real fold geometry, raised piping and raised patches (driver_suit.js)
  const torso = buildTorso(tSecs, { mat: suitTorsoMat, pipingMat, seamMat, patchMat, cells: atlas.cells });
  [torso.mesh, torso.piping, torso.seams, torso.patches].forEach((m) => root.add(m));

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
    if (s < jointV.arm) return [0.5 - 0.14 * k + 0.045 * Math.sin(Math.PI * k), 0.48 - 0.14 * k + 0.02 * Math.sin(Math.PI * k)];
    return [0.35 + 0.05 * Math.sin(Math.PI * Math.min(1, f * 1.6)) - 0.09 * f, 0.33 - 0.07 * f];
  };
  [1, -1].forEach((s) => {
    const sn = s > 0 ? 'L' : 'R'; // +Y is the driver's left (same as the helmet)
    const sh = P.shoulder.clone().add(V3(0, s * S.body.shoulderHalf, 0));
    add(root, new THREE.SphereGeometry(0.52, 28, 18), suitMat, `Driver_RaceSuit_Shoulder_${sn}`).position.copy(sh);
    const armParts = makeSuitLimb(`Driver_RaceSuit_Arm_${sn}`, { mat: armMat, pipingMat, patchMat, cells: atlas.cells, prof: armProf, jointS: jointV.arm, kind: 'arm' });
    const sleeve = armParts.mesh; root.add(sleeve, armParts.piping, armParts.patches);
    const cuff = add(root, limbGeometry(0.85, (t) => [0.37 - 0.1 * t, 0.35 - 0.09 * t]), gloveMat, `Driver_Glove_Gauntlet_${sn}`);
    const cuffRim = add(root, new THREE.TorusGeometry(0.275, 0.03, 8, 28), gloveMat, `Driver_Glove_GauntletRim_${sn}`);
    nodes.arms[s] = { sh, sleeve, cuff, cuffRim };
  });

  // ---- gloves on the wheel: palm on the outside of each grip, fingers wrapped round the back,
  //      thumb resting on the front face (D3, D4)
  const G = GLOVE_ON_WHEEL;
  const wheel = options.steeringWheel || null;
  const hands = new THREE.Group(); hands.name = 'Driver_Glove_Hands';
  const padMat = fabricMaterial('Driver_Glove_KnucklePads', 0x2b2e34, { kind: 'suede', size: [0.3, 0.2], sheenColor: 0x80848c });
  [1, -1].forEach((s) => {
    const sn = s > 0 ? 'L' : 'R'; // +Y is the driver's left (same as the helmet)
    const hand = buildGlovedHand(s, G, gloveMat, padMat);
    hand.name = `Driver_Glove_Hand_${sn}`;
    mergeChildren(hand, gloveMat, `Driver_Glove_Hand_${sn}_Mesh`);
    mergeChildren(hand, padMat, `Driver_Glove_KnucklePads_${sn}`);
    hands.add(hand);
    nodes.arms[s].wristMark = hand.userData.wrist; nodes.arms[s].handCentre = hand.userData.knuckle;
  });
  if (wheel) wheel.add(hands); else { hands.position.set(9.0, 0, 4.2); root.add(hands); }
  nodes.hands = hands;

  // ---- legs: thigh, knee, shin, boot (posed by IK onto the pedals)
  [1, -1].forEach((s) => {
    const sn = s > 0 ? 'L' : 'R'; // +Y is the driver's left (same as the helmet)
    const legProf = (t) => {
      const k = t / jointV.leg, f = (t - jointV.leg) / (1 - jointV.leg);
      if (t < jointV.leg) return [0.76 - 0.28 * k, 0.72 - 0.24 * k + 0.05 * Math.sin(Math.PI * k)];
      const calf = Math.sin(Math.PI * Math.min(1, f * 1.7));
      return [0.44 - 0.14 * f + 0.03 * calf, 0.44 - 0.14 * f + 0.06 * calf];
    };
    const legParts = makeSuitLimb(`Driver_RaceSuit_Leg_${sn}`, { mat: legMat, pipingMat, patchMat, cells: atlas.cells, prof: legProf, jointS: jointV.leg, kind: 'leg' });
    const leg = legParts.mesh; root.add(leg, legParts.piping, legParts.patches);
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
    mergeChildren(boot, laceMat, `Driver_Boot_Laces_${sn}`); mergeChildren(boot, bootMat, `Driver_Boot_Upper_${sn}`);
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
    mergeChildren(harness, beltMat, 'Driver_Harness_Webbing'); mergeChildren(harness, metal, 'Driver_Harness_Hardware');
    root.add(harness);
  }

  // static parts that share a material: one mesh each (neck + HANS tethers, shoulders + collar)
  mergeChildren(root, nomex, 'Driver_Neck_Balaclava'); mergeChildren(root, suitMat, 'Driver_RaceSuit_Shoulders_Collar');
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
    suitMat.color.set(dyed(S.suit.base)); suitPanelMat.color.set(dyed(S.suit.panel)); pipingMat.color.set(dyed(S.suit.accent)); seamMat.color.set(dyed(S.suit.base));
    atlas.tex.dispose(); atlas = createPatchAtlas(S.suit); patchMat.map = atlas.tex; patchMat.needsUpdate = true;
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
    poseSuitLimb(A.sleeve, A.sh, E, _w, hint, 0.5);
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
    poseSuitLimb(L.leg, L.hip, K, ankle, hint, 0.75);
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
