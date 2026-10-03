# Red Bull Ring: quality plan

This plan compares the circuit in `cad/track/` with the real Red Bull Ring and ranks what is wrong or missing by how
much fixing it makes the track look right and drive right. Items 1 to 10 are done on the branch
`track/red-bull-ring-quality`. Items 11 onwards are the next steps.

Every figure below comes from a public source listed at the end. Where something is an estimate, it says so.

## How the track is built

`tools/track/build_red_bull_ring.py` downloads the source data, works out the track shape and everything around it,
and writes `cad/track/red_bull_ring_data.js`. `cad/track/red_bull_ring.js` turns that file into the 3D scene, and
`cad/track/track_mode.js` runs Drive mode, Autopilot lap, the cameras and the timing panel. Re-run the builder with
`python3 tools/track/build_red_bull_ring.py` (needs `numpy`, `scipy` and `matplotlib`).

## Real circuit compared with the model

| What | Real circuit | Before | Now |
|---|---|---|---|
| Lap length | 4.318 km (2016 to 2024 figure), 4.326 km from 2025 on the same layout | 4.315 km | 4.315 km |
| Corners | 10, 3 left and 7 right | 10, but Turns 5 to 10 were in the wrong places | 10, in the right places |
| Height difference | 65 m | 69 m | 65 m |
| Steepest climb / drop | 12 % up, 9.3 % down | 15.5 % up, 12.1 % down | 12 % up, 9.3 % down |
| Track width | 12 to 13 m | 11.0 m on average (10.2 to 13.7 m) | 12.5 m on average (11.7 to 15.2 m) |
| Kerb width | 2 m | 1.4 m, on both sides of every bend | 2 m, inside at the apex and outside on the exit |
| Start line and finish line | Two lines, 126 m apart (OpenStreetMap: 120 m) | One chequered line, grid behind it | White start line with the grid and start lights, chequered finish line 120 m back |
| Pole position | Left-hand side of the grid | Right-hand side | Left-hand side |
| Walls and tyre walls | Real positions | Guessed from how sharp each bend is | Taken from OpenStreetMap for 98 to 100 % of the lap |
| Run-off | Mostly asphalt, gravel at a few corners | Gravel guessed on the outside of most corners | Asphalt out to the mapped grass, gravel only where the FIA notes say |
| Timing lines | Sector 1, sector 2, speed trap, 3 DRS zones | None | All painted and signed, sector times in the panel |
| Painted pit boxes | 32 garage positions (FIA pit lane drawing) | 22 | 32 |
| Bull sculpture | 17.2 m steel bull on the hill above Turns 7 and 8 | Missing | Added at its mapped position |

## Ranked list

Ranked by how much each one improves the look and the drive. "Done" items are on this branch.

### Done in this pass

1. **Corner numbers.** The builder matched Turns 5 to 10 to the wrong bends (it skipped the Turn 5 kink, so the
   two lefts were called 5 and 6 and the last corner was called 9). Now the numbers follow the FIA circuit map:
   Turn 5 right kink, Turns 6 and 7 the two lefts, Turn 8 fast right, Turn 9 Jochen Rindt, Turn 10 last corner. The
   turn boards and the panel ("Turn 9 Jochen Rindt") use the FIA names for Turns 1, 3, 4 and 9.
   Note: OpenStreetMap still uses older names (it calls Turn 4 "Schlossgold", Turn 6 "Rauch", Turn 7 "Würth Kurve"
   and Turn 10 "Red Bull Mobile"). The FIA map calls Turn 4 "Rauch", so the boards follow the FIA.
2. **Grid, start line and finish line.** OpenStreetMap has both lines. The grid now starts 4 m behind the start
   line, the gantry with the start lights sits over the start line, and the chequered line is the finish line where
   lap timing happens. Pole is on the left, as on the FIA pit lane drawing. The car still parks in the pole box, so
   every camera button still frames it. The lap clock starts when the car leaves the grid.
