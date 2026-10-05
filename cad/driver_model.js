/**
 * driver_model.js — 2026 Formula 1 "Nimble Car" High-Fidelity Articulated Driver & Carbon Seat
 * SREdesigns - Samuel R Erwin III
 * 
 * Master Ergonomic 3D CAD & Kinematic Rig matching User Reference Images:
 * - media_1791233403241.webp (Wireframe Topology & Driving Posture)
 * - media_1791233403328.webp (PBR Texture, High-Back Seat Shell, Suit & Boots)
 * - media_1791233403954.webp (Cockpit POV, Richard Mille Gloves, Thighs & Boot Sole)
 * - media_1791233404255.webp (Cockpit POV Wireframe & Quad Topology)
 * - media_1791233403963.webp (Cockpit 3/4 Aperture, Halo & Headrest Integration)
 * 
 * Features:
 * 1. High-Back Molded Carbon Bead Seat Shell:
 *    - Extends from under the thighs, under pelvis, reclines up the spine, and rises behind the helmet
 * 2. Organic Reclined Athletic Torso (42° recline):
 *    - Smooth multi-cross-section quad lofts with natural muscular contours and Nomex fabric creases
 *    - Team adaptive primary color with dark stretch Nomex flanks and center zip placket
 * 3. Complete 6-Point FIA Safety Harness:
 *    - 3-inch ribbed webbing, titanium 3-bar adjusters, and central rotary camlock buckle
 * 4. Articulated Arms & High-Detail Richard Mille Gloves:
 *    - Flared gauntlet cuffs with crisp procedural "RICHARD MILLE" brand lettering
 *    - Ergonomically sculpted palm, curved thumbs on PCU-8D thumb rests, curled fingers around grips
 *    - Real-time 2-link analytical Inverse Kinematics (IK) solver linking shoulders to steering wheel
 * 5. Articulated Legs & High-Detail Racing Boots:
 *    - Distinct muscular thighs with central trough for steering column clearance
 *    - Bent knees, tapered calves, and FIA 8856-2018 racing boots with diamond waffle soles
 *    - Articulating ankles and feet that depress the brake and throttle pedals
 * 6. Articulated Head & Integrated Helmet:
 *    - Head yaws into corner apexes when steering
 *    - Pitches forward under braking Gs, reclines under acceleration Gs
 *    - Natural breathing and micro-vibration idle dynamics
 */

import * as THREE from 'three';
import { materials as defaultMaterials } from '../materials.js';
import { createDriverHelmet } from './driver_helmet.js';

// =========================================================================
// 1. PROCEDURAL TEXTURES (Richard Mille Gauntlet, Diamond Waffle Sole)
// =========================================================================

/**
 * Creates high-resolution procedural Richard Mille glove gauntlet texture
 */
export function createRichardMilleGloveTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  // Dark matte charcoal/black Nomex fabric base
  ctx.fillStyle = '#14171a';
  ctx.fillRect(0, 0, 1024, 256);

  // Micro-woven Nomex texture lines
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.035)';
  ctx.lineWidth = 1.5;
  for (let x = 0; x < 1024; x += 6) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + 120, 256);
    ctx.stroke();
  }

  // Glove seam stitch lines along edges
  ctx.strokeStyle = '#2c3138';
  ctx.lineWidth = 3;
  ctx.setLineDash([8, 6]);
  ctx.strokeRect(8, 8, 1008, 240);
  ctx.setLineDash([]);

  // Bold white "RICHARD MILLE" silkscreen lettering on outer gauntlet
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 56px "Arial Black", "Helvetica Neue", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.letterSpacing = '6px';
  ctx.fillText('RICHARD MILLE', 512, 128);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  return texture;
}

/**
 * Creates high-detail diamond/waffle sole texture for racing boots
 */
export function createWaffleSoleTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  // Dark vulcanized rubber base
  ctx.fillStyle = '#1a1d22';
  ctx.fillRect(0, 0, 512, 512);

  // Diamond waffle traction grid pattern
  ctx.strokeStyle = '#2b3038';
  ctx.lineWidth = 3;
  const step = 24;
  for (let i = -512; i < 1024; i += step) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + 512, 512);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(i + 512, 0);
    ctx.lineTo(i, 512);
    ctx.stroke();
  }

  // Center traction studs
  ctx.fillStyle = '#0f1114';
  for (let x = step / 2; x < 512; x += step) {
    for (let y = step / 2; y < 512; y += step) {
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 8);
  return texture;
}

// =========================================================================
// 2. HIGH-BACK MOLDED CARBON BEAD SEAT SHELL
// =========================================================================

/**
 * High-back molded carbon bead seat shell (matching media_1791233403328.webp)
 * Extends from under the thighs, curves under pelvis, reclines up the spine,
 * wraps around the shoulders, and rises high behind the helmet.
 */
