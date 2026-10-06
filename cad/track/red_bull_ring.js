/**
 * red_bull_ring.js — full-scale procedural Red Bull Ring (Spielberg, Austria) circuit.
 * SREdesigns - Samuel R Erwin III
 *
 * Geometry is generated at runtime from cad/track/red_bull_ring_data.js which is baked from public data by
 * tools/track/build_red_bull_ring.py:
 *   - centreline, track widths and race line: TUMFTM racetrack-database (LGPL-3.0)
 *   - geo-reference, pit lane, pit building + grandstand footprints: OpenStreetMap contributors (ODbL)
 *   - elevation: EU-DEM v1.1 25 m (Copernicus) via OpenTopoData
 *
 * Units: the car model is built in DECIMETRES (1 scene unit = 0.1 m), so every metre value is multiplied by DM.
 * Frame: origin = front of the pole-position grid box, car facing -X, y = 0 at the origin.
 *
 * Performance: every repeated element is merged into a handful of BufferGeometries (one draw call per material),
 * fence posts/start-light pods use InstancedMesh, trees are InstancedMeshes grouped in spatial cells with THREE.LOD
 * (detailed / low-poly / hidden), grandstands use THREE.LOD (stepped tiers with crowd / plain block).
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { RED_BULL_RING as D } from './red_bull_ring_data.js';
import { makeTrackTextures, makeSignAtlas } from './track_textures.js';
import { buildBullSculpture } from './rbr_bull.js';
import { createPitStopStation } from '../pit_stop_crew.js';
import { RED_BULL_RING_STYLE as STYLE } from './styles/red_bull_ring_style.js';
import { makeAsphaltTextures, makeRubberTexture, makePatchTexture, kerbHeight, makeKerbTexture, makeSponsorTexture, makeConcreteTexture, makeTyreTopTexture, makeFenceTexture, frameParts } from './trackside.js';

export const DM = 10; // scene units per metre
const KERB_W = D.meta.kerb_w ?? 1.4; // FIA: 2 m kerbs at the Red Bull Ring
const POLE_SIDE = D.meta.pole_side === 'left' ? -1 : 1; // pole slot side of the grid (FIA: left)
const GRID_HALF = D.meta.grid_half_m ?? 2.6;

// ------------------------------------------------------------------------------------------------ helpers
function hash2(x, z) {
  const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453;
  return s - Math.floor(s);
}
function noise2(x, z) {
  const xi = Math.floor(x), zi = Math.floor(z), xf = x - xi, zf = z - zi;
  const u = xf * xf * (3 - 2 * xf), v = zf * zf * (3 - 2 * zf);
  const a = hash2(xi, zi), b = hash2(xi + 1, zi), c = hash2(xi, zi + 1), d = hash2(xi + 1, zi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function fbm(x, z) { return noise2(x, z) * 0.6 + noise2(x * 2.1, z * 2.1) * 0.3 + noise2(x * 4.3, z * 4.3) * 0.1; }
function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

/** Path of samples (metres) with tangents / right normals. Lateral offsets are measured to the RIGHT (+). */
export class Path {
  constructor(x, z, y, closed) {
    this.n = x.length; this.closed = closed;
    this.x = Float64Array.from(x); this.z = Float64Array.from(z); this.y = Float64Array.from(y);
    const n = this.n;
    this.tx = new Float64Array(n); this.tz = new Float64Array(n); this.s = new Float64Array(n + 1);
    for (let i = 0; i < n; i++) {
      const a = closed ? (i - 1 + n) % n : Math.max(0, i - 1);
      const b = closed ? (i + 1) % n : Math.min(n - 1, i + 1);
      let dx = this.x[b] - this.x[a], dz = this.z[b] - this.z[a];
      const l = Math.hypot(dx, dz) || 1; this.tx[i] = dx / l; this.tz[i] = dz / l;
      if (i > 0) this.s[i] = this.s[i - 1] + Math.hypot(this.x[i] - this.x[i - 1], this.z[i] - this.z[i - 1]);
    }
    this.s[n] = this.s[n - 1] + (closed ? Math.hypot(this.x[0] - this.x[n - 1], this.z[0] - this.z[n - 1]) : 0);
    this.length = closed ? this.s[n] : this.s[n - 1];
  }
  rx(i) { return -this.tz[i]; }
  rz(i) { return this.tx[i]; }
  wrap(i) { return this.closed ? ((i % this.n) + this.n) % this.n : Math.max(0, Math.min(this.n - 1, i)); }
}

export class TrackPath extends Path {
  constructor(d) {
    super(d.x, d.z, d.y, true);
    this.d = d; this.pole = d.meta.pole_index; this.ds = this.length / this.n;
    this.wr = d.wr; this.wl = d.wl;
    // signed curvature (+ = right-hand corner)
    const n = this.n; this.k = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      const a = this.wrap(i - 3), b = this.wrap(i + 3);
      const cr = this.tx[a] * this.tz[b] - this.tz[a] * this.tx[b];
      this.k[i] = Math.asin(Math.max(-1, Math.min(1, cr))) / (6 * this.ds);
    }
  }
  _buildHash() {
    this.cell = 50; this.hash = new Map();
    for (let i = 0; i < this.n; i++) {
      const k = Math.floor(this.x[i] / this.cell) + ',' + Math.floor(this.z[i] / this.cell);
      if (!this.hash.has(k)) this.hash.set(k, []);
      this.hash.get(k).push(i);
    }
  }
  /** nearest sample within ~100 m, or null */
  nearestWithin(x, z) {
    if (!this.hash) this._buildHash();
    const cx = Math.floor(x / this.cell), cz = Math.floor(z / this.cell);
    let best = -1, bd = Infinity;
    for (let a = -2; a <= 2; a++) for (let b = -2; b <= 2; b++) {
      const l = this.hash.get((cx + a) + ',' + (cz + b)); if (!l) continue;
      for (const i of l) { const d = (this.x[i] - x) ** 2 + (this.z[i] - z) ** 2; if (d < bd) { bd = d; best = i; } }
    }
    return best < 0 ? null : { i: best, d: Math.sqrt(bd) };
  }
  /** distance-from-pole (m) -> fractional sample index */
  fIndex(sp) { return (((sp / this.ds) + this.pole) % this.n + this.n) % this.n; }
  spOf(i, a = 0) { return ((((i + a) - this.pole) % this.n + this.n) % this.n) * this.ds; }
  /** frame at distance sp from the pole box */
  at(sp) {
    const f = this.fIndex(sp), i0 = Math.floor(f), i1 = this.wrap(i0 + 1), a = f - i0;
    const tx = this.tx[i0] * (1 - a) + this.tx[i1] * a, tz = this.tz[i0] * (1 - a) + this.tz[i1] * a, l = Math.hypot(tx, tz);
    return {
      i: i0, a,
      x: this.x[i0] * (1 - a) + this.x[i1] * a, z: this.z[i0] * (1 - a) + this.z[i1] * a, y: this.y[i0] * (1 - a) + this.y[i1] * a,
      tx: tx / l, tz: tz / l, rx: -tz / l, rz: tx / l,
      wr: this.wr[i0] * (1 - a) + this.wr[i1] * a, wl: this.wl[i0] * (1 - a) + this.wl[i1] * a,
      barR: this.d.barR[i0], barL: this.d.barL[i0],
    };
  }
  /** nearest point on the centreline. hint = previous sample index (-1 = global search) */
  locate(x, z, hint = -1) {
    let best = -1, bd = Infinity;
    if (hint < 0) {
      const nw = this.nearestWithin(x, z);
      if (nw) { hint = nw.i; }
    }
    if (hint < 0) {
      for (let i = 0; i < this.n; i++) { const d = (this.x[i] - x) ** 2 + (this.z[i] - z) ** 2; if (d < bd) { bd = d; best = i; } }
    } else {
      for (let k = -40; k <= 40; k++) { const i = this.wrap(hint + k); const d = (this.x[i] - x) ** 2 + (this.z[i] - z) ** 2; if (d < bd) { bd = d; best = i; } }
    }
    // project on the segment ahead or behind
    let i0 = best, i1 = this.wrap(best + 1);
    let ex = this.x[i1] - this.x[i0], ez = this.z[i1] - this.z[i0];
    let a = ((x - this.x[i0]) * ex + (z - this.z[i0]) * ez) / (ex * ex + ez * ez);
    if (a < 0) { i1 = i0; i0 = this.wrap(best - 1); ex = this.x[i1] - this.x[i0]; ez = this.z[i1] - this.z[i0]; a = ((x - this.x[i0]) * ex + (z - this.z[i0]) * ez) / (ex * ex + ez * ez); }
    a = Math.max(0, Math.min(1, a));
    const px = this.x[i0] + ex * a, pz = this.z[i0] + ez * a;
    const sl = Math.hypot(ex, ez);
    const tx = ex / sl, tz = ez / sl;
    const lat = (x - px) * (-tz) + (z - pz) * tx;
    const y = this.y[i0] * (1 - a) + this.y[i1] * a;
    return { i: i0, a, lat, y, slope: (this.y[i1] - this.y[i0]) / sl, tx, tz, sp: this.spOf(i0, a), barR: this.d.barR[i0], barL: this.d.barL[i0], wr: this.wr[i0], wl: this.wl[i0] };
  }
}

/** Bilinear terrain height lookup (metres) */
export class Terrain {
  constructor(t) { Object.assign(this, t); }
  height(x, z) {
    const fx = (x - this.x0) / this.step, fz = (z - this.z0) / this.step;
    const ix = Math.max(0, Math.min(this.nx - 2, Math.floor(fx))), iz = Math.max(0, Math.min(this.nz - 2, Math.floor(fz)));
    const ax = Math.max(0, Math.min(1, fx - ix)), az = Math.max(0, Math.min(1, fz - iz));
    const H = this.h_;
    const a = H[iz * this.nx + ix], b = H[iz * this.nx + ix + 1], c = H[(iz + 1) * this.nx + ix], d = H[(iz + 1) * this.nx + ix + 1];
    return (a * (1 - ax) + b * ax) * (1 - az) + (c * (1 - ax) + d * ax) * az;
  }
}

// ------------------------------------------------------------------------------------------------ geometry builders
/**
 * Horizontal strip along a path between two lateral offsets. latA/latB/yA/yB are functions of the sample index.
 * mask(i) enables the segment i -> i+1. vLen = metres per texture repeat along the path; uLen = metres across.
 */
