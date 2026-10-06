/**
 * weather.js — data-driven weather for the 2026 F1 Nimble Car: cloud cover, rain, wind, fog, track water.
 * Settings and presets: weather_presets.json. Visuals: weather_fx.js. API on window.weather.
 *  - Light: sun / ambient / sky / fog follow cloud cover and rain (works on top of the Light slider and Atmosphere menu).
 *  - Track: water level rises with rain and dries without it; drives the wet look, puddles and a drying racing line.
 *  - Tyres: grip from compound × water level × wear overrides state.tyreGrip, so slicks slide in the wet and
 *    inters / wets work (cad/tyre_states.js still handles tyre looks, spray and the wet sheen via setWeather).
 *  - Wind: head/tail wind changes top speed, crosswind pushes the car a little; also bends rain, flags, trees and clouds.
 *  - Sessions: follows the per-session forecast when a Practice / Qualifying session is running (or set it by hand).
 * SREdesigns - Samuel R Erwin III
 */
import * as THREE from 'three';
import { createClouds, createRain, createFlags, patchTrees, createWetSurface, createLensDrops } from './weather_fx.js';

const url = p => new URL(p, import.meta.url).href;
const KEYS = ['cloud', 'rain', 'windKmh', 'windFrom', 'fog'];
const lerpCurve = (pts, x) => { for (let i = 1; i < pts.length; i++) if (x <= pts[i][0]) { const [x0, y0] = pts[i - 1], [x1, y1] = pts[i]; return y0 + (y1 - y0) * (x - x0) / (x1 - x0); } return pts[pts.length - 1][1]; };
const angLerp = (a, b, t) => a + ((((b - a) % 360) + 540) % 360 - 180) * t;

