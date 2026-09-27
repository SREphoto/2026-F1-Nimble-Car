/**
 * app.js — Main Application Orchestrator for 2026 F1 Gearbox, Rear Suspension & RIS Digital Twin
 */

import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { createGearboxMaterials, buildGearboxAssembly, makeSREdesignsBadge } from "./gearbox3d.js";

// DOM Elements
const viewport = document.getElementById("viewport3d");
const statusPill = document.getElementById("status-pill");
const statusDetail = document.getElementById("status-detail");
const viewportStatus = document.getElementById("viewport-status");

// Telemetry Elements
const valGearDisplay = document.getElementById("val-gear-display");
const valSpeedDisplay = document.getElementById("val-speed-display");
const barSpeed = document.getElementById("bar-speed");
const valDiffLock = document.getElementById("val-diff-lock");
const valDiffTorque = document.getElementById("val-diff-torque");
const barDiff = document.getElementById("bar-diff");
const valPushrodLoad = document.getElementById("val-pushrod-load");
const valRockerAngle = document.getElementById("val-rocker-angle");
const valRainLightStatus = document.getElementById("val-rain-light-status");

// Controls
const btnShiftDown = document.getElementById("btn-shift-down");
const btnShiftUp = document.getElementById("btn-shift-up");
const btnGearNeutral = document.getElementById("btn-gear-neutral");
const btnGearReverse = document.getElementById("btn-gear-reverse");

const sliderRpm = document.getElementById("slider-rpm");
const valRpmCtrl = document.getElementById("val-rpm-ctrl");
const sliderBump = document.getElementById("slider-bump");
const valBumpCtrl = document.getElementById("val-bump-ctrl");

const btnDiffEntry = document.getElementById("btn-diff-entry");
const btnDiffApex = document.getElementById("btn-diff-apex");
const btnDiffExit = document.getElementById("btn-diff-exit");
const btnToggleRainLight = document.getElementById("btn-toggle-rain-light");

const btnExplode = document.getElementById("btn-explode");
const btnWireframe = document.getElementById("btn-wireframe");
const btnAutoRotate = document.getElementById("btn-auto-rotate");
const sliderOrbitSpeed = document.getElementById("orbit-speed");
const valOrbitSpeed = document.getElementById("orbit-speed-val");
const sliderCameraZoom = document.getElementById("camera-zoom");
const valCameraZoom = document.getElementById("camera-zoom-val");
const sliderLabLight = document.getElementById("lab-light");
const valLabLight = document.getElementById("lab-light-val");
const selectLabMood = document.getElementById("lab-light-mood");
const btnViewReset = document.getElementById("btn-view-reset");

// Part Explorer
const partsListEl = document.getElementById("parts-list");
const btnPartsClear = document.getElementById("btn-parts-clear");
const partsFocusStatus = document.getElementById("parts-focus-status");

// --- THREE.JS SCENE SETUP ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0c1016);

