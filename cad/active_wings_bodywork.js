/**
 * 2026 Formula 1 "Nimble Car" Bodywork & Active Aerodynamics
 * SREdesigns - Samuel R Erwin III
 * 
 * 3D CAD for 2026 Formula 1 Active Front & Rear Wings, FIS Nosecone,
 * Sidepods, Radiator Ducts, Shark Fin, and Endplates.
 * Fully matching user wireframe engineering drawings.
 */

import * as THREE from 'three';
import { materials } from '../materials.js';
import {
  createSidepodLiveryTexture,
  createEngineCoverLiveryTexture,
  createNoseconeLiveryTexture,
  createRearWingOracleTexture,
  createEndplateTexture,
  createRearWingEndplateInnerTexture
} from './procedural_livery.js';

/**
 * Helper: Create an explicit 3D quad decal with deterministic UVs
 * Guaranteed zero upside-down or backwards rotation issues.
 * @param {THREE.Vector3} p00 - Bottom-Left (UV 0, 0)
 * @param {THREE.Vector3} p10 - Bottom-Right (UV 1, 0)
 * @param {THREE.Vector3} p11 - Top-Right (UV 1, 1)
 * @param {THREE.Vector3} p01 - Top-Left (UV 0, 1)
 * @param {THREE.Material} material
 */
