/**
 * ai_racing_corridor.js — Multi-car racing corridor, dynamic overtaking, slipstreaming & pace logic.
 * 2026 Formula 1 "Nimble Car" · SREdesigns - Samuel R Erwin III
 */

export class AiRacingCorridor {
  constructor({ circuit, gridConfig }) {
    this.circuit = circuit;
    this.track = circuit.track;
    this.raceline = circuit.raceline;
    this.trackLength = this.track.length;
    this.rlN = this.raceline.n;
    this.gridConfig = gridConfig;

    // Cache raceline speed profile
    this.rlV = this.computeRacelineSpeedProfile();
  }

  computeRacelineSpeedProfile() {
    const rlN = this.rlN;
    const rlV = new Float64Array(rlN);
    const k = new Float64Array(rlN);
    const LAT_A = 18, LAT_B = 0.004;

    for (let i = 0; i < rlN; i++) {
      const a = this.raceline.wrap(i - 4);
      const b = this.raceline.wrap(i + 4);
      const ax = this.raceline.x[i] - this.raceline.x[a];
      const az = this.raceline.z[i] - this.raceline.z[a];
      const bx = this.raceline.x[b] - this.raceline.x[i];
      const bz = this.raceline.z[b] - this.raceline.z[i];
      const cr = ax * bz - az * bx;
      const la = Math.hypot(ax, az);
      const lb = Math.hypot(bx, bz);
      const lc = Math.hypot(this.raceline.x[b] - this.raceline.x[a], this.raceline.z[b] - this.raceline.z[a]);
      k[i] = Math.abs(2 * cr / (la * lb * lc + 1e-9));
    }

    const f = 0.92;
    for (let i = 0; i < rlN; i++) {
      const den = k[i] - f * LAT_B;
      rlV[i] = den > 0 ? Math.min(93, Math.sqrt(f * LAT_A / den)) : 93;
    }

    const ds = (i) => Math.hypot(
      this.raceline.x[this.raceline.wrap(i + 1)] - this.raceline.x[i],
      this.raceline.z[this.raceline.wrap(i + 1)] - this.raceline.z[i]
    );

    // Forward and backward smoothing passes for braking and acceleration curves
    for (let pass = 0; pass < 3; pass++) {
      for (let j = 2 * rlN; j > 0; j--) {
        const i = j % rlN;
        const nx = (i + 1) % rlN;
        const brakeG = 13 + 0.0042 * rlV[nx] * rlV[nx];
        rlV[i] = Math.min(rlV[i], Math.sqrt(rlV[nx] ** 2 + 2 * 0.74 * brakeG * ds(i)));
      }
      for (let j = 0; j < 2 * rlN; j++) {
        const i = j % rlN;
        const nx = (i + 1) % rlN;
        rlV[nx] = Math.min(rlV[nx], Math.sqrt(rlV[i] ** 2 + 2 * 8.6 * ds(i)));
      }
    }
    return rlV;
  }

