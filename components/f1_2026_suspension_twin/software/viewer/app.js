/**
 * app.js — Main Application Orchestrator for 2026 F1 Front Suspension & Steering Linkage Digital Twin
 */

import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { createSuspensionMaterials, buildFrontSuspension } from "./suspension3d.js";

// DOM Elements
const viewport = document.getElementById("viewport3d");
const statusPill = document.getElementById("status-pill");
const statusDetail = document.getElementById("status-detail");
const viewportStatus = document.getElementById("viewport-status");

// Telemetry Elements
const valTravel = document.getElementById("val-travel");
const barTravel = document.getElementById("bar-travel");
const valPullrod = document.getElementById("val-pullrod");
const valCamber = document.getElementById("val-camber");
const valSteer = document.getElementById("val-steer");
const valAntidive = document.getElementById("val-antidive");
const sliderTravel = document.getElementById("slider-travel");
const valTravelCtrl = document.getElementById("val-travel-ctrl");
const sliderSteer = document.getElementById("slider-steer");
const valSteerCtrl = document.getElementById("val-steer-ctrl");

// Controls
const btnExplode = document.getElementById("btn-explode");
const btnWireframe = document.getElementById("btn-wireframe");
const btnWheel = document.getElementById("btn-wheel");
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
const btnTestCurb = document.getElementById("btn-test-curb");
const btnTestLock = document.getElementById("btn-test-lock");
const btnTestBrakeDive = document.getElementById("btn-test-brake-dive");
const btnTestResetKinematics = document.getElementById("btn-test-reset-kinematics");

// Part Explorer
const partsListEl = document.getElementById("parts-list");
const btnPartsClear = document.getElementById("btn-parts-clear");
const partsFocusStatus = document.getElementById("parts-focus-status");

// --- THREE.JS SCENE SETUP ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0c1016);

const camera = new THREE.PerspectiveCamera(40, viewport.clientWidth / viewport.clientHeight, 0.1, 100);
camera.position.set(6.5, 5.5, 9.5);

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
controls.target.set(0.0, 2.8, 4.4);
controls.minDistance = 1.5;
controls.maxDistance = 35.0;

// Lighting Setup
const ambientLight = new THREE.AmbientLight(0xdde6f0, 0.85);
scene.add(ambientLight);

const mainKeyLight = new THREE.DirectionalLight(0xffffff, 2.2);
mainKeyLight.position.set(6, 8, 6);
mainKeyLight.castShadow = true;
mainKeyLight.shadow.mapSize.width = 2048;
mainKeyLight.shadow.mapSize.height = 2048;
scene.add(mainKeyLight);

const fillLight = new THREE.DirectionalLight(0x70a5d8, 1.2);
fillLight.position.set(-6, 4, -4);
scene.add(fillLight);

const rimLight = new THREE.DirectionalLight(0xffffff, 1.4);
rimLight.position.set(4, -3, -6);
scene.add(rimLight);

// Build 3D Model
const mats = createSuspensionMaterials();
const susp = buildFrontSuspension(scene, mats);

// Simulation State
const state = {
  bumpMm: 0.0,
  steerDeg: 0.0,
  verticalLoadG: 1.0,
  brakingG: 0.0,
  camberDeg: -3.20,
  pullrodTensionKn: 3.12,
  pitchReductionMm: 0.0,
  exploded: false,
  explodeProgress: 0,
  wireframe: false,
  wheelVisible: true,
  autoRotate: false,
  orbitSpeed: 1.0,
  lightIntensity: 1.1,
  isolatedPart: null,
};

// Pure Python Controller Mirroring
const CFG = {
  staticCamberDeg: -3.20,
  camberGainPerMm: -0.045,
  motionRatio: 0.82,
  pullrodAngleDeg: 28.5,
  antiDivePct: 38.5,
  cornerSprungMassKg: 185.0,
};

