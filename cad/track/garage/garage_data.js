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
  brick: { pale: '#d9d4c8', grey: '#8d8f93' },
  floor: { color: '#c9ccd0', roughness: 0.22, carBox: { x0: -14, x1: 50, halfWidth: 12 } },
  pitLaneStrip: { color: '#c3262b', width: 6, text: 'PIT-LANE' },
  truss: { y: 40, zs: [-13, 13], size: 1.6, canopy: { x0: -8, x1: 46, halfWidth: 11, y: 33 } },
  tubeLights: { y: 43, xs: [-50, -20, 10, 40, 70, 100], length: 24 },
  rollerDoor: { y: 38 },                                  // raised door rolled up over the opening
  // props: kind, position [x, z], rotation (rad around y), optional count
  props: [
    { kind: 'cabinet', at: [60, -33], rot: 0, count: 5, step: 9 },
    { kind: 'cabinet', at: [60, 33], rot: Math.PI, count: 5, step: 9 },
    { kind: 'tyreTrolley', at: [-40, -28], rot: 0, labels: ['LEFT FRONT', 'LEFT REAR'] },
    { kind: 'tyreTrolley', at: [-40, 28], rot: 0, labels: ['RIGHT FRONT', 'RIGHT REAR'] },
    { kind: 'flightCase', at: [20, -30], rot: 0, count: 3, step: 8 },
    { kind: 'flightCase', at: [20, 30], rot: 0, count: 2, step: 8 },
    { kind: 'helmetShelf', at: [104, -26], rot: Math.PI / 2 },
    { kind: 'extinguisher', at: [-68, -33] }, { kind: 'extinguisher', at: [-68, 33] }, { kind: 'extinguisher', at: [108, 0] },
    { kind: 'gasCart', at: [-55, 31], rot: 0 },
    { kind: 'fuelDrum', at: [88, 31] }, { kind: 'fuelDrum', at: [92, 28] },
    { kind: 'stool', at: [86, -6] }, { kind: 'stool', at: [86, 4] }, { kind: 'stool', at: [86, 14] },
    { kind: 'directorChair', at: [70, -20], rot: 0.3 }, { kind: 'directorChair', at: [70, 20], rot: -0.3 },
    { kind: 'racingSeat', at: [100, 26], rot: -Math.PI / 2 },
    { kind: 'pillarTV', at: [-72, -33] }, { kind: 'pillarTV', at: [-72, 33] },
  ],
  desk: { at: [96, 4], length: 34, depth: 8, height: 7.5, monitorWall: { cols: 3, rows: 2, w: 9, h: 5.5 } },
  stands: { front: -6, rear: 42, jack: 18, raise: 1.8 },  // car stands when the wheels are off (x positions, lift dm)
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
