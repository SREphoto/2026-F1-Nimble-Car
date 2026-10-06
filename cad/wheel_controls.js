/**
 * wheel_controls.js: makes the PCU-8D steering wheel fully interactive in the 3D view.
 * SREdesigns - Samuel R Erwin III
 *
 * Every control in cad/wheel_button_map.json becomes clickable (raycast from the mouse):
 *  - hover: the part glows and the cursor changes, with a tooltip naming the control
 *  - buttons press in and run their action; rotary dials and thumbwheels step one detent per click
 *    (right-click or mouse wheel turns them back); paddles flick back and shift gear / hold the clutch
 *  - the LCD is a touch screen: tap the tabs along the bottom (RACE, TYRES, ERS, SETUP); on SETUP each
 *    row has - / + boxes. The screen redraws from live car state (gear, speed, rpm, battery, aero
 *    mode, lap data on the circuit) and the wheel settings.
 * The map is data, so other wheels / teams only need a different JSON. The state lives in
 * controls.state (settings values + flags) and is shared with app.js as state.wheel.
 *
 * initWheelControls({ wheel, camera, dom, api, map }) -> { state, update(dt), dispose() }
 * api (all optional): getCar() -> app state, setGear(g), toggleAero(), getLap() -> {lap,last,best,elapsed},
 *                     getTyres() -> {FL:{compound,wear},...}, onChange(kind, key, value), enabled() -> bool
 */
import * as THREE from 'three';

const GEARS = ['R', 'N', 1, 2, 3, 4, 5, 6, 7, 8];

export async function loadWheelMap(url = new URL('./wheel_button_map.json', import.meta.url)) {
  const r = await fetch(url); if (!r.ok) throw new Error(`wheel map ${r.status}`);
  return r.json();
}

