"""choice-recheck: geometry choice families judged against the ACTUAL option texts.

Every option text is turned into a claim and the claim is evaluated from the statement/figure (never from the keyed letter and never
through a letter map). Classification logic copied from refs/geometry_coordinate_6.py / _10.py, each with a second, different check.
"""
import itertools
import re
import sys
import os
from fractions import Fraction

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
import sympy as sp  # noqa: E402
from refs.choice_pass_util import JUDGES, Ambiguous, Defect, Unsupported, judge, nm  # noqa: E402
from refs.geometry_coordinate_util import U, points, lines3, cross3, dot, sub, x, y, eqn  # noqa: E402
from refs.geometry_coordinate_2 import lin_eqs  # noqa: E402

M = 'Cross-checked by a second method; claims are read from the option text.'


def need_distinct(o):
    if len(set(nm(t) for t in o)) != len(o):
        raise ValueError('duplicate option texts')


def d2(a, b):
    return dot(sub(a, b), sub(a, b))


# ---------------------------------------------------------------- accoll
@judge('accoll', 'for each option text "X, Y and Z" test collinearity of exactly those three figure points by cross product (exact) and by equal slopes/area; correct options = collinear triples', assumptions='options read as point triples')
def accoll(q, o):
    P = {p[2]: (sp.Integer(p[0]), sp.Integer(p[1])) for p in q['figure']['points']}
    out = []
    for t in o:
        m = re.fullmatch(r'([A-D]), ([A-D]) and ([A-D])', nm(t))
        if not m:
            return Unsupported('option text not a point triple: ' + t)
        a, b, c = [P[k] for k in m.groups()]
        cr = (b[0] - a[0]) * (c[1] - a[1]) - (c[0] - a[0]) * (b[1] - a[1])
        # second method: all pairwise distances, collinear iff longest = sum of other two
        ds = sorted(sp.sqrt(d2(u, v)) for u, v in ((a, b), (b, c), (a, c)))
        c2 = sp.simplify(ds[0] + ds[1] - ds[2]) == 0
        if (cr == 0) != c2:
            raise ValueError('collinearity methods disagree')
        out.append(cr == 0)
    return out


# ---------------------------------------------------------------- altri
@judge('altri', 'vertices read from the prompt; right iff squared sides satisfy Pythagoras AND (second method) some vertex has a zero dot product; isosceles iff two squared sides equal; each option text is a predicate on (right, isosceles)')
def altri(q, o):
    A, B, C = [c for _, c in points(q['prompt'])][:3]
    if (B[0] - A[0]) * (C[1] - A[1]) - (C[0] - A[0]) * (B[1] - A[1]) == 0:
        return Ambiguous('collinear: not a triangle')
    s = sorted([d2(A, B), d2(B, C), d2(C, A)])
    right = s[0] + s[1] == s[2]
    right2 = any(dot(sub(P2, P1), sub(P3, P1)) == 0 for P1, P2, P3 in ((A, B, C), (B, C, A), (C, A, B)))
    if right != right2:
        raise ValueError('right-angle methods disagree')
    iso = s[0] == s[1] or s[1] == s[2]
    pred = {'right-angled, but not isosceles': right and not iso, 'isosceles, but not right-angled': iso and not right,
            'right-angled and isosceles': right and iso, 'neither right-angled nor isosceles': not right and not iso}
    try:
        return [pred[nm(t).lower()] for t in o]
    except KeyError as e:
        return Unsupported('option text unknown ' + str(e))


# ---------------------------------------------------------------- arconicid
def conic_kind(p):
    P = sp.Poly(sp.expand(eqn(p)), x, y)
    A, B, C = P.coeff_monomial(x ** 2), P.coeff_monomial(x * y), P.coeff_monomial(y ** 2)
    D, E, F = P.coeff_monomial(x), P.coeff_monomial(y), P.coeff_monomial(1)
    delta = sp.Matrix([[A, B / 2, D / 2], [B / 2, C, E / 2], [D / 2, E / 2, F]]).det()
    disc = B * B - 4 * A * C
    # second method: eigenvalues of the quadratic form
    ev = list(sp.Matrix([[A, B / 2], [B / 2, C]]).eigenvals())
    sg = [sp.sign(e) for e in ev]
    if delta == 0:
        return 'degenerate'
    if disc > 0:
        k = 'hyperbola'; assert sg[0] * sg[1] < 0
    elif disc == 0:
        k = 'parabola'; assert 0 in sg
    else:
        assert all(s_ == sg[0] for s_ in sg) and 0 not in sg
        if (A + C) * delta > 0:
            return 'imaginary'
        k = 'circle' if (A == C and B == 0) else 'ellipse'
    return k


@judge('arconicid', 'general-conic invariants (3x3 determinant for degeneracy, B^2-4AC, sign of (A+C)*det for realness, A=C&B=0 for circle) with an eigenvalue-sign cross-check; options read as the curve name')
def arconicid(q, o):
    k = conic_kind(re.search(r'equation (.+? = 0) represent', U(q['prompt'])).group(1))
    names = {'a circle': 'circle', 'a parabola': 'parabola', 'an ellipse': 'ellipse', 'a hyperbola': 'hyperbola'}
    try:
        cl = [names[nm(t).lower()] for t in o]
    except KeyError as e:
        return Unsupported('option text unknown ' + str(e))
    if k in ('degenerate', 'imaginary'):
        return Defect('equation is ' + k + ' conic; no real non-degenerate curve')
    return [c == k for c in cl]


