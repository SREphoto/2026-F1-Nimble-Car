/**
 * trackside.js: generic trackside builders used by every circuit (surface, kerbs, barriers, fences, signs).
 * Per-circuit values come from a style object (see cad/track/styles/red_bull_ring_style.js).
 * All textures are drawn at runtime on small canvases, with mipmaps and anisotropic filtering.
 * Sponsor wraps are plain lettering in brand colours, no logo artwork.
 * Units: metres (callers multiply by DM for the scene).
 */
import * as THREE from 'three';

function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function tex(c, { srgb = true, aniso = 8, repeat = true } = {}) {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = aniso; t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter;
  return t;
}

// ------------------------------------------------------------------ 1. surface
/** asphalt colour map (fine aggregate grain, paving seam at texture column 0) and a grey bump map from the same grain */
export function makeAsphaltTextures(S) {
  const W = 512, c = canvas(W, W), x = c.getContext('2d'), r = rng(4242);
  x.fillStyle = S.base; x.fillRect(0, 0, W, W);
  // large soft tone variation, then fine stones
  for (let i = 0; i < 60; i++) { x.fillStyle = `rgba(${r() < 0.5 ? '0,0,0' : '255,255,255'},${0.025 + r() * 0.03})`; x.beginPath(); x.arc(r() * W, r() * W, 20 + r() * 70, 0, 7); x.fill(); }
  for (let i = 0; i < 26000; i++) { x.fillStyle = S.grain[(r() * S.grain.length) | 0]; const s = 0.8 + r() * 1.8; x.fillRect(r() * W, r() * W, s, s); }
  for (let i = 0; i < 900; i++) { x.fillStyle = `rgba(200,200,205,${0.25 + r() * 0.3})`; x.fillRect(r() * W, r() * W, 1, 1); } // light chips catch the sun
  // paving seam (sealed joint) along the centre line
  x.fillStyle = 'rgba(18,18,20,0.55)'; x.fillRect(0, 0, 2, W); x.fillStyle = 'rgba(255,255,255,0.05)'; x.fillRect(2, 0, 1, W);
  const map = tex(c, { aniso: 16 });
  // bump: grain only (no colour), 256 px
  const b = canvas(256, 256), bx = b.getContext('2d'), rb = rng(77);
  bx.fillStyle = '#808080'; bx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 9000; i++) { const v = (rb() * 255) | 0; bx.fillStyle = `rgb(${v},${v},${v})`; const s = 0.7 + rb() * 1.4; bx.fillRect(rb() * 256, rb() * 256, s, s); }
  const bump = tex(b, { srgb: false, aniso: 8 });
  return { map, bump };
}
/** racing line rubber: dark across-gradient (u across the line), alpha fades at both sides */
export function makeRubberTexture(S) {
  const c = canvas(64, 64), x = c.getContext('2d'), r = rng(9);
  const g = x.createLinearGradient(0, 0, 64, 0);
  g.addColorStop(0, 'rgba(20,20,22,0)'); g.addColorStop(0.3, 'rgba(20,20,22,0.8)'); g.addColorStop(0.5, 'rgba(20,20,22,1)'); g.addColorStop(0.7, 'rgba(20,20,22,0.8)'); g.addColorStop(1, 'rgba(20,20,22,0)');
  x.fillStyle = g; x.fillRect(0, 0, 64, 64);
  x.globalCompositeOperation = 'destination-out';           // streaky: tyre marks are not even
  for (let i = 0; i < 160; i++) { x.fillStyle = `rgba(0,0,0,${0.15 + r() * 0.3})`; x.fillRect(r() * 64, 0, 1 + r() * 2, 64); }
  x.globalCompositeOperation = 'source-over';
  return tex(c, { srgb: true, aniso: 8 });
}
/** repair patch decal: slightly different asphalt tone with a dark sealed edge */
export function makePatchTexture(S) {
  const c = canvas(128, 128), x = c.getContext('2d'), r = rng(31);
  x.fillStyle = 'rgba(52,54,58,0.9)'; x.fillRect(4, 4, 120, 120);
  for (let i = 0; i < 2500; i++) { x.fillStyle = S.grain[(r() * S.grain.length) | 0]; x.fillRect(4 + r() * 120, 4 + r() * 120, 1.2, 1.2); }
  x.strokeStyle = 'rgba(15,15,17,0.85)'; x.lineWidth = 4; x.strokeRect(4, 4, 120, 120);
  return tex(c, { repeat: false, aniso: 8 });
}

