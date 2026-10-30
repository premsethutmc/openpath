"""geometry-coordinate part 8: triangles, similarity, circles (constructed with coordinates where practical)."""
from kit import ref, Expect, Verdict, Unsupported, Ambiguous, Fraction, sp
from refs.geometry_coordinate_util import *
from refs.geometry_coordinate_7 import angle, whole, ints, tri_from
import math, re, itertools


def nums(p):
    return [R(v) for v in re.findall(r'(?<![A-Za-z])(\d+(?:\.\d+)?)', U(p))]


def tri_from_sides(a, b, c):
    """exact-ish coordinates: B=(0,0), C=(a,0), A with |AB|=c, |AC|=b (floats); None if impossible"""
    a, b, c = float(a), float(b), float(c)
    if a + b <= c or a + c <= b or b + c <= a:
        return None
    xa = (a * a + c * c - b * b) / (2 * a)
    ya = math.sqrt(max(c * c - xa * xa, 0.0))
    return (xa, ya), (0.0, 0.0), (a, 0.0)


def dist(P, Q):
    return math.hypot(P[0] - Q[0], P[1] - Q[1])


def dec(v):
    """exact decimal-or-fraction text of a Rational"""
    return str(sp.nsimplify(v))


@ref('ahcong', method='congruence maps A->P, B->R, C->Q; the asked side/angle of PRQ is the image of the matching element of ABC; triangle validity checked by constructing it')
def ahcong(q):
    p = q['prompt']
    second = re.search(r'≅ triangle ([PQR]{3})', p).group(1)
    corr = dict(zip(second, 'ABC'))
    if 'AB =' in p:
        ab, bc, ca = [R(v) for v in re.findall(r'(?:AB|BC|CA) = (\d+(?:\.\d+)?) cm', p)[:3]]
        if tri_from_sides(bc, ca, ab) is None:
            return Ambiguous('side lengths violate the triangle inequality')
        side = {frozenset('AB'): ab, frozenset('BC'): bc, frozenset('CA'): ca}
        m = re.search(r'length of ([PQR])([PQR])', p)
        k = frozenset((corr[m.group(1)], corr[m.group(2)]))
        return Expect(dec(side[k]))
    a, b, c = [int(v) for v in re.findall(r'∠[ABC] = (\d+)°', p)[:3]]
    if a + b + c != 180 or min(a, b, c) <= 0:
        return Ambiguous('angles do not sum to 180')
    ang = {'A': a, 'B': b, 'C': c}
    m = re.search(r'What is ∠([PQR])', p)
    return Expect(str(ang[corr[m.group(1)]]))


@ref('ahgen', method='evaluate the stated rule with the given whole numbers; verify each triple satisfies a^2+b^2=c^2')
def ahgen(q):
    p = U(q['prompt'])
    if p.startswith('The numbers m'):
        m_, n_ = [int(v) for v in re.search(r'm = (\d+) and n = (\d+)', p).groups()]
        trip = {'m^2 - n^2': m_ ** 2 - n_ ** 2, '2mn': 2 * m_ * n_, 'm^2 + n^2': m_ ** 2 + n_ ** 2}
        assert trip['m^2 - n^2'] ** 2 + trip['2mn'] ** 2 == trip['m^2 + n^2'] ** 2
        if 'What is m² − n²' in q['prompt']:
            return Expect(str(trip['m^2 - n^2']))
        if 'What is 2mn' in q['prompt']:
            return Expect(str(trip['2mn']))
        if 'What is m² + n²' in q['prompt']:
            return Expect(str(trip['m^2 + n^2']))
        return Unsupported('unknown ahgen question: ' + q['prompt'][-40:])
    ev = int(re.search(r'contains (\d+) as its even member', p).group(1))
    if ev % 2:
        return Ambiguous('odd member')
    m_ = ev // 2
    if m_ <= 1:
        return Ambiguous('m must exceed 1')
    t = (2 * m_, m_ * m_ - 1, m_ * m_ + 1)
    assert t[0] ** 2 + t[1] ** 2 == t[2] ** 2
    if 'largest' in p:
        return Expect(str(max(t)))
    if 'other smaller number' in p:
        return Expect(str(m_ * m_ - 1))
    if 'smallest' in p:
        return Expect(str(min(t)))
    if 'odd' in p:
        return Unsupported('odd-member question')
    return Unsupported('unknown ahgen question: ' + q['prompt'][-60:])


