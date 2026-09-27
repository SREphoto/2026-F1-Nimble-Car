/**
 * monocoque3d.js — High-Fidelity Piecewise Procedural 3D CAD Assembly
 * 2026 Formula 1 Survival Cell Monocoque & Master Chassis Datum
 *
 * Semantic Taxonomy (strictly adheres to VALID_PREFIXES):
 * - Body_SurvivalCell_Assembly
 * - Body_SurvivalCell_Tub (Carbon/Zylon/Nomex sandwich tub)
 * - Body_Safety_Halo_Titanium (Grade 5 Ti-6Al-4V 125 kN halo)
 * - Body_Halo_AeroFairing_Carbon
 * - Fastener_HaloMount_Ti_01..04
 * - Body_Safety_RollHoop_Airbox (172 kN proof load arch with twin splitters)
 * - Body_Bulkhead_Front_Ti (Front chassis face, FIS spigots, suspension clevises)
 * - Fastener_FIS_MountSpigot_Ti_01..04
 * - Body_Inboard_Wishbone_Clevis_Upper_LH / RH
 * - Body_Inboard_Wishbone_Clevis_Lower_LH / RH
 * - Body_SIPS_CrushTube_01..04 (Side-impact carbon crush tubes)
 * - Body_BeadSeat_Shell (Custom molded driver bead seat)
 * - Body_Headrest_ConforFoam (Viscoelastic safety collar)
 * - Body_PedalBox_Sled (Fore-aft linear adjustable sled)
 * - Pivot_Pedal_Brake (180 kgf load cell brake pedal)
 * - Pivot_Pedal_Throttle (Dual Hall sensor throttle pedal)
 * - UI_LCD_Cockpit (McLaren PCU-8D transflective telemetry screen)
 * - Body_Bulkhead_Rear_Ti + Fastener_EngineStud_M12_01..06
 * - Badge_SREdesigns (Official chassis serial plate)
 */

import * as THREE from "three";