export function initWheelControls({ wheel, camera, dom, api = {}, map }) {
  if (!wheel || !map) return null;
  const S = { values: {}, flags: { pitLimiter: false, overtake: false, radio: false, drink: false, clutch: false }, page: 0, mfsIndex: 0, popup: null };
  for (const [k, d] of Object.entries(map.settings)) S.values[k] = d.value;

  // ---- collect controls and give each its own materials (hover glow must not touch the car)
  const controls = [], targets = [];
  for (const c of map.controls) {
    const obj = wheel.getObjectByName(c.mesh);
    if (!obj) { console.warn('[wheel] control not found:', c.mesh); continue; }
    const ctl = { ...c, obj, base: { pos: obj.position.clone(), rot: obj.rotation.clone() }, anim: 0, held: false, spin: 0, glowMats: [] };
    obj.traverse((o) => {
      if (!o.isMesh) return;
      if (o.material && 'emissive' in o.material) { o.material = o.material.clone(); ctl.glowMats.push(o.material); o.material.userData.emissive0 = o.material.emissive.clone(); }
      o.userData.wheelControl = ctl; targets.push(o);
    });
    if (c.type === 'thumbwheel') obj.rotation.order = 'ZYX';
    if (c.type === 'rotary') ctl.detent = (S.values[c.setting] - map.settings[c.setting].min);
    controls.push(ctl);
  }
  const screen = wheel.getObjectByName(map.screen?.mesh || 'UI_LCD_PCU8D_Display');
  if (screen) targets.push(screen);

  // ---- LEDs: own materials so they can light up from rpm and flags
  const leds = [];
  for (let i = 0; i < 15; i++) { const m = wheel.getObjectByName(`ShiftLED_${i}`); if (m) { m.material = new THREE.MeshBasicMaterial({ color: 0x111418 }); leds.push(m); } }
  const status = {};
  ['L', 'R'].forEach((s) => { for (let j = 0; j < 3; j++) { const m = wheel.getObjectByName(`StatusLED_${s}_${j}`); if (m) { m.material = new THREE.MeshBasicMaterial({ color: 0x111418 }); status[`${s}${j}`] = m; } } });

  // ---- touch screen canvas
  const W = 1024, H = 640, cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const g = cv.getContext('2d');
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  if (screen) { screen.material = new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }); }
  const TAB_Y = 566, ROW0 = 96, ROW_H = 50;
  const setupKeys = map.mfsItems;

  // ---- actions
  const fmtVal = (k) => { const d = map.settings[k]; const v = S.values[k]; return (d.decimals ? v.toFixed(d.decimals) : String(v)) + (d.unit || ''); };
  const popup = (title, value) => { S.popup = { title, value, t: 1.6 }; };
  function adjust(key, dir) {
    const d = map.settings[key]; if (!d) return;
    S.values[key] = THREE.MathUtils.clamp(+(S.values[key] + dir * d.step).toFixed(3), d.min, d.max);
    popup(d.label, fmtVal(key)); api.onChange?.('setting', key, S.values[key]);
    const dial = controls.find((c) => c.type === 'rotary' && c.setting === key); if (dial) dial.detent = S.values[key] - d.min;
  }
  function shift(dir) {
    const car = api.getCar?.() || {}; const i = GEARS.indexOf(car.gear ?? 'N');
    const next = GEARS[THREE.MathUtils.clamp((i < 0 ? 1 : i) + dir, 0, GEARS.length - 1)];
    api.setGear?.(next); popup('GEAR', String(next));
  }
  const actions = {
    neutral: () => { api.setGear?.('N'); popup('GEAR', 'N'); },
    gearUp: () => shift(1), gearDown: () => shift(-1),
    clutch: (c, down) => { S.flags.clutch = down; },
    aero: () => { api.toggleAero?.(); const car = api.getCar?.() || {}; popup('AERO', car.aeroMode === 'X_MODE' ? 'X-MODE' : 'Z-MODE'); },
    toggle: (c) => { S.flags[c.arg] = !S.flags[c.arg]; popup(c.hint.split(' (')[0].toUpperCase(), S.flags[c.arg] ? 'ON' : 'OFF'); api.onChange?.('flag', c.arg, S.flags[c.arg]); },
    adjust: (c) => adjust(c.arg[0], c.arg[1]),
    mfsJump: (c) => { S.mfsIndex = (S.mfsIndex + c.arg) % setupKeys.length; const k = setupKeys[S.mfsIndex]; popup('MENU ' + map.settings[k].label, fmtVal(k)); },
    mfsStep: (c) => adjust(setupKeys[S.mfsIndex], c.arg),
  };
  function activate(ctl, dir = 1, down = true) {
    if (ctl.type === 'rotary' || ctl.type === 'thumbwheel') {
      if (!down) return;
      adjust(ctl.setting, dir); ctl.spin += dir; ctl.anim = 1; return;
    }
    if (ctl.type === 'paddle') { ctl.held = down; if (ctl.action === 'clutch') actions.clutch(ctl, down); else if (down) actions[ctl.action]?.(ctl); if (down) ctl.anim = 1; return; }
    if (!down) return;
    ctl.anim = 1; actions[ctl.action]?.(ctl);
  }
  function tapScreen(uv) {
    const x = uv.x * W, y = (1 - uv.y) * H;
    if (y >= TAB_Y) { S.page = THREE.MathUtils.clamp(Math.floor(x / (W / map.screen.pages.length)), 0, map.screen.pages.length - 1); return; }
    if (map.screen.pages[S.page] === 'SETUP') {
      const row = Math.floor((y - ROW0) / ROW_H);
      if (row >= 0 && row < setupKeys.length) {
        S.mfsIndex = row;
        if (x > 760 && x < 870) adjust(setupKeys[row], -1); else if (x >= 880 && x < 990) adjust(setupKeys[row], 1);
      }
    }
  }

  // ---- pointer handling (capture phase so a click on the wheel never starts an orbit drag)
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  let hover = null, pressed = null;
  const tip = document.createElement('div');
  Object.assign(tip.style, { position: 'fixed', pointerEvents: 'none', padding: '3px 7px', background: 'rgba(8,12,20,0.85)', color: '#e8eef6', font: '12px system-ui, sans-serif', borderRadius: '4px', zIndex: 99, display: 'none' });
  document.body.appendChild(tip);
  function pick(e) {
    if (api.enabled && !api.enabled()) return null;
    const r = dom.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const vis = targets.filter((o) => { for (let p = o; p; p = p.parent) if (!p.visible) return false; return true; });
    const hit = ray.intersectObjects(vis, false)[0];
    if (!hit) return null;
    return hit;
  }
  function setGlow(ctl, on) { if (ctl) ctl.glowMats.forEach((m) => m.emissive.copy(on ? new THREE.Color(0x3a5a88) : m.userData.emissive0)); }
  function onMove(e) {
    const h = pick(e), ctl = h?.object.userData.wheelControl || null;
    const onScreen = h && h.object === screen;
    if (ctl !== hover) { setGlow(hover, false); setGlow(ctl, true); hover = ctl; }
    dom.style.cursor = ctl || onScreen ? 'pointer' : '';
    if (ctl || onScreen) {
      tip.style.display = 'block'; tip.style.left = e.clientX + 14 + 'px'; tip.style.top = e.clientY + 10 + 'px';
      tip.textContent = ctl ? (ctl.hint + (ctl.setting ? `: ${fmtVal(ctl.setting)}` : '')) : 'Touch screen: tap a tab';
    } else tip.style.display = 'none';
  }
  function onDown(e) {
    const h = pick(e); if (!h) return;
    e.stopImmediatePropagation(); e.preventDefault();
    if (h.object === screen) { tapScreen(h.uv); return; }
    pressed = h.object.userData.wheelControl; activate(pressed, e.button === 2 ? -1 : 1, true);
  }
  function onUp() { if (pressed) { activate(pressed, 1, false); pressed = null; } }
  function onWheel(e) {
    const h = pick(e), ctl = h?.object.userData.wheelControl;
    if (!ctl || (ctl.type !== 'rotary' && ctl.type !== 'thumbwheel')) return;
    e.stopImmediatePropagation(); e.preventDefault(); activate(ctl, e.deltaY < 0 ? 1 : -1, true);
  }
  function onContext(e) { if (pick(e)) e.preventDefault(); }
  dom.addEventListener('pointermove', onMove);
  dom.addEventListener('pointerdown', onDown, { capture: true });
  window.addEventListener('pointerup', onUp);
  dom.addEventListener('wheel', onWheel, { capture: true, passive: false });
  dom.addEventListener('contextmenu', onContext);

  // ---- screen drawing
  const col = { bg: '#05080d', panel: '#0d1520', line: '#1d2a3a', txt: '#e8eef6', dim: '#7d8ea3', green: '#00e676', red: '#ff334b', amber: '#ffb300', blue: '#33b5ff', purple: '#b07cff' };
  function text(t, x, y, size, c = col.txt, align = 'left', weight = 700) { g.font = `${weight} ${size}px "Roboto Mono", Consolas, monospace`; g.fillStyle = c; g.textAlign = align; g.textBaseline = 'middle'; g.fillText(t, x, y); }
  function box(x, y, w, h, fill = col.panel, stroke = col.line) { g.fillStyle = fill; g.fillRect(x, y, w, h); g.strokeStyle = stroke; g.lineWidth = 2; g.strokeRect(x + 1, y + 1, w - 2, h - 2); }
  const fmtT = (s) => (s == null ? '-:--.---' : `${Math.floor(s / 60)}:${(s % 60).toFixed(3).padStart(6, '0')}`);
  function tyreTemps(car) {
    const base = 78 + Math.min(1, (car.speedKmH || 0) / 300) * 22, b = (car.brakeKgf || 0) * 0.04;
    return { FL: base + 3 + b, FR: base + 4 + b, RL: base + 1, RR: base + 2 };
  }
  const tCol = (t) => (t < 85 ? col.blue : t < 105 ? col.green : col.red);
  function draw() {
    const car = api.getCar?.() || {}, lap = api.getLap?.() || {}, tyres = api.getTyres?.() || {};
    g.fillStyle = col.bg; g.fillRect(0, 0, W, H);
    // status strip
    const page = map.screen.pages[S.page];
    text(page, 24, 34, 26, col.dim);
    const flags = [['PL', S.flags.pitLimiter, col.amber], ['OT', S.flags.overtake, col.blue], ['RADIO', S.flags.radio, col.green], ['DRINK', S.flags.drink, '#ff8a00'], [car.aeroMode === 'X_MODE' ? 'X-MODE' : 'Z-MODE', true, car.aeroMode === 'X_MODE' ? col.amber : col.green], ['CLUTCH', S.flags.clutch, col.purple]];
    let fx = 1000;
    for (const [t, on, c] of flags.slice().reverse()) { if (!on) continue; g.font = '700 22px monospace'; const w = g.measureText(t).width + 20; fx -= w + 8; box(fx, 14, w, 40, c, c); text(t, fx + w / 2, 35, 22, '#05080d', 'center'); }
    g.strokeStyle = col.line; g.beginPath(); g.moveTo(0, 66); g.lineTo(W, 66); g.stroke();
    const temps = tyreTemps(car);
    if (page === 'RACE') {
      text(String(car.gear ?? 'N'), 512, 250, 230, S.flags.pitLimiter ? col.amber : col.txt, 'center', 900);
      text(`${Math.round(car.speedKmH || 0)}`, 860, 150, 70, col.txt, 'right'); text('KM/H', 960, 158, 22, col.dim, 'right');
      text(`${Math.round(car.rpm || 0)}`, 860, 230, 46, col.txt, 'right'); text('RPM', 960, 234, 22, col.dim, 'right');
      text(`LAP ${lap.lap || '-'}`, 40, 120, 34); text(`LAST ${fmtT(lap.last)}`, 40, 170, 26, col.dim); text(`BEST ${fmtT(lap.best)}`, 40, 210, 26, col.purple);
      const dl = lap.last != null && lap.best != null ? lap.last - lap.best : 0;
      text(`${dl >= 0 ? '+' : '-'}${Math.abs(dl).toFixed(3)}`, 40, 280, 56, dl > 0.0005 ? col.red : col.green);
      // tyre temps (2x2) and battery
      [['FL', 40, 360], ['FR', 150, 360], ['RL', 40, 450], ['RR', 150, 450]].forEach(([k, x, y]) => { box(x, y, 100, 80, tCol(temps[k])); text(`${Math.round(temps[k])}`, x + 50, y + 42, 34, '#05080d', 'center', 900); });
      const soc = car.batterySoc ?? 0.8; box(300, 400, 420, 70, col.panel); g.fillStyle = soc > 0.25 ? col.green : col.red; g.fillRect(304, 404, 412 * soc, 62);
      text(`BATT ${Math.round(soc * 100)}%`, 510, 436, 30, '#05080d', 'center', 900);
      text(`BBAL ${fmtVal('brakeBias')}`, 760, 380, 28); text(`EB ${fmtVal('engineBraking')}`, 760, 425, 28); text(`STRAT ${fmtVal('strat')}`, 760, 470, 28); text(`ERS ${fmtVal('ersDeploy')}`, 760, 515, 28);
      const th = car.brakeKgf > 10 ? Math.min(1, car.brakeKgf / 150) : car.throttle || 0; box(300, 490, 420, 40); g.fillStyle = car.brakeKgf > 10 ? col.red : col.green; g.fillRect(304, 494, 412 * th, 32);
    } else if (page === 'TYRES') {
      const pos = { FL: [60, 100], FR: [560, 100], RL: [60, 330], RR: [560, 330] };
      for (const [k, [x, y]] of Object.entries(pos)) {
        const t = tyres[k] || {}; box(x, y, 400, 200, col.panel, tCol(temps[k]));
        text(k, x + 20, y + 34, 30, col.dim); text(`${Math.round(temps[k])}°C`, x + 380, y + 40, 44, tCol(temps[k]), 'right');
        text(`${(t.compound || 'medium').toUpperCase()}`, x + 20, y + 100, 30); text(`WEAR ${(t.wear || 'new').toUpperCase()}`, x + 20, y + 150, 26, col.dim);
        text(`${(21.5 + (temps[k] - 90) * 0.04).toFixed(1)} PSI`, x + 380, y + 150, 28, col.txt, 'right');
      }
    } else if (page === 'ERS') {
      const soc = car.batterySoc ?? 0.8;
      text('STATE OF CHARGE', 60, 120, 28, col.dim); box(60, 145, 900, 90); g.fillStyle = soc > 0.25 ? col.green : col.red; g.fillRect(64, 149, 892 * soc, 82); text(`${Math.round(soc * 100)}%`, 510, 190, 50, '#05080d', 'center', 900);
      text(`DEPLOY MODE  ${fmtVal('ersDeploy')}`, 60, 300, 36); text(`HARVEST      ${fmtVal('harvest')}`, 60, 360, 36); text(`STRAT        ${fmtVal('strat')}`, 60, 420, 36);
      text(`OVERTAKE ${S.flags.overtake ? 'ACTIVE' : 'READY'}`, 60, 490, 40, S.flags.overtake ? col.blue : col.dim);
      text(`MGU-K ${Math.round(350 * (car.throttle || 0) * (S.flags.overtake ? 1 : 0.85))} kW`, 960, 490, 36, col.txt, 'right');
    } else {
      setupKeys.forEach((k, i) => {
        const y = ROW0 + i * ROW_H, sel = i === S.mfsIndex;
        box(20, y, 984, ROW_H - 6, sel ? '#14304f' : col.panel, sel ? col.blue : col.line);
        text(map.settings[k].label, 44, y + 22, 28, sel ? col.txt : col.dim); text(fmtVal(k), 720, y + 22, 30, col.txt, 'right');
        box(760, y + 4, 110, ROW_H - 14, '#1b2735'); text('-', 815, y + 22, 34, col.txt, 'center');
        box(880, y + 4, 110, ROW_H - 14, '#1b2735'); text('+', 935, y + 22, 34, col.txt, 'center');
      });
    }
    // MFS popup
    if (S.popup) { box(262, 200, 500, 180, 'rgba(10,20,34,0.94)', col.blue); text(S.popup.title, 512, 250, 34, col.dim, 'center'); text(S.popup.value, 512, 320, 64, col.txt, 'center', 900); }
    // tab bar
    const n = map.screen.pages.length, tw = W / n;
    map.screen.pages.forEach((p, i) => { box(i * tw + 4, TAB_Y + 4, tw - 8, H - TAB_Y - 8, i === S.page ? '#1e5aa8' : '#101a26', i === S.page ? col.blue : col.line); text(p, i * tw + tw / 2, TAB_Y + (H - TAB_Y) / 2, 28, i === S.page ? '#ffffff' : col.dim, 'center'); });
    tex.needsUpdate = true;
  }

  // ---- per frame
  let acc = 1;
  const ledC = (i) => (i < 5 ? 0x00e676 : i < 10 ? 0xff334b : 0x9d4edd);
  function update(dt = 0.016) {
    const car = api.getCar?.() || {};
    for (const c of controls) {
      c.anim = Math.max(0, c.anim - dt * 7);
      const k = Math.sin(c.anim * Math.PI);
      if (c.type === 'button') c.obj.position.z = c.base.pos.z - 0.028 * k;
      else if (c.type === 'rotary') { const target = -THREE.MathUtils.degToRad(c.stepAngle || 22.5) * (c.detent - 5); c.obj.rotation.z += (target - c.obj.rotation.z) * Math.min(1, dt * 14); }
      else if (c.type === 'thumbwheel') { const target = c.spin * 0.5; c.obj.rotation.y += (target - c.obj.rotation.y) * Math.min(1, dt * 14); }
      else if (c.type === 'paddle') { const side = /RH$/.test(c.mesh) ? 1 : -1; const pull = c.held ? 1 : k; c.obj.rotation.y = c.base.rot.y - side * 0.14 * pull; }
    }
    // shift lights from rpm (flash at the limiter), flank LEDs show flags
    const rpm = car.rpm || 0, lit = Math.floor(THREE.MathUtils.clamp((rpm - 4000) / 8500, 0, 1) * 15), flash = rpm > 12200 && (performance.now() % 200) < 100;
    leds.forEach((m, i) => m.material.color.setHex(S.flags.pitLimiter ? ((performance.now() % 500) < 250 && (i % 2 === 0) ? 0xffb300 : 0x111418) : flash ? 0x2f7bff : i < lit ? ledC(i) : 0x111418));
    const flagLed = { L0: S.flags.pitLimiter ? 0xffb300 : 0, L1: S.flags.radio ? 0x00e676 : 0, L2: S.flags.drink ? 0xff8a00 : 0, R0: S.flags.overtake ? 0x33b5ff : 0, R1: car.aeroMode === 'X_MODE' ? 0xffb300 : 0, R2: (car.batterySoc ?? 1) < 0.25 ? 0xff334b : 0 };
    for (const [k, m] of Object.entries(status)) m.material.color.setHex(flagLed[k] || 0x111418);
    if (S.popup) { S.popup.t -= dt; if (S.popup.t <= 0) S.popup = null; }
    acc += dt; if (acc >= 1 / (map.screen.fps || 15)) { acc = 0; draw(); }
  }
  draw();
  return {
    state: S, controls, update, draw, tapScreen, activate: (mesh, dir = 1) => { const c = controls.find((x) => x.mesh === mesh); if (c) { activate(c, dir, true); activate(c, dir, false); } return !!c; },
    dispose() { dom.removeEventListener('pointermove', onMove); dom.removeEventListener('pointerdown', onDown, { capture: true }); window.removeEventListener('pointerup', onUp); dom.removeEventListener('wheel', onWheel, { capture: true }); dom.removeEventListener('contextmenu', onContext); tip.remove(); },
  };
}
