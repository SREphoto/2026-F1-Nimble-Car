/**
 * Garage data: size, prop placement, clickable car parts and the regulations sheet.
 * Units are dm (1 unit = 10 cm), the same as the car model. Garage frame: x runs from the open pit-lane door (-x)
 * to the back wall (+x), z across, y up, floor at y = 0. The car sits nose to the door with its front axle at x = 0.
 * The builder (garage_builder.js) only reads this file, so another garage layout is a new data object.
 */
export const GARAGE_LAYOUT = {
  x0: -75, x1: 175, halfWidth: 68, height: 52,           // 25 m deep, 13.6 m wide, 5.2 m high (Huge, spacious works-team bay)
  lowerBand: 12,                                          // black lower band on the walls (dm)
  panelTop: 38,                                           // team colour wall panels from the band up to here
  brick: { pale: '#ddd6c8', grey: '#8d8f93' },
  floor: {
    color: '#9ba0a6', roughness: 0.38, clearcoat: 1.0, clearcoatRoughness: 0.08,   // glossy light grey epoxy
    reflect: 0.18,                                         // share of the mirror image mixed into the floor (high quality)
    lanes: { z0: 12, z1: 22, x0: -75, x1: 75, color: '#7c828a', chevron: '#e2e5ea' },   // grey chevron parking lanes beside the car
    subLanes: { z0: -48, z1: -38, x0: -60, x1: 65, color: '#7c828a', chevron: '#e2e5ea' },
    signs: [                                              // painted floor direction signs [text, x, z, rotation]
      ['PADDOCK EXIT  ▶', 160, -48, Math.PI / 2],
      ['STRATEGY & TELEMETRY  ▶', 145, -48, Math.PI / 2],
      ['POWER UNIT WORKSHOP  ▶', 128, -48, Math.PI / 2],
      ['800V DC HIGH VOLTAGE BAY ⚡', 24, 38, 0],
      ['CAR 1 · SERVICE BAY', -8, 0, 0],
      ['FIA SCRUTINEERING & SETUP  ▶', 88, -48, Math.PI / 2],
    ],
  },
  pitLaneStrip: { color: '#c3262b', width: 6, text: 'PIT-LANE' },
  truss: { y: 45, size: 2.6, seg: 10, runsX: [-44, -20, 20, 44], runsZ: [-50, -10, 30, 70, 110, 150] },     // aluminium box truss grid under the ceiling
  canopy: { x0: -10, x1: 56, halfWidth: 13.5, y: 37, depth: 2.6 },                         // light canopy over the car
  tubeLights: { y: 49.5, zs: [-54, -36, -18, 18, 36, 54], x0: -68, x1: 165, step: 18, length: 14 },
  ducts: { zs: [-46, 46], y: 49.2, r: 2.4 },
  cableTrays: { zs: [-60, 60], y: 47.5, width: 4.0 },
  rollerDoor: { y: 42, windows: 10 },                      // door raised to 4.2 m, bottom slats with a row of windows
  pitLane: { apron: 40, fastLane: 60, wall: 1.1, length: 340 },                          // outside the door (dm)
  // props: kind, position [x, z], rotation (rad around y, local +z faces the room), optional count and step (dm)
  props: [
    // Right Wall Units (Full length along z = 67)
    { kind: 'wallUnit', at: [18, 67], rot: Math.PI, count: 12, step: 9.4 },
    // Left Wall Units (Full length along z = -67)
    { kind: 'wallUnit', at: [18, -67], rot: 0, count: 12, step: 9.4 },

    // Driver Helmet Display Shelves on Left Wall
    { kind: 'helmetShelf', at: [68, -66.4], rot: 0 },
    { kind: 'helmetShelf', at: [96, -66.4], rot: 0 },

    // Pirelli Tyre Trolleys with Heated Tire Blankets (Spaced nicely in Left Operations Zone z = -46)
    { kind: 'tyreTrolley', at: [-55, -46], rot: 0, labels: ['LEFT FRONT', 'RIGHT FRONT', 'LEFT REAR', 'RIGHT REAR'] },
    { kind: 'tyreTrolley', at: [-35, -46], rot: 0, labels: ['LEFT FRONT', 'RIGHT FRONT', 'LEFT REAR', 'RIGHT REAR'] },
    { kind: 'tyreTrolley', at: [-15, -46], rot: 0, labels: ['LEFT FRONT', 'RIGHT FRONT', 'LEFT REAR', 'RIGHT REAR'] },
    { kind: 'tyreTrolley', at: [145, -46], rot: Math.PI / 2, labels: ['LEFT FRONT', 'RIGHT FRONT', 'LEFT REAR', 'RIGHT REAR'] },

    // Diagnostic & Tool Flight Cases on Right Side (z = 46 to 58)
    { kind: 'flightCase', at: [-35, 52], rot: 0.05 },
    { kind: 'flightCase', at: [-15, 52], rot: -0.08 },
    { kind: 'flightCase', at: [55, 54], rot: 0.12 },
    { kind: 'lockerCase', at: [5, 55], rot: Math.PI },
    { kind: 'drawerCase', at: [35, 55], rot: Math.PI },

    // Fire Extinguisher Safety Stations
    { kind: 'extinguisherStand', at: [-70, -60], rot: 0.35 },
    { kind: 'extinguisherStand', at: [-70, 60], rot: Math.PI - 0.35 },
    { kind: 'extinguisherStand', at: [168, -58], rot: 0 },
    { kind: 'extinguisherStand', at: [168, 58], rot: Math.PI },

    // Nitrogen Gas Bottle Charging Cart
    { kind: 'gasCart', at: [-56, 42], rot: Math.PI - 0.4 },

    // High-Octane Fuel Drums & Pumping Station
    { kind: 'fuelDrum', at: [136, 56] },
    { kind: 'fuelDrum', at: [144, 50] },

    // Strategy Island Stools & Director Chairs
    { kind: 'barStool', at: [136, -16] },
    { kind: 'barStool', at: [136, 16] },
    { kind: 'barStool', at: [136, -6] },
    { kind: 'barStool', at: [136, 6] },
    { kind: 'directorChair', at: [140, -10], rot: Math.PI / 2 },
    { kind: 'directorChair', at: [140, 10], rot: Math.PI / 2 },
    { kind: 'directorChair', at: [120, -32], rot: 0.6 },
    { kind: 'directorChair', at: [120, 32], rot: -0.6 },

    // Driver Debrief Carbon Bucket Chairs
    { kind: 'racingSeat', at: [125, -20], rot: -Math.PI / 2 },
    { kind: 'racingSeat', at: [125, 20], rot: Math.PI / 2 },

    // Live Timing Pillar TVs at Entrance and Mid-Aisle
    { kind: 'pillarTV', at: [-71.5, -64] },
    { kind: 'pillarTV', at: [-71.5, 64] },
    { kind: 'pillarTV', at: [85, -64] },
    { kind: 'pillarTV', at: [85, 64] },
  ],
  desk: { at: [154, 0], length: 48, depth: 9, height: 7.5, monitorWall: { cols: 4, rows: 2, w: 9.6, h: 5.8 } },
  stands: { raise: 1.8 },                                 // the car is lifted 18 cm onto stands when the wheels are off
  sponsors: ['SREdesigns', 'NIMBLE CAR 2026', 'APEX FUELS', 'TORQUE LABS', 'CARBONWORKS', 'GRIDLINE DATA'],   // made-up names, plain text only
};

