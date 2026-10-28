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
import { addCarbonSplit } from '../materials.js';

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
  'Assembly_Active_Rear_Wing', // the RB22's own rear wing & tail are used for outside body
];

// 2x2 twill carbon weave, tiled over the wing flaps of non-Red Bull teams (their baked art is removed)
let _weave = null;
function carbonWeave() {
  if (_weave) return _weave;
  const N = 64, c = document.createElement('canvas'); c.width = c.height = N; const g = c.getContext('2d');
  g.fillStyle = '#121316'; g.fillRect(0, 0, N, N);
  const t = N / 8;
  for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) {
    const warp = ((i + j) >> 1) % 2 === 0; // 2x2 twill: diagonal steps
    const gr = g.createLinearGradient(i * t, j * t, warp ? i * t + t : i * t, warp ? j * t : j * t + t);
    gr.addColorStop(0, warp ? '#2a2c31' : '#1a1b1f'); gr.addColorStop(0.5, warp ? '#3a3d44' : '#24262b'); gr.addColorStop(1, warp ? '#2a2c31' : '#1a1b1f');
    g.fillStyle = gr; g.fillRect(i * t + 0.5, j * t + 0.5, t - 1, t - 1);
  }
  _weave = new THREE.CanvasTexture(c); _weave.colorSpace = THREE.SRGBColorSpace;
  _weave.wrapS = _weave.wrapT = THREE.RepeatWrapping; _weave.repeat.set(48, 48); _weave.anisotropy = 8;
  return _weave;
}