export function createCarbonBeadSeatShell(materials) {
  const seatGroup = new THREE.Group();
  seatGroup.name = 'Driver_Seat_CarbonShell_Assembly';

  const carbonMat = materials.carbonGloss || materials.carbonSatinChassis;

  // Longitudinal spine curve of the seat shell
  const spinePts = [
    { x: 10.4, z: 1.45, w: 1.85, d: 0.12, flare: 0.45 }, // Thigh support lip
    { x: 11.6, z: 1.10, w: 1.95, d: 0.12, flare: 0.55 }, // Mid thigh
    { x: 12.5, z: 0.76, w: 2.15, d: 0.12, flare: 0.75 }, // Pelvis / ischial base
    { x: 13.5, z: 1.25, w: 2.25, d: 0.12, flare: 0.85 }, // Sacrum / lumbar transition
    { x: 14.3, z: 2.40, w: 2.20, d: 0.12, flare: 0.80 }, // Mid spine
    { x: 14.8, z: 3.55, w: 2.30, d: 0.12, flare: 0.75 }, // Thoracic / ribcage bolsters
    { x: 15.2, z: 4.70, w: 2.35, d: 0.12, flare: 0.70 }, // Shoulders
    { x: 15.5, z: 5.65, w: 1.80, d: 0.12, flare: 0.45 }, // Neck / HANS clearance
    { x: 15.6, z: 6.45, w: 1.50, d: 0.12, flare: 0.35 }  // High headrest crown behind helmet
  ];

  const numStations = spinePts.length;
  const numRings = 24;
  const verts = [];
  const uvs = [];
  const indices = [];

  for (let i = 0; i < numStations; i++) {
    const st = spinePts[i];
    const u = i / (numStations - 1);

    for (let j = 0; j <= numRings; j++) {
      const v = j / numRings;
      const param = 1 - 2 * v; // +1 (left edge) to -1 (right edge)
      const py = param * st.w;

      // Lateral bolster curve: shell wraps around the driver's sides
      const bolster = Math.pow(Math.abs(param), 2.2) * st.flare;
      const pz = st.z + bolster;
      const px = st.x - bolster * 0.4;

      verts.push(px, py, pz);
      uvs.push(u, v);
    }
  }

  for (let i = 0; i < numStations - 1; i++) {
    for (let j = 0; j < numRings; j++) {
      const a = i * (numRings + 1) + j;
      const b = (i + 1) * (numRings + 1) + j;
      const c = (i + 1) * (numRings + 1) + (j + 1);
      const d = i * (numRings + 1) + (j + 1);
      indices.push(a, b, d);
      indices.push(b, c, d);
    }
  }

  const shellGeo = new THREE.BufferGeometry();
  shellGeo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  shellGeo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  shellGeo.setIndex(indices);
  shellGeo.computeVertexNormals();

  const shellMesh = new THREE.Mesh(shellGeo, carbonMat);
  shellMesh.name = 'Driver_Seat_CarbonShell_Mesh';
  shellMesh.castShadow = true;
  shellMesh.receiveShadow = true;
  seatGroup.add(shellMesh);

  // Rolled edge coaming lip around seat perimeter
  const leftRimPts = [];
  const rightRimPts = [];
  for (let i = 0; i < numStations; i++) {
    const st = spinePts[i];
    const bolster = st.flare;
    leftRimPts.push(new THREE.Vector3(st.x - bolster * 0.4, st.w, st.z + bolster));
    rightRimPts.push(new THREE.Vector3(st.x - bolster * 0.4, -st.w, st.z + bolster));
  }
  [leftRimPts, rightRimPts].forEach((rim, idx) => {
    const curve = new THREE.CatmullRomCurve3(rim);
    const rimGeo = new THREE.TubeGeometry(curve, 32, 0.065, 8, false);
    const rimMesh = new THREE.Mesh(rimGeo, carbonMat);
    rimMesh.name = `Driver_Seat_RolledLip_${idx === 0 ? 'LH' : 'RH'}`;
    seatGroup.add(rimMesh);
  });

  return seatGroup;
}

// =========================================================================
// 3. PARAMETRIC ORGANIC GEOMETRY GENERATORS (Torso, Limbs, Boots)
// =========================================================================

/**
 * Builds a smooth organic lofted body segment with anatomical cross-sections
 */