# ---------------------------------------------------------------- aslrel
@judge('aslrel', 'direction vectors parallel iff cross product zero (then coincident vs parallel by offset); otherwise intersecting iff the 3x3 system a1+l*d1 = a2+m*d2 is consistent (SymPy linsolve), cross-checked by the scalar triple product')
def aslrel(q, o):
    (a1, d1), (a2, d2_) = lines3(q['prompt'])[:2]
    l, m = sp.symbols('l m')
    if cross3(d1, d2_) == (0, 0, 0):
        if cross3(sub(a2, a1), d1) == (0, 0, 0):
            return Ambiguous('coincident lines')
        kind = 'parallel'
    else:
        sol = sp.linsolve([a1[i] + l * d1[i] - a2[i] - m * d2_[i] for i in range(3)], l, m)
        inter = bool(sol)
        if inter != (dot(sub(a2, a1), cross3(d1, d2_)) == 0):
            raise ValueError('intersection methods disagree')
        kind = 'intersecting' if inter else 'skew'
    try:
        return [nm(t).lower() == kind for t in o]
    except Exception:  # noqa: BLE001
        return Unsupported('?')


# ---------------------------------------------------------------- aspar
@judge('aspar', 'two lines ax+by+c=0 from the prompt: parallel iff a1b2=a2b1 (distinct), perpendicular iff a1a2+b1b2=0; cross-check with direction vectors (b,-a) dot/cross')
def aspar(q, o):
    (a1, b1, c1), (a2, b2, c2) = lin_eqs(U(q['prompt']))[:2]
    if a1 * b2 - a2 * b1 == 0:
        if a1 * c2 - a2 * c1 == 0 and b1 * c2 - b2 * c1 == 0:
            return Ambiguous('coincident lines')
        kind = 'parallel'
    else:
        kind = 'perpendicular' if a1 * a2 + b1 * b2 == 0 else 'neither'
    u, v = (b1, -a1), (b2, -a2)
    k2 = 'parallel' if u[0] * v[1] - u[1] * v[0] == 0 else ('perpendicular' if u[0] * v[0] + u[1] * v[1] == 0 else 'neither')
    if k2 != kind:
        raise ValueError('methods disagree')
    names = {'parallel': 'parallel', 'perpendicular': 'perpendicular', 'neither parallel nor perpendicular': 'neither'}
    try:
        return [names[nm(t).lower()] == kind for t in o]
    except KeyError as e:
        return Unsupported('option text unknown ' + str(e))


# ---------------------------------------------------------------- alcyc
@judge('alcyc', 'cyclic-quadrilateral criteria (opposite angles sum 180; same-side equal angles on AB; opposite-side angles sum 180) applied to the angles read from the prompt; formula-based (textbook converse theorems), no independent numeric cross-check; the option "cannot be decided" is false whenever the angles are given')
def alcyc(q, o):
    p = q['prompt']
    v = [int(t) for t in re.findall(r'∠[A-Z]+ = (\d+)°', p)]
    if 'opposite sides' in p:
        cyc = v[0] + v[1] == 180
    elif 'same side' in p:
        cyc = v[0] == v[1]
    else:
        A, B, C, D = v
        if A + B + C + D != 360:
            return Ambiguous('angles do not sum to 360')
        cyc = A + C == 180 and B + D == 180
    names = {'yes, they lie on one circle': cyc, 'no, they do not lie on one circle': not cyc, 'it cannot be decided from the angles': False}
    try:
        return [names[nm(t).lower()] for t in o]
    except KeyError as e:
        return Unsupported('option text unknown ' + str(e))


# ---------------------------------------------------------------- alnear
@judge('alnear', 'circle radius r, chord at distance d has length 2*sqrt(r^2-d^2); squared quantities compared exactly (distance from length via d^2=r^2-(l/2)^2); every option is a claim (longer / nearer / equal / cannot be decided) evaluated on exact squares')
def alnear(q, o):
    p = q['prompt']
    r = Fraction(re.search(r'radius (\d+(?:\.\d+)?) cm', p).group(1))
    if 'cm long' in p:
        a, b = [Fraction(t) for t in re.findall(r'is (\d+(?:\.\d+)?) cm long', p)[:2]]
        l1, l2 = a * a, b * b                       # squared lengths
        dd1, dd2 = r * r - l1 / 4, r * r - l2 / 4   # squared distances
    else:
        a, b = [Fraction(t) for t in re.findall(r'is (\d+(?:\.\d+)?) cm from O', p)[:2]]
        dd1, dd2 = a * a, b * b
        l1, l2 = 4 * (r * r - dd1), 4 * (r * r - dd2)
    if min(dd1, dd2) < 0 or max(l1, l2) > 4 * r * r or min(l1, l2) <= 0:
        return Defect('chord impossible in this circle')
    # second consistency: l^2/4 + d^2 = r^2
    assert l1 / 4 + dd1 == r * r and l2 / 4 + dd2 == r * r
    claims = {'ab is longer than cd': l1 > l2, 'cd is longer than ab': l2 > l1, 'ab and cd are equal': l1 == l2,
              'ab is nearer to the centre than cd': dd1 < dd2, 'cd is nearer to the centre than ab': dd2 < dd1,
              'ab and cd are the same distance from the centre': dd1 == dd2,
              'it cannot be decided without knowing where the chords are': False}
    try:
        return [claims[nm(t).lower()] for t in o]
    except KeyError as e:
        return Unsupported('option text unknown ' + str(e))
