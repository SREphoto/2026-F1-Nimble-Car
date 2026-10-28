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
  - Compounds per corner: Soft (red), Medium (yellow), Hard (white) P ZERO slicks, Intermediate (green, shallow grooves) and Full wet (blue, deep grooves) CINTURATO, with the grooves cut into the geometry.
  - Wear per corner: Brand new, A few laps, Medium wear, Heavy wear, Blown (any combination of tyres, deflated, car settles onto the flat corner(s), flapping rubber).
  - Rainy weather: wet/inter tyres with a water film and droplets, wet track sheen and spray in Drive mode.
  - "Tyre state" / Compound / Corner selectors in the Telemetry panel, a Tyre state selector in the Red Bull Ring HUD, and `window.tyreStates` (`setTyreState`, `setTyreCompound(corner, compound)`, `setTyreWear`, `setBlown(corner, on)`, `setWeather`).

- **Photorealistic Red Bull Ring Circuit & Surroundings:**
  - **Dynamic Track Banking & Camber:** Full continuous super-elevation modeled along all 10 turns (including positive banking on Turns 1, 3, 7, 8, 9, 10, and the infamous downhill off-camber slope on Turn 4 and Turn 6 entry) with vehicle roll physics.
  - **High-Fidelity Asphalt & Markings:** Tangent-space normal mapping, micro-aggregate stone chips, quartz glints, rolling compaction streaks, heavy-braking lockup skid marks, and 3D ripple kerbs with chipped paint and rubber scuff marks.
  - **Alpine Landscaping & 3D Vegetation:** Multi-species Austrian forest (Norway Spruce conifers and European Beech) across 9,500 trees, manicured F1 lawn mower stripes, and 2,800 instanced 3D volumetric grass tufts along verges.
  - **FIA Raked Gravel Traps:** Combed wavy furrow ridges with authentic relief and pea gravel pebbles.
  - **Grandstands & Dutch "Orange Army" Fans:** Tiered stadium seating with individual Austrian Red and Navy bucket seats, cantilevered aerodynamic canopy roofs with space-frame trusses, 16m × 9m giant LED Jumbotrons with live race telemetry, fluttering 3D trackside flags, and celebratory orange smoke flares.
  - **Modern Architectural Pit Building & Garages:** Paddock Club VIP hospitality suites with curtain-wall glass, balconies, rooftop observation terrace, Race Control Tower, overhead swinging service booms, tyre warming racks with heated blankets, and mechanics tool chests.

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

---

## Credits

- Main body, centre section and nose: [2026 Redbull RB22 by Dave (Tyler_Dave), Sketchfab, CC BY 4.0](https://sketchfab.com/3d-models/2026-redbull-rb22-0a3d24a58e0549d591a5a48c22eec383) ([licence](https://creativecommons.org/licenses/by/4.0/)). Cut down to the body, moved to the app's frame, compressed and repainted per team (see `cad/rb22_body.js`, `tools/rb22/`).
- Red Bull driver helmet: [Helmet Redbull - Max Verstappen by Fabianmml, Sketchfab, CC BY 4.0](https://sketchfab.com/3d-models/helmet-redbull-max-verstappen-87eee96938ae415281a8aa8233eefba8) ([licence](https://creativecommons.org/licenses/by/4.0/)). Textures compressed to 2048 WebP (`assets/models/helmet_verstappen.glb`, `cad/helmet_models.js`).
- Other teams' helmets: [racing Helmet by nNiCo67, Sketchfab, CC BY 4.0](https://sketchfab.com/3d-models/racing-helmet-053c3092297c4054be87e10844d76861) ([licence](https://creativecommons.org/licenses/by/4.0/)). Recoloured per team with a black visor (`assets/models/helmet_bell_gp3.glb`, `cad/helmet_models.js`).

