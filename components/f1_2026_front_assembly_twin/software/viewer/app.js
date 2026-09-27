/**
 * app.js — Master Orchestrator for 2026 F1 Unified Front Quarter Car Digital Twin
 */

import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { createMonocoqueMaterials, buildSurvivalCell, makeSREdesignsBadge } from "/f1_2026_monocoque_twin/software/viewer/monocoque3d.js?v=1";
import { createFrontWingMaterials, buildFrontWingAssembly } from "/f1_2026_front_wing_twin/software/viewer/front_wing3d.js?v=1";
import { createSuspensionMaterials, buildFrontSuspension } from "/f1_2026_suspension_twin/software/viewer/suspension3d.js?v=1";

export { makeSREdesignsBadge };

// DOM Elements
const viewport = document.getElementById("viewport3d");
const statusPill = document.getElementById("status-pill");
const statusDetail = document.getElementById("status-detail");
const viewportStatus = document.getElementById("viewport-status");

// Telemetry Elements
const valDownforce = document.getElementById("val-downforce");
const barDownforce = document.getElementById("bar-downforce");
const valPressure = document.getElementById("val-pressure");
const barPressure = document.getElementById("bar-pressure");
const valAeroMode = document.getElementById("val-aero-mode");
const valDragReduction = document.getElementById("val-drag-reduction");
const valPullrod = document.getElementById("val-pullrod");
const valDiscTemp = document.getElementById("val-disc-temp");
const valAntidive = document.getElementById("val-antidive");

// Control Inputs
const sliderSpeed = document.getElementById("slider-speed");
const valSpeedCtrl = document.getElementById("val-speed-ctrl");
const sliderPedal = document.getElementById("slider-pedal");
const valPedalCtrl = document.getElementById("val-pedal-ctrl");
const sliderSteer = document.getElementById("slider-steer");
const valSteerCtrl = document.getElementById("val-steer-ctrl");

// Toolbar Buttons
const btnExplode = document.getElementById("btn-explode");
const btnWireframe = document.getElementById("btn-wireframe");
const btnToggleAero = document.getElementById("btn-toggle-aero");
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
const btnTestStraight = document.getElementById("btn-test-straight");
const btnTestBrake = document.getElementById("btn-test-brake");
const btnTestCurb = document.getElementById("btn-test-curb");
const btnTestReset = document.getElementById("btn-test-reset");

// Part Explorer
const partsListEl = document.getElementById("parts-list");
const btnPartsClear = document.getElementById("btn-parts-clear");
const partsFocusStatus = document.getElementById("parts-focus-status");

// --- THREE.JS SCENE SETUP ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0c1016);

const camera = new THREE.PerspectiveCamera(40, viewport.clientWidth / viewport.clientHeight, 0.1, 150);
camera.position.set(16.0, 12.0, 20.0);

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
controls.target.set(2.0, 2.5, 0.0);
controls.minDistance = 3.0;
controls.maxDistance = 60.0;

// Lighting Setup
const ambientLight = new THREE.AmbientLight(0xdde6f0, 0.85);
scene.add(ambientLight);

const mainKeyLight = new THREE.DirectionalLight(0xffffff, 2.2);
mainKeyLight.position.set(8, 16, 12);
mainKeyLight.castShadow = true;
mainKeyLight.shadow.mapSize.width = 2048;
mainKeyLight.shadow.mapSize.height = 2048;
scene.add(mainKeyLight);

const fillLight = new THREE.DirectionalLight(0x70a5d8, 1.2);
fillLight.position.set(-14, 6, -10);
scene.add(fillLight);

const rimLight = new THREE.DirectionalLight(0xffffff, 1.4);
rimLight.position.set(10, -4, -12);
scene.add(rimLight);

// Master Root Assembly
const masterRoot = new THREE.Group();
masterRoot.name = "Body_F1_2026_FrontQuarter_Master";
scene.add(masterRoot);

// 1. Build Survival Cell Monocoque
const monoMats = createMonocoqueMaterials();
const mono = buildSurvivalCell(masterRoot, monoMats);

// 2. Build Active Front Wing & FIS
const wingMats = createFrontWingMaterials();
const wing = buildFrontWingAssembly(masterRoot, wingMats);

