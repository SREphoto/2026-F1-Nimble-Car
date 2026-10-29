/**
 * ui_pause_menu.js — Full-Featured F1 Pause & Navigation Menu ("Hamburger Menu")
 * SREdesigns - Samuel R Erwin III
 *
 * Implements a unified, high-contrast, tactile pause & command center:
 *  1. One-click Pause button / Hamburger button (in header + persistent floating badge).
 *  2. Keyboard shortcut: 'P' or 'Escape' toggles the Pause Menu and freezes all simulation dynamics.
 *  3. Organized into 4 master categories:
 *     - 🎥 Camera & Viewpoints (All 10 standard angles + Garage hotspots + Reset)
 *     - 🏎️ Car & Garage Controls (Garage mode, Wheels, Bodywork, X-Ray, Exploded, Wireframe, Tour, Auto-rotate)
 *     - 🖥️ Screens & Engineering Hub (Steering Wheel Guide, Standings, Weather Radar, SREdesigns, Regulations, Credits, Pit Perch, Tool Chest)
 *     - 🎨 Livery, Weather & Settings (11 Team liveries, Atmosphere moods, Weather presets, Audio, Graphics quality)
 *  4. Big green "▶ RESUME" button to smoothly resume 3D simulation.
 */

const CSS = `
/* Persistent Floating Menu / Pause Trigger Button */
#btn-floating-pause {
  position: fixed;
  top: 12px;
  right: 14px;
  z-index: 1001;
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(8, 14, 26, 0.90);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(0, 212, 232, 0.45);
  color: #00d4e8;
  font: 600 12px/1 monospace, system-ui, sans-serif;
  padding: 8px 14px;
  border-radius: 8px;
  cursor: pointer;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.6), 0 0 12px rgba(0, 212, 232, 0.2);
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  letter-spacing: 0.04em;
}
#btn-floating-pause:hover {
  background: rgba(14, 24, 44, 0.98);
  border-color: #00d4e8;
  color: #ffffff;
  box-shadow: 0 6px 28px rgba(0, 0, 0, 0.8), 0 0 18px rgba(0, 212, 232, 0.45);
  transform: translateY(-1px);
}
#btn-floating-pause .hamburger-icon {
  font-size: 15px;
  line-height: 1;
}

/* Header Topbar Menu Button */
.topbar-menu-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: rgba(15, 23, 42, 0.8);
  border: 1px solid #334155;
  color: #00d4e8;
  border-radius: 6px;
  padding: 6px 12px;
  font: 600 12px system-ui, sans-serif;
  cursor: pointer;
  transition: all 0.15s ease;
}
.topbar-menu-btn:hover {
  background: #0284c7;
  color: #ffffff;
  border-color: #38bdf8;
}

/* Master Pause & Navigation Modal */
#f1-pause-modal {
  position: fixed;
  inset: 0;
  z-index: 2000;
  background: rgba(3, 7, 18, 0.84);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  display: none;
  align-items: center;
  justify-content: center;
  padding: 20px;
  opacity: 0;
  transition: opacity 0.2s ease;
}
#f1-pause-modal.on {
  display: flex;
  opacity: 1;
}

.pause-card {
  background: linear-gradient(180deg, #0d1525 0%, #060a14 100%);
  border: 1px solid rgba(56, 189, 248, 0.3);
  border-radius: 14px;
  width: 100%;
  max-width: 960px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 24px 80px rgba(0, 0, 0, 0.9), 0 0 40px rgba(0, 212, 232, 0.18);
  color: #e2e8f0;
  font-family: system-ui, -apple-system, sans-serif;
  animation: pausePop 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes pausePop {
  from { transform: scale(0.96) translateY(8px); opacity: 0; }
  to { transform: scale(1) translateY(0); opacity: 1; }
}

/* Card Header */
.pause-head {
  padding: 18px 24px 14px;
  background: rgba(15, 23, 42, 0.6);
  border-bottom: 1px solid #1e293b;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
}
.pause-head-title {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.pause-brand-row {
  display: flex;
  align-items: center;
  gap: 10px;
}
.pause-brand {
  font-size: 18px;
  font-weight: 800;
  letter-spacing: 0.06em;
  color: #00d4e8;
}
.pause-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: rgba(245, 158, 11, 0.15);
  border: 1px solid #f59e0b;
  color: #fbbf24;
  font-size: 11px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 9999px;
  letter-spacing: 0.05em;
}
.pause-pill.active {
  background: rgba(34, 197, 94, 0.15);
  border-color: #22c55e;
  color: #4ade80;
}
.pause-sub {
  font-size: 12px;
  color: #94a3b8;
  margin: 0;
}
.pause-head-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}
.pause-resume-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: #0284c7;
  color: #ffffff;
  border: 1px solid #38bdf8;
  padding: 8px 18px;
  border-radius: 6px;
  font-weight: 700;
  font-size: 13px;
  cursor: pointer;
  box-shadow: 0 4px 16px rgba(2, 132, 199, 0.4);
  transition: all 0.15s ease;
}
.pause-resume-btn:hover {
  background: #0369a1;
  border-color: #7dd3fc;
  box-shadow: 0 6px 20px rgba(2, 132, 199, 0.6);
  transform: translateY(-1px);
}
.pause-close-btn {
  background: none;
  border: none;
  color: #94a3b8;
  font-size: 24px;
  cursor: pointer;
  padding: 4px 8px;
  line-height: 1;
  border-radius: 6px;
}
.pause-close-btn:hover {
  color: #ffffff;
  background: rgba(255, 255, 255, 0.08);
}

/* Navigation Tabs */
.pause-tabs {
  display: flex;
  background: #080d19;
  border-bottom: 1px solid #1e293b;
  padding: 0 16px;
  overflow-x: auto;
}
.pause-tab {
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  color: #94a3b8;
  padding: 12px 18px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  white-space: nowrap;
  transition: all 0.15s ease;
}
.pause-tab:hover {
  color: #e2e8f0;
  background: rgba(255, 255, 255, 0.02);
}
.pause-tab.active {
  color: #00d4e8;
  border-bottom-color: #00d4e8;
  background: rgba(0, 212, 232, 0.04);
}

/* Tab Content */
.pause-body {
  padding: 20px 24px;
  overflow-y: auto;
  flex: 1;
}
.pause-pane {
  display: none;
  flex-direction: column;
  gap: 20px;
}
.pause-pane.active {
  display: flex;
}

.pause-section-title {
  font-size: 12px;
  font-weight: 700;
  color: #38bdf8;
  letter-spacing: 0.08em;
  margin: 0 0 10px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.pause-section-title small {
  color: #64748b;
  font-weight: normal;
}

/* Grid of Action Cards */
.pause-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
  gap: 10px;
}
.pause-card-btn {
  background: #0f172a;
  border: 1px solid #1e293b;
  border-radius: 8px;
  padding: 12px 14px;
  text-align: left;
  cursor: pointer;
  color: #e2e8f0;
  display: flex;
  flex-direction: column;
  gap: 4px;
  transition: all 0.15s ease;
}
.pause-card-btn:hover {
  background: #1e293b;
  border-color: #00d4e8;
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.4);
}
.pause-card-btn.active {
  background: rgba(2, 132, 199, 0.25);
  border-color: #38bdf8;
}
.pause-card-btn .card-icon {
  font-size: 20px;
  margin-bottom: 2px;
}
.pause-card-btn b {
  font-size: 13px;
  color: #f8fafc;
}
.pause-card-btn span {
  font-size: 11px;
  color: #94a3b8;
  line-height: 1.3;
}

/* Team Livery Swatches Grid */
.pause-team-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 8px;
}
.pause-team-btn {
  background: #0b1120;
  border: 1px solid #1e293b;
  border-radius: 6px;
  padding: 8px 10px;
  display: flex;
  align-items: center;
  gap: 8px;
  color: #cbd5e1;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.15s ease;
}
.pause-team-btn:hover {
  border-color: #38bdf8;
  background: #131d33;
}
.pause-team-btn.active {
  background: #172554;
  border-color: #60a5fa;
  color: #ffffff;
  font-weight: 600;
}
.pause-team-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex-shrink: 0;
  box-shadow: 0 0 8px rgba(0,0,0,0.5);
}

/* Footer / Resume Bar */
.pause-footer {
  padding: 12px 24px;
  background: #060912;
  border-top: 1px solid #1e293b;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  color: #64748b;
}
.pause-footer kbd {
  background: #1e293b;
  border: 1px solid #334155;
  color: #94a3b8;
  border-radius: 4px;
  padding: 2px 6px;
  font-family: monospace;
}
`;

