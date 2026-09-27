"""
2026 Formula 1 "Nimble Car" Controller
SREdesigns - Samuel R Erwin III

Vehicle Dynamics & Powertrain Controller for 2026 Formula 1 Technical Regulations:
1. 1.6L 90° V6 ICE & Fuel Energy Flow:
   - Fuel energy flow limit EF = 0.27 * N + 165 MJ/h (N <= 10,500 rpm), capped at 3000 MJ/h (Article C5.4.1)
   - Max ICE mechanical power: 400 kW (~535 hp)
2. 350 kW MGU-K & 800V Energy Store:
   - 350 kW peak electrical power (regeneration & deployment)
   - 4.0 MJ usable battery capacity per lap, SoC monitoring (0.0 to 1.0)
   - Immersion cooling temperature limits (45°C - 55°C)
3. 8-Speed Seamless-Shift Transmission:
   - Fixed season ratios (Gears 1 to 8 + Reverse + Neutral)
   - Shift time < 0.005s with seamless dog ring engagement and torque cut/fill
4. Active Aerodynamics State Machine:
   - Z-Mode (Cornering / High Downforce): Front flaps +22°, Rear flap +26°
   - X-Mode (Straight Line / Low Drag): Front flaps +4°, Rear flap +3°
   - Safety Interlocks: Lateral acceleration > 1.2g or Brake pressure > 10 bar forces immediate Z-Mode
5. Brake-by-Wire (BBW) System:
   - Driver pedal force (up to 180 kgf load cell effort)
   - Dynamic torque blending: MGU-K regenerative retarding torque (up to 450 Nm) + friction disc pressure
"""

import math
from typing import Dict, Any, Tuple


