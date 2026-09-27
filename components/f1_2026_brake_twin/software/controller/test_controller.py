"""
test_controller.py — Comprehensive Unit Test Suite for 2026 F1 Brake Corner Controller.
Verifies hydraulics, thermal dynamics, friction limits, and fail-safe logic.
"""

import unittest
import math
from f1_brake_controller import F1BrakeCornerController, BrakeCornerConfig


class TestF1BrakeCornerController(unittest.TestCase):

    def setUp(self):
        self.cfg = BrakeCornerConfig()
        self.ctrl = F1BrakeCornerController(self.cfg)

    def test_piston_area_calculation(self):
        """Verify 3-piston differential area matches analytical sum."""
        lead_area = (math.pi / 4.0) * (0.027 ** 2)
        mid_area = (math.pi / 4.0) * (0.032 ** 2)
        trail_area = (math.pi / 4.0) * (0.038 ** 2)
        expected_total = lead_area + mid_area + trail_area
        self.assertAlmostEqual(self.cfg.total_one_bank_piston_area_m2(), expected_total, places=7)
        # Should be approximately 2.511e-3 m^2
        self.assertAlmostEqual(self.cfg.total_one_bank_piston_area_m2() * 1e6, 2510.85, delta=1.0)

    def test_off_brake_rollback(self):
        """Zero pedal force must produce zero line pressure and active seal rollback (0 mm stroke)."""
        self.ctrl.set_inputs(pedal_force_kgf=0.0, car_speed_kmh=250.0, power=True)
        telemetry = self.ctrl.get_telemetry()
        self.assertEqual(telemetry["line_pressure_bar"], 0.0)
        self.assertEqual(telemetry["clamping_force_kn"], 0.0)
        self.assertEqual(telemetry["braking_torque_nm"], 0.0)
        self.assertTrue(telemetry["seal_rollback_active"])
        self.assertEqual(telemetry["piston_stroke_mm"], 0.0)

    def test_full_pedal_effort_clamping(self):
        """180 kgf pedal force must produce 180 bar line pressure and ~45.2 kN clamping force."""
        self.ctrl.set_inputs(pedal_force_kgf=180.0, car_speed_kmh=300.0, power=True)
        telemetry = self.ctrl.get_telemetry()
        self.assertEqual(telemetry["line_pressure_bar"], 180.0)
        # Expected clamp force: 180 bar * 1e5 Pa/bar * 2.51085e-3 m^2 ≈ 45,195 N = 45.2 kN
        self.assertAlmostEqual(telemetry["clamping_force_kn"], 45.20, delta=0.5)
        self.assertFalse(telemetry["seal_rollback_active"])
        self.assertGreater(telemetry["piston_stroke_mm"], 0.5)

    def test_friction_coefficient_temperature_curve(self):
        """Verify mu(T) follows the authentic Carbon-Carbon curve."""
        mu_cold = self.ctrl.calculate_friction_coeff(25.0)
        self.assertGreaterEqual(mu_cold, 0.20)
        self.assertLessEqual(mu_cold, 0.26)

        mu_optimal = self.ctrl.calculate_friction_coeff(600.0)
        self.assertGreaterEqual(mu_optimal, 0.48)
        self.assertLessEqual(mu_optimal, 0.54)

        mu_faded = self.ctrl.calculate_friction_coeff(1100.0)
        self.assertLess(mu_faded, mu_optimal)

    def test_thermal_heating_and_glow(self):
        """High-speed hard stop converts kinetic energy into heat, raising disc temp > 350°C and triggering glow when warm."""
        self.ctrl.set_inputs(pedal_force_kgf=160.0, car_speed_kmh=320.0, power=True)
        # High speed stop
        for _ in range(100):
            self.ctrl.step(dt_seconds=0.02)

        telemetry = self.ctrl.get_telemetry()
        self.assertGreater(telemetry["disc_temperature_c"], 350.0)
        self.assertLess(telemetry["car_speed_kmh"], 320.0)

        # On a warm disc (e.g. 550°C during active race lap), blackbody thermal glow is active
        self.ctrl.disc_temperature_c = 680.0
        glow_telemetry = self.ctrl.get_telemetry()
        self.assertGreater(glow_telemetry["glow_intensity"], 0.0)
        self.assertEqual(glow_telemetry["glow_hex"], "#ff2a00")

    def test_failsafe_shuttle_bypass(self):
        """Power loss engages mechanical shuttle bypass, guaranteeing braking torque >= 2500 Nm."""
        self.ctrl.set_inputs(pedal_force_kgf=165.0, car_speed_kmh=200.0, power=False)
        telemetry = self.ctrl.get_telemetry()
        self.assertFalse(telemetry["is_powered"])
        self.assertTrue(telemetry["bbw_failsafe_active"])
        self.assertGreater(telemetry["braking_torque_nm"], 2500.0)


if __name__ == "__main__":
    unittest.main()
