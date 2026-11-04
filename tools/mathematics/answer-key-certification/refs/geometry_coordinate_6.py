"""geometry-coordinate part 6: choice families of the coordinate part (class derived from the statement)."""
from kit import ref, Expect, Verdict, Unsupported, Ambiguous, sp
from refs.geometry_coordinate_util import *
from refs.geometry_coordinate_4 import analyse
from refs.geometry_coordinate_2 import lin_eqs
import itertools, re, math

CLS = {}


def cls(fam):
    def deco(fn):
        CLS[fam] = fn
        return fn
    return deco


def fig_pts(q):
    return {p[2]: (sp.Integer(p[0]), sp.Integer(p[1])) for p in q['figure']['points']}


@cls('acparl')
def c_acparl(q):
    P = fig_pts(q)
    u = sub(P['B'], P['A']); v = sub(P['D'], P['C'])
    if u == (0, 0) or v == (0, 0):
        return Ambiguous('zero-length segment')
    cr = u[0] * v[1] - u[1] * v[0]
    dt = u[0] * v[0] + u[1] * v[1]
    return 'parallel' if cr == 0 else ('perpendicular' if dt == 0 else 'neither')


@cls('accoll')
def c_accoll(q):
    P = fig_pts(q)
    out = []
    for tri in itertools.combinations('ABCD', 3):
        a, b, c = [P[k] for k in tri]
        if (b[0] - a[0]) * (c[1] - a[1]) - (c[0] - a[0]) * (b[1] - a[1]) == 0:
            out.append(''.join(tri))
    if len(out) != 1:
        return Ambiguous(f'{len(out)} collinear triples: {out}')
    return out[0]


@cls('aspar')
def c_aspar(q):
    (a1, b1, c1), (a2, b2, c2) = lin_eqs(U(q['prompt']))[:2]
    if a1 * b2 - a2 * b1 == 0:
        if (a1 * c2 - a2 * c1 == 0) and (b1 * c2 - b2 * c1 == 0):
            return Ambiguous('coincident lines')
        return 'parallel'
    return 'perpendicular' if a1 * a2 + b1 * b2 == 0 else 'neither'


@cls('asside')
def c_asside(q):
    p = U(q['prompt'])
    L = labelled(p)
    P, Q = L['P'], L['Q']
    a, b, c = lin_eqs(p.split('relative to the line')[1])[0]
    sp_ = a * P[0] + b * P[1] + c
    sq_ = a * Q[0] + b * Q[1] + c
    if sp_ == 0 or sq_ == 0:
        return 'on-line:' + ('both' if sp_ == 0 and sq_ == 0 else 'one')
    return 'same' if sp_ * sq_ > 0 else 'opposite'


@cls('asoct')
def c_asoct(q):
    P = [c for _, c in points(q['prompt'], 3)][0]
    z = [i for i, v in enumerate(P) if v == 0]
    if len(z) == 3:
        return 'origin'
    if len(z) == 2:
        return 'axis:' + 'xyz'[[i for i in range(3) if i not in z][0]]
    if len(z) == 1:
        return 'plane:' + 'xyz'[z[0]]
    return 'octant:' + ''.join('+' if v > 0 else '-' for v in P)


def d2(a, b):
    return dot(sub(a, b), sub(a, b))


@cls('altri')
def c_altri(q):
    P = [c for _, c in points(q['prompt'])][:3]
    A, B, C = P
    if (B[0] - A[0]) * (C[1] - A[1]) - (C[0] - A[0]) * (B[1] - A[1]) == 0:
        return Ambiguous('collinear: not a triangle')
    s = sorted([d2(A, B), d2(B, C), d2(C, A)])
    right = s[0] + s[1] == s[2]
    iso = s[0] == s[1] or s[1] == s[2]
    return ('right' if right else '') + ('-isosceles' if iso else '') if (right or iso) else 'scalene-nonright'


@cls('au3cl')
def c_au3cl(q):
    A, B, C = [c for _, c in points(q['prompt'], 3)][:3]
    if cross3(sub(B, A), sub(C, A)) == (0, 0, 0):
        return 'collinear'
    s = sorted([d2(A, B), d2(B, C), d2(C, A)])
    right = s[0] + s[1] == s[2]
    iso = s[0] == s[1] or s[1] == s[2]
    eq = s[0] == s[1] == s[2]
    return 'equilateral' if eq else (('right' if right else '') + ('-isosceles' if iso else '') if (right or iso) else 'scalene-nonright')


