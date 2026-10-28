/**
 * race_control.js — Race Control Flag System: Yellow Flags, Virtual Safety Car & Safety Car.
 * 2026 Formula 1 "Nimble Car" · SREdesigns - Samuel R Erwin III
 */

export class RaceControl {
  constructor({ circuit }) {
    this.circuit = circuit;
    this.sectorYellows = [false, false, false];
    this.vscActive = false;
    this.safetyCarActive = false;
    this.safetyCarSpeed = 120 / 3.6; // 120 km/h in m/s

    this.listeners = [];
    this.yellowCooldowns = [0, 0, 0];
  }

  onEvent(callback) {
    this.listeners.push(callback);
  }

  notify(event) {
    this.listeners.forEach((cb) => cb(event));
  }

  isYellowInSector(secIdx) {
    return this.vscActive || this.safetyCarActive || (this.sectorYellows[secIdx] ?? false);
  }

  triggerSectorYellow(secIdx, reason = 'Car stopped') {
    if (this.sectorYellows[secIdx]) return;
    this.sectorYellows[secIdx] = true;
    this.yellowCooldowns[secIdx] = 12.0; // 12 seconds yellow duration

    this.notify({
      type: 'YELLOW_FLAG',
      sector: secIdx + 1,
      message: `YELLOW FLAG in Sector ${secIdx + 1} (${reason})`,
    });
  }

  triggerVSC(reason = 'Debris on track') {
    if (this.vscActive || this.safetyCarActive) return;
    this.vscActive = true;
    this.notify({
      type: 'VSC_DEPLOYED',
      message: `VIRTUAL SAFETY CAR DEPLOYED — Reduce speed (${reason})`,
    });
  }

  endVSC() {
    if (!this.vscActive) return;
    this.vscActive = false;
    this.notify({
      type: 'VSC_ENDING',
      message: 'VIRTUAL SAFETY CAR ENDING — Track Clear',
    });
  }

  triggerSafetyCar(reason = 'Major incident') {
    if (this.safetyCarActive) return;
    this.safetyCarActive = true;
    this.vscActive = false;
    this.notify({
      type: 'SAFETY_CAR_DEPLOYED',
      message: `SAFETY CAR DEPLOYED (${reason})`,
    });
  }

  endSafetyCar() {
    if (!this.safetyCarActive) return;
    this.safetyCarActive = false;
    this.notify({
      type: 'SAFETY_CAR_IN',
      message: 'SAFETY CAR IN THIS LAP — Prepare for restart',
    });
  }

  update(dt, allCars) {
    // Tick cooldowns
    for (let i = 0; i < 3; i++) {
      if (this.yellowCooldowns[i] > 0) {
        this.yellowCooldowns[i] -= dt;
        if (this.yellowCooldowns[i] <= 0) {
          this.sectorYellows[i] = false;
          this.notify({
            type: 'GREEN_FLAG',
            sector: i + 1,
            message: `Sector ${i + 1} GREEN FLAG — Track Clear`,
          });
        }
      }
    }

    // Check for stopped or spun cars
    allCars.forEach((c) => {
      if (!c.retired && c.v < 4.0 && !c.inPit) {
        const sec = c.sector || 0;
        if (!this.sectorYellows[sec]) {
          this.triggerSectorYellow(sec, `${c.name || 'Car'} stranded`);
        }
      }
    });
  }
}
