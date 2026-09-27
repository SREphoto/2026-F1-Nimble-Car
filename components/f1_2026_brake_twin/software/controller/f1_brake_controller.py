"""
f1_brake_controller.py — Authoritative Pure Python Controller for 2026 F1 Brake Corner.

Models:
- 1:1 Hydraulic line pressure and differential 6-piston clamping force.
- Temperature-dependent friction coefficient mu(T) for PAN carbon-carbon.
- Stefan-Boltzmann radiation and forced centrifugal convection cooling.
- 0.15 mm elastic square-seal rollback retraction (zero-drag off-brake state).
- Brake-by-Wire (BBW) fail-safe shuttle bypass valve logic.
"""

from dataclasses import dataclass, field
import math
from typing import Dict, Any


@dataclass
class BrakeCornerConfig:
    # Disc physical geometry
    disc_outer_radius_m: float = 0.1725     # 345 mm diameter / 2
    disc_inner_radius_m: float = 0.0975     # 195 mm diameter / 2
    disc_thickness_m: float = 0.0340        # 34 mm thickness
    effective_friction_radius_m: float = 0.1350  # Center of pad contact track
    disc_mass_kg: float = 1.420             # 1420 grams
    disc_specific_heat_j_per_kg_k: float = 1400.0  # High-temp carbon composite Cp
    disc_emissivity: float = 0.88           # Oxidized C/C surface emissivity

    # Piston areas (Differential 6-piston monobloc: 3 per side)
    piston_lead_diam_m: float = 0.0270      # 27 mm
    piston_mid_diam_m: float = 0.0320       # 32 mm
    piston_trail_diam_m: float = 0.0380     # 38 mm

    # Max ratings
    max_line_pressure_bar: float = 180.0
    ambient_temp_deg_c: float = 25.0
    stefan_boltzmann_const: float = 5.670374e-8

    def total_one_bank_piston_area_m2(self) -> float:
        """Area of the 3 pistons clamping from one side."""
        a_lead = (math.pi / 4.0) * (self.piston_lead_diam_m ** 2)
        a_mid = (math.pi / 4.0) * (self.piston_mid_diam_m ** 2)
        a_trail = (math.pi / 4.0) * (self.piston_trail_diam_m ** 2)
        return a_lead + a_mid + a_trail


