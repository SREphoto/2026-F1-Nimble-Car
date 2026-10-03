/**
 * 2026 Formula 1 "Nimble Car" Assembly
 * SREdesigns - Samuel R Erwin III
 * 
 * 3D CAD Assembly for the 2026 Formula 1 "Nimble Car".
 * Integrates 10 specialized vehicle subsystems:
 * 1. Monocoque & Cockpit (Chassis, SIPS, Ti Halo, Roll Hoop, Steering Column, Wheel, Pedals, Extinguisher)
 * 2. Cockpit Accessories & Driver (FIA ABP Helmet, Visor, Mirrors with 14-LED array, T-Cam, Pitot, Antennas)
 * 3. Detailed Carbon Brakes (Al-Li monobloc calipers, 1400+ hole carbon discs, floating bobbins, lines, tone rings)
 * 4. Electrical Wiring Harness (800V orange HV cables, Raychem LV loom, grounding braids, Energy Store battery internals)
 * 5. Powertrain Moving Internals (1.6L V6 block, crank, conrods, pistons with 3 rings, DOHC valvetrain, timing chain, turbocharger, 350kW MGU-K)
 * 6. Transmission & Moving Gears (Gearbox casing, 8-speed gears with dog teeth, selector barrel, shift forks, carbon clutch, active LSD, tripod CV driveshafts, RIS rain light)
 * 7. Suspension & Steering (Aerodynamic wishbones, pull/push-rods, bellcranks, dampers, HPAS rack & pinion, Zylon tethers, 18" forged magnesium wheels with concave covers, Pirelli tires)
 * 8. Floor & Aero Surfaces (Carbon floor, leading edge strakes, stepped edge wings, Jabroc plank with titanium skid pucks, rear 10.5° diffuser with keel and fences)
 * 9. Active Wings & Bodywork (2-stage active front wing, FIS nosecone, sidepods with internal radiators, dorsal shark fin, Inconel exhaust, active rear wing with vertical rain LED strips)
 * 10. Fasteners & Physical Hardware (Hex sockets, Torx lobes, 12-point jet nuts, banjo bolts with lock-wire)
 * 
 * Provides kinematic state updates:
 * - updateKinematics({ rpm, speedKmH, steerRad, aeroMode, gear, brakePedal, explodedProgress })
 */

import * as THREE from 'three';
import { materials } from '../materials.js';
import { createMonocoqueCockpit } from './monocoque_cockpit.js';
import { createCockpitAccessories } from './cockpit_accessories_driver.js';
import { createDetailedBrakes } from './brakes_detailed.js';
import { createElectricalHarness } from './electrical_wiring_harness.js';
import { createPowertrainInternals } from './powertrain_moving_internals.js';
import { createTransmissionGears } from './transmission_moving_gears.js';
import { createSuspensionSteering } from './suspension_steering_assembly.js';
import { createFloorAeroSurfaces } from './floor_aero_surfaces.js';
import { createActiveWingsBodywork } from './active_wings_bodywork.js';

