/**
 * rbr_bull.js: "Der Bulle vom Spielberg", the steel bull sculpture on the hill above Turns 7 and 8 at the Red Bull Ring.
 * Clemens Neugebauer and Martin Kölldorfer, 2012. 17.2 m tall with the arch, the bull 14.6 m. The bull's skin is about
 * 1700 welded Corten steel plates with open gaps (weathered rust colour) on a steel skeleton, the horns are gold leaf on
 * cast aluminium (7 m tip to tip), and the arch is 20 segments of cast aluminium (clemensneugebauer.at, steiermark.com).
 * Shape follows public photos (Wikimedia Commons, see cad/track/RED_BULL_RING_PLAN.md): standing charging pose, head
 * low, horns forward, front left leg stepping forward, hind legs pushing back, tail hanging, arch over its middle.
 *
 * Built from lofted tubes (smooth normals) with a cut-out plate texture, no logo. Units: metres, built at the origin,
 * +X = the way the bull faces, +Y up. The caller scales by DM and places it.
 */
import * as THREE from 'three';

// ------------------------------------------------------------------ Catmull-Rom helpers
function crPoint(p0, p1, p2, p3, t) {
  const t2 = t * t, t3 = t2 * t;
  return 0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
}
/** resample keyframes (arrays of numbers per key) with Catmull-Rom, `per` samples per key interval */
function resample(keys, per) {
  const out = [], n = keys.length;
  for (let k = 0; k < n - 1; k++) {
    const a = keys[Math.max(0, k - 1)], b = keys[k], c = keys[k + 1], d = keys[Math.min(n - 1, k + 2)];
    for (let s = 0; s < per; s++) { const t = s / per; out.push(b.map((_, j) => crPoint(a[j], b[j], c[j], d[j], t))); }
  }
  out.push(keys[n - 1].slice());
  return out;
}

/**
 * Lofted tube. rows: [x, y, z, halfWidth(side), halfHeightTop, halfHeightBottom, exponent]. The cross-section is a
 * superellipse in the plane normal to the spine, with "side" = the horizontal direction across the spine.
 * Ends are closed with a fan. UV: u = distance along the spine / tile, v = distance around / tile.
 */
