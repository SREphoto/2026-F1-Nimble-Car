/**
 * weather_fx.js — visual weather effects, each a small self-contained piece:
 * layered clouds, GPU rain streaks, waving flags, swaying trees, puddles + a drying racing line,
 * and rain drops on the camera. All driven by weather.js; none of them edit the track files.
 * Scene units: 1 m = DM (10) units on the Red Bull Ring.
 * SREdesigns - Samuel R Erwin III
 */
import * as THREE from 'three';

const DM = 10;

// ------------------------------------------------------------------ tileable value-noise fbm (once, 256²)
function noiseTexture(size = 256) {
  const data = new Uint8Array(size * size * 4);
  const lat = (g, s) => { const a = new Float32Array(g * g); let x = s; for (let i = 0; i < a.length; i++) { x = (x * 16807) % 2147483647; a[i] = x / 2147483647; } return a; };
  const octs = [4, 8, 16, 32, 64].map((g, k) => ({ g, a: lat(g, 1234 + k * 77), w: 0.5 ** k }));
  const sm = t => t * t * (3 - 2 * t);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    let v = 0, wsum = 0;
    for (const o of octs) {
      const fx = x / size * o.g, fy = y / size * o.g, ix = Math.floor(fx), iy = Math.floor(fy), tx = sm(fx - ix), ty = sm(fy - iy);
      const at = (i, j) => o.a[((j % o.g) * o.g) + (i % o.g)];
      v += o.w * ((at(ix, iy) * (1 - tx) + at(ix + 1, iy) * tx) * (1 - ty) + (at(ix, iy + 1) * (1 - tx) + at(ix + 1, iy + 1) * tx) * ty); wsum += o.w;
    }
    const i = (y * size + x) * 4; data[i] = data[i + 1] = data[i + 2] = Math.round(v / wsum * 255); data[i + 3] = 255;
  }
  const t = new THREE.DataTexture(data, size, size); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipmapLinearFilter; t.generateMipmaps = true; t.needsUpdate = true;
  return t;
}

// ------------------------------------------------------------------ clouds: big horizontal layers that follow the camera
let NOISE = null;   // shared, built once on first use
const disposeTree = o => o.traverse(c => { c.geometry?.dispose(); (Array.isArray(c.material) ? c.material : [c.material]).forEach(m => m?.dispose?.()); });

export function createClouds(scene, layers = 2) {
  const tex = NOISE || (NOISE = noiseTexture());
  const group = new THREE.Group(); group.name = 'WX_Clouds'; scene.add(group);
  const defs = [{ h: 14000, s: 1 / 26000, o: 1 }, { h: 19000, s: 1 / 41000, o: 0.8 }, { h: 26000, s: 1 / 70000, o: 0.6 }].slice(0, layers);
  const mats = defs.map((d, k) => {
    const m = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, fog: false, side: THREE.DoubleSide,
      uniforms: { tNoise: { value: tex }, uCover: { value: 0 }, uOffset: { value: new THREE.Vector2(k * 0.37, k * 0.61) }, uScale: { value: d.s }, uLit: { value: new THREE.Color(1, 1, 1) }, uDark: { value: new THREE.Color(0.32, 0.35, 0.4) }, uFade: { value: 190000 }, uOpacity: { value: d.o } },
      vertexShader: `varying vec2 vW; varying float vD; void main(){ vec4 wp = modelMatrix * vec4(position,1.0); vW = wp.xz; vD = length(wp.xz - cameraPosition.xz); gl_Position = projectionMatrix * viewMatrix * wp; }`,
      fragmentShader: `uniform sampler2D tNoise; uniform float uCover, uScale, uFade, uOpacity; uniform vec2 uOffset; uniform vec3 uLit, uDark; varying vec2 vW; varying float vD;
        void main(){ vec2 p = vW * uScale + uOffset;
          float n = texture2D(tNoise, p).r * 0.62 + texture2D(tNoise, p * 2.7 + 0.3).r * 0.38;
          n = clamp((n - 0.5) * 2.4 + 0.5, 0.0, 1.0);                       // stretch contrast: real gaps and dense cores
          float a = smoothstep(1.0 - uCover - 0.05, 1.0 - uCover + 0.22, n);
          float sunSide = texture2D(tNoise, p + vec2(0.012, 0.008)).r;       // a sample towards the sun: brighter edges, darker bellies
          float thick = clamp(smoothstep(0.3, 1.0, n) * (0.45 + 0.55 * uCover) + (n - sunSide) * 1.5, 0.0, 1.0);
          vec3 col = mix(uLit, uDark, thick);
          float fade = 1.0 - smoothstep(uFade * 0.45, uFade, vD);
          gl_FragColor = vec4(col, a * fade * uOpacity); }`,
    });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(400000, 400000).rotateX(-Math.PI / 2), m);
    mesh.position.y = d.h; mesh.renderOrder = -5; mesh.frustumCulled = false; mesh.userData.h = d.h; group.add(mesh);
    return m;
  });
  return {
    group,
    dispose() { group.removeFromParent(); disposeTree(group); },
    update(dt, W, camera, lit, dark) {
      group.children.forEach(c => c.position.set(camera.position.x, c.userData.h, camera.position.z));
      mats.forEach((m, k) => {
        m.uniforms.uCover.value = THREE.MathUtils.clamp(W.cloud * (1 - k * 0.12) + 0.02, 0, 1);
        m.uniforms.uOffset.value.x += W.wind.x * DM * dt * m.uniforms.uScale.value * (1 + k * 0.3);
        m.uniforms.uOffset.value.y += W.wind.z * DM * dt * m.uniforms.uScale.value * (1 + k * 0.3);
        m.uniforms.uLit.value.copy(lit); m.uniforms.uDark.value.copy(dark);
      });
    },
  };
}

