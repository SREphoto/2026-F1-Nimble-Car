/**
 * cad/pit_stop_crew.js — 2026 Formula 1 Pit Stop Infrastructure & 3D Human Crew
 * SREdesigns - Samuel R Erwin III
 * 
 * Exhaustive Procedural Formula 1 Pit Stop Simulation:
 * 1. 3D Human Pit Crew (18 Articulated Figures in FIA Fireproof Nomex Overalls):
 *    - 4x Wheel Gunners (crouched on one knee with Paoli DP6000 pneumatic impact guns)
 *    - 4x Tyre-Off Mechanics (wide athletic stance, arms outstretched to receive hot tyres)
 *    - 4x Tyre-On Mechanics (braced stance cradling 18" fresh Pirelli tyres)
 *    - 1x Front Jack Man (operating quick-release dual-wheel pivot lever jack)
 *    - 1x Rear Jack Man (operating tubular rear cradle jack behind the diffuser)
 *    - 2x Sidepod Stabilizers (braced at cockpit flanks to steady the car)
 *    - 2x Front Wing Flap Adjusters (kneeling at wing endplates with speed screwdrivers)
 * 
 * 2. Crew Anatomical Details:
 *    - FIA 8860-2018 ballistic pit helmets with dark polycarbonate visors and radio headsets
 *    - Tailored fireproof Nomex race suits with contrast shoulder epaulettes and piping
 *    - Articulated upper/lower arms, mechanic grip gloves, and protective knee pads
 *    - Reinforced high-traction pit boots
 * 
 * 3. Pit Hardware & Infrastructure:
 *    - Overhead Cantilevered Gantry Boom extending 7.5m over the pit box
 *    - Pit Traffic Light Pod (Red holding LEDs / Green launch cluster)
 *    - Coiled high-pressure pneumatic airlines descending to each wheel station
 *    - Overhead LED work spotlights illuminating the pit box
 *    - Front quick-release lever jack and rear wishbone cradle jack
 *    - Tyre warming racks with Pirelli thermal blankets (Soft, Medium, Hard)
 * 
 * Datum & Scale:
 * - Decimetres (DM = 10 scene units per metre), matching car and track datum.
 * - Car center datum: [0, 0, 0] on tarmac; +X forward (towards pit exit), +Y left, +Z up.
 */

import * as THREE from 'three';
import { materials as defaultMaterials } from '../materials.js';
import { F1_TEAMS } from '../teams.js';

// =========================================================================
// 1. Crew Material Factory (Dynamic Team Livery Integration)
// =========================================================================
export function createCrewMaterials(teamId = 'red-bull') {
  const team = F1_TEAMS[teamId] || F1_TEAMS['red-bull'];
  const primaryHex = team.bodyColor ?? 0x18245e;
  const accentHex = team.accentColor ?? 0xd0021b;
  const darkHex = team.amberColor ?? 0x111317;

  return {
    suitPrimary: new THREE.MeshStandardMaterial({
      color: primaryHex,
      roughness: 0.72,
      metalness: 0.08,
      name: 'Crew_Nomex_Primary'
    }),
    suitAccent: new THREE.MeshStandardMaterial({
      color: accentHex,
      roughness: 0.65,
      metalness: 0.12,
      name: 'Crew_Nomex_Accent'
    }),
    suitDark: new THREE.MeshStandardMaterial({
      color: darkHex,
      roughness: 0.80,
      metalness: 0.05,
      name: 'Crew_Nomex_Dark'
    }),
    helmetShell: new THREE.MeshStandardMaterial({
      color: primaryHex,
      roughness: 0.35,
      metalness: 0.20,
      name: 'Crew_Helmet_Shell'
    }),
    helmetVisor: new THREE.MeshPhysicalMaterial({
      color: 0x0a0c10,
      roughness: 0.10,
      metalness: 0.85,
      clearcoat: 1.0,
      clearcoatRoughness: 0.05,
      name: 'Crew_Helmet_Visor'
    }),
    gloves: new THREE.MeshStandardMaterial({
      color: 0x22262c,
      roughness: 0.85,
      metalness: 0.05,
      name: 'Crew_Gloves'
    }),
    boots: new THREE.MeshStandardMaterial({
      color: 0x121417,
      roughness: 0.90,
      metalness: 0.05,
      name: 'Crew_Boots'
    }),
    kneePads: new THREE.MeshStandardMaterial({
      color: 0x282c34,
      roughness: 0.50,
      metalness: 0.15,
      name: 'Crew_KneePads'
    }),
    hardwareSteel: new THREE.MeshStandardMaterial({
      color: 0x8a929e,
      roughness: 0.35,
      metalness: 0.85,
      name: 'Crew_Hardware_Steel'
    }),
    hardwareCarbon: new THREE.MeshStandardMaterial({
      color: 0x1e2126,
      roughness: 0.45,
      metalness: 0.10,
      name: 'Crew_Hardware_Carbon'
    }),
    gunPneumatic: new THREE.MeshStandardMaterial({
      color: 0x2a303c,
      roughness: 0.30,
      metalness: 0.75,
      name: 'Paoli_Gun_Body'
    }),
    airlineHose: new THREE.MeshStandardMaterial({
      color: 0x0092d0, // Paoli pneumatic blue
      roughness: 0.40,
      metalness: 0.15,
      name: 'Paoli_Airline_Hose'
    }),
    pirelliTread: new THREE.MeshStandardMaterial({
      color: 0x1a1b1e,
      roughness: 0.88,
      metalness: 0.0,
      name: 'Crew_Pirelli_Tread'
    }),
    pirelliRim: new THREE.MeshStandardMaterial({
      color: 0x15171a,
      roughness: 0.35,
      metalness: 0.85,
      name: 'Crew_Pirelli_Rim'
    }),
    pirelliStripeSoft: new THREE.MeshBasicMaterial({ color: 0xd90429 }),
    pirelliStripeMedium: new THREE.MeshBasicMaterial({ color: 0xf6c200 }),
    pirelliStripeHard: new THREE.MeshBasicMaterial({ color: 0xffffff }),
    lightRed: new THREE.MeshBasicMaterial({ color: 0xff1020 }),
    lightGreen: new THREE.MeshBasicMaterial({ color: 0x10ff40 }),
    lightOff: new THREE.MeshBasicMaterial({ color: 0x222222 }),
    floodLight: new THREE.MeshBasicMaterial({ color: 0xfff4e0 })
  };
}

