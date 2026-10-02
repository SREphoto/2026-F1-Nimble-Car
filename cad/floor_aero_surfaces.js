/**
 * 2026 Formula 1 "Nimble Car" Floor & Underbody
 * SREdesigns - Samuel R Erwin III
 * 
 * 3D CAD for the 2026 Underbody Floor, Plank & Diffuser:
 * - 2026 Underbody Carbon Floor:
 *   * Transitioned from deep Venturi tunnels to shallow ground effect channels
 *   * 4x curved aerodynamic leading edge underfloor strakes / fences per side
 *   * Stepped floor edge wings with longitudinal sealing slots and titanium wear pucks
 *   * Tyre squirt cutouts ahead of rear wheels with dual vertical carbon fences (matching reference images)
 * - 10 mm Jabroc Composite Plank & Titanium Skid Pucks:
 *   * Standardized L-shaped / T-shaped Jabroc wood laminate plank along car centerline
 *   * Precision countersunk titanium skid pucks with calibrated wear inspection holes
 * - Rear Diffuser Assembly (Matching Reference Images):
 *   * 10.5-degree expansion ramp beginning at X = 28.5 dm
 *   * Aerodynamic center keel divider
 *   * Stepped vertical sidewall fences sealing against rear wheel wake
 *   * Central mousehole expansion cutout around starter shaft / rear impact structure
 * 
 * Universal Datum:
 * - Floor underside at Z = 0.43 dm; plank bolted beneath it, bottom face at Z = 0.30 dm (static ride height)
 * - Floor span: X in [4.5, 36.5] dm, Width: 15.0 dm (Y in [-7.5, 7.5] dm)
 */

import * as THREE from 'three';
import { materials } from '../materials.js';
import { createTorxScrew } from './fasteners.js';

