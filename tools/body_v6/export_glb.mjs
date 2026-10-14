// node tools/body_v6/export_glb.mjs out.glb  -> one named mesh per v6 body piece (dm units, Z up as in CAD;
// a root node rotates -90 deg about X so glTF viewers show it Y-up). extras carry explode + function.
import { writeFileSync } from 'fs';
import { buildBodyV6 } from '../../cad/body_pieces_v6_core.js';
const pieces = buildBodyV6({ logoPlates: true });
const colors = { paint: [0.11, 0.14, 0.26, 1], carbon: [0.08, 0.08, 0.08, 1], dark: [0.02, 0.02, 0.02, 1], logo: [0.85, 0.1, 0.1, 1] };
const matNames = Object.keys(colors);
const bufs = []; let off = 0; const views = [], accs = [], meshes = [], nodes = [];
const addView = (arr, target) => { const b = Buffer.from(arr.buffer); views.push({ buffer: 0, byteOffset: off, byteLength: b.length, target }); bufs.push(b); off += b.length; const pad = (4 - (off % 4)) % 4; if (pad) { bufs.push(Buffer.alloc(pad)); off += pad; } return views.length - 1; };
pieces.forEach((p) => {
  const pos = new Float32Array(p.positions), idx = new Uint32Array(p.indices);
  const nrm = new Float32Array(pos.length);
  for (let i = 0; i < idx.length; i += 3) { const [a, b, c] = [idx[i] * 3, idx[i + 1] * 3, idx[i + 2] * 3];
    const e1 = [0, 1, 2].map((k) => pos[b + k] - pos[a + k]), e2 = [0, 1, 2].map((k) => pos[c + k] - pos[a + k]);
    const n = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]];
    [a, b, c].forEach((v) => { for (let k = 0; k < 3; k++) nrm[v + k] += n[k]; }); }
  for (let i = 0; i < nrm.length; i += 3) { const l = Math.hypot(nrm[i], nrm[i + 1], nrm[i + 2]) || 1; nrm[i] /= l; nrm[i + 1] /= l; nrm[i + 2] /= l; }
  const mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9]; for (let i = 0; i < pos.length; i++) { mn[i % 3] = Math.min(mn[i % 3], pos[i]); mx[i % 3] = Math.max(mx[i % 3], pos[i]); }
  const vp = addView(pos, 34962), vn = addView(nrm, 34962), vi = addView(idx, 34963);
  accs.push({ bufferView: vp, componentType: 5126, count: pos.length / 3, type: 'VEC3', min: mn, max: mx }, { bufferView: vn, componentType: 5126, count: pos.length / 3, type: 'VEC3' }, { bufferView: vi, componentType: 5125, count: idx.length, type: 'SCALAR' });
  const a = accs.length - 3;
  meshes.push({ name: p.name, primitives: [{ attributes: { POSITION: a, NORMAL: a + 1 }, indices: a + 2, material: matNames.indexOf(p.material) }] });
  nodes.push({ name: p.name, mesh: meshes.length - 1, extras: { group: p.group, explode_dm: p.explode, function: p.function } });
});
const kids = nodes.map((_, i) => i);
nodes.push({ name: 'Body_Main_V6', rotation: [-Math.SQRT1_2, 0, 0, Math.SQRT1_2], scale: [0.1, 0.1, 0.1], children: kids, extras: { units: 'node children in dm (CAD X nose->tail, Z up); root scales to metres and rotates to glTF Y-up' } });
const gltf = { asset: { version: '2.0', generator: 'MPLS body_v6 export_glb.mjs' }, scene: 0, scenes: [{ nodes: [nodes.length - 1] }], nodes, meshes, accessors: accs, bufferViews: views,
  buffers: [{ byteLength: off }], materials: matNames.map((n) => ({ name: `Body_${n}`, doubleSided: true, pbrMetallicRoughness: { baseColorFactor: colors[n], metallicFactor: 0, roughnessFactor: 0.5 } })) };
let js = Buffer.from(JSON.stringify(gltf)); js = Buffer.concat([js, Buffer.alloc((4 - js.length % 4) % 4, 0x20)]);
const bin = Buffer.concat(bufs);
const hdr = Buffer.alloc(12); hdr.writeUInt32LE(0x46546c67, 0); hdr.writeUInt32LE(2, 4); hdr.writeUInt32LE(12 + 8 + js.length + 8 + bin.length, 8);
const ch = (len, type) => { const b = Buffer.alloc(8); b.writeUInt32LE(len, 0); b.writeUInt32LE(type, 4); return b; };
writeFileSync(process.argv[2] || 'body_v6.glb', Buffer.concat([hdr, ch(js.length, 0x4e4f534a), js, ch(bin.length, 0x004e4942), bin]));
console.log('pieces', pieces.length, 'bytes', 12 + 16 + js.length + bin.length);
