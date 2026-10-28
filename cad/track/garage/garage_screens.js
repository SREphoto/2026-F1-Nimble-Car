/**
 * garage_screens.js — High-fidelity 2026 F1 Garage & Telemetry Screen Textures
 * SREdesigns - Samuel R Erwin III
 *
 * Generates bespoke, crisp, canvas-based monitor screens for the team garage:
 *  1. Steering Wheel Tool & Button Guide (PCU-8D functions, dials, LCD pages)
 *  2. 2026 World Championship Standings & Racing Calendar Schedule
 *  3. Live Doppler Weather Radar & Environmental Telemetry
 *  4. SREdesigns.com Official Design Studio & CAD Showcase
 *  5. Project Acknowledgements, Regulations & Technical Credits
 *  6. Real-time Multi-Channel Vehicle Telemetry & Engine Traces
 *  7. Circuit GPS Tracker & Sector Delta Map
 *  8. 4-Corner Infrared Tyre Thermal & Wear Matrix
 *  9. Live Timing Tower (Pillar TVs)
 * 10. Diagnostics Laptop Workstation Screen
 */
import * as THREE from 'three';
import { REGULATIONS } from './garage_data.js';

// Safe cross-browser roundRect polyfill (Safari < 16, older WebViews, array radii)
if (typeof CanvasRenderingContext2D !== 'undefined') {
  const origRoundRect = CanvasRenderingContext2D.prototype.roundRect;
  CanvasRenderingContext2D.prototype.roundRect = function(x, y, w, h, radii = 0) {
    if (origRoundRect) {
      try {
        origRoundRect.call(this, x, y, w, h, radii);
        return this;
      } catch (_) {}
    }
    let tl, tr, br, bl;
    if (Array.isArray(radii)) {
      if (radii.length === 1) {
        tl = tr = br = bl = radii[0];
      } else if (radii.length === 2) {
        tl = br = radii[0];
        tr = bl = radii[1];
      } else if (radii.length === 3) {
        tl = radii[0];
        tr = bl = radii[1];
        br = radii[2];
      } else {
        [tl, tr, br, bl] = radii;
      }
    } else {
      tl = tr = br = bl = Number(radii) || 0;
    }
    const maxR = Math.min(Math.abs(w) / 2, Math.abs(h) / 2);
    tl = Math.min(Math.max(0, tl), maxR);
    tr = Math.min(Math.max(0, tr), maxR);
    br = Math.min(Math.max(0, br), maxR);
    bl = Math.min(Math.max(0, bl), maxR);

    this.moveTo(x + tl, y);
    this.lineTo(x + w - tr, y);
    this.quadraticCurveTo(x + w, y, x + w, y + tr);
    this.lineTo(x + w, y + h - br);
    this.quadraticCurveTo(x + w, y + h, x + w - br, y + h);
    this.lineTo(x + bl, y + h);
    this.quadraticCurveTo(x, y + h, x, y + h - bl);
    this.lineTo(x, y + tl);
    this.quadraticCurveTo(x, y, x + tl, y);
    return this;
  };
}

function createScreenTex(w, h, drawFn, { aniso = 16 } = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  drawFn(ctx, w, h);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = aniso;
  tex.userData = { canvas, draw: drawFn };
  return tex;
}

export function redrawScreen(tex, ...args) {
  if (!tex || !tex.userData?.canvas) return;
  const { canvas, draw } = tex.userData;
  const ctx = canvas.getContext('2d');
  draw(ctx, canvas.width, canvas.height, ...args);
  tex.needsUpdate = true;
}

