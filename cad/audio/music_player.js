/**
 * music_player.js — Complete Formula 1 Sound System & Music Player
 * 
 * Rules:
 * - Category 1 (starting with 1): Designated events/contexts:
 *     1_Game_Start_towards_the_summit.mp3       -> Game Start / Intro
 *     1_garage_north_of_midnight.mp3            -> Pit Garage inspection mode
 *     1_formation_lap_redline_pursuit.mp3       -> Formation Lap / Starting Grid
 *     1_qualification_results_No way.mp3        -> Qualification Results / Session end
 *     1_Winners_Circle_flags_against_the_blue.mp3 -> Winner's Circle / Victory
 *     1_credits_redline_pursuit 2.mp3           -> Credits / Design modal
 * - Category 2 (starting with 2): General soundtrack:
 *     Played when just looking at the car (showroom) or during racing/driving.
 *     Automatically loops through the 12 general soundtrack tracks.
 *     Volume ducks when driving so procedural V6 engine acoustics shine.
 * - Category 3 (starting with 3): Excluded / unused.
 * 
 * SREdesigns - Samuel R Erwin III
 */

const STORAGE_KEY = 'f1-music-muted';
const STORAGE_TRACK_KEY = 'f1-music-st-idx';
const PLAYLIST_URL = 'data/music.json';
const DRIVE_GAIN = 0.18;
const FADE_MS = 800;

const state = {
  designated: {},
  soundtrack: [],
  soundtrackIndex: 0,
  currentTrack: null,
  currentContext: 'general', // 'game_start' | 'garage' | 'formation_lap' | 'qualification_results' | 'winners_circle' | 'credits' | 'general'
  previousContext: 'general',
  savedGeneralTrack: null,
  savedGeneralTime: 0,
  savedGeneralIndex: 0,
  audio: null,
  fadingAudio: null,
  muted: false,
  started: false,
  driving: false,
  ready: false,
  barEl: null,
  btnMute: null,
  badgeEl: null,
  titleEl: null,
};

function readMuted() {
  try { return localStorage.getItem(STORAGE_KEY) === '1'; } catch (_) { return false; }
}
function writeMuted(v) {
  try { localStorage.setItem(STORAGE_KEY, v ? '1' : '0'); } catch (_) { /* private mode */ }
}
function readLastTrackIndex() {
  try {
    const v = parseInt(localStorage.getItem(STORAGE_TRACK_KEY), 10);
    return Number.isFinite(v) && v >= 0 ? v : 0;
  } catch (_) { return 0; }
}
function writeLastTrackIndex(idx) {
  try { localStorage.setItem(STORAGE_TRACK_KEY, String(idx)); } catch (_) { /* private mode */ }
}

function effectiveVolume(track = state.currentTrack) {
  if (state.muted || !track) return 0;
  const base = Number(track.volume);
  const v = Number.isFinite(base) ? base : 0.5;
  return state.driving ? Math.min(v, DRIVE_GAIN) : v;
}

function fadeAudio(audio, targetVol, ms = FADE_MS, onComplete = null) {
  if (!audio) {
    if (onComplete) onComplete();
    return;
  }
  const from = audio.volume;
  const to = Math.max(0, Math.min(1, targetVol));
  if (Math.abs(from - to) < 0.01) {
    audio.volume = to;
    if (onComplete) onComplete();
    return;
  }
  const t0 = performance.now();
  function step(now) {
    const progress = Math.min(1, (now - t0) / ms);
    audio.volume = Math.min(1, Math.max(0, from + (to - from) * progress));
    if (progress < 1) {
      requestAnimationFrame(step);
    } else {
      audio.volume = to;
      if (onComplete) onComplete();
    }
  }
  requestAnimationFrame(step);
}

function safeAudioUrl(filePath) {
  return encodeURI(filePath);
}

function createAudioInstance(track) {
  const audio = new Audio(safeAudioUrl(track.file));
  audio.preload = 'auto';
  audio.volume = 0;
  audio.loop = track.loop === true;

  audio.addEventListener('ended', () => {
    // If a designated track finishes without looping, return to general soundtrack
    if (state.currentContext !== 'general') {
      returnToGeneral();
    } else {
      // General soundtrack auto-advances to next track
      nextTrack({ autoPlay: true });
    }
  });

  return audio;
}

/**
 * Crossfade from currently playing audio to a new track
 */
