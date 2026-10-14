/**
 * body_pieces_v5.js — main body built as separate panels (like the real car's part list:
 * Body_Sidepods, Body_Radiators, Body_Top_Engine_Cover, Body_Rear, Knee_Protection).
 * Every panel is its own mesh with its own shape, sized from BODY_V5 (body_pieces_v5_spec.js),
 * and carries userData { removable, explode, function } for the garage and the exploded view.
 */
import * as THREE from 'three';
import { BODY_V5 } from './body_pieces_v5_spec.js';
import { AIRBOX_SPEC } from './active_wings_bodywork.js';

const lerp = THREE.MathUtils.lerp;
const sgnPow = (v, p) => Math.sign(v) * Math.pow(Math.abs(v), p);

function sampler(table) {
  const keys = Object.keys(table[0]).filter((k) => k !== 'x');
  return (x) => {
    let i = 0;
    while (i < table.length - 2 && x > table[i + 1].x) i++;
    const p1 = table[i], p2 = table[i + 1], p0 = table[Math.max(0, i - 1)], p3 = table[Math.min(table.length - 1, i + 2)];
    const t = THREE.MathUtils.clamp((x - p1.x) / (p2.x - p1.x), 0, 1), t2 = t * t, t3 = t2 * t;
    const o = { x };
    keys.forEach((k) => { const a = p0[k], b = p1[k], c = p2[k], d = p3[k]; o[k] = 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3); });
    return o;
  };
}
const cbez = (a, c1, c2, b, t) => { const u = 1 - t; return [0, 1].map((k) => u * u * u * a[k] + 3 * u * u * t * c1[k] + 3 * u * t * t * c2[k] + t * t * t * b[k]); };
const qbez = (a, c, b, t) => [0, 1].map((k) => (1 - t) * (1 - t) * a[k] + 2 * (1 - t) * t * c[k] + t * t * b[k]);

