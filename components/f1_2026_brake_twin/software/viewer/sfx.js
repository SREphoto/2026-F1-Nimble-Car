/**
 * sfx.js — Procedural Web Audio API Sound Synthesizer for 2026 F1 Brake Corner.
 * Synthesizes:
 * - Rotor centrifugal airflow & bearing rotation whine
 * - High-pitch Carbon-Carbon resonant brake squeal under cold clamping
 * - Hydraulic pressure servo hiss
 * - Mechanical caliper pad engagement detent
 * - Paoli DP6000 pneumatic wheel gun impact rattle
 */

class F1BrakeSFX {
  constructor() {
    this.ctx = null;
    this.muted = false;

    // Continuous sound nodes
    this.rotorGain = null;
    this.rotorOsc = null;
    this.rotorFilter = null;

    this.squealGain = null;
    this.squealOsc = null;
    this.squealFilter = null;
  }

  init() {
    if (this.ctx) return;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    this.ctx = new AudioContext();

    // 1. Rotor continuous drone
    this.rotorOsc = this.ctx.createOscillator();
    this.rotorOsc.type = "sawtooth";
    this.rotorFilter = this.ctx.createBiquadFilter();
    this.rotorFilter.type = "lowpass";
    this.rotorFilter.frequency.value = 400;
    this.rotorGain = this.ctx.createGain();
    this.rotorGain.gain.value = 0.0001;

    this.rotorOsc.connect(this.rotorFilter);
    this.rotorFilter.connect(this.rotorGain);
    this.rotorGain.connect(this.ctx.destination);
    this.rotorOsc.start();

    // 2. High-pitch carbon brake squeal
    this.squealOsc = this.ctx.createOscillator();
    this.squealOsc.type = "sine";
    this.squealOsc.frequency.value = 2850; // Classic 2.85 kHz carbon resonant squeal
    this.squealFilter = this.ctx.createBiquadFilter();
    this.squealFilter.type = "bandpass";
    this.squealFilter.frequency.value = 2850;
    this.squealFilter.Q.value = 18;
    this.squealGain = this.ctx.createGain();
    this.squealGain.gain.value = 0.0001;

    this.squealOsc.connect(this.squealFilter);
    this.squealFilter.connect(this.squealGain);
    this.squealGain.connect(this.ctx.destination);
    this.squealOsc.start();
  }

  ensureContext() {
    if (!this.ctx) this.init();
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  }

  updateDynamics(speedKmh, linePressureBar, discTempC) {
    if (!this.ctx || this.muted) return;

    const t = this.ctx.currentTime;

    // Rotor whine frequency scales with vehicle speed
    const rpm = (speedKmh / 3600) * (1000 / (2 * Math.PI * 0.355)) * 60;
    const targetFreq = 40 + rpm * 0.12;
    this.rotorOsc.frequency.setTargetAtTime(targetFreq, t, 0.08);

    const targetGain = Math.min(0.18, (speedKmh / 350) * 0.18);
    this.rotorGain.gain.setTargetAtTime(targetGain, t, 0.08);

    // Carbon squeal occurs when braking at cold/warm temps (< 450°C) with significant pressure
    let squealVol = 0.0001;
    if (linePressureBar > 10.0 && speedKmh > 10.0 && discTempC < 480.0) {
      const coldFactor = Math.max(0, (480 - discTempC) / 480);
      const pressFactor = Math.min(1.0, linePressureBar / 140.0);
      squealVol = coldFactor * pressFactor * 0.15;
    }
    this.squealGain.gain.setTargetAtTime(squealVol, t, 0.05);
  }

  playHydraulicClick() {
    if (!this.ctx || this.muted) return;
    this.ensureContext();
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(320, t);
    osc.frequency.exponentialRampToValueAtTime(80, t + 0.04);

    g.gain.setValueAtTime(0.12, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.045);

    osc.connect(g);
    g.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.05);
  }

  playWheelGunRattle() {
    if (!this.ctx || this.muted) return;
    this.ensureContext();

    const t0 = this.ctx.currentTime;
    for (let i = 0; i < 6; i++) {
      const pulseT = t0 + i * 0.035;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(140 + Math.random() * 40, pulseT);

      g.gain.setValueAtTime(0.25, pulseT);
      g.gain.exponentialRampToValueAtTime(0.001, pulseT + 0.025);

      osc.connect(g);
      g.connect(this.ctx.destination);
      osc.start(pulseT);
      osc.stop(pulseT + 0.03);
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.muted && this.ctx) {
      if (this.rotorGain) this.rotorGain.gain.value = 0.0001;
      if (this.squealGain) this.squealGain.gain.value = 0.0001;
    }
    return this.muted;
  }
}

export const sfx = new F1BrakeSFX();
