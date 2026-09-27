# 2026 Formula 1 Transmission, Rear Suspension & Rear Impact Structure Specifications

## 1. Coordinate Reference System & Spatial Datums

All components are positioned relative to the Universal Chassis Datum $[0, 0, 0]$:
* **Datum Origin $[0, 0, 0]$**: Universal Reference Plane ($Z = 0\text{ mm}$ on ground skid block datum), Car Centerline ($Y = 0\text{ mm}$), Front Axle Centerline ($X = 0\text{ mm}$).
* **Engine / Bellhousing Interface Plane**: $X = +2,750.0\text{ mm}$, $Z \in [90.0, 500.0\text{ mm}]$.
* **Rear Axle Centerline**: $X = +3,400.0\text{ mm}$, $Z = 355.0\text{ mm}$ (Wheelbase = $3,400.0\text{ mm}$, conforming to 2026 Nimble Car regulations).
* **Gearbox Casing Span**: $X \in [+2,750.0, +3,450.0\text{ mm}]$, $Y \in [-220.0, +220.0\text{ mm}]$, $Z \in [60.0, 480.0\text{ mm}]$.
* **Rear Impact Structure (RIS)**: $X \in [+3,450.0, +4,180.0\text{ mm}]$, $Y \in [-120.0, +120.0\text{ mm}]$, $Z \in [180.0, 380.0\text{ mm}]$.
* **Rear Track Width**: $1,900.0\text{ mm}$ overall car width; rear wheel centerline at $Y = \pm 825.0\text{ mm}$.

---

## 2. Component Dimensional Breakdown

| Assembly Node | Description | Dimensions ($X \times Y \times Z$) | Material | Mass Target |
| :--- | :--- | :--- | :--- | :--- |
| `Body_Gearbox_Casing_TiCFRP` | Main structural casing & bellhousing | $700 \times 440 \times 420\text{ mm}$ | Ti-6Al-4V SLM & Toray T1000 CFRP | $34.5\text{ kg}$ |
| `Body_Transmission_Layshaft` | Internal 8-speed gear cluster & selector | $\varnothing 32 \times 520\text{ mm}$ (8 gear pairs) | Maraging 300 / Carburized Steel | $14.8\text{ kg}$ |
| `Body_Differential_LSD_ElectroHyd` | Active electro-hydraulic carbon LSD | $\varnothing 180 \times 220\text{ mm}$ | High-tensile steel & C/C clutch | $9.2\text{ kg}$ |
| `Body_Clutch_CarbonPull` | 4-plate carbon-carbon pull clutch | $\varnothing 140 \times 85\text{ mm}$ | Carbon-carbon & Billet Al-Li | $1.65\text{ kg}$ |
| `Body_Driveshaft_Hollow_LH` | Left hollow gun-drilled driveshaft | $\varnothing 28 \times 480\text{ mm}$ | Gun-drilled 300M Alloy Steel | $2.85\text{ kg}$ |
| `Body_Driveshaft_Hollow_RH` | Right hollow gun-drilled driveshaft | $\varnothing 28 \times 480\text{ mm}$ | Gun-drilled 300M Alloy Steel | $2.85\text{ kg}$ |
| `Body_RearWishbone_Upper_LH` | Upper aerodynamic rear A-arm | Aero chord $65\text{ mm}$, span $440\text{ mm}$ | HM Torayca Prepreg Carbon Fiber | $1.45\text{ kg}$ |
| `Body_RearWishbone_Upper_RH` | Upper aerodynamic rear A-arm | Aero chord $65\text{ mm}$, span $440\text{ mm}$ | HM Torayca Prepreg Carbon Fiber | $1.45\text{ kg}$ |
| `Body_RearWishbone_Lower_LH` | Lower aerodynamic rear A-arm | Aero chord $80\text{ mm}$, span $460\text{ mm}$ | HM Torayca Prepreg Carbon Fiber | $1.90\text{ kg}$ |
| `Body_RearWishbone_Lower_RH` | Lower aerodynamic rear A-arm | Aero chord $80\text{ mm}$, span $460\text{ mm}$ | HM Torayca Prepreg Carbon Fiber | $1.90\text{ kg}$ |
| `Body_RearPushrod_Strut_LH` | Rear suspension push-rod link | $\varnothing 24 \times 520\text{ mm}$ with Ti clevises | High-modulus Carbon & Ti-6Al-4V | $0.95\text{ kg}$ |
| `Body_RearPushrod_Strut_RH` | Rear suspension push-rod link | $\varnothing 24 \times 520\text{ mm}$ with Ti clevises | High-modulus Carbon & Ti-6Al-4V | $0.95\text{ kg}$ |
| `Body_RearRocker_Bellcrank_LH` | Inboard suspension rocker | $120 \times 85 \times 45\text{ mm}$ | CNC 7075-T651 Billet Aluminum | $0.72\text{ kg}$ |
| `Body_RearRocker_Bellcrank_RH` | Inboard suspension rocker | $120 \times 85 \times 45\text{ mm}$ | CNC 7075-T651 Billet Aluminum | $0.72\text{ kg}$ |
| `Body_RearDamper_ThroughRod` | Inboard 4-way through-rod dampers | $\varnothing 42 \times 165\text{ mm}$ | Hard-anodized Al & Titanium | $1.40\text{ kg}$ |
| `Body_RearHeave_ThirdElement` | Inboard heave hydraulic spring element | $\varnothing 48 \times 145\text{ mm}$ | Titanium & Belleville washer stack | $1.15\text{ kg}$ |
| `Body_RearBrake_Disc_LH` | Downsized rear carbon-carbon disc | $\varnothing 240 \times 24\text{ mm}$ (vented) | 3D woven Carbon-Carbon composite | $1.45\text{ kg}$ |
| `Body_RearBrake_Disc_RH` | Downsized rear carbon-carbon disc | $\varnothing 240 \times 24\text{ mm}$ (vented) | 3D woven Carbon-Carbon composite | $1.45\text{ kg}$ |
| `Body_RearBrake_Caliper_LH` | 4-piston Al-Li downsized monobloc caliper | $185 \times 95 \times 70\text{ mm}$ | Al-Li 2099 Monobloc Alloy | $1.35\text{ kg}$ |
| `Body_RearBrake_Caliper_RH` | 4-piston Al-Li downsized monobloc caliper | $185 \times 95 \times 70\text{ mm}$ | Al-Li 2099 Monobloc Alloy | $1.35\text{ kg}$ |
| `Body_RearImpactStructure_Cone` | FIA Rear Crash Structure (RIS) | Length $730\text{ mm}$, tapered cone | Torayca T800 Carbon / Rohacell core | $6.80\text{ kg}$ |
| `Body_RainLight_FIA_LED` | Flashing red high-intensity rain light | $110 \times 60 \times 32\text{ mm}$ (pulsing 4 Hz) | Polycarbonate lens, 48x LED array | $0.32\text{ kg}$ |
| `Fastener_EngineToGearbox_M12_01..04` | 4x M12 structural bellhousing studs | $\varnothing 12 \times 65\text{ mm}$ | Grade 5 Ti-6Al-4V Titanium | $0.24\text{ kg}$ |
| `Fastener_SuspensionPivot_M10_01..08` | 8x M10 spherical bearing bolts | $\varnothing 10 \times 55\text{ mm}$ | Grade 5 Ti-6Al-4V Titanium | $0.36\text{ kg}$ |
| `Fastener_RIS_Mount_M10_01..04` | 4x M10 rear impact structure studs | $\varnothing 10 \times 50\text{ mm}$ | Grade 5 Ti-6Al-4V Titanium | $0.20\text{ kg}$ |

