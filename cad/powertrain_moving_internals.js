/**
 * 2026 Formula 1 "Nimble Car" Power Unit
 * SREdesigns - Samuel R Erwin III
 *
 * A data-driven model of a 2026-rules power unit:
 *  - 1.6 L 90-degree V6 (bore 80 mm, stroke 53 mm), bolted to the chassis rear bulkhead in front
 *    and to the gearbox bellhousing behind, crank on the gearbox input axis (z 1.45)
 *  - single turbocharger behind the engine (compressor in front, turbine behind), no MGU-H
 *  - 350 kW MGU-K low on the right of the block, geared to the front of the crank
 *  - ERS control electronics (inverters) on top of the bellhousing, fed from the energy store
 *  - carbon plenum in the V, airbox duct from the roll-hoop intake to the compressor
 *  - Inconel 3-into-1 exhaust manifolds into the turbine, wastegate, single downpipe to the tailpipe
 *  - water radiators, charge-air cooler and oil cooler in the sidepods, with hoses
 *
 * Frame: CAD car frame, X nose -> tail, +Y left, +Z up, units dm. Every position below comes
 * from PU_SPEC / COOLING_SPEC so a game can swap engines or re-package coolers without new code.
 *
 * Animated parts (driven by full_car3d.js):
 *  Kinematic_Crankshaft_Assembly (about X), Kinematic_CamSpin (each cam, about X),
 *  Kinematic_Turbo_Rotor, Kinematic_MGUK_Rotor, and the pistons via group.userData.setCrankAngle(a).
 */

import * as THREE from 'three';
import { materials } from '../materials.js';

export const PU_SPEC = {
  crank: { z: 1.45, mainR: 0.24, pinR: 0.2, throw: 0.265 },
  vAngle: Math.PI / 2,
  block: { x0: 22.45, x1: 26.85, halfWidth: 1.0, sumpZ: 0.68 },
  frontCover: { x0: 22.14, x1: 22.45 },          // bolts to the tub rear bulkhead (x 22.12)
  rearFlange: { x0: 26.85, x1: 26.98 },          // bolts to the gearbox bellhousing
  bellhousing: { x0: 26.98, x1: 27.45, r: 0.95, zScale: 0.8 },
  cylinders: { firstX: 23.05, pitch: 1.12, bankStagger: 0.22, bore: 0.8, rodLength: 0.85 },
  // bank cross-section, in the bank frame (y across the bank, z out along the bore from the crank)
  bank: { barrel: [0.40, 1.30, 0.55], head: [1.30, 1.82, 0.70], cover: [1.82, 2.05, 0.66], x0: 22.55, x1: 26.2 },
  plenum: { x0: 22.7, x1: 26.15, zb: 3.2, zt: 4.05, wb: 0.72, wt: 0.95 },
  turbo: { axisZ: 4.35, compressorX: 27.32, turbineX: 28.05, compressorR: 0.48, turbineR: 0.45 },
  airbox: [[17.55, 0, 7.55], [19.4, 0, 6.75], [22.4, 0, 5.45], [25.4, 0, 4.72], [26.75, 0, 4.4], [27.02, 0, 4.36]],
  downpipe: [[28.3, 0, 4.35], [29.3, 0, 4.3], [31.0, 0, 4.22], [32.8, 0, 4.13], [34.15, 0, 3.75]],
  mguk: { x0: 22.85, x1: 24.35, y: -2.1, z: 1.15, r: 0.55 },
  ce: { x0: 28.45, x1: 29.4, yIn: 0.75, yOut: 1.5, z0: 3.1, z1: 3.9 },
};