class F12026CarController:
    # 2026 Vehicle & PU Constants
    MAX_FUEL_ENERGY_FLOW_MJ_H = 3000.0  # Article C5.4.1
    MAX_ICE_POWER_KW = 400.0            # ~535 hp
    MAX_MGUK_POWER_KW = 350.0           # 350 kW electric motor
    MAX_BATTERY_CAPACITY_MJ = 4.0       # 4.0 MJ usable per lap
    MAX_ENGINE_RPM = 12000.0            # 12,000 rpm limiter
    NOMINAL_HV_BUS_VOLTS = 800.0        # 800V DC
    MIN_WEIGHT_KG = 768.0               # Nimble Car regulation target

    # Fixed 8-Speed Gear Ratios
    GEAR_RATIOS = {
        'R': -3.20,
        'N': 0.0,
        1: 2.85,
        2: 2.25,
        3: 1.82,
        4: 1.52,
        5: 1.30,
        6: 1.14,
        7: 1.02,
        8: 0.92
    }
    FINAL_DRIVE_RATIO = 3.65

    def __init__(self):
        # Powertrain State
        self.engine_on = False
        self.engine_rpm = 0.0
        self.throttle_input = 0.0     # 0.0 to 1.0
        self.ice_power_kw = 0.0
        self.fuel_energy_rate_mj_h = 0.0

        # High-Voltage Electrical State
        self.battery_soc = 0.85        # 85% initial state of charge
        self.battery_temp_c = 48.0     # Nominal 48°C
        self.mguk_mode = 'IDLE'        # 'IDLE', 'DEPLOY', 'HARVEST'
        self.mguk_power_kw = 0.0
        self.hv_bus_voltage = self.NOMINAL_HV_BUS_VOLTS
        self.hv_circuit_closed = True  # Pyrofuse continuity

        # Transmission State
        self.current_gear = 'N'
        self.is_shifting = False
        self.shift_timer_s = 0.0
        self.clutch_disengaged = False

        # Chassis & Dynamics State
        self.vehicle_speed_kmh = 0.0
        self.steering_angle_rad = 0.0
        self.lateral_g = 0.0
        self.brake_pedal_kgf = 0.0    # 0 to 180 kgf
        self.brake_line_pressure_bar = 0.0
        self.front_brake_pct = 0.56   # 56% front mechanical bias

        # Active Aerodynamics State Machine
        self.aero_mode = 'Z_MODE'     # 'Z_MODE' or 'X_MODE'
        self.front_flap_deg = 22.0
        self.rear_flap_deg = 26.0
        self.aero_interlock_active = False

    def start_engine(self) -> bool:
        """Attempt to start ICE via MGU-K starter torque if HV bus is live."""
        if not self.hv_circuit_closed or self.battery_soc < 0.05:
            self.engine_on = False
            return False
        self.engine_on = True
        self.engine_rpm = 4000.0  # Idle speed ~4,000 rpm
        return True

    def stop_engine(self):
        """Emergency or normal engine shutdown."""
        self.engine_on = False
        self.engine_rpm = 0.0
        self.ice_power_kw = 0.0
        self.mguk_power_kw = 0.0
        self.fuel_energy_rate_mj_h = 0.0

    def trigger_pyrofuse_disconnect(self):
        """Safety pyrofuse blows in crash; isolates 800V circuit immediately."""
        self.hv_circuit_closed = False
        self.mguk_power_kw = 0.0
        self.mguk_mode = 'IDLE'
        self.hv_bus_voltage = 0.0
        self.stop_engine()

    def calculate_fuel_energy_flow(self, rpm: float) -> float:
        """FIA Article C5.4.1 fuel energy flow rate formula."""
        if rpm <= 0:
            return 0.0
        if rpm <= 10500.0:
            ef = 0.27 * rpm + 165.0
        else:
            ef = self.MAX_FUEL_ENERGY_FLOW_MJ_H
        return min(ef, self.MAX_FUEL_ENERGY_FLOW_MJ_H)

    def set_active_aero_mode(self, requested_mode: str) -> str:
        """
        Active Aerodynamics state machine.
        Enforces safety interlocks:
        - Must be in Z-Mode if braking (pedal > 10 kgf)
        - Must be in Z-Mode if lateral acceleration > 1.2g
        - Must be in Z-Mode if speed < 120 km/h
        """
        if requested_mode == 'X_MODE':
            if self.brake_pedal_kgf > 10.0 or abs(self.lateral_g) > 1.2 or self.vehicle_speed_kmh < 120.0:
                self.aero_mode = 'Z_MODE'
                self.aero_interlock_active = True
            else:
                self.aero_mode = 'X_MODE'
                self.aero_interlock_active = False
        else:
            self.aero_mode = 'Z_MODE'
            self.aero_interlock_active = False

        if self.aero_mode == 'Z_MODE':
            self.front_flap_deg = 22.0
            self.rear_flap_deg = 26.0
        else:
            self.front_flap_deg = 4.0
            self.rear_flap_deg = 3.0

        return self.aero_mode

    def shift_gear(self, target_gear) -> bool:
        """Perform seamless sequential gear change."""
        if target_gear not in self.GEAR_RATIOS:
            return False
        if self.is_shifting:
            return False

        # In seamless gearbox, shift completes in < 0.005 seconds
        self.is_shifting = True
        self.shift_timer_s = 0.004
        self.current_gear = target_gear
        self.is_shifting = False
        return True

    def calculate_bbw_split(self, pedal_kgf: float) -> Tuple[float, float, float]:
        """
        Brake-by-Wire torque blending:
        Returns: (front_friction_torque_nm, rear_friction_torque_nm, rear_mguk_regen_torque_nm)
        """
        pedal_clamped = max(0.0, min(180.0, pedal_kgf))
        self.brake_pedal_kgf = pedal_clamped
        # Max line pressure: 100 bar at 180 kgf
        self.brake_line_pressure_bar = (pedal_clamped / 180.0) * 100.0

        total_brake_torque_demand = pedal_clamped * 18.0  # up to 3240 Nm total car retarding torque

        # Front friction gets baseline bias (56%)
        front_torque = total_brake_torque_demand * self.front_brake_pct
        rear_torque_demand = total_brake_torque_demand * (1.0 - self.front_brake_pct)

        # MGU-K regen handles up to 450 Nm of rear retarding torque (if battery can accept charge)
        if self.hv_circuit_closed and self.battery_soc < 0.98 and self.vehicle_speed_kmh > 20.0:
            rear_regen_torque = min(450.0, rear_torque_demand)
            rear_friction_torque = max(0.0, rear_torque_demand - rear_regen_torque)
            self.mguk_mode = 'HARVEST'
            self.mguk_power_kw = (rear_regen_torque * (self.vehicle_speed_kmh / 3.6) / 0.355) / 1000.0
            self.mguk_power_kw = min(self.MAX_MGUK_POWER_KW, self.mguk_power_kw)
        else:
            rear_regen_torque = 0.0
            rear_friction_torque = rear_torque_demand
            if self.throttle_input <= 0.05:
                self.mguk_mode = 'IDLE'
                self.mguk_power_kw = 0.0

        return front_torque, rear_friction_torque, rear_regen_torque

    def update(self, dt: float, throttle: float, brake_kgf: float, steer_rad: float, lat_g: float = 0.0) -> Dict[str, Any]:
        """Simulation tick update."""
        self.throttle_input = max(0.0, min(1.0, throttle))
        self.steering_angle_rad = steer_rad
        self.lateral_g = lat_g

        # Brake-by-Wire blending
        front_tq, rear_fric_tq, rear_regen_tq = self.calculate_bbw_split(brake_kgf)

        # Enforce active aero safety locks
        self.set_active_aero_mode(self.aero_mode)

        # Powertrain calculations
        if self.engine_on:
            self.fuel_energy_rate_mj_h = self.calculate_fuel_energy_flow(self.engine_rpm)
            self.ice_power_kw = (self.fuel_energy_rate_mj_h / self.MAX_FUEL_ENERGY_FLOW_MJ_H) * self.MAX_ICE_POWER_KW * self.throttle_input

            # MGU-K deployment under throttle (if battery has juice)
            if self.throttle_input > 0.05 and self.hv_circuit_closed and self.battery_soc > 0.05 and self.brake_pedal_kgf < 5.0:
                self.mguk_mode = 'DEPLOY'
                self.mguk_power_kw = self.MAX_MGUK_POWER_KW * self.throttle_input
                # Deplete battery SoC
                consumed_mj = (self.mguk_power_kw / 1000.0) * dt
                self.battery_soc = max(0.0, self.battery_soc - (consumed_mj / self.MAX_BATTERY_CAPACITY_MJ))
            elif rear_regen_tq > 0:
                # Harvest battery SoC
                harvested_mj = (self.mguk_power_kw / 1000.0) * dt * 0.92  # 92% roundtrip efficiency
                self.battery_soc = min(1.0, self.battery_soc + (harvested_mj / self.MAX_BATTERY_CAPACITY_MJ))
            else:
                self.mguk_mode = 'IDLE'
                self.mguk_power_kw = 0.0

            # Dynamic speed and RPM response
            total_propulsion_kw = self.ice_power_kw + (self.mguk_power_kw if self.mguk_mode == 'DEPLOY' else 0.0)
            if isinstance(self.current_gear, int) and self.current_gear > 0:
                gear_ratio = self.GEAR_RATIOS[self.current_gear]
                # Acceleration proportional to power minus drag and braking
                aero_drag_factor = 0.00085 if self.aero_mode == 'Z_MODE' else 0.00038
                net_power_kw = total_propulsion_kw - (front_tq + rear_fric_tq + rear_regen_tq) * 0.05
                accel = (net_power_kw * 1000.0) / (self.MIN_WEIGHT_KG * max(10.0, self.vehicle_speed_kmh / 3.6)) - aero_drag_factor * (self.vehicle_speed_kmh ** 2)
                self.vehicle_speed_kmh = max(0.0, self.vehicle_speed_kmh + accel * 3.6 * dt)

                # Wheel to engine rpm
                wheel_rps = (self.vehicle_speed_kmh / 3.6) / (2 * math.pi * 0.355)
                self.engine_rpm = max(4000.0, min(self.MAX_ENGINE_RPM, wheel_rps * gear_ratio * self.FINAL_DRIVE_RATIO * 60.0))
        else:
            self.ice_power_kw = 0.0
            self.mguk_power_kw = 0.0
            self.engine_rpm = 0.0
            self.vehicle_speed_kmh = max(0.0, self.vehicle_speed_kmh - 15.0 * dt)

        return self.get_telemetry()

    def get_telemetry(self) -> Dict[str, Any]:
        """Export comprehensive vehicle telemetry."""
        return {
            'engine_on': self.engine_on,
            'engine_rpm': round(self.engine_rpm, 1),
            'vehicle_speed_kmh': round(self.vehicle_speed_kmh, 1),
            'current_gear': self.current_gear,
            'ice_power_kw': round(self.ice_power_kw, 1),
            'mguk_power_kw': round(self.mguk_power_kw, 1),
            'mguk_mode': self.mguk_mode,
            'battery_soc_pct': round(self.battery_soc * 100.0, 1),
            'battery_temp_c': round(self.battery_temp_c, 1),
            'hv_circuit_closed': self.hv_circuit_closed,
            'hv_bus_voltage': self.hv_bus_voltage,
            'aero_mode': self.aero_mode,
            'front_flap_deg': self.front_flap_deg,
            'rear_flap_deg': self.rear_flap_deg,
            'aero_interlock_active': self.aero_interlock_active,
            'brake_line_pressure_bar': round(self.brake_line_pressure_bar, 1),
            'steering_angle_rad': round(self.steering_angle_rad, 3)
        }