3. **Height and slopes.** The terrain height data (EU-DEM, 25 m grid) includes the banks and cuttings next to the
   track, so the old profile was too steep. The builder now smooths it over about 30 m and fits it to the official
   figures (65 m difference, 12 % up, 9.3 % down). No point moves more than 2.4 m from the terrain data.
4. **Track width.** The source widths are about 1.5 m narrower than the FIA's 12 to 13 m. Each side is now 0.75 m
   wider. The shape of the width along the lap is kept.
5. **Walls.** Concrete walls and tyre walls now come from the OpenStreetMap walls and tyre walls. Where nothing is
   mapped, the old guess is used. Walls are always kept at least 1 m beyond the kerb.
6. **Run-off surfaces.** Asphalt run-off now reaches out to the mapped grass areas. Gravel is only placed where the
   FIA notes confirm it: the exit of Turn 4 (left side), the exit of Turn 6 (right side), and the 2.5 m gravel strips
   right behind the exit kerbs of Turns 9 and 10 (left side). The size of the Turn 4 and Turn 6 gravel traps is an
   estimate.
7. **Kerbs.** 2 m wide, as at the real track. Each corner has a kerb on the inside from turn-in to just past the
   apex and on the outside along the exit. Yellow sausage kerbs sit behind the exit kerbs of Turns 1 and 3. Where the
   FIA moved the white line onto the kerb (Turns 1, 3, 4, 6, 7 entry, 8, 9 and 10), the line is drawn on the kerb
   with the light-blue line behind it (the side used at Turn 7 is a guess, the notes do not say), and at Turns 9 and 10 the part of the kerb inside the line is painted black.
8. **Timing lines and DRS.** Sector 1 (170 m before Turn 3), sector 2 (60 m before Turn 7), the speed trap (170 m
   before Turn 4), and the three DRS detection and activation lines are painted on the track with boards next to
   them. The timing panel shows S1, S2 and S3 times, and the small map shows the DRS zones in green.
9. **Bull sculpture.** "Der Bulle vom Spielberg" stands at its OpenStreetMap position on the hill above Turns 7 and
   8, at its real height of 17.2 m including the arch. It is a simple steel shape, no logo.
10. **Data pipeline.** All of the above is produced by the builder from the cached downloads, so it can be rebuilt
   the same way every time. Autopilot lap still runs clean: 1:18.6 flying lap, no wall hits, same as before.

### Next steps

11. **Better height data.** Swap the 25 m EU-DEM for the 1 m laser-scan terrain model of Styria (Land Steiermark
    open data, check the licence first). This would give real crests, dips and banking instead of a smoothed fit,
    and would let the builder add the camber at Turn 4 (slopes outwards) and Turn 6 (off-camber). Highest value for
    how the car behaves.
12. **Gravel and run-off traced from aerial photos.** Trace the gravel traps, painted run-off and grass edges from
    the basemap.at aerial photos (open data). This replaces the estimated sizes of the Turn 4 and Turn 6 traps and
    fills gaps in the OpenStreetMap grass areas.
13. **Drivable pit lane.** The pit lane is scenery today (the pit wall blocks the way in). Open the pit entry and
    exit from the OpenStreetMap lane, add the 80 km/h limit between the pit lane lines, and let Autopilot do a pit
    stop. Needs changes in `track_mode.js` only.
14. **2026 overtaking zones.** From 2026 the DRS lines are replaced. F1 lists four Straight Mode zones (start/finish
    straight, Turns 1 to 3, Turns 3 to 4, Turns 8 to 9) and an Overtake detection line just before Turn 10 with
    activation on its exit. The exact distances need the 2026 FIA event notes. Linking them to the Z-MODE / X-MODE
    button needs a change in the car and app code, so it is left for the car side.
15. **Pit building and paddock.** The FIA pit lane drawing shows 32 garage positions. The painted pit boxes now
    match that (32, up from 22), but the garage doors on the building are still one repeated picture. Add the race control tower and the Red Bull Wing building (labelled on the FIA map next to the paddock) from
    their OpenStreetMap outlines.
