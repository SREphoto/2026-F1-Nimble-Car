/**
 * Real helmet models (both CC BY 4.0, credited in the README and the in-app credit line):
 *  - "Helmet Redbull - Max Verstappen" by Fabianmml (sketchfab.com): the red-bull driver's helmet
 *  - "racing Helmet" by nNiCo67 (sketchfab.com, a Bell GP3): recoloured per team from data/team_liveries.json
 * Models are fitted into the HELMET_SPEC shell box (CAD frame: X nose->tail, +Y left, +Z up, dm)
 * so the head position, halo clearance and eye line stay exactly as before.
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

export const HELMET_CREDITS = [
  'Helmet Redbull - Max Verstappen by Fabianmml',
  'racing Helmet by nNiCo67',
];

let cache = null;
export function loadHelmetModels() {
  if (cache) return cache;
  const loader = new GLTFLoader(); loader.setMeshoptDecoder(MeshoptDecoder);
  const load = (u) => new Promise((res, rej) => loader.load(u, (g) => res(g.scene), undefined, rej));
  cache = Promise.all([
    load('assets/models/helmet_verstappen.glb'),
    load('assets/models/helmet_bell_gp3.glb'),
    fetch('data/team_liveries.json').then((r) => r.json()).catch(() => ({ teams: {} })),
  ]).then(([verstappen, bell, liv]) => {
    const t = liv.teams || {}; const teams = Array.isArray(t) ? Object.fromEntries(t.map((x) => [x.id, x])) : t;
    return { verstappen, bell, teams };
  });
  return cache;
}

export function makeVisorMaterial() {
  // dark smoked race shield: near-black dielectric, no metalness (metal mirrored the blue sky)
  const m = new THREE.MeshPhysicalMaterial({ color: 0x020203, roughness: 0.05, metalness: 0, clearcoat: 0.6, clearcoatRoughness: 0.03,
    envMapIntensity: 0.3, transparent: true, opacity: 0.94, side: THREE.DoubleSide });
  m.userData.envMapIntensity = 0.3; m.name = 'Helmet_Visor_DarkTint';
  return m;
}

// glTF Y-up -> CAD Z-up. Verstappen faces glTF -Z, the Bell faces glTF +Z; both map to CAD -X (forward).
const AXES = {
  verstappen: new THREE.Matrix4().set(0, 0, 1, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1),
  bell: new THREE.Matrix4().set(0, 0, -1, 0, -1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1),
};

/**
 * Build one helmet as a Group whose origin is the head centre (same as createDriverHelmet's group).
 * kind 'verstappen' | 'bell'; paint {body, accent, detail} for the Bell; gloss scales the clear coat (garage: lower).
 */
export function buildHelmetModel(models, kind, spec, { paint = null, gloss = 1 } = {}) {
  const src = kind === 'verstappen' ? models.verstappen : models.bell;
  const inner = src.clone(true);
  const g = new THREE.Group(); g.name = `Helmet_Model_${kind}`;
  const orient = new THREE.Group(); orient.matrixAutoUpdate = false; orient.matrix.copy(AXES[kind]);
  orient.add(inner); g.add(orient);
  const visor = makeVisorMaterial();
  const col = (c, d) => new THREE.Color(c || d);
  inner.traverse((o) => {
    if (!o.isMesh) return;
    o.castShadow = true;
    const n = o.material?.name || '';
    if (kind === 'verstappen') {
      if (/7SG/.test(n)) { o.material = visor; return; }                      // the shield
      o.material = o.material.clone();
      o.material.envMapIntensity = 0.6 * gloss; o.material.userData.envMapIntensity = 0.6 * gloss;
      if (o.material.clearcoat !== undefined) o.material.clearcoat *= gloss;
    } else {
      o.geometry.computeBoundingBox();
      const s = o.geometry.boundingBox.getSize(new THREE.Vector3());
      if (s.length() < 1e-4) { o.visible = false; return; }                   // two empty helper meshes
      if (!o.userData.smoothed) { // low-poly shell: weld and re-smooth normals so it doesn't read faceted
        const gg = o.geometry.clone(); gg.deleteAttribute('normal'); o.geometry = mergeVertices(gg, 1e-4); o.geometry.computeVertexNormals(); o.userData.smoothed = true;
      }
      let m;
      if (n === 'Material') m = visor;                                        // the blue band is the shield
      else if (n === 'Material.001') m = new THREE.MeshPhysicalMaterial({ color: col(paint?.body, '#1e2a55'), roughness: 0.22, metalness: 0, clearcoat: 0.8 * gloss, clearcoatRoughness: 0.08 });
      else if (/hans/.test(n)) m = new THREE.MeshStandardMaterial({ color: 0x15161a, roughness: 0.5, metalness: 0.4 });
      else if (n === 'Material.003') m = new THREE.MeshStandardMaterial({ color: 0x0c0d10, roughness: 0.35 });   // peak over the visor
      else m = new THREE.MeshPhysicalMaterial({ color: col(paint?.accent, '#ffffff'), roughness: 0.3, clearcoat: 0.6 * gloss }); // crown vents
      if (m !== visor) { m.envMapIntensity = 0.6 * gloss; m.userData.envMapIntensity = 0.6 * gloss; }
      o.material = m;
    }
  });
  // fit into the procedural shell's box: length front+rear, crown at +top, nose of the shell at -front
  g.updateMatrixWorld(true);
  const b = new THREE.Box3().setFromObject(g);
  const size = b.getSize(new THREE.Vector3());
  const k = (spec.front + spec.rear + 0.08) / size.x;
  g.scale.setScalar(k);
  g.updateMatrixWorld(true);
  const b2 = new THREE.Box3().setFromObject(g);
  g.position.set(-spec.front - b2.min.x, -(b2.min.y + b2.max.y) / 2, spec.top - b2.max.z);
  return g;
}

/** procedural meshes the model replaces (HANS posts/yoke/neck stay for the driver rig) */
const PROCEDURAL = /^Helmet_(OuterShell|InnerLiner|Visor|VisorGasket|BallisticZylonStrip|VisorPeak|VisorPivot|ChinVent|TopVent|RearSpoiler|ChinBar)/;
export function hideProceduralHelmet(helmetGroup) {
  helmetGroup.traverse((o) => { if (PROCEDURAL.test(o.name)) o.visible = false; });
  helmetGroup.traverse((o) => { if (/^Helmet_HANSPost_/.test(o.name)) o.visible = false; });
}

/** Swap the procedural helmet for the model; returns setTeam(teamId). */
export function attachHelmetModel(helmetGroup, spec, initialTeam = 'red-bull') {
  let current = null, models = null, team = initialTeam;
  const apply = () => {
    if (!models) return;
    if (current) current.removeFromParent();
    const kind = team === 'red-bull' ? 'verstappen' : 'bell';
    current = buildHelmetModel(models, kind, spec, { paint: models.teams[team]?.paint });
    helmetGroup.add(current);
    hideProceduralHelmet(helmetGroup);
  };
  loadHelmetModels().then((m) => { models = m; apply(); }).catch((e) => console.warn('Helmet models failed, keeping the built helmet', e));
  return (id) => { if (id && id !== team) { team = id; apply(); } else if (id) team = id; };
}