export const COOLING_SPEC = {
  coolers: [
    // name, centre, size [thickness, width, height], lean about Y (rad), core type
    { name: 'Cooler_Radiator_Water_LH', at: [11.0, 4.25, 2.2], size: [0.3, 2.5, 2.1], lean: -0.55, core: 'water' },
    { name: 'Cooler_Radiator_Water_RH', at: [11.0, -4.25, 2.2], size: [0.3, 2.5, 2.1], lean: -0.55, core: 'water' },
    { name: 'Cooler_ChargeAir_LH', at: [23.45, 2.7, 1.55], size: [2.2, 1.25, 1.4], lean: 0, core: 'air', alongX: true },
    { name: 'Cooler_Oil_RH', at: [15.4, -4.3, 1.9], size: [0.25, 2.0, 1.6], lean: -0.45, core: 'oil' },
    { name: 'Cooler_ERS_LH', at: [15.4, 4.3, 1.9], size: [0.25, 2.0, 1.6], lean: -0.45, core: 'water' },
  ],
  hoses: [
    { name: 'Hose_Water_Feed_LH', r: 0.1, mat: 'rubber', pts: [[11.4, 3.4, 1.05], [16.0, 3.45, 0.95], [20.5, 3.3, 0.95], [22.0, 2.6, 1.0], [22.2, 1.05, 1.05]] },
    { name: 'Hose_Water_Return_LH', r: 0.1, mat: 'rubber', pts: [[11.6, 3.3, 3.0], [16.5, 3.5, 1.3], [20.5, 3.45, 1.3], [21.9, 2.5, 1.6], [22.2, 0.95, 2.6]] },
    { name: 'Hose_Water_Feed_RH', r: 0.1, mat: 'rubber', pts: [[11.4, -3.4, 1.05], [16.0, -3.45, 0.95], [20.5, -3.3, 0.95], [22.0, -2.5, 0.95], [22.25, -1.9, 1.0]] },
    { name: 'Hose_Water_Return_RH', r: 0.1, mat: 'rubber', pts: [[11.6, -3.3, 3.0], [16.5, -3.5, 1.3], [20.5, -3.45, 1.3], [21.9, -2.5, 1.6], [22.2, -1.0, 2.5]] },
    { name: 'Hose_Oil_Feed_RH', r: 0.07, mat: 'braid', pts: [[15.6, -3.4, 1.2], [19.0, -3.2, 1.15], [21.9, -2.7, 1.2], [22.25, -1.0, 0.85]] },
    { name: 'Pipe_ChargeAir_Hot', r: 0.2, mat: 'alloy', pts: [[27.3, 0.42, 4.68], [26.4, 0.95, 4.42], [24.8, 1.45, 3.78], [23.6, 2.05, 3.05], [23.55, 2.6, 2.3]] },
    { name: 'Pipe_ChargeAir_Cold', r: 0.2, mat: 'alloy', pts: [[22.35, 2.6, 2.1], [22.32, 1.95, 3.0], [22.45, 1.0, 3.62], [22.72, 0.3, 3.68]] },
  ],
};

// ---------------------------------------------------------------------------------------------
// Materials (realistic metals and carbon, created once)
// ---------------------------------------------------------------------------------------------
let PU_MATS = null;
function puMaterials() {
  if (PU_MATS) return PU_MATS;
  const fins = (base, line, step = 4) => {
    const c = document.createElement('canvas'); c.width = 64; c.height = 64;
    const g = c.getContext('2d'); g.fillStyle = base; g.fillRect(0, 0, 64, 64);
    g.strokeStyle = line; g.lineWidth = 1;
    for (let i = 0; i < 64; i += step) { g.beginPath(); g.moveTo(i + 0.5, 0); g.lineTo(i + 0.5, 64); g.stroke(); }
    for (let j = 0; j < 64; j += 16) { g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(0, j, 64, 2); }
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(8, 4);
    t.colorSpace = THREE.SRGBColorSpace; return t;
  };
  const hasDoc = typeof document !== 'undefined';
  PU_MATS = {
    castAl: new THREE.MeshStandardMaterial({ name: 'PU_CastAluminium', color: 0x9da1a6, metalness: 0.85, roughness: 0.48 }),
    headAl: new THREE.MeshStandardMaterial({ name: 'PU_CylinderHead_Aluminium', color: 0xb3b6ba, metalness: 0.85, roughness: 0.38 }),
    magCover: new THREE.MeshStandardMaterial({ name: 'PU_CamCover_Magnesium_Painted', color: 0x2a2d32, metalness: 0.45, roughness: 0.42 }),
    forgedSteel: new THREE.MeshStandardMaterial({ name: 'PU_ForgedSteel', color: 0xb9bdc3, metalness: 1.0, roughness: 0.28 }),
    titanium: materials.titaniumAnodized,
    pistonAl: new THREE.MeshStandardMaterial({ name: 'PU_ForgedAluminium_Piston', color: 0xc9cbce, metalness: 0.8, roughness: 0.32 }),
    coil: new THREE.MeshStandardMaterial({ name: 'PU_IgnitionCoil_Black', color: 0x111214, metalness: 0.1, roughness: 0.55 }),
    carbon: materials.carbonGlossAero,
    carbonSatin: materials.carbonSatinChassis,
    inconel: materials.inconelTurbine,
    exhaust: new THREE.MeshStandardMaterial({ name: 'PU_Inconel_HeatTint', color: 0xffffff, vertexColors: true, metalness: 0.9, roughness: 0.34 }),
    turbineHousing: new THREE.MeshStandardMaterial({ name: 'PU_TurbineHousing_Inconel', color: 0x5c534c, metalness: 0.9, roughness: 0.5 }),
    compressorHousing: new THREE.MeshStandardMaterial({ name: 'PU_CompressorHousing_Aluminium', color: 0xc4c7cb, metalness: 0.9, roughness: 0.3 }),
    heatShield: materials.goldActuator || materials.heatShieldGold,
    mgukHousing: new THREE.MeshStandardMaterial({ name: 'PU_MGUK_Housing_Aluminium', color: 0x7e8288, metalness: 0.85, roughness: 0.42 }),
    copper: materials.copperWindings,
    hvOrange: materials.cableOrangeHV || new THREE.MeshStandardMaterial({ color: 0xff6a00, roughness: 0.5 }),
    ceBox: new THREE.MeshStandardMaterial({ name: 'PU_CE_Inverter_Aluminium', color: 0x8f9398, metalness: 0.8, roughness: 0.4 }),
    radCore: new THREE.MeshStandardMaterial({ name: 'PU_Radiator_Core', color: 0xffffff, map: hasDoc ? fins('#8a8e93', '#55595e') : null, metalness: 0.75, roughness: 0.5 }),
    oilCore: new THREE.MeshStandardMaterial({ name: 'PU_OilCooler_Core', color: 0xffffff, map: hasDoc ? fins('#5d6166', '#33363a', 3) : null, metalness: 0.75, roughness: 0.5 }),
    tank: new THREE.MeshStandardMaterial({ name: 'PU_Cooler_EndTank_Aluminium', color: 0xa7abb0, metalness: 0.85, roughness: 0.35 }),
    rubber: materials.rubberSeal || new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.8 }),
    braid: materials.braidedSteelHose || materials.titaniumAnodized,
    alloyPipe: new THREE.MeshStandardMaterial({ name: 'PU_ChargeAir_Pipe_Aluminium', color: 0xb0b4b9, metalness: 0.9, roughness: 0.3 }),
  };
  return PU_MATS;
}

