/**
 * Reusable wing-element builder (front wing, rear wing, any aerofoil on the car).
 * Everything is described by data so a game/editor can tweak wings without new code.
 *
 * Frame: CAD car frame (X nose -> tail, +Y left, +Z up), units dm. The element is built in the
 * caller's local frame. Downforce wings are "upside-down" aerofoils: the curved side faces the
 * ground and a positive angle of attack lifts the trailing edge (Z grows toward the back).
 *
 * spec = {
 *   y0, y1        span limits (dm)
 *   le(yn)        -> [x, z] of the leading edge at normalised span yn (0 at y0, 1 at y1)
 *   chord(yn)     chord length (dm)
 *   aoa(yn)       angle of attack (rad), + = trailing edge up
 *   thickness     max thickness as a fraction of chord (e.g. 0.08)
 *   camber        max camber as a fraction of chord (e.g. 0.06), curved side down
 *   ns, nc        span and chord resolution
 *   caps          close the two tips (default true)
 * }
 */
import * as THREE from 'three';

function naca(xc, t, m, p = 0.4) {
  const yt = 5 * t * (0.2969 * Math.sqrt(xc) - 0.126 * xc - 0.3516 * xc ** 2 + 0.2843 * xc ** 3 - 0.1036 * xc ** 4);
  const yc = xc < p ? (m / p ** 2) * (2 * p * xc - xc ** 2) : (m / (1 - p) ** 2) * ((1 - 2 * p) + 2 * p * xc - xc ** 2);
  return { yt, yc };
}

export function wingElementGeometry(spec) {
  const S = { thickness: 0.08, camber: 0.05, ns: 24, nc: 18, caps: true, aoa: () => 0, ...spec };
  // profile ring: upper surface TE->LE then lower surface LE->TE (cosine spacing)
  const ring = [];
  for (let i = 0; i <= S.nc; i++) ring.push({ xc: 0.5 * (1 + Math.cos(Math.PI * i / S.nc)), up: true });
  for (let i = 1; i < S.nc; i++) ring.push({ xc: 0.5 * (1 - Math.cos(Math.PI * i / S.nc)), up: false });
  const nr = ring.length;
  const pos = [], uv = [], idx = [];
  const section = (j) => {
    const yn = j / S.ns, y = S.y0 + (S.y1 - S.y0) * yn;
    const [xl, zl] = S.le(yn), c = S.chord(yn), a = S.aoa(yn), ca = Math.cos(a), sa = Math.sin(a);
    return ring.map(({ xc, up }) => {
      const { yt, yc } = naca(Math.max(1e-4, xc), S.thickness, S.camber);
      const h = -yc + (up ? yt : -yt);          // inverted camber: curved side faces down
      const px = xc * c, pz = h * c;
      return [xl + px * ca - pz * sa, y, zl + px * sa + pz * ca];
    });
  };
  for (let j = 0; j <= S.ns; j++) section(j).forEach((p, i) => { pos.push(...p); uv.push(i / nr, j / S.ns); });
  for (let j = 0; j < S.ns; j++) for (let i = 0; i < nr; i++) {
    const a = j * nr + i, b = j * nr + (i + 1) % nr, c = (j + 1) * nr + (i + 1) % nr, d = (j + 1) * nr + i;
    idx.push(a, b, c, a, c, d);
  }
  if (S.caps) {
    for (const j of [0, S.ns]) {
      const pts = section(j); const cIdx = pos.length / 3;
      const cen = pts.reduce((s, p) => [s[0] + p[0] / nr, s[1] + p[1] / nr, s[2] + p[2] / nr], [0, 0, 0]);
      pos.push(...cen); uv.push(0.5, j ? 1 : 0);
      for (let i = 0; i < nr; i++) {
        const a = j * nr + i, b = j * nr + (i + 1) % nr;
        if (j === 0) idx.push(cIdx, b, a); else idx.push(cIdx, a, b);
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  // make the faces point outward whichever way the span runs: the mid-upper vertex must face up
  const k = Math.floor(S.ns / 2) * nr + Math.floor(S.nc / 2);
  if (g.attributes.normal.getZ(k) < 0) {
    const ar = g.index.array;
    for (let q = 0; q < ar.length; q += 3) { const t = ar[q]; ar[q] = ar[q + 1]; ar[q + 1] = t; }
    g.index.needsUpdate = true; g.computeVertexNormals();
  }
  return g;
}

/** leading/trailing edge points of an element at normalised span yn (handy for stacking slots) */
export function elementEdges(spec, yn) {
  const [xl, zl] = spec.le(yn), c = spec.chord(yn), a = (spec.aoa || (() => 0))(yn);
  return { le: [xl, zl], te: [xl + c * Math.cos(a), zl + c * Math.sin(a)] };
}

export function createWingElement(spec, material, name) {
  const m = new THREE.Mesh(wingElementGeometry(spec), material);
  m.name = name; m.castShadow = true; m.receiveShadow = true;
  m.userData.wingSpec = spec;
  return m;
}