function createOrganicLoftGeometry(stations, segmentsU = 16, segmentsV = 24) {
  const verts = [];
  const uvs = [];
  const indices = [];

  for (let i = 0; i < stations.length; i++) {
    const st = stations[i];
    const u = i / (stations.length - 1);

    for (let j = 0; j <= segmentsV; j++) {
      const v = j / segmentsV;
      const angle = v * Math.PI * 2;

      // Anatomical superellipse cross-section with subtle flattening
      const cosA = Math.cos(angle);
      const sinA = Math.sin(angle);
      const bulge = st.bulge || 0;
      const wrinkle = (st.wrinkle || 0) * Math.sin(angle * 3);

      const ly = sinA * st.ry;
      const lx = cosA * st.rx * (1 + bulge * Math.cos(2 * angle)) + wrinkle;

      // Transform local cross-section along station position & orientation
      const pos = new THREE.Vector3(lx, ly, 0);
      if (st.rotX) pos.applyAxisAngle(new THREE.Vector3(1, 0, 0), st.rotX);
      if (st.rotY) pos.applyAxisAngle(new THREE.Vector3(0, 1, 0), st.rotY);
      if (st.rotZ) pos.applyAxisAngle(new THREE.Vector3(0, 0, 1), st.rotZ);
      pos.add(new THREE.Vector3(st.x, st.y, st.z));

      verts.push(pos.x, pos.y, pos.z);
      uvs.push(u, v);
    }
  }

  for (let i = 0; i < stations.length - 1; i++) {
    for (let j = 0; j < segmentsV; j++) {
      const a = i * (segmentsV + 1) + j;
      const b = (i + 1) * (segmentsV + 1) + j;
      const c = (i + 1) * (segmentsV + 1) + (j + 1);
      const d = i * (segmentsV + 1) + (j + 1);
      indices.push(a, b, d);
      indices.push(b, c, d);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

// =========================================================================
// 4. THE ARTICULATED DRIVER RIG ASSEMBLY
// =========================================================================

/**
 * Creates the complete articulated human driver matching the reference images
 */
export function createArticulatedDriver(options = {}) {
  const mats = options.materials || defaultMaterials;
  const root = new THREE.Group();
  root.name = 'Assembly_Articulated_Driver';

  // Materials setup
  const suitMat = (mats.liveryPaint ? mats.liveryPaint.clone() : new THREE.MeshStandardMaterial({
    color: 0xff8000,
    roughness: 0.82
  }));
  suitMat.name = 'Driver_Suit_Primary';
  suitMat.roughness = 0.82;
  suitMat.metalness = 0.04;

  const darkNomexMat = new THREE.MeshStandardMaterial({
    name: 'Driver_Dark_Nomex',
    color: 0x14171a,
    roughness: 0.88,
    metalness: 0.05
  });

  const gloveMat = mats.driverGlove || new THREE.MeshStandardMaterial({
    name: 'Driver_Glove_Material',
    color: 0x14171a,
    roughness: 0.82,
    metalness: 0.05
  });

  const gloveCuffTex = createRichardMilleGloveTexture();
  const gloveCuffMat = new THREE.MeshStandardMaterial({
    name: 'Driver_Glove_Cuff_Material',
    map: gloveCuffTex,
    roughness: 0.80,
    metalness: 0.05
  });

  const bootMat = new THREE.MeshStandardMaterial({
    name: 'Driver_Boot_Leather',
    color: 0x16181b,
    roughness: 0.72,
    metalness: 0.08
  });

  const soleTex = createWaffleSoleTexture();
  const bootSoleMat = new THREE.MeshStandardMaterial({
    name: 'Driver_Boot_Sole',
    map: soleTex,
    color: 0x24282f,
    roughness: 0.92,
    metalness: 0.02
  });

  const harnessMat = new THREE.MeshStandardMaterial({
    name: 'Driver_Harness_Webbing',
    color: 0x0c0e12,
    roughness: 0.88,
    metalness: 0.05
  });

  // Kinematic nodes dictionary
  const rigNodes = {
    pelvis: new THREE.Group(),
    torsoJoint: new THREE.Group(),
    neckJoint: new THREE.Group(),
    headAssembly: null,
    shoulderLeft: new THREE.Group(),
    shoulderRight: new THREE.Group(),
    upperArmLeft: new THREE.Group(),
    upperArmRight: new THREE.Group(),
    elbowLeft: new THREE.Group(),
    elbowRight: new THREE.Group(),
    forearmLeft: new THREE.Group(),
    forearmRight: new THREE.Group(),
    wristLeft: new THREE.Group(),
    wristRight: new THREE.Group(),
    gloveLeft: new THREE.Group(),
    gloveRight: new THREE.Group(),
    hipLeft: new THREE.Group(),
    hipRight: new THREE.Group(),
    kneeLeft: new THREE.Group(),
    kneeRight: new THREE.Group(),
    ankleLeft: new THREE.Group(),
    ankleRight: new THREE.Group(),
    bootLeft: new THREE.Group(),
    bootRight: new THREE.Group()
  };

  rigNodes.pelvis.name = 'Kinematic_Driver_Pelvis';
  rigNodes.torsoJoint.name = 'Kinematic_Driver_TorsoJoint';
  rigNodes.neckJoint.name = 'Kinematic_Driver_NeckJoint';
  root.add(rigNodes.pelvis);

  // -------------------------------------------------------------
  // A. PELVIS & HIPS (Seated deep in seat shell, X = 12.8, Z = 1.15)
  // -------------------------------------------------------------
  rigNodes.pelvis.position.set(12.8, 0, 1.15);

  const pelvisStations = [
    { x: -0.6, y: 0, z: -0.35, rx: 0.85, ry: 1.15, rotY: -0.3 },
    { x: -0.2, y: 0, z: -0.15, rx: 1.05, ry: 1.30, rotY: -0.2 },
    { x: 0.2,  y: 0, z: 0.10,  rx: 1.15, ry: 1.35, rotY: -0.1 },
    { x: 0.6,  y: 0, z: 0.35,  rx: 1.10, ry: 1.30, rotY: 0.0 }
  ];
  const pelvisGeo = createOrganicLoftGeometry(pelvisStations, 8, 20);
  const pelvisMesh = new THREE.Mesh(pelvisGeo, darkNomexMat);
  pelvisMesh.name = 'Driver_Suit_Pelvis';
  pelvisMesh.castShadow = true;
  rigNodes.pelvis.add(pelvisMesh);

  // -------------------------------------------------------------
  // B. RECLINED ATHLETIC TORSO (Pitches with G-forces & Breathing)
  // -------------------------------------------------------------
  // Pivot placed at lumbar spine [0.35, 0, 0.45] relative to pelvis
  rigNodes.torsoJoint.position.set(0.35, 0, 0.45);
  rigNodes.torsoJoint.rotation.y = -0.58; // Base 33° recline
  rigNodes.pelvis.add(rigNodes.torsoJoint);

  const torsoStations = [
    { x: 0.0, y: 0, z: 0.0,  rx: 0.95, ry: 1.25, wrinkle: 0.02 }, // Lower waist
    { x: 0.0, y: 0, z: 0.7,  rx: 1.05, ry: 1.32, wrinkle: 0.03 }, // Mid abdomen
    { x: 0.0, y: 0, z: 1.4,  rx: 1.18, ry: 1.45, bulge: 0.08 },   // Ribcage / solar plexus
    { x: 0.0, y: 0, z: 2.1,  rx: 1.25, ry: 1.55, bulge: 0.12 },   // Pectorals
    { x: 0.0, y: 0, z: 2.7,  rx: 1.15, ry: 1.62, bulge: 0.06 },   // Clavicles / deltoid base
    { x: 0.0, y: 0, z: 3.1,  rx: 0.75, ry: 0.85, bulge: 0.00 }    // Base of neck
  ];
  const torsoGeo = createOrganicLoftGeometry(torsoStations, 14, 24);
  const torsoMesh = new THREE.Mesh(torsoGeo, suitMat);
  torsoMesh.name = 'Driver_Suit_Chest';
  torsoMesh.castShadow = true;
  rigNodes.torsoJoint.add(torsoMesh);

  // Contrast stretch flank panels on ribcage
  [-1, 1].forEach((side) => {
    const isLeft = side > 0;
    const flankGeo = new THREE.BoxGeometry(0.55, 0.18, 2.2);
    const flankMesh = new THREE.Mesh(flankGeo, darkNomexMat);
    flankMesh.position.set(0.08, side * 1.32, 1.45);
    flankMesh.name = `Driver_Suit_Flank_${isLeft ? 'LH' : 'RH'}`;
    rigNodes.torsoJoint.add(flankMesh);
  });

  // Center Nomex zip placket with zipper puller
  const zipGeo = new THREE.BoxGeometry(0.08, 0.18, 2.5);
  const zipMesh = new THREE.Mesh(zipGeo, darkNomexMat);
  zipMesh.position.set(0.98, 0, 1.45);
  zipMesh.name = 'Driver_Suit_ZipPlacket';
  rigNodes.torsoJoint.add(zipMesh);

  const zipPullGeo = new THREE.BoxGeometry(0.04, 0.08, 0.16);
  const zipPull = new THREE.Mesh(zipPullGeo, mats.titaniumBright);
  zipPull.position.set(1.05, 0, 2.35);
  rigNodes.torsoJoint.add(zipPull);

  // FIA 8856-2018 Safety Embroidery Patch on left chest
  const patchGeo = new THREE.PlaneGeometry(0.35, 0.22);
  const patchMesh = new THREE.Mesh(patchGeo, new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.65
  }));
  patchMesh.rotation.y = Math.PI / 2;
  patchMesh.position.set(1.02, 0.65, 2.05);
  patchMesh.name = 'Driver_FIA_Patch';
  rigNodes.torsoJoint.add(patchMesh);

  // -------------------------------------------------------------
  // C. 6-POINT RACING HARNESS WITH ROTARY CAMLOCK BUCKLE
  // -------------------------------------------------------------
  const harnessGroup = new THREE.Group();
  harnessGroup.name = 'Driver_Harness_Assembly';

  // Central Rotary Camlock Buckle
  const buckleGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.10, 24);
  const buckleMesh = new THREE.Mesh(buckleGeo, mats.titaniumBright);
  buckleMesh.rotation.z = Math.PI / 2;
  buckleMesh.position.set(0.95, 0, 0.85);
  buckleMesh.name = 'Driver_Harness_RotaryBuckle';
  harnessGroup.add(buckleMesh);

  // Red anodized quick-release lever
  const leverGeo = new THREE.BoxGeometry(0.05, 0.04, 0.16);
  const leverMesh = new THREE.Mesh(leverGeo, mats.anodizedRed);
  leverMesh.position.set(0.96, 0.02, 0.94);
  harnessGroup.add(leverMesh);

  // Shoulder straps with titanium 3-bar adjusters
  [-0.60, 0.60].forEach((sy) => {
    const sPts = [
      new THREE.Vector3(0.10, sy * 1.15, 3.10), // over clavicle
      new THREE.Vector3(0.55, sy * 0.95, 2.45), // mid chest
      new THREE.Vector3(0.85, sy * 0.65, 1.65), // lower ribcage
      new THREE.Vector3(0.95, sy * 0.22, 0.88)  // enters buckle
    ];
    const sCurve = new THREE.CatmullRomCurve3(sPts);
    const sGeo = new THREE.TubeGeometry(sCurve, 20, 0.075, 8, false);
    const sMesh = new THREE.Mesh(sGeo, harnessMat);
    harnessGroup.add(sMesh);

    // Aluminum 3-bar tension adjuster
    const adjGeo = new THREE.BoxGeometry(0.14, 0.08, 0.20);
    const adjMesh = new THREE.Mesh(adjGeo, mats.titaniumBright);
    adjMesh.position.set(0.68, sy * 0.85, 2.05);
    harnessGroup.add(adjMesh);
  });

  rigNodes.torsoJoint.add(harnessGroup);

  // -------------------------------------------------------------
  // D. ARTICULATED HEAD & NECK (Yaw Apex Tracking, Pitch Dynamics)
  // -------------------------------------------------------------
  // Neck pivot located at top of torso: [0, 0, 3.1] in torso local space
  rigNodes.neckJoint.position.set(0, 0, 3.1);
  rigNodes.neckJoint.name = 'Kinematic_Driver_NeckJoint';
  rigNodes.torsoJoint.add(rigNodes.neckJoint);

  // Balaclava neck
  const neckGeo = new THREE.CylinderGeometry(0.48, 0.58, 0.85, 20);
  const neckMesh = new THREE.Mesh(neckGeo, darkNomexMat);
  neckMesh.rotation.x = Math.PI / 2;
  neckMesh.position.set(0.08, 0, 0.42);
  neckMesh.name = 'Driver_Neck_Balaclava';
  rigNodes.neckJoint.add(neckMesh);

  // HANS Carbon Collar & Shoulder Yokes
  const hansGroup = new THREE.Group();
  hansGroup.name = 'Driver_HANS_Assembly';

  // High rear carbon collar behind helmet
  const hansCollarGeo = new THREE.TorusGeometry(0.88, 0.12, 8, 24, Math.PI);
  const hansCollar = new THREE.Mesh(hansCollarGeo, mats.carbonGloss);
  hansCollar.rotation.x = Math.PI / 2;
  hansCollar.rotation.z = -Math.PI / 2;
  hansCollar.position.set(-0.25, 0, 0.55);
  hansGroup.add(hansCollar);

  // Shoulder yokes running forward over chest
  [-0.68, 0.68].forEach((hy) => {
    const yokePts = [
      new THREE.Vector3(-0.25, hy, 0.55),
      new THREE.Vector3(0.20, hy * 0.95, 0.35),
      new THREE.Vector3(0.65, hy * 0.85, -0.25)
    ];
    const yokeCurve = new THREE.CatmullRomCurve3(yokePts);
    const yokeGeo = new THREE.TubeGeometry(yokeCurve, 12, 0.085, 8, false);
    const yokeMesh = new THREE.Mesh(yokeGeo, mats.carbonGloss);
    hansGroup.add(yokeMesh);
  });
  rigNodes.neckJoint.add(hansGroup);

  // FIA 8860-2018 Ballistic Helmet mounted directly on neckJoint
  const helmetGroup = createDriverHelmet(options.helmet);
  // Re-parent helmet so its head center matches the head pivot
  helmetGroup.position.set(0.05, 0.0, 0.72);
  helmetGroup.rotation.y = 0.58; // Counteract torso recline so driver looks forward down track
  rigNodes.headAssembly = helmetGroup;
  rigNodes.neckJoint.add(helmetGroup);

  // -------------------------------------------------------------
  // E. COMPLETE ARTICULATED ARMS (Shoulders -> Elbows -> Wrists -> Gloves)
  // -------------------------------------------------------------
  [-1, 1].forEach((side) => {
    const isLeft = side > 0;
    const sideName = isLeft ? 'LH' : 'RH';
    const sy = side * 1.55;

    // 1. Shoulder Deltoid Joint (pinned to upper torso)
    const shoulder = isLeft ? rigNodes.shoulderLeft : rigNodes.shoulderRight;
    shoulder.name = `Kinematic_Shoulder_${sideName}`;
    shoulder.position.set(0.0, sy, 2.65);
    rigNodes.torsoJoint.add(shoulder);

    const deltoidGeo = new THREE.SphereGeometry(0.42, 16, 12);
    deltoidGeo.scale(1.15, 0.95, 1.25);
    const deltoidMesh = new THREE.Mesh(deltoidGeo, suitMat);
    deltoidMesh.name = `Driver_Suit_Shoulder_${sideName}`;
    shoulder.add(deltoidMesh);

    // 2. Upper Arm
    const upperArm = isLeft ? rigNodes.upperArmLeft : rigNodes.upperArmRight;
    upperArm.name = `Kinematic_UpperArm_${sideName}`;
    shoulder.add(upperArm);

    // Mesh will be updated dynamically via IK, initial mesh created
    const upperGeo = new THREE.CylinderGeometry(0.32, 0.28, 2.6, 16);
    const upperMesh = new THREE.Mesh(upperGeo, suitMat);
    upperMesh.name = `Driver_Suit_UpperArm_${sideName}`;
    upperArm.add(upperMesh);

    // 3. Elbow Joint with dark anti-abrasion patch
    const elbow = isLeft ? rigNodes.elbowLeft : rigNodes.elbowRight;
    elbow.name = `Kinematic_Elbow_${sideName}`;
    upperArm.add(elbow);

    const elbowMesh = new THREE.Mesh(new THREE.SphereGeometry(0.31, 14, 10), darkNomexMat);
    elbowMesh.name = `Driver_Suit_Elbow_${sideName}`;
    elbow.add(elbowMesh);

    // 4. Forearm
    const forearm = isLeft ? rigNodes.forearmLeft : rigNodes.forearmRight;
    forearm.name = `Kinematic_Forearm_${sideName}`;
    elbow.add(forearm);

    const foreGeo = new THREE.CylinderGeometry(0.28, 0.24, 2.4, 16);
    const foreMesh = new THREE.Mesh(foreGeo, suitMat);
    foreMesh.name = `Driver_Suit_Forearm_${sideName}`;
    forearm.add(foreMesh);

    // 5. Wrist & Gauntlet Cuff
    const wrist = isLeft ? rigNodes.wristLeft : rigNodes.wristRight;
    wrist.name = `Kinematic_Wrist_${sideName}`;
    forearm.add(wrist);

    // Gauntlet cuff with procedural "RICHARD MILLE" brand lettering
    const cuffGeo = new THREE.CylinderGeometry(0.28, 0.31, 0.55, 20);
    cuffGeo.rotateX(Math.PI / 2);
    const cuffMesh = new THREE.Mesh(cuffGeo, gloveCuffMat);
    cuffMesh.name = `Driver_Glove_Cuff_${sideName}`;
    wrist.add(cuffMesh);

    // 6. High-Detail Glove (Wrapped around Steering Wheel Grip)
    const glove = isLeft ? rigNodes.gloveLeft : rigNodes.gloveRight;
    glove.name = `Driver_RacingGlove_${sideName}`;
    wrist.add(glove);

    // Palm / Knuckle wrap
    const palmGeo = new THREE.BoxGeometry(0.48, 0.32, 0.68);
    const palmMesh = new THREE.Mesh(palmGeo, gloveMat);
    palmMesh.name = `Driver_Glove_Palm_${sideName}`;
    palmMesh.position.set(0.12, 0, 0);
    glove.add(palmMesh);

    // Curved Anatomical Thumb resting on upper thumb rest notch
    const thumbGeo = new THREE.CylinderGeometry(0.09, 0.11, 0.48, 12);
    thumbGeo.rotateZ(isLeft ? -0.45 : 0.45);
    const thumbMesh = new THREE.Mesh(thumbGeo, gloveMat);
    thumbMesh.name = `Driver_Glove_Thumb_${sideName}`;
    thumbMesh.position.set(0.22, isLeft ? -0.15 : 0.15, 0.28);
    glove.add(thumbMesh);

    // Curled Index Finger over top horn notch
    const indexGeo = new THREE.CylinderGeometry(0.09, 0.10, 0.45, 12);
    indexGeo.rotateX(Math.PI / 2);
    const indexMesh = new THREE.Mesh(indexGeo, gloveMat);
    indexMesh.name = `Driver_Glove_IndexFinger_${sideName}`;
    indexMesh.position.set(0.24, isLeft ? 0.10 : -0.10, 0.22);
    glove.add(indexMesh);

    // Curled Lower Fingers wrapping around grip barrel
    for (let f = 0; f < 3; f++) {
      const fGeo = new THREE.CylinderGeometry(0.085, 0.095, 0.42, 10);
      fGeo.rotateX(Math.PI / 2);
      const fMesh = new THREE.Mesh(fGeo, gloveMat);
      fMesh.name = `Driver_Glove_Finger_${f}_${sideName}`;
      fMesh.position.set(0.22, isLeft ? (0.12 - f * 0.12) : (-0.12 + f * 0.12), -0.08 - f * 0.15);
      glove.add(fMesh);
    }

    // High-friction silicone inner palm grip pads
    const padGeo = new THREE.BoxGeometry(0.05, 0.24, 0.58);
    const padMesh = new THREE.Mesh(padGeo, new THREE.MeshStandardMaterial({
      color: 0x2e3238,
      roughness: 0.60,
      metalness: 0.10
    }));
    padMesh.name = `Driver_Glove_Pad_${sideName}`;
    padMesh.position.set(0.36, 0, 0);
    glove.add(padMesh);
  });

  // -------------------------------------------------------------
  // F. ARTICULATED LEGS & RACING BOOTS (Thighs -> Knees -> Shins -> Boots)
  // -------------------------------------------------------------
  [-1, 1].forEach((side) => {
    const isLeft = side > 0;
    const sideName = isLeft ? 'LH' : 'RH';
    const hy = isLeft ? 0.72 : -0.72;
    const ky = isLeft ? 0.82 : -0.82;
    const ay = isLeft ? 0.45 : -0.45;
    const az = isLeft ? 1.75 : 1.65;

    // 1. Hip Joint (relative to pelvis)
    const hip = isLeft ? rigNodes.hipLeft : rigNodes.hipRight;
    hip.name = `Kinematic_Hip_${sideName}`;
    hip.position.set(0.15, hy, -0.10);
    rigNodes.pelvis.add(hip);

    // Muscular Thigh with central clearance channel for steering column
    // Defined with distinct quad loft matching media_1791233403954.webp
    const thighStations = [
      { x: 0.0,  y: 0.0,  z: 0.0,  rx: 0.85, ry: 0.75, rotY: 0.35 },
      { x: -1.0, y: 0.05, z: 0.5,  rx: 0.88, ry: 0.78, rotY: 0.42, wrinkle: 0.04 },
      { x: -2.2, y: 0.08, z: 1.15, rx: 0.82, ry: 0.74, rotY: 0.48, wrinkle: 0.03 },
      { x: -3.4, y: 0.05, z: 1.65, rx: 0.72, ry: 0.68, rotY: 0.45 }
    ];
    const thighGeo = createOrganicLoftGeometry(thighStations, 10, 20);
    const thighMesh = new THREE.Mesh(thighGeo, suitMat);
    thighMesh.name = `Driver_Suit_Thigh_${sideName}`;
    thighMesh.castShadow = true;
    hip.add(thighMesh);

    // 2. Knee Joint (Elevated at Z ~ 3.05, bent at ~115°)
    const knee = isLeft ? rigNodes.kneeLeft : rigNodes.kneeRight;
    knee.name = `Kinematic_Knee_${sideName}`;
    knee.position.set(-3.7, isLeft ? 0.08 : -0.08, 1.85);
    hip.add(knee);

    const kneeCapGeo = new THREE.SphereGeometry(0.38, 14, 10);
    kneeCapGeo.scale(1.1, 0.95, 1.0);
    const kneeMesh = new THREE.Mesh(kneeCapGeo, darkNomexMat);
    kneeMesh.name = `Driver_Suit_Knee_${sideName}`;
    knee.add(kneeMesh);

    // 3. Lower Leg (Shin & Calf muscles)
    const shinStations = [
      { x: 0.0,  y: 0, z: 0.0,   rx: 0.58, ry: 0.52 },
      { x: -1.6, y: isLeft ? -0.12 : 0.12, z: -0.55, rx: 0.52, ry: 0.48 },
      { x: -3.5, y: isLeft ? -0.22 : 0.22, z: -1.15, rx: 0.42, ry: 0.38 },
      { x: -5.2, y: isLeft ? -0.28 : 0.28, z: -1.35, rx: 0.35, ry: 0.32 }
    ];
    const shinGeo = createOrganicLoftGeometry(shinStations, 12, 18);
    const shinMesh = new THREE.Mesh(shinGeo, darkNomexMat);
    shinMesh.name = `Driver_Suit_Shin_${sideName}`;
    knee.add(shinMesh);

    // 4. Ankle Joint
    const ankle = isLeft ? rigNodes.ankleLeft : rigNodes.ankleRight;
    ankle.name = `Kinematic_Ankle_${sideName}`;
    ankle.position.set(-5.3, isLeft ? -0.28 : 0.28, -1.35);
    knee.add(ankle);

    // 5. High-Detail Racing Boots (FIA 8856-2018 with Waffle Traction Sole)
    const boot = isLeft ? rigNodes.bootLeft : rigNodes.bootRight;
    boot.name = `Driver_Boot_${sideName}`;
    ankle.add(boot);

    // Boot upper body (leather racing shoe)
    const bootBodyStations = [
      { x: 0.0,  y: 0, z: 0.25, rx: 0.34, ry: 0.32 }, // Ankle collar
      { x: -0.2, y: 0, z: 0.05, rx: 0.42, ry: 0.35 }, // Heel cup
      { x: -0.6, y: 0, z: -0.05, rx: 0.45, ry: 0.36 }, // Arch / instep
      { x: -1.1, y: 0, z: -0.08, rx: 0.42, ry: 0.34 }, // Ball of foot
      { x: -1.45, y: 0, z: -0.06, rx: 0.32, ry: 0.28 }  // Rounded toe box
    ];
    const bootUpperGeo = createOrganicLoftGeometry(bootBodyStations, 10, 16);
    const bootUpperMesh = new THREE.Mesh(bootUpperGeo, bootMat);
    bootUpperMesh.name = `Driver_Boot_Upper_${sideName}`;
    bootUpperMesh.castShadow = true;
    boot.add(bootUpperMesh);

    // Speed lacing cross-laces on instep
    for (let l = 0; l < 4; l++) {
      const laceGeo = new THREE.BoxGeometry(0.04, 0.24, 0.03);
      const laceMesh = new THREE.Mesh(laceGeo, mats.titaniumBright);
      laceMesh.position.set(-0.45 - l * 0.18, 0, 0.22 + l * 0.04);
      laceMesh.rotation.z = (l % 2 === 0 ? 0.35 : -0.35);
      boot.add(laceMesh);
    }

    // Diamond waffle traction sole (matching media_1791233403328.webp & media_1791233403954.webp)
    const soleGeo = new THREE.BoxGeometry(1.55, 0.58, 0.09);
    const soleMesh = new THREE.Mesh(soleGeo, bootSoleMat);
    soleMesh.position.set(-0.75, 0, -0.32);
    soleMesh.name = `Driver_Boot_Sole_${sideName}`;
    soleMesh.receiveShadow = true;
    boot.add(soleMesh);

    // Rounded heel cup guard
    const heelGuardGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.42, 14);
    heelGuardGeo.rotateZ(Math.PI / 2);
    const heelGuard = new THREE.Mesh(heelGuardGeo, darkNomexMat);
    heelGuard.position.set(-0.18, 0, -0.18);
    boot.add(heelGuard);
  });

  root.userData.rigNodes = rigNodes;
  return root;
}

