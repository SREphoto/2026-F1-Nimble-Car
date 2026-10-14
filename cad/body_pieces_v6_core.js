/**
 * body_pieces_v6_core.js — pure-math generator for the v6 main body (no three.js import, so the
 * same code drives the in-app build and the GLB exporter, tools/body_v6/export_glb.mjs).
 * Units dm. X nose -> tail (front axle 0, rear axle 34), Y + = car left, Z up (ground 0).
 * Wheels (repo): tyre r 3.6, hub z 3.6, rear half-track 7.4, rear tyre 3.75 wide -> inner face y 5.5.
 * Cockpit rim z 5.12 / half width 2.35, halo z 7.4, airbox mouth x 15.85 z 8.42 (AIRBOX_SPEC).
 *
 * v6 vs v5: pods are ~1.6 dm taller (ridge crown z 6.25 at the inlet vs 4.65) and the ridge is a
 * wide rounded crescent shoulder, not a tube: one section curve per station
 *   inboard edge -> ridge crown -> outer crease -> flank bulge -> undercut -> floor
 * is cut into pieces so every panel shares its seam with the next.
 */
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const sstep = (x, a, b) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

// Pod section stations (left side). yIn/zIn inboard edge (cockpit rim / under cover side panel),
// yC/zC ridge crown, yO/zO outer crease (widest point of the ridge), yF/zF flank bottom,
// yU/zU where the undercut meets the floor (floats above it at the front).
export const POD = [
  { x: 9.7,  yIn: 2.45, zIn: 5.45, yC: 3.95, zC: 6.15, yO: 5.15, zO: 5.55, yF: 4.75, zF: 4.55, yU: 2.95, zU: 2.3 },
  { x: 11.5, yIn: 2.45, zIn: 5.5,  yC: 4.1,  zC: 6.25, yO: 5.4,  zO: 5.45, yF: 4.95, zF: 4.2,  yU: 2.75, zU: 1.5 },
  { x: 14.0, yIn: 2.45, zIn: 5.6,  yC: 4.1,  zC: 6.1,  yO: 5.35, zO: 5.2,  yF: 4.85, zF: 3.75,  yU: 2.6, zU: 0.8 },
  { x: 17.0, yIn: 2.4,  zIn: 5.30,  yC: 3.95, zC: 5.50,  yO: 5.1,  zO: 4.60,  yF: 4.55, zF: 3.3, yU: 2.5, zU: 0.55 },
  { x: 20.0, yIn: 2.3,  zIn: 4.90, yC: 3.7,  zC: 5.00, yO: 4.75, zO: 4.10, yF: 4.15, zF: 2.85, yU: 2.45, zU: 0.55 },
  { x: 23.0, yIn: 2.05, zIn: 4.45, yC: 3.3,  zC: 4.50,  yO: 4.15, zO: 3.65, yF: 3.6, zF: 2.45, yU: 2.3, zU: 0.55 },
  { x: 26.0, yIn: 1.75, zIn: 4.10,  yC: 2.8,  zC: 4.10,  yO: 3.45, zO: 3.40,  yF: 3.0, zF: 2.0, yU: 2.1, zU: 0.55 },
  { x: 29.0, yIn: 1.45, zIn: 3.80, yC: 2.3,  zC: 3.80, yO: 2.8,  zO: 3.25,  yF: 2.45, zF: 1.65, yU: 1.85, zU: 0.55 },
  { x: 31.0, yIn: 1.25, zIn: 3.60, yC: 1.95, zC: 3.60, yO: 2.3,  zO: 3.15,  yF: 2.05, zF: 1.4, yU: 1.7, zU: 0.55 },
  { x: 32.6, yIn: 1.1,  zIn: 3.5,  yC: 1.6,  zC: 3.5,  yO: 1.85, zO: 3.15, yF: 1.7, zF: 1.25, yU: 1.6, zU: 0.55 },
  { x: 34.4, yIn: 0.9,  zIn: 3.3,  yC: 1.25, zC: 3.3,  yO: 1.4,  zO: 3.0,  yF: 1.35, zF: 1.1, yU: 1.3, zU: 0.55 },
];
// Engine cover spine: ws half width, zs crown, ze edge height where the side panel starts.
export const SPINE = [
  { x: 16.2, ws: 0.9,  zs: 7.3,  ze: 6.9 },
  { x: 17.5, ws: 0.95, zs: 7.75, ze: 7.25 },
  { x: 19.0, ws: 0.95, zs: 7.65, ze: 7.15 },
  { x: 21.0, ws: 0.88, zs: 7.15, ze: 6.75 },
  { x: 24.0, ws: 0.82, zs: 6.5,  ze: 6.15 },
  { x: 27.0, ws: 0.8,  zs: 5.95, ze: 5.65 },
  { x: 30.0, ws: 0.75, zs: 5.35, ze: 5.05 },
  { x: 32.6, ws: 0.65, zs: 4.85, ze: 4.6 },
  { x: 34.4, ws: 0.5,  zs: 4.45, ze: 4.2 },
];
export const X = { podFront: 9.7, taper: 29.0, ridgeEnd: 32.6, coverFront: 16.2, coverEnd: 34.4 };

