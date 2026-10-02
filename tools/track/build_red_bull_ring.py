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
    (https://api.opentopodata.org/v1/eudem25m).

Usage:  python3 tools/track/build_red_bull_ring.py [cache_dir]
Needs numpy + scipy. Downloads are cached in cache_dir (default ./.track_cache).
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
elev = gaussian_filter1d(S[:, 4], 4, mode='wrap')   # ~10 m smoothing on top of DEM smoothing
print('lap length %.1f m, samples %d, elevation span %.1f m' % (L, N, elev.max() - elev.min()))

# ---------------------------------------------------------------- circuit frame
tE = np.gradient(C, axis=0); tE /= np.linalg.norm(tE, axis=1)[:, None]
def to_xz(Q): return np.c_[Q[:, 0], -Q[:, 1]]          # ENU -> (x,z) with y up
Cxz = to_xz(C); txz = to_xz(tE)
POLE_BACK = 4.0
ipole = (N - int(round(POLE_BACK / (L / N)))) % N
t0 = txz[ipole]; a = np.pi - np.arctan2(t0[1], t0[0])
Rm = np.array([[np.cos(a), -np.sin(a)], [np.sin(a), np.cos(a)]])
right0 = np.array([-t0[1], t0[0]])
wr0, wl0 = S[ipole, 2], S[ipole, 3]
mid_off = (wl0 - wr0) / 2.0          # metres to the left of the centreline = geometric middle
POLE_SIDE = -1.0                     # pole slot on the right-hand side of the middle
origin = Cxz[ipole] + (-(mid_off) * 1.0) * right0 + POLE_SIDE * 2.6 * (-right0) * -1.0 * -1.0
# lateral: left = -right. pole on right => + right * 2.6, middle is mid_off to the left
origin = Cxz[ipole] - right0 * mid_off + right0 * 2.6
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
kerb = gaussian_filter1d((np.abs(ks) > 1 / 320).astype(float), 6, mode='wrap') > 0.2

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
KERB_W = 1.4
runR = np.where(outside_right, runA, 2.0); runL = np.where(~outside_right, runA, 2.0)
# gravel: beyond asphalt on the outside of tighter corners
grav = np.clip(env * 3000 - 4.0, 0, 14)
gravR = np.where(outside_right, grav, 0.0); gravL = np.where(~outside_right, grav, 0.0)
GRASS = 3.0
def clampside(edge, run, gr, fr):
    # barrier distance from centreline; keep >= 1.5 m beyond kerbs; share free space with neighbour (half)
    want = edge + KERB_W + run + gr + GRASS
    lim = np.maximum(edge + KERB_W + 1.0, fr / 2.0 + 0.0)
    bar = np.minimum(want, np.where(fr < 59, lim + edge * 0, want))
    run2 = np.clip(np.minimum(run, bar - edge - KERB_W - 0.8), 0, None)
    gr2 = np.clip(np.minimum(gr, bar - edge - KERB_W - run2 - 0.8), 0, None)
    return bar, run2, gr2
barR, runR, gravR = clampside(wr, runR, gravR, free[:, 0] + wr * 0)
barL, runL, gravL = clampside(wl, runL, gravL, free[:, 1])
barR = gaussian_filter1d(barR, 3, mode='wrap'); barL = gaussian_filter1d(barL, 3, mode='wrap')

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
# turn numbering (official 10 turns) — match detected curvature peaks to approximate distances from the pole box
EXPECTED = [455, 1068, 1398, 2213, 2743, 3098, 3223, 3793, 3993, 4108]
sp_all = lambda i: (sarr[i] - sarr[ipole]) % L
turns = [min(turns, key=lambda i: abs(sp_all(i) - e)) for e in EXPECTED]

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
    ground = float(min(ground_at(c)[0], Yf[ci] + 1.0))
    gs.append(dict(name=name, c=c.round(2).tolist(), len=round(float(ext[0]), 1), dep=round(float(min(ext[1], 45)), 1), face=nrm.round(4).tolist(), y=round(ground, 2), dist=round(float(np.linalg.norm(to_track)), 1)))
    print('stand', name, gs[-1]['len'], gs[-1]['dep'], gs[-1]['dist'])

# ---------------------------------------------------------------- write
def r(a, n=2): return [round(float(v), n) for v in a]
s_from_pole = (sarr - sarr[ipole]) % L
out = dict(
    meta=dict(name='Red Bull Ring', location='Spielberg, Styria, Austria', length_m=round(float(L), 1), samples=N,
              elevation_span_m=round(float(Yf.max() - Yf.min()), 1), pole_index=int(ipole), pole_back_m=POLE_BACK,
              sources=['TUMFTM racetrack-database (LGPL-3.0): centreline, track widths, race line',
                       'OpenStreetMap contributors (ODbL): geo-reference, pit lane, pit building, grandstands',
                       'EU-DEM v1.1 25 m (Copernicus) via OpenTopoData: elevation']),
    x=r(Cf[:, 0]), z=r(Cf[:, 1]), y=r(Yf), wr=r(wr), wl=r(wl),
    kerb=[int(v) for v in kerb], runR=r(runR, 1), runL=r(runL, 1), gravR=r(gravR, 1), gravL=r(gravL, 1), barR=r(barR, 1), barL=r(barL, 1),
    turns=[int(i) for i in turns],
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
