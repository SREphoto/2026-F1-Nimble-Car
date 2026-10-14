/**
 * body_center_v4.js — main body / centre section, rebuilt from scratch (body v4).
 * Units dm, X nose -> tail (front axle X 0, rear axle X 34), Y + = car left, Z up.
 *
 * Built like the reference CAD part list (Blender W17 tree / exploded parts sheet):
 *   Body_Sidepods          LH/RH sidepod shells (Sidepod_Body_LH/RH). Each one is lofted around a
 *                          rounded RIDGE that is swept along its own 3D spline: high at the front
 *                          beside the cockpit, curving out, then down and inward to the floor ahead
 *                          of the rear tyre (the "broken donut" around the driver). Under the
 *                          ridge: a short flat flank and a deep undercut down to the floor.
 *   Body_Radiators         the short square inlet mouths under the front of each ridge.
 *   Body_Top_Engine_Cover  smooth sweeping hump between the ridges, with a centre seam.
 *   Body_Rear              tail closure over the gearbox.
 * Everything is data (BODY_V4_SPEC) so the shape can be tuned without touching the builder.
 */
import * as THREE from 'three';

export const BODY_V4_SPEC = {
  floorZ: 0.5,
  // Ridge spline per side (left side; mirrored for the right). r = ridge tube radius.
  ridge: [
    { x: 9.6, y: 4.55, z: 4.75, r: 0.5 },
    { x: 10.6, y: 5.05, z: 4.85, r: 0.62 },
    { x: 12.5, y: 5.45, z: 4.8, r: 0.7 },
    { x: 15.0, y: 5.6, z: 4.6, r: 0.74 },
    { x: 18.0, y: 5.45, z: 4.2, r: 0.74 },
    { x: 21.0, y: 5.05, z: 3.65, r: 0.7 },
    { x: 24.0, y: 4.5, z: 3.0, r: 0.62 },
    { x: 27.0, y: 3.8, z: 2.3, r: 0.5 },
    { x: 29.5, y: 3.2, z: 1.7, r: 0.38 },
    { x: 31.2, y: 2.8, z: 1.3, r: 0.28 },
  ],
  // Pod body under / inboard of the ridge, per station (left side):
  //  zFl  bottom of the flat flank = top of the undercut
  //  yUc  how far inboard the undercut reaches at floor level
  //  yIn  inner wall (hidden inside tub / under the engine cover)
  //  zIn  height where the pod top meets the tub rim or tucks under the engine cover
  //  dip  depth of the gully between the ridge and the cover
  //  zBot pod bottom: the inlet box floats at the front, the pod reaches the floor further back
  pod: [
    { x: 9.6, zFl: 2.35, zBot: 2.2, yUc: 3.55, yIn: 3.0, zIn: 4.35, dip: 0.05 },
    { x: 10.6, zFl: 2.15, zBot: 1.55, yUc: 3.35, yIn: 3.0, zIn: 4.3, dip: 0.1 },
    { x: 12.5, zFl: 2.0, zBot: 0.8, yUc: 3.25, yIn: 3.0, zIn: 4.35, dip: 0.15 },
    { x: 15.0, zFl: 1.9, zBot: 0.54, yUc: 3.25, yIn: 2.8, zIn: 4.55, dip: 0.22 },
    { x: 18.0, zFl: 1.75, zBot: 0.54, yUc: 3.05, yIn: 2.3, zIn: 4.6, dip: 0.22 },
    { x: 21.0, zFl: 1.55, zBot: 0.54, yUc: 2.95, yIn: 1.8, zIn: 4.15, dip: 0.2 },
    { x: 24.0, zFl: 1.35, zBot: 0.54, yUc: 2.85, yIn: 1.45, zIn: 3.6, dip: 0.16 },
    { x: 27.0, zFl: 1.1, zBot: 0.54, yUc: 2.35, yIn: 1.2, zIn: 3.0, dip: 0.1 },
    { x: 29.5, zFl: 0.9, zBot: 0.54, yUc: 1.95, yIn: 1.05, zIn: 2.4, dip: 0.05 },
    { x: 31.2, zFl: 0.75, zBot: 0.54, yUc: 1.8, yIn: 1.0, zIn: 1.85, dip: 0.0 },
  ],
  // Engine cover: half width w at its base (base sits inside the pods), base height zb, crown zt,
  // n = shoulder squareness, seam = centre crease depth.
  cover: [
    { x: 15.5, w: 2.45, zb: 4.3, zt: 5.75, n: 2.4 },
    { x: 16.6, w: 2.6, zb: 4.25, zt: 7.35, n: 2.4 },
    { x: 18.0, w: 2.55, zb: 4.1, zt: 7.65, n: 2.5 },
    { x: 20.0, w: 2.4, zb: 3.75, zt: 7.15, n: 2.6 },
    { x: 22.5, w: 2.15, zb: 3.3, zt: 6.4, n: 2.6 },
    { x: 25.0, w: 2.0, zb: 2.85, zt: 5.85, n: 2.5 },
    { x: 27.5, w: 1.95, zb: 2.45, zt: 5.45, n: 2.5 },
    { x: 30.0, w: 1.8, zb: 2.1, zt: 4.95, n: 2.5 },
    { x: 32.5, w: 1.35, zb: 2.3, zt: 4.7, n: 2.4 },
    { x: 34.7, w: 0.85, zb: 2.7, zt: 4.25, n: 2.3 },
  ],
  seam: 0.06,
  inlet: { lip: 0.09, depth: 0.7 },
  step: 0.4, // loft station spacing (dm)
};

