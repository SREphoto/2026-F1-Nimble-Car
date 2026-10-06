/**
 * steering_wheel_pcu8d.js — PCU-8D style Formula 1 steering wheel, built part by part
 * SREdesigns - Samuel R Erwin III
 *
 * Exact-twin rebuild from the round-4 wheel references (W1 hands, W2 3/4 wire, W3 3/4 textured,
 * W4 front wire, W5 top wire, W6 rear with paddles). Every part, its position and size come from
 * cad/wheel_parts.json (measured on W4 at 2.90 dm overall width; depths from W5, rear from W6,
 * colours and silkscreen from W3):
 *   carbon shell (top wing bar over the grips, centre body, side towers, necks, windows),
 *   sculpted alcantara grips, grey display bezel with stepped corners, LCD, 10 shift LEDs,
 *   6 status LEDs, 12 octagonal push buttons, 6 knurled thumbwheels, 3 rotaries with teardrop
 *   pointers on a silkscreened tray, conical quick-release hub with flange, 4 lobed carbon paddles.
 * Object names match cad/wheel_button_map.json (Btn_<id>, Rotary_Knob_*, Thumbwheel_*, Paddle_*,
 * UI_LCD_PCU8D_Display, ShiftLEDs, StatusLEDs) so cad/wheel_controls.js drives them.
 * Wheel-local frame: X across (driver's view: +X on the right), Y up, Z out of the face (toward
 * the driver). Units dm.
 */

import * as THREE from 'three';
import { materials } from '../materials.js';
import WHEEL_PARTS from './wheel_parts.json' with { type: 'json' };
export { WHEEL_PARTS };
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



