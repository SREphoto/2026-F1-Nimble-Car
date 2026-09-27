/**
 * app.js — Main Application Orchestrator for 2026 F1 Monocoque & Master Datum Twin
 */

import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { createMonocoqueMaterials, buildSurvivalCell } from "./monocoque3d.js";

// DOM Elements
const viewport = document.getElementById("viewport3d");
const statusPill = document.getElementById("status-pill");
const statusDetail = document.getElementById("status-detail");
const viewportStatus = document.getElementById("viewport-status");

// Telemetry Elements
const valTwist = document.getElementById("val-twist");
const barTwist = document.getElementById("bar-twist");
const valLateralG = document.getElementById("val-lateral-g");
const valRollMoment = document.getElementById("val-roll-moment");
const valStiffness = document.getElementById("val-stiffness");
const valLateralCtrl = document.getElementById("val-lateral-ctrl");
const valSledCtrl = document.getElementById("val-sled-ctrl");

// Controls
const sliderLateralG = document.getElementById("slider-lateral-g");
const sliderPedalSled = document.getElementById("slider-pedal-sled");
const btnExplode = document.getElementById("btn-explode");
const btnWireframe = document.getElementById("btn-wireframe");
const btnHalo = document.getElementById("btn-halo");
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
const btnTestRollhoop = document.getElementById("btn-test-rollhoop");
const btnTestHalo = document.getElementById("btn-test-halo");
const btnTest4g = document.getElementById("btn-test-4g");
const btnTestHvFault = document.getElementById("btn-test-hv-fault");

// Part Explorer
const partsListEl = document.getElementById("parts-list");
const btnPartsClear = document.getElementById("btn-parts-clear");
const partsFocusStatus = document.getElementById("parts-focus-status");

// --- THREE.JS SCENE SETUP ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0c1016);

const camera = new THREE.PerspectiveCamera(40, viewport.clientWidth / viewport.clientHeight, 0.1, 100);
camera.position.set(16.0, 10.0, 18.0);

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
controls.target.set(6.5, 0.5, 0);
controls.minDistance = 2.0;
controls.maxDistance = 50.0;

// Lighting Setup
const ambientLight = new THREE.AmbientLight(0xdde6f0, 0.85);
scene.add(ambientLight);

const mainKeyLight = new THREE.DirectionalLight(0xffffff, 2.2);
mainKeyLight.position.set(12, 16, 12);
mainKeyLight.castShadow = true;
mainKeyLight.shadow.mapSize.width = 2048;
mainKeyLight.shadow.mapSize.height = 2048;
scene.add(mainKeyLight);

const fillLight = new THREE.DirectionalLight(0x70a5d8, 1.2);
fillLight.position.set(-8, 6, -6);
scene.add(fillLight);

const rimLight = new THREE.DirectionalLight(0xffffff, 1.4);
rimLight.position.set(6, -4, -10);
scene.add(rimLight);

// Build 3D Model
const mats = createMonocoqueMaterials();
const mono = buildSurvivalCell(scene, mats);

// Simulation State
const state = {
  lateralG: 0.0,
  rollMomentNm: 0.0,
  torsionalTwistDeg: 0.0,
  pedalSledMm: 75.0,
  hvSafe: true,
  exploded: false,
  explodeProgress: 0,
  wireframe: false,
  haloVisible: true,
  autoRotate: false,
  orbitSpeed: 1.0,
  lightIntensity: 1.1,
  isolatedPart: null,
};