// ---------------------------------------------------------------------------------------------
// Geometry helpers
// ---------------------------------------------------------------------------------------------
const toCarX = new THREE.Matrix4().set(0, 0, 1, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1); // shape (y,z) extruded along x
/** prism along X from a closed (y,z) outline */
function prismX(outline, x0, x1, bevel = 0) {
  const s = new THREE.Shape(outline.map(([y, z]) => new THREE.Vector2(y, z)));
  const g = new THREE.ExtrudeGeometry(s, { depth: x1 - x0 - 2 * bevel, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2, curveSegments: 8 });
  g.applyMatrix4(toCarX); g.translate(x0 + bevel, 0, 0); g.computeVertexNormals();
  return g;
}
function roundedRect(w, z0, z1, r) {
  const pts = [], h = w / 2, seg = 5;
  const corner = (cy, cz, a0) => { for (let i = 0; i <= seg; i++) { const a = a0 + (i / seg) * Math.PI / 2; pts.push([cy + r * Math.cos(a), cz + r * Math.sin(a)]); } };
  corner(h - r, z0 + r, -Math.PI / 2); corner(h - r, z1 - r, 0); corner(-h + r, z1 - r, Math.PI / 2); corner(-h + r, z0 + r, Math.PI);
  return pts;
}
function cylX(r, x0, x1, seg = 24, rEnd = r) {
  const g = new THREE.CylinderGeometry(rEnd, r, x1 - x0, seg);
  g.rotateZ(-Math.PI / 2); g.translate((x0 + x1) / 2, 0, 0);
  return g;
}
function mesh(geo, mat, name, parent, pos) {
  const m = new THREE.Mesh(geo, mat); m.name = name; m.castShadow = true; m.receiveShadow = true;
  if (pos) m.position.set(...pos);
  if (parent) parent.add(m);
  return m;
}
/** tube along points, with optional heat tint from `hot` (start) to `cool` (end) colours */
function pipe(pts, r, mat, name, parent, { r1 = r, tint = null, seg = 48 } = {}) {
  const curve = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p)), false, 'centripetal');
  const g = new THREE.TubeGeometry(curve, seg, 1, 14, false);
  // taper: scale each ring about its centre
  const pos = g.attributes.position, uv = g.attributes.uv, c = new THREE.Vector3(), p = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    const u = uv.getX(i); curve.getPointAt(Math.min(1, u), c); p.fromBufferAttribute(pos, i).sub(c);
    p.multiplyScalar(r + (r1 - r) * u).add(c); pos.setXYZ(i, p.x, p.y, p.z);
  }
  if (tint) {
    const col = new Float32Array(pos.count * 3), a = new THREE.Color(tint[0]), b = new THREE.Color(tint[1]), t = new THREE.Color();
    for (let i = 0; i < pos.count; i++) { t.copy(a).lerp(b, Math.min(1, uv.getX(i) * (tint[2] || 1))); col.set([t.r, t.g, t.b], i * 3); }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  }
  g.computeVertexNormals();
  return mesh(g, mat, name, parent);
}

