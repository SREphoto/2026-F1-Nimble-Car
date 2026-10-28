/**
 * garage_inspect.js — Garage Inspect Mode with Interactive Screens, Tools & Pit Perch
 * SREdesigns - Samuel R Erwin III
 *
 * Orbit (drag) and walk (W A S D or arrows), inspect car parts, open tool chest drawers,
 * inspect hanging wheel guns, visit the Pit Wall Stand (Pit Perch) where the Team Principal sits,
 * and interact with the high-fidelity garage screens:
 *  - PCU-8D Steering Wheel Tool & Button Guide
 *  - 2026 Racing Stats, Standings & Calendar Schedule
 *  - Live Doppler Weather Radar & Environmental Settings
 *  - SREdesigns.com Official Design Showcase
 *  - Project Acknowledgements, Regulations & Technical Credits
 */
import * as THREE from 'three';
import { GARAGE_LAYOUT, GARAGE_PARTS, PART_ORDER, REGULATIONS } from './garage_data.js';

const CSS = `
#garage-bar{position:absolute;left:50%;bottom:14px;transform:translateX(-50%);display:none;gap:6px;align-items:center;background:rgba(8,12,20,.92);border:1px solid #2a3545;border-radius:8px;padding:6px 10px;z-index:30;font:12px system-ui,sans-serif;color:#cfd8e3;box-shadow:0 6px 24px rgba(0,0,0,.6);max-width:96vw;overflow-x:auto}
#garage-bar.on{display:flex}
#garage-bar button{background:#141b26;color:#cfd8e3;border:1px solid #2a3545;border-radius:5px;padding:5px 10px;font-size:12px;font-weight:500;cursor:pointer;white-space:nowrap;transition:all .15s ease}
#garage-bar button:hover{background:#1f2937;color:#fff;border-color:#38bdf8}
#garage-bar button.active{background:#00d4e8;color:#04121a;border-color:#00d4e8;font-weight:600}
#garage-bar button.perch-btn{background:#1e3a8a;border-color:#3b82f6;color:#93c5fd}
#garage-bar button.perch-btn:hover{background:#2563eb;color:#fff}
#garage-bar button.chest-btn{background:#1e293b;border-color:#f59e0b;color:#fde68a}
#garage-bar button.chest-btn:hover{background:#d97706;color:#fff}
#garage-bar button.views-btn{background:#0284c7;color:#fff;border-color:#38bdf8;font-weight:600}
#garage-bar button.views-btn:hover{background:#0369a1}
#garage-bar button.menu-btn{background:#4f46e5;color:#fff;border-color:#818cf8;font-weight:600}
#garage-bar button.menu-btn:hover{background:#4338ca}
#garage-views-popover{position:absolute;bottom:64px;left:50%;transform:translateX(-50%);background:rgba(8,12,20,.96);border:1px solid #38bdf8;border-radius:10px;padding:12px 14px;z-index:32;display:none;flex-direction:column;gap:8px;box-shadow:0 12px 40px rgba(0,0,0,.8);min-width:320px;max-width:92vw}
#garage-views-popover.on{display:flex}
#garage-views-popover .popover-section-title{font-size:11px;font-weight:bold;color:#38bdf8;letter-spacing:.05em}
#garage-views-popover .popover-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(90px,1fr));gap:6px}
#garage-views-popover .view-pill{background:#131c2e;border:1px solid #2a3a52;color:#e2e8f0;padding:6px 8px;border-radius:6px;font-size:11px;font-weight:500;cursor:pointer;text-align:center;transition:all .15s}
#garage-views-popover .view-pill:hover{background:#0284c7;border-color:#38bdf8;color:#fff}
#garage-bar button.exit{background:#c8161d;border-color:#c8161d;color:#fff}
#garage-bar .hint{opacity:.75;margin-left:6px;white-space:nowrap;font-size:11px}
#garage-card{position:absolute;display:none;max-width:280px;background:rgba(8,12,20,.96);border:1px solid #00d4e8;border-radius:8px;padding:12px 14px;color:#e6edf5;font:12px/1.4 system-ui,sans-serif;z-index:31;pointer-events:auto;box-shadow:0 8px 30px rgba(0,0,0,.6)}
#garage-card h3{margin:0 0 6px;font-size:14px;color:#7fe7ff}
#garage-card ul{margin:6px 0 0;padding-left:16px}
#garage-card .x{position:absolute;right:8px;top:6px;background:none;border:0;color:#9fb0c3;cursor:pointer;font-size:16px}

/* Generic Overlay Modal styling */
.garage-modal{position:fixed;inset:0;display:none;align-items:center;justify-content:center;background:rgba(4,7,14,.75);backdrop-filter:blur(6px);z-index:1000;padding:16px}
.garage-modal.on{display:flex}
.garage-modal .modal-box{background:#0a0f1d;border:1px solid #1e293b;border-radius:10px;color:#e2e8f0;max-width:860px;width:100%;max-height:90vh;overflow-y:auto;padding:24px 28px;font:14px/1.5 system-ui,sans-serif;box-shadow:0 12px 48px rgba(0,0,0,.8);position:relative}
.garage-modal .modal-head{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px;border-bottom:1px solid #1e293b;padding-bottom:12px}
.garage-modal .modal-head h2{margin:0;font-size:20px;color:#f8fafc;letter-spacing:.02em}
.garage-modal .modal-head p{margin:4px 0 0;font-size:12px;color:#94a3b8}
.garage-modal .x-btn{background:none;border:0;font-size:22px;cursor:pointer;color:#94a3b8;padding:2px 8px;line-height:1}
.garage-modal .x-btn:hover{color:#fff}

/* Regulations Modal */
#regs-overlay .sheet{background:#f7f7f2;color:#15181d;border-radius:6px;min-width:420px;max-width:92vw;padding:22px 26px;font:15px/1.5 system-ui,sans-serif;box-shadow:0 10px 40px rgba(0,0,0,.6);position:relative}
#regs-overlay h2{margin:0 0 4px;font-size:22px}
#regs-overlay p{margin:0 0 12px;color:#4a5260}
#regs-overlay table{border-collapse:collapse;width:100%}
#regs-overlay td{padding:6px 8px;border-bottom:1px solid #ddd}
#regs-overlay td:last-child{text-align:right;color:#2a3442;font-weight:600}
#regs-overlay .x{position:absolute;right:10px;top:8px;background:none;border:0;font-size:18px;cursor:pointer;color:#555}

/* Steering Wheel Modal */
#steering-overlay .tabs{display:flex;gap:6px;margin:12px 0 16px}
#steering-overlay .tab-btn{background:#111827;border:1px solid #374151;color:#9ca3af;padding:6px 14px;border-radius:6px;cursor:pointer;font-weight:600;font-size:12px}
#steering-overlay .tab-btn.active{background:#0284c7;color:#fff;border-color:#38bdf8}
#steering-overlay .tab-pane{display:none;background:#030712;border:1px solid #1f2937;border-radius:8px;padding:14px;margin-bottom:16px}
#steering-overlay .tab-pane.active{display:block}
#steering-overlay .btn-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:10px;margin-top:12px}
#steering-overlay .btn-card{background:#0d1525;border:1px solid #1e293b;border-radius:6px;padding:10px 12px}
#steering-overlay .btn-card b{color:#38bdf8;font-family:monospace;font-size:13px}
#steering-overlay .btn-card p{margin:4px 0 0;font-size:11px;color:#94a3b8}

/* Weather Modal */
#weather-overlay .wx-grid{display:grid;grid-template-columns:1fr 1fr;gap:18px}
#weather-overlay .wx-presets{display:flex;gap:8px;margin:10px 0 16px;flex-wrap:wrap}
#weather-overlay .wx-btn{background:#1e293b;border:1px solid #334155;color:#e2e8f0;padding:6px 12px;border-radius:6px;cursor:pointer;font-size:12px;font-weight:500}
#weather-overlay .wx-btn:hover{background:#0284c7;color:#fff;border-color:#38bdf8}
#weather-overlay .wx-slider{display:grid;grid-template-columns:90px 1fr 50px;align-items:center;gap:10px;margin:8px 0;font-size:12px}
#weather-overlay .wx-slider b{font-family:monospace;color:#38bdf8;text-align:right}

/* Standings Modal */
#standings-overlay .standings-grid{display:grid;grid-template-columns:1fr 1fr;gap:18px}
#standings-overlay table{width:100%;border-collapse:collapse;font-size:12px}
#standings-overlay th{text-align:left;color:#64748b;padding:6px 8px;border-bottom:1px solid #1e293b}
#standings-overlay td{padding:6px 8px;border-bottom:1px solid rgba(255,255,255,.05)}
#standings-overlay tr:hover td{background:rgba(255,255,255,.03)}

/* SREdesigns Modal */
#sredesigns-overlay .sre-hero{text-align:center;padding:18px 0;border-bottom:1px solid #1e293b}
#sredesigns-overlay .sre-title{font-size:28px;font-weight:bold;color:#00d4e8;margin:0}
#sredesigns-overlay .sre-sub{color:#94a3b8;font-size:13px;margin:4px 0 14px}
#sredesigns-overlay .sre-link-btn{display:inline-block;background:#00d4e8;color:#04121a;font-weight:bold;text-decoration:none;padding:10px 24px;border-radius:6px;font-size:14px;box-shadow:0 4px 16px rgba(0,212,232,.35)}
#sredesigns-overlay .sre-link-btn:hover{background:#38bdf8}
#sredesigns-overlay .sre-cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px;margin-top:20px}
#sredesigns-overlay .sre-card{background:#0f172a;border:1px solid #1e293b;border-radius:8px;padding:14px}
#sredesigns-overlay .sre-card h4{margin:0 0 6px;color:#38bdf8;font-size:14px}
#sredesigns-overlay .sre-card p{margin:0;font-size:12px;color:#94a3b8;line-height:1.4}

body.garage-mode #sess-panel{display:none!important}
`;

