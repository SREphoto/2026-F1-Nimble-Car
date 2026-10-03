"""
Hand-entered facts that the scripts cannot pull from a structured source.

Every corner name and landmark listed here is checked by build_research_pack.py against the text of the
circuit's English Wikipedia article. Names that do not appear in the article are dropped from the output and
reported, so nothing here reaches the data files without a written source.

corners: list of (turn label as used on the FIA map, name). A label like '3-4' covers several turns.
landmarks: notable things a track builder would want to place (buildings, bridges, towers, signs).
direction_stated: race direction where a source says it in words (used to cross-check the computed direction).
"""

CURATED = {
    'albert_park': dict(
        corners=[('9-10', 'Clark Chicane')],
        landmarks=['Albert Park Lake'],
        direction_stated=None),
    'shanghai': dict(
        corners=[],
        landmarks=['grandstand'],
        direction_stated=None),
    'suzuka': dict(
        corners=[('1-2', 'First Curve'), ('3-7', 'S Curves'), ('7', 'Dunlop'), ('8-9', 'Degner'), ('11', 'Hairpin'),
                 ('13-14', 'Spoon'), ('15', '130R'), ('16-17', 'Casio Triangle')],
        landmarks=['Ferris wheel', 'figure-eight', 'Suzuka Circuit Motopia'],
        direction_stated='figure-eight layout: the track crosses itself on a bridge'),
    'miami': dict(corners=[], landmarks=['Hard Rock Stadium', 'marina'], direction_stated=None),
    'montreal': dict(
        corners=[('8-9', "L'Epingle"), ('10', 'Hairpin'), ('13-14', 'Wall of Champions')],
        landmarks=['Wall of Champions', 'Olympic Basin', 'Île Notre-Dame', 'Casino de Montréal'],
        direction_stated=None),
    'monaco': dict(
        corners=[('1', 'Sainte Dévote'), ('2', 'Beau Rivage'), ('3', 'Massenet'), ('4', 'Casino'), ('5', 'Mirabeau'),
                 ('6', 'Fairmont Hairpin'), ('7-8', 'Portier'), ('10-11', 'Nouvelle Chicane'), ('12', 'Tabac'),
                 ('13-16', 'Swimming Pool'), ('17', 'La Rascasse'), ('18-19', 'Anthony Noghès')],
        landmarks=['tunnel', 'Fairmont', 'Casino', 'Hôtel de Paris', 'harbour', 'Port Hercule'],
        direction_stated=None),
    'barcelona': dict(
        corners=[('1', 'Elf'), ('3', 'Renault'), ('4', 'Repsol'), ('5', 'Seat'), ('9', 'Campsa'), ('10', 'La Caixa'),
                 ('12', 'Banc Sabadell')],
        landmarks=[], direction_stated=None),
    'red_bull_ring': dict(
        corners=[('1', 'Niki Lauda'), ('3', 'Remus'), ('4', 'Schlossgold'), ('9', 'Jochen Rindt'), ('10', 'Red Bull Mobile')],
        landmarks=[], direction_stated=None),
    'silverstone': dict(
        corners=[('1', 'Abbey'), ('2', 'Farm'), ('3', 'Village'), ('4', 'The Loop'), ('5', 'Aintree'),
                 ('6', 'Brooklands'), ('7', 'Luffield'), ('8', 'Woodcote'), ('9', 'Copse'), ('10-11', 'Maggotts'),
                 ('12-13', 'Becketts'), ('14', 'Chapel'), ('15', 'Stowe'), ('16', 'Vale'), ('17-18', 'Club')],
        landmarks=['Silverstone Wing', 'Hangar Straight', 'Wellington Straight', 'Hamilton Straight'],
        direction_stated=None),
    'spa': dict(
        corners=[('1', 'La Source'), ('2-4', 'Eau Rouge'), ('3-4', 'Raidillon'), ('5-7', 'Les Combes'), ('8', 'Bruxelles'),
                 ('9', 'Speakers Corner'), ('10-11', 'Pouhon'), ('12-13', 'Fagnes'), ('14', 'Stavelot'),
                 ('15-17', 'Blanchimont'), ('18-19', 'Bus Stop')],
        landmarks=['Kemmel Straight', 'Raidillon', 'Francorchamps', 'Stavelot', 'Malmedy'],
        direction_stated=None),
    'hungaroring': dict(corners=[], landmarks=[], direction_stated=None),
    'zandvoort': dict(
        corners=[('1', 'Tarzan'), ('2', 'Gerlach'), ('3', 'Hugenholtz'), ('4-5', 'Hunserug'), ('6-7', 'Slotemaker'),
                 ('7', 'Scheivlak'), ('8', 'Mastersbocht'), ('11-12', 'Hans Ernst'), ('13', 'Kumho'), ('14', 'Arie Luyendyk')],
        landmarks=['dunes', 'banking', 'banked'], direction_stated=None),
    'monza': dict(
        corners=[('1-2', 'Variante del Rettifilo'), ('3', 'Curva Biassono'), ('4-5', 'Variante della Roggia'),
                 ('6', 'Lesmo'), ('8-10', 'Variante Ascari'), ('11', 'Parabolica'), ('11', 'Curva Alboreto')],
        landmarks=['banking', 'oval', 'Royal Villa', 'Parco di Monza', 'Monza Park'],
        direction_stated=None),
    'madring': dict(corners=[('12', 'La Monumental')], landmarks=['IFEMA', 'Valdebebas'], direction_stated=None),
    'baku': dict(corners=[], landmarks=['Maiden Tower', 'Old City', 'Azadliq Square', 'Government House', 'Flame Towers', 'Caspian'],
                 direction_stated='anti-clockwise'),
    'sepang': dict(corners=[], landmarks=['grandstand', 'Kuala Lumpur International Airport'], direction_stated='clockwise'),
    'marina_bay': dict(
        corners=[('10', 'Singapore Sling')],
        landmarks=['Marina Bay Sands', 'Singapore Flyer', 'Anderson Bridge', 'Esplanade', 'Padang', 'Raffles', 'float@Marina Bay',
                   'Fullerton'],
        direction_stated=None),
    'cota': dict(corners=[], landmarks=['observation tower', 'Germania Insurance Amphitheater', 'Austin'],
                 direction_stated='counter-clockwise'),
    'mexico_city': dict(corners=[('17', 'Peraltada')], landmarks=['Foro Sol', 'stadium', 'baseball'], direction_stated=None),
    'interlagos': dict(
        corners=[('1-2', 'S do Senna'), ('3', 'Curva do Sol'), ('4', 'Descida do Lago'), ('6-7', 'Ferradura'),
                 ('8', 'Laranjinha'), ('10', 'Bico de Pato'), ('11', 'Mergulho'), ('12', 'Junção'), ('13', 'Subida dos Boxes'),
                 ('14-15', 'Arquibancadas')],
        landmarks=['Reta Oposta'], direction_stated='counterclockwise'),
    'las_vegas': dict(corners=[], landmarks=['Sphere', 'Las Vegas Strip', 'Bellagio', 'Caesars Palace', 'Koval Lane', 'Harmon Avenue'],
                      direction_stated='counterclockwise'),
    'lusail': dict(corners=[], landmarks=['floodlights', 'floodlit'], direction_stated=None),
    'yas_marina': dict(corners=[], landmarks=['W Abu Dhabi', 'Yas Hotel', 'Ferrari World', 'marina', 'tunnel'], direction_stated=None),
}