def conic_class_general(p):
    """class of a general second-degree equation (with xy term) via invariants (determinant + discriminant), independent of circle/parabola 'forms'"""
    e = eqn(p)
    P = sp.Poly(sp.expand(e), x, y)
    A, B, C = P.coeff_monomial(x ** 2), P.coeff_monomial(x * y), P.coeff_monomial(y ** 2)
    D, E, F = P.coeff_monomial(x), P.coeff_monomial(y), P.coeff_monomial(1)
    M = sp.Matrix([[A, B / 2, D / 2], [B / 2, C, E / 2], [D / 2, E / 2, F]])
    delta = M.det()
    disc = B * B - 4 * A * C
    if delta == 0:
        if disc < 0:
            return 'degenerate:point'
        if disc > 0:
            return 'degenerate:two-lines'
        return 'degenerate:parallel/coincident-lines-or-empty'
    if disc > 0:
        return 'hyperbola'
    if disc == 0:
        return 'parabola'
    # ellipse family: real iff (A+C)*delta < 0 (sign test); circle iff A=C and B=0
    if (A + C) * delta > 0:
        return 'imaginary-ellipse'
    return 'circle' if (A == C and B == 0) else 'ellipse'


@cls('arconicid')
def c_arconicid(q):
    return conic_class_general(re.search(r'equation (.+? = 0) represent', U(q['prompt'])).group(1))


@cls('arxyconic')
def c_arxyconic(q):
    return conic_class_general(re.search(r'equation (.+? = 0) represent', U(q['prompt'])).group(1))


@cls('aslrel')
def c_aslrel(q):
    (a1, d1), (a2, d2_) = lines3(q['prompt'])[:2]
    if cross3(d1, d2_) == (0, 0, 0):
        return 'parallel' if cross3(sub(a2, a1), d1) != (0, 0, 0) else 'coincident'
    triple = dot(sub(a2, a1), cross3(d1, d2_))
    return 'intersecting' if triple == 0 else 'skew'


@cls('arcircpos')
def c_arcircpos(q):
    p = U(q['prompt'])
    P = [c for _, c in points(p)][0]
    c = analyse(re.search(r'circle (.+?)\?', p).group(1))
    if c['kind'] != 'circle' or c['r2'] <= 0:
        return Ambiguous('degenerate circle')
    d2_ = (P[0] - c['h']) ** 2 + (P[1] - c['k']) ** 2
    return 'inside' if d2_ < c['r2'] else ('on' if d2_ == c['r2'] else 'outside')


@cls('arcone')
def c_arcone(q):
    p = U(q['prompt'])
    th = int(re.search(r'semi-vertical angle of (\d+)', p).group(1))
    al = int(re.search(r'makes an angle of (\d+)°\s*with the axis', p).group(1))
    through = 'does not pass through the vertex' not in p
    if through:
        return 'point' if (al == 90 or al > th) else ('line' if al == th else 'pair-of-lines')
    if al == 90:
        return 'circle'
    if al > th:
        return 'ellipse'
    if al == th:
        return 'parabola'
    return 'hyperbola'


WHY = {'acparl': 'parallel/perpendicular/neither', 'accoll': 'which triple', 'aspar': 'parallel/perpendicular/neither', 'asside': 'same/opposite side', 'asoct': 'octant/plane/axis',
       'altri': 'triangle kind', 'au3cl': 'triangle kind', 'arconicid': 'conic kind', 'arxyconic': 'conic kind', 'aslrel': 'parallel/intersecting/skew',
       'arcircpos': 'inside/on/outside', 'arcone': 'conic section'}


CHOICE_MAPS.update({
    'accoll': {'ABC': 'A', 'ABD': 'B', 'ACD': 'C', 'BCD': 'D'},
    'altri': {'right': 'A', '-isosceles': 'B', 'right-isosceles': 'C', 'scalene-nonright': 'D'},
    'arconicid': {'circle': 'A', 'parabola': 'B', 'ellipse': 'C', 'hyperbola': 'D'},
    'aslrel': {'parallel': 'A', 'intersecting': 'B', 'skew': 'C'},
    'aspar': {'parallel': 'A', 'perpendicular': 'B', 'neither': 'C'},
})
MAP_NOTE = ('letter order inferred from the data (one class -> one letter, all classes distinct letters, over every released question); '
            'option texts are not exported, so the mapping itself is not independently verified')
for _f, _fn in CLS.items():
    ref(_f, method=('class derived from the statement by coordinates/linear algebra and compared with the keyed letter through the inferred letter map; ' + MAP_NOTE) if _f in CHOICE_MAPS
        else 'class derived from the statement; option texts not exported and letters are shuffled per question, so the key cannot be compared',
        assumptions=(MAP_NOTE if _f in CHOICE_MAPS else 'option texts not exported'))(choice_ref_fn(_f, _fn, WHY.get(_f, '')))
