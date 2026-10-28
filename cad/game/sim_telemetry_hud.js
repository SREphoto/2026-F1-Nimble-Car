/**
 * sim_telemetry_hud.js — Sim-racer telemetry dashboard, F1 timing tower, 5 red lights gantry & radio waveform overlay.
 * 2026 Formula 1 "Nimble Car" · SREdesigns - Samuel R Erwin III
 */

export class SimTelemetryHud {
  constructor({ container = document.body } = {}) {
    this.container = container;
    this.visible = true;

    this.dom = {};
    this.radioTimer = null;

    this.initDOM();
  }

  initDOM() {
    // Container element
    const root = document.createElement('div');
    root.id = 'sim-telemetry-hud-root';
    root.innerHTML = `
      <!-- 5 Red Lights FIA Starting Gantry -->
      <div id="f1-starting-gantry" class="hidden">
        <div class="gantry-frame">
          <div class="gantry-light" id="glight-1"><div class="bulb"></div></div>
          <div class="gantry-light" id="glight-2"><div class="bulb"></div></div>
          <div class="gantry-light" id="glight-3"><div class="bulb"></div></div>
          <div class="gantry-light" id="glight-4"><div class="bulb"></div></div>
          <div class="gantry-light" id="glight-5"><div class="bulb"></div></div>
        </div>
        <div id="gantry-caption">STARTING SEQUENCE</div>
      </div>

      <!-- F1 TV Style Race Timing Tower (Left) -->
      <div id="f1-timing-tower">
        <div class="tt-header">
          <span class="tt-logo">F1</span>
          <span id="tt-session-title">GRAND PRIX</span>
          <span id="tt-lap-counter">L 1/5</span>
        </div>
        <div id="tt-rows"></div>
      </div>

      <!-- Sim-Racer Telemetry Panel (Bottom Right) -->
      <div id="sim-telemetry-panel">
        <div class="tel-head">
          <span>VEHICLE TELEMETRY</span>
          <button type="button" id="btn-toggle-tel" title="Minimize Telemetry">_</button>
        </div>
        <div class="tel-body" id="tel-body-content">
          <!-- 4-Corner Tyres & Brakes -->
          <div class="tel-car-view">
            <!-- Front Left -->
            <div class="wheel-tel fl">
              <div class="tel-label">FL</div>
              <div class="temp-val" id="tel-temp-fl">102°C</div>
              <div class="brake-val" id="tel-brake-fl">B: 420°C</div>
            </div>
            <!-- Front Right -->
            <div class="wheel-tel fr">
              <div class="tel-label">FR</div>
              <div class="temp-val" id="tel-temp-fr">104°C</div>
              <div class="brake-val" id="tel-brake-fr">B: 435°C</div>
            </div>
            <!-- Car Diagram Silhouette -->
            <div class="car-silhouette">
              <div id="tel-wing-indicator">WING: 100%</div>
              <div id="tel-drs-badge" class="drs-closed">DRS OFF</div>
            </div>
            <!-- Rear Left -->
            <div class="wheel-tel rl">
              <div class="tel-label">RL</div>
              <div class="temp-val" id="tel-temp-rl">98°C</div>
              <div class="brake-val" id="tel-brake-rl">B: 390°C</div>
            </div>
            <!-- Rear Right -->
            <div class="wheel-tel rr">
              <div class="tel-label">RR</div>
              <div class="temp-val" id="tel-temp-rr">99°C</div>
              <div class="brake-val" id="tel-brake-rr">B: 405°C</div>
            </div>
          </div>
          <!-- G-Force Ball Meter -->
          <div class="tel-gmeter">
            <div class="gmeter-cross">
              <div class="g-ball" id="g-ball-dot"></div>
            </div>
            <div class="g-readout" id="g-readout-val">0.0 G</div>
          </div>
        </div>
      </div>

      <!-- F1 Broadcast Team Radio / Commentary Overlay Banner -->
      <div id="f1-radio-overlay" class="hidden">
        <div class="radio-badge" id="radio-team-badge"></div>
        <div class="radio-content">
          <div class="radio-header">
            <span id="radio-speaker-title">📻 TEAM RADIO · RACE ENGINEER</span>
            <div class="radio-waveform">
              <span class="wave-bar"></span><span class="wave-bar"></span>
              <span class="wave-bar"></span><span class="wave-bar"></span>
              <span class="wave-bar"></span><span class="wave-bar"></span>
            </div>
          </div>
          <div class="radio-subtitles" id="radio-subtitle-text">...</div>
        </div>
      </div>
    `;

    this.container.appendChild(root);
    this.dom.root = root;
    this.dom.gantry = root.querySelector('#f1-starting-gantry');
    this.dom.gcaption = root.querySelector('#gantry-caption');
    this.dom.glamps = [
      root.querySelector('#glight-1 .bulb'),
      root.querySelector('#glight-2 .bulb'),
      root.querySelector('#glight-3 .bulb'),
      root.querySelector('#glight-4 .bulb'),
      root.querySelector('#glight-5 .bulb'),
    ];
    this.dom.ttTitle = root.querySelector('#tt-session-title');
    this.dom.ttLap = root.querySelector('#tt-lap-counter');
    this.dom.ttRows = root.querySelector('#tt-rows');
    this.dom.radio = root.querySelector('#f1-radio-overlay');
    this.dom.radioTitle = root.querySelector('#radio-speaker-title');
    this.dom.radioText = root.querySelector('#radio-subtitle-text');
    this.dom.drsBadge = root.querySelector('#tel-drs-badge');
    this.dom.wingInd = root.querySelector('#tel-wing-indicator');
    this.dom.gDot = root.querySelector('#g-ball-dot');
    this.dom.gVal = root.querySelector('#g-readout-val');

    // Tyre and Brake elements
    this.dom.tempFL = root.querySelector('#tel-temp-fl');
    this.dom.tempFR = root.querySelector('#tel-temp-fr');
    this.dom.tempRL = root.querySelector('#tel-temp-rl');
    this.dom.tempRR = root.querySelector('#tel-temp-rr');
    this.dom.brakeFL = root.querySelector('#tel-brake-fl');
    this.dom.brakeFR = root.querySelector('#tel-brake-fr');
    this.dom.brakeRL = root.querySelector('#tel-brake-rl');
    this.dom.brakeRR = root.querySelector('#tel-brake-rr');

    // Minimize toggle
    const btnToggle = root.querySelector('#btn-toggle-tel');
    const telBody = root.querySelector('#tel-body-content');
    btnToggle?.addEventListener('click', () => {
      telBody.classList.toggle('hidden');
    });

    this.injectStyles();
  }

