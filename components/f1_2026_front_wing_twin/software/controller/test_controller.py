"""
test_controller.py — Comprehensive Unit Test Suite for 2026 F1 Front Wing Controller.
"""

import unittest
from front_wing_controller import F1FrontWingController, FrontWingConfig


class TestFrontWingController(unittest.TestCase):

    def setUp(self):
        self.ctrl = F1FrontWingController()

    def test_initial_state(self):
        """Verify initial default state is Z-Mode (High Downforce)."""
        self.ctrl.step(0.016)
        telemetry = self.ctrl.get_telemetry()
        self.assertEqual(telemetry["mode"], "Z_MODE")
        self.assertAlmostEqual(telemetry["flap_angle_lh_deg"], 24.0, places=1)
        self.assertAlmostEqual(telemetry["flap_angle_rh_deg"], 24.0, places=1)
        self.assertGreater(telemetry["downforce_n"], 3500.0)
        self.assertEqual(telemetry["drag_reduction_pct"], 0.0)
        self.assertFalse(telemetry["failsafe_active"])
        self.assertFalse(telemetry["asymmetry_aborted"])

    def test_x_mode_transition(self):
        """Verify transition to X-Mode finishes within legal FIA time window (<= 450 ms)."""
        self.ctrl.set_mode("X_MODE")

        # Step forward 0.40 seconds (400 ms)
        for _ in range(25):
            self.ctrl.step(0.016)

        telemetry = self.ctrl.get_telemetry()
        self.assertAlmostEqual(telemetry["flap_angle_lh_deg"], 6.0, delta=0.5)
        self.assertAlmostEqual(telemetry["flap_angle_rh_deg"], 6.0, delta=0.5)
        # Verify drag reduction is approximately 50-55%
        self.assertGreater(telemetry["drag_reduction_pct"], 50.0)
        self.assertLess(telemetry["drag_reduction_pct"], 60.0)

    def test_hydraulic_pressure_failsafe(self):
        """Verify loss of hydraulic pressure (< 120 bar) triggers spring failsafe snap-shut."""
        self.ctrl.set_mode("X_MODE")
        for _ in range(30):
            self.ctrl.step(0.016)

        # Flaps are now at X-Mode (6°)
        self.assertAlmostEqual(self.ctrl.get_telemetry()["flap_angle_lh_deg"], 6.0, delta=0.5)

        # Simulate hydraulic pump failure (pressure drops to 40 bar)
        self.ctrl.set_hydraulic_pressure(40.0)
        for _ in range(20):  # 320 ms
            self.ctrl.step(0.016)

        telemetry = self.ctrl.get_telemetry()
        self.assertTrue(telemetry["failsafe_active"])
        # Flaps must have snapped back shut to Z-mode 24°
        self.assertAlmostEqual(telemetry["flap_angle_lh_deg"], 24.0, places=1)
        self.assertAlmostEqual(telemetry["flap_angle_rh_deg"], 24.0, places=1)

    def test_asymmetry_abort(self):
        """Verify SECU abort triggers when bilateral flap asymmetry exceeds 1.5°."""
        self.ctrl.set_mode("X_MODE")
        self.ctrl.step(0.016)

        # Inject manual asymmetry
        self.ctrl.flap_angle_lh_deg = 20.0
        self.ctrl.flap_angle_rh_deg = 17.5  # 2.5° difference
        self.ctrl.step(0.016)

        telemetry = self.ctrl.get_telemetry()
        self.assertTrue(telemetry["asymmetry_aborted"])

    def test_speed_scaling(self):
        """Verify aerodynamic downforce and drag scale with velocity squared."""
        self.ctrl.set_airspeed_kmh(100.0)
        self.ctrl.step(0.016)
        f_z_100 = self.ctrl.downforce_n

        self.ctrl.set_airspeed_kmh(200.0)
        self.ctrl.step(0.016)
        f_z_200 = self.ctrl.downforce_n

        # (200 / 100)^2 = 4.0
        ratio = f_z_200 / f_z_100
        self.assertAlmostEqual(ratio, 4.0, places=2)


if __name__ == "__main__":
    unittest.main()
