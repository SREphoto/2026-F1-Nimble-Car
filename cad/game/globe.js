/**
 * globe.js — 3D globe screen with every 2026 calendar circuit at its real latitude / longitude,
 * a line linking the rounds in calendar order, and the Red Bull Ring highlighted.
 * Data: cad/track/circuits/calendar_2026.json + one JSON per circuit; land shapes from world_land_110m.json.
 * Its own renderer and canvas, so the car scene is untouched.
 * SREdesigns - Samuel R Erwin III
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const url = p => new URL(p, import.meta.url).href;
const HOME = 'red_bull_ring';

/** lat/lon (degrees) -> point on a sphere, matching THREE.SphereGeometry's equirectangular UVs */
export function latLonToVec3(lat, lon, r = 1) {
  const th = THREE.MathUtils.degToRad(90 - lat), ph = THREE.MathUtils.degToRad(lon + 180);
  return new THREE.Vector3(-Math.cos(ph) * Math.sin(th) * r, Math.cos(th) * r, Math.sin(ph) * Math.sin(th) * r);
}

function fmtWeekend(w) {
  const [a, b] = w.split('/').map(s => new Date(s + 'T12:00:00Z'));
  const m = d => d.toLocaleString('en-GB', { month: 'short', timeZone: 'UTC' });
  return `${a.getUTCDate()}${m(a) !== m(b) ? ' ' + m(a) : ''}–${b.getUTCDate()} ${m(b)} ${b.getUTCFullYear()}`;
}
function country(loc) { const c = loc.split(',').pop().trim(); return { 'U.S.': 'United States', UAE: 'United Arab Emirates' }[c] || c; }

function earthTexture(land) {
  const W = 2048, H = 1024, cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const g = cv.getContext('2d');
  const grd = g.createLinearGradient(0, 0, 0, H); grd.addColorStop(0, '#0b1d33'); grd.addColorStop(0.5, '#0f2a48'); grd.addColorStop(1, '#0b1d33');
  g.fillStyle = grd; g.fillRect(0, 0, W, H);
  g.strokeStyle = 'rgba(120,170,220,.12)'; g.lineWidth = 1;
  for (let lon = -180; lon <= 180; lon += 30) { const x = (lon + 180) / 360 * W; g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); }
  for (let lat = -60; lat <= 60; lat += 30) { const y = (90 - lat) / 180 * H; g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
  g.fillStyle = '#2b4a3a'; g.strokeStyle = '#5f8f74'; g.lineWidth = 1.5;
  for (const p of land.polygons) {
    g.beginPath();
    for (let i = 0; i < p.length; i += 2) { const x = (p[i] + 180) / 360 * W, y = (90 - p[i + 1]) / 180 * H; i ? g.lineTo(x, y) : g.moveTo(x, y); }
    g.closePath(); g.fill(); g.stroke();
  }
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}

