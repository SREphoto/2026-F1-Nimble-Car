#!/usr/bin/env python3
"""
Build cad/track/red_bull_ring_data.js from public open data.

Sources
  * Centreline + track widths + race line: TUMFTM racetrack-database
    (https://github.com/TUMFTM/racetrack-database, tracks/Spielberg.csv, racelines/Spielberg.csv, LGPL-3.0).
    The TUMFTM centreline was itself derived from OpenStreetMap GPS points; widths from satellite imagery.
  * Geo-reference, pit lane, pit building and grandstand footprints: OpenStreetMap (c) OpenStreetMap contributors, ODbL.
    (highway=raceway ways, "Boxenstraße" pit lane, building "Box", building=grandstand polygons.)
  * Elevation: EU-DEM v1.1 25 m (Copernicus Land Monitoring Service) via the public OpenTopoData API
    (https://api.opentopodata.org/v1/eudem25m). The profile is then fitted to the official circuit figures
    (65 m height difference, max 12 % uphill, max 9.3 % downhill; FIA / Red Bull Ring media kit).
  * OpenStreetMap also gives the start line and finish line nodes, the concrete walls (barrier=wall), the tyre walls
    (barrier=tyres), the grass areas (landuse=grass) and the bull sculpture ("Der Bulle vom Spielberg").
  * Corner numbers, sector lines, speed trap and DRS points: FIA Austrian GP event notes / circuit map (2018-2025).
    Kerb width (2 m), gravel strips behind the T9/T10 exit kerbs, yellow sausage kerbs at T1/T3 exits and the
    light-blue lines behind the white lines: FIA race director's event notes 2024 + 2025.

Usage:  python3 tools/track/build_red_bull_ring.py [cache_dir]
Needs numpy + scipy + matplotlib (point-in-polygon tests). Downloads are cached in cache_dir (default ./.track_cache).
Output units are METRES in the circuit frame (x right, y up, z), the JS loader scales to scene decimetres.
Circuit frame: origin = front of the pole-position grid box, car facing -X at the origin, y = 0 at the origin.
"""
import json, os, sys, time, urllib.request, urllib.parse
import xml.etree.ElementTree as ET
import numpy as np
from scipy.interpolate import splprep, splev, RegularGridInterpolator
from scipy.ndimage import gaussian_filter1d
from scipy.spatial import cKDTree

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, '..', '..'))
CACHE = sys.argv[1] if len(sys.argv) > 1 else os.path.join(REPO, '.track_cache')
os.makedirs(CACHE, exist_ok=True)
LAT0, LON0 = 47.2197, 14.7647
KX, KY = np.cos(np.radians(LAT0)) * 111320.0, 110574.0
TUM = 'https://raw.githubusercontent.com/TUMFTM/racetrack-database/master/'

def fetch(url, name, data=None):
    p = os.path.join(CACHE, name)
    if not os.path.exists(p):
        print('fetch', url)
        req = urllib.request.Request(url, data=data, headers={'User-Agent': 'f1-nimble-car-track-builder'})
        with urllib.request.urlopen(req, timeout=120) as r, open(p, 'wb') as f:
            f.write(r.read())
    return p

def enu(lat, lon): return np.c_[(np.asarray(lon) - LON0) * KX, (np.asarray(lat) - LAT0) * KY]
def toll(P): return np.c_[P[:, 1] / KY + LAT0, P[:, 0] / KX + LON0]

def dem(P, name):
    p = os.path.join(CACHE, name + '.npy')
    if os.path.exists(p): return np.load(p)
    ll = toll(P); out = []
    for k in range(0, len(ll), 100):
        loc = '|'.join('%.6f,%.6f' % (a, b) for a, b in ll[k:k + 100])
        data = urllib.parse.urlencode({'locations': loc}).encode()
        for attempt in range(6):
            try:
                req = urllib.request.Request('https://api.opentopodata.org/v1/eudem25m', data=data)
                res = json.load(urllib.request.urlopen(req, timeout=60)); break
            except Exception as e:
                print('retry', e); time.sleep(3)
        out += [r['elevation'] for r in res['results']]
        time.sleep(1.1)
    e = np.array(out, dtype=float); np.save(p, e); return e