/**
 * Clickable car parts. key = the car's sub-assembly order in cad/full_car3d.js (children 0 to 8 of the car),
 * plus 'wheels' for the Wheel_Visual_* groups. look = camera target / position for that part (car frame, dm).
 */
export const GARAGE_PARTS = {
  monocoque: { name: 'Monocoque and safety cell', text: 'Carbon fibre survival cell with the titanium halo. The driver, fuel cell and front suspension all mount to it.', facts: ['Halo: titanium, about 7 kg', 'Survival cell passes FIA crash and load tests'] },
  cockpitAccessories: { name: 'Driver, helmet, mirrors and sensors', text: 'The driver and helmet, the mirrors and the sensors around the cockpit.', facts: ['Mirrors on the sidepods and halo', 'Camera pods on the airbox'] },
  brakes: { name: 'Carbon brakes', text: 'Carbon discs and pads with over 1,400 small cooling holes per disc. The rear brakes are shared with energy recovery.', facts: ['Discs run at up to about 1,000 °C', 'Brake-by-wire at the rear'] },
  electrical: { name: 'Wiring and 800 V battery', text: 'The wiring looms and the energy store that feeds the electric motor.', facts: ['High voltage battery under the fuel cell', 'About 4 MJ usable per lap'] },
  powertrain: { name: '1.6 litre V6 and electric motor', text: 'Turbocharged 1.6 litre V6 with the MGU-K electric motor. 2026 power is close to half petrol and half electric.', facts: ['ICE about 400 kW', 'MGU-K 350 kW', 'No MGU-H from 2026'] },
  transmission: { name: '8-speed gearbox and driveshafts', text: 'Seamless shift 8-speed gearbox, differential and driveshafts to the rear wheels.', facts: ['8 forward gears and reverse', 'Gear ratios fixed for the season'] },
  suspension: { name: 'Suspension and steering', text: 'Wishbones, push and pull rods, uprights and the steering rack.', facts: ['Carbon wishbones with aero shapes', 'Front and rear ride height set by the team'] },
  floor: { name: 'Floor, plank and diffuser', text: 'The underbody that makes most of the downforce, with the wooden plank that is checked for wear after each session.', facts: ['Plank 10 mm thick at the start', 'Flatter floor rules in 2026'] },
  bodywork: { name: 'Wings, sidepods and engine cover', text: 'Front and rear wings with the 2026 movable flaps, the sidepods and the engine cover.', facts: ['Straight mode lowers drag on the straights', 'Corner mode for full downforce'] },
  wheels: { name: 'Wheels and Pirelli tyres', text: '18 inch wheels with Pirelli tyres. Full-width 305 mm front and 405 mm rear high-grip slick profile.', facts: ['Front 305 mm wide', 'Rear 405 mm wide'] },
};
export const PART_ORDER = ['monocoque', 'cockpitAccessories', 'brakes', 'electrical', 'powertrain', 'transmission', 'suspension', 'floor', 'bodywork'];

/** Regulations sheet (was the "2026 Regulations Compliance" side panel). Shown on the desk monitor, the printed sheet and the overlay. */
export const REGULATIONS = {
  title: '2026 Regulations',
  rows: [
    ['Wheelbase', '3400 mm (-200 mm)'],
    ['Overall width', '1900 mm (-100 mm)'],
    ['Minimum weight', '768 kg (-30 kg target)'],
    ['ICE power', 'about 400 kW (1.6 L 90° V6)'],
    ['MGU-K power', '350 kW (up from 120 kW)'],
    ['Fuel energy flow', '3000 MJ/h max (Article C5)'],
    ['MGU-H', 'Banned (turbo only)'],
    ['Aero drag drop (X-Mode)', '-55% drag'],
    ['Front tyres', '305/720-18 (Full FIA Spec)'],
    ['Rear tyres', '405/720-18 (Full FIA Spec)'],
    ['Plank material', '10 mm Jabroc + titanium pucks'],
  ],
};
