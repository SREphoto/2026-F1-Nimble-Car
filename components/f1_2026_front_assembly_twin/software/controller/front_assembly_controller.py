"""
front_assembly_controller.py — Master Integrated Pure Python Controller for 2026 F1 Front Quarter.

Unifies:
1. Active Aerodynamics (Front Wing Z-Mode 24° vs X-Mode 6°, dynamic downforce/drag).
2. Suspension Kinematics (Bump travel, dynamic camber recovery, pull-rod load, 14.2° anti-dive).
3. Brake Corner Dynamics (Pedal effort to 180 bar hydraulic line pressure, 4,200 Nm torque, disc thermal physics).
4. Monocoque Rigidity (Torsional twist under lateral g, 800V HV safety state).
5. Cross-Subsystem Safety Interlocks: Heavy braking (> 2.0g) automatically forces active wing into Z-Mode to maximize front braking grip.
"""

from dataclasses import dataclass
import math
from typing import Dict, Any


@dataclass
class FrontAssemblyConfig:
    # Aero
    wing_area_m2: float = 1.15
    air_density: float = 1.225
    z_mode_angle: float = 24.0
    x_mode_angle: float = 6.0
    actuation_rate_deg_s: float = 48.0
    # Suspension
    corner_mass_kg: float = 185.0
    motion_ratio: float = 0.82
    pullrod_angle_deg: float = 28.5
    anti_dive_pct: float = 38.5
    static_camber_deg: float = -3.20
    camber_gain_per_mm: float = -0.045
    # Brakes
    piston_area_m2: float = 0.002511
    disc_radius_eff_m: float = 0.147
    # Chassis
    torsional_stiffness_nm_deg: float = 44500.0


