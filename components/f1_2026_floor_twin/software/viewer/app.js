/**
 * app.js — Main Application Orchestrator for 2026 F1 Floor & Diffuser Digital Twin
 */

import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { createFloorMaterials, buildFloorAssembly } from "./floor3d.js";

// DOM Elements
const viewport = document.getElementById("viewport3d");
const statusPill = document.getElementById("status-pill");
const statusDetail = document.getElementById("status-detail");
const viewportStatus = document.getElementById("viewport-status");

// Telemetry Elements
const valDownforce = document.getElementById("val-downforce");
const barDownforce = document.getElementById("bar-downforce");
const valPlankWear = document.getElementById("val-plank-wear");
const barWear = document.getElementById("bar-wear");
const valShare = document.getElementById("val-share");
const valDrag = document.getElementById("val-drag");
const valCl = document.getElementById("val-cl");
const valSparks = document.getElementById("val-sparks");
const valRemaining = document.getElementById("val-remaining");
const sliderRh = document.getElementById("slider-rh");
const valRhCtrl = document.getElementById("val-rh-ctrl");
const sliderSpeed = document.getElementById("slider-speed");
const valSpeedCtrl = document.getElementById("val-speed-ctrl");

// Controls
const btnExplode = document.getElementById("btn-explode");
const btnWireframe = document.getElementById("btn-wireframe");
const btnViewUnderneath = document.getElementById("btn-view-underneath");
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
const btnTestNominal = document.getElementById("btn-test-nominal");
const btnTestBottoming = document.getElementById("btn-test-bottoming");
const btnTestHighspeed = document.getElementById("btn-test-highspeed");
const btnTestResetPlank = document.getElementById("btn-test-reset-plank");

// Part Explorer
const partsListEl = document.getElementById("parts-list");
const btnPartsClear = document.getElementById("btn-parts-clear");
const partsFocusStatus = document.getElementById("parts-focus-status");

// --- THREE.JS SCENE SETUP ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0c1016);

const camera = new THREE.PerspectiveCamera(40, viewport.clientWidth / viewport.clientHeight, 0.1, 150);
camera.position.set(32.0, 16.0, 24.0);

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
controls.target.set(16.0, 1.0, 0.0);
controls.minDistance = 3.0;
controls.maxDistance = 75.0;

// Lighting Setup
const ambientLight = new THREE.AmbientLight(0xdde6f0, 0.85);
scene.add(ambientLight);

const mainKeyLight = new THREE.DirectionalLight(0xffffff, 2.2);
mainKeyLight.position.set(16, 20, 14);
mainKeyLight.castShadow = true;
mainKeyLight.shadow.mapSize.width = 2048;
mainKeyLight.shadow.mapSize.height = 2048;
scene.add(mainKeyLight);

const fillLight = new THREE.DirectionalLight(0x70a5d8, 1.2);
fillLight.position.set(-10, 8, -12);
scene.add(fillLight);

const rimLight = new THREE.DirectionalLight(0xffffff, 1.5);
rimLight.position.set(16, -10, -10);
scene.add(rimLight);

// Build 3D Model
const mats = createFloorMaterials();
const floor = buildFloorAssembly(scene, mats);

// Titanium Sparks Particle System
const sparkCount = 120;
const sparkGeo = new THREE.BufferGeometry();
const sparkPositions = new Float32Array(sparkCount * 3);
const sparkVelocities = [];
for (let i = 0; i < sparkCount; i++) {
  sparkPositions[i * 3 + 0] = 0;
  sparkPositions[i * 3 + 1] = -100;
  sparkPositions[i * 3 + 2] = 0;
  sparkVelocities.push(new THREE.Vector3());
}
sparkGeo.setAttribute("position", new THREE.BufferAttribute(sparkPositions, 3));
const sparkMat = new THREE.PointsMaterial({
  color: 0xffaa22,
  size: 0.18,
  transparent: true,
  opacity: 0.9,
  blending: THREE.AdditiveBlending,
});
const sparkParticles = new THREE.Points(sparkGeo, sparkMat);
scene.add(sparkParticles);

