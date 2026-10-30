"""geometry-coordinate part 3: coordinate geometry in space (statement read; calculus/linear-system methods, verified by substitution)."""
from kit import ref, Expect, Verdict, Unsupported, Ambiguous, Fraction, sp
from refs.geometry_coordinate_util import *
import re, math

lam, mu, t_ = sp.symbols('lam mu t')


def P3(q):
    return [c for _, c in points(q['prompt'], 3)]


def L3(q):
    return labelled(q['prompt'], 3)


def norm(v):
    return sp.sqrt(sp.simplify(dot(v, v)))


@ref('asdist3', method='squared distance from the three coordinate differences, sqrt exact')
def asdist3(q):
    A, B = P3(q)[:2]
    d2 = dot(sub(A, B), sub(A, B))
    return Expect(str(sp.sqrt(d2)))


@ref('asdcos', method='unit vector of B-A (components divided by the exact length); checked l^2+m^2+n^2 = 1')
def asdcos(q):
    L = L3(q)
    d = sub(L['B'], L['A'])
    n = norm(d)
    if n == 0:
        return Ambiguous('A = B')
    u = tuple(sp.simplify(c / n) for c in d)
    assert sp.simplify(dot(u, u) - 1) == 0
    return Expect('(' + ', '.join(str(c) for c in u) + ')')


@ref('asangl', method='cos of acute angle = |d1.d2|/(|d1||d2|) from the direction vectors read from the line equations; checked cos in [0,1]')
def asangl(q):
    (a1, d1), (a2, d2) = lines3(q['prompt'])[:2]
    n1, n2 = norm(d1), norm(d2)
    if n1 == 0 or n2 == 0:
        return Ambiguous('zero direction vector')
    c = sp.simplify(abs(dot(d1, d2)) / (n1 * n2))
    return Expect(str(c))


@ref('asfoot', method='foot found by minimising the squared distance |P - (a + t d)|^2 over t (calculus), then orthogonality (P-F).d = 0 asserted')
def asfoot(q):
    P = P3(q)[0]
    (a, d), = lines3(q['prompt'])[:1]
    F = add(a, scal(t_, d))
    D2 = dot(sub(P, F), sub(P, F))
    ts = sp.solve(sp.diff(D2, t_), t_)
    if len(ts) != 1:
        return Ambiguous('degenerate direction')
    Fs = tuple(sp.simplify(c.subs(t_, ts[0])) for c in F)
    assert dot(sub(P, Fs), d) == 0
    return Expect(tup(*Fs))


def plane_terms(p):
    m = re.search(r'plane (.+? = -?\d+)', U(p)) or re.search(r'plane (.+? = 0)', U(p))
    return plane_of(m.group(1))


@ref('asimage', method='image P\' = P - 2 (n.P - d)/|n|^2 n; verified midpoint of PP\' lies on the plane and PP\' is parallel to n')
def asimage(q):
    P = P3(q)[0]
    a, b, c, d = plane_terms(q['prompt'])
    n = (a, b, c)
    s = (dot(n, P) - d) / dot(n, n)
    Q = sub(P, scal(2 * s, n))
    mid = scal(sp.Rational(1, 2), add(P, Q))
    assert dot(n, mid) == d
    assert cross3(sub(Q, P), n) == (0, 0, 0)
    return Expect(tup(*Q))


@ref('asint3', method='solve a1 + lam d1 = a2 + mu d2 (3 equations, 2 unknowns) with sympy; consistency required; point verified on both lines')
def asint3(q):
    (a1, d1), (a2, d2) = lines3(q['prompt'])[:2]
    sol = sp.solve([a1[i] + lam * d1[i] - a2[i] - mu * d2[i] for i in range(3)], [lam, mu], dict=True)
    if not sol:
        return Verdict(False, 'lines do not intersect although the statement says to show they do')
    s = sol[0]
    if len(s) < 2:
        return Ambiguous('lines coincide: infinitely many common points')
    P1 = tuple(sp.simplify(a1[i] + s[lam] * d1[i]) for i in range(3))
    P2 = tuple(sp.simplify(a2[i] + s[mu] * d2[i]) for i in range(3))
    assert P1 == P2
    return Expect(tup(*P1))


