"""geometry-coordinate part 11: integer/exact families of the plane-geometry part (solids, rotations, turns, views, circle and
triangle angle facts by coordinate construction and measurement)."""
from kit import ref, Expect, Verdict, Unsupported, Ambiguous, sp, Fraction
from refs.geometry_coordinate_util import *
import re, math, itertools

NUM = r'(\d+(?:\.\d+)?)'


def U(s):
    return s.replace('−', '-').replace('×', '*')


# ---------------- afpaint: brute force over unit cubes
@ref('afpaint', method='enumerate every unit cube of the a x b x c block and count its faces on the outer surface')
def afpaint(q):
    p = q['prompt']
    a, b, c = [int(v) for v in re.search(r'A (\d+) × (\d+) × (\d+) block', p).groups()]
    cnt = {}
    for i, j, k in itertools.product(range(a), range(b), range(c)):
        n = (i == 0) + (i == a - 1) + (j == 0) + (j == b - 1) + (k == 0) + (k == c - 1)
        # a dimension of size 1 has both faces of the cube painted
        n = sum(1 for d, (v, m) in enumerate(((i, a), (j, b), (k, c))) for side in (0, 1) if (side == 0 and v == 0) or (side == 1 and v == m - 1))
        cnt[n] = cnt.get(n, 0) + 1
    if 'no paint' in p:
        want = 0
    else:
        w = re.search(r'exactly (one|two|three|four) faces?', p)
        if not w:
            return Unsupported('unknown afpaint question')
        want = {'one': 1, 'two': 2, 'three': 3, 'four': 4}[w.group(1)]
    return Expect(str(cnt.get(want, 0)))


# ---------------- afpside
def lin(s):
    return sp.sympify(U(s).replace('x', '*x').replace('**', '*') if False else re.sub(r'(\d)x', r'\1*x', U(s)), locals={'x': sp.Symbol('x')})


@ref('afpside', method='parallelogram/rhombus side relations solved with SymPy (opposite sides equal; rhombus all sides equal) and perimeter by summing the four sides')
def afpside(q):
    p = q['prompt']
    x = sp.Symbol('x')
    m = re.search(r'The perimeter of parallelogram ABCD is ' + NUM + r' cm and AB = ' + NUM + r' cm', p)
    if m:
        P, ab = Fraction(m.group(1)), Fraction(m.group(2))
        bc = (P - 2 * ab) / 2
        return Expect(str(bc)) if bc > 0 else Verdict(False, 'non-positive side')
    m = re.search(r'The perimeter of rhombus \w+ is ' + NUM + r' cm', p)
    if m:
        return Expect(str(Fraction(m.group(1)) / 4))
    m = re.search(r'In (rhombus|parallelogram) ABCD, AB = \((.+?)\) cm and (BC|CD) = \((.+?)\) cm\. What is the (perimeter of the rhombus|length of AB)', p)
    if m:
        kind, e1, other, e2, what = m.groups()
        sol = sp.solve(sp.Eq(lin(e1), lin(e2)), x)
        if len(sol) != 1:
            return Unsupported('no unique x')
        xv = sol[0]
        ab, o = lin(e1).subs(x, xv), lin(e2).subs(x, xv)
        if ab <= 0 or o <= 0:
            return Verdict(False, f'non-positive side lengths {ab},{o}')
        if what == 'length of AB':
            return Expect(str(ab))
        return Expect(str(4 * ab))
    return Unsupported('unknown afpside template')


# ---------------- afquad / aftri / aftris tables
def nums(s):
    return [Fraction(v) for v in re.findall(r'(\d+(?:\.\d+)?)', s)]


@ref('afquad', method='read the side/angle lists of each quadrilateral; rectangle = four right angles, rhombus = four equal sides, parallelogram = both pairs of opposite sides equal and opposite angles equal (squares count as all three)')
def afquad(q):
    rows = q['figure']['rows']
    want = re.search(r'How many of the five are (\w+)\?', q['prompt']).group(1)
    n = 0
    for r in rows:
        s, a = nums(r[1]), nums(r[2])
        if len(s) != 4 or len(a) != 4 or sum(a) != 360:
            return Ambiguous('inconsistent quadrilateral row ' + r[0])
        rect = all(v == 90 for v in a) and s[0] == s[2] and s[1] == s[3]
        rhomb = len(set(s)) == 1 and a[0] == a[2] and a[1] == a[3]
        par = s[0] == s[2] and s[1] == s[3] and a[0] == a[2] and a[1] == a[3]
        n += {'rectangles': rect, 'rhombuses': rhomb, 'parallelograms': par}[want]
    return Expect(str(n))