/** Grid geometry from rings of [x,y,z]; `outward` = a point the normals should face away from (per ring: fn(ring) -> [y,z]). */
function grid(rings, closed, insideFn) {
  const rows = rings.length, cols = rings[0].length, pos = [], uv = [], idx = [];
  rings.forEach((r, i) => r.forEach((p, j) => { pos.push(...p); uv.push(i / (rows - 1), j / Math.max(1, cols - (closed ? 0 : 1))); }));
  const jm = closed ? cols : cols - 1;
  // winding test on the middle ring
  const mi = Math.floor((rows - 1) / 2), mj = Math.floor(jm / 2);
  const P = (i, j) => new THREE.Vector3(...rings[i][j % cols]);
  const n = new THREE.Vector3().crossVectors(P(mi, mj + 1).sub(P(mi, mj)), P(mi + 1, mj).sub(P(mi, mj)));
  const ins = insideFn(rings[mi]); const p = P(mi, mj);
  const flip = n.dot(new THREE.Vector3(0, p.y - ins[0], p.z - ins[1])) < 0;
  for (let i = 0; i < rows - 1; i++) for (let j = 0; j < jm; j++) {
    const a = i * cols + j, b = i * cols + (j + 1) % cols, c = (i + 1) * cols + (j + 1) % cols, d = (i + 1) * cols + j;
    if (flip) idx.push(a, c, b, a, d, c); else idx.push(a, b, c, a, c, d);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals();
  g.userData.quadGrid = { rows, cols, closed };
  return g;
}
function fan(ring, center, towardX) {
  const pos = [...center], idx = []; ring.forEach((p) => pos.push(...p));
  for (let j = 0; j < ring.length; j++) idx.push(0, 1 + j, 1 + (j + 1) % ring.length);
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  if (Math.sign(g.attributes.normal.getX(0)) !== Math.sign(towardX)) { g.setIndex(idx.map((v, k) => (k % 3 === 1 ? idx[k + 1] : k % 3 === 2 ? idx[k - 1] : v))); g.computeVertexNormals(); }
  return g;
}
const xs = (x0, x1, step) => { const n = Math.max(2, Math.round((x1 - x0) / step)); return Array.from({ length: n + 1 }, (_, i) => lerp(x0, x1, i / n)); };

export function createBodyPiecesV5({ paint, carbon, dark, spec = BODY_V5 } = {}) {
  const S = spec;
  const body = new THREE.Group(); body.name = 'Body_Main_V5';
  const pieces = [];
  const darkMat = dark || new THREE.MeshStandardMaterial({ color: 0x050607, roughness: 0.95, side: THREE.DoubleSide });
  const add = (parent, geo, mat, name, info, side = 0) => {
    const m = new THREE.Mesh(geo, mat); m.name = name; m.castShadow = m.receiveShadow = true;
    const e = info.explode || [0, 0, 0];
    m.userData = { removable: true, function: info.function, explode: [e[0], side ? side * e[1] : e[1], e[2]] };
    parent.add(m); pieces.push(m); return m;
  };
  const R = sampler(S.ridge.spline), Pd = sampler(S.pod), C = sampler(S.cover.stations);
  const xR0 = S.ridge.spline[0].x, xR1 = S.ridge.spline[S.ridge.spline.length - 1].x;
  const coverX0 = S.cover.stations[0].x;
  // side-panel surface height at |y| (concave fall from spine edge to base)
  const sideZ = (c, y) => { const t = THREE.MathUtils.clamp((Math.abs(y) - c.ws) / (c.w - c.ws), 0, 1); return lerp(c.ze, c.zb, 1 - Math.pow(1 - t, 1.8)); };
  // pod inboard join: cockpit rim at the front, tucked under the cover side panel further back
  const podAt = (x) => {
    const P = Pd(x);
    if (x > coverX0 - 1.0) {
      const k = THREE.MathUtils.smoothstep(x, coverX0 - 1.0, coverX0 + 0.6), c = C(Math.max(x, coverX0));
      const yJ = c.w - 0.3; P.yIn = lerp(P.yIn, yJ, k); P.zIn = lerp(P.zIn, sideZ(c, yJ) - 0.06, k);
    }
    return P;
  };
  const arc = (r, a, k = 1) => [r.y + r.r * k * Math.cos(a), r.z + r.r * k * Math.sin(a)];
  const A_CREASE = -1.35, A_TOP = 2.15;

  // ---- sidepods (per side) --------------------------------------------------------------
  const pods = new THREE.Group(); pods.name = 'Body_Sidepods';
  const rads = new THREE.Group(); rads.name = 'Body_Radiators';
  // profile builders return [y,z] lists for one station
  const flankProf = (r, P) => {
    const c = arc(r, A_CREASE, 0.94), out = r.y + r.r * 0.55 + P.bulge, f = [r.y + r.r * 0.25, P.zFl];
    return Array.from({ length: 9 }, (_, k) => cbez(c, [out, c[1] - 0.15], [out, lerp(c[1], P.zFl, 0.7)], f, k / 8));
  };
  const underProf = (r, P) => {
    const f = [r.y + r.r * 0.25, P.zFl], b = [P.yUc, Math.max(S.floorZ + 0.04, P.zBot)];
    return Array.from({ length: 9 }, (_, k) => cbez(f, [lerp(f[0], b[0], 0.55), f[1] - 0.05], [b[0] + 0.05, lerp(b[1], f[1], 0.75)], b, k / 8));
  };
  const topProf = (r, P) => {
    const a = arc(r, A_TOP, 0.94), e = [P.yIn, P.zIn];
    return Array.from({ length: 9 }, (_, k) => qbez(a, [lerp(a[0], e[0], 0.5), Math.max(a[1], e[1]) + 0.05], e, k / 8));
  };
  const wallProf = (r, P) => { const zb = Math.max(S.floorZ + 0.04, P.zBot); return [[P.yIn, P.zIn], [P.yIn, lerp(P.zIn, zb, 0.5)], [P.yIn, zb], [lerp(P.yIn, P.yUc, 0.5), zb], [P.yUc + 0.02, zb]]; };
  const mk = (s, x0, x1, prof) => xs(x0, x1, S.step).map((x) => prof(R(x), podAt(x)).map(([y, z]) => [x, s * y, z]));
  const podCentre = (s) => (ring) => { const x = ring[0][0], r = R(x), P = podAt(x); return [s * (P.yIn + r.y) / 2, (r.z + Math.max(S.floorZ, P.zBot)) / 2]; };

  [1, -1].forEach((s) => {
    const tag = s > 0 ? 'LH' : 'RH';
    const g = new THREE.Group(); g.name = `Sidepod_${tag}`; pods.add(g);
    // Ridge: round tube swept along its spline, ends rounded off
    const rings = xs(xR0, xR1, S.step * 0.75).map((x) => {
      const r = R(x), endK = Math.min(1, Math.sqrt(Math.max(0, (x - xR0) / 0.35)), 1);
      const tail = Math.min(1, Math.sqrt(Math.max(0.02, (xR1 - x) / 0.35)));
      const rr = { ...r, r: r.r * Math.max(0.05, Math.min(endK, tail)) };
      return Array.from({ length: 24 }, (_, j) => { const [y, z] = arc(rr, (j / 24) * Math.PI * 2); return [x, s * y, z]; });
    });
    const ridge = add(g, grid(rings, true, (ring) => { const r = R(ring[0][0]); return [s * r.y, r.z]; }), paint, `Sidepod_Ridge_${tag}`, S.ridge, s);
    ridge.userData.ridge = S.ridge.spline.map((p) => ({ ...p, y: s * p.y }));
    const inside = podCentre(s);
    const flank = add(g, grid(mk(s, xR0, S.flank.xEnd + 0.1, flankProf), false, inside), paint, `Sidepod_Body_${tag}`, S.flank, s); // keeps the livery target name
    flank.userData.ridge = ridge.userData.ridge;
    add(g, grid(mk(s, xR0, S.undercut.xEnd + 0.1, underProf), false, inside), paint, `Sidepod_Undercut_Panel_${tag}`, S.undercut, s);
    add(g, grid(mk(s, xR0, xR1, topProf), false, inside), paint, `Sidepod_Top_Panel_${tag}`, S.sidepodTop, s);
    add(g, grid(mk(s, S.rearTaper.x0, xR1, (r, P) => [...flankProf(r, P), ...underProf(r, P).slice(1)]), false, inside), paint, `Sidepod_Rear_Taper_${tag}`, S.rearTaper, s);
    add(g, grid(mk(s, xR0, xR1, wallProf), false, (ring) => [s * (ring[0][1] * s + 1), ring[0][2]]), darkMat, `Sidepod_Inner_Wall_${tag}`, S.innerWall, s);
    // tail closure at X end
    { const x = xR1, r = R(x), P = podAt(x);
      const ring = [...flankProf(r, P), ...underProf(r, P).slice(1), ...wallProf(r, P).reverse().slice(1), ...topProf(r, P).reverse().slice(1)].map(([y, z]) => [x, s * y, z]);
      add(g, fan(ring, [x, s * (r.y + P.yIn) / 2, (r.z + P.zBot) / 2], 1), paint, `Sidepod_TailCap_${tag}`, S.rearTaper, s); }

    // Inlet: carbon bezel over the pod front with a rounded-square mouth, dark duct behind
    const M = S.inlet.mouth, x0 = xR0;
    const r0 = R(x0), P0 = podAt(x0);
    const outer = [...flankProf(r0, P0), ...underProf(r0, P0).slice(1), ...wallProf(r0, P0).reverse().slice(1), ...topProf(r0, P0).reverse().slice(1)];
    // ridge front face is the tube end; bezel covers the section below the tube
    const shape = new THREE.Shape(outer.map(([y, z]) => new THREE.Vector2(y, z)));
    const rr = M.r, hole = new THREE.Path();
    hole.moveTo(M.y0 + rr, M.z0); hole.lineTo(M.y1 - rr, M.z0); hole.quadraticCurveTo(M.y1, M.z0, M.y1, M.z0 + rr);
    hole.lineTo(M.y1, M.z1 - rr); hole.quadraticCurveTo(M.y1, M.z1, M.y1 - rr, M.z1); hole.lineTo(M.y0 + rr, M.z1);
    hole.quadraticCurveTo(M.y0, M.z1, M.y0, M.z1 - rr); hole.lineTo(M.y0, M.z0 + rr); hole.quadraticCurveTo(M.y0, M.z0, M.y0 + rr, M.z0);
    shape.holes.push(hole);
    const bez = new THREE.ExtrudeGeometry(shape, { depth: 0.12, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 2, curveSegments: 6 });
    // shape is in (y,z); map to car frame: X = x0 - extrude, Y = s*y, Z = z
    bez.applyMatrix4(new THREE.Matrix4().set(0, 0, -1, x0 + 0.06, s, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1));
    if (s < 0) { const ix = bez.index ? bez.index.array : null; if (ix) for (let k = 0; k < ix.length; k += 3) { const t = ix[k + 1]; ix[k + 1] = ix[k + 2]; ix[k + 2] = t; } }
    bez.computeVertexNormals();
    add(rads, bez, carbon, `Sidepod_Inlet_Lip_${tag}`, S.inlet, s);
    // duct: dark box behind the mouth to the radiator face
    const duct = new THREE.BoxGeometry(M.depth, M.y1 - M.y0 - 0.06, M.z1 - M.z0 - 0.06);
    duct.translate(x0 + M.depth / 2 + 0.05, s * (M.y0 + M.y1) / 2, (M.z0 + M.z1) / 2);
    const dm = new THREE.Mesh(duct, new THREE.MeshStandardMaterial({ color: 0x050607, roughness: 0.95, side: THREE.BackSide }));
    dm.name = `Sidepod_Inlet_Mouth_${tag}`; dm.userData = { removable: true, function: S.inlet.function, explode: [-1.5, s * 2.0, 0.3] }; rads.add(dm); pieces.push(dm);

    // Knee protection / cockpit side panel
    const K = S.kneeProtection;
    const kr = xs(K.x0, K.x1, 0.3).map((x) => Array.from({ length: 7 }, (_, j) => { const z = lerp(K.z0, K.z1, j / 6); const tubW = x < 9.2 ? lerp(2.38, 2.8, (x - 7.6) / 1.6) : lerp(2.8, 3.12, (x - 9.2) / 2); const y = Math.max(tubW, 3.33) + K.gap + 0.12 * Math.sin(Math.PI * j / 6); return [x, s * y, z]; }));
    add(g, grid(kr, false, () => [0, (K.z0 + K.z1) / 2]), paint, `Knee_Protection_Panel_${tag}`, K, s);
  });
  body.add(pods); body.add(rads);

  // ---- engine cover: spine + side panels ------------------------------------------------
  const ec = new THREE.Group(); ec.name = 'Body_Top_Engine_Cover';
  const cs = S.cover.stations, cx1 = cs[cs.length - 1].x;
  const spineProf = (c) => Array.from({ length: 21 }, (_, k) => { const t = Math.PI * k / 20; const y = (c.ws + 0.06) * sgnPow(Math.cos(t), 2 / 2.4); let z = c.ze - 0.1 + (c.zs - c.ze + 0.1) * Math.pow(Math.sin(t), 2 / 2.4); z -= 0.05 * (1 - Math.min(1, Math.abs(y) / 0.12)) * -1; return [y, z]; });
  const spineRings = xs(coverX0, cx1, S.step).map((x) => spineProf(C(x)).map(([y, z]) => [x, y, z]));
  const spine = add(ec, grid(spineRings, false, (ring) => [0, C(ring[0][0]).zb]), paint, 'EngineCover_Spine', S.cover.spine);
  // centre seam: thin dark strip along the crown
  const seam = new THREE.Mesh(grid(xs(coverX0 + 0.3, cx1, S.step).map((x) => { const c = C(x); return [[x, 0.035, c.zs + 0.006], [x, -0.035, c.zs + 0.006]]; }), false, () => [0, 0]), darkMat);
  seam.name = 'EngineCover_Spine_Seam'; spine.add(seam);
  [1, -1].forEach((s) => {
    const tag = s > 0 ? 'LH' : 'RH';
    const rings = xs(coverX0, cx1, S.step).map((x) => { const c = C(x); return Array.from({ length: 13 }, (_, k) => { const y = lerp(c.ws - 0.08, c.w, k / 12); return [x, s * y, sideZ(c, y)]; }); });
    const sp = add(ec, grid(rings, false, (ring) => [0, C(ring[0][0]).zb - 1]), paint, `EngineCover_SidePanel_${tag}`, S.cover.sidePanel, s);
    // hot-air gills: dark slots set into the side panel
    const O = S.cover.outlets;
    O.slots.forEach((x, k) => { const c = C(x), y = lerp(c.ws, c.w, 0.45), z = sideZ(c, y);
      const sl = new THREE.Mesh(new THREE.BoxGeometry(O.width, O.height, 0.06), darkMat);
      sl.position.set(x, s * (y + 0.02), z + 0.03); const nAng = Math.atan2(sideZ(c, y + 0.1) - sideZ(c, y - 0.1), 0.2);
      sl.rotation.set(s * (Math.PI / 2 + nAng), 0, 0); sl.name = `EngineCover_Outlet_${tag}_${k}`; sp.add(sl); });
  });
  // front closure behind the headrest
  { const c = C(coverX0), ring = [...spineProf(c).map(([y, z]) => [coverX0, y, z])];
    ring.push([coverX0, -c.w, c.zb], [coverX0, c.w, c.zb]);
    add(ec, fan(ring, [coverX0, 0, (c.zs + c.zb) / 2], -1), paint, 'EngineCover_FrontBulkheadCap', S.cover.spine); }
  body.add(ec);

  // ---- airbox surround -----------------------------------------------------------------
  { const ab = AIRBOX_SPEC.body;
    const rings = xs(16.4, 20.4, 0.25).map((x) => { let i = 0; while (i < ab.length - 2 && x > ab[i + 1].x) i++; const a = ab[i], b = ab[i + 1]; const t = THREE.MathUtils.clamp((x - a.x) / (b.x - a.x), 0, 1);
      const hw = lerp(a.hw, b.hw, t) + 0.12, zc = lerp(a.zc, b.zc, t), zlo = C(x).zs - 0.35, zhi = zc - 0.1;
      return Array.from({ length: 15 }, (_, k) => { const th = -Math.PI / 2 + Math.PI * k / 14; return [x, hw * Math.sin(th) * -1, lerp(zlo, zhi, Math.pow(Math.cos(th), 0.6))]; }); });
    const sur = add(body, grid(rings, false, (ring) => [0, ring[7][2] - 1]), paint, 'Airbox_Surround', S.airboxSurround); }

  // ---- tail cap with hot-air exit ---------------------------------------------------------
  { const rg = new THREE.Group(); rg.name = 'Body_Rear'; body.add(rg);
    const c = C(cx1); const end = [...spineProf(c).map(([y, z]) => [cx1, y, z]), ...Array.from({ length: 11 }, (_, k) => { const y = lerp(-c.ws, -c.w, k / 10); return [cx1, y, sideZ(c, y)]; }).reverse()];
    const ring = Array.from({ length: 28 }, (_, j) => { const th = (j / 28) * Math.PI * 2; return [cx1, 0.85 * Math.cos(th), 3.55 + 0.8 * Math.sin(th)]; });
    const tail = xs(0, 1, 0.125).map((t) => ring.map(([x, y, z]) => [x + t * 1.0, y * (1 - 0.35 * t * t), 3.55 + (z - 3.55) * (1 - 0.35 * t * t) + 0.1 * t]));
    add(rg, grid(tail, true, (r) => [0, 3.6]), paint, 'Body_Rear_TailCap', S.rear);
    const ex = new THREE.Mesh(new THREE.RingGeometry(0.42, 0.55, 28), darkMat); ex.rotation.y = Math.PI / 2; ex.position.set(cx1 + 1.01, 0, 3.75); ex.name = 'Body_Rear_HotAirExit'; rg.add(ex);
    void end; }

  body.userData.pieces = pieces;
  body.userData.spec = S;
  return body;
}

/** Exploded view / garage helpers. k = 0 assembled .. 1 fully apart. */
export function setBodyExplode(body, k) {
  (body?.userData.pieces || []).forEach((m) => { const e = m.userData.explode || [0, 0, 0]; m.position.set(e[0] * k, e[1] * k, e[2] * k); });
}
export function setBodyPieceVisible(body, name, visible) {
  const m = (body?.userData.pieces || []).find((p) => p.name === name); if (m) m.visible = visible; return !!m;
}