// Silkscreened dial tray (W3): coloured scales and labels round each rotary, drawn in wheel units
function createDialTrayTexture(rotaries, x0, y0, x1, y1) {
  const PX = 1100, w = Math.round((x1 - x0) * PX), h = Math.round((y1 - y0) * PX);
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  const g = cv.getContext('2d');
  g.clearRect(0, 0, w, h);
  const toC = (x, y) => [(x - x0) * PX, (y1 - y) * PX];
  const scales = {
    STRAT: { arcs: [['#f6b800', 0.75, 2.25]], nums: 16, numCol: '#0a0d12', head: [['STRAT', '#f6b800', 0]] },
    SYS: { arcs: [['#d90429', 0.75, 1.15], ['#2f6bff', 1.15, 1.6], ['#00c853', 1.6, 1.95], ['#ff6d00', 1.95, 2.25]], nums: 16, numCol: '#ffffff', head: [['WET', '#00d4e8', -0.6], ['SYS', '#ffffff', 0], ['DEF', '#d90429', 0.6]], words: ['BRIG', 'DISP', 'DASH', 'REVS', 'VOL', 'CRUZ'] },
    CTRL: { arcs: [['#00b4d8', 0.75, 1.25], ['#d90429', 1.25, 1.7], ['#00e676', 1.7, 2.25]], nums: 12, numCol: '#ffffff', head: [['SHIFT', '#f6b800', -0.55], ['CTRL', '#ffffff', 0], ['TRQ', '#00d4e8', 0.55]], words: ['GW', 'INT', 'CTRL', 'TRQ'] },
  };
  rotaries.forEach((r) => {
    const sc = scales[r.scale]; const [cx, cy] = toC(r.at[0], r.at[1]); const R = (r.d / 2 + 0.035) * PX, lw = 0.03 * PX;
    sc.arcs.forEach(([col, a0, a1]) => { g.strokeStyle = col; g.lineWidth = lw; g.beginPath(); g.arc(cx, cy, R, Math.PI * a0, Math.PI * a1); g.stroke(); });
    g.textAlign = 'center'; g.textBaseline = 'middle';
    for (let n = 1; n <= sc.nums; n++) {
      const a = Math.PI * (0.75 + 1.5 * (n - 1) / (sc.nums - 1));
      g.fillStyle = sc.numCol; g.font = `bold ${Math.round(lw * 0.62)}px Arial, sans-serif`;
      g.fillText(String(n), cx + Math.cos(a) * R, cy + Math.sin(a) * R);
    }
    (sc.words || []).forEach((wd, k, arr) => {
      const a = Math.PI * (0.62 + 0.76 * k / Math.max(1, arr.length - 1)); const rr = R + lw * 1.25;
      g.fillStyle = '#ffffff'; g.font = `bold ${Math.round(lw * 0.5)}px Arial, sans-serif`;
      g.fillText(wd, cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
    });
    sc.head.forEach(([t, col, dx]) => { g.fillStyle = col; g.font = `900 ${Math.round(lw * 0.75)}px "Arial Black", Arial, sans-serif`; g.fillText(t, cx + dx * R, cy - R - lw * 1.1); });
  });
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  return tex;
}

// Shape with every corner filleted (radius r, clamped to half of the shorter neighbouring edge)
function filletShape(pts, r, target = new THREE.Shape()) {
  const n = pts.length, V = (p) => new THREE.Vector2(p[0], p[1]);
  for (let i = 0; i < n; i++) {
    const p = V(pts[i]), a = V(pts[(i - 1 + n) % n]), b = V(pts[(i + 1) % n]);
    const da = a.clone().sub(p), db = b.clone().sub(p);
    const ra = Math.min(r, da.length() * 0.45), rb = Math.min(r, db.length() * 0.45);
    const pa = p.clone().add(da.normalize().multiplyScalar(ra)), pb = p.clone().add(db.normalize().multiplyScalar(rb));
    if (i === 0) target.moveTo(pa.x, pa.y); else target.lineTo(pa.x, pa.y);
    target.quadraticCurveTo(p.x, p.y, pb.x, pb.y);
  }
  target.closePath();
  return target;
}
// Knurled disc: radius alternates every other facet (fine straight knurl), axis along Y
function knurledDisc(r, w, n = 48) {
  const geo = new THREE.CylinderGeometry(r, r, w, n, 1);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i), rr = Math.hypot(x, z); if (rr < r * 0.5) continue;
    const k = Math.round((Math.atan2(z, x) + Math.PI) / (2 * Math.PI) * n) % 2;
    const f = k ? 0.93 : 1; pos.setX(i, x * f); pos.setZ(i, z * f);
  }
  geo.computeVertexNormals();
  return geo;
}
// Lobed paddle blade (W6): two rounded lobes joined by a waist, height h, width w, in the XY plane
function paddleBladeShape(w, h) {
  const s = new THREE.Shape(), hw = w / 2, hh = h / 2, waist = hw * 0.62;
  s.moveTo(0, -hh);
  s.bezierCurveTo(hw * 1.15, -hh, hw * 1.1, -hh * 0.35, waist, -hh * 0.05);
  s.bezierCurveTo(hw * 1.1, hh * 0.3, hw * 1.15, hh, 0, hh);
  s.bezierCurveTo(-hw * 1.15, hh, -hw * 1.1, hh * 0.3, -waist, hh * 0.05);
  s.bezierCurveTo(-hw * 1.1, -hh * 0.35, -hw * 1.15, -hh, 0, -hh);
  return s;
}
function labelTexture(text, colour, px = 128, font = '900 64px "Arial Black", Arial, sans-serif') {
  const cv = document.createElement('canvas'); cv.width = px * 2; cv.height = px;
  const g = cv.getContext('2d'); g.fillStyle = colour; g.textAlign = 'center'; g.textBaseline = 'middle';
  let size = 72; g.font = font.replace('64px', size + 'px');
  while (g.measureText(text).width > cv.width * 0.9 && size > 12) { size -= 4; g.font = font.replace('64px', size + 'px'); }
  g.fillText(text, cv.width / 2, cv.height / 2 + 2);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}

/**
 * 2. Main constructor: builds every part listed in cad/wheel_parts.json
 */