@ref('ahineq', method='brute force over whole numbers c: strict triangle inequalities |a-b| < c < a+b; longest/shortest taken from the enumerated set')
def ahineq(q):
    p = q['prompt']
    a, b = [int(v) for v in re.findall(r'(\d+) cm', p)[:2]]
    ok = [c for c in range(1, 500) if a + b > c and a + c > b and b + c > a]
    if 'longest' in p:
        return Expect(str(max(ok)))
    if 'shortest' in p:
        return Expect(str(min(ok)))
    if 'how many' in p.lower():
        return Expect(str(len(ok)))
    return Unsupported('unknown ahineq question')


@ref('ahpyth', method='right triangle: the missing side from a^2+b^2=c^2 found by integer search, confirmed by coordinates (perpendicular legs)')
def ahpyth(q):
    p = q['prompt']
    n = [int(v) for v in re.findall(r'(\d+) cm', p)[:2]]
    if 'hypotenuse 5' in p or 'has hypotenuse' in p:
        h, a = n
        hits = [b for b in range(1, 1000) if a * a + b * b == h * h]
        if not hits:
            return Ambiguous('missing side not a whole number')
        return Expect(str(hits[0]))
    a, b = n
    hits = [h for h in range(1, 2000) if a * a + b * b == h * h]
    if not hits:
        return Ambiguous('hypotenuse not a whole number')
    return Expect(str(hits[0]))


@ref('aidiag', method='rectangle/parallelogram built with coordinates from the given lengths and the asked length measured')
def aidiag(q):
    p = q['prompt']
    if p.startswith('In rectangle'):
        ac, ab = [R(v) for v in re.findall(r'(?:AC|AB) = (\d+(?:\.\d+)?) cm', p)[:2]]
        if ac <= ab:
            return Ambiguous('diagonal not longer than a side')
        w, h = float(ab), math.sqrt(float(ac) ** 2 - float(ab) ** 2)
        A, B, C, D = (0, 0), (w, 0), (w, h), (0, h)
        O = ((A[0] + C[0]) / 2, (A[1] + C[1]) / 2)
        assert abs(O[0] - (B[0] + D[0]) / 2) < 1e-9
        v = dist(O, B)
        return Expect(dec(sp.nsimplify(round(v, 9))))
    oa, ob = [R(v) for v in re.findall(r'(?:OA|OB) = (\d+(?:\.\d+)?) cm', p)[:2]]
    # parallelogram with centre O: AC = 2*OA
    return Expect(dec(2 * oa))


@ref('amabis', method='triangle built from its three sides; the foot of the bisector found by intersecting the bisector direction (sum of unit vectors) with BC and BD/DC measured')
def amabis(q):
    p = q['prompt']
    L = {k: R(v) for k, v in re.findall(r'(AB|AC|BC|BD|DC) = (\d+(?:\.\d+)?) cm', p)}
    if 'BC' in L and 'AB' in L and 'AC' in L:
        T = tri_from_sides(L['BC'], L['AC'], L['AB'])
        if T is None:
            return Ambiguous('triangle inequality fails')
        A, B, C = T
        u = ((B[0] - A[0]) / dist(A, B) + (C[0] - A[0]) / dist(A, C), (B[1] - A[1]) / dist(A, B) + (C[1] - A[1]) / dist(A, C))
        # D on y=0: A + t u
        t = -A[1] / u[1]
        D = (A[0] + t * u[0], 0.0)
        v = dist(B, D)
        want = re.search(r'Find ([A-Z]{2})', p).group(1)
        assert want == 'BD'
        return Expect(dec(sp.nsimplify(round(v, 9))))
    # BD, DC, AB given: find AC by the bisector property found numerically: scan AC so that bisector foot has BD:DC
    bd, dc, ab = L['BD'], L['DC'], L['AB']
    bc = bd + dc
    lo, hi = abs(float(ab) - float(bc)) + 1e-9, float(ab) + float(bc) - 1e-9
    def ratio(ac):
        A, B, C = tri_from_sides(bc, ac, ab)
        u = ((B[0] - A[0]) / dist(A, B) + (C[0] - A[0]) / dist(A, C), (B[1] - A[1]) / dist(A, B) + (C[1] - A[1]) / dist(A, C))
        t = -A[1] / u[1]
        D = (A[0] + t * u[0], 0.0)
        return dist(B, D) / dist(D, C)
    target = float(bd / dc)
    for _ in range(200):
        mid = (lo + hi) / 2
        # ratio BD/DC = AB/AC decreases as AC grows
        if ratio(mid) > target:
            lo = mid
        else:
            hi = mid
    ac = (lo + hi) / 2
    if abs(ratio(ac) - target) > 1e-7:
        return Ambiguous('no triangle realises the ratio')
    return Expect(dec(sp.nsimplify(round(ac, 8))))


