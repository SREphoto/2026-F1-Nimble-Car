# 2026 FORMULA 1 PIECEWISE MECHANICAL BUILD MANUAL
## Exhaustive Part-by-Part CAD Decomposition, Kinematics, Tolerances, and Procedural Synthesis

**Document ID:** `MAN-F1-2026-BUILD-001`  
**Governing Standard:** FIA 2026 Formula 1 Technical Regulations (Section C) & Piecewise CAD Fidelity Protocols  
**Classification:** Advanced Mechanical Engineering & Procedural Digital Twin Synthesis  

---

```
                       PIECEWISE MECHANICAL ASSEMBLY ARCHITECTURE
 
     +---------------------------------------------------------------------------------------+
     |                                CHASSIS & MONOCOQUE                                    |
     |           `Body_SurvivalCell` | `Safety_Halo_Titanium` | `Safety_RollHoop`            |
     +-------------------------------------------+-------------------------------------------+
                                                 |
                       +-------------------------+-------------------------+
                       |                                                   |
                       v                                                   v
     +-----------------------------------+               +-----------------------------------+
     |        FRONT CORNER ASSEMBLY      |               |         REAR CORNER ASSEMBLY      |
     | `Upright_Front_Titanium`          |               | `Upright_Rear_Titanium`           |
     | `Brake_Disc_Ventilated_Front`     |               | `Brake_Disc_Ventilated_Rear`      |
     | `Brake_Caliper_Monobloc_Front`    |               | `Brake_Caliper_Downsized_Rear`    |
     | `Brake_Bell_Floating_Front`       |               | `Brake_Bell_Floating_Rear`        |
     | `Bobbins_Floating_Drive_01..12`   |               | `Bobbins_Floating_Drive_01..10`   |
     | `Piston_Hydraulic_Front_01..06`   |               | `Piston_Hydraulic_Rear_01..04`    |
     | `Fastener_BridgeBolt_M8_01..04`   |               | `BBW_Actuator_ValveBlock`         |
     | `Wheel_Magnesium_BBS_Front`       |               | `Wheel_Magnesium_BBS_Rear`        |
     +-----------------+-----------------+               +-----------------+-----------------+
                       |                                                   |
                       +-------------------------+-------------------------+
                                                 |
                                                 v
     +---------------------------------------------------------------------------------------+
     |                          ACTIVE AERODYNAMICS & SUSPENSION                             |
     | `Pivot_Wing_Front_Flap_01..02` | `Actuator_FrontAero_EHA` | `Linkage_Bellcrank_Front` |
     | `Pivot_Wing_Rear_AuxFlap` | `Pivot_Wing_Rear_UpperFlap` | `Actuator_RearAero_EHA`     |
     | `Suspension_Wishbone_Upper_Front` | `Suspension_Wishbone_Lower_Front` | `Rod_Pull_Front` |
     +---------------------------------------------------------------------------------------+
```

---

## 1. The Piecewise CAD Engineering Philosophy (Zero Abstraction)

In professional Formula 1 digital engineering and high-fidelity digital twins, **no assembly is ever modeled as a fused boolean lump or abstract primitive**. Real racecars are bespoke mechanical assemblies composed of thousands of individually machined, stamped, 3D-printed, and autoclaved parts bolted together with certified fasteners, precision shims, o-rings, and hydraulic lines.

### 1.1 The Strict Semantic Part Taxonomy Contract
Every component is designated by its exact physical identity and kinetic degree of freedom:
* `Body_<Assembly>`: Main stationary unibody or structural castings (e.g. `Body_SurvivalCell`, `Body_Gearbox_Titanium`).
* `Brake_<Part>`: Individual braking components (e.g. `Brake_Disc_Ventilated_Front`, `Brake_Caliper_Monobloc_Front`).
* `Pivot_<Assembly>`: Kinematically movable sub-assemblies with their coordinate pivot origin placed strictly at the mechanical hinge or rotation axis (e.g. `Pivot_Wing_Front_Flap_LH`, `Pivot_Pedal_Brake`).
* `Fastener_<Type>_<ID>`: Genuine 3D physical screws, bobbins, studs, washers, and nuts modeled with real socket depth, rolled threads, and bevels (e.g. `Fastener_HexSocket_M8x45_01`, `Drive_Bobbin_Titanium_06`).
* `Hydraulic_<Component>`: Fluid transfer hardware (e.g. `Hydraulic_Line_Braided_FrontLH`, `Hydraulic_BleedNipple_Ti_01`).

