/**
 * music_player.js — data-driven playlist music (opening track, etc.)
 * Starts on first user gesture or when cinematic intro calls start().
 * Tiny mute button; preference in localStorage. Lowers when driving.
 */
const STORAGE_KEY = 'f1-music-muted';
const PLAYLIST_URL = 'data/music.json';
const DRIVE_GAIN = 0.18;
const FADE_MS = 900;

const state = {
  tracks: [],
  audio: null,
  track: null,
  muted: false,
  started: false,
  driving: false,
  targetVol: 0.5,
  btn: null,
  ready: false,
};

function readMuted() {
  try { return localStorage.getItem(STORAGE_KEY) === '1'; } catch (_) { return false; }
}
function writeMuted(v) {
  try { localStorage.setItem(STORAGE_KEY, v ? '1' : '0'); } catch (_) { /* private mode */ }
}

function effectiveVolume() {
  if (state.muted || !state.track) return 0;
  const base = Number(state.track.volume);
  const v = Number.isFinite(base) ? base : 0.5;
  return state.driving ? Math.min(v, DRIVE_GAIN) : v;
}

function fadeTo(vol, ms = FADE_MS) {
  const a = state.audio;
  if (!a) return;
  const from = a.volume;
  const to = Math.max(0, Math.min(1, vol));
  const t0 = performance.now();
  if (Math.abs(from - to) < 0.01) { a.volume = Math.min(1, Math.max(0, to)); return; }
  function step(now) {
    const t = Math.min(1, (now - t0) / ms);
    a.volume = Math.min(1, Math.max(0, from + (to - from) * t));
    if (t < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

function syncButton() {
  if (!state.btn) return;
  state.btn.classList.toggle('is-muted', state.muted);
  state.btn.setAttribute('aria-pressed', state.muted ? 'true' : 'false');
  state.btn.title = state.muted ? 'Unmute music' : 'Mute music';
  state.btn.setAttribute('aria-label', state.muted ? 'Unmute music' : 'Mute music');
}

function setMuted(m) {
  state.muted = !!m;
  writeMuted(state.muted);
  syncButton();
  if (!state.audio) return;
  if (state.muted) fadeTo(0, 350);
  else {
    start();
    fadeTo(effectiveVolume(), 450);
  }
}

function pickOpening(tracks) {
  return tracks.find((t) => t.role === 'opening') || tracks[0] || null;
}

async function loadPlaylist() {
  const res = await fetch(PLAYLIST_URL);
  if (!res.ok) throw new Error('music.json ' + res.status);
  const data = await res.json();
  state.tracks = Array.isArray(data.tracks) ? data.tracks : [];
  state.track = pickOpening(state.tracks);
  if (!state.track?.file) throw new Error('no opening track in music.json');
  const audio = new Audio(state.track.file);
  audio.loop = state.track.loop !== false;
  audio.preload = 'auto';
  audio.volume = 0;
  state.audio = audio;
  state.targetVol = Number(state.track.volume);
  if (!Number.isFinite(state.targetVol)) state.targetVol = 0.5;
  state.ready = true;
}

function start() {
  if (!state.audio || state.muted) return false;
  if (state.started) {
    if (state.audio.paused) {
      const p = state.audio.play();
      if (p && p.catch) p.catch(() => {});
    }
    fadeTo(effectiveVolume(), 500);
    return true;
  }
  state.started = true;
  state.audio.volume = 0;
  const p = state.audio.play();
  if (p && p.catch) {
    p.then(() => fadeTo(effectiveVolume(), FADE_MS)).catch(() => {
      state.started = false;
    });
  } else {
    fadeTo(effectiveVolume(), FADE_MS);
  }
  return true;
}

function setDriving(on) {
  const next = !!on;
  if (next === state.driving) return;
  state.driving = next;
  if (!state.audio || state.muted || !state.started) return;
  fadeTo(effectiveVolume(), next ? 700 : 1100);
}

function watchDriving() {
  const attach = (btn) => {
    const obs = new MutationObserver(() => setDriving(btn.classList.contains('active')));
    obs.observe(btn, { attributes: true, attributeFilter: ['class'] });
    setDriving(btn.classList.contains('active'));
  };
  const existing = document.getElementById('rbr-drive');
  if (existing) { attach(existing); return; }
  const mo = new MutationObserver(() => {
    const b = document.getElementById('rbr-drive');
    if (b) { mo.disconnect(); attach(b); }
  });
  mo.observe(document.body, { childList: true, subtree: true });
}

function injectStyles() {
  if (document.getElementById('music-player-css')) return;
  const css = document.createElement('style');
  css.id = 'music-player-css';
  css.textContent = `
#btn-music-mute{
  position:absolute;left:12px;bottom:12px;z-index:28;
  width:34px;height:34px;padding:0;border-radius:50%;
  border:1px solid #2a3545;background:rgba(10,14,20,.82);color:#c8d4e4;
  display:grid;place-items:center;cursor:pointer;line-height:0;
  transition:background .2s,border-color .2s,box-shadow .2s,opacity .2s;
  backdrop-filter:blur(6px);
}
#btn-music-mute:hover{border-color:var(--team-primary,#e10600);box-shadow:0 0 10px var(--team-accent-glow,rgba(225,6,0,.35));color:#fff}
#btn-music-mute.is-muted{opacity:.55}
#btn-music-mute svg{width:16px;height:16px;display:block}
#btn-music-mute .ico-off{display:none}
#btn-music-mute.is-muted .ico-on{display:none}
#btn-music-mute.is-muted .ico-off{display:block}
body.garage-mode #btn-music-mute{bottom:56px}
`;
  document.head.appendChild(css);
}

function createMuteButton() {
  injectStyles();
  const stage = document.querySelector('.stage');
  if (!stage || document.getElementById('btn-music-mute')) return;
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.id = 'btn-music-mute';
  btn.innerHTML = `
    <svg class="ico-on" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M9 18V6l10-2v12"/><circle cx="7" cy="18" r="2.4"/><circle cx="17" cy="16" r="2.4"/>
    </svg>
    <svg class="ico-off" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M9 18V6l10-2v12"/><circle cx="7" cy="18" r="2.4"/><circle cx="17" cy="16" r="2.4"/>
      <path d="M4 4l16 16"/>
    </svg>`;
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    setMuted(!state.muted);
  });
  stage.appendChild(btn);
  state.btn = btn;
  syncButton();
}

async function init() {
  state.muted = readMuted();
  createMuteButton();
  watchDriving();
  try {
    await loadPlaylist();
  } catch (err) {
    console.warn('[music]', err);
    return;
  }
  // Intro owns the first gesture when present; otherwise arm a fallback start.
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

window.f1Music = { start, setMuted, setDriving, get state() { return state; } };

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

export { start, setMuted, setDriving };
