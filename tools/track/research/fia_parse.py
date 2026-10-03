"""Parse the FIA circuit map and Race Director notes (pdftotext -layout output)."""
import re


def _clean(s):
    return re.sub(r'\s+', ' ', s).strip(' -')


def parse_map(txt, year):
    out = dict(centreline_length_km=None, sectors_km=[], intermediates=[], speed_trap=None,
               straight_mode_zones=[], overtake=None, drs_zones=None)
    m = re.search(r'CIRCUIT CENTRELINE LENGTH\s*[-=]\s*([\d.]+)\s*km', txt, re.I)
    if m:
        out['centreline_length_km'] = float(m.group(1))
    if year >= 2026:
        for n, v in re.findall(r'SECTOR (\d) - ([\d.]+)km', txt):
            out['sectors_km'].append(dict(sector=int(n), length_km=float(v)))
        for n, v in re.findall(r'INTERMEDIATE (\d) \[S\d\]\s+- (.+?)(?=\s{3,}|\n)', txt):
            out['intermediates'].append(dict(point=f'S{n}', location=_clean(v)))
        m = re.search(r'SPEED TRAP \[T\]\s+- (.+?)(?=\s{3,}|\n)', txt)
        out['speed_trap'] = _clean(m.group(1)) if m else None
        det = re.search(r'DETECTION\s+- (.+?)(?=\s{3,}|\n)', txt)
        act = re.search(r'ACTIVATION - (.+?)(?=\s{3,}|\n)', txt)
        if act and re.search(r'(before|after)$', act.group(1).strip()):
            nxt = re.search(r'ACTIVATION - .*\n.*?\s{3,}(T\d+\S*)\s{3,}', txt)   # value wrapped onto the next line (Hungaroring)
            act_val = act.group(1).strip() + (' ' + nxt.group(1) if nxt else '')
        else:
            act_val = act.group(1) if act else None
        if det or act:
            out['overtake'] = dict(detection=_clean(det.group(1)) if det else None,
                                   activation=_clean(act_val) if act_val else None)
        for line in txt.splitlines():
            m = re.search(r'(?:^|\s{3,})([^\s].*?)\s+-\s+ZONE (A\d) -\s+(.+?)\s*$', line)
            if m:
                left = re.split(r'\s{3,}', m.group(1))[-1]
                normal, low = _clean(left), _clean(m.group(3))
                if normal.lower() == 'n/a' and low.lower() == 'n/a':
                    continue   # zone printed in the table but not in use at this event
                out['straight_mode_zones'].append(dict(zone=m.group(2),
                    normal_grip_activation=None if normal.lower() == 'n/a' else normal,
                    low_grip_activation=None if low.lower() == 'n/a' else low))
    else:
        for n, v in re.findall(r'S(\d) Sector \d\s+[\[(]?((?:\d+m )?(?:before|after) (?:turn ?|T)\d+|Entry T\d+)', txt, re.I):
            out['intermediates'].append(dict(point=f'S{n}', location=_clean(v)))
        m = re.search(r'Speed Trap\s*[\[(]?(\d+m (?:before|after) (?:turn ?|T)\d+)', txt, re.I)
        out['speed_trap'] = _clean(m.group(1)) if m else None
        pts = dict(detection=[], activation=[])
        for kind, n, v in re.findall(r'DRS (Detection|Activation) ?(\d?)\s*[\[(]?((?:\d+m |Exit |Apex |apex )?[^\]\)\n]*?(?:[Tt]urn ?\d+|T\d+)[^\]\)\n]*?)[\])]?(?=\s{2,}|\n)', txt):
            pts[kind.lower()].append(dict(label=f'{kind} {n}'.strip(), location=_clean(v)))
        out['drs_zones'] = dict(detection_points=pts['detection'], activation_points=pts['activation'],
                                note='DRS points as printed on the FIA map. Detection and activation lists are not always one to one '
                                     '(several activation points can share one detection point).')
    return out


def notes_sections(txt):
    """Return the Track Limits / Changes to the Circuit / pit entry and exit sections as plain text."""
    secs = re.split(r'\n\s{0,4}(\d{1,2})\.\s+([A-Z][^\n]{2,80})\n', txt)
    out = {}
    for i in range(1, len(secs) - 2, 3):
        title = secs[i + 1].strip().rstrip(':')
        if re.search(r'track limits|changes to the circuit|lines at the pit|pit lane speed', title, re.I):
            body = secs[i + 2]
            body = re.split(r'\n\s*(Rui Marques|The FIA Formula 1 Race Director|\d{1,2}\. Maximum number)', body)[0]
            body = re.sub(r'\n\s*\d+\s*\n', '\n', body)
            lines = [re.sub(r'\s+', ' ', l).strip() for l in body.splitlines()]
            out[title] = re.sub(r'\s*\n\s*', '\n', '\n'.join(l for l in lines if l)).strip()
    return out


def pit_speed_kmh(txt):
    m = re.search(r'Pit Lane Speed limit.*?amended to\s*(\d+)\s*km/h', txt, re.S | re.I)
    return int(m.group(1)) if m else None
