/**
 * cinematic_intro.js — Top Gun–style dawn opening over the pit lane.
 * Data: data/intro_sequence.json. Music: cad/audio/music_player.js.
 * Click-to-start (audio unlock), skip, replay. Remembers first play in localStorage.
 */

import * as THREE from 'three';

// The car is built Z-up (CAD frame) and tipped -90° about X to stand in the Y-up scene.
// Resetting its rotation to zero lays it on its back, half under the pavement.
const CAR_BASE_ROT = [-Math.PI / 2, 0, 0];

const SEQ_URL = 'data/intro_sequence.json';
const DEFAULT_STORAGE = 'f1-intro-seen';

const easeFns = {
  linear: (t) => t,
  easeInOut: (t) => (t < 0.5 ? 2 * t * t : 1 - ((-2 * t + 2) ** 2) / 2),
  easeOut: (t) => 1 - (1 - t) ** 3,
  easeIn: (t) => t * t * t,
};

function lerp(a, b, t) { return a + (b - a) * t; }
function lerp3(out, a, b, t) {
  out[0] = lerp(a[0], b[0], t);
  out[1] = lerp(a[1], b[1], t);
  out[2] = lerp(a[2], b[2], t);
  return out;
}
function hexColor(hex) {
  return new THREE.Color(hex);
}

const runtime = {
  seq: null,
  active: false,
  waiting: false,
  shotIndex: 0,
  shotT: 0,
  overlay: null,
  titleEl: null,
  skipEl: null,
  startEl: null,
  replayBtn: null,
  crewGroup: null,
  heatGroup: null,
  saved: null,
  _tmpPos: [0, 0, 0],
  _tmpTgt: [0, 0, 0],
  onDone: null,
  startedAt: 0,
};

function ctx() {
  return {
    scene: window.scene,
    camera: window.camera,
    controls: window.controls,
    renderer: window.renderer,
    sunLight: window.sunLight,
    ambientLight: window.ambientLight,
    frontFillLight: window.frontFillLight,
    bounceLight: window.bounceLight,
    carModel: window.carModel,
    trackMode: window.trackMode,
  };
}

function readSeen(key) {
  try { return localStorage.getItem(key) === '1'; } catch (_) { return false; }
}
function writeSeen(key) {
  try { localStorage.setItem(key, '1'); } catch (_) { /* private */ }
}

function injectCss() {
  if (document.getElementById('cinematic-intro-css')) return;
  const css = document.createElement('style');
  css.id = 'cinematic-intro-css';
  css.textContent = `
#intro-overlay{position:fixed;inset:0;z-index:9000;pointer-events:none;font-family:system-ui,-apple-system,sans-serif}
#intro-overlay.is-interactive{pointer-events:auto}
#intro-veil{position:absolute;inset:0;background:#05070c;opacity:0;transition:opacity .7s ease}
#intro-overlay.is-veiled #intro-veil{opacity:1}
#intro-start{
  position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;
  background:radial-gradient(ellipse at 50% 40%,#1a1008 0%,#05070c 70%);
  color:#f0e6d8;cursor:pointer;user-select:none;
}
#intro-start .intro-mark{font-size:.72rem;letter-spacing:.35em;text-transform:uppercase;opacity:.55;margin-bottom:14px}
#intro-start .intro-title{font-size:clamp(1.6rem,4vw,2.6rem);font-weight:700;letter-spacing:.04em;margin:0 0 8px}
#intro-start .intro-sub{font-size:.95rem;opacity:.65;margin:0 0 28px}
#intro-start .intro-cta{
  border:1px solid rgba(255,200,140,.45);background:rgba(255,140,60,.12);color:#ffe8d0;
  padding:10px 22px;border-radius:999px;font-size:.85rem;letter-spacing:.12em;text-transform:uppercase;
  transition:background .2s,border-color .2s,box-shadow .2s;
}
#intro-start:hover .intro-cta{background:rgba(255,140,60,.22);border-color:rgba(255,200,140,.75);box-shadow:0 0 24px rgba(255,120,40,.25)}
#intro-titlecard{
  position:absolute;left:50%;top:42%;transform:translate(-50%,-50%);
  text-align:center;color:#fff7ec;opacity:0;transition:opacity 1.1s ease;pointer-events:none;
  text-shadow:0 2px 28px rgba(0,0,0,.65);
}
#intro-titlecard.is-on{opacity:1}
#intro-titlecard h1{margin:0;font-size:clamp(1.5rem,3.8vw,2.4rem);font-weight:700;letter-spacing:.06em}
#intro-titlecard p{margin:10px 0 0;font-size:.85rem;letter-spacing:.28em;text-transform:uppercase;opacity:.7}
#intro-skip{
  position:absolute;right:16px;bottom:16px;color:rgba(240,230,216,.55);font-size:.72rem;
  letter-spacing:.08em;opacity:0;transition:opacity .4s;pointer-events:none;
}
#intro-overlay.is-playing #intro-skip{opacity:1}
#btn-replay-intro{
  position:absolute;left:54px;bottom:12px;z-index:28;
  width:auto;height:28px;padding:0 10px;border-radius:14px;
  border:1px solid #2a3545;background:rgba(10,14,20,.72);color:#8a9bb0;
  font-size:.68rem;letter-spacing:.04em;cursor:pointer;line-height:28px;
  transition:color .2s,border-color .2s,opacity .2s;
}
#btn-replay-intro:hover{color:#e8eef8;border-color:var(--team-primary,#e10600)}
body.garage-mode #btn-replay-intro{bottom:56px}
body.intro-playing .view-toolbar,
body.intro-playing #sess-panel,
body.intro-playing #garage-views,
body.intro-playing #wx-panel,
body.intro-playing .stage-hint,
body.intro-playing #rbr-hud,
body.intro-playing .topbar,
body.intro-playing #panel-instrument,
body.intro-playing .instrument,
body.intro-playing #viewport-status{opacity:0!important;pointer-events:none!important;visibility:hidden!important}
body.intro-playing #btn-music-mute,
body.intro-playing #btn-replay-intro{opacity:.85;visibility:visible}
body.intro-playing .workspace{grid-template-columns:1fr!important}
`;
  document.head.appendChild(css);
}