// =========================================================================
// 2. Anatomical Human Crew Member Generator
// =========================================================================
/**
 * Creates an articulated human pit crew member positioned in a realistic ergonomic stance.
 * Units: decimetres (1 dm = 0.1 m). Total standing height ~ 18.0 dm (1.80 m).
 */
export function createPitCrewMember(role, options = {}, mats) {
  const group = new THREE.Group();
  group.name = `CrewMember_${role}_${options.id ?? 0}`;

  // Head & FIA Helmet (Height ~ 2.6 dm, Width ~ 2.2 dm)
  const headGroup = new THREE.Group();
  headGroup.name = 'Head';

  const helmetGeo = new THREE.SphereGeometry(1.15, 16, 14);
  helmetGeo.scale(1.0, 1.15, 1.25);
  const helmetMesh = new THREE.Mesh(helmetGeo, mats.helmetShell);
  headGroup.add(helmetMesh);

  // Visor (Black polycarbonate eye slit)
  const visorGeo = new THREE.CylinderGeometry(1.16, 1.16, 0.42, 16, 1, true, -Math.PI * 0.40, Math.PI * 0.80);
  const visorMesh = new THREE.Mesh(visorGeo, mats.helmetVisor);
  visorMesh.rotation.y = Math.PI / 2;
  visorMesh.position.set(0.08, 0.05, 0.0);
  headGroup.add(visorMesh);

  // Helmet Radio Headset Earpieces + Boom Mic
  const earL = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.22, 10), mats.hardwareCarbon);
  earL.rotation.z = Math.PI / 2;
  earL.position.set(0, 0, 1.18);
  headGroup.add(earL);

  const earR = earL.clone();
  earR.position.set(0, 0, -1.18);
  headGroup.add(earR);

  // Boom Mic
  const micBoom = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.1, 6), mats.hardwareSteel);
  micBoom.rotation.set(0, Math.PI / 4, Math.PI / 2);
  micBoom.position.set(0.7, -0.4, 0.6);
  headGroup.add(micBoom);

  // Neck
  const neckGeo = new THREE.CylinderGeometry(0.65, 0.75, 0.6, 12);
  const neckMesh = new THREE.Mesh(neckGeo, mats.suitDark);
  neckMesh.position.y = -1.15;
  headGroup.add(neckMesh);

  // Torso / Chest / Abdomen (Chest width 4.2 dm, depth 2.4 dm, height 4.2 dm)
  const torsoGroup = new THREE.Group();
  torsoGroup.name = 'Torso';

  const chestGeo = new THREE.BoxGeometry(2.3, 3.8, 3.9);
  const chestMesh = new THREE.Mesh(chestGeo, mats.suitPrimary);
  chestMesh.position.y = 1.9;
  torsoGroup.add(chestMesh);

  // Team Contrast Epaulettes & Chest Stripe
  const stripeGeo = new THREE.BoxGeometry(2.34, 0.65, 3.94);
  const stripeMesh = new THREE.Mesh(stripeGeo, mats.suitAccent);
  stripeMesh.position.y = 2.8;
  torsoGroup.add(stripeMesh);

  // Abdomen / Pelvis (Lower torso)
  const abdomenGeo = new THREE.BoxGeometry(2.1, 2.6, 3.4);
  const abdomenMesh = new THREE.Mesh(abdomenGeo, mats.suitPrimary);
  abdomenMesh.position.y = -0.8;
  torsoGroup.add(abdomenMesh);

  // Belt / Harness
  const beltGeo = new THREE.BoxGeometry(2.16, 0.5, 3.46);
  const beltMesh = new THREE.Mesh(beltGeo, mats.suitDark);
  beltMesh.position.y = -0.3;
  torsoGroup.add(beltMesh);

  // Limbs Helper Functions
  function createLimb(upperLen, lowerLen, rUpper, rLower, upperMat, lowerMat, jointAngle = 0) {
    const limbGroup = new THREE.Group();

    // Upper segment
    const upperGeo = new THREE.CylinderGeometry(rUpper * 0.9, rUpper, upperLen, 10);
    const upperMesh = new THREE.Mesh(upperGeo, upperMat);
    upperMesh.position.y = -upperLen / 2;
    limbGroup.add(upperMesh);

    // Elbow / Knee joint
    const jointGroup = new THREE.Group();
    jointGroup.position.y = -upperLen;

    const lowerGeo = new THREE.CylinderGeometry(rLower * 0.85, rLower, lowerLen, 10);
    const lowerMesh = new THREE.Mesh(lowerGeo, lowerMat);
    lowerMesh.position.y = -lowerLen / 2;
    jointGroup.add(lowerMesh);

    jointGroup.rotation.z = jointAngle;
    limbGroup.add(jointGroup);

    return { root: limbGroup, joint: jointGroup };
  }

  // Assemble Left & Right Arms
  const armL = createLimb(2.8, 2.6, 0.65, 0.55, mats.suitPrimary, mats.suitPrimary);
  armL.root.position.set(0, 3.4, 2.2);
  torsoGroup.add(armL.root);

  const armR = createLimb(2.8, 2.6, 0.65, 0.55, mats.suitPrimary, mats.suitPrimary);
  armR.root.position.set(0, 3.4, -2.2);
  torsoGroup.add(armR.root);

  // Hands / Mechanic Gloves
  const gloveGeo = new THREE.BoxGeometry(0.85, 1.2, 0.75);
  const gloveL = new THREE.Mesh(gloveGeo, mats.gloves);
  gloveL.position.y = -2.6;
  armL.joint.add(gloveL);

  const gloveR = gloveL.clone();
  armR.joint.add(gloveR);

  // Assemble Left & Right Legs
  const legL = createLimb(3.8, 3.8, 0.85, 0.72, mats.suitDark, mats.suitDark);
  legL.root.position.set(0, -1.9, 1.25);
  torsoGroup.add(legL.root);

  const legR = createLimb(3.8, 3.8, 0.85, 0.72, mats.suitDark, mats.suitDark);
  legR.root.position.set(0, -1.9, -1.25);
  torsoGroup.add(legR.root);

  // Knee Pads
  const kneePadGeo = new THREE.BoxGeometry(0.9, 1.4, 1.1);
  const kneePadL = new THREE.Mesh(kneePadGeo, mats.kneePads);
  kneePadL.position.set(0.65, 0, 0);
  legL.joint.add(kneePadL);

  const kneePadR = kneePadL.clone();
  legR.joint.add(kneePadR);

  // Boots (Length 2.8 dm, width 1.1 dm, height 1.2 dm)
  const bootGeo = new THREE.BoxGeometry(2.4, 1.1, 1.2);
  const bootL = new THREE.Mesh(bootGeo, mats.boots);
  bootL.position.set(0.6, -3.8, 0);
  legL.joint.add(bootL);

  const bootR = bootL.clone();
  legR.joint.add(bootR);

  // Attach Head
  headGroup.position.y = 4.7;
  torsoGroup.add(headGroup);

  group.add(torsoGroup);

  // =========================================================================
  // Apply Role-Specific Articulated Pose & Equipment
  // =========================================================================
  if (role === 'gunner') {
    // Crouched on one knee aimed at wheel hub
    torsoGroup.position.set(0, 5.8, 0);
    torsoGroup.rotation.set(0, 0, -0.45); // Lean forward

    headGroup.rotation.set(0, 0, 0.35); // Look slightly up toward hub

    // Left leg kneeling, right leg bent in squat
    legL.root.rotation.set(0, 0, 1.45);
    legL.joint.rotation.set(0, 0, -1.60);

    legR.root.rotation.set(0, 0.2, 0.85);
    legR.joint.rotation.set(0, 0, -1.25);

    // Arms holding Paoli wheel gun
    armL.root.rotation.set(0.3, 0.4, -0.75);
    armL.joint.rotation.set(0, 0, 1.10);

    armR.root.rotation.set(-0.2, -0.3, -0.90);
    armR.joint.rotation.set(0, 0, 0.95);

    // Paoli DP6000 Wheel Gun
    const gunGroup = createPaoliWheelGun(mats);
    gunGroup.position.set(2.4, 1.2, 0.0);
    gunGroup.rotation.set(0, 0, -Math.PI / 2 + 0.45);
    torsoGroup.add(gunGroup);

  } else if (role === 'tyre_off') {
    // Athletic wide stance, leaning forward, open arms to grab tyre
    torsoGroup.position.set(0, 7.8, 0);
    torsoGroup.rotation.set(0, 0, -0.35);

    legL.root.rotation.set(0.35, 0, 0.65);
    legL.joint.rotation.set(0, 0, -0.85);

    legR.root.rotation.set(-0.35, 0, 0.65);
    legR.joint.rotation.set(0, 0, -0.85);

    armL.root.rotation.set(0.45, 0.2, -0.85);
    armL.joint.rotation.set(0, 0, 0.60);

    armR.root.rotation.set(-0.45, -0.2, -0.85);
    armR.joint.rotation.set(0, 0, 0.60);

  } else if (role === 'tyre_on') {
    // Stood in athletic crouch holding a fresh 18" Pirelli slick tyre
    torsoGroup.position.set(0, 8.2, 0);
    torsoGroup.rotation.set(0, 0, -0.22);

    legL.root.rotation.set(0.25, 0, 0.55);
    legL.joint.rotation.set(0, 0, -0.75);

    legR.root.rotation.set(-0.25, 0, 0.55);
    legR.joint.rotation.set(0, 0, -0.75);

    // Arms wrapped around tyre
    armL.root.rotation.set(0.65, 0.35, -0.70);
    armL.joint.rotation.set(0, 0, 0.85);

    armR.root.rotation.set(-0.65, -0.35, -0.70);
    armR.joint.rotation.set(0, 0, 0.85);

    // 18-inch Fresh Pirelli Wheel
    const tyreMesh = createFreshPirelliWheel(options.compound || 'soft', mats);
    tyreMesh.position.set(2.4, 0.8, 0);
    torsoGroup.add(tyreMesh);

  } else if (role === 'front_jack') {
    // Stood tall over the pivot lever jack handle
    torsoGroup.position.set(0, 9.6, 0);
    torsoGroup.rotation.set(0, 0, -0.15);

    legL.root.rotation.set(0, 0, 0.25);
    legL.joint.rotation.set(0, 0, -0.35);

    legR.root.rotation.set(0, 0, 0.25);
    legR.joint.rotation.set(0, 0, -0.35);

    armL.root.rotation.set(0.2, 0, -0.65);
    armL.joint.rotation.set(0, 0, 0.45);

    armR.root.rotation.set(-0.2, 0, -0.65);
    armR.joint.rotation.set(0, 0, 0.45);

  } else if (role === 'rear_jack') {
    // Stood behind rear wing, hands down on cradle jack handle
    torsoGroup.position.set(0, 9.6, 0);
    torsoGroup.rotation.set(0, 0, -0.18);

    legL.root.rotation.set(0, 0, 0.28);
    legL.joint.rotation.set(0, 0, -0.40);

    legR.root.rotation.set(0, 0, 0.28);
    legR.joint.rotation.set(0, 0, -0.40);

    armL.root.rotation.set(0.25, 0, -0.60);
    armL.joint.rotation.set(0, 0, 0.40);

    armR.root.rotation.set(-0.25, 0, -0.60);
    armR.joint.rotation.set(0, 0, 0.40);

  } else if (role === 'side_balancer') {
    // Stood tall at sidepods, hands forward to steady car
    torsoGroup.position.set(0, 9.8, 0);

    armL.root.rotation.set(0.3, 0, -0.75);
    armL.joint.rotation.set(0, 0, 0.50);

    armR.root.rotation.set(-0.3, 0, -0.75);
    armR.joint.rotation.set(0, 0, 0.50);

  } else if (role === 'wing_adjuster') {
    // Deep squat beside front wing endplate holding electric torque screwdriver
    torsoGroup.position.set(0, 5.2, 0);
    torsoGroup.rotation.set(0, 0, -0.40);

    legL.root.rotation.set(0.1, 0, 1.25);
    legL.joint.rotation.set(0, 0, -1.45);

    legR.root.rotation.set(-0.1, 0, 1.25);
    legR.joint.rotation.set(0, 0, -1.45);

    armL.root.rotation.set(0.35, 0.2, -0.80);
    armL.joint.rotation.set(0, 0, 0.75);

    armR.root.rotation.set(-0.35, -0.2, -0.80);
    armR.joint.rotation.set(0, 0, 0.75);
  }

  return group;
}

