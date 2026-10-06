/**
 * driver_suit.js: the race suit, gloves and boots as real fabric (ref round4 D2).
 * SREdesigns - Samuel R Erwin III
 *
 *  - Materials: MeshPhysicalMaterial, roughness 0.9, no clearcoat, low specular, cloth sheen
 *    (0.4, sheenRoughness 0.8). Fine plain-weave normal map tiled at real scale (one tile = 8 mm,
 *    16 yarns) plus a tiled roughness-variation map. Gloves use a suede nap instead of the weave.
 *    The car's environment map (materials.js applyCarEnvironment) lights them at reduced intensity.
 *  - Folds are geometry: the torso and the sleeves / legs are displaced with creases at the waist,
 *    belly and shoulders and around the elbows and knees (deeper on the inside of the bend), with
 *    elastic gathers at the cuffs.
 *  - Raised piping runs along the panel seams (separate thin tubes that follow the folds).
 *  - Sponsor patches are separate slightly raised decals with their own matte, embroidered finish,
 *    from one shared atlas texture.
 * Everything follows the suit colours in the driver settings (team themes regenerate the maps).
 */
import * as THREE from 'three';

const TAU = Math.PI * 2;
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const sp = (x, e) => Math.sign(x) * Math.pow(Math.abs(x), e);
const rnd = (k) => { const r = Math.sin(k * 12.9898 + 78.233) * 43758.5453; return r - Math.floor(r); };

// =========================================================================
// 1. Tiled detail maps (made once, shared; each material uses a clone with its own repeat,
//    clones share the image so it is uploaded once)
// =========================================================================
const WEAVE_TILE_DM = 0.08; // one weave tile = 8 mm, 16 yarns of 0.5 mm
const WEAVE_TILES = 8;      // weave tiles per normal-map texture (texture = 6.4 cm of cloth)
let _detail = null;
function detailMaps() {
  if (_detail) return _detail;
  const mkNormal = (N, heightFn, strength) => {
    const H = new Float32Array(N * N);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) H[y * N + x] = heightFn(x, y);
    const cv = document.createElement('canvas'); cv.width = cv.height = N;
    const g = cv.getContext('2d'), img = g.createImageData(N, N);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const dx = (H[y * N + ((x + 1) % N)] - H[y * N + ((x - 1 + N) % N)]) * strength;
      const dy = (H[((y + 1) % N) * N + x] - H[((y - 1 + N) % N) * N + x]) * strength;
      const l = Math.hypot(dx, dy, 1), i = (y * N + x) * 4;
      img.data[i] = (-dx / l * 0.5 + 0.5) * 255; img.data[i + 1] = (dy / l * 0.5 + 0.5) * 255; img.data[i + 2] = (1 / l * 0.5 + 0.5) * 255; img.data[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t;
  };
  const vnT = (x, y, s, M) => { const xi = Math.floor(x / s), yi = Math.floor(y / s), fx = x / s - xi, fy = y / s - yi, m = M / s; const h = (a, b) => rnd((((a % m) + m) % m) * 131 + (((b % m) + m) % m) * 17 + s); const sm = (t) => t * t * (3 - 2 * t); return THREE.MathUtils.lerp(THREE.MathUtils.lerp(h(xi, yi), h(xi + 1, yi), sm(fx)), THREE.MathUtils.lerp(h(xi, yi + 1), h(xi + 1, yi + 1), sm(fx)), sm(fy)); };
  const ridged = (x, y, s, M) => 1 - Math.abs(2 * vnT(x, y, s, M) - 1);
  // plain weave, 0.5 mm yarns (8 px each, 16 per 8 mm weave tile, warp over weft on a checkerboard,
  // each yarn a rounded ridge with fibre noise), 8 x 8 weave tiles per texture (6.4 cm) with a soft
  // crumple / handling-crease layer at 1-3 cm on top, so the cloth never looks injection-moulded.
  const P = 8, N = WEAVE_TILES * 16 * P;
  const weave = mkNormal(N, (x, y) => {
    const i = Math.floor(x / P), j = Math.floor(y / P), fx = (x % P) / P, fy = (y % P) / P;
    const warpOver = (i + j) % 2 === 0;
    const across = warpOver ? fx : fy, along = warpOver ? fy : fx;
    const ridge = Math.sin(Math.PI * across);           // rounded yarn
    const dip = 0.55 + 0.45 * Math.sin(Math.PI * along); // dips where it goes under
    const yarn = 0.6 * ridge * dip + 0.06 * (rnd(x * 7.1 + y * 3.3) - 0.5);
    const crumple = 5 * ridged(x, y, 256, N) + 2.6 * ridged(x + 37, y + 11, 128, N) + 1 * ridged(x, y, 64, N);
    return yarn + crumple;
  }, 1.6);
  // suede nap: soft random fibres, no grid
  const suede = mkNormal(256, (x, y) => 0.45 * vnT(x, y, 16, 256) + 0.35 * vnT(x, y, 4, 256) + 0.2 * rnd(x * 1.7 + y * 913.1), 2.2);
  // roughness variation (value noise, 0.82 - 1.0), sampled by the G channel
  const cv = document.createElement('canvas'); cv.width = cv.height = 256;
  const g = cv.getContext('2d'), img = g.createImageData(256, 256);
  const vn = (x, y, s) => { const xi = Math.floor(x / s), yi = Math.floor(y / s), fx = x / s - xi, fy = y / s - yi; const h = (a, b) => rnd(((a % (256 / s)) + 256) * 131 + ((b % (256 / s)) + 256) * 17); const sm = (t) => t * t * (3 - 2 * t); return THREE.MathUtils.lerp(THREE.MathUtils.lerp(h(xi, yi), h(xi + 1, yi), sm(fx)), THREE.MathUtils.lerp(h(xi, yi + 1), h(xi + 1, yi + 1), sm(fx)), sm(fy)); };
  for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) {
    const v = 0.82 + 0.18 * (0.6 * vn(x, y, 32) + 0.4 * vn(x, y, 8)), i = (y * 256 + x) * 4;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v * 255; img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  const rough = new THREE.CanvasTexture(cv); rough.wrapS = rough.wrapT = THREE.RepeatWrapping;
  return (_detail = { weave, suede, rough });
}
function tiled(tex, ru, rv) { const t = tex.clone(); t.repeat.set(ru, rv); t.needsUpdate = true; return t; }