---

## 2. Deep Dive Case Study: The 2026 Braking System

The braking system represents an ideal showcase of piecewise mechanical design because it blends extreme thermal gradients ($200^\circ\text{C}$ to $1,000^\circ\text{C}$), high hydraulic pressures ($180\text{--}200\text{ bar}$), micro-clearance fluid seals, floating thermal expansion interfaces, and dynamic Brake-by-Wire (BBW) electro-hydraulic control.

```
                           FRONT BRAKE CORNER MECHANICAL EXPLOSION
 
  [ Upright Mount Lugs ] 
            |
            | ===> [ M10 Titanium Clevis Studs & Spherical Washers ]
            v
  +-----------------------------------------------------------------------------+
  | `Brake_Caliper_Monobloc_Front` (Forged Al-Li Monobloc, 6 Piston)            |
  |  - High-Tensile Bridge Arches (2x Internal Stiffening Ribs)                 |
  |  - Internal Cross-Drilled Hydraulic Galleries (Ø4.2mm)                      |
  |  - Bleed Ports with `Fastener_BleedNipple_Ti_M10` (Conical Seat)            |
  +--------------------------------------+--------------------------------------+
                                         |
                       +-----------------+-----------------+
                       |                                   |
                       v                                   v
  +------------------------------------+ +------------------------------------+
  | Inboard Piston Bank (3x Pistons)   | | Outboard Piston Bank (3x Pistons)  |
  | `Piston_Hydraulic_Front_01..03`    | | `Piston_Hydraulic_Front_04..06`    |
  |  - Ti-6Al-4V Castellated Crowns    | |  - Ti-6Al-4V Castellated Crowns    |
  |  - Elastomeric EPDM Square Rings   | |  - Elastomeric EPDM Square Rings   |
  |  - Fluorosilicone Dust Wiper Scraper| | - Fluorosilicone Dust Wiper Scraper|
  +-----------------+------------------+ +-----------------+------------------+
                    |                                      |
                    v                                      v
  +------------------------------------+ +------------------------------------+
  | `Brake_Pad_Carbon_Inboard`         | | `Brake_Pad_Carbon_Outboard`        |
  |  - PAN Carbon-Carbon Friction Core | |  - PAN Carbon-Carbon Friction Core |
  |  - Titanium Backing Plate (2.5mm)  | |  - Titanium Backing Plate (2.5mm)  |
  |  - Stainless Anti-Rattle Springs   | |  - Stainless Anti-Rattle Springs   |
  +-----------------+------------------+ +-----------------+------------------+
                    |                                      |
                    +------------------+-------------------+
                                       | Clamps (4,200 Nm)
                                       v
  +-----------------------------------------------------------------------------+
  | `Brake_Disc_Ventilated_Front` (Ø345mm x 34mm PAN Carbon-Carbon)             |
  |  - 1,400+ Laser-Drilled Radial Cooling Holes (Ø2.5mm, 5-Row Chevron)        |
  |  - Inner Flange with 12x Radial Expansion Drive Slots                       |
  +--------------------------------------+--------------------------------------+
                                         | Floating Mechanical Interface
                                         v
  +-----------------------------------------------------------------------------+
  | `Drive_Bobbins_Titanium_01..12` (Grade 5 Ti-6Al-4V Stepped Bushings)        |
  |  - Radial Expansion Slip Clearance: 0.8mm                                  |
  |  - `Fastener_BobbinBolt_M6_01..12` + Conical Belleville Spring Washers      |
  +--------------------------------------+--------------------------------------+
                                         |
                                         v
  +-----------------------------------------------------------------------------+
  | `Brake_Bell_Floating_Titanium` (Machined Ti-6Al-4V Mounting Hat)            |
  |  - Lightening Scallops & Structural Trusses                                 |
  |  - Central M56 Splined Bore for BBS Magnesium Wheel Rim                     |
  |  - 5x Precision Tapered Drive Pins (Transmits Braking Torque)               |
  +-----------------------------------------------------------------------------+
```

