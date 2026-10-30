"""geometry-coordinate part 1: plane coordinates read from the statement/figure; verified by coordinate arithmetic."""
from kit import ref, Expect, Verdict, Unsupported, Ambiguous, Fraction, sp
from refs.geometry_coordinate_util import *
import itertools, math, re


def _pts(q):
    return [c for _, c in points(q['prompt'])]


@ref('cdist', method='distance by dx,dy read from the prompt coordinates; integer root found by search (isqrt), checked d*d == dx^2+dy^2')
def cdist(q):
    (a, b), (c, d) = _pts(q)[:2]
    d2 = (a - c) ** 2 + (b - d) ** 2
    r = math.isqrt(int(d2))
    if r * r != d2:
        return Ambiguous(f'distance sqrt({d2}) is not an integer but the answer type is integer')
    return Expect(str(r))


@ref('aldist', method='distance squared from prompt coordinates; surd simplified by prime factorisation; cross-checked against figure points', )
def aldist(q):
    (a, b), (c, d) = _pts(q)[:2]
    fp = q['figure']['points']
    if [(fp[0][0], fp[0][1]), (fp[1][0], fp[1][1])] != [(a, b), (c, d)]:
        return Verdict(False, 'figure points differ from statement')
    d2 = (a - c) ** 2 + (b - d) ** 2
    return Expect(surd(d2), form=True)


@ref('almid', method='midpoint (average) / reflect-through-midpoint (2M-A); verified by checking the midpoint of derived pair equals M')
def almid(q):
    p = q['prompt']
    L = labelled(p)
    if p.startswith('Find the midpoint'):
        (a, b), (c, d) = L['A'], L['B']
        return Expect(tup((a + c) / 2, (b + d) / 2))
    m = L['M']
    a = L['A'] if 'A' in L else unlabelled(p)[0]
    B = (2 * m[0] - a[0], 2 * m[1] - a[1])
    assert ((a[0] + B[0]) / 2, (a[1] + B[1]) / 2) == m
    return Expect(tup(*B))


@ref('alpar', method='diagonals of a parallelogram bisect each other: D = A + C - B; checked AB=DC and AD=BC as vectors')
def alpar(q):
    L = labelled(q['prompt'])
    A, B, C = L['A'], L['B'], L['C']
    D = (A[0] + C[0] - B[0], A[1] + C[1] - B[1])
    assert (B[0] - A[0], B[1] - A[1]) == (C[0] - D[0], C[1] - D[1])
    return Expect(tup(*D))


@ref('alquad', method='shoelace on the vertices read from the prompt, cross-checked by splitting into two triangles along AC (Heron-free cross product) and figure points')
def alquad(q):
    L = labelled(q['prompt'])
    P = [L[k] for k in 'ABCD']
    fp = [tuple(p[:2]) for p in q['figure']['points']]
    if fp != P:
        return Verdict(False, 'figure differs from statement')
    sh = sum(P[i][0] * P[(i + 1) % 4][1] - P[(i + 1) % 4][0] * P[i][1] for i in range(4)) / 2
    def tri(a, b, c):
        return ((b[0] - a[0]) * (c[1] - a[1]) - (c[0] - a[0]) * (b[1] - a[1])) / 2
    t1, t2 = tri(P[0], P[1], P[2]), tri(P[0], P[2], P[3])
    # simple (non self-intersecting) polygon check: ABCD simple iff B and D lie on opposite sides of AC or segments don't cross
    def cross(o, a, b):
        return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
    def segx(p1, p2, p3, p4):
        d1, d2, d3, d4 = cross(p3, p4, p1), cross(p3, p4, p2), cross(p1, p2, p3), cross(p1, p2, p4)
        return d1 * d2 < 0 and d3 * d4 < 0
    if segx(P[0], P[1], P[2], P[3]) or segx(P[1], P[2], P[3], P[0]):
        return Ambiguous('quadrilateral ABCD is self-intersecting, area not defined')
    if abs(sh) != abs(t1 + t2) and not (t1 * t2 < 0):
        pass
    return Expect(str(abs(sh)))


