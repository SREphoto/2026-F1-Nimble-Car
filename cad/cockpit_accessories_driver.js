/**
 * f1_2026_full_car_twin/software/viewer/cad/cockpit_accessories_driver.js
 * 
 * Meticulous 3D Procedural CAD for Driver, Helmet, Mirrors, T-Cam, and Cockpit Accessories:
 * - Driver Helmet (FIA 8860-2018-ABP ballistic standard):
 *   * Contoured shell, chin spoiler, top cooling vents
 *   * Narrow 10mm visor aperture, dark polycarbonate visor, ballistic forehead strip
 *   * Visor pivot mechanisms with anodized aluminum hardware, tear-off posts
 *   * HANS anchor posts (M6 FIA 8858-2010 specification)
 * - Confor Foam Headrest:
 *   * Viscoelastic U-shaped surround with quick-release locating pins
 * - Aerodynamic Rear-View Mirrors (Matching 2026 Reference Photos):
 *   * Dual-surface carbon fiber housing with contoured outer edge
 *   * Front-facing 14-LED amber marshal warning array (2x7 matrix) in recessed bezel
 *   * Rear-facing reflective mirror glass in recessed frame
 *   * L-shaped aerodynamic carbon mounting stalk with titanium mounting foot
 *   * Horizontal cockpit rim air deflector vane / mirror winglet
 * - FIA T-Camera Roll Hoop Pod:
 *   * Aerodynamic T-bar housing on roll hoop peak
 *   * Forward and rear optical camera lenses with sapphire glass
 *   * Base pylon with M6 Torx mounting fasteners
 * - Chassis Top Instrumentation:
 *   * Pitot tube probe (bent stainless steel with dynamic tip and static rings)
 *   * UHF telemetry blade antenna and FIA GPS transponder antenna
 *   * Front chassis vanity access panel with 4x Camloc 1/4-turn slotted fasteners
 * 
 * Universal Datum:
 * - Front Axle Centerline at [0, 0, 0] on ground (Z=0)
 * - Cockpit at X in [8.5, 16.5] dm, Y in [-3.5, 3.5] dm, Z in [2.5, 8.5] dm
 */

import * as THREE from 'three';
import { materials } from '../materials.js';
import { createTorxScrew, createSocketHeadBolt } from './fasteners.js';

