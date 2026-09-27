/**
 * app.js — Main Application Orchestrator for 2026 F1 Active Front Wing & FIS Digital Twin
 */

import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { createFrontWingMaterials, buildFrontWingAssembly } from "./front_wing3d.js";

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
const valCopDrift = document.getElementById("val-cop-drift");
const valHydraulic = document.getElementById("val-hydraulic");
const sliderSpeed = document.getElementById("slider-speed");
const valSpeedCtrl = document.getElementById("val-speed-ctrl");
const sliderFlap = document.getElementById("slider-flap");
const valFlapCtrl = document.getElementById("val-flap-ctrl");

// Controls
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

// Presets
const btnModeZ = document.getElementById("btn-mode-z");
const btnModeX = document.getElementById("btn-mode-x");
const btnTestHydraulicFail = document.getElementById("btn-test-hydraulic-fail");
const btnTestAsymmetry = document.getElementById("btn-test-asymmetry");

// Part Explorer
const partsListEl = document.getElementById("parts-list");
const btnPartsClear = document.getElementById("btn-parts-clear");
const partsFocusStatus = document.getElementById("parts-focus-status");

// --- THREE.JS SCENE SETUP ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0c1016);

const camera = new THREE.PerspectiveCamera(40, viewport.clientWidth / viewport.clientHeight, 0.1, 100);
camera.position.set(10.0, 8.0, 14.0);

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
renderer.setSize(viewport.clientWidth, viewport.clientHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
viewport.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.target.set(-6.0, 2.0, 0.0);
controls.minDistance = 2.0;
controls.maxDistance = 45.0;

// Lighting Setup
const ambientLight = new THREE.AmbientLight(0xdde6f0, 0.85);
scene.add(ambientLight);

const mainKeyLight = new THREE.DirectionalLight(0xffffff, 2.2);
mainKeyLight.position.set(2, 10, 8);
mainKeyLight.castShadow = true;
mainKeyLight.shadow.mapSize.width = 2048;
mainKeyLight.shadow.mapSize.height = 2048;
scene.add(mainKeyLight);

const fillLight = new THREE.DirectionalLight(0x70a5d8, 1.2);
fillLight.position.set(-14, 5, -8);
scene.add(fillLight);

const rimLight = new THREE.DirectionalLight(0xffffff, 1.4);
rimLight.position.set(8, -2, -10);
scene.add(rimLight);

// Build 3D Model
const mats = createFrontWingMaterials();
const wing = buildFrontWingAssembly(scene, mats);

// Simulation State
const state = {
  mode: "Z_MODE",
  speedKmh: 250.0,
  hydraulicBar: 200.0,
  flapAngleLhDeg: 24.0,
  flapAngleRhDeg: 24.0,
  targetFlapDeg: 24.0,
  failsafeActive: false,
  asymmetryAborted: false,
  downforceN: 4890.0,
  dragN: 1489.0,
  dragReductionPct: 0.0,
  copDriftMm: 0.0,
  exploded: false,
  explodeProgress: 0,
  wireframe: false,
  autoRotate: false,
  orbitSpeed: 1.0,
  lightIntensity: 1.1,
  isolatedPart: null,
};

const CFG = {
  wingAreaM2: 1.15,
  airDensity: 1.225,
  zModeAngle: 24.0,
  xModeAngle: 6.0,
  actuationRateDegS: 48.0,
  springSnapRateDegS: 90.0,
  minHydraulicBar: 120.0,
};

function updatePhysics(dt) {
  // Determine target flap angle based on safety interlocks
  let targetAngle = state.mode === "X_MODE" ? CFG.xModeAngle : CFG.zModeAngle;
  let rate = CFG.actuationRateDegS;

  if (state.hydraulicBar < CFG.minHydraulicBar) {
    state.failsafeActive = true;
    targetAngle = CFG.zModeAngle;
    rate = CFG.springSnapRateDegS;
  } else if (state.asymmetryAborted) {
    targetAngle = CFG.zModeAngle;
    rate = CFG.springSnapRateDegS;
  } else {
    state.failsafeActive = false;
  }

  state.targetFlapDeg = targetAngle;

  // Slew LH Flap
  const deltaLH = targetAngle - state.flapAngleLhDeg;
  const maxStepLH = rate * dt;
  if (Math.abs(deltaLH) <= maxStepLH) {
    state.flapAngleLhDeg = targetAngle;
  } else {
    state.flapAngleLhDeg += Math.sign(deltaLH) * maxStepLH;
  }

  // Slew RH Flap
  const deltaRH = targetAngle - state.flapAngleRhDeg;
  const maxStepRH = rate * dt;
  if (Math.abs(deltaRH) <= maxStepRH) {
    state.flapAngleRhDeg = targetAngle;
  } else {
    state.flapAngleRhDeg += Math.sign(deltaRH) * maxStepRH;
  }

  // Check bilateral asymmetry
  const asymmetry = Math.abs(state.flapAngleLhDeg - state.flapAngleRhDeg);
  if (asymmetry >= 1.5 && !state.asymmetryAborted) {
    state.asymmetryAborted = true;
  }

  // Calculate Aerodynamic Forces
  const avgAngle = (state.flapAngleLhDeg + state.flapAngleRhDeg) / 2.0;
  const vMs = state.speedKmh / 3.6;
  const q = 0.5 * CFG.airDensity * (vMs ** 2);

  const cl = 1.15 + (0.055 * avgAngle);
  const cd = 0.20 + (0.023 * avgAngle);

  state.downforceN = q * CFG.wingAreaM2 * cl;
  state.dragN = q * CFG.wingAreaM2 * cd;

  const cdZBaseline = 0.20 + (0.023 * CFG.zModeAngle);
  const dragZBaseline = q * CFG.wingAreaM2 * cdZBaseline;
  state.dragReductionPct = dragZBaseline > 0
    ? Math.max(0, ((dragZBaseline - state.dragN) / dragZBaseline) * 100.0)
    : 0.0;

  state.copDriftMm = (avgAngle - CFG.zModeAngle) * 1.2;

  // Update Telemetry Displays
  valDownforce.textContent = `${Math.round(state.downforceN).toLocaleString()} N`;
  const dfPct = Math.min(100, (state.downforceN / 8000.0) * 100);
  barDownforce.style.width = `${dfPct}%`;

  valDrag.textContent = `${Math.round(state.dragN).toLocaleString()} N`;
  const dragPct = Math.min(100, (state.dragN / 3000.0) * 100);
  barDrag.style.width = `${dragPct}%`;

  valMode.textContent = state.mode;
  valDragReduction.textContent = `${state.dragReductionPct.toFixed(1)}%`;
  valFlapAngle.textContent = `${avgAngle.toFixed(2)} °`;
  valCopDrift.textContent = `${state.copDriftMm.toFixed(2)} mm`;
  valHydraulic.textContent = `${state.hydraulicBar.toFixed(1)} bar`;

  // Update Status Pill
  if (state.failsafeActive) {
    statusPill.textContent = "SPRING FAILSAFE ACTIVE";
    statusPill.className = "pill fault";
    statusDetail.textContent = `Hydraulic Pressure: ${state.hydraulicBar.toFixed(0)} bar (< 120 bar) · Flaps Snapped to Z-Mode`;
  } else if (state.asymmetryAborted) {
    statusPill.textContent = "SECU ASYMMETRY ABORT";
    statusPill.className = "pill warn";
    statusDetail.textContent = `Bilateral Delta > 1.5° · Safety Lockout to Z-Mode Active`;
  } else if (state.mode === "X_MODE") {
    statusPill.textContent = "X-MODE LOW DRAG";
    statusPill.className = "pill active-mode";
    statusDetail.textContent = `Flaps: ${avgAngle.toFixed(1)}° · Drag Reduced by ${state.dragReductionPct.toFixed(1)}% · CoP Drift: ${state.copDriftMm.toFixed(1)} mm`;
  } else {
    statusPill.textContent = "Z-MODE ACTIVE";
    statusPill.className = "pill run";
    statusDetail.textContent = `Downforce: ${Math.round(state.downforceN)} N · Drag: ${Math.round(state.dragN)} N · AoA: ${avgAngle.toFixed(1)}°`;
  }

  // 3D Kinematics Articulation
  // Active flaps rotate around Z axis: from 0 (Z-Mode 24°) up to -0.314 rad (X-Mode 6°, 18° rotation)
  const angleDeltaRadLH = ((state.flapAngleLhDeg - CFG.zModeAngle) * Math.PI) / 180;
  const angleDeltaRadRH = ((state.flapAngleRhDeg - CFG.zModeAngle) * Math.PI) / 180;

  wing.activeFlapLH.rotation.z = angleDeltaRadLH;
  wing.activeFlapRH.rotation.z = angleDeltaRadRH;
}

// Exploded View Interpolation
function updateExplodedView(dt) {
  const target = state.exploded ? 1.0 : 0.0;
  state.explodeProgress += (target - state.explodeProgress) * Math.min(1.0, dt * 5.0);

  wing.explodedParts.forEach((part) => {
    const offset = part.direction.clone().multiplyScalar(part.maxDist * state.explodeProgress);
    part.mesh.position.copy(part.origin).add(offset);
  });
}

// Populate Part Explorer
function initPartExplorer() {
  const namedParts = [
    { name: "Body_FIS_Nosecone_Stage1", desc: "Carbon-Aramid honeycomb frontal crush cone (42.5 kJ)", mesh: wing.noseGroup.getObjectByName("Body_FIS_Nosecone_Stage1") },
    { name: "Body_FIS_Nosecone_Stage2", desc: "Secondary ultra-tough carbon-dyneema survival hull (>500 kN)", mesh: wing.noseGroup.getObjectByName("Body_FIS_Nosecone_Stage2") },
    { name: "Fastener_FIS_Stud_Ti_01", desc: "4x Grade 5 titanium M14 mounting studs (>350 kN pull-off)", mesh: wing.root.getObjectByName("Fastener_FIS_Stud_Ti_01") },
    { name: "Body_Wing_Mainplane_Element1", desc: "Fixed 1,850 mm carbon composite spoon mainplane", mesh: wing.mainplaneGroup },
    { name: "Pivot_Wing_Flap_LH_Element2", desc: "Intermediate multi-slotted carbon camber flap LH", mesh: wing.flap2LHGroup },
    { name: "Pivot_Wing_Flap_RH_Element2", desc: "Intermediate multi-slotted carbon camber flap RH", mesh: wing.flap2RHGroup },
    { name: "Pivot_Wing_ActiveFlap_LH_Element3", desc: "Active articulating flap LH (rotates 18° into X-Mode)", mesh: wing.activeFlapLH },
    { name: "Pivot_Wing_ActiveFlap_RH_Element3", desc: "Active articulating flap RH (synchronized dual-axle)", mesh: wing.activeFlapRH },
    { name: "Body_FWEP_LH", desc: "Inwash cambered carbon front wing endplate LH", mesh: wing.endplateLHGroup },
    { name: "Body_FWEP_RH", desc: "Inwash cambered carbon front wing endplate RH", mesh: wing.endplateRHGroup },
    { name: "Body_Diveplane_Micro_LH", desc: "FIA Article C3 micro diveplane (60 mm projection)", mesh: wing.endplateLHGroup.getObjectByName("Body_Diveplane_Micro_LH") },
    { name: "Body_Diveplane_Micro_RH", desc: "FIA Article C3 micro diveplane (60 mm projection)", mesh: wing.endplateRHGroup.getObjectByName("Body_Diveplane_Micro_RH") },
    { name: "Body_Actuator_Aero_EHA_LH", desc: "200 bar electro-hydraulic flap actuator with return spring", mesh: wing.actuatorLH },
    { name: "Body_Actuator_Aero_EHA_RH", desc: "200 bar electro-hydraulic flap actuator with return spring", mesh: wing.actuatorRH },
    { name: "Body_SlotGap_Separator_01", desc: "Aerodynamic titanium slot-gap bracket with Hall sensor", mesh: wing.root.getObjectByName("Body_SlotGap_Separator_01") },
    { name: "Body_Pitot_Tube_Array", desc: "Dual pitot-static sensor probe array", mesh: wing.noseGroup.getObjectByName("Body_Pitot_Tube_Array") },
    { name: "Badge_SREdesigns", desc: "Official SREdesigns front wing engineering serial plaque", mesh: wing.noseGroup.getObjectByName("Badge_SREdesigns") },
  ];

  partsListEl.innerHTML = "";
  namedParts.forEach((item) => {
    const div = document.createElement("div");
    div.className = "part-item";
    div.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 2px;">
        <span class="part-name">${item.name}</span>
        <span class="hint" style="font-size: 0.68rem;">${item.desc}</span>
      </div>
      <span class="part-badge">ISOLATE</span>
    `;

    div.addEventListener("click", () => {
      isolatePart(item);
      document.querySelectorAll(".part-item").forEach((el) => el.classList.remove("active"));
      div.classList.add("active");
    });

    partsListEl.appendChild(div);
  });
}

function isolatePart(item) {
  state.isolatedPart = item.name;
  partsFocusStatus.textContent = `Isolated: ${item.name}`;

  wing.root.traverse((child) => {
    if (child.isMesh) {
      if (!child.userData.origMat) {
        child.userData.origMat = child.material;
      }
      let isSelected = false;
      let curr = child;
      while (curr && curr !== wing.root) {
        if (curr === item.mesh || curr.name === item.name) {
          isSelected = true;
          break;
        }
        curr = curr.parent;
      }

      if (isSelected) {
        child.material = child.userData.origMat;
      } else {
        child.material = new THREE.MeshBasicMaterial({
          color: 0x223344,
          wireframe: true,
          transparent: true,
          opacity: 0.25,
        });
      }
    }
  });

  if (item.mesh) {
    const box = new THREE.Box3().setFromObject(item.mesh);
    const center = box.getCenter(new THREE.Vector3());
    controls.target.copy(center);
  }
}

function clearIsolation() {
  state.isolatedPart = null;
  partsFocusStatus.textContent = "All Parts Visible";
  document.querySelectorAll(".part-item").forEach((el) => el.classList.remove("active"));

  wing.root.traverse((child) => {
    if (child.isMesh && child.userData.origMat) {
      child.material = child.userData.origMat;
    }
  });
  controls.target.set(-6.0, 2.0, 0.0);
}

btnPartsClear.addEventListener("click", clearIsolation);

// Camera Presets
window.setCameraPreset = function (preset) {
  switch (preset) {
    case "iso":
      camera.position.set(10.0, 8.0, 14.0);
      controls.target.set(-6.0, 2.0, 0.0);
      state.exploded = false;
      break;
    case "front":
      camera.position.set(-18.0, 2.2, 0.0);
      controls.target.set(-6.0, 2.0, 0.0);
      state.exploded = false;
      break;
    case "side":
      camera.position.set(-6.0, 2.2, 16.0);
      controls.target.set(-6.0, 2.0, 0.0);
      state.exploded = false;
      break;
    case "top":
      camera.position.set(-6.0, 18.0, 0.0);
      controls.target.set(-6.0, 2.0, 0.0);
      state.exploded = false;
      break;
    case "exploded":
      camera.position.set(12.0, 10.0, 16.0);
      controls.target.set(-6.0, 2.0, 0.0);
      state.exploded = true;
      btnExplode.classList.add("active");
      break;
    case "active":
      camera.position.set(-8.0, 4.0, 8.0);
      controls.target.set(-6.0, 2.0, 0.0);
      state.mode = "X_MODE";
      btnToggleMode.textContent = "Engage Z-Mode";
      btnToggleMode.classList.add("active");
      break;
  }
  controls.update();
};

// Event Listeners
sliderSpeed.addEventListener("input", (e) => {
  state.speedKmh = parseFloat(e.target.value);
  valSpeedCtrl.textContent = `${Math.round(state.speedKmh)} km/h`;
});

sliderFlap.addEventListener("input", (e) => {
  const angle = parseFloat(e.target.value);
  state.flapAngleLhDeg = angle;
  state.flapAngleRhDeg = angle;
  valFlapCtrl.textContent = `${angle.toFixed(1)}°`;
});

btnToggleMode.addEventListener("click", () => {
  if (state.mode === "Z_MODE") {
    state.mode = "X_MODE";
    btnToggleMode.textContent = "Engage Z-Mode";
    btnToggleMode.classList.add("active");
  } else {
    state.mode = "Z_MODE";
    btnToggleMode.textContent = "Engage X-Mode";
    btnToggleMode.classList.remove("active");
  }
});

btnExplode.addEventListener("click", () => {
  state.exploded = !state.exploded;
  btnExplode.classList.toggle("active", state.exploded);
  btnExplode.textContent = state.exploded ? "Collapse View" : "Exploded View";
});

btnWireframe.addEventListener("click", () => {
  state.wireframe = !state.wireframe;
  btnWireframe.classList.toggle("active", state.wireframe);
  wing.root.traverse((c) => {
    if (c.isMesh && c.material) {
      c.material.wireframe = state.wireframe;
    }
  });
});

btnAutoRotate.addEventListener("click", () => {
  state.autoRotate = !state.autoRotate;
  controls.autoRotate = state.autoRotate;
  btnAutoRotate.classList.toggle("active", state.autoRotate);
});

sliderOrbitSpeed.addEventListener("input", (e) => {
  state.orbitSpeed = parseFloat(e.target.value);
  controls.autoRotateSpeed = state.orbitSpeed * 2.0;
  valOrbitSpeed.textContent = `${state.orbitSpeed.toFixed(1)}×`;
});

sliderCameraZoom.addEventListener("input", (e) => {
  const pct = parseFloat(e.target.value);
  valCameraZoom.textContent = `${Math.round(pct)}%`;
  const dist = 5.0 + ((100 - pct) / 100) * 25.0;
  const dir = camera.position.clone().sub(controls.target).normalize();
  camera.position.copy(controls.target).add(dir.multiplyScalar(dist));
});

sliderLabLight.addEventListener("input", (e) => {
  state.lightIntensity = parseFloat(e.target.value);
  mainKeyLight.intensity = 2.2 * state.lightIntensity;
  fillLight.intensity = 1.2 * state.lightIntensity;
  ambientLight.intensity = 0.85 * state.lightIntensity;
  valLabLight.textContent = `${state.lightIntensity.toFixed(1)}×`;
});

selectLabMood.addEventListener("change", (e) => {
  switch (e.target.value) {
    case "neutral":
      renderer.toneMappingExposure = 1.1;
      ambientLight.color.setHex(0xdde6f0);
      break;
    case "bright":
      renderer.toneMappingExposure = 1.45;
      ambientLight.color.setHex(0xffffff);
      break;
    case "dim":
      renderer.toneMappingExposure = 0.75;
      ambientLight.color.setHex(0x506075);
      break;
    case "cool":
      renderer.toneMappingExposure = 1.15;
      ambientLight.color.setHex(0x55bbff);
      break;
    case "warm":
      renderer.toneMappingExposure = 1.15;
      ambientLight.color.setHex(0xffbb77);
      break;
  }
});

btnViewReset.addEventListener("click", () => {
  window.setCameraPreset("iso");
});

// Presets
btnModeZ.addEventListener("click", () => {
  state.mode = "Z_MODE";
  state.hydraulicBar = 200.0;
  state.asymmetryAborted = false;
  btnToggleMode.textContent = "Engage X-Mode";
  btnToggleMode.classList.remove("active");
});

btnModeX.addEventListener("click", () => {
  state.mode = "X_MODE";
  state.hydraulicBar = 200.0;
  state.asymmetryAborted = false;
  btnToggleMode.textContent = "Engage Z-Mode";
  btnToggleMode.classList.add("active");
});

btnTestHydraulicFail.addEventListener("click", () => {
  state.hydraulicBar = 30.0; // Trigger loss of hydraulic pressure
});

btnTestAsymmetry.addEventListener("click", () => {
  state.flapAngleLhDeg = 20.0;
  state.flapAngleRhDeg = 17.5; // Inject 2.5° asymmetry
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

  updatePhysics(dt);
  updateExplodedView(dt);
  controls.update();
  renderer.render(scene, camera);
}
animate();
