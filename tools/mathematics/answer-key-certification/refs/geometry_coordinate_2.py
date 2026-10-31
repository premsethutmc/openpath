"""geometry-coordinate part 2: straight lines in the plane (statement-read, sympy exact arithmetic)."""
from kit import ref, Expect, Verdict, Unsupported, Ambiguous, Fraction, sp
from refs.geometry_coordinate_util import *
import re, math

k_ = sp.Symbol('k')


def line_through(P, m):
    return m * (x - P[0]) + P[1]


def two_pts(q):
    L = labelled(q['prompt'])
    return L


def lin_eqs(p):
    """linear equations 'ax + by + c = 0' in the prompt, as (a,b,c) tuples of Rationals, in order"""
    out = []
    for m in re.finditer(r'((?:[-+]?\s*\d*\s*[xy]\s*)+(?:[-+]\s*\d+)?\s*=\s*0)', U(p)):
        e = eqn(m.group(1))
        out.append(tuple(coeffs(e)))
    return out


def rhs_text(m, c):
    return str(sp.simplify(m * x + c))


@ref('ascoll', method='slopes: slope(AB) = slope(AC) solved for k, then verified by substitution (zero triangle area)')
def ascoll(q):
    p = U(q['prompt'])
    L = labelled(p.replace('(' + re.search(r'C\(([^)]*)\)', p).group(1) + ')', '(0,0)') if False else p)
    m = re.search(r'A\((.*?)\), B\((.*?)\) and C\((.*?), k\)', p)
    A = [R(t) for t in m.group(1).split(',')]
    B = [R(t) for t in m.group(2).split(',')]
    cx = R(m.group(3))
    if A[0] == B[0]:
        return Ambiguous('AB vertical: slope undefined')
    s = (B[1] - A[1]) / (B[0] - A[0])
    if cx == A[0]:
        return Ambiguous('C above A: slope AC undefined')
    kk = A[1] + s * (cx - A[0])
    sol = sp.solve(s - (k_ - A[1]) / (cx - A[0]), k_)
    assert sol == [kk]
    area = (B[0] - A[0]) * (kk - A[1]) - (cx - A[0]) * (B[1] - A[1])
    assert area == 0
    return Expect(str(kk))


@ref('asline', method='two-point slope m=(y2-y1)/(x2-x1), c from A, verified that A and B satisfy the proposed line')
def asline(q):
    L = labelled(q['prompt'])
    A, B = L['A'], L['B']
    if A[0] == B[0]:
        return Ambiguous('vertical line has no y=mx+c form')
    m = (B[1] - A[1]) / (B[0] - A[0])
    c = A[1] - m * A[0]
    assert m * B[0] + c == B[1]
    return Expect(rhs_text(m, c))


@ref('aslineq', method='each template solved from the defining geometric condition (point-slope, intercepts, midpoint, section, normal form) and verified by substituting the defining points')
def aslineq(q):
    p = U(q['prompt'])
    if 'point–slope' in p or 'point-slope' in p:
        P = unlabelled(p)[0]
        m = R(re.search(r'with slope (' + NUM + ')', p).group(1))
        return Expect(rhs_text(m, P[1] - m * P[0]))
    if 'Using the intercept form' in p:
        a, b = [R(t) for t in re.search(r'intercept of (' + NUM + r') on the x-axis and (' + NUM + ') on the y-axis', p).groups()]
        if a == 0 or b == 0:
            return Ambiguous('zero intercept')
        m = -b / a
        assert m * a + b == 0
        return Expect(rhs_text(m, b))
    if 'equal intercepts' in p:
        P = unlabelled(p)[0]
        k = P[0] + P[1]  # x/k + y/k = 1 => x + y = k
        if k == 0:
            return Ambiguous('k would be 0 contradicting k != 0')
        assert P[0] / k + P[1] / k == 1
        return Expect(str(k))
    if 'bisected' in p:
        P = unlabelled(p)[0]
        a, b = 2 * P[0], 2 * P[1]
        if a == 0 or b == 0:
            return Ambiguous('midpoint on an axis')
        m = -b / a
        return Expect(rhs_text(m, b))
    if 'parallel to the y-axis' in p:
        L = labelled(p)
        return Expect(str((L['A'][0] + L['B'][0]) / 2))
    if 'ratio' in p and 'parallel to the x-axis' in p:
        L = labelled(p)
        mm, nn = [R(t) for t in re.search(r'ratio (\d+) : (\d+)', p).groups()]
        A, B = L['A'], L['B']
        return Expect(str((nn * A[1] + mm * B[1]) / (mm + nn)))
    if 'normal form' in p:
        pp = R(re.search(r'has length (' + NUM + ')', p).group(1))
        w = sp.Integer(int(re.search(r'angle of (\d+)°', p).group(1))) * sp.pi / 180
        if sp.sin(w) == 0:
            return Ambiguous('vertical line, no y = mx + c')
        m = -sp.cos(w) / sp.sin(w)
        c = pp / sp.sin(w)
        return Expect(rhs_text(sp.simplify(m), sp.simplify(c)))
    return Unsupported('unknown template')


