/**
 * 2026 Formula 1 "Nimble Car" Cockpit Accessories & Driver
 * SREdesigns - Samuel R Erwin III
 * 
 * 3D CAD for Driver, Helmet, Mirrors, T-Cam, and Cockpit Accessories:
 * - Driver Helmet (FIA 8860-2018-ABP ballistic standard):
 *   * Contoured shell, chin spoiler, top cooling vents
 *   * Narrow 10mm visor aperture, dark polycarbonate visor, ballistic forehead strip
 *   * Visor pivot mechanisms with anodized aluminum hardware, tear-off posts
 *   * HANS anchor posts (M6 FIA 8858-2010 specification)
 * - Confor Foam Headrest:
 *   * Viscoelastic U-shaped surround with quick-release locating pins
 * - Rear-View Mirrors (MIRROR_SPEC, refs round3 R3 to R5):
 *   * Wide rounded pod with a thick carbon lip around recessed planar-reflector glass
 *   * Amber marshal LED block on the outboard front face, slim amber strip under the glass
 *   * Two thin curved aerofoil stalks (sidepod top and tub top) tied by a small aero vane
 * - FIA T-Camera Roll Hoop Pod:
 *   * Aerodynamic T-bar housing on the roll-hoop blade above the airbox
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
import { createDriverHelmet } from './driver_helmet.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { sweepGeometry } from './sweep_section.js';
import { AIRBOX_SPEC } from './active_wings_bodywork.js';

/** Mirror layout (car frame, dm, left side; right is mirrored). */
export const MIRROR_SPEC = {
  pod: { center: [14.0, 4.1, 5.58], depth: 0.52, span: 1.9, height: 0.68, radius: 0.16, lip: 0.07, recess: 0.06, toeIn: 0.1 },
  realReflection: true,           // planar Reflector glass; false falls back to an env-mapped chrome
  reflectorRes: [256, 96],
  leds: { rows: 2, cols: 6, blockSpan: 0.5 },
  stalkChord: 0.22, stalkThickness: 0.07,
  stalks: [
    { path: [[14.15, 4.55, 3.55], [14.15, 4.6, 4.2], [14.05, 4.5, 4.9], [14.0, 4.45, 5.3]] }, // sidepod top -> pod outer half
    { path: [[13.75, 3.0, 4.45], [13.85, 3.2, 4.85], [13.95, 3.5, 5.15], [14.0, 3.65, 5.32]] }, // tub top -> pod inner half
  ],
  vane: { path: [[13.95, 3.33, 5.0], [13.95, 3.9, 5.02], [13.95, 4.5, 5.02]], chord: 0.42, thickness: 0.04 }, // ties the two stalks together
};