# ---------------------------------------------------------------- load
tum = np.loadtxt(fetch(TUM + 'tracks/Spielberg.csv', 'Spielberg.csv'), delimiter=',', comments='#')
rl = np.loadtxt(fetch(TUM + 'racelines/Spielberg.csv', 'Spielberg_raceline.csv'), delimiter=',', comments='#')
osm = ET.parse(fetch('https://api.openstreetmap.org/api/0.6/map?bbox=14.750,47.212,14.775,47.232', 'spielberg.osm')).getroot()
nodes = {n.get('id'): (float(n.get('lat')), float(n.get('lon'))) for n in osm.findall('node')}
ways = []
for w in osm.findall('way'):
    t = {x.get('k'): x.get('v') for x in w.findall('tag')}
    pts = [nodes[n.get('ref')] for n in w.findall('nd') if n.get('ref') in nodes]
    if len(pts) >= 2: ways.append((t, enu(*np.array(pts).T)))

# ---------------------------------------------------------------- geo-reference TUMFTM (local metres) onto OSM
gp = []
for t, p in ways:
    nm = t.get('name', '')
    if t.get('highway') == 'raceway' and t.get('sport') != 'motocross' and not any(k in nm for k in ('Long Lap', 'chicane', 'Süd', 'Boxen')):
        for a, b in zip(p[:-1], p[1:]):
            n = max(1, int(np.linalg.norm(b - a) / 2))
            gp += [a + (b - a) * k / n for k in range(n)]
gp = np.array(gp); tree = cKDTree(gp)
P = tum[:, :2]
best = None
for ang in np.radians(np.arange(0, 360, 15)):
    R = np.array([[np.cos(ang), -np.sin(ang)], [np.sin(ang), np.cos(ang)]])
    X = P @ R.T; X += gp.mean(0) - X.mean(0)
    for it in range(50):
        d, i = tree.query(X); m = d < np.percentile(d, 90)
        A, B = X[m], gp[i[m]]; ca, cb = A.mean(0), B.mean(0)
        U, S, Vt = np.linalg.svd((A - ca).T @ (B - cb)); Rr = (U @ Vt).T
        if np.linalg.det(Rr) < 0: Vt[-1] *= -1; Rr = (U @ Vt).T
        X = (X - ca) @ Rr.T + cb
    d, _ = tree.query(X)
    if best is None or np.median(d) < best[0]: best = (np.median(d), X)
print('georef residual median %.2f m' % best[0])
X = best[1]
ca, cb = P.mean(0), X.mean(0); U, S, Vt = np.linalg.svd((P - ca).T @ (X - cb)); RT = (U @ Vt).T; TT = cb - ca @ RT.T
to_enu = lambda Q: Q @ RT.T + TT
RL = to_enu(rl)

# ---------------------------------------------------------------- elevation
e_tum = dem(X, 'tum_elev')
mn, mx = X.min(0) - 700, X.max(0) + 700
gx = np.arange(mn[0], mx[0] + 1, 50.0); gy = np.arange(mn[1], mx[1] + 1, 50.0)
G = np.array([(x, y) for y in gy for x in gx])
e_grid = dem(G, 'terrain_grid').reshape(len(gy), len(gx))
_dem_inner = RegularGridInterpolator((gy, gx), e_grid)
cE = (X.min(0) + X.max(0)) / 2
ox = np.arange(cE[0] - 4500, cE[0] + 4501, 100.0); oy = np.arange(cE[1] - 4500, cE[1] + 4501, 100.0)
O = np.array([(x, y) for y in oy for x in ox])
e_outer = dem(O, 'terrain_outer').reshape(len(oy), len(ox))
_dem_outer = RegularGridInterpolator((oy, ox), e_outer)
def dem_i(Q):
    Q = np.atleast_2d(Q)
    inside = (Q[:, 0] >= gy[0]) & (Q[:, 0] <= gy[-1]) & (Q[:, 1] >= gx[0]) & (Q[:, 1] <= gx[-1])
    out = _dem_outer(np.c_[np.clip(Q[:, 0], oy[0], oy[-1]), np.clip(Q[:, 1], ox[0], ox[-1])])
    if inside.any(): out[inside] = _dem_inner(Q[inside])
    return out

