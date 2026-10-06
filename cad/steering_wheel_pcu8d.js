/**
 * steering_wheel_pcu8d.js — McLaren Applied PCU-8D Formula 1 Steering Wheel
 * SREdesigns - Samuel R Erwin III
 * 
 * Exhaustive 3D Procedural CAD Model matching User Reference Images:
 * - media_1790508291563.jpg (CAD Wireframe Topology)
 * - media_1790508291529.jpg (Rear Assembly with Quick-Release & Dual Paddles)
 * - media_1790508291547.jpg (Top Profile & Protrusion Depth)
 * - media_1790508290842.jpg (Photorealistic Color, Silkscreen & LCD UI)
 * 
 * Structural & Kinematic Architecture:
 * 1. Carbon Monocoque Main Body: Chamfered carbon twill shell, screen well, lower console tray, bottom guide fins
 * 2. Ergonomic Silicone Hand Grips: Left & right sculpted grips with thumb rests and finger swells
 * 3. 4.3" High-DPI PCU-8D Color LCD Display: Real-time telemetry, gear box, speed, tire temps, battery SoC
 * 4. 15-LED Shift Light Arch: 5 Green, 5 Red, 5 Blue LEDs with counter-bored bezels
 * 5. 6 Flanking Status Warning LEDs: 3 Left, 3 Right amber/white marshal indicators
 * 6. 3 Lower Multi-Position Rotary Dials: STRAT (Yellow 1-16), SYS/REVS (Multi-color), CTRL/TRQ (Multi-color)
 * 7. Knurled Thumbwheels:
 *    - Upper Left: Red horizontal knurled wheel ('ENTRY')
 *    - Upper Right: Blue horizontal knurled wheel
 *    - Mid Left: Gold horizontal knurled wheel ('BMIG')
 *    - Mid Right: Gold horizontal knurled wheel ('BBAL')
 *    - Lower Left: Silver vertical knurled thumbwheel
 *    - Lower Right: Green vertical knurled thumbwheel ('EB')
 * 8. Push Buttons with Authentic Silkscreen Labels:
 *    - Left: Black (+10 purple, DR orange, X red, White push, BB- black)
 *    - Right: PL yellow, +1 purple, OT blue, OT cyan, Radio green, BB+ black
 * 9. Rear Quick-Release Hub & Dual Carbon Paddles:
 *    - CNC Machined quick-release collar with splined center bore
 *    - Upper single-finger contoured carbon shift paddles (Up/Down)
 *    - Lower dual-stage carbon clutch launch paddles with finger loops
 */

import * as THREE from 'three';
import { materials } from '../materials.js';

/**
 * 1. Procedural High-DPI Silkscreen Texture Generators
 */

// Fine 2x2 twill carbon at real scale (about 2.5 mm tows), dark with a gloss clear coat (ref D3).
// The wheel's carbon parts get box-projected UVs in wheel units (dm) so the weave is the same size
// on every face instead of one stretched tile per face.
const TWILL_TILE_DM = 0.4; // one texture tile = 16 tows
let _twillTex = null;
function fineTwillTexture() {
  if (_twillTex) return _twillTex;
  const N = 16, px = 16, cv = document.createElement('canvas');
  cv.width = cv.height = N * px;
  const g = cv.getContext('2d');
  g.fillStyle = '#060708'; g.fillRect(0, 0, cv.width, cv.height);
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
    const horiz = ((i + j) % 4) < 2; // 2x2 twill: diagonal steps
    const x = i * px, y = j * px;
    const gr = horiz ? g.createLinearGradient(x, y, x, y + px) : g.createLinearGradient(x, y, x + px, y);
    gr.addColorStop(0, '#08090b'); gr.addColorStop(0.5, '#23262c'); gr.addColorStop(1, '#08090b');
    g.fillStyle = gr; g.fillRect(x + 0.5, y + 0.5, px - 1, px - 1);
  }
  const t = new THREE.CanvasTexture(cv);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  t.repeat.set(1 / TWILL_TILE_DM, 1 / TWILL_TILE_DM);
  return (_twillTex = t);
}
function boxProjectUVs(geo) {
  const pos = geo.attributes.position; if (!pos) return;
  if (!geo.attributes.normal) geo.computeVertexNormals();
  const nrm = geo.attributes.normal, uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    const ax = Math.abs(nrm.getX(i)), ay = Math.abs(nrm.getY(i)), az = Math.abs(nrm.getZ(i));
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    if (az >= ax && az >= ay) { uv[2 * i] = x; uv[2 * i + 1] = y; }
    else if (ax >= ay) { uv[2 * i] = y; uv[2 * i + 1] = z; }
    else { uv[2 * i] = x; uv[2 * i + 1] = z; }
  }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
}
function applyFineCarbon(root, glossSrc, matteSrc) {
  const gloss = new THREE.MeshPhysicalMaterial({ name: 'PCU8D_Carbon_FineTwill_Gloss', color: 0xffffff, map: fineTwillTexture(), roughness: 0.42, metalness: 0.15, clearcoat: 1.0, clearcoatRoughness: 0.06 });
  const matte = new THREE.MeshPhysicalMaterial({ name: 'PCU8D_Carbon_FineTwill_Satin', color: 0xd0d0d0, map: fineTwillTexture(), roughness: 0.6, metalness: 0.1, clearcoat: 0.3, clearcoatRoughness: 0.35 });
  const done = new Set();
  root.traverse((o) => {
    if (!o.isMesh) return;
    const m = o.material === glossSrc ? gloss : o.material === matteSrc ? matte : null;
    if (!m) return;
    if (!done.has(o.geometry)) { boxProjectUVs(o.geometry); done.add(o.geometry); }
    o.material = m;
  });
}

