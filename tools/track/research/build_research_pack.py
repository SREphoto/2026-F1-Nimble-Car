#!/usr/bin/env python3
"""
Build the 2026 circuit research pack: cad/track/circuits/<id>.json plus cad/track/raw/centreline/<id>.csv.

Sources (all public, cited inside every output file):
  * Formula 1 / FIA documents: circuit map (centreline length, sectors, intermediates, speed trap,
    2026 straight mode and overtake points or 2025 DRS points) and Race Director notes (pit lane speed,
    track limits, circuit changes such as kerbs, run-off and barriers).
  * English Wikipedia infobox: official circuit name, location, coordinates, length, turns, race lap record.
  * OpenStreetMap (ODbL) via the main API: circuit relation / raceway ways (centreline when TUMFTM has none),
    pit lane, grandstands, bridges, tunnels, named buildings, run-off and barrier hints.
  * TUMFTM racetrack-database (LGPL-3.0): smoothed centreline with left/right track widths, where it exists.
  * Elevation: EU-DEM v1.1 25 m (Europe) or SRTM 30 m (elsewhere) via the public OpenTopoData API.

Usage:  python3 tools/track/research/build_research_pack.py [circuit_id ...]
Needs numpy, scipy, networkx and pdftotext (poppler). Downloads are cached in .track_cache/research/.
Run fetch_tumftm.py first so cad/track/raw/tumftm/ is filled.
"""
import csv, json, math, os, re, sys, datetime
import numpy as np
from scipy.ndimage import gaussian_filter1d

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import sources, geo, fia_parse, wiki_parse
from circuits_2026 import CIRCUITS, REMOVED, FIA_BASE
from curated import CURATED

REPO = sources.REPO
OUT_DIR = os.path.join(REPO, 'cad', 'track', 'circuits')
CL_DIR = os.path.join(REPO, 'cad', 'track', 'raw', 'centreline')
TUM_DIR = os.path.join(REPO, 'cad', 'track', 'raw', 'tumftm')
BACINGER_DIR = 'cad/track/raw/bacinger'
BACINGER_SHA = '394d8fbe70ef2c0b0c8d23ff7bee61fa09606055'
RETRIEVED = '2026-10-03'
SCHEMA_VERSION = 1
STEP_M = 5.0          # centreline sample spacing in the CSV
DEM_STEP_M = 10.0     # elevation sample spacing
REPORT = []


def wiki_url(title):
    return 'https://en.wikipedia.org/wiki/' + title.replace(' ', '_')


def src(id_, what, url, **kw):
    d = dict(id=id_, what=what, url=url, retrieved=RETRIEVED)
    d.update(kw)
    return d


def unknown(note):
    return dict(value=None, note=note)


# ------------------------------------------------------------------ OSM
def osm_for(c, enu_hint):
    """Return (nodes, ways, rels, main_way_ids, pit_way_ids, relation_tags)."""
    if c.get('osm_relation'):
        root = sources.osm_xml(f"relation/{c['osm_relation']}/full", f"rel_{c['osm_relation']}.osm")
        nodes, ways, rels = geo.collect([root])
        members, rtags = rels[str(c['osm_relation'])]
        main, pit = [], []
        for typ, ref, role in members:
            if typ != 'way' or ref not in ways:
                continue
            if geo.is_pit(role, ways[ref][1]):
                pit.append(ref)
            elif role not in ('alternative', 'penalty', 'joker_lap', 'outer'):
                main.append(ref)
        return nodes, ways, rels, main, pit, rtags
    return None


def area_roots(c, ll_box):
    (la0, lo0), (la1, lo1) = ll_box
    return sources.osm_area(la0, lo0, la1, lo1, c['id'])


def way_pts(ways, nodes, wid):
    return [nodes[r][:2] for r in ways[wid][0] if r in nodes]


def direction_votes(loop, ways, nodes, main, rel_members):
    """+1 votes mean the loop order matches the race direction, from oneway tags and forward/backward roles."""
    role = {ref: r for typ, ref, r in rel_members if typ == 'way'} if rel_members else {}
    pos = {n: i for i, n in enumerate(loop)}
    votes = 0
    for wid in main:
        refs, t = ways[wid]
        sign = 0
        if t.get('oneway') in ('yes', '1', 'true') or role.get(wid) == 'forward':
            sign = 1
        if t.get('oneway') == '-1' or role.get(wid) == 'backward':
            sign = -1
        if not sign:
            continue
        for a, b in zip(refs[:-1], refs[1:]):
            if a in pos and b in pos:
                d = (pos[b] - pos[a]) % len(loop)
                if d == 1:
                    votes += sign
                elif d == len(loop) - 1:
                    votes -= sign
    return votes


GAP_HW = {'raceway', 'motorway', 'trunk', 'primary', 'secondary', 'tertiary', 'unclassified', 'residential', 'service',
          'motorway_link', 'trunk_link', 'primary_link', 'secondary_link', 'tertiary_link', 'living_street', 'road'}


def patch_gaps(c, main, ways, nodes):
    """Find dead ends of the circuit ways and load road ways from a small box around each one."""
    import networkx as nx
    G = nx.Graph()
    for w in main:
        nx.add_path(G, [r for r in ways[w][0] if r in nodes])
    dead = [n for n, d in G.degree() if d == 1]
    if not dead:
        # loop closes but is the wrong length: look at the ends of every circuit way instead
        dead = list({ways[w][0][0] for w in main} | {ways[w][0][-1] for w in main})
    added = set()
    for n in dead[:40]:
        la, lo = nodes[n][:2]
        d = 80 / 111320.0
        roots = sources.osm_area(la - d, lo - d / math.cos(math.radians(la)), la + d, lo + d / math.cos(math.radians(la)), c['id'] + '_gap')
        nn, ww, _ = geo.collect(roots)
        for k, v in nn.items():
            nodes.setdefault(k, v)
        for wid, (refs, t) in ww.items():
            if wid in main or t.get('highway') not in GAP_HW or geo.is_pit('', t) or t.get('area') == 'yes':
                continue
            ways.setdefault(wid, (refs, t))
            added.add(wid)
    return sorted(added, key=int)


