/**
 * Driver helmet (FIA 8860-2018-ABP style) + HANS device, built from data so it can be re-used
 * for other drivers / liveries in the game. CAD frame: X nose -> tail, +Y left, +Z up, units dm.
 *
 * The shell is a "superellipsoid" (round top, flatter sides, longer at the back) with a chin bar
 * that drops lower at the front. The visor, peak, ballistic strip and vents are thin patches that
 * follow the same surface, so they always sit flush on the shell whatever the spec values are.
 */
import * as THREE from 'three';
import { materials } from '../materials.js';

export const HELMET_SPEC = {
  // Head centre in the car (R9: the driver sits low in the tub). Only the helmet shows above the
  // cockpit sides, tucked between the padded headrest wings; the visor sits just above the
  // cockpit edge, the crown stays well under the halo and the chin clears the steering wheel.
  centre: [13.75, 0.0, 5.05],
  front: 1.30, rear: 1.42, halfWidth: 1.12, top: 1.22, // shell radii (dm)
  sideFlat: 2.5,                 // superellipse exponent (2 = round, higher = flatter sides)
  rimRear: -0.80, rimFront: -1.26, // bottom edge height (dm below the centre) at the back / chin
  visor: { az: 66, elLo: -0.12, elHi: 0.30, cornerRise: 0.13, cornerDrop: 0.09 }, // edges taper so the opening has rounded corners   // degrees either side of straight ahead, elevation rad
  strip: { az: 62, elLo: 0.30, elHi: 0.40 },    // ballistic (Zylon) strip just above the visor
  peak: { az: 58, el: 0.41, out: 0.09 },        // small lip above the visor
  pivot: { el: 0.10, r: 0.17 },                 // visor pivot covers on the temples
  chinVents: [{ az: 14, el: -0.62 }, { az: -14, el: -0.62 }],
  spoiler: { el: 0.62, halfSpan: 0.62, chord: 0.32, rise: 0.10 }, // rear aero spoiler on the crown
  hansPosts: { az: 128, el: -0.42 },            // anchor posts on the lower rear quarters
  colours: { base: '#18245e', crown: '#f6c200', stripe: '#d0021b', accent: '#ffffff' },
};

export function helmetTexture(c) {
  const cv = document.createElement('canvas'); cv.width = 1024; cv.height = 512;
  const g = cv.getContext('2d');
  // u (x) runs around the helmet from the back (0) through the left, front (0.5), right, back (1)
  // v (y) runs from the bottom rim (bottom of canvas) to the crown (top of canvas)
  g.fillStyle = c.base; g.fillRect(0, 0, 1024, 512);
  g.fillStyle = c.crown; g.fillRect(0, 0, 1024, 150);               // yellow crown
  g.fillStyle = c.stripe; g.fillRect(0, 150, 1024, 22);             // red band under the crown
  g.fillStyle = c.accent; g.fillRect(0, 172, 1024, 6);
  g.fillStyle = c.stripe;                                           // swoosh along each side
  for (const s of [0.25, 0.75]) {
    g.beginPath(); g.moveTo(1024 * (s - 0.2), 360); g.quadraticCurveTo(1024 * s, 260, 1024 * (s + 0.2), 330);
    g.lineTo(1024 * (s + 0.2), 360); g.quadraticCurveTo(1024 * s, 300, 1024 * (s - 0.2), 390); g.closePath(); g.fill();
  }
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}

