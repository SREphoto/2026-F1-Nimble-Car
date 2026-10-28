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

    this.checkServer();
  }

  onSpeech(callback) {
    this.listeners.push(callback);
  }

  notify(event) {
    this.listeners.forEach((cb) => cb(event));
  }

  async checkServer() {
    try {
      const res = await fetch(`${this.serverUrl}/api/health`, { signal: AbortSignal.timeout(1500) });
      if (res.ok) {
        const data = await res.json();
        this.serverAvailable = data.status === 'ok';
        console.info('[GeminiAudioClient] Connected to local audio server.', data);
      }
    } catch {
      this.serverAvailable = false;
      console.info('[GeminiAudioClient] Local audio server not detected; using Web Speech API fallback.');
    }
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
   * Speak a line either from precompiled pack, live TTS, or Web Speech fallback
   */
  async speak({ text, role = 'announcer', key = null }) {
    this.initAudioContext();

    // Dispatch subtitle event to HUD immediately
    this.notify({
      type: 'SPEECH_START',
      role,
      text,
      speakerTitle: role === 'engineer' ? '📻 TEAM RADIO · RACE ENGINEER' : '🎙️ F1 COMMENTARY',
    });

    if (role === 'engineer') {
      this.playRadioBeep(true);
    }

    // 1. Check precompiled pack
    if (key && this.cachedAudioPack[key]?.audioUrl) {
      const audioUrl = `${this.serverUrl}${this.cachedAudioPack[key].audioUrl}`;
      await this.playAudioUrl(audioUrl, role === 'engineer');
      return;
    }

    // 2. Query server for live TTS if available
    if (this.serverAvailable) {
      try {
        const res = await fetch(`${this.serverUrl}/api/tts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, role }),
        });
        if (res.ok) {
          const json = await res.json();
          if (json.audioUrl) {
            await this.playAudioUrl(`${this.serverUrl}${json.audioUrl}`, role === 'engineer');
            return;
          }
        }
      } catch (e) {
        console.warn('[GeminiAudioClient] Live TTS failed, falling back to Web Speech:', e.message);
      }
    }

    // 3. Fallback: Browser Web Speech API
    this.fallbackWebSpeech(text, role);
  }

  async playAudioUrl(url, applyRadioFilter = false) {
    try {
      const audio = new Audio(url);
      audio.crossOrigin = 'anonymous';

      if (applyRadioFilter && this.audioCtx && this.radioFilterNode) {
        const source = this.audioCtx.createMediaElementSource(audio);
        source.connect(this.radioFilterNode);
      }

      await audio.play();
      audio.onended = () => {
        if (applyRadioFilter) this.playRadioBeep(false);
        this.notify({ type: 'SPEECH_END' });
      };
    } catch (e) {
      console.warn('[GeminiAudioClient] Audio play failed:', e.message);
      this.notify({ type: 'SPEECH_END' });
    }
  }

  fallbackWebSpeech(text, role) {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    if (role === 'engineer') {
      utterance.pitch = 0.9;
      utterance.rate = 1.05;
    } else {
      utterance.pitch = 1.15;
      utterance.rate = 1.15;
    }

    utterance.onend = () => {
      if (role === 'engineer') this.playRadioBeep(false);
      this.notify({ type: 'SPEECH_END' });
    };

    window.speechSynthesis.speak(utterance);
  }
}