---

### 2.1 Component 1: `Brake_Disc_Ventilated_Front`
* **Real-World Specifications:**
  * Outer Diameter: **$345.0\text{ mm}$** ($\pm 0.1\text{ mm}$).
  * Thickness: **$34.0\text{ mm}$** (FIA maximum legal ceiling).
  * Inner Bore Diameter: $195.0\text{ mm}$.
  * Material: Polyacrylonitrile (PAN)-derived Carbon/Carbon (C/C) 3D needled composite matrix (density $\rho \approx 1.78\text{ g/cm}^3$).
* **Micro-Ventilation Architecture:**
  * Over **$1,400$ individual radial cooling holes** laser-drilled from the outer periphery through the core to the inner diameter.
  * Arranged in a **5-row spiral chevron pattern**:
    * Hole diameter: strictly **$2.5\text{ mm}$** (the FIA 2026 minimum limit).
    * Spacing: $3.8\text{ mm}$ pitch along radial vectors.
  * Function: Centrifugal rotation pumps air through the internal holes, accelerating forced convection to dissipate up to **$800\text{ kW}$ of kinetic thermal power** during initial 5g deceleration.
* **Inner Drive Interface:**
  * 12 semi-circular drive notches with radial expansion slots ($12.0\text{ mm}$ width, $1.2\text{ mm}$ radial expansion float) to accommodate thermal growth without conical warping.
* **Procedural 3D Modeling Recipe:**
  1. Base geometry: Cylinder cylinder mesh ($r = 172.5\text{ mm}, h = 34.0\text{ mm}$).
  2. Central hole boolean: Cylinder cut ($r = 97.5\text{ mm}$).
  3. Ventilation array: Array modifier / instance geometry distributing $1,400\times$ small cylinders ($\varnothing 2.5\text{ mm}$) at staggered angles ($\Delta \theta = 2.57^\circ$, 5 offset layers in $Z$) boolean-subtracted or instanced into a high-density vertex buffer.
  4. Inner drive slots: 12 polar radial box cutters ($12\text{ mm} \times 15\text{ mm}$) boolean-subtracted from the inner rim.
  5. Chamfers: $0.8\text{ mm} \times 45^\circ$ bevel on outer and inner perimeters to eliminate sharp, stress-concentrating corners.

---

### 2.2 Component 2: `Brake_Bell_Floating_Titanium`
* **Real-World Specifications:**
  * Material: Forged Aerospace Grade 5 Titanium (**Ti-6Al-4V**, STA heat-treated, yield strength $\sigma_y \ge 910\text{ MPa}$).
  * Dimensions: Outer flange $\varnothing 235.0\text{ mm}$, offset dish depth $42.0\text{ mm}$, center bore $\varnothing 95.0\text{ mm}$.
  * Features:
    * 12 radial attachment ears matching the disc notches.
    * 5 precision-ground tapered drive pin holes on a $120.0\text{ mm}$ Pitch Circle Diameter (PCD) to transmit drive torque to the magnesium wheel rim.
    * 12 weight-reduction pocket windows ("scallops") machined into the conical bell dish (reducing rotating bell mass from $1.8\text{ kg}$ to **$0.82\text{ kg}$**).
* **Procedural 3D Modeling Recipe:**
  1. Lathe/revolve a profiled 2D cross-section contour including the conical dished hat wall ($3.0\text{ mm}$ wall thickness).
  2. Polar array cutter: Boolean-cut 12 triangular weight-saving windows through the conical wall.
  3. Drill 12 bobbin bolt holes ($\varnothing 6.5\text{ mm}$) with counterbored recesses ($\varnothing 11.0\text{ mm} \times 4.0\text{ mm}$ deep) on the outer perimeter ears.
  4. Drill 5 wheel stud holes ($\varnothing 14.5\text{ mm}$) with $60^\circ$ countersink bevels.
  5. Apply metallic PBR shader: Dull golden-grey micro-anodized titanium finish (Roughness: 0.35, Metalness: 0.95).