# ---------------------------------------------------------------- resample closed centreline every ~2.5 m
closedP = np.vstack([X, X[:1]])
seg = np.linalg.norm(np.diff(closedP, axis=0), axis=1); L = seg.sum()
u0 = np.r_[0, np.cumsum(seg)] / L
vals = np.vstack([closedP.T, np.r_[tum[:, 2], tum[0, 2]], np.r_[tum[:, 3], tum[0, 3]], np.r_[gaussian_filter1d(e_tum, 3, mode='wrap'), 0]])
vals[4, -1] = vals[4, 0]
N = int(round(L / 2.5))
uu = np.arange(N) / N
from scipy.interpolate import CubicSpline
cs = CubicSpline(u0, vals.T, bc_type='periodic', axis=0)
S = cs(uu)  # N x 5 : E, N, wr, wl, elev
C = S[:, :2]
# The 25 m DEM includes cuttings/embankments next to the track, so its raw profile is a bit too steep (69 m span,
# 15.5 % max uphill). Smooth ~30 m, then fit the profile to the official figures: 65 m height difference,
# max 12 % uphill and max 9.3 % downhill (FIA / Red Bull Ring media kit). Max change vs the DEM is ~2.5 m.
OFFICIAL_SPAN, MAX_UP, MAX_DN = 65.0, 0.12, 0.093
def fit_profile(e0, ds, span=OFFICIAL_SPAN, up=MAX_UP, dn=MAX_DN, it=60):
    e = e0.copy()
    for _ in range(it):
        e = (e - e.mean()) * (span / (e.max() - e.min())) + e0.mean()
        g = np.diff(np.r_[e, e[0]]) / ds
        gc = np.clip(g, -dn, up); free = gc == g
        if free.any(): gc[free] -= gc.sum() / free.sum()      # keep the lap closed
        e = np.r_[0, np.cumsum(gc[:-1])] * ds; e += e0.mean() - e.mean()
        e = gaussian_filter1d(e, 2, mode='wrap')
    return e
elev_dem = gaussian_filter1d(S[:, 4], 12, mode='wrap')
elev = fit_profile(elev_dem, L / N)
_g = np.diff(np.r_[elev, elev[0]]) / (L / N)
print('lap length %.1f m, samples %d, elevation span %.1f m (DEM %.1f m), max up %.1f %%, max down %.1f %%, max change vs DEM %.1f m' % (
    L, N, elev.max() - elev.min(), elev_dem.max() - elev_dem.min(), _g.max() * 100, -_g.min() * 100,
    np.abs((elev - elev.mean()) - (elev_dem - elev_dem.mean())).max()))
# Track width: TUMFTM widths average 11.0 m (10.2-13.7 m); the FIA gives 12-13 m. Add 0.75 m per side
# (average 12.5 m) so the car has the real room; the shape of the width profile is kept.
WIDEN = 0.75
S[:, 2] += WIDEN; S[:, 3] += WIDEN

# ---------------------------------------------------------------- circuit frame
tE = np.gradient(C, axis=0); tE /= np.linalg.norm(tE, axis=1)[:, None]
def to_xz(Q): return np.c_[Q[:, 0], -Q[:, 1]]          # ENU -> (x,z) with y up
Cxz = to_xz(C); txz = to_xz(tE)
POLE_BACK = 4.0
# OSM start line / finish line nodes (circuit relation "Red Bull Ring"); the FIA lists a 126 m start/finish offset.
_ctreeE = cKDTree(C)
START_ENU = enu(*np.array([nodes['13826152421']]).T); FINISH_ENU = enu(*np.array([nodes['13826152422']]).T)
istart = int(_ctreeE.query(START_ENU)[1][0]); ifinish = int(_ctreeE.query(FINISH_ENU)[1][0])
ipole = (istart - int(round(POLE_BACK / (L / N)))) % N        # front of the pole box 4 m behind the start line
t0 = txz[ipole]; a = np.pi - np.arctan2(t0[1], t0[0])
Rm = np.array([[np.cos(a), -np.sin(a)], [np.sin(a), np.cos(a)]])
right0 = np.array([-t0[1], t0[0]])
wr0, wl0 = S[ipole, 2], S[ipole, 3]
mid_off = (wl0 - wr0) / 2.0          # metres to the left of the centreline = geometric middle
POLE_SIDE = -1.0                     # pole on the LEFT-hand side of the grid (FIA pit lane drawing, "Pole LHS")
GRID_HALF = 2.6                      # grid slot centres 2.6 m either side of the middle
origin = Cxz[ipole] - right0 * mid_off + right0 * GRID_HALF * POLE_SIDE
y0 = elev[ipole]
def frame(Qxz): return (Qxz - origin) @ Rm.T
Cf = frame(Cxz); Yf = elev - y0
tf = txz @ Rm.T
print('start tangent in frame', tf[ipole], 'pole origin check', Cf[ipole])

def enu_to_frame(Q): return frame(to_xz(Q))
# frame -> ENU (for DEM lookups)
Rinv = Rm.T
def frame_to_enu(F):
    xz = F @ Rinv.T + origin
    return np.c_[xz[:, 0], -xz[:, 1]]