class F1BrakeCornerController:
    """Real-time physical state controller for the 2026 front brake corner."""

    def __init__(self, config: BrakeCornerConfig = None):
        self.cfg = config or BrakeCornerConfig()

        # Dynamic state
        self.pedal_force_kgf: float = 0.0
        self.line_pressure_bar: float = 0.0
        self.car_speed_kmh: float = 0.0
        self.disc_temperature_c: float = self.cfg.ambient_temp_deg_c
        self.piston_stroke_mm: float = 0.0
        self.seal_rollback_active: bool = True
        self.bbw_failsafe_active: bool = False
        self.is_powered: bool = True

    def calculate_friction_coeff(self, temp_c: float) -> float:
        """
        Authentic temperature-dependent friction coefficient mu(T) for
        Formula 1 PAN Carbon-Carbon friction pairs.
        - Cold (< 200°C): low bite (0.22 - 0.32)
        - Operating window (350°C - 750°C): high bite (0.50 - 0.54)
        - Severe thermal fade (> 1000°C): degradation down to 0.36
        """
        if temp_c < 200.0:
            return 0.22 + 0.10 * (temp_c / 200.0)
        elif temp_c <= 800.0:
            # Optimal plateau
            progress = (temp_c - 200.0) / 600.0
            return 0.32 + 0.20 * math.sin(progress * math.pi * 0.5)
        elif temp_c <= 1200.0:
            # High-temperature fade
            fade_progress = (temp_c - 800.0) / 400.0
            return 0.52 - 0.16 * fade_progress
        else:
            return 0.36

    def set_inputs(self, pedal_force_kgf: float, car_speed_kmh: float, power: bool = True):
        """Update driver inputs and vehicle speed."""
        self.pedal_force_kgf = max(0.0, min(180.0, pedal_force_kgf))
        self.car_speed_kmh = max(0.0, min(370.0, car_speed_kmh))
        self.is_powered = power

        # Hydraulic line pressure mapping
        # 180 kgf foot effort produces 180 bar line pressure at max pedal travel
        if self.is_powered:
            self.bbw_failsafe_active = False
            self.line_pressure_bar = (self.pedal_force_kgf / 180.0) * self.cfg.max_line_pressure_bar
        else:
            # Mechanical failsafe shuttle bypass engaged: 100% mechanical line pressure
            self.bbw_failsafe_active = True
            self.line_pressure_bar = (self.pedal_force_kgf / 180.0) * self.cfg.max_line_pressure_bar

        # Piston extension: 0.15 mm rollback take-up threshold
        if self.line_pressure_bar > 2.0:
            self.piston_stroke_mm = 0.15 + (self.line_pressure_bar / self.cfg.max_line_pressure_bar) * 0.85
            self.seal_rollback_active = False
        else:
            # Retracted by square seal elasticity
            self.piston_stroke_mm = 0.0
            self.seal_rollback_active = True

    def step(self, dt_seconds: float = 0.016):
        """Advance physical simulation by dt_seconds."""
        line_pa = self.line_pressure_bar * 1e5
        area_m2 = self.cfg.total_one_bank_piston_area_m2()

        # Clamping normal force (N)
        clamping_force_n = line_pa * area_m2 if self.line_pressure_bar > 2.0 else 0.0

        # Current friction coefficient
        mu = self.calculate_friction_coeff(self.disc_temperature_c)

        # Braking retarding torque: 2 friction faces
        braking_torque_nm = 2.0 * mu * clamping_force_n * self.cfg.effective_friction_radius_m

        # Wheel rotational velocity (rad/s)
        # 18-inch tyre radius ≈ 0.355 m
        tyre_radius_m = 0.355
        v_ms = (self.car_speed_kmh * 1000.0) / 3600.0
        omega_wheel = v_ms / tyre_radius_m if tyre_radius_m > 0 else 0.0

        # Thermal energy generation (Watts)
        heat_in_watts = braking_torque_nm * omega_wheel

        # Cooling: Stefan-Boltzmann radiation
        temp_k = self.disc_temperature_c + 273.15
        amb_k = self.cfg.ambient_temp_deg_c + 273.15

        disc_face_area_m2 = 2.0 * math.pi * (self.cfg.disc_outer_radius_m**2 - self.cfg.disc_inner_radius_m**2)
        q_rad = self.cfg.disc_emissivity * self.cfg.stefan_boltzmann_const * disc_face_area_m2 * (temp_k**4 - amb_k**4)

        # Cooling: Centrifugal forced convection through 1,400 holes
        # Air velocity through rotor scales with car speed + rotor rotation
        vent_air_speed = v_ms + (omega_wheel * self.cfg.effective_friction_radius_m * 0.5)
        # Convective heat transfer coefficient h (W/m^2*K)
        h_conv = 45.0 + 8.5 * (vent_air_speed ** 0.8)
        # Total internal surface area of 1400 drilled holes (Ø2.5mm x ~60mm depth)
        hole_area_m2 = 1400.0 * (math.pi * 0.0025 * 0.060)
        q_conv = h_conv * hole_area_m2 * (self.disc_temperature_c - self.cfg.ambient_temp_deg_c)

        # Net thermal rate
        net_watts = heat_in_watts - (q_rad + max(0.0, q_conv))

        # Temperature integration
        thermal_mass = self.cfg.disc_mass_kg * self.cfg.disc_specific_heat_j_per_kg_k
        delta_temp_c = (net_watts / thermal_mass) * dt_seconds

        self.disc_temperature_c = max(self.cfg.ambient_temp_deg_c, self.disc_temperature_c + delta_temp_c)

        # Decelerate car speed if braking
        if braking_torque_nm > 0.0 and self.car_speed_kmh > 0.0:
            # Quarter car mass ≈ 200 kg
            decel_ms2 = (braking_torque_nm / tyre_radius_m) / 200.0
            new_v_ms = max(0.0, v_ms - decel_ms2 * dt_seconds)
            self.car_speed_kmh = (new_v_ms * 3600.0) / 1000.0

    def get_telemetry(self) -> Dict[str, Any]:
        """Return full telemetry dictionary."""
        mu = self.calculate_friction_coeff(self.disc_temperature_c)
        line_pa = self.line_pressure_bar * 1e5
        clamping_force_n = line_pa * self.cfg.total_one_bank_piston_area_m2() if self.line_pressure_bar > 2.0 else 0.0
        braking_torque_nm = 2.0 * mu * clamping_force_n * self.cfg.effective_friction_radius_m

        # Dynamic blackbody glow color calculation (Hex RGB)
        glow_intensity = 0.0
        glow_hex = "#000000"
        if self.disc_temperature_c > 500.0:
            glow_intensity = min(1.0, (self.disc_temperature_c - 500.0) / 600.0)
            if self.disc_temperature_c < 750.0:
                glow_hex = "#ff2a00"  # Cherry red
            elif self.disc_temperature_c < 950.0:
                glow_hex = "#ff6a00"  # Bright orange
            else:
                glow_hex = "#ffc040"  # Incandescent yellow

        return {
            "is_powered": self.is_powered,
            "bbw_failsafe_active": self.bbw_failsafe_active,
            "pedal_force_kgf": round(self.pedal_force_kgf, 1),
            "line_pressure_bar": round(self.line_pressure_bar, 1),
            "car_speed_kmh": round(self.car_speed_kmh, 1),
            "disc_temperature_c": round(self.disc_temperature_c, 1),
            "friction_coeff_mu": round(mu, 3),
            "clamping_force_kn": round(clamping_force_n / 1000.0, 2),
            "braking_torque_nm": round(braking_torque_nm, 1),
            "piston_stroke_mm": round(self.piston_stroke_mm, 3),
            "seal_rollback_active": self.seal_rollback_active,
            "glow_intensity": round(glow_intensity, 3),
            "glow_hex": glow_hex,
        }
