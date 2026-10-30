"""choice-pass-geo, part C: coordinate-geometry choice families (class derived from the statement/figure, option texts judged one by one).
No generator code, no production imports; the stored letter is never used here."""
import itertools
import re
from fractions import Fraction

import sympy as sp

from .choice_pass_util import JUDGES, Ambiguous, Defect, Unsupported, judge, nm

X, Y, Z = sp.symbols('x y z')
NUM = r'-?\d+(?:\.\d+)?'


def U(s):
    return s.replace('−', '-').replace('²', '^2').replace('³', '^3').replace('·', '*').replace('×', '*')


def F(t):
    return Fraction(t)


def pts_in(s, dim):
    out = []
    pat = r'([A-Z])?\(\s*(' + NUM + r')\s*,\s*(' + NUM + r')' + (r'\s*,\s*(' + NUM + r')' if dim == 3 else '') + r'\s*\)'
    for m in re.finditer(pat, U(s)):
        out.append((m.group(1), tuple(F(m.group(i)) for i in range(2, 2 + dim))))
    return out


def expr(t):
    t = U(t).replace('^', '**')
    t = re.sub(r'(\d)\s*([xyz])', r'\1*\2', t)
    t = re.sub(r'([xyz])\s*([xyz])', r'\1*\2', t)
    t = re.sub(r'([xyz])\s*([xyz])', r'\1*\2', t)
    return sp.sympify(t, locals={'x': X, 'y': Y, 'z': Z})


def eq_expr(t):
    l, r = U(t).split('=')
    return sp.expand(expr(l) - expr(r))


def trio(opts, truth):
    """truth: dict keyword -> bool ; option judged by which keyword its text contains (exactly one must match)"""
    res = []
    for o in opts:
        hit = [k for k in truth if k in nm(o).lower()]
        if len(hit) != 1:
            raise ValueError(f'cannot read option {o!r}')
        res.append(bool(truth[hit[0]]))
    return res


# ---------------------------------------------------------------- acparl
@judge('acparl', 'coordinates read from the figure; slopes as exact Fractions (parallel: equal slope / both vertical; perpendicular: slopes multiply to -1 or one vertical and one horizontal); cross-checked by cross and dot products of the direction vectors; segments checked to be AB and CD of the figure')
def acparl(q, opts):
    fig = q['figure']
    P = {p[2]: (F(p[0]), F(p[1])) for p in fig['points']}
    segs = [tuple((F(a), F(b)) for a, b in s) for s in fig['segments']]
    if segs != [(P['A'], P['B']), (P['C'], P['D'])]:
        return Defect('figure segments are not AB and CD')
    m = re.fullmatch(r'Look at the line segments AB and CD in the picture\. Are they parallel, perpendicular, or neither\?', q['prompt'])
    if not m:
        return Unsupported('unparsed prompt')

    def slope(a, b):
        dx = b[0] - a[0]
        return None if dx == 0 else (b[1] - a[1]) / dx   # None = vertical

    u = (P['B'][0] - P['A'][0], P['B'][1] - P['A'][1]); v = (P['D'][0] - P['C'][0], P['D'][1] - P['C'][1])
    if u == (0, 0) or v == (0, 0):
        return Defect('zero-length segment')
    s1, s2 = slope(P['A'], P['B']), slope(P['C'], P['D'])
    par = (s1 is None and s2 is None) or (s1 is not None and s2 is not None and s1 == s2)
    perp = (s1 is None and s2 == 0) or (s2 is None and s1 == 0) or (s1 is not None and s2 is not None and s1 * s2 == -1)
    assert par == (u[0] * v[1] - u[1] * v[0] == 0) and perp == (u[0] * v[0] + u[1] * v[1] == 0)
    if par:
        # collinear (same line) segments: parallel in the textbook sense is for distinct lines
        if (P['C'][0] - P['A'][0]) * u[1] - (P['C'][1] - P['A'][1]) * u[0] == 0:
            return Ambiguous('AB and CD lie on the same line')
    res = []
    for o in opts:
        t = nm(o).lower()
        res.append((t.startswith('parallel') and par) or (t.startswith('perpendicular') and perp) or (t.startswith('neither') and not par and not perp))
    return res