// =========================================================================
// 3. Equipment Generators (Paoli Gun, Fresh Tyre, Jacks, Gantry)
// =========================================================================

/** Paoli DP6000 Pneumatic High-Torque Wheel Gun */
function createPaoliWheelGun(mats) {
  const gun = new THREE.Group();
  gun.name = 'Paoli_DP6000';

  // Body Housing
  const bodyGeo = new THREE.CylinderGeometry(0.38, 0.44, 2.2, 12);
  const bodyMesh = new THREE.Mesh(bodyGeo, mats.gunPneumatic);
  bodyMesh.rotation.x = Math.PI / 2;
  gun.add(bodyMesh);

  // Drive Socket (front hex head for center nut)
  const socketGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.9, 6);
  const socketMesh = new THREE.Mesh(socketGeo, mats.hardwareSteel);
  socketMesh.rotation.x = Math.PI / 2;
  socketMesh.position.z = 1.4;
  gun.add(socketMesh);

  // Pistol Grip Handle
  const gripGeo = new THREE.BoxGeometry(0.45, 1.4, 0.65);
  const gripMesh = new THREE.Mesh(gripGeo, mats.hardwareCarbon);
  gripMesh.position.set(0, -0.9, -0.3);
  gripMesh.rotation.x = -0.25;
  gun.add(gripMesh);

  // High-Pressure Airline Swivel Fitting
  const fittingGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.5, 8);
  const fittingMesh = new THREE.Mesh(fittingGeo, mats.hardwareSteel);
  fittingMesh.position.set(0, -1.7, -0.5);
  gun.add(fittingMesh);

  return gun;
}