function strip(path, latA, latB, yA, yB, { mask = () => true, vLen = 10, uLen = null, uFixed = null } = {}) {
  const n = path.n, rows = path.closed ? n + 1 : n;
  const pos = new Float32Array(rows * 2 * 3), uv = new Float32Array(rows * 2 * 2);
  for (let r = 0; r < rows; r++) {
    const i = r % n, la = latA(i), lb = latB(i);
    const rx = path.rx(i), rz = path.rz(i);
    pos.set([(path.x[i] + rx * la) * DM, (path.y[i] + yA(i)) * DM, (path.z[i] + rz * la) * DM,
             (path.x[i] + rx * lb) * DM, (path.y[i] + yB(i)) * DM, (path.z[i] + rz * lb) * DM], r * 6);
    const v = path.s[r] / vLen;
    const u0 = uFixed ? uFixed[0] : (uLen ? la / uLen : 0), u1 = uFixed ? uFixed[1] : (uLen ? lb / uLen : 1);
    uv.set([u0, v, u1, v], r * 4);
  }
  const idx = [];
  const segs = path.closed ? n : n - 1;
  for (let i = 0; i < segs; i++) {
    if (!mask(i) || !mask(path.wrap(i + 1))) continue;
    const a = i * 2, b = a + 1, c = a + 2, d = a + 3;
    idx.push(a, b, c, b, d, c);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}
/** Vertical strip (wall face / fence / tyre wall) at lateral offset lat(i) between heights y0..y1 above the path */
function wallStrip(path, lat, y0, y1, opts = {}) {
  return strip(path, lat, lat, y0, y1, opts);
}

/** Accumulates arbitrary quads (4 corners in metres) into one geometry */
class QuadBatch {
  constructor() { this.p = []; this.uv = []; this.idx = []; this.n = 0; }
  add(c, uvRect = [0, 0, 1, 1]) { // c = [[x,y,z] x4] in order: bl, br, tr, tl
    for (const v of c) this.p.push(v[0] * DM, v[1] * DM, v[2] * DM);
    const [u0, v0, u1, v1] = uvRect;
    this.uv.push(u0, v0, u1, v0, u1, v1, u0, v1);
    const b = this.n; this.idx.push(b, b + 1, b + 2, b, b + 2, b + 3); this.n += 4;
  }
  geometry() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    g.setIndex(this.idx); g.computeVertexNormals(); return g;
  }
}

/** Box geometry (metres) placed at centre c with yaw from forward vector (fx,fz) */
function boxAt(w, h, d, cx, cy, cz, fx = 1, fz = 0) {
  const g = new THREE.BoxGeometry(w * DM, h * DM, d * DM);
  const m = new THREE.Matrix4().makeRotationY(Math.atan2(-fz, fx));
  m.setPosition(cx * DM, cy * DM, cz * DM);
  g.applyMatrix4(m); return g;
}
function nonIndexed(gs) { return gs.map(g => (g.index ? g.toNonIndexed() : g)); }
function merge(gs) { const m = mergeGeometries(nonIndexed(gs).map(g => { g.deleteAttribute('uv'); if (!g.attributes.normal) g.computeVertexNormals(); return g; })); return m; }