# ---------------------------------------------------------------- arcircpos
@judge('arcircpos', 'general form read with SymPy; power of the point f(P)/A (sign gives inside/on/outside) cross-checked by completing the square: |P-centre|^2 versus r^2')
def arcircpos(q, opts):
    m = re.fullmatch(r'Where does the point \((-?\d+), (-?\d+)\) lie relative to the circle (.+) = 0\?', U(q['prompt']))
    if not m:
        return Unsupported('unparsed prompt')
    px, py = int(m.group(1)), int(m.group(2))
    e = eq_expr(m.group(3) + '=0')
    P = sp.Poly(e, X, Y)
    A, C, B = P.coeff_monomial(X ** 2), P.coeff_monomial(Y ** 2), P.coeff_monomial(X * Y)
    D, E, F0 = P.coeff_monomial(X), P.coeff_monomial(Y), P.coeff_monomial(1)
    if B != 0 or A != C or A == 0:
        return Defect('not a circle equation')
    h, k = -sp.Rational(D) / (2 * A), -sp.Rational(E) / (2 * A)
    r2 = h * h + k * k - sp.Rational(F0) / A
    if r2 <= 0:
        return Defect('circle radius^2 <= 0 (point/empty)')
    pw = (e.subs({X: px, Y: py})) / A
    d2 = (px - h) ** 2 + (py - k) ** 2
    inside, on, out = d2 < r2, d2 == r2, d2 > r2
    assert (pw < 0) == inside and (pw == 0) == on
    return [(('inside' in nm(o) and inside) or ('on the' in nm(o) and on) or ('outside' in nm(o) and out)) for o in opts]


# ---------------------------------------------------------------- arcone
@judge('arcone', 'cone/plane sections (Apollonius): plane at angle alpha to the axis, semi-vertical angle theta, plane not through the vertex: circle alpha=90, ellipse alpha>theta, parabola alpha=theta, hyperbola alpha<theta; through the vertex: point (alpha>theta), one line (alpha=theta), two intersecting lines (alpha<theta)')
def arcone(q, opts):
    p = U(q['prompt'])
    m = re.search(r'semi-vertical angle of (\d+)', p); m2 = re.search(r'makes an angle of (\d+)°\s*with the axis', p)
    if not m or not m2:
        return Unsupported('unparsed prompt')
    th, al = int(m.group(1)), int(m2.group(1))
    if not (0 < th < 90 and 0 <= al <= 90):
        return Defect('angle outside (0,90)')
    notv = 'does not pass through the vertex' in p
    thru = 'passes through the vertex' in p and not notv
    if notv == thru:
        return Unsupported('cannot tell whether the plane passes through the vertex')
    if notv:
        cls = 'circle' if al == 90 else 'ellipse' if al > th else 'parabola' if al == th else 'hyperbola'
    else:
        cls = 'point' if al > th else 'line' if al == th else 'pair'
    names = {'circle': 'a circle', 'ellipse': 'an ellipse', 'parabola': 'a parabola', 'hyperbola': 'a hyperbola',
             'point': 'a single point (the vertex)', 'line': 'a single straight line (along a slant side of the cone)',
             'pair': 'a pair of intersecting straight lines'}
    return [nm(o) == names[cls] for o in opts]


# ---------------------------------------------------------------- arxyconic
@judge('arxyconic', 'second-degree equation Ax^2+Bxy+Cy^2+Dx+Ey+F=0: canonical form by eigen-decomposition of the quadratic form (eigenvalue signs / zero) plus the 3x3 determinant for degeneracy; real-locus check; circle = ellipse with equal eigenvalues')
def arxyconic(q, opts):
    m = re.fullmatch(r'Which curve does the equation (.+ = 0) represent\?', U(q['prompt']))
    if not m:
        return Unsupported('unparsed prompt')
    e = eq_expr(m.group(1))
    P = sp.Poly(e, X, Y)
    A, B, C = P.coeff_monomial(X ** 2), P.coeff_monomial(X * Y), P.coeff_monomial(Y ** 2)
    D, E, F0 = P.coeff_monomial(X), P.coeff_monomial(Y), P.coeff_monomial(1)
    Q = sp.Matrix([[A, sp.Rational(B) / 2], [sp.Rational(B) / 2, C]])
    M3 = sp.Matrix([[A, sp.Rational(B) / 2, sp.Rational(D) / 2], [sp.Rational(B) / 2, C, sp.Rational(E) / 2], [sp.Rational(D) / 2, sp.Rational(E) / 2, F0]])
    evs = []
    for v, mult in Q.eigenvals().items():
        evs += [sp.simplify(v)] * mult
    nz = [v for v in evs if v != 0]
    if len(nz) == 2:
        l1, l2 = evs
        # centre and constant: c = det(M3)/det(Q)
        c = M3.det() / Q.det()
        if c == 0:
            return Ambiguous('degenerate conic (point or pair of lines)')
        # l1 x'^2 + l2 y'^2 + c = 0 : real locus iff -c has the sign of some eigenvalue
        if (sp.sign(l1) == sp.sign(l2)):
            if sp.sign(-c) != sp.sign(l1):
                return Defect('no real points (imaginary ellipse)')
            cls = 'circle' if sp.simplify(l1 - l2) == 0 else 'ellipse'
        else:
            cls = 'hyperbola'
    elif len(nz) == 1:
        if M3.rank() < 3:
            return Ambiguous('degenerate parabolic conic (parallel lines / empty)')
        cls = 'parabola'
    else:
        return Defect('no quadratic terms')
    names = {'circle': 'a circle', 'ellipse': 'an ellipse', 'parabola': 'a parabola', 'hyperbola': 'a hyperbola'}
    # cross-check with the discriminant test
    disc = B * B - 4 * A * C
    assert (cls == 'hyperbola') == (disc > 0) and (cls == 'parabola') == (disc == 0)
    return [nm(o) == names[cls] for o in opts]