export function createFloorAeroSurfaces(options = {}) {
  const group = new THREE.Group();
  group.name = 'Floor_Underbody_Diffuser_Assembly';

  // =========================================================================
  // 1. MAIN CARBON COMPOSITE UNDERBODY FLOOR TRAY
  // Continuous 3D sculpted carbon floor plate
  // =========================================================================
  const floorGroup = new THREE.Group();
  floorGroup.name = 'Carbon_Underbody_Floor';

  // Main Flat Floor Plate (X in [4.5, 28.5] dm, Y in [-7.5, 7.5] dm, Z = 0.45 dm)
  const floorPlateShape = new THREE.Shape();
  floorPlateShape.moveTo(4.5, -5.2);
  floorPlateShape.lineTo(7.5, -7.5);  // Forward floor width expansion
  floorPlateShape.lineTo(26.5, -7.5); // Constant width section
  floorPlateShape.lineTo(28.5, -6.5); // Taper ahead of rear tyre squirt cutout
  floorPlateShape.lineTo(30.0, -5.4); // Narrow to pass inside the rear tyres (inner face Y = ±5.525)
  floorPlateShape.lineTo(36.5, -5.2); // Diffuser trailing edge
  floorPlateShape.lineTo(36.5, 5.2);
  floorPlateShape.lineTo(30.0, 5.4);
  floorPlateShape.lineTo(28.5, 6.5);
  floorPlateShape.lineTo(26.5, 7.5);
  floorPlateShape.lineTo(7.5, 7.5);
  floorPlateShape.lineTo(4.5, 5.2);
  floorPlateShape.closePath();

  const floorExtrude = { steps: 2, depth: 0.08, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 2 };
  const floorGeo = new THREE.ExtrudeGeometry(floorPlateShape, floorExtrude);
  const floorMesh = new THREE.Mesh(floorGeo, materials.carbonGloss);
  floorMesh.rotation.set(0, 0, 0);
  floorMesh.position.set(0, 0, 0.45);
  floorGroup.add(floorMesh);

  // =========================================================================
  // 2. UNDERFLOOR LEADING EDGE STRAKES / FENCES (4 per side)
  // Direct flow into Venturi tunnels and generate strong floor-edge sealing vortices
  // Located at X in [5.0, 9.5] dm
  // =========================================================================
  [-1, 1].forEach((side, sideIdx) => {
    const strakeGroup = new THREE.Group();
    strakeGroup.name = `Floor_Strakes_${side > 0 ? 'Left' : 'Right'}`;

    for (let s = 0; s < 4; s++) {
      const yStart = side * (1.8 + s * 1.35);
      const yEnd = side * (2.2 + s * 1.55);

      // 3D Curved Strake Blade
      const strakeShape = new THREE.Shape();
      strakeShape.moveTo(5.0 + s * 0.35, 0.1);
      strakeShape.lineTo(9.5 + s * 0.4, 0.1);
      strakeShape.lineTo(9.2 + s * 0.4, 0.95);
      strakeShape.quadraticCurveTo(7.0 + s * 0.4, 1.25, 5.0 + s * 0.35, 0.75);
      strakeShape.closePath();

      const sExtrude = { steps: 1, depth: 0.04, bevelEnabled: false };
      const sGeo = new THREE.ExtrudeGeometry(strakeShape, sExtrude);
      const sMesh = new THREE.Mesh(sGeo, materials.carbonGloss);
      // Underfloor fences hang DOWN from the floor's underside (Z 0.43), ~0.35 dm deep
      sMesh.rotation.x = -Math.PI / 2;
      sMesh.scale.y = 0.3;
      sMesh.position.set(0, yStart, 0.43);
      strakeGroup.add(sMesh);
    }
    floorGroup.add(strakeGroup);
  });

  // =========================================================================
  // 3. STEPPED FLOOR EDGES & REAR TYRE SQUIRT VERTICAL FENCES
  // Matching Reference Images 1 & 2:
  // - Longitudinal stepped edge wing with titanium rub blocks
  // - Dual vertical carbon fences ahead of rear tyre to block high-pressure tyre squirt
  // =========================================================================
  [-1, 1].forEach((side, eIdx) => {
    const edgeGroup = new THREE.Group();
    edgeGroup.name = `Floor_Edge_Wing_${side > 0 ? 'Left' : 'Right'}`;

    // Longitudinal Raised Edge Wing (X = 9.0 to 26.5 dm, Y = ±7.45 dm)
    const edgeWingGeo = new THREE.BoxGeometry(17.5, 0.25, 0.12);
    const edgeWingMesh = new THREE.Mesh(edgeWingGeo, materials.carbonGloss);
    edgeWingMesh.position.set(17.75, side * 7.45, 0.58);
    edgeGroup.add(edgeWingMesh);

    // Titanium Floor Edge Skid Pucks (5 per side)
    for (let p = 0; p < 5; p++) {
      const pX = 11.0 + p * 3.5;
      const puckGeo = new THREE.BoxGeometry(0.65, 0.18, 0.04);
      const puckMesh = new THREE.Mesh(puckGeo, materials.titaniumBright);
      puckMesh.position.set(pX, side * 7.52, 0.52);
      edgeGroup.add(puckMesh);
    }

    // Dual Vertical Carbon Fences Ahead of Rear Tyre (Matching Reference Images 1 & 2!)
    // Positioned at X = 27.5 dm (Y = side * 6.55) and 28.9 dm (Y = side * 5.8, inside the narrowed rear floor)
    [27.5, 28.9].forEach((fX, fenceIdx) => {
      const fenceShape = new THREE.Shape();
      fenceShape.moveTo(0, 0);
      fenceShape.lineTo(1.4, 0);
      fenceShape.lineTo(1.2, 1.85);
      fenceShape.lineTo(0, 1.65);
      fenceShape.closePath();

      const fenceExtrude = { steps: 1, depth: 0.05, bevelEnabled: true, bevelThickness: 0.015, bevelSize: 0.015, bevelSegments: 2 };
      const fenceGeo = new THREE.ExtrudeGeometry(fenceShape, fenceExtrude);
      const fenceMesh = new THREE.Mesh(fenceGeo, materials.carbonGloss);
      fenceMesh.rotation.x = Math.PI / 2;
      fenceMesh.position.set(fX, side * (fenceIdx === 0 ? 6.55 : 5.8), 0.45);
      fenceMesh.name = `TyreSquirt_Fence_${fenceIdx}_${side > 0 ? 'L' : 'R'}`;
      edgeGroup.add(fenceMesh);
    });

    // Forward floor-edge fins (refs 08-11): a cascade of cambered vertical vanes on the
    // floor's leading corner that turn the tyre wake outboard. Extruded straight up (+Z).
    for (let f = 0; f < 5; f++) {
      const ch = 1.1 - f * 0.08, camber = side * 0.1;
      const finShape = new THREE.Shape();
      finShape.moveTo(-ch / 2, 0);
      finShape.quadraticCurveTo(0, camber + side * 0.04, ch / 2, 0);
      finShape.quadraticCurveTo(0, camber - side * 0.04, -ch / 2, 0);
      const h = 1.45 - f * 0.12;
      const finGeo = new THREE.ExtrudeGeometry(finShape, { steps: 1, depth: h, bevelEnabled: false });
      const fin = new THREE.Mesh(finGeo, materials.carbonGloss);
      fin.position.set(8.0 + f * 0.85, side * (7.05 - f * 0.05), 0.5);
      fin.rotation.z = side * 0.22; // leading edge toed in, trailing edge outboard
      fin.castShadow = true;
      fin.name = `Floor_Edge_Fin_${f + 1}_${side > 0 ? 'L' : 'R'}`;
      edgeGroup.add(fin);
    }

    // Bargeboard / sidepod deflector: tall curved panel between the front wheel and the
    // sidepod inlet, rolled over at the top (kept clear of the front tyre at full lock).
    {
      const bbShape = new THREE.Shape();
      bbShape.moveTo(0, 0);
      bbShape.lineTo(2.0, 0);
      bbShape.lineTo(2.0, 2.55);
      bbShape.quadraticCurveTo(0.9, 3.0, 0, 2.2);
      bbShape.closePath();
      const bbGeo = new THREE.ExtrudeGeometry(bbShape, { steps: 1, depth: 0.05, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.012, bevelSegments: 1 });
      const bb = new THREE.Mesh(bbGeo, materials.carbonGloss);
      bb.rotation.x = Math.PI / 2;           // shape Y -> world Z (up)
      bb.rotation.y = 0;
      bb.position.set(5.2, side * 5.6, 0.5);
      bb.castShadow = true;
      bb.name = `Bargeboard_Deflector_${side > 0 ? 'L' : 'R'}`;
      edgeGroup.add(bb);
      // Horizontal floor-edge "boomerang" strip joining the deflector foot to the fins
      const strip = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.9, 0.05), materials.carbonGloss);
      strip.position.set(7.4, side * 6.6, 1.55);
      strip.rotation.x = side * 0.25;
      strip.name = `Floor_Edge_Boomerang_${side > 0 ? 'L' : 'R'}`;
      edgeGroup.add(strip);
    }

    floorGroup.add(edgeGroup);
  });

  // =========================================================================
  // 4. JABROC RESIN-WOOD COMPOSITE PLANK & TITANIUM SKID PUCKS
  // Standardized central reference plank running along car centerline
  // Thickness: 10 mm (0.1 dm), X = 5.0 dm to 32.0 dm, Width = 3.0 dm (Y = [-1.5, 1.5])
  // =========================================================================
  const plankGroup = new THREE.Group();
  plankGroup.name = 'Plank_Jabroc_SkidPucks_Assembly';

  // 10mm Laminated Beechwood / Phenolic Resin Plank
  const plankShape = new THREE.Shape();
  plankShape.moveTo(5.0, -1.5);
  plankShape.lineTo(32.0, -1.5);
  plankShape.lineTo(32.0, 1.5);
  plankShape.lineTo(5.0, 1.5);
  plankShape.closePath();

  const plankExtrude = { steps: 1, depth: 0.1, bevelEnabled: true, bevelThickness: 0.01, bevelSize: 0.01, bevelSegments: 2 };
  const plankGeo = new THREE.ExtrudeGeometry(plankShape, plankExtrude);
  const plankMesh = new THREE.Mesh(plankGeo, materials.jabrocPlank || materials.heatShieldGold);
  plankMesh.rotation.set(0, 0, 0);
  plankMesh.position.set(0, 0, 0.31); // Bolted to the floor underside (Z 0.43); plank is the lowest part of the car
  plankGroup.add(plankMesh);

  // Precision Countersunk Titanium Skid Pucks with 4x Wear Inspection Holes
  // Positioned along plank length at standardized FIA test locations
  [6.5, 12.0, 18.5, 25.0, 30.5].forEach((puckX, pkIdx) => {
    const puckGroup = new THREE.Group();
    puckGroup.position.set(puckX, 0, 0.31); // Flush with the plank's bottom face

    // Oval/Rectangular Titanium Puck
    const puckBodyGeo = new THREE.BoxGeometry(0.85, 1.8, 0.04);
    const puckBody = new THREE.Mesh(puckBodyGeo, materials.titaniumBright);
    puckGroup.add(puckBody);

    // 4 Wear Inspection Holes (Drilled holes where calipers measure 1mm wear limit)
    [-0.25, 0.25].forEach(hx => {
      [-0.55, 0.55].forEach(hy => {
        const holeGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.05, 12);
        const holeMesh = new THREE.Mesh(holeGeo, materials.carbonMatte);
        holeMesh.rotation.x = Math.PI / 2; // drilled vertically through the puck
        holeMesh.position.set(hx, hy, 0);
        puckGroup.add(holeMesh);
      });
    });

    // 2x Countersunk Torx Mounting Fasteners
    [-0.5, 0.5].forEach(ty => {
      const screw = createTorxScrew({
        headRadius: 0.05,
        headHeight: 0.02,
        lobeRadius: 0.025,
        shankRadius: 0.025,
        shankLength: 0.06,
        material: materials.titaniumAnodized
      });
      // Fastener axis is local Y: Rx(-90deg) puts the countersunk head flush with the
      // puck's bottom face and the shank pointing UP into the plank
      screw.position.set(0, ty, 0);
      screw.rotation.x = -Math.PI / 2;
      puckGroup.add(screw);
    });

    puckGroup.name = `SkidPuck_Titanium_${pkIdx + 1}`;
    plankGroup.add(puckGroup);
  });

  floorGroup.add(plankGroup);

  // =========================================================================
  // 5. REAR DIFFUSER ASSEMBLY
  // Matching Reference Images 3 & 4:
  // - 10.5-degree upward expansion ramp from X = 28.5 dm to X = 36.5 dm
  // - Central aerodynamic keel divider
  // - High expansion side channels with dual vertical strakes
  // - Mousehole cutout for starter shaft / rear crash structure
  // =========================================================================
  const diffuserGroup = new THREE.Group();
  diffuserGroup.name = 'Diffuser_Rear_HighExpansion_Assembly';
  diffuserGroup.position.set(28.5, 0, 0.45);

  // Diffuser Ramp Surface (Expands from Z = 0.45 dm up to Z = 2.15 dm over 8.0 dm length)
  const diffWidth = 10.4; // Fits between the rear tyres (inner faces at Y = ±5.525)
  const diffLength = 8.0;
  const diffLift = 1.7; // Height rise

  const rampShape = new THREE.Shape();
  rampShape.moveTo(0, 0);
  rampShape.quadraticCurveTo(diffLength * 0.45, 0.25, diffLength, diffLift);
  rampShape.lineTo(diffLength, diffLift + 0.06);
  rampShape.quadraticCurveTo(diffLength * 0.45, 0.31, 0, 0.06);
  rampShape.closePath();

  const rampExtrude = { steps: 4, depth: diffWidth, bevelEnabled: false };
  const rampGeo = new THREE.ExtrudeGeometry(rampShape, rampExtrude);
  rampGeo.center();
  const rampMesh = new THREE.Mesh(rampGeo, materials.carbonGloss);
  rampMesh.rotation.x = Math.PI / 2;
  rampMesh.position.set(diffLength / 2, 0, diffLift / 2);
  diffuserGroup.add(rampMesh);

  // Central Keel Divider (Splits left and right Venturi exit channels)
  const keelShape = new THREE.Shape();
  keelShape.moveTo(0, 0);
  keelShape.quadraticCurveTo(diffLength * 0.5, 0.3, diffLength, diffLift);
  keelShape.lineTo(diffLength, 0.2);
  keelShape.lineTo(0, 0.05);
  keelShape.closePath();

  const keelGeo = new THREE.ExtrudeGeometry(keelShape, { steps: 2, depth: 0.08, bevelEnabled: false });
  keelGeo.center();
  const keelMesh = new THREE.Mesh(keelGeo, materials.carbonGloss);
  keelMesh.rotation.x = Math.PI / 2;
  keelMesh.position.set(diffLength / 2, 0, diffLift / 2);
  diffuserGroup.add(keelMesh);

  // Dual Vertical Strakes per side inside diffuser channels
  [-1, 1].forEach((side, dSide) => {
    [1.8, 3.6].forEach((yOffset, sIdx) => {
      const strakeShape = new THREE.Shape();
      strakeShape.moveTo(0, 0);
      strakeShape.quadraticCurveTo(diffLength * 0.45, 0.35, diffLength, diffLift);
      strakeShape.lineTo(diffLength, 0.15);
      strakeShape.lineTo(0, 0.05);
      strakeShape.closePath();

      const sGeo = new THREE.ExtrudeGeometry(strakeShape, { steps: 2, depth: 0.05, bevelEnabled: false });
      sGeo.center();
      const sMesh = new THREE.Mesh(sGeo, materials.carbonGloss);
      sMesh.rotation.x = Math.PI / 2;
      sMesh.position.set(diffLength / 2, side * yOffset, diffLift / 2);
      sMesh.name = `Diffuser_InternalStrake_${dSide}_${sIdx}`;
      diffuserGroup.add(sMesh);
    });
  });

  // Central Mousehole Cutout (Expansion arch for starter shaft access)
  const archGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.1, 16, 1, false, 0, Math.PI);
  const archMesh = new THREE.Mesh(archGeo, materials.titaniumAnodized);
  archMesh.rotation.z = Math.PI / 2;
  archMesh.rotation.y = Math.PI / 2;
  archMesh.position.set(diffLength, 0, 0.45);
  diffuserGroup.add(archMesh);

  floorGroup.add(diffuserGroup);

  group.add(floorGroup);

  return group;
}