// ------------------------------------------------------------------------------------------------ main builder
export function createRedBullRing() {
  const t0 = performance.now();
  const root = new THREE.Group();
  root.name = 'RedBullRing_Circuit';
  const tex = makeTrackTextures();
  const SURF = makeAsphaltTextures(STYLE.surface), KS = STYLE.kerbs, BS = STYLE.barriers, FS = STYLE.fence;
  const sponsorTex = makeSponsorTexture(BS), concreteTex = makeConcreteTexture(), fenceTex = makeFenceTexture();
  const atlas = makeSignAtlas(STYLE.barriers.sponsors.map(sp => ({ key: 'SP_' + sp.name.toUpperCase().replace(/\W/g, ''), text: sp.name, bg: sp.bg, fg: sp.fg, accent: sp.accent })));
  const track = new TrackPath(D);
  const terrain = new Terrain({ ...D.terrain, h_: D.terrain.h });
  const outerT = new Terrain({ ...D.outer, h_: D.outer.h });
  const pit = new Path(D.pit.x, D.pit.z, D.pit.y, false);
  const n = track.n;
  const wr = i => track.wr[i], wl = i => track.wl[i];
  const c = v => () => v;

  const M = {
    asphalt: new THREE.MeshStandardMaterial({ map: SURF.map, bumpMap: SURF.bump, bumpScale: 0.6, color: 0xffffff, roughness: STYLE.surface.dry.roughness, metalness: 0.0 }),
    rubber: new THREE.MeshStandardMaterial({ map: makeRubberTexture(STYLE.surface), transparent: true, depthWrite: false, vertexColors: true, roughness: 0.8, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2 }),
    patch: new THREE.MeshStandardMaterial({ map: makePatchTexture(STYLE.surface), transparent: true, depthWrite: false, roughness: 0.95, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }),
    kerbFlat: new THREE.MeshStandardMaterial({ map: makeKerbTexture(STYLE.kerbs, 'flat'), roughness: 0.6 }),
    kerbRaised: new THREE.MeshStandardMaterial({ map: makeKerbTexture(STYLE.kerbs, 'raised'), roughness: 0.55 }),
    kerbSaw: new THREE.MeshStandardMaterial({ map: makeKerbTexture(STYLE.kerbs, 'sawtooth'), roughness: 0.55 }),
    sponsor: new THREE.MeshStandardMaterial({ map: sponsorTex, roughness: 0.65, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2 }),
    wallConcrete: new THREE.MeshStandardMaterial({ map: concreteTex, roughness: 0.85 }),
    tyreTop: new THREE.MeshStandardMaterial({ map: makeTyreTopTexture(), roughness: 0.95 }),
    tecpro: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6 }),
    runoff: new THREE.MeshStandardMaterial({ map: tex.runoff, roughness: 0.95, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 }),
    gravel: new THREE.MeshStandardMaterial({ map: tex.gravel, roughness: 1.0, polygonOffset: true, polygonOffsetFactor: 0, polygonOffsetUnits: 0 }),
    grass: new THREE.MeshLambertMaterial({ map: tex.grass, polygonOffset: true, polygonOffsetFactor: 2, polygonOffsetUnits: 3 }),
    line: new THREE.MeshStandardMaterial({ color: 0xf4f4f0, roughness: 0.6, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4 }),
    yellow: new THREE.MeshStandardMaterial({ color: 0xf2c200, roughness: 0.6, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4 }),
    kerb: new THREE.MeshStandardMaterial({ map: tex.kerb, roughness: 0.6, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2 }),
    kerbBlack: new THREE.MeshStandardMaterial({ color: 0x2b2d31, roughness: 0.8, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4 }),
    blue: new THREE.MeshStandardMaterial({ color: 0x5ab4e6, roughness: 0.6, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -6 }),
    sausage: new THREE.MeshStandardMaterial({ color: 0xf2c200, roughness: 0.55 }),
    chequer: new THREE.MeshStandardMaterial({ map: tex.chequer, roughness: 0.6, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -6 }),
    concrete: new THREE.MeshStandardMaterial({ color: 0xc9ccd0, roughness: 0.85 }),
    concreteDark: new THREE.MeshStandardMaterial({ color: 0x8d9197, roughness: 0.9 }),
    steel: new THREE.MeshStandardMaterial({ color: 0x9aa3ad, roughness: 0.45, metalness: 0.7 }),
    fence: new THREE.MeshStandardMaterial({ map: fenceTex, alphaToCoverage: true, alphaTest: 0.04, side: THREE.DoubleSide, roughness: 0.5, metalness: 0.6 }),
    cable: new THREE.MeshStandardMaterial({ color: 0x8d949b, roughness: 0.4, metalness: 0.8, side: THREE.DoubleSide }),
    tyres: new THREE.MeshStandardMaterial({ map: tex.tyres, roughness: 0.95, side: THREE.DoubleSide }),
    crowd: new THREE.MeshLambertMaterial({ map: tex.crowd }),
    seats: new THREE.MeshLambertMaterial({ map: tex.seats }),
    garage: new THREE.MeshStandardMaterial({ map: tex.garage, roughness: 0.6 }),
    glass: new THREE.MeshStandardMaterial({ map: tex.glass, roughness: 0.15, metalness: 0.6 }),
    signs: new THREE.MeshBasicMaterial({ map: atlas.tex, side: THREE.FrontSide }),
    roof: new THREE.MeshStandardMaterial({ color: 0xe8eaee, roughness: 0.5, metalness: 0.2 }),
    terrain: new THREE.MeshLambertMaterial({ vertexColors: true, map: tex.grass }),
    outer: new THREE.MeshLambertMaterial({ vertexColors: true }),
    lightOff: new THREE.MeshBasicMaterial({ color: 0x2a0606 }),
  };
  const add = (geo, mat, name, { cast = false, receive = true } = {}) => {
    const m = new THREE.Mesh(geo, mat); m.name = name; m.castShadow = cast; m.receiveShadow = receive;
    m.matrixAutoUpdate = false; m.updateMatrix(); root.add(m); return m;
  };

  // ---------------------------------------------------------------- 1. track surface, lines, kerbs, run-off
  const kerb = D.kerb;
  const kerbR = D.kerbR || kerb, kerbL = D.kerbL || kerb;
  // painted details from the FIA notes: white line moved onto the kerb with a light-blue line behind it, sausage kerbs
  const feats = D.features || [];
  const inFeat = (type, side) => {
    const m = new Int8Array(n), on = new Float32Array(n);
    for (const f of feats) {
      if (f.type !== type || f.side !== side) continue;
      for (let sp = f.sp0; sp <= f.sp1; sp += track.ds * 0.5) { const i = Math.floor(track.fIndex(sp)); m[i] = 1; on[i] = f.onKerb || 0; }
    }
    return { m, on };
  };
  const blueR = inFeat('blueline', 'R'), blueL = inFeat('blueline', 'L');
  const sausR = inFeat('sausage', 'R'), sausL = inFeat('sausage', 'L');
  add(strip(track, i => -wl(i), wr, c(0), c(0), { vLen: 12, uLen: 12 }), M.asphalt, 'RBR_Asphalt');
  // racing line rubber (TUM race line): darker where cars brake and turn, streaky texture, faded edges
  {
    const R = new Path(D.raceline.x, D.raceline.z, D.raceline.x.map(() => 0), true), rn = R.n, RS = STYLE.surface.rubber;
    const kr = new Float32Array(rn);
    for (let j = 0; j < rn; j++) { const a = R.wrap(j - 3), b = R.wrap(j + 3); kr[j] = Math.abs(R.tx[a] * R.tz[b] - R.tz[a] * R.tx[b]); }
    const pos = [], col = [], uv = [], idx = [];
    let hint = -1;
    for (let r = 0; r <= rn; r++) {
      const j = r % rn; let km = 0; for (let q = 0; q < 28; q++) km = Math.max(km, kr[R.wrap(j + q)] * (1 - q / 40));
      const I = RS.darkest * (0.45 + 0.55 * Math.min(1, km / 0.06)) + RS.brakingBoost * Math.min(1, km / 0.06) * 0.3;
      const L = track.locate(R.x[j], R.z[j], hint); hint = L.i;
      for (const e of [-1, 1]) {
        const x = R.x[j] + R.rx(j) * e * RS.width / 2, z = R.z[j] + R.rz(j) * e * RS.width / 2;
        pos.push(x * DM, (L.y + 0.005) * DM, z * DM); col.push(1, 1, 1, Math.min(1, I)); uv.push(e < 0 ? 0 : 1, R.s[r] / 6);
      }
      if (r < rn) { const a = r * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 4));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
    // normals point down if the winding is reversed: make them all face up
    const nrm = g.attributes.normal; for (let k = 0; k < nrm.count; k++) if (nrm.getY(k) < 0) nrm.setXYZ(k, -nrm.getX(k), -nrm.getY(k), -nrm.getZ(k));
    add(g, M.rubber, 'RBR_Rubber_Line');
    M.rubber.side = THREE.DoubleSide;
  }
  // repair patches (decals) spread over the lap
  {
    const pr = rng(515), q = [], quv = [], qi = [];
    for (let k = 0; k < STYLE.surface.patches; k++) {
      const F = track.at(pr() * track.length), w = 2 + pr() * 4, l = 3 + pr() * 9, lat = (pr() * 2 - 1) * Math.max(0, Math.min(F.wr, F.wl) - w / 2 - 0.5);
      const b = q.length / 3;
      for (const [a, d, u, v] of [[-l / 2, -w / 2, 0, 0], [l / 2, -w / 2, 1, 0], [l / 2, w / 2, 1, 1], [-l / 2, w / 2, 0, 1]]) {
        const x = F.x + F.tx * a + F.rx * (lat + d), z = F.z + F.tz * a + F.rz * (lat + d);
        q.push(x * DM, (F.y + 0.003) * DM, z * DM); quv.push(u, v);
      }
      qi.push(b, b + 2, b + 1, b, b + 3, b + 2);
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(q, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(quv, 2)); g.setIndex(qi); g.computeVertexNormals();
    M.patch.side = THREE.DoubleSide; add(g, M.patch, 'RBR_Surface_Patches');
  }
  /** wet sheen: 0 = dry, 1 = damp (lower roughness, darker), for the Wet sheen button */
  root.userData.setWet = (w) => {
    const S = STYLE.surface;
    for (const m of [M.asphalt, M.runoff]) { m.roughness = S.dry.roughness + (S.wet.roughness - S.dry.roughness) * w; m.metalness = S.dry.metalness + (S.wet.metalness - S.dry.metalness) * w; m.color.setScalar(1 + (S.wet.darken - 1) * w); }
    M.asphalt.bumpScale = 0.6 * (1 - 0.6 * w);
  };
  // white track-limit lines (inside the asphalt edge); where the FIA moved the line onto the kerb it is drawn there instead
  const LW = 0.2;
  // kerb type per sample and side (style data): apex kerbs on the inside of a corner, exit kerbs on the outside
  const KTYPES = ['flat', 'raised', 'sawtooth'];
  const turnSpK = D.turns.map(ti => track.spOf(ti));
  const kerbTypeR = new Int8Array(n), kerbTypeL = new Int8Array(n);
  for (let i = 0; i < n; i++) {
    let kk = 0; for (let q = -10; q <= 10; q++) kk += track.k[track.wrap(i + q)];
    const sp = track.spOf(i);
    let tn = 0, bd = 140; turnSpK.forEach((t, k) => { const d = Math.abs(((sp - t + track.length * 1.5) % track.length) - track.length / 2); if (d < bd) { bd = d; tn = k + 1; } });
    const over = KS.perTurn[tn] || {};
    const inside = over.inside || KS.inside, outside = over.outside || KS.outside;
    kerbTypeR[i] = KTYPES.indexOf(kk > 0 ? inside : outside);
    kerbTypeL[i] = KTYPES.indexOf(kk > 0 ? outside : inside);
  }
  const kerbYR = (i, u) => kerbHeight(KS, KTYPES[kerbTypeR[i]], u) + 0.002, kerbYL = (i, u) => kerbHeight(KS, KTYPES[kerbTypeL[i]], u) + 0.002;
  const lines = [
    strip(track, i => -wl(i), i => -wl(i) + LW, c(0.004), c(0.004), { mask: i => !blueL.m[i] }),
    strip(track, i => wr(i) - LW, wr, c(0.004), c(0.004), { mask: i => !blueR.m[i] }),
    // moved white lines, on the kerb
    strip(track, i => wr(i) + blueR.on[i] - LW / 2, i => wr(i) + blueR.on[i] + LW / 2, i => kerbYR(i, blueR.on[i]) + 0.004, i => kerbYR(i, blueR.on[i]) + 0.004, { mask: i => blueR.m[i] }),
    strip(track, i => -wl(i) - blueL.on[i] - LW / 2, i => -wl(i) - blueL.on[i] + LW / 2, i => kerbYL(i, blueL.on[i]) + 0.004, i => kerbYL(i, blueL.on[i]) + 0.004, { mask: i => blueL.m[i] }),
  ];
  const blueGeo = [
    strip(track, i => wr(i) + blueR.on[i] + LW / 2, i => wr(i) + blueR.on[i] + LW / 2 + 0.15, i => kerbYR(i, blueR.on[i] + 0.2) + 0.004, i => kerbYR(i, blueR.on[i] + 0.3) + 0.004, { mask: i => blueR.m[i] }),
    strip(track, i => -wl(i) - blueL.on[i] - LW / 2 - 0.15, i => -wl(i) - blueL.on[i] - LW / 2, i => kerbYL(i, blueL.on[i] + 0.3) + 0.004, i => kerbYL(i, blueL.on[i] + 0.2) + 0.004, { mask: i => blueL.m[i] }),
  ];
  // the part of the kerb inside a moved white line is painted black (T9 / T10)
  const blackGeo = [
    strip(track, wr, i => wr(i) + blueR.on[i] - LW / 2, c(0.008), i => kerbYR(i, blueR.on[i]) + 0.003, { mask: i => blueR.m[i] && blueR.on[i] > 0.3 }),
    strip(track, i => -wl(i) - blueL.on[i] + LW / 2, i => -wl(i), i => kerbYL(i, blueL.on[i]) + 0.003, c(0.008), { mask: i => blueL.m[i] && blueL.on[i] > 0.3 }),
  ];
  // kerbs with real profiles (style data): flat, raised and sawtooth, 2 m wide; red / white blocks along the track
  {
    const matOf = { flat: M.kerbFlat, raised: M.kerbRaised, sawtooth: M.kerbSaw };
    KTYPES.forEach((t, ti) => {
      const P = KS.profiles[t], W = P[P.length - 1][0], g = [];
      for (let k = 1; k < P.length; k++) {
        const u0 = P[k - 1][0], u1 = P[k][0], h0 = P[k - 1][1], h1 = P[k][1];
        g.push(strip(track, i => wr(i) + u0, i => wr(i) + u1, c(h0), c(h1), { mask: i => kerbR[i] && kerbTypeR[i] === ti, vLen: 2 * KS.stripe, uFixed: [u0 / W, u1 / W] }));
        g.push(strip(track, i => -wl(i) - u1, i => -wl(i) - u0, c(h1), c(h0), { mask: i => kerbL[i] && kerbTypeL[i] === ti, vLen: 2 * KS.stripe, uFixed: [u1 / W, u0 / W] }));
      }
      // small outer face down to the ground
      g.push(wallStrip(track, i => wr(i) + W, c(P[P.length - 1][1]), c(-0.02), { mask: i => kerbR[i] && kerbTypeR[i] === ti, vLen: 2 * KS.stripe, uFixed: [1, 1] }));
      g.push(wallStrip(track, i => -wl(i) - W, c(-0.02), c(P[P.length - 1][1]), { mask: i => kerbL[i] && kerbTypeL[i] === ti, vLen: 2 * KS.stripe, uFixed: [1, 1] }));
      add(mergeGeometries(g), matOf[t], 'RBR_Kerbs_' + t, { receive: true });
    });
  }
  // yellow sausage kerbs just behind the T1 / T3 exit kerbs (ridge 0.5 m wide, 12 cm high)
  {
    const SA = KERB_W + 0.35, SB = SA + KS.sausage.width / 2, SC = SB + KS.sausage.width / 2, SH = KS.sausage.height;
    const g = [
      strip(track, i => wr(i) + SA, i => wr(i) + SB, c(0.03), c(SH), { mask: i => sausR.m[i] }),
      strip(track, i => wr(i) + SB, i => wr(i) + SC, c(SH), c(0.03), { mask: i => sausR.m[i] }),
      strip(track, i => -wl(i) - SB, i => -wl(i) - SA, c(SH), c(0.03), { mask: i => sausL.m[i] }),
      strip(track, i => -wl(i) - SC, i => -wl(i) - SB, c(0.03), c(SH), { mask: i => sausL.m[i] }),
    ];
    add(mergeGeometries(g.map(x => { x.deleteAttribute('uv'); return x; })), M.sausage, 'RBR_Kerbs_Sausage', { cast: true });
    /** kerb / sausage height (m) under a point found with track.locate: used by the drive mode so the car bumps over kerbs */
    root.userData.kerbAt = (L) => {
      const right = L.lat > 0, i = L.i, u = Math.abs(L.lat) - (right ? L.wr : L.wl);
      if (u < 0) return 0;
      let h = 0;
      if (right ? kerbR[i] : kerbL[i]) h = kerbHeight(KS, KTYPES[right ? kerbTypeR[i] : kerbTypeL[i]], u, L.sp || 0);
      if ((right ? sausR.m[i] : sausL.m[i]) && u > SA && u < SC) h = Math.max(h, SH * (1 - Math.abs(u - SB) / (SB - SA)));
      return h;
    };
  }
  add(mergeGeometries(blueGeo.map(g => { g.deleteAttribute('uv'); return g; })), M.blue, 'RBR_White_Lines_Blue');
  add(mergeGeometries(blackGeo.map(g => { g.deleteAttribute('uv'); return g; })), M.kerbBlack, 'RBR_Kerbs_Black');
  // asphalt run-off out to the OSM grass edge (starts at the asphalt edge, under the kerbs)
  const kR = i => wr(i) + KERB_W, kL = i => -wl(i) - KERB_W;
  const runR = i => kR(i) + D.runR[i], runL = i => kL(i) - D.runL[i];
  // gravel starts right behind the kerb (FIA 2024: T4, T6, and 2.5 m strips at the T9 / T10 exits)
  const gravR = i => kR(i) + D.gravR[i], gravL = i => kL(i) - D.gravL[i];
  const outR = i => Math.max(runR(i), gravR(i)), outL = i => Math.min(runL(i), gravL(i));
  add(mergeGeometries([
    strip(track, wr, runR, c(-0.012), c(-0.012), { mask: i => D.runR[i] > 0.05, vLen: 12, uLen: 12 }),
    strip(track, runL, i => -wl(i), c(-0.012), c(-0.012), { mask: i => D.runL[i] > 0.05, vLen: 12, uLen: 12 }),
  ]), M.runoff, 'RBR_Runoff_Asphalt');
  add(mergeGeometries([
    strip(track, kR, gravR, c(-0.004), c(-0.004), { mask: i => D.gravR[i] > 0.4, vLen: 8, uLen: 8 }),
    strip(track, gravL, kL, c(-0.004), c(-0.004), { mask: i => D.gravL[i] > 0.4, vLen: 8, uLen: 8 }),
  ]), M.gravel, 'RBR_Gravel_Traps');
  // grass verge from run-off/gravel out to 6 m beyond the barrier (blends into terrain)
  add(mergeGeometries([
    strip(track, outR, i => D.barR[i] + 6, c(-0.05), c(-0.2), { vLen: 10, uLen: 10 }),
    strip(track, i => -D.barL[i] - 6, outL, c(-0.2), c(-0.05), { vLen: 10, uLen: 10 }),
  ]), M.grass, 'RBR_Grass_Verge');

  // ---------------------------------------------------------------- 2. pit lane
  const PW = D.pit.w;
  // pit lane / main track overlap test (for barrier gaps)
  const nearPit = (x, z, r) => {
    for (let j = 0; j < pit.n; j += 1) { const dx = pit.x[j] - x, dz = pit.z[j] - z; if (dx * dx + dz * dz < r * r) return true; }
    return false;
  };
  const pitSide = []; // per pit sample: which side of the pit lane the main track is on (+1 right / -1 left)
  for (let j = 0; j < pit.n; j++) {
    const L = track.locate(pit.x[j], pit.z[j], -1);
    pitSide.push(L.lat > 0 ? -1 : 1); // pit is right of track => track is left of the pit lane
  }
  const bSide = pitSide[Math.floor(pit.n / 2)] * -1; // garages on the side away from the track
  add(mergeGeometries([
    strip(pit, c(-PW / 2), c(PW / 2), c(0.0), c(0.0), { vLen: 12, uLen: 12 }),
    // paddock apron between pit lane and garages
    strip(pit, bSide > 0 ? c(PW / 2) : c(-PW / 2 - 8), bSide > 0 ? c(PW / 2 + 8) : c(-PW / 2), c(-0.01), c(-0.01), { vLen: 12, uLen: 12 }),
  ]), M.asphalt, 'RBR_PitLane');
  lines.push(
    strip(pit, c(-PW / 2), c(-PW / 2 + 0.2), c(0.005), c(0.005)),
    strip(pit, c(PW / 2 - 0.2), c(PW / 2), c(0.005), c(0.005)),
    strip(pit, c(-0.1 + bSide * 1.0), c(0.1 + bSide * 1.0), c(0.005), c(0.005), { mask: i => Math.floor(pit.s[i] / 6) % 2 === 0 }),
  );

  // ---------------------------------------------------------------- 3. paint: start/finish, grid boxes, pit markings
  const paint = new QuadBatch(), yellowPaint = new QuadBatch();
  const quadOn = (batch, F, lat0, lat1, d0, d1, dy = 0.006) => {
    const P = (lat, d) => [F.x + F.rx * lat + F.tx * d, F.y + dy + 0.0, F.z + F.rz * lat + F.tz * d];
    batch.add([P(lat0, d0), P(lat1, d0), P(lat1, d1), P(lat0, d1)]);
  };
  // OSM start line + finish (control) line: 120 m apart here, the FIA gives a 126 m start / finish offset
  const START_SP = D.meta.start_sp ?? D.meta.pole_back_m + 1.6;  // white start line, 4 m ahead of the pole box
  const LINE_SP = D.meta.finish_sp ?? START_SP;                  // chequered finish / control line (lap timing)
  {
    const F = track.at(LINE_SP);
    const cq = new QuadBatch();
    const W = F.wl + F.wr;
    const P = (lat, d) => [F.x + F.rx * lat + F.tx * d, F.y + 0.008, F.z + F.rz * lat + F.tz * d];
    cq.add([P(-F.wl, -0.6), P(F.wr, -0.6), P(F.wr, 0.6), P(-F.wl, 0.6)], [0, 0, W / 4.8, 1]);
    add(cq.geometry(), M.chequer, 'RBR_StartFinish_Line');
  }
  // white start line across the track
  { const F = track.at(START_SP); quadOn(paint, F, -F.wl, F.wr, -0.15, 0.15); }
  // timing lines from the FIA circuit map: DRS detection / activation lines across the track, sector and speed-trap
  // lines as short ticks at both track edges
  for (const ln of (D.lines || [])) {
    const F = track.at(ln.sp);
    if (ln.kind === 'drsDet' || ln.kind === 'drsAct') quadOn(paint, F, -F.wl, F.wr, -0.1, 0.1);
    else if (ln.kind === 'sector' || ln.kind === 'trap') { quadOn(yellowPaint, F, -F.wl, -F.wl + 1.2, -0.1, 0.1); quadOn(yellowPaint, F, F.wr - 1.2, F.wr, -0.1, 0.1); }
  }
  const GRID = 22;
  for (let k = 0; k < GRID; k++) {
    const sp = -8 * k;
    const F = track.at(sp);
    const mid = (F.wr - F.wl) / 2;
    const cL = mid + (k % 2 === 0 ? POLE_SIDE : -POLE_SIDE) * GRID_HALF;   // pole (and odd places) on the left
    quadOn(paint, F, cL - 1.15, cL + 1.15, 1.3, 1.5);              // front bar (ahead of the front wing)
    quadOn(paint, F, cL - 1.15, cL - 0.98, 0, 1.5);                 // side ticks
    quadOn(paint, F, cL + 0.98, cL + 1.15, 0, 1.5);
  }
  // pit lane speed-limit lines + garage boxes
  const pitAt = (s) => {
    let j = 0; while (j < pit.n - 2 && pit.s[j + 1] < s) j++;
    const a = Math.max(0, Math.min(1, (s - pit.s[j]) / Math.max(1e-6, pit.s[j + 1] - pit.s[j])));
    return { x: pit.x[j] + (pit.x[j + 1] - pit.x[j]) * a, z: pit.z[j] + (pit.z[j + 1] - pit.z[j]) * a, y: pit.y[j],
      tx: pit.tx[j], tz: pit.tz[j], rx: -pit.tz[j], rz: pit.tx[j] };
  };
  const pitLen = pit.length;
  // garage boxes along the building
  const PB = D.pitBuilding;
  const pbAx = new THREE.Vector2(PB.ax[0], PB.ax[1]);
  // project building extents on the pit lane
  let pbS0 = Infinity, pbS1 = -Infinity;
  for (let j = 0; j < pit.n; j++) {
    const along = (pit.x[j] - PB.c[0]) * pbAx.x + (pit.z[j] - PB.c[1]) * pbAx.y;
    if (Math.abs(along) < PB.len / 2) { pbS0 = Math.min(pbS0, pit.s[j]); pbS1 = Math.max(pbS1, pit.s[j]); }
  }
  if (!isFinite(pbS0)) { pbS0 = pitLen * 0.3; pbS1 = pitLen * 0.7; }
  const boxes = 16; // boxes * 2 = 32 garage positions, as on the FIA pit lane drawing
  const boxS = [];
  for (let b = 0; b < boxes * 2; b++) {
    const s = pbS0 + 8 + (b + 0.5) * ((pbS1 - pbS0 - 16) / (boxes * 2));
    boxS.push(s);
    const F = pitAt(s);
    const l0 = bSide * (PW / 2 - 0.3), l1 = bSide * (PW / 2 - 5.2);
    quadOn(yellowPaint, F, Math.min(l0, l1), Math.min(l0, l1) + 0.15 + 0 * l1, -2.4, 2.4);
    quadOn(yellowPaint, F, Math.max(l0, l1) - 0.15, Math.max(l0, l1), -2.4, 2.4);
    quadOn(yellowPaint, F, Math.min(l0, l1), Math.max(l0, l1), 2.25, 2.4);
  }
  const pitLineIn = Math.max(5, pbS0 - 60), pitLineOut = Math.min(pitLen - 5, pbS1 + 60);
  for (const s of [pitLineIn, pitLineOut]) {
    const F = pitAt(s); quadOn(paint, F, -PW / 2, PW / 2, -0.3, 0.3);
  }
  // pit wall on the track side of the pit lane, wherever it does not stand on the track (open at the entry and exit)
  const pitWallJ = new Uint8Array(pit.n);
  {
    const wl = -bSide * (PW / 2 + 0.25);
    for (let j = 0; j < pit.n; j++) {
      const L = track.locate(pit.x[j] + pit.rx(j) * wl, pit.z[j] + pit.rz(j) * wl, -1);
      pitWallJ[j] = Math.abs(L.lat) > (L.lat > 0 ? L.wr : L.wl) + 1.2 ? 1 : 0;
    }
    // no short wall pieces: drop runs shorter than 20 m
    for (let j = 0; j < pit.n;) {
      if (!pitWallJ[j]) { j++; continue; }
      let k = j; while (k < pit.n && pitWallJ[k]) k++;
      if (pit.s[k - 1] - pit.s[j] < 20) for (let q = j; q < k; q++) pitWallJ[q] = 0;
      j = k;
    }
    const pm = j => pitWallJ[j];
    const lo = wl - 0.25, hi = wl + 0.25;
    add(mergeGeometries([
      wallStrip(pit, c(lo), c(-0.3), c(1.05), { mask: pm }),
      strip(pit, c(lo), c(hi), c(1.05), c(1.05), { mask: pm }),
      wallStrip(pit, c(hi), c(1.05), c(-0.3), { mask: pm }),
      wallStrip(pit, c(hi), c(-0.3), c(1.05), { mask: pm }),
      wallStrip(pit, c(lo), c(1.05), c(-0.3), { mask: pm }),
    ].map(g => { g.deleteAttribute('uv'); return g; })), M.concrete, 'RBR_Pit_Wall', { cast: true });
    add(mergeGeometries([
      wallStrip(pit, c(wl), c(1.05), c(3.6), { mask: pm, vLen: 1.6, uFixed: [0, 2.55 / 1.6] }),
    ]), M.fence, 'RBR_Pit_Wall_Fence', { receive: false });
  }
  root.userData.pitInfo = { PW, bSide, pbS0, pbS1, lineIn: pitLineIn, lineOut: pitLineOut, boxS, boxLat: bSide * (PW / 2 - 2.75), wallJ: pitWallJ, wallLat: -bSide * (PW / 2 + 0.25) };
  lines.push(paint.geometry());
  add(mergeGeometries(lines.map(g => { g.deleteAttribute('uv'); return g; })), M.line, 'RBR_White_Lines');
  add(yellowPaint.geometry(), M.yellow, 'RBR_Pit_Boxes');

  // ---------------------------------------------------------------- 3b. 3D pit stop station (crew, gantry, jacks, tyre warmers)
  const redBullBoxS = boxS.reduce((b, s) => (Math.abs(s - 463) < Math.abs(b - 463) ? s : b), boxS[0]);
  const pitStation = createPitStopStation({ teamId: 'red-bull' });
  const pbPt = pitAt(redBullBoxS);
  const pbLat = bSide * (PW / 2 - 2.75);
  // Pit box center in scene coordinates (multiplied by DM)
  pitStation.position.set(
    (pbPt.x + pbPt.rx * pbLat) * DM,
    pbPt.y * DM,
    (pbPt.z + pbPt.rz * pbLat) * DM
  );
  // Tangent = forward, Normal * (-bSide) = towards pit wall / positive Z
  const fwd = new THREE.Vector3(pbPt.tx, 0, pbPt.tz).normalize();
  const up = new THREE.Vector3(0, 1, 0);
  const lat = new THREE.Vector3(pbPt.rx * (-bSide), 0, pbPt.rz * (-bSide)).normalize();
  const stationBasis = new THREE.Matrix4().makeBasis(fwd, up, lat);
  pitStation.quaternion.setFromRotationMatrix(stationBasis);
  root.add(pitStation);
  root.userData.pitStation = pitStation;

  // ---------------------------------------------------------------- 4. barriers: concrete wall + debris fence + tyre walls
  const barRi = i => D.barR[i], barLi = i => -D.barL[i];
  const wallMaskR = new Uint8Array(n), wallMaskL = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    const xr = track.x[i] + track.rx(i) * D.barR[i], zr = track.z[i] + track.rz(i) * D.barR[i];
    const xl = track.x[i] - track.rx(i) * D.barL[i], zl = track.z[i] - track.rz(i) * D.barL[i];
    wallMaskR[i] = nearPit(xr, zr, PW / 2 - 0.3) ? 0 : 1;
    wallMaskL[i] = nearPit(xl, zl, PW / 2 - 0.3) ? 0 : 1;
  }
  const WH = BS.wallHeight, WT = 0.5, FH = FS.height;
  const mR = i => wallMaskR[i], mL = i => wallMaskL[i];
  // concrete walls: textured faces (panel joints, splash zone), plain top
  add(mergeGeometries([
    wallStrip(track, barRi, c(-0.3), c(WH), { mask: mR, vLen: 4, uFixed: [0, 1] }),
    wallStrip(track, i => barRi(i) + WT, c(WH), c(-0.3), { mask: mR, vLen: 4, uFixed: [1, 0] }),
    wallStrip(track, barLi, c(WH), c(-0.3), { mask: mL, vLen: 4, uFixed: [1, 0] }),
    wallStrip(track, i => barLi(i) - WT, c(-0.3), c(WH), { mask: mL, vLen: 4, uFixed: [0, 1] }),
  ]), M.wallConcrete, 'RBR_Concrete_Walls', { cast: false });
  add(mergeGeometries([
    strip(track, barRi, i => barRi(i) + WT, c(WH), c(WH), { mask: mR }),
    strip(track, i => barLi(i) - WT, barLi, c(WH), c(WH), { mask: mL }),
  ].map(g => { g.deleteAttribute('uv'); return g; })), M.concrete, 'RBR_Concrete_Wall_Tops', { cast: false });
  // tyre walls (OSM) in front of the concrete; TecPro-style blocks at the big stops (style data), belted tyres elsewhere
  const tyreMR = i => (D.tyreR ? D.tyreR[i] : D.gravR[i] > 2) && mR(i), tyreML = i => (D.tyreL ? D.tyreL[i] : D.gravL[i] > 2) && mL(i);
  const nearBigStop = new Uint8Array(n);
  for (let i = 0; i < n; i++) { const sp = track.spOf(i); nearBigStop[i] = (BS.tecproTurns || []).some(t => { const d = ((turnSpK[t - 1] - sp) % track.length + track.length) % track.length; return d < 40 || d > track.length - 160; }) ? 1 : 0; }
  const beltR = i => tyreMR(i) && !nearBigStop[i], beltL = i => tyreML(i) && !nearBigStop[i];
  // sponsor wraps: walls facing the track and the tyre-wall belts. Right-hand side runs the texture backwards so the
  // lettering reads left to right from the track on both sides.
  const wrapV = BS.wrapLength * BS.sponsors.length;
  add(mergeGeometries([
    wallStrip(track, i => barRi(i) - 0.02, c(0.12), c(WH - 0.08), { mask: i => mR(i) && !tyreMR(i), vLen: -wrapV, uFixed: [0, 1] }),
    wallStrip(track, i => barLi(i) + 0.02, c(0.12), c(WH - 0.08), { mask: i => mL(i) && !tyreML(i), vLen: wrapV, uFixed: [0, 1] }),
    wallStrip(track, i => barRi(i) - 0.72, c(0.02), c(1.0), { mask: beltR, vLen: -wrapV, uFixed: [0, 1] }),
    wallStrip(track, i => barLi(i) + 0.72, c(0.02), c(1.0), { mask: beltL, vLen: wrapV, uFixed: [0, 1] }),
  ]), M.sponsor, 'RBR_Sponsor_Wraps');
  add(mergeGeometries([
    strip(track, i => barRi(i) - 0.72, barRi, c(1.0), c(1.0), { mask: beltR, vLen: 1.0, uFixed: [0, 1] }),
    strip(track, barLi, i => barLi(i) + 0.72, c(1.0), c(1.0), { mask: beltL, vLen: 1.0, uFixed: [0, 1] }),
  ]), M.tyreTop, 'RBR_Tyre_Walls');
  {
    const T = BS.tecpro, mats = [], cols = [], m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), cc = new THREE.Color();
    const geo = new THREE.BoxGeometry(T.length * 0.96 * DM, T.height * DM, T.depth * DM); geo.translate(0, T.height / 2 * DM, 0);
    for (const side of [1, -1]) {
      let acc = 0, k = 0;
      for (let i = 0; i < n; i++) {
        acc += track.ds; if (acc < T.length) continue; acc = 0;
        if (!nearBigStop[i] || !(side > 0 ? tyreMR(i) : tyreML(i))) continue;
        const lat = side > 0 ? barRi(i) - T.depth / 2 - 0.05 : barLi(i) + T.depth / 2 + 0.05;
        q.setFromAxisAngle(up, Math.atan2(-track.tz[i], track.tx[i]));
        m4.compose(new THREE.Vector3((track.x[i] + track.rx(i) * lat) * DM, (track.y[i] - 0.02) * DM, (track.z[i] + track.rz(i) * lat) * DM), q, new THREE.Vector3(1, 1, 1));
        mats.push(m4.clone()); cols.push(cc.set(T.colors[k++ % T.colors.length]).clone());
      }
    }
    if (mats.length) {
      const inst = new THREE.InstancedMesh(geo, M.tecpro, mats.length);
      mats.forEach((m, k) => { inst.setMatrixAt(k, m); inst.setColorAt(k, cols[k]); });
      inst.name = 'RBR_TecPro'; inst.castShadow = true; inst.receiveShadow = true; inst.computeBoundingSphere(); root.add(inst);
    }
  }
  // debris catch fence on the walls: mesh panel, angled top section leaning toward the track, cables, posts
  {
    const ovx = FS.overhang * Math.cos(FS.overhangAngle), ovy = FS.overhang * Math.sin(FS.overhangAngle);
    const fR = i => barRi(i) + WT / 2, fL = i => barLi(i) - WT / 2, top = WH + FH, rep = 0.8;
    add(mergeGeometries([
      wallStrip(track, fR, c(WH), c(top), { mask: mR, vLen: rep, uFixed: [0, FH / rep] }),
      wallStrip(track, fL, c(top), c(WH), { mask: mL, vLen: rep, uFixed: [FH / rep, 0] }),
      strip(track, i => fR(i) - ovx, fR, c(top + ovy), c(top), { mask: mR, vLen: rep, uFixed: [FS.overhang / rep, 0] }),
      strip(track, fL, i => fL(i) + ovx, c(top), c(top + ovy), { mask: mL, vLen: rep, uFixed: [0, FS.overhang / rep] }),
    ]), M.fence, 'RBR_Debris_Fence', { receive: false });
    const cab = [];
    for (const h of FS.cables) {
      cab.push(wallStrip(track, fR, c(WH + h), c(WH + h + 0.025), { mask: mR }), wallStrip(track, fL, c(WH + h + 0.025), c(WH + h), { mask: mL }));
    }
    cab.push(wallStrip(track, i => fR(i) - ovx, c(top + ovy - 0.03), c(top + ovy), { mask: mR }), wallStrip(track, i => fL(i) + ovx, c(top + ovy), c(top + ovy - 0.03), { mask: mL }));
    add(mergeGeometries(cab.map(g => { g.deleteAttribute('uv'); return g; })), M.cable, 'RBR_Fence_Cables', { receive: false });
    // posts every postSpacing metres, with the bent top arm
    const postGeo = new THREE.BoxGeometry(0.1 * DM, (FH + 0.3) * DM, 0.1 * DM); postGeo.translate(0, (FH + 0.3) / 2 * DM, 0);
    const armGeo = new THREE.BoxGeometry(0.08 * DM, FS.overhang * DM, 0.08 * DM); armGeo.translate(0, FS.overhang / 2 * DM, 0);
    const mats = [], arms = [];
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
    let acc = 0;
    for (let i = 0; i < n; i++) {
      acc += track.ds; if (acc < FS.postSpacing) continue; acc = 0;
      for (const side of [1, -1]) {
        if (!(side > 0 ? mR(i) : mL(i))) continue;
        const lat = side > 0 ? fR(i) : fL(i);
        const x = (track.x[i] + track.rx(i) * lat) * DM, z = (track.z[i] + track.rz(i) * lat) * DM;
        m4.makeTranslation(x, (track.y[i] + WH - 0.3) * DM, z); mats.push(m4.clone());
        // arm: tilt from vertical toward the track (rotate about the track tangent)
        const yaw = Math.atan2(-track.tz[i], track.tx[i]);
        e.set(-side * (Math.PI / 2 - FS.overhangAngle), yaw, 0, 'YXZ'); q.setFromEuler(e);
        m4.compose(new THREE.Vector3(x, (track.y[i] + top) * DM, z), q, new THREE.Vector3(1, 1, 1)); arms.push(m4.clone());
      }
    }
    for (const [geo, list, name] of [[postGeo, mats, 'RBR_Fence_Posts'], [armGeo, arms, 'RBR_Fence_Arms']]) {
      const inst = new THREE.InstancedMesh(geo, M.steel, list.length);
      list.forEach((m, k) => inst.setMatrixAt(k, m));
      inst.name = name; inst.computeBoundingSphere(); root.add(inst);
    }
  }

  // ---------------------------------------------------------------- 5. terrain (inner 20 m grid + outer 100 m grid + far ridge ring)
  const forest = (x, z) => fbm(x / 420 + 11.3, z / 420 - 4.1);
  function terrainMesh(T, mat, name, { colorFn, skipBelow = -250, uv = true }) {
    const { nx, nz, x0, z0, step } = T;
    const pos = new Float32Array(nx * nz * 3), col = new Float32Array(nx * nz * 3), uvs = new Float32Array(nx * nz * 2);
    const cc = new THREE.Color();
    for (let iz = 0; iz < nz; iz++) for (let ix = 0; ix < nx; ix++) {
      const k = iz * nx + ix, x = x0 + ix * step, z = z0 + iz * step, h = T.h_[k];
      pos.set([x * DM, h * DM, z * DM], k * 3);
      colorFn(x, z, h, cc); col.set([cc.r, cc.g, cc.b], k * 3);
      uvs.set([x / 9, z / 9], k * 2);
    }
    const idx = [];
    for (let iz = 0; iz < nz - 1; iz++) for (let ix = 0; ix < nx - 1; ix++) {
      const a = iz * nx + ix, b = a + 1, c2 = a + nx, d = c2 + 1;
      if (T.h_[a] < skipBelow || T.h_[b] < skipBelow || T.h_[c2] < skipBelow || T.h_[d] < skipBelow) continue;
      idx.push(a, c2, b, b, c2, d);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    if (uv) g.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    g.setIndex(idx); g.computeVertexNormals();
    return add(g, mat, name);
  }
  const grassColor = (x, z, h, cc) => {
    const f = forest(x, z), v = fbm(x / 60, z / 60);
    cc.setRGB(0.55 + v * 0.25, 0.78 + v * 0.18, 0.45 + v * 0.15);
    if (f > 0.58) cc.multiplyScalar(0.72);
  };
  terrainMesh(terrain, M.terrain, 'RBR_Terrain', { colorFn: grassColor });
  terrainMesh(outerT, M.outer, 'RBR_Terrain_Outer', {
    uv: false,
    colorFn: (x, z, h, cc) => {
      const f = forest(x, z); const v = fbm(x / 300, z / 300);
      cc.setRGB(0.24 + v * 0.12, 0.42 + v * 0.12, 0.2 + v * 0.06);
      if (f > 0.5 || h > 120) cc.setRGB(0.12 + v * 0.05, 0.25 + v * 0.06, 0.12);
    },
  });
  // far mountain ring (Mur valley / Seckau Alps silhouette) — procedural, low poly
  {
    const seg = 160, rings = 7, R0 = 4300, R1 = 16000;
    const cx = outerT.x0 + (outerT.nx - 1) * outerT.step / 2, cz = outerT.z0 + (outerT.nz - 1) * outerT.step / 2;
    const pos = [], col = [], idx = [];
    for (let r = 0; r < rings; r++) {
      const t = r / (rings - 1), R = R0 + (R1 - R0) * t;
      for (let s = 0; s <= seg; s++) {
        const a = (s / seg) * Math.PI * 2;
        const x = cx + Math.cos(a) * R, z = cz + Math.sin(a) * R;
        const ridge = fbm(Math.cos(a) * 3 + 7, Math.sin(a) * 3 + r * 0.7);
        const h = r === 0 ? -20 : (150 + ridge * 1500) * Math.sin(Math.min(1, t * 1.6) * Math.PI / 2) * (r === rings - 1 ? 0.6 : 1);
        pos.push(x * DM, h * DM, z * DM);
        const snow = h > 1150 ? 1 : 0;
        col.push(snow ? 0.9 : 0.16 + ridge * 0.1, snow ? 0.92 : 0.27 + ridge * 0.08, snow ? 0.95 : 0.2 + ridge * 0.06);
      }
    }
    for (let r = 0; r < rings - 1; r++) for (let s = 0; s < seg; s++) {
      const a = r * (seg + 1) + s, b = a + 1, c2 = a + seg + 1, d = c2 + 1;
      idx.push(a, b, c2, b, d, c2);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    g.setIndex(idx); g.computeVertexNormals();
    add(g, M.outer, 'RBR_Far_Mountains', { receive: false });
  }

  // ---------------------------------------------------------------- 6. pit building
  {
    // put the garage front face 6 m behind the pit lane edge, facing the pit lane
    let nrm = new THREE.Vector2(-pbAx.y, pbAx.x);
    let best = Infinity, bj = 0;
    for (let j = 0; j < pit.n; j++) { const d = (pit.x[j] - PB.c[0]) ** 2 + (pit.z[j] - PB.c[1]) ** 2; if (d < best) { best = d; bj = j; } }
    const toPit = new THREE.Vector2(pit.x[bj] - PB.c[0], pit.z[bj] - PB.c[1]);
    if (nrm.dot(toPit) < 0) nrm.negate();
    const dep = Math.min(PB.dep, 24);
    const pitPt = new THREE.Vector2(pit.x[bj], pit.z[bj]);
    const front = pitPt.clone().addScaledVector(nrm, -(PW / 2 + 6)); // front-face centre
    const cen = front.clone().addScaledVector(nrm, -dep / 2);
    const y = pit.y[bj];
    const len = PB.len;
    const fx = pbAx.x, fz = pbAx.y;
    const g = new THREE.Group(); g.name = 'RBR_Pit_Building';
    const mk = (geo, mat, cast = true) => { const m = new THREE.Mesh(geo, mat); m.castShadow = cast; m.receiveShadow = true; g.add(m); return m; };
    // ground floor block (garages), 2 upper floors (glass), roof slab with overhang
    mk(boxAt(len, 6, dep, cen.x, y + 3, cen.y, fx, fz), M.concrete);
    mk(boxAt(len - 2, 7, dep - 4, cen.x - nrm.x * 1.5, y + 9.5, cen.y - nrm.y * 1.5, fx, fz), M.glass);
    mk(boxAt(len + 4, 0.8, dep + 6, cen.x + nrm.x * 1.5, y + 13.4, cen.y + nrm.y * 1.5, fx, fz), M.roof);
    // garage door facade (textured quad) on the pit-lane face
    const gq = new QuadBatch();
    const fa = front.clone().addScaledVector(nrm, 0.05);
    const P = (a, h) => [fa.x + fx * a, y + h, fa.y + fz * a];
    const reps = len / 24;
    // facade faces +nrm: order corners so the normal points to the pit lane
    const sgn = (fx * nrm.y - fz * nrm.x) > 0 ? 1 : -1;
    gq.add([P(-sgn * len / 2, 0), P(sgn * len / 2, 0), P(sgn * len / 2, 5.6), P(-sgn * len / 2, 5.6)], [0, 0, reps, 1]);
    mk(gq.geometry(), M.garage, false);
    root.add(g);
    root.userData.pitBuilding = { front, nrm, y, len, fx, fz, sgn };
  }

  // ---------------------------------------------------------------- 7. grandstands (LOD: stepped crowd tiers / plain block)
  for (const gs of D.grandstands) {
    const face = new THREE.Vector2(gs.face[0], gs.face[1]);
    const ax = new THREE.Vector2(-face.y, face.x);
    const len = gs.len, dep = Math.max(10, gs.dep);
    const ground = gs.y;
    const tiers = Math.max(6, Math.min(34, Math.floor(dep * 0.85 / 0.85)));
    const rise = Math.min(0.55, 15 / tiers), run = (dep * 0.85) / tiers, base = 2.2;
    const frontC = new THREE.Vector2(gs.c[0], gs.c[1]).addScaledVector(face, dep / 2);
    const P = (a, d, h) => { const p = frontC.clone().addScaledVector(ax, a).addScaledVector(face, -d); return [p.x, ground + h, p.y]; };
    const crowd = new QuadBatch(), struct = new QuadBatch();
    const uRep = len / 32;
    for (let j = 0; j < tiers; j++) {
      const d0 = j * run, d1 = (j + 1) * run, h0 = base + j * rise, h1 = h0 + rise;
      const v0 = j / 4, v1 = (j + 1) / 4;
      crowd.add([P(len / 2, d0, h0), P(-len / 2, d0, h0), P(-len / 2, d0, h1), P(len / 2, d0, h1)], [0, v0, uRep, (v0 + v1) / 2]); // riser
      crowd.add([P(len / 2, d0, h1), P(-len / 2, d0, h1), P(-len / 2, d1, h1), P(len / 2, d1, h1)], [0, (v0 + v1) / 2, uRep, v1]);  // tread
    }
    const top = base + tiers * rise, dBack = tiers * run;
    const sub = -6;
    struct.add([P(len / 2, 0, sub), P(-len / 2, 0, sub), P(-len / 2, 0, base), P(len / 2, 0, base)]);               // front wall
    struct.add([P(-len / 2, dBack, sub), P(len / 2, dBack, sub), P(len / 2, dBack, top + 1.2), P(-len / 2, dBack, top + 1.2)]); // back wall
    for (const e of [-1, 1]) {                                                                                      // end walls
      const a = e * len / 2;
      const q = e > 0 ? [P(a, dBack, sub), P(a, 0, sub), P(a, 0, base), P(a, dBack, top + 1.2)] : [P(a, 0, sub), P(a, dBack, sub), P(a, dBack, top + 1.2), P(a, 0, base)];
      struct.add(q);
    }
    const hasRoof = len > 100;
    const detailed = new THREE.Group();
    const mC = new THREE.Mesh(crowd.geometry(), M.crowd); mC.receiveShadow = true; detailed.add(mC);
    const sMat = M.concreteDark; sMat.side = THREE.DoubleSide;
    const mS = new THREE.Mesh(struct.geometry(), sMat); mS.castShadow = true; detailed.add(mS);
    const simple = new THREE.Group();
    const sq = new QuadBatch();
    sq.add([P(len / 2, 0, sub), P(-len / 2, 0, sub), P(-len / 2, 0, base), P(len / 2, 0, base)]);
    sq.add([P(len / 2, 0, base), P(-len / 2, 0, base), P(-len / 2, dBack, top), P(len / 2, dBack, top)], [0, 0, uRep, tiers / 4]);
    simple.add(new THREE.Mesh(sq.geometry(), M.crowd));
    if (hasRoof) {
      const rq = new QuadBatch();
      const rh = top + 5;
      rq.add([P(len / 2, dBack + 1, rh), P(-len / 2, dBack + 1, rh), P(-len / 2, dBack * 0.15, rh + 1.5), P(len / 2, dBack * 0.15, rh + 1.5)]);
      const roof = new THREE.Mesh(rq.geometry(), M.roof); M.roof.side = THREE.DoubleSide; roof.castShadow = true;
      detailed.add(roof); simple.add(roof.clone());
      // roof columns
      const cols = [];
      for (let a = -len / 2 + 4; a <= len / 2 - 4; a += 24) {
        const p = P(a, dBack + 0.5, 0);
        cols.push(boxAt(0.5, rh - 0.2, 0.5, p[0], ground + rh / 2, p[2]));
      }
      if (cols.length) detailed.add(new THREE.Mesh(merge(cols), M.steel));
    }
    const lod = new THREE.LOD();
    lod.name = 'RBR_Grandstand_' + gs.name;
    lod.addLevel(detailed, 0);
    lod.addLevel(simple, 9000);
    const cc = P(0, dBack / 2, top / 2);
    // LOD distance is measured from the object position -> keep geometry in world space and offset the LOD node
    detailed.position.set(-cc[0] * DM, -cc[1] * DM, -cc[2] * DM);
    simple.position.copy(detailed.position);
    lod.position.set(cc[0] * DM, cc[1] * DM, cc[2] * DM);
    root.add(lod);
    gs._front = frontC; gs._ax = ax; gs._face = face; gs._top = top; gs._ground = ground;
  }

  // ---------------------------------------------------------------- 8. start/finish gantry + start lights
  {
    const F = track.at(START_SP + 1.5);
    const latL = -F.wl - 2.2, latR = F.wr + 2.2, H = 7.5;
    const P = lat => [F.x + F.rx * lat, F.z + F.rz * lat];
    const parts = [];
    for (const lat of [latL, latR]) { const p = P(lat); parts.push(boxAt(0.9, H + 1.2, 0.9, p[0], F.y + (H + 1.2) / 2, p[1], F.tx, F.tz)); }
    const mid = P((latL + latR) / 2);
    const span = latR - latL;
    // beam runs across the track: its long axis is the right vector
    parts.push(boxAt(span + 0.9, 1.0, 1.1, mid[0], F.y + H, mid[1], F.rx, F.rz));
    parts.push(boxAt(span + 0.9, 0.25, 1.4, mid[0], F.y + H + 2.6, mid[1], F.rx, F.rz));
    const gm = new THREE.Mesh(merge(parts), M.steel); gm.castShadow = true; gm.name = 'RBR_Gantry'; root.add(gm);
    // 5 start-light pods x 2 rows (facing the grid = -tangent)
    const pod = new THREE.BoxGeometry(0.5 * DM, 1.6 * DM, 0.35 * DM);
    const lamp = new THREE.SphereGeometry(0.17 * DM, 10, 8);
    const podI = new THREE.InstancedMesh(pod, M.lightOff, 10), lampI = new THREE.InstancedMesh(lamp, new THREE.MeshBasicMaterial({ color: 0xff1a1a }), 20);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.atan2(-F.rz, F.rx));
    let pi = 0, li = 0;
    for (const off of [-1.6, 1.6]) for (let k = 0; k < 5; k++) {
      const lat = (latL + latR) / 2 + off + (k - 2) * 0.6 * 0 + (k - 2) * 0.62;
      const p = [F.x + F.rx * (lat) - F.tx * 0.7, F.y + H - 1.3, F.z + F.rz * (lat) - F.tz * 0.7];
      m4.compose(new THREE.Vector3(p[0] * DM, p[1] * DM, p[2] * DM), q, new THREE.Vector3(1, 1, 1)); podI.setMatrixAt(pi++, m4);
      for (const dy of [0.35, -0.35]) {
        m4.compose(new THREE.Vector3((p[0] - F.tx * 0.2) * DM, (p[1] + dy) * DM, (p[2] - F.tz * 0.2) * DM), q, new THREE.Vector3(1, 1, 1));
        lampI.setMatrixAt(li++, m4);
      }
    }
    podI.name = 'RBR_StartLights_Pods'; lampI.name = 'RBR_StartLights_Lamps';
    root.add(podI, lampI);
    root.userData.startLights = lampI;
    root.userData.gantry = { F, H, latL, latR };
  }

  // ---------------------------------------------------------------- 9. signage (single atlas texture, single draw call)
  const signs = new QuadBatch();
  const posts = [];
  /** board centred at (x,z) bottom at y0, facing horizontal direction (nx,nz) */
  const board = (key, x, z, y0, w, h, nx, nz, { post = true, back = true } = {}) => {
    const l = Math.hypot(nx, nz); nx /= l; nz /= l;
    const ax = -nz, az = nx; // right-hand along-board axis when looking at the face
    const P = (a, hh) => [x + ax * a * -1 + nx * 0.06, y0 + hh, z + az * a * -1 + nz * 0.06];
    signs.add([P(-w / 2, 0), P(w / 2, 0), P(w / 2, h), P(-w / 2, h)], atlas.uv[key]);
    if (back && !post) posts.push(boxAt(w + 0.1, h + 0.1, 0.1, x, y0 + h / 2, z, ax, az));
    if (post) posts.push(...frameParts(boxAt, { x, z, y0, w, h, ax: -ax, az: -az, nx, nz, ground: terrainBase(x, z) - 0.05 }));
  };
  const terrainBase = (x, z) => { const L = track.locate(x, z, -1); return Math.abs(L.lat) < Math.max(L.barR, L.barL) + 6 ? L.y : Math.min(L.y, terrain.height(x, z)); };
  // turn number boards (outside of each corner, behind the barrier)
  const turnSp = D.turns.map(i => track.spOf(i));
  root.userData.turns = [];
  D.turns.forEach((ti, k) => {
    const sp = turnSp[k];
    const F = track.at(sp - 25);
    const right = track.k[ti] > 0; // right-hander => outside on the left
    const out = right ? -1 : 1;
    const lat = out > 0 ? F.barR + 2.5 : -(F.barL + 2.5);
    const x = F.x + F.rx * lat, z = F.z + F.rz * lat;
    // face the approaching cars, angled towards the track
    const TB = STYLE.signs.turnBoard;
    board('T' + (k + 1), x, z, F.y + TB.bottom, TB.width, TB.height, -F.tx - F.rx * out * 0.8, -F.tz - F.rz * out * 0.8);
    root.userData.turns.push({ n: k + 1, sp, x: F.x, z: F.z, y: F.y, right });
    // braking distance boards (style data) on the outside of the approach, on their own frames
    const BB = STYLE.signs.brakingBoards;
    if (BB.turns.includes(k + 1)) {
      for (const dist of BB.distances) {
        const B = track.at(sp - 45 - dist);
        const bl = out > 0 ? B.wr + KERB_W + 1.6 : -(B.wl + KERB_W + 1.6);
        board('B' + dist, B.x + B.rx * bl, B.z + B.rz * bl, B.y + BB.bottom, BB.width, BB.height, -B.tx, -B.tz);
      }
    }
  });
  // hoardings on the debris fence along the main straight + key corners (text only)
  const hoard = ['RBR', ...STYLE.barriers.sponsors.map(sp => 'SP_' + sp.name.toUpperCase().replace(/\W/g, '')), 'SPIELBERG', 'GRANDPRIX', 'SRE'];
  let hk = 0;
  const hoardRange = (sp0, sp1, side, stepM = 26) => {
    for (let sp = sp0; sp < sp1; sp += stepM) {
      const F = track.at(sp);
      const iF = F.i;
      if (side > 0 ? !wallMaskR[iF] : !wallMaskL[iF]) continue;
      const lat = side > 0 ? F.barR + 0.1 : -(F.barL + 0.1);
      board(hoard[hk++ % hoard.length], F.x + F.rx * lat, F.z + F.rz * lat, F.y + STYLE.signs.billboard.bottom, STYLE.signs.billboard.width, STYLE.signs.billboard.height, -F.rx * side, -F.rz * side, { post: false });
    }
  };
  hoardRange(-420, 380, -1);
  hoardRange(-420, 380, 1, 40);
  for (const sp of turnSp) { hoardRange(sp - 60, sp + 60, -1, 30); hoardRange(sp - 60, sp + 60, 1, 30); }
  // pit entry / exit boards
  {
    const e = pitAt(15), x = pitAt(pitLen - 15);
    board('PITIN', e.x + e.rx * (-bSide) * (PW / 2 + 1.5), e.z + e.rz * (-bSide) * (PW / 2 + 1.5), e.y + 1.4, 3.2, 0.8, -e.tx, -e.tz);
    board('PITOUT', x.x + x.rx * (-bSide) * (PW / 2 + 1.5), x.z + x.rz * (-bSide) * (PW / 2 + 1.5), x.y + 1.4, 3.2, 0.8, -x.tx, -x.tz);
    for (const s of [Math.max(5, pbS0 - 60)]) {
      const F = pitAt(s);
      board('PIT80', F.x + F.rx * bSide * (PW / 2 + 0.8), F.z + F.rz * bSide * (PW / 2 + 0.8), F.y + 1.6, 2.4, 0.6, -F.tx, -F.tz);
    }
  }
  // circuit name on the gantry and on the pit building roof (both faces)
  {
    const G = root.userData.gantry, F = G.F;
    const mid = (G.latL + G.latR) / 2;
    const gx = F.x + F.rx * mid, gz = F.z + F.rz * mid;
    board('RBR', gx - F.tx * 0.6, gz - F.tz * 0.6, F.y + G.H + 0.55, 8, 2.0, -F.tx, -F.tz, { post: false, back: true });
    board('SF', gx + F.tx * 0.6, gz + F.tz * 0.6, F.y + G.H + 0.55, 8, 2.0, F.tx, F.tz, { post: false, back: false });
    const B = root.userData.pitBuilding;
    for (const o of [-0.3, 0.3]) {
      const cx = B.front.x + B.fx * B.len * o, cz = B.front.y + B.fz * B.len * o;
      board('RBR', cx + B.nrm.x * 0.6, cz + B.nrm.y * 0.6, B.y + 14, 24, 6, B.nrm.x, B.nrm.y, { post: false, back: false });
    }
  }
  // grandstand fascia boards
  for (const gs of D.grandstands) {
    if (!gs._front) continue;
    const p = gs._front.clone().addScaledVector(gs._face, 0.3);
    board(gs.len > 150 ? 'RBR' : 'SPIELBERG', p.x, p.y, gs._ground + 0.2, Math.min(20, gs.len * 0.4), Math.min(5, gs.len * 0.1), gs._face.x, gs._face.y, { post: false, back: false });
  }
  // DRS, sector and speed-trap boards on the left of the track (FIA circuit map positions)
  for (const ln of (D.lines || [])) {
    const key = { drsDet: 'DRSDET', drsAct: 'DRSACT', trap: 'TRAP' }[ln.kind] || (ln.kind === 'sector' ? (ln.label.endsWith('1') ? 'S1' : 'S2') : null);
    if (!key) continue;
    const F = track.at(ln.sp), bl = -(F.wl + KERB_W + 1.5);
    board(key, F.x + F.rx * bl, F.z + F.rz * bl, F.y + 0.9, 2.4, 0.6, -F.tx, -F.tz);
  }
  add(signs.geometry(), M.signs, 'RBR_Signage', { receive: false });
  if (posts.length) add(merge(posts), M.steel, 'RBR_Sign_Structures', { cast: false });

  // ---------------------------------------------------------------- 9b. landmark: "Der Bulle vom Spielberg" (OSM position)
  // Corten steel bull under its aluminium arch (Neugebauer / Kölldorfer, 2012): 14.6 m bull, 17.2 m with the arch.
  // Lofted sculpted mesh with see-through plate skin and gold horns, built in rbr_bull.js. No logo.
  for (const lm of (D.landmarks || [])) {
    if (lm.kind !== 'bull') continue;
    const [cx, cz] = lm.c, gy = terrain.height(lm.c[0], lm.c[1]) - 0.3;
    const fl = Math.hypot(lm.face[0], lm.face[1]) || 1, fx = lm.face[0] / fl, fz = lm.face[1] / fl; // side-on to the track
    const g = buildBullSculpture();
    g.scale.setScalar(DM * (lm.total || 17.2) / 17.2);
    g.rotation.y = Math.atan2(-fz, fx);
    g.position.set(cx * DM, gy * DM, cz * DM);
    root.add(g);
    root.userData.bull = { x: cx, y: gy, z: cz, mesh: g };
  }

  // ---------------------------------------------------------------- 10. trees (instanced, LOD per 400 m cell)
  {
    const rand = rng(77);
    const cells = new Map();
    const CELL = 400;
    const blocked = (x, z) => {
      const nw = track.nearestWithin(x, z);
      if (nw && nw.d < Math.max(D.barR[nw.i], D.barL[nw.i]) + 22) return true;
      for (let j = 0; j < pit.n; j += 4) if ((pit.x[j] - x) ** 2 + (pit.z[j] - z) ** 2 < 70 * 70) return true;
      for (const lm of (D.landmarks || [])) if ((x - lm.c[0]) ** 2 + (z - lm.c[1]) ** 2 < 40 * 40) return true;
      for (const gs of D.grandstands) {
        const dx = x - gs.c[0], dz = z - gs.c[1];
        const a = Math.abs(dx * gs._ax.x + dz * gs._ax.y), d = Math.abs(dx * gs._face.x + dz * gs._face.y);
        if (a < gs.len / 2 + 15 && d < gs.dep / 2 + 15) return true;
      }
      return false;
    };
    const T = terrain, X0 = T.x0 + 40, X1 = T.x0 + (T.nx - 1) * T.step - 40, Z0 = T.z0 + 40, Z1 = T.z0 + (T.nz - 1) * T.step - 40;
    let placed = 0;
    for (let tries = 0; tries < 60000 && placed < 7000; tries++) {
      const x = X0 + rand() * (X1 - X0), z = Z0 + rand() * (Z1 - Z0);
      const f = forest(x, z);
      if (f < 0.58 && rand() > 0.03) continue;
      if (blocked(x, z)) continue;
      const key = Math.floor(x / CELL) + ',' + Math.floor(z / CELL);
      if (!cells.has(key)) cells.set(key, []);
      cells.get(key).push([x, T.height(x, z), z, 0.75 + rand() * 0.6, rand() * 6.28]);
      placed++;
    }
    // detailed conifer: trunk + 3 stacked cones; low: single cone
    const hiGeo = mergeGeometries([
      new THREE.CylinderGeometry(0.25 * DM, 0.35 * DM, 3 * DM, 6).translate(0, 1.5 * DM, 0),
      new THREE.ConeGeometry(3.2 * DM, 7 * DM, 8).translate(0, 6 * DM, 0),
      new THREE.ConeGeometry(2.6 * DM, 6 * DM, 8).translate(0, 9.5 * DM, 0),
      new THREE.ConeGeometry(1.8 * DM, 5 * DM, 8).translate(0, 13 * DM, 0),
    ].map(g => { g.deleteAttribute('uv'); return g.toNonIndexed(); }));
    const loGeo = new THREE.ConeGeometry(3.0 * DM, 15 * DM, 5).translate(0, 7.5 * DM, 0);
    const treeMat = new THREE.MeshLambertMaterial({ color: 0x2d5a2b });
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sv = new THREE.Vector3(), pv = new THREE.Vector3();
    const tint = new THREE.Color();
    for (const [key, list] of cells) {
      const lod = new THREE.LOD(); lod.name = 'RBR_Trees_' + key;
      let cx = 0, cz = 0, cy = 0; list.forEach(t => { cx += t[0]; cy += t[1]; cz += t[2]; }); cx /= list.length; cy /= list.length; cz /= list.length;
      lod.position.set(cx * DM, cy * DM, cz * DM);
      const mk = (geo) => {
        const im = new THREE.InstancedMesh(geo, treeMat, list.length);
        list.forEach((t, k) => {
          q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), t[4]); sv.set(t[3], t[3] * (0.9 + 0.2 * Math.sin(t[4] * 3)), t[3]);
          pv.set((t[0] - cx) * DM, (t[1] - cy - 0.3) * DM, (t[2] - cz) * DM);
          m4.compose(pv, q, sv); im.setMatrixAt(k, m4);
          tint.setHSL(0.30 + 0.04 * Math.sin(t[4] * 7), 0.45, 0.22 + 0.06 * Math.cos(t[4] * 5)); im.setColorAt(k, tint);
        });
        im.computeBoundingSphere(); im.castShadow = false; return im;
      };
      lod.addLevel(mk(hiGeo), 0);
      lod.addLevel(mk(loGeo), 4500);
      lod.addLevel(new THREE.Object3D(), 60000);
      root.add(lod);
    }
    root.userData.treeCount = placed;
  }

  // ---------------------------------------------------------------- 11. sky dome (gradient, ignores fog)
  {
    const g = new THREE.SphereGeometry(180000, 32, 16);
    const col = [], p = g.attributes.position;
    const top = new THREE.Color(0x3d6fb0), hor = new THREE.Color(0xc9d9e8), tmp = new THREE.Color();
    for (let i = 0; i < p.count; i++) { const t = Math.max(0, p.getY(i) / 180000); tmp.copy(hor).lerp(top, Math.pow(t, 0.55)); col.push(tmp.r, tmp.g, tmp.b); }
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    const sky = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false }));
    sky.name = 'RBR_Sky'; sky.renderOrder = -10; sky.frustumCulled = false;
    root.add(sky); root.userData.sky = sky;
  }

  root.userData.buildMs = Math.round(performance.now() - t0);
  return {
    group: root, track, terrain, pit, data: D,
    raceline: new Path(D.raceline.x, D.raceline.z, D.raceline.x.map(() => 0), true),
    turnSp, lineSp: LINE_SP, startSp: START_SP,
    /** ground height (m) at x,z for scenery placement */
    groundAt: (x, z) => terrainBase(x, z),
  };
}
