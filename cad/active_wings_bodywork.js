/**
 * 2026 Formula 1 "Nimble Car" Bodywork & Active Aerodynamics
 * SREdesigns - Samuel R Erwin III
 * 
 * 3D CAD for 2026 Formula 1 Active Front & Rear Wings, FIS Nosecone,
 * Sidepods, Radiator Ducts, Shark Fin, and Endplates.
 * Fully matching user wireframe engineering drawings.
 */

import * as THREE from 'three';
import { materials } from '../materials.js';
import {
  createSidepodLiveryTexture,
  createEngineCoverLiveryTexture,
  createNoseconeLiveryTexture,
  createRearWingOracleTexture,
  createEndplateTexture,
  createRearWingEndplateInnerTexture
} from './procedural_livery.js';

/**
 * Helper: Create an explicit 3D quad decal with deterministic UVs
 * Guaranteed zero upside-down or backwards rotation issues.
 * @param {THREE.Vector3} p00 - Bottom-Left (UV 0, 0)
 * @param {THREE.Vector3} p10 - Bottom-Right (UV 1, 0)
 * @param {THREE.Vector3} p11 - Top-Right (UV 1, 1)
 * @param {THREE.Vector3} p01 - Top-Left (UV 0, 1)
 * @param {THREE.Material} material
 */
function createDecalQuad(p00, p10, p11, p01, material) {
  const geo = new THREE.BufferGeometry();
  const positions = new Float32Array([
    p00.x, p00.y, p00.z,
    p10.x, p10.y, p10.z,
    p11.x, p11.y, p11.z,

    p00.x, p00.y, p00.z,
    p11.x, p11.y, p11.z,
    p01.x, p01.y, p01.z,
  ]);
  const uvs = new Float32Array([
    0, 0,
    1, 0,
    1, 1,

    0, 0,
    1, 1,
    0, 1,
  ]);
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, material);
  mesh.castShadow = true;
  return mesh;
}

// -------------------------------------------------------------------------
// LOFT HELPERS: smooth bodywork skinned between cross-sections
// -------------------------------------------------------------------------
function catmull(p0, p1, p2, p3, t) {
  const t2 = t * t, t3 = t2 * t;
  return 0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
}

// Interpolate every numeric key of a list of stations (sorted by x) with Catmull-Rom,
// returning `steps` stations per span for a smooth, ripple-free loft.
function resampleStations(stations, steps = 6) {
  const out = [];
  const keys = Object.keys(stations[0]);
  for (let i = 0; i < stations.length - 1; i++) {
    const s0 = stations[Math.max(0, i - 1)], s1 = stations[i], s2 = stations[i + 1], s3 = stations[Math.min(stations.length - 1, i + 2)];
    for (let k = 0; k < steps; k++) {
      const t = k / steps; const st = {};
      keys.forEach(key => { st[key] = catmull(s0[key], s1[key], s2[key], s3[key], t); });
      out.push(st);
    }
  }
  out.push({ ...stations[stations.length - 1] });
  return out;
}