function loft(rows, seg, { tile = 4, capStart = true, capEnd = true, sideHint = null } = {}) {
  const pos = [], uv = [], idx = [];
  const n = rows.length;
  let along = 0;
  const P = r => new THREE.Vector3(r[0], r[1], r[2]);
  for (let i = 0; i < n; i++) {
    const r = rows[i];
    const a = P(rows[Math.max(0, i - 1)]), b = P(rows[Math.min(n - 1, i + 1)]);
    const T = b.sub(a).normalize();
    let side = sideHint ? sideHint.clone() : new THREE.Vector3(0, 0, 1);
    if (Math.abs(side.dot(T)) > 0.95) side = new THREE.Vector3(1, 0, 0);
    side.addScaledVector(T, -side.dot(T)).normalize();
    const up = new THREE.Vector3().crossVectors(side, T).normalize();
    if (up.y < 0 && !sideHint) up.negate();
    if (i > 0) along += P(r).distanceTo(P(rows[i - 1]));
    const [x, y, z, w, ht, hb, e] = r;
    let around = 0, prev = null;
    for (let j = 0; j <= seg; j++) {
      const th = (j / seg) * Math.PI * 2;
      const c = Math.cos(th), s = Math.sin(th);
      const sx = Math.sign(c) * Math.pow(Math.abs(c), 2 / e), sy = Math.sign(s) * Math.pow(Math.abs(s), 2 / e);
      const h = sy >= 0 ? ht : hb;
      const p = new THREE.Vector3(x, y, z).addScaledVector(side, sx * w).addScaledVector(up, sy * h);
      if (prev) around += p.distanceTo(prev);
      prev = p;
      pos.push(p.x, p.y, p.z); uv.push(along / tile, around / tile);
    }
  }
  const rowLen = seg + 1;
  for (let i = 0; i < n - 1; i++) for (let j = 0; j < seg; j++) {
    const a = i * rowLen + j, b = a + 1, c = a + rowLen, d = c + 1;
    idx.push(a, c, b, b, c, d);
  }
  const cap = (i, flip) => {
    const r = rows[i], ci = pos.length / 3;
    pos.push(r[0], r[1], r[2]); uv.push(0.5, 0.5);
    for (let j = 0; j < seg; j++) { const a = i * rowLen + j, b = a + 1; flip ? idx.push(ci, a, b) : idx.push(ci, b, a); }
  };
  if (capStart) cap(0, false);
  if (capEnd) cap(n - 1, true);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** round tapered tube through joints [x, y, z, radius] */
function limb(joints, per = 6, seg = 14, opts = {}) {
  const rows = resample(joints, per).map(([x, y, z, r, rr]) => [x, y, z, r, rr ?? r, rr ?? r, 2.2]);
  return loft(rows, seg, opts);
}

// ------------------------------------------------------------------ plate texture: welded Corten plates with open gaps
function plateTextures() {
  const S = 512, cv = document.createElement('canvas'); cv.width = cv.height = S;
  const ctx = cv.getContext('2d');
  const av = document.createElement('canvas'); av.width = av.height = S;
  const actx = av.getContext('2d');
  // jittered grid seeds, tiled (copies around the edges so the pattern repeats without seams)
  let seed = 9; const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  const G = 7, cell = S / G, pts = [];
  for (let i = 0; i < G; i++) { pts.push([]); for (let j = 0; j < G; j++) pts[i].push([(i + 0.15 + 0.7 * rnd()) * cell, (j + 0.15 + 0.7 * rnd()) * cell]); }
  // per-pixel nearest / second nearest seed (3 x 3 neighbouring cells, wrapped) -> plate web between holes
  const img = ctx.createImageData(S, S), aimg = actx.createImageData(S, S);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    let d1 = 1e9, d2 = 1e9, k1 = 0;
    const ci = Math.floor(x / cell), cj = Math.floor(y / cell);
    for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) {
      const ii = (ci + a + G) % G, jj = (cj + b + G) % G;
      const px = pts[ii][jj][0] + (ci + a - ii) * cell, py = pts[ii][jj][1] + (cj + b - jj) * cell;
      const d = (px - x) ** 2 + (py - y) ** 2;
      if (d < d1) { d2 = d1; d1 = d; k1 = ii * G + jj; } else if (d < d2) d2 = d;
    }
    const edge = Math.sqrt(d2) - Math.sqrt(d1);           // distance to the cell border (px)
    const cellR = Math.sqrt(d1);
    const solid = edge < 9 + 5 * Math.sin(k1 * 1.7) || cellR < 6; // web of steel strips, holes in the cell middles
    const o = (y * S + x) * 4;
    const n = Math.sin(x * 0.31 + y * 0.17) * 0.5 + Math.sin(x * 0.07 - y * 0.11 + k1) * 0.5;
    const shade = 0.82 + 0.18 * n * 0.5 + (edge < 2 ? -0.25 : 0);   // weld seams darker
    const base = [118, 58, 32];                                    // weathered Corten
    img.data[o] = base[0] * shade + 20 * Math.sin(k1); img.data[o + 1] = base[1] * shade; img.data[o + 2] = base[2] * shade; img.data[o + 3] = 255;
    const al = solid ? 255 : 0;
    aimg.data[o] = aimg.data[o + 1] = aimg.data[o + 2] = al; aimg.data[o + 3] = 255;
  }
  ctx.putImageData(img, 0, 0); actx.putImageData(aimg, 0, 0);
  const map = new THREE.CanvasTexture(cv), alpha = new THREE.CanvasTexture(av);
  for (const t of [map, alpha]) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4; }
  map.colorSpace = THREE.SRGBColorSpace;
  return { map, alpha };
}

