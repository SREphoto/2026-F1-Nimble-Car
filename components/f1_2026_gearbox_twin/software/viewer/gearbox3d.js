/**
 * gearbox3d.js — High-Fidelity Piecewise Procedural 3D CAD Assembly
 * 2026 Formula 1 8-Speed Seamless Gearbox, Active LSD, Rear Suspension & Rear Impact Structure (RIS)
 *
 * Semantic Taxonomy (strictly adheres to VALID_PREFIXES):
 * - Body_Gearbox_Casing_TiCFRP
 * - Body_Transmission_Layshaft
 * - Body_Differential_LSD_ElectroHyd
 * - Body_Clutch_CarbonPull
 * - Body_Driveshaft_Hollow_LH & Body_Driveshaft_Hollow_RH
 * - Body_RearWishbone_Upper_LH & Body_RearWishbone_Upper_RH
 * - Body_RearWishbone_Lower_LH & Body_RearWishbone_Lower_RH
 * - Body_RearPushrod_Strut_LH & Body_RearPushrod_Strut_RH
 * - Body_RearRocker_Bellcrank_LH & Body_RearRocker_Bellcrank_RH
 * - Body_RearDamper_ThroughRod_LH & Body_RearDamper_ThroughRod_RH
 * - Body_RearHeave_ThirdElement
 * - Body_RearBrake_Disc_LH & Body_RearBrake_Disc_RH
 * - Body_RearBrake_Caliper_LH & Body_RearBrake_Caliper_RH
 * - Body_RearImpactStructure_Cone
 * - Body_RainLight_FIA_LED
 * - Fastener_EngineToGearbox_M12_01..04
 * - Fastener_SuspensionPivot_M10_01..08
 * - Fastener_RIS_Mount_M10_01..04
 * - Badge_SREdesigns
 */

import * as THREE from "three";

export function createGearboxMaterials() {
  return {
    casingCFRP: new THREE.MeshStandardMaterial({
      color: 0x1b2028,
      roughness: 0.35,
      metalness: 0.65,
    }),
    bellhousingTi: new THREE.MeshStandardMaterial({
      color: 0x6e7682,
      roughness: 0.30,
      metalness: 0.90,
    }),
    steelGears: new THREE.MeshStandardMaterial({
      color: 0x8a929e,
      roughness: 0.22,
      metalness: 0.95,
    }),
    carbonAero: new THREE.MeshStandardMaterial({
      color: 0x14171c,
      roughness: 0.18,
      metalness: 0.40,
    }),
    diffHousing: new THREE.MeshStandardMaterial({
      color: 0x2e3540,
      roughness: 0.28,
      metalness: 0.88,
    }),
    driveshaftSteel: new THREE.MeshStandardMaterial({
      color: 0x48505c,
      roughness: 0.25,
      metalness: 0.92,
    }),
    titaniumBright: new THREE.MeshStandardMaterial({
      color: 0x9fa8b5,
      roughness: 0.25,
      metalness: 0.95,
    }),
    billetAluminum: new THREE.MeshStandardMaterial({
      color: 0xb5bcc6,
      roughness: 0.24,
      metalness: 0.90,
    }),
    damperGold: new THREE.MeshStandardMaterial({
      color: 0xc8982a,
      roughness: 0.28,
      metalness: 0.85,
    }),
    carbonBrakeDisc: new THREE.MeshStandardMaterial({
      color: 0x222428,
      roughness: 0.82,
      metalness: 0.10,
    }),
    caliperAlLi: new THREE.MeshStandardMaterial({
      color: 0x5a4838, // Hard-anodized Al-Li bronze
      roughness: 0.35,
      metalness: 0.85,
    }),
    risConeCarbon: new THREE.MeshStandardMaterial({
      color: 0x101316,
      roughness: 0.25,
      metalness: 0.30,
    }),
    rainLightGlow: new THREE.MeshStandardMaterial({
      color: 0xff1020,
      emissive: 0xff0015,
      emissiveIntensity: 2.5,
      roughness: 0.2,
    }),
  };
}