/**
 * Fabric material. size = [u span, v span] of the part's UVs in dm, so the weave tiles at real
 * scale. kind: 'nomex' (suit, boots), 'suede' (gloves).
 */
export function fabricMaterial(name, colour, { map = null, size = [1, 1], kind = 'nomex', sheenColor = 0x7d8496, ...extra } = {}) {
  const D = detailMaps();
  const tile = kind === 'suede' ? 0.16 : WEAVE_TILE_DM * WEAVE_TILES;
  const m = new THREE.MeshPhysicalMaterial({
    name, color: colour, map,
    roughness: kind === 'suede' ? 0.95 : 0.9, metalness: 0,
    roughnessMap: tiled(D.rough, Math.max(1, size[0] / 0.6), Math.max(1, size[1] / 0.6)),
    normalMap: tiled(kind === 'suede' ? D.suede : D.weave, size[0] / tile, size[1] / tile),
    normalScale: new THREE.Vector2(kind === 'suede' ? 0.45 : 0.6, kind === 'suede' ? 0.45 : 0.6),
    clearcoat: 0, specularIntensity: 0.18,
    sheen: kind === 'suede' ? 0.5 : 0.35, sheenRoughness: 0.8, sheenColor: new THREE.Color(sheenColor),
    ...extra,
  });
  m.userData.envMapIntensity = 0.7; // picked up by applyCarEnvironment
  return m;
}

// =========================================================================
// 2. Colour maps (panels, piping colour, stitch lines, cuffs) and the patch atlas
// =========================================================================
/** Dyed-cloth tone of a (paint) colour: a little less saturated and lighter-valued than gloss paint. */
export function dyed(c) {
  const col = new THREE.Color(c), hsl = {}; col.getHSL(hsl);
  col.setHSL(hsl.h, hsl.s * 0.92, hsl.l * 0.85);
  return '#' + col.getHexString();
}
function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function srgbTex(cv, flipY = true) { const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; t.flipY = flipY; t.wrapS = THREE.RepeatWrapping; return t; }
function stitch(g, x0, y0, x1, y1, col = 'rgba(255,255,255,0.32)', dash = 4) {
  g.save(); g.strokeStyle = col; g.lineWidth = 1.2; g.setLineDash([dash, dash * 0.8]); g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); g.restore();
}

/** Torso: u round the body (0 back, 0.25 / 0.75 sides, 0.5 chest), v seat (0) to collar (1). */
export function createSuitTorsoTexture(suit0) {
  const suit = dyedSuit(suit0);
  const w = 1024, h = 512, cv = canvas(w, h), g = cv.getContext('2d'), Y = (v) => h * (1 - v);
  g.fillStyle = suit.base; g.fillRect(0, 0, w, h);
  [0.25, 0.75].forEach((c) => {
    g.fillStyle = suit.panel; g.fillRect(w * (c - 0.05), 0, w * 0.1, h);
    stitch(g, w * (c - 0.062), 0, w * (c - 0.062), h); stitch(g, w * (c + 0.062), 0, w * (c + 0.062), h);
  });
  stitch(g, 0, Y(0.8) + 5, w, Y(0.8) + 5); stitch(g, 0, Y(0.2) - 4, w, Y(0.2) - 4); stitch(g, 0, Y(0.14) + 4, w, Y(0.14) + 4);
  g.fillStyle = 'rgba(0,0,0,0.12)'; g.fillRect(0, Y(0.2), w, h * 0.06); // waist band
  g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(w * 0.497, Y(0.97), w * 0.006, h * 0.75); // zip
  stitch(g, w * 0.488, Y(0.97), w * 0.488, Y(0.22), 'rgba(255,255,255,0.22)', 3);
  return srgbTex(cv);
}
/** Sleeve / leg: u round the limb, v from the shoulder or hip (0, canvas top) to the cuff (1). */
export function createSuitLimbTexture(suit0, kind) {
  const suit = dyedSuit(suit0);
  const w = 512, h = 1024, cv = canvas(w, h), g = cv.getContext('2d');
  g.fillStyle = suit.base; g.fillRect(0, 0, w, h);
  [0.25, 0.75].forEach((c) => {
    g.fillStyle = suit.panel; g.fillRect(w * (c - 0.045), 0, w * 0.09, h);
    stitch(g, w * (c - 0.06), 0, w * (c - 0.06), h); stitch(g, w * (c + 0.06), 0, w * (c + 0.06), h);
  });
  stitch(g, w * 0.5, 0, w * 0.5, h, 'rgba(255,255,255,0.18)');
  const cuffFrom = kind === 'arm' ? 0.9 : 0.93;
  g.fillStyle = 'rgba(0,0,0,0.18)'; g.fillRect(0, h * cuffFrom, w, h * 0.06);
  g.fillStyle = 'rgba(0,0,0,0.3)'; for (let x = 0; x < w; x += 6) g.fillRect(x, h * cuffFrom, 2, h * 0.06); // ribbing
  return srgbTex(cv, false);
}

