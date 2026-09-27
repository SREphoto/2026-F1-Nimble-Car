"""
rear_wing_controller.py — Pure Python Behavioral Controller for 2026 F1 Active Rear Wing
Conforms to FIA 2026 Technical Regulations (Articles C3.10 & C3.11).
"""

import math
from typing import Dict, Any


class F12026RearWingController:
    # Aerodynamic Constants
    AIR_DENSITY_KG_M3 = 1.225
    REF_AREA_M2 = 0.441  # 1.05m span x 0.42m projected chord
    
    # Mode Definitions
    Z_MODE_AOA_DEG = 26.0
    Z_MODE_CL = 2.15
    Z_MODE_CD = 0.68

    X_MODE_AOA_DEG = 3.0
    X_MODE_CL = 0.72
    X_MODE_CD = 0.28

    TRANSITION_TIME_S = 0.180      # 180 ms normal actuation
    FAILSAFE_CLOSE_TIME_S = 0.140  # 140 ms emergency spring snap-shut
    BRAKE_INTERLOCK_THRESHOLD_G = 1.8  # Article C3.11 braking safety trigger

    def __init__(self):
        self.mode = "Z_MODE"          # Z_MODE (High Downforce) or X_MODE (Low Drag)
        self.target_mode = "Z_MODE"
        self.current_aoa_deg = self.Z_MODE_AOA_DEG
        self.target_aoa_deg = self.Z_MODE_AOA_DEG
        
        self.hydraulic_pressure_bar = 180.0
        self.failsafe_tripped = False
        self.vehicle_speed_kmh = 250.0
        self.deceleration_g = 0.0

    def set_mode(self, new_mode: str) -> bool:
        """Command transition to Z_MODE or X_MODE."""
        mode_upper = new_mode.upper()
        if mode_upper not in ["Z_MODE", "X_MODE"]:
            return False

        # Safety Interlock: cannot open to X-Mode under heavy braking or failsafe
        if mode_upper == "X_MODE":
            if self.deceleration_g >= self.BRAKE_INTERLOCK_THRESHOLD_G:
                return False
            if self.failsafe_tripped or self.hydraulic_pressure_bar < 120.0:
                return False

        self.target_mode = mode_upper
        self.target_aoa_deg = self.X_MODE_AOA_DEG if mode_upper == "X_MODE" else self.Z_MODE_AOA_DEG
        return True

    def set_vehicle_telemetry(self, speed_kmh: float, decel_g: float = 0.0):
        """Update road speed and braking deceleration."""
        self.vehicle_speed_kmh = max(0.0, speed_kmh)
        self.deceleration_g = max(0.0, decel_g)

        # Automatic cross-system braking safety trigger
        if self.deceleration_g >= self.BRAKE_INTERLOCK_THRESHOLD_G and self.target_mode == "X_MODE":
            self.set_mode("Z_MODE")

    def trip_hydraulic_failsafe(self):
        """Simulate hydraulic line pressure drop triggering mechanical return springs."""
        self.hydraulic_pressure_bar = 0.0
        self.failsafe_tripped = True
        self.target_mode = "Z_MODE"
        self.target_aoa_deg = self.Z_MODE_AOA_DEG

    def reset_failsafe(self):
        """Restore hydraulic pressure."""
        self.hydraulic_pressure_bar = 180.0
        self.failsafe_tripped = False

    def update_tick(self, dt: float):
        """Advance flap kinematic slew by dt seconds."""
        if math.isclose(self.current_aoa_deg, self.target_aoa_deg, abs_tol=0.01):
            self.current_aoa_deg = self.target_aoa_deg
            self.mode = self.target_mode
            return

        total_time = self.FAILSAFE_CLOSE_TIME_S if self.failsafe_tripped else self.TRANSITION_TIME_S
        delta_aoa_total = abs(self.Z_MODE_AOA_DEG - self.X_MODE_AOA_DEG)
        slew_rate_deg_per_s = delta_aoa_total / total_time

        if self.current_aoa_deg < self.target_aoa_deg:
            self.current_aoa_deg = min(self.target_aoa_deg, self.current_aoa_deg + slew_rate_deg_per_s * dt)
        else:
            self.current_aoa_deg = max(self.target_aoa_deg, self.current_aoa_deg - slew_rate_deg_per_s * dt)

        if math.isclose(self.current_aoa_deg, self.target_aoa_deg, abs_tol=0.05):
            self.mode = self.target_mode

    def calculate_aerodynamics(self) -> Dict[str, float]:
        """Compute instantaneous lift, drag, and downforce in Newtons."""
        # Interpolate CL and CD based on current AoA
        fraction = (self.current_aoa_deg - self.X_MODE_AOA_DEG) / (self.Z_MODE_AOA_DEG - self.X_MODE_AOA_DEG)
        fraction = max(0.0, min(1.0, fraction))
        
        cl = self.X_MODE_CL + fraction * (self.Z_MODE_CL - self.X_MODE_CL)
        cd = self.X_MODE_CD + fraction * (self.Z_MODE_CD - self.X_MODE_CD)

        speed_m_s = self.vehicle_speed_kmh / 3.6
        dynamic_pressure_pa = 0.5 * self.AIR_DENSITY_KG_M3 * (speed_m_s ** 2)

        downforce_n = cl * dynamic_pressure_pa * self.REF_AREA_M2
        drag_n = cd * dynamic_pressure_pa * self.REF_AREA_M2

        return {
            "current_aoa_deg": self.current_aoa_deg,
            "cl": cl,
            "cd": cd,
            "downforce_n": downforce_n,
            "drag_n": drag_n,
            "dynamic_pressure_pa": dynamic_pressure_pa,
        }

    def get_telemetry(self) -> Dict[str, Any]:
        """Return comprehensive active rear wing telemetry."""
        aero = self.calculate_aerodynamics()
        return {
            "mode": self.mode,
            "target_mode": self.target_mode,
            "hydraulic_pressure_bar": self.hydraulic_pressure_bar,
            "failsafe_tripped": self.failsafe_tripped,
            "vehicle_speed_kmh": self.vehicle_speed_kmh,
            "deceleration_g": self.deceleration_g,
            "aero": aero,
        }
