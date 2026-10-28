/**
 * session_engine.js — Full F1 Weekend Session Engine: Practice (FP1-3), Qualifying (Q1-3) & Grand Prix Race.
 * SREdesigns - Samuel R Erwin III
 */

export function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const parseLap = (s) => {
  const m = String(s).match(/(?:(\d+):)?(\d+(?:\.\d+)?)/);
  return m ? +(m[1] || 0) * 60 + +m[2] : null;
};

export const fmtLap = (t) =>
  t == null ? '–' : `${Math.floor(t / 60)}:${(t % 60).toFixed(3).padStart(6, '0')}`;

export function wearState(cfg, pct) {
  return cfg.tyres.wearStates.find((w) => pct <= w.upTo).state;
}

export function createSessionEngine({ config, grid, circuit }) {
  const M = config.simModel;
  const refLap = parseLap(circuit?.lap_record?.time) * M.refFactor || 65;
  const secLen = (circuit?.sectors?.lengths_km || []).map((s) => s.length_km);
  const secW = secLen.length === 3 ? secLen.map((l) => l / secLen.reduce((a, b) => a + b, 0)) : [0.33, 0.34, 0.33];

  // Entry list: 22 cars, player replaces config.player.replaces
  const entries = [];
  grid.teams.forEach((t) =>
    t.drivers.forEach((d) => {
      const player = d.name === config.player.replaces;
      entries.push({
        id: player ? 'player' : `#${d.no}`,
        no: player ? config.player.no : d.no,
        name: player ? config.player.name : d.name,
        team: t.team,
        colour: t.colour,
        pace: t.sim_pace_pct,
        player,
      });
    })
  );

  const R0 = rng(M.seed);
  entries.forEach((e) => {
    e.driverPct = (R0() - 0.5) * 0.3;
  });
  const byId = Object.fromEntries(entries.map((e) => [e.id, e]));

  let S = null;                  // Current session state
  let finalQualifyingGrid = null; // Stored grid after Q3

  function simLapTime(R, e, compound, type, frac, extraPct = 0) {
    if (type === 'out') return refLap * M.outLapFactor * (1 + R() * 0.05);
    if (type === 'in') return refLap * M.inLapFactor * (1 + R() * 0.05);
    let pct = e.pace + e.driverPct + (M.compoundPct[compound] || 0) - M.trackEvolutionPct * frac + extraPct;
    pct += (R() + R() + R() - 1.5) * M.noisePct * 1.4;
    let t = refLap * (1 + pct / 100);
    let valid = true;
    if (R() < M.mistakeChance) {
      if (R() < 0.4) valid = false;
      else t += M.mistakeSec[0] + R() * (M.mistakeSec[1] - M.mistakeSec[0]);
    }
    return { t, valid };
  }

  function splits(R, t) {
    const w = secW.map((x) => x * (1 + (R() - 0.5) * 0.02));
    const k = t / w.reduce((a, b) => a + b, 0);
    return w.map((x) => x * k);
  }

  function planSim(ids, dur, kind, segIdx) {
    const R = rng(M.seed + S.key.charCodeAt(S.key.length - 1) * 97 + segIdx * 7919);
    const plan = [];
    const push = (e, type, start, compound, extraPct, frac0) => {
      const r = simLapTime(R, e, compound, type, frac0, extraPct);
      const time = typeof r === 'number' ? r : r.t;
      plan.push({
        id: e.id,
        type,
        time,
        end: start + time,
        start,
        compound,
        valid: typeof r === 'number' ? true : r.valid,
        sectors: splits(R, time),
      });
      return start + time;
    };

    ids.filter((id) => id !== 'player').forEach((id) => {
      const e = byId[id];
      if (kind === 'practice') {
        let t = 120 + R() * 600;
        while (t < dur - refLap * 2) {
          const compound = ['soft', 'medium', 'medium', 'hard', 'hard'][Math.floor(R() * 5)];
          const fuel = M.practiceFuelPct[0] + R() * (M.practiceFuelPct[1] - M.practiceFuelPct[0]);
          t = push(e, 'out', t, compound, 0, 0);
          const n = 3 + Math.floor(R() * 7);
          for (let k = 0; k < n && t < dur; k++) {
            t = push(e, 'flying', t, compound, fuel + k * 0.05, t / dur);
          }
          if (t < dur) t = push(e, 'in', t, compound, 0, 0);
          t += 240 + R() * 480;
        }
      } else if (kind === 'qualifying') {
        const push2 = segIdx * -0.12;
        for (const startFrac of [0.08 + R() * 0.3, 0.68 + R() * 0.12]) {
          let t = dur * startFrac;
          t = push(e, 'out', t, 'soft', 0, 0);
          const n = startFrac < 0.5 && R() < 0.5 ? 2 : 1;
          for (let k = 0; k < n && t < dur; k++) {
            t = push(e, 'flying', t, 'soft', push2 + k * 0.08, 0.5 + startFrac * 0.5);
          }
          push(e, 'in', t, 'soft', 0, 0);
        }
      }
    });
    return plan.sort((a, b) => a.end - b.end);
  }

  function start(key, customRaceLaps = null) {
    const def = config.sessions[key];
    S = {
      key,
      def,
      type: def.type,
      segIdx: 0,
      elapsed: 0,
      laps: [],
      plan: [],
      ids: entries.map((e) => e.id),
      eliminated: [],
      finished: false,
      segOver: false,
      playerOnLapSince: null,
      // Race mode specific state
      totalLaps: customRaceLaps || def.defaultLaps || 5,
      currentLap: 1,
      startPhase: def.type === 'race' ? 'lights_sequence' : null,
      redLightsCount: 0,
      lightsOutTimer: 0,
      raceLeader: null,
      jumpStartPenalty: false,
      playerCompoundsUsed: new Set(),
    };

    if (def.type === 'race') {
      beginRace();
    } else {
      beginSegment();
    }
    return S;
  }

  function beginRace() {
    S.elapsed = 0;
    S.segOver = false;
    S.startPhase = 'lights_sequence';
    S.redLightsCount = 0;
    S.lightsOutTimer = 5.0 + Math.random() * 2.0; // 5 red lights + random hold

    // Grid order: use final qualifying grid if run, or sort by pace
    if (!finalQualifyingGrid) {
      const sorted = [...entries].sort((a, b) => a.pace - b.pace);
      finalQualifyingGrid = sorted.map((e, i) => ({ ...e, gridPos: i + 1 }));
    }
    S.grid = [...finalQualifyingGrid];
  }

  function segDur() {
    if (S.type === 'qualifying') return S.def.segments[S.segIdx].minutes * 60;
    if (S.type === 'race') return 7200; // 2 hour max race limit
    return S.def.minutes * 60;
  }

  function segName() {
    if (S.type === 'qualifying') return S.def.segments[S.segIdx].name;
    if (S.type === 'race') return `L ${S.currentLap}/${S.totalLaps}`;
    return S.key;
  }

  function beginSegment() {
    S.elapsed = 0;
    S.segOver = false;
    S.plan = planSim(S.ids, segDur(), S.type, S.segIdx);
  }

  function tick(dt) {
    if (!S || S.finished || S.segOver) return [];
    const ev = [];
    const before = S.elapsed;
    S.elapsed += dt;

    // Race Start Lights Sequence
    if (S.type === 'race' && S.startPhase === 'lights_sequence') {
      const sec = Math.floor(S.elapsed);
      if (sec >= 1 && sec <= 5 && S.redLightsCount !== sec) {
        S.redLightsCount = sec;
        ev.push('red_light_on');
      } else if (S.elapsed >= S.lightsOutTimer && S.startPhase !== 'racing') {
        S.startPhase = 'racing';
        S.redLightsCount = 0;
        ev.push('lights_out');
      }
    }

    if (before < segDur() && S.elapsed >= segDur() && S.type !== 'race') ev.push('flag');

    while (S.plan.length && S.plan[0].end <= S.elapsed) {
      const l = S.plan.shift();
      S.laps.push({ ...l, seg: S.segIdx, t: l.end });
    }

    const playerBusy = S.playerOnLapSince != null && S.playerOnLapSince < segDur();
    if (S.type !== 'race' && S.elapsed >= segDur() && !S.plan.length && !playerBusy) {
      endSegment();
      ev.push('segmentEnd');
    }
    return ev;
  }

  function endSegment() {
    S.segOver = true;
    if (S.type !== 'qualifying') {
      S.finished = true;
      return;
    }
    const seg = S.def.segments[S.segIdx];
    const board = leaderboard();
    if (seg.knockOut) {
      const out = board.slice(board.length - seg.knockOut);
      out.forEach((r, k) =>
        S.eliminated.unshift({ ...r, pos: board.length - seg.knockOut + k + 1, outIn: seg.name })
      );
      S.eliminated.sort((a, b) => a.pos - b.pos);
      S.ids = board.slice(0, board.length - seg.knockOut).map((r) => r.id);
    }
    if (S.segIdx >= S.def.segments.length - 1) {
      S.finished = true;
      // Compile final qualifying grid
      const q3Drivers = leaderboard();
      finalQualifyingGrid = [...q3Drivers, ...S.eliminated].map((r, i) => ({
        ...r.entry,
        gridPos: i + 1,
        bestTime: r.best,
      }));
    }
  }

  function nextSegment() {
    if (!S || S.type !== 'qualifying' || !S.segOver || S.finished) return false;
    S.segIdx++;
    beginSegment();
    return true;
  }

  function addPlayerLap(lap) {
    if (!S) return;
    S.laps.push({ id: 'player', seg: S.segIdx, t: S.elapsed, ...lap });
    if (lap.compound) S.playerCompoundsUsed.add(lap.compound);

    if (S.type === 'race') {
      S.currentLap++;
      if (S.currentLap > S.totalLaps) {
        S.finished = true;
        S.segOver = true;
      }
    }
  }

  function leaderboard() {
    if (!S) return [];
    const rows = S.ids.map((id) => {
      const mine = S.laps.filter((l) => l.id === id && l.seg === S.segIdx);
      const fl = mine.filter((l) => l.type === 'flying' && l.valid);
      const best = fl.reduce((b, l) => (!b || l.time < b.time ? l : b), null);
      return {
        id,
        entry: byId[id],
        best: best?.time ?? null,
        compound: best?.compound ?? null,
        sectors: best?.sectors ?? null,
        laps: mine.length,
        bestAt: best?.t ?? Infinity,
      };
    });
    rows.sort(
      (a, b) =>
        (a.best ?? Infinity) - (b.best ?? Infinity) ||
        a.bestAt - b.bestAt ||
        a.entry.no - b.entry.no
    );
    const lead = rows[0]?.best;
    rows.forEach((r, i) => {
      r.pos = i + 1;
      r.gap = r.best != null && lead != null && i ? r.best - lead : null;
      r.int = r.best != null && i && rows[i - 1].best != null ? r.best - rows[i - 1].best : null;
    });
    return rows;
  }

  return {
    entries,
    byId,
    refLap,
    start,
    tick,
    nextSegment,
    addPlayerLap,
    leaderboard,
    segDur,
    segName,
    get state() {
      return S;
    },
    get remaining() {
      return S ? Math.max(0, segDur() - S.elapsed) : 0;
    },
    get finalGrid() {
      return finalQualifyingGrid;
    },
    stop() {
      S = null;
    },
  };
}