/** Fresh 18-inch Pirelli P Zero Wheel */
function createFreshPirelliWheel(compound = 'soft', mats) {
  const wheel = new THREE.Group();
  wheel.name = `FreshWheel_${compound}`;

  // 18" Tyre Tread (Outer diameter 7.1 dm, width 3.2 dm)
  const tyreGeo = new THREE.CylinderGeometry(3.55, 3.55, 3.2, 24);
  const tyreMesh = new THREE.Mesh(tyreGeo, mats.pirelliTread);
  tyreMesh.rotation.z = Math.PI / 2;
  wheel.add(tyreMesh);

  // BBS Forged Magnesium Rim
  const rimGeo = new THREE.CylinderGeometry(2.35, 2.35, 3.22, 18);
  const rimMesh = new THREE.Mesh(rimGeo, mats.pirelliRim);
  rimMesh.rotation.z = Math.PI / 2;
  wheel.add(rimMesh);

  // Colored Sidewall Compound Stripe Ring (Soft: Red, Medium: Yellow, Hard: White)
  const stripeMat = compound === 'hard' ? mats.pirelliStripeHard : (compound === 'medium' ? mats.pirelliStripeMedium : mats.pirelliStripeSoft);
  const ringGeo = new THREE.RingGeometry(2.5, 2.8, 24);

  const ringL = new THREE.Mesh(ringGeo, stripeMat);
  ringL.position.x = 1.62;
  ringL.rotation.y = Math.PI / 2;
  wheel.add(ringL);

  const ringR = ringL.clone();
  ringR.position.x = -1.62;
  ringR.rotation.y = -Math.PI / 2;
  wheel.add(ringR);

  return wheel;
}

