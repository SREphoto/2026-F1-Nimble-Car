# 2026 Formula 1 Survival Cell Monocoque Specification & Dimensions
## Master Chassis Datum, Crashworthiness, and Structural Interfaces

**Assembly Name:** `Body_SurvivalCell_Assembly`  
**Governing Standard:** FIA 2026 Formula 1 Technical Regulations (Article C13 & C14)  
**Classification:** High-Fidelity Piecewise Procedural CAD Digital Twin  

---

## 1. Reference Datums & Global Coordinate System

* **Universal Origin $[0, 0, 0]$:**
  * $X = 0.00\text{ mm}$ coincides with the **Front Wheel Centerline**.
  * $Y = 0.00\text{ mm}$ coincides with the **Car Centerline** (plane of symmetry).
  * $Z = 0.00\text{ mm}$ coincides with the **Reference Plane** (bottom surface of the survival cell).
* **Key Station Coordinates ($X$-Axis):**
  * $X = -850.00\text{ mm}$: Front Impact Structure (FIS) nosecone apex.
  * $X = -450.00\text{ mm}$: Bulkhead A-A (Front face of the survival cell, chassis nose bulkhead).
  * $X = 0.00\text{ mm}$: Front Axle Centerline.
  * $X = +550.00\text{ mm}$: Cockpit forward opening rim / steering column entry.
  * $X = +1,150.00\text{ mm}$: Driver H-point (hip pivot coordinate).
  * $X = +1,420.00\text{ mm}$: Primary Roll Hoop apex & combustion air intake.
  * $X = +1,750.00\text{ mm}$: Bulkhead B-B (Rear face of survival cell / ICE mounting interface).
  * $X = +3,400.00\text{ mm}$: Rear Wheel Centerline (shortened 2026 wheelbase: $3,400\text{ mm}$).

---

## 2. Structural Construction & Materials

* **Monocoque Sandwich Skin:**
  * Outer Face: 12-ply ultra-high-modulus autoclaved carbon fiber (Torayca M46J / T800S hybrid weave).
  * Anti-Intrusion Core: $6.20\text{ mm}$ Zylon (PBO) / Dyneema ballistic penetration barrier along the entire driver cockpit flank.
  * Structural Core: Aluminum 5056 / Nomex honeycomb core ($15.00\text{ mm}$ thickness, density $48\text{ kg/m}^3$).
  * Inner Face: 8-ply carbon-aramid weave with fire-retardant epoxy matrix.
  * Total Bare Tub Mass: **$44.50\text{ kg}$**.
  * Torsional Rigidity: **$44,500\text{ Nm/degree}$** between front and rear axle planes.

---

## 3. Dedicated Structural Assemblies

### 3.1 `Safety_Halo_Titanium`
* **Material:** Forged & welded Aerospace Grade 5 Titanium (**Ti-6Al-4V**).
* **Mass:** Strictly **$7.00\text{ kg}$** bare titanium hoop.
* **Proof Test Loads (FIA Standard 8869-2018):**
  * Forward/Downward Load: **$125.0\text{ kN}$** applied at the center pillar.
  * Lateral Load: **$125.0\text{ kN}$** applied to the side hoop arch.
  * Vertical Crush Load: **$116.0\text{ kN}$** applied from above.
* **Mounting Interfaces:**
  * Forward Pillar: M14 Grade 5 titanium shear spigot into Bulkhead A-A.
  * Rear Mounts: Dual M12 titanium clevis bolts anchored into the rear cockpit bulkhead.
* **Aerodynamic Transition Fairing:** $1.0\text{ mm}$ autoclaved carbon fiber aerodynamic sheath with trailing boundary layer trip vanes.

### 3.2 `Safety_RollHoop_Airbox`
* **Proof Load:** Raised under 2026 regulations to **$172.0\text{ kN}$** (~20g deceleration) with rounded apex ($R \ge 10.0\text{ mm}$) to prevent track digging during rollover.
* **Forward Test Load:** $100.0\text{ kN}$ forward horizontal load with permanent deformation $< 25.0\text{ mm}$.
* **Internal Airbox Ducting:**
  * Lower Splitter: Feeds combustion air directly to the single turbocharger compressor inlet of the 1.6L V6 engine ($0.38\text{ kg/s}$ mass flow).
  * Upper Splitter: Feeds pressurized cooling air to the hybrid energy store and gearbox oil heat exchangers.

### 3.3 `Body_SIPS_CrushTube_01..04` (Side Impact Protection)
* **Standard:** Standardized FIA carbon-composite crush tubes (two per side).
* **Energy Absorption:** Each pair absorbs **$40.0\text{ kJ}$** of lateral impact energy under static push/pull crush tests.

### 3.4 Inboard Suspension Hardpoints (Front Bulkhead)
* **Upper Wishbone Forward Pivot:** $[X = -120\text{ mm}, Y = \pm 285\text{ mm}, Z = 420\text{ mm}]$
* **Upper Wishbone Rearward Pivot:** $[X = +180\text{ mm}, Y = \pm 295\text{ mm}, Z = 405\text{ mm}]$
* **Lower Wishbone Forward Pivot:** $[X = -140\text{ mm}, Y = \pm 245\text{ mm}, Z = 145\text{ mm}]$
* **Lower Wishbone Rearward Pivot:** $[X = +210\text{ mm}, Y = \pm 260\text{ mm}, Z = 180\text{ mm}]$ ($14.2^\circ$ anti-dive inclination rake).
* **Pull-Rod Inboard Bellcrank Axis:** $[X = +45\text{ mm}, Y = \pm 110\text{ mm}, Z = 460\text{ mm}]$
* **Steering Rack Cradle Centerline:** $[X = -85\text{ mm}, Y = 0.00\text{ mm}, Z = 260\text{ mm}]$
