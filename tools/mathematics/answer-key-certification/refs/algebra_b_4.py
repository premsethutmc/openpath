"""algebra-b module 4: complex numbers, discriminant, domain, exponents/logs, GP numeric families"""
import math
import re
from kit import ref, Expect, Verdict, Unsupported, Ambiguous, Fraction, sp
from refs.algebra_b_common import *

x_ = sp.Symbol('x', real=True)
k_ = sp.Symbol('k', real=True)


def cnum(s):
    s = s.replace('−', '-').replace(' ', '')
    s = re.sub(r'(\d+)i', r'\1*I', s)
    s = re.sub(r'(?<![\w*])i', 'I', s)
    s = s.replace('+I', '+1*I').replace('-I', '-1*I')
    return sp.sympify(s) if s != 'I' else sp.I


def tup(*vals):
    return '(' + ', '.join(str(v).replace('sqrt', '√') if False else str(v) for v in vals) + ')'


@ref('aoconj', 'p, q from expanding A(x−r)(x−r̄) with sympy; r substituted back into the quadratic as a check', 'exhaustive')
def aoconj(q):
    m = re.fullmatch(r'The number (.*?) is a root of (\d*)x² \+ px \+ q = 0, where p and q are real\. Find \(p, q\)\.', q['prompt'])
    r = cnum(m.group(1)); A = int(m.group(2) or 1)
    poly = sp.expand(A * (x_ - r) * (x_ - sp.conjugate(r)))
    c = sp.Poly(poly, x_).all_coeffs()
    assert c[0] == A
    p_, q_ = c[1], c[2]
    assert sp.simplify(A * r ** 2 + p_ * r + q_) == 0
    return Expect(tup(p_, q_))


@ref('aocq', 'roots from sympy solve of Ax²+Bx+C over ℂ; both roots substituted back; (p,q)=(Re, Im>0)', 'exhaustive')
def aocq(q):
    m = re.fullmatch(r'Solve (.*) = 0 over the complex numbers\..*', q['prompt'])
    z = sp.Symbol('z')
    e = P(m.group(1).replace('x', 'z'), z=z) if False else sp.sympify(clean(m.group(1)).replace('²', '**2'), locals={'x': z}) if False else None
    ex = P(m.group(1))
    xs = sp.Symbol('x')
    roots = sp.solve(sp.Eq(ex, 0), xs)
    assert len(roots) == 2
    for r in roots:
        assert sp.simplify(ex.subs(xs, r)) == 0
    r = [r for r in roots if sp.im(r) > 0][0]
    return Expect(tup(sp.nsimplify(sp.re(r)), sp.simplify(sp.im(r))))


@ref('aodk', 'k from discriminant of the printed quadratic via sympy solve; selection by the stated side-conditions', 'exhaustive')
def aodk(q):
    p = q['prompt']
    m = re.search(r'quadratic equation (.*) = 0 has two equal real roots', p)
    eq = P(m.group(1).replace('1x', 'x') if False else m.group(1))
    k = sp.Symbol('k'); x = sp.Symbol('x')
    pol = sp.Poly(eq, x)
    a, b, c = [pol.coeff_monomial(x ** i) for i in (2, 1, 0)]
    sols = sp.solve(sp.Eq(sp.discriminant(eq, x), 0), k)
    if 'positive value' in p:
        sols = [s for s in sols if s > 0]
    if '(k ≠ 0)' in p:
        sols = [s for s in sols if s != 0]
        sols = [s for s in sols if sp.Poly(eq.subs(k, s), x).degree() == 2]
    # check each: double root
    for s in sols:
        assert sp.discriminant(eq.subs(k, s), x) == 0
    if len(sols) != 1:
        return Ambiguous(f'{len(sols)} values of k: {sols}')
    return Expect(str(sols[0]))


@ref('aodkr', 'solve the discriminant inequality in k with sympy (D>=0 real roots, D<0 none)', 'exhaustive')
def aodkr(q):
    p = q['prompt']
    m = re.search(r'the equation (.*) = 0 has (real roots|no real roots)\.', p)
    eq = P(m.group(1), k=k_)
    D = sp.discriminant(eq, sp.Symbol('x'))
    rel = (D >= 0) if m.group(2) == 'real roots' else (D < 0)
    S = sp.solve_univariate_inequality(rel, k_, relational=False)
    return Expect(ineq_text(S))


@ref('aodom', 'sympy continuous_domain of the printed function over ℝ', 'exhaustive')
def aodom(q):
    m = re.search(r'f\(x\) = (.*)\. Write it in interval notation', q['prompt'])
    s = m.group(1).replace('√', 'sqrt')
    s = clean(s)
    s = re.sub(r'sqrt\(', 'sqrt(', s)
    s = re.sub(r'sqrt([a-z])', r'sqrt(\1)', s)
    f = sp.sympify(re.sub(r'(?<![\w)*])(\d+)x', r'\1*x', s), locals={'x': x_})
    D = sp.calculus.util.continuous_domain(f, x_, sp.S.Reals)
    return Expect(iv_text(D))


