/**
 * sfx.js — Procedural Web Audio Engine
 * 2026 Formula 1 "Nimble Car" · SREdesigns - Samuel R Erwin III
 * 
 * Synthesizes authentic 1.6L turbocharged V6 sound, turbo spool,
 * pneumatic seamless gear shifts, and brake dynamics without audio files.
 */

class SoundEngine {
  constructor() {
    this.ctx = null;
    this.muted = true; // Muted by default
    this.initialized = false;

    // Audio nodes
    this.masterGain = null;
    this.engineGain = null;
    this.turboGain = null;
    this.brakeGain = null;

    // Engine oscillators
    this.oscFundamental = null;
    this.oscHarmonic1 = null;
    this.oscHarmonic2 = null;
    this.turboOsc = null;

    // Filters & Distortion
    this.engineFilter = null;
    this.turboFilter = null;

    this.prevThrottle = 0;
    this.prevGear = 'N';
  }

  init() {
    if (this.initialized) {
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      return;
    }

    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();

      // Master output
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.0, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      // --- Engine Combustion Synth ---
      this.engineGain = this.ctx.createGain();
      this.engineGain.gain.setValueAtTime(0.0, this.ctx.currentTime);

      this.engineFilter = this.ctx.createBiquadFilter();
      this.engineFilter.type = 'lowpass';
      this.engineFilter.frequency.setValueAtTime(450, this.ctx.currentTime);
      this.engineFilter.Q.setValueAtTime(2.5, this.ctx.currentTime);

      this.oscFundamental = this.ctx.createOscillator();
      this.oscFundamental.type = 'sawtooth';
      this.oscFundamental.frequency.setValueAtTime(50, this.ctx.currentTime);

      this.oscHarmonic1 = this.ctx.createOscillator();
      this.oscHarmonic1.type = 'triangle';
      this.oscHarmonic1.frequency.setValueAtTime(100, this.ctx.currentTime);

      this.oscHarmonic2 = this.ctx.createOscillator();
      this.oscHarmonic2.type = 'sawtooth';
      this.oscHarmonic2.frequency.setValueAtTime(150, this.ctx.currentTime);

      this.oscFundamental.connect(this.engineFilter);
      this.oscHarmonic1.connect(this.engineFilter);
      this.oscHarmonic2.connect(this.engineFilter);
      this.engineFilter.connect(this.engineGain);
      this.engineGain.connect(this.masterGain);

      this.oscFundamental.start();
      this.oscHarmonic1.start();
      this.oscHarmonic2.start();

      // --- Turbocharger Spool Synth ---
      this.turboGain = this.ctx.createGain();
      this.turboGain.gain.setValueAtTime(0.0, this.ctx.currentTime);

      this.turboFilter = this.ctx.createBiquadFilter();
      this.turboFilter.type = 'bandpass';
      this.turboFilter.frequency.setValueAtTime(2400, this.ctx.currentTime);
      this.turboFilter.Q.setValueAtTime(5.0, this.ctx.currentTime);

      this.turboOsc = this.ctx.createOscillator();
      this.turboOsc.type = 'sine';
      this.turboOsc.frequency.setValueAtTime(2200, this.ctx.currentTime);

      this.turboOsc.connect(this.turboFilter);
      this.turboFilter.connect(this.turboGain);
      this.turboGain.connect(this.masterGain);
      this.turboOsc.start();

      // --- Brake Friction Noise Synth ---
      this.brakeGain = this.ctx.createGain();
      this.brakeGain.gain.setValueAtTime(0.0, this.ctx.currentTime);

      const bufferSize = this.ctx.sampleRate * 2;
      const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }
      const whiteNoise = this.ctx.createBufferSource();
      whiteNoise.buffer = noiseBuffer;
      whiteNoise.loop = true;

      const brakeFilter = this.ctx.createBiquadFilter();
      brakeFilter.type = 'bandpass';
      brakeFilter.frequency.setValueAtTime(1800, this.ctx.currentTime);
      brakeFilter.Q.setValueAtTime(8.0, this.ctx.currentTime);

      whiteNoise.connect(brakeFilter);
      brakeFilter.connect(this.brakeGain);
      this.brakeGain.connect(this.masterGain);
      whiteNoise.start();