// ------------------------------------------------------------------ 2. kerbs
/** kerb height (m) at distance u (m) from the track edge for a profile; along = distance along the track (sawtooth ridges) */
export function kerbHeight(K, type, u, along = 0) {
  const P = K.profiles[type] || K.profiles.flat;
  if (u < 0 || u > P[P.length - 1][0]) return 0;
  let h = P[0][1];
  for (let k = 1; k < P.length; k++) if (u <= P[k][0]) { const a = (u - P[k - 1][0]) / (P[k][0] - P[k - 1][0]); h = P[k - 1][1] + (P[k][1] - P[k - 1][1]) * a; break; }
  if (type === 'sawtooth' && u > 0.6 * P[P.length - 1][0]) h += K.sawtoothAmp * (0.5 + 0.5 * Math.cos((along / K.sawtoothPeriod) * Math.PI * 2));
  return h;
}
/** kerb paint: red/white blocks along v (one red + one white per repeat), u across; sawtooth gets ridge shading on its outer part */
export function makeKerbTexture(K, type) {
  const c = canvas(128, 256), x = c.getContext('2d');
  x.fillStyle = K.colors.red; x.fillRect(0, 0, 128, 128);
  x.fillStyle = K.colors.white; x.fillRect(0, 128, 128, 128);
  // worn paint and rubber pick-up near the track edge (u = 0 side)
  const g = x.createLinearGradient(0, 0, 128, 0); g.addColorStop(0, 'rgba(20,20,22,0.35)'); g.addColorStop(0.3, 'rgba(20,20,22,0.05)'); g.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = g; x.fillRect(0, 0, 128, 256);
  if (type === 'sawtooth' || type === 'raised') {
    const n = type === 'sawtooth' ? 8 : 4;                // ridges per block pair
    for (let k = 0; k < n; k++) {
      const y = (k + 0.5) * 256 / n;
      x.fillStyle = 'rgba(0,0,0,0.28)'; x.fillRect(type === 'sawtooth' ? 70 : 40, y, 128, 5);
      x.fillStyle = 'rgba(255,255,255,0.18)'; x.fillRect(type === 'sawtooth' ? 70 : 40, y - 3, 128, 3);
    }
  }
  x.fillStyle = 'rgba(0,0,0,0.3)'; x.fillRect(124, 0, 4, 256);   // outer edge shadow line
  return tex(c, { aniso: 16 });
}

// ------------------------------------------------------------------ 3. barriers
/**
 * Sponsor wrap strip for walls and tyre belts. The canvas is tall: v (canvas y) runs along the barrier, u (canvas x) up the
 * barrier, so the same texture works on any strip whose v = distance / (wrapLength * sponsors.length).
 */