def _fill_len(loop, main, ways, nodes, enu):
    """Metres of the loop that are not on the circuit ways themselves."""
    E = set()
    for w in main:
        r = ways[w][0]
        E |= {frozenset(e) for e in zip(r[:-1], r[1:])}
    P = enu.fwd([nodes[n][:2] for n in loop])
    tot = 0.0
    for i in range(len(loop)):
        j = (i + 1) % len(loop)
        if frozenset((loop[i], loop[j])) not in E:
            tot += float(np.linalg.norm(P[j] - P[i]))
    return tot


def _loop_ways(loop, ways, cand):
    ln = set(loop)
    return [w for w in cand if sum(1 for r in ways[w][0] if r in ln) >= 2]


def tidy_layout(t):
    t = (t or '').strip()
    if t.count('(') > t.count(')'):
        t += ')'
    return t or None


def tidy_opened(raw):
    """Turn Wikipedia date templates into plain dates, e.g. 'Opened 1969-07-26; re-opened 2011-05-15'."""
    raw = raw or ''
    raw = re.sub(r'\{\{\s*[Ss]tart date(?: and age)?\s*\|([^}]*)\}\}', lambda m: _date(m.group(1)), raw)
    raw = re.sub(r'[Ss]tart date(?: and age)?((?:\|[^|\s<]+)+)', lambda m: _date(m.group(1)), raw)
    out = wiki_parse.clean(raw)
    out = re.sub(r'\s+', ' ', out or '').strip(' ;,')
    return out or None


def _date(args):
    parts = [p.strip() for p in args.split('|') if p.strip() and '=' not in p]
    nums = [p for p in parts if re.fullmatch(r'\d{1,4}', p)]
    if not nums:
        return ''
    y = nums[0]
    rest = [n.zfill(2) for n in nums[1:3]]
    return '-'.join([y] + rest) + ' '