// ---------------------------------------------------------------------------
// 1. Steering Wheel Tool & Button Guide
// ---------------------------------------------------------------------------
export function drawSteeringWheelScreen(ctx, w, h, { teamName = 'Red Bull Racing', teamColor = '#4781D7' } = {}) {
  const gr = ctx.createLinearGradient(0, 0, 0, h);
  gr.addColorStop(0, '#060a12');
  gr.addColorStop(1, '#020408');
  ctx.fillStyle = gr;
  ctx.fillRect(0, 0, w, h);

  // Grid pattern
  ctx.strokeStyle = 'rgba(0, 212, 232, 0.05)';
  ctx.lineWidth = 1;
  for (let x = 0; x < w; x += 32) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
  for (let y = 0; y < h; y += 32) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }

  // Header banner
  ctx.fillStyle = '#0b1322';
  ctx.fillRect(16, 16, w - 32, 54);
  ctx.fillStyle = teamColor;
  ctx.fillRect(16, 16, 6, 54);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 22px "Helvetica Neue", Arial, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('PCU-8D STEERING WHEEL CONTROLS & DISPLAY GUIDE', 34, 43);

  ctx.fillStyle = '#00d4e8';
  ctx.font = 'bold 13px monospace';
  ctx.textAlign = 'right';
  ctx.fillText('2026 ACTIVE AERO & HYBRID INTERFACE', w - 34, 43);

  // Left Column: Steering Wheel Graphic Outline
  const cx = w * 0.35, cy = h * 0.58;
  ctx.save();
  ctx.translate(cx, cy);

  // Wheel Outer Body / Rim
  ctx.fillStyle = '#101319';
  ctx.strokeStyle = '#252e3d';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.roundRect(-220, -140, 440, 260, [40, 40, 60, 60]);
  ctx.fill();
  ctx.stroke();

  // Textured ergonomic rubber hand grips
  ctx.fillStyle = '#171b24';
  ctx.strokeStyle = '#323d50';
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.roundRect(-230, -110, 48, 200, 24); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.roundRect(182, -110, 48, 200, 24); ctx.fill(); ctx.stroke();

  // Carbon weave center faceplate
  ctx.fillStyle = '#0c0e14';
  ctx.strokeStyle = '#1d2330';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(-165, -125, 330, 230, 20);
  ctx.fill();
  ctx.stroke();

  // PCU-8D LCD Display housing
  ctx.fillStyle = '#020305';
  ctx.strokeStyle = '#00d4e8';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(-100, -85, 200, 110, 8);
  ctx.fill();
  ctx.stroke();

  // Shift LEDs above display
  const leds = [
    '#22c55e', '#22c55e', '#22c55e', '#22c55e', '#22c55e',
    '#eab308', '#eab308', '#eab308', '#eab308', '#eab308',
    '#3b82f6', '#3b82f6', '#3b82f6', '#ef4444', '#ef4444'
  ];
  leds.forEach((c, i) => {
    const lx = -90 + i * 13;
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.arc(lx, -98, 4, 0, Math.PI * 2);
    ctx.fill();
  });

  // LCD Screen Content
  ctx.fillStyle = '#040d1a';
  ctx.fillRect(-94, -80, 188, 100);

  // Big Gear
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 44px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('7', 0, -25);

  // Speed & RPM
  ctx.fillStyle = '#00e5ff';
  ctx.font = 'bold 15px monospace';
  ctx.fillText('314 KM/H', 0, -62);
  ctx.fillStyle = '#94a3b8';
  ctx.font = '11px monospace';
  ctx.fillText('11,400 RPM', 0, 8);

  // Delta & Bias
  ctx.fillStyle = '#22c55e';
  ctx.font = 'bold 12px monospace';
  ctx.fillText('-0.284', -52, -25);
  ctx.fillStyle = '#f59e0b';
  ctx.fillText('56.0%', 52, -25);

  // Active Aero Mode Badge
  ctx.fillStyle = '#0284c7';
  ctx.fillRect(-45, -5, 90, 16);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 10px sans-serif';
  ctx.fillText('X-MODE (LOW DRAG)', 0, 7);

  // Buttons around wheel
  const buttons = [
    { label: 'DRS', col: '#00d4e8', x: -140, y: -95 },
    { label: 'RADIO', col: '#eab308', x: -140, y: -55 },
    { label: 'PL', col: '#ef4444', x: -140, y: -15 },
    { label: 'N', col: '#10b981', x: -140, y: 25 },
    { label: 'OT', col: '#ec4899', x: 140, y: -95 },
    { label: 'AERO', col: '#3b82f6', x: 140, y: -55 },
    { label: 'DRINK', col: '#06b6d4', x: 140, y: -15 },
    { label: 'OK', col: '#22c55e', x: 140, y: 25 },
  ];
  buttons.forEach(b => {
    ctx.fillStyle = '#1e293b';
    ctx.strokeStyle = b.col;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(b.x, b.y, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 8px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(b.label, b.x, b.y + 3);
  });

  // Lower Rotary Dials
  const rotaries = [
    { label: 'STRAT', val: '04', col: '#f59e0b', x: -55, y: 55 },
    { label: 'DIFF MID', val: '06', col: '#00d4e8', x: 0, y: 65 },
    { label: 'ERS', val: '07', col: '#22c55e', x: 55, y: 55 },
  ];
  rotaries.forEach(r => {
    ctx.fillStyle = '#18202c';
    ctx.strokeStyle = r.col;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(r.x, r.y, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = r.col;
    ctx.font = 'bold 9px monospace';
    ctx.fillText(r.val, r.x, r.y + 3);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '8px sans-serif';
    ctx.fillText(r.label, r.x, r.y + 28);
  });

  ctx.restore();

  // Right Column: Comprehensive Feature Breakdown Panel
  const rx = w * 0.64, rw = w * 0.33;
  ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(rx, 86, rw, h - 104, 12);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#38bdf8';
  ctx.font = 'bold 15px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('CONTROL & DISPLAY MODES', rx + 16, 114);

  const entries = [
    ['AERO BUTTON', 'Active aerodynamics toggle: X-Mode (low drag straight) vs Z-Mode (high downforce cornering).'],
    ['STRAT ROTARY', 'Engine & electrical deployment strategy: Mode 1 (Max Attack) to 12 (Energy Conservation).'],
    ['DIFF THUMBWHEELS', 'Differential entry, apex & exit locking torque adjusters for precision rotation.'],
    ['BBAL / BMIG', 'Brake Balance (% front/rear) and Dynamic Brake Migration during high deceleration.'],
    ['PL / LIMITER', 'Pit Lane 80 km/h speed governor for safe entry and exit.'],
    ['OT (OVERTAKE)', 'Full 350 kW MGU-K battery discharge for defensive sprint or overtaking maneuver.'],
    ['LCD PAGES (4)', 'RACE (pace/deltas) · TYRES (temps/wear) · ERS (SoC/harvest) · SETUP (diagnostics).'],
  ];

  entries.forEach(([title, desc], i) => {
    const ey = 144 + i * 46;
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 12px monospace';
    ctx.fillText(`▶ ${title}`, rx + 16, ey);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px system-ui, sans-serif';
    ctx.fillText(desc, rx + 16, ey + 18, rw - 32);
  });
}

// ---------------------------------------------------------------------------
// 2. 2026 Racing Stats, Standings & Schedule Screen
// ---------------------------------------------------------------------------
export function drawStandingsScreen(ctx, w, h, { teamName = 'Red Bull Racing' } = {}) {
  ctx.fillStyle = '#070b14';
  ctx.fillRect(0, 0, w, h);

  // Subtle background telemetry grid
  ctx.strokeStyle = 'rgba(255,255,255,0.04)';
  for (let y = 0; y < h; y += 24) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }

  // Header
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(16, 16, w - 32, 50);
  ctx.fillStyle = '#ef4444';
  ctx.fillRect(16, 16, 6, 50);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 20px "Helvetica Neue", Arial, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('2026 FIA FORMULA ONE WORLD CHAMPIONSHIP™', 34, 41);

  ctx.fillStyle = '#38bdf8';
  ctx.font = 'bold 12px monospace';
  ctx.textAlign = 'right';
  ctx.fillText('ROUND 08 · AUSTRIAN GRAND PRIX · RED BULL RING', w - 34, 41);

  // Two columns: Left = Drivers, Right = Constructors & Calendar
  const colW = (w - 48) / 2;

  // Left Column: Drivers Championship
  ctx.fillStyle = '#0f192b';
  ctx.strokeStyle = '#1e293b';
  ctx.beginPath();
  ctx.roundRect(16, 80, colW, h - 96, 10);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#38bdf8';
  ctx.font = 'bold 14px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('DRIVER WORLD CHAMPIONSHIP (TOP 8)', 32, 104);

  const drivers = [
    { pos: 1, no: 3, name: 'Max Verstappen', team: 'Red Bull Racing', pts: 178, col: '#4781D7' },
    { pos: 2, no: 1, name: 'Lando Norris', team: 'McLaren', pts: 164, col: '#F47600' },
    { pos: 3, no: 16, name: 'Charles Leclerc', team: 'Ferrari', pts: 142, col: '#ED1131' },
    { pos: 4, no: 44, name: 'Lewis Hamilton', team: 'Ferrari', pts: 129, col: '#ED1131' },
    { pos: 5, no: 81, name: 'Oscar Piastri', team: 'McLaren', pts: 118, col: '#F47600' },
    { pos: 6, no: 63, name: 'George Russell', team: 'Mercedes', pts: 96, col: '#00D7B6' },
    { pos: 7, no: 12, name: 'Kimi Antonelli', team: 'Mercedes', pts: 68, col: '#00D7B6' },
    { pos: 8, no: 55, name: 'Carlos Sainz', team: 'Williams', pts: 44, col: '#1868DB' },
  ];

  drivers.forEach((d, i) => {
    const rowY = 126 + i * 38;
    ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.2)';
    ctx.fillRect(26, rowY, colW - 20, 32);

    ctx.fillStyle = d.col;
    ctx.fillRect(26, rowY, 4, 32);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 13px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`P${d.pos}`, 38, rowY + 16);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px monospace';
    ctx.fillText(`#${d.no}`, 72, rowY + 16);

    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText(d.name, 110, rowY + 16);

    ctx.fillStyle = '#64748b';
    ctx.font = '11px sans-serif';
    ctx.fillText(d.team, 250, rowY + 16);

    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`${d.pts} PTS`, colW + 6, rowY + 16);
  });

  // Right Column: Constructors & Calendar
  const rx = 32 + colW;
  ctx.fillStyle = '#0f192b';
  ctx.strokeStyle = '#1e293b';
  ctx.beginPath();
  ctx.roundRect(rx, 80, colW, h - 96, 10);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#38bdf8';
  ctx.font = 'bold 14px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('CONSTRUCTORS CHAMPIONSHIP', rx + 16, 104);

  const constructors = [
    { pos: 1, team: 'McLaren', pts: 282, col: '#F47600' },
    { pos: 2, team: 'Ferrari', pts: 271, col: '#ED1131' },
    { pos: 3, team: 'Red Bull Racing', pts: 212, col: '#4781D7' },
    { pos: 4, team: 'Mercedes', pts: 164, col: '#00D7B6' },
    { pos: 5, team: 'Williams', pts: 62, col: '#1868DB' },
  ];

  constructors.forEach((c, i) => {
    const rowY = 124 + i * 34;
    ctx.fillStyle = c.col;
    ctx.fillRect(rx + 16, rowY + 4, 4, 22);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(c.team, rx + 28, rowY + 16);

    // Bar gauge
    const barW = (colW - 190) * (c.pts / 300);
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.fillRect(rx + 140, rowY + 8, colW - 200, 12);
    ctx.fillStyle = c.col;
    ctx.fillRect(rx + 140, rowY + 8, barW, 12);

    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`${c.pts}`, rx + colW - 16, rowY + 16);
  });

  // Upcoming Schedule Box at the bottom of the right column
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.strokeStyle = '#1e293b';
  ctx.beginPath();
  ctx.roundRect(rx + 16, 310, colW - 32, 110, 8);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#e2e8f0';
  ctx.font = 'bold 12px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('CALENDAR PROGRESS · UPCOMING ROUNDS', rx + 28, 332);

  const rounds = [
    { r: 'R08', name: 'Austrian GP', date: 'CURRENT', status: 'ACTIVE' },
    { r: 'R09', name: 'British GP (Silverstone)', date: 'JUL 10-12', status: 'NEXT' },
    { r: 'R10', name: 'Belgian GP (Spa-Francorchamps)', date: 'JUL 24-26', status: 'UPCOMING' },
  ];

  rounds.forEach((rd, i) => {
    const y = 354 + i * 20;
    ctx.fillStyle = rd.status === 'ACTIVE' ? '#22c55e' : '#94a3b8';
    ctx.font = 'bold 11px monospace';
    ctx.fillText(rd.r, rx + 28, y);
    ctx.fillStyle = rd.status === 'ACTIVE' ? '#ffffff' : '#cbd5e1';
    ctx.font = '11px sans-serif';
    ctx.fillText(rd.name, rx + 65, y);
    ctx.fillStyle = rd.status === 'ACTIVE' ? '#22c55e' : '#64748b';
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(rd.date, rx + colW - 32, y);
    ctx.textAlign = 'left';
  });
}