  /**
   * Update one AI car's decision making (target speed, lateral offset, draft, braking)
   */
  updateCarDecision(car, dt, allCars, playerCar, raceControl) {
    if (car.retired) {
      car.v = Math.max(0, car.v - 8 * dt);
      return;
    }

    const rlIdx = car.rlIdx >= 0 ? car.rlIdx : 0;
    const baseApexV = this.rlV[rlIdx];
    const skillMultiplier = 1.0 - (car.pacePct || 0) / 100 + (car.driverPct || 0);

    // Base target speed from raceline curvature
    let targetSpeed = baseApexV * skillMultiplier;

    // Wing damage penalty: losing front downforce limits cornering speed
    if (car.wingHealth < 0.95) {
      const damageLoss = (1.0 - car.wingHealth) * 0.35;
      targetSpeed *= (1.0 - damageLoss);
    }

    // Tyre wear factor
    if (car.tyreWear > 40) {
      targetSpeed *= Math.max(0.85, 1.0 - (car.tyreWear - 40) * 0.0025);
    }

    // Scan traffic ahead along track
    const traffic = this.scanTraffic(car, allCars, playerCar);
    const carAhead = traffic.ahead;
    const carBehind = traffic.behind;

    let targetLat = 0; // 0 = centered on raceline
    let slipstream = false;

    if (carAhead && carAhead.dist < 55) {
      const closingSpeed = car.v - carAhead.v;
      const latDiff = Math.abs(car.latOffset - carAhead.latOffset);

      // Slipstream / DRS draft zone: directly behind within 30m
      if (carAhead.dist < 32 && latDiff < 1.8 && car.v > 35) {
        slipstream = true;
        car.inSlipstream = true;
      } else {
        car.inSlipstream = false;
      }

      // Overtaking logic
      if (carAhead.dist < 22 && closingSpeed > 1.2) {
        // Attempt pass: look for open space on the inside or outside
        const insideBias = (carAhead.latOffset > 0) ? -2.0 : 2.0;
        targetLat = insideBias;

        // If very close, match target speed with safety margin to prevent clipping
        if (carAhead.dist < 5.5 && latDiff < 1.9) {
          targetSpeed = Math.min(targetSpeed, carAhead.v - 0.5);
        }
      } else if (carAhead.dist < 7.0 && latDiff < 1.8) {
        // Follow closely without crashing
        targetSpeed = Math.min(targetSpeed, carAhead.v);
      }
    } else {
      car.inSlipstream = false;
    }

    // Defensive line: if a competitor is right behind in a braking zone
    if (carBehind && carBehind.dist < 12 && targetSpeed < car.v - 5) {
      // Hold tighter line
      targetLat = THREE_clamp(targetLat + 0.8, -2.5, 2.5);
    }

    // Side-by-side wheel-to-wheel avoidance with any adjacent car
    if (traffic.alongside) {
      const other = traffic.alongside;
      if (other.latOffset > car.latOffset) {
        targetLat = Math.min(targetLat, other.latOffset - 2.2);
      } else {
        targetLat = Math.max(targetLat, other.latOffset + 2.2);
      }
    }

    // Race Control overrides (Yellow Flags, Safety Car)
    if (raceControl) {
      if (raceControl.safetyCarActive) {
        const scSpeed = raceControl.safetyCarSpeed || (120 / 3.6);
        targetSpeed = Math.min(targetSpeed, scSpeed);
      } else if (raceControl.isYellowInSector(car.sector)) {
        targetSpeed = Math.min(targetSpeed, 160 / 3.6);
      }
    }

    // Smoothly interpolate lateral offset toward target
    const latSpeed = 2.8; // m/s lateral transition
    const latDelta = targetLat - car.latOffset;
    car.latOffset += Math.sign(latDelta) * Math.min(Math.abs(latDelta), latSpeed * dt);

    // Apply longitudinal acceleration or braking toward targetSpeed
    if (car.v < targetSpeed) {
      const accel = (slipstream ? 9.5 : 7.8) * Math.min(1.0, 35 / Math.max(10, car.v));
      car.v = Math.min(targetSpeed, car.v + accel * dt);
    } else if (car.v > targetSpeed) {
      const brakeG = 12.0 + 0.0035 * car.v * car.v;
      car.v = Math.max(targetSpeed, car.v - brakeG * dt);
    }
  }

  scanTraffic(car, allCars, playerCar) {
    let nearestAhead = null;
    let minAheadDist = Infinity;
    let nearestBehind = null;
    let minBehindDist = Infinity;
    let alongside = null;

    const cars = [...allCars];
    if (playerCar && !playerCar.inPit) {
      cars.push(playerCar);
    }

    for (const other of cars) {
      if (other === car || other.retired) continue;

      // Track distance delta wrapped to circuit length
      let ds = other.sp - car.sp;
      if (ds < -this.trackLength * 0.5) ds += this.trackLength;
      if (ds > this.trackLength * 0.5) ds -= this.trackLength;

      if (ds > 0 && ds < minAheadDist) {
        minAheadDist = ds;
        nearestAhead = { car: other, dist: ds, v: other.v, latOffset: other.latOffset || 0 };
      } else if (ds < 0 && -ds < minBehindDist) {
        minBehindDist = -ds;
        nearestBehind = { car: other, dist: -ds, v: other.v, latOffset: other.latOffset || 0 };
      }

      // Wheel to wheel check
      if (Math.abs(ds) < 4.8 && Math.abs((other.latOffset || 0) - car.latOffset) < 2.5) {
        alongside = other;
      }
    }

    return { ahead: nearestAhead, behind: nearestBehind, alongside };
  }
}

function THREE_clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}