# ------------------------------------------------------------------ main per-circuit build
def build(c):
    cid = c['id']
    cur = CURATED.get(cid, {})
    print(f'\n=== {cid} (round {c["round"]})')
    sources_list = []

    # ---------- Wikipedia
    title, wt, revid = sources.wiki_wikitext(c['wiki'])
    ib = wiki_parse.infobox(wt)
    lays = wiki_parse.layouts(ib)
    lay = lays[0]
    wcoord = wiki_parse.coord(ib.get('coordinates', ''))
    if wcoord is None and cid == 'suzuka':
        wcoord = (34.841667, 136.538889)    # Wikidata Q174170 P625 (the article pulls its coordinates from Wikidata)
    sources_list.append(src('wikipedia', f'English Wikipedia article "{title}" (infobox, layout "{lay["layout"]}")', wiki_url(title)))

    # ---------- FIA
    map_txt = sources.fia_text(c['fia_map'])
    notes_txt = sources.fia_text(c['fia_notes'])
    fmap = fia_parse.parse_map(map_txt, c['fia_year'])
    notes = fia_parse.notes_sections(notes_txt)
    sources_list.append(src('fia_map', f'FIA {c["fia_year"]} circuit map, pit lane drawing and emergency exits (Race Director document)', FIA_BASE + c['fia_map']))
    sources_list.append(src('fia_notes', f'FIA {c["fia_year"]} Race Director competition/event notes', FIA_BASE + c['fia_notes']))
    official_m = (fmap['centreline_length_km'] or float(lay['length_km'])) * 1000

    # ---------- OSM loop
    rel = osm_for(c, None)
    if rel:
        nodes, ways, rels, main, pit, rtags = rel
        rel_members = rels[str(c['osm_relation'])][0]
        osm_ref = dict(type='relation', id=c['osm_relation'], name=rtags.get('name'),
                       url=f"https://www.openstreetmap.org/relation/{c['osm_relation']}")
    else:
        nodes, ways, rels, main, pit, rel_members, rtags = {}, {}, {}, [], [], None, {}
        osm_ref = None
    lat0, lon0 = wcoord
    enu = geo.ENU(lat0, lon0)
    if not main:
        # no relation: take named raceway ways from an area around the coordinates
        span = official_m / 2.2 / 111320.0
        roots = area_roots(c, ((lat0 - span, lon0 - span / math.cos(math.radians(lat0))), (lat0 + span, lon0 + span / math.cos(math.radians(lat0)))))
        nodes, ways, rels = geo.collect(roots)
        rx = re.compile(c['osm_ways_name'])
        for wid, (refs, t) in ways.items():
            if t.get('highway') == 'raceway' and rx.search(t.get('name', '')):
                (pit if geo.is_pit('', t) else main).append(wid)
        osm_ref = dict(type='ways', ids=[int(w) for w in sorted(main, key=int)], name_pattern=c['osm_ways_name'])
        if c.get('osm_note'):
            osm_ref['note'] = c['osm_note']
    loop, loop_len, ncyc = geo.loop_from_ways(main, ways, nodes, enu, official_m)
    gap_ways = []
    if loop is None or abs(loop_len - official_m) > 0.03 * official_m:
        # the mapped circuit ways do not close (or close the wrong way): fill short gaps from nearby OSM roads
        gap_ways = patch_gaps(c, main, ways, nodes)
        if gap_ways:
            l2, len2, n2 = geo.loop_from_ways(main + gap_ways, ways, nodes, enu, official_m)
            # only accept a short patch: the part of the loop not on circuit ways must be small
            fill = _fill_len(l2, main, ways, nodes, enu) if l2 is not None else 1e9
            used = _loop_ways(l2, ways, gap_ways) if l2 is not None else []
            # a short fill is fine; a long one only when one or two road ways give a lap within 0.5% of the FIA length
            close = l2 is not None and len(used) <= 2 and abs(len2 - official_m) < 0.005 * official_m
            if l2 is not None and fill > min(400.0, 0.08 * official_m) and not close:
                REPORT.append(f'{cid}: rejected an OSM loop that needed {fill:.0f} m of ordinary roads to close')
                l2 = None
            if l2 is not None and (loop is None or abs(len2 - official_m) < abs(loop_len - official_m)):
                loop, loop_len, ncyc = l2, len2, n2
                REPORT.append(f'{cid}: OSM circuit ways had gaps, closed with nearby road ways {sorted(set(gap_ways) & set(_loop_ways(loop, ways, gap_ways)), key=int)}')
    alt_line = None
    if (loop is None or abs(loop_len - official_m) > 0.1 * official_m) and c.get('bacinger'):
        # OSM does not hold the whole lap yet (new street circuit): use the bacinger/f1-circuits GeoJSON line
        gj = json.load(open(os.path.join(REPO, BACINGER_DIR, c['bacinger'] + '.geojson'), encoding='utf-8'))
        xy = [(la, lo) for lo, la in gj['features'][0]['geometry']['coordinates']]
        if xy[0] == xy[-1]:
            xy = xy[:-1]
        P_osm = enu.fwd(xy)
        loop_len = geo.polyline_len(np.vstack([P_osm, P_osm[:1]]))
        alt_line = dict(type='geojson', file=f'{BACINGER_DIR}/{c["bacinger"]}.geojson', points=len(xy), length_m=round(loop_len, 1),
                        stated_length_m=gj['features'][0]['properties'].get('length'),
                        url=f'https://github.com/bacinger/f1-circuits/blob/{BACINGER_SHA}/circuits/{c["bacinger"]}.geojson',
                        note='Hand-drawn circuit line from the bacinger/f1-circuits project (MIT licence). About one point every '
                             '50 m, so corners are coarse. Used because the OSM circuit ways do not cover the whole lap.')
        votes = 0
        REPORT.append(f'{cid}: OSM ways do not close a lap (best {loop_len if loop is None else loop_len:.0f} m), '
                      f'used bacinger/f1-circuits {c["bacinger"]}.geojson instead')
        print(f'  bacinger line {loop_len:.0f} m (official {official_m:.0f} m)')
        sources_list.append(src('bacinger', 'bacinger/f1-circuits GeoJSON circuit line (MIT licence)', alt_line['url']))
    elif loop is None or abs(loop_len - official_m) > 0.1 * official_m:
        raise RuntimeError(f'{cid}: could not close an OSM loop near the official length (best {loop_len:.0f} m)')
    else:
        P_osm = enu.fwd([nodes[n][:2] for n in loop])
        votes = direction_votes(loop, ways, nodes, main, rel_members)
        print(f'  OSM loop {loop_len:.0f} m (official {official_m:.0f} m, {ncyc} candidate cycles, direction votes {votes})')
    sources_list.append(src('osm', 'OpenStreetMap contributors (ODbL): circuit ways, pit lane, landmarks, run-off hints',
                            osm_ref['url'] if osm_ref.get('url') else 'https://www.openstreetmap.org/', osm=osm_ref))

    # ---------- centreline: TUMFTM (geo-referenced) or OSM
    tum = None
    if c['tumftm']:
        T = np.loadtxt(os.path.join(TUM_DIR, c['tumftm'] + '.csv'), delimiter=',', comments='#')
        # densify OSM loop for ICP target
        Pd, _ = geo.resample_closed(P_osm, 2.0)
        Rm, tv, med, p95 = geo.icp_rigid(T[:, :2], Pd)
        C = T[:, :2] @ Rm.T + tv
        tum_len = geo.polyline_len(np.vstack([T[:, :2], T[:1, :2]]))
        tum = dict(file=f"cad/track/raw/tumftm/{c['tumftm']}.csv", raceline=f"cad/track/raw/tumftm/{c['tumftm']}_raceline.csv",
                   length_m=round(tum_len, 1), points=len(T), georef_median_m=round(med, 2), georef_p95_m=round(p95, 2),
                   rotation_deg=round(math.degrees(math.atan2(Rm[1, 0], Rm[0, 0])), 4),
                   origin_lat=round(float(enu.inv(tv[None, :])[0, 0]), 7), origin_lon=round(float(enu.inv(tv[None, :])[0, 1]), 7))
        wr, wl = T[:, 2], T[:, 3]
        print(f'  TUMFTM {c["tumftm"]}: {tum_len:.0f} m, georef median {med:.2f} m / p95 {p95:.2f} m')
        centre_src = 'tumftm'
        Ccl, wr_c, wl_c = C, wr, wl
        tum['used'] = True
        if abs(tum_len - official_m) > 40 and abs(loop_len - official_m) < abs(tum_len - official_m) - 20:
            # TUMFTM holds an older layout here: use the OSM loop, keep the TUMFTM file for reference only
            tot = wr + wl
            tum['used'] = False
            tum['not_used_reason'] = (f'TUMFTM length {tum_len:.0f} m is {tum_len - official_m:+.0f} m off the FIA length (older layout), '
                                      f'while the OSM loop is {loop_len - official_m:+.0f} m off, so the OSM loop is used.')
            tum['old_layout_width_m'] = dict(min=round(float(tot.min()), 1), max=round(float(tot.max()), 1),
                                             median=round(float(np.median(tot)), 1))
            REPORT.append(f'{cid}: TUMFTM {tum_len:.0f} m vs FIA {official_m:.0f} m, OSM loop used instead')
            centre_src = 'osm'
            Ccl, wr_c, wl_c = P_osm, None, None
    else:
        centre_src = 'osm'
        Ccl, wr_c, wl_c = P_osm, None, None

    # orientation: TUMFTM files are in driving direction; OSM loop uses oneway/role votes, then the pit lane
    pit_pts = [enu.fwd(way_pts(ways, nodes, w)) for w in pit if len(way_pts(ways, nodes, w)) > 1]
    dir_basis = None
    if centre_src == 'osm' and tum:
        # orient the OSM loop like the TUMFTM file (which is stored in driving direction)
        Tt = geo.tangents(C); To = geo.tangents(Ccl)
        _, idx = geo.cKDTree(Ccl).query(C[::10])
        if float(np.mean(np.sum(Tt[::10] * To[idx], axis=1))) < 0:
            Ccl = Ccl[::-1]
        dir_basis = 'OSM loop oriented to match the TUMFTM file order (stored in driving direction)'
    elif centre_src == 'osm':
        if votes > 0:
            dir_basis = 'OSM oneway tags / forward roles on the circuit ways'
        elif votes < 0:
            Ccl = Ccl[::-1]; dir_basis = 'OSM oneway tags / backward roles on the circuit ways'
    else:
        dir_basis = 'TUMFTM centreline order (the database stores tracks in driving direction)'
        # cross-check with OSM votes mapped onto TUMFTM orientation
        Tt = geo.tangents(Ccl); To = geo.tangents(P_osm)
        _, idx = geo.cKDTree(P_osm).query(Ccl[::10])
        agree = float(np.mean(np.sum(Tt[::10] * To[idx], axis=1)))
        if votes and np.sign(agree) * np.sign(votes) < 0:
            REPORT.append(f'{cid}: TUMFTM order disagrees with OSM oneway tags, check direction')

    # pit lane ways from the area if the relation has none (needed for side and start line)
    lat_c, lon_c = enu.inv(Ccl).mean(0)
    llmin = enu.inv((Ccl.min(0) - 220)[None, :])[0]; llmax = enu.inv((Ccl.max(0) + 220)[None, :])[0]
    aroots = area_roots(c, ((llmin[0], llmin[1]), (llmax[0], llmax[1])))
    anodes, aways, arels = geo.collect(aroots)
    if not pit_pts:
        from scipy.spatial import cKDTree
        tr = cKDTree(Ccl)
        for wid, (refs, t) in aways.items():
            if t.get('highway') == 'raceway' and geo.is_pit('', t) and not re.search(r'(?i)kart|moto', t.get('name', '')):
                pts = [anodes[r][:2] for r in refs if r in anodes]
                if len(pts) > 1:
                    Q = enu.fwd(pts)
                    if np.median(tr.query(Q)[0]) < 60:
                        pit.append(wid); ways[wid] = (refs, t); pit_pts.append(Q)
                        for r in refs:
                            if r in anodes: nodes[r] = anodes[r]

    pit_info = None
    if pit_pts:
        Tc = geo.tangents(Ccl)
        allp = np.vstack(pit_pts)
        mid = allp[len(allp) // 2] if len(pit_pts) == 1 else allp.mean(0)
        # order pit polyline: longest pit way defines entry -> exit along race direction
        main_pit = max(pit_pts, key=geo.polyline_len)
        side, dist, imid = geo.side_of(Ccl, Tc, main_pit[len(main_pit) // 2])
        v = main_pit[-1] - main_pit[0]
        if np.dot(v, Tc[imid]) < 0:
            main_pit = main_pit[::-1]
        _, _, ie = geo.side_of(Ccl, Tc, main_pit[0]); _, _, ix = geo.side_of(Ccl, Tc, main_pit[-1])
        pit_info = dict(main=main_pit, side=side, imid=imid, ie=ie, ix=ix,
                        length_m=round(sum(geo.polyline_len(p) for p in pit_pts), 0),
                        main_len=round(geo.polyline_len(main_pit), 0), ids=[int(w) for w in pit])
        if centre_src == 'osm' and dir_basis is None:
            # pit lane oneway decides direction, else stay unknown
            pt = [ways[w][1] for w in pit]
            if any(t.get('oneway') == 'yes' for t in pt):
                w0 = [w for w in pit if ways[w][1].get('oneway') == 'yes'][0]
                q = enu.fwd(way_pts(ways, nodes, w0))
                _, _, k = geo.side_of(Ccl, Tc, q[len(q) // 2])
                if np.dot(q[-1] - q[0], Tc[k]) < 0:
                    Ccl = Ccl[::-1]
                dir_basis = 'OSM oneway tag on the pit lane'

    if centre_src == 'osm' and dir_basis is None:
        st = (cur.get('direction_stated') or '').lower()
        if 'anti' in st or 'counter' in st:
            if geo.signed_area(Ccl) < 0: Ccl = Ccl[::-1]
            dir_basis = 'Wikipedia text states the direction'
        elif st.startswith('clockwise'):
            if geo.signed_area(Ccl) > 0: Ccl = Ccl[::-1]
            dir_basis = 'Wikipedia text states the direction'

    # resample to STEP_M and choose s = 0
    if centre_src == 'tumftm':
        # TUMFTM index 0 is kept as s = 0 (for the Red Bull Ring it sits about 4 m past the pole grid box)
        Cres, L = geo.resample_closed(Ccl, STEP_M)
        seg = np.r_[0, np.cumsum(np.linalg.norm(np.diff(np.vstack([Ccl, Ccl[:1]]), axis=0), axis=1))]
        t = np.arange(len(Cres)) * seg[-1] / len(Cres)
        wr_r = np.interp(t, seg, np.r_[wr_c, wr_c[0]]); wl_r = np.interp(t, seg, np.r_[wl_c, wl_c[0]])
        s0_note = 'First point of the TUMFTM file. Close to, but not exactly on, the start/finish line.'
    else:
        # start the OSM loop at the point beside the middle of the pit lane (approximate start line)
        if pit_info is not None:
            _, _, k = geo.side_of(Ccl, geo.tangents(Ccl), pit_info['main'][len(pit_info['main']) // 2])
            Ccl = np.roll(Ccl, -k, axis=0)
            s0_note = 'Point beside the middle of the OSM pit lane. Approximate start/finish line only.'
        else:
            s0_note = 'Arbitrary OSM node. Start/finish line not located.'
        Cres, L = geo.resample_closed(Ccl, STEP_M)
        wr_r = wl_r = None
    Tc = geo.tangents(Cres)
    area = geo.signed_area(Cres)
    if dir_basis is None:
        direction = None
    else:
        direction = 'anticlockwise' if area > 0 else 'clockwise'
    if cid == 'suzuka':
        direction = 'figure-eight'
    print(f'  centreline {centre_src}: {L:.0f} m, {len(Cres)} samples, direction {direction} ({dir_basis})')
    LLc = enu.inv(Cres)
    s_arr = np.arange(len(Cres)) * L / len(Cres)

    # ---------- elevation
    nd = max(50, int(round(L / DEM_STEP_M)))
    idx = np.linspace(0, len(Cres), nd, endpoint=False).astype(int)
    ll_dem = [(float(a), float(b)) for a, b in LLc[idx]]
    try:
        z = np.array([np.nan if v is None else v for v in sources.dem_profile(ll_dem, c['dem'], cid)], float)
        n_missing = int(np.isnan(z).sum())
        if n_missing:
            # the terrain model has no value at some points (e.g. Monaco's coast edge): fill from neighbours
            if n_missing > 0.2 * len(z):
                raise RuntimeError(f'{n_missing} of {len(z)} terrain samples missing')
            k = np.arange(len(z)); ok = ~np.isnan(z)
            z = np.interp(k, k[ok], z[ok], period=len(z))
            REPORT.append(f'{cid}: {n_missing} of {len(z)} terrain samples had no value and were filled from neighbours')
        zs = gaussian_filter1d(z, 3, mode='wrap')    # ~30 m smoothing to remove DEM pixel noise
        z_full = np.interp(s_arr, s_arr[idx], zs, period=L)
        climb = float(np.clip(np.diff(np.r_[zs, zs[0]]), 0, None).sum())
        elev = dict(dataset=c['dem'], samples=nd, spacing_m=round(L / nd, 2), min_m=round(float(zs.min()), 1),
                    max_m=round(float(zs.max()), 1), total_change_m=round(float(zs.max() - zs.min()), 1),
                    total_climb_per_lap_m=round(climb, 1), raw_change_m=round(float(z.max() - z.min()), 1),
                    missing_samples_filled=n_missing or None)
    except Exception as e:
        print('  elevation failed', e)
        z_full = None; elev = None

    # ---------- write centreline CSV
    os.makedirs(CL_DIR, exist_ok=True)
    cl_path = os.path.join(CL_DIR, f'{cid}.csv')
    with open(cl_path, 'w', newline='') as f:
        f.write(f'# {cid}: centreline in race direction, {STEP_M:g} m spacing. Source: '
                + ('TUMFTM racetrack-database (LGPL-3.0) geo-referenced onto OpenStreetMap (ODbL)' if centre_src == 'tumftm' else 'OpenStreetMap contributors (ODbL)')
                + (f'; elevation {c["dem"]} via OpenTopoData' if z_full is not None else '') + '\n')
        f.write('# widths are metres from the centreline to the track edge (TUMFTM only, blank for OSM)\n')
        w = csv.writer(f)
        w.writerow(['s_m', 'lat', 'lon', 'elev_m', 'w_right_m', 'w_left_m'])
        for i in range(len(Cres)):
            w.writerow([f'{s_arr[i]:.1f}', f'{LLc[i, 0]:.7f}', f'{LLc[i, 1]:.7f}',
                        f'{z_full[i]:.1f}' if z_full is not None else '',
                        f'{wr_r[i]:.2f}' if wr_r is not None else '', f'{wl_r[i]:.2f}' if wl_r is not None else ''])

    # ---------- landmarks and hints from the OSM area
    from scipy.spatial import cKDTree
    ctree = cKDTree(Cres)

    def locate(Q):
        d, i = ctree.query(Q)
        k = int(np.argmin(d))
        side, dist, ii = geo.side_of(Cres, Tc, Q[k])
        return dict(s_m=round(float(s_arr[i[k]]), 0), side=side, distance_m=round(float(d.min()), 1))

    def centroid_ll(Q):
        return [round(float(x), 6) for x in enu.inv(Q.mean(0)[None, :])[0]]

    def crosses(Q):
        hits = []
        A = Cres; B = np.roll(Cres, -1, axis=0)
        for p, q in zip(Q[:-1], Q[1:]):
            d1 = B - A; d2 = q - p
            den = d1[:, 0] * d2[1] - d1[:, 1] * d2[0]
            ok = np.abs(den) > 1e-9
            t = np.where(ok, ((p[0] - A[:, 0]) * d2[1] - (p[1] - A[:, 1]) * d2[0]) / np.where(ok, den, 1), -1)
            u = np.where(ok, ((p[0] - A[:, 0]) * d1[:, 1] - (p[1] - A[:, 1]) * d1[:, 0]) / np.where(ok, den, 1), -1)
            m = ok & (t >= 0) & (t <= 1) & (u >= 0) & (u <= 1)
            hits += list(np.nonzero(m)[0])
        return hits

    stands, bridges, buildings, tunnels = [], [], [], []
    hint_area = {}; barrier_len = {}
    main_set = set(main)
    for wid, (refs, t) in aways.items():
        pts = [anodes[r][:2] for r in refs if r in anodes]
        if len(pts) < 2:
            continue
        Q = enu.fwd(pts)
        d = ctree.query(Q)[0]
        dmin = float(d.min())
        name = t.get('name')
        closed = refs[0] == refs[-1]
        if (t.get('building') == 'grandstand' or t.get('leisure') == 'grandstand' or
                (name and re.search(r'(?i)grandstand|trib[uü]n|tribuna|arquibancada|スタンド|看台', name) and (closed or t.get('building')))):
            if dmin < 300:
                ext = np.ptp(Q, 0)
                stands.append(dict(name=name, osm_way=int(wid), lat_lon=centroid_ll(Q), approx_length_m=round(float(max(ext)), 0), **locate(Q)))
            continue
        if wid in main_set or t.get('highway') == 'raceway':
            if t.get('tunnel') in ('yes', 'building_passage') and dmin < 5:
                tunnels.append(dict(name=name, osm_way=int(wid), length_m=round(geo.polyline_len(Q), 0), **locate(Q)))
            if t.get('bridge') == 'yes' and dmin < 5 and wid in main_set:
                bridges.append(dict(kind='track on bridge', name=name, osm_way=int(wid), length_m=round(geo.polyline_len(Q), 0), **locate(Q)))
            continue
        if (t.get('bridge') in ('yes', 'viaduct') or t.get('man_made') == 'bridge') and dmin < 40:
            h = crosses(Q)
            if h:
                kind = t.get('highway') or t.get('railway') or t.get('man_made') or 'bridge'
                bridges.append(dict(kind=f'{kind} bridge over track', name=name, osm_way=int(wid), lat_lon=centroid_ll(Q),
                                    s_m=round(float(s_arr[h[0]]), 0)))
            continue
        if closed and dmin < 150 and (t.get('building') or t.get('man_made') in ('tower', 'observation_tower') or t.get('leisure') == 'stadium'):
            if name or t.get('man_made') in ('tower',) or t.get('leisure') == 'stadium':
                ext = np.ptp(Q, 0)
                buildings.append(dict(name=name, kind=t.get('building') if t.get('building') not in (None, 'yes') else (t.get('man_made') or t.get('leisure') or 'building'),
                                      osm_way=int(wid), lat_lon=centroid_ll(Q), footprint_m=[round(float(ext.max()), 0), round(float(ext.min()), 0)],
                                      height_m=t.get('height'), levels=t.get('building:levels'), **locate(Q)))
            continue
        if closed and dmin < 60:
            surf = t.get('surface') or ({'sand': 'sand'}.get(t.get('natural'))) or ({'grass': 'grass'}.get(t.get('landuse')))
            if surf in ('gravel', 'sand', 'grass', 'asphalt', 'paved', 'fine_gravel', 'pebblestone', 'artificial_turf', 'concrete'):
                a = abs(geo.signed_area(Q))
                hint_area[surf] = hint_area.get(surf, 0) + a
            continue
        b = t.get('barrier')
        if b and dmin < 30:
            barrier_len[b] = barrier_len.get(b, 0) + geo.polyline_len(Q)
    buildings.sort(key=lambda x: -(x['footprint_m'][0] * x['footprint_m'][1]))
    stands.sort(key=lambda x: x['s_m']); bridges.sort(key=lambda x: x['s_m'])

    # ---------- widths
    if wr_r is not None:
        tot = wr_r + wl_r
        widths = dict(source='tumftm', min_m=round(float(tot.min()), 1), max_m=round(float(tot.max()), 1),
                      median_m=round(float(np.median(tot)), 1),
                      note='Total width (left + right of centreline) from TUMFTM, measured from satellite images. '
                           'Treat as approximate; TUMFTM smoothed the centreline so it is not always in the middle.')
    else:
        wtag = [float(re.sub(r'[^\d.]', '', ways[w][1]['width'])) for w in main if ways[w][1].get('width') and re.sub(r'[^\d.]', '', ways[w][1]['width'])]
        widths = dict(source='osm' if wtag else None, min_m=min(wtag) if wtag else None, max_m=max(wtag) if wtag else None, median_m=None,
                      note='From OSM width tags on the circuit ways.' if wtag else
                           'Not verified. No TUMFTM file and no OSM width tags. Measure from aerial imagery or the FIA circuit drawing.')
        if tum and not tum['used']:
            ow = tum['old_layout_width_m']
            widths['note'] += (f' The older-layout TUMFTM file gives {ow["min"]} to {ow["max"]} m (median {ow["median"]} m), '
                               'which is a fair guide for the unchanged parts of the track.')

    # ---------- corners
    corners = []
    dropped = []
    for label, nm in cur.get('corners', []):
        if wiki_parse.mentions(wt, nm):
            corners.append(dict(turns=label, name=nm, source='wikipedia'))
        else:
            dropped.append(nm)
    if dropped:
        REPORT.append(f'{cid}: corner names dropped (not found in Wikipedia text): {", ".join(dropped)}')
    lm_cur = []
    for nm in cur.get('landmarks', []):
        if wiki_parse.mentions(wt, nm):
            lm_cur.append(dict(name=nm, source='wikipedia'))
        else:
            REPORT.append(f'{cid}: landmark dropped (not found in Wikipedia text): {nm}')

    # ---------- FIA notes derived facts
    notes_all = '\n'.join(notes.values())
    changes = next((v for k, v in notes.items() if 'change' in k.lower()), '')
    change_lines = [re.sub(r'^[-•]\s*', '', l).strip() for l in re.split(r'\n(?=\s*[-•])', changes) if l.strip()]
    change_lines = [re.sub(r'\s+', ' ', l) for l in change_lines]
    kerb_notes = [l for l in change_lines if re.search(r'(?i)kerb|sausage', l)]
    runoff_notes = [l for l in change_lines if re.search(r'(?i)gravel|asphalt|tarmac|grass|turf|run-?off|tecpro|tyre barrier|barrier|wall|guard ?rail|fence|escape', l)]
    pit_rd = next((v for k, v in notes.items() if 'pit entry' in k.lower()), None)
    speed_override = fia_parse.pit_speed_kmh(notes_txt)
    pit_speed = speed_override or 80

    # ---------- assemble
    lap_rec = None
    if lay['record_time']:
        lap_rec = dict(time=lay['record_time'], driver=lay['record_driver'], car=lay['record_car'], year=int(re.sub(r'\D', '', lay['record_year'])[:4]) if re.search(r'\d{4}', lay['record_year']) else None,
                       class_=lay['record_class'] or None, source='wikipedia',
                       note='Fastest lap set during a race (Wikipedia convention: race laps only). 2026-season records are only listed if Wikipedia already shows them.')
        lap_rec['class'] = lap_rec.pop('class_')
    wiki_len = float(lay['length_km']) if re.fullmatch(r'[\d.]+', lay['length_km'] or '') else None
    turns = int(lay['turns']) if (lay['turns'] or '').isdigit() else None

    ent_s = round(float(s_arr[pit_info['ie']]), 0) if pit_info and len(Cres) else None
    ex_s = round(float(s_arr[pit_info['ix']]), 0) if pit_info else None
    if pit_info is not None and centre_src == 'tumftm':
        # map indices of Ccl (before resample) are resample-compatible because side_of used Ccl; recompute on Cres
        _, _, ie = geo.side_of(Cres, Tc, pit_info['main'][0]); _, _, ix = geo.side_of(Cres, Tc, pit_info['main'][-1])
        ent_s, ex_s = round(float(s_arr[ie]), 0), round(float(s_arr[ix]), 0)
    elif pit_info is not None:
        _, _, ie = geo.side_of(Cres, Tc, pit_info['main'][0]); _, _, ix = geo.side_of(Cres, Tc, pit_info['main'][-1])
        ent_s, ex_s = round(float(s_arr[ie]), 0), round(float(s_arr[ix]), 0)
    if pit_info is not None:
        pit_side = geo.side_of(Cres, Tc, pit_info['main'][len(pit_info['main']) // 2])[0]

    # lengths cross-check
    len_check = dict(fia_centreline_m=round(official_m, 0), wikipedia_m=round(wiki_len * 1000, 0) if wiki_len else None,
                     osm_loop_m=round(loop_len, 0), tumftm_m=tum['length_m'] if tum else None, pack_centreline_m=round(L, 0))
    if tum and abs(tum['length_m'] - official_m) > 40:
        REPORT.append(f'{cid}: TUMFTM length {tum["length_m"]:.0f} m differs from the FIA {official_m:.0f} m by '
                      f'{tum["length_m"] - official_m:+.0f} m (older layout or smoothing), check before use')
    if abs(loop_len - official_m) > 60:
        REPORT.append(f'{cid}: OSM loop {loop_len:.0f} m vs FIA {official_m:.0f} m, check the OSM ways')

    zone_src = 'fia_map'
    if c['fia_year'] >= 2026:
        aero = dict(system='2026 active aero: straight mode zones and overtake mode', source=zone_src, season=2026,
                    straight_mode_zones=fmap['straight_mode_zones'], overtake=fmap['overtake'],
                    note='Straight mode (low-drag wing setting) can be used in each zone. The FIA map gives two activation points '
                         'per zone: one for normal grip and one for low grip (n/a means the zone is not used in low grip). '
                         'Overtake mode: detection point and activation point. Locations are as printed on the FIA map.')
        if cid == 'monaco':
            aero['note'] = ('No straight mode zones: active aero was not used at Monaco in 2026 (FIA map lists none; '
                            'formula1.com "Explained: Why Active Aero will not be used at the Monaco Grand Prix", 4 June 2026). ') + aero['note']
    else:
        aero = dict(system='2025 DRS (2026 documents not published yet)', source=zone_src, season=2025,
                    straight_mode_zones=None, overtake=None, drs=fmap['drs_zones'],
                    note='The 2026 event has not taken place, so the 2026 straight mode zones are not published. '
                         'The 2025 DRS points are the best available guide; 2026 zones will likely sit on the same straights '
                         'but this is not confirmed. Replace when the 2026 FIA circuit map is issued.')

    out = dict(
        schema_version=SCHEMA_VERSION,
        id=cid,
        status='confirmed' if c['round'] else None,
        event=dict(round=c['round'], grand_prix=c['gp'], weekend=c['weekend'], race_date=c['race_date'], sprint=c['sprint'],
                   source='formula1.com/en/racing/2026 and Wikipedia 2026 season article'),
        circuit=dict(official_name=wiki_parse.clean(ib.get('name', title)), common_name=title,
                     location=wiki_parse.clean(ib.get('location', '')), lat=wcoord[0], lon=wcoord[1],
                     coordinate_source='wikipedia' if cid != 'suzuka' else 'wikidata Q174170 (P625)',
                     layout=tidy_layout(lay['layout']), opened=tidy_opened(ib.get('opened', '')),
                     source='wikipedia'),
        length=dict(official_m=round(official_m, 0), source='fia_map' if fmap['centreline_length_km'] else 'wikipedia', checks=len_check),
        corners=dict(count=turns, count_source='wikipedia',
                     note='Turn count as given by Wikipedia for this layout. The FIA map numbering is the reference for turn labels'
                          + (' (the 2026 Hungaroring map adds a turn "1A")' if cid == 'hungaroring' else '') + '.',
                     named=corners,
                     named_note='Names checked against the Wikipedia article text. The turn label is the usual mapping and should be '
                                'checked against the FIA map before placing signs.' if corners else 'No corner names verified for this circuit.'),
        direction=dict(value=direction, basis=dir_basis,
                       stated_by_source=cur.get('direction_stated'),
                       note='Computed from the orientation of the race-direction centreline.' if direction and direction != 'figure-eight' else
                            ('Suzuka crosses itself, so clockwise/anticlockwise does not apply.' if direction == 'figure-eight' else
                             'Not verified: no oneway data and no written source found.')),
        lap_record=lap_rec or unknown('No race lap record listed on Wikipedia for this layout.'),
        centreline=dict(source='bacinger' if alt_line else centre_src, geojson=alt_line, csv=f'cad/track/raw/centreline/{cid}.csv', spacing_m=STEP_M, samples=len(Cres), length_m=round(L, 1),
                        s0=s0_note, tumftm=tum, osm=osm_ref,
                        tumftm_missing_alternative=None if (tum and tum['used']) else
                            'OpenStreetMap circuit ways (used here, no widths). Better: trace both track edges from aerial imagery '
                            'or the FIA circuit drawing to get widths.'),
        elevation=dict(elev or {}, source='opentopodata', official_change_m=None,
                       note=('Computed from a terrain model sampled along the centreline and smoothed over about 30 m. '
                             + ('SRTM includes buildings and trees, so on a street circuit the figure is rough. ' if c['dem'] == 'srtm30m' else '')
                             + 'No official elevation figure was verified.')),
        track_width=widths,
        kerbs=dict(value=None, fia_changes=kerb_notes or None,
                   note='Kerb types and positions are not published as data. Lines quoted from the FIA Race Director notes '
                        '("Changes to the Circuit") where they mention kerbs. The current build derives kerbs from curvature.'),
        run_off=dict(value=None, fia_changes=runoff_notes or None,
                     osm_hints=dict(surface_area_m2_within_60m={k: round(v) for k, v in sorted(hint_area.items())} or None,
                                    barrier_length_m_within_30m={k: round(v) for k, v in sorted(barrier_len.items())} or None,
                                    note='Only what OSM contributors have mapped near the track; incomplete at most circuits.'),
                     note='Run-off surfaces per corner are not verified. FIA lines quoted where they describe gravel, asphalt, grass, walls or barriers.'),
        track_limits=next((v for k, v in notes.items() if 'track limits' in k.lower()), None),
        pit_lane=dict(
            speed_limit_kmh=pit_speed,
            speed_limit_source=('fia_notes (Race Director amendment)' if speed_override else
                                'FIA 2026 F1 Sporting Regulations B1.6.3a default (80 km/h); the Race Director notes do not amend it'
                                + (' (2025 notes; 2026 notes not issued yet)' if c['fia_year'] < 2026 else '')),
            side=pit_side if (pit_info and direction) else None,
            side_basis=('OSM pit lane position relative to the race-direction centreline' if direction else
                        'Not decided: the race direction of the centreline is not verified, so left/right is unknown. '
                        'Pit entry/exit positions below may be swapped.') if pit_info else None,
            length_m=pit_info['main_len'] if pit_info else None,
            length_all_pit_ways_m=pit_info['length_m'] if pit_info else None,
            length_note='Length of the OSM pit lane way (usually includes the entry and exit roads). Not an official figure.' if pit_info else
                        'Not verified. No pit lane way found in OSM.',
            entry=dict(s_m=ent_s, lat_lon=[round(float(x), 6) for x in enu.inv(pit_info['main'][:1])[0]] if pit_info else None),
            exit=dict(s_m=ex_s, lat_lon=[round(float(x), 6) for x in enu.inv(pit_info['main'][-1:])[0]] if pit_info else None),
            osm_ways=pit_info['ids'] if pit_info else None,
            fia_entry_exit_rules=pit_rd,
            garages=unknown('Not verified. The FIA pit lane drawing (fia_map source) shows the garage layout per team.')),
        sectors=dict(source='fia_map', season=c['fia_year'], lengths_km=fmap['sectors_km'] or None, intermediates=fmap['intermediates'],
                     speed_trap=fmap['speed_trap'],
                     note=None if fmap['sectors_km'] else 'The 2025 map gives intermediate points but not sector lengths.'),
        overtaking=aero,
        landmarks=dict(grandstands=stands, bridges=bridges, tunnels=tunnels, buildings=buildings[:20], named=lm_cur,
                       note='Grandstands, bridges, tunnels and buildings come from OSM within a few hundred metres of the track '
                            '(s_m = distance along the pack centreline, side = left/right in race direction). "named" are notable '
                            'features mentioned in the Wikipedia article, without positions.'),
        sources=sources_list,
        gaps=[],
    )
    # gap list
    gaps = out['gaps']
    if not tum: gaps.append('No TUMFTM centreline; OSM centreline used, no track widths.')
    elif not tum['used']: gaps.append('TUMFTM file is an older layout; OSM centreline used, no current-layout track widths.')
    if direction is None:
        gaps.append('Race direction not verified, so s_m, left/right sides and pit entry/exit may be reversed.')
        out['landmarks']['note'] += (' Race direction not verified here: s_m and side follow the order of the source line '
                                     'and may be reversed.')
    if tunnels and out['elevation'].get('note'):
        out['elevation']['note'] += (' Part of the lap is in a tunnel, where the terrain model gives the ground above or the '
                                     'water surface, not the road.')
    if alt_line: gaps.append('Centreline is a coarse hand-drawn line (bacinger/f1-circuits), not survey data.')
    if widths['min_m'] is None: gaps.append('Track width not verified.')
    gaps.append('Kerb types and positions not verified as data (only FIA change notes).')
    gaps.append('Run-off surface per corner not verified (only FIA change notes and OSM hints).')
    gaps.append('Garage count not verified.')
    if not corners: gaps.append('No corner names verified.')
    if c['fia_year'] < 2026: gaps.append('2026 FIA circuit map not issued yet; sectors and overtaking use 2025 DRS data.')
    if not stands: gaps.append('No grandstands mapped in OSM near the track.')
    if pit_info is None: gaps.append('Pit lane not found in OSM.')
    if cid == 'red_bull_ring':
        out['built'] = dict(builder='tools/track/build_red_bull_ring.py', data='cad/track/red_bull_ring_data.js', scene='cad/track/red_bull_ring.js',
                            note='This circuit is already built. The builder uses the same TUMFTM file and OSM/EU-DEM sources as this pack.')
    with open(os.path.join(OUT_DIR, f'{cid}.json'), 'w', encoding='utf-8') as f:
        json.dump(out, f, indent=2, ensure_ascii=False, allow_nan=False)
        f.write('\n')
    print(f'  wrote {cid}.json: {len(stands)} stands, {len(bridges)} bridges, {len(tunnels)} tunnels, {len(buildings)} buildings, pit {pit_side if pit_info else None}')
    return out


def main():
    want = sys.argv[1:]
    os.makedirs(OUT_DIR, exist_ok=True)
    built = []
    for c in CIRCUITS:
        if want and c['id'] not in want:
            continue
        try:
            built.append(build(c))
        except Exception as e:
            import traceback; traceback.print_exc()
            REPORT.append(f"{c['id']}: BUILD FAILED: {e}")
    if not want:
        cal = dict(season=2026, retrieved=RETRIEVED,
                   sources=['https://www.formula1.com/en/racing/2026', wiki_url('2026 Formula One World Championship'),
                            'https://www.formula1.com/en/latest/article/formula-1-and-fia-confirm-formula-1-and-fia-confirm-malaysia-will-join-2026-calendar-as-host-venue-for-the-bahrain-grand-prix.6lL7vjFEM2VVynRHvg1TCf',
                            'https://www.skysports.com/f1/news/13519453/f1-confirms-cancellation-of-bahrain-and-saudi-arabian-grands-prix-due-to-war-in-middle-east-as-2026-calendar-reduced-to-22-races'],
                   rounds=[dict(round=c['round'], grand_prix=c['gp'], circuit_id=c['id'], weekend=c['weekend'], race_date=c['race_date'],
                                sprint=c['sprint'], tumftm=bool(c['tumftm'])) for c in CIRCUITS],
                   removed=REMOVED,
                   notes=['Madrid (Madring) hosts the Spanish Grand Prix from 2026; Barcelona keeps a race as the Barcelona-Catalunya Grand Prix.',
                          'Imola (Emilia Romagna Grand Prix) is no longer on the calendar.',
                          'Qatar and Abu Dhabi were still scheduled on 2026-10-03, but news reports (Reuters, AP, July 2026) said they could be cancelled because of the Middle East conflict.'])
        with open(os.path.join(OUT_DIR, 'calendar_2026.json'), 'w', encoding='utf-8') as f:
            json.dump(cal, f, indent=2, ensure_ascii=False); f.write('\n')
    print('\nREPORT')
    for r in REPORT:
        print(' -', r)
    with open(os.path.join(sources.CACHE, 'build_report.txt'), 'w') as f:
        f.write('\n'.join(REPORT) + '\n')


if __name__ == '__main__':
    main()
