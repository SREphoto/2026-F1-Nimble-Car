/**
 * materials.js — Master PBR Materials Factory
 * 2026 Formula 1 "Nimble Car" · SREdesigns - Samuel R Erwin III
 */

import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

export function createCarMaterials() {
  const mats = {
    // Carbon Composites — exposed weave (procedural twill added in addCarbonWeave below)
    // Real carbon is a dielectric: near-zero metalness, the sheen comes from the resin.
    carbonGlossAero: new THREE.MeshPhysicalMaterial({
      color: 0x2b3038,
      roughness: 0.38,
      metalness: 0.05,
      clearcoat: 1.0,           // UV-cured lacquer over the weave
      clearcoatRoughness: 0.06,
      side: THREE.DoubleSide,
    }),
    carbonMatteStructural: new THREE.MeshStandardMaterial({
      color: 0x24282f,
      roughness: 0.68,
      metalness: 0.04,
      side: THREE.DoubleSide,
    }),
    carbonSatinChassis: new THREE.MeshPhysicalMaterial({
      color: 0x282d34,
      roughness: 0.5,
      metalness: 0.04,
      clearcoat: 0.55,
      clearcoatRoughness: 0.28,
      side: THREE.DoubleSide,
    }),
    carbonFrictionDisc: new THREE.MeshStandardMaterial({
      color: 0x1c1e22,
      roughness: 0.82,
      metalness: 0.12,
      emissive: new THREE.Color(0x000000),
      emissiveIntensity: 0.0,
    }),
    carbonFrictionSweptTrack: new THREE.MeshStandardMaterial({
      color: 0x24282f,
      roughness: 0.65,
      metalness: 0.28,
      emissive: new THREE.Color(0x000000),
      emissiveIntensity: 0.0,
    }),

    // Titanium & Alloys
    titaniumBright: new THREE.MeshStandardMaterial({
      color: 0xb5c0cc,
      roughness: 0.22,
      metalness: 0.95,
    }),
    titaniumAnodized: new THREE.MeshStandardMaterial({
      color: 0x757f8c,
      roughness: 0.35,
      metalness: 0.92,
    }),
    titaniumHalo: new THREE.MeshStandardMaterial({
      color: 0x68727e,
      roughness: 0.30,
      metalness: 0.94,
    }),
    inconelTurbine: new THREE.MeshStandardMaterial({
      color: 0x8a7e6c, // Straw-bronze thermal oxidation tint
      roughness: 0.32,
      metalness: 0.88,
    }),

    // Caliper & Upright Aerospace Alloys
    caliperAlLiHardAnodized: new THREE.MeshStandardMaterial({
      color: 0x5a5448, // Nickel-bronze hard anodizing
      roughness: 0.38,
      metalness: 0.82,
    }),
    uprightCastAl: new THREE.MeshStandardMaterial({
      color: 0x88929e,
      roughness: 0.45,
      metalness: 0.78,
    }),

    // Hydraulic, Fluid & Wiring
    fluidLineTitanium: new THREE.MeshStandardMaterial({
      color: 0xa8b4c0,
      roughness: 0.25,
      metalness: 0.92,
    }),
    braidedSteelHose: new THREE.MeshStandardMaterial({
      color: 0x8c96a0,
      roughness: 0.48,
      metalness: 0.85,
    }),
    siliconeBlueCrimp: new THREE.MeshStandardMaterial({
      color: 0x0055bb,
      roughness: 0.35,
      metalness: 0.50,
    }),
    siliconeRedCrimp: new THREE.MeshStandardMaterial({
      color: 0xcc1122,
      roughness: 0.35,
      metalness: 0.50,
    }),
    cableOrangeHV: new THREE.MeshStandardMaterial({
      color: 0xff5500, // 800V DC high-voltage safety orange
      roughness: 0.42,
      metalness: 0.15,
    }),
    harnessBlack: new THREE.MeshStandardMaterial({
      color: 0x111418, // Raychem DR-25 heat shrink
      roughness: 0.65,
      metalness: 0.08,
    }),
    copperWindings: new THREE.MeshStandardMaterial({
      color: 0xc87538,
      roughness: 0.28,
      metalness: 0.92,
    }),

    // BBS Magnesium Wheels & Pirelli Rubber
    bbsMagnesiumGold: new THREE.MeshStandardMaterial({
      color: 0xa88c42,
      roughness: 0.32,
      metalness: 0.85,
    }),
    bbsMagnesiumDark: new THREE.MeshStandardMaterial({
      color: 0x22262c,
      roughness: 0.38,
      metalness: 0.82,
    }),
    pirelliRubberTread: new THREE.MeshStandardMaterial({
      color: 0x1c1d20,  // scrubbed slick rubber: dark, matte, non-metallic
      roughness: 0.86,
      metalness: 0.0,
      side: THREE.DoubleSide,
    }),
    pirelliRubberSidewall: new THREE.MeshStandardMaterial({
      color: 0x1f2023,
      roughness: 0.72,
      metalness: 0.0,
      side: THREE.DoubleSide,
    }),
    wheelNutRed: new THREE.MeshStandardMaterial({
      color: 0xc41424,
      roughness: 0.28,
      metalness: 0.88,
    }),
    wheelNutBlue: new THREE.MeshStandardMaterial({
      color: 0x145cc4,
      roughness: 0.28,
      metalness: 0.88,
    }),

    // Underbody Plank
    jabrocWoodPlank: new THREE.MeshStandardMaterial({
      color: 0x4a2e18, // Dense phenolic resin-impregnated beechwood laminate
      roughness: 0.65,
      metalness: 0.05,
    }),
    titaniumSkidPuck: new THREE.MeshStandardMaterial({
      color: 0xd0d8e2,
      roughness: 0.18,
      metalness: 0.96,
    }),

    // Hardware & Electronics
    goldActuator: new THREE.MeshStandardMaterial({
      color: 0xc49530,
      roughness: 0.28,
      metalness: 0.90,
    }),
    anodizedBlue: new THREE.MeshStandardMaterial({
      color: 0x1652a2,
      roughness: 0.25,
      metalness: 0.85,
    }),
    anodizedRed: new THREE.MeshStandardMaterial({
      color: 0xb41624,
      roughness: 0.25,
      metalness: 0.85,
    }),
    rubberSeal: new THREE.MeshStandardMaterial({
      color: 0x080a0c,
      roughness: 0.95,
      metalness: 0.01,
    }),
    socketRecessMat: new THREE.MeshStandardMaterial({
      color: 0x040507,
      roughness: 0.98,
      metalness: 0.05,
    }),
    zirconiaCeramic: new THREE.MeshStandardMaterial({
      color: 0xedf0f4,
      roughness: 0.35,
      metalness: 0.15,
    }),

    // Optics & Glass
    glassRefractive: new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      transmission: 0.92,
      opacity: 1,
      transparent: true,
      roughness: 0.08,
      ior: 1.52,
      thickness: 0.15,
    }),
    mirrorGlass: new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.02,
      metalness: 0.98,
    }),

    // LEDs & Emissives
    ledRed: new THREE.MeshStandardMaterial({ // deep red: high intensity tone-maps toward orange
      color: 0xff0a14,
      emissive: 0xff0814,
      emissiveIntensity: 1.6,
      roughness: 0.2,
    }),
    ledGreen: new THREE.MeshStandardMaterial({
      color: 0x00e676,
      emissive: 0x00e676,
      emissiveIntensity: 3.5,
      roughness: 0.2,
    }),
    ledBlue: new THREE.MeshStandardMaterial({
      color: 0x00b0ff,
      emissive: 0x00b0ff,
      emissiveIntensity: 3.5,
      roughness: 0.2,
    }),
    ledAmber: new THREE.MeshStandardMaterial({
      color: 0xffa500,
      emissive: 0xffa500,
      emissiveIntensity: 3.0,
      roughness: 0.2,
    }),
    ledYellowSafety: new THREE.MeshStandardMaterial({
      color: 0xffdd00,
      emissive: 0xaa9900,
      emissiveIntensity: 1.2,
      roughness: 0.25,
    }),
    // 2026 Red Bull Racing Livery Palette
    // Neutral aliases (liveryPaint, …) are added below for new code.
    redBullNavy: new THREE.MeshPhysicalMaterial({
      color: 0x18245e,          // deep matte racing navy
      roughness: 0.72,          // matte finish (modern F1 weight-saving paint)
      metalness: 0.12,          // faint metallic flake
      clearcoat: 0.1,           // very light, rough lacquer: no plastic gloss
      clearcoatRoughness: 0.6,
      side: THREE.DoubleSide,
    }),
    redBullYellow: new THREE.MeshPhysicalMaterial({
      color: 0xf6c200,          // racing yellow (nose tip, airbox, T-camera)
      roughness: 0.32,
      metalness: 0.0,
      clearcoat: 1.0,
      clearcoatRoughness: 0.06,
      side: THREE.DoubleSide,
    }),
    redBullRed: new THREE.MeshPhysicalMaterial({
      color: 0xd8102c,          // bull red
      roughness: 0.32,
      metalness: 0.0,
      clearcoat: 1.0,
      clearcoatRoughness: 0.06,
      side: THREE.DoubleSide,
    }),
    oracleWhite: new THREE.MeshPhysicalMaterial({
      color: 0xf0f4f8,          // sponsor white
      roughness: 0.3,
      metalness: 0.0,
      clearcoat: 1.0,
      clearcoatRoughness: 0.05,
      side: THREE.DoubleSide,
    }),
    driverTeal: new THREE.MeshStandardMaterial({
      color: 0x00a399,
      roughness: 0.25,
      metalness: 0.45,
    }),

    // Showroom Stage & Graphic Enhancements
    showcaseTarmac: new THREE.MeshStandardMaterial({
      color: 0x0c0f14,
      roughness: 0.35,
      metalness: 0.45,
      side: THREE.DoubleSide,
    }),
    showcaseEdgeChrome: new THREE.MeshStandardMaterial({
      color: 0xd4dbe4,
      roughness: 0.15,
      metalness: 0.95,
    }),
    neonCyan: new THREE.MeshStandardMaterial({
      color: 0x00d4e8,
      emissive: 0x00d4e8,
      emissiveIntensity: 2.2,
      roughness: 0.1,
    }),
    neonRed: new THREE.MeshStandardMaterial({
      color: 0xd90429,
      emissive: 0xd90429,
      emissiveIntensity: 2.0,
      roughness: 0.1,
    }),
  };

  // Aliases for procedural CAD modules
  mats.carbonGloss = mats.carbonGlossAero;
  mats.carbonMatte = mats.carbonMatteStructural;
  mats.carbonSatin = mats.carbonSatinChassis;
  mats.alLi2099 = mats.caliperAlLiHardAnodized;
  mats.inconelExhaust = mats.inconelTurbine;
  mats.pirelliRubber = mats.pirelliRubberTread;
  mats.bbsMagnesium = mats.bbsMagnesiumDark;
  mats.siliconeSeal = mats.rubberSeal;
  mats.heatShieldGold = mats.goldActuator;
  mats.jabrocPlank = mats.jabrocWoodPlank;
  mats.castIronBallast = mats.carbonMatteStructural;
  mats.chromePlated = mats.titaniumBright;
  mats.stainlessBraid = mats.braidedSteelHose;
  mats.steelSpring = mats.titaniumAnodized;
  mats.copperCrushMat = mats.copperWindings;

  // Neutral livery aliases (prefer these in new code)
  mats.liveryPaint = mats.redBullNavy;
  mats.liveryAccent = mats.redBullYellow;
  mats.liveryAmber = mats.redBullRed;
  mats.liveryWhite = mats.oracleWhite;

  // Exposed carbon twill on every carbon composite surface
  addCarbonWeave(mats.carbonGlossAero, { towsPerDm: 9.0, contrast: 0.5 });
  addCarbonWeave(mats.carbonSatinChassis, { towsPerDm: 9.0, contrast: 0.42 });
  addCarbonWeave(mats.carbonMatteStructural, { towsPerDm: 8.0, contrast: 0.3 });

  return mats;
}

