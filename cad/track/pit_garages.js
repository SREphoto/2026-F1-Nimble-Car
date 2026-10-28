/**
 * pit_garages.js: the team garages along the pit building, one open bay per 2026 team, in pit order from the pit entry.
 * Each bay has a branded back wall, a team colour floor with a trim line, partition walls in the team colours,
 * a lit ceiling and an overhead gantry sign. All team data (names, colours, lettering style) is in garage/pit_garages.json.
 * Plain lettering in team colours only, no logo artwork. Units: metres inside the group, the group is scaled by DM.
 * Text never mirrors: every sign is a plane whose front (+z) faces the pit lane, and the bays run left to right as seen
 * from the pit lane, so the canvas is drawn the normal way round.
 */
import * as THREE from 'three';
import PIT_GARAGES from './garage/pit_garages.json' with { type: 'json' };

function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}
function fitText(ctx, text, font, maxW, size) {
  let s = size; do { ctx.font = `${font} ${s}px Arial, Helvetica, sans-serif`; s -= 2; } while (ctx.measureText(text).width > maxW && s > 10); return s;
}
/** back wall: team colour panels, a stripe, the big team name, the entry name and both car numbers */
function backWallTex(T) {
  return canvasTex(1024, 192, (x, w, h) => {
    x.fillStyle = T.wall; x.fillRect(0, 0, w, h);
    for (let i = 1; i < 8; i++) { x.fillStyle = 'rgba(0,0,0,0.10)'; x.fillRect(i * w / 8 - 1, 0, 2, h); }   // panel joints
    x.fillStyle = T.trim; x.fillRect(0, h * 0.80, w, h * 0.20);                                         // lower band
    x.fillStyle = T.stripe; x.fillRect(0, h * 0.76, w, h * 0.04);
    x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = T.text;
    fitText(x, T.name, T.font, w * 0.62, 64); x.fillText(T.name, w / 2, h * 0.36);
    fitText(x, T.entry.toUpperCase(), '700', w * 0.5, 20); x.globalAlpha = 0.85; x.fillText(T.entry.toUpperCase(), w / 2, h * 0.62); x.globalAlpha = 1;
    x.font = `${T.font} 54px Arial, Helvetica, sans-serif`;
    T.numbers.forEach((n, k) => x.fillText(String(n), k ? w * 0.89 : w * 0.11, h * 0.40));
  });
}
/** overhead gantry sign: black or white box face with the team name and a colour bar */
function gantryTex(T) {
  return canvasTex(1024, 96, (x, w, h) => {
    x.fillStyle = T.trim; x.fillRect(0, 0, w, h);
    x.fillStyle = T.wall; x.fillRect(0, h - 10, w, 10); x.fillStyle = T.stripe; x.fillRect(0, 0, w, 6);
    x.textAlign = 'center'; x.textBaseline = 'middle';
    const dark = parseInt(T.trim.slice(1), 16), lum = ((dark >> 16) * 0.3 + ((dark >> 8) & 255) * 0.59 + (dark & 255) * 0.11);
    x.fillStyle = lum > 140 ? T.wall : '#ffffff';
    fitText(x, T.name, T.font, w * 0.9, 58); x.fillText(T.name, w / 2, h * 0.52);
  });
}

/**
 * build the bays. front: Vector2 centre of the garage face, nrm: Vector2 facing the pit lane, y: ground, len: building length,
 * entryDir: Vector2 from the building towards the pit entry (decides which end McLaren sits at).
 */
