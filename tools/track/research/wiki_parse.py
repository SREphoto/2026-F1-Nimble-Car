"""Pull the circuit infobox (name, location, coordinates, layouts with length, turns and race lap record) from wikitext."""
import re, unicodedata


def clean(v):
    v = re.sub(r'<ref[^>]*/>', '', v)
    v = re.sub(r'<ref[^>]*>.*?</ref>', '', v, flags=re.S)
    v = re.sub(r'<!--.*?-->', '', v, flags=re.S)
    v = re.sub(r'\{\{efn[^}]*\}\}', '', v)
    v = re.sub(r'\{\{flagicon\|[^}]*\}\}', '', v)
    v = re.sub(r'\{\{ill\|([^|}]*)[^}]*\}\}', r'\1', v)
    v = re.sub(r'\{\{cvt\|[^}]*\}\}', '', v)
    v = re.sub(r'\[\[(?:[^|\]]*\|)?([^\]]*)\]\]', r'\1', v)
    v = re.sub(r"'''?", '', v)
    v = re.sub(r'<br\s*/?>', ' ', v)
    v = v.replace('}}', '').replace('{{', '')
    return re.sub(r'\s+', ' ', v).strip(' ()')


def infobox(w):
    m = re.search(r'\{\{\s*(Infobox motorsport venue|Motorsport venue)', w)
    i = m.start(); depth = 0; j = i
    while j < len(w):
        if w.startswith('{{', j): depth += 1; j += 2; continue
        if w.startswith('}}', j):
            depth -= 1; j += 2
            if depth == 0: break
            continue
        j += 1
    body = w[i:j]
    parts, d, cur, k = [], 0, '', 0
    while k < len(body):
        if body.startswith('{{', k) or body.startswith('[[', k): d += 1; cur += body[k:k + 2]; k += 2; continue
        if body.startswith('}}', k) or body.startswith(']]', k): d -= 1; cur += body[k:k + 2]; k += 2; continue
        if body[k] == '|' and d == 1: parts.append(cur); cur = ''; k += 1; continue
        cur += body[k]; k += 1
    parts.append(cur)
    out = {}
    for p in parts[1:]:
        if '=' in p:
            a, b = p.split('=', 1)
            out[a.strip()] = b.strip()
    return out


def coord(raw):
    m = re.search(r'\{\{[Cc]oord\|([^}]*)\}\}', raw or '')
    if not m:
        return None
    nums, hem = [], []
    for x in m.group(1).split('|'):
        if re.fullmatch(r'-?[\d.]+', x): nums.append(float(x))
        elif x in ('N', 'S', 'E', 'W'): hem.append(x)
        else: break
    if len(nums) < 2:
        return None
    if not hem:
        return round(nums[0], 6), round(nums[1], 6)
    h = len(nums) // 2
    la = sum(v / 60 ** k for k, v in enumerate(nums[:h])); lo = sum(v / 60 ** k for k, v in enumerate(nums[h:]))
    return round(-la if hem[0] == 'S' else la, 6), round(-lo if hem[1] == 'W' else lo, 6)


def layouts(ib):
    out = []
    for n in [''] + [str(i) for i in range(2, 15)]:
        lk = 'length_km' if n == '' else f'length{n}_km'
        if f'layout{n}' not in ib and lk not in ib:
            continue
        L = dict(layout=clean(ib.get(f'layout{n}', '')), length_km=clean(ib.get(lk, '')), turns=clean(ib.get(f'turns{n}', '')))
        for f in ('record_time', 'record_driver', 'record_car', 'record_year', 'record_class'):
            L[f] = clean(ib.get(f + n, ''))
        L['record_time'] = re.sub(r'\s*\(.*$', '', L['record_time'])
        out.append(L)
    return out


def norm(s):
    s = unicodedata.normalize('NFKD', s).encode('ascii', 'ignore').decode().lower()
    return re.sub(r'[^a-z0-9]+', ' ', s).strip()


def mentions(wikitext, name):
    return norm(name) in norm(wikitext)
