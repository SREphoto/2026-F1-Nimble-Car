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
/**
 * asphalt colour map (fine aggregate grain, paving seam at texture column 0),
 * true tangent-space normal map, bump map and roughness map for realistic sunlight micro-sheen.
 */
export function makeAsphaltTextures(S) {
  const W = 1024, c = canvas(W, W), x = c.getContext('2d'), r = rng(4242);
  x.fillStyle = S.base; x.fillRect(0, 0, W, W);

  // Large-scale rolling compaction streaks and bitumen variation
  for (let i = 0; i < 90; i++) {
    x.fillStyle = `rgba(${r() < 0.5 ? '10,12,15' : '230,235,240'},${0.008 + r() * 0.014})`;
    x.beginPath();
    x.ellipse(r() * W, r() * W, 30 + r() * 60, 90 + r() * 180, (r() - 0.5) * 0.2, 0, Math.PI * 2);
    x.fill();
  }

  // Micro-aggregate stones & fine gravel matrix (55,000 chips)
  for (let i = 0; i < 55000; i++) {
    x.fillStyle = S.grain[(r() * S.grain.length) | 0];
    const s = 1.0 + r() * 2.2;
    x.fillRect(r() * W, r() * W, s, s);
  }

  // Quartzite and basalt crystalline chips that catch direct sun glints
  for (let i = 0; i < 2800; i++) {
    x.fillStyle = `rgba(215,220,230,${0.35 + r() * 0.45})`;
    x.fillRect(r() * W, r() * W, 1.2, 1.2);
  }

  // Dark bitumen binder pools and micro-pores
  for (let i = 0; i < 3500; i++) {
    x.fillStyle = `rgba(12,14,16,${0.3 + r() * 0.4})`;
    x.fillRect(r() * W, r() * W, 1.5, 1.5);
  }

  // Longitudinal paving seams (sealed asphalt expansion joints)
  x.fillStyle = 'rgba(14,15,18,0.7)'; x.fillRect(0, 0, 3, W);
  x.fillStyle = 'rgba(255,255,255,0.08)'; x.fillRect(3, 0, 1, W);
  const map = tex(c, { aniso: 16 });

  // Tangent-space Normal Map & Height Bump (512x512)
  const NW = 512;
  const heightData = new Float32Array(NW * NW);
  const rh = rng(88);
  for (let i = 0; i < NW * NW; i++) {
    heightData[i] = 0.5 + (rh() - 0.5) * 0.22;
  }
  // Coarse aggregate height peaks
  for (let k = 0; k < 12000; k++) {
    const px = Math.floor(rh() * NW), py = Math.floor(rh() * NW);
    const rad = 1 + Math.floor(rh() * 3);
    const hDelta = (rh() - 0.4) * 0.4;
    for (let dy = -rad; dy <= rad; dy++) {
      for (let dx = -rad; dx <= rad; dx++) {
        const nx = (px + dx + NW) % NW, ny = (py + dy + NW) % NW;
        heightData[ny * NW + nx] = Math.max(0, Math.min(1, heightData[ny * NW + nx] + hDelta * (1 - Math.hypot(dx, dy) / (rad + 1))));
      }
    }
  }

  const nc = canvas(NW, NW), nxCtx = nc.getContext('2d'), imgData = nxCtx.createImageData(NW, NW), pix = imgData.data;
  const strength = 2.4;
  for (let y = 0; y < NW; y++) {
    for (let xCoord = 0; xCoord < NW; xCoord++) {
      const idx = y * NW + xCoord;
      const xL = (xCoord - 1 + NW) % NW, xR = (xCoord + 1) % NW;
      const yU = (y - 1 + NW) % NW, yD = (y + 1) % NW;
      const dx = (heightData[y * NW + xR] - heightData[y * NW + xL]) * strength;
      const dy = (heightData[yD * NW + xCoord] - heightData[yU * NW + xCoord]) * strength;
      const len = Math.hypot(dx, dy, 1.0);
      const nxVal = (-dx / len) * 0.5 + 0.5;
      const nyVal = (-dy / len) * 0.5 + 0.5;
      const nzVal = (1.0 / len) * 0.5 + 0.5;
      const pIdx = idx * 4;
      pix[pIdx] = Math.floor(nxVal * 255);
      pix[pIdx + 1] = Math.floor(nyVal * 255);
      pix[pIdx + 2] = Math.floor(nzVal * 255);
      pix[pIdx + 3] = 255;
    }
  }
  nxCtx.putImageData(imgData, 0, 0);
  const normalMap = tex(nc, { srgb: false, aniso: 8 });

  // Bump Map (512x512)
  const bc = canvas(NW, NW), bctx = bc.getContext('2d'), bImg = bctx.createImageData(NW, NW), bPix = bImg.data;
  for (let i = 0; i < NW * NW; i++) {
    const v = Math.floor(heightData[i] * 255);
    const pIdx = i * 4;
    bPix[pIdx] = bPix[pIdx + 1] = bPix[pIdx + 2] = v;
    bPix[pIdx + 3] = 255;
  }
  bctx.putImageData(bImg, 0, 0);
  const bump = tex(bc, { srgb: false, aniso: 8 });

  // Roughness Map (512x512): higher roughness off-line, polished bitumen on stones
  const rc = canvas(NW, NW), rctx = rc.getContext('2d'), rImg = rctx.createImageData(NW, NW), rPix = rImg.data;
  for (let i = 0; i < NW * NW; i++) {
    const h = heightData[i];
    const rough = Math.floor((0.70 + (1 - h) * 0.28) * 255);
    const pIdx = i * 4;
    rPix[pIdx] = rPix[pIdx + 1] = rPix[pIdx + 2] = rough;
    rPix[pIdx + 3] = 255;
  }
  rctx.putImageData(rImg, 0, 0);
  const roughnessMap = tex(rc, { srgb: false, aniso: 8 });

  return { map, bump, normalMap, roughnessMap };
}