// Simulation State
const state = {
  speedKmh: 250.0,
  frontRhMm: 35.0,
  rearRhMm: 85.0,
  clFloor: 1.493,
  downforceN: 18250.0,
  dragN: 2280.0,
  plankWearMm: 0.15,
  plankRemainingMm: 9.85,
  skidContact: false,
  sparkIntensity: 0.0,
  plankIllegal: false,
  exploded: false,
  explodeProgress: 0,
  wireframe: false,
  autoRotate: false,
  orbitSpeed: 1.0,
  lightIntensity: 1.1,
  isolatedPart: null,
};

const CFG = {
  floorAreaM2: 3.65,
  airDensity: 1.225,
  kGe: 18.5,
  h0: 12.0,
  clBase: 1.10,
  plankNewMm: 10.0,
  maxWearMm: 2.0,
};

function updatePhysics(dt) {
  const effH = Math.max(1.0, state.frontRhMm);
  state.clFloor = CFG.clBase + (CFG.kGe / (effH + CFG.h0));

  const vMs = state.speedKmh / 3.6;
  const q = 0.5 * CFG.airDensity * (vMs ** 2);

  state.downforceN = q * CFG.floorAreaM2 * state.clFloor;
  const cdFloor = 0.12 + (0.015 * state.clFloor);
  state.dragN = q * CFG.floorAreaM2 * cdFloor;

  // Skid Contact & Wear
  if (state.frontRhMm <= 0.0) {
    state.skidContact = true;
    const bottomingDepth = Math.abs(state.frontRhMm);
    state.sparkIntensity = Math.min(1.0, 0.3 + bottomingDepth * 0.25);
    const wearRate = (state.speedKmh / 360.0) * (bottomingDepth + 0.5) * 0.04;
    state.plankWearMm += wearRate * dt;
  } else {
    state.skidContact = false;
    state.sparkIntensity = 0.0;
  }

  state.plankRemainingMm = Math.max(0.0, CFG.plankNewMm - state.plankWearMm);
  state.plankIllegal = state.plankWearMm > CFG.maxWearMm;

  // Update Telemetry Displays
  valDownforce.textContent = `${Math.round(state.downforceN).toLocaleString()} N`;
  const dfPct = Math.min(100, (state.downforceN / 35000.0) * 100);
  barDownforce.style.width = `${dfPct}%`;

  valPlankWear.textContent = `${state.plankWearMm.toFixed(3)} mm`;
  const wearPct = Math.min(100, (state.plankWearMm / CFG.maxWearMm) * 100);
  barWear.style.width = `${wearPct}%`;
  barWear.className = state.plankIllegal ? "gauge-bar-fill danger" : "gauge-bar-fill";

  valDrag.textContent = `${Math.round(state.dragN).toLocaleString()} N`;
  valCl.textContent = state.clFloor.toFixed(3);
  valSparks.textContent = state.skidContact ? `TITANIUM SHOWER (${Math.round(state.sparkIntensity * 100)}%)` : "NONE";
  valSparks.style.color = state.skidContact ? "var(--orange)" : "var(--muted)";
  valRemaining.textContent = `${state.plankRemainingMm.toFixed(2)} mm`;

  // Status Pill
  if (state.plankIllegal) {
    statusPill.textContent = "FIA SCRUTINEERING VIOLATION";
    statusPill.className = "pill fault";
    statusDetail.textContent = `Plank Wear: ${state.plankWearMm.toFixed(2)} mm (> 2.0 mm limit) · Disqualification Risk`;
  } else if (state.skidContact) {
    statusPill.textContent = "TITANIUM SKID CONTACT";
    statusPill.className = "pill spark";
    statusDetail.textContent = `Bottoming Depth: ${Math.abs(state.frontRhMm).toFixed(1)} mm · Titanium Pucks Grounding`;
  } else {
    statusPill.textContent = "GROUND EFFECT ATTACHED";
    statusPill.className = "pill run";
    statusDetail.textContent = `Downforce: ${Math.round(state.downforceN)} N · Clearance: ${state.frontRhMm.toFixed(1)} mm · Zero Choke Stall`;
  }

  // 3D Assembly Vertical Motion
  // Move floor assembly vertically to match ride height
  const rhOffsetUnits = (state.frontRhMm - 35.0) * 0.025;
  floor.root.position.y = rhOffsetUnits;

  // Animate Sparks
  const posAttr = sparkParticles.geometry.attributes.position;
  for (let i = 0; i < sparkCount; i++) {
    if (state.skidContact && Math.random() < state.sparkIntensity * 0.4) {
      // Spawn new spark at one of the skid pucks
      const puckX = [1.2, 8.5, 17.5, 26.5][Math.floor(Math.random() * 4)];
      posAttr.setXYZ(i, puckX, 0.15 + rhOffsetUnits, (Math.random() - 0.5) * 1.5);
      sparkVelocities[i].set(
        - (12.0 + Math.random() * 18.0),
        0.5 + Math.random() * 2.0,
        (Math.random() - 0.5) * 4.0
      );
    } else {
      // Update existing spark
      const sx = posAttr.getX(i);
      const sy = posAttr.getY(i);
      const sz = posAttr.getZ(i);
      if (sy > -50) {
        sparkVelocities[i].y -= 9.8 * dt * 0.3; // Gravity
        posAttr.setXYZ(
          i,
          sx + sparkVelocities[i].x * dt,
          sy + sparkVelocities[i].y * dt,
          sz + sparkVelocities[i].z * dt
        );
        if (sy < 0) {
          posAttr.setXYZ(i, 0, -100, 0); // Despawn below ground
        }
      }
    }
  }
  posAttr.needsUpdate = true;
}

