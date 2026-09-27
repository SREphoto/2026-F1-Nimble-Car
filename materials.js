/**
 * materials.js — Master PBR Materials Factory
 * 2026 Formula 1 "Nimble Car" · SREdesigns - Samuel R Erwin III
 */

import * as THREE from "three";

export function createCarMaterials() {
  const mats = {
    // Carbon Composites
    carbonGlossAero: new THREE.MeshPhysicalMaterial({
      color: 0x14171c,
      roughness: 0.20,
      metalness: 0.45,
      clearcoat: 0.95,
      clearcoatRoughness: 0.08,
      reflectivity: 0.85,
      side: THREE.DoubleSide,
    }),
    carbonMatteStructural: new THREE.MeshStandardMaterial({
      color: 0x0f1115,
      roughness: 0.72,
      metalness: 0.18,
      side: THREE.DoubleSide,
    }),
    carbonSatinChassis: new THREE.MeshStandardMaterial({
      color: 0x161a20,
      roughness: 0.42,
      metalness: 0.32,
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
      color: 0x1b1d22,
      roughness: 0.58,
      metalness: 0.12,
      side: THREE.DoubleSide,
    }),
    pirelliRubberSidewall: new THREE.MeshStandardMaterial({
      color: 0x20242a,
      roughness: 0.48,
      metalness: 0.16,
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
    ledRed: new THREE.MeshStandardMaterial({
      color: 0xff1122,
      emissive: 0xff1122,
      emissiveIntensity: 3.5,
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
    // 2026 Livery Palette
    redBullNavy: new THREE.MeshPhysicalMaterial({
      color: 0x0a1424, // Deep metallic racing midnight navy blue
      roughness: 0.18,
      metalness: 0.65,
      clearcoat: 1.0,
      clearcoatRoughness: 0.05,
      reflectivity: 0.90,
      side: THREE.DoubleSide,
    }),
    redBullYellow: new THREE.MeshStandardMaterial({
      color: 0xf6b800, // Vibrant Red Bull racing yellow
      roughness: 0.22,
      metalness: 0.12,
      side: THREE.DoubleSide,
    }),
    redBullRed: new THREE.MeshStandardMaterial({
      color: 0xd90429, // Vibrant bull red
      roughness: 0.26,
      metalness: 0.20,
      side: THREE.DoubleSide,
    }),
    oracleWhite: new THREE.MeshStandardMaterial({
      color: 0xf0f4f8, // Crisp sponsor white
      roughness: 0.30,
      metalness: 0.10,
      side: THREE.DoubleSide,
    }),
    driverTeal: new THREE.MeshStandardMaterial({
      color: 0x00a399, // Petronas teal / accent livery color
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

  return mats;
}

export const materials = createCarMaterials();