/** racing line rubber: dark across-gradient with realistic rubber clumping, grain and streaks */
export function makeRubberTexture(S) {
  const c = canvas(128, 128), x = c.getContext('2d'), r = rng(9);
  const g = x.createLinearGradient(0, 0, 128, 0);
  g.addColorStop(0, 'rgba(16,17,20,0)');
  g.addColorStop(0.2, 'rgba(14,15,18,0.75)');
  g.addColorStop(0.5, 'rgba(12,13,15,0.98)');
  g.addColorStop(0.8, 'rgba(14,15,18,0.75)');
  g.addColorStop(1, 'rgba(16,17,20,0)');
  x.fillStyle = g; x.fillRect(0, 0, 128, 128);

  // Micro streaks and tyre tread transfer grooves
  x.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 320; i++) {
    x.fillStyle = `rgba(0,0,0,${0.12 + r() * 0.35})`;
    x.fillRect(r() * 128, 0, 1 + r() * 2.5, 128);
  }
  x.globalCompositeOperation = 'source-over';

  // Hot rubber deposit flecks
  for (let i = 0; i < 400; i++) {
    x.fillStyle = 'rgba(8,9,11,0.4)';
    x.fillRect(15 + r() * 98, r() * 128, 1.2, 2.5);
  }
  return tex(c, { srgb: true, aniso: 8 });
}

/** Dual-tire heavy braking lockup skid marks with progressive deceleration darkness */
export function makeSkidMarkTexture() {
  const c = canvas(256, 128), x = c.getContext('2d'), r = rng(19);
  x.clearRect(0, 0, 256, 128);

  // Two parallel tyre tracks (left and right wheels)
  const tracks = [
    { y0: 16, h: 36 },
    { y0: 76, h: 36 }
  ];

  for (const tr of tracks) {
    const g = x.createLinearGradient(0, tr.y0, 0, tr.y0 + tr.h);
    g.addColorStop(0, 'rgba(10,10,12,0.1)');
    g.addColorStop(0.2, 'rgba(10,10,12,0.85)');
    g.addColorStop(0.8, 'rgba(10,10,12,0.85)');
    g.addColorStop(1, 'rgba(10,10,12,0.1)');
    x.fillStyle = g;
    x.fillRect(0, tr.y0, 256, tr.h);

    // Tread scrubbing striations
    x.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < 200; i++) {
      x.fillStyle = `rgba(0,0,0,${0.1 + r() * 0.3})`;
      x.fillRect(0, tr.y0 + r() * tr.h, 256, 1 + r() * 2);
    }
    x.globalCompositeOperation = 'source-over';
  }
  return tex(c, { srgb: true, aniso: 8 });
}

