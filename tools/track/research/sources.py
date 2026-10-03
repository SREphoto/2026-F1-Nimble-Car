"""Cached downloads for the research pack: Wikipedia, FIA PDFs, OpenStreetMap API, OpenTopoData DEM.

Everything is cached under <repo>/.track_cache/research/ (git-ignored). Delete a file there to refetch it.
Only public endpoints are used; requests are spaced out to respect each service's usage policy.
"""
import json, os, re, subprocess, time, urllib.parse, urllib.request
import xml.etree.ElementTree as ET

REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
CACHE = os.path.join(REPO, '.track_cache', 'research')
UA = {'User-Agent': 'f1-nimble-car-track-research/1.0 (github.com/SREphoto/2026-F1-Nimble-Car)'}
OSM_API = 'https://api.openstreetmap.org/api/0.6/'
for sub in ('osm', 'fia', 'wiki', 'dem'):
    os.makedirs(os.path.join(CACHE, sub), exist_ok=True)


def _download(url, dst, data=None, pause=1.0, tries=5):
    last = None
    for attempt in range(tries):
        try:
            req = urllib.request.Request(url, data=data, headers=UA)
            with urllib.request.urlopen(req, timeout=180) as r:
                body = r.read()
            with open(dst, 'wb') as f:
                f.write(body)
            time.sleep(pause)
            return body
        except urllib.error.HTTPError as e:
            if e.code == 400:      # OSM: too many nodes in bbox; caller splits the box
                raise
            last = e
        except Exception as e:
            last = e
        time.sleep(5 * (attempt + 1))
    raise RuntimeError(f'download failed: {url}: {last}')


def wiki_wikitext(title):
    dst = os.path.join(CACHE, 'wiki', re.sub(r'\W+', '_', title) + '.json')
    if not os.path.exists(dst):
        q = urllib.parse.urlencode(dict(action='parse', page=title, prop='wikitext|revid', redirects=1, format='json'))
        _download('https://en.wikipedia.org/w/api.php?' + q, dst, pause=8)
    d = json.load(open(dst))['parse']
    return d['title'], d['wikitext']['*'], d.get('revid')


def fia_text(name):
    pdf = os.path.join(CACHE, 'fia', name)
    txt = pdf[:-4] + '.txt'
    if not os.path.exists(pdf):
        req = urllib.request.Request('https://www.fia.com/system/files/decision-document/' + name, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=180) as r, open(pdf, 'wb') as f:
            f.write(r.read())
    if not os.path.exists(txt):
        subprocess.run(['pdftotext', '-layout', pdf, txt], check=True)
    return open(txt, encoding='utf-8', errors='replace').read()


def osm_xml(path, cache_name):
    dst = os.path.join(CACHE, 'osm', cache_name)
    if not os.path.exists(dst):
        _download(OSM_API + path, dst)
    return ET.parse(dst).getroot()


def osm_area(lat0, lon0, lat1, lon1, tag):
    """All OSM data in a bbox, split recursively when the API refuses (50 000 node limit)."""
    name = f'area_{tag}_{lat0:.4f}_{lon0:.4f}_{lat1:.4f}_{lon1:.4f}.osm'
    try:
        return [osm_xml(f'map?bbox={lon0:.5f},{lat0:.5f},{lon1:.5f},{lat1:.5f}', name)]
    except urllib.error.HTTPError as e:
        if e.code != 400:
            raise
    roots = []
    lm, om = (lat0 + lat1) / 2, (lon0 + lon1) / 2
    for a, b, c, d in ((lat0, lon0, lm, om), (lat0, om, lm, lon1), (lm, lon0, lat1, om), (lm, om, lat1, lon1)):
        roots += osm_area(a, b, c, d, tag)
    return roots


def dem_profile(latlon, dataset, tag):
    """Elevation (m) for each (lat, lon) from the public OpenTopoData API (100 points per call, 1 call per second)."""
    dst = os.path.join(CACHE, 'dem', f'{tag}_{dataset}_{len(latlon)}.json')
    if os.path.exists(dst):
        return json.load(open(dst))
    out = []
    for k in range(0, len(latlon), 100):
        loc = '|'.join('%.6f,%.6f' % (a, b) for a, b in latlon[k:k + 100])
        body = urllib.parse.urlencode({'locations': loc}).encode()
        tmp = dst + '.part'
        res = json.loads(_download(f'https://api.opentopodata.org/v1/{dataset}', tmp, data=body, pause=1.1))
        if res.get('status') != 'OK':
            raise RuntimeError(res)
        out += [r['elevation'] for r in res['results']]
    os.remove(dst + '.part')
    json.dump(out, open(dst, 'w'))
    return out