function sampler(tab) {
  const keys = Object.keys(tab[0]);
  return (x) => {
    let i = 0; while (i < tab.length - 2 && x > tab[i + 1].x) i++;
    const p0 = tab[Math.max(0, i - 1)], p1 = tab[i], p2 = tab[i + 1], p3 = tab[Math.min(tab.length - 1, i + 2)];
    const t = clamp((x - p1.x) / (p2.x - p1.x), 0, 1), t2 = t * t, t3 = t2 * t, o = {};
    keys.forEach((k) => { const a = p0[k], b = p1[k], c = p2[k], d = p3[k];
      o[k] = 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3); });
    o.x = x; return o;
  };
}
export const podAt = sampler(POD), spineAt = sampler(SPINE);
const bez = (a, c1, c2, b, t) => { const u = 1 - t; return [0, 1].map((k) => u * u * u * a[k] + 3 * u * u * t * c1[k] + 3 * u * t * t * c2[k] + t * t * t * b[k]); };

/** Pod section curve, t in [0,4]: 0 inboard edge, 1 crown, 2 crease, 3 flank bottom, 4 undercut/floor. Returns [y,z]. */
export function podSection(P, t) {
  const seg = Math.min(3, Math.floor(t)), u = t - seg;
  const In = [P.yIn, P.zIn], Cr = [P.yC, P.zC], O = [P.yO, P.zO], F = [P.yF, P.zF], U = [P.yU, P.zU];
  if (seg === 0) return bez(In, [lerp(P.yIn, P.yC, 0.35), lerp(P.zIn, P.zC, 0.85)], [lerp(P.yIn, P.yC, 0.7), P.zC], Cr, u);
  if (seg === 1) return bez(Cr, [lerp(P.yC, P.yO, 0.6), P.zC], [P.yO + 0.12, lerp(P.zO, P.zC, 0.55)], O, u); // round shoulder
  if (seg === 2) { const h = P.zO - P.zF; // crease tucks in, then the flank bows out over the radiators
    return bez(O, [P.yO - 0.3, P.zO - 0.1 * h], [P.yF + 0.22, P.zF + 0.45 * h], F, u); }
  const d = P.yF - P.yU; // deep concave undercut
  return bez(F, [P.yF - 0.05, P.zF - 0.55 * (P.zF - P.zU)], [P.yU + 0.55 * d, P.zU + 0.1], U, u);
}

// ---------------------------------------------------------------------------------------
const xsr = (x0, x1, step) => { const n = Math.max(2, Math.round((x1 - x0) / step)); return Array.from({ length: n + 1 }, (_, i) => lerp(x0, x1, i / n)); };
const tsr = (t0, t1, n) => Array.from({ length: n + 1 }, (_, i) => lerp(t0, t1, i / n));