// Procedural Faceplate Silkscreen for the 3 Lower Rotary Dials
function createRotaryFaceplateTexture() {
  const w = 1024;
  const h = 512;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');

  // Dark matte carbon background
  ctx.fillStyle = '#0a0d12';
  ctx.fillRect(0, 0, w, h);

  // Carbon twill weave micro-pattern
  ctx.strokeStyle = '#12161f';
  ctx.lineWidth = 2;
  for (let i = 0; i < w + h; i += 8) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i - h, h);
    ctx.stroke();
  }

  // -------------------------------------------------------------
  // DIAL 1 (LEFT): "STRAT" (Yellow Arc with Numbers 1 to 16)
  // -------------------------------------------------------------
  const d1X = 180;
  const d1Y = 260;
  const r1 = 135;

  // "STRAT" Banner at top
  ctx.save();
  ctx.translate(d1X, d1Y - 145);
  ctx.fillStyle = '#f6b800';
  ctx.font = '900 32px "Arial Black", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('STRAT', 0, 0);
  ctx.restore();

  // Yellow Calibration Arc
  ctx.strokeStyle = '#f6b800';
  ctx.lineWidth = 26;
  ctx.beginPath();
  ctx.arc(d1X, d1Y, r1, Math.PI * 0.75, Math.PI * 2.25);
  ctx.stroke();

  // Number ticks 1 to 16
  for (let n = 1; n <= 16; n++) {
    const t = (n - 1) / 15;
    const ang = Math.PI * 0.75 + t * Math.PI * 1.5;
    const nx = d1X + Math.cos(ang) * (r1 + 2);
    const ny = d1Y + Math.sin(ang) * (r1 + 2);

    ctx.fillStyle = '#0a0d12';
    ctx.font = 'bold 18px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${n}`, nx, ny);
  }

  // -------------------------------------------------------------
  // DIAL 2 (CENTER): "SYS" / "REVS" / "DASH" / "BRIG" / "VOL"
  // Multi-color segmented arc (Red, Orange, Blue, Green)
  // -------------------------------------------------------------
  const d2X = 512;
  const d2Y = 260;
  const r2 = 135;

  // Header Labels
  ctx.fillStyle = '#00d4e8';
  ctx.font = 'bold 22px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('WET', d2X - 70, d2Y - 145);
  ctx.fillStyle = '#ffffff';
  ctx.fillText('SYS', d2X, d2Y - 145);
  ctx.fillStyle = '#d90429';
  ctx.fillText('DEF', d2X + 70, d2Y - 145);

  // Segment 1: Red (top-left)
  ctx.strokeStyle = '#d90429';
  ctx.lineWidth = 26;
  ctx.beginPath();
  ctx.arc(d2X, d2Y, r2, Math.PI * 0.75, Math.PI * 1.15);
  ctx.stroke();

  // Segment 2: Blue (top-center)
  ctx.strokeStyle = '#0077ff';
  ctx.beginPath();
  ctx.arc(d2X, d2Y, r2, Math.PI * 1.15, Math.PI * 1.6);
  ctx.stroke();

  // Segment 3: Green (top-right)
  ctx.strokeStyle = '#00c853';
  ctx.beginPath();
  ctx.arc(d2X, d2Y, r2, Math.PI * 1.6, Math.PI * 1.95);
  ctx.stroke();

  // Segment 4: Orange (bottom)
  ctx.strokeStyle = '#ff6d00';
  ctx.beginPath();
  ctx.arc(d2X, d2Y, r2, Math.PI * 1.95, Math.PI * 2.25);
  ctx.stroke();

  // Dial 2 Text labels
  const sysLabels = ['BRIG', 'DISP', 'DASH', 'REVS', 'VOL', 'CRUZ'];
  sysLabels.forEach((lbl, idx) => {
    const t = idx / (sysLabels.length - 1);
    const ang = Math.PI * 0.8 + t * Math.PI * 1.4;
    const lx = d2X + Math.cos(ang) * (r2 - 42);
    const ly = d2Y + Math.sin(ang) * (r2 - 42);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 15px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(lbl, lx, ly);
  });

  // -------------------------------------------------------------
  // DIAL 3 (RIGHT): "CTRL" / "TRQ" / "SHIFT" / "BW"
  // Multi-color segmented arc (Teal, Green, Red, Yellow)
  // -------------------------------------------------------------
  const d3X = 844;
  const d3Y = 260;
  const r3 = 135;

  ctx.fillStyle = '#f6b800';
  ctx.font = 'bold 22px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('SHIFT', d3X - 60, d3Y - 145);
  ctx.fillStyle = '#ffffff';
  ctx.fillText('CTRL', d3X, d3Y - 145);
  ctx.fillStyle = '#00d4e8';
  ctx.fillText('TRQ', d3X + 60, d3Y - 145);

  // Segment 1: Teal
  ctx.strokeStyle = '#00b4d8';
  ctx.lineWidth = 26;
  ctx.beginPath();
  ctx.arc(d3X, d3Y, r3, Math.PI * 0.75, Math.PI * 1.25);
  ctx.stroke();

  // Segment 2: Red
  ctx.strokeStyle = '#d90429';
  ctx.beginPath();
  ctx.arc(d3X, d3Y, r3, Math.PI * 1.25, Math.PI * 1.7);
  ctx.stroke();

  // Segment 3: Green
  ctx.strokeStyle = '#00e676';
  ctx.beginPath();
  ctx.arc(d3X, d3Y, r3, Math.PI * 1.7, Math.PI * 2.25);
  ctx.stroke();

  // Numbers 1-12
  for (let n = 1; n <= 12; n++) {
    const t = (n - 1) / 11;
    const ang = Math.PI * 0.78 + t * Math.PI * 1.44;
    const nx = d3X + Math.cos(ang) * r3;
    const ny = d3Y + Math.sin(ang) * r3;
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${n}`, nx, ny);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = 16;
  return tex;
}

// Procedural High-DPI PCU-8D LCD Telemetry Screen Texture
function createLcdScreenTexture(data = {}) {
  const w = 1024;
  const h = 640;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');

  const speed = data.speed !== undefined ? Math.round(data.speed) : 52;
  const gear = data.gear !== undefined ? (data.gear === 0 ? 'N' : `${data.gear}`) : 'N';
  const rpm = data.rpm !== undefined ? Math.round(data.rpm) : 10500;
  const lap = data.lap || 0;
  const bbal = data.bbal || 52.0;
  const soc = data.soc !== undefined ? data.soc : 100;

  // Background
  ctx.fillStyle = '#060a10';
  ctx.fillRect(0, 0, w, h);

  // Outer blue screen border
  ctx.strokeStyle = '#1e385c';
  ctx.lineWidth = 6;
  ctx.strokeRect(10, 10, w - 20, h - 20);

  // 1. TOP HEADER STRIP: LAP TIME & LAP COUNT
  ctx.fillStyle = '#0b1422';
  ctx.fillRect(16, 16, w - 32, 70);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 36px monospace';
  ctx.textAlign = 'left';
  ctx.fillText('LAST: 0.00.00', 35, 62);

  ctx.textAlign = 'right';
  ctx.fillStyle = '#f6b800';
  ctx.fillText(`${lap} LAP`, w - 35, 62);

  // 2. CENTRAL GEAR BOX
  const gbX = w * 0.42;
  const gbY = 110;
  const gbW = 160;
  const gbH = 220;

  ctx.fillStyle = '#0e1e36';
  ctx.fillRect(gbX, gbY, gbW, gbH);
  ctx.strokeStyle = '#00d4e8';
  ctx.lineWidth = 8;
  ctx.strokeRect(gbX, gbY, gbW, gbH);

  // Big Gear Letter
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 160px "Arial Black", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(gear, gbX + gbW / 2, gbY + gbH / 2);

  // 3. SPEED READOUT (Top Right)
  ctx.fillStyle = '#f6b800';
  ctx.font = 'bold 74px "Arial Black", monospace';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'top';
  ctx.fillText(`${speed}.0`, w - 45, 115);

  ctx.fillStyle = '#8b9bb0';
  ctx.font = 'bold 24px sans-serif';
  ctx.fillText('KM/H', w - 45, 195);

  // Delta time below speed
  ctx.fillStyle = '#00e676';
  ctx.font = 'bold 42px monospace';
  ctx.fillText('+0.00', w - 45, 235);
  ctx.fillStyle = '#ffffff';
  ctx.font = '22px monospace';
  ctx.fillText('TAR: 0.00', w - 45, 285);

  // 4. BRAKE BALANCE & TIRE TEMP BOXES (Left & Center)
  ctx.fillStyle = '#8b9bb0';
  ctx.font = 'bold 20px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('FRONT', 80, 230);
  ctx.fillText('REAR', 80, 310);

  // 4x Tire Temp Numbers (Front L/R, Rear L/R)
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 36px monospace';
  ctx.fillText('70', 170, 230);
  ctx.fillText('70', 250, 230);
  ctx.fillText('70', 170, 310);
  ctx.fillText('70', 250, 310);

  // 5. BATTERY SoC (Green Vertical Ladder Meter)
  const socX = w * 0.65;
  const socY = 110;
  const socW = 28;
  const socH = 220;

  ctx.fillStyle = '#141e28';
  ctx.fillRect(socX, socY, socW, socH);

  // Active Green Bar
  const fillH = (soc / 100) * socH;
  ctx.fillStyle = '#00e676';
  ctx.fillRect(socX, socY + (socH - fillH), socW, fillH);

  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.strokeRect(socX, socY, socW, socH);

  // SoC 100% Text
  ctx.fillStyle = '#00e676';
  ctx.font = 'bold 36px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(`${soc}`, socX + socW / 2 + 50, socY + 110);
  ctx.font = 'bold 18px sans-serif';
  ctx.fillText('BATT', socX + socW / 2 + 50, socY + 70);

  // 6. BOTTOM TELEMETRY VALUES (Water, Oil, Gearbox Temps)
  ctx.fillStyle = '#0e1622';
  ctx.fillRect(16, h - 130, w - 32, 110);
  ctx.strokeStyle = '#1e385c';
  ctx.lineWidth = 3;
  ctx.strokeRect(16, h - 130, w - 32, 110);

  ctx.fillStyle = '#d90429';
  ctx.font = 'bold 24px monospace';
  ctx.textAlign = 'left';
  ctx.fillText('WATER: 80°C', 45, h - 85);
  ctx.fillStyle = '#ff6d00';
  ctx.fillText('OIL: 40°C', 320, h - 85);
  ctx.fillStyle = '#00d4e8';
  ctx.fillText('GBOX: 40°C', 560, h - 85);
  ctx.fillStyle = '#f6b800';
  ctx.fillText(`BBAL: ${bbal}%`, 780, h - 85);

  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = 16;
  return tex;
}


/**
 * 2. Main PCU-8D Steering Wheel Constructor
 */
export function createSteeringWheelPCU8D(options = {}) {
  const root = new THREE.Group();
  root.name = 'McLaren_Applied_PCU8D_Steering_Wheel';

  // Materials Palette
  const carbonTwill = materials.carbonGlossAero || materials.carbonGloss;
  const carbonMatte = materials.carbonMatteStructural || materials.carbonMatte;
  // matte grey alcantara grips (refs round4/wheel W3, W6)
  const gripSilicone = new THREE.MeshPhysicalMaterial({ name: 'PCU8D_Grip_Alcantara', color: 0x5f6268, roughness: 0.98, metalness: 0, sheen: 0.7, sheenRoughness: 0.8, sheenColor: new THREE.Color(0x9a9ea6) });
  const anodizedRed = materials.anodizedRed;
  const anodizedBlue = materials.anodizedBlue;
  const anodizedGold = materials.goldActuator;
  const titaniumMetal = materials.titaniumBright;

  // -------------------------------------------------------------
  // A. MAIN CARBON FIBER MONOCOQUE CHASSIS
  // Exact profile matching media_1790508291563.jpg & media_1790508290842.jpg
  // Dimensions: Width ~ 2.8 dm (280mm), Height ~ 1.8 dm (180mm), Depth ~ 0.32 dm (32mm)
  // -------------------------------------------------------------
  const chassisShape = new THREE.Shape();
  // Top horizontal arch with central dip
  chassisShape.moveTo(-1.25, 0.75);
  chassisShape.quadraticCurveTo(0, 0.82, 1.25, 0.75);
  chassisShape.quadraticCurveTo(1.42, 0.72, 1.45, 0.52);
  // Right grip inner cutout
  chassisShape.lineTo(1.45, 0.25);
  chassisShape.quadraticCurveTo(1.18, 0.15, 1.15, -0.25);
  chassisShape.quadraticCurveTo(1.18, -0.65, 1.45, -0.72);
  chassisShape.lineTo(1.42, -0.92);
  // Bottom chassis edge with right guide fin
  chassisShape.lineTo(0.95, -0.92);
  chassisShape.lineTo(0.85, -1.22); // Right bottom pointed guide tab
  chassisShape.lineTo(0.72, -0.92);
  chassisShape.quadraticCurveTo(0, -0.85, -0.72, -0.92);
  chassisShape.lineTo(-0.85, -1.22); // Left bottom pointed guide tab
  chassisShape.lineTo(-0.95, -0.92);
  // Left grip inner cutout
  chassisShape.lineTo(-1.42, -0.92);
  chassisShape.quadraticCurveTo(-1.18, -0.65, -1.15, -0.25);
  chassisShape.quadraticCurveTo(-1.18, 0.15, -1.45, 0.25);
  chassisShape.lineTo(-1.45, 0.52);
  chassisShape.quadraticCurveTo(-1.42, 0.72, -1.25, 0.75);
  chassisShape.closePath();

  // Central LCD Display Hole
  const lcdHole = new THREE.Path();
  const hw = 0.62;
  const hh = 0.40;
  const hy = 0.18;
  lcdHole.moveTo(-hw, hy - hh);
  lcdHole.lineTo(hw, hy - hh);
  lcdHole.lineTo(hw, hy + hh);
  lcdHole.lineTo(-hw, hy + hh);
  lcdHole.closePath();
  chassisShape.holes.push(lcdHole);

  const chassisExtrude = {
    steps: 2,
    depth: 0.32,
    bevelEnabled: true,
    bevelThickness: 0.04,
    bevelSize: 0.04,
    bevelSegments: 4
  };
  const chassisGeo = new THREE.ExtrudeGeometry(chassisShape, chassisExtrude);
  chassisGeo.center();
  const chassisMesh = new THREE.Mesh(chassisGeo, carbonTwill);
  chassisMesh.castShadow = true;
  chassisMesh.receiveShadow = true;
  chassisMesh.name = 'Chassis_Carbon_Monocoque';
  root.add(chassisMesh);

  // -------------------------------------------------------------
  // B. ERGONOMIC SILICONE HAND GRIPS (Left & Right)
  // Sculpted grips matching media_1790508291563.jpg & media_1790508290842.jpg
  // -------------------------------------------------------------
  [-1, 1].forEach((side) => {
    const isLeft = side < 0;
    const gripGroup = new THREE.Group();
    gripGroup.name = `Ergonomic_HandGrip_${isLeft ? 'Left' : 'Right'}`;

    // Main sculpted grip column
    const gripCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(side * 1.35, 0.52, 0.02),
      new THREE.Vector3(side * 1.38, 0.10, 0.04), // Thumb rest bulge
      new THREE.Vector3(side * 1.36, -0.35, 0.02), // Palm swell
      new THREE.Vector3(side * 1.32, -0.85, 0.00),
      new THREE.Vector3(side * 1.30, -1.25, -0.02)  // Bottom flared end
    ]);

    const gripGeo = new THREE.TubeGeometry(gripCurve, 32, 0.20, 16, false);
    gripGeo.scale(1.2, 1.0, 1.4); // Flatten slightly laterally for authentic anatomical grip
    const gripMesh = new THREE.Mesh(gripGeo, gripSilicone);
    gripMesh.castShadow = true;
    gripGroup.add(gripMesh);

    // Silicone Index Finger Notches
    for (let f = 0; f < 3; f++) {
      const fGeo = new THREE.BoxGeometry(0.12, 0.14, 0.32);
      const fMesh = new THREE.Mesh(fGeo, gripSilicone);
      fMesh.position.set(side * 1.48, -0.2 - f * 0.28, -0.12);
      gripGroup.add(fMesh);
    }

    root.add(gripGroup);
  });

  // -------------------------------------------------------------
  // C. 4.3" PCU-8D COLOR LCD DISPLAY WITH RECESSED FRAME
  // -------------------------------------------------------------
  const lcdTex = createLcdScreenTexture(options);
  const lcdMat = new THREE.MeshBasicMaterial({ map: lcdTex });
  const lcdGeo = new THREE.PlaneGeometry(1.20, 0.76);
  const lcdMesh = new THREE.Mesh(lcdGeo, lcdMat);
  lcdMesh.position.set(0, 0.18, 0.14); // Flush in recessed well
  lcdMesh.name = 'UI_LCD_PCU8D_Display';
  root.add(lcdMesh);

  // Anti-reflective Protective Glass Lens
  const glassGeo = new THREE.PlaneGeometry(1.22, 0.78);
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    transmission: 0.95,
    roughness: 0.06,
    ior: 1.52,
    reflectivity: 0.5
  });
  const glassMesh = new THREE.Mesh(glassGeo, glassMat);
  glassMesh.position.set(0, 0.18, 0.145);
  root.add(glassMesh);

  // -------------------------------------------------------------
  // D. 15-LED SHIFT LIGHT ARRAY & 6 FLANKING STATUS LEDS
  // Matching media_1790508291563.jpg & media_1790508290842.jpg
  // -------------------------------------------------------------
  const shiftGroup = new THREE.Group();
  shiftGroup.name = 'ShiftLights_15LED_Array';

  const numShiftLeds = 15;
  const archW = 1.05;
  const ledSpacing = archW / (numShiftLeds - 1);

  for (let i = 0; i < numShiftLeds; i++) {
    const lx = -archW / 2 + i * ledSpacing;
    // Slight curved arch rise in center
    const lz = 0.65 + (1.0 - Math.pow(lx / (archW / 2), 2.0)) * 0.04;

    let ledMat = materials.ledGreen; // First 5: Green (Entry / Low RPM)
    if (i >= 5 && i < 10) ledMat = materials.ledRed;   // Middle 5: Red (Optimum Powerband)
    if (i >= 10) ledMat = materials.ledBlue;          // Last 5: Blue (Upshift Flash)

    // Outer counter-bored bezel
    const bezelGeo = new THREE.CylinderGeometry(0.035, 0.035, 0.04, 16);
    const bezel = new THREE.Mesh(bezelGeo, carbonMatte);
    bezel.rotation.x = Math.PI / 2;
    bezel.position.set(lx, lz, 0.17);
    shiftGroup.add(bezel);

    // Glowing LED lens
    const ledGeo = new THREE.SphereGeometry(0.024, 12, 12);
    const led = new THREE.Mesh(ledGeo, ledMat);
    led.name = `ShiftLED_${i}`;
    led.position.set(lx, lz, 0.185);
    shiftGroup.add(led);
  }

  // 6 Flanking Display Status LEDs (3 Left, 3 Right)
  [-1, 1].forEach((side) => {
    for (let j = 0; j < 3; j++) {
      const sy = 0.32 - j * 0.16;
      const sx = side * 0.72;

      const sBezelGeo = new THREE.CylinderGeometry(0.032, 0.032, 0.03, 12);
      const sBezel = new THREE.Mesh(sBezelGeo, carbonMatte);
      sBezel.rotation.x = Math.PI / 2;
      sBezel.position.set(sx, sy, 0.165);
      shiftGroup.add(sBezel);

      const sLedGeo = new THREE.SphereGeometry(0.020, 10, 10);
      const sLed = new THREE.Mesh(sLedGeo, materials.ledAmber);
      sLed.name = `StatusLED_${side < 0 ? 'L' : 'R'}_${j}`;
      sLed.position.set(sx, sy, 0.178);
      shiftGroup.add(sLed);
    }
  });

  root.add(shiftGroup);

  // -------------------------------------------------------------
  // E. 3 LOWER MULTI-POSITION ROTARY DIALS WITH TEARDROP POINTERS
  // Matching media_1790508291563.jpg & media_1790508290842.jpg
  // -------------------------------------------------------------
  const rotaryGroup = new THREE.Group();
  rotaryGroup.name = 'Lower_Rotary_Console_Tray';

  // Silkscreen Calibration Faceplate Quad
  const rfTex = createRotaryFaceplateTexture();
  const rfMat = new THREE.MeshStandardMaterial({
    map: rfTex,
    roughness: 0.4,
    metalness: 0.2
  });
  const rfGeo = new THREE.PlaneGeometry(1.45, 0.65);
  const rfMesh = new THREE.Mesh(rfGeo, rfMat);
  rfMesh.position.set(0, -0.55, 0.165);
  rotaryGroup.add(rfMesh);

  // 3 Physical Rotary Knobs with Teardrop Pointers
  [-0.48, 0, 0.48].forEach((rx, idx) => {
    const knobGroup = new THREE.Group();
    knobGroup.position.set(rx, -0.55, 0.17);
    knobGroup.name = `Rotary_Knob_${['STRAT', 'SYS', 'CTRL'][idx]}`;

    // Circular Base Hub
    const baseGeo = new THREE.CylinderGeometry(0.16, 0.18, 0.08, 24);
    const baseMesh = new THREE.Mesh(baseGeo, carbonMatte);
    baseMesh.rotation.x = Math.PI / 2;
    knobGroup.add(baseMesh);

    // Teardrop Pointer Body
    const pointerShape = new THREE.Shape();
    pointerShape.moveTo(-0.06, -0.12);
    pointerShape.lineTo(0.06, -0.12);
    pointerShape.lineTo(0.04, 0.18); // Pointed top
    pointerShape.lineTo(0, 0.24);
    pointerShape.lineTo(-0.04, 0.18);
    pointerShape.closePath();

    const pointerExtrude = { steps: 1, depth: 0.12, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 3 };
    const pointerGeo = new THREE.ExtrudeGeometry(pointerShape, pointerExtrude);
    pointerGeo.center();
    const pointerMesh = new THREE.Mesh(pointerGeo, materials.siliconeSeal || carbonMatte);
    pointerMesh.position.set(0, 0, 0.08);
    knobGroup.add(pointerMesh);

    // Raised White Alignment Line on Pointer
    const lineGeo = new THREE.BoxGeometry(0.015, 0.22, 0.04);
    const lineMesh = new THREE.Mesh(lineGeo, materials.oracleWhite || titaniumMetal);
    lineMesh.position.set(0, 0.02, 0.15);
    knobGroup.add(lineMesh);

    rotaryGroup.add(knobGroup);
  });

  root.add(rotaryGroup);

  // -------------------------------------------------------------
  // F. KNURLED THUMBWHEELS & ROTARY ENCODERS
  // Matching media_1790508291563.jpg & media_1790508290842.jpg
  // -------------------------------------------------------------
  // 1. Upper Left: Red Horizontal Thumbwheel ('ENTRY')
  const ulWheelGeo = new THREE.CylinderGeometry(0.09, 0.09, 0.18, 20);
  const ulWheel = new THREE.Mesh(ulWheelGeo, anodizedRed);
  ulWheel.rotation.z = Math.PI / 2;
  ulWheel.position.set(-1.18, 0.42, 0.15);
  ulWheel.name = 'Thumbwheel_Entry_Red';
  root.add(ulWheel);

  // 2. Upper Right: Blue Horizontal Thumbwheel
  const urWheelGeo = new THREE.CylinderGeometry(0.09, 0.09, 0.18, 20);
  const urWheel = new THREE.Mesh(urWheelGeo, anodizedBlue);
  urWheel.rotation.z = Math.PI / 2;
  urWheel.position.set(1.18, 0.42, 0.15);
  urWheel.name = 'Thumbwheel_UpperRight_Blue';
  root.add(urWheel);

  // 3. Mid Left: Gold Horizontal Thumbwheel ('BMIG')
  const mlWheelGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.16, 20);
  const mlWheel = new THREE.Mesh(mlWheelGeo, anodizedGold);
  mlWheel.rotation.z = Math.PI / 2;
  mlWheel.position.set(-1.15, 0.15, 0.14);
  mlWheel.name = 'Thumbwheel_BMIG_Gold';
  root.add(mlWheel);

  // 4. Mid Right: Gold Horizontal Thumbwheel ('BBAL')
  const mrWheelGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.16, 20);
  const mrWheel = new THREE.Mesh(mrWheelGeo, anodizedGold);
  mrWheel.rotation.z = Math.PI / 2;
  mrWheel.position.set(1.15, 0.15, 0.14);
  mrWheel.name = 'Thumbwheel_BBAL_Gold';
  root.add(mrWheel);

  // 5. Lower Left: Silver Vertical Knurled Thumbwheel
  const llWheelGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.16, 20);
  const llWheel = new THREE.Mesh(llWheelGeo, titaniumMetal);
  llWheel.position.set(-1.12, -0.22, 0.14);
  llWheel.name = 'Thumbwheel_Silver_Vertical';
  root.add(llWheel);

  // 6. Lower Right: Green Vertical Knurled Thumbwheel ('EB' - Engine Braking)
  const greenMat = new THREE.MeshStandardMaterial({ color: 0x00c853, roughness: 0.35, metalness: 0.6 });
  const lrWheelGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.16, 20);
  const lrWheel = new THREE.Mesh(lrWheelGeo, greenMat);
  lrWheel.position.set(1.12, -0.22, 0.14);
  lrWheel.name = 'Thumbwheel_EB_Green';
  root.add(lrWheel);

  // -------------------------------------------------------------
  // G. AUTHENTIC PHYSICAL PUSH BUTTONS & SILKSCREEN LABELS
  // Matching media_1790508290842.jpg
  // -------------------------------------------------------------
  function createButton(x, y, radius, color, label, textColor = '#ffffff', id = label) {
    const btnGroup = new THREE.Group();
    btnGroup.name = `Btn_${id}`; // ids are used by cad/wheel_button_map.json
    btnGroup.position.set(x, y, 0.16);

    // Bezel ring
    const bezelGeo = new THREE.CylinderGeometry(radius * 1.25, radius * 1.25, 0.04, 16);
    const bezel = new THREE.Mesh(bezelGeo, carbonMatte);
    bezel.rotation.x = Math.PI / 2;
    btnGroup.add(bezel);

    // Depressible colored cap
    const capGeo = new THREE.CylinderGeometry(radius, radius, 0.06, 16);
    const capMat = new THREE.MeshStandardMaterial({
      color: color,
      roughness: 0.45,
      metalness: 0.15
    });
    const cap = new THREE.Mesh(capGeo, capMat);
    cap.rotation.x = Math.PI / 2;
    cap.position.z = 0.03;
    cap.name = `Btn_${id}_Cap`;
    btnGroup.add(cap);

    // Silkscreen Text Decal
    if (label) {
      const cv = document.createElement('canvas');
      cv.width = 128;
      cv.height = 128;
      const ctx = cv.getContext('2d');
      ctx.fillStyle = 'rgba(0,0,0,0)';
      ctx.fillRect(0, 0, 128, 128);

      ctx.fillStyle = textColor;
      ctx.font = '900 64px "Arial Black", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, 64, 64);

      const tTex = new THREE.CanvasTexture(cv);
      const tMat = new THREE.MeshBasicMaterial({ map: tTex, transparent: true });
      const tGeo = new THREE.PlaneGeometry(radius * 1.6, radius * 1.6);
      const tMesh = new THREE.Mesh(tGeo, tMat);
      tMesh.position.z = 0.062;
      btnGroup.add(tMesh);
    }

    return btnGroup;
  }

  // --- Left Button Cluster ---
  // Top Outer: Black button
  root.add(createButton(-1.25, 0.65, 0.08, 0x141820, 'N', '#ffffff', 'N'));
  // Top Inner 1: Purple (+10)
  root.add(createButton(-0.95, 0.62, 0.075, 0x8a2be2, '+10', '#ffffff', 'PLUS10'));
  // Top Inner 2: Orange (DR)
  root.add(createButton(-0.68, 0.52, 0.08, 0xff7700, 'DR', '#ffffff', 'DRINK'));
  // Mid Left: White push button
  root.add(createButton(-0.92, -0.20, 0.07, 0xf0f4f8, 'OK', '#111111', 'OK'));
  // Mid Lower Left: Red button with white X
  root.add(createButton(-0.92, -0.42, 0.075, 0xd90429, '✕', '#ffffff', 'BACK'));
  // Bottom Left Outer: Black button (BB-)
  root.add(createButton(-0.95, -0.68, 0.08, 0x181e26, 'BB-', '#ffffff', 'BB_MINUS'));

  // --- Right Button Cluster ---
  // Top Inner 1: Yellow (PL - Pit Lane Limiter)
  root.add(createButton(0.68, 0.52, 0.08, 0xf6b800, 'PL', '#000000', 'PL'));
  // Top Inner 2: Purple (+1)
  root.add(createButton(0.95, 0.62, 0.075, 0x8a2be2, '+1', '#ffffff', 'PLUS1'));
  // Top Outer: Light Blue (OT - Overtake)
  root.add(createButton(1.25, 0.65, 0.08, 0x00b4d8, 'OT', '#ffffff', 'OT'));
  // Mid Right 1: Cyan (OT)
  root.add(createButton(0.92, -0.15, 0.075, 0x00d4e8, 'X', '#000000', 'AERO'));
  // Mid Right 2: Green (Radio / Phone icon)
  root.add(createButton(0.92, -0.40, 0.075, 0x00c853, '📞', '#ffffff', 'RADIO'));
  // Bottom Right Outer: Black button (BB+)
  root.add(createButton(0.95, -0.68, 0.08, 0x181e26, 'BB+', '#ffffff', 'BB_PLUS'));

  // -------------------------------------------------------------
  // H. REAR ASSEMBLY: QUICK-RELEASE HUB & CARBON PADDLES
  // Matching media_1790508291529.jpg (Rear View)
  // -------------------------------------------------------------
  const rearGroup = new THREE.Group();
  rearGroup.position.set(0, 0, -0.18);
  rearGroup.name = 'Rear_QuickRelease_And_Paddles';

  // 1. Precision CNC Machined Quick-Release Hub Collar
  const qrCollarGeo = new THREE.CylinderGeometry(0.38, 0.44, 0.18, 32);
  const qrCollar = new THREE.Mesh(qrCollarGeo, titaniumMetal);
  qrCollar.rotation.x = Math.PI / 2;
  rearGroup.add(qrCollar);

  // Splined center bore
  const boreGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.20, 24);
  const bore = new THREE.Mesh(boreGeo, carbonMatte);
  bore.rotation.x = Math.PI / 2;
  bore.position.z = -0.01;
  rearGroup.add(bore);

  // 2. Upper Carbon Shift Rocker Paddles (Up/Down Shift - media_1790508291529.jpg)
  [-1, 1].forEach((side) => {
    const isLeft = side < 0;
    const shiftPaddleGroup = new THREE.Group();
    shiftPaddleGroup.position.set(side * 0.75, 0.22, -0.08);
    shiftPaddleGroup.name = `Paddle_Shift_${isLeft ? 'Down_LH' : 'Up_RH'}`;

    // Carbon hinge arm
    const armGeo = new THREE.BoxGeometry(0.55, 0.12, 0.08);
    const arm = new THREE.Mesh(armGeo, carbonMatte);
    arm.position.x = side * 0.25;
    shiftPaddleGroup.add(arm);

    // Contoured single-finger carbon paddle blade
    const bladeShape = new THREE.Shape();
    bladeShape.moveTo(0, -0.32);
    bladeShape.lineTo(0.18, -0.28);
    bladeShape.quadraticCurveTo(0.24, 0, 0.18, 0.28);
    bladeShape.lineTo(0, 0.32);
    bladeShape.quadraticCurveTo(-0.06, 0, 0, -0.32);
    bladeShape.closePath();

    const bladeExtrude = { steps: 1, depth: 0.03, bevelEnabled: true, bevelThickness: 0.01, bevelSize: 0.01, bevelSegments: 2 };
    const bladeGeo = new THREE.ExtrudeGeometry(bladeShape, bladeExtrude);
    bladeGeo.center();
    const bladeMesh = new THREE.Mesh(bladeGeo, carbonTwill);
    bladeMesh.position.set(side * 0.52, 0, -0.04);
    shiftPaddleGroup.add(bladeMesh);

    rearGroup.add(shiftPaddleGroup);
  });

  // 3. Lower Dual-Stage Carbon Clutch Launch Paddles (media_1790508291529.jpg)
  [-1, 1].forEach((side) => {
    const isLeft = side < 0;
    const clutchPaddleGroup = new THREE.Group();
    clutchPaddleGroup.position.set(side * 0.75, -0.38, -0.08);
    clutchPaddleGroup.name = `Paddle_Clutch_${isLeft ? 'LH' : 'RH'}`;

    // Carbon hinge arm
    const armGeo = new THREE.BoxGeometry(0.55, 0.10, 0.08);
    const arm = new THREE.Mesh(armGeo, carbonMatte);
    arm.position.x = side * 0.25;
    clutchPaddleGroup.add(arm);

    // Contoured multi-finger carbon clutch blade
    const bladeShape = new THREE.Shape();
    bladeShape.moveTo(0, -0.42);
    bladeShape.lineTo(0.20, -0.38);
    bladeShape.quadraticCurveTo(0.28, 0, 0.20, 0.38);
    bladeShape.lineTo(0, 0.42);
    bladeShape.quadraticCurveTo(-0.08, 0, 0, -0.42);
    bladeShape.closePath();

    const bladeExtrude = { steps: 1, depth: 0.03, bevelEnabled: true, bevelThickness: 0.01, bevelSize: 0.01, bevelSegments: 2 };
    const bladeGeo = new THREE.ExtrudeGeometry(bladeShape, bladeExtrude);
    bladeGeo.center();
    const bladeMesh = new THREE.Mesh(bladeGeo, carbonTwill);
    bladeMesh.position.set(side * 0.52, 0, -0.04);
    clutchPaddleGroup.add(bladeMesh);

    rearGroup.add(clutchPaddleGroup);
  });

  root.add(rearGroup);

  applyFineCarbon(root, carbonTwill, carbonMatte);
  return root;
}
