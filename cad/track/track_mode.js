/**
 * track_mode.js — Red Bull Ring circuit mode: driving physics on the real track surface, chase/TV/overview cameras,
 * lap timing, mini-map HUD, keyboard driving and autopilot. Hooks the existing throttle / brake / steering / gear UI.
 * SREdesigns - Samuel R Erwin III
 *
 * Integration (app.js): initTrackMode({...}) once, trackMode.update(dt) after the powertrain sim,
 * trackMode.beforeRender(dt) right before renderer.render(). Everything else lives here.
 */
import * as THREE from 'three';
import { createRedBullRing, DM } from './red_bull_ring.js';
import { createRideModel } from './ride_model.js';

const WHEELBASE = 3.4;          // m (2026 regs)
const MASS = 800;               // kg incl. driver
const POWER = 750e3;            // W (ICE ~400 kW + MGU-K 350 kW)
const GEAR_VMAX = [0, 26, 35, 45, 55, 65, 75, 85, 96]; // m/s top speed per gear (≈ 94…345 km/h)
const LAT_A = 18, LAT_B = 0.004;
const latLimit = v => LAT_A + LAT_B * v * v;          // m/s² (mechanical grip + downforce: ~1.8 g slow, ~4.5 g at 300 km/h)
const brakeLimit = v => 13 + 0.0042 * v * v;          // m/s² at full pedal

