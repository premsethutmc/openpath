"""geometry-coordinate part 10: choice families of the plane-geometry part; a class is derived from the statement/figure and
compared with the keyed letter only where the data show one fixed letter per class (option texts are not exported)."""
from kit import ref, Expect, Verdict, Unsupported, Ambiguous, sp, Fraction
from refs.geometry_coordinate_util import *
import re, math, itertools

CLS = {}


def cls(fam):
    def deco(fn):
        CLS[fam] = fn
        return fn
    return deco


COMP = ['North', 'North-East', 'East', 'South-East', 'South', 'South-West', 'West', 'North-West']
FRACS = {'one eighth of a full turn': Fraction(1, 8), 'a quarter turn': Fraction(1, 4), 'three eighths of a full turn': Fraction(3, 8), 'a half turn': Fraction(1, 2),
         'five eighths of a full turn': Fraction(5, 8), 'a three-quarter turn': Fraction(3, 4), 'seven eighths of a full turn': Fraction(7, 8)}


@cls('afface')
def c_afface(q):
    m = re.search(r'is facing ([\w-]+) and makes (.+?) (clockwise|anticlockwise)', q['prompt'])
    k = COMP.index(m.group(1))
    turn = FRACS[m.group(2)] * 8
    assert turn.denominator == 1
    k2 = (k + int(turn) * (1 if m.group(3) == 'clockwise' else -1)) % 8
    return COMP[k2]


def direction_of(dx, dy):
    if (dx, dy) == (0, 0):
        return None
    if dx == 0:
        return 'North' if dy > 0 else 'South'
    if dy == 0:
        return 'East' if dx > 0 else 'West'
    return ('North' if dy > 0 else 'South') + '-' + ('East' if dx > 0 else 'West')


@cls('abdir')
def c_abdir(q):
    p = q['prompt']
    pts = {n: (a, b) for a, b, n in q['figure']['points']}
    m = re.search(r'Which place is to the (\w+) of the ([\w ]+)\?', p)
    if m:
        d, ref_ = m.group(1), m.group(2)
        x0, y0 = pts[ref_]
        hits = [n for n, (a, b) in pts.items() if n != ref_ and direction_of(a - x0, b - y0) == d]
        if len(hits) != 1:
            return Ambiguous(f'{len(hits)} places to the {d}')
        names = list(pts)
        return 'place#' + str(names.index(hits[0]))
    m = re.search(r'In which direction is the ([\w ]+) from the ([\w ]+)\?', p)
    if m:
        a, b = pts[m.group(1)], pts[m.group(2)]
        return direction_of(a[0] - b[0], a[1] - b[1])
    return Unsupported('unknown abdir')


def ang_pos(fig):
    pos = {}
    for r in fig['rows']:
        r = [r[0], r[1], r[2]]
        line = 'l' if 'line l' in r[0] else 'm'
        ab = 'above' if 'above' in r[0] else 'below'
        pos[r[1]] = (line, ab, 'left')
        pos[r[2]] = (line, ab, 'right')
    return pos


def relation(pos, i, j):
    (l1, v1, s1), (l2, v2, s2) = pos[i], pos[j]
    if l1 == l2:
        if v1 != v2 and s1 != s2:
            return 'vertically opposite'
        return 'linear pair'
    interior1 = (l1 == 'l' and v1 == 'below') or (l1 == 'm' and v1 == 'above')
    interior2 = (l2 == 'l' and v2 == 'below') or (l2 == 'm' and v2 == 'above')
    if v1 == v2 and s1 == s2:
        return 'corresponding'
    if interior1 and interior2:
        return 'alternate interior' if s1 != s2 else 'co-interior'
    if (not interior1) and (not interior2):
        return 'alternate exterior' if s1 != s2 else 'co-exterior'
    return 'other'


@cls('ahname')
def c_ahname(q):
    p = q['prompt']
    pos = ang_pos(q['figure'])
    m = re.search(r'What kind of pair are angles (\w) and (\w)', p)
    if m:
        return relation(pos, m.group(1), m.group(2))
    m = re.search(r'Which angle is the ([\w ]+?) angle to angle (\w)\?', p)
    if m:
        want, a = m.group(1), m.group(2)
        hits = [j for j in pos if j != a and relation(pos, a, j) == want]
        if len(hits) != 1:
            return Ambiguous(f'{len(hits)} angles are the {want} angle')
        return 'angle#' + hits[0]
    return Unsupported('unknown ahname')