export function createFullCarAssembly(options = {}) {
  const masterCar = new THREE.Group();
  masterCar.name = 'F1_2026_Nimble_Car_SREdesigns';

  // Subassembly Containers
  const subassemblies = {};

  // 1. Monocoque & Cockpit
  subassemblies.monocoque = createMonocoqueCockpit(options);
  masterCar.add(subassemblies.monocoque);

  // 2. Cockpit Accessories & Driver
  subassemblies.cockpitAccessories = createCockpitAccessories(options);
  masterCar.add(subassemblies.cockpitAccessories);

  // 3. Detailed Friction Brakes (Front & Rear Corners)
  subassemblies.brakes = createDetailedBrakes(options);
  masterCar.add(subassemblies.brakes);

  // 4. Electrical Wiring Harness & Energy Store
  subassemblies.electrical = createElectricalHarness(options);
  masterCar.add(subassemblies.electrical);

  // 5. Powertrain Moving Internals (1.6L V6 + Turbo + MGU-K)
  subassemblies.powertrain = createPowertrainInternals(options);
  masterCar.add(subassemblies.powertrain);

  // 6. Transmission, Gears & Drivetrain
  subassemblies.transmission = createTransmissionGears(options);
  masterCar.add(subassemblies.transmission);

  // 7. Suspension, Steering, Wheels & Tyres
  subassemblies.suspension = createSuspensionSteering(options);
  masterCar.add(subassemblies.suspension);

  // 8. Underbody Floor, Jabroc Plank & Rear Diffuser
  subassemblies.floor = createFloorAeroSurfaces(options);
  masterCar.add(subassemblies.floor);

  // 9. Active Wings & Sculpted Bodywork
  subassemblies.bodywork = createActiveWingsBodywork(options);
  masterCar.add(subassemblies.bodywork);

  // Cache movable kinematic nodes for high-performance 60fps animation
  const kinematics = {
    crankshaft: subassemblies.powertrain.getObjectByName('Kinematic_Crankshaft_Assembly'),
    valvetrain: subassemblies.powertrain.getObjectByName('Kinematic_DOHC_Valvetrain_Assembly'),
    // only the rotating parts spin (housings stay bolted to the engine)
    turbocharger: subassemblies.powertrain.getObjectByName('Kinematic_Turbo_Rotor') || subassemblies.powertrain.getObjectByName('Turbocharger_Assembly_2026'),
    mguk: subassemblies.powertrain.getObjectByName('Kinematic_MGUK_Rotor') || subassemblies.powertrain.getObjectByName('Assembly_350kW_MGUK_Motor'),
    gears: subassemblies.transmission.getObjectByName('Kinematic_8Speed_GearTrain_Assembly'),
    driveshafts: subassemblies.transmission.getObjectByName('Kinematic_Driveshafts_Assembly'),
    steeringRack: subassemblies.suspension.getObjectByName('Steering_Rack_Bar'), // only the bar slides
    rearLeftUpright: subassemblies.suspension.getObjectByName('Rear_Upright_Left'),
    rearRightUpright: subassemblies.suspension.getObjectByName('Rear_Upright_Right'),
    rearLeftBrake: subassemblies.brakes.getObjectByName('Brake_Rear_Left_Pivot'),
    rearRightBrake: subassemblies.brakes.getObjectByName('Brake_Rear_Right_Pivot'),
    frontSuspension: subassemblies.suspension.getObjectByName('Front_Suspension_Assembly'),
    rearSuspension: subassemblies.suspension.getObjectByName('Rear_Suspension_Assembly'),
    frontLeftPivot: subassemblies.suspension.getObjectByName('Front_Upright_Pivot_Left'),
    frontRightPivot: subassemblies.suspension.getObjectByName('Front_Upright_Pivot_Right'),
    frontLeftBrake: subassemblies.brakes.getObjectByName('Brake_Front_Left_Pivot'),
    frontRightBrake: subassemblies.brakes.getObjectByName('Brake_Front_Right_Pivot'),
    frontSuspLeft: subassemblies.suspension.getObjectByName('Front_Suspension_Left'),
    frontSuspRight: subassemblies.suspension.getObjectByName('Front_Suspension_Right'),
    rearSuspLeft: subassemblies.suspension.getObjectByName('Rear_Suspension_Left'),
    rearSuspRight: subassemblies.suspension.getObjectByName('Rear_Suspension_Right'),
    steeringWheel: subassemblies.monocoque.getObjectByName('McLaren_PCU8D_FullAssembly') || subassemblies.monocoque.getObjectByName('Pivot_Steering_Wheel_Assembly'),
    frontWingFlaps: [
      subassemblies.bodywork.getObjectByName('FrontWing_ActiveFlap_Left'),
      subassemblies.bodywork.getObjectByName('FrontWing_ActiveFlap_Right')
    ],
    rearWingFlap: subassemblies.bodywork.getObjectByName('RearWing_Active_UpperFlap'),
    frontAero: subassemblies.bodywork.getObjectByName('Assembly_Active_Front_Aero'),
    rearWing: subassemblies.bodywork.getObjectByName('Assembly_Active_Rear_Wing'),
    wheelSpindles: [],
    driveshaftSpins: [],
    camSpins: []
  };

  // Find all wheel spindles in the car assembly
  masterCar.traverse(child => {
    if (child.isGroup && child.name && child.name.startsWith('Wheel_Spindle_')) {
      kinematics.wheelSpindles.push(child);
    }
    if (child.isGroup && child.name === 'Kinematic_CamSpin') {
      kinematics.camSpins.push(child);
    }
    if (child.isGroup && child.name && child.name.startsWith('Driveshaft_Spin_')) {
      kinematics.driveshaftSpins.push(child);
    }
  });

  // Base positions for exploded view offsets
  const basePositions = new Map();
  masterCar.traverse(child => {
    if (child.isMesh || child.isGroup) {
      basePositions.set(child, child.position.clone());
    }
  });

  /**
   * updateKinematics: Dynamically articulate all moving parts of the car
   * @param {Object} state - Telemetry and state machine inputs
   */
  masterCar.updateKinematics = function(state = {}) {
    const {
      rpm = 0,
      speedKmH = 0,
      steeringAngle = 0, // radians
      aeroMode = 'Z_MODE', // 'Z_MODE' (high downforce) or 'X_MODE' (low drag)
      gear = 1,
      brakeKgf = 0,
      explodedProgress = 0, // 0.0 (assembled) to 1.0 (fully exploded)
      // Wheel travel relative to the chassis in dm (+ = bump / wheel up), per corner
      suspensionTravel = null
    } = state;

    const dt = 1 / 60;

    // 1. Powertrain Kinematics (Crankshaft, Camshafts, Turbo, MGU-K)
    if (rpm > 0) {
      const crankAngularVelocity = (rpm * 2 * Math.PI) / 60;
      if (kinematics.crankshaft) {
        kinematics.crankshaft.rotation.x += crankAngularVelocity * dt;
        // pistons and rods follow the crank
        const setCrank = subassemblies.powertrain.userData.setCrankAngle;
        if (setCrank) setCrank(kinematics.crankshaft.rotation.x);
      }
      // Camshafts turn at half crankshaft speed (4-stroke cycle), each about its own axis
      kinematics.camSpins.forEach(c => { c.rotation.x += (crankAngularVelocity * 0.5) * dt; });
      if (kinematics.turbocharger) {
        // Turbo spins up to 125,000 rpm
        const turboRpm = Math.min(125000, rpm * 8.5);
        kinematics.turbocharger.rotation.x += ((turboRpm * 2 * Math.PI) / 60) * dt;
      }
      if (kinematics.mguk) {
        // MGU-K geared to engine crankshaft
        kinematics.mguk.rotation.x += (crankAngularVelocity * 1.8) * dt;
      }
    }

    // 2. Drivetrain & Wheel Spindle Rotation (Proportional to vehicle velocity)
    if (speedKmH > 0) {
      // Tyre radius = 0.355 m (3.55 dm). Circumference = 2 * PI * 0.355 = 2.23 m
      const wheelRps = (speedKmH * 1000 / 3600) / 2.23;
      const wheelAngVel = wheelRps * 2 * Math.PI;

      // Each (slightly inclined) driveshaft spins about its own axis
      kinematics.driveshaftSpins.forEach(ds => { ds.rotation.y -= wheelAngVel * dt; });

      kinematics.wheelSpindles.forEach(spindle => {
        if (spindle) {
          spindle.rotation.y -= wheelAngVel * dt;
        }
      });
    }

    // 3. Steering Kinematics & Full Suspension Articulation
    if (kinematics.steeringWheel) {
      kinematics.steeringWheel.rotation.z = -steeringAngle * 2.5; // Steering column ratio
    }
    // Only the uprights steer and travel; inner wishbone, push/pull-rod and track-rod mounts
    // stay on the chassis and the links are re-solved between the two ends each frame.
    if (kinematics.steeringRack) {
      // Rack bar slides with the steering-arm tip (arm 0.35 dm ahead of the kingpin)
      kinematics.steeringRack.position.y = Math.sin(steeringAngle) * 0.35;
    }
    const travel = { fl: 0, fr: 0, rl: 0, rr: 0, ...(suspensionTravel || {}) };
    const setCorner = (upright, brake, t, steer) => {
      if (upright) {
        const base = upright.userData.basePosition;
        if (base) upright.position.z = base.z + t;
        if (steer !== null) upright.rotation.z = -steer;
      }
      if (brake && steer !== null) brake.rotation.z = -steer; // height follows travel in the datum reset below
    };
    setCorner(kinematics.frontLeftPivot, kinematics.frontLeftBrake, travel.fl, steeringAngle);
    setCorner(kinematics.frontRightPivot, kinematics.frontRightBrake, travel.fr, steeringAngle);
    setCorner(kinematics.rearLeftUpright, kinematics.rearLeftBrake, travel.rl, null);
    setCorner(kinematics.rearRightUpright, kinematics.rearRightBrake, travel.rr, null);
    if (subassemblies.suspension.userData.updateLinks) subassemblies.suspension.userData.updateLinks();
    // Driveshafts: outer CV joint rides up and down with the rear hub, inner joint stays at the diff
    if (kinematics.driveshafts) {
      kinematics.driveshafts.children.forEach(ds => {
        const d = ds.userData.driveshaft;
        if (!d) return;
        const t = travel[d.corner] || 0;
        ds.rotation.x = d.side * Math.atan(Math.tan(d.baseTilt) + t / d.reach);
      });
    }

    // 4. Dynamic Carbon Brake Disc Glowing (Red-hot under heavy braking)
    const brakeEffort = (brakeKgf || 0) / 180;
    if (materials.carbonFrictionDisc) {
      if (brakeEffort > 0.05) {
        if (!materials.carbonFrictionDisc.emissive) {
          materials.carbonFrictionDisc.emissive = new THREE.Color(0, 0, 0);
        }
        materials.carbonFrictionDisc.emissive.setRGB(brakeEffort * 1.0, brakeEffort * 0.28, 0.02);
        materials.carbonFrictionDisc.emissiveIntensity = brakeEffort * 2.8;
      } else if (materials.carbonFrictionDisc.emissiveIntensity > 0) {
        materials.carbonFrictionDisc.emissiveIntensity = THREE.MathUtils.lerp(
          materials.carbonFrictionDisc.emissiveIntensity,
          0,
          0.05
        );
      }
    }

    // 5. Active Aerodynamics Kinematics (Z-Mode vs X-Mode)
    // Z-Mode: Front flaps 22°, Rear flap 26° (High downforce cornering)
    // X-Mode: Front flaps 4°, Rear flap 3° (Low drag straight line)
    // Negative rotation about +Y raises the trailing edge (rear of flap) = downforce-producing incidence.
    const isXMode = aeroMode === 'X_MODE';
    const targetFrontAngle = isXMode ? -0.07 : -0.38; // radians
    const targetRearAngle = isXMode ? -0.05 : -0.45;  // radians

    // Each flap may carry its own data-driven mode angles (userData.modeAngles)
    const modeTarget = (o, fallback) => (o.userData.modeAngles && o.userData.modeAngles[isXMode ? 'X_MODE' : 'Z_MODE']) ?? fallback;
    kinematics.frontWingFlaps.forEach(flap => {
      if (flap) {
        flap.rotation.y = THREE.MathUtils.lerp(flap.rotation.y, modeTarget(flap, targetFrontAngle), 0.15);
      }
    });

    if (kinematics.rearWingFlap) {
      const rw = kinematics.rearWingFlap;
      rw.rotation.y = THREE.MathUtils.lerp(rw.rotation.y, modeTarget(rw, targetRearAngle), 0.15);
    }

    // 6. Dramatic Exploded View Offsets (Exhaustive Mechanical Exposure)
    if (explodedProgress > 0) {
      // Bodywork elevates high overhead (+18.0 dm = 1.8 meters)
      if (subassemblies.bodywork) {
        subassemblies.bodywork.position.z = THREE.MathUtils.lerp(0, 18.0, explodedProgress);
      }
      // Front wing slides forward (-12.0 dm = -1.2 meters)
      if (kinematics.frontAero) {
        kinematics.frontAero.position.x = THREE.MathUtils.lerp(0, -12.0, explodedProgress);
      }
      // Rear wing lifts and moves rearward
      if (kinematics.rearWing) {
        kinematics.rearWing.position.x = THREE.MathUtils.lerp(36.8, 44.8, explodedProgress);
        kinematics.rearWing.position.z = THREE.MathUtils.lerp(7.4, 11.4, explodedProgress);
      }
      // Cockpit accessories & Helmet elevate
      if (subassemblies.cockpitAccessories) {
        subassemblies.cockpitAccessories.position.z = THREE.MathUtils.lerp(0, 7.5, explodedProgress);
      }
      // Powertrain and Turbo separate upward (+4.0 dm)
      if (subassemblies.powertrain) {
        subassemblies.powertrain.position.z = THREE.MathUtils.lerp(0, 4.0, explodedProgress);
      }
      // Transmission separates rearward (+7.0 dm)
      if (subassemblies.transmission) {
        subassemblies.transmission.position.x = THREE.MathUtils.lerp(0, 7.0, explodedProgress);
      }
      // Electrical harness & 800V battery elevate (+2.5 dm)
      if (subassemblies.electrical) {
        subassemblies.electrical.position.z = THREE.MathUtils.lerp(0, 2.5, explodedProgress);
      }
      // Floor drops downward (-5.0 dm)
      if (subassemblies.floor) {
        subassemblies.floor.position.z = THREE.MathUtils.lerp(0, -5.0, explodedProgress);
      }
      // Suspension corners & wheels expand outward laterally (±6.0 dm)
      if (kinematics.frontSuspLeft) {
        kinematics.frontSuspLeft.position.y = THREE.MathUtils.lerp(0, 6.0, explodedProgress);
      }
      if (kinematics.frontSuspRight) {
        kinematics.frontSuspRight.position.y = THREE.MathUtils.lerp(0, -6.0, explodedProgress);
      }
      if (kinematics.rearSuspLeft) {
        kinematics.rearSuspLeft.position.y = THREE.MathUtils.lerp(0, 6.0, explodedProgress);
      }
      if (kinematics.rearSuspRight) {
        kinematics.rearSuspRight.position.y = THREE.MathUtils.lerp(0, -6.0, explodedProgress);
      }
      // Brake corners expand laterally with wheels
      if (subassemblies.brakes) {
        subassemblies.brakes.traverse(child => {
          if (child.name === 'Brake_Front_Left_Pivot') {
            child.position.y = THREE.MathUtils.lerp(6.8, 12.8, explodedProgress);
          } else if (child.name === 'Brake_Front_Right_Pivot') {
            child.position.y = THREE.MathUtils.lerp(-6.8, -12.8, explodedProgress);
          } else if (child.name === 'Brake_Rear_Left_Pivot') {
            child.position.y = THREE.MathUtils.lerp(6.45, 12.45, explodedProgress);
          } else if (child.name === 'Brake_Rear_Right_Pivot') {
            child.position.y = THREE.MathUtils.lerp(-6.45, -12.45, explodedProgress);
          }
        });
      }
    } else {
      // Reset to precise assembled datum coordinates
      if (subassemblies.bodywork) subassemblies.bodywork.position.set(0, 0, 0);
      if (kinematics.frontAero) kinematics.frontAero.position.set(0, 0, 0);
      if (kinematics.rearWing) kinematics.rearWing.position.set(36.8, 0, 7.4);
      if (subassemblies.cockpitAccessories) subassemblies.cockpitAccessories.position.set(0, 0, 0);
      if (subassemblies.powertrain) subassemblies.powertrain.position.set(0, 0, 0);
      if (subassemblies.transmission) subassemblies.transmission.position.set(0, 0, 0);
      if (subassemblies.electrical) subassemblies.electrical.position.set(0, 0, 0);
      if (subassemblies.floor) subassemblies.floor.position.set(0, 0, 0);
      if (kinematics.frontSuspLeft) kinematics.frontSuspLeft.position.set(0, 0, 0);
      if (kinematics.frontSuspRight) kinematics.frontSuspRight.position.set(0, 0, 0);
      if (kinematics.rearSuspLeft) kinematics.rearSuspLeft.position.set(0, 0, 0);
      if (kinematics.rearSuspRight) kinematics.rearSuspRight.position.set(0, 0, 0);
      if (subassemblies.brakes) {
        subassemblies.brakes.traverse(child => {
          if (child.name === 'Brake_Front_Left_Pivot') child.position.set(0.0, 6.8, 3.55 + travel.fl);
          if (child.name === 'Brake_Front_Right_Pivot') child.position.set(0.0, -6.8, 3.55 + travel.fr);
          if (child.name === 'Brake_Rear_Left_Pivot') child.position.set(34.0, 6.45, 3.59 + travel.rl);
          if (child.name === 'Brake_Rear_Right_Pivot') child.position.set(34.0, -6.45, 3.59 + travel.rr);
        });
      }
    }
  };

  /**
   * setCutawayMode: Toggle semi-transparent ghost carbon on outer bodywork
   * to fully reveal internal engine pistons, valvetrain, turbo, MGU-K, 8-speed gearbox,
   * 800V battery, electrical looms, and carbon brake assemblies.
   */
  let cutawayActive = false;
  const ghostMaterial = new THREE.MeshStandardMaterial({
    color: 0x142036,
    roughness: 0.18,
    metalness: 0.85,
    transparent: true,
    opacity: 0.18,
    depthWrite: false,
    side: THREE.DoubleSide
  });

  masterCar.setCutawayMode = function(enabled) {
    cutawayActive = enabled;
    subassemblies.bodywork.traverse(child => {
      if (child.isMesh && child.material) {
        // Skip decals so liveries don't artifact
        if (child.name && child.name.includes('Decal')) {
          child.visible = !enabled;
          return;
        }
        if (enabled) {
          if (!child.userData.origMaterial) {
            child.userData.origMaterial = child.material;
          }
          child.material = ghostMaterial;
        } else if (child.userData.origMaterial) {
          child.material = child.userData.origMaterial;
        }
      }
    });
  };

  /**
   * setWireframeMode: Toggle wireframe overlay on all procedural meshes
   */
  masterCar.setWireframeMode = function(enabled) {
    masterCar.traverse(child => {
      if (child.isMesh && child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach(m => m.wireframe = enabled);
        } else {
          child.material.wireframe = enabled;
        }
      }
    });
  };

  /**
   * isolateAssembly: Show only a selected subassembly and dim others
   */
  masterCar.isolateAssembly = function(assemblyName) {
    if (assemblyName === 'steering') {
      Object.keys(subassemblies).forEach(key => {
        subassemblies[key].visible = (key === 'monocoque');
      });
      if (subassemblies.monocoque) {
        subassemblies.monocoque.children.forEach(child => {
          child.visible = (child.name === 'Pivot_Steering_Wheel_Assembly');
        });
      }
      return;
    }

    if (subassemblies.monocoque) {
      subassemblies.monocoque.children.forEach(child => {
        child.visible = true;
      });
    }

    Object.keys(subassemblies).forEach(key => {
      const sub = subassemblies[key];
      if (!assemblyName || assemblyName === 'ALL' || key === assemblyName) {
        sub.visible = true;
      } else {
        sub.visible = false;
      }
    });
  };

  return masterCar;
}
