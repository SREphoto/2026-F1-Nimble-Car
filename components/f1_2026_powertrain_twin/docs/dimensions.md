# 2026 Formula 1 Powertrain & Energy Store Dimensional Architecture

## 1. Coordinate Reference System (Universal Chassis Datum)
* **Origin $[0,0,0]$:** Front Axle Centerline along vehicle centerline on the Skid Reference Plane ($Z = 0$).
* **Crankshaft Centerline:** Positioned exactly at $Y = 0.0\text{ mm}$ (centerline) and $Z = 90.0\text{ mm} \pm 0.5\text{ mm}$ above the bottom reference plane.
* **Longitudinal Envelope ($X$-axis):**
  * Survival Cell Rear Bulkhead Interface: $X = +2200.0\text{ mm}$.
  * 1.6L V6 ICE Block: $X \in [+2200, +2750\text{ mm}]$ ($550\text{ mm}$ block length).
  * Turbocharger & Bellhousing Interface: $X \in [+2750, +2950\text{ mm}]$.
  * Gearbox Front Bulkhead Interface: $X = +2950.0\text{ mm}$.
  * High-Voltage Energy Store (ES / Battery Pack): Housed in the lower monocoque tub cavity at $X \in [+1200, +1850\text{ mm}]$, $Y \in [-220, +220\text{ mm}]$, $Z \in [20, 180\text{ mm}]$.

```
             2026 POWER UNIT & ENERGY STORE PACKAGING (mm)
  
   Survival Cell Rear Bulkhead [X = 2200 mm]      Gearbox Interface [X = 2950 mm]
             |                                                  |
             v                                                  v
     +-------+--------------------------------------------------+-------+
     |       |          1.6L 90° V6 TURBOCHARGED ICE            |       |
     |       |  - Bore: 80mm | Stroke: 53.05mm | 404 kW Output  |       |
     |  [ES] |  - Fixed Carbon Intake Plenum & Runners (Top)    | [GBX] |
     |       |  - 350 kW MGU-K Mounted Low-Left [Z = 120 mm]   |       |
     |       |  - Single Turbocharger & Inconel Tailpipe (Rear) |       |
     +-------+--------------------------------------------------+-------+
             ^                                                  ^
             |                                                  |
       6x M12 Titanium                                    4x M12 Titanium
       Bulkhead Studs                                     Gearbox Studs
```

---

## 2. Component Dimensional Breakdown

| Assembly ID | Sub-Component | Material | Longitudinal $X$ (mm) | Lateral $Y$ (mm) | Vertical $Z$ (mm) | Notes / Tolerances |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `Body_ICE_EngineBlock_AlLi` | 90° V6 Crankcase | Al-Li 2099 / Nikasil Liners | `[2200, 2750]` | `[-260, +260]` | `[60, 480]` | 6x M12 studs forward |
| `Body_ICE_CylinderHead_LH/RH`| Dual OHC Cylinder Heads| CNC Aerospace Aluminum | `[2240, 2710]` | `[±120, ±240]` | `[280, 490]` | 4 valves/cyl, finger followers |
| `Body_ICE_IntakePlenum_Carbon`| Fixed Induction Plenum | High-Toughness Carbon | `[2280, 2680]` | `[-180, +180]` | `[480, 680]` | Tuned to 10,800 rpm harmonic |
| `Body_Turbocharger_Single` | Turbo & Wastegates | $\gamma$-TiAl / Inconel 625 | `[2720, 2920]` | `[-150, +150]` | `[280, 520]` | $I_{\text{rot}} \le 2.45 \times 10^{-4}\text{ kg}\cdot\text{m}^2$ |
| `Body_Exhaust_Tailpipe_Inconel`| 130mm Single Tailpipe | Inconel 625 ($1.2\text{ mm}$)| `[2850, 3650]` | `0.0` | `[380, 420]` | Single central exit, $1.5^\circ$ rake |
| `Body_MGUK_Motor_350kW` | 350 kW Electric Motor | SmCo Rotor / WEG Stator | `[2250, 2550]` | `+140.0` | `[70, 210]` | 60,000 rpm, geared to crank |
| `Body_Inverter_PEU_SiC` | Dual 3-Phase Inverters | Copper Pin-Fin / SiC | `[2220, 2520]` | `-160.0` | `[180, 340]` | 800-900V DC, 40 kHz switching |
| `Body_EnergyStore_BatteryPack`| 4.0 MJ Battery Enclosure| Titanium/Carbon Ballistic | `[1250, 1850]` | `[-220, +220]` | `[20, 180]` | Dielectric immersion cooled |
| `Fastener_EngineMount_M12_01..06`| 6x Chassis Studs | Grade 5 Ti-6Al-4V | `2200.0` | Distributed | `[120, 450]` | >450 kN tensile shear proof |
| `Badge_SREdesigns` | Official PU Serial Plaque| Anodized Aluminum | `2450.0` | `0.0` | `520.0` | FIA homologation plaque |

---

## 3. Power Unit Physics & Energy Equations

### 3.1 50/50 Hybrid Power Delivery
At any engine speed $N \ge 10,500\text{ rpm}$ under wide-open throttle (WOT):
$$P_{\text{ICE}} = \eta_{\text{BTE}} \cdot \dot{E}_{\text{fuel}} = 0.485 \cdot \frac{3000\text{ MJ/h}}{3.6\text{ MJ/kWh}} \approx \mathbf{404.2\text{ kW} \ (542\text{ hp})}$$
$$P_{\text{MGUK}} = \mathbf{350.0\text{ kW} \ (469\text{ hp})}$$
$$P_{\text{total}} = P_{\text{ICE}} + P_{\text{MGUK}} = \mathbf{754.2\text{ kW} \ (1,011\text{ hp})}$$

### 3.2 Battery State of Charge (SoC) & Energy Budget
Usable energy delta per lap: $\Delta E_{\text{lap}} \le 4.0\text{ MJ}$.
At time $t$:
$$E_{\text{battery}}(t) = E_0 + \int_0^t \left( P_{\text{regen}}(\tau) - P_{\text{deploy}}(\tau) \right) d\tau$$
When battery SoC drops below $12\%$, derating (clipping) reduces MGU-K deploy power:
$$P_{\text{deploy}} = 350.0 \cdot \left(\frac{\text{SoC} - 5\%}{7\%}\right) \quad (\text{for } 5\% \le \text{SoC} < 12\%)$$
