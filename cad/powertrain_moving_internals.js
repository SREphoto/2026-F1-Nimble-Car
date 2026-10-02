/**
 * 2026 Formula 1 "Nimble Car" Powertrain
 * SREdesigns - Samuel R Erwin III
 * 
 * 3D CAD for the 1.6L Turbo V6 Engine & 350 kW MGU-K:
 * - 1.6L 90° V6 Engine Block:
 *   * Cast aluminum block with structural web stiffeners and cylinder bore liners
 *   * 4x cross-bolted main bearing caps with genuine 12-point jet nuts
 * - Rotating Crankshaft Assembly:
 *   * Forged steel crankshaft with 6 knife-edged counterweights and rod journals
 *   * Crankshaft timing drive sprocket with gear teeth
 * - 6x Connecting Rod & Piston Assemblies:
 *   * H-beam titanium/steel connecting rods with split big-end caps and ARP rod bolts
 *   * Forged aluminum slipper pistons with valve relief pockets in crowns
 *   * 3 individual piston rings: top compression ring, second scraper ring, oil control ring with expander
 *   * Floating wrist pin (gudgeon pin) with internal bore and spiralock retaining clips
 * - DOHC Valvetrain:
 *   * 4x camshafts (2 intake, 2 exhaust) with 12 precision ground cam lobes
 *   * 4x camshaft timing sprockets
 *   * Genuine multi-link roller timing chain wrapping around crank and cam sprockets
 *   * Hydraulic chain tensioners and composite guide shoes
 *   * 24x valves (12 intake, 12 exhaust) with dual concentric valve springs, titanium retainers, and keepers
 * - Turbocharger Assembly (No MGU-H in 2026 regulations):
 *   * Inconel common shaft with dual ceramic ball bearing cartridges
 *   * Exhaust turbine wheel with 11 curved radial Inconel blades
 *   * Compressor impeller wheel with 12 milled billet aluminum inducer/exducer blades
 *   * Dual electronic wastegate flapper valves with vacuum/pneumatic actuator linkage arms
 * - 350 kW MGU-K Motor (Article C5):
 *   * Cylindrical stator core with laminated electrical steel and copper hairpin windings
 *   * Internal permanent magnet rotor with balance rings and driveshaft coupling
 * 
 * Universal Datum:
 * - Engine located between cockpit bulkhead (X = 22.0 dm) and gearbox interface (X = 27.5 dm)
 * - Crankshaft centerline at Z = 1.45 dm, Y = 0.0 dm
 */

import * as THREE from 'three';
import { materials } from '../materials.js';
import { createSocketHeadBolt, createStudWith12PtNut } from './fasteners.js';