// ------------------------------------------------------------------ the sculpture
export function buildBullSculpture() {
  const group = new THREE.Group(); group.name = 'RBR_Landmark_Bull';
  const tx = typeof document !== 'undefined' ? plateTextures() : null;
  const skin = new THREE.MeshStandardMaterial({
    color: tx ? 0xffffff : 0x7a3d22, map: tx?.map ?? null, alphaMap: tx?.alpha ?? null, alphaTest: 0.5,
    roughness: 0.85, metalness: 0.25, side: THREE.DoubleSide,
  });
  const inner = new THREE.MeshStandardMaterial({ color: 0x2a1a12, roughness: 0.9, metalness: 0.2, side: THREE.BackSide });
  const gold = new THREE.MeshStandardMaterial({ color: 0xe0b23a, roughness: 0.25, metalness: 1.0 });
  const alu = new THREE.MeshStandardMaterial({ color: 0xa9adb1, roughness: 0.55, metalness: 0.6, flatShading: true });
  const steel = new THREE.MeshStandardMaterial({ color: 0x3b2a20, roughness: 0.8, metalness: 0.4 });

  // --- body: rump -> haunch -> ribs -> shoulder hump -> neck -> head -> muzzle
  // [x, y, z, halfWidth, halfHeightTop, halfHeightBottom, exponent]
  const bodyKeys = [
    [-7.25, 7.55, 0, 0.55, 0.55, 0.6, 2.0],
    [-7.05, 7.55, 0, 1.6, 1.25, 1.7, 2.4],
    [-6.3, 7.45, 0, 2.25, 1.65, 2.25, 2.6],
    [-5.2, 7.35, 0, 2.45, 1.75, 2.45, 2.6],   // haunches
    [-3.6, 7.25, 0, 2.3, 1.75, 2.35, 2.4],    // flank
    [-1.8, 7.3, 0, 2.5, 1.95, 2.6, 2.4],      // ribs
    [0.2, 7.55, 0, 2.75, 2.35, 2.75, 2.5],
    [1.8, 7.9, 0, 2.85, 2.85, 2.8, 2.6],      // shoulders, hump top about 10.8 m
    [3.2, 7.55, 0, 2.5, 2.75, 2.65, 2.6],     // neck base, dewlap below
    [4.35, 6.75, 0, 1.95, 2.1, 2.3, 2.5],     // thick neck going down
    [5.3, 5.85, 0, 1.45, 1.55, 1.7, 2.3],     // poll / forehead
    [6.15, 5.05, 0, 1.15, 1.1, 1.25, 2.3],    // face
    [6.85, 4.45, 0, 0.95, 0.75, 0.85, 2.2],   // muzzle
    [7.2, 4.15, 0, 0.75, 0.55, 0.6, 2.2],
    [7.32, 4.05, 0, 0.3, 0.25, 0.3, 2.0],
  ];
  const bodyRows = resample(bodyKeys, 5);
  // muscle bulges on the shoulders and haunches (wider at mid height)
  for (const r of bodyRows) {
    const sh = Math.exp(-(((r[0] - 2.0) / 1.3) ** 2)), hq = Math.exp(-(((r[0] + 5.3) / 1.0) ** 2));
    r[3] *= 1 + 0.07 * sh + 0.05 * hq;
  }
  const body = loft(bodyRows, 30, { tile: 3.2 });

  // --- legs [x, y, z, radius]: shoulder / hip inside the body down to the hoof
  const legs = [
    // front left, stepping forward
    [[2.2, 7.4, 1.45, 1.45], [2.5, 5.6, 1.5, 1.05], [2.9, 4.3, 1.45, 0.72], [3.45, 2.45, 1.4, 0.5], [3.8, 0.85, 1.35, 0.4], [3.95, 0.25, 1.35, 0.5]],
    // front right, under the body
    [[2.0, 7.4, -1.45, 1.45], [1.8, 5.6, -1.5, 1.05], [1.6, 4.3, -1.45, 0.72], [1.35, 2.45, -1.4, 0.5], [1.15, 0.85, -1.35, 0.4], [1.15, 0.25, -1.35, 0.5]],
    // hind left, pushing back
    [[-5.2, 8.0, 1.55, 1.7], [-4.5, 5.9, 1.65, 1.25], [-4.6, 4.4, 1.55, 0.78], [-6.1, 2.55, 1.45, 0.48], [-6.7, 0.85, 1.4, 0.38], [-6.85, 0.25, 1.4, 0.48]],
    // hind right, under
    [[-5.2, 8.0, -1.55, 1.7], [-4.2, 5.9, -1.65, 1.25], [-4.0, 4.4, -1.55, 0.78], [-5.0, 2.55, -1.45, 0.48], [-4.8, 0.85, -1.4, 0.38], [-4.75, 0.25, -1.4, 0.48]],
  ];
  const legGeos = legs.map(j => limb(j, 6, 16, { tile: 3.2 }));
  const hooves = legs.map(j => {
    const h = j[j.length - 1];
    const g = new THREE.CylinderGeometry(0.42, 0.55, 0.5, 12); g.translate(h[0] + 0.05, 0.25, h[2]); return g;
  });

  // --- tail: from the top of the rump, hanging down, tuft at the end
  const tail = limb([[-6.9, 8.9, 0, 0.32], [-7.6, 8.2, 0.05, 0.24], [-7.9, 6.6, 0.12, 0.17], [-7.85, 4.6, 0.2, 0.14], [-7.7, 3.4, 0.25, 0.2], [-7.6, 2.8, 0.25, 0.36], [-7.55, 2.3, 0.25, 0.1]], 6, 10, { tile: 3.2 });

  // --- ears (flattened lobes) and horns (gold, 7 m tip to tip, curving out then forward and up)
  const ears = [-1, 1].map(s => limb([[5.15, 6.6, s * 1.05, 0.12], [5.0, 6.75, s * 1.7, 0.32], [4.95, 6.7, s * 2.25, 0.22], [4.95, 6.6, s * 2.55, 0.05]], 4, 10, { tile: 3.2 }));
  const horns = [-1, 1].map(s => limb([
    [5.55, 6.85, s * 0.75, 0.42], [5.75, 7.05, s * 1.55, 0.38], [6.25, 7.15, s * 2.4, 0.31],
    [7.1, 7.15, s * 3.05, 0.22], [8.1, 7.35, s * 3.4, 0.12], [8.9, 7.75, s * 3.5, 0.025],
  ], 8, 12));

  const bullGeo = [body, ...legGeos, tail, ...ears];
  for (const g of bullGeo) {
    const m = new THREE.Mesh(g, skin); m.castShadow = true; m.receiveShadow = true; group.add(m);
    const back = new THREE.Mesh(g, inner); back.scale.setScalar(0.995); group.add(back);  // dark inside seen through the gaps
  }
  // inner steel skeleton: spine and ribs, visible through the gaps
  {
    const sk = [limb(bodyKeys.slice(1, 12).map(k => [k[0], k[1] + k[4] * 0.55, 0, 0.18]), 4, 8)];
    for (let x = -5.5; x <= 3.5; x += 1.5) {
      const k = bodyRows.reduce((b, r) => (Math.abs(r[0] - x) < Math.abs(b[0] - x) ? r : b));
      const w = k[3] * 0.85, ht = k[4] * 0.85, hb = k[5] * 0.85;
      const ring = [];
      for (let a = 0; a <= 16; a++) { const th = (a / 16) * Math.PI * 2; ring.push([x, k[1] + Math.sin(th) * (Math.sin(th) > 0 ? ht : hb), Math.cos(th) * w, 0.09]); }
      sk.push(limb(ring, 2, 6));
    }
    for (const g of sk) group.add(new THREE.Mesh(g, steel));
  }
  for (const g of hooves) { const m = new THREE.Mesh(g, steel); m.castShadow = true; group.add(m); }
  for (const g of horns) { const m = new THREE.Mesh(g, gold); m.castShadow = true; group.add(m); }

  // --- arch: 20 cast aluminium segments, faceted section, standing across the bull's middle, 17.2 m high
  {
    const H = 17.2, A = 9.6, N = 120, xA = 0.4;
    const rows = [];
    for (let i = 0; i <= N; i++) {
      const ph = -Math.PI / 2 + Math.PI * i / N;
      const sz = Math.sign(Math.sin(ph)) * Math.pow(Math.abs(Math.sin(ph)), 0.85) * A;
      const y = H * Math.pow(Math.cos(ph), 0.62) - 0.9 * Math.sin(Math.abs(ph)) ** 6;
      const seam = Math.abs(((i / N) * 20) % 1 - 0.5) > 0.47 ? 0.92 : 1;   // groove at each of the 20 segment joints
      const thick = 1 + 0.45 * Math.abs(Math.sin(ph)) ** 3;                // feet a little heavier
      rows.push([xA, Math.max(-0.4, y - 0.7), sz, 0.75 * seam * thick, 0.62 * seam * thick, 0.62 * seam * thick, 1.6]);
    }
    const arch = loft(rows, 6, { tile: 3, sideHint: new THREE.Vector3(1, 0, 0) });
    const m = new THREE.Mesh(arch, alu); m.castShadow = true; m.receiveShadow = true; group.add(m);
    for (const s of [-1, 1]) {                                            // concrete footings
      const f = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.6, 2.6), new THREE.MeshStandardMaterial({ color: 0x9a9890, roughness: 0.9 }));
      f.position.set(xA, 0.0, s * A); group.add(f);
    }
  }
  group.userData.dims = { length: 14.6, height: 17.2 };
  return group;
}
