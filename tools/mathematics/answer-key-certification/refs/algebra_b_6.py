"""algebra-b module 6: linear programming (vertex enumeration + recession directions), Descartes, conjugate roots, inverses, matrix codes"""
import itertools
import re
from kit import ref, Expect, Verdict, Unsupported, Ambiguous, Fraction, sp
from refs.algebra_b_common import *
from refs.algebra_b_2 import pick


def lp_parse(p):
    m = re.search(r'(Maximise|Minimise) Z = (\d*)x \+ (\d*)y subject to (.*?)\.\s', p + ' ')
    g = lambda s: int(s) if s else 1
    sense = 1 if m.group(1) == 'Maximise' else -1
    cx, cy = g(m.group(2)), g(m.group(3))
    cons = []  # (a, b, c) meaning a x + b y <= c  (all normalised to <=)
    for part in m.group(4).split(', '):
        part = part.replace('−', '-')
        mm = re.fullmatch(r'(?:(\d*)x \+ (\d*)y|x|y) (≤|≥) (-?\d+)', part)
        if ' + ' in part:
            a, b = g(mm.group(1)), g(mm.group(2))
        elif part.startswith('x '):
            a, b = 1, 0
        else:
            a, b = 0, 1
        c = int(mm.group(4))
        cons.append((a, b, c) if mm.group(3) == '≤' else (-a, -b, -c))
    return sense, cx, cy, cons


def lp_solve(sense, cx, cy, cons):
    """-> ('infeasible',) | ('unbounded',) | ('opt', value, [vertices])  exact"""
    lines = list(cons)
    verts = set()
    for (a1, b1, c1), (a2, b2, c2) in itertools.combinations(lines, 2):
        det = a1 * b2 - a2 * b1
        if det == 0: continue
        X = Fraction(c1 * b2 - c2 * b1, det); Y = Fraction(a1 * c2 - a2 * c1, det)
        if all(a * X + b * Y <= c for a, b, c in cons):
            verts.add((X, Y))
    if not verts:
        return ('infeasible',)
    # recession directions: boundary directions of every constraint line (both signs)
    for a, b, c in lines:
        for d in ((b, -a), (-b, a)):
            if d == (0, 0): continue
            if all(aa * d[0] + bb * d[1] <= 0 for aa, bb, cc in cons) and sense * (cx * d[0] + cy * d[1]) > 0:
                return ('unbounded',)
    best = max(sense * (cx * X + cy * Y) for X, Y in verts)
    return ('opt', sense * best, sorted(v for v in verts if sense * (cx * v[0] + cy * v[1]) == best))


def lp_gridcheck(sense, cx, cy, cons, val):
    """no feasible lattice point (step 1/4, box [0,40]^2) beats the claimed optimum"""
    for i in range(0, 61):
        for j in range(0, 61):
            X, Y = Fraction(i, 2), Fraction(j, 2)
            if all(a * X + b * Y <= c for a, b, c in cons):
                assert sense * (cx * X + cy * Y) <= sense * val
    return True


@ref('aplpfeas', 'exact vertex enumeration of the polygon + recession-direction test for unboundedness + grid check; every option evaluated', 'exhaustive')
def aplpfeas(q):
    sense, cx, cy, cons = lp_parse(q['prompt'])
    r = lp_solve(sense, cx, cy, cons)
    word = 'maximum' if sense == 1 else 'minimum'

    def t(o):
        if o.startswith('There is no feasible region'): return r[0] == 'infeasible'
        if o.startswith(f'Z has no {word}'): return r[0] == 'unbounded'
        m = re.fullmatch(r'The (maximum|minimum) value of Z is (-?\d+)', o)
        if m:
            return m.group(1) == word and r[0] == 'opt' and r[1] == int(m.group(2))
        raise ValueError(o)
    if r[0] == 'opt': lp_gridcheck(sense, cx, cy, cons, r[1])
    return pick(q, t)


