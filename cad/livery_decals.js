/**
 * livery_decals.js — Projected livery decals & paint finishing pass
 * 2026 Formula 1 "Nimble Car" · SREdesigns - Samuel R Erwin III
 *
 * Runs once after the car is assembled (see app.js). It:
 *  1. Removes the old flat decal quads (their textures are tagged sreLegacyQuad).
 *     Those quads floated off, or sat buried inside, the curved bodywork and
 *     read mirrored on one side of the car.
 *  2. Paints the survival-cell skin in the body colour, gives the body a matte
 *     navy finish with subtle camo and an exposed-carbon lower band, and turns
 *     the halo and front-wing flaps into exposed gloss carbon (as on the car).
 *  3. Projects every livery graphic onto the real body surface with three.js
 *     DecalGeometry, so decals hug the curvature, never z-fight (polygonOffset),
 *     and always read correctly from outside the car on both sides.
 *  4. Puts the environment map on all car materials so paint, clearcoat and
 *     metals actually have something to reflect.
 *
 * Placement is computed from each target part's bounding box at runtime, so
 * decals follow the parts if their geometry/position is adjusted later.
 * All coordinates below are in the car's CAD frame: X rearward, Y to the
 * car's left, Z up (decimetres).
 */

import * as THREE from 'three';
import { DecalGeometry } from 'three/addons/geometries/DecalGeometry.js';
import { materials, applyCarEnvironment, addCarbonSplit } from '../materials.js';
import {
  createSidepodDecalTexture,
  createRoktDecalTexture,
  createEngineCoverDecalTexture,
  createEngineTopDecalTexture,
  createNoseTopDecalTexture,
  createNoseSideDecalTexture,
  createFrontWingRedBullTexture,
  createVisaDecalTexture,
  createMobilEndplateTexture,
  createRearWingFlapDecalTexture,
  createGateDecalTexture,
  createHaloMarkTexture,
  createTagHeuerDecalTexture,
  createRedBullTextTexture,
} from './procedural_livery.js';

const _v = new THREE.Vector3();

function makeDecalMaterial(map, { roughness = 0.6, clearcoat = 0.1 } = {}) {
  const m = new THREE.MeshPhysicalMaterial({
    map,
    transparent: true,
    depthWrite: false,
    polygonOffset: true,      // pull decal toward camera in depth: no z-fighting
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
    roughness,
    metalness: 0.0,
    clearcoat,
    clearcoatRoughness: 0.5,
    // Front side only: decal triangles are re-wound to face out of the surface
    // (see filterFacing), so artwork can never show through a thin panel mirrored.
    side: THREE.FrontSide,
  });
  m.userData.envMapIntensity = 0.45; // matte-ish vinyl: keep colours saturated at grazing angles
  return m;
}