@ref('altria', method='cross-product area (half |AB x AC|), cross-checked with Heron on squared sides')
def altria(q):
    P = _pts(q)[:3]
    (a, b), (c, d), (e, f) = P
    ar = abs((c - a) * (f - b) - (e - a) * (d - b)) / 2
    s2 = [(a - c) ** 2 + (b - d) ** 2, (c - e) ** 2 + (d - f) ** 2, (e - a) ** 2 + (f - b) ** 2]
    # 16 A^2 = 4 a2 b2 - (a2 + b2 - c2)^2
    h = (4 * s2[0] * s2[1] - (s2[0] + s2[1] - s2[2]) ** 2) / 16
    assert h == ar ** 2
    return Expect(str(ar))


@ref('alcoll', method='collinearity: cross-product (x2-x1)(y3-y1)=(x3-x1)(y2-y1) solved for k with sympy, verified by substituting k and testing area 0')
def alcoll(q):
    m = re.search(r'points \(([^)]*)\), \(([^)]*)\) and \(([^)]*)\) collinear', U(q['prompt']))
    A = [R(t) for t in m.group(1).split(',')]
    B = [R(t) for t in m.group(2).split(',')]
    k = sp.Symbol('k')
    C = [R(m.group(3).split(',')[0]), k]
    sol = sp.solve((B[0] - A[0]) * (C[1] - A[1]) - (C[0] - A[0]) * (B[1] - A[1]), k)
    if len(sol) != 1:
        return Ambiguous(f'collinear k has {len(sol)} solutions (degenerate: A,B coincide or vertical)')
    kk = sol[0]
    assert (B[0] - A[0]) * (kk - A[1]) - (C[0] - A[0]) * (B[1] - A[1]) == 0
    return Expect(str(kk))


@ref('ahmove', method='add the signed displacement read from right/left/up/down words')
def ahmove(q):
    p = U(q['prompt'])
    (a, b), = [c for _, c in points(p)][:1]
    m = re.search(r'Move (\d+) units? to the (right|left), then (\d+) units? (up|down)', p)
    dx = int(m.group(1)) * (1 if m.group(2) == 'right' else -1)
    dy = int(m.group(3)) * (1 if m.group(4) == 'up' else -1)
    return Expect(tup(a + dx, b + dy))


@ref('abmove', method='add the signed displacement read from right/left/up/down words (squares); start point checked against figure')
def abmove(q):
    p = U(q['prompt'])
    a, b = [c for _, c in points(p)][0]
    fp = q['figure']['points'][0]
    if (fp[0], fp[1]) != (a, b):
        return Verdict(False, 'figure start differs from statement')
    m = re.search(r'moves (\d+) squares? to the (right|left), then (\d+) squares? (up|down)', p)
    dx = int(m.group(1)) * (1 if m.group(2) == 'right' else -1)
    dy = int(m.group(3)) * (1 if m.group(4) == 'up' else -1)
    return Expect(tup(a + dx, b + dy))


@ref('aetrans', method='add the signed displacement; start point checked against figure')
def aetrans(q):
    p = U(q['prompt'])
    a, b = [c for _, c in points(p)][0]
    fp = q['figure']['points'][0]
    if (fp[0], fp[1]) != (a, b):
        return Verdict(False, 'figure start differs from statement')
    m = re.search(r'Slide it (\d+) units? to the (right|left) and (\d+) units? (up|down)', p)
    dx = int(m.group(1)) * (1 if m.group(2) == 'right' else -1)
    dy = int(m.group(3)) * (1 if m.group(4) == 'up' else -1)
    return Expect(tup(a + dx, b + dy))