// ------------------------------------------------------------------ rain: line streaks wrapped in a box around the camera (all on the GPU)
export function createRain(scene, maxDrops) {
  const pos = new Float32Array(maxDrops * 6), seed = new Float32Array(maxDrops * 6), end = new Float32Array(maxDrops * 2);
  for (let i = 0; i < maxDrops; i++) {
    const s = [Math.random(), Math.random(), Math.random()];
    for (let v = 0; v < 2; v++) { seed.set(s, (i * 2 + v) * 3); end[i * 2 + v] = v; }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 3));
  g.setAttribute('aEnd', new THREE.BufferAttribute(end, 1));
  const box = new THREE.Vector3(24 * DM, 16 * DM, 24 * DM);
  const m = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, fog: false,
    uniforms: { uTime: { value: 0 }, uCam: { value: new THREE.Vector3() }, uBox: { value: box }, uVel: { value: new THREE.Vector3(0, -9 * DM, 0) }, uLen: { value: 0.07 }, uCol: { value: new THREE.Color(0.86, 0.9, 0.96) }, uAlpha: { value: 0.35 } },
    vertexShader: `attribute vec3 aSeed; attribute float aEnd; uniform float uTime, uLen; uniform vec3 uCam, uBox, uVel; varying float vA;
      void main(){ vec3 v = uVel * (0.85 + 0.3 * aSeed.y);
        vec3 p = mod(aSeed * uBox + v * uTime - uCam + uBox * 0.5, uBox) - uBox * 0.5 + uCam;
        p -= v * uLen * aEnd;
        vec4 mv = viewMatrix * vec4(p, 1.0);
        vA = (1.0 - aEnd * 0.7) * (1.0 - smoothstep(uBox.x * 0.25, uBox.x * 0.5, length(p - uCam)));
        gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform vec3 uCol; uniform float uAlpha; varying float vA; void main(){ gl_FragColor = vec4(uCol, vA * uAlpha); }`,
  });
  const lines = new THREE.LineSegments(g, m);
  lines.name = 'WX_Rain'; lines.frustumCulled = false; lines.renderOrder = 5; lines.visible = false;
  lines.onBeforeRender = (r, s, cam) => { m.uniforms.uCam.value.copy(cam.position); };
  scene.add(lines);
  return {
    lines,
    dispose() { lines.removeFromParent(); g.dispose(); m.dispose(); },
    update(dt, W, scale = 1) {
      const n = Math.round(maxDrops * Math.min(1, W.rain * 1.15));
      lines.visible = n > 20;
      g.setDrawRange(0, n * 2);
      m.uniforms.uTime.value += dt;
      // rain angle follows the wind; heavier rain falls a little faster
      m.uniforms.uVel.value.set(W.wind.x * 0.8 * DM, -(7.5 + 2.5 * W.rain) * DM, W.wind.z * 0.8 * DM).multiplyScalar(scale);
      m.uniforms.uAlpha.value = 0.4 + 0.45 * W.rain;
    },
  };
}