# ---------------------------------------------------------------- curvature, turns, kerbs, run-off
sarr = np.arange(N) * (L / N)
hd = np.unwrap(np.arctan2(tf[:, 1], tf[:, 0]))
k = np.gradient(hd) / (L / N)            # >0 : turning right (towards +right vector)
ks = gaussian_filter1d(k, 4, mode='wrap')
# turn detection: peaks of |ks| separated by 100 m
cand = [i for i in range(N) if abs(ks[i]) > 1 / 900 and abs(ks[i]) >= abs(ks[i - 1]) and abs(ks[i]) >= abs(ks[(i + 1) % N])]
cand.sort(key=lambda i: -abs(ks[i]))
turns = []
for i in cand:
    if all(min(abs(sarr[i] - sarr[j]), L - abs(sarr[i] - sarr[j])) > 110 for j in turns): turns.append(i)
turns = sorted(turns[:12], key=lambda i: (sarr[i] - sarr[ipole]) % L)
for i in turns: print('turn cand s=%.0f R=%.0f m dir=%s' % ((sarr[i] - sarr[ipole]) % L, 1 / abs(ks[i]), 'R' if ks[i] > 0 else 'L'))
# turn numbering (official 10 turns) — match detected curvature peaks to known distances after the finish line
# Official numbering (FIA circuit map 2025): T1 Niki Lauda (R), T2 kink (L), T3 Remus hairpin (R), T4 Rauch (R),
# T5 fast kink (R), T6 + T7 the two lefts, T8 fast right, T9 Jochen Rindt (R, over the crest), T10 last corner (R).
# Distances are metres after the finish line, matched to the nearest curvature peak.
EXPECTED = [453, 1066, 1396, 2211, 2468, 2741, 3096, 3221, 3791, 3991]
TURN_NAMES = ['Niki Lauda', '', 'Remus', 'Rauch', '', '', '', '', 'Jochen Rindt', '']
sp_all = lambda i: (sarr[i] - sarr[ifinish]) % L
turns = [min(turns, key=lambda i: abs(sp_all(i) - e)) for e in EXPECTED]
for kk, i in enumerate(turns): print('T%d %s s(after finish)=%.0f R=%.0f m %s' % (kk + 1, TURN_NAMES[kk], sp_all(i), 1 / abs(ks[i]), 'right' if ks[i] > 0 else 'left'))

pit = None; box = None; stands = []
for t, p in ways:
    if t.get('name') == 'Boxenstraße': pit = p
    if t.get('name') == 'Box' and t.get('building'): box = p
    if t.get('building') == 'grandstand': stands.append((t.get('name'), p))
pit_f = enu_to_frame(pit)
# resample pit lane every 2 m
pl = np.r_[0, np.cumsum(np.linalg.norm(np.diff(pit_f, axis=0), axis=1))]
ps = np.arange(0, pl[-1], 2.0)
pit_r = np.c_[np.interp(ps, pl, pit_f[:, 0]), np.interp(ps, pl, pit_f[:, 1])]
pit_r = np.c_[gaussian_filter1d(pit_r[:, 0], 2, mode='nearest'), gaussian_filter1d(pit_r[:, 1], 2, mode='nearest')]
ctree = cKDTree(Cf)
_, pi_near = ctree.query(pit_r)
pit_y = Yf[pi_near]
PIT_W = 12.0

nrm_r = np.c_[-tf[:, 1], tf[:, 0]]       # right normal
outside_right = ks < 0                   # left turn -> outside is right side
curv = np.abs(gaussian_filter1d(k, 10, mode='wrap'))
# exit-biased run-off: shift the curvature envelope forward ~30 m
shift = int(30 / (L / N))
env = np.maximum(curv, np.roll(curv, shift))
runA = np.clip(env * 4200 - 2.0, 0, 24) + 2.0         # asphalt run-off width beyond kerb (m)

# free lateral space to other track sections / pit lane
others = np.vstack([Cf, pit_r]); other_half = np.r_[(S[:, 2] + S[:, 3]) / 2, np.full(len(pit_r), PIT_W / 2)]
other_s = np.r_[sarr, np.full(len(pit_r), -1e9)]
free = np.full((N, 2), 60.0)   # [:,0] right side, [:,1] left side
for i in range(N):
    dq = others - Cf[i]
    along = dq @ tf[i]; lat = dq @ nrm_r[i]
    ds = np.abs(other_s - sarr[i]); ds = np.minimum(ds, L - ds)
    m = (np.abs(along) < 20) & (ds > 140)
    for side, sg in ((0, 1), (1, -1)):
        mm = m & (sg * lat > 0)
        if mm.any():
            free[i, side] = min(free[i, side], (sg * lat[mm] - other_half[mm]).min())