export function createSteeringWheelPCU8D(options = {}) {
  const W = options.parts || WHEEL_PARTS;
  const root = new THREE.Group();
  root.name = 'McLaren_Applied_PCU8D_Steering_Wheel';
  root.userData.parts = W;

  const carbonTwill = materials.carbonGlossAero || materials.carbonGloss;
  const carbonMatte = materials.carbonMatteStructural || materials.carbonMatte;
  const alcantara = new THREE.MeshPhysicalMaterial({ name: 'PCU8D_Grip_Alcantara', color: 0x484b50, roughness: 0.97, metalness: 0, sheen: 0.45, sheenRoughness: 0.8, sheenColor: new THREE.Color(0x7c8086) });
  alcantara.userData.envMapIntensity = 0.6;
  const bezelGrey = new THREE.MeshPhysicalMaterial({ name: 'PCU8D_Bezel_Anodised', color: 0x5c5f64, roughness: 0.42, metalness: 0.65, clearcoat: 0.2 });
  const blackAnod = new THREE.MeshStandardMaterial({ name: 'PCU8D_Black_Anodised', color: 0x0d0e10, roughness: 0.4, metalness: 0.5 });
  const titanium = materials.titaniumBright || new THREE.MeshStandardMaterial({ color: 0xb8bcc2, metalness: 0.9, roughness: 0.32 });
  const add = (parent, geo, mat, name) => { const m = new THREE.Mesh(geo, mat); if (name) m.name = name; m.castShadow = true; m.receiveShadow = true; parent.add(m); return m; };
  const Bd = W.body, T = Bd.thickness, F = T / 2; // F = z of the front face
  root.userData.frontZ = F;

  // ---- A. carbon shell (one extrusion of the measured outline with rounded edges)
  {
    const bev = Bd.edgeRadius;
    const geo = new THREE.ExtrudeGeometry(filletShape(Bd.outline, 0.03), { depth: T - 2 * bev, bevelEnabled: true, bevelThickness: bev, bevelSize: bev * 0.9, bevelSegments: 5, curveSegments: 6 });
    geo.translate(0, 0, -(T - 2 * bev) / 2);
    add(root, geo, carbonTwill, 'Chassis_Carbon_Monocoque');
    // raised rim of the lower dial tray (W5)
    const L = W.consoleLip, [lx0, ly0] = L.from, [lx1, ly1] = L.to;
    const rim = new THREE.Shape(); filletShape([[lx0, ly0], [lx1, ly0], [lx1, ly1], [lx0, ly1]], 0.05, rim);
    const hole = new THREE.Path(); filletShape([[lx0 + 0.035, ly0 - 0.03], [lx1 - 0.035, ly0 - 0.03], [lx1 - 0.035, ly1 + 0.03], [lx0 + 0.035, ly1 + 0.03]], 0.035, hole);
    rim.holes.push(hole);
    const rg = new THREE.ExtrudeGeometry(rim, { depth: L.height, bevelEnabled: true, bevelThickness: 0.008, bevelSize: 0.008, bevelSegments: 2 });
    rg.translate(0, 0, F - 0.01);
    add(root, rg, carbonTwill, 'Console_Lower_Lip');
  }

  // ---- B. sculpted alcantara grips (lofted rounded sections)
  [1, -1].forEach((side) => {
    const secs = W.grips.sections, ring = 28, pos = [], idx = [];
    secs.forEach(([y, xo, xi, d, zo]) => {
      const cx = side * (xo + xi) / 2, rx = Math.abs(xo - xi) / 2, rz = d / 2;
      for (let j = 0; j <= ring; j++) {
        const a = (j / ring) * Math.PI * 2, c = Math.cos(a), s2 = Math.sin(a);
        const e = 0.7; // superellipse: rounded-rectangle section
        const px = Math.sign(c) * Math.pow(Math.abs(c), e) * rx, pz = Math.sign(s2) * Math.pow(Math.abs(s2), e) * rz;
        pos.push(cx + px, y, zo + pz);
      }
    });
    const R = ring + 1;
    for (let i = 0; i < secs.length - 1; i++) for (let j = 0; j < ring; j++) { const a = i * R + j, b = a + 1, c = a + R, d = c + 1; idx.push(a, b, c, b, d, c); }
    // caps
    [0, secs.length - 1].forEach((i, k) => { const [y, xo, xi, , zo] = secs[i]; const ci = pos.length / 3; pos.push(side * (xo + xi) / 2, y + (k ? -0.012 : 0.01), zo); for (let j = 0; j < ring; j++) { const a = i * R + j; k ? idx.push(ci, a, a + 1) : idx.push(ci, a + 1, a); } });
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setIndex(idx);
    geo.computeVertexNormals();
    // UVs: around x along (dm) for the alcantara nap
    const uv = new Float32Array((pos.length / 3) * 2); for (let i = 0; i < pos.length / 3; i++) { uv[i * 2] = Math.atan2(pos[i * 3 + 2], pos[i * 3] - side * 1.27) * 0.2; uv[i * 2 + 1] = pos[i * 3 + 1]; }
    geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    add(root, geo, alcantara, `Ergonomic_HandGrip_${side > 0 ? 'Right' : 'Left'}`);
  });

  // ---- B2. bulbous carbon shoulders where the wing bar meets each grip (W5)
  if (W.gripShoulders) {
    const gs = W.gripShoulders, sg = new THREE.SphereGeometry(1, 28, 18);
    [1, -1].forEach((side) => { const m = add(root, sg, carbonTwill, `Grip_Shoulder_${side > 0 ? 'Right' : 'Left'}`); m.position.set(side * Math.abs(gs.centre[0]), gs.centre[1], 0); m.scale.set(...gs.radii); });
  }

  // ---- C. grey display bezel with stepped top corners, LCD and glass
  {
    const Bz = W.bezel, [scx, scy] = Bz.screen.centre, [sw, sh] = Bz.screen.size;
    const shape = filletShape(Bz.outline, 0.015);
    const hole = new THREE.Path(); filletShape([[scx - sw / 2, scy - sh / 2], [scx + sw / 2, scy - sh / 2], [scx + sw / 2, scy + sh / 2], [scx - sw / 2, scy + sh / 2]], 0.02, hole);
    shape.holes.push(hole);
    const geo = new THREE.ExtrudeGeometry(shape, { depth: Bz.height - 0.012, bevelEnabled: true, bevelThickness: 0.006, bevelSize: 0.006, bevelSegments: 2 });
    geo.translate(0, 0, F - 0.004);
    add(root, geo, bezelGrey, 'Display_Bezel');
    // dark inner frame lip round the glass
    const lip = new THREE.Shape(); filletShape([[scx - sw / 2 - 0.012, scy - sh / 2 - 0.012], [scx + sw / 2 + 0.012, scy - sh / 2 - 0.012], [scx + sw / 2 + 0.012, scy + sh / 2 + 0.012], [scx - sw / 2 - 0.012, scy + sh / 2 + 0.012]], 0.025, lip);
    const lipHole = new THREE.Path(); filletShape([[scx - sw / 2, scy - sh / 2], [scx + sw / 2, scy - sh / 2], [scx + sw / 2, scy + sh / 2], [scx - sw / 2, scy + sh / 2]], 0.015, lipHole); lip.holes.push(lipHole);
    const lg = new THREE.ExtrudeGeometry(lip, { depth: 0.01, bevelEnabled: false }); lg.translate(0, 0, F + Bz.height - Bz.recess);
    add(root, lg, blackAnod, 'Display_Inner_Frame');
    const lcd = new THREE.Mesh(new THREE.PlaneGeometry(sw, sh), new THREE.MeshBasicMaterial({ map: createLcdScreenTexture(options), toneMapped: false }));
    lcd.position.set(scx, scy, F + Bz.height - Bz.recess + 0.002); lcd.name = 'UI_LCD_PCU8D_Display'; root.add(lcd);
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(sw, sh), new THREE.MeshPhysicalMaterial({ name: 'PCU8D_Display_Glass', color: 0xffffff, transparent: true, opacity: 0.08, roughness: 0.05, metalness: 0, clearcoat: 1, depthWrite: false }));
    glass.position.set(scx, scy, F + Bz.height - Bz.recess + 0.008); glass.name = 'Display_Glass'; root.add(glass);
  }
  const bezelTop = F + W.bezel.height;

  // ---- D. shift and status LEDs (instanced; cad/wheel_controls.js colours them per instance)
  {
    const S = W.shiftLEDs, n = S.count, ledPos = [];
    for (let i = 0; i < n; i++) ledPos.push([S.from[0] + (S.to[0] - S.from[0]) * i / (n - 1), S.from[1]]);
    const st = W.statusLEDs.positions;
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2), one = new THREE.Vector3(1, 1, 1);
    const bez = new THREE.InstancedMesh(new THREE.CylinderGeometry(S.radius * 1.45, S.radius * 1.6, 0.016, 16), blackAnod, n + st.length); bez.name = 'ShiftLED_Bezels';
    [...ledPos, ...st].forEach(([x, y], k) => bez.setMatrixAt(k, m4.compose(new THREE.Vector3(x, y, bezelTop + 0.004), q, one)));
    root.add(bez);
    const ledMat = new THREE.MeshBasicMaterial({ name: 'PCU8D_LED', toneMapped: false });
    const dome = new THREE.SphereGeometry(1, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2); dome.rotateX(Math.PI / 2);
    const leds = new THREE.InstancedMesh(dome, ledMat, n); leds.name = 'ShiftLEDs';
    const c = new THREE.Color();
    ledPos.forEach(([x, y], i) => { leds.setMatrixAt(i, m4.compose(new THREE.Vector3(x, y, bezelTop + 0.01), new THREE.Quaternion(), new THREE.Vector3(S.radius, S.radius, S.radius * 0.7))); leds.setColorAt(i, c.setHex(i < n * 0.4 ? 0x00e676 : i < n * 0.7 ? 0xff334b : 0x5a6bff)); });
    root.add(leds);
    const r2 = W.statusLEDs.radius, sl = new THREE.InstancedMesh(dome, ledMat, st.length); sl.name = 'StatusLEDs';
    st.forEach(([x, y], i) => { sl.setMatrixAt(i, m4.compose(new THREE.Vector3(x, y, bezelTop + 0.008), new THREE.Quaternion(), new THREE.Vector3(r2, r2, r2 * 0.7))); sl.setColorAt(i, c.setHex(0xe8eef4)); });
    root.add(sl);
  }

  // ---- E. push buttons: round black bezel, octagonal faceted coloured cap, printed label
  {
    const capGeoCache = new Map(), capMats = new Map();
    const capGeo = (r) => {
      if (capGeoCache.has(r)) return capGeoCache.get(r);
      const pts = [new THREE.Vector2(r, 0), new THREE.Vector2(r, 0.018), new THREE.Vector2(r * 0.86, 0.036), new THREE.Vector2(r * 0.55, 0.047), new THREE.Vector2(0, 0.05)]; // bottom -> top: outward faces
      const g = new THREE.LatheGeometry(pts, 8); g.rotateX(Math.PI / 2); g.rotateZ(Math.PI / 8); g.computeVertexNormals();
      capGeoCache.set(r, g); return g;
    };
    W.buttons.forEach((b) => {
      const r = b.d / 2, grp = new THREE.Group(); grp.name = `Btn_${b.id}`; grp.position.set(b.at[0], b.at[1], F);
      const ring = add(grp, new THREE.CylinderGeometry(r * 1.22, r * 1.3, 0.03, 24), blackAnod, `Btn_${b.id}_Bezel`); ring.rotation.x = Math.PI / 2; ring.position.z = 0.012;
      if (!capMats.has(b.colour)) capMats.set(b.colour, new THREE.MeshPhysicalMaterial({ name: 'PCU8D_ButtonCap', color: b.colour, roughness: 0.32, metalness: 0.05, clearcoat: 0.7, clearcoatRoughness: 0.15, flatShading: true }));
      const cap = add(grp, capGeo(r), capMats.get(b.colour), `Btn_${b.id}_Cap`); cap.position.z = 0.02;
      if (b.label) {
        const lab = new THREE.Mesh(new THREE.PlaneGeometry(r * 1.5, r * 0.75), new THREE.MeshBasicMaterial({ map: labelTexture(b.label, b.text), transparent: true, depthWrite: false }));
        lab.position.z = 0.072; lab.name = `Btn_${b.id}_Label`; grp.add(lab);
      }
      root.add(grp);
    });
  }

  // ---- F. knurled thumbwheels in black housings (axis 'x': the thumb rolls them up / down)
  {
    const mats = new Map();
    W.thumbwheels.forEach((t) => {
      const grp = new THREE.Group(); grp.name = t.id;
      const onGrip = t.axis === 'y';
      grp.position.set(t.at[0], t.at[1], onGrip ? 0.14 : F + 0.005);
      if (t.axis === 'x') grp.rotation.z = -Math.PI / 2; // group Y = wheel X; wheel_controls spins rotation.y
      if (!mats.has(t.colour)) mats.set(t.colour, new THREE.MeshPhysicalMaterial({ name: 'PCU8D_Thumbwheel_Anodised', color: t.colour, roughness: 0.3, metalness: 0.75, clearcoat: 0.3 }));
      add(grp, knurledDisc(t.d / 2, t.w), mats.get(t.colour), `${t.id}_Disc`);
      root.add(grp);
      // housing slot (static)
      const hs = new THREE.Mesh(new THREE.BoxGeometry(t.axis === 'x' ? t.w + 0.04 : t.d * 0.95, t.axis === 'x' ? t.d * 0.92 : t.w + 0.04, 0.05), blackAnod);
      hs.position.set(t.at[0], t.at[1], (onGrip ? 0.14 : F + 0.005) - t.d * 0.3); hs.name = `${t.id}_Housing`; root.add(hs);
    });
    // silkscreen labels on the carbon (W3)
    W.silkscreen.labels.forEach((l) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(l.size * 5, l.size * 2.5), new THREE.MeshBasicMaterial({ map: labelTexture(l.text, l.colour), transparent: true, depthWrite: false }));
      m.position.set(l.at[0], l.at[1], F + 0.003); if (l.rot) m.rotation.z = THREE.MathUtils.degToRad(l.rot); m.name = `Silkscreen_${l.text}`; root.add(m);
    });
  }

  // ---- G. rotaries on the silkscreened tray
  {
    const R0 = W.rotaries;
    const xs = R0.map((r) => r.at[0]), ys = R0.map((r) => r.at[1]), pad = 0.17;
    const x0 = Math.min(...xs) - pad, x1 = Math.max(...xs) + pad, y0 = Math.min(...ys) - pad * 0.8, y1 = Math.max(...ys) + pad * 1.05;
    const tray = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, y1 - y0), new THREE.MeshBasicMaterial({ map: createDialTrayTexture(R0, x0, y0, x1, y1), transparent: true, depthWrite: false, toneMapped: false }));
    tray.position.set((x0 + x1) / 2, (y0 + y1) / 2, F + 0.003); tray.name = 'Dial_Tray_Silkscreen'; root.add(tray);
    const pointerShape = new THREE.Shape();
    pointerShape.moveTo(0, 0.095); pointerShape.bezierCurveTo(0.03, 0.05, 0.062, -0.02, 0.05, -0.055);
    pointerShape.bezierCurveTo(0.035, -0.085, -0.035, -0.085, -0.05, -0.055); pointerShape.bezierCurveTo(-0.062, -0.02, -0.03, 0.05, 0, 0.095);
    const pointerGeo = new THREE.ExtrudeGeometry(pointerShape, { depth: 0.055, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.01, bevelSegments: 3 });
    const knurl = knurledDisc(1, 1, 40);
    const white = new THREE.MeshBasicMaterial({ name: 'PCU8D_Pointer_Line', color: 0xf2f4f6 });
    R0.forEach((r) => {
      const grp = new THREE.Group(); grp.name = r.id; grp.position.set(r.at[0], r.at[1], F + 0.01);
      const base = add(grp, knurl, titanium, `${r.id}_KnurledRing`); base.rotation.x = Math.PI / 2; base.scale.set(r.d / 2, 0.045, r.d / 2); base.position.z = 0.022;
      const ptr = add(grp, pointerGeo, blackAnod, `${r.id}_Pointer`); ptr.position.z = 0.045; ptr.scale.setScalar(r.d / 0.2 * 1.05);
      const line = add(grp, new THREE.BoxGeometry(0.012, 0.085, 0.004), white, `${r.id}_PointerLine`); line.position.set(0, 0.03, 0.045 + 0.08 * r.d / 0.2 * 1.05);
      root.add(grp);
    });
  }

  // ---- H. rear: conical quick-release hub with machined flange, lobed carbon paddles
  {
    const H = W.hub, rear = new THREE.Group(); rear.name = 'Rear_QuickRelease_And_Paddles'; root.add(rear);
    const cone = add(rear, new THREE.CylinderGeometry(H.cone.frontD / 2, H.cone.backD / 2, H.cone.depth, 32, 1, true), titanium, 'QR_Hub_Cone');
    cone.rotation.x = -Math.PI / 2; cone.position.z = -F - H.cone.depth / 2;
    const fl = new THREE.Shape(); fl.absarc(0, 0, H.flange.d / 2, 0, Math.PI * 2, false);
    const bore = new THREE.Path(); bore.absarc(0, 0, H.flange.boreD / 2, 0, Math.PI * 2, true); fl.holes.push(bore);
    const fg = new THREE.ExtrudeGeometry(fl, { depth: H.flange.t, bevelEnabled: true, bevelThickness: 0.008, bevelSize: 0.008, bevelSegments: 2, curveSegments: 48 });
    fg.translate(0, 0, -F - H.cone.depth - H.flange.t);
    add(rear, fg, titanium, 'QR_Hub_Flange');
    const boreIn = add(rear, new THREE.CylinderGeometry(H.flange.boreD / 2, H.flange.boreD / 2 * 0.9, H.cone.depth + H.flange.t, 32, 1, true), carbonMatte, 'QR_Hub_Bore');
    boreIn.material = blackAnod; boreIn.rotation.x = -Math.PI / 2; boreIn.position.z = -F - (H.cone.depth + H.flange.t) / 2;
    W.paddles.forEach((p) => {
      const grp = new THREE.Group(); grp.name = p.id; grp.position.set(p.pivot[0], p.pivot[1], -F - 0.06); rear.add(grp);
      const b = p.blade, h = b.yTop - b.yBot, bx = b.x - p.pivot[0], by = (b.yTop + b.yBot) / 2 - p.pivot[1];
      const bg = new THREE.ExtrudeGeometry(paddleBladeShape(b.w, h), { depth: 0.022, bevelEnabled: true, bevelThickness: 0.007, bevelSize: 0.007, bevelSegments: 2, curveSegments: 16 });
      const blade = add(grp, bg, carbonTwill, `${p.id}_Blade`); blade.position.set(bx, by, -0.05);
      const armLen = Math.abs(bx) - b.w * 0.3;
      const arm = add(grp, new THREE.BoxGeometry(armLen, 0.1, 0.05), carbonTwill, `${p.id}_Arm`); arm.position.set(Math.sign(bx) * armLen / 2, 0, -0.025);
    });
  }

  applyFineCarbon(root, carbonTwill, carbonMatte);
  return root;
}