  injectStyles() {
    const css = document.createElement('style');
    css.textContent = `
      /* 5 Red Lights Starting Gantry */
      #f1-starting-gantry {
        position: fixed;
        top: 24px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(10, 14, 20, 0.94);
        border: 2px solid #222b38;
        border-radius: 8px;
        padding: 12px 20px;
        z-index: 100;
        display: flex;
        flex-direction: column;
        align-items: center;
        box-shadow: 0 8px 32px rgba(0,0,0,0.8);
      }
      #f1-starting-gantry.hidden { display: none !important; }
      .gantry-frame { display: flex; gap: 14px; }
      .gantry-light {
        width: 32px;
        height: 64px;
        background: #11141a;
        border-radius: 6px;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 1px solid #333d4d;
      }
      .gantry-light .bulb {
        width: 22px;
        height: 22px;
        border-radius: 50%;
        background: #2b0808;
        box-shadow: inset 0 2px 4px rgba(0,0,0,0.8);
        transition: background 0.05s ease, box-shadow 0.05s ease;
      }
      .gantry-light.lit .bulb {
        background: #ff1a1a;
        box-shadow: 0 0 20px #ff2222, 0 0 40px #ff0000;
      }
      #gantry-caption {
        margin-top: 8px;
        font: 700 13px ui-monospace, monospace;
        letter-spacing: 0.12em;
        color: #e6edf5;
      }

      /* Timing Tower */
      #f1-timing-tower {
        position: fixed;
        left: 12px;
        top: 56px;
        width: 210px;
        max-height: calc(100vh - 80px);
        background: rgba(10, 14, 20, 0.88);
        border: 1px solid rgba(255,255,255,0.12);
        border-radius: 6px;
        z-index: 40;
        backdrop-filter: blur(6px);
        overflow: hidden;
        color: #fff;
        font: 11px/1.3 ui-monospace, monospace;
      }
      .tt-header {
        display: flex;
        align-items: center;
        padding: 5px 8px;
        background: #e10600;
        font-weight: 700;
      }
      .tt-logo { margin-right: 6px; font-style: italic; }
      #tt-lap-counter { margin-left: auto; color: #ffeb3b; }
      #tt-rows { overflow-y: auto; max-height: calc(100vh - 120px); }
      .tt-row {
        display: flex;
        align-items: center;
        padding: 3px 6px;
        border-bottom: 1px solid rgba(255,255,255,0.05);
      }
      .tt-row.player { background: rgba(0, 212, 232, 0.22); }
      .tt-pos { width: 18px; color: #8899aa; font-weight: 700; }
      .tt-badge { width: 4px; height: 12px; margin-right: 5px; border-radius: 2px; }
      .tt-name { width: 44px; font-weight: 700; }
      .tt-gap { margin-left: auto; color: #cfd8e3; }
      .tt-tyre {
        margin-left: 6px;
        width: 12px;
        height: 12px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font: 700 8px sans-serif;
      }
      .tt-tyre.soft { background: #e3122b; color: #fff; }
      .tt-tyre.medium { background: #f5c400; color: #000; }
      .tt-tyre.hard { background: #ffffff; color: #000; }

      /* Telemetry Panel */
      #sim-telemetry-panel {
        position: fixed;
        right: 12px;
        bottom: 16px;
        width: 280px;
        background: rgba(10, 14, 20, 0.90);
        border: 1px solid rgba(255,255,255,0.14);
        border-radius: 8px;
        padding: 8px;
        z-index: 40;
        color: #e6edf5;
        font: 11px system-ui, sans-serif;
        backdrop-filter: blur(6px);
      }
      .tel-head { display: flex; justify-content: space-between; font-weight: 700; border-bottom: 1px solid #2a3545; padding-bottom: 4px; margin-bottom: 8px; }
      #btn-toggle-tel { background: none; border: none; color: #8899aa; cursor: pointer; }
      .tel-body.hidden { display: none !important; }
      .tel-car-view {
        position: relative;
        height: 130px;
        border: 1px solid #1f2733;
        border-radius: 6px;
        background: rgba(0,0,0,0.3);
      }
      .wheel-tel {
        position: absolute;
        width: 60px;
        padding: 3px 4px;
        background: #141b26;
        border-radius: 4px;
        font-family: ui-monospace, monospace;
        font-size: 10px;
      }
      .wheel-tel.fl { top: 8px; left: 8px; }
      .wheel-tel.fr { top: 8px; right: 8px; text-align: right; }
      .wheel-tel.rl { bottom: 8px; left: 8px; }
      .wheel-tel.rr { bottom: 8px; right: 8px; text-align: right; }
      .car-silhouette {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        text-align: center;
      }
      #tel-drs-badge {
        margin-top: 4px;
        padding: 2px 6px;
        border-radius: 3px;
        font-weight: 700;
        font-size: 10px;
      }
      .drs-closed { background: #333d4d; color: #99aab8; }
      .drs-active { background: #00e676; color: #000; }
      .tel-gmeter {
        margin-top: 8px;
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      .gmeter-cross {
        position: relative;
        width: 44px;
        height: 44px;
        border: 1px solid #333d4d;
        border-radius: 50%;
        background: rgba(0,0,0,0.4);
      }
      .g-ball {
        position: absolute;
        top: 50%;
        left: 50%;
        width: 8px;
        height: 8px;
        margin: -4px 0 0 -4px;
        background: #00d4e8;
        border-radius: 50%;
        transition: transform 0.05s ease;
      }
      .g-readout { font: 700 13px ui-monospace, monospace; }

      /* F1 Radio Waveform Overlay */
      #f1-radio-overlay {
        position: fixed;
        bottom: 28px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(14, 18, 26, 0.96);
        border: 2px solid #00d4e8;
        border-radius: 8px;
        padding: 10px 18px;
        min-width: 420px;
        max-width: 650px;
        z-index: 120;
        display: flex;
        gap: 12px;
        align-items: center;
        box-shadow: 0 6px 24px rgba(0,0,0,0.8);
      }
      #f1-radio-overlay.hidden { display: none !important; }
      .radio-header { display: flex; justify-content: space-between; align-items: center; font-weight: 700; font-size: 11px; color: #00d4e8; }
      .radio-waveform { display: flex; gap: 3px; }
      .wave-bar {
        width: 3px;
        height: 12px;
        background: #00d4e8;
        border-radius: 1px;
        animation: waveAnim 0.8s infinite ease-in-out alternate;
      }
      .wave-bar:nth-child(2) { animation-delay: 0.2s; }
      .wave-bar:nth-child(3) { animation-delay: 0.4s; }
      .wave-bar:nth-child(4) { animation-delay: 0.1s; }
      .wave-bar:nth-child(5) { animation-delay: 0.5s; }
      @keyframes waveAnim {
        from { height: 4px; }
        to { height: 16px; }
      }
      .radio-subtitles {
        margin-top: 4px;
        font: 13px/1.3 system-ui, sans-serif;
        color: #ffffff;
      }
    `;
    document.head.appendChild(css);
  }