function buildOverlay(seq) {
  injectCss();
  const root = document.createElement('div');
  root.id = 'intro-overlay';
  root.innerHTML = `
    <div id="intro-veil"></div>
    <div id="intro-start" role="button" tabindex="0" aria-label="Click to start">
      <div class="intro-mark">SREdesigns</div>
      <h1 class="intro-title"></h1>
      <p class="intro-sub"></p>
      <div class="intro-cta">Click to start</div>
    </div>
    <div id="intro-titlecard"><h1></h1><p></p></div>
    <div id="intro-skip"></div>
  `;
  document.body.appendChild(root);
  runtime.overlay = root;
  runtime.startEl = root.querySelector('#intro-start');
  runtime.titleEl = root.querySelector('#intro-titlecard');
  runtime.skipEl = root.querySelector('#intro-skip');
  runtime.startEl.querySelector('.intro-title').textContent = seq.title || '2026 F1 Nimble Car';
  runtime.startEl.querySelector('.intro-sub').textContent = seq.subtitle || '';
  runtime.skipEl.textContent = seq.skipHint || 'Press any key or click to skip';
  runtime.titleEl.querySelector('h1').textContent = seq.title || '2026 F1 Nimble Car';
  runtime.titleEl.querySelector('p').textContent = seq.subtitle || 'SREdesigns';
}

function buildReplayButton() {
  const stage = document.querySelector('.stage');
  if (!stage || document.getElementById('btn-replay-intro')) return;
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.id = 'btn-replay-intro';
  btn.title = 'Replay opening intro';
  btn.textContent = 'Replay intro';
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    playIntro({ force: true });
  });
  stage.appendChild(btn);
  runtime.replayBtn = btn;
}

function makeSilhouette(x, z, scale = 1) {
  const g = new THREE.Group();
  const mat = new THREE.MeshBasicMaterial({ color: 0x050505 });
  let body;
  if (THREE.CapsuleGeometry) {
    body = new THREE.Mesh(new THREE.CapsuleGeometry(0.45 * scale, 2.2 * scale, 4, 6), mat);
    body.position.y = 1.8 * scale;
  } else {
    body = new THREE.Mesh(new THREE.CylinderGeometry(0.45 * scale, 0.5 * scale, 2.6 * scale, 8), mat);
    body.position.y = 1.5 * scale;
  }
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.42 * scale, 8, 8), mat);
  head.position.y = 3.35 * scale;
  g.add(body, head);
  g.position.set(x, 0, z);
  return g;
}