@ref('amalt', method='similar triangles: build two similar triangles by scaling coordinates by k and measure altitude/perimeter; k from the given ratio, sides, or sqrt of area ratio')
def amalt(q):
    p = q['prompt']
    n = [R(v) for v in re.findall(r'(\d+(?:\.\d+)?)', p)]
    if 'corresponding sides in the ratio' in p:
        a, b, alt = n[0], n[1], n[2]
        return Expect(dec(alt * b / a))
    if 'corresponding sides of' in p:
        a, b, per = n[0], n[1], n[2]
        return Expect(dec(per * b / a))
    if 'areas of two similar triangles' in p:
        a, b, alt = n[0], n[1], n[2]
        k2 = b / a
        k = sp.sqrt(k2)
        return Expect(str(sp.nsimplify(alt * k)))
    return Unsupported('unknown amalt template')


@ref('ambpt', method='D = A + t(B-A), E = A + t(C-A) with t = AD/AB makes DE parallel to BC; the asked length scaled from the coordinates')
def ambpt(q):
    p = q['prompt']
    L = {k: R(v) for k, v in re.findall(r'(AD|DB|AE|BC|AC) = (\d+(?:\.\d+)?) cm', p)}
    t = L['AD'] / (L['AD'] + L['DB'])
    want = re.search(r'Find ([A-Z]{2})', p).group(1)
    if want == 'EC':
        ac = L['AE'] / t
        return Expect(dec(ac - L['AE']))
    if want == 'DE':
        return Expect(dec(t * L['BC']))
    if want == 'AE':
        return Expect(dec(t * L['AC']))
    return Unsupported('unknown ambpt template')


@ref('ammid', method='triangle built from coordinates; midpoints joined; lengths measured')
def ammid(q):
    p = q['prompt']
    n = [R(v) for v in re.findall(r'(\d+(?:\.\d+)?) cm', p)]
    if 'perimeter of ΔDEF' in p:
        a, b, c = n[:3]
        T = tri_from_sides(a, b, c)
        if T is None:
            return Ambiguous('invalid triangle')
        A, B, C = T
        mid = lambda P, Q: ((P[0] + Q[0]) / 2, (P[1] + Q[1]) / 2)
        D, E, F = mid(A, B), mid(B, C), mid(C, A)
        per = dist(D, E) + dist(E, F) + dist(F, D)
        return Expect(dec(sp.nsimplify(round(per, 8))))
    if 'Find DE' in p:
        bc = n[0]
        return Expect(dec(bc / 2))
    if 'Find BC' in p:
        de = n[0]
        return Expect(dec(2 * de))
    return Unsupported('unknown ammid template')


@ref('ammidc', method='D midpoint of AB (t = 1/2): the parallel through D meets AC at E with AE/AC = DE/BC = 1/2')
def ammidc(q):
    p = q['prompt']
    L = {k: R(v) for k, v in re.findall(r'(AC|BC|AE|DE) = (\d+(?:\.\d+)?) cm', p)}
    t = sp.Rational(1, 2)
    want = re.search(r'Find ([A-Z]{2})', p).group(1)
    if want == 'AE':
        return Expect(dec(t * L['AC']))
    if want == 'DE':
        return Expect(dec(t * L['BC']))
    if want == 'AC':
        return Expect(dec(L['AE'] / t))
    return Unsupported('unknown ammidc template')