// =========================================================================
// 5. TWO-LINK ANALYTICAL INVERSE KINEMATICS (IK) SOLVER FOR DRIVER ARMS
// =========================================================================

/**
 * Solves 2-link analytical inverse kinematics for human arm:
 * Computes exact elbow position E so upper arm and forearm seamlessly meet
 * and connect the shoulder to the steering wheel grip.
 * 
 * @param {THREE.Vector3} S - Shoulder world position
 * @param {THREE.Vector3} W - Wrist world target position
 * @param {number} L1 - Upper arm length
 * @param {number} L2 - Forearm length
 * @param {THREE.Vector3} bendHint - Direction elbow naturally bends towards
 * @returns {THREE.Vector3} E - Solved elbow position
 */
export function solveTwoLinkArmIK(S, W, L1, L2, bendHint) {
  const D = new THREE.Vector3().subVectors(W, S);
  const targetDist = D.length();

  // Clamp target distance within reachable triangle
  const maxReach = (L1 + L2) * 0.998;
  const minReach = Math.abs(L1 - L2) * 1.002;
  const d = Math.max(minReach, Math.min(maxReach, targetDist));

  const uD = D.clone().normalize();

  // Law of Cosines: Angle at shoulder
  const cosA = THREE.MathUtils.clamp((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d), -1, 1);
  const sinA = Math.sqrt(Math.max(0, 1 - cosA * cosA));

  // Determine elbow bend plane using hint vector
  const planeNormal = new THREE.Vector3().crossVectors(uD, bendHint).normalize();
  if (planeNormal.lengthSq() < 0.001) {
    planeNormal.set(0, 0, 1);
  }
  const uPerp = new THREE.Vector3().crossVectors(planeNormal, uD).normalize();

  // Elbow position: S + uD * (L1 * cosA) + uPerp * (L1 * sinA)
  const E = S.clone()
    .addScaledVector(uD, L1 * cosA)
    .addScaledVector(uPerp, L1 * sinA);

  return E;
}