function ensureCrew(scene) {
  if (runtime.crewGroup) return runtime.crewGroup;
  const g = new THREE.Group();
  g.name = 'Intro_CrewSilhouettes';
  const spots = [
    [-40, 148], [-28, 152], [-10, 150], [8, 154], [22, 149],
    [40, 151], [55, 147], [-55, 145], [70, 153], [-15, 142],
  ];
  spots.forEach(([x, z], i) => g.add(makeSilhouette(x, z, 0.85 + (i % 3) * 0.08)));
  g.visible = false;
  scene.add(g);
  runtime.crewGroup = g;
  return g;
}

function ensureHeat(scene) {
  if (runtime.heatGroup) return runtime.heatGroup;
  const g = new THREE.Group();
  g.name = 'Intro_HeatShimmer';
  const mat = new THREE.MeshBasicMaterial({
    color: 0xffaa66, transparent: true, opacity: 0.07, blending: THREE.AdditiveBlending, depthWrite: false,
  });
  for (let i = 0; i < 10; i++) {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 2.4), mat.clone());
    p.position.set((Math.random() - 0.5) * 3, 1 + Math.random() * 2, (Math.random() - 0.5) * 2);
    p.userData.phase = Math.random() * Math.PI * 2;
    p.userData.speed = 0.6 + Math.random() * 0.8;
    g.add(p);
  }
  g.visible = false;
  scene.add(g);
  runtime.heatGroup = g;
  return g;
}

function applyLighting(name) {
  const { scene, sunLight, ambientLight, frontFillLight, bounceLight, renderer } = ctx();
  const presets = runtime.seq?.lightingPresets || {};
  const L = presets[name] || presets.dawn;
  if (!L || !scene) return;
  scene.background = hexColor(L.background);
  if (scene.fog) {
    scene.fog.color = hexColor(L.fog);
    if ('density' in scene.fog && L.fogDensity != null) scene.fog.density = L.fogDensity;
  }
  if (sunLight) {
    sunLight.color = hexColor(L.sunColor);
    sunLight.intensity = L.sunIntensity;
    if (L.sunPosition) sunLight.position.set(...L.sunPosition);
  }
  if (ambientLight) {
    ambientLight.color = hexColor(L.ambientColor);
    ambientLight.intensity = L.ambientIntensity;
  }
  if (frontFillLight && L.fillIntensity != null) frontFillLight.intensity = L.fillIntensity;
  if (bounceLight && L.bounceIntensity != null) bounceLight.intensity = L.bounceIntensity;
  if (renderer && L.exposure != null) renderer.toneMappingExposure = L.exposure;
}

function snapshotScene() {
  const { scene, sunLight, ambientLight, frontFillLight, bounceLight, renderer, controls, camera, carModel, trackMode } = ctx();
  runtime.saved = {
    bg: scene.background?.getHex?.() ?? 0x3a5676,
    fog: scene.fog?.color?.getHex?.() ?? 0x3a5676,
    fogDensity: scene.fog && 'density' in scene.fog ? scene.fog.density : 0.0015,
    sunColor: sunLight?.color?.getHex?.() ?? 0xfff5ea,
    sunInt: sunLight?.intensity ?? 2.2,
    sunPos: sunLight ? sunLight.position.toArray() : [60, 140, 50],
    ambColor: ambientLight?.color?.getHex?.() ?? 0xddeeff,
    ambInt: ambientLight?.intensity ?? 0.75,
    fillInt: frontFillLight?.intensity ?? 1.4,
    bounceInt: bounceLight?.intensity ?? 0.9,
    exposure: renderer?.toneMappingExposure ?? 1.2,
    camPos: camera.position.toArray(),
    target: controls.target.toArray(),
    controlsEnabled: controls.enabled,
    autoRotate: controls.autoRotate,
    carPos: carModel ? carModel.position.toArray() : [0, 0, 0],
    carRot: carModel ? [carModel.rotation.x, carModel.rotation.y, carModel.rotation.z] : CAR_BASE_ROT,
    circuit: !!trackMode?.mode?.circuit,
  };
}