function createDecalQuad(p00, p10, p11, p01, material) {
  const geo = new THREE.BufferGeometry();
  const positions = new Float32Array([
    p00.x, p00.y, p00.z,
    p10.x, p10.y, p10.z,
    p11.x, p11.y, p11.z,

    p00.x, p00.y, p00.z,
    p11.x, p11.y, p11.z,
    p01.x, p01.y, p01.z,
  ]);
  const uvs = new Float32Array([
    0, 0,
    1, 0,
    1, 1,

    0, 0,
    1, 1,
    0, 1,
  ]);
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, material);
  mesh.castShadow = true;
  return mesh;
}

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
  // Matches User Wireframe Drawing (media_1790507089454.png):
  // - Smooth parabolic drooping nosecone from Bulkhead A down to front wing datum
  // - Low-ground-clearance spoon mainplane (Z = 0.55 dm = 55 mm off tarmac)
  // - 2-Stage active flaps with authentic slot gaps
  // - Flared ski-ramp footplate on outer endplates
  // =========================================================================
  const frontAeroGroup = new THREE.Group();
  frontAeroGroup.name = 'Assembly_Active_Front_Aero';

  // -------------------------------------------------------------------------
  // 1A. PROCEDURAL 3D LOFTED NOSECONE (FIA Front Impact Structure)
  // Drooping continuously from Cockpit Bulkhead (X = 0) down to Front Wing (X = -10.2)
  // -------------------------------------------------------------------------
  const noseGroup = new THREE.Group();
  noseGroup.name = 'Nosecone_FIS_Assembly';

  const numRings = 28;
  const numSegments = 32;
  const noseVertices = [];
  const noseIndices = [];
  const noseUvs = [];

  for (let i = 0; i <= numRings; i++) {
    const u = i / numRings; // 0.0 at Bulkhead A-A (X=0), 1.0 at nose tip (X=-10.2)
    const x = -u * 10.2;

    // Smooth continuous convex curvature from Z = 3.9 down to Z = 1.05
    const zCenter = 2.60 - 1.55 * Math.pow(u, 1.35);

    // Cross-sectional radii (smoothly tapering from monocoque to aerodynamic tip)
    const ry = 1.65 * (1.0 - 0.68 * u); // Half-width (1.65 dm down to 0.52 dm)
    const rz = 1.55 * (1.0 - 0.64 * u); // Half-height (1.55 dm down to 0.55 dm)

    for (let j = 0; j <= numSegments; j++) {
      const theta = (j / numSegments) * Math.PI * 2;
      const y = Math.cos(theta) * ry;
      let z = zCenter + Math.sin(theta) * rz;
      if (Math.sin(theta) < 0) {
        // Flat underside for clean ground effect keel
        z = zCenter + Math.sin(theta) * rz * 0.75;
      }

      noseVertices.push(x, y, z);
      noseUvs.push(u, j / numSegments);
    }
  }

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

  // Vibrant Racing Yellow Nose Tip Dome
  const tipGeo = new THREE.SphereGeometry(0.52, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2);
  const tipMesh = new THREE.Mesh(tipGeo, yellowMat);
  tipMesh.rotation.z = Math.PI / 2;
  tipMesh.position.set(-10.2, 0, 1.05);
  tipMesh.scale.set(0.65, 1.0, 0.95);
  tipMesh.name = 'Nosecone_YellowTip';
  noseGroup.add(tipMesh);

  // Horizontal Side Camera Pods on Nose (Matching wireframe drawing)
  [-1, 1].forEach((side, cIdx) => {
    const camGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.55, 12);
    const camMesh = new THREE.Mesh(camGeo, carbonMatte);
    camMesh.rotation.x = Math.PI / 2;
    camMesh.position.set(-6.5, side * 1.55, 2.3);
    noseGroup.add(camMesh);
  });

  // Vertical Pitot Mast on Upper Nose Bridge (Matching wireframe markup)
  const pitotMastGeo = new THREE.CylinderGeometry(0.02, 0.03, 0.75, 12);
  const pitotMast = new THREE.Mesh(pitotMastGeo, materials.titaniumBright);
  pitotMast.position.set(-2.0, 0, 4.45);
  noseGroup.add(pitotMast);

  const pitotProbeGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.45, 8);
  const pitotProbe = new THREE.Mesh(pitotProbeGeo, materials.titaniumBright);
  pitotProbe.rotation.z = Math.PI / 2;
  pitotProbe.position.set(-2.2, 0, 4.8);
  noseGroup.add(pitotProbe);

  frontAeroGroup.add(noseGroup);

  // -------------------------------------------------------------------------
  // 1B. ACTIVE FRONT WING MAINPLANE & FLAPS
  // Spanning Y in [-8.8, +8.8] dm, ground clearance Z = 0.55 dm (55 mm off tarmac)
  // -------------------------------------------------------------------------
  const frontWingGroup = new THREE.Group();
  frontWingGroup.name = 'FrontWing_Aerofoil_Assembly';
  frontWingGroup.position.set(-9.8, 0.0, 0.55);

  // Front Wing Mainplane Mesh (Contoured continuous carbon spoon mainplane)
  const mainplaneWidth = 17.6; // 1760 mm span
  const mainplaneChord = 2.4;  // 240 mm chord
  const mainplaneShape = new THREE.Shape();
  mainplaneShape.moveTo(-1.2, 0.0);
  mainplaneShape.quadraticCurveTo(0.0, 0.16, 1.2, 0.06);
  mainplaneShape.lineTo(1.15, -0.02);
  mainplaneShape.quadraticCurveTo(0.0, 0.04, -1.2, -0.04);
  mainplaneShape.closePath();

  const fwMainGeo = new THREE.ExtrudeGeometry(mainplaneShape, { steps: 24, depth: mainplaneWidth, bevelEnabled: false });
  fwMainGeo.center();

  // Apply subtle sweep-back and center spoon droop across vertices
  const fwPos = fwMainGeo.attributes.position;
  for (let p = 0; p < fwPos.count; p++) {
    const ySpan = fwPos.getY(p); // Spanwise coordinate before rotation
    const normSpan = Math.abs(ySpan) / (mainplaneWidth / 2);
    // Sweep-back: tips move rearward by 1.2 dm
    fwPos.setX(p, fwPos.getX(p) + Math.pow(normSpan, 1.5) * 1.2);
    // Center droop: tips rise by 0.35 dm
    fwPos.setZ(p, fwPos.getZ(p) + Math.pow(normSpan, 2.0) * 0.35);
  }
  fwMainGeo.computeVertexNormals();

  const fwMainMesh = new THREE.Mesh(fwMainGeo, carbonMat);
  fwMainMesh.rotation.x = Math.PI / 2; // Span along Y
  fwMainMesh.castShadow = true;
  fwMainMesh.name = 'FrontWing_Mainplane';
  frontWingGroup.add(fwMainMesh);

  // -------------------------------------------------------------------------
  // 1C. 2-STAGE ACTIVE UPPER FLAPS (Left & Right)
  // Articulating between Z-Mode (+22°) and X-Mode (+4°)
  // -------------------------------------------------------------------------
  const activeFlapAngle = options.frontFlapAngle || 0.38;

  [-1, 1].forEach((side, sIdx) => {
    const isLeft = side > 0;
    const flapAssembly = new THREE.Group();
    flapAssembly.name = `FrontWing_ActiveFlap_${isLeft ? 'Left' : 'Right'}`;
    flapAssembly.position.set(0.25, side * 5.0, 0.22);

    const pivotNode = new THREE.Group();
    pivotNode.rotation.y = isLeft ? activeFlapAngle : -activeFlapAngle;

    // Flap 1 (Lower Active Element)
    const flap1Shape = new THREE.Shape();
    flap1Shape.moveTo(-0.55, 0.0);
    flap1Shape.quadraticCurveTo(0.0, 0.12, 0.65, 0.05);
    flap1Shape.lineTo(0.60, 0.01);
    flap1Shape.quadraticCurveTo(0.0, 0.04, -0.55, -0.02);
    flap1Shape.closePath();

    const flap1Geo = new THREE.ExtrudeGeometry(flap1Shape, { steps: 4, depth: 7.2, bevelEnabled: false });
    flap1Geo.center();
    const flap1Mesh = new THREE.Mesh(flap1Geo, navyMat);
    flap1Mesh.rotation.x = Math.PI / 2;
    pivotNode.add(flap1Mesh);

    // Flap 2 (Upper Gurney Element with 12mm slot gap)
    const flap2Shape = new THREE.Shape();
    flap2Shape.moveTo(-0.40, 0.0);
    flap2Shape.quadraticCurveTo(0.0, 0.10, 0.45, 0.04);
    flap2Shape.lineTo(0.42, 0.01);
    flap2Shape.quadraticCurveTo(0.0, 0.03, -0.40, -0.02);
    flap2Shape.closePath();

    const flap2Geo = new THREE.ExtrudeGeometry(flap2Shape, { steps: 4, depth: 6.8, bevelEnabled: false });
    flap2Geo.center();
    const flap2Mesh = new THREE.Mesh(flap2Geo, navyMat);
    flap2Mesh.rotation.x = Math.PI / 2;
    flap2Mesh.position.set(0.35, 0, 0.18); // Elevated slot gap
    pivotNode.add(flap2Mesh);

    // 4x Slot Gap Separators (connecting Flap 1 and Flap 2)
    for (let s = 0; s < 4; s++) {
      const sepY = -2.7 + s * 1.8;
      const sepGeo = new THREE.BoxGeometry(0.35, 0.03, 0.22);
      const sepMesh = new THREE.Mesh(sepGeo, carbonMatte);
      sepMesh.position.set(0.18, sepY, 0.09);
      pivotNode.add(sepMesh);
    }

    flapAssembly.add(pivotNode);
    frontWingGroup.add(flapAssembly);

    // -----------------------------------------------------------------------
    // 1D. FRONT WING ENDPLATE (FWEP) & FLARED SKI-RAMP FOOTPLATE
    // Directly matching user red circle markup in media_1790507089454.png!
    // -----------------------------------------------------------------------
    const fwepGroup = new THREE.Group();
    fwepGroup.position.set(0.6, side * 8.8, 0.25);

    // 1. Vertical Curved Endplate Wall
    const fwepWallShape = new THREE.Shape();
    fwepWallShape.moveTo(-2.4, -0.25); // Forward lower point
    fwepWallShape.lineTo(1.8, -0.25);  // Aft lower point
    fwepWallShape.lineTo(1.8, 1.4);    // Aft upper point
    fwepWallShape.quadraticCurveTo(0.0, 2.6, -2.4, 1.2); // Smooth curved upper leading crest
    fwepWallShape.closePath();

    const fwepWallGeo = new THREE.ExtrudeGeometry(fwepWallShape, {
      steps: 1,
      depth: 0.05,
      bevelEnabled: true,
      bevelThickness: 0.015,
      bevelSize: 0.015,
      bevelSegments: 2
    });
    const fwepWallMesh = new THREE.Mesh(fwepWallGeo, navyMat);
    fwepWallMesh.rotation.set(Math.PI / 2, 0, 0);
    fwepWallMesh.position.set(0, 0, 0);
    fwepGroup.add(fwepWallMesh);

    // 2. Wide Flared Ski-Ramp Footplate (Circled in Red by User!)
    // Curves outward horizontally and curls slightly upward
    const footplateShape = new THREE.Shape();
    footplateShape.moveTo(-2.4, 0.0);
    footplateShape.lineTo(1.8, 0.0);
    footplateShape.quadraticCurveTo(1.6, 0.85, 0.0, 0.95); // Flaring outward like a ski
    footplateShape.quadraticCurveTo(-1.8, 0.95, -2.4, 0.0);
    footplateShape.closePath();

    const footplateGeo = new THREE.ExtrudeGeometry(footplateShape, { steps: 1, depth: 0.04, bevelEnabled: false });
    const footplateMesh = new THREE.Mesh(footplateGeo, carbonMat);
    // Orient flat on ground, flaring outward
    footplateMesh.rotation.set(isLeft ? 0.08 : -0.08, 0, 0); // Slight ski angle
    footplateMesh.position.set(0, isLeft ? 0.02 : -0.02, -0.25);
    if (!isLeft) footplateMesh.scale.y = -1; // Mirror outward for right side
    fwepGroup.add(footplateMesh);

    // 3. Upright Mobil 1 Decal on Endplate Outer Face
    const epTex = createEndplateTexture(isLeft);
    const epDecalMat = new THREE.MeshStandardMaterial({
      map: epTex,
      transparent: true,
      roughness: 0.28,
      metalness: 0.35,
      side: THREE.DoubleSide
    });
    const p00 = new THREE.Vector3(-1.8, isLeft ? 0.035 : -0.035, -0.1);
    const p10 = new THREE.Vector3(1.6, isLeft ? 0.035 : -0.035, -0.1);
    const p11 = new THREE.Vector3(1.6, isLeft ? 0.035 : -0.035, 1.4);
    const p01 = new THREE.Vector3(-1.8, isLeft ? 0.035 : -0.035, 1.4);
    const epDecalMesh = isLeft
      ? createDecalQuad(p00, p10, p11, p01, epDecalMat)
      : createDecalQuad(p10, p00, p01, p11, epDecalMat);
    fwepGroup.add(epDecalMesh);

    frontWingGroup.add(fwepGroup);
  });

  frontAeroGroup.add(frontWingGroup);
  group.add(frontAeroGroup);

  // =========================================================================
  // 2. SCULPTED 3D SIDEPODS & INTERNAL RADIATOR CORES
  // Overbite letterbox intakes, deep undercuts, and right-side-up ORACLE livery
  // =========================================================================
  const sidepodGroup = new THREE.Group();
  sidepodGroup.name = 'Sidepod_Assembly_LH_RH';

  [-1, 1].forEach((side, idx) => {
    const isLeft = side > 0;
    const pod = new THREE.Group();

    // Sidepod Outer Shell Profile (Lofted from X = 5.0 to X = 28.5)
    const podShape = new THREE.Shape();
    podShape.moveTo(5.0, 1.8);
    podShape.lineTo(6.5, 3.8);   // Overbite forward top lip
    podShape.lineTo(16.0, 3.8);  // Flat shoulder
    podShape.quadraticCurveTo(24.0, 3.6, 28.5, 1.2); // Downwash Coke-bottle ramp
    podShape.lineTo(28.5, 0.4);
    podShape.lineTo(5.0, 0.4);   // Floor datum
    podShape.closePath();

    const podExtrude = {
      steps: 4,
      depth: 4.8,
      bevelEnabled: true,
      bevelThickness: 0.35,
      bevelSize: 0.35,
      bevelSegments: 4
    };
    const podGeo = new THREE.ExtrudeGeometry(podShape, podExtrude);
    podGeo.center();

    // Sculpt deep undercut into vertices
    const pAttr = podGeo.attributes.position;
    for (let p = 0; p < pAttr.count; p++) {
      const pX = pAttr.getX(p);
      const pY = pAttr.getY(p);
      const pZ = pAttr.getZ(p);
      if (pX < 0 && pZ < 0) {
        // Deep front undercut
        pAttr.setY(p, pY * 0.72);
      }
    }
    podGeo.computeVertexNormals();

    const podMesh = new THREE.Mesh(podGeo, navyMat);
    podMesh.rotation.x = isLeft ? Math.PI / 2 : -Math.PI / 2;
    podMesh.position.set(16.5, side * 6.2, 2.1);
    podMesh.castShadow = true;
    podMesh.receiveShadow = true;
    podMesh.name = `Sidepod_Body_${isLeft ? 'LH' : 'RH'}`;
    pod.add(podMesh);

    // -----------------------------------------------------------------------
    // Right-Side-Up Procedural Livery Decal on Sidepod Outer Flank
    // Uses explicit 3D quad coordinates: 100% upright on both LH and RH sides
    // -----------------------------------------------------------------------
    const sidepodTex = createSidepodLiveryTexture(isLeft);
    const sidepodLiveryMat = new THREE.MeshStandardMaterial({
      map: sidepodTex,
      transparent: true,
      roughness: 0.28,
      metalness: 0.35,
      side: THREE.DoubleSide
    });

    const flankY = side * 8.65;
    const spP00 = new THREE.Vector3(7.0, flankY, 0.8);  // Front lower
    const spP10 = new THREE.Vector3(25.0, flankY, 0.8); // Rear lower
    const spP11 = new THREE.Vector3(25.0, flankY, 3.8); // Rear upper
    const spP01 = new THREE.Vector3(7.0, flankY, 3.8);  // Front upper

    const flankMesh = isLeft
      ? createDecalQuad(spP00, spP10, spP11, spP01, sidepodLiveryMat)
      : createDecalQuad(spP10, spP00, spP01, spP11, sidepodLiveryMat);
    flankMesh.name = `Sidepod_OracleLivery_${isLeft ? 'LH' : 'RH'}`;
    pod.add(flankMesh);

    // Forward Letterbox Radiator Intake Opening Lip (Overbite forward cowl)
    const inletRimGeo = new THREE.TorusGeometry(1.65, 0.12, 12, 24, Math.PI);
    const inletRim = new THREE.Mesh(inletRimGeo, carbonMat);
    inletRim.rotation.y = Math.PI / 2;
    inletRim.rotation.x = isLeft ? 0 : Math.PI;
    inletRim.position.set(5.3, side * 4.85, 3.4);
    pod.add(inletRim);

    // Internal Radiator Core (Angled at 42°)
    const radCoreGeo = new THREE.BoxGeometry(0.18, 2.5, 1.9);
    const radCore = new THREE.Mesh(radCoreGeo, materials.titaniumBright);
    radCore.rotation.y = -0.55;
    radCore.position.set(7.5, side * 4.85, 2.8);
    pod.add(radCore);

    sidepodGroup.add(pod);
  });

  group.add(sidepodGroup);

  // =========================================================================
  // 3. ENGINE COVER, PRIMARY AIRBOX & DORSAL SHARK FIN
  // =========================================================================
  const engineCoverGroup = new THREE.Group();
  engineCoverGroup.name = 'Engine_Cover_Airbox_Fin_Assembly';

  // Primary Airbox Scoop (Yellow)
  const airboxGroup = new THREE.Group();
  airboxGroup.position.set(14.8, 0.0, 7.8);

  const scoopShape = new THREE.Shape();
  scoopShape.moveTo(-0.9, -0.85);
  scoopShape.lineTo(0.9, -0.85);
  scoopShape.quadraticCurveTo(1.15, 0.65, 0.0, 1.05);
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

  // FIA Yellow T-Camera on Roll Hoop Apex
  const tCamGeo = new THREE.BoxGeometry(0.45, 0.85, 0.18);
  const tCam = new THREE.Mesh(tCamGeo, yellowMat);
  tCam.position.set(0.8, 0, 1.75);
  tCam.name = 'FIA_T_Camera_Yellow';
  airboxGroup.add(tCam);

  engineCoverGroup.add(airboxGroup);

  // 3D Lofted Engine Cover Shell (Tight wrap over V6 turbo)
  const coverStations = [
    { x: 14.8, rw: 2.9, zc: 5.8, rz: 2.8 },
    { x: 18.0, rw: 2.7, zc: 5.5, rz: 2.6 },
    { x: 21.5, rw: 2.4, zc: 5.1, rz: 2.3 },
    { x: 25.5, rw: 2.0, zc: 4.6, rz: 1.9 },
    { x: 29.5, rw: 1.6, zc: 4.1, rz: 1.5 },
    { x: 33.2, rw: 1.0, zc: 3.6, rz: 1.0 }
  ];

  const ecVerts = [];
  const ecIndices = [];
  const ecUvs = [];
  const ecSegments = 32;

  for (let i = 0; i < coverStations.length; i++) {
    const st = coverStations[i];
    const u = i / (coverStations.length - 1);
    for (let j = 0; j <= ecSegments; j++) {
      const v = j / ecSegments;
      const phi = v * Math.PI; // Top half-shell
      const y = Math.cos(phi) * st.rw;
      const z = Math.max(0.55, st.zc + Math.sin(phi) * st.rz);
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
      ecIndices.push(a, b, d);
      ecIndices.push(b, c, d);
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

  // Red Bull Charging Bull Decals on Engine Cover Flanks
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
    const ecY = side * 2.55;
    const ecP00 = new THREE.Vector3(16.0, ecY, 3.2);
    const ecP10 = new THREE.Vector3(28.0, ecY, 3.2);
    const ecP11 = new THREE.Vector3(28.0, ecY, 6.8);
    const ecP01 = new THREE.Vector3(16.0, ecY, 6.8);
    const ecDecal = isLeft
      ? createDecalQuad(ecP00, ecP10, ecP11, ecP01, ecLiveryMat)
      : createDecalQuad(ecP10, ecP00, ecP01, ecP11, ecLiveryMat);
    ecDecal.name = `EngineCover_LiveryDecal_${isLeft ? 'LH' : 'RH'}`;
    engineCoverGroup.add(ecDecal);
  });

  // Dorsal Shark Fin along Engine Spine
  const finShape = new THREE.Shape();
  finShape.moveTo(14.8, 8.2);
  finShape.lineTo(14.8, 9.2); // Apex
  finShape.lineTo(33.0, 5.8); // Rear wing pylon junction
  finShape.lineTo(33.0, 4.2);
  finShape.quadraticCurveTo(24.0, 5.8, 14.8, 8.2);
  finShape.closePath();

  const finExtrude = { steps: 1, depth: 0.05, bevelEnabled: true, bevelThickness: 0.015, bevelSize: 0.015, bevelSegments: 2 };
  const finGeo = new THREE.ExtrudeGeometry(finShape, finExtrude);
  finGeo.center();
  const finMesh = new THREE.Mesh(finGeo, navyMat);
  finMesh.rotation.set(Math.PI / 2, 0, 0);
  finMesh.position.set(23.9, 0, 6.7);
  finMesh.name = 'Dorsal_Shark_Fin';
  engineCoverGroup.add(finMesh);

  // Central Single Inconel Tailpipe Exhaust (Article C5.8) - media_1790507837418.webp
  const exhaustGroup = new THREE.Group();
  exhaustGroup.name = 'PU_Exhaust_Tailpipe_Assembly';
  exhaustGroup.position.set(36.2, 0, 3.75);

  // Main tubular exhaust pipe
  const tailpipeGeo = new THREE.CylinderGeometry(0.40, 0.44, 4.2, 32, 1, true);
  const tailpipe = new THREE.Mesh(tailpipeGeo, materials.inconelExhaust);
  tailpipe.rotation.z = Math.PI / 2;
  exhaustGroup.add(tailpipe);

  // Heat Discoloration Lip (Titanium blue/gold heat oxidation ring)
  const lipGeo = new THREE.TorusGeometry(0.40, 0.035, 12, 32);
  const lipMat = new THREE.MeshStandardMaterial({
    color: 0x3d66aa, // Heat-tinted titanium blue
    roughness: 0.25,
    metalness: 0.92
  });
  const lip = new THREE.Mesh(lipGeo, lipMat);
  lip.rotation.y = Math.PI / 2;
  lip.position.set(2.1, 0, 0);
  exhaustGroup.add(lip);

  engineCoverGroup.add(exhaustGroup);

  group.add(engineCoverGroup);

  // =========================================================================
  // 4. ACTIVE REAR WING ASSEMBLY (REAR SPOILER)
  // Rebuilt with genuine horizontal spoon aerofoil geometry (zero Frenet frame bugs)
  // - True horizontal spoon mainplane (14.8 dm width, chord 2.4 dm along X)
  // - Active upper flap articulating between 26° (Z-Mode) and 3° (X-Mode)
  // - Backward-facing 100% upright bold ORACLE wordmark
  // - Dual structural swan-neck pylons mounting from diffuser
  // - Dual vertical red LED safety rain light strips (12 LEDs each)
  // =========================================================================
  const rearWingGroup = new THREE.Group();
  rearWingGroup.name = 'Assembly_Active_Rear_Wing';
  rearWingGroup.position.set(36.8, 0.0, 7.4);

  const rwFlapAngle = options.rearFlapAngle || 0.45; // Default Z-Mode angle

  // -------------------------------------------------------------------------
  // 4A. REAR WING SPOON MAINPLANE (Genuine Horizontal Aerofoil)
  // -------------------------------------------------------------------------
  const rwSpan = 14.8;  // 1480 mm width
  const rwChord = 2.4;  // 240 mm chord along X
  const rwMainShape = new THREE.Shape();
  rwMainShape.moveTo(-1.2, 0.0);
  rwMainShape.quadraticCurveTo(0.0, 0.18, 1.2, 0.06);
  rwMainShape.lineTo(1.15, -0.02);
  rwMainShape.quadraticCurveTo(0.0, 0.04, -1.2, -0.04);
  rwMainShape.closePath();

  const rwMainGeo = new THREE.ExtrudeGeometry(rwMainShape, { steps: 24, depth: rwSpan, bevelEnabled: false });
  rwMainGeo.center();
  rwMainGeo.rotateX(Math.PI / 2); // Rotate on geometry: chord on X, span on Y, thickness on Z

  // Apply subtle symmetrical spoon center droop (curving down 25 mm at Y = 0)
  const rwMainPos = rwMainGeo.attributes.position;
  for (let p = 0; p < rwMainPos.count; p++) {
    const ySpan = rwMainPos.getY(p); // Span along Y
    const norm = Math.abs(ySpan) / (rwSpan / 2);
    // Center dips down subtly by 0.25 dm (symmetrical spoon)
    rwMainPos.setZ(p, rwMainPos.getZ(p) + (Math.pow(norm, 2.0) - 1.0) * 0.25);
  }
  rwMainGeo.computeVertexNormals();

  const rwMainMesh = new THREE.Mesh(rwMainGeo, carbonMat);
  rwMainMesh.rotation.set(0, 0, 0); // 100% horizontal, zero diagonal tilt
  rwMainMesh.castShadow = true;
  rwMainMesh.name = 'RearWing_Spoon_Mainplane';
  rearWingGroup.add(rwMainMesh);

  // -------------------------------------------------------------------------
  // 4B. ACTIVE MOVABLE UPPER FLAP & BACKWARD-FACING ORACLE DECAL
  // -------------------------------------------------------------------------
  const rwFlapPivot = new THREE.Group();
  rwFlapPivot.name = 'RearWing_Active_UpperFlap';
  rwFlapPivot.position.set(0.65, 0, 0.32);
  rwFlapPivot.rotation.y = rwFlapAngle; // DRS / X-Mode pitch articulation around lateral Y axis

  const rwFlapShape = new THREE.Shape();
  rwFlapShape.moveTo(-0.6, 0.0);
  rwFlapShape.quadraticCurveTo(0.1, 0.16, 0.85, 0.06);
  rwFlapShape.lineTo(0.8, 0.0);
  rwFlapShape.quadraticCurveTo(0.1, 0.06, -0.6, -0.02);
  rwFlapShape.closePath();

  const rwFlapGeo = new THREE.ExtrudeGeometry(rwFlapShape, { steps: 8, depth: 14.4, bevelEnabled: false });
  rwFlapGeo.center();
  rwFlapGeo.rotateX(Math.PI / 2); // Rotate on geometry: chord on X, span on Y, thickness on Z
  rwFlapGeo.computeVertexNormals();

  const rwFlapMesh = new THREE.Mesh(rwFlapGeo, carbonMat);
  rwFlapMesh.rotation.set(0, 0, 0); // 100% horizontal, zero diagonal tilt
  rwFlapMesh.name = 'RearWing_Active_UpperFlap_Mesh';
  rwFlapPivot.add(rwFlapMesh);

  // Backward-Facing 100% Upright Bold ORACLE Wordmark
  // Normal faces +X (rearward), Up is +Z, Width spans -Y to +Y
  const rwOracleTex = createRearWingOracleTexture();
  const rwOracleMat = new THREE.MeshStandardMaterial({
    map: rwOracleTex,
    roughness: 0.25,
    metalness: 0.40,
    side: THREE.DoubleSide
  });

  const oP00 = new THREE.Vector3(0.72, -7.1, 0.02); // Bottom-Left (viewer's left from behind = car's right)
  const oP10 = new THREE.Vector3(0.72, 7.1, 0.02);  // Bottom-Right (viewer's right from behind = car's left)
  const oP11 = new THREE.Vector3(0.72, 7.1, 0.55);  // Top-Right
  const oP01 = new THREE.Vector3(0.72, -7.1, 0.55); // Top-Left
  const oracleDecal = createDecalQuad(oP00, oP10, oP11, oP01, rwOracleMat);
  oracleDecal.name = 'RearWing_OracleDecal';
  rwFlapPivot.add(oracleDecal);

  // Centerline Electro-Hydraulic DRS Actuator Ram
  const actRamGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.45, 12);
  const actRam = new THREE.Mesh(actRamGeo, materials.titaniumAnodized);
  actRam.rotation.z = Math.PI / 2;
  actRam.position.set(-0.25, 0, 0);
  rwFlapPivot.add(actRam);

  rearWingGroup.add(rwFlapPivot);

  // -------------------------------------------------------------------------
  // 4C. AUTHENTIC 3D SCULPTED ENDPLATES (Matching User Wireframe Drawing media_1790507435304.jpg)
  // Full-height compound contoured carbon walls with top bevel, flared mid-height hip,
  // bottom angled diffuser/beam wing junction, and 12-LED vertical rain light strips.
  // -------------------------------------------------------------------------
  function createSculptedEndplate(isLeft = true) {
    const side = isLeft ? 1 : -1;
    const epGroup = new THREE.Group();
    epGroup.name = `RearWing_Endplate_${isLeft ? 'Left' : 'Right'}`;

    // Stations along Z from top to bottom (relative to wing center Z = 0)
    // Defines { z, yOuter, yInner, xFwd, xAft }
    const stations = [
      { z:  1.45, yOuter: 7.35, yInner: 7.15, xFwd: -1.4, xAft:  1.50 }, // Top crest
      { z:  1.15, yOuter: 7.75, yInner: 7.15, xFwd: -1.5, xAft:  1.60 }, // Bevelled top chamfer
      { z:  0.40, yOuter: 7.82, yInner: 7.12, xFwd: -1.6, xAft:  1.70 }, // Upper flap junction
      { z: -0.10, yOuter: 7.85, yInner: 7.10, xFwd: -1.6, xAft:  1.70 }, // Mainplane junction
      { z: -1.00, yOuter: 7.95, yInner: 7.05, xFwd: -1.6, xAft:  1.80 }, // Descending waist
      { z: -1.85, yOuter: 8.12, yInner: 6.95, xFwd: -1.6, xAft:  1.85 }, // Mid-height flared hip (maximum width)
      { z: -2.70, yOuter: 7.85, yInner: 6.85, xFwd: -1.5, xAft:  1.75 }, // Inward sweep below tire line
      { z: -3.50, yOuter: 7.55, yInner: 6.72, xFwd: -1.4, xAft:  1.55 }, // Beam wing junction
      { z: -4.20, yOuter: 7.35, yInner: 6.65, xFwd: -1.2, xAft:  1.30 }  // Bottom angled tip above diffuser
    ];

    const numZ = stations.length;
    const numX = 12; // Chord segments
    const verts = [];
    const uvs = [];
    const indices = [];

    // 1. Outer Face
    for (let i = 0; i < numZ; i++) {
      const st = stations[i];
      const z = st.z;
      const y = side * st.yOuter;
      for (let j = 0; j <= numX; j++) {
        const u = j / numX;
        const x = THREE.MathUtils.lerp(st.xFwd, st.xAft, u);
        verts.push(x, y, z);
        uvs.push(u, i / (numZ - 1));
      }
    }

    const rowSize = numX + 1;
    for (let i = 0; i < numZ - 1; i++) {
      for (let j = 0; j < numX; j++) {
        const a = i * rowSize + j;
        const b = (i + 1) * rowSize + j;
        const c = (i + 1) * rowSize + (j + 1);
        const d = i * rowSize + (j + 1);
        if (isLeft) {
          indices.push(a, b, d);
          indices.push(b, c, d);
        } else {
          indices.push(a, d, b);
          indices.push(b, d, c);
        }
      }
    }

    // 2. Inner Face
    const innerOffset = verts.length / 3;
    for (let i = 0; i < numZ; i++) {
      const st = stations[i];
      const z = st.z;
      const y = side * st.yInner;
      for (let j = 0; j <= numX; j++) {
        const u = j / numX;
        const x = THREE.MathUtils.lerp(st.xFwd, st.xAft, u);
        verts.push(x, y, z);
        uvs.push(u, i / (numZ - 1));
      }
    }

    for (let i = 0; i < numZ - 1; i++) {
      for (let j = 0; j < numX; j++) {
        const a = innerOffset + i * rowSize + j;
        const b = innerOffset + (i + 1) * rowSize + j;
        const c = innerOffset + (i + 1) * rowSize + (j + 1);
        const d = innerOffset + i * rowSize + (j + 1);
        if (isLeft) {
          indices.push(a, d, b);
          indices.push(b, d, c);
        } else {
          indices.push(a, b, d);
          indices.push(b, c, d);
        }
      }
    }

    // 3. Perimeter walls connecting Outer and Inner faces:
    // Leading Edge (j = 0)
    for (let i = 0; i < numZ - 1; i++) {
      const outA = i * rowSize;
      const outB = (i + 1) * rowSize;
      const inA = innerOffset + i * rowSize;
      const inB = innerOffset + (i + 1) * rowSize;
      if (isLeft) {
        indices.push(outA, inA, outB);
        indices.push(inA, inB, outB);
      } else {
        indices.push(outA, outB, inA);
        indices.push(inA, outB, inB);
      }
    }

    // Trailing Edge (j = numX)
    for (let i = 0; i < numZ - 1; i++) {
      const outA = i * rowSize + numX;
      const outB = (i + 1) * rowSize + numX;
      const inA = innerOffset + i * rowSize + numX;
      const inB = innerOffset + (i + 1) * rowSize + numX;
      if (isLeft) {
        indices.push(outA, outB, inA);
        indices.push(inA, outB, inB);
      } else {
        indices.push(outA, inA, outB);
        indices.push(inA, inB, outB);
      }
    }

    // Top Edge (i = 0)
    for (let j = 0; j < numX; j++) {
      const outA = j;
      const outB = j + 1;
      const inA = innerOffset + j;
      const inB = innerOffset + j + 1;
      if (isLeft) {
        indices.push(outA, outB, inA);
        indices.push(inA, outB, inB);
      } else {
        indices.push(outA, inA, outB);
        indices.push(inA, inB, outB);
      }
    }

    // Bottom Edge (i = numZ - 1)
    const bRowOut = (numZ - 1) * rowSize;
    const bRowIn = innerOffset + (numZ - 1) * rowSize;
    for (let j = 0; j < numX; j++) {
      const outA = bRowOut + j;
      const outB = bRowOut + j + 1;
      const inA = bRowIn + j;
      const inB = bRowIn + j + 1;
      if (isLeft) {
        indices.push(outA, inA, outB);
        indices.push(inA, inB, outB);
      } else {
        indices.push(outA, outB, inA);
        indices.push(inA, outB, inB);
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    geo.computeVertexNormals();

    const mesh = new THREE.Mesh(geo, navyMat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    epGroup.add(mesh);

    // Livery Decal on Flared Outer Hip
    const epTex = createEndplateTexture(isLeft);
    const epDecalMat = new THREE.MeshStandardMaterial({
      map: epTex,
      transparent: true,
      roughness: 0.28,
      metalness: 0.35,
      side: THREE.DoubleSide
    });
    const hipY = side * (8.12 + 0.04);
    const epP00 = new THREE.Vector3(-1.4, hipY, -2.5);
    const epP10 = new THREE.Vector3( 1.4, hipY, -2.5);
    const epP11 = new THREE.Vector3( 1.4, hipY,  0.8);
    const epP01 = new THREE.Vector3(-1.4, hipY,  0.8);
    const epDecal = isLeft
      ? createDecalQuad(epP00, epP10, epP11, epP01, epDecalMat)
      : createDecalQuad(epP10, epP00, epP01, epP11, epDecalMat);
    epDecal.name = `RearWing_LiveryDecal_${isLeft ? 'LH' : 'RH'}`;
    epGroup.add(epDecal);

    // Inner Face Red-to-Blue Carbon Gradient Fade (media_1790507837418.webp)
    const innerGradTex = createRearWingEndplateInnerTexture(isLeft);
    const innerGradMat = new THREE.MeshStandardMaterial({
      map: innerGradTex,
      roughness: 0.32,
      metalness: 0.30,
      side: THREE.DoubleSide
    });
    const inY = side * (6.95 - 0.02);
    const inP00 = new THREE.Vector3(-1.4, inY, -3.8);
    const inP10 = new THREE.Vector3( 1.4, inY, -3.8);
    const inP11 = new THREE.Vector3( 1.4, inY,  1.2);
    const inP01 = new THREE.Vector3(-1.4, inY,  1.2);
    const innerDecal = isLeft
      ? createDecalQuad(inP10, inP00, inP01, inP11, innerGradMat)
      : createDecalQuad(inP00, inP10, inP11, inP01, innerGradMat);
    innerDecal.name = `RearWing_InnerGradient_${isLeft ? 'LH' : 'RH'}`;
    epGroup.add(innerDecal);

    // VERTICAL RED LED RAIN LIGHT STRIP (12 LEDs along trailing edge of endplate)
    const ledStripGroup = new THREE.Group();
    ledStripGroup.name = `RainLED_Strip_${isLeft ? 'LH' : 'RH'}`;
    const ledGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.04, 8);
    for (let k = 0; k < 12; k++) {
      const t = k / 11;
      const ledZ = THREE.MathUtils.lerp(1.2, -3.8, t);
      const ledX = THREE.MathUtils.lerp(1.5, 1.35, t) + 0.02;
      const ledY = side * THREE.MathUtils.lerp(7.4, 7.3, t);
      const led = new THREE.Mesh(ledGeo, materials.ledRed);
      led.rotation.z = Math.PI / 2;
      led.position.set(ledX, ledY, ledZ);
      led.name = `RainLED_${isLeft ? 'LH' : 'RH'}_${k}`;
      ledStripGroup.add(led);
    }
    epGroup.add(ledStripGroup);

    return epGroup;
  }

  // Add Left and Right 3D Sculpted Endplates
  rearWingGroup.add(createSculptedEndplate(true));
  rearWingGroup.add(createSculptedEndplate(false));

  // -------------------------------------------------------------------------
  // 4D. STRUCTURAL LOWER BEAM WING (Matching media_1790507435304.jpg)
  // -------------------------------------------------------------------------
  const beamWingGroup = new THREE.Group();
  beamWingGroup.name = 'RearWing_BeamWing_Assembly';
  beamWingGroup.position.set(0.4, 0, -3.6);

  const bwSpan = 13.4; // Spans from Y = -6.7 to Y = +6.7 dm (between endplates)
  const bwShape = new THREE.Shape();
  bwShape.moveTo(-0.9, 0.0);
  bwShape.quadraticCurveTo(-0.1, 0.18, 0.9, 0.04);
  bwShape.lineTo(0.85, -0.06);
  bwShape.quadraticCurveTo(-0.1, -0.02, -0.9, -0.04);
  bwShape.closePath();

  const bwGeo = new THREE.ExtrudeGeometry(bwShape, { steps: 16, depth: bwSpan, bevelEnabled: false });
  bwGeo.center();
  bwGeo.rotateX(Math.PI / 2);
  bwGeo.computeVertexNormals();
  const bwMesh = new THREE.Mesh(bwGeo, carbonMat);
  bwMesh.rotation.set(0, 0, 0);
  bwMesh.castShadow = true;
  beamWingGroup.add(bwMesh);
  rearWingGroup.add(beamWingGroup);

  // -------------------------------------------------------------------------
  // 4E. REAR IMPACT STRUCTURE (RIS) & FIA CENTRAL RAIN LIGHT (media_1790507837418.webp)
  // - High-strength carbon impact attenuator cone
  // - Prominent bright yellow chamfered bezel around FIA rain safety light
  // - Oval ring of 18 intense red LEDs in illuminated recessed socket
  // -------------------------------------------------------------------------
  const crashBoxGroup = new THREE.Group();
  crashBoxGroup.name = 'Rear_Impact_Structure_CrashBox';
  crashBoxGroup.position.set(0.9, 0.0, -3.8);

  // Structural Carbon Impact Attenuator Cone
  const crashBoxGeo = new THREE.BoxGeometry(2.8, 1.8, 1.2);
  const crashBox = new THREE.Mesh(crashBoxGeo, carbonMatte);
  crashBox.castShadow = true;
  crashBoxGroup.add(crashBox);

  // BRIGHT YELLOW CHAMFERED BEZEL SURROUND (media_1790507837418.webp)
  const yellowBezelShape = new THREE.Shape();
  yellowBezelShape.moveTo(-0.85, -0.65);
  yellowBezelShape.lineTo(0.85, -0.65);
  yellowBezelShape.quadraticCurveTo(0.95, -0.65, 0.95, -0.55);
  yellowBezelShape.lineTo(0.85, 0.55);
  yellowBezelShape.quadraticCurveTo(0.75, 0.65, 0.65, 0.65);
  yellowBezelShape.lineTo(-0.65, 0.65);
  yellowBezelShape.quadraticCurveTo(-0.75, 0.65, -0.85, 0.55);
  yellowBezelShape.lineTo(-0.95, -0.55);
  yellowBezelShape.quadraticCurveTo(-0.95, -0.65, -0.85, -0.65);
  yellowBezelShape.closePath();

  // Inner cutout for dark LED socket
  const bezelHole = new THREE.Path();
  bezelHole.moveTo(-0.65, -0.45);
  bezelHole.lineTo(0.65, -0.45);
  bezelHole.quadraticCurveTo(0.75, 0, 0.65, 0.45);
  bezelHole.lineTo(-0.65, 0.45);
  bezelHole.quadraticCurveTo(-0.75, 0, -0.65, -0.45);
  bezelHole.closePath();
  yellowBezelShape.holes.push(bezelHole);

  const bezelExtrude = { steps: 1, depth: 0.12, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 2 };
  const yellowBezelGeo = new THREE.ExtrudeGeometry(yellowBezelShape, bezelExtrude);
  yellowBezelGeo.center();
  const yellowBezelMat = new THREE.MeshStandardMaterial({
    color: 0xffdd00, // Vibrant FIA inspection yellow
    roughness: 0.25,
    metalness: 0.15
  });
  const yellowBezel = new THREE.Mesh(yellowBezelGeo, yellowBezelMat);
  yellowBezel.rotation.y = Math.PI / 2;
  yellowBezel.position.set(1.44, 0, 0);
  crashBoxGroup.add(yellowBezel);

  // Dark Carbon Recessed Socket Face
  const socketGeo = new THREE.BoxGeometry(0.04, 1.35, 0.95);
  const socketMesh = new THREE.Mesh(socketGeo, materials.carbonMatteStructural);
  socketMesh.position.set(1.45, 0, 0);
  crashBoxGroup.add(socketMesh);

  // OVAL RING OF 18 RED FIA RAIN LIGHT LEDs (media_1790507837418.webp)
  const rainLightGroup = new THREE.Group();
  rainLightGroup.name = 'FIA_Rear_Rain_Safety_Light';
  rainLightGroup.position.set(1.48, 0, 0);

  const numRingLeds = 18;
  const rx = 0.52; // Lateral radius
  const rz = 0.36; // Vertical radius
  const ledGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.04, 12);
  const ledRedMat = new THREE.MeshStandardMaterial({
    color: 0xff0000,
    emissive: 0xff0000,
    emissiveIntensity: 3.8,
    roughness: 0.1
  });

  for (let k = 0; k < numRingLeds; k++) {
    const ang = (k * Math.PI * 2) / numRingLeds;
    const lY = Math.cos(ang) * rx;
    const lZ = Math.sin(ang) * rz;
    const led = new THREE.Mesh(ledGeo, ledRedMat);
    led.rotation.z = Math.PI / 2;
    led.position.set(0.02, lY, lZ);
    rainLightGroup.add(led);
  }

  // 4 Central Core LEDs inside the oval ring
  [-0.18, 0.18].forEach(cy => {
    [-0.12, 0.12].forEach(cz => {
      const coreLed = new THREE.Mesh(ledGeo, ledRedMat);
      coreLed.rotation.z = Math.PI / 2;
      coreLed.position.set(0.02, cy, cz);
      rainLightGroup.add(coreLed);
    });
  });

  crashBoxGroup.add(rainLightGroup);
  rearWingGroup.add(crashBoxGroup);

  // -------------------------------------------------------------------------
  // 4F. DUAL SWAN-NECK MOUNTING PYLONS
  // -------------------------------------------------------------------------
  [-0.9, 0.9].forEach(pylonY => {
    const pylonCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.0, pylonY, -3.2),  // Attaches to Crash Box
      new THREE.Vector3(-0.6, pylonY, -1.8), // Arches over exhaust
      new THREE.Vector3(-0.9, pylonY, -0.4),
      new THREE.Vector3(-0.6, pylonY, 0.0)   // Under mainplane
    ]);
    const pylonGeo = new THREE.TubeGeometry(pylonCurve, 16, 0.08, 8, false);
    pylonGeo.scale(1.8, 0.6, 1.0);
    const pylonMesh = new THREE.Mesh(pylonGeo, carbonMat);
    rearWingGroup.add(pylonMesh);
  });

  group.add(rearWingGroup);

  return group;
}
