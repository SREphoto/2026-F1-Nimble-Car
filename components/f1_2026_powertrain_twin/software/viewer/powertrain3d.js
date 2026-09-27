/**
 * powertrain3d.js — High-Fidelity Piecewise Procedural 3D CAD Assembly
 * 2026 Formula 1 Powertrain, 350 kW MGU-K & High-Voltage Energy Store
 *
 * Semantic Taxonomy (strictly adheres to VALID_PREFIXES):
 * - Body_Powertrain_Assembly
 * - Body_ICE_EngineBlock_AlLi (1.6L 90° V6 crankcase with Nikasil liners)
 * - Body_ICE_CylinderHead_LH & Body_ICE_CylinderHead_RH (DOHC valvetrain heads)
 * - Body_ICE_IntakePlenum_Carbon (Fixed-geometry induction plenum & 6 runners)
 * - Body_Turbocharger_Single (Single-stage turbocharger with Inconel turbine)
 * - Body_Wastegate_Electronic_01..02 (Twin electronic wastegates)
 * - Body_Exhaust_Tailpipe_Inconel (130 mm single central exhaust tailpipe)
 * - Body_MGUK_Motor_350kW (350 kW kinetic motor-generator, 60,000 rpm)
 * - Body_Inverter_PEU_SiC (Dual 3-phase Silicon Carbide power electronics)
 * - Body_EnergyStore_BatteryPack (800V-900V immersion cooled battery tub)
 * - Fastener_EngineMount_M12_01..06 (6x front chassis mounting studs)
 * - Fastener_GearboxMount_M12_01..04 (4x aft transmission mounting studs)
 * - Badge_SREdesigns (Official PU engineering serial plaque)
 */

import * as THREE from "three";

export function createPowertrainMaterials() {
  return {
    engineBlockAlLi: new THREE.MeshStandardMaterial({
      color: 0x4a5058, // Cast Al-Li grey
      roughness: 0.42,
      metalness: 0.85,
    }),
    cylinderHeadCNC: new THREE.MeshStandardMaterial({
      color: 0x7c8590, // Machined billet aluminum
      roughness: 0.28,
      metalness: 0.92,
    }),
    carbonPlenum: new THREE.MeshStandardMaterial({
      color: 0x14171a,
      roughness: 0.22,
      metalness: 0.40,
    }),
    inconelExhaust: new THREE.MeshStandardMaterial({
      color: 0x8c7853, // Heat-tempered golden-bronze Inconel 625
      roughness: 0.35,
      metalness: 0.90,
    }),
    turboTitanium: new THREE.MeshStandardMaterial({
      color: 0x6e7582,
      roughness: 0.30,
      metalness: 0.95,
    }),
    mgukHousing: new THREE.MeshStandardMaterial({
      color: 0x222830,
      roughness: 0.38,
      metalness: 0.82,
    }),
    inverterGold: new THREE.MeshStandardMaterial({
      color: 0xc89632, // Anodized gold power electronics
      roughness: 0.32,
      metalness: 0.85,
    }),
    hvOrangeCable: new THREE.MeshStandardMaterial({
      color: 0xff6600, // High-voltage orange insulation
      roughness: 0.65,
      metalness: 0.10,
    }),
    batteryTitaniumArmored: new THREE.MeshStandardMaterial({
      color: 0x28303a,
      roughness: 0.48,
      metalness: 0.70,
    }),
    titaniumBright: new THREE.MeshStandardMaterial({
      color: 0xb5bec8,
      roughness: 0.22,
      metalness: 0.96,
    }),
  };
}