function playTrack(track, context = 'general', { forcePlay = false, seekTime = 0 } = {}) {
  if (!track || !track.file) return;

  const isSame = state.currentTrack?.file === track.file && state.audio && !state.audio.paused;
  state.currentTrack = track;
  state.currentContext = context;

  if (isSame) {
    updateUi();
    return;
  }

  const oldAudio = state.audio;
  const newAudio = createAudioInstance(track);
  state.audio = newAudio;

  // Decision 1A: Seek to saved position if requested
  if (seekTime > 0) {
    const applySeek = () => {
      try {
        if (Number.isFinite(newAudio.duration) && newAudio.duration > seekTime) {
          newAudio.currentTime = seekTime;
        }
      } catch (_) {}
    };
    if (newAudio.readyState >= 1) {
      applySeek();
    } else {
      newAudio.addEventListener('loadedmetadata', applySeek, { once: true });
    }
  }

  // Fade out old track
  if (oldAudio) {
    state.fadingAudio = oldAudio;
    fadeAudio(oldAudio, 0, 600, () => {
      try {
        oldAudio.pause();
        oldAudio.src = '';
      } catch (_) {}
      if (state.fadingAudio === oldAudio) state.fadingAudio = null;
    });
  }

  updateUi();

  // If already started or force requested, start playing the new track
  if (state.started || forcePlay) {
    state.started = true;
    if (!state.muted) {
      const p = newAudio.play();
      if (p && p.then) {
        p.then(() => {
          fadeAudio(newAudio, effectiveVolume(), 700);
        }).catch((err) => {
          console.warn('[f1Music] Autoplay blocked, waiting for user gesture', err);
        });
      } else {
        fadeAudio(newAudio, effectiveVolume(), 700);
      }
    }
  }
}

/**
 * Play designated context track:
 * 'game_start' | 'garage' | 'formation_lap' | 'qualification_results' | 'winners_circle' | 'credits'
 */
function playContext(contextName) {
  if (contextName === 'general') {
    returnToGeneral();
    return;
  }

  const track = state.designated[contextName];
  if (!track) {
    console.warn('[f1Music] Unknown context:', contextName);
    return;
  }

  // Decision 1A: When switching away from General Soundtrack, save current track and timestamp!
  if (state.currentContext === 'general' && state.audio && !state.audio.paused) {
    state.savedGeneralTrack = state.currentTrack;
    state.savedGeneralTime = Math.max(0, state.audio.currentTime);
    state.savedGeneralIndex = state.soundtrackIndex;
  }

  if (state.currentContext !== contextName) {
    state.previousContext = state.currentContext === 'general' ? 'general' : state.previousContext;
  }

  playTrack(track, contextName, { forcePlay: state.started });
}

/**
 * Return to general soundtrack (Category 2)
 * Decision 1A: Resumes seamlessly from saved position!
 */
function returnToGeneral({ seek = true } = {}) {
  if (state.soundtrack.length === 0) return;

  let track = null;
  let seekTime = 0;

  if (seek && state.savedGeneralTrack && state.savedGeneralTime > 0) {
    track = state.savedGeneralTrack;
    seekTime = state.savedGeneralTime;
    state.soundtrackIndex = state.savedGeneralIndex ?? state.soundtrackIndex;
  } else {
    track = state.soundtrack[state.soundtrackIndex % state.soundtrack.length];
  }

  state.currentContext = 'general';
  playTrack(track, 'general', { forcePlay: state.started, seekTime });
}

/**
 * Smoothly fade playing music to 0 (used when lining up on grid before lights)
 */
function fadeToZero(ms = 800, onComplete = null) {
  if (!state.audio) {
    if (onComplete) onComplete();
    return;
  }
  fadeAudio(state.audio, 0, ms, () => {
    if (onComplete) onComplete();
  });
}

function nextTrack({ autoPlay = true } = {}) {
  if (state.soundtrack.length === 0) return;
  state.soundtrackIndex = (state.soundtrackIndex + 1) % state.soundtrack.length;
  writeLastTrackIndex(state.soundtrackIndex);
  const track = state.soundtrack[state.soundtrackIndex];
  state.currentContext = 'general';
  playTrack(track, 'general', { forcePlay: autoPlay || state.started });
}