export async function initGlobe({ onLoadTrack, playable = [HOME] } = {}) {
  let built = null;
  const root = document.createElement('div');
  root.id = 'globe-screen';
  root.innerHTML = `
    <div class="gl-top"><b>2026 CALENDAR</b><span id="gl-sub">loading…</span><button type="button" id="gl-close" class="gl-btn">Close ✕</button></div>
    <div id="gl-list"></div>
    <div id="gl-tip"></div>
    <div id="gl-card"></div>`;
  document.body.appendChild(root);
  const css = document.createElement('style');
  css.textContent = `
    #globe-screen{position:fixed;inset:0;z-index:50;background:radial-gradient(circle at 50% 45%,#0d1a2c,#03060c 70%);display:none;color:#e6edf5;font:12px/1.35 system-ui,sans-serif}
    #globe-screen.open{display:block}
    #globe-screen canvas{position:absolute;inset:0;display:block}
    #globe-screen .gl-top{position:absolute;left:16px;right:16px;top:12px;display:flex;gap:12px;align-items:center;z-index:2}
    #globe-screen .gl-top b{font-size:16px;letter-spacing:.12em}#gl-sub{color:#8b9bb0}
    #globe-screen .gl-btn{background:#141b26;color:#cfd8e3;border:1px solid #2a3545;border-radius:5px;padding:4px 10px;cursor:pointer}
    #gl-close{margin-left:auto}
    #gl-list{position:absolute;left:16px;top:50px;bottom:16px;width:250px;overflow:auto;z-index:2}
    #gl-list div{padding:3px 6px;border-radius:4px;cursor:pointer;display:flex;gap:6px}
    #gl-list div:hover,#gl-list div.sel{background:rgba(0,212,232,.15)}
    #gl-list div.home{color:#ffcc33;font-weight:600}
    #gl-list i{font-style:normal;color:#7d8ea3;width:20px;text-align:right}
    #gl-tip{position:absolute;pointer-events:none;background:rgba(8,12,20,.92);border:1px solid #2a3545;border-radius:5px;padding:5px 8px;display:none;z-index:3;white-space:nowrap}
    #gl-card{position:absolute;right:16px;bottom:16px;width:280px;background:rgba(8,12,20,.9);border:1px solid #2a3545;border-radius:8px;padding:10px 12px;display:none;z-index:2}
    #gl-card h3{margin:0 0 4px;font-size:14px}#gl-card .soon{color:#f0b44c;margin-top:6px}
    #gl-card .gl-btn{margin-top:8px;background:#00d4e8;color:#04121a;border-color:#00d4e8;font-weight:600}`;
  document.head.appendChild(css);
  const $ = id => document.getElementById(id);

  async function build() {
    const [cal, land] = await Promise.all([fetch(url('../track/circuits/calendar_2026.json')).then(r => r.json()), fetch(url('./world_land_110m.json')).then(r => r.json())]);
    const rounds = await Promise.all(cal.rounds.map(async r => {
      const c = await fetch(url(`../track/circuits/${r.circuit_id}.json`)).then(x => x.json());
      return { ...r, name: c.circuit.common_name, lat: c.circuit.lat, lon: c.circuit.lon, country: country(c.circuit.location), date: fmtWeekend(r.weekend), playable: playable.includes(r.circuit_id) };
    }));
    rounds.sort((a, b) => a.round - b.round);
    $('gl-sub').textContent = `${rounds.length} rounds · drag to rotate · hover or click a marker`;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(2, devicePixelRatio));
    root.prepend(renderer.domElement);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, 1, 0.01, 100);
    const home = rounds.find(r => r.circuit_id === HOME) || rounds[0];
    camera.position.copy(latLonToVec3(home.lat - 10, home.lon + 25, 3.4));
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true; controls.enablePan = false; controls.minDistance = 1.6; controls.maxDistance = 6;
    controls.autoRotate = true; controls.autoRotateSpeed = 0.6;
    scene.add(new THREE.AmbientLight(0xffffff, 1.6));
    const sun = new THREE.DirectionalLight(0xffffff, 1.4); sun.position.set(3, 2, 4); scene.add(sun);
    const globe = new THREE.Mesh(new THREE.SphereGeometry(1, 96, 64), new THREE.MeshStandardMaterial({ map: earthTexture(land), roughness: 0.9 }));
    scene.add(globe);
    scene.add(new THREE.Mesh(new THREE.SphereGeometry(1.025, 64, 48), new THREE.MeshBasicMaterial({ color: 0x3aa0ff, transparent: true, opacity: 0.08, side: THREE.BackSide })));

    // calendar line: raised great-circle arcs, round 1 -> 2 -> …
    const pts = [];
    for (let i = 0; i < rounds.length - 1; i++) {
      const a = latLonToVec3(rounds[i].lat, rounds[i].lon), b = latLonToVec3(rounds[i + 1].lat, rounds[i + 1].lon);
      const ang = a.angleTo(b);
      for (let k = 0; k <= 32; k++) {
        const t = k / 32;
        const p = new THREE.Vector3().copy(a).multiplyScalar(Math.sin((1 - t) * ang)).addScaledVector(b, Math.sin(t * ang)).divideScalar(Math.sin(ang) || 1);
        if (!isFinite(p.x) || ang < 1e-4) p.copy(a).lerp(b, t);
        pts.push(p.normalize().multiplyScalar(1.004 + Math.sin(Math.PI * t) * 0.12 * Math.min(1, ang)));
      }
    }
    const lineGeo = new THREE.BufferGeometry().setFromPoints(pts);
    const colors = []; pts.forEach((_, i) => { const c = new THREE.Color().setHSL(0.52 - 0.5 * i / pts.length, 0.9, 0.6); colors.push(c.r, c.g, c.b); });
    lineGeo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    scene.add(new THREE.Line(lineGeo, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.85 })));

    // markers
    const markers = [];
    let built_ring = null;
    rounds.forEach(r => {
      const isHome = r.circuit_id === HOME;
      const m = new THREE.Mesh(new THREE.SphereGeometry(isHome ? 0.026 : 0.015, 16, 12), new THREE.MeshBasicMaterial({ color: isHome ? 0xffcc33 : 0xff3b3b }));
      m.position.copy(latLonToVec3(r.lat, r.lon, 1.006)); m.userData.round = r; globe.add(m); markers.push(m);
      if (isHome) {
        const ring = new THREE.Mesh(new THREE.RingGeometry(0.035, 0.045, 40), new THREE.MeshBasicMaterial({ color: 0xffcc33, side: THREE.DoubleSide, transparent: true }));
        ring.position.copy(latLonToVec3(r.lat, r.lon, 1.008)); ring.lookAt(ring.position.clone().multiplyScalar(2)); globe.add(ring); built_ring = ring;
      }
    });

    $('gl-list').innerHTML = rounds.map(r => `<div data-id="${r.circuit_id}" class="${r.circuit_id === HOME ? 'home' : ''}"><i>${r.round}</i><span>${r.grand_prix}<br><small style="color:#7d8ea3">${r.date}</small></span></div>`).join('');
    $('gl-list').querySelectorAll('div').forEach(d => d.onclick = () => select(rounds.find(r => r.circuit_id === d.dataset.id), true));

    function showCard(r) {
      $('gl-card').style.display = 'block';
      $('gl-card').innerHTML = `<h3>Round ${r.round} · ${r.grand_prix}</h3><div>${r.name}</div><div>${r.country} · ${r.date}${r.sprint ? ' · Sprint weekend' : ''}</div>`
        + (r.playable ? `<button type="button" class="gl-btn" id="gl-load">Load ${r.name}</button>` : `<div class="soon">Coming soon: no 3D track yet</div>`);
      $('gl-load')?.addEventListener('click', () => load(r));
    }
    function load(r) { close(); onLoadTrack?.(r.circuit_id); }
    function select(r, fly) {
      $('gl-list').querySelectorAll('div').forEach(d => d.classList.toggle('sel', d.dataset.id === r.circuit_id));
      showCard(r);
      if (fly) { controls.autoRotate = false; camera.position.copy(latLonToVec3(r.lat, r.lon, camera.position.length())); }
    }

    const ray = new THREE.Raycaster(), mouse = new THREE.Vector2();
    const pick = e => {
      const b = renderer.domElement.getBoundingClientRect();
      mouse.set(((e.clientX - b.left) / b.width) * 2 - 1, -((e.clientY - b.top) / b.height) * 2 + 1);
      ray.setFromCamera(mouse, camera);
      const hits = ray.intersectObjects([globe, ...markers], false);
      const h = hits.find(x => x.object.userData.round);
      return h && (!hits[0] || hits[0].object === h.object || hits[0].distance > h.distance - 0.02) ? h.object.userData.round : null;
    };
    // bigger hover targets: test against screen distance too
    const pickNear = e => {
      const direct = pick(e); if (direct) return direct;
      const b = renderer.domElement.getBoundingClientRect(); let best = null, bd = 12;
      const camDir = camera.position.clone().normalize();
      markers.forEach(m => {
        const wp = m.getWorldPosition(new THREE.Vector3()); if (wp.clone().normalize().dot(camDir) < 0.15) return;
        const p = wp.project(camera); const x = (p.x + 1) / 2 * b.width + b.left, y = (1 - p.y) / 2 * b.height + b.top;
        const d = Math.hypot(x - e.clientX, y - e.clientY); if (d < bd) { bd = d; best = m.userData.round; }
      });
      return best;
    };
    renderer.domElement.addEventListener('pointermove', e => {
      const r = pickNear(e), tip = $('gl-tip');
      renderer.domElement.style.cursor = r ? 'pointer' : 'grab';
      if (!r) { tip.style.display = 'none'; return; }
      tip.style.display = 'block'; tip.style.left = e.clientX + 14 + 'px'; tip.style.top = e.clientY + 10 + 'px';
      tip.innerHTML = `<b>R${r.round} · ${r.name}</b><br>${r.country} · ${r.date}${r.playable ? '<br><span style="color:#00d4e8">Click to load this track</span>' : '<br><span style="color:#f0b44c">Coming soon</span>'}`;
    });
    let down = null;
    renderer.domElement.addEventListener('pointerdown', e => { down = [e.clientX, e.clientY]; });
    renderer.domElement.addEventListener('pointerup', e => {
      if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 5) return;
      const r = pickNear(e); if (!r) return;
      if (r.playable) load(r); else select(r, false);
    });

    function resize() { const w = innerWidth, h = innerHeight; renderer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix(); }
    addEventListener('resize', resize); resize();
    const clock = new THREE.Clock();
    renderer.setAnimationLoop(() => {
      if (!root.classList.contains('open')) return;
      const t = clock.getElapsedTime();
      if (built_ring) { const s = 1 + 0.35 * Math.sin(t * 3); built_ring.scale.setScalar(s); built_ring.material.opacity = 1 - 0.5 * (s - 0.65); }
      controls.update(); renderer.render(scene, camera);
    });
    return { rounds, renderer, controls, select };
  }

  // the car scene keeps running underneath but skips drawing while the globe covers it (saves GPU time)
  const mainR = window.renderer;
  if (mainR && !mainR.__globePatched) {
    const draw = mainR.render.bind(mainR);
    mainR.render = (sc, cam) => { if (!root.classList.contains('open')) draw(sc, cam); };
    mainR.__globePatched = true;
  }
  async function open() { root.classList.add('open'); if (!built) built = build(); return built; }
  function close() { root.classList.remove('open'); $('gl-tip').style.display = 'none'; }
  $('gl-close').onclick = close;
  addEventListener('keydown', e => { if (e.key === 'Escape') close(); });

  // button in the main view toolbar
  const btn = document.createElement('button');
  btn.type = 'button'; btn.className = 'view-btn'; btn.id = 'btn-globe'; btn.textContent = '🌍 Calendar globe'; btn.title = 'Open the 2026 calendar globe';
  btn.onclick = open;
  document.querySelector('.view-toolbar')?.prepend(btn);

  const api = { open, close, get ready() { return built; } };
  window.globe = api;
  return api;
}