/** Patch atlas: 4 x 4 cells of 256 x 128 px. Returns { tex, cell(name) -> [u0, v0, u1, v1] }. */
export const PATCHES = {
  logo: { text: (s) => s.logo || 'Red Bull', style: 'logo' },
  logoBack: { text: (s) => s.logo || 'Red Bull', style: 'logo' },
  oracle: { text: () => 'ORACLE', bg: '#ffffff', fg: '#c8102e' },
  mobil: { text: () => 'Mobil 1', bg: '#ffffff', fg: '#0b3b8c' },
  visa: { text: () => 'VISA', bg: 'base', fg: '#ffffff', border: 'accent' },
  tag: { text: () => 'TAG HEUER', bg: '#ffffff', fg: '#111111' },
  bybit: { text: () => 'Bybit', bg: 'base', fg: '#ffffff', border: 'accent' },
  redbull: { text: () => 'Red Bull', bg: '#ffffff', fg: '#c8102e' },
};
export function dyedSuit(s) { return { ...s, base: dyed(s.base), panel: dyed(s.panel), accent: dyed(s.accent) }; }
export function createPatchAtlas(suit0) {
  const suit = dyedSuit(suit0);
  const CW = 256, CH = 128, cols = 4, names = Object.keys(PATCHES), cv = canvas(CW * cols, CH * 4), g = cv.getContext('2d');
  const cells = {};
  names.forEach((n, k) => {
    const p = PATCHES[n], x0 = (k % cols) * CW, y0 = Math.floor(k / cols) * CH, text = p.text(suit);
    g.save(); g.translate(x0 + CW / 2, y0 + CH / 2);
    if (p.style === 'logo') {
      g.font = '900 64px "Arial Black", Impact, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      let size = 64; while (g.measureText(text).width > CW * 0.92 && size > 10) { size -= 2; g.font = `900 ${size}px "Arial Black", Impact, sans-serif`; }
      g.lineWidth = size * 0.16; g.strokeStyle = suit.accent; g.lineJoin = 'round'; g.strokeText(text, 0, 4); g.fillStyle = suit.panel; g.fillText(text, 0, 4);
    } else {
      const bg = p.bg === 'base' ? suit.base : p.bg, bw = CW * 0.94, bh = CH * 0.8;
      g.fillStyle = bg; g.beginPath(); g.roundRect ? g.roundRect(-bw / 2, -bh / 2, bw, bh, 14) : g.rect(-bw / 2, -bh / 2, bw, bh); g.fill();
      g.lineWidth = 5; g.strokeStyle = p.border === 'accent' ? suit.accent : 'rgba(0,0,0,0.25)'; g.stroke();
      g.setLineDash([5, 4]); g.lineWidth = 1.5; g.strokeStyle = 'rgba(120,120,120,0.6)'; g.beginPath(); g.roundRect ? g.roundRect(-bw / 2 + 7, -bh / 2 + 7, bw - 14, bh - 14, 10) : g.rect(-bw / 2 + 7, -bh / 2 + 7, bw - 14, bh - 14); g.stroke(); g.setLineDash([]);
      let size = 56; g.font = `800 ${size}px Arial, Helvetica, sans-serif`;
      while (g.measureText(text).width > bw * 0.82 && size > 10) { size -= 2; g.font = `800 ${size}px Arial, Helvetica, sans-serif`; }
      g.fillStyle = p.fg; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, 0, 3);
    }
    g.restore();
    const W = CW * cols, H = CH * 4;
    cells[n] = [x0 / W, 1 - (y0 + CH) / H, (x0 + CW) / W, 1 - y0 / H];
  });
  const tex = srgbTex(cv, true); tex.wrapS = THREE.ClampToEdgeWrapping;
  return { tex, cells };
}
/** Matte embroidered / printed patch material (alpha-tested, pulled forward so it never z-fights). */
export function patchMaterial(atlasTex) {
  const D = detailMaps();
  const m = new THREE.MeshPhysicalMaterial({
    name: 'Driver_RaceSuit_Patches', map: atlasTex, alphaTest: 0.4, transparent: false,
    roughness: 0.78, metalness: 0, specularIntensity: 0.25, sheen: 0.3, sheenRoughness: 0.7, sheenColor: new THREE.Color(0xffffff),
    normalMap: tiled(D.weave, 2, 1), normalScale: new THREE.Vector2(0.3, 0.3),
    polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
  });
  m.userData.envMapIntensity = 0.7;
  return m;
}

// =========================================================================
// 3. Torso: dense displaced loft + piping + patches (static)
// =========================================================================
/**
 * sections: [{c, a, b, ra, rb, p}] (coarse). Returns { mesh, piping, patches, surface(v,u,lift) }.
 * Creases: waist folds (v .17-.33, deepest in front), belly folds (.42-.52), shoulder bunching
 * (.84-.95 at the sides).
 */