def inters(L1, L2):
    s = sp.solve([L1[0] * x + L1[1] * y + L1[2], L2[0] * x + L2[1] * y + L2[2]], [x, y], dict=True)
    return (s[0][x], s[0][y]) if s else None


def line_from_point_slope_vector(P, d):
    """line through P with direction d=(dx,dy) as y = m x + c, or None when vertical"""
    if d[0] == 0:
        return None
    m = sp.Rational(d[1]) / d[0]
    return m, P[1] - m * P[0]


@ref('asgenf', method='lines handled by explicit intercepts/direction vectors: slope=-a/b, intercepts by setting x or y to 0, normal form by normalising (a,b,c) so p=-c/N>0 and omega=atan2, parallel/perpendicular via direction vector (b,-a) / (a,b); results verified by substitution')
def asgenf(q):
    p = U(q['prompt'])
    e = lin_eqs(p)
    if not e:
        return Unsupported('no equation parsed')
    a, b, c = e[-1]
    if p.startswith('Write the line') and 'slope–intercept form' in p:
        if b == 0:
            return Ambiguous('vertical line has no slope-intercept form')
        if 'its slope' in p:
            return Expect(str(-a / b))
        if 'y-intercept' in p:
            return Expect(str(-c / b))
        if 'x-intercept' in p:
            return Expect(str(-c / a)) if a != 0 else Ambiguous('no x-intercept')
    if 'intercept form' in p and p.startswith('Write the line'):
        if c == 0 or a == 0 or b == 0:
            return Ambiguous('intercept form needs a, b, c all nonzero')
        if 'x-intercept a' in p:
            return Expect(str(-c / a))
        if 'y-intercept b' in p:
            return Expect(str(-c / b))
    if 'normal form' in p:
        N = sp.sqrt(a * a + b * b)
        if c == 0:
            return Ambiguous('p = 0 but the statement requires p > 0')
        sgn = 1 if -c > 0 else -1
        co, si = sgn * a / N, sgn * b / N
        pp = sgn * -c / N
        assert sp.simplify(co ** 2 + si ** 2) == 1 and pp > 0
        if 'Find p' in p:
            return Expect(str(sp.simplify(pp)))
        w = sp.atan2(si, co)
        if w < 0:
            w += 2 * sp.pi
        deg = sp.nsimplify(sp.simplify(w * 180 / sp.pi))
        if 'Find ω' in p:
            return Expect(str(deg))
    if p.startswith('Find the equation of the line through'):
        P = unlabelled(p)[0]
        if 'parallel' in p:
            d = (b, -a)
        elif 'perpendicular' in p:
            d = (a, b)
        else:
            return Unsupported('unknown asgenf relation')
        r = line_from_point_slope_vector(P, d)
        if r is None:
            return Ambiguous('result is vertical, no y = mx + c')
        m, cc = r
        assert m * P[0] + cc == P[1]
        return Expect(rhs_text(m, cc))
    return Unsupported('unknown asgenf template: ' + p[:60])


@ref('asfam', method='intersection point by solving the two equations (not via the L1+lambda L2 family), then the required line from a point and direction; verified by substitution')
def asfam(q):
    p = U(q['prompt'])
    e = lin_eqs(p.split('(You may')[0])
    L1, L2 = e[0], e[1]
    P = inters(L1, L2)
    if P is None:
        return Ambiguous('lines are parallel, no intersection')
    if 'passes through' in p:
        Q = unlabelled(p)[0]
        if Q == P:
            return Ambiguous('target point coincides with the intersection')
        d = (Q[0] - P[0], Q[1] - P[1])
    elif 'parallel to' in p:
        a, b, c = e[2]
        d = (b, -a)
    elif 'perpendicular to' in p:
        a, b, c = e[2]
        d = (a, b)
    else:
        return Unsupported('unknown asfam template')
    r = line_from_point_slope_vector(P, d)
    if r is None:
        return Ambiguous('vertical, no y = mx + c')
    m, cc = r
    assert m * P[0] + cc == P[1]
    return Expect(rhs_text(m, cc))