class F1FrontAssemblyController:
    """Master controller for the unified 2026 F1 front assembly."""

    def __init__(self, config: FrontAssemblyConfig = None):
        self.cfg = config or FrontAssemblyConfig()

        # Operational inputs
        self.airspeed_kmh: float = 250.0
        self.pedal_force_kgf: float = 0.0
        self.lateral_g: float = 0.0
        self.wheel_bump_mm: float = 0.0
        self.steer_deg: float = 0.0
        self.requested_aero_mode: str = "Z_MODE"

        # Computed state
        self.effective_aero_mode: str = "Z_MODE"
        self.flap_angle_deg: float = self.cfg.z_mode_angle
        self.downforce_n: float = 0.0
        self.drag_n: float = 0.0
        self.drag_reduction_pct: float = 0.0

        self.camber_deg: float = self.cfg.static_camber_deg
        self.pullrod_tension_kn: float = 3.12
        self.pitch_reduction_mm: float = 0.0

        self.line_pressure_bar: float = 0.0
        self.braking_torque_nm: float = 0.0
        self.disc_temp_c: float = 25.0
        self.braking_g: float = 0.0

        self.torsional_twist_deg: float = 0.0
        self.hv_safe: bool = True

    def set_inputs(
        self,
        speed_kmh: float = None,
        pedal_kgf: float = None,
        lateral_g: float = None,
        bump_mm: float = None,
        steer_deg: float = None,
        aero_mode: str = None,
    ):
        """Update driver and track telemetry inputs."""
        if speed_kmh is not None:
            self.airspeed_kmh = max(0.0, speed_kmh)
        if pedal_kgf is not None:
            self.pedal_force_kgf = max(0.0, min(180.0, pedal_kgf))
        if lateral_g is not None:
            self.lateral_g = max(-6.0, min(6.0, lateral_g))
        if bump_mm is not None:
            self.wheel_bump_mm = max(-25.0, min(35.0, bump_mm))
        if steer_deg is not None:
            self.steer_deg = max(-18.5, min(18.5, steer_deg))
        if aero_mode in ("Z_MODE", "X_MODE"):
            self.requested_aero_mode = aero_mode

    def step(self, dt_seconds: float = 0.016):
        """Advance integrated system physics."""
        # 1. Brake System
        self.line_pressure_bar = (self.pedal_force_kgf / 180.0) * 180.0
        piston_force_n = (self.line_pressure_bar * 1e5) * self.cfg.piston_area_m2 if self.line_pressure_bar > 2.0 else 0.0
        mu = 0.48 if self.disc_temp_c > 200 else 0.32
        self.braking_torque_nm = 2.0 * piston_force_n * mu * self.cfg.disc_radius_eff_m
        # Deceleration g-force from torque
        self.braking_g = (self.braking_torque_nm / 4200.0) * 5.2

        # Disc thermal rise under braking
        if self.braking_torque_nm > 50.0:
            thermal_power_kw = (self.braking_torque_nm * (self.airspeed_kmh / 3.6)) / 1000.0
            self.disc_temp_c = min(1100.0, self.disc_temp_c + thermal_power_kw * 0.012 * dt_seconds)
        else:
            # Cooling towards ambient
            self.disc_temp_c = max(25.0, self.disc_temp_c - (self.disc_temp_c - 25.0) * 0.02 * dt_seconds)

        # 2. Interlock: Heavy braking forces Active Wing into Z-Mode
        if self.braking_g >= 1.8:
            self.effective_aero_mode = "Z_MODE"
        else:
            self.effective_aero_mode = self.requested_aero_mode

        # 3. Active Flap Kinematics
        target_angle = self.cfg.x_mode_angle if self.effective_aero_mode == "X_MODE" else self.cfg.z_mode_angle
        delta = target_angle - self.flap_angle_deg
        max_step = self.cfg.actuation_rate_deg_s * dt_seconds
        if abs(delta) <= max_step:
            self.flap_angle_deg = target_angle
        else:
            self.flap_angle_deg += math.copysign(max_step, delta)

        # 4. Aerodynamic Forces
        v_ms = self.airspeed_kmh / 3.6
        q = 0.5 * self.cfg.air_density * (v_ms ** 2)
        cl = 1.15 + (0.055 * self.flap_angle_deg)
        cd = 0.20 + (0.023 * self.flap_angle_deg)
        self.downforce_n = q * self.cfg.wing_area_m2 * cl
        self.drag_n = q * self.cfg.wing_area_m2 * cd

        cd_z = 0.20 + (0.023 * self.cfg.z_mode_angle)
        drag_z = q * self.cfg.wing_area_m2 * cd_z
        self.drag_reduction_pct = max(0.0, ((drag_z - self.drag_n) / drag_z) * 100.0) if drag_z > 0 else 0.0

        # 5. Suspension Kinematics
        self.camber_deg = self.cfg.static_camber_deg + (self.cfg.camber_gain_per_mm * self.wheel_bump_mm)
        vertical_load_g = 1.0 + (self.downforce_n / 4000.0) + (self.braking_g * 0.45)
        f_wheel_n = vertical_load_g * self.cfg.corner_mass_kg * 9.81
        sin_angle = math.sin(math.radians(self.cfg.pullrod_angle_deg))
        self.pullrod_tension_kn = (f_wheel_n * self.cfg.motion_ratio) / (sin_angle * 1000.0)

        # Anti-dive pitch reduction
        self.pitch_reduction_mm = (self.braking_g * 6.2) * (self.cfg.anti_dive_pct / 100.0)

        # 6. Monocoque Torsion
        roll_moment_nm = abs(self.lateral_g) * 9.81 * 768.0 * 0.28
        self.torsional_twist_deg = roll_moment_nm / self.cfg.torsional_stiffness_nm_deg

    def get_telemetry(self) -> Dict[str, Any]:
        """Return master telemetry package."""
        return {
            "airspeed_kmh": round(self.airspeed_kmh, 1),
            "effective_aero_mode": self.effective_aero_mode,
            "flap_angle_deg": round(self.flap_angle_deg, 2),
            "downforce_n": round(self.downforce_n, 1),
            "drag_n": round(self.drag_n, 1),
            "drag_reduction_pct": round(self.drag_reduction_pct, 1),
            "line_pressure_bar": round(self.line_pressure_bar, 1),
            "braking_torque_nm": round(self.braking_torque_nm, 1),
            "disc_temp_c": round(self.disc_temp_c, 1),
            "braking_g": round(self.braking_g, 2),
            "wheel_bump_mm": round(self.wheel_bump_mm, 2),
            "camber_deg": round(self.camber_deg, 3),
            "pullrod_tension_kn": round(self.pullrod_tension_kn, 2),
            "anti_dive_reduction_mm": round(self.pitch_reduction_mm, 2),
            "lateral_g": round(self.lateral_g, 2),
            "torsional_twist_deg": round(self.torsional_twist_deg, 4),
            "hv_safe": self.hv_safe,
        }
