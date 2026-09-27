"""
test_controller.py — Comprehensive Unit Test Suite for 2026 F1 Front Suspension Controller.
Verifies kinematic travel, pull-rod tensile loads, camber gain, and anti-dive compensation.
"""

import unittest
from suspension_controller import F1SuspensionController, SuspensionConfig


class TestF1SuspensionController(unittest.TestCase):

    def setUp(self):
        self.cfg = SuspensionConfig()
        self.ctrl = F1SuspensionController(self.cfg)

    def test_bump_travel_bounding(self):
        """Verify wheel bump travel is clamped strictly between -25 mm and +35 mm."""
        self.ctrl.set_inputs(bump_mm=55.0, steer_deg=0.0, load_g=1.0)
        self.assertEqual(self.ctrl.wheel_bump_mm, 35.0)

        self.ctrl.set_inputs(bump_mm=-40.0, steer_deg=0.0, load_g=1.0)
        self.assertEqual(self.ctrl.wheel_bump_mm, -25.0)

    def test_camber_gain_in_bump(self):
        """Verify negative camber increases proportionally with positive bump travel."""
        # Static: -3.20 deg
        self.ctrl.set_inputs(bump_mm=0.0, steer_deg=0.0, load_g=1.0)
        self.ctrl.step()
        self.assertAlmostEqual(self.ctrl.camber_deg, -3.20, places=3)

        # 20 mm bump: -3.20 + (-0.045 * 20) = -3.20 - 0.90 = -4.10 deg
        self.ctrl.set_inputs(bump_mm=20.0, steer_deg=0.0, load_g=1.0)
        self.ctrl.step()
        self.assertAlmostEqual(self.ctrl.camber_deg, -4.10, places=3)

    def test_pullrod_tensile_force(self):
        """Verify pull-rod tension scales with vertical g-load."""
        # 1.0g static load: ~3.1 kN
        self.ctrl.set_inputs(bump_mm=0.0, steer_deg=0.0, load_g=1.0)
        self.ctrl.step()
        telemetry = self.ctrl.get_telemetry()
        self.assertAlmostEqual(telemetry["pullrod_tension_kn"], 3.12, delta=0.2)

        # 5.0g severe curb strike: ~15.6 kN
        self.ctrl.set_inputs(bump_mm=30.0, steer_deg=0.0, load_g=5.0)
        self.ctrl.step()
        telemetry_high = self.ctrl.get_telemetry()
        self.assertGreater(telemetry_high["pullrod_tension_kn"], 14.5)
        self.assertLess(telemetry_high["pullrod_tension_kn"], 17.0)

    def test_anti_dive_pitch_compensation(self):
        """Verify 38.5% anti-dive reduces braking pitch deflection under 5.0g deceleration."""
        self.ctrl.set_inputs(bump_mm=0.0, steer_deg=0.0, load_g=1.0, braking_g=5.0)
        self.ctrl.step()
        telemetry = self.ctrl.get_telemetry()
        # Uncompensated pitch: 5.0 * 6.2 = 31.0 mm
        # Pitch reduction: 31.0 * 0.385 ≈ 11.94 mm
        self.assertAlmostEqual(telemetry["anti_dive_pitch_reduction_mm"], 11.94, delta=0.5)


if __name__ == "__main__":
    unittest.main()