// ------------------------------------------------------------------ flags on poles along the main straight (cloth waved in the vertex shader)
export function createFlags(group, track) {
  const root = new THREE.Group(); root.name = 'WX_Flags'; group.add(root);
  const uni = { uTime: { value: 0 }, uWind: { value: 0 } };
  const cv = document.createElement('canvas'); cv.width = 64; cv.height = 42;
  const c = cv.getContext('2d'); c.fillStyle = '#ed2939'; c.fillRect(0, 0, 64, 42); c.fillStyle = '#fff'; c.fillRect(0, 14, 64, 14);
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.MeshLambertMaterial({ map: tex, side: THREE.DoubleSide });
  mat.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, uni);
    sh.vertexShader = 'uniform float uTime; uniform float uWind;\n' + sh.vertexShader.replace('#include <begin_vertex>', `
      vec3 transformed = position;
      float u = clamp(position.x / 3.0, 0.0, 1.0);
      float droop = (1.0 - uWind) * 1.35;
      transformed.y -= position.x * sin(droop); transformed.x = position.x * cos(droop);
      transformed.z += sin(u * 7.0 - uTime * (3.0 + 9.0 * uWind)) * 0.28 * u * (0.25 + uWind);`);
  };
  const flagGeo = new THREE.PlaneGeometry(3, 2, 16, 4).translate(1.5, -1, 0);
  const poleGeo = new THREE.CylinderGeometry(0.06, 0.08, 9, 6).translate(0, 4.5, 0);
  const SPOTS = [-140, -95, -50, 260, 305];
  // one draw call for all poles, one for all flags
  const poles = new THREE.InstancedMesh(poleGeo, new THREE.MeshLambertMaterial({ color: 0xb8bcc2 }), SPOTS.length);
  const cloth = new THREE.InstancedMesh(flagGeo, mat, SPOTS.length);
  cloth.frustumCulled = false;
  const base = SPOTS.map(sp => { const F = track.at((sp + track.length) % track.length); const lat = -(F.barL + 5); return new THREE.Vector3((F.x + F.rx * lat) * DM, F.y * DM, (F.z + F.rz * lat) * DM); });
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(DM, DM, DM), up = new THREE.Vector3(0, 1, 0), tp = new THREE.Vector3();
  base.forEach((b, i) => poles.setMatrixAt(i, m4.compose(b, q.identity(), sc)));
  poles.computeBoundingSphere();
  root.add(poles, cloth);
  let lastYaw = null;
  return {
    dispose() { root.removeFromParent(); disposeTree(root); tex.dispose(); },
    update(dt, W) {
      uni.uTime.value += dt;
      uni.uWind.value = THREE.MathUtils.clamp(W.windKmh * W.gust / 45, 0, 1);
      const yaw = Math.atan2(-W.wind.z, W.wind.x);          // flag's +x points downwind
      if (lastYaw !== null && Math.abs(yaw - lastYaw) < 1e-3) return;
      lastYaw = yaw; q.setFromAxisAngle(up, yaw);
      base.forEach((b, i) => cloth.setMatrixAt(i, m4.compose(tp.copy(b).setY(b.y + 8.9 * DM), q, sc)));
      cloth.instanceMatrix.needsUpdate = true;
    },
  };
}