export function initGarageInspect({ scene, camera, controls, renderer, carModel, trackMode, legacyEnv, getTeamId = () => 'red-bull' }) {
  const $ = (id) => document.getElementById(id);
  function changed() {
    renderer.shadowMap.needsUpdate = true;
    garage?.userData.refreshMirror?.();
  }
  let garage = null, builder = null;
  const QUALITY = /[?&]garage=low\b/.test(location.search) ? 'low' : 'high';
  const L = GARAGE_LAYOUT;
  const GARAGE_VIEWS = {
    CAM_ISO: { pos: [-42, 22, 34], target: [18, 4, 0] },
    CAM_FRONT: { pos: [-65, 6, 0], target: [12, 3, 0] },
    CAM_SIDE: { pos: [18, 9, 46], target: [18, 4, 0] },
    CAM_TOP: { pos: [22, 50, 0.5], target: [22, 0, 0] },
    CAM_REAR: { pos: [92, 10, 0], target: [32, 4.5, 0] },
    CAM_STEERING: { pos: [12.0, 5.6, 0], target: [9.0, 4.2, 0] },
    CAM_COCKPIT: { pos: [13.2, 6.2, 0], target: [-8, 3.8, 0] },
    CAM_WHEEL: { pos: [0, 3.5, 14], target: [0, 3.5, 8] },
    CAM_EXPLODED: { pos: [-52, 32, 36], target: [16, 6, 0] },
    STATE_ACTIVE: { pos: [-42, 20, 32], target: [12, 3.2, 0] },
    CAM_OVERVIEW: { pos: [-72, 24, 34], target: [24, 5, 0] },
    CAM_DESK: { pos: [126, 18, 14], target: [154, 11, 0] },
    CAM_PERCH: { pos: [-162, 11.5, 0], target: [-174, 9.8, -1.0] },
    CAM_TOOLCHEST: { pos: [28, 14, 22], target: [28, 7.5, 34] },
  };
  const st = {
    active: false,
    wasCircuit: false,
    saved: null,
    wheels: true,
    body: true,
    sel: null,
    selCentre: new THREE.Vector3(),
    keys: new Set(),
    tween: null,
    viewingPitPerch: false,
  };

  // ---------------------------------------------------------------- Inject Styles & DOM
  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.appendChild(style);

  const host = renderer.domElement.parentElement || document.body;
  if (getComputedStyle(host).position === 'static') host.style.position = 'relative';

  // Bottom Toolbar
  const bar = document.createElement('div');
  bar.id = 'garage-bar';
  bar.innerHTML = `
    <button type="button" id="garage-views-btn" class="views-btn" title="Camera Perspectives & Viewpoints">🎥 Views ▾</button>
    <button type="button" id="garage-wheels" class="active" title="Toggle wheels on stands">Wheels on</button>
    <button type="button" id="garage-body" class="active" title="Toggle active bodywork">Bodywork on</button>
    <button type="button" id="garage-xray" title="Toggle translucent bodywork X-ray to inspect internal engine, gearbox, and battery">X-Ray</button>
    <button type="button" id="garage-wheel-tool" title="PCU-8D Steering Wheel Tool">Steering Wheel</button>
    <button type="button" id="garage-standings" title="2026 Racing Stats & Standings">Standings & Stats</button>
    <button type="button" id="garage-weather" title="Live Doppler Weather Radar & Environmental Settings">Weather Radar</button>
    <button type="button" id="garage-perch" class="perch-btn" title="Visit the Team Manager Pit Wall Stand">Pit Perch</button>
    <button type="button" id="garage-toolchest" class="chest-btn" title="Inspect Tool Chest & Drawers">Tool Chest</button>
    <button type="button" id="garage-sredesigns" title="SREdesigns.com Design Showcase">SREdesigns</button>
    <button type="button" id="garage-regs" title="Technical Check Sheet & Regulations">Regulations</button>
    <button type="button" id="garage-credits" title="Project Credits & Acknowledgements">Credits</button>
    <button type="button" id="garage-menu-btn" class="menu-btn" title="Open Full Pause & Navigation Menu (Esc / P)">☰ Menu</button>
    <button type="button" id="garage-exit" class="exit" title="Leave the garage">Exit Garage</button>
    <span class="hint">Click screens or tools · W A S D to walk · Drag to look</span>`;
  host.appendChild(bar);

  // In-Garage Camera Views Popover
  const viewsPop = document.createElement('div');
  viewsPop.id = 'garage-views-popover';
  viewsPop.innerHTML = `
    <div class="popover-section-title">CAMERA PERSPECTIVES</div>
    <div class="popover-grid">
      <button type="button" class="view-pill" data-cam="CAM_ISO">📐 ISO 3/4</button>
      <button type="button" class="view-pill" data-cam="CAM_FRONT">🏎️ Front</button>
      <button type="button" class="view-pill" data-cam="CAM_SIDE">↔️ Side</button>
      <button type="button" class="view-pill" data-cam="CAM_TOP">🔝 Top</button>
      <button type="button" class="view-pill" data-cam="CAM_REAR">🏁 Rear</button>
      <button type="button" class="view-pill" data-cam="CAM_STEERING">🕹️ Steering</button>
      <button type="button" class="view-pill" data-cam="CAM_COCKPIT">🎮 Cockpit</button>
      <button type="button" class="view-pill" data-cam="CAM_WHEEL">🛞 Wheel</button>
      <button type="button" class="view-pill" data-cam="CAM_EXPLODED">💥 Exploded</button>
      <button type="button" class="view-pill" data-cam="STATE_ACTIVE">⚡ Active</button>
    </div>
    <div class="popover-section-title" style="margin-top:6px">GARAGE HOTSPOTS</div>
    <div class="popover-grid">
      <button type="button" class="view-pill" id="pop-view-garage">🏢 Overview</button>
      <button type="button" class="view-pill" id="pop-view-desk">💼 Engineers' Desk</button>
      <button type="button" class="view-pill" id="pop-view-perch">🪑 Pit Wall Stand</button>
      <button type="button" class="view-pill" id="pop-view-toolchest">🧰 Tool Chest</button>
      <button type="button" class="view-pill" id="pop-view-setup">🔬 Setup Table</button>
      <button type="button" class="view-pill" id="pop-view-pu">⚡ PU Station</button>
    </div>
  `;
  host.appendChild(viewsPop);

  // Floating Info Card
  const card = document.createElement('div');
  card.id = 'garage-card';
  host.appendChild(card);

  // 1. Regulations Overlay
  const regOv = document.createElement('div');
  regOv.id = 'regs-overlay';
  regOv.className = 'garage-modal';
  regOv.innerHTML = `
    <div class="sheet" role="dialog" aria-modal="true" aria-label="${REGULATIONS.title}">
      <button type="button" class="x" aria-label="Close">✕</button>
      <h2>${REGULATIONS.title}</h2>
      <p>Technical check sheet from the engineers' desk</p>
      <table>${REGULATIONS.rows.map(([k, v]) => `<tr><td>${k}</td><td>${v}</td></tr>`).join('')}</table>
    </div>`;
  document.body.appendChild(regOv);

  // 2. Steering Wheel Tool Overlay
  const wheelOv = document.createElement('div');
  wheelOv.id = 'steering-overlay';
  wheelOv.className = 'garage-modal';
  wheelOv.innerHTML = `
    <div class="modal-box">
      <div class="modal-head">
        <div>
          <h2>PCU-8D STEERING WHEEL GUIDE & BUTTON TOOL</h2>
          <p>Official SREdesigns 2026 Active Cockpit Architecture · McLaren Applied PCU-8D OLED Display</p>
        </div>
        <button type="button" class="x-btn">✕</button>
      </div>
      <div class="tabs">
        <button type="button" class="tab-btn active" data-tab="tab-race">RACE PAGE</button>
        <button type="button" class="tab-btn" data-tab="tab-tyres">TYRES PAGE</button>
        <button type="button" class="tab-btn" data-tab="tab-ers">ERS & HYBRID</button>
        <button type="button" class="tab-btn" data-tab="tab-setup">SETUP & DIFF</button>
      </div>
      <div id="tab-race" class="tab-pane active">
        <h4 style="margin:0 0 6px;color:#38bdf8">RACE MODE TELEMETRY DISPLAY</h4>
        <p style="margin:0 0 10px;color:#94a3b8;font-size:12px">Primary driving screen during green flag running: large center gear indicator (1-8), live digital speed (km/h), 15 progressive RPM shift LEDs, lap delta time against reference (+/- 0.001s), brake bias %, and active aero mode (X-Mode straight / Z-Mode cornering).</p>
        <div style="background:#020617;border:1px solid #1e293b;border-radius:6px;padding:12px;font-family:monospace;font-size:13px;color:#e2e8f0;display:flex;justify-content:space-around;text-align:center">
          <div><span style="color:#64748b">GEAR</span><br><b style="font-size:24px;color:#fff">7</b></div>
          <div><span style="color:#64748b">SPEED</span><br><b style="font-size:24px;color:#00d4e8">314</b> <small>km/h</small></div>
          <div><span style="color:#64748b">DELTA</span><br><b style="font-size:24px;color:#22c55e">-0.284</b></div>
          <div><span style="color:#64748b">BBAL</span><br><b style="font-size:24px;color:#f59e0b">56.0%</b></div>
          <div><span style="color:#64748b">AERO</span><br><b style="font-size:24px;color:#38bdf8">X-MODE</b></div>
        </div>
      </div>
      <div id="tab-tyres" class="tab-pane">
        <h4 style="margin:0 0 6px;color:#38bdf8">TYRES & BRAKES THERMAL MONITOR</h4>
        <p style="margin:0 0 10px;color:#94a3b8;font-size:12px">Displays 4-corner tire carcass temperatures, inner/middle/outer surface thermal zones, real-time tire pressure (PSI), and carbon-carbon brake disc temperatures (nominal 350°C - 1,000°C).</p>
      </div>
      <div id="tab-ers" class="tab-pane">
        <h4 style="margin:0 0 6px;color:#38bdf8">350 kW MGU-K HYBRID POWERTRAIN</h4>
        <p style="margin:0 0 10px;color:#94a3b8;font-size:12px">State-of-Charge (SoC %) of the 800V energy store, MGU-K instantaneous deploy torque (Nm), harvest regen rate, and lap energy budget curve (4.0 MJ/lap maximum).</p>
      </div>
      <div id="tab-setup" class="tab-pane">
        <h4 style="margin:0 0 6px;color:#38bdf8">CHASSIS SETUP & KINEMATICS</h4>
        <p style="margin:0 0 10px;color:#94a3b8;font-size:12px">Differential entry/mid/exit locking rates, brake migration (BMIG), engine braking torque offset (EB), steering rack angle, and clutch bite-point calibration.</p>
      </div>
      <h4 style="margin:16px 0 6px;color:#f8fafc">STEERING WHEEL BUTTONS & ROTARY CONTROLS</h4>
      <div class="btn-grid">
        <div class="btn-card"><b>AERO / DRS</b><p>Toggles active aerodynamic state: X-Mode (low drag on straights) vs Z-Mode (high downforce cornering).</p></div>
        <div class="btn-card"><b>RADIO</b><p>Push-to-talk encrypted pit-to-car radio comms with race engineer.</p></div>
        <div class="btn-card"><b>PL (PIT LIMITER)</b><p>Engages 80.0 km/h speed governor for safe pit lane transit.</p></div>
        <div class="btn-card"><b>OT (OVERTAKE)</b><p>Maximum 350 kW MGU-K battery dump for sprint defense or overtaking.</p></div>
        <div class="btn-card"><b>N (NEUTRAL)</b><p>Disengages transmission into neutral; hold for 0.5s to prevent accidental shift.</p></div>
        <div class="btn-card"><b>BB+ / BB-</b><p>Increments or decrements front-to-rear brake bias by 0.5% steps.</p></div>
        <div class="btn-card"><b>STRAT ROTARY</b><p>Engine & battery deployment strategies: Mode 1 (Max Attack) to 12 (Conservation).</p></div>
        <div class="btn-card"><b>DIFF MID ROTARY</b><p>Adjusts limited-slip differential ramp angle and preload at corner apex.</p></div>
        <div class="btn-card"><b>THUMBWHEELS</b><p>BBAL (Brake balance), BMIG (Migration), EB (Engine braking), HARV (ERS recovery).</p></div>
      </div>
    </div>`;
  document.body.appendChild(wheelOv);

  // Tab switching inside Steering Wheel overlay
  wheelOv.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      wheelOv.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      wheelOv.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      const targetPane = wheelOv.querySelector(`#${btn.dataset.tab}`);
      if (targetPane) targetPane.classList.add('active');
    });
  });

  // 3. Standings & Schedule Overlay
  const standingsOv = document.createElement('div');
  standingsOv.id = 'standings-overlay';
  standingsOv.className = 'garage-modal';
  standingsOv.innerHTML = `
    <div class="modal-box">
      <div class="modal-head">
        <div>
          <h2>2026 WORLD CHAMPIONSHIP STANDINGS & SCHEDULE</h2>
          <p>FIA Formula 1 World Championship · Current Season Telemetry Hub</p>
        </div>
        <button type="button" class="x-btn">✕</button>
      </div>
      <div class="standings-grid">
        <div>
          <h4 style="margin:0 0 8px;color:#38bdf8">DRIVER STANDINGS (TOP 10)</h4>
          <table>
            <thead><tr><th>POS</th><th>DRIVER</th><th>TEAM</th><th>PTS</th></tr></thead>
            <tbody>
              <tr><td>1</td><td><b>Max Verstappen</b></td><td>Red Bull Racing</td><td><b>178</b></td></tr>
              <tr><td>2</td><td><b>Lando Norris</b></td><td>McLaren</td><td><b>164</b></td></tr>
              <tr><td>3</td><td><b>Charles Leclerc</b></td><td>Ferrari</td><td><b>142</b></td></tr>
              <tr><td>4</td><td><b>Lewis Hamilton</b></td><td>Ferrari</td><td><b>129</b></td></tr>
              <tr><td>5</td><td><b>Oscar Piastri</b></td><td>McLaren</td><td><b>118</b></td></tr>
              <tr><td>6</td><td><b>George Russell</b></td><td>Mercedes</td><td><b>96</b></td></tr>
              <tr><td>7</td><td><b>Kimi Antonelli</b></td><td>Mercedes</td><td><b>68</b></td></tr>
              <tr><td>8</td><td><b>Carlos Sainz</b></td><td>Williams</td><td><b>44</b></td></tr>
              <tr><td>9</td><td><b>Fernando Alonso</b></td><td>Aston Martin</td><td><b>38</b></td></tr>
              <tr><td>10</td><td><b>Alex Albon</b></td><td>Williams</td><td><b>26</b></td></tr>
            </tbody>
          </table>
        </div>
        <div>
          <h4 style="margin:0 0 8px;color:#38bdf8">CONSTRUCTOR STANDINGS</h4>
          <table>
            <thead><tr><th>POS</th><th>TEAM</th><th>POINTS</th></tr></thead>
            <tbody>
              <tr><td>1</td><td>McLaren Formula 1 Team</td><td><b>282</b></td></tr>
              <tr><td>2</td><td>Scuderia Ferrari</td><td><b>271</b></td></tr>
              <tr><td>3</td><td>Red Bull Racing</td><td><b>212</b></td></tr>
              <tr><td>4</td><td>Mercedes-AMG F1 Team</td><td><b>164</b></td></tr>
              <tr><td>5</td><td>Williams Racing</td><td><b>70</b></td></tr>
              <tr><td>6</td><td>Aston Martin Aramco</td><td><b>48</b></td></tr>
              <tr><td>7</td><td>Racing Bulls</td><td><b>32</b></td></tr>
              <tr><td>8</td><td>Audi F1 Team</td><td><b>18</b></td></tr>
            </tbody>
          </table>
          <h4 style="margin:16px 0 6px;color:#f8fafc">CALENDAR HIGHLIGHTS</h4>
          <p style="font-size:12px;color:#94a3b8;margin:0">Round 08: Austrian Grand Prix (Red Bull Ring) · <b>ACTIVE</b><br>Round 09: British Grand Prix (Silverstone) · July 10-12<br>Round 10: Belgian Grand Prix (Spa-Francorchamps) · July 24-26</p>
        </div>
      </div>
    </div>`;
  document.body.appendChild(standingsOv);

  // 4. Weather Radar & Settings Overlay
  const weatherOv = document.createElement('div');
  weatherOv.id = 'weather-overlay';
  weatherOv.className = 'garage-modal';
  weatherOv.innerHTML = `
    <div class="modal-box">
      <div class="modal-head">
        <div>
          <h2>METEOROLOGICAL RADAR & WEATHER CONTROLS</h2>
          <p>Live Doppler Precipitation Radar · Direct Trackside Environmental Simulation</p>
        </div>
        <button type="button" class="x-btn">✕</button>
      </div>
      <div class="wx-presets">
        <button type="button" class="wx-btn" data-preset="clear">☀️ Clear Sky</button>
        <button type="button" class="wx-btn" data-preset="overcast">⛅ Overcast</button>
        <button type="button" class="wx-btn" data-preset="drizzle">🌦️ Drizzle</button>
        <button type="button" class="wx-btn" data-preset="rain">🌧️ Heavy Rain</button>
        <button type="button" class="wx-btn" data-preset="storm">⛈️ Severe Storm</button>
      </div>
      <div class="wx-grid">
        <div>
          <h4 style="margin:0 0 10px;color:#38bdf8">ENVIRONMENTAL SLIDERS</h4>
          <div class="wx-slider"><span>Cloud Cover</span><input type="range" id="modal-wx-cloud" min="0" max="1" step="0.05"><b id="modal-wx-cloud-v">25%</b></div>
          <div class="wx-slider"><span>Rain Intensity</span><input type="range" id="modal-wx-rain" min="0" max="1" step="0.05"><b id="modal-wx-rain-v">0%</b></div>
          <div class="wx-slider"><span>Wind km/h</span><input type="range" id="modal-wx-wind" min="0" max="60" step="1"><b id="modal-wx-wind-v">14</b></div>
          <div class="wx-slider"><span>Wind Dir °</span><input type="range" id="modal-wx-dir" min="0" max="359" step="5"><b id="modal-wx-dir-v">220°</b></div>
          <div class="wx-slider"><span>Track Water</span><input type="range" id="modal-wx-water" min="0" max="1" step="0.05"><b id="modal-wx-water-v">0%</b></div>
        </div>
        <div>
          <h4 style="margin:0 0 10px;color:#38bdf8">RADAR TELEMETRY</h4>
          <div style="background:#030712;border:1px solid #1f2937;border-radius:6px;padding:12px;font-size:12px;color:#94a3b8">
            <p style="margin:0 0 6px">Air Temperature: <b style="color:#fff">24.2 °C</b></p>
            <p style="margin:0 0 6px">Track Temperature: <b style="color:#fbbf24">38.6 °C</b></p>
            <p style="margin:0 0 6px">Barometric Pressure: <b style="color:#fff">1014.2 hPa</b></p>
            <p style="margin:0 0 6px">Precipitation Radar: <b id="modal-wx-radar-status" style="color:#22c55e">No rain cells within 10 km</b></p>
            <p style="margin:0">Optimal Tyre: <b id="modal-wx-tyre-opt" style="color:#00d4e8">SLICKS (P ZERO)</b></p>
          </div>
        </div>
      </div>
    </div>`;
  document.body.appendChild(weatherOv);

  // Weather Preset & Slider Event Listeners
  weatherOv.querySelectorAll('.wx-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const preset = btn.dataset.preset;
      if (window.weather?.setPreset) {
        window.weather.setPreset(preset);
        syncWeatherModalSliders();
        changed();
      }
    });
  });

  function syncWeatherModalSliders() {
    const cur = window.weather?.W || window.weather?.current;
    if (!cur) return;
    const cloudEl = $('modal-wx-cloud'); if (cloudEl) { cloudEl.value = cur.cloud ?? 0; $('modal-wx-cloud-v').textContent = Math.round((cur.cloud ?? 0) * 100) + '%'; }
    const rainEl = $('modal-wx-rain'); if (rainEl) { rainEl.value = cur.rain ?? 0; $('modal-wx-rain-v').textContent = Math.round((cur.rain ?? 0) * 100) + '%'; }
    const windEl = $('modal-wx-wind'); if (windEl) { windEl.value = cur.windKmh ?? 14; $('modal-wx-wind-v').textContent = Math.round(cur.windKmh ?? 14); }
    const dirEl = $('modal-wx-dir'); if (dirEl) { dirEl.value = cur.windFrom ?? 0; $('modal-wx-dir-v').textContent = Math.round(cur.windFrom ?? 0) + '°'; }
    const waterEl = $('modal-wx-water'); if (waterEl) { waterEl.value = cur.water ?? 0; $('modal-wx-water-v').textContent = Math.round((cur.water ?? 0) * 100) + '%'; }
  }

  $('modal-wx-cloud')?.addEventListener('input', e => { window.weather?.set?.({ cloud: +e.target.value }); $('modal-wx-cloud-v').textContent = Math.round(+e.target.value * 100) + '%'; changed(); });
  $('modal-wx-rain')?.addEventListener('input', e => { window.weather?.set?.({ rain: +e.target.value }); $('modal-wx-rain-v').textContent = Math.round(+e.target.value * 100) + '%'; changed(); });
  $('modal-wx-wind')?.addEventListener('input', e => { window.weather?.set?.({ windKmh: +e.target.value }); $('modal-wx-wind-v').textContent = Math.round(+e.target.value); changed(); });
  $('modal-wx-dir')?.addEventListener('input', e => { window.weather?.set?.({ windFrom: +e.target.value }); $('modal-wx-dir-v').textContent = Math.round(+e.target.value) + '°'; changed(); });
  $('modal-wx-water')?.addEventListener('input', e => { if (window.weather) window.weather.water = +e.target.value; $('modal-wx-water-v').textContent = Math.round(+e.target.value * 100) + '%'; changed(); });

  // 5. SREdesigns.com Showcase Overlay
  const sreOv = document.createElement('div');
  sreOv.id = 'sredesigns-overlay';
  sreOv.className = 'garage-modal';
  sreOv.innerHTML = `
    <div class="modal-box">
      <div class="modal-head">
        <div>
          <h2>SREdesigns · DESIGN STUDIO & CAD PORTFOLIO</h2>
          <p>Samuel R Erwin III · Engineering, Aerodynamics & Interactive 3D Systems</p>
        </div>
        <button type="button" class="x-btn">✕</button>
      </div>
      <div class="sre-hero">
        <h1 class="sre-title">SREdesigns.com</h1>
        <p class="sre-sub">Pioneering Automotive Design, Computational Aerodynamics & WebGL Digital Twins</p>
        <a href="https://sredesigns.com" target="_blank" rel="noopener noreferrer" class="sre-link-btn">Launch Official Website ↗</a>
      </div>
      <div class="sre-cards">
        <div class="sre-card">
          <h4>2026 F1 NIMBLE CAR</h4>
          <p>Complete ground-up parametric 3D CAD model adhering to the 2026 FIA technical regulations. Featuring active aerodynamics (X-mode / Z-mode) and 50/50 hybrid power unit architecture.</p>
        </div>
        <div class="sre-card">
          <h4>INTERACTIVE DIGITAL TWIN</h4>
          <p>High-fidelity WebGL simulation engine with real-time kinematic suspension, moving valvetrain and transmission gears, tyre wear and weather models, and team garage inspection.</p>
        </div>
        <div class="sre-card">
          <h4>ABOUT THE CREATOR</h4>
          <p>Conceived, engineered, and coded by Samuel R Erwin III. Dedicated to the fusion of precision motorsport engineering, computational aesthetics, and cutting-edge web technologies.</p>
        </div>
      </div>
    </div>`;
  document.body.appendChild(sreOv);

  // 6. Acknowledgements & Credits Overlay
  const ackOv = document.createElement('div');
  ackOv.id = 'acknowledgements-overlay';
  ackOv.className = 'garage-modal';
  ackOv.innerHTML = `
    <div class="modal-box">
      <div class="modal-head">
        <div>
          <h2>PROJECT ACKNOWLEDGEMENTS & CREDITS</h2>
          <p>2026 Formula 1 "Nimble Car" · SREdesigns - Samuel R Erwin III</p>
        </div>
        <button type="button" class="x-btn">✕</button>
      </div>
      <div style="font-size:13px;color:#cbd5e1;line-height:1.6">
        <h4 style="margin:0 0 6px;color:#38bdf8">LEAD CREATOR & ARCHITECT</h4>
        <p style="margin:0 0 14px"><b>Samuel R Erwin III</b> (SREdesigns) — Complete project concept, CAD engineering design, parametric Three.js 3D implementation, livery design systems, physics and Web Audio sound engine.</p>
        <h4 style="margin:0 0 6px;color:#38bdf8">REGULATORY & TECHNICAL FRAMEWORK</h4>
        <p style="margin:0 0 14px"><b>Fédération Internationale de l'Automobile (FIA)</b> — 2026 Formula 1 Technical Regulations (Article C5), Active Aerodynamics (Straightline Low-Drag X-Mode & High-Downforce Z-Mode), and Sustainable Drop-In Biofuel standards.</p>
        <h4 style="margin:0 0 6px;color:#38bdf8">3D MODELS & COMMUNITY ATTRIBUTIONS</h4>
        <ul style="margin:0 0 14px;padding-left:18px">
          <li><b>2026 Redbull RB22</b> by Dave (Tyler_Dave) via Sketchfab, licensed under CC BY 4.0.</li>
          <li><b>Helmet Redbull - Max Verstappen</b> by Fabianmml via Sketchfab, licensed under CC BY 4.0.</li>
          <li><b>Racing Helmet (Bell GP3)</b> by nNiCo67 via Sketchfab, licensed under CC BY 4.0.</li>
          <li><b>Three.js WebGL Engine</b> by Ricardo Cabello (Mr.doob) and the Three.js open-source community.</li>
        </ul>
        <h4 style="margin:0 0 6px;color:#38bdf8">OFFICIAL PORTFOLIO</h4>
        <p style="margin:0">Explore more high-performance design projects at <a href="https://sredesigns.com" target="_blank" rel="noopener noreferrer" style="color:#00d4e8;font-weight:bold">https://sredesigns.com</a>.</p>
      </div>
    </div>`;
  document.body.appendChild(ackOv);

  // Modal Open/Close helpers
  const openModal = (modalEl, on = true) => {
    document.querySelectorAll('.garage-modal').forEach(m => m.classList.remove('on'));
    if (modalEl && on) {
      modalEl.classList.add('on');
      if (modalEl === weatherOv) syncWeatherModalSliders();
    }
  };

  const closeAllModals = () => document.querySelectorAll('.garage-modal').forEach(m => m.classList.remove('on'));

  document.querySelectorAll('.garage-modal').forEach(m => {
    m.addEventListener('click', (e) => {
      if (e.target === m || e.target.classList.contains('x-btn') || e.target.classList.contains('x')) {
        closeAllModals();
      }
    });
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeAllModals();
  });

  $('garage-views-btn')?.addEventListener('click', (e) => {
    e.stopPropagation();
    viewsPop.classList.toggle('on');
  });
  $('garage-menu-btn')?.addEventListener('click', () => {
    if (window.openPauseMenu) window.openPauseMenu();
    else if (window.togglePauseMenu) window.togglePauseMenu();
  });
  viewsPop.querySelectorAll('[data-cam]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (window.setCameraView) window.setCameraView(btn.dataset.cam);
      viewsPop.classList.remove('on');
    });
  });
  $('pop-view-garage')?.addEventListener('click', () => {
    if (window.setCameraView) window.setCameraView('CAM_OVERVIEW');
    viewsPop.classList.remove('on');
  });
  $('pop-view-desk')?.addEventListener('click', () => {
    zoomToDesk();
    viewsPop.classList.remove('on');
  });
  $('pop-view-perch')?.addEventListener('click', () => {
    zoomToPitPerch();
    viewsPop.classList.remove('on');
  });
  $('pop-view-toolchest')?.addEventListener('click', () => {
    zoomToToolChest();
    viewsPop.classList.remove('on');
  });
  $('pop-view-setup')?.addEventListener('click', () => {
    zoomToSetupPlatform();
    viewsPop.classList.remove('on');
  });
  $('pop-view-pu')?.addEventListener('click', () => {
    zoomToPowerUnitStation();
    viewsPop.classList.remove('on');
  });
  document.addEventListener('click', (e) => {
    if (viewsPop.classList.contains('on') && !viewsPop.contains(e.target) && e.target !== $('garage-views-btn')) {
      viewsPop.classList.remove('on');
    }
  });

  $('garage-wheels')?.addEventListener('click', () => setWheels(!st.wheels));
  $('garage-body')?.addEventListener('click', () => setBody(!st.body));
  $('garage-xray')?.addEventListener('click', () => setXRay(!st.xray));
  $('garage-regs')?.addEventListener('click', () => openModal(regOv, true));
  $('garage-wheel-tool')?.addEventListener('click', () => openModal(wheelOv, true));
  $('garage-standings')?.addEventListener('click', () => openModal(standingsOv, true));
  $('garage-weather')?.addEventListener('click', () => openModal(weatherOv, true));
  $('garage-sredesigns')?.addEventListener('click', () => openModal(sreOv, true));
  $('garage-credits')?.addEventListener('click', () => openModal(ackOv, true));
  $('garage-perch')?.addEventListener('click', () => zoomToPitPerch());
  $('garage-toolchest')?.addEventListener('click', () => zoomToToolChest());
  $('garage-exit')?.addEventListener('click', () => exitGarageInspect());
  $('btn-garage')?.addEventListener('click', () => (st.active ? exitGarageInspect() : enterGarageInspect()));
  $('btn-regulations')?.addEventListener('click', () => openModal(regOv, true));

  window.addEventListener('f1:team-changed', (e) => {
    garage?.userData.setTeam(e.detail?.teamId);
    changed();
  });

  // ---------------------------------------------------------------- Car helpers
  const subs = () => carModel.children.slice(0, PART_ORDER.length);
  const wheelGroups = () => {
    const out = [];
    carModel.traverse(o => { if (o.name && o.name.startsWith('Wheel_Visual_')) out.push(o); });
    return out;
  };

  function setWheels(on) {
    if (!on && garage && st.wheels) {
      carModel.position.y = 0;
      carModel.updateMatrixWorld(true);
      const hubs = wheelGroups().map(w => w.getWorldPosition(new THREE.Vector3()));
      hubs.forEach(h => (h.y += L.stands.raise));
      const box = new THREE.Box3().setFromObject(carModel);
      box.min.y += L.stands.raise;
      box.max.y += L.stands.raise;
      garage.userData.stands.userData.place(hubs, L.stands.raise, box);
    }
    st.wheels = on;
    wheelGroups().forEach(w => (w.visible = on));
    if (garage) garage.userData.stands.visible = !on;
    carModel.position.y = on ? 0 : L.stands.raise;
    changed();
    $('garage-wheels')?.classList.toggle('active', on);
    if ($('garage-wheels')) $('garage-wheels').textContent = on ? 'Wheels on' : 'Wheels off';
  }

  function setBody(on) {
    st.body = on;
    if (st.xray && on) setXRay(false);
    const b = subs()[PART_ORDER.indexOf('bodywork')];
    if (b) b.visible = on;
    // When bodywork is removed in the garage, reveal the full internal engineering:
    // 1.6L V6 engine, turbocharger, MGU-K, 8-speed gearbox, 800V electrical harness, coolers & hoses!
    carModel?.userData?.rb22?.showInternals?.(!on);
    // Also reveal the structural carbon monocoque survival cell and titanium halo when bodywork is off
    ['Body_Monocoque_CarbonTub', 'Body_Halo_Titanium_Assembly', 'Body_RollHoop_Primary_172kN', 'Cockpit_Headrest_Assembly'].forEach(n => {
      const o = carModel.getObjectByName(n);
      if (o) o.visible = !on;
    });
    changed();
    $('garage-body')?.classList.toggle('active', on);
    if ($('garage-body')) $('garage-body').textContent = on ? 'Bodywork on' : 'Bodywork off';
  }

  function setXRay(on) {
    st.xray = on;
    const rb = carModel.getObjectByName('Body_RB22_Assembly');
    if (rb) {
      rb.traverse(o => {
        if (o.isMesh) {
          if (on) {
            if (!o.userData._origMat) o.userData._origMat = o.material;
            const m = o.material.clone();
            m.transparent = true;
            m.opacity = 0.22;
            m.depthWrite = false;
            o.material = m;
          } else if (o.userData._origMat) {
            o.material = o.userData._origMat;
            delete o.userData._origMat;
          }
        }
      });
    }
    // Show internals through the translucent bodywork
    carModel?.userData?.rb22?.showInternals?.(on || !st.body);
    ['Body_Monocoque_CarbonTub', 'Body_Halo_Titanium_Assembly', 'Body_RollHoop_Primary_172kN'].forEach(n => {
      const o = carModel.getObjectByName(n);
      if (o) o.visible = on || !st.body;
    });
    changed();
    $('garage-xray')?.classList.toggle('active', on);
    if ($('garage-xray')) $('garage-xray').textContent = on ? 'X-Ray on' : 'X-Ray';
  }

  // ---------------------------------------------------------------- Selection & Info Card
  const outlineMat = new THREE.MeshBasicMaterial({ color: 0xbff0ff, side: THREE.BackSide, transparent: true, opacity: 0.9, depthWrite: false });
  outlineMat.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n  transformed += normalize(normal) * 0.12;');
  };
  const glowMat = new THREE.MeshBasicMaterial({ color: 0x3fc8ff, transparent: true, opacity: 0.14, blending: THREE.AdditiveBlending, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
  const overlays = [];

  function clearSel() {
    overlays.forEach(o => o.removeFromParent());
    overlays.length = 0;
    st.sel = null;
    card.style.display = 'none';
    changed();
  }

  function select(key, obj) {
    clearSel();
    const info = GARAGE_PARTS[key];
    if (!info) return;
    if (['powertrain', 'transmission', 'electrical', 'monocoque'].includes(key)) {
      carModel?.userData?.rb22?.showInternals?.(true);
      if (key === 'monocoque') {
        const tub = carModel.getObjectByName('Body_Monocoque_CarbonTub');
        if (tub) tub.visible = true;
      }
    }
    const groups = key === 'wheels' ? wheelGroups() : [obj];
    const meshes = [];
    groups.forEach(gr => gr.traverse(o => {
      if (o.isMesh && !o.isInstancedMesh && !o.isSkinnedMesh && !o.userData.garageOverlay && o.geometry?.attributes?.normal) meshes.push(o);
    }));
    for (const o of meshes) {
      for (const mat of [outlineMat, glowMat]) {
        const m = new THREE.Mesh(o.geometry, mat);
        m.userData.garageOverlay = true;
        m.raycast = () => {};
        m.renderOrder = 3;
        o.add(m);
        overlays.push(m);
      }
    }
    const box = new THREE.Box3();
    groups.forEach(gr => box.expandByObject(gr));
    box.getCenter(st.selCentre);
    st.sel = key;
    changed();
    card.innerHTML = `<button type="button" class="x" aria-label="Close">✕</button><h3>${info.name}</h3><div>${info.text}</div><ul>${info.facts.map(f => `<li>${f}</li>`).join('')}</ul>`;
    card.querySelector('.x').addEventListener('click', clearSel);
    card.style.display = 'block';
  }

  function showItemCard(title, text, posVec) {
    clearSel();
    card.innerHTML = `<button type="button" class="x" aria-label="Close">✕</button><h3>${title}</h3><div>${text}</div>`;
    card.querySelector('.x').addEventListener('click', clearSel);
    card.style.display = 'block';
    if (posVec) st.selCentre.copy(posVec);
    changed();
  }

  function partOf(o) {
    for (let p = o; p && p !== carModel; p = p.parent) {
      if (p.name && p.name.startsWith('Wheel_Visual_')) return ['wheels', p];
    }
    let p = o;
    while (p && p.parent !== carModel) p = p.parent;
    const i = p ? carModel.children.indexOf(p) : -1;
    return i >= 0 && i < PART_ORDER.length ? [PART_ORDER[i], p] : [null, null];
  }

  // ---------------------------------------------------------------- Picking & Interaction
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  let down = null;

  renderer.domElement.addEventListener('pointerdown', (e) => {
    if (st.active) down = [e.clientX, e.clientY];
  });

  renderer.domElement.addEventListener('pointerup', (e) => {
    if (!st.active || !down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 5) {
      down = null;
      return;
    }
    down = null;
    const r = renderer.domElement.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);

    const clickables = garage ? garage.userData.clickables || [] : [];
    const hits = ray.intersectObjects([...clickables, carModel], true).filter(h => h.object.visible && isShown(h.object));
    if (!hits.length) {
      clearSel();
      return;
    }

    const o = hits[0].object;

    // Traverse up ancestors to find any interactive action handler
    let clickObj = o;
    while (clickObj && !clickObj.userData?.click && clickObj.parent && clickObj !== garage) {
      clickObj = clickObj.parent;
    }
    const action = clickObj?.userData?.click || o.userData?.click;

    if (action) {
      handleGarageClick(action, clickObj || o, hits[0].point);
      return;
    }

    const [key, grp] = partOf(o);
    if (key) select(key, grp); else clearSel();
  });

  const isShown = (o) => {
    for (let p = o; p; p = p.parent) if (!p.visible) return false;
    return true;
  };

  function handleGarageClick(action, targetObj, point) {
    if (action === 'regulations') {
      openModal(regOv, true);
    } else if (action === 'screen_steering_wheel') {
      openModal(wheelOv, true);
    } else if (action === 'screen_standings') {
      openModal(standingsOv, true);
    } else if (action === 'screen_weather') {
      openModal(weatherOv, true);
    } else if (action === 'screen_sredesigns') {
      openModal(sreOv, true);
    } else if (action === 'screen_acknowledgements' || action === 'screen_laptop') {
      openModal(ackOv, true);
    } else if (action === 'pit_perch') {
      zoomToPitPerch();
    } else if (action === 'tool_chest_drawer') {
      const idx = targetObj.userData.index ?? 0;
      const isOpen = garage?.userData.toolChest?.userData.toggleDrawer(idx);
      showItemCard(
        targetObj.userData.name || 'Tool Chest Drawer',
        isOpen ? 'Drawer opened. Custom laser-cut shadow foam organizer revealed with precision tool set.' : 'Drawer closed.',
        point
      );
    } else if (action === 'tool_wheel_gun') {
      showItemCard(
        targetObj.userData.toolName || 'Paoli DP 4000 F1 Wheel Gun',
        'Pneumatic high-torque carbon-and-magnesium impact wrench suspended from overhead spring balancer. Delivers >4,200 Nm of torque in 0.2 seconds for sub-2-second F1 pit stops.',
        point
      );
    } else if (action === 'tool_tyre_gauge') {
      showItemCard(
        targetObj.userData.toolName || 'Digital Tyre Pressure & Temperature Gauge',
        'Intercomp digital pressure transducer (0.01 PSI precision) with integrated pyrometer needle for carcass thermal profile inspection.',
        point
      );
    } else if (action === 'tool_umbilical') {
      showItemCard(
        targetObj.userData.toolName || 'Aerospace Telemetry Umbilical Connector',
        'Mil-Spec Deutsch circular quick-connect umbilical. Plugs into the survival cell port behind the driver headrest for high-speed CAN-bus logging and 800V battery conditioning in the garage.',
        point
      );
    } else if (action === 'tool_caliper') {
      showItemCard(
        targetObj.userData.toolName || 'Digital Vernier Caliper',
        'Hardened stainless steel digital caliper (0.01 mm precision) for aerodynamic wing gap and carbon brake disc wear verification.',
        point
      );
    } else if (action === 'tool_parts_dish') {
      showItemCard(
        targetObj.userData.toolName || 'Magnetic Titanium Parts Tray',
        'Holds titanium wheel nuts and copper sealing rings securely in the active service bay.',
        point
      );
    } else if (action === 'tool_laptop') {
      showItemCard(
        targetObj.userData.toolName || 'Pit Diagnostic Laptop Node',
        'Panasonic Toughbook telemetry terminal running CAN-bus diagnostics and SREdesigns telemetry suite.',
        point
      );
    } else if (action === 'setup_platform') {
      showItemCard(
        targetObj.userData.title || 'FIA Scrutineering Setup Table',
        'Precision titanium & carbon alignment surface plate with 4-corner load cell scales, laser ride-height bridges, and camber/toe measurement targets for the 2026 Nimble Car.',
        point
      );
    } else if (action === 'wing_rack') {
      showItemCard(
        targetObj.userData.title || '2026 Active-Aero Wing Assembly Rack',
        'Modular quick-swap front and rear wing assemblies with active flap actuators (X-Mode straight-line drag reduction) and ground-effect strakes.',
        point
      );
    } else if (action === 'power_unit_station') {
      showItemCard(
        targetObj.userData.title || 'Power Unit & High-Voltage Diagnostics',
        'Sub-assembly workstation for 1.6L V6 Turbo internal combustion engine, 350 kW MGU-K motor generator, and 800V DC energy storage system diagnostics.',
        point
      );
    } else if (action === 'debrief_table') {
      showItemCard(
        targetObj.userData.title || 'Driver Debrief & Strategy Station',
        'Central telemetry debrief table equipped with live timing iPads, sector deltas, driver hydration supplies, and radio intercom headsets.',
        point
      );
    } else {
      showItemCard(
        targetObj.userData.title || 'Garage Equipment',
        'Active pit lane service equipment for the 2026 Formula 1 Nimble Car.',
        point
      );
    }
  }

  // ---------------------------------------------------------------- Camera Navigation
  const WALK = new Set(['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright']);
  window.addEventListener('keydown', (e) => {
    if (!st.active || /input|textarea|select/i.test(e.target?.tagName || '')) return;
    const k = e.key.toLowerCase();
    if (!WALK.has(k)) return;
    st.keys.add(k);
    e.preventDefault();
    e.stopImmediatePropagation();
  }, true);

  window.addEventListener('keyup', (e) => {
    const k = e.key.toLowerCase();
    if (st.keys.delete(k) && st.active) e.stopImmediatePropagation();
  }, true);

  function zoomToDesk() {
    const v = garage.userData.deskView;
    st.viewingPitPerch = false;
    st.tween = {
      start: performance.now(),
      t: 0,
      p0: camera.position.clone(),
      t0: controls.target.clone(),
      p1: new THREE.Vector3(...v.pos),
      t1: new THREE.Vector3(...v.target),
      done: () => openModal(regOv, true),
    };
  }

  function zoomToPitPerch() {
    const v = garage.userData.pitPerchView;
    st.viewingPitPerch = true;
    st.tween = {
      start: performance.now(),
      t: 0,
      p0: camera.position.clone(),
      t0: controls.target.clone(),
      p1: new THREE.Vector3(...v.pos),
      t1: new THREE.Vector3(...v.target),
      done: () => {
        showItemCard(
          'Pit Wall Stand (Pit Perch)',
          'Command station for the Team Principal, Sporting Director, and Chief Strategist. Equipped with 8 live telemetry screens, intercom radio headsets, and timing monitors overlooking the pit lane.'
        );
      },
    };
  }

  function zoomToToolChest() {
    const v = garage.userData.toolChestView;
    st.viewingPitPerch = false;
    st.tween = {
      start: performance.now(),
      t: 0,
      p0: camera.position.clone(),
      t0: controls.target.clone(),
      p1: new THREE.Vector3(...v.pos),
      t1: new THREE.Vector3(...v.target),
      done: () => {
        showItemCard(
          'Interactive Tool Chest',
          '5-drawer mobile roll-cab cabinet. Click individual drawers to slide them open and inspect custom laser-cut tool shadow foam sets.'
        );
      },
    };
  }

  function zoomToSetupPlatform() {
    st.viewingPitPerch = false;
    st.tween = {
      start: performance.now(),
      t: 0,
      p0: camera.position.clone(),
      t0: controls.target.clone(),
      p1: new THREE.Vector3(22, 16, -26),
      t1: new THREE.Vector3(22, 4, -44),
      done: () => {
        showItemCard(
          'FIA Scrutineering Setup Table',
          'Precision titanium & carbon alignment surface plate with 4-corner load cell scales, laser ride-height bridges, and camber/toe measurement targets for the 2026 Nimble Car.'
        );
      },
    };
  }

  function zoomToPowerUnitStation() {
    st.viewingPitPerch = false;
    st.tween = {
      start: performance.now(),
      t: 0,
      p0: camera.position.clone(),
      t0: controls.target.clone(),
      p1: new THREE.Vector3(88, 16, 36),
      t1: new THREE.Vector3(88, 8, 54),
      done: () => {
        showItemCard(
          'Power Unit & High-Voltage Diagnostics',
          'Sub-assembly workstation for 1.6L V6 Turbo internal combustion engine, 350 kW MGU-K motor generator, and 800V DC energy storage system diagnostics.'
        );
      },
    };
  }

  // ---------------------------------------------------------------- Enter / Exit
  let entering = null;
  async function enterGarageInspect() {
    if (st.active) return;
    if (entering) return entering;
    $('btn-garage')?.classList.add('active');
    try {
      entering = (async () => {
        builder = builder || await import('./garage_builder.js');
        garage = builder.buildGarage(GARAGE_LAYOUT, getTeamId(), { quality: QUALITY });
        scene.add(garage);
      })();
      await entering;
    } catch (err) {
      console.error('Failed to enter garage:', err);
      $('btn-garage')?.classList.remove('active');
      entering = null;
      return;
    } finally {
      entering = null;
    }

    st.active = true;
    st.wasCircuit = !!trackMode?.mode?.circuit;
    st.saved = {
      pos: camera.position.clone(),
      target: controls.target.clone(),
      near: camera.near,
      far: camera.far,
      fog: scene.fog,
      legacy: legacyEnv?.visible,
      env: scene.environment,
      lights: [],
    };
    trackMode?.applyCircuit?.(false);
    if (legacyEnv) legacyEnv.visible = false;
    scene.fog = null;

    scene.traverse(o => {
      if (o.isLight && !garage?.userData?.lights?.includes(o) && o.visible) {
        st.saved.lights.push([o, o.intensity, o.castShadow]);
        o.intensity = 0;
        o.castShadow = false;
      }
    });

    carModel.traverse(o => {
      const m = o.material;
      if (m && [].concat(m).some(x => x.transmission > 0)) return;
      o.layers.enable(builder.REFLECT_LAYER);
    });

    try {
      if (garage.userData?.captureEnv) {
        scene.environment = garage.userData.captureEnv(renderer, scene, [carModel]);
      }
    } catch (e) {
      console.warn('Garage captureEnv error:', e);
    }
    st.saved.exposure = renderer.toneMappingExposure;
    renderer.toneMappingExposure = 1.0;
    st.saved.shadowAuto = renderer.shadowMap.autoUpdate;
    renderer.shadowMap.autoUpdate = false;
    changed();

    camera.near = 0.2;
    camera.far = 1500;
    camera.updateProjectionMatrix();

    st.saved.maxDist = controls.maxDistance;
    st.saved.minDist = controls.minDistance;
    st.saved.maxPolar = controls.maxPolarAngle;
    st.saved.setView = window.setCameraView;

    controls.maxDistance = 250;
    controls.minDistance = 2;
    controls.maxPolarAngle = Math.PI * 0.53;
    camera.up.set(0, 1, 0);

    window.setCameraView = (name) => {
      const v = GARAGE_VIEWS[name];
      if (!v) return st.saved.setView?.(name);
      st.tween = null;
      st.viewingPitPerch = false;
      if (name === 'CAM_EXPLODED' || name === 'STATE_ACTIVE') st.saved.setView?.(name);
      camera.up.set(0, 1, 0);
      camera.position.set(...v.pos);
      controls.target.set(...v.target);
      camera.lookAt(controls.target);
      controls.update();
      keepInside();
    };

    camera.position.set(-68, 22, 28);
    controls.target.set(22, 4.5, 0);
    controls.enabled = true;
    controls.update();

    document.body.classList.add('garage-mode');
    window.f1Music?.playContext?.('garage');
    const hud = document.getElementById('rbr-hud');
    if (hud) hud.style.display = 'none';

    bar.classList.add('on');
    $('btn-garage')?.classList.add('active');
  }

  function exitGarageInspect() {
    if (!st.active) return;
    clearSel();
    viewsPop?.classList.remove('on');
    if (st.xray) setXRay(false);
    setWheels(true);
    setBody(true);
    closeAllModals();
    st.active = false;
    st.tween = null;
    st.keys.clear();
    st.viewingPitPerch = false;

    carModel.traverse(o => o.layers.disable(builder.REFLECT_LAYER));
    garage.userData.dispose();
    garage = null;

    scene.environment = st.saved.env ?? null;
    renderer.toneMappingExposure = st.saved.exposure ?? renderer.toneMappingExposure;
    renderer.shadowMap.autoUpdate = st.saved.shadowAuto ?? true;
    renderer.shadowMap.needsUpdate = true;
    st.saved.lights.forEach(([o, i, cs]) => {
      o.intensity = i;
      o.castShadow = cs;
    });
    scene.fog = st.saved.fog;

    if (legacyEnv) legacyEnv.visible = st.saved.legacy ?? true;
    camera.near = st.saved.near;
    camera.far = st.saved.far;
    camera.updateProjectionMatrix();

    controls.maxDistance = st.saved.maxDist ?? Infinity;
    controls.minDistance = st.saved.minDist ?? 0;
    controls.maxPolarAngle = st.saved.maxPolar ?? Math.PI;

    if (st.saved.setView) window.setCameraView = st.saved.setView;
    document.body.classList.remove('garage-mode');
    window.f1Music?.returnToGeneral?.();
    const hud = document.getElementById('rbr-hud');
    if (hud) hud.style.display = '';

    bar.classList.remove('on');
    $('btn-garage')?.classList.remove('active');

    if (st.wasCircuit && trackMode) {
      trackMode.applyCircuit(true);
      trackMode.setDriving?.(true);
      trackMode.setCam?.('chase');
    } else {
      camera.position.copy(st.saved.pos);
      controls.target.copy(st.saved.target);
      controls.update();
    }
  }

  // ---------------------------------------------------------------- Camera Constraints & Views
  const camRay = new THREE.Raycaster(), cDir = new THREE.Vector3();
  const roomBox = () => ({
    x0: st.viewingPitPerch ? -185 : L.x0 - 45,
    x1: L.x1 - 3,
    z: L.halfWidth - 2.5,
    y0: 1.2,
    y1: L.height - 4,
  });

  function keepInside() {
    if (!garage) return;
    const R = roomBox(), t = controls.target, p = camera.position;
    const clampV = (v) => {
      v.x = THREE.MathUtils.clamp(v.x, R.x0, R.x1);
      v.z = THREE.MathUtils.clamp(v.z, -R.z, R.z);
      v.y = THREE.MathUtils.clamp(v.y, R.y0, R.y1);
    };
    clampV(t);
    clampV(p);

    cDir.subVectors(p, t);
    const dist = cDir.length();
    if (dist > 0.01) {
      cDir.divideScalar(dist);
      camRay.set(t, cDir);
      camRay.far = dist;
      const walls = garage.userData.camBlockers || (garage.userData.camBlockers = collectBlockers());
      const hit = camRay.intersectObjects(walls, false)[0];
      if (hit && hit.distance < dist) p.copy(t).addScaledVector(cDir, Math.max(2, hit.distance - 2.5));
    }
  }

  function collectBlockers() {
    const out = [], sz = new THREE.Vector3(), box = new THREE.Box3();
    garage.updateMatrixWorld(true);
    garage.traverse(o => {
      if (!o.isMesh || o.isInstancedMesh || !o.geometry) return;
      box.setFromObject(o).getSize(sz);
      const dims = [sz.x, sz.y, sz.z].sort((a, b) => b - a);
      if (dims[0] > 30 && dims[1] > 25 && dims[2] < 6) out.push(o);
    });
    return out;
  }

  // ---------------------------------------------------------------- Update Loop
  const fwd = new THREE.Vector3(), right = new THREE.Vector3(), mv = new THREE.Vector3(), scr = new THREE.Vector3();

  function update(dt) {
    if (!st.active) return;
    dt = Math.min(dt, 0.05);
    if (!st.wheels) carModel.position.y = L.stands.raise;

    if (st.tween) {
      const T = st.tween;
      T.t = Math.min(1, (performance.now() - T.start) / 800);
      const e = T.t * T.t * (3 - 2 * T.t);
      camera.position.lerpVectors(T.p0, T.p1, e);
      controls.target.lerpVectors(T.t0, T.t1, e);
      controls.update();
      if (T.t >= 1) {
        st.tween = null;
        T.done?.();
      }
    } else if (st.keys.size) {
      camera.getWorldDirection(fwd);
      fwd.y = 0;
      fwd.normalize();
      right.crossVectors(fwd, camera.up).normalize();
      mv.set(0, 0, 0);
      if (st.keys.has('w') || st.keys.has('arrowup')) mv.add(fwd);
      if (st.keys.has('s') || st.keys.has('arrowdown')) mv.sub(fwd);
      if (st.keys.has('d') || st.keys.has('arrowright')) mv.add(right);
      if (st.keys.has('a') || st.keys.has('arrowleft')) mv.sub(right);
      mv.multiplyScalar(30 * dt);

      const p = camera.position.clone().add(mv);
      const minX = st.viewingPitPerch ? -185 : L.x0 - 60;
      p.x = THREE.MathUtils.clamp(p.x, minX, L.x1 - 4);
      p.z = THREE.MathUtils.clamp(p.z, -L.halfWidth + 3, L.halfWidth - 3);
      mv.subVectors(p, camera.position);
      camera.position.add(mv);
      controls.target.add(mv);
      controls.update();
    }
    keepInside();

    if (st.sel) {
      scr.copy(st.selCentre).project(camera);
      const r = renderer.domElement, w = r.clientWidth, h = r.clientHeight;
      if (scr.z < 1) {
        card.style.display = 'block';
        card.style.left = `${Math.min(w - 290, Math.max(4, (scr.x * 0.5 + 0.5) * w + 18))}px`;
        card.style.top = `${Math.min(h - 140, Math.max(4, (-scr.y * 0.5 + 0.5) * h - 40))}px`;
      } else {
        card.style.display = 'none';
      }
    }
  }

  const api = {
    get garage() { return garage; },
    enterGarageInspect,
    exitGarageInspect,
    update,
    openRegulations: () => openModal(regOv, true),
    openSteeringWheelGuide: () => openModal(wheelOv, true),
    openStandings: () => openModal(standingsOv, true),
    openWeatherRadar: () => openModal(weatherOv, true),
    openSREdesigns: () => openModal(sreOv, true),
    openAcknowledgements: () => openModal(ackOv, true),
    zoomToPitPerch,
    zoomToToolChest,
    zoomToSetupPlatform,
    zoomToPowerUnitStation,
    zoomToDesk,
    get active() { return st.active; },
    select: (key) => {
      const i = PART_ORDER.indexOf(key);
      select(key, key === 'wheels' ? null : subs()[i]);
    },
    setWheels,
    setBody,
    quality: QUALITY,
    setReflections: (on) => {
      garage?.userData.setReflections(on);
      changed();
    },
    changed,
  };

  window.enterGarageInspect = enterGarageInspect;
  window.exitGarageInspect = exitGarageInspect;
  window.garageInspect = api;
  return api;
}