/** Front Quick-Release Pivot Lever Jack */
export function createFrontQuickJack(mats) {
  const jack = new THREE.Group();
  jack.name = 'Pit_Front_QuickJack';

  // Twin Front Polyurethane Wheels
  const wheelGeo = new THREE.CylinderGeometry(0.5, 0.5, 0.4, 12);
  const wheelL = new THREE.Mesh(wheelGeo, mats.hardwareCarbon);
  wheelL.rotation.z = Math.PI / 2;
  wheelL.position.set(0.4, 0.5, 1.2);
  jack.add(wheelL);

  const wheelR = wheelL.clone();
  wheelR.position.z = -1.2;
  jack.add(wheelR);

  // Wheel Axle Crossbar
  const axleGeo = new THREE.CylinderGeometry(0.12, 0.12, 2.6, 8);
  const axleMesh = new THREE.Mesh(axleGeo, mats.hardwareSteel);
  axleMesh.position.set(0.4, 0.5, 0);
  jack.add(axleMesh);

  // Rubberized Lifting Cradle Cups (Slip under front nosecone)
  const cupGeo = new THREE.BoxGeometry(0.8, 0.35, 2.2);
  const cupMesh = new THREE.Mesh(cupGeo, mats.kneePads);
  cupMesh.position.set(1.4, 0.5, 0);
  jack.add(cupMesh);

  // Long Lever Arm Pivot Beam (Length ~ 22 dm = 2.2m)
  const armGroup = new THREE.Group();
  armGroup.name = 'LeverArm';
  armGroup.position.set(0.4, 0.5, 0);

  const armGeo = new THREE.CylinderGeometry(0.18, 0.22, 22, 10);
  const armMesh = new THREE.Mesh(armGeo, mats.hardwareCarbon);
  armMesh.position.y = 11;
  armGroup.add(armMesh);

  // Crossbar Handle
  const handleGeo = new THREE.CylinderGeometry(0.15, 0.15, 4.5, 8);
  const handleMesh = new THREE.Mesh(handleGeo, mats.hardwareSteel);
  handleMesh.position.y = 21.8;
  armGroup.add(handleMesh);

  armGroup.rotation.z = -0.55; // Resting operating angle
  jack.add(armGroup);

  jack.userData.armGroup = armGroup;
  return jack;
}