@ref('aftri', method='classify each angle triple (all <90 acute; one =90 right; one >90 obtuse) and count; angle sums checked = 180')
def aftri(q):
    p = q['prompt']
    cnt = 0
    for r in q['figure']['rows']:
        a = nums(r[1])
        if sum(a) != 180:
            return Ambiguous('angles of ' + r[0] + ' do not sum to 180')
        if 'acute-angled' in p:
            cnt += max(a) < 90
        elif 'right-angled' in p:
            cnt += max(a) == 90
        elif 'obtuse-angled' in p:
            cnt += max(a) > 90
        else:
            return Unsupported('unknown aftri question')
    return Expect(str(cnt))


@ref('aftris', method='classify each side triple by counting equal sides (after checking the triangle inequality) and count')
def aftris(q):
    p = q['prompt']
    cnt = 0
    for r in q['figure']['rows']:
        s = sorted(nums(r[1]))
        if s[0] + s[1] <= s[2]:
            return Ambiguous('sides of ' + r[0] + ' violate the triangle inequality')
        k = len(set(s))
        if 'scalene' in p:
            cnt += k == 3
        elif 'equilateral' in p:
            cnt += k == 1
        elif 'exactly two equal' in p:
            cnt += k == 2
        else:
            return Unsupported('unknown aftris question')
    return Expect(str(cnt))


# ---------------- afrot
POLY = {'triangle': 3, 'square': 4, 'pentagon': 5, 'hexagon': 6, 'heptagon': 7, 'octagon': 8, 'nonagon': 9, 'decagon': 10, 'dodecagon': 12}
ORD = {}