export function createCockpitAccessories(options = {}) {
  const group = new THREE.Group();
  group.name = 'Cockpit_Accessories_Assembly';

  // =========================================================================
  // 1. DRIVER & HELMET (FIA 8860-2018-ABP Specification)
  // Driver seated at X = 13.2 dm, Y = 0.0 dm, Z = 6.2 dm
  // =========================================================================
  const driverGroup = new THREE.Group();
  driverGroup.name = 'Assembly_Driver_Helmet';
  driverGroup.position.set(13.2, 0, 6.2);

  // Helmet Outer Shell (Contoured composite shell)
  const helmetShellGeo = new THREE.SphereGeometry(1.35, 32, 24, 0, Math.PI * 2, 0, Math.PI * 0.78);
  // Flatten sides slightly for authentic human/helmet profile
  helmetShellGeo.scale(1.15, 0.95, 1.05);
  const helmetShell = new THREE.Mesh(helmetShellGeo, materials.redBullNavy || materials.carbonSatin);
  helmetShell.name = 'Helmet_OuterShell';
  helmetShell.castShadow = true;
  driverGroup.add(helmetShell);

  // Chin Bar & Lower Jaw Structure
  const chinShape = new THREE.Shape();
  chinShape.moveTo(0.2, -0.6);
  chinShape.lineTo(-1.3, -0.6);
  chinShape.lineTo(-1.45, -0.2);
  chinShape.lineTo(-1.35, 0.35);
  chinShape.lineTo(0.1, 0.35);
  chinShape.closePath();

  const chinExtrudeSettings = {
    steps: 2,
    depth: 1.5,
    bevelEnabled: true,
    bevelThickness: 0.15,
    bevelSize: 0.15,
    bevelSegments: 4
  };
  const chinGeo = new THREE.ExtrudeGeometry(chinShape, chinExtrudeSettings);
  chinGeo.center();
  const chinMesh = new THREE.Mesh(chinGeo, materials.redBullNavy || materials.carbonSatin);
  chinMesh.position.set(-0.35, 0, -0.35);
  chinMesh.rotation.y = Math.PI / 2;
  chinMesh.name = 'Helmet_ChinBar';
  driverGroup.add(chinMesh);

  // Chin Spoiler & Aero Gurney Lip
  const chinSpoilerGeo = new THREE.CylinderGeometry(0.75, 0.8, 0.12, 24, 1, false, -Math.PI * 0.45, Math.PI * 0.9);
  const chinSpoiler = new THREE.Mesh(chinSpoilerGeo, materials.carbonGloss);
  chinSpoiler.rotation.z = Math.PI / 2;
  chinSpoiler.position.set(-1.4, 0, -0.7);
  chinSpoiler.name = 'Helmet_ChinSpoiler';
  driverGroup.add(chinSpoiler);

  // Chin Cooling Vents (4 discrete intake slots)
  for (let i = -1; i <= 1; i += 2) {
    for (let j = 0; j < 2; j++) {
      const ventGeo = new THREE.BoxGeometry(0.08, 0.22, 0.08);
      const vent = new THREE.Mesh(ventGeo, materials.titaniumAnodized);
      vent.position.set(-1.42, i * (0.2 + j * 0.25), -0.45 + j * 0.12);
      vent.name = `Helmet_VentSlot_${i}_${j}`;
      driverGroup.add(vent);
    }
  }

  // Visor Eyeport Recess & Rubber Gasket
  const gasketCurve = new THREE.EllipseCurve(
    0, 0,
    1.0, 0.45,
    Math.PI * 0.18, Math.PI * 0.82,
    false, 0
  );
  const gasketPoints = gasketCurve.getPoints(24).map(p => new THREE.Vector3(-p.y - 0.7, p.x, 0.05));
  const gasketSpline = new THREE.CatmullRomCurve3(gasketPoints);
  const gasketGeo = new THREE.TubeGeometry(gasketSpline, 24, 0.035, 8, false);
  const gasketMesh = new THREE.Mesh(gasketGeo, materials.siliconeSeal);
  gasketMesh.name = 'Helmet_VisorGasket';
  driverGroup.add(gasketMesh);

  // Polycarbonate Visor (Narrow 10mm ABP aperture, dark smoke tint)
  const visorCurve = new THREE.EllipseCurve(
    0, 0,
    1.02, 0.48,
    Math.PI * 0.20, Math.PI * 0.80,
    false, 0
  );
  const visorPoints = visorCurve.getPoints(24).map(p => new THREE.Vector3(-p.y - 0.72, p.x, 0.05));
  const visorSpline = new THREE.CatmullRomCurve3(visorPoints);
  const visorGeo = new THREE.TubeGeometry(visorSpline, 24, 0.16, 6, false);
  visorGeo.scale(1.0, 1.0, 1.8);
  const visorMesh = new THREE.Mesh(visorGeo, materials.glassRefractive);
  visorMesh.name = 'Helmet_Visor_Polycarbonate';
  driverGroup.add(visorMesh);

  // Ballistic Forehead Strip (Zylon / Aramid strip, FIA 8860-2018-ABP mandatory reinforcement)
  const zylonStripGeo = new THREE.CylinderGeometry(1.08, 1.08, 0.22, 24, 1, true, Math.PI * 0.65, Math.PI * 0.7);
  const zylonStrip = new THREE.Mesh(zylonStripGeo, materials.carbonGloss);
  zylonStrip.rotation.x = Math.PI / 2;
  zylonStrip.position.set(-0.35, 0, 0.38);
  zylonStrip.name = 'Helmet_BallisticZylonStrip';
  driverGroup.add(zylonStrip);

  // Visor Pivot Hardware (Left & Right)
  [-1, 1].forEach(side => {
    const pivotGroup = new THREE.Group();
    pivotGroup.position.set(-0.15, side * 1.02, 0.08);

    // Aluminum mounting disc
    const discGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.04, 16);
    const discMesh = new THREE.Mesh(discGeo, materials.alLi2099);
    discMesh.rotation.x = Math.PI / 2;
    pivotGroup.add(discMesh);

    // Pivot screw with hex recess
    const pivotScrew = createSocketHeadBolt({
      headRadius: 0.1,
      headHeight: 0.05,
      hexRadius: 0.055,
      hexDepth: 0.035,
      shankRadius: 0.045,
      shankLength: 0.06,
      material: materials.titaniumBright
    });
    pivotScrew.rotation.x = side > 0 ? -Math.PI / 2 : Math.PI / 2;
    pivotGroup.add(pivotScrew);

    // Tear-off post (clear plastic spool for visor tear-off sheets)
    const postGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.12, 12);
    const postMesh = new THREE.Mesh(postGeo, materials.alLi2099);
    postMesh.rotation.x = Math.PI / 2;
    postMesh.position.set(-0.45, 0, -0.05);
    pivotGroup.add(postMesh);

    // HANS Anchor Post (M6 FIA 8858-2010 spec anchor post on lower rear quarter)
    const hansPostGroup = new THREE.Group();
    hansPostGroup.position.set(0.65, side * 0.95, -0.45);
    const hansFlange = new THREE.CylinderGeometry(0.12, 0.12, 0.03, 16);
    const hansFlangeMesh = new THREE.Mesh(hansFlange, materials.titaniumAnodized);
    hansFlangeMesh.rotation.x = Math.PI / 2;
    hansPostGroup.add(hansFlangeMesh);

    const hansSpool = new THREE.CylinderGeometry(0.07, 0.07, 0.1, 16);
    const hansSpoolMesh = new THREE.Mesh(hansSpool, materials.titaniumBright);
    hansSpoolMesh.rotation.x = Math.PI / 2;
    hansSpoolMesh.position.set(0, side * 0.05, 0);
    hansPostGroup.add(hansSpoolMesh);

    hansPostGroup.name = `Helmet_HANSPost_${side > 0 ? 'Left' : 'Right'}`;
    driverGroup.add(hansPostGroup);

    driverGroup.add(pivotGroup);
  });

  // Helmet Top Ventilation Scoops (Aero chimney vents)
  [-0.2, 0.2].forEach(yOffset => {
    const chimneyShape = new THREE.Shape();
    chimneyShape.moveTo(-0.15, -0.08);
    chimneyShape.lineTo(0.35, -0.08);
    chimneyShape.lineTo(0.25, 0.12);
    chimneyShape.lineTo(-0.15, 0.04);
    chimneyShape.closePath();
    const chimneyExtrude = { steps: 1, depth: 0.1, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 2 };
    const chimneyGeo = new THREE.ExtrudeGeometry(chimneyShape, chimneyExtrude);
    const chimneyMesh = new THREE.Mesh(chimneyGeo, materials.carbonGloss);
    chimneyMesh.rotation.x = Math.PI / 2;
    chimneyMesh.position.set(0.1, yOffset - 0.05, 1.28);
    driverGroup.add(chimneyMesh);
  });

  group.add(driverGroup);

  // =========================================================================
  // 2. CONFOR FOAM HEADREST SURROUND (Viscoelastic cockpit safety collar)
  // U-shaped energy-absorbing foam encircling the cockpit opening
  // =========================================================================
  const headrestGroup = new THREE.Group();
  headrestGroup.name = 'Cockpit_Headrest_Assembly';
  headrestGroup.position.set(13.8, 0, 5.85);

  const headrestShape = new THREE.Shape();
  // Outer perimeter of headrest
  headrestShape.moveTo(-1.6, -2.2);
  headrestShape.lineTo(1.8, -2.1);
  headrestShape.lineTo(1.9, 0);
  headrestShape.lineTo(1.8, 2.1);
  headrestShape.lineTo(-1.6, 2.2);
  // Inner cutout for driver helmet
  const holePath = new THREE.Path();
  holePath.moveTo(-1.6, -1.35);
  holePath.lineTo(1.0, -1.35);
  holePath.quadraticCurveTo(1.3, 0, 1.0, 1.35);
  holePath.lineTo(-1.6, 1.35);
  holePath.closePath();
  headrestShape.holes.push(holePath);

  const headrestExtrude = {
    steps: 2,
    depth: 0.95,
    bevelEnabled: true,
    bevelThickness: 0.15,
    bevelSize: 0.15,
    bevelSegments: 4
  };
  const headrestGeo = new THREE.ExtrudeGeometry(headrestShape, headrestExtrude);
  const headrestMesh = new THREE.Mesh(headrestGeo, materials.carbonMatte);
  headrestMesh.rotation.x = -Math.PI / 2;
  headrestMesh.position.set(0, 0.47, 0);
  headrestGroup.add(headrestMesh);

  // Quick-Release Headrest Locating Pins (FIA requirement: removable in <5 sec)
  [
    { x: -1.2, y: -2.0 }, { x: -1.2, y: 2.0 },
    { x: 1.5, y: -1.8 }, { x: 1.5, y: 1.8 }
  ].forEach((pos, idx) => {
    const pinGroup = new THREE.Group();
    pinGroup.position.set(pos.x, pos.y, 0.45);
    const pinRingGeo = new THREE.TorusGeometry(0.12, 0.03, 8, 16);
    const pinRingMesh = new THREE.Mesh(pinRingGeo, materials.titaniumAnodized);
    pinGroup.add(pinRingMesh);
    const pinStemGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.3, 12);
    const pinStemMesh = new THREE.Mesh(pinStemGeo, materials.titaniumBright);
    pinStemMesh.position.z = -0.15;
    pinGroup.add(pinStemMesh);
    pinGroup.name = `Headrest_QuickReleasePin_${idx}`;
    headrestGroup.add(pinGroup);
  });

  group.add(headrestGroup);

  // =========================================================================
  // 3. AERODYNAMIC REAR-VIEW MIRRORS (Matching 2026 Reference Photos)
  // Left: Y = -4.2 dm, Right: Y = +4.2 dm at X = 12.0 dm, Z = 5.2 dm
  // Features:
  // - Outer aerodynamic housing with rounded edges
  // - Front-facing 14-LED marshal amber array (2x7 grid)
  // - Rear-facing reflective mirror glass seated in recessed frame
  // - L-shaped carbon aerodynamic mounting stalk
  // - Horizontal cockpit rim flow conditioning winglet
  // =========================================================================
  [-1, 1].forEach(side => {
    const mirrorAssembly = new THREE.Group();
    mirrorAssembly.name = `Assembly_Mirror_${side > 0 ? 'Left' : 'Right'}`;
    mirrorAssembly.position.set(9.5, side * 3.4, 5.3);
    mirrorAssembly.scale.set(0.65, 0.65, 0.65);

    // Mirror Body Outer Shell (Aerodynamic pod)
    const mirrorBodyShape = new THREE.Shape();
    mirrorBodyShape.moveTo(-0.8, -0.35);
    mirrorBodyShape.lineTo(0.8, -0.35);
    mirrorBodyShape.quadraticCurveTo(1.1, 0, 0.8, 0.35);
    mirrorBodyShape.lineTo(-0.8, 0.35);
    mirrorBodyShape.quadraticCurveTo(-1.0, 0, -0.8, -0.35);
    mirrorBodyShape.closePath();

    const mirrorExtrude = {
      steps: 2,
      depth: 1.45,
      bevelEnabled: true,
      bevelThickness: 0.12,
      bevelSize: 0.12,
      bevelSegments: 4
    };
    const mirrorBodyGeo = new THREE.ExtrudeGeometry(mirrorBodyShape, mirrorExtrude);
    mirrorBodyGeo.center();
    const mirrorBodyMesh = new THREE.Mesh(mirrorBodyGeo, materials.redBullNavy || materials.carbonGloss);
    mirrorBodyMesh.rotation.y = side > 0 ? 0.08 : -0.08;
    mirrorBodyMesh.name = `Mirror_Shell_${side > 0 ? 'L' : 'R'}`;
    mirrorAssembly.add(mirrorBodyMesh);

    // Front-Facing 14-LED Marshal Warning Array (2 rows x 7 columns)
    const ledMatrixGroup = new THREE.Group();
    ledMatrixGroup.name = `Mirror_MarshalLEDArray_${side > 0 ? 'L' : 'R'}`;
    // Position on front face (pointing forward: -X direction)
    ledMatrixGroup.position.set(-0.82, 0, 0);

    // Recessed dark bezel housing the LEDs
    const ledBezelGeo = new THREE.BoxGeometry(0.06, 0.55, 1.15);
    const ledBezelMesh = new THREE.Mesh(ledBezelGeo, materials.carbonMatte);
    ledMatrixGroup.add(ledBezelMesh);

    // 14 Discrete Amber LED Elements (7 across x 2 tall)
    const ledRadius = 0.045;
    const ledGeo = new THREE.CylinderGeometry(ledRadius, ledRadius, 0.04, 12);
    for (let row = 0; row < 2; row++) {
      for (let col = 0; col < 7; col++) {
        const ledMesh = new THREE.Mesh(ledGeo, materials.ledAmber);
        ledMesh.rotation.z = Math.PI / 2;
        const zPos = -0.45 + col * 0.15;
        const yPos = -0.12 + row * 0.24;
        ledMesh.position.set(-0.02, yPos, zPos);
        ledMesh.name = `LED_${row}_${col}`;
        ledMatrixGroup.add(ledMesh);
      }
    }
    mirrorAssembly.add(ledMatrixGroup);

    // Rear-Facing Reflective Mirror Glass (Pointing rearward: +X direction)
    const mirrorGlassGeo = new THREE.PlaneGeometry(0.65, 1.25);
    const mirrorGlassMesh = new THREE.Mesh(mirrorGlassGeo, materials.mirrorGlass);
    mirrorGlassMesh.rotation.y = Math.PI / 2;
    // Driver viewing angle: angled slightly inward toward driver
    mirrorGlassMesh.rotation.z = side > 0 ? -0.15 : 0.15;
    mirrorGlassMesh.position.set(0.82, 0, 0);
    mirrorGlassMesh.name = `Mirror_Glass_${side > 0 ? 'L' : 'R'}`;
    mirrorAssembly.add(mirrorGlassMesh);

    // L-Shaped Aerodynamic Carbon Mounting Stalk
    // Stalk connects from cockpit chassis coaming (Y = side * 3.3, Z = 4.8) to mirror base
    const stalkCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.1, -side * 1.05, -0.65), // Chassis mounting point
      new THREE.Vector3(0.05, -side * 0.85, -0.45),
      new THREE.Vector3(0.0, -side * 0.45, -0.15),
      new THREE.Vector3(-0.05, 0.0, 0.0)             // Mirror underside attachment
    ]);
    const stalkGeo = new THREE.TubeGeometry(stalkCurve, 20, 0.09, 8, false);
    // Flatten stalk into an aerodynamic teardrop chord
    stalkGeo.scale(1.8, 0.8, 1.0);
    const stalkMesh = new THREE.Mesh(stalkGeo, materials.carbonGloss);
    stalkMesh.name = `Mirror_Stalk_${side > 0 ? 'L' : 'R'}`;
    mirrorAssembly.add(stalkMesh);

    // Stalk Chassis Mounting Foot with 3x Countersunk Torx Fasteners
    const footGroup = new THREE.Group();
    footGroup.position.set(0.1, -side * 1.05, -0.65);
    const footPlateGeo = new THREE.BoxGeometry(0.5, 0.25, 0.06);
    const footPlateMesh = new THREE.Mesh(footPlateGeo, materials.titaniumBright);
    footPlateMesh.rotation.y = side > 0 ? 0.2 : -0.2;
    footGroup.add(footPlateMesh);

    [-0.15, 0.0, 0.15].forEach((xOff, fIdx) => {
      const screw = createTorxScrew({
        headRadius: 0.045,
        headHeight: 0.025,
        lobeRadius: 0.025,
        shankRadius: 0.025,
        shankLength: 0.05,
        material: materials.titaniumAnodized
      });
      screw.position.set(xOff, 0, 0.03);
      screw.rotation.x = Math.PI / 2;
      screw.name = `MirrorFoot_Fastener_${fIdx}`;
      footGroup.add(screw);
    });
    mirrorAssembly.add(footGroup);

    // Horizontal Flow Conditioning Winglet (extends inboard from mirror / cockpit coaming)
    const wingletShape = new THREE.Shape();
    wingletShape.moveTo(-0.6, 0);
    wingletShape.lineTo(0.6, 0);
    wingletShape.lineTo(0.4, 0.04);
    wingletShape.lineTo(-0.6, 0.02);
    wingletShape.closePath();
    const wingletExtrude = { steps: 1, depth: 0.75, bevelEnabled: false };
    const wingletGeo = new THREE.ExtrudeGeometry(wingletShape, wingletExtrude);
    const wingletMesh = new THREE.Mesh(wingletGeo, materials.carbonGloss);
    wingletMesh.rotation.x = side > 0 ? -Math.PI / 2 : Math.PI / 2;
    wingletMesh.position.set(-0.1, -side * 0.25, -0.15);
    wingletMesh.name = `Mirror_AeroWinglet_${side > 0 ? 'L' : 'R'}`;
    mirrorAssembly.add(wingletMesh);

    group.add(mirrorAssembly);
  });

  // =========================================================================
  // 4. FIA T-CAMERA ROLL HOOP POD (Mounted on Roll Hoop Airbox Peak)
  // X = 15.6 dm, Y = 0.0 dm, Z = 9.85 dm (Apex of engine airbox)
  // Standardized housing with forward and rearward facing cameras
  // =========================================================================
  const tCamGroup = new THREE.Group();
  tCamGroup.name = 'Assembly_FIA_T_Camera';
  tCamGroup.position.set(15.6, 0, 9.82);

  // Carbon Fiber Aerodynamic Mast
  const tMastGeo = new THREE.BoxGeometry(0.35, 0.22, 0.65);
  const tMastMesh = new THREE.Mesh(tMastGeo, materials.carbonGloss);
  tCamGroup.add(tMastMesh);

  // Horizontal T-Bar Housing
  const tBarShape = new THREE.Shape();
  tBarShape.moveTo(-0.55, -0.2);
  tBarShape.lineTo(0.55, -0.2);
  tBarShape.quadraticCurveTo(0.7, 0, 0.55, 0.2);
  tBarShape.lineTo(-0.55, 0.2);
  tBarShape.quadraticCurveTo(-0.7, 0, -0.55, -0.2);
  tBarShape.closePath();

  const tBarExtrude = { steps: 2, depth: 1.8, bevelEnabled: true, bevelThickness: 0.08, bevelSize: 0.08, bevelSegments: 3 };
  const tBarGeo = new THREE.ExtrudeGeometry(tBarShape, tBarExtrude);
  tBarGeo.center();
  const tBarMesh = new THREE.Mesh(tBarGeo, materials.redBullYellow || materials.ledYellowSafety);
  tBarMesh.rotation.set(Math.PI / 2, 0, 0);
  tBarMesh.position.z = 0.42;
  tBarMesh.name = 'TCam_HorizontalBar';
  tCamGroup.add(tBarMesh);

  // Camera Lenses:
  // Forward Camera (Looking toward front: -X)
  const fwdLensBezelGeo = new THREE.CylinderGeometry(0.11, 0.11, 0.06, 16);
  const fwdLensBezel = new THREE.Mesh(fwdLensBezelGeo, materials.titaniumAnodized);
  fwdLensBezel.rotation.z = Math.PI / 2;
  fwdLensBezel.position.set(-0.62, 0.0, 0.42);
  tCamGroup.add(fwdLensBezel);

  const fwdLensGlassGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.02, 16);
  const fwdLensGlass = new THREE.Mesh(fwdLensGlassGeo, materials.glassRefractive);
  fwdLensGlass.rotation.z = Math.PI / 2;
  fwdLensGlass.position.set(-0.65, 0.0, 0.42);
  tCamGroup.add(fwdLensGlass);

  // Rearward Camera (Looking toward rear wing: +X)
  const rearLensBezelGeo = new THREE.CylinderGeometry(0.11, 0.11, 0.06, 16);
  const rearLensBezel = new THREE.Mesh(rearLensBezelGeo, materials.titaniumAnodized);
  rearLensBezel.rotation.z = Math.PI / 2;
  rearLensBezel.position.set(0.62, 0.0, 0.42);
  tCamGroup.add(rearLensBezel);

  const rearLensGlassGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.02, 16);
  const rearLensGlass = new THREE.Mesh(rearLensGlassGeo, materials.glassRefractive);
  rearLensGlass.rotation.z = Math.PI / 2;
  rearLensGlass.position.set(0.65, 0.0, 0.42);
  tCamGroup.add(rearLensGlass);

  // Left & Right Flanking Micro-Cameras (Driver head & onboard action views)
  [-0.85, 0.85].forEach((yPos, cIdx) => {
    const flankLensGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.04, 12);
    const flankLens = new THREE.Mesh(flankLensGeo, materials.titaniumBright);
    flankLens.rotation.x = Math.PI / 2;
    flankLens.position.set(0, yPos, 0.42);
    flankLens.name = `TCam_FlankLens_${cIdx}`;
    tCamGroup.add(flankLens);
  });

  // Base Mounting Screws (4x M4 Torx fasteners)
  [-0.12, 0.12].forEach(xOff => {
    [-0.08, 0.08].forEach(yOff => {
      const screw = createTorxScrew({
        headRadius: 0.035,
        headHeight: 0.02,
        lobeRadius: 0.02,
        shankRadius: 0.02,
        shankLength: 0.04,
        material: materials.titaniumBright
      });
      screw.position.set(xOff, yOff, -0.32);
      screw.rotation.x = Math.PI;
      tCamGroup.add(screw);
    });
  });

  group.add(tCamGroup);

  // =========================================================================
  // 5. CHASSIS TOP SENSORS & ACCESS PANEL (Between Bulkheads B-B and C-C)
  // X = 7.5 dm to 9.2 dm, Y = 0.0 dm, Z = 4.4 dm
  // =========================================================================
  const sensorsGroup = new THREE.Group();
  sensorsGroup.name = 'Chassis_Top_Instrumentation';

  // Pitot Tube Sensor (Dynamic pressure probe for airspeed and aero testing)
  // Curved stainless steel tube pointing forward
  const pitotGroup = new THREE.Group();
  pitotGroup.position.set(7.2, 0, 4.38);

  // Mounting flange with 3x miniature screws
  const pitotFlangeGeo = new THREE.CylinderGeometry(0.14, 0.14, 0.03, 16);
  const pitotFlangeMesh = new THREE.Mesh(pitotFlangeGeo, materials.alLi2099);
  pitotGroup.add(pitotFlangeMesh);

  for (let a = 0; a < 3; a++) {
    const angle = (a * 2 * Math.PI) / 3;
    const pScrew = createTorxScrew({
      headRadius: 0.025,
      headHeight: 0.015,
      lobeRadius: 0.015,
      shankRadius: 0.015,
      shankLength: 0.03,
      material: materials.titaniumBright
    });
    pScrew.position.set(Math.cos(angle) * 0.09, Math.sin(angle) * 0.09, 0.02);
    pitotGroup.add(pScrew);
  }

  // Mast & Forward Probe
  const pitotCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(-0.08, 0, 0.45),
    new THREE.Vector3(-0.35, 0, 0.65),
    new THREE.Vector3(-0.85, 0, 0.65) // Pointing forward into clean airflow
  ]);
  const pitotGeo = new THREE.TubeGeometry(pitotCurve, 20, 0.022, 10, false);
  const pitotMesh = new THREE.Mesh(pitotGeo, materials.titaniumBright);
  pitotGroup.add(pitotMesh);

  // Static Port Ring (Small sensing holes around circumference)
  const staticRingGeo = new THREE.CylinderGeometry(0.026, 0.026, 0.06, 12);
  const staticRingMesh = new THREE.Mesh(staticRingGeo, materials.titaniumAnodized);
  staticRingMesh.rotation.z = Math.PI / 2;
  staticRingMesh.position.set(-0.65, 0, 0.65);
  pitotGroup.add(staticRingMesh);

  sensorsGroup.add(pitotGroup);

  // UHF Telemetry Blade Antenna (Team high-bandwidth radio antenna)
  const bladeGroup = new THREE.Group();
  bladeGroup.position.set(8.5, 0, 4.52);

  const bladeShape = new THREE.Shape();
  bladeShape.moveTo(-0.15, 0);
  bladeShape.lineTo(0.15, 0);
  bladeShape.lineTo(0.08, 0.65);
  bladeShape.lineTo(-0.06, 0.65);
  bladeShape.closePath();
  const bladeExtrude = { steps: 1, depth: 0.04, bevelEnabled: true, bevelThickness: 0.01, bevelSize: 0.01, bevelSegments: 2 };
  const bladeGeo = new THREE.ExtrudeGeometry(bladeShape, bladeExtrude);
  bladeGeo.center();
  const bladeMesh = new THREE.Mesh(bladeGeo, materials.carbonGloss);
  bladeMesh.position.z = 0.35;
  bladeGroup.add(bladeMesh);

  sensorsGroup.add(bladeGroup);

  // FIA GPS Transponder Antenna (Mushroom dome)
  const gpsDomeGeo = new THREE.CylinderGeometry(0.12, 0.15, 0.08, 16);
  const gpsDomeMesh = new THREE.Mesh(gpsDomeGeo, materials.carbonMatte);
  gpsDomeMesh.position.set(9.4, 0, 4.58);
  sensorsGroup.add(gpsDomeMesh);

  // Vanity Cover / Access Hatch with 4x Camloc Fasteners
  // Covers damper/torsion bar maintenance hatch
  const hatchPlateGeo = new THREE.BoxGeometry(1.6, 2.2, 0.04);
  const hatchPlateMesh = new THREE.Mesh(hatchPlateGeo, materials.carbonSatin);
  hatchPlateMesh.position.set(7.9, 0, 4.42);
  sensorsGroup.add(hatchPlateMesh);

  // 4x Camloc 1/4-Turn Slotted Fasteners
  [
    { x: 7.25, y: -0.9 }, { x: 7.25, y: 0.9 },
    { x: 8.55, y: -0.9 }, { x: 8.55, y: 0.9 }
  ].forEach((hPos, idx) => {
    const camlocGroup = new THREE.Group();
    camlocGroup.position.set(hPos.x, hPos.y, 4.44);

    const camlocHeadGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.02, 16);
    const camlocHeadMesh = new THREE.Mesh(camlocHeadGeo, materials.titaniumBright);
    camlocGroup.add(camlocHeadMesh);

    // Screwdriver slot recess
    const slotGeo = new THREE.BoxGeometry(0.02, 0.08, 0.01);
    const slotMesh = new THREE.Mesh(slotGeo, materials.titaniumAnodized);
    slotMesh.position.z = 0.01;
    camlocGroup.add(slotMesh);

    camlocGroup.name = `Hatch_CamlocFastener_${idx}`;
    sensorsGroup.add(camlocGroup);
  });

  group.add(sensorsGroup);

  return group;
}
