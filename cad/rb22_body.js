/**
 * rb22_body.js — shared main body from the free "2026 Redbull RB22" model
 *
 * Model credit: "2026 Redbull RB22" by Dave (Tyler_Dave),
 * https://sketchfab.com/3d-models/2026-redbull-rb22-0a3d24a58e0549d591a5a48c22eec383
 * licensed CC BY 4.0. Cut down to the main body and centre section, moved into
 * our CAD frame (dm, X nose-to-tail, Z up, axles on our Wheel_Spindle_* centres)
 * and compressed by tools/rb22/split.mjs. Our nose, front wing, rear wing,
 * suspension, wheels and driver stay as they are.
 *
 * Every team gets this one body. Red Bull can keep the model's own painted
 * livery (livery.bodyTexture = "baked"); every other team gets a plain paint map
 * (the model's black carbon areas kept, everything else tinted to the team body
 * colour) plus the decals in data/team_liveries.json.
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';

export const RB22_CREDIT = '2026 Redbull RB22 by Dave (Tyler_Dave), sketchfab.com, CC BY 4.0';
const api0 = {};
const DRIVER_LIFT = 2.9; // dm: helmet top 9.29 just under the halo hoop top 9.51, visor (8.1-8.4) in the halo side gaps
const BASE = new URL('../assets/models/', import.meta.url);

// Our hand-built parts that this body replaces (hidden, kept for the exploded/X-ray views)
const REPLACED = [
  'Body_Monocoque_CarbonTub', 'Body_Halo_Titanium_Assembly', 'Body_RollHoop_Primary_172kN',
  'Chassis_Top_Instrumentation', 'Assembly_FIA_T_Camera', 'Assembly_Mirror_Left', 'Assembly_Mirror_Right',
  'Cockpit_Headrest_Assembly',
  'Nosecone_FIS_Assembly', // the RB22's own nose is used: one smooth top line from tip to cockpit
  'Sidepod_Assembly_LH_RH', 'Engine_Cover_Airbox_Fin_Assembly', 'Floor_Underbody_Diffuser_Assembly',
];

export async function installRb22Body(carModel, renderer) {
  if (!carModel || carModel.userData.rb22) return carModel?.userData.rb22;
  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);
  const gltf = await loader.loadAsync(new URL('rb22_body.glb', BASE).href);
  const body = gltf.scene;
  body.name = 'Body_RB22_Assembly';
  const maxAniso = renderer?.capabilities?.getMaxAnisotropy?.() || 8;

  const parts = {};
  let paint = null; let bakedMap = null; const paintMeshes = []; const accentMeshes = []; const fwDetail = [];
  body.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true; o.receiveShadow = true;
      const part = /^Body_RB22_/.test(o.parent?.name || '') && o.parent.name !== 'Body_RB22_Shell' ? o.parent.name : o.name;
      const mat = o.material;
      if (mat.map) mat.map.anisotropy = maxAniso;
      const mname = (mat.name || '').replace(/\.\d+$/, '');
      o.name = `${part}_${mname}`;
      if (/^redbull_(detail|carbon\d)$/.test(mname) && /^Body_RB22_FrontWing/.test(part)) { o.material = mat.clone(); fwDetail.push(o); } // wing flaps carry baked Red Bull/VISA/Mobil art
      if (mname === 'redbull_color') { o.userData.rb22Accent = true; o.material = mat.clone(); accentMeshes.push(o); }
      if (mname === 'redbull_paint') {
        if (!paint) {
          // one shared paint material for the whole body
          paint = new THREE.MeshPhysicalMaterial({
            name: 'RB22_BodyPaint', map: mat.map, normalMap: mat.normalMap,
            roughness: 0.35, metalness: 0.1, clearcoat: 0.8, clearcoatRoughness: 0.12, side: THREE.DoubleSide,
          });
          bakedMap = mat.map;
        }
        o.material = paint; paintMeshes.push(o); o.userData.mixedWinding = true;
        parts[part] = parts[part] || {}; parts[part].paint = o;
      }
    }
  });
  body.traverse((o) => { if (!o.isMesh && /^Body_RB22_/.test(o.name)) parts[o.name] = { ...(parts[o.name] || {}), group: o }; });
  const decalsBaked = body.getObjectByName('Body_RB22_BakedDecals');

  // Put the body where the old bodywork lived, so exploded view and tyre stance move it too
  const host = carModel.getObjectByName('Active_Wings_Bodywork_Assembly') || carModel;
  host.add(body);
  REPLACED.forEach((n) => { const o = carModel.getObjectByName(n); if (o) { o.visible = false; o.userData.replacedByRb22 = true; } });

  // Collar: loft from the back of our nose to the cut front face of the RB22 tub, so the two meet with no gap
  const collarMat = new THREE.MeshPhysicalMaterial({ name: 'RB22_NoseCollarPaint', color: 0x1b1f48, roughness: 0.35, clearcoat: 0.8, clearcoatRoughness: 0.12, side: THREE.DoubleSide });
  let collar = null;
  if (!parts.Body_RB22_Nose) try { collar = buildNoseCollar(carModel, host, parts.Body_RB22_Chassis_Tub?.group, collarMat); } catch (e) { console.warn('RB22 nose collar failed', e); }

  // The RB22's own front wing (with its pillars) is used, so ours is hidden with every pylon/mount
  ['FrontWing_Aerofoil_Assembly', 'FrontWing_Pylons', 'FrontWing_Mount_Assembly'].forEach((n) => {
    const o = carModel.getObjectByName(n); if (o) { o.visible = false; o.userData.replacedByRb22 = true; }
  });
  carModel.traverse((o) => { if (/^FrontWing_/.test(o.name) && !o.parent?.name?.startsWith('Body_RB22')) { o.visible = false; o.userData.replacedByRb22 = true; } });

  // The RB22 cockpit rim sits higher than our old tub: lift the seat, driver, wheel and pedals with it
  // so the helmet shows above the rim and the steering wheel clears the cowl, like the real car.
  const cell = carModel.getObjectByName('Body_SurvivalCell_Monocoque_Assembly');
  if (cell && !cell.userData.rb22Lift) { cell.position.z += DRIVER_LIFT; cell.userData.rb22Lift = DRIVER_LIFT; }
  // Our nose-sensor wiring ran into the old nose; the RB22 nose has no matching run, so hide it
  carModel.getObjectByName('Low_Voltage_Control_Harness')?.traverse((o) => {
    if (!o.isMesh) return; const b = new THREE.Box3().setFromObject(o).applyMatrix4(carModel.matrixWorld.clone().invert());
    if (b.min.x < 1.5) o.visible = false;
  });

  const plainForced = typeof location !== 'undefined' && /[?&]rb22Paint=plain/.test(location.search);
  const isBaked = (team) => (team?.livery?.bodyTexture === 'baked') && !plainForced;
  function setTeam(team) {
    const baked = isBaked(team);
    paint.map = baked ? bakedMap : null; // other teams: clean team colour, no leftover Red Bull art
    paint.color.set(baked ? 0xffffff : (team?.bodyColor ?? 0xffffff));
    if (team && !baked) {
      paint.roughness = team.roughness ?? 0.35; paint.clearcoat = team.clearcoat ?? 0.8;
      paint.clearcoatRoughness = team.clearcoatRoughness ?? 0.12; paint.metalness = Math.min(0.2, team.metalness ?? 0.1);
    }
    paint.needsUpdate = true;
    collarMat.color.set(baked ? 0x1b1f48 : (team?.bodyColor ?? 0xffffff));
    collarMat.roughness = paint.roughness; collarMat.clearcoat = paint.clearcoat;
    accentMeshes.forEach((m) => { // airbox-top camera pod: Red Bull yellow art, team accent elsewhere
      if (!m.userData.bakedMap) m.userData.bakedMap = m.material.map;
      m.material.map = baked ? m.userData.bakedMap : null;
      m.material.color.set(baked ? 0xffffff : (team?.accentColor ?? 0xffffff)); m.material.needsUpdate = true;
    });
    if (decalsBaked) decalsBaked.visible = baked;
    fwDetail.forEach((m) => { // other teams: plain dark carbon flaps, team colour comes from endplates + decals
      if (!m.userData.bakedMap) m.userData.bakedMap = m.material.map;
      m.material.map = baked ? m.userData.bakedMap : null;
      m.material.color.set(baked ? 0xffffff : 0x17181b); m.material.needsUpdate = true;
    });
    body.traverse((o) => { if (/^Body_RB22_(FrontWing_)?(Baked)?Decals/.test(o.name)) o.visible = baked; });
    return baked;
  }

  const targets = {
    tub: parts.Body_RB22_Chassis_Tub?.paint,
    nose: parts.Body_RB22_Nose?.paint,
    engineCover: parts.Body_RB22_EngineCover_Airbox?.paint,
    frontEndplates: [parts.Body_RB22_FrontWing_LH?.paint, parts.Body_RB22_FrontWing_RH?.paint].filter(Boolean),
    sidepods: [parts.Body_RB22_Sidepod_LH?.paint, parts.Body_RB22_Sidepod_RH?.paint].filter(Boolean),
  };
  // Endplate-only boxes for decals: the wing-half mesh spans the whole wing, the endplate is its outer wall
  const boxCache = new Map();
  function boxFor(mesh, worldToCar) {
    if (!targets.frontEndplates.includes(mesh)) return null;
    if (boxCache.has(mesh)) return boxCache.get(mesh);
    mesh.updateMatrixWorld(true);
    const m = worldToCar.clone().multiply(mesh.matrixWorld); const pos = mesh.geometry.attributes.position; const v = new THREE.Vector3();
    let ay = 0; for (let i = 0; i < pos.count; i++) { v.fromBufferAttribute(pos, i).applyMatrix4(m); ay = Math.max(ay, Math.abs(v.y)); }
    const b = new THREE.Box3();
    for (let i = 0; i < pos.count; i++) { v.fromBufferAttribute(pos, i).applyMatrix4(m); if (Math.abs(v.y) > ay - 0.5) b.expandByPoint(v); }
    boxCache.set(mesh, b); return b;
  }
  const api = { ...api0, boxFor, body, parts, collar, targets, paint, setTeam, isBaked, credit: RB22_CREDIT };
  carModel.userData.rb22 = api;
  return api;
}

// ---------------------------------------------------------------------------
// Nose-to-tub collar. Both ends are sampled by casting rays inward in a plane of
// constant X (CAD frame), then lofted with a smooth blend between them.
export const RB22_CUT_X = 2.0; // dm, where tools/rb22/split.mjs cut the RB22 tub
export function buildNoseCollar(carModel, host, tubGroup, material) {
  const nose = carModel.getObjectByName('Nosecone_MainBody_Navy');
  if (!nose || !tubGroup) { console.warn('[rb22] collar: missing', !!nose, !!tubGroup); return null; }
  carModel.updateMatrixWorld(true);
  const toWorld = carModel.matrixWorld; const toHost = host.matrixWorld.clone().invert();
  const tubMeshes = []; tubGroup.traverse((o) => { if (o.isMesh) tubMeshes.push(o); });
  const rc = new THREE.Raycaster();
  const N = 72; const zc = 2.6; const R = 14;
  const ring = (x, meshes) => {
    const pts = [];
    for (let i = 0; i < N; i++) {
      const a = (i / N) * Math.PI * 2;
      const dy = Math.cos(a), dz = Math.sin(a);
      const o = new THREE.Vector3(x, dy * R, zc + dz * R).applyMatrix4(toWorld);
      const t = new THREE.Vector3(x, 0, zc).applyMatrix4(toWorld);
      rc.set(o, t.clone().sub(o).normalize()); rc.far = R;
      const hit = rc.intersectObjects(meshes, false)[0];
      pts.push(hit ? hit.point.clone().applyMatrix4(carModel.matrixWorld.clone().invert()) : null);
    }
    return pts;
  };
  const xa = 0.95; const xb = RB22_CUT_X + 0.03;
  const A = ring(xa, [nose]); const B = ring(xb, tubMeshes);
  console.info('[rb22] collar rings', A.filter(Boolean).length, B.filter(Boolean).length);
  if (A.filter(Boolean).length < N * 0.6) return null;
  // gaps (no surface on that ray): take the other end's point, or the nearest neighbour
  const fill = (P, Q) => P.map((p, i) => p || Q[i] || P.find(Boolean));
  const a = fill(A, B); const b = fill(B, A).map((p) => new THREE.Vector3(xb, p.y * 0.995, zc + (p.z - zc) * 0.995));
  const S = 8; const pos = []; const idx = [];
  for (let s = 0; s <= S; s++) {
    const u = s / S; const w = u * u * (3 - 2 * u);
    for (let i = 0; i < N; i++) {
      const p = a[i], q = b[i];
      pos.push(xa + (xb - xa) * u, p.y + (q.y - p.y) * w, p.z + (q.z - p.z) * w);
    }
  }
  for (let s = 0; s < S; s++) for (let i = 0; i < N; i++) {
    const i2 = (i + 1) % N; const r0 = s * N, r1 = (s + 1) * N;
    idx.push(r0 + i, r1 + i, r1 + i2, r0 + i, r1 + i2, r0 + i2);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  // carModel frame -> host frame
  const m = new THREE.Matrix4().multiplyMatrices(toHost, toWorld); g.applyMatrix4(m);
  const mesh = new THREE.Mesh(g, material); mesh.name = 'Body_RB22_NoseCollar'; mesh.castShadow = true; mesh.receiveShadow = true;
  host.add(mesh);
  return mesh;
}