// ---------------------------------------------------------------------------
// 3. Live Doppler Weather Radar & Environmental Settings Screen
// ---------------------------------------------------------------------------
export function drawWeatherRadarScreen(ctx, w, h, { cloud = 0.25, rain = 0.0, windKmh = 14, windFrom = 220, water = 0.0 } = {}) {
  ctx.fillStyle = '#040810';
  ctx.fillRect(0, 0, w, h);

  // Header
  ctx.fillStyle = '#0a1220';
  ctx.fillRect(16, 16, w - 32, 48);
  ctx.fillStyle = '#06b6d4';
  ctx.fillRect(16, 16, 6, 48);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 18px "Helvetica Neue", Arial, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('CIRCUIT METEOROLOGICAL RADAR & TELEMETRY', 32, 40);

  ctx.fillStyle = '#38bdf8';
  ctx.font = 'bold 11px monospace';
  ctx.textAlign = 'right';
  ctx.fillText('LIVE DOPPLER TRACK-WEATHER STATION', w - 32, 40);

  // Left Section: Circular Doppler Radar Scope
  const cx = w * 0.32, cy = h * 0.58, radius = Math.min(w * 0.26, h * 0.36);

  ctx.save();
  ctx.translate(cx, cy);

  // Radar circular background
  ctx.fillStyle = '#020b17';
  ctx.strokeStyle = '#0e2b4d';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Range rings
  [0.33, 0.66, 1.0].forEach(rRatio => {
    ctx.strokeStyle = 'rgba(0, 212, 232, 0.2)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(0, 0, radius * rRatio, 0, Math.PI * 2);
    ctx.stroke();
  });

  // Crosshairs
  ctx.strokeStyle = 'rgba(0, 212, 232, 0.2)';
  ctx.beginPath(); ctx.moveTo(-radius, 0); ctx.lineTo(radius, 0); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, -radius); ctx.lineTo(0, radius); ctx.stroke();

  // Simulated precipitation echoes / storm cells
  const seed = (cloud * 10 + rain * 5);
  for (let a = 0; a < Math.PI * 2; a += 0.3) {
    const dist = (0.2 + 0.7 * Math.sin(a * 2 + seed)) * radius;
    const cellR = (15 + rain * 40) * (0.5 + 0.5 * Math.cos(a * 3));
    const px = Math.cos(a) * dist, py = Math.sin(a) * dist;

    const grad = ctx.createRadialGradient(px, py, 2, px, py, cellR);
    if (rain > 0.4) {
      grad.addColorStop(0, 'rgba(239, 68, 68, 0.85)'); // Red heavy rain
      grad.addColorStop(0.5, 'rgba(245, 158, 11, 0.65)'); // Orange
      grad.addColorStop(1, 'rgba(34, 197, 94, 0)');
    } else if (rain > 0.05 || cloud > 0.5) {
      grad.addColorStop(0, 'rgba(34, 197, 94, 0.75)'); // Green light rain
      grad.addColorStop(0.6, 'rgba(56, 189, 248, 0.4)'); // Blue drizzle
      grad.addColorStop(1, 'rgba(2, 132, 199, 0)');
    } else {
      grad.addColorStop(0, 'rgba(56, 189, 248, 0.3)');
      grad.addColorStop(1, 'rgba(56, 189, 248, 0)');
    }
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(px, py, cellR, 0, Math.PI * 2);
    ctx.fill();
  }

  // Circuit trace in center
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.ellipse(0, 0, 36, 18, 0.4, 0, Math.PI * 2);
  ctx.stroke();

  // Radar sweep line
  ctx.strokeStyle = 'rgba(0, 229, 255, 0.8)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(Math.cos(windFrom * Math.PI / 180) * radius, Math.sin(windFrom * Math.PI / 180) * radius);
  ctx.stroke();

  ctx.restore();

  // Right Section: Weather Conditions & Live Settings Panel
  const rx = w * 0.60, rw = w * 0.37;
  ctx.fillStyle = '#0a1424';
  ctx.strokeStyle = '#1e2e48';
  ctx.beginPath();
  ctx.roundRect(rx, 74, rw, h - 90, 10);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#38bdf8';
  ctx.font = 'bold 14px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('LIVE ATMOSPHERIC PARAMETERS', rx + 16, 100);

  const rainLabel = rain > 0.5 ? 'HEAVY RAIN' : rain > 0.1 ? 'LIGHT RAIN' : rain > 0 ? 'DRIZZLE' : 'DRY';
  const trackCondition = water > 0.5 ? 'WET (FULL WETS)' : water > 0.1 ? 'DAMP (INTERMEDIATES)' : 'DRY (SLICKS)';

  const params = [
    ['AIR TEMPERATURE', '24.2 °C', '#f8fafc'],
    ['TRACK TEMPERATURE', '38.6 °C', '#fbbf24'],
    ['CLOUD COVER', `${Math.round(cloud * 100)}%`, '#94a3b8'],
    ['PRECIPITATION', `${rainLabel} (${Math.round(rain * 100)}%)`, rain > 0 ? '#38bdf8' : '#22c55e'],
    ['WIND SPEED & VECTOR', `${Math.round(windKmh)} km/h · ${Math.round(windFrom)}°`, '#f8fafc'],
    ['TRACK WATER FILM', `${Math.round(water * 100)}% · ${trackCondition}`, water > 0.1 ? '#38bdf8' : '#22c55e'],
    ['RADAR RISK FORECAST', rain > 0 ? 'Rain sustained next 25 min' : '0% rain probability', rain > 0 ? '#f59e0b' : '#22c55e'],
  ];

  params.forEach(([k, v, col], i) => {
    const y = 130 + i * 30;
    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px sans-serif';
    ctx.fillText(k, rx + 16, y);

    ctx.fillStyle = col;
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(v, rx + rw - 16, y);
    ctx.textAlign = 'left';
  });

  // Quick Preset Selection bar
  const barY = 350;
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.fillRect(rx + 16, barY, rw - 32, 70);

  ctx.fillStyle = '#38bdf8';
  ctx.font = 'bold 11px sans-serif';
  ctx.fillText('QUICK WEATHER PRESET SELECTOR (CLICKABLE)', rx + 24, barY + 20);

  const presets = ['CLEAR', 'OVERCAST', 'DRIZZLE', 'WET', 'STORM'];
  presets.forEach((p, idx) => {
    const bx = rx + 24 + idx * ((rw - 48) / 5);
    ctx.fillStyle = '#1e293b';
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1;
    ctx.strokeRect(bx, barY + 30, (rw - 58) / 5, 26);
    ctx.fillRect(bx, barY + 30, (rw - 58) / 5, 26);

    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(p, bx + ((rw - 58) / 10), barY + 47);
  });
}