free = np.c_[gaussian_filter1d(free[:, 0], 2, mode='wrap'), gaussian_filter1d(free[:, 1], 2, mode='wrap')]
wr, wl = S[:, 2], S[:, 3]
KERB_W = 2.0                                   # FIA: the kerbs at the Red Bull Ring are 2 m wide
dsm = L / N
def srange(i0, m0, m1):
    """sample indices from m0 to m1 metres relative to sample i0 (wrapping)"""
    return np.arange(i0 + int(round(m0 / dsm)), i0 + int(round(m1 / dsm)) + 1) % N
# ---- kerbs per side: inside kerb from turn-in to just after the apex, outside kerb on the exit
kerbR = np.zeros(N, bool); kerbL = np.zeros(N, bool)
for kk, ti in enumerate(turns):
    right = ks[ti] > 0
    # corner extent: walk out from the apex while the bend is still tighter than R 600 m (cap 90 m / 130 m)
    b = 0
    while b * dsm < 90 and abs(ks[(ti - b) % N]) > 1 / 600: b += 1
    f = 0
    while f * dsm < 130 and abs(ks[(ti + f) % N]) > 1 / 600: f += 1
    ins = srange(ti, -b * dsm - 8, 25); out = srange(ti, -15, f * dsm + 30)
    (kerbR if right else kerbL)[ins] = True
    (kerbL if right else kerbR)[out] = True
# smaller bends that are not numbered corners (e.g. T4 exit, T10 exit) keep a curvature-based kerb on both sides
extra = gaussian_filter1d((np.abs(ks) > 1 / 200).astype(float), 6, mode='wrap') > 0.2
kerbR |= extra; kerbL |= extra
kerb = kerbR | kerbL

# ---- barriers: OpenStreetMap concrete walls (barrier=wall) and tyre walls (barrier=tyres)
def dens(p, step=0.5):
    out = []
    for a, b in zip(p[:-1], p[1:]):
        n = max(1, int(np.linalg.norm(b - a) / step)); out += [a + (b - a) * q / n for q in range(n)]
    out.append(p[-1]); return np.array(out)
def osm_side(kind):
    pts = [dens(enu_to_frame(p)) for t, p in ways if t.get('barrier') == kind]
    R = np.full(N, np.inf); Lft = np.full(N, np.inf)
    if not pts: return R, Lft
    P = np.vstack(pts); _, ii = ctree.query(P)
    lat = np.einsum('ij,ij->i', P - Cf[ii], nrm_r[ii])
    for q in range(len(P)):
        a = abs(lat[q])
        if a > 80: continue
        if lat[q] > 0: R[ii[q]] = min(R[ii[q]], a)
        else: Lft[ii[q]] = min(Lft[ii[q]], a)
    return R, Lft
wallR, wallL = osm_side('wall'); tyreR_d, tyreL_d = osm_side('tyres')
def win_min(a, h=3):
    return np.min(np.stack([np.roll(a, s_) for s_ in range(-h, h + 1)]), axis=0)
oR = win_min(np.minimum(wallR, tyreR_d)); oL = win_min(np.minimum(wallL, tyreL_d))
tyreR = win_min(tyreR_d) <= win_min(wallR) + 0.5; tyreL = win_min(tyreL_d) <= win_min(wallL) + 0.5

# heuristic fallback (curvature + free space), only used where OSM has no barrier on that side
curv_run = np.clip(env * 4200 - 2.0, 0, 24) + 2.0
GRASS = 3.0
def heur_bar(edge, run, fr):
    want = edge + KERB_W + run + GRASS
    lim = np.maximum(edge + KERB_W + 1.0, fr / 2.0)
    return np.minimum(want, np.where(fr < 59, lim, want))
hR = heur_bar(wr, np.where(outside_right, curv_run, 2.0), free[:, 0])
hL = heur_bar(wl, np.where(~outside_right, curv_run, 2.0), free[:, 1])
MIN_GAP = 1.0                                  # keep the wall at least 1 m beyond the kerb
barR = np.where(np.isfinite(oR), oR, hR); barL = np.where(np.isfinite(oL), oL, hL)
print('barriers from OSM: right %.0f %%, left %.0f %% of the lap' % (np.isfinite(oR).mean() * 100, np.isfinite(oL).mean() * 100))
barR = np.maximum(gaussian_filter1d(barR, 2, mode='wrap'), wr + KERB_W + MIN_GAP)
barL = np.maximum(gaussian_filter1d(barL, 2, mode='wrap'), wl + KERB_W + MIN_GAP)
tyreR &= np.isfinite(oR); tyreL &= np.isfinite(oL)

