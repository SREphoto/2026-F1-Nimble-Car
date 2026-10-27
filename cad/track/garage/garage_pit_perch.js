/**
 * garage_pit_perch.js — Formula 1 Pit Wall Stand ("Pit Perch" / Command Gantry)
 * SREdesigns - Samuel R Erwin III
 *
 * Implements the mobile command station stationed on the pit wall where the
 * Team Principal, Sporting Director, Chief Strategist, and Race Engineers sit
 * during practice, qualifying, and race sessions.
 *
 * Features:
 *  - Mobile heavy-duty tubular gantry with 6 lockable industrial castors
 *  - Elevated platform with anti-slip diamond plate flooring and safety railings
 *  - Rear access stairs leading from the pit lane apron
 *  - Cantilevered weather & sun canopy with team livery, sponsors and radio antennas
 *  - 4 high-back ergonomic racing bucket seats with team color cushions and role nameplates:
 *      [1] Race Engineer  [2] Team Principal (Team Boss)  [3] Chief Strategist  [4] Sporting Director
 *  - Multi-tier workstation console with 8 dual-row high-res telemetry & broadcast monitors
 *  - Keyboards, trackballs, intercom PTT control panels, pit headsets and drink bottles
 *  - Umbilical power & high-speed telemetry trunk cables
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

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
// 1. High-Back F1 Racing Bucket Seat
// ---------------------------------------------------------------------------
function createBucketSeat(seatZ, roleName, teamAccentColor) {
  const seat = new THREE.Group();
  seat.name = `PitPerch_Seat_${roleName.replace(/\s+/g, '_')}`;

  const carbonMat = new THREE.MeshStandardMaterial({ color: 0x111317, roughness: 0.45, metalness: 0.2 });
  const cushionMat = new THREE.MeshStandardMaterial({ color: 0x1e2430, roughness: 0.8 });
  const accentMat = new THREE.MeshStandardMaterial({ color: teamAccentColor, roughness: 0.5 });
  const chromeMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, roughness: 0.2, metalness: 0.9 });

  const shellGeos = [
    B(4.4, 0.8, 4.6, 0, 5.0, 0),           // Base seat shell
    B(4.4, 8.5, 0.8, 0, 9.4, -2.1),        // Backrest shell
    B(0.8, 2.8, 4.4, -2.0, 6.2, 0),        // Left side bolster
    B(0.8, 2.8, 4.4, 2.0, 6.2, 0),         // Right side bolster
    B(3.4, 3.2, 0.8, 0, 14.8, -2.0),       // Headrest shell
    B(1.0, 3.0, 2.0, -1.8, 14.8, -1.4),    // Headrest left wing
    B(1.0, 3.0, 2.0, 1.8, 14.8, -1.4),     // Headrest right wing
  ];
  seat.add(new THREE.Mesh(merged(shellGeos), carbonMat));

  // Cushions with center team-color accent stripe
  const cushions = [
    B(3.0, 0.6, 3.8, 0, 5.4, 0.2),         // Bottom cushion
    B(3.0, 7.8, 0.6, 0, 9.5, -1.6),        // Back cushion
    B(2.4, 2.6, 0.6, 0, 14.8, -1.5),       // Headrest cushion
  ];
  seat.add(new THREE.Mesh(merged(cushions), cushionMat));

  const stripes = [
    B(1.0, 0.65, 3.82, 0, 5.42, 0.2),      // Bottom stripe
    B(1.0, 7.82, 0.65, 0, 9.5, -1.58),     // Back stripe
    B(1.0, 2.62, 0.65, 0, 14.8, -1.48),    // Headrest stripe
  ];
  seat.add(new THREE.Mesh(merged(stripes), accentMat));

  // Seat Mounting Pedestal & Swivel base
  const pedestal = [
    Cy(0.4, 3.2, 0, 3.0, 0, 12),
    Cy(1.8, 0.3, 0, 1.5, 0, 16),
  ];
  seat.add(new THREE.Mesh(merged(pedestal), chromeMat));

  seat.position.set(0, 0, seatZ);
  seat.userData.role = roleName;
  return seat;
}

// ---------------------------------------------------------------------------
// 2. Headset & Intercom Audio Console
// ---------------------------------------------------------------------------
function createIntercomConsole(z) {
  const grp = new THREE.Group();
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x181c24, roughness: 0.6 });
  const chromeMat = new THREE.MeshStandardMaterial({ color: 0xdde4ec, roughness: 0.2, metalness: 0.8 });

  // PTT Intercom panel with buttons
  const panel = B(2.2, 0.25, 1.8, -1.2, 7.85, z);
  grp.add(new THREE.Mesh(panel, darkMat));

  // 4 PTT Buttons (Driver 1, Driver 2, Pit, FIA)
  const btnCols = [0x22c55e, 0x3b82f6, 0xf59e0b, 0xef4444];
  btnCols.forEach((col, i) => {
    const bx = -1.6 + (i % 2) * 0.8;
    const bz = z - 0.4 + Math.floor(i / 2) * 0.8;
    const btn = new THREE.Mesh(Cy(0.18, 0.1, bx, 8.02, bz, 8), new THREE.MeshBasicMaterial({ color: col }));
    grp.add(btn);
  });

  // F1 Over-Ear Pit Headset with boom mic resting on counter
  const headset = new THREE.Group();
  headset.name = 'Pit_Headset';
  const earL = CyZ(0.35, 0.4, -0.2, 8.1, z - 0.7, 12);
  const earR = CyZ(0.35, 0.4, -0.2, 8.1, z - 1.3, 12);
  const band = new THREE.TorusGeometry(0.55, 0.08, 6, 16).rotateY(Math.PI / 2).translate(-0.2, 8.5, z - 1.0);
  const mic = rod([-0.2, 8.1, z - 0.7], [0.4, 7.9, z - 0.8], 0.05, 6);

  headset.add(new THREE.Mesh(merged([earL, earR, band, mic]), darkMat));
  grp.add(headset);

  // Insulated Team Drink Bottle
  const bottle = new THREE.Mesh(Cy(0.3, 1.4, -1.8, 8.5, z + 1.1, 14), new THREE.MeshStandardMaterial({ color: 0x2563eb, roughness: 0.3, metalness: 0.6 }));
  grp.add(bottle);

  return grp;
}

// ---------------------------------------------------------------------------
// 3. Monitor Textures for the Pit Perch Screen Rack
// ---------------------------------------------------------------------------
function createPitPerchScreenTextures(teamColor = '#4781D7') {
  function makeCanvas(draw) {
    const c = document.createElement('canvas');
    c.width = 512;
    c.height = 320;
    const x = c.getContext('2d');
    draw(x, c.width, c.height);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }

  // Screen 1: World Broadcast TV Feed
  const tvTex = makeCanvas((x, w, h) => {
    x.fillStyle = '#080d16'; x.fillRect(0, 0, w, h);
    x.fillStyle = '#e10600'; x.fillRect(0, 0, w, 28);
    x.fillStyle = '#ffffff'; x.font = 'bold 14px sans-serif'; x.textAlign = 'left'; x.fillText('F1 WORLD FEED · LIVE RACE BROADCAST', 14, 18);
    // Track camera simulation
    const gr = x.createLinearGradient(0, 30, 0, h); gr.addColorStop(0, '#38bdf8'); gr.addColorStop(0.5, '#0284c7'); gr.addColorStop(1, '#0f172a');
    x.fillStyle = gr; x.fillRect(12, 36, w - 24, h - 48);
    x.fillStyle = '#ef4444'; x.font = 'bold 24px monospace'; x.textAlign = 'center'; x.fillText('CAR #03 · P1 · VERSTAPPEN', w / 2, h / 2 + 10);
  });

  // Screen 2: Onboard Driver Camera Feed
  const onboardTex = makeCanvas((x, w, h) => {
    x.fillStyle = '#05070c'; x.fillRect(0, 0, w, h);
    x.fillStyle = '#1e293b'; x.fillRect(0, 0, w, 28);
    x.fillStyle = '#22c55e'; x.font = 'bold 13px monospace'; x.textAlign = 'left'; x.fillText('REC ● ONBOARD T-CAM · 1080p 60FPS', 14, 18);
    // Cockpit halo frame outline
    x.strokeStyle = '#00d4e8'; x.lineWidth = 4;
    x.beginPath(); x.moveTo(w * 0.2, h); x.lineTo(w * 0.45, h * 0.35); x.lineTo(w * 0.55, h * 0.35); x.lineTo(w * 0.8, h); x.stroke();
    x.fillStyle = '#ffffff'; x.font = 'bold 20px monospace'; x.textAlign = 'center'; x.fillText('314 KM/H · GEAR 7', w / 2, h - 30);
  });

  // Screen 3: GPS Car Positioning Map
  const gpsTex = makeCanvas((x, w, h) => {
    x.fillStyle = '#040810'; x.fillRect(0, 0, w, h);
    x.fillStyle = '#0284c7'; x.fillRect(0, 0, w, 28);
    x.fillStyle = '#ffffff'; x.font = 'bold 13px sans-serif'; x.textAlign = 'left'; x.fillText('GPS TRACK RADAR · RED BULL RING', 14, 18);
    // Circuit
    x.strokeStyle = '#38bdf8'; x.lineWidth = 6;
    x.beginPath(); x.ellipse(w / 2, h / 2 + 10, 160, 80, 0.3, 0, Math.PI * 2); x.stroke();
    x.fillStyle = '#ef4444'; x.beginPath(); x.arc(w / 2 + 80, h / 2 - 20, 8, 0, Math.PI * 2); x.fill();
    x.fillStyle = '#ffffff'; x.font = 'bold 11px monospace'; x.fillText('VER (P1)', w / 2 + 95, h / 2 - 20);
  });

  // Screen 4: FIA Race Control Messages
  const fiaTex = makeCanvas((x, w, h) => {
    x.fillStyle = '#0b0f19'; x.fillRect(0, 0, w, h);
    x.fillStyle = '#1e293b'; x.fillRect(0, 0, w, 28);
    x.fillStyle = '#fbbf24'; x.font = 'bold 13px monospace'; x.textAlign = 'left'; x.fillText('FIA RACE CONTROL OFFICIAL MESSAGING', 14, 18);
    const msgs = [
      ['14:02:18', 'TRACK CLEAR · GREEN FLAG ALL SECTORS', '#22c55e'],
      ['14:05:44', 'DRS ENABLED IN ZONES 1, 2 AND 3', '#38bdf8'],
      ['14:08:12', 'PIT LANE SPEED LIMIT: 80 KM/H ENFORCED', '#f8fafc'],
      ['14:11:30', 'RISK OF RAIN IN PIT LANE: 25% (15 MIN)', '#f59e0b'],
    ];
    msgs.forEach(([t, m, c], i) => {
      x.fillStyle = '#94a3b8'; x.font = '11px monospace'; x.fillText(t, 16, 60 + i * 40);
      x.fillStyle = c; x.font = 'bold 12px sans-serif'; x.fillText(m, 100, 60 + i * 40);
    });
  });

  // Screen 5: Multi-Channel Lap Timing Chart
  const timingTex = makeCanvas((x, w, h) => {
    x.fillStyle = '#060a12'; x.fillRect(0, 0, w, h);
    x.fillStyle = '#0f172a'; x.fillRect(0, 0, w, 28);
    x.fillStyle = '#38bdf8'; x.font = 'bold 13px monospace'; x.textAlign = 'left'; x.fillText('SECTOR DELTAS · LIVE PACING', 14, 18);
    for (let r = 0; r < 6; r++) {
      const ry = 42 + r * 42;
      x.fillStyle = r % 2 === 0 ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.2)';
      x.fillRect(10, ry, w - 20, 36);
      x.fillStyle = '#ffffff'; x.font = 'bold 12px monospace'; x.fillText(`P${r + 1}  ${['VER', 'NOR', 'LEC', 'HAM', 'PIA', 'RUS'][r]}`, 20, ry + 22);
      x.fillStyle = r === 0 ? '#a855f7' : '#22c55e'; x.textAlign = 'right';
      x.fillText(`1:04.${112 + r * 82}`, w - 24, ry + 22);
      x.textAlign = 'left';
    }
  });

  // Screen 6: Live Speed Trap & Telemetry
  const telemTex = makeCanvas((x, w, h) => {
    x.fillStyle = '#060911'; x.fillRect(0, 0, w, h);
    x.fillStyle = '#0f172a'; x.fillRect(0, 0, w, 28);
    x.fillStyle = '#22c55e'; x.font = 'bold 13px monospace'; x.textAlign = 'left'; x.fillText('SPEED TRAP & ERS HYBRID POWER', 14, 18);
    x.fillStyle = '#00d4e8'; x.font = 'bold 36px monospace'; x.fillText('314.8 KM/H', 24, 85);
    x.fillStyle = '#94a3b8'; x.font = '12px sans-serif'; x.fillText('SPEED TRAP (FINISH STRAIGHT)', 24, 110);
    // Battery gauge
    x.fillStyle = '#22c55e'; x.fillRect(24, 130, 300, 24);
    x.fillStyle = '#ffffff'; x.font = 'bold 14px monospace'; x.fillText('ERS CHARGE: 84% (3.4 MJ USABLE)', 30, 147);
  });

  // Screen 7: Live Doppler Weather Radar
  const wxTex = makeCanvas((x, w, h) => {
    x.fillStyle = '#020710'; x.fillRect(0, 0, w, h);
    x.fillStyle = '#06b6d4'; x.fillRect(0, 0, w, 28);
    x.fillStyle = '#ffffff'; x.font = 'bold 13px sans-serif'; x.textAlign = 'left'; x.fillText('DOPPLER RAIN RADAR · 25 MIN PROJECTION', 14, 18);
    x.strokeStyle = 'rgba(0, 212, 232, 0.3)'; x.beginPath(); x.arc(w / 2, h / 2 + 10, 90, 0, Math.PI * 2); x.stroke();
    x.fillStyle = 'rgba(34, 197, 94, 0.7)'; x.beginPath(); x.arc(w / 2 + 40, h / 2 - 20, 45, 0, Math.PI * 2); x.fill();
    x.fillStyle = '#ffffff'; x.font = 'bold 14px monospace'; x.textAlign = 'center'; x.fillText('TRACK: DRY · AIR: 24.2°C', w / 2, h - 20);
  });

  // Screen 8: Pit Stop Strategy & Tyre Degradation
  const stratTex = makeCanvas((x, w, h) => {
    x.fillStyle = '#090d16'; x.fillRect(0, 0, w, h);
    x.fillStyle = '#a855f7'; x.fillRect(0, 0, w, 28);
    x.fillStyle = '#ffffff'; x.font = 'bold 13px sans-serif'; x.textAlign = 'left'; x.fillText('STRATEGY · PIT STOP WINDOW OPTIMIZER', 14, 18);
    x.fillStyle = '#22c55e'; x.font = 'bold 16px monospace'; x.fillText('TARGET: PLAN A (1-STOP: MEDIUM -> HARD)', 18, 65);
    x.fillStyle = '#f59e0b'; x.font = 'bold 14px monospace'; x.fillText('PIT WINDOW: LAP 24 - LAP 28', 18, 95);
    x.fillStyle = '#94a3b8'; x.font = '12px sans-serif'; x.fillText('ESTIMATED PIT LOSS: 20.4 SECONDS', 18, 125);
  });

  return [tvTex, onboardTex, gpsTex, fiaTex, timingTex, telemTex, wxTex, stratTex];
}

// ---------------------------------------------------------------------------
// 4. Main Pit Perch / Pit Wall Stand Builder
// ---------------------------------------------------------------------------
export function buildPitPerch(materials, layout, teamId = 'red-bull', teamColors = {}) {
  const g = new THREE.Group();
  g.name = 'Pit_Wall_Perch_Gantry';

  const teamName = teamColors[teamId]?.name || 'Red Bull Racing';
  const teamColor = teamColors[teamId]?.panel || '#192355';
  const teamAccent = teamColors[teamId]?.accent || '#DA2520';

  // Overall Stand Dimensions
  const totalLength = 32.0; // 3.2 meters long along Z (seats 4 people with spacious consoles)
  const standWidth = 14.0;  // 1.4 meters deep along X
  const platformY = 3.6;   // 36 cm elevation above pit lane floor
  const counterH = 7.8;    // 78 cm workstation height
  const canopyH = 22.0;    // 2.2 meters canopy height

  // ----------------------------------------------------------------
  // Platform & Chassis Frame
  // ----------------------------------------------------------------
  const aluMat = new THREE.MeshStandardMaterial({ color: 0xd3d7dc, roughness: 0.28, metalness: 0.9 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x1a1e26, roughness: 0.5, metalness: 0.3 });
  const plateMat = new THREE.MeshStandardMaterial({ color: 0x8f96a3, roughness: 0.4, metalness: 0.85 }); // Diamond plate
  const teamCanopyMat = new THREE.MeshStandardMaterial({ color: teamColor, roughness: 0.32, metalness: 0.15 });
  const acrylicMat = new THREE.MeshPhysicalMaterial({ color: 0x93c5fd, transparent: true, opacity: 0.35, roughness: 0.05, transmission: 0.9 });

  // Diamond plate floor platform
  const floorPlate = B(standWidth, 0.4, totalLength, 0, platformY, 0);
  g.add(new THREE.Mesh(floorPlate, plateMat));

  // Tubular aluminum frame chassis under platform
  const chassisGeos = [
    B(standWidth - 0.4, 0.8, 0.8, 0, platformY - 0.4, -totalLength / 2 + 0.4),
    B(standWidth - 0.4, 0.8, 0.8, 0, platformY - 0.4, totalLength / 2 - 0.4),
    B(0.8, 0.8, totalLength - 0.4, -standWidth / 2 + 0.4, platformY - 0.4, 0),
    B(0.8, 0.8, totalLength - 0.4, standWidth / 2 - 0.4, platformY - 0.4, 0),
    B(standWidth - 0.4, 0.8, 0.8, 0, platformY - 0.4, 0), // center crossbeam
  ];
  g.add(new THREE.Mesh(merged(chassisGeos), aluMat));

  // 6 Industrial Heavy-Duty Castors (at base, floor at y = 0)
  const castorWheels = [], castorForks = [];
  [-totalLength * 0.45, 0, totalLength * 0.45].forEach(cz => {
    [-standWidth * 0.42, standWidth * 0.42].forEach(cx => {
      castorWheels.push(CyX(0.7, 0.55, cx, 0.7, cz, 16));
      castorForks.push(
        B(1.8, 0.2, 1.8, cx, platformY - 1.0, cz),
        B(0.15, 1.2, 1.2, cx - 0.35, platformY - 1.6, cz),
        B(0.15, 1.2, 1.2, cx + 0.35, platformY - 1.6, cz)
      );
    });
  });
  g.add(new THREE.Mesh(merged(castorWheels), materials.rubber || darkMat));
  g.add(new THREE.Mesh(merged(castorForks), darkMat));

  // ----------------------------------------------------------------
  // Rear Access Stairs (leading up from the pit lane apron)
  // ----------------------------------------------------------------
  const stairsX = standWidth / 2 + 2.2;
  const stairGeos = [];
  for (let s = 0; s < 3; s++) {
    const sy = (platformY / 3) * (s + 0.5);
    const sx = standWidth / 2 + (3 - s) * 1.4;
    stairGeos.push(B(1.4, 0.3, 8.0, sx, sy, 0));
  }
  g.add(new THREE.Mesh(merged(stairGeos), plateMat));

  // Stair railings
  const stairRailings = [
    rod([standWidth / 2 + 4.2, 0, -4.0], [standWidth / 2, platformY + 6.0, -4.0], 0.15, 6),
    rod([standWidth / 2 + 4.2, 0, 4.0], [standWidth / 2, platformY + 6.0, 4.0], 0.15, 6),
    rod([standWidth / 2, platformY + 6.0, -4.0], [standWidth / 2, platformY + 6.0, 4.0], 0.15, 6),
  ];
  g.add(new THREE.Mesh(merged(stairRailings), aluMat));

  // ----------------------------------------------------------------
  // Workstation Desk & Countertop
  // ----------------------------------------------------------------
  // Main carbon-look desk counter running along Z at x = -2.8
  const deskX = -2.4;
  const deskGeos = [
    B(4.8, 0.5, totalLength - 1.0, deskX, counterH, 0), // Desk top
    B(0.4, counterH - platformY, totalLength - 1.0, deskX - 2.2, (counterH + platformY) / 2, 0), // Front knee panel
  ];
  g.add(new THREE.Mesh(merged(deskGeos), darkMat));

  // 4 Recessed Keyboards on desk
  const keyMat = new THREE.MeshStandardMaterial({ color: 0x111317, roughness: 0.5 });
  const seatZs = [-totalLength * 0.36, -totalLength * 0.12, totalLength * 0.12, totalLength * 0.36];
  const keys = [];
  seatZs.forEach(z => {
    keys.push(B(1.6, 0.08, 3.4, deskX, counterH + 0.28, z));
  });
  g.add(new THREE.Mesh(merged(keys), keyMat));

  // ----------------------------------------------------------------
  // 4 High-Back Racing Bucket Seats
  // ----------------------------------------------------------------
  const roles = [
    'RACE ENGINEER',
    'TEAM PRINCIPAL',    // The team manager seat!
    'CHIEF STRATEGIST',
    'SPORTING DIRECTOR',
  ];

  seatZs.forEach((z, i) => {
    const seat = createBucketSeat(z, roles[i], teamAccent);
    seat.position.x = 2.4; // Positioned behind the desk, facing the desk / pit lane (+X)
    seat.rotation.y = -Math.PI / 2; // Facing towards -X (looking at the desk and screens)
    g.add(seat);

    // Intercom box and headset per seat
    const intercom = createIntercomConsole(z);
    g.add(intercom);
  });

  // ----------------------------------------------------------------
  // Monitor Gantry (8 High-Res Screens in 2 Tiers)
  // ----------------------------------------------------------------
  const screenTextures = createPitPerchScreenTextures(teamColor);
  const monW = 6.4, monH = 4.2;
  const monX = deskX - 1.2;

  // Upper & Lower rows:
  // Upper row at y = counterH + 6.0
  // Lower row at y = counterH + 1.8
  const screenPositions = [
    // Upper row (4 screens)
    { x: monX, y: counterH + 6.0, z: seatZs[0], tex: screenTextures[0] },
    { x: monX, y: counterH + 6.0, z: seatZs[1], tex: screenTextures[1] },
    { x: monX, y: counterH + 6.0, z: seatZs[2], tex: screenTextures[2] },
    { x: monX, y: counterH + 6.0, z: seatZs[3], tex: screenTextures[3] },
    // Lower row (4 screens)
    { x: monX, y: counterH + 1.8, z: seatZs[0], tex: screenTextures[4] },
    { x: monX, y: counterH + 1.8, z: seatZs[1], tex: screenTextures[5] },
    { x: monX, y: counterH + 1.8, z: seatZs[2], tex: screenTextures[6] },
    { x: monX, y: counterH + 1.8, z: seatZs[3], tex: screenTextures[7] },
  ];

  const bezels = [];
  screenPositions.forEach((sp, idx) => {
    // Screen display quad
    const sMat = new THREE.MeshStandardMaterial({
      map: sp.tex,
      emissive: 0xffffff,
      emissiveMap: sp.tex,
      emissiveIntensity: 0.95,
      roughness: 0.2,
    });
    const sMesh = new THREE.Mesh(new THREE.PlaneGeometry(monW, monH), sMat);
    sMesh.rotation.y = Math.PI / 2; // Facing +X towards seats
    sMesh.position.set(sp.x + 0.15, sp.y, sp.z);
    sMesh.name = `PitPerch_Screen_${idx + 1}`;
    g.add(sMesh);

    // Bezel housing
    bezels.push(B(0.3, monH + 0.4, monW + 0.4, sp.x, sp.y, sp.z));
  });
  g.add(new THREE.Mesh(merged(bezels), darkMat));

  // Aluminum vertical mounting truss posts for the monitors
  const monTruss = [
    rod([monX, counterH, -totalLength * 0.48], [monX, canopyH - 2, -totalLength * 0.48], 0.2, 8),
    rod([monX, counterH, 0], [monX, canopyH - 2, 0], 0.2, 8),
    rod([monX, counterH, totalLength * 0.48], [monX, canopyH - 2, totalLength * 0.48], 0.2, 8),
  ];
  g.add(new THREE.Mesh(merged(monTruss), aluMat));

  // ----------------------------------------------------------------
  // Cantilevered Overhead Weather & Sun Canopy
  // ----------------------------------------------------------------
  const canopyDepth = standWidth + 2.0;
  const canopyRoof = [
    // Curved roof plane
    B(canopyDepth, 0.6, totalLength + 1.0, 0, canopyH, 0),
    // Front valance with team color & sponsor banner
    B(0.4, 2.4, totalLength + 1.0, -canopyDepth / 2 + 0.2, canopyH - 1.2, 0),
    // Rear valance
    B(0.4, 1.8, totalLength + 1.0, canopyDepth / 2 - 0.2, canopyH - 0.9, 0),
  ];
  g.add(new THREE.Mesh(merged(canopyRoof), teamCanopyMat));

  // Acrylic wind / rain deflector side screens
  const screenL = B(canopyDepth - 1.0, 10.0, 0.2, 0, canopyH - 5.5, -totalLength / 2 - 0.4);
  const screenR = B(canopyDepth - 1.0, 10.0, 0.2, 0, canopyH - 5.5, totalLength / 2 + 0.4);
  g.add(new THREE.Mesh(screenL, acrylicMat));
  g.add(new THREE.Mesh(screenR, acrylicMat));

  // Roof Antennas & Telemetry Mast on top
  const mastGeos = [
    rod([0, canopyH + 0.3, -8.0], [0, canopyH + 8.0, -8.0], 0.12, 6),
    rod([0, canopyH + 0.3, 8.0], [0, canopyH + 8.0, 8.0], 0.12, 6),
    Cy(0.8, 0.6, 0, canopyH + 0.5, 0, 16), // GPS dome
  ];
  g.add(new THREE.Mesh(merged(mastGeos), aluMat));

  // Recessed warm LED task downlight strip under the canopy
  const lightMat = new THREE.MeshBasicMaterial({ color: 0xf8fafc });
  const lightStrip = new THREE.Mesh(B(1.2, 0.1, totalLength - 2.0, 0, canopyH - 0.35, 0), lightMat);
  g.add(lightStrip);

  // Position the Pit Perch on the Pit Wall outside the garage:
  // In garage_builder.js: xf = X0 - PL.apron - PL.fastLane = -75 - 40 - 60 = -175.
  // The pit wall is centered at x = -178, running along Z.
  // We place the Pit Perch directly on the pit wall facing the pit lane:
  g.position.set(-174, 0, 0);
  g.rotation.y = 0; // facing back toward the garage and pit lane

  g.userData.click = 'pit_perch';
  g.userData.name = `${teamName} Pit Wall Stand (Pit Perch Command Gantry)`;
  g.userData.seatRoles = roles;

  return g;
}
