"""
front_wing_controller.py — Authoritative Pure Python Controller for 2026 F1 Active Front Wing & FIS.

Models:
- Dual active flap articulation (Z-Mode 24.0° to X-Mode 6.0°).
- Slew rate kinematics with realistic transition time (<= 400 ms).
- Dynamic pressure, downforce (Fz), and drag (Fx) scaling with airspeed.
- Electro-hydraulic pressure monitoring with titanium return-spring failsafe (< 120 bar snap-shut).
- Bilateral asymmetry monitoring (|alpha_LH - alpha_RH| > 1.5° SECU emergency abort).
- Aerodynamic Center of Pressure (CoP) drift tracking.
"""

from dataclasses import dataclass
import math
from typing import Dict, Any


@dataclass
class FrontWingConfig:
    wing_area_m2: float = 1.15                # Planform area of front wing assembly
    air_density_kg_m3: float = 1.225          # Standard sea-level air density
    z_mode_angle_deg: float = 24.0            # High-downforce cornering angle
    x_mode_angle_deg: float = 6.0             # Low-drag straightline angle
    actuation_rate_deg_s: float = 48.0        # ~375 ms for 18° stroke
    spring_snap_rate_deg_s: float = 90.0      # Mechanical return spring snap rate
    min_hydraulic_bar: float = 120.0          # Failsafe pressure threshold
    nominal_hydraulic_bar: float = 200.0      # Operating system pressure
    asymmetry_limit_deg: float = 1.5          # SECU asymmetry abort threshold


class F1FrontWingController:
    """Real-time aerodynamic and kinematic controller for 2026 F1 front wing."""

    def __init__(self, config: FrontWingConfig = None):
        self.cfg = config or FrontWingConfig()

        # Operational state
        self.mode: str = "Z_MODE"              # "Z_MODE" or "X_MODE"
        self.airspeed_kmh: float = 250.0
        self.hydraulic_pressure_bar: float = self.cfg.nominal_hydraulic_bar

        # Flap angles
        self.flap_angle_lh_deg: float = self.cfg.z_mode_angle_deg
        self.flap_angle_rh_deg: float = self.cfg.z_mode_angle_deg

        # Safety & status flags
        self.failsafe_active: bool = False
        self.asymmetry_aborted: bool = False
        self.in_transition: bool = False

        # Aerodynamic outputs
        self.downforce_n: float = 0.0
        self.drag_n: float = 0.0
        self.drag_reduction_pct: float = 0.0
        self.cop_drift_mm: float = 0.0

    def set_mode(self, mode: str):
        """Request aerodynamic operating mode ('Z_MODE' or 'X_MODE')."""
        if mode in ("Z_MODE", "X_MODE"):
            self.mode = mode

    def set_airspeed_kmh(self, speed_kmh: float):
        """Set freestream vehicle airspeed (km/h)."""
        self.airspeed_kmh = max(0.0, speed_kmh)

    def set_hydraulic_pressure(self, bar: float):
        """Update system hydraulic supply pressure (bar)."""
        self.hydraulic_pressure_bar = max(0.0, bar)

    def step(self, dt_seconds: float = 0.016):
        """Advance controller physics by dt seconds."""
        # 1. Hydraulic pressure failsafe check
        if self.hydraulic_pressure_bar < self.cfg.min_hydraulic_bar:
            self.failsafe_active = True
            target_angle = self.cfg.z_mode_angle_deg
            rate = self.cfg.spring_snap_rate_deg_s
        elif self.asymmetry_aborted:
            target_angle = self.cfg.z_mode_angle_deg
            rate = self.cfg.spring_snap_rate_deg_s
        else:
            self.failsafe_active = False
            target_angle = self.cfg.x_mode_angle_deg if self.mode == "X_MODE" else self.cfg.z_mode_angle_deg
            rate = self.cfg.actuation_rate_deg_s

        # 2. Articulate LH flap
        delta_lh = target_angle - self.flap_angle_lh_deg
        max_step_lh = rate * dt_seconds
        if abs(delta_lh) <= max_step_lh:
            self.flap_angle_lh_deg = target_angle
        else:
            self.flap_angle_lh_deg += math.copysign(max_step_lh, delta_lh)

        # 3. Articulate RH flap
        delta_rh = target_angle - self.flap_angle_rh_deg
        max_step_rh = rate * dt_seconds
        if abs(delta_rh) <= max_step_rh:
            self.flap_angle_rh_deg = target_angle
        else:
            self.flap_angle_rh_deg += math.copysign(max_step_rh, delta_rh)

        # 4. Bilateral Asymmetry Check
        asymmetry = abs(self.flap_angle_lh_deg - self.flap_angle_rh_deg)
        if asymmetry >= self.cfg.asymmetry_limit_deg and not self.asymmetry_aborted:
            self.asymmetry_aborted = True

        self.in_transition = (
            abs(self.flap_angle_lh_deg - target_angle) > 0.01 or
            abs(self.flap_angle_rh_deg - target_angle) > 0.01
        )

        # 5. Aerodynamic Forces Calculation
        avg_angle = (self.flap_angle_lh_deg + self.flap_angle_rh_deg) / 2.0
        v_ms = self.airspeed_kmh / 3.6
        q = 0.5 * self.cfg.air_density_kg_m3 * (v_ms ** 2)

        # Polar functions: C_L and C_D
        cl = 1.15 + (0.055 * avg_angle)
        cd = 0.20 + (0.023 * avg_angle)

        self.downforce_n = q * self.cfg.wing_area_m2 * cl
        self.drag_n = q * self.cfg.wing_area_m2 * cd

        # Drag reduction relative to baseline Z-Mode
        cd_z_baseline = 0.20 + (0.023 * self.cfg.z_mode_angle_deg)
        drag_z_baseline = q * self.cfg.wing_area_m2 * cd_z_baseline
        if drag_z_baseline > 0:
            self.drag_reduction_pct = max(0.0, ((drag_z_baseline - self.drag_n) / drag_z_baseline) * 100.0)
        else:
            self.drag_reduction_pct = 0.0

        # Center of Pressure (CoP) shift: ~1.2 mm forward shift per degree depitch
        self.cop_drift_mm = (avg_angle - self.cfg.z_mode_angle_deg) * 1.2

    def reset_aborts(self):
        """Reset asymmetry abort flag once resolved."""
        self.asymmetry_aborted = False

    def get_telemetry(self) -> Dict[str, Any]:
        """Return full telemetry dictionary."""
        avg_angle = (self.flap_angle_lh_deg + self.flap_angle_rh_deg) / 2.0
        return {
            "mode": self.mode,
            "airspeed_kmh": round(self.airspeed_kmh, 1),
            "hydraulic_pressure_bar": round(self.hydraulic_pressure_bar, 1),
            "flap_angle_lh_deg": round(self.flap_angle_lh_deg, 2),
            "flap_angle_rh_deg": round(self.flap_angle_rh_deg, 2),
            "flap_angle_avg_deg": round(avg_angle, 2),
            "downforce_n": round(self.downforce_n, 1),
            "drag_n": round(self.drag_n, 1),
            "drag_reduction_pct": round(self.drag_reduction_pct, 1),
            "cop_drift_mm": round(self.cop_drift_mm, 2),
            "failsafe_active": self.failsafe_active,
            "asymmetry_aborted": self.asymmetry_aborted,
            "in_transition": self.in_transition,
        }
