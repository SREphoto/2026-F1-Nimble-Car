/**
 * sweep_section.js
 * Reusable sweeps for moulded carbon parts (halo, mirror stalks, roll-hoop blades).
 * A cross-section (superellipse, optionally aerofoil-biased) is swept along a centre line.
 * Width runs horizontally across the path, height is the other cross direction.
 * All sizes are data so other cars can reuse the same builder.
 */
import * as THREE from 'three';

const sgnPow = (v, p) => Math.sign(v) * Math.pow(Math.abs(v), p);

/**
 * Build the vertex ring for one section.
 * @param n   superellipse exponent (2 = ellipse, higher = squarer)
 * @param lead 0..1, moves thickness toward the 'width' leading side for an aerofoil look
 */
export function sectionRing(center, wDir, hDir, w, h, M, n = 2.4, lead = 0, out = []) {
  for (let j = 0; j < M; j++) {
    const a = (j / M) * Math.PI * 2;
    const c = Math.cos(a), s = Math.sin(a);
    let u = sgnPow(c, 2 / n), v = sgnPow(s, 2 / n);
    // aerofoil bias: thinner toward the +width side (trailing), fuller at -width (leading)
    if (lead) v *= 1 - lead * 0.6 * (u + 1) / 2;
    out.push(new THREE.Vector3().copy(center).addScaledVector(wDir, u * w / 2).addScaledVector(hDir, v * h / 2));
  }
  return out;
}

/**
 * Sweep along points. width(t), height(t) in dm, t 0..1 along the path.
 * opts: { samples, ring, n, lead, up, capStart, capEnd, flipWidth }
 * Returns BufferGeometry (indexed, normals computed).
 */
export function sweepGeometry(points, width, height, opts = {}) {
  const { samples = 64, ring = 20, n = 2.4, lead = 0, up = new THREE.Vector3(0, 0, 1), capStart = true, capEnd = true, widthHint = null } = opts;
  const curve = new THREE.CatmullRomCurve3(points.map((p) => (p.isVector3 ? p : new THREE.Vector3(...p))), false, 'centripetal');
  const verts = [], idx = [], centers = [];
  let prevW = null;
  for (let i = 0; i <= samples; i++) {
    const t = i / samples;
    const c = curve.getPoint(t), tg = curve.getTangent(t).normalize();
    let wDir = widthHint ? widthHint(t, tg, c).clone() : new THREE.Vector3().crossVectors(tg, up);
    if (wDir.lengthSq() < 1e-6) wDir = prevW ? prevW.clone() : new THREE.Vector3(1, 0, 0);
    wDir.addScaledVector(tg, -wDir.dot(tg)).normalize();
    if (prevW && wDir.dot(prevW) < 0) wDir.negate(); // no flips along the sweep
    prevW = wDir.clone();
    const hDir = new THREE.Vector3().crossVectors(wDir, tg).normalize();
    sectionRing(c, wDir, hDir, width(t), height(t), ring, n, lead).forEach((p) => verts.push(p.x, p.y, p.z));
    centers.push(c);
  }
  for (let i = 0; i < samples; i++) for (let j = 0; j < ring; j++) {
    const a = i * ring + j, b = i * ring + (j + 1) % ring, c2 = (i + 1) * ring + (j + 1) % ring, d = (i + 1) * ring + j;
    idx.push(a, b, c2, a, c2, d);
  }
  const cap = (i, flip) => {
    const ci = verts.length / 3; const c = centers[i]; verts.push(c.x, c.y, c.z);
    for (let j = 0; j < ring; j++) { const a = i * ring + j, b = i * ring + (j + 1) % ring; flip ? idx.push(ci, b, a) : idx.push(ci, a, b); }
  };
  if (capStart) cap(0, false);
  if (capEnd) cap(samples, true);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  g.setIndex(idx);
  orientOutward(g);
  g.computeVertexNormals();
  return g;
}

