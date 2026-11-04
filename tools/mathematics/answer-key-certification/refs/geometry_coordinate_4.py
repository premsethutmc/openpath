"""geometry-coordinate part 4: circles and conics (statement read; coefficient analysis with definition-based cross-checks)."""
from kit import ref, Expect, Verdict, Unsupported, Ambiguous, Fraction, sp
from refs.geometry_coordinate_util import *
import re, math

X, Y = x, y


def poly_of(txt):
    e = eqn(txt)
    P = sp.Poly(sp.expand(e), X, Y)
    g = lambda i, j: P.coeff_monomial(X ** i * Y ** j)
    return dict(A=g(2, 0), B=g(1, 1), C=g(0, 2), D=g(1, 0), E=g(0, 1), F=g(0, 0), e=sp.expand(e))


def analyse(txt):
    c = poly_of(txt)
    A, B, C, D, E, F = (c[k] for k in 'ABCDEF')
    if B != 0:
        raise ValueError('xy term')
    if A != 0 and C != 0:
        h, k = -D / (2 * A), -E / (2 * C)
        K = A * h * h + C * k * k - F
        c.update(h=h, k=k, K=K)
        if A == C:
            c['kind'] = 'circle'
            c['r2'] = K / A
        elif A * C > 0:
            c['kind'] = 'ellipse'
            c['ax'], c['ay'] = K / A, K / C  # squares of semi-axes along x and y
        else:
            c['kind'] = 'hyperbola'
            c['ax'], c['ay'] = K / A, K / C
    else:
        c['kind'] = 'parabola'
    return c


def eq_after(prompt, key):
    """equation text following the keyword (ellipse/hyperbola/parabola/circle), up to a delimiter"""
    p = U(prompt)
    m = re.search(key + r' ((?:[^,.?]|\.(?=\d))+?)(?: at the point|, find|, its|\?|\. Write|\. |\.$|$|,)', p)
    return m.group(1)


def sq(v):
    return sp.sqrt(v)


def foci_info(c):
    """(centre, orient, a2, b2, cc, e) for ellipse/hyperbola; transverse/major semi-axis a, other b"""
    h, k = c['h'], c['k']
    if c['kind'] == 'ellipse':
        if c['ax'] >= c['ay']:
            a2, b2, orient = c['ax'], c['ay'], 'x'
        else:
            a2, b2, orient = c['ay'], c['ax'], 'y'
        cc2 = a2 - b2
    else:
        if c['ax'] > 0:
            a2, b2, orient = c['ax'], -c['ay'], 'x'
        else:
            a2, b2, orient = c['ay'], -c['ax'], 'y'
        cc2 = a2 + b2
    cc = sq(cc2)
    return (h, k), orient, a2, b2, cc, sp.simplify(cc / sq(a2))


def onconic(c, P):
    return sp.simplify(c['e'].subs({X: P[0], Y: P[1]})) == 0


def parab(c):
    """vertex (h,k), signed c0, orientation: (y-k)^2 = c0 (x-h)  ('h') or (x-h)^2 = c0 (y-k) ('v')"""
    A, C, D, E, F = c['A'], c['C'], c['D'], c['E'], c['F']
    if A == 0:
        s = C
        e_ = E / (2 * s)
        c0 = -D / s
        g = e_ ** 2 - F / s
        h = -g / c0
        k = -e_
        return dict(o='h', h=h, k=k, c0=c0, focus=(h + c0 / 4, k), dirline=('x', h - c0 / 4), axis=('y', k))
    s = A
    e_ = D / (2 * s)
    c0 = -E / s
    g = e_ ** 2 - F / s
    k = -g / c0
    h = -e_
    return dict(o='v', h=h, k=k, c0=c0, focus=(h, k + c0 / 4), dirline=('y', k - c0 / 4), axis=('x', h))