export function buildTorso(sections, { mat, pipingMat, seamMat, patchMat, cells, NV = 240, NU = 96 }) {
  // interpolate the coarse sections (Catmull-Rom on centre and radii)
  const n = sections.length;
  const at = (k) => sections[THREE.MathUtils.clamp(k, 0, n - 1)];
  const cr = (p0, p1, p2, p3, t) => 0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (-p0 + 3 * p1 - 3 * p2 + p3) * t * t * t);
  const secAt = (v) => {
    const f = v * (n - 1), k = Math.min(n - 2, Math.floor(f)), t = f - k;
    const S0 = at(k - 1), S1 = at(k), S2 = at(k + 1), S3 = at(k + 2);
    const c = V3(cr(S0.c.x, S1.c.x, S2.c.x, S3.c.x, t), cr(S0.c.y, S1.c.y, S2.c.y, S3.c.y, t), cr(S0.c.z, S1.c.z, S2.c.z, S3.c.z, t));
    return { c, a: S1.a, b: S1.b, ra: cr(S0.ra, S1.ra, S2.ra, S3.ra, t), rb: cr(S0.rb, S1.rb, S2.rb, S3.rb, t), e: 2 / (S1.p || 2) };
  };
  const front = (u) => 0.5 + 0.5 * Math.cos((u - 0.5) * TAU);           // 1 at the chest, 0 at the back
  const sides = (u) => Math.max(Math.exp(-(((u - 0.25) / 0.09) ** 2)), Math.exp(-(((u - 0.75) / 0.09) ** 2)));
  const fold = (v, vk, sig) => Math.exp(-(((v - vk) / sig) ** 2)) - 0.55 * Math.exp(-(((v - vk - 1.7 * sig) / sig) ** 2));
  // each fold dies out somewhere round the body (env) so they read as cloth, not rings
  const env = (u, k) => THREE.MathUtils.smoothstep(0.5 + 0.5 * Math.sin(u * TAU * (1 + (k % 3)) + k * 2.3), 0.15, 0.7);
  const disp = (v, u) => {
    let d = 0;
    for (let k = 0; k < 6; k++) { const vk = 0.15 + k * 0.034 + 0.014 * Math.sin(u * TAU * 3 + k * 1.7); d += 0.07 * (0.3 + 0.7 * front(u)) * (0.35 + 0.65 * env(u, k)) * fold(v, vk, 0.012); }
    for (let k = 0; k < 3; k++) { const vk = 0.4 + k * 0.045 + 0.012 * Math.sin(u * TAU * 2 + k); d += 0.045 * front(u) * env(u, k + 3) * fold(v, vk, 0.014); }
    for (let k = 0; k < 4; k++) { const vk = 0.82 + k * 0.028 + 0.02 * Math.sin(u * TAU * 4 + k * 2.1); d += 0.05 * sides(u) * fold(v, vk, 0.011); }
    // diagonal drape lines from the shoulders toward the zip (front only, under the harness)
    for (let k = 0; k < 3; k++) { const x = ((v - 0.55 - k * 0.07) - 0.9 * Math.abs(u - 0.5)) / 0.012; d += 0.022 * front(u) * Math.exp(-x * x); }
    // soft handling wrinkles everywhere (sharp ridges, broad valleys)
    const r1 = Math.max(0, Math.sin(v * 41 + Math.sin(u * TAU * 3) * 2.2 + u * 9)), r2 = Math.max(0, Math.sin(v * 27 - u * 31 + Math.sin(v * 9) * 1.5));
    d += 0.016 * (0.5 + 0.5 * front(u)) * (r1 ** 4 + 0.7 * r2 ** 4 - 0.22);
    return d;
  };
  const shadeOf = (d, v, u) => THREE.MathUtils.clamp(1 + Math.min(0, 6 * d) + 0.04 * (Math.sin(u * 37 + v * 23) * Math.sin(u * 13 - v * 41)), 0.62, 1.04);
  const surface = (v, u, lift = 0, out) => {
    const s = secAt(THREE.MathUtils.clamp(v, 0, 1)), ph = u * TAU;
    const x = s.ra * sp(Math.sin(ph), s.e), y = -s.rb * sp(Math.cos(ph), s.e);
    const radial = s.a.clone().multiplyScalar(Math.sin(ph) / s.ra).addScaledVector(s.b, -Math.cos(ph) / s.rb).normalize();
    const p = (out || new THREE.Vector3()).copy(s.c).addScaledVector(s.a, x).addScaledVector(s.b, y);
    return p.addScaledVector(radial, disp(v, u) + lift);
  };
  // main mesh
  const pos = [], uv = [], col = [], idx = [], R = NU + 1, P = new THREE.Vector3();
  for (let i = 0; i < NV; i++) {
    const v = i / (NV - 1);
    for (let j = 0; j <= NU; j++) { surface(v, j / NU, 0, P); pos.push(P.x, P.y, P.z); uv.push(j / NU, v); const sh = shadeOf(disp(v, j / NU), v, j / NU); col.push(sh, sh, sh); }
  }
  for (let i = 0; i < NV - 1; i++) for (let j = 0; j < NU; j++) { const a = i * R + j, b = a + 1, c = a + R, d = c + 1; idx.push(a, c, b, b, c, d); }
  [0, NV - 1].forEach((i, k) => { const ci = pos.length / 3, c = secAt(k).c; pos.push(c.x, c.y, c.z); uv.push(0.5, k); col.push(1, 1, 1); for (let j = 0; j < NU; j++) { const a = i * R + j; k ? idx.push(ci, a, a + 1) : idx.push(ci, a + 1, a); } });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); geo.setIndex(idx);
  mat.vertexColors = true; // fold occlusion (darker crease valleys) + slight heathered tone
  orient(geo); geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, mat); mesh.name = 'Driver_RaceSuit_Torso'; mesh.castShadow = true; mesh.receiveShadow = true;
  // raised piping: yellow along the side-panel edges, suit-colour seams across the yoke and waist
  const tubeAlong = (fn, N, r) => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(Array.from({ length: N + 1 }, (_, k) => fn(k / N))), N * 2, r, 6, false);
  const pipes = [];
  [0.25, 0.75].forEach((c) => [-0.056, 0.056].forEach((o) => pipes.push(tubeAlong((t) => surface(0.03 + t * 0.92, c + o, 0.006), 80, 0.011))));
  const seams = [];
  [0.8, 0.2, 0.14].forEach((v) => seams.push(tubeAlong((t) => surface(v, t, 0.004), 96, 0.008)));
  const piping = new THREE.Mesh(merge(pipes), pipingMat); piping.name = 'Driver_RaceSuit_Piping';
  const seamMesh = new THREE.Mesh(merge(seams), seamMat); seamMesh.name = 'Driver_RaceSuit_Seams';
  // patches: [cell, v centre, u centre, width dm, height dm]
  const perim = (v) => { let L = 0, prev = surface(v, 0); for (let j = 1; j <= 48; j++) { const p = surface(v, j / 48); L += p.distanceTo(prev); prev = p; } return L; };
  const len = (() => { let L = 0, prev = surface(0, 0.5); for (let i = 1; i <= 40; i++) { const p = surface(i / 40, 0.5); L += p.distanceTo(prev); prev = p; } return L; })();
  const quads = [];
  const place = (cell, vc, uc, wdm, hdm) => {
    const du = wdm / perim(vc), dv = hdm / len, [u0, v0, u1, v1] = cells[cell];
    quads.push(gridPatch((a, b) => surface(vc + (b - 0.5) * dv, uc + (a - 0.5) * du, 0.012), 10, 6, [u0, v0, u1, v1]));
  };
  place('logo', 0.6, 0.5, 1.9, 0.62); place('oracle', 0.77, 0.415, 0.62, 0.22); place('mobil', 0.77, 0.585, 0.62, 0.22);
  place('visa', 0.45, 0.5, 0.8, 0.22); place('tag', 0.17, 0.5, 0.9, 0.2); place('tag', 0.17, 0.0, 0.9, 0.2); place('logoBack', 0.62, 0.0, 1.5, 0.5);
  const patches = new THREE.Mesh(merge(quads), patchMat); patches.name = 'Driver_RaceSuit_Patches_Torso';
  [piping, seamMesh, patches].forEach((m) => { m.castShadow = true; });
  return { mesh, piping, seams: seamMesh, patches, surface };
}