// ---- helpers -------------------------------------------------------------------------------
const lerp = THREE.MathUtils.lerp;
const sgnPow = (v, p) => Math.sign(v) * Math.pow(Math.abs(v), p);

/** Catmull-Rom interpolation of every numeric field of a station table at x. */
function sampler(table) {
  const keys = Object.keys(table[0]).filter((k) => k !== 'x');
  return (x) => {
    let i = 0;
    while (i < table.length - 2 && x > table[i + 1].x) i++;
    const p1 = table[i], p2 = table[i + 1];
    const p0 = table[Math.max(0, i - 1)], p3 = table[Math.min(table.length - 1, i + 2)];
    const t = THREE.MathUtils.clamp((x - p1.x) / (p2.x - p1.x), 0, 1);
    const out = { x };
    const t2 = t * t, t3 = t2 * t;
    keys.forEach((k) => {
      const a = p0[k], b = p1[k], c = p2[k], d = p3[k];
      out[k] = 0.5 * ((2 * b) + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
    });
    return out;
  };
}
const qbez = (a, c, b, t) => [(1 - t) * (1 - t) * a[0] + 2 * (1 - t) * t * c[0] + t * t * b[0], (1 - t) * (1 - t) * a[1] + 2 * (1 - t) * t * c[1] + t * t * b[1]];
const cbez = (a, c1, c2, b, t) => { const u = 1 - t; return [u * u * u * a[0] + 3 * u * u * t * c1[0] + 3 * u * t * t * c2[0] + t * t * t * b[0], u * u * u * a[1] + 3 * u * u * t * c1[1] + 3 * u * t * t * c2[1] + t * t * t * b[1]]; };

/** Loft rings (array of arrays of [x,y,z]) into an indexed grid. closed = ring wraps. */
function gridGeometry(rings, closed, flip = false) {
  const rows = rings.length, cols = rings[0].length;
  const pos = [], uv = [], idx = [];
  rings.forEach((r, i) => r.forEach((p, j) => { pos.push(...p); uv.push(i / (rows - 1), j / (cols - (closed ? 0 : 1))); }));
  const jm = closed ? cols : cols - 1;
  for (let i = 0; i < rows - 1; i++) for (let j = 0; j < jm; j++) {
    const a = i * cols + j, b = i * cols + (j + 1) % cols, c = (i + 1) * cols + (j + 1) % cols, d = (i + 1) * cols + j;
    if (flip) idx.push(a, c, b, a, d, c); else idx.push(a, b, c, a, c, d);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  g.userData.quadGrid = { rows, cols, closed };
  return g;
}

/** Fan cap over a ring (centroid fan). */
function capGeometry(ring, flip = false) {
  const c = ring.reduce((s, p) => [s[0] + p[0], s[1] + p[1], s[2] + p[2]], [0, 0, 0]).map((v) => v / ring.length);
  const pos = [...c], idx = [];
  ring.forEach((p) => pos.push(...p));
  for (let j = 0; j < ring.length; j++) { const a = 1 + j, b = 1 + (j + 1) % ring.length; flip ? idx.push(0, b, a) : idx.push(0, a, b); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx); g.computeVertexNormals();
  return g;
}

/** Make sure a closed loft's normals point outward (test against the ring centroid). */
function orientOutward(rings, closed) {
  const r = rings[Math.floor(rings.length / 2)], r2 = rings[Math.floor(rings.length / 2) + 1];
  const c = [0, r.reduce((a, p) => a + p[1], 0) / r.length, r.reduce((a, p) => a + p[2], 0) / r.length];
  const j = 3, p = r[j], q = r[(j + 1) % r.length], d = r2[j];
  const e1 = new THREE.Vector3(q[0] - p[0], q[1] - p[1], q[2] - p[2]), e2 = new THREE.Vector3(d[0] - p[0], d[1] - p[1], d[2] - p[2]);
  const n = new THREE.Vector3().crossVectors(e1, e2); // normal for winding (a,b,c)
  const out = new THREE.Vector3(0, p[1] - c[1], p[2] - c[2]);
  return n.dot(out) < 0; // flip needed
}

// ---- sections ------------------------------------------------------------------------------
const N_ARC = 22, N_GULLY = 10, N_WALL = 5, N_BOT = 4, N_UC = 10, N_FL = 6;
const A0 = -1.0, A1 = 2.2; // ridge arc range (rad): outer-lower -> over the top -> inner-upper

/** Left-side pod section at x: closed ring of [y,z]. */
function podSection(R, P, floorZ) {
  const pts = [];
  const arc = (a) => [R.y + R.r * Math.cos(a), R.z + R.r * Math.sin(a)];
  for (let k = 0; k < N_ARC; k++) pts.push(arc(A0 + (A1 - A0) * k / N_ARC)); // ridge (swept tube)
  const g0 = arc(A1);
  const gEnd = [P.yIn, P.zIn];
  const gc = [(g0[0] + gEnd[0]) / 2, Math.min(g0[1], gEnd[1]) - P.dip];
  for (let k = 0; k < N_GULLY; k++) pts.push(qbez(g0, gc, gEnd, k / N_GULLY)); // gully to tub/cover
  const zB = Math.max(floorZ + 0.04, P.zBot);
  for (let k = 0; k < N_WALL; k++) pts.push([P.yIn, lerp(P.zIn, zB, k / N_WALL)]); // inner wall
  for (let k = 0; k < N_BOT; k++) pts.push([lerp(P.yIn, P.yUc, k / N_BOT), zB]); // floor contact
  const a0 = arc(A0);
  const fBot = [a0[0] - 0.12, P.zFl];
  // undercut: deep concave scoop from the floor up and out to the flank bottom
  for (let k = 0; k < N_UC; k++) pts.push(cbez([P.yUc, zB], [P.yUc + 0.05, lerp(zB, P.zFl, 0.75)], [lerp(P.yUc, fBot[0], 0.55), P.zFl - 0.05], fBot, k / N_UC));
  // flat flank up to the ridge (very slight outward bow)
  for (let k = 0; k < N_FL; k++) { const t = k / N_FL; pts.push([lerp(fBot[0], a0[0], t) + 0.1 * Math.sin(Math.PI * t), lerp(fBot[1], a0[1], t)]); }
  return pts;
}

function coverSection(C, seam, M = 40) {
  const pts = [];
  for (let k = 0; k <= M; k++) {
    const t = Math.PI * k / M; // 0 = +Y base, PI = -Y base
    const y = C.w * sgnPow(Math.cos(t), 2 / C.n);
    let z = C.zb + (C.zt - C.zb) * Math.pow(Math.sin(t), 2 / C.n);
    z -= seam * Math.min(1, Math.abs(y) / 0.35); // centre seam: a crisp crease line along the spine
    pts.push([y, z + seam]);
  }
  return pts;
}

// ---- builder ------------------------------------------------------------------------------
export function createBodyCenterV4({ paint, carbon, dark, spec = BODY_V4_SPEC } = {}) {
  const S = spec;
  const body = new THREE.Group();
  body.name = 'Body_Center_V4';
  const ridgeAt = sampler(S.ridge), podAt = sampler(S.pod), coverAt = sampler(S.cover);
  const darkMat = dark || new THREE.MeshStandardMaterial({ color: 0x050607, roughness: 0.95, side: THREE.DoubleSide });

  // ---------------- sidepods ----------------
  const pods = new THREE.Group(); pods.name = 'Body_Sidepods';
  const radiators = new THREE.Group(); radiators.name = 'Body_Radiators';
  const x0 = S.ridge[0].x, x1 = S.ridge[S.ridge.length - 1].x;
  const nSt = Math.round((x1 - x0) / S.step);
  [1, -1].forEach((s) => {
    const tag = s > 0 ? 'LH' : 'RH';
    const rings = [];
    for (let i = 0; i <= nSt; i++) {
      const x = lerp(x0, x1, i / nSt);
      rings.push(podSection(ridgeAt(x), podAt(x), S.floorZ).map(([y, z]) => [x, s * y, z]));
    }
    const flip = orientOutward(rings, true);
    const geo = gridGeometry(rings, true, flip);
    const m = new THREE.Mesh(geo, paint);
    m.name = `Sidepod_Body_${tag}`;
    m.castShadow = m.receiveShadow = true;
    m.userData.ridge = S.ridge.map((p) => ({ ...p, y: s * p.y })); // spline for decals
    pods.add(m);
    // rear closure (small painted cap at the tail of the pod)
    const tail = rings[rings.length - 1];
    const tc = new THREE.Mesh(capGeometry(tail, !flip), paint); tc.name = `Sidepod_TailCap_${tag}`; pods.add(tc);

    // inlet: carbon lip just inside the front ring, dark recessed mouth behind it
    const front = rings[0];
    const cy = front.reduce((a, p) => a + p[1], 0) / front.length, cz = front.reduce((a, p) => a + p[2], 0) / front.length;
    const shrink = (p, k) => [p[0], cy + (p[1] - cy) * k, cz + (p[2] - cz) * k];
    const lipRings = [front.map((p) => [p[0] - 0.01, p[1], p[2]]), front.map((p) => shrink([p[0] + 0.12, p[1], p[2]], 0.9))];
    const lip = new THREE.Mesh(gridGeometry(lipRings, true, !flip), carbon); lip.name = `Sidepod_InletLip_${tag}`; radiators.add(lip);
    const mouth = new THREE.Mesh(gridGeometry([lipRings[1], front.map((p) => shrink([p[0] + S.inlet.depth, p[1], p[2]], 0.82))], true, !flip), darkMat);
    mouth.name = `Sidepod_InletDuct_${tag}`; radiators.add(mouth);
    const back = new THREE.Mesh(capGeometry(front.map((p) => shrink([p[0] + S.inlet.depth, p[1], p[2]], 0.82)), flip), darkMat);
    back.name = `Sidepod_InletMouth_${tag}`; radiators.add(back);
  });
  body.add(pods); body.add(radiators);

  // ---------------- engine cover ----------------
  const ecGroup = new THREE.Group(); ecGroup.name = 'Body_Top_Engine_Cover';
  const cx0 = S.cover[0].x, cx1 = S.cover[S.cover.length - 1].x;
  const nC = Math.round((cx1 - cx0) / S.step);
  const crings = [];
  for (let i = 0; i <= nC; i++) {
    const x = lerp(cx0, cx1, i / nC);
    crings.push(coverSection(coverAt(x), S.seam).map(([y, z]) => [x, y, z]));
  }
  // open ring (base edges hidden inside the pods): decide winding from the crown normal (+Z)
  let ecGeo = gridGeometry(crings, false, false);
  {
    const n = ecGeo.attributes.normal; const mid = Math.floor(crings.length / 2) * crings[0].length + Math.floor(crings[0].length / 2);
    if (n.getZ(mid) < 0) ecGeo = gridGeometry(crings, false, true);
  }
  const ec = new THREE.Mesh(ecGeo, paint);
  ec.name = 'EngineCover_MainShell';
  ec.castShadow = ec.receiveShadow = true;
  ecGroup.add(ec);
  // front face behind the headrest and rear tail closure
  const ecFront = new THREE.Mesh(capGeometry(crings[0]), paint); ecFront.name = 'EngineCover_FrontBulkheadCap'; ecGroup.add(ecFront);
  body.add(ecGroup);
  const rear = new THREE.Group(); rear.name = 'Body_Rear';
  const tailCap = new THREE.Mesh(capGeometry(crings[crings.length - 1]), paint); tailCap.name = 'EngineCover_TailCap';
  rear.add(tailCap); body.add(rear);
  body.userData.spec = S;
  return body;
}