/**
 * addCarbonWeave — procedural 2x2 twill carbon weave via onBeforeCompile.
 * Triplanar in object space, so it needs no UVs (most CAD meshes have
 * inconsistent UVs) and never stretches. Weave contrast fades out with
 * screen-space derivatives so distant parts don't shimmer / moiré.
 */
export function addCarbonWeave(material, { towsPerDm = 7.0, contrast = 0.45 } = {}) {
  material.userData.carbonWeave = true;
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uCfScale = { value: towsPerDm };
    shader.uniforms.uCfContrast = { value: contrast };
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vCfPos;\nvarying vec3 vCfNrm;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvCfPos = position;\nvCfNrm = normal;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
varying vec3 vCfPos;
varying vec3 vCfNrm;
uniform float uCfScale;
uniform float uCfContrast;
// 2x2 twill: returns (brightness, isWarp)
vec2 cfTwill(vec2 p) {
  vec2 c = floor(p);
  vec2 f = fract(p);
  float warp = step(mod(c.x + c.y, 4.0), 1.5);       // diagonal over-2/under-2 pattern
  float across = mix(f.y, f.x, warp);                 // position across the tow
  float along = mix(f.x, f.y, warp);
  float prof = sin(3.14159 * across);                 // rounded tow cross-section
  float dip = smoothstep(0.0, 0.18, along) * smoothstep(1.0, 0.82, along) * 0.25 + 0.75;
  return vec2(mix(0.62, 1.0, warp) * (0.55 + 0.45 * prof) * dip, warp);
}
vec2 cfWeave() {
  vec3 p = vCfPos * uCfScale;
  vec3 w = pow(abs(normalize(vCfNrm)), vec3(4.0));
  w /= (w.x + w.y + w.z + 1e-5);
  vec2 a = cfTwill(p.yz), b = cfTwill(p.xz), c = cfTwill(p.xy);
  vec2 r = a * w.x + b * w.y + c * w.z;
  float fw = length(fwidth(p));                        // tows per pixel
  float aa = 1.0 - smoothstep(0.35, 0.9, fw);
  return vec2(mix(0.8, r.x, aa * uCfContrast / 0.5), r.y * aa);
}`)
      .replace('#include <color_fragment>', `#include <color_fragment>
vec2 cfW = cfWeave();
diffuseColor.rgb *= cfW.x;`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
roughnessFactor = clamp(roughnessFactor + (cfW.y - 0.5) * 0.12, 0.04, 1.0);`);
  };
  material.customProgramCacheKey = () => `carbonWeave_${towsPerDm}_${contrast}`;
  material.needsUpdate = true;
  return material;
}

