/**
 * app.js — Master Orchestrator for 2026 F1 Active Rear Wing Digital Twin
 */

import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { createRearWingMaterials, buildRearWingAssembly, makeSREdesignsBadge } from "./rear_wing3d.js?v=20260926-f1-rearwing";

export { makeSREdesignsBadge };

// DOM Elements
const viewport = document.getElementById("viewport3d");
const statusPill = document.getElementById("status-pill");
const statusDetail = document.getElementById("status-detail");
const viewportStatus = document.getElementById("viewport-status");

// Telemetry Elements
const valDownforce = document.getElementById("val-downforce");
const barDownforce = document.getElementById("bar-downforce");
const valDrag = document.getElementById("val-drag");
const barDrag = document.getElementById("bar-drag");
const valMode = document.getElementById("val-mode");
const valDragReduction = document.getElementById("val-drag-reduction");
const valFlapAngle = document.getElementById("val-flap-angle");
const valDynamicPressure = document.getElementById("val-dynamic-pressure");
const valHydraulic = document.getElementById("val-hydraulic");

// Controls
const sliderSpeed = document.getElementById("slider-speed");
const valSpeedCtrl = document.getElementById("val-speed-ctrl");
const sliderDecel = document.getElementById("slider-decel");
const valDecelCtrl = document.getElementById("val-decel-ctrl");
const sliderFlap = document.getElementById("slider-flap");
const valFlapCtrl = document.getElementById("val-flap-ctrl");

// Buttons & Toolbar
const btnExplode = document.getElementById("btn-explode");
const btnWireframe = document.getElementById("btn-wireframe");
const btnToggleMode = document.getElementById("btn-toggle-mode");
const btnAutoRotate = document.getElementById("btn-auto-rotate");
const sliderOrbitSpeed = document.getElementById("orbit-speed");
const valOrbitSpeed = document.getElementById("orbit-speed-val");
const sliderCameraZoom = document.getElementById("camera-zoom");
const valCameraZoom = document.getElementById("camera-zoom-val");
const sliderLabLight = document.getElementById("lab-light");
const valLabLight = document.getElementById("lab-light-val");
const selectLabMood = document.getElementById("lab-light-mood");
const btnViewReset = document.getElementById("btn-view-reset");

// Testing Presets
const btnModeZ = document.getElementById("btn-mode-z");
const btnModeX = document.getElementById("btn-mode-x");
const btnDropPressure = document.getElementById("btn-drop-pressure");
const btnResetFailsafe = document.getElementById("btn-reset-failsafe");

// Part Explorer
const partsListEl = document.getElementById("parts-list");
const btnPartsClear = document.getElementById("btn-parts-clear");
const partsFocusStatus = document.getElementById("parts-focus-status");

// Simulation State
const state = {
  mode: "Z_MODE",
  targetMode: "Z_MODE",
  currentAoA: 26.0,
  targetAoA: 26.0,
  vehicleSpeedKmh: 300.0,
  decelerationG: 0.0,
  hydraulicPressureBar: 180.0,
  failsafeTripped: false,
  exploded: false,
  explodeProgress: 0,
  wireframe: false,
  autoRotate: false,
  orbitSpeed: 1.0,
  lightIntensity: 1.1,
  isolatedPart: null,
};

const CFG = {
  refAreaM2: 0.441,
  airDensity: 1.225,
  zAoA: 26.0,
  xAoA: 3.0,
  zCl: 2.15,
  zCd: 0.68,
  xCl: 0.72,
  xCd: 0.28,
  transitionTimeS: 0.180,
  failsafeTimeS: 0.140,
  brakeInterlockG: 1.8,
};

// Scene Setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0c1016);
scene.fog = new THREE.FogExp2(0x0c1016, 0.025);

const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
const defaultCamPos = new THREE.Vector3(-9.5, 14.5, 18.0);
const defaultTarget = new THREE.Vector3(8.2, 7.5, 0);
camera.position.copy(defaultCamPos);

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
viewport.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.target.copy(defaultTarget);
controls.maxPolarAngle = Math.PI / 2 + 0.05; // Don't clip through ground

// Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.55);
scene.add(ambientLight);

const keyLight = new THREE.DirectionalLight(0xfff6ec, 2.2);
keyLight.position.set(12, 22, 16);
keyLight.castShadow = true;
keyLight.shadow.mapSize.width = 2048;
keyLight.shadow.mapSize.height = 2048;
keyLight.shadow.bias = -0.0005;
scene.add(keyLight);

