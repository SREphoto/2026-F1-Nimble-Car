/**
 * 2026 Formula 1 "Nimble Car" Transmission & Drivetrain
 * SREdesigns - Samuel R Erwin III
 * 
 * 3D CAD for 8-Speed Seamless Gearbox, Differential, & Drivetrain:
 * - Structural Hybrid Titanium/Carbon Gearbox Casing:
 *   * Main casing housing the 8-speed cassette, selector barrel, and differential
 *   * Rear suspension pickup ears and bellhousing mating flange
 * - 8-Speed Seamless-Shift Gear Cluster:
 *   * Input primary shaft and output secondary pinion shaft
 *   * 8 forward gear pairs with genuine 3D engagement dog teeth
 *   * Reverse idler gear and selector slider
 * - Selector Barrel (Shift Drum) & Shift Forks:
 *   * Cylindrical barrel with 4 helical CNC shift tracks
 *   * 4x bronze shift forks riding in barrel tracks and engaging sliding dog clutch sleeves
 * - Multi-Plate Carbon-Carbon Clutch Pack (Article C9):
 *   * Pull-type clutch with alternating carbon friction plates and steel drive plates
 *   * Belleville conical diaphragm spring and hydraulic slave cylinder release bearing
 * - Active Electro-Hydraulic Limited Slip Differential (LSD):
 *   * Differential ramp carrier with precision 45° drive / 60° coast ramp slots
 *   * 4x bevel spider gears, central cross pins, and 2x side sun gears
 *   * Multi-disc friction clutch packs controlling dynamic locking torque
 * - Driveshafts & Plunging Tripod CV Joints:
 *   * Inboard plunging tripod joints with 3 spherical needle-bearing rollers
 *   * Pleated flexible rubber/silicone bellows boots
 *   * Hollow gun-drilled high-strength steel driveshafts extending to rear uprights
 * - Rear Impact Structure (RIS) & FIA Rain Light (Matching Reference Images):
 *   * 50 kJ carbon composite energy-absorbing crash cone mounted to gearbox rear
 *   * Yellow-bezel circular 15-LED high-intensity 4Hz red safety rain light
 * 
 * Universal Datum:
 * - Gearbox located behind engine: X = 27.5 dm to 34.0 dm, Z = [1.2, 4.0] dm
 * - Rear Axle Centerline at X = 34.0 dm, Z = 2.4 dm
 */

import * as THREE from 'three';
import { materials } from '../materials.js';
import { createSocketHeadBolt, createStudWith12PtNut, createBellevilleSpring } from './fasteners.js';
import { loftRings } from './sweep_section.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

/** Rear impact structure and rain light (car frame, dm), ref round3 R10. */
export const RIS_SPEC = {
  x0: 35.0, x1: 38.45,                      // gearbox face to tip
  root: { top: 3.35, bottom: 2.0, hw: 0.6 }, // flat top carries the twin pylon feet
  tip: { top: 2.92, bottom: 2.4, hw: 0.3 },
  flatTo: 0.42,                              // top stays at the pylon foot height this far back
  light: { length: 0.22, cols: 4, rows: 3, glow: 1.1, pointLight: 0.3 },
};

