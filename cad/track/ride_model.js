/**
 * Ride model: turns the on-track accelerations and speed into chassis motion (heave, pitch, roll)
 * and per-corner suspension travel, so the wheels, links and driveshafts move while driving.
 *
 * Everything is data: tune RIDE_SPEC (or pass your own spec) to change how the car sits.
 * Units: dm for lengths/travel, radians for angles, m/s and m/s^2 for the inputs.
 * Sign convention (same as full_car3d.js updateKinematics): travel + = bump (wheel moves up toward the body).
 * Body motion uses the CAD car frame: X nose -> tail (front axle 0), +Y left, +Z up.
 */
export const RIDE_SPEC = {
  corners: { fl: [0, 6.6], fr: [0, -6.6], rl: [34, 6.1], rr: [34, -6.1] }, // wheel centres (x, y) in dm
  pitchPerG: 0.0045,     // body pitch slope (dm of height per dm of length) per g of braking / acceleration
  rollPerG: 0.0055,      // body roll slope (dm per dm of track) per g of cornering
  aeroHeaveFront: 0.11,  // front body drop at 300 km/h from downforce (dm, = 11 mm)
  aeroHeaveRear: 0.16,   // rear body drop at 300 km/h (dm)
  refSpeed: 83.3,        // m/s that the aero heave values refer to (300 km/h)
  maxTravel: 0.35,       // bump-stop / droop limit per corner (dm)
  response: 9.0,         // how fast the body follows the target (1/s), critically damped
  visualGain: 1.0,       // scale everything (raise to exaggerate for a game camera)
  roadLift: 0.6,         // share of the average road bump (kerbs) that lifts the whole body, the rest goes into the springs
};

export function createRideModel(spec = RIDE_SPEC) {
  const S = { ...RIDE_SPEC, ...spec };
  const st = { heaveF: 0, heaveR: 0, slope: 0, roll: 0, v: { heaveF: 0, heaveR: 0, slope: 0, roll: 0 } };
  const travel = { fl: 0, fr: 0, rl: 0, rr: 0 };
  const body = { c0: 0, cx: 0, cy: 0 };
  const g = 9.81;
  const xMid = (S.corners.fl[0] + S.corners.rl[0]) / 2;

  /** critically damped spring toward target (stable for any dt) */
  function follow(key, target, dt) {
    const w = S.response, x = st[key] - target, v = st.v[key];
    const e = Math.exp(-w * dt), tmp = (v + w * x) * dt;
    st.v[key] = (v - w * tmp) * e;
    st[key] = target + (x + tmp) * e;
  }

  /** dz of the body at car-frame point (x, y): + = body moved up */
  const dz = (x, y) => body.c0 + body.cx * x + body.cy * y;

  return {
    spec: S, travel, body,
    reset() { Object.keys(st.v).forEach((k) => { st[k] = 0; st.v[k] = 0; }); Object.keys(travel).forEach((k) => (travel[k] = 0)); Object.assign(body, { c0: 0, cx: 0, cy: 0 }); },
    /**
     * @param dt seconds
     * @param aLong m/s^2 along the car's forward direction (+ = accelerating, - = braking)
     * @param aLat  m/s^2 toward car +Y (the inside of the turn)
     * @param speed m/s
     * @param road  optional { fl, fr, rl, rr } height of the road under each wheel above the flat track (dm), e.g. kerbs
     */
    update(dt, { aLong = 0, aLat = 0, speed = 0, road = null } = {}) {
      const q = Math.min(1.6, (speed / S.refSpeed) ** 2);
      // braking (aLong < 0): nose down, tail up -> dz grows toward the rear (positive slope)
      follow('slope', -S.pitchPerG * (aLong / g), dt);
      // body rolls away from the turn: the +Y (inside) side rises when aLat > 0
      follow('roll', S.rollPerG * (aLat / g), dt);
      follow('heaveF', -S.aeroHeaveFront * q, dt);
      follow('heaveR', -S.aeroHeaveRear * q, dt);
      const k = S.visualGain;
      const xf = S.corners.fl[0], xr = S.corners.rl[0];
      const dzF = (st.heaveF + st.slope * (xf - xMid)) * k, dzR = (st.heaveR + st.slope * (xr - xMid)) * k;
      body.cx = (dzR - dzF) / (xr - xf);
      body.c0 = dzF - body.cx * xf;
      body.cy = st.roll * k;
      // keep every corner inside its travel range by limiting the whole body motion
      let worst = 0;
      for (const key of Object.keys(travel)) worst = Math.max(worst, Math.abs(dz(...S.corners[key])));
      if (worst > S.maxTravel) { const f = S.maxTravel / worst; body.c0 *= f; body.cx *= f; body.cy *= f; }
      // the tyres stay on the road, so each wheel moves the opposite way to the body above it
      for (const key of Object.keys(travel)) travel[key] = -dz(...S.corners[key]);
      // road bumps (kerbs): each wheel is pushed up; part of it lifts the body, the rest is spring travel
      if (road) {
        let lift = 0;
        for (const key of Object.keys(travel)) lift += (road[key] || 0) * S.roadLift / 4;
        body.c0 += lift;
        for (const key of Object.keys(travel)) travel[key] = Math.min(S.maxTravel, travel[key] + (road[key] || 0) - lift);
      }
      return travel;
    },
  };
}

/** add per-corner travel objects together (e.g. ride motion + tyre-state stance) */
export function sumTravel(...list) {
  const out = { fl: 0, fr: 0, rl: 0, rr: 0 };
  list.forEach((t) => { if (t) for (const k in out) out[k] += t[k] || 0; });
  return out;
}
