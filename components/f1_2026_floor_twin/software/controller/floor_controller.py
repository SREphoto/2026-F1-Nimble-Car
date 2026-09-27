"""
floor_controller.py — Authoritative Pure Python Controller for 2026 F1 Floor & Diffuser.

Models:
- Partially flat floor ground effect downforce and drag.
- Anti-porpoising linearized downforce gradient (zero abrupt stall).
- Jabroc central skid plank wear accumulation with 2.0 mm FIA budget.
- Titanium skid puck ground contact detection and pyrotechnic spark telemetry.
- Dynamic ride height sensitivity (front: 30-40 mm, rear: 80-100 mm).
"""

from dataclasses import dataclass
import math
from typing import Dict, Any


@dataclass
class FloorConfig:
    floor_area_m2: float = 3.65               # Effective underfloor planform area
    air_density: float = 1.225
    nominal_front_rh_mm: float = 35.0         # Nominal front ride height
    nominal_rear_rh_mm: float = 85.0          # Nominal rear ride height
    plank_thickness_new_mm: float = 10.0      # New Jabroc plank thickness
    max_legal_wear_mm: float = 2.0            # Article C3.6 wear budget (min 8.0 mm)
    k_ge: float = 18.5                        # Ground effect scaling factor
    h_0: float = 12.0                         # Linearizing height offset (prevents stall)
    cl_base: float = 1.10                     # Base profile lift coefficient


class F1FloorController:
    """Real-time aerodynamic and mechanical controller for 2026 F1 floor."""

    def __init__(self, config: FloorConfig = None):
        self.cfg = config or FloorConfig()

        # Dynamic inputs
        self.speed_kmh: float = 250.0
        self.front_rh_mm: float = self.cfg.nominal_front_rh_mm
        self.rear_rh_mm: float = self.cfg.nominal_rear_rh_mm
        self.yaw_deg: float = 0.0

        # Physical state
        self.cl_floor: float = 0.0
        self.cd_floor: float = 0.0
        self.downforce_n: float = 0.0
        self.drag_n: float = 0.0
        self.downforce_share_pct: float = 42.5    # Percentage of total car downforce

        # Skid contact & wear
        self.skid_contact: bool = False
        self.spark_intensity: float = 0.0
        self.plank_wear_mm: float = 0.15
        self.plank_remaining_mm: float = 9.85
        self.plank_illegal: bool = False

    def set_inputs(self, speed_kmh: float = None, front_rh_mm: float = None, rear_rh_mm: float = None, yaw_deg: float = None):
        """Update driver and track dynamic inputs."""
        if speed_kmh is not None:
            self.speed_kmh = max(0.0, speed_kmh)
        if front_rh_mm is not None:
            self.front_rh_mm = max(-5.0, min(80.0, front_rh_mm))
        if rear_rh_mm is not None:
            self.rear_rh_mm = max(20.0, min(150.0, rear_rh_mm))
        if yaw_deg is not None:
            self.yaw_deg = max(-15.0, min(15.0, yaw_deg))

    def step(self, dt_seconds: float = 0.016):
        """Advance floor aerodynamics and plank wear physics."""
        # 1. Effective ground clearance (average underfloor clearance)
        eff_h = max(1.0, self.front_rh_mm)

        # 2. Linearized ground effect lift coefficient
        # In 2026 rules: C_L increases smoothly as h drops without sudden stall
        self.cl_floor = self.cfg.cl_base + (self.cfg.k_ge / (eff_h + self.cfg.h_0))

        # Yaw sensitivity: slight downforce reduction under high yaw
        yaw_penalty = 1.0 - (abs(self.yaw_deg) * 0.012)
        self.cl_floor *= max(0.85, yaw_penalty)

        # 3. Dynamic pressure & forces
        v_ms = self.speed_kmh / 3.6
        q = 0.5 * self.cfg.air_density * (v_ms ** 2)

        self.downforce_n = q * self.cfg.floor_area_m2 * self.cl_floor
        self.cd_floor = 0.12 + (0.015 * self.cl_floor)
        self.drag_n = q * self.cfg.floor_area_m2 * self.cd_floor

        # 4. Skid block road contact & spark generation
        if self.front_rh_mm <= 0.0:
            self.skid_contact = True
            bottoming_depth_mm = abs(self.front_rh_mm)
            self.spark_intensity = min(1.0, 0.3 + bottoming_depth_mm * 0.25)
            # Accumulate plank abrasive wear
            wear_rate = (self.speed_kmh / 360.0) * (bottoming_depth_mm + 0.5) * 0.04
            self.plank_wear_mm += wear_rate * dt_seconds
        else:
            self.skid_contact = False
            self.spark_intensity = 0.0

        self.plank_remaining_mm = max(0.0, self.cfg.plank_thickness_new_mm - self.plank_wear_mm)
        self.plank_illegal = self.plank_wear_mm > self.cfg.max_legal_wear_mm

    def reset_plank(self):
        """Reset plank to brand new 10.0 mm thickness."""
        self.plank_wear_mm = 0.0
        self.plank_remaining_mm = self.cfg.plank_thickness_new_mm
        self.plank_illegal = False

    def get_telemetry(self) -> Dict[str, Any]:
        """Return full floor telemetry package."""
        return {
            "speed_kmh": round(self.speed_kmh, 1),
            "front_rh_mm": round(self.front_rh_mm, 1),
            "rear_rh_mm": round(self.rear_rh_mm, 1),
            "cl_floor": round(self.cl_floor, 3),
            "downforce_n": round(self.downforce_n, 1),
            "drag_n": round(self.drag_n, 1),
            "downforce_share_pct": round(self.downforce_share_pct, 1),
            "skid_contact": self.skid_contact,
            "spark_intensity": round(self.spark_intensity, 2),
            "plank_wear_mm": round(self.plank_wear_mm, 3),
            "plank_remaining_mm": round(self.plank_remaining_mm, 2),
            "plank_illegal": self.plank_illegal,
        }