export function makeSREdesignsBadge(scale = 0.35) {
  const g = new THREE.Group();
  g.name = "Badge_SREdesigns";

  const plateW = 2.4 * scale;
  const plateH = 0.7 * scale;
  const plateD = 0.05 * scale;

  const baseGeo = new THREE.BoxGeometry(plateW, plateH, plateD);
  const baseMat = new THREE.MeshStandardMaterial({
    color: 0x0c1016,
    metalness: 0.9,
    roughness: 0.25,
  });
  const base = new THREE.Mesh(baseGeo, baseMat);
  g.add(base);

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
  ctx.fillText("F1 2026 8-SPEED SEAMLESS GEARBOX & REAR SUSPENSION", tx, ch * 0.72);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.flipY = false;

  const planeGeo = new THREE.PlaneGeometry(plateW - 0.02 * scale, plateH - 0.02 * scale);
  const uv = planeGeo.attributes.uv;
  for (let i = 0; i < uv.count; i++) {
    uv.setY(i, 1.0 - uv.getY(i));
  }
  uv.needsUpdate = true;

  const faceMat = new THREE.MeshBasicMaterial({ map: tex, transparent: false });
  const face = new THREE.Mesh(planeGeo, faceMat);
  face.position.z = plateD / 2 + 0.002 * scale;
  g.add(face);

  return g;
}