  showGantry(redCount) {
    this.dom.gantry.classList.remove('hidden');
    this.dom.glamps.forEach((lamp, idx) => {
      if (idx < redCount) {
        lamp.parentElement.classList.add('lit');
      } else {
        lamp.parentElement.classList.remove('lit');
      }
    });

    if (redCount === 5) {
      this.dom.gcaption.textContent = 'STAND BY...';
    } else {
      this.dom.gcaption.textContent = `RED LIGHTS: ${redCount}`;
    }
  }

  hideGantry() {
    if (this.dom.gantry) {
      this.dom.gantry.classList.add('hidden');
      this.dom.gantry.style.display = 'none';
    }
  }

  showRadioOverlay(speakerTitle, text) {
    this.dom.radioTitle.textContent = speakerTitle;
    this.dom.radioText.textContent = text;
    this.dom.radio.classList.remove('hidden');

    if (this.radioTimer) clearTimeout(this.radioTimer);
    this.radioTimer = setTimeout(() => {
      this.dom.radio.classList.add('hidden');
    }, 4500);
  }

  updateTimingTower(leaderboard, currentLap, totalLaps) {
    this.dom.ttLap.textContent = `L ${currentLap}/${totalLaps}`;
    const rowsHtml = leaderboard
      .slice(0, 22)
      .map((entry, idx) => {
        const isPlayer = entry.id === 'player';
        const teamColor = entry.colour || '#888';
        const tyreClass = entry.compound || 'soft';
        const gapText = idx === 0 ? 'LEADER' : entry.gap ? `+${entry.gap.toFixed(3)}` : `+${(idx * 0.72).toFixed(1)}s`;

        return `
          <div class="tt-row ${isPlayer ? 'player' : ''}">
            <span class="tt-pos">${idx + 1}</span>
            <span class="tt-badge" style="background:${teamColor};"></span>
            <span class="tt-name">${(entry.name || 'DRV').slice(0, 3).toUpperCase()}</span>
            <span class="tt-gap">${gapText}</span>
            <span class="tt-tyre ${tyreClass}">${(entry.compound || 'S')[0].toUpperCase()}</span>
          </div>
        `;
      })
      .join('');

    this.dom.ttRows.innerHTML = rowsHtml;
  }

