/**
 * app.js — Main Application Orchestrator for 2026 F1 Powertrain & Energy Store Digital Twin
 */

import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { createPowertrainMaterials, buildPowertrainAssembly, makeSREdesignsBadge } from "./powertrain3d.js";

// DOM Elements
const viewport = document.getElementById("viewport3d");
const statusPill = document.getElementById("status-pill");
const statusDetail = document.getElementById("status-detail");
const viewportStatus = document.getElementById("viewport-status");

// Telemetry Elements
const valTotalPower = document.getElementById("val-total-power");
const barPower = document.getElementById("bar-power");
const valIcePower = document.getElementById("val-ice-power");
const valMgukPower = document.getElementById("val-mguk-power");
const valFuelRate = document.getElementById("val-fuel-rate");
const valEngineRpm = document.getElementById("val-engine-rpm");
const valBatterySoc = document.getElementById("val-battery-soc");
const barSoc = document.getElementById("bar-soc");
const valHvVoltage = document.getElementById("val-hv-voltage");
const valCoolantTemp = document.getElementById("val-coolant-temp");
const valPyrofuseStatus = document.getElementById("val-pyrofuse-status");

// Controls
const sliderThrottle = document.getElementById("slider-throttle");
const valThrottleCtrl = document.getElementById("val-throttle-ctrl");
const sliderRpm = document.getElementById("slider-rpm");
const valRpmCtrl = document.getElementById("val-rpm-ctrl");
const sliderRegen = document.getElementById("slider-regen");
const valRegenCtrl = document.getElementById("val-regen-ctrl");

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

// Presets
const btnPresetDeploy = document.getElementById("btn-preset-deploy");
const btnPresetCruise = document.getElementById("btn-preset-cruise");
const btnPresetRegen = document.getElementById("btn-preset-regen");
const btnPyrofuseTrip = document.getElementById("btn-pyrofuse-trip");

// Part Explorer
const partsListEl = document.getElementById("parts-list");
const btnPartsClear = document.getElementById("btn-parts-clear");
const partsFocusStatus = document.getElementById("parts-focus-status");

// --- THREE.JS SCENE SETUP ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0c1016);

const camera = new THREE.PerspectiveCamera(40, viewport.clientWidth / viewport.clientHeight, 0.1, 100);
camera.position.set(12.0, 7.5, 9.5);

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
controls.target.set(1.5, 2.0, 0.0);
controls.minDistance = 2.0;
controls.maxDistance = 45.0;

// Lighting Setup
const ambientLight = new THREE.AmbientLight(0xdde6f0, 0.9);
scene.add(ambientLight);

const mainKeyLight = new THREE.DirectionalLight(0xffffff, 2.4);
mainKeyLight.position.set(10, 16, 12);
mainKeyLight.castShadow = true;
mainKeyLight.shadow.mapSize.width = 2048;
mainKeyLight.shadow.mapSize.height = 2048;
scene.add(mainKeyLight);

const fillLight = new THREE.DirectionalLight(0x70a5d8, 1.3);
fillLight.position.set(-8, 6, -10);
scene.add(fillLight);

const rimLight = new THREE.DirectionalLight(0xffa040, 1.4);
rimLight.position.set(12, 10, -8);
scene.add(rimLight);

// Dyno Bench Datum Grid
const gridHelper = new THREE.GridHelper(30, 30, 0x00d4e8, 0x1f2937);
gridHelper.position.y = 0;
scene.add(gridHelper);

// Build 3D Model
const mats = createPowertrainMaterials();
const powertrain = buildPowertrainAssembly(scene, mats);

// Application State
const state = {
  throttlePct: 100,
  rpm: 10500,
  regenKw: 0,
  batterySoc: 78.4,
  pyrofuseTripped: false,
  isExploded: false,
  explodeFactor: 0.0,
  wireframe: false,
  autoRotate: false,
  orbitSpeedMultiplier: 1.0,
  cameraZoom: 50,
  lightingMood: "neutral",
  isolatedPart: null,
};

