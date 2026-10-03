/**
 * 2026 Formula 1 "Nimble Car" Electrical Harness
 * SREdesigns - Samuel R Erwin III
 * 
 * 3D CAD for Electrical Harness & Power Distribution:
 * - 800V DC High-Voltage Shielded Cabling:
 *   * Heavy-gauge orange silicone insulated cables with inner tinned-copper braided EMI shielding
 *   * Energy Store (ES) -> Dual Silicon Carbide Inverters (PEU) -> 350 kW MGU-K motor
 *   * Machined aluminum Amphenol/Deutsch mil-spec high-voltage circular locking connectors
 *   * Ribbed strain-relief boots and high-voltage danger warning collars
 * - Low-Voltage & Sensor Harness (Raychem DR-25 heat shrink & yellow marker sleeves):
 *   * Master chassis wiring spine running through monocoque and sidepod tunnels
 *   * Front branch: brake pressure transducers, wheel speed hall sensors, strain gauge rosettes, steering angle encoder, front active wing actuator
 *   * Cockpit branch: coiled steering wheel umbilical cord, pedal load cell, BBW simulator, pyrofuse squib firing leads
 *   * SECU (McLaren Applied TAG-320/400) 128-pin mil-spec bayonet header plugs
 *   * Engine branch: 6x direct injector leads, 6x coil-on-plug harnesses, cam/crank hall sensors, turbo speed sensor, dual wastegate servos
 *   * Rear branch: active LSD valve, rear active wing Moog servo & LVDT, rain light, and vertical endplate LED strips
 * - Grounding Straps:
 *   * Flat woven tinned-copper grounding braids connecting chassis, engine block, and gearbox
 *   * Crimped ring lugs fastened with M6 titanium studs and spherical washers
 * - Energy Store (HV Battery Pack) Internal Structure:
 *   * 4x cell modules with individual cell terminals
 *   * Solid copper busbars with cross-link jumpers
 *   * Pyrofuse safety isolation breaker with pyrotechnic squib
 *   * High-voltage manual service disconnect (MSD)
 * 
 * Universal Datum:
 * - Front Axle Centerline at [0, 0, 0] on ground (Z=0)
 * - Wheelbase: 34.0 dm. Rear Axle at X = 34.0 dm.
 */

import * as THREE from 'three';
import { materials } from '../materials.js';
import { createSocketHeadBolt, createTorxScrew } from './fasteners.js';

