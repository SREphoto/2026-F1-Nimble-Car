# 2026 Formula 1 Front Brake Corner Specification & Dimensions
## Piecewise CAD Engineering, Thermal Limits, and Kinematics

**Assembly Name:** `Assembly_FrontBrakeCorner_LH`  
**Governing Standard:** FIA 2026 Formula 1 Technical Regulations (Article C5 & C11)  
**Classification:** High-Fidelity Piecewise Procedural CAD Digital Twin  

---

## 1. Physical Component Dimensions & Tolerances

### 1.1 `Brake_Disc_Ventilated_Front`
* **Outer Diameter ($D_o$):** $345.00\text{ mm} \pm 0.05\text{ mm}$
* **Inner Bore Diameter ($D_i$):** $195.00\text{ mm} \pm 0.05\text{ mm}$
* **Thickness ($T$):** $34.00\text{ mm}$ (FIA 2026 maximum legal envelope)
* **Material:** Polyacrylonitrile (PAN) 3D needled Carbon/Carbon (C/C) composite matrix
* **Density:** $\rho = 1.78\text{ g/cm}^3$ (Total finished disc mass: $\approx 1,420\text{ g}$)
* **Micro-Ventilation Cooling Array:**
  * Number of Radial Holes: **$1,400$ individual laser-drilled passages**
  * Hole Diameter: strictly **$2.50\text{ mm}$** (FIA legal minimum ceiling)
  * Pattern: 5-row staggered spiral chevron array ($\Delta \theta = 2.57^\circ$, radial pitch $3.80\text{ mm}$)
  * Airflow: Centrifugal pumping effect discharging up to $0.18\text{ kg/s}$ air at $300\text{ km/h}$
* **Inner Drive Interface:**
  * 12 semi-circular drive notches with radial expansion slots
  * Slot Width: $12.00\text{ mm}$
  * Radial Float: $0.80\text{ mm}$ radial expansion slip allowance
  * Tangential Clearance: $0.05\text{ mm}$ (zero rotational backlash)

### 1.2 `Brake_Bell_Floating_Titanium`
* **Material:** Forged Aerospace Titanium **Ti-6Al-4V** (Solution Treated & Aged)
* **Yield Strength:** $\sigma_y \ge 910\text{ MPa}$, Elastic Modulus $E = 114\text{ GPa}$
* **Dimensions:**
  * Outer Flange Diameter: $\varnothing 235.00\text{ mm}$
  * Dish Offset Depth: $42.00\text{ mm}$
  * Wall Thickness: $3.00\text{ mm}$ nominal
  * Center Bore: $\varnothing 95.00\text{ mm}$
* **Weight-Reduction Architecture:**
  * 12 triangular CNC-milled scallops through the conical dish wall (Finished bell mass: **$820\text{ g}$**)
* **Wheel & Spindle Interface:**
  * 5 precision-ground tapered drive pin holes on a $120.00\text{ mm}$ Pitch Circle Diameter (PCD)
  * Central M56 multi-start locking thread for single captive wheel nut

### 1.3 `Drive_Bobbins_Titanium_01..12` & Spring Hardware
* **Material:** Grade 5 Ti-6Al-4V with micro-peened finish
* **Dimensions:**
  * Base Cylinder: $\varnothing 18.00\text{ mm} \times 6.00\text{ mm}$
  * Shoulder Cylinder: $\varnothing 12.00\text{ mm} \times 14.00\text{ mm}$
  * Drive Flats: $10.00\text{ mm}$ parallel width
  * Center Bore: $\varnothing 6.20\text{ mm}$
* **Fastener:** M6 Grade 5 Titanium socket-head bolt (`Fastener_BobbinBolt_M6_01..12`)
* **Spring Washer:** Cupped conical Belleville spring washer (`Fastener_Belleville_01..12`) delivering $150\text{ N}$ axial pre-load damping

