/**
 * app.js — Main Application Orchestrator for 2026 F1 Front Brake Corner Digital Twin
 */

import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { createMaterials, buildFrontBrakeCorner } from "./f1_brake3d.js";
import { sfx } from "./sfx.js";

// DOM Elements
const viewport = document.getElementById("viewport3d");
const statusPill = document.getElementById("status-pill");
const statusDetail = document.getElementById("status-detail");
const viewportStatus = document.getElementById("viewport-status");

// Telemetry Elements
const valPressure = document.getElementById("val-pressure");
const barPressure = document.getElementById("bar-pressure");
const valTemp = document.getElementById("val-temp");
const barTemp = document.getElementById("bar-temp");
const valClamp = document.getElementById("val-clamp");
const valTorque = document.getElementById("val-torque");
const valMu = document.getElementById("val-mu");
const valRollback = document.getElementById("val-rollback");
const valBlackbody = document.getElementById("val-blackbody");
const valPedalCtrl = document.getElementById("val-pedal-ctrl");
const valSpeedCtrl = document.getElementById("val-speed-ctrl");

// Controls
const sliderPedal = document.getElementById("slider-pedal");
const sliderSpeed = document.getElementById("slider-speed");
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
const btnSfxMute = document.getElementById("btn-sfx-mute");

// Presets
const btnTest320 = document.getElementById("btn-test-320");
const btnTestDyno = document.getElementById("btn-test-dyno");
const btnTestWarm = document.getElementById("btn-test-warm");
const btnTestFailsafe = document.getElementById("btn-test-failsafe");
const btnWheelGun = document.getElementById("btn-wheel-gun");
const wheelGunStatus = document.getElementById("wheel-gun-status");

// Part Explorer
const partsListEl = document.getElementById("parts-list");
const btnPartsClear = document.getElementById("btn-parts-clear");
const partsFocusStatus = document.getElementById("parts-focus-status");

// --- THREE.JS SCENE SETUP ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0c1016);

const camera = new THREE.PerspectiveCamera(42, viewport.clientWidth / viewport.clientHeight, 0.1, 50);
camera.position.set(2.8, 1.8, 3.2);

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
controls.target.set(0, 0, 0);
controls.minDistance = 1.0;
controls.maxDistance = 12.0;

// --- STUDIO LIGHTING SETUP ---
const ambientLight = new THREE.AmbientLight(0xdde6f0, 0.85);
scene.add(ambientLight);

const mainKeyLight = new THREE.DirectionalLight(0xffffff, 2.2);
mainKeyLight.position.set(4, 6, 4);
mainKeyLight.castShadow = true;
mainKeyLight.shadow.mapSize.width = 2048;
mainKeyLight.shadow.mapSize.height = 2048;
mainKeyLight.shadow.bias = -0.0001;
scene.add(mainKeyLight);

const fillLight = new THREE.DirectionalLight(0x70a5d8, 1.2);
fillLight.position.set(-5, 2, -2);
scene.add(fillLight);

const rimLight = new THREE.DirectionalLight(0xffffff, 1.5);
rimLight.position.set(0, -3, -4);
scene.add(rimLight);

// Build 3D Corner Model
const mats = createMaterials();
const corner = buildFrontBrakeCorner(scene, mats);

// Simulation State
const state = {
  pedalKgf: 0,
  speedKmh: 0,
  linePressureBar: 0,
  discTempC: 25.0,
  pistonStrokeMm: 0,
  sealRollbackActive: true,
  bbwFailsafe: false,
  exploded: false,
  explodeProgress: 0,
  wireframe: false,
  wheelVisible: false,
  autoRotate: false,
  orbitSpeed: 1.0,
  lightIntensity: 1.1,
  isolatedPart: null,
};

// --- SIMULATION PHYSICS ENGINE ---
function calculateFrictionCoeff(tempC) {
  if (tempC < 200.0) return 0.22 + 0.10 * (tempC / 200.0);
  if (tempC <= 800.0) return 0.32 + 0.20 * Math.sin(((tempC - 200.0) / 600.0) * Math.PI * 0.5);
  if (tempC <= 1200.0) return 0.52 - 0.16 * ((tempC - 800.0) / 400.0);
  return 0.36;
}