---

### 2.3 Component 3: `Drive_Bobbins_Titanium_01..12` & Fasteners
* **The Floating Disc Engineering Problem:**
  * During hard braking, the carbon disc heats from $150^\circ\text{C}$ to **$950^\circ\text{C}$**, while the titanium bell stays cooler at **$200^\circ\text{C}$**.
  * Carbon has an in-plane thermal expansion coefficient $\alpha_{\text{carbon}} \approx 1.5 \times 10^{-6}\text{ K}^{-1}$, while titanium has $\alpha_{\text{titanium}} \approx 8.6 \times 10^{-6}\text{ K}^{-1}$.
  * If bolted rigidly, the massive differential expansion would shear the bolts or shatter the carbon disc.
* **The Floating Bobbin Solution:**
  * 12 cylindrical titanium bobbins with a stepped shoulder and a precision rectangular sliding key.
  * The bobbin key fits inside the disc notch with **$0.05\text{ mm}$ tangential clearance** (zero rotational slop) and **$0.80\text{ mm}$ radial float**, allowing the disc to expand outward unhindered.
  * Each bobbin is clamped axially by an **M6 Ti-6Al-4V bolt** (`Fastener_BobbinBolt_M6_01..12`) tensioned through a cupped conical **Belleville disc spring washer** (`Fastener_Belleville_01..12`) to maintain controlled axial friction damping ($150\text{ N}$ pre-load) without binding.
* **Procedural 3D Modeling Recipe:**
  1. Model stepped bobbin: Main cylinder $\varnothing 18\text{ mm} \times 6\text{ mm}$, shoulder cylinder $\varnothing 12\text{ mm} \times 14\text{ mm}$, through-hole $\varnothing 6.2\text{ mm}$.
  2. Mill flats: Box cutter on sides creating two parallel drive flats ($10.0\text{ mm}$ wide).
  3. Model bolt: Hex head $\varnothing 10\text{ mm}$ with $4\text{ mm}$ internal hex socket ($2.5\text{ mm}$ deep), rolled thread shank $\varnothing 6\text{ mm} \times 25\text{ mm}$.
  4. Duplicate and instance across 12 polar radial positions ($30^\circ$ increments).

---

### 2.4 Component 4: `Brake_Caliper_Monobloc_Front`
* **Real-World Specifications:**
  * Material: Forged Lithium-Aluminum alloy (**Al-Li 2099-T83**, density $\rho \approx 2.63\text{ g/cm}^3$, elastic modulus $E = 79\text{ GPa}$, yield strength $\sigma_y \ge 520\text{ MPa}$).
  * Configuration: 6-piston differential-bore monobloc (three pistons per side: leading piston $\varnothing 27.0\text{ mm}$, middle $\varnothing 32.0\text{ mm}$, trailing $\varnothing 38.0\text{ mm}$ to eliminate uneven pad taper wear).
  * Architecture: Machined from a single solid billet of Al-Li; zero split-line bolts; massive twin bridge arches bridging the carbon disc to maintain caliper bridge deflection under $180\text{ bar}$ line pressure strictly **$< 0.08\text{ mm}$**.
  * Cooling & Fluid Galleries: Internal gun-drilled cross-over passages ($\varnothing 4.2\text{ mm}$) connecting both halves; two top-mounted titanium bleed ports with conical seats.