/** repair patch decal: slightly different asphalt tone with a dark sealed edge */
export function makePatchTexture(S) {
  const c = canvas(128, 128), x = c.getContext('2d'), r = rng(31);
  x.fillStyle = 'rgba(52,54,58,0.92)'; x.fillRect(4, 4, 120, 120);
  for (let i = 0; i < 3500; i++) { x.fillStyle = S.grain[(r() * S.grain.length) | 0]; x.fillRect(4 + r() * 120, 4 + r() * 120, 1.2, 1.2); }
  x.strokeStyle = 'rgba(15,15,17,0.9)'; x.lineWidth = 4; x.strokeRect(4, 4, 120, 120);
  // Tar crack seal lines branching off patch
  x.strokeStyle = 'rgba(14,14,16,0.7)'; x.lineWidth = 1.5;
  x.beginPath();
  x.moveTo(4, 30); x.lineTo(0, 32);
  x.moveTo(124, 75); x.lineTo(128, 77);
  x.stroke();
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
/** kerb paint: high-res 256x512 red/white blocks, bevel highlights, chipped paint micro-details, and tyre scrub marks */
export function makeKerbTexture(K, type) {
  const c = canvas(256, 512), x = c.getContext('2d'), r = rng(103);
  x.fillStyle = K.colors.red; x.fillRect(0, 0, 256, 256);
  x.fillStyle = K.colors.white; x.fillRect(0, 256, 256, 256);

  // Micro concrete texture undertone & chipped paint flecks
  for (let i = 0; i < 4000; i++) {
    x.fillStyle = `rgba(${r() < 0.5 ? '20,20,24' : '240,240,245'},${0.03 + r() * 0.08})`;
    x.fillRect(r() * 256, r() * 512, 1.2, 1.2);
  }

  // Heavy rubber pick-up and black tyre scuff streaks along the apex contact edge (u = 0 to 80)
  const g = x.createLinearGradient(0, 0, 256, 0);
  g.addColorStop(0, 'rgba(12,12,14,0.65)');
  g.addColorStop(0.15, 'rgba(15,15,18,0.45)');
  g.addColorStop(0.35, 'rgba(20,20,24,0.12)');
  g.addColorStop(0.65, 'rgba(0,0,0,0)');
  x.fillStyle = g;
  x.fillRect(0, 0, 256, 512);

  // Serrated ridges and bevel shading for raised / sawtooth kerbs
  if (type === 'sawtooth' || type === 'raised') {
    const n = type === 'sawtooth' ? 16 : 8; // ridges per block pair
    for (let k = 0; k < n; k++) {
      const y = (k + 0.5) * 512 / n;
      const xStart = type === 'sawtooth' ? 120 : 70;
      // Shadow groove
      x.fillStyle = 'rgba(0,0,0,0.38)';
      x.fillRect(xStart, y, 256, 9);
      // Highlight crest
      x.fillStyle = 'rgba(255,255,255,0.28)';
      x.fillRect(xStart, y - 6, 256, 6);
    }
  }

  // Inner track edge seal line
  x.fillStyle = 'rgba(10,10,12,0.45)'; x.fillRect(0, 0, 4, 512);
  // Outer edge dirt drop-off shadow line
  x.fillStyle = 'rgba(0,0,0,0.45)'; x.fillRect(250, 0, 6, 512);
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

/** pit lane floor: light concrete slabs (one slab per tile, joints on the edges), fine speckle and tyre marks */
export function makePitConcreteTexture(P) {
  const c = canvas(256, 256), x = c.getContext('2d'), r = rng(9);
  x.fillStyle = P.concrete; x.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 5000; i++) { x.fillStyle = `rgba(${r() < 0.5 ? '70,70,72' : '255,255,255'},${0.04 + r() * 0.07})`; x.fillRect(r() * 256, r() * 256, 1.2, 1.2); }
  for (let i = 0; i < 6; i++) { x.fillStyle = `rgba(40,40,42,${0.03 + r() * 0.05})`; x.fillRect(40 + r() * 170, 0, 8 + r() * 14, 256); }  // faint tyre marks along the lane
  x.fillStyle = 'rgba(70,72,76,0.55)'; x.fillRect(0, 0, 256, 2); x.fillRect(0, 0, 2, 256);                          // slab joints
  return tex(c, { aniso: 8 });
}