export function initPauseMenu() {
  const $ = (id) => document.getElementById(id);

  // Inject Styles
  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  document.head.appendChild(styleEl);

  // 1. Create Persistent Floating Menu Trigger Button
  const floatBtn = document.createElement('button');
  floatBtn.id = 'btn-floating-pause';
  floatBtn.type = 'button';
  floatBtn.title = 'Open Navigation & Command Center (Press Esc or P)';
  floatBtn.innerHTML = `<span class="hamburger-icon">☰</span><span>MENU / PAUSE</span>`;
  document.body.appendChild(floatBtn);

  // 2. Add Menu Button into the Topbar if not present
  const topbar = document.querySelector('.topbar');
  if (topbar && !$('btn-topbar-menu')) {
    const topbarBtn = document.createElement('button');
    topbarBtn.id = 'btn-topbar-menu';
    topbarBtn.type = 'button';
    topbarBtn.className = 'topbar-menu-btn';
    topbarBtn.title = 'Open Pause & Navigation Menu (Esc / P)';
    topbarBtn.innerHTML = `<span>☰</span><span>MENU</span>`;
    topbar.appendChild(topbarBtn);
    topbarBtn.addEventListener('click', togglePauseMenu);
  }

  // 3. Create the Modal DOM Structure
  const modal = document.createElement('div');
  modal.id = 'f1-pause-modal';
  modal.innerHTML = `
    <div class="pause-card" role="dialog" aria-modal="true" aria-label="F1 Command & Pause Menu">
      <!-- Head -->
      <div class="pause-head">
        <div class="pause-head-title">
          <div class="pause-brand-row">
            <span class="pause-brand">SREdesigns</span>
            <span id="pause-status-pill" class="pause-pill">⏸ PAUSED</span>
          </div>
          <p class="pause-sub">2026 FORMULA 1 NIMBLE CAR · DIGITAL TWIN COMMAND & NAVIGATION CENTER</p>
        </div>
        <div class="pause-head-actions">
          <button type="button" class="pause-resume-btn" id="pause-resume-btn">▶ RESUME</button>
          <button type="button" class="pause-close-btn" id="pause-close-btn" aria-label="Close menu">✕</button>
        </div>
      </div>

      <!-- Tabs -->
      <div class="pause-tabs">
        <button type="button" class="pause-tab active" data-tab="pane-race">🏁 Race, Autopilot &amp; Tyres</button>
        <button type="button" class="pause-tab" data-tab="pane-views">🎥 Camera &amp; Views</button>
        <button type="button" class="pause-tab" data-tab="pane-controls">🏎️ Car &amp; Garage Controls</button>
        <button type="button" class="pause-tab" data-tab="pane-screens">🖥️ Screens &amp; Engineering Hub</button>
        <button type="button" class="pause-tab" data-tab="pane-settings">🎨 Livery &amp; Settings</button>
      </div>

      <!-- Body -->
      <div class="pause-body">
        <!-- Pane 0: Race, Autopilot & Tyres -->
        <div id="pane-race" class="pause-pane active">
          <!-- Session Modes -->
          <div class="pause-section-title">
            <span>F1 SESSIONS &amp; GAMEPLAY MODES</span>
            <small>Select practice, qualifying or race</small>
          </div>
          <div class="pause-grid">
            <button type="button" class="pause-card-btn" id="pause-mode-solo">
              <span class="card-icon">🏎️</span>
              <b>Solo Practice</b>
              <span>Free drive with no traffic · test setup &amp; apex lines</span>
            </button>
            <button type="button" class="pause-card-btn" id="pause-mode-fp1">
              <span class="card-icon">⏱️</span>
              <b>Practice (FP1)</b>
              <span>Free Practice 1 — 60-min simulated session &amp; tower</span>
            </button>
            <button type="button" class="pause-card-btn" id="pause-mode-fp2">
              <span class="card-icon">⏱️</span>
              <b>Practice (FP2)</b>
              <span>Free Practice 2 — track evolution &amp; AI benchmark laps</span>
            </button>
            <button type="button" class="pause-card-btn" id="pause-mode-fp3">
              <span class="card-icon">⏱️</span>
              <b>Practice (FP3)</b>
              <span>Free Practice 3 — final qualifying simulation run</span>
            </button>
            <button type="button" class="pause-card-btn" id="pause-mode-q">
              <span class="card-icon">🎯</span>
              <b>Qualifying (Quali)</b>
              <span>Knockout Q1 · Q2 · Q3 sessions for pole position</span>
            </button>
            <button type="button" class="pause-card-btn" id="pause-mode-race">
              <span class="card-icon">🚦</span>
              <b>Formation Lap / Race Start</b>
              <span>5 red lights sequence, launch revs &amp; 22-car standing start</span>
            </button>
          </div>

          <!-- Autopilot & Vehicle Drive -->
          <div class="pause-section-title" style="margin-top:10px">
            <span>AUTOPILOT &amp; TRACK NAVIGATION</span>
            <small>AI racing line pursuit &amp; pit stops</small>
          </div>
          <div class="pause-grid">
            <button type="button" class="pause-card-btn" id="pause-btn-autopilot">
              <span class="card-icon">🤖</span>
              <b id="pause-auto-text">Autopilot Lap: OFF</b>
              <span>Follows optimal TUM race line with AI steering/throttle</span>
            </button>
            <button type="button" class="pause-card-btn" id="pause-btn-autopit">
              <span class="card-icon">🛠️</span>
              <b id="pause-pit-text">Autopilot Pit Stop</b>
              <span>80 km/h pit entry, box stop for fresh tyres &amp; rejoining track</span>
            </button>
            <button type="button" class="pause-card-btn" id="pause-btn-drive">
              <span class="card-icon">🎮</span>
              <b id="pause-drive-text">Drive Mode: ACTIVE</b>
              <span>Drive manually with WASD or arrow keys</span>
            </button>
            <button type="button" class="pause-card-btn" id="pause-btn-reset-grid">
              <span class="card-icon">🔄</span>
              <b>Reset to Grid</b>
              <span>Place car back at pole position starting box</span>
            </button>
          </div>

          <!-- Tyre Selection & Wear -->
          <div class="pause-section-title" style="margin-top:10px">
            <span>PIRELLI TYRE COMPOUND</span>
            <small>Instant compound switch (all four tyres)</small>
          </div>
          <div class="pause-team-grid">
            <button type="button" class="pause-team-btn pause-compound-btn" data-compound="soft"><span class="pause-team-dot" style="background:#e3122b"></span>Soft (C4 · Red)</button>
            <button type="button" class="pause-team-btn pause-compound-btn" data-compound="medium"><span class="pause-team-dot" style="background:#f5c400"></span>Medium (C3 · Yellow)</button>
            <button type="button" class="pause-team-btn pause-compound-btn" data-compound="hard"><span class="pause-team-dot" style="background:#f2f2ee"></span>Hard (C2 · White)</button>
            <button type="button" class="pause-team-btn pause-compound-btn" data-compound="inter"><span class="pause-team-dot" style="background:#25a84a"></span>Intermediate (Green)</button>
            <button type="button" class="pause-team-btn pause-compound-btn" data-compound="wet"><span class="pause-team-dot" style="background:#1d6fe8"></span>Full Wet (Blue)</button>
          </div>

          <div class="pause-section-title" style="margin-top:10px">
            <span>TYRE WEAR LEVEL &amp; DEGRADATION</span>
            <small>Simulate tyre life &amp; grip degradation</small>
          </div>
          <div class="pause-team-grid">
            <button type="button" class="pause-team-btn pause-wear-btn" data-wear="new"><span class="pause-team-dot" style="background:#22c55e"></span>Brand New (0% wear)</button>
            <button type="button" class="pause-team-btn pause-wear-btn" data-wear="laps"><span class="pause-team-dot" style="background:#84cc16"></span>A Few Laps (25% wear)</button>
            <button type="button" class="pause-team-btn pause-wear-btn" data-wear="medium"><span class="pause-team-dot" style="background:#eab308"></span>Medium Wear (50% wear)</button>
            <button type="button" class="pause-team-btn pause-wear-btn" data-wear="heavy"><span class="pause-team-dot" style="background:#f97316"></span>Heavy Wear (80% wear)</button>
            <button type="button" class="pause-team-btn pause-wear-btn" data-wear="blown"><span class="pause-team-dot" style="background:#ef4444"></span>Blown Tyre (Puncture)</button>
            <button type="button" class="pause-team-btn" id="pause-btn-newset"><span class="pause-team-dot" style="background:#00d4e8"></span>🔄 Fit Fresh Tyre Set</button>
          </div>

          <!-- On-Screen HUD & Display Overlays -->
          <div class="pause-section-title" style="margin-top:10px">
            <span>ON-SCREEN HUD &amp; MINI-MAP DISPLAY</span>
            <small>Toggle viewport overlay windows</small>
          </div>
          <div class="pause-grid">
            <button type="button" class="pause-card-btn" id="pause-toggle-hud">
              <span class="card-icon">🗺️</span>
              <b id="pause-hud-status">Circuit HUD &amp; Mini-Map: VISIBLE</b>
              <span>Mini-map, sector times, speed &amp; autopilot buttons</span>
            </button>
            <button type="button" class="pause-card-btn" id="pause-toggle-session">
              <span class="card-icon">⏱️</span>
              <b id="pause-sess-status">Session &amp; Standings: VISIBLE</b>
              <span>Session clock, tyre box, lap times &amp; leaderboard</span>
            </button>
            <button type="button" class="pause-card-btn" id="pause-toggle-telem">
              <span class="card-icon">🛞</span>
              <b id="pause-telem-status">Vehicle Telemetry: HIDDEN</b>
              <span>Live tyre temps, brake heat &amp; G-force meter</span>
            </button>
            <button type="button" class="pause-card-btn" id="pause-toggle-timing">
              <span class="card-icon">🏁</span>
              <b id="pause-timing-status">Timing Tower: HIDDEN</b>
              <span>Grand Prix timing tower leaderboard</span>
            </button>
          </div>
        </div>

        <!-- Pane 1: Camera & Views -->
        <div id="pane-views" class="pause-pane">
          <div class="pause-section-title">
            <span>STANDARD VEHICLE VIEWPOINTS</span>
            <small>Click to frame camera instantly</small>
          </div>
          <div class="pause-grid">
            <button type="button" class="pause-card-btn" data-cam="CAM_ISO">
              <span class="card-icon">📐</span>
              <b>ISO Perspective</b>
              <span>3/4 canonical 3D perspective</span>
            </button>
            <button type="button" class="pause-card-btn" data-cam="CAM_FRONT">
              <span class="card-icon">🏎️</span>
              <b>Front Elevation</b>
              <span>Nose, front wing & pushrods</span>
            </button>
            <button type="button" class="pause-card-btn" data-cam="CAM_SIDE">
              <span class="card-icon">↔️</span>
              <b>Side Profile</b>
              <span>Floor tunnel, sidepods & wheelbase</span>
            </button>
            <button type="button" class="pause-card-btn" data-cam="CAM_TOP">
              <span class="card-icon">🔝</span>
              <b>Top Planform</b>
              <span>Cockpit halo & plan view aerodynamics</span>
            </button>
            <button type="button" class="pause-card-btn" data-cam="CAM_REAR">
              <span class="card-icon">🏁</span>
              <b>Rear View</b>
              <span>Active rear wing, diffuser & rain light</span>
            </button>
            <button type="button" class="pause-card-btn" data-cam="CAM_COCKPIT">
              <span class="card-icon">🎮</span>
              <b>Cockpit POV</b>
              <span>Driver eye-level view through Halo</span>
            </button>
            <button type="button" class="pause-card-btn" data-cam="CAM_STEERING">
              <span class="card-icon">🕹️</span>
              <b>Steering Wheel</b>
              <span>McLaren PCU-8D display & dials</span>
            </button>
            <button type="button" class="pause-card-btn" data-cam="CAM_WHEEL">
              <span class="card-icon">🛞</span>
              <b>Pirelli Wheel</b>
              <span>18-inch aerodynamic rim & tire close-up</span>
            </button>
            <button type="button" class="pause-card-btn" data-cam="CAM_EXPLODED">
              <span class="card-icon">💥</span>
              <b>Exploded View</b>
              <span>Kinematic axis assembly separation</span>
            </button>
            <button type="button" class="pause-card-btn" data-cam="STATE_ACTIVE">
              <span class="card-icon">⚡</span>
              <b>Active Run</b>
              <span>Dynamic aerodynamic chase viewpoint</span>
            </button>
          </div>

          <div class="pause-section-title" style="margin-top:10px">
            <span>GARAGE HOTSPOTS</span>
            <small>Inspect facility stations</small>
          </div>
          <div class="pause-grid">
            <button type="button" class="pause-card-btn" id="pause-goto-garage">
              <span class="card-icon">🏢</span>
              <b>Garage Overview</b>
              <span>Wide walkaround of team pit garage</span>
            </button>
            <button type="button" class="pause-card-btn" id="pause-goto-desk">
              <span class="card-icon">💼</span>
              <b>Engineers' Desk</b>
              <span>Regulations workstation & monitor wall</span>
            </button>
            <button type="button" class="pause-card-btn" id="pause-goto-perch">
              <span class="card-icon">🪑</span>
              <b>Pit Wall Stand</b>
              <span>Team Principal command station</span>
            </button>
            <button type="button" class="pause-card-btn" id="pause-goto-toolchest">
              <span class="card-icon">🧰</span>
              <b>Interactive Tool Chest</b>
              <span>5-drawer roll-cab with foam toolsets</span>
            </button>
            <button type="button" class="pause-card-btn" id="pause-goto-setup">
              <span class="card-icon">🔬</span>
              <b>Setup Surface Plate</b>
              <span>FIA laser ride-height & scales</span>
            </button>
            <button type="button" class="pause-card-btn" id="pause-goto-pu">
              <span class="card-icon">⚡</span>
              <b>Power Unit Station</b>
              <span>V6 Hybrid & 800V diagnostics bench</span>
            </button>
            <button type="button" class="pause-card-btn" id="pause-reset-view">
              <span class="card-icon">🔄</span>
              <b>Reset Camera</b>
              <span>Center orbit target on car</span>
            </button>
          </div>
        </div>

        <!-- Pane 2: Car & Garage Controls -->
        <div id="pane-controls" class="pause-pane">
          <div class="pause-section-title">
            <span>GARAGE INSPECTION MODE</span>
            <small>Toggle facility environment</small>
          </div>
          <div class="pause-grid">
            <button type="button" class="pause-card-btn" id="pause-toggle-garage">
              <span class="card-icon">🏢</span>
              <b id="pause-garage-text">Enter Team Garage</b>
              <span>Walk around, inspect parts & tools</span>
            </button>
            <button type="button" class="pause-card-btn" id="pause-toggle-wheels">
              <span class="card-icon">🛞</span>
              <b>Wheels On / Off</b>
              <span>Place car on tripod stands & jacks</span>
            </button>
            <button type="button" class="pause-card-btn" id="pause-toggle-body">
              <span class="card-icon">🏎️</span>
              <b>Bodywork On / Off</b>
              <span>Remove body panels to expose powertrain</span>
            </button>
          </div>

          <div class="pause-section-title" style="margin-top:10px">
            <span>CAR DISASSEMBLY & VISUAL MODES</span>
          </div>
          <div class="pause-grid">
            <button type="button" class="pause-card-btn" id="pause-toggle-cutaway">
              <span class="card-icon">🔬</span>
              <b>X-Ray (Cutaway)</b>
              <span>Translucent aerodynamic surfaces</span>
            </button>
            <button type="button" class="pause-card-btn" id="pause-toggle-explode">
              <span class="card-icon">💥</span>
              <b>Exploded View</b>
              <span>Separate major mechanical assemblies</span>
            </button>
            <button type="button" class="pause-card-btn" id="pause-toggle-wireframe">
              <span class="card-icon">🕸️</span>
              <b>Wireframe Mesh</b>
              <span>Show CAD polygonal topology</span>
            </button>
            <button type="button" class="pause-card-btn" id="pause-toggle-tour">
              <span class="card-icon">🚁</span>
              <b>Cinematic Tour</b>
              <span>360° drone flyaround camera</span>
            </button>
            <button type="button" class="pause-card-btn" id="pause-toggle-autorotate">
              <span class="card-icon">🔄</span>
              <b>Auto-Rotate Orbit</b>
              <span>Smooth automatic camera rotation</span>
            </button>
          </div>
        </div>

        <!-- Pane 3: Screens & Engineering Hub -->
        <div id="pane-screens" class="pause-pane">
          <div class="pause-section-title">
            <span>INTERACTIVE GARAGE SCREENS & TOOLS</span>
            <small>High-fidelity telemetry & technical data</small>
          </div>
          <div class="pause-grid">
            <button type="button" class="pause-card-btn" id="pause-screen-wheel">
              <span class="card-icon">🕹️</span>
              <b>Steering Wheel Tool</b>
              <span>PCU-8D functions, dials & LCD pages</span>
            </button>
            <button type="button" class="pause-card-btn" id="pause-screen-standings">
              <span class="card-icon">📊</span>
              <b>2026 Standings & Stats</b>
              <span>Drivers & Constructors season schedule</span>
            </button>
            <button type="button" class="pause-card-btn" id="pause-screen-weather">
              <span class="card-icon">🌦️</span>
              <b>Weather Radar & Controls</b>
              <span>Doppler precipitation & environmental sliders</span>
            </button>
            <button type="button" class="pause-card-btn" id="pause-screen-sredesigns">
              <span class="card-icon">🌐</span>
              <b>SREdesigns.com</b>
              <span>Official design studio & CAD showcase</span>
            </button>
            <button type="button" class="pause-card-btn" id="pause-screen-regs">
              <span class="card-icon">📋</span>
              <b>Technical Regulations</b>
              <span>FIA check sheet from the engineers' desk</span>
            </button>
            <button type="button" class="pause-card-btn" id="pause-screen-credits">
              <span class="card-icon">🏆</span>
              <b>Project Credits</b>
              <span>Acknowledgements, creator & 3D attributions</span>
            </button>
            <button type="button" class="pause-card-btn" id="pause-screen-perch">
              <span class="card-icon">🪑</span>
              <b>Pit Wall Stand (Perch)</b>
              <span>Inspect team principal command gantry</span>
            </button>
            <button type="button" class="pause-card-btn" id="pause-screen-toolchest">
              <span class="card-icon">🧰</span>
              <b>Tool Chest & Drawers</b>
              <span>Open 5 sliding drawers with shadow foam</span>
            </button>
          </div>
        </div>

        <!-- Pane 4: Livery & Settings -->
        <div id="pane-settings" class="pause-pane">
          <div class="pause-section-title">
            <span>FORMULA 1 TEAM LIVERY</span>
            <small>Instant team colorway switch</small>
          </div>
          <div class="pause-team-grid">
            <button type="button" class="pause-team-btn" data-team="ferrari"><span class="pause-team-dot" style="background:#e10600"></span>Ferrari</button>
            <button type="button" class="pause-team-btn" data-team="mclaren"><span class="pause-team-dot" style="background:#ff8000"></span>McLaren</button>
            <button type="button" class="pause-team-btn" data-team="red-bull"><span class="pause-team-dot" style="background:#3671c6"></span>Red Bull</button>
            <button type="button" class="pause-team-btn" data-team="mercedes"><span class="pause-team-dot" style="background:#27f4d2"></span>Mercedes</button>
            <button type="button" class="pause-team-btn" data-team="aston-martin"><span class="pause-team-dot" style="background:#229971"></span>Aston Martin</button>
            <button type="button" class="pause-team-btn" data-team="williams"><span class="pause-team-dot" style="background:#64c4ff"></span>Williams</button>
            <button type="button" class="pause-team-btn" data-team="alpine"><span class="pause-team-dot" style="background:#ff87bc"></span>Alpine</button>
            <button type="button" class="pause-team-btn" data-team="audi"><span class="pause-team-dot" style="background:#00e701"></span>Audi F1</button>
            <button type="button" class="pause-team-btn" data-team="racing-bulls"><span class="pause-team-dot" style="background:#6692ff"></span>Racing Bulls</button>
            <button type="button" class="pause-team-btn" data-team="haas"><span class="pause-team-dot" style="background:#b6babd"></span>Haas</button>
            <button type="button" class="pause-team-btn" data-team="cadillac"><span class="pause-team-dot" style="background:#ffffff"></span>Cadillac</button>
          </div>

          <div class="pause-section-title" style="margin-top:10px">
            <span>ATMOSPHERE & LIGHTING MOOD</span>
          </div>
          <div class="pause-grid">
            <button type="button" class="pause-card-btn" data-mood="grandprix">
              <span class="card-icon">☀️</span>
              <b>Grand Prix (Day)</b>
              <span>Bright midday natural sunlight</span>
            </button>
            <button type="button" class="pause-card-btn" data-mood="sunset">
              <span class="card-icon">🌅</span>
              <b>Golden Hour (Sunset)</b>
              <span>Warm amber dusk & long shadows</span>
            </button>
            <button type="button" class="pause-card-btn" data-mood="night">
              <span class="card-icon">🌙</span>
              <b>Night Race</b>
              <span>High-intensity track floodlights</span>
            </button>
            <button type="button" class="pause-card-btn" data-mood="studio">
              <span class="card-icon">💡</span>
              <b>Studio Focus</b>
              <span>Precision studio CAD inspection lighting</span>
            </button>
          </div>

          <div class="pause-section-title" style="margin-top:10px">
            <span>AUDIO & GRAPHICS QUALITY</span>
          </div>
          <div class="pause-grid">
            <button type="button" class="pause-card-btn" id="pause-toggle-sound">
              <span class="card-icon">🔊</span>
              <b>Engine Sound: <span id="pause-sound-status">Off</span></b>
              <span>Authentic V6 Turbo hybrid audio</span>
            </button>
            <button type="button" class="pause-card-btn" id="pause-toggle-quality">
              <span class="card-icon">⚡</span>
              <b>Graphics: <span id="pause-quality-status">High</span></b>
              <span>Shadow maps & physical reflections</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="pause-footer">
        <span>Press <kbd>P</kbd> or <kbd>Esc</kbd> to toggle menu anytime · 3D orbit remains active while paused</span>
        <button type="button" class="pause-resume-btn" id="pause-resume-bottom-btn">▶ RESUME SIMULATION</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  // ---------------------------------------------------------------- State & Actions
  let isPaused = false;

  function openPauseMenu() {
    isPaused = true;
    modal.classList.add('on');
    if (window.setSimulationPaused) {
      window.setSimulationPaused(true);
    }
    syncMenuState();
  }

  function closePauseMenu() {
    isPaused = false;
    modal.classList.remove('on');
    if (window.setSimulationPaused) {
      window.setSimulationPaused(false);
    }
  }

  function togglePauseMenu() {
    if (modal.classList.contains('on')) {
      closePauseMenu();
    } else {
      openPauseMenu();
    }
  }

  function syncMenuState() {
    const isGarage = !!window.garageInspect?.active;
    const txt = $('pause-garage-text');
    if (txt) txt.textContent = isGarage ? 'Exit Team Garage' : 'Enter Team Garage';

    const btnGarage = $('pause-toggle-garage');
    if (btnGarage) btnGarage.classList.toggle('active', isGarage);

    // Autopilot & Drive status
    const isAuto = !!window.trackMode?.mode?.autopilot;
    const btnAuto = $('pause-btn-autopilot');
    if (btnAuto) {
      btnAuto.classList.toggle('active', isAuto);
      const t = $('pause-auto-text');
      if (t) t.textContent = isAuto ? 'Autopilot Lap: ACTIVE' : 'Autopilot Lap: OFF';
    }

    const isPit = !!window.trackMode?.mode?.pitReq;
    const btnPit = $('pause-btn-autopit');
    if (btnPit) {
      btnPit.classList.toggle('active', isPit);
      const t = $('pause-pit-text');
      if (t) t.textContent = isPit ? 'Autopilot Pit: ACTIVE' : 'Autopilot Pit Stop';
    }

    const isDriving = !!window.trackMode?.mode?.driving;
    const btnDrive = $('pause-btn-drive');
    if (btnDrive) {
      btnDrive.classList.toggle('active', isDriving);
      const t = $('pause-drive-text');
      if (t) t.textContent = isDriving ? 'Drive Mode: ACTIVE' : 'Drive: OFF';
    }

    // Session modes
    const curSession = window.__sessionEngine__?.state?.key || '';
    $('pause-mode-solo')?.classList.toggle('active', curSession === '');
    $('pause-mode-fp1')?.classList.toggle('active', curSession === 'FP1');
    $('pause-mode-fp2')?.classList.toggle('active', curSession === 'FP2');
    $('pause-mode-fp3')?.classList.toggle('active', curSession === 'FP3');
    $('pause-mode-q')?.classList.toggle('active', curSession === 'Q');
    $('pause-mode-race')?.classList.toggle('active', curSession === 'RACE');

    // Tyre compound
    const curCompound = window.sessions?.player?.compound || window.tyreStates?.get?.().corners?.FL?.compound || 'soft';
    modal.querySelectorAll('.pause-compound-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.compound === curCompound);
    });

    // Tyre wear state
    const curWearState = window.tyreStates?.get?.().corners?.FL?.wear || 'new';
    modal.querySelectorAll('.pause-wear-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.wear === curWearState);
    });

    // HUD overlays
    const hudOn = !!window.hudOverlays?.isOn('track');
    $('pause-toggle-hud')?.classList.toggle('active', hudOn);
    const hudTxt = $('pause-hud-status');
    if (hudTxt) hudTxt.textContent = `Circuit HUD & Mini-Map: ${hudOn ? 'VISIBLE' : 'HIDDEN'}`;

    const sessOn = !!window.hudOverlays?.isOn('session');
    $('pause-toggle-session')?.classList.toggle('active', sessOn);
    const sessTxt = $('pause-sess-status');
    if (sessTxt) sessTxt.textContent = `Session & Standings: ${sessOn ? 'VISIBLE' : 'HIDDEN'}`;

    const telemOn = !!window.hudOverlays?.isOn('telem');
    $('pause-toggle-telem')?.classList.toggle('active', telemOn);
    const telemTxt = $('pause-telem-status');
    if (telemTxt) telemTxt.textContent = `Vehicle Telemetry: ${telemOn ? 'VISIBLE' : 'HIDDEN'}`;

    const timingOn = !!window.hudOverlays?.isOn('timing');
    $('pause-toggle-timing')?.classList.toggle('active', timingOn);
    const timingTxt = $('pause-timing-status');
    if (timingTxt) timingTxt.textContent = `Timing Tower: ${timingOn ? 'VISIBLE' : 'HIDDEN'}`;

    // Audio status
    const soundStatus = $('pause-sound-status');
    const isMuted = document.getElementById('btn-audio')?.textContent.includes('Off') ?? true;
    if (soundStatus) soundStatus.textContent = isMuted ? 'Off' : 'On';

    // Quality status
    const qualityStatus = $('pause-quality-status');
    const isLow = document.getElementById('btn-quality')?.textContent.includes('Low') ?? false;
    if (qualityStatus) qualityStatus.textContent = isLow ? 'Low' : 'High';

    // Active Team
    const curTeam = document.getElementById('team-select')?.value || 'red-bull';
    modal.querySelectorAll('.pause-team-btn[data-team]').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.team === curTeam);
    });
  }

  // ---------------------------------------------------------------- Event Listeners
  floatBtn.addEventListener('click', togglePauseMenu);
  $('pause-close-btn')?.addEventListener('click', closePauseMenu);
  $('pause-resume-btn')?.addEventListener('click', closePauseMenu);
  $('pause-resume-bottom-btn')?.addEventListener('click', closePauseMenu);

  modal.addEventListener('click', (e) => {
    if (e.target === modal) closePauseMenu();
  });

  // Tab Switching
  modal.querySelectorAll('.pause-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      modal.querySelectorAll('.pause-tab').forEach(t => t.classList.remove('active'));
      modal.querySelectorAll('.pause-pane').forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      const targetPane = $(tab.dataset.tab);
      if (targetPane) targetPane.classList.add('active');
    });
  });

  // ----------------------------------------------------------------
  // Pane: Race, Autopilot & Tyres Actions
  // ----------------------------------------------------------------
  $('pause-mode-solo')?.addEventListener('click', () => {
    window.sessions?.start?.('');
    closePauseMenu();
  });
  $('pause-mode-fp1')?.addEventListener('click', () => {
    window.sessions?.start?.('FP1');
    closePauseMenu();
  });
  $('pause-mode-fp2')?.addEventListener('click', () => {
    window.sessions?.start?.('FP2');
    closePauseMenu();
  });
  $('pause-mode-fp3')?.addEventListener('click', () => {
    window.sessions?.start?.('FP3');
    closePauseMenu();
  });
  $('pause-mode-q')?.addEventListener('click', () => {
    window.sessions?.start?.('Q');
    closePauseMenu();
  });
  $('pause-mode-race')?.addEventListener('click', () => {
    window.sessions?.start?.('RACE');
    closePauseMenu();
  });

  // Autopilot & Vehicle Drive
  $('pause-btn-autopilot')?.addEventListener('click', () => {
    const isAuto = !window.trackMode?.mode?.autopilot;
    window.trackMode?.setAutopilot?.(isAuto);
    syncMenuState();
  });
  $('pause-btn-autopit')?.addEventListener('click', () => {
    const isPit = !window.trackMode?.mode?.pitReq;
    window.trackMode?.requestPitStop?.(isPit);
    syncMenuState();
  });
  $('pause-btn-drive')?.addEventListener('click', () => {
    const isDrv = !window.trackMode?.mode?.driving;
    window.trackMode?.setDriving?.(isDrv);
    syncMenuState();
  });
  $('pause-btn-reset-grid')?.addEventListener('click', () => {
    window.trackMode?.setAutopilot?.(false);
    window.trackMode?.parkOnGrid?.();
    closePauseMenu();
  });

  // Tyre Compounds
  modal.querySelectorAll('.pause-compound-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const compound = btn.dataset.compound;
      if (window.sessions?.setCompound) {
        window.sessions.setCompound(compound);
      } else if (window.tyreStates?.setTyreCompound) {
        window.tyreStates.setTyreCompound('all', compound);
      }
      syncMenuState();
    });
  });

  // Tyre Wear
  modal.querySelectorAll('.pause-wear-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const wear = btn.dataset.wear;
      if (window.sessions?.setWear) {
        window.sessions.setWear(wear);
      } else if (window.tyreStates?.setTyreWear) {
        window.tyreStates.setTyreWear('all', wear);
      }
      syncMenuState();
    });
  });
  $('pause-btn-newset')?.addEventListener('click', () => {
    if (window.sessions?.newSet) {
      window.sessions.newSet();
    } else if (window.tyreStates?.setTyreWear) {
      window.tyreStates.setTyreWear('all', 'new');
    }
    syncMenuState();
  });

  // On-Screen HUD Toggles
  $('pause-toggle-hud')?.addEventListener('click', () => {
    const isNow = !window.hudOverlays?.isOn('track');
    window.hudOverlays?.set('track', isNow);
    syncMenuState();
  });
  $('pause-toggle-session')?.addEventListener('click', () => {
    const isNow = !window.hudOverlays?.isOn('session');
    window.hudOverlays?.set('session', isNow);
    syncMenuState();
  });
  $('pause-toggle-telem')?.addEventListener('click', () => {
    const isNow = !window.hudOverlays?.isOn('telem');
    window.hudOverlays?.set('telem', isNow);
    syncMenuState();
  });
  $('pause-toggle-timing')?.addEventListener('click', () => {
    const isNow = !window.hudOverlays?.isOn('timing');
    window.hudOverlays?.set('timing', isNow);
    syncMenuState();
  });

  // Camera Presets
  modal.querySelectorAll('[data-cam]').forEach(btn => {
    btn.addEventListener('click', () => {
      const cam = btn.dataset.cam;
      if (window.setCameraView) window.setCameraView(cam);
      closePauseMenu();
    });
  });

  // Garage Hotspots
  $('pause-goto-garage')?.addEventListener('click', () => {
    if (!window.garageInspect?.active && window.garageInspect?.enterGarageInspect) {
      window.garageInspect.enterGarageInspect();
    } else if (window.setCameraView) {
      window.setCameraView('CAM_OVERVIEW');
    }
    closePauseMenu();
  });

  $('pause-goto-desk')?.addEventListener('click', () => {
    if (!window.garageInspect?.active && window.garageInspect?.enterGarageInspect) {
      window.garageInspect.enterGarageInspect().then(() => window.garageInspect?.zoomToDesk?.());
    } else {
      window.garageInspect?.zoomToDesk?.();
    }
    closePauseMenu();
  });

  $('pause-goto-perch')?.addEventListener('click', () => {
    if (!window.garageInspect?.active && window.garageInspect?.enterGarageInspect) {
      window.garageInspect.enterGarageInspect().then(() => window.garageInspect?.zoomToPitPerch?.());
    } else {
      window.garageInspect?.zoomToPitPerch?.();
    }
    closePauseMenu();
  });

  $('pause-goto-toolchest')?.addEventListener('click', () => {
    if (!window.garageInspect?.active && window.garageInspect?.enterGarageInspect) {
      window.garageInspect.enterGarageInspect().then(() => window.garageInspect?.zoomToToolChest?.());
    } else {
      window.garageInspect?.zoomToToolChest?.();
    }
    closePauseMenu();
  });

  $('pause-goto-setup')?.addEventListener('click', () => {
    if (!window.garageInspect?.active && window.garageInspect?.enterGarageInspect) {
      window.garageInspect.enterGarageInspect().then(() => window.garageInspect?.zoomToSetupPlatform?.());
    } else {
      window.garageInspect?.zoomToSetupPlatform?.();
    }
    closePauseMenu();
  });

  $('pause-goto-pu')?.addEventListener('click', () => {
    if (!window.garageInspect?.active && window.garageInspect?.enterGarageInspect) {
      window.garageInspect.enterGarageInspect().then(() => window.garageInspect?.zoomToPowerUnitStation?.());
    } else {
      window.garageInspect?.zoomToPowerUnitStation?.();
    }
    closePauseMenu();
  });

  $('pause-reset-view')?.addEventListener('click', () => {
    document.getElementById('btn-view-reset')?.click();
    closePauseMenu();
  });

  // Garage Mode Toggle
  $('pause-toggle-garage')?.addEventListener('click', () => {
    document.getElementById('btn-garage')?.click();
    closePauseMenu();
  });

  // Car Disassembly & Visual Modes
  $('pause-toggle-wheels')?.addEventListener('click', () => {
    document.getElementById('garage-wheels')?.click();
    syncMenuState();
  });
  $('pause-toggle-body')?.addEventListener('click', () => {
    document.getElementById('garage-body')?.click();
    syncMenuState();
  });
  $('pause-toggle-cutaway')?.addEventListener('click', () => {
    document.getElementById('btn-cutaway')?.click();
    closePauseMenu();
  });
  $('pause-toggle-explode')?.addEventListener('click', () => {
    document.getElementById('btn-explode')?.click();
    closePauseMenu();
  });
  $('pause-toggle-wireframe')?.addEventListener('click', () => {
    document.getElementById('btn-wireframe')?.click();
    closePauseMenu();
  });
  $('pause-toggle-tour')?.addEventListener('click', () => {
    document.getElementById('btn-tour')?.click();
    closePauseMenu();
  });
  $('pause-toggle-autorotate')?.addEventListener('click', () => {
    document.getElementById('btn-auto-rotate')?.click();
    closePauseMenu();
  });

  // Screens & Hub
  $('pause-screen-wheel')?.addEventListener('click', () => {
    closePauseMenu();
    window.garageInspect?.openSteeringWheelGuide?.();
  });
  $('pause-screen-standings')?.addEventListener('click', () => {
    closePauseMenu();
    window.garageInspect?.openStandings?.();
  });
  $('pause-screen-weather')?.addEventListener('click', () => {
    closePauseMenu();
    window.garageInspect?.openWeatherRadar?.();
  });
  $('pause-screen-sredesigns')?.addEventListener('click', () => {
    closePauseMenu();
    window.garageInspect?.openSREdesigns?.();
  });
  $('pause-screen-regs')?.addEventListener('click', () => {
    closePauseMenu();
    window.garageInspect?.openRegulations?.();
  });
  $('pause-screen-credits')?.addEventListener('click', () => {
    closePauseMenu();
    window.garageInspect?.openAcknowledgements?.();
  });
  $('pause-screen-perch')?.addEventListener('click', () => {
    closePauseMenu();
    window.garageInspect?.zoomToPitPerch?.();
  });
  $('pause-screen-toolchest')?.addEventListener('click', () => {
    closePauseMenu();
    window.garageInspect?.zoomToToolChest?.();
  });

  // Team Selector
  modal.querySelectorAll('.pause-team-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const team = btn.dataset.team;
      if (window.setTeam) window.setTeam(team);
      const sel = document.getElementById('team-select');
      if (sel) { sel.value = team; sel.dispatchEvent(new Event('change')); }
      syncMenuState();
    });
  });

  // Atmosphere Moods
  modal.querySelectorAll('[data-mood]').forEach(btn => {
    btn.addEventListener('click', () => {
      const mood = btn.dataset.mood;
      const select = document.getElementById('lab-light-mood');
      if (select) {
        select.value = mood;
        select.dispatchEvent(new Event('change'));
      }
      closePauseMenu();
    });
  });

  // Audio & Quality
  $('pause-toggle-sound')?.addEventListener('click', () => {
    document.getElementById('btn-audio')?.click();
    syncMenuState();
  });
  $('pause-toggle-quality')?.addEventListener('click', () => {
    document.getElementById('btn-quality')?.click();
    syncMenuState();
  });

  // Global Keyboard Shortcuts (P = Pause Menu, Esc = Toggle / Close)
  window.addEventListener('keydown', (e) => {
    const activeTag = document.activeElement?.tagName;
    if (activeTag === 'INPUT' || activeTag === 'SELECT' || activeTag === 'TEXTAREA') return;

    if (e.key === 'p' || e.key === 'P') {
      togglePauseMenu();
    } else if (e.key === 'Escape') {
      // If a garage modal or design modal is open, let that close first
      const openModal = document.querySelector('.garage-modal.on, #design-inspiration-modal:not([hidden])');
      if (openModal) return;

      if (modal.classList.contains('on')) {
        closePauseMenu();
      } else {
        openPauseMenu();
      }
    }
  });

  window.openPauseMenu = openPauseMenu;
  window.closePauseMenu = closePauseMenu;
  window.togglePauseMenu = togglePauseMenu;

  return {
    open: openPauseMenu,
    close: closePauseMenu,
    toggle: togglePauseMenu,
  };
}
