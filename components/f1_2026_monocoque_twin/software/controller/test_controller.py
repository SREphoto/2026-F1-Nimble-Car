"""
test_controller.py — Comprehensive Unit Test Suite for 2026 F1 Monocoque Controller.
Verifies chassis torsional rigidity, FIA 172 kN roll hoop proof test, and safety interlocks.
"""

import unittest
from monocoque_controller import F1MonocoqueController, MonocoqueConfig


class TestF1MonocoqueController(unittest.TestCase):

    def setUp(self):
        self.cfg = MonocoqueConfig()
        self.ctrl = F1MonocoqueController(self.cfg)

    def test_chassis_torsional_stiffness(self):
        """Verify chassis torsional deflection under 4.0g cornering roll moment."""
        self.ctrl.set_inputs(lateral_g=4.0, pedal_sled_mm=75.0, brake_kgf=0.0, throttle_pct=85.0)
        self.ctrl.step(dt_seconds=0.016)
        telemetry = self.ctrl.get_telemetry()

        # At 4g: roll moment ≈ 4.0 * 9.81 * 768 * 0.28 ≈ 8,439 Nm
        # Twist: 8,439 / 44,500 ≈ 0.1896 degrees
        self.assertAlmostEqual(telemetry["torsional_twist_deg"], 0.1896, delta=0.01)
        self.assertLess(telemetry["torsional_twist_deg"], 0.25)  # Strict platform control

    def test_fia_c13_roll_hoop_proof_test(self):
        """Verify primary roll hoop survives 172 kN proof test with deflection < 25 mm."""
        result = self.ctrl.simulate_roll_hoop_proof_test(applied_load_n=172000.0)
        self.assertTrue(result["passed_fia_c13"])
        self.assertLess(result["deflection_mm"], result["max_allowed_deflection_mm"])
        # Deflection at 172 kN: 172,000 / 9,200 ≈ 18.70 mm
        self.assertAlmostEqual(result["deflection_mm"], 18.70, delta=0.5)

    def test_pedal_sled_bounding(self):
        """Pedal sled must clamp strictly within 0 - 150 mm travel."""
        self.ctrl.set_inputs(lateral_g=0.0, pedal_sled_mm=-50.0, brake_kgf=0.0, throttle_pct=0.0)
        self.assertEqual(self.ctrl.pedal_sled_pos_mm, 0.0)

        self.ctrl.set_inputs(lateral_g=0.0, pedal_sled_mm=250.0, brake_kgf=0.0, throttle_pct=0.0)
        self.assertEqual(self.ctrl.pedal_sled_pos_mm, 150.0)

    def test_hv_safety_marshal_logic(self):
        """High-voltage fault switches marshal safety status LED to RED."""
        telemetry_nominal = self.ctrl.get_telemetry()
        self.assertTrue(telemetry_nominal["hv_isolation_safe"])
        self.assertEqual(telemetry_nominal["marshal_led_color"], "GREEN")

        # Trigger HV fault
        self.ctrl.trigger_hv_fault()
        telemetry_fault = self.ctrl.get_telemetry()
        self.assertFalse(telemetry_fault["hv_isolation_safe"])
        self.assertEqual(telemetry_fault["marshal_led_color"], "RED")

        # Reset HV fault
        self.ctrl.reset_hv_fault()
        self.assertTrue(self.ctrl.get_telemetry()["hv_isolation_safe"])


if __name__ == "__main__":
    unittest.main()
