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
    turbocharger: subassemblies.powertrain.getObjectByName('Turbocharger_Assembly_2026'),
    mguk: subassemblies.powertrain.getObjectByName('Assembly_350kW_MGUK_Motor'),
    gears: subassemblies.transmission.getObjectByName('Kinematic_8Speed_GearTrain_Assembly'),
    driveshafts: subassemblies.transmission.getObjectByName('Kinematic_Driveshafts_Assembly'),
    steeringRack: subassemblies.suspension.getObjectByName('Assembly_HPAS_Steering_Rack'),
    frontSuspension: subassemblies.suspension.getObjectByName('Front_Suspension_Assembly'),
    rearSuspension: subassemblies.suspension.getObjectByName('Rear_Suspension_Assembly'),
    steeringWheel: subassemblies.monocoque.getObjectByName('Steering_Wheel_Assembly'),
    frontWingFlaps: [
      subassemblies.bodywork.getObjectByName('FrontWing_ActiveFlap_Left'),
      subassemblies.bodywork.getObjectByName('FrontWing_ActiveFlap_Right')
    ],
    rearWingFlap: subassemblies.bodywork.getObjectByName('RearWing_Active_UpperFlap')
  };

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
      explodedProgress = 0 // 0.0 (assembled) to 1.0 (fully exploded)
    } = state;

    const dt = 1 / 60;

    // 1. Powertrain Kinematics (Crankshaft, Camshafts, Turbo, MGU-K)
    if (rpm > 0) {
      const crankAngularVelocity = (rpm * 2 * Math.PI) / 60;
      if (kinematics.crankshaft) {
        kinematics.crankshaft.rotation.x += crankAngularVelocity * dt;
      }
      if (kinematics.valvetrain) {
        // Camshafts turn at half crankshaft speed (4-stroke cycle)
        kinematics.valvetrain.rotation.x += (crankAngularVelocity * 0.5) * dt;
      }
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

    // 2. Drivetrain & Wheel Rotation (Wheel speed proportional to vehicle velocity)
    if (speedKmH > 0) {
      // Tyre radius = 0.355 m (3.55 dm). Circumference = 2 * PI * 0.355 = 2.23 m
      const wheelRps = (speedKmH * 1000 / 3600) / 2.23;
      const wheelAngVel = wheelRps * 2 * Math.PI;

      if (kinematics.driveshafts) {
        kinematics.driveshafts.rotation.y += wheelAngVel * dt;
      }
    }

    // 3. Steering Kinematics
    if (kinematics.steeringWheel) {
      kinematics.steeringWheel.rotation.x = -steeringAngle * 2.5; // Steering ratio
    }
    if (kinematics.steeringRack) {
      kinematics.steeringRack.position.y = steeringAngle * 0.45; // Lateral rack travel
    }

    // 4. Active Aerodynamics Kinematics (Z-Mode vs X-Mode)
    // Z-Mode: Front flaps +22°, Rear flap +26° (High downforce cornering)
    // X-Mode: Front flaps +4°, Rear flap +3° (Low drag straight line)
    const isXMode = aeroMode === 'X_MODE';
    const targetFrontAngle = isXMode ? 0.07 : 0.38; // radians
    const targetRearAngle = isXMode ? 0.05 : 0.45;  // radians

    kinematics.frontWingFlaps.forEach(flap => {
      if (flap) {
        flap.rotation.y = THREE.MathUtils.lerp(flap.rotation.y, targetFrontAngle, 0.15);
      }
    });

    if (kinematics.rearWingFlap) {
      kinematics.rearWingFlap.rotation.y = THREE.MathUtils.lerp(kinematics.rearWingFlap.rotation.y, targetRearAngle, 0.15);
    }

    // 5. Clean Vertical & Longitudinal Exploded View Offsets
    if (explodedProgress > 0) {
      // Bodywork and Active Wings elevate vertically
      if (subassemblies.bodywork) {
        subassemblies.bodywork.position.z = THREE.MathUtils.lerp(0, 8.5, explodedProgress);
      }
      // Cockpit accessories & Helmet elevate
      if (subassemblies.cockpitAccessories) {
        subassemblies.cockpitAccessories.position.z = THREE.MathUtils.lerp(0, 6.2, explodedProgress);
      }
      // Powertrain and Turbo separate horizontally/vertically
      if (subassemblies.powertrain) {
        subassemblies.powertrain.position.z = THREE.MathUtils.lerp(0, 4.0, explodedProgress);
      }
      // Transmission separates rearward
      if (subassemblies.transmission) {
        subassemblies.transmission.position.x = THREE.MathUtils.lerp(0, 5.0, explodedProgress);
      }
      // Wheels and suspension expand outward laterally
      if (subassemblies.suspension) {
        subassemblies.suspension.position.z = THREE.MathUtils.lerp(0, 1.5, explodedProgress);
      }
      // Floor drops slightly downward
      if (subassemblies.floor) {
        subassemblies.floor.position.z = THREE.MathUtils.lerp(0, -2.5, explodedProgress);
      }
    } else {
      // Reset to precise assembled datum coordinates
      if (subassemblies.bodywork) subassemblies.bodywork.position.set(0, 0, 0);
      if (subassemblies.cockpitAccessories) subassemblies.cockpitAccessories.position.set(0, 0, 0);
      if (subassemblies.powertrain) subassemblies.powertrain.position.set(0, 0, 0);
      if (subassemblies.transmission) subassemblies.transmission.position.set(0, 0, 0);
      if (subassemblies.suspension) subassemblies.suspension.position.set(0, 0, 0);
      if (subassemblies.floor) subassemblies.floor.position.set(0, 0, 0);
    }
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
