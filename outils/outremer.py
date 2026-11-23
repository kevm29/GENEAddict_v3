# Ajoute les départements d'outre-mer à la carte, chacun dans un encart placé en mer
# à gauche de la métropole. Tracés : IGN Admin Express (Licence ouverte), via
# github.com/gregoiredavid/france-geojson.
import json, math, sys
from shapely.geometry import shape, Polygon, MultiPolygon
from shapely.ops import polylabel, unary_union
from shapely import affinity

src, dossier = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()
entete = s[:s.index('window.GA_CARTE')]
if 'Admin Express' not in entete:
    entete = entete.replace(' */', ' *\n * Départements d\'outre-mer : IGN Admin Express (Licence ouverte Etalab),\n * via https://github.com/gregoiredavid/france-geojson — projetés dans des encarts. */', 1)
data = json.loads(s[s.index('{'):s.rindex('}') + 1])
data['departements'] = [d for d in data['departements'] if len(d['code']) == 2]

ENCARTS = [  # code, nom, fichier, x, y, w, h
    ('971', 'Guadeloupe', '971-guadeloupe', 4, 280, 100, 70),
    ('972', 'Martinique', '972-martinique', 4, 356, 100, 70),
    ('973', 'Guyane', '973-guyane', 4, 432, 100, 70),
    ('974', 'La Réunion', '974-la-reunion', 4, 508, 100, 72),
    ('976', 'Mayotte', '976-mayotte', 110, 512, 100, 70),
]
PAD = 7
encarts = []
for code, nom, fichier, x, y, w, h in ENCARTS:
    gj = json.load(open(f'{dossier}/{fichier}.geojson'))
    geo = unary_union([shape(f['geometry']) for f in gj['features']]) if 'features' in gj else shape(gj['geometry'])
    lat0 = geo.centroid.y
    geo = affinity.scale(geo, xfact=math.cos(math.radians(lat0)), yfact=-1, origin=(0, 0))
    minx, miny, maxx, maxy = geo.bounds
    k = min((w - 2 * PAD) / (maxx - minx), (h - 2 * PAD) / (maxy - miny))
    geo = affinity.scale(geo, xfact=k, yfact=k, origin=(minx, miny))
    geo = affinity.translate(geo, xoff=x + (w - (maxx - minx) * k) / 2 - minx, yoff=y + (h - (maxy - miny) * k) / 2 - miny)
    geo = geo.simplify(0.25, preserve_topology=True)
    polys = list(geo.geoms) if isinstance(geo, MultiPolygon) else [geo]
    polys = [p for p in polys if p.area > 0.6]
    chemin = ''
    for p in polys:
        pts = list(p.exterior.coords)[:-1]
        chemin += 'M' + ' L'.join(f'{a:.1f},{b:.1f}' for a, b in pts) + 'Z'
    grand = max(polys, key=lambda p: p.area)
    c = polylabel(grand, tolerance=0.2)
    r = grand.exterior.distance(c)
    data['departements'].append({'code': code, 'nom': nom, 'path': chemin, 'lx': round(c.x, 1), 'ly': round(c.y, 1), 'r': round(r, 1)})
    encarts.append({'code': code, 'x': x, 'y': y, 'w': w, 'h': h})
    print(code, len(polys), 'polygones', len(chemin), 'car.', 'r=', round(r, 1))
data['encarts'] = encarts
open(src, 'w', encoding='utf-8').write(entete + 'window.GA_CARTE = ' + json.dumps(data, ensure_ascii=False) + ';\n')
