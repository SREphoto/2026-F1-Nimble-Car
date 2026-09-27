# 2026 Formula 1 Front Suspension & Kinematics Specification
## Pull-Rod Geometry, Anti-Dive Angles, and Mechanical Hardpoints

**Assembly Name:** `Assembly_FrontSuspension_LH`  
**Governing Standard:** FIA 2026 Formula 1 Technical Regulations (Article C10 & C13)  
**Classification:** High-Fidelity Piecewise Procedural CAD Digital Twin  

---

## 1. Kinematic Hardpoints in Global Coordinates ($[X, Y, Z]$ in mm)

All coordinates are referenced to the Universal Datum ($[0, 0, 0]$ at Front Axle Centerline / Car Centerline / Reference Plane):

```
+========================================================================================================+
| FRONT LEFT SUSPENSION HARDPOINT TABLE                                                                  |
+=============================================+============+============+============+===================+
| Hardpoint Description                       | X (mm)     | Y (mm)     | Z (mm)     | Interface Node    |
+=============================================+============+============+============+===================+
| Upper Wishbone Front Inboard Chassis Pivot  |   -120.00  |   +285.00  |   +420.00  | Monocoque Flank   |
| Upper Wishbone Rear Inboard Chassis Pivot   |   +180.00  |   +295.00  |   +405.00  | Monocoque Flank   |
| Upper Wishbone Outboard Balljoint (Upright) |      0.00  |   +700.00  |   +410.00  | Upright Top Clevis|
+---------------------------------------------+------------+------------+------------+-------------------+
| Lower Wishbone Front Inboard Chassis Pivot  |   -140.00  |   +245.00  |   +145.00  | Monocoque Flank   |
| Lower Wishbone Rear Inboard Chassis Pivot   |   +210.00  |   +260.00  |   +180.00  | Monocoque Flank   |
| Lower Wishbone Outboard Balljoint (Upright) |      0.00  |   +680.00  |   +160.00  | Upright Bot Clevis|
+---------------------------------------------+------------+------------+------------+-------------------+
| Pull-Rod Outboard Upright Attachment Lug    |      0.00  |   +690.00  |   +170.00  | Upright Bottom    |
| Pull-Rod Inboard Bellcrank Rocker Axis      |    +45.00  |   +110.00  |   +460.00  | Monocoque Nose    |
+---------------------------------------------+------------+------------+------------+-------------------+
| Steering Tie-Rod Inboard Rack Joint         |    -85.00  |    +75.00  |   +260.00  | HPAS Rack End     |
| Steering Tie-Rod Outboard Upright Horn      |    -75.00  |   +680.00  |   +260.00  | Upright Arm       |
+=============================================+============+============+============+===================+
```

---

## 2. Aerodynamic Profile & Geometric Rules (Article C10)

* **Cross-Sectional Envelope:**
  * Maximum chord-to-thickness ratio: strictly **$\le 3.5:1$** (e.g. Chord $70.0\text{ mm}$, Thickness $20.0\text{ mm}$).
  * Angular inclination tolerance: within $\pm 5.0^\circ$ of horizontal flow vectors.
* **Anti-Dive Kinematics:**
  * Lower wishbone inclination rake: **$14.2^\circ$** sloping upward toward the rear.
  * Mechanical anti-dive percentage: **$38.5\%$** anti-dive, preventing platform pitch collapse during 5g high-speed braking and maintaining clean underfloor airflow.
* **Wheel Travel Envelopes:**
  * Maximum bump travel: **$+35.0\text{ mm}$**.
  * Maximum droop/rebound travel: **$-25.0\text{ mm}$**.
  * Full steering lock angle: **$\pm 18.5^\circ$** at wheel hub.
  * Bump-steer toe change over full travel: strictly **$< 0.05\text{ mm}$**.

---

## 3. Structural Tension & Torsion Ratings

* **Pull-Rod Tensile Loading:** Under 5g vertical curb impact or combined cornering + braking, the pull-rod experiences a peak tensile load of **$24.5\text{ kN}$** (tested to $36.0\text{ kN}$ proof load).
* **Wheel Tethers:** 4x Zylon braided tethers routed inside hollow carbon wishbones, each absorbing **$7.0\text{ kJ}$** ($28.0\text{ kJ}$ total per corner).