# ---- run-off surface: asphalt from the kerb out to the first OSM grass area (landuse=grass), else up to the wall
from matplotlib.path import Path as MPath
grass_polys = [MPath(enu_to_frame(p)) for t, p in ways if t.get('landuse') == 'grass' and len(p) > 3]
def runoff_side(edge, bar, sg):
    steps = np.arange(0.0, 60.0, 0.5)
    run = np.zeros(N)
    for i in range(N):
        lim = bar[i] - edge[i] - KERB_W - 0.6
        if lim <= 0: continue
        st = steps[steps <= lim]
        P = Cf[i] + np.outer(edge[i] + KERB_W + st, nrm_r[i] * sg)
        inside = np.zeros(len(st), bool)
        for pg in grass_polys: inside |= pg.contains_points(P)
        run[i] = st[np.argmax(inside)] if inside.any() else lim
    # median-ish cleanup of single-sample spikes, then light smoothing
    run = np.minimum(run, np.maximum(np.roll(run, 1), np.roll(run, -1)))
    return np.clip(gaussian_filter1d(run, 1.5, mode='wrap'), 0, None)
runR = runoff_side(wr, barR, 1); runL = runoff_side(wl, barL, -1)
print('asphalt run-off (m beyond kerb): right mean %.1f, left mean %.1f' % (runR.mean(), runL.mean()))

# ---- gravel (FIA event notes 2024): T4 exit LHS and T6 exit RHS gravel 1.8 m from the white line,
# T9 + T10 exits LHS: 2.5 m gravel strip directly behind the kerb. Gravel starts right behind the kerb.
gravR = np.zeros(N); gravL = np.zeros(N)
GRAVEL = [  # (turn, side, from m, to m after apex, width m)  widths of the T4 / T6 traps are estimates
    (4, 'L', 10, 150, 14.0), (6, 'R', 0, 110, 10.0), (9, 'L', 5, 110, 2.5), (10, 'L', 5, 120, 2.5)]
for tn, side, m0, m1, w in GRAVEL:
    idx = srange(turns[tn - 1], m0, m1)
    tgt = gravR if side == 'R' else gravL
    tgt[idx] = np.maximum(tgt[idx], w)
gravR = np.minimum(gaussian_filter1d(gravR, 1.5, mode='wrap'), np.maximum(barR - wr - KERB_W - 0.8, 0))
gravL = np.minimum(gaussian_filter1d(gravL, 1.5, mode='wrap'), np.maximum(barL - wl - KERB_W - 0.8, 0))
gravR[gravR < 0.4] = 0; gravL[gravL < 0.4] = 0

# ---- painted details from the FIA event notes: white line moved onto the kerb + light-blue line behind it,
# yellow sausage kerbs behind the T1 / T3 exit kerbs (LHS)
def feat(tn, side, m0, m1, **kw):
    a = turns[tn - 1]
    return dict(turn=tn, side=side, sp0=round(float((sarr[a] - sarr[ipole]) % L + m0), 1), sp1=round(float((sarr[a] - sarr[ipole]) % L + m1), 1), **kw)
features = [
    feat(1, 'L', 10, 90, type='sausage'), feat(3, 'L', 5, 80, type='sausage'),
    feat(9, 'L', 5, 110, type='blueline', onKerb=0.5), feat(10, 'L', 5, 120, type='blueline', onKerb=0.5),
    feat(4, 'L', 10, 150, type='blueline', onKerb=0.2), feat(6, 'R', 0, 110, type='blueline', onKerb=0.2),
    feat(1, 'L', 0, 90, type='blueline', onKerb=0.2), feat(3, 'L', 0, 80, type='blueline', onKerb=0.2),
    feat(7, 'L', -60, 0, type='blueline', onKerb=0.2), feat(8, 'R', 0, 90, type='blueline', onKerb=0.2),
]

# ---------------------------------------------------------------- terrain grid in circuit frame (20 m)
lo = Cf.min(0) - 560; hi = Cf.max(0) + 560
tx = np.arange(lo[0], hi[0] + 1, 20.0); tz = np.arange(lo[1], hi[1] + 1, 20.0)
TX, TZ = np.meshgrid(tx, tz)
F = np.c_[TX.ravel(), TZ.ravel()]
En = frame_to_enu(F)
H = dem_i(np.c_[En[:, 1], En[:, 0]]) - y0
d, ii = ctree.query(F)
bar_here = np.maximum(barR[ii], barL[ii])
inner = bar_here + 18.0
blend = np.clip((d - inner) / 90.0, 0, 1); blend = blend * blend * (3 - 2 * blend)
flat = Yf[ii] - 0.25
Ht = flat * (1 - blend) + H * blend
# pit lane / paddock flattening
ptree = cKDTree(pit_r); dp, pj = ptree.query(F)
bp = np.clip((dp - 70) / 80.0, 0, 1); bp = bp * bp * (3 - 2 * bp)
Ht = np.where(dp < 150, np.minimum(Ht, (pit_y[pj] - 0.25) * (1 - bp) + Ht * bp) * (d > inner) + Ht * (d <= inner), Ht)
Ht = Ht.reshape(TX.shape)