function prevTrack() {
  if (state.soundtrack.length === 0) return;
  state.soundtrackIndex = (state.soundtrackIndex - 1 + state.soundtrack.length) % state.soundtrack.length;
  writeLastTrackIndex(state.soundtrackIndex);
  const track = state.soundtrack[state.soundtrackIndex];
  state.currentContext = 'general';
  playTrack(track, 'general', { forcePlay: state.started });
}

function setMuted(m) {
  state.muted = !!m;
  writeMuted(state.muted);
  updateUi();

  if (!state.audio) return;
  if (state.muted) {
    fadeAudio(state.audio, 0, 300);
  } else {
    start();
    fadeAudio(state.audio, effectiveVolume(), 450);
  }
}

function setDriving(on) {
  const next = !!on;
  if (next === state.driving) return;
  state.driving = next;
  if (!state.audio || state.muted || !state.started) return;
  fadeAudio(state.audio, effectiveVolume(), next ? 600 : 900);
}

function start() {
  if (state.muted) return false;
  state.started = true;

  if (!state.audio) {
    if (state.currentContext === 'general' && state.soundtrack.length) {
      const track = state.soundtrack[state.soundtrackIndex];
      playTrack(track, 'general', { forcePlay: true });
    } else if (state.currentTrack) {
      playTrack(state.currentTrack, state.currentContext, { forcePlay: true });
    }
    return true;
  }

  if (state.audio.paused) {
    const p = state.audio.play();
    if (p && p.then) {
      p.then(() => fadeAudio(state.audio, effectiveVolume(), FADE_MS)).catch(() => {
        state.started = false;
      });
    } else {
      fadeAudio(state.audio, effectiveVolume(), FADE_MS);
    }
  } else {
    fadeAudio(state.audio, effectiveVolume(), 500);
  }
  return true;
}

async function loadPlaylist() {
  const res = await fetch(PLAYLIST_URL);
  if (!res.ok) throw new Error('music.json ' + res.status);
  const data = await res.json();

  state.designated = data.designated || {};
  state.soundtrack = Array.isArray(data.soundtrack) ? data.soundtrack : [];

  // Fallback to legacy tracks array if not partitioned
  if (!state.soundtrack.length && Array.isArray(data.tracks)) {
    data.tracks.forEach((t) => {
      if (t.category === 1 || t.context) {
        state.designated[t.context || t.id] = t;
      } else {
        state.soundtrack.push(t);
      }
    });
  }

  state.soundtrackIndex = readLastTrackIndex() % (state.soundtrack.length || 1);

  // Initial track selection:
  // If starting in intro, default to game_start; otherwise pick current soundtrack
  if (document.body.classList.contains('intro-playing') && state.designated.game_start) {
    state.currentTrack = state.designated.game_start;
    state.currentContext = 'game_start';
  } else if (state.soundtrack.length) {
    state.currentTrack = state.soundtrack[state.soundtrackIndex];
    state.currentContext = 'general';
  } else if (state.designated.game_start) {
    state.currentTrack = state.designated.game_start;
    state.currentContext = 'game_start';
  }

  if (state.currentTrack) {
    state.audio = createAudioInstance(state.currentTrack);
  }

  state.ready = true;
  updateUi();
}

