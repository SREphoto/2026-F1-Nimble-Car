/**
 * front_wing3d.js — High-Fidelity Piecewise Procedural 3D CAD Assembly
 * 2026 Formula 1 Active Front Wing & Two-Stage FIS Nosecone
 *
 * Semantic Taxonomy (strictly adheres to VALID_PREFIXES):
 * - Body_FrontWing_Assembly
 * - Body_FIS_Nosecone_Stage1 (Forward carbon-aramid crush cone, 42.5 kJ)
 * - Body_FIS_Nosecone_Stage2 (Secondary survival structure, >500 kN crush force)
 * - Fastener_FIS_Stud_Ti_01..04 (4x M14 titanium chassis mounting studs)
 * - Body_Wing_Mainplane_Element1 (Fixed full-span 1,850 mm carbon mainplane)
 * - Pivot_Wing_Flap_LH_Element2 & Pivot_Wing_Flap_RH_Element2 (Intermediate flaps)
 * - Pivot_Wing_ActiveFlap_LH_Element3 & Pivot_Wing_ActiveFlap_RH_Element3 (Active articulating flaps)
 * - Body_FWEP_LH & Body_FWEP_RH (Inwash cambered endplates)
 * - Body_Diveplane_Micro_LH & Body_Diveplane_Micro_RH (FIA Article C3 micro diveplanes)
 * - Body_Actuator_Aero_EHA_LH & Body_Actuator_Aero_EHA_RH (Electro-hydraulic flap actuators)
 * - Body_SlotGap_Separator_01..06 (CNC titanium aerodynamic slot gap brackets)
 * - Body_Pitot_Tube_Array (Dual nose-mounted pitot-static airspeed sensors)
 * - Badge_SREdesigns (Official engineering serial plaque)
 */

import * as THREE from "three";

export function createFrontWingMaterials() {
  return {
    carbonGloss: new THREE.MeshStandardMaterial({
      color: 0x14171a,
      roughness: 0.18,
      metalness: 0.45,
    }),
    carbonMatte: new THREE.MeshStandardMaterial({
      color: 0x0f1114,
      roughness: 0.72,
      metalness: 0.15,
    }),
    titaniumBright: new THREE.MeshStandardMaterial({
      color: 0xb5bec8,
      roughness: 0.25,
      metalness: 0.95,
    }),
    titaniumAnodized: new THREE.MeshStandardMaterial({
      color: 0x8a929b,
      roughness: 0.35,
      metalness: 0.92,
    }),
    actuatorGold: new THREE.MeshStandardMaterial({
      color: 0xc89632,
      roughness: 0.32,
      metalness: 0.88,
    }),
    pitotSteel: new THREE.MeshStandardMaterial({
      color: 0xd8e0e8,
      roughness: 0.15,
      metalness: 0.98,
    }),
    chassisStub: new THREE.MeshStandardMaterial({
      color: 0x181c22,
      roughness: 0.65,
      metalness: 0.25,
    }),
  };
}

// Official SREdesigns Engineering Plaque
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
  ctx.fillText("F1 2026 ACTIVE FRONT WING · FIS HOMOLOGATED", tx, ch * 0.72);

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

