# Pack centrelines

One CSV per circuit, written by `tools/track/research/build_research_pack.py`. Do not edit by hand.

Columns: s_m (distance along the lap in race direction), lat, lon, elev_m (terrain model, smoothed),
w_right_m, w_left_m (distance from the line to each track edge, TUMFTM circuits only, blank otherwise).
One row every 5 m. Sources are listed in each circuit's JSON file under `centreline` and `sources`.

Data comes from OpenStreetMap contributors (ODbL), TUMFTM racetrack-database (LGPL-3.0),
bacinger/f1-circuits (MIT, Madring only) and terrain heights from OpenTopoData (EU-DEM 25 m in Europe, SRTM 30 m elsewhere).