export function createPowertrainInternals(options = {}) {
  const group = new THREE.Group();
  group.name = 'Powertrain_Moving_Internals_Assembly';

  // Base position of engine block
  const engineBasePos = new THREE.Vector3(24.5, 0.0, 1.85);

  // =========================================================================
  // 1. 1.6L 90° V6 ENGINE CRANKCASE & CYLINDER BLOCK
  // Cast aluminum structural block with 90-degree V bank angle
  // =========================================================================
  const blockGroup = new THREE.Group();
  blockGroup.name = 'Engine_Crankcase_Block';
  blockGroup.position.copy(engineBasePos);

  // Lower Crankcase / Sump Base
  const sumpGeo = new THREE.BoxGeometry(4.8, 2.6, 0.9);
  const sumpMesh = new THREE.Mesh(sumpGeo, materials.castIronBallast || materials.alLi2099);
  sumpMesh.position.set(0, 0, -0.65);
  blockGroup.add(sumpMesh);

  // 4x Main Bearing Saddles with Cross-Bolted Main Caps
  for (let m = 0; m < 4; m++) {
    const mainX = -1.8 + m * 1.2;
    const capGeo = new THREE.CylinderGeometry(0.55, 0.55, 0.35, 16, 1, false, 0, Math.PI);
    const capMesh = new THREE.Mesh(capGeo, materials.titaniumBright);
    capMesh.rotation.z = Math.PI;
    capMesh.rotation.y = Math.PI / 2;
    capMesh.position.set(mainX, 0, -0.35);
    blockGroup.add(capMesh);

    // 2x Vertical Main Cap Studs with 12-point jet nuts
    [-0.35, 0.35].forEach((yOff, nIdx) => {
      const studNut = createStudWith12PtNut({
        studRadius: 0.035,
        studLength: 0.25,
        nutHeight: 0.06,
        nutFlangeRadius: 0.075,
        nutDoubleHexRadius: 0.065,
        material: materials.titaniumAnodized
      });
      studNut.position.set(mainX, yOff, -0.42);
      studNut.name = `MainCap_${m}_Nut_${nIdx}`;
      blockGroup.add(studNut);
    });

    // 2x Horizontal Cross-Bolts (Through crankcase skirt into main cap sides)
    [-0.75, 0.75].forEach((ySkirt, cIdx) => {
      const crossBolt = createSocketHeadBolt({
        headRadius: 0.05,
        headHeight: 0.03,
        hexRadius: 0.03,
        hexDepth: 0.02,
        shankRadius: 0.025,
        shankLength: 0.15,
        material: materials.titaniumBright
      });
      crossBolt.position.set(mainX, ySkirt, -0.35);
      crossBolt.rotation.z = ySkirt > 0 ? -Math.PI / 2 : Math.PI / 2;
      crossBolt.name = `CrossBolt_Main${m}_${cIdx}`;
      blockGroup.add(crossBolt);
    });
  }

  // 90° V6 Cylinder Banks (Bank 1: Left +45°, Bank 2: Right -45°)
  // Each bank's bore axis (local +Z) leans OUTBOARD and passes through the crank axis (Z = -0.4 here).
  // Rx(-a) tips local +Z toward +Y for the left bank.
  [-1, 1].forEach((bankSign, bIdx) => {
    const bankAngle = bankSign * (Math.PI / 4); // 45 degrees from vertical
    const bankGroup = new THREE.Group();
    bankGroup.rotation.x = -bankAngle;
    bankGroup.position.set(0, bankSign * 0.55, 0.15);

    // Cylinder Bank Block Casting
    const bankCastingGeo = new THREE.BoxGeometry(4.2, 1.4, 1.8);
    const bankCasting = new THREE.Mesh(bankCastingGeo, materials.alLi2099);
    bankCasting.position.set(0, 0, 0.7);
    bankGroup.add(bankCasting);

    // 3 Cylinder Bores per bank with hardened steel liners
    for (let c = 0; c < 3; c++) {
      const cylX = -1.2 + c * 1.2;
      const boreGeo = new THREE.CylinderGeometry(0.48, 0.48, 1.7, 24, 1, true);
      const boreMesh = new THREE.Mesh(boreGeo, materials.titaniumBright);
      boreMesh.rotation.x = Math.PI / 2; // liner axis along the bank's bore direction (local Z)
      boreMesh.position.set(cylX, 0, 0.7);
      bankGroup.add(boreMesh);

      // Cylinder Head Interface Studs (4 per cylinder)
      [-0.45, 0.45].forEach(sX => {
        [-0.45, 0.45].forEach(sY => {
          const headStud = createStudWith12PtNut({
            studRadius: 0.03,
            studLength: 0.2,
            nutHeight: 0.05,
            nutFlangeRadius: 0.065,
            nutDoubleHexRadius: 0.055,
            material: materials.titaniumAnodized
          });
          headStud.position.set(cylX + sX, sY, 1.55);
          bankGroup.add(headStud);
        });
      });
    }

    bankGroup.name = `Engine_Bank_${bIdx + 1}_V90`;
    blockGroup.add(bankGroup);
  });

  group.add(blockGroup);

  // =========================================================================
  // 2. FORGED STEEL CRANKSHAFT WITH KNIFE-EDGED COUNTERWEIGHTS
  // Rotating assembly aligned on engine centerline at Z = 1.45 dm
  // =========================================================================
  const crankGroup = new THREE.Group();
  crankGroup.name = 'Kinematic_Crankshaft_Assembly';
  crankGroup.position.set(engineBasePos.x, engineBasePos.y, engineBasePos.z - 0.4);

  // Main Bearing Journals (4 journals)
  for (let j = 0; j < 4; j++) {
    const jX = -1.8 + j * 1.2;
    const jGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.25, 20);
    const jMesh = new THREE.Mesh(jGeo, materials.titaniumBright);
    jMesh.rotation.z = Math.PI / 2;
    jMesh.position.set(jX, 0, 0);
    crankGroup.add(jMesh);
  }

  // 6x Knife-Edged Counterweights & Crankpins (120-degree split-pin V6 crank)
  const pinRadius = 0.42; // Throw distance
  for (let p = 0; p < 6; p++) {
    const pinX = -1.55 + p * 0.62;
    const pinAngle = (p * Math.PI * 2) / 3; // 120-degree spacing

    // Connecting rod crankpin
    const pinGeo = new THREE.CylinderGeometry(0.28, 0.28, 0.18, 16);
    const pinMesh = new THREE.Mesh(pinGeo, materials.titaniumBright);
    pinMesh.rotation.z = Math.PI / 2;
    pinMesh.position.set(pinX, Math.cos(pinAngle) * pinRadius, Math.sin(pinAngle) * pinRadius);
    crankGroup.add(pinMesh);

    // Knife-edged aerodynamic counterweight web
    const cwShape = new THREE.Shape();
    cwShape.moveTo(0, 0);
    cwShape.lineTo(Math.cos(pinAngle + Math.PI - 0.5) * 0.95, Math.sin(pinAngle + Math.PI - 0.5) * 0.95);
    cwShape.quadraticCurveTo(
      Math.cos(pinAngle + Math.PI) * 1.2,
      Math.sin(pinAngle + Math.PI) * 1.2,
      Math.cos(pinAngle + Math.PI + 0.5) * 0.95,
      Math.sin(pinAngle + Math.PI + 0.5) * 0.95
    );
    cwShape.closePath();

    const cwExtrude = { steps: 1, depth: 0.12, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.04, bevelSegments: 3 };
    const cwGeo = new THREE.ExtrudeGeometry(cwShape, cwExtrude);
    const cwMesh = new THREE.Mesh(cwGeo, materials.titaniumAnodized);
    cwMesh.position.set(pinX - 0.06, 0, 0);
    cwMesh.rotation.y = Math.PI / 2;
    crankGroup.add(cwMesh);
  }

  // Front Timing Drive Sprocket (Double-row roller gear at front of crank)
  const crankSprocketGeo = new THREE.CylinderGeometry(0.55, 0.55, 0.18, 24);
  const crankSprocketMesh = new THREE.Mesh(crankSprocketGeo, materials.titaniumAnodized);
  crankSprocketMesh.rotation.z = Math.PI / 2;
  crankSprocketMesh.position.set(-2.05, 0, 0);
  crankGroup.add(crankSprocketMesh);

  // Sprocket Teeth (24 individual machined teeth)
  for (let t = 0; t < 24; t++) {
    const tAngle = (t * Math.PI * 2) / 24;
    const toothGeo = new THREE.BoxGeometry(0.16, 0.06, 0.08);
    const toothMesh = new THREE.Mesh(toothGeo, materials.titaniumBright);
    toothMesh.position.set(-2.05, Math.cos(tAngle) * 0.58, Math.sin(tAngle) * 0.58);
    toothMesh.rotation.x = -tAngle;
    crankGroup.add(toothMesh);
  }

  group.add(crankGroup);

  // =========================================================================
  // 3. 6x CONNECTING RODS, PISTONS, RINGS, & WRIST PINS
  // Real physical 3D piston assembly with valve pockets and 3 separate rings
  // =========================================================================
  const pistonsGroup = new THREE.Group();
  pistonsGroup.name = 'Kinematic_Piston_Conrod_Assemblies';
  pistonsGroup.position.copy(engineBasePos);

  for (let i = 0; i < 6; i++) {
    const bankSign = i % 2 === 0 ? 1 : -1;
    const bankAngle = bankSign * (Math.PI / 4);
    const cylIdx = Math.floor(i / 2);
    const cylX = -1.2 + cylIdx * 1.2;

    const pAssembly = new THREE.Group();
    pAssembly.name = `Assembly_Piston_Rod_Cyl${i + 1}`;
    pAssembly.position.set(cylX, 0, -0.4);
    pAssembly.rotation.x = -bankAngle; // same lean as its bank

    // H-Beam Connecting Rod
    const rodGroup = new THREE.Group();
    // Big-end journal eye
    const bigEndGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.16, 16);
    const bigEnd = new THREE.Mesh(bigEndGeo, materials.titaniumBright);
    bigEnd.rotation.z = Math.PI / 2; // eye axis parallel to crank (X)
    rodGroup.add(bigEnd);

    // H-Beam Rod Beam (Center section with H-flanges)
    const beamGeo = new THREE.BoxGeometry(0.12, 0.16, 1.25);
    const beamMesh = new THREE.Mesh(beamGeo, materials.titaniumAnodized);
    beamMesh.position.set(0, 0, 0.72);
    rodGroup.add(beamMesh);

    // Rod H-Flanges
    [-0.06, 0.06].forEach(fx => {
      const flangeGeo = new THREE.BoxGeometry(0.04, 0.22, 1.25);
      const flangeMesh = new THREE.Mesh(flangeGeo, materials.titaniumBright);
      flangeMesh.position.set(fx, 0, 0.72);
      rodGroup.add(flangeMesh);
    });

    // Small-end pin eye (bushing)
    const smallEndGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.14, 16);
    const smallEnd = new THREE.Mesh(smallEndGeo, materials.copperWindings);
    smallEnd.rotation.z = Math.PI / 2;
    smallEnd.position.set(0, 0, 1.4);
    rodGroup.add(smallEnd);

    // 2x ARP 2000 Big-End Rod Bolts
    [-0.18, 0.18].forEach((rOff, bIdx) => {
      const rodBolt = createSocketHeadBolt({
        headRadius: 0.035,
        headHeight: 0.025,
        hexRadius: 0.02,
        hexDepth: 0.015,
        shankRadius: 0.018,
        shankLength: 0.12,
        material: materials.titaniumBright
      });
      rodBolt.position.set(0, rOff, -0.15);
      rodBolt.rotation.x = Math.PI;
      rodBolt.name = `RodBolt_${bIdx}`;
      rodGroup.add(rodBolt);
    });

    pAssembly.add(rodGroup);

    // Piston Head (Forged aluminum box-bridge slipper piston)
    const pistonGroup = new THREE.Group();
    pistonGroup.position.set(0, 0, 1.4);

    // Piston Crown & Skirt
    const crownGeo = new THREE.CylinderGeometry(0.46, 0.46, 0.55, 24);
    const crownMesh = new THREE.Mesh(crownGeo, materials.alLi2099);
    crownMesh.rotation.x = Math.PI / 2; // crown axis along the bore (local Z), matching the rings
    crownMesh.position.set(0, 0, 0.2);
    pistonGroup.add(crownMesh);

    // 2x Valve Relief Pockets carved into piston crown
    [-0.14, 0.14].forEach(vy => {
      const pocketGeo = new THREE.CylinderGeometry(0.15, 0.15, 0.06, 16);
      const pocketMesh = new THREE.Mesh(pocketGeo, materials.carbonMatte);
      pocketMesh.position.set(0, vy, 0.46);
      pistonGroup.add(pocketMesh);
    });

    // 3 Individual 3D Piston Rings in Machined Lands:
    // 1. Top Steel Gas Nitrided Compression Ring
    const ring1Geo = new THREE.TorusGeometry(0.465, 0.012, 6, 24);
    const ring1Mesh = new THREE.Mesh(ring1Geo, materials.titaniumBright);
    ring1Mesh.position.set(0, 0, 0.38);
    pistonGroup.add(ring1Mesh);

    // 2. Second Cast Iron Scraper Napier Ring
    const ring2Geo = new THREE.TorusGeometry(0.465, 0.012, 6, 24);
    const ring2Mesh = new THREE.Mesh(ring2Geo, materials.castIronBallast || materials.carbonMatte);
    ring2Mesh.position.set(0, 0, 0.31);
    pistonGroup.add(ring2Mesh);

    // 3. Three-Piece Oil Control Ring with Expander Spring
    const ring3Geo = new THREE.TorusGeometry(0.465, 0.015, 6, 24);
    const ring3Mesh = new THREE.Mesh(ring3Geo, materials.titaniumAnodized);
    ring3Mesh.position.set(0, 0, 0.24);
    pistonGroup.add(ring3Mesh);

    // Floating Wrist Pin (Gudgeon Pin) with hollow center bore
    const pinGeo = new THREE.CylinderGeometry(0.11, 0.11, 0.72, 16);
    const pinMesh = new THREE.Mesh(pinGeo, materials.titaniumBright);
    pinMesh.rotation.z = Math.PI / 2; // wrist pin parallel to crank
    pistonGroup.add(pinMesh);

    // Spiralock Retaining Clips at both pin ends
    [-0.34, 0.34].forEach(pinEnd => {
      const clipGeo = new THREE.TorusGeometry(0.11, 0.012, 6, 16);
      const clipMesh = new THREE.Mesh(clipGeo, materials.titaniumAnodized);
      clipMesh.position.set(pinEnd, 0, 0);
      clipMesh.rotation.y = Math.PI / 2;
      pistonGroup.add(clipMesh);
    });

    pAssembly.add(pistonGroup);
    pistonsGroup.add(pAssembly);
  }

  group.add(pistonsGroup);

  // =========================================================================
  // 4. DOHC VALVETRAIN: 4 CAMSHAFTS, ROLLER TIMING CHAIN, & 24 VALVES
  // DOHC per bank = 2 Intake Camshafts + 2 Exhaust Camshafts
  // =========================================================================
  const valvetrainGroup = new THREE.Group();
  valvetrainGroup.name = 'Kinematic_DOHC_Valvetrain_Assembly';
  valvetrainGroup.position.copy(engineBasePos);

  // 4 Camshafts (Bank 1: Intake & Exhaust, Bank 2: Intake & Exhaust)
  [-1, 1].forEach((bankSign, bIdx) => {
    const bankAngle = bankSign * (Math.PI / 4);

    [-0.35, 0.35].forEach((camOffY, cType) => { // cType 0 = Intake, 1 = Exhaust
      const camGroup = new THREE.Group();
      // On top of the bank's cylinder head: crank + 2.45 dm along the bore axis, ±camOffY across it
      const s45 = Math.SQRT1_2;
      camGroup.rotation.x = -bankAngle;
      camGroup.position.set(
        0,
        bankSign * s45 * 2.45 + s45 * camOffY,
        -0.4 + s45 * 2.45 - bankSign * s45 * camOffY
      );

      // Hollow Camshaft Bar
      const barGeo = new THREE.CylinderGeometry(0.12, 0.12, 4.4, 16);
      const barMesh = new THREE.Mesh(barGeo, materials.titaniumBright);
      barMesh.rotation.z = Math.PI / 2;
      // Rotating parts of the camshaft spin about their own axis (see full_car3d.js)
      const camSpin = new THREE.Group();
      camSpin.name = 'Kinematic_CamSpin';
      camGroup.add(camSpin);
      camSpin.add(barMesh);

      // 6 Cam Lobes per shaft (2 per cylinder = 24 valves total)
      for (let l = 0; l < 6; l++) {
        const cyl = Math.floor(l / 2);
        const valveInCyl = l % 2;
        const lobeX = -1.35 + cyl * 1.2 + valveInCyl * 0.3;
        const lobeAngle = (l * Math.PI) / 3;

        // Egg-shaped cam lobe
        const lobeShape = new THREE.Shape();
        lobeShape.moveTo(0, 0);
        lobeShape.absarc(0, 0, 0.18, 0, Math.PI, false);
        lobeShape.lineTo(0.24, 0.08);
        lobeShape.quadraticCurveTo(0.35, 0, 0.24, -0.08);
        lobeShape.closePath();

        const lobeExtrude = { steps: 1, depth: 0.12, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 2 };
        const lobeGeo = new THREE.ExtrudeGeometry(lobeShape, lobeExtrude);
        const lobeMesh = new THREE.Mesh(lobeGeo, materials.titaniumAnodized);
        lobeMesh.position.set(lobeX, 0, 0);
        lobeMesh.rotation.y = Math.PI / 2;
        lobeMesh.rotation.x = lobeAngle;
        camSpin.add(lobeMesh);

        // Individual Valve, Springs & Retainer directly beneath each lobe
        const valveGroup = new THREE.Group();
        valveGroup.position.set(lobeX, 0, -0.32);

        // Valve Stem
        const stemGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.45, 12);
        const stemMesh = new THREE.Mesh(stemGeo, materials.titaniumBright);
        stemMesh.rotation.x = Math.PI / 2; // valve axis along bank bore direction (local Z)
        valveGroup.add(stemMesh);

        // Concentric Dual Valve Springs (Outer spring + inner spring)
        const outerSpringGeo = new THREE.CylinderGeometry(0.11, 0.11, 0.28, 12, 1, true);
        const outerSpring = new THREE.Mesh(outerSpringGeo, materials.titaniumAnodized);
        outerSpring.rotation.x = Math.PI / 2;
        valveGroup.add(outerSpring);

        const innerSpringGeo = new THREE.CylinderGeometry(0.07, 0.07, 0.26, 12, 1, true);
        const innerSpring = new THREE.Mesh(innerSpringGeo, materials.titaniumBright);
        innerSpring.rotation.x = Math.PI / 2;
        valveGroup.add(innerSpring);

        // Titanium Spring Retainer & Valve Collet
        const retGeo = new THREE.CylinderGeometry(0.13, 0.08, 0.04, 12);
        const retMesh = new THREE.Mesh(retGeo, materials.titaniumBright);
        retMesh.rotation.x = Math.PI / 2;
        retMesh.position.set(0, 0, 0.14);
        valveGroup.add(retMesh);

        // Valve Poppet Head (Titanium intake / Sodium-cooled Inconel exhaust)
        const headGeo = new THREE.CylinderGeometry(0.18, 0.03, 0.06, 16);
        const headMesh = new THREE.Mesh(headGeo, cType === 0 ? materials.titaniumBright : materials.inconelExhaust);
        headMesh.rotation.x = -Math.PI / 2; // poppet face toward the combustion chamber
        headMesh.position.set(0, 0, -0.22);
        valveGroup.add(headMesh);

        valveGroup.name = `Valve_${bIdx}_${cType}_Lobe${l}`;
        camGroup.add(valveGroup);
      }

      // Camshaft Sprocket at front
      const camSprocketGeo = new THREE.CylinderGeometry(0.55, 0.55, 0.12, 24);
      const camSprocket = new THREE.Mesh(camSprocketGeo, materials.titaniumAnodized);
      camSprocket.rotation.z = Math.PI / 2;
      camSprocket.position.set(-2.05, 0, 0);
      camSpin.add(camSprocket);

      camGroup.name = `Camshaft_${bIdx === 0 ? 'Bank1' : 'Bank2'}_${cType === 0 ? 'Intake' : 'Exhaust'}`;
      valvetrainGroup.add(camGroup);
    });
  });

  // Genuine Multi-Link Roller Timing Chain Wrapping Around Crank & Cam Sprockets
  // Complex closed loop passing over crankshaft and cylinder head sprockets
  const chainSpline = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-2.05, 0.0, -0.95),  // Crankshaft sprocket bottom
    new THREE.Vector3(-2.05, 0.65, -0.4),  // Tensioner shoe 1
    new THREE.Vector3(-2.05, 2.3, 0.85),   // Bank 1 outer guide
    new THREE.Vector3(-2.05, 2.2, 1.6),    // Bank 1 exhaust cam sprocket
    new THREE.Vector3(-2.05, 1.6, 2.1),    // Bank 1 intake cam sprocket
    new THREE.Vector3(-2.05, 0.0, 1.2),    // Valley idler
    new THREE.Vector3(-2.05, -1.6, 2.1),   // Bank 2 intake cam sprocket
    new THREE.Vector3(-2.05, -2.2, 1.6),   // Bank 2 exhaust cam sprocket
    new THREE.Vector3(-2.05, -2.3, 0.85),  // Bank 2 outer guide
    new THREE.Vector3(-2.05, -0.65, -0.4)  // Tensioner shoe 2
  ], true);

  // Individual Chain Links modeled along spline
  const chainLinksGroup = new THREE.Group();
  chainLinksGroup.name = 'Timing_Chain_Roller_Links';
  const numLinks = 64;
  for (let k = 0; k < numLinks; k++) {
    const t = k / numLinks;
    const pt = chainSpline.getPoint(t);
    const tangent = chainSpline.getTangent(t);

    const linkGeo = new THREE.BoxGeometry(0.06, 0.045, 0.08);
    const linkMesh = new THREE.Mesh(linkGeo, materials.titaniumBright);
    linkMesh.position.copy(pt);
    linkMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), tangent);
    chainLinksGroup.add(linkMesh);

    // Roller pin
    const pinGeo = new THREE.CylinderGeometry(0.018, 0.018, 0.09, 8);
    const pinMesh = new THREE.Mesh(pinGeo, materials.titaniumAnodized);
    pinMesh.rotation.x = Math.PI / 2;
    pinMesh.position.copy(pt);
    chainLinksGroup.add(pinMesh);
  }
  valvetrainGroup.add(chainLinksGroup);

  // Hydraulic Timing Chain Tensioners (2x aluminum tensioner bodies with oil feed ports)
  [-1, 1].forEach((tSide, tIdx) => {
    const tensGroup = new THREE.Group();
    tensGroup.position.set(-2.0, tSide * 0.85, -0.3);

    const tensBodyGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.35, 16);
    const tensBody = new THREE.Mesh(tensBodyGeo, materials.alLi2099);
    tensBody.rotation.z = Math.PI / 2;
    tensGroup.add(tensBody);

    const tensShoeGeo = new THREE.BoxGeometry(0.08, 0.12, 0.65);
    const tensShoe = new THREE.Mesh(tensShoeGeo, materials.carbonMatte);
    tensShoe.position.set(-0.05, -tSide * 0.1, 0.1);
    tensGroup.add(tensShoe);

    tensGroup.name = `ChainTensioner_${tIdx}`;
    valvetrainGroup.add(tensGroup);
  });

  group.add(valvetrainGroup);

  // =========================================================================
  // 5. TURBOCHARGER ASSEMBLY (Central Exhaust Turbine + Compressor + Wastegates)
  // Mounted in V-valley / rear of engine: X = 26.2 dm, Y = 0.0 dm, Z = 2.4 dm
  // =========================================================================
  const turboGroup = new THREE.Group();
  turboGroup.name = 'Turbocharger_Assembly_2026';
  turboGroup.position.set(27.6, 0.0, 4.2); // behind the block, above the bellhousing (clear of banks & clutch)

  // Common Shaft (High-strength ceramic ball bearing supported)
  const turboShaftGeo = new THREE.CylinderGeometry(0.08, 0.08, 1.45, 16);
  const turboShaft = new THREE.Mesh(turboShaftGeo, materials.titaniumBright);
  turboShaft.rotation.z = Math.PI / 2;
  turboGroup.add(turboShaft);

  // Ceramic Bearing Center Housing (CHRA)
  const chraGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.65, 20);
  const chraMesh = new THREE.Mesh(chraGeo, materials.titaniumAnodized);
  chraMesh.rotation.z = Math.PI / 2;
  turboGroup.add(chraMesh);

  // Exhaust Turbine Wheel (Inconel 718 with 11 curved radial blades, at rear: +X)
  const turbineWheelGroup = new THREE.Group();
  turbineWheelGroup.position.set(0.55, 0, 0);

  const turbineHubGeo = new THREE.CylinderGeometry(0.14, 0.32, 0.35, 16);
  const turbineHub = new THREE.Mesh(turbineHubGeo, materials.inconelExhaust);
  turbineHub.rotation.z = Math.PI / 2;
  turbineWheelGroup.add(turbineHub);

  // 11 Curved Radial Turbine Blades
  for (let b = 0; b < 11; b++) {
    const bAngle = (b * Math.PI * 2) / 11;
    const bladeShape = new THREE.Shape();
    bladeShape.moveTo(0, 0);
    bladeShape.quadraticCurveTo(0.25, 0.15, 0.38, 0.05);
    bladeShape.lineTo(0.32, -0.05);
    bladeShape.quadraticCurveTo(0.18, 0.02, 0, -0.04);
    bladeShape.closePath();

    const bladeExtrude = { steps: 1, depth: 0.03, bevelEnabled: false };
    const bladeGeo = new THREE.ExtrudeGeometry(bladeShape, bladeExtrude);
    const bladeMesh = new THREE.Mesh(bladeGeo, materials.inconelExhaust);
    bladeMesh.position.set(0, Math.cos(bAngle) * 0.16, Math.sin(bAngle) * 0.16);
    bladeMesh.rotation.x = -bAngle + 0.35;
    bladeMesh.rotation.y = Math.PI / 2;
    turbineWheelGroup.add(bladeMesh);
  }
  turboGroup.add(turbineWheelGroup);

  // Compressor Impeller Wheel (Billet 5-axis milled Al-Li with 12 splitter blades, at front: -X)
  const compWheelGroup = new THREE.Group();
  compWheelGroup.position.set(-0.55, 0, 0);

  const compHubGeo = new THREE.CylinderGeometry(0.34, 0.12, 0.35, 16);
  const compHub = new THREE.Mesh(compHubGeo, materials.alLi2099);
  compHub.rotation.z = Math.PI / 2;
  compWheelGroup.add(compHub);

  for (let c = 0; c < 12; c++) {
    const cAngle = (c * Math.PI * 2) / 12;
    const cBladeShape = new THREE.Shape();
    cBladeShape.moveTo(0, 0);
    cBladeShape.quadraticCurveTo(0.28, 0.18, 0.42, 0.08);
    cBladeShape.lineTo(0.36, -0.04);
    cBladeShape.quadraticCurveTo(0.2, 0.03, 0, -0.03);
    cBladeShape.closePath();

    const cBladeGeo = new THREE.ExtrudeGeometry(cBladeShape, { steps: 1, depth: 0.025, bevelEnabled: false });
    const cBladeMesh = new THREE.Mesh(cBladeGeo, materials.alLi2099);
    cBladeMesh.position.set(0, Math.cos(cAngle) * 0.16, Math.sin(cAngle) * 0.16);
    cBladeMesh.rotation.x = -cAngle - 0.35;
    cBladeMesh.rotation.y = -Math.PI / 2;
    compWheelGroup.add(cBladeMesh);
  }
  turboGroup.add(compWheelGroup);

  // Dual Electronic Wastegate Flapper Valves with Linkage Arms
  [-0.45, 0.45].forEach((wY, wIdx) => {
    const wgGroup = new THREE.Group();
    wgGroup.position.set(0.65, wY, 0.35);

    // Wastegate Flapper Disc (Inconel sealing puck)
    const discGeo = new THREE.CylinderGeometry(0.16, 0.16, 0.04, 16);
    const discMesh = new THREE.Mesh(discGeo, materials.inconelExhaust);
    wgGroup.add(discMesh);

    // Pivot Arm & Actuator Rod
    const armGeo = new THREE.BoxGeometry(0.28, 0.04, 0.04);
    const armMesh = new THREE.Mesh(armGeo, materials.titaniumBright);
    armMesh.position.set(-0.14, 0, 0.08);
    wgGroup.add(armMesh);

    const rodGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.65, 8);
    const rodMesh = new THREE.Mesh(rodGeo, materials.titaniumBright);
    rodMesh.rotation.x = Math.PI / 2;
    rodMesh.position.set(-0.28, 0, 0.35);
    wgGroup.add(rodMesh);

    wgGroup.name = `Wastegate_${wIdx}`;
    turboGroup.add(wgGroup);
  });

  group.add(turboGroup);

  // =========================================================================
  // 6. 350 kW MGU-K ELECTRIC MOTOR GENERATOR UNIT (Article C5)
  // Low-slung on left engine flank: X = 23.5 dm, Y = -1.6 dm, Z = 1.4 dm
  // Hairpin copper stator windings, permanent magnet rotor, resolver
  // =========================================================================
  const mgukGroup = new THREE.Group();
  mgukGroup.name = 'Assembly_350kW_MGUK_Motor';
  mgukGroup.position.set(23.5, -2.25, 1.4); // outboard of sump and RH bank

  // Cylindrical Stator Housing with Helical Cooling Water Jacket
  const statorCasingGeo = new THREE.CylinderGeometry(0.72, 0.72, 1.6, 24);
  const statorCasing = new THREE.Mesh(statorCasingGeo, materials.alLi2099);
  statorCasing.rotation.z = Math.PI / 2;
  mgukGroup.add(statorCasing);

  // Stator Core (Laminated electrical steel teeth)
  const statorCoreGeo = new THREE.CylinderGeometry(0.66, 0.66, 1.45, 24, 1, true);
  const statorCore = new THREE.Mesh(statorCoreGeo, materials.castIronBallast || materials.titaniumAnodized);
  statorCore.rotation.z = Math.PI / 2;
  mgukGroup.add(statorCore);

  // Copper Hairpin Windings (Visible at both stator ends)
  [-0.78, 0.78].forEach((endX, endIdx) => {
    const hairpinCrownGeo = new THREE.TorusGeometry(0.55, 0.08, 12, 32);
    const hairpinCrown = new THREE.Mesh(hairpinCrownGeo, materials.copperWindings);
    hairpinCrown.rotation.y = Math.PI / 2;
    hairpinCrown.position.set(endX, 0, 0);
    hairpinCrown.name = `MGUK_CopperHairpins_${endIdx}`;
    mgukGroup.add(hairpinCrown);
  });

  // Permanent Magnet Rotor with Carbon Sleeve Containment
  const rotorGeo = new THREE.CylinderGeometry(0.42, 0.42, 1.35, 20);
  const rotorMesh = new THREE.Mesh(rotorGeo, materials.carbonSatin);
  rotorMesh.rotation.z = Math.PI / 2;
  mgukGroup.add(rotorMesh);

  // Rotor Shaft & Drive Pinion (Gears directly to crankshaft timing gear)
  const rotorShaftGeo = new THREE.CylinderGeometry(0.12, 0.12, 2.1, 16);
  const rotorShaft = new THREE.Mesh(rotorShaftGeo, materials.titaniumBright);
  rotorShaft.rotation.z = Math.PI / 2;
  mgukGroup.add(rotorShaft);

  const drivePinionGeo = new THREE.CylinderGeometry(0.28, 0.28, 0.22, 16);
  const drivePinion = new THREE.Mesh(drivePinionGeo, materials.titaniumAnodized);
  drivePinion.rotation.z = Math.PI / 2;
  drivePinion.position.set(0.95, 0, 0);
  mgukGroup.add(drivePinion);

  group.add(mgukGroup);

  return group;
}