export function createCockpitAccessories(options = {}) {
  const group = new THREE.Group();
  group.name = 'Cockpit_Accessories_Assembly';

  // =========================================================================
  // 1. DRIVER HELMET & HANS (data-driven, see cad/driver_helmet.js HELMET_SPEC)
  // Visor, peak, ballistic strip, visor pivots, chin vents, rear spoiler, HANS posts + yoke.
  // =========================================================================
  const driverGroup = createDriverHelmet(options.helmet);
  group.add(driverGroup);

  // =========================================================================
  // 2. CONFOR FOAM HEADREST SURROUND (Viscoelastic cockpit safety collar)
  // U-shaped energy-absorbing foam encircling the cockpit opening
  // =========================================================================
  const headrestGroup = new THREE.Group();
  headrestGroup.name = 'Cockpit_Headrest_Assembly';
  headrestGroup.position.set(14.6, 0, 4.25); // lies flat on the cockpit rim

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
  headrestMesh.rotation.set(0, 0, 0); // U-shape in XY plane, extruded up +Z
  headrestMesh.position.set(0, 0, 0);
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
  // 3. REAR-VIEW MIRRORS (MIRROR_SPEC, refs round3 R3 to R5)
  // Wide rounded pod, recessed reflective glass facing the driver, amber marshal LEDs,
  // two thin curved stalks (sidepod top and tub top) and a small aero vane between them.
  // =========================================================================
  const MS = MIRROR_SPEC;
  [-1, 1].forEach(side => {
    const sn = side > 0 ? 'L' : 'R';
    const mirrorAssembly = new THREE.Group();
    mirrorAssembly.name = `Assembly_Mirror_${side > 0 ? 'Left' : 'Right'}`;
    const [px, py, pz] = MS.pod.center;
    const pod = new THREE.Group();
    pod.name = `Mirror_Pod_${sn}`;
    pod.position.set(px, side * py, pz);
    pod.rotation.z = -side * MS.pod.toeIn; // glass turned slightly toward the driver
    mirrorAssembly.add(pod);

    const { depth: D, span: S, height: Hh, radius: R } = MS.pod;
    // Pod body: rounded box (x = depth, y = span, z = height)
    const body = new THREE.Mesh(new RoundedBoxGeometry(D, S, Hh, 5, R), materials.liveryPaint || materials.carbonGloss);
    body.name = `Mirror_Shell_${sn}`;
    body.castShadow = true;
    pod.add(body);
    // Thick rear lip that frames the recessed glass
    const rr = (w, h, r) => { const sh = new THREE.Shape(); const x0 = -w / 2, y0 = -h / 2;
      sh.moveTo(x0 + r, y0); sh.lineTo(x0 + w - r, y0); sh.quadraticCurveTo(x0 + w, y0, x0 + w, y0 + r);
      sh.lineTo(x0 + w, y0 + h - r); sh.quadraticCurveTo(x0 + w, y0 + h, x0 + w - r, y0 + h);
      sh.lineTo(x0 + r, y0 + h); sh.quadraticCurveTo(x0, y0 + h, x0, y0 + h - r);
      sh.lineTo(x0, y0 + r); sh.quadraticCurveTo(x0, y0, x0 + r, y0); return sh; };
    const lipShape = rr(S - 0.02, Hh - 0.02, R * 0.9);
    lipShape.holes.push(rr(S - 2 * MS.pod.lip, Hh - 2 * MS.pod.lip, R * 0.6));
    const lipGeo = new THREE.ExtrudeGeometry(lipShape, { depth: MS.pod.recess, bevelEnabled: true, bevelThickness: 0.015, bevelSize: 0.015, bevelSegments: 2, curveSegments: 6 });
    lipGeo.rotateY(Math.PI / 2); // extrude -> +X (rearward)
    lipGeo.rotateX(Math.PI / 2); // shape x -> Y (span), shape y -> Z (height)
    const lip = new THREE.Mesh(lipGeo, materials.carbonGloss);
    lip.name = `Mirror_GlassLip_${sn}`;
    lip.position.x = D / 2 - 0.02;
    pod.add(lip);
    // Recessed glass on the rear face: real planar reflection when available
    const gw = S - 2 * MS.pod.lip - 0.02, gh = Hh - 2 * MS.pod.lip - 0.02;
    let glass;
    if (MS.realReflection && Reflector) {
      glass = new Reflector(new THREE.PlaneGeometry(gw, gh), { textureWidth: MS.reflectorRes[0], textureHeight: MS.reflectorRes[1], color: 0x9aa3ad, clipBias: 0.003 });
    } else {
      glass = new THREE.Mesh(new THREE.PlaneGeometry(gw, gh), materials.mirrorGlass);
    }
    // plane normal +X (rearward), long side along Y, short side along Z
    glass.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 1), new THREE.Vector3(1, 0, 0)));
    glass.position.x = D / 2 + 0.005;
    glass.name = `Mirror_Glass_${sn}`;
    pod.add(glass);
    // Amber marshal LED block on the outboard end of the front face (as on the reference cars)
    const ledGroup = new THREE.Group();
    ledGroup.name = `Mirror_MarshalLEDArray_${sn}`;
    const bez = new THREE.Mesh(new THREE.BoxGeometry(0.02, MS.leds.blockSpan, Hh * 0.62), materials.carbonMatte);
    ledGroup.add(bez);
    const ledGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.02, 10);
    for (let r = 0; r < MS.leds.rows; r++) for (let c = 0; c < MS.leds.cols; c++) {
      const led = new THREE.Mesh(ledGeo, materials.ledAmber);
      led.rotation.z = Math.PI / 2;
      led.position.set(-0.012, (c - (MS.leds.cols - 1) / 2) * MS.leds.blockSpan / MS.leds.cols, (r - (MS.leds.rows - 1) / 2) * 0.08);
      led.name = `LED_${r}_${c}`;
      ledGroup.add(led);
    }
    ledGroup.position.set(-D / 2 - 0.005, side * (S / 2 - R - MS.leds.blockSpan / 2), 0);
    pod.add(ledGroup);
    // Slim amber strip along the bottom of the rear face, under the glass
    const strip = new THREE.Mesh(new RoundedBoxGeometry(0.03, S * 0.7, 0.035, 2, 0.012), materials.ledAmber);
    strip.name = `Mirror_RearLEDStrip_${sn}`;
    strip.position.set(D / 2 + 0.02, 0, -Hh / 2 + MS.pod.lip * 0.5);
    pod.add(strip);

    // Two thin curved aerofoil stalks: one from the sidepod top, one from the tub top
    const toWorld = (p) => [p[0], side * p[1], p[2]];
    MS.stalks.forEach((st, k) => {
      const g = sweepGeometry(st.path.map(toWorld), () => MS.stalkChord, () => MS.stalkThickness,
        { samples: 28, ring: 14, n: 2.2, lead: 0.3, widthHint: () => new THREE.Vector3(1, 0, 0) });
      const m = new THREE.Mesh(g, materials.carbonGloss);
      m.name = `Mirror_Stalk_${sn}_${k ? 'Tub' : 'Sidepod'}`;
      m.castShadow = true;
      mirrorAssembly.add(m);
    });
    // Small flat aero vane between the stalks, under the pod
    const V = MS.vane;
    const vg = sweepGeometry(V.path.map(toWorld), () => V.chord, () => V.thickness,
      { samples: 12, ring: 14, n: 2.2, lead: 0.4, widthHint: () => new THREE.Vector3(-1, 0, -0.12) });
    const vane = new THREE.Mesh(vg, materials.carbonGloss);
    vane.name = `Mirror_AeroWinglet_${sn}`;
    mirrorAssembly.add(vane);

    group.add(mirrorAssembly);
  });

  // =========================================================================
  // 4. FIA T-CAMERA ROLL HOOP POD (Mounted on Roll Hoop Airbox Peak)
  // X = 17.4 dm, Y = 0.0 dm, Z = 9.65 dm (on top of the roll-hoop airbox)
  // Standardized housing with forward and rearward facing cameras
  // =========================================================================
  const tCamGroup = new THREE.Group();
  tCamGroup.name = 'Assembly_FIA_T_Camera';
  tCamGroup.position.set(17.3, 0, AIRBOX_SPEC.tCamZ); // on top of the roll-hoop blade above the airbox

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
  pitotGroup.position.set(7.2, 0, 5.22); // on tub top skin

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
  bladeGroup.position.set(8.5, 0, 4.82);

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
  bladeMesh.rotation.x = Math.PI / 2; // stand the blade up (it used to lie flat, floating over the tub)
  bladeMesh.position.z = 0.35;
  bladeMesh.name = 'Antenna_UHF_Blade';
  bladeGroup.add(bladeMesh);

  sensorsGroup.add(bladeGroup);

  // FIA GPS Transponder Antenna (Mushroom dome)
  const gpsDomeGeo = new THREE.CylinderGeometry(0.12, 0.15, 0.08, 16);
  const gpsDomeMesh = new THREE.Mesh(gpsDomeGeo, materials.carbonMatte);
  gpsDomeMesh.position.set(9.4, 0, 4.6);
  sensorsGroup.add(gpsDomeMesh);

  // Vanity Cover / Access Hatch with 4x Camloc Fasteners
  // Covers damper/torsion bar maintenance hatch
  const hatchPlateGeo = new THREE.BoxGeometry(1.6, 2.2, 0.04);
  const hatchPlateMesh = new THREE.Mesh(hatchPlateGeo, materials.carbonSatin);
  hatchPlateMesh.position.set(7.9, 0, 5.0);
  hatchPlateMesh.rotation.y = 0.21; // follow tub top slope (5.2 @ X7.2 -> 4.5 @ X10.5)
  sensorsGroup.add(hatchPlateMesh);

  // 4x Camloc 1/4-Turn Slotted Fasteners
  [
    { x: 7.25, y: -0.9 }, { x: 7.25, y: 0.9 },
    { x: 8.55, y: -0.9 }, { x: 8.55, y: 0.9 }
  ].forEach((hPos, idx) => {
    const camlocGroup = new THREE.Group();
    camlocGroup.position.set(hPos.x, hPos.y, 5.02 - (hPos.x - 7.9) * 0.213);
    camlocGroup.rotation.y = 0.21;

    const camlocHeadGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.02, 16);
    const camlocHeadMesh = new THREE.Mesh(camlocHeadGeo, materials.titaniumBright);
    camlocHeadMesh.rotation.x = Math.PI / 2; // flat on the hatch (cylinder axis was sideways)
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