// ---------------------------------------------------------------------------
// 4. SREdesigns.com Official Design Studio & CAD Showcase Screen
// ---------------------------------------------------------------------------
export function drawSREdesignsScreen(ctx, w, h, { teamName = 'Red Bull Racing' } = {}) {
  // Deep tech gradient background
  const gr = ctx.createLinearGradient(0, 0, w, h);
  gr.addColorStop(0, '#060a12');
  gr.addColorStop(0.5, '#0a1324');
  gr.addColorStop(1, '#020509');
  ctx.fillStyle = gr;
  ctx.fillRect(0, 0, w, h);

  // Geometric accent grid lines
  ctx.strokeStyle = 'rgba(0, 212, 232, 0.08)';
  ctx.lineWidth = 1;
  for (let x = 0; x < w; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
  for (let y = 0; y < h; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }

  // Glowing diagonal accent ribbon
  ctx.strokeStyle = 'rgba(0, 212, 232, 0.25)';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(0, h * 0.8); ctx.lineTo(w * 0.8, 0); ctx.stroke();

  // Branding Card
  const pad = 24;
  ctx.fillStyle = 'rgba(11, 19, 34, 0.85)';
  ctx.strokeStyle = '#00d4e8';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(pad, pad, w - pad * 2, h - pad * 2, 16);
  ctx.fill();
  ctx.stroke();

  // Top SREdesigns Brand Mark
  ctx.fillStyle = '#00d4e8';
  ctx.font = 'bold 36px "Helvetica Neue", Arial, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText('SREdesigns', pad + 32, pad + 28);

  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 18px "Helvetica Neue", Arial, sans-serif';
  ctx.fillText('SAMUEL R ERWIN III', pad + 250, pad + 34);

  ctx.fillStyle = '#64748b';
  ctx.font = '12px monospace';
  ctx.fillText('AUTOMOTIVE DESIGN · COMPUTATIONAL AERODYNAMICS · INTERACTIVE 3D SYSTEMS', pad + 32, pad + 74);

  // Divider
  ctx.strokeStyle = 'rgba(255,255,255,0.12)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(pad + 32, pad + 98);
  ctx.lineTo(w - pad - 32, pad + 98);
  ctx.stroke();

  // Three Feature Cards across the middle
  const cardW = (w - pad * 2 - 96) / 3;
  const cardH = 200;
  const cardY = pad + 118;

  const features = [
    {
      title: '2026 F1 NIMBLE CAR',
      sub: 'Next-Gen Regulatory Model',
      body: 'Comprehensive 3D parametric CAD assembly conforming to the 2026 FIA Technical Regulations. Features active aerodynamics (X-mode / Z-mode) and 50/50 hybrid power unit architecture.'
    },
    {
      title: 'REAL-TIME DIGITAL TWIN',
      sub: 'Interactive WebGL Systems',
      body: 'Precision kinematic rigging, high-speed telemetry streaming, procedural PBR liveries, tyre thermal models, dynamic weather simulation, and interactive pit garage.'
    },
    {
      title: 'ENGINEERING PORTFOLIO',
      sub: 'SREdesigns.com',
      body: 'Official design laboratory and engineering portfolio of Samuel R Erwin III. Focused on high-performance mobility concepts, advanced visualization, and cutting-edge web applications.'
    }
  ];

  features.forEach((f, idx) => {
    const fx = pad + 32 + idx * (cardW + 16);
    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = idx === 0 ? '#38bdf8' : '#1e293b';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(fx, cardY, cardW, cardH, 10);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 13px monospace';
    ctx.fillText(f.title, fx + 16, cardY + 22);

    ctx.fillStyle = '#94a3b8';
    ctx.font = 'italic 11px sans-serif';
    ctx.fillText(f.sub, fx + 16, cardY + 42);

    ctx.fillStyle = '#cbd5e1';
    ctx.font = '11px/1.4 system-ui, sans-serif';
    wrapText(ctx, f.body, fx + 16, cardY + 70, cardW - 32, 16);
  });

  // Footer Banner with Website Link
  const footY = h - pad - 60;
  ctx.fillStyle = '#070d19';
  ctx.fillRect(pad + 32, footY, w - pad * 2 - 64, 42);

  ctx.fillStyle = '#22c55e';
  ctx.font = 'bold 14px monospace';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('OFFICIAL WEBSITE: HTTPS://SREDESIGNS.COM', pad + 48, footY + 21);

  ctx.fillStyle = '#38bdf8';
  ctx.font = 'bold 12px monospace';
  ctx.textAlign = 'right';
  ctx.fillText('CLICK TO LAUNCH BROWSER', w - pad - 48, footY + 21);
}

// ---------------------------------------------------------------------------
// 5. Project Acknowledgements & Technical Regulations Computer Screen
// ---------------------------------------------------------------------------
export function drawAcknowledgementsScreen(ctx, w, h, { teamName = 'Red Bull Racing' } = {}) {
  ctx.fillStyle = '#070b14';
  ctx.fillRect(0, 0, w, h);

  // Terminal header
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(16, 16, w - 32, 46);
  ctx.fillStyle = '#8b5cf6';
  ctx.fillRect(16, 16, 6, 46);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 18px "Helvetica Neue", Arial, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('PROJECT ACKNOWLEDGEMENTS & TECHNICAL CREDITS', 32, 39);

  ctx.fillStyle = '#a78bfa';
  ctx.font = 'bold 11px monospace';
  ctx.textAlign = 'right';
  ctx.fillText('2026 F1 NIMBLE CAR PROJECT · SREdesigns', w - 32, 39);

  const pad = 24;
  const colW = (w - pad * 2 - 20) / 2;

  // Left Column: Concept, Regulations & 3D Engineering
  ctx.fillStyle = '#0b1322';
  ctx.strokeStyle = '#1e293b';
  ctx.beginPath();
  ctx.roundRect(pad, 74, colW, h - 94, 10);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#a78bfa';
  ctx.font = 'bold 13px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('PROJECT ARCHITECT & ENGINEERING', pad + 16, 96);

  const leftCredits = [
    ['Lead Creator & Designer', 'Samuel R Erwin III (SREdesigns)'],
    ['Architecture & Implementation', 'Full-stack 3D parametric WebGL, Three.js & Web Audio SFX'],
    ['FIA Technical Regulations', '2026 Formula 1 "Nimble Car" Next-Gen Rulebook (Article C5)'],
    ['Active Aerodynamics', 'Straightline X-Mode (Drag Reduction) & High-G Z-Mode (Cornering)'],
    ['Power Unit Specifications', '1.6L Turbo V6 ICE (~400 kW) + 350 kW MGU-K Hybrid Powertrain'],
    ['Sustainable Fuel Standards', '100% Advanced Drop-In Sustainable Biofuel (3,000 MJ/h limit)'],
  ];

  leftCredits.forEach(([k, v], i) => {
    const y = 126 + i * 42;
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 11px monospace';
    ctx.fillText(k, pad + 16, y);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px sans-serif';
    ctx.fillText(v, pad + 16, y + 17);
  });

  // Right Column: Open Source, 3D Assets & Community Contributors
  const rx = pad + colW + 20;
  ctx.fillStyle = '#0b1322';
  ctx.strokeStyle = '#1e293b';
  ctx.beginPath();
  ctx.roundRect(rx, 74, colW, h - 94, 10);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#38bdf8';
  ctx.font = 'bold 13px sans-serif';
  ctx.fillText('3D MODELS, DATA & OPEN LICENSES', rx + 16, 96);

  const rightCredits = [
    ['2026 Redbull RB22 Model', 'Dave (Tyler_Dave) via Sketchfab (CC BY 4.0)'],
    ['Max Verstappen Helmet 3D', 'Fabianmml via Sketchfab (CC BY 4.0)'],
    ['Bell GP3 Racing Helmet 3D', 'nNiCo67 via Sketchfab (CC BY 4.0)'],
    ['Three.js WebGL Engine', 'Mr.doob and the Three.js open-source community (MIT)'],
    ['Meshopt & GLTF Loaders', 'Zeux & Khronos Group 3D compression toolchain'],
    ['Formula 1 & Pirelli Motorsport', 'Technical references for 18-inch wheels and low-profile slick tyres'],
  ];

  rightCredits.forEach(([k, v], i) => {
    const y = 126 + i * 42;
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 11px monospace';
    ctx.fillText(k, rx + 16, y);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px sans-serif';
    ctx.fillText(v, rx + 16, y + 17);
  });
}

// ---------------------------------------------------------------------------
// 6. High-Speed Vehicle Telemetry & Engine Traces Screen
// ---------------------------------------------------------------------------
export function drawTelemetryScreen(ctx, w, h) {
  ctx.fillStyle = '#060a12';
  ctx.fillRect(0, 0, w, h);

  // Grid
  ctx.strokeStyle = 'rgba(0, 212, 232, 0.08)';
  ctx.lineWidth = 1;
  for (let y = 0; y < h; y += 28) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
  for (let x = 0; x < w; x += 36) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }

  // Header
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(12, 12, w - 24, 38);
  ctx.fillStyle = '#22c55e';
  ctx.fillRect(12, 12, 4, 38);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 15px "Helvetica Neue", Arial, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('CAR #03 TELEMETRY CHANNELS · LIVE SPEED & HYBRID DEPLOYMENT', 26, 31);

  // Channels
  const channels = [
    { name: 'SPEED (KM/H)', col: '#00d4e8', min: 0, max: 350, val: '314' },
    { name: 'THROTTLE (%)', col: '#22c55e', min: 0, max: 100, val: '100%' },
    { name: 'BRAKE BBW (BAR)', col: '#ef4444', min: 0, max: 120, val: '0' },
    { name: 'ENGINE RPM', col: '#eab308', min: 4000, max: 12500, val: '11,400' },
  ];

  channels.forEach((ch, idx) => {
    const y0 = 64 + idx * 88, h0 = 76;
    ctx.fillStyle = 'rgba(15, 23, 42, 0.5)';
    ctx.fillRect(16, y0, w - 32, h0);

    ctx.fillStyle = ch.col;
    ctx.font = 'bold 11px monospace';
    ctx.fillText(ch.name, 24, y0 + 16);
    ctx.textAlign = 'right';
    ctx.fillText(ch.val, w - 24, y0 + 16);
    ctx.textAlign = 'left';

    // Simulated waveform trace
    ctx.strokeStyle = ch.col;
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i <= 64; i++) {
      const x = 24 + i * ((w - 48) / 64);
      const wave = Math.sin(i * 0.25 + idx * 2) * 16 + Math.sin(i * 0.7) * 8;
      const y = y0 + 48 - (idx === 2 ? 0 : wave);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();
  });
}