// 3. Build Front Suspension & Brake Corner Linkage
const suspMats = createSuspensionMaterials();
const susp = buildFrontSuspension(masterRoot, suspMats);

// Align assemblies on universal datum
// Wing connects to Bulkhead A-A at X=0
wing.chassisStub.visible = false; // Hide stub to mate flush with monocoque bulkhead
susp.chassisStubGroup.visible = false; // Hide stub to mate flush with monocoque clevises

// Simulation State
const state = {
  speedKmh: 250.0,
  pedalKgf: 0.0,
  steerDeg: 0.0,
  bumpMm: 0.0,
  requestedAeroMode: "Z_MODE",
  effectiveAeroMode: "Z_MODE",
  flapAngleDeg: 24.0,
  downforceN: 4890.0,
  dragN: 1489.0,
  dragReductionPct: 0.0,
  linePressureBar: 0.0,
  brakingTorqueNm: 0.0,
  discTempC: 25.0,
  brakingG: 0.0,
  camberDeg: -3.20,
  pullrodTensionKn: 3.12,
  antidiveReductionMm: 0.0,
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
  cornerMassKg: 185.0,
  motionRatio: 0.82,
  pullrodAngleDeg: 28.5,
  antiDivePct: 38.5,
  staticCamberDeg: -3.20,
  camberGainPerMm: -0.045,
  pistonAreaM2: 0.002511,
  discRadiusM: 0.147,
};