export function buildPitGarages({ front, nrm, y, len, entryDir, DM, recess = 7, height = 5 }) {
  const teams = PIT_GARAGES.teams, n = teams.length, W = len / n;
  const root = new THREE.Group(); root.name = 'RBR_Team_Garages';
  root.rotation.y = Math.atan2(nrm.x, nrm.y);
  root.position.set(front.x * DM, y * DM, front.y * DM); root.scale.setScalar(DM);
  const right = new THREE.Vector2(nrm.y, -nrm.x);              // local +x in world xz, left to right seen from the pit lane
  const fromLeft = entryDir.dot(right) < 0;                     // pit entry on the viewer's left: first team on the left
  const disposables = [];
  const mat = (o) => { const m = new THREE.MeshStandardMaterial({ roughness: 0.6, ...o }); disposables.push(m); return m; };
  const ceilMat = mat({ color: 0x2a2d32, roughness: 0.9 }), lightMat = new THREE.MeshBasicMaterial({ color: 0xf4f7ff });
  const fasciaMat = mat({ color: 0xd9dde2, roughness: 0.7 });
  const plane = (w, h, m, px, py, pz, rx = 0, ry = 0) => { const me = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m); me.position.set(px, py, pz); me.rotation.set(rx, ry, 0); me.receiveShadow = true; root.add(me); return me; };
  const box = (w, h, d, m, px, py, pz) => { const me = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); me.position.set(px, py, pz); me.castShadow = me.receiveShadow = true; root.add(me); return me; };
  for (let i = 0; i < n; i++) {
    const T = teams[fromLeft ? i : n - 1 - i];
    const cx = -len / 2 + (i + 0.5) * W;
    const wallTex = backWallTex(T), signTex = gantryTex(T);
    const wallM = mat({ map: wallTex, roughness: 0.55 }), floorM = mat({ color: T.floor, roughness: 0.35, metalness: 0.05 });
    const partM = mat({ color: T.wall, roughness: 0.5 }), trimM = mat({ color: T.trim, roughness: 0.45 }), stripeM = mat({ color: T.stripe, roughness: 0.5 });
    const signM = mat({ map: signTex, roughness: 0.4, emissive: 0xffffff, emissiveMap: signTex, emissiveIntensity: 0.35 });
    // floor (slightly above the apron so it never flickers against it), trim line along the door and two car box lines
    plane(W - 0.4, recess + 0.3, floorM, cx, 0.2, -recess / 2 + 0.15, -Math.PI / 2);
    plane(W - 0.4, 0.25, stripeM, cx, 0.21, -0.2, -Math.PI / 2);
    plane(0.12, recess - 1, stripeM, cx, 0.21, -recess / 2 - 0.3, -Math.PI / 2);
    // back wall with the branding, ceiling with two light strips
    plane(W - 0.4, height, wallM, cx, height / 2, -recess + 0.02);
    plane(W, recess, ceilMat, cx, height, -recess / 2, Math.PI / 2);
    for (const o of [-0.25, 0.25]) plane(W * 0.35, 0.3, lightMat, cx + o * W, height - 0.02, -recess / 2, Math.PI / 2);
    // partition walls: team colour, a trim band at the bottom and the front edge in the trim colour
    for (const s of [-1, 1]) {
      const px = cx + s * (W / 2 - 0.15);
      box(0.3, height, recess, partM, px, height / 2, -recess / 2);
      box(0.34, 0.9, recess, trimM, px, 0.45, -recess / 2);
      box(0.4, height, 0.3, trimM, px, height / 2, -0.15);
    }
    // overhead gantry sign across the door
    const gw = W * 0.82, gh = gw / 1024 * 96;
    box(gw, gh, 0.35, trimM, cx, height + 0.55, 0.25);
    plane(gw, gh, signM, cx, height + 0.55, 0.43);

    // Roll-up sectional door guide rails & corrugated shutter in upper section
    const doorH = height * 0.35; // upper 35% corrugated door
    box(W - 0.4, doorH, 0.08, mat({ color: 0x383e48, roughness: 0.65, metalness: 0.4 }), cx, height - doorH / 2, -0.05);

    // Overhead carbon-fiber swinging pit stop boom / service gantry extending over the pit box
    const boomL = 4.2; // 4.2 m reach over the pit apron
    box(0.12, 0.12, boomL, mat({ color: 0x181a1f, roughness: 0.4, metalness: 0.8 }), cx + 1.2, height - 0.2, boomL / 2);
    // Boom diagonal tension tie-rod
    box(0.04, 0.04, boomL * 0.95, mat({ color: 0x8a929b, roughness: 0.3, metalness: 0.9 }), cx + 1.2, height + 0.35, boomL * 0.45, 0.2);
    // Suspended pneumatic air hose drop reels & digital lollipop signal light
    box(0.08, 1.4, 0.08, mat({ color: 0x00d4e8, roughness: 0.5 }), cx + 1.2, height - 0.9, boomL - 0.4);
    box(0.24, 0.18, 0.24, mat({ color: 0x111111, roughness: 0.5 }), cx + 1.2, height - 1.6, boomL - 0.4);
    // Pit lollipop green/red LED signal disk
    const sigM = new THREE.MeshBasicMaterial({ color: 0x00e676 });
    plane(0.22, 0.22, sigM, cx + 1.2, height - 1.6, boomL - 0.27);

    // Tyre warming racks with heated tyre blankets stacked in the bay (left side)
    const tyreR = 0.36, tyreW = 0.32;
    const tyreMat = mat({ color: 0x18181c, roughness: 0.95 });
    const blanketSoft = mat({ color: 0xd4202c, roughness: 0.6 }); // red blanket
    const blanketMed = mat({ color: 0xf2c200, roughness: 0.6 });  // yellow blanket
    const blanketHard = mat({ color: 0xf5f5f5, roughness: 0.6 }); // white blanket
    const blankets = [blanketSoft, blanketMed, blanketHard];
    const tx = cx - (W / 2 - 1.1), tz = -recess + 1.6;
    // Tyre rack frame
    box(tyreW * 2 + 0.3, 1.4, 0.8, mat({ color: 0x4a525d, roughness: 0.5, metalness: 0.7 }), tx, 0.7, tz);
    // 4 tyres in blankets on rack
    for (let ti = 0; ti < 4; ti++) {
      const bM = blankets[ti % blankets.length];
      const tyPos = 0.45 + (ti % 2) * (tyreR * 2 + 0.08);
      const tzPos = tz - 0.2 + Math.floor(ti / 2) * 0.45;
      box(tyreW, tyreR * 1.8, tyreR * 1.8, bM, tx, tyPos, tzPos);
    }

    // Heavy-duty mechanics mobile tool chest & diagnostic telemetry cart (right side)
    const toolX = cx + (W / 2 - 1.0), toolZ = -recess + 1.8;
    // Tool cabinet in team trim color
    box(1.2, 1.1, 0.7, trimM, toolX, 0.55, toolZ);
    // Cabinet drawers & stainless steel worktop
    box(1.25, 0.08, 0.75, mat({ color: 0xd8dde4, roughness: 0.3, metalness: 0.85 }), toolX, 1.14, toolZ);
    // Telemetry monitor display screen
    const screenTex = canvasTex(256, 128, (x, w, h) => {
      x.fillStyle = '#080c14'; x.fillRect(0, 0, w, h);
      x.fillStyle = T.trim; x.fillRect(0, 0, w, 8);
      x.fillStyle = '#00d4e8'; x.font = 'bold 16px monospace'; x.fillText('TELEMETRY LIVE', 12, 30);
      x.fillStyle = '#f8d000'; x.fillText('SYS OK · 800V DC', 12, 55);
      // Graph wave
      x.strokeStyle = '#00e676'; x.lineWidth = 2;
      x.beginPath();
      for (let px = 10; px < w - 10; px += 10) x.lineTo(px, 90 + Math.sin(px * 0.1) * 15);
      x.stroke();
    });
    const monM = mat({ map: screenTex, emissive: 0xffffff, emissiveMap: screenTex, emissiveIntensity: 0.6 });
    plane(0.65, 0.4, monM, toolX, 1.45, toolZ + 0.1);
    box(0.68, 0.43, 0.05, mat({ color: 0x111111, roughness: 0.6 }), toolX, 1.45, toolZ + 0.07);

    // Front quick-lift carbon pit jack standing ready at pit box line
    box(0.45, 0.75, 0.06, mat({ color: 0x15171a, roughness: 0.5, metalness: 0.8 }), cx - 1.6, 0.38, 1.6);
    box(0.04, 0.9, 0.04, mat({ color: 0xd4202c, roughness: 0.4 }), cx - 1.6, 0.45, 1.4, 0.35); // red handle
  }
  // fascia band between the doors and the glass floor above
  box(len, 1.1, 0.5, fasciaMat, 0, height + 0.55, -0.05);
  root.userData.dispose = () => { disposables.forEach(m => { m.map?.dispose(); m.dispose(); }); root.traverse(o => o.geometry?.dispose()); };
  root.userData.recess = recess;
  return root;
}