Total Dry Subsystem Mass: **$90.89\text{ kg}$**

---

## 3. Kinematic & Physical Equations

### 3.1 Seamless Gearshift Kinematics
Shift duration is controlled by dual-acting hydraulic selector rams operating at 200 bar rail pressure:
$$t_{\text{shift}} \le 0.0045\text{ s} \quad (4.5\text{ ms})$$
During the shift, the incoming dog ring pre-engages while the outgoing gear freewheels through one-way ratcheting ramps, producing zero driveline torque interruption:
$$\Delta \tau_{\text{driveline}} \approx 0\text{ Nm}$$

### 3.2 Electro-Hydraulic Active LSD Preload
The differential locking torque $\tau_{\text{lock}}$ is dynamically blended across three vehicle phases:
$$\tau_{\text{lock}} = \mu_{\text{clutch}} \cdot N_{\text{plates}} \cdot r_{\text{eff}} \cdot \left[ F_{\text{static}} + F_{\text{hydraulic}}(P_{\text{SECU}}) + \tau_{\text{input}} \frac{\cos \theta_{\text{ramp}}}{\sin \theta_{\text{ramp}}} \right]$$
* **Entry Phase (Braking & Turn-in)**: $40\%\text{ to }70\%$ lockup for yaw damping.
* **Mid-Corner Apex (Coast)**: $15\%\text{ to }30\%$ lockup for maximum agility.
* **Exit Phase (Throttle Application)**: $60\%\text{ to }95\%$ lockup to equalize tyre slip.

### 3.3 Rear Impact Energy Absorption
$$\Delta E_k = \frac{1}{2} M_{\text{sled}} (v_0^2 - v_f^2) = \int_0^{x_{\text{crush}}} F_{\text{crush}}(x) \, dx \ge 50.0\text{ kJ}$$
* Test sled mass: $M_{\text{sled}} = 768.0\text{ kg}$
* Impact velocity: $v_0 = 12.0\text{ m/s}$ ($43.2\text{ km/h}$)
* Average deceleration: $\bar{a} \le 25\text{g}$
* Maximum peak deceleration: $a_{\text{peak}} \le 40\text{g}$
