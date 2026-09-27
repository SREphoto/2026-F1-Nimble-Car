/**
 * 2026 Formula 1 "Nimble Car" Bodywork
 * SREdesigns - Samuel R Erwin III
 * 
 * 3D CAD for the 2026 Formula 1 "Nimble Car":
 * 1. 3D Sculpted Parabolic FIS Nosecone (Drooping from Bulkhead A to front wing, Yellow tip, Navy body)
 * 2. Active Front Wing & FWEP (Swept spoon mainplane, active 2-stage flaps, diveplanes, footplates, slot gap separators)
 * 3. 3D Sculpted Sidepods & Radiator Intakes (Overbite letterbox scoops, deep undercuts, waterslide gulley, cooling gills)
 * 4. Engine Cover, Airbox & Dorsal Shark Fin (Yellow roll hoop airbox intake, Coke-bottle taper, shark fin, Inconel exhaust)
 * 5. Active Rear Wing Assembly (Spoon mainplane, swan-neck pylons, dual vertical rain LEDs)
 * 
 * Coordinate System (Universal Automotive Datum):
 * - X: Longitudinal axis (Front Wing X = -10.5 to -8.5 dm, Nosecone X = -9.5 to 0 dm, Cockpit X = 0 to 22 dm, Rear Axle X = 34 dm, Rear Wing X = 36.5 to 38.5 dm)
 * - Y: Lateral axis (-Y right, +Y left, width spanning ±9.5 dm at wheels)
 * - Z: Vertical axis (0 ground datum, 1.0 floor plank, 3.55 wheel axle center, 7.2 halo, 9.45 airbox apex)
 */

import * as THREE from 'three';
import { materials } from '../materials.js';
import { createSocketHeadBolt, createTorxScrew } from './fasteners.js';
import {
  createSidepodLiveryTexture,
  createEngineCoverLiveryTexture,
  createNoseconeLiveryTexture,
  createRearWingOracleTexture,
  createEndplateTexture
} from './procedural_livery.js';