export function createTransmissionGears(options = {}) {
  const group = new THREE.Group();
  group.name = 'Transmission_Moving_Gears_Assembly';

  const gbOrigin = new THREE.Vector3(30.5, 0.0, 2.35);

  // =========================================================================
  // 1. GEARBOX STRUCTURAL CASING
  // Titanium 3D-printed main case with carbon composite upper tower
  // =========================================================================
  const casingGroup = new THREE.Group();
  casingGroup.name = 'Gearbox_Structural_Casing';
  casingGroup.position.copy(gbOrigin);

  // Lower Main Casing (Houses gear cassette and differential)
  // Extends rearward past the axle line so the differential (X = 34.0) is enclosed: X 27.4 -> 35.0
  const caseGeo = new THREE.BoxGeometry(7.6, 2.4, 1.8);
  const caseMesh = new THREE.Mesh(caseGeo, materials.titaniumAnodized);
  caseMesh.position.set(0.7, 0, -0.2);
  casingGroup.add(caseMesh);

  // Upper Bellhousing & Suspension Mount Bulkhead
  const upperCaseShape = new THREE.Shape();
  upperCaseShape.moveTo(-2.8, -1.1);
  upperCaseShape.lineTo(2.2, -1.0);
  upperCaseShape.lineTo(1.8, 1.0);
  upperCaseShape.lineTo(-2.8, 1.1);
  upperCaseShape.closePath();
  const upperExtrude = { steps: 1, depth: 1.2, bevelEnabled: true, bevelThickness: 0.1, bevelSize: 0.1, bevelSegments: 3 };
  const upperCaseGeo = new THREE.ExtrudeGeometry(upperCaseShape, upperExtrude);
  const upperCaseMesh = new THREE.Mesh(upperCaseGeo, materials.carbonSatin);
  upperCaseMesh.rotation.x = Math.PI / 2;
  upperCaseMesh.position.set(0, 0.6, 0.2);
  casingGroup.add(upperCaseMesh);

  // Rear Suspension Bellcrank Mounting Ears (Titanium clevis brackets)
  [-1, 1].forEach((side, cIdx) => {
    const clevisGeo = new THREE.BoxGeometry(0.65, 0.18, 0.45);
    const clevis = new THREE.Mesh(clevisGeo, materials.titaniumBright);
    clevis.position.set(1.5, side * 1.15, 0.85);
    casingGroup.add(clevis);
  });

  group.add(casingGroup);

  // =========================================================================
  // 2. 8-SPEED SEAMLESS-SHIFT GEAR CLUSTER
  // Input shaft (upper: Z = 2.7 dm) and Pinion countershaft (lower: Z = 2.0 dm)
  // =========================================================================
  const gearTrainGroup = new THREE.Group();
  gearTrainGroup.name = 'Kinematic_8Speed_GearTrain_Assembly';
  gearTrainGroup.position.copy(gbOrigin);

  // Upper Input Shaft (Connected to engine clutch)
  const inputShaftGeo = new THREE.CylinderGeometry(0.16, 0.16, 5.2, 16);
  const inputShaft = new THREE.Mesh(inputShaftGeo, materials.titaniumBright);
  inputShaft.rotation.z = Math.PI / 2;
  inputShaft.position.set(-0.2, 0, 0.45);
  gearTrainGroup.add(inputShaft);

  // Lower Pinion Countershaft (Drives bevel ring gear on differential)
  const pinionShaftGeo = new THREE.CylinderGeometry(0.18, 0.18, 5.2, 16);
  const pinionShaft = new THREE.Mesh(pinionShaftGeo, materials.titaniumBright);
  pinionShaft.rotation.z = Math.PI / 2;
  pinionShaft.position.set(-0.2, 0, -0.45);
  gearTrainGroup.add(pinionShaft);

  // 8 Pairs of Helical Gears with Face Dog Teeth
  // Gear sizes scale progressively from 1st gear to 8th gear
  const gearRatios = [
    { inR: 0.32, outR: 0.62 }, // 1st
    { inR: 0.36, outR: 0.58 }, // 2nd
    { inR: 0.40, outR: 0.54 }, // 3rd
    { inR: 0.44, outR: 0.50 }, // 4th
    { inR: 0.47, outR: 0.47 }, // 5th
    { inR: 0.50, outR: 0.44 }, // 6th
    { inR: 0.54, outR: 0.40 }, // 7th
    { inR: 0.58, outR: 0.36 }  // 8th
  ];

  gearRatios.forEach((ratio, gIdx) => {
    const gearX = -2.2 + gIdx * 0.55;
    const gearPair = new THREE.Group();
    gearPair.name = `GearPair_${gIdx + 1}_Ratio`;

    // Upper Input Gear
    const inGearGeo = new THREE.CylinderGeometry(ratio.inR, ratio.inR, 0.22, 24);
    const inGear = new THREE.Mesh(inGearGeo, materials.titaniumAnodized);
    inGear.rotation.z = Math.PI / 2;
    inGear.position.set(gearX, 0, 0.45);
    gearPair.add(inGear);

    // Lower Output Gear
    const outGearGeo = new THREE.CylinderGeometry(ratio.outR, ratio.outR, 0.22, 28);
    const outGear = new THREE.Mesh(outGearGeo, materials.titaniumBright);
    outGear.rotation.z = Math.PI / 2;
    outGear.position.set(gearX, 0, -0.45);
    gearPair.add(outGear);

    // 4 Genuine 3D Face Dog Teeth on each gear face
    for (let d = 0; d < 4; d++) {
      const dAngle = (d * Math.PI * 2) / 4;
      const dogGeo = new THREE.BoxGeometry(0.08, 0.08, 0.08);
      const dogMesh = new THREE.Mesh(dogGeo, materials.titaniumBright);
      dogMesh.position.set(gearX + 0.13, Math.cos(dAngle) * (ratio.inR * 0.65), 0.45 + Math.sin(dAngle) * (ratio.inR * 0.65));
      gearPair.add(dogMesh);
    }

    gearTrainGroup.add(gearPair);
  });

  // Reverse Idler Gear & Plunging Slider (Positioned between input and output)
  const revGearGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.18, 16);
  const revGear = new THREE.Mesh(revGearGeo, materials.titaniumAnodized);
  revGear.rotation.z = Math.PI / 2;
  revGear.position.set(2.4, 0.45, 0.0);
  gearTrainGroup.add(revGear);

  group.add(gearTrainGroup);

  // =========================================================================
  // 3. SELECTOR BARREL (SHIFT DRUM) & 4x BRONZE SHIFT FORKS
  // Precision helical CNC grooves shifting the seamless dog rings
  // =========================================================================
  const selectorGroup = new THREE.Group();
  selectorGroup.name = 'Kinematic_Selector_Barrel_Assembly';
  selectorGroup.position.copy(gbOrigin);

  // Cylindrical Selector Barrel
  const barrelGeo = new THREE.CylinderGeometry(0.32, 0.32, 4.8, 24);
  const barrelMesh = new THREE.Mesh(barrelGeo, materials.alLi2099);
  barrelMesh.rotation.z = Math.PI / 2;
  barrelMesh.position.set(-0.2, 0.55, 0.0);
  selectorGroup.add(barrelMesh);

  // 4 Helical Spiral Shift Tracks carved along barrel
  for (let s = 0; s < 4; s++) {
    const sX = -1.8 + s * 1.1;
    const trackTorusGeo = new THREE.TorusGeometry(0.33, 0.03, 8, 24);
    const trackMesh = new THREE.Mesh(trackTorusGeo, materials.carbonMatte);
    trackMesh.rotation.y = Math.PI / 2;
    trackMesh.position.set(sX, 0.55, 0.0);
    selectorGroup.add(trackMesh);

    // Bronze Shift Fork engaging sliding dog ring
    const forkGroup = new THREE.Group();
    forkGroup.position.set(sX, 0.55, 0.0);

    // Guide Pin riding in track
    const pinGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.12, 12);
    const pinMesh = new THREE.Mesh(pinGeo, materials.titaniumBright);
    forkGroup.add(pinMesh);

    // Fork Body extending down to gear shaft
    const forkBodyGeo = new THREE.BoxGeometry(0.08, 0.55, 0.12);
    const forkBody = new THREE.Mesh(forkBodyGeo, materials.copperWindings); // Bronze material
    forkBody.position.set(0, -0.28, 0.0);
    forkGroup.add(forkBody);

    // U-shaped shift pad engaging sliding dog collar
    const collarShape = new THREE.Shape();
    collarShape.absarc(0, 0, 0.28, -Math.PI * 0.5, Math.PI * 0.5, false);
    const collarGeo = new THREE.TubeGeometry(new THREE.LineCurve3(new THREE.Vector3(0, -0.55, 0), new THREE.Vector3(0.08, -0.55, 0)), 4, 0.04, 6, false);
    const collarMesh = new THREE.Mesh(collarGeo, materials.copperWindings);
    forkGroup.add(collarMesh);

    forkGroup.name = `ShiftFork_${s + 1}`;
    selectorGroup.add(forkGroup);
  }

  group.add(selectorGroup);

  // =========================================================================
  // 4. MULTI-PLATE CARBON-CARBON CLUTCH PACK (Article C9)
  // Pull-type clutch mounted at gearbox input snout (X = 27.2 dm, Z = 2.8 dm)
  // =========================================================================
  const clutchGroup = new THREE.Group();
  clutchGroup.name = 'Assembly_Carbon_Clutch_Pack';
  clutchGroup.position.set(27.3, 0.0, 1.45); // coaxial with crankshaft (Z 1.45)

  // Aluminum-Lithium Clutch Basket / Flywheel Housing
  const basketGeo = new THREE.CylinderGeometry(0.55, 0.55, 0.65, 24, 1, true);
  const basket = new THREE.Mesh(basketGeo, materials.alLi2099);
  basket.rotation.z = Math.PI / 2;
  clutchGroup.add(basket);

  // Alternating Carbon Friction Plates (4 driven) & Steel Drive Plates (4 drive)
  for (let p = 0; p < 8; p++) {
    const pX = -0.25 + p * 0.07;
    const plateGeo = new THREE.CylinderGeometry(0.52, 0.52, 0.03, 24, 1, true);
    const plateMat = p % 2 === 0 ? materials.carbonMatte : materials.titaniumBright;
    const plateMesh = new THREE.Mesh(plateGeo, plateMat);
    plateMesh.rotation.z = Math.PI / 2;
    plateMesh.position.set(pX, 0, 0);
    clutchGroup.add(plateMesh);
  }

  // Belleville Conical Diaphragm Pressure Spring
  const clutchSpring = createBellevilleSpring({
    outerRadius: 0.52,
    innerRadius: 0.18,
    height: 0.08,
    thickness: 0.03,
    material: materials.titaniumAnodized
  });
  clutchSpring.rotation.y = Math.PI / 2;
  clutchSpring.position.set(0.32, 0, 0);
  clutchGroup.add(clutchSpring);

  // Hydraulic Release Bearing & Slave Cylinder
  const releaseBearingGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.22, 16);
  const releaseBearing = new THREE.Mesh(releaseBearingGeo, materials.titaniumBright);
  releaseBearing.rotation.z = Math.PI / 2;
  releaseBearing.position.set(0.48, 0, 0);
  clutchGroup.add(releaseBearing);

  group.add(clutchGroup);

  // =========================================================================
  // 5. ACTIVE LIMITED SLIP DIFFERENTIAL (LSD) & BEVEL RING GEAR
  // Centered on rear axle line at X = 34.0 dm, Z = 2.8 dm (inside casing, axis lateral)
  // =========================================================================
  const diffGroup = new THREE.Group();
  diffGroup.name = 'Kinematic_Active_LSD_Assembly';
  diffGroup.position.set(34.0, 0.0, 2.8);

  // Large Crown Wheel / Bevel Ring Gear
  const ringGearGeo = new THREE.CylinderGeometry(0.85, 0.85, 0.18, 32);
  const ringGear = new THREE.Mesh(ringGearGeo, materials.titaniumBright); // axis = Y (lateral)
  ringGear.position.set(0, -0.45, 0);
  diffGroup.add(ringGear);

  // 32 Precision Bevel Teeth
  for (let b = 0; b < 32; b++) {
    const bAng = (b * Math.PI * 2) / 32;
    const bToothGeo = new THREE.BoxGeometry(0.08, 0.16, 0.08);
    const bTooth = new THREE.Mesh(bToothGeo, materials.titaniumAnodized);
    bTooth.position.set(Math.cos(bAng) * 0.88, -0.45, Math.sin(bAng) * 0.88);
    bTooth.rotation.y = -bAng;
    diffGroup.add(bTooth);
  }

  // Differential Ramp Carrier Housing (with 45°/60° ramp slots)
  const carrierGeo = new THREE.CylinderGeometry(0.65, 0.65, 0.8, 20);
  const carrier = new THREE.Mesh(carrierGeo, materials.titaniumAnodized); // axis = Y (lateral)
  diffGroup.add(carrier);

  // 4x Internal Bevel Spider Gears & Cross Pins
  [0, Math.PI / 2, Math.PI, Math.PI * 1.5].forEach((crossAngle, sIdx) => {
    const spiderPinGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.55, 12);
    const spiderPin = new THREE.Mesh(spiderPinGeo, materials.titaniumBright);
    spiderPin.position.set(Math.cos(crossAngle) * 0.28, 0, Math.sin(crossAngle) * 0.28);
    spiderPin.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(Math.cos(crossAngle), 0, Math.sin(crossAngle)));
    diffGroup.add(spiderPin);

    const spiderBevelGeo = new THREE.CylinderGeometry(0.16, 0.06, 0.14, 12);
    const spiderBevel = new THREE.Mesh(spiderBevelGeo, materials.titaniumBright);
    spiderBevel.position.set(Math.cos(crossAngle) * 0.42, 0, Math.sin(crossAngle) * 0.42);
    spiderBevel.quaternion.copy(spiderPin.quaternion);
    diffGroup.add(spiderBevel);
  });

  group.add(diffGroup);

  // =========================================================================
  // 6. DRIVESHAFTS & PLUNGING TRIPOD CV JOINTS (Left & Right)
  // Extends from diff side flanges (Y = ±0.8 dm) to rear uprights (Y = ±7.2 dm)
  // =========================================================================
  const driveshaftsGroup = new THREE.Group();
  driveshaftsGroup.name = 'Kinematic_Driveshafts_Assembly';
  driveshaftsGroup.position.set(34.0, 0.0, 2.8);

  // Diff output (Z 2.8) to rear hub (Y ±6.0 inboard face of upright, Z ~3.55): ~7° up-angle
  const DS_TILT = 0.12;
  [-1, 1].forEach((side, dsIdx) => {
    const dsAssembly = new THREE.Group();
    dsAssembly.name = `Driveshaft_${side > 0 ? 'Left' : 'Right'}`;
    dsAssembly.rotation.x = side * DS_TILT; // outer end rises toward the wheel hub
    // Data for full_car3d.js updateKinematics: the shaft pivots at the diff and its outer
    // end follows the rear hub up and down with suspension travel (corner key 'rl' / 'rr').
    dsAssembly.userData.driveshaft = { side, baseTilt: DS_TILT, reach: 1.45 + 4.6, corner: side > 0 ? 'rl' : 'rr' };

    // Spins about its own (local Y) axis - see full_car3d.js updateKinematics
    const spin = new THREE.Group();
    spin.name = `Driveshaft_Spin_${side > 0 ? 'Left' : 'Right'}`;
    dsAssembly.add(spin);

    // Inboard Tripod CV Housing (CylinderGeometry is already along Y = lateral)
    const tripodHousingGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.45, 16);
    const tripodHousing = new THREE.Mesh(tripodHousingGeo, materials.titaniumBright);
    tripodHousing.position.set(0, side * 0.75, 0);
    spin.add(tripodHousing);

    // 3 Spherical Needle-Bearing Tripod Rollers inside
    for (let r = 0; r < 3; r++) {
      const rAng = (r * Math.PI * 2) / 3;
      const rollerGeo = new THREE.SphereGeometry(0.08, 12, 12);
      const roller = new THREE.Mesh(rollerGeo, materials.titaniumAnodized);
      roller.position.set(Math.cos(rAng) * 0.18, side * 0.75, Math.sin(rAng) * 0.18);
      spin.add(roller);
    }

    // Pleated Rubber/Silicone Bellows Boot (rings around the lateral shaft axis)
    for (let b = 0; b < 4; b++) {
      const bY = side * (0.95 + b * 0.12);
      const bootRingGeo = new THREE.TorusGeometry(0.24 - b * 0.03, 0.04, 8, 16);
      const bootRing = new THREE.Mesh(bootRingGeo, materials.siliconeSeal);
      bootRing.rotation.x = Math.PI / 2;
      bootRing.position.set(0, bY, 0);
      spin.add(bootRing);
    }

    // Hollow Gun-Drilled High-Strength Steel Shaft Bar
    const shaftLength = 4.6;
    const shaftBarGeo = new THREE.CylinderGeometry(0.11, 0.11, shaftLength, 16);
    const shaftBar = new THREE.Mesh(shaftBarGeo, materials.titaniumBright);
    shaftBar.position.set(0, side * (1.45 + shaftLength / 2), 0);
    spin.add(shaftBar);

    // Outboard Wheel Hub Spline & Retention Nut (at the rear upright)
    const splineGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.45, 16);
    const splineMesh = new THREE.Mesh(splineGeo, materials.titaniumAnodized);
    splineMesh.position.set(0, side * (1.45 + shaftLength), 0);
    spin.add(splineMesh);

    driveshaftsGroup.add(dsAssembly);
  });

  group.add(driveshaftsGroup);

  // =========================================================================
  // 7. REAR IMPACT STRUCTURE (RIS) & FIA 15-LED RAIN LIGHT
  // RIS_SPEC (R10): long slim crash structure below the exhaust, square rain light at the tip
  // X = 35.0 dm to 38.67 dm, Y = 0.0 dm, Z 2.0 to 3.35 dm
  // =========================================================================
  const risGroup = new THREE.Group();
  risGroup.name = 'Assembly_RearImpactStructure_RainLight';
  risGroup.position.set(35.0, 0.0, 2.9); // bolted to gearbox rear face (X 35.0), under exhaust

  // Long, slim crash structure (R10): full depth at the gearbox, flat on top under the twin
  // pylon feet (Z 3.35), then tapering down to a small square tip that carries the rain light.
  const RS = RIS_SPEC;
  const risAt = (t) => { // t 0 = gearbox face, 1 = tip; returns the section in the RIS group frame
    const k = THREE.MathUtils.smoothstep(t, RS.flatTo, 1);
    const top = THREE.MathUtils.lerp(RS.root.top, RS.tip.top, k);
    const bot = THREE.MathUtils.lerp(RS.root.bottom, RS.tip.bottom, Math.pow(t, 0.8));
    const hw = THREE.MathUtils.lerp(RS.root.hw, RS.tip.hw, Math.pow(t, 0.9));
    return { x: THREE.MathUtils.lerp(RS.x0, RS.x1, t) - risGroup.position.x, zc: (top + bot) / 2 - risGroup.position.z, hw, hh: (top - bot) / 2 };
  };
  const risStations = []; for (let i = 0; i <= 16; i++) risStations.push(risAt(i / 16));
  const risRing = (st, v) => { // rounded rectangle (superellipse n = 5)
    const a = v * Math.PI * 2, c = Math.cos(a), sn = Math.sin(a), e = 2 / 5;
    return [st.x, Math.sign(c) * Math.pow(Math.abs(c), e) * st.hw, st.zc + Math.sign(sn) * Math.pow(Math.abs(sn), e) * st.hh];
  };
  const coneMesh = new THREE.Mesh(loftRings(risStations, risRing, 32, { capStart: true, capEnd: true }), materials.carbonGloss);
  coneMesh.name = 'RIS_CrashStructure_Body';
  coneMesh.castShadow = true;
  risGroup.add(coneMesh);

  // 2026 style rain light: a square-ended box at the very tip, dark bezel and a glowing red lens
  const tipSt = risAt(1), L = RS.light;
  // yellow safety frame as on the R6 car, square-ended box as in R10
  const housing = new THREE.Mesh(new RoundedBoxGeometry(L.length, 2 * tipSt.hw + 0.04, 2 * tipSt.hh + 0.04, 3, 0.03), materials.ledYellowSafety || materials.heatShieldGold);
  housing.name = 'RainLight_Housing';
  housing.position.set(tipSt.x + L.length / 2 - 0.02, 0, tipSt.zc);
  risGroup.add(housing);
  const lensMat = new THREE.MeshStandardMaterial({ color: 0x5a0008, emissive: 0xe00010, emissiveIntensity: L.glow, roughness: 0.25, metalness: 0.0 });
  const lens = new THREE.Mesh(new THREE.BoxGeometry(0.02, 2 * tipSt.hw - 0.06, 2 * tipSt.hh - 0.06), lensMat);
  lens.name = 'RainLight_RedLens';
  lens.position.set(tipSt.x + L.length - 0.01, 0, tipSt.zc);
  risGroup.add(lens);
  // LED grid behind the lens (cols x rows), brighter dots
  const ledGeo = new THREE.BoxGeometry(0.02, 0.07, 0.06);
  for (let c = 0; c < L.cols; c++) for (let r = 0; r < L.rows; r++) {
    const led = new THREE.Mesh(ledGeo, materials.ledRed);
    led.position.set(tipSt.x + L.length + 0.002,
      (c - (L.cols - 1) / 2) * ((2 * tipSt.hw - 0.16) / (L.cols - 1)),
      tipSt.zc + (r - (L.rows - 1) / 2) * ((2 * tipSt.hh - 0.16) / (L.rows - 1)));
    led.name = `RainLight_LED_${c}_${r}`;
    risGroup.add(led);
  }
  if (L.pointLight) { // small red glow on the floor and diffuser behind it
    const glow = new THREE.PointLight(0xff2030, L.pointLight, 6, 2);
    glow.name = 'RainLight_Glow';
    glow.position.set(tipSt.x + L.length + 0.25, 0, tipSt.zc);
    risGroup.add(glow);
  }

  group.add(risGroup);

  return group;
}