// =========================================================================
// 4. Sleeves and legs: displaced dynamic mesh + piping + patches, re-posed by poseSuitLimb
// =========================================================================
/**
 * prof(s) -> [half width across the bend plane, half depth]; jointS = elbow / knee position (0..1);
 * kind 'arm' | 'leg'. Sampling is dense around the joint, the root and the cuff so the creases are
 * real geometry.
 */
export function makeSuitLimb(name, { mat, pipingMat, patchMat, cells, prof, jointS, kind, ring = 44 }) {
  const ss = [];
  const dense = [[0, 0.08, 0.004], [jointS - 0.15, jointS + 0.15, 0.003], [kind === 'arm' ? 0.84 : 0.88, 1.0, 0.004]];
  for (let s = 0; s <= 1.00001;) {
    ss.push(Math.min(1, s));
    const d = dense.find(([a, b]) => s >= a && s < b);
    s += d ? d[2] : 0.008;
  }
  if (ss[ss.length - 1] < 1) ss.push(1);
  const NS = ss.length - 1, R = ring + 1;
  const nV = (NS + 1) * R + 2, pos = new Float32Array(nV * 3), uv = new Float32Array(nV * 2), col = new Float32Array(nV * 3).fill(1), idx = [];
  for (let i = 0; i <= NS; i++) for (let j = 0; j <= ring; j++) { uv[(i * R + j) * 2] = j / ring; uv[(i * R + j) * 2 + 1] = ss[i]; }
  for (let i = 0; i < NS; i++) for (let j = 0; j < ring; j++) { const a = i * R + j, b = a + 1, c = a + R, d = c + 1; idx.push(a, c, b, b, c, d); }
  const c0 = (NS + 1) * R, c1 = c0 + 1;
  for (let j = 0; j < ring; j++) { idx.push(c0, j, j + 1); idx.push(c1, NS * R + j + 1, NS * R + j); }
  uv[c0 * 2] = 0.5; uv[c1 * 2] = 0.5; uv[c1 * 2 + 1] = 1;
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); geo.setIndex(idx);
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3).setUsage(THREE.DynamicDrawUsage));
  mat.vertexColors = true; // fold occlusion
  const mesh = new THREE.Mesh(geo, mat); mesh.name = name; mesh.castShadow = true; mesh.receiveShadow = true; mesh.frustumCulled = false;
  // piping lines (4) as one dynamic tube mesh, every 2nd sample
  const pipeS = ss.filter((_, i) => i % 2 === 0 || i === NS), pipeU = [0.19, 0.31, 0.69, 0.81], PR = 6;
  const pPos = new Float32Array(pipeU.length * pipeS.length * PR * 3), pIdx = [];
  pipeU.forEach((_, L) => { const base = L * pipeS.length * PR; for (let i = 0; i < pipeS.length - 1; i++) for (let j = 0; j < PR; j++) { const a = base + i * PR + j, b = base + i * PR + (j + 1) % PR, c = a + PR, d = b + PR; pIdx.push(a, b, c, b, d, c); } });
  const pGeo = new THREE.BufferGeometry(); pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3).setUsage(THREE.DynamicDrawUsage)); pGeo.setIndex(pIdx);
  const piping = new THREE.Mesh(pGeo, pipingMat); piping.name = name + '_Piping'; piping.frustumCulled = false; piping.castShadow = true;
  // patches: [cell, s centre, u centre, width dm, height dm]; two faces of the limb (u 0 and 0.5)
  const names = kind === 'arm' ? ['oracle', 'bybit'] : ['mobil', 'redbull'];
  const sv = kind === 'arm' ? [0.2, 0.7] : [0.25, 0.72];
  const defs = [];
  [0, 0.5].forEach((u) => { defs.push([names[0], sv[0], u, kind === 'arm' ? 0.5 : 0.62, kind === 'arm' ? 0.2 : 0.24]); defs.push([names[1], sv[1], u, kind === 'arm' ? 0.42 : 0.6, kind === 'arm' ? 0.17 : 0.22]); });
  const GX = 8, GY = 5, per = (GX + 1) * (GY + 1);
  const dPos = new Float32Array(defs.length * per * 3), dUv = new Float32Array(defs.length * per * 2), dIdx = [];
  defs.forEach(([cell], k) => {
    const [u0, v0, u1, v1] = cells[cell];
    for (let y = 0; y <= GY; y++) for (let x = 0; x <= GX; x++) { const q = k * per + y * (GX + 1) + x; dUv[q * 2] = u0 + (u1 - u0) * x / GX; dUv[q * 2 + 1] = v0 + (v1 - v0) * y / GY; }
    for (let y = 0; y < GY; y++) for (let x = 0; x < GX; x++) { const a = k * per + y * (GX + 1) + x, b = a + 1, c = a + GX + 1, d = c + 1; dIdx.push(a, b, c, b, d, c); }
  });
  const dGeo = new THREE.BufferGeometry(); dGeo.setAttribute('position', new THREE.BufferAttribute(dPos, 3).setUsage(THREE.DynamicDrawUsage)); dGeo.setAttribute('uv', new THREE.BufferAttribute(dUv, 2)); dGeo.setIndex(dIdx);
  const patches = new THREE.Mesh(dGeo, patchMat); patches.name = name + '_Patches'; patches.frustumCulled = false;
  mesh.userData.suitLimb = { ss, NS, ring, prof, jointS, kind, piping, pipeS, pipeU, PR, patches, defs, GX, GY, last: null,
    frames: { c: new Float32Array((NS + 1) * 3), b: new Float32Array((NS + 1) * 3), a: new THREE.Vector3(), inner: 1 } };
  return { mesh, piping, patches };
}

