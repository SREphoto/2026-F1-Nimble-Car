/**
 * gemini_audio_client.js — Frontend audio client for Gemini Flash TTS, team radio filters & subtitles.
 * 2026 Formula 1 "Nimble Car" · SREdesigns - Samuel R Erwin III
 */

export class GeminiAudioClient {
  constructor({ serverUrl = 'http://localhost:3000' } = {}) {
    this.serverUrl = serverUrl;
    this.serverAvailable = false;
    this.cachedAudioPack = {};
    this.audioCtx = null;
    this.radioFilterNode = null;
    this.radioGainNode = null;
    this.listeners = [];

    // Ensure any stuck or crashing speech synthesis in the browser is canceled and disabled
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch (_) {}
    }
  }

  onSpeech(callback) {
    this.listeners.push(callback);
  }

  notify(event) {
    this.listeners.forEach((cb) => cb(event));
  }

  async checkServer() {
    // Speech server disabled per user preference to prevent speech audio issues
    this.serverAvailable = false;
  }

  initAudioContext() {
    if (this.audioCtx) return;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    this.audioCtx = new AudioCtx();

    // Radio bandpass filter (simulates walkie-talkie / team radio: 300Hz - 3400Hz)
    this.radioFilterNode = this.audioCtx.createBiquadFilter();
    this.radioFilterNode.type = 'bandpass';
    this.radioFilterNode.frequency.value = 1600;
    this.radioFilterNode.Q.value = 0.9;

    this.radioGainNode = this.audioCtx.createGain();
    this.radioGainNode.gain.value = 1.15;

    this.radioFilterNode.connect(this.radioGainNode);
    this.radioGainNode.connect(this.audioCtx.destination);
  }

  playRadioBeep(isStart = true) {
    if (!this.audioCtx) this.initAudioContext();
    if (!this.audioCtx) return;

    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();
    const now = this.audioCtx.currentTime;

    osc.type = 'sine';
    osc.frequency.setValueAtTime(isStart ? 1800 : 900, now);
    osc.frequency.exponentialRampToValueAtTime(isStart ? 2200 : 450, now + 0.08);

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    osc.connect(gain);
    gain.connect(this.audioCtx.destination);

    osc.start(now);
    osc.stop(now + 0.08);
  }

  /**
   * Pre-compile audio pack for a session
   */
  async precompileSessionPack(sessionType = 'race') {
    if (!this.serverAvailable) return;
    try {
      const res = await fetch(`${this.serverUrl}/api/session-audio-pack`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionType }),
      });
      if (res.ok) {
        const json = await res.json();
        this.cachedAudioPack = json.pack || {};
        console.info('[GeminiAudioClient] Loaded session audio pack:', Object.keys(this.cachedAudioPack));
      }
    } catch (e) {
      console.warn('[GeminiAudioClient] Session precompile failed:', e.message);
    }
  }

  /**
   * Display line subtitles without speech synthesis or TTS audio to prevent browser speech crashes
   */
  async speak({ text, role = 'announcer' }) {
    if (!text) return;
    this.notify({
      type: 'SPEECH_START',
      role,
      text,
      speakerTitle: role === 'engineer' ? '📻 TEAM RADIO · RACE ENGINEER' : '🎙️ F1 COMMENTARY',
    });

    const readDurationMs = Math.min(6000, Math.max(2500, text.length * 60));
    setTimeout(() => {
      this.notify({ type: 'SPEECH_END' });
    }, readDurationMs);
  }
}