function updatePhysics(dt) {
  // 1. Dynamic camber recovery in bump
  state.camberDeg = CFG.staticCamberDeg + (CFG.camberGainPerMm * state.bumpMm);

  // 2. Pull-rod tensile load calculation
  const normalForceN = state.verticalLoadG * CFG.cornerSprungMassKg * 9.81;
  const sinAngle = Math.sin((CFG.pullrodAngleDeg * Math.PI) / 180);
  const pullrodN = (normalForceN * CFG.motionRatio) / sinAngle;
  state.pullrodTensionKn = pullrodN / 1000.0;

  // 3. Anti-dive pitch compensation under braking
  const uncompensatedPitchMm = state.brakingG * 6.2;
  state.pitchReductionMm = uncompensatedPitchMm * (CFG.antiDivePct / 100.0);

  // Update Telemetry Display
  valTravel.textContent = `${state.bumpMm >= 0 ? "+" : ""}${state.bumpMm.toFixed(1)} mm`;
  const travelPct = Math.max(0, Math.min(100, ((state.bumpMm + 25) / 60) * 100));
  barTravel.style.width = `${travelPct}%`;

  valPullrod.textContent = `${state.pullrodTensionKn.toFixed(2)} kN`;
  valCamber.textContent = `${state.camberDeg.toFixed(3)} °`;
  valSteer.textContent = `${state.steerDeg.toFixed(2)} °`;
  valAntidive.textContent = `${CFG.antiDivePct.toFixed(1)}% (${state.pitchReductionMm.toFixed(1)} mm)`;

  // Update Status Pill
  if (state.pullrodTensionKn > 18.0) {
    statusPill.textContent = "CURB IMPACT LOAD";
    statusPill.className = "pill fault";
    statusDetail.textContent = `High Tensile Load: ${state.pullrodTensionKn.toFixed(1)} kN · Peak Stator Compression`;
  } else if (Math.abs(state.steerDeg) > 15.0) {
    statusPill.textContent = "HIGH STEER LOCK";
    statusPill.className = "pill warn";
    statusDetail.textContent = `Ackermann Steer Angle: ${state.steerDeg.toFixed(1)}° · Scuff Rate Nominal`;
  } else {
    statusPill.textContent = "KINEMATICS NOMINAL";
    statusPill.className = "pill run";
    statusDetail.textContent = `Travel: ${state.bumpMm.toFixed(1)} mm · Camber: ${state.camberDeg.toFixed(2)}° · Pull-Rod: ${state.pullrodTensionKn.toFixed(1)} kN`;
  }

  // 3D Kinematics Articulation
  const bumpOffsetUnits = state.bumpMm * 0.025; // 25mm bump = ~0.625 units
  const steerRad = (state.steerDeg * Math.PI) / 180;
  const camberDeltaRad = ((state.camberDeg - CFG.staticCamberDeg) * Math.PI) / 180;

  // Move outboard corner vertically & rotate steer + camber
  susp.cornerGroup.position.y = bumpOffsetUnits;
  susp.cornerGroup.rotation.y = steerRad;
  susp.cornerGroup.rotation.z = camberDeltaRad;

  // Articulate Wishbones
  // Upper wishbone rotates slightly in Z around inboard line
  susp.upperWishboneGroup.rotation.x = -bumpOffsetUnits * 0.15;
  susp.lowerWishboneGroup.rotation.x = -bumpOffsetUnits * 0.15;

  // Rotate Rocker Bellcrank
  susp.rockerGroup.rotation.x = -bumpOffsetUnits * 0.85;

  // Pull-rod adjusts inclination
  susp.pullRodGroup.rotation.x = -bumpOffsetUnits * 0.18;

  // Tie-rod steers with corner
  susp.tieRodGroup.rotation.y = steerRad * 0.85;
}

