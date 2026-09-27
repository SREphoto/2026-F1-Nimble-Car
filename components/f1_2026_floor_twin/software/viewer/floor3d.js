/**
 * floor3d.js — High-Fidelity Piecewise Procedural 3D CAD Assembly
 * 2026 Formula 1 Floor, Underbody Venturi Channels, Plank & Diffuser
 *
 * Semantic Taxonomy (strictly adheres to VALID_PREFIXES):
 * - Body_Floor_Assembly
 * - Body_Floor_Deck_Carbon (1,450 mm width partially flat underfloor deck)
 * - Body_SkidBlock_Jabroc (10.0 mm central beechwood plank with inspection holes)
 * - Fastener_SkidPuck_Ti_01..04 (4x flush titanium skid pucks)
 * - Body_FloorFence_LH_01..05 & Body_FloorFence_RH_01..05 (10x underfloor vortex strakes)
 * - Body_FloorWinglet_Edge_LH & Body_FloorWinglet_Edge_RH (Longitudinal sealing winglets)
 * - Body_Diffuser_Ramp (10.5° rear expansion ramp, 1,000 mm exit width)
 * - Body_Diffuser_Divider_LH & Body_Diffuser_Divider_RH (Vertical diffuser fences)
 * - Body_TyreSquirt_Cutout_LH & Body_TyreSquirt_Cutout_RH (Mousehole pressure baffles)
 * - Fastener_FloorMount_Stud_01..16 (Chassis perimeter M8 titanium studs)
 * - Badge_SREdesigns (Official engineering serial plaque)
 */

import * as THREE from "three";

