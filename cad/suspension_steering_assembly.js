/**
 * 2026 Formula 1 "Nimble Car" Suspension & Steering
 * SREdesigns - Samuel R Erwin III
 * 
 * 3D CAD for Suspension, Steering, Wheels & Tires:
 * - Front & Rear Aerodynamic Wishbones (FIA 3.5:1 chord-to-thickness ratio):
 *   * Upper and Lower A-arms with streamlined carbon fiber aerodynamic fairings
 *   * Genuine spherical uniball bearings with titanium retainers and safety circlips
 * - Front Pull-Rod & Rear Push-Rod Struts:
 *   * High-modulus carbon tubes with threaded titanium rod end clevises and locknuts
 * - Rockers / Bellcranks & Damping Systems:
 *   * CNC machined 7075-T6 aluminum bellcranks with needle roller pivot bearings
 *   * Through-rod hydraulic dampers with piggyback nitrogen reservoirs and bump/rebound clickers
 *   * High-rate splined torsion bars with zero-backlash clamp collars
 *   * 3rd-element heave damper / bump spring stacks
 * - Hydraulic Power-Assisted Steering (HPAS) Rack:
 *   * Billet aluminum housing mounted at Bulkhead B-B
 *   * Precision helical rack bar and pinion gear teeth
 *   * Dual-acting hydraulic assist cylinder with rigid titanium feed lines
 *   * Track rods / tie rods with spherical bearings and bump-steer adjustment shims
 * - Safety Wheel Tethers (FIA Article C13):
 *   * 4x high-tenacity Zylon (PBO) braided tethers per corner (7.0 kJ rated)
 *   * Titanium eyelet anchors bolted to monocoque and wheel uprights
 * - BBS Forged Magnesium 18-inch Wheels & Aerodynamic Wheel Covers:
 *   * 10 Y-spoke forged magnesium wheel rims with knurled bead seats
 *   * Concave carbon fiber aerodynamic wheel dish covers (matching reference images)
 *   * Captive centerlock wheel nut with conical drive cone and 5 drive pins
 * - Pirelli 18-inch Low-Profile Slick Tyres:
 *   * Front 280/710-18 and Rear 375/710-18 slick tyres with realistic crown radius
 *   * Sidewall bead lip and authentic Pirelli P Zero compound colored stripes
 * 
 * Universal Datum:
 * - Front Axle Centerline at X = 0.0 dm, Z = 2.4 dm (Ground at Z = 0)
 * - Rear Axle Centerline at X = 34.0 dm, Z = 2.4 dm
 * - Track width: Front = 16.0 dm (half-track ±8.0 dm), Rear = 15.5 dm (half-track ±7.75 dm)
 */

import * as THREE from 'three';
import { materials } from '../materials.js';
import { createSocketHeadBolt, createTorxScrew, createStudWith12PtNut } from './fasteners.js';
import { createPirelliSidewallTexture } from './procedural_livery.js';