export function createActiveWingsBodywork(options = {}) {
  const group = new THREE.Group();
  group.name = 'Active_Wings_Bodywork_Assembly';

  // Palette aliases
  const navyMat = materials.redBullNavy || materials.carbonSatinChassis;
  const yellowMat = materials.redBullYellow || materials.ledYellowSafety;
  const redMat = materials.redBullRed || materials.anodizedRed;
  const carbonMat = materials.carbonGloss;
  const carbonMatte = materials.carbonMatteStructural;

  // =========================================================================
  // 1. ACTIVE FRONT WING & FIS NOSECONE ASSEMBLY
  // Matches Reference Images 1, 2, 7 & 8:
  // - 3D aerodynamic drooping nosecone tapering from Bulkhead A-A down to front wing
  // - Swept carbon spoon mainplane
  // - 2-stage active movable upper flaps with slot gap separators
  // - Cambered outwash front wing endplates with curved diveplanes and footplates
  // =========================================================================
  const frontAeroGroup = new THREE.Group();
  frontAeroGroup.name = 'Assembly_Active_Front_Aero';

  // -------------------------------------------------------------------------
  // 1A. PROCEDURAL 3D LOFTED NOSECONE (FIA Front Impact Structure)
  // Drooping smoothly from Bulkhead A-A (X = 0) to Front Wing (X = -9.5 dm)
  // -------------------------------------------------------------------------
  const noseGroup = new THREE.Group();
  noseGroup.name = 'Nosecone_FIS_Assembly';

  // Build a true 3D lofted aerodynamic nosecone using quad rings
  const numRings = 24;
  const numSegments = 32;
  const noseVertices = [];
  const noseIndices = [];
  const noseUvs = [];

  for (let i = 0; i <= numRings; i++) {
    const u = i / numRings; // 0.0 at Bulkhead A-A (X=0), 1.0 at nose tip (X=-9.5)
    const x = -u * 9.5;

    // Centerline droop curve matching Bulkhead A-A (Z=2.7) down to nose tip (Z=1.35)
    const zCenter = 2.70 - 1.35 * Math.pow(u, 1.2);

    // Cross-sectional radii (smoothly tapering from bulkhead to sleek aerodynamic tip)
    const ry = 1.60 * (1.0 - 0.65 * u); // Half-width (1.60 dm down to 0.56 dm)
    const rz = 1.50 * (1.0 - 0.62 * u); // Half-height (1.50 dm down to 0.57 dm)

    for (let j = 0; j <= numSegments; j++) {
      const theta = (j / numSegments) * Math.PI * 2;
      // Flattish bottom, elliptical top
      const y = Math.cos(theta) * ry;
      let z = zCenter + Math.sin(theta) * rz;
      if (Math.sin(theta) < 0) {
        // Flatten underside for clean under-nose aerodynamic keel
        z = zCenter + Math.sin(theta) * rz * 0.8;
      }

      noseVertices.push(x, y, z);
      noseUvs.push(u, j / numSegments);
    }
  }

  // Generate quad strip indices
  for (let i = 0; i < numRings; i++) {
    for (let j = 0; j < numSegments; j++) {
      const a = i * (numSegments + 1) + j;
      const b = (i + 1) * (numSegments + 1) + j;
      const c = (i + 1) * (numSegments + 1) + (j + 1);
      const d = i * (numSegments + 1) + (j + 1);
      noseIndices.push(a, b, d);
      noseIndices.push(b, c, d);
    }
  }

  const noseGeo = new THREE.BufferGeometry();
  noseGeo.setAttribute('position', new THREE.Float32BufferAttribute(noseVertices, 3));
  noseGeo.setAttribute('uv', new THREE.Float32BufferAttribute(noseUvs, 2));
  noseGeo.setIndex(noseIndices);
  noseGeo.computeVertexNormals();

  const noseMesh = new THREE.Mesh(noseGeo, navyMat);
  noseMesh.castShadow = true;
  noseMesh.receiveShadow = true;
  noseMesh.name = 'Nosecone_MainBody_Navy';
  noseGroup.add(noseMesh);

  // Vibrant Racing Yellow Nose Tip (Matching Reference Image 1 & 7)
  const tipGeo = new THREE.SphereGeometry(0.55, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2);
  const tipMesh = new THREE.Mesh(tipGeo, yellowMat);
  tipMesh.rotation.z = Math.PI / 2;
  tipMesh.position.set(-9.5, 0, 1.35);
  tipMesh.scale.set(0.65, 1.0, 0.95);
  tipMesh.name = 'Nosecone_YellowTip';
  noseGroup.add(tipMesh);

  // Red Bull Charging Bull Flank Silhouettes on Nose
  [-1, 1].forEach((side, bIdx) => {
    const bullGroup = new THREE.Group();
    bullGroup.position.set(-5.5, side * 1.15, 2.45);
    bullGroup.rotation.y = side > 0 ? 0.08 : -0.08;

    // Golden Sun disk
    const sunGeo = new THREE.CircleGeometry(0.35, 20);
    const sunMesh = new THREE.Mesh(sunGeo, yellowMat);
    sunMesh.rotation.y = side > 0 ? Math.PI / 2 : -Math.PI / 2;
    bullGroup.add(sunMesh);

    // Bull Red silhouette badge
    const bullShape = new THREE.Shape();
    bullShape.moveTo(-0.45, -0.15);
    bullShape.lineTo(-0.2, 0.15);
    bullShape.quadraticCurveTo(0.0, 0.35, 0.3, 0.25);
    bullShape.lineTo(0.45, 0.1);
    bullShape.lineTo(0.25, -0.05);
    bullShape.lineTo(0.15, -0.2);
    bullShape.closePath();

    const bullMesh = new THREE.Mesh(new THREE.ShapeGeometry(bullShape), redMat);
    bullMesh.rotation.y = side > 0 ? Math.PI / 2 : -Math.PI / 2;
    bullMesh.position.set(0, side * 0.02, 0);
    bullGroup.add(bullMesh);

    noseGroup.add(bullGroup);
  });

  // Carbon Fiber Under-Nose Keel & Pylons (attaching to Front Wing mainplane)
  const keelGeo = new THREE.BoxGeometry(4.5, 0.42, 0.55);
  const keelMesh = new THREE.Mesh(keelGeo, carbonMat);
  keelMesh.position.set(-6.5, 0, 1.6);
  noseGroup.add(keelMesh);

  [-0.65, 0.65].forEach((pY, pIdx) => {
    const pylonGeo = new THREE.BoxGeometry(0.85, 0.08, 0.65);
    const pylonMesh = new THREE.Mesh(pylonGeo, carbonMat);
    pylonMesh.position.set(-8.8, pY, 1.1);
    noseGroup.add(pylonMesh);
  });

  // Telemetry Pitot Tube Mast (Mounted on top of monocoque/nose junction at X = -1.2, Z = 4.4)
  const pitotMastGeo = new THREE.CylinderGeometry(0.02, 0.03, 0.65, 12);
  const pitotMast = new THREE.Mesh(pitotMastGeo, materials.titaniumBright);
  pitotMast.position.set(-1.2, 0, 4.45);
  noseGroup.add(pitotMast);

  const pitotProbeGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.35, 8);
  const pitotProbe = new THREE.Mesh(pitotProbeGeo, materials.titaniumBright);
  pitotProbe.rotation.z = Math.PI / 2;
  pitotProbe.position.set(-1.35, 0, 4.75);
  noseGroup.add(pitotProbe);

  frontAeroGroup.add(noseGroup);

  // -------------------------------------------------------------------------
  // 1B. ACTIVE FRONT WING MAINPLANE & FLAPS
  // Spanning Y in [-8.6, +8.6] dm with 2-stage active flaps
  // -------------------------------------------------------------------------
  const frontWingGroup = new THREE.Group();
  frontWingGroup.name = 'FrontWing_Aerofoil_Assembly';
  frontWingGroup.position.set(-9.2, 0.0, 1.15);

  // Swept Mainplane with 3D Center Droop
  const fwCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(1.2, -8.6, 0.45),
    new THREE.Vector3(0.6, -5.5, 0.15),
    new THREE.Vector3(0.0, 0.0, 0.0),
    new THREE.Vector3(0.6, 5.5, 0.15),
    new THREE.Vector3(1.2, 8.6, 0.45)
  ]);

  // Mainplane Aerofoil Cross Section
  // Note: Frenet frames along fwCurve map shape X to normal (Z/height) and shape Y to binormal (X/length)
  const fwShape = new THREE.Shape();
  fwShape.moveTo(0.0, -1.6); // Leading edge (front)
  fwShape.quadraticCurveTo(0.08, -0.4, 0.03, 1.4); // Upper camber surface
  fwShape.lineTo(-0.03, 1.35); // Trailing edge (rear)
  fwShape.quadraticCurveTo(-0.02, -0.4, -0.01, -1.6); // Lower flat surface
  fwShape.closePath();

  // Extrude along sweep
  const fwExtrudeSettings = {
    steps: 24,
    bevelEnabled: false,
    extrudePath: fwCurve
  };
  const fwMainGeo = new THREE.ExtrudeGeometry(fwShape, fwExtrudeSettings);
  const fwMainMesh = new THREE.Mesh(fwMainGeo, carbonMat);
  fwMainMesh.castShadow = true;
  fwMainMesh.name = 'FrontWing_Mainplane';
  frontWingGroup.add(fwMainMesh);

  // 2-Stage Active Upper Flaps (Left & Right)
  const activeFlapAngle = options.frontFlapAngle || 0.38; // Z-Mode angle

  [-1, 1].forEach((side, sIdx) => {
    const isLeft = side > 0;
    const flapAssembly = new THREE.Group();
    flapAssembly.name = `FrontWing_ActiveFlap_${isLeft ? 'Left' : 'Right'}`;
    flapAssembly.position.set(0.4, side * 4.6, 0.28);

    // Active Flap Pivot
    const pivotNode = new THREE.Group();
    pivotNode.rotation.y = isLeft ? activeFlapAngle : -activeFlapAngle;

    // Aerodynamic Upper Flap Blade
    const flapShape = new THREE.Shape();
    flapShape.moveTo(-0.7, 0);
    flapShape.quadraticCurveTo(0.1, 0.14, 0.9, 0.08);
    flapShape.lineTo(0.85, 0.02);
    flapShape.quadraticCurveTo(0.1, 0.05, -0.7, -0.02);
    flapShape.closePath();

    const flapGeo = new THREE.ExtrudeGeometry(flapShape, { steps: 4, depth: 7.2, bevelEnabled: false });
    flapGeo.center();
    const flapMesh = new THREE.Mesh(flapGeo, navyMat);
    flapMesh.rotation.x = Math.PI / 2;
    pivotNode.add(flapMesh);

    // 4x Slot Gap Separators
    for (let s = 0; s < 4; s++) {
      const sepY = -3.0 + s * 2.0;
      const sepGeo = new THREE.BoxGeometry(0.35, 0.03, 0.16);
      const sepMesh = new THREE.Mesh(sepGeo, carbonMat);
      sepMesh.position.set(0.1, sepY, -0.08);
      pivotNode.add(sepMesh);
    }

    // Electro-hydraulic actuator horn
    const hornGeo = new THREE.BoxGeometry(0.24, 0.04, 0.20);
    const horn = new THREE.Mesh(hornGeo, materials.titaniumBright);
    horn.position.set(-0.25, 0, 0.08);
    pivotNode.add(horn);

    flapAssembly.add(pivotNode);
    frontWingGroup.add(flapAssembly);

    // -----------------------------------------------------------------------
    // Front Wing Endplate (FWEP) with Outwash Diveplane & Ground Footplate
    // -----------------------------------------------------------------------
    const fwepGroup = new THREE.Group();
    fwepGroup.position.set(0.8, side * 8.65, 0.35);

    // Vertical Carbon Endplate
    const fwepShape = new THREE.Shape();
    fwepShape.moveTo(-2.2, -0.35);
    fwepShape.lineTo(1.8, -0.35);
    fwepShape.lineTo(1.8, 2.2);
    fwepShape.quadraticCurveTo(-0.2, 2.4, -2.2, 0.8);
    fwepShape.closePath();

    const fwepGeo = new THREE.ExtrudeGeometry(fwepShape, { steps: 1, depth: 0.05, bevelEnabled: true, bevelThickness: 0.015, bevelSize: 0.015, bevelSegments: 2 });
    const fwepMesh = new THREE.Mesh(fwepGeo, navyMat);
    fwepMesh.rotation.set(Math.PI / 2, 0, 0);
    fwepMesh.position.set(0, 0, 0);
    fwepGroup.add(fwepMesh);

    // Mobil 1 Livery Decal on Front Wing Endplate
    const epTex = createEndplateTexture(isLeft);
    const epDecalMat = new THREE.MeshStandardMaterial({
      map: epTex,
      transparent: true,
      roughness: 0.28,
      metalness: 0.35,
      side: THREE.DoubleSide
    });
    const epDecalGeo = new THREE.PlaneGeometry(3.6, 2.4);
    const epDecal = new THREE.Mesh(epDecalGeo, epDecalMat);
    epDecal.rotation.set(Math.PI / 2, 0, 0);
    epDecal.position.set(-0.2, isLeft ? 0.035 : -0.035, 0.95);
    fwepGroup.add(epDecal);

    // Outer Curved Diveplane (Sheds tyre wake vortex)
    const diveShape = new THREE.Shape();
    diveShape.moveTo(-1.1, 0);
    diveShape.lineTo(1.1, 0);
    diveShape.quadraticCurveTo(0, 0.35, -1.1, 0.15);
    diveShape.closePath();

    const diveGeo = new THREE.ExtrudeGeometry(diveShape, { steps: 1, depth: 0.04, bevelEnabled: false });
    const diveMesh = new THREE.Mesh(diveGeo, carbonMat);
    diveMesh.rotation.set(0, 0, 0);
    diveMesh.position.set(-0.1, isLeft ? 0.15 : -0.15, 0.85);
    fwepGroup.add(diveMesh);

    // Horizontal Ground Sealing Footplate
    const footGeo = new THREE.BoxGeometry(3.6, 0.45, 0.03);
    const footMesh = new THREE.Mesh(footGeo, carbonMat);
    footMesh.position.set(-0.2, isLeft ? 0.15 : -0.15, -0.35);
    fwepGroup.add(footMesh);

    frontWingGroup.add(fwepGroup);

    // Front Wheel Wake Deflector / Mudguard (Mounted behind front wing, inboard of tyre)
    const deflectorShape = new THREE.Shape();
    deflectorShape.moveTo(0, 0);
    deflectorShape.lineTo(1.8, 0);
    deflectorShape.quadraticCurveTo(1.4, 2.0, 0, 1.8);
    deflectorShape.closePath();

    const deflectorGeo = new THREE.ExtrudeGeometry(deflectorShape, { steps: 1, depth: 0.04, bevelEnabled: false });
    const deflectorMesh = new THREE.Mesh(deflectorGeo, carbonMat);
    deflectorMesh.rotation.set(Math.PI / 2, 0, 0);
    deflectorMesh.position.set(6.8, side * 6.5, 0.4);
    deflectorMesh.name = `FrontWheel_WakeDeflector_${isLeft ? 'L' : 'R'}`;
    frontWingGroup.add(deflectorMesh);
  });

  frontAeroGroup.add(frontWingGroup);
  group.add(frontAeroGroup);

  // =========================================================================
  // 2. SCULPTED 3D SIDEPODS & INTERNAL RADIATOR CORES
  // Matches Reference Images 1, 3, 5, 7:
  // - Overbite letterbox radiator scoop at X = 5.5 dm
  // - Deep lower undercut channel directing clean air to floor edge
  // - Downwash waterslide / gulley contour tapering to tight Coke-bottle rear
  // - Internal aluminum charge-air coolers and water radiators with fin matrices
  // - 6x cooling exit gills along upper shoulder
  // =========================================================================
  const sidepodGroup = new THREE.Group();
  sidepodGroup.name = 'Assembly_Sidepods_Cooling';

  [-1, 1].forEach((side, spIdx) => {
    const isLeft = side > 0;
    const pod = new THREE.Group();
    pod.name = `Sidepod_${isLeft ? 'Left' : 'Right'}`;

    // -----------------------------------------------------------------------
    // 2A. PROCEDURAL 3D LOFTED SIDEPOD BODY
    // -----------------------------------------------------------------------
    const podStations = [
      // x, y_inner, y_outer, z_bottom, z_top, undercut_y
      { x: 5.0,  yi: 2.8, yo: 6.6, zb: 0.55, zt: 4.5, yu: 3.2 },  // Intake cowl
      { x: 7.5,  yi: 3.0, yo: 6.8, zb: 0.55, zt: 4.5, yu: 3.4 },  // Deep undercut
      { x: 10.5, yi: 3.1, yo: 6.8, zb: 0.55, zt: 4.4, yu: 3.6 },  // Maximum shoulder
      { x: 14.0, yi: 3.1, yo: 6.5, zb: 0.55, zt: 3.8, yu: 3.5 },  // Waterslide gulley
      { x: 17.5, yi: 2.9, yo: 5.8, zb: 0.55, zt: 3.2, yu: 3.3 },  // Downwash slope
      { x: 21.0, yi: 2.6, yo: 4.8, zb: 0.55, zt: 2.6, yu: 3.0 },  // Coke-bottle waist
      { x: 24.5, yi: 2.3, yo: 3.8, zb: 0.55, zt: 2.1, yu: 2.7 },  // Rear coke bottle
      { x: 27.5, yi: 2.0, yo: 2.8, zb: 0.55, zt: 1.8, yu: 2.4 }   // Tail exit at rear suspension
    ];

    const podVertices = [];
    const podIndices = [];
    const podUvs = [];

    const numRad = 16;
    for (let i = 0; i < podStations.length; i++) {
      const st = podStations[i];
      const u = i / (podStations.length - 1);

      for (let j = 0; j <= numRad; j++) {
        const v = j / numRad;
        const theta = v * Math.PI * 2;

        let py, pz;
        if (v < 0.25) {
          // Top Waterslide surface: from inner tub to outer shoulder
          const f = v / 0.25;
          py = st.yi + f * (st.yo - st.yi);
          pz = st.zt - Math.sin(f * Math.PI) * 0.22; // Gulley dip
        } else if (v < 0.50) {
          // Outer flank: from top shoulder down to undercut bottom
          const f = (v - 0.25) / 0.25;
          py = st.yo - f * (st.yo - (st.x < 11.0 ? st.yu : st.yo * 0.9));
          pz = st.zt - f * (st.zt - st.zb);
        } else if (v < 0.75) {
          // Bottom floor edge / undercut tunnel
          const f = (v - 0.50) / 0.25;
          py = (st.x < 11.0 ? st.yu : st.yo * 0.9) - f * ((st.x < 11.0 ? st.yu : st.yo * 0.9) - st.yi);
          pz = st.zb;
        } else {
          // Inner wall against survival cell / engine
          const f = (v - 0.75) / 0.25;
          py = st.yi;
          pz = st.zb + f * (st.zt - st.zb);
        }

        podVertices.push(st.x, isLeft ? py : -py, pz);
        podUvs.push(u, v);
      }
    }

    for (let i = 0; i < podStations.length - 1; i++) {
      for (let j = 0; j < numRad; j++) {
        const a = i * (numRad + 1) + j;
        const b = (i + 1) * (numRad + 1) + j;
        const c = (i + 1) * (numRad + 1) + (j + 1);
        const d = i * (numRad + 1) + (j + 1);
        if (isLeft) {
          podIndices.push(a, b, d);
          podIndices.push(b, c, d);
        } else {
          podIndices.push(a, d, b);
          podIndices.push(b, d, c);
        }
      }
    }

    const podGeo = new THREE.BufferGeometry();
    podGeo.setAttribute('position', new THREE.Float32BufferAttribute(podVertices, 3));
    podGeo.setAttribute('uv', new THREE.Float32BufferAttribute(podUvs, 2));
    podGeo.setIndex(podIndices);
    podGeo.computeVertexNormals();

    const podMesh = new THREE.Mesh(podGeo, navyMat);
    podMesh.castShadow = true;
    podMesh.receiveShadow = true;
    podMesh.name = `Sidepod_Body_${isLeft ? 'LH' : 'RH'}`;
    pod.add(podMesh);

    // High-Resolution Procedural Livery Decal on Sidepod Outer Flank (Giant ORACLE wordmark)
    const sidepodTex = createSidepodLiveryTexture(isLeft);
    const sidepodLiveryMat = new THREE.MeshStandardMaterial({
      map: sidepodTex,
      transparent: true,
      roughness: 0.28,
      metalness: 0.35,
      side: THREE.DoubleSide
    });
    const flankPanelGeo = new THREE.PlaneGeometry(16.5, 3.2, 16, 4);
    const posAttr = flankPanelGeo.attributes.position;
    for (let p = 0; p < posAttr.count; p++) {
      const px = posAttr.getX(p);
      const u = (px + 8.25) / 16.5;
      const yTaper = u > 0.5 ? Math.sin((u - 0.5) * Math.PI) * 1.4 : 0;
      posAttr.setY(p, posAttr.getY(p) - (isLeft ? yTaper : -yTaper));
    }
    flankPanelGeo.computeVertexNormals();
    const flankMesh = new THREE.Mesh(flankPanelGeo, sidepodLiveryMat);
    flankMesh.rotation.set(Math.PI / 2, 0, 0);
    flankMesh.position.set(15.2, isLeft ? 6.75 : -6.75, 2.5);
    flankMesh.name = `Sidepod_OracleLivery_${isLeft ? 'LH' : 'RH'}`;
    pod.add(flankMesh);

    // Front Letterbox Radiator Intake Opening Lip (Overbite forward cowl)
    const inletRimGeo = new THREE.TorusGeometry(1.65, 0.12, 12, 24, Math.PI);
    const inletRim = new THREE.Mesh(inletRimGeo, carbonMat);
    inletRim.rotation.y = Math.PI / 2;
    inletRim.rotation.x = isLeft ? 0 : Math.PI;
    inletRim.position.set(5.3, side * 4.85, 3.4);
    pod.add(inletRim);

    // Internal Radiator Core (Angled at 42° for maximum heat rejection)
    const radCoreGeo = new THREE.BoxGeometry(0.18, 2.5, 1.9);
    const radCore = new THREE.Mesh(radCoreGeo, materials.titaniumBright);
    radCore.rotation.y = -0.55; // Angled forward rake
    radCore.position.set(7.5, side * 4.85, 2.8);
    pod.add(radCore);

    // Aluminum Billet Header Tanks & Braided Coolant Lines
    [-0.9, 0.9].forEach(hZ => {
      const hoseGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.55, 12);
      const hose = new THREE.Mesh(hoseGeo, materials.titaniumAnodized);
      hose.position.set(7.3, side * 4.85, 2.8 + hZ);
      pod.add(hose);
    });

    // 6x Stamped Carbon Cooling Exit Louvers (Gills on upper shoulder)
    for (let l = 0; l < 6; l++) {
      const lx = 12.5 + l * 0.95;
      const louverGeo = new THREE.BoxGeometry(0.72, 1.25, 0.04);
      const louver = new THREE.Mesh(louverGeo, carbonMatte);
      louver.rotation.y = -0.32;
      louver.position.set(lx, side * 4.8, 3.65 - l * 0.22);
      pod.add(louver);
    }

    // Red Bull Livery Streak along Waterslide Shoulder
    const streakGeo = new THREE.BoxGeometry(11.5, 0.08, 0.18);
    const streak = new THREE.Mesh(streakGeo, redMat);
    streak.position.set(13.5, side * 6.45, 3.45);
    pod.add(streak);

    sidepodGroup.add(pod);
  });

  group.add(sidepodGroup);

  // =========================================================================
  // 3. ENGINE COVER, PRIMARY AIRBOX & DORSAL SHARK FIN
  // Matches Reference Images 1, 3, 5:
  // - Roll hoop with yellow primary airbox inlet scoop & T-cam
  // - Sculpted carbon engine cover wrapping tight over V6 & turbo
  // - Dorsal shark fin along spine
  // - Central Inconel exhaust pipe & FIA red rain light
  // =========================================================================
  const engineCoverGroup = new THREE.Group();
  engineCoverGroup.name = 'Engine_Cover_Airbox_Fin_Assembly';

  // -------------------------------------------------------------------------
  // 3A. PRIMARY AIRBOX SCOOP (Matching Reference Image 1 & 7: Bright Yellow)
  // -------------------------------------------------------------------------
  const airboxGroup = new THREE.Group();
  airboxGroup.position.set(14.8, 0.0, 7.8);

  // Yellow Airbox Intake Scoop Cowl
  const scoopShape = new THREE.Shape();
  scoopShape.moveTo(-0.9, -0.85);
  scoopShape.lineTo(0.9, -0.85);
  scoopShape.quadraticCurveTo(1.15, 0.65, 0.0, 1.05); // Rounded top apex
  scoopShape.quadraticCurveTo(-1.15, 0.65, -0.9, -0.85);
  scoopShape.closePath();

  const scoopGeo = new THREE.ExtrudeGeometry(scoopShape, {
    steps: 1,
    depth: 3.2,
    bevelEnabled: true,
    bevelThickness: 0.15,
    bevelSize: 0.12,
    bevelSegments: 3
  });
  scoopGeo.center();
  const scoopMesh = new THREE.Mesh(scoopGeo, yellowMat);
  scoopMesh.quaternion.setFromRotationMatrix(new THREE.Matrix4().set(
    0, 0, 1, 0,
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 0, 1
  ));
  scoopMesh.position.set(1.5, 0, 0);
  scoopMesh.name = 'Airbox_Scoop_Yellow';
  airboxGroup.add(scoopMesh);

  // Black Intake Orifice / Duct Entrance
  const ductHoleGeo = new THREE.CylinderGeometry(0.72, 0.72, 1.4, 20);
  const ductHole = new THREE.Mesh(ductHoleGeo, materials.socketRecessMat);
  ductHole.rotation.z = Math.PI / 2;
  ductHole.position.set(0.2, 0, 0);
  airboxGroup.add(ductHole);

  // Vertical Carbon Splitter Vane dividing combustion vs cooling airflow
  const splitVaneGeo = new THREE.BoxGeometry(1.6, 0.06, 1.7);
  const splitVane = new THREE.Mesh(splitVaneGeo, carbonMat);
  splitVane.position.set(0.4, 0, 0);
  airboxGroup.add(splitVane);

  // Official FIA Yellow T-Camera on Roll Hoop Apex (Z = 9.55 dm)
  const tCamGeo = new THREE.BoxGeometry(0.45, 0.85, 0.18);
  const tCam = new THREE.Mesh(tCamGeo, yellowMat);
  tCam.position.set(0.8, 0, 1.75);
  tCam.name = 'FIA_T_Camera_Yellow';
  airboxGroup.add(tCam);

  engineCoverGroup.add(airboxGroup);

  // -------------------------------------------------------------------------
  // 3B. 3D LOFTED ENGINE COVER SHELL
  // Wraps tightly around the V6 turbo engine from X = 17.5 to X = 33.0
  // -------------------------------------------------------------------------
    const coverStations = [
      { x: 14.8, rw: 2.9, zc: 5.8, rz: 2.8 }, // Roll hoop bulkhead
      { x: 18.0, rw: 2.7, zc: 5.5, rz: 2.6 }, // Over V6 plenum
      { x: 21.5, rw: 2.4, zc: 5.1, rz: 2.3 }, // Over cylinder heads
      { x: 25.5, rw: 2.0, zc: 4.6, rz: 1.9 }, // Over turbo & MGU-K
      { x: 29.5, rw: 1.6, zc: 4.1, rz: 1.5 }, // Over gearbox casing
      { x: 33.2, rw: 1.0, zc: 3.6, rz: 1.0 }  // Central exhaust exit
    ];

    const ecVerts = [];
    const ecIndices = [];
    const ecUvs = [];
    const ecSegments = 32;
    const zFloor = 0.55;

    for (let i = 0; i < coverStations.length; i++) {
      const st = coverStations[i];
      const u = i / (coverStations.length - 1);

      for (let j = 0; j <= ecSegments; j++) {
        const v = j / ecSegments;
        let y, z;

        if (v < 0.25) {
          // Left vertical flank rising from floor to shoulder
          const f = v / 0.25;
          y = -st.rw;
          z = zFloor + f * (st.zc - zFloor);
        } else if (v < 0.75) {
          // Curved top arch over engine
          const f = (v - 0.25) / 0.50;
          const phi = -Math.PI / 2 + f * Math.PI;
          y = Math.sin(phi) * st.rw;
          z = st.zc + Math.cos(phi) * st.rz;
        } else {
          // Right vertical flank dropping from shoulder down to floor
          const f = (v - 0.75) / 0.25;
          y = st.rw;
          z = st.zc - f * (st.zc - zFloor);
        }

        ecVerts.push(st.x, y, z);
        ecUvs.push(u, v);
      }
    }

    for (let i = 0; i < coverStations.length - 1; i++) {
      for (let j = 0; j < ecSegments; j++) {
        const a = i * (ecSegments + 1) + j;
        const b = (i + 1) * (ecSegments + 1) + j;
        const c = (i + 1) * (ecSegments + 1) + (j + 1);
        const d = i * (ecSegments + 1) + (j + 1);
        ecIndices.push(a, d, b);
        ecIndices.push(b, d, c);
      }
    }

    const ecGeo = new THREE.BufferGeometry();
    ecGeo.setAttribute('position', new THREE.Float32BufferAttribute(ecVerts, 3));
    ecGeo.setAttribute('uv', new THREE.Float32BufferAttribute(ecUvs, 2));
    ecGeo.setIndex(ecIndices);
    ecGeo.computeVertexNormals();

    const ecMesh = new THREE.Mesh(ecGeo, navyMat);
    ecMesh.castShadow = true;
    ecMesh.receiveShadow = true;
    ecMesh.name = 'EngineCover_MainShell';
    engineCoverGroup.add(ecMesh);

    // Red Bull Charging Bull & Yellow Sun Flank Livery on Engine Cover (Matching Reference Images 1 & 7)
    [-1, 1].forEach((side, bIdx) => {
      const isLeft = side > 0;
      const ecLiveryTex = createEngineCoverLiveryTexture(isLeft);
      const ecLiveryMat = new THREE.MeshStandardMaterial({
        map: ecLiveryTex,
        transparent: true,
        roughness: 0.28,
        metalness: 0.35,
        side: THREE.DoubleSide
      });
      const ecDecalGeo = new THREE.PlaneGeometry(12.5, 3.8);
      const ecDecal = new THREE.Mesh(ecDecalGeo, ecLiveryMat);
      ecDecal.rotation.set(Math.PI / 2, 0, 0);
      ecDecal.position.set(22.5, side * 2.55, 5.0);
      ecDecal.name = `EngineCover_LiveryDecal_${isLeft ? 'LH' : 'RH'}`;
      engineCoverGroup.add(ecDecal);
    });

    // -------------------------------------------------------------------------
    // 3C. DORSAL SHARK FIN (Yaw Stability Stabilizer)
    // Extending from roll hoop apex (X = 14.8, Z = 9.2) to rear wing (X = 33.0, Z = 5.8)
    // -------------------------------------------------------------------------
    const finShape = new THREE.Shape();
    finShape.moveTo(14.8, 8.2);
    finShape.lineTo(14.8, 9.2); // Roll hoop apex
    finShape.lineTo(33.0, 5.8); // Rear wing pylon junction
    finShape.lineTo(33.0, 4.2);
    finShape.quadraticCurveTo(24.0, 5.8, 14.8, 8.2);
    finShape.closePath();

    const finExtrude = { steps: 1, depth: 0.05, bevelEnabled: true, bevelThickness: 0.015, bevelSize: 0.015, bevelSegments: 2 };
    const finGeo = new THREE.ExtrudeGeometry(finShape, finExtrude);
    finGeo.center();
    const finMesh = new THREE.Mesh(finGeo, navyMat);
    finMesh.rotation.set(Math.PI / 2, 0, 0);
    finMesh.position.set((14.8 + 33.0) / 2, 0, (9.2 + 4.2) / 2);
    finMesh.name = 'EngineCover_DorsalSharkFin';
    engineCoverGroup.add(finMesh);

    // Red Bull Yellow & Red Speed Edges on Shark Fin
    const finEdgeGeo = new THREE.BoxGeometry(18.2, 0.08, 0.12);
    const finEdge = new THREE.Mesh(finEdgeGeo, yellowMat);
    finEdge.rotation.y = -0.19;
    finEdge.position.set(23.9, 0, 7.5);
    engineCoverGroup.add(finEdge);

  // -------------------------------------------------------------------------
  // 3D. CENTRAL INCONEL EXHAUST & FIA RED RAIN LIGHT
  // Matches Reference Images 3 & 4 (Rear view)!
  // -------------------------------------------------------------------------
  const exhaustGroup = new THREE.Group();
  exhaustGroup.position.set(33.2, 0.0, 3.6);

  // Inconel Round Tailpipe (76mm FIA spec)
  const tailpipeGeo = new THREE.CylinderGeometry(0.38, 0.38, 1.6, 24, 1, true);
  const tailpipeMesh = new THREE.Mesh(tailpipeGeo, materials.inconelTurbine);
  tailpipeMesh.rotation.z = Math.PI / 2;
  exhaustGroup.add(tailpipeMesh);

  // Thermal Gold Ceramic Heat Shield Surround Ring
  const shieldRingGeo = new THREE.CylinderGeometry(0.48, 0.48, 0.28, 24, 1, true);
  const shieldRing = new THREE.Mesh(shieldRingGeo, materials.heatShieldGold);
  shieldRing.rotation.z = Math.PI / 2;
  shieldRing.position.set(-0.6, 0, 0);
  exhaustGroup.add(shieldRing);

  // Glowing Exhaust Core
  const glowCoreGeo = new THREE.CylinderGeometry(0.33, 0.33, 0.9, 16);
  const glowCore = new THREE.Mesh(glowCoreGeo, materials.ledRed);
  glowCore.rotation.z = Math.PI / 2;
  glowCore.position.set(-0.4, 0, 0);
  exhaustGroup.add(glowCore);

  // Rear Impact Structure (RIS) housing Central FIA Red Rain Light directly below exhaust
  const risHousingGeo = new THREE.BoxGeometry(1.2, 0.95, 0.85);
  const risHousing = new THREE.Mesh(risHousingGeo, carbonMat);
  risHousing.position.set(0.2, 0, -1.2);
  exhaustGroup.add(risHousing);

  // Central 15-LED Red Rain Safety Light
  const rainLightGeo = new THREE.BoxGeometry(0.08, 0.75, 0.55);
  const rainLight = new THREE.Mesh(rainLightGeo, materials.ledRed);
  rainLight.position.set(0.82, 0, -1.2);
  rainLight.name = 'FIA_CentralRainLight';
  exhaustGroup.add(rainLight);

  engineCoverGroup.add(exhaustGroup);
  group.add(engineCoverGroup);

  // =========================================================================
  // 4. ACTIVE REAR WING ASSEMBLY
  // Matches Reference Images 1, 3, 4 (Rear view):
  // - 3D contoured spoon mainplane (14.8 dm width)
  // - Active upper flap articulating between 26° (Z-Mode) and 3° (X-Mode)
  // - Dual angled swan-neck endplate pylons rising from diffuser floor
  // - Dual vertical red LED safety rain light strips on endplate trailing edges (12 LEDs each side!)
  // =========================================================================
  const rearWingGroup = new THREE.Group();
  rearWingGroup.name = 'Assembly_Active_Rear_Wing';
  rearWingGroup.position.set(36.8, 0.0, 7.4);

  const rwFlapAngle = options.rearFlapAngle || 0.45; // Default Z-Mode angle

  // Spoon-Shaped Mainplane with 45mm center droop
  const rwCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.0, -7.4, 0.35),
    new THREE.Vector3(0.1, -3.8, 0.05),
    new THREE.Vector3(0.2, 0.0, 0.0),
    new THREE.Vector3(0.1, 3.8, 0.05),
    new THREE.Vector3(0.0, 7.4, 0.35)
  ]);

  const rwShape = new THREE.Shape();
  rwShape.moveTo(-1.2, 0);
  rwShape.quadraticCurveTo(0.1, 0.16, 1.2, 0.08);
  rwShape.lineTo(1.1, -0.05);
  rwShape.quadraticCurveTo(0.1, -0.02, -1.2, -0.04);
  rwShape.closePath();

  const rwMainGeo = new THREE.ExtrudeGeometry(rwShape, {
    steps: 20,
    bevelEnabled: false,
    extrudePath: rwCurve
  });
  const rwMainMesh = new THREE.Mesh(rwMainGeo, carbonMat);
  rwMainMesh.castShadow = true;
  rwMainMesh.name = 'RearWing_Spoon_Mainplane';
  rearWingGroup.add(rwMainMesh);

  // Active Movable Upper Flap
  const rwFlapPivot = new THREE.Group();
  rwFlapPivot.position.set(0.65, 0, 0.28);
  rwFlapPivot.rotation.y = rwFlapAngle; // DRS / X-Mode articulation

  const rwFlapShape = new THREE.Shape();
  rwFlapShape.moveTo(-0.6, 0);
  rwFlapShape.quadraticCurveTo(0.1, 0.16, 0.85, 0.06);
  rwFlapShape.lineTo(0.8, 0.0);
  rwFlapShape.quadraticCurveTo(0.1, 0.06, -0.6, -0.02);
  rwFlapShape.closePath();

  const rwFlapGeo = new THREE.ExtrudeGeometry(rwFlapShape, { steps: 4, depth: 14.4, bevelEnabled: false });
  rwFlapGeo.center();
  const rwFlapMesh = new THREE.Mesh(rwFlapGeo, carbonMat);
  rwFlapMesh.rotation.x = Math.PI / 2;
  rwFlapMesh.name = 'RearWing_Active_UpperFlap';
  rwFlapPivot.add(rwFlapMesh);

  // Giant Bold White ORACLE Typography Decal across Rear Wing Upper Flap
  const rwOracleTex = createRearWingOracleTexture();
  const rwOracleMat = new THREE.MeshStandardMaterial({
    map: rwOracleTex,
    roughness: 0.25,
    metalness: 0.40,
    side: THREE.DoubleSide
  });
  const oracleDecalGeo = new THREE.PlaneGeometry(14.2, 1.4);
  const oracleDecal = new THREE.Mesh(oracleDecalGeo, rwOracleMat);
  oracleDecal.rotation.set(-Math.PI / 2, 0, 0);
  oracleDecal.position.set(0.1, 0, 0.08);
  rwFlapPivot.add(oracleDecal);

  // Centerline Moog Electro-Hydraulic DRS Actuator Ram
  const actRamGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.45, 12);
  const actRam = new THREE.Mesh(actRamGeo, materials.titaniumAnodized);
  actRam.rotation.z = Math.PI / 2;
  actRam.position.set(-0.25, 0, 0);
  rwFlapPivot.add(actRam);

  rearWingGroup.add(rwFlapPivot);

  // Dual Swan-Neck Endplate Pylons & Vertical Red Rain LED Strips (Left & Right)
  // Exactly matching Reference Image 3 (Rear view with glowing red vertical LED strips)!
  [-1, 1].forEach((side, epIdx) => {
    const isLeft = side > 0;
    const endplateGroup = new THREE.Group();
    endplateGroup.name = `RearWing_Endplate_${isLeft ? 'Left' : 'Right'}`;

    // Angled Swan-Neck Pylon rising from diffuser floor
    const pylonCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-1.8, side * 3.8, -4.8), // Diffuser mounting foot
      new THREE.Vector3(-1.2, side * 5.2, -2.5),
      new THREE.Vector3(-0.6, side * 6.5, -0.4),
      new THREE.Vector3(0.0, side * 7.4, 0.3)    // Endplate junction
    ]);
    const pylonGeo = new THREE.TubeGeometry(pylonCurve, 24, 0.12, 8, false);
    pylonGeo.scale(1.8, 0.7, 1.0); // Aerodynamic flat chord
    const pylonMesh = new THREE.Mesh(pylonGeo, carbonMat);
    endplateGroup.add(pylonMesh);

    // Vertical Carbon Endplate Fin
    const epFinShape = new THREE.Shape();
    epFinShape.moveTo(-1.8, -0.8);
    epFinShape.lineTo(1.8, -0.6);
    epFinShape.lineTo(1.8, 1.6);
    epFinShape.lineTo(-1.8, 1.4);
    epFinShape.closePath();

    const epFinGeo = new THREE.ExtrudeGeometry(epFinShape, { steps: 1, depth: 0.05, bevelEnabled: true, bevelThickness: 0.015, bevelSize: 0.015, bevelSegments: 2 });
    const epFinMesh = new THREE.Mesh(epFinGeo, navyMat);
    epFinMesh.rotation.set(Math.PI / 2, 0, 0);
    epFinMesh.position.set(0, side * 7.4, 0.4);
    endplateGroup.add(epFinMesh);

    // Mobil 1 Livery on Rear Wing Endplate
    const epTex = createEndplateTexture(isLeft);
    const epDecalMat = new THREE.MeshStandardMaterial({
      map: epTex,
      transparent: true,
      roughness: 0.28,
      metalness: 0.35,
      side: THREE.DoubleSide
    });
    const epDecalGeo = new THREE.PlaneGeometry(3.5, 2.3);
    const epDecal = new THREE.Mesh(epDecalGeo, epDecalMat);
    epDecal.rotation.set(Math.PI / 2, 0, 0);
    epDecal.position.set(0, side * (7.4 + (isLeft ? 0.035 : -0.035)), 0.4);
    endplateGroup.add(epDecal);

    // VERTICAL RED LED RAIN LIGHT STRIP (Matching Reference Image 3 & 4!)
    // 12 discrete high-intensity red LEDs aligned vertically on endplate trailing edge
    const ledStripGroup = new THREE.Group();
    ledStripGroup.position.set(1.82, side * 7.42, 0.4);

    const stripHousingGeo = new THREE.BoxGeometry(0.05, 0.05, 1.8);
    const stripHousing = new THREE.Mesh(stripHousingGeo, carbonMatte);
    ledStripGroup.add(stripHousing);

    const ledGeo = new THREE.CylinderGeometry(0.024, 0.024, 0.04, 8);
    for (let k = 0; k < 12; k++) {
      const ledZ = -0.8 + k * 0.145;
      const led = new THREE.Mesh(ledGeo, materials.ledRed);
      led.rotation.z = Math.PI / 2;
      led.position.set(0.03, 0, ledZ);
      led.name = `RainLED_${isLeft ? 'LH' : 'RH'}_${k}`;
      ledStripGroup.add(led);
    }
    endplateGroup.add(ledStripGroup);

    rearWingGroup.add(endplateGroup);
  });

  // Lower Beam Wing (Extracts diffuser upwash)
  const beamWingGeo = new THREE.BoxGeometry(0.85, 9.2, 0.04);
  const beamWing = new THREE.Mesh(beamWingGeo, carbonMat);
  beamWing.position.set(-1.4, 0, -4.6);
  rearWingGroup.add(beamWing);

  group.add(rearWingGroup);

  return group;
}