const _d1 = new THREE.Vector3(), _d2 = new THREE.Vector3(), _a = new THREE.Vector3(), _t = new THREE.Vector3(), _bb = new THREE.Vector3(), _c = new THREE.Vector3(), _q = new THREE.Vector3();
/** Pose the sleeve / leg through A (root), B (joint), C (end). Skips the rebuild when nothing moved. */
export function poseSuitLimb(mesh, A, B, C, hint, rBend) {
  const L = mesh.userData.suitLimb;
  const key = [A, B, C].map((v) => `${v.x.toFixed(4)},${v.y.toFixed(4)},${v.z.toFixed(4)}`).join('|');
  if (key === L.last) return; L.last = key;
  const { ss, NS, ring, prof, jointS, kind, frames } = L, R = ring + 1;
  const d1 = _d1.subVectors(B, A), L1 = d1.length(); d1.normalize();
  const d2 = _d2.subVectors(C, B), L2 = d2.length(); d2.normalize();
  const a = _a.crossVectors(d1, d2); if (a.lengthSq() < 1e-6) a.crossVectors(d1, hint); a.normalize(); frames.a.copy(a);
  const r = Math.min(rBend, 0.45 * L1, 0.45 * L2), Ltot = L1 + L2; L.Ltot = Ltot;
  const P1 = B.clone().addScaledVector(d1, -r), P2 = B.clone().addScaledVector(d2, r);
  // inner side of the bend in ring terms: y = -cos(ph) along b
  const innerDir = _q.subVectors(d2, d1);
  const pos = mesh.geometry.attributes.position.array;
  for (let i = 0; i <= NS; i++) {
    const s = ss[i], l = s * Ltot;
    if (l <= L1 - r) { _c.copy(A).addScaledVector(d1, l); _t.copy(d1); }
    else if (l >= L1 + r) { _c.copy(B).addScaledVector(d2, l - L1); _t.copy(d2); }
    else {
      const u = (l - (L1 - r)) / (2 * r), w0 = (1 - u) * (1 - u), w1 = 2 * (1 - u) * u, w2 = u * u;
      _c.set(0, 0, 0).addScaledVector(P1, w0).addScaledVector(B, w1).addScaledVector(P2, w2);
      _t.subVectors(B, P1).multiplyScalar(2 * (1 - u)).addScaledVector(_bb.subVectors(P2, B), 2 * u).normalize();
    }
    _bb.crossVectors(_t, a).normalize();
    if (i === Math.round(NS / 2)) frames.inner = Math.sign(innerDir.dot(_bb)) || 1;
    frames.c[i * 3] = _c.x; frames.c[i * 3 + 1] = _c.y; frames.c[i * 3 + 2] = _c.z;
    frames.b[i * 3] = _bb.x; frames.b[i * 3 + 1] = _bb.y; frames.b[i * 3 + 2] = _bb.z;
  }
  const P = new THREE.Vector3(), colA = mesh.geometry.attributes.color, col = colA.array;
  for (let i = 0; i <= NS; i++) for (let j = 0; j <= ring; j++) {
    const d = limbPoint(L, i, j / ring, 0, P); const k = (i * R + j) * 3; pos[k] = P.x; pos[k + 1] = P.y; pos[k + 2] = P.z;
    const sh = THREE.MathUtils.clamp(1 + Math.min(0, 6 * d) + 0.035 * Math.sin(j * 0.9 + ss[i] * 31) * Math.sin(ss[i] * 57 - j * 0.4), 0.62, 1.04);
    col[k] = col[k + 1] = col[k + 2] = sh;
  }
  colA.needsUpdate = true;
  const c0 = (NS + 1) * R;
  pos[c0 * 3] = A.x; pos[c0 * 3 + 1] = A.y; pos[c0 * 3 + 2] = A.z; pos[c0 * 3 + 3] = C.x; pos[c0 * 3 + 4] = C.y; pos[c0 * 3 + 5] = C.z;
  mesh.geometry.attributes.position.needsUpdate = true; mesh.geometry.computeVertexNormals(); mesh.geometry.computeBoundingSphere();
  // piping
  const pp = L.piping.geometry.attributes.position.array, tN = new THREE.Vector3(), tA = new THREE.Vector3(), tB = new THREE.Vector3(), Q = new THREE.Vector3(), Q2 = new THREE.Vector3();
  L.pipeU.forEach((u, Li) => {
    const base = Li * L.pipeS.length * L.PR;
    L.pipeS.forEach((s, k) => {
      const i = ss.indexOf(s);
      limbPoint(L, i, u, 0.004, Q); limbPoint(L, Math.min(NS, i + 1), u, 0.004, Q2);
      if (i === NS) { limbPoint(L, NS - 1, u, 0.004, Q2); Q2.sub(Q).negate().add(Q); }
      tN.subVectors(Q2, Q).normalize();
      tA.subVectors(Q, _c.fromArray(frames.c, i * 3)).normalize(); tB.crossVectors(tN, tA).normalize();
      for (let j = 0; j < L.PR; j++) { const ph = j / L.PR * TAU, o = (base + k * L.PR + j) * 3; const x = Math.cos(ph) * 0.011, y = Math.sin(ph) * 0.011; pp[o] = Q.x + tA.x * x + tB.x * y; pp[o + 1] = Q.y + tA.y * x + tB.y * y; pp[o + 2] = Q.z + tA.z * x + tB.z * y; }
    });
  });
  L.piping.geometry.attributes.position.needsUpdate = true; L.piping.geometry.computeVertexNormals();
  // patches
  const dp = L.patches.geometry.attributes.position.array, per = (L.GX + 1) * (L.GY + 1);
  L.defs.forEach(([, sc, uc, wdm, hdm], k) => {
    const i0 = nearestIndex(ss, sc); const rad = prof(sc); const circ = Math.PI * (rad[0] + rad[1]);
    const du = wdm / circ, ds = hdm / Ltot;
    for (let y = 0; y <= L.GY; y++) for (let x = 0; x <= L.GX; x++) {
      const s = sc + (0.5 - y / L.GY) * ds, u = uc + (x / L.GX - 0.5) * du; // y up in the atlas = toward the root
      limbPointS(L, s, u, 0.012, Q); const o = (k * per + y * (L.GX + 1) + x) * 3; dp[o] = Q.x; dp[o + 1] = Q.y; dp[o + 2] = Q.z;
    }
    void i0;
  });
  L.patches.geometry.attributes.position.needsUpdate = true; L.patches.geometry.computeVertexNormals();
}
function nearestIndex(ss, s) { let lo = 0, hi = ss.length - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (ss[m] <= s) lo = m; else hi = m; } return lo; }
const _fc = new THREE.Vector3(), _fb = new THREE.Vector3();
/** Surface point at sample i, around-fraction u, lifted along the normal (creases included). */
function limbPoint(L, i, u, lift, out) {
  const { frames, ss, prof, jointS, kind } = L, s = ss[i], ph = u * TAU;
  _fc.fromArray(frames.c, i * 3); _fb.fromArray(frames.b, i * 3);
  const [ra, rb] = prof(s);
  const x = -Math.sin(ph), y = -Math.cos(ph);
  const d = creaseDisp(s, ph, y * frames.inner, jointS, kind, L.Ltot || 5);
  const rr = 1 + (d + lift) / Math.max(0.2, (ra + rb) / 2);
  out.copy(_fc).addScaledVector(frames.a, x * ra * rr).addScaledVector(_fb, y * rb * rr);
  return d;
}
function limbPointS(L, s, u, lift, out) {
  const i = nearestIndex(L.ss, s), j = Math.min(L.NS, i + 1), t = (s - L.ss[i]) / Math.max(1e-6, L.ss[j] - L.ss[i]);
  const p0 = new THREE.Vector3(), p1 = new THREE.Vector3(); limbPoint(L, i, u, lift, p0); limbPoint(L, j, u, lift, p1);
  return out.copy(p0).lerp(p1, THREE.MathUtils.clamp(t, 0, 1));
}
/** Radial displacement (dm): folds round the elbow / knee (deeper on the inside of the bend),
 *  bunching at the shoulder / hip, elastic gathers at the cuff. inner = 1 on the inside of the bend. */