export function applyLivery(carModel, renderer, { verbose = false } = {}) {
  if (!carModel) return null;
  const t0 = (typeof performance !== 'undefined') ? performance.now() : 0;
  const report = { decals: 0, skipped: [], removedLegacy: 0, ms: 0 };
  carModel.updateMatrixWorld(true);
  const carToWorld = carModel.matrixWorld.clone();
  const worldToCar = carToWorld.clone().invert();
  const maxAniso = renderer?.capabilities?.getMaxAnisotropy?.() || 8;

  // ---------------------------------------------------------------------
  // 1. Strip legacy flat decal quads
  // ---------------------------------------------------------------------
  const legacy = [];
  carModel.traverse((o) => {
    if (o.isMesh && o.material && !Array.isArray(o.material) && o.material.map?.userData?.sreLegacyQuad) legacy.push(o);
  });
  legacy.forEach((o) => {
    o.parent.remove(o);
    o.material.map.dispose();
    o.material.dispose();
    o.geometry.dispose();
  });
  report.removedLegacy = legacy.length;

  // ---------------------------------------------------------------------
  // 2. Body paint: car-only clone of the livery paint with carbon split
  // ---------------------------------------------------------------------
  const carPaint = materials.liveryPaint.clone();
  carPaint.name = 'CarPaint_MatteNavy_Camo';
  const carBoxWorld = new THREE.Box3().setFromObject(carModel);
  const splitUniforms = addCarbonSplit(carPaint, { splitY: carBoxWorld.min.y + 1.45, camo: 0.2, camoScale: 1.3 });

  const carBox = (obj) => new THREE.Box3().setFromObject(obj).applyMatrix4(worldToCar);
  const tub = carModel.getObjectByName('Body_Monocoque_CarbonTub');
  const halo = carModel.getObjectByName('Body_Halo_Titanium_Assembly');
  carModel.traverse((o) => {
    if (!o.isMesh || Array.isArray(o.material)) return;
    if (o.material === materials.liveryPaint) {
      // Front-wing flaps are bare carbon on the reference car; everything else painted
      const b = carBox(o);
      const isFwFlap = b.max.x < -7 && (b.max.z - b.min.z) < 1.0 && (b.max.y - b.min.y) > 3;
      o.material = isFwFlap ? materials.carbonGlossAero : carPaint;
      return;
    }
    // Upper survival-cell skin is painted on a real car (structural bulkheads stay carbon)
    if (tub && o.parent === tub && o.material === materials.carbonSatinChassis) { o.material = carPaint; return; }
    // Halo: exposed gloss carbon fairing
    if (halo && o.parent === halo && o.material === materials.titaniumHalo) { o.material = materials.carbonGlossAero; return; }
  });

  // ---------------------------------------------------------------------
  // 3. Projected decals
  // ---------------------------------------------------------------------
  const toWorldPoint = (a) => _v.set(...a).applyMatrix4(carToWorld).clone();
  const toWorldDir = (a) => new THREE.Vector3(...a).transformDirection(carToWorld).normalize();
  const raycaster = new THREE.Raycaster();

  /**
   * Project `texture` onto `mesh`.
   * @param origin  ray start (car frame) outside the surface
   * @param dir     projection direction (car frame), pointing at the surface
   * @param up      which way is "up" for the artwork (car frame)
   * @param size    [width, height, depth] of the projector box (dm)
   */
  function project(name, mesh, { origin, dir, up = [0, 0, 1], right = null, size, texture, matOpts, renderOrder = 1 }) {
    if (!mesh) { report.skipped.push(`${name}: target not found`); return null; }
    const dW = toWorldDir(dir);
    raycaster.set(toWorldPoint(origin), dW);
    raycaster.far = 200;
    const hit = raycaster.intersectObject(mesh, false)[0];
    if (!hit) { report.skipped.push(`${name}: ray missed`); return null; }

    // Projector basis: z points back out of the surface, y = artwork up, x = artwork right
    const z = dW.clone().negate();
    let x;
    if (right) { // explicit artwork "right" direction, made perpendicular to z
      x = toWorldDir(right); x.addScaledVector(z, -x.dot(z)).normalize();
    } else {
      x = new THREE.Vector3().crossVectors(toWorldDir(up), z).normalize();
    }
    const y = new THREE.Vector3().crossVectors(z, x).normalize();
    const rot = new THREE.Euler().setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z));
    const geo = new DecalGeometry(mesh, hit.point, rot, new THREE.Vector3(...size));
    if (!geo.attributes.position || geo.attributes.position.count === 0) { report.skipped.push(`${name}: empty`); return null; }

    // Keep only triangles on the side facing the projector (stops the artwork
    // bleeding through thin panels and showing mirrored on the far face).
    const ref = faceNormalWorld(mesh, hit.face);
    const facing = Math.sign(ref.dot(z)) || 1;
    const filtered = filterFacing(geo, z, facing);
    geo.dispose();
    if (!filtered) { report.skipped.push(`${name}: no facing triangles`); return null; }

    // Re-express in the target mesh's local space and parent it there, so it
    // follows exploded view / DRS / wheel rotation automatically.
    filtered.applyMatrix4(mesh.matrixWorld.clone().invert());
    texture.anisotropy = maxAniso;
    const decal = new THREE.Mesh(filtered, makeDecalMaterial(texture, matOpts));
    decal.name = `Livery_Decal_${name}`;   // contains "Decal": hidden in cutaway mode
    decal.renderOrder = renderOrder;
    decal.receiveShadow = true;
    mesh.add(decal);
    report.decals++;
    return decal;
  }

  const byName = (n) => carModel.getObjectByName(n);
  // CAD frame: +X rearward, +Z up, so +Y is the car's RIGHT-hand side (driver's right).
  const sides = [1, -1];
  const sideName = (s) => (s > 0 ? 'R' : 'L');
  const absMaxY = (b) => Math.max(Math.abs(b.min.y), Math.abs(b.max.y));
  // Text on a flank always reads left-to-right; on the +Y (right) flank the car's front
  // is the canvas RIGHT edge, on the -Y (left) flank it is the canvas LEFT edge.
  const frontIsLeft = (s) => s < 0;
  const tex = {
    sidepod: { 1: createSidepodDecalTexture({ frontIsLeft: false }), '-1': createSidepodDecalTexture({ frontIsLeft: true }) },
    engine: { 1: createEngineCoverDecalTexture({ frontIsLeft: false }), '-1': createEngineCoverDecalTexture({ frontIsLeft: true }) },
    noseSide: { 1: createNoseSideDecalTexture({ frontIsLeft: false }), '-1': createNoseSideDecalTexture({ frontIsLeft: true }) },
    rokt: createRoktDecalTexture(),
    engineTop: createEngineTopDecalTexture(),
    noseTop: createNoseTopDecalTexture(),
    fwRedBull: createFrontWingRedBullTexture(),
    visa: createVisaDecalTexture(),
    mobilFront: createMobilEndplateTexture(),
    mobilRear: createMobilEndplateTexture({ withPlayer: true }),
    rwFlap: createRearWingFlapDecalTexture(),
    gate: createGateDecalTexture(),
    haloOracle: createHaloMarkTexture('oracle'),
    haloATT: createHaloMarkTexture('att'),
    halo1P: createHaloMarkTexture('1password'),
    tag: createTagHeuerDecalTexture(),
    redBull: createRedBullTextTexture(),
  };

  // ---- Nose: yellow tip + partner stack + number on top, yellow/bull flanks ----
  const nose = byName('Nosecone_MainBody_Navy');
  if (nose) {
    const b = carBox(nose); const L = b.max.x - b.min.x; const W = b.max.y - b.min.y;
    // Reads from in front of the car: artwork "up" points rearward (+X)
    project('Nose_Top', nose, {
      origin: [b.min.x + L * 0.47, 0, b.max.z + 5], dir: [0, 0, -1], up: [1, 0, 0],
      size: [W * 1.05, L * 0.98, (b.max.z - b.min.z) * 1.3], texture: tex.noseTop,
    });
    sides.forEach((s) => {
      project(`Nose_Side_${sideName(s)}`, nose, {
        origin: [b.min.x + L * 0.5, s * (absMaxY(b) + 5), b.min.z + (b.max.z - b.min.z) * 0.42], dir: [0, -s, 0],
        up: [0, 0, 1], size: [L * 1.0, L * 0.25, W * 0.9], texture: tex.noseSide[s],
      });
    });
  }

  // ---- Front wing: Red Bull across the mainplane, VISA on the upper flaps ----
  const fwMain = byName('FrontWing_Mainplane');
  if (fwMain) {
    const b = carBox(fwMain); const C = b.max.x - b.min.x;
    sides.forEach((s) => {
      project(`FrontWing_RedBull_${sideName(s)}`, fwMain, {
        origin: [b.min.x + C * 0.42, s * absMaxY(b) * 0.56, b.max.z + 5], dir: [0, 0, -1], up: [1, 0, 0],
        size: [absMaxY(b) * 0.72, absMaxY(b) * 0.72 / 4, 0.4], texture: tex.fwRedBull,
      });
    });
  }
  const fwFlaps = [];
  carModel.traverse((o) => {
    if (!o.isMesh || o.material !== materials.carbonGlossAero) return;
    const b = carBox(o);
    if (b.max.x < -7 && (b.max.z - b.min.z) < 1.0 && (b.max.y - b.min.y) > 3 && b.min.z > 0.55) fwFlaps.push({ o, b });
  });
  sides.forEach((s) => {
    const mine = fwFlaps.filter(({ b }) => Math.sign(b.min.y + b.max.y) === s).sort((p, q) => q.b.max.z - p.b.max.z)[0];
    if (!mine) return;
    const { o, b } = mine;
    project(`FrontWing_VISA_${sideName(s)}`, o, {
      origin: [(b.min.x + b.max.x) / 2, (b.min.y + b.max.y) / 2, b.max.z + 5], dir: [0, 0, -1], up: [1, 0, 0],
      size: [2.6, 0.65, 0.5], texture: tex.visa,
    });
  });

  // ---- Front wing endplates: Mobil 1 ----
  carModel.traverse((o) => {
    if (!o.isMesh || o.material !== carPaint) return;
    const b = carBox(o);
    if (!(b.max.x < -6 && (b.max.y - b.min.y) < 0.4 && (b.max.z - b.min.z) > 1.5)) return;
    const s = (b.min.y + b.max.y) > 0 ? 1 : -1;
    const L = b.max.x - b.min.x; const H = b.max.z - b.min.z;
    project(`FrontEndplate_Mobil1_${sideName(s)}`, o, {
      origin: [b.min.x + L * 0.5, s * (absMaxY(b) + 5), b.min.z + H * 0.6], dir: [0, -s, 0],
      up: [0, 0, 1], size: [L * 0.62, L * 0.62 * 0.375, 0.3], texture: tex.mobilFront,
    });
  });

  // ---- Sidepods: ORACLE on the flank, ROKT on the top ----
  sides.forEach((s) => {
    const pod = byName(`Sidepod_Body_${s > 0 ? 'LH' : 'RH'}`) || byName(`Sidepod_Body_${s > 0 ? 'RH' : 'LH'}`);
    if (!pod) { report.skipped.push('Sidepod: not found'); return; }
    const b = carBox(pod); const L = b.max.x - b.min.x; const H = b.max.z - b.min.z;
    if (Math.sign(b.min.y + b.max.y) !== s) return;
    project(`Sidepod_ORACLE_${sideName(s)}`, pod, {
      origin: [b.min.x + L * 0.4, s * (absMaxY(b) + 5), b.min.z + H * 0.6], dir: [0, -s, 0],
      up: [0, 0, 1], size: [L * 0.62, L * 0.62 / 4, 2.4], texture: tex.sidepod[s],
    });
    // ROKT reads from the side of the car: artwork up points toward the centreline
    project(`Sidepod_ROKT_${sideName(s)}`, pod, {
      origin: [b.min.x + L * 0.2, (b.min.y + b.max.y) / 2 + s * (b.max.y - b.min.y) * 0.12, b.max.z + 5], dir: [0, 0, -1],
      up: [0, -s, 0], size: [2.6, 0.65, 1.0], texture: tex.rokt,
    });
  });

  // ---- Engine cover: big charging bull + Red Bull on each flank, sun disc on top ----
  const ec = byName('EngineCover_MainShell');
  if (ec) {
    const b = carBox(ec); const L = b.max.x - b.min.x; const H = b.max.z - b.min.z;
    sides.forEach((s) => {
      project(`EngineCover_Bull_${sideName(s)}`, ec, {
        origin: [b.min.x + L * 0.4, s * (absMaxY(b) + 5), b.min.z + H * 0.52], dir: [0, -s, 0],
        up: [0, 0, 1], size: [L * 0.66, L * 0.33, absMaxY(b) * 2.2], texture: tex.engine[s],
      });
      project(`EngineCover_RedBull_${sideName(s)}`, ec, {
        origin: [b.min.x + L * 0.56, s * (absMaxY(b) + 5), b.min.z + H * 0.3], dir: [0, -s, 0],
        up: [0, 0, 1], size: [L * 0.36, L * 0.09, absMaxY(b) * 1.2], texture: tex.redBull,
      });
    });
    project('EngineCover_Top', ec, {
      origin: [b.min.x + L * 0.32, 0, b.max.z + 5], dir: [0, 0, -1], right: [-1, 0, 0],
      size: [L * 0.62, absMaxY(b) * 1.5, H * 0.6], texture: tex.engineTop,
    });
  }

  // ---- Rear wing: ORACLE on the flap, Gate on the main plane, Mobil 1 on the endplates ----
  const flap = byName('RearWing_Active_UpperFlap_Mesh');
  if (flap) {
    const b = carBox(flap); const W = b.max.y - b.min.y;
    // Seen from behind, the viewer's right is the car's right (+Y): up = +Z gives that.
    project('RearWing_Flap_ORACLE', flap, {
      origin: [(b.min.x + b.max.x) / 2 + 3.6, 0, b.max.z + 4.8], dir: [-0.6, 0, -0.8],
      up: [0, 0, 1], size: [W * 0.78, W * 0.78 / 8, 1.2], texture: tex.rwFlap,
    });
  }
  const rwMain = byName('RearWing_Spoon_Mainplane');
  if (rwMain) {
    const b = carBox(rwMain); const W = b.max.y - b.min.y; const C = b.max.x - b.min.x;
    project('RearWing_Main_Gate', rwMain, {
      origin: [b.min.x + C * 0.3, 0, b.max.z + 5], dir: [0, 0, -1], up: [-1, 0, 0],
      size: [W * 0.6, W * 0.6 * 0.1875, 0.5], texture: tex.gate,
    });
  }
  sides.forEach((s) => {
    const ep = byName(`RearWing_Endplate_${s > 0 ? 'Left' : 'Right'}`);
    const mesh = ep && ep.children.find((c) => c.isMesh && c.material === carPaint);
    if (!mesh) { report.skipped.push('Rear endplate: not found'); return; }
    const b = carBox(mesh); const H = b.max.z - b.min.z; const L = b.max.x - b.min.x;
    const sideSign = Math.sign(b.min.y + b.max.y);
    project(`RearEndplate_Mobil1_${sideName(sideSign)}`, mesh, {
      origin: [b.min.x + L * 0.5, sideSign * (absMaxY(b) + 5), b.min.z + H * 0.68], dir: [0, -sideSign, 0],
      up: [0, 0, 1], size: [L * 0.9, L * 0.9 * 0.75, 1.6], texture: tex.mobilRear,
    });
  });

  // ---- Survival cell: VISA on the cockpit flanks, Red Bull on the top ahead of the driver ----
  const tubSkin = tub && tub.children.find((c) => c.isMesh && c.material === carPaint);
  if (tubSkin) {
    const b = carBox(tubSkin); const L = b.max.x - b.min.x; const H = b.max.z - b.min.z;
    sides.forEach((s) => {
      project(`Cockpit_VISA_${sideName(s)}`, tubSkin, {
        origin: [b.min.x + L * 0.335, s * (b.max.y + 5), b.min.z + H * 0.68], dir: [0, -s, 0],
        up: [0, 0, 1], size: [2.4, 0.6, 1.0], texture: tex.visa,
      });
    });
    // Reads from the driver's seat: artwork up = forward (-X)
    project('Chassis_RedBull', tubSkin, {
      origin: [b.min.x + L * 0.3, 0, b.max.z + 5], dir: [0, 0, -1], up: [-1, 0, 0],
      size: [3.0, 0.75, 1.2], texture: tex.redBull,
    });
  }

  // ---- Halo (carbon): TAG Heuer on the pylon, 1Password at the apex, ORACLE / AT&T on the arms ----
  if (halo) {
    const haloMeshes = halo.children.filter((c) => c.isMesh && c.material === materials.carbonGlossAero);
    // Halo tubes are slim, so scan a line of candidate ray origins and use the first hit.
    const tryProject = (name, opts, scan = null) => {
      const origins = [opts.origin];
      if (scan) for (let k = 0; k <= 40; k++) origins.push(opts.origin.map((v, i) => v + (scan[i] || 0) * (k / 40 - 0.5)));
      for (const origin of origins) {
        raycaster.set(toWorldPoint(origin), toWorldDir(opts.dir));
        const hit = raycaster.intersectObjects(haloMeshes, false)[0];
        if (hit) return project(name, hit.object, { ...opts, origin });
      }
      report.skipped.push(`${name}: ray missed`);
      return null;
    };
    const hb = new THREE.Box3(); haloMeshes.forEach((m) => hb.union(carBox(m)));
    if (!hb.isEmpty()) {
      const apexX = hb.min.x + (hb.max.x - hb.min.x) * 0.2; // where both arms meet the pylon
      // All read from the driver's seat (up = forward, right = driver's right = +Y)
      tryProject('Halo_1Password', { origin: [apexX + 0.15, 0, hb.max.z + 5], dir: [0, 0, -1], right: [0, 1, 0], size: [1.5, 0.38, 0.5], texture: tex.halo1P }, [0.6, 0, 0]);
      tryProject('Halo_TAGHeuer', { origin: [apexX - 0.6, 0, hb.max.z + 5], dir: [0, 0, -1], right: [0, 1, 0], size: [0.5, 0.55, 0.6], texture: tex.tag }, [0.8, 0, 0]);
      // Arms: text runs along each arm, reading left-to-right from the driver
      const armX = hb.min.x + (hb.max.x - hb.min.x) * 0.4;
      tryProject('Halo_ATT_R', { origin: [armX, hb.max.y * 0.5, hb.max.z + 5], dir: [0, 0, -1], right: [0.95, 0.3, 0], size: [1.4, 0.35, 0.5], texture: tex.haloATT }, [0, hb.max.y, 0]);
      tryProject('Halo_ORACLE_L', { origin: [armX, -hb.max.y * 0.5, hb.max.z + 5], dir: [0, 0, -1], right: [-0.95, 0.3, 0], size: [1.5, 0.35, 0.5], texture: tex.haloOracle }, [0, hb.max.y, 0]);
    }
  }

  // Tyres & wheels (sidewall markings, nut colours) are built in cad/wheels_tyres.js

  // ---------------------------------------------------------------------
  // 4. Environment reflections for everything on the car
  // ---------------------------------------------------------------------
  carPaint.userData.envMapIntensity = 0.55;
  materials.carbonGlossAero.userData.envMapIntensity = 0.6; // keep gloss carbon dark, not silvery
  applyCarEnvironment(renderer, carModel, { intensity: 0.9 });

  report.ms = Math.round(((typeof performance !== 'undefined') ? performance.now() : 0) - t0);
  if (verbose || (typeof location !== 'undefined' && /[?&]liveryDebug/.test(location.search))) console.info('[livery]', JSON.stringify(report));
  // Keep the paint/carbon split and camo fixed to the car body when the car moves (track mode)
  const loadPose = carModel.matrixWorld.clone();
  const _inv = new THREE.Matrix4();
  const syncFrame = () => {
    carModel.updateMatrixWorld();
    splitUniforms.uSpFrame.value.multiplyMatrices(loadPose, _inv.copy(carModel.matrixWorld).invert());
  };
  carModel.userData.livery = { report, carPaint, splitUniforms, syncFrame };
  return report;
}

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------
function faceNormalWorld(mesh, face) {
  const pos = mesh.geometry.attributes.position;
  const a = new THREE.Vector3().fromBufferAttribute(pos, face.a).applyMatrix4(mesh.matrixWorld);
  const b = new THREE.Vector3().fromBufferAttribute(pos, face.b).applyMatrix4(mesh.matrixWorld);
  const c = new THREE.Vector3().fromBufferAttribute(pos, face.c).applyMatrix4(mesh.matrixWorld);
  return new THREE.Vector3().crossVectors(b.sub(a), c.sub(a)).normalize();
}

/** Keep triangles whose winding normal has sign `facing` relative to projector axis z. */
function filterFacing(geo, z, facing, threshold = 0.08) {
  const pos = geo.attributes.position, nrm = geo.attributes.normal, uv = geo.attributes.uv;
  const P = [], N = [], U = [];
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), n = new THREE.Vector3();
  for (let i = 0; i < pos.count; i += 3) {
    a.fromBufferAttribute(pos, i); b.fromBufferAttribute(pos, i + 1); c.fromBufferAttribute(pos, i + 2);
    n.crossVectors(b.clone().sub(a), c.clone().sub(a));
    const len = n.length();
    if (len < 1e-10) continue;
    if (facing * n.dot(z) / len < threshold) continue;
    // Wind every kept triangle so its front face points back at the projector
    const order = n.dot(z) >= 0 ? [0, 1, 2] : [0, 2, 1];
    for (const k of order) {
      P.push(pos.getX(i + k), pos.getY(i + k), pos.getZ(i + k));
      N.push(nrm.getX(i + k), nrm.getY(i + k), nrm.getZ(i + k));
      U.push(uv.getX(i + k), uv.getY(i + k));
    }
  }
  if (!P.length) return null;
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
  out.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3));
  out.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2));
  return out;
}
