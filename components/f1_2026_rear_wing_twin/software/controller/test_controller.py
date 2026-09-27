"""
test_controller.py — Comprehensive Unit Test Suite for 2026 F1 Rear Wing Controller
Verifies Z-Mode to X-Mode articulation, aerodynamic coefficients, brake interlock, and spring failsafe.
"""

import unittest
from rear_wing_controller import F12026RearWingController


class TestF12026RearWingController(unittest.TestCase):
    def setUp(self):
        self.ctrl = F12026RearWingController()

    def test_initial_high_downforce_state(self):
        """Verify initial state is Z_MODE with full 26° AoA and maximum downforce."""
        self.assertEqual(self.ctrl.mode, "Z_MODE")
        self.assertEqual(self.ctrl.current_aoa_deg, 26.0)
        aero = self.ctrl.calculate_aerodynamics()
        self.assertAlmostEqual(aero["cl"], 2.15)
        self.assertAlmostEqual(aero["cd"], 0.68)
        self.assertGreater(aero["downforce_n"], 2000.0)

    def test_transition_to_low_drag_x_mode(self):
        """Verify smooth transition to X_MODE with 55%+ drag reduction."""
        self.assertTrue(self.ctrl.set_mode("X_MODE"))
        self.assertEqual(self.ctrl.target_mode, "X_MODE")

        # Step forward 200 ms to complete slew
        self.ctrl.update_tick(0.200)
        self.assertEqual(self.ctrl.mode, "X_MODE")
        self.assertAlmostEqual(self.ctrl.current_aoa_deg, 3.0)

        aero_x = self.ctrl.calculate_aerodynamics()
        self.assertAlmostEqual(aero_x["cl"], 0.72)
        self.assertAlmostEqual(aero_x["cd"], 0.28)

        # Drag reduction calculation: (0.68 - 0.28) / 0.68 = 58.8%
        drag_reduction = (0.68 - aero_x["cd"]) / 0.68
        self.assertGreater(drag_reduction, 0.55)

    def test_brake_safety_interlock(self):
        """Verify heavy braking (>1.8g) forbids X-Mode and snaps wing shut."""
        self.ctrl.set_vehicle_telemetry(300.0, decel_g=2.2)
        self.assertFalse(self.ctrl.set_mode("X_MODE"))
        self.assertEqual(self.ctrl.target_mode, "Z_MODE")

        # Open wing under cruise, then apply heavy brakes
        self.ctrl.set_vehicle_telemetry(300.0, decel_g=0.0)
        self.assertTrue(self.ctrl.set_mode("X_MODE"))
        self.ctrl.update_tick(0.200)
        self.assertEqual(self.ctrl.mode, "X_MODE")

        # Heavy braking trigger
        self.ctrl.set_vehicle_telemetry(300.0, decel_g=2.5)
        self.assertEqual(self.ctrl.target_mode, "Z_MODE")

    def test_hydraulic_pressure_failsafe(self):
        """Verify mechanical return springs snap flap shut in under 150 ms upon pressure loss."""
        # Open to X-Mode
        self.ctrl.set_vehicle_telemetry(280.0, decel_g=0.0)
        self.ctrl.set_mode("X_MODE")
        self.ctrl.update_tick(0.200)
        self.assertEqual(self.ctrl.mode, "X_MODE")

        # Pressure drop
        self.ctrl.trip_hydraulic_failsafe()
        self.assertEqual(self.ctrl.target_mode, "Z_MODE")
        self.assertEqual(self.ctrl.hydraulic_pressure_bar, 0.0)

        # 140 ms spring snap shut
        self.ctrl.update_tick(0.145)
        self.assertEqual(self.ctrl.mode, "Z_MODE")
        self.assertAlmostEqual(self.ctrl.current_aoa_deg, 26.0)

    def test_aerodynamic_speed_scaling(self):
        """Verify aerodynamic force scales quadratically with speed."""
        self.ctrl.set_vehicle_telemetry(150.0)
        f_150 = self.ctrl.calculate_aerodynamics()["downforce_n"]

        self.ctrl.set_vehicle_telemetry(300.0)
        f_300 = self.ctrl.calculate_aerodynamics()["downforce_n"]

        # Double speed -> 4x force
        ratio = f_300 / f_150
        self.assertAlmostEqual(ratio, 4.0, delta=0.05)


if __name__ == "__main__":
    unittest.main()