// ------------------------------------------------------------------ trees sway with the wind (patches the shared tree material once)
export function patchTrees(group) {
  const uni = { uTime: { value: 0 }, uSway: { value: new THREE.Vector2() } };
  let mat = null;
  group.traverse(o => { if (!mat && o.isInstancedMesh && /RBR_Trees_/.test(o.parent?.name || '')) mat = o.material; });
  if (!mat) return { update() {} };
  const prev = mat.onBeforeCompile;
  mat.onBeforeCompile = (sh, r) => {
    prev?.call(mat, sh, r);
    Object.assign(sh.uniforms, uni);
    sh.vertexShader = 'uniform float uTime; uniform vec2 uSway;\n' + sh.vertexShader.replace('#include <project_vertex>', `
      vec4 mvPosition = vec4(transformed, 1.0);
      #ifdef USE_INSTANCING
        mvPosition = instanceMatrix * mvPosition;
        float ph = instanceMatrix[3].x * 0.004 + instanceMatrix[3].z * 0.0053;
      #else
        float ph = 0.0;
      #endif
      float hh = clamp(transformed.y / 150.0, 0.0, 1.0);
      mvPosition.xz += uSway * hh * hh * (0.65 + 0.35 * sin(uTime * 1.6 + ph));
      mvPosition = modelViewMatrix * mvPosition;
      gl_Position = projectionMatrix * mvPosition;`);
  };
  const key = mat.customProgramCacheKey?.bind(mat);
  mat.customProgramCacheKey = () => (key ? key() : '') + '|wxSway';
  mat.needsUpdate = true;
  return {
    update(dt, W, on = true) {
      uni.uTime.value += dt;
      const s = on ? (W.windKmh * W.gust / 50) ** 1.5 * 6 : 0;    // up to ~0.6 m at the tree top in a storm
      uni.uSway.value.set(W.wind.x, W.wind.z).normalize().multiplyScalar(s || 0);
      if (!isFinite(uni.uSway.value.x)) uni.uSway.value.set(0, 0);
    },
  };
}

// ------------------------------------------------------------------ puddles (sky reflection) and the drying racing line
export function createWetSurface(group, circuit, renderer, nPuddles) {
  const { track, raceline } = circuit;
  // tiny environment map from a grey sky so puddles reflect something
  const pm = new THREE.PMREMGenerator(renderer);
  const es = new THREE.Scene();
  const eg = new THREE.SphereGeometry(10, 16, 8); const col = [];
  for (let i = 0; i < eg.attributes.position.count; i++) { const t = Math.max(0, eg.attributes.position.getY(i) / 10); const c = new THREE.Color(0x3a3e44).lerp(new THREE.Color(0xc5ccd4), Math.pow(t, 0.5)); col.push(c.r, c.g, c.b); }
  eg.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  es.add(new THREE.Mesh(eg, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide })));
  const env = pm.fromScene(es, 0.02).texture; pm.dispose();

  // puddles: soft-edged discs near the track edges
  const disc = new THREE.RingGeometry(0, 1, 24, 3).rotateX(-Math.PI / 2);
  const a = []; for (let i = 0; i < disc.attributes.position.count; i++) { const rr = Math.hypot(disc.attributes.position.getX(i), disc.attributes.position.getZ(i)); a.push(1, 1, 1, rr < 0.7 ? 1 : 0); }
  disc.setAttribute('color', new THREE.Float32BufferAttribute(a, 4));
  const pMat = new THREE.MeshStandardMaterial({ color: 0x2a2f36, roughness: 0.04, metalness: 0.65, envMap: env, envMapIntensity: 1.2, transparent: true, vertexColors: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 });
  const puddles = new THREE.InstancedMesh(disc, pMat, nPuddles); puddles.name = 'WX_Puddles';
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3();
  let r = 99;
  const rnd = () => { r = (r * 16807) % 2147483647; return r / 2147483647; };
  for (let i = 0; i < nPuddles; i++) {
    const F = track.at(rnd() * track.length);
    const side = rnd() < 0.5 ? -1 : 1, edge = side > 0 ? F.wr : F.wl;
    const lat = side * (edge - 0.6 - rnd() * 2.2);
    p.set((F.x + F.rx * lat) * DM, (F.y + 0.03) * DM, (F.z + F.rz * lat) * DM);
    q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.atan2(F.tz, F.tx));
    s.set((1.5 + rnd() * 3.5) * DM, 1, (0.6 + rnd() * 1.2) * DM);
    puddles.setMatrixAt(i, m4.compose(p, q, s));
  }
  puddles.computeBoundingSphere(); puddles.visible = false; puddles.renderOrder = 2;
  group.add(puddles);

  // drying line: a ribbon on the TUM racing line, drawn in dry-asphalt colour with soft edges
  const asphalt = (() => { let m = null; group.traverse(o => { if (!m && o.isMesh && o.name === 'RBR_Asphalt') m = o.material; }); return m; })();
  const lMat = new THREE.MeshStandardMaterial({ map: asphalt?.map || null, color: asphalt ? asphalt.color.clone() : new THREE.Color(0x55575a), roughness: 0.92, transparent: true, vertexColors: true, depthWrite: false, opacity: 0, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  const P = [], C = [], U = [], I = [];
  const step = 2, n = raceline.n, HW = [-1.1, -0.55, 0.55, 1.1], AL = [0, 1, 1, 0];
  let hint = -1, k = 0;
  for (let i = 0; i <= n; i += step, k++) {
    const j = i % n, j2 = (j + step) % n;
    const tx = raceline.x[j2] - raceline.x[j], tz = raceline.z[j2] - raceline.z[j], tl = Math.hypot(tx, tz) || 1;
    const L = track.locate(raceline.x[j], raceline.z[j], hint); hint = L.i;
    HW.forEach((w, c) => {
      const x = raceline.x[j] + (-tz / tl) * w, z = raceline.z[j] + (tx / tl) * w;
      P.push(x * DM, (L.y + 0.025) * DM, z * DM); C.push(1, 1, 1, AL[c]); U.push(x / 12, z / 12);
    });
    if (k) for (let c = 0; c < 3; c++) { const a0 = (k - 1) * 4 + c, b0 = k * 4 + c; I.push(a0, b0, a0 + 1, a0 + 1, b0, b0 + 1); }
  }
  const lg = new THREE.BufferGeometry();
  lg.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); lg.setAttribute('color', new THREE.Float32BufferAttribute(C, 4)); lg.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2));
  lg.setIndex(I); lg.computeVertexNormals();
  const line = new THREE.Mesh(lg, lMat); line.name = 'WX_DryLine'; line.visible = false; line.renderOrder = 1;
  group.add(line);

  return {
    dispose() { puddles.removeFromParent(); line.removeFromParent(); disc.dispose(); pMat.dispose(); lg.dispose(); lMat.dispose(); env.dispose(); },
    update(W, dryLine) {
      const pa = THREE.MathUtils.smoothstep(W.water, 0.25, 0.6);
      puddles.visible = pa > 0.01; pMat.opacity = pa * 0.92;
      line.visible = dryLine > 0.01; lMat.opacity = dryLine;
    },
  };
}