function updatePhysics(dt) {
  // 1. Braking Dynamics
  state.linePressureBar = (state.pedalKgf / 180.0) * 180.0;
  const pistonForceN = state.linePressureBar > 2.0 ? (state.linePressureBar * 1e5) * CFG.pistonAreaM2 : 0;
  const mu = state.discTempC > 200 ? 0.48 : 0.32;
  state.brakingTorqueNm = 2.0 * pistonForceN * mu * CFG.discRadiusM;
  state.brakingG = (state.brakingTorqueNm / 4200.0) * 5.2;

  // Disc Temperature Rise
  if (state.brakingTorqueNm > 50.0) {
    const thermalPowerKw = (state.brakingTorqueNm * (state.speedKmh / 3.6)) / 1000.0;
    state.discTempC = Math.min(1100.0, state.discTempC + thermalPowerKw * 0.012 * dt);
  } else {
    state.discTempC = Math.max(25.0, state.discTempC - (state.discTempC - 25.0) * 0.02 * dt);
  }

  // 2. Safety Interlock: Heavy braking forces Z-Mode
  if (state.brakingG >= 1.8) {
    state.effectiveAeroMode = "Z_MODE";
  } else {
    state.effectiveAeroMode = state.requestedAeroMode;
  }

  // 3. Active Wing Flap Slew
  const targetFlap = state.effectiveAeroMode === "X_MODE" ? CFG.xModeAngle : CFG.zModeAngle;
  const deltaFlap = targetFlap - state.flapAngleDeg;
  const maxStepFlap = CFG.actuationRateDegS * dt;
  if (Math.abs(deltaFlap) <= maxStepFlap) {
    state.flapAngleDeg = targetFlap;
  } else {
    state.flapAngleDeg += Math.sign(deltaFlap) * maxStepFlap;
  }

  // 4. Aerodynamic Forces
  const vMs = state.speedKmh / 3.6;
  const q = 0.5 * CFG.airDensity * (vMs ** 2);
  const cl = 1.15 + (0.055 * state.flapAngleDeg);
  const cd = 0.20 + (0.023 * state.flapAngleDeg);
  state.downforceN = q * CFG.wingAreaM2 * cl;
  state.dragN = q * CFG.wingAreaM2 * cd;

  const cdZBaseline = 0.20 + (0.023 * CFG.zModeAngle);
  const dragZ = q * CFG.wingAreaM2 * cdZBaseline;
  state.dragReductionPct = dragZ > 0 ? Math.max(0, ((dragZ - state.dragN) / dragZ) * 100.0) : 0;

  // 5. Suspension Kinematics & Pull-Rod Tension
  state.camberDeg = CFG.staticCamberDeg + (CFG.camberGainPerMm * state.bumpMm);
  const totalVerticalLoadG = 1.0 + (state.downforceN / 4000.0) + (state.brakingG * 0.45);
  const fWheelN = totalVerticalLoadG * CFG.cornerMassKg * 9.81;
  const sinAngle = Math.sin((CFG.pullrodAngleDeg * Math.PI) / 180.0);
  state.pullrodTensionKn = (fWheelN * CFG.motionRatio) / (sinAngle * 1000.0);

  state.antidiveReductionMm = (state.brakingG * 6.2) * (CFG.antiDivePct / 100.0);

  // Update Telemetry Displays
  valDownforce.textContent = `${Math.round(state.downforceN).toLocaleString()} N`;
  const dfPct = Math.min(100, (state.downforceN / 8000.0) * 100);
  barDownforce.style.width = `${dfPct}%`;

  valPressure.textContent = `${state.linePressureBar.toFixed(1)} bar`;
  const pressPct = (state.linePressureBar / 180.0) * 100;
  barPressure.style.width = `${pressPct}%`;

  valAeroMode.textContent = state.effectiveAeroMode;
  valDragReduction.textContent = `${state.dragReductionPct.toFixed(1)}%`;
  valPullrod.textContent = `${state.pullrodTensionKn.toFixed(2)} kN`;
  valDiscTemp.textContent = `${Math.round(state.discTempC)} °C`;
  valAntidive.textContent = `${CFG.antiDivePct.toFixed(1)}% (${state.antidiveReductionMm.toFixed(1)} mm)`;

  // Status Pill
  if (state.brakingG >= 1.8 && state.requestedAeroMode === "X_MODE") {
    statusPill.textContent = "HEAVY BRAKING INTERLOCK";
    statusPill.className = "pill warn";
    statusDetail.textContent = `Decel: ${state.brakingG.toFixed(1)}g · Active Wing Force-Shut to Z-Mode`;
  } else if (state.effectiveAeroMode === "X_MODE") {
    statusPill.textContent = "X-MODE LOW DRAG";
    statusPill.className = "pill active-mode";
    statusDetail.textContent = `Speed: ${Math.round(state.speedKmh)} km/h · Drag Reduced by ${state.dragReductionPct.toFixed(1)}%`;
  } else {
    statusPill.textContent = "SYSTEMS NOMINAL";
    statusPill.className = "pill run";
    statusDetail.textContent = `Downforce: ${Math.round(state.downforceN)} N · Pull-Rod: ${state.pullrodTensionKn.toFixed(1)} kN · Speed: ${Math.round(state.speedKmh)} km/h`;
  }

  // 3D Kinematics Articulation
  // Wing Flaps
  const flapAngleDeltaRad = ((state.flapAngleDeg - CFG.zModeAngle) * Math.PI) / 180.0;
  wing.activeFlapLH.rotation.z = flapAngleDeltaRad;
  wing.activeFlapRH.rotation.z = flapAngleDeltaRad;

  // Suspension & Wheel
  const bumpUnits = state.bumpMm * 0.025;
  const steerRad = (state.steerDeg * Math.PI) / 180.0;
  const camberDeltaRad = ((state.camberDeg - CFG.staticCamberDeg) * Math.PI) / 180.0;

  susp.cornerGroup.position.y = bumpUnits;
  susp.cornerGroup.rotation.y = steerRad;
  susp.cornerGroup.rotation.z = camberDeltaRad;

  susp.upperWishboneGroup.rotation.x = -bumpUnits * 0.15;
  susp.lowerWishboneGroup.rotation.x = -bumpUnits * 0.15;
  susp.rockerGroup.rotation.x = -bumpUnits * 0.85;
  susp.pullRodGroup.rotation.x = -bumpUnits * 0.18;
  susp.tieRodGroup.rotation.y = steerRad * 0.85;
}

// Exploded View Interpolation
function updateExplodedView(dt) {
  const target = state.exploded ? 1.0 : 0.0;
  state.explodeProgress += (target - state.explodeProgress) * Math.min(1.0, dt * 5.0);

  // Subsystem Exploded Offsets
  // Wing & FIS moves forward along -X
  wing.root.position.x = -state.explodeProgress * 8.0;
  // Monocoque moves rearward along +X
  mono.root.position.x = state.explodeProgress * 6.0;
  // Suspension moves outward along +Z and +Y
  susp.cornerGroup.position.z = 7.0 + state.explodeProgress * 5.0;
}

