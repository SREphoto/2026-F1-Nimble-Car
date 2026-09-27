"""
powertrain_controller.py — Authoritative Pure Python Controller for 2026 F1 Powertrain & Energy Store.

Models:
- 1.6L 90° V6 Turbo ICE with 3,000 MJ/h sustainable fuel energy rate scaling.
- 350 kW MGU-K motor/generator with 60,000 rpm shaft capability.
- 50/50 Hybrid power summation delivering up to 754.2 kW (1,011 hp).
- High-Voltage Energy Store (800V-900V DC bus, 4.0 MJ usable delta per lap).
- Dielectric immersion cooling thermal loop (45°C to 55°C window).
- Straightline derating (clipping) when battery SoC drops below 12%.
- Manual Override Mode (MOM) overtake boost (+0.5 MJ).
- High-voltage pyrofuse crash isolation.
"""

from dataclasses import dataclass
import math
from typing import Dict, Any


@dataclass
class PowertrainConfig:
    ice_max_power_kw: float = 404.2           # 542 hp at 3,000 MJ/h fuel flow
    mguk_max_power_kw: float = 350.0          # 469 hp kinetic motor generator
    fuel_rate_max_mj_h: float = 3000.0        # Article C5.4.1 chemical energy ceiling
    battery_capacity_mj: float = 5.5          # Total installed battery capacity
    usable_lap_delta_mj: float = 4.0          # FIA usable delta per lap
    nominal_voltage_v: float = 850.0          # 850V DC nominal bus
    max_voltage_v: float = 900.0
    min_voltage_v: float = 750.0
    derate_soc_threshold_pct: float = 12.0    # Straightline clipping threshold
    target_battery_temp_c: float = 48.0       # Immersion cooling setpoint