function creaseDisp(s, ph, inner, jointS, kind, Ltot) {
  let d = 0;
  const m = 1 / Ltot; // dm -> s
  const wIn = 0.25 + 0.75 * Math.max(0, inner);
  const amp = kind === 'arm' ? 0.045 : 0.055;
  // stacked folds round the elbow / knee: ~1 cm wide, 2 cm apart, deepest on the inside of the bend
  for (let k = -3; k <= 3; k++) {
    const sk = jointS + k * 0.2 * m + 0.05 * m * Math.sin(ph * (2 + (k & 1)) + k * 1.3);
    const x = (s - sk) / (0.07 * m);
    const env = 0.4 + 0.6 * THREE.MathUtils.smoothstep(0.5 + 0.5 * Math.sin(ph * (1 + (Math.abs(k) % 2)) + k * 2.1), 0.1, 0.6);
    d += amp * wIn * env * (1 - Math.abs(k) / 4.5) * (Math.exp(-x * x) - 0.5 * Math.exp(-((x - 1.8) ** 2)));
  }
  // shoulder / hip bunching
  for (let k = 0; k < 3; k++) { const sk = (0.12 + k * 0.17) * m + 0.04 * m * Math.sin(ph * 3 + k); const x = (s - sk) / (0.06 * m); d += 0.035 * Math.exp(-x * x) * (0.5 + 0.5 * Math.sin(ph * 2 + k * 1.9)); }
  // long drape wrinkles along the limb (two diagonal families, sharp ridges, soft valleys)
  const edge = THREE.MathUtils.smoothstep(s, 0.08, 0.16) * (1 - THREE.MathUtils.smoothstep(s, 0.8, 0.88));
  const z = s * Ltot;
  const r1 = Math.max(0, Math.sin(z * TAU / 0.75 + ph * 1.0 + 0.7)), r2 = Math.max(0, Math.sin(z * TAU / 1.1 - ph * 2.0 + 2.1));
  d += (kind === 'arm' ? 0.022 : 0.03) * edge * (r1 ** 4 + 0.8 * r2 ** 4 - 0.25);
  // elastic gathers above the cuff, cuff pulls in
  const cuff = kind === 'arm' ? 0.9 : 0.93;
  if (s > cuff - 0.06 && s < cuff) for (let k = 0; k < 3; k++) { const x = (s - (cuff - 0.06 * m - k * 0.11 * m)) / (0.035 * m); d += 0.02 * Math.exp(-x * x) * (0.6 + 0.4 * Math.sin(ph * 5 + k)); }
  if (s >= cuff) d -= (kind === 'arm' ? 0.07 : 0.03) * THREE.MathUtils.smoothstep(s, cuff, cuff + 0.025); // elastic cuff tucks inside the gauntlet / boot
  return d;
}

