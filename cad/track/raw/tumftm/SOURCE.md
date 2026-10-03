# TUMFTM racetrack-database files

These CSV files are copied unchanged from https://github.com/TUMFTM/racetrack-database
at commit e59595d1f3573b30d1ded6a08984935b957688e0 (September 2021, still the latest commit on 3 October 2026).

Licence: LGPL-3.0, from the Institute of Automotive Technology, Technical University of Munich (TUM FTM).

- `<Name>.csv` is the centreline: x_m, y_m, w_tr_right_m, w_tr_left_m. Local metres, in driving direction.
- `<Name>_raceline.csv` is their computed fastest line: x_m, y_m.

Download again with `python3 tools/track/research/fetch_tumftm.py`.

Some files show an older layout: Yas Marina (pre-2021, about 266 m too long) and Zandvoort (pre-2020, about 58 m too long).
The research pack uses the OpenStreetMap line for those two instead.
