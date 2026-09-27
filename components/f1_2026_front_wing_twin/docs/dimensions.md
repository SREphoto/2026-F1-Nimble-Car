# 2026 Formula 1 Active Front Wing & FIS Dimensional Specification

## 1. Coordinate Reference System (Front Axle Centerline Datum)
The assembly is positioned relative to the Universal Chassis Datum $[0,0,0]$:
* **$X$-axis:** Longitudinal axis ($X = 0$ at Front Axle Centerline, negative forward toward nose tip).
* **$Y$-axis:** Lateral axis ($Y = 0$ at vehicle centerline, $+Y$ Left-Hand, $-Y$ Right-Hand).
* **$Z$-axis:** Vertical axis ($Z = 0$ at Bottom Reference Plane / Skid Block datum).

```
                 2026 FRONT WING & FIS DATUM COORDINATES (mm)
  
   Nose Tip [-1250, 0, 180]              Bulkhead A-A Interface [0, 0, 0..460]
            |                                           |
            v                                           v
   <=========================[ TWO-STAGE FIS ]=========>| [Survival Cell]
         |                         |                    |
         |<- Stage 1 (Crush Cone)->|<- Stage 2 (Tough)->|
         |   [-1250 to -850 mm]    |   [-850 to 0 mm]   |
  
   +----------------------------------------------------+
   | Mainplane Element 1: X in [-1220, -820], Y in [-925, +925], Z in [60, 115]
   | Intermediate Flap 2: X in [-920, -620], Y in [-900, +900], Z in [110, 210]
   | Active Upper Flap 3: X in [-720, -475], Y in [-880, +880], Z in [190, 300]
   | Endplates (FWEP):    X in [-1250, -460], Y = ±925, Z in [65, 300]
   +----------------------------------------------------+
```

---

## 2. Component Dimensional Breakdown

| Assembly ID | Sub-Component | Material | Longitudinal $X$ (mm) | Lateral $Y$ (mm) | Vertical $Z$ (mm) | Notes / Tolerances |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `Body_FIS_Stage1` | Forward Crush Cone | Carbon-Aramid Sandwich | `[-1250, -850]` | `[-180, +180]` | `[150, 320]` | Absorbs $42.5\text{ kJ}$ initial energy |
| `Body_FIS_Stage2` | Secondary Survival Hull | Carbon-Dyneema Braid | `[-850, 0]` | `[-285, +285]` | `[140, 460]` | Crush force $\ge 500\text{ kN}$ |
| `Fastener_FIS_Stud_Ti` | 4x M14 Nose Spigots | Grade 5 Ti-6Al-4V | `0.0` | `[±160, ±160]` | `[180, 420]` | $>350\text{ kN}$ tensile pull-off |
| `Body_Wing_Mainplane` | Element 1 Profile | Intermediate-Modulus Carbon | `[-1220, -820]` | `[-925, +925]` | `[60, 115]` | High-camber leading edge ($R \ge 50\text{ mm}$) |
| `Pivot_Wing_Flap_LH_E2` | Element 2 LH Flap | High-Modulus Carbon | `[-920, -620]` | `[+120, +900]` | `[110, 210]` | Multi-slotted intermediate flap |
| `Pivot_Wing_Flap_RH_E2` | Element 2 RH Flap | High-Modulus Carbon | `[-920, -620]` | `[-900, -120]` | `[110, 210]` | Symmetrical RH profile |
| `Pivot_ActiveFlap_LH_E3` | Element 3 LH Active | Ultra-High Modulus Carbon | `[-720, -475]` | `[+140, +880]` | `[190, 300]` | Articulates $\alpha \in [6^\circ, 24^\circ]$ |
| `Pivot_ActiveFlap_RH_E3` | Element 3 RH Active | Ultra-High Modulus Carbon | `[-720, -475]` | `[-880, -140]` | `[190, 300]` | Actuation speed $\le 400\text{ ms}$ |
| `Body_FWEP_LH` | Left Endplate | Carbon Monocoque | `[-1250, -460]` | `+925.0` | `[65, 300]` | Inwash cambered profile |
| `Body_FWEP_RH` | Right Endplate | Carbon Monocoque | `[-1250, -460]` | `-925.0` | `[65, 300]` | Inwash cambered profile |
| `Body_Diveplane_LH` | Left Micro Diveplane | Prepreg Carbon | `[-1050, -850]` | `[+925, +985]` | `[160, 185]` | Max lateral projection $60\text{ mm}$ |
| `Body_Diveplane_RH` | Right Micro Diveplane | Prepreg Carbon | `[-1050, -850]` | `[-985, -925]` | `[160, 185]` | Radius $R \ge 15\text{ mm}$ |
| `Body_Actuator_EHA_LH` | Left Flap Actuator | Al-Li 2099 / Moog Valve | `[-560, -480]` | `+140.0` | `[220, 280]` | $200\text{ bar}$ hydraulics, $4.5\text{ kN}$ force |
| `Body_Actuator_EHA_RH` | Right Flap Actuator | Al-Li 2099 / Moog Valve | `[-560, -480]` | `-140.0` | `[220, 280]` | Titanium return springs |
| `Body_SlotGap_01..06` | 6x Slot Gap Separators | CNC Ti-6Al-4V | Distributed | Multi | Multi | $12.0\text{ mm}$ slot spacing, hall sensors |
| `Badge_SREdesigns` | Serial Plaque | Anodized Al / Canvas | `[-780, 0]` | `0.0` | `380.0` | High-DPI serial plaque |

---

## 3. Aerodynamic & Kinematic Equations

### 3.1 Aerodynamic Downforce & Drag
For an airspeed $v$ and air density $\rho = 1.225\text{ kg/m}^3$:
$$q = \frac{1}{2} \rho v^2$$
$$F_z = q \cdot S_{\text{wing}} \cdot C_L(\alpha)$$
$$F_x = q \cdot S_{\text{wing}} \cdot C_D(\alpha)$$
where $S_{\text{wing}} = 1.15\text{ m}^2$ is the projected planform area.

### 3.2 Aerodynamic Coefficients as a Function of Flap Angle $\alpha$
* **Lift Coefficient $C_L(\alpha)$:**
  $$C_L(\alpha) = 1.15 + 0.055 \cdot \alpha \quad (\alpha \in [6^\circ, 24^\circ])$$
  * Z-Mode ($\alpha = 24.0^\circ$): $C_L = 2.47 \implies F_z \approx 4,890\text{ N}$ at $250\text{ km/h}$.
  * X-Mode ($\alpha = 6.0^\circ$): $C_L = 1.48 \implies F_z \approx 2,930\text{ N}$ ($40\%$ downforce shed).
* **Drag Coefficient $C_D(\alpha)$:**
  $$C_D(\alpha) = 0.20 + 0.023 \cdot \alpha$$
  * Z-Mode ($\alpha = 24.0^\circ$): $C_D = 0.752 \implies F_x \approx 1,489\text{ N}$ at $250\text{ km/h}$.
  * X-Mode ($\alpha = 6.0^\circ$): $C_D = 0.338 \implies F_x \approx 670\text{ N}$ ($55.0\%$ drag shed!).