// Exploded View Interpolation
function updateExplodedView(dt) {
  const target = state.exploded ? 1.0 : 0.0;
  state.explodeProgress += (target - state.explodeProgress) * Math.min(1.0, dt * 5.0);

  floor.explodedParts.forEach((part) => {
    const offset = part.direction.clone().multiplyScalar(part.maxDist * state.explodeProgress);
    part.mesh.position.copy(part.origin).add(offset);
  });
}

// Populate Part Explorer
function initPartExplorer() {
  const namedParts = [
    { name: "Body_Floor_Deck_Carbon", desc: "1,450 mm width partially flat underfloor deck", mesh: floor.floorDeckGroup },
    { name: "Body_SkidBlock_Jabroc", desc: "10.0 mm densified beechwood central plank with 3x inspection holes", mesh: floor.skidGroup },
    { name: "Fastener_SkidPuck_Ti_01", desc: "Grade 5 titanium flush-mounted skid puck (sparks on bottoming)", mesh: floor.skidGroup.getObjectByName("Fastener_SkidPuck_Ti_01") },
    { name: "Body_FloorFence_LH_01", desc: "Outermost leading edge strake shedding wheel wake outwash", mesh: floor.fencesGroup.getObjectByName("Body_FloorFence_LH_01") },
    { name: "Body_FloorFence_LH_02", desc: "Underfloor LEV vortex generating blade", mesh: floor.fencesGroup.getObjectByName("Body_FloorFence_LH_02") },
    { name: "Body_FloorWinglet_Edge_LH", desc: "Longitudinal floor edge sealing winglet LH", mesh: floor.edgeLH },
    { name: "Body_FloorWinglet_Edge_RH", desc: "Longitudinal floor edge sealing winglet RH", mesh: floor.edgeRH },
    { name: "Body_Diffuser_Ramp", desc: "10.5° rear expansion ramp (1,000 mm exit width)", mesh: floor.diffuserGroup.getObjectByName("Body_Diffuser_Ramp") || floor.diffuserGroup },
    { name: "Body_Diffuser_Divider_LH", desc: "Vertical diffuser crossflow separation strake", mesh: floor.diffuserGroup.getObjectByName("Body_Diffuser_Divider_LH") },
    { name: "Body_TyreSquirt_Cutout_LH", desc: "Rear tyre squirt mousehole pressure relief baffle", mesh: floor.squirtLH },
    { name: "Badge_SREdesigns", desc: "Official SREdesigns underbody constructor serial plaque", mesh: floor.root.getObjectByName("Badge_SREdesigns") },
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

  floor.root.traverse((child) => {
    if (child.isMesh) {
      if (!child.userData.origMat) {
        child.userData.origMat = child.material;
      }
      let isSelected = false;
      let curr = child;
      while (curr && curr !== floor.root) {
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

  floor.root.traverse((child) => {
    if (child.isMesh && child.userData.origMat) {
      child.material = child.userData.origMat;
    }
  });
  controls.target.set(16.0, 1.0, 0.0);
}

btnPartsClear.addEventListener("click", clearIsolation);

// Camera Presets
window.setCameraPreset = function (preset) {
  switch (preset) {
    case "iso":
      camera.position.set(32.0, 16.0, 24.0);
      controls.target.set(16.0, 1.0, 0.0);
      state.exploded = false;
      break;
    case "front":
      camera.position.set(-14.0, 3.0, 0.0);
      controls.target.set(16.0, 1.0, 0.0);
      state.exploded = false;
      break;
    case "side":
      camera.position.set(16.0, 3.0, 20.0);
      controls.target.set(16.0, 1.0, 0.0);
      state.exploded = false;
      break;
    case "top":
      camera.position.set(16.0, 35.0, 0.0);
      controls.target.set(16.0, 1.0, 0.0);
      state.exploded = false;
      break;
    case "exploded":
      camera.position.set(34.0, 22.0, 26.0);
      controls.target.set(16.0, 1.0, 0.0);
      state.exploded = true;
      btnExplode.classList.add("active");
      break;
    case "active":
      camera.position.set(18.0, 4.0, 10.0);
      controls.target.set(14.0, 0.5, 0.0);
      state.frontRhMm = -2.0;
      sliderRh.value = -2;
      valRhCtrl.textContent = "-2 mm";
      break;
  }
  controls.update();
};

// Event Listeners
sliderRh.addEventListener("input", (e) => {
  state.frontRhMm = parseFloat(e.target.value);
  valRhCtrl.textContent = `${state.frontRhMm >= 0 ? "+" : ""}${Math.round(state.frontRhMm)} mm`;
});

sliderSpeed.addEventListener("input", (e) => {
  state.speedKmh = parseFloat(e.target.value);
  valSpeedCtrl.textContent = `${Math.round(state.speedKmh)} km/h`;
});

btnViewUnderneath.addEventListener("click", () => {
  camera.position.set(16.0, -18.0, 0.1);
  controls.target.set(16.0, 0.5, 0.0);
  controls.update();
});

btnExplode.addEventListener("click", () => {
  state.exploded = !state.exploded;
  btnExplode.classList.toggle("active", state.exploded);
  btnExplode.textContent = state.exploded ? "Collapse View" : "Exploded View";
});

btnWireframe.addEventListener("click", () => {
  state.wireframe = !state.wireframe;
  btnWireframe.classList.toggle("active", state.wireframe);
  floor.root.traverse((c) => {
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
  const dist = 6.0 + ((100 - pct) / 100) * 45.0;
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
btnTestNominal.addEventListener("click", () => {
  state.frontRhMm = 35.0;
  sliderRh.value = 35;
  valRhCtrl.textContent = "+35 mm";
});

btnTestBottoming.addEventListener("click", () => {
  state.frontRhMm = -3.0; // Kerb strike bottoming
  sliderRh.value = -3;
  valRhCtrl.textContent = "-3 mm";
});

btnTestHighspeed.addEventListener("click", () => {
  state.speedKmh = 340.0;
  sliderSpeed.value = 340;
  valSpeedCtrl.textContent = "340 km/h";
  state.frontRhMm = 28.0;
  sliderRh.value = 28;
  valRhCtrl.textContent = "+28 mm";
});

btnTestResetPlank.addEventListener("click", () => {
  state.plankWearMm = 0.0;
  state.plankRemainingMm = 10.0;
  state.plankIllegal = false;
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