const fillLight = new THREE.DirectionalLight(0xc8dcfa, 1.2);
fillLight.position.set(-6, 14, -14);
scene.add(fillLight);

const rimLight = new THREE.DirectionalLight(0x00d4e8, 1.1);
rimLight.position.set(2, 12, 18);
scene.add(rimLight);

// Lab Grid
const grid = new THREE.GridHelper(30, 30, 0x00d4e8, 0x1f2937);
grid.position.y = 0;
grid.material.opacity = 0.25;
grid.material.transparent = true;
scene.add(grid);

// Build 3D Rear Wing Model
const mats = createRearWingMaterials();
const wing = buildRearWingAssembly(scene, mats);

// Populate Part Explorer
const partsCatalog = [];
const seenNames = new Set();
wing.root.traverse((node) => {
  if (
    node.name &&
    (node.name.startsWith("Body_") ||
      node.name.startsWith("Pivot_") ||
      node.name.startsWith("Fastener_") ||
      node.name.startsWith("Badge_"))
  ) {
    if (!seenNames.has(node.name)) {
      seenNames.add(node.name);
      partsCatalog.push(node);
    }
  }
});

function renderPartExplorer() {
  partsListEl.innerHTML = "";
  partsCatalog.forEach((node) => {
    const item = document.createElement("div");
    item.className = "part-item";
    if (state.isolatedPart === node) item.classList.add("active");

    const nameSpan = document.createElement("span");
    nameSpan.className = "part-name";
    nameSpan.textContent = node.name;

    const badge = document.createElement("span");
    badge.className = "part-badge";
    badge.textContent = node.name.split("_")[0];

    item.appendChild(nameSpan);
    item.appendChild(badge);

    item.addEventListener("click", () => {
      isolatePart(node);
    });

    partsListEl.appendChild(item);
  });
}

function isolatePart(targetNode) {
  if (state.isolatedPart === targetNode) {
    clearIsolation();
    return;
  }
  state.isolatedPart = targetNode;
  wing.root.traverse((node) => {
    if (node.isMesh) {
      let p = node;
      let belongs = false;
      while (p && p !== wing.root) {
        if (p === targetNode) {
          belongs = true;
          break;
        }
        p = p.parent;
      }
      node.visible = belongs;
    }
  });
  partsFocusStatus.textContent = `Isolated: ${targetNode.name}`;
  renderPartExplorer();
}

function clearIsolation() {
  state.isolatedPart = null;
  wing.root.traverse((node) => {
    if (node.isMesh) node.visible = true;
  });
  partsFocusStatus.textContent = "All Parts Visible";
  renderPartExplorer();
}
btnPartsClear.addEventListener("click", clearIsolation);

renderPartExplorer();

// Resize handling
function resize() {
  const w = viewport.clientWidth;
  const h = viewport.clientHeight;
  if (!w || !h) return;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
}
window.addEventListener("resize", resize);
resize();