// Exploded View Interpolation
function updateExplodedView(dt) {
  const target = state.exploded ? 1.0 : 0.0;
  state.explodeProgress += (target - state.explodeProgress) * Math.min(1.0, dt * 5.0);

  susp.explodedParts.forEach((part) => {
    const offset = part.direction.clone().multiplyScalar(part.maxDist * state.explodeProgress);
    part.mesh.position.copy(part.origin).add(offset);
  });
}

// Populate Part Explorer
function initPartExplorer() {
  const namedParts = [
    { name: "Pivot_Wishbone_Upper_FrontLH", desc: "Carbon fiber aero profile A-arm with M10 uniball joint", mesh: susp.upperWishboneGroup },
    { name: "Pivot_Wishbone_Lower_FrontLH", desc: "Lower A-arm with 14.2° anti-dive rake & M12 spherical joint", mesh: susp.lowerWishboneGroup },
    { name: "Pivot_Suspension_PullRod_FrontLH", desc: "Carbon fiber tension strut with Grade 5 Ti clevis forks", mesh: susp.pullRodGroup },
    { name: "Pivot_Suspension_Rocker_Bellcrank", desc: "CNC Ti-6Al-4V inboard bellcrank driving torsion bar & damper", mesh: susp.rockerGroup },
    { name: "Pivot_Steering_TieRod_FrontLH", desc: "HPAS steering track rod with high-misalignment uniball ends", mesh: susp.tieRodGroup },
    { name: "Body_Upright_Carrier_FrontLH_Titanium", desc: "5-axis CNC titanium front upright wheel carrier", mesh: susp.cornerGroup.getObjectByName("Body_Upright_Carrier_FrontLH_Titanium") },
    { name: "Pivot_Brake_Disc_Ventilated_Front", desc: "345 mm x 34 mm ventilated carbon-carbon disc (1,400+ holes)", mesh: susp.cornerGroup.getObjectByName("Pivot_Brake_Disc_Ventilated_Front") },
    { name: "Body_Brake_Caliper_Monobloc_Front", desc: "Al-Li 2099 monobloc caliper with castellated pistons", mesh: susp.cornerGroup.getObjectByName("Body_Brake_Caliper_Monobloc_Front") },
    { name: "Pivot_Wheel_Magnesium_BBS_Front", desc: "18-inch BBS forged magnesium racing wheel rim", mesh: susp.cornerGroup.getObjectByName("Pivot_Wheel_Magnesium_BBS_Front") },
    { name: "Body_WheelWake_Deflector_FrontLH", desc: "Upright-mounted carbon fiber wheel wake control deflector", mesh: susp.cornerGroup.getObjectByName("Body_WheelWake_Deflector_FrontLH") },
    { name: "Body_TorsionBar_Front_Maraging300", desc: "Maraging 300 steel quill shaft torsion spring", mesh: susp.rockerGroup.getObjectByName("Body_TorsionBar_Front_Maraging300") },
    { name: "Body_HeaveDamper_Front_Hydraulic", desc: "4-way adjustable hydraulic heave and pitch damper", mesh: susp.rockerGroup.getObjectByName("Body_HeaveDamper_Front_Hydraulic") },
    { name: "Body_WheelTether_Zylon_01", desc: "7.0 kJ high-tenacity braided Zylon wheel safety tether", mesh: susp.root.getObjectByName("Body_WheelTether_Zylon_01") },
    { name: "Badge_SREdesigns", desc: "Official SREdesigns suspension engineering serial plaque", mesh: susp.root.getObjectByName("Badge_SREdesigns") },
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

  susp.root.traverse((child) => {
    if (child.isMesh) {
      if (!child.userData.origMat) {
        child.userData.origMat = child.material;
      }
      let isSelected = false;
      let curr = child;
      while (curr && curr !== susp.root) {
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

  susp.root.traverse((child) => {
    if (child.isMesh && child.userData.origMat) {
      child.material = child.userData.origMat;
    }
  });
  controls.target.set(0.0, 2.8, 4.4);
}

btnPartsClear.addEventListener("click", clearIsolation);

// Camera Presets
window.setCameraPreset = function (preset) {
  switch (preset) {
    case "iso":
      camera.position.set(6.5, 5.5, 9.5);
      controls.target.set(0.0, 2.8, 4.4);
      state.exploded = false;
      break;
    case "front":
      camera.position.set(-8.0, 2.8, 4.4);
      controls.target.set(0.0, 2.8, 4.4);
      state.exploded = false;
      break;
    case "side":
      camera.position.set(0.0, 2.8, 12.0);
      controls.target.set(0.0, 2.8, 4.4);
      state.exploded = false;
      break;
    case "top":
      camera.position.set(0.0, 12.0, 4.4);
      controls.target.set(0.0, 2.8, 4.4);
      state.exploded = false;
      break;
    case "exploded":
      camera.position.set(8.5, 7.0, 11.0);
      controls.target.set(0.0, 2.8, 4.4);
      state.exploded = true;
      btnExplode.classList.add("active");
      break;
    case "active":
      camera.position.set(4.5, 4.0, 8.0);
      controls.target.set(0.0, 2.8, 5.5);
      state.bumpMm = 18.0;
      state.steerDeg = 12.0;
      state.verticalLoadG = 3.5;
      break;
  }
  controls.update();
};

// Event Listeners
sliderTravel.addEventListener("input", (e) => {
  state.bumpMm = parseFloat(e.target.value);
  valTravelCtrl.textContent = `${state.bumpMm >= 0 ? "+" : ""}${Math.round(state.bumpMm)} mm`;
});

sliderSteer.addEventListener("input", (e) => {
  state.steerDeg = parseFloat(e.target.value);
  valSteerCtrl.textContent = `${state.steerDeg >= 0 ? "+" : ""}${state.steerDeg.toFixed(1)}°`;
});

btnExplode.addEventListener("click", () => {
  state.exploded = !state.exploded;
  btnExplode.classList.toggle("active", state.exploded);
  btnExplode.textContent = state.exploded ? "Collapse View" : "Exploded View";
});

btnWireframe.addEventListener("click", () => {
  state.wireframe = !state.wireframe;
  btnWireframe.classList.toggle("active", state.wireframe);
  susp.root.traverse((c) => {
    if (c.isMesh && c.material) {
      c.material.wireframe = state.wireframe;
    }
  });
});

btnWheel.addEventListener("click", () => {
  state.wheelVisible = !state.wheelVisible;
  susp.wheelRim.visible = state.wheelVisible;
  btnWheel.classList.toggle("active", state.wheelVisible);
  btnWheel.textContent = state.wheelVisible ? "Hide Wheel" : "Show Wheel";
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
  const dist = 3.0 + ((100 - pct) / 100) * 15.0;
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

// Dynamic Kinematic Presets
btnTestCurb.addEventListener("click", () => {
  state.bumpMm = 30.0;
  sliderTravel.value = 30;
  valTravelCtrl.textContent = "+30 mm";
  state.verticalLoadG = 5.0;
  state.brakingG = 0.5;
});

btnTestLock.addEventListener("click", () => {
  state.steerDeg = -18.5;
  sliderSteer.value = -18.5;
  valSteerCtrl.textContent = "-18.5°";
});

btnTestBrakeDive.addEventListener("click", () => {
  state.bumpMm = 15.0;
  sliderTravel.value = 15;
  valTravelCtrl.textContent = "+15 mm";
  state.brakingG = 5.0;
  state.verticalLoadG = 3.2;
});

btnTestResetKinematics.addEventListener("click", () => {
  state.bumpMm = 0.0;
  sliderTravel.value = 0;
  valTravelCtrl.textContent = "0 mm";
  state.steerDeg = 0.0;
  sliderSteer.value = 0;
  valSteerCtrl.textContent = "0.0°";
  state.verticalLoadG = 1.0;
  state.brakingG = 0.0;
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