// Master Front Wing & FIS Assembly Builder
export function buildFrontWingAssembly(scene, mats) {
  const root = new THREE.Group();
  root.name = "Body_FrontWing_Assembly";

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
  // 1. BULKHEAD A-A CHASSIS INTERFACE REFERENCE STUB
  // -------------------------------------------------------------
  const chassisStub = new THREE.Mesh(new THREE.BoxGeometry(0.8, 3.8, 3.2), mats.chassisStub);
  chassisStub.position.set(0.4, 2.5, 0);
  chassisStub.name = "Body_Bulkhead_Interface_Stub";
  root.add(chassisStub);
  registerExploded(chassisStub, new THREE.Vector3(1, 0, 0), 1.5);

  // 4x M14 Titanium Mounting Spigots
  const spigotGeo = new THREE.CylinderGeometry(0.09, 0.09, 0.65, 16);
  const spigotCoords = [
    [-1.0, 1.8], [1.0, 1.8],
    [-1.0, 3.4], [1.0, 3.4]
  ];
  spigotCoords.forEach(([sz, sy], idx) => {
    const spigot = new THREE.Mesh(spigotGeo, mats.titaniumBright);
    spigot.rotation.z = Math.PI / 2;
    spigot.position.set(0.1, sy, sz);
    spigot.name = `Fastener_FIS_Stud_Ti_0${idx + 1}`;
    root.add(spigot);
  });

  // -------------------------------------------------------------
  // 2. TWO-STAGE FRONT IMPACT STRUCTURE (FIS) NOSECONE
  // -------------------------------------------------------------
  const noseGroup = new THREE.Group();
  noseGroup.name = "Body_FIS_Nosecone_Assembly";

  // Stage 2: Secondary Survival Structure (X: 0 to -8.5 units)
  // Sculpted hull widening toward Bulkhead A-A with bottom keel channel
  const stage2Geo = new THREE.ConeGeometry(1.6, 8.5, 32);
  const stage2Mesh = new THREE.Mesh(stage2Geo, mats.carbonGloss);
  stage2Mesh.rotation.z = Math.PI / 2;
  stage2Mesh.scale.set(0.85, 1.0, 0.95);
  stage2Mesh.position.set(-4.25, 2.3, 0);
  stage2Mesh.castShadow = true;
  stage2Mesh.name = "Body_FIS_Nosecone_Stage2";
  noseGroup.add(stage2Mesh);

  // Stage 1: Forward Crush Cone (X: -8.5 to -12.5 units)
  // Absorbs 42.5 kJ initial impact energy
  const stage1Geo = new THREE.ConeGeometry(0.95, 4.0, 32);
  const stage1Mesh = new THREE.Mesh(stage1Geo, mats.carbonMatte);
  stage1Mesh.rotation.z = Math.PI / 2;
  stage1Mesh.scale.set(0.85, 1.0, 0.95);
  stage1Mesh.position.set(-10.5, 1.95, 0);
  stage1Mesh.castShadow = true;
  stage1Mesh.name = "Body_FIS_Nosecone_Stage1";
  noseGroup.add(stage1Mesh);

  // Nose tip rounding
  const noseTip = new THREE.Mesh(new THREE.SphereGeometry(0.38, 24, 24), mats.carbonMatte);
  noseTip.scale.set(1.4, 0.75, 0.9);
  noseTip.position.set(-12.45, 1.82, 0);
  noseTip.name = "Body_Nosecone_Tip_Fairing";
  noseGroup.add(noseTip);

  // Dual Pitot-Static Sensor Array
  const pitotGroup = new THREE.Group();
  pitotGroup.name = "Body_Pitot_Tube_Array";
  for (const pz of [-0.22, 0.22]) {
    const probe = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.85, 12), mats.pitotSteel);
    probe.rotation.z = Math.PI / 2;
    probe.position.set(-9.8, 2.45, pz);
    pitotGroup.add(probe);
  }
  noseGroup.add(pitotGroup);

  // Official SREdesigns Serial Plaque
  const badge = makeSREdesignsBadge(0.35);
  badge.rotation.y = -Math.PI / 2;
  badge.rotation.z = 0.12;
  badge.position.set(-6.8, 2.78, 0.0);
  noseGroup.add(badge);

  root.add(noseGroup);
  registerExploded(noseGroup, new THREE.Vector3(-1, 0.4, 0), 1.6);

  // -------------------------------------------------------------
  // 3. ELEMENT 1: FIXED FULL-SPAN MAINPLANE (1,850 mm Span)
  // -------------------------------------------------------------
  const mainplaneGroup = new THREE.Group();
  mainplaneGroup.name = "Body_Wing_Mainplane_Element1";

  // Aerodynamic spoon profile: center clearance 60 mm (Y=0.6), rising to 115 mm (Y=1.15) outboard
  const mainplaneCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-10.2, 1.15, -9.25),
    new THREE.Vector3(-10.5, 0.85, -5.5),
    new THREE.Vector3(-10.8, 0.60, 0.0),
    new THREE.Vector3(-10.5, 0.85, 5.5),
    new THREE.Vector3(-10.2, 1.15, 9.25),
  ]);

  // Mainplane chord profile (streamlined airfoil shape)
  const mainplaneGeo = new THREE.TubeGeometry(mainplaneCurve, 48, 0.38, 16, false);
  const mainplaneMesh = new THREE.Mesh(mainplaneGeo, mats.carbonGloss);
  mainplaneMesh.scale.set(2.8, 0.42, 1.0); // Chord ~1.1 units (400 mm chord)
  mainplaneMesh.castShadow = true;
  mainplaneGroup.add(mainplaneMesh);

  root.add(mainplaneGroup);
  registerExploded(mainplaneGroup, new THREE.Vector3(0, -1, 0), 1.4);

  // -------------------------------------------------------------
  // 4. ELEMENT 2: INTERMEDIATE CAMBER FLAPS (LH & RH)
  // -------------------------------------------------------------
  const flap2LHGroup = new THREE.Group();
  flap2LHGroup.name = "Pivot_Wing_Flap_LH_Element2";
  const flap2RHGroup = new THREE.Group();
  flap2RHGroup.name = "Pivot_Wing_Flap_RH_Element2";

  const flap2CurveLH = new THREE.LineCurve3(
    new THREE.Vector3(-8.8, 1.1, 1.4),
    new THREE.Vector3(-8.2, 1.6, 9.0)
  );
  const flap2GeoLH = new THREE.TubeGeometry(flap2CurveLH, 32, 0.22, 12, false);
  const flap2MeshLH = new THREE.Mesh(flap2GeoLH, mats.carbonMatte);
  flap2MeshLH.scale.set(2.2, 0.35, 1.0);
  flap2LHGroup.add(flap2MeshLH);

  const flap2CurveRH = new THREE.LineCurve3(
    new THREE.Vector3(-8.8, 1.1, -1.4),
    new THREE.Vector3(-8.2, 1.6, -9.0)
  );
  const flap2GeoRH = new THREE.TubeGeometry(flap2CurveRH, 32, 0.22, 12, false);
  const flap2MeshRH = new THREE.Mesh(flap2GeoRH, mats.carbonMatte);
  flap2MeshRH.scale.set(2.2, 0.35, 1.0);
  flap2RHGroup.add(flap2MeshRH);

  root.add(flap2LHGroup);
  root.add(flap2RHGroup);
  registerExploded(flap2LHGroup, new THREE.Vector3(0, 0.8, 1), 1.5);
  registerExploded(flap2RHGroup, new THREE.Vector3(0, 0.8, -1), 1.5);

  // -------------------------------------------------------------
  // 5. ELEMENT 3: ACTIVE ARTICULATING UPPER FLAPS (LH & RH)
  // -------------------------------------------------------------
  // Pivots at leading edge hinge: Z-Mode 24° to X-Mode 6°
  const activeFlapLH = new THREE.Group();
  activeFlapLH.name = "Pivot_Wing_ActiveFlap_LH_Element3";
  activeFlapLH.position.set(-7.2, 1.8, 1.6); // Hinge anchor location

  const activeCurveLH = new THREE.LineCurve3(
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0.5, 0.45, 7.2)
  );
  const activeGeoLH = new THREE.TubeGeometry(activeCurveLH, 32, 0.20, 12, false);
  const activeMeshLH = new THREE.Mesh(activeGeoLH, mats.carbonGloss);
  activeMeshLH.scale.set(2.4, 0.32, 1.0);
  activeMeshLH.castShadow = true;
  activeFlapLH.add(activeMeshLH);

  // Titanium Hinge Dowels
  for (const hz of [0.4, 3.6, 6.8]) {
    const hinge = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.16, 12), mats.titaniumBright);
    hinge.position.set(hz * 0.07, hz * 0.06, hz);
    hinge.name = `Fastener_FlapHinge_Pin_Ti_LH_${Math.round(hz)}`;
    activeFlapLH.add(hinge);
  }

  const activeFlapRH = new THREE.Group();
  activeFlapRH.name = "Pivot_Wing_ActiveFlap_RH_Element3";
  activeFlapRH.position.set(-7.2, 1.8, -1.6);

  const activeCurveRH = new THREE.LineCurve3(
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0.5, 0.45, -7.2)
  );
  const activeGeoRH = new THREE.TubeGeometry(activeCurveRH, 32, 0.20, 12, false);
  const activeMeshRH = new THREE.Mesh(activeGeoRH, mats.carbonGloss);
  activeMeshRH.scale.set(2.4, 0.32, 1.0);
  activeMeshRH.castShadow = true;
  activeFlapRH.add(activeMeshRH);

  for (const hz of [0.4, 3.6, 6.8]) {
    const hinge = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.16, 12), mats.titaniumBright);
    hinge.position.set(hz * 0.07, hz * 0.06, -hz);
    hinge.name = `Fastener_FlapHinge_Pin_Ti_RH_${Math.round(hz)}`;
    activeFlapRH.add(hinge);
  }

  root.add(activeFlapLH);
  root.add(activeFlapRH);
  registerExploded(activeFlapLH, new THREE.Vector3(0, 1.5, 0.5), 1.8);
  registerExploded(activeFlapRH, new THREE.Vector3(0, 1.5, -0.5), 1.8);

  // -------------------------------------------------------------
  // 6. ELECTRO-HYDRAULIC ACTUATORS (EHA) & PUSHRODS
  // -------------------------------------------------------------
  const actuatorLH = new THREE.Group();
  actuatorLH.name = "Body_Actuator_Aero_EHA_LH";
  const cylLH = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.85, 16), mats.actuatorGold);
  cylLH.rotation.z = Math.PI / 2;
  cylLH.position.set(-5.6, 2.2, 1.4);
  actuatorLH.add(cylLH);

  const pushrodLH = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.6, 12), mats.titaniumBright);
  pushrodLH.rotation.z = 1.1;
  pushrodLH.position.set(-6.4, 2.0, 1.5);
  actuatorLH.add(pushrodLH);
  root.add(actuatorLH);

  const actuatorRH = new THREE.Group();
  actuatorRH.name = "Body_Actuator_Aero_EHA_RH";
  const cylRH = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.85, 16), mats.actuatorGold);
  cylRH.rotation.z = Math.PI / 2;
  cylRH.position.set(-5.6, 2.2, -1.4);
  actuatorRH.add(cylRH);

  const pushrodRH = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.6, 12), mats.titaniumBright);
  pushrodRH.rotation.z = 1.1;
  pushrodRH.position.set(-6.4, 2.0, -1.5);
  actuatorRH.add(pushrodRH);
  root.add(actuatorRH);

  // -------------------------------------------------------------
  // 7. INWASH FRONT WING ENDPLATES (FWEP) & MICRO DIVEPLANES
  // -------------------------------------------------------------
  const endplateGeo = new THREE.BoxGeometry(7.8, 2.4, 0.08); // 780mm chord x 240mm height

  // LH Endplate
  const endplateLHGroup = new THREE.Group();
  endplateLHGroup.name = "Body_FWEP_LH";
  const endplateLH = new THREE.Mesh(endplateGeo, mats.carbonGloss);
  endplateLH.position.set(-8.4, 1.8, 9.25);
  endplateLH.rotation.y = -0.06; // Authentic inwash camber angle
  endplateLH.castShadow = true;
  endplateLHGroup.add(endplateLH);

  // Micro Diveplane LH (FIA C3: max 60 mm projection, 15 mm radius)
  const diveplaneGeo = new THREE.BoxGeometry(2.0, 0.04, 0.60);
  const diveplaneLH = new THREE.Mesh(diveplaneGeo, mats.carbonMatte);
  diveplaneLH.position.set(-9.2, 1.65, 9.55);
  diveplaneLH.rotation.z = -0.15; // Upwash rake
  diveplaneLH.name = "Body_Diveplane_Micro_LH";
  endplateLHGroup.add(diveplaneLH);

  root.add(endplateLHGroup);
  registerExploded(endplateLHGroup, new THREE.Vector3(0, 0, 1), 2.2);

  // RH Endplate
  const endplateRHGroup = new THREE.Group();
  endplateRHGroup.name = "Body_FWEP_RH";
  const endplateRH = new THREE.Mesh(endplateGeo, mats.carbonGloss);
  endplateRH.position.set(-8.4, 1.8, -9.25);
  endplateRH.rotation.y = 0.06; // Authentic inwash camber angle
  endplateRH.castShadow = true;
  endplateRHGroup.add(endplateRH);

  // Micro Diveplane RH
  const diveplaneRH = new THREE.Mesh(diveplaneGeo, mats.carbonMatte);
  diveplaneRH.position.set(-9.2, 1.65, -9.55);
  diveplaneRH.rotation.z = -0.15;
  diveplaneRH.name = "Body_Diveplane_Micro_RH";
  endplateRHGroup.add(diveplaneRH);

  root.add(endplateRHGroup);
  registerExploded(endplateRHGroup, new THREE.Vector3(0, 0, -1), 2.2);

  // -------------------------------------------------------------
  // 8. 6x AERODYNAMIC SLOT-GAP SEPARATORS
  // -------------------------------------------------------------
  const separatorGeo = new THREE.BoxGeometry(0.38, 0.75, 0.04);
  const separatorZPositions = [-7.0, -4.5, -2.2, 2.2, 4.5, 7.0];
  separatorZPositions.forEach((sz, i) => {
    const sep = new THREE.Mesh(separatorGeo, mats.titaniumBright);
    sep.position.set(-8.2, 1.45, sz);
    sep.rotation.z = 0.28;
    sep.name = `Body_SlotGap_Separator_0${i + 1}`;
    root.add(sep);
  });

  scene.add(root);

  return {
    root,
    chassisStub,
    noseGroup,
    mainplaneGroup,
    flap2LHGroup,
    flap2RHGroup,
    activeFlapLH,
    activeFlapRH,
    actuatorLH,
    actuatorRH,
    endplateLHGroup,
    endplateRHGroup,
    explodedParts,
    mats,
  };
}