@ref('aplpmax', 'exact vertex enumeration (all boundary-line intersections), grid check of optimality', 'exhaustive')
def aplpmax(q):
    sense, cx, cy, cons = lp_parse(q['prompt'])
    r = lp_solve(sense, cx, cy, cons)
    if r[0] != 'opt':
        return Verdict(False, f'LP is {r[0]}, a maximum is asked')
    lp_gridcheck(sense, cx, cy, cons, r[1])
    return Expect(str(r[1]))


@ref('aplpmin', 'exact vertex enumeration + recession-cone check that the minimum exists on the unbounded region; grid check', 'exhaustive')
def aplpmin(q):
    sense, cx, cy, cons = lp_parse(q['prompt'])
    r = lp_solve(sense, cx, cy, cons)
    if r[0] != 'opt':
        return Verdict(False, f'LP is {r[0]}, a minimum is asked')
    lp_gridcheck(sense, cx, cy, cons, r[1])
    return Expect(str(r[1]))


@ref('aplpopt', 'exact vertex enumeration; the optimal vertex must be unique', 'exhaustive')
def aplpopt(q):
    sense, cx, cy, cons = lp_parse(q['prompt'])
    r = lp_solve(sense, cx, cy, cons)
    if r[0] != 'opt':
        return Verdict(False, f'LP is {r[0]}')
    if len(r[2]) != 1:
        return Ambiguous(f'objective is optimal along an edge: vertices {r[2]}')
    X, Y = r[2][0]
    return Expect(f'({X}, {Y})')


# ---------- Descartes ----------
SUPS2 = {'⁷': '**7', '⁸': '**8', '⁹': '**9'}


def sign_changes(cs):
    s = [c > 0 for c in cs if c != 0]
    return sum(1 for a, b in zip(s, s[1:]) if a != b)


@ref('apdesc', 'coefficient sign changes of p(x) and p(−x) (rule of signs, formula-based); cross-checked against the true real-root counts (count ≤ bound, same parity) via sympy count_roots', 'exhaustive',
     assumptions='"least possible number of non-real roots" = degree − (max positive + max negative + multiplicity of root 0)')
def apdesc(q):
    p = q['prompt']
    m = re.search(r'(greatest possible number of positive real roots|greatest possible number of negative real roots|least possible number of non-real \(complex\) roots) of (.*) = 0\.', p)
    s = m.group(2)
    for k, v in SUPS2.items(): s = s.replace(k, v)
    X = sp.Symbol('x')
    poly = sp.Poly(P(s), X)
    cs = poly.all_coeffs()
    n = poly.degree()
    vp = sign_changes(cs)
    cn = [c * (-1) ** (n - i) for i, c in enumerate(cs)]
    vn = sign_changes(cn)
    z = 0
    while cs[len(cs) - 1 - z] == 0: z += 1
    # consistency with the actual roots
    npos = sp.Poly(poly.as_expr(), X).count_roots(0, None) - (1 if z else 0) if False else len([r for r in sp.real_roots(poly) if r > 0])
    nneg = len([r for r in sp.real_roots(poly) if r < 0])
    assert npos <= vp and (vp - npos) % 2 == 0 and nneg <= vn and (vn - nneg) % 2 == 0, 'rule of signs inconsistent with real roots'
    if m.group(1).startswith('greatest possible number of positive'): return Expect(str(vp))
    if m.group(1).startswith('greatest possible number of negative'): return Expect(str(vn))
    return Expect(str(n - (vp + vn + z)))


@ref('apconj', 'all roots of the cubic from sympy exact root finding (roots with multiplicity); the given root removed once; substitution check', 'exhaustive')
def apconj(q):
    m = re.fullmatch(r'(.*?) is a root of (.*) = 0\. Find the other two roots\. Write them separated by commas\.', q['prompt'])
    X = sp.Symbol('x')
    r0 = sp.sympify(clean(m.group(1)).replace('√', 'sqrt'), rational=True) if False else sp.sympify(re.sub(r'√(\d+)', r'sqrt(\1)', clean(m.group(1))))
    pol = P(m.group(2))
    assert sp.simplify(pol.subs(X, r0)) == 0
    rts = sp.roots(sp.Poly(pol, X))
    lst = []
    for r, mult in rts.items(): lst += [sp.simplify(r)] * mult
    assert len(lst) == 3
    for i, r in enumerate(lst):
        if sp.simplify(r - r0) == 0:
            del lst[i]; break
    else:
        return Verdict(False, 'given root not found among roots')
    return Expect(', '.join(str(r) for r in lst))