@ref('asslope', method='tan of inclination via sympy exact trigonometric values; inclination from slope via atan evaluated exactly, checked with tan(answer)=slope', )
def asslope(q):
    p = U(q['prompt'])
    if 'has slope' in p and 'Find its inclination' in p:
        s = expr(re.search(r'has slope (.+?)\. Find', p).group(1))
        th = sp.nsimplify(sp.simplify(sp.atan(s) * 180 / sp.pi))
        if th < 0:
            th += 180
        assert sp.simplify(sp.tan(th * sp.pi / 180) - s) == 0
        return Expect(str(th))
    th = int(re.search(r'(\d+)°', p).group(1))
    if th == 90:
        return Ambiguous('inclination 90 has no slope')
    m = sp.simplify(sp.tan(sp.Integer(th) * sp.pi / 180))
    if 'Find its slope' in p:
        return Expect(str(m))
    P = unlabelled(p)[0]
    return Expect(rhs_text(m, sp.simplify(P[1] - m * P[0])))


@ref('aslang', method='acute angle between lines from direction vectors: tan = |cross|/|dot| of (b,-a) vectors, cross-checked with |m1-m2|/|1+m1m2| when slopes exist')
def aslang(q):
    e = lin_eqs(U(q['prompt']))
    (a1, b1, c1), (a2, b2, c2) = e[0], e[1]
    d1, d2 = (b1, -a1), (b2, -a2)
    cross = d1[0] * d2[1] - d1[1] * d2[0]
    dot = d1[0] * d2[0] + d1[1] * d2[1]
    if dot == 0:
        return Ambiguous('lines perpendicular: tan of 90 degrees is undefined')
    t = abs(cross) / abs(dot)
    if b1 != 0 and b2 != 0:
        m1, m2 = -a1 / b1, -a2 / b2
        assert abs(m1 - m2) / abs(1 + m1 * m2) == t
    if t == 0:
        return Ambiguous('lines parallel: no angle between them')
    return Expect(str(t))


def norm_dist(P, a, b, c):
    """distance from P to line a x + b y + c = 0 via the foot of the perpendicular (not the |..|/sqrt formula)"""
    t = sp.Symbol('t')
    F = (P[0] + t * a, P[1] + t * b)
    ts = sp.solve(a * F[0] + b * F[1] + c, t)[0]
    foot = (P[0] + ts * a, P[1] + ts * b)
    return sp.sqrt(sp.simplify((P[0] - foot[0]) ** 2 + (P[1] - foot[1]) ** 2))


@ref('asperpd', method='foot of the perpendicular solved explicitly then distance P-foot (not the |ax+by+c|/sqrt formula)')
def asperpd(q):
    p = U(q['prompt'])
    P = unlabelled(p)[0]
    a, b, c = lin_eqs(p)[0]
    d = norm_dist(P, a, b, c)
    return Expect(str(sp.simplify(d)))


@ref('asparld', method='take a point on line 1 (exact) and measure its distance to line 2 through the explicit foot of perpendicular; parallelism asserted')
def asparld(q):
    (a1, b1, c1), (a2, b2, c2) = lin_eqs(U(q['prompt']))
    if a1 * b2 - a2 * b1 != 0:
        return Verdict(False, 'lines are not parallel')
    if b1 != 0:
        P = (sp.Integer(0), -c1 / b1)
    else:
        P = (-c1 / a1, sp.Integer(0))
    assert a1 * P[0] + b1 * P[1] + c1 == 0
    d = norm_dist(P, a2, b2, c2)
    if d == 0:
        return Ambiguous('lines coincide, distance 0')
    return Expect(str(sp.simplify(d)))


@ref('aslocus', method='locus from the definition PA^2 = k^2 PB^2 expanded and normalised to monic x^2+y^2; verified numerically that sample points on the circle have PA/PB = k')
def aslocus(q):
    p = U(q['prompt'])
    L = labelled(p)
    A, B = L['A'], L['B']
    k = R(re.search(r'always (' + NUM + ') times', p).group(1))
    if k == 1:
        return Ambiguous('k = 1 gives a line, not x^2+y^2+px+qy+r=0')
    f = sp.expand((x - A[0]) ** 2 + (y - A[1]) ** 2 - k ** 2 * ((x - B[0]) ** 2 + (y - B[1]) ** 2))
    f = sp.expand(f / (1 - k ** 2))
    # numeric check: centre/radius, 8 points
    cx, cy = -f.coeff(x, 1) / 2, -f.coeff(y, 1) / 2
    r2 = cx ** 2 + cy ** 2 - f.subs({x: 0, y: 0})
    if r2 <= 0:
        return Ambiguous('empty or point locus')
    for th in range(8):
        px = float(cx) + float(sp.sqrt(r2)) * math.cos(th)
        py = float(cy) + float(sp.sqrt(r2)) * math.sin(th)
        da = math.hypot(px - float(A[0]), py - float(A[1]))
        db = math.hypot(px - float(B[0]), py - float(B[1]))
        assert abs(da - float(k) * db) < 1e-7, (da, db)
    return Expect(str(f))