// ---------------------------------------------------------------- UI & DOM
function injectStyles() {
  if (document.getElementById('f1-music-css')) return;
  const css = document.createElement('style');
  css.id = 'f1-music-css';
  css.textContent = `
#music-player-bar {
  position: absolute;
  left: 12px;
  bottom: 12px;
  z-index: 28;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px 4px 6px;
  border-radius: 999px;
  border: 1px solid #2a3545;
  background: rgba(10, 14, 20, 0.88);
  color: #c8d4e4;
  backdrop-filter: blur(8px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.45);
  transition: border-color 0.2s, box-shadow 0.2s, opacity 0.2s, transform 0.2s;
  user-select: none;
  font-family: system-ui, -apple-system, sans-serif;
  font-size: 11px;
}
#music-player-bar:hover {
  border-color: var(--team-primary, #e10600);
  box-shadow: 0 0 14px var(--team-accent-glow, rgba(225, 6, 0, 0.35));
}
#music-player-bar.is-muted {
  opacity: 0.65;
}
#btn-music-mute {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: rgba(255, 255, 255, 0.05);
  color: #cfd8e3;
  display: grid;
  place-items: center;
  cursor: pointer;
  padding: 0;
  transition: background 0.2s, color 0.2s, transform 0.15s;
}
#btn-music-mute:hover {
  background: rgba(255, 255, 255, 0.16);
  color: #fff;
  transform: scale(1.06);
}
#btn-music-mute svg {
  width: 15px;
  height: 15px;
  display: block;
}
#btn-music-mute .ico-off { display: none; }
#music-player-bar.is-muted #btn-music-mute .ico-on { display: none; }
#music-player-bar.is-muted #btn-music-mute .ico-off { display: block; }

.music-ctrl-btn {
  background: none;
  border: 0;
  color: #8fa0b5;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  display: grid;
  place-items: center;
  font-size: 11px;
  line-height: 1;
  transition: color 0.2s, background 0.2s;
}
.music-ctrl-btn:hover {
  color: #fff;
  background: rgba(255, 255, 255, 0.1);
}
.music-ctrl-btn svg {
  width: 13px;
  height: 13px;
}

#music-track-meta {
  display: flex;
  align-items: center;
  gap: 7px;
  max-width: 220px;
  padding: 0 4px;
}
#music-track-badge {
  font-size: 8.5px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  padding: 2px 6px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.09);
  color: #a0b2c6;
  font-weight: 700;
  white-space: nowrap;
}
#music-track-badge.ctx-garage { background: rgba(255, 160, 40, 0.18); color: #ffb86c; }
#music-track-badge.ctx-winner { background: rgba(50, 210, 100, 0.22); color: #5af78e; }
#music-track-badge.ctx-qual { background: rgba(0, 212, 232, 0.2); color: #00d4e8; }
#music-track-badge.ctx-grid { background: rgba(255, 80, 80, 0.22); color: #ff6e6e; }
#music-track-badge.ctx-intro { background: rgba(200, 120, 255, 0.2); color: #d094ff; }
#music-track-badge.ctx-credits { background: rgba(255, 255, 255, 0.15); color: #e6edf5; }

#music-track-title {
  font-weight: 500;
  color: #e6edf5;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 140px;
}

body.garage-mode #music-player-bar {
  bottom: 56px;
}
@media (max-width: 600px) {
  #music-track-title { max-width: 90px; }
}
`;
  document.head.appendChild(css);
}

function createPlayerBar() {
  injectStyles();
  const stage = document.querySelector('.stage') || document.body;
  if (document.getElementById('music-player-bar')) return;

  const bar = document.createElement('div');
  bar.id = 'music-player-bar';
  bar.innerHTML = `
    <button type="button" id="btn-music-mute" title="Mute/Unmute music" aria-label="Mute music">
      <svg class="ico-on" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M9 18V6l10-2v12"/><circle cx="7" cy="18" r="2.5"/><circle cx="17" cy="16" r="2.5"/>
      </svg>
      <svg class="ico-off" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M9 18V6l10-2v12"/><circle cx="7" cy="18" r="2.5"/><circle cx="17" cy="16" r="2.5"/>
        <path d="M4 4l16 16"/>
      </svg>
    </button>
    <div id="music-track-meta" title="Current track">
      <span id="music-track-badge">Soundtrack</span>
      <span id="music-track-title">Loading…</span>
    </div>
    <button type="button" class="music-ctrl-btn" id="btn-music-prev" title="Previous track (General soundtrack)" aria-label="Previous track">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polygon points="19 20 9 12 19 4 19 20"/><line x1="5" y1="19" x2="5" y2="5"/>
      </svg>
    </button>
    <button type="button" class="music-ctrl-btn" id="btn-music-next" title="Next track (General soundtrack)" aria-label="Next track">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polygon points="5 4 15 12 5 20 5 4"/><line x1="19" y1="5" x2="19" y2="19"/>
      </svg>
    </button>
  `;

  stage.appendChild(bar);
  state.barEl = bar;
  state.btnMute = bar.querySelector('#btn-music-mute');
  state.badgeEl = bar.querySelector('#music-track-badge');
  state.titleEl = bar.querySelector('#music-track-title');

  state.btnMute.addEventListener('click', (e) => {
    e.stopPropagation();
    setMuted(!state.muted);
  });

  bar.querySelector('#btn-music-prev').addEventListener('click', (e) => {
    e.stopPropagation();
    prevTrack();
  });

  bar.querySelector('#btn-music-next').addEventListener('click', (e) => {
    e.stopPropagation();
    nextTrack();
  });

  updateUi();
}