// Physics Update
function updatePhysics(dt) {
  // Roll moment: lateral_g * 9.81 * 768 kg * 0.28 m
  state.rollMomentNm = Math.abs(state.lateralG) * 9.81 * 768.0 * 0.28;
  // Twist: rollMoment / 44,500 Nm/deg
  state.torsionalTwistDeg = state.rollMomentNm / 44500.0;

  // Update Telemetry
  valTwist.textContent = `${state.torsionalTwistDeg.toFixed(4)} °`;
  const twistPercent = Math.min(100, (state.torsionalTwistDeg / 0.35) * 100);
  barTwist.style.width = `${twistPercent}%`;

  valLateralG.textContent = `${state.lateralG.toFixed(2)} g`;
  valRollMoment.textContent = `${state.rollMomentNm.toFixed(0)} Nm`;
  valStiffness.textContent = "44.5 kNm/deg";

  // Update Pedal Sled Position in 3D (-3.2 is default center at 75 mm)
  // Travel: 0 to 150 mm -> -0.75 to +0.75 units offset in X
  const sledOffsetUnits = ((state.pedalSledMm - 75.0) / 100.0);
  mono.pedalSled.position.x = -3.2 + sledOffsetUnits;

  // Marshal LED Status
  if (state.hvSafe) {
    mono.ledLens.material = mats.statusLedGreen;
    statusPill.textContent = "800V SAFE";
    statusPill.className = "pill safe";
    statusDetail.textContent = `Torsional Rigidity: 44.5 kNm/deg · ${state.torsionalTwistDeg.toFixed(4)}° Twist`;
  } else {
    mono.ledLens.material = mats.statusLedRed;
    statusPill.textContent = "800V HAZARD";
    statusPill.className = "pill fault";
    statusDetail.textContent = "Pyrofuse Disconnect Active · High-Voltage Isolation Fault";
  }
}

// Exploded View Interpolation
function updateExplodedView(dt) {
  const target = state.exploded ? 1.0 : 0.0;
  state.explodeProgress += (target - state.explodeProgress) * Math.min(1.0, dt * 5.0);

  mono.explodedParts.forEach((part) => {
    const offset = part.direction.clone().multiplyScalar(part.maxDist * state.explodeProgress);
    part.mesh.position.copy(part.origin).add(offset);
  });
}

