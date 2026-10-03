# 🏎️ 2026 Formula 1 "Nimble Car"

### SREdesigns - Samuel R Erwin III

[![Deploy to GitHub Pages](https://github.com/SREphoto/2026-F1-Nimble-Car/actions/workflows/deploy.yml/badge.svg)](https://github.com/SREphoto/2026-F1-Nimble-Car/actions/workflows/deploy.yml)
[![Live Showcase](https://img.shields.io/badge/Live_Showcase-GitHub_Pages-00d4e8?style=flat&logo=github)](https://srephoto.github.io/2026-F1-Nimble-Car/)
[![FIA Regulations](https://img.shields.io/badge/FIA_Regulations-2026_Compliant-d90429?style=flat)](https://www.fia.com)

---

## The App

An interactive 3D WebGL application built to inspect and experience the 2026 Formula 1 "Nimble Car" in real time directly inside the browser.

👉 **[Launch 2026 F1 Showcase](https://srephoto.github.io/2026-F1-Nimble-Car/)**

### Features

- **Multi-Angle Camera Presets:**
  - **ISO:** 3/4 isometric perspective.
  - **Front:** True front elevation view.
  - **Side:** Full wheelbase profile silhouette.
  - **Top:** Planform overhead CAD view.
  - **Exploded:** Complete assembly separation along kinematic axes.
  - **Active:** High-speed dynamic running state.

- **Interactive Driving Controls:**
  - Real-time throttle pedal slider (0–100%).
  - Brake-by-Wire pedal effort slider (0–180 kgf).
  - Steering angle slider (-30° to +30°).
  - 8-speed seamless-shift sequential gearbox selector (Reverse, Neutral, Gears 1–8).
  - Exploded view separation slider (0–100%).

- **PCU-8D Steering Wheel Telemetry Display:**
  - Real-time digital dash rendering with 15 progressive RPM shift LEDs.
  - Center gear indicator.
  - Live speed readout in km/h.
  - Engine RPM counter.
  - Active aerodynamics status (Z-Mode / X-Mode).
  - Battery state of charge (SoC %).
  - Brake line hydraulic pressure (bar).

- **Part Explorer:**
  - One-click isolation and wireframe toggling across 9 vehicle assemblies:
    1. **Monocoque & Safety Cell:** Carbon-Zylon tub, Titanium Halo, primary roll hoop, bead seat, pedal box.
    2. **Driver & Accessories:** Helmet, visor, aerodynamic mirrors with LED indicators, T-camera, pitot mast.
    3. **Carbon Brakes:** Ventilated carbon-carbon discs with over 1,400 cooling holes, monobloc calipers, brake lines.
    4. **Electrical Looms & Energy Store:** 800V orange high-voltage cables, battery pack, chassis control loom.
    5. **1.6L V6 Powertrain:** Cylinder block, crankshaft, pistons, valvetrain, timing chain, turbocharger, 350 kW MGU-K motor.
    6. **8-Speed Gearbox & Drivetrain:** Seamless gear clusters, selector barrel, active limited-slip differential, driveshafts.
    7. **Suspension & Wheels:** Double wishbones, push/pull rods, dampers, 18-inch forged magnesium wheels, Pirelli tires.
    8. **Floor & Underbody:** Ground-effect floor deck, leading-edge strakes, Jabroc skid plank with titanium pucks, rear diffuser.
    9. **Active Wings & Bodywork:** Front wing with active flaps, nosecone, sidepod radiator ducts, shark fin, active rear wing.

- **Tyre compounds, wear states & weather** (`cad/tyre_states.js`, see [docs/TYRE_STATES.md](docs/TYRE_STATES.md)):
  - Compounds per corner: Soft (red), Medium (yellow), Hard (white) P ZERO slicks, Intermediate (green, shallow grooves) and Full wet (blue, deep grooves) CINTURATO.
  - Wear per corner: Brand new, A few laps, Medium wear, Heavy wear, Blown (one tyre, deflated, car sits low on that corner, flapping rubber).
  - Rainy weather: wet/inter tyres with a water film and droplets, wet track sheen and spray in Drive mode.
  - "Tyre state" / Compound / Corner selectors in the Telemetry panel, a Tyre state selector in the Red Bull Ring HUD, and `window.tyreStates` (`setTyreState`, `setTyreCompound(corner, compound)`, `setTyreWear`, `setBlownCorner`, `setWeather`).

- **Lighting & Environment Controls:**
  - Adjustable light intensity slider (0.2× to 2.5×).
  - Five lighting moods: Studio Neutral, Bright Daylight, Night Race, Cool Blue, Warm Tungsten.
  - Auto-orbit camera toggle with adjustable rotation speed.

### Running Locally

Clone the repository and serve with any local HTTP server:

```bash
git clone https://github.com/SREphoto/2026-F1-Nimble-Car.git
cd 2026-F1-Nimble-Car
python3 -m http.server 8000
```

Open `http://localhost:8000` in any web browser.

---

## The Car

The 2026 Formula 1 technical regulations introduce the "Nimble Car" concept, reducing vehicle dimensions and mass while introducing active aerodynamics and a 50/50 hybrid power split.

### Technical Specifications & FIA 2026 Regulations

| Parameter | 2022–2025 Era | 2026 "Nimble Car" Regulations |
| :--- | :--- | :--- |
| **Wheelbase** | 3600 mm | **3400 mm** (-200 mm) |
| **Overall Width** | 2000 mm | **1900 mm** (-100 mm) |
| **Minimum Weight** | 798 kg | **768 kg** (-30 kg) |
| **Internal Combustion Engine** | 1.6L Turbo V6 (~560 kW) | **1.6L Turbo V6 (~400 kW / 535 hp)** |
| **Electric Motor (MGU-K)** | 120 kW | **350 kW (470 hp, +290%)** |
| **MGU-H (Heat Generator)** | Present | **Eliminated** |
| **Fuel Limit** | 100 kg/h mass flow | **3000 MJ/h energy flow (100% sustainable fuels)** |
| **Energy Store (Battery)** | 4.0 MJ delta | **4.0 MJ usable / 800V DC immersion-cooled** |
| **Active Aerodynamics** | DRS Rear Wing only | **Full Active Front & Rear Wings (Z-Mode & X-Mode)** |
| **Aerodynamic Drag Reduction** | ~20–25% (DRS only) | **Up to -55% overall car drag in X-Mode** |
| **Front Tires** | 305/720-18 | **280/710-18** (-25 mm width) |
| **Rear Tires** | 405/720-18 | **375/710-18** (-30 mm width) |
| **Floor Architecture** | Deep 3D Venturi tunnels | **Partially flat floor deck with rear diffuser** |
| **Plank & Skid Blocks** | 10 mm Permaglass | **10 mm Jabroc beechwood with titanium pucks** |

### Active Aerodynamics (Z-Mode vs. X-Mode)

- **Z-Mode (High Downforce):** Default mode used in cornering and under braking. The active front wing flaps and active rear wing upper element remain at high angles of attack, maximizing aerodynamic downforce and platform stability.
- **X-Mode (Low Drag):** Straight-line mode. Actuators simultaneously shed angle on both the front wing flaps and rear wing elements, reducing vehicle drag by up to 55% to achieve high top speeds without premature battery derating.

### Powertrain & 50/50 Hybrid Power Split

- **Combustion Engine:** 1.6-liter 90° turbocharged V6 running on 100% advanced sustainable fuels, with compression ratio capped at 16.0:1 and fixed-geometry intake plenums.
- **Electric Motor (MGU-K):** Delivers up to 350 kW (470 hp) of direct mechanical assist and energy recovery, tripling previous electrical deployment.
- **Brake-by-Wire (BBW):** With 350 kW regenerative retarding torque available at the rear axle, rear friction brake disc diameters and caliper sizes are significantly reduced. The electronic brake-by-wire system seamlessly balances regenerative and friction torque for consistent braking performance.

---

## Credits

**SREdesigns - Samuel R Erwin III**