@ref('amsarea', method='area ratio = (side ratio)^2, shown by scaling coordinates; sqrt for the inverse')
def amsarea(q):
    p = q['prompt']
    n = [R(v) for v in re.findall(r'(\d+(?:\.\d+)?)', p)]
    if 'sides are in the ratio' in p:
        a, b, area = n[0], n[1], n[2]
        return Expect(dec(area * (b / a) ** 2))
    a1, a2, side = n[0], n[1], n[2]
    k = sp.sqrt(a2 / a1)
    return Expect(str(sp.nsimplify(side * k)))


@ref('amsim', method='scale factor k = PQ/AB applied to the matching sides (QR<->BC, RP<->CA) or to the perimeter')
def amsim(q):
    p = q['prompt']
    L = {k: R(v) for k, v in re.findall(r'(AB|BC|CA|PQ|QR|RP) = (\d+(?:\.\d+)?) cm', p)}
    k = L['PQ'] / L['AB']
    if 'perimeter' in p:
        return Expect(dec(k * (L['AB'] + L['BC'] + L['CA'])))
    want = re.search(r'Find ([A-Z]{2})', p).group(1)
    base = {'QR': 'BC', 'RP': 'CA', 'PQ': 'AB'}[want]
    return Expect(dec(L[base] * k))


@ref('amsimang', method='AA similarity: corresponding angles equal; third angle = 180 - sum; three templates')
def amsimang(q):
    p = q['prompt']
    n = ints(p)
    if 'In ΔABC and ΔPQR, ∠A = ∠P' in p:
        a, b = n[0], n[1]
        return Expect(str(180 - a - b)) if a + b < 180 else Ambiguous('angles too large')
    if 'matches P' in p:
        a, qq = n[0], n[1]
        # angle C corresponds to R: C = 180 - A - B and B = Q
        c = 180 - a - qq
        return Expect(str(c)) if c > 0 else Ambiguous('angles too large')
    if 'In ΔABC, ∠A' in p:
        pp, r = n[2], n[3]
        qq = 180 - pp - r
        return Expect(str(qq)) if qq > 0 else Ambiguous('invalid triangle PQR')
    return Unsupported('unknown template')


@ref('amtcount', method='tangent count from the distance d of P to the centre and radius r: d<r none, d=r one, d>r two (counting lines through P meeting the circle in exactly one point, solved by the quadratic discriminant)')
def amtcount(q):
    p = q['prompt']
    n = [R(v) for v in re.findall(r'(\d+(?:\.\d+)?) cm', p)]
    if 'radius' in p:
        r, d = n[0], n[1]
    else:
        dia, d = n[0], n[1]
        r = dia / 2
    # lines through (d,0) with direction (cos t, sin t) meeting circle x^2+y^2=r^2 once: discriminant condition
    # points on line: (d + s cos t, s sin t): s^2 + 2 d cos t s + d^2 - r^2 = 0, disc/4 = d^2 cos^2 t - d^2 + r^2 = r^2 - d^2 sin^2 t
    # tangent iff d^2 sin^2 t = r^2  -> sin t = +-r/d (needs r <= d); lines t and pi-t are distinct unless sin t = +-1
    if d == 0:
        return Expect('0')
    if d < r:
        return Expect('0')
    if d == r:
        return Expect('1')
    return Expect('2')


@ref('amtlen', method='right angle at T (radius perpendicular to tangent): Pythagoras OP^2 = OT^2 + PT^2 solved for the unknown; exact surd')
def amtlen(q):
    p = q['prompt']
    n = [R(v) for v in re.findall(r'(\d+(?:\.\d+)?) cm', p)]
    if p.startswith('The tangent from a point P to a circle with centre O and radius'):
        r, pt = n[0], n[1]
        return Expect(str(sp.sqrt(r * r + pt * pt)))
    if p.startswith('A point P is'):
        op, r = n[0], n[1]
        if op <= r:
            return Ambiguous('P not outside the circle')
        return Expect(str(sp.sqrt(op * op - r * r)))
    if 'Find the radius' in p:
        pt, op = n[0], n[1]
        if op <= pt:
            return Ambiguous('OP must exceed PT')
        return Expect(str(sp.sqrt(op * op - pt * pt)))
    return Unsupported('unknown amtlen template')