export function createDriverHelmet(spec = HELMET_SPEC) {
  const S = { ...HELMET_SPEC, ...spec };
  const group = new THREE.Group();
  group.name = 'Assembly_Driver_Helmet';
  group.position.set(...S.centre);

  const d2r = THREE.MathUtils.degToRad;
  // azimuth a: 0 = straight ahead (-X), +90 = left (+Y); elevation e in radians
  const dir = (a, e) => new THREE.Vector3(-Math.cos(a) * Math.cos(e), Math.sin(a) * Math.cos(e), Math.sin(e));
  /** distance from the head centre to the shell along a direction (superellipsoid) */
  const radius = (a, e) => {
    const d = dir(a, e);
    const ax = d.x < 0 ? S.front : S.rear;
    // chin bar: the lower front pushes forward a little
    const chin = d.x < 0 && d.z < 0 ? 1 + 0.14 * Math.min(1, -d.z * 2) * Math.cos(a) ** 2 : 1;
    const n = S.sideFlat;
    const f = Math.abs(d.x / (ax * chin)) ** n + Math.abs(d.y / S.halfWidth) ** n + Math.abs(d.z / S.top) ** 2.2;
    return 1 / Math.pow(f, 1 / n);
  };
  const surf = (a, e, lift = 0) => dir(a, e).multiplyScalar(radius(a, e) + lift);
  /** lowest elevation of the shell at azimuth a (rim drops toward the chin) */
  const rimEl = (a) => {
    const zr = THREE.MathUtils.lerp(S.rimRear, S.rimFront, Math.max(0, Math.cos(a)) ** 1.5);
    return Math.asin(THREE.MathUtils.clamp(zr / (S.top + 0.05), -1, 1));
  };

  /** thin patch on the shell between azimuths a0..a1 and elevations e0..e1, raised by lift */
  function patch(a0, a1, e0, e1, lift, mat, name, na = 24, ne = 8, thick = 0) {
    const pos = [], uv = [], idx = [];
    const layers = thick > 0 ? 2 : 1;
    for (let L = 0; L < layers; L++) for (let i = 0; i <= na; i++) for (let j = 0; j <= ne; j++) {
      const t = i / na, E0 = typeof e0 === 'function' ? e0(t) : e0, E1 = typeof e1 === 'function' ? e1(t) : e1;
      const a = a0 + (a1 - a0) * t, e = E0 + (E1 - E0) * (j / ne);
      const p = surf(a, e, lift + (L ? thick : 0)); pos.push(p.x, p.y, p.z); uv.push(i / na, j / ne);
    }
    const id = (L, i, j) => L * (na + 1) * (ne + 1) + i * (ne + 1) + j;
    for (let L = 0; L < layers; L++) for (let i = 0; i < na; i++) for (let j = 0; j < ne; j++) {
      const q = [id(L, i, j), id(L, i + 1, j), id(L, i + 1, j + 1), id(L, i, j + 1)];
      if (L === 0) idx.push(q[0], q[2], q[1], q[0], q[3], q[2]); else idx.push(q[0], q[1], q[2], q[0], q[2], q[3]);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx); g.computeVertexNormals();
    const m = new THREE.Mesh(g, mat); m.name = name; m.castShadow = true;
    return m;
  }

  // ---- Materials (helmet paint is its own gloss clear-coat, not the car's matte paint)
  const shellMat = new THREE.MeshPhysicalMaterial({ map: helmetTexture(S.colours), roughness: 0.28, metalness: 0.05, clearcoat: 1.0, clearcoatRoughness: 0.06 });
  shellMat.name = 'Helmet_GlossPaint';
  const visorMat = new THREE.MeshPhysicalMaterial({ color: 0x2c3858, roughness: 0.12, metalness: 0.35, envMapIntensity: 1.6, sheen: 0.6, sheenColor: 0x6a4cff, clearcoat: 1, clearcoatRoughness: 0.02, iridescence: 0.6, iridescenceIOR: 1.6, side: THREE.DoubleSide });
  visorMat.name = 'Helmet_Visor_SmokedIridium';
  const blackTrim = new THREE.MeshStandardMaterial({ color: 0x0a0b0d, roughness: 0.55, metalness: 0.1, side: THREE.DoubleSide });
  blackTrim.name = 'Helmet_BlackRubberTrim';
  const zylon = materials.carbonGlossAero || blackTrim;
  const nomex = new THREE.MeshStandardMaterial({ color: 0x141518, roughness: 0.95, metalness: 0 });
  nomex.name = 'Driver_Nomex_Fabric';

  // ---- Shell: one surface from the rim to the crown, open underneath (the neck goes there)
  {
    const NA = 72, NE = 28, pos = [], uv = [], idx = [];
    for (let i = 0; i <= NA; i++) {
      const u = i / NA, a = Math.PI + u * 2 * Math.PI; // start at the back so the seam is hidden
      const e0 = rimEl(a);
      for (let j = 0; j <= NE; j++) {
        const v = j / NE, e = e0 + (Math.PI / 2 - 1e-3 - e0) * v;
        const p = surf(a, e); pos.push(p.x, p.y, p.z); uv.push(u, v);
      }
    }
    for (let i = 0; i < NA; i++) for (let j = 0; j < NE; j++) {
      const a = i * (NE + 1) + j, b = (i + 1) * (NE + 1) + j;
      idx.push(a, b + 1, b, a, a + 1, b + 1);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx); g.computeVertexNormals();
    // make sure the outside faces outward (flip if the winding came out inside-out)
    const n0 = new THREE.Vector3().fromBufferAttribute(g.attributes.normal, NE);
    const p0 = new THREE.Vector3().fromBufferAttribute(g.attributes.position, NE);
    if (n0.dot(p0) < 0) { g.index.array.reverse(); g.computeVertexNormals(); }
    const shell = new THREE.Mesh(g, shellMat);
    shell.name = 'Helmet_OuterShell'; shell.castShadow = true;
    group.add(shell);
    // dark liner seen through the neck opening
    const liner = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 1, side: THREE.BackSide }));
    liner.name = 'Helmet_InnerLiner';
    liner.scale.setScalar(0.985); // just inside the shell so the two never fight for the same pixels
    group.add(liner);
  }

  // ---- Visor (smoked iridium), its rubber seal and the peak
  const V = S.visor;
  const vs = (t) => Math.abs(2 * t - 1) ** 3;            // 0 in the middle, 1 at the visor ends
  const vLo = (t) => V.elLo + V.cornerRise * vs(t), vHi = (t) => V.elHi - V.cornerDrop * vs(t);
  group.add(patch(d2r(-V.az), d2r(V.az), vLo, vHi, 0.012, visorMat, 'Helmet_Visor_Polycarbonate', 48, 8, 0.012));
  // seal: a thin raised frame round the visor opening (follows the rounded outline)
  const seal = new THREE.Group(); seal.name = 'Helmet_VisorGasket';
  seal.add(patch(d2r(-V.az), d2r(V.az), (t) => vLo(t) - 0.035, vLo, 0.018, blackTrim, 'Helmet_VisorGasket_Lower', 48, 2));
  seal.add(patch(d2r(-V.az - 3), d2r(-V.az), vLo(0), vHi(0), 0.018, blackTrim, 'Helmet_VisorGasket_Right', 2, 8));
  seal.add(patch(d2r(V.az), d2r(V.az + 3), vLo(1), vHi(1), 0.018, blackTrim, 'Helmet_VisorGasket_Left', 2, 8));
  group.add(seal);
  const St = S.strip;
  group.add(patch(d2r(-St.az), d2r(St.az), St.elLo, St.elHi, 0.014, zylon, 'Helmet_BallisticZylonStrip', 32, 3, 0.01));
  // peak: a short lip standing out from the shell above the strip, tilted slightly up
  {
    const P = S.peak, na = 32, pos = [], idx = [];
    for (let i = 0; i <= na; i++) {
      const a = d2r(-P.az + (2 * P.az) * (i / na));
      const fall = Math.cos((i / na - 0.5) * Math.PI) ** 0.5; // the lip fades out toward the sides
      const base = surf(a, P.el, 0.012), outD = dir(a, P.el).setZ(0).normalize();
      const tip = base.clone().addScaledVector(outD, P.out * fall).add(new THREE.Vector3(0, 0, 0.025 * fall));
      const base2 = base.clone().add(new THREE.Vector3(0, 0, 0.03));
      pos.push(base.x, base.y, base.z, tip.x, tip.y, tip.z, base2.x, base2.y, base2.z);
    }
    for (let i = 0; i < na; i++) {
      const k = i * 3, n = k + 3;
      idx.push(k, n, n + 1, k, n + 1, k + 1);       // underside
      idx.push(k + 1, n + 1, n + 2, k + 1, n + 2, k + 2); // top
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
    const peak = new THREE.Mesh(g, new THREE.MeshPhysicalMaterial({ color: 0x101114, roughness: 0.3, clearcoat: 1, side: THREE.DoubleSide }));
    peak.name = 'Helmet_VisorPeak'; peak.castShadow = true;
    group.add(peak);
  }
  // visor pivot covers, flush on each temple
  [1, -1].forEach(s => {
    const a = d2r(s * 90), pv = S.pivot;
    group.add(patch(a - pv.r / 1.12, a + pv.r / 1.12, pv.el - pv.r / 1.2, pv.el + pv.r / 1.2, 0.02, blackTrim, `Helmet_VisorPivot_${s > 0 ? 'Left' : 'Right'}`, 6, 6, 0.012));
  });
  // chin vents: two small dark slots on the chin bar
  S.chinVents.forEach((cvt, k) => {
    group.add(patch(d2r(cvt.az - 6), d2r(cvt.az + 6), cvt.el - 0.05, cvt.el + 0.05, 0.006, blackTrim, `Helmet_ChinVent_${k}`, 6, 2));
  });
  // rear spoiler: small wing on the crown, rising toward the back
  {
    const sp = S.spoiler, pos = [], idx = [], ny = 12;
    for (let i = 0; i <= ny; i++) {
      const y = -sp.halfSpan + (2 * sp.halfSpan) * (i / ny);
      const a = Math.PI - Math.atan2(y, S.rear), base = surf(a, sp.el, 0.01);
      const tip = base.clone().add(new THREE.Vector3(sp.chord, 0, sp.rise));
      pos.push(base.x, base.y, base.z, tip.x, tip.y, tip.z, base.x - 0.12, base.y, base.z + 0.06);
    }
    for (let i = 0; i < ny; i++) { const k = i * 3, n = k + 3; idx.push(k, k + 1, n + 1, k, n + 1, n, k + 2, n + 2, n + 1, k + 2, n + 1, k + 1); }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
    const spoiler = new THREE.Mesh(g, new THREE.MeshPhysicalMaterial({ color: 0x15171c, roughness: 0.35, clearcoat: 1, side: THREE.DoubleSide }));
    spoiler.name = 'Helmet_RearSpoiler'; spoiler.castShadow = true;
    group.add(spoiler);
  }

  // ---- HANS: anchor posts on the helmet, tethers, carbon yoke on the shoulders
  const hans = new THREE.Group(); hans.name = 'Driver_HANS_Device';
  const yokeZ = S.rimRear - 0.55;
  [1, -1].forEach(s => {
    const a = d2r(s * S.hansPosts.az), e = S.hansPosts.el;
    const p = surf(a, e), n = dir(a, e);
    const post = new THREE.Group(); post.name = `Helmet_HANSPost_${s > 0 ? 'Left' : 'Right'}`;
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.085, 0.07, 16), materials.titaniumAnodized || blackTrim);
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 8), materials.titaniumBright || blackTrim);
    knob.position.y = 0.06;
    post.add(base, knob);
    post.position.copy(p); post.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), n);
    group.add(post);
    // tether from the post down to the back of the yoke
    const tip = p.clone().addScaledVector(n, 0.06);
    const anchor = new THREE.Vector3(S.rear * 0.45, s * 0.72, yokeZ + 0.12);
    const curve = new THREE.CatmullRomCurve3([tip, tip.clone().lerp(anchor, 0.5).add(new THREE.Vector3(0.05, 0, -0.03)), anchor]);
    const tether = new THREE.Mesh(new THREE.TubeGeometry(curve, 8, 0.02, 6), blackTrim);
    tether.name = `HANS_Tether_${s > 0 ? 'Left' : 'Right'}`;
    hans.add(tether);
  });
  {
    // yoke: a flattened U behind the neck running forward over both shoulders
    const pts = [];
    for (let i = 0; i <= 16; i++) {
      const t = i / 16, ang = -Math.PI / 2 + Math.PI * t;     // -90 (right) .. +90 (left)
      pts.push(new THREE.Vector3(S.rear * 0.55 * Math.cos(ang) - 0.55 * (1 - Math.cos(ang)), 0.95 * Math.sin(ang), yokeZ + 0.12 * Math.cos(ang)));
    }
    const yokeGeo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 0.09, 8);
    yokeGeo.scale(1, 1, 1);
    const yoke = new THREE.Mesh(yokeGeo, materials.carbonGlossAero || blackTrim);
    yoke.name = 'HANS_Carbon_Yoke'; yoke.castShadow = true;
    hans.add(yoke);
  }
  group.add(hans);
  // neck in a fireproof balaclava so the open bottom of the helmet never shows daylight
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.58, 1.0, 20), nomex);
  neck.rotation.x = Math.PI / 2; neck.position.set(0.15, 0, S.rimRear - 0.35);
  neck.name = 'Driver_Neck_Balaclava';
  group.add(neck);

  group.userData.helmetSpec = S;
  return group;
}