// ---------------------------------------------------------------------------------------------
export function createPowertrainInternals(options = {}) {
  const S = { ...PU_SPEC, ...(options.powerUnit || {}) };
  const M = puMaterials();
  const group = new THREE.Group();
  group.name = 'Powertrain_Moving_Internals_Assembly';
  group.userData.spec = S;
  const cz = S.crank.z;
  const bankSides = [1, -1]; // bank 1 = left (+Y), bank 2 = right (-Y)
  const cylPos = (side, i) => S.cylinders.firstX + i * S.cylinders.pitch + (side < 0 ? S.cylinders.bankStagger : 0);
  const bankRot = (side) => -side * S.vAngle / 2;

  // =========================================================================
  // 1. BLOCK: crankcase, two cylinder banks, heads, cam covers, front cover, rear flange
  // =========================================================================
  const block = new THREE.Group();
  block.name = 'Engine_Crankcase_Block';
  group.add(block);
  const B = S.block;
  mesh(prismX([[-B.halfWidth + 0.15, B.sumpZ], [B.halfWidth - 0.15, B.sumpZ], [B.halfWidth, B.sumpZ + 0.25], [B.halfWidth, cz + 0.3], [0.62, cz + 0.62], [-0.62, cz + 0.62], [-B.halfWidth, cz + 0.3], [-B.halfWidth, B.sumpZ + 0.25]], B.x0, B.x1, 0.04), M.castAl, 'Engine_Crankcase_Lower', block);
  // ribbed dry-sump scavenge pump stack along the lower right side
  mesh(cylX(0.17, B.x0 + 0.3, B.x1 - 0.5, 16), M.castAl, 'Engine_DrySump_PumpStack', block, [0, -0.95, 0.95]);
  for (let k = 0; k < 6; k++) mesh(cylX(0.2, 0, 0.06, 16), M.castAl, `Engine_DrySump_PumpRib_${k}`, block, [B.x0 + 0.5 + k * 0.62, -0.95, 0.95]);

  const BK = S.bank;
  bankSides.forEach((side, bIdx) => {
    const bank = new THREE.Group();
    bank.name = `Engine_Bank_${bIdx + 1}_V90`;
    bank.position.set(0, 0, cz);
    bank.rotation.x = bankRot(side);
    block.add(bank);
    const [b0, b1, bw] = BK.barrel, [h0, h1, hw] = BK.head, [c0, c1, cw] = BK.cover;
    mesh(prismX(roundedRect(2 * bw, b0, b1, 0.06), BK.x0, BK.x1), M.castAl, `Engine_CylinderBlock_Bank${bIdx + 1}`, bank);
    mesh(prismX([[-hw, h0], [hw, h0], [hw, h1 - 0.08], [hw - 0.08, h1], [-hw + 0.08, h1], [-hw, h1 - 0.08]], BK.x0 - 0.05, BK.x1 + 0.05, 0.02), M.headAl, `Engine_CylinderHead_Bank${bIdx + 1}`, bank);
    // cam cover with the two cam humps
    const cov = [];
    for (let i = 0; i <= 24; i++) {
      const y = -cw + (2 * cw * i) / 24, q = Math.abs(y) / cw;
      const hump = Math.max(0, 1 - Math.abs(Math.abs(y) - 0.3) / 0.28);
      cov.push([y, c0 + (c1 - c0) * (0.55 + 0.45 * Math.sqrt(hump)) * Math.sqrt(Math.max(0, 1 - q ** 8))]);
    }
    cov.push([cw, c0], [-cw, c0]);
    mesh(prismX(cov.slice(0, -2).concat([[cw, c0], [-cw, c0]]).reverse(), BK.x0 + 0.05, BK.x1 - 0.05), M.magCover, `Engine_CamCover_Bank${bIdx + 1}`, bank);
    for (let i = 0; i < 3; i++) {
      const x = cylPos(side, i);
      const coil = mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.2, 14), M.coil, `Engine_IgnitionCoil_B${bIdx + 1}_Cyl${i + 1}`, bank, [x, 0, c1 - 0.05]);
      coil.rotation.x = Math.PI / 2;
      // exhaust port flange on the outside of the head
      const fl = mesh(new THREE.BoxGeometry(0.62, 0.06, 0.34), M.inconel, `Engine_ExhaustPortFlange_B${bIdx + 1}_Cyl${i + 1}`, bank, [x, side * (hw + 0.03), 1.58]);
      fl.castShadow = false;
    }
    // fuel rail along the inside of the head (direct injection)
    mesh(cylX(0.045, BK.x0 + 0.2, BK.x1 - 0.2, 10), M.forgedSteel, `Engine_FuelRail_Bank${bIdx + 1}`, bank, [0, -side * (hw + 0.05), 1.62]);
  });
  // front cover (gear train, water and oil pumps) and rear flange
  const FC = S.frontCover;
  mesh(prismX(roundedRect(2.1, B.sumpZ, 3.05, 0.35), FC.x0, FC.x1, 0.03), M.castAl, 'Engine_FrontTimingCover', block);
  mesh(cylX(0.22, FC.x0 - 0.02, FC.x0 + 0.12, 18), M.castAl, 'Engine_WaterPump_LH', block, [0, 1.05, 1.05]);
  mesh(cylX(0.22, FC.x0 - 0.02, FC.x0 + 0.12, 18), M.castAl, 'Engine_WaterPump_RH', block, [0, -1.0, 2.5]);
  const RF = S.rearFlange;
  mesh(prismX(roundedRect(2.0, B.sumpZ, cz + 0.85, 0.3), RF.x0, RF.x1), M.castAl, 'Engine_RearFlange_GearboxInterface', block);
  const BH = S.bellhousing;
  const bhGeo = cylX(BH.r, BH.x0, BH.x1, 20, BH.r * 1.05); bhGeo.scale(1, 1, BH.zScale); bhGeo.translate(0, 0, cz);
  mesh(bhGeo, M.castAl, 'Engine_Gearbox_Bellhousing_Adapter', block);
  // engine mounting studs onto the gearbox (6 around the flange)
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2;
    mesh(cylX(0.05, RF.x1, RF.x1 + 0.12, 8), M.forgedSteel, `Engine_GearboxStud_${k}`, block, [0, 0.85 * Math.cos(a), cz + 0.72 * Math.sin(a)]);
  }

  // =========================================================================
  // 2. CRANKSHAFT (spins about X)
  // =========================================================================
  const crank = new THREE.Group();
  crank.name = 'Kinematic_Crankshaft_Assembly';
  crank.position.set(0, 0, cz);
  group.add(crank);
  const C = S.crank;
  const pinAngle = (i) => (i * 2 * Math.PI) / 3;
  mesh(cylX(C.mainR * 0.7, B.x0 - 0.25, B.x1 + 0.05, 18), M.forgedSteel, 'Crank_Nose_And_Tail', crank);
  for (let i = 0; i < 3; i++) {
    const xa = cylPos(1, i) - 0.45, xb = cylPos(-1, i) + 0.45; // throw spans both rods
    const a = pinAngle(i), py = -C.throw * Math.sin(a), pz = C.throw * Math.cos(a);
    mesh(cylX(C.pinR, xa + 0.1, xb - 0.1, 16), M.forgedSteel, `Crank_Pin_${i + 1}`, crank, [0, py, pz]);
    [xa, xb - 0.12].forEach((wx, k) => {
      const outline = [];
      for (let q = 0; q <= 16; q++) { const th = (100 + (160 * q) / 16) * Math.PI / 180; outline.push([0.5 * Math.sin(th), 0.5 * Math.cos(th)]); }
      for (let q = 0; q <= 12; q++) { const ph = (270 + (180 * q) / 12) * Math.PI / 180; outline.push([0.24 * Math.sin(ph), C.throw + 0.24 * Math.cos(ph)]); }
      const w = mesh(prismX(outline, wx, wx + 0.12), M.forgedSteel, `Crank_Web_${i + 1}_${k}`, crank);
      w.rotation.x = a; // web follows its own throw
    });
  }
  for (let j = 0; j <= 3; j++) {
    const x = j === 0 ? B.x0 + 0.2 : j === 3 ? B.x1 - 0.25 : (cylPos(-1, j - 1) + cylPos(1, j)) / 2;
    mesh(cylX(C.mainR, x - 0.1, x + 0.1, 18), M.forgedSteel, `Crank_MainJournal_${j + 1}`, crank);
  }
  mesh(cylX(0.36, B.x0 - 0.15, B.x0 - 0.05, 28), M.forgedSteel, 'Crank_GearTrain_DriveGear', crank);

  // =========================================================================
  // 3. PISTONS AND CONNECTING RODS (follow the crank angle)
  // =========================================================================
  const pistons = new THREE.Group();
  pistons.name = 'Kinematic_Piston_Conrod_Assemblies';
  pistons.position.set(0, 0, cz);
  group.add(pistons);
  const pistonParts = [];
  bankSides.forEach((side, bIdx) => {
    const bankG = new THREE.Group();
    bankG.name = `Pistons_Bank${bIdx + 1}`;
    bankG.rotation.x = bankRot(side);
    pistons.add(bankG);
    for (let i = 0; i < 3; i++) {
      const x = cylPos(side, i);
      const asm = new THREE.Group(); asm.name = `Assembly_Piston_Rod_Cyl${bIdx * 3 + i + 1}`; bankG.add(asm);
      const piston = mesh(new THREE.CylinderGeometry(S.cylinders.bore / 2 - 0.01, S.cylinders.bore / 2 - 0.01, 0.3, 24), M.pistonAl, `Piston_Cyl${bIdx * 3 + i + 1}`, asm);
      piston.rotation.x = Math.PI / 2;
      const rod = mesh(new THREE.BoxGeometry(0.1, 0.12, 1), M.titanium, `ConRod_Cyl${bIdx * 3 + i + 1}`, asm);
      pistonParts.push({ x, side, pin: i, piston, rod });
    }
  });
  const setCrankAngle = (alpha) => {
    pistonParts.forEach(({ x, side, pin, piston, rod }) => {
      const psiBank = side > 0 ? -Math.PI / 4 : Math.PI / 4; // bank direction as an angle from +Z
      const d = pinAngle(pin) + alpha - psiBank;
      const r = C.throw, L = S.cylinders.rodLength;
      const py = -r * Math.sin(d), pz = r * Math.cos(d);
      const s = pz + Math.sqrt(L * L - py * py);
      piston.position.set(x, 0, s + 0.02);
      const dy = -py, dz = s - pz, len = Math.hypot(dy, dz);
      rod.position.set(x, (py + 0) / 2, (pz + s) / 2);
      rod.scale.set(1, 1, len);
      rod.rotation.x = -Math.atan2(dy, dz);
    });
  };
  setCrankAngle(0);
  group.userData.setCrankAngle = setCrankAngle;

  // =========================================================================
  // 4. VALVETRAIN: four camshafts in the heads (each spins about its own axis)
  // =========================================================================
  const valvetrain = new THREE.Group();
  valvetrain.name = 'Kinematic_DOHC_Valvetrain_Assembly';
  group.add(valvetrain);
  bankSides.forEach((side, bIdx) => {
    const bank = new THREE.Group(); bank.position.set(0, 0, cz); bank.rotation.x = bankRot(side);
    bank.name = `Valvetrain_Bank${bIdx + 1}`;
    valvetrain.add(bank);
    [0, 1].forEach((cType) => {
      const cam = new THREE.Group();
      cam.name = `Camshaft_${bIdx === 0 ? 'Bank1' : 'Bank2'}_${cType === 0 ? 'Intake' : 'Exhaust'}`;
      const yOff = (cType === 0 ? -side : side) * 0.3; // intake cam on the inside of the V
      cam.position.set(0, yOff, 1.86);
      bank.add(cam);
      const spin = new THREE.Group(); spin.name = 'Kinematic_CamSpin'; cam.add(spin);
      mesh(cylX(0.07, BK.x0 + 0.1, BK.x1 - 0.1, 12), M.forgedSteel, 'Cam_Shaft', spin);
      for (let i = 0; i < 3; i++) for (let l = 0; l < 2; l++) {
        const lobe = new THREE.Shape(); lobe.absellipse(0, 0.03, 0.1, 0.14, 0, Math.PI * 2, false);
        const lg = new THREE.ExtrudeGeometry(lobe, { depth: 0.12, bevelEnabled: false });
        lg.applyMatrix4(toCarX); lg.translate(cylPos(side, i) - 0.22 + l * 0.32, 0, 0);
        const lm = mesh(lg, M.forgedSteel, `Cam_Lobe_${i + 1}_${l}`, spin);
        lm.rotation.x = (i * 2 * Math.PI) / 3 + cType * 0.9;
      }
      mesh(cylX(0.24, BK.x0 - 0.02, BK.x0 + 0.06, 24), M.forgedSteel, 'Cam_DriveGear', spin);
    });
  });

  // =========================================================================
  // 5. INTAKE: airbox duct from the roll-hoop intake to the compressor, carbon plenum in the V
  // =========================================================================
  const intake = new THREE.Group();
  intake.name = 'Intake_Plenum_Airbox_Assembly';
  group.add(intake);
  pipe(S.airbox, 0.48, M.carbonSatin, 'Airbox_Duct_To_Compressor', intake, { r1: 0.3 });
  const P = S.plenum;
  const plOutline = [];
  for (let i = 0; i <= 20; i++) { const t = i / 20, a = Math.PI * t; plOutline.push([P.wt * Math.cos(a), P.zb + 0.35 + (P.zt - P.zb - 0.35) * Math.sin(a)]); }
  plOutline.push([-P.wb, P.zb], [P.wb, P.zb]);
  mesh(prismX(plOutline.reverse(), P.x0, P.x1, 0.06), M.carbon, 'Intake_Plenum_Carbon', intake);
  mesh(cylX(0.22, P.x0 - 0.18, P.x0 + 0.02, 18), M.castAl, 'Intake_ThrottleBody', intake, [0, 0.3, 3.68]);
  bankSides.forEach((side, bIdx) => {
    for (let i = 0; i < 3; i++) {
      const x = cylPos(side, i);
      mesh(new THREE.CylinderGeometry(0.15, 0.18, 0.3, 14), M.carbon, `Intake_Runner_B${bIdx + 1}_Cyl${i + 1}`, intake, [x, side * 0.66, 3.22]).rotation.x = side * 0.6;
    }
  });

  // =========================================================================
  // 6. EXHAUST: 3-into-1 manifolds outside each bank, into the single turbine
  // =========================================================================
  const exhaust = new THREE.Group();
  exhaust.name = 'Exhaust_Manifold_Assembly';
  group.add(exhaust);
  const T = S.turbo;
  const tint = [0x9b6a3c, 0x8a8f96, 1.4]; // straw/bronze near the ports fading to bare Inconel
  bankSides.forEach((side, bIdx) => {
    const portWorld = (x) => {
      const p = new THREE.Vector3(x, side * (BK.head[2] + 0.04), 1.58);
      p.applyAxisAngle(new THREE.Vector3(1, 0, 0), bankRot(side)); p.z += cz; return p;
    };
    const merge = [26.55, side * 1.72, 2.0];
    for (let i = 0; i < 3; i++) {
      const pt = portWorld(cylPos(side, i));
      const out = [pt.x, pt.y + side * 0.2, pt.z - 0.16];
      const run = [Math.min(pt.x + 0.5, 26.0), side * (1.86 - 0.05 * i), 1.86 + 0.07 * (i - 1)];
      const pts = i === 2 ? [[pt.x, pt.y, pt.z], out, merge] : [[pt.x, pt.y, pt.z], out, run, merge];
      pipe(pts, 0.15, M.exhaust, `Exhaust_Primary_B${bIdx + 1}_Cyl${i + 1}`, exhaust, { tint });
    }
    pipe([merge, [26.95, side * 1.5, 3.0], [27.6, side * 0.9, 3.62], [T.turbineX - 0.05, side * 0.32, T.axisZ - 0.36]], 0.22, M.exhaust, `Exhaust_Collector_B${bIdx + 1}`, exhaust, { r1: 0.2, tint: [0x7b5a3e, 0x6f7176, 1] });
  });

  // =========================================================================
  // 7. TURBOCHARGER (single, no MGU-H): only the rotor spins
  // =========================================================================
  const turbo = new THREE.Group();
  turbo.name = 'Turbocharger_Assembly_2026';
  group.add(turbo);
  const cx = T.compressorX, tx = T.turbineX, az = T.axisZ;
  const housing = (x, R, mat, name, w) => {
    const g = new THREE.Group(); g.name = name; g.position.set(x, 0, az); turbo.add(g);
    mesh(cylX(R * 0.82, -w / 2, w / 2, 28), mat, `${name}_Body`, g);
    const scroll = mesh(new THREE.TorusGeometry(R * 0.72, R * 0.28, 12, 32, Math.PI * 1.75), mat, `${name}_Scroll`, g);
    scroll.rotation.y = Math.PI / 2;
    return g;
  };
  const comp = housing(cx, T.compressorR, M.compressorHousing, 'Turbo_Compressor_Housing', 0.36);
  mesh(cylX(0.3, -0.38, -0.16, 24, 0.33), M.compressorHousing, 'Turbo_Compressor_Inlet_Bellmouth', comp);
  mesh(cylX(0.16, cx + 0.16, tx - 0.18, 16), M.forgedSteel, 'Turbo_Bearing_Housing_CHRA', turbo, [0, 0, az]);
  const turb = housing(tx, T.turbineR, M.turbineHousing, 'Turbo_Turbine_Housing', 0.4);
  mesh(cylX(0.27, 0.18, 0.3, 20), M.turbineHousing, 'Turbo_Turbine_Outlet', turb);
  // heat shield blanket over the turbine top
  const hs = mesh(new THREE.CylinderGeometry(T.turbineR + 0.06, T.turbineR + 0.06, 0.46, 24, 1, true, -Math.PI * 0.45, Math.PI * 0.9), M.heatShield, 'Turbo_Turbine_HeatShield', turb);
  hs.rotation.z = Math.PI / 2; hs.material.side = THREE.DoubleSide;
  // compressor outlet spigot (to the charge-air cooler)
  mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.3, 16), M.compressorHousing, 'Turbo_Compressor_Outlet', comp, [0, 0.32, 0.3]).rotation.x = 0.8;
  // rotor: shaft, compressor wheel, turbine wheel
  const rotor = new THREE.Group(); rotor.name = 'Kinematic_Turbo_Rotor'; rotor.position.set(0, 0, az); turbo.add(rotor);
  mesh(cylX(0.05, cx - 0.2, tx + 0.15, 10), M.forgedSteel, 'Turbo_Shaft', rotor);
  const wheel = (x, r, n, mat, name) => {
    mesh(cylX(0.08, x - 0.12, x + 0.12, 14, r * 0.4), mat, `${name}_Hub`, rotor);
    for (let k = 0; k < n; k++) {
      const b = mesh(new THREE.BoxGeometry(0.2, 0.012, r), mat, `${name}_Blade_${k}`, rotor);
      b.position.set(x, 0, 0); b.geometry.translate(0, 0, r / 2);
      b.rotation.x = (k / n) * Math.PI * 2; b.rotation.y = 0.35;
    }
  };
  wheel(cx - 0.05, 0.26, 10, M.compressorHousing, 'Turbo_CompressorWheel');
  wheel(tx + 0.02, 0.24, 11, M.inconel, 'Turbo_TurbineWheel');
  // wastegate on top of the turbine, its pipe joins the downpipe
  const wg = new THREE.Group(); wg.name = 'Wastegate_Assembly'; wg.position.set(tx + 0.12, 0, az + T.turbineR + 0.1); turbo.add(wg);
  mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.22, 16), M.inconel, 'Wastegate_Valve_Body', wg).rotation.x = Math.PI / 2;
  mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.16, 16), M.heatShield, 'Wastegate_Actuator', wg, [-0.05, 0, 0.16]).rotation.x = Math.PI / 2;
  pipe([[tx + 0.18, 0, az + T.turbineR + 0.08], [tx + 0.7, 0, az + 0.42], [29.6, 0, S.downpipe[1][2] + 0.14]], 0.08, M.exhaust, 'Wastegate_Pipe', exhaust, { tint: [0x8a6a4a, 0x8a8f96, 1] });
  // single downpipe to the tailpipe
  pipe(S.downpipe, 0.28, M.exhaust, 'Exhaust_Downpipe_To_Tailpipe', exhaust, { r1: 0.4, tint: [0x7f6450, 0x8a8f96, 1.5] });

  // =========================================================================
  // 8. MGU-K (geared to the front of the crank) and ERS control electronics
  // =========================================================================
  const K = S.mguk;
  const mguk = new THREE.Group();
  mguk.name = 'Assembly_350kW_MGUK_Motor';
  mguk.position.set(0, K.y, K.z);
  group.add(mguk);
  mesh(cylX(K.r, K.x0, K.x1, 28), M.mgukHousing, 'MGUK_Stator_Housing', mguk);
  for (let k = 0; k < 7; k++) mesh(cylX(K.r + 0.04, K.x0 + 0.15 + k * 0.19, K.x0 + 0.2 + k * 0.19, 28), M.mgukHousing, `MGUK_CoolingRib_${k}`, mguk);
  mesh(cylX(K.r * 0.9, K.x1, K.x1 + 0.08, 24), M.castAl, 'MGUK_EndCap_Rear', mguk);
  const term = mesh(new THREE.BoxGeometry(0.28, 0.42, 0.22), M.ceBox, 'MGUK_Phase_TerminalBox', mguk, [K.x1 + 0.05, 0, 0.3]);
  term.castShadow = false;
  mesh(new THREE.TorusGeometry(K.r * 0.7, 0.06, 8, 24), M.copper, 'MGUK_CopperHairpins', mguk, [K.x0 + 0.1, 0, 0]).rotation.y = Math.PI / 2;
  const mRotor = new THREE.Group(); mRotor.name = 'Kinematic_MGUK_Rotor'; mguk.add(mRotor);
  mesh(cylX(0.08, FC.x0 + 0.12, K.x1 - 0.1, 12), M.forgedSteel, 'MGUK_Rotor_Shaft', mRotor);
  mesh(cylX(0.38, K.x0 + 0.15, K.x1 - 0.15, 20), M.carbonSatin, 'MGUK_Rotor_CarbonSleeve', mRotor);
  // drive gear case linking the MGU-K to the engine's front gear train
  mesh(prismX(roundedRect(1.25, -0.42, 0.42, 0.18), FC.x0 + 0.04, K.x0 + 0.05), M.castAl, 'MGUK_Drive_GearCase', mguk, [0, 0.6, 0]);

  const CE = S.ce;
  bankSides.forEach((side) => {
    const ce = new THREE.Group(); ce.name = `ERS_ControlElectronics_${side > 0 ? 'LH' : 'RH'}`; group.add(ce);
    const yc = side * (CE.yIn + CE.yOut) / 2, w = CE.yOut - CE.yIn;
    mesh(new THREE.BoxGeometry(CE.x1 - CE.x0, w, CE.z1 - CE.z0), M.ceBox, `CE_Inverter_Case_${side > 0 ? 'LH' : 'RH'}`, ce, [(CE.x0 + CE.x1) / 2, yc, (CE.z0 + CE.z1) / 2]);
    for (let k = 0; k < 6; k++) mesh(new THREE.BoxGeometry(CE.x1 - CE.x0 - 0.1, 0.03, 0.08), M.ceBox, `CE_CoolingFin_${k}`, ce, [(CE.x0 + CE.x1) / 2, yc - w / 2 + 0.12 + k * (w - 0.24) / 5, CE.z1 + 0.04]);
    mesh(new THREE.BoxGeometry(0.05, w * 0.8, 0.12), M.hvOrange, `CE_HV_WarningBand_${side > 0 ? 'LH' : 'RH'}`, ce, [CE.x1 + 0.02, yc, (CE.z0 + CE.z1) / 2]);
  });

  // =========================================================================
  // 9. COOLING: radiators, charge-air cooler, oil cooler and hoses (data in COOLING_SPEC)
  // =========================================================================
  const cooling = new THREE.Group();
  cooling.name = 'PU_Cooling_System';
  group.add(cooling);
  const CS = options.cooling || COOLING_SPEC;
  CS.coolers.forEach((c) => {
    const g = new THREE.Group(); g.name = c.name; g.position.set(...c.at); g.rotation.y = c.lean; cooling.add(g);
    const [t, w, h] = c.size;
    const coreMat = c.core === 'oil' ? M.oilCore : M.radCore;
    if (c.alongX) { // air-to-air cooler lying along the car: core faces sideways
      mesh(new THREE.BoxGeometry(t, w, h), coreMat, `${c.name}_Core`, g);
      [-1, 1].forEach((e) => mesh(new THREE.BoxGeometry(0.22, w + 0.08, h + 0.08), M.tank, `${c.name}_EndTank_${e > 0 ? 'Rear' : 'Front'}`, g, [e * (t / 2 + 0.1), 0, 0]));
    } else {
      mesh(new THREE.BoxGeometry(t, w, h), coreMat, `${c.name}_Core`, g);
      [-1, 1].forEach((e) => mesh(new THREE.BoxGeometry(t + 0.1, 0.2, h + 0.06), M.tank, `${c.name}_EndTank_${e > 0 ? 'Outer' : 'Inner'}`, g, [0, e * Math.sign(c.at[1]) * (w / 2 + 0.1), 0]));
    }
  });
  const hoseMat = { rubber: M.rubber, braid: M.braid, alloy: M.alloyPipe };
  CS.hoses.forEach((h) => pipe(h.pts, h.r, hoseMat[h.mat] || M.rubber, h.name, cooling));

  return group;
}
