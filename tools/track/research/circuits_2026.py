"""
Registry of the 2026 Formula 1 calendar and where each circuit's source data lives.

Calendar confirmed on 2026-10-03 against:
  * formula1.com/en/racing/2026 (official schedule page, rounds and weekend dates)
  * en.wikipedia.org/wiki/2026_Formula_One_World_Championship (calendar table and race dates)
  * Formula 1 / FIA press release of 26 July 2026: the postponed Bahrain Grand Prix is held at
    Sepang (Malaysia) on 2-4 October 2026 as the "Gulf Air Bahrain Grand Prix in Malaysia".
  * Sky Sports, 14 March 2026: Bahrain (Sakhir) and Saudi Arabian (Jeddah) April races cancelled.

Fields
  id           file name used under cad/track/circuits/<id>.json
  round        2026 round number
  gp           Grand Prix name used by Formula 1 for 2026
  weekend      weekend dates from formula1.com (Fri-Sun, Thu-Sat for Las Vegas)
  race_date    race day (ISO); Baku and Las Vegas race on a Saturday
  sprint       True if the weekend uses the sprint format (formula1.com 2026 sprint calendar)
  wiki         English Wikipedia article title of the circuit
  tumftm       file stem in github.com/TUMFTM/racetrack-database (tracks/<stem>.csv) or None
  osm_relation OpenStreetMap relation id (type=circuit) for the F1 layout, or None
  osm_ways_name  for circuits without a usable relation: regex matched against highway=raceway names
  fia_map / fia_notes  FIA document file names (fia.com/system/files/decision-document/<name>)
  fia_year     season of the FIA documents used (2025 where the 2026 event has not happened yet)
  dem          OpenTopoData dataset used for elevation (eudem25m inside Europe, srtm30m elsewhere)
"""

FIA_BASE = 'https://www.fia.com/system/files/decision-document/'

