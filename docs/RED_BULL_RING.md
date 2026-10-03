# Red Bull Ring — full-scale circuit

The showcase now sits on a full, real-scale model of the **Red Bull Ring** (Spielberg, Styria, Austria):
4.315 km lap (official 4.318 km), 10 turns, 65 m of elevation change (terrain model fitted to the official 65 m, 12 % up, 9.3 % down).
See `cad/track/RED_BULL_RING_PLAN.md` for the comparison with the real circuit and the list of next steps.

## Where the data comes from

| What | Source | Licence |
|---|---|---|
| Centreline, left/right track widths, race line | [TUMFTM racetrack-database](https://github.com/TUMFTM/racetrack-database) (`tracks/Spielberg.csv`, `racelines/Spielberg.csv`) | LGPL-3.0 |
| Geo-reference (aligning the TUM local metres to lat/lon), pit lane, pit building and grandstand footprints | [OpenStreetMap](https://www.openstreetmap.org/copyright) (`highway=raceway`, `Boxenstraße`, building `Box`, `building=grandstand`) | ODbL, © OpenStreetMap contributors |
| Elevation (track + surrounding hills) | EU-DEM v1.1 25 m (Copernicus Land Monitoring Service) via the public [OpenTopoData](https://www.opentopodata.org/datasets/eudem/) API | Copernicus open data |

`tools/track/build_red_bull_ring.py` downloads these, aligns the TUM centreline to OSM (ICP, median error ≈ 1 m),
samples elevation every 2.5 m (smoothed ~30 m and fitted to the official 65 m / 12 % / 9.3 %), places kerbs per corner,
takes walls, tyre walls and grass edges from OSM and gravel from the FIA event notes,
flattens the terrain under the circuit, and writes `cad/track/red_bull_ring_data.js` (metres). Re-run with
`python3 tools/track/build_red_bull_ring.py` (needs `numpy`, `scipy` and `matplotlib`; downloads are cached in `.track_cache/`).

## Units and frame

The car is modelled in **decimetres** (e.g. 34 dm wheelbase, `track_environment.js` "160 dm = 16 m"), so the circuit
builder multiplies every metre value by `DM = 10`. The origin is the front axle of the car in the pole-position
grid box, car facing −X — exactly where the car has always been — so every existing camera preset still works.

## What is built (`cad/track/red_bull_ring.js`)

- Asphalt at the real width, white track-limit lines, raised red/white kerbs through every corner
- Asphalt run-off (wider on the outside of corners), gravel traps on the outside of the faster corners, grass verges
- Concrete walls with debris fencing and posts all the way round, tyre walls in front of gravel traps
- Pit lane (OSM geometry) with lane markings, speed-limit lines, 22 painted pit boxes, pit wall, pit building with garages
- Start/finish straight: white start line with the gantry and start lights, 22 staggered grid boxes (8 m apart, pole on
  the left), chequered finish line 120 m back (both lines from OpenStreetMap)
- 2 m kerbs (inside at the apex, outside on the exit), yellow sausage kerbs at Turns 1 and 3, light-blue lines behind
  the white lines, gravel only where the FIA notes confirm it (Turn 4, Turn 6, strips at Turns 9 and 10)
- Walls and tyre walls at their OpenStreetMap positions, asphalt run-off out to the OpenStreetMap grass areas
- Sector 1 and 2 lines, speed trap and DRS lines with boards (FIA circuit map); S1/S2/S3 times in the HUD
- The steel bull sculpture on the hill above Turns 7 and 8
- The nine OSM grandstands (stepped tiers with a crowd texture, roofs on the big ones)
- Trackside signage: turn numbers 1–10, 100/200/300 m braking boards for T1, T3, T4, pit in/out, plain text hoardings
  (circuit name, "Spielberg", "Steiermark", "Grand Prix", SREdesigns) — no third-party logos
- Terrain: 20 m DEM grid around the circuit, 100 m grid out to ~4 km, procedural mountain ring and gradient sky
- ~7 000 instanced conifers

Performance: one merged geometry per material for every track layer, InstancedMesh for posts/start lights/trees,
THREE.LOD for tree cells (detailed → low-poly → hidden) and grandstands (tiers → block), a logarithmic depth buffer
for the km-to-mm range, and the sun's shadow frustum follows the car.

## Driving (`cad/track/track_mode.js`)

HUD (bottom-left of the viewport): **Drive**, **Autopilot lap**, **Reset to grid**, cameras **Chase / TV / Orbit car /
Overview**, **Classic set** (switches back to the original finish-line set).

- The existing **ICE start, throttle, brake, steering and gear** controls drive the car; keyboard: W/S or ↑/↓
  throttle/brake, A/D or ←/→ steer, Q/E gear down/up, C cycles cameras.
- Simple vehicle model: 750 kW, 800 kg, per-gear top speeds, aero drag (lower in X-mode), downforce-dependent grip
  and braking, gravity on the slopes, gravel/grass drag, barrier collisions; the car follows the track surface height
  and pitches with the gradient.
- Autopilot: pure-pursuit steering on the TUM race line with a curvature-based speed profile and automatic shifts
  (writes to the same sliders/gear buttons). Laps in roughly 1:17–1:20 (real F1 pole is ~1:04).
- Lap timer and mini-map in the HUD. Clicking any showcase preset parks the car back on the grid.

## Known simplifications

No track camber/banking; the size of the Turn 4 and Turn 6 gravel traps is an estimate;
the pit lane is scenery (the pit wall blocks entry); grandstand and pit-building shapes are simplified from footprints.
