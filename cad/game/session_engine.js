/**
 * session_engine.js — data-driven Practice / Qualifying session logic (no DOM, no Three.js).
 * Rules and the simulated lap-time model live in session_config.json, the grid in grid_2026.json.
 * Other cars' lap times are SIMULATED with a simple random model (see simModel in the config).
 * SREdesigns - Samuel R Erwin III
 */

/** small seeded random generator so a session's simulated field is repeatable */
export function rng(seed) {
  let s = seed >>> 0;
  return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
export const parseLap = s => { const m = String(s).match(/(?:(\d+):)?(\d+(?:\.\d+)?)/); return m ? (+(m[1] || 0)) * 60 + +m[2] : null; };
export const fmtLap = t => t == null ? '–' : `${Math.floor(t / 60)}:${(t % 60).toFixed(3).padStart(6, '0')}`;

export function wearState(cfg, pct) { return cfg.tyres.wearStates.find(w => pct <= w.upTo).state; }

export function createSessionEngine({ config, grid, circuit }) {
  const M = config.simModel;
  const refLap = parseLap(circuit?.lap_record?.time) * M.refFactor || 65;
  const secLen = (circuit?.sectors?.lengths_km || []).map(s => s.length_km);
  const secW = secLen.length === 3 ? secLen.map(l => l / secLen.reduce((a, b) => a + b, 0)) : [0.33, 0.34, 0.33];

  // ---- entry list: 22 cars, the player takes one seat (config.player.replaces)
  const entries = [];
  grid.teams.forEach(t => t.drivers.forEach(d => {
    const player = d.name === config.player.replaces;
    entries.push({ id: player ? 'player' : `#${d.no}`, no: player ? config.player.no : d.no, name: player ? config.player.name : d.name,
      team: t.team, colour: t.colour, pace: t.sim_pace_pct, player });
  }));
  const R0 = rng(M.seed);
  entries.forEach(e => { e.driverPct = (R0() - 0.5) * 0.3; });   // made-up driver skill spread ±0.15 %
  const byId = Object.fromEntries(entries.map(e => [e.id, e]));

  let S = null;   // current session state

  function simLapTime(R, e, compound, type, frac, extraPct = 0) {
    if (type === 'out') return refLap * M.outLapFactor * (1 + R() * 0.05);
    if (type === 'in') return refLap * M.inLapFactor * (1 + R() * 0.05);
    let pct = e.pace + e.driverPct + (M.compoundPct[compound] || 0) - M.trackEvolutionPct * frac + extraPct;
    pct += (R() + R() + R() - 1.5) * M.noisePct * 1.4;
    let t = refLap * (1 + pct / 100);
    let valid = true;
    if (R() < M.mistakeChance) { if (R() < 0.4) valid = false; else t += M.mistakeSec[0] + R() * (M.mistakeSec[1] - M.mistakeSec[0]); }
    return { t, valid };
  }
  function splits(R, t) { const w = secW.map(x => x * (1 + (R() - 0.5) * 0.02)); const k = t / w.reduce((a, b) => a + b, 0); return w.map(x => x * k); }

  /** pre-plan every simulated car's runs for one session / segment; laps are revealed as the clock passes */
  function planSim(ids, dur, kind, segIdx) {
    const R = rng(M.seed + S.key.charCodeAt(S.key.length - 1) * 97 + segIdx * 7919);
    const plan = [];
    const push = (e, type, start, compound, extraPct, frac0) => {
      const r = simLapTime(R, e, compound, type, frac0, extraPct);
      const time = typeof r === 'number' ? r : r.t;
      plan.push({ id: e.id, type, time, end: start + time, start, compound, valid: typeof r === 'number' ? true : r.valid, sectors: splits(R, time) });
      return start + time;
    };
    ids.filter(id => id !== 'player').forEach(id => {
      const e = byId[id];
      if (kind === 'practice') {
        let t = 120 + R() * 600;
        while (t < dur - refLap * 2) {
          const compound = ['soft', 'medium', 'medium', 'hard', 'hard'][Math.floor(R() * 5)];
          const fuel = M.practiceFuelPct[0] + R() * (M.practiceFuelPct[1] - M.practiceFuelPct[0]);
          t = push(e, 'out', t, compound, 0, 0);
          const n = 3 + Math.floor(R() * 7);
          for (let k = 0; k < n && t < dur; k++) t = push(e, 'flying', t, compound, fuel + k * 0.05, t / dur);
          if (t < dur) t = push(e, 'in', t, compound, 0, 0);
          t += 240 + R() * 480;
        }
      } else {
        const push2 = segIdx * -0.12;     // a bit more push in Q2 / Q3
        for (const startFrac of [0.08 + R() * 0.3, 0.68 + R() * 0.12]) {
          let t = dur * startFrac;
          t = push(e, 'out', t, 'soft', 0, 0);
          const n = startFrac < 0.5 && R() < 0.5 ? 2 : 1;
          for (let k = 0; k < n && t < dur; k++) t = push(e, 'flying', t, 'soft', push2 + k * 0.08, 0.5 + startFrac * 0.5);
          push(e, 'in', t, 'soft', 0, 0);
        }
      }
    });
    return plan.sort((a, b) => a.end - b.end);
  }

  function start(key) {
    const def = config.sessions[key];
    S = { key, def, type: def.type, segIdx: 0, elapsed: 0, laps: [], plan: [], ids: entries.map(e => e.id), eliminated: [], finished: false, segOver: false, playerOnLapSince: null };
    beginSegment();
    return S;
  }
  function segDur() { return S.type === 'qualifying' ? S.def.segments[S.segIdx].minutes * 60 : S.def.minutes * 60; }
  function segName() { return S.type === 'qualifying' ? S.def.segments[S.segIdx].name : S.key; }
  function beginSegment() { S.elapsed = 0; S.segOver = false; S.plan = planSim(S.ids, segDur(), S.type, S.segIdx); }

  /** advance the session clock (seconds of session time). Returns events: 'flag', 'segmentEnd' */
  function tick(dt) {
    if (!S || S.finished || S.segOver) return [];
    const ev = [];
    const before = S.elapsed;
    S.elapsed += dt;
    if (before < segDur() && S.elapsed >= segDur()) ev.push('flag');
    while (S.plan.length && S.plan[0].end <= S.elapsed) { const l = S.plan.shift(); S.laps.push({ ...l, seg: S.segIdx, t: l.end }); }
    const playerBusy = S.playerOnLapSince != null && S.playerOnLapSince < segDur();
    if (S.elapsed >= segDur() && !S.plan.length && !playerBusy) { endSegment(); ev.push('segmentEnd'); }
    return ev;
  }
  function endSegment() {
    S.segOver = true;
    if (S.type !== 'qualifying') { S.finished = true; return; }
    const seg = S.def.segments[S.segIdx];
    const board = leaderboard();
    if (seg.knockOut) {
      const out = board.slice(board.length - seg.knockOut);
      out.forEach((r, k) => S.eliminated.unshift({ ...r, pos: board.length - seg.knockOut + k + 1, outIn: seg.name }));
      S.eliminated.sort((a, b) => a.pos - b.pos);
      S.ids = board.slice(0, board.length - seg.knockOut).map(r => r.id);
    }
    if (S.segIdx >= S.def.segments.length - 1) S.finished = true;
  }
  function nextSegment() { if (!S || S.type !== 'qualifying' || !S.segOver || S.finished) return false; S.segIdx++; beginSegment(); return true; }

  /** player's completed lap from Drive mode */
  function addPlayerLap(lap) { if (!S) return; S.laps.push({ id: 'player', seg: S.segIdx, t: S.elapsed, ...lap }); }

  /** best valid flying lap per car in the current segment (or the whole practice session), sorted, with gaps */
  function leaderboard() {
    if (!S) return [];
    const rows = S.ids.map(id => {
      const mine = S.laps.filter(l => l.id === id && l.seg === S.segIdx);
      const fl = mine.filter(l => l.type === 'flying' && l.valid);
      const best = fl.reduce((b, l) => (!b || l.time < b.time ? l : b), null);
      return { id, entry: byId[id], best: best?.time ?? null, compound: best?.compound ?? null, sectors: best?.sectors ?? null, laps: mine.length, bestAt: best?.t ?? Infinity };
    });
    rows.sort((a, b) => (a.best ?? Infinity) - (b.best ?? Infinity) || a.bestAt - b.bestAt || a.entry.no - b.entry.no);
    const lead = rows[0]?.best;
    rows.forEach((r, i) => { r.pos = i + 1; r.gap = r.best != null && lead != null && i ? r.best - lead : null; r.int = r.best != null && i && rows[i - 1].best != null ? r.best - rows[i - 1].best : null; });
    return rows;
  }

  return {
    entries, byId, refLap, start, tick, nextSegment, addPlayerLap, leaderboard, segDur, segName,
    get state() { return S; },
    get remaining() { return S ? Math.max(0, segDur() - S.elapsed) : 0; },
    stop() { S = null; },
  };
}