function updatePhysics(dt) {
  state.linePressureBar = (state.pedalKgf / 180) * 180;

  const pistonAreaM2 = 0.002511;
  const linePa = state.linePressureBar * 1e5;
  const clampingForceN = state.linePressureBar > 2.0 ? linePa * pistonAreaM2 : 0;
  const clampingForceKn = clampingForceN / 1000;

  if (state.linePressureBar > 2.0) {
    state.pistonStrokeMm = 0.15 + (state.linePressureBar / 180) * 0.85;
    state.sealRollbackActive = false;
  } else {
    state.pistonStrokeMm = 0;
    state.sealRollbackActive = true;
  }

  const strokeOffsetUnits = state.pistonStrokeMm * 0.01;
  corner.pistonsInboard.forEach((p) => {
    p.position.z = 0.28 - strokeOffsetUnits;
  });
  corner.pistonsOutboard.forEach((p) => {
    p.position.z = -0.28 + strokeOffsetUnits;
  });

  const mu = calculateFrictionCoeff(state.discTempC);
  const effectiveRadiusM = 0.135;
  const brakingTorqueNm = 2.0 * mu * clampingForceN * effectiveRadiusM;

  const tyreRadiusM = 0.355;
  const vMs = (state.speedKmh * 1000) / 3600;
  const omegaWheel = vMs / tyreRadiusM;

  if (brakingTorqueNm > 0 && state.speedKmh > 0) {
    const heatInWatts = brakingTorqueNm * omegaWheel;
    const deltaT = (heatInWatts / 1988) * dt;
    state.discTempC += deltaT;

    const decelMs2 = (brakingTorqueNm / tyreRadiusM) / 200.0;
    const newVMs = Math.max(0, vMs - decelMs2 * dt);
    state.speedKmh = (newVMs * 3600) / 1000;
    sliderSpeed.value = Math.round(state.speedKmh);
    valSpeedCtrl.textContent = `${Math.round(state.speedKmh)} km/h`;
  }

  const tempK = state.discTempC + 273.15;
  const ambK = 25.0 + 273.15;
  const qRad = 0.88 * 5.670374e-8 * 0.17 * (Math.pow(tempK, 4) - Math.pow(ambK, 4));
  const qConv = (35.0 + 6.0 * Math.pow(vMs, 0.8)) * 0.65 * (state.discTempC - 25.0);
  const coolDeltaT = ((qRad + Math.max(0, qConv)) / 1988) * dt;
  state.discTempC = Math.max(25.0, state.discTempC - coolDeltaT);

  if (state.speedKmh > 0) {
    corner.spindleGroup.rotation.z -= omegaWheel * dt;
  }

  let glowColor = new THREE.Color(0x000000);
  let glowIntensity = 0.0;
  let blackbodyLabel = "Dark Ambient";

  if (state.discTempC > 500.0) {
    glowIntensity = Math.min(1.0, (state.discTempC - 500.0) / 550.0);
    if (state.discTempC < 720.0) {
      glowColor.setHex(0xff2a00);
      blackbodyLabel = "Cherry Red (~650°C)";
    } else if (state.discTempC < 920.0) {
      glowColor.setHex(0xff7000);
      blackbodyLabel = "Fiery Orange (~800°C)";
    } else {
      glowColor.setHex(0xffc840);
      blackbodyLabel = "Incandescent Yellow (>950°C)";
    }
  }

  mats.carbonDisc.emissive = glowColor;
  mats.carbonDisc.emissiveIntensity = glowIntensity * 1.8;
  mats.carbonTrack.emissive = glowColor;
  mats.carbonTrack.emissiveIntensity = glowIntensity * 2.2;

  sfx.updateDynamics(state.speedKmh, state.linePressureBar, state.discTempC);

  valPressure.textContent = `${state.linePressureBar.toFixed(1)} bar`;
  barPressure.style.width = `${(state.linePressureBar / 180) * 100}%`;

  valTemp.textContent = `${state.discTempC.toFixed(1)} °C`;
  const tempPercent = Math.min(100, Math.max(0, ((state.discTempC - 25) / 1000) * 100));
  barTemp.style.width = `${tempPercent}%`;

  if (state.discTempC > 600) {
    valTemp.classList.add("hot");
  } else {
    valTemp.classList.remove("hot");
  }

  valClamp.textContent = `${clampingForceKn.toFixed(2)} kN`;
  valTorque.textContent = `${brakingTorqueNm.toFixed(0)} Nm`;
  valMu.textContent = mu.toFixed(3);
  valRollback.textContent = state.sealRollbackActive ? "ACTIVE (0.15 mm)" : "DISENGAGED (CLAMPING)";
  valRollback.style.color = state.sealRollbackActive ? "var(--green)" : "var(--cyan)";
  valBlackbody.textContent = blackbodyLabel;

  if (state.bbwFailsafe) {
    statusPill.textContent = "BBW FAILSAFE";
    statusPill.className = "pill fault";
    statusDetail.textContent = "Mechanical bypass active · 100% pedal authority";
  } else if (state.discTempC > 650) {
    statusPill.textContent = "THERMAL LOAD";
    statusPill.className = "pill hot";
    statusDetail.textContent = `${state.discTempC.toFixed(0)}°C · High blackbody radiation`;
  } else if (state.linePressureBar > 10) {
    statusPill.textContent = "BRAKING";
    statusPill.className = "pill run";
    statusDetail.textContent = `${state.linePressureBar.toFixed(0)} bar · ${brakingTorqueNm.toFixed(0)} Nm`;
  } else {
    statusPill.textContent = "READY";
    statusPill.className = "pill";
    statusDetail.textContent = `0 bar · ${state.discTempC.toFixed(0)}°C · ${state.speedKmh.toFixed(0)} km/h`;
  }
}