@ref('aoexpeq', 'sympy solveset over ℝ, then exact substitution into both sides', 'exhaustive')
def aoexpeq(q):
    m = re.fullmatch(r'Solve (\d+)\^(\(.*?\)|x) = (\d+)\^(\(.*?\)|x|\d+)\. \(A fraction is fine\.\)', q['prompt'])
    if not m:
        m = re.fullmatch(r'Solve (\d+)\^(\(.*?\)|x) = (\d+)\. \(A fraction is fine\.\)', q['prompt'])
        b1, e1, rhs = int(m.group(1)), P(m.group(2), x=x_), sp.Integer(int(m.group(3)))
    else:
        b1, e1, b2, e2 = int(m.group(1)), P(m.group(2), x=x_), int(m.group(3)), P(m.group(4), x=x_)
        rhs = sp.Integer(b2) ** e2
    sol = sp.solveset(sp.Eq(sp.Integer(b1) ** e1, rhs), x_, sp.S.Reals)
    sol = list(sol)
    for s in sol:
        assert sp.simplify((sp.Integer(b1) ** e1).subs(x_, s) - rhs.subs(x_, s)) == 0
    if len(sol) != 1:
        return Ambiguous(f'{len(sol)} solutions {sol}')
    return Expect(str(sol[0]))


def sub_digits(s):
    return int(s.translate(SUB))


@ref('aolog', 'exact: find rational y with base**y == value verified in exact arithmetic (sympy Rational powers)', 'exhaustive')
def aolog(q):
    m = re.fullmatch(r'Evaluate log([₀-₉]+) (\d+|\(1/\d+\))\. \(A fraction is fine\.\)'.replace('[₀-₉]', '[₀₁₂₃₄₅₆₇₈₉]'), q['prompt'])
    b = sub_digits(m.group(1)); v = m.group(2)
    val = sp.Rational(1, int(v[3:-1])) if v.startswith('(') else sp.Rational(int(v))
    y = Fraction(math.log(val) / math.log(b)).limit_denominator(50)
    assert sp.Integer(b) ** sp.Rational(y.numerator, y.denominator) == val
    return Expect(str(y))


@ref('aologeq', 'quadratic from the product rule solved with sympy; domain filtered (x>0, x±c>0); each kept root verified numerically in the original equation', 'exhaustive')
def aologeq(q):
    m = re.fullmatch(r'Solve log([₀-₉]*) x \+ log\1\(x ([+−]) (\d+)\) = (\d+)\. Give every solution, separated by commas\.'.replace('[₀-₉]', '[₀₁₂₃₄₅₆₇₈₉]'), q['prompt'])
    b = sub_digits(m.group(1)) if m.group(1) else 10
    c = int(m.group(3)) * (1 if m.group(2) == '+' else -1); kk = int(m.group(4))
    cand = sp.solve(sp.Eq(x_ * (x_ + c), sp.Integer(b) ** kk), x_)
    good = []
    for r in cand:
        if r > 0 and r + c > 0:
            v = sp.N(sp.log(r, b) + sp.log(r + c, b), 30)
            assert abs(v - kk) < 1e-20
            good.append(r)
    return Expect(', '.join(str(g) for g in sorted(good)))


@ref('aologlaw', 'prime-factorise N, express in a=log2, b=log3 and log5=1−a; then checked numerically against log10 N to 1e-12', 'exhaustive')
def aologlaw(q):
    N = sp.Rational(re.search(r'express log (.*) in terms', q['prompt']).group(1))
    a, b = sp.symbols('a b')
    f = sp.factorint(N.p); g = sp.factorint(N.q)
    ex = {}
    for pr, e in f.items(): ex[pr] = ex.get(pr, 0) + e
    for pr, e in g.items(): ex[pr] = ex.get(pr, 0) - e
    if set(ex) - {2, 3, 5}:
        return Unsupported('prime factor other than 2,3,5')
    expr = sp.expand(ex.get(2, 0) * a + ex.get(3, 0) * b + ex.get(5, 0) * (1 - a))
    num = expr.subs({a: math.log10(2), b: math.log10(3)})
    assert abs(float(num) - math.log10(float(N))) < 1e-12
    return Expect(str(expr).replace('-', '−') if False else str(expr))


@ref('aogp', 'iterate the progression term by term with exact integers', 'exhaustive')
def aogp(q):
    m = re.fullmatch(r'Find the (\d+)(?:st|nd|rd|th) term of the geometric progression (.*?), …', q['prompt'])
    n = int(m.group(1)); t = ints(m.group(2))
    assert len(t) == 3 and t[1] * t[1] == t[0] * t[2]
    r = Fraction(t[1], t[0]); cur = Fraction(t[0])
    for _ in range(n - 1):
        cur *= r
    return Expect(str(cur))