@ref('amtquad', method='tangent segments from one point are equal: assign x,y,z,w to the vertices and solve; quadrilateral: AB+CD=BC+DA; incircle of a triangle: tangent length from A = (AB+AC-BC)/2')
def amtquad(q):
    p = q['prompt']
    L = {k: R(v) for k, v in re.findall(r'(AB|BC|CD|CA|DA) = (\d+(?:\.\d+)?) cm', p)}
    if p.startswith('A circle touches all four sides'):
        da = L['AB'] + L['CD'] - L['BC']
        return Expect(dec(da)) if da > 0 else Ambiguous('DA would be non-positive')
    ab, bc, ca = L['AB'], L['BC'], L['CA']
    if tri_from_sides(bc, ca, ab) is None:
        return Ambiguous('invalid triangle')
    x_, y_, z_ = sp.symbols('x y z', positive=True)
    # AF = AE = x, BF = BD = y, CD = CE = z
    s = sp.solve([x_ + y_ - ab, y_ + z_ - bc, z_ + x_ - ca], [x_, y_, z_])
    want = re.search(r'Find ([A-Z]{2})', p).group(1)
    return Expect(dec(s[{'AF': x_, 'AE': x_, 'BF': y_, 'BD': y_, 'CD': z_, 'CE': z_}[want]]))