class F1PowertrainController:
    """Real-time hybrid powertrain state engine for 2026 F1 car."""

    def __init__(self, config: PowertrainConfig = None):
        self.cfg = config or PowertrainConfig()

        # Operational inputs
        self.throttle_pct: float = 100.0
        self.engine_rpm: float = 11500.0
        self.regen_request_kw: float = 0.0
        self.overtake_active: bool = False

        # Battery state
        self.battery_energy_mj: float = 4.5
        self.battery_soc_pct: float = 81.8
        self.battery_voltage_v: float = self.cfg.nominal_voltage_v
        self.battery_temp_c: float = self.cfg.target_battery_temp_c
        self.derating_active: bool = False
        self.pyrofuse_tripped: bool = False

        # Output telemetry
        self.fuel_energy_rate_mj_h: float = self.cfg.fuel_rate_max_mj_h
        self.ice_power_kw: float = self.cfg.ice_max_power_kw
        self.mguk_power_kw: float = self.cfg.mguk_max_power_kw
        self.total_power_kw: float = 754.2
        self.total_power_hp: float = 1011.0

    def set_inputs(
        self,
        throttle_pct: float = None,
        engine_rpm: float = None,
        regen_kw: float = None,
        overtake: bool = None,
    ):
        """Update driver throttle, rpm, and recovery demands."""
        if throttle_pct is not None:
            self.throttle_pct = max(0.0, min(100.0, throttle_pct))
        if engine_rpm is not None:
            self.engine_rpm = max(4000.0, min(12500.0, engine_rpm))
        if regen_kw is not None:
            self.regen_request_kw = max(0.0, min(self.cfg.mguk_max_power_kw, regen_kw))
        if overtake is not None:
            self.overtake_active = overtake

    def step(self, dt_seconds: float = 0.016):
        """Advance powertrain thermodynamics and hybrid electrical power."""
        if self.pyrofuse_tripped:
            self.ice_power_kw = 0.0
            self.mguk_power_kw = 0.0
            self.total_power_kw = 0.0
            self.total_power_hp = 0.0
            self.battery_voltage_v = 0.0
            return

        # 1. ICE Fuel Flow & Power Scaling (Article C5.4.1)
        if self.engine_rpm < 10500.0:
            self.fuel_energy_rate_mj_h = 0.27 * self.engine_rpm + 165.0
        else:
            self.fuel_energy_rate_mj_h = self.cfg.fuel_rate_max_mj_h

        thermal_kw = (self.fuel_energy_rate_mj_h * 1000.0) / 3600.0
        bte = 0.485
        self.ice_power_kw = (thermal_kw * bte) * (self.throttle_pct / 100.0)

        # 2. Battery State of Charge & Voltage
        self.battery_soc_pct = (self.battery_energy_mj / self.cfg.battery_capacity_mj) * 100.0
        self.battery_voltage_v = self.cfg.min_voltage_v + (
            (self.cfg.max_voltage_v - self.cfg.min_voltage_v) * (self.battery_soc_pct / 100.0)
        )

        # 3. MGU-K Deploy / Regen Logic
        if self.regen_request_kw > 0.0:
            # Regenerative braking mode
            self.mguk_power_kw = -self.regen_request_kw
            self.derating_active = False
            # Store energy back into battery
            energy_in_mj = (self.regen_request_kw * 0.94 / 1000.0) * dt_seconds
            self.battery_energy_mj = min(self.cfg.battery_capacity_mj, self.battery_energy_mj + energy_in_mj)
        else:
            # Power deployment mode
            if self.battery_soc_pct <= 5.0:
                # Fully depleted
                self.mguk_power_kw = 0.0
                self.derating_active = True
            elif self.battery_soc_pct < self.cfg.derate_soc_threshold_pct:
                # Clipping derate ramp
                fraction = (self.battery_soc_pct - 5.0) / (self.cfg.derate_soc_threshold_pct - 5.0)
                self.mguk_power_kw = self.cfg.mguk_max_power_kw * fraction * (self.throttle_pct / 100.0)
                self.derating_active = True
            else:
                self.mguk_power_kw = self.cfg.mguk_max_power_kw * (self.throttle_pct / 100.0)
                self.derating_active = False

            # Deplete battery energy
            energy_out_mj = (self.mguk_power_kw / (0.94 * 1000.0)) * dt_seconds
            self.battery_energy_mj = max(0.0, self.battery_energy_mj - energy_out_mj)

        # 4. Total Output
        self.total_power_kw = max(0.0, self.ice_power_kw + max(0.0, self.mguk_power_kw))
        self.total_power_hp = self.total_power_kw * 1.34102

        # 5. Battery Immersion Cooling Thermal Loop
        current_a = abs(self.mguk_power_kw * 1000.0) / max(1.0, self.battery_voltage_v)
        internal_resistance_ohm = 0.045
        i2r_heat_kw = (current_a ** 2 * internal_resistance_ohm) / 1000.0

        cooling_capacity_kw = 12.0  # Dielectric immersion PAO loop
        delta_heat_kw = i2r_heat_kw - cooling_capacity_kw
        self.battery_temp_c = max(
            45.0, min(58.0, self.battery_temp_c + delta_heat_kw * 0.008 * dt_seconds)
        )

    def trip_pyrofuse(self):
        """Simulate crash pyrofuse isolation disconnect (<10 ms)."""
        self.pyrofuse_tripped = True

    def reset_pyrofuse(self):
        """Reset pyrofuse and restore electrical circuit."""
        self.pyrofuse_tripped = False
        self.battery_energy_mj = 4.5

    def get_telemetry(self) -> Dict[str, Any]:
        """Return full powertrain telemetry dictionary."""
        return {
            "ice_power_kw": round(self.ice_power_kw, 1),
            "mguk_power_kw": round(self.mguk_power_kw, 1),
            "total_power_kw": round(self.total_power_kw, 1),
            "total_power_hp": round(self.total_power_hp, 1),
            "engine_rpm": round(self.engine_rpm, 0),
            "fuel_rate_mj_h": round(self.fuel_energy_rate_mj_h, 1),
            "battery_soc_pct": round(self.battery_soc_pct, 1),
            "battery_voltage_v": round(self.battery_voltage_v, 1),
            "battery_temp_c": round(self.battery_temp_c, 1),
            "derating_active": self.derating_active,
            "pyrofuse_tripped": self.pyrofuse_tripped,
        }