export async function installRb22Body(carModel, renderer) {
  if (!carModel || carModel.userData.rb22) return carModel?.userData.rb22;
  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);
  const gltf = await loader.loadAsync(new URL('rb22_body.glb', BASE).href);
  const body = gltf.scene;
  body.name = 'Body_RB22_Assembly';
  const maxAniso = renderer?.capabilities?.getMaxAnisotropy?.() || 8;

  const parts = {};
  const texLoader = new THREE.TextureLoader();
  const teamTextureCache = new Map();
  let paint = null; let bakedMap = null; let bakedDecalMap = null; let splitUniforms = null;
  const paintMeshes = []; const accentMeshes = []; const fwDetail = []; const decalMeshes = [];

  const TEAM_LIVERY_FILES = {
    'ferrari': 'ferrari',
    'mercedes': 'mercedes',
    'mclaren': 'mclaren',
    'aston-martin': 'aston_martin',
    'aston_martin': 'aston_martin',
    'audi': 'audi',
    'sauber': 'audi',
    'cadillac': 'cadillac',
    'haas': 'haas',
    'williams': 'williams',
  };

  function getTeamTextures(teamId) {
    const key = (teamId || '').toLowerCase().replace(/_/g, '-');
    const baseName = TEAM_LIVERY_FILES[key];
    if (!baseName) return null;
    if (teamTextureCache.has(baseName)) return teamTextureCache.get(baseName);

    const paintUrl = new URL(`liveries/${baseName}_paint.webp`, BASE).href;
    const decalsUrl = new URL(`liveries/${baseName}_decals.webp`, BASE).href;

    const pTex = texLoader.load(paintUrl);
    pTex.colorSpace = THREE.SRGBColorSpace;
    pTex.flipY = false;
    pTex.anisotropy = maxAniso;

    const dTex = texLoader.load(decalsUrl);
    dTex.colorSpace = THREE.SRGBColorSpace;
    dTex.flipY = false;
    dTex.anisotropy = maxAniso;

    const result = { paint: pTex, decals: dTex };
    teamTextureCache.set(baseName, result);
    return result;
  }

  body.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true; o.receiveShadow = true;
      const part = /^Body_RB22_/.test(o.parent?.name || '') && o.parent.name !== 'Body_RB22_Shell' ? o.parent.name : o.name;
      const mat = o.material;
      if (mat.map) mat.map.anisotropy = maxAniso;
      const mname = (mat.name || '').replace(/\.\d+$/, '');
      o.name = `${part}_${mname}`;
      if (/^redbull_(detail|carbon\d)$/.test(mname) && /^Body_RB22_FrontWing/.test(part)) { o.material = mat.clone(); fwDetail.push(o); } // wing flaps carry baked Red Bull/VISA/Mobil art
      if (mname === 'redbull_decals') { // the atlas carries a crisp alpha: cut the logos from it, not from the coarse decal polygons
        o.material = mat.clone();
        o.material.alphaTest = 0.04; o.material.transparent = true; o.material.depthWrite = false; o.material.alphaToCoverage = false;
        o.material.polygonOffset = true; o.material.polygonOffsetFactor = -2; o.material.polygonOffsetUnits = -2; o.material.needsUpdate = true; o.renderOrder = 2;
        decalMeshes.push(o);
        if (!bakedDecalMap) bakedDecalMap = mat.map;
      }
      if (mname === 'redbull_color') { o.userData.rb22Accent = true; o.material = mat.clone(); accentMeshes.push(o); }
      if (mname === 'redbull_paint') {
        if (!paint) {
          // one shared paint material for the whole body with authentic carbon split
          paint = new THREE.MeshPhysicalMaterial({
            name: 'RB22_BodyPaint', map: mat.map, normalMap: mat.normalMap,
            roughness: 0.35, metalness: 0.1, clearcoat: 0.8, clearcoatRoughness: 0.12, side: THREE.DoubleSide,
          });
          bakedMap = mat.map;
          splitUniforms = addCarbonSplit(paint, {
            splitY: 1.45,
            stripeColor: 0xd8102c,
            stripeWidth: 0.08,
            camo: 0.2,
            camoScale: 1.3
          });
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

  // The RB22 tail carries exposed gearbox/exhaust detail (copper pipes, white brackets) above its crash
  // structure behind the cover. Drop those triangles: X > 32, Z > 4.7 in the car frame.
  {
    carModel.updateMatrixWorld(true);
    const toCar = carModel.matrixWorld.clone().invert(); const v = new THREE.Vector3();
    body.traverse((o) => {
      if (!o.isMesh || !/^Body_RB22_Tail_redbull_detail/.test(o.name) || !o.geometry.index) return;
      const m = toCar.clone().multiply(o.matrixWorld), pos = o.geometry.attributes.position, ix = o.geometry.index.array, keep = [];
      for (let t = 0; t < ix.length; t += 3) {
        let cx = 0, cz = 0; for (let k = 0; k < 3; k++) { v.fromBufferAttribute(pos, ix[t + k]).applyMatrix4(m); cx += v.x / 3; cz += v.z / 3; }
        const isClutter = cx > 32 && cz > 4.7 && cz < 6.0;
        if (!isClutter) keep.push(ix[t], ix[t + 1], ix[t + 2]);
      }
      o.geometry = o.geometry.clone(); o.geometry.setIndex(keep); o.userData.rb22Trimmed = (ix.length - keep.length) / 3;
    });
  }
  // Close the back of the engine cover: the RB22 cover stops at X ~32 and leaves its gearbox/exhaust
  // detail open to view. Loft a skin from the cover's rear edge back onto the crash structure.
  let tailCap = null;
  try {
    const cover = []; const tailM = [];
    body.traverse((o) => { if (!o.isMesh) return;
      if (/^Body_RB22_EngineCover_Airbox_redbull_(paint|carbon2)/.test(o.name)) cover.push(o);
      if (/^Body_RB22_Tail_redbull_(paint|carbon2)/.test(o.name)) tailM.push(o); });
    tailCap = loftBetween(carModel, host, cover, 31.6, tailM, 35.6, 4.6, collarMat, 'Body_RB22_EngineCover_RearClosure');
  } catch (e) { console.warn('RB22 tail closure failed', e); }

  // The model's floor stays (thin rods from the chassis/sidepod down to the floor edge) came out white in
  // its texture. Move those small, long, thin pieces into their own carbon-black mesh.
  try {
    const stayMat = new THREE.MeshStandardMaterial({ color: 0x0b0c0e, roughness: 0.45, metalness: 0.2, name: 'RB22_FloorStay_Carbon' });
    const targets = [];
    body.traverse((o) => { if (o.isMesh && /^Body_RB22_(Chassis_Tub|Floor)_redbull_detail/.test(o.name) && o.geometry.index) targets.push(o); });
    targets.forEach((o) => {
      const geo = o.geometry; const pos = geo.attributes.position; const idx = geo.index.array; const n = pos.count;
      const par = new Int32Array(n); for (let i = 0; i < n; i++) par[i] = i;
      const f = (i) => { while (par[i] !== i) { par[i] = par[par[i]]; i = par[i]; } return i; };
      const key = new Map(); const rep = new Int32Array(n);
      for (let i = 0; i < n; i++) { const k = pos.getX(i).toFixed(4) + ',' + pos.getY(i).toFixed(4) + ',' + pos.getZ(i).toFixed(4); if (!key.has(k)) key.set(k, i); rep[i] = key.get(k); }
      for (let t = 0; t < idx.length; t += 3) { const a = f(rep[idx[t]]); par[f(rep[idx[t + 1]])] = a; par[f(rep[idx[t + 2]])] = a; }
      const box = new Map(); const cnt = new Map();
      for (let i = 0; i < n; i++) { const r = f(rep[i]); let b = box.get(r); if (!b) { b = new THREE.Box3(); box.set(r, b); cnt.set(r, 0); } b.expandByPoint(new THREE.Vector3().fromBufferAttribute(pos, i)); cnt.set(r, cnt.get(r) + 1); }
      const sc = new THREE.Vector3(); o.getWorldScale(sc); const scale = sc.x / (carModel.getWorldScale(new THREE.Vector3()).x || 1);
      const isStay = (r) => { const s = box.get(r).getSize(new THREE.Vector3()).multiplyScalar(scale); const d = [s.x, s.y, s.z].sort((a, b) => a - b); return cnt.get(r) <= 130 && d[2] > 1.1 && d[0] < 0.2; };
      const keep = []; const stay = [];
      for (let t = 0; t < idx.length; t += 3) (isStay(f(rep[idx[t]])) ? stay : keep).push(idx[t], idx[t + 1], idx[t + 2]);
      if (!stay.length) return;
      geo.setIndex(keep);
      const g2 = geo.clone(); g2.setIndex(stay);
      const m2 = new THREE.Mesh(g2, stayMat); m2.name = o.name.replace('redbull_detail', 'FloorStay_Carbon'); m2.castShadow = true;
      o.parent.add(m2); m2.position.copy(o.position); m2.quaternion.copy(o.quaternion); m2.scale.copy(o.scale);
    });
  } catch (e) { console.warn('RB22 floor stay recolour failed', e); }

  // The RB22's own front wing (with its pillars) is used, so ours is hidden with every pylon/mount
  ['FrontWing_Aerofoil_Assembly', 'FrontWing_Pylons', 'FrontWing_Mount_Assembly'].forEach((n) => {
    const o = carModel.getObjectByName(n); if (o) { o.visible = false; o.userData.replacedByRb22 = true; }
  });
  carModel.traverse((o) => { if (/^FrontWing_/.test(o.name) && !o.parent?.name?.startsWith('Body_RB22')) { o.visible = false; o.userData.replacedByRb22 = true; } });

  // The RB22's own rear wing & tail (Body_RB22_Tail) are used for the outside body, so our procedural wing is hidden
  ['Assembly_Active_Rear_Wing'].forEach((n) => {
    const o = carModel.getObjectByName(n); if (o) { o.visible = false; o.userData.replacedByRb22 = true; }
  });
  carModel.traverse((o) => {
    if ((/^RearWing_/.test(o.name) || o.name === 'Assembly_Active_Rear_Wing' || /^RainLED_/.test(o.name)) && !o.parent?.name?.startsWith('Body_RB22')) {
      o.visible = false;
      o.userData.replacedByRb22 = true;
    }
  });

  // One set of suspension: the RB22's wishbones, push/pull rods, track rods and upright bodies are in the
  // body file (Body_RB22_Suspension). Hide our arms, rockers, rack and tethers; keep our wheel corners
  // (tyres, rims, hubs, brakes) on their Wheel_Spindle_* pivots so steering and wheels-off still work.
  const hideOurs = (o) => { o.traverse((m) => { if (m.isMesh) { m.visible = false; m.userData.replacedByRb22 = true; } }); };
  ['Front_Suspension_Assembly', 'Rear_Suspension_Assembly'].forEach((n) => {
    const asm = carModel.getObjectByName(n); if (!asm) return;
    asm.children.forEach((c) => { if (!/_(Left|Right)$/.test(c.name)) hideOurs(c); });   // inboard rockers / dampers / ARB
    asm.children.filter((c) => /_(Left|Right)$/.test(c.name)).forEach((side) => {
      side.children.forEach((c) => {
        if (!/Upright/.test(c.name)) { hideOurs(c); return; }                           // wishbones, push/pull rods, track rods
        c.children.forEach((u) => {
          if (!/WheelCorner/.test(u.name)) hideOurs(u);                                 // our upright body
          else u.traverse((w) => { if (/ZylonTether/.test(w.name)) hideOurs(w); });     // wheel tethers ran to our arms
        });
      });
    });
  });
  ['Assembly_HPAS_Steering_Rack', 'Assembly_RearImpactStructure_RainLight'].forEach((n) => { const o = carModel.getObjectByName(n); if (o) hideOurs(o); });

  // Our powertrain, gearbox, wiring and coolers were sized for the old body: parts of them (gearbox casing,
  // exhaust downpipe, MGU-K, crankcase sump, rear-wing LED looms) poke through the RB22 floor and tail.
  // The RB22 body is closed, so they are hidden in normal view and only shown when the car is exploded or in the garage.
  const internals = [];
  ['Powertrain_Moving_Internals_Assembly', 'Transmission_Moving_Gears_Assembly', 'Electrical_Wiring_Harness_Assembly'].forEach((n) => {
    const asm = carModel.getObjectByName(n); if (!asm) return;
    asm.children.forEach((c) => { if (c.name !== 'Kinematic_Driveshafts_Assembly') internals.push(c); });
  });
  ['Body_FireSuppression_System', 'Assembly_HPAS_Steering_Rack', 'Assembly_RearImpactStructure_RainLight'].forEach((n) => {
    const o = carModel.getObjectByName(n); if (o) internals.push(o);
  });
  let internalsShown = null;
  const showInternals = (v) => { if (v === internalsShown) return; internalsShown = v; internals.forEach((o) => { o.visible = v; o.userData.rb22Internal = true; }); };
  showInternals(false);

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
  const isBaked = (team) => {
    if (plainForced) return false;
    const tid = (team?.id || '').toLowerCase().replace(/_/g, '-');
    if (tid === 'red-bull' || tid === 'redbull') return true;
    if (TEAM_LIVERY_FILES[tid]) return true;
    return team?.livery?.bodyTexture === 'baked';
  };

  function setTeam(team) {
    const baked = isBaked(team);
    const teamId = (team?.id || '').toLowerCase().replace(/_/g, '-');
    const isRedBull = teamId === 'red-bull' || teamId === 'redbull';
    const teamTex = (!isRedBull && baked) ? getTeamTextures(teamId) : null;

    if (isRedBull) {
      paint.map = bakedMap;
      if (bakedDecalMap) {
        decalMeshes.forEach((m) => { m.material.map = bakedDecalMap; m.material.needsUpdate = true; });
      }
    } else if (teamTex) {
      paint.map = teamTex.paint;
      decalMeshes.forEach((m) => { m.material.map = teamTex.decals; m.material.needsUpdate = true; });
    } else {
      paint.map = null;
    }

    paint.color.set(baked ? 0xffffff : (team?.bodyColor ?? 0xffffff));
    if (team && !baked) {
      paint.roughness = team.roughness ?? 0.32;
      paint.clearcoat = team.clearcoat ?? 0.95;
      paint.clearcoatRoughness = team.clearcoatRoughness ?? 0.05;
      paint.metalness = Math.min(0.35, team.metalness ?? 0.12);
    } else {
      paint.roughness = team?.roughness ?? 0.30;
      paint.clearcoat = team?.clearcoat ?? 0.95;
      paint.clearcoatRoughness = team?.clearcoatRoughness ?? 0.05;
      paint.metalness = Math.min(0.25, team?.metalness ?? 0.10);
    }
    paint.needsUpdate = true;

    if (splitUniforms) {
      if (baked) {
        splitUniforms.uSplitY.value = -999.0;
        splitUniforms.uStripeW.value = 0.0;
        splitUniforms.uCamo.value = 0.0;
      } else {
        splitUniforms.uSplitY.value = 1.45;
        splitUniforms.uStripeW.value = 0.08;
        splitUniforms.uStripeColor.value.setHex(team?.stripeColor ?? team?.accentColor ?? 0xffe500);
        splitUniforms.uCamo.value = team?.camo ?? 0.0;
      }
    }

    collarMat.color.set(baked ? (team?.bodyColor ?? 0x1b1f48) : (team?.bodyColor ?? 0xffffff));
    collarMat.roughness = paint.roughness; collarMat.clearcoat = paint.clearcoat;
    collarMat.needsUpdate = true;

    accentMeshes.forEach((m) => { // airbox-top camera pod: Red Bull yellow art, team accent elsewhere
      if (!m.userData.bakedMap) m.userData.bakedMap = m.material.map;
      m.material.map = isRedBull ? m.userData.bakedMap : null;
      m.material.color.set(isRedBull ? 0xffffff : (team?.accentColor ?? 0xffffff));
      m.material.needsUpdate = true;
    });

    if (decalsBaked) decalsBaked.visible = baked;
    body.traverse((o) => { if (/^Body_RB22_(FrontWing_)?(Baked)?Decals/.test(o.name)) o.visible = baked; });

    fwDetail.forEach((m) => { // other teams: plain dark carbon flaps, team colour comes from endplates + decals
      if (!m.userData.bakedMap) m.userData.bakedMap = m.material.map;
      m.material.map = isRedBull ? m.userData.bakedMap : carbonWeave();
      m.material.color.set(isRedBull ? 0xffffff : 0x9a9ca2);
      m.material.needsUpdate = true;
    });

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
  const api = { ...api0, tailCap, showInternals, boxFor, body, parts, collar, targets, paint, splitUniforms, setTeam, isBaked, credit: RB22_CREDIT };
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

// Generic X-plane loft between two sets of meshes (CAD frame), used to close the engine cover's rear.
export function loftBetween(carModel, host, meshesA, xa, meshesB, xb, zc, material, name, N = 64, R = 10) {
  carModel.updateMatrixWorld(true);
  const toWorld = carModel.matrixWorld, toCar = toWorld.clone().invert();
  const rc = new THREE.Raycaster();
  const ring = (x, meshes) => {
    const pts = [];
    for (let i = 0; i < N; i++) {
      const a = (i / N) * Math.PI * 2;
      const o = new THREE.Vector3(x, Math.cos(a) * R, zc + Math.sin(a) * R).applyMatrix4(toWorld);
      const t = new THREE.Vector3(x, 0, zc).applyMatrix4(toWorld);
      rc.set(o, t.sub(o).normalize()); rc.far = R;
      const hit = rc.intersectObjects(meshes, false)[0];
      pts.push(hit ? hit.point.clone().applyMatrix4(toCar) : null);
    }
    return pts;
  };
  const A = ring(xa, meshesA), B = ring(xb, meshesB);
  console.info('[rb22] ' + name + ' rings', A.filter(Boolean).length, B.filter(Boolean).length);
  if (A.filter(Boolean).length < N * 0.5 || B.filter(Boolean).length < N * 0.5) return null;
  const fill = (P) => P.map((p, i) => { if (p) return p; for (let k = 1; k < N; k++) { const q = P[(i + k) % N] || P[(i - k + N) % N]; if (q) return q; } return null; });
  const a = fill(A).map((p) => new THREE.Vector3(xa, 0, zc).lerp(p, 0.995)), b = fill(B).map((p) => new THREE.Vector3(xb, 0, zc).lerp(p, 0.995));
  const S = 10, pos = [], idx = [];
  for (let s = 0; s <= S; s++) { const u = s / S, w = u * u * (3 - 2 * u);
    for (let i = 0; i < N; i++) pos.push(xa + (xb - xa) * u, a[i].y + (b[i].y - a[i].y) * w, a[i].z + (b[i].z - a[i].z) * w); }
  for (let s = 0; s < S; s++) for (let i = 0; i < N; i++) { const i2 = (i + 1) % N, r0 = s * N, r1 = (s + 1) * N; idx.push(r0 + i, r1 + i, r1 + i2, r0 + i, r1 + i2, r0 + i2); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(host.matrixWorld.clone().invert(), toWorld));
  const mesh = new THREE.Mesh(g, material); mesh.name = name; mesh.castShadow = true; mesh.receiveShadow = true;
  host.add(mesh); return mesh;
}
