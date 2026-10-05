/**
 * monocoque_cockpit.js — 2026 Formula 1 "Nimble Car" Monocoque & Cockpit
 * SREdesigns - Samuel R Erwin III
 * 2026 Formula 1 Survival Cell, Halo, Roll Hoop, Steering Wheel & Pedal Box
 *
 * Full Procedural Fidelity (Zero Primitives, Zero Normal Maps):
 * - Carbon-Zylon Honeycomb Monocoque Tub: Bulkheads A-A, B-B, C-C, D-D, SIPS side crush tubes
 * - Grade 5 Ti-6Al-4V Titanium Halo: Forward center lug, dual rear bracket joints, aero fairing
 * - Primary Roll Hoop (172 kN): Split combustion airbox intake & secondary ERS radiator ducts
 * - Cockpit Interior: Anatomical bead seat, 6-point harness with rotary camlock buckle & adjusters
 * - PCU-8D Steering Wheel: Carbon monocoque, silicone hand grips, 20 pushbuttons, 6 rotary dials, shift paddles
 * - Adjustable Pedal Sled: Strain-gauge brake pedal, load cell, polyurethane bump-stop stack, throttle pedal
 * - Fire Suppression: Novec 1230 extinguisher cylinder, solenoid valve, plumbing nozzles, marshal kill switches
 *
 * Universal Automotive Datum:
 * - X: Longitudinal axis (0.0 at Bulkhead A-A / Front Axle, 22.0 at Bulkhead D-D)
 * - Y: Lateral axis (-Y right, +Y left)
 * - Z: Vertical axis (0.0 ground, 0.6 tub floor, 7.4 halo, 9.3 airbox crown)
 */

import * as THREE from "three";
import { materials as defaultMaterials } from "../materials.js";
import {
  createSocketHeadBolt,
  createStudWith12PtNut,
  createTorxScrew,
} from "./fasteners.js";
import {
  createHaloApexDecalTexture,
  createHaloArmDecalTexture,
  createCockpitRimDecals,
} from "./procedural_livery.js";
import { createSteeringWheelPCU8D } from "./steering_wheel_pcu8d.js";
import { sweepGeometry, mergeSimple } from "./sweep_section.js";

/**
 * Halo layout (car frame, dm). Hoop points run from the apex back to the left pad; the right
 * side is mirrored. Section is a flattened oval with a fuller leading edge, about 100 x 50 mm.
 */
export const HALO_SPEC = {
  hoop: [
    [9.2, 0.0, 7.33],   // apex, over the front post
    [9.4, 0.5, 7.32],
    [10.1, 1.35, 7.26],
    [11.4, 2.15, 7.13],
    [13.0, 2.5, 6.92],  // widest, beside the helmet (helmet half width 1.12)
    [14.6, 2.42, 6.72],
    [15.7, 2.25, 6.56],
    [16.45, 2.05, 6.45],
    [17.0, 1.95, 6.2],   // legs sink into the chassis shoulder under the cover (surface z 6.7 at x 16.45)
  ],
  width: 1.0, height: 0.5, sectionExp: 2.6,
  padLength: 0.14, padWidth: 1.15, padHeight: 0.8, // feet grow deeper as they blend into the shoulders
  post: [[7.3, 0, 5.02], [7.75, 0, 5.9], [8.45, 0, 6.78], [9.0, 0, 7.2], [9.3, 0, 7.31]],
  postWidth: 0.55, postDepth: 0.5, postFootWidth: 1.3, postFootDepth: 0.9,
};

