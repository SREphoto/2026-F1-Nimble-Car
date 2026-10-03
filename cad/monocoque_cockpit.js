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

  // Center forward mounting pylon
  const pylonPoints = [
    new THREE.Vector3(7.2, 0, 4.6),
    new THREE.Vector3(7.6, 0, 5.5),
    new THREE.Vector3(8.5, 0, 6.8),
    new THREE.Vector3(9.2, 0, 7.2)
  ];
  const pylonCurve = new THREE.CatmullRomCurve3(pylonPoints);
  const pylonGeo = new THREE.TubeGeometry(pylonCurve, 32, 0.15, 20, false);
  const forwardPylon = new THREE.Mesh(pylonGeo, mats.titaniumHalo);
  forwardPylon.castShadow = true;
  haloGroup.add(forwardPylon);

  // Halo hoop arch wrapping around driver helmet
  const hoopPoints = [
    new THREE.Vector3(9.2, 0, 7.2),
    new THREE.Vector3(10.2, 1.8, 7.2),
    new THREE.Vector3(12.5, 2.5, 7.0),
    new THREE.Vector3(15.2, 2.2, 6.4),
    new THREE.Vector3(16.5, 2.0, 5.8)
  ];
  const hoopCurveLH = new THREE.CatmullRomCurve3(hoopPoints);
  const hoopGeoLH = new THREE.TubeGeometry(hoopCurveLH, 48, 0.15, 20, false); // slimmer halo tube
  const hoopLH = new THREE.Mesh(hoopGeoLH, mats.titaniumHalo);
  hoopLH.castShadow = true;
  haloGroup.add(hoopLH);

  const hoopPointsRH = hoopPoints.map(p => new THREE.Vector3(p.x, -p.y, p.z));
  const hoopCurveRH = new THREE.CatmullRomCurve3(hoopPointsRH);
  const hoopGeoRH = new THREE.TubeGeometry(hoopCurveRH, 48, 0.15, 20, false);
  const hoopRH = new THREE.Mesh(hoopGeoRH, mats.titaniumHalo);
  hoopRH.castShadow = true;
  haloGroup.add(hoopRH);

  // (The six 'micro-vanes' that used to sit here floated in the air inboard of and above the
  //  hoop at a fixed Z 7.35, and caught the AT&T halo decal. Removed; see part_review.md.)

  // Halo Rear Mount Brackets & M14 High-Strength Fasteners
  for (const hy of [-2.0, 2.0]) {
    const bktGeo = new THREE.BoxGeometry(0.45, 0.35, 0.40);
    const bkt = new THREE.Mesh(bktGeo, mats.titaniumAnodized);
    bkt.position.set(16.5, hy, 5.8);
    haloGroup.add(bkt);

    const bolt = createSocketHeadBolt(
      0.14, 0.14, 0.07, 0.45, 0.06, 0.08, mats,
      `Fastener_HaloMount_M14_${hy > 0 ? "LH" : "RH"}`
    );
    bolt.rotation.y = hy > 0 ? Math.PI / 2 : -Math.PI / 2;
    bolt.position.set(16.5, hy + (hy > 0 ? 0.18 : -0.18), 5.8);
    haloGroup.add(bolt);
  }

  // -------------------------------------------------------------
  // 2B. HALO SPONSOR DECALS & COCKPIT RIM GRAPHICS
  // Matching Onboard Cockpit View (media_1790507836542.webp)
  // -------------------------------------------------------------
  // 1. Center Apex Decal: TAG Heuer Crest & 1Password
  const haloApexTex = createHaloApexDecalTexture();
  const haloApexMat = new THREE.MeshBasicMaterial({
    map: haloApexTex,
    transparent: true,
    side: THREE.DoubleSide
  });
  const haloApexGeo = new THREE.PlaneGeometry(1.2, 0.6);
  const haloApexMesh = new THREE.Mesh(haloApexGeo, haloApexMat);
  haloApexMesh.position.set(9.22, 0, 7.37);
  haloApexMesh.rotation.set(0, 0, Math.PI / 2); // lie flat on top of halo (normal +Z)
  haloApexMesh.name = "Decal_Halo_Apex_TAGHeuer";
  haloGroup.add(haloApexMesh);

  // 2. Driver Left Arm: AT&T Globe Logo & Text
  const haloAttTex = createHaloArmDecalTexture(true);
  const haloAttMat = new THREE.MeshBasicMaterial({
    map: haloAttTex,
    transparent: true,
    side: THREE.DoubleSide
  });
  const haloAttGeo = new THREE.PlaneGeometry(1.4, 0.35);
  const haloAttMesh = new THREE.Mesh(haloAttGeo, haloAttMat);
  haloAttMesh.position.set(10.6, 1.45, 7.37);
  haloAttMesh.rotation.set(0, 0, Math.PI / 2 - 0.32);
  haloAttMesh.name = "Decal_Halo_Left_ATT";
  haloGroup.add(haloAttMesh);

  // 3. Driver Right Arm: ORACLE White Text
  const haloOracleTex = createHaloArmDecalTexture(false);
  const haloOracleMat = new THREE.MeshBasicMaterial({
    map: haloOracleTex,
    transparent: true,
    side: THREE.DoubleSide
  });
  const haloOracleGeo = new THREE.PlaneGeometry(1.4, 0.35);
  const haloOracleMesh = new THREE.Mesh(haloOracleGeo, haloOracleMat);
  haloOracleMesh.position.set(10.6, -1.45, 7.37);
  haloOracleMesh.rotation.set(0, 0, Math.PI / 2 + 0.32);
  haloOracleMesh.name = "Decal_Halo_Right_ORACLE";
  haloGroup.add(haloOracleMesh);

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
    led.position.set(16.2, ly, 9.3); // on the airbox crown, ahead of the T-camera
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
  seatMesh.scale.set(1, 0.75, 0.75);       // 5.2 dm shell -> 3.9 dm tall, 2.85 dm wide
  seatMesh.position.set(12.5, 0, 2.65);    // base rests on tub floor (Z 0.6), top ~4.6
  seatMesh.castShadow = true;
  seatGroup.add(seatMesh);

  // 6-Point Racing Harness: 2 shoulder, 2 lap, 2 crutch straps
  const beltMat = new THREE.MeshStandardMaterial({ color: 0x0a1018, roughness: 0.85, metalness: 0.05 });
  for (const by of [-0.65, 0.65]) {
    const sBeltPoints = [
      new THREE.Vector3(15.5, by, 4.8),
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

  // Driver Blue Racing Gloves Gripping the Wheel (media_1790507836542.webp)
  const gloveMat = new THREE.MeshStandardMaterial({
    color: 0x163866, // Dark racing blue Nomex fabric
    roughness: 0.85,
    metalness: 0.08
  });
  [-1.35, 1.35].forEach((handY) => {
    const isLeft = handY > 0;
    const gloveGroup = new THREE.Group();
    gloveGroup.name = `Driver_RacingGlove_${isLeft ? "LH" : "RH"}`;

    // Palm / Hand knuckle wrap around grip
    const palmGeo = new THREE.CylinderGeometry(0.24, 0.26, 0.95, 16);
    const palm = new THREE.Mesh(palmGeo, gloveMat);
    palm.position.set(0.04, handY, 0);
    palm.rotation.y = -0.35;
    gloveGroup.add(palm);

    // Forearm sleeve entering cockpit
    const armGeo = new THREE.CylinderGeometry(0.28, 0.32, 2.4, 16);
    const arm = new THREE.Mesh(armGeo, gloveMat);
    arm.position.set(1.1, handY * 0.9, -0.35);
    arm.rotation.z = Math.PI / 6;
    arm.rotation.y = isLeft ? 0.3 : -0.3;
    gloveGroup.add(arm);

    // White Nomex grip pads on inner palm
    const padGeo = new THREE.BoxGeometry(0.05, 0.18, 0.65);
    const padMat = new THREE.MeshStandardMaterial({ color: 0xe0e6ed, roughness: 0.9 });
    const pad = new THREE.Mesh(padGeo, padMat);
    pad.position.set(-0.18, handY, 0);
    gloveGroup.add(pad);

    steeringGroup.add(gloveGroup);
  });

  root.add(steeringGroup);

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