// Telemetry & Kinematics Update
function updatePhysics(dt) {
  // Slew current AoA towards target
  if (Math.abs(state.currentAoA - state.targetAoA) > 0.01) {
    const totalTime = state.failsafeTripped ? CFG.failsafeTimeS : CFG.transitionTimeS;
    const rate = Math.abs(CFG.zAoA - CFG.xAoA) / totalTime;
    if (state.currentAoA < state.targetAoA) {
      state.currentAoA = Math.min(state.targetAoA, state.currentAoA + rate * dt);
    } else {
      state.currentAoA = Math.max(state.targetAoA, state.currentAoA - rate * dt);
    }
  } else {
    state.currentAoA = state.targetAoA;
    state.mode = state.targetMode;
  }

  // Update 3D flap physical rotation (pivoting around hinge axis)
  // At 26 deg: rotation.z = 0; at 3 deg: rotation.z = -(26 - 3)*deg = -23 deg
  const deltaAngleRad = -((CFG.zAoA - state.currentAoA) * Math.PI) / 180;
  wing.upperFlapPivot.rotation.z = deltaAngleRad;

  // Aerodynamics
  const fraction = (state.currentAoA - CFG.xAoA) / (CFG.zAoA - CFG.xAoA);
  const clampedFraction = Math.max(0, Math.min(1, fraction));
  const cl = CFG.xCl + clampedFraction * (CFG.zCl - CFG.xCl);
  const cd = CFG.xCd + clampedFraction * (CFG.zCd - CFG.xCd);

  const speedMs = state.vehicleSpeedKmh / 3.6;
  const qPa = 0.5 * CFG.airDensity * Math.pow(speedMs, 2);
  const downforceN = cl * qPa * CFG.refAreaM2;
  const dragN = cd * qPa * CFG.refAreaM2;

  // Baseline Z-Mode drag at current speed
  const baseDragN = CFG.zCd * qPa * CFG.refAreaM2;
  const dragReductionPct = baseDragN > 0 ? Math.max(0, (1 - dragN / baseDragN) * 100) : 0;

  // Update DOM Telemetry
  valDownforce.textContent = `${Math.round(downforceN).toLocaleString()} N`;
  barDownforce.style.width = `${Math.min(100, (downforceN / 5500) * 100)}%`;

  valDrag.textContent = `${Math.round(dragN).toLocaleString()} N`;
  barDrag.style.width = `${Math.min(100, (dragN / 2000) * 100)}%`;

  valMode.textContent = state.mode;
  valDragReduction.textContent = `${dragReductionPct.toFixed(1)}%`;
  valFlapAngle.textContent = `${state.currentAoA.toFixed(2)} °`;
  valDynamicPressure.textContent = `${Math.round(qPa).toLocaleString()} Pa`;
  valHydraulic.textContent = `${state.hydraulicPressureBar.toFixed(1)} bar`;

  if (state.failsafeTripped) {
    statusPill.textContent = "HYDRAULIC FAULT (FAILSAFE)";
    statusPill.className = "pill fault";
  } else if (state.mode === "X_MODE") {
    statusPill.textContent = "X-MODE ACTIVE (LOW DRAG)";
    statusPill.className = "pill active-mode";
  } else {
    statusPill.textContent = "Z-MODE ACTIVE (DOWNFORCE)";
    statusPill.className = "pill run";
  }

  statusDetail.textContent = `Fz: ${Math.round(downforceN)} N · Fx: ${Math.round(dragN)} N · AoA: ${state.currentAoA.toFixed(1)}° · Hyd: ${state.hydraulicPressureBar} bar`;
  viewportStatus.textContent = `AoA: ${state.currentAoA.toFixed(1)}° · Downforce: ${Math.round(downforceN)} N · Drag: ${Math.round(dragN)} N`;
}

// Exploded View Transition
function updateExploded(dt) {
  const target = state.exploded ? 1.0 : 0.0;
  if (Math.abs(state.explodeProgress - target) > 0.001) {
    const step = dt * 2.2;
    if (state.explodeProgress < target) {
      state.explodeProgress = Math.min(target, state.explodeProgress + step);
    } else {
      state.explodeProgress = Math.max(target, state.explodeProgress - step);
    }

    wing.explodedParts.forEach(({ obj, direction, maxDist }) => {
      const offset = direction.clone().multiplyScalar(maxDist * state.explodeProgress);
      obj.position.copy(obj.userData.origPos.clone().add(offset));
    });
  }
}

// UI Event Handlers
sliderSpeed.addEventListener("input", (e) => {
  state.vehicleSpeedKmh = parseFloat(e.target.value);
  valSpeedCtrl.textContent = `${state.vehicleSpeedKmh} km/h`;
});

sliderDecel.addEventListener("input", (e) => {
  state.decelerationG = parseFloat(e.target.value);
  valDecelCtrl.textContent = `${state.decelerationG.toFixed(1)} g`;
  // Article C3.11 Braking Safety Interlock
  if (state.decelerationG >= CFG.brakeInterlockG && state.targetMode === "X_MODE") {
    commandMode("Z_MODE");
  }
});

sliderFlap.addEventListener("input", (e) => {
  const val = parseFloat(e.target.value);
  state.targetAoA = val;
  valFlapCtrl.textContent = `${val.toFixed(1)}°`;
});

function commandMode(newMode) {
  if (newMode === "X_MODE") {
    if (state.decelerationG >= CFG.brakeInterlockG) {
      alert("Safety Interlock: Cannot engage X-Mode under heavy braking (>= 1.8g)!");
      return;
    }
    if (state.failsafeTripped || state.hydraulicPressureBar < 120.0) {
      alert("Hydraulic Interlock: System pressure too low for X-Mode!");
      return;
    }
    state.targetMode = "X_MODE";
    state.targetAoA = CFG.xAoA;
    sliderFlap.value = CFG.xAoA;
    valFlapCtrl.textContent = `${CFG.xAoA.toFixed(1)}°`;
    btnToggleMode.textContent = "Engage Z-Mode";
  } else {
    state.targetMode = "Z_MODE";
    state.targetAoA = CFG.zAoA;
    sliderFlap.value = CFG.zAoA;
    valFlapCtrl.textContent = `${CFG.zAoA.toFixed(1)}°`;
    btnToggleMode.textContent = "Engage X-Mode";
  }
}

