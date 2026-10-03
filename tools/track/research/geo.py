"""Geometry helpers: OSM circuit loop extraction, TUMFTM geo-referencing, resampling, side tests."""
import math, re
import numpy as np
import networkx as nx
from scipy.spatial import cKDTree

R_EARTH = 6371008.8


class ENU:
    """Local flat-earth frame (metres east, north) around a reference lat/lon. Good to a few cm over a circuit."""
    def __init__(self, lat0, lon0):
        self.lat0, self.lon0 = lat0, lon0
        self.kx = math.cos(math.radians(lat0)) * math.pi / 180 * R_EARTH
        self.ky = math.pi / 180 * R_EARTH

    def fwd(self, ll):
        ll = np.asarray(ll, float)
        return np.c_[(ll[:, 1] - self.lon0) * self.kx, (ll[:, 0] - self.lat0) * self.ky]

    def inv(self, P):
        P = np.asarray(P, float)
        return np.c_[P[:, 1] / self.ky + self.lat0, P[:, 0] / self.kx + self.lon0]


def tags(el):
    return {t.get('k'): t.get('v') for t in el.findall('tag')}


def collect(roots):
    nodes, ways, rels = {}, {}, {}
    for root in roots:
        for n in root.findall('node'):
            t = tags(n)
            nodes[n.get('id')] = (float(n.get('lat')), float(n.get('lon')), t)
        for w in root.findall('way'):
            ways[w.get('id')] = ([n.get('ref') for n in w.findall('nd')], tags(w))
        for r in root.findall('relation'):
            rels[r.get('id')] = ([(m.get('type'), m.get('ref'), m.get('role') or '') for m in r.findall('member')], tags(r))
    return nodes, ways, rels


PIT_RE = re.compile(r'(?i)pit|boxen|stands|box|pitlane|voie des|corsia box|bokszutca|pitstraat|ピット')


def is_pit(role, t):
    name = t.get('name', '')
    if re.search(r'(?i)pit\s+straight|subida dos boxes|reta dos boxes', name):   # straights on the lap named after the pits
        return False
    return 'pit' in role.lower() or bool(PIT_RE.search(name)) or t.get('raceway') == 'pit_lane'


def polyline_len(P):
    return float(np.linalg.norm(np.diff(P, axis=0), axis=1).sum()) if len(P) > 1 else 0.0


def loop_from_ways(way_ids, ways, nodes, enu, target_m):
    """Find the closed loop through the given ways whose length is closest to target_m.

    Returns (ordered node id list (closed, first != last), length_m, n_candidate_cycles).
    """
    G = nx.Graph()
    for wid in way_ids:
        refs = [r for r in ways[wid][0] if r in nodes]
        for a, b in zip(refs[:-1], refs[1:]):
            if a != b:
                pa, pb = enu.fwd([nodes[a][:2], nodes[b][:2]])
                G.add_edge(a, b, w=float(np.linalg.norm(pb - pa)))
    # prune dead ends (spurs)
    changed = True
    while changed:
        dead = [n for n, d in G.degree() if d < 2]
        changed = bool(dead)
        G.remove_nodes_from(dead)
    if G.number_of_nodes() == 0:
        return None, 0.0, 0
    # contract chains of degree-2 nodes so cycle enumeration stays small
    junc = [n for n, d in G.degree() if d != 2]
    if not junc:
        comp = max(nx.connected_components(G), key=len)
        cyc = [n for n in nx.cycle_basis(G.subgraph(comp))[0]]
        return cyc, sum(G[a][b]['w'] for a, b in zip(cyc, cyc[1:] + cyc[:1])), 1
    H = nx.MultiGraph()
    seen = set()
    for j in junc:
        for nb in G.neighbors(j):
            if (j, nb) in seen:
                continue
            path = [j, nb]
            while G.degree(path[-1]) == 2:
                nxt = [x for x in G.neighbors(path[-1]) if x != path[-2]][0]
                path.append(nxt)
            seen.add((path[-1], path[-2]))
            seen.add((j, nb))
            L = sum(G[a][b]['w'] for a, b in zip(path[:-1], path[1:]))
            H.add_edge(path[0], path[-1], w=L, path=path)
    best = None
    count = 0
    # enumerate simple cycles on the contracted graph via a directed copy (small graphs only)
    D = nx.DiGraph()
    edges = {}
    for k, (a, b, d) in enumerate(H.edges(data=True)):
        ea, eb = ('e', k, 0), ('e', k, 1)
        # model each edge as an intermediate node so parallel edges are distinct
        D.add_edge(a, ea); D.add_edge(ea, b); D.add_edge(b, eb); D.add_edge(eb, a)
        edges[ea] = (a, b, d); edges[eb] = (b, a, d)
    for cyc in nx.simple_cycles(D, length_bound=2 * min(40, D.number_of_nodes())):
        es = [x for x in cyc if isinstance(x, tuple)]
        if len(es) < 1:
            continue
        ks = [e[1] for e in es]
        if len(set(ks)) != len(ks) or (len(ks) == 1 and edges[es[0]][0] != edges[es[0]][1]):
            continue
        L = sum(edges[e][2]['w'] for e in es)
        count += 1
        if best is None or abs(L - target_m) < abs(best[0] - target_m):
            best = (L, es)
        if count > 200000:
            break
    if best is None:
        return None, 0.0, count
    seq = []
    for e in best[1]:
        a, b, d = edges[e]
        p = d['path'] if d['path'][0] == a else d['path'][::-1]
        seq += p[:-1]
    return seq, best[0], count