### 1.4 `Brake_Caliper_Monobloc_Front`
* **Material:** Forged Lithium-Aluminum alloy **Al-Li 2099-T83** ($\rho \approx 2.63\text{ g/cm}^3$, $E = 79\text{ GPa}$, $\sigma_y \ge 520\text{ MPa}$)
* **Architecture:** 6-piston differential-bore monobloc (three pistons per bank)
* **Piston Bores:**
  * Leading Bore: **$\varnothing 27.00\text{ mm}$**
  * Center Bore: **$\varnothing 32.00\text{ mm}$**
  * Trailing Bore: **$\varnothing 38.00\text{ mm}$**
* **Stiffness:** Monolithic twin bridge arches; bridge deflection under $180\text{ bar}$ line pressure strictly **$< 0.08\text{ mm}$**
* **Hydraulics:** Internal gun-drilled cross-over galleries ($\varnothing 4.20\text{ mm}$), M10x1.0 fluid inlet, dual M10 bleed screws with $60^\circ$ conical seats

### 1.5 `Piston_Hydraulic_Front_01..06` & Dynamic Seals
* **Material:** Ti-6Al-4V with Diamond-Like Carbon (DLC) low-friction skirt coating ($Ra \le 0.05\ \mu\text{m}$)
* **Castellated Crown:** 10 CNC-milled radial crown slots ($3.00\text{ mm}$ wide $\times 4.00\text{ mm}$ deep) reducing pad contact area by $60\%$
* **Dynamic Seals:** EPDM square-section pressure seal ring providing **$0.15\text{ mm}$ elastic rollback retraction** upon hydraulic release

### 1.6 `Brake_Pad_Carbon_Inboard/Outboard`
* **Dimensions:** Length $185.00\text{ mm}$, height $72.00\text{ mm}$, friction thickness $20.00\text{ mm}$
* **Backing Plate:** $5.00\text{ mm}$ sintered titanium backing plate with ceramic thermal barrier
* **Pad Pins:** 2x $\varnothing 8.00\text{ mm}$ titanium pins secured with stainless safety R-clips

---

## 2. Dynamic Physics & Governing Equations

### 2.1 Friction Clamping & Braking Torque
For hydraulic line pressure $P_{\text{hyd}}$:
$$F_{\text{clamp}} = P_{\text{hyd}} \cdot \sum_{i=1}^{3} A_{\text{piston}, i} = P_{\text{hyd}} \cdot \frac{\pi}{4} \left(27^2 + 32^2 + 38^2\right) \times 10^{-6} \text{ m}^2$$
$$\sum A_{\text{piston}} = \frac{\pi}{4} (729 + 1024 + 1444) = 2,510.8\text{ mm}^2 = 2.511 \times 10^{-3}\text{ m}^2$$
At maximum line pressure $P_{\text{hyd}} = 180\text{ bar} = 18.0\text{ MPa}$:
$$F_{\text{clamp}} = 18.0 \times 10^6 \times 2.511 \times 10^{-3} \approx 45,195\text{ N} \approx 45.2\text{ kN}$$

Frictional retarding torque per front corner (effective radius $r_{\text{eff}} \approx 0.135\text{ m}$, friction coefficient $\mu \approx 0.52$):
$$T_{\text{brake}} = 2 \cdot \mu \cdot F_{\text{clamp}} \cdot r_{\text{eff}} = 2 \times 0.52 \times 45,195 \times 0.135 \approx 6,345\text{ Nm}$$

### 2.2 Thermal Energy Generation & Blackbody Radiation
Friction thermal power dissipated:
$$\dot{Q}_{\text{in}} = T_{\text{brake}} \cdot \omega_{\text{wheel}}$$
Thermal radiation cooling (Stefan-Boltzmann law):
$$\dot{Q}_{\text{rad}} = \epsilon \cdot \sigma_{\text{SB}} \cdot A_{\text{disc}} \cdot \left(T^4 - T_{\text{amb}}^4\right)$$
where $\sigma_{\text{SB}} = 5.67 \times 10^{-8}\text{ W}/(\text{m}^2\cdot\text{K}^4)$, emissivity $\epsilon \approx 0.88$ for oxidized carbon-carbon.
Centrifugal forced convection cooling:
$$\dot{Q}_{\text{conv}} = h_{\text{conv}}(\omega) \cdot A_{\text{vent}} \cdot (T - T_{\text{air}})$$
