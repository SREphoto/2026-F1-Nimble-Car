/**
 * race_start_sequence.js — Authentic Formula 1 Race Start Sequence
 * 
 * Flow:
 * 1. Lining up on the grid: Formation music fades smoothly to 0.
 * 2. Pre-lights tension: Music is SILENT. Only raw V6 engine launch revs.
 * 3. 5 Red Lights sequence: Each light turns on at 1.0s intervals with an authentic F1 beep.
 * 4. Random hold (1.0s – 2.4s): FIA random hold tension on all 5 red lights.
 * 5. LIGHTS OUT:
 *    - All 5 lights extinguish instantly.
 *    - F1 start horn / drop buzzer sounds.
 *    - British F1 Announcer calls: "It's lights out and away we go!" or "And they're off!"
 *    - Car is released onto the circuit.
 * 6. Racing starts: Music smoothly fades back in with the General Soundtrack (resuming where left off).
 * 
 * SREdesigns - Samuel R Erwin III
 */

import { sfx } from '../../sfx.js';

const BEEP_URL = 'assets/audio/announcer/f1_light_beep.mp3';
const HORN_URL = 'assets/audio/announcer/f1_lights_out_horn.mp3';
const CALLS = [
  'assets/audio/announcer/lights_out_away_we_go.mp3',
  'assets/audio/announcer/and_theyre_off.mp3',
];

class F1RaceStartSequence {
  constructor() {
    this.active = false;
    this.overlay = null;
    this.lights = [];
    this.audioPool = {};
    this.callIndex = 0;
    this.onLightsOutCallback = null;
    this.preloadAudio();
  }

  preloadAudio() {
    [BEEP_URL, HORN_URL, ...CALLS].forEach((url) => {
      const audio = new Audio(url);
      audio.preload = 'auto';
      this.audioPool[url] = audio;
    });
  }

  playClip(url, volume = 0.9) {
    try {
      const audio = new Audio(url);
      audio.volume = volume;
      const p = audio.play();
      if (p && p.catch) p.catch(() => {});
      return audio;
    } catch (_) {
      return null;
    }
  }

  injectStyles() {
    if (document.getElementById('f1-lights-css')) return;
    const css = document.createElement('style');
    css.id = 'f1-lights-css';
    css.textContent = `
#f1-start-gantry {
  position: fixed;
  top: 64px;
  left: 50%;
  transform: translateX(-50%) scale(0.9);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  z-index: 1000;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.3s ease, transform 0.3s cubic-bezier(0.18, 0.89, 0.32, 1.28);
}
#f1-start-gantry.is-visible {
  opacity: 1;
  transform: translateX(-50%) scale(1);
}
.f1-gantry-frame {
  display: flex;
  gap: 12px;
  background: rgba(12, 16, 24, 0.94);
  border: 2px solid #222b3a;
  border-radius: 12px;
  padding: 12px 18px;
  box-shadow: 0 12px 36px rgba(0, 0, 0, 0.8), 0 0 24px rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(10px);
}
.f1-light-column {
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: center;
}
.f1-light-lamp {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: #151a22;
  border: 1px solid #090c10;
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.9);
  transition: background 0.04s, box-shadow 0.04s;
}
.f1-light-column.is-on .f1-light-lamp {
  background: #ff1a1a;
  box-shadow: 0 0 16px #ff1a1a, 0 0 32px rgba(255, 30, 30, 0.75), inset 0 0 6px #ffffff;
}
#f1-start-sub {
  font-family: ui-monospace, SFMono-Regular, monospace;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.25em;
  text-transform: uppercase;
  color: #ff3b30;
  text-shadow: 0 0 10px rgba(255, 59, 48, 0.7);
  background: rgba(10, 14, 20, 0.85);
  padding: 4px 12px;
  border-radius: 999px;
  border: 1px solid rgba(255, 59, 48, 0.3);
}
#f1-start-sub.lights-out {
  color: #30d158;
  border-color: rgba(48, 209, 88, 0.4);
  text-shadow: 0 0 12px rgba(48, 209, 88, 0.8);
}
`;
    document.head.appendChild(css);
  }