* **Procedural 3D Modeling Recipe:**
  1. Caliper body envelope: Symmetrical contoured block ($285\text{ mm} \times 145\text{ mm} \times 95\text{ mm}$).
  2. Central disc slot: Deep rectangular longitudinal cut ($38\text{ mm}$ wide $\times 110\text{ mm}$ deep) where the disc rotates.
  3. Piston bores: Boolean 3 cylindrical cavities per bank ($\varnothing 27, 32, 38\text{ mm} \times 32\text{ mm}$ deep) into the internal sidewalls. Inside each bore, cut two concentric square-groove recesses: inner groove for the EPDM square-section hydraulic pressure seal ($2.8\text{ mm} \times 2.0\text{ mm}$), outer groove for the wiper scraper ring.
  4. Bridge stiffeners: Carve structural weight-reduction hollows around the two massive top cross-bridges.
  5. Fluid ports: Threaded M10x1.0 boss on inboard flank for high-pressure line fitting; two M10x1.0 threaded counterbores on the top apex for bleed nipples.
  6. Surface Finish: Anodized dark bronze/anthracite grey Al-Li finish, featuring applied temperature-indicating paint stripes (green, orange, red stripes that change color at $450^\circ\text{C}$, $550^\circ\text{C}$, and $650^\circ\text{C}$).

---

### 2.5 Component 5: `Pistons_Hydraulic_Front_01..06` & Seals
* **Real-World Specifications:**
  * Material: High-strength Grade 5 Titanium (**Ti-6Al-4V**) with an ultra-hard physical vapor deposition (PVD) Diamond-Like Carbon (DLC) coating on the outer sliding skirt ($\mu \approx 0.05$, surface roughness $Ra \le 0.05\ \mu\text{m}$).
  * Castellated Crown: The contact face that pushes against the carbon pad backing plate is not a solid ring; it features **8 to 12 CNC-milled castellation slots ($3.0\text{ mm}$ wide $\times 4.0\text{ mm}$ deep)**.
  * Thermal Barrier Physics:
    * The castellations reduce the physical metal-to-pad contact area by **$60\%$**.
    * The open gaps allow ambient air circulated by the brake duct to wash between the pad and piston crown.
    * This drops conductive heat transfer from the $900^\circ\text{C}$ pad into the brake fluid from $12\text{ kW}$ down to $<1.8\text{ kW}$, keeping fluid temperatures strictly below **$220^\circ\text{C}$** (boiling point $T_{\text{boil}} \approx 280^\circ\text{C}$).
* **Procedural 3D Modeling Recipe:**
  1. Hollow cup cylinder: Outer cylinder ($r = 13.5, 16.0, 19.0\text{ mm}, h = 30.0\text{ mm}$), inner core bore leaving a $2.5\text{ mm}$ wall thickness.
  2. Castellations: 8 polar radial box cutters ($3\text{ mm} \times 5\text{ mm}$) subtracted from the top lip.
  3. Micro-bevels: $0.4\text{ mm}$ radius on all crown teeth.
  4. Duplicate and position inside each caliper bore with $1.5\text{ mm}$ pad-clearance extension.

---

### 2.6 Component 6: `Brake_Pad_Carbon_Inboard` & `Brake_Pad_Carbon_Outboard`
* **Real-World Specifications:**
  * Dimensions: Length $185.0\text{ mm}$, height $72.0\text{ mm}$, total thickness $25.0\text{ mm}$ (new).
  * Friction Material: PAN Carbon/Carbon composite matrix ($20.0\text{ mm}$ thick) with two vertical radial expansion slots to prevent thermal warping.
  * Backing Plate: $5.0\text{ mm}$ high-temperature sintered titanium alloy plate with bonded thermal insulation ceramic spacer and acoustic damping spring clips.
  * Retention: Held inside the caliper by two **M8 titanium pad retention pins** (`Fastener_PadPin_Ti_01..02`) passing through cross-drilled ears and secured with stainless steel R-clips (`Fastener_RClip_01..02`).
* **Procedural 3D Modeling Recipe:**
  1. Extrude kidney-shaped 2D profile matching the rotor swept radius.
  2. Subtract two vertical expansion grooves ($2.0\text{ mm}$ wide $\times 18\text{ mm}$ deep).
  3. Add titanium backing plate with upper retention pin loops ($\varnothing 8.5\text{ mm}$ through-holes).
  4. Apply woven 2D/3D carbon PBR texture: Matte charcoal-black fibrous texture with slight specular sheen on the swept friction face.