/** Flip winding if most faces point inward (signed volume test). */
export function orientOutward(g) {
  const p = g.attributes.position, ix = g.index.array;
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  let vol = 0;
  for (let k = 0; k < ix.length; k += 3) {
    a.fromBufferAttribute(p, ix[k]); b.fromBufferAttribute(p, ix[k + 1]); c.fromBufferAttribute(p, ix[k + 2]);
    vol += a.dot(b.clone().cross(c));
  }
  if (vol < 0) for (let k = 0; k < ix.length; k += 3) { const t = ix[k + 1]; ix[k + 1] = ix[k + 2]; ix[k + 2] = t; }
  return g;
}

/** Merge plain indexed geometries (position only) into one. */
export function mergeSimple(geos) {
  const pos = [], idx = []; let off = 0;
  geos.forEach((g) => {
    const p = g.attributes.position.array; for (let k = 0; k < p.length; k++) pos.push(p[k]);
    const ix = g.index.array; for (let k = 0; k < ix.length; k++) idx.push(ix[k] + off);
    off += g.attributes.position.count;
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx); g.computeVertexNormals();
  return g;
}

/**
 * Loft closed rings given by ringFn(station, v) -> [x,y,z], v 0..1 around the ring.
 * Returns geometry with optional caps at the first/last station.
 */
export function loftRings(stations, ringFn, M = 40, { capStart = false, capEnd = false } = {}) {
  const verts = [], idx = [];
  stations.forEach((st) => { for (let j = 0; j < M; j++) verts.push(...ringFn(st, j / M)); });
  for (let i = 0; i < stations.length - 1; i++) for (let j = 0; j < M; j++) {
    const a = i * M + j, b = i * M + (j + 1) % M, c = (i + 1) * M + (j + 1) % M, d = (i + 1) * M + j;
    idx.push(a, b, c, a, c, d);
  }
  const cap = (i, flip) => {
    let cx = 0, cy = 0, cz = 0; for (let j = 0; j < M; j++) { cx += verts[(i * M + j) * 3]; cy += verts[(i * M + j) * 3 + 1]; cz += verts[(i * M + j) * 3 + 2]; }
    const ci = verts.length / 3; verts.push(cx / M, cy / M, cz / M);
    for (let j = 0; j < M; j++) { const a = i * M + j, b = i * M + (j + 1) % M; flip ? idx.push(ci, b, a) : idx.push(ci, a, b); }
  };
  // make the side faces point away from each ring's centre
  {
    const i = Math.floor((stations.length - 1) / 2), j = Math.floor(M / 4);
    const P = (k) => new THREE.Vector3(verts[k * 3], verts[k * 3 + 1], verts[k * 3 + 2]);
    const a = P(i * M + j), b = P(i * M + (j + 1) % M), c = P((i + 1) * M + (j + 1) % M);
    let cx = new THREE.Vector3(); for (let q = 0; q < M; q++) cx.add(P(i * M + q)); cx.multiplyScalar(1 / M);
    const nrm = b.clone().sub(a).cross(c.clone().sub(a));
    if (nrm.dot(a.clone().sub(cx)) < 0) for (let k = 0; k < idx.length; k += 3) { const t = idx[k + 1]; idx[k + 1] = idx[k + 2]; idx[k + 2] = t; }
  }
  if (capStart) cap(0, true);
  if (capEnd) cap(stations.length - 1, false);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  g.setIndex(idx);
  if (capStart || capEnd) orientOutward(g);
  g.computeVertexNormals();
  return g;
}

/** Superellipse ring with separate upper/lower half heights and widths (egg / pear shapes). */
export function eggPoint(st, v) {
  const a = v * Math.PI * 2, c = Math.cos(a), s = Math.sin(a), n = st.n || 2.6;
  const up = s >= 0;
  const hw = up ? (st.hwTop ?? st.hw) : (st.hwBot ?? st.hw);
  const y = sgnPow(c, 2 / n) * hw;
  const z = st.zc + sgnPow(s, 2 / n) * (up ? st.hhTop : st.hhBot);
  return [st.x, y, z];
}
