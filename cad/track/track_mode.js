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
import { soundEngine } from '../../sfx.js';

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
  const KERB_W = circuit.data.meta.kerb_w ?? 1.4;
  const TURN_NAMES = circuit.data.turnNames || [];
  const SECTOR_SP = (circuit.data.lines || []).filter(l => l.kind === 'sector').map(l => l.sp);
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

  // ------------------------------------------------------------------ pit lane (OpenStreetMap pit lane polyline)
  const pit = circuit.pit, PI = circuit.group.userData.pitInfo;
  const PIT_LIMIT = 80 / 3.6;                       // FIA pit lane speed limit at the Red Bull Ring
  const pitLen = pit.length;
  /** nearest point on the pit lane: s (m from the entry end), lat (m, + = right of travel), y */
  function locatePit(x, z) {
    let best = 0, bd = Infinity;
    for (let j = 0; j < pit.n; j += 4) { const d = (pit.x[j] - x) ** 2 + (pit.z[j] - z) ** 2; if (d < bd) { bd = d; best = j; } }
    for (let j = Math.max(0, best - 4); j <= Math.min(pit.n - 1, best + 4); j++) { const d = (pit.x[j] - x) ** 2 + (pit.z[j] - z) ** 2; if (d < bd) { bd = d; best = j; } }
    let j0 = Math.min(best, pit.n - 2);
    let ex = pit.x[j0 + 1] - pit.x[j0], ez = pit.z[j0 + 1] - pit.z[j0];
    let a = ((x - pit.x[j0]) * ex + (z - pit.z[j0]) * ez) / (ex * ex + ez * ez);
    if (a < 0 && j0 > 0) { j0--; ex = pit.x[j0 + 1] - pit.x[j0]; ez = pit.z[j0 + 1] - pit.z[j0]; a = ((x - pit.x[j0]) * ex + (z - pit.z[j0]) * ez) / (ex * ex + ez * ez); }
    const sl = Math.hypot(ex, ez), tx = ex / sl, tz = ez / sl;
    const ac = Math.max(0, Math.min(1, a));
    const lat = (x - pit.x[j0] - ex * ac) * (-tz) + (z - pit.z[j0] - ez * ac) * tx;
    return { j: j0, s: pit.s[j0] + sl * a, lat, y: pit.y[j0] + (pit.y[j0 + 1] - pit.y[j0]) * ac, tx, tz };
  }
  function pitAt(s) {
    s = Math.max(0, Math.min(pitLen - 0.01, s));
    let j = Math.min(pit.n - 2, Math.floor(s / (pitLen / (pit.n - 1))));
    while (j > 0 && pit.s[j] > s) j--; while (j < pit.n - 2 && pit.s[j + 1] < s) j++;
    const a = (s - pit.s[j]) / Math.max(1e-6, pit.s[j + 1] - pit.s[j]);
    return { x: pit.x[j] + (pit.x[j + 1] - pit.x[j]) * a, z: pit.z[j] + (pit.z[j + 1] - pit.z[j]) * a, rx: -pit.tz[j], rz: pit.tx[j], j };
  }
  const pitEntrySp = track.locate(pit.x[0], pit.z[0], -1).sp;   // where the pit lane leaves the track (m from the pole box)
  // our box: the Red Bull garage, 3rd team from the pit entry after FIA, FOM and McLaren / Mercedes (FIA garage plan,
  // position along the building estimated at s = 463 m), snapped to the nearest painted box
  const BOX_S = PI.boxS.reduce((b, s) => (Math.abs(s - 463) < Math.abs(b - 463) ? s : b), PI.boxS[0]);
  // autopilot pit speed profile: curvature limit, 80 km/h between the pit lane lines, stop at the box
  const pitVin = new Float64Array(pit.n), pitVout = new Float64Array(pit.n);
  {
    for (let j = 0; j < pit.n; j++) {
      const a = Math.max(0, j - 4), b = Math.min(pit.n - 1, j + 4);
      const ax = pit.x[j] - pit.x[a], az = pit.z[j] - pit.z[a], bx = pit.x[b] - pit.x[j], bz = pit.z[b] - pit.z[j];
      const cr = ax * bz - az * bx, la = Math.hypot(ax, az), lb = Math.hypot(bx, bz), lc = Math.hypot(pit.x[b] - pit.x[a], pit.z[b] - pit.z[a]);
      const k = (a === j || b === j) ? 0 : Math.abs(2 * cr / (la * lb * lc + 1e-9));
      const den = k - 0.6 * LAT_B, vc = den > 0 ? Math.min(85, Math.sqrt(0.6 * LAT_A / den)) : 85;
      // 80 km/h between the lines; the pit entry and exit roads are narrow and twisty, so at most about 110 km/h there
      const lim = pit.s[j] >= PI.lineIn - 12 && pit.s[j] <= PI.lineOut + 3 ? PIT_LIMIT - 0.6 : 30;
      pitVin[j] = pit.s[j] >= BOX_S ? 0 : Math.min(vc, lim);
      pitVout[j] = Math.min(vc, lim);
    }
    for (let j = pit.n - 2; j >= 0; j--) pitVin[j] = Math.min(pitVin[j], Math.sqrt(pitVin[j + 1] ** 2 + 2 * 9 * (pit.s[j + 1] - pit.s[j])));
    for (let j = pit.n - 2; j >= 0; j--) pitVout[j] = Math.min(pitVout[j], Math.sqrt(pitVout[j + 1] ** 2 + 2 * 9 * (pit.s[j + 1] - pit.s[j])));
  }
  const smooth = t => { t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); };
  /** autopilot lateral target in the pit lane: centre at the ends, fast lane by the pit wall, box lateral at our box */
  function pitLatTarget(s) {
    const fast = -PI.bSide * 2.6;
    const ends = smooth(s / 70) * smooth((pitLen - s) / 70);
    const box = smooth(1 - (Math.abs(s - BOX_S) - 4) / 28);
    return fast * ends * (1 - box) + PI.boxLat * box;
  }

  // ------------------------------------------------------------------ vehicle state (metres, rear-axle reference)
  const car = { x: WHEELBASE, z: 0, h: Math.PI, v: 0, idx: -1, rlIdx: -1, sp: 0, prevSp: 0, lapStart: null, lap: 0, last: null, best: null, surf: 'asphalt', hits: 0, sectors: [null, null, null], secStart: 0, inPit: false, pitS: -1, pitLimiter: false };
  const ride = createRideModel(ctx.rideSpec);   // body heave / pitch / roll + per-corner travel (data in ride_model.js)
  const mode = { circuit: true, driving: false, autopilot: false, cam: 'free', lastShift: 0, tvSpot: -1, simTime: 0, pitReq: false, pitPhase: null, pitT: 0, pitTyresChanged: false };
  const keys = new Set();
  const tmp = { f: new THREE.Vector3(), r: new THREE.Vector3(), u: new THREE.Vector3(), m: new THREE.Matrix4(), front: new THREE.Vector3(), rear: new THREE.Vector3() };

  function parkOnGrid() {
    const F = track.at(0);
    // origin is the pole box: front axle at (0,0,0) facing -X
    car.x = -F.tx * WHEELBASE; car.z = -F.tz * WHEELBASE; car.h = Math.atan2(F.tz, F.tx);
    car.x += 0; car.v = 0; car.idx = -1; car.rlIdx = -1; car.inPit = false; car.lapStart = null; car.lap = 0; car.sectors = [null, null, null];
    car.sp = car.prevSp = 0;
    mode.pitTyresChanged = false;
    setAeroMode('Z_MODE');
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
    if (car.inPit) { Lr.y = locatePit(car.x, car.z).y; Lf.y = locatePit(frx, frz).y; }
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
    if (mode.pitPhase === 'stop') {
      carModel.position.y += 0.4 * DM; // Visually raised on jacks during 2.4s stop
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
  function setAeroMode(target) {
    if (state.aeroMode !== target) $('btn-aero-toggle')?.click();
  }
  function setThrottle(t) {
    state.throttle = t; const s = $('slider-throttle'); if (s) s.value = Math.round(t * 100);
    const l = $('val-throttle'); if (l) l.textContent = `${Math.round(t * 100)}%`;
  }
  function setBrake(b) {
    b = Math.round(b);
    state.brakeKgf = b; const s = $('slider-brake'); if (s) s.value = b;
    const l = $('val-brake'); if (l) l.textContent = `${b} kgf`;
    if (b > 15 && state.aeroMode === 'X_MODE') setAeroMode('Z_MODE');
  }
  function setSteer(d) {
    state.steeringDeg = d; const s = $('slider-steer'); if (s) s.value = d;
    const l = $('val-steer'); if (l) l.textContent = `${d > 0 ? '+' : ''}${d.toFixed(1)}°`;
    if (Math.abs(d) > 8 && Math.abs(car.v) > 38 && state.aeroMode === 'X_MODE') setAeroMode('Z_MODE');
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
          if (car.pitLimiter) drive *= THREE.MathUtils.clamp((PIT_LIMIT - v) / 1.5, 0, 1); // pit lane speed limiter
        }
      } else if (g === 'R' && v > -6) drive = -state.throttle * 4;
    }
    const L = car.Lf || surfaceAt(car.x, car.z, car.idx);
    const absLat = Math.abs(L.lat);
    const edge = L.lat > 0 ? L.wr : L.wl;
    const kerbEdge = edge + KERB_W;
    const runEdge = kerbEdge + (L.lat > 0 ? track.d.runR[L.i] : track.d.runL[L.i]);
    const gravEdge = kerbEdge + (L.lat > 0 ? track.d.gravR[L.i] : track.d.gravL[L.i]);   // gravel starts right behind the kerb
    car.surf = car.inPit ? 'asphalt' : absLat <= kerbEdge ? 'asphalt' : absLat <= gravEdge ? 'gravel' : absLat <= runEdge ? 'runoff' : 'grass';
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
    updatePit();
    for (const pt of [[car.x, car.z, 0], [car.x + Math.cos(car.h) * WHEELBASE, car.z + Math.sin(car.h) * WHEELBASE, 1]]) {
      if (pitBarrier(pt[0], pt[1])) continue;
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

  // ------------------------------------------------------------------ pit lane state: drive in, limiter, pit wall
  function trackEdgeInfo(x, z) {
    const Lt = surfaceAt(x, z, car.idx);
    return { Lt, onTrack: Math.abs(Lt.lat) <= (Lt.lat > 0 ? Lt.wr : Lt.wl) + KERB_W, offTrack: Math.abs(Lt.lat) > (Lt.lat > 0 ? Lt.wr : Lt.wl) + KERB_W + 0.5 };
  }
  function updatePit() {
    const cx = car.x + Math.cos(car.h) * WHEELBASE * 0.5, cz = car.z + Math.sin(car.h) * WHEELBASE * 0.5;
    const Lp = locatePit(cx, cz);
    const inLane = Math.abs(Lp.lat) < PI.PW / 2 - 0.2 && Lp.s > 2 && Lp.s < pitLen - 2;
    if (!car.inPit) {
      // drive in: inside the pit lane and off the race track (or the Autopilot pit stop is on its way in)
      if (inLane && (mode.pitPhase === 'approach' || trackEdgeInfo(cx, cz).offTrack)) car.inPit = true;
    } else {
      // drive out: the end of the pit lane, or back onto the track at the entry (driver changed their mind) or exit
      const auto = mode.autopilot && mode.pitPhase;
      const atEnd = Lp.s > pitLen - 70 && (!auto || mode.pitPhase === 'out');
      const atEntry = Lp.s < 45 && !auto;
      if (Lp.s >= pitLen - 3 || ((atEnd || atEntry) && trackEdgeInfo(cx, cz).onTrack && Math.abs(Lp.lat) > PI.PW / 2 - 0.5)) car.inPit = false;
    }
    car.pitS = car.inPit ? Lp.s : -1;
    car.pitLat = Lp.lat;
    car.pitLimiter = (car.inPit && Lp.s >= PI.lineIn && Lp.s <= PI.lineOut) || !!state.wheel?.flags?.pitLimiter; // PL button on the wheel
  }
  /** pit lane walls for one corner point of the car. true = the point was handled by the pit lane (skip track barriers) */
  function pitBarrier(x, z) {
    const Lp = locatePit(x, z);
    const wallHere = PI.wallJ[Math.max(0, Math.min(pit.n - 1, Lp.j))] === 1;
    const towardTrack = Lp.lat * Math.sign(PI.wallLat);   // + = toward the track side of the pit lane
    const wallPos = Math.abs(PI.wallLat);
    let push = 0;
    if (car.inPit) {
      if (wallHere && towardTrack > wallPos - 1.0) push = towardTrack - (wallPos - 1.0);                     // pit wall
      else if (-towardTrack > PI.PW / 2 + 4.0) push = towardTrack + (PI.PW / 2 + 4.0);                        // garage fronts
      if (push) hitPit(Lp, push);
      return true;
    }
    // on the race track side of the pit wall: keep the car off it
    if (wallHere && Lp.s > 0 && Lp.s < pitLen && towardTrack > wallPos && towardTrack < wallPos + 1.0) hitPit(Lp, towardTrack - (wallPos + 1.0));
    return false;
  }
  function hitPit(Lp, push) {   // push > 0 moves the car away from the track side, < 0 toward it
    const rx = -Lp.tz, rz = Lp.tx, sgn = Math.sign(PI.wallLat);
    car.x -= rx * sgn * push; car.z -= rz * sgn * push;
    car.v *= 0.55; car.hits++;
    const th = Math.atan2(Lp.tz, Lp.tx) + (car.v < 0 ? Math.PI : 0);
    const dh = ((th - car.h + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
    car.h += dh * 0.5;
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
    if (mode.pitReq && !mode.pitPhase) {
      const dE = ((pitEntrySp - car.sp) % track.length + track.length) % track.length;
      if (dE < 260 && !car.inPit) mode.pitPhase = 'approach';
    }
    if (mode.pitPhase) { pitAutopilot(dt); return; }
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
    // 2026 Active Aerodynamics: Straight Mode (X-Mode) on straights, Z-Mode for corners & braking
    const distToNextTurn = circuit.turnSp?.length
      ? Math.min(...circuit.turnSp.map(t => ((t - car.sp) % track.length + track.length) % track.length))
      : 999;
    const canUseXMode = !car.inPit && !mode.pitPhase && car.surf === 'asphalt' &&
      state.throttle > 0.85 && state.brakeKgf === 0 &&
      v > 38 && Math.abs(state.steeringDeg) < 3.2 &&
      distToNextTurn > 85 && err > -0.2;
    setAeroMode(canUseXMode ? 'X_MODE' : 'Z_MODE');
  }
  mode.pace = 1.0;
  /** Autopilot pit stop: leave the track at the pit entry, 80 km/h between the lines, stop at our box, drive out */
  function pitAutopilot(dt) {
    setAeroMode('Z_MODE');
    const v = Math.max(0, car.v);
    const cx = car.x + Math.cos(car.h) * WHEELBASE * 0.5, cz = car.z + Math.sin(car.h) * WHEELBASE * 0.5;
    let s;                                              // car centre, metres along the pit lane (negative before the entry)
    if (car.inPit) s = car.pitS;
    else if (mode.pitPhase === 'approach') {
      const dE = ((pitEntrySp - car.sp) % track.length + track.length) % track.length;
      s = dE > track.length / 2 ? locatePit(cx, cz).s : -dE + 1.7;
      if (s > 60) { mode.pitPhase = null; mode.pitReq = false; $('rbr-pit')?.classList.remove('active'); car.rlIdx = -1; return; } // missed the entry
    }
    else {
      const Lp = locatePit(cx, cz);
      if (Math.abs(Lp.lat) < 25 && Lp.s < pitLen - 6) s = Lp.s;
      else { mode.pitPhase = null; mode.pitReq = false; $('rbr-pit')?.classList.remove('active'); car.rlIdx = -1; return; }   // back on the track: normal Autopilot
    }
    if (car.inPit && mode.pitPhase === 'approach') mode.pitPhase = 'in';
    // steering: pure pursuit on the pit lane (on the track before the entry)
    const Ld = THREE.MathUtils.clamp(4 + 0.4 * v, 6, 30);
    const st = s + Ld;
    let tx, tz;
    if (st < 0) { const F = track.at(pitEntrySp + st); const L0 = track.locate(pit.x[0], pit.z[0], -1).lat; tx = F.x + F.rx * L0; tz = F.z + F.rz * L0; }
    else { const P = pitAt(st), lt = pitLatTarget(st); tx = P.x + P.rx * lt; tz = P.z + P.rz * lt; }
    const dx = tx - car.x, dz = tz - car.z;
    const fwd = dx * Math.cos(car.h) + dz * Math.sin(car.h), rgt = dx * -Math.sin(car.h) + dz * Math.cos(car.h);
    const Lr = Math.max(4, Math.hypot(dx, dz));
    setSteer(THREE.MathUtils.clamp(THREE.MathUtils.radToDeg(Math.atan(2 * WHEELBASE * Math.sin(Math.atan2(rgt, fwd)) / Lr)), -30, 30));
    // speed target
    let vt;
    const prof = mode.pitPhase === 'out' ? pitVout : pitVin;
    const at = q => prof[Math.max(0, Math.min(pit.n - 1, Math.round(q / (pitLen / (pit.n - 1)))))];
    if (s < 0) vt = Math.min(rlV[nearestRL(car.x, car.z)], Math.sqrt(at(0) ** 2 + 2 * 9 * -s));
    else vt = Math.min(at(s), at(s + 4 + v * 0.3));
    if (mode.pitPhase === 'in') {
      const left = BOX_S - s;
      vt = Math.min(vt, Math.sqrt(2 * 4 * Math.max(0, left - 0.2)));
      if (left < 0.6 && v < 1.0) { mode.pitPhase = 'stop'; mode.pitT = 0; mode.pitTyresChanged = false; }
    }
    if (mode.pitPhase === 'stop') {
      setThrottle(0); setBrake(180);
      const prevT = mode.pitT;
      mode.pitT += dt;
      // Animate pit gantry lights and mechanics jacks
      circuit.group?.userData?.pitStation?.userData?.updatePitState?.('stop', mode.pitT);
      // Wheel gun pneumatic pop as jacks lift the car
      if (prevT === 0 && mode.pitT > 0) {
        soundEngine?.playShiftPop?.();
      }
      // Service tyres at t = 1.2s: fit fresh tyres, repair any blown corners, reset session wear
      if (!mode.pitTyresChanged && mode.pitT >= 1.2) {
        mode.pitTyresChanged = true;
        if (window.tyreStates) {
          try {
            window.tyreStates.setBlown('all', false);
            window.tyreStates.setTyreWear('all', 'new');
          } catch (e) {
            console.warn('[track_mode] pit tyre refresh failed:', e);
          }
        }
        if (window.sessions?.player) {
          window.sessions.player.wear = 0;
          window.sessions.render?.();
        }
        soundEngine?.playShiftPop?.();
      }
      if (mode.pitT > 2.4) {
        mode.pitPhase = 'out';
        mode.pitTyresChanged = false;
        circuit.group?.userData?.pitStation?.userData?.updatePitState?.('out', 0);
      }
      return;
    }
    const err = vt - v;
    if (err > -0.5) { setThrottle(THREE.MathUtils.clamp(0.3 + err * 0.3, 0, 1)); setBrake(0); }
    else { setThrottle(0); setBrake(THREE.MathUtils.clamp(-err * 20, 0, 180)); }
    const now = mode.simTime;
    if (now - mode.lastShift > 0.18) {
      let target = 1; while (target < 8 && v > GEAR_VMAX[target] * 0.93) target++;
      if (String(state.gear) !== String(target)) { selectGear(target); mode.lastShift = now; }
    }
    if (mode.pitPhase === 'out' && s >= pitLen - 6) { mode.pitPhase = null; mode.pitReq = false; mode.pitTyresChanged = false; $('rbr-pit')?.classList.remove('active'); car.rlIdx = -1; }
  }
  function requestPitStop(on = true) {
    mode.pitReq = on; if (!on) { mode.pitPhase = null; mode.pitTyresChanged = false; }
    $('rbr-pit')?.classList.toggle('active', on);
    if (on && !mode.autopilot) setAutopilot(true);
  }

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
    } else if (m === 'pit') {
      const PI = circuit.group.userData.pitInfo;
      const P = pitAt(BOX_S);
      const pbLat = PI ? PI.bSide * (PI.PW / 2 - 2.75) : 0;
      const cx = (P.x + P.rx * pbLat) * DM;
      const cy = P.y * DM;
      const cz = (P.z + P.rz * pbLat) * DM;
      const bs = PI ? PI.bSide : 1;
      const camX = cx - P.rx * bs * 6.5 * DM + P.tx * 1.5 * DM;
      const camY = cy + 2.5 * DM;
      const camZ = cz - P.rz * bs * 6.5 * DM + P.tz * 1.5 * DM;
      controls.target.set(cx, cy + 1.2 * DM, cz);
      camera.position.set(camX, camY, camZ); controls.update();
    }
    carCentre(lastCarPos);
    document.querySelectorAll('.rbr-cam').forEach(b => b.classList.toggle('active', b.dataset.cam === m));
  }
  function cycleCam() { const order = ['chase', 'tv', 'orbit', 'overview', 'pit']; setCam(order[(order.indexOf(mode.cam) + 1) % order.length]); }

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
    } else if (mode.cam === 'pit') {
      controls.update();
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
      setAeroMode('Z_MODE');
      keys.clear();
    }
  }
  function setAutopilot(on) {
    mode.autopilot = on;
    if (!on) {
      mode.pitReq = false;
      mode.pitPhase = null;
      $('rbr-pit')?.classList.remove('active');
      setAeroMode('Z_MODE');
    }
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
    <div class="rbr-head">
      <div class="rbr-head-title"><b>RED BULL RING</b><span>Spielberg · ${(track.length / 1000).toFixed(3)} km · 10 turns · Δh ${circuit.data.meta.elevation_span_m.toFixed(0)} m</span></div>
      <button type="button" id="rbr-min" class="rbr-min-btn" title="Collapse HUD" aria-label="Collapse HUD">▾</button>
    </div>
    <div id="rbr-body">
      <div class="rbr-row">
        <button type="button" id="rbr-drive" class="rbr-btn" title="Drive the car with the throttle / brake / steering / gear controls (or W A S D, Q/E gears, C camera)">Drive</button>
        <button type="button" id="rbr-auto" class="rbr-btn" title="Autopilot follows the TUM race line using the same throttle/brake/steer/gear controls">Autopilot lap</button>
        <button type="button" id="rbr-pit" class="rbr-btn" title="Autopilot drives into the pit lane at the next pit entry, keeps to 80 km/h, stops at the Red Bull box and drives out">Autopilot pit stop</button>
        <button type="button" id="rbr-reset" class="rbr-btn" title="Back to the pole-position grid box">Reset to grid</button>
      </div>
      <div class="rbr-row">
        <button type="button" class="rbr-btn rbr-cam" data-cam="chase">Chase</button>
        <button type="button" class="rbr-btn rbr-cam" data-cam="tv">TV</button>
        <button type="button" class="rbr-btn rbr-cam" data-cam="orbit">Orbit car</button>
        <button type="button" class="rbr-btn rbr-cam" data-cam="overview">Overview</button>
        <button type="button" class="rbr-btn rbr-cam" data-cam="pit" title="Focus camera on the Red Bull pit box and pit crew">Pit Box</button>
        <button type="button" id="rbr-classic" class="rbr-btn" title="Show the original finish-line studio set instead of the full circuit">Classic set</button>
      </div>
      <div class="rbr-tele"><span id="rbr-lap">Lap –</span><span id="rbr-time">0:00.000</span><span id="rbr-last">Last –</span><span id="rbr-best">Best –</span></div>
      <div class="rbr-tele"><span id="rbr-s1">S1 –</span><span id="rbr-s2">S2 –</span><span id="rbr-s3">S3 –</span></div>
      <div class="rbr-tele"><span id="rbr-spd">0 km/h</span><span id="rbr-pos">Grid</span><span id="rbr-surf"></span></div>
      <canvas id="rbr-map" width="220" height="150"></canvas>
    </div>`;
  const host = $('viewport3d');
  host?.appendChild(hud);
  const css = document.createElement('style');
  css.textContent = `
    #viewport3d{position:relative}
    #rbr-hud{position:absolute;left:10px;bottom:10px;z-index:5;background:rgba(8,12,20,.78);border:1px solid rgba(255,255,255,.12);border-radius:8px;padding:8px 10px;color:#e6edf5;font:12px/1.35 system-ui,sans-serif;width:300px;backdrop-filter:blur(4px);user-select:none;transition:width .2s ease}
    #rbr-hud .rbr-head{display:flex;justify-content:space-between;align-items:flex-start;gap:6px}
    #rbr-hud .rbr-head-title{flex:1;min-width:0}
    #rbr-hud .rbr-head b{font-size:13px;letter-spacing:.08em;margin-right:6px}#rbr-hud .rbr-head span{color:#8b9bb0;font-size:11px}
    #rbr-hud .rbr-min-btn{background:none;border:1px solid rgba(255,255,255,.15);border-radius:4px;color:#8b9bb0;cursor:pointer;font-size:11px;width:20px;height:20px;display:flex;align-items:center;justify-content:center;padding:0;flex-shrink:0;line-height:1}
    #rbr-hud .rbr-min-btn:hover{color:#fff;border-color:rgba(255,255,255,.3);background:rgba(255,255,255,.08)}
    #rbr-hud.min{width:auto}
    #rbr-hud.min #rbr-body{display:none}
    #rbr-hud.min .rbr-head{cursor:pointer}
    #rbr-hud .rbr-row{display:flex;gap:4px;flex-wrap:wrap;margin-top:6px}
    #rbr-hud .rbr-btn{background:#141b26;color:#cfd8e3;border:1px solid #2a3545;border-radius:5px;padding:3px 7px;font-size:11px;cursor:pointer}
    #rbr-hud .rbr-btn.active{background:#00d4e8;color:#04121a;border-color:#00d4e8}
    #rbr-hud .rbr-tele{display:flex;justify-content:space-between;margin-top:5px;font-family:ui-monospace,monospace;font-size:11px}
    #rbr-map{display:block;margin-top:6px;width:220px;height:150px}
    .workspace.panels-hidden #rbr-hud{opacity:.92}`;
  document.head.appendChild(css);
  $('rbr-min')?.addEventListener('click', (e) => {
    e.stopPropagation();
    const isMin = hud.classList.toggle('min');
    $('rbr-min').textContent = isMin ? '▸' : '▾';
    $('rbr-min').title = isMin ? 'Expand HUD' : 'Collapse HUD';
  });
  hud.querySelector('.rbr-head')?.addEventListener('click', () => {
    if (hud.classList.contains('min')) {
      hud.classList.remove('min');
      const b = $('rbr-min');
      if (b) { b.textContent = '▾'; b.title = 'Collapse HUD'; }
    }
  });
  $('rbr-drive')?.addEventListener('click', () => setDriving(!mode.driving));
  $('rbr-auto')?.addEventListener('click', () => setAutopilot(!mode.autopilot));
  $('rbr-pit')?.addEventListener('click', () => requestPitStop(!mode.pitReq));
  $('rbr-reset')?.addEventListener('click', () => { setAutopilot(false); setThrottle(0); setBrake(0); setSteer(0); parkOnGrid(); camState.init = false; });
  $('rbr-classic')?.addEventListener('click', () => applyCircuit(!mode.circuit));
  document.querySelectorAll('.rbr-cam').forEach(b => b.addEventListener('click', () => { if (!mode.circuit) applyCircuit(true); setCam(b.dataset.cam); }));

  // Live team livery synchronization with 3D pit crew uniforms
  window.addEventListener('f1:team-changed', (e) => {
    circuit.group?.userData?.pitStation?.userData?.setTeam?.(e.detail.teamId);
  });

  // mini-map
  const mapC = $('rbr-map'), mctx = mapC?.getContext('2d');
  let mapXf = null;
  function drawMap() {
    if (!mctx || hud.classList.contains('min')) return;
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
      // DRS zones (activation line to the next braking zone), FIA circuit map
      const L = circuit.data.lines || [];
      o.strokeStyle = '#2bd46b'; o.lineWidth = 2.5;
      L.filter(l => l.kind === 'drsAct').forEach(a => {
        const tEnd = circuit.turnSp.map(t => ((t - a.sp) % track.length + track.length) % track.length).filter(d => d > 60).sort((x, y) => x - y)[0] - 120;
        o.beginPath();
        for (let d = 0; d <= tEnd; d += 5) { const P = track.at(a.sp + d); const X = P.x * s + mapXf.ox, Z = P.z * s + mapXf.oz; d ? o.lineTo(X, Z) : o.moveTo(X, Z); }
        o.stroke();
      });
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
    const sf = t => t == null ? '–' : t.toFixed(3);
    ['s1', 's2', 's3'].forEach((k, j) => { const el = $('rbr-' + k); if (el) el.textContent = `S${j + 1} ${sf(car.sectors[j])}`; });
    $('rbr-spd').textContent = `${Math.round(Math.abs(car.v) * 3.6)} km/h`;
    let label = mode.driving ? `${(car.sp / 1000).toFixed(2)} km` : 'Grid P1';
    const turns = circuit.group.userData.turns;
    for (const t of turns) { const d = car.sp - t.sp; if (d > -80 && d < 60) label = `Turn ${t.n}${TURN_NAMES[t.n - 1] ? ' ' + TURN_NAMES[t.n - 1] : ''}`; }
    if (car.inPit) label = 'Pit lane';
    $('rbr-pos').textContent = label;
    $('rbr-surf').textContent = mode.pitPhase === 'stop' ? (mode.pitT >= 1.2 ? 'PIT STOP: TYRES FITTED' : 'PIT STOP: BOXING') : car.pitLimiter ? 'PIT LIMITER 80' : car.inPit ? 'PIT LANE' : mode.pitReq ? 'BOX THIS LAP' : car.surf !== 'asphalt' ? car.surf.toUpperCase() : state.aeroMode === 'X_MODE' ? 'X-MODE' : '';
    drawMap();
  }

  // ------------------------------------------------------------------ lap timing
  const crossed = (a, b, line) => {           // moved forward over a line at distance `line` (handles the lap wrap)
    const d = ((b - a) % track.length + track.length) % track.length;
    if (d > 50) return false;
    const o = ((line - a) % track.length + track.length) % track.length;
    return o > 0 && o <= d;
  };
  function lapTiming() {
    const L = car.Lf; if (!L) return;
    car.prevSp = car.sp; car.sp = L.sp;
    const now = mode.simTime;
    // the grid is 120 m ahead of the finish line: the clock starts when the car leaves its grid box (standing-start lap)
    if (car.lapStart == null && mode.driving && Math.abs(car.v) > 0.5 && car.sp < 60) { car.lapStart = now; car.secStart = now; car.lap = 1; }
    // sector splits: finish line -> S1 line -> S2 line -> finish line (FIA circuit map)
    SECTOR_SP.forEach((sp, j) => {
      if (car.lapStart != null && crossed(car.prevSp, car.sp, sp)) { car.sectors[j] = now - car.secStart; car.secStart = now; }
    });
    if (crossed(car.prevSp, car.sp, circuit.lineSp)) {
      if (car.lapStart != null && car.lap > 0) {
        car.last = now - car.lapStart; car.best = car.best == null ? car.last : Math.min(car.best, car.last);
        if (SECTOR_SP.length) car.sectors[SECTOR_SP.length] = now - car.secStart;
      }
      car.lapStart = now; car.secStart = now; car.lap++;
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
    setDriving, setAutopilot, setCam, parkOnGrid, applyCircuit, requestPitStop, locatePit, pitAt, BOX_S, pitEntrySp,
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
