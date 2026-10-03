/**
 * track_environment.js — 2026 Formula 1 Start/Finish Line Track Environment
 * SREdesigns - Samuel R Erwin III
 * 
 * Exhaustive 3D Procedural Formula 1 Race Circuit Environment:
 * 1. Main Straight Tarmac & Official Chequered Finish Line:
 *    - High-grip textured asphalt with racing line rubbering & tire marbles
 *    - Authentic F1 Chequered Finish Line (high-DPI canvas texture)
 *    - Pole Position Box #1 (Max Verstappen) and staggered FIA starting grid boxes
 *    - FIA red and white serrated 3D ripple kerbs (rumble strips)
 *    - Green synthetic turf run-off strips & asphalt runoffs
 * 2. Start/Finish Overhead Gantry Bridge:
 *    - Structural steel space-frame lattice truss arching over the entire track
 *    - 5-light FIA Start Light pods (countdown & race start LEDs)
 *    - High-DPI digital LED timing & race info scoreboard
 *    - Official Rolex chronometer dial and electronic timing transponder loops
 * 3. Pit Wall & Oracle Red Bull Racing Pit Perch:
 *    - Concrete impact barrier with curved catch fence stanchions and wire mesh
 *    - Multi-station team telemetry command center with active data screens
 *    - Ergonomic team swivel seats, radio headsets, antennas
 *    - Pit board signaling gantry ("P1 · GAP +8.421 · L58")
 *    - Starter's stand with digital marshal flag display panel
 * 4. Pit Lane & Paddock Building:
 *    - Pit lane tarmac with speed limit line and Red Bull pit stop box
 *    - 2-story modern architectural Pit Building with team garage bays
 *    - Illuminated garage signage, tire warming racks with tire blankets
 *    - Paddock Club VIP hospitality suites with panoramic glass windows
 * 5. Main Grandstand Arena:
 *    - Stepped concrete spectator grandstand with tiered multi-color seating
 *    - Cantilevered stadium roof canopy with structural tension cables
 *    - Giant trackside LED Jumbotron live broadcast screen
 *    - Perimeter sponsor advertising boards (Oracle, Pirelli, Mobil 1, Rolex, SREdesigns)
 * 6. Stadium Floodlight Pylons & Track Lighting:
 *    - 4x tall lattice floodlight towers casting dramatic stadium sports lighting
 * 
 * Universal Datum:
 * - Car nose at X = 0 dm crosses the Finish Line at X = 0 dm!
 * - Track runs longitudinally along X axis from X = -800 dm to X = +800 dm.
 * - Car sits at Y = 0 on the tarmac deck.
 */

import * as THREE from 'three';
import { materials } from '../materials.js';

/**
 * 1. Procedural Texture Generators
 */

// Procedural Racing Asphalt Texture with fine aggregate stones and tire rubbering
function createAsphaltTexture() {
  const size = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  // Dark weathered asphalt base
  ctx.fillStyle = '#1c1f24';
  ctx.fillRect(0, 0, size, size);

  // Micro-aggregate gravel noise
  const imgData = ctx.getImageData(0, 0, size, size);
  const data = imgData.data;
  for (let i = 0; i < data.length; i += 4) {
    const noise = (Math.random() - 0.5) * 28;
    data[i] = Math.max(18, Math.min(48, data[i] + noise));
    data[i + 1] = Math.max(20, Math.min(52, data[i + 1] + noise));
    data[i + 2] = Math.max(24, Math.min(56, data[i + 2] + noise));
  }
  ctx.putImageData(imgData, 0, 0);

  // Faint longitudinal racing line rubbering
  const grad = ctx.createLinearGradient(0, 0, 0, size);
  grad.addColorStop(0, 'rgba(10, 12, 16, 0.45)');
  grad.addColorStop(0.3, 'rgba(8, 10, 14, 0.65)');
  grad.addColorStop(0.7, 'rgba(8, 10, 14, 0.65)');
  grad.addColorStop(1, 'rgba(10, 12, 16, 0.45)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(12, 60);
  tex.anisotropy = 16;
  return tex;
}

// Official FIA Chequered Finish Line Texture
function createFinishLineTexture() {
  const w = 2048;
  const h = 256;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');

  // Asphalt underlay
  ctx.fillStyle = '#181b20';
  ctx.fillRect(0, 0, w, h);

  // Chequered Flag Grid: 4 rows x 32 columns
  const cols = 32;
  const rows = 4;
  const cw = w / cols;
  const rh = h / rows;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const isWhite = (r + c) % 2 === 0;
      ctx.fillStyle = isWhite ? '#f4f6fa' : '#14161a';
      ctx.fillRect(c * cw, r * rh, cw, rh);

      // Subtle edge weathering
      if (isWhite) {
        ctx.strokeStyle = '#d0d4dc';
        ctx.lineWidth = 1;
        ctx.strokeRect(c * cw, r * rh, cw, rh);
      }
    }
  }

  // Faint tire skid rubber across finish line
  for (let t = 0; t < 6; t++) {
    const sy = 30 + t * 38;
    ctx.fillStyle = 'rgba(12, 14, 18, 0.42)';
    ctx.fillRect(0, sy, w, 22 + Math.random() * 12);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = 16;
  return tex;
}

