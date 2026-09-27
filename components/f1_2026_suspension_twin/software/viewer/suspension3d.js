/**
 * suspension3d.js — High-Fidelity Piecewise Procedural 3D CAD Assembly
 * 2026 Formula 1 Front Suspension & Steering Linkage (LH Corner)
 *
 * Semantic Taxonomy (strictly adheres to VALID_PREFIXES):
 * - Body_FrontSuspension_Assembly
 * - Pivot_Wishbone_Upper_FrontLH (Upper A-arm carbon aero profile, uniball joints)
 * - Pivot_Wishbone_Lower_FrontLH (Lower A-arm with 14.2° anti-dive rake)
 * - Pivot_Suspension_PullRod_FrontLH (Carbon tension strut with Ti clevises)
 * - Pivot_Steering_TieRod_FrontLH (Steering track rod with LH/RH uniball ends)
 * - Pivot_Suspension_Rocker_Bellcrank (CNC Ti-6Al-4V inboard bellcrank)
 * - Body_TorsionBar_Front_Maraging300 (Quill shaft suspension spring)
 * - Body_HeaveDamper_Front_Hydraulic (4-way adjustable hydraulic damper)
 * - Body_WheelWake_Deflector_FrontLH (Upright-mounted carbon wake deflector)
 * - Body_WheelTether_Zylon_01..04 (4x 7.0 kJ braided safety tethers)
 * - Body_Upright_Carrier_FrontLH_Titanium (Corner upright interface)
 * - Pivot_Brake_Disc_Ventilated_Front & Body_Brake_Caliper_Monobloc_Front (Brake assembly)
 * - Pivot_Wheel_Magnesium_BBS_Front (18-inch BBS magnesium wheel rim)
 * - Body_Monocoque_Nose_Stub (Inboard chassis bulkhead reference)
 * - Badge_SREdesigns (Official engineering serial plaque)
 */

import * as THREE from "three";