const camera = new THREE.PerspectiveCamera(40, viewport.clientWidth / viewport.clientHeight, 0.1, 100);
camera.position.set(16.0, 9.0, 13.0);

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
renderer.setSize(viewport.clientWidth, viewport.clientHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;
viewport.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.target.set(6.5, 2.2, 0.0);
controls.minDistance = 3.0;
controls.maxDistance = 50.0;

// Lighting Setup
const ambientLight = new THREE.AmbientLight(0xdde6f0, 0.9);
scene.add(ambientLight);

const mainKeyLight = new THREE.DirectionalLight(0xffffff, 2.5);
mainKeyLight.position.set(14, 18, 14);
mainKeyLight.castShadow = true;
mainKeyLight.shadow.mapSize.width = 2048;
mainKeyLight.shadow.mapSize.height = 2048;
scene.add(mainKeyLight);

const fillLight = new THREE.DirectionalLight(0x70a5d8, 1.3);
fillLight.position.set(-6, 6, -10);
scene.add(fillLight);

const rimLight = new THREE.DirectionalLight(0xff3344, 1.5);
rimLight.position.set(18, 8, -6);
scene.add(rimLight);

// Dyno Datum Grid
const gridHelper = new THREE.GridHelper(30, 30, 0x00d4e8, 0x1f2937);
gridHelper.position.y = 0;
scene.add(gridHelper);

// Build 3D Model
const mats = createGearboxMaterials();
const gearbox = buildGearboxAssembly(scene, mats);

// Application State
const GEAR_RATIOS = {
  "-1": -3.100,
  "0": 0.000,
  "1": 2.850,
  "2": 2.150,
  "3": 1.720,
  "4": 1.410,
  "5": 1.190,
  "6": 1.030,
  "7": 0.910,
  "8": 0.815,
};
const FINAL_DRIVE = 5.400;
const TYRE_RADIUS_M = 0.355;

const state = {
  currentGear: 4,
  targetGear: 4,
  isShifting: false,
  shiftTimer: 0.0,
  rpm: 10500,
  diffMode: "EXIT",
  diffLockPct: 75.0,
  wheelBumpMm: 0.0,
  rainLightActive: true,
  isExploded: false,
  explodeFactor: 0.0,
  wireframe: false,
  autoRotate: false,
  orbitSpeedMultiplier: 1.0,
  lightingMood: "neutral",
  isolatedPart: null,
};

// Physics and Telemetry Model
function updateGearboxState(dt) {
  // Seamless Shift Timer
  if (state.isShifting) {
    state.shiftTimer -= dt;
    if (state.shiftTimer <= 0.0) {
      state.currentGear = state.targetGear;
      state.isShifting = false;
      statusPill.className = "pill run";
      statusPill.textContent = `GEAR ${state.currentGear} ENGAGED`;
    }
  }

  // Speed Calculation
  let speedKmh = 0.0;
  if (state.currentGear !== 0) {
    const ratio = Math.abs(GEAR_RATIOS[state.currentGear]);
    const totalRatio = ratio * FINAL_DRIVE;
    const wheelRpm = state.rpm / totalRatio;
    const wheelCircumference = 2.0 * Math.PI * TYRE_RADIUS_M;
    speedKmh = ((wheelRpm * wheelCircumference) / 60.0) * 3.6;
  }

  // Gear Display Text
  if (state.currentGear === 0) {
    valGearDisplay.textContent = "NEUTRAL [N]";
    valGearDisplay.style.color = "var(--muted)";
  } else if (state.currentGear === -1) {
    valGearDisplay.textContent = "REVERSE [R]";
    valGearDisplay.style.color = "var(--red)";
  } else {
    valGearDisplay.textContent = `GEAR ${state.currentGear} (${GEAR_RATIOS[state.currentGear].toFixed(3)})`;
    valGearDisplay.style.color = "var(--cyan)";
  }

  valSpeedDisplay.textContent = `${speedKmh.toFixed(1)} km/h`;
  barSpeed.style.width = `${Math.min(100, (speedKmh / 360.0) * 100)}%`;

  // Differential Lock
  valDiffLock.textContent = `${state.diffLockPct.toFixed(1)}% (${state.diffMode} MODE)`;
  barDiff.style.width = `${state.diffLockPct}%`;
  const diffTorque = 600.0 * (state.diffLockPct / 100.0);
  valDiffTorque.textContent = `${diffTorque.toFixed(0)} Nm`;

  // Suspension Kinematics
  const pushrodLoad = Math.abs(state.wheelBumpMm) * 160.0 / 0.82;
  const rockerAngle = (state.wheelBumpMm * 0.82 / 65.0) * (180.0 / Math.PI);
  valPushrodLoad.textContent = `${pushrodLoad.toFixed(0)} N`;
  valRockerAngle.textContent = `${rockerAngle >= 0 ? "+" : ""}${rockerAngle.toFixed(1)}°`;

  // Rain Light Pulsing (4 Hz)
  if (state.rainLightActive) {
    const isLit = Math.sin(performance.now() * 0.001 * 4.0 * Math.PI * 2) > 0;
    gearbox.rainLight.material.emissiveIntensity = isLit ? 3.5 : 0.2;
    valRainLightStatus.textContent = "4 Hz PULSING";
    valRainLightStatus.style.color = "var(--red)";
  } else {
    gearbox.rainLight.material.emissiveIntensity = 0.0;
    valRainLightStatus.textContent = "STANDBY (OFF)";
    valRainLightStatus.style.color = "var(--muted)";
  }

  statusDetail.textContent = `Speed: ${speedKmh.toFixed(1)} km/h · Shift Time: 4.5 ms · Diff Lock: ${state.diffLockPct.toFixed(0)}% · Pushrod: ${pushrodLoad.toFixed(0)} N`;
}

// Seamless Shift Trigger
function triggerShift(target) {
  if (target === state.currentGear) return;
  state.targetGear = target;
  state.isShifting = true;
  state.shiftTimer = 0.0045; // 4.5 ms seamless shift
  statusPill.className = "pill shift";
  statusPill.textContent = `SEAMLESS SHIFT -> G${target}`;
}

// Exploded View Interpolation
function updateExplodedView(dt) {
  const target = state.isExploded ? 1.0 : 0.0;
  state.explodeFactor += (target - state.explodeFactor) * Math.min(1.0, dt * 6.0);

  for (const part of gearbox.explodedParts) {
    const offset = part.direction.clone().multiplyScalar(part.maxDist * state.explodeFactor);
    part.mesh.position.copy(part.origin).add(offset);
  }
}

// Part Explorer Setup
function initPartExplorer() {
  partsListEl.innerHTML = "";
  const parts = [];

  gearbox.root.traverse((node) => {
    if (node.isMesh && node.name && !node.name.startsWith("Scene")) {
      parts.push(node);
    }
  });

  parts.sort((a, b) => a.name.localeCompare(b.name));

  parts.forEach((mesh) => {
    const item = document.createElement("div");
    item.className = "part-item";
    item.textContent = mesh.name;
    item.addEventListener("click", () => {
      isolatePart(mesh.name);
    });
    partsListEl.appendChild(item);
  });
}

function isolatePart(partName) {
  state.isolatedPart = partName;
  partsFocusStatus.textContent = `Isolated: ${partName}`;

  gearbox.root.traverse((node) => {
    if (node.isMesh) {
      if (node.name === partName || node.name.startsWith(partName)) {
        node.visible = true;
        if (node.material) {
          node.material.wireframe = false;
        }
      } else {
        node.visible = false;
      }
    }
  });

  document.querySelectorAll(".part-item").forEach((el) => {
    el.classList.toggle("active", el.textContent === partName);
  });
}

function clearPartIsolation() {
  state.isolatedPart = null;
  partsFocusStatus.textContent = "All Parts Visible";
  gearbox.root.traverse((node) => {
    if (node.isMesh) {
      node.visible = true;
      if (node.material) {
        node.material.wireframe = state.wireframe;
      }
    }
  });
  document.querySelectorAll(".part-item").forEach((el) => el.classList.remove("active"));
}

// Event Listeners
btnShiftUp.addEventListener("click", () => {
  if (state.currentGear < 8) {
    triggerShift(state.currentGear + 1);
  }
});

btnShiftDown.addEventListener("click", () => {
  if (state.currentGear > 1) {
    triggerShift(state.currentGear - 1);
  }
});

btnGearNeutral.addEventListener("click", () => {
  triggerShift(0);
});

btnGearReverse.addEventListener("click", () => {
  triggerShift(-1);
});

sliderRpm.addEventListener("input", (e) => {
  state.rpm = parseFloat(e.target.value);
  valRpmCtrl.textContent = `${Math.round(state.rpm).toLocaleString()} RPM`;
});

sliderBump.addEventListener("input", (e) => {
  state.wheelBumpMm = parseFloat(e.target.value);
  valBumpCtrl.textContent = `${state.wheelBumpMm >= 0 ? "+" : ""}${state.wheelBumpMm} mm`;
});

btnDiffEntry.addEventListener("click", () => {
  state.diffMode = "ENTRY";
  state.diffLockPct = 65.0;
});

btnDiffApex.addEventListener("click", () => {
  state.diffMode = "APEX";
  state.diffLockPct = 25.0;
});

btnDiffExit.addEventListener("click", () => {
  state.diffMode = "EXIT";
  state.diffLockPct = 85.0;
});

btnToggleRainLight.addEventListener("click", () => {
  state.rainLightActive = !state.rainLightActive;
});

btnExplode.addEventListener("click", () => {
  state.isExploded = !state.isExploded;
  btnExplode.classList.toggle("active", state.isExploded);
});

btnWireframe.addEventListener("click", () => {
  state.wireframe = !state.wireframe;
  btnWireframe.classList.toggle("active", state.wireframe);
  gearbox.root.traverse((node) => {
    if (node.isMesh && node.material && node.name !== "Badge_SREdesigns") {
      node.material.wireframe = state.wireframe;
    }
  });
});

btnAutoRotate.addEventListener("click", () => {
  state.autoRotate = !state.autoRotate;
  btnAutoRotate.classList.toggle("active", state.autoRotate);
  controls.autoRotate = state.autoRotate;
});

sliderOrbitSpeed.addEventListener("input", (e) => {
  state.orbitSpeedMultiplier = parseFloat(e.target.value);
  valOrbitSpeed.textContent = `${state.orbitSpeedMultiplier.toFixed(1)}×`;
  controls.autoRotateSpeed = 2.0 * state.orbitSpeedMultiplier;
});

sliderCameraZoom.addEventListener("input", (e) => {
  const zoomPct = parseFloat(e.target.value);
  valCameraZoom.textContent = `${Math.round(zoomPct)}%`;
  const dist = 32.0 - (zoomPct / 100.0) * 22.0;
  const dir = camera.position.clone().sub(controls.target).normalize();
  camera.position.copy(controls.target).add(dir.multiplyScalar(dist));
});

sliderLabLight.addEventListener("input", (e) => {
  const intensity = parseFloat(e.target.value);
  valLabLight.textContent = `${intensity.toFixed(1)}×`;
  mainKeyLight.intensity = 2.5 * intensity;
  fillLight.intensity = 1.3 * intensity;
  rimLight.intensity = 1.5 * intensity;
});

selectLabMood.addEventListener("change", (e) => {
  state.lightingMood = e.target.value;
  switch (state.lightingMood) {
    case "bright":
      ambientLight.color.setHex(0xffffff);
      mainKeyLight.color.setHex(0xffffff);
      fillLight.color.setHex(0xb0d8ff);
      renderer.toneMappingExposure = 1.4;
      break;
    case "dim":
      ambientLight.color.setHex(0x3a4860);
      mainKeyLight.color.setHex(0xffaa77);
      fillLight.color.setHex(0x223355);
      renderer.toneMappingExposure = 0.85;
      break;
    case "cool":
      ambientLight.color.setHex(0xa0d0ff);
      mainKeyLight.color.setHex(0xc0e5ff);
      fillLight.color.setHex(0x0088cc);
      renderer.toneMappingExposure = 1.25;
      break;
    case "warm":
      ambientLight.color.setHex(0xffeedd);
      mainKeyLight.color.setHex(0xffcc88);
      fillLight.color.setHex(0xcc6633);
      renderer.toneMappingExposure = 1.2;
      break;
    default:
      ambientLight.color.setHex(0xdde6f0);
      mainKeyLight.color.setHex(0xffffff);
      fillLight.color.setHex(0x70a5d8);
      renderer.toneMappingExposure = 1.2;
      break;
  }
});

btnPartsClear.addEventListener("click", clearPartIsolation);

// Camera View Helpers
window.setCameraPreset = function(preset) {
  controls.autoRotate = false;
  btnAutoRotate.classList.remove("active");
  switch (preset) {
    case "front":
      camera.position.set(-4, 2.2, 0);
      controls.target.set(6.5, 2.2, 0);
      break;
    case "side":
      camera.position.set(6.5, 2.5, 14);
      controls.target.set(6.5, 2.2, 0);
      break;
    case "top":
      camera.position.set(6.5, 18, 0.01);
      controls.target.set(6.5, 2.0, 0);
      break;
    case "iso":
    default:
      camera.position.set(16.0, 9.0, 13.0);
      controls.target.set(6.5, 2.2, 0.0);
      break;
  }
  controls.update();
};

btnViewReset.addEventListener("click", () => {
  window.setCameraPreset("iso");
});

// Collapsible Panels Handler
document.querySelectorAll(".panel-collapse-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const targetName = btn.getAttribute("data-collapse");
    const panel = document.querySelector(`[data-panel="${targetName}"]`);
    if (panel) {
      panel.classList.toggle("collapsed");
      btn.textContent = panel.classList.contains("collapsed") ? "◂" : "▾";
    }
  });
});

window.addEventListener("resize", () => {
  camera.aspect = viewport.clientWidth / viewport.clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(viewport.clientWidth, viewport.clientHeight);
});

initPartExplorer();
viewportStatus.style.display = "none";

// Animation Loop
let lastTime = performance.now();
function animate() {
  requestAnimationFrame(animate);
  const now = performance.now();
  const dt = Math.min(0.1, (now - lastTime) / 1000);
  lastTime = now;

  updateGearboxState(dt);
  updateExplodedView(dt);
  controls.update();
  renderer.render(scene, camera);
}
animate();