# ---------------------------------------------------------------- asoct
@judge('asoct', 'sign pattern of the three coordinates: all non-zero -> octant by signs; exactly one zero -> coordinate plane; two zero -> axis; all zero -> origin; each option text parsed and tested against the point')
def asoct(q, opts):
    m = re.fullmatch(r'Where does the point \((-?\d+), (-?\d+), (-?\d+)\) lie\?', U(q['prompt']))
    if not m:
        return Unsupported('unparsed prompt')
    c = [int(m.group(i)) for i in (1, 2, 3)]
    nzero = [i for i in range(3) if c[i] == 0]
    out = []
    for o in opts:
        t = nm(o)
        mo = re.fullmatch(r'the octant where x ([<>]) 0, y ([<>]) 0, z ([<>]) 0', t)
        if mo:
            out.append(not nzero and all((c[i] > 0) == (mo.group(i + 1) == '>') for i in range(3)))
            continue
        mp = re.fullmatch(r'the (xy|yz|zx)-plane', t)
        if mp:
            zero_axis = {'xy': 2, 'yz': 0, 'zx': 1}[mp.group(1)]
            out.append(c[zero_axis] == 0)         # lies on the plane (also true on an axis / origin)
            continue
        ma = re.fullmatch(r'the ([xyz])-axis', t)
        if ma:
            ax = 'xyz'.index(ma.group(1))
            out.append(all(c[i] == 0 for i in range(3) if i != ax))
            continue
        if t == 'the origin':
            out.append(not any(c)); continue
        raise ValueError(f'cannot read option {o!r}')
    return out


# ---------------------------------------------------------------- asside
@judge('asside', 'line a x + b y + c = 0 read with SymPy; sign of the line expression at P and at Q (same sign: same side; opposite: opposite sides; zero: on the line)')
def asside(q, opts):
    p = U(q['prompt'])
    m = re.fullmatch(r'Where do the points P\((-?\d+), (-?\d+)\) and Q\((-?\d+), (-?\d+)\) lie relative to the line (.+ = 0)\?', p)
    if not m:
        return Unsupported('unparsed prompt')
    P = (int(m.group(1)), int(m.group(2))); Q = (int(m.group(3)), int(m.group(4)))
    e = eq_expr(m.group(5))
    if sp.Poly(e, X, Y).total_degree() != 1:
        return Defect('not a line')
    sp_, sq_ = e.subs({X: P[0], Y: P[1]}), e.subs({X: Q[0], Y: Q[1]})
    if sp_ == 0 and sq_ == 0:
        return Ambiguous('both points lie on the line')
    same, opp = sp_ * sq_ > 0, sp_ * sq_ < 0
    onl = (sp_ == 0) != (sq_ == 0)
    return [(('same side' in nm(o) and same) or ('opposite' in nm(o) and opp) or ('lies on the line' in nm(o) and onl)) for o in opts]


# ---------------------------------------------------------------- au3cl
@judge('au3cl', 'squared distances by the distance formula, collinearity by the cross product, right angle by Pythagoras on the squared sides; equilateral/isosceles/scalene by equal squared sides')
def au3cl(q, opts):
    p = U(q['prompt'])
    ps = pts_in(p, 3)
    if len(ps) != 3:
        return Unsupported('unparsed prompt')
    A, B, C = [c for _, c in ps]
    d = lambda a, b: sum((u - v) ** 2 for u, v in zip(a, b))
    u = tuple(b - a for a, b in zip(A, B)); v = tuple(c - a for a, c in zip(A, C))
    cr = (u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0])
    col = cr == (0, 0, 0)
    s = sorted([d(A, B), d(B, C), d(C, A)])
    if not col and not all(s):
        return Defect('coincident points')
    right = (not col) and s[0] + s[1] == s[2]
    equi = s[0] == s[1] == s[2]
    iso = s[0] == s[1] or s[1] == s[2]
    if equi and not col:
        return Ambiguous('equilateral triangle: "isosceles" only under the inclusive definition and no equilateral option')
    res = []
    for o in opts:
        t = nm(o)
        if t == 'The points are collinear':
            res.append(col)
        elif t == 'They form a right-angled triangle':
            res.append(right)
        elif t == 'They form a scalene triangle that is not right-angled':
            res.append((not col) and not iso and not right)
        elif t == 'They form an isosceles triangle that is not right-angled':
            res.append((not col) and iso and not right)
        else:
            raise ValueError(f'cannot read option {o!r}')
    return res