export function createSuspensionMaterials() {
  return {
    carbonAero: new THREE.MeshStandardMaterial({
      color: 0x14171a,
      roughness: 0.22,
      metalness: 0.40,
    }),
    carbonMatte: new THREE.MeshStandardMaterial({
      color: 0x0f1114,
      roughness: 0.78,
      metalness: 0.15,
    }),
    titaniumBellcrank: new THREE.MeshStandardMaterial({
      color: 0x8e97a0,
      roughness: 0.32,
      metalness: 0.94,
    }),
    titaniumBright: new THREE.MeshStandardMaterial({
      color: 0xb5bec8,
      roughness: 0.25,
      metalness: 0.96,
    }),
    maragingSteel: new THREE.MeshStandardMaterial({
      color: 0x6e7885,
      roughness: 0.28,
      metalness: 0.92,
    }),
    damperGold: new THREE.MeshStandardMaterial({
      color: 0xc89632, // Hard-anodized damper body
      roughness: 0.35,
      metalness: 0.85,
    }),
    zylonTether: new THREE.MeshStandardMaterial({
      color: 0xb8860b, // Dark goldenrod braided PBO weave
      roughness: 0.85,
      metalness: 0.05,
    }),
    wheelMagnesium: new THREE.MeshStandardMaterial({
      color: 0x1e2126,
      roughness: 0.45,
      metalness: 0.75,
    }),
    caliperAlLi: new THREE.MeshStandardMaterial({
      color: 0x3d3830,
      roughness: 0.38,
      metalness: 0.82,
    }),
    carbonDisc: new THREE.MeshStandardMaterial({
      color: 0x181a1d,
      roughness: 0.82,
      metalness: 0.15,
    }),
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
  ctx.fillText("F1 2026 SUSPENSION · PULL-ROD SPEC", tx, ch * 0.72);

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

// Master Front Suspension Assembly
export function buildFrontSuspension(scene, mats) {
  const root = new THREE.Group();
  root.name = "Body_FrontSuspension_Assembly";

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
  // 1. BENCH STAND & DATUM FIXTURE
  // -------------------------------------------------------------
  const benchGroup = new THREE.Group();
  benchGroup.name = "Body_Lab_Dynamometer_Bench";

  const benchTopMat = new THREE.MeshStandardMaterial({ color: 0x141820, roughness: 0.6, metalness: 0.2 });
  const benchTop = new THREE.Mesh(new THREE.BoxGeometry(14.0, 0.4, 12.0), benchTopMat);
  benchTop.position.set(0, -2.4, 4.0);
  benchTop.receiveShadow = true;
  benchGroup.add(benchTop);

  const splashMat = new THREE.MeshStandardMaterial({ color: 0x1a212b, roughness: 0.7, metalness: 0.1 });
  const splash = new THREE.Mesh(new THREE.BoxGeometry(14.0, 4.5, 0.2), splashMat);
  splash.position.set(0, 0.0, 9.9);
  splash.receiveShadow = true;
  benchGroup.add(splash);

  // Duplex AC outlet
  const outletPlate = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.85, 0.04), new THREE.MeshStandardMaterial({ color: 0xd0d5dc, roughness: 0.35, metalness: 0.5 }));
  outletPlate.position.set(4.8, 0.5, 9.78);
  outletPlate.name = "Body_Lab_Outlet_Plate";
  benchGroup.add(outletPlate);

  const outletSocketMat = new THREE.MeshStandardMaterial({ color: 0x111418, roughness: 0.8, metalness: 0.1 });
  for (const dy of [-0.2, 0.2]) {
    const socket = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.03, 16), outletSocketMat);
    socket.rotation.x = Math.PI / 2;
    socket.position.set(4.8, 0.5 + dy, 9.80);
    socket.name = `Body_Lab_Outlet_Socket_${dy < 0 ? "Lower" : "Upper"}`;
    benchGroup.add(socket);
  }

  // Official SREdesigns Badge
  const badge = makeSREdesignsBadge(0.65);
  badge.position.set(0, -2.0, -1.8);
  badge.rotation.x = -Math.PI / 6;
  benchGroup.add(badge);

  root.add(benchGroup);

  // -------------------------------------------------------------
  // 2. INBOARD CHASSIS REFERENCE BULKHEAD (STUB)
  // -------------------------------------------------------------
  const chassisStubGroup = new THREE.Group();
  chassisStubGroup.name = "Body_Monocoque_Nose_Stub";
  chassisStubGroup.position.set(0, 0, 0);

  const stubBody = new THREE.Mesh(new THREE.BoxGeometry(4.2, 4.0, 4.6), mats.carbonAero);
  stubBody.position.set(0.0, 2.5, 1.8);
  stubBody.castShadow = true;
  chassisStubGroup.add(stubBody);

  // Inboard wishbone mounting spigots
  const spigotGeos = new THREE.CylinderGeometry(0.08, 0.08, 0.45, 16);
  // Upper wishbone inboard pins
  for (const sx of [-1.2, 1.8]) {
    const pin = new THREE.Mesh(spigotGeos, mats.titaniumBright);
    pin.rotation.z = Math.PI / 2;
    pin.position.set(sx, 4.1, 2.9);
    pin.name = `Fastener_WishbonePin_Ti_Upper_${sx < 0 ? "Fwd" : "Aft"}`;
    chassisStubGroup.add(pin);
  }
  // Lower wishbone inboard pins (with anti-dive rake)
  for (const sx of [-1.4, 2.1]) {
    const pin = new THREE.Mesh(spigotGeos, mats.titaniumBright);
    pin.rotation.z = Math.PI / 2;
    pin.position.set(sx, 1.6, 2.5);
    pin.name = `Fastener_WishbonePin_Ti_Lower_${sx < 0 ? "Fwd" : "Aft"}`;
    chassisStubGroup.add(pin);
  }

  root.add(chassisStubGroup);
  registerExploded(chassisStubGroup, new THREE.Vector3(0, 0, -1), 1.2);

  // -------------------------------------------------------------
  // 3. OUTBOARD CORNER ASSEMBLY (UPRIGHT, BRAKES & WHEEL)
  // -------------------------------------------------------------
  const cornerGroup = new THREE.Group();
  cornerGroup.name = "Body_FrontWheelCorner_LH";
  cornerGroup.position.set(0, 0, 7.0); // Outboard wheel plane

  // Titanium 5-axis CNC upright
  const upright = new THREE.Mesh(new THREE.BoxGeometry(0.95, 2.8, 0.55), mats.titaniumBellcrank);
  upright.position.set(0, 2.8, 0);
  upright.castShadow = true;
  upright.name = "Body_Upright_Carrier_FrontLH_Titanium";
  cornerGroup.add(upright);

  // Mated Brake Disc & Caliper
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(1.725, 1.725, 0.34, 48), mats.carbonDisc);
  disc.rotation.x = Math.PI / 2;
  disc.position.set(0, 2.8, 0.15);
  disc.name = "Pivot_Brake_Disc_Ventilated_Front";
  cornerGroup.add(disc);

  const caliper = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.85, 0.95), mats.caliperAlLi);
  caliper.position.set(1.45, 3.4, 0.15);
  caliper.name = "Body_Brake_Caliper_Monobloc_Front";
  cornerGroup.add(caliper);

  // BBS 18" Magnesium Racing Rim
  const wheelRim = new THREE.Mesh(new THREE.CylinderGeometry(2.285, 2.285, 2.80, 48, 1, true), mats.wheelMagnesium);
  wheelRim.rotation.x = Math.PI / 2;
  wheelRim.position.set(0, 2.8, 0.85);
  wheelRim.name = "Pivot_Wheel_Magnesium_BBS_Front";
  cornerGroup.add(wheelRim);

  // Wheel Wake Deflector Board (steers with upright)
  const deflector = new THREE.Mesh(new THREE.BoxGeometry(0.08, 2.2, 1.8), mats.carbonAero);
  deflector.position.set(-1.25, 2.9, -0.65);
  deflector.name = "Body_WheelWake_Deflector_FrontLH";
  cornerGroup.add(deflector);

  root.add(cornerGroup);
  registerExploded(cornerGroup, new THREE.Vector3(0, 0, 1), 2.2);

  // -------------------------------------------------------------
  // 4. UPPER FRONT WISHBONE (A-ARM AERO PROFILE)
  // -------------------------------------------------------------
  const upperWishboneGroup = new THREE.Group();
  upperWishboneGroup.name = "Pivot_Wishbone_Upper_FrontLH";

  // Forward aero leg: from [-1.2, 4.1, 2.9] to [0, 4.1, 7.0]
  const upperLegFwdCurve = new THREE.LineCurve3(new THREE.Vector3(-1.2, 4.1, 2.9), new THREE.Vector3(0, 4.1, 7.0));
  const upperLegFwdGeo = new THREE.TubeGeometry(upperLegFwdCurve, 24, 0.12, 12, false);
  const upperLegFwd = new THREE.Mesh(upperLegFwdGeo, mats.carbonAero);
  upperWishboneGroup.add(upperLegFwd);

  // Rear aero leg: from [1.8, 4.05, 2.95] to [0, 4.1, 7.0]
  const upperLegAftCurve = new THREE.LineCurve3(new THREE.Vector3(1.8, 4.05, 2.95), new THREE.Vector3(0, 4.1, 7.0));
  const upperLegAftGeo = new THREE.TubeGeometry(upperLegAftCurve, 24, 0.12, 12, false);
  const upperLegAft = new THREE.Mesh(upperLegAftGeo, mats.carbonAero);
  upperWishboneGroup.add(upperLegAft);

  // Outboard spherical monoball bearing
  const upperUniball = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 16), mats.titaniumBright);
  upperUniball.position.set(0, 4.1, 7.0);
  upperUniball.name = "Fastener_Uniball_UpperOutboard_M10";
  upperWishboneGroup.add(upperUniball);

  root.add(upperWishboneGroup);
  registerExploded(upperWishboneGroup, new THREE.Vector3(0, 1, 0), 1.5);

  // -------------------------------------------------------------
  // 5. LOWER FRONT WISHBONE (WITH 14.2° ANTI-DIVE RAKE)
  // -------------------------------------------------------------
  const lowerWishboneGroup = new THREE.Group();
  lowerWishboneGroup.name = "Pivot_Wishbone_Lower_FrontLH";

  // Forward leg: [-1.4, 1.45, 2.45] to [0, 1.6, 6.8]
  const lowerLegFwdCurve = new THREE.LineCurve3(new THREE.Vector3(-1.4, 1.45, 2.45), new THREE.Vector3(0, 1.6, 6.8));
  const lowerLegFwdGeo = new THREE.TubeGeometry(lowerLegFwdCurve, 24, 0.16, 12, false);
  const lowerLegFwd = new THREE.Mesh(lowerLegFwdGeo, mats.carbonAero);
  lowerWishboneGroup.add(lowerLegFwd);

  // Rear leg: [2.1, 1.80, 2.60] to [0, 1.6, 6.8]
  const lowerLegAftCurve = new THREE.LineCurve3(new THREE.Vector3(2.1, 1.80, 2.60), new THREE.Vector3(0, 1.6, 6.8));
  const lowerLegAftGeo = new THREE.TubeGeometry(lowerLegAftCurve, 24, 0.16, 12, false);
  const lowerLegAft = new THREE.Mesh(lowerLegAftGeo, mats.carbonAero);
  lowerWishboneGroup.add(lowerLegAft);

  // Outboard M12 heavy-duty spherical bearing
  const lowerUniball = new THREE.Mesh(new THREE.SphereGeometry(0.20, 16, 16), mats.titaniumBright);
  lowerUniball.position.set(0, 1.6, 6.8);
  lowerUniball.name = "Fastener_Uniball_LowerOutboard_M12";
  lowerWishboneGroup.add(lowerUniball);

  root.add(lowerWishboneGroup);
  registerExploded(lowerWishboneGroup, new THREE.Vector3(0, -1, 0), 1.5);

  // -------------------------------------------------------------
  // 6. FRONT CARBON PULL-ROD (TENSION STRUT)
  // -------------------------------------------------------------
  const pullRodGroup = new THREE.Group();
  pullRodGroup.name = "Pivot_Suspension_PullRod_FrontLH";

  // Diagonal strut: from bottom of upright [0, 1.7, 6.9] to inboard rocker [0.45, 4.6, 1.1]
  const pullRodCurve = new THREE.LineCurve3(new THREE.Vector3(0, 1.7, 6.9), new THREE.Vector3(0.45, 4.6, 1.1));
  const pullRodGeo = new THREE.TubeGeometry(pullRodCurve, 32, 0.075, 16, false);
  const pullRodTube = new THREE.Mesh(pullRodGeo, mats.carbonAero);
  pullRodTube.castShadow = true;
  pullRodGroup.add(pullRodTube);

  // Titanium clevis forks at ends
  const clevisOut = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.28, 0.22), mats.titaniumBright);
  clevisOut.position.set(0, 1.7, 6.9);
  clevisOut.name = "Fastener_PullRod_Clevis_Outboard";
  pullRodGroup.add(clevisOut);

  const clevisIn = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.28, 0.22), mats.titaniumBright);
  clevisIn.position.set(0.45, 4.6, 1.1);
  clevisIn.name = "Fastener_PullRod_Clevis_Inboard";
  pullRodGroup.add(clevisIn);

  root.add(pullRodGroup);
  registerExploded(pullRodGroup, new THREE.Vector3(0.5, 0.5, 0.5), 1.6);

  // -------------------------------------------------------------
  // 7. INBOARD ROCKER, TORSION BAR & HEAVE DAMPER
  // -------------------------------------------------------------
  const rockerGroup = new THREE.Group();
  rockerGroup.name = "Pivot_Suspension_Rocker_Bellcrank";
  rockerGroup.position.set(0.45, 4.6, 1.1);

  // CNC Titanium triangular bellcrank
  const bellcrankMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.25, 6), mats.titaniumBellcrank);
  bellcrankMesh.rotation.z = Math.PI / 2;
  rockerGroup.add(bellcrankMesh);

  // Maraging 300 steel torsion bar quill shaft
  const torsionBar = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.8, 16), mats.maragingSteel);
  torsionBar.rotation.x = Math.PI / 2;
  torsionBar.position.set(0, 0, -0.9);
  torsionBar.name = "Body_TorsionBar_Front_Maraging300";
  rockerGroup.add(torsionBar);

  // Hydraulic Heave Damper
  const damper = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 1.4, 16), mats.damperGold);
  damper.rotation.y = Math.PI / 4;
  damper.position.set(-0.8, 0.2, 0.2);
  damper.name = "Body_HeaveDamper_Front_Hydraulic";
  rockerGroup.add(damper);

  root.add(rockerGroup);
  registerExploded(rockerGroup, new THREE.Vector3(0, 1, -1), 1.4);

  // -------------------------------------------------------------
  // 8. STEERING TRACK ROD (TIE-ROD)
  // -------------------------------------------------------------
  const tieRodGroup = new THREE.Group();
  tieRodGroup.name = "Pivot_Steering_TieRod_FrontLH";

  // From rack [-0.85, 2.6, 0.75] to upright horn [-0.75, 2.6, 6.8]
  const tieRodCurve = new THREE.LineCurve3(new THREE.Vector3(-0.85, 2.6, 0.75), new THREE.Vector3(-0.75, 2.6, 6.8));
  const tieRodGeo = new THREE.TubeGeometry(tieRodCurve, 24, 0.09, 12, false);
  const tieRodMesh = new THREE.Mesh(tieRodGeo, mats.carbonAero);
  tieRodGroup.add(tieRodMesh);

  const tieRodEndOut = new THREE.Mesh(new THREE.SphereGeometry(0.14, 16, 16), mats.titaniumBright);
  tieRodEndOut.position.set(-0.75, 2.6, 6.8);
  tieRodEndOut.name = "Fastener_TieRod_End_Outboard";
  tieRodGroup.add(tieRodEndOut);

  root.add(tieRodGroup);
  registerExploded(tieRodGroup, new THREE.Vector3(-1, 0, 0), 1.4);

  // -------------------------------------------------------------
  // 9. 4x ZYLON WHEEL TETHERS (7.0 kJ EACH)
  // -------------------------------------------------------------
  for (let z = 0; z < 4; z++) {
    const startY = z < 2 ? 4.1 : 1.6;
    const endY = z < 2 ? 4.1 : 1.6;
    const tetherCurve = new THREE.LineCurve3(new THREE.Vector3(0, startY, 2.9), new THREE.Vector3(0, endY, 6.9));
    const tetherGeo = new THREE.TubeGeometry(tetherCurve, 16, 0.025, 8, false);
    const tether = new THREE.Mesh(tetherGeo, mats.zylonTether);
    tether.name = `Body_WheelTether_Zylon_0${z + 1}`;
    root.add(tether);
  }

  scene.add(root);

  return {
    root,
    chassisStubGroup,
    cornerGroup,
    upperWishboneGroup,
    lowerWishboneGroup,
    pullRodGroup,
    rockerGroup,
    tieRodGroup,
    deflector,
    wheelRim,
    explodedParts,
    mats,
  };
}