/** Rear Wishbone Cradle Jack */
export function createRearQuickJack(mats) {
  const jack = new THREE.Group();
  jack.name = 'Pit_Rear_CradleJack';

  // Swivel Caster Wheels
  const wheelGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.35, 10);
  const wL = new THREE.Mesh(wheelGeo, mats.hardwareCarbon);
  wL.rotation.z = Math.PI / 2;
  wL.position.set(0, 0.4, 1.4);
  jack.add(wL);

  const wR = wL.clone();
  wR.position.z = -1.4;
  jack.add(wR);

  // Cradle Lifting Pins (Under rear crash structure)
  const pinGeo = new THREE.CylinderGeometry(0.15, 0.15, 1.8, 8);
  const pinMesh = new THREE.Mesh(pinGeo, mats.hardwareSteel);
  pinMesh.position.set(-1.2, 0.6, 0);
  jack.add(pinMesh);

  // Upright Handle Wishbone
  const handleGroup = new THREE.Group();
  handleGroup.name = 'RearHandle';

  const tubeGeo = new THREE.CylinderGeometry(0.16, 0.16, 18, 8);
  const tubeMesh = new THREE.Mesh(tubeGeo, mats.hardwareCarbon);
  tubeMesh.position.set(0, 9, 0);
  tubeMesh.rotation.z = 0.45;
  handleGroup.add(tubeMesh);

  const barGeo = new THREE.CylinderGeometry(0.14, 0.14, 4.2, 8);
  const barMesh = new THREE.Mesh(barGeo, mats.hardwareSteel);
  barMesh.position.set(3.8, 16.5, 0);
  handleGroup.add(barMesh);

  jack.add(handleGroup);
  jack.userData.handleGroup = handleGroup;
  return jack;
}

/** Overhead Cantilevered Pit Gantry Boom */
export function createPitGantryBoom(mats) {
  const gantry = new THREE.Group();
  gantry.name = 'Pit_Overhead_Gantry_Boom';

  // Main Vertical Stanchion Pole (mounted to pit wall / building, height 58 dm = 5.8m)
  const poleGeo = new THREE.BoxGeometry(2.4, 58, 2.4);
  const poleMesh = new THREE.Mesh(poleGeo, mats.hardwareSteel);
  poleMesh.position.set(0, 29, 0);
  gantry.add(poleMesh);

  // Cantilevered Horizontal Overhead Arm (Reaches 75 dm = 7.5m out across pit lane)
  const armGroup = new THREE.Group();
  armGroup.position.set(0, 56, 0);

  const beamGeo = new THREE.BoxGeometry(2.0, 1.8, 75);
  const beamMesh = new THREE.Mesh(beamGeo, mats.hardwareCarbon);
  beamMesh.position.set(0, 0, 37.5);
  armGroup.add(beamMesh);

  // Diagonal Structural Truss Bracing
  for (let b = 15; b <= 60; b += 15) {
    const braceGeo = new THREE.CylinderGeometry(0.08, 0.08, 16, 6);
    const braceMesh = new THREE.Mesh(braceGeo, mats.hardwareSteel);
    braceMesh.rotation.set(0.65, 0, 0);
    braceMesh.position.set(0, -5, b);
    armGroup.add(braceMesh);
  }

  // Pit Stop Traffic Light Pod (Cluster over car center)
  const podGeo = new THREE.BoxGeometry(1.6, 2.2, 3.4);
  const podMesh = new THREE.Mesh(podGeo, mats.hardwareCarbon);
  podMesh.position.set(0, -1.8, 38);
  armGroup.add(podMesh);

  // Red Holding LEDs (Horizontal row of 5)
  const redLeds = [];
  for (let i = -1.2; i <= 1.2; i += 0.6) {
    const ledMesh = new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 8), mats.lightRed);
    ledMesh.position.set(0.82, -1.5, 38 + i);
    armGroup.add(ledMesh);
    redLeds.push(ledMesh);
  }

  // Green Launch Cluster (Lower central cluster)
  const greenLed = new THREE.Mesh(new THREE.SphereGeometry(0.35, 12, 10), mats.lightOff);
  greenLed.position.set(0.82, -2.3, 38);
  armGroup.add(greenLed);

  // 4x Overhead Work Spotlights
  for (const z of [22, 34, 44, 56]) {
    const spotGeo = new THREE.ConeGeometry(0.6, 0.8, 12);
    const spotMesh = new THREE.Mesh(spotGeo, mats.floodLight);
    spotMesh.position.set(0, -1.1, z);
    spotMesh.rotation.x = Math.PI;
    armGroup.add(spotMesh);
  }

  // 4x Coiled High-Pressure Airlines Dangling Down
  const airHoses = [];
  for (const z of [24, 28, 48, 52]) {
    const hoseCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, -1.0, z),
      new THREE.Vector3(1.2, -14, z - 1.0),
      new THREE.Vector3(-1.0, -28, z + 0.8),
      new THREE.Vector3(0.5, -42, z - 0.5)
    ]);
    const hoseGeo = new THREE.TubeGeometry(hoseCurve, 20, 0.12, 6, false);
    const hoseMesh = new THREE.Mesh(hoseGeo, mats.airlineHose);
    armGroup.add(hoseMesh);
    airHoses.push(hoseMesh);
  }

  gantry.add(armGroup);

  gantry.userData = {
    redLeds,
    greenLed,
    setGreenLight: (on) => {
      greenLed.material = on ? mats.lightGreen : mats.lightOff;
      redLeds.forEach(l => { l.material = on ? mats.lightOff : mats.lightRed; });
    }
  };

  return gantry;
}

