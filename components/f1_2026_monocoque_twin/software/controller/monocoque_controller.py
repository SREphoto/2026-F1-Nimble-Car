"""
monocoque_controller.py — Authoritative Pure Python Controller for 2026 F1 Survival Cell.

Models:
- 1:1 Monocoque chassis torsional stiffness (44,500 Nm/degree).
- 172 kN primary roll hoop structural proof load verification (Article C13.3).
- 125 kN Grade 5 Titanium Halo multi-axis proof loads (FIA 8869-2018).
- Cockpit pedal box slider kinematics (0 - 150 mm fore-aft travel).
- High-Voltage 800V marshalling safety status LED logic (Green = Safe, Red = Fault).
"""

from dataclasses import dataclass
import math
from typing import Dict, Any


@dataclass
class MonocoqueConfig:
    wheelbase_m: float = 3.400          # 3,400 mm
    tub_length_m: float = 2.200         # 2,200 mm (Bulkhead A-A to B-B)
    tub_mass_kg: float = 44.50          # Bare carbon sandwich tub
    torsional_stiffness_nm_per_deg: float = 44500.0  # 44.5 kN*m / deg

    # FIA Proof Loads (N)
    roll_hoop_proof_load_n: float = 172000.0   # 172 kN (Article C13)
    halo_forward_proof_n: float = 125000.0     # 125 kN
    halo_lateral_proof_n: float = 125000.0     # 125 kN
    halo_vertical_proof_n: float = 116000.0    # 116 kN
    sips_energy_absorption_j: float = 40000.0  # 40 kJ


class F1MonocoqueController:
    """Real-time physical and safety state engine for 2026 F1 survival cell."""

    def __init__(self, config: MonocoqueConfig = None):
        self.cfg = config or MonocoqueConfig()

        # Dynamic chassis state
        self.lateral_accel_g: float = 0.0
        self.roll_moment_nm: float = 0.0
        self.torsional_twist_deg: float = 0.0
        self.pedal_sled_pos_mm: float = 75.0  # Centered in 0 - 150 mm range
        self.brake_pedal_effort_kgf: float = 0.0
        self.throttle_pedal_pct: float = 0.0

        # Safety & Marshal Systems
        self.halo_structural_integrity: float = 1.0  # 1.0 = 100% nominal
        self.roll_hoop_deflection_mm: float = 0.0
        self.fire_extinguisher_armed: bool = True
        self.hv_isolation_safe: bool = True
        self.driver_extraction_straps_secured: bool = True

    def set_inputs(self, lateral_g: float, pedal_sled_mm: float, brake_kgf: float, throttle_pct: float):
        """Update chassis dynamic load and cockpit control inputs."""
        self.lateral_accel_g = max(-6.0, min(6.0, lateral_g))
        self.pedal_sled_pos_mm = max(0.0, min(150.0, pedal_sled_mm))
        self.brake_pedal_effort_kgf = max(0.0, min(180.0, brake_kgf))
        self.throttle_pedal_pct = max(0.0, min(100.0, throttle_pct))

    def calculate_chassis_twist(self, roll_moment_nm: float) -> float:
        """
        Calculate angular chassis deflection between front and rear axle planes:
        theta (degrees) = T_roll / K_torsion
        """
        return roll_moment_nm / self.cfg.torsional_stiffness_nm_per_deg

    def simulate_roll_hoop_proof_test(self, applied_load_n: float) -> Dict[str, Any]:
        """
        Evaluate roll hoop deflection under FIA Article C13.3 static proof loading.
        Permanent deformation must remain strictly < 25.0 mm at 172 kN.
        """
        # Effective arch stiffness k ≈ 9.2 kN/mm
        arch_stiffness_n_per_mm = 9200.0
        deflection_mm = applied_load_n / arch_stiffness_n_per_mm
        passed = (applied_load_n >= self.cfg.roll_hoop_proof_load_n) and (deflection_mm < 25.0)

        return {
            "applied_load_kn": round(applied_load_n / 1000.0, 1),
            "deflection_mm": round(deflection_mm, 2),
            "max_allowed_deflection_mm": 25.0,
            "passed_fia_c13": passed,
        }

    def step(self, dt_seconds: float = 0.016):
        """Advance physical simulation step."""
        # Roll moment from cornering lateral g (car mass ~768 kg, CG height ~0.28 m)
        car_mass_kg = 768.0
        cg_height_m = 0.28
        self.roll_moment_nm = abs(self.lateral_accel_g) * 9.81 * car_mass_kg * cg_height_m
        self.torsional_twist_deg = self.calculate_chassis_twist(self.roll_moment_nm)

    def trigger_hv_fault(self):
        """Simulate high-voltage 800V DC isolation fault (pyrofuse trigger)."""
        self.hv_isolation_safe = False

    def reset_hv_fault(self):
        """Reset high-voltage safety isolation."""
        self.hv_isolation_safe = True

    def get_telemetry(self) -> Dict[str, Any]:
        """Return full survival cell telemetry status."""
        # Marshal Status LED: Green = Safe, Red = 800V Hazard / Unsafe
        marshal_led_color = "GREEN" if self.hv_isolation_safe else "RED"

        return {
            "lateral_accel_g": round(self.lateral_accel_g, 2),
            "roll_moment_nm": round(self.roll_moment_nm, 1),
            "torsional_twist_deg": round(self.torsional_twist_deg, 4),
            "chassis_stiffness_knm_deg": round(self.cfg.torsional_stiffness_nm_per_deg / 1000.0, 1),
            "pedal_sled_pos_mm": round(self.pedal_sled_pos_mm, 1),
            "brake_pedal_effort_kgf": round(self.brake_pedal_effort_kgf, 1),
            "throttle_pedal_pct": round(self.throttle_pedal_pct, 1),
            "halo_integrity_pct": round(self.halo_structural_integrity * 100.0, 1),
            "hv_isolation_safe": self.hv_isolation_safe,
            "marshal_led_color": marshal_led_color,
            "fire_extinguisher_armed": self.fire_extinguisher_armed,
            "driver_extraction_straps_secured": self.driver_extraction_straps_secured,
        }