function restoreScene() {
  const S = runtime.saved;
  if (!S) return;
  const { scene, sunLight, ambientLight, frontFillLight, bounceLight, renderer, controls, camera, carModel, trackMode } = ctx();
  scene.background?.setHex?.(S.bg);
  if (scene.fog) {
    scene.fog.color?.setHex?.(S.fog);
    if ('density' in scene.fog) scene.fog.density = S.fogDensity;
  }
  if (sunLight) {
    sunLight.color.setHex(S.sunColor);
    sunLight.intensity = S.sunInt;
    sunLight.position.set(...S.sunPos);
  }
  if (ambientLight) {
    ambientLight.color.setHex(S.ambColor);
    ambientLight.intensity = S.ambInt;
  }
  if (frontFillLight) frontFillLight.intensity = S.fillInt;
  if (bounceLight) bounceLight.intensity = S.bounceInt;
  if (renderer) renderer.toneMappingExposure = S.exposure;
  camera.position.set(...S.camPos);
  controls.target.set(...S.target);
  controls.enabled = S.controlsEnabled;
  controls.autoRotate = S.autoRotate;
  controls.update();
  if (carModel) {
    carModel.position.set(...S.carPos);
    carModel.rotation.set(...(S.carRot || CAR_BASE_ROT));
  }
  if (trackMode && typeof trackMode.applyCircuit === 'function' && S.circuit && !trackMode.mode.circuit) {
    trackMode.applyCircuit(true);
  }
  if (typeof window.setCameraView === 'function') window.setCameraView('CAM_ISO');
}

function setClassicForIntro() {
  const { trackMode } = ctx();
  if (trackMode?.mode?.circuit && typeof trackMode.applyCircuit === 'function') {
    trackMode.applyCircuit(false);
  }
}

function showTitle(on) {
  runtime.titleEl?.classList.toggle('is-on', !!on);
}

function beginPlayback() {
  const { controls, scene, carModel } = ctx();
  snapshotScene();
  setClassicForIntro();
  runtime.active = true;
  runtime.waiting = false;
  runtime.shotIndex = 0;
  runtime.shotT = 0;
  runtime.startedAt = performance.now();
  document.body.classList.add('intro-playing');
  runtime.overlay?.classList.add('is-playing');
  runtime.overlay?.classList.remove('is-interactive', 'is-veiled');
  if (runtime.startEl) runtime.startEl.style.display = 'none';
  if (controls) {
    controls.enabled = false;
    controls.autoRotate = false;
  }
  ensureCrew(scene);
  ensureHeat(scene);
  const first = runtime.seq.shots[0];
  if (first) applyLighting(first.lighting || 'dawn');
  if (carModel) {
    carModel.position.set(0, 0, 0);
    carModel.rotation.set(...CAR_BASE_ROT);
  }
  if (window.f1Music?.playContext) {
    window.f1Music.playContext('game_start');
  } else {
    window.f1Music?.start?.();
  }
}

function endIntro({ skipped = false } = {}) {
  if (!runtime.active && !runtime.waiting) return;
  runtime.active = false;
  runtime.waiting = false;
  document.body.classList.remove('intro-playing');
  runtime.overlay?.classList.remove('is-playing', 'is-interactive', 'is-veiled');
  if (runtime.startEl) runtime.startEl.style.display = 'none';
  showTitle(false);
  if (runtime.crewGroup) runtime.crewGroup.visible = false;
  if (runtime.heatGroup) runtime.heatGroup.visible = false;
  const key = runtime.seq?.storageKey || DEFAULT_STORAGE;
  writeSeen(key);
  restoreScene();
  window.f1Music?.setDriving?.(false);
  window.f1Music?.returnToGeneral?.();
  if (typeof runtime.onDone === 'function') runtime.onDone({ skipped });
}

function skipIntro() {
  if (!runtime.active) return;
  endIntro({ skipped: true });
}

function updateShot(shot, u, dt) {
  const { camera, controls, carModel } = ctx();
  if (!shot || !camera) return;
  const ease = easeFns[shot.easing] || easeFns.easeInOut;
  const t = ease(Math.min(1, Math.max(0, u)));
  lerp3(runtime._tmpPos, shot.from.pos, shot.to.pos, t);
  lerp3(runtime._tmpTgt, shot.from.target, shot.to.target, t);
  camera.position.set(...runtime._tmpPos);
  controls.target.set(...runtime._tmpTgt);
  camera.lookAt(controls.target);

  if (runtime.crewGroup) runtime.crewGroup.visible = !!shot.showCrew;
  if (runtime.heatGroup) {
    runtime.heatGroup.visible = !!shot.heatShimmer;
    if (shot.heatShimmer && carModel) {
      runtime.heatGroup.position.set(carModel.position.x + 38, 2.5, carModel.position.z);
      runtime.heatGroup.children.forEach((p) => {
        p.userData.phase += dt * p.userData.speed;
        p.position.y = 1 + (Math.sin(p.userData.phase) * 0.5 + 0.5) * 3;
        p.material.opacity = 0.04 + Math.sin(p.userData.phase * 1.7) * 0.03;
        p.lookAt(camera.position);
      });
    }
  }

  if (shot.carRoll && carModel) {
    const x = lerp(shot.carRoll.fromX, shot.carRoll.toX, t);
    carModel.position.set(x, shot.carRoll.y || 0, shot.carRoll.z || 0);
    carModel.rotation.set(...CAR_BASE_ROT);
  } else if (shot.resetCar && carModel && u < 0.05) {
    carModel.position.set(0, 0, 0);
    carModel.rotation.set(...CAR_BASE_ROT);
  }

  if (shot.titleAt != null && u >= shot.titleAt) showTitle(true);
  if (shot.fadeUiAt != null && u >= shot.fadeUiAt) showTitle(false);
}