// =========================================================================
// helpers
// =========================================================================
function gridPatch(fn, GX, GY, [u0, v0, u1, v1]) {
  const pos = [], uv = [], idx = [];
  for (let y = 0; y <= GY; y++) for (let x = 0; x <= GX; x++) { const p = fn(x / GX, y / GY); pos.push(p.x, p.y, p.z); uv.push(u0 + (u1 - u0) * x / GX, v0 + (v1 - v0) * y / GY); }
  for (let y = 0; y < GY; y++) for (let x = 0; x < GX; x++) { const a = y * (GX + 1) + x, b = a + 1, c = a + GX + 1, d = c + 1; idx.push(a, b, c, b, d, c); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
  return g;
}
function merge(geos) {
  let nv = 0, ni = 0; geos.forEach((g) => { nv += g.attributes.position.count; ni += g.index.count; });
  const pos = new Float32Array(nv * 3), uv = new Float32Array(nv * 2), idx = new Uint32Array(ni); let ov = 0, oi = 0;
  geos.forEach((g) => {
    pos.set(g.attributes.position.array, ov * 3); if (g.attributes.uv) uv.set(g.attributes.uv.array, ov * 2);
    const gi = g.index.array; for (let k = 0; k < gi.length; k++) idx[oi + k] = gi[k] + ov;
    ov += g.attributes.position.count; oi += gi.length; g.dispose();
  });
  const out = new THREE.BufferGeometry(); out.setAttribute('position', new THREE.BufferAttribute(pos, 3)); out.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); out.setIndex(new THREE.BufferAttribute(idx, 1)); out.computeVertexNormals();
  return out;
}
function orient(g) {
  const p = g.attributes.position.array, ix = g.index.array; let vol = 0; const A = new THREE.Vector3(), B = new THREE.Vector3(), C = new THREE.Vector3();
  for (let t = 0; t < ix.length; t += 3) { A.fromArray(p, ix[t] * 3); B.fromArray(p, ix[t + 1] * 3); C.fromArray(p, ix[t + 2] * 3); vol += A.dot(B.clone().cross(C)); }
  if (vol < 0) { const arr = Array.from(ix); for (let t = 0; t < arr.length; t += 3) { const q = arr[t + 1]; arr[t + 1] = arr[t + 2]; arr[t + 2] = q; } g.setIndex(arr); }
}