GLYPHS = {   # block sans-serif capitals on a 5 x 7 pixel grid
    'H': ['#...#', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
    'N': ['#...#', '##..#', '#.#.#', '#.#.#', '#.#.#', '#..##', '#...#'],
    'S': ['.####', '#....', '#....', '.###.', '....#', '....#', '####.'],
    'Z': ['#####', '....#', '...#.', '..#..', '.#...', '#....', '#####'],
}


def glyph_order(g):
    px = {(c, r) for r, row in enumerate(g) for c, ch in enumerate(row) if ch == '#'}
    W, H = len(g[0]), len(g)
    order = 1
    if {(W - 1 - c, H - 1 - r) for c, r in px} == px:
        order = 2   # a 90-degree turn would need a 7 x 5 footprint, impossible for a 5 x 7 glyph
    return order


def sym_order(poly):
    n, k = len(poly), 0
    cx = sum(x for x, y in poly) / n
    cy = sum(y for x, y in poly) / n
    pts = {(round(x - cx, 9), round(y - cy, 9)) for x, y in poly}
    cnt = 0
    for d in range(1, 361):
        t = math.radians(d)
        r = {(round(x * math.cos(t) - y * math.sin(t), 9) + 0.0, round(x * math.sin(t) + y * math.cos(t), 9) + 0.0) for x, y in pts}
        if all(any(abs(a - c) < 1e-6 and abs(b - e) < 1e-6 for c, e in pts) for a, b in r):
            cnt += 1
    return cnt


@ref('afrot', method='n-fold symmetry: the shape coincides with itself after every 360/n degrees; k-th coincidence at k*360/n (cross-check: n rotations by 360/n return to 360)')
def afrot(q):
    p = q['prompt']
    m = re.search(r'with (\d+) identical', p)
    if m:
        n = int(m.group(1))
    elif 'not a square' in p:
        n = 2     # rectangle / rhombus that is not a square: only the half turn
    elif 'parallelogram with no right angles' in p:
        n = sym_order([(0, 0), (4, 0), (6, 3), (2, 3)])
    elif re.search(r'capital letter [HNSZ]', p):
        n = glyph_order(GLYPHS[re.search(r'capital letter (\w)', p).group(1)])
    else:
        m = re.search(r'\b(triangle|square|pentagon|hexagon|heptagon|octagon|nonagon|decagon|dodecagon)\b', p)
        if not m:
            return Unsupported('unknown shape in afrot')
        n = POLY[m.group(1)]
    step = Fraction(360, n)
    assert step * n == 360
    k = re.search(r'for the (\d+)(?:st|nd|rd|th) time', p)
    if k:
        return Expect(str(step * int(k.group(1))))
    if 'order of rotational symmetry' in p:
        return Expect(str(n))
    if 'smallest fraction of a full turn' in p:
        return Expect(str(Fraction(1, n)))
    if 'smallest angle' in p:
        return Expect(str(step))
    return Unsupported('unknown afrot question')


# ---------------- afturn
COMP = ['North', 'North-East', 'East', 'South-East', 'South', 'South-West', 'West', 'North-West']


@ref('afturn', method='compass directions as multiples of 45 degrees; clockwise/anticlockwise difference modulo 360 over 360')
def afturn(q):
    m = re.search(r'is facing ([\w-]+)\. \w+ turns (clockwise|anticlockwise) until facing ([\w-]+)\.', q['prompt'])
    a, cw, b = COMP.index(m.group(1)), m.group(2) == 'clockwise', COMP.index(m.group(3))
    d = ((b - a) if cw else (a - b)) % 8
    if d == 0:
        return Ambiguous('same direction: 0 or a full turn')
    return Expect(str(Fraction(d, 8)))


# ---------------- afview
@ref('afview', method='build the set of unit cubes from the height plan and count distinct squares in the top / front / right projections')
def afview(q):
    fig = q['figure']
    rows = fig['rows']          # back ... front
    cubes = set()
    for r, row in enumerate(rows):
        for c, v in enumerate(row[1:]):
            for h in range(int(v)):
                cubes.add((r, c, h))
    p = q['prompt']
    if 'top view' in p:
        proj = {(r, c) for r, c, h in cubes}
    elif 'from the front' in p:
        proj = {(c, h) for r, c, h in cubes}
    elif 'right-hand side' in p:
        proj = {(r, h) for r, c, h in cubes}
    elif 'left-hand side' in p:
        proj = {(r, h) for r, c, h in cubes}
    else:
        return Unsupported('unknown afview')
    return Expect(str(len(proj)))


# ---------------- affrac
@ref('affrac', method='geometric growth: the stage-1/stage-0 ratio from the figure table equals the rule in the statement; stage n = stage0 * ratio^n (iterated)')
def affrac(q):
    p = q['prompt']
    t = q['figure']['rows'][0]
    head = q['figure']['head']
    s0, s1 = Fraction(t[1]), Fraction(t[2])
    r = s1 / s0
    tgt = int(re.search(r'at stage (\d+)\?', p).group(1))
    m = re.search(r'replaced by (\d+) smaller|grows (\d+) new branches|split into \d+ smaller (?:triangles|squares) and the middle one is removed, leaving (\d+) shaded', p)
    if m:
        k = Fraction(next(g for g in m.groups() if g))
        if k != r:
            return Ambiguous(f'rule multiplier {k} differs from table ratio {r}')
    v = s0
    for _ in range(tgt):
        v *= r
    return Expect(str(v))


# ---------------- Euler / solids
@ref('afsolid', method='Euler F+V-E=2 for the given pair; named solids: faces as polygon list, edges = sum of face sides / 2, vertices counted directly and checked with Euler')
def afsolid(q):
    return solid_ref(q)


@ref('aieuler', method='Euler F+V-E=2 solved for the missing count')
def aieuler(q):
    return solid_ref(q)


@ref('aisolid', method='faces from the polygon list of the solid or net, edges = sum of face sides / 2 (each edge shared by two faces), vertices counted directly and checked with Euler V-E+F=2')
def aisolid(q):
    return solid_ref(q)


NAMES = {'triangular': 3, 'square': 4, 'pentagonal': 5, 'hexagonal': 6, 'heptagonal': 7, 'octagonal': 8, 'nonagonal': 9, 'decagonal': 10}
NETN = {'triangle': 3, 'square': 4, 'pentagon': 5, 'hexagon': 6, 'heptagon': 7, 'octagon': 8, 'nonagon': 9, 'decagon': 10}


def solid_counts(faces_sides, verts):
    F = len(faces_sides)
    E2 = sum(faces_sides)
    if E2 % 2:
        return None
    E = E2 // 2
    if F + verts - E != 2:
        return None
    return F, E, verts


def solid_ref(q):
    p = q['prompt']
    m = re.search(r'(faces|vertices|edges) (?:and|,) (\d+) (faces|vertices|edges)', p)
    if 'Euler' in p:
        d = {}
        for v, w in re.findall(r'(\d+) (faces|vertices|edges)', p.split('Euler')[0]):
            d[w] = int(v)
        want = re.search(r'how many (faces|vertices|edges)', p).group(1)
        if len(d) != 2 or want in d:
            return Unsupported('unparsed Euler question')
        if want == 'faces':
            return Expect(str(2 - d['vertices'] + d['edges']))
        if want == 'vertices':
            return Expect(str(2 - d['faces'] + d['edges']))
        return Expect(str(d['faces'] + d['vertices'] - 2))
    want = re.search(r'how many (faces|vertices|edges|vertices \(corners\))|How many (faces|vertices|edges)', p, re.I)
    w = (want.group(1) or want.group(2)).split()[0].lower() if want else None
    if w is None:
        return Unsupported('unknown solid question')
    m = re.search(r'\ban? ([a-z]+) (prism|pyramid)', p)
    if m:
        n = NAMES[m.group(1)]
        if m.group(2) == 'prism':
            fs, V = [n, n] + [4] * n, 2 * n
        else:
            fs, V = [n] + [3] * n, n + 1
    else:
        m = re.search(r'net is made of (\d+) (\w+?)s? and (\d+) (\w+?)s\b', p)
        if not m:
            return Unsupported('unknown net')
        c1, n1, c2, n2 = int(m.group(1)), m.group(2), int(m.group(3)), m.group(4)
        s1 = NETN[n1] if n1 in NETN else None
        s2 = 4 if n2 == 'rectangle' else (3 if n2 == 'triangle' else None)
        if s1 is None or s2 is None:
            return Unsupported('unknown net faces')
        fs = [s1] * c1 + [s2] * c2
        # prism: two n-gons + n rectangles; pyramid: one n-gon + n triangles
        V = 2 * s1 if n2 == 'rectangle' else s1 + 1
    r = solid_counts(fs, V)
    if r is None:
        return Unsupported('face list inconsistent with Euler')
    return Expect(str({'faces': r[0], 'edges': r[1], 'vertices': r[2]}[w]))


# ---------------- coordinate constructions for circle / triangle angle facts
def ang(P, O, Q):
    """angle POQ in degrees from coordinates"""
    ux, uy, vx, vy = P[0] - O[0], P[1] - O[1], Q[0] - O[0], Q[1] - O[1]
    c = (ux * vx + uy * vy) / (math.hypot(ux, uy) * math.hypot(vx, vy))
    return math.degrees(math.acos(max(-1, min(1, c))))


def pol(r, t):
    return (r * math.cos(math.radians(t)), r * math.sin(math.radians(t)))


def near(v):
    r = round(v)
    return r if abs(v - r) < 1e-6 else None


def out(v):
    r = near(v)
    return Expect(str(r)) if r is not None else Unsupported(f'non-integer measured {v}')


def bisect(f, lo, hi, target, it=200):
    flo = f(lo) - target
    for _ in range(it):
        mid = (lo + hi) / 2
        fm = f(mid) - target
        if (fm > 0) == (flo > 0):
            lo, flo = mid, fm
        else:
            hi = mid
    return (lo + hi) / 2


@ref('alangle', method='circle theorems checked by building explicit coordinates on a unit circle and measuring the requested angle (inverse problems solved by bisection on the construction)')
def alangle(q):
    p = q['prompt']
    v = float(re.search(r'= ' + NUM + '°', p).group(1))
    if 'two equal chords' in p:
        A, B = pol(1, 0), pol(1, v)
        # chord CD of the same length elsewhere
        C, D = pol(1, 150), pol(1, 150 + v)
        if abs(math.dist(A, B) - math.dist(C, D)) > 1e-9:
            return Unsupported('construction failed')
        O = (0, 0)
        if 'Find ∠COD' in p:
            return out(ang(C, O, D))
        if 'Find ∠OCD' in p:
            return out(ang(O, C, D))
    if 'cyclic quadrilateral' in p:
        A, B, D, C = pol(1, 180), pol(1, -v), pol(1, v), pol(1, 0)
        return out(ang(B, C, D))
    if 'major arc AB' in p:
        def acb(th):
            A, B, C = pol(1, 90 - th / 2), pol(1, 90 + th / 2), pol(1, 270)
            return ang(A, C, B)
        if 'Find ∠AOB' in p:
            th = bisect(acb, 1e-9, 180 - 1e-9, v)
            return out(th)
        th = v
        return out(acb(th))
    if 'AB is a diameter' in p:
        A, B = (-1, 0), (1, 0)
        C = pol(1, 2 * v)
        return out(ang(C, B, A))
    if 'midpoint of AB' in p:
        O, A = (0, 0), (1, 0)
        t = 2 * math.cos(math.radians(v))
        B = (1 - t * math.cos(math.radians(v)), t * math.sin(math.radians(v)))
        if abs(math.hypot(*B) - 1) > 1e-9:
            return Unsupported('construction failed')
        M = ((A[0] + B[0]) / 2, (A[1] + B[1]) / 2)
        return out(ang(A, O, M))
    if 'O is the centre of a circle and A, B are points on it' in p:
        O, A, B = (0, 0), pol(1, 0), pol(1, v)
        return out(ang(O, A, B))
    return Unsupported('unknown alangle template')


@ref('amtang', method='tangents: explicit coordinates of the circle, external point P and tangent points; angles measured')
def amtang(q):
    p = q['prompt']
    v = float(re.search(r'= ' + NUM + '°', p).group(1))
    if 'PT is the tangent' in p:
        A = (0, -1)
        T = (1, -1)
        t = 2 * math.sin(math.radians(v))
        B = (t * math.cos(math.radians(v)), -1 + t * math.sin(math.radians(v)))
        if abs(math.hypot(*B) - 1) > 1e-9:
            return Unsupported('construction failed')
        def side(P):
            return (B[0] - A[0]) * (P[1] - A[1]) - (B[1] - A[1]) * (P[0] - A[0])
        for deg in range(0, 360, 7):
            C = pol(1, deg + 0.5)
            if side(C) * side(T) < 0:
                return out(ang(A, C, B))
        return Unsupported('no C found')
    O = (0, 0)
    d = 1 / math.sin(math.radians(v) / 2)
    P = (d, 0)
    a = math.degrees(math.acos(1 / d))
    A, B = pol(1, a), pol(1, -a)
    if abs(ang(A, P, B) - v) > 1e-6:
        return Unsupported('construction failed')
    if 'Find ∠AOB' in p:
        return out(ang(A, O, B))
    if 'Find ∠PAB' in p:
        return out(ang(P, A, B))
    if 'Find ∠OAB' in p:
        return out(ang(O, A, B))
    return Unsupported('unknown amtang')


def incentre_angle(Bd, Cd):
    Ad = 180 - Bd - Cd
    A = pol(1, 0)
    # place B at the origin, C on x axis, A by angle B
    B, C = (0.0, 0.0), (1.0, 0.0)
    a_len = 1.0
    b_len = a_len * math.sin(math.radians(Bd)) / math.sin(math.radians(Ad))   # side CA opposite B
    c_len = a_len * math.sin(math.radians(Cd)) / math.sin(math.radians(Ad))   # side AB opposite C
    A = (c_len * math.cos(math.radians(Bd)), c_len * math.sin(math.radians(Bd)))
    s = a_len + b_len + c_len
    I = ((a_len * A[0] + b_len * B[0] + c_len * C[0]) / s, (a_len * A[1] + b_len * B[1] + c_len * C[1]) / s)
    return ang(B, I, C)


@ref('awinc', method='explicit triangle coordinates; incentre as the side-length-weighted centroid; angle BIC measured (angle A inverse by search over the construction)')
def awinc(q):
    p = q['prompt']
    if 'In △ABC, ∠B =' in p:
        b, c = [float(x) for x in re.findall(r'∠[BC] = ' + NUM + '°', p)]
        if b + c >= 180:
            return Verdict(False, 'angles B and C leave no room for A')
        return out(incentre_angle(b, c))
    if 'In △ABC, ∠A =' in p:
        a = float(re.search(r'∠A = ' + NUM, p).group(1))
        r1 = incentre_angle((180 - a) / 2, (180 - a) / 2)
        r2 = incentre_angle((180 - a) / 3, 2 * (180 - a) / 3)
        if abs(r1 - r2) > 1e-6:
            return Ambiguous('BIC depends on the split of B and C')
        return out(r1)
    if 'and ∠BIC =' in p:
        v = float(re.search(r'∠BIC = ' + NUM, p).group(1))
        hit = [a for a in range(1, 179) if abs(incentre_angle((180 - a) / 2, (180 - a) / 2) - v) < 1e-6]
        if len(hit) != 1:
            return Unsupported('no unique A')
        return Expect(str(hit[0]))
    return Unsupported('unknown awinc')


# ---------------- ampgx
@ref('ampgx', method='the stated parallelogram conditions (equal opposite sides / bisecting diagonals) as two linear equations solved with SymPy; all lengths checked positive')
def ampgx(q):
    p = U(q['prompt'])
    x, y = sp.symbols('x y')
    body = p.split('(in cm)')[0]
    L = dict(re.findall(r'([A-Z]{2}) = (.+?)(?=, [A-Z]{2} = | and [A-Z]{2} = |$)', body.split(': ')[-1] if 'meet at O' in body else body.split('ABCD, ')[-1]))
    if len(L) != 4:
        return Unsupported('could not parse four lengths ' + str(L))
    def e(s):
        return sp.sympify(re.sub(r'(\d)([xy])', r'\1*\2', s.strip()), locals={'x': x, 'y': y})
    E = {k: e(v) for k, v in L.items()}
    if 'diagonals' in p:
        eqs = [sp.Eq(E['OA'], E['OC']), sp.Eq(E['OB'], E['OD'])]
    else:
        eqs = [sp.Eq(E['AB'], E['CD']), sp.Eq(E['AD'], E['BC'])]
    sol = sp.solve(eqs, [x, y], dict=True)
    if len(sol) != 1 or len(sol[0]) != 2:
        return Unsupported('no unique solution')
    s = sol[0]
    if any(v.subs(s) <= 0 for v in E.values()):
        return Verdict(False, 'a side/segment length is not positive at the solution')
    return Expect(f'({s[x]}, {s[y]})')


@ref('amctan', method='all lines n.x=c (|n|=1) tangent to both circles solved from |c|=r1 and |n.(d,0)-c|=r2; count distinct lines; contact points built explicitly and their distance measured, split into direct/transverse by the side of the centres')
def amctan(q):
    p = q['prompt']
    r1, r2, d = [sp.Rational(v) for v in re.findall(r'(\d+(?:\.\d+)?) cm', p)[:3]]
    if d == 0:
        return Expect('0') if 'How many' in p else Verdict(False, 'concentric circles have no common tangent')
    lines = set()
    info = []
    for t_sign in (1, -1):               # circle 2 contact offset t = +-r2 along n; circle 1 at c = r1
        cos = (r1 - t_sign * r2) / d     # from t = c - d cos(theta)
        if abs(cos) > 1:
            continue
        s2 = 1 - cos ** 2
        for sg in ((1, -1) if s2 != 0 else (1,)):
            sin = sg * sp.sqrt(s2)
            key = (cos, sin)
            if key in lines:
                continue
            lines.add(key)
            n = (cos, sin)
            P1 = (r1 * n[0], r1 * n[1])
            P2 = (d + t_sign * r2 * n[0], t_sign * r2 * n[1])
            L = sp.simplify(sp.sqrt((P1[0] - P2[0]) ** 2 + (P1[1] - P2[1]) ** 2))
            info.append(('direct' if t_sign * 1 > 0 else 'transverse', L))
    # t = +r2 (same sign as c = +r1): both centres on the same side of the line -> direct tangent
    if 'How many' in p:
        return Expect(str(len(lines)))
    kind = 'direct' if 'direct common tangent' in p else 'transverse'
    Ls = {sp.nsimplify(L) for k, L in info if k == kind}
    if len(Ls) != 1:
        return Verdict(False, f'no {kind} tangent exists' if not Ls else f'lengths differ {Ls}')
    return Expect(str(Ls.pop()))