// Official SREdesigns Engineering Plaque
export function makeSREdesignsBadge(scale = 0.35) {
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
  ctx.fillText("F1 2026 50/50 HYBRID POWER UNIT · PU-01 SPEC", tx, ch * 0.72);

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

// Master Powertrain Assembly Builder
export function buildPowertrainAssembly(scene, mats) {
  const root = new THREE.Group();
  root.name = "Body_Powertrain_Assembly";

  const explodedParts = [];
  function registerExploded(mesh, direction, maxDist) {
    explodedParts.push({
      mesh,
      origin: mesh.position.clone(),
      direction: direction.clone().normalize(),
      maxDist,
    });
  }

  // -------------------------------------------------------------
  // 1. 1.6L 90° V6 ENGINE CRANKCASE BLOCK
  // -------------------------------------------------------------
  const blockGroup = new THREE.Group();
  blockGroup.name = "Body_ICE_EngineBlock_AlLi";

  // Crankcase main lower body: length 5.5, height 2.4, width 3.8
  const blockGeo = new THREE.BoxGeometry(5.5, 2.4, 3.8);
  const blockMesh = new THREE.Mesh(blockGeo, mats.engineBlockAlLi);
  blockMesh.position.set(2.75, 1.8, 0); // Crankshaft axis at Y=0.9
  blockMesh.castShadow = true;
  blockGroup.add(blockMesh);

  // Sump pan underneath
  const sumpGeo = new THREE.BoxGeometry(5.2, 0.45, 2.8);
  const sump = new THREE.Mesh(sumpGeo, mats.engineBlockAlLi);
  sump.position.set(2.75, 0.45, 0);
  blockGroup.add(sump);

  // 6x M12 Titanium Mounting Studs (Forward Bulkhead Interface at X = 0)
  const studGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.55, 16);
  const frontStudCoords = [
    [-1.2, 1.2], [1.2, 1.2],
    [-1.5, 2.6], [1.5, 2.6],
    [-0.8, 3.6], [0.8, 3.6]
  ];
  frontStudCoords.forEach(([sz, sy], idx) => {
    const stud = new THREE.Mesh(studGeo, mats.titaniumBright);
    stud.rotation.z = Math.PI / 2;
    stud.position.set(-0.25, sy, sz);
    stud.name = `Fastener_EngineMount_M12_0${idx + 1}`;
    blockGroup.add(stud);
  });

  // 4x M12 Aft Studs for Gearbox Casing (X = 5.5)
  const rearStudCoords = [
    [-1.1, 1.4], [1.1, 1.4],
    [-1.1, 2.8], [1.1, 2.8]
  ];
  rearStudCoords.forEach(([sz, sy], idx) => {
    const stud = new THREE.Mesh(studGeo, mats.titaniumBright);
    stud.rotation.z = Math.PI / 2;
    stud.position.set(5.75, sy, sz);
    stud.name = `Fastener_GearboxMount_M12_0${idx + 1}`;
    blockGroup.add(stud);
  });

  root.add(blockGroup);
  registerExploded(blockGroup, new THREE.Vector3(0, 0, 0), 0.0);

  // -------------------------------------------------------------
  // 2. DUAL DOHC CYLINDER HEADS (90° V-ANGLE)
  // -------------------------------------------------------------
  const headGeo = new THREE.BoxGeometry(4.8, 1.2, 1.5);

  // Left Cylinder Head (Angled 45° outward)
  const headLHGroup = new THREE.Group();
  headLHGroup.name = "Body_ICE_CylinderHead_LH";
  const headLH = new THREE.Mesh(headGeo, mats.cylinderHeadCNC);
  headLH.rotation.x = -Math.PI / 4; // 45° bank angle
  headLH.position.set(2.8, 3.4, 1.5);
  headLH.castShadow = true;
  headLHGroup.add(headLH);
  root.add(headLHGroup);
  registerExploded(headLHGroup, new THREE.Vector3(0, 1, 1), 1.5);

  // Right Cylinder Head
  const headRHGroup = new THREE.Group();
  headRHGroup.name = "Body_ICE_CylinderHead_RH";
  const headRH = new THREE.Mesh(headGeo, mats.cylinderHeadCNC);
  headRH.rotation.x = Math.PI / 4; // 45° bank angle
  headRH.position.set(2.8, 3.4, -1.5);
  headRH.castShadow = true;
  headRHGroup.add(headRH);
  root.add(headRHGroup);
  registerExploded(headRHGroup, new THREE.Vector3(0, 1, -1), 1.5);

  // -------------------------------------------------------------
  // 3. FIXED CARBON INDUCTION PLENUM & 6 RUNNERS
  // -------------------------------------------------------------
  const plenumGroup = new THREE.Group();
  plenumGroup.name = "Body_ICE_IntakePlenum_Carbon";

  // Main central carbon chamber (tuned to 10,800 rpm)
  const plenumMainGeo = new THREE.CylinderGeometry(0.85, 0.85, 4.4, 24);
  const plenumMain = new THREE.Mesh(plenumMainGeo, mats.carbonPlenum);
  plenumMain.rotation.z = Math.PI / 2;
  plenumMain.position.set(2.8, 4.8, 0);
  plenumMain.castShadow = true;
  plenumGroup.add(plenumMain);

  // 6 Curved Inlet Runners into Heads
  for (let i = 0; i < 3; i++) {
    const rx = 1.6 + i * 1.2;
    // LH Runner
    const runnerLHCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(rx, 4.8, 0.3),
      new THREE.Vector3(rx, 4.2, 1.1),
      new THREE.Vector3(rx, 3.5, 1.4),
    ]);
    const runnerLHGeo = new THREE.TubeGeometry(runnerLHCurve, 16, 0.16, 12, false);
    const runnerLH = new THREE.Mesh(runnerLHGeo, mats.carbonPlenum);
    plenumGroup.add(runnerLH);

    // RH Runner
    const runnerRHCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(rx, 4.8, -0.3),
      new THREE.Vector3(rx, 4.2, -1.1),
      new THREE.Vector3(rx, 3.5, -1.4),
    ]);
    const runnerRHGeo = new THREE.TubeGeometry(runnerRHCurve, 16, 0.16, 12, false);
    const runnerRH = new THREE.Mesh(runnerRHGeo, mats.carbonPlenum);
    plenumGroup.add(runnerRH);
  }

  // Official SREdesigns Serial Plaque on Plenum Deck
  const badge = makeSREdesignsBadge(0.35);
  badge.position.set(2.8, 5.7, 0.0);
  plenumGroup.add(badge);

  root.add(plenumGroup);
  registerExploded(plenumGroup, new THREE.Vector3(0, 1, 0), 2.2);

  // -------------------------------------------------------------
  // 4. TURBOCHARGER, WASTEGATES & 130 mm INCONEL EXHAUST
  // -------------------------------------------------------------
  const turboGroup = new THREE.Group();
  turboGroup.name = "Body_Turbocharger_Single";

  // Compressor housing
  const compMesh = new THREE.Mesh(new THREE.TorusGeometry(0.65, 0.28, 16, 32), mats.turboTitanium);
  compMesh.position.set(5.8, 3.8, 0);
  turboGroup.add(compMesh);

  // Turbine casing
  const turbineMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.75, 24), mats.inconelExhaust);
  turbineMesh.rotation.z = Math.PI / 2;
  turbineMesh.position.set(6.6, 3.8, 0);
  turboGroup.add(turbineMesh);

  // Twin Electronic Wastegates
  for (const wz of [-0.95, 0.95]) {
    const wg = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.85, 16), mats.inconelExhaust);
    wg.position.set(6.2, 4.6, wz);
    wg.name = `Body_Wastegate_Electronic_${wz > 0 ? "LH" : "RH"}`;
    turboGroup.add(wg);
  }

  // Hydroformed Inconel 625 Central Tailpipe (130 mm dia, extending aft)
  const pipeCurve = new THREE.LineCurve3(
    new THREE.Vector3(6.9, 3.8, 0),
    new THREE.Vector3(12.5, 4.0, 0) // $1.5^\circ$ upward rake
  );
  const pipeGeo = new THREE.TubeGeometry(pipeCurve, 24, 0.32, 24, false); // 130mm outer diameter
  const tailpipe = new THREE.Mesh(pipeGeo, mats.inconelExhaust);
  tailpipe.name = "Body_Exhaust_Tailpipe_Inconel";
  tailpipe.castShadow = true;
  turboGroup.add(tailpipe);

  root.add(turboGroup);
  registerExploded(turboGroup, new THREE.Vector3(1, 0.4, 0), 2.0);

  // -------------------------------------------------------------
  // 5. 350 kW MGU-K KINETIC MOTOR-GENERATOR
  // -------------------------------------------------------------
  const mgukGroup = new THREE.Group();
  mgukGroup.name = "Body_MGUK_Motor_350kW";

  // SmCo Rotor / WEG Stator cylindrical casing
  const mgukGeo = new THREE.CylinderGeometry(0.68, 0.68, 2.8, 24);
  const mgukMesh = new THREE.Mesh(mgukGeo, mats.mgukHousing);
  mgukMesh.rotation.z = Math.PI / 2;
  mgukMesh.position.set(2.2, 1.4, 1.6);
  mgukMesh.castShadow = true;
  mgukGroup.add(mgukMesh);

  // Drive pinion gear forward (geared to crank)
  const gearMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.35, 20), mats.titaniumBright);
  gearMesh.rotation.z = Math.PI / 2;
  gearMesh.position.set(0.6, 1.4, 1.6);
  mgukGroup.add(gearMesh);

  root.add(mgukGroup);
  registerExploded(mgukGroup, new THREE.Vector3(0, -0.8, 1), 1.6);

  // -------------------------------------------------------------
  // 6. DUAL 3-PHASE SILICON CARBIDE (SiC) INVERTER (PEU)
  // -------------------------------------------------------------
  const inverterGroup = new THREE.Group();
  inverterGroup.name = "Body_Inverter_PEU_SiC";

  const invGeo = new THREE.BoxGeometry(2.8, 1.6, 1.4);
  const invMesh = new THREE.Mesh(invGeo, mats.inverterGold);
  invMesh.position.set(2.2, 2.6, -1.8);
  invMesh.castShadow = true;
  inverterGroup.add(invMesh);

  // High-Voltage Orange Busbar Cables
  const cableCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.8, 2.6, -1.8),
    new THREE.Vector3(0.0, 2.0, -1.2),
    new THREE.Vector3(-1.5, 0.8, -0.6),
  ]);
  const cableGeo = new THREE.TubeGeometry(cableCurve, 16, 0.08, 12, false);
  const cableMesh = new THREE.Mesh(cableGeo, mats.hvOrangeCable);
  cableMesh.name = "Body_HVCable_Orange_Inverter";
  inverterGroup.add(cableMesh);

  root.add(inverterGroup);
  registerExploded(inverterGroup, new THREE.Vector3(0, 0.8, -1), 1.6);

  // -------------------------------------------------------------
  // 7. HIGH-VOLTAGE ENERGY STORE (BATTERY PACK)
  // -------------------------------------------------------------
  // Housed in lower survival cell tub cavity (represented forward)
  const batteryGroup = new THREE.Group();
  batteryGroup.name = "Body_EnergyStore_BatteryPack";

  const battGeo = new THREE.BoxGeometry(4.8, 1.4, 3.4);
  const battMesh = new THREE.Mesh(battGeo, mats.batteryTitaniumArmored);
  battMesh.position.set(-3.2, 0.9, 0); // Packaged in chassis tub forward of engine
  battMesh.castShadow = true;
  batteryGroup.add(battMesh);

  // Dielectric Immersion Coolant Port Flanges
  for (const bz of [-1.2, 1.2]) {
    const flange = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.25, 16), mats.titaniumBright);
    flange.position.set(-0.8, 1.6, bz);
    batteryGroup.add(flange);
  }

  root.add(batteryGroup);
  registerExploded(batteryGroup, new THREE.Vector3(-1, 0, 0), 1.8);

  scene.add(root);

  return {
    root,
    blockGroup,
    headLHGroup,
    headRHGroup,
    plenumGroup,
    turboGroup,
    mgukGroup,
    inverterGroup,
    batteryGroup,
    explodedParts,
    mats,
  };
}