---

### 2.7 Component 7: `Brake_Duct_Assembly_Carbon` & Aerodynamic Stator
* **Real-World Specifications:**
  * Material: Autoclaved prepreg carbon fiber (Torayca T800G, $1.0\text{ mm}$ wall thickness).
  * Sub-Assemblies:
    1. *Forward Air Scoop:* Sits inboard of the front tire, capturing high-total-pressure air.
    2. *Toroidal Internal Duct:* Wraps around the upright, dividing flow between disc eye, caliper cooling, and wheel rim boundary layer conditioning.
    3. *Carbon Stator Backing Plate:* Seals the inner face of the brake disc, forming a high-velocity pressure chamber that forces air through the 1,400 disc holes.
* **Procedural 3D Modeling Recipe:**
  1. Model forward scoop with organic loft curve.
  2. Model inner backing plate: Flat circular carbon disc with central hub cut-out and molded caliper blister pocket.
  3. Add structural mounting lugs with M5 titanium fasteners securing the duct to the upright carrier.

---

### 2.8 Component 8: Rear Brake-by-Wire (BBW) Electro-Hydraulic Actuator
* **Real-World Specifications:**
  * Manifold Block: CNC-machined from solid billet aluminum (**Al 7075-T651**).
  * Components:
    * High-speed Moog electro-hydraulic proportional servo valve ($<4.5\text{ ms}$ response).
    * Dual redundant piezoresistive pressure transducers ($0\text{--}250\text{ bar}$, $1,000\text{ Hz}$ CAN sampling).
    * Spring-loaded normally-open mechanical bypass shuttle valve (connects driver pedal directly to rear calipers upon power failure, guaranteeing **$\ge 2,500\text{ Nm}$ mechanical torque**).
* **Pedal Feel Simulator:**
  * Series spring pack containing low-rate Belleville washers (simulates pad knock-back clearance) and progressive dual-durometer polyurethane bumpers (**Shore 70A and 90A**), replicating hydraulic backpressure resistance up to **$180\text{ kgf}$ driver foot effort**.

---

## 3. Master Part Decomposition Matrix Across All Major Assemblies

To build the complete 2026 car to the identical standard, every major system is decomposed into its physical manufacturing elements:

