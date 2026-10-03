#!/usr/bin/env python3
"""
Download the TUMFTM racetrack-database centreline and race line CSVs for every 2026 circuit that has one.

Source: https://github.com/TUMFTM/racetrack-database (LGPL-3.0). Files land in cad/track/raw/tumftm/:
  <Stem>.csv           centreline: x_m, y_m, w_tr_right_m, w_tr_left_m (local metres, driving direction)
  <Stem>_raceline.csv  minimum-curvature race line: x_m, y_m
The data is pinned to one commit so a rebuild always gets the same files.

Usage:  python3 tools/track/research/fetch_tumftm.py [--force]
Prints which 2026 circuits have TUMFTM data and which do not.

It also downloads the bacinger/f1-circuits GeoJSON line (MIT licence) for circuits whose OSM ways do not close a
lap yet (only Madring today) into cad/track/raw/bacinger/.
"""
import os, sys, urllib.request
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from circuits_2026 import CIRCUITS

COMMIT = 'e59595d1f3573b30d1ded6a08984935b957688e0'   # TUMFTM master, 2021-09-18 (latest commit as of 2026-10-03)
BASE = f'https://raw.githubusercontent.com/TUMFTM/racetrack-database/{COMMIT}/'
REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
OUT = os.path.join(REPO, 'cad', 'track', 'raw', 'tumftm')
BACINGER_COMMIT = '394d8fbe70ef2c0b0c8d23ff7bee61fa09606055'   # bacinger/f1-circuits master, 2026-02-05
BACINGER_BASE = f'https://raw.githubusercontent.com/bacinger/f1-circuits/{BACINGER_COMMIT}/circuits/'
BACINGER_OUT = os.path.join(REPO, 'cad', 'track', 'raw', 'bacinger')


def fetch(url, dst, force=False):
    if os.path.exists(dst) and not force:
        return False
    req = urllib.request.Request(url, headers={'User-Agent': 'f1-nimble-car-track-research'})
    with urllib.request.urlopen(req, timeout=120) as r:
        data = r.read()
    with open(dst, 'wb') as f:
        f.write(data)
    return True


def main():
    force = '--force' in sys.argv
    os.makedirs(OUT, exist_ok=True)
    have, missing = [], []
    for c in CIRCUITS:
        stem = c['tumftm']
        if not stem:
            missing.append(c['id'])
            continue
        for sub, suffix in (('tracks', ''), ('racelines', '_raceline')):
            dst = os.path.join(OUT, f'{stem}{suffix}.csv')
            got = fetch(f'{BASE}{sub}/{stem}.csv', dst, force)
            print(('downloaded ' if got else 'cached     ') + os.path.relpath(dst, REPO))
        have.append(c['id'])
    print(f'\nTUMFTM centreline available for {len(have)} of {len(CIRCUITS)} circuits: {", ".join(have)}')
    print(f'No TUMFTM file for: {", ".join(missing)}  (use the OpenStreetMap centreline, see cad/track/circuits/README.md)')
    os.makedirs(BACINGER_OUT, exist_ok=True)
    for c in CIRCUITS:
        if c.get('bacinger'):
            dst = os.path.join(BACINGER_OUT, c['bacinger'] + '.geojson')
            got = fetch(BACINGER_BASE + c['bacinger'] + '.geojson', dst, force)
            print(('downloaded ' if got else 'cached     ') + os.path.relpath(dst, REPO) + f'  ({c["id"]})')


if __name__ == '__main__':
    main()
