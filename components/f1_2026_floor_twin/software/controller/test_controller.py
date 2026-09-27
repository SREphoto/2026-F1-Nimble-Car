"""
test_controller.py — Comprehensive Unit Test Suite for 2026 F1 Floor & Diffuser Controller.
"""

import unittest
from floor_controller import F1FloorController


class TestFloorController(unittest.TestCase):

    def setUp(self):
        self.ctrl = F1FloorController()

    def test_nominal_downforce(self):
        """Verify nominal downforce at 250 km/h and 35 mm front ride height."""
        self.ctrl.step(0.016)
        telem = self.ctrl.get_telemetry()
        self.assertGreater(telem["downforce_n"], 15000.0)
        self.assertLess(telem["downforce_n"], 25000.0)
        self.assertFalse(telem["skid_contact"])
        self.assertFalse(telem["plank_illegal"])

    def test_ride_height_scaling(self):
        """Verify downforce increases smoothly as ride height decreases (anti-porpoising)."""
        self.ctrl.set_inputs(front_rh_mm=50.0)
        self.ctrl.step(0.016)
        df_high = self.ctrl.downforce_n

        self.ctrl.set_inputs(front_rh_mm=25.0)
        self.ctrl.step(0.016)
        df_low = self.ctrl.downforce_n

        # Lower ride height must produce more downforce without stall
        self.assertGreater(df_low, df_high)

    def test_skid_bottoming_and_sparks(self):
        """Verify negative ride height (bottoming on kerb) triggers titanium spark telemetry."""
        self.ctrl.set_inputs(front_rh_mm=-2.0)  # 2mm skid contact
        self.ctrl.step(0.016)
        telem = self.ctrl.get_telemetry()
        self.assertTrue(telem["skid_contact"])
        self.assertGreater(telem["spark_intensity"], 0.5)

    def test_plank_wear_budget(self):
        """Verify that excessive bottoming flags illegal wear (> 2.0 mm per Article C3.6)."""
        self.ctrl.set_inputs(front_rh_mm=-4.0, speed_kmh=300.0)
        # Simulate heavy bottoming for several seconds
        for _ in range(250):
            self.ctrl.step(0.05)

        telem = self.ctrl.get_telemetry()
        self.assertGreater(telem["plank_wear_mm"], 2.0)
        self.assertTrue(telem["plank_illegal"])

    def test_speed_scaling(self):
        """Verify floor aerodynamic downforce scales with airspeed squared."""
        self.ctrl.set_inputs(speed_kmh=100.0, front_rh_mm=35.0)
        self.ctrl.step(0.016)
        df_100 = self.ctrl.downforce_n

        self.ctrl.set_inputs(speed_kmh=200.0)
        self.ctrl.step(0.016)
        df_200 = self.ctrl.downforce_n

        ratio = df_200 / df_100
        self.assertAlmostEqual(ratio, 4.0, places=2)


if __name__ == "__main__":
    unittest.main()