def check_parab_def(pb, c):
    # sample points on the parabola and verify focus-directrix equidistance
    for t in (-2, -1, 1, 3):
        t = sp.Rational(t)
        if pb['o'] == 'h':
            yy = pb['k'] + t
            xx = pb['h'] + t * t / pb['c0']
            dd = abs(xx - pb['dirline'][1])
        else:
            xx = pb['h'] + t
            yy = pb['k'] + t * t / pb['c0']
            dd = abs(yy - pb['dirline'][1])
        assert onconic(c, (xx, yy))
        assert sp.simplify((xx - pb['focus'][0]) ** 2 + (yy - pb['focus'][1]) ** 2 - dd ** 2) == 0


@ref('arcirceq', method='circle from the defining condition: centre+radius expanded; centre+point radius^2=dist^2; diameter via (x-x1)(x-x2)+(y-y1)(y-y2)=0; three points by solving the linear system for D,E,F; every given point verified on the result')
def arcirceq(q):
    p = U(q['prompt'])
    if 'with centre' in p and 'radius' in p:
        (h, k), = [c for _, c in points(p)][:1]
        r = R(re.search(r'radius (' + NUM + ')', p).group(1))
        f = sp.expand((X - h) ** 2 + (Y - k) ** 2 - r ** 2)
        return Expect(str(f))
    if 'with centre' in p and 'passes through' in p:
        pts = [c for _, c in points(p)]
        (h, k), (a, b) = pts[0], pts[1]
        r2 = (a - h) ** 2 + (b - k) ** 2
        f = sp.expand((X - h) ** 2 + (Y - k) ** 2 - r2)
        assert f.subs({X: a, Y: b}) == 0
        return Expect(str(f))
    if 'as a diameter' in p:
        L = labelled(p)
        A, B = L['A'], L['B']
        f = sp.expand((X - A[0]) * (X - B[0]) + (Y - A[1]) * (Y - B[1]))
        return Expect(str(f))
    if 'passing through the points' in p:
        P3_ = [c for _, c in points(p)][:3]
        d_, e_, f_ = sp.symbols('d e f')
        sol = sp.solve([a * a + b * b + d_ * a + e_ * b + f_ for a, b in P3_], [d_, e_, f_], dict=True)
        if not sol:
            return Ambiguous('collinear points, no circle')
        s_ = sol[0]
        f = X ** 2 + Y ** 2 + s_[d_] * X + s_[e_] * Y + s_[f_]
        for a, b in P3_:
            assert f.subs({X: a, Y: b}) == 0
        return Expect(str(sp.expand(f)))
    return Unsupported('unknown arcirceq template')


@ref('arcircle', method='complete the square: centre (-D/2,-E/2), r^2 = h^2+k^2-F; r^2>0 required; r as exact surd')
def arcircle(q):
    c = analyse(eq_after(q['prompt'], 'circle'))
    if c['kind'] != 'circle':
        return Ambiguous('not a circle')
    r2 = c['r2']
    if r2 <= 0:
        return Ambiguous('r^2 not positive: point or empty circle')
    return Expect(tup(c['h'], c['k'], sq(r2)))