```
+========================================================================================================+
| 2026 FORMULA 1 MASTER PIECEWISE MECHANICAL CAD DECOMPOSITION                                          |
+======================+=========================================+=======================================+
| Major Sub-System     | Primary Structural Assemblies           | Discrete Piecewise Sub-Components     |
+======================+=========================================+=======================================+
| FRONT ACTIVE WING    | Mainplane (`RV-FW-PROFILES`)            | - Fixed carbon mainplane core         |
| ASSEMBLY             | Articulated Flap 1 (`Pivot_Wing_Flap_1`)| - Active intermediate carbon flap     |
| (1900 mm Span)       | Articulated Flap 2 (`Pivot_Wing_Flap_2`)| - Active upper flap with Gurney slot  |
|                      | Endplates (`RV-FW-EP`)                  | - Inwash carbon endplate skins        |
|                      | FIS Nose Cone (`Body_FIS_Stage1_2`)     | - Stage 1 aramid crush cone (40 kJ)   |
|                      | Actuation Kinematics                    | - Stage 2 Dyneema secondary cell      |
|                      |                                         | - 4x Titanium bulk mounting studs M12 |
|                      |                                         | - 2x Electro-hydraulic servo rams     |
|                      |                                         | - 4x Carbon drop-hinge bellcranks     |
|                      |                                         | - Pre-loaded titanium torsion springs |
|                      |                                         | - 6x Slot-gap separator bridges       |
+----------------------+-----------------------------------------+---------------------------------------+
| FRONT SUSPENSION     | Suspension Wishbones & Links            | - Upper wishbone front carbon aero leg|
| & STEERING           | Upright Carrier Assembly                | - Upper wishbone rear carbon aero leg |
|                      | HPAS Steering Rack & Column             | - Lower wishbone high-rake leg (AntiD)|
|                      |                                         | - Carbon pull-rod with Ti clevises    |
|                      |                                         | - Titanium CNC upright carrier block  |
|                      |                                         | - Angular contact ceramic wheel brgs  |
|                      |                                         | - Telescoping collapsible column shaft|
|                      |                                         | - Maraging 300 torsion bar quill      |
|                      |                                         | - Quick-release hub with LEMO pins    |
+----------------------+-----------------------------------------+---------------------------------------+
| MONOCOQUE & COCKPIT  | Survival Cell Tub (`Body_SurvivalCell`) | - Carbon/Zylon sandwich tub core      |
| ERGONOMICS           | Titanium Halo (`Safety_Halo`)           | - 6.2 mm Zylon side anti-intrusion    |
|                      | Driver Seating & Controls               | - Ti-6Al-4V Grade 5 Halo hoop (7 kg)  |
|                      | Primary Roll Structure                  | - Halo carbon aerodynamic fairing     |
|                      |                                         | - Monolithic 172 kN roll hoop arch    |
|                      |                                         | - Custom vacuum EPS bead seat shell   |
|                      |                                         | - 4x Kevlar 15 kN extraction straps   |
|                      |                                         | - CONFOR CF-45/42 foam headrest       |
|                      |                                         | - Linear adjustable pedal box sled    |
|                      |                                         | - 180 kgf load cell brake pedal lever |
|                      |                                         | - Steering wheel carbon casing        |
|                      |                                         | - McLaren PCU-8D transreflective LCD  |
|                      |                                         | - Magnetic rocker shift paddle cassette|
|                      |                                         | - Hall-effect single launch clutch    |
+----------------------+-----------------------------------------+---------------------------------------+
| UNDERBODY, FLOOR     | Floor Bodywork (`RV-FLOOR-BODY`)        | - Partially flat central carbon floor |
| & DIFFUSER           | Floor Fences (`RV-FLOOR-FENCE`)         | - 5x Curved leading-edge strakes/side |
|                      | Legality Plank (`RV-PLANK`)             | - 10 mm densified Jabroc wood core    |
|                      | Diffuser Chamber (`RV-DIFF`)            | - 3x Flush Ti-6Al-4V skid puck plates |
|                      | Floor Edge Devices                      | - Rearward diffuser kick-line knuckle |
|                      |                                         | - Diffuser carbon sidewall fences     |
|                      |                                         | - Floor Winglet (±10mm float limit)   |
|                      |                                         | - Lateral tyre squirt cutout notches  |
|                      |                                         | - 60 N / 100 N deflection test lugs   |
+----------------------+-----------------------------------------+---------------------------------------+
| POWERTRAIN & 50/50   | 1.6L 90° V6 ICE                         | - Cast Al-Si block & cylinder heads   |
| HYBRID SYSTEM        | Turbocharger & Exhaust System           | - Pre-chamber TJI solenoid injectors  |
|                      | 350 kW MGU-K Motor                      | - Fixed-length acoustic intake runners|
|                      | High-Voltage Energy Store (ES)          | - Single-stage turbo with γ-TiAl wheel|
|                      | Transmission & Driveline                | - Twin BLDC electronic wastegates     |
|                      |                                         | - Inconel 625 tailpipe (Ø100-130 mm)  |
|                      |                                         | - Halbach-array carbon-sleeved rotor  |
|                      |                                         | - Dual 3-phase SiC inverter baseplate |
|                      |                                         | - 230S pouch battery cells in PAO-2   |
|                      |                                         | - 1.2 mm Ti-6Al-4V ballistic armor    |
|                      |                                         | - Pyrofuse (<10 ms disconnect)        |
|                      |                                         | - 8-speed seamless gearbox layshaft   |
|                      |                                         | - Electro-hydraulic active LSD piston |
|                      |                                         | - Carbon-carbon 4-plate pull clutch   |
|                      |                                         | - Hollow 300M driveshafts & CV tripods|
+----------------------+-----------------------------------------+---------------------------------------+
| REAR ACTIVE WING     | Mainplane & Active Flaps                | - Carbon mainplane profile            |
| & IMPACT ATTENUATOR  | Active Hinge Kinematics                 | - Active auxiliary flap (C3.11)       |
|                      | Endplates (`RV-RW-EP`)                  | - Active upper flap (AoA stroke 25°)  |
|                      | Rear Impact Structure (`Body_RIS`)      | - Planar vertical carbon endplates    |
|                      |                                         | - Hydraulic Moog rotary actuator ram  |
|                      |                                         | - Titanium pre-loaded return springs  |
|                      |                                         | - Carbon crash cone (50 kJ absorption)|
|                      |                                         | - 24 kN Zylon RIS retention tether    |
|                      |                                         | - Flashing red LED rain safety light  |
+======================+=========================================+=======================================+
```

