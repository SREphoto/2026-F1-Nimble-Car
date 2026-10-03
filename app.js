/**
 * 2026 Formula 1 "Nimble Car" Application
 * SREdesigns - Samuel R Erwin III
 * 
 * Three.js 3D Viewer & Real-Time Controls:
 * - 3D Scene, Orbit Controls, Studio Lighting, Datum Floor
 * - 1:1 Full Car Assembly with Kinematics
 * - Dynamic PCU-8D Canvas Steering Wheel Display
 * - Interactive UI binding (sliders, gears, aero modes, exploded view, part explorer)
 * - Multi-angle camera presets (ISO, Front, Side, Top, Exploded, Active)
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createFullCarAssembly } from './cad/full_car3d.js';
import { createTrackEnvironment } from './cad/track_environment.js';
import { soundEngine } from './sfx.js';
import { materials } from './materials.js';
import { initTrackMode } from './cad/track/track_mode.js';
import { initTyreStates } from './cad/tyre_states.js';
import { sumTravel } from './cad/track/ride_model.js';
import { applyLivery } from './cad/livery_decals.js';
import { buildWheelsTyres } from './cad/wheels_tyres.js';

// =========================================================================
// 1. APPLICATION STATE
// =========================================================================
const state = {
  engineOn: false,
  rpm: 0,
  speedKmH: 0,
  gear: 'N',
  prevGear: 'N',
  throttle: 0,        // 0 to 1
  brakeKgf: 0,        // 0 to 180
  steeringDeg: 0,     // -30 to +30 deg
  aeroMode: 'Z_MODE', // 'Z_MODE' or 'X_MODE'
  pyrofuseCut: false,
  batterySoc: 0.85,
  explodedProgress: 0.0,
  cutawayActive: false,
  wireframe: false,
  autoRotate: false,
  orbitSpeed: 1.0,
  soundMuted: true,
  tourActive: false,
  tourAngle: 0,
  labLightIntensity: 1.2
};

// =========================================================================
// 2. THREE.JS INITIALIZATION
// =========================================================================
const container = document.getElementById('viewport3d');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x3a5676); // Race day sky
scene.fog = new THREE.FogExp2(0x3a5676, 0.0015);

const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 400);
camera.position.set(-36, 18, 42); // 3/4 front view framing car on finish line

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, logarithmicDepthBuffer: true }); // log depth: full-scale circuit (km) + mm car detail
renderer.setSize(container.clientWidth, container.clientHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.20;
container.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.target.set(12, 3.2, 0); // Focus on front wing / cockpit crossing finish line

window.THREE = THREE;
window.camera = camera;
window.controls = controls;
window.scene = scene;
window.renderer = renderer;

// =========================================================================
// 3. RACE TRACK ENVIRONMENT & LIGHTING
// =========================================================================
// 3A. Formula 1 Grand Prix Finish Line Track Environment
const trackEnv = createTrackEnvironment();
scene.add(trackEnv);

// 3B. Directional Sun & Stadium Floodlights
const ambientLight = new THREE.AmbientLight(0xddeeff, 0.75);
scene.add(ambientLight);

// Primary Sunlight (High angled sun casting crisp shadows on tarmac)
const sunLight = new THREE.DirectionalLight(0xfff5ea, 2.2);
sunLight.position.set(60, 140, 50);
sunLight.castShadow = true;
sunLight.shadow.mapSize.width = 4096;
sunLight.shadow.mapSize.height = 4096;
sunLight.shadow.camera.near = 10;
sunLight.shadow.camera.far = 350;
sunLight.shadow.camera.left = -120;
sunLight.shadow.camera.right = 120;
sunLight.shadow.camera.top = 120;
sunLight.shadow.camera.bottom = -120;
sunLight.shadow.bias = -0.0003;
scene.add(sunLight);

// Front Fill Light (Illuminates nosecone, front wing, and chequered line)
const frontFillLight = new THREE.DirectionalLight(0xb0d0ff, 1.4);
frontFillLight.position.set(-80, 45, 10);
scene.add(frontFillLight);

// Pit Wall & Grandstand Bounce Light
const bounceLight = new THREE.DirectionalLight(0xffeedd, 0.9);
bounceLight.position.set(15, 25, -60);
scene.add(bounceLight);

// =========================================================================
// 4. LOAD PROCEDURAL FULL CAR ASSEMBLY
// =========================================================================
let carModel = null;
try {
  carModel = createFullCarAssembly();
  carModel.rotation.x = -Math.PI / 2; // Map automotive CAD Z-up to Three.js Y-up
  scene.add(carModel);
  // SREdesigns livery: projected decals, paint/carbon finish, env reflections
  try { buildWheelsTyres(carModel, renderer); } catch (wheelErr) { console.error('Wheel/tyre build failed:', wheelErr); }
  try { applyLivery(carModel, renderer); } catch (liveryErr) { console.error('Livery pass failed:', liveryErr); }
  const statusEl = document.getElementById('viewport-status');
  if (statusEl) statusEl.textContent = '2026 F1 Nimble Car assembled · SREdesigns - Samuel R Erwin III';
} catch (err) {
  console.error('Error assembling car model:', err);
  const statusEl = document.getElementById('viewport-status');
  if (statusEl) statusEl.textContent = 'Error: ' + err.message;
}

// =========================================================================
// 5. PCU-8D STEERING WHEEL LCD CANVAS RENDERER
// =========================================================================
const lcdCanvas = document.getElementById('lcd');
const lcdCtx = lcdCanvas.getContext('2d');

function updateLcdDisplay() {
  const w = lcdCanvas.width;
  const h = lcdCanvas.height;

  // Background
  lcdCtx.fillStyle = '#05070a';
  lcdCtx.fillRect(0, 0, w, h);

  // Top Shift Lights (15 LED indicators: Green, Red, Blue)
  const rpmRatio = Math.max(0, Math.min(1, (state.rpm - 4000) / 8000));
  const numLedsLit = Math.floor(rpmRatio * 15);
  for (let i = 0; i < 15; i++) {
    const lx = 35 + i * 29;
    const ly = 18;
    if (i < numLedsLit) {
      if (i < 5) lcdCtx.fillStyle = '#3dd68c';      // Green
      else if (i < 10) lcdCtx.fillStyle = '#f04460'; // Red
      else lcdCtx.fillStyle = '#00d4e8';             // Blue shift flash
    } else {
      lcdCtx.fillStyle = '#1a2330';
    }
    lcdCtx.beginPath();
    lcdCtx.arc(lx, ly, 8, 0, Math.PI * 2);
    lcdCtx.fill();
  }

  // Gear Display (Center Huge)
  lcdCtx.fillStyle = '#ffffff';
  lcdCtx.font = 'bold 84px monospace';
  lcdCtx.textAlign = 'center';
  lcdCtx.fillText(String(state.gear), w / 2, 135);

  // Speed (Left)
  lcdCtx.fillStyle = '#8b9bb0';
  lcdCtx.font = '14px sans-serif';
  lcdCtx.fillText('SPEED (KM/H)', 110, 85);
  lcdCtx.fillStyle = '#00d4e8';
  lcdCtx.font = 'bold 42px monospace';
  lcdCtx.fillText(Math.round(state.speedKmH).toString(), 110, 130);

  // Engine RPM (Right)
  lcdCtx.fillStyle = '#8b9bb0';
  lcdCtx.font = '14px sans-serif';
  lcdCtx.fillText('ENGINE RPM', w - 110, 85);
  lcdCtx.fillStyle = '#f0b429';
  lcdCtx.font = 'bold 42px monospace';
  lcdCtx.fillText(Math.round(state.rpm).toString(), w - 110, 130);

  // Bottom Telemetry Bar: Aero Mode, SoC, Brake Bias
  lcdCtx.fillStyle = '#141b26';
  lcdCtx.fillRect(15, 175, w - 30, 65);
  lcdCtx.strokeStyle = '#2a3545';
  lcdCtx.strokeRect(15, 175, w - 30, 65);

  // Aero Mode Tag
  lcdCtx.fillStyle = state.aeroMode === 'X_MODE' ? '#00d4e8' : '#3dd68c';
  lcdCtx.font = 'bold 18px monospace';
  lcdCtx.textAlign = 'left';
  lcdCtx.fillText(`AERO: ${state.aeroMode}`, 35, 212);

  // Battery SoC
  lcdCtx.fillStyle = '#e6edf5';
  lcdCtx.font = '16px monospace';
  lcdCtx.fillText(`BATT: ${(state.batterySoc * 100).toFixed(1)}%`, 220, 212);

  // BBW Brake Line Pressure
  const brakeBar = (state.brakeKgf / 180) * 100;
  lcdCtx.fillStyle = '#f04460';
  lcdCtx.fillText(`BBW: ${brakeBar.toFixed(0)} BAR`, 380, 212);
}

// =========================================================================
// 6. UI INTERACTION & CONTROLS BINDING
// =========================================================================

// Window Resize Helper
function handleResize() {
  if (!container || !camera || !renderer) return;
  camera.aspect = container.clientWidth / container.clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(container.clientWidth, container.clientHeight);
}

// Collapsible Panels (Individual)
document.querySelectorAll('.panel-collapse-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const targetId = `panel-${btn.dataset.collapse}`;
    const panel = document.getElementById(targetId);
    if (panel) {
      panel.classList.toggle('collapsed');
      btn.textContent = panel.classList.contains('collapsed') ? '▸' : '▾';
      setTimeout(handleResize, 260);
    }
  });
});

// Master Toggle All Panels Button (Full-Screen View)
const btnTogglePanels = document.getElementById('btn-toggle-panels');
btnTogglePanels?.addEventListener('click', () => {
  const workspace = document.querySelector('.workspace');
  if (workspace) {
    const isHidden = workspace.classList.toggle('panels-hidden');
    btnTogglePanels.classList.toggle('active', isHidden);
    btnTogglePanels.textContent = isHidden ? 'Show Panels' : 'Hide Panels';
    setTimeout(handleResize, 60);
    setTimeout(handleResize, 260);
  }
});

// Viewport Toolbar Buttons
const btnCutaway = document.getElementById('btn-cutaway');
btnCutaway?.addEventListener('click', () => {
  state.cutawayActive = !state.cutawayActive;
  btnCutaway.classList.toggle('active', state.cutawayActive);
  carModel?.setCutawayMode(state.cutawayActive);
});

const btnExplode = document.getElementById('btn-explode');
btnExplode?.addEventListener('click', () => {
  state.explodedProgress = state.explodedProgress > 0 ? 0 : 1.0;
  const slider = document.getElementById('slider-exploded');
  if (slider) slider.value = state.explodedProgress * 100;
  const valEl = document.getElementById('val-exploded');
  if (valEl) valEl.textContent = `${Math.round(state.explodedProgress * 100)}%`;
  btnExplode.classList.toggle('active', state.explodedProgress > 0);
});

const btnWireframe = document.getElementById('btn-wireframe');
btnWireframe?.addEventListener('click', () => {
  state.wireframe = !state.wireframe;
  btnWireframe.classList.toggle('active', state.wireframe);
  carModel?.setWireframeMode(state.wireframe);
});

const btnAudio = document.getElementById('btn-audio');
btnAudio?.addEventListener('click', () => {
  soundEngine.init();
  state.soundMuted = !state.soundMuted;
  soundEngine.setMuted(state.soundMuted);
  btnAudio.classList.toggle('active', !state.soundMuted);
  btnAudio.textContent = state.soundMuted ? '🔊 Sound: Off' : '🔊 Sound: On';
});

const btnTour = document.getElementById('btn-tour');
btnTour?.addEventListener('click', () => {
  state.tourActive = !state.tourActive;
  btnTour.classList.toggle('active', state.tourActive);
});

const btnAutoRotate = document.getElementById('btn-auto-rotate');
btnAutoRotate?.addEventListener('click', () => {
  state.autoRotate = !state.autoRotate;
  btnAutoRotate.classList.toggle('active', state.autoRotate);
  controls.autoRotate = state.autoRotate;
});

// Orbit, Zoom, Light Sliders
document.getElementById('orbit-speed')?.addEventListener('input', e => {
  state.orbitSpeed = parseFloat(e.target.value);
  controls.autoRotateSpeed = state.orbitSpeed * 2.0;
  document.getElementById('orbit-speed-val').textContent = `${state.orbitSpeed.toFixed(1)}×`;
});

document.getElementById('camera-zoom')?.addEventListener('input', e => {
  const zoomPct = parseFloat(e.target.value);
  document.getElementById('camera-zoom-val').textContent = `${zoomPct}%`;
  const dist = THREE.MathUtils.lerp(15, 75, 1 - zoomPct / 100);
  const dir = camera.position.clone().sub(controls.target).normalize();
  camera.position.copy(controls.target).addScaledVector(dir, dist);
});

document.getElementById('lab-light')?.addEventListener('input', e => {
  state.labLightIntensity = parseFloat(e.target.value);
  document.getElementById('lab-light-val').textContent = `${state.labLightIntensity.toFixed(1)}×`;
  sunLight.intensity = 2.2 * state.labLightIntensity;
  ambientLight.intensity = 0.75 * state.labLightIntensity;
});

document.getElementById('lab-light-mood')?.addEventListener('change', e => {
  const mood = e.target.value;
  if (mood === 'sunset') {
    scene.background.setHex(0x5a2412);
    scene.fog.color.setHex(0x5a2412);
    sunLight.color.setHex(0xff7722);
    sunLight.intensity = 2.6 * state.labLightIntensity;
    ambientLight.color.setHex(0xffbb88);
    ambientLight.intensity = 0.65 * state.labLightIntensity;
  } else if (mood === 'night') {
    scene.background.setHex(0x050812);
    scene.fog.color.setHex(0x050812);
    sunLight.color.setHex(0x88aacc);
    sunLight.intensity = 0.8 * state.labLightIntensity;
    ambientLight.color.setHex(0x223344);
    ambientLight.intensity = 0.40 * state.labLightIntensity;
  } else if (mood === 'studio') {
    scene.background.setHex(0x0a0d14);
    scene.fog.color.setHex(0x0a0d14);
    sunLight.color.setHex(0xffffff);
    sunLight.intensity = 1.8 * state.labLightIntensity;
    ambientLight.color.setHex(0xffffff);
    ambientLight.intensity = 0.55 * state.labLightIntensity;
  } else {
    // Grand Prix (Day)
    scene.background.setHex(0x3a5676);
    scene.fog.color.setHex(0x3a5676);
    sunLight.color.setHex(0xfff5ea);
    sunLight.intensity = 2.2 * state.labLightIntensity;
    ambientLight.color.setHex(0xddeeff);
    ambientLight.intensity = 0.75 * state.labLightIntensity;
  }
});

// Standardized Viewpoint Camera Presets (Finish Line Framing)
const CAMERA_PRESETS = {
  CAM_ISO: { pos: [-38, 16, 42], target: [10, 3.2, 0] },
  CAM_FRONT: { pos: [-46, 4.2, 0], target: [6, 2.8, 0] },
  CAM_SIDE: { pos: [14, 4.8, 76], target: [14, 3.2, 0] },
  CAM_TOP: { pos: [14, 88, 0.001], target: [14, 0, 0] },
  CAM_REAR: { pos: [56, 5.6, 0], target: [34, 5.2, 0] },
  CAM_STEERING: { pos: [11.2, 5.6, 0], target: [8.2, 4.2, 0] },
  CAM_COCKPIT: { pos: [13.2, 6.2, 0], target: [-8, 3.8, 0] },
  CAM_WHEEL: { pos: [0, 3.5, 14], target: [0, 3.5, 8] },
  CAM_EXPLODED: { pos: [-42, 38, 58], target: [14, 6.0, 0] },
  STATE_ACTIVE: { pos: [-32, 14, 36], target: [8, 3.2, 0] }
};

window.setCameraView = function(viewName) {
  const preset = CAMERA_PRESETS[viewName];
  if (!preset) return;

  if (viewName === 'CAM_TOP') {
    camera.up.set(0, 0, -1);
  } else {
    camera.up.set(0, 1, 0);
  }
  controls.target.set(...preset.target);
  camera.position.set(...preset.pos);
  camera.lookAt(controls.target);
  controls.update();

  if (viewName === 'CAM_EXPLODED') {
    state.explodedProgress = 1.0;
    const s = document.getElementById('slider-exploded');
    if (s) s.value = 100;
    const v = document.getElementById('val-exploded');
    if (v) v.textContent = '100%';
  } else if (viewName === 'STATE_ACTIVE') {
    state.explodedProgress = 0.0;
    const sExp = document.getElementById('slider-exploded');
    if (sExp) sExp.value = 0;
    const vExp = document.getElementById('val-exploded');
    if (vExp) vExp.textContent = '0%';

    state.engineOn = true;
    state.gear = 6;
    state.throttle = 0.85;
    state.aeroMode = 'X_MODE';

    const sThrot = document.getElementById('slider-throttle');
    if (sThrot) sThrot.value = 85;
    const vThrot = document.getElementById('val-throttle');
    if (vThrot) vThrot.textContent = '85%';

    const pill = document.getElementById('status-pill');
    if (pill) {
      pill.textContent = 'X-MODE (LOW DRAG)';
      pill.className = 'pill pill-amber';
    }
    const btnAero = document.getElementById('btn-aero-toggle');
    if (btnAero) {
      btnAero.classList.add('active');
      btnAero.textContent = 'X_MODE (AERO)';
    }
    document.querySelectorAll('.gear-btn').forEach(b => b.classList.toggle('active', b.dataset.gear === '6'));
  } else {
    state.explodedProgress = 0.0;
    const sExp = document.getElementById('slider-exploded');
    if (sExp) sExp.value = 0;
    const vExp = document.getElementById('val-exploded');
    if (vExp) vExp.textContent = '0%';
  }

  // Articulate and force synchronous WebGL render
  if (carModel && carModel.updateKinematics) {
    carModel.updateKinematics({
      rpm: state.rpm,
      speedKmH: state.speedKmH,
      steeringAngle: THREE.MathUtils.degToRad(state.steeringDeg),
      aeroMode: state.aeroMode,
      gear: state.gear,
      brakeKgf: state.brakeKgf,
      explodedProgress: state.explodedProgress,
      suspensionTravel: sumTravel(tyreStates?.suspensionTravel, trackMode?.suspensionTravel)
    });
  }
  updateLcdDisplay();
  carModel?.userData?.livery?.syncFrame?.();
  tyreStates?.update(0);
  renderer.render(scene, camera);
};

document.querySelectorAll('.cam-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    window.setCameraView(btn.dataset.cam);
  });
});

document.getElementById('btn-view-reset')?.addEventListener('click', () => {
  window.setCameraView('CAM_ISO');
});

// Powertrain & Driving Controls
const btnEngineStart = document.getElementById('btn-engine-start');
btnEngineStart?.addEventListener('click', () => {
  if (state.pyrofuseCut) return;
  state.engineOn = !state.engineOn;
  btnEngineStart.classList.toggle('active', state.engineOn);
  btnEngineStart.textContent = state.engineOn ? 'ICE STOP' : 'ICE START';
});

const btnAeroToggle = document.getElementById('btn-aero-toggle');
btnAeroToggle?.addEventListener('click', () => {
  state.aeroMode = state.aeroMode === 'Z_MODE' ? 'X_MODE' : 'Z_MODE';
  soundEngine.playAeroSwitch();
  btnAeroToggle.classList.toggle('active', state.aeroMode === 'X_MODE');
  btnAeroToggle.textContent = `${state.aeroMode} (AERO)`;
  const pill = document.getElementById('status-pill');
  if (pill) {
    pill.textContent = state.aeroMode === 'X_MODE' ? 'X-MODE (LOW DRAG)' : 'Z-MODE (HIGH DOWNFORCE)';
    pill.className = `pill ${state.aeroMode === 'X_MODE' ? 'pill-amber' : 'pill-green'}`;
  }
});

const btnPyrofuse = document.getElementById('btn-pyrofuse');
btnPyrofuse?.addEventListener('click', () => {
  state.pyrofuseCut = true;
  state.engineOn = false;
  btnEngineStart?.classList.remove('active');
  btnPyrofuse.textContent = 'BLOWN';
  const pill = document.getElementById('status-pill');
  if (pill) {
    pill.textContent = 'HV CIRCUIT DISCONNECTED';
    pill.className = 'pill pill-red';
  }
});

// Throttle, Brake, Steering Sliders
document.getElementById('slider-throttle')?.addEventListener('input', e => {
  state.throttle = parseFloat(e.target.value) / 100;
  document.getElementById('val-throttle').textContent = `${e.target.value}%`;
});

document.getElementById('slider-brake')?.addEventListener('input', e => {
  state.brakeKgf = parseFloat(e.target.value);
  document.getElementById('val-brake').textContent = `${state.brakeKgf} kgf`;
  // Safety interlock: heavy braking drops X-Mode to Z-Mode
  if (state.brakeKgf > 15 && state.aeroMode === 'X_MODE') {
    state.aeroMode = 'Z_MODE';
    soundEngine.playAeroSwitch();
    btnAeroToggle?.classList.remove('active');
    if (btnAeroToggle) btnAeroToggle.textContent = 'Z-MODE (AERO)';
  }
});

document.getElementById('slider-steer')?.addEventListener('input', e => {
  state.steeringDeg = parseFloat(e.target.value);
  document.getElementById('val-steer').textContent = `${state.steeringDeg > 0 ? '+' : ''}${state.steeringDeg.toFixed(1)}°`;
});

document.getElementById('slider-exploded')?.addEventListener('input', e => {
  state.explodedProgress = parseFloat(e.target.value) / 100;
  document.getElementById('val-exploded').textContent = `${e.target.value}%`;
  btnExplode?.classList.toggle('active', state.explodedProgress > 0);
});

// Gear Buttons with Pneumatic Shift Pop SFX
document.querySelectorAll('.gear-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.gear-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const g = btn.dataset.gear;
    const newGear = isNaN(g) ? g : parseInt(g);
    if (newGear !== state.gear) {
      soundEngine.playShiftPop();
    }
    state.gear = newGear;
  });
});

// Part Explorer Isolation & Focused Camera Framing
const PART_TARGETS = {
  ALL: { target: [12, 3.2, 0], pos: [-38, 16, 42] },
  monocoque: { target: [12, 3.5, 0], pos: [-4, 12, 22] },
  cockpitAccessories: { target: [13, 6.2, 0], pos: [8, 12, 16] },
  steering: { target: [8.2, 4.2, 0], pos: [11.2, 5.6, 0] },
  brakes: { target: [0, 3.5, 8], pos: [-10, 8, 20] },
  electrical: { target: [18, 3.0, 0], pos: [18, 14, 18] },
  powertrain: { target: [24, 3.8, 0], pos: [18, 14, 20] },
  transmission: { target: [34, 3.6, 0], pos: [44, 12, 20] },
  suspension: { target: [0, 3.5, 8], pos: [-12, 8, 22] },
  floor: { target: [16, 1.2, 0], pos: [16, 8, 34] },
  bodywork: { target: [16, 4.0, 0], pos: [-26, 18, 40] }
};

document.querySelectorAll('.part-item').forEach(item => {
  item.addEventListener('click', () => {
    document.querySelectorAll('.part-item').forEach(i => i.classList.remove('active'));
    item.classList.add('active');
    const partKey = item.dataset.isolate;
    carModel?.isolateAssembly(partKey);

    // Frame camera on the selected part
    const pt = PART_TARGETS[partKey] || PART_TARGETS.ALL;
    controls.target.set(...pt.target);
    camera.position.set(...pt.pos);
    controls.update();
  });
});

// =========================================================================
// 7. ANIMATION LOOP & KINEMATICS UPDATE (60 FPS)
// =========================================================================
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const dt = clock.getDelta();

  // Dynamic Powertrain Simulation
  if (state.engineOn && !state.pyrofuseCut) {
    if (typeof state.gear === 'number' && state.gear > 0) {
      // Speed increases with throttle
      const targetSpeed = state.throttle * 330.0;
      state.speedKmH = THREE.MathUtils.lerp(state.speedKmH, targetSpeed, 0.04);
      // RPM scales with speed and gear
      const targetRpm = 4500 + (state.speedKmH / 340) * 7500;
      state.rpm = THREE.MathUtils.lerp(state.rpm, targetRpm, 0.08);
    } else {
      // Free revving in Neutral
      const targetRpm = 4000 + state.throttle * 7500;
      state.rpm = THREE.MathUtils.lerp(state.rpm, targetRpm, 0.15);
      state.speedKmH = Math.max(0, state.speedKmH - 25 * dt);
    }
  } else {
    state.rpm = Math.max(0, state.rpm - 6000 * dt);
    state.speedKmH = Math.max(0, state.speedKmH - 30 * dt);
  }

  // Red Bull Ring: on-track vehicle model (overrides speed/RPM while driving)
  trackMode?.update(dt);

  // Update Procedural Sound Engine
  soundEngine.update({
    rpm: state.rpm,
    throttle: state.throttle,
    speedKmH: state.speedKmH,
    gear: state.gear,
    aeroMode: state.aeroMode,
    brakeKgf: state.brakeKgf
  });

  // Cinematic 360° Drone Tour Flyaround
  if (state.tourActive) {
    state.tourAngle += 0.008;
    camera.position.x = 12 + Math.sin(state.tourAngle) * 44;
    camera.position.z = Math.cos(state.tourAngle) * 44;
    camera.position.y = 14 + Math.sin(state.tourAngle * 1.5) * 6;
    camera.lookAt(controls.target);
  }

  // Update Topbar Status
  const statusDetail = document.getElementById('status-detail');
  if (statusDetail) {
    statusDetail.textContent = `ICE: ${Math.round(state.rpm)} RPM · Speed: ${Math.round(state.speedKmH)} km/h · Gear: ${state.gear}`;
  }

  // Articulate 3D Physical Geometry
  if (carModel && carModel.updateKinematics) {
    carModel.updateKinematics({
      rpm: state.rpm,
      speedKmH: state.speedKmH,
      steeringAngle: THREE.MathUtils.degToRad(state.steeringDeg),
      aeroMode: state.aeroMode,
      gear: state.gear,
      brakeKgf: state.brakeKgf,
      explodedProgress: state.explodedProgress,
      suspensionTravel: sumTravel(tyreStates?.suspensionTravel, trackMode?.suspensionTravel)
    });
  }

  // Update PCU-8D Display
  updateLcdDisplay();

  if (!state.tourActive) {
    controls.update();
  }
  trackMode?.beforeRender(dt);
  tyreStates?.update(dt);
  carModel?.userData?.livery?.syncFrame?.(); // paint split follows the car on the circuit
  renderer.render(scene, camera);
}

// Full-scale Red Bull Ring circuit, driving + chase cameras (cad/track/*)
let trackMode = null;
let tyreStates = null;
try {
  trackMode = initTrackMode({ scene, camera, controls, renderer, carModel, state, sunLight, ambientLight, legacyEnv: trackEnv });
} catch (err) {
  console.error('Red Bull Ring circuit failed to build:', err);
}

// Tyre compounds × wear states × weather (cad/tyre_states.js): UI in the Telemetry panel + Drive HUD,
// API on window.tyreStates (setTyreState / setTyreCompound / setTyreWear / setBlownCorner / setWeather)
try {
  if (carModel) tyreStates = initTyreStates({ carModel, renderer, scene, state, trackMode });
} catch (err) {
  console.error('Tyre states failed to initialise:', err);
}

animate();

// Window Resize Handling
window.addEventListener('resize', handleResize);

// Ready status
window.__CAR_READY__ = true;