  updateVehicleTelemetry({ car, aeroMode, tyreGrip, wingHealth }) {
    // Front wing indicator
    const wingPct = Math.round((wingHealth || 1.0) * 100);
    this.dom.wingInd.textContent = `WING: ${wingPct}%`;
    this.dom.wingInd.style.color = wingPct < 80 ? '#ff4444' : '#00e676';

    // DRS / Aero Mode
    if (aeroMode === 'X_MODE') {
      this.dom.drsBadge.className = 'drs-active';
      this.dom.drsBadge.textContent = 'DRS ACTIVE (X-MODE)';
    } else {
      this.dom.drsBadge.className = 'drs-closed';
      this.dom.drsBadge.textContent = 'DRS OFF (Z-MODE)';
    }

    // Dynamic temperature calculations based on speed & braking
    const speed = car?.v || 0;
    const baseTemp = 95 + Math.min(25, (speed / 90) * 20);
    this.dom.tempFL.textContent = `${Math.round(baseTemp + 4)}°C`;
    this.dom.tempFR.textContent = `${Math.round(baseTemp + 6)}°C`;
    this.dom.tempRL.textContent = `${Math.round(baseTemp - 2)}°C`;
    this.dom.tempRR.textContent = `${Math.round(baseTemp - 1)}°C`;

    // G-Force Meter
    const latG = (car?.aLat || 0) / 9.81;
    const longG = (car?.aLong || 0) / 9.81;
    const gMag = Math.hypot(latG, longG).toFixed(1);
    this.dom.gVal.textContent = `${gMag} G`;

    const ballX = THREE_clamp(latG * 10, -18, 18);
    const ballY = THREE_clamp(-longG * 10, -18, 18);
    this.dom.gDot.style.transform = `translate(${ballX}px, ${ballY}px)`;
  }
}

function THREE_clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}