/**
 * applyCarEnvironment — give the car's PBR materials something to reflect.
 * Without an environment map, metallic paint and clearcoat render almost black
 * (this was the main reason the old livery looked flat). Uses a PMREM-filtered
 * RoomEnvironment generated once at startup (no external HDR download).
 * Only materials under `root` (plus any extras) receive the env map, so the
 * track's look is unchanged.
 */
export function applyCarEnvironment(renderer, root, { intensity = 1.0, extraMaterials = [] } = {}) {
  if (!renderer || !root) return null;
  if (!applyCarEnvironment._envTex) {
    const pmrem = new THREE.PMREMGenerator(renderer);
    applyCarEnvironment._envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();
  }
  const env = applyCarEnvironment._envTex;
  const seen = new Set();
  const apply = (m) => {
    if (!m || seen.has(m) || !('envMap' in m) || m.isMeshBasicMaterial) return;
    seen.add(m);
    m.envMap = env;
    m.envMapIntensity = m.userData.envMapIntensity ?? intensity;
    m.needsUpdate = true;
  };
  root.traverse((o) => {
    if (!o.isMesh || !o.material) return;
    (Array.isArray(o.material) ? o.material : [o.material]).forEach(apply);
  });
  extraMaterials.forEach(apply);
  return env;
}