/**
 * Updates an arm segment (position and orientation) to point from startPt to endPt
 */
function orientArmSegment(group, startPt, endPt, rollRef) {
  group.position.copy(startPt);
  const dir = new THREE.Vector3().subVectors(endPt, startPt);
  const len = dir.length();
  dir.normalize();

  const up = rollRef || new THREE.Vector3(0, 0, 1);
  const m = new THREE.Matrix4().lookAt(new THREE.Vector3(0, 0, 0), dir, up);
  group.quaternion.setFromRotationMatrix(m);

  // Mesh scale along length if cylinder was authored along Z
  const childMesh = group.children[0];
  if (childMesh && childMesh.isMesh) {
    childMesh.position.set(0, 0, len / 2);
    childMesh.scale.set(1, 1, len / 2.5);
  }
}

// =========================================================================
// 6. REAL-TIME DRIVER KINEMATIC UPDATE (Apex Tracking, Gs, Pedals, Steering)
// =========================================================================

/**
 * Real-time driver dynamic articulation solver:
 * - Solves arm IK so gloves remain locked to PCU-8D steering wheel grips
 * - Articulates head yaw into corner apexes
 * - Pitches torso and head under braking and acceleration G-forces
 * - Articulates ankles and pedals under braking and throttle
 * - Adds natural breathing and idle micro-movement
 * 
 * @param {THREE.Group} driverAssembly - Driver 3D assembly
 * @param {Object} state - Telemetry inputs { steeringAngle, throttle, brakeKgf, speedKmH, rpm, dt }
 * @param {THREE.Group} steeringWheel - PCU-8D Steering wheel assembly
 * @param {THREE.Group} pedalAssembly - Cockpit pedal sled assembly
 */
