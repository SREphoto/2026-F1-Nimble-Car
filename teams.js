/**
 * teams.js — Formula 1 Team Liveries & UI Theme Engine
 * 2026 Formula 1 "Nimble Car" · SREdesigns - Samuel R Erwin III
 * 
 * Provides authentic, high-fidelity color palettes, physical material presets,
 * and real-time synchronization between the UI design system and the 3D WebGL car model.
 */

import { helmetTexture } from './cad/driver_helmet.js';

export const F1_TEAMS = {
  'ferrari': {
    id: 'ferrari',
    name: 'Scuderia Ferrari',
    shortName: 'FERRARI',
    brandTag: 'Maranello · 2026 Scuderia Ferrari',
    bodyColor: 0xd4001f,       // Rosso Corsa scarlet
    accentColor: 0xffe500,     // Giallo Modena yellow
    amberColor: 0x111115,      // Maranello carbon black
    stripeColor: 0xffe500,     // Modena yellow pinstripe
    roughness: 0.30,
    metalness: 0.15,
    clearcoat: 0.95,
    clearcoatRoughness: 0.05,
    css: {
      primary: '#e80020',
      primaryRgb: '232, 0, 32',
      secondary: '#ffe500',
      secondaryRgb: '255, 229, 0',
      tertiary: '#101014',
      accentGlow: 'rgba(232, 0, 32, 0.45)',
      surface: '#180f12',
      surfaceHover: '#26151a',
      badgeBg: 'rgba(232, 0, 32, 0.18)',
      textOnPrimary: '#ffffff'
    },
    swatch: ['#e80020', '#ffe500', '#101014'],
    driverNames: 'Leclerc (16) · Hamilton (44)',
    driverNumber: 16,
    driverGlove: { color: 0x18181c, roughness: 0.82 },
    driverHelmetColours: { base: '#d4001f', crown: '#ffffff', stripe: '#ffe500', accent: '#009246' },
    showDecals: false,
    description: 'Iconic Rosso Corsa high-gloss lacquer with Giallo Modena aerodynamic accents and Maranello exposed carbon weave.'
  },
  'mclaren': {
    id: 'mclaren',
    name: 'McLaren Formula 1 Team',
    shortName: 'MCLAREN',
    brandTag: 'Woking · 2026 McLaren Racing',
    bodyColor: 0xff8000,       // Papaya Orange
    accentColor: 0x47c7fc,     // Ice Blue
    amberColor: 0x14171a,      // Anthracite Carbon
    stripeColor: 0x47c7fc,     // Ice blue pinstripe
    roughness: 0.34,
    metalness: 0.08,
    clearcoat: 0.90,
    clearcoatRoughness: 0.06,
    css: {
      primary: '#ff8000',
      primaryRgb: '255, 128, 0',
      secondary: '#47c7fc',
      secondaryRgb: '71, 199, 252',
      tertiary: '#14171a',
      accentGlow: 'rgba(255, 128, 0, 0.45)',
      surface: '#1a140e',
      surfaceHover: '#261d15',
      badgeBg: 'rgba(255, 128, 0, 0.18)',
      textOnPrimary: '#000000'
    },
    swatch: ['#ff8000', '#14171a', '#47c7fc'],
    driverNames: 'Norris (4) · Piastri (81)',
    driverNumber: 4,
    driverGlove: { color: 0x14171a, roughness: 0.82 }, // Black Richard Mille Nomex (media_1791155036932.webp)
    driverHelmetColours: { base: '#d6f20d', crown: '#14171a', stripe: '#ff8000', accent: '#47c7fc' }, // Lando Norris fluo yellow (media_1791155039275.webp)
    showDecals: false,
    description: 'Vibrant Papaya Orange with raw Anthracite carbon composite weave and Stealth Ice Blue aerodynamic highlights.'
  },
  'red-bull': {
    id: 'red-bull',
    name: 'Red Bull Racing',
    shortName: 'RED BULL',
    brandTag: 'Milton Keynes · 2026 Red Bull Racing',
    bodyColor: 0x18245e,       // Deep Matte Racing Navy
    accentColor: 0xf6c200,     // Sun Yellow
    amberColor: 0xd8102c,      // Bull Crimson Red
    stripeColor: 0xd8102c,     // Bull red pinstripe
    roughness: 0.72,
    metalness: 0.12,
    clearcoat: 0.10,
    clearcoatRoughness: 0.60,
    css: {
      primary: '#2554d7',
      primaryRgb: '37, 84, 215',
      secondary: '#f6c200',
      secondaryRgb: '246, 194, 0',
      tertiary: '#d8102c',
      accentGlow: 'rgba(37, 84, 215, 0.45)',
      surface: '#0e1526',
      surfaceHover: '#151e36',
      badgeBg: 'rgba(37, 84, 215, 0.20)',
      textOnPrimary: '#ffffff'
    },
    swatch: ['#18245e', '#f6c200', '#d8102c'],
    driverNames: 'Verstappen (1) · Hadjar (6)',
    driverNumber: 1,
    driverGlove: { color: 0x141518, roughness: 0.95 }, // black Nomex gloves (refs round4 D2, D3)
    driverHelmetColours: { base: '#18245e', crown: '#f6c200', stripe: '#d0021b', accent: '#ffffff' },
    showDecals: true,
    description: 'Authentic 2026 Matte Racing Navy with Sun Yellow airbox, Bull Crimson accents, and official partner decals.'
  },
  'mercedes': {
    id: 'mercedes',
    name: 'Mercedes-AMG Petronas',
    shortName: 'MERCEDES',
    brandTag: 'Brackley · 2026 Mercedes-AMG F1',
    bodyColor: 0x0c1015,       // Obsidian Stealth Black
    accentColor: 0x00d2be,     // Petronas Emerald Teal
    amberColor: 0xd0d8e2,      // Silver Arrow Platinum
    stripeColor: 0x00d2be,
    roughness: 0.28,
    metalness: 0.35,
    clearcoat: 0.95,
    clearcoatRoughness: 0.04,
    css: {
      primary: '#00d2be',
      primaryRgb: '0, 210, 190',
      secondary: '#e0e6ed',
      secondaryRgb: '224, 230, 237',
      tertiary: '#0c1014',
      accentGlow: 'rgba(0, 210, 190, 0.45)',
      surface: '#0c1416',
      surfaceHover: '#121f22',
      badgeBg: 'rgba(0, 210, 190, 0.18)',
      textOnPrimary: '#000000'
    },
    swatch: ['#00d2be', '#0b0d10', '#d0d8e2'],
    driverNames: 'Russell (63) · Antonelli (12)',
    driverNumber: 63,
    driverGlove: { color: 0xf4f6f8, roughness: 0.82 }, // White Puma Nomex (media_1791155235396.webp)
    driverHelmetColours: { base: '#00d2be', crown: '#10141a', stripe: '#00d2be', accent: '#ffffff' }, // George Russell #63 turquoise
    showDecals: false,
    description: 'Obsidian metallic weave with iconic Petronas Emerald Teal flowing streaks and Silver Arrow detailing.'
  },
  'aston-martin': {
    id: 'aston-martin',
    name: 'Aston Martin Aramco',
    shortName: 'ASTON MARTIN',
    brandTag: 'Silverstone · 2026 Aston Martin F1',
    bodyColor: 0x00594f,       // British Racing Green
    accentColor: 0xcedc00,     // Lime Essence
    amberColor: 0x0b1411,      // Dark Obsidian Carbon
    stripeColor: 0xcedc00,
    roughness: 0.32,
    metalness: 0.40,
    clearcoat: 0.95,
    clearcoatRoughness: 0.05,
    css: {
      primary: '#00594f',
      primaryRgb: '0, 89, 79',
      secondary: '#cedc00',
      secondaryRgb: '206, 220, 0',
      tertiary: '#0b1411',
      accentGlow: 'rgba(206, 220, 0, 0.45)',
      surface: '#0a1411',
      surfaceHover: '#0f1f1a',
      badgeBg: 'rgba(206, 220, 0, 0.18)',
      textOnPrimary: '#ffffff'
    },
    swatch: ['#00594f', '#cedc00', '#0b1411'],
    driverNames: 'Alonso (14) · Stroll (18)',
    driverNumber: 14,
    driverGlove: { color: 0x0a1613, roughness: 0.82 },
    driverHelmetColours: { base: '#00594f', crown: '#cedc00', stripe: '#ffffff', accent: '#cedc00' },
    showDecals: false,
    description: 'Lustrous British Racing Green metallic with electric Lime Essence aerodynamic edge highlights.'
  },
  'williams': {
    id: 'williams',
    name: 'Williams Racing',
    shortName: 'WILLIAMS',
    brandTag: 'Grove · 2026 Williams Racing',
    bodyColor: 0x041e42,       // Heritage Deep Navy
    accentColor: 0x00a0de,     // Apex Cyan
    amberColor: 0xf5f8fa,      // Pure White
    stripeColor: 0x00a0de,
    roughness: 0.35,
    metalness: 0.20,
    clearcoat: 0.90,
    clearcoatRoughness: 0.06,
    css: {
      primary: '#005aff',
      primaryRgb: '0, 90, 255',
      secondary: '#00a0de',
      secondaryRgb: '0, 160, 222',
      tertiary: '#041e42',
      accentGlow: 'rgba(0, 90, 255, 0.45)',
      surface: '#0a1122',
      surfaceHover: '#0f1933',
      badgeBg: 'rgba(0, 90, 255, 0.18)',
      textOnPrimary: '#ffffff'
    },
    swatch: ['#005aff', '#041e42', '#ffffff'],
    driverNames: 'Albon (23) · Sainz (55)',
    driverNumber: 23,
    driverGlove: { color: 0x061226, roughness: 0.82 },
    driverHelmetColours: { base: '#005aff', crown: '#041e42', stripe: '#00a0de', accent: '#ffffff' },
    showDecals: false,
    description: 'Heritage Royal & Navy blue contrast with Apex Cyan wingtips and high-contrast diamond white accents.'
  },
  'alpine': {
    id: 'alpine',
    name: 'Alpine F1 Team',
    shortName: 'ALPINE',
    brandTag: 'Enstone · 2026 Alpine F1',
    bodyColor: 0x0078d0,       // Alpine Blue
    accentColor: 0xfd4bc7,     // BWT Electric Pink
    amberColor: 0x0c1018,      // Night Carbon
    stripeColor: 0xfd4bc7,
    roughness: 0.30,
    metalness: 0.25,
    clearcoat: 0.92,
    clearcoatRoughness: 0.05,
    css: {
      primary: '#0078d0',
      primaryRgb: '0, 120, 208',
      secondary: '#fd4bc7',
      secondaryRgb: '253, 75, 199',
      tertiary: '#0c1018',
      accentGlow: 'rgba(253, 75, 199, 0.45)',
      surface: '#10121a',
      surfaceHover: '#181c28',
      badgeBg: 'rgba(0, 120, 208, 0.18)',
      textOnPrimary: '#ffffff'
    },
    swatch: ['#0078d0', '#fd4bc7', '#0c1018'],
    driverNames: 'Gasly (10) · Colapinto (43)',
    driverNumber: 10,
    driverGlove: { color: 0x0c121c, roughness: 0.82 },
    driverHelmetColours: { base: '#0078d0', crown: '#fd4bc7', stripe: '#ffffff', accent: '#fd4bc7' },
    showDecals: false,
    description: 'Enstone Racing Blue metallic flanked by high-energy BWT Electric Pink endplates and dark carbon.'
  },
  'sauber': {
    id: 'sauber',
    name: 'Audi F1 Team / Sauber',
    shortName: 'AUDI F1',
    brandTag: 'Hinwil / Neuburg · 2026 Audi Revolut F1',
    bodyColor: 0x111317,       // Obsidian Matte Carbon (Image 4)
    accentColor: 0xff1801,     // Audi Sport Racing Red (Image 4)
    amberColor: 0xf0f2f5,      // Revolut Silver White
    stripeColor: 0xff1801,
    roughness: 0.32,
    metalness: 0.20,
    clearcoat: 0.90,
    clearcoatRoughness: 0.06,
    css: {
      primary: '#ff1801',
      primaryRgb: '255, 24, 1',
      secondary: '#f0f2f5',
      secondaryRgb: '240, 242, 245',
      tertiary: '#111317',
      accentGlow: 'rgba(255, 24, 1, 0.45)',
      surface: '#120f10',
      surfaceHover: '#1e1416',
      badgeBg: 'rgba(255, 24, 1, 0.18)',
      textOnPrimary: '#ffffff'
    },
    swatch: ['#ff1801', '#111317', '#f0f2f5'],
    driverNames: 'Hülkenberg (27) · Bortoleto (5)',
    driverNumber: 27,
    driverGlove: { color: 0xf4f6f8, roughness: 0.82 },
    driverHelmetColours: { base: '#ff1801', crown: '#ffffff', stripe: '#111317', accent: '#e0e0e0' },
    showDecals: false,
    description: 'Authentic 2026 Audi Works livery with Audi Sport Red chevron flanks, Revolut Titanium Silver, and exposed twill carbon.'
  },
  'racing-bulls': {
    id: 'racing-bulls',
    name: 'Visa Cash App RB',
    shortName: 'RACING BULLS',
    brandTag: 'Faenza · 2026 Racing Bulls',
    bodyColor: 0x1634ca,       // Brilliant Metallic Royal Blue
    accentColor: 0xff1801,     // Racing Red
    amberColor: 0xffffff,      // Pure Gloss White
    stripeColor: 0xffffff,
    roughness: 0.26,
    metalness: 0.65,
    clearcoat: 1.0,
    clearcoatRoughness: 0.03,
    css: {
      primary: '#1634ca',
      primaryRgb: '22, 52, 202',
      secondary: '#ff1801',
      secondaryRgb: '255, 24, 1',
      tertiary: '#ffffff',
      accentGlow: 'rgba(22, 52, 202, 0.50)',
      surface: '#0a1125',
      surfaceHover: '#101a37',
      badgeBg: 'rgba(22, 52, 202, 0.20)',
      textOnPrimary: '#ffffff'
    },
    swatch: ['#1634ca', '#ff1801', '#ffffff'],
    driverNames: 'Lawson (30) · Lindblad (41)',
    driverNumber: 30,
    driverGlove: { color: 0x0c182c, roughness: 0.82 },
    driverHelmetColours: { base: '#163464', crown: '#ffffff', stripe: '#cc1e46', accent: '#e21b23' },
    showDecals: false,
    description: 'Gleaming high-metallic Royal Blue with Flash Red pinstripes and razor-sharp alpine white accents.'
  },
  'haas': {
    id: 'haas',
    name: 'Haas F1 Team',
    shortName: 'HAAS F1',
    brandTag: 'Kannapolis · 2026 Haas F1',
    bodyColor: 0xe8ecf0,       // Racing White
    accentColor: 0xe6002b,     // Haas Crimson
    amberColor: 0x14171a,      // Slate Carbon
    stripeColor: 0xe6002b,
    roughness: 0.32,
    metalness: 0.10,
    clearcoat: 0.90,
    clearcoatRoughness: 0.06,
    css: {
      primary: '#e6002b',
      primaryRgb: '230, 0, 43',
      secondary: '#ffffff',
      secondaryRgb: '255, 255, 255',
      tertiary: '#161a1d',
      accentGlow: 'rgba(230, 0, 43, 0.45)',
      surface: '#141618',
      surfaceHover: '#1e2024',
      badgeBg: 'rgba(230, 0, 43, 0.18)',
      textOnPrimary: '#ffffff'
    },
    swatch: ['#ffffff', '#e6002b', '#161a1d'],
    driverNames: 'Ocon (31) · Bearman (87)',
    driverNumber: 31,
    driverGlove: { color: 0x181a1e, roughness: 0.82 },
    driverHelmetColours: { base: '#ffffff', crown: '#e6002b', stripe: '#161a1d', accent: '#e6002b' },
    showDecals: false,
    description: 'Clean Arctic White bodywork accented with Haas Crimson impact zones and slate carbon fiber aerodynamics.'
  }
};

