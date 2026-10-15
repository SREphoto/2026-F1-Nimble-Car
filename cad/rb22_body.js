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
const BASE = new URL('../assets/models/', import.meta.url);

// Our hand-built parts that this body replaces (hidden, kept for the exploded/X-ray views)
const REPLACED = [
  'Body_Monocoque_CarbonTub', 'Body_Halo_Titanium_Assembly', 'Body_RollHoop_Primary_172kN',
  'Chassis_Top_Instrumentation', 'Assembly_FIA_T_Camera', 'Assembly_Mirror_Left', 'Assembly_Mirror_Right',
  'Cockpit_Headrest_Assembly',
  'Sidepod_Assembly_LH_RH', 'Engine_Cover_Airbox_Fin_Assembly', 'Floor_Underbody_Diffuser_Assembly',
];

export async function installRb22Body(carModel, renderer) {
  if (!carModel || carModel.userData.rb22) return carModel?.userData.rb22;
  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);
  const [gltf, plainMap] = await Promise.all([
    loader.loadAsync(new URL('rb22_body.glb', BASE).href),
    new THREE.TextureLoader().loadAsync(new URL('rb22_paint_plain.webp', BASE).href),
  ]);
  const body = gltf.scene;
  body.name = 'Body_RB22_Assembly';
  const maxAniso = renderer?.capabilities?.getMaxAnisotropy?.() || 8;
  plainMap.flipY = false; plainMap.colorSpace = THREE.SRGBColorSpace; plainMap.anisotropy = maxAniso;

  const parts = {};
  let paint = null; let bakedMap = null; const paintMeshes = [];
  body.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true; o.receiveShadow = true;
      const part = o.parent && o.parent !== body ? o.parent.name : o.name;
      const mat = o.material;
      if (mat.map) mat.map.anisotropy = maxAniso;
      const mname = (mat.name || '').replace(/\.\d+$/, '');
      o.name = `${part}_${mname}`;
      if (mname === 'redbull_paint') {
        if (!paint) {
          // one shared paint material for the whole body
          paint = new THREE.MeshPhysicalMaterial({
            name: 'RB22_BodyPaint', map: mat.map, normalMap: mat.normalMap,
            roughness: 0.35, metalness: 0.1, clearcoat: 0.8, clearcoatRoughness: 0.12, side: THREE.DoubleSide,
          });
          bakedMap = mat.map;
        }
        o.material = paint; paintMeshes.push(o);
        parts[part] = parts[part] || {}; parts[part].paint = o;
      }
    }
    if (o.parent === body) parts[o.name] = { ...(parts[o.name] || {}), group: o };
  });
  const decalsBaked = body.getObjectByName('Body_RB22_BakedDecals');

  // Put the body where the old bodywork lived, so exploded view and tyre stance move it too
  const host = carModel.getObjectByName('Active_Wings_Bodywork_Assembly') || carModel;
  host.add(body);
  REPLACED.forEach((n) => { const o = carModel.getObjectByName(n); if (o) { o.visible = false; o.userData.replacedByRb22 = true; } });

  const plainForced = typeof location !== 'undefined' && /[?&]rb22Paint=plain/.test(location.search);
  const isBaked = (team) => (team?.livery?.bodyTexture === 'baked') && !plainForced;
  function setTeam(team) {
    const baked = isBaked(team);
    paint.map = baked ? bakedMap : plainMap;
    paint.color.set(baked ? 0xffffff : (team?.bodyColor ?? 0xffffff));
    if (team && !baked) {
      paint.roughness = team.roughness ?? 0.35; paint.clearcoat = team.clearcoat ?? 0.8;
      paint.clearcoatRoughness = team.clearcoatRoughness ?? 0.12; paint.metalness = Math.min(0.2, team.metalness ?? 0.1);
    }
    paint.needsUpdate = true;
    if (decalsBaked) decalsBaked.visible = baked;
    return baked;
  }

  const targets = {
    tub: parts.Body_RB22_Chassis_Tub?.paint,
    engineCover: parts.Body_RB22_EngineCover_Airbox?.paint,
    sidepods: [parts.Body_RB22_Sidepod_LH?.paint, parts.Body_RB22_Sidepod_RH?.paint].filter(Boolean),
  };
  const api = { body, parts, targets, paint, setTeam, isBaked, credit: RB22_CREDIT };
  carModel.userData.rb22 = api;
  return api;
}