# outer (scenery) terrain, 100 m grid, vertices under the inner grid pushed far down
cF = (Cf.min(0) + Cf.max(0)) / 2
qx = np.arange(cF[0] - 4000, cF[0] + 4001, 100.0); qz = np.arange(cF[1] - 4000, cF[1] + 4001, 100.0)
QX, QZ = np.meshgrid(qx, qz); QF = np.c_[QX.ravel(), QZ.ravel()]
QE = frame_to_enu(QF); QH = dem_i(np.c_[QE[:, 1], QE[:, 0]]) - y0
hole = (QF[:, 0] > tx[0] + 110) & (QF[:, 0] < tx[-1] - 110) & (QF[:, 1] > tz[0] + 110) & (QF[:, 1] < tz[-1] - 110)
QH[hole] = -300.0


# ---------------------------------------------------------------- buildings / grandstands (oriented boxes)
def obb(Q):
    best = None
    hull = Q
    for a in np.radians(np.arange(0, 180, 1.0)):
        R = np.array([[np.cos(a), np.sin(a)], [-np.sin(a), np.cos(a)]])
        q = Q @ R.T; ext = np.ptp(q, 0); area = ext[0] * ext[1]
        if best is None or area < best[0]:
            c = (q.min(0) + q.max(0)) / 2
            best = (area, c @ R, ext, a)
    _, c, ext, a = best
    ax = np.array([np.cos(a), np.sin(a)])
    if ext[0] < ext[1]:
        ext = ext[::-1]; ax = np.array([-ax[1], ax[0]])
    return c, ext, ax
def ground_at(F2):
    En2 = frame_to_enu(np.atleast_2d(F2)); return dem_i(np.c_[En2[:, 1], En2[:, 0]]) - y0

_ht_interp = RegularGridInterpolator((tz, tx), Ht, bounds_error=False, fill_value=None)
def _ht_at(F2): return _ht_interp(np.atleast_2d(F2)[:, ::-1])[0]
box_f = enu_to_frame(box); bc, bext, bax = obb(box_f)
_, bi = ctree.query(bc); _, bpj = ptree.query(bc)
pit_building = dict(c=bc.round(2).tolist(), len=round(float(bext[0]), 1), dep=round(float(bext[1]), 1), ax=bax.round(4).tolist(), y=round(float(pit_y[bpj]), 2))
gs = []
for name, p in stands:
    pf = enu_to_frame(p); c, ext, ax = obb(pf)
    _, ci = ctree.query(c)
    to_track = Cf[ci] - c
    nrm = np.array([-ax[1], ax[0]])
    if nrm @ to_track < 0: nrm = -nrm
    # stand on the shaped terrain at its track-side edge (the tiers then rise up the slope behind it)
    front = c + nrm * min(ext[1], 45) / 2
    ground = float(_ht_at(front)) if 'Ht' in globals() else float(min(ground_at(c)[0], Yf[ci] + 1.0))
    gs.append(dict(name=name, c=c.round(2).tolist(), len=round(float(ext[0]), 1), dep=round(float(min(ext[1], 45)), 1), face=nrm.round(4).tolist(), y=round(ground, 2), dist=round(float(np.linalg.norm(to_track)), 1)))
    print('stand', name, gs[-1]['len'], gs[-1]['dep'], gs[-1]['dist'])