@ref('arconeq', method='unknowns A,B from the given data; foci/vertices give c^2 and a^2 (ellipse c^2=a^2-b^2, hyperbola c^2=a^2+b^2), e=c/a, latus rectum 2b^2/a, point on curve: substitution; result cross-checked by the focal-distance definition at a sample point')
def arconeq(q):
    p = U(q['prompt'])
    ell = p.startswith('An ellipse')
    horiz = '(±' in p.split(' and ')[0] and re.search(r'\(±\d+, 0\)', p) is not None
    # data
    foci = re.search(r'foci \((±\d+), (\d+)\)|foci \((\d+), (±\d+)\)', p)
    A_, B_ = sp.symbols('A B', positive=True)
    # transverse axis along the axis where the first (±) appears
    h = bool(re.search(r'\(±\d+, 0\)', p))
    cc = None
    m = re.search(r'foci \(([^)]*)\)', p)
    if m:
        cc = R(re.search(r'±(\d+)', m.group(1)).group(1))
    m = re.search(r'vertices \(([^)]*)\)', p)
    aa = R(re.search(r'±(\d+)', m.group(1)).group(1)) if m else None
    e = None
    m = re.search(r'eccentricity (' + NUM + ')', p)
    if m:
        e = R(m.group(1))
    lr = None
    m = re.search(r'latus rectum of length (' + NUM + ')', p)
    if m:
        lr = R(m.group(1))
    pt = None
    m = re.search(r'passes through the point \((' + NUM + '), (' + NUM + r')\)', p)
    if m:
        pt = (R(m.group(1)), R(m.group(2)))
    a2, b2 = sp.symbols('a2 b2', positive=True)
    sgn = -1 if not ell else 1  # x^2/a2 + sgn*y^2/b2 = 1 style with (a2 = transverse/major^2)
    eqs = []
    cs = (a2 - b2) if ell else (a2 + b2)
    if cc is not None:
        eqs.append(sp.Eq(cs, cc ** 2))
    if aa is not None:
        eqs.append(sp.Eq(a2, aa ** 2))
    if e is not None:
        eqs.append(sp.Eq(cs, e ** 2 * a2))
    if lr is not None:
        eqs.append(sp.Eq(2 * b2, lr * sp.sqrt(a2)))
    if pt is not None:
        u, v = (pt[0], pt[1]) if h else (pt[1], pt[0])
        eqs.append(sp.Eq(u ** 2 / a2 + (v ** 2 / b2) * (1 if ell else -1), 1))
    sols = sp.solve(eqs, [a2, b2], dict=True)
    sols = [s_ for s_ in sols if s_[a2].is_positive and s_[b2].is_positive]
    if len(sols) != 1:
        return Ambiguous(f'{len(sols)} solutions for (a2,b2)')
    s_ = sols[0]
    # definition check: focal property at a sample point of the curve
    A2, B2 = s_[a2], s_[b2]
    c_ = sp.sqrt(cs.subs(s_))
    if ell:
        t = sp.Rational(1, 3)
        u = sp.sqrt(A2) * sp.cos(t)
        v = sp.sqrt(B2) * sp.sin(t)
        d1 = math.hypot(float(u - c_), float(v))
        d2 = math.hypot(float(u + c_), float(v))
        assert abs(d1 + d2 - 2 * float(sp.sqrt(A2))) < 1e-9
    else:
        t = sp.Rational(1, 3)
        u = sp.sqrt(A2) * sp.cosh(t)
        v = sp.sqrt(B2) * sp.sinh(t)
        d1 = math.hypot(float(u - c_), float(v))
        d2 = math.hypot(float(u + c_), float(v))
        assert abs(abs(d1 - d2) - 2 * float(sp.sqrt(A2))) < 1e-9
    if ell:
        AB = (A2, B2) if h else (B2, A2)
    else:
        AB = (A2, B2)  # hyperbola forms x^2/A - y^2/B and y^2/A - x^2/B both have A transverse
    return Expect(tup(*AB))


@ref('arcircpos', method='compare squared distance from the centre to the point with r^2 (completed square); class only (option letters are not exported)')
def arcircpos(q):
    p = U(q['prompt'])
    P = [c for _, c in points(p)][0]
    c = analyse(re.search(r'circle (.+?)\?', p).group(1))
    if c['kind'] != 'circle' or c['r2'] <= 0:
        return Ambiguous('degenerate circle')
    d2 = (P[0] - c['h']) ** 2 + (P[1] - c['k']) ** 2
    cl = 'inside' if d2 < c['r2'] else ('on' if d2 == c['r2'] else 'outside')
    return Unsupported(f'option texts not exported and letters appear shuffled per question; independent class = {cl}')


@ref('areccentric', method='e = c/a from completed-square semi-axes (c^2=a^2-b^2 or a^2+b^2), exact')
def areccentric(q):
    c = analyse(eq_after(q['prompt'], '(?:ellipse|hyperbola)'))
    if c['kind'] not in ('ellipse', 'hyperbola'):
        return Ambiguous('not a central conic')
    (_, _), o, a2, b2, cc, e = foci_info(c)
    return Expect(str(e))