def resample_closed(P, step):
    Q = np.vstack([P, P[:1]])
    seg = np.linalg.norm(np.diff(Q, axis=0), axis=1)
    s = np.r_[0, np.cumsum(seg)]
    L = s[-1]
    n = max(8, int(round(L / step)))
    t = np.arange(n) * L / n
    return np.c_[np.interp(t, s, Q[:, 0]), np.interp(t, s, Q[:, 1])], L


def signed_area(P):
    x, y = P[:, 0], P[:, 1]
    return 0.5 * float(np.sum(x * np.roll(y, -1) - np.roll(x, -1) * y))


def icp_rigid(src, dst_pts, n_iter=60):
    """Rotate + translate src (N x 2) onto the point cloud dst_pts. Tries 24 start angles, keeps the best."""
    tree = cKDTree(dst_pts)
    best = None
    for ang in np.radians(np.arange(0, 360, 15)):
        R = np.array([[math.cos(ang), -math.sin(ang)], [math.sin(ang), math.cos(ang)]])
        X = src @ R.T
        X += dst_pts.mean(0) - X.mean(0)
        for _ in range(n_iter):
            d, i = tree.query(X)
            m = d < np.percentile(d, 90)
            A, B = X[m], dst_pts[i[m]]
            ca, cb = A.mean(0), B.mean(0)
            U, S, Vt = np.linalg.svd((A - ca).T @ (B - cb))
            Rr = (U @ Vt).T
            if np.linalg.det(Rr) < 0:
                Vt[-1] *= -1
                Rr = (U @ Vt).T
            X = (X - ca) @ Rr.T + cb
        d, _ = tree.query(X)
        if best is None or np.median(d) < best[0]:
            best = (float(np.median(d)), float(np.percentile(d, 95)), X)
    # recover the single rigid transform src -> X
    X = best[2]
    ca, cb = src.mean(0), X.mean(0)
    U, S, Vt = np.linalg.svd((src - ca).T @ (X - cb))
    R = (U @ Vt).T
    if np.linalg.det(R) < 0:
        Vt[-1] *= -1
        R = (U @ Vt).T
    t = cb - ca @ R.T
    return R, t, best[0], best[1]


def tangents(P):
    T = np.roll(P, -1, axis=0) - np.roll(P, 1, axis=0)
    return T / np.linalg.norm(T, axis=1)[:, None]


def side_of(P, T, q):
    """'left' or 'right' of the closed path P (with unit tangents T) for point q, plus distance and index."""
    d = np.linalg.norm(P - q, axis=1)
    i = int(np.argmin(d))
    v = q - P[i]
    cross = T[i, 0] * v[1] - T[i, 1] * v[0]
    return ('left' if cross > 0 else 'right'), float(d[i]), i