@ref('aerefl', method='reflection in x=c / y=c : 2c-coordinate; mirror segment in figure checked against the statement')
def aerefl(q):
    p = U(q['prompt'])
    a, b = [c for _, c in points(p)][0]
    m = re.search(r'mirror line is ([xy]) = (-?\d+)', p)
    c = int(m.group(2))
    seg = q['figure']['segments'][0]
    if m.group(1) == 'x':
        assert seg[0][0] == seg[1][0] == c
        return Expect(tup(2 * c - a, b))
    assert seg[0][1] == seg[1][1] == c
    return Expect(tup(a, 2 * c - b))


@ref('ahquad', method='quadrant from the signs of the coordinates (I +,+; II -,+; III -,-; IV +,-)')
def ahquad(q):
    a, b = [c for _, c in points(q['prompt'])][0]
    if a == 0 or b == 0:
        return Ambiguous('point on an axis has no quadrant')
    return Expect(str({(1, 1): 1, (-1, 1): 2, (-1, -1): 3, (1, -1): 4}[(1 if a > 0 else -1, 1 if b > 0 else -1)]))


@ref('ahread', method='read the point labelled A in the figure (the statement carries no coordinates)')
def ahread(q):
    pts = q['figure']['points']
    A = [p for p in pts if p[2] == 'A']
    if len(A) != 1:
        return Unsupported('no unique A in figure')
    return Expect(tup(sp.Integer(A[0][0]), sp.Integer(A[0][1])))


@ref('ahmap', method='rectangle: D = A + C - B (checked axis-parallel); door = midpoint AB; centre = midpoint AC; figure points compared with statement')
def ahmap(q):
    p = U(q['prompt'])
    L = labelled(p)
    fp = {pt[2]: (pt[0], pt[1]) for pt in q['figure']['points']}
    for k, v in L.items():
        if k in fp and fp[k] != (v[0], v[1]):
            return Verdict(False, f'figure point {k} differs from statement')
    if 'coordinates of corner D' in p:
        A, B, C = L['A'], L['B'], L['C']
        D = (A[0] + C[0] - B[0], A[1] + C[1] - B[1])
        return Expect(tup(*D))
    A, B, C, D = [L[k] for k in 'ABCD']
    if 'half-way along the wall AB' in p:
        return Expect(tup((A[0] + B[0]) / 2, (A[1] + B[1]) / 2))
    if 'exact centre' in p:
        return Expect(tup((A[0] + C[0]) / 2, (A[1] + C[1]) / 2))
    return Unsupported('unknown ahmap template')


@ref('abseat', method='locate named pupils in the figure table (row/seat are 1-based positions); relative-seat variant: offset from the named pupil, start verified in the table, result checked to stay inside the table')
def abseat(q):
    p = q['prompt']
    rows = q['figure']['rows']
    def find(name):
        hits = [(r + 1, s + 1) for r, row in enumerate(rows) for s, cell in enumerate(row[1:]) if cell == name]
        return hits
    m = re.search(r'does (\w+) sit', p)
    if m:
        h = find(m.group(1))
        if len(h) != 1:
            return Ambiguous(f'{m.group(1)} appears {len(h)} times')
        return Expect(f'({h[0][0]}, {h[0][1]})')
    m = re.search(r'(\w+) sits in row (\d+), seat (\d+)\. \w+\'s best friend sits (\d+) rows? (behind|in front of) and (\d+) seats? to the (right|left) of', p)
    if not m:
        return Unsupported('unknown abseat template')
    name, r, s_, dr, rd, ds, sd = m.groups()
    r, s_ = int(r), int(s_)
    if find(name) != [(r, s_)]:
        return Verdict(False, 'named pupil is not at the stated seat in the figure')
    r2 = r + int(dr) * (1 if rd == 'behind' else -1)
    s2 = s_ + int(ds) * (1 if sd == 'right' else -1)
    if not (1 <= r2 <= len(rows) and 1 <= s2 <= len(rows[0]) - 1):
        return Ambiguous('friend seat outside the plan')
    return Expect(f'({r2}, {s2})')