/** Quad grid from rings[i][j] = [x,y,z]; normals forced away from `inside(p)` = [x,y,z] reference. */
function gridMesh(rings, closed, insideRef) {
  const rows = rings.length, cols = rings[0].length, pos = [], idx = [];
  rings.forEach((r) => r.forEach((p) => pos.push(...p)));
  const jm = closed ? cols : cols - 1;
  const mi = rows >> 1, mj = jm >> 1, P = (i, j) => rings[i][j % cols];
  const a = P(mi, mj), b = P(mi, mj + 1), c = P(mi + 1, mj);
  const e1 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], e2 = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
  const n = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]];
  const ins = insideRef(a), flip = n[0] * (a[0] - ins[0]) + n[1] * (a[1] - ins[1]) + n[2] * (a[2] - ins[2]) < 0;
  for (let i = 0; i < rows - 1; i++) for (let j = 0; j < jm; j++) {
    const q0 = i * cols + j, q1 = i * cols + (j + 1) % cols, q2 = (i + 1) * cols + (j + 1) % cols, q3 = (i + 1) * cols + j;
    if (flip) idx.push(q0, q2, q1, q0, q3, q2); else idx.push(q0, q1, q2, q0, q2, q3);
  }
  return { positions: pos, indices: idx, grid: { rows, cols, closed } };
}
const mirror = (m) => { const p = m.positions.slice(); for (let i = 1; i < p.length; i += 3) p[i] = -p[i];
  const ix = []; for (let i = 0; i < m.indices.length; i += 3) ix.push(m.indices[i], m.indices[i + 2], m.indices[i + 1]);
  return { positions: p, indices: ix, grid: m.grid }; };

const FN = {
  ridge: 'Rising rounded ridge: low at the rear tyre, sweeping up and forward to the cockpit opening; the two ridges ring the driver like a broken donut. Its crown tops the radiator bay (water radiators X 10.5-14, top z ~6.0) and it is the line the air follows down the cola-bottle waist toward the beam wing and diffuser. Carries ORACLE on its outer face.',
  side: 'Sidepod side under the ridge crease: tucks in at the crease so the ridge stands proud, then bulges out just enough to clear the radiator and ERS/oil-cooler outer tanks (y ~5.2).',
  inlet: 'Tall square intake mouth beside the halo (~1.9 wide x 2.0 tall dm), sized to the water radiator face behind it; thin lip, dark duct slows the air onto the core.',
  undercut: 'Deep undercut: concave lower panel curving from the flank bottom in to the floor, leaving a channel that pulls front-wheel wake down and back along the floor edge toward the diffuser.',
  taper: 'Rear taper (X 29 to 32.6): the pod narrows and drops to meet the front-top of the rear tyre so air hugs the body into the gap ahead of the tyre and onto the beam wing/diffuser.',
  spine: 'Narrow engine-cover spine rising behind the airbox over the airbox duct, turbo and wastegate (tallest PU parts); only as wide as they need.',
  coverSide: 'Engine-cover side panel falling from the spine edge down onto the ridge, over the fuel cell shoulders, exhaust collectors and ERS inverters.',
  airbox: 'Airbox surround collar: fairs the airbox pillar into the spine behind the roll hoop so engine intake air stays clean.',
  tail: 'Tail cap closing the cover over the gearbox with a hot-air exit around the exhaust.',
  knee: 'Cockpit side panel beside the driver (X 7.6-10.0): side-impact cover over the SIPS tubes, bridging the tub rim to the pod inlet.',
  front: 'Pod front lower face below the inlet mouth: closes the radiator bay at the front and blends into the undercut.',
  logo: 'ORACLE sponsor plate on the outer face of the ridge, tilted ~10 deg (slopes down toward the rear like the RB22).',
};