# ---------------------------------------------------------------- timing lines, landmarks
sp_pole = lambda i: float((sarr[i] - sarr[ipole]) % L)
tsp = [sp_pole(i) for i in turns]
def at_turn(tn, d): return round((tsp[tn - 1] + d) % L, 1)
# FIA circuit map, 2025 Austrian GP (distances before / after the corner)
lines = [
    dict(kind='start', sp=round(sp_pole(istart), 1), label='Start line'),
    dict(kind='finish', sp=round(sp_pole(ifinish), 1), label='Finish / control line'),
    dict(kind='sector', sp=at_turn(3, -170), label='Sector 1'),
    dict(kind='sector', sp=at_turn(7, -60), label='Sector 2'),
    dict(kind='trap', sp=at_turn(4, -170), label='Speed trap'),
    dict(kind='drsDet', sp=at_turn(1, -160), label='DRS detection 1'),
    dict(kind='drsAct', sp=at_turn(1, 102), label='DRS activation 1'),
    dict(kind='drsDet', sp=at_turn(3, -40), label='DRS detection 2'),
    dict(kind='drsAct', sp=at_turn(3, 100), label='DRS activation 2'),
    dict(kind='drsDet', sp=at_turn(10, -120), label='DRS detection 3'),
    dict(kind='drsAct', sp=at_turn(10, 106), label='DRS activation 3'),
]
for ln in lines: print('line %-22s %.0f m from pole' % (ln['label'], ln['sp']))
# OSM: "Der Bulle vom Spielberg" (steel bull sculpture on the hill, 14.6 m bull, 17.2 m with the arch)
bull_f = enu_to_frame(enu(*np.array([nodes['5443064309']]).T))[0]
_, bi_ = ctree.query(bull_f)
landmarks = [dict(kind='bull', name='Der Bulle vom Spielberg', c=bull_f.round(2).tolist(), y=round(float(ground_at(bull_f)[0]), 2),
                  face=tf[bi_].round(3).tolist(), height=14.6, total=17.2)]   # shown side-on to the track

# ---------------------------------------------------------------- write
def r(a, n=2): return [round(float(v), n) for v in a]
s_from_pole = (sarr - sarr[ipole]) % L
out = dict(
    meta=dict(name='Red Bull Ring', location='Spielberg, Styria, Austria', length_m=round(float(L), 1), samples=N,
              elevation_span_m=round(float(Yf.max() - Yf.min()), 1), pole_index=int(ipole), pole_back_m=POLE_BACK,
              pole_side='left', grid_half_m=GRID_HALF, kerb_w=KERB_W, widen_m=WIDEN,
              start_sp=round(sp_pole(istart), 1), finish_sp=round(sp_pole(ifinish), 1),
              max_up_pct=round(float(_g.max() * 100), 1), max_down_pct=round(float(-_g.min() * 100), 1),
              sources=['TUMFTM racetrack-database (LGPL-3.0): centreline, track widths, race line',
                       'OpenStreetMap contributors (ODbL): geo-reference, pit lane, pit building, grandstands',
                       'OpenStreetMap contributors (ODbL): start/finish line nodes, walls, tyre walls, grass areas, bull sculpture',
                       'EU-DEM v1.1 25 m (Copernicus) via OpenTopoData: elevation, fitted to the official 65 m / 12 % / 9.3 % figures',
                       'FIA Austrian GP event notes 2018-2025: corner numbers, sector, speed trap and DRS lines, kerb and gravel changes']),
    x=r(Cf[:, 0]), z=r(Cf[:, 1]), y=r(Yf), wr=r(wr), wl=r(wl),
    kerb=[int(v) for v in kerb], kerbR=[int(v) for v in kerbR], kerbL=[int(v) for v in kerbL],
    tyreR=[int(v) for v in tyreR], tyreL=[int(v) for v in tyreL], runR=r(runR, 1), runL=r(runL, 1), gravR=r(gravR, 1), gravL=r(gravL, 1), barR=r(barR, 1), barL=r(barL, 1),
    turns=[int(i) for i in turns], turnNames=TURN_NAMES, lines=lines, features=features, landmarks=landmarks,
    raceline=dict(x=r(enu_to_frame(RL)[:, 0]), z=r(enu_to_frame(RL)[:, 1])),
    pit=dict(x=r(pit_r[:, 0]), z=r(pit_r[:, 1]), y=r(pit_y), w=PIT_W),
    pitBuilding=pit_building, grandstands=gs,
    terrain=dict(x0=round(float(tx[0]), 1), z0=round(float(tz[0]), 1), step=20.0, nx=len(tx), nz=len(tz), h=r(Ht.ravel(), 1)),
    outer=dict(x0=round(float(qx[0]), 1), z0=round(float(qz[0]), 1), step=100.0, nx=len(qx), nz=len(qz), h=r(QH, 1)),
)
dst = os.path.join(REPO, 'cad', 'track', 'red_bull_ring_data.js')
with open(dst, 'w') as f:
    f.write('// AUTO-GENERATED by tools/track/build_red_bull_ring.py — do not edit by hand.\n')
    f.write('// Red Bull Ring (Spielberg, AT). Units: metres, circuit frame (origin = pole grid box, car faces -X, y up).\n')
    f.write('// Sources: TUMFTM racetrack-database (LGPL-3.0); OpenStreetMap contributors (ODbL); EU-DEM v1.1 25 m via OpenTopoData.\n')
    f.write('export const RED_BULL_RING = ' + json.dumps(out, separators=(',', ':')) + ';\n')
print('wrote', dst, os.path.getsize(dst) // 1024, 'KB')