  ensureGantry() {
    this.injectStyles();
    if (this.overlay) return;

    const el = document.createElement('div');
    el.id = 'f1-start-gantry';
    el.innerHTML = `
      <div class="f1-gantry-frame">
        ${[0, 1, 2, 3, 4]
          .map(
            (i) => `
          <div class="f1-light-column" data-col="${i}">
            <div class="f1-light-lamp"></div>
            <div class="f1-light-lamp"></div>
          </div>
        `
          )
          .join('')}
      </div>
      <div id="f1-start-sub">Standing Start</div>
    `;
    document.body.appendChild(el);
    this.overlay = el;
    this.lights = Array.from(el.querySelectorAll('.f1-light-column'));
    this.subText = el.querySelector('#f1-start-sub');
  }

  setLightCount(count) {
    this.lights.forEach((col, idx) => {
      col.classList.toggle('is-on', idx < count);
    });
  }

  /**
   * Run the complete authentic start sequence
   */
  start({ onLightsOut = null, onComplete = null } = {}) {
    if (this.active) return;
    this.active = true;
    this.onLightsOutCallback = onLightsOut;
    this.ensureGantry();

    const music = window.f1Music;

    // Step 1: Lining up on the grid -> Fade music smoothly to zero
    if (music?.fadeToZero) {
      music.fadeToZero(900);
    } else if (music?.state?.audio) {
      music.state.audio.volume = 0;
    }

    // Prepare Gantry UI
    this.setLightCount(0);
    if (this.subText) {
      this.subText.textContent = 'FORMATION GRID · STANDING START';
      this.subText.className = '';
    }
    this.overlay.classList.add('is-visible');

    // Step 2: Engine noise builds on the grid (launch RPM holding on limiter)
    try {
      if (sfx.isMuted()) sfx.setMuted(false);
      sfx.update({ rpm: 10500, throttle: 0.95, brakeKgf: 120, speedKmH: 0, engineOn: true });
    } catch (_) {}

    // Step 3: Sequential 5 red lights sequence (1 light per second)
    const timers = [];
    for (let i = 1; i <= 5; i++) {
      const timer = setTimeout(() => {
        if (!this.active) return;
        this.setLightCount(i);
        this.playClip(BEEP_URL, 0.85);
        if (this.subText) {
          this.subText.textContent = `${i} ${i === 1 ? 'RED LIGHT' : 'RED LIGHTS'}`;
        }
      }, i * 1000);
      timers.push(timer);
    }

    // Step 4: Random FIA pause after 5th light (between 1.0s and 2.4s)
    const randomHoldMs = 1000 + Math.random() * 1400;
    const lightsOutTime = 5000 + randomHoldMs;

    const outTimer = setTimeout(() => {
      if (!this.active) return;

      // LIGHTS OUT!
      this.setLightCount(0);
      if (this.subText) {
        this.subText.textContent = "LIGHTS OUT! AWAY WE GO!";
        this.subText.classList.add('lights-out');
      }

      // Play F1 Lights Out horn/buzzer
      this.playClip(HORN_URL, 0.95);

      // Play British Announcer call
      const callUrl = CALLS[this.callIndex % CALLS.length];
      this.callIndex++;
      this.playClip(callUrl, 1.0);

      // Release car physics / start race
      if (typeof this.onLightsOutCallback === 'function') {
        this.onLightsOutCallback();
      }

      // Step 5: As the cars start to race, fade music back to the general soundtrack!
      setTimeout(() => {
        if (music?.returnToGeneral) {
          music.returnToGeneral({ seek: true });
        }
      }, 1600);

      // Hide Gantry after 3 seconds of racing
      setTimeout(() => {
        this.overlay?.classList.remove('is-visible');
        this.active = false;
        if (typeof onComplete === 'function') onComplete();
      }, 3200);
    }, lightsOutTime);

    timers.push(outTimer);
    this._timers = timers;
  }

  abort() {
    if (!this.active) return;
    this.active = false;
    if (this._timers) {
      this._timers.forEach((t) => clearTimeout(t));
      this._timers = [];
    }
    this.overlay?.classList.remove('is-visible');
    this.setLightCount(0);
  }
}

export const raceStartSequence = new F1RaceStartSequence();
window.f1RaceStart = raceStartSequence;
