/**
 * Trackside style for the Red Bull Ring. Everything per circuit lives here; the generic builders in
 * cad/track/trackside.js read it. Copy this file for another circuit and change the values.
 * Units: metres. Colours are plain hex. Sponsor wraps are names in plain lettering and brand colours only, no logo art.
 */
export const RED_BULL_RING_STYLE = {
  surface: {
    base: '#45484d',            // fresh-ish asphalt (Red Bull Ring was resurfaced in 2016)
    grain: ['#2f3236', '#3a3d42', '#55585e', '#62656b', '#28292d'],
    seamEvery: 0,               // longitudinal paving seam at the centre line (texture column 0)
    patches: 14,                // repair patches spread over the lap
    rubber: { width: 2.4, darkest: 0.55, brakingBoost: 0.35, color: '#141416' },  // racing-line rubber
    wet: { roughness: 0.18, metalness: 0.15, darken: 0.72 },  // "Wet sheen" toggle
    dry: { roughness: 0.92, metalness: 0.0 },
  },
  kerbs: {
    // cross-section profiles: [distance from the track edge (m), height (m)]
    profiles: {
      flat: [[0, 0.004], [0.4, 0.012], [2.0, 0.018]],
      raised: [[0, 0.004], [0.25, 0.03], [1.7, 0.06], [2.0, 0.01]],
      sawtooth: [[0, 0.004], [0.25, 0.035], [1.5, 0.07], [2.0, 0.015]],
    },
    sawtoothPeriod: 0.5,        // ridges along the outer part of a sawtooth kerb (m), felt as a buzz
    sawtoothAmp: 0.012,
    stripe: 1.0,                // red / white block length (m)
    colors: { red: '#d4202c', white: '#f2f2ee', green: '#2f8f3a' },
    inside: 'sawtooth',         // apex kerbs
    outside: 'flat',            // exit kerbs
    perTurn: { 1: { outside: 'raised' }, 3: { outside: 'raised' }, 4: { inside: 'raised' } },
    sausage: { height: 0.12, width: 0.5, color: '#f2c200' },   // FIA notes: yellow sausage kerbs behind T1 and T3 exits
  },
  barriers: {
    wallHeight: 1.05,
    sponsors: [
      { name: 'Red Bull', bg: '#0b1a44', fg: '#d8102e', accent: '#f3c11b' },
      { name: 'PIRELLI', bg: '#fdd400', fg: '#111111' },
      { name: 'aramco', bg: '#ffffff', fg: '#0072ce', accent: '#84bd00' },
      { name: 'ROLEX', bg: '#006039', fg: '#c9a54c' },
      { name: 'DHL', bg: '#ffcc00', fg: '#d40511' },
    ],
    wrapLength: 9,              // metres per sponsor panel on walls and tyre belts
    tecpro: { length: 1.5, height: 1.0, depth: 0.9, colors: ['#1f4fa8', '#f4f4f4'] },
    tecproTurns: [1, 3, 4],     // TecPro blocks in front of the walls at the big stops (outside of the corner)
    armco: { rails: [0.45, 0.75], postSpacing: 2.0 },  // for circuits with guard rails (none mapped at the Red Bull Ring)
  },
  signs: {
    brakingBoards: { turns: [1, 3, 4], distances: [300, 200, 100, 50], width: 2.4, height: 0.6, bottom: 0.5 },  // only the three big stops are confirmed
    turnBoard: { width: 4.0, height: 1.0, bottom: 1.8 },
    billboard: { width: 7.2, height: 1.8, bottom: 1.25 },
  },
  pitLane: { concrete: '#c4c6c8', slab: 6, fastLane: { color: '#b3262b', from: 0.3, width: 1.0 } },  // light concrete, red strip along the pit wall side
  fence: { height: 3.6, overhang: 0.7, overhangAngle: 0.55, postSpacing: 4.0, cables: [0.2, 1.6, 3.0] },
};
