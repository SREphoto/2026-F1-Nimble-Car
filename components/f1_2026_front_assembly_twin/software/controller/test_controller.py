"""
test_controller.py — Comprehensive Unit Test Suite for 2026 F1 Front Assembly Master Controller.
"""

import unittest
from front_assembly_controller import F1FrontAssemblyController


class TestFrontAssemblyController(unittest.TestCase):

    def setUp(self):
        self.ctrl = F1FrontAssemblyController()

    def test_initial_nominal(self):
        """Verify initial resting state is nominal."""
        self.ctrl.step(0.016)
        telem = self.ctrl.get_telemetry()
        self.assertEqual(telem["effective_aero_mode"], "Z_MODE")
        self.assertAlmostEqual(telem["flap_angle_deg"], 24.0, places=1)
        self.assertAlmostEqual(telem["line_pressure_bar"], 0.0, places=1)
        self.assertAlmostEqual(telem["camber_deg"], -3.20, places=2)
        self.assertTrue(telem["hv_safe"])

    def test_x_mode_aero_shed(self):
        """Verify X-Mode sheds ~55% drag on straight line."""
        self.ctrl.set_inputs(aero_mode="X_MODE")
        for _ in range(30):  # 480 ms
            self.ctrl.step(0.016)

        telem = self.ctrl.get_telemetry()
        self.assertEqual(telem["effective_aero_mode"], "X_MODE")
        self.assertAlmostEqual(telem["flap_angle_deg"], 6.0, delta=0.5)
        self.assertGreater(telem["drag_reduction_pct"], 50.0)

    def test_heavy_braking_interlock(self):
        """Verify heavy braking (>1.8g) overrides X-Mode and forces flaps back to Z-Mode."""
        # 1. Establish X-Mode
        self.ctrl.set_inputs(aero_mode="X_MODE")
        for _ in range(30):
            self.ctrl.step(0.016)
        self.assertEqual(self.ctrl.effective_aero_mode, "X_MODE")

        # 2. Driver hits brakes with 150 kgf effort (>4.0g deceleration)
        self.ctrl.set_inputs(pedal_kgf=150.0)
        self.ctrl.step(0.016)

        # Interlock must immediately command Z-Mode
        self.assertEqual(self.ctrl.effective_aero_mode, "Z_MODE")
        self.assertGreater(self.ctrl.braking_g, 3.5)

        # Step forward for flap to snap shut
        for _ in range(30):
            self.ctrl.step(0.016)
        self.assertAlmostEqual(self.ctrl.flap_angle_deg, 24.0, delta=0.5)

    def test_suspension_anti_dive(self):
        """Verify anti-dive reduces pitch deflection under braking."""
        self.ctrl.set_inputs(pedal_kgf=160.0)
        self.ctrl.step(0.016)
        telem = self.ctrl.get_telemetry()
        self.assertGreater(telem["anti_dive_reduction_mm"], 8.0)
        self.assertGreater(telem["pullrod_tension_kn"], 5.0)

    def test_chassis_torsion(self):
        """Verify chassis torsional stiffness limits twist under 4g lateral cornering."""
        self.ctrl.set_inputs(lateral_g=4.0)
        self.ctrl.step(0.016)
        telem = self.ctrl.get_telemetry()
        self.assertLess(telem["torsional_twist_deg"], 0.25)


if __name__ == "__main__":
    unittest.main()