// ------------------------------------------------------------------ rain drops on the camera (2D canvas over the 3D view)
export function createLensDrops(host) {
  const cv = document.createElement('canvas'); cv.id = 'wx-lens';
  cv.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:4;display:none';
  host.appendChild(cv);
  const g = cv.getContext('2d'); const drops = [];
  let t = 0;
  return {
    dispose() { cv.remove(); },
    update(dt, rain, speed, show) {
      cv.style.display = show && rain > 0.03 ? 'block' : 'none';
      if (cv.style.display === 'none') { drops.length = 0; return; }
      t += dt; if (t < 1 / 30) return; const step = t; t = 0;
      if (cv.width !== host.clientWidth) { cv.width = host.clientWidth; cv.height = host.clientHeight; }
      const W = cv.width, H = cv.height;
      const want = rain * 70;
      if (drops.length < want && Math.random() < rain * 1.5) drops.push({ x: Math.random() * W, y: Math.random() * H, r: 2 + Math.random() * 5 * (0.5 + rain), life: 2 + Math.random() * 3 });
      g.clearRect(0, 0, W, H);
      for (let i = drops.length - 1; i >= 0; i--) {
        const d = drops[i];
        d.life -= step; d.y += (d.r > 5 ? 40 : 6) * step; d.x += (d.x - W / 2) / W * speed * 0.6 * step;   // big drops run, speed blows them outward
        if (d.life <= 0 || d.y > H) { drops.splice(i, 1); continue; }
        const a = Math.min(1, d.life);
        const gr = g.createRadialGradient(d.x - d.r * 0.3, d.y - d.r * 0.3, 0, d.x, d.y, d.r);
        gr.addColorStop(0, `rgba(255,255,255,${0.45 * a})`); gr.addColorStop(0.6, `rgba(200,215,230,${0.18 * a})`); gr.addColorStop(1, 'rgba(40,50,60,0)');
        g.fillStyle = gr; g.beginPath(); g.arc(d.x, d.y, d.r, 0, Math.PI * 2); g.fill();
        if (d.r > 5) { g.strokeStyle = `rgba(210,225,240,${0.12 * a})`; g.lineWidth = d.r * 0.5; g.beginPath(); g.moveTo(d.x, d.y - d.r); g.lineTo(d.x, d.y - d.r - 30); g.stroke(); }
      }
    },
  };
}