// Master Gearbox, Suspension & RIS Assembly Builder
export function buildGearboxAssembly(scene, mats) {
  const root = new THREE.Group();
  root.name = "Body_Gearbox_Assembly";

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
  // 1. GEARBOX CASING & BELLHOUSING (Ti-CFRP Hybrid)
  // -------------------------------------------------------------
  const casingGroup = new THREE.Group();
  casingGroup.name = "Body_Gearbox_Casing_TiCFRP";

  // Front Bellhousing adapter flange (attaches to rear of 1.6L V6 engine at X = 0)
  const bellGeo = new THREE.CylinderGeometry(1.85, 2.05, 1.2, 32);
  const bellMesh = new THREE.Mesh(bellGeo, mats.bellhousingTi);
  bellMesh.rotation.z = Math.PI / 2;
  bellMesh.position.set(0.6, 2.2, 0);
  bellMesh.castShadow = true;
  casingGroup.add(bellMesh);

  // Main transmission tunnel & gear casing (tapers back to differential)
  const tunnelGeo = new THREE.BoxGeometry(4.8, 2.2, 2.6);
  const tunnelMesh = new THREE.Mesh(tunnelGeo, mats.casingCFRP);
  tunnelMesh.position.set(3.2, 2.1, 0);
  tunnelMesh.castShadow = true;
  casingGroup.add(tunnelMesh);

  // Rear differential housing bulge (centered around rear axle line at X = 6.5)
  const diffBulgeGeo = new THREE.CylinderGeometry(1.6, 1.6, 2.8, 24);
  const diffBulge = new THREE.Mesh(diffBulgeGeo, mats.casingCFRP);
  diffBulge.position.set(6.5, 2.2, 0);
  diffBulge.castShadow = true;
  casingGroup.add(diffBulge);

  // Inboard damper saddle bridge on top of casing
  const saddleGeo = new THREE.BoxGeometry(2.4, 0.6, 2.2);
  const saddle = new THREE.Mesh(saddleGeo, mats.billetAluminum);
  saddle.position.set(4.8, 3.4, 0);
  casingGroup.add(saddle);

  // 4x Engine-to-Gearbox Titanium M12 Studs
  const studGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.5, 16);
  const studCoords = [
    [-1.2, 1.4], [1.2, 1.4],
    [-1.2, 3.0], [1.2, 3.0]
  ];
  studCoords.forEach(([sz, sy], idx) => {
    const stud = new THREE.Mesh(studGeo, mats.titaniumBright);
    stud.name = `Fastener_EngineToGearbox_M12_0${idx + 1}`;
    stud.rotation.z = Math.PI / 2;
    stud.position.set(-0.15, sy, sz);
    casingGroup.add(stud);
  });

  // Official Engineering Badge
  const badge = makeSREdesignsBadge(0.35);
  badge.rotation.y = -Math.PI / 2;
  badge.position.set(3.2, 2.2, 1.32);
  casingGroup.add(badge);

  root.add(casingGroup);

  // -------------------------------------------------------------
  // 2. INTERNAL 8-SPEED SEAMLESS GEAR CLUSTER & LAYSHAFT
  // -------------------------------------------------------------
  const layshaftGroup = new THREE.Group();
  layshaftGroup.name = "Body_Transmission_Layshaft";

  // Central longitudinal shaft
  const shaftGeo = new THREE.CylinderGeometry(0.12, 0.12, 4.4, 20);
  const shaft = new THREE.Mesh(shaftGeo, mats.steelGears);
  shaft.rotation.z = Math.PI / 2;
  shaft.position.set(3.2, 1.8, 0);
  layshaftGroup.add(shaft);

  // 8 forward gear pairs of stepped diameters
  const gearRadii = [0.85, 0.78, 0.72, 0.65, 0.60, 0.55, 0.50, 0.46];
  gearRadii.forEach((r, idx) => {
    const gearGeo = new THREE.CylinderGeometry(r, r, 0.28, 24);
    const gear = new THREE.Mesh(gearGeo, mats.steelGears);
    gear.rotation.z = Math.PI / 2;
    gear.position.set(1.4 + idx * 0.46, 1.8, 0);
    gear.castShadow = true;
    layshaftGroup.add(gear);

    // Dog engagement selector ring
    if (idx % 2 === 0) {
      const dogGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.12, 16);
      const dog = new THREE.Mesh(dogGeo, mats.titaniumBright);
      dog.rotation.z = Math.PI / 2;
      dog.position.set(1.4 + idx * 0.46 + 0.23, 1.8, 0);
      layshaftGroup.add(dog);
    }
  });

  // 4-Plate Carbon-Carbon Pull Clutch inside bellhousing
  const clutchGroup = new THREE.Group();
  clutchGroup.name = "Body_Clutch_CarbonPull";
  const clutchBasketGeo = new THREE.CylinderGeometry(0.9, 0.9, 0.6, 24);
  const clutchBasket = new THREE.Mesh(clutchBasketGeo, mats.steelGears);
  clutchBasket.rotation.z = Math.PI / 2;
  clutchBasket.position.set(0.6, 2.2, 0);
  clutchGroup.add(clutchBasket);
  layshaftGroup.add(clutchGroup);

  root.add(layshaftGroup);
  registerExploded(layshaftGroup, new THREE.Vector3(0, -1, 0), 1.5);

  // -------------------------------------------------------------
  // 3. ELECTRO-HYDRAULIC ACTIVE LIMITED-SLIP DIFFERENTIAL
  // -------------------------------------------------------------
  const diffGroup = new THREE.Group();
  diffGroup.name = "Body_Differential_LSD_ElectroHyd";

  const crownGeo = new THREE.CylinderGeometry(1.25, 1.25, 0.45, 28);
  const crown = new THREE.Mesh(crownGeo, mats.diffHousing);
  crown.position.set(6.5, 2.2, 0);
  diffGroup.add(crown);

  // Active hydraulic preload actuator ring
  const actuatorRing = new THREE.Mesh(new THREE.TorusGeometry(0.8, 0.14, 16, 32), mats.billetAluminum);
  actuatorRing.rotation.y = Math.PI / 2;
  actuatorRing.position.set(6.5, 2.2, 0.35);
  diffGroup.add(actuatorRing);

  root.add(diffGroup);
  registerExploded(diffGroup, new THREE.Vector3(0, -1, 0), 1.8);

  // -------------------------------------------------------------
  // 4. HOLLOW GUN-DRILLED DRIVESHAFTS & PLUNGING TRIPOD JOINTS
  // -------------------------------------------------------------
  for (const side of [-1, 1]) {
    const sideKey = side === -1 ? "LH" : "RH";
    const dsGroup = new THREE.Group();
    dsGroup.name = `Body_Driveshaft_Hollow_${sideKey}`;

    // Inner plunging tripod housing
    const tripodGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.6, 18);
    const tripod = new THREE.Mesh(tripodGeo, mats.driveshaftSteel);
    tripod.rotation.x = Math.PI / 2;
    tripod.position.set(6.5, 2.2, side * 1.6);
    dsGroup.add(tripod);

    // Hollow shaft extending outward to rear hub (Y = side * 6.5)
    const shaftTubeGeo = new THREE.CylinderGeometry(0.12, 0.12, 4.4, 18);
    const shaftTube = new THREE.Mesh(shaftTubeGeo, mats.driveshaftSteel);
    shaftTube.rotation.x = Math.PI / 2;
    shaftTube.position.set(6.5, 2.2, side * 4.0);
    shaftTube.castShadow = true;
    dsGroup.add(shaftTube);

    // Outer wheel hub spline
    const outerSpline = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.5, 18), mats.titaniumBright);
    outerSpline.rotation.x = Math.PI / 2;
    outerSpline.position.set(6.5, 2.2, side * 6.3);
    dsGroup.add(outerSpline);

    root.add(dsGroup);
    registerExploded(dsGroup, new THREE.Vector3(0, 0, side), 1.4);
  }

  // -------------------------------------------------------------
  // 5. REAR SUSPENSION WISHBONES & PUSHROD KINEMATICS
  // -------------------------------------------------------------
  for (const side of [-1, 1]) {
    const sideKey = side === -1 ? "LH" : "RH";

    // Upper Wishbone A-Arm
    const upperWbGroup = new THREE.Group();
    upperWbGroup.name = `Body_RearWishbone_Upper_${sideKey}`;
    const upperLegGeo = new THREE.BoxGeometry(0.35, 0.14, 4.2);
    const upperLegFwd = new THREE.Mesh(upperLegGeo, mats.carbonAero);
    upperLegFwd.position.set(5.5, 3.2, side * 3.8);
    upperLegFwd.rotation.y = side * 0.15;
    upperWbGroup.add(upperLegFwd);

    const upperLegAft = new THREE.Mesh(upperLegGeo, mats.carbonAero);
    upperLegAft.position.set(7.2, 3.2, side * 3.8);
    upperLegAft.rotation.y = -side * 0.15;
    upperWbGroup.add(upperLegAft);

    root.add(upperWbGroup);
    registerExploded(upperWbGroup, new THREE.Vector3(0, 1, side * 0.5), 1.6);

    // Lower Wishbone A-Arm
    const lowerWbGroup = new THREE.Group();
    lowerWbGroup.name = `Body_RearWishbone_Lower_${sideKey}`;
    const lowerLegGeo = new THREE.BoxGeometry(0.42, 0.15, 4.4);
    const lowerLegFwd = new THREE.Mesh(lowerLegGeo, mats.carbonAero);
    lowerLegFwd.position.set(5.2, 1.2, side * 3.8);
    lowerLegFwd.rotation.y = side * 0.18;
    lowerWbGroup.add(lowerLegFwd);

    const lowerLegAft = new THREE.Mesh(lowerLegGeo, mats.carbonAero);
    lowerLegAft.position.set(7.5, 1.2, side * 3.8);
    lowerLegAft.rotation.y = -side * 0.18;
    lowerWbGroup.add(lowerLegAft);

    root.add(lowerWbGroup);
    registerExploded(lowerWbGroup, new THREE.Vector3(0, -1, side * 0.5), 1.6);

    // Diagonal Pushrod Strut
    const pushrodGroup = new THREE.Group();
    pushrodGroup.name = `Body_RearPushrod_Strut_${sideKey}`;
    const pushrodGeo = new THREE.CylinderGeometry(0.12, 0.12, 5.2, 16);
    const pushrodMesh = new THREE.Mesh(pushrodGeo, mats.carbonAero);
    pushrodMesh.position.set(5.8, 2.4, side * 3.4);
    pushrodMesh.rotation.x = side * 0.58;
    pushrodMesh.rotation.z = -0.32;
    pushrodGroup.add(pushrodMesh);

    // Pushrod titanium rod ends
    const endSph1 = new THREE.Mesh(new THREE.SphereGeometry(0.18, 16, 16), mats.titaniumBright);
    endSph1.position.set(6.6, 1.4, side * 5.8);
    pushrodGroup.add(endSph1);

    const endSph2 = new THREE.Mesh(new THREE.SphereGeometry(0.18, 16, 16), mats.titaniumBright);
    endSph2.position.set(5.0, 3.4, side * 1.1);
    pushrodGroup.add(endSph2);

    root.add(pushrodGroup);
    registerExploded(pushrodGroup, new THREE.Vector3(0, 0.8, side * 0.8), 1.8);

    // Inboard Bellcrank Rocker
    const rockerGroup = new THREE.Group();
    rockerGroup.name = `Body_RearRocker_Bellcrank_${sideKey}`;
    const rockerGeo = new THREE.BoxGeometry(0.8, 0.5, 0.7);
    const rockerMesh = new THREE.Mesh(rockerGeo, mats.billetAluminum);
    rockerMesh.position.set(4.9, 3.6, side * 0.85);
    rockerGroup.add(rockerMesh);

    // Inboard Damper
    const damperMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 1.8, 16), mats.damperGold);
    damperMesh.name = `Body_RearDamper_ThroughRod_${sideKey}`;
    damperMesh.rotation.z = Math.PI / 2;
    damperMesh.position.set(3.8, 3.6, side * 0.85);
    rockerGroup.add(damperMesh);

    root.add(rockerGroup);
    registerExploded(rockerGroup, new THREE.Vector3(0, 1, 0), 1.8);

    // Downsized Rear Brake Corner Assembly (Ø240 mm carbon disc & 4-piston Al-Li caliper)
    const brakeGroup = new THREE.Group();
    brakeGroup.name = `Body_RearBrake_Disc_${sideKey}`;

    const discGeo = new THREE.CylinderGeometry(1.5, 1.5, 0.24, 32);
    const discMesh = new THREE.Mesh(discGeo, mats.carbonBrakeDisc);
    discMesh.rotation.x = Math.PI / 2;
    discMesh.position.set(6.5, 2.2, side * 6.5);
    discMesh.castShadow = true;
    brakeGroup.add(discMesh);

    // Monobloc Caliper
    const caliperGeo = new THREE.BoxGeometry(1.2, 0.9, 0.48);
    const caliperMesh = new THREE.Mesh(caliperGeo, mats.caliperAlLi);
    caliperMesh.name = `Body_RearBrake_Caliper_${sideKey}`;
    caliperMesh.position.set(6.5, 3.1, side * 6.5);
    caliperMesh.castShadow = true;
    brakeGroup.add(caliperMesh);

    root.add(brakeGroup);
    registerExploded(brakeGroup, new THREE.Vector3(0, 0, side), 2.2);
  }

  // Central Heave (Third) Spring Element
  const heaveGroup = new THREE.Group();
  heaveGroup.name = "Body_RearHeave_ThirdElement";
  const heaveGeo = new THREE.CylinderGeometry(0.26, 0.26, 1.6, 16);
  const heaveMesh = new THREE.Mesh(heaveGeo, mats.titaniumBright);
  heaveMesh.rotation.z = Math.PI / 2;
  heaveMesh.position.set(4.0, 3.6, 0);
  heaveGroup.add(heaveMesh);
  root.add(heaveGroup);
  registerExploded(heaveGroup, new THREE.Vector3(0, 1.2, 0), 2.0);

  // -------------------------------------------------------------
  // 6. FIA 50 kJ REAR IMPACT STRUCTURE (RIS / RCS) & RAIN LIGHT
  // -------------------------------------------------------------
  const risGroup = new THREE.Group();
  risGroup.name = "Body_RearImpactStructure_Cone";

  // Tapered carbon crash cone extending aft from X = 7.8 to X = 13.5
  const coneGeo = new THREE.CylinderGeometry(0.48, 1.1, 5.7, 24);
  const coneMesh = new THREE.Mesh(coneGeo, mats.risConeCarbon);
  coneMesh.rotation.z = -Math.PI / 2;
  coneMesh.position.set(10.65, 2.2, 0);
  coneMesh.castShadow = true;
  risGroup.add(coneMesh);

  // 4x RIS Mounting Studs
  for (let i = 0; i < 4; i++) {
    const angle = (i * Math.PI) / 2;
    const rStud = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.35, 12), mats.titaniumBright);
    rStud.name = `Fastener_RIS_Mount_M10_0${i + 1}`;
    rStud.rotation.z = Math.PI / 2;
    rStud.position.set(7.7, 2.2 + 0.65 * Math.sin(angle), 0.65 * Math.cos(angle));
    risGroup.add(rStud);
  }

  // Pulsing High-Intensity Red LED Rain Safety Light at tip (X = 13.55)
  const lightHousing = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.65, 1.2), mats.casingCFRP);
  lightHousing.position.set(13.4, 2.2, 0);
  risGroup.add(lightHousing);

  const rainLight = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.52, 1.05), mats.rainLightGlow);
  rainLight.name = "Body_RainLight_FIA_LED";
  rainLight.position.set(13.58, 2.2, 0);
  risGroup.add(rainLight);

  root.add(risGroup);
  registerExploded(risGroup, new THREE.Vector3(1, 0, 0), 2.5);

  scene.add(root);

  return {
    root,
    casingGroup,
    layshaftGroup,
    diffGroup,
    risGroup,
    rainLight,
    explodedParts,
    mats,
  };
}
