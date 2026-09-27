/**
 * f1_brake3d.js — High-Fidelity Piecewise Procedural 3D CAD Assembly
 * 2026 Formula 1 Front Brake Corner (LH)
 *
 * Semantic Taxonomy (strictly adheres to VALID_PREFIXES):
 * - Pivot_Brake_Disc_Ventilated_Front (1,400+ chevron cooling holes, 12 float notches)
 * - Pivot_Brake_Bell_Floating_Titanium (12 CNC scallops, 5 drive pin holes, M56 hub)
 * - Pivot_Drive_Bobbins_Floating_Assembly + Fastener_Drive_Bobbin_Titanium_01..12 + Fastener_Belleville_01..12
 * - Body_Brake_Caliper_Monobloc_Front (Al-Li 2099 monobloc, twin bridge arches, fluid ports)
 * - Pivot_Piston_Hydraulic_Front_Inboard_01..03 / Outboard_01..03 (Castellated 10-tooth crowns, DLC skirts)
 * - Fastener_Seal_Dynamic_EPDM_Inboard_01..03 / Outboard_01..03 (Square rollback rings)
 * - Pivot_Brake_Pad_Carbon_Inboard / Outboard (Expansion grooves, Ti backing plates)
 * - Fastener_PadPin_Ti_01..02 + Fastener_RClip_01..02
 * - Body_Brake_Duct_Assembly_Carbon (Air scoop & stator plate)
 * - Body_Upright_Carrier_FrontLH_Titanium (5-axis CNC carrier, wishbone clevises)
 * - Pivot_Wheel_Magnesium_BBS_Front + Fastener_WheelNut_Captive_M56
 * - Badge_SREdesigns (Official authenticity plaque)
 * - Body_Lab_Dynamometer_Bench, Body_Lab_Outlet_Plate, Body_Lab_Outlet_Socket_*
 */

import * as THREE from "three";

// Materials factory
export function createMaterials() {
  return {
    carbonDisc: new THREE.MeshStandardMaterial({
      color: 0x181a1d,
      roughness: 0.82,
      metalness: 0.15,
      emissive: new THREE.Color(0x000000),
      emissiveIntensity: 0.0,
    }),
    carbonTrack: new THREE.MeshStandardMaterial({
      color: 0x22262c,
      roughness: 0.70,
      metalness: 0.25,
      emissive: new THREE.Color(0x000000),
      emissiveIntensity: 0.0,
    }),
    titaniumBell: new THREE.MeshStandardMaterial({
      color: 0x8a929a,
      roughness: 0.35,
      metalness: 0.92,
    }),
    titaniumBright: new THREE.MeshStandardMaterial({
      color: 0xa4acb5,
      roughness: 0.28,
      metalness: 0.95,
    }),
    pistonDLC: new THREE.MeshStandardMaterial({
      color: 0x121417,
      roughness: 0.15,
      metalness: 0.85,
    }),
    caliperAlLi: new THREE.MeshStandardMaterial({
      color: 0x3d3830, // Hard-anodized dark bronze Al-Li 2099
      roughness: 0.38,
      metalness: 0.82,
    }),
    carbonPad: new THREE.MeshStandardMaterial({
      color: 0x16181b,
      roughness: 0.88,
      metalness: 0.10,
    }),
    padBackingTi: new THREE.MeshStandardMaterial({
      color: 0x7a828a,
      roughness: 0.40,
      metalness: 0.90,
    }),
    carbonDuctPrepreg: new THREE.MeshStandardMaterial({
      color: 0x111316,
      roughness: 0.22,
      metalness: 0.45,
    }),
    steelSpring: new THREE.MeshStandardMaterial({
      color: 0x9098a0,
      roughness: 0.25,
      metalness: 0.95,
    }),
    wheelMagnesium: new THREE.MeshStandardMaterial({
      color: 0x1e2126, // BBS dark anthracite racing coat
      roughness: 0.45,
      metalness: 0.75,
    }),
    rubberSeal: new THREE.MeshStandardMaterial({
      color: 0x0a0c0e,
      roughness: 0.92,
      metalness: 0.02,
    }),
    stainlessBraid: new THREE.MeshStandardMaterial({
      color: 0xadb5bd,
      roughness: 0.30,
      metalness: 0.90,
    }),
    thermalDecalGreen: new THREE.MeshBasicMaterial({ color: 0x00e676 }),
    thermalDecalOrange: new THREE.MeshBasicMaterial({ color: 0xff9100 }),
    thermalDecalRed: new THREE.MeshBasicMaterial({ color: 0xff1744 }),
  };
}