export function createElectricalHarness(options = {}) {
  const group = new THREE.Group();
  group.name = 'Electrical_Wiring_Harness_Assembly';

  // Helper: Create a high-voltage connector
  function createHVConnector(position, direction, diameter = 0.22, length = 0.35) {
    const connGroup = new THREE.Group();
    connGroup.position.copy(position);

    // Aluminum knurled coupling nut
    const nutGeo = new THREE.CylinderGeometry(diameter, diameter, length * 0.45, 16);
    const nutMesh = new THREE.Mesh(nutGeo, materials.alLi2099);
    nutMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.clone().normalize());
    connGroup.add(nutMesh);

    // Ribbed black rubber strain-relief boot
    const bootGeo = new THREE.CylinderGeometry(diameter * 0.85, diameter * 0.65, length * 0.55, 12);
    const bootMesh = new THREE.Mesh(bootGeo, materials.siliconeSeal);
    const bootPos = position.clone().add(direction.clone().normalize().multiplyScalar(-length * 0.45));
    bootMesh.position.copy(bootPos.sub(position));
    bootMesh.quaternion.copy(nutMesh.quaternion);
    connGroup.add(bootMesh);

    // Orange safety ID ring
    const idRingGeo = new THREE.TorusGeometry(diameter * 0.9, 0.02, 8, 16);
    const idRingMesh = new THREE.Mesh(idRingGeo, materials.cableOrangeHV);
    idRingMesh.quaternion.copy(nutMesh.quaternion);
    connGroup.add(idRingMesh);

    return connGroup;
  }

  // Helper: Create low-voltage mil-spec connector
  function createLVConnector(position, direction, diameter = 0.12, length = 0.22) {
    const conn = new THREE.Group();
    conn.position.copy(position);

    const bodyGeo = new THREE.CylinderGeometry(diameter, diameter, length, 12);
    const bodyMesh = new THREE.Mesh(bodyGeo, materials.titaniumAnodized);
    bodyMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.clone().normalize());
    conn.add(bodyMesh);

    // Yellow heat-shrink label band
    const labelGeo = new THREE.CylinderGeometry(diameter * 1.05, diameter * 1.05, length * 0.35, 12);
    const labelMesh = new THREE.Mesh(labelGeo, materials.heatShieldGold);
    labelMesh.quaternion.copy(bodyMesh.quaternion);
    conn.add(labelMesh);

    return conn;
  }

  // =========================================================================
  // 1. HIGH-VOLTAGE (800V DC) POWER CABLES (Orange Shielded 70mm² Conduits)
  // Routes:
  // - Cable 1: Energy Store (+ / -) to Dual SiC Inverters (Gearbox top/sides)
  // - Cable 2: Dual SiC Inverters to 350 kW MGU-K (Engine lower left)
  // =========================================================================
  const hvGroup = new THREE.Group();
  hvGroup.name = 'High_Voltage_800V_Network';

  // HV Cable 1 (DC Bus): From Energy Store rear face (X = 20.9, Y = 0.4, Z = 1.8)
  // to Left Inverter (X = 28.2, Y = -1.2, Z = 3.6)
  const hvSpline1 = new THREE.CatmullRomCurve3([
    new THREE.Vector3(20.9, 0.4, 1.8),
    new THREE.Vector3(21.6, 0.5, 1.9),
    new THREE.Vector3(22.8, -0.6, 2.4),
    new THREE.Vector3(25.0, -1.0, 3.0),
    new THREE.Vector3(27.0, -1.15, 3.4),
    new THREE.Vector3(28.2, -1.2, 3.6)
  ]);
  const hvGeo1 = new THREE.TubeGeometry(hvSpline1, 32, 0.11, 12, false);
  const hvMesh1 = new THREE.Mesh(hvGeo1, materials.cableOrangeHV);
  hvMesh1.name = 'HVCable_ES_to_Inverter_Left';
  hvGroup.add(hvMesh1);

  // HV Cable 2 (DC Bus): From Energy Store rear face (X = 20.9, Y = -0.4, Z = 1.8)
  // to Right Inverter (X = 28.2, Y = 1.2, Z = 3.6)
  const hvSpline2 = new THREE.CatmullRomCurve3([
    new THREE.Vector3(20.9, -0.4, 1.8),
    new THREE.Vector3(21.6, -0.5, 1.9),
    new THREE.Vector3(22.8, 0.6, 2.4),
    new THREE.Vector3(25.0, 1.0, 3.0),
    new THREE.Vector3(27.0, 1.15, 3.4),
    new THREE.Vector3(28.2, 1.2, 3.6)
  ]);
  const hvGeo2 = new THREE.TubeGeometry(hvSpline2, 32, 0.11, 12, false);
  const hvMesh2 = new THREE.Mesh(hvGeo2, materials.cableOrangeHV);
  hvMesh2.name = 'HVCable_ES_to_Inverter_Right';
  hvGroup.add(hvMesh2);

  // HV 3-Phase AC Feeder Cables: From Inverters (X = 28.2) to MGU-K Motor (X = 23.5, Y = -2.25, Z = 1.4)
  [-0.12, 0.0, 0.12].forEach((offsetY, phaseIdx) => {
    const mgukSpline = new THREE.CatmullRomCurve3([
      new THREE.Vector3(28.0, -1.2 + offsetY, 3.5),
      new THREE.Vector3(26.5, -1.35 + offsetY, 2.8),
      new THREE.Vector3(25.0, -1.9 + offsetY, 2.0),
      new THREE.Vector3(23.5, -2.25 + offsetY * 0.8, 1.4)
    ]);
    const mgukCableGeo = new THREE.TubeGeometry(mgukSpline, 24, 0.075, 10, false);
    const mgukCableMesh = new THREE.Mesh(mgukCableGeo, materials.cableOrangeHV);
    mgukCableMesh.name = `HVCable_Phase_${['U', 'V', 'W'][phaseIdx]}_Inverter_to_MGUK`;
    hvGroup.add(mgukCableMesh);
  });

  // High-Voltage Connectors at terminations
  hvGroup.add(createHVConnector(new THREE.Vector3(20.9, 0.4, 1.8), new THREE.Vector3(1, 0, 0)));
  hvGroup.add(createHVConnector(new THREE.Vector3(20.9, -0.4, 1.8), new THREE.Vector3(1, 0, 0)));
  hvGroup.add(createHVConnector(new THREE.Vector3(28.2, -1.2, 3.6), new THREE.Vector3(-1, 0, 0)));
  hvGroup.add(createHVConnector(new THREE.Vector3(28.2, 1.2, 3.6), new THREE.Vector3(-1, 0, 0)));
  hvGroup.add(createHVConnector(new THREE.Vector3(23.5, -2.25, 1.4), new THREE.Vector3(1, 0, 0.5)));

  group.add(hvGroup);

  // =========================================================================
  // 2. LOW-VOLTAGE (12V / 48V) CHASSIS & SENSOR HARNESS (Raychem DR-25 Sleeved)
  // Complex multi-branch loom connecting the vehicle electrical systems
  // =========================================================================
  const lvGroup = new THREE.Group();
  lvGroup.name = 'Low_Voltage_Control_Harness';

  // Master Spine (Runs along cockpit right floor tunnel from Bulkhead B-B to SECU)
  const masterSpine = new THREE.CatmullRomCurve3([
    new THREE.Vector3(6.5, 0.8, 1.8),   // Front chassis interface
    new THREE.Vector3(9.0, 1.1, 1.6),   // Cockpit right sill
    new THREE.Vector3(13.0, 1.25, 1.6),  // Beside driver seat
    new THREE.Vector3(16.5, 2.1, 2.0),   // Behind driver bulkhead, beside battery/fuel cell
    new THREE.Vector3(18.6, 1.75, 5.0),  // Up the fuel cell flank to SECU mounting plate
    new THREE.Vector3(21.0, 1.6, 4.0),   // Down the rear face of the fuel cell
    new THREE.Vector3(22.0, 0.4, 2.6)    // Engine interface
  ]);
  const spineGeo = new THREE.TubeGeometry(masterSpine, 48, 0.08, 10, false);
  const spineMesh = new THREE.Mesh(spineGeo, materials.harnessBlack);
  spineMesh.name = 'Harness_Master_Chassis_Spine';
  lvGroup.add(spineMesh);

  // Front Sub-Harness (Splits at Bulkhead B-B to left and right front suspension corners)
  [-1, 1].forEach(side => {
    // Front suspension corner loom (wheel speed, brake pressure, pushrod strain gauge)
    const frontCornerSpline = new THREE.CatmullRomCurve3([
      new THREE.Vector3(6.5, side * 0.8, 1.8),
      new THREE.Vector3(4.5, side * 1.4, 2.0),
      new THREE.Vector3(2.5, side * 2.8, 2.2), // Upper wishbone route
      new THREE.Vector3(0.5, side * 5.2, 2.4), // Upright sensor junction
      new THREE.Vector3(0.0, side * 6.2, 2.5)  // Brake caliper & reluctor sensor
    ]);
    const fCornerGeo = new THREE.TubeGeometry(frontCornerSpline, 28, 0.045, 8, false);
    const fCornerMesh = new THREE.Mesh(fCornerGeo, materials.harnessBlack);
    fCornerMesh.name = `Harness_FrontCorner_${side > 0 ? 'Left' : 'Right'}`;
    lvGroup.add(fCornerMesh);

    // Front Wing Active Aero Actuator Feeder (Runs forward along nosecone)
    const noseSpline = new THREE.CatmullRomCurve3([
      new THREE.Vector3(6.5, side * 0.4, 1.8),
      new THREE.Vector3(3.0, side * 0.35, 1.9),
      new THREE.Vector3(0.0, side * 0.25, 1.8),
      new THREE.Vector3(-4.0, side * 0.15, 1.5),
      new THREE.Vector3(-8.5, side * 0.1, 1.2) // Nose tip active wing servo
    ]);
    const noseGeo = new THREE.TubeGeometry(noseSpline, 32, 0.04, 8, false);
    const noseMesh = new THREE.Mesh(noseGeo, materials.harnessBlack);
    noseMesh.name = `Harness_FrontActiveWing_${side > 0 ? 'L' : 'R'}`;
    lvGroup.add(noseMesh);

    lvGroup.add(createLVConnector(new THREE.Vector3(-8.5, side * 0.1, 1.2), new THREE.Vector3(-1, 0, 0)));
    lvGroup.add(createLVConnector(new THREE.Vector3(0.0, side * 6.2, 2.5), new THREE.Vector3(0, side, 0)));
  });

  // Cockpit Steering Wheel Umbilical Cord (Coiled spring helix from dash to wheel hub)
  const coilPoints = [];
  const numCoils = 14;
  for (let i = 0; i <= 100; i++) {
    const t = i / 100;
    const angle = t * numCoils * Math.PI * 2;
    const x = 9.8 + t * 0.8;
    const y = Math.cos(angle) * 0.09;
    const z = 4.4 + Math.sin(angle) * 0.09;
    coilPoints.push(new THREE.Vector3(x, y, z));
  }
  const coilSpline = new THREE.CatmullRomCurve3(coilPoints);
  const coilGeo = new THREE.TubeGeometry(coilSpline, 120, 0.02, 8, false);
  const coilMesh = new THREE.Mesh(coilGeo, materials.harnessBlack);
  coilMesh.name = 'Harness_SteeringWheel_CoiledUmbilical';
  lvGroup.add(coilMesh);

  // Pedal Sled & BBW Sensor Harness (Load cell, linear potentiometer, fail-safe microswitches)
  const pedalSpline = new THREE.CatmullRomCurve3([
    new THREE.Vector3(9.0, 0.5, 1.6),
    new THREE.Vector3(7.2, 0.2, 1.3),
    new THREE.Vector3(6.5, 0.0, 1.1) // Pedal load cell interface
  ]);
  const pedalHarnessGeo = new THREE.TubeGeometry(pedalSpline, 16, 0.035, 8, false);
  const pedalHarnessMesh = new THREE.Mesh(pedalHarnessGeo, materials.harnessBlack);
  pedalHarnessMesh.name = 'Harness_PedalBox_LoadCell';
  lvGroup.add(pedalHarnessMesh);

  // Engine Sensor & Actuator Loom (Distributes across V6 heads)
  // Left Cylinder Head Loom (Bank 1: Injectors, Coils, VVT, EGT)
  const bank1Spline = new THREE.CatmullRomCurve3([
    new THREE.Vector3(22.0, 0.4, 2.6),
    new THREE.Vector3(23.2, 0.8, 3.2),
    new THREE.Vector3(24.5, 0.9, 3.4),
    new THREE.Vector3(26.0, 0.85, 3.4)
  ]);
  const bank1Geo = new THREE.TubeGeometry(bank1Spline, 20, 0.05, 8, false);
  const bank1Mesh = new THREE.Mesh(bank1Geo, materials.harnessBlack);
  bank1Mesh.name = 'Harness_Engine_Bank1_V6';
  lvGroup.add(bank1Mesh);

  // Right Cylinder Head Loom (Bank 2: Injectors, Coils, VVT, EGT)
  const bank2Spline = new THREE.CatmullRomCurve3([
    new THREE.Vector3(22.0, -0.4, 2.6),
    new THREE.Vector3(23.2, -0.8, 3.2),
    new THREE.Vector3(24.5, -0.9, 3.4),
    new THREE.Vector3(26.0, -0.85, 3.4)
  ]);
  const bank2Geo = new THREE.TubeGeometry(bank2Spline, 20, 0.05, 8, false);
  const bank2Mesh = new THREE.Mesh(bank2Geo, materials.harnessBlack);
  bank2Mesh.name = 'Harness_Engine_Bank2_V6';
  lvGroup.add(bank2Mesh);

  // Injector & Coil Taps on Bank 1 & 2
  [1, -1].forEach(side => {
    for (let c = 0; c < 3; c++) {
      const cylX = 23.5 + c * 1.1;
      const tapSpline = new THREE.CatmullRomCurve3([
        new THREE.Vector3(cylX, side * 0.85, 3.4),
        new THREE.Vector3(cylX, side * 0.55, 3.2),
        new THREE.Vector3(cylX, side * 0.35, 3.0) // Coil plug
      ]);
      const tapGeo = new THREE.TubeGeometry(tapSpline, 10, 0.022, 6, false);
      const tapMesh = new THREE.Mesh(tapGeo, materials.harnessBlack);
      tapMesh.name = `Harness_SparkCoil_${side > 0 ? 'B1' : 'B2'}_Cyl${c + 1}`;
      lvGroup.add(tapMesh);
    }
  });

  // Rear Sub-Harness (Runs from Engine to Gearbox, Differential, and Rear Active Wing)
  const rearSpline = new THREE.CatmullRomCurve3([
    new THREE.Vector3(22.0, 0.0, 2.6),
    new THREE.Vector3(25.5, 0.0, 2.8),
    new THREE.Vector3(28.5, 0.0, 3.8),
    new THREE.Vector3(31.5, 0.0, 3.8),
    new THREE.Vector3(34.0, 0.0, 3.8),
    new THREE.Vector3(36.0, 0.0, 3.3) // Top of rear impact structure / rain light
  ]);
  const rearGeo = new THREE.TubeGeometry(rearSpline, 36, 0.055, 8, false);
  const rearMesh = new THREE.Mesh(rearGeo, materials.harnessBlack);
  rearMesh.name = 'Harness_Rear_Transmission_Spine';
  lvGroup.add(rearMesh);

  // Rear Rain Light & Active Wing Feeder Cables
  // Rain Light Connector at X = 36.0, Y = 0.0, Z = 3.3 (top of rear impact structure)
  lvGroup.add(createLVConnector(new THREE.Vector3(36.0, 0.0, 3.3), new THREE.Vector3(1, 0, 0)));

  // Rear Active Wing Vertical Pylon Wiring (Running up the dual rear wing pylons to active flap & LED strips)
  [-1, 1].forEach(side => {
    const rwPylonSpline = new THREE.CatmullRomCurve3([
      new THREE.Vector3(34.0, side * 1.5, 3.8),
      new THREE.Vector3(35.5, side * 2.2, 4.6),
      new THREE.Vector3(37.0, side * 3.5, 5.4),  // stays inboard of the rear tyres
      new THREE.Vector3(37.9, side * 4.55, 6.0)  // rain LED strip on the endplate inner face
    ]);
    const rwPylonGeo = new THREE.TubeGeometry(rwPylonSpline, 24, 0.035, 8, false);
    const rwPylonMesh = new THREE.Mesh(rwPylonGeo, materials.harnessBlack);
    rwPylonMesh.name = `Harness_RearWing_EndplateLED_${side > 0 ? 'L' : 'R'}`;
    lvGroup.add(rwPylonMesh);
  });

  // FIA Standard ECU (McLaren Applied TAG-320/400) Aluminum Billet Housing with 3x Mil-Spec Headers
  const ecuGroup = new THREE.Group();
  ecuGroup.name = 'Assembly_SECU_EngineControlUnit';
  ecuGroup.position.set(19.2, 0.55, 5.4); // on top of the fuel cell (top face Z 5.2)

  const ecuBoxGeo = new THREE.BoxGeometry(0.85, 1.45, 0.35);
  const ecuBoxMesh = new THREE.Mesh(ecuBoxGeo, materials.alLi2099);
  ecuGroup.add(ecuBoxMesh);

  // 3x 128-Pin Circular Mil-Spec Header Receptacles
  [-0.4, 0.0, 0.4].forEach((yOff, rIdx) => {
    const hdrGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.08, 16);
    const hdrMesh = new THREE.Mesh(hdrGeo, materials.titaniumAnodized);
    hdrMesh.rotation.x = Math.PI / 2;
    hdrMesh.position.set(0.44, yOff, 0);
    ecuGroup.add(hdrMesh);

    // Mating plug from harness
    const plug = createLVConnector(new THREE.Vector3(19.64, 0.55 + yOff, 2.5), new THREE.Vector3(1, 0, 0), 0.1, 0.18);
    lvGroup.add(plug);
  });

  // 4x M4 Mounting Screws
  [-0.35, 0.35].forEach(xO => {
    [-0.65, 0.65].forEach(yO => {
      const screw = createTorxScrew({
        headRadius: 0.035,
        headHeight: 0.02,
        lobeRadius: 0.02,
        shankRadius: 0.02,
        shankLength: 0.04,
        material: materials.titaniumBright
      });
      screw.position.set(xO, yO, 0.18);
      screw.name = 'ECU_MountScrew';
      ecuGroup.add(screw);
    });
  });

  lvGroup.add(ecuGroup);
  group.add(lvGroup);

  // =========================================================================
  // 3. GROUNDING STRAPS (Flat Woven Tinned-Copper Braids)
  // Low-impedance safety bonding between chassis, PU, and transmission
  // =========================================================================
  const groundGroup = new THREE.Group();
  groundGroup.name = 'Grounding_Bonding_Straps';

  // Ground Strap 1: Monocoque Ground Stud to V6 Engine Block
  const gBraid1Spline = new THREE.CatmullRomCurve3([
    new THREE.Vector3(17.2, -1.5, 1.5),
    new THREE.Vector3(18.8, -1.4, 1.4),
    new THREE.Vector3(20.5, -1.4, 1.4),
    new THREE.Vector3(21.8, -0.6, 1.4)
  ]);
  // Flat braided ribbon geometry
  const gBraid1Geo = new THREE.TubeGeometry(gBraid1Spline, 16, 0.06, 4, false);
  gBraid1Geo.scale(1.0, 0.35, 2.0); // Flatten into a ribbon
  const gBraid1Mesh = new THREE.Mesh(gBraid1Geo, materials.copperWindings);
  gBraid1Mesh.name = 'GroundBraid_Chassis_to_Engine';
  groundGroup.add(gBraid1Mesh);

  // Terminal Lugs with M6 Titanium Studs at both ends
  [
    new THREE.Vector3(17.2, -1.5, 1.5),
    new THREE.Vector3(21.8, -0.6, 1.4)
  ].forEach((gPos, idx) => {
    const lugGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.03, 12);
    const lugMesh = new THREE.Mesh(lugGeo, materials.copperWindings);
    lugMesh.position.copy(gPos);
    groundGroup.add(lugMesh);

    const stud = createSocketHeadBolt({
      headRadius: 0.07,
      headHeight: 0.04,
      hexRadius: 0.04,
      hexDepth: 0.025,
      shankRadius: 0.035,
      shankLength: 0.06,
      material: materials.titaniumBright
    });
    stud.position.copy(gPos);
    stud.name = `GroundStud_${idx}`;
    groundGroup.add(stud);
  });

  // Ground Strap 2: Engine Block to Titanium Gearbox Casing
  const gBraid2Spline = new THREE.CatmullRomCurve3([
    new THREE.Vector3(26.8, 0.0, 1.6),
    new THREE.Vector3(27.4, 0.15, 1.7),
    new THREE.Vector3(28.2, 0.0, 1.9)
  ]);
  const gBraid2Geo = new THREE.TubeGeometry(gBraid2Spline, 12, 0.06, 4, false);
  gBraid2Geo.scale(1.0, 0.35, 2.0);
  const gBraid2Mesh = new THREE.Mesh(gBraid2Geo, materials.copperWindings);
  gBraid2Mesh.name = 'GroundBraid_Engine_to_Gearbox';
  groundGroup.add(gBraid2Mesh);

  group.add(groundGroup);

  // =========================================================================
  // 4. HIGH-VOLTAGE ENERGY STORE (BATTERY PACK) INTERNAL DETAILS
  // 4.0 MJ Usable, 35.0 kg min weight, 800V DC immersion-cooled architecture
  // Located under the fuel cell, behind the seat back:
  // X = 17.5 dm to 20.9 dm, Y = [-1.24, 1.24], Z = [1.0, 2.2] (scaled to fit the tub's lower section)
  // =========================================================================
  const esGroup = new THREE.Group();
  esGroup.name = 'Assembly_EnergyStore_Battery_Internals';
  esGroup.position.set(19.2, 0.0, 1.6);
  esGroup.scale.set(1.0, 0.65, 0.85); // fits inside the tub's elliptical floor section

  // Lightweight Al-Li / Carbon Hybrid Ballistic Enclosure
  const esBoxGeo = new THREE.BoxGeometry(3.4, 3.8, 1.4);
  const esBoxMesh = new THREE.Mesh(esBoxGeo, materials.carbonSatin);
  esBoxMesh.name = 'ES_Ballistic_Enclosure';
  esGroup.add(esBoxMesh);

  // 4x Discrete Lithium-Ion Cell Modules inside
  [-0.9, 0.9].forEach((xOff, mX) => {
    [-1.0, 1.0].forEach((yOff, mY) => {
      const moduleGroup = new THREE.Group();
      moduleGroup.position.set(xOff, yOff, 0);

      // Aluminum cooling sleeve / thermal cold plate
      const modSleeveGeo = new THREE.BoxGeometry(1.4, 1.6, 1.1);
      const modSleeveMesh = new THREE.Mesh(modSleeveGeo, materials.alLi2099);
      moduleGroup.add(modSleeveMesh);

      // Discrete Cell Terminal Matrix (8x8 copper terminal studs per module = 64 cells visible)
      for (let cx = -3; cx <= 3; cx += 2) {
        for (let cy = -3; cy <= 3; cy += 2) {
          const termGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.04, 8);
          const termMesh = new THREE.Mesh(termGeo, materials.copperWindings);
          termMesh.position.set(cx * 0.18, cy * 0.18, 0.56);
          moduleGroup.add(termMesh);
        }
      }

      // Copper Interconnect Busbars bridging rows
      [-0.36, 0.0, 0.36].forEach(barX => {
        const barGeo = new THREE.BoxGeometry(0.08, 1.2, 0.02);
        const barMesh = new THREE.Mesh(barGeo, materials.copperWindings);
        barMesh.position.set(barX, 0, 0.58);
        moduleGroup.add(barMesh);
      });

      moduleGroup.name = `ES_CellModule_${mX}_${mY}`;
      esGroup.add(moduleGroup);
    });
  });

  // Pyrofuse Safety Breaker (Pyrotechnic HV isolation switch: cuts circuit in <0.005s)
  const pyrofuseGroup = new THREE.Group();
  pyrofuseGroup.position.set(1.5, 0.0, 0.3);

  const pyroBodyGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.45, 16);
  const pyroBodyMesh = new THREE.Mesh(pyroBodyGeo, materials.titaniumAnodized);
  pyrofuseGroup.add(pyroBodyMesh);

  const squibCapGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.12, 16);
  const squibCapMesh = new THREE.Mesh(squibCapGeo, materials.alLi2099);
  squibCapMesh.position.z = 0.25;
  pyrofuseGroup.add(squibCapMesh);

  pyrofuseGroup.name = 'ES_Pyrofuse_HV_Disconnector';
  esGroup.add(pyrofuseGroup);

  group.add(esGroup);

  // =========================================================================
  // 5. FUEL CELL (simplified safety bladder)
  // Sits between the driver's seat back (X ~15.8) and Bulkhead D-D (X 22.0),
  // directly above the energy store. X = 16.9-21.5, Y = [-1.9, 1.9], Z = [2.3, 5.2]
  // =========================================================================
  const fuelGroup = new THREE.Group();
  fuelGroup.name = 'Assembly_FuelCell';
  fuelGroup.position.set(19.2, 0.0, 3.75);

  const fuelCellGeo = new THREE.BoxGeometry(4.6, 3.8, 2.9);
  const fuelCellMesh = new THREE.Mesh(fuelCellGeo, materials.carbonMatte);
  fuelCellMesh.name = 'FuelCell_Bladder';
  fuelGroup.add(fuelCellMesh);

  // Refuelling/breather coupling on the left upper flank
  const fillerGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.2, 20);
  const fillerMesh = new THREE.Mesh(fillerGeo, materials.alLi2099);
  fillerMesh.position.set(-1.2, 1.98, 0.9);
  fillerMesh.name = 'FuelCell_FillerCoupling';
  fuelGroup.add(fillerMesh);

  // Fuel pump / collector access plate on the rear face (toward the engine)
  const pumpPlateGeo = new THREE.BoxGeometry(0.06, 1.2, 0.9);
  const pumpPlateMesh = new THREE.Mesh(pumpPlateGeo, materials.alLi2099);
  pumpPlateMesh.position.set(2.33, 0, -0.6);
  pumpPlateMesh.name = 'FuelCell_PumpAccessPlate';
  fuelGroup.add(pumpPlateMesh);

  group.add(fuelGroup);

  return group;
}