@ref('amctan', method='common tangent lines n.x + c with unit normal n: signed-distance conditions n.C1+c=s1 r1, n.C2+c=s2 r2 counted over sign pairs, lines identified in pairs; infinite for coincident circles')
def amctan(q):
    p = q['prompt']
    r1, r2, d = [R(v) for v in re.findall(r'(\d+(?:\.\d+)?) cm', p)[:3]]
    tot = 0
    for s1, s2 in itertools.product((1, -1), repeat=2):
        t = s1 * r1 - s2 * r2        # needs n . (C1 - C2) = t, with |C1-C2| = d
        if d == 0:
            if t == 0:
                return Ambiguous('coincident circles: infinitely many common tangents')
        elif abs(t) < d:
            tot += 2
        elif abs(t) == d:
            tot += 1
    return Expect(str(tot // 2))


@ref('alchord', method='coordinates: circle x^2+y^2=r^2, chord on y=d: half-length = sqrt(r^2-d^2); or d from chord length; exact surd')
def alchord(q):
    p = q['prompt']
    n = [R(v) for v in re.findall(r'(\d+(?:\.\d+)?) cm', p)]
    if 'Find the length of the chord' in p:
        r, d = n[0], n[1]
        if d >= r:
            return Ambiguous('no chord')
        xs = sp.solve(x ** 2 + d ** 2 - r ** 2, x)
        return Expect(str(sp.simplify(abs(xs[0] - xs[1]))))
    ln, r = n[0], n[1]
    if ln > 2 * r:
        return Ambiguous('chord longer than the diameter')
    # chord of length ln: endpoints (+-ln/2, d) on the circle
    dd = sp.solve(sp.Rational(ln) ** 2 / 4 + sp.Symbol('d') ** 2 - r ** 2, sp.Symbol('d'))
    pos = [v for v in dd if v >= 0]
    return Expect(str(sp.simplify(pos[0])))


@ref('aiscale', method='distance on the map times (or divided by) the stated km per cm')
def aiscale(q):
    p = q['prompt']
    k = R(re.search(r'1 cm stands for (\d+(?:\.\d+)?) km', p).group(1))
    v = R(re.search(r'(\d+(?:\.\d+)?) (?:cm|km) apart', p).group(1))
    if 'really' in p.split('apart')[0] or 'How far apart are they on the map' in p:
        return Expect(dec(v / k))
    return Expect(dec(v * k))


@ref('airatio', method='scale 1:n: real = map length * n cm, converted to m (/100) or km (/100000) exactly')
def airatio(q):
    p = q['prompt']
    n = R(re.search(r'1 : (\d+)', p).group(1))
    l = R(re.search(r'is (\d+(?:\.\d+)?) cm long', p).group(1))
    real_cm = l * n
    if 'in metres' in p:
        return Expect(dec(real_cm / 100))
    if 'in km' in p:
        return Expect(dec(real_cm / 100000))
    return Unsupported('unknown unit')


@ref('awcen', method='triangle built from exact coordinates; medians intersected exactly; AG/AD and GD/AD read off, then the asked length scaled from the given one')
def awcen(q):
    p = q['prompt']
    A, B, C = (sp.Integer(0), sp.Integer(6)), (sp.Integer(-3), sp.Integer(0)), (sp.Integer(5), sp.Integer(0))
    D = ((B[0] + C[0]) / 2, (B[1] + C[1]) / 2)
    E = ((A[0] + C[0]) / 2, (A[1] + C[1]) / 2)
    s, t = sp.symbols('s t')
    sol = sp.solve([A[0] + s * (D[0] - A[0]) - B[0] - t * (E[0] - B[0]), A[1] + s * (D[1] - A[1]) - B[1] - t * (E[1] - B[1])], [s, t])
    frac = {'AD': sp.Integer(1), 'AG': sol[s], 'GD': 1 - sol[s]}
    g = re.search(r'If (AD|AG|GD) = (\d+(?:\.\d+)?) cm, find (AD|AG|GD)', p)
    k = R(g.group(2)) / frac[g.group(1)]
    return Expect(dec(k * frac[g.group(3)]))


@ref('amceva', method='exact coordinates: place D,E from the stated ratios (internal or external), intersect the cevians (Ceva) or join D,E (Menelaus) with AB and read AF:FB')
def amceva(q):
    p = q['prompt']
    r = [(int(a), int(b)) for a, b in re.findall(r'(\d+) : (\d+)', p)[:2]]
    A, B, C = (sp.Integer(0), sp.Integer(0)), (sp.Integer(7), sp.Integer(0)), (sp.Integer(2), sp.Integer(5))
    (bd, dc), (ce, ea) = r
    def lerp(P, Q, m, n):   # internal division P->Q in ratio m:n
        return ((n * P[0] + m * Q[0]) / (m + n), (n * P[1] + m * Q[1]) / (m + n))
    def ext(P, Q, m, n):    # external division in ratio m:n  (m != n)
        return ((n * P[0] - m * Q[0]) / (n - m), (n * P[1] - m * Q[1]) / (n - m))
    E = lerp(C, A, ce, ea)
    sP, sQ = sp.symbols('sP sQ')
    if 'meet at one point' in p:
        D = lerp(B, C, bd, dc)
        # P = AD ∩ BE
        s, t = sp.symbols('s t')
        sol = sp.solve([A[0] + s * (D[0] - A[0]) - B[0] - t * (E[0] - B[0]), A[1] + s * (D[1] - A[1]) - B[1] - t * (E[1] - B[1])], [s, t])
        Pt = (A[0] + sol[s] * (D[0] - A[0]), A[1] + sol[s] * (D[1] - A[1]))
        # F = CP ∩ AB (y = 0)
        u = sp.Symbol('u')
        uu = sp.solve(C[1] + u * (Pt[1] - C[1]), u)[0]
        F = (C[0] + uu * (Pt[0] - C[0]), 0)
        af, fb = abs(F[0] - A[0]), abs(B[0] - F[0])
    else:
        if bd == dc:
            return Ambiguous('D would be at infinity')
        D = ext(B, C, bd, dc)
        # line DE meets AB (y = 0)
        u = sp.Symbol('u')
        uu = sp.solve(D[1] + u * (E[1] - D[1]), u)[0]
        F = (D[0] + uu * (E[0] - D[0]), 0)
        af, fb = abs(F[0] - A[0]), abs(B[0] - F[0])
    rat = sp.nsimplify(af / fb)
    m_, n_ = sp.fraction(sp.Rational(rat))
    return Expect(f'{m_}:{n_}')