const STORAGE_KEY = 'f1_nimble_team_theme';
let activeTeam = F1_TEAMS['ferrari'];

/**
 * Get the currently active team configuration
 */
export function getCurrentTeam() {
  return activeTeam;
}

/**
 * Retrieve saved team choice from localStorage or default
 */
export function getSavedTeam() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && F1_TEAMS[saved]) {
      return saved;
    }
  } catch (e) {
    console.warn('Could not read team from localStorage', e);
  }
  return 'ferrari';
}

/**
 * Apply team theme across both UI CSS variables and 3D Three.js materials
 */
export function applyTeamTheme(teamId, { carModel, materials, renderer, updateLcd } = {}) {
  const team = F1_TEAMS[teamId] || F1_TEAMS['ferrari'];
  activeTeam = team;

  // 1. Update HTML document data-team attribute
  document.documentElement.setAttribute('data-team', team.id);

  // 2. Set root CSS custom properties
  const root = document.documentElement;
  root.style.setProperty('--team-primary', team.css.primary);
  root.style.setProperty('--team-primary-rgb', team.css.primaryRgb);
  root.style.setProperty('--team-secondary', team.css.secondary);
  root.style.setProperty('--team-secondary-rgb', team.css.secondaryRgb);
  root.style.setProperty('--team-tertiary', team.css.tertiary);
  root.style.setProperty('--team-accent-glow', team.css.accentGlow);
  root.style.setProperty('--team-surface', team.css.surface);
  root.style.setProperty('--team-surface-hover', team.css.surfaceHover);
  root.style.setProperty('--team-badge-bg', team.css.badgeBg);
  root.style.setProperty('--team-text-on-primary', team.css.textOnPrimary);
  root.style.setProperty('--cyan', team.css.primary);

  // 3. Update topbar swatch and labels
  const swatchEl = document.getElementById('team-swatch-current');
  if (swatchEl) {
    swatchEl.style.background = `linear-gradient(135deg, ${team.swatch[0]} 0%, ${team.swatch[0]} 55%, ${team.swatch[1]} 55%, ${team.swatch[1]} 80%, ${team.swatch[2]} 80%)`;
    swatchEl.title = `${team.name} (${team.driverNames})`;
  }

  const brandTag = document.querySelector('.brand-tag');
  if (brandTag) {
    brandTag.textContent = `${team.name} · ${team.driverNames}`;
  }

  const teamSelect = document.getElementById('team-select');
  if (teamSelect && teamSelect.value !== team.id) {
    teamSelect.value = team.id;
  }

  // 4. Update Three.js Materials & 3D Car Bodywork
  if (materials) {
    if (materials.liveryPaint) {
      materials.liveryPaint.color.setHex(team.bodyColor);
      materials.liveryPaint.roughness = team.roughness;
      materials.liveryPaint.metalness = team.metalness;
      materials.liveryPaint.clearcoat = team.clearcoat;
      materials.liveryPaint.clearcoatRoughness = team.clearcoatRoughness;
      materials.liveryPaint.needsUpdate = true;
    }
    if (materials.redBullNavy) {
      materials.redBullNavy.color.setHex(team.bodyColor);
      materials.redBullNavy.roughness = team.roughness;
      materials.redBullNavy.metalness = team.metalness;
      materials.redBullNavy.needsUpdate = true;
    }
    if (materials.redBullYellow) {
      materials.redBullYellow.color.setHex(team.accentColor);
      materials.redBullYellow.needsUpdate = true;
    }
    if (materials.redBullRed) {
      materials.redBullRed.color.setHex(team.amberColor);
      materials.redBullRed.needsUpdate = true;
    }
    if (materials.liveryAccent) {
      materials.liveryAccent.color.setHex(team.accentColor);
      materials.liveryAccent.needsUpdate = true;
    }
    if (materials.liveryAmber) {
      materials.liveryAmber.color.setHex(team.amberColor);
      materials.liveryAmber.needsUpdate = true;
    }
  }

  // Cloned carPaint on carModel body
  if (carModel?.userData?.livery?.carPaint) {
    const cp = carModel.userData.livery.carPaint;
    cp.color.setHex(team.bodyColor);
    cp.roughness = team.roughness;
    cp.metalness = team.metalness;
    cp.clearcoat = team.clearcoat;
    cp.clearcoatRoughness = team.clearcoatRoughness;
    cp.needsUpdate = true;
  }

  // Update pinstripe uniform
  if (carModel?.userData?.livery?.splitUniforms?.uStripeColor) {
    carModel.userData.livery.splitUniforms.uStripeColor.value.setHex(team.stripeColor);
  }

  // Driver Equipment & Liveries Synchronization
  if (materials?.driverGlove && team.driverGlove) {
    materials.driverGlove.color.setHex(team.driverGlove.color);
    materials.driverGlove.roughness = team.driverGlove.roughness || 0.82;
    materials.driverGlove.needsUpdate = true;
  }

  if (carModel) {
    carModel.traverse(obj => {
      if (obj.isMesh && obj.name) {
        // Red Bull Decals toggle
        if (obj.name.startsWith('Livery_Decal_')) {
          obj.visible = team.showDecals;
        }
        // Driver Gloves (White for Mercedes, Black for McLaren/others)
        else if (obj.name.startsWith('Driver_Glove_') && !obj.name.includes('_Pad_') && team.driverGlove) {
          if (obj.material) {
            obj.material.color.setHex(team.driverGlove.color);
            obj.material.roughness = team.driverGlove.roughness || 0.82;
            obj.material.needsUpdate = true;
          }
        }
        // Driver Helmet (FIA 8860-2018-ABP Shell)
        else if (obj.name === 'Helmet_OuterShell' && team.driverHelmetColours) {
          try {
            const hTex = helmetTexture(team.driverHelmetColours);
            obj.material.map = hTex;
            obj.material.needsUpdate = true;
          } catch (hErr) {
            // ignore
          }
        }
        // Driver Nomex Suit (Chest, Shoulders, Upper Arms, Forearms, Thighs)
        else if (obj.name && obj.name.startsWith('Driver_Suit_') && !obj.name.includes('Flank') && !obj.name.includes('Elbow') && !obj.name.includes('Knee') && !obj.name.includes('Shin') && !obj.name.includes('Pelvis') && !obj.name.includes('Zip')) {
          if (obj.material) {
            obj.material.color.setHex(team.bodyColor);
            obj.material.needsUpdate = true;
          }
        }
      }
    });
    // Driver rig (cad/driver_model.js): suit texture, gloves, boots and helmet from the team settings
    carModel.traverse(obj => {
      if (obj.name === 'Assembly_Articulated_Driver' && typeof obj.userData.applyTeam === 'function') obj.userData.applyTeam(team);
    });
  }

  // 5. Update PCU-8D Steering Wheel Screen
  if (typeof updateLcd === 'function') {
    updateLcd();
  }

  // 5b. Dispatch event to update 3D pit crew team liveries
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('f1:team-changed', { detail: { teamId: team.id } }));
  }

  // 6. Save selection to localStorage
  try {
    localStorage.setItem(STORAGE_KEY, team.id);
  } catch (e) {
    // ignore
  }

  return team;
}