/**
 * Build all pieces. Returns [{ name, group, positions, indices, grid, material, explode:[x,y,z], function }].
 * opts.logoPlates: include ORACLE plates as geometry (GLB); the app uses livery decals instead.
 */
export function buildBodyV6(opts = {}) {
  const out = [];
  const push = (name, group, m, material, explode, fn) => out.push({ name, group, ...m, material, explode, function: fn });
  const both = (base, group, mL, material, ex, fn) => {
    push(`${base}_LH`, group, mL, material, ex, fn);
    push(`${base}_RH`, group, mirror(mL), material, [ex[0], -ex[1], ex[2]], fn);
  };
  const podIn = (p) => { const P = podAt(p[0]); return [p[0], (P.yIn + P.yF) / 2 - 0.4, (P.zF + P.zIn) / 2]; };
  const podRings = (x0, x1, t0, t1, nt) => xsr(x0, x1, 0.25).map((x) => { const P = podAt(x); return tsr(t0, t1, nt).map((t) => { const [y, z] = podSection(P, t); return [x, y, z]; }); });

  // ---- per-side pod pieces --------------------------------------------------------------
  // ridge front end curls up into the inlet top lip: lift the first 0.6 dm a little
  const ridge = podRings(X.podFront, X.ridgeEnd, 0, 2, 24);
  both('Sidepod_Ridge', 'Body_Sidepods', gridMesh(ridge, false, podIn), 'paint', [0, 2.2, 3.0], FN.ridge);
  both('Sidepod_Body', 'Body_Sidepods', gridMesh(podRings(X.podFront, X.taper, 2, 3, 14), false, podIn), 'paint', [0, 4.0, 0.6], FN.side);
  both('Sidepod_Undercut_Panel', 'Body_Sidepods', gridMesh(podRings(X.podFront, X.taper, 3, 4, 12), false, podIn), 'paint', [0, 4.2, -1.4], FN.undercut);
  both('Sidepod_Rear_Taper', 'Body_Sidepods', gridMesh(podRings(X.taper, X.ridgeEnd, 2, 4, 20), false, podIn), 'paint', [3.0, 3.2, 0], FN.taper);

  // inlet: rounded-square lip ring at the pod front + dark duct going back
  { const P = podAt(X.podFront), y0 = P.yIn + 0.15, y1 = P.yO - 0.05, z1 = podSection(P, 1)[1] - 0.12, z0 = z1 - 2.05, r = 0.28;
    const yc = (y0 + y1) / 2, zc = (z0 + z1) / 2, hy = (y1 - y0) / 2, hz = (z1 - z0) / 2;
    const sq = (k, n, g) => { const th = (k / n) * Math.PI * 2, c = Math.cos(th), s = Math.sin(th), e = 2 / 6;
      return [yc + (hy + g) * Math.sign(c) * Math.pow(Math.abs(c), e), zc + (hz + g) * Math.sign(s) * Math.pow(Math.abs(s), e)]; };
    const N = 48; void r;
    const lip = [[X.podFront + 0.25, 0], [X.podFront - 0.02, 0.02], [X.podFront - 0.05, 0.12], [X.podFront + 0.05, 0.2], [X.podFront + 0.3, 0.2]];
    const lipRings = lip.map(([x, g]) => Array.from({ length: N }, (_, k) => { const [y, z] = sq(k, N, g); return [x, y, z]; }));
    both('Sidepod_Inlet_Lip', 'Body_Sidepods', gridMesh(lipRings, true, () => [X.podFront + 2, yc, zc]), 'carbon', [-2.4, 1.8, 0.4], FN.inlet);
    const duct = xsr(X.podFront + 0.25, X.podFront + 1.6, 0.27).map((x, i, a) => Array.from({ length: N }, (_, k) => { const s = 1 - 0.25 * i / (a.length - 1); const [y, z] = sq(k, N, 0); return [x, yc + (y - yc) * s, zc + (z - zc) * s]; }));
    both('Sidepod_InletDuct', 'Body_Sidepods', gridMesh(duct, true, (p) => [p[0], yc + 3, zc]), 'dark', [-1.6, 1.8, 0.4], FN.inlet);
    // front lower face: from the mouth bottom down to the undercut start
    const fr = tsr(0, 1, 6).map((v) => tsr(2.05, 3.6, 12).map((t) => { const [y, z] = podSection(P, t); const zt = z0 - 0.2; const zz = Math.min(z, lerp(zt, z, v)); return [X.podFront + 0.02, lerp(y0 - 0.1, y, Math.max(v, 0)), zz]; }));
    both('Sidepod_Front_Face', 'Body_Sidepods', gridMesh(fr, false, (p) => [p[0] + 3, p[1], p[2]]), 'paint', [-2.0, 2.6, -0.4], FN.front);
  }

  // cockpit side (knee) panel: vertical slab outside the tub rim, top rising into the ridge front
  { const x0 = 7.6, x1 = X.podFront + 0.3, rings = xsr(x0, x1, 0.25).map((x) => { const k = sstep(x, x0, x1);
      const zt = lerp(5.05, 5.5, k), zb = lerp(3.2, 2.6, k), yo = lerp(2.55, 2.9, k);
      return tsr(0, 1, 10).map((v) => { const z = lerp(zt, zb, v); const bulge = 0.18 * Math.sin(Math.PI * v); return [x, yo + bulge - (v < 0.08 ? 0.3 * (1 - v / 0.08) : 0), z]; }); });
    both('Cockpit_Side_Panel', 'Body_Cockpit_Sides', gridMesh(rings, false, (p) => [p[0], 0, p[2]]), 'paint', [0, 3.0, 0.8], FN.knee); }

  // ---- engine cover: spine + side panels ------------------------------------------------
  const spineProf = (S, n) => tsr(-1, 1, n).map((u) => { const th = u * Math.PI / 2, e = 0.55; // superellipse cap
    return [S.ws * Math.sign(Math.sin(th)) * Math.pow(Math.abs(Math.sin(th)), e), S.ze + (S.zs - S.ze) * Math.pow(Math.cos(th), 0.7)]; });
  const spine = xsr(X.coverFront, X.coverEnd, 0.25).map((x) => spineProf(spineAt(x), 16).map(([y, z]) => [x, y, z]));
  push('EngineCover_Spine', 'Body_Top_Engine_Cover', gridMesh(spine, false, (p) => [p[0], 0, p[2] - 2]), 'paint', [0, 0, 5.5], FN.spine);
  // side panel: from spine edge (ws, ze) falling, convex, to the ridge inboard edge (yIn, zIn)
  const sideRings = xsr(X.coverFront, X.coverEnd, 0.25).map((x) => { const S = spineAt(x), P = podAt(x);
    return tsr(0, 1, 12).map((v) => { const y = lerp(S.ws, P.yIn + 0.05, v), z = lerp(S.ze, P.zIn, Math.pow(v, 1.7)); return [x, y, z]; }); });
  both('EngineCover_SidePanel', 'Body_Top_Engine_Cover', gridMesh(sideRings, false, (p) => [p[0], 0, p[2] - 2]), 'paint', [0, 2.4, 4.2], FN.coverSide);
  // pod top filler between cockpit rim and cover front (X 9.7-16.2): the ridge already starts at yIn,
  // so only the strip from the tub rim (2.35) to yIn under the headrest is closed here (part of the cockpit side panel family)
  // airbox surround collar: superellipse ring around the pillar, lower ends sinking into the spine
  { const AB = [{ x: 16.5, zc: 8.4, hw: 1.12, hh: 1.05 }, { x: 17.5, zc: 8.35, hw: 1.2, hh: 1.05 }, { x: 18.5, zc: 8.25, hw: 1.07, hh: 0.9 }, { x: 19.6, zc: 8.05, hw: 0.8, hh: 0.6 }, { x: 20.6, zc: 7.6, hw: 0.45, hh: 0.3 }];
    const A = sampler(AB);
    const rings = xsr(16.5, 20.6, 0.25).map((x) => { const a = A(x), S = spineAt(x);
      return tsr(-1, 1, 18).map((u) => { const th = u * Math.PI / 2, y = a.hw * Math.sign(Math.sin(th)) * Math.pow(Math.abs(Math.sin(th)), 0.4);
        const ztop = a.zc + a.hh * Math.pow(Math.cos(th), 0.4); const zlow = S.zs - 0.25 - 0.4 * Math.abs(u);
        return [x, y, lerp(zlow, ztop, Math.pow(Math.cos(th), 0.25))]; }); });
    push('Airbox_Surround', 'Body_Top_Engine_Cover', gridMesh(rings, false, (p) => [p[0], 0, p[2] - 1.2]), 'paint', [0, 0, 7.5], FN.airbox); }

  // tail cap: closes the cover section at X 34.4 and rounds it off to the exhaust
  { const S = spineAt(X.coverEnd), P = podAt(X.coverEnd), x0 = X.coverEnd;
    const ring = [];
    spineProf(S, 16).forEach(([y, z]) => ring.push([y, z]));
    tsr(0, 1, 8).forEach((v, i) => { if (i) ring.push([lerp(S.ws, P.yIn, v), lerp(S.ze, P.zIn, Math.pow(v, 1.7))]); });
    ring.push([P.yIn * 0.8, 2.6], [0, 2.4], [-P.yIn * 0.8, 2.6]);
    tsr(0, 1, 8).reverse().forEach((v, i) => { if (i < 8) ring.push([-lerp(S.ws, P.yIn, v), lerp(S.ze, P.zIn, Math.pow(v, 1.7))]); });
    const cz = 3.6, ex = 0.5;
    const rings = tsr(0, 1, 8).map((t) => ring.map(([y, z]) => { const s = 1 - 0.55 * Math.pow(t, 1.5); return [x0 + 1.4 * Math.sin(t * Math.PI / 2), y * Math.max(s, ex / 2.2), cz + (z - cz) * s]; }));
    push('Body_Rear_TailCap', 'Body_Rear', gridMesh(rings, true, (p) => [x0 - 1, 0, cz]), 'paint', [3.5, 0, 1.8], FN.tail);
    const exr = tsr(0, 1, 3).map((t) => Array.from({ length: 24 }, (_, k) => { const th = k / 24 * Math.PI * 2, r = lerp(0.62, 0.42, t); return [x0 + 1.25 + 0.2 * t, r * Math.cos(th), cz + 0.05 + r * Math.sin(th)]; }));
    push('Body_Rear_HotAirExit', 'Body_Rear', gridMesh(exr, true, (p) => [p[0] - 2, 0, cz]), 'dark', [4.2, 0, 1.8], FN.tail); }

  // ---- ORACLE plates (GLB only): patch of the ridge outer face, tilted 10 deg ------------
  if (opts.logoPlates) {
    const tilt = 10 * Math.PI / 180, xc = 16.0, tc = 1.72, L = 6.4, Hh = 0.32; // t units across the section
    const rings = tsr(-0.5, 0.5, 20).map((a) => tsr(-0.5, 0.5, 4).map((b) => {
      const x = xc + a * L * Math.cos(tilt), t = tc + b * Hh * 2 + a * L * Math.sin(tilt) * 0.12; // rises toward the nose
      const P = podAt(x), [y, z] = podSection(P, clamp(t, 1.05, 1.98)); return [x, y + 0.012, z + 0.006]; }));
    both('Sidepod_ORACLE_Plate', 'Livery_Zones', gridMesh(rings, false, podIn), 'logo', [0, 2.3, 3.0], FN.logo);
  }
  return out;
}