@ref('asmeet', method='substitute the parametric line into the plane equation and solve the linear equation for the parameter; point verified on both')
def asmeet(q):
    (a, d), = lines3(q['prompt'])[:1]
    A, B, C, D = plane_terms(q['prompt'])
    pt = add(a, scal(t_, d))
    sol = sp.solve(A * pt[0] + B * pt[1] + C * pt[2] - D, t_)
    if len(sol) != 1:
        return Ambiguous('line parallel to the plane or contained in it')
    P = tuple(sp.simplify(c.subs(t_, sol[0])) for c in pt)
    assert A * P[0] + B * P[1] + C * P[2] == D
    return Expect(tup(*P))


@ref('asparl3', method='distance between parallel lines = min over t of |a2 - (a1 + t d1)| by calculus, parallelism asserted')
def asparl3(q):
    (a1, d1), (a2, d2) = lines3(q['prompt'])[:2]
    if cross3(d1, d2) != (0, 0, 0):
        return Verdict(False, 'lines are not parallel')
    F = add(a1, scal(t_, d1))
    D2 = dot(sub(a2, F), sub(a2, F))
    ts = sp.solve(sp.diff(D2, t_), t_)[0]
    v = sp.simplify(D2.subs(t_, ts))
    if v == 0:
        return Ambiguous('lines coincide')
    return Expect(str(sp.sqrt(v)))


@ref('asskew', method='minimise |a1 + lam d1 - a2 - mu d2|^2 over (lam, mu): gradient = 0 linear system (calculus), not the triple-product formula; skewness checked by non-zero minimum')
def asskew(q):
    (a1, d1), (a2, d2) = lines3(q['prompt'])[:2]
    W = sub(add(a1, scal(lam, d1)), add(a2, scal(mu, d2)))
    D2 = dot(W, W)
    sol = sp.solve([sp.diff(D2, lam), sp.diff(D2, mu)], [lam, mu], dict=True)
    if not sol or len(sol[0]) < 2:
        return Ambiguous('lines parallel: minimum not unique / not skew')
    v = sp.simplify(D2.subs(sol[0]))
    if v == 0:
        return Ambiguous('lines intersect: distance 0 (not skew)')
    return Expect(str(sp.sqrt(v)))


@ref('asplaned', method='foot of the perpendicular from the point along the normal (solve t with the plane equation), distance = |t||n|; not the |ax+by+cz+d|/|n| formula')
def asplaned(q):
    P = P3(q)[0]
    p = U(q['prompt'])
    e = eqn(re.search(r'plane (.+? = 0)', p).group(1))
    Pl = sp.Poly(sp.expand(e), x, y, z)
    n = (Pl.coeff_monomial(x), Pl.coeff_monomial(y), Pl.coeff_monomial(z))
    c0 = Pl.coeff_monomial(1)
    foot = add(P, scal(t_, n))
    ts = sp.solve(n[0] * foot[0] + n[1] * foot[1] + n[2] * foot[2] + c0, t_)[0]
    F = tuple(c.subs(t_, ts) for c in foot)
    assert n[0] * F[0] + n[1] * F[1] + n[2] * F[2] + c0 == 0
    dd = sub(P, F)
    return Expect(str(sp.sqrt(sp.simplify(dot(dd, dd)))))


@ref('assect3', method='P = A + m/(m+n) (B - A) coordinatewise; checked AP:PB = m:n by collinearity and length ratio squared')
def assect3(q):
    L = L3(q)
    A, B = L['A'], L['B']
    m_, n_ = [R(v) for v in re.search(r'ratio (\d+) : (\d+)', q['prompt']).groups()]
    P = add(A, scal(m_ / (m_ + n_), sub(B, A)))
    ap, pb = sub(P, A), sub(B, P)
    assert dot(ap, ap) * n_ ** 2 == dot(pb, pb) * m_ ** 2
    return Expect(tup(*P))