@ref('aslocpar', method='x solved from (x-a)^2+(y-b)^2=(x-c)^2; verified numerically that sample points equidistant from S and the line')
def aslocpar(q):
    p = U(q['prompt'])
    S = labelled(p)['S']
    c = R(re.search(r'line x = (' + NUM + ')', p).group(1))
    if S[0] == c:
        return Ambiguous('S lies on the line: locus is a line')
    xe = (c ** 2 - S[0] ** 2 - (y - S[1]) ** 2) / (2 * (c - S[0]))
    for yv in (0, 1, -2, 3):
        xv = xe.subs(y, yv)
        assert (xv - S[0]) ** 2 + (yv - S[1]) ** 2 == (xv - c) ** 2
    return Expect(str(sp.expand(xe)))


def pair_parts(p):
    e = eqn(re.search(r'equation (.+? = 0)', p).group(1)) if p.startswith('The equation') else eqn(re.search(r'lines (.+? = 0)', p).group(1))
    P = sp.Poly(sp.expand(e), x, y)
    return P.coeff_monomial(x ** 2), P.coeff_monomial(x * y), P.coeff_monomial(y ** 2)


def pair_slopes(a, b2, c):
    m = sp.Symbol('m')
    if c == 0:
        return None
    return sp.solve(c * m ** 2 + b2 * m + a, m)


@ref('aspair', method='slopes m solve  c m^2 + b m + a = 0 (substituting y = m x); verified each root satisfies a x^2 + b x y + c y^2 = 0 at x=1,y=m')
def aspair(q):
    p = U(q['prompt'])
    a, b, c = pair_parts(p)
    if c == 0:
        return Ambiguous('one line is x = 0, slope undefined')
    r = pair_slopes(a, b, c)
    for m in r:
        assert a + b * m + c * m * m == 0
    if len(r) == 1 or b * b == 4 * a * c:
        return Ambiguous('repeated line: one slope or two equal slopes?')
    return Expect(', '.join(str(sp.nsimplify(v)) for v in r))


@ref('aspairang', method='acute angle between lines y=m1 x, y=m2 x with m from the quadratic; tan=|m1-m2|/|1+m1 m2|')
def aspairang(q):
    a, b, c = pair_parts(U(q['prompt']))
    if c == 0:
        return Ambiguous('vertical line in the pair')
    r = pair_slopes(a, b, c)
    if len(r) == 1:
        return Ambiguous('coincident lines')
    m1, m2 = r
    if sp.simplify(1 + m1 * m2) == 0:
        return Ambiguous('perpendicular pair: tan undefined')
    return Expect(str(sp.simplify(abs(m1 - m2) / abs(1 + m1 * m2))))


@ref('aspairbis', method='direction vectors of the two lines, unit-vector sum/difference give bisector directions; product of the two bisector line forms normalised to x^2 + kxy - y^2')
def aspairbis(q):
    a, b, c = pair_parts(U(q['prompt']))
    if c == 0:
        return Ambiguous('vertical line in the pair')
    r = pair_slopes(a, b, c)
    if len(r) == 1:
        return Ambiguous('coincident lines')
    u = []
    for m in r:
        n = sp.sqrt(1 + m * m)
        u.append((1 / n, m / n))
    d1 = (u[0][0] + u[1][0], u[0][1] + u[1][1])
    d2 = (u[0][0] - u[1][0], u[0][1] - u[1][1])
    d1 = tuple(sp.simplify(v) for v in d1)
    d2 = tuple(sp.simplify(v) for v in d2)
    f = sp.expand((d1[1] * x - d1[0] * y) * (d2[1] * x - d2[0] * y))
    P = sp.Poly(f, x, y)
    cx2, cxy, cy2 = P.coeff_monomial(x ** 2), P.coeff_monomial(x * y), P.coeff_monomial(y ** 2)
    if sp.simplify(cx2) == 0:
        return Ambiguous('bisector is the y-axis; x^2 coefficient 0')
    assert sp.simplify(cy2 + cx2) == 0
    k = sp.simplify(cxy / cx2)
    return Expect(str(sp.nsimplify(k)))