@ref('aogpsum', 'accumulate the first n terms exactly', 'exhaustive')
def aogpsum(q):
    m = re.fullmatch(r'Find the sum of the first (\d+) terms of the geometric progression (.*?) \+ ⋯', q['prompt'])
    n = int(m.group(1)); body = m.group(2)
    toks = re.findall(r'([+−]?)\s*(\d+)', body)
    t = [(-1 if s == '−' else 1) * int(v) for s, v in toks]
    assert len(t) == 3 and t[1] * t[1] == t[0] * t[2]
    r = Fraction(t[1], t[0]); cur = Fraction(t[0]); tot = Fraction(0)
    for _ in range(n):
        tot += cur; cur *= r
    return Expect(str(tot))


@ref('aogpinf', 'exact limit of partial sums found as the unique fixed point S = t1 + r*S (algebraic), cross-checked with 400 float partial sums', 'exhaustive')
def aogpinf(q):
    body = q['prompt'].split('series ')[1].split(' + ⋯')[0]
    toks = re.findall(r'([+−]?)\s*(\d+(?:/\d+)?)', body)
    t = [(-1 if s == '−' else 1) * Fraction(v) for s, v in toks]
    assert len(t) == 3 and t[1] / t[0] == t[2] / t[1]
    r = t[1] / t[0]
    if abs(r) >= 1:
        return Verdict(False, 'series does not converge but a sum to infinity is asked')
    S = sp.Symbol('S'); sol = sp.solve(sp.Eq(S, sp.Rational(t[0].numerator, t[0].denominator) + sp.Rational(r.numerator, r.denominator) * S), S)[0]
    s = 0.0; term = float(t[0])
    for _ in range(400):
        s += term; term *= float(r)
    assert abs(s - float(sol)) < 1e-6
    return Expect(str(sol))


def money(s):
    return int(s.replace(',', ''))


@ref('aogpgr', 'year-by-year simulation with exact Fractions', 'exhaustive')
def aogpgr(q):
    p = q['prompt']
    m = re.search(r'bacteria\. The number of bacteria (doubles|triples) every hour\. How many bacteria will there be after (\d+) hours\?', p)
    if m:
        n0 = money(re.search(r'A culture has ([\d,]+) bacteria', p).group(1))
        f = {'doubles': 2, 'triples': 3}[m.group(1)]
        v = Fraction(n0)
        for _ in range(int(m.group(2))): v *= f
        return Expect(str(v))
    n = int(re.search(r'after (\d+) years', p).group(1))
    if 'depreciation' in p:
        m = re.search(r'bought for ₹([\d,]+)\. Its value goes down by (\d+)%', p); v = Fraction(money(m.group(1))); rate = -Fraction(int(m.group(2)), 100)
    elif 'compound interest' in p:
        m = re.search(r'₹([\d,]+) is invested at (\d+)%', p); v = Fraction(money(m.group(1))); rate = Fraction(int(m.group(2)), 100)
    else:
        m = re.search(r'population of a town is ([\d,]+)\. It increases by (\d+)%', p); v = Fraction(money(m.group(1))); rate = Fraction(int(m.group(2)), 100)
    for _ in range(n): v = v + v * rate
    return Expect(str(v))


@ref('aogpuse', 'recurring decimal via 10^L·x − x trick; bounce distance via scaling argument X=h+rh+rX; areas by scaling with numeric partial-sum check', 'exhaustive')
def aogpuse(q):
    p = q['prompt']
    m = re.search(r'recurring decimal (\d+)\.(\d+)… \(the block (\d+) repeats', p)
    if m:
        ip, blk = int(m.group(1)), m.group(3)
        L = len(blk)
        # x = ip + 0.blk blk ... ; 10^L y - y = blk  (y the repeating fraction)
        y = Fraction(int(blk), 10 ** L - 1)
        assert m.group(2).startswith((blk * 3)[:len(m.group(2))])
        return Expect(str(ip + y), form=True)
    m = re.search(r'dropped from a height of (\d+) m\. After each bounce it rises to (\d+)/(\d+) of the height', p)
    if m:
        h, r = int(m.group(1)), Fraction(int(m.group(2)), int(m.group(3)))
        X = sp.Symbol('X'); sol = sp.solve(sp.Eq(X, h + sp.Rational(r.numerator, r.denominator) * h + sp.Rational(r.numerator, r.denominator) * X), X)[0]
        tot = 0.0; ht = float(h); tot = ht
        for _ in range(3000):
            ht *= float(r); tot += 2 * ht
        assert abs(tot - float(sol)) < 1e-6
        return Expect(str(sol))
    m = re.search(r'A square has side (\d+) cm', p)
    if m:
        A = int(m.group(1)) ** 2; ratio = Fraction(1, 2)
    else:
        m = re.search(r'equilateral triangle has area (\d+) cm', p); A = int(m.group(1)); ratio = Fraction(1, 4)
    S = sp.Symbol('S'); sol = sp.solve(sp.Eq(S, A + sp.Rational(ratio.numerator, ratio.denominator) * S), S)[0]
    tot = 0.0; t = float(A)
    for _ in range(200): tot += t; t *= float(ratio)
    assert abs(tot - float(sol)) < 1e-9
    return Expect(str(sol))