// ---------------------------------------------------------------------------
// 7. Circuit GPS Tracker & Sector Delta Map Screen
// ---------------------------------------------------------------------------
export function drawCircuitGpsScreen(ctx, w, h) {
  ctx.fillStyle = '#060911';
  ctx.fillRect(0, 0, w, h);

  // Header
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(12, 12, w - 24, 38);
  ctx.fillStyle = '#f59e0b';
  ctx.fillRect(12, 12, 4, 38);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 15px "Helvetica Neue", Arial, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('CIRCUIT TRACK GPS POSITION · RED BULL RING SPIELBERG', 26, 31);

  // Circuit trace
  const cx = w * 0.45, cy = h * 0.55;
  ctx.save();
  ctx.translate(cx, cy);

  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 14;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  drawRbrPath(ctx);
  ctx.stroke();

  ctx.strokeStyle = '#0284c7';
  ctx.lineWidth = 6;
  drawRbrPath(ctx);
  ctx.stroke();

  // Car Position Marker
  ctx.fillStyle = '#ef4444';
  ctx.beginPath();
  ctx.arc(-80, -40, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 10px monospace';
  ctx.fillText('CAR #03', -70, -45);

  ctx.restore();

  // Sector timing box on the right
  const bx = w * 0.72, bw = w * 0.25;
  ctx.fillStyle = '#0f172a';
  ctx.strokeStyle = '#1e293b';
  ctx.beginPath();
  ctx.roundRect(bx, 60, bw, h - 76, 8);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#38bdf8';
  ctx.font = 'bold 12px sans-serif';
  ctx.fillText('SECTOR DELTAS', bx + 12, 82);

  const sectors = [
    ['SECTOR 1', '16.421', '#a855f7'], // Purple fastest
    ['SECTOR 2', '28.812', '#22c55e'], // Green personal best
    ['SECTOR 3', '19.145', '#eab308'], // Yellow
    ['LAST LAP', '1:04.378', '#f8fafc'],
    ['BEST LAP', '1:04.112', '#a855f7'],
  ];

  sectors.forEach(([s, t, c], i) => {
    const y = 114 + i * 36;
    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px monospace';
    ctx.fillText(s, bx + 12, y);
    ctx.fillStyle = c;
    ctx.font = 'bold 13px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(t, bx + bw - 12, y);
    ctx.textAlign = 'left';
  });
}

function drawRbrPath(ctx) {
  ctx.beginPath();
  ctx.moveTo(-160, 50);
  ctx.lineTo(-60, 50); // Main straight
  ctx.arcTo(40, 50, 40, -40, 30); // Turn 1
  ctx.lineTo(80, -90); // Uphill straight
  ctx.arcTo(160, -90, 160, 0, 35); // Turn 3
  ctx.lineTo(130, 20); // Downhill
  ctx.arcTo(90, 80, -20, 80, 40); // Turn 4 & middle sector
  ctx.lineTo(-90, 90);
  ctx.arcTo(-160, 90, -160, 50, 30);
  ctx.closePath();
}

// ---------------------------------------------------------------------------
// 8. 4-Corner Infrared Tyre Thermal & Wear Matrix Screen
// ---------------------------------------------------------------------------
export function drawTyreThermalScreen(ctx, w, h) {
  ctx.fillStyle = '#060912';
  ctx.fillRect(0, 0, w, h);

  // Header
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(12, 12, w - 24, 38);
  ctx.fillStyle = '#eab308';
  ctx.fillRect(12, 12, 4, 38);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 15px "Helvetica Neue", Arial, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('4-CORNER TYRE TEMPERATURE & PRESSURE MATRIX', 26, 31);

  // 4 Quadrants for FL, FR, RL, RR
  const corners = [
    { id: 'FRONT LEFT', temp: '102°C', p: '23.5 PSI', wear: '88%', x: 20, y: 60 },
    { id: 'FRONT RIGHT', temp: '104°C', p: '23.8 PSI', wear: '85%', x: w / 2 + 10, y: 60 },
    { id: 'REAR LEFT', temp: '108°C', p: '21.0 PSI', wear: '82%', x: 20, y: h / 2 + 35 },
    { id: 'REAR RIGHT', temp: '111°C', p: '21.2 PSI', wear: '79%', x: w / 2 + 10, y: h / 2 + 35 },
  ];

  const qw = w / 2 - 30, qh = h / 2 - 45;

  corners.forEach(c => {
    ctx.fillStyle = '#0c1424';
    ctx.strokeStyle = '#1e293b';
    ctx.beginPath();
    ctx.roundRect(c.x, c.y, qw, qh, 8);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 12px monospace';
    ctx.fillText(c.id, c.x + 12, c.y + 20);

    // Thermal band graphic (Inner / Middle / Outer)
    const bandW = (qw - 24) / 3;
    const bandH = 24;
    ['#22c55e', '#eab308', '#ef4444'].forEach((clr, bi) => {
      ctx.fillStyle = clr;
      ctx.fillRect(c.x + 12 + bi * bandW, c.y + 36, bandW - 2, bandH);
    });

    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px monospace';
    ctx.fillText('INNER · MID · OUTER', c.x + 12, c.y + 74);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px monospace';
    ctx.fillText(`CARCASS: ${c.temp}`, c.x + 12, c.y + 98);
    ctx.fillStyle = '#38bdf8';
    ctx.fillText(`PRESS: ${c.p}`, c.x + 12, c.y + 118);
    ctx.fillStyle = '#22c55e';
    ctx.textAlign = 'right';
    ctx.fillText(`LIFE: ${c.wear}`, c.x + qw - 12, c.y + 118);
    ctx.textAlign = 'left';
  });
}

// ---------------------------------------------------------------------------
// 9. Live Timing Tower (Pillar TVs)
// ---------------------------------------------------------------------------
export function drawTimingTowerScreen(ctx, w, h, { teamName = 'Red Bull Racing' } = {}) {
  ctx.fillStyle = '#05070c';
  ctx.fillRect(0, 0, w, h);

  // Top F1 Logo & Session Banner
  ctx.fillStyle = '#e10600';
  ctx.fillRect(0, 0, w, 38);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 16px "Helvetica Neue", Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('F1 LIVE TIMING · QUALIFYING Q3', w / 2, 19);

  // Timing rows
  const drivers = [
    { pos: 1, name: 'VER', time: '1:04.112', gap: 'LEADER', tire: 'S', col: '#4781D7' },
    { pos: 2, name: 'NOR', time: '1:04.184', gap: '+0.072', tire: 'S', col: '#F47600' },
    { pos: 3, name: 'LEC', time: '1:04.225', gap: '+0.113', tire: 'S', col: '#ED1131' },
    { pos: 4, name: 'HAM', time: '1:04.301', gap: '+0.189', tire: 'S', col: '#ED1131' },
    { pos: 5, name: 'PIA', time: '1:04.348', gap: '+0.236', tire: 'S', col: '#F47600' },
    { pos: 6, name: 'RUS', time: '1:04.412', gap: '+0.300', tire: 'S', col: '#00D7B6' },
    { pos: 7, name: 'ANT', time: '1:04.550', gap: '+0.438', tire: 'S', col: '#00D7B6' },
    { pos: 8, name: 'SAI', time: '1:04.689', gap: '+0.577', tire: 'M', col: '#1868DB' },
    { pos: 9, name: 'ALO', time: '1:04.720', gap: '+0.608', tire: 'S', col: '#229971' },
    { pos: 10, name: 'ALB', time: '1:04.890', gap: '+0.778', tire: 'M', col: '#1868DB' },
  ];

  const rowH = (h - 46) / drivers.length;
  drivers.forEach((d, i) => {
    const y = 44 + i * rowH;
    ctx.fillStyle = i % 2 === 0 ? '#0b0f19' : '#080b12';
    ctx.fillRect(0, y, w, rowH - 2);

    ctx.fillStyle = d.col;
    ctx.fillRect(0, y, 6, rowH - 2);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`${d.pos}`, 14, y + rowH / 2);

    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 15px sans-serif';
    ctx.fillText(d.name, 44, y + rowH / 2);

    // Tyre compound circle badge (Soft = red, Medium = yellow)
    ctx.fillStyle = d.tire === 'S' ? '#ef4444' : '#eab308';
    ctx.beginPath();
    ctx.arc(110, y + rowH / 2, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(d.tire, 110, y + rowH / 2 + 1);

    ctx.fillStyle = i === 0 ? '#a855f7' : '#22c55e';
    ctx.font = 'bold 13px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(d.time, w - 85, y + rowH / 2);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px monospace';
    ctx.fillText(d.gap, w - 12, y + rowH / 2);
  });
}

// ---------------------------------------------------------------------------
// 10. Workstation Diagnostic Laptop Screen
// ---------------------------------------------------------------------------
export function drawLaptopScreen(ctx, w, h, { teamName = 'Red Bull Racing' } = {}) {
  ctx.fillStyle = '#020509';
  ctx.fillRect(0, 0, w, h);

  // Terminal window top bar
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, w, 28);
  ['#ef4444', '#eab308', '#22c55e'].forEach((c, i) => {
    ctx.fillStyle = c;
    ctx.beginPath(); ctx.arc(14 + i * 14, 14, 4, 0, Math.PI * 2); ctx.fill();
  });

  ctx.fillStyle = '#94a3b8';
  ctx.font = '10px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('root@sredesigns-pit-node-01: ~/telemetry/diagnostics', w / 2, 14);

  // Content
  ctx.textAlign = 'left';
  ctx.fillStyle = '#22c55e';
  ctx.font = '12px monospace';
  ctx.fillText('[OK] 2026 F1 Telemetry CAN-bus synchronised (1000 Hz)', 16, 50);
  ctx.fillText('[OK] MGU-K Hybrid Controller online: 350 kW deployed', 16, 72);
  ctx.fillText('[OK] Active Aero Actuators calibrated: X-Mode / Z-Mode', 16, 94);

  ctx.fillStyle = '#38bdf8';
  ctx.fillText('> SREdesigns Engineering System: https://sredesigns.com', 16, 126);
  ctx.fillText('> Creator: Samuel R Erwin III', 16, 148);

  ctx.fillStyle = '#e2e8f0';
  ctx.fillText('> Type "status" or click screen for full engineering hub...', 16, 180);
}