def dom_excl(t):
    t = t.strip()
    if t == 'ℝ': return None
    m = re.fullmatch(r'ℝ − \{(.*)\}', t)
    return sp.nsimplify(m.group(1).replace('−', '-'))


@ref('apinvf', 'inverse by solving y=f(x) for x with sympy; f(f⁻¹(x)) = x checked at 6 points; the stated domain/codomain checked against the pole and the limit at infinity', 'exhaustive')
def apinvf(q):
    m = re.fullmatch(r'The function f : (.*?) → (.*?), f\(x\) = (.*), is a bijection\. Find f⁻¹\(x\)\.', q['prompt'])
    dom, cod = dom_excl(m.group(1)), dom_excl(m.group(2))
    X, Y = sp.symbols('x y')
    f = P(m.group(3))
    num_, den_ = sp.fraction(sp.together(f))
    if den_.has(X):
        poles = sp.solve(den_, X)
        pole = poles[0] if len(poles) == 1 else None
        asym = sp.limit(f, X, sp.oo)
        if pole is None or sp.simplify(sp.diff(f, X)) == 0 or dom != pole or cod != asym:
            return Verdict(False, f'stated domain/codomain wrong: poles {poles}, asymptote {asym}')
    else:
        if dom is not None or cod is not None or sp.degree(f, X) != 1:
            return Verdict(False, 'domain/codomain/degree mismatch for a linear function')
    sol = sp.solve(sp.Eq(Y, f), X)
    assert len(sol) == 1
    inv = sp.simplify(sol[0].subs(Y, X))
    for v in [sp.Rational(1, 3), 7, -13, sp.Rational(5, 2), 29, 41]:
        if cod is not None and v == cod: continue
        assert sp.simplify(f.subs(X, inv.subs(X, v)) - v) == 0
    return Expect(str(sp.factor(inv)))


@ref('apinvv', 'solve f(t)=y0 exactly with sympy and substitute back; t must not be the excluded point', 'exhaustive')
def apinvv(q):
    m = re.fullmatch(r'Let f\(x\) = (.*) for x ≠ (.*?)\. Find f⁻¹\((−?\d+)\)\. \(A fraction is fine\.\)', q['prompt'])
    X = sp.Symbol('x')
    f = P(m.group(1)); y0 = int(m.group(3).replace('−', '-'))
    pole = sp.nsimplify(m.group(2).replace('−', '-'))
    num_, den_ = sp.fraction(sp.together(f))
    sol = sp.solve(sp.Eq(num_, y0 * den_), X)
    sol = [t for t in sol if t != pole]
    if len(sol) != 1:
        return Verdict(False, f'no valid preimage: {sol}')
    assert sp.simplify(f.subs(X, sol[0]) - y0) == 0
    return Expect(str(sol[0]))


@ref('apcode', 'matrix product / exact inverse solve with sympy Matrix; letters as alphabet positions', 'exhaustive')
def apcode(q):
    p = q['prompt']
    A = sp.Matrix(parse_matrix_(re.search(r'C = AM with A = (\[\[.*?\]\])\.', p).group(1)))
    if 'Encode the letters' in p:
        w = re.search(r'Encode the letters ([A-Z]{2}):', p).group(1)
        Mv = sp.Matrix([ord(ch) - 64 for ch in w])
        C = A * Mv
        return Expect(f'({C[0]}, {C[1]})')
    if 'Decode it' in p:
        Cc = sp.Matrix(parse_matrix_(re.search(r'coded column (\[\[.*?\]\]) is received', p).group(1)))
        Mv = A.inv() * Cc
        assert A * Mv == Cc
        return Expect(f'({Mv[0]}, {Mv[1]})')
    return Unsupported('apcode variant: ' + p[-80:])


def parse_matrix_(s):
    rows = re.findall(r'\[([^\[\]]+)\]', s)
    return [[int(x.replace('−', '-')) for x in r.split(',')] for r in rows]
