"""
test_controller.py — Comprehensive Unit Test Suite for 2026 F1 Gearbox Controller
Verifies 8-speed gear selection, seamless shifting, differential lockup, suspension kinematics, and RIS crash absorption.
"""

import unittest
from gearbox_controller import F12026GearboxController


class TestF12026GearboxController(unittest.TestCase):
    def setUp(self):
        self.ctrl = F12026GearboxController()

    def test_gear_ratios_and_speed_calculation(self):
        """Verify gear ratios and speed calculations across 1st to 8th gear."""
        self.ctrl.select_gear(1)
        speed_1st = self.ctrl.calculate_vehicle_speed_kmh(10500.0)
        self.assertGreater(speed_1st, 80.0)
        self.assertLess(speed_1st, 110.0)

        # 8th gear top speed test (should reach ~340-360 km/h at 11,500-12,000 RPM)
        self.ctrl.select_gear(8)
        speed_8th = self.ctrl.calculate_vehicle_speed_kmh(11500.0)
        self.assertGreater(speed_8th, 330.0)
        self.assertLess(speed_8th, 375.0)

        # Neutral speed should strictly be 0
        self.ctrl.select_gear(0)
        self.assertEqual(self.ctrl.calculate_vehicle_speed_kmh(10500.0), 0.0)

    def test_seamless_shift_timing(self):
        """Verify seamless shift completion within 4.5 ms."""
        self.ctrl.select_gear(3)
        self.assertTrue(self.ctrl.shift_up())
        self.assertTrue(self.ctrl.is_shifting)
        self.assertEqual(self.ctrl.target_gear, 4)
        self.assertEqual(self.ctrl.current_gear, 3)

        # Advance 2 ms (halfway through shift)
        self.ctrl.update_tick(0.002)
        self.assertTrue(self.ctrl.is_shifting)
        self.assertEqual(self.ctrl.current_gear, 3)

        # Advance past 4.5 ms
        self.ctrl.update_tick(0.003)
        self.assertFalse(self.ctrl.is_shifting)
        self.assertEqual(self.ctrl.current_gear, 4)

    def test_active_differential_modes(self):
        """Verify electro-hydraulic differential lockup across modes."""
        self.ctrl.set_differential_mode("ENTRY")
        self.assertEqual(self.ctrl.diff_lock_pct, 65.0)
        torque_entry = self.ctrl.calculate_diff_lock_torque(600.0)
        self.assertAlmostEqual(torque_entry, 390.0)

        self.ctrl.set_differential_mode("APEX")
        self.assertEqual(self.ctrl.diff_lock_pct, 25.0)
        torque_apex = self.ctrl.calculate_diff_lock_torque(600.0)
        self.assertAlmostEqual(torque_apex, 150.0)

        self.ctrl.set_differential_mode("EXIT")
        self.assertEqual(self.ctrl.diff_lock_pct, 85.0)
        torque_exit = self.ctrl.calculate_diff_lock_torque(600.0)
        self.assertAlmostEqual(torque_exit, 510.0)

        # Manual clamp test
        self.ctrl.set_differential_mode("MANUAL", 110.0)
        self.assertEqual(self.ctrl.diff_lock_pct, 100.0)

    def test_rear_suspension_kinematics(self):
        """Verify pushrod load and bellcrank rotation under suspension bump."""
        self.ctrl.set_suspension_bump(20.0)  # +20 mm bump
        kin = self.ctrl.calculate_suspension_kinematics()
        self.assertEqual(kin["wheel_bump_mm"], 20.0)
        self.assertAlmostEqual(kin["pushrod_displacement_mm"], 16.4)
        self.assertGreater(kin["pushrod_load_n"], 3500.0)
        self.assertGreater(kin["rocker_angle_deg"], 10.0)

    def test_rear_impact_structure_compliance(self):
        """Verify RIS absorbs >= 50 kJ at 12 m/s impact velocity."""
        # Standard FIA test: 768 kg car @ 12.0 m/s
        res = self.ctrl.verify_rear_impact_structure(768.0, 12.0)
        self.assertTrue(res["compliant"])
        self.assertGreaterEqual(res["kinetic_energy_kj"], 55.0)
        self.assertLess(res["avg_deceleration_g"], 20.0)


if __name__ == "__main__":
    unittest.main()