@ref('arparabola', method='vertex form (y-k)^2=c0(x-h) -> focus (h+c0/4,k) (or the x/y swap); verified by sampling points on the parabola for focus/directrix equidistance')
def arparabola(q):
    c = analyse(eq_after(q['prompt'], 'parabola'))
    pb = parab(c)
    check_parab_def(pb, c)
    return Expect(tup(*pb['focus']))


@ref('arparaeq', method='locus definition |PF| = dist(P, directrix) expanded for focus/directrix cases; passes-through case by substitution; latus rectum via chord through the focus; k read off y^2=kx')
def arparaeq(q):
    p = U(q['prompt'])
    horiz = 'y² = kx' in q['prompt'] or 'y^2 = kx' in p
    if 'focus at' in p:
        f = [c for _, c in points(p)][0]
        if horiz:
            eqn_ = sp.expand((X - f[0]) ** 2 + Y ** 2 - (X + f[0]) ** 2)  # directrix x = -p by vertex at origin
            return Expect(str(sp.solve(sp.Eq(Y ** 2 - sp.Symbol('k') * X, 0).subs({}), sp.Symbol('k'))[0] if False else eqn_.coeff(X, 1) * -1))
        eqn_ = sp.expand(X ** 2 + (Y - f[1]) ** 2 - (Y + f[1]) ** 2)
        return Expect(str(-eqn_.coeff(Y, 1)))
    if 'directrix is the line' in p:
        dl = R(re.search(r'line [xy] = (' + NUM + ')', p).group(1))
        # vertex at origin: focus is the mirror of the directrix in the vertex
        if horiz:
            eqn_ = sp.expand((X + dl) ** 2 + Y ** 2 - (X - dl) ** 2)
            return Expect(str(-eqn_.coeff(X, 1)))
        eqn_ = sp.expand(X ** 2 + (Y + dl) ** 2 - (Y - dl) ** 2)
        return Expect(str(-eqn_.coeff(Y, 1)))
    if 'passes through' in p:
        a, b = [c for _, c in points(p)][0]
        if horiz:
            if a == 0:
                return Ambiguous('point on the axis perpendicular...')
            return Expect(str(b * b / a))
        if b == 0:
            return Ambiguous('degenerate')
        return Expect(str(a * a / b))
    if 'latus rectum' in p:
        ln = R(re.search(r'length (' + NUM + ')', p).group(1))
        sign = 1 if 'positive' in p else -1
        return Expect(str(sign * ln))
    return Unsupported('unknown arparaeq template')