// Helper: word wrap for canvas text
function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split(' ');
  let line = '';
  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + ' ';
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && n > 0) {
      ctx.fillText(line, x, y);
      line = words[n] + ' ';
      y += lineHeight;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line, x, y);
}

// Factory to create all garage screen textures at once
export function createGarageScreenTextures(teamInfo = {}) {
  return {
    steeringWheel: createScreenTex(1024, 512, (ctx, w, h) => drawSteeringWheelScreen(ctx, w, h, teamInfo)),
    standings: createScreenTex(1024, 512, (ctx, w, h) => drawStandingsScreen(ctx, w, h, teamInfo)),
    weatherRadar: createScreenTex(1024, 512, (ctx, w, h) => drawWeatherRadarScreen(ctx, w, h, window.weather?.W || window.weather?.current || {})),
    sredesigns: createScreenTex(1024, 512, (ctx, w, h) => drawSREdesignsScreen(ctx, w, h, teamInfo)),
    acknowledgements: createScreenTex(1024, 512, (ctx, w, h) => drawAcknowledgementsScreen(ctx, w, h, teamInfo)),
    telemetry: createScreenTex(1024, 512, (ctx, w, h) => drawTelemetryScreen(ctx, w, h)),
    circuitGps: createScreenTex(1024, 512, (ctx, w, h) => drawCircuitGpsScreen(ctx, w, h)),
    tyreThermal: createScreenTex(1024, 512, (ctx, w, h) => drawTyreThermalScreen(ctx, w, h)),
    timingTower: createScreenTex(512, 1024, (ctx, w, h) => drawTimingTowerScreen(ctx, w, h, teamInfo)),
    laptop: createScreenTex(512, 256, (ctx, w, h) => drawLaptopScreen(ctx, w, h, teamInfo)),
  };
}
