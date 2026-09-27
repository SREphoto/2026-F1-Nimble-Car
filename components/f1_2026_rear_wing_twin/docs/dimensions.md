# 2026 Formula 1 Active Rear Wing & Endplate Assembly Specifications

## 1. Coordinate Reference System & Spatial Datums

All components are positioned relative to the Universal Chassis Datum $[0, 0, 0]$:
* **Datum Origin $[0, 0, 0]$**: Universal Reference Plane ($Z = 0\text{ mm}$ on ground skid block datum), Car Centerline ($Y = 0\text{ mm}$), Front Axle Centerline ($X = 0\text{ mm}$).
* **Rear Axle Centerline**: $X = +3,400.0\text{ mm}$, $Z = 355.0\text{ mm}$.
* **Swan-Neck Pylon Mounting Base (Gearbox Top Boss)**: $X = +3,460.0\text{ mm}$, $Y = \pm 110.0\text{ mm}$, $Z = 460.0\text{ mm}$.
* **Rear Wing Mainplane Span**: $X \in [+3,480.0, +3,820.0\text{ mm}]$, $Y \in [-525.0, +525.0\text{ mm}]$ ($1,050.0\text{ mm}$ total span), $Z \in [780.0, 910.0\text{ mm}]$.
* **Active Flap Hinge Axis**: $X = +3,680.0\text{ mm}$, $Z = 875.0\text{ mm}$.
* **Endplate Envelope**: $X \in [+3,420.0, +3,950.0\text{ mm}]$, $Y = \pm 525.0\text{ mm}$, $Z \in [620.0, 940.0\text{ mm}]$.

---

## 2. Component Dimensional Breakdown

| Assembly Node | Description | Dimensions ($X \times Y \times Z$) | Material | Mass Target |
| :--- | :--- | :--- | :--- | :--- |
| `Body_RearWing_Mainplane_Carbon` | Fixed cambered spoon carbon mainplane | $340 \times 1050 \times 110\text{ mm}$ | Torayca T1000 High-Modulus CFRP | $4.85\text{ kg}$ |
| `Body_RearWing_AuxFlap_Carbon` | Articulating intermediate flap | $140 \times 1040 \times 35\text{ mm}$ | Torayca T800 Prepreg Carbon | $1.75\text{ kg}$ |
| `Pivot_RearWing_UpperFlap` | Primary articulating active wing flap | $190 \times 1040 \times 42\text{ mm}$ | Torayca T1000 / Rohacell core | $2.65\text{ kg}$ |
| `Body_RearWing_Pylon_LH` | Left swan-neck aerodynamic support pylon | $380 \times 24 \times 420\text{ mm}$ | Structural Ti-6Al-4V / CFRP | $1.45\text{ kg}$ |
| `Body_RearWing_Pylon_RH` | Right swan-neck aerodynamic support pylon | $380 \times 24 \times 420\text{ mm}$ | Structural Ti-6Al-4V / CFRP | $1.45\text{ kg}$ |
| `Body_RearWing_Endplate_LH` | Left vertical planar endplate | $530 \times 12 \times 320\text{ mm}$ | High-impact autoclaved CFRP | $1.85\text{ kg}$ |
| `Body_RearWing_Endplate_RH` | Right vertical planar endplate | $530 \times 12 \times 320\text{ mm}$ | High-impact autoclaved CFRP | $1.85\text{ kg}$ |
| `Body_RearWing_Actuator_Hyd` | High-speed Moog electro-hydraulic ram | $\varnothing 32 \times 125\text{ mm}$ stroke $38\text{ mm}$ | Billet Ti-6Al-4V & Hard Chrome | $0.85\text{ kg}$ |
| `Body_RearWing_ReturnSpring_Ti` | Failsafe mechanical titanium return springs | $\varnothing 28 \times 95\text{ mm}$ (dual pre-loaded) | Grade 5 Ti-6Al-4V Spring Wire | $0.42\text{ kg}$ |
| `Fastener_PylonMount_M10_01..04` | 4x M10 gearbox pylon mounting studs | $\varnothing 10 \times 50\text{ mm}$ | Grade 5 Ti-6Al-4V Titanium | $0.20\text{ kg}$ |
| `Fastener_FlapPivot_M8_01..04` | 4x M8 active hinge shoulder pins | $\varnothing 8 \times 35\text{ mm}$ | Grade 5 Ti-6Al-4V Titanium | $0.14\text{ kg}$ |
| `Fastener_EndplateMount_M6_01..12`| 12x M6 countersunk titanium bolts | $\varnothing 6 \times 20\text{ mm}$ | Grade 5 Ti-6Al-4V Titanium | $0.18\text{ kg}$ |

Total Dry Subsystem Mass: **$17.64\text{ kg}$**

---

## 3. Aerodynamic & Kinematic Equations

### 3.1 Active Wing Articulation & Drag Reduction
At air speed $v_\infty = 300\text{ km/h}$ ($83.33\text{ m/s}$), standard air density $\rho = 1.225\text{ kg/m}^3$:
$$q_\infty = \frac{1}{2} \rho v_\infty^2 = \frac{1}{2} (1.225) (83.33^2) \approx 4,253.5\text{ Pa}$$
* **Z-Mode (Cornering / High Downforce):**
  $$\alpha_{\text{flap}} = 26.0^\circ, \quad C_L = 2.15, \quad C_D = 0.68$$
  $$F_z = C_L \cdot q_\infty \cdot A_{\text{ref}} = 2.15 \cdot 4253.5 \cdot (1.05 \times 0.42) \approx 4,032\text{ N}$$
  $$F_x = C_D \cdot q_\infty \cdot A_{\text{ref}} = 0.68 \cdot 4253.5 \cdot (1.05 \times 0.42) \approx 1,275\text{ N}$$

* **X-Mode (Straight-Line / Low Drag):**
  $$\alpha_{\text{flap}} = 3.0^\circ, \quad C_L = 0.72, \quad C_D = 0.28$$
  $$F_z = 0.72 \cdot 4253.5 \cdot 0.441 \approx 1,351\text{ N} \quad (-66.5\%)$$
  $$F_x = 0.28 \cdot 4253.5 \cdot 0.441 \approx 525\text{ N} \quad (-58.8\%)$$

### 3.2 Failsafe Slew Kinematics
$$\tau_{\text{spring}} = k_\theta (\theta_{\text{current}} - \theta_{\text{Z-mode}})$$
Upon system pressure drop ($P_{\text{hyd}} < 120\text{ bar}$):
$$t_{\text{close}} \le 0.150\text{ s} \quad (150\text{ ms})$$
Guaranteeing aerodynamic downforce restoration prior to vehicle turn-in.
