/**
 * body_pieces_v5_spec.js — data table for the v5 main body, built as separate panels.
 * Units dm, X nose -> tail (front axle 0, rear axle 34), Y + = car left, Z up. Left side listed,
 * right side is mirrored. Every piece has a plain-English `function` note: why it is shaped that way.
 * Sizes come from the parts they wrap (see `wraps`).
 */
export const BODY_V5 = {
  floorZ: 0.5,
  step: 0.4,

  // Rounded rising ridge on each side: the top outer edge of the sidepod.
  ridge: {
    function: 'Tops the radiator bay and is the line the air follows: high and wide beside the cockpit where the coolers are, then dropping and curving inboard (the cola-bottle waist) so air is steered down past the rear tyre onto the beam wing and diffuser. Its outer face carries the main sidepod sponsor.',
    wraps: 'Water radiators X 10.5-12 (top z 4.1, out to y 5.05), ERS/oil coolers X 15-16 (top z 3.75)',
    explode: [0, 2.6, 3.2],
    spline: [ // centre line and tube radius
      { x: 9.4, y: 5.0, z: 4.55, r: 0.72 },
      { x: 10.6, y: 5.3, z: 4.65, r: 0.82 },
      { x: 12.5, y: 5.5, z: 4.6, r: 0.86 },
      { x: 16.0, y: 5.55, z: 4.0, r: 0.88 },
      { x: 20.0, y: 5.2, z: 3.3, r: 0.84 },
      { x: 23.5, y: 4.6, z: 2.85, r: 0.74 },
      { x: 26.5, y: 3.95, z: 2.35, r: 0.62 },
      { x: 29.2, y: 3.4, z: 1.9, r: 0.48 },
      { x: 31.2, y: 3.15, z: 1.55, r: 0.36 },
      { x: 32.5, y: 3.05, z: 1.35, r: 0.26 },
    ],
  },

  // Per-station sizes for the panels under / inboard of the ridge.
  //  zFl  bottom of the flank (start of the undercut)   bulge  how far the flank bows out
  //  zBot lowest point of the pod (floats at the front)  yUc    where the undercut meets the floor
  //  yIn  inboard edge of the pod (tub / under the cover) zIn   height there
  pod: [
    { x: 9.4, zFl: 2.15, bulge: 0.0, zBot: 2.0, yUc: 3.25, yIn: 3.0, zIn: 4.45 },
    { x: 10.6, zFl: 2.2, bulge: 0.05, zBot: 1.5, yUc: 3.3, yIn: 3.0, zIn: 4.4 },
    { x: 12.5, zFl: 2.2, bulge: 0.12, zBot: 0.8, yUc: 3.1, yIn: 3.0, zIn: 4.45 },
    { x: 16.0, zFl: 2.0, bulge: 0.14, zBot: 0.54, yUc: 3.05, yIn: 2.7, zIn: 4.7 },
    { x: 20.0, zFl: 1.7, bulge: 0.12, zBot: 0.54, yUc: 2.9, yIn: 1.9, zIn: 4.3 },
    { x: 23.5, zFl: 1.5, bulge: 0.1, zBot: 0.54, yUc: 2.85, yIn: 1.5, zIn: 3.8 },
    { x: 26.5, zFl: 1.25, bulge: 0.07, zBot: 0.54, yUc: 2.45, yIn: 1.25, zIn: 3.2 },
    { x: 29.2, zFl: 1.0, bulge: 0.04, zBot: 0.54, yUc: 2.2, yIn: 1.05, zIn: 2.6 },
    { x: 31.2, zFl: 0.85, bulge: 0.02, zBot: 0.54, yUc: 2.15, yIn: 1.0, zIn: 2.1 },
    { x: 32.5, zFl: 0.75, bulge: 0.0, zBot: 0.54, yUc: 2.15, yIn: 1.0, zIn: 1.8 },
  ],
  sidepodTop: {
    function: 'Crescent top panel from the ridge inboard to the cockpit rim / engine cover. Closes the radiator bay; slopes down toward the cockpit so the pods ring the driver (the broken donut) without blocking the view.',
    explode: [0, 1.4, 4.2],
  },
  flank: {
    function: 'Outer wall under the ridge crease. Bows out just enough to clear the radiators and ERS/oil coolers, then tucks in hard at the crease so the ridge stands proud and air peels off it.',
    wraps: 'Radiator outer tanks y 5.05, ERS/oil cooler outer tanks y 4.85',
    explode: [0, 4.2, 0.4], xEnd: 28.6,
  },
  undercut: {
    function: 'Hollowed lower panel curving in from the flank to the floor. Leaves a channel under the pod so air from the front wheels is pushed down and back along the floor edge toward the diffuser.',
    explode: [0, 4.0, -1.2], xEnd: 28.6,
  },
  rearTaper: {
    function: 'Last part of the pod from X 28.6 to 32.5: narrows and drops (cola-bottle waist) so air hugs the body into the gap ahead of the rear tyre and onto the beam wing and diffuser.',
    explode: [3.0, 3.0, 0], x0: 28.6,
  },
  innerWall: {
    function: 'Hidden inner wall of the radiator bay against the tub and engine bay; keeps the cooling air ducted and nothing internal visible through the pod.',
    explode: [0, 1.0, 0],
  },
  inlet: {
    function: 'Tall square mouth beside the halo sized to the water radiator face it feeds (about 1.5 x 1.6 dm), set just behind the front wheel wake. A thin carbon lip frames it; the dark duct behind slows the air onto the core.',
    wraps: 'Water radiator core y 3.35-4.85, z 2.5-4.1 at X 11.3',
    mouth: { y0: 3.15, y1: 5.15, z0: 2.25, z1: 4.75, r: 0.25, depth: 1.0 },
    explode: [-2.5, 2.0, 0.3],
  },

  // Engine cover = narrow spine + two side panels falling to the ridges.
  cover: {
    stations: [ // ws/zs spine half width and crown, ze spine edge height, w/zb side-panel base
      { x: 15.2, ws: 0.9, zs: 5.6, ze: 5.3, w: 2.8, zb: 4.85 },
      { x: 16.6, ws: 0.95, zs: 7.55, ze: 6.9, w: 3.0, zb: 4.75 },
      { x: 18.0, ws: 0.95, zs: 7.85, ze: 7.2, w: 3.05, zb: 4.55 },
      { x: 20.0, ws: 0.85, zs: 7.05, ze: 6.6, w: 2.95, zb: 4.3 },
      { x: 22.5, ws: 0.8, zs: 6.35, ze: 5.95, w: 2.75, zb: 3.95 },
      { x: 25.0, ws: 0.78, zs: 5.9, ze: 5.5, w: 2.5, zb: 3.5 },
      { x: 27.5, ws: 0.85, zs: 5.6, ze: 5.3, w: 2.25, zb: 3.0 },
      { x: 30.0, ws: 0.85, zs: 5.2, ze: 4.95, w: 2.0, zb: 2.2 },
      { x: 32.5, ws: 0.65, zs: 4.7, ze: 4.4, w: 1.35, zb: 1.3 },
      { x: 34.6, ws: 0.5, zs: 4.35, ze: 4.1, w: 0.95, zb: 2.0 },
    ],
    spine: {
      function: 'Narrow crown over the airbox duct, turbo and wastegate (the tallest PU parts). Rises sharply behind the airbox and runs back as a slim rounded spine with a centre seam; only as wide as the duct and turbo need.',
      wraps: 'Airbox duct (top z 7.98 at X 17.4), turbo/wastegate (top z 5.14 at X 28.1)',
      explode: [0, 0, 6.0],
    },
    sidePanel: {
      function: 'Falls from the spine edge down to the ridges, as close as the fuel cell shoulders, exhaust collectors and ERS inverters allow. Carries the engine cover livery.',
      wraps: 'Fuel cell (y 1.9, z 5.2 at X 21.5), exhaust collectors (y 1.94), ERS inverters (y 1.5, z 3.98 at X 29)',
      explode: [0, 2.8, 4.6],
    },
    outlets: {
      function: 'Hot-air gills on each side panel above the exhaust and turbo, letting radiator and PU heat out without spoiling flow to the rear wing.',
      slots: [24.2, 25.0, 25.8, 26.6], height: 0.55, width: 0.18,
    },
  },
  airboxSurround: {
    function: 'Fairing collar where the airbox meets the spine: smooths the join behind the roll hoop so the air feeding the engine is clean and the roll hoop is fully enclosed.',
    explode: [0, 0, 8.0],
  },
  rear: {
    function: 'Tail cap closing the spine over the gearbox, with a dark hot-air exit around the exhaust; keeps the end rounded so air leaves cleanly toward the beam wing.',
    explode: [3.5, 0, 2.0],
  },
  kneeProtection: {
    function: "Cockpit side panels beside the driver's knees (X 7.6-10.4): add side-impact protection over the SIPS crush tubes and fill the gap between the tub and the pod inlet.",
    wraps: 'SIPS crush tubes X 8.9-13.1, y 2.88-3.32',
    x0: 7.7, x1: 10.0, z0: 2.6, z1: 4.25, gap: 0.04,
    explode: [0, 3.0, 0.8],
  },
};
