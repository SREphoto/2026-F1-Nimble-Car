/**
 * Garage data: size, prop placement, clickable car parts and the regulations sheet.
 * Units are dm (1 unit = 10 cm), the same as the car model. Garage frame: x runs from the open pit-lane door (-x)
 * to the back wall (+x), z across, y up, floor at y = 0. The car sits nose to the door with its front axle at x = 0.
 * The builder (garage_builder.js) only reads this file, so another garage layout is a new data object.
 */
export const GARAGE_LAYOUT = {
  x0: -75, x1: 115, halfWidth: 36, height: 46,           // 19 m deep, 7.2 m wide, 4.6 m high
  lowerBand: 11,                                          // black lower band on the walls (dm)
  panelTop: 34,                                           // team colour wall panels from the band up to here
  brick: { pale: '#ddd6c8', grey: '#8d8f93' },
  floor: {
    color: '#b3b7bc', roughness: 0.42, clearcoat: 1.0, clearcoatRoughness: 0.1,   // glossy light grey epoxy
    reflect: 0.15,                                         // share of the mirror image mixed into the floor (high quality)
    lanes: { z0: 11.5, z1: 19, x0: -75, x1: 56, color: '#80858c', chevron: '#e2e4e7' },   // grey chevron parking lanes beside the car
    signs: [                                              // painted floor direction signs [text, x, z, rotation]
      ['PADDOCK  ▶', 96, -22, Math.PI / 2], ['TELEMETRY ROOM  ▶', 88, -22, Math.PI / 2], ['ENGINE ROOM  ▶', 80, -22, Math.PI / 2],
    ],
  },
  pitLaneStrip: { color: '#c3262b', width: 6, text: 'PIT-LANE' },
  truss: { y: 39, size: 2.4, seg: 10, runsX: [-13, 13], runsZ: [-40, 0, 40, 80] },     // aluminium box truss grid under the ceiling
  canopy: { x0: -8, x1: 46, halfWidth: 11, y: 33, depth: 2.4 },                         // light canopy over the car
  tubeLights: { y: 43.2, zs: [-29, -21, 21, 29], x0: -66, x1: 108, step: 16, length: 12 },
  ducts: { zs: [-24, 24], y: 43, r: 2.0 },
  cableTrays: { zs: [-32, 32], y: 41.5, width: 3.6 },
  rollerDoor: { y: 38, windows: 6 },                      // door raised to 3.8 m, bottom slats with a row of windows
  pitLane: { apron: 40, fastLane: 60, wall: 1.1, length: 340 },                          // outside the door (dm)
  // props: kind, position [x, z], rotation (rad around y, local +z faces the room), optional count and step (dm)
  props: [
    { kind: 'wallUnit', at: [42, -35], rot: 0, count: 6, step: 9.4 },
    { kind: 'wallUnit', at: [92, 35], rot: Math.PI, count: 4, step: 9.4 },
    { kind: 'helmetShelf', at: [58, -34.6], rot: 0 },
    { kind: 'helmetShelf', at: [78, -34.6], rot: 0 },
    { kind: 'tyreTrolley', at: [-46, -27], rot: 0, labels: ['LEFT FRONT', 'RIGHT FRONT', 'LEFT REAR', 'RIGHT REAR'] },
    { kind: 'tyreTrolley', at: [-30, -27], rot: 0, labels: ['LEFT FRONT', 'RIGHT FRONT', 'LEFT REAR', 'RIGHT REAR'] },
    { kind: 'tyreTrolley', at: [104, -27], rot: Math.PI / 2, labels: ['LEFT FRONT', 'RIGHT FRONT', 'LEFT REAR', 'RIGHT REAR'] },
    { kind: 'flightCase', at: [6, -29], rot: 0 }, { kind: 'flightCase', at: [17, -29], rot: 0.08 },
    { kind: 'lockerCase', at: [6, 28.5], rot: Math.PI },
    { kind: 'drawerCase', at: [30, 29], rot: Math.PI },
    { kind: 'flightCase', at: [-16, 29], rot: Math.PI },
    { kind: 'extinguisherStand', at: [-70, -32], rot: 0.4 }, { kind: 'extinguisherStand', at: [-70, 32], rot: Math.PI - 0.4 }, { kind: 'extinguisherStand', at: [110, 31], rot: Math.PI },
    { kind: 'gasCart', at: [-52, 26], rot: Math.PI - 0.5 },
    { kind: 'fuelDrum', at: [100, 30] }, { kind: 'fuelDrum', at: [106, 25] },
    { kind: 'barStool', at: [83, -6] }, { kind: 'barStool', at: [83, 14] }, { kind: 'barStool', at: [36, -22] }, { kind: 'barStool', at: [62, 22] },
    { kind: 'directorChair', at: [86, 2], rot: Math.PI / 2 }, { kind: 'directorChair', at: [86, 9], rot: Math.PI / 2 }, { kind: 'directorChair', at: [72, -24], rot: 0.5 },
    { kind: 'racingSeat', at: [104, -14], rot: -Math.PI / 2 },
    { kind: 'pillarTV', at: [-71.5, -34] }, { kind: 'pillarTV', at: [-71.5, 34] },
  ],
  desk: { at: [96, 4], length: 34, depth: 8, height: 7.5, monitorWall: { cols: 4, rows: 2, w: 8, h: 5 } },
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
  wheels: { name: 'Wheels and Pirelli tyres', text: '18 inch wheels with Pirelli tyres. The 2026 tyres are narrower than before.', facts: ['Front 280 mm wide', 'Rear 375 mm wide'] },
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
    ['Front tyres', '280/710-18 (-25 mm)'],
    ['Rear tyres', '375/710-18 (-30 mm)'],
    ['Plank material', '10 mm Jabroc + titanium pucks'],
  ],
};