// Starting Grid Slots Texture (Pole Position Box #1 and slots)
function createGridSlotsTexture() {
  const w = 1024;
  const h = 2048;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = 'rgba(0,0,0,0)';
  ctx.clearRect(0, 0, w, h);

  // Draw 4 Grid Slots
  for (let s = 0; s < 4; s++) {
    const isLeft = s % 2 === 0;
    const boxX = isLeft ? 180 : 580;
    const boxY = 220 + s * 460;
    const boxW = 280;
    const boxH = 340;

    // Outer white box
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 14;
    ctx.strokeRect(boxX, boxY, boxW, boxH);

    // Yellow alignment centerline
    ctx.strokeStyle = '#f6b800';
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.moveTo(boxX + boxW / 2, boxY + 20);
    ctx.lineTo(boxX + boxW / 2, boxY + boxH - 20);
    ctx.stroke();

    // Front boundary stop bar
    ctx.fillStyle = '#f6b800';
    ctx.fillRect(boxX - 20, boxY, boxW + 40, 24);

    // Pole Position #1 Badge
    if (s === 0) {
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 72px "Arial Black", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('1', boxX + boxW / 2, boxY + 120);

      ctx.font = 'bold 24px sans-serif';
      ctx.fillStyle = '#f6b800';
      ctx.fillText('POLE POSITION', boxX + boxW / 2, boxY + 160);
      ctx.font = 'bold 20px sans-serif';
      ctx.fillStyle = '#00d4e8';
      ctx.fillText('MAX VERSTAPPEN', boxX + boxW / 2, boxY + 190);
    } else {
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.font = 'bold 58px "Arial Black", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${s + 1}`, boxX + boxW / 2, boxY + 120);
    }

    // Heavy burnout rubber marks inside box
    ctx.fillStyle = 'rgba(8, 10, 14, 0.65)';
    ctx.fillRect(boxX + 25, boxY + 80, 50, boxH - 120);
    ctx.fillRect(boxX + boxW - 75, boxY + 80, 50, boxH - 120);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = 16;
  return tex;
}

// Overhead Gantry LED Scoreboard Texture (Red Bull Ring · Spielberg, Austria)
function createGantryScoreboardTexture() {
  const w = 2048;
  const h = 512;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');

  // Dark LED matrix background
  ctx.fillStyle = '#05070a';
  ctx.fillRect(0, 0, w, h);

  // Carbon border frame
  ctx.strokeStyle = '#1e2838';
  ctx.lineWidth = 16;
  ctx.strokeRect(8, 8, w - 16, h - 16);

  // Top header banner: Red Bull Ring Spielberg + Austrian Flags
  ctx.fillStyle = '#d90429';
  ctx.fillRect(16, 16, w - 32, 64);

  // Left Austrian Flag (Red-White-Red)
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(36, 32, 70, 32);
  ctx.fillStyle = '#d90429';
  ctx.fillRect(36, 32, 70, 10);
  ctx.fillRect(36, 54, 70, 10);

  // Right Austrian Flag
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(w - 106, 32, 70, 32);
  ctx.fillStyle = '#d90429';
  ctx.fillRect(w - 106, 32, 70, 10);
  ctx.fillRect(w - 106, 54, 70, 10);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 36px "Arial Black", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('RED BULL RING · SPIELBERG · GROSSER PREIS VON ÖSTERREICH', w / 2, 60);

  // Center Main Message: Winner & SREdesigns attribution
  ctx.fillStyle = '#f6b800';
  ctx.font = 'bold 88px "Arial Black", sans-serif';
  ctx.fillText('CHECKERED FLAG · WINNER', w / 2, 175);

  ctx.fillStyle = '#00d4e8';
  ctx.font = 'bold 54px monospace';
  ctx.fillText('1  MAX VERSTAPPEN  ·  ORACLE RED BULL RACING', w / 2, 260);

  // Bottom info strip: Lap count, Fastest Lap, SREdesigns
  ctx.fillStyle = '#0e1622';
  ctx.fillRect(24, 320, w - 48, 160);
  ctx.strokeStyle = '#00d4e8';
  ctx.lineWidth = 4;
  ctx.strokeRect(24, 320, w - 48, 160);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 38px monospace';
  ctx.textAlign = 'left';
  ctx.fillText('LAP 71 / 71 · FINAL RESULT', 60, 385);
  ctx.fillStyle = '#d90429';
  ctx.fillText('FASTEST LAP: 1:05.619 (VER)', 60, 445);

  ctx.textAlign = 'right';
  ctx.fillStyle = '#f6b800';
  ctx.font = 'bold 38px monospace';
  ctx.fillText('SREdesigns - Samuel R Erwin III', w - 60, 385);
  ctx.fillStyle = '#8b9bb0';
  ctx.font = '28px monospace';
  ctx.fillText('2026 FORMULA 1 TECHNICAL SHOWCASE', w - 60, 445);

  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = 16;
  return tex;
}

// Grandstand Jumbotron Video Board Texture (With Red Bull Ring Track Map & Telemetry)
function createJumbotronTexture() {
  const w = 1024;
  const h = 512;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#080c14';
  ctx.fillRect(0, 0, w, h);

  // Top Bar
  ctx.fillStyle = '#d90429';
  ctx.fillRect(0, 0, w, 50);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 28px "Arial Black", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('RED BULL RING · LIVE TELEMETRY & CIRCUIT MAP', w / 2, 35);

  // Left Section: Official Red Bull Ring Spielberg Circuit Map (10 Turns, 4.318 km)
  ctx.save();
  ctx.translate(140, 260);

  // Track layout path
  ctx.strokeStyle = '#223854';
  ctx.lineWidth = 14;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  // Start/Finish straight
  ctx.moveTo(-100, 110);
  ctx.lineTo(80, 110); // Start-Ziel
  ctx.lineTo(110, 80); // T1 Niki Lauda Kurve
  ctx.lineTo(60, -90); // Uphill straight to T3
  ctx.lineTo(40, -110); // T3 Remus hairpin
  ctx.lineTo(-40, -50); // Downhill to T4
  ctx.lineTo(-80, -20); // T4 Rauch Kurve
  ctx.lineTo(-60, 20);  // T6/T7
  ctx.lineTo(-30, 60);  // T8
  ctx.lineTo(-80, 85);  // T9 Jochen Rindt
  ctx.lineTo(-100, 110); // T10 Red Bull Mobile onto Start-Ziel
  ctx.closePath();
  ctx.stroke();

  // Active track outline
  ctx.strokeStyle = '#00d4e8';
  ctx.lineWidth = 5;
  ctx.stroke();

  // Car position beacon on start/finish line
  ctx.fillStyle = '#f6b800';
  ctx.beginPath();
  ctx.arc(-20, 110, 8, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 16px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('FINISH LINE (P1)', -20, 138);
  ctx.fillStyle = '#8b9bb0';
  ctx.font = '13px monospace';
  ctx.fillText('4.318 KM · 10 TURNS', 0, -125);
  ctx.restore();

  // Vertical divider line
  ctx.strokeStyle = '#1e2838';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(330, 60);
  ctx.lineTo(330, h - 20);
  ctx.stroke();

  // Right Section: Leaderboard Rows
  const drivers = [
    { pos: '1', name: 'VERSTAPPEN', team: 'RED BULL RACING', gap: 'LEADER', color: '#00d4e8' },
    { pos: '2', name: 'NORRIS',     team: 'MCLAREN',         gap: '+8.421', color: '#ff8000' },
    { pos: '3', name: 'LECLERC',    team: 'FERRARI',         gap: '+14.195', color: '#d90429' },
    { pos: '4', name: 'HAMILTON',   team: 'FERRARI',         gap: '+19.680', color: '#d90429' },
    { pos: '5', name: 'PIASTRI',    team: 'MCLAREN',         gap: '+24.310', color: '#ff8000' },
    { pos: '6', name: 'RUSSELL',    team: 'MERCEDES',        gap: '+28.940', color: '#00d2be' }
  ];

  drivers.forEach((d, idx) => {
    const y = 95 + idx * 64;
    ctx.fillStyle = idx === 0 ? 'rgba(0, 212, 232, 0.15)' : 'rgba(255,255,255,0.04)';
    ctx.fillRect(350, y - 35, w - 370, 52);

    ctx.fillStyle = d.color;
    ctx.fillRect(350, y - 35, 8, 52);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 26px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`${d.pos}  ${d.name}`, 370, y);

    ctx.fillStyle = '#8b9bb0';
    ctx.font = '20px monospace';
    ctx.fillText(d.team, 650, y);

    ctx.textAlign = 'right';
    ctx.fillStyle = idx === 0 ? '#f6b800' : '#ffffff';
    ctx.fillText(d.gap, w - 35, y);
  });

  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = 16;
  return tex;
}

// Trackside Sponsor Billboard Textures (Red Bull Ring Official Partners)
function createSponsorBannerTexture() {
  const w = 2048;
  const h = 256;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#080d16';
  ctx.fillRect(0, 0, w, h);

  const sponsors = [
    { text: 'RED BULL', bg: '#0c1626', color: '#f6b800' },
    { text: 'ORACLE', bg: '#d90429', color: '#ffffff' },
    { text: 'TAG HEUER', bg: '#006039', color: '#ffffff' },
    { text: 'PIRELLI', bg: '#f6b800', color: '#d90429' },
    { text: 'MOBIL 1', bg: '#ffffff', color: '#002f6c' },
    { text: 'RAUCH', bg: '#e5aa00', color: '#0c1626' },
    { text: 'SREdesigns', bg: '#0c1626', color: '#00d4e8' }
  ];

  const colW = w / sponsors.length;
  sponsors.forEach((sp, idx) => {
    ctx.fillStyle = sp.bg;
    ctx.fillRect(idx * colW, 0, colW, h);

    ctx.fillStyle = sp.color;
    ctx.font = 'bold 50px "Arial Black", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(sp.text, idx * colW + colW / 2, h / 2);
  });

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.repeat.set(4, 1);
  tex.anisotropy = 16;
  return tex;
}



/**
 * 2. Main Track Environment Constructor
 */
export function createTrackEnvironment(options = {}) {
  const envGroup = new THREE.Group();
  envGroup.name = 'F1_GrandPrix_FinishLine_Environment';

  const asphaltTex = createAsphaltTexture();
  const finishLineTex = createFinishLineTexture();
  const gridSlotsTex = createGridSlotsTexture();
  const gantryScoreTex = createGantryScoreboardTexture();
  const jumbotronTex = createJumbotronTexture();
  const sponsorTex = createSponsorBannerTexture();

  // Materials
  const tarmacMat = new THREE.MeshStandardMaterial({
    map: asphaltTex,
    roughness: 0.88,
    metalness: 0.12
  });

  const finishLineMat = new THREE.MeshStandardMaterial({
    map: finishLineTex,
    roughness: 0.55,
    metalness: 0.20
  });

  const concreteMat = new THREE.MeshStandardMaterial({
    color: 0x8a929e,
    roughness: 0.90,
    metalness: 0.05
  });

  const steelMat = new THREE.MeshStandardMaterial({
    color: 0x3a424e,
    roughness: 0.35,
    metalness: 0.85
  });

  const redKerbMat = new THREE.MeshStandardMaterial({ color: 0xd90429, roughness: 0.65 });
  const whiteKerbMat = new THREE.MeshStandardMaterial({ color: 0xf4f6fa, roughness: 0.65 });
  const turfMat = new THREE.MeshStandardMaterial({ color: 0x1f5429, roughness: 0.95 });

  // =========================================================================
  // A. MAIN STRAIGHT TARMAC TRACK (X in [-800, +800] dm, Z in [-80, +80] dm)
  // Total Width = 160 dm (16 meters), Total Length = 1600 dm (160 meters)
  // =========================================================================
  const trackLength = 1600;
  const trackWidth = 160;

  const trackGeo = new THREE.PlaneGeometry(trackLength, trackWidth);
  const trackMesh = new THREE.Mesh(trackGeo, tarmacMat);
  trackMesh.name = 'Classic_Track_Tarmac'; // names used by cad/tyre_states.js (wet track sheen)
  trackMesh.rotation.x = -Math.PI / 2; // Lie flat on Y = 0
  trackMesh.position.set(0, 0, 0);
  trackMesh.receiveShadow = true;
  envGroup.add(trackMesh);

  // OFFICIAL CHEQUERED FINISH LINE (Directly beneath car front wing at X = 0)
  const flWidth = trackWidth; // Full track width
  const flDepth = 24;         // 2.4 meters wide along X
  const flGeo = new THREE.PlaneGeometry(flDepth, flWidth);
  const flMesh = new THREE.Mesh(flGeo, finishLineMat);
  flMesh.name = 'Classic_Track_FinishLine';
  flMesh.rotation.x = -Math.PI / 2;
  flMesh.position.set(0, 0.02, 0); // Flush on tarmac
  flMesh.receiveShadow = true;
  envGroup.add(flMesh);

  // STARTING GRID SLOTS (Pole Position Box #1 and slots behind finish line)
  const gridGeo = new THREE.PlaneGeometry(380, trackWidth);
  const gridMat = new THREE.MeshStandardMaterial({
    map: gridSlotsTex,
    transparent: true,
    roughness: 0.6,
    metalness: 0.1
  });
  const gridMesh = new THREE.Mesh(gridGeo, gridMat);
  gridMesh.name = 'Classic_Track_GridSlots';
  gridMesh.rotation.x = -Math.PI / 2;
  gridMesh.position.set(200, 0.03, 0);
  gridMesh.receiveShadow = true;
  envGroup.add(gridMesh);

  // RED & WHITE 3D SERRATED RIPPLE KERBS (Left & Right Track Edges)
  [-1, 1].forEach((side, sIdx) => {
    const kerbZ = side * (trackWidth / 2 + 7.5);
    const numKerbBlocks = 80;
    const blockLength = trackLength / numKerbBlocks;

    for (let k = 0; k < numKerbBlocks; k++) {
      const kX = -trackLength / 2 + k * blockLength + blockLength / 2;
      const isRed = k % 2 === 0;
      const kerbGeo = new THREE.BoxGeometry(blockLength, 0.6, 15);
      const kerb = new THREE.Mesh(kerbGeo, isRed ? redKerbMat : whiteKerbMat);
      kerb.name = 'Classic_Track_Kerb';
      kerb.position.set(kX, 0.25, kerbZ);
      kerb.receiveShadow = true;
      envGroup.add(kerb);
    }

    // Green Synthetic Turf Runoff Strip outside kerbs
    const turfZ = side * (trackWidth / 2 + 25);
    const turfGeo = new THREE.PlaneGeometry(trackLength, 20);
    const turf = new THREE.Mesh(turfGeo, turfMat);
    turf.rotation.x = -Math.PI / 2;
    turf.position.set(0, 0.01, turfZ);
    turf.receiveShadow = true;
    envGroup.add(turf);
  });

  // =========================================================================
  // B. START/FINISH OVERHEAD GANTRY BRIDGE (FIA Starting Lights & Scoreboard)
  // Spans over the track at X = -12 dm (directly over finish line)
  // =========================================================================
  const gantryGroup = new THREE.Group();
  gantryGroup.position.set(-12, 0, 0);

  const gantrySpan = trackWidth + 40; // 200 dm span
  const gantryHeight = 72;            // 7.2 meters clearance

  // Main Horizontal Truss Arch (Overhead box girder)
  const gantryGirderGeo = new THREE.BoxGeometry(16, 14, gantrySpan);
  const gantryGirder = new THREE.Mesh(gantryGirderGeo, steelMat);
  gantryGirder.position.set(0, gantryHeight, 0);
  gantryGirder.castShadow = true;
  gantryGroup.add(gantryGirder);

  // Dual Vertical Support Towers (Lattice pylons on Left & Right)
  [-1, 1].forEach(side => {
    const towerZ = side * (gantrySpan / 2 - 6);
    const towerGeo = new THREE.BoxGeometry(14, gantryHeight, 12);
    const tower = new THREE.Mesh(towerGeo, steelMat);
    tower.position.set(0, gantryHeight / 2, towerZ);
    tower.castShadow = true;
    gantryGroup.add(tower);

    // Diagonal truss bracing
    const braceGeo = new THREE.CylinderGeometry(0.8, 0.8, gantryHeight * 1.05, 8);
    const brace1 = new THREE.Mesh(braceGeo, steelMat);
    brace1.rotation.z = Math.PI / 6;
    brace1.position.set(0, gantryHeight / 2, towerZ);
    gantryGroup.add(brace1);
  });

  // HIGH-DPI LED TIMING SCOREBOARD DISPLAY (Faces oncoming traffic at +X)
  const scoreGeo = new THREE.PlaneGeometry(160, 40);
  const scoreMat = new THREE.MeshBasicMaterial({ map: gantryScoreTex });
  const scoreMesh = new THREE.Mesh(scoreGeo, scoreMat);
  scoreMesh.position.set(8.2, gantryHeight, 0); // Faces +X
  gantryGroup.add(scoreMesh);

  // 5-LIGHT FIA START LIGHT CLUSTERS (Countdown Start Lights)
  const lightsGroup = new THREE.Group();
  lightsGroup.position.set(8.5, gantryHeight - 14, 0);

  for (let pod = -2; pod <= 2; pod++) {
    const podZ = pod * 14;
    // Black light pod housing
    const podGeo = new THREE.BoxGeometry(1.5, 9, 6);
    const podMesh = new THREE.Mesh(podGeo, materials.carbonMatteStructural);
    podMesh.position.set(0, 0, podZ);
    lightsGroup.add(podMesh);

    // 2 Red High-Intensity LED Lights per pod (Top & Bottom)
    [-2.2, 2.2].forEach(ly => {
      const ledGeo = new THREE.CylinderGeometry(1.6, 1.6, 0.6, 16);
      const ledMat = new THREE.MeshStandardMaterial({
        color: 0xff0000,
        emissive: 0xff0000,
        emissiveIntensity: 2.8
      });
      const led = new THREE.Mesh(ledGeo, ledMat);
      led.rotation.z = Math.PI / 2;
      led.position.set(0.8, ly, podZ);
      lightsGroup.add(led);
    });
  }
  gantryGroup.add(lightsGroup);

  envGroup.add(gantryGroup);

  // =========================================================================
  // C. THE PIT WALL & RED BULL COMMAND STAND (Along Z = +88 dm)
  // =========================================================================
  const pitWallZ = 88;
  const pitWallGroup = new THREE.Group();
  pitWallGroup.position.set(0, 0, pitWallZ);

  // Continuous Concrete Pit Wall Barrier (1.2m height)
  const wallGeo = new THREE.BoxGeometry(trackLength, 12, 4);
  const wallMesh = new THREE.Mesh(wallGeo, concreteMat);
  wallMesh.position.set(0, 6, 0);
  wallMesh.castShadow = true;
  wallMesh.receiveShadow = true;
  pitWallGroup.add(wallMesh);

  // Safety Debris Catch Fence (Steel stanchions & wire mesh reaching 3.5m)
  const numPosts = 50;
  const postSpacing = trackLength / numPosts;
  for (let p = 0; p < numPosts; p++) {
    const postX = -trackLength / 2 + p * postSpacing;
    const postGeo = new THREE.CylinderGeometry(0.35, 0.35, 26, 8);
    const post = new THREE.Mesh(postGeo, steelMat);
    post.position.set(postX, 24, 0);
    pitWallGroup.add(post);

    // Curved top catch arm angled towards track
    const armGeo = new THREE.CylinderGeometry(0.25, 0.25, 8, 8);
    const arm = new THREE.Mesh(armGeo, steelMat);
    arm.rotation.x = -Math.PI / 4;
    arm.position.set(postX, 38, -2.5);
    pitWallGroup.add(arm);
  }

  // Semi-transparent Wire Mesh Screen along pit wall
  const fenceGeo = new THREE.PlaneGeometry(trackLength, 28);
  const fenceMat = new THREE.MeshStandardMaterial({
    color: 0x222830,
    wireframe: true,
    transparent: true,
    opacity: 0.35
  });
  const fenceMesh = new THREE.Mesh(fenceGeo, fenceMat);
  fenceMesh.position.set(0, 26, 0);
  pitWallGroup.add(fenceMesh);

  // ORACLE RED BULL RACING PIT PERCH (Command Center Stand at X = 15 dm)
  const perchGroup = new THREE.Group();
  perchGroup.position.set(15, 0, 6); // Just behind the concrete wall

  // Elevated Aluminum Deck
  const deckGeo = new THREE.BoxGeometry(45, 4, 18);
  const deck = new THREE.Mesh(deckGeo, steelMat);
  deck.position.set(0, 8, 0);
  perchGroup.add(deck);

  // Carbon Overhead Canopy with Red Bull Branding
  const canopyGeo = new THREE.BoxGeometry(48, 1.5, 20);
  const canopy = new THREE.Mesh(canopyGeo, materials.redBullNavy);
  canopy.position.set(0, 26, 0);
  perchGroup.add(canopy);

  // 4 Multi-Screen Telemetry Monitor Stations
  for (let s = -1.5; s <= 1.5; s += 1.0) {
    const stX = s * 10;
    // Monitor array (3 screens per station)
    for (let m = -1; m <= 1; m++) {
      const monGeo = new THREE.BoxGeometry(3.6, 2.4, 0.2);
      const monMat = new THREE.MeshBasicMaterial({
        color: m === 0 ? 0x00d4e8 : (m > 0 ? 0xf6b800 : 0x3dd68c)
      });
      const mon = new THREE.Mesh(monGeo, monMat);
      mon.position.set(stX + m * 3.8, 14, -6);
      perchGroup.add(mon);
    }

    // Team Swivel Chair (Red Bull Navy/Red)
    const chairBaseGeo = new THREE.CylinderGeometry(1.2, 1.2, 3, 12);
    const chairBase = new THREE.Mesh(chairBaseGeo, steelMat);
    chairBase.position.set(stX, 10, 2);
    perchGroup.add(chairBase);

    const chairSeatGeo = new THREE.BoxGeometry(3.2, 4.5, 3.2);
    const chairSeat = new THREE.Mesh(chairSeatGeo, materials.redBullNavy);
    chairSeat.position.set(stX, 13, 2);
    perchGroup.add(chairSeat);
  }

  // Pit Board Signaling Arm ("P1 · GAP +8.421")
  const pbBoardGeo = new THREE.BoxGeometry(10, 7, 0.3);
  const pbMat = new THREE.MeshStandardMaterial({ color: 0x0a0d14, roughness: 0.5 });
  const pbMesh = new THREE.Mesh(pbBoardGeo, pbMat);
  pbMesh.position.set(-18, 16, -3);
  perchGroup.add(pbMesh);

  pitWallGroup.add(perchGroup);
  envGroup.add(pitWallGroup);

  // =========================================================================
  // D. PIT LANE & PIT BUILDING / GARAGES (Z in [+96, +220] dm)
  // =========================================================================
  const pitLaneGroup = new THREE.Group();

  // Pit Lane Tarmac (Width = 50 dm, Length = 1600 dm)
  const pitLaneGeo = new THREE.PlaneGeometry(trackLength, 50);
  const pitLaneMesh = new THREE.Mesh(pitLaneGeo, tarmacMat);
  pitLaneMesh.name = 'Classic_Track_PitLane';
  pitLaneMesh.rotation.x = -Math.PI / 2;
  pitLaneMesh.position.set(0, 0.01, 120);
  pitLaneMesh.receiveShadow = true;
  pitLaneGroup.add(pitLaneMesh);

  // Speed Limit Line (80 km/h) & Red Bull Pit Stop Box
  const pbBoxGeo = new THREE.PlaneGeometry(28, 22);
  const pbBoxMat = new THREE.MeshBasicMaterial({ color: 0xf6b800 });
  const pbBox = new THREE.Mesh(pbBoxGeo, pbBoxMat);
  pbBox.rotation.x = -Math.PI / 2;
  pbBox.position.set(15, 0.02, 110);
  pitLaneGroup.add(pbBox);

  // TWO-STORY MODERN PIT BUILDING (Garages + VIP Paddock Club)
  const pitBldgGroup = new THREE.Group();
  pitBldgGroup.position.set(0, 0, 185);

  const bldgLength = 650;
  const bldgHeight = 55;
  const bldgDepth = 80;

  // Structural Building Body (Architectural white/concrete)
  const bldgGeo = new THREE.BoxGeometry(bldgLength, bldgHeight, bldgDepth);
  const bldg = new THREE.Mesh(bldgGeo, concreteMat);
  bldg.position.set(0, bldgHeight / 2, 0);
  bldg.castShadow = true;
  bldg.receiveShadow = true;
  pitBldgGroup.add(bldg);

  // Ground Floor: 6 Team Garage Bays with Red Bull Branding
  for (let g = -2.5; g <= 2.5; g += 1.0) {
    const gX = g * 90;
    // Garage Opening Cutout
    const bayGeo = new THREE.BoxGeometry(70, 24, 6);
    const bayMat = new THREE.MeshStandardMaterial({
      color: 0x0c121c,
      roughness: 0.8
    });
    const bay = new THREE.Mesh(bayGeo, bayMat);
    bay.position.set(gX, 12, -bldgDepth / 2 - 1);
    pitBldgGroup.add(bay);

    // Garage Overhead Team Signage Banner
    const bannerGeo = new THREE.BoxGeometry(72, 6, 1);
    const bannerMat = new THREE.MeshBasicMaterial({ color: 0x00d4e8 });
    const banner = new THREE.Mesh(bannerGeo, bannerMat);
    banner.position.set(gX, 26, -bldgDepth / 2 - 2);
    pitBldgGroup.add(banner);
  }

  // Second Floor: VIP Paddock Club Panoramic Tinted Glass Ribbon
  const glassRibbonGeo = new THREE.BoxGeometry(bldgLength - 20, 18, 2);
  const glassRibbonMat = new THREE.MeshPhysicalMaterial({
    color: 0x112233,
    roughness: 0.1,
    transmission: 0.85,
    ior: 1.52,
    reflectivity: 0.9
  });
  const glassRibbon = new THREE.Mesh(glassRibbonGeo, glassRibbonMat);
  glassRibbon.position.set(0, 42, -bldgDepth / 2 - 1);
  pitBldgGroup.add(glassRibbon);

  pitLaneGroup.add(pitBldgGroup);
  envGroup.add(pitLaneGroup);

  // =========================================================================
  // E. THE MAIN GRANDSTAND (Stadium Arena along Z in [-90, -220] dm)
  // =========================================================================
  const grandstandGroup = new THREE.Group();
  grandstandGroup.position.set(0, 0, -145);

  const gsLength = 750;
  const gsDepth = 90;
  const gsHeight = 65;

  // Stepped Grandstand Concrete Wedge
  const gsShape = new THREE.Shape();
  gsShape.moveTo(0, 0);
  gsShape.lineTo(gsDepth, gsHeight);
  gsShape.lineTo(gsDepth, 0);
  gsShape.closePath();

  const gsExtrude = { steps: 1, depth: gsLength, bevelEnabled: false };
  const gsGeo = new THREE.ExtrudeGeometry(gsShape, gsExtrude);
  gsGeo.center();
  const gsMesh = new THREE.Mesh(gsGeo, concreteMat);
  gsMesh.rotation.y = Math.PI / 2;
  gsMesh.position.set(0, gsHeight / 2, 0);
  gsMesh.receiveShadow = true;
  grandstandGroup.add(gsMesh);

  // Thousands of Colored Spectator Seats (Arranged in Red, Blue, White Blocks)
  const seatBlockGeo = new THREE.BoxGeometry(gsLength * 0.9, 1.2, gsDepth * 0.85);
  const seatMat = new THREE.MeshStandardMaterial({
    color: 0xd90429,
    roughness: 0.6
  });
  const seatBlock = new THREE.Mesh(seatBlockGeo, seatMat);
  seatBlock.rotation.x = Math.atan2(gsHeight, gsDepth);
  seatBlock.position.set(0, gsHeight / 2 + 1.2, 0);
  grandstandGroup.add(seatBlock);

  // Cantilevered Stadium Roof Canopy
  const roofGeo = new THREE.BoxGeometry(gsLength + 20, 2.5, gsDepth + 35);
  const roofMat = new THREE.MeshStandardMaterial({
    color: 0x222a36,
    roughness: 0.4,
    metalness: 0.6
  });
  const roof = new THREE.Mesh(roofGeo, roofMat);
  roof.position.set(0, gsHeight + 22, -10);
  roof.castShadow = true;
  grandstandGroup.add(roof);

  // GIANT JUMBOTRON LIVE BROADCAST VIDEO SCREEN (At X = 40 dm, facing car)
  const jumbotronGroup = new THREE.Group();
  jumbotronGroup.position.set(40, gsHeight + 42, -5);

  const jumbotronHousingGeo = new THREE.BoxGeometry(105, 55, 6);
  const jumbotronHousing = new THREE.Mesh(jumbotronHousingGeo, steelMat);
  jumbotronGroup.add(jumbotronHousing);

  const jumbotronScreenGeo = new THREE.PlaneGeometry(100, 50);
  const jumbotronScreenMat = new THREE.MeshBasicMaterial({ map: jumbotronTex });
  const jumbotronScreen = new THREE.Mesh(jumbotronScreenGeo, jumbotronScreenMat);
  jumbotronScreen.position.set(0, 0, 3.1);
  jumbotronGroup.add(jumbotronScreen);

  grandstandGroup.add(jumbotronGroup);

  // Perimeter Sponsor Billboard Banners along the trackside fence
  const bannerWallGeo = new THREE.PlaneGeometry(trackLength, 8);
  const bannerWallMat = new THREE.MeshBasicMaterial({ map: sponsorTex });
  const bannerWall = new THREE.Mesh(bannerWallGeo, bannerWallMat);
  bannerWall.position.set(0, 4.2, 42); // Along bottom edge of grandstand
  grandstandGroup.add(bannerWall);

  envGroup.add(grandstandGroup);

  // =========================================================================
  // F. 4x STADIUM FLOODLIGHT TOWERS (Height = 125 dm = 12.5 meters)
  // =========================================================================
  const floodlightPositions = [
    { x: -350, z:  95 },
    { x:  350, z:  95 },
    { x: -350, z: -95 },
    { x:  350, z: -95 }
  ];

  floodlightPositions.forEach(flp => {
    const towerGroup = new THREE.Group();
    towerGroup.position.set(flp.x, 0, flp.z);

    // Lattice steel mast
    const mastGeo = new THREE.CylinderGeometry(1.2, 2.4, 120, 8);
    const mast = new THREE.Mesh(mastGeo, steelMat);
    mast.position.set(0, 60, 0);
    mast.castShadow = true;
    towerGroup.add(mast);

    // Floodlight Head Cluster (16 high-intensity lamps)
    const headGeo = new THREE.BoxGeometry(14, 10, 4);
    const head = new THREE.Mesh(headGeo, steelMat);
    head.position.set(0, 122, 0);
    head.rotation.y = flp.z > 0 ? -Math.PI / 6 : Math.PI / 6;
    towerGroup.add(head);

    // Glowing LED Lamp Array
    const lampArrayGeo = new THREE.PlaneGeometry(12, 8);
    const lampArrayMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const lampArray = new THREE.Mesh(lampArrayGeo, lampArrayMat);
    lampArray.position.set(0, 122, flp.z > 0 ? -2.1 : 2.1);
    lampArray.rotation.y = flp.z > 0 ? Math.PI : 0;
    towerGroup.add(lampArray);

    // Actual SpotLight casting light on track
    const spot = new THREE.SpotLight(0xfff5ea, 2.2, 280, Math.PI / 3, 0.4, 1.2);
    spot.position.set(flp.x, 122, flp.z);
    spot.target.position.set(0, 0, 0);
    spot.castShadow = true;
    envGroup.add(spot);
    envGroup.add(spot.target);

    envGroup.add(towerGroup);
  });

  // =========================================================================
  // G. STYRIAN ALPS (STEIERMARK MOUNTAINS) PANORAMIC HORIZON
  // Procedural alpine mountain ranges encircling the Red Bull Ring in Spielberg
  // =========================================================================
  const mountainGroup = new THREE.Group();
  mountainGroup.name = 'Styrian_Alps_Horizon';

  // 1. Forefront Forested Ridge (Dark Austrian Alpine Pine Green)
  const ridgePineMat = new THREE.MeshStandardMaterial({
    color: 0x14281a,
    roughness: 0.95,
    metalness: 0.05
  });

  // 2. Mid-Range Rocky Alpine Slopes (Granite Grey / Slate)
  const alpineRockMat = new THREE.MeshStandardMaterial({
    color: 0x36424e,
    roughness: 0.90,
    metalness: 0.10
  });

  // 3. Distant Misty Mountain Peaks (Atmospheric Blue-Grey)
  const distantPeakMat = new THREE.MeshStandardMaterial({
    color: 0x54667a,
    roughness: 0.85,
    metalness: 0.12
  });

  // Build layered mountain ridges in a ring around the track
  const mountainLayers = [
    { radius: 650, height: 110, segments: 48, mat: ridgePineMat, yBase: -20 },
    { radius: 950, height: 180, segments: 64, mat: alpineRockMat, yBase: -10 },
    { radius: 1350, height: 260, segments: 72, mat: distantPeakMat, yBase: 0 }
  ];

  mountainLayers.forEach((layer, lIdx) => {
    const numPts = layer.segments;
    const verts = [];
    const indices = [];

    // Base circle and mountain peaks
    for (let p = 0; p <= numPts; p++) {
      const angle = (p / numPts) * Math.PI * 2;
      // Procedural pseudo-noise elevation using layered sinusoids
      const elevationNoise = 
        Math.sin(angle * 4 + lIdx) * 0.35 +
        Math.cos(angle * 7 + lIdx * 2) * 0.25 +
        Math.sin(angle * 13 + lIdx * 3) * 0.15 +
        Math.cos(angle * 23) * 0.08;
      
      const peakHeight = layer.height * (0.65 + elevationNoise);
      const rad = layer.radius * (1.0 + Math.sin(angle * 6) * 0.08);

      const x = Math.cos(angle) * rad;
      const z = Math.sin(angle) * rad;

      // Bottom vertex
      verts.push(x, layer.yBase, z);
      // Peak vertex
      verts.push(x, layer.yBase + peakHeight, z);
    }

    // Build triangular strip connecting bottom and peak vertices
    for (let p = 0; p < numPts; p++) {
      const b1 = p * 2;
      const t1 = p * 2 + 1;
      const b2 = (p + 1) * 2;
      const t2 = (p + 1) * 2 + 1;

      indices.push(b1, t1, b2);
      indices.push(b2, t1, t2);
    }

    const mGeo = new THREE.BufferGeometry();
    mGeo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    mGeo.setIndex(indices);
    mGeo.computeVertexNormals();

    const mMesh = new THREE.Mesh(mGeo, layer.mat);
    mMesh.name = `Mountain_Ridge_Layer_${lIdx + 1}`;
    mountainGroup.add(mMesh);
  });

  envGroup.add(mountainGroup);

  return envGroup;
}
