/**
 * Garage inspect mode: one Garage button moves you into our team garage. Orbit (drag) and walk (W A S D or arrows),
 * click a part of the car to highlight it with a floating info card, turn the wheels and the bodywork on or off,
 * open the regulations from the desk monitor, the printed sheet or the Regulations button, and Exit Garage to drive.
 * Hooks: enterGarageInspect() / exitGarageInspect() (also on window). Reads part data from garage_data.js.
 * It never edits the car or driver model files: it only toggles visibility, swaps materials while a part is selected,
 * and moves the whole car group up onto the stands.
 */
import * as THREE from 'three';
import { GARAGE_LAYOUT, GARAGE_PARTS, PART_ORDER, REGULATIONS } from './garage_data.js';

const CSS = `
#garage-bar{position:absolute;left:50%;bottom:14px;transform:translateX(-50%);display:none;gap:6px;align-items:center;background:rgba(10,14,20,.86);border:1px solid #2a3545;border-radius:8px;padding:6px 8px;z-index:30;font:12px system-ui,sans-serif;color:#cfd8e3}
#garage-bar.on{display:flex}
#garage-bar button{background:#141b26;color:#cfd8e3;border:1px solid #2a3545;border-radius:5px;padding:4px 9px;font-size:12px;cursor:pointer}
#garage-bar button.active{background:#00d4e8;color:#04121a;border-color:#00d4e8}
#garage-bar button.exit{background:#c8161d;border-color:#c8161d;color:#fff}
#garage-bar .hint{opacity:.7;margin-left:4px}
#garage-card{position:absolute;display:none;max-width:260px;background:rgba(8,12,18,.94);border:1px solid #00d4e8;border-radius:8px;padding:10px 12px;color:#e6edf5;font:12px/1.4 system-ui,sans-serif;z-index:31;pointer-events:auto;box-shadow:0 6px 24px rgba(0,0,0,.5)}
#garage-card h3{margin:0 0 4px;font-size:14px;color:#7fe7ff}
#garage-card ul{margin:6px 0 0;padding-left:16px}
#garage-card .x{position:absolute;right:6px;top:4px;background:none;border:0;color:#9fb0c3;cursor:pointer;font-size:14px}
#regs-overlay{position:fixed;inset:0;display:none;align-items:center;justify-content:center;background:rgba(0,0,0,.55);z-index:1000}
#regs-overlay.on{display:flex}
#regs-overlay .sheet{background:#f7f7f2;color:#15181d;border-radius:6px;min-width:420px;max-width:92vw;padding:22px 26px;font:15px/1.5 system-ui,sans-serif;box-shadow:0 10px 40px rgba(0,0,0,.6);position:relative}
#regs-overlay h2{margin:0 0 4px;font-size:22px}
#regs-overlay p{margin:0 0 12px;color:#4a5260}
#regs-overlay table{border-collapse:collapse;width:100%}
#regs-overlay td{padding:6px 8px;border-bottom:1px solid #ddd}
#regs-overlay td:last-child{text-align:right;color:#2a3442;font-weight:600}
#regs-overlay .x{position:absolute;right:10px;top:8px;background:none;border:0;font-size:18px;cursor:pointer;color:#555}
`;

