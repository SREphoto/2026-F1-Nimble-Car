/**
 * f1_2026_full_car_twin/software/viewer/app.js
 * 
 * Main Three.js Runtime & Application Controller for F1 2026 Nimble Car Digital Twin:
 * - 3D Scene, Orbit Controls, Studio Lighting, Datum Floor
 * - 1:1 Procedural Full Car Assembly with Kinematics
 * - Dynamic PCU-8D Canvas Dashboard Display
 * - Full interactive UI binding (sliders, gears, aero modes, exploded view, part explorer)
 * - Standardized Viewpoint hooks for automated CDP visual QA
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createFullCarAssembly } from './cad/full_car3d.js';
import { materials } from './materials.js';

// =========================================================================
// 1. APPLICATION STATE
// =========================================================================
const state = {
  engineOn: false,
  rpm: 0,
  speedKmH: 0,
  gear: 'N',
  throttle: 0,        // 0 to 1
  brakeKgf: 0,        // 0 to 180
  steeringDeg: 0,     // -30 to +30 deg
  aeroMode: 'Z_MODE', // 'Z_MODE' or 'X_MODE'
  pyrofuseCut: false,
  batterySoc: 0.85,
  explodedProgress: 0.0,
  wireframe: false,
  autoRotate: false,
  orbitSpeed: 1.0,
  labLightIntensity: 1.2
};

// =========================================================================
// 2. THREE.JS INITIALIZATION
// =========================================================================
const container = document.getElementById('viewport3d');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0c1016);

const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 200);
camera.position.set(-32, 22, 45); // Default 3/4 isometric

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setSize(container.clientWidth, container.clientHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
container.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.target.set(17, 3.5, 0); // Center on mid-car chassis datum

window.THREE = THREE;
window.camera = camera;
window.controls = controls;
window.scene = scene;
window.renderer = renderer;

// =========================================================================
// 3. STUDIO LIGHTING & ENVIRONMENT (Standard Y-Up Studio Frame)
// =========================================================================
const ambientLight = new THREE.AmbientLight(0xffffff, 0.55);
scene.add(ambientLight);

// Overhead Key Light
const mainKeyLight = new THREE.DirectionalLight(0xffffff, 1.8);
mainKeyLight.position.set(20, 50, 25);
mainKeyLight.castShadow = true;
mainKeyLight.shadow.mapSize.width = 2048;
mainKeyLight.shadow.mapSize.height = 2048;
mainKeyLight.shadow.bias = -0.0005;
scene.add(mainKeyLight);

// Front Fill Light (Illuminates nosecone and front wing)
const frontFillLight = new THREE.DirectionalLight(0xccddff, 1.2);
frontFillLight.position.set(-40, 20, 15);
scene.add(frontFillLight);

// Opposite Side Fill Light
const sideFillLight = new THREE.DirectionalLight(0x88bbff, 0.9);
sideFillLight.position.set(17, 15, -40);
scene.add(sideFillLight);

// Rear Rim Light (Highlights rear wing, dorsal fin, and exhaust)
const rimLight = new THREE.DirectionalLight(0xffeedd, 1.3);
rimLight.position.set(45, 25, 0);
scene.add(rimLight);

// Studio Floor Datum Grid (Horizontal Y = 0 ground plane)
const gridHelper = new THREE.GridHelper(80, 80, 0x00d4e8, 0x1f2937);
gridHelper.position.set(17, 0, 0);
scene.add(gridHelper);

// =========================================================================
// 4. LOAD PROCEDURAL FULL CAR ASSEMBLY
// =========================================================================
let carModel = null;
try {
  carModel = createFullCarAssembly();
  carModel.rotation.x = -Math.PI / 2; // Map automotive CAD Z-up to Three.js Y-up
  scene.add(carModel);
  const statusEl = document.getElementById('viewport-status');
  if (statusEl) statusEl.textContent = 'Digital twin assembled (100% Procedural CAD)';
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

// Collapsible Panels
document.querySelectorAll('.panel-collapse-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const targetId = `panel-${btn.dataset.collapse}`;
    const panel = document.getElementById(targetId);
    if (panel) {
      panel.classList.toggle('collapsed');
      btn.textContent = panel.classList.contains('collapsed') ? '◂' : '▾';
    }
  });
});

// Viewport Toolbar Buttons
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
  mainKeyLight.intensity = 1.8 * state.labLightIntensity;
  ambientLight.intensity = 0.45 * state.labLightIntensity;
});

document.getElementById('lab-light-mood')?.addEventListener('change', e => {
  const mood = e.target.value;
  if (mood === 'bright') {
    scene.background.setHex(0x1a2330);
    ambientLight.color.setHex(0xffffff);
  } else if (mood === 'dim') {
    scene.background.setHex(0x05070a);
    ambientLight.color.setHex(0x334455);
  } else if (mood === 'cool') {
    scene.background.setHex(0x0c131f);
    ambientLight.color.setHex(0x88ccff);
  } else if (mood === 'warm') {
    scene.background.setHex(0x16120c);
    ambientLight.color.setHex(0xffddaa);
  } else {
    scene.background.setHex(0x0c1016);
    ambientLight.color.setHex(0xffffff);
  }
});

// Standardized Viewpoint Camera Presets (Y-Up Studio Frame)
const CAMERA_PRESETS = {
  CAM_ISO: { pos: [-36, 26, 48], target: [16, 3.5, 0] },
  CAM_FRONT: { pos: [-48, 5.0, 0], target: [10, 3.2, 0] },
  CAM_SIDE: { pos: [16.8, 5.0, 84], target: [16.8, 3.5, 0] },
  CAM_TOP: { pos: [16.8, 92, 0.001], target: [16.8, 0, 0] },
  CAM_EXPLODED: { pos: [-36, 36, 56], target: [16, 6.0, 0] },
  STATE_ACTIVE: { pos: [-34, 20, 44], target: [16, 3.5, 0] }
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
      explodedProgress: state.explodedProgress
    });
  }
  updateLcdDisplay();
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

// Gear Buttons
document.querySelectorAll('.gear-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.gear-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const g = btn.dataset.gear;
    state.gear = isNaN(g) ? g : parseInt(g);
  });
});

// Part Explorer Isolation
document.querySelectorAll('.part-item').forEach(item => {
  item.addEventListener('click', () => {
    document.querySelectorAll('.part-item').forEach(i => i.classList.remove('active'));
    item.classList.add('active');
    carModel?.isolateAssembly(item.dataset.isolate);
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
      explodedProgress: state.explodedProgress
    });
  }

  // Update PCU-8D Display
  updateLcdDisplay();

  controls.update();
  renderer.render(scene, camera);
}

animate();

// Window Resize Handling
window.addEventListener('resize', () => {
  camera.aspect = container.clientWidth / container.clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(container.clientWidth, container.clientHeight);
});

// Expose verification flag for preflight audits
window.__CAR_TWIN_READY__ = true;
