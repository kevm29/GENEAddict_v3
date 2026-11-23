# Calcule, pour chaque département, le point le plus « intérieur » (pôle d'inaccessibilité)
# et le rayon du plus grand cercle inscrit, pour placer numéro et nom sur la carte.
import json, re, sys
from svgpathtools import parse_path
from shapely.geometry import Polygon, MultiPolygon
from shapely.ops import polylabel, unary_union

src = sys.argv[1]
s = open(src, encoding='utf-8').read()
entete = s[:s.index('window.GA_CARTE')]
data = json.loads(s[s.index('{'):s.rindex('}') + 1])
for d in data['departements']:
    p = parse_path(d['path'])
    polys = []
    for sub in p.continuous_subpaths():
        pts = []
        for seg in sub:
            for t in (0, .25, .5, .75):
                z = seg.point(t); pts.append((z.real, z.imag))
        if len(pts) >= 3:
            pg = Polygon(pts).buffer(0)
            if pg.area > 0: polys.append(pg)
    geo = unary_union(polys)
    if isinstance(geo, MultiPolygon):
        geo = max(geo.geoms, key=lambda g: g.area)
    c = polylabel(geo, tolerance=0.3)
    r = geo.exterior.distance(c)
    for hole in geo.interiors:
        r = min(r, hole.distance(c))
    d['lx'], d['ly'], d['r'] = round(c.x, 1), round(c.y, 1), round(r, 1)
    print(d['code'], d['lx'], d['ly'], d['r'], file=sys.stderr) if d['code'] in ('75', '92', '29', '33', '2A') else None
open(src, 'w', encoding='utf-8').write(entete + 'window.GA_CARTE = ' + json.dumps(data, ensure_ascii=False) + ';\n')
rs = sorted(x['r'] for x in data['departements'])
print('rayons min/médian/max', rs[0], rs[len(rs)//2], rs[-1])