export function initGarageInspect({ scene, camera, controls, renderer, carModel, trackMode, legacyEnv, getTeamId = () => 'red-bull' }) {
  // the garage is only built when you go in (the builder module is loaded on first use) and is disposed when you leave
  let garage = null, builder = null;
  const L = GARAGE_LAYOUT;
  const st = { active: false, wasCircuit: false, saved: null, wheels: true, body: true, sel: null, selCentre: new THREE.Vector3(), keys: new Set(), tween: null };

  // ---------------------------------------------------------------- UI
  const style = document.createElement('style'); style.textContent = CSS; document.head.appendChild(style);
  const host = renderer.domElement.parentElement || document.body;
  if (getComputedStyle(host).position === 'static') host.style.position = 'relative';
  const bar = document.createElement('div'); bar.id = 'garage-bar';
  bar.innerHTML = `<button type="button" id="garage-wheels" class="active" title="Take the wheels off and put the car on stands">Wheels on</button>
    <button type="button" id="garage-body" class="active" title="Show or hide the wings, sidepods and engine cover">Bodywork on</button>
    <button type="button" id="garage-regs" title="Open the regulations sheet">Regulations</button>
    <button type="button" id="garage-exit" class="exit" title="Leave the garage and go back to driving">Exit Garage</button>
    <span class="hint">Drag to look around · W A S D or arrows to walk · click a part</span>`;
  host.appendChild(bar);
  const card = document.createElement('div'); card.id = 'garage-card'; host.appendChild(card);
  const ov = document.createElement('div'); ov.id = 'regs-overlay';
  ov.innerHTML = `<div class="sheet" role="dialog" aria-modal="true" aria-label="${REGULATIONS.title}"><button type="button" class="x" aria-label="Close">✕</button>
    <h2>${REGULATIONS.title}</h2><p>Technical check sheet from the engineers' desk</p>
    <table>${REGULATIONS.rows.map(([k, v]) => `<tr><td>${k}</td><td>${v}</td></tr>`).join('')}</table></div>`;
  document.body.appendChild(ov);
  const openRegs = (on = true) => ov.classList.toggle('on', on);
  ov.addEventListener('click', (e) => { if (e.target === ov || e.target.classList.contains('x')) openRegs(false); });
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape' && ov.classList.contains('on')) openRegs(false); });
  const $ = (id) => document.getElementById(id);
  $('garage-wheels').addEventListener('click', () => setWheels(!st.wheels));
  $('garage-body').addEventListener('click', () => setBody(!st.body));
  $('garage-regs').addEventListener('click', () => zoomToDesk());
  $('garage-exit').addEventListener('click', () => exitGarageInspect());
  $('btn-garage')?.addEventListener('click', () => (st.active ? exitGarageInspect() : enterGarageInspect()));
  $('btn-regulations')?.addEventListener('click', () => openRegs(true));
  window.addEventListener('f1:team-changed', (e) => garage?.userData.setTeam(e.detail?.teamId));

  // ---------------------------------------------------------------- car helpers (visibility and position only)
  const subs = () => carModel.children.slice(0, PART_ORDER.length);
  const wheelGroups = () => { const out = []; carModel.traverse(o => { if (o.name && o.name.startsWith('Wheel_Visual_')) out.push(o); }); return out; };
  function setWheels(on) {
    st.wheels = on; wheelGroups().forEach(w => (w.visible = on));
    if (garage) garage.userData.stands.visible = !on;
    carModel.position.y = on ? 0 : L.stands.raise;
    $('garage-wheels').classList.toggle('active', on); $('garage-wheels').textContent = on ? 'Wheels on' : 'Wheels off';
  }
  function setBody(on) {
    st.body = on; const b = subs()[PART_ORDER.indexOf('bodywork')]; if (b) b.visible = on;
    $('garage-body').classList.toggle('active', on); $('garage-body').textContent = on ? 'Bodywork on' : 'Bodywork off';
  }

  // ---------------------------------------------------------------- selection
  const swapped = new Map();
  function clearSel() {
    for (const [mesh, mat] of swapped) mesh.material = mat;
    swapped.clear(); st.sel = null; card.style.display = 'none';
  }
  const glow = (m) => { const c = m.clone(); if (c.emissive) { c.emissive = new THREE.Color(0x00b8d4); c.emissiveIntensity = 0.55; } else if (c.color) c.color = new THREE.Color(0x00d4e8); return c; };
  function select(key, obj) {
    clearSel();
    const info = GARAGE_PARTS[key]; if (!info) return;
    const groups = key === 'wheels' ? wheelGroups() : [obj];
    groups.forEach(gr => gr.traverse(o => { if (o.isMesh && !swapped.has(o)) { swapped.set(o, o.material); o.material = Array.isArray(o.material) ? o.material.map(glow) : glow(o.material); } }));
    const box = new THREE.Box3(); groups.forEach(gr => box.expandByObject(gr));
    box.getCenter(st.selCentre); st.sel = key;
    card.innerHTML = `<button type="button" class="x" aria-label="Close">✕</button><h3>${info.name}</h3><div>${info.text}</div><ul>${info.facts.map(f => `<li>${f}</li>`).join('')}</ul>`;
    card.querySelector('.x').addEventListener('click', clearSel);
    card.style.display = 'block';
  }
  function partOf(o) {
    for (let p = o; p && p !== carModel; p = p.parent) if (p.name && p.name.startsWith('Wheel_Visual_')) return ['wheels', p];
    let p = o; while (p && p.parent !== carModel) p = p.parent;
    const i = p ? carModel.children.indexOf(p) : -1;
    return i >= 0 && i < PART_ORDER.length ? [PART_ORDER[i], p] : [null, null];
  }

  // ---------------------------------------------------------------- picking (click without dragging)
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(); let down = null;
  renderer.domElement.addEventListener('pointerdown', (e) => { if (st.active) down = [e.clientX, e.clientY]; });
  renderer.domElement.addEventListener('pointerup', (e) => {
    if (!st.active || !down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 5) { down = null; return; }
    down = null;
    const r = renderer.domElement.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hits = ray.intersectObjects([...garage.userData.clickables, carModel], true).filter(h => h.object.visible && isShown(h.object));
    if (!hits.length) { clearSel(); return; }
    const o = hits[0].object;
    if (o.userData.click === 'regulations') { zoomToDesk(); return; }
    const [key, grp] = partOf(o);
    if (key) select(key, grp); else clearSel();
  });
  const isShown = (o) => { for (let p = o; p; p = p.parent) if (!p.visible) return false; return true; };

  // ---------------------------------------------------------------- camera: walk keys and the desk zoom
  const WALK = new Set(['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright']);
  window.addEventListener('keydown', (e) => {
    if (!st.active || /input|textarea|select/i.test(e.target?.tagName || '')) return;
    const k = e.key.toLowerCase(); if (!WALK.has(k)) return;
    st.keys.add(k); e.preventDefault(); e.stopImmediatePropagation();
  }, true);
  window.addEventListener('keyup', (e) => { const k = e.key.toLowerCase(); if (st.keys.delete(k) && st.active) e.stopImmediatePropagation(); }, true);
  function zoomToDesk() {
    const v = garage.userData.deskView;
    st.tween = { start: performance.now(), t: 0, p0: camera.position.clone(), t0: controls.target.clone(), p1: new THREE.Vector3(...v.pos), t1: new THREE.Vector3(...v.target), done: () => openRegs(true) };
  }

  // ---------------------------------------------------------------- enter / exit
  let entering = null;
  async function enterGarageInspect() {
    if (st.active) return;
    if (entering) return entering;
    $('btn-garage')?.classList.add('active');
    entering = (async () => {
      builder = builder || await import('./garage_builder.js');
      garage = builder.buildGarage(GARAGE_LAYOUT, getTeamId());
      scene.add(garage);
    })();
    try { await entering; } finally { entering = null; }
    st.active = true;
    st.wasCircuit = !!trackMode?.mode?.circuit;
    st.saved = { pos: camera.position.clone(), target: controls.target.clone(), near: camera.near, far: camera.far, fog: scene.fog, legacy: legacyEnv?.visible };
    trackMode?.applyCircuit?.(false);          // stops driving and parks the car level at the origin
    if (legacyEnv) legacyEnv.visible = false;
    scene.fog = null;
    camera.near = 0.2; camera.far = 1500; camera.updateProjectionMatrix();
    camera.position.set(-56, 19, 15); controls.target.set(16, 4, 0); controls.enabled = true; controls.update();
    document.body.classList.add('garage-mode');
    const hud = document.getElementById('rbr-hud'); if (hud) hud.style.display = 'none';
    bar.classList.add('on'); $('btn-garage')?.classList.add('active');
  }
  function exitGarageInspect() {
    if (!st.active) return;
    clearSel(); setWheels(true); setBody(true); openRegs(false);
    st.active = false; st.tween = null; st.keys.clear();
    garage.userData.dispose(); garage = null;
    scene.fog = st.saved.fog;
    if (legacyEnv) legacyEnv.visible = st.saved.legacy ?? true;
    camera.near = st.saved.near; camera.far = st.saved.far; camera.updateProjectionMatrix();
    document.body.classList.remove('garage-mode');
    const hud = document.getElementById('rbr-hud'); if (hud) hud.style.display = '';
    bar.classList.remove('on'); $('btn-garage')?.classList.remove('active');
    if (st.wasCircuit && trackMode) { trackMode.applyCircuit(true); trackMode.setDriving?.(true); trackMode.setCam?.('chase'); }
    else { camera.position.copy(st.saved.pos); controls.target.copy(st.saved.target); controls.update(); }
  }

  // ---------------------------------------------------------------- per frame
  const fwd = new THREE.Vector3(), right = new THREE.Vector3(), mv = new THREE.Vector3(), scr = new THREE.Vector3();
  function update(dt) {
    if (!st.active) return;
    dt = Math.min(dt, 0.05);
    if (!st.wheels) carModel.position.y = L.stands.raise;
    if (st.tween) {
      const T = st.tween; T.t = Math.min(1, (performance.now() - T.start) / 800); /* real time, ends on time at any frame rate */ const e = T.t * T.t * (3 - 2 * T.t);
      camera.position.lerpVectors(T.p0, T.p1, e); controls.target.lerpVectors(T.t0, T.t1, e); controls.update();
      if (T.t >= 1) { st.tween = null; T.done?.(); }
    } else if (st.keys.size) {
      camera.getWorldDirection(fwd); fwd.y = 0; fwd.normalize(); right.crossVectors(fwd, camera.up).normalize();
      mv.set(0, 0, 0);
      if (st.keys.has('w') || st.keys.has('arrowup')) mv.add(fwd);
      if (st.keys.has('s') || st.keys.has('arrowdown')) mv.sub(fwd);
      if (st.keys.has('d') || st.keys.has('arrowright')) mv.add(right);
      if (st.keys.has('a') || st.keys.has('arrowleft')) mv.sub(right);
      mv.multiplyScalar(30 * dt);   // 3 m/s walking pace
      const p = camera.position.clone().add(mv);
      p.x = THREE.MathUtils.clamp(p.x, L.x0 - 60, L.x1 - 4); p.z = THREE.MathUtils.clamp(p.z, -L.halfWidth + 3, L.halfWidth - 3);
      mv.subVectors(p, camera.position); camera.position.add(mv); controls.target.add(mv); controls.update();
    }
    if (st.sel) {
      scr.copy(st.selCentre).project(camera);
      const r = renderer.domElement, w = r.clientWidth, h = r.clientHeight;
      if (scr.z < 1) { card.style.display = 'block'; card.style.left = `${Math.min(w - 270, Math.max(4, (scr.x * 0.5 + 0.5) * w + 18))}px`; card.style.top = `${Math.min(h - 140, Math.max(4, (-scr.y * 0.5 + 0.5) * h - 40))}px`; }
      else card.style.display = 'none';
    }
  }

  const api = { get garage() { return garage; }, enterGarageInspect, exitGarageInspect, update, openRegulations: () => openRegs(true), get active() { return st.active; }, select: (key) => { const i = PART_ORDER.indexOf(key); select(key, key === 'wheels' ? null : subs()[i]); }, setWheels, setBody, zoomToDesk };
  window.enterGarageInspect = enterGarageInspect; window.exitGarageInspect = exitGarageInspect; window.garageInspect = api;
  return api;
}