CIRCUITS = [
    dict(id='albert_park', round=1, gp='Australian Grand Prix', weekend='2026-03-06/2026-03-08', race_date='2026-03-08', sprint=False,
         wiki='Albert Park Circuit', tumftm='Melbourne', osm_relation=280443, dem='srtm30m', fia_year=2026,
         fia_map='2026_australian_grand_prix_-_competition_notes_-_circuit_map_pit_lane_drawing_emergency_exits_map_and_quarantine_zone.pdf',
         fia_notes='2026_australian_grand_prix_-_race_directors_competition_notes_v2.pdf'),
    dict(id='shanghai', round=2, gp='Chinese Grand Prix', weekend='2026-03-13/2026-03-15', race_date='2026-03-15', sprint=True,
         wiki='Shanghai International Circuit', tumftm='Shanghai', osm_relation=2094941, dem='srtm30m', fia_year=2026,
         fia_map='2026_chinese_grand_prix_-_competition_notes_-_circuit_map_pit_lane_drawing_emergency_exits_map_battery_containment_area_and_red_zone.pdf',
         fia_notes='2026_chinese_grand_prix_-_race_directors_competition_notes_v3.pdf'),
    dict(id='suzuka', round=3, gp='Japanese Grand Prix', weekend='2026-03-27/2026-03-29', race_date='2026-03-29', sprint=False,
         wiki='Suzuka Circuit', tumftm='Suzuka', osm_relation=284570, dem='srtm30m', fia_year=2026,
         fia_map='2026_japanese_grand_prix_-_competition_notes_-_circuit_map_pit_lane_drawing_emergency_exits_map_battery_containment_area_and_red_zone.pdf',
         fia_notes='2026_japanese_grand_prix_-_race_directors_competition_notes_v2.pdf'),
    dict(id='miami', round=4, gp='Miami Grand Prix', weekend='2026-05-01/2026-05-03', race_date='2026-05-03', sprint=True,
         wiki='Miami International Autodrome', tumftm=None, osm_relation=None, osm_ways_name='^Miami International Autodrome$', osm_note='Circuit relation 20204222 (child 20204221) holds untagged geometry only, so the named raceway ways are used', dem='srtm30m', fia_year=2026,
         fia_map='2026_miami_grand_prix_-_competition_notes_-_circuit_map_pit_lane_drawing_emergency_exits_map_and_red_zone.pdf',
         fia_notes='2026_miami_grand_prix_-_race_directors_competition_notes_v3.pdf'),
    dict(id='montreal', round=5, gp='Canadian Grand Prix', weekend='2026-05-22/2026-05-24', race_date='2026-05-24', sprint=True,
         wiki='Circuit Gilles Villeneuve', tumftm='Montreal', osm_relation=284595, dem='srtm30m', fia_year=2026,
         fia_map='2026_canadian_grand_prix_-_competition_notes_-_circuit_map_v2.pdf',
         fia_notes='2026_canadian_grand_prix_-_race_directors_competition_notes_.pdf'),
    dict(id='monaco', round=6, gp='Monaco Grand Prix', weekend='2026-06-05/2026-06-07', race_date='2026-06-07', sprint=False,
         wiki='Circuit de Monaco', tumftm=None, osm_relation=148194, dem='eudem25m', fia_year=2026,
         fia_map='2026_monaco_grand_prix_-_competition_notes_-_circuit_map_pit_lane_drawing_emergency_exits_map_and_red_zone.pdf',
         fia_notes='2026_monaco_grand_prix_-_race_directors_competition_notes_v3.pdf'),
    dict(id='barcelona', round=7, gp='Barcelona-Catalunya Grand Prix', weekend='2026-06-12/2026-06-14', race_date='2026-06-14', sprint=False,
         wiki='Circuit de Barcelona-Catalunya', tumftm='Catalunya', osm_relation=284540, dem='eudem25m', fia_year=2026,
         fia_map='2026_barcelona-catalunya_grand_prix_-_competition_notes_-_circuit_map_pit_lane_drawing_and_emergency_exits_map.pdf',
         fia_notes='2026_barcelona-catalunya_grand_prix_-_race_directors_competition_notes_v3.pdf'),
    dict(id='red_bull_ring', round=8, gp='Austrian Grand Prix', weekend='2026-06-26/2026-06-28', race_date='2026-06-28', sprint=False,
         wiki='Red Bull Ring', tumftm='Spielberg', osm_relation=5309181, dem='eudem25m', fia_year=2026,
         fia_map='2026_austrian_grand_prix_-_competition_notes_-_circuit_map_pit_lane_drawing_emergency_exits_map_and_red_zone.pdf',
         fia_notes='2026_austrian_grand_prix_-_race_directors_competition_notes.pdf'),
    dict(id='silverstone', round=9, gp='British Grand Prix', weekend='2026-07-03/2026-07-05', race_date='2026-07-05', sprint=True,
         wiki='Silverstone Circuit', tumftm='Silverstone', osm_relation=51160, dem='eudem25m', fia_year=2026,
         fia_map='2026_british_grand_prix_-_competition_notes_-_circuit_map_pit_lane_drawing_emergency_exits_map_and_red_zone.pdf',
         fia_notes='2026_british_grand_prix_-_race_directors_competition_notes.pdf'),
    dict(id='spa', round=10, gp='Belgian Grand Prix', weekend='2026-07-17/2026-07-19', race_date='2026-07-19', sprint=False,
         wiki='Circuit de Spa-Francorchamps', tumftm='Spa', osm_relation=284560, dem='eudem25m', fia_year=2026,
         fia_map='2026_belgian_grand_prix_-_competition_notes_-_circuit_map_pit_lane_drawing_emergency_exits_map_and_red_zone.pdf',
         fia_notes='2026_belgian_grand_prix_-_race_directors_competition_notes.pdf'),
    dict(id='hungaroring', round=11, gp='Hungarian Grand Prix', weekend='2026-07-24/2026-07-26', race_date='2026-07-26', sprint=False,
         wiki='Hungaroring', tumftm='Budapest', osm_relation=284557, dem='eudem25m', fia_year=2026,
         fia_map='2026_hungarian_grand_prix_-_competition_notes_-_circuit_map_pit_lane_drawing_emergency_exits_map_and_red_zone.pdf',
         fia_notes='2026_hungarian_grand_prix_-_race_directors_competition_notes_v2.pdf'),
    dict(id='zandvoort', round=12, gp='Dutch Grand Prix', weekend='2026-08-21/2026-08-23', race_date='2026-08-23', sprint=True,
         wiki='Circuit Zandvoort', tumftm='Zandvoort', osm_relation=13545573, dem='eudem25m', fia_year=2026,
         fia_map='2026_dutch_grand_prix_-_competition_notes_-_circuit_map_pit_lane_drawing_and_emergency_exits_map.pdf',
         fia_notes='2026_dutch_grand_prix_-_race_directors_competition_notes.pdf'),
    dict(id='monza', round=13, gp='Italian Grand Prix', weekend='2026-09-04/2026-09-06', race_date='2026-09-06', sprint=False,
         wiki='Monza Circuit', tumftm='Monza', osm_relation=284565, dem='eudem25m', fia_year=2026,
         fia_map='2026_italian_grand_prix_-_competition_notes_-_circuit_map_pit_lane_drawing_emergency_exits_map_and_red_zone.pdf',
         fia_notes='2026_italian_grand_prix_-_race_directors_competition_notes_v2.pdf'),
    dict(id='madring', round=14, gp='Spanish Grand Prix', weekend='2026-09-11/2026-09-13', race_date='2026-09-13', sprint=False,
         wiki='Madring', tumftm=None, osm_relation=None, osm_ways_name=r'(?i)^mad ?ring', bacinger='es-2026', dem='eudem25m', fia_year=2026,
         fia_map='2026_spanish_grand_prix_-_competition_notes_-_circuit_map_pit_lane_drawing_and_emergency_exits_map.pdf',
         fia_notes='2026_spanish_grand_prix_-_race_directors_competition_notes_v3.pdf'),
    dict(id='baku', round=15, gp='Azerbaijan Grand Prix', weekend='2026-09-24/2026-09-26', race_date='2026-09-26', sprint=False,
         wiki='Baku City Circuit', tumftm=None, osm_relation=11266687, dem='srtm30m', fia_year=2026,
         fia_map='2026_azerbaijan_grand_prix_-_competition_notes_-_circuit_map_pit_lane_drawing_emergency_exits_map_and_red_zone.pdf',
         fia_notes='2026_azerbaijan_grand_prix_-_race_directors_competition_notes_v3.pdf'),
    dict(id='sepang', round=16, gp='Bahrain Grand Prix (held in Malaysia)', weekend='2026-10-02/2026-10-04', race_date='2026-10-04', sprint=False,
         wiki='Sepang International Circuit', tumftm='Sepang', osm_relation=284496, dem='srtm30m', fia_year=2026,
         fia_map='2026_bahrain_grand_prix_in_malaysia_-_competition_notes_-_circuit_map_pit_lane_drawing_emergency_exits_map_and_red_zone.pdf',
         fia_notes='2026_bahrain_grand_prix_in_malaysia_-_race_directors_competition_notes_v3.pdf'),
    dict(id='marina_bay', round=17, gp='Singapore Grand Prix', weekend='2026-10-09/2026-10-11', race_date='2026-10-11', sprint=True,
         wiki='Marina Bay Street Circuit', tumftm=None, osm_relation=421263, dem='srtm30m', fia_year=2025,
         fia_map='2025_singapore_grand_prix_-_event_notes_-_circuit_map_pit_lane_emergency_exits_map_and_quarantine_zone.pdf',
         fia_notes='2025_singapore_grand_prix_-_race_directors_event_notes_v2.pdf'),
    dict(id='cota', round=18, gp='United States Grand Prix', weekend='2026-10-23/2026-10-25', race_date='2026-10-25', sprint=False,
         wiki='Circuit of the Americas', tumftm='Austin', osm_relation=6537729, dem='srtm30m', fia_year=2025,
         fia_map='2025_united_states_grand_prix_-_event_notes_-_circuit_map_pit_lane_drawing_emergency_exits_map_quarantine_zone_map_red_zones_map.pdf',
         fia_notes='2025_united_states_grand_prix_-_race_directors_event_notes_v2.pdf'),
    dict(id='mexico_city', round=19, gp='Mexico City Grand Prix', weekend='2026-10-30/2026-11-01', race_date='2026-11-01', sprint=False,
         wiki='Autódromo Hermanos Rodríguez', tumftm='MexicoCity', osm_relation=16251935, dem='srtm30m', fia_year=2025,
         fia_map='2025_mexico_city_grand_prix_-_event_notes_-_circuit_map_pit_lane_drawing_emergency_exits_map_and_quarantine_zone_area.pdf',
         fia_notes='2025_mexico_city_grand_prix_-_race_directors_event_notes_v3.pdf'),
    dict(id='interlagos', round=20, gp='São Paulo Grand Prix', weekend='2026-11-06/2026-11-08', race_date='2026-11-08', sprint=False,
         wiki='Interlagos Circuit', tumftm='SaoPaulo', osm_relation=6781071, dem='srtm30m', fia_year=2025,
         fia_map='2025_sao_paulo_grand_prix_-_event_notes_-_circuit_map_pit_lane_drawing_emergency_exits_map_quarantine_zone_and_red_zones_map.pdf',
         fia_notes='2025_sao_paulo_grand_prix_-_race_directors_event_notes_.pdf'),
    dict(id='las_vegas', round=21, gp='Las Vegas Grand Prix', weekend='2026-11-19/2026-11-21', race_date='2026-11-21', sprint=False,
         wiki='Las Vegas Strip Circuit', tumftm=None, osm_relation=16696508, dem='srtm30m', fia_year=2025,
         fia_map='2025_las_vegas_grand_prix_-_event_notes_-_circuit_map_v2_pit_lane_drawing_emergency_map_exits_quarantine_zone_and_red_zones.pdf',
         fia_notes='2025_las_vegas_grand_prix_-_race_directors_event_notes_v2.pdf'),
    dict(id='lusail', round=22, gp='Qatar Grand Prix', weekend='2026-11-27/2026-11-29', race_date='2026-11-29', sprint=False,
         wiki='Lusail International Circuit', tumftm=None, osm_relation=21297662, dem='srtm30m', fia_year=2025,
         fia_map='2025_qatar_grand_prix_-_event_notes_-_circuit_map._pit_lane_drawing_emergency_exits_map_ers_battery_containment_area_red_zones_map.pdf',
         fia_notes='2025_qatar_grand_prix_-_race_directors_event_notes_v3.pdf'),
    dict(id='yas_marina', round=23, gp='Abu Dhabi Grand Prix', weekend='2026-12-04/2026-12-06', race_date='2026-12-06', sprint=False,
         wiki='Yas Marina Circuit', tumftm='YasMarina', osm_relation=11378665, dem='srtm30m', fia_year=2025,
         fia_map='2025_abu_dhabi_grand_prix_-_event_notes_-_circuit_map_pit_lane_drawing_emergency_exits_map_quarantine_zone_and_red_zones.pdf',
         fia_notes='2025_abu_dhabi_grand_prix_-_race_directors_event_notes_v2.pdf'),
]

# Races on the original 2026 calendar that will not be held at their usual venue.
REMOVED = [
    dict(gp='Bahrain Grand Prix', circuit='Bahrain International Circuit (Sakhir)', original_date='2026-04-12',
         status='Moved to Sepang International Circuit, Malaysia, 2-4 October 2026', tumftm='Sakhir'),
    dict(gp='Saudi Arabian Grand Prix', circuit='Jeddah Corniche Circuit', original_date='2026-04-19',
         status='Cancelled, not replaced', tumftm=None),
]

BY_ID = {c['id']: c for c in CIRCUITS}