// Populate Master Part Explorer
function initPartExplorer() {
  const namedParts = [
    { name: "Body_SurvivalCell_Tub", desc: "Carbon/Zylon 6.2mm armor monocoque chassis", mesh: mono.tubGroup },
    { name: "Body_Safety_Halo_Titanium", desc: "Grade 5 titanium Halo (125 kN proof load, 7.0 kg)", mesh: mono.haloGroup },
    { name: "Body_Safety_RollHoop_Airbox", desc: "172 kN primary rollover hoop with engine intake", mesh: mono.rollHoopGroup },
    { name: "Body_FIS_Nosecone_Stage1", desc: "Two-stage frontal crush cone (42.5 kJ absorption)", mesh: wing.noseGroup.getObjectByName("Body_FIS_Nosecone_Stage1") },
    { name: "Body_FIS_Nosecone_Stage2", desc: "Secondary ultra-tough survival hull (>500 kN crush)", mesh: wing.noseGroup.getObjectByName("Body_FIS_Nosecone_Stage2") },
    { name: "Body_Wing_Mainplane_Element1", desc: "1,850 mm carbon aerodynamic spoon mainplane", mesh: wing.mainplaneGroup },
    { name: "Pivot_Wing_ActiveFlap_LH_Element3", desc: "Active articulating flap (24° down to 6° in X-Mode)", mesh: wing.activeFlapLH },
    { name: "Body_FWEP_LH", desc: "Inwash cambered carbon front wing endplate with diveplane", mesh: wing.endplateLHGroup },
    { name: "Pivot_Wishbone_Upper_FrontLH", desc: "Aerodynamic carbon wishbone with M10 uniball joint", mesh: susp.upperWishboneGroup },
    { name: "Pivot_Wishbone_Lower_FrontLH", desc: "Lower wishbone with 14.2° anti-dive pitch rake", mesh: susp.lowerWishboneGroup },
    { name: "Pivot_Suspension_PullRod_FrontLH", desc: "Carbon fiber diagonal pull-rod tension strut", mesh: susp.pullRodGroup },
    { name: "Body_Upright_Carrier_FrontLH_Titanium", desc: "5-axis CNC titanium front upright corner carrier", mesh: susp.cornerGroup.getObjectByName("Body_Upright_Carrier_FrontLH_Titanium") },
    { name: "Pivot_Brake_Disc_Ventilated_Front", desc: "345mm x 34mm carbon disc with 1,400+ drilled holes", mesh: susp.cornerGroup.getObjectByName("Pivot_Brake_Disc_Ventilated_Front") },
    { name: "Body_Brake_Caliper_Monobloc_Front", desc: "Al-Li 2099 monobloc caliper with castellated pistons", mesh: susp.cornerGroup.getObjectByName("Body_Brake_Caliper_Monobloc_Front") },
    { name: "Pivot_Wheel_Magnesium_BBS_Front", desc: "18-inch BBS forged magnesium racing wheel rim", mesh: susp.cornerGroup.getObjectByName("Pivot_Wheel_Magnesium_BBS_Front") },
    { name: "Badge_SREdesigns", desc: "Official SREdesigns constructor engineering serial plaque", mesh: mono.root.getObjectByName("Badge_SREdesigns") },
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

  masterRoot.traverse((child) => {
    if (child.isMesh) {
      if (!child.userData.origMat) {
        child.userData.origMat = child.material;
      }
      let isSelected = false;
      let curr = child;
      while (curr && curr !== masterRoot) {
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

  masterRoot.traverse((child) => {
    if (child.isMesh && child.userData.origMat) {
      child.material = child.userData.origMat;
    }
  });
  controls.target.set(2.0, 2.5, 0.0);
}

btnPartsClear.addEventListener("click", clearIsolation);

// Camera Presets
window.setCameraPreset = function (preset) {
  switch (preset) {
    case "iso":
      camera.position.set(16.0, 12.0, 20.0);
      controls.target.set(2.0, 2.5, 0.0);
      state.exploded = false;
      break;
    case "front":
      camera.position.set(-20.0, 3.5, 0.0);
      controls.target.set(-2.0, 2.5, 0.0);
      state.exploded = false;
      break;
    case "side":
      camera.position.set(0.0, 3.5, 24.0);
      controls.target.set(2.0, 2.5, 0.0);
      state.exploded = false;
      break;
    case "top":
      camera.position.set(0.0, 26.0, 0.0);
      controls.target.set(2.0, 2.5, 0.0);
      state.exploded = false;
      break;
    case "exploded":
      camera.position.set(20.0, 16.0, 24.0);
      controls.target.set(2.0, 2.5, 0.0);
      state.exploded = true;
      btnExplode.classList.add("active");
      break;
    case "active":
      camera.position.set(12.0, 6.0, 14.0);
      controls.target.set(0.0, 2.5, 3.0);
      state.speedKmh = 320.0;
      state.requestedAeroMode = "X_MODE";
      btnToggleAero.textContent = "Engage Z-Mode";
      btnToggleAero.classList.add("active");
      break;
  }
  controls.update();
};

// Event Listeners
sliderSpeed.addEventListener("input", (e) => {
  state.speedKmh = parseFloat(e.target.value);
  valSpeedCtrl.textContent = `${Math.round(state.speedKmh)} km/h`;
});

sliderPedal.addEventListener("input", (e) => {
  state.pedalKgf = parseFloat(e.target.value);
  valPedalCtrl.textContent = `${Math.round(state.pedalKgf)} kgf`;
});

sliderSteer.addEventListener("input", (e) => {
  state.steerDeg = parseFloat(e.target.value);
  valSteerCtrl.textContent = `${state.steerDeg >= 0 ? "+" : ""}${state.steerDeg.toFixed(1)}°`;
});

btnToggleAero.addEventListener("click", () => {
  if (state.requestedAeroMode === "Z_MODE") {
    state.requestedAeroMode = "X_MODE";
    btnToggleAero.textContent = "Engage Z-Mode";
    btnToggleAero.classList.add("active");
  } else {
    state.requestedAeroMode = "Z_MODE";
    btnToggleAero.textContent = "Engage X-Mode";
    btnToggleAero.classList.remove("active");
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
  masterRoot.traverse((c) => {
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
  const dist = 5.0 + ((100 - pct) / 100) * 35.0;
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

// Race Presets
btnTestStraight.addEventListener("click", () => {
  state.speedKmh = 320.0;
  sliderSpeed.value = 320;
  valSpeedCtrl.textContent = "320 km/h";
  state.pedalKgf = 0.0;
  sliderPedal.value = 0;
  valPedalCtrl.textContent = "0 kgf";
  state.steerDeg = 0.0;
  sliderSteer.value = 0;
  valSteerCtrl.textContent = "0.0°";
  state.requestedAeroMode = "X_MODE";
  btnToggleAero.textContent = "Engage Z-Mode";
  btnToggleAero.classList.add("active");
});

btnTestBrake.addEventListener("click", () => {
  state.speedKmh = 140.0;
  sliderSpeed.value = 140;
  valSpeedCtrl.textContent = "140 km/h";
  state.pedalKgf = 160.0;
  sliderPedal.value = 160;
  valPedalCtrl.textContent = "160 kgf";
});

btnTestCurb.addEventListener("click", () => {
  state.bumpMm = 28.0;
  state.steerDeg = 12.0;
  sliderSteer.value = 12;
  valSteerCtrl.textContent = "+12.0°";
});

btnTestReset.addEventListener("click", () => {
  state.speedKmh = 250.0;
  sliderSpeed.value = 250;
  valSpeedCtrl.textContent = "250 km/h";
  state.pedalKgf = 0.0;
  sliderPedal.value = 0;
  valPedalCtrl.textContent = "0 kgf";
  state.steerDeg = 0.0;
  sliderSteer.value = 0;
  valSteerCtrl.textContent = "0.0°";
  state.bumpMm = 0.0;
  state.requestedAeroMode = "Z_MODE";
  btnToggleAero.textContent = "Engage X-Mode";
  btnToggleAero.classList.remove("active");
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
