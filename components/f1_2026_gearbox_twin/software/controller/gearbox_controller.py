"""
gearbox_controller.py — Pure Python Behavioral Controller for 2026 F1 Transmission & Rear Suspension
Conforms to FIA 2026 Technical Regulations (Articles C9, C10, C11, C13).
"""

import math
from typing import Dict, Any, Tuple


class F12026GearboxController:
    # 8 Forward Gear Ratios (Homologated fixed ratios)
    GEAR_RATIOS = {
        -1: -3.100,  # Reverse
        0: 0.000,   # Neutral
        1: 2.850,
        2: 2.150,
        3: 1.720,
        4: 1.410,
        5: 1.190,
        6: 1.030,
        7: 0.910,
        8: 0.815,
    }
    FINAL_DRIVE_RATIO = 5.400
    REAR_TYRE_RADIUS_M = 0.355  # Pirelli 18-inch 375/710-18 (diameter 710 mm)
    SEAMLESS_SHIFT_TIME_S = 0.0045  # 4.5 ms shift duration
    RIS_MIN_ABSORPTION_KJ = 50.0   # 50 kJ FIA crash test requirement

    def __init__(self):
        self.current_gear = 1
        self.target_gear = 1
        self.is_shifting = False
        self.shift_timer_s = 0.0
        
        # Differential Preload
        self.diff_mode = "EXIT"  # ENTRY, APEX, EXIT, MANUAL
        self.diff_lock_pct = 75.0  # 0% to 100%
        
        # Rear Suspension Kinematics
        self.wheel_bump_mm = 0.0  # -25 mm (rebound) to +35 mm (bump)
        self.wheel_rate_n_per_mm = 160.0  # 160 N/mm rear wheel rate
        self.pushrod_motion_ratio = 0.82  # Pushrod travel / wheel travel
        self.rocker_arm_length_mm = 65.0
        
        # Safety & Rain Light
        self.rain_mode_active = False
        self.mgu_k_harvesting = False
        self.rain_light_frequency_hz = 4.0

    def shift_up(self) -> bool:
        """Shift up to next forward gear seamlessly."""
        if self.current_gear < 8:
            self.target_gear = self.current_gear + 1
            self.is_shifting = True
            self.shift_timer_s = self.SEAMLESS_SHIFT_TIME_S
            return True
        return False

    def shift_down(self) -> bool:
        """Shift down to lower gear seamlessly."""
        if self.current_gear > 1:
            self.target_gear = self.current_gear - 1
            self.is_shifting = True
            self.shift_timer_s = self.SEAMLESS_SHIFT_TIME_S
            return True
        return False

    def select_gear(self, gear: int) -> bool:
        """Select specific gear (-1, 0, 1..8)."""
        if gear in self.GEAR_RATIOS:
            self.current_gear = gear
            self.target_gear = gear
            self.is_shifting = False
            return True
        return False

    def calculate_vehicle_speed_kmh(self, engine_rpm: float) -> float:
        """Calculate road speed in km/h based on current gear and engine RPM."""
        if self.current_gear == 0:
            return 0.0
        
        ratio = self.GEAR_RATIOS[self.current_gear]
        total_ratio = abs(ratio) * self.FINAL_DRIVE_RATIO
        wheel_rpm = engine_rpm / total_ratio
        wheel_circumference_m = 2.0 * math.pi * self.REAR_TYRE_RADIUS_M
        speed_m_per_s = (wheel_rpm * wheel_circumference_m) / 60.0
        return speed_m_per_s * 3.6

    def set_differential_mode(self, mode: str, custom_pct: float = None):
        """Configure active differential locking percentage."""
        mode_upper = mode.upper()
        if mode_upper == "ENTRY":
            self.diff_mode = "ENTRY"
            self.diff_lock_pct = 65.0
        elif mode_upper == "APEX":
            self.diff_mode = "APEX"
            self.diff_lock_pct = 25.0
        elif mode_upper == "EXIT":
            self.diff_mode = "EXIT"
            self.diff_lock_pct = 85.0
        elif mode_upper == "MANUAL" and custom_pct is not None:
            self.diff_mode = "MANUAL"
            self.diff_lock_pct = max(0.0, min(100.0, custom_pct))

    def calculate_diff_lock_torque(self, input_torque_nm: float) -> float:
        """Calculate dynamic locking torque transfer across differential."""
        return abs(input_torque_nm) * (self.diff_lock_pct / 100.0)

    def set_suspension_bump(self, bump_mm: float):
        """Set rear wheel vertical travel in mm (-25 to +35 mm)."""
        self.wheel_bump_mm = max(-25.0, min(35.0, bump_mm))

    def calculate_suspension_kinematics(self) -> Dict[str, float]:
        """Compute pushrod load, travel, and bellcrank rocker angular deflection."""
        pushrod_displacement_mm = self.wheel_bump_mm * self.pushrod_motion_ratio
        wheel_load_n = self.wheel_bump_mm * self.wheel_rate_n_per_mm
        pushrod_load_n = wheel_load_n / self.pushrod_motion_ratio
        rocker_angle_rad = pushrod_displacement_mm / self.rocker_arm_length_mm
        rocker_angle_deg = math.degrees(rocker_angle_rad)
        
        return {
            "wheel_bump_mm": self.wheel_bump_mm,
            "pushrod_displacement_mm": pushrod_displacement_mm,
            "pushrod_load_n": pushrod_load_n,
            "rocker_angle_deg": rocker_angle_deg,
        }

    def verify_rear_impact_structure(self, sled_mass_kg: float, velocity_m_s: float) -> Dict[str, Any]:
        """Verify Rear Impact Structure (RIS) kinetic energy absorption compliance."""
        kinetic_energy_j = 0.5 * sled_mass_kg * (velocity_m_s ** 2)
        kinetic_energy_kj = kinetic_energy_j / 1000.0
        passed = kinetic_energy_kj >= self.RIS_MIN_ABSORPTION_KJ
        
        # Estimate average deceleration over 700 mm crush stroke
        crush_distance_m = 0.68
        avg_accel_m_s2 = (velocity_m_s ** 2) / (2.0 * crush_distance_m)
        avg_accel_g = avg_accel_m_s2 / 9.80665
        
        return {
            "kinetic_energy_kj": kinetic_energy_kj,
            "required_kj": self.RIS_MIN_ABSORPTION_KJ,
            "compliant": passed,
            "avg_deceleration_g": avg_accel_g,
        }

    def update_tick(self, dt: float):
        """Advance controller state by dt seconds."""
        if self.is_shifting:
            self.shift_timer_s -= dt
            if self.shift_timer_s <= 0.0:
                self.current_gear = self.target_gear
                self.is_shifting = False
                self.shift_timer_s = 0.0

    def get_telemetry(self, engine_rpm: float = 10500.0, input_torque_nm: float = 600.0) -> Dict[str, Any]:
        """Return comprehensive transmission and rear suspension telemetry."""
        speed_kmh = self.calculate_vehicle_speed_kmh(engine_rpm)
        lock_torque = self.calculate_diff_lock_torque(input_torque_nm)
        susp = self.calculate_suspension_kinematics()
        
        rain_light_active = self.rain_mode_active or self.mgu_k_harvesting
        
        return {
            "gear": self.current_gear,
            "target_gear": self.target_gear,
            "is_shifting": self.is_shifting,
            "ratio": self.GEAR_RATIOS[self.current_gear],
            "vehicle_speed_kmh": speed_kmh,
            "diff_mode": self.diff_mode,
            "diff_lock_pct": self.diff_lock_pct,
            "diff_lock_torque_nm": lock_torque,
            "suspension": susp,
            "rain_light_active": rain_light_active,
            "rain_light_frequency_hz": self.rain_light_frequency_hz,
        }