// Physics and Telemetry Model
function updatePowertrainState(dt) {
  if (state.pyrofuseTripped) {
    statusPill.className = "pill fault";
    statusPill.textContent = "PYROFUSE TRIPPED · HV SAFE";
    valPyrofuseStatus.textContent = "TRIPPED / OPEN CIRCUIT";
    valPyrofuseStatus.style.color = "var(--red)";
    valHvVoltage.textContent = "0.0 V";
    valMgukPower.textContent = "0 kW (ISOLATED)";

    const iceKw = 405.0 * (state.throttlePct / 100.0) * Math.min(1.0, state.rpm / 10500.0);
    valIcePower.textContent = `${iceKw.toFixed(0)} kW (${(iceKw * 1.341).toFixed(0)} hp)`;
    valTotalPower.textContent = `${iceKw.toFixed(0)} kW (${(iceKw * 1.341).toFixed(0)} hp)`;
    barPower.style.width = `${Math.min(100, (iceKw / 755.0) * 100)}%`;
    barPower.className = "gauge-bar-fill warning";
    statusDetail.textContent = `ICE Only: ${iceKw.toFixed(0)} kW · HV Bus Isolated · SECU Latch`;
    return;
  }

  valPyrofuseStatus.textContent = "ARMED / CLOSED";
  valPyrofuseStatus.style.color = "var(--green)";
  valHvVoltage.textContent = `${(800.0 + (state.batterySoc - 50.0) * 0.9).toFixed(1)} V`;

  const iceKw = 405.0 * (state.throttlePct / 100.0) * Math.min(1.0, state.rpm / 10500.0);
  const fuelRate = (state.throttlePct / 100.0) * Math.min(3000.0, 0.27 * state.rpm + 165.0);
  valIcePower.textContent = `${iceKw.toFixed(0)} kW (${(iceKw * 1.341).toFixed(0)} hp)`;
  valFuelRate.textContent = `${fuelRate.toFixed(0)} MJ/h`;
  valEngineRpm.textContent = `${Math.round(state.rpm).toLocaleString()} RPM`;

  let mgukKw = 0;
  if (state.regenKw > 0) {
    mgukKw = -state.regenKw;
    statusPill.className = "pill regen";
    statusPill.textContent = "MGU-K REGENERATING";
    valMgukPower.textContent = `-${state.regenKw.toFixed(0)} kW (HARVESTING)`;
    valMgukPower.style.color = "var(--amber)";

    // Recharge Battery SoC
    state.batterySoc = Math.min(100.0, state.batterySoc + (state.regenKw / 350.0) * dt * 0.5);
  } else {
    mgukKw = 350.0 * (state.throttlePct / 100.0);
    if (state.throttlePct > 80) {
      statusPill.className = "pill boost";
      statusPill.textContent = "FULL HYBRID DEPLOYMENT";
    } else {
      statusPill.className = "pill run";
      statusPill.textContent = "50/50 HYBRID ACTIVE";
    }
    valMgukPower.textContent = `+${mgukKw.toFixed(0)} kW (+${(mgukKw * 1.341).toFixed(0)} hp)`;
    valMgukPower.style.color = "var(--cyan)";

    // Discharge Battery SoC
    state.batterySoc = Math.max(10.0, state.batterySoc - (mgukKw / 350.0) * dt * 0.25);
  }

  const totalKw = Math.max(0, iceKw + Math.max(0, mgukKw));
  const totalHp = totalKw * 1.341;
  valTotalPower.textContent = `${totalKw.toFixed(0)} kW (${totalHp.toFixed(0)} hp)`;
  barPower.style.width = `${Math.min(100, (totalKw / 755.0) * 100)}%`;
  barPower.className = "gauge-bar-fill";

  valBatterySoc.textContent = `${state.batterySoc.toFixed(1)}%`;
  barSoc.style.width = `${state.batterySoc}%`;

  const coolantTemp = 45.0 + (totalKw / 755.0) * 8.5;
  valCoolantTemp.textContent = `${coolantTemp.toFixed(1)} °C`;

  statusDetail.textContent = `Total Power: ${totalKw.toFixed(0)} kW (${totalHp.toFixed(0)} hp) · ${Math.round(state.rpm)} RPM · 840V Bus`;
}

// Exploded View Interpolation
function updateExplodedView(dt) {
  const target = state.isExploded ? 1.0 : 0.0;
  state.explodeFactor += (target - state.explodeFactor) * Math.min(1.0, dt * 6.0);

  for (const part of powertrain.explodedParts) {
    const offset = part.direction.clone().multiplyScalar(part.maxDist * state.explodeFactor);
    part.mesh.position.copy(part.origin).add(offset);
  }
}

