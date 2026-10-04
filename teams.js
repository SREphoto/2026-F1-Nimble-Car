/**
 * teams.js — Formula 1 Team Liveries & UI Theme Engine
 * 2026 Formula 1 "Nimble Car" · SREdesigns - Samuel R Erwin III
 * 
 * Provides authentic, high-fidelity color palettes, physical material presets,
 * and real-time synchronization between the UI design system and the 3D WebGL car model.
 */

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
    driverNames: 'Norris (1) · Piastri (81)',
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
    driverNames: 'Verstappen (3) · Hadjar (6)',
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
    showDecals: false,
    description: 'Enstone Racing Blue metallic flanked by high-energy BWT Electric Pink endplates and dark carbon.'
  },
  'sauber': {
    id: 'sauber',
    name: 'Kick Sauber / Audi',
    shortName: 'AUDI SAUBER',
    brandTag: 'Hinwil · 2026 Kick Sauber / Audi',
    bodyColor: 0x0d110d,       // Stealth Carbon
    accentColor: 0x52e252,     // Fluo Kinetic Green
    amberColor: 0xffffff,      // White
    stripeColor: 0x52e252,
    roughness: 0.38,
    metalness: 0.10,
    clearcoat: 0.85,
    clearcoatRoughness: 0.08,
    css: {
      primary: '#52e252',
      primaryRgb: '82, 226, 82',
      secondary: '#ffffff',
      secondaryRgb: '255, 255, 255',
      tertiary: '#0a0e0a',
      accentGlow: 'rgba(82, 226, 82, 0.45)',
      surface: '#0c140c',
      surfaceHover: '#121e12',
      badgeBg: 'rgba(82, 226, 82, 0.18)',
      textOnPrimary: '#000000'
    },
    swatch: ['#52e252', '#0a0e0a', '#ffffff'],
    driverNames: 'Hülkenberg (27) · Bortoleto (5)',
    showDecals: false,
    description: 'High-contrast Fluo Kinetic Green speedlines against pure stealth exposed carbon fiber monocoque.'
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

  // Decal visibility: Show full Red Bull decals only when Red Bull is chosen;
  // non-Red Bull teams feature clean aerodynamic competition livery.
  if (carModel) {
    carModel.traverse(obj => {
      if (obj.isMesh && obj.name && obj.name.startsWith('Livery_Decal_')) {
        obj.visible = team.showDecals;
      }
    });
  }

  // 5. Update PCU-8D Steering Wheel Screen
  if (typeof updateLcd === 'function') {
    updateLcd();
  }

  // 6. Save selection to localStorage
  try {
    localStorage.setItem(STORAGE_KEY, team.id);
  } catch (e) {
    // ignore
  }

  return team;
}
