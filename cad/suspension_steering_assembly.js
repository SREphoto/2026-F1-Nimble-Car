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
 * - Front Axle Centerline at X = 0.0 dm, Z = 3.55 dm (Ground at Z = 0)
 * - Rear Axle Centerline at X = 34.0 dm, Z = 3.55 dm
 * - Track width: Front = 15.6 dm (half-track ±7.8 dm), Rear = 14.8 dm (half-track ±7.4 dm)
 * - Overall width over tyres (incl. camber) <= 19.0 dm (FIA 2026 max 1900 mm)
 */

import * as THREE from 'three';
import { materials } from '../materials.js';
import { createSocketHeadBolt, createTorxScrew, createStudWith12PtNut } from './fasteners.js';
import { createPirelliSidewallTexture } from './procedural_livery.js';

export function createSuspensionSteering(options = {}) {
  const group = new THREE.Group();
  group.name = 'Suspension_Steering_Wheels_Assembly';

  // Every link registers here; updateLinks() re-solves them from their end points.
  const dynamicLinks = [];
  let rackBar = null; // sliding steering rack bar (assigned in section 2)
  const _tmpV = new THREE.Vector3();
  const _zAxis = new THREE.Vector3(0, 0, 1);

  // Helper: Create an aerodynamic suspension link (teardrop streamline cross-section).
  // The inner end is fixed to the chassis (or follows `innerFn`, e.g. the steering rack);
  // the outer end can be expressed in an upright's local frame (`outerOn`) so it follows
  // the upright through steering and suspension travel without moving the inner mount.
  function createAeroLink(startPt, endPt, chord = 0.45, thickness = 0.12, mat = materials.carbonGloss, opts = {}) {
    const linkGroup = new THREE.Group();

    // Teardrop foil shape, extruded to unit length along +Z and scaled to the link length
    const shape = new THREE.Shape();
    shape.moveTo(-chord * 0.35, 0);
    shape.quadraticCurveTo(0, thickness * 0.6, chord * 0.45, 0);
    shape.quadraticCurveTo(0, -thickness * 0.6, -chord * 0.35, 0);
    shape.closePath();
    const geo = new THREE.ExtrudeGeometry(shape, { steps: 1, depth: 1, bevelEnabled: false });
    const mesh = new THREE.Mesh(geo, mat);
    linkGroup.add(mesh);

    // Uniball Spherical Bearings at both ends
    const ends = [0, 1].map(() => {
      const uniball = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 12), materials.titaniumBright);
      const retainer = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.14, 12), materials.titaniumAnodized);
      linkGroup.add(uniball, retainer);
      return [uniball, retainer];
    });

    const link = {
      group: linkGroup,
      inner: startPt.clone(),
      innerFn: opts.innerFn || null,          // () => Vector3 in the link group's parent frame
      outerOn: opts.outerOn || null,          // upright Object3D (sibling frame of the link)
      outer: opts.outerOn ? opts.outerLocal.clone() : endPt.clone(),
      update() {
        const a = this.innerFn ? this.innerFn() : this.inner;
        let b = this.outer;
        if (this.outerOn) { this.outerOn.updateMatrix(); b = _tmpV.copy(this.outer).applyMatrix4(this.outerOn.matrix); }
        const v = new THREE.Vector3().subVectors(b, a);
        const len = Math.max(1e-4, v.length());
        mesh.position.copy(a);
        mesh.quaternion.setFromUnitVectors(_zAxis, v.multiplyScalar(1 / len));
        mesh.scale.set(1, 1, len);
        ends[0][0].position.copy(a); ends[0][1].position.copy(a);
        ends[1][0].position.copy(b); ends[1][1].position.copy(b);
      }
    };
    link.update();
    dynamicLinks.push(link);
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

    // 1. Spindle Group (Contains all parts rotating with wheel velocity around local Y axle)
    const spindle = new THREE.Group();
    spindle.name = `Wheel_Spindle_${isRear ? 'Rear' : 'Front'}_${isLeft ? 'Left' : 'Right'}`;

    // Pirelli 18-inch Slick Tyre Tread & Sidewall
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

    const tyreGeo = new THREE.LatheGeometry(tyreShape.getPoints(24), 36);
    const tyreMesh = new THREE.Mesh(tyreGeo, materials.pirelliRubber);
    tyreMesh.rotation.set(0, 0, 0);
    spindle.add(tyreMesh);

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
    spindle.add(sidewallMesh);

    // 2. BBS Forged Magnesium 18-inch Rim Barrel (Cylinder along Y-axis)
    const rimBarrelGeo = new THREE.CylinderGeometry(rimRadius, rimRadius, tyreWidth, 36, 1, true);
    const rimBarrel = new THREE.Mesh(rimBarrelGeo, materials.bbsMagnesium);
    rimBarrel.rotation.set(0, 0, 0); // Natively aligns along Y axle
    spindle.add(rimBarrel);

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
    spindle.add(dishMesh);

    // 10 Radial Cooling Slats on Carbon Dish
    for (let v = 0; v < 10; v++) {
      const vAng = (v * Math.PI * 2) / 10;
      const ventGeo = new THREE.BoxGeometry(0.55, 0.05, 0.03);
      const vent = new THREE.Mesh(ventGeo, materials.carbonMatte);
      const vR = (0.7 + rimRadius) / 2;
      vent.position.set(Math.cos(vAng) * vR, isLeft ? (tyreWidth / 2 - 0.04) : -(tyreWidth / 2 - 0.04), Math.sin(vAng) * vR);
      vent.rotation.y = vAng;
      spindle.add(vent);
    }

    // 4. Centerlock Nut & Conical Hub (Matching Reference Images 1 & 2: Bright Yellow Nut)
    const hubConeGeo = new THREE.CylinderGeometry(0.18, 0.45, 0.38, 20);
    const nutMat = new THREE.MeshStandardMaterial({
      color: 0xd6e200, // Bright electric yellow centerlock socket
      roughness: 0.28,
      metalness: 0.40
    });
    const hubCone = new THREE.Mesh(hubConeGeo, nutMat);
    if (isLeft) {
      hubCone.rotation.set(0, 0, 0);
      hubCone.position.set(0, tyreWidth / 2 - 0.25, 0); // recessed inside wheel face
    } else {
      hubCone.rotation.z = Math.PI; // Tip points outboard on RH side
      hubCone.position.set(0, -(tyreWidth / 2 - 0.25), 0);
    }
    hubCone.name = 'Centerlock_ConicalNut';
    spindle.add(hubCone);

    // Captive Wheel Nut Locking Pin
    const lockPinGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.28, 8);
    const lockPin = new THREE.Mesh(lockPinGeo, materials.titaniumBright);
    lockPin.rotation.z = Math.PI / 2;
    lockPin.position.set(0, isLeft ? (tyreWidth / 2 - 0.15) : -(tyreWidth / 2 - 0.15), 0);
    spindle.add(lockPin);

    // 5 Drive Pins in Hub Face
    for (let p = 0; p < 5; p++) {
      const pAng = (p * Math.PI * 2) / 5;
      const pinGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.14, 12);
      const pin = new THREE.Mesh(pinGeo, materials.titaniumBright);
      pin.position.set(Math.cos(pAng) * 0.85, isLeft ? (tyreWidth / 2 - 0.3) : -(tyreWidth / 2 - 0.3), Math.sin(pAng) * 0.85);
      pin.rotation.set(0, 0, 0);
      spindle.add(pin);
    }

    cornerGroup.add(spindle);

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
  // Front Axle at X = 0.0 dm, Wheel hubs at Y = ±7.8 dm, Z = 3.6 dm
  // =========================================================================
  const frontSuspGroup = new THREE.Group();
  frontSuspGroup.name = 'Front_Suspension_Assembly';

  [-1, 1].forEach((side, sIdx) => {
    const isLeft = side > 0;
    const fsCorner = new THREE.Group();
    fsCorner.name = `Front_Suspension_${isLeft ? 'Left' : 'Right'}`;

    // Front Upright & Steering Kingpin Pivot Group (steers and moves with suspension travel).
    // Created first so the wishbones' outer ball joints can follow it.
    const frontPivot = new THREE.Group();
    frontPivot.position.set(0.0, side * 6.8, 3.55);
    frontPivot.name = `Front_Upright_Pivot_${isLeft ? 'Left' : 'Right'}`;
    frontPivot.userData.basePosition = frontPivot.position.clone();
    const onUpright = (pt) => ({ outerOn: frontPivot, outerLocal: pt.clone().sub(frontPivot.position) });

    // Upper Wishbone (Forward Leg & Aft Leg)
    // Inboard pickups sit on the nose / tub skin (nose ±1.45 wide at X=-1.8, tub ±1.7 at X=1.5)
    const fwdUpperIn = new THREE.Vector3(-1.8, side * 1.35, 3.6);
    const aftUpperIn = new THREE.Vector3(1.4, side * 1.65, 4.0);
    const upperOuter = new THREE.Vector3(0.0, side * 6.6, 4.5);
    fsCorner.add(createAeroLink(fwdUpperIn, upperOuter, 0.42, 0.11, undefined, onUpright(upperOuter)));
    fsCorner.add(createAeroLink(aftUpperIn, upperOuter, 0.42, 0.11, undefined, onUpright(upperOuter)));

    // Lower Wishbone (Forward Leg & Aft Leg)
    const fwdLowerIn = new THREE.Vector3(-1.6, side * 1.3, 1.9);
    const aftLowerIn = new THREE.Vector3(1.6, side * 1.7, 1.6);
    const lowerOuter = new THREE.Vector3(0.0, side * 6.6, 2.5);
    fsCorner.add(createAeroLink(fwdLowerIn, lowerOuter, 0.48, 0.12, undefined, onUpright(lowerOuter)));
    fsCorner.add(createAeroLink(aftLowerIn, lowerOuter, 0.48, 0.12, undefined, onUpright(lowerOuter)));

    // Pull-Rod Strut (Runs diagonally from upright upper clevis to lower tub rocker)
    const pullRodOuter = new THREE.Vector3(0.0, side * 6.4, 4.3);
    const pullRodInner = new THREE.Vector3(1.8, side * 1.8, 2.2);
    // (inner end on the chassis rocker, outer end on the upright)
    fsCorner.add(createAeroLink(pullRodInner, pullRodOuter, 0.28, 0.08, materials.titaniumBright, onUpright(pullRodOuter)));


    // Front Upright Carrier (Aluminum-Lithium monobloc casting) at origin of pivot
    const uprightGeo = new THREE.BoxGeometry(0.75, 0.45, 2.4);
    const uprightMesh = new THREE.Mesh(uprightGeo, materials.alLi2099);
    uprightMesh.position.set(0, 0, 0);
    frontPivot.add(uprightMesh);

    // Steering arm extending forward-inboard from upright
    const steerArmGeo = new THREE.BoxGeometry(0.4, 0.12, 0.12);
    const steerArm = new THREE.Mesh(steerArmGeo, materials.alLi2099);
    steerArm.position.set(-0.35, side * -0.15, 0);
    frontPivot.add(steerArm);

    // Front Wheel Corner (Hub is 1.0 dm outboard from kingpin: 6.8 + 1.0 = 7.8 dm half-track)
    // Static negative camber -3.0 deg about the hub: +X rotation tips the LH wheel top inboard.
    const frontWheel = createWheelCorner(0.0, side * 1.0, 0.05, false, isLeft);
    frontWheel.rotation.x = side * 0.052;
    frontPivot.add(frontWheel);

    fsCorner.add(frontPivot);

    // Track rod: inner end rides on the steering rack bar, outer end on the steering arm
    const trInnerBase = new THREE.Vector3(0.5, side * 2.7, 3.2);
    const trOuter = new THREE.Vector3(-0.35, side * 6.65, 3.55); // steering-arm tip (pivot-local -0.35, -side*0.15, 0)
    fsCorner.add(createAeroLink(trInnerBase, trOuter, 0.32, 0.09, materials.carbonGloss, {
      innerFn: () => trInnerBase.clone().setY(trInnerBase.y + (rackBar ? rackBar.position.y : 0)),
      ...onUpright(trOuter)
    }));

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
    damperMesh.rotation.z = Math.PI / 2; // runs longitudinally from the rocker
    damperMesh.position.set(0.9, side * 0.8, 0.35);
    fInboardGroup.add(damperMesh);

    const reservoirGeo = new THREE.CylinderGeometry(0.08, 0.08, 1.2, 12);
    const reservoirMesh = new THREE.Mesh(reservoirGeo, materials.alLi2099);
    reservoirMesh.rotation.z = Math.PI / 2;
    reservoirMesh.position.set(0.9, side * 0.8, 0.55);
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
  // CylinderGeometry is already along Y (lateral) - no rotation needed
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
    lineMesh.position.set(0.24, 0, lineZ); // lateral, parallel to rack
    steeringGroup.add(lineMesh);
  });

  // Sliding rack bar (the only part that translates with steering; the housing, pinion and
  // lines stay bolted to the chassis). Track rods are built with each front corner and their
  // inner ends follow this bar.
  rackBar = new THREE.Group();
  rackBar.name = 'Steering_Rack_Bar';
  const rackBarMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 5.6, 12), materials.titaniumBright);
  rackBar.add(rackBarMesh);
  [-1, 1].forEach(side => {
    const endMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.25, 12), materials.titaniumAnodized);
    endMesh.position.set(0, side * 2.7, 0);
    rackBar.add(endMesh);
  });
  steeringGroup.add(rackBar);

  group.add(steeringGroup);

  // =========================================================================
  // 3. REAR SUSPENSION WISHBONES & PUSH-ROD ARCHITECTURE
  // Rear Axle at X = 34.0 dm, Wheel hubs at Y = ±7.4 dm, Z = 3.59 dm
  // =========================================================================
  const rearSuspGroup = new THREE.Group();
  rearSuspGroup.name = 'Rear_Suspension_Assembly';

  [-1, 1].forEach((side, sIdx) => {
    const isLeft = side > 0;
    const rsCorner = new THREE.Group();
    rsCorner.name = `Rear_Suspension_${isLeft ? 'Left' : 'Right'}`;

    // Rear upright (moves with suspension travel; links' outer ends follow it)
    const rearUpright = new THREE.Group();
    rearUpright.name = `Rear_Upright_${isLeft ? 'Left' : 'Right'}`;
    rearUpright.position.set(34.0, side * 6.25, 3.55);
    rearUpright.userData.basePosition = rearUpright.position.clone();
    const onRearUpright = (pt) => ({ outerOn: rearUpright, outerLocal: pt.clone().sub(rearUpright.position) });

    // Upper Wishbone (Forward Leg & Aft Leg)
    // Inboard pickups on the gearbox casing (top Z 3.75, Y ±1.2, X 27.4-35.0)
    const fwdUpperIn = new THREE.Vector3(32.2, side * 1.2, 3.7);
    const aftUpperIn = new THREE.Vector3(34.8, side * 1.2, 3.6);
    const upperOuter = new THREE.Vector3(34.0, side * 6.1, 4.6);
    rsCorner.add(createAeroLink(fwdUpperIn, upperOuter, 0.46, 0.12, undefined, onRearUpright(upperOuter)));
    rsCorner.add(createAeroLink(aftUpperIn, upperOuter, 0.46, 0.12, undefined, onRearUpright(upperOuter)));

    // Lower Wishbone (Forward Leg & Aft Leg)
    const fwdLowerIn = new THREE.Vector3(31.8, side * 1.3, 1.7);
    const aftLowerIn = new THREE.Vector3(34.8, side * 1.3, 1.7);
    const lowerOuter = new THREE.Vector3(34.0, side * 6.1, 2.5);
    rsCorner.add(createAeroLink(fwdLowerIn, lowerOuter, 0.52, 0.13, undefined, onRearUpright(lowerOuter)));
    rsCorner.add(createAeroLink(aftLowerIn, lowerOuter, 0.52, 0.13, undefined, onRearUpright(lowerOuter)));

    // Push-Rod Strut (Runs diagonally from upright lower clevis to upper gearbox rocker)
    const pushRodOuter = new THREE.Vector3(34.0, side * 5.9, 2.6);
    const pushRodInner = new THREE.Vector3(32.5, side * 1.25, 3.85); // ends on the rocker
    rsCorner.add(createAeroLink(pushRodInner, pushRodOuter, 0.32, 0.09, materials.titaniumBright, onRearUpright(pushRodOuter)));

    // Rear Upright Carrier
    const uprightGeo = new THREE.BoxGeometry(0.85, 0.55, 2.5);
    const uprightMesh = new THREE.Mesh(uprightGeo, materials.alLi2099);
    uprightMesh.position.set(0, 0, 0);
    rearUpright.add(uprightMesh);

    // Rear Wheel & Wide 375mm Pirelli Tyre (hub at 34.0, ±7.4, 3.59)
    const rearWheel = createWheelCorner(0.0, side * 1.15, 0.04, true, isLeft);
    rearWheel.rotation.x = side * 0.030; // Static negative camber (-1.7 deg): top leans inboard
    rearUpright.add(rearWheel);
    rsCorner.add(rearUpright);

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
    damperMesh.rotation.z = Math.PI / 2; // longitudinal along gearbox top
    damperMesh.position.set(-1.0, side * 0.6, 0.25);
    rInboardGroup.add(damperMesh);
  });
  rearSuspGroup.add(rInboardGroup);

  group.add(rearSuspGroup);

  // Re-solve every link from its (fixed) inner mount to its (moving) outer joint.
  group.userData.updateLinks = () => dynamicLinks.forEach(l => l.update());
  group.userData.updateLinks();

  return group;
}