function updateUi() {
  if (!state.barEl) return;
  state.barEl.classList.toggle('is-muted', state.muted);
  state.btnMute?.setAttribute('aria-pressed', state.muted ? 'true' : 'false');
  state.btnMute?.setAttribute('title', state.muted ? 'Unmute music' : 'Mute music');

  const track = state.currentTrack;
  if (!track) return;

  if (state.titleEl) {
    state.titleEl.textContent = track.title || 'Soundtrack';
  }

  if (state.badgeEl) {
    state.badgeEl.className = '';
    let label = 'Soundtrack';
    if (state.currentContext === 'game_start') {
      label = 'Intro';
      state.badgeEl.classList.add('ctx-intro');
    } else if (state.currentContext === 'garage') {
      label = 'Garage';
      state.badgeEl.classList.add('ctx-garage');
    } else if (state.currentContext === 'formation_lap') {
      label = 'Grid';
      state.badgeEl.classList.add('ctx-grid');
    } else if (state.currentContext === 'winners_circle') {
      label = 'Winner';
      state.badgeEl.classList.add('ctx-winner');
    } else if (state.currentContext === 'qualification_results') {
      label = 'Qualifying';
      state.badgeEl.classList.add('ctx-qual');
    } else if (state.currentContext === 'credits') {
      label = 'Credits';
      state.badgeEl.classList.add('ctx-credits');
    }
    state.badgeEl.textContent = label;
  }
}

// ---------------------------------------------------------------- Observers for Automatic Context Switching
function initContextWatchers() {
  // Watch garage mode
  const watchGarage = () => {
    const isGarage = document.body.classList.contains('garage-mode');
    if (isGarage) {
      playContext('garage');
    } else if (state.currentContext === 'garage') {
      returnToGeneral();
    }
  };

  const bodyObserver = new MutationObserver(() => {
    watchGarage();
    // Watch intro playing
    if (document.body.classList.contains('intro-playing')) {
      if (state.currentContext !== 'game_start') playContext('game_start');
    } else if (state.currentContext === 'game_start') {
      returnToGeneral();
    }
  });
  bodyObserver.observe(document.body, { attributes: true, attributeFilter: ['class'] });

  // Watch Credits / Design modal
  const designModal = document.getElementById('design-modal');
  if (designModal) {
    const modalObserver = new MutationObserver(() => {
      const isVisible = !designModal.hasAttribute('hidden') && designModal.style.display !== 'none';
      if (isVisible) {
        playContext('credits');
      } else if (state.currentContext === 'credits') {
        returnToGeneral();
      }
    });
    modalObserver.observe(designModal, { attributes: true, attributeFilter: ['hidden', 'style', 'class'] });
  }

  // Watch driving button
  const attachDriveBtn = (btn) => {
    const obs = new MutationObserver(() => setDriving(btn.classList.contains('active')));
    obs.observe(btn, { attributes: true, attributeFilter: ['class'] });
    setDriving(btn.classList.contains('active'));
  };
  const driveBtn = document.getElementById('rbr-drive');
  if (driveBtn) {
    attachDriveBtn(driveBtn);
  } else {
    const mo = new MutationObserver(() => {
      const b = document.getElementById('rbr-drive');
      if (b) { mo.disconnect(); attachDriveBtn(b); }
    });
    mo.observe(document.body, { childList: true, subtree: true });
  }
}

async function init() {
  state.muted = readMuted();
  createPlayerBar();
  initContextWatchers();

  try {
    await loadPlaylist();
  } catch (err) {
    console.warn('[f1Music]', err);
    return;
  }

  // Arm fallback start on first user interaction if intro doesn't own it
  const armFallback = () => {
    if (window.f1Intro) return;
    const once = () => {
      start();
      window.removeEventListener('pointerdown', once, true);
      window.removeEventListener('keydown', once, true);
    };
    window.addEventListener('pointerdown', once, true);
    window.addEventListener('keydown', once, true);
  };
  setTimeout(armFallback, 400);
}

// Global API
const api = {
  start,
  setMuted,
  setDriving,
  playContext,
  returnToGeneral,
  fadeToZero,
  nextTrack,
  prevTrack,
  playTrack,
  get state() { return state; },
  get designated() { return state.designated; },
  get soundtrack() { return state.soundtrack; }
};

window.f1Music = api;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

export { start, setMuted, setDriving, playContext, returnToGeneral, fadeToZero, nextTrack, prevTrack, playTrack };