/** Tyre Racks with Pirelli Thermal Warming Blankets */
export function createTyreWarmingRacks(mats) {
  const rack = new THREE.Group();
  rack.name = 'Tyre_Warming_Racks';

  // Steel Frame Shelf
  const frameGeo = new THREE.BoxGeometry(6.5, 14, 24);
  const frameMesh = new THREE.Mesh(frameGeo, mats.hardwareCarbon);
  frameMesh.position.set(0, 7, 0);
  rack.add(frameMesh);

  // Stacked Blanketed Tyres (Soft, Medium, Hard)
  const blanketMat = new THREE.MeshStandardMaterial({
    color: 0x141820,
    roughness: 0.9,
    metalness: 0.1
  });

  for (let row = 0; row < 2; row++) {
    for (let col = -1.5; col <= 1.5; col += 1.0) {
      const tyreGeo = new THREE.CylinderGeometry(3.55, 3.55, 3.2, 16);
      const tyreMesh = new THREE.Mesh(tyreGeo, blanketMat);
      tyreMesh.rotation.z = Math.PI / 2;
      tyreMesh.position.set(0, 3.8 + row * 7.2, col * 5.4);
      rack.add(tyreMesh);

      // Temperature Display LED ("100°C")
      const ledGeo = new THREE.PlaneGeometry(0.8, 0.4);
      const ledMat = new THREE.MeshBasicMaterial({ color: 0x00d4e8 });
      const ledMesh = new THREE.Mesh(ledGeo, ledMat);
      ledMesh.position.set(1.65, 3.8 + row * 7.2, col * 5.4);
      ledMesh.rotation.y = Math.PI / 2;
      rack.add(ledMesh);
    }
  }

  return rack;
}

// =========================================================================
// 4. Complete Pit Stop Station (Crew + Equipment around Pit Box)
// =========================================================================
/**
 * Instantiates the full 18-person pit crew and pit stop hardware around the pit box datum.
 */