@ref('arconprop', method='properties from the completed-square form; latus rectum measured as the actual chord through the focus; directrices checked by the focus-directrix ratio e at a sample point; parabola: vertex form')
def arconprop(q):
    p = U(q['prompt'])
    kind = re.match(r'For the (\w+)', p).group(1)
    eq = re.search(r'For the \w+ (.+?)(?:, its|, find|, one|; )', p).group(1)
    c = analyse(eq)
    if kind == 'parabola':
        pb = parab(c)
        check_parab_def(pb, c)
        if 'latus rectum' in p:
            # chord through the focus perpendicular to the axis
            f = pb['focus']
            if pb['o'] == 'h':
                ys = sp.solve(c['e'].subs(X, f[0]), Y)
            else:
                ys = sp.solve(c['e'].subs(Y, f[1]), X)
            assert len(ys) == 2
            return Expect(str(sp.simplify(abs(ys[0] - ys[1]))))
        if 'axis' in p:
            return Expect(str(pb['axis'][1]))
        if 'directrix' in p and 'distance' not in p:
            return Expect(str(pb['dirline'][1]))
        if 'distance between its focus and its directrix' in p:
            f = pb['focus']
            dd = abs((f[0] if pb['o'] == 'h' else f[1]) - pb['dirline'][1])
            return Expect(str(dd))
        return Unsupported('unknown parabola property')
    if c['kind'] not in ('ellipse', 'hyperbola'):
        return Ambiguous('not a central conic')
    (h, k), o, a2, b2, cc, e = foci_info(c)
    if 'latus rectum' in p:
        f = (h + cc, k) if o == 'x' else (h, k + cc)
        ys = sp.solve(c['e'].subs(X if o == 'x' else Y, f[0] if o == 'x' else f[1]), Y if o == 'x' else X)
        assert len(ys) == 2
        return Expect(str(sp.simplify(abs(ys[0] - ys[1]))))
    if 'directrices' in p or 'directrix' in p:
        d = a2 / cc if True else None
        # definition check: PF / dist(P, directrix) = e at a sample point
        t = sp.Rational(1, 3)
        if c['kind'] == 'ellipse':
            u, v = sp.sqrt(a2) * sp.cos(t), sp.sqrt(b2) * sp.sin(t)
        else:
            u, v = sp.sqrt(a2) * sp.cosh(t), sp.sqrt(b2) * sp.sinh(t)
        pf = math.hypot(float(u - cc), float(v))
        assert abs(pf / abs(float(u) - float(d)) - float(e)) < 1e-9
        return Expect(str(sp.simplify(d)))
    a_, b_ = sq(a2), sq(b2)
    if 'distance between its foci' in p:
        # foci are the two points at distance cc from the centre on the focal axis; checked by the focal-sum definition at a vertex
        F1 = (h + cc, k) if o == 'x' else (h, k + cc)
        F2 = (h - cc, k) if o == 'x' else (h, k - cc)
        V = (h + a_, k) if o == 'x' else (h, k + a_)
        s1 = sp.sqrt((V[0] - F1[0]) ** 2 + (V[1] - F1[1]) ** 2)
        s2 = sp.sqrt((V[0] - F2[0]) ** 2 + (V[1] - F2[1]) ** 2)
        assert sp.simplify((s1 + s2 if c['kind'] == 'ellipse' else abs(s1 - s2)) - 2 * a_) == 0
        return Expect(str(sp.simplify(sp.sqrt((F1[0] - F2[0]) ** 2 + (F1[1] - F2[1]) ** 2))))
    if 'major axis' in p or 'transverse axis' in p:
        return Expect(str(sp.simplify(2 * a_)))
    if 'minor axis' in p or 'conjugate axis' in p:
        return Expect(str(sp.simplify(2 * b_)))
    m = re.search(r'one of its vertices is \((d|-?\d+), (d|-?\d+)\)', p)
    if m:
        along_x = m.group(1) == 'd'
        if (o == 'x') != along_x:
            return Ambiguous('asked point lies on the minor/conjugate axis (co-vertex), not a vertex' if c['kind'] == 'ellipse' else 'no real point of the hyperbola on that axis')
        return Expect(str(sp.simplify(a_)))
    return Unsupported('unknown central-conic property')


@ref('arconicarea', method='definite integration with SymPy of the region between the curves (intersection points solved), ellipse via integrating b*sqrt(1-x^2/a^2) over the quadrant')
def arconicarea(q):
    p = U(q['prompt'])
    if 'parabola y^2' in p.replace('²', '^2') or 'parabola y^2' in p:
        kk = R(re.search(r'y\^2 = (\d*)x', p).group(1) or '1')
        cx = R(re.search(r'line x = (' + NUM + ')', p).group(1))
        yy = sp.symbols('yy')
        top = sp.sqrt(kk * cx)
        area = sp.integrate(cx - yy ** 2 / kk, (yy, -top, top))
        return Expect(str(sp.simplify(area)))
    if 'parabola y =' in p:
        a = R(re.search(r'y = (\d*)x\^2', p).group(1) or '1')
        m = R(re.search(r'line y = (\d*)x', p).group(1) or '1')
        xs = sorted(sp.solve(a * X ** 2 - m * X, X))
        area = sp.integrate(m * X - a * X ** 2, (X, xs[0], xs[1]))
        return Expect(str(sp.simplify(abs(area))))
    if 'ellipse' in p:
        eq = re.search(r'ellipse (?:region that lies in the first quadrant, for the ellipse )?(.+?)\.$', p)
        e_ = re.search(r'(x\^2.*? = 1)', p).group(1)
        c = analyse(e_)
        a, b = sq(c['ax']), sq(c['ay'])
        quad = sp.integrate(b * sp.sqrt(1 - X ** 2 / a ** 2), (X, 0, a))
        quad = sp.simplify(quad)
        if 'first quadrant' in p:
            return Expect(str(quad))
        return Expect(str(sp.simplify(4 * quad)))
    return Unsupported('unknown arconicarea template')


