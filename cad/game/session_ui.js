/**
 * session_ui.js — session picker, countdown clock, timing tower and the player's lap list.
 * Watches Drive mode (window.trackMode) from the outside, so cad/track/track_mode.js is unchanged.
 * Tyre compound and wear go through cad/tyre_states.js (window.tyreStates), so grip in Drive mode follows wear.
 * SREdesigns - Samuel R Erwin III
 */
import { createSessionEngine, fmtLap, wearState } from './session_engine.js';

const url = p => new URL(p, import.meta.url).href;
const TYRE_INK = { soft: '#e3122b', medium: '#f5c400', hard: '#f2f2ee', inter: '#25a84a', wet: '#1d6fe8' };

export async function initSessions({ trackMode, tyreStates }) {
  const [config, grid, circuit] = await Promise.all(['./session_config.json', './grid_2026.json', '../track/circuits/red_bull_ring.json'].map(p => fetch(url(p)).then(r => r.json())));
  const eng = createSessionEngine({ config, grid, circuit });
  const car = () => trackMode?.car;
  const ui = { speed: 1, paused: false };
  const player = { run: 'garage', box: false, compound: 'soft', wear: 0, lapSeen: 0, offT: 0, lapStartAt: null, laps: [] };

  // ---------------------------------------------------------------- DOM
  const el = document.createElement('div');
  el.id = 'sess-panel';
  el.innerHTML = `
    <div class="sp-head">
      <select id="sp-pick" aria-label="Session">
        <option value="">Free drive (no session)</option>
        ${Object.entries(config.sessions).map(([k, s]) => `<option value="${k}">${s.label}</option>`).join('')}
      </select>
      <span id="sp-seg"></span><span id="sp-clock">--:--</span>
      <button type="button" id="sp-min" title="Collapse">▾</button>
    </div>
    <div id="sp-body">
      <div class="sp-row">
        <button type="button" id="sp-start" class="sp-btn">Start session</button>
        <button type="button" id="sp-pause" class="sp-btn">Pause</button>
        <label>Clock <select id="sp-speed">${config.clockSpeeds.map(s => `<option value="${s}">${s}×</option>`).join('')}</select></label>
      </div>
      <div class="sp-row">
        <label>Tyre <select id="sp-tyre">${config.tyres.compounds.map(c => `<option value="${c}">${c}</option>`).join('')}</select></label>
        <button type="button" id="sp-newset" class="sp-btn" title="Fit a new set (in the garage)">New set</button>
        <button type="button" id="sp-go" class="sp-btn">Leave garage</button>
        <button type="button" id="sp-box" class="sp-btn">Box this lap</button>
      </div>
      <div class="sp-row sp-status"><span id="sp-run">In garage</span><span id="sp-wear"></span></div>
      <table class="sp-tower"><thead><tr><th>P</th><th>Driver</th><th>Best</th><th>Gap</th><th>Int</th><th>Tyre</th><th>Laps</th></tr></thead><tbody id="sp-rows"></tbody></table>
      <div class="sp-sub">Your laps</div>
      <table class="sp-mylaps"><thead><tr><th>#</th><th>Type</th><th>Time</th><th>S1</th><th>S2</th><th>S3</th><th>Tyre</th><th>Wear</th></tr></thead><tbody id="sp-my"></tbody></table>
      <div class="sp-note">${config.simModel.label}. Other 21 cars use made-up pace numbers (cad/game/grid_2026.json). Your laps are real laps from Drive mode.</div>
    </div>`;
  document.body.appendChild(el);
  const css = document.createElement('style');
  css.textContent = `
    #sess-panel{position:fixed;right:12px;top:56px;z-index:30;width:390px;max-height:calc(100vh - 70px);box-shadow:0 6px 24px rgba(0,0,0,.5);overflow:auto;background:rgba(8,12,20,.86);border:1px solid rgba(255,255,255,.12);border-radius:8px;padding:7px 9px;color:#e6edf5;font:11px/1.3 system-ui,sans-serif;backdrop-filter:blur(4px)}
    #sess-panel .sp-head{display:flex;gap:6px;align-items:center}
    #sess-panel select{background:#141b26;color:#cfd8e3;border:1px solid #2a3545;border-radius:4px;font-size:11px;padding:2px}
    #sp-seg{font-weight:700;color:#00d4e8}#sp-clock{margin-left:auto;font:700 18px ui-monospace,monospace;letter-spacing:.04em}
    #sp-min{background:none;border:0;color:#8b9bb0;cursor:pointer;font-size:12px;padding:2px 4px;border-radius:3px}
    #sp-min:hover{color:#fff;background:rgba(255,255,255,.08)}
    #sess-panel.min .sp-head{cursor:pointer}
    #sess-panel .sp-row{display:flex;gap:5px;align-items:center;flex-wrap:wrap;margin-top:6px}
    #sess-panel .sp-btn{background:#141b26;color:#cfd8e3;border:1px solid #2a3545;border-radius:4px;padding:3px 7px;font-size:11px;cursor:pointer}
    #sess-panel .sp-btn:disabled{opacity:.4;cursor:default}
    #sess-panel .sp-status{justify-content:space-between;color:#9fb0c4}
    #sess-panel table{width:100%;border-collapse:collapse;margin-top:6px;font-family:ui-monospace,monospace;font-size:10.5px}
    #sess-panel th{color:#7d8ea3;font-weight:500;text-align:left;border-bottom:1px solid #263142;padding:1px 3px}
    #sess-panel td{padding:1px 3px;white-space:nowrap}
    #sess-panel tr.me td{background:rgba(0,212,232,.16)}
    #sess-panel tr.ko td{color:#ff6b6b}
    #sess-panel tr.out td{color:#5d6b7d}
    #sess-panel tr.cut td{border-top:1px dashed #ff6b6b}
    #sess-panel .tm{display:inline-block;width:3px;height:10px;margin-right:4px;vertical-align:-1px}
    #sess-panel .ty{display:inline-block;width:9px;height:9px;border-radius:50%;border:2px solid;box-sizing:border-box;vertical-align:-1px;margin-right:3px}
    #sess-panel .sp-sub{margin-top:8px;color:#9fb0c4;font-weight:600}
    #sess-panel .sp-note{margin-top:6px;color:#f0b44c;font-size:10px}
    #sess-panel.min #sp-body{display:none}
    #sess-panel.idle .sp-tower,#sess-panel.idle .sp-mylaps,#sess-panel.idle .sp-sub{display:none}`;
  document.head.appendChild(css);
  const $ = id => document.getElementById(id);

  // ---------------------------------------------------------------- tyres (cad/tyre_states.js)
  function applyTyres() {
    if (!tyreStates) return;
    tyreStates.setTyreCompound('all', player.compound);
    tyreStates.setTyreWear('all', wearState(config, player.wear));
  }
  function addWear(type) {
    const f = type === 'flying' ? 1 : config.tyres.outInLapWearFactor;
    player.wear += config.tyres.wearPerLapPct[player.compound] * f;
    applyTyres();
  }

  // ---------------------------------------------------------------- session control
  function startSession(key) {
    if (!key) { eng.stop(); toGarage(); render(); return; }
    eng.start(key);
    player.laps = []; player.wear = 0; toGarage(); applyTyres(); render();
  }
  function toGarage() {
    player.run = 'garage'; player.box = false; eng.state && (eng.state.playerOnLapSince = null);
    if (trackMode) { trackMode.setDriving(false); trackMode.parkOnGrid(); }
    player.lapSeen = 0;
  }
  function leaveGarage() {
    const S = eng.state; if (!S || S.segOver || eng.remaining <= 0) return;
    if (S.type === 'qualifying' && !S.ids.includes('player')) return;
    if (!trackMode) return;
    trackMode.applyCircuit(true); trackMode.parkOnGrid(); trackMode.setDriving(true);
    player.run = 'out'; player.box = false; player.lapSeen = car().lap; player.offT = 0;
    S.playerOnLapSince = null;
  }

  // ---------------------------------------------------------------- watch Drive mode for completed laps
  function watchCar(dt) {
    const S = eng.state, c = car();
    if (!S || !c || player.run === 'garage') return;
    if (!trackMode.mode.driving && c.lap === 0) { toGarage(); return; }        // "Reset to grid" or Drive switched off
    if (c.surf === 'gravel' || c.surf === 'grass') player.offT += dt;
    if (c.lap > player.lapSeen && player.lapSeen > 0 && c.last != null) {
      const startedAt = player.lapStartAt;
      let type = player.run === 'out' ? 'out' : player.run === 'in' || player.box ? 'in' : 'flying';
      if (type === 'flying' && startedAt != null && startedAt >= eng.segDur()) type = 'in';   // started after the flag
      const valid = player.offT <= config.trackLimits.offTrackSecondsToDelete;
      addWear(type);
      const lap = { type, time: c.last, sectors: c.sectors.slice(0, 3), compound: player.compound, valid, wear: player.wear };
      eng.addPlayerLap(lap); player.laps.push(lap);
      player.offT = 0;
      if (type === 'in') { toGarage(); }
      else {
        player.run = S.elapsed >= eng.segDur() ? 'in' : 'flying';   // after the flag: one more lap, then in
        player.lapStartAt = S.elapsed;
        S.playerOnLapSince = player.run === 'flying' ? S.elapsed : null;
      }
    } else if (c.lap > 0 && player.lapSeen === 0) { player.lapStartAt = S.elapsed; }
    player.lapSeen = c.lap;
  }

  // ---------------------------------------------------------------- render
  const mmss = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  const tyreDot = c => c ? `<span class="ty" style="border-color:${TYRE_INK[c]}"></span>${c[0].toUpperCase()}` : '';
  function render() {
    const S = eng.state;
    el.classList.toggle('idle', !S);
    $('sp-pick').value = S ? S.key : '';
    $('sp-seg').textContent = S ? eng.segName() : '';
    $('sp-clock').textContent = S ? (S.finished ? 'FINISHED' : S.segOver ? 'ENDED' : mmss(eng.remaining)) : '--:--';
    $('sp-start').textContent = !S ? 'Start session' : S.type === 'qualifying' && S.segOver && !S.finished ? `Start ${config.sessions.Q.segments[S.segIdx + 1].name}` : 'Restart';
    $('sp-start').disabled = !$('sp-pick').value && !S;
    $('sp-pause').textContent = ui.paused ? 'Resume' : 'Pause';
    const knocked = S?.type === 'qualifying' && !S.ids.includes('player');
    $('sp-go').disabled = !S || player.run !== 'garage' || S.segOver || eng.remaining <= 0 || knocked;
    $('sp-box').disabled = !S || player.run === 'garage' || player.run === 'in';
    $('sp-newset').disabled = player.run !== 'garage';
    $('sp-tyre').disabled = player.run !== 'garage';
    $('sp-tyre').value = player.compound;
    const runTxt = { garage: 'In garage', out: 'Out-lap', flying: 'Flying lap', in: 'In-lap' }[player.run];
    $('sp-run').textContent = !S ? 'Pick a session, then Start' : knocked ? 'You are knocked out' : runTxt + (player.box && player.run !== 'in' ? ' · boxing' : '');
    $('sp-wear').innerHTML = S ? `${tyreDot(player.compound)} wear ${player.wear.toFixed(0)}% (${wearState(config, player.wear)})` : '';
    if (!S) return;
    const rows = eng.leaderboard();
    const seg = S.type === 'qualifying' ? S.def.segments[S.segIdx] : null;
    const cut = seg?.knockOut ? rows.length - seg.knockOut : -1;
    const line = (r, cls) => `<tr class="${cls}"><td>${r.pos}</td><td><span class="tm" style="background:${r.entry.colour}"></span>${r.entry.player ? r.entry.name : r.entry.name.split(' ').slice(-1)[0].toUpperCase()}</td><td>${fmtLap(r.best)}</td><td>${r.gap != null ? '+' + r.gap.toFixed(3) : ''}</td><td>${r.int != null ? '+' + r.int.toFixed(3) : ''}</td><td>${tyreDot(r.compound)}</td><td>${r.laps}</td></tr>`;
    $('sp-rows').innerHTML = rows.map((r, i) => line(r, [r.entry.player ? 'me' : '', cut >= 0 && i >= cut ? 'ko' : '', i === cut ? 'cut' : ''].join(' '))).join('')
      + (S.eliminated || []).filter(r => !S.ids.includes(r.id)).map(r => line({ ...r, gap: null, int: null }, 'out' + (r.entry.player ? ' me' : '')).replace('</td><td>' + r.laps + '</td>', `</td><td>${r.outIn}</td>`)).join('');
    const sf = t => t == null ? '–' : t.toFixed(3);
    const best = Math.min(...player.laps.filter(l => l.type === 'flying' && l.valid).map(l => l.time));
    $('sp-my').innerHTML = player.laps.map((l, i) => `<tr${l.time === best && l.type === 'flying' ? ' class="me"' : ''}><td>${i + 1}</td><td>${l.type}${l.valid ? '' : ' ✗'}</td><td>${l.type === 'flying' ? fmtLap(l.time) : '(' + fmtLap(l.time) + ')'}</td><td>${sf(l.sectors[0])}</td><td>${sf(l.sectors[1])}</td><td>${sf(l.sectors[2])}</td><td>${tyreDot(l.compound)}</td><td>${l.wear.toFixed(0)}%</td></tr>`).reverse().join('') || '<tr><td colspan="8">No laps yet. Leave the garage, drive or use Autopilot lap.</td></tr>';
  }

  // ---------------------------------------------------------------- events + loop
  $('sp-start').onclick = () => { const S = eng.state; if (S && S.type === 'qualifying' && S.segOver && !S.finished) { eng.nextSegment(); toGarage(); player.laps = player.laps; render(); } else startSession($('sp-pick').value); };
  $('sp-pick').onchange = () => startSession($('sp-pick').value);
  $('sp-pause').onclick = () => { ui.paused = !ui.paused; render(); };
  $('sp-speed').onchange = e => { ui.speed = +e.target.value; };
  $('sp-tyre').onchange = e => { player.compound = e.target.value; player.wear = 0; applyTyres(); render(); };
  $('sp-newset').onclick = () => { player.wear = 0; applyTyres(); render(); };
  $('sp-go').onclick = leaveGarage;
  $('sp-box').onclick = () => { player.box = true; render(); };
  const toggleMin = () => {
    const isMin = el.classList.toggle('min');
    $('sp-min').textContent = isMin ? '▸' : '▾';
    $('sp-min').title = isMin ? 'Expand session panel' : 'Collapse session panel';
  };
  $('sp-min').onclick = (e) => { e.stopPropagation(); toggleMin(); };
  el.querySelector('.sp-head')?.addEventListener('click', (e) => {
    if (el.classList.contains('min') && e.target !== $('sp-pick')) {
      toggleMin();
    }
  });

  function step(dt) {
    if (!eng.state) return;
    watchCar(dt);
    eng.tick(dt * ui.speed);
  }
  let last = performance.now(), acc = 0;
  (function loop(now) {
    requestAnimationFrame(loop);
    const dt = Math.min(0.1, (now - last) / 1000); last = now;
    if (!ui.paused) step(dt);
    acc += dt; if (acc > 0.25) { acc = 0; render(); }
  })(last);
  render();

  const api = { engine: eng, player, start: startSession, leaveGarage, render, step, setSpeed: s => { ui.speed = s; } };
  window.sessions = api;
  return api;
}
