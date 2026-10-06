/**
 * Generic team garage builder. Reads a layout from garage_data.js and team colours from garage_team_colors.js.
 * One shared garage: setTeam(id) recolours the wall panels, cabinets, pillars, tyre blankets and TVs.
 * The room shell is merged per material; every prop kind (cabinets, cases, tyre stacks, stools, chairs, drums...) is one
 * InstancedMesh per part with shared geometry and materials. dispose() frees all GPU memory when you leave the garage.
 * Units: dm, floor at y = 0, open door toward -x (see garage_data.js).
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { GARAGE_LAYOUT, REGULATIONS } from './garage_data.js';
import { GARAGE_TEAM_COLORS } from './garage_team_colors.js';

function canvasTex(w, h, draw, { aniso = 8, repeat = false } = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = aniso;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.userData.canvas = c; t.userData.draw = draw;
  return t;
}
/** regulations sheet drawing, shared by the desk monitor and the printed sheet */
export function drawRegulations(x, w, h, { dark = false, team = 'Team' } = {}) {
  x.fillStyle = dark ? '#0b1220' : '#f7f7f2'; x.fillRect(0, 0, w, h);
  const fg = dark ? '#e6edf5' : '#15181d', sub = dark ? '#7fd3ff' : '#4a5260';
  const s = w / 512;
  x.fillStyle = fg; x.font = `bold ${30 * s}px Arial, sans-serif`; x.textBaseline = 'top';
  x.fillText(REGULATIONS.title, 24 * s, 20 * s);
  x.fillStyle = sub; x.font = `${16 * s}px Arial, sans-serif`; x.fillText(`${team} · technical check sheet`, 24 * s, 58 * s);
  const top = 92 * s, rh = (h - top - 16 * s) / REGULATIONS.rows.length;
  REGULATIONS.rows.forEach(([k, v], i) => {
    const y = top + i * rh;
    if (i % 2 === 0) { x.fillStyle = dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'; x.fillRect(16 * s, y, w - 32 * s, rh); }
    x.fillStyle = fg; x.font = `${Math.min(18 * s, rh * 0.55)}px Arial, sans-serif`; x.fillText(k, 24 * s, y + rh * 0.22);
    x.fillStyle = sub; x.textAlign = 'right'; x.fillText(v, w - 24 * s, y + rh * 0.22); x.textAlign = 'left';
  });
}

export function buildGarage(L = GARAGE_LAYOUT, teamId = 'red-bull') {
  const g = new THREE.Group(); g.name = 'Team_Garage';
  const T = () => GARAGE_TEAM_COLORS[teamId] || GARAGE_TEAM_COLORS['red-bull'];
  const W = L.halfWidth, X0 = L.x0, X1 = L.x1, H = L.height, D = X1 - X0;
  // ---------------------------------------------------------------- materials
  const floorTex = canvasTex(1024, 512, (x, w, h) => {
    x.fillStyle = L.floor.color; x.fillRect(0, 0, w, h);
    const sx = w / D, sz = h / (2 * W), px = v => (v - X0) * sx, pz = v => (v + W) * sz;
    const B = L.floor.carBox;
    x.strokeStyle = '#f2f2f0'; x.lineWidth = 6; x.strokeRect(px(B.x0), pz(-B.halfWidth), (B.x1 - B.x0) * sx, 2 * B.halfWidth * sz);   // car position box
    x.lineWidth = 4; [B.x0 + 4, B.x1 - 6].forEach(cx => { x.beginPath(); x.moveTo(px(cx), pz(-3)); x.lineTo(px(cx), pz(3)); x.stroke(); });
    x.fillStyle = '#9a9ea4';                                                                                        // grey chevron parking marks
    for (let i = 0; i < 4; i++) { const cx = px(B.x1 + 8 + i * 7); x.beginPath(); x.moveTo(cx, pz(-6)); x.lineTo(cx + 22, pz(0)); x.lineTo(cx, pz(6)); x.lineTo(cx + 10, pz(0)); x.closePath(); x.fill(); }
    x.fillStyle = '#e8b400'; x.font = 'bold 26px Arial'; x.save(); x.translate(px(-60), pz(-24)); x.fillText('◀ PIT LANE', 0, 0); x.restore();      // painted floor signs
    x.save(); x.translate(px(-60), pz(27)); x.fillText('◀ EXIT', 0, 0); x.restore();
    x.fillStyle = L.pitLaneStrip.color; x.fillRect(0, 0, L.pitLaneStrip.width * sx, h);                              // red PIT-LANE threshold strip
    x.save(); x.translate(L.pitLaneStrip.width * sx * 0.72, h / 2); x.rotate(-Math.PI / 2); x.fillStyle = '#ffffff'; x.font = 'bold 22px Arial'; x.textAlign = 'center'; x.fillText(L.pitLaneStrip.text, 0, 0); x.restore();
  });
  const brickTex = canvasTex(256, 256, (x, w, h) => {
    x.fillStyle = L.brick.pale; x.fillRect(0, 0, w, h); x.strokeStyle = 'rgba(120,115,105,0.55)'; x.lineWidth = 2;
    for (let r = 0; r < 16; r++) { x.beginPath(); x.moveTo(0, r * 16); x.lineTo(w, r * 16); x.stroke(); for (let c = 0; c < 5; c++) { const bx = c * 64 + (r % 2) * 32; x.beginPath(); x.moveTo(bx, r * 16); x.lineTo(bx, r * 16 + 16); x.stroke(); } }
  }, { repeat: true });
  brickTex.repeat.set(D / 24, 1.2);
  const M = {
    floor: new THREE.MeshStandardMaterial({ map: floorTex, roughness: L.floor.roughness, metalness: 0.05 }),
    lane: new THREE.MeshStandardMaterial({ color: 0xc4c6c8, roughness: 0.8 }),
    brick: new THREE.MeshStandardMaterial({ map: brickTex, roughness: 0.9 }),
    greyBrick: new THREE.MeshStandardMaterial({ color: L.brick.grey, roughness: 0.9 }),
    band: new THREE.MeshStandardMaterial({ color: 0x141416, roughness: 0.6 }),
    team: new THREE.MeshStandardMaterial({ color: T().panel, roughness: 0.45, metalness: 0.1 }),
    accent: new THREE.MeshStandardMaterial({ color: T().accent, roughness: 0.7 }),
    ceiling: new THREE.MeshStandardMaterial({ color: 0x2a2c30, roughness: 0.9, side: THREE.DoubleSide }),
    alu: new THREE.MeshStandardMaterial({ color: 0xc8ccd2, roughness: 0.35, metalness: 0.85 }),
    light: new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xf4f7ff, emissiveIntensity: 1.4 }),
    dark: new THREE.MeshStandardMaterial({ color: 0x222428, roughness: 0.5, metalness: 0.3 }),
    caseEdge: new THREE.MeshStandardMaterial({ color: 0x9aa0a8, roughness: 0.3, metalness: 0.9 }),
    red: new THREE.MeshStandardMaterial({ color: 0xc8161d, roughness: 0.45, metalness: 0.2 }),
    tyre: new THREE.MeshStandardMaterial({ color: 0x151517, roughness: 0.85 }),
    screen: new THREE.MeshStandardMaterial({ color: 0x0d1626, emissive: 0x1b3a66, emissiveIntensity: 0.6, roughness: 0.3 }),
    seat: new THREE.MeshStandardMaterial({ color: 0x1a1a1d, roughness: 0.75 }),
    canvasCloth: new THREE.MeshStandardMaterial({ color: 0x2b2b30, roughness: 0.9, side: THREE.DoubleSide }),
  };
  g.userData.materials = M;
  const parts = new Map();   // material -> geometry list
  const put = (mat, geo) => { if (!parts.has(mat)) parts.set(mat, []); parts.get(mat).push(geo); };
  const box = (mat, w, h, d, x, y, z, ry = 0) => { const b = new THREE.BoxGeometry(w, h, d); b.translate(0, 0, 0); if (ry) b.rotateY(ry); b.translate(x, y, z); put(mat, b); };
  const cyl = (mat, r, h, x, y, z, seg = 16) => { const c = new THREE.CylinderGeometry(r, r, h, seg); c.translate(x, y, z); put(mat, c); };
  const rot = (x, z, ox, oz, a) => [ox + x * Math.cos(a) + z * Math.sin(a), oz - x * Math.sin(a) + z * Math.cos(a)];

  // ---------------------------------------------------------------- shell
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(D, 2 * W), M.floor); floor.rotation.x = -Math.PI / 2; floor.position.set((X0 + X1) / 2, 0.02, 0); floor.receiveShadow = true; floor.name = 'Garage_Floor'; g.add(floor);
  box(M.lane, 120, 0.4, 2 * W + 40, X0 - 60, -0.2, 0);                       // light concrete pit lane outside the door
  for (const s of [-1, 1]) {
    box(M.band, D, L.lowerBand, 1, (X0 + X1) / 2, L.lowerBand / 2, s * W);
    box(M.team, D - 8, L.panelTop - L.lowerBand - 1, 0.6, (X0 + X1) / 2, (L.panelTop + L.lowerBand) / 2, s * (W - 0.7));
    const up = new THREE.PlaneGeometry(D, H - L.panelTop); up.rotateY(s > 0 ? Math.PI : 0); up.translate((X0 + X1) / 2, (H + L.panelTop) / 2, s * W); put(M.brick, up);
  }
  box(M.greyBrick, 1, H, 2 * W, X1, H / 2, 0);                                // back wall (grey brick)
  box(M.band, 0.8, L.lowerBand, 2 * W - 2, X1 - 0.8, L.lowerBand / 2, 0);
  box(M.ceiling, D, 0.6, 2 * W, (X0 + X1) / 2, H, 0);
  box(M.dark, 2, H - L.rollerDoor.y, 2 * W, X0, (H + L.rollerDoor.y) / 2, 0); // header over the open door
  box(M.alu, 4, 4, 2 * W - 4, X0 + 1, L.rollerDoor.y + 2, 0);                  // rolled-up roller door
  for (let k = 0; k < 3; k++) box(M.screen, 0.3, 1.6, 8, X0 + 3, L.rollerDoor.y + 1 + 0, -16 + k * 16);
  // overhead truss with the light canopy, tube lights and cable trays
  const TR = L.truss;
  for (const z of TR.zs) for (const dy of [0, 2.4]) for (const dz of [-1.2, 1.2]) box(M.alu, D - 10, 0.35, 0.35, (X0 + X1) / 2, TR.y + dy, z + dz);
  for (let x = X0 + 8; x < X1 - 4; x += 6) for (const z of TR.zs) box(M.alu, 0.25, 2.4, 2.4, x, TR.y + 1.2, z);
  for (let x = X0 + 10; x < X1 - 4; x += 24) box(M.alu, 0.5, 0.5, TR.zs[1] - TR.zs[0], x, TR.y + 2.4, 0);
  const C = TR.canopy;
  box(M.dark, C.x1 - C.x0 + 2, 1.6, 2 * C.halfWidth + 2, (C.x0 + C.x1) / 2, C.y + 0.8, 0);
  box(M.light, C.x1 - C.x0, 0.2, 2 * C.halfWidth, (C.x0 + C.x1) / 2, C.y - 0.05, 0);
  for (const x of [C.x0 + 4, C.x1 - 4]) for (const z of [-C.halfWidth + 2, C.halfWidth - 2]) box(M.alu, 0.15, TR.y - C.y - 1.6, 0.15, x, (TR.y + C.y + 1.6) / 2, z);
  for (const x of L.tubeLights.xs) for (const z of [-26, 26]) box(M.light, L.tubeLights.length, 0.5, 0.6, x, L.tubeLights.y, z);
  for (const z of [-30, 30]) box(M.caseEdge, D - 6, 0.3, 3, (X0 + X1) / 2, L.tubeLights.y - 2, z);   // cable trays

  // ---------------------------------------------------------------- props (one InstancedMesh per prop part, shared geometry and materials)
  // each prop kind is a list of [material, geometry in local space]; local +z faces into the room, y up from the floor
  const B = (w, h, d, x, y, z) => new THREE.BoxGeometry(w, h, d).translate(x, y, z);
  const Cy = (r, h, x, y, z, seg = 16, r2 = r) => new THREE.CylinderGeometry(r, r2, h, seg).translate(x, y, z);
  const merged = (list) => mergeGeometries(list.map(x => x.index ? x.toNonIndexed() : x));
  const PROP = {
    cabinet: [[M.team, B(8.4, 10, 5, 0, 5, 0)], [M.dark, B(8.6, 0.6, 5.4, 0, 10.3, 0)], [M.caseEdge, merged([0, 1, 2, 3].map(d => B(6, 0.25, 0.2, 0, 2 + d * 2.3, 2.6)))]],
    flightCase: [[M.dark, B(7, 7, 5, 0, 4.2, 0)], [M.caseEdge, merged([B(7.2, 0.4, 5.2, 0, 7.7, 0), B(7.2, 0.4, 5.2, 0, 0.9, 0)])], [M.tyre, merged([[-3, -2], [3, -2], [-3, 2], [3, 2]].map(([x, z]) => Cy(0.5, 0.6, x, 0.5, z, 8)))]],
    trolley: [[M.alu, merged([B(16, 0.6, 7, 0, 1.2, 0), B(0.5, 14, 0.5, -7.5, 7, 0), B(0.5, 14, 0.5, 7.5, 7, 0)])]],
    tyreStack: [[M.tyre, merged([0, 1, 2].map(k => Cy(3.4, 3.2, 0, 3.2 + k * 3.3, 0, 20)))], [M.accent, new THREE.CylinderGeometry(3.55, 3.55, 9.6, 20, 1, true).translate(0, 6.5, 0)]],
    helmetShelf: [[M.dark, merged([B(16, 0.4, 3, 0, 14, 0), B(16, 0.4, 3, 0, 20, 0)])], [M.team, merged([-1, 0, 1].map(k => new THREE.SphereGeometry(1.4, 14, 10).translate(k * 5, 15.6, 0)))]],
    extinguisher: [[M.red, Cy(0.8, 5, 0, 2.5, 0, 12)], [M.dark, Cy(0.3, 0.8, 0, 5.3, 0, 8)]],
    gasCart: [[M.alu, B(6, 0.5, 4, 0, 1, 0)], [new THREE.MeshStandardMaterial({ color: 0x2f6f3a, roughness: 0.4, metalness: 0.4 }), merged([Cy(1.1, 12, -1.5, 7, 0, 12), Cy(1.1, 12, 1.5, 7, 0, 12)])]],
    fuelDrum: [[M.red, Cy(2.9, 8.8, 0, 4.4, 0, 18)]],
    stool: [[M.alu, merged([Cy(1.6, 0.6, 0, 7.5, 0), Cy(0.2, 7.2, 0, 3.6, 0, 8), Cy(1.4, 0.2, 0, 0.1, 0), new THREE.TorusGeometry(1.2, 0.1, 6, 16).rotateX(Math.PI / 2).translate(0, 2.6, 0)])]],
    directorChair: [[M.dark, merged([[-2, -2], [2, -2], [-2, 2], [2, 2]].map(([x, z]) => B(0.3, 9, 0.3, x, 4.5, z)))], [M.canvasCloth, B(4.4, 0.2, 4.4, 0, 6.5, 0)], [M.accent, B(4.4, 2.6, 0.2, 0, 10, -2.2)]],
    racingSeat: [[M.seat, merged([B(5, 1.5, 5, 0, 4, 0), B(5, 7, 1.2, 0, 7.5, -2.4)])], [M.alu, B(4, 3, 4, 0, 1.5, 0)]],
    pillarTV: [[M.team, B(3, H, 3, 0, H / 2, 0)], [M.screen, B(6, 3.6, 0.4, 0, 26, 2)]],
  };
  const place = {};   // kind -> list of Matrix4
  const at = (kind, x, z, a = 0) => { (place[kind] || (place[kind] = [])).push(new THREE.Matrix4().makeRotationY(a).setPosition(x, 0, z)); };
  const labelTex = {};
  const labelMat = (txt) => labelTex[txt] || (labelTex[txt] = new THREE.MeshStandardMaterial({ map: canvasTex(256, 64, (x, w, h) => { x.fillStyle = T().accent; x.fillRect(0, 0, w, h); x.fillStyle = '#ffffff'; x.font = 'bold 34px Arial'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(txt, w / 2, h / 2); }), roughness: 0.8 }));
  for (const p of L.props) {
    const [px, pz] = p.at, a = p.rot || 0, n = p.count || 1;
    for (let k = 0; k < n; k++) {
      const [x, z] = rot(k * (p.step || 0), 0, px, pz, a);
      if (p.kind === 'tyreTrolley') {
        at('trolley', x, z, 0);
        p.labels.forEach((lab, li) => {
          const tx = x + (li ? 4 : -4); at('tyreStack', tx, z);
          const lb = new THREE.Mesh(new THREE.PlaneGeometry(6.4, 1.6), labelMat(lab)); lb.position.set(tx, 7, z + (pz < 0 ? 3.65 : -3.65)); if (pz > 0) lb.rotation.y = Math.PI; g.add(lb);
        });
      } else if (PROP[p.kind]) at(p.kind, x, z, p.kind === 'pillarTV' ? (z < 0 ? 0 : Math.PI) : a);
    }
  }
  for (const [kind, mats] of Object.entries(place)) {
    PROP[kind].forEach(([mat, geo], pi) => {
      const im = new THREE.InstancedMesh(geo, mat, mats.length);
      mats.forEach((m, i) => im.setMatrixAt(i, m));
      im.name = `Garage_${kind}_${pi}`; im.castShadow = true; im.receiveShadow = true; im.computeBoundingSphere(); g.add(im);
    });
  }

  // ---------------------------------------------------------------- engineers' desk with the monitor wall, regulations monitor and printed sheet
  const DK = L.desk, [dx, dz] = DK.at;
  box(M.dark, DK.depth, 0.6, DK.length, dx, DK.height, dz);
  for (const s of [-1, 1]) box(M.dark, DK.depth - 1, DK.height, 0.6, dx, DK.height / 2, dz + s * (DK.length / 2 - 0.5));
  const MW = DK.monitorWall;
  for (let r = 0; r < MW.rows; r++) for (let c = 0; c < MW.cols; c++) {
    box(M.dark, 0.6, MW.h + 0.4, MW.w + 0.4, dx + DK.depth / 2 + 3, 20 + r * (MW.h + 0.8), dz - (MW.cols - 1) / 2 * (MW.w + 0.8) + c * (MW.w + 0.8));
  }
  const telemTex = canvasTex(512, 256, (x, w, h) => { x.fillStyle = '#07101c'; x.fillRect(0, 0, w, h); const cols = ['#00e0ff', '#ffcc00', '#ff4d6d', '#7cff6b']; cols.forEach((cc, k) => { x.strokeStyle = cc; x.lineWidth = 2; x.beginPath(); for (let i = 0; i <= 64; i++) { const yy = h * (0.2 + k * 0.2) + Math.sin(i * 0.4 + k) * 12 + Math.sin(i * 1.7 + k * 3) * 5; i ? x.lineTo(i * w / 64, yy) : x.moveTo(0, yy); } x.stroke(); }); });
  const telemMat = new THREE.MeshStandardMaterial({ map: telemTex, emissive: 0xffffff, emissiveMap: telemTex, emissiveIntensity: 0.8 });
  for (let r = 0; r < MW.rows; r++) for (let c = 0; c < MW.cols; c++) {
    const sc = new THREE.Mesh(new THREE.PlaneGeometry(MW.w, MW.h), telemMat); sc.rotation.y = -Math.PI / 2;
    sc.position.set(dx + DK.depth / 2 + 2.6, 20 + r * (MW.h + 0.8), dz - (MW.cols - 1) / 2 * (MW.w + 0.8) + c * (MW.w + 0.8)); g.add(sc);
  }
  const team = () => T().name;
  const regMon = canvasTex(1024, 768, (x, w, h) => drawRegulations(x, w, h, { dark: true, team: team() }), { aniso: 16 });
  const regSheet = canvasTex(768, 1024, (x, w, h) => drawRegulations(x, w, h, { dark: false, team: team() }), { aniso: 16 });
  const mon = new THREE.Mesh(new THREE.PlaneGeometry(8, 6), new THREE.MeshStandardMaterial({ map: regMon, emissive: 0xffffff, emissiveMap: regMon, emissiveIntensity: 0.9 }));
  mon.rotation.y = -Math.PI / 2; mon.position.set(dx + 1.5, DK.height + 4.6, dz - 6); mon.name = 'Garage_Desk_Monitor'; mon.userData.click = 'regulations'; g.add(mon);
  box(M.dark, 0.5, 6.6, 8.6, dx + 1.85, DK.height + 4.6, dz - 6); box(M.dark, 0.5, 3, 0.5, dx + 2, DK.height + 1.5, dz - 6); box(M.dark, 2.5, 0.3, 2.5, dx + 2, DK.height + 0.4, dz - 6);
  const sheet = new THREE.Mesh(new THREE.PlaneGeometry(2.1, 2.97), new THREE.MeshStandardMaterial({ map: regSheet, roughness: 0.9 }));
  sheet.rotation.set(-Math.PI / 2, 0, Math.PI / 2 + 0.2); sheet.position.set(dx - 1, DK.height + 0.32, dz + 2); sheet.name = 'Garage_Regs_Sheet'; sheet.userData.click = 'regulations'; g.add(sheet);
  // laptop
  box(M.dark, 2.4, 0.15, 3.4, dx - 1.2, DK.height + 0.38, dz + 8); { const lid = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 2.2), telemMat); lid.rotation.y = -Math.PI / 2; lid.rotation.z = 0; lid.position.set(dx + 0.05, DK.height + 1.5, dz + 8); g.add(lid); }
  g.userData.clickables = [mon, sheet];
  g.userData.deskView = { target: [dx + 1, DK.height + 3, dz - 2], pos: [dx - 22, DK.height + 9, dz - 2] };

  // ---------------------------------------------------------------- car stands (shown when the wheels are off)
  const stands = new THREE.Group(); stands.name = 'Garage_Car_Stands'; stands.visible = false;
  const S = L.stands, standGeo = [];
  for (const sx of [S.front, S.rear]) { standGeo.push(new THREE.BoxGeometry(1.2, S.raise + 1.4, 8).translate(sx, (S.raise + 1.4) / 2, 0), new THREE.BoxGeometry(8, 0.6, 1).translate(sx - 4, 0.3, 0)); }
  standGeo.push(new THREE.CylinderGeometry(1, 1.4, S.raise + 1.2, 12).translate(S.jack, (S.raise + 1.2) / 2, 0), new THREE.BoxGeometry(14, 0.5, 1.2).translate(S.jack - 7, 0.25, 0));
  const sm = new THREE.Mesh(mergeGeometries(standGeo), M.red); stands.add(sm); g.add(stands);
  g.userData.stands = stands;

  // ---------------------------------------------------------------- merge
  for (const [mat, list] of parts) { const m = new THREE.Mesh(mergeGeometries(list.map(x => x.index ? x.toNonIndexed() : x)), mat); m.receiveShadow = true; g.add(m); }
  // lights: soft fill plus the canopy over the car
  const hemi = new THREE.HemisphereLight(0xffffff, 0x8a8f96, 0.9); g.add(hemi);
  const pl = new THREE.PointLight(0xffffff, 1.2, 0, 0); pl.position.set((C.x0 + C.x1) / 2, C.y - 2, 0); g.add(pl);
  g.userData.lights = [hemi, pl];

  g.userData.setTeam = (id) => {
    teamId = GARAGE_TEAM_COLORS[id] ? id : 'red-bull';
    M.team.color.set(T().panel); M.accent.color.set(T().accent);
    for (const t of [regMon, regSheet, ...Object.values(labelTex).map(m => m.map)]) { const c = t.userData.canvas; t.userData.draw(c.getContext('2d'), c.width, c.height); t.needsUpdate = true; }
  };
  g.userData.layout = L;
  /** free every geometry, material and texture of the garage (called when leaving the garage) */
  g.userData.dispose = () => {
    const mats = new Set(), texs = new Set();
    g.traverse(o => {
      if (o.geometry) o.geometry.dispose();
      if (o.isInstancedMesh) o.dispose();
      (Array.isArray(o.material) ? o.material : o.material ? [o.material] : []).forEach(m => mats.add(m));
    });
    mats.forEach(m => { for (const k of ['map', 'emissiveMap', 'normalMap', 'roughnessMap', 'bumpMap']) if (m[k]) texs.add(m[k]); m.dispose(); });
    texs.forEach(t => t.dispose());
    g.removeFromParent();
  };
  return g;
}