// Populate Part Explorer
function initPartExplorer() {
  const namedParts = [
    { name: "Body_SurvivalCell_Tub", desc: "Carbon/Zylon sandwich tub with 6.2mm ballistic armor", mesh: mono.tubGroup },
    { name: "Body_Safety_Halo_Titanium", desc: "Forged Grade 5 Ti-6Al-4V hoop (125 kN proof, 7.0 kg)", mesh: mono.haloGroup },
    { name: "Body_Safety_RollHoop_Airbox", desc: "172 kN primary rollover arch with combustion splitters", mesh: mono.rollHoopGroup },
    { name: "Body_Bulkhead_Front_Ti", desc: "Front chassis face with 4x FIS spigots & steering cradle", mesh: mono.frontBulkheadGroup },
    { name: "Body_Inboard_Wishbone_Clevis_Upper_LH", desc: "Upper wishbone forward & aft chassis pickup spigots", mesh: mono.tubGroup.getObjectByName("Body_Inboard_Wishbone_Clevis_Upper_LH") },
    { name: "Body_Inboard_Wishbone_Clevis_Lower_LH", desc: "Lower wishbone pickups with 14.2° anti-dive rake", mesh: mono.tubGroup.getObjectByName("Body_Inboard_Wishbone_Clevis_Lower_LH") },
    { name: "Body_BeadSeat_Shell", desc: "Driver anatomical bead seat with 4x Kevlar 15kN loops", mesh: mono.cockpitInteriorGroup.getObjectByName("Body_BeadSeat_Shell") },
    { name: "Body_Headrest_ConforFoam", desc: "Viscoelastic energy-absorbing safety headrest", mesh: mono.cockpitInteriorGroup.getObjectByName("Body_Headrest_ConforFoam") },
    { name: "Body_PedalBox_Sled", desc: "Fore-aft adjustable sled (0-150mm) with 180kgf brake cell", mesh: mono.pedalSled },
    { name: "UI_LCD_Cockpit", desc: "McLaren Applied PCU-8D transflective telemetry screen", mesh: mono.cockpitInteriorGroup.getObjectByName("UI_LCD_Cockpit") },
    { name: "Body_Bulkhead_Rear_Ti", desc: "Rear engine bulkhead with 6x M12 studs for 1.6L V6 ICE", mesh: mono.rearBulkheadGroup },
    { name: "Badge_SREdesigns", desc: "Official SREdesigns chassis builder serial number plaque", mesh: mono.root.getObjectByName("Badge_SREdesigns") },
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

  mono.root.traverse((child) => {
    if (child.isMesh) {
      if (!child.userData.origMat) {
        child.userData.origMat = child.material;
      }
      let isSelected = false;
      let curr = child;
      while (curr && curr !== mono.root) {
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

  const box = new THREE.Box3().setFromObject(item.mesh);
  const center = box.getCenter(new THREE.Vector3());
  controls.target.copy(center);
}

function clearIsolation() {
  state.isolatedPart = null;
  partsFocusStatus.textContent = "All Parts Visible";
  document.querySelectorAll(".part-item").forEach((el) => el.classList.remove("active"));

  mono.root.traverse((child) => {
    if (child.isMesh && child.userData.origMat) {
      child.material = child.userData.origMat;
    }
  });
  controls.target.set(6.5, 0.5, 0);
}

btnPartsClear.addEventListener("click", clearIsolation);

// Camera Presets
window.setCameraPreset = function (preset) {
  switch (preset) {
    case "iso":
      camera.position.set(16.0, 10.0, 18.0);
      controls.target.set(6.5, 0.5, 0);
      state.exploded = false;
      break;
    case "front":
      camera.position.set(-16.0, 2.0, 0.0);
      controls.target.set(6.5, 0.5, 0);
      state.exploded = false;
      break;
    case "side":
      camera.position.set(6.5, 2.0, 18.0);
      controls.target.set(6.5, 0.5, 0);
      state.exploded = false;
      break;
    case "top":
      camera.position.set(6.5, 22.0, 0.0);
      controls.target.set(6.5, 0.5, 0);
      state.exploded = false;
      break;
    case "exploded":
      camera.position.set(18.0, 14.0, 20.0);
      controls.target.set(6.5, 0.5, 0);
      state.exploded = true;
      btnExplode.classList.add("active");
      break;
    case "active":
      camera.position.set(10.0, 5.0, 8.0);
      controls.target.set(8.0, 1.5, 0);
      state.lateralG = 4.2;
      break;
  }
  controls.update();
};

// Event Listeners
sliderLateralG.addEventListener("input", (e) => {
  state.lateralG = parseFloat(e.target.value);
  valLateralCtrl.textContent = `${state.lateralG.toFixed(1)} g`;
});

sliderPedalSled.addEventListener("input", (e) => {
  state.pedalSledMm = parseFloat(e.target.value);
  valSledCtrl.textContent = `${Math.round(state.pedalSledMm)} mm`;
});

btnExplode.addEventListener("click", () => {
  state.exploded = !state.exploded;
  btnExplode.classList.toggle("active", state.exploded);
  btnExplode.textContent = state.exploded ? "Collapse View" : "Exploded View";
});

btnWireframe.addEventListener("click", () => {
  state.wireframe = !state.wireframe;
  btnWireframe.classList.toggle("active", state.wireframe);
  mono.root.traverse((c) => {
    if (c.isMesh && c.material) {
      c.material.wireframe = state.wireframe;
    }
  });
});

btnHalo.addEventListener("click", () => {
  state.haloVisible = !state.haloVisible;
  mono.haloGroup.visible = state.haloVisible;
  btnHalo.classList.toggle("active", state.haloVisible);
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
  const dist = 5.0 + ((100 - pct) / 100) * 30.0;
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
btnTestRollhoop.addEventListener("click", () => {
  statusPill.textContent = "172 kN PROOF LOAD";
  statusPill.className = "pill safe";
  statusDetail.textContent = "FIA C13: 172 kN applied · 18.7 mm deflection (<25 mm pass)";
});

btnTestHalo.addEventListener("click", () => {
  statusPill.textContent = "125 kN HALO TEST";
  statusPill.className = "pill safe";
  statusDetail.textContent = "FIA 8869-2018: Multi-axis 125 kN proof passed with zero yield";
});

btnTest4g.addEventListener("click", () => {
  state.lateralG = 4.0;
  sliderLateralG.value = 4.0;
  valLateralCtrl.textContent = "4.0 g";
});

btnTestHvFault.addEventListener("click", () => {
  state.hvSafe = !state.hvSafe;
  btnTestHvFault.textContent = state.hvSafe ? "Simulate HV Pyrofuse Fault" : "Reset HV Isolation";
  btnTestHvFault.classList.toggle("btn-danger", state.hvSafe);
  btnTestHvFault.classList.toggle("btn-primary", !state.hvSafe);
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