      this.initialized = true;
    } catch (e) {
      console.warn('AudioContext not supported or blocked:', e);
    }
  }

  setMuted(muted) {
    this.muted = muted;
    if (!this.initialized && !muted) {
      this.init();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    if (this.masterGain && this.ctx) {
      const targetGain = this.muted ? 0.0 : 0.35;
      this.masterGain.gain.setTargetAtTime(targetGain, this.ctx.currentTime, 0.05);
    }
  }

  isMuted() {
    return this.muted;
  }

  update({ rpm, throttle, brakeKgf, speedKmH }) {
    if (!this.initialized || !this.ctx || this.muted) return;

    const t = this.ctx.currentTime;
    const safeRpm = Math.max(800, rpm || 0);

    // V6 firing frequency: (RPM / 60) * 3 combustion pulses per revolution
    const baseFreq = (safeRpm / 60) * 3;
    this.oscFundamental.frequency.setTargetAtTime(baseFreq, t, 0.04);
    this.oscHarmonic1.frequency.setTargetAtTime(baseFreq * 2.0, t, 0.04);
    this.oscHarmonic2.frequency.setTargetAtTime(baseFreq * 3.0, t, 0.04);

    // Filter frequency opens with throttle
    const filterFreq = 300 + (safeRpm / 12500) * 1600 + (throttle || 0) * 800;
    this.engineFilter.frequency.setTargetAtTime(filterFreq, t, 0.05);

    // Engine volume scales with throttle and RPM
    const engineVol = 0.15 + (safeRpm / 12500) * 0.45 + (throttle || 0) * 0.4;
    this.engineGain.gain.setTargetAtTime(engineVol, t, 0.05);

    // Turbo whistle pitch and volume scale with throttle load
    const turboFreq = 1800 + (safeRpm / 12500) * 2200 + (throttle || 0) * 1200;
    this.turboOsc.frequency.setTargetAtTime(turboFreq, t, 0.08);
    this.turboFilter.frequency.setTargetAtTime(turboFreq, t, 0.08);
    const turboVol = (throttle || 0) * 0.25 * (safeRpm / 8000);
    this.turboGain.gain.setTargetAtTime(turboVol, t, 0.06);

    // Brake hiss when braking at speed
    const brakeIntensity = (brakeKgf / 180) * Math.min(1.0, speedKmH / 60);
    const brakeVol = Math.max(0, brakeIntensity * 0.18);
    this.brakeGain.gain.setTargetAtTime(brakeVol, t, 0.05);

    this.prevThrottle = throttle;
  }

  playShift() {
    if (!this.initialized || !this.ctx || this.muted) return;
    const t = this.ctx.currentTime;

    // Pneumatic pop sound
    const popOsc = this.ctx.createOscillator();
    const popGain = this.ctx.createGain();
    popOsc.type = 'square';
    popOsc.frequency.setValueAtTime(160, t);
    popOsc.frequency.exponentialRampToValueAtTime(40, t + 0.06);

    popGain.gain.setValueAtTime(0.5, t);
    popGain.gain.exponentialRampToValueAtTime(0.01, t + 0.06);

    popOsc.connect(popGain);
    popGain.connect(this.masterGain);
    popOsc.start(t);
    popOsc.stop(t + 0.07);
  }

  playClick() {
    if (!this.initialized || !this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const clickOsc = this.ctx.createOscillator();
    const clickGain = this.ctx.createGain();
    clickOsc.type = 'sine';
    clickOsc.frequency.setValueAtTime(950, t);
    clickOsc.frequency.exponentialRampToValueAtTime(400, t + 0.03);

    clickGain.gain.setValueAtTime(0.18, t);
    clickGain.gain.exponentialRampToValueAtTime(0.01, t + 0.03);

    clickOsc.connect(clickGain);
    clickGain.connect(this.masterGain);
    clickOsc.start(t);
    clickOsc.stop(t + 0.035);
  }

  // Names used by app.js (gear buttons / aero toggle). They were missing, which threw inside the
  // click handlers before the gear / aero state was applied.
  playShiftPop() { this.playShift(); }
  playAeroSwitch() { this.playClick(); }
}

export const soundEngine = new SoundEngine();
export const sfx = soundEngine;