export function createFloorMaterials() {
  return {
    carbonGloss: new THREE.MeshStandardMaterial({
      color: 0x14171a,
      roughness: 0.20,
      metalness: 0.40,
    }),
    carbonMatte: new THREE.MeshStandardMaterial({
      color: 0x0f1114,
      roughness: 0.75,
      metalness: 0.15,
    }),
    jabrocPlank: new THREE.MeshStandardMaterial({
      color: 0x7c4f2e, // Natural densified beechwood brown
      roughness: 0.65,
      metalness: 0.05,
    }),
    titaniumBright: new THREE.MeshStandardMaterial({
      color: 0xb5bec8,
      roughness: 0.25,
      metalness: 0.95,
    }),
    titaniumSkidPuck: new THREE.MeshStandardMaterial({
      color: 0xd0d8e2,
      roughness: 0.18,
      metalness: 0.98,
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
  ctx.fillText("F1 2026 UNDERBODY FLOOR & DIFFUSER SPEC", tx, ch * 0.72);

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

// Master Floor Assembly Builder
export function buildFloorAssembly(scene, mats) {
  const root = new THREE.Group();
  root.name = "Body_Floor_Assembly";

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
  // 1. PARTIALLY FLAT MAIN FLOOR DECK (1,450 mm Width)
  // -------------------------------------------------------------
  const floorDeckGroup = new THREE.Group();
  floorDeckGroup.name = "Body_Floor_Deck_Carbon";

  // Main flat carbon floor: X in [-4.5, +27.0], width Z in [-7.25, +7.25], thickness 0.15 (15 mm)
  const deckLength = 31.5;
  const deckWidth = 14.5;
  const deckGeo = new THREE.BoxGeometry(deckLength, 0.15, deckWidth);
  const deckMesh = new THREE.Mesh(deckGeo, mats.carbonGloss);
  deckMesh.position.set(11.25, 0.35, 0); // Center at X = 11.25
  deckMesh.castShadow = true;
  deckMesh.receiveShadow = true;
  floorDeckGroup.add(deckMesh);

  // Front splitter leading edge keel
  const keelGeo = new THREE.ConeGeometry(0.8, 4.5, 16);
  const keelMesh = new THREE.Mesh(keelGeo, mats.carbonMatte);
  keelMesh.rotation.z = -Math.PI / 2;
  keelMesh.scale.set(0.6, 1.0, 1.8);
  keelMesh.position.set(-2.25, 0.40, 0);
  floorDeckGroup.add(keelMesh);

  root.add(floorDeckGroup);
  registerExploded(floorDeckGroup, new THREE.Vector3(0, -1, 0), 1.2);

  // -------------------------------------------------------------
  // 2. CENTRAL JABROC SKID BLOCK & TITANIUM SKID PUCKS
  // -------------------------------------------------------------
  const skidGroup = new THREE.Group();
  skidGroup.name = "Body_SkidBlock_Jabroc";

  // Beechwood plank: X in [0, 28.0], width Z in [-1.5, +1.5] (300 mm), thickness 0.10 (10 mm)
  const plankLength = 28.0;
  const plankWidth = 3.0;
  const plankGeo = new THREE.BoxGeometry(plankLength, 0.10, plankWidth);
  const plankMesh = new THREE.Mesh(plankGeo, mats.jabrocPlank);
  plankMesh.position.set(14.0, 0.15, 0); // At datum Y = 0.15
  plankMesh.castShadow = true;
  skidGroup.add(plankMesh);

  // 3x FIA 34mm Inspection Holes
  const holeGeo = new THREE.CylinderGeometry(0.17, 0.17, 0.14, 24);
  const holeXCoords = [3.5, 14.0, 24.5];
  holeXCoords.forEach((hx, idx) => {
    const holeRing = new THREE.Mesh(holeGeo, mats.carbonMatte);
    holeRing.position.set(hx, 0.15, 0);
    holeRing.name = `Body_FIA_InspectionHole_0${idx + 1}`;
    skidGroup.add(holeRing);
  });

  // 4x Flush-Mounted Grade 5 Titanium Skid Pucks
  const puckGeo = new THREE.BoxGeometry(1.2, 0.11, 0.85);
  const puckXCoords = [1.2, 8.5, 17.5, 26.5];
  puckXCoords.forEach((px, idx) => {
    const puck = new THREE.Mesh(puckGeo, mats.titaniumSkidPuck);
    puck.position.set(px, 0.145, 0);
    puck.name = `Fastener_SkidPuck_Ti_0${idx + 1}`;
    skidGroup.add(puck);
  });

  root.add(skidGroup);
  registerExploded(skidGroup, new THREE.Vector3(0, -1, 0), 2.2);

  // -------------------------------------------------------------
  // 3. UNDERFLOOR AERODYNAMIC FENCES / STRAKES (5 LH + 5 RH)
  // -------------------------------------------------------------
  const fencesGroup = new THREE.Group();
  fencesGroup.name = "Body_FloorFences_Assembly";

  const fenceOffsetsZ = [1.8, 3.1, 4.4, 5.7, 7.0]; // 5 strakes per side
  fenceOffsetsZ.forEach((fz, idx) => {
    // LH Fence
    const fenceLHCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-4.2, 0.40, fz * 0.45),
      new THREE.Vector3(-2.0, 1.20, fz * 0.75),
      new THREE.Vector3(0.0, 0.35, fz),
    ]);
    const fenceLHGeo = new THREE.TubeGeometry(fenceLHCurve, 24, 0.08, 8, false);
    const fenceLH = new THREE.Mesh(fenceLHGeo, mats.carbonGloss);
    fenceLH.scale.set(1.0, 2.2, 0.35); // Height ~200 mm
    fenceLH.name = `Body_FloorFence_LH_0${idx + 1}`;
    fencesGroup.add(fenceLH);

    // RH Fence (Symmetrical)
    const fenceRHCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-4.2, 0.40, -fz * 0.45),
      new THREE.Vector3(-2.0, 1.20, -fz * 0.75),
      new THREE.Vector3(0.0, 0.35, -fz),
    ]);
    const fenceRHGeo = new THREE.TubeGeometry(fenceRHCurve, 24, 0.08, 8, false);
    const fenceRH = new THREE.Mesh(fenceRHGeo, mats.carbonGloss);
    fenceRH.scale.set(1.0, 2.2, 0.35);
    fenceRH.name = `Body_FloorFence_RH_0${idx + 1}`;
    fencesGroup.add(fenceRH);
  });

  root.add(fencesGroup);
  registerExploded(fencesGroup, new THREE.Vector3(0, 0.8, 0), 1.5);

  // -------------------------------------------------------------
  // 4. LONGITUDINAL FLOOR EDGE SEALING WINGLETS (LH & RH)
  // -------------------------------------------------------------
  const edgeWingletGeo = new THREE.BoxGeometry(26.0, 0.08, 0.35);

  const edgeLH = new THREE.Mesh(edgeWingletGeo, mats.carbonMatte);
  edgeLH.position.set(13.0, 0.55, 7.25);
  edgeLH.name = "Body_FloorWinglet_Edge_LH";
  root.add(edgeLH);

  const edgeRH = new THREE.Mesh(edgeWingletGeo, mats.carbonMatte);
  edgeRH.position.set(13.0, 0.55, -7.25);
  edgeRH.name = "Body_FloorWinglet_Edge_RH";
  root.add(edgeRH);

  registerExploded(edgeLH, new THREE.Vector3(0, 0, 1), 1.6);
  registerExploded(edgeRH, new THREE.Vector3(0, 0, -1), 1.6);

  // -------------------------------------------------------------
  // 5. REAR DIFFUSER EXPANSION RAMP & DIVIDERS
  // -------------------------------------------------------------
  const diffuserGroup = new THREE.Group();
  diffuserGroup.name = "Body_Diffuser_Assembly";

  // Diffuser ramp: X in [27.0, 38.0], expands upward from Y=0.35 to Y=2.0 (10.5° angle), width Z in [-5.0, +5.0]
  const rampLength = 11.0;
  const rampWidth = 10.0;
  const rampGeo = new THREE.BoxGeometry(rampLength, 0.12, rampWidth);
  const rampMesh = new THREE.Mesh(rampGeo, mats.carbonGloss);
  rampMesh.rotation.z = 0.18; // 10.5° expansion
  rampMesh.position.set(32.5, 1.15, 0);
  rampMesh.castShadow = true;
  diffuserGroup.add(rampMesh);

  // Vertical Diffuser Separation Strakes (LH & RH)
  const dividerGeo = new THREE.BoxGeometry(9.5, 1.6, 0.06);
  for (const dz of [-2.2, 2.2]) {
    const divider = new THREE.Mesh(dividerGeo, mats.carbonMatte);
    divider.rotation.z = 0.18;
    divider.position.set(32.5, 1.15, dz);
    divider.name = `Body_Diffuser_Divider_${dz > 0 ? "LH" : "RH"}`;
    diffuserGroup.add(divider);
  }

  // Central Keel Diffuser Backbone
  const centralKeel = new THREE.Mesh(new THREE.BoxGeometry(9.8, 1.8, 0.12), mats.carbonGloss);
  centralKeel.rotation.z = 0.18;
  centralKeel.position.set(32.5, 1.15, 0.0);
  centralKeel.name = "Body_Diffuser_CentralKeel";
  diffuserGroup.add(centralKeel);

  root.add(diffuserGroup);
  registerExploded(diffuserGroup, new THREE.Vector3(1, 0.8, 0), 2.0);

  // -------------------------------------------------------------
  // 6. REAR TYRE SQUIRT MOUSEHOLE NOTCHES & BAFFLES
  // -------------------------------------------------------------
  const squirtGeo = new THREE.BoxGeometry(3.0, 0.45, 0.25);
  const squirtLH = new THREE.Mesh(squirtGeo, mats.carbonMatte);
  squirtLH.position.set(28.5, 0.60, 7.15);
  squirtLH.name = "Body_TyreSquirt_Cutout_LH";
  root.add(squirtLH);

  const squirtRH = new THREE.Mesh(squirtGeo, mats.carbonMatte);
  squirtRH.position.set(28.5, 0.60, -7.15);
  squirtRH.name = "Body_TyreSquirt_Cutout_RH";
  root.add(squirtRH);

  // -------------------------------------------------------------
  // 7. PERIMETER CHASSIS MOUNTING STUDS (16x M8 TITANIUM)
  // -------------------------------------------------------------
  const studGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.35, 12);
  for (let i = 0; i < 8; i++) {
    const sx = 2.0 + i * 3.5;
    for (const sz of [-3.2, 3.2]) {
      const stud = new THREE.Mesh(studGeo, mats.titaniumBright);
      stud.position.set(sx, 0.50, sz);
      stud.name = `Fastener_FloorMount_Stud_${i + 1}_${sz > 0 ? "LH" : "RH"}`;
      root.add(stud);
    }
  }

  // Official SREdesigns Serial Plaque
  const badge = makeSREdesignsBadge(0.35);
  badge.rotation.x = -Math.PI / 2;
  badge.position.set(12.0, 0.44, 0.0);
  root.add(badge);

  scene.add(root);

  return {
    root,
    floorDeckGroup,
    skidGroup,
    fencesGroup,
    diffuserGroup,
    edgeLH,
    edgeRH,
    squirtLH,
    squirtRH,
    explodedParts,
    mats,
  };
}