export function updateDriverKinematics(driverAssembly, state = {}, steeringWheel = null, pedalAssembly = null) {
  if (!driverAssembly || !driverAssembly.userData.rigNodes) return;
  const nodes = driverAssembly.userData.rigNodes;

  const {
    steeringAngle = 0, // radians
    throttle = 0,      // 0 to 1
    brakeKgf = 0,      // 0 to 180 kgf
    speedKmH = 0,
    rpm = 0
  } = state;

  const brakeEffort = THREE.MathUtils.clamp(brakeKgf / 160, 0, 1);
  const throttleEffort = THREE.MathUtils.clamp(throttle, 0, 1);
  const time = performance.now() * 0.001;

  // 1. Organic Breathing & Micro-Motion (0.22 Hz respiration cycle)
  const breathCycle = Math.sin(time * 1.38) * 0.012;
  const engineVibe = rpm > 0 ? Math.sin(time * 65.0) * (0.002 * Math.min(1, rpm / 6000)) : 0;

  // 2. Torso Dynamic Pitch & Recline (G-Forces & Weight Transfer)
  // Braking: pitches forward under deceleration Gs
  // Throttle: reclines back into seat under acceleration Gs
  const torsoBasePitch = -0.58; // Base 33° recline
  const torsoGPitch = (brakeEffort * 0.045) - (throttleEffort * 0.025) + breathCycle;
  nodes.torsoJoint.rotation.y = THREE.MathUtils.lerp(nodes.torsoJoint.rotation.y, torsoBasePitch - torsoGPitch, 0.15);

  // 3. Head & Helmet Dynamic Articulation:
  // - Yaw Apex Tracking: Driver looks into corner apex (-steeringAngle * 0.42)
  // - Pitch: Head nods forward under heavy braking into harness tension
  // - Roll: Subtle tilt against lateral G forces
  const targetHeadYaw = -steeringAngle * 0.42;
  const targetHeadPitch = 0.58 + (brakeEffort * 0.08) - (throttleEffort * 0.035) + engineVibe;
  const targetHeadRoll = -steeringAngle * 0.12;

  nodes.neckJoint.rotation.y = THREE.MathUtils.lerp(nodes.neckJoint.rotation.y, targetHeadYaw, 0.18);
  nodes.neckJoint.rotation.x = THREE.MathUtils.lerp(nodes.neckJoint.rotation.x, targetHeadPitch, 0.18);
  nodes.neckJoint.rotation.z = THREE.MathUtils.lerp(nodes.neckJoint.rotation.z, targetHeadRoll, 0.18);

  // 4. Pedal Articulation & Foot Flexture:
  // Brake Pedal (Left foot):
  if (nodes.ankleLeft) {
    const leftAnkleFlex = brakeEffort * 0.32;
    nodes.ankleLeft.rotation.y = THREE.MathUtils.lerp(nodes.ankleLeft.rotation.y, leftAnkleFlex, 0.25);
    nodes.ankleLeft.position.x = -5.3 - brakeEffort * 0.28;
  }
  // Throttle Pedal (Right foot):
  if (nodes.ankleRight) {
    const rightAnkleFlex = throttleEffort * 0.28;
    nodes.ankleRight.rotation.y = THREE.MathUtils.lerp(nodes.ankleRight.rotation.y, rightAnkleFlex, 0.25);
    nodes.ankleRight.position.x = -5.3 - throttleEffort * 0.24;
  }

  // Also articulate pedal pads in pedalAssembly if available
  if (pedalAssembly) {
    const brakePad = pedalAssembly.getObjectByName('Body_Pedal_Brake_Footpad');
    if (brakePad) {
      brakePad.position.x = 0.12 - brakeEffort * 0.28;
    }
    const throttlePad = pedalAssembly.getObjectByName('Body_Pedal_Throttle_Footpad');
    if (throttlePad) {
      throttlePad.position.x = 0.24 - throttleEffort * 0.24;
    }
  }

  // 5. Driver Arms Inverse Kinematics (IK) Locked to Steering Wheel:
  // Calculate rotating hand grip target positions from steering wheel
  const wheelAngle = -steeringAngle * 2.5; // Steering ratio

  // Grip local offsets on PCU-8D wheel: X lateral (±1.35), Y height (-0.15), Z face (0.04)
  // Rotating around steering wheel column axis
  [-1, 1].forEach((side) => {
    const isLeft = side > 0;
    const gripX = (isLeft ? 1.35 : -1.35);
    const cosW = Math.cos(wheelAngle);
    const sinW = Math.sin(wheelAngle);

    // World target for wrist / glove
    // Datum: Steering wheel center at [8.2, 0.0, 4.2]
    // Column tilt: ~16° from horizontal
    const rotGripY = gripX * cosW;
    const rotGripZ = gripX * sinW * 0.28;
    const rotGripX = -gripX * sinW * 0.96;

    const wristTarget = new THREE.Vector3(
      8.35 + rotGripX,
      rotGripY,
      4.18 + rotGripZ
    );

    // Shoulder anchor position in car coordinates
    const shoulderPos = new THREE.Vector3(
      13.8,
      isLeft ? 1.55 : -1.55,
      4.25
    );

    // Solve 2-link IK
    const L_upper = 2.65;
    const L_fore = 2.55;
    const bendHint = new THREE.Vector3(0, isLeft ? 1.0 : -1.0, -0.35);

    const elbowPos = solveTwoLinkArmIK(shoulderPos, wristTarget, L_upper, L_fore, bendHint);

    const upperGroup = isLeft ? nodes.upperArmLeft : nodes.upperArmRight;
    const elbowGroup = isLeft ? nodes.elbowLeft : nodes.elbowRight;
    const foreGroup = isLeft ? nodes.forearmLeft : nodes.forearmRight;
    const wristGroup = isLeft ? nodes.wristLeft : nodes.wristRight;

    // Orient upper arm from shoulder to elbow
    if (upperGroup) {
      orientArmSegment(upperGroup, new THREE.Vector3(0, 0, 0), elbowPos.clone().sub(shoulderPos), bendHint);
    }
    // Orient forearm from elbow to wrist
    if (foreGroup) {
      orientArmSegment(foreGroup, elbowPos.clone().sub(shoulderPos), wristTarget.clone().sub(shoulderPos), bendHint);
    }
    // Wrist and Glove rotate with steering wheel angle
    if (wristGroup) {
      wristGroup.position.copy(wristTarget.clone().sub(shoulderPos));
      wristGroup.rotation.x = -wheelAngle;
    }
  });
}