@ref('arconapp', method='each application modelled from the statement: parabola y=H(1-x^2/(w/2)^2), semi-ellipse y=H sqrt(1-x^2/(w/2)^2), cable y=low+(high-low)(x/(w/2))^2, orbit perihelion a(1-e), dish focus p from depth=r^2/(4p)')
def arconapp(q):
    p = U(q['prompt'])
    nums = [R(v) for v in re.findall(r'(\d+(?:\.\d+)?)', p)]
    if 'parabolic arch' in p:
        w, H, d = [R(v) for v in re.search(r'is (\d+) m wide at the ground and (\d+) m high at its centre\. How high is the arch, in metres, at a point (\d+) m', p).groups()]
        a = w / 2
        # y = H - k x^2 with y(a)=0
        k = H / a ** 2
        return Expect(str(H - k * d * d))
    if 'semi-elliptical' in p:
        w, H, d = [R(v) for v in re.search(r'(\d+) m wide at the water level and (\d+) m high at its centre\. How high is the arch, in metres, at a point (\d+) m', p).groups()]
        a = w / 2
        val = H * sp.sqrt(1 - sp.Rational(d * d) / (a * a))
        return Expect(str(sp.nsimplify(val)))
    if 'suspension' in p:
        w, hi, lo, d = [R(v) for v in re.search(r'towers (\d+) m apart\. It is (\d+) m above the road at the towers and (\d+) m above the road at the centre of the bridge\. How high above the road, in metres, is the cable at a point (\d+) m', p).groups()]
        a = w / 2
        k = (hi - lo) / a ** 2
        return Expect(str(lo + k * d * d))
    if 'comet' in p:
        L2, e = [R(v) for v in re.search(r'axis of the orbit is (\d+) million km long and the eccentricity is (\d+(?:\.\d+)?)', p).groups()]
        a = L2 / 2
        # least distance: point on the ellipse nearest the focus, minimise distance to focus numerically-exactly: r = a - c
        c = a * e
        b = sp.sqrt(a * a - c * c)
        best = min(math.hypot(float(a) * math.cos(i * math.pi / 5000) - float(c), float(b) * math.sin(i * math.pi / 5000)) for i in range(5001))
        assert abs(best - float(a - c)) < 1e-4
        if 'greatest' in p:
            worst = max(math.hypot(float(a) * math.cos(i * math.pi / 5000) - float(c), float(b) * math.sin(i * math.pi / 5000)) for i in range(5001))
            assert abs(worst - float(a + c)) < 1e-4
            return Expect(str(a + c))
        return Expect(str(a - c))
    if 'dish antenna' in p:
        wd, dp = [R(v) for v in re.search(r'is (\d+) cm across its rim and (\d+) cm deep', p).groups()]
        r = wd / 2
        pp = r * r / (4 * dp)
        return Expect(str(pp))
    return Unsupported('unknown arconapp template')


@ref('arcone', method='cone/plane section: ellipse if plane angle with axis > semi-vertical angle, parabola if equal, hyperbola if less (angle with the axis); class only (option letters not exported)')
def arcone(q):
    return Unsupported('option texts not exported; classification needs the options (circle/ellipse/parabola/hyperbola order unknown)')