16. **Lap pace.** Autopilot lap is about 1:18.6. The 2025 pole was 1:03.971. Most of the gap is grip and power in
    the simple driving model. The grip numbers live in `track_mode.js`; car mass, power and downforce belong to the
    car files, so any change there should be agreed with the car side first.
17. **Marshal posts and light panels.** The FIA circuit map shows marshal posts M0 to M27 and light panels 1 to 16.
    Add them as small trackside huts and panels.
18. **Grandstand detail.** The nine OpenStreetMap grandstands are plain blocks with a crowd texture. Add the roof
    shapes and seat colours from photos.
19. **Kerb shapes.** Real kerbs here have a flat inner part and a raised outer part; the model has one gentle slope.
    Model the two parts and give the car a small bump over the raised part.

## Sources

- FIA / Red Bull Ring media kit 2022: 4.318 km, 10 corners (3 left, 7 right), 12 % up, 9.3 % down, width 12 to 13 m.
  https://www.fia.com/sites/default/files/spg2022_0208_f1_mediakit_2022_eng_a4_220708_view.pdf
- Red Bull Ring circuit page: 65 m height difference, corner names, 626 m start/finish straight.
  https://www.redbullring.com/en/events-tickets/formula-1/formula-1-circuit/
- FIA 2018 Austrian GP preview: start line / finish line offset 0.126 km, pit lane 80 km/h, DRS points.
  https://www.fia.com/file/70003/download?token=T42jnsVS
- FIA 2025 Austrian GP circuit map and pit lane drawing: corner names, sector lines, speed trap, DRS points,
  "Pole LHS", 32 garage positions, Red Bull Wing.
  https://www.fia.com/system/files/decision-document/2025_austrian_grand_prix_-_event_notes_-_circuit_map_pit_lane_emergency_exit_map_quarantine_zone_red_zones.pdf
- FIA 2024 race director's event notes: 2.5 m gravel strips at Turns 9 and 10, white line moves at Turns 1, 3, 4, 6,
  yellow sausage kerbs at Turns 1 and 3.
  https://www.fia.com/sites/default/files/decision-document/2024%20Austrian%20Grand%20Prix%20-%20Race%20Director's%20Event%20Notes.pdf
- FIA 2025 race director's event notes: light-blue lines behind the white lines.
  https://www.fia.com/system/files/decision-document/2025_austrian_grand_prix_-_race_directors_event_notes_v3.pdf
- FIA news, 2024 (kerb width 2 m): https://www.fia.com/news/f1-ringing-changes-how-fia-finding-limit-red-bull-ring-thanks-key-circuit-updates
- Motorsport.com, 2024 (inner part of the kerb painted black): https://www.motorsport.com/f1/news/why-new-perfect-red-bull-ring-kerb-solution-could-banish-f1s-track-limits-problem/10627857/
- Corner order and character (Turn 5 kink, Turns 6 and 7 lefts, Turn 9 over a crest): https://www.redbull.com/in-en/red-bull-ring-formula-racing-jehan-daruvala
- F1.com circuit guide (2026 Straight Mode zones, 2025 lap record): https://www.formula1.com/en/latest/article/circuit-guide-everything-you-need-to-know-about-the-red-bull-ring.76j6twpa7Be26Prj6fO90F
- RaceFans circuit data (pole on the left): https://www.racefans.net/f1-information/going-to-a-race/red-bull-ring-circuit-information/
- Bull sculpture, 14.6 m bull, 17.2 m with the arch: https://www.3dkunst.at/der-bulle-aus-stahl/
- OpenStreetMap (ODbL): start and finish line nodes, walls, tyre walls, grass areas, bull position, grandstands, pit lane.
- TUMFTM racetrack database (LGPL-3.0): centre line, widths, race line. EU-DEM v1.1 via OpenTopoData: terrain height.