def qkind(q):
    rows = {r[0]: r[1] for r in q['figure']['rows']}
    sides = [int(v) for v in re.findall(r'= (\d+) cm', rows['Sides'])]
    par = rows['Parallel sides']
    ang = rows['Angles']
    twopar = 'AB ∥ DC and AD ∥ BC' in par
    onepar = 'only' in par
    s = sides
    angs = {}
    if 'All four angles are' in ang:
        angs = {k: int(re.search(r'are (\d+)°', ang).group(1)) for k in 'ABCD'}
    elif '∠A = ∠B = ∠C = ∠D' in ang:
        angs = {k: 90 for k in 'ABCD'}   # four equal angles of a quadrilateral sum to 360
    else:
        for a, v in re.findall(r'∠([ABCD]) = (\d+)°', ang):
            angs[a] = int(v)
        m = re.search(r'∠A = ∠C = (\d+)°, ∠B = ∠D = (\d+)°', ang)
        if m:
            angs = {'A': int(m.group(1)), 'C': int(m.group(1)), 'B': int(m.group(2)), 'D': int(m.group(2))}
    right = any(v == 90 for v in angs.values())
    if twopar:
        if not (s[0] == s[2] and s[1] == s[3]):
            return Verdict(False, 'parallelogram with unequal opposite sides')
        allq = len(set(s)) == 1
        if allq:
            return 'square' if right else 'rhombus'
        return 'rectangle' if right else 'parallelogram'
    if onepar:
        return 'trapezium'
    kite = (s[0] == s[1] and s[2] == s[3]) or (s[0] == s[3] and s[1] == s[2])
    return 'kite' if kite else 'none'


@cls('afkind')
def c_afkind(q):
    return qkind(q)


@cls('aiconvex')
def c_aiconvex(q):
    p = U(q['prompt'])
    if 'joined in order' in p:
        P = [c for _, c in points(p)][:4]
        def cr(o, a, b):
            return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
        def segx(p1, p2, p3, p4):
            d1, d2, d3, d4 = cr(p3, p4, p1), cr(p3, p4, p2), cr(p1, p2, p3), cr(p1, p2, p4)
            return d1 * d2 < 0 and d3 * d4 < 0
        if segx(P[0], P[1], P[2], P[3]) or segx(P[1], P[2], P[3], P[0]):
            return 'not-a-quadrilateral'
        signs = [cr(P[i], P[(i + 1) % 4], P[(i + 2) % 4]) for i in range(4)]
        if any(s == 0 for s in signs):
            return Ambiguous('three collinear vertices')
        return 'convex' if all(s > 0 for s in signs) or all(s < 0 for s in signs) else 'concave'
    a = [int(v) for v in re.findall(r'∠[ABCD] = (\d+)°', p)]
    if sum(a) != 360:
        return 'not-a-quadrilateral'
    return 'convex' if max(a) < 180 else 'concave'


@cls('aeangk')
def c_aeangk(q):
    p = q['prompt']
    m = re.search(r'An angle measures (\d+)°', p)
    if m:
        v = int(m.group(1))
    else:
        return Unsupported('figure sector unit unknown (circle sector value not documented)')
    return 'acute' if v < 90 else ('right' if v == 90 else ('obtuse' if v < 180 else ('straight' if v == 180 else ('reflex' if v < 360 else 'full'))))


@cls('alcyc')
def c_alcyc(q):
    p = q['prompt']
    v = [int(x) for x in re.findall(r'∠[A-Z]+ = (\d+)°', p)]
    if 'opposite sides' in p:
        return 'cyclic' if v[0] + v[1] == 180 else 'not cyclic'
    if 'same side' in p:
        return 'cyclic' if v[0] == v[1] else 'not cyclic'
    A, B, C, D = v
    if A + B + C + D != 360:
        return Ambiguous('angles do not sum to 360')
    return 'cyclic' if (A + C == 180 and B + D == 180) else 'not cyclic'


@cls('alnear')
def c_alnear(q):
    p = q['prompt']
    r = Fraction(re.search(r'radius (\d+) cm', p).group(1))
    if 'is 1 cm from O' in p or 'cm from O and the chord' in p:
        d1, d2 = [Fraction(v) for v in re.findall(r'(\d+(?:\.\d+)?) cm from O', p)[:2]]
        # longer chord is nearer the centre: chord length^2 = 4(r^2-d^2)
        l1, l2 = 4 * (r * r - d1 * d1), 4 * (r * r - d2 * d2)
    else:
        a, b = [Fraction(v) for v in re.findall(r'is (\d+(?:\.\d+)?) cm long', p)[:2]]
        l1, l2 = a * a, b * b
        d1, d2 = r * r - l1 / 4, r * r - l2 / 4   # squared distances
    if l1 > l2:
        return 'AB longer'
    if l1 < l2:
        return 'CD longer'
    return 'equal'