export function makeSponsorTexture(B) {
  const n = B.sponsors.length, PH = 512, c = canvas(128, PH * n), x = c.getContext('2d');
  B.sponsors.forEach((sp, k) => {
    const y0 = k * PH;
    x.fillStyle = sp.bg; x.fillRect(0, y0, 128, PH);
    if (sp.accent) { x.fillStyle = sp.accent; x.fillRect(0, y0, 10, PH); x.fillRect(118, y0, 10, PH); }
    x.save(); x.translate(64, y0 + PH / 2); x.rotate(Math.PI / 2);
    x.fillStyle = sp.fg; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.font = `bold ${sp.name.length > 6 ? 70 : 84}px "Helvetica Neue", Arial, sans-serif`;
    x.fillText(sp.name, 0, 4, PH - 40);
    x.restore();
    x.fillStyle = 'rgba(0,0,0,0.25)'; x.fillRect(0, y0, 128, 2);   // panel joint
  });
  return tex(c, { aniso: 16 });
}
/** concrete wall face: light concrete with panel joints every 4 m along v and a darker splash zone at the bottom (u = 0) */
export function makeConcreteTexture() {
  const c = canvas(64, 256), x = c.getContext('2d'), r = rng(5);
  x.fillStyle = '#c9ccd0'; x.fillRect(0, 0, 64, 256);
  for (let i = 0; i < 1800; i++) { x.fillStyle = `rgba(${r() < 0.5 ? '60,60,60' : '255,255,255'},${0.06 + r() * 0.08})`; x.fillRect(r() * 64, r() * 256, 1.5, 1.5); }
  const g = x.createLinearGradient(0, 0, 64, 0); g.addColorStop(0, 'rgba(40,40,40,0.35)'); g.addColorStop(0.25, 'rgba(40,40,40,0)');
  x.fillStyle = g; x.fillRect(0, 0, 64, 256);
  x.fillStyle = 'rgba(60,60,64,0.6)'; x.fillRect(0, 0, 64, 2);
  return tex(c, { aniso: 8 });
}
/** top of a tyre wall: rows of tyres seen from above (u across, v along) */
export function makeTyreTopTexture() {
  const c = canvas(64, 128), x = c.getContext('2d');
  x.fillStyle = '#121214'; x.fillRect(0, 0, 64, 128);
  for (let k = 0; k < 4; k++) for (let j = 0; j < 2; j++) {
    const cx = 16 + j * 32, cy = 16 + k * 32;
    x.fillStyle = '#26272b'; x.beginPath(); x.arc(cx, cy, 15, 0, 7); x.fill();
    x.fillStyle = '#060607'; x.beginPath(); x.arc(cx, cy, 7, 0, 7); x.fill();
  }
  return tex(c, { aniso: 8 });
}

// ------------------------------------------------------------------ 5. fencing
/** catch fence: diamond wire mesh with alpha. Use with alphaToCoverage so it still reads as mesh far away */
export function makeFenceTexture() {
  const S = 128, c = canvas(S, S), x = c.getContext('2d');
  x.clearRect(0, 0, S, S);
  x.strokeStyle = 'rgba(176,182,188,1)'; x.lineWidth = 3.2; x.lineCap = 'round';
  const m = 4;                                             // 4 x 4 diamonds per repeat
  x.beginPath();
  for (let k = -m; k <= 2 * m; k++) { const o = (k * S) / m; x.moveTo(o, 0); x.lineTo(o + S, S); x.moveTo(o, 0); x.lineTo(o - S, S); }
  x.stroke();
  return tex(c, { aniso: 16 });
}

// ------------------------------------------------------------------ 4. signs
/** framed board: pushes steel frame pieces (boxes, metres) for a sign panel of w x h whose bottom is at y0 */
export function frameParts(boxAt, { x, z, y0, w, h, ax, az, nx, nz, ground, legs = true }) {
  const parts = [], t = 0.06;
  // back plate and rim
  parts.push(boxAt(w + 0.12, h + 0.12, 0.05, x - nx * 0.03, y0 + h / 2, z - nz * 0.03, ax, az));
  for (const s of [-1, 1]) parts.push(boxAt(w + 0.16, t, t * 2, x, y0 + h / 2 + s * (h / 2 + 0.06), z, ax, az));
  if (legs) {
    const H = y0 + h + 0.05 - ground;
    for (const e of [-0.36, 0.36]) {
      const px = x - ax * e * w - nx * 0.12, pz = z - az * e * w - nz * 0.12;
      parts.push(boxAt(0.09, H, 0.09, px, ground + H / 2, pz, ax, az));
      parts.push(boxAt(0.3, 0.06, 0.3, px, ground + 0.03, pz, ax, az));      // base plate
    }
    if (y0 - ground > 0.6) parts.push(boxAt(w * 0.72, 0.06, 0.06, x - nx * 0.12, ground + (y0 - ground) * 0.5, z - nz * 0.12, ax, az)); // cross brace
  }
  return parts;
}