// --- EXPLODED VIEW SMOOTH INTERPOLATION ---
function updateExplodedView(dt) {
  const target = state.exploded ? 1.0 : 0.0;
  state.explodeProgress += (target - state.explodeProgress) * Math.min(1.0, dt * 5.0);

  corner.explodedParts.forEach((part) => {
    const offset = part.direction.clone().multiplyScalar(part.maxDist * state.explodeProgress);
    part.mesh.position.copy(part.origin).add(offset);
  });
}

// --- POPULATE PART EXPLORER ---
function initPartExplorer() {
  const namedParts = [
    { name: "Pivot_Brake_Disc_Ventilated_Front", desc: "PAN C/C Ø345mm x 34mm with 1,400 chevron holes", mesh: corner.discGroup },
    { name: "Pivot_Brake_Bell_Floating_Titanium", desc: "Forged Ti-6Al-4V mounting hat with 12 CNC scallops", mesh: corner.bellGroup },
    { name: "Pivot_Drive_Bobbins_Floating_Assembly", desc: "12x Stepped Ti bobbins + Belleville washers + M6 bolts", mesh: corner.spindleGroup.getObjectByName("Pivot_Drive_Bobbins_Floating_Assembly") },
    { name: "Body_Brake_Caliper_Monobloc_Front", desc: "Forged Al-Li 2099 monobloc with 2x bridge arches", mesh: corner.caliperGroup },
    { name: "Pivot_Piston_Hydraulic_Front_Inboard_01", desc: "Ø27mm Ti-6Al-4V + DLC with 10-tooth castellated crown", mesh: corner.pistonsInboard[0] },
    { name: "Pivot_Piston_Hydraulic_Front_Inboard_02", desc: "Ø32mm Ti-6Al-4V + DLC intermediate piston", mesh: corner.pistonsInboard[1] },
    { name: "Pivot_Piston_Hydraulic_Front_Inboard_03", desc: "Ø38mm Ti-6Al-4V + DLC trailing piston", mesh: corner.pistonsInboard[2] },
    { name: "Pivot_Brake_Pad_Carbon_Inboard", desc: "PAN C/C pad + titanium backing plate & stress slots", mesh: corner.caliperGroup.getObjectByName("Pivot_Brake_Pad_Carbon_Inboard") },
    { name: "Pivot_Brake_Pad_Carbon_Outboard", desc: "PAN C/C pad + titanium backing plate & stress slots", mesh: corner.caliperGroup.getObjectByName("Pivot_Brake_Pad_Carbon_Outboard") },
    { name: "Body_Brake_Duct_AirScoop_Carbon", desc: "Forward aerodynamic carbon scoop capturing high total P", mesh: corner.ductGroup.getObjectByName("Body_Brake_Duct_AirScoop_Carbon") },
    { name: "Body_Brake_Duct_StatorPlate_Carbon", desc: "Sealing stator disc forcing air through 1,400 holes", mesh: corner.ductGroup.getObjectByName("Body_Brake_Duct_StatorPlate_Carbon") },
    { name: "Body_Upright_Carrier_FrontLH_Titanium", desc: "5-axis CNC structural upright connecting wishbones & hub", mesh: corner.root.getObjectByName("Body_Upright_Carrier_FrontLH_Titanium") },
    { name: "Pivot_Wheel_Magnesium_BBS_Front", desc: "18-inch forged magnesium racing rim with bead knurling", mesh: corner.wheelGroup },
    { name: "Badge_SREdesigns", desc: "Official SREdesigns engineering authenticity plaque", mesh: corner.root.getObjectByName("Badge_SREdesigns") },
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

  corner.root.traverse((child) => {
    if (child.isMesh) {
      if (!child.userData.origMat) {
        child.userData.origMat = child.material;
      }
      let isSelected = false;
      let curr = child;
      while (curr && curr !== corner.root) {
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

  corner.root.traverse((child) => {
    if (child.isMesh && child.userData.origMat) {
      child.material = child.userData.origMat;
    }
  });
  controls.target.set(0, 0, 0);
}

btnPartsClear.addEventListener("click", clearIsolation);

// --- CAMERA PRESETS ---
window.setCameraPreset = function (preset) {
  switch (preset) {
    case "iso":
      camera.position.set(2.8, 1.8, 3.2);
      controls.target.set(0, 0, 0);
      state.exploded = false;
      break;
    case "front":
      camera.position.set(0, 0, 4.2);
      controls.target.set(0, 0, 0);
      state.exploded = false;
      break;
    case "side":
      camera.position.set(4.2, 0, 0);
      controls.target.set(0, 0, 0);
      state.exploded = false;
      break;
    case "top":
      camera.position.set(0, 4.5, 0);
      controls.target.set(0, 0, 0);
      state.exploded = false;
      break;
    case "exploded":
      camera.position.set(3.2, 2.2, 3.8);
      controls.target.set(0, 0, 0);
      state.exploded = true;
      btnExplode.classList.add("active");
      break;
    case "active":
      camera.position.set(1.9, 0.9, 2.4);
      controls.target.set(1.0, 0.4, 0);
      state.speedKmh = 180;
      state.pedalKgf = 140;
      state.discTempC = 720;
      break;
  }
  controls.update();
};

// --- EVENT LISTENERS ---
sliderPedal.addEventListener("input", (e) => {
  sfx.ensureContext();
  state.pedalKgf = parseFloat(e.target.value);
  valPedalCtrl.textContent = `${Math.round(state.pedalKgf)} kgf`;
  if (state.pedalKgf > 5 && state.linePressureBar < 5) {
    sfx.playHydraulicClick();
  }
});

sliderSpeed.addEventListener("input", (e) => {
  sfx.ensureContext();
  state.speedKmh = parseFloat(e.target.value);
  valSpeedCtrl.textContent = `${Math.round(state.speedKmh)} km/h`;
});

btnExplode.addEventListener("click", () => {
  sfx.ensureContext();
  state.exploded = !state.exploded;
  btnExplode.classList.toggle("active", state.exploded);
  btnExplode.textContent = state.exploded ? "Collapse View" : "Exploded View";
});

btnWireframe.addEventListener("click", () => {
  state.wireframe = !state.wireframe;
  btnWireframe.classList.toggle("active", state.wireframe);
  corner.root.traverse((c) => {
    if (c.isMesh && c.material) {
      c.material.wireframe = state.wireframe;
    }
  });
});

btnWheel.addEventListener("click", () => {
  sfx.ensureContext();
  state.wheelVisible = !state.wheelVisible;
  corner.wheelGroup.visible = state.wheelVisible;
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
  const dist = 1.2 + ((100 - pct) / 100) * 6.0;
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

btnSfxMute.addEventListener("click", () => {
  const isMuted = sfx.toggleMute();
  btnSfxMute.textContent = isMuted ? "Unmute SFX" : "Mute SFX";
  btnSfxMute.classList.toggle("active", isMuted);
});

// Presets
btnTest320.addEventListener("click", () => {
  sfx.ensureContext();
  state.speedKmh = 320;
  state.pedalKgf = 165;
  sliderSpeed.value = 320;
  valSpeedCtrl.textContent = "320 km/h";
  sliderPedal.value = 165;
  valPedalCtrl.textContent = "165 kgf";
  sfx.playHydraulicClick();
});

btnTestDyno.addEventListener("click", () => {
  sfx.ensureContext();
  state.speedKmh = 280;
  state.pedalKgf = 85;
  sliderSpeed.value = 280;
  valSpeedCtrl.textContent = "280 km/h";
  sliderPedal.value = 85;
  valPedalCtrl.textContent = "85 kgf";
  state.discTempC = 780;
  sfx.playHydraulicClick();
});

btnTestWarm.addEventListener("click", () => {
  state.discTempC = 550;
  state.pedalKgf = 0;
  sliderPedal.value = 0;
  valPedalCtrl.textContent = "0 kgf";
});

btnTestFailsafe.addEventListener("click", () => {
  sfx.ensureContext();
  state.bbwFailsafe = !state.bbwFailsafe;
  btnTestFailsafe.classList.toggle("btn-danger", !state.bbwFailsafe);
  btnTestFailsafe.classList.toggle("btn-primary", state.bbwFailsafe);
  btnTestFailsafe.textContent = state.bbwFailsafe ? "Restore BBW Control" : "BBW Shuttle Bypass";
  sfx.playHydraulicClick();
});

btnWheelGun.addEventListener("click", () => {
  sfx.ensureContext();
  sfx.playWheelGunRattle();
  wheelGunStatus.textContent = "Paoli DP6000: Captive wheel nut loosened (Reverse 10,000 RPM).";
  setTimeout(() => {
    state.wheelVisible = !state.wheelVisible;
    corner.wheelGroup.visible = state.wheelVisible;
    btnWheel.textContent = state.wheelVisible ? "Hide Wheel" : "Show Wheel";
    btnWheel.classList.toggle("active", state.wheelVisible);
    wheelGunStatus.textContent = state.wheelVisible ? "Wheel rim seated & torqued to 3,000 Nm." : "Wheel rim dismounted.";
  }, 400);
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