// Scaling: 1 unit = 100 mm (0.1 m). 2,200 mm tub = 22.0 units length.
export function createMonocoqueMaterials() {
  return {
    carbonGloss: new THREE.MeshStandardMaterial({
      color: 0x14171a,
      roughness: 0.18,
      metalness: 0.35,
    }),
    carbonMatte: new THREE.MeshStandardMaterial({
      color: 0x101215,
      roughness: 0.75,
      metalness: 0.15,
    }),
    zylonBallistic: new THREE.MeshStandardMaterial({
      color: 0xb58832, // Golden-amber Zylon PBO weave
      roughness: 0.65,
      metalness: 0.20,
    }),
    titaniumHalo: new THREE.MeshStandardMaterial({
      color: 0x969fa8,
      roughness: 0.32,
      metalness: 0.94,
    }),
    titaniumBright: new THREE.MeshStandardMaterial({
      color: 0xb2bac4,
      roughness: 0.25,
      metalness: 0.96,
    }),
    conforFoam: new THREE.MeshStandardMaterial({
      color: 0x1a2433, // Dark blue-grey viscoelastic foam
      roughness: 0.95,
      metalness: 0.05,
    }),
    pedalAlloy: new THREE.MeshStandardMaterial({
      color: 0x5a6370,
      roughness: 0.30,
      metalness: 0.85,
    }),
    kevlarStrap: new THREE.MeshStandardMaterial({
      color: 0xd4a017,
      roughness: 0.85,
      metalness: 0.05,
    }),
    statusLedGreen: new THREE.MeshBasicMaterial({ color: 0x00e676 }),
    statusLedRed: new THREE.MeshBasicMaterial({ color: 0xff1744 }),
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
  ctx.fillText("F1 2026 SURVIVAL CELL · CHASSIS 01", tx, ch * 0.72);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.flipY = false;
  tex.anisotropy = 4;

  const planeGeo = new THREE.PlaneGeometry(plateW - 0.02 * scale, plateH - 0.02 * scale);
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

// Build 2026 F1 Survival Cell
export function buildSurvivalCell(scene, mats) {
  const root = new THREE.Group();
  root.name = "Body_SurvivalCell_Assembly";

  const explodedParts = [];
  function registerExploded(mesh, normalOffset, maxDist = 2.0) {
    explodedParts.push({
      mesh,
      origin: mesh.position.clone(),
      direction: normalOffset.clone().normalize(),
      maxDist,
    });
  }

  // -------------------------------------------------------------
  // 1. BENCH STAND & DATUM FIXTURE
  // -------------------------------------------------------------
  const benchGroup = new THREE.Group();
  benchGroup.name = "Body_Lab_Dynamometer_Bench";

  const benchTopMat = new THREE.MeshStandardMaterial({ color: 0x141820, roughness: 0.6, metalness: 0.2 });
  const benchTop = new THREE.Mesh(new THREE.BoxGeometry(26.0, 0.4, 10.0), benchTopMat);
  benchTop.position.set(6.5, -2.2, 0);
  benchTop.receiveShadow = true;
  benchGroup.add(benchTop);

  const splashMat = new THREE.MeshStandardMaterial({ color: 0x1a212b, roughness: 0.7, metalness: 0.1 });
  const splash = new THREE.Mesh(new THREE.BoxGeometry(26.0, 5.0, 0.2), splashMat);
  splash.position.set(6.5, 0.5, 4.9);
  splash.receiveShadow = true;
  benchGroup.add(splash);

  // Duplex AC outlet
  const outletPlate = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.85, 0.04), new THREE.MeshStandardMaterial({ color: 0xd0d5dc, roughness: 0.35, metalness: 0.5 }));
  outletPlate.position.set(16.5, 0.5, 4.78);
  outletPlate.name = "Body_Lab_Outlet_Plate";
  benchGroup.add(outletPlate);

  const outletSocketMat = new THREE.MeshStandardMaterial({ color: 0x111418, roughness: 0.8, metalness: 0.1 });
  for (const dy of [-0.2, 0.2]) {
    const socket = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.03, 16), outletSocketMat);
    socket.rotation.x = Math.PI / 2;
    socket.position.set(16.5, 0.5 + dy, 4.80);
    socket.name = `Body_Lab_Outlet_Socket_${dy < 0 ? "Lower" : "Upper"}`;
    benchGroup.add(socket);
  }

  // Official SREdesigns Badge
  const badge = makeSREdesignsBadge(0.75);
  badge.position.set(6.5, -1.8, -4.8);
  badge.rotation.x = -Math.PI / 6;
  benchGroup.add(badge);

  root.add(benchGroup);

  // -------------------------------------------------------------
  // 2. MAIN SURVIVAL CELL MONOCOQUE TUB (X in [-4.5, 17.5])
  // -------------------------------------------------------------
  const tubGroup = new THREE.Group();
  tubGroup.name = "Body_SurvivalCell_Tub";

  // Monocoque carbon bodywork (Length 22.0 units = 2,200 mm)
  // Front nose tapers down to 4.5 units width, cockpit expands to 6.8 units width
  const tubMain = new THREE.Mesh(new THREE.BoxGeometry(22.0, 4.2, 6.4), mats.carbonGloss);
  tubMain.position.set(6.5, 0.0, 0.0);
  tubMain.castShadow = true;
  tubMain.receiveShadow = true;
  tubGroup.add(tubMain);

  // Zylon (PBO) Ballistic Anti-Intrusion Panels along cockpit flanks
  for (const zSide of [-3.22, 3.22]) {
    const zylonPanel = new THREE.Mesh(new THREE.BoxGeometry(11.5, 3.2, 0.06), mats.zylonBallistic);
    zylonPanel.position.set(7.5, 0.1, zSide);
    zylonPanel.name = `Body_Zylon_AntiIntrusion_Flank_${zSide < 0 ? "RH" : "LH"}`;
    tubGroup.add(zylonPanel);
  }

  // Cockpit upper opening rim cutout cavity
  const cockpitOpening = new THREE.Mesh(new THREE.BoxGeometry(8.5, 2.2, 4.8), mats.carbonMatte);
  cockpitOpening.position.set(8.0, 1.2, 0.0);
  cockpitOpening.name = "Body_Cockpit_Opening_Cavity";
  tubGroup.add(cockpitOpening);

  root.add(tubGroup);
  registerExploded(tubGroup, new THREE.Vector3(0, 0, 0), 0.0);

  // -------------------------------------------------------------
  // 3. FRONT BULKHEAD A-A & INBOARD SUSPENSION HARDPOINTS (X = -4.5)
  // -------------------------------------------------------------
  const frontBulkheadGroup = new THREE.Group();
  frontBulkheadGroup.name = "Body_Bulkhead_Front_Ti";
  frontBulkheadGroup.position.set(-4.5, 0.0, 0.0);

  const frontPlate = new THREE.Mesh(new THREE.BoxGeometry(0.35, 4.0, 5.2), mats.titaniumBell);
  frontPlate.castShadow = true;
  frontBulkheadGroup.add(frontPlate);

  // 4x Front Impact Structure (FIS) nosecone mounting spigots M14
  for (let s = 0; s < 4; s++) {
    const sy = s < 2 ? 1.2 : -1.2;
    const sz = s % 2 === 0 ? 1.8 : -1.8;
    const spigot = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.65, 16), mats.titaniumBright);
    spigot.rotation.z = Math.PI / 2;
    spigot.position.set(-0.35, sy, sz);
    spigot.name = `Fastener_FIS_MountSpigot_Ti_0${s + 1}`;
    frontBulkheadGroup.add(spigot);
  }

  // Inboard Upper Wishbone Clevises (Forward & Rearward)
  for (const zSide of [-2.85, 2.85]) {
    const clevisUpper = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.35, 0.45), mats.titaniumBright);
    clevisUpper.position.set(1.2, 1.8, zSide);
    clevisUpper.name = `Body_Inboard_Wishbone_Clevis_Upper_${zSide < 0 ? "RH" : "LH"}`;
    tubGroup.add(clevisUpper);

    // Inboard Lower Wishbone Clevises (with 14.2° Anti-Dive rake)
    const clevisLower = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.40, 0.50), mats.titaniumBright);
    clevisLower.position.set(1.4, -1.6, zSide * 0.88);
    clevisLower.rotation.z = 0.248; // 14.2 degrees anti-dive rake
    clevisLower.name = `Body_Inboard_Wishbone_Clevis_Lower_${zSide < 0 ? "RH" : "LH"}`;
    tubGroup.add(clevisLower);
  }

  // Steering Rack Cradle in footwell
  const rackCradle = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.65, 3.8), mats.titaniumBell);
  rackCradle.position.set(-0.85, 0.2, 0.0);
  rackCradle.name = "Body_SteeringRack_Cradle";
  frontBulkheadGroup.add(rackCradle);

  root.add(frontBulkheadGroup);
  registerExploded(frontBulkheadGroup, new THREE.Vector3(-1, 0, 0), 1.6);

  // -------------------------------------------------------------
  // 4. TITANIUM HALO HOOP (125 kN PROOF LOAD, 7.0 kg)
  // -------------------------------------------------------------
  const haloGroup = new THREE.Group();
  haloGroup.name = "Body_Safety_Halo_Titanium";
  haloGroup.position.set(7.5, 2.2, 0.0);

  // Forward center pylon (V-pillar)
  const forwardPylon = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.28, 2.6, 24), mats.titaniumHalo);
  forwardPylon.position.set(-2.8, 0.9, 0.0);
  forwardPylon.rotation.z = -Math.PI / 7;
  haloGroup.add(forwardPylon);

  // Curved titanium halo hoop arch
  const hoopCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(2.5, 1.8, -2.4),
    new THREE.Vector3(0.0, 1.8, -2.2),
    new THREE.Vector3(-2.8, 1.8, 0.0),
    new THREE.Vector3(0.0, 1.8, 2.2),
    new THREE.Vector3(2.5, 1.8, 2.4),
  ]);
  const haloGeo = new THREE.TubeGeometry(hoopCurve, 48, 0.20, 16, false);
  const haloTube = new THREE.Mesh(haloGeo, mats.titaniumHalo);
  haloTube.castShadow = true;
  haloGroup.add(haloTube);

  // Carbon Aerodynamic Transition Fairing with micro-vortex vanes
  const fairingGeo = new THREE.TubeGeometry(hoopCurve, 48, 0.24, 16, false);
  const haloFairing = new THREE.Mesh(fairingGeo, mats.carbonGloss);
  haloFairing.name = "Body_Halo_AeroFairing_Carbon";
  haloGroup.add(haloFairing);

  // 4x Structural M14/M12 Titanium Mount Bolts
  for (let m = 0; m < 4; m++) {
    const bolt = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.35, 12), mats.titaniumBright);
    bolt.position.set(m < 2 ? -2.8 : 2.5, 0.2, m % 2 === 0 ? 2.4 : -2.4);
    bolt.name = `Fastener_HaloMount_Ti_0${m + 1}`;
    haloGroup.add(bolt);
  }

  root.add(haloGroup);
  registerExploded(haloGroup, new THREE.Vector3(0, 1, 0), 1.8);

  // -------------------------------------------------------------
  // 5. PRIMARY ROLL HOOP & AIRBOX (172 kN PROOF LOAD, ARTICLE C13)
  // -------------------------------------------------------------
  const rollHoopGroup = new THREE.Group();
  rollHoopGroup.name = "Body_Safety_RollHoop_Airbox";
  rollHoopGroup.position.set(13.8, 2.8, 0.0);

  // Heavy structural monolithic roll arch (R >= 10 mm rounded apex)
  const archMesh = new THREE.Mesh(new THREE.BoxGeometry(2.4, 4.2, 3.4), mats.carbonGloss);
  archMesh.castShadow = true;
  rollHoopGroup.add(archMesh);

  // Twin airbox inlet openings: lower combustion intake, upper hybrid cooling
  const intakeLower = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.75, 1.2, 24), mats.carbonMatte);
  intakeLower.rotation.z = Math.PI / 2;
  intakeLower.position.set(-0.85, 0.5, 0.0);
  intakeLower.name = "Body_Airbox_Splitter_Combustion";
  rollHoopGroup.add(intakeLower);

  const intakeUpper = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 1.2, 24), mats.carbonMatte);
  intakeUpper.rotation.z = Math.PI / 2;
  intakeUpper.position.set(-0.85, 1.6, 0.0);
  intakeUpper.name = "Body_Airbox_Splitter_Cooling";
  rollHoopGroup.add(intakeUpper);

  // High-Voltage 800V Status LED for track marshals
  const ledLens = new THREE.Mesh(new THREE.SphereGeometry(0.08, 16, 16), mats.statusLedGreen);
  ledLens.position.set(-1.15, 2.1, 0.0);
  ledLens.name = "Body_Marshal_HV_Status_LED";
  rollHoopGroup.add(ledLens);

  root.add(rollHoopGroup);
  registerExploded(rollHoopGroup, new THREE.Vector3(0, 1, 0), 2.2);

  // -------------------------------------------------------------
  // 6. SIDE IMPACT PROTECTION SPARS (SIPS CRUSH TUBES, 40 kJ)
  // -------------------------------------------------------------
  for (let sp = 0; sp < 4; sp++) {
    const isLH = sp < 2;
    const isUpper = sp % 2 === 0;
    const sx = isUpper ? 7.2 : 9.5;
    const sy = isUpper ? 0.8 : -0.8;
    const sz = isLH ? 3.6 : -3.6;

    const sipsTube = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.28, 1.6, 16), mats.carbonMatte);
    sipsTube.rotation.x = Math.PI / 2;
    sipsTube.position.set(sx, sy, sz);
    sipsTube.name = `Body_SIPS_CrushTube_0${sp + 1}`;
    tubGroup.add(sipsTube);
  }

  // -------------------------------------------------------------
  // 7. COCKPIT INTERIOR: BEAD SEAT, HEADREST & CONTROLS
  // -------------------------------------------------------------
  const cockpitInteriorGroup = new THREE.Group();
  cockpitInteriorGroup.name = "Body_Cockpit_Interior_Assembly";
  cockpitInteriorGroup.position.set(8.5, 0.2, 0.0);

  // Custom-molded anatomical driver bead seat (30° reclined posture)
  const beadSeat = new THREE.Mesh(new THREE.BoxGeometry(6.5, 1.8, 3.8), mats.carbonMatte);
  beadSeat.rotation.z = -0.52; // 30 degrees reclined
  beadSeat.position.set(1.5, -0.4, 0.0);
  beadSeat.name = "Body_BeadSeat_Shell";
  cockpitInteriorGroup.add(beadSeat);

  // 4x Kevlar 15 kN lifting extraction loops
  for (let k = 0; k < 4; k++) {
    const strap = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.04, 6, 16), mats.kevlarStrap);
    strap.position.set(k < 2 ? 3.8 : -0.8, 0.6, k % 2 === 0 ? 1.8 : -1.8);
    strap.name = `Body_ExtractionStrap_Kevlar_0${k + 1}`;
    cockpitInteriorGroup.add(strap);
  }

  // CONFOR CF-45/42 Viscoelastic Headrest Collar
  const headrest = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.8, 2.6), mats.conforFoam);
  headrest.position.set(4.2, 1.2, 0.0);
  headrest.name = "Body_Headrest_ConforFoam";
  cockpitInteriorGroup.add(headrest);

  // Fore-aft adjustable pedal box sled (0 - 150 mm travel)
  const pedalSled = new THREE.Group();
  pedalSled.name = "Body_PedalBox_Sled";
  pedalSled.position.set(-3.2, -1.2, 0.0);

  const sledRails = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.25, 3.2), mats.pedalAlloy);
  pedalSled.add(sledRails);

  // Brake Pedal (180 kgf load cell lever)
  const brakePedal = new THREE.Group();
  brakePedal.name = "Pivot_Pedal_Brake";
  brakePedal.position.set(0.0, 0.4, -0.6);

  const brakeArm = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.2, 0.18), mats.pedalAlloy);
  brakeArm.rotation.z = -0.2;
  brakePedal.add(brakeArm);

  const brakeFootPad = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.45, 0.38), mats.titaniumBright);
  brakeFootPad.position.set(-0.15, 0.55, 0);
  brakePedal.add(brakeFootPad);
  pedalSled.add(brakePedal);

  // Throttle Pedal
  const throttlePedal = new THREE.Group();
  throttlePedal.name = "Pivot_Pedal_Throttle";
  throttlePedal.position.set(0.0, 0.4, 0.6);

  const throttleArm = new THREE.Mesh(new THREE.BoxGeometry(0.10, 1.1, 0.16), mats.pedalAlloy);
  throttleArm.rotation.z = -0.2;
  throttlePedal.add(throttleArm);

  const throttlePad = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.55, 0.25), mats.titaniumBright);
  throttlePad.position.set(-0.15, 0.50, 0);
  throttlePedal.add(throttlePad);
  pedalSled.add(throttlePedal);

  cockpitInteriorGroup.add(pedalSled);

  // McLaren Applied PCU-8D Cockpit LCD Display
  const lcdCanvas = document.createElement("canvas");
  lcdCanvas.width = 1024;
  lcdCanvas.height = 512;
  const lcdCtx = lcdCanvas.getContext("2d");
  lcdCtx.fillStyle = "#0a1018";
  lcdCtx.fillRect(0, 0, 1024, 512);

  lcdCtx.fillStyle = "#00d4e8";
  lcdCtx.font = "bold 80px monospace";
  lcdCtx.fillText("PCU-8D · F1 2026", 80, 120);

  lcdCtx.fillStyle = "#3dd68c";
  lcdCtx.font = "60px monospace";
  lcdCtx.fillText("CHASSIS RIGIDITY: 44.5 kNm/deg", 80, 240);
  lcdCtx.fillText("ROLL HOOP LOAD: 172 kN OK", 80, 340);
  lcdCtx.fillText("TI HALO PROOF: 125 kN OK", 80, 440);

  const lcdTex = new THREE.CanvasTexture(lcdCanvas);
  lcdTex.flipY = false;
  lcdTex.anisotropy = 4;

  const lcdPlane = new THREE.PlaneGeometry(1.6, 0.8);
  const luv = lcdPlane.attributes.uv;
  for (let i = 0; i < luv.count; i++) {
    luv.setY(i, 1.0 - luv.getY(i));
  }
  luv.needsUpdate = true;

  const lcdMat = new THREE.MeshBasicMaterial({ map: lcdTex, side: THREE.DoubleSide });
  const lcdMesh = new THREE.Mesh(lcdPlane, lcdMat);
  lcdMesh.position.set(-1.2, 1.0, 0.0);
  lcdMesh.rotation.y = Math.PI / 2;
  lcdMesh.rotation.z = -0.35;
  lcdMesh.name = "UI_LCD_Cockpit";
  cockpitInteriorGroup.add(lcdMesh);

  root.add(cockpitInteriorGroup);
  registerExploded(cockpitInteriorGroup, new THREE.Vector3(0, 1, 0), 1.5);

  // -------------------------------------------------------------
  // 8. REAR BULKHEAD B-B & ICE MOUNTING INTERFACE (X = 17.5)
  // -------------------------------------------------------------
  const rearBulkheadGroup = new THREE.Group();
  rearBulkheadGroup.name = "Body_Bulkhead_Rear_Ti";
  rearBulkheadGroup.position.set(17.5, 0.0, 0.0);

  const rearPlate = new THREE.Mesh(new THREE.BoxGeometry(0.40, 4.4, 6.6), mats.titaniumBell);
  rearPlate.castShadow = true;
  rearBulkheadGroup.add(rearPlate);

  // 6x High-Tensile M12 Titanium Engine Mounting Studs
  for (let e = 0; e < 6; e++) {
    const ey = (e % 3 - 1) * 1.4;
    const ez = e < 3 ? -2.4 : 2.4;
    const stud = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.55, 16), mats.titaniumBright);
    stud.rotation.z = Math.PI / 2;
    stud.position.set(0.35, ey, ez);
    stud.name = `Fastener_EngineStud_M12_0${e + 1}`;
    rearBulkheadGroup.add(stud);
  }

  root.add(rearBulkheadGroup);
  registerExploded(rearBulkheadGroup, new THREE.Vector3(1, 0, 0), 1.6);

  scene.add(root);

  return {
    root,
    tubGroup,
    frontBulkheadGroup,
    haloGroup,
    rollHoopGroup,
    cockpitInteriorGroup,
    rearBulkheadGroup,
    pedalSled,
    brakePedal,
    throttlePedal,
    ledLens,
    explodedParts,
    mats,
  };
}
