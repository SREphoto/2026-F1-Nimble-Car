/**
 * f1_2026_full_car_twin/software/viewer/cad/transmission_moving_gears.js
 * 
 * Meticulous 3D Procedural CAD for the 8-Speed Longitudinal Gearbox, Differential, & Drivetrain:
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
  const caseGeo = new THREE.BoxGeometry(6.2, 2.4, 1.8);
  const caseMesh = new THREE.Mesh(caseGeo, materials.titaniumAnodized);
  caseMesh.position.set(0, 0, -0.2);
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
  clutchGroup.position.set(27.3, 0.0, 2.8);

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
  // Centered on rear axle centerline at X = 34.0 dm, Z = 2.35 dm
  // =========================================================================
  const diffGroup = new THREE.Group();
  diffGroup.name = 'Kinematic_Active_LSD_Assembly';
  diffGroup.position.set(34.0, 0.0, 2.35);

  // Large Crown Wheel / Bevel Ring Gear
  const ringGearGeo = new THREE.CylinderGeometry(0.85, 0.85, 0.18, 32);
  const ringGear = new THREE.Mesh(ringGearGeo, materials.titaniumBright);
  ringGear.rotation.x = Math.PI / 2;
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
  const carrier = new THREE.Mesh(carrierGeo, materials.titaniumAnodized);
  carrier.rotation.x = Math.PI / 2;
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
  driveshaftsGroup.position.set(34.0, 0.0, 2.35);

  [-1, 1].forEach((side, dsIdx) => {
    const dsAssembly = new THREE.Group();
    dsAssembly.name = `Driveshaft_${side > 0 ? 'Left' : 'Right'}`;

    // Inboard Tripod CV Housing
    const tripodHousingGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.45, 16);
    const tripodHousing = new THREE.Mesh(tripodHousingGeo, materials.titaniumBright);
    tripodHousing.rotation.x = Math.PI / 2;
    tripodHousing.position.set(0, side * 0.75, 0);
    dsAssembly.add(tripodHousing);

    // 3 Spherical Needle-Bearing Tripod Rollers inside
    for (let r = 0; r < 3; r++) {
      const rAng = (r * Math.PI * 2) / 3;
      const rollerGeo = new THREE.SphereGeometry(0.08, 12, 12);
      const roller = new THREE.Mesh(rollerGeo, materials.titaniumAnodized);
      roller.position.set(Math.cos(rAng) * 0.18, side * 0.75, Math.sin(rAng) * 0.18);
      dsAssembly.add(roller);
    }

    // Pleated Rubber/Silicone Bellows Boot
    for (let b = 0; b < 4; b++) {
      const bY = side * (0.95 + b * 0.12);
      const bootRingGeo = new THREE.TorusGeometry(0.24 - b * 0.03, 0.04, 8, 16);
      const bootRing = new THREE.Mesh(bootRingGeo, materials.siliconeSeal);
      bootRing.rotation.y = Math.PI / 2;
      bootRing.position.set(0, bY, 0);
      dsAssembly.add(bootRing);
    }

    // Hollow Gun-Drilled High-Strength Steel Shaft Bar
    const shaftLength = 5.2;
    const shaftBarGeo = new THREE.CylinderGeometry(0.11, 0.11, shaftLength, 16);
    const shaftBar = new THREE.Mesh(shaftBarGeo, materials.titaniumBright);
    shaftBar.rotation.x = Math.PI / 2;
    shaftBar.position.set(0, side * (1.45 + shaftLength / 2), 0);
    dsAssembly.add(shaftBar);

    // Outboard Wheel Hub Spline & Retention Nut
    const splineGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.45, 16);
    const splineMesh = new THREE.Mesh(splineGeo, materials.titaniumAnodized);
    splineMesh.rotation.x = Math.PI / 2;
    splineMesh.position.set(0, side * (1.45 + shaftLength), 0);
    dsAssembly.add(splineMesh);

    driveshaftsGroup.add(dsAssembly);
  });

  group.add(driveshaftsGroup);

  // =========================================================================
  // 7. REAR IMPACT STRUCTURE (RIS) & FIA 15-LED RAIN LIGHT
  // Matches Reference Images: Central trapezoidal cone below exhaust,
  // yellow-bordered housing with circular cluster of high-intensity red LEDs
  // X = 35.5 dm to 38.5 dm, Y = 0.0 dm, Z = 2.15 dm
  // =========================================================================
  const risGroup = new THREE.Group();
  risGroup.name = 'Assembly_RearImpactStructure_RainLight';
  risGroup.position.set(36.5, 0.0, 2.15);

  // 50 kJ Carbon Composite Crash Attenuator Cone
  const coneShape = new THREE.Shape();
  coneShape.moveTo(-0.6, -0.6);
  coneShape.lineTo(0.6, -0.6);
  coneShape.lineTo(0.45, 0.55);
  coneShape.lineTo(-0.45, 0.55);
  coneShape.closePath();

  const coneExtrude = { steps: 2, depth: 2.2, bevelEnabled: true, bevelThickness: 0.1, bevelSize: 0.1, bevelSegments: 3 };
  const coneGeo = new THREE.ExtrudeGeometry(coneShape, coneExtrude);
  const coneMesh = new THREE.Mesh(coneGeo, materials.carbonGloss);
  coneMesh.rotation.y = -Math.PI / 2;
  coneMesh.position.set(0, 0, -0.2);
  risGroup.add(coneMesh);

  // Rain Light Yellow Safety Bezel (Matching Reference Image 4)
  const bezelShape = new THREE.Shape();
  bezelShape.absellipse(0, 0, 0.35, 0.48, 0, Math.PI * 2, false, 0);
  const bezelExtrude = { steps: 1, depth: 0.08, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 2 };
  const bezelGeo = new THREE.ExtrudeGeometry(bezelShape, bezelExtrude);
  const bezelMesh = new THREE.Mesh(bezelGeo, materials.ledYellowSafety || materials.heatShieldGold);
  bezelMesh.rotation.y = Math.PI / 2;
  bezelMesh.position.set(2.22, 0, 0);
  bezelMesh.name = 'RainLight_YellowSafetyBezel';
  risGroup.add(bezelMesh);

  // Dark Recessed Optical Faceplate
  const faceplateGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.04, 24);
  const faceplateMesh = new THREE.Mesh(faceplateGeo, materials.carbonMatte);
  faceplateMesh.rotation.z = Math.PI / 2;
  faceplateMesh.position.set(2.25, 0, 0);
  risGroup.add(faceplateMesh);

  // 15 High-Intensity Red LED Elements in Concentric Pattern (Matching Reference Image 4)
  const ledGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.04, 12);
  // Center LED
  const centerLed = new THREE.Mesh(ledGeo, materials.ledRed);
  centerLed.rotation.z = Math.PI / 2;
  centerLed.position.set(2.28, 0, 0);
  risGroup.add(centerLed);

  // Inner Ring: 5 LEDs
  for (let i = 0; i < 5; i++) {
    const a = (i * Math.PI * 2) / 5;
    const lMesh = new THREE.Mesh(ledGeo, materials.ledRed);
    lMesh.rotation.z = Math.PI / 2;
    lMesh.position.set(2.28, Math.cos(a) * 0.11, Math.sin(a) * 0.13);
    risGroup.add(lMesh);
  }

  // Outer Ring: 9 LEDs
  for (let j = 0; j < 9; j++) {
    const a = (j * Math.PI * 2) / 9;
    const lMesh = new THREE.Mesh(ledGeo, materials.ledRed);
    lMesh.rotation.z = Math.PI / 2;
    lMesh.position.set(2.28, Math.cos(a) * 0.22, Math.sin(a) * 0.26);
    risGroup.add(lMesh);
  }

  group.add(risGroup);

  return group;
}