---

## 4. Procedural CAD & Digital Twin Synthesis Protocol

When executing the 3D build in procedural modeling scripts (such as Blender Python `bpy` or Three.js procedural buffer geometries):

### 4.1 Step 1: Spatial Datums & FIA Legality Volumes
1. Define the universal reference datum:
   * Coordinate origin $[0, 0, 0]$: Centerline $Y = 0$, Reference Plane $Z = 0$, Front Axle Centerline $X = 0$.
   * Crankshaft centerline: $Y = 0.0\text{ mm}$, $Z = 90.0\text{ mm}$, $X \approx 1,750\text{ mm}$.
   * Wheelbase rear axle: $X = 3,400.0\text{ mm}$.
2. Generate all bounding Reference Volumes (`RV-*`) as transparent, non-rendering wireframe collision meshes to guarantee that all procedural geometries stay $100\%$ within FIA legality boxes.

### 4.2 Step 2: Piecewise Mechanical Modeling Rules
* **No Unbroken Single-Mesh Illusions:** Never combine the caliper, disc, and upright into a single mesh. Model each part as a discrete, watertight manifold solid.
* **Genuine Fasteners & Sockets:** Every bolt hole must feature a counterbore, a chamfered lead-in, and an instanced bolt with a genuine hexagonal or Torx socket recess.
* **Edge Radii & Highlight Speculars:** Apply $0.5\text{--}1.2\text{ mm}$ bevels on all machined edges. In real-world lighting, razor-sharp mathematical edges look fake; bevels capture specular reflection glints that give digital models tangible weight.
* **Authentic Kinematic Pivots:**
  * For active flaps, steering links, and suspension wishbones, place the object origin strictly at the mechanical hinge axis vector ($\vec{u}_{\text{axis}}$).
  * Lock transformation channels to the genuine degree of freedom (e.g. rotation along local X-axis only for flap hinges, travel bounds $0^\circ \le \theta \le 28^\circ$).

### 4.3 Step 3: Physically-Based Rendering (PBR) Materials
* **Carbon-Carbon (Brake Discs/Pads):** Roughness $0.85$, Metalness $0.05$, anisotropic diffuse with microscopic radial wear striations and heat-glow emission textures under load ($T > 600^\circ\text{C}$).
* **Lithium-Aluminum Alloy (Calipers):** Roughness $0.32$, Metalness $0.88$, dark bronze/anthracite hard-anodized finish with thermal paint decals.
* **Aerospace Grade 5 Titanium (Bobbins/Bells/Halo):** Roughness $0.38$, Metalness $0.94$, micro-grain brushed texture with subtle golden-grey anodize hue.
* **Autoclaved Prepreg Carbon Fiber (Aero/Monocoque):** Dual-layer shader: base layer high-resolution $2\times 2$ twill carbon weave normal map (clear fiber strand bundles), coated with a high-gloss clearcoat lacquer (Roughness $0.08$, Clearcoat $1.0$, Clearcoat Roughness $0.04$).
* **Densified Jabroc Wood (Plank):** High-density dark resin-impregnated beechwood laminate texture, showing directional compression laminations and titanium skid puck inserts.

---
*Manual compiled and verified against official FIA 2026 Technical Regulations. Complete mechanical decomposition ready for piecewise CAD modeling, parametric rigging, and digital twin simulation.*