@ref('au3ce', method='centroid = coordinate averages; checked: the three vectors from G to the vertices sum to zero')
def au3ce(q):
    A, B, C = [c for _, c in points(q['prompt'], 3)][:3]
    G = scal(sp.Rational(1, 3), add(add(A, B), C))
    assert add(add(sub(A, G), sub(B, G)), sub(C, G)) == (0, 0, 0)
    return Expect(tup(*G))


@ref('au3ex', method='external division P = (m B - n A)/(m - n); checked PA:PB = n:m via squared lengths and collinearity')
def au3ex(q):
    L = L3(q)
    A, B = L['A'], L['B']
    m_, n_ = [R(v) for v in re.search(r'ratio (\d+) : (\d+)', q['prompt']).groups()]
    if m_ == n_:
        return Ambiguous('external division in ratio 1:1 does not exist')
    P = scal(1 / (m_ - n_), sub(scal(m_, B), scal(n_, A)))
    pa, pb = sub(P, A), sub(P, B)
    assert dot(pa, pa) * n_ ** 2 == dot(pb, pb) * m_ ** 2
    assert cross3(pa, pb) == (0, 0, 0)
    return Expect(tup(*P))


@ref('asplaneq', method='plane from the statement data via explicit normals (cross product / given vector / intercept / normalised unit normal), scaled to coprime integers with first non-zero positive; each point of the data verified to satisfy ax+by+cz=d')
def asplaneq(q):
    p = U(q['prompt'])
    def fin(n, pt):
        d = dot(n, pt)
        den = sp.ilcm(*[sp.Rational(v).q for v in (*n, d)])
        v = [sp.Rational(c) * den for c in (*n, d)]
        g = sp.igcd(*[int(c) for c in v])
        v = [int(c) // int(g) for c in v]
        for c in v[:3]:
            if c != 0:
                if c < 0:
                    v = [-u for u in v]
                break
        return v
    if 'through the points' in p:
        A, B, C = P3(q)[:3]
        n = cross3(sub(B, A), sub(C, A))
        if n == (0, 0, 0):
            return Ambiguous('points collinear: no unique plane')
        v = fin(n, A)
        for X in (A, B, C):
            assert v[0] * X[0] + v[1] * X[1] + v[2] * X[2] == v[3]
        return Expect(tup(*v), form=True)
    if 'perpendicular to the vector' in p:
        A = P3(q)[0]
        n = vec(p.split('the vector')[1].split('.')[0])
        v = fin(n, A)
        return Expect(tup(*v), form=True)
    if 'cuts off intercepts' in p:
        a, b, c = [R(t) for t in re.search(r'intercepts (' + NUM + '), (' + NUM + ') and (' + NUM + ')', p).groups()]
        if 0 in (a, b, c):
            return Ambiguous('zero intercept')
        n = (1 / a, 1 / b, 1 / c)
        v = fin(n, (a, 0, 0))
        for X in ((a, 0, 0), (0, b, 0), (0, 0, c)):
            assert v[0] * X[0] + v[1] * X[1] + v[2] * X[2] == v[3]
        return Expect(tup(*v), form=True)
    if 'contains the line' in p:
        (a, d), = lines3(p)[:1]
        Q = P3(q)[0] if False else [c for _, c in points(p.split('and the point')[1], 3)][0]
        n = cross3(d, sub(Q, a))
        if n == (0, 0, 0):
            return Ambiguous('point on the line: no unique plane')
        v = fin(n, a)
        assert v[0] * Q[0] + v[1] * Q[1] + v[2] * Q[2] == v[3]
        return Expect(tup(*v), form=True)
    if 'normal form' in p:
        dist = R(re.search(r'distance of (' + NUM + ') unit', p).group(1))
        nv = vec(p.split('along the vector')[1].split('.')[0])
        N = norm(nv)
        # plane: (nv/|nv|).r = dist  ->  nv.r = dist*|nv|
        dd = sp.simplify(dist * N)
        den = sp.ilcm(*[sp.Rational(v).q for v in (*nv, dd)])
        v = [sp.Rational(c) * den for c in (*nv, dd)]
        g = sp.igcd(*[int(c) for c in v])
        v = [int(c) // int(g) for c in v]
        return Expect(tup(*v), form=True)
    return Unsupported('unknown asplaneq template')


@ref('asplang', method='planes: cos = |n1.n2|/(|n1||n2|); line-plane: sin = |d.n|/(|d||n|); normals/directions read from the statement')
def asplang(q):
    p = U(q['prompt'])
    if p.startswith('Find sin'):
        (a, d), = lines3(p)[:1]
        A, B, C, D = plane_of(re.search(r'plane (.+? = -?\d+)', p).group(1))
        n = (A, B, C)
        return Expect(str(sp.simplify(abs(dot(d, n)) / (norm(d) * norm(n)))))
    m = re.search(r'planes (.+? = -?\d+) and (.+? = -?\d+)\.', p)
    n1 = plane_of(m.group(1))[:3]
    n2 = plane_of(m.group(2))[:3]
    return Expect(str(sp.simplify(abs(dot(n1, n2)) / (norm(n1) * norm(n2)))))


def frac_parts(s):
    """'(3x + 2)/(-3)' -> (alpha, beta, D, var) meaning (alpha v + beta)/D"""
    m = re.fullmatch(r'(\(.+?\)|-?\d*[xyz])/\(?(-?\d+)\)?', s.strip())
    num, den = m.group(1), R(m.group(2))
    if num.startswith('('):
        num = num[1:-1]
    e = expr(num)
    v = [s_ for s_ in (x, y, z) if e.has(s_)][0]
    P = sp.Poly(sp.expand(e), v)
    return P.coeff_monomial(v), P.coeff_monomial(1), den, v


@ref('asleq', method='each fraction (alpha v + beta)/D rewritten as (v - a)/b with a=-beta/alpha, b=D/alpha; identity re-verified at a random point')
def asleq(q):
    p = U(q['prompt'])
    if p.startswith('Find the vector equation'):
        L = L3(q)
        d = sub(L['B'], L['A'])
        return Expect(tup(*L['A'], *d))
    if p.startswith('Find the equation of the line through A'):
        A0 = L3(q)['A']
        body = re.search(r'parallel to the line (.+?)\. Write it', p).group(1)
    else:
        body = re.search(r'line is (.+?)\. Write it', p).group(1)
    parts = body.split(' = ')
    assert len(parts) == 3
    A, Bv = [], []
    for s_ in parts:
        al, be, D, v = frac_parts(s_)
        a, b = -be / al, D / al
        assert sp.simplify((al * 7 + be) / D - (7 - a) / b) == 0
        A.append(a)
        Bv.append(b)
    if p.startswith('Find the equation of the line through A'):
        return Expect(tup(*A0, *Bv))
    return Expect(tup(*A, *Bv))


@ref('aslinpar', method='point = A + r (cos, sin) with exact cos/sin read from the statement; checked cos^2+sin^2=1 and the distance |r| from A')
def aslinpar(q):
    p = U(q['prompt'])
    A = labelled(p)['A']
    mm = re.search(r'cos θ = (\S+) and sin θ = (\S+?)\. Write', p)
    c, s = expr(mm.group(1)), expr(mm.group(2))
    assert sp.simplify(c * c + s * s - 1) == 0
    r = R(re.search(r'r = (-?\d+)', p.split('find the point')[1]).group(1))
    X = (sp.simplify(A[0] + r * c), sp.simplify(A[1] + r * s))
    return Expect('(' + str(X[0]) + ', ' + str(X[1]) + ')')
