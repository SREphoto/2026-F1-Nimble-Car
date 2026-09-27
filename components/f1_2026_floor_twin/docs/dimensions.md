# 2026 Formula 1 Floor & Diffuser Dimensional Specification

## 1. Coordinate Reference System
* Origin $[0,0,0]$ at Front Axle Centerline / Skid Block Reference Plane $Z = 0$.
* $X$-axis: Longitudinal ($X = -450\text{ mm}$ at leading splitter keel, $X = +3800\text{ mm}$ at rear diffuser trailing edge).
* $Y$-axis: Lateral ($Y = 0$ along car centerline, $Y = \pm 725\text{ mm}$ at floor outer edge).
* $Z$-axis: Vertical ($Z = 0$ at bottom of Jabroc plank, $Z = 10\text{ mm}$ at floor bottom carbon skin, $Z = 200\text{ mm}$ at diffuser expansion ceiling).

```
                 2026 FLOOR & VENTURI DIFFUSER DATUM (mm)
  
   [X = -450 mm] Splitter Keel & Leading Edge Fences (5 per side)
          \
           v
   +---------------------------------------------------------------------+  [Y = +725 mm]
   |   Floor Edge Winglet (Longitudinal Sealing Vortex)                  |
   |                                                                     |
   |   Jabroc Skid Block [X = 0 to 2800 mm, Y = ±150 mm, t = 10.0 mm]    |
   |   (3x Ø34mm FIA Inspection Holes & 4x Titanium Skid Pucks)          |
   |                                                                     |
   |   Rear Tyre Squirt Mousehole Cutouts [X = 3050 to 3350 mm]          |
   +---------------------------------------------------------------------+  [Y = -725 mm]
                                      \
                                       v
   [X = 2700 to 3800 mm] Diffuser Ramp Expansion (θ = 8° to 12°, Width = 1000 mm)
```

---

## 2. Component Dimensional Breakdown

| Assembly ID | Sub-Component | Material | Longitudinal $X$ (mm) | Lateral $Y$ (mm) | Vertical $Z$ (mm) | Notes / Tolerances |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `Body_Floor_Deck_Carbon` | Partially Flat Main Floor | Toray M46J Carbon Core | `[-450, 3800]` | `[-725, +725]` | `[10, 65]` | Max width $1,450\text{ mm}$ |
| `Body_SkidBlock_Jabroc` | Central Plank | Densified Laminated Beech | `[0, 2800]` | `[-150, +150]` | `[0, 10]` | $10.0\text{ mm}$ new, $8.0\text{ mm}$ min wear |
| `Fastener_SkidPuck_Ti_01..04` | 4x Titanium Skid Pucks | Grade 5 Ti-6Al-4V | Distributed | `0.0` | `[0, 10]` | Flush mounted, sparks on bottoming |
| `Body_FloorFence_LH_01..05` | 5x LH Underfloor Strakes | High-Toughness Carbon | `[-450, 0]` | `[+180, +680]` | `[10, 200]` | Outwash & LEV vortex shedding |
| `Body_FloorFence_RH_01..05` | 5x RH Underfloor Strakes | High-Toughness Carbon | `[-450, 0]` | `[-680, -180]` | `[10, 200]` | Outwash & LEV vortex shedding |
| `Body_FloorWinglet_Edge_LH` | LH Floor Edge Winglet | Intermediate-Modulus Carbon | `[200, 2800]` | `+725.0` | `[25, 45]` | Sealing vortex generation |
| `Body_FloorWinglet_Edge_RH` | RH Floor Edge Winglet | Intermediate-Modulus Carbon | `[200, 2800]` | `-725.0` | `[25, 45]` | Sealing vortex generation |
| `Body_Diffuser_Ramp` | Expansion Ramp | High-Modulus Carbon Sandwich | `[2700, 3800]` | `[-500, +500]` | `[10, 200]` | $\theta = 10.5^\circ$ ramp divergence |
| `Body_Diffuser_Divider_LH/RH`| Vertical Diffuser Strakes| Autoclaved Carbon Blade | `[2850, 3800]` | `[±220, ±220]` | `[10, 195]` | Crossflow suppression |
| `Body_TyreSquirt_Cutout_LH` | LH Mousehole Notch | Carbon Edge Baffle | `[3050, 3350]` | `+710.0` | `[15, 75]` | Bleeds off rear tyre squirt jet |
| `Body_TyreSquirt_Cutout_RH` | RH Mousehole Notch | Carbon Edge Baffle | `[3050, 3350]` | `-710.0` | `[15, 75]` | Bleeds off rear tyre squirt jet |
| `Badge_SREdesigns` | Constructor Plaque | Anodized Al / Canvas | `[1200, 0]` | `0.0` | `35.0` | Serial & certification plaque |

---

## 3. Physics & Aerodynamic Equations

### 3.1 Ground Effect Downforce Scaling
Under dynamic ride height $h$ (front clearance in mm):
$$C_{L,\text{floor}}(h) = C_{L,\text{base}} + \frac{K_{\text{ge}}}{h + h_0}$$
where $C_{L,\text{base}} = 1.10$, $K_{\text{ge}} = 18.5$, and $h_0 = 12.0\text{ mm}$ (linearized slope without porpoising singularity):
$$F_{z,\text{floor}} = \frac{1}{2} \rho v^2 S_{\text{floor}} C_{L,\text{floor}}(h)$$
where $S_{\text{floor}} = 3.65\text{ m}^2$.

### 3.2 Plank Wear Mechanics
At bottoming events ($h \le 0\text{ mm}$ relative to skid datum):
$$\Delta t_{\text{wear}} = \int \mu_{\text{rub}} \cdot F_{\text{normal}}(t) \cdot v(t) \cdot k_{\text{abrasion}} \, dt$$
Titanium pucks contact the asphalt, creating visible pyrotechnic spark showers and limiting beechwood wear to $< 2.0\text{ mm}$.
