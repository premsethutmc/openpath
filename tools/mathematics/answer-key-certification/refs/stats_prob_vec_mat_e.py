"""part E: vector algebra in components. Vectors are re-read from the prompt text; results derived by coordinates (with an identity cross-check)."""
import re
import unicodedata
from kit import ref, Expect, Verdict, Unsupported, Ambiguous, Fraction, sp  # noqa: F401

UNIT = {'î': 0, 'ĵ': 1, 'k̂': 2}


def norm(s):
    return unicodedata.normalize('NFC', s).replace('−', '-')


def parse_vec(s):
    s = norm(s)
    v = [0, 0, 0]
    found = False
    for sign, coef, unit in re.findall(r'([+\-]?)\s*(\d*)\s*(î|ĵ|k̂)', s):
        c = int(coef) if coef else 1
        v[UNIT[unit]] += -c if sign == '-' else c
        found = True
    if not found:
        raise ValueError('no vector in ' + s)
    return tuple(v)


def vecs_after(prompt, names):
    """parse 'a = ..., b = ... and c = ...' in order"""
    p = norm(prompt)
    out = []
    for i, n in enumerate(names):
        m = re.search(r'\b' + re.escape(n) + r' = (.*?)(?=, [a-z₁₂]+ = | and [a-z₁₂]+ = |\. |, in cubic| are coplanar| on the vector|$)', p)
        out.append(parse_vec(m.group(1)))
    return out


def point(s):
    return tuple(int(x) for x in re.findall(r'-?\d+', norm(s)))


def sub(a, b): return tuple(x - y for x, y in zip(a, b))
def dot(a, b): return sum(x * y for x, y in zip(a, b))
def cross(a, b): return (a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0])
def det3(a, b, c): return dot(a, cross(b, c))
def n2(a): return dot(a, a)
def sq(n): return sp.sqrt(sp.Integer(n))
def txt(e): return str(sp.nsimplify(e) if not isinstance(e, (int, Fraction)) else e)
def tup(vs): return '(' + ', '.join(str(x) for x in vs) + ')'


@ref('atang', 'cos from the law of cosines (|a|^2+|b|^2-|a-b|^2)/(2|a||b|), cross-checked against the dot-product formula')
def atang(q):
    a, b = vecs_after(q['prompt'], ['a', 'b'])
    if n2(a) == 0 or n2(b) == 0:
        return Ambiguous('zero vector: angle undefined')
    c1 = sp.Rational(n2(a) + n2(b) - n2(sub(a, b)), 2) / (sq(n2(a)) * sq(n2(b)))
    c2 = sp.Rational(dot(a, b)) / (sq(n2(a)) * sq(n2(b)))
    assert sp.simplify(c1 - c2) == 0
    return Expect(str(sp.radsimp(c1)))


@ref('atcopl', 'coplanar iff det[a b c] = 0; det is linear in lambda, solved exactly; degenerate (no / every lambda) reported')
def atcopl(q):
    p = norm(q['prompt'])
    a = parse_vec(re.search(r'a = (.*?), b =', p).group(1))
    b = parse_vec(re.search(r'b = (.*?) and c =', p).group(1))
    cs = re.search(r'c = (.*?) are coplanar', p).group(1)
    lam = sp.Symbol('lam')
    cs2 = cs.replace('λ', 'L')
    v = [sp.Integer(0)] * 3
    for sign, coef, lamf, unit in re.findall(r'([+\-]?)\s*(\d*)\s*(L?)\s*(î|ĵ|k̂)', cs2):
        c = (int(coef) if coef else 1) * (lam if lamf else 1)
        v[UNIT[unit]] += -c if sign == '-' else c
    d = sp.expand(det3(a, b, tuple(v)))
    k = d.coeff(lam, 1); c0 = d.coeff(lam, 0)
    if k == 0:
        return Ambiguous('det independent of lambda (%s): all or no lambda' % c0)
    return Expect(str(sp.Rational(-c0, k)))


@ref('atcross', 'determinant expansion; checked perpendicular to both and Lagrange identity')
def atcross(q):
    a, b = vecs_after(q['prompt'], ['a', 'b'])
    c = cross(a, b)
    assert dot(c, a) == 0 and dot(c, b) == 0 and n2(c) == n2(a) * n2(b) - dot(a, b) ** 2
    return Expect(tup(c))


@ref('atdc', 'components of AB divided by |AB|')
def atdc(q):
    p = norm(q['prompt'])
    A, B = [point(s) for s in re.findall(r'\(([^)]*)\)', p)[:2]]
    d = sub(B, A)
    if n2(d) == 0:
        return Ambiguous('A = B')
    L = sq(n2(d))
    return Expect('(' + ', '.join(str(sp.radsimp(sp.Integer(x) / L)) for x in d) + ')')


