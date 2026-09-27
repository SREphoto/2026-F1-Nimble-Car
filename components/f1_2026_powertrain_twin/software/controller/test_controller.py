"""
test_controller.py — Comprehensive Unit Test Suite for 2026 F1 Powertrain Controller.
"""

import unittest
from powertrain_controller import F1PowertrainController


class TestPowertrainController(unittest.TestCase):

    def setUp(self):
        self.ctrl = F1PowertrainController()

    def test_full_power_nominal(self):
        """Verify 50/50 hybrid full throttle delivers ~754 kW (1,011 hp)."""
        self.ctrl.set_inputs(throttle_pct=100.0, engine_rpm=11500.0, regen_kw=0.0)
        self.ctrl.step(0.016)
        telem = self.ctrl.get_telemetry()
        self.assertAlmostEqual(telem["ice_power_kw"], 404.2, delta=5.0)
        self.assertAlmostEqual(telem["mguk_power_kw"], 350.0, places=1)
        self.assertGreater(telem["total_power_hp"], 1000.0)
        self.assertFalse(telem["derating_active"])

    def test_rpm_fuel_scaling(self):
        """Verify Article C5.4.1 fuel scaling below 10,500 rpm."""
        self.ctrl.set_inputs(throttle_pct=100.0, engine_rpm=9000.0)
        self.ctrl.step(0.016)
        # Expected: 0.27 * 9000 + 165 = 2595 MJ/h
        telem = self.ctrl.get_telemetry()
        self.assertAlmostEqual(telem["fuel_rate_mj_h"], 2595.0, places=1)
        self.assertLess(telem["ice_power_kw"], 400.0)

    def test_regenerative_braking(self):
        """Verify 350 kW recovery mode recharges the battery and yields negative MGU-K power."""
        self.ctrl.set_inputs(throttle_pct=0.0, regen_kw=350.0)
        initial_energy = self.ctrl.battery_energy_mj
        for _ in range(60):  # 1 second of heavy regen
            self.ctrl.step(0.016)

        telem = self.ctrl.get_telemetry()
        self.assertLess(telem["mguk_power_kw"], 0.0)
        self.assertGreater(self.ctrl.battery_energy_mj, initial_energy)

    def test_straightline_derating(self):
        """Verify clipping activates when battery SoC drops below 12%."""
        # Force low battery SoC (10%)
        self.ctrl.battery_energy_mj = 0.55  # 10% of 5.5 MJ
        self.ctrl.set_inputs(throttle_pct=100.0, regen_kw=0.0)
        self.ctrl.step(0.016)

        telem = self.ctrl.get_telemetry()
        self.assertTrue(telem["derating_active"])
        self.assertLess(telem["mguk_power_kw"], 350.0)

    def test_pyrofuse_crash_isolation(self):
        """Verify pyrofuse disconnect kills electrical bus and outputs immediately."""
        self.ctrl.trip_pyrofuse()
        self.ctrl.step(0.016)

        telem = self.ctrl.get_telemetry()
        self.assertTrue(telem["pyrofuse_tripped"])
        self.assertEqual(telem["total_power_kw"], 0.0)
        self.assertEqual(telem["battery_voltage_v"], 0.0)


if __name__ == "__main__":
    unittest.main()