// Skin rings: ringFn(station, v in [0,1]) -> [x, y, z]. Closed rings (v wraps) when `closed`.
function loftGeometry(stations, ringFn, nSeg = 40, { closed = true, flip = false } = {}) {
  const verts = [], uvs = [], idx = [];
  const nRing = closed ? nSeg : nSeg + 1;
  stations.forEach((st, i) => {
    for (let j = 0; j < nRing; j++) {
      const v = j / nSeg;
      const p = ringFn(st, v);
      verts.push(p[0], p[1], p[2]);
      uvs.push(i / (stations.length - 1), v);
    }
  });
  const segs = closed ? nSeg : nSeg;
  for (let i = 0; i < stations.length - 1; i++) {
    for (let j = 0; j < segs; j++) {
      const j1 = closed ? (j + 1) % nRing : j + 1;
      const a = i * nRing + j, b = (i + 1) * nRing + j, c = (i + 1) * nRing + j1, d = i * nRing + j1;
      if (flip) { idx.push(a, d, b, b, d, c); } else { idx.push(a, b, d, b, c, d); }
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
}

// Fan cap over a ring (used for the sidepod inlet mouth / closed ends)
function capGeometry(ringPts) {
  const c = new THREE.Vector3();
  ringPts.forEach(p => c.add(p)); c.multiplyScalar(1 / ringPts.length);
  const verts = [c.x, c.y, c.z], idx = [];
  ringPts.forEach(p => verts.push(p.x, p.y, p.z));
  for (let j = 0; j < ringPts.length; j++) idx.push(0, 1 + j, 1 + ((j + 1) % ringPts.length));
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
}

// Signed superellipse helper: sgn(c)|c|^e
const spow = (c, e) => Math.sign(c) * Math.pow(Math.abs(c), e);

export function createActiveWingsBodywork(options = {}) {
  const group = new THREE.Group();
  group.name = 'Active_Wings_Bodywork_Assembly';

  // Palette aliases
  const navyMat = materials.redBullNavy || materials.carbonSatinChassis;
  const yellowMat = materials.redBullYellow || materials.ledYellowSafety;
  const redMat = materials.redBullRed || materials.anodizedRed;
  const carbonMat = materials.carbonGloss;
  const carbonMatte = materials.carbonMatteStructural;

  // =========================================================================
  // 1. ACTIVE FRONT WING & FIS NOSECONE ASSEMBLY
  // Matches User Wireframe Drawing (media_1790507089454.png):
  // - Smooth parabolic drooping nosecone from Bulkhead A down to front wing datum
  // - Low-ground-clearance spoon mainplane (Z = 0.55 dm = 55 mm off tarmac)
  // - 2-Stage active flaps with authentic slot gaps
  // - Flared ski-ramp footplate on outer endplates
  // =========================================================================
  const frontAeroGroup = new THREE.Group();
  frontAeroGroup.name = 'Assembly_Active_Front_Aero';

  // -------------------------------------------------------------------------
  // 1A. PROCEDURAL 3D LOFTED NOSECONE (FIA Front Impact Structure)
  // Drooping continuously from Cockpit Bulkhead (X = 0) down to Front Wing (X = -10.2)
  // -------------------------------------------------------------------------
  const noseGroup = new THREE.Group();
  noseGroup.name = 'Nosecone_FIS_Assembly';

  // Wide, flat 2026-style nose (refs 07/08/10): broad flattened-superellipse sections,
  // drooping from Bulkhead A-A (X = 0) to a blunt rounded tip over the wing on two pillars.
  const NOSE_L = 9.0;   // lofted body length (dm)
  const TIP_L = 0.8;    // rounded tip length (dm) -> tip at X = -9.8
  const noseZc = u => 2.70 - 1.25 * Math.pow(u, 1.5);          // centreline 2.70 -> 1.45 dm
  const noseRy = u => 1.75 - 0.63 * Math.pow(u, 1.0);          // half-width 1.75 -> 1.12 dm (wide)
  const noseRz = u => 1.50 - 1.12 * Math.pow(u, 0.75);         // half-height 1.50 -> 0.38 dm (flat)
  const noseRing = (st, v) => {
    const th = v * Math.PI * 2, c = Math.cos(th), sn = Math.sin(th);
    const { x, u, k } = st; // k = tip rounding factor (1 on the body)
    const ry = noseRy(u) * Math.sqrt(k), rz = noseRz(u) * Math.sqrt(k);
    // boxy at the root so it fully encloses Bulkhead A-A and the FIS studs, rounder/flatter forward
    const b = Math.min(1, u / 0.3), under = 1 - 0.3 * Math.min(1, u / 0.4);
    return [x, ry * spow(c, 0.4 + 0.22 * b), noseZc(u) + rz * spow(sn, 0.6 + 0.2 * b) * (sn < 0 ? under : 1.0)];
  };
  const bodyStations = [], tipStations = [];
  for (let i = 0; i <= 40; i++) { const u = i / 40; bodyStations.push({ x: -u * NOSE_L, u, k: 1 }); }
  for (let i = 0; i <= 12; i++) {
    const t = i / 12; // quarter-ellipse closing of the tip
    tipStations.push({ x: -NOSE_L - TIP_L * Math.sin(t * Math.PI / 2), u: 1, k: Math.max(0, Math.cos(t * Math.PI / 2)) });
  }
  const noseGeo = loftGeometry(bodyStations, noseRing, 48);

  const noseMesh = new THREE.Mesh(noseGeo, navyMat);
  noseMesh.castShadow = true;
  noseMesh.receiveShadow = true;
  noseMesh.name = 'Nosecone_MainBody_Navy';
  noseGroup.add(noseMesh);

  // Racing-yellow blunt rounded tip (continues the loft, closes to a point)
  const tipMesh = new THREE.Mesh(loftGeometry(tipStations, noseRing, 48), yellowMat);
  tipMesh.castShadow = true;
  tipMesh.name = 'Nosecone_YellowTip';
  noseGroup.add(tipMesh);

  // Horizontal Side Camera Pods on Nose (Matching wireframe drawing)
  [-1, 1].forEach((side, cIdx) => {
    const camGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.55, 12);
    const camMesh = new THREE.Mesh(camGeo, carbonMatte);
    camMesh.rotation.x = Math.PI / 2;
    camMesh.position.set(-6.5, side * (noseRy(0.65) + 0.06), noseZc(0.65)); // on the nose flank
    noseGroup.add(camMesh);
  });

  // Vertical Pitot Mast on Upper Nose Bridge (Matching wireframe markup)
  const pitotMastGeo = new THREE.CylinderGeometry(0.02, 0.03, 0.75, 12);
  const pitotMast = new THREE.Mesh(pitotMastGeo, materials.titaniumBright);
  pitotMast.position.set(-2.0, 0, noseZc(0.2) + noseRz(0.2) + 0.36); // standing on the nose top
  noseGroup.add(pitotMast);

  const pitotProbeGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.45, 8);
  const pitotProbe = new THREE.Mesh(pitotProbeGeo, materials.titaniumBright);
  pitotProbe.rotation.z = Math.PI / 2;
  pitotProbe.position.set(-2.2, 0, noseZc(0.2) + noseRz(0.2) + 0.72);
  noseGroup.add(pitotProbe);

  // Twin aerofoil pillars carrying the nose over the front-wing mainplane
  [-1, 1].forEach(side => {
    const pillarShape = new THREE.Shape();
    pillarShape.moveTo(-0.45, 0);
    pillarShape.quadraticCurveTo(-0.1, 0.07, 0.45, 0.0);
    pillarShape.quadraticCurveTo(-0.1, -0.07, -0.45, 0);
    const pu = 0.93; // station under the nose (X = -8.4)
    const zTop = noseZc(pu) - noseRz(pu) * 0.7 + 0.06;
    const zBot = 0.62;
    const pillarGeo = new THREE.ExtrudeGeometry(pillarShape, { steps: 1, depth: zTop - zBot, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 2 });
    const pillar = new THREE.Mesh(pillarGeo, navyMat);
    pillar.position.set(-8.4, side * 0.55, zBot);
    pillar.name = `Nosecone_Pillar_${side > 0 ? 'LH' : 'RH'}`;
    noseGroup.add(pillar);
  });

  frontAeroGroup.add(noseGroup);

  // -------------------------------------------------------------------------
  // 1B. ACTIVE FRONT WING MAINPLANE & FLAPS
  // Spanning Y in [-8.8, +8.8] dm, ground clearance Z = 0.55 dm (55 mm off tarmac)
  // -------------------------------------------------------------------------
  const frontWingGroup = new THREE.Group();
  frontWingGroup.name = 'FrontWing_Aerofoil_Assembly';
  frontWingGroup.position.set(-8.6, 0.0, 0.55); // trailing edges close to the front tyres

  // Front Wing Mainplane Mesh (Contoured continuous carbon spoon mainplane)
  const mainplaneWidth = 17.6; // 1760 mm span
  const mainplaneChord = 2.4;  // 240 mm chord
  const mainplaneShape = new THREE.Shape();
  mainplaneShape.moveTo(-1.2, 0.0);
  mainplaneShape.quadraticCurveTo(0.0, 0.16, 1.2, 0.06);
  mainplaneShape.lineTo(1.15, -0.02);
  mainplaneShape.quadraticCurveTo(0.0, 0.04, -1.2, -0.04);
  mainplaneShape.closePath();

  const fwMainGeo = new THREE.ExtrudeGeometry(mainplaneShape, { steps: 24, depth: mainplaneWidth, bevelEnabled: false });
  fwMainGeo.center();

  // Apply subtle sweep-back and center spoon droop across vertices
  const fwPos = fwMainGeo.attributes.position;
  for (let p = 0; p < fwPos.count; p++) {
    // Before the mesh's Rx(90deg): local Z = span, local Y = thickness (becomes world up)
    const zSpan = fwPos.getZ(p);
    const normSpan = Math.abs(zSpan) / (mainplaneWidth / 2);
    // Sweep-back: tips move rearward by 1.2 dm
    fwPos.setX(p, fwPos.getX(p) + Math.pow(normSpan, 1.5) * 1.2);
    // Center droop (spoon): tips rise by 0.35 dm
    fwPos.setY(p, fwPos.getY(p) + Math.pow(normSpan, 2.0) * 0.35);
  }
  fwMainGeo.computeVertexNormals();

  const fwMainMesh = new THREE.Mesh(fwMainGeo, carbonMat);
  fwMainMesh.rotation.x = Math.PI / 2; // Span along Y
  fwMainMesh.castShadow = true;
  fwMainMesh.name = 'FrontWing_Mainplane';
  frontWingGroup.add(fwMainMesh);

  // -------------------------------------------------------------------------
  // 1C. 2-STAGE ACTIVE UPPER FLAPS (Left & Right)
  // Articulating between Z-Mode (+22°) and X-Mode (+4°)
  // -------------------------------------------------------------------------
  const activeFlapAngle = options.frontFlapAngle || 0.38;

  [-1, 1].forEach((side, sIdx) => {
    const isLeft = side > 0;
    const flapAssembly = new THREE.Group();
    flapAssembly.name = `FrontWing_ActiveFlap_${isLeft ? 'Left' : 'Right'}`;
    flapAssembly.position.set(0.25, side * 5.0, 0.22);

    const pivotNode = new THREE.Group();
    // Same sign on both sides; negative rotation about +Y raises the trailing edge.
    // full_car3d.js animates this toward -0.38 (Z-mode) / -0.07 (X-mode).
    pivotNode.rotation.y = 0;
    flapAssembly.rotation.y = -Math.abs(activeFlapAngle);

    // Flap 1 (Lower Active Element)
    const flap1Shape = new THREE.Shape();
    flap1Shape.moveTo(-0.55, 0.0);
    flap1Shape.quadraticCurveTo(0.0, 0.12, 0.65, 0.05);
    flap1Shape.lineTo(0.60, 0.01);
    flap1Shape.quadraticCurveTo(0.0, 0.04, -0.55, -0.02);
    flap1Shape.closePath();

    const flap1Geo = new THREE.ExtrudeGeometry(flap1Shape, { steps: 4, depth: 7.2, bevelEnabled: false });
    flap1Geo.center();
    flap1Geo.scale(1.5, 1, 1); // longer chord so the flap stack reaches toward the tyres
    const flap1Mesh = new THREE.Mesh(flap1Geo, navyMat);
    flap1Mesh.rotation.x = Math.PI / 2;
    pivotNode.add(flap1Mesh);

    // Flap 2 (Upper Gurney Element with 12mm slot gap)
    const flap2Shape = new THREE.Shape();
    flap2Shape.moveTo(-0.40, 0.0);
    flap2Shape.quadraticCurveTo(0.0, 0.10, 0.45, 0.04);
    flap2Shape.lineTo(0.42, 0.01);
    flap2Shape.quadraticCurveTo(0.0, 0.03, -0.40, -0.02);
    flap2Shape.closePath();

    const flap2Geo = new THREE.ExtrudeGeometry(flap2Shape, { steps: 4, depth: 6.8, bevelEnabled: false });
    flap2Geo.center();
    flap2Geo.scale(1.5, 1, 1);
    const flap2Mesh = new THREE.Mesh(flap2Geo, navyMat);
    flap2Mesh.rotation.x = Math.PI / 2;
    flap2Mesh.position.set(0.55, 0, 0.18); // Elevated slot gap
    pivotNode.add(flap2Mesh);

    // 4x Slot Gap Separators (connecting Flap 1 and Flap 2)
    for (let s = 0; s < 4; s++) {
      const sepY = -2.7 + s * 1.8;
      const sepGeo = new THREE.BoxGeometry(0.35, 0.03, 0.22);
      const sepMesh = new THREE.Mesh(sepGeo, carbonMatte);
      sepMesh.position.set(0.3, sepY, 0.09);
      pivotNode.add(sepMesh);
    }

    flapAssembly.add(pivotNode);
    frontWingGroup.add(flapAssembly);

    // -----------------------------------------------------------------------
    // 1D. FRONT WING ENDPLATE (FWEP) & FLARED SKI-RAMP FOOTPLATE
    // Directly matching user red circle markup in media_1790507089454.png!
    // -----------------------------------------------------------------------
    const fwepGroup = new THREE.Group();
    fwepGroup.position.set(0.6, side * 8.8, 0.25);

    // 1+2. Tall curved endplate that sweeps outward and down into a footplate at the bottom
    // (Samuel's sketch / ref 07). One continuous thin shell: lip -> quarter-round -> wall.
    const EP_R = 0.5, EP_LIP = 0.12, EP_T = 0.05, EP_ZB = -0.30;
    const epTop = sx => -0.30 + 1.35 + 1.05 * (1 - Math.pow(1 - sx, 2)); // top edge rises to the rear
    // profile point (out, z) for parameter v in [0,1] at chord station sx
    const epProfile = (sx, v) => {
      const arc = EP_R * Math.PI / 2, wall = Math.max(0.2, epTop(sx) - (EP_ZB + EP_R));
      const L = EP_LIP + arc + wall, d = v * L;
      if (d <= EP_LIP) return [EP_R + EP_LIP - d, EP_ZB];
      if (d <= EP_LIP + arc) { const a = Math.PI / 2 - (d - EP_LIP) / EP_R; return [EP_R - EP_R * Math.cos(a), EP_ZB + EP_R - EP_R * Math.sin(a)]; }
      return [0, EP_ZB + EP_R + (d - EP_LIP - arc)];
    };
    const epNs = 18, epNv = 22, epVerts = [], epIdx = [];
    const epPt = (i, j, inner) => {
      const sx = i / epNs, v = j / epNv, x = -2.4 + 4.2 * sx;
      const p0 = epProfile(sx, v), dv = 1e-3;
      const pa = epProfile(sx, Math.max(0, v - dv)), pb = epProfile(sx, Math.min(1, v + dv));
      const tx = pb[0] - pa[0], tz = pb[1] - pa[1], tl = Math.hypot(tx, tz) || 1;
      const n = [tz / tl, -tx / tl]; // outward/up normal of the profile
      const o = inner ? -EP_T : 0;
      return [x, side * (p0[0] + n[0] * o), p0[1] + n[1] * o];
    };
    for (const inner of [false, true]) for (let i = 0; i <= epNs; i++) for (let j = 0; j <= epNv; j++) epVerts.push(...epPt(i, j, inner));
    const ev = (inner, i, j) => (inner ? (epNs + 1) * (epNv + 1) : 0) + i * (epNv + 1) + j;
    const quad = (a, b, c, d, f) => { if (f) epIdx.push(a, c, b, a, d, c); else epIdx.push(a, b, c, a, c, d); };
    const fl = isLeft; // mirrored side flips the winding
    for (let i = 0; i < epNs; i++) for (let j = 0; j < epNv; j++) {
      quad(ev(false, i, j), ev(false, i + 1, j), ev(false, i + 1, j + 1), ev(false, i, j + 1), fl);
      quad(ev(true, i, j), ev(true, i + 1, j), ev(true, i + 1, j + 1), ev(true, i, j + 1), !fl);
    }
    for (let i = 0; i < epNs; i++) { // bottom (lip) and top edges
      quad(ev(false, i, 0), ev(true, i, 0), ev(true, i + 1, 0), ev(false, i + 1, 0), fl);
      quad(ev(false, i, epNv), ev(false, i + 1, epNv), ev(true, i + 1, epNv), ev(true, i, epNv), fl);
    }
    for (let j = 0; j < epNv; j++) { // leading and trailing edges
      quad(ev(false, 0, j), ev(false, 0, j + 1), ev(true, 0, j + 1), ev(true, 0, j), fl);
      quad(ev(false, epNs, j), ev(true, epNs, j), ev(true, epNs, j + 1), ev(false, epNs, j + 1), fl);
    }
    const fwepGeo = new THREE.BufferGeometry();
    fwepGeo.setAttribute('position', new THREE.Float32BufferAttribute(epVerts, 3));
    fwepGeo.setIndex(epIdx);
    fwepGeo.computeVertexNormals();
    const fwepWallMesh = new THREE.Mesh(fwepGeo, navyMat);
    fwepWallMesh.castShadow = true;
    fwepWallMesh.name = `FrontWing_Endplate_${isLeft ? 'LH' : 'RH'}`;
    fwepGroup.add(fwepWallMesh);

    // 3. Upright Mobil 1 Decal on Endplate Outer Face
    const epTex = createEndplateTexture(isLeft);
    const epDecalMat = new THREE.MeshStandardMaterial({
      map: epTex,
      transparent: true,
      roughness: 0.28,
      metalness: 0.35,
      side: THREE.DoubleSide
    });
    const p00 = new THREE.Vector3(-1.8, isLeft ? 0.035 : -0.035, 0.25);
    const p10 = new THREE.Vector3(1.6, isLeft ? 0.035 : -0.035, 0.25);
    const p11 = new THREE.Vector3(1.6, isLeft ? 0.035 : -0.035, 1.25);
    const p01 = new THREE.Vector3(-1.8, isLeft ? 0.035 : -0.035, 1.25);
    const epDecalMesh = isLeft // reads correctly from outside the car
      ? createDecalQuad(p10, p00, p01, p11, epDecalMat)
      : createDecalQuad(p00, p10, p11, p01, epDecalMat);
    fwepGroup.add(epDecalMesh);

    frontWingGroup.add(fwepGroup);
  });

  frontAeroGroup.add(frontWingGroup);
  group.add(frontAeroGroup);

  // =========================================================================
  // 2. SCULPTED 3D SIDEPODS & INTERNAL RADIATOR CORES
  // Overbite letterbox intakes, deep undercuts, and right-side-up ORACLE livery
  // =========================================================================
  const sidepodGroup = new THREE.Group();
  sidepodGroup.name = 'Sidepod_Assembly_LH_RH';

  [-1, 1].forEach((side, idx) => {
    const isLeft = side > 0;
    const pod = new THREE.Group();

    // Sidepod shell lofted between cross-sections (X = 8.6 inlet to X = 29.6 tail):
    // wide inlet under the halo/mirror, undercut below, then a coke-bottle taper
    // inward and downward to the rear. yIn sits inside the tub/engine cover (hidden).
    const podStations = resampleStations([
      // inlet starts under the halo / mirrors (refs 08-11), leaving room ahead of it
      // for the bargeboard deflector and floor-edge fins
      { x: 8.6,  yIn: 2.0, yOut: 5.9, zb: 0.62, zt: 3.7, uc: 0.30 },
      { x: 10.4, yIn: 2.0, yOut: 6.6, zb: 0.62, zt: 3.95, uc: 0.40 },
      { x: 13.5, yIn: 2.0, yOut: 6.7, zb: 0.62, zt: 3.9, uc: 0.45 },
      { x: 16.5, yIn: 2.0, yOut: 6.3, zb: 0.62, zt: 3.7, uc: 0.45 },
      { x: 19.5, yIn: 2.0, yOut: 5.5, zb: 0.62, zt: 3.35, uc: 0.40 },
      { x: 23.0, yIn: 1.9, yOut: 4.5, zb: 0.62, zt: 2.8, uc: 0.30 },
      { x: 26.5, yIn: 1.7, yOut: 3.5, zb: 0.62, zt: 2.0, uc: 0.2 },
      { x: 29.6, yIn: 1.5, yOut: 2.3, zb: 0.62, zt: 1.1, uc: 0.1 }
    ], 8);
    const podRing = (st, v, off = 0) => {
      const th = v * Math.PI * 2;
      const c = Math.cos(th), sn = Math.sin(th);
      const cy = (st.yIn + st.yOut) / 2, a = (st.yOut - st.yIn) / 2 + off;
      const cz = (st.zb + st.zt) / 2, bz = (st.zt - st.zb) / 2 + off;
      let y = cy + a * spow(c, 0.38);
      const z = cz + bz * spow(sn, 0.5);
      if (c > 0 && sn < 0) y -= a * st.uc * Math.pow(-sn, 1.6) * Math.pow(c, 0.3); // outboard undercut
      return [st.x, side * y, z];
    };
    const podGeo = loftGeometry(podStations, (st, v) => podRing(st, v), 48, { flip: isLeft }); // outward-facing normals on both sides
    const podMesh = new THREE.Mesh(podGeo, navyMat);
    podMesh.castShadow = true;
    podMesh.receiveShadow = true;
    podMesh.name = `Sidepod_Body_${isLeft ? 'LH' : 'RH'}`;
    pod.add(podMesh);

    // Rear end cap
    const tailSt = podStations[podStations.length - 1];
    const tailRing = []; for (let j = 0; j < 48; j++) { const p = podRing(tailSt, j / 48); tailRing.push(new THREE.Vector3(...p)); }
    if (!isLeft) tailRing.reverse(); // keep the cap normal pointing rearward
    const tailCap = new THREE.Mesh(capGeometry(tailRing), navyMat);
    tailCap.name = `Sidepod_TailCap_${isLeft ? 'LH' : 'RH'}`;
    pod.add(tailCap);

    // -----------------------------------------------------------------------
    // Livery decal conforming to the pod's outer flank (offset 0.02 dm)
    // Seen from outside: LH texture runs front-to-rear right-to-left, RH left-to-right
    // -----------------------------------------------------------------------
    const sidepodTex = createSidepodLiveryTexture(isLeft);
    const sidepodLiveryMat = new THREE.MeshStandardMaterial({
      map: sidepodTex,
      transparent: true,
      roughness: 0.28,
      metalness: 0.35,
      side: THREE.DoubleSide
    });
    const decX0 = 10.4, decX1 = 19.5;
    const decStations = podStations.filter(st => st.x >= decX0 - 1e-6 && st.x <= decX1 + 1e-6);
    const vA = -0.17, vB = 0.17; // ring angle range on the outer flank (fraction of a turn)
    const flankGeo = loftGeometry(decStations, (st, v) => podRing(st, vA + (vB - vA) * v, 0.02), 16, { closed: false, flip: !isLeft });
    const fuv = flankGeo.attributes.uv;
    for (let k = 0; k < fuv.count; k++) {
      const uu = fuv.getX(k);
      fuv.setXY(k, isLeft ? 1 - uu : uu, fuv.getY(k));
    }
    const flankMesh = new THREE.Mesh(flankGeo, sidepodLiveryMat);
    flankMesh.name = `Sidepod_OracleLivery_${isLeft ? 'LH' : 'RH'}`;
    pod.add(flankMesh);

    // Forward inlet: carbon lip around the mouth and a dark recessed intake face
    const inletSt = podStations[0];
    const lipPts = []; for (let j = 0; j < 48; j++) { const p = podRing(inletSt, j / 48, -0.06); lipPts.push(new THREE.Vector3(p[0], p[1], p[2])); }
    const inletRim = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(lipPts, true), 96, 0.08, 8, true), carbonMat);
    inletRim.name = `Sidepod_InletLip_${isLeft ? 'LH' : 'RH'}`;
    pod.add(inletRim);
    const mouthPts = lipPts.map(p => new THREE.Vector3(p.x + 0.5, p.y, p.z));
    const inletMouth = new THREE.Mesh(capGeometry(mouthPts), new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 0.95, side: THREE.DoubleSide }));
    inletMouth.name = `Sidepod_InletMouth_${isLeft ? 'LH' : 'RH'}`;
    pod.add(inletMouth);

    // Internal Radiator Core (Angled at 42°)
    const radCoreGeo = new THREE.BoxGeometry(0.18, 2.5, 1.9);
    const radCore = new THREE.Mesh(radCoreGeo, materials.titaniumBright);
    radCore.rotation.y = -0.55;
    radCore.position.set(10.6, side * 4.3, 2.4);
    pod.add(radCore);

    sidepodGroup.add(pod);
  });

  group.add(sidepodGroup);

  // =========================================================================
  // 3. ENGINE COVER, PRIMARY AIRBOX & DORSAL SHARK FIN
  // =========================================================================
  const engineCoverGroup = new THREE.Group();
  engineCoverGroup.name = 'Engine_Cover_Airbox_Fin_Assembly';

  // Primary Airbox Scoop (Yellow)
  const airboxGroup = new THREE.Group();
  airboxGroup.name = 'Airbox_RollHoop_Intake';
  airboxGroup.position.set(16.0, 0.0, 8.2); // single forward-facing intake over the roll hoop, behind the helmet

  const scoopShape = new THREE.Shape();
  scoopShape.moveTo(-0.9, -0.85);
  scoopShape.lineTo(0.9, -0.85);
  scoopShape.quadraticCurveTo(1.15, 0.65, 0.0, 1.05);
  scoopShape.quadraticCurveTo(-1.15, 0.65, -0.9, -0.85);
  scoopShape.closePath();

  const scoopGeo = new THREE.ExtrudeGeometry(scoopShape, {
    steps: 1,
    depth: 3.2,
    bevelEnabled: true,
    bevelThickness: 0.15,
    bevelSize: 0.12,
    bevelSegments: 3
  });
  scoopGeo.center();
  const scoopMesh = new THREE.Mesh(scoopGeo, yellowMat);
  scoopMesh.quaternion.setFromRotationMatrix(new THREE.Matrix4().set(
    0, 0, 1, 0,
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 0, 1
  ));
  scoopMesh.position.set(1.5, 0, 0);
  scoopMesh.name = 'Airbox_Scoop_Yellow';
  airboxGroup.add(scoopMesh);

  // Dark intake mouth on the forward face so the opening reads as forward-facing
  const mouthShape = new THREE.Shape();
  mouthShape.moveTo(-0.7, -0.6);
  mouthShape.lineTo(0.7, -0.6);
  mouthShape.quadraticCurveTo(0.9, 0.5, 0.0, 0.82);
  mouthShape.quadraticCurveTo(-0.9, 0.5, -0.7, -0.6);
  mouthShape.closePath();
  const mouthGeo = new THREE.ShapeGeometry(mouthShape);
  const mouthMesh = new THREE.Mesh(mouthGeo, new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 0.9, side: THREE.DoubleSide }));
  mouthMesh.quaternion.copy(scoopMesh.quaternion);
  mouthMesh.position.set(1.5 - 1.76, 0, -0.1); // just ahead of the scoop's front face
  mouthMesh.name = 'Airbox_Intake_Mouth';
  airboxGroup.add(mouthMesh);
  // (The FIA T-camera is modelled once, in cockpit_accessories_driver.js, on top of this intake.)

  engineCoverGroup.add(airboxGroup);

  // 3D Lofted Engine Cover Shell: rises from the cockpit rim to the airbox crown,
  // then tapers down and inward over the engine and gearbox to the rear-wing pylons.
  // Each ring is a rounded "tent": hw * (1 - s^k)^0.5 at height fraction s.
  const ecStations = resampleStations([
    // front stations rise right up to the scoop underside (7.2-7.35 dm): no gap under the airbox
    { x: 15.6, hw: 2.2, zb: 3.6, zt: 7.5, k: 3.0 },
    { x: 17.2, hw: 3.25, zb: 3.4, zt: 8.05, k: 3.0 }, // boxy shoulders enclose the tub top
    { x: 19.2, hw: 3.2, zb: 3.0, zt: 8.45, k: 2.4 },
    // flanks drop into the sidepod tops so no engine/cam hardware shows through the seam
    { x: 21.5, hw: 3.0, zb: 2.6, zt: 7.6, k: 2.6 },
    { x: 24.5, hw: 2.3, zb: 2.3, zt: 6.3, k: 2.0 },
    { x: 27.5, hw: 1.95, zb: 2.2, zt: 5.45, k: 2.2 },
    { x: 30.5, hw: 1.6, zb: 2.2, zt: 4.5, k: 2.4 },
    { x: 33.2, hw: 1.4, zb: 2.3, zt: 4.05, k: 2.6 },
    { x: 34.6, hw: 1.1, zb: 2.5, zt: 3.75, k: 2.6 }
  ], 8);
  const ecRing = (st, v, off = 0) => {
    // v: 0 -> +Y base, 0.5 -> crown, 1 -> -Y base (open underneath; sits on sidepods/tub)
    const s1 = 1 - Math.abs(2 * v - 1);            // 0 at base, 1 at crown
    const z = st.zb + (st.zt - st.zb) * s1 + off * 0.5;
    const w = (st.hw + off) * Math.sqrt(Math.max(0, 1 - Math.pow(s1, st.k)));
    return [st.x, (v < 0.5 ? 1 : -1) * w, z];
  };
  const ecGeo = loftGeometry(ecStations, (st, v) => ecRing(st, v), 48, { closed: false, flip: true });
  const ecMesh = new THREE.Mesh(ecGeo, navyMat);
  ecMesh.castShadow = true;
  ecMesh.receiveShadow = true;
  ecMesh.name = 'EngineCover_MainShell';
  engineCoverGroup.add(ecMesh);
  // Close the cover's forward face behind the headrest (fan over the first tent ring)
  {
    const st0 = ecStations[0], ring = [];
    for (let j = 0; j <= 32; j++) { const p = ecRing(st0, j / 32); ring.push(new THREE.Vector3(p[0], p[1], p[2])); }
    const ecCap = new THREE.Mesh(capGeometry(ring), navyMat);
    ecCap.name = 'EngineCover_FrontBulkheadCap';
    engineCoverGroup.add(ecCap);
  }

  // Red Bull Charging Bull Decals on Engine Cover Flanks
  [-1, 1].forEach((side, bIdx) => {
    const isLeft = side > 0;
    const ecLiveryTex = createEngineCoverLiveryTexture(isLeft);
    const ecLiveryMat = new THREE.MeshStandardMaterial({
      map: ecLiveryTex,
      transparent: true,
      roughness: 0.28,
      metalness: 0.35,
      side: THREE.DoubleSide
    });
    // Conforming decal on the cover flank (X 19.5-26.5, lower-mid flank), offset 0.02 dm
    const decSt = ecStations.filter(st => st.x >= 19.5 - 1e-6 && st.x <= 26.5 + 1e-6);
    const vLo = isLeft ? 0.08 : 0.92, vHi = isLeft ? 0.36 : 0.64;
    const ecDecGeo = loftGeometry(decSt, (st, v) => ecRing(st, vLo + (vHi - vLo) * v, 0.02), 12, { closed: false, flip: !isLeft });
    const duv = ecDecGeo.attributes.uv;
    for (let k = 0; k < duv.count; k++) {
      const uu = duv.getX(k);
      duv.setXY(k, isLeft ? 1 - uu : uu, duv.getY(k));
    }
    const ecDecal = new THREE.Mesh(ecDecGeo, ecLiveryMat);
    ecDecal.name = `EngineCover_LiveryDecal_${isLeft ? 'LH' : 'RH'}`;
    engineCoverGroup.add(ecDecal);
  });

  // Dorsal Shark Fin along Engine Spine
  const finShape = new THREE.Shape();
  finShape.moveTo(18.0, 7.9);  // Starts behind the roll hoop / airbox
  finShape.lineTo(18.0, 8.8); // Apex
  finShape.lineTo(33.0, 5.8); // Rear wing pylon junction
  finShape.lineTo(33.0, 3.95);
  finShape.quadraticCurveTo(24.0, 5.9, 18.0, 7.9);
  finShape.closePath();

  const finExtrude = { steps: 1, depth: 0.05, bevelEnabled: true, bevelThickness: 0.015, bevelSize: 0.015, bevelSegments: 2 };
  const finGeo = new THREE.ExtrudeGeometry(finShape, finExtrude);
  finGeo.center();
  const finMesh = new THREE.Mesh(finGeo, navyMat);
  finMesh.rotation.set(Math.PI / 2, 0, 0);
  finMesh.position.set(25.5, 0, (3.95 + 8.8) / 2); // re-centred on the shape's bounding box
  finMesh.name = 'Dorsal_Shark_Fin';
  engineCoverGroup.add(finMesh);

  // Central Single Inconel Tailpipe Exhaust (Article C5.8) - media_1790507837418.webp
  const exhaustGroup = new THREE.Group();
  exhaustGroup.name = 'PU_Exhaust_Tailpipe_Assembly';
  exhaustGroup.position.set(36.2, 0, 3.75);

  // Main tubular exhaust pipe
  const tailpipeGeo = new THREE.CylinderGeometry(0.40, 0.44, 4.2, 32, 1, true);
  const tailpipe = new THREE.Mesh(tailpipeGeo, materials.inconelExhaust);
  tailpipe.rotation.z = Math.PI / 2;
  exhaustGroup.add(tailpipe);

  // Heat Discoloration Lip (Titanium blue/gold heat oxidation ring)
  const lipGeo = new THREE.TorusGeometry(0.40, 0.035, 12, 32);
  const lipMat = new THREE.MeshStandardMaterial({
    color: 0x3d66aa, // Heat-tinted titanium blue
    roughness: 0.25,
    metalness: 0.92
  });
  const lip = new THREE.Mesh(lipGeo, lipMat);
  lip.rotation.y = Math.PI / 2;
  lip.position.set(2.1, 0, 0);
  exhaustGroup.add(lip);

  engineCoverGroup.add(exhaustGroup);

  group.add(engineCoverGroup);

  // =========================================================================
  // 4. ACTIVE REAR WING ASSEMBLY (REAR SPOILER)
  // Rebuilt with genuine horizontal spoon aerofoil geometry (zero Frenet frame bugs)
  // - True horizontal spoon mainplane (14.8 dm width, chord 2.4 dm along X)
  // - Active upper flap articulating between 26° (Z-Mode) and 3° (X-Mode)
  // - Backward-facing 100% upright bold ORACLE wordmark
  // - Dual structural swan-neck pylons mounting from diffuser
  // - Dual vertical red LED safety rain light strips (12 LEDs each)
  // =========================================================================
  const rearWingGroup = new THREE.Group();
  rearWingGroup.name = 'Assembly_Active_Rear_Wing';
  rearWingGroup.position.set(36.8, 0.0, 7.4);

  const rwFlapAngle = options.rearFlapAngle ?? -0.45; // Default Z-Mode angle (negative = trailing edge up)

  // -------------------------------------------------------------------------
  // 4A. REAR WING SPOON MAINPLANE (Genuine Horizontal Aerofoil)
  // -------------------------------------------------------------------------
  const rwSpan = 14.8;  // 1480 mm width
  const rwChord = 2.4;  // 240 mm chord along X
  const rwMainShape = new THREE.Shape();
  rwMainShape.moveTo(-1.2, 0.0);
  rwMainShape.quadraticCurveTo(0.0, 0.18, 1.2, 0.06);
  rwMainShape.lineTo(1.15, -0.02);
  rwMainShape.quadraticCurveTo(0.0, 0.04, -1.2, -0.04);
  rwMainShape.closePath();

  const rwMainGeo = new THREE.ExtrudeGeometry(rwMainShape, { steps: 24, depth: rwSpan, bevelEnabled: false });
  rwMainGeo.center();
  rwMainGeo.rotateX(Math.PI / 2); // Rotate on geometry: chord on X, span on Y, thickness on Z

  // Apply subtle symmetrical spoon center droop (curving down 25 mm at Y = 0)
  const rwMainPos = rwMainGeo.attributes.position;
  for (let p = 0; p < rwMainPos.count; p++) {
    const ySpan = rwMainPos.getY(p); // Span along Y
    const norm = Math.abs(ySpan) / (rwSpan / 2);
    // Center dips down subtly by 0.25 dm (symmetrical spoon)
    rwMainPos.setZ(p, rwMainPos.getZ(p) + (Math.pow(norm, 2.0) - 1.0) * 0.25);
  }
  rwMainGeo.computeVertexNormals();

  const rwMainMesh = new THREE.Mesh(rwMainGeo, carbonMat);
  rwMainMesh.rotation.set(0, 0, 0); // 100% horizontal, zero diagonal tilt
  rwMainMesh.castShadow = true;
  rwMainMesh.name = 'RearWing_Spoon_Mainplane';
  rearWingGroup.add(rwMainMesh);

  // -------------------------------------------------------------------------
  // 4B. ACTIVE MOVABLE UPPER FLAP & BACKWARD-FACING ORACLE DECAL
  // -------------------------------------------------------------------------
  const rwFlapPivot = new THREE.Group();
  rwFlapPivot.name = 'RearWing_Active_UpperFlap';
  rwFlapPivot.position.set(1.05, 0, 0.5); // behind and above the mainplane trailing edge (slot gap)
  rwFlapPivot.rotation.y = rwFlapAngle; // DRS / X-Mode pitch articulation around lateral Y axis

  const rwFlapShape = new THREE.Shape();
  rwFlapShape.moveTo(-0.6, 0.0);
  rwFlapShape.quadraticCurveTo(0.1, 0.16, 0.85, 0.06);
  rwFlapShape.lineTo(0.8, 0.0);
  rwFlapShape.quadraticCurveTo(0.1, 0.06, -0.6, -0.02);
  rwFlapShape.closePath();

  const rwFlapGeo = new THREE.ExtrudeGeometry(rwFlapShape, { steps: 8, depth: 14.4, bevelEnabled: false });
  rwFlapGeo.center();
  rwFlapGeo.rotateX(Math.PI / 2); // Rotate on geometry: chord on X, span on Y, thickness on Z
  rwFlapGeo.computeVertexNormals();

  const rwFlapMesh = new THREE.Mesh(rwFlapGeo, carbonMat);
  rwFlapMesh.rotation.set(0, 0, 0); // 100% horizontal, zero diagonal tilt
  rwFlapMesh.name = 'RearWing_Active_UpperFlap_Mesh';
  rwFlapPivot.add(rwFlapMesh);

  // Backward-Facing 100% Upright Bold ORACLE Wordmark
  // Normal faces +X (rearward), Up is +Z, Width spans -Y to +Y
  const rwOracleTex = createRearWingOracleTexture();
  const rwOracleMat = new THREE.MeshStandardMaterial({
    map: rwOracleTex,
    roughness: 0.25,
    metalness: 0.40,
    side: THREE.DoubleSide
  });

  const oP00 = new THREE.Vector3(0.72, -7.1, 0.02); // Bottom-Left (viewer's left from behind = car's right)
  const oP10 = new THREE.Vector3(0.72, 7.1, 0.02);  // Bottom-Right (viewer's right from behind = car's left)
  const oP11 = new THREE.Vector3(0.72, 7.1, 0.55);  // Top-Right
  const oP01 = new THREE.Vector3(0.72, -7.1, 0.55); // Top-Left
  const oracleDecal = createDecalQuad(oP00, oP10, oP11, oP01, rwOracleMat);
  oracleDecal.name = 'RearWing_OracleDecal';
  rwFlapPivot.add(oracleDecal);

  // Centerline Electro-Hydraulic DRS Actuator Ram
  const actRamGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.45, 12);
  const actRam = new THREE.Mesh(actRamGeo, materials.titaniumAnodized);
  actRam.rotation.z = Math.PI / 2;
  actRam.position.set(-0.25, 0, 0);
  rwFlapPivot.add(actRam);

  rearWingGroup.add(rwFlapPivot);

  // -------------------------------------------------------------------------
  // 4C. AUTHENTIC 3D SCULPTED ENDPLATES (Matching User Wireframe Drawing media_1790507435304.jpg)
  // Full-height compound contoured carbon walls with top bevel, flared mid-height hip,
  // bottom angled diffuser/beam wing junction, and 12-LED vertical rain light strips.
  // -------------------------------------------------------------------------
  function createSculptedEndplate(isLeft = true) {
    const side = isLeft ? 1 : -1;
    const epGroup = new THREE.Group();
    epGroup.name = `RearWing_Endplate_${isLeft ? 'Left' : 'Right'}`;

    // Stations along Z from top to bottom (relative to wing center Z = 0)
    // Defines { z, yOuter, yInner, xFwd, xAft }
    const stations = [
      { z:  1.45, yOuter: 7.35, yInner: 7.15, xFwd: -1.4, xAft:  1.50 }, // Top crest
      { z:  1.15, yOuter: 7.75, yInner: 7.15, xFwd: -1.5, xAft:  1.60 }, // Bevelled top chamfer
      { z:  0.40, yOuter: 7.82, yInner: 7.12, xFwd: -1.6, xAft:  1.70 }, // Upper flap junction
      { z: -0.10, yOuter: 7.85, yInner: 7.10, xFwd: -1.6, xAft:  1.70 }, // Mainplane junction
      { z: -1.00, yOuter: 7.95, yInner: 7.05, xFwd: -1.6, xAft:  1.80 }, // Descending waist
      { z: -1.85, yOuter: 8.12, yInner: 6.95, xFwd: -1.6, xAft:  1.85 }, // Mid-height flared hip (maximum width)
      { z: -2.70, yOuter: 7.85, yInner: 6.85, xFwd: -1.5, xAft:  1.75 }, // Inward sweep below tire line
      { z: -3.50, yOuter: 7.55, yInner: 6.72, xFwd: -1.4, xAft:  1.55 }, // Beam wing junction
      { z: -4.20, yOuter: 7.35, yInner: 6.65, xFwd: -1.2, xAft:  1.30 }  // Bottom angled tip above diffuser
    ];

    const numZ = stations.length;
    const numX = 12; // Chord segments
    const verts = [];
    const uvs = [];
    const indices = [];

    // 1. Outer Face
    for (let i = 0; i < numZ; i++) {
      const st = stations[i];
      const z = st.z;
      const y = side * st.yOuter;
      for (let j = 0; j <= numX; j++) {
        const u = j / numX;
        const x = THREE.MathUtils.lerp(st.xFwd, st.xAft, u);
        verts.push(x, y, z);
        uvs.push(u, i / (numZ - 1));
      }
    }

    const rowSize = numX + 1;
    for (let i = 0; i < numZ - 1; i++) {
      for (let j = 0; j < numX; j++) {
        const a = i * rowSize + j;
        const b = (i + 1) * rowSize + j;
        const c = (i + 1) * rowSize + (j + 1);
        const d = i * rowSize + (j + 1);
        if (isLeft) {
          indices.push(a, b, d);
          indices.push(b, c, d);
        } else {
          indices.push(a, d, b);
          indices.push(b, d, c);
        }
      }
    }

    // 2. Inner Face
    const innerOffset = verts.length / 3;
    for (let i = 0; i < numZ; i++) {
      const st = stations[i];
      const z = st.z;
      const y = side * st.yInner;
      for (let j = 0; j <= numX; j++) {
        const u = j / numX;
        const x = THREE.MathUtils.lerp(st.xFwd, st.xAft, u);
        verts.push(x, y, z);
        uvs.push(u, i / (numZ - 1));
      }
    }

    for (let i = 0; i < numZ - 1; i++) {
      for (let j = 0; j < numX; j++) {
        const a = innerOffset + i * rowSize + j;
        const b = innerOffset + (i + 1) * rowSize + j;
        const c = innerOffset + (i + 1) * rowSize + (j + 1);
        const d = innerOffset + i * rowSize + (j + 1);
        if (isLeft) {
          indices.push(a, d, b);
          indices.push(b, d, c);
        } else {
          indices.push(a, b, d);
          indices.push(b, c, d);
        }
      }
    }

    // 3. Perimeter walls connecting Outer and Inner faces:
    // Leading Edge (j = 0)
    for (let i = 0; i < numZ - 1; i++) {
      const outA = i * rowSize;
      const outB = (i + 1) * rowSize;
      const inA = innerOffset + i * rowSize;
      const inB = innerOffset + (i + 1) * rowSize;
      if (isLeft) {
        indices.push(outA, inA, outB);
        indices.push(inA, inB, outB);
      } else {
        indices.push(outA, outB, inA);
        indices.push(inA, outB, inB);
      }
    }

    // Trailing Edge (j = numX)
    for (let i = 0; i < numZ - 1; i++) {
      const outA = i * rowSize + numX;
      const outB = (i + 1) * rowSize + numX;
      const inA = innerOffset + i * rowSize + numX;
      const inB = innerOffset + (i + 1) * rowSize + numX;
      if (isLeft) {
        indices.push(outA, outB, inA);
        indices.push(inA, outB, inB);
      } else {
        indices.push(outA, inA, outB);
        indices.push(inA, inB, outB);
      }
    }

    // Top Edge (i = 0)
    for (let j = 0; j < numX; j++) {
      const outA = j;
      const outB = j + 1;
      const inA = innerOffset + j;
      const inB = innerOffset + j + 1;
      if (isLeft) {
        indices.push(outA, outB, inA);
        indices.push(inA, outB, inB);
      } else {
        indices.push(outA, inA, outB);
        indices.push(inA, inB, outB);
      }
    }

    // Bottom Edge (i = numZ - 1)
    const bRowOut = (numZ - 1) * rowSize;
    const bRowIn = innerOffset + (numZ - 1) * rowSize;
    for (let j = 0; j < numX; j++) {
      const outA = bRowOut + j;
      const outB = bRowOut + j + 1;
      const inA = bRowIn + j;
      const inB = bRowIn + j + 1;
      if (isLeft) {
        indices.push(outA, inA, outB);
        indices.push(inA, inB, outB);
      } else {
        indices.push(outA, outB, inA);
        indices.push(inA, outB, inB);
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    geo.computeVertexNormals();

    const mesh = new THREE.Mesh(geo, navyMat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    epGroup.add(mesh);

    // Livery Decal on Flared Outer Hip
    const epTex = createEndplateTexture(isLeft);
    const epDecalMat = new THREE.MeshStandardMaterial({
      map: epTex,
      transparent: true,
      roughness: 0.28,
      metalness: 0.35,
      side: THREE.DoubleSide
    });
    const hipY = side * (8.12 + 0.04);
    const epP00 = new THREE.Vector3(-1.4, hipY, -2.5);
    const epP10 = new THREE.Vector3( 1.4, hipY, -2.5);
    const epP11 = new THREE.Vector3( 1.4, hipY,  0.8);
    const epP01 = new THREE.Vector3(-1.4, hipY,  0.8);
    const epDecal = isLeft // reads correctly from outside the car
      ? createDecalQuad(epP10, epP00, epP01, epP11, epDecalMat)
      : createDecalQuad(epP00, epP10, epP11, epP01, epDecalMat);
    epDecal.name = `RearWing_LiveryDecal_${isLeft ? 'LH' : 'RH'}`;
    epGroup.add(epDecal);

    // Inner Face Red-to-Blue Carbon Gradient Fade (media_1790507837418.webp)
    const innerGradTex = createRearWingEndplateInnerTexture(isLeft);
    const innerGradMat = new THREE.MeshStandardMaterial({
      map: innerGradTex,
      roughness: 0.32,
      metalness: 0.30,
      side: THREE.DoubleSide
    });
    const inY = side * (6.95 - 0.02);
    const inP00 = new THREE.Vector3(-1.4, inY, -3.8);
    const inP10 = new THREE.Vector3( 1.4, inY, -3.8);
    const inP11 = new THREE.Vector3( 1.4, inY,  1.2);
    const inP01 = new THREE.Vector3(-1.4, inY,  1.2);
    const innerDecal = isLeft
      ? createDecalQuad(inP10, inP00, inP01, inP11, innerGradMat)
      : createDecalQuad(inP00, inP10, inP11, inP01, innerGradMat);
    innerDecal.name = `RearWing_InnerGradient_${isLeft ? 'LH' : 'RH'}`;
    epGroup.add(innerDecal);

    // VERTICAL RED LED RAIN LIGHT STRIP (12 LEDs along trailing edge of endplate)
    const ledStripGroup = new THREE.Group();
    ledStripGroup.name = `RainLED_Strip_${isLeft ? 'LH' : 'RH'}`;
    const ledGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.04, 8);
    for (let k = 0; k < 12; k++) {
      const t = k / 11;
      const ledZ = THREE.MathUtils.lerp(1.2, -3.8, t);
      const ledX = THREE.MathUtils.lerp(1.5, 1.35, t) + 0.02;
      const ledY = side * THREE.MathUtils.lerp(7.4, 7.3, t);
      const led = new THREE.Mesh(ledGeo, materials.ledRed);
      led.rotation.z = Math.PI / 2;
      led.position.set(ledX, ledY, ledZ);
      led.name = `RainLED_${isLeft ? 'LH' : 'RH'}_${k}`;
      ledStripGroup.add(led);
    }
    epGroup.add(ledStripGroup);

    return epGroup;
  }

  // Add Left and Right 3D Sculpted Endplates
  rearWingGroup.add(createSculptedEndplate(true));
  rearWingGroup.add(createSculptedEndplate(false));

  // -------------------------------------------------------------------------
  // 4D. STRUCTURAL LOWER BEAM WING (Matching media_1790507435304.jpg)
  // -------------------------------------------------------------------------
  const beamWingGroup = new THREE.Group();
  beamWingGroup.name = 'RearWing_BeamWing_Assembly';
  beamWingGroup.position.set(0.4, 0, -2.9); // world Z 4.5, clear above the exhaust (Z 3.31-4.19)

  const bwSpan = 13.4; // Spans from Y = -6.7 to Y = +6.7 dm (between endplates)
  const bwShape = new THREE.Shape();
  bwShape.moveTo(-0.9, 0.0);
  bwShape.quadraticCurveTo(-0.1, 0.18, 0.9, 0.04);
  bwShape.lineTo(0.85, -0.06);
  bwShape.quadraticCurveTo(-0.1, -0.02, -0.9, -0.04);
  bwShape.closePath();

  const bwGeo = new THREE.ExtrudeGeometry(bwShape, { steps: 16, depth: bwSpan, bevelEnabled: false });
  bwGeo.center();
  bwGeo.rotateX(Math.PI / 2);
  bwGeo.computeVertexNormals();
  const bwMesh = new THREE.Mesh(bwGeo, carbonMat);
  bwMesh.rotation.set(0, 0, 0);
  bwMesh.castShadow = true;
  beamWingGroup.add(bwMesh);
  rearWingGroup.add(beamWingGroup);

  // -------------------------------------------------------------------------
  // 4E. REAR IMPACT STRUCTURE & RAIN LIGHT
  // Modelled once, on the gearbox, in transmission_moving_gears.js (RIS X 35.0-37.4, Z 2.0-3.35).
  // -------------------------------------------------------------------------

  // -------------------------------------------------------------------------
  // 4F. DUAL SWAN-NECK MOUNTING PYLONS
  // -------------------------------------------------------------------------
  [-0.55, 0.55].forEach(pylonY => {
    // The cross-section is flattened with geometry.scale(1.8, 0.6, 1), which also scales
    // the path, so pre-divide by the same factors to land the pylon where intended.
    const yp = pylonY / 0.6;
    const pylonCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.6 / 1.8, yp, -4.05), // Foot on top of the RIS (world X 36.2, Z 3.35)
      new THREE.Vector3(-0.8 / 1.8, yp, -2.6),  // Passes beside the exhaust
      new THREE.Vector3(-0.9 / 1.8, yp, -1.0),
      new THREE.Vector3(-0.6 / 1.8, yp, 0.0)    // Under mainplane
    ]);
    const pylonGeo = new THREE.TubeGeometry(pylonCurve, 16, 0.08, 8, false);
    pylonGeo.scale(1.8, 0.6, 1.0);
    const pylonMesh = new THREE.Mesh(pylonGeo, carbonMat);
    rearWingGroup.add(pylonMesh);
  });

  group.add(rearWingGroup);

  return group;
}