export const materials = createCarMaterials();

/**
 * addCarbonSplit — two-tone body finish: painted above a horizontal split line,
 * exposed lacquered carbon below it (lower sidepods, nose underside, floor edges),
 * optionally separated by a pinstripe, plus a subtle darker camo pattern in the paint
 * (as on the 2026 reference livery).
 * The split is in world-space height, so it needs no UVs and survives geometry edits.
 * Returns the uniforms so callers can set the split height once the car is placed.
 */
export function addCarbonSplit(material, { splitY = 1.2, stripeColor = 0xd8102c, stripeWidth = 0.0, camo = 0.32, camoScale = 0.9, towsPerDm = 9.0 } = {}) {
  const uniforms = {
    uSplitY: { value: splitY },
    uStripeW: { value: stripeWidth },
    uCamo: { value: camo },
    uCamoScale: { value: camoScale },
    uStripeColor: { value: new THREE.Color(stripeColor) },
    uCfScale: { value: towsPerDm },
    // world -> 'car at load pose' frame, so the split and camo stay attached to the car when it
    // drives / climbs on the circuit (identity = plain world space)
    uSpFrame: { value: new THREE.Matrix4() },
  };
  material.userData.carbonSplit = uniforms;
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nuniform mat4 uSpFrame;\nvarying vec3 vSpWorld;\nvarying vec3 vCfPos;\nvarying vec3 vCfNrm;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvCfPos = position;\nvCfNrm = normal;\nvSpWorld = (uSpFrame * modelMatrix * vec4(position, 1.0)).xyz;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
varying vec3 vSpWorld;
varying vec3 vCfPos;
varying vec3 vCfNrm;
uniform float uSplitY;
uniform vec3 uStripeColor;
uniform float uCfScale;
uniform float uStripeW;
uniform float uCamo;
uniform float uCamoScale;
float spHash(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float spNoise(vec3 x) {
  vec3 i = floor(x); vec3 f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(spHash(i), spHash(i + vec3(1,0,0)), f.x), mix(spHash(i + vec3(0,1,0)), spHash(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(spHash(i + vec3(0,0,1)), spHash(i + vec3(1,0,1)), f.x), mix(spHash(i + vec3(0,1,1)), spHash(i + vec3(1,1,1)), f.x), f.y), f.z);
}
// Subtle darker "digital camo" blotches in the matte navy
float spCamo(vec3 p) {
  p *= uCamoScale;
  float n = spNoise(p) * 0.55 + spNoise(p * 2.13 + 7.1) * 0.3 + spNoise(p * 4.7 + 3.3) * 0.15;
  float aa = fwidth(n) + 1e-4;
  return smoothstep(0.55 - aa, 0.55 + aa, n);
}
float spTwill(vec2 p) {
  vec2 c = floor(p); vec2 f = fract(p);
  float warp = step(mod(c.x + c.y, 4.0), 1.5);
  float across = mix(f.y, f.x, warp);
  return mix(0.62, 1.0, warp) * (0.55 + 0.45 * sin(3.14159 * across));
}
float spWeave() {
  vec3 p = vCfPos * uCfScale;
  vec3 w = pow(abs(normalize(vCfNrm)), vec3(4.0)); w /= (w.x + w.y + w.z + 1e-5);
  float r = spTwill(p.yz) * w.x + spTwill(p.xz) * w.y + spTwill(p.xy) * w.z;
  float aa = 1.0 - smoothstep(0.35, 0.9, length(fwidth(p)));
  return mix(0.8, r, aa);
}`)
      .replace('#include <color_fragment>', `#include <color_fragment>
float spH = vSpWorld.y - uSplitY;
float spAA = max(fwidth(spH), 1e-4);
float spCarbon = 1.0 - smoothstep(-spAA, spAA, spH);                 // 1 below split
float spStripe = uStripeW > 0.0 ? smoothstep(-spAA, spAA, spH) * (1.0 - smoothstep(uStripeW - spAA, uStripeW + spAA, spH)) : 0.0;
diffuseColor.rgb *= 1.0 - uCamo * spCamo(vSpWorld);
diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.105, 0.115, 0.13) * spWeave(), spCarbon);
diffuseColor.rgb = mix(diffuseColor.rgb, uStripeColor, spStripe);`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
roughnessFactor = mix(roughnessFactor, 0.34, max(spCarbon, spStripe));`)
      .replace('#include <metalnessmap_fragment>', `#include <metalnessmap_fragment>
metalnessFactor = mix(metalnessFactor, 0.02, max(spCarbon, spStripe));`);
  };
  material.customProgramCacheKey = () => 'carbonSplit';
  material.needsUpdate = true;
  return uniforms;
}
