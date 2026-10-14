/**
 * body_pieces_v6.js — three.js wrapper for the v6 main body (geometry in body_pieces_v6_core.js).
 * Each piece is its own named mesh with userData { removable, explode, function }.
 */
import * as THREE from 'three';
import { buildBodyV6 } from './body_pieces_v6_core.js';

export function createBodyPiecesV6({ paint, carbon, dark } = {}) {
  const body = new THREE.Group(); body.name = 'Body_Main_V6';
  const mats = {
    paint: paint || new THREE.MeshStandardMaterial({ color: 0x1b2340, roughness: 0.4, side: THREE.DoubleSide }),
    carbon: carbon || new THREE.MeshStandardMaterial({ color: 0x151515, roughness: 0.35, side: THREE.DoubleSide }),
    logo: new THREE.MeshStandardMaterial({ color: 0xd01010, roughness: 0.5, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2 }),
    dark: dark || new THREE.MeshStandardMaterial({ color: 0x050607, roughness: 0.95, side: THREE.DoubleSide }),
  };
  const groups = {}, pieces = [];
  buildBodyV6({ logoPlates: true }).forEach((p) => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(p.positions, 3));
    g.setIndex(p.indices); g.computeVertexNormals(); g.userData.quadGrid = p.grid;
    const m = new THREE.Mesh(g, mats[p.material] || mats.paint); m.name = p.name; m.castShadow = m.receiveShadow = true;
    m.userData = { removable: true, function: p.function, explode: p.explode };
    if (!groups[p.group]) { groups[p.group] = new THREE.Group(); groups[p.group].name = p.group; body.add(groups[p.group]); }
    if (p.material === 'logo') { m.visible = false; m.userData.logoPlate = true; m.castShadow = false; } // livery decal target; studio wire mode shows it
    groups[p.group].add(m); pieces.push(m);
  });
  body.userData.pieces = pieces;
  return body;
}
export function setBodyExplode(body, k) {
  (body?.userData.pieces || []).forEach((m) => { const e = m.userData.explode || [0, 0, 0]; m.position.set(e[0] * k, e[1] * k, e[2] * k); });
}
export function setBodyPieceVisible(body, name, visible) {
  const m = (body?.userData.pieces || []).find((p) => p.name === name); if (m) m.visible = visible; return !!m;
}