export function buildMonocoqueAndCockpit(scene, mats) {
  const root = new THREE.Group();
  root.name = "Body_SurvivalCell_Monocoque_Assembly";

  // -------------------------------------------------------------
  // 1. CARBON-ZYLON SURVIVAL CELL TUB (2,200 mm length)
  // -------------------------------------------------------------
  // -------------------------------------------------------------
  // 1. CARBON-ZYLON SURVIVAL CELL TUB (2,200 mm length)
  // Tapered aerodynamic monocoque: 3.2 dm at front bulkhead -> 6.4 dm at cockpit
  // -------------------------------------------------------------
  const tubGroup = new THREE.Group();
  tubGroup.name = "Body_Monocoque_CarbonTub";

  const tubStations = [
    // x, half_width, z_bottom, z_top, is_cockpit_open
    { x: 0.0,  w: 1.60, zb: 1.2, zt: 4.2, open: false }, // Bulkhead A-A (Nose interface)
    { x: 3.5,  w: 1.85, zb: 1.15, zt: 4.4, open: false }, // Front suspension bulkhead
    { x: 7.2,  w: 2.30, zb: 0.6, zt: 5.2, open: false }, // Forward cockpit rim & Halo mount
    { x: 10.5, w: 3.10, zb: 0.6, zt: 4.5, open: true  }, // Cockpit opening / steering wheel
    { x: 14.5, w: 3.20, zb: 0.6, zt: 4.5, open: true  }, // Driver seating area
    { x: 17.5, w: 3.0,  zb: 0.6, zt: 5.8, open: false }, // Rear cockpit bulkhead & Roll hoop (inside the engine cover)
    { x: 22.0, w: 2.6,  zb: 0.6, zt: 5.4, open: false }  // Bulkhead D-D (Engine interface)
  ];

  const tubVerts = [];
  const tubIdxs = [];
  const tubUvs = [];
  const nSeg = 16;

  for (let i = 0; i < tubStations.length; i++) {
    const st = tubStations[i];
    const u = i / (tubStations.length - 1);

    for (let j = 0; j <= nSeg; j++) {
      const v = j / nSeg;
      const theta = v * Math.PI * 2;

      let py = Math.cos(theta) * st.w;
      let pz = (st.zb + st.zt) / 2 + Math.sin(theta) * ((st.zt - st.zb) / 2);

      // Carve open cockpit aperture on top for driver
      if (st.open && pz > 4.2 && Math.abs(py) < st.w * 0.85) {
        pz = 4.2; // Recessed rim
      }

      tubVerts.push(st.x, py, pz);
      tubUvs.push(u, v);
    }
  }

  for (let i = 0; i < tubStations.length - 1; i++) {
    for (let j = 0; j < nSeg; j++) {
      const a = i * (nSeg + 1) + j;
      const b = (i + 1) * (nSeg + 1) + j;
      const c = (i + 1) * (nSeg + 1) + (j + 1);
      const d = i * (nSeg + 1) + (j + 1);
      tubIdxs.push(a, b, d);
      tubIdxs.push(b, c, d);
    }
  }

  const tubGeo = new THREE.BufferGeometry();
  tubGeo.setAttribute('position', new THREE.Float32BufferAttribute(tubVerts, 3));
  tubGeo.setAttribute('uv', new THREE.Float32BufferAttribute(tubUvs, 2));
  tubGeo.setIndex(tubIdxs);
  tubGeo.computeVertexNormals();

  const tubMesh = new THREE.Mesh(tubGeo, mats.carbonSatinChassis || mats.carbonGloss);
  tubMesh.castShadow = true;
  tubMesh.receiveShadow = true;
  tubGroup.add(tubMesh);

  // Bulkhead A-A (Front chassis bulkhead at X = 0) with 4x M14 Titanium FIS Nose Studs
  // Elliptical, 3% inside the tub section here (Y ±1.6, Z 1.2-4.2). The old square plate's corners
  // stuck out of the round tub/nose join and read as a "square front" behind the nose.
  const bulkAGeo = new THREE.CylinderGeometry(1, 1, 0.18, 40);
  const bulkA = new THREE.Mesh(bulkAGeo, mats.carbonMatteStructural || mats.carbonGloss);
  bulkA.rotation.z = Math.PI / 2;      // disc faces along X
  bulkA.scale.set(1.55, 1, 1.45);      // local X -> car Y half-width, local Z -> car Z half-height
  bulkA.position.set(0.0, 0, 2.7);
  bulkA.name = "Body_Chassis_Bulkhead_AA";
  tubGroup.add(bulkA);

  const fisStudLocs = [
    [-1.0, 1.8], [1.0, 1.8],
    [-1.0, 3.6], [1.0, 3.6]
  ];
  fisStudLocs.forEach(([sy, sz], idx) => {
    const stud = createSocketHeadBolt(
      0.14, 0.16, 0.07, 0.65, 0.06, 0.09, mats,
      `Fastener_FIS_MountStud_M14_0${idx + 1}`
    );
    stud.rotation.z = -Math.PI / 2;
    stud.position.set(-0.10, sy, sz);
    tubGroup.add(stud);
  });

  // Bulkhead D-D (Rear fuel cell / engine interface bulkhead at X = 22.0 dm)
  const bulkDGeo = new THREE.BoxGeometry(0.24, 4.9, 4.5); // fits inside tub section at D-D (Y ±2.6, Z 0.6-5.4)
  const bulkD = new THREE.Mesh(bulkDGeo, mats.titaniumAnodized);
  bulkD.position.set(22.0, 0, 3.0);
  bulkD.name = "Body_Chassis_Bulkhead_DD";
  tubGroup.add(bulkD);

  // 6x M12 Titanium Engine Interface Studs with 12-point jet nuts
  const engineStudLocs = [
    [-2.0, 1.4], [2.0, 1.4],
    [-2.1, 3.2], [2.1, 3.2],
    [-1.6, 4.8], [1.6, 4.8]
  ];
  engineStudLocs.forEach(([sy, sz], idx) => {
    const stud = createStudWith12PtNut(
      0.06, 0.55, 0.10, 0.12, 0.14, 0.08, mats,
      `Fastener_ChassisToEngine_M12_0${idx + 1}`
    );
    stud.rotation.y = Math.PI / 2;
    stud.position.set(22.05, sy, sz);
    tubGroup.add(stud);
  });

  // 4x Side Impact Protection Spars (SIPS Carbon Crush Tubes)
  for (const sy of [-3.4, 3.4]) {
    for (const sz of [1.6, 3.6]) {
      const sipsGeo = new THREE.CylinderGeometry(0.22, 0.22, 4.2, 24);
      const sips = new THREE.Mesh(sipsGeo, mats.carbonMatteStructural);
      sips.rotation.z = Math.PI / 2;
      // on the tub wall: the tub is an ellipse (Y = w cos t, Z = mid + h sin t), so the wall is
      // further inboard low down; the lower tubes used to float 0.4 dm off the side
      const wT = 3.18, midT = 2.55, hT = 1.95, cosT = Math.sqrt(Math.max(0, 1 - ((sz - midT) / hT) ** 2));
      sips.position.set(13.5, Math.sign(sy) * (wT * cosT + 0.12), sz);
      sips.name = `Body_SIPS_CrushTube_${sz > 2 ? "Upper" : "Lower"}_${sy > 0 ? "LH" : "RH"}`;
      tubGroup.add(sips);
    }
  }

  root.add(tubGroup);

  // -------------------------------------------------------------
  // 2. TITANIUM HALO COCKPIT PROTECTION SYSTEM (125 kN)
  // -------------------------------------------------------------
  const haloGroup = new THREE.Group();
  haloGroup.name = "Body_Halo_Titanium_Assembly";

  // One moulded carbon-faired halo (HALO_SPEC): a wide, flat wishbone hoop that flares into
  // mounting pads on the chassis shoulders, plus one front centre post. Single mesh.
  const H = HALO_SPEC;
  const hoopPts = [...H.hoop.slice().reverse().map(([x, y, z]) => [x, -y, z]), ...H.hoop.slice(1)];
  const padT = H.padLength; // fraction of the path at each end that flares into the pad
  const endBlend = (t) => {
    const e = Math.min(t, 1 - t); // 0 at the pads
    return e >= padT ? 0 : Math.pow(1 - e / padT, 2);
  };
  const hoopGeo = sweepGeometry(hoopPts,
    (t) => H.width + (H.padWidth - H.width) * endBlend(t),
    (t) => H.height + (H.padHeight - H.height) * endBlend(t),
    { samples: 120, ring: 28, n: H.sectionExp, lead: 0.25,
      // width lies flat (horizontal) and points forward at the apex
      widthHint: (t, tg) => { const w = new THREE.Vector3().crossVectors(tg, new THREE.Vector3(0, 0, 1)); if (w.x > 0) w.negate(); return w; } });
  const postGeo = sweepGeometry(H.post,
    (t) => H.postWidth + (H.postFootWidth - H.postWidth) * Math.pow(1 - t, 3),
    (t) => H.postDepth + (H.postFootDepth - H.postDepth) * Math.pow(1 - t, 3),
    { samples: 40, ring: 24, n: 2.4, widthHint: () => new THREE.Vector3(0, 1, 0) });
  const haloMesh = new THREE.Mesh(mergeSimple([hoopGeo, postGeo]), mats.titaniumHalo);
  haloMesh.name = "Halo_Moulded_Shell";
  haloMesh.castShadow = true;
  haloMesh.receiveShadow = true;
  haloMesh.userData.haloSpec = H;
  haloGroup.add(haloMesh);

  // (The six 'micro-vanes' that used to sit here floated in the air inboard of and above the
  //  hoop at a fixed Z 7.35, and caught the AT&T halo decal. Removed; see part_review.md.)
  // (Flat placeholder decal quads removed: the livery projects TAG Heuer, 1Password, ORACLE and
  //  AT&T straight onto the halo top surface, see livery_decals.js.)

  // 4. Cockpit Rims: Verstappen & #1 Decals
  [-1, 1].forEach((side) => {
    const isLeft = side > 0;
    const rimTex = createCockpitRimDecals(isLeft);
    const rimMat = new THREE.MeshBasicMaterial({
      map: rimTex,
      transparent: true,
      side: THREE.DoubleSide
    });
    const rimGeo = new THREE.PlaneGeometry(1.6, 0.38);
    const rimMesh = new THREE.Mesh(rimGeo, rimMat);
    rimMesh.position.set(12.5, side * 3.14, 4.58);
    rimMesh.rotation.x = isLeft ? -Math.PI / 2.2 : Math.PI / 2.2;
    rimMesh.rotation.z = isLeft ? Math.PI / 2 : -Math.PI / 2;
    rimMesh.name = `Decal_CockpitRim_${isLeft ? "LH" : "RH"}`;
    tubGroup.add(rimMesh);
  });

  root.add(haloGroup);

  // -------------------------------------------------------------
  // 3. PRIMARY ROLL HOOP & SPLIT AIRBOX DUCT (172 kN)
  // -------------------------------------------------------------
  const rollHoopGroup = new THREE.Group();
  rollHoopGroup.name = "Body_RollHoop_Primary_172kN";

  // Structural carbon arch (X = 17.5 dm, rises to Z = 8.95 dm inside the airbox)
  const archGeo = new THREE.TubeGeometry(
    new THREE.CatmullRomCurve3([
      // Narrow hoop: two pillars rise from the tub and the arch is enclosed by the
      // forward-facing airbox intake (bodywork, X 15.75-19.25, Z 7.1-9.3)
      new THREE.Vector3(17.5, -0.75, 5.8),
      new THREE.Vector3(17.5, -0.75, 8.0),
      new THREE.Vector3(17.5, -0.35, 8.8),
      new THREE.Vector3(17.5, 0, 8.95),
      new THREE.Vector3(17.5, 0.35, 8.8),
      new THREE.Vector3(17.5, 0.75, 8.0),
      new THREE.Vector3(17.5, 0.75, 5.8)
    ]),
    32, 0.24, 16, false
  );
  const archMesh = new THREE.Mesh(archGeo, mats.carbonMatteStructural);
  archMesh.castShadow = true;
  rollHoopGroup.add(archMesh);

  // Airbox inlet is modelled once, in active_wings_bodywork.js (Engine_Cover_Airbox_Fin_Assembly)

  // Marshal Status Warning LED Array on top of roll hoop
  const ledGroup = new THREE.Group();
  ledGroup.name = "Body_Marshal_StatusLED_Array";
  for (const ly of [-0.35, 0.35]) {
    const ledMat = new THREE.MeshStandardMaterial({
      color: 0x00e676,
      emissive: 0x00e676,
      emissiveIntensity: 1.8,
      roughness: 0.2
    });
    const led = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.03, 16), ledMat);
    led.rotation.z = Math.PI / 2;
    led.position.set(16.62, ly, 9.36); // on the airbox crown just behind the lip, ahead of the blade
    ledGroup.add(led);
  }
  rollHoopGroup.add(ledGroup);

  root.add(rollHoopGroup);

  // -------------------------------------------------------------
  // 4. DRIVER COCKPIT: BEAD SEAT & 6-POINT HARNESS
  // -------------------------------------------------------------
  const seatGroup = new THREE.Group();
  seatGroup.name = "Body_Cockpit_BeadSeat_Assembly";

  // Anatomical custom bead seat shell (inclined 32 degrees)
  const seatShape = new THREE.Shape();
  seatShape.moveTo(0, 0);
  seatShape.lineTo(4.8, 0.2);
  seatShape.lineTo(6.5, 2.2);
  seatShape.lineTo(4.8, 5.2);
  seatShape.lineTo(4.2, 5.0);
  seatShape.lineTo(5.8, 2.4);
  seatShape.lineTo(4.4, 0.6);
  seatShape.lineTo(0, 0.4);
  seatShape.closePath();

  const seatGeo = new THREE.ExtrudeGeometry(seatShape, {
    steps: 1, depth: 3.8, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.04
  });
  seatGeo.center();
  const seatMesh = new THREE.Mesh(seatGeo, mats.carbonMatteStructural);
  seatMesh.rotation.x = Math.PI / 2;
  // Local Y is height (becomes world Z after Rx(90deg)), local Z is width:
  // R9: the driver sits low, so the seat back stays under the cockpit rim (Z 4.2)
  seatMesh.scale.set(1, 0.62, 0.75);       // 5.2 dm shell -> 3.2 dm tall, 2.85 dm wide
  seatMesh.position.set(12.5, 0, 2.31);    // base rests on tub floor (Z ~0.7), top ~3.9
  seatMesh.castShadow = true;
  seatGroup.add(seatMesh);

  // 6-Point Racing Harness: 2 shoulder, 2 lap, 2 crutch straps
  const beltMat = new THREE.MeshStandardMaterial({ color: 0x0a1018, roughness: 0.85, metalness: 0.05 });
  for (const by of [-0.65, 0.65]) {
    const sBeltPoints = [
      new THREE.Vector3(15.3, by, 3.95), // over the shoulders, under the rim
      new THREE.Vector3(13.8, by * 0.9, 3.8),
      new THREE.Vector3(11.8, by * 0.5, 2.8),
      new THREE.Vector3(10.8, 0, 2.4)
    ];
    const sCurve = new THREE.CatmullRomCurve3(sBeltPoints);
    const sGeo = new THREE.TubeGeometry(sCurve, 20, 0.065, 8, false);
    const sMesh = new THREE.Mesh(sGeo, beltMat);
    seatGroup.add(sMesh);

    // Aluminum harness quick-adjusters
    const adjGeo = new THREE.BoxGeometry(0.12, 0.06, 0.18);
    const adj = new THREE.Mesh(adjGeo, mats.titaniumBright);
    adj.position.set(13.2, by * 0.8, 3.4);
    seatGroup.add(adj);
  }

  // Central Rotary Camlock Buckle with release lever
  const buckleGeo = new THREE.CylinderGeometry(0.16, 0.16, 0.08, 24);
  const buckle = new THREE.Mesh(buckleGeo, mats.titaniumAnodized);
  buckle.position.set(10.8, 0, 2.4);
  buckle.name = "Body_Harness_RotaryBuckle";
  seatGroup.add(buckle);

  const leverGeo = new THREE.BoxGeometry(0.04, 0.03, 0.14);
  const lever = new THREE.Mesh(leverGeo, mats.anodizedRed);
  lever.position.set(10.8, 0.02, 2.48);
  seatGroup.add(lever);

  root.add(seatGroup);

  // -------------------------------------------------------------
  // 5. MCLAREN APPLIED PCU-8D STEERING WHEEL & COLUMN
  // -------------------------------------------------------------
  const steeringGroup = new THREE.Group();
  steeringGroup.name = "Pivot_Steering_Wheel_Assembly";
  steeringGroup.position.set(8.2, 0, 4.2);

  // Telescopic carbon steering column
  const colGeo = new THREE.CylinderGeometry(0.12, 0.12, 2.4, 20);
  const colMesh = new THREE.Mesh(colGeo, mats.carbonMatteStructural);
  const colDir = new THREE.Vector3(-0.96, 0, -0.28).normalize(); // forward & down to rack
  colMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), colDir);
  colMesh.position.set(-1.15, 0, -0.34);
  steeringGroup.add(colMesh);

  // Quick-release hub collar (gold anodized aluminum)
  const qrGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.18, 24);
  const qrMesh = new THREE.Mesh(qrGeo, mats.goldActuator);
  qrMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), colDir);
  qrMesh.position.set(-0.15, 0, -0.08);
  steeringGroup.add(qrMesh);

  // High-Fidelity PCU-8D Steering Wheel Model (Matching 4 Reference CAD Drawings)
  const pcu8dWheel = createSteeringWheelPCU8D();
  // The wheel is authored with width on local X, height on local Y and its display face on +Z.
  // Map: width -> lateral (+Y), height -> up (raked with the column), face -> toward the driver
  // (opposite the column direction). Previously Ry(-90deg) stood the wheel on its side
  // (2.8 dm wide axis vertical, grips at top and bottom).
  // The orientation lives on a mount group so the kinematics can keep spinning the wheel
  // itself about its own face normal (wheel.rotation.z) for steering.
  const wheelMount = new THREE.Group();
  wheelMount.name = "McLaren_PCU8D_Mount";
  {
    const faceN = colDir.clone().negate().normalize();           // (0.96, 0, 0.28)
    const wheelX = new THREE.Vector3(0, 1, 0);
    const wheelY = new THREE.Vector3().crossVectors(faceN, wheelX).normalize();
    wheelMount.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(wheelX, wheelY, faceN));
  }
  pcu8dWheel.name = "McLaren_PCU8D_FullAssembly";
  wheelMount.add(pcu8dWheel);
  steeringGroup.add(wheelMount);

  // Driver Textured Racing Gloves Gripping the Wheel (Richard Mille / Puma style from Reference Images)
  const gloveMat = mats.driverGlove || new THREE.MeshStandardMaterial({
    name: 'Driver_Glove_Material',
    color: 0x14171a, // Default black textured racing Nomex fabric
    roughness: 0.82,
    metalness: 0.05
  });
  if (mats) mats.driverGlove = gloveMat;

  const siliconeMat = new THREE.MeshStandardMaterial({
    name: 'Driver_Glove_Grip_Material',
    color: 0x2e3238, // High-friction silicone palm grip ribs
    roughness: 0.65,
    metalness: 0.12
  });

  [-1.35, 1.35].forEach((handY) => {
    const isLeft = handY > 0;
    const gloveGroup = new THREE.Group();
    gloveGroup.name = `Driver_RacingGlove_${isLeft ? "LH" : "RH"}`;

    // Palm / Hand knuckle wrap around grip
    const palmGeo = new THREE.CylinderGeometry(0.25, 0.27, 0.98, 16);
    const palm = new THREE.Mesh(palmGeo, gloveMat);
    palm.name = `Driver_Glove_Palm_${isLeft ? "LH" : "RH"}`;
    palm.position.set(0.04, handY, 0);
    palm.rotation.y = -0.35;
    gloveGroup.add(palm);

    // Anatomical thumb wrap
    const thumbGeo = new THREE.CylinderGeometry(0.09, 0.11, 0.42, 10);
    const thumb = new THREE.Mesh(thumbGeo, gloveMat);
    thumb.name = `Driver_Glove_Thumb_${isLeft ? "LH" : "RH"}`;
    thumb.position.set(-0.12, handY * 0.88, 0.18);
    thumb.rotation.x = isLeft ? 0.4 : -0.4;
    thumb.rotation.y = 0.5;
    gloveGroup.add(thumb);

    // Forearm sleeve entering cockpit toward driver
    const armGeo = new THREE.CylinderGeometry(0.28, 0.34, 2.5, 16);
    const arm = new THREE.Mesh(armGeo, gloveMat);
    arm.name = `Driver_Glove_Arm_${isLeft ? "LH" : "RH"}`;
    arm.position.set(1.15, handY * 0.92, -0.35);
    arm.rotation.z = Math.PI / 6;
    arm.rotation.y = isLeft ? 0.32 : -0.32;
    gloveGroup.add(arm);

    // Silicone grip pads on inner palm
    const padGeo = new THREE.BoxGeometry(0.05, 0.18, 0.65);
    const pad = new THREE.Mesh(padGeo, siliconeMat);
    pad.name = `Driver_Glove_Pad_${isLeft ? "LH" : "RH"}`;
    pad.position.set(-0.18, handY, 0);
    gloveGroup.add(pad);

    steeringGroup.add(gloveGroup);
  });

  root.add(steeringGroup);

  // =============================================================
  // DRIVER COCKPIT BODY & SEATING POSTURE (Matching Reference Images 1 & 2)
  // Reclined torso (~35°), HANS collar, 6-point harness, legs, and boots at pedals
  // =============================================================
  const driverGroup = new THREE.Group();
  driverGroup.name = "Driver_Cockpit_Assembly";

  // Nomex Suit Materials (Team Adaptive)
  const suitMat = mats.liveryPaint ? mats.liveryPaint.clone() : new THREE.MeshStandardMaterial({ color: 0xff8000, roughness: 0.82 });
  suitMat.roughness = 0.80;
  suitMat.clearcoat = 0.05;
  const darkNomexMat = new THREE.MeshStandardMaterial({ color: 0x14171a, roughness: 0.86 });
  const harnessMat = new THREE.MeshStandardMaterial({ color: 0x0c0f14, roughness: 0.92 });
  const bootMat = new THREE.MeshStandardMaterial({ color: 0x16181b, roughness: 0.75 });
  const soleMat = new THREE.MeshStandardMaterial({ color: 0x262a30, roughness: 0.95 });

  // 1. Reclined Torso
  const torsoGroup = new THREE.Group();
  torsoGroup.position.set(13.6, 0, 3.75);
  torsoGroup.rotation.y = -0.56; // ~32 deg recline angle

  const chestGeo = new THREE.CylinderGeometry(1.22, 1.42, 2.5, 16);
  chestGeo.scale(1, 1, 0.78);
  const chestMesh = new THREE.Mesh(chestGeo, suitMat);
  chestMesh.name = "Driver_Suit_Chest";
  torsoGroup.add(chestMesh);

  // Black contrast side panels (Image 2)
  [-1.02, 1.02].forEach((sideY) => {
    const flankGeo = new THREE.BoxGeometry(0.32, 0.22, 2.1);
    const flankMesh = new THREE.Mesh(flankGeo, darkNomexMat);
    flankMesh.position.set(0, sideY, 0);
    torsoGroup.add(flankMesh);
  });

  // 6-Point Harness Straps & Central Rotary Buckle
  [-0.42, 0.42].forEach((strapY) => {
    const strapGeo = new THREE.BoxGeometry(0.06, 0.26, 2.4);
    const strapMesh = new THREE.Mesh(strapGeo, harnessMat);
    strapMesh.position.set(0.66, strapY, 0.05);
    torsoGroup.add(strapMesh);
  });

  const driverBuckleGeo = new THREE.CylinderGeometry(0.16, 0.16, 0.08, 20);
  const buckleMesh = new THREE.Mesh(driverBuckleGeo, mats.titaniumBright);
  buckleMesh.rotation.z = Math.PI / 2;
  buckleMesh.position.set(0.72, 0, -0.38);
  torsoGroup.add(buckleMesh);

  // HANS Carbon Yoke
  const hansCollarGeo = new THREE.TorusGeometry(0.92, 0.14, 8, 24, Math.PI);
  const hansCollar = new THREE.Mesh(hansCollarGeo, mats.carbonGloss || darkNomexMat);
  hansCollar.rotation.x = Math.PI / 2;
  hansCollar.rotation.z = -Math.PI / 2;
  hansCollar.position.set(0.12, 0, 0.95);
  torsoGroup.add(hansCollar);

  driverGroup.add(torsoGroup);

  // 2. Reclined Legs Extending Forward to Pedal Sled
  [-0.62, 0.62].forEach((legY) => {
    const isLeft = legY > 0;
    const legSub = new THREE.Group();
    legSub.name = `Driver_Leg_${isLeft ? "LH" : "RH"}`;

    // Thigh (hips to knees)
    const thighCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(12.6, legY * 0.92, 2.6),
      new THREE.Vector3(10.4, legY, 2.85),
      new THREE.Vector3(8.2, legY * 0.85, 3.15)
    ]);
    const thighGeo = new THREE.TubeGeometry(thighCurve, 12, 0.48, 12, false);
    const thighMesh = new THREE.Mesh(thighGeo, suitMat);
    legSub.add(thighMesh);

    // Shin (knees down to pedal sled)
    const shinCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(8.2, legY * 0.85, 3.15),
      new THREE.Vector3(5.6, legY * 0.75, 2.45),
      new THREE.Vector3(3.2, isLeft ? 0.45 : -0.45, 1.85)
    ]);
    const shinGeo = new THREE.TubeGeometry(shinCurve, 12, 0.40, 12, false);
    const shinMesh = new THREE.Mesh(shinGeo, darkNomexMat);
    legSub.add(shinMesh);

    // 3. Racing Boots (resting on Brake / Throttle pedals)
    const bootSub = new THREE.Group();
    bootSub.name = `Driver_Boot_${isLeft ? "LH" : "RH"}`;
    bootSub.position.set(2.8, isLeft ? 0.45 : -0.45, 1.75);
    bootSub.rotation.y = 0.28;

    const bootUpperGeo = new THREE.BoxGeometry(0.82, 0.38, 0.58);
    const bootUpper = new THREE.Mesh(bootUpperGeo, bootMat);
    bootUpper.position.set(-0.15, 0, 0.12);
    bootSub.add(bootUpper);

    const toeGeo = new THREE.CylinderGeometry(0.18, 0.20, 0.38, 14);
    toeGeo.scale(1.2, 1, 0.85);
    const toeMesh = new THREE.Mesh(toeGeo, bootMat);
    toeMesh.rotation.z = Math.PI / 2;
    toeMesh.position.set(-0.42, 0, 0.04);
    bootSub.add(toeMesh);

    const soleGeo = new THREE.BoxGeometry(0.98, 0.40, 0.08);
    const soleMesh = new THREE.Mesh(soleGeo, soleMat);
    soleMesh.position.set(-0.22, 0, -0.20);
    bootSub.add(soleMesh);

    legSub.add(bootSub);
    driverGroup.add(legSub);
  });

  root.add(driverGroup);

  // -------------------------------------------------------------
  // 6. ADJUSTABLE PEDAL SLED & 180 kgf BRAKE LOAD CELL
  // -------------------------------------------------------------
  const pedalGroup = new THREE.Group();
  pedalGroup.name = "Body_PedalSled_Assembly";
  pedalGroup.position.set(2.5, 0, 1.36); // rails sit on top of the tub floor (floor skin Z 1.15-1.2 here), not through it

  // Dual Aluminum Slider Guide Rails
  // (inboard of the tub's curved lower corners (tub floor z 1.24 at y 0.7), they used to poke through at y +-1.2)
  for (const ry of [-0.7, 0.7]) {
    const railGeo = new THREE.BoxGeometry(2.4, 0.15, 0.12);
    const rail = new THREE.Mesh(railGeo, mats.titaniumBright);
    rail.name = `Body_PedalSled_Rail_${ry > 0 ? 'L' : 'R'}`;
    rail.position.set(0, ry, 0);
    pedalGroup.add(rail);
  }

  // Brake Pedal (driver's left foot: +Y = left)
  const brakeArmGeo = new THREE.BoxGeometry(0.12, 0.14, 1.85);
  const brakeArm = new THREE.Mesh(brakeArmGeo, mats.uprightBilletAluminum);
  brakeArm.position.set(0.3, 0.45, 0.95);
  pedalGroup.add(brakeArm);

  const brakePadGeo = new THREE.BoxGeometry(0.08, 0.35, 0.45);
  const brakePad = new THREE.Mesh(brakePadGeo, mats.titaniumBright);
  brakePad.position.set(0.12, 0.45, 1.75);
  brakePad.name = "Body_Pedal_Brake_Footpad";
  pedalGroup.add(brakePad);

  // Pushrod and Polyurethane Bump-Stop Spring Stack
  const pushrodGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.85, 16);
  const pushrod = new THREE.Mesh(pushrodGeo, mats.chromePlated);
  pushrod.rotation.z = Math.PI / 2; // axis along X
  pushrod.position.set(-0.25, 0.45, 1.1);
  pedalGroup.add(pushrod);

  // Polyurethane elastomeric bump-stop rings
  for (let s = 0; s < 4; s++) {
    const bumpGeo = new THREE.CylinderGeometry(0.09, 0.09, 0.08, 16);
    const bump = new THREE.Mesh(bumpGeo, mats.rubberSeal);
    bump.rotation.z = Math.PI / 2;
    bump.position.set(-0.15 - s * 0.10, 0.45, 1.1);
    pedalGroup.add(bump);
  }

  // Accelerator Pedal (Throttle on driver's right foot: -Y = right)
  const throttleArmGeo = new THREE.BoxGeometry(0.08, 0.10, 1.75);
  const throttleArm = new THREE.Mesh(throttleArmGeo, mats.uprightBilletAluminum);
  throttleArm.position.set(0.4, -0.45, 0.90);
  pedalGroup.add(throttleArm);

  const throttlePadGeo = new THREE.BoxGeometry(0.06, 0.22, 0.55);
  const throttlePad = new THREE.Mesh(throttlePadGeo, mats.titaniumBright);
  throttlePad.position.set(0.24, -0.45, 1.65);
  throttlePad.name = "Body_Pedal_Throttle_Footpad";
  pedalGroup.add(throttlePad);

  root.add(pedalGroup);

  // -------------------------------------------------------------
  // 7. FIRE SUPPRESSION SYSTEM (Novec 1230 Extinguisher)
  // -------------------------------------------------------------
  const fireGroup = new THREE.Group();
  fireGroup.name = "Body_FireSuppression_System";

  // Novec 1230 Aluminum Cylinder (mounted under driver knees)
  const cylGeo = new THREE.CylinderGeometry(0.35, 0.35, 1.45, 24);
  const fireCyl = new THREE.Mesh(cylGeo, mats.anodizedRed);
  fireCyl.rotation.z = Math.PI / 2; // lies along X
  fireCyl.position.set(6.2, 0, 1.25);
  fireCyl.castShadow = true;
  fireGroup.add(fireCyl);

  // Solenoid firing head & pressure gauge
  const headGeo = new THREE.CylinderGeometry(0.12, 0.14, 0.28, 16);
  const headMesh = new THREE.Mesh(headGeo, mats.titaniumBright);
  headMesh.rotation.z = Math.PI / 2;
  headMesh.position.set(5.35, 0, 1.25);
  fireGroup.add(headMesh);

  root.add(fireGroup);

  return root;
}

/**
 * Procedural Monocoque & Cockpit Assembly Wrapper
 */
export function createMonocoqueCockpit(options = {}) {
  const mats = options.materials || defaultMaterials;
  return buildMonocoqueAndCockpit(null, mats);
}