function tick(dt) {
  if (!runtime.active || !runtime.seq) return;
  const shots = runtime.seq.shots || [];
  if (!shots.length) { endIntro(); return; }
  const shot = shots[runtime.shotIndex];
  if (!shot) { endIntro(); return; }

  if (runtime.shotT === 0) applyLighting(shot.lighting || 'dawn');

  runtime.shotT += dt;
  const u = runtime.shotT / Math.max(0.05, shot.duration);
  updateShot(shot, Math.min(1, u), dt);

  if (u >= 1) {
    runtime.shotIndex += 1;
    runtime.shotT = 0;
    if (runtime.shotIndex >= shots.length) endIntro({ skipped: false });
  }
}

function showStartScreen() {
  runtime.waiting = true;
  runtime.overlay?.classList.add('is-interactive', 'is-veiled');
  if (runtime.startEl) runtime.startEl.style.display = '';
  document.body.classList.add('intro-playing');
}

function onStartGesture() {
  if (!runtime.waiting) return;
  beginPlayback();
}

function playIntro({ force = false } = {}) {
  if (runtime.active) return;
  if (!runtime.seq) return;
  const key = runtime.seq.storageKey || DEFAULT_STORAGE;
  if (!force && readSeen(key)) {
    showStartScreen();
    const go = () => {
      if (!runtime.waiting) return;
      runtime.waiting = false;
      runtime.overlay?.classList.remove('is-interactive', 'is-veiled');
      if (runtime.startEl) runtime.startEl.style.display = 'none';
      document.body.classList.remove('intro-playing');
      window.f1Music?.start?.();
    };
    runtime.startEl?.addEventListener('click', go, { once: true });
    window.addEventListener('keydown', go, { once: true });
    return;
  }
  showStartScreen();
  runtime.startEl?.addEventListener('click', onStartGesture, { once: true });
  window.addEventListener('keydown', onStartGesture, { once: true });
}

function armSkip() {
  const handler = (e) => {
    if (!runtime.active) return;
    if (performance.now() - runtime.startedAt < 400) return;
    if (e.type === 'keydown' || e.type === 'pointerdown') skipIntro();
  };
  window.addEventListener('keydown', handler);
  window.addEventListener('pointerdown', handler);
}

function hookAnimate() {
  let last = performance.now();
  function loop(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    tick(dt);
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
}

/** Jump to a named shot mid-way for screenshot tooling (debug). */
function debugJumpToShot(id, u = 0.45) {
  if (!runtime.seq) return false;
  if (!runtime.active) beginPlayback();
  const idx = runtime.seq.shots.findIndex((s) => s.id === id);
  if (idx < 0) return false;
  runtime.shotIndex = idx;
  runtime.shotT = Math.max(0.01, (runtime.seq.shots[idx].duration || 1) * u);
  applyLighting(runtime.seq.shots[idx].lighting || 'dawn');
  updateShot(runtime.seq.shots[idx], u, 0.016);
  return true;
}

async function init() {
  let seq;
  try {
    const res = await fetch(SEQ_URL);
    if (!res.ok) throw new Error('intro_sequence.json ' + res.status);
    seq = await res.json();
  } catch (err) {
    console.warn('[intro]', err);
    return;
  }
  runtime.seq = seq;
  buildOverlay(seq);
  buildReplayButton();
  armSkip();
  hookAnimate();
  window.f1Intro = { playIntro, skipIntro, debugJumpToShot, runtime };

  const waitReady = (n = 0) => {
    if (window.scene && window.camera && window.carModel) {
      playIntro({ force: false });
      return;
    }
    if (n > 200) {
      // scene never came up; still offer click-to-start for music
      playIntro({ force: false });
      return;
    }
    setTimeout(() => waitReady(n + 1), 80);
  };
  waitReady();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();

export { playIntro, skipIntro };