// Part Explorer Setup
function initPartExplorer() {
  partsListEl.innerHTML = "";
  const parts = [];

  powertrain.root.traverse((node) => {
    if (node.isMesh && node.name && !node.name.startsWith("Scene")) {
      parts.push(node);
    }
  });

  // Sort by name
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

  powertrain.root.traverse((node) => {
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
  powertrain.root.traverse((node) => {
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
sliderThrottle.addEventListener("input", (e) => {
  state.throttlePct = parseFloat(e.target.value);
  valThrottleCtrl.textContent = `${state.throttlePct}%`;
  if (state.throttlePct > 0) {
    state.regenKw = 0;
    sliderRegen.value = 0;
    valRegenCtrl.textContent = "0 kW";
  }
});

sliderRpm.addEventListener("input", (e) => {
  state.rpm = parseFloat(e.target.value);
  valRpmCtrl.textContent = `${Math.round(state.rpm).toLocaleString()} RPM`;
});

sliderRegen.addEventListener("input", (e) => {
  state.regenKw = parseFloat(e.target.value);
  valRegenCtrl.textContent = `${state.regenKw} kW`;
  if (state.regenKw > 0) {
    state.throttlePct = 0;
    sliderThrottle.value = 0;
    valThrottleCtrl.textContent = "0%";
  }
});

btnExplode.addEventListener("click", () => {
  state.isExploded = !state.isExploded;
  btnExplode.classList.toggle("active", state.isExploded);
});

btnWireframe.addEventListener("click", () => {
  state.wireframe = !state.wireframe;
  btnWireframe.classList.toggle("active", state.wireframe);
  powertrain.root.traverse((node) => {
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
  const dist = 30.0 - (zoomPct / 100.0) * 20.0;
  const dir = camera.position.clone().sub(controls.target).normalize();
  camera.position.copy(controls.target).add(dir.multiplyScalar(dist));
});

sliderLabLight.addEventListener("input", (e) => {
  const intensity = parseFloat(e.target.value);
  valLabLight.textContent = `${intensity.toFixed(1)}×`;
  mainKeyLight.intensity = 2.4 * intensity;
  fillLight.intensity = 1.3 * intensity;
  rimLight.intensity = 1.4 * intensity;
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

// Preset Buttons
btnPresetDeploy.addEventListener("click", () => {
  state.pyrofuseTripped = false;
  state.throttlePct = 100;
  sliderThrottle.value = 100;
  valThrottleCtrl.textContent = "100%";
  state.rpm = 10500;
  sliderRpm.value = 10500;
  valRpmCtrl.textContent = "10,500 RPM";
  state.regenKw = 0;
  sliderRegen.value = 0;
  valRegenCtrl.textContent = "0 kW";
});

btnPresetCruise.addEventListener("click", () => {
  state.pyrofuseTripped = false;
  state.throttlePct = 50;
  sliderThrottle.value = 50;
  valThrottleCtrl.textContent = "50%";
  state.rpm = 8000;
  sliderRpm.value = 8000;
  valRpmCtrl.textContent = "8,000 RPM";
  state.regenKw = 0;
  sliderRegen.value = 0;
  valRegenCtrl.textContent = "0 kW";
});

btnPresetRegen.addEventListener("click", () => {
  state.pyrofuseTripped = false;
  state.throttlePct = 0;
  sliderThrottle.value = 0;
  valThrottleCtrl.textContent = "0%";
  state.regenKw = 350;
  sliderRegen.value = 350;
  valRegenCtrl.textContent = "350 kW";
});

btnPyrofuseTrip.addEventListener("click", () => {
  state.pyrofuseTripped = !state.pyrofuseTripped;
  btnPyrofuseTrip.textContent = state.pyrofuseTripped ? "Reset Pyrofuse" : "Trip Pyrofuse";
  btnPyrofuseTrip.className = state.pyrofuseTripped ? "btn btn-primary" : "btn btn-danger";
});

// Camera View Helpers
window.setCameraPreset = function(preset) {
  controls.autoRotate = false;
  btnAutoRotate.classList.remove("active");
  switch (preset) {
    case "front":
      camera.position.set(-6, 2.2, 0);
      controls.target.set(2.0, 2.0, 0);
      break;
    case "side":
      camera.position.set(2.5, 2.2, 10);
      controls.target.set(2.5, 2.0, 0);
      break;
    case "top":
      camera.position.set(2.5, 14, 0.01);
      controls.target.set(2.5, 1.5, 0);
      break;
    case "iso":
    default:
      camera.position.set(12.0, 7.5, 9.5);
      controls.target.set(1.5, 2.0, 0);
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

  updatePowertrainState(dt);
  updateExplodedView(dt);
  controls.update();
  renderer.render(scene, camera);
}
animate();
