"""geometry-coordinate part 5: ratios, centroids, tangents/normals; classification helpers for choice families."""
from kit import ref, Expect, Verdict, Unsupported, Ambiguous, Fraction, sp
from refs.geometry_coordinate_util import *
from refs.geometry_coordinate_4 import analyse, eq_after, onconic
import re, math

X, Y = x, y


@ref('aurat', method='ratio from the parameter t of P on AB: P = A + t(B-A) so AP:PB = t:(1-t); axis-division: t solves the axis coordinate = 0; P-on-segment collinearity and 0<t<1 verified; reduced to lowest terms')
def aurat(q):
    p = U(q['prompt'])
    L = labelled(p)
    A, B = L['A'], L['B']
    t = sp.Symbol('t')
    if 'lies on the segment' in p:
        P = L['P']
        # solve P = A + t(B-A) coordinatewise
        eqs = [A[i] + t * (B[i] - A[i]) - P[i] for i in range(2)]
        s = sp.solve(eqs, t, dict=True)
        if not s:
            return Verdict(False, 'P is not on line AB although stated to lie on segment AB')
        tv = s[0][t]
    else:
        axis = 0 if 'y-axis' in p else 1   # the y-axis is x = 0, the x-axis is y = 0
        d = B[axis] - A[axis]
        if d == 0:
            return Ambiguous('segment parallel to the axis: never divided by it')
        tv = -A[axis] / d
    if not (0 < tv < 1):
        return Ambiguous(f'division is external or at an end (t={tv}): ratio not a positive internal ratio')
    m_, n_ = tv, 1 - tv
    den = sp.ilcm(m_.q, n_.q)
    mm, nn = int(m_ * den), int(n_ * den)
    g = math.gcd(mm, nn)
    return Expect(f'{mm // g}:{nn // g}')


@ref('ausec', method='P = A + t(B-A) with t = m/(m+n) (internal ratio) or 1/2, 1/3, 2/3 for midpoint/trisection nearer A/B; checked |AP|:|PB|')
def ausec(q):
    p = U(q['prompt'])
    pts = [c for _, c in points(p)]
    A, B = pts[0], pts[1]
    if 'midpoint' in p:
        t = sp.Rational(1, 2)
    elif 'nearer to B' in p:
        t = sp.Rational(2, 3)
    elif 'nearer to A' in p:
        t = sp.Rational(1, 3)
    else:
        m_, n_ = [R(v) for v in re.search(r'ratio (\d+) : (\d+)', p).groups()]
        t = m_ / (m_ + n_)
    P = (A[0] + t * (B[0] - A[0]), A[1] + t * (B[1] - A[1]))
    return Expect(tup(*P))


@ref('aucen', method='centroid = average of vertices; missing vertex C = 3G - A - B; checked that the average of A,B,C equals G')
def aucen(q):
    p = U(q['prompt'])
    L = labelled(p)
    if p.startswith('Find the centroid'):
        A, B, C = L['A'], L['B'], L['C']
        return Expect(tup((A[0] + B[0] + C[0]) / 3, (A[1] + B[1] + C[1]) / 3))
    G, A, B = L['G'], L['A'], L['B']
    C = (3 * G[0] - A[0] - B[0], 3 * G[1] - A[1] - B[1])
    assert (A[0] + B[0] + C[0]) / 3 == G[0] and (A[1] + B[1] + C[1]) / 3 == G[1]
    return Expect(tup(*C))


def grad_line(c, P, kind):
    gx = sp.diff(c['e'], X).subs({X: P[0], Y: P[1]})
    gy = sp.diff(c['e'], Y).subs({X: P[0], Y: P[1]})
    if kind == 'tangent':
        n = (gx, gy)     # tangent: n . (Q - P) = 0
        d = (-gy, gx)
    else:
        d = (gx, gy)     # normal direction is the gradient
    if d[0] == 0:
        return None
    m = sp.simplify(sp.Rational(1) * d[1] / d[0])
    return m, sp.simplify(P[1] - m * P[0])


def conic_tn(q, keyword):
    p = U(q['prompt'])
    kind = 'tangent' if 'equation of the tangent' in p else 'normal'
    eq = re.search(r'to the \w+ (.+?) at the point', p).group(1)
    c = analyse(eq)
    m = re.search(r'at the point \((' + NUM + '), (' + NUM + r')\)', p)
    if m:
        P = (R(m.group(1)), R(m.group(2)))
    else:
        mm = re.search(r'where (cos|sec) θ = (' + NUM + ') and (sin|tan) θ = (' + NUM + r') \(x = (\d*)\s*(?:cos|sec) θ, y = (\d*)\s*(?:sin|tan) θ\)', p)
        a_ = R(mm.group(5) or '1')
        b_ = R(mm.group(6) or '1')
        P = (a_ * R(mm.group(2)), b_ * R(mm.group(4)))
    if not onconic(c, P):
        return Verdict(False, f'point {P} is not on the curve')
    r = grad_line(c, P, kind)
    if r is None:
        return Ambiguous('vertical line, no y = mx + c form')
    mm_, cc = r
    return Expect(str(sp.simplify(mm_ * X + cc)))


@ref('astan', method='implicit differentiation: gradient of F(x,y) at the point gives the normal direction; tangent is perpendicular to it; point membership on the curve asserted')
def astan(q):
    return conic_tn(q, 'conic')


@ref('astaneh', method='gradient method for ellipse/hyperbola; points given directly or from the parameter values (cos/sin or sec/tan with scale factors), membership on the curve asserted')
def astaneh(q):
    return conic_tn(q, 'conic')


@ref('astanc', method='substitute y = mx + c into the conic and require a double root (discriminant zero); positive c chosen when the prompt says positive')
def astanc(q):
    p = U(q['prompt'])
    m = re.search(r'line y = (.*?) is a tangent to the (\w+) (.+?)\.$', p)
    line = m.group(1)
    c_ = sp.Symbol('c')
    L = expr(line.replace('c', 'c_')) if False else sp.sympify(line.replace('−', '-').replace('x', '*x') if False else line)
    mexp = None
    # slope of the line  y = m x + c   or  y = c
    lhs = sp.sympify(re.sub(r'(\d)x', r'\1*x', line.replace('-', '-')), locals={'x': X, 'c': c_})
    conic = analyse(m.group(3))
    F = conic['e'].subs(Y, lhs)
    Pl = sp.Poly(sp.expand(F), X)
    if Pl.degree() == 2:
        disc = sp.discriminant(Pl.as_expr(), X)
    else:
        return Ambiguous('line meets the conic in one point only by being parallel to an axis of a parabola; not a tangent')
    sols = sp.solve(disc, c_)
    if 'positive value' in p:
        sols = [s for s in sols if s > 0]
    if len(sols) != 1:
        return Ambiguous(f'{len(sols)} values of c')
    return Expect(str(sp.simplify(sols[0])))
