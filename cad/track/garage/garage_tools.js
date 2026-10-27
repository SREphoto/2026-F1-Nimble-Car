/**
 * garage_tools.js — Detailed 3D Tools, Hanging Cable Attachments & Interactive Tool Chests
 * SREdesigns - Samuel R Erwin III
 *
 * Implements:
 *  - 4x Paoli DP 4000 F1 pneumatic wheel guns hanging from the overhead canopy coiled cables
 *  - 1x Digital tyre pressure & temperature gauge tool hanging from the mid-left cable
 *  - 1x Aerospace telemetry umbilical harness connector hanging from the mid-right cable
 *  - Interactive multi-drawer roll-cab tool chest with 5 opening drawers & bespoke tool foam sets
 *  - Worktop tools: Diagnostic Toughbook laptop, digital calipers, torque wrenches, multimeter, gloves, parts tray
 *  - Safety floor cable protectors / ramps
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// Basic geometry builders
const B = (w, h, d, x = 0, y = 0, z = 0) => new THREE.BoxGeometry(w, h, d).translate(x, y, z);
const Cy = (r, h, x = 0, y = 0, z = 0, seg = 16, r2 = r) => new THREE.CylinderGeometry(r, r2, h, seg).translate(x, y, z);
const CyX = (r, h, x, y, z, seg = 16) => new THREE.CylinderGeometry(r, r, h, seg).rotateZ(Math.PI / 2).translate(x, y, z);
const CyZ = (r, h, x, y, z, seg = 16) => new THREE.CylinderGeometry(r, r, h, seg).rotateX(Math.PI / 2).translate(x, y, z);
const flat = (g) => { const n = g.index ? g.toNonIndexed() : g; if (n.attributes.uv) n.deleteAttribute('uv'); return n; };
const merged = (list) => mergeGeometries(list.map(flat));

function rod(a, b, r, seg = 8) {
  const A = new THREE.Vector3(...a), Bv = new THREE.Vector3(...b), d = Bv.clone().sub(A), L = d.length();
  const g = new THREE.CylinderGeometry(r, r, L, seg); g.translate(0, L / 2, 0);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()));
  return g.translate(A.x, A.y, A.z);
}

// ---------------------------------------------------------------------------
// 1. Paoli DP 4000 Style Pneumatic Wheel Gun (F1 Impact Wrench)
// ---------------------------------------------------------------------------
export function createWheelGunGeometry(isTighten = false) {
  // Center of tool is at origin; hanging from cable at top
  const body = [];
  const alu = [];
  const rubber = [];
  const accent = [];
  const chrome = [];

  // Retractor balancer cylinder above the tool
  alu.push(Cy(0.55, 1.8, 0, 2.5, 0, 14));
  chrome.push(Cy(0.1, 0.9, 0, 3.8, 0, 8)); // hanging cable wire
  chrome.push(new THREE.TorusGeometry(0.3, 0.08, 6, 16).translate(0, 4.3, 0)); // hanging ring

  // Main motor cylinder housing
  body.push(CyZ(0.85, 2.4, 0, 0, 0, 18));
  // Heat sink cooling fins
  for (let z = -0.8; z <= 0.8; z += 0.4) {
    body.push(new THREE.TorusGeometry(0.88, 0.06, 6, 18).translate(0, 0, z));
  }
  // Front nose cone
  alu.push(CyZ(0.65, 0.8, 0, 0, 1.5, 16, 0.8));
  // Drive spindle & F1 titanium wheel nut retention socket (1-inch drive)
  const socketGeo = CyZ(0.72, 1.4, 0, 0, 2.4, 16);
  chrome.push(socketGeo);
  // Knurled socket collar
  alu.push(new THREE.TorusGeometry(0.75, 0.08, 6, 16).translate(0, 0, 2.0));

  // Anodized directional identifier ring (Red = loosen / Blue = tighten)
  accent.push(new THREE.TorusGeometry(0.86, 0.08, 6, 18).translate(0, 0, 1.0));

  // Ergonomic pistol grip handle (angled back slightly)
  rubber.push(rod([0, 0, -0.4], [0, -2.4, -0.9], 0.42, 12));
  // Textured grip wraps
  for (let k = 0; k < 4; k++) {
    const t = 0.2 + k * 0.2;
    rubber.push(new THREE.TorusGeometry(0.44, 0.05, 6, 12).rotateX(0.2).translate(0, -0.5 - k * 0.45, -0.5 - t * 0.5));
  }

  // Trigger & Forward/Reverse shuttle lever
  chrome.push(B(0.18, 0.5, 0.35, 0, -0.8, 0.15));
  chrome.push(B(0.4, 0.2, 0.2, 0, -0.1, -1.25));

  // Air inlet swivel fitting at base of handle
  chrome.push(Cy(0.3, 0.6, 0, -2.6, -0.95, 10));
  // Hose coupler
  rubber.push(Cy(0.25, 0.5, 0, -3.1, -1.0, 10));

  return {
    body: merged(body),
    alu: merged(alu),
    rubber: merged(rubber),
    accent: merged(accent),
    chrome: merged(chrome),
  };
}

// ---------------------------------------------------------------------------
// 2. Digital Tyre Pressure & Temperature Gauge Tool
// ---------------------------------------------------------------------------
export function createTyreGaugeGeometry() {
  const body = [];
  const rubber = [];
  const chrome = [];

  // Rubber armored gauge head
  rubber.push(Cy(0.9, 0.6, 0, 0, 0, 18));
  rubber.push(new THREE.TorusGeometry(0.92, 0.1, 6, 20).rotateX(Math.PI / 2));
  // LCD screen inset
  body.push(B(0.9, 0.05, 0.6, 0, 0.28, 0));
  // Buttons
  chrome.push(Cy(0.12, 0.1, -0.4, 0.3, -0.4, 8));
  chrome.push(Cy(0.12, 0.1, 0.4, 0.3, -0.4, 8));

  // Whip hose down to chuck
  rubber.push(rod([0, -0.3, 0], [0.3, -2.2, 0.4], 0.12, 8));
  // Brass 90-degree tyre valve chuck
  chrome.push(Cy(0.22, 0.6, 0.3, -2.4, 0.4, 10));
  chrome.push(CyZ(0.18, 0.5, 0.3, -2.2, 0.7, 10));

  // Top hanging hook / swivel
  chrome.push(Cy(0.15, 0.5, 0, 1.1, 0, 8));
  chrome.push(new THREE.TorusGeometry(0.22, 0.06, 6, 12).translate(0, 1.4, 0));

  return {
    body: merged(body),
    rubber: merged(rubber),
    chrome: merged(chrome),
  };
}

// ---------------------------------------------------------------------------
// 3. Aerospace Telemetry Umbilical Connector (ECU Diagnostic Harness)
// ---------------------------------------------------------------------------
export function createUmbilicalConnectorGeometry() {
  const alu = [];
  const rubber = [];
  const chrome = [];
  const accent = [];

  // Heavy-duty Deutsch circular bayonet connector body
  alu.push(Cy(0.65, 1.8, 0, 0, 0, 16));
  // Knurled locking collar
  chrome.push(new THREE.TorusGeometry(0.72, 0.1, 6, 16));
  // Cable strain relief boot
  rubber.push(Cy(0.5, 1.2, 0, 1.3, 0, 12, 0.35));
  // Pin contact array face at bottom
  rubber.push(Cy(0.58, 0.15, 0, -0.95, 0, 16));

  // Status LEDs on collar (Green link, Amber power)
  accent.push(CyX(0.08, 0.15, 0.65, 0.4, 0, 8));
  accent.push(CyX(0.08, 0.15, 0.65, -0.2, 0, 8));

  // Top lanyard hook
  chrome.push(new THREE.TorusGeometry(0.25, 0.06, 6, 12).translate(0, 2.1, 0));

  return {
    alu: merged(alu),
    rubber: merged(rubber),
    chrome: merged(chrome),
    accent: merged(accent),
  };
}

// ---------------------------------------------------------------------------
// 4. Build and hang tools at the ends of the canopy cables
// ---------------------------------------------------------------------------
export function buildHangingTools(M, canopyLayout) {
  const group = new THREE.Group();
  group.name = 'Garage_Hanging_Tools';

  const C = canopyLayout;
  const CHW = C.halfWidth;
  const CX = (C.x0 + C.x1) / 2;

  // 4 Corner Wheel Guns
  const gunDrops = [
    { pos: [C.x0 + 4, 15, -CHW + 2], rot: Math.PI * 0.25, tighten: false },  // Front-Left (Loosen)
    { pos: [C.x0 + 4, 15, CHW - 2], rot: -Math.PI * 0.25, tighten: true },   // Front-Right (Tighten)
    { pos: [C.x1 - 6, 15, -CHW + 2], rot: Math.PI * 0.75, tighten: false },  // Rear-Left (Loosen)
    { pos: [C.x1 - 6, 15, CHW - 2], rot: -Math.PI * 0.75, tighten: true },   // Rear-Right (Tighten)
  ];

  gunDrops.forEach((d, i) => {
    const gun = new THREE.Group();
    gun.name = `Hanging_Wheel_Gun_${i + 1}`;
    const geos = createWheelGunGeometry(d.tighten);

    const gunMatAccent = d.tighten ? M.screen : M.red; // Blue or Red anodized ring
    gun.add(new THREE.Mesh(geos.body, M.dark));
    gun.add(new THREE.Mesh(geos.alu, M.alu));
    gun.add(new THREE.Mesh(geos.rubber, M.rubber));
    gun.add(new THREE.Mesh(geos.accent, gunMatAccent));
    gun.add(new THREE.Mesh(geos.chrome, M.chrome));

    gun.position.set(d.pos[0], d.pos[1] - 3.8, d.pos[2]);
    gun.rotation.y = d.rot;
    gun.rotation.x = 0.1; // slight tilt on retractor
    gun.userData.click = 'tool_wheel_gun';
    gun.userData.toolName = `Paoli DP 4000 F1 Wheel Gun (${d.tighten ? 'Tighten · 4,200 Nm' : 'Loosen · High-Torque'})`;
    group.add(gun);
  });

  // Mid-Left: Digital Tyre Pressure Gauge
  {
    const gauge = new THREE.Group();
    gauge.name = 'Hanging_Tyre_Pressure_Gauge';
    const geos = createTyreGaugeGeometry();
    gauge.add(new THREE.Mesh(geos.body, M.dark));
    gauge.add(new THREE.Mesh(geos.rubber, M.rubber));
    gauge.add(new THREE.Mesh(geos.chrome, M.chrome));

    gauge.position.set(CX, 17 - 1.2, -CHW + 1.5);
    gauge.rotation.y = Math.PI / 2;
    gauge.userData.click = 'tool_tyre_gauge';
    gauge.userData.toolName = 'Intercomp Digital F1 Tyre Pressure & Pyrometer Gauge';
    group.add(gauge);
  }

  // Mid-Right: Aerospace Telemetry Umbilical Connector
  {
    const umbilical = new THREE.Group();
    umbilical.name = 'Hanging_Telemetry_Umbilical';
    const geos = createUmbilicalConnectorGeometry();
    umbilical.add(new THREE.Mesh(geos.alu, M.alu));
    umbilical.add(new THREE.Mesh(geos.rubber, M.rubber));
    umbilical.add(new THREE.Mesh(geos.chrome, M.chrome));
    umbilical.add(new THREE.Mesh(geos.accent, M.accent));

    umbilical.position.set(CX, 17 - 1.8, CHW - 1.5);
    umbilical.rotation.y = -Math.PI / 2;
    umbilical.userData.click = 'tool_umbilical';
    umbilical.userData.toolName = 'Mil-Spec High-Speed Telemetry & Battery Charge Umbilical';
    group.add(umbilical);
  }

  return group;
}

// ---------------------------------------------------------------------------
// 5. Tool Sets for the 5 Drawers (Shadow Board Tool Geometry)
// ---------------------------------------------------------------------------

// Drawer 1: Sockets & Ratchets
function createSocketsAndRatchetsToolSet(w, d) {
  const chrome = [];
  const dark = [];

  // 1/4" and 3/8" Ratchets
  [-2.2, 2.2].forEach(x => {
    // Ratchet handle
    chrome.push(CyZ(0.2, 4.2, x, 0.4, 0, 10));
    // Knurled grip
    dark.push(CyZ(0.24, 2.2, x, 0.4, -1.0, 10));
    // Pear-shaped ratchet head
    chrome.push(Cy(0.45, 0.4, x, 0.4, 2.0, 12));
    // Direction lever
    dark.push(B(0.1, 0.2, 0.2, x, 0.6, 2.0));
  });

  // Extension bars
  [-0.8, 0.8].forEach(x => {
    chrome.push(CyZ(0.18, 4.8, x, 0.3, 0.2, 10));
  });

  // Array of sockets in two rows
  for (let row = -1; row <= 1; row += 2) {
    for (let c = 0; c < 8; c++) {
      const sx = -w / 2 + 1.2 + c * (w - 2.4) / 7;
      const sz = row * (d / 2 - 1.2);
      const r = 0.2 + c * 0.035;
      chrome.push(Cy(r, 0.7, sx, 0.4, sz, 12));
    }
  }

  return [
    new THREE.Mesh(merged(chrome), new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.15, metalness: 0.95 })),
    new THREE.Mesh(merged(dark), new THREE.MeshStandardMaterial({ color: 0x181a20, roughness: 0.6 })),
  ];
}

// Drawer 2: Precision Torque & Metrology
function createTorqueAndMeasurementToolSet(w, d) {
  const chrome = [];
  const alu = [];
  const screen = [];

  // Big 1/2" Digital Torque Wrench
  chrome.push(CyX(0.3, w - 2.8, 0, 0.4, -d * 0.25, 12)); // long shaft
  alu.push(CyX(0.42, 3.2, -w * 0.25, 0.4, -d * 0.25, 12)); // handle
  // LCD screen and buttons on torque wrench
  screen.push(B(1.6, 0.1, 0.4, 0.5, 0.58, -d * 0.25));
  chrome.push(B(0.8, 0.7, 0.8, w * 0.4, 0.4, -d * 0.25)); // torque head

  // Digital Vernier Caliper
  chrome.push(B(w - 3.5, 0.1, 0.4, 0, 0.35, d * 0.2)); // main scale bar
  chrome.push(B(0.2, 0.2, 1.4, -w * 0.35, 0.35, d * 0.2 + 0.5)); // fixed jaw
  chrome.push(B(0.2, 0.2, 1.4, -w * 0.1, 0.4, d * 0.2 + 0.5)); // sliding jaw
  alu.push(B(1.2, 0.25, 0.8, -w * 0.1, 0.4, d * 0.2)); // digital housing

  // Feeler gauge set
  chrome.push(B(2.2, 0.3, 0.5, w * 0.25, 0.35, d * 0.25, 0.2));

  return [
    new THREE.Mesh(merged(chrome), new THREE.MeshStandardMaterial({ color: 0xe6e9ee, roughness: 0.2, metalness: 0.9 })),
    new THREE.Mesh(merged(alu), new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.4, metalness: 0.6 })),
    new THREE.Mesh(merged(screen), new THREE.MeshBasicMaterial({ color: 0x38bdf8 })),
  ];
}

// Drawer 3: Electrical, Sensors & Avionics
function createElectricalToolSet(w, d) {
  const yellow = [];
  const dark = [];
  const chrome = [];

  // Fluke style multimeter
  yellow.push(B(2.4, 0.7, 4.0, -w * 0.25, 0.4, 0)); // yellow holster
  dark.push(B(2.0, 0.65, 3.6, -w * 0.25, 0.45, 0)); // dark body
  dark.push(Cy(0.55, 0.2, -w * 0.25, 0.82, -0.6, 12)); // rotary knob
  chrome.push(B(1.4, 0.05, 1.0, -w * 0.25, 0.8, 1.0)); // LCD screen

  // Coiled red and black test leads
  const redMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.5 });
  const blackMat = new THREE.MeshStandardMaterial({ color: 0x111115, roughness: 0.7 });
  const redLead = new THREE.Mesh(new THREE.TorusGeometry(1.0, 0.1, 6, 20).rotateX(Math.PI / 2).translate(w * 0.25, 0.35, -1.0), redMat);
  const blackLead = new THREE.Mesh(new THREE.TorusGeometry(1.0, 0.1, 6, 20).rotateX(Math.PI / 2).translate(w * 0.25, 0.35, 1.0), blackMat);

  // Optical IR thermometer gun
  yellow.push(B(1.4, 0.8, 2.2, 0.5, 0.4, -0.5));
  dark.push(rod([0.5, 0.4, -0.5], [0.5, 0.4, 1.2], 0.35, 8));

  return [
    new THREE.Mesh(merged(yellow), new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.4 })),
    new THREE.Mesh(merged(dark), new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5 })),
    new THREE.Mesh(merged(chrome), new THREE.MeshStandardMaterial({ color: 0xdde4ec, roughness: 0.1, metalness: 0.8 })),
    redLead,
    blackLead,
  ];
}

// Drawer 4: Pneumatic & Pit Equipment
function createPneumaticToolSet(w, d) {
  const blue = [];
  const red = [];
  const chrome = [];

  // Spare wheel gun sockets (2x blue for tighten, 2x red for loosen)
  [-w * 0.3, -w * 0.1].forEach((x, i) => {
    blue.push(Cy(0.75, 1.5, x, 0.75, -1.0, 16));
    chrome.push(Cy(0.8, 0.2, x, 1.4, -1.0, 16));
  });
  [w * 0.1, w * 0.3].forEach((x, i) => {
    red.push(Cy(0.75, 1.5, x, 0.75, -1.0, 16));
    chrome.push(Cy(0.8, 0.2, x, 1.4, -1.0, 16));
  });

  // Pressure regulator with brass fittings & dial
  chrome.push(B(1.4, 0.8, 1.4, 0, 0.5, 1.2));
  chrome.push(Cy(0.5, 0.3, 0, 1.0, 1.2, 16));
  chrome.push(CyX(0.2, 2.4, 0, 0.5, 1.2, 8));

  return [
    new THREE.Mesh(merged(blue), new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.3, metalness: 0.5 })),
    new THREE.Mesh(merged(red), new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.3, metalness: 0.5 })),
    new THREE.Mesh(merged(chrome), new THREE.MeshStandardMaterial({ color: 0xd1d5db, roughness: 0.2, metalness: 0.85 })),
  ];
}

// Drawer 5: Suspension Alignment & Setup Tools
function createSuspensionSetupToolSet(w, d) {
  const alu = [];
  const brass = [];
  const dark = [];

  // Precision ride height blocks (stepped aluminium blocks)
  [-2.5, 2.5].forEach(x => {
    alu.push(B(1.8, 0.6, 3.2, x, 0.4, 0));
    for (let s = 0; s < 3; s++) alu.push(B(1.8, 0.2, 0.8, x, 0.7 + s * 0.2, -1.0 + s * 0.9));
  });

  // Alignment camber/toe shims in slotted rack
  for (let k = 0; k < 12; k++) {
    const sz = -d / 2 + 0.8 + k * 0.35;
    brass.push(B(1.4, 0.5, 0.08, 0, 0.4, sz));
  }

  // Titanium fastener organizer bins
  dark.push(B(1.6, 0.4, 1.8, 0, 0.3, 1.4));
  brass.push(Cy(0.18, 0.6, -0.4, 0.4, 1.2, 8));
  brass.push(Cy(0.18, 0.6, 0.4, 0.4, 1.2, 8));
  brass.push(Cy(0.18, 0.6, 0, 0.4, 1.6, 8));

  return [
    new THREE.Mesh(merged(alu), new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.25, metalness: 0.85 })),
    new THREE.Mesh(merged(brass), new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.35, metalness: 0.8 })),
    new THREE.Mesh(merged(dark), new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.6 })),
  ];
}

// ---------------------------------------------------------------------------
// 6. Interactive Multi-Drawer Tool Chest
// ---------------------------------------------------------------------------
export function createInteractiveToolChest(M, { width = 12, height = 15, depth = 8, teamColor = '#4781D7' } = {}) {
  const chest = new THREE.Group();
  chest.name = 'Garage_Interactive_Tool_Chest';

  const w = width, h = height, d = depth;
  const castorH = 1.6;
  const bodyH = h - castorH;

  // Outer cabinet body (Sheet metal with team color powder coat)
  const cabMat = new THREE.MeshStandardMaterial({ color: teamColor, roughness: 0.35, metalness: 0.15 });
  const cabBody = [
    B(w, bodyH, 0.4, 0, castorH + bodyH / 2, -d / 2 + 0.2), // Back wall
    B(0.4, bodyH, d, -w / 2 + 0.2, castorH + bodyH / 2, 0), // Left wall
    B(0.4, bodyH, d, w / 2 - 0.2, castorH + bodyH / 2, 0),  // Right wall
    B(w, 0.4, d, 0, castorH + 0.2, 0),                       // Bottom floor
  ];
  chest.add(new THREE.Mesh(merged(cabBody), cabMat));

  // Brushed Stainless Steel Worktop on top of chest
  const topMat = new THREE.MeshStandardMaterial({ color: 0xd1d5db, roughness: 0.22, metalness: 0.85 });
  const topPlate = new THREE.Mesh(B(w + 0.4, 0.6, d + 0.4, 0, h + 0.3, 0), topMat);
  topPlate.name = 'ToolChest_Worktop';
  chest.add(topPlate);

  // Castors at the 4 bottom corners
  const wheels = [], forks = [];
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const cx = sx * (w / 2 - 1.2), cz = sz * (d / 2 - 1.2);
    wheels.push(CyX(0.65, 0.5, cx, 0.65, cz, 14));
    forks.push(B(1.6, 0.18, 1.6, cx, castorH - 0.1, cz), B(0.14, 0.9, 1.1, cx - 0.32, castorH - 0.6, cz), B(0.14, 0.9, 1.1, cx + 0.32, castorH - 0.6, cz));
  }
  chest.add(new THREE.Mesh(merged(wheels), M.rubber));
  chest.add(new THREE.Mesh(merged(forks), M.dark));

  // 5 Sliding Drawers (Each in its own Three.js Group so it can slide on Z)
  const drawers = [];
  const numDrawers = 5;
  const drawerH = (bodyH - 1.0) / numDrawers;
  const drawerW = w - 1.2;
  const drawerD = d - 0.8;

  const foamMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.85 }); // Charcoal EVA foam
  const drawerFrontMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4, metalness: 0.2 });
  const handleMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.15, metalness: 0.95 });

  const drawerConfigs = [
    { name: 'Drawer 1: Sockets, Ratchets & Hex Drive', makeTools: () => createSocketsAndRatchetsToolSet(drawerW - 0.8, drawerD - 0.8) },
    { name: 'Drawer 2: Precision Torque & Metrology', makeTools: () => createTorqueAndMeasurementToolSet(drawerW - 0.8, drawerD - 0.8) },
    { name: 'Drawer 3: Electrical, Multimeter & Diagnostics', makeTools: () => createElectricalToolSet(drawerW - 0.8, drawerD - 0.8) },
    { name: 'Drawer 4: Pneumatics & Wheel Gun Sockets', makeTools: () => createPneumaticToolSet(drawerW - 0.8, drawerD - 0.8) },
    { name: 'Drawer 5: Suspension Setup & Camber Shims', makeTools: () => createSuspensionSetupToolSet(drawerW - 0.8, drawerD - 0.8) },
  ];

  for (let k = 0; k < numDrawers; k++) {
    // Reverse drawer order: top drawer is k = 0
    const dIdx = numDrawers - 1 - k;
    const cy = castorH + 0.6 + (dIdx + 0.5) * drawerH;

    const drawerGrp = new THREE.Group();
    drawerGrp.name = `ToolChest_Drawer_${k + 1}`;
    drawerGrp.position.set(0, cy, 0);

    // Drawer box (tray)
    const trayGeo = [
      B(drawerW, 0.3, drawerD, 0, -drawerH / 2 + 0.15, 0), // bottom
      B(drawerW, drawerH - 0.4, 0.3, 0, 0, -drawerD / 2 + 0.15), // back
      B(0.3, drawerH - 0.4, drawerD, -drawerW / 2 + 0.15, 0, 0), // left
      B(0.3, drawerH - 0.4, drawerD, drawerW / 2 - 0.15, 0, 0),  // right
    ];
    drawerGrp.add(new THREE.Mesh(merged(trayGeo), M.dark));

    // Drawer Front Panel with team color / dark finish
    const front = new THREE.Mesh(B(drawerW + 0.4, drawerH - 0.25, 0.3, 0, 0, drawerD / 2), drawerFrontMat);
    drawerGrp.add(front);

    // Full-width extruded aluminum handle
    const handle = new THREE.Mesh(B(drawerW - 1.2, 0.25, 0.35, 0, drawerH * 0.25, drawerD / 2 + 0.25), handleMat);
    drawerGrp.add(handle);

    // High-density laser cut foam shadow tray inside the drawer
    const foam = new THREE.Mesh(B(drawerW - 0.8, 0.4, drawerD - 0.8, 0, -drawerH / 2 + 0.4, 0), foamMat);
    drawerGrp.add(foam);

    // The tool set inside this drawer
    const toolMeshes = drawerConfigs[k].makeTools();
    toolMeshes.forEach(m => drawerGrp.add(m));

    drawerGrp.userData = {
      index: k,
      name: drawerConfigs[k].name,
      isOpen: false,
      closedZ: 0,
      openZ: 4.6, // slide out 4.6 dm (46 cm)
      click: 'tool_chest_drawer',
    };

    chest.add(drawerGrp);
    drawers.push(drawerGrp);
  }

  // Worktop Tools sitting on top of the chest:
  // 1. Diagnostic Toughbook Laptop (open)
  const laptop = createWorktopLaptop();
  laptop.position.set(-2.8, h + 0.6, 0.8);
  laptop.rotation.y = 0.15;
  chest.add(laptop);

  // 2. Stainless steel caliper
  const caliper = createWorktopCaliper();
  caliper.position.set(2.8, h + 0.65, -1.2);
  caliper.rotation.y = -0.4;
  chest.add(caliper);

  // 3. Magnetic parts dish with titanium wheel nuts
  const dish = createMagneticPartsDish();
  dish.position.set(3.2, h + 0.65, 1.4);
  chest.add(dish);

  // 4. Mechanics' Gloves & shop cloth
  const cloth = createShopClothAndGloves();
  cloth.position.set(0.2, h + 0.65, -1.4);
  chest.add(cloth);

  chest.userData.drawers = drawers;
  chest.userData.toggleDrawer = (drawerIndex) => {
    const dr = drawers[drawerIndex];
    if (!dr) return;
    dr.userData.isOpen = !dr.userData.isOpen;
    const targetZ = dr.userData.isOpen ? dr.userData.openZ : dr.userData.closedZ;

    // Smooth animation loop
    const startZ = dr.position.z;
    const startTime = performance.now();
    const duration = 350; // ms

    function animateSlide(now) {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      // Ease out cubic
      const ease = 1 - Math.pow(1 - progress, 3);
      dr.position.z = startZ + (targetZ - startZ) * ease;
      if (progress < 1) {
        requestAnimationFrame(animateSlide);
      }
    }
    requestAnimationFrame(animateSlide);
    return dr.userData.isOpen;
  };

  return chest;
}

// ---------------------------------------------------------------------------
// 7. Worktop Accessories: Laptop, Caliper, Magnetic Dish, Gloves
// ---------------------------------------------------------------------------

function createWorktopLaptop() {
  const group = new THREE.Group();
  group.name = 'ToolChest_Toughbook_Laptop';

  // Base
  const base = new THREE.Mesh(B(2.8, 0.22, 2.2), new THREE.MeshStandardMaterial({ color: 0x22272e, roughness: 0.45 }));
  group.add(base);

  // Screen Lid (tilted back at 110 degrees)
  const lid = new THREE.Group();
  lid.position.set(0, 0.11, -1.05);
  lid.rotation.x = -1.9; // angled back

  const lidMesh = new THREE.Mesh(B(2.8, 2.0, 0.18, 0, 1.0, 0), new THREE.MeshStandardMaterial({ color: 0x181c22, roughness: 0.5 }));
  lid.add(lidMesh);

  // Screen display
  const scrMat = new THREE.MeshBasicMaterial({ color: 0x00d4e8 });
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(2.5, 1.7).translate(0, 1.0, 0.1), scrMat);
  lid.add(scr);

  group.add(lid);
  group.userData.click = 'tool_laptop';
  group.userData.toolName = 'Pit Diagnostic Panasonic Toughbook Telemetry Node';
  return group;
}

function createWorktopCaliper() {
  const group = new THREE.Group();
  group.name = 'ToolChest_Digital_Caliper';
  const chromeMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.2, metalness: 0.9 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.6 });

  // Main beam
  group.add(new THREE.Mesh(B(4.2, 0.08, 0.35), chromeMat));
  // Fixed jaw
  group.add(new THREE.Mesh(B(0.18, 0.15, 1.2, -1.9, 0, 0.5), chromeMat));
  // Sliding jaw
  group.add(new THREE.Mesh(B(0.18, 0.15, 1.2, -0.6, 0.04, 0.5), chromeMat));
  // Digital housing
  group.add(new THREE.Mesh(B(1.0, 0.2, 0.6, -0.6, 0.08, 0), darkMat));

  group.userData.click = 'tool_caliper';
  group.userData.toolName = 'Mitutoyo Digital Vernier Caliper (0.01 mm precision)';
  return group;
}

function createMagneticPartsDish() {
  const group = new THREE.Group();
  group.name = 'ToolChest_Parts_Dish';
  const steelMat = new THREE.MeshStandardMaterial({ color: 0xcfd6df, roughness: 0.2, metalness: 0.95 });
  const nutMat = new THREE.MeshStandardMaterial({ color: 0x2563eb, roughness: 0.3, metalness: 0.7 }); // Blue anodized titanium wheel nuts

  // Magnetic stainless dish bowl
  group.add(new THREE.Mesh(Cy(1.2, 0.35, 0, 0.18, 0, 18, 0.9), steelMat));

  // 3 Titanium wheel nuts sitting in dish
  [-0.4, 0.4].forEach(x => {
    const nut = new THREE.Mesh(Cy(0.35, 0.45, x, 0.4, 0, 6), nutMat);
    group.add(nut);
  });
  group.add(new THREE.Mesh(Cy(0.35, 0.45, 0, 0.4, 0.35, 6), nutMat));

  group.userData.click = 'tool_parts_dish';
  group.userData.toolName = 'Magnetic Parts Tray with F1 Titanium Wheel Nuts';
  return group;
}

function createShopClothAndGloves() {
  const group = new THREE.Group();
  group.name = 'ToolChest_Cloth_Gloves';

  // Folded microfiber shop cloth (red)
  const clothMat = new THREE.MeshStandardMaterial({ color: 0xd90429, roughness: 0.95 });
  group.add(new THREE.Mesh(B(1.6, 0.25, 2.2, 0, 0.12, 0), clothMat));

  // Mechanics' Pit Gloves (pair of black/cyan gloves)
  const gloveMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.85 });
  group.add(new THREE.Mesh(B(0.9, 0.12, 2.0, 1.2, 0.06, -0.2), gloveMat));
  group.add(new THREE.Mesh(B(0.9, 0.12, 2.0, 1.4, 0.16, 0.1), gloveMat));

  return group;
}

// ---------------------------------------------------------------------------
// 8. Heavy-Duty Safety Floor Cable Ramps (Drop-over Cable Protectors)
// ---------------------------------------------------------------------------
export function buildFloorCableRamps(materials, layout) {
  const group = new THREE.Group();
  group.name = 'Garage_Floor_Cable_Ramps';

  const blackMat = materials.rubber || new THREE.MeshStandardMaterial({ color: 0x111115, roughness: 0.85 });
  const yellowMat = materials.yellowHose || new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.5 });

  // Ramp crosses from back desk (x = 88) across to the car bay (x = 52) along z = 18
  const len = 36;
  const rampW = 3.2;
  const rampH = 0.35;

  const baseGeo = B(len, rampH, rampW, 70, rampH / 2 + 0.03, 18);
  group.add(new THREE.Mesh(baseGeo, blackMat));

  // Yellow high-visibility hazard stripes along the top of the ramp
  const stripeList = [];
  for (let x = 54; x < 86; x += 3.6) {
    stripeList.push(B(1.6, 0.02, rampW - 0.2, x, rampH + 0.04, 18));
  }
  group.add(new THREE.Mesh(merged(stripeList), yellowMat));

  return group;
}
