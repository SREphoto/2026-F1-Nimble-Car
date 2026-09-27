"""
2026 Formula 1 "Nimble Car" Controller Tests
SREdesigns - Samuel R Erwin III

Unit test suite for F12026CarController:
- Engine start/stop & HV circuit interlocks
- Pyrofuse disconnect safety cutoff
- Fuel energy flow rate capping at 3000 MJ/h (Article C5.4.1)
- 8-speed sequential gear shift validation
- Active aerodynamics Z-Mode vs X-Mode & safety interlocks
- Brake-by-Wire MGU-K regen & friction torque blending
"""

import unittest
from full_car_controller import F12026CarController


class TestF12026CarController(unittest.TestCase):
    def setUp(self):
        self.ctrl = F12026CarController()

    def test_engine_start_stop(self):
        # Starts successfully with live HV battery
        self.assertTrue(self.ctrl.start_engine())
        self.assertTrue(self.ctrl.engine_on)
        self.assertGreaterEqual(self.ctrl.engine_rpm, 4000.0)

        # Shutdown
        self.ctrl.stop_engine()
        self.assertFalse(self.ctrl.engine_on)
        self.assertEqual(self.ctrl.engine_rpm, 0.0)

    def test_pyrofuse_disconnect(self):
        self.ctrl.start_engine()
        self.assertTrue(self.ctrl.engine_on)
        self.assertTrue(self.ctrl.hv_circuit_closed)

        # Trigger crash pyrofuse
        self.ctrl.trigger_pyrofuse_disconnect()
        self.assertFalse(self.ctrl.hv_circuit_closed)
        self.assertEqual(self.ctrl.hv_bus_voltage, 0.0)
        self.assertFalse(self.ctrl.engine_on)

        # Cannot restart with blown pyrofuse
        self.assertFalse(self.ctrl.start_engine())

    def test_fuel_energy_flow_calculation(self):
        # Below 10,500 rpm: EF = 0.27 * N + 165
        ef_6000 = self.ctrl.calculate_fuel_energy_flow(6000.0)
        expected_6000 = 0.27 * 6000.0 + 165.0
        self.assertAlmostEqual(ef_6000, expected_6000, places=2)

        # At or above 10,500 rpm: capped at 3000 MJ/h
        ef_10500 = self.ctrl.calculate_fuel_energy_flow(10500.0)
        self.assertAlmostEqual(ef_10500, 3000.0, places=1)

        ef_12000 = self.ctrl.calculate_fuel_energy_flow(12000.0)
        self.assertAlmostEqual(ef_12000, 3000.0, places=1)

    def test_gear_shifting(self):
        # Initial is Neutral
        self.assertEqual(self.ctrl.current_gear, 'N')

        # Shift 1 through 8
        for g in range(1, 9):
            self.assertTrue(self.ctrl.shift_gear(g))
            self.assertEqual(self.ctrl.current_gear, g)

        # Shift to invalid gear fails
        self.assertFalse(self.ctrl.shift_gear(9))
        self.assertFalse(self.ctrl.shift_gear('INVALID'))

    def test_active_aero_state_machine_and_interlocks(self):
        # Default is Z-Mode (cornering / high downforce)
        self.assertEqual(self.ctrl.aero_mode, 'Z_MODE')
        self.assertEqual(self.ctrl.front_flap_deg, 22.0)
        self.assertEqual(self.ctrl.rear_flap_deg, 26.0)

        # Request X-Mode while car is stationary (< 120 km/h) -> Interlock keeps Z-Mode
        mode = self.ctrl.set_active_aero_mode('X_MODE')
        self.assertEqual(mode, 'Z_MODE')
        self.assertTrue(self.ctrl.aero_interlock_active)

        # Bring car up to high speed (250 km/h), no brake, low lateral g -> X-Mode allowed
        self.ctrl.vehicle_speed_kmh = 250.0
        self.ctrl.lateral_g = 0.2
        self.ctrl.brake_pedal_kgf = 0.0
        mode = self.ctrl.set_active_aero_mode('X_MODE')
        self.assertEqual(mode, 'X_MODE')
        self.assertFalse(self.ctrl.aero_interlock_active)
        self.assertEqual(self.ctrl.front_flap_deg, 4.0)
        self.assertEqual(self.ctrl.rear_flap_deg, 3.0)

        # Driver touches brakes (> 10 kgf) -> Forced back to Z-Mode instantly
        self.ctrl.brake_pedal_kgf = 25.0
        mode = self.ctrl.set_active_aero_mode('X_MODE')
        self.assertEqual(mode, 'Z_MODE')
        self.assertTrue(self.ctrl.aero_interlock_active)

    def test_bbw_torque_split(self):
        self.ctrl.vehicle_speed_kmh = 200.0
        self.ctrl.battery_soc = 0.50

        # Moderate braking effort (50 kgf)
        front_tq, rear_fric_tq, rear_regen_tq = self.ctrl.calculate_bbw_split(50.0)
        self.assertGreater(front_tq, 0.0)
        self.assertGreater(rear_regen_tq, 0.0)
        self.assertEqual(self.ctrl.mguk_mode, 'HARVEST')

        # Heavy braking (150 kgf)
        front_tq_heavy, rear_fric_heavy, rear_regen_heavy = self.ctrl.calculate_bbw_split(150.0)
        self.assertGreater(front_tq_heavy, front_tq)
        # MGU-K regen capped at 450 Nm, excess handled by rear friction brakes
        self.assertAlmostEqual(rear_regen_heavy, 450.0, places=1)
        self.assertGreater(rear_fric_heavy, 0.0)

    def test_simulation_tick_update(self):
        self.ctrl.start_engine()
        self.ctrl.shift_gear(1)

        # Apply 100% throttle for 1 second (10 ticks of 0.1s)
        for _ in range(10):
            telem = self.ctrl.update(0.1, throttle=1.0, brake_kgf=0.0, steer_rad=0.0)

        self.assertGreater(telem['vehicle_speed_kmh'], 0.0)
        self.assertGreater(telem['engine_rpm'], 4000.0)
        self.assertEqual(telem['mguk_mode'], 'DEPLOY')


if __name__ == '__main__':
    unittest.main()