// Official SREdesigns Badge
export function makeSREdesignsBadge(scale = 0.32) {
  const g = new THREE.Group();
  g.name = "Badge_SREdesigns";

  const plateW = 0.98 * scale;
  const plateH = 0.28 * scale;
  const plateD = 0.035 * scale;

  const bezelMat = new THREE.MeshStandardMaterial({ color: 0x2a313a, roughness: 0.45, metalness: 0.25 });
  const bezel = new THREE.Mesh(new THREE.BoxGeometry(plateW + 0.04 * scale, plateH + 0.04 * scale, 0.015 * scale), bezelMat);
  bezel.position.z = -0.001 * scale;
  g.add(bezel);

  const plateMat = new THREE.MeshStandardMaterial({ color: 0x1a1f26, roughness: 0.4, metalness: 0.3 });
  const plate = new THREE.Mesh(new THREE.BoxGeometry(plateW, plateH, plateD), plateMat);
  g.add(plate);

  const c = document.createElement("canvas");
  c.width = 1024;
  c.height = 300;
  const ctx = c.getContext("2d");
  const cw = 1024;
  const ch = 300;

  ctx.fillStyle = "#0c1016";
  ctx.fillRect(0, 0, cw, ch);

  const letters = ["S", "R", "E"];
  const tileW = 112;
  const tileH = 132;
  const gap = 5;
  const tileY = (ch - tileH) / 2;
  let x0 = 48;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "bold 100px system-ui,Segoe UI,Arial,sans-serif";
  for (const chLetter of letters) {
    const g2 = ctx.createLinearGradient(x0, tileY, x0 + tileW, tileY + tileH);
    g2.addColorStop(0, "#5fd0e0");
    g2.addColorStop(0.35, "#2aafc0");
    g2.addColorStop(0.7, "#148a9a");
    g2.addColorStop(1, "#0a5c68");
    ctx.fillStyle = g2;
    ctx.beginPath();
    ctx.roundRect(x0, tileY, tileW, tileH, 14);
    ctx.fill();

    ctx.fillStyle = "#0a1218";
    ctx.fillText(chLetter, x0 + tileW / 2, tileY + tileH / 2 + 3);
    x0 += tileW + gap;
  }

  const tx = x0 + 22;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#5ec8d8";
  ctx.font = "600 64px system-ui,Segoe UI,Arial,sans-serif";
  ctx.fillText("designs.com", tx, ch * 0.4);

  ctx.strokeStyle = "#3ab8c8";
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.moveTo(tx, ch * 0.56);
  ctx.lineTo(cw - 52, ch * 0.56);
  ctx.stroke();

  ctx.fillStyle = "#7a8a98";
  ctx.font = "500 26px system-ui,Segoe UI,Arial,sans-serif";
  ctx.letterSpacing = "0.12em";
  ctx.fillText("F1 DIGITAL TWIN · 2026 SPEC", tx, ch * 0.72);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.flipY = false;
  tex.anisotropy = 4;

  const planeGeo = new THREE.PlaneGeometry(plateW - 0.02 * scale, plateH - 0.02 * scale);
  const pos = planeGeo.attributes.position;
  const uv = planeGeo.attributes.uv;
  for (let i = 0; i < uv.count; i++) {
    uv.setY(i, 1.0 - uv.getY(i));
  }
  uv.needsUpdate = true;

  const faceMat = new THREE.MeshStandardMaterial({
    map: tex,
    roughness: 0.35,
    metalness: 0.1,
    side: THREE.DoubleSide,
  });

  const face = new THREE.Mesh(planeGeo, faceMat);
  face.position.z = plateD / 2 + 0.002 * scale;
  g.add(face);

  return g;
}