export async function initWeather({ scene, camera, renderer, sunLight, ambientLight, trackMode, tyreStates, state }) {
  const q = new URLSearchParams(location.search);
  if (q.get('wx') === 'off') { console.info('[weather] off (?wx=off)'); return null; }
  const cfg = await fetch(url('./weather_presets.json')).then(r => r.json());
  let quality = cfg.quality[q.get('wq')] ? q.get('wq') : cfg.defaultQuality;
  const Q = () => cfg.quality[quality];
  const circuit = trackMode?.circuit;

  // current weather (W) and where it is heading (target)
  const W = { ...cfg.presets[cfg.default], wind: new THREE.Vector3(), gust: 1, water: cfg.presets[cfg.default].water };
  const target = { ...cfg.presets[cfg.default] };
  const st = { source: 'manual', preset: cfg.default, lastWater: 0, dryLine: 0, wetLook: false, grip: 1, best: 'slick', t: 0 };
  const initial = cfg.presets[q.get('wx')] ? q.get('wx') : null;

  // ---------------------------------------------------------------- effects
  // Effects are created only while the weather needs them and disposed when it no longer does
  // (rain / clouds / puddles / lens drops). Mist is scene fog, so it costs nothing extra.
  const fx = {};
  const host = document.getElementById('viewport3d');
  const offFor = { rain: 0, clouds: 0, wet: 0, lens: 0 };
  function want(name, on, make, dt) {
    if (on) { offFor[name] = 0; if (!fx[name]) { try { fx[name] = make(); } catch (e) { console.warn('[weather] ' + name + ' skipped', e); fx[name] = null; } } return; }
    if (fx[name] && (offFor[name] += dt) > 2) { fx[name].dispose(); fx[name] = null; }   // 2 s grace so a passing change does not rebuild
  }
  function manageFx(dt) {
    const tm = trackMode;
    want('clouds', W.cloud > 0.04, () => createClouds(scene, Q().cloudLayers), dt);
    want('rain', W.rain > 0.01, () => createRain(scene, Q().rainDrops), dt);
    want('wet', !!circuit && W.water > 0.08, () => createWetSurface(circuit.group, circuit, renderer, Q().puddles), dt);
    want('lens', !!host && Q().lensDrops && W.rain > 0.03 && tm?.mode?.circuit && tm.mode.cam === 'chase', () => createLensDrops(host), dt);
  }
  function rebuildFx() { ['clouds', 'rain', 'wet', 'lens'].forEach(n => { fx[n]?.dispose(); fx[n] = null; }); }
  if (circuit) {
    try { fx.flags = createFlags(circuit.group, circuit.track); } catch (e) { console.warn('[weather] flags skipped', e); }
    fx.trees = patchTrees(circuit.group);
  }

  // ---------------------------------------------------------------- light, sky and fog (multiply whatever the app last set)
  const base = { sun: null, amb: null, fogC: new THREE.Color(), fogD: null, sky: new THREE.Color(1, 1, 1) };
  const applied = { sun: -1, amb: -1, fogD: -1, fogC: new THREE.Color(-1, 0, 0), sky: new THREE.Color(-1, 0, 0) };
  const sky = circuit?.group?.userData?.sky;
  const fills = []; scene.traverse(o => { if (o.isDirectionalLight && o !== sunLight) fills.push({ l: o, base: o.intensity, applied: -1 }); });   // app fill / bounce lights
  const fogColour = new THREE.Color(cfg.light.fogColour), tmpC = new THREE.Color();
  const lit = new THREE.Color(), dark = new THREE.Color();
  function applyLight() {
    const L = cfg.light, cov = THREE.MathUtils.clamp(W.cloud, 0, 1);
    const sunK = THREE.MathUtils.lerp(1, L.sunAtOvercast, Math.pow(cov, 1.6)) * (1 - 0.35 * W.rain);
    const ambK = THREE.MathUtils.lerp(1, L.ambientAtOvercast, cov) * (1 - 0.25 * W.rain);
    if (sunLight) { if (sunLight.intensity !== applied.sun) base.sun = sunLight.intensity; sunLight.intensity = applied.sun = base.sun * sunK; sunLight.castShadow = sunK > 0.22; }
    fills.forEach(f => { if (f.l.intensity !== f.applied) f.base = f.l.intensity; f.l.intensity = f.applied = f.base * THREE.MathUtils.lerp(1, 0.45, cov) * (1 - 0.3 * W.rain); });
    if (ambientLight) { if (ambientLight.intensity !== applied.amb) base.amb = ambientLight.intensity; ambientLight.intensity = applied.amb = base.amb * ambK; }
    const circuitOn = trackMode?.mode?.circuit;
    if (scene.fog && circuitOn) {
      if (scene.fog.density !== applied.fogD) base.fogD = scene.fog.density;
      if (!scene.fog.color.equals(applied.fogC)) base.fogC.copy(scene.fog.color);
      const f = Math.max(W.fog, W.rain * 0.8);
      scene.fog.density = applied.fogD = base.fogD + L.fogDensityMax * f * f;
      scene.fog.color.copy(base.fogC).lerp(tmpC.copy(fogColour).multiplyScalar(0.6 + 0.4 * sunK), Math.min(1, cov * 0.8 + f * 0.4));
      applied.fogC.copy(scene.fog.color);
    }
    if (sky) {
      if (!sky.material.color.equals(applied.sky)) base.sky.copy(sky.material.color);
      tmpC.setRGB(...L.skyAtOvercast);
      sky.material.color.copy(base.sky).multiply(tmpC.lerp(new THREE.Color(1, 1, 1), 1 - cov)).multiplyScalar(1 - 0.3 * W.rain);
      applied.sky.copy(sky.material.color);
    }
    lit.setRGB(1, 1, 1).multiplyScalar(0.55 + 0.45 * sunK);
    dark.setRGB(0.42, 0.45, 0.5).multiplyScalar(0.55 + 0.45 * sunK);
  }

  // ---------------------------------------------------------------- forecast timeline (sessions)
  function sessionMinute() {
    const S = window.sessions?.engine?.state; if (!S) return null;
    let m = S.elapsed / 60;
    if (S.type === 'qualifying') for (let i = 0; i < S.segIdx; i++) m += S.def.segments[i].minutes;
    return { key: S.key, m };
  }
  function forecastAt(key, m) {
    const fc = cfg.forecasts[key]; if (!fc) return null;
    let a = fc[0], b = fc[0];
    for (const e of fc) { if (e.t <= m) a = e; if (e.t > m) { b = e; break; } b = e; }
    const tr = cfg.transitionMinutes;
    const k = b === a ? 0 : THREE.MathUtils.clamp((m - (b.t - tr)) / tr, 0, 1);    // blend into the next entry over the last few minutes
    const A = cfg.presets[a.preset], B = cfg.presets[b.preset];
    const out = {}; KEYS.forEach(n => { out[n] = n === 'windFrom' ? angLerp(A[n], B[n], k) : A[n] + (B[n] - A[n]) * k; });
    out.preset = k > 0.5 ? b.preset : a.preset;
    return out;
  }

  // ---------------------------------------------------------------- tyres and grip
  let corners = null, cornerT = 0;
  const onTyre = () => { corners = tyreStates?.get().corners || null; };
  addEventListener('tyrestatechange', onTyre); onTyre();
  function gripFor(compound, wear = 'laps') {
    const G = cfg.grip, kind = G.slickCompound[compound] ? 'slick' : compound;
    return lerpCurve(G[kind] || G.slick, W.water) * (G.slickCompound[compound] || 1) * (G.wear[wear] ?? 1);
  }
  function updateGrip() {
    if (!corners) { st.grip = gripFor('medium'); }
    else { const ks = Object.keys(corners); st.grip = ks.reduce((a, k) => a + gripFor(corners[k].compound, corners[k].wear), 0) / ks.length; }
    state.tyreGrip = +st.grip.toFixed(3);
    const cand = [['slick', gripFor('medium')], ['inter', gripFor('inter')], ['wet', gripFor('wet')]].sort((a, b) => b[1] - a[1]);
    st.best = cand[0][0];
    // tyre looks / spray / wet sheen from cad/tyre_states.js
    const wetLook = W.water > cfg.track.wetLookAbove;
    if (wetLook !== st.wetLook && tyreStates) { st.wetLook = wetLook; tyreStates.setWeather(wetLook ? 'wet' : 'dry'); }
  }

  // ---------------------------------------------------------------- wind on the car (after the Drive mode physics step)
  function windOnCar(dt) {
    const tm = trackMode; if (!tm?.mode?.driving) return;
    const car = tm.car, v = car.v;
    const fx_ = Math.cos(car.h), fz = Math.sin(car.h);
    const wx = W.wind.x * W.gust, wz = W.wind.z * W.gust;
    const tail = wx * fx_ + wz * fz, cross = wx * -fz + wz * fx_;
    const kd = state.aeroMode === 'X_MODE' ? 0.00085 : 0.00118;   // same drag factors as track_mode.js
    const air = v - tail;
    car.v += kd * (v * Math.abs(v) - air * Math.abs(air)) * dt;   // tailwind: less drag, headwind: more
    if (Math.abs(v) > 3) {
      const drift = cross * Math.abs(cross) * cfg.wind.crossDriftPerMs2 * dt;
      car.x += -fz * drift; car.z += fx_ * drift;
    }
  }

  // ---------------------------------------------------------------- main update
  let lastSessMin = null;
  function update(dt) {
    st.t += dt;
    // where the weather is heading
    const sm = sessionMinute();
    let simMinutes = dt / 60 * cfg.track.manualTimeScale;
    if (st.source === 'forecast' && sm) {
      const f = forecastAt(sm.key, sm.m); if (f) { Object.assign(target, f); st.preset = f.preset; }
      simMinutes = lastSessMin != null && sm.m >= lastSessMin ? sm.m - lastSessMin : 0;
      lastSessMin = sm.m;
    } else lastSessMin = null;
    const k = 1 - Math.exp(-dt * 1.5);
    KEYS.forEach(n => { W[n] = n === 'windFrom' ? angLerp(W[n], target[n], k) : W[n] + (target[n] - W[n]) * k; });
    // wind vector (m/s, blowing towards), north = -z, east = +x; gusts from two slow sines
    const to = THREE.MathUtils.degToRad(W.windFrom + 180), ms = W.windKmh / 3.6;
    W.wind.set(Math.sin(to) * ms, 0, -Math.cos(to) * ms);
    W.gust = 1 + cfg.wind.gustPct / 100 * (0.6 * Math.sin(st.t * 0.7) + 0.4 * Math.sin(st.t * 1.9 + 1.3));
    // track water
    const T = cfg.track, prev = W.water;
    W.water = THREE.MathUtils.clamp(W.water + simMinutes * (W.rain * T.wetPerMinuteAtFullRain - (W.rain < 0.03 ? T.dryPerMinute * (1.2 - 0.5 * W.cloud) * (1 + W.windKmh / 40) : 0)), 0, 1);
    const drying = W.water < prev || W.rain < 0.05;
    const dl = drying && W.water > 0.04 ? THREE.MathUtils.clamp((0.85 - W.water) / 0.45, 0, 1) * 0.9 : 0;
    st.dryLine += (dl - st.dryLine) * k;
    applyLight();
    manageFx(dt);
    fx.clouds?.update(dt, W, camera, lit, dark);
    fx.rain?.update(dt, W);
    fx.flags?.update(dt, W);
    fx.trees?.update(dt, W, Q().treeSway);
    fx.wet?.update(W, st.dryLine);
    const tm = trackMode;
    fx.lens?.update(dt, W.rain, Math.abs(tm?.car?.v || 0), tm?.mode?.circuit && tm.mode.cam === 'chase');
    if ((cornerT += dt) > 0.25) { cornerT = 0; updateGrip(); renderPanel(); } else state.tyreGrip = +st.grip.toFixed(3);
    windOnCar(dt);
  }

  // ---------------------------------------------------------------- UI panel
  const btn = document.createElement('button');
  btn.type = 'button'; btn.className = 'view-btn'; btn.id = 'btn-weather'; btn.textContent = '☁ Weather'; btn.title = 'Weather: clouds, rain, wind and track water';
  document.querySelector('.view-toolbar')?.prepend(btn);
  const el = document.createElement('div'); el.id = 'wx-panel';
  const sl = (id, label, min, max, stp) => `<label class="wx-sl"><span>${label}</span><input type="range" id="${id}" min="${min}" max="${max}" step="${stp}"><b id="${id}-v"></b></label>`;
  el.innerHTML = `
    <div class="wx-head"><b>WEATHER</b><button type="button" id="wx-x">✕</button></div>
    <div class="wx-row"><select id="wx-src"><option value="manual">Set by hand</option><option value="forecast">Session forecast</option></select>
      <select id="wx-preset">${Object.entries(cfg.presets).map(([k, p]) => `<option value="${k}">${p.label}</option>`).join('')}</select>
      <select id="wx-q" title="Quality">${Object.keys(cfg.quality).map(k => `<option value="${k}">${k} quality</option>`).join('')}</select></div>
    ${sl('wx-cloud', 'Cloud', 0, 1, 0.01)}${sl('wx-rain', 'Rain', 0, 1, 0.01)}${sl('wx-fog', 'Mist', 0, 1, 0.01)}
    ${sl('wx-wind', 'Wind km/h', 0, 60, 1)}${sl('wx-dir', 'Wind from °', 0, 359, 1)}${sl('wx-water', 'Track water', 0, 1, 0.01)}
    <div class="wx-read" id="wx-read"></div><div class="wx-fc" id="wx-fc"></div>`;
  document.body.appendChild(el);
  const css = document.createElement('style');
  css.textContent = `
    #wx-panel{position:fixed;left:50%;top:56px;transform:translateX(-50%);z-index:31;width:340px;background:rgba(8,12,20,.9);border:1px solid rgba(255,255,255,.14);border-radius:8px;padding:8px 10px;color:#e6edf5;font:11px/1.35 system-ui,sans-serif;display:none;box-shadow:0 6px 24px rgba(0,0,0,.5)}
    #wx-panel.open{display:block}
    #wx-panel .wx-head{display:flex;justify-content:space-between;align-items:center}#wx-panel .wx-head b{letter-spacing:.1em}
    #wx-panel button{background:none;border:0;color:#8b9bb0;cursor:pointer}
    #wx-panel select{background:#141b26;color:#cfd8e3;border:1px solid #2a3545;border-radius:4px;font-size:11px;padding:2px}
    #wx-panel .wx-row{display:flex;gap:4px;margin:6px 0;flex-wrap:wrap}
    #wx-panel .wx-sl{display:grid;grid-template-columns:78px 1fr 46px;align-items:center;gap:6px;margin:2px 0}
    #wx-panel .wx-sl b{font-weight:500;text-align:right;font-family:ui-monospace,monospace;color:#9fb0c4}
    #wx-panel .wx-read{margin-top:6px;color:#9fb0c4}#wx-panel .wx-fc{margin-top:4px;color:#f0b44c}`;
  document.head.appendChild(css);
  const $ = id => document.getElementById(id);
  btn.onclick = () => el.classList.toggle('open');
  $('wx-x').onclick = () => el.classList.remove('open');
  const map = { 'wx-cloud': 'cloud', 'wx-rain': 'rain', 'wx-fog': 'fog', 'wx-wind': 'windKmh', 'wx-dir': 'windFrom' };
  Object.entries(map).forEach(([id, key]) => $(id).addEventListener('input', e => { st.source = 'manual'; target[key] = +e.target.value; }));
  $('wx-water').addEventListener('input', e => { W.water = +e.target.value; });
  $('wx-preset').onchange = e => api.setPreset(e.target.value);
  $('wx-src').onchange = e => { st.source = e.target.value; };
  $('wx-q').onchange = e => api.setQuality(e.target.value);
  function rainLabel(r) { return cfg.rainLevels.find(l => r <= l.upTo).label; }
  function renderPanel() {
    if (!el.classList.contains('open')) return;
    const vals = { 'wx-cloud': W.cloud, 'wx-rain': W.rain, 'wx-fog': W.fog, 'wx-wind': W.windKmh, 'wx-dir': (W.windFrom + 360) % 360, 'wx-water': W.water };
    Object.entries(vals).forEach(([id, v]) => { const i = $(id); if (document.activeElement !== i) i.value = v; $(id + '-v').textContent = id === 'wx-rain' ? rainLabel(v) : id === 'wx-wind' || id === 'wx-dir' ? Math.round(v) : Math.round(v * 100) + '%'; });
    $('wx-src').value = st.source; $('wx-preset').value = st.preset; $('wx-q').value = quality;
    $('wx-read').textContent = `Tyre grip ×${st.grip.toFixed(2)} · best tyre now: ${st.best} · ${st.dryLine > 0.1 ? 'dry line forming' : W.water > 0.1 ? 'track wet' : 'track dry'}`;
    const sm = sessionMinute(), fc = sm && cfg.forecasts[sm.key];
    $('wx-fc').textContent = fc ? `Forecast ${sm.key}: ` + fc.map(e => `${e.t}′ ${cfg.presets[e.preset].label}`).join(' → ') + (st.source === 'forecast' ? '' : ' (not followed)') : 'Start a Practice or Qualifying session to use its forecast.';
  }

  // ---------------------------------------------------------------- API + loop
  const api = {
    config: cfg, W, target, status: st, fx,
    setPreset(name, instant = false) {
      const p = cfg.presets[name]; if (!p) return;
      st.source = 'manual'; st.preset = name; KEYS.forEach(n => { target[n] = p[n]; if (instant) W[n] = p[n]; });
      W.water = p.water; st.dryLine = 0;
      if (instant) update(0.0001);
    },
    set(o) { st.source = 'manual'; KEYS.forEach(n => { if (n in o) target[n] = o[n]; }); if ('water' in o) W.water = o.water; },
    setSource(s) { st.source = s; },
    setQuality(qn) { if (!cfg.quality[qn] || qn === quality) return; quality = qn; rebuildFx(); },
    update,
  };
  if (initial) api.setPreset(initial, true);
  let last = performance.now();
  (function loop(now) { requestAnimationFrame(loop); const dt = Math.min(0.1, (now - last) / 1000); last = now; update(dt); })(last);
  window.weather = api;
  console.info('[weather]', JSON.stringify({ presets: Object.keys(cfg.presets), quality }));
  return api;
}