btnToggleMode.addEventListener("click", () => {
  if (state.targetMode === "Z_MODE") {
    commandMode("X_MODE");
  } else {
    commandMode("Z_MODE");
  }
});

btnModeZ.addEventListener("click", () => commandMode("Z_MODE"));
btnModeX.addEventListener("click", () => commandMode("X_MODE"));

btnDropPressure.addEventListener("click", () => {
  state.hydraulicPressureBar = 0.0;
  state.failsafeTripped = true;
  commandMode("Z_MODE");
});

btnResetFailsafe.addEventListener("click", () => {
  state.hydraulicPressureBar = 180.0;
  state.failsafeTripped = false;
});

btnExplode.addEventListener("click", () => {
  state.exploded = !state.exploded;
  btnExplode.classList.toggle("active", state.exploded);
});

btnWireframe.addEventListener("click", () => {
  state.wireframe = !state.wireframe;
  btnWireframe.classList.toggle("active", state.wireframe);
  Object.values(mats).forEach((m) => {
    if (m && m.wireframe !== undefined) m.wireframe = state.wireframe;
  });
});

btnAutoRotate.addEventListener("click", () => {
  state.autoRotate = !state.autoRotate;
  btnAutoRotate.classList.toggle("active", state.autoRotate);
  controls.autoRotate = state.autoRotate;
});

sliderOrbitSpeed.addEventListener("input", (e) => {
  state.orbitSpeed = parseFloat(e.target.value);
  valOrbitSpeed.textContent = `${state.orbitSpeed.toFixed(1)}×`;
  controls.autoRotateSpeed = 2.0 * state.orbitSpeed;
});

sliderCameraZoom.addEventListener("input", (e) => {
  const zoomPct = parseFloat(e.target.value);
  valCameraZoom.textContent = `${Math.round(zoomPct)}%`;
  const dist = 18.0 - (zoomPct / 100) * 12.0;
  const dir = camera.position.clone().sub(controls.target).normalize();
  camera.position.copy(controls.target.clone().add(dir.multiplyScalar(dist)));
});

sliderLabLight.addEventListener("input", (e) => {
  state.lightIntensity = parseFloat(e.target.value);
  valLabLight.textContent = `${state.lightIntensity.toFixed(1)}×`;
  keyLight.intensity = 1.8 * state.lightIntensity;
  fillLight.intensity = 0.9 * state.lightIntensity;
});

selectLabMood.addEventListener("change", (e) => {
  const mood = e.target.value;
  if (mood === "bright") {
    keyLight.color.setHex(0xffffff);
    fillLight.color.setHex(0xeef4ff);
    renderer.toneMappingExposure = 1.35;
  } else if (mood === "dim") {
    keyLight.color.setHex(0x556677);
    fillLight.color.setHex(0x223344);
    renderer.toneMappingExposure = 0.70;
  } else if (mood === "cool") {
    keyLight.color.setHex(0x00d4e8);
    fillLight.color.setHex(0x3b82f6);
    renderer.toneMappingExposure = 1.15;
  } else if (mood === "warm") {
    keyLight.color.setHex(0xffaa55);
    fillLight.color.setHex(0xff8833);
    renderer.toneMappingExposure = 1.10;
  } else {
    keyLight.color.setHex(0xfff5ea);
    fillLight.color.setHex(0xd0e0ff);
    renderer.toneMappingExposure = 1.05;
  }
});

btnViewReset.addEventListener("click", () => {
  camera.position.copy(defaultCamPos);
  controls.target.copy(defaultTarget);
  controls.update();
});

// Collapsible Panels
document.querySelectorAll(".panel-collapse-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const panelId = btn.getAttribute("data-collapse");
    const panel = document.querySelector(`[data-panel="${panelId}"]`);
    if (panel) {
      panel.classList.toggle("collapsed");
      const isExpanded = !panel.classList.contains("collapsed");
      btn.setAttribute("aria-expanded", String(isExpanded));
      btn.textContent = isExpanded ? "▾" : "▸";
    }
  });
});

// Render Loop
let lastTime = performance.now();
function animate() {
  requestAnimationFrame(animate);
  const now = performance.now();
  const dt = Math.min((now - lastTime) / 1000, 0.1);
  lastTime = now;

  updatePhysics(dt);
  updateExploded(dt);
  controls.update();
  renderer.render(scene, camera);
}
animate();