@ref('atlin', 'componentwise linear combination')
def atlin(q):
    p = norm(q['prompt'])
    a, b = vecs_after(p, ['a', 'b'])
    expr = re.search(r'find (.*?)\. Write', p).group(1).replace(' ', '')
    ca = cb = 0
    for sign, coef, v in re.findall(r'([+\-]?)(\d*)([ab])', expr):
        c = int(coef) if coef else 1
        c = -c if sign == '-' else c
        if v == 'a': ca += c
        else: cb += c
    return Expect(tup([ca * x + cb * y for x, y in zip(a, b)]))


@ref('atmag', 'Euclidean distance between the points with the given position vectors')
def atmag(q):
    p = norm(q['prompt'])
    m = re.search(r'position vectors (.*?)\. Find', p).group(1)
    A, B = [parse_vec(s) for s in m.split(' and ')] if ' and ' in m else (None, None)
    return Expect(str(sq(n2(sub(B, A)))))


@ref('atpara', 'area = |a x b| (sides) or |d1 x d2|/2 (diagonals); Lagrange identity cross-check')
def atpara(q):
    p = norm(q['prompt'])
    names = ['d₁', 'd₂'] if 'diagonals' in p else ['a', 'b']
    a, b = vecs_after(p, names)
    c = cross(a, b)
    assert n2(c) == n2(a) * n2(b) - dot(a, b) ** 2
    area = sq(n2(c)) / (2 if 'diagonals' in p else 1)
    return Expect(str(area))


@ref('atproj', 'scalar projection of a on b = a.b/|b| (the statement asks for a single exact value, so the scalar projection)')
def atproj(q):
    a, b = vecs_after(q['prompt'], ['a', 'b'])
    if n2(b) == 0:
        return Ambiguous('b = 0')
    return Expect(str(sp.radsimp(sp.Integer(dot(a, b)) / sq(n2(b)))))


@ref('atsec', 'section formula; external division derived as internal division with a negative ratio')
def atsec(q):
    p = norm(q['prompt'])
    P, Q = [parse_vec(s) for s in re.search(r'position vectors (.*?)\. Find', p).group(1).split(' and ')]
    m, n = map(int, re.search(r'ratio (\d+) : (\d+)', p).groups())
    if 'externally' in p:
        if m == n:
            return Ambiguous('external division with equal ratio does not exist')
        n = -n
    # R = (n P + m Q)/(m + n)
    R = [Fraction(n * x + m * y, m + n) for x, y in zip(P, Q)]
    # check PR : RQ = m : n on each coordinate
    for x, y, r in zip(P, Q, R):
        assert (r - x) * n == (y - r) * m
    return Expect(tup(R))


@ref('atstp', 'determinant of the 3x3 matrix of rows a, b, c')
def atstp(q):
    a, b, c = vecs_after(q['prompt'], ['a', 'b', 'c'])
    m = sp.Matrix([a, b, c])
    return Expect(str(m.det()))


@ref('attorq', 'torque = r x F with r the vector from the reference point A to the point of application P')
def attorq(q):
    p = norm(q['prompt'])
    F = parse_vec(re.search(r'F = (.*?) \(in newtons\)', p).group(1))
    P = point(re.search(r'acts at the point P(\([^)]*\))', p).group(1))
    A = point(re.search(r'about the point A(\([^)]*\))', p).group(1))
    return Expect(tup(cross(sub(P, A), F)))


@ref('atvarea', 'area = |AB x AC|/2, Heron cross-check')
def atvarea(q):
    p = norm(q['prompt'])
    A, B, C = [point(s) for s in re.findall(r'[ABC](\([^)]*\))', p)]
    c = cross(sub(B, A), sub(C, A))
    a2, b2, c2 = n2(sub(B, C)), n2(sub(C, A)), n2(sub(A, B))
    heron16 = 4 * a2 * b2 - (a2 + b2 - c2) ** 2   # = 16 Area^2
    assert heron16 == 4 * n2(c)
    return Expect(str(sq(n2(c)) / 2))


@ref('atvol', 'volume = |det|; tetrahedron one sixth of it')
def atvol(q):
    a, b, c = vecs_after(q['prompt'], ['a', 'b', 'c'])
    v = abs(sp.Matrix([a, b, c]).det())
    return Expect(str(sp.Rational(v) / (6 if 'tetrahedron' in q['prompt'] else 1)))


@ref('atvtp', 'a x (b x c) by two cross products; BAC-CAB identity cross-check')
def atvtp(q):
    a, b, c = vecs_after(q['prompt'], ['a', 'b', 'c'])
    r = cross(a, cross(b, c))
    bac = tuple(bi * dot(a, c) - ci * dot(a, b) for bi, ci in zip(b, c))
    assert r == bac
    return Expect(tup(r))