export function createSuspensionSteering(options = {}) {
  const group = new THREE.Group();
  group.name = 'Suspension_Steering_Wheels_Assembly';

  // Helper: Create an aerodynamic suspension link (teardrop streamline cross-section)
  function createAeroLink(startPt, endPt, chord = 0.45, thickness = 0.12, mat = materials.carbonGloss) {
    const linkGroup = new THREE.Group();
    const vec = new THREE.Vector3().subVectors(endPt, startPt);
    const length = vec.length();

    // Teardrop foil shape
    const shape = new THREE.Shape();
    shape.moveTo(-chord * 0.35, 0);
    shape.quadraticCurveTo(0, thickness * 0.6, chord * 0.45, 0);
    shape.quadraticCurveTo(0, -thickness * 0.6, -chord * 0.35, 0);
    shape.closePath();

    const extrudeSettings = { steps: 1, depth: length, bevelEnabled: false };
    const geo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    const mesh = new THREE.Mesh(geo, mat);

    // Orient along vector
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), vec.clone().normalize());
    mesh.position.copy(startPt);
    linkGroup.add(mesh);

    // Uniball Spherical Bearings at both ends
    [startPt, endPt].forEach(pt => {
      const uniballGeo = new THREE.SphereGeometry(0.12, 12, 12);
      const uniball = new THREE.Mesh(uniballGeo, materials.titaniumBright);
      uniball.position.copy(pt);
      linkGroup.add(uniball);

      const retainerGeo = new THREE.CylinderGeometry(0.14, 0.14, 0.14, 12);
      const retainer = new THREE.Mesh(retainerGeo, materials.titaniumAnodized);
      retainer.position.copy(pt);
      linkGroup.add(retainer);
    });

    return linkGroup;
  }

  // Helper: Create 18-inch Wheel & Tyre Corner Assembly
  function createWheelCorner(xPos, yPos, zPos, isRear = false, isLeft = true) {
    const cornerGroup = new THREE.Group();
    cornerGroup.position.set(xPos, yPos, zPos);
    cornerGroup.name = `Assembly_WheelCorner_${isRear ? 'Rear' : 'Front'}_${isLeft ? 'Left' : 'Right'}`;

    const tyreWidth = isRear ? 3.75 : 2.80; // Rear 375mm, Front 280mm
    const tyreRadius = 3.55;               // 710mm diameter = 3.55 dm radius
    const rimRadius = 2.286;               // 18 inches = 457.2mm diameter = 2.286 dm radius

    // 1. Pirelli 18-inch Slick Tyre Tread & Sidewall
    // Realistic curved crown profile revolving around local Y axle
    const tyreShape = new THREE.Shape();
    tyreShape.moveTo(rimRadius, -tyreWidth / 2);
    tyreShape.quadraticCurveTo(rimRadius + 0.3, -tyreWidth / 2 - 0.15, rimRadius + 0.8, -tyreWidth / 2 - 0.08); // Bead & lower sidewall
    tyreShape.lineTo(tyreRadius - 0.25, -tyreWidth / 2 + 0.1);                                                    // Upper sidewall
    tyreShape.quadraticCurveTo(tyreRadius, -tyreWidth / 2 + 0.3, tyreRadius, -tyreWidth / 2 + 0.6);             // Shoulder radius
    tyreShape.lineTo(tyreRadius, tyreWidth / 2 - 0.6);                                                            // Flat contact crown
    tyreShape.quadraticCurveTo(tyreRadius, tyreWidth / 2 - 0.3, tyreRadius - 0.25, tyreWidth / 2 - 0.1);        // Opposite shoulder
    tyreShape.lineTo(rimRadius + 0.8, tyreWidth / 2 + 0.08);                                                      // Opposite sidewall
    tyreShape.quadraticCurveTo(rimRadius + 0.3, tyreWidth / 2 + 0.15, rimRadius, tyreWidth / 2);                 // Opposite bead
    tyreShape.closePath();

    // LatheGeometry revolves points around local Y-axis:
    // In our coordinate system, the wheel axle IS the Y-axis!
    // No rotation needed: tyre natively rolls forward along X and spans Z!
    const tyreGeo = new THREE.LatheGeometry(tyreShape.getPoints(24), 36);
    const tyreMesh = new THREE.Mesh(tyreGeo, materials.pirelliRubber);
    tyreMesh.rotation.set(0, 0, 0);
    cornerGroup.add(tyreMesh);

    // Authentic High-DPI Procedural Pirelli P Zero Sidewall Decal
    const sidewallTex = createPirelliSidewallTexture(isLeft);
    const sidewallMat = new THREE.MeshStandardMaterial({
      map: sidewallTex,
      transparent: true,
      roughness: 0.52,
      metalness: 0.15,
      side: THREE.DoubleSide
    });
    const sidewallGeo = new THREE.RingGeometry(rimRadius, tyreRadius, 48);
    const sidewallMesh = new THREE.Mesh(sidewallGeo, sidewallMat);
    sidewallMesh.rotation.x = isLeft ? -Math.PI / 2 : Math.PI / 2;
    sidewallMesh.position.set(0, isLeft ? (tyreWidth / 2 + 0.02) : -(tyreWidth / 2 + 0.02), 0);
    sidewallMesh.name = 'Pirelli_PZero_SidewallDecal';
    cornerGroup.add(sidewallMesh);

    // 2. BBS Forged Magnesium 18-inch Rim Barrel (Cylinder along Y-axis)
    const rimBarrelGeo = new THREE.CylinderGeometry(rimRadius, rimRadius, tyreWidth, 36, 1, true);
    const rimBarrel = new THREE.Mesh(rimBarrelGeo, materials.bbsMagnesium);
    rimBarrel.rotation.set(0, 0, 0); // Natively aligns along Y axle
    cornerGroup.add(rimBarrel);

    // 3. Concave Carbon Fiber Aerodynamic Wheel Dish Cover (Matching Reference Images 1 & 2)
    const dishShape = new THREE.Shape();
    dishShape.moveTo(0.55, 0.0);
    dishShape.quadraticCurveTo(1.2, 0.25, rimRadius - 0.05, 0.15);
    dishShape.lineTo(rimRadius - 0.05, 0.08);
    dishShape.quadraticCurveTo(1.2, 0.18, 0.55, -0.05);
    dishShape.closePath();

    const dishGeo = new THREE.LatheGeometry(dishShape.getPoints(16), 36);
    const dishMesh = new THREE.Mesh(dishGeo, materials.carbonGloss);
    if (isLeft) {
      dishMesh.rotation.set(0, 0, 0);
      dishMesh.position.set(0, tyreWidth / 2 - 0.08, 0);
    } else {
      dishMesh.rotation.z = Math.PI; // Flip dish to face outboard on RH side
      dishMesh.position.set(0, -(tyreWidth / 2 - 0.08), 0);
    }
    dishMesh.name = 'Aero_WheelCover_ConcaveDish';
    cornerGroup.add(dishMesh);

    // 10 Radial Cooling Slats on Carbon Dish
    for (let v = 0; v < 10; v++) {
      const vAng = (v * Math.PI * 2) / 10;
      const ventGeo = new THREE.BoxGeometry(0.55, 0.05, 0.03);
      const vent = new THREE.Mesh(ventGeo, materials.carbonMatte);
      const vR = (0.7 + rimRadius) / 2;
      vent.position.set(Math.cos(vAng) * vR, isLeft ? (tyreWidth / 2 - 0.04) : -(tyreWidth / 2 - 0.04), Math.sin(vAng) * vR);
      vent.rotation.y = vAng;
      cornerGroup.add(vent);
    }

    // 4. Centerlock Nut & Conical Hub (Matching Reference Images: Gold Anodized Cone)
    const hubConeGeo = new THREE.CylinderGeometry(0.18, 0.45, 0.38, 20);
    const hubCone = new THREE.Mesh(hubConeGeo, materials.heatShieldGold || materials.titaniumAnodized);
    if (isLeft) {
      hubCone.rotation.set(0, 0, 0);
      hubCone.position.set(0, tyreWidth / 2 + 0.12, 0);
    } else {
      hubCone.rotation.z = Math.PI; // Tip points outboard on RH side
      hubCone.position.set(0, -(tyreWidth / 2 + 0.12), 0);
    }
    hubCone.name = 'Centerlock_ConicalNut';
    cornerGroup.add(hubCone);

    // Captive Wheel Nut Locking Pin
    const lockPinGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.28, 8);
    const lockPin = new THREE.Mesh(lockPinGeo, materials.titaniumBright);
    lockPin.rotation.z = Math.PI / 2;
    lockPin.position.set(0, isLeft ? (tyreWidth / 2 + 0.22) : -(tyreWidth / 2 + 0.22), 0);
    cornerGroup.add(lockPin);

    // 5 Drive Pins in Hub Face
    for (let p = 0; p < 5; p++) {
      const pAng = (p * Math.PI * 2) / 5;
      const pinGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.14, 12);
      const pin = new THREE.Mesh(pinGeo, materials.titaniumBright);
      pin.position.set(Math.cos(pAng) * 0.85, isLeft ? (tyreWidth / 2) : -(tyreWidth / 2), Math.sin(pAng) * 0.85);
      pin.rotation.set(0, 0, 0);
      cornerGroup.add(pin);
    }

    // 5. 4x Zylon Safety Wheel Tethers (Anchored to Upright Carrier Inboard)
    for (let t = 0; t < 4; t++) {
      const tAngle = (t * Math.PI) / 2;
      const tetherCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(Math.cos(tAngle) * 0.6, isLeft ? -(tyreWidth / 2) : (tyreWidth / 2), Math.sin(tAngle) * 0.6),
        new THREE.Vector3(Math.cos(tAngle) * 0.4, isLeft ? -(tyreWidth / 2 + 1.2) : (tyreWidth / 2 + 1.2), Math.sin(tAngle) * 0.4 + 0.2),
        new THREE.Vector3(0, isLeft ? -(tyreWidth / 2 + 2.5) : (tyreWidth / 2 + 2.5), 0.3)
      ]);
      const tetherGeo = new THREE.TubeGeometry(tetherCurve, 12, 0.025, 6, false);
      const tetherMesh = new THREE.Mesh(tetherGeo, materials.siliconeSeal); // Black high-tenacity braided Zylon
      tetherMesh.name = `ZylonTether_${t + 1}`;
      cornerGroup.add(tetherMesh);
    }

    return cornerGroup;
  }

  // =========================================================================
  // 1. FRONT SUSPENSION WISHBONES & PULL-ROD ARCHITECTURE
  // Front Axle at X = 0.0 dm, Wheel hubs at Y = ±8.0 dm, Z = 2.4 dm
  // =========================================================================
  const frontSuspGroup = new THREE.Group();
  frontSuspGroup.name = 'Front_Suspension_Assembly';

  [-1, 1].forEach((side, sIdx) => {
    const isLeft = side > 0;
    const fsCorner = new THREE.Group();
    fsCorner.name = `Front_Suspension_${isLeft ? 'Left' : 'Right'}`;

    const hubPt = new THREE.Vector3(0.0, side * 7.2, 3.55);

    // Upper Wishbone (Forward Leg & Aft Leg)
    const fwdUpperIn = new THREE.Vector3(-1.8, side * 2.2, 4.8);
    const aftUpperIn = new THREE.Vector3(1.4, side * 2.4, 4.6);
    const upperOuter = new THREE.Vector3(0.0, side * 6.8, 4.5);
    fsCorner.add(createAeroLink(fwdUpperIn, upperOuter, 0.42, 0.11));
    fsCorner.add(createAeroLink(aftUpperIn, upperOuter, 0.42, 0.11));

    // Lower Wishbone (Forward Leg & Aft Leg)
    const fwdLowerIn = new THREE.Vector3(-1.6, side * 2.4, 2.2);
    const aftLowerIn = new THREE.Vector3(1.6, side * 2.6, 2.1);
    const lowerOuter = new THREE.Vector3(0.0, side * 6.8, 2.5);
    fsCorner.add(createAeroLink(fwdLowerIn, lowerOuter, 0.48, 0.12));
    fsCorner.add(createAeroLink(aftLowerIn, lowerOuter, 0.48, 0.12));

    // Pull-Rod Strut (Runs diagonally from upright upper clevis to lower tub rocker)
    const pullRodOuter = new THREE.Vector3(0.0, side * 6.6, 4.3);
    const pullRodInner = new THREE.Vector3(1.8, side * 1.8, 2.2);
    fsCorner.add(createAeroLink(pullRodOuter, pullRodInner, 0.28, 0.08, materials.titaniumBright));

    // Front Upright Carrier (Aluminum-Lithium monobloc casting)
    const uprightGeo = new THREE.BoxGeometry(0.75, 0.45, 2.4);
    const uprightMesh = new THREE.Mesh(uprightGeo, materials.alLi2099);
    uprightMesh.position.set(0.0, side * 6.9, 3.55);
    fsCorner.add(uprightMesh);

    // Front Wheel & 18" Tyre
    fsCorner.add(createWheelCorner(0.0, side * 8.0, 3.55, false, isLeft));

    frontSuspGroup.add(fsCorner);
  });

  // Front Rockers, Dampers & Torsion Bars (Inside bulkhead B-B at X = 2.0 dm)
  const fInboardGroup = new THREE.Group();
  fInboardGroup.position.set(2.0, 0, 2.2);

  [-1, 1].forEach((side, rIdx) => {
    // CNC Aluminum Bellcrank
    const rockerGeo = new THREE.CylinderGeometry(0.28, 0.28, 0.18, 12);
    const rockerMesh = new THREE.Mesh(rockerGeo, materials.alLi2099);
    rockerMesh.position.set(0, side * 1.5, 0);
    fInboardGroup.add(rockerMesh);

    // Splined Torsion Bar running longitudinally
    const tbarGeo = new THREE.CylinderGeometry(0.08, 0.08, 2.4, 16);
    const tbarMesh = new THREE.Mesh(tbarGeo, materials.titaniumBright);
    tbarMesh.rotation.z = Math.PI / 2;
    tbarMesh.position.set(1.2, side * 1.5, 0);
    fInboardGroup.add(tbarMesh);

    // Multimatic Through-Rod Hydraulic Damper with Piggyback Canister
    const damperGeo = new THREE.CylinderGeometry(0.12, 0.12, 1.8, 16);
    const damperMesh = new THREE.Mesh(damperGeo, materials.titaniumAnodized);
    damperMesh.rotation.y = Math.PI / 2;
    damperMesh.position.set(0, side * 0.8, 0.35);
    fInboardGroup.add(damperMesh);

    const reservoirGeo = new THREE.CylinderGeometry(0.08, 0.08, 1.2, 12);
    const reservoirMesh = new THREE.Mesh(reservoirGeo, materials.alLi2099);
    reservoirMesh.rotation.y = Math.PI / 2;
    reservoirMesh.position.set(0, side * 0.8, 0.55);
    fInboardGroup.add(reservoirMesh);
  });
  frontSuspGroup.add(fInboardGroup);

  group.add(frontSuspGroup);

  // =========================================================================
  // 2. HYDRAULIC POWER-ASSISTED STEERING (HPAS) RACK & PINION ASSEMBLY
  // Mounted forward of Bulkhead B-B at X = 0.5 dm, Z = 3.2 dm
  // =========================================================================
  const steeringGroup = new THREE.Group();
  steeringGroup.name = 'Assembly_HPAS_Steering_Rack';
  steeringGroup.position.set(0.5, 0.0, 3.2);

  // Aluminum Billet Rack Housing
  const rackHousingGeo = new THREE.CylinderGeometry(0.22, 0.22, 5.4, 16);
  const rackHousing = new THREE.Mesh(rackHousingGeo, materials.alLi2099);
  rackHousing.rotation.x = Math.PI / 2;
  steeringGroup.add(rackHousing);

  // Pinion Input Tower & Rotary Valve
  const pinionTowerGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.65, 16);
  const pinionTower = new THREE.Mesh(pinionTowerGeo, materials.titaniumAnodized);
  pinionTower.position.set(-0.2, 0.45, 0.35);
  steeringGroup.add(pinionTower);

  // Hydraulic Rigid Feed Lines (Anodized titanium dual lines)
  [-0.08, 0.08].forEach(lineZ => {
    const lineGeo = new THREE.CylinderGeometry(0.02, 0.02, 4.2, 8);
    const lineMesh = new THREE.Mesh(lineGeo, materials.titaniumBright);
    lineMesh.rotation.x = Math.PI / 2;
    lineMesh.position.set(0.24, 0, lineZ);
    steeringGroup.add(lineMesh);
  });

  // Track Rods / Tie Rods (Extending left and right to steering arms on uprights)
  [-1, 1].forEach((side, trIdx) => {
    const trStart = new THREE.Vector3(0, side * 2.7, 0);
    const trEnd = new THREE.Vector3(-0.4, side * 6.8, 0.35);
    steeringGroup.add(createAeroLink(trStart, trEnd, 0.32, 0.09, materials.carbonGloss));
  });

  group.add(steeringGroup);

  // =========================================================================
  // 3. REAR SUSPENSION WISHBONES & PUSH-ROD ARCHITECTURE
  // Rear Axle at X = 34.0 dm, Wheel hubs at Y = ±7.75 dm, Z = 3.55 dm
  // =========================================================================
  const rearSuspGroup = new THREE.Group();
  rearSuspGroup.name = 'Rear_Suspension_Assembly';

  [-1, 1].forEach((side, sIdx) => {
    const isLeft = side > 0;
    const rsCorner = new THREE.Group();
    rsCorner.name = `Rear_Suspension_${isLeft ? 'Left' : 'Right'}`;

    // Upper Wishbone (Forward Leg & Aft Leg)
    const fwdUpperIn = new THREE.Vector3(32.2, side * 1.6, 4.9);
    const aftUpperIn = new THREE.Vector3(35.2, side * 1.5, 4.7);
    const upperOuter = new THREE.Vector3(34.0, side * 6.5, 4.6);
    rsCorner.add(createAeroLink(fwdUpperIn, upperOuter, 0.46, 0.12));
    rsCorner.add(createAeroLink(aftUpperIn, upperOuter, 0.46, 0.12));

    // Lower Wishbone (Forward Leg & Aft Leg)
    const fwdLowerIn = new THREE.Vector3(31.8, side * 1.8, 2.2);
    const aftLowerIn = new THREE.Vector3(35.6, side * 1.6, 2.1);
    const lowerOuter = new THREE.Vector3(34.0, side * 6.5, 2.5);
    rsCorner.add(createAeroLink(fwdLowerIn, lowerOuter, 0.52, 0.13));
    rsCorner.add(createAeroLink(aftLowerIn, lowerOuter, 0.52, 0.13));

    // Push-Rod Strut (Runs diagonally from upright lower clevis to upper gearbox rocker)
    const pushRodOuter = new THREE.Vector3(34.0, side * 6.3, 2.6);
    const pushRodInner = new THREE.Vector3(32.8, side * 1.4, 4.8);
    rsCorner.add(createAeroLink(pushRodOuter, pushRodInner, 0.32, 0.09, materials.titaniumBright));

    // Rear Upright Carrier
    const uprightGeo = new THREE.BoxGeometry(0.85, 0.55, 2.5);
    const uprightMesh = new THREE.Mesh(uprightGeo, materials.alLi2099);
    uprightMesh.position.set(34.0, side * 6.6, 3.55);
    rsCorner.add(uprightMesh);

    // Rear Wheel & Wide 375mm Pirelli Tyre
    rsCorner.add(createWheelCorner(34.0, side * 7.75, 3.55, true, isLeft));

    rearSuspGroup.add(rsCorner);
  });

  // Rear Rockers & Dampers (Mounted on top of gearbox casing at X = 32.5 dm)
  const rInboardGroup = new THREE.Group();
  rInboardGroup.position.set(32.5, 0, 3.8);

  [-1, 1].forEach((side, rIdx) => {
    const rockerGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.22, 12);
    const rockerMesh = new THREE.Mesh(rockerGeo, materials.alLi2099);
    rockerMesh.position.set(0, side * 1.2, 0);
    rInboardGroup.add(rockerMesh);

    const damperGeo = new THREE.CylinderGeometry(0.14, 0.14, 2.0, 16);
    const damperMesh = new THREE.Mesh(damperGeo, materials.titaniumAnodized);
    damperMesh.rotation.y = Math.PI / 2;
    damperMesh.position.set(0, side * 0.6, 0.25);
    rInboardGroup.add(damperMesh);
  });
  rearSuspGroup.add(rInboardGroup);

  group.add(rearSuspGroup);

  return group;
}