@cls('amline')
def c_amline(q):
    p = q['prompt']
    n = Fraction(re.search(r'(?:radius|diameter) (\d+(?:\.\d+)?) cm', p).group(1))
    r = n if 'radius' in p else n / 2
    d = Fraction(re.search(r'line is (\d+(?:\.\d+)?) cm from', p).group(1))
    # number of common points of the line y=d with x^2+y^2=r^2
    disc = r * r - d * d
    return 'two points (secant)' if disc > 0 else ('tangent' if disc == 0 else 'no common point')


@cls('ahconv')
def c_ahconv(q):
    s = sorted(Fraction(v) for v in re.findall(r'(\d+(?:\.\d+)?) cm', q['prompt'])[:3])
    return 'right' if s[0] ** 2 + s[1] ** 2 == s[2] ** 2 else 'not right'


@cls('ambptc')
def c_ambptc(q):
    p = q['prompt']
    L = {k: Fraction(v) for k, v in re.findall(r'(AD|DB|AE|EC|BD|DC|AB|AC) = (\d+(?:\.\d+)?) cm', p)}
    if 'D is on AB and E is on AC' in p:
        return 'DE || BC' if L['AD'] * L['EC'] == L['DB'] * L['AE'] else 'DE not || BC'
    return 'AD bisects A' if L['BD'] * L['AC'] == L['DC'] * L['AB'] else 'AD does not bisect A'


@cls('ammen')
def c_ammen(q):
    p = q['prompt']
    r = [(Fraction(a), Fraction(b)) for a, b in re.findall(r'(\d+) : (\d+)', p)[:3]]
    prod = (r[0][0] / r[0][1]) * (r[1][0] / r[1][1]) * (r[2][0] / r[2][1])
    if 'extended' in p:
        return 'D,E,F collinear' if prod == 1 else 'not collinear'
    return 'AD,BE,CF concurrent' if prod == 1 else 'not concurrent'


@cls('amsimc')
def c_amsimc(q):
    p = q['prompt'].split('): ')[1]
    ang = [x for x in re.findall(r'∠([A-Z]) = ∠([A-Z]) = (\d+)°', p)]
    pairs = re.findall(r'([A-Z]{2}) = (\d+) cm, ([A-Z]{2}) = (\d+) cm', p)
    ratios = [Fraction(int(b), int(d)) for a, b, c, d in pairs]
    if len(ang) == 2 and not pairs:
        return 'similar (AA)'
    if len(pairs) == 3:
        return 'similar (SSS)' if len(set(ratios)) == 1 else 'not similar'
    if len(pairs) == 2 and len(ang) == 1:
        a_name = ang[0][0]
        s1, s2 = pairs[0][0], pairs[1][0]
        included = a_name in s1 and a_name in s2
        if len(set(ratios)) == 1 and included:
            return 'similar (SAS)'
        if len(set(ratios)) == 1 and not included:
            return 'cannot decide (SSA)'
        return 'not similar' if included else 'cannot decide (SSA)'
    return Unsupported('unknown amsimc template')


