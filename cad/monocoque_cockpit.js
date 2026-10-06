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
import {
  createCarbonBeadSeatShell,
  createArticulatedDriver,
  updateDriverKinematics,
} from "./driver_model.js";

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
  // Tapered aerodynamic monocoque with genuine hollow cockpit cavity
  // -------------------------------------------------------------
  const tubGroup = new THREE.Group();
  tubGroup.name = "Body_Monocoque_CarbonTub";

  const tubVerts = [];
  const tubUvs = [];
  const tubIdxs = [];

  function appendLoft(stations, isClosed, nSeg) {
    const startV = tubVerts.length / 3;

    for (let i = 0; i < stations.length; i++) {
      const st = stations[i];
      const u = i / (stations.length - 1);

      for (let j = 0; j <= nSeg; j++) {
        const v = j / nSeg;
        let py, pz;

        if (isClosed) {
          const theta = v * Math.PI * 2;
          py = Math.cos(theta) * st.w;
          pz = (st.zb + st.zt) / 2 + Math.sin(theta) * ((st.zt - st.zb) / 2);
        } else {
          // Open U-channel from +Y (Left Rim) to -Y (Right Rim) across the bottom
          const param = 1 - 2 * v;
          py = param * st.wRim;
          const wallFactor = Math.pow(Math.abs(param), 2.2);
          pz = st.zb + (st.zRim - st.zb) * wallFactor;
        }

        tubVerts.push(st.x, py, pz);
        tubUvs.push(u, v);
      }
    }

    for (let i = 0; i < stations.length - 1; i++) {
      for (let j = 0; j < nSeg; j++) {
        const a = startV + i * (nSeg + 1) + j;
        const b = startV + (i + 1) * (nSeg + 1) + j;
        const c = startV + (i + 1) * (nSeg + 1) + (j + 1);
        const d = startV + i * (nSeg + 1) + (j + 1);
        tubIdxs.push(a, b, d);
        tubIdxs.push(b, c, d);
      }
    }
  }

  // 1A. Forward closed chassis (X = 0.0 to 7.6 dm: Bulkhead A-A to Scuttle)
  appendLoft([
    { x: 0.0,  w: 1.60, zb: 1.20, zt: 4.20 },
    { x: 2.0,  w: 1.72, zb: 1.18, zt: 4.30 },
    { x: 3.5,  w: 1.85, zb: 1.15, zt: 4.40 },
    { x: 5.5,  w: 2.05, zb: 0.85, zt: 4.75 },
    { x: 7.6,  w: 2.38, zb: 0.60, zt: 5.15 }
  ], true, 24);

  // 1B. Cockpit open U-channel (X = 7.6 to 16.6 dm: Open top for full driver visibility)
  const cockpitStations = [
    { x: 7.6,  w: 2.38, zb: 0.60, zRim: 5.12, wRim: 2.35 },
    { x: 9.2,  w: 2.80, zb: 0.60, zRim: 4.72, wRim: 2.65 },
    { x: 11.2, w: 3.12, zb: 0.60, zRim: 4.48, wRim: 2.88 },
    { x: 13.5, w: 3.20, zb: 0.60, zRim: 4.56, wRim: 2.92 },
    { x: 15.2, w: 3.15, zb: 0.60, zRim: 4.78, wRim: 2.82 },
    { x: 16.6, w: 3.02, zb: 0.60, zRim: 5.32, wRim: 2.52 }
  ];
  appendLoft(cockpitStations, false, 16);

  // 1C. Rear closed chassis (X = 16.6 to 22.0 dm: Fuel Cell to Bulkhead D-D)
  appendLoft([
    { x: 16.6, w: 3.02, zb: 0.60, zt: 5.58 },
    { x: 18.5, w: 2.90, zb: 0.60, zt: 5.75 },
    { x: 20.2, w: 2.75, zb: 0.60, zt: 5.60 },
    { x: 22.0, w: 2.60, zb: 0.60, zt: 5.40 }
  ], true, 24);

  const tubGeo = new THREE.BufferGeometry();
  tubGeo.setAttribute('position', new THREE.Float32BufferAttribute(tubVerts, 3));
  tubGeo.setAttribute('uv', new THREE.Float32BufferAttribute(tubUvs, 2));
  tubGeo.setIndex(tubIdxs);
  tubGeo.computeVertexNormals();

  const tubMesh = new THREE.Mesh(tubGeo, mats.carbonSatinChassis || mats.carbonGloss);
  tubMesh.castShadow = true;
  tubMesh.receiveShadow = true;
  tubMesh.name = "Body_Monocoque_CarbonTub_Skin";
  tubGroup.add(tubMesh);

  // 1D. Smooth rounded Cockpit Coaming Rim Lip along Left and Right edges
  [-1, 1].forEach((side) => {
    const isLeft = side > 0;
    const rimPoints = [];
    for (let i = 0; i < cockpitStations.length; i++) {
      const st = cockpitStations[i];
      rimPoints.push(new THREE.Vector3(st.x, side * st.wRim, st.zRim));
    }
    const rimCurve = new THREE.CatmullRomCurve3(rimPoints);
    const rimTubeGeo = new THREE.TubeGeometry(rimCurve, 28, 0.12, 10, false);
    const rimLipMesh = new THREE.Mesh(rimTubeGeo, mats.carbonSatinChassis || mats.carbonGloss);
    rimLipMesh.name = `Body_Cockpit_CoamingRim_${isLeft ? "LH" : "RH"}`;
    rimLipMesh.castShadow = true;
    tubGroup.add(rimLipMesh);
  });

  // 1E. Hollow Interior Cockpit Tub Cavity (Deep carbon floor and side walls)
  const interiorGroup = new THREE.Group();
  interiorGroup.name = "Body_Cockpit_Interior_Cavity";

  // Interior carbon floor running from footwell to rear bulkhead
  const floorPts = [
    new THREE.Vector3(2.2, 0, 1.20),
    new THREE.Vector3(6.5, 0, 1.20),
    new THREE.Vector3(7.8, 0, 0.68),
    new THREE.Vector3(12.0, 0, 0.68),
    new THREE.Vector3(16.6, 0, 0.68)
  ];
  const floorCurve = new THREE.CatmullRomCurve3(floorPts);
  const floorGeo = new THREE.TubeGeometry(floorCurve, 24, 1.65, 8, false);
  const floorMesh = new THREE.Mesh(floorGeo, mats.carbonMatteStructural);
  floorMesh.scale.set(1, 1, 0.08); // flat floor plate
  floorMesh.name = "Body_Cockpit_Interior_Floor";
  interiorGroup.add(floorMesh);

  // Front Scuttle Bulkhead Wall & Footwell Opening Arch
  const frontBulkheadGeo = new THREE.BoxGeometry(0.18, 4.4, 4.2);
  const frontBulkhead = new THREE.Mesh(frontBulkheadGeo, mats.carbonMatteStructural);
  frontBulkhead.position.set(7.6, 0, 2.9);
  frontBulkhead.name = "Body_Cockpit_FrontScuttleBulkhead";
  interiorGroup.add(frontBulkhead);

  // Rear Cockpit Bulkhead Wall (behind headrest and seat)
  const rearBulkheadGeo = new THREE.BoxGeometry(0.22, 4.8, 4.6);
  const rearBulkhead = new THREE.Mesh(rearBulkheadGeo, mats.carbonMatteStructural);
  rearBulkhead.position.set(16.6, 0, 3.2);
  rearBulkhead.name = "Body_Cockpit_RearBulkhead";
  interiorGroup.add(rearBulkhead);

  tubGroup.add(interiorGroup);

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
  // 4. HIGH-BACK MOLDED CARBON BEAD SEAT SHELL (media_1791233403328.webp)
  // -------------------------------------------------------------
  const seatGroup = createCarbonBeadSeatShell(mats);
  root.add(seatGroup);

  // -------------------------------------------------------------
  // 5. MCLAREN APPLIED PCU-8D STEERING WHEEL & COLUMN
  // -------------------------------------------------------------
  const steeringGroup = new THREE.Group();
  steeringGroup.name = "Pivot_Steering_Wheel_Assembly";
  steeringGroup.position.set(9.0, 0, 4.2); // D1: elbows bent about 110 deg with the hands at 9 and 3

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

  root.add(steeringGroup);

  // -------------------------------------------------------------
  // 5B. MASTER ARTICULATED DRIVER RIG (Matching 5 Master References)
  // Complete human driver with organic anatomy, Richard Mille gloves,
  // FIA 8856-2018 waffle boots, 6-point harness, and dynamic 60fps IK rig.
  // -------------------------------------------------------------
  // Gloves are attached to the wheel (they turn with it); the arms follow by IK each frame.
  const driverGroup = createArticulatedDriver({ materials: mats, steeringWheel: pcu8dWheel });
  root.add(driverGroup);
  root.userData.driverModel = driverGroup;
  root.userData.updateDriver = (state, pedalAssembly) => {
    updateDriverKinematics(driverGroup, state, pcu8dWheel, pedalAssembly);
  };

  // -------------------------------------------------------------
  // 6. ADJUSTABLE PEDAL SLED & 180 kgf BRAKE LOAD CELL
  // -------------------------------------------------------------
  const pedalGroup = new THREE.Group();
  pedalGroup.name = "Body_PedalSled_Assembly";
  pedalGroup.position.set(2.0, 0, 1.36); // knees bent about 130 deg with the knees up (D1 / D2) // rails sit on top of the tub floor (floor skin Z 1.15-1.2 here), not through it

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

  // first pose: hands on the grips, feet on the pedal pads
  root.updateMatrixWorld(true);
  updateDriverKinematics(driverGroup, {}, pcu8dWheel, pedalGroup);

  return root;
}

/**
 * Procedural Monocoque & Cockpit Assembly Wrapper
 */
export function createMonocoqueCockpit(options = {}) {
  const mats = options.materials || defaultMaterials;
  return buildMonocoqueAndCockpit(null, mats);
}