export function initTrackMode(ctx) {
  const { scene, camera, controls, carModel, state, sunLight, legacyEnv } = ctx;
  const circuit = createRedBullRing();
  const { track, raceline } = circuit;
  scene.add(circuit.group);
  window.__RBR__ = circuit;
  console.info(`[RedBullRing] built in ${circuit.group.userData.buildMs} ms · ${track.length.toFixed(0)} m · ${circuit.group.userData.treeCount} trees`);

  const legacyFog = scene.fog ? scene.fog.density : 0.0015;
  const sky = circuit.group.userData.sky;
  if (sunLight && !sunLight.target.parent) scene.add(sunLight.target);

  // ------------------------------------------------------------------ racing-line speed profile for autopilot
  const rlN = raceline.n;
  const rlV = new Float64Array(rlN);
  {
    const k = new Float64Array(rlN);
    for (let i = 0; i < rlN; i++) {
      const a = raceline.wrap(i - 4), b = raceline.wrap(i + 4);
      const ax = raceline.x[i] - raceline.x[a], az = raceline.z[i] - raceline.z[a];
      const bx = raceline.x[b] - raceline.x[i], bz = raceline.z[b] - raceline.z[i];
      const cr = ax * bz - az * bx, la = Math.hypot(ax, az), lb = Math.hypot(bx, bz), lc = Math.hypot(raceline.x[b] - raceline.x[a], raceline.z[b] - raceline.z[a]);
      k[i] = Math.abs(2 * cr / (la * lb * lc + 1e-9));
    }
    const f = 0.9;
    for (let i = 0; i < rlN; i++) {
      const den = k[i] - f * LAT_B;
      rlV[i] = den > 0 ? Math.min(92, Math.sqrt(f * LAT_A / den)) : 92;
    }
    const ds = i => Math.hypot(raceline.x[raceline.wrap(i + 1)] - raceline.x[i], raceline.z[raceline.wrap(i + 1)] - raceline.z[i]);
    for (let pass = 0; pass < 3; pass++) {
      for (let j = 2 * rlN; j > 0; j--) { const i = j % rlN, nx = (i + 1) % rlN; rlV[i] = Math.min(rlV[i], Math.sqrt(rlV[nx] ** 2 + 2 * 0.72 * brakeLimit(rlV[nx]) * ds(i))); }
      for (let j = 0; j < 2 * rlN; j++) { const i = j % rlN, nx = (i + 1) % rlN; rlV[nx] = Math.min(rlV[nx], Math.sqrt(rlV[i] ** 2 + 2 * 8.5 * ds(i))); }
    }
  }

  // ------------------------------------------------------------------ vehicle state (metres, rear-axle reference)
  const car = { x: WHEELBASE, z: 0, h: Math.PI, v: 0, idx: -1, rlIdx: -1, sp: 0, prevSp: 0, lapStart: null, lap: 0, last: null, best: null, surf: 'asphalt', hits: 0 };
  const ride = createRideModel(ctx.rideSpec);   // body heave / pitch / roll + per-corner travel (data in ride_model.js)
  const mode = { circuit: true, driving: false, autopilot: false, cam: 'free', lastShift: 0, tvSpot: -1, simTime: 0 };
  const keys = new Set();
  const tmp = { f: new THREE.Vector3(), r: new THREE.Vector3(), u: new THREE.Vector3(), m: new THREE.Matrix4(), front: new THREE.Vector3(), rear: new THREE.Vector3() };

  function parkOnGrid() {
    const F = track.at(0);
    // origin is the pole box: front axle at (0,0,0) facing -X
    car.x = -F.tx * WHEELBASE; car.z = -F.tz * WHEELBASE; car.h = Math.atan2(F.tz, F.tx);
    car.x += 0; car.v = 0; car.idx = -1; car.rlIdx = -1; car.lapStart = null; car.lap = 0;
    car.sp = car.prevSp = 0;
    poseCar();
  }

  function surfaceAt(x, z, hint) { return track.locate(x, z, hint); }

  /** place the car model on the surface: origin = front axle on the ground, pitched by the two axle heights */
  function poseCar() {
    if (!carModel) return;
    const fx = Math.cos(car.h), fz = Math.sin(car.h);
    const Lr = surfaceAt(car.x, car.z, car.idx);
    car.idx = Lr.i;
    const frx = car.x + fx * WHEELBASE, frz = car.z + fz * WHEELBASE;
    const Lf = surfaceAt(frx, frz, Lr.i);
    tmp.rear.set(car.x, Lr.y, car.z); tmp.front.set(frx, Lf.y, frz);
    tmp.f.subVectors(tmp.front, tmp.rear).normalize();
    tmp.r.set(-fz, 0, fx).normalize();
    tmp.u.crossVectors(tmp.r, tmp.f).normalize();
    tmp.m.makeBasis(tmp.f.clone().negate(), tmp.r, tmp.u);
    carModel.quaternion.setFromRotationMatrix(tmp.m);
    carModel.position.set(frx * DM, Lf.y * DM, frz * DM);
    car.pitch = Math.asin(THREE.MathUtils.clamp(tmp.f.y, -1, 1));
    // chassis rides on its springs: same plane fit as the tyre-state stance (dz = c0 + cx*x + cy*y)
    const b = ride.body;
    if (b.c0 || b.cx || b.cy) {
      carModel.rotateX(Math.asin(THREE.MathUtils.clamp(b.cy, -1, 1)));
      carModel.rotateY(Math.asin(THREE.MathUtils.clamp(-b.cx, -1, 1)));
      carModel.translateZ(b.c0);
    }
    car.lat = Lf.lat; car.Lf = Lf;
    return Lf;
  }

  function levelForClassic() {
    if (!carModel) return;
    carModel.position.set(0, 0, 0);
    carModel.quaternion.setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0));
  }

  // ------------------------------------------------------------------ UI helpers that drive the existing controls
  const $ = id => document.getElementById(id);
  function setThrottle(t) {
    state.throttle = t; const s = $('slider-throttle'); if (s) s.value = Math.round(t * 100);
    const l = $('val-throttle'); if (l) l.textContent = `${Math.round(t * 100)}%`;
  }
  function setBrake(b) {
    b = Math.round(b);
    state.brakeKgf = b; const s = $('slider-brake'); if (s) s.value = b;
    const l = $('val-brake'); if (l) l.textContent = `${b} kgf`;
    if (b > 15 && state.aeroMode === 'X_MODE') $('btn-aero-toggle')?.click();
  }
  function setSteer(d) {
    state.steeringDeg = d; const s = $('slider-steer'); if (s) s.value = d;
    const l = $('val-steer'); if (l) l.textContent = `${d > 0 ? '+' : ''}${d.toFixed(1)}°`;
  }
  function selectGear(g) {
    const btn = document.querySelector(`.gear-btn[data-gear="${g}"]`);
    if (btn && String(state.gear) !== String(g)) btn.click();
  }
  function ensureEngine() { if (!state.engineOn && !state.pyrofuseCut) $('btn-engine-start')?.click(); }

  // ------------------------------------------------------------------ physics
  function step(dt) {
    const v = car.v;
    const g = state.gear;
    const gearN = typeof g === 'number' ? g : 0;
    let drive = 0;
    if (state.engineOn && !state.pyrofuseCut) {
      if (gearN > 0) {
        const vg = GEAR_VMAX[gearN];
        if (v < vg) {
          drive = state.throttle * Math.min(13.5, POWER / (MASS * Math.max(v, 4)));
          if (gearN >= 3) drive *= THREE.MathUtils.clamp(v / (0.3 * vg), 0.3, 1); // lugging a tall gear
          drive *= THREE.MathUtils.clamp((vg - v) / 2, 0, 1);                      // limiter
        }
      } else if (g === 'R' && v > -6) drive = -state.throttle * 4;
    }
    const L = car.Lf || surfaceAt(car.x, car.z, car.idx);
    const absLat = Math.abs(L.lat);
    const edge = L.lat > 0 ? L.wr : L.wl;
    const runEdge = edge + 1.4 + (L.lat > 0 ? track.d.runR[L.i] : track.d.runL[L.i]);
    const gravEdge = runEdge + (L.lat > 0 ? track.d.gravR[L.i] : track.d.gravL[L.i]);
    car.surf = absLat <= edge + 1.4 ? 'asphalt' : absLat <= runEdge ? 'runoff' : absLat <= gravEdge ? 'gravel' : 'grass';
    const surfDrag = car.surf === 'gravel' ? 7 : car.surf === 'grass' ? 2.5 : 0;
    const kd = state.aeroMode === 'X_MODE' ? 0.00085 : 0.00118;
    let a = drive - kd * v * Math.abs(v) - 9.81 * Math.sin(car.pitch || 0) - Math.sign(v) * (0.25 + surfDrag);
    let dv = a * dt;
    const tyreGrip = state.tyreGrip ?? 1;          // cad/tyre_states.js: compound × wear × weather
    const brake = (state.brakeKgf / 180) * brakeLimit(Math.abs(v)) * (car.surf === 'gravel' ? 0.4 : 1) * tyreGrip * dt;
    let nv = v + dv;
    if (nv > 0) nv = Math.max(0, nv - brake); else if (nv < 0) nv = Math.min(0, nv + brake);
    if (Math.abs(nv) < 0.05 && drive === 0) nv = 0;
    car.v = nv;
    // lateral: kinematic bicycle model with grip-limited yaw rate (understeer at the limit)
    const delta = THREE.MathUtils.degToRad(state.steeringDeg);
    let yaw = (nv * Math.tan(delta)) / WHEELBASE;
    const grip = latLimit(Math.abs(nv)) * (car.surf === 'asphalt' || car.surf === 'runoff' ? 1 : 0.45) * tyreGrip;
    if (Math.abs(nv * yaw) > grip) yaw = Math.sign(yaw) * grip / Math.max(1, Math.abs(nv));
    car.h += yaw * dt;
    ride.update(dt, { aLong: (nv - v) / dt, aLat: nv * yaw, speed: Math.abs(nv) });
    car.x += Math.cos(car.h) * nv * dt;
    car.z += Math.sin(car.h) * nv * dt;
    // barriers
    for (const pt of [[car.x, car.z, 0], [car.x + Math.cos(car.h) * WHEELBASE, car.z + Math.sin(car.h) * WHEELBASE, 1]]) {
      const Lb = surfaceAt(pt[0], pt[1], car.idx);
      const lim = Lb.lat > 0 ? Lb.barR - 1.0 : Lb.barL - 1.0;
      if (Math.abs(Lb.lat) > lim) {
        const push = Math.abs(Lb.lat) - lim;
        const sgn = Math.sign(Lb.lat);
        const rx = -Lb.tz, rz = Lb.tx;
        car.x -= rx * sgn * push; car.z -= rz * sgn * push;
        car.v *= 0.55; car.hits++;
        // align heading with the barrier
        const th = Math.atan2(Lb.tz, Lb.tx) + (car.v < 0 ? Math.PI : 0);
        let dh = ((th - car.h + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
        car.h += dh * 0.5;
      }
    }
    poseCar();
  }

  // ------------------------------------------------------------------ autopilot (pure pursuit on the TUM race line)
  function nearestRL(x, z) {
    let best = -1, bd = Infinity;
    const range = car.rlIdx < 0 ? rlN : 60, start = car.rlIdx < 0 ? 0 : car.rlIdx - 30;
    for (let k = 0; k < range; k++) { const i = raceline.wrap(start + k); const d = (raceline.x[i] - x) ** 2 + (raceline.z[i] - z) ** 2; if (d < bd) { bd = d; best = i; } }
    car.rlIdx = best; return best;
  }
  function autopilot(dt) {
    ensureEngine();
    const v = Math.max(0, car.v);
    const i0 = nearestRL(car.x, car.z);
    const Ld = THREE.MathUtils.clamp(5 + 0.42 * v, 7, 42);
    let i = i0, acc = 0;
    while (acc < Ld) { const j = raceline.wrap(i + 1); acc += Math.hypot(raceline.x[j] - raceline.x[i], raceline.z[j] - raceline.z[i]); i = j; }
    const dx = raceline.x[i] - car.x, dz = raceline.z[i] - car.z;
    const fwd = dx * Math.cos(car.h) + dz * Math.sin(car.h), rgt = dx * -Math.sin(car.h) + dz * Math.cos(car.h);
    const alpha = Math.atan2(rgt, fwd);
    const delta = Math.atan(2 * WHEELBASE * Math.sin(alpha) / Ld);
    setSteer(THREE.MathUtils.clamp(THREE.MathUtils.radToDeg(delta), -30, 30));
    // speed target slightly ahead (reaction margin)
    let j = i0; for (let k = 0; k < Math.round(4 + v * 0.12); k++) j = raceline.wrap(j + 1);
    const vt = Math.min(rlV[i0], rlV[j]) * mode.pace * Math.sqrt(state.tyreGrip ?? 1); // slower on worn / wet / blown tyres
    const err = vt - v;
    if (err > -0.8) { setThrottle(THREE.MathUtils.clamp(0.35 + err * 0.3, 0, 1)); setBrake(0); }
    else { setThrottle(0); setBrake(THREE.MathUtils.clamp(-err * 16, 0, 180)); }
    // automatic seamless shifts
    const now = mode.simTime;
    if (now - mode.lastShift > 0.18) {
      let target = 1; while (target < 8 && v > GEAR_VMAX[target] * 0.93) target++;
      if (String(state.gear) !== String(target)) { selectGear(target); mode.lastShift = now; }
    }
  }
  mode.pace = 1.0;

  // ------------------------------------------------------------------ keyboard driving
  const keyHandler = (e, down) => {
    if (!mode.driving) return;
    const k = e.key.toLowerCase();
    const map = ['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'];
    if (map.includes(k)) { e.preventDefault(); if (down) keys.add(k); else keys.delete(k); if (down && mode.autopilot) setAutopilot(false); }
    if (down && (k === 'e' || k === 'q')) {
      const order = ['R', 'N', 1, 2, 3, 4, 5, 6, 7, 8];
      const idx = order.findIndex(g => String(g) === String(state.gear));
      selectGear(order[THREE.MathUtils.clamp(idx + (k === 'e' ? 1 : -1), 0, order.length - 1)]);
    }
    if (down && k === 'c') cycleCam();
  };
  window.addEventListener('keydown', e => keyHandler(e, true));
  window.addEventListener('keyup', e => keyHandler(e, false));
  function keyboard(dt) {
    if (!keys.size) return;
    const up = keys.has('w') || keys.has('arrowup'), dn = keys.has('s') || keys.has('arrowdown');
    const lf = keys.has('a') || keys.has('arrowleft'), rt = keys.has('d') || keys.has('arrowright');
    if (up || dn) { setThrottle(THREE.MathUtils.clamp(state.throttle + (up ? 3 : -6) * dt, 0, 1)); setBrake(dn ? Math.min(180, state.brakeKgf + 600 * dt) : 0); }
    const maxSteer = THREE.MathUtils.clamp(30 * 14 / Math.max(14, Math.abs(car.v)), 4, 30);
    const target = lf ? -maxSteer : rt ? maxSteer : 0;
    setSteer(THREE.MathUtils.clamp(state.steeringDeg + THREE.MathUtils.clamp(target - state.steeringDeg, -90 * dt, 90 * dt), -30, 30));
  }

  // ------------------------------------------------------------------ cameras
  const camState = { pos: new THREE.Vector3(), look: new THREE.Vector3(), init: false, fov: camera.fov };
  const tvSpots = [];
  for (let sp = 40; sp < track.length; sp += 170) {
    const F = track.at(sp);
    const out = (track.k[F.i] > 0) ? -1 : 1;
    const lat = out > 0 ? F.barR + 9 : -(F.barL + 9);
    tvSpots.push(new THREE.Vector3((F.x + F.rx * lat) * DM, (F.y + 7) * DM, (F.z + F.rz * lat) * DM));
  }
  function carCentre(v = new THREE.Vector3()) {
    const L = car.Lf; const yy = L ? L.y : 0;
    return v.set((car.x + Math.cos(car.h) * WHEELBASE * 0.5) * DM, (yy + 0.6) * DM, (car.z + Math.sin(car.h) * WHEELBASE * 0.5) * DM);
  }
  const lastCarPos = new THREE.Vector3();
  function setCam(m) {
    mode.cam = m;
    camera.up.set(0, 1, 0);
    camState.init = false;
    controls.enabled = !(m === 'chase' || m === 'tv');
    if (m !== 'tv') { camera.fov = camState.fov; camera.updateProjectionMatrix(); }
    if (m === 'overview') {
      const b = new THREE.Box3(); for (let i = 0; i < track.n; i += 10) b.expandByPoint(new THREE.Vector3(track.x[i] * DM, track.y[i] * DM, track.z[i] * DM));
      const c = b.getCenter(new THREE.Vector3());
      controls.target.copy(c);
      camera.position.set(c.x + 2500, c.y + 9500, c.z + 9000);
      camera.lookAt(c); controls.update();
    } else if (m === 'orbit') {
      const c = carCentre();
      controls.target.copy(c);
      camera.position.set(c.x + 40, c.y + 20, c.z + 50); controls.update();
    }
    carCentre(lastCarPos);
    document.querySelectorAll('.rbr-cam').forEach(b => b.classList.toggle('active', b.dataset.cam === m));
  }
  function cycleCam() { const order = ['chase', 'tv', 'orbit', 'overview']; setCam(order[(order.indexOf(mode.cam) + 1) % order.length]); }

  function updateCamera(dt) {
    const c = carCentre(new THREE.Vector3());
    if (mode.cam === 'chase') {
      const fx = Math.cos(car.h), fz = Math.sin(car.h);
      const pitchY = Math.sin(car.pitch || 0);
      const want = new THREE.Vector3(c.x - fx * 9.5 * DM, c.y + (2.3 - pitchY * 9.5) * DM, c.z - fz * 9.5 * DM);
      const look = new THREE.Vector3(c.x + fx * 6 * DM, c.y + (0.4 + pitchY * 6) * DM, c.z + fz * 6 * DM);
      if (!camState.init) { camState.pos.copy(want); camState.look.copy(look); camState.init = true; }
      const kP = 1 - Math.exp(-dt * 9), kL = 1 - Math.exp(-dt * 14);
      camState.pos.lerp(want, kP); camState.look.lerp(look, kL);
      camera.position.copy(camState.pos); camera.lookAt(camState.look);
    } else if (mode.cam === 'tv') {
      let best = 0, bd = Infinity;
      tvSpots.forEach((p, k) => { const d = p.distanceToSquared(c); if (d < bd) { bd = d; best = k; } });
      camera.position.copy(tvSpots[best]);
      camera.lookAt(c);
      const dist = Math.sqrt(bd) / DM;
      camera.fov = THREE.MathUtils.clamp(THREE.MathUtils.radToDeg(2 * Math.atan(9 / Math.max(dist, 1))), 6, 50);
      camera.updateProjectionMatrix();
    } else if (mode.cam === 'orbit') {
      const d = c.clone().sub(lastCarPos);
      camera.position.add(d); controls.target.add(d);
    }
    lastCarPos.copy(c);
  }

  // ------------------------------------------------------------------ circuit / classic set switching
  function applyCircuit(on) {
    mode.circuit = on;
    circuit.group.visible = on;
    if (legacyEnv) legacyEnv.visible = !on;
    if (scene.fog) scene.fog.density = on ? 0.000012 : legacyFog;
    camera.near = on ? 0.5 : 0.1; camera.far = on ? 200000 : 400; camera.updateProjectionMatrix();
    if (on) { if (!mode.driving) parkOnGrid(); } else { setDriving(false); levelForClassic(); }
    $('rbr-classic')?.classList.toggle('active', !on);
  }

  function setDriving(on) {
    mode.driving = on && mode.circuit;
    $('rbr-drive')?.classList.toggle('active', mode.driving);
    if (mode.driving) {
      ensureEngine();
      if (state.gear === 'N') selectGear(1);
      if (mode.cam === 'free') setCam('chase');
    } else {
      setAutopilot(false);
      keys.clear();
    }
  }
  function setAutopilot(on) {
    mode.autopilot = on;
    $('rbr-auto')?.classList.toggle('active', on);
    if (on) { car.rlIdx = -1; if (!mode.driving) setDriving(true); }
  }

  // wrap the showcase camera presets: they frame the parked car at the pole box
  const origSetCamera = window.setCameraView;
  function wrapPresets() {
    if (!window.setCameraView || window.setCameraView.__rbr) return;
    const orig = window.setCameraView;
    const wrapped = function (v) {
      if (mode.driving) setDriving(false);
      mode.cam = 'free'; controls.enabled = true; camera.fov = camState.fov; camera.updateProjectionMatrix();
      document.querySelectorAll('.rbr-cam').forEach(b => b.classList.remove('active'));
      if (mode.circuit) parkOnGrid();
      return orig(v);
    };
    wrapped.__rbr = true;
    window.setCameraView = wrapped;
  }
  wrapPresets();

  // mood select -> tint the sky dome
  $('lab-light-mood')?.addEventListener('change', e => {
    const m = e.target.value;
    sky.visible = m !== 'studio';
    sky.material.color.setRGB(...({ grandprix: [1, 1, 1], sunset: [1.25, 0.62, 0.42], night: [0.06, 0.08, 0.16] }[m] || [1, 1, 1]));
  });

  // ------------------------------------------------------------------ HUD
  const hud = document.createElement('div');
  hud.id = 'rbr-hud';
  hud.innerHTML = `
    <div class="rbr-head"><b>RED BULL RING</b><span>Spielberg · ${(track.length / 1000).toFixed(3)} km · 10 turns · Δh ${circuit.data.meta.elevation_span_m.toFixed(0)} m</span></div>
    <div class="rbr-row">
      <button type="button" id="rbr-drive" class="rbr-btn" title="Drive the car with the throttle / brake / steering / gear controls (or W A S D, Q/E gears, C camera)">Drive</button>
      <button type="button" id="rbr-auto" class="rbr-btn" title="Autopilot follows the TUM race line using the same throttle/brake/steer/gear controls">Autopilot lap</button>
      <button type="button" id="rbr-reset" class="rbr-btn" title="Back to the pole-position grid box">Reset to grid</button>
    </div>
    <div class="rbr-row">
      <button type="button" class="rbr-btn rbr-cam" data-cam="chase">Chase</button>
      <button type="button" class="rbr-btn rbr-cam" data-cam="tv">TV</button>
      <button type="button" class="rbr-btn rbr-cam" data-cam="orbit">Orbit car</button>
      <button type="button" class="rbr-btn rbr-cam" data-cam="overview">Overview</button>
      <button type="button" id="rbr-classic" class="rbr-btn" title="Show the original finish-line studio set instead of the full circuit">Classic set</button>
    </div>
    <div class="rbr-tele"><span id="rbr-lap">Lap –</span><span id="rbr-time">0:00.000</span><span id="rbr-last">Last –</span><span id="rbr-best">Best –</span></div>
    <div class="rbr-tele"><span id="rbr-spd">0 km/h</span><span id="rbr-pos">Grid</span><span id="rbr-surf"></span></div>
    <canvas id="rbr-map" width="220" height="150"></canvas>`;
  const host = $('viewport3d');
  host?.appendChild(hud);
  const css = document.createElement('style');
  css.textContent = `
    #viewport3d{position:relative}
    #rbr-hud{position:absolute;left:10px;bottom:10px;z-index:5;background:rgba(8,12,20,.78);border:1px solid rgba(255,255,255,.12);border-radius:8px;padding:8px 10px;color:#e6edf5;font:12px/1.35 system-ui,sans-serif;width:300px;backdrop-filter:blur(4px);user-select:none}
    #rbr-hud .rbr-head b{font-size:13px;letter-spacing:.08em;margin-right:6px}#rbr-hud .rbr-head span{color:#8b9bb0;font-size:11px}
    #rbr-hud .rbr-row{display:flex;gap:4px;flex-wrap:wrap;margin-top:6px}
    #rbr-hud .rbr-btn{background:#141b26;color:#cfd8e3;border:1px solid #2a3545;border-radius:5px;padding:3px 7px;font-size:11px;cursor:pointer}
    #rbr-hud .rbr-btn.active{background:#00d4e8;color:#04121a;border-color:#00d4e8}
    #rbr-hud .rbr-tele{display:flex;justify-content:space-between;margin-top:5px;font-family:ui-monospace,monospace;font-size:11px}
    #rbr-map{display:block;margin-top:6px;width:220px;height:150px}
    .workspace.panels-hidden #rbr-hud{opacity:.92}`;
  document.head.appendChild(css);
  $('rbr-drive')?.addEventListener('click', () => setDriving(!mode.driving));
  $('rbr-auto')?.addEventListener('click', () => setAutopilot(!mode.autopilot));
  $('rbr-reset')?.addEventListener('click', () => { setAutopilot(false); setThrottle(0); setBrake(0); setSteer(0); parkOnGrid(); camState.init = false; });
  $('rbr-classic')?.addEventListener('click', () => applyCircuit(!mode.circuit));
  document.querySelectorAll('.rbr-cam').forEach(b => b.addEventListener('click', () => { if (!mode.circuit) applyCircuit(true); setCam(b.dataset.cam); }));

  // mini-map
  const mapC = $('rbr-map'), mctx = mapC?.getContext('2d');
  let mapXf = null;
  function drawMap() {
    if (!mctx) return;
    if (!mapXf) {
      let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
      for (let i = 0; i < track.n; i++) { x0 = Math.min(x0, track.x[i]); x1 = Math.max(x1, track.x[i]); z0 = Math.min(z0, track.z[i]); z1 = Math.max(z1, track.z[i]); }
      const s = Math.min((mapC.width - 16) / (x1 - x0), (mapC.height - 16) / (z1 - z0));
      mapXf = { s, ox: 8 + ((mapC.width - 16) - (x1 - x0) * s) / 2 - x0 * s, oz: 8 + ((mapC.height - 16) - (z1 - z0) * s) / 2 - z0 * s };
      const off = document.createElement('canvas'); off.width = mapC.width; off.height = mapC.height;
      const o = off.getContext('2d');
      o.lineWidth = 4; o.lineJoin = 'round'; o.strokeStyle = '#3a4656'; o.beginPath();
      for (let i = 0; i <= track.n; i++) { const k = i % track.n; const X = track.x[k] * s + mapXf.ox, Z = track.z[k] * s + mapXf.oz; i ? o.lineTo(X, Z) : o.moveTo(X, Z); }
      o.stroke(); o.lineWidth = 1.5; o.strokeStyle = '#c9d4e0'; o.stroke();
      o.fillStyle = '#8b9bb0'; o.font = '9px sans-serif';
      circuit.group.userData.turns.forEach(t => o.fillText(String(t.n), t.x * s + mapXf.ox + 4, t.z * s + mapXf.oz - 3));
      const F = track.at(circuit.lineSp); o.fillStyle = '#fff'; o.fillRect(F.x * s + mapXf.ox - 1, F.z * s + mapXf.oz - 4, 2, 8);
      mapXf.bg = off;
    }
    mctx.clearRect(0, 0, mapC.width, mapC.height);
    mctx.drawImage(mapXf.bg, 0, 0);
    const X = car.x * mapXf.s + mapXf.ox, Z = car.z * mapXf.s + mapXf.oz;
    mctx.fillStyle = '#00d4e8'; mctx.beginPath(); mctx.arc(X, Z, 4, 0, Math.PI * 2); mctx.fill();
  }
  const fmt = t => t == null ? '–' : `${Math.floor(t / 60)}:${(t % 60).toFixed(3).padStart(6, '0')}`;
  let hudT = 0;
  function updateHud(dt) {
    hudT += dt; if (hudT < 0.1) return; hudT = 0;
    if (!$('rbr-lap')) return;
    const now = mode.simTime;
    $('rbr-lap').textContent = car.lap ? `Lap ${car.lap}` : 'Lap –';
    $('rbr-time').textContent = car.lapStart != null ? fmt(now - car.lapStart) : '0:00.000';
    $('rbr-last').textContent = `Last ${fmt(car.last)}`;
    $('rbr-best').textContent = `Best ${fmt(car.best)}`;
    $('rbr-spd').textContent = `${Math.round(Math.abs(car.v) * 3.6)} km/h`;
    let label = mode.driving ? `${(car.sp / 1000).toFixed(2)} km` : 'Grid P1';
    const turns = circuit.group.userData.turns;
    for (const t of turns) { const d = car.sp - t.sp; if (d > -80 && d < 60) label = `Turn ${t.n}`; }
    $('rbr-pos').textContent = label;
    $('rbr-surf').textContent = car.surf !== 'asphalt' ? car.surf.toUpperCase() : '';
    drawMap();
  }

  // ------------------------------------------------------------------ lap timing
  function lapTiming() {
    const L = car.Lf; if (!L) return;
    car.prevSp = car.sp; car.sp = L.sp;
    const line = circuit.lineSp;
    if (car.prevSp < line && car.sp >= line && car.sp - car.prevSp < 50) {
      const now = mode.simTime;
      if (car.lapStart != null && car.lap > 0) {
        car.last = now - car.lapStart; car.best = car.best == null ? car.last : Math.min(car.best, car.last);
      }
      car.lapStart = now; car.lap++;
    }
  }

  // ------------------------------------------------------------------ public API (called from app.js)
  applyCircuit(true);
  setCam('free');
  const api = {
    circuit, car, mode, ride,
    /** per-corner suspension travel from the ride model (dm, + = bump); zeros when not driving */
    get suspensionTravel() { return mode.circuit && mode.driving ? ride.travel : null; },
    /** after the stock powertrain sim: replace speed/RPM with the on-track vehicle model while driving */
    update(dt) {
      wrapPresets();
      if (!mode.circuit) return;
      dt = Math.min(dt, 0.05);
      if (mode.driving) {
        if (mode.autopilot) autopilot(dt); else keyboard(dt);
        const sub = Math.max(1, Math.ceil(dt / (1 / 120)));
        for (let i = 0; i < sub; i++) step(dt / sub);
        mode.simTime += dt;
        lapTiming();
        state.speedKmH = Math.abs(car.v) * 3.6;
        const g = typeof state.gear === 'number' ? state.gear : 0;
        if (state.engineOn && g > 0) state.rpm = THREE.MathUtils.clamp(4000 + (Math.abs(car.v) / GEAR_VMAX[g]) * 8000, 4000, 12000);
      } else if (car.v !== 0) {
        car.v = 0;
      }
      if (!mode.driving) ride.reset();
      updateHud(dt);
    },
    beforeRender(dt) {
      if (!mode.circuit) return;
      dt = Math.min(dt, 0.05);
      if (mode.driving || mode.cam !== 'free') updateCamera(dt);
      // keep the sun's shadow frustum around the car
      if (sunLight) {
        const c = carCentre(new THREE.Vector3());
        sunLight.target.position.copy(c);
        sunLight.position.set(c.x + 600, c.y + 1400, c.z + 500);
        const sc = sunLight.shadow.camera;
        if (sc.far !== 4000) { sc.near = 10; sc.far = 4000; sc.left = -160; sc.right = 160; sc.top = 160; sc.bottom = -160; sc.updateProjectionMatrix(); }
      }
    },
    setDriving, setAutopilot, setCam, parkOnGrid, applyCircuit,
    /** teleport to distance sp (m) from the pole box, optionally with speed (m/s) */
    teleport(sp, v = 0, lat = 0) {
      const F = track.at(sp);
      car.x = F.x + F.rx * lat; car.z = F.z + F.rz * lat; car.h = Math.atan2(F.tz, F.tx); car.v = v; car.idx = -1; car.rlIdx = -1;
      poseCar(); camState.init = false; carCentre(lastCarPos);
    },
  };
  window.trackMode = api;
  return api;
}