@cls('afcube')
def c_afcube(q):
    p = q['prompt']
    rows = q['figure']['rows']
    cells = {(r, c): v for r, row in enumerate(rows) for c, v in enumerate(row) if v}
    # fold simulation: roll a cube over the net starting at a root face; each face gets the cube-face id it lands on
    root = next(iter(cells))
    # cube orientation as (top, bottom, north, south, east, west) of the face-ids {U,D,N,S,E,W}
    start = dict(top='U', bottom='D', north='N', south='S', east='E', west='W')
    def roll(o, d):
        t, b, n, s, e, w = o['top'], o['bottom'], o['north'], o['south'], o['east'], o['west']
        if d == 'E':
            return dict(top=w, bottom=e, north=n, south=s, east=t, west=b)
        if d == 'W':
            return dict(top=e, bottom=w, north=n, south=s, east=b, west=t)
        if d == 'N':
            return dict(top=s, bottom=n, north=t, south=b, east=e, west=w)
        return dict(top=n, bottom=s, north=b, south=t, east=e, west=w)
    seen = {root: start}
    stack = [root]
    while stack:
        r, c = stack.pop()
        o = seen[(r, c)]
        for d, (dr, dc) in (('E', (0, 1)), ('W', (0, -1)), ('N', (-1, 0)), ('S', (1, 0))):
            nb = (r + dr, c + dc)
            if nb in cells and nb not in seen:
                seen[nb] = roll(o, d)
                stack.append(nb)
    faces = {pos: o['bottom'] for pos, o in seen.items()}
    ok = len(cells) == 6 and len(set(faces.values())) == 6 and len(seen) == 6
    if 'Can it be folded' in p:
        return 'foldable' if ok else 'not foldable'
    if not ok:
        return Verdict(False, 'the lettered net does not fold into a cube')
    want = re.search(r'opposite face (\w)', p).group(1)
    pos_of = {v: k for k, v in cells.items()}
    f = faces[pos_of[want]]
    opp = {'U': 'D', 'D': 'U', 'N': 'S', 'S': 'N', 'E': 'W', 'W': 'E'}[f]
    other = [v for pos, v in cells.items() if faces[pos] == opp]
    return 'opposite=' + other[0]


@cls('ahconv')
def c_ahconv2(q):
    return c_ahconv(q)


@cls('aawhere')
def c_aawhere(q):
    p = q['prompt']
    fig = q['figure']
    if fig.get('type') == 'plane' and 'fence' in p:
        pts = fig['points']
        seg = fig['segments']
        xs = [s[0][0] for s in seg] + [s[1][0] for s in seg]
        ys = [s[0][1] for s in seg] + [s[1][1] for s in seg]
        x0, x1, y0, y1 = min(xs), max(xs), min(ys), max(ys)
        inside = [i for i, (a, b, n) in enumerate(pts) if x0 < a < x1 and y0 < b < y1]
        outside = [i for i in range(len(pts)) if i not in inside]
        want = inside if 'inside' in p else outside
        if len(want) != 1:
            return Ambiguous(f'{len(want)} animals {("inside" if "inside" in p else "outside")} the fence')
        return 'idx#' + str(want[0])
    if fig.get('type') == 'plane' and 'house' in p:
        pts = fig['points']
        h = [pt for pt in pts if pt[2] == 'house'][0]
        others = [(abs(pt[0] - h[0]), i) for i, pt in enumerate(pts) if pt[2] != 'house']
        ds = sorted(others)
        if 'nearest' in p:
            if len(ds) > 1 and ds[0][0] == ds[1][0]:
                return Ambiguous('tie for nearest')
            return 'idx#' + str(ds[0][1])
        if len(ds) > 1 and ds[-1][0] == ds[-2][0]:
            return Ambiguous('tie for farthest')
        return 'idx#' + str(ds[-1][1])
    if fig.get('type') == 'table':
        row = fig['rows'][0][1:]
        m = re.search(r'Who stands just (in front of|behind) (\w+)\?', p)
        i = row.index(m.group(2))
        j = i - 1 if m.group(1) == 'in front of' else i + 1
        if not 0 <= j < len(row):
            return Ambiguous('no child there')
        return 'child#' + row[j]
    return Unsupported('unknown aawhere')


WHY = {k: 'choice letters not related to the statement without option texts' for k in CLS}

CHOICE_MAPS.update({
    'alcyc': {'cyclic': 'A', 'not cyclic': 'B'},
    'alnear': {'AB longer': 'A', 'CD longer': 'B', 'equal': 'C'},
})
MAP_NOTE = ('letter order inferred from the data (one class -> one letter, distinct letters, over every released question); '
            'option texts are not exported, so the mapping itself is not independently verified')


def _safe(fn):
    def g(q):
        try:
            return fn(q)
        except Exception as e:  # noqa: BLE001
            return Unsupported(f'statement variant not parsed ({type(e).__name__})')
    return g


for _f, _fn in CLS.items():
    ref(_f, method=('class derived from the statement/figure independently (coordinates, definitions, brute force) and compared with the keyed letter through the inferred letter map; ' + MAP_NOTE) if _f in CHOICE_MAPS
        else 'class derived from the statement/figure independently; option texts are not exported and the keyed letter is shuffled per question, so the key cannot be compared',
        assumptions=(MAP_NOTE if _f in CHOICE_MAPS else 'option texts not exported'))(choice_ref_fn(_f, _safe(_fn), WHY.get(_f, '')))