export function createPitStopStation(options = {}) {
  const stationGroup = new THREE.Group();
  stationGroup.name = 'Assembly_Oracle_RedBull_PitStop_Station';

  const mats = createCrewMaterials(options.teamId || 'red-bull');

  // Car Datum in dm:
  // Wheelbase = 34 dm.
  // Front axle at x = +17 dm, rear axle at x = -17 dm.
  // Half track width = 8.0 dm.
  const X_FRONT = 17.0;
  const X_REAR = -17.0;
  const Y_TRACK = 8.2;

  // 1. Four Corner Wheel Gunners
  const gunnerFL = createPitCrewMember('gunner', { id: 'FL' }, mats);
  gunnerFL.position.set(X_FRONT, 0, Y_TRACK + 4.8);
  gunnerFL.rotation.y = -Math.PI / 2;
  stationGroup.add(gunnerFL);

  const gunnerFR = createPitCrewMember('gunner', { id: 'FR' }, mats);
  gunnerFR.position.set(X_FRONT, 0, -Y_TRACK - 4.8);
  gunnerFR.rotation.y = Math.PI / 2;
  stationGroup.add(gunnerFR);

  const gunnerRL = createPitCrewMember('gunner', { id: 'RL' }, mats);
  gunnerRL.position.set(X_REAR, 0, Y_TRACK + 4.8);
  gunnerRL.rotation.y = -Math.PI / 2;
  stationGroup.add(gunnerRL);

  const gunnerRR = createPitCrewMember('gunner', { id: 'RR' }, mats);
  gunnerRR.position.set(X_REAR, 0, -Y_TRACK - 4.8);
  gunnerRR.rotation.y = Math.PI / 2;
  stationGroup.add(gunnerRR);

  // 2. Four Tyre-Off Mechanics (Ready to pull old tyres)
  const tyreOffFL = createPitCrewMember('tyre_off', { id: 'FL' }, mats);
  tyreOffFL.position.set(X_FRONT + 5.2, 0, Y_TRACK + 6.8);
  tyreOffFL.rotation.y = -Math.PI * 0.65;
  stationGroup.add(tyreOffFL);

  const tyreOffFR = createPitCrewMember('tyre_off', { id: 'FR' }, mats);
  tyreOffFR.position.set(X_FRONT + 5.2, 0, -Y_TRACK - 6.8);
  tyreOffFR.rotation.y = Math.PI * 0.65;
  stationGroup.add(tyreOffFR);

  const tyreOffRL = createPitCrewMember('tyre_off', { id: 'RL' }, mats);
  tyreOffRL.position.set(X_REAR + 5.2, 0, Y_TRACK + 6.8);
  tyreOffRL.rotation.y = -Math.PI * 0.65;
  stationGroup.add(tyreOffRL);

  const tyreOffRR = createPitCrewMember('tyre_off', { id: 'RR' }, mats);
  tyreOffRR.position.set(X_REAR + 5.2, 0, -Y_TRACK - 6.8);
  tyreOffRR.rotation.y = Math.PI * 0.65;
  stationGroup.add(tyreOffRR);

  // 3. Four Tyre-On Mechanics (Cradling fresh tyres)
  const tyreOnFL = createPitCrewMember('tyre_on', { id: 'FL', compound: 'soft' }, mats);
  tyreOnFL.position.set(X_FRONT - 5.2, 0, Y_TRACK + 7.5);
  tyreOnFL.rotation.y = -Math.PI * 0.35;
  stationGroup.add(tyreOnFL);

  const tyreOnFR = createPitCrewMember('tyre_on', { id: 'FR', compound: 'soft' }, mats);
  tyreOnFR.position.set(X_FRONT - 5.2, 0, -Y_TRACK - 7.5);
  tyreOnFR.rotation.y = Math.PI * 0.35;
  stationGroup.add(tyreOnFR);

  const tyreOnRL = createPitCrewMember('tyre_on', { id: 'RL', compound: 'soft' }, mats);
  tyreOnRL.position.set(X_REAR - 5.2, 0, Y_TRACK + 7.5);
  tyreOnRL.rotation.y = -Math.PI * 0.35;
  stationGroup.add(tyreOnRL);

  const tyreOnRR = createPitCrewMember('tyre_on', { id: 'RR', compound: 'soft' }, mats);
  tyreOnRR.position.set(X_REAR - 5.2, 0, -Y_TRACK - 7.5);
  tyreOnRR.rotation.y = Math.PI * 0.35;
  stationGroup.add(tyreOnRR);

  // 4. Front Jack Man & Quick Jack
  const frontJackMan = createPitCrewMember('front_jack', { id: 'F' }, mats);
  frontJackMan.position.set(X_FRONT + 25.0, 0, 0);
  frontJackMan.rotation.y = Math.PI;
  stationGroup.add(frontJackMan);

  const frontJack = createFrontQuickJack(mats);
  frontJack.position.set(X_FRONT + 18.0, 0, 0);
  stationGroup.add(frontJack);

  // 5. Rear Jack Man & Cradle Jack
  const rearJackMan = createPitCrewMember('rear_jack', { id: 'R' }, mats);
  rearJackMan.position.set(X_REAR - 24.0, 0, 0);
  stationGroup.add(rearJackMan);

  const rearJack = createRearQuickJack(mats);
  rearJack.position.set(X_REAR - 18.0, 0, 0);
  stationGroup.add(rearJack);

  // 6. Sidepod Stabilizers (2 crew members)
  const stabL = createPitCrewMember('side_balancer', { id: 'L' }, mats);
  stabL.position.set(0, 0, Y_TRACK + 4.2);
  stabL.rotation.y = -Math.PI / 2;
  stationGroup.add(stabL);

  const stabR = createPitCrewMember('side_balancer', { id: 'R' }, mats);
  stabR.position.set(0, 0, -Y_TRACK - 4.2);
  stabR.rotation.y = Math.PI / 2;
  stationGroup.add(stabR);

  // 7. Front Wing Flap Adjusters (2 crew members)
  const wingAdjL = createPitCrewMember('wing_adjuster', { id: 'L' }, mats);
  wingAdjL.position.set(X_FRONT + 12.0, 0, Y_TRACK + 3.8);
  wingAdjL.rotation.y = -Math.PI * 0.75;
  stationGroup.add(wingAdjL);

  const wingAdjR = createPitCrewMember('wing_adjuster', { id: 'R' }, mats);
  wingAdjR.position.set(X_FRONT + 12.0, 0, -Y_TRACK - 3.8);
  wingAdjR.rotation.y = Math.PI * 0.75;
  stationGroup.add(wingAdjR);

  // 8. Overhead Cantilevered Pit Gantry Boom
  const gantry = createPitGantryBoom(mats);
  gantry.position.set(0, 0, -32.0); // Mounted along garage facade
  stationGroup.add(gantry);

  // 9. Tyre Warming Racks parked along pit building wall
  const tyreRack = createTyreWarmingRacks(mats);
  tyreRack.position.set(-15, 0, -28.0);
  stationGroup.add(tyreRack);

  // API for dynamic updates and animation
  stationGroup.userData = {
    mats,
    gantry,
    frontJack,
    rearJack,
    setTeam: (teamId) => {
      const newMats = createCrewMaterials(teamId);
      mats.suitPrimary.color.copy(newMats.suitPrimary.color);
      mats.suitAccent.color.copy(newMats.suitAccent.color);
      mats.suitDark.color.copy(newMats.suitDark.color);
      mats.helmetShell.color.copy(newMats.helmetShell.color);
    },
    updatePitState: (phase, pitT) => {
      // Gantry lights: Red during stop, Green upon release
      if (phase === 'stop') {
        gantry.userData.setGreenLight(pitT >= 2.2);

        // Jack animation: lever down when lifting
        if (frontJack.userData.armGroup) {
          frontJack.userData.armGroup.rotation.z = -0.75;
        }
      } else {
        gantry.userData.setGreenLight(false);
        if (frontJack.userData.armGroup) {
          frontJack.userData.armGroup.rotation.z = -0.55;
        }
      }
    }
  };

  return stationGroup;
}