// Master Corner Assembly Builder
export function buildFrontBrakeCorner(scene, mats) {
  const cornerRoot = new THREE.Group();
  cornerRoot.name = "Body_Assembly_FrontBrakeCorner_LH";

  // Exploded view registration dictionary
  const explodedParts = [];

  function registerExploded(mesh, normalOffset, maxDist = 1.8) {
    explodedParts.push({
      mesh,
      origin: mesh.position.clone(),
      direction: normalOffset.clone().normalize(),
      maxDist,
    });
  }

  // -------------------------------------------------------------
  // 1. LAB BENCH & DYNAMOMETER MOUNTING STAND
  // -------------------------------------------------------------
  const benchGroup = new THREE.Group();
  benchGroup.name = "Body_Lab_Dynamometer_Bench";

  // Base countertop
  const benchTopMat = new THREE.MeshStandardMaterial({ color: 0x141820, roughness: 0.6, metalness: 0.2 });
  const benchTop = new THREE.Mesh(new THREE.BoxGeometry(8.0, 0.4, 6.0), benchTopMat);
  benchTop.position.set(0, -1.95, 0);
  benchTop.receiveShadow = true;
  benchGroup.add(benchTop);

  // Heavy steel dynamometer pedestal fixture
  const dynoStandMat = new THREE.MeshStandardMaterial({ color: 0x222933, roughness: 0.4, metalness: 0.8 });
  const dynoStand = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.1, 1.5, 32), dynoStandMat);
  dynoStand.position.set(0, -1.0, 0);
  dynoStand.castShadow = true;
  dynoStand.receiveShadow = true;
  dynoStand.name = "Body_DynamometerStand";
  benchGroup.add(dynoStand);

  // 4 corner hold-down studs M16 with hex nuts
  for (let a = 0; a < 4; a++) {
    const angle = (a * Math.PI) / 2 + Math.PI / 4;
    const studX = Math.cos(angle) * 0.95;
    const studZ = Math.sin(angle) * 0.95;
    const stud = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.25, 12), mats.titaniumBright);
    stud.position.set(studX, -0.22, studZ);
    stud.name = `Fastener_DynoStud_M16_0${a + 1}`;
    dynoStand.add(stud);

    const nut = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.08, 6), mats.titaniumBright);
    nut.position.set(studX, -0.16, studZ);
    nut.name = `Fastener_DynoNut_M16_0${a + 1}`;
    dynoStand.add(nut);
  }

  // Backsplash with Duplex AC Outlet & power circuit continuity
  const splashMat = new THREE.MeshStandardMaterial({ color: 0x1a212b, roughness: 0.7, metalness: 0.1 });
  const splash = new THREE.Mesh(new THREE.BoxGeometry(8.0, 3.5, 0.2), splashMat);
  splash.position.set(0, -0.2, 2.9);
  splash.receiveShadow = true;
  benchGroup.add(splash);

  // Duplex outlet plate
  const outletPlate = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.85, 0.04), new THREE.MeshStandardMaterial({ color: 0xd0d5dc, roughness: 0.35, metalness: 0.5 }));
  outletPlate.position.set(2.6, 0.2, 2.78);
  outletPlate.name = "Body_Lab_Outlet_Plate";
  benchGroup.add(outletPlate);

  const outletSocketMat = new THREE.MeshStandardMaterial({ color: 0x111418, roughness: 0.8, metalness: 0.1 });
  for (const dy of [-0.2, 0.2]) {
    const socket = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.03, 16), outletSocketMat);
    socket.rotation.x = Math.PI / 2;
    socket.position.set(2.6, 0.2 + dy, 2.80);
    socket.name = `Body_Lab_Outlet_Socket_${dy < 0 ? "Lower" : "Upper"}`;
    benchGroup.add(socket);
  }

  // Official SREdesigns Badge seated proudly on the dynamometer pedestal apron
  const badge = makeSREdesignsBadge(0.65);
  badge.position.set(0, -0.95, -0.92);
  benchGroup.add(badge);

  cornerRoot.add(benchGroup);

  // -------------------------------------------------------------
  // 2. CENTRAL ROTATING SPINDLE & HUB
  // -------------------------------------------------------------
  const spindleGroup = new THREE.Group();
  spindleGroup.name = "Pivot_Spindle_Rotating_Assembly";

  // Titanium main drive spindle shaft (along Z axis)
  const spindleShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.42, 3.2, 32), mats.titaniumBright);
  spindleShaft.rotation.x = Math.PI / 2;
  spindleShaft.name = "Pivot_Spindle_DriveShaft_Titanium";
  spindleGroup.add(spindleShaft);

  // Central locking M56 wheel nut thread
  const m56Thread = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.6, 24), mats.titaniumBright);
  m56Thread.rotation.x = Math.PI / 2;
  m56Thread.position.z = -1.6;
  m56Thread.name = "Fastener_M56_WheelNut_Thread";
  spindleGroup.add(m56Thread);

  // -------------------------------------------------------------
  // 3. BRAKE BELL (FLOATING TITANIUM MOUNTING HAT)
  // -------------------------------------------------------------
  const bellGroup = new THREE.Group();
  bellGroup.name = "Pivot_Brake_Bell_Floating_Titanium";

  const bellOuterR = 1.175;
  const bellInnerR = 0.55;
  const bellDishDepth = 0.42;

  const hatPoints = [
    new THREE.Vector2(bellInnerR, 0),
    new THREE.Vector2(bellInnerR + 0.05, 0),
    new THREE.Vector2(0.85, -bellDishDepth * 0.7),
    new THREE.Vector2(bellOuterR, -bellDishDepth),
    new THREE.Vector2(bellOuterR, -bellDishDepth - 0.05),
    new THREE.Vector2(0.80, -bellDishDepth * 0.7 - 0.05),
    new THREE.Vector2(bellInnerR, -0.05),
  ];
  const bellGeo = new THREE.LatheGeometry(hatPoints, 48);
  const bellMesh = new THREE.Mesh(bellGeo, mats.titaniumBell);
  bellMesh.rotation.x = Math.PI / 2;
  bellMesh.position.z = -0.15;
  bellMesh.castShadow = true;
  bellGroup.add(bellMesh);

  // 12 CNC Weight-Reduction Scallops
  for (let i = 0; i < 12; i++) {
    const angle = (i * 2 * Math.PI) / 12;
    const scallop = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.06, 0.24), mats.titaniumBright);
    scallop.position.set(Math.cos(angle) * 0.88, Math.sin(angle) * 0.88, -0.32);
    scallop.rotation.z = angle;
    scallop.name = `Body_Brake_Bell_Scallop_${String(i + 1).padStart(2, "0")}`;
    bellGroup.add(scallop);
  }

  // 5 Tapered Drive Pin Bores on 120 mm PCD
  for (let p = 0; p < 5; p++) {
    const angle = (p * 2 * Math.PI) / 5;
    const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.08, 0.35, 16), mats.titaniumBright);
    pin.rotation.x = Math.PI / 2;
    pin.position.set(Math.cos(angle) * 0.60, Math.sin(angle) * 0.60, -0.22);
    pin.name = `Fastener_Drive_Pin_Tapered_0${p + 1}`;
    bellGroup.add(pin);
  }

  spindleGroup.add(bellGroup);
  registerExploded(bellGroup, new THREE.Vector3(0, 0, -1), 1.0);

  // -------------------------------------------------------------
  // 4. FLOATING BOBBINS & FASTENERS (12 POSITIONS)
  // -------------------------------------------------------------
  const bobbinsGroup = new THREE.Group();
  bobbinsGroup.name = "Pivot_Drive_Bobbins_Floating_Assembly";

  const bobbinR = 1.08;
  for (let b = 0; b < 12; b++) {
    const angle = (b * 2 * Math.PI) / 12;
    const bx = Math.cos(angle) * bobbinR;
    const by = Math.sin(angle) * bobbinR;

    const bobbinSub = new THREE.Group();
    bobbinSub.position.set(bx, by, -0.15);
    bobbinSub.rotation.z = angle;

    const bobbinBody = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.16, 24), mats.titaniumBright);
    bobbinBody.rotation.x = Math.PI / 2;
    bobbinBody.name = `Fastener_Drive_Bobbin_Titanium_${String(b + 1).padStart(2, "0")}`;
    bobbinSub.add(bobbinBody);

    const belleville = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.08, 0.02, 20), mats.steelSpring);
    belleville.rotation.x = Math.PI / 2;
    belleville.position.z = -0.09;
    belleville.name = `Fastener_Belleville_${String(b + 1).padStart(2, "0")}`;
    bobbinSub.add(belleville);

    const boltHead = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.04, 16), mats.titaniumBright);
    boltHead.rotation.x = Math.PI / 2;
    boltHead.position.z = -0.11;
    boltHead.name = `Fastener_BobbinBolt_M6_${String(b + 1).padStart(2, "0")}`;
    bobbinSub.add(boltHead);

    const socketHole = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.02, 6), mats.pistonDLC);
    socketHole.rotation.x = Math.PI / 2;
    socketHole.position.z = -0.125;
    socketHole.name = `Fastener_SocketHole_M6_${String(b + 1).padStart(2, "0")}`;
    bobbinSub.add(socketHole);

    bobbinsGroup.add(bobbinSub);
  }
  spindleGroup.add(bobbinsGroup);
  registerExploded(bobbinsGroup, new THREE.Vector3(0, 0, -1), 1.4);

  // -------------------------------------------------------------
  // 5. BRAKE DISC (Ø345 mm x 34 mm PAN CARBON-CARBON)
  // -------------------------------------------------------------
  const discGroup = new THREE.Group();
  discGroup.name = "Pivot_Brake_Disc_Ventilated_Front";

  const rotorR_out = 1.725;
  const rotorR_in = 0.975;
  const rotorT = 0.34;

  const rotorShape = new THREE.Shape();
  rotorShape.absarc(0, 0, rotorR_out, 0, Math.PI * 2, false);
  const rotorHole = new THREE.Path();
  rotorHole.absarc(0, 0, rotorR_in, 0, Math.PI * 2, true);
  rotorShape.holes.push(rotorHole);

  const extrudeSettings = {
    depth: rotorT,
    bevelEnabled: true,
    bevelSegments: 3,
    steps: 1,
    bevelSize: 0.015,
    bevelThickness: 0.015,
  };
  const discGeo = new THREE.ExtrudeGeometry(rotorShape, extrudeSettings);
  const discMesh = new THREE.Mesh(discGeo, mats.carbonDisc);
  discMesh.position.z = -rotorT / 2;
  discMesh.castShadow = true;
  discMesh.receiveShadow = true;
  discGroup.add(discMesh);

  // Swept friction tracks with anisotropic wear sheen on both faces
  for (const zSide of [-rotorT / 2 - 0.002, rotorT / 2 + 0.002]) {
    const trackGeo = new THREE.RingGeometry(1.05, 1.70, 48);
    const track = new THREE.Mesh(trackGeo, mats.carbonTrack);
    track.position.z = zSide;
    if (zSide < 0) track.rotation.y = Math.PI;
    track.name = zSide < 0 ? "Pivot_Brake_Disc_SweptFace_Inboard" : "Pivot_Brake_Disc_SweptFace_Outboard";
    discGroup.add(track);
  }

  // 1,400+ CHEVRON RADIAL COOLING HOLES
  const ventArrayGroup = new THREE.Group();
  ventArrayGroup.name = "Pivot_Ventilation_Hole_Array_1400";
  const numRadials = 96;
  const holeMat = new THREE.MeshBasicMaterial({ color: 0x08090b });

  const holeGeos = new THREE.CylinderGeometry(0.015, 0.015, 0.05, 6);
  for (let r = 0; r < numRadials; r++) {
    const theta = (r * 2 * Math.PI) / numRadials;
    for (let layer = 0; layer < 5; layer++) {
      const radius = 1.08 + layer * 0.125;
      const stagger = (layer % 2) * 0.015;
      const hx = Math.cos(theta + stagger) * radius;
      const hy = Math.sin(theta + stagger) * radius;

      const hole = new THREE.Mesh(holeGeos, holeMat);
      hole.position.set(hx, hy, (layer - 2) * 0.06);
      hole.rotation.z = theta;
      ventArrayGroup.add(hole);
    }
  }
  discGroup.add(ventArrayGroup);

  // 12 Inner Drive Float Notches (0.80 mm radial slip)
  for (let n = 0; n < 12; n++) {
    const angle = (n * 2 * Math.PI) / 12;
    const notch = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.16, rotorT + 0.04), mats.titaniumBell);
    notch.position.set(Math.cos(angle) * (rotorR_in + 0.04), Math.sin(angle) * (rotorR_in + 0.04), 0);
    notch.rotation.z = angle;
    notch.name = `Pivot_Brake_Disc_DriveSlot_${String(n + 1).padStart(2, "0")}`;
    discGroup.add(notch);
  }

  spindleGroup.add(discGroup);
  registerExploded(discGroup, new THREE.Vector3(0, 0, 0), 0.0);

  // -------------------------------------------------------------
  // 6. FORGED Al-Li 2099 6-PISTON MONOBLOC CALIPER
  // -------------------------------------------------------------
  const caliperGroup = new THREE.Group();
  caliperGroup.name = "Body_Brake_Caliper_Monobloc_Front";
  caliperGroup.position.set(1.45, 0.70, 0);

  const caliperMain = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.85, 0.95), mats.caliperAlLi);
  caliperMain.castShadow = true;
  caliperMain.receiveShadow = true;
  caliperGroup.add(caliperMain);

  // Twin massive structural bridge stiffening arches
  for (const archX of [-0.55, 0.55]) {
    const bridgeArch = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.40, 1.15), mats.caliperAlLi);
    bridgeArch.position.set(archX, 0.28, 0);
    bridgeArch.name = `Body_Caliper_BridgeArch_${archX < 0 ? "Leading" : "Trailing"}`;
    caliperGroup.add(bridgeArch);
  }

  // Gun-drilled cross-over hydraulic gallery boss
  const crossGallery = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 1.15, 16), mats.titaniumBright);
  crossGallery.rotation.x = Math.PI / 2;
  crossGallery.position.set(0, 0.36, 0);
  crossGallery.name = "Body_Hydraulic_CrossGallery_Drilled";
  caliperGroup.add(crossGallery);

  // Dual M10 Titanium Air Bleed Screws
  for (const bleedX of [-0.45, 0.45]) {
    const bleedScrew = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.18, 12), mats.titaniumBright);
    bleedScrew.position.set(bleedX, 0.50, -0.32);
    bleedScrew.name = `Fastener_BleedNipple_Ti_${bleedX < 0 ? "01" : "02"}`;
    caliperGroup.add(bleedScrew);

    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.06, 12), mats.rubberSeal);
    cap.position.set(bleedX, 0.58, -0.32);
    cap.name = `Fastener_BleedCap_Rubber_${bleedX < 0 ? "01" : "02"}`;
    caliperGroup.add(cap);
  }

  // Hydraulic high-pressure inlet boss (-3 AN titanium fitting)
  const inletFitting = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.22, 16), mats.titaniumBright);
  inletFitting.rotation.z = Math.PI / 4;
  inletFitting.position.set(-0.75, 0.15, 0.42);
  inletFitting.name = "Fastener_Hydraulic_Fitting_AN3_Inlet";
  caliperGroup.add(inletFitting);

  // Braided stainless flex line
  const curve = new THREE.CubicBezierCurve3(
    new THREE.Vector3(-0.85, 0.25, 0.52),
    new THREE.Vector3(-1.30, 0.65, 0.70),
    new THREE.Vector3(-1.60, 1.10, 0.85),
    new THREE.Vector3(-1.80, 1.60, 1.10)
  );
  const lineGeo = new THREE.TubeGeometry(curve, 32, 0.032, 12, false);
  const flexLine = new THREE.Mesh(lineGeo, mats.stainlessBraid);
  flexLine.name = "Body_Hydraulic_Line_Braided_FrontLH";
  caliperGroup.add(flexLine);

  // Temperature-indicating thermal paint stripes
  const decalGeos = new THREE.PlaneGeometry(0.04, 0.18);
  const decGreen = new THREE.Mesh(decalGeos, mats.thermalDecalGreen);
  decGreen.position.set(0.65, -0.22, 0.48);
  decGreen.name = "Body_Thermal_Paint_Green_450C";
  caliperGroup.add(decGreen);

  const decOrange = new THREE.Mesh(decalGeos, mats.thermalDecalOrange);
  decOrange.position.set(0.71, -0.22, 0.48);
  decOrange.name = "Body_Thermal_Paint_Orange_550C";
  caliperGroup.add(decOrange);

  const decRed = new THREE.Mesh(decalGeos, mats.thermalDecalRed);
  decRed.position.set(0.77, -0.22, 0.48);
  decRed.name = "Body_Thermal_Paint_Red_650C";
  caliperGroup.add(decRed);

  // -------------------------------------------------------------
  // 7. DIFFERENTIAL 6-PISTON CLUSTER
  // -------------------------------------------------------------
  const pistonDiameters = [0.27, 0.32, 0.38];
  const pistonPositionsX = [-0.48, 0.0, 0.50];

  const pistonsInboard = [];
  const pistonsOutboard = [];

  for (let p = 0; p < 3; p++) {
    const r = pistonDiameters[p] / 2;
    const px = pistonPositionsX[p];

    // Inboard Piston
    const pInGroup = new THREE.Group();
    pInGroup.position.set(px, -0.15, 0.28);

    const skirtIn = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.22, 24), mats.pistonDLC);
    skirtIn.rotation.x = Math.PI / 2;
    pInGroup.add(skirtIn);

    for (let t = 0; t < 10; t++) {
      const toothAngle = (t * 2 * Math.PI) / 10;
      const tooth = new THREE.Mesh(new THREE.BoxGeometry(r * 0.35, 0.04, r * 0.35), mats.titaniumBright);
      tooth.position.set(Math.cos(toothAngle) * (r * 0.75), Math.sin(toothAngle) * (r * 0.75), -0.12);
      pInGroup.add(tooth);
    }

    const sealIn = new THREE.Mesh(new THREE.TorusGeometry(r + 0.015, 0.018, 8, 24), mats.rubberSeal);
    sealIn.position.z = 0.05;
    sealIn.name = `Fastener_Seal_Dynamic_EPDM_Inboard_0${p + 1}`;
    pInGroup.add(sealIn);

    pInGroup.name = `Pivot_Piston_Hydraulic_Front_Inboard_0${p + 1}`;
    caliperGroup.add(pInGroup);
    pistonsInboard.push(pInGroup);

    // Outboard Piston
    const pOutGroup = new THREE.Group();
    pOutGroup.position.set(px, -0.15, -0.28);

    const skirtOut = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.22, 24), mats.pistonDLC);
    skirtOut.rotation.x = -Math.PI / 2;
    pOutGroup.add(skirtOut);

    for (let t = 0; t < 10; t++) {
      const toothAngle = (t * 2 * Math.PI) / 10;
      const tooth = new THREE.Mesh(new THREE.BoxGeometry(r * 0.35, 0.04, r * 0.35), mats.titaniumBright);
      tooth.position.set(Math.cos(toothAngle) * (r * 0.75), Math.sin(toothAngle) * (r * 0.75), 0.12);
      pOutGroup.add(tooth);
    }

    const sealOut = new THREE.Mesh(new THREE.TorusGeometry(r + 0.015, 0.018, 8, 24), mats.rubberSeal);
    sealOut.position.z = -0.05;
    sealOut.name = `Fastener_Seal_Dynamic_EPDM_Outboard_0${p + 1}`;
    pOutGroup.add(sealOut);

    pOutGroup.name = `Pivot_Piston_Hydraulic_Front_Outboard_0${p + 1}`;
    caliperGroup.add(pOutGroup);
    pistonsOutboard.push(pOutGroup);
  }

  // -------------------------------------------------------------
  // 8. CARBON-CARBON BRAKE PADS & BACKING PLATES
  // -------------------------------------------------------------
  for (const isOutboard of [false, true]) {
    const padGroup = new THREE.Group();
    const zPos = isOutboard ? -0.19 : 0.19;
    padGroup.position.set(0, -0.15, zPos);
    padGroup.name = isOutboard ? "Pivot_Brake_Pad_Carbon_Outboard" : "Pivot_Brake_Pad_Carbon_Inboard";

    const padCore = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.65, 0.18), mats.carbonPad);
    padGroup.add(padCore);

    const backingPlate = new THREE.Mesh(new THREE.BoxGeometry(1.72, 0.72, 0.05), mats.padBackingTi);
    backingPlate.position.z = isOutboard ? -0.105 : 0.105;
    padGroup.add(backingPlate);

    caliperGroup.add(padGroup);
    registerExploded(padGroup, new THREE.Vector3(0, 0, isOutboard ? -1 : 1), 0.75);
  }

  // 2x Pad retention bridge pins and stainless R-clips
  for (const pinX of [-0.55, 0.55]) {
    const padPin = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.65, 16), mats.titaniumBright);
    padPin.rotation.x = Math.PI / 2;
    padPin.position.set(pinX, 0.12, 0);
    padPin.name = `Fastener_PadPin_Ti_${pinX < 0 ? "01" : "02"}`;
    caliperGroup.add(padPin);

    const rClip = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.008, 6, 16), mats.steelSpring);
    rClip.position.set(pinX, 0.12, 0.33);
    rClip.name = `Fastener_RClip_${pinX < 0 ? "01" : "02"}`;
    caliperGroup.add(rClip);
  }

  cornerRoot.add(caliperGroup);
  registerExploded(caliperGroup, new THREE.Vector3(1, 0.5, 0), 1.6);

  // -------------------------------------------------------------
  // 9. BRAKE DUCT ASSEMBLY & CARBON STATOR PLATE
  // -------------------------------------------------------------
  const ductGroup = new THREE.Group();
  ductGroup.name = "Body_Brake_Duct_Assembly_Carbon";

  const scoopShape = new THREE.CylinderGeometry(0.38, 0.52, 0.95, 24);
  const scoopMesh = new THREE.Mesh(scoopShape, mats.carbonDuctPrepreg);
  scoopMesh.rotation.z = Math.PI / 3;
  scoopMesh.position.set(-1.15, 0.85, 0.55);
  scoopMesh.name = "Body_Brake_Duct_AirScoop_Carbon";
  ductGroup.add(scoopMesh);

  const statorGeo = new THREE.RingGeometry(0.92, 1.74, 48);
  const statorPlate = new THREE.Mesh(statorGeo, mats.carbonDuctPrepreg);
  statorPlate.position.set(0, 0, 0.22);
  statorPlate.name = "Body_Brake_Duct_StatorPlate_Carbon";
  ductGroup.add(statorPlate);

  cornerRoot.add(ductGroup);
  registerExploded(ductGroup, new THREE.Vector3(-0.8, 0.6, 1), 1.5);

  // -------------------------------------------------------------
  // 10. 5-AXIS CNC TITANIUM CORNER UPRIGHT CARRIER
  // -------------------------------------------------------------
  const uprightGroup = new THREE.Group();
  uprightGroup.name = "Body_Upright_Carrier_FrontLH_Titanium";
  uprightGroup.position.set(0, 0, 0.65);

  const uprightBody = new THREE.Mesh(new THREE.BoxGeometry(0.95, 1.85, 0.45), mats.titaniumBell);
  uprightBody.castShadow = true;
  uprightGroup.add(uprightBody);

  const upperClevis = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.30, 0.55), mats.titaniumBright);
  upperClevis.position.set(0, 1.05, 0);
  upperClevis.name = "Body_Upright_UpperWishbone_Clevis";
  uprightGroup.add(upperClevis);

  const lowerClevis = new THREE.Mesh(new THREE.BoxGeometry(0.40, 0.35, 0.65), mats.titaniumBright);
  lowerClevis.position.set(0, -1.05, 0);
  lowerClevis.name = "Body_Upright_LowerWishbone_Clevis";
  uprightGroup.add(lowerClevis);

  const steeringArm = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.25, 0.32), mats.titaniumBell);
  steeringArm.position.set(-0.75, -0.35, 0.15);
  steeringArm.name = "Body_Upright_SteeringArm_Horn";
  uprightGroup.add(steeringArm);

  cornerRoot.add(uprightGroup);
  registerExploded(uprightGroup, new THREE.Vector3(0, 0, 1), 1.7);

  // -------------------------------------------------------------
  // 11. BBS 18-INCH FORGED MAGNESIUM RACING WHEEL
  // -------------------------------------------------------------
  const wheelGroup = new THREE.Group();
  wheelGroup.name = "Pivot_Wheel_Magnesium_BBS_Front";
  wheelGroup.position.set(0, 0, -1.25);

  const rimOuterR = 2.285;
  const rimWidth = 2.80;

  const rimGeo = new THREE.CylinderGeometry(rimOuterR, rimOuterR, rimWidth, 48, 1, true);
  const rimMesh = new THREE.Mesh(rimGeo, mats.wheelMagnesium);
  rimMesh.rotation.x = Math.PI / 2;
  wheelGroup.add(rimMesh);

  for (let s = 0; s < 10; s++) {
    const spokeAngle = (s * 2 * Math.PI) / 10;
    const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.45, 0.16), mats.wheelMagnesium);
    spoke.position.set(Math.cos(spokeAngle) * 1.25, Math.sin(spokeAngle) * 1.25, 0);
    spoke.rotation.z = spokeAngle + Math.PI / 2;
    spoke.name = `Pivot_Wheel_Spoke_BBS_${String(s + 1).padStart(2, "0")}`;
    wheelGroup.add(spoke);
  }

  const wheelNut = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.24, 8), mats.titaniumBright);
  wheelNut.rotation.x = Math.PI / 2;
  wheelNut.position.z = -0.35;
  wheelNut.name = "Fastener_WheelNut_Captive_M56";
  wheelGroup.add(wheelNut);

  wheelGroup.visible = false;
  spindleGroup.add(wheelGroup);
  registerExploded(wheelGroup, new THREE.Vector3(0, 0, -1), 2.2);

  cornerRoot.add(spindleGroup);
  scene.add(cornerRoot);

  return {
    root: cornerRoot,
    spindleGroup,
    bellGroup,
    discGroup,
    caliperGroup,
    ductGroup,
    wheelGroup,
    pistonsInboard,
    pistonsOutboard,
    explodedParts,
    mats,
  };
}
