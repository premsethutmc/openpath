"""algebra-a, part 3: polynomials, functions, factorisation, rational expressions, linear systems"""
from refs.algebra_a_util import *  # noqa: F401,F403
from kit import ref, Expect, Verdict, Unsupported, Ambiguous

x, y, z, k, t = sp.symbols('x y z k t')
GR = {'α': sp.Symbol('a_'), 'β': sp.Symbol('b_')}


def P(s):
    return sp.expand(ex(s))


def tup(vals):
    return '(' + ', '.join(fs(v) for v in vals) + ')'


def coeffs(poly, var, deg):
    p = sp.Poly(sp.expand(poly), var)
    if p.degree() > deg:
        raise ValueError('degree too high')
    return [Fr(str(p.coeff_monomial(var ** d))) for d in range(deg, -1, -1)]


def eq_sides(s):
    l, r = U(s).split('=')
    return ex(l) - ex(r)


def fn(text):
    return lambda v: ex(text).subs(x, v)


@ref('al3sys', 'SymPy linsolve on the three stated equations; unique solution required and substituted back into each original equation', 'exhaustive')
def al3sys(q):
    body = q['prompt'].split('Solve the system: ')[1].split('. Give')[0]
    eqs = [eq_sides(s) for s in body.split(';')]
    sol = sp.linsolve(eqs, x, y, z)
    sol = list(sol)
    if len(sol) != 1 or any(len(v.free_symbols) for v in sol[0]):
        return Ambiguous('not a unique solution')
    s = sol[0]
    assert all(e.subs({x: s[0], y: s[1], z: s[2]}) == 0 for e in eqs)
    return Expect(tup([Q(v) for v in s]))


@ref('aladd', 'both polynomials parsed and combined with SymPy; coefficients read from the expanded result', 'exhaustive')
def aladd(q):
    e = U(q['prompt']).split('Simplify ')[1].split('. Write the result')[0]
    return Expect(tup(coeffs(P(e), x, 3)))


@ref('alcomp', 'g (or f) evaluated first, then the outer function, by substitution', 'exhaustive')
def alcomp(q):
    m = re.search(r'f\(x\) = (.+?) and g\(x\) = (.+?)\. Find \((f|g) ∘ (f|g)\)\((.+?)\)', U(q['prompt']))
    f, g = ex(m.group(1)), ex(m.group(2))
    outer, inner, a = m.group(3), m.group(4), ex(m.group(5))
    F = {'f': f, 'g': g}
    v = F[inner].subs(x, a)
    return Expect(fs(Q(F[outer].subs(x, v))))


@ref('alcompx', 'composition by substitution and expansion with SymPy', 'exhaustive')
def alcompx(q):
    m = re.search(r'f\(x\) = (.+?) and g\(x\) = (.+?)\. Find \((f|g) ∘ (f|g)\)\(x\)', U(q['prompt']))
    F = {'f': ex(m.group(1)), 'g': ex(m.group(2))}
    return Expect(str(sp.expand(F[m.group(3)].subs(x, F[m.group(4)]))))


@ref('alcub', 'zeros of the cubic from SymPy roots with multiplicity; each re-substituted into the polynomial; distinct real zeros listed', 'exhaustive')
def alcub(q):
    pol = P(re.search(r'p\(x\) = (.+?) and find', U(q['prompt'])).group(1))
    r = sp.roots(sp.Poly(pol, x))
    if sum(r.values()) != 3 or any(not v.is_real for v in r):
        return Verdict(False, f'zeros not all real/rational: {r}')
    assert all(pol.subs(x, v) == 0 for v in r)
    return Expect(lst(sorted(Q(v) for v in r)))


@ref('aldisk', 'discriminant b^2-4ac = 0 solved for k (SymPy); k=0 excluded when k is the leading coefficient; positivity filter as stated', 'exhaustive')
def aldisk(q):
    p = U(q['prompt'])
    pol = P(re.search(r'equation (.+?) = 0 have', p).group(1))
    pp = sp.Poly(pol, x)
    a, b, c = [pp.coeff_monomial(x ** d) for d in (2, 1, 0)]
    sols = [s for s in sp.solve(b ** 2 - 4 * a * c, k) if s != 0 or a != 0]
    if 'positive value' in p:
        sols = [s for s in sols if s > 0]
    sols = [s for s in sols if sp.simplify(a.subs(k, s)) != 0]
    if len(sols) != 1:
        return Ambiguous(f'k candidates {sols}')
    return Expect(fs(Q(sols[0])))


@ref('aleval', 'direct evaluation of the polynomial / solving the linear polynomial = 0', 'exhaustive')
def aleval(q):
    p = U(q['prompt'])
    m = re.search(r'Find the value of p\(x\) = (.+?) at x = (-?\d+)', p)
    if m:
        return Expect(fs(Q(ex(m.group(1)).subs(x, int(m.group(2))))))
    m = re.search(r'Find the zero of the polynomial p\(x\) = (.+?)\. ', p)
    a, b = lin_ab(ex(m.group(1)))
    return Expect(fs(-b / a))


@ref('alfack', 'remainder on division by the factor set to zero (polynomial division) solved for k', 'exhaustive')
def alfack(q):
    m = re.search(r'x ([+-]) (\d+) a factor of (.+?)\?', U(q['prompt']))
    r = -int(m.group(2)) if m.group(1) == '+' else int(m.group(2))
    pol = ex(m.group(3))
    rem = sp.rem(sp.Poly(sp.expand(pol), x), sp.Poly(x - r, x)).as_expr()
    sols = sp.solve(rem, k)
    if len(sols) != 1:
        return Ambiguous(str(sols))
    return Expect(fs(Q(sols[0])))


@ref('alfop', 'f,g evaluated at the point with Fractions; quotient and domain restriction checked', 'exhaustive')
def alfop(q):
    p = U(q['prompt'])
    m = re.search(r'f\(x\) = (.+?) and g\(x\) = (.+?)\.', p)
    f, g = ex(m.group(1)), ex(m.group(2))
    m2 = re.search(r'Find \(f ?([+\-*×/÷]?) ?g\)\((-?\d+)\)', p)
    if m2:
        op, a = m2.group(1), int(m2.group(2))
        fa, ga = Q(f.subs(x, a)), Q(g.subs(x, a))
        if op == '+':
            return Expect(fs(fa + ga))
        if op == '-':
            return Expect(fs(fa - ga))
        if op in ('', '*', '×'):
            return Expect(fs(fa * ga))
        if op in ('/', '÷'):
            if ga == 0:
                return Verdict(False, 'g(a)=0: quotient undefined')
            return Expect(fs(fa / ga))
    if 'not in the domain' in p:
        a, b = lin_ab(g)
        if a == 0:
            return Unsupported('g constant')
        return Expect(fs(-b / a))
    return Unsupported('template')


@ref('alform', 'polynomial built as (x-r1)(x-r2) from the zeros (or x^2 - Sx + P) and expanded exactly with SymPy', 'exhaustive')
def alform(q):
    p = U(q['prompt'])
    m = re.search(r'whose zeros are (.+?) and (.+?)\.$', p)
    if m:
        r1, r2 = ex(m.group(1)), ex(m.group(2))
        return Expect(str(sp.expand((x - r1) * (x - r2))))
    m = re.search(r'sum (-?\d+) and product (-?\d+)', p)
    if m:
        S, Pd = int(m.group(1)), int(m.group(2))
        return Expect(str(sp.expand(x ** 2 - S * x + Pd)))
    return Unsupported('template')


def _fl(pol):
    c, fl = sp.factor_list(sp.Poly(pol, x))
    return {sp.Poly(f, x).monic().as_expr(): m for f, m in fl}


def _gcd_f(pols):
    fs_ = [_fl(p) for p in pols]
    common = set(fs_[0])
    for d in fs_[1:]:
        common &= set(d)
    out = sp.Integer(1)
    for f in common:
        out *= f ** min(d[f] for d in fs_)
    return out


def _lcm_f(pols):
    fs_ = [_fl(p) for p in pols]
    allf = set().union(*[set(d) for d in fs_])
    out = sp.Integer(1)
    for f in allf:
        out *= f ** max(d.get(f, 0) for d in fs_)
    return out


def _polys_after(prompt, key):
    s = prompt.split(key)[1].split('. ')[0] if '. ' in prompt.split(key)[1] else prompt.split(key)[1].rstrip('.')
    s = s.replace(' and ', ', ')
    parts = [p.strip() for p in s.split(', ')]
    return [P(p) for p in parts]


@ref('algcd', 'GCD from the irreducible factorisations (common factors, min multiplicity), cross-checked with SymPy gcd', 'exhaustive')
def algcd(q):
    ps = _polys_after(U(q['prompt']), 'Find the GCD of ')
    g = _gcd_f(ps)
    h = sp.Poly(sp.gcd_list(ps), x).monic().as_expr()
    assert sp.expand(g - h) == 0, (g, h)
    return Expect(str(sp.expand(g)))


@ref('algcd3', 'GCD from the irreducible factorisations (common factors, min multiplicity), cross-checked with SymPy gcd', 'exhaustive')
def algcd3(q):
    return algcd(q)


@ref('allcm', 'LCM from the irreducible factorisations (union, max multiplicity), cross-checked with SymPy lcm', 'exhaustive')
def allcm(q):
    ps = _polys_after(U(q['prompt']), 'Find the LCM of ')
    l = _lcm_f(ps)
    h = sp.Poly(sp.lcm_list(ps), x).monic().as_expr()
    assert sp.expand(l - h) == 0
    return Expect(str(sp.factor(l)))


@ref('alglp', 'q = GCD x LCM / p by exact polynomial division (remainder must be 0); product identity re-multiplied', 'exhaustive')
def alglp(q):
    p = U(q['prompt'])
    m = re.search(r'GCD of two polynomials p\(x\) and q\(x\) is (.+?) and their LCM is (.+?)\. If p\(x\) = (.+?),', p)
    G, L, Pp = P(m.group(1)), P(m.group(2)), P(m.group(3))
    qq, r = sp.div(sp.Poly(sp.expand(G * L), x), sp.Poly(Pp, x))
    if r != 0:
        return Verdict(False, 'GCD x LCM not divisible by p')
    return Expect(str(qq.as_expr()))


def _eqcoef(s):
    e = sp.expand(eq_sides(s))
    pp = sp.Poly(e, x, y)
    return pp.coeff_monomial(x), pp.coeff_monomial(y), -pp.coeff_monomial(1)


@ref('alkcase', 'ranks of the coefficient and augmented matrices as functions of k: candidates from vanishing 2x2 minors, classified by rank', 'exhaustive')
def alkcase(q):
    p = U(q['prompt'])
    m = re.search(r'pair of equations (.+?) and (.+?) have (no solution|infinitely many solutions)', p)
    r1, r2 = _eqcoef(m.group(1)), _eqcoef(m.group(2))
    M = sp.Matrix([list(r1), list(r2)])
    cands = set()
    for cols in [(0, 1), (0, 2), (1, 2)]:
        d = M[:, list(cols)].det()
        if d.has(k):
            cands |= set(sp.solve(d, k))
        elif d != 0 if False else False:
            pass
    cands = list(cands) or [0]
    out = []
    for kv in cands:
        Mk = M.subs(k, kv)
        A = Mk[:, :2]
        rk, rka = A.rank(), Mk.rank()
        if m.group(3) == 'no solution' and rk < rka:
            out.append(kv)
        if m.group(3).startswith('infinitely') and rk == rka and rk < 2:
            out.append(kv)
    if len(out) != 1:
        return Ambiguous(f'k candidates {out}')
    return Expect(fs(Q(out[0])))


@ref('alldiv', 'polynomial long division with SymPy div; p re-assembled from divisor*q + r', 'exhaustive')
def alldiv(q):
    p = U(q['prompt'])
    m = re.search(r'Divide p\(x\) = (.+?) by (.+?)\. Write', p)
    num, den = P(m.group(1)), P(m.group(2))
    qq, r = sp.div(sp.Poly(num, x), sp.Poly(den, x))
    assert sp.expand(den * qq.as_expr() + r.as_expr() - num) == 0
    if 'q(x) = ax² + bx + c' in p:
        return Expect(tup(coeffs(qq.as_expr(), x, 2) + coeffs(r.as_expr(), x, 0)))
    return Expect(tup(coeffs(qq.as_expr(), x, 1) + coeffs(r.as_expr(), x, 1)))


@ref('almono', 'term-wise division by the monomial with SymPy; remainder must be zero', 'exhaustive')
def almono(q):
    m = re.search(r'Divide (.+?) by (.+?)\. Write', U(q['prompt']))
    qq, r = sp.div(sp.Poly(P(m.group(1)), x), sp.Poly(P(m.group(2)), x))
    if r != 0:
        return Verdict(False, 'not exact')
    return Expect(tup(coeffs(qq.as_expr(), x, 2)))


@ref('alpdeg', 'SymPy Poly degree / coefficient extraction', 'exhaustive')
def alpdeg(q):
    p = U(q['prompt'])
    m = re.search(r'What is the degree of the (?:polynomial|monomial) (.+?)\?$', p)
    if m:
        pol = P(m.group(1))
        return Expect(str(sp.Poly(pol, *sorted(pol.free_symbols, key=str)).total_degree()))
    m = re.search(r'What is the coefficient of the constant term in (.+?)\?', p)
    if m:
        return Expect(fs(Q(P(m.group(1)).subs(x, 0))))
    m = re.search(r'coefficient of x(\d?|[²³⁴⁵⁶⁷⁸⁹]?) in (.+?)\? ', p)
    m = re.search(r'What is the coefficient of (x[²³⁴⁵⁶⁷⁸⁹]?) in (.+?)\?', p)
    if m:
        mon = ex(m.group(1))
        pp = sp.Poly(P(m.group(2)), x)
        return Expect(fs(Q(pp.coeff_monomial(mon))))
    return Unsupported('template')


@ref('alpdiv', 'quotient of SymPy polynomial division by x - r', 'exhaustive')
def alpdiv(q):
    m = re.search(r'Divide p\(x\) = (.+?) by (.+?)\. What is the quotient', U(q['prompt']))
    qq, r = sp.div(sp.Poly(P(m.group(1)), x), sp.Poly(P(m.group(2)), x))
    return Expect(str(qq.as_expr()))


@ref('alpmul', 'product expanded with SymPy', 'exhaustive')
def alpmul(q):
    m = re.search(r'Multiply (.+?) and simplify', U(q['prompt']))
    return Expect(tup(coeffs(P(m.group(1)), x, 3)))


@ref('alpred', 'initial value, rate and direction read from the statement; evaluated at the asked time', 'exhaustive')
def alpred(q):
    p = q['prompt']
    nums = ints(p.replace('₹', ''))
    a, b, tt = nums[0], nums[1], nums[-1]
    dec = any(w in p for w in ['drawn', 'burns down', 'pays back', 'falls'])
    v = a - b * tt if dec else a + b * tt
    if v < 0:
        return Verdict(False, f'negative quantity {v}')
    return Expect(str(v))


@ref('alpsq', 'factor_list: every irreducible factor to an even power; square root assembled; positive leading coefficient', 'exhaustive')
def alpsq(q):
    pol = P(re.search(r'square root of (.+?)\. Write', U(q['prompt'])).group(1))
    c, fl = sp.factor_list(sp.Poly(pol, x))
    if any(m % 2 for _, m in fl) or c <= 0 or sp.sqrt(c) != int(sp.sqrt(c)):
        return Verdict(False, 'not a perfect square')
    r = sp.sqrt(c)
    for f, m in fl:
        r *= f.as_expr() ** (m // 2)
    r = sp.expand(r)
    assert sp.expand(r ** 2 - pol) == 0
    if sp.Poly(r, x).LC() < 0:
        r = -r
    return Expect(str(r))


@ref('alqtab', 'quadratic equation solved algebraically (SymPy), solutions cross-checked against the table row', 'exhaustive')
def alqtab(q):
    p = U(q['prompt'])
    m = re.search(r'Use it to solve (.+?)\. Enter', p)
    e = eq_sides(m.group(1))
    roots = sorted(set(Q(v) for v in sp.roots(sp.Poly(e, x))))
    hd = [int(h.replace('−', '-')) for h in q['figure']['head'][1:]]
    ys = [int(v.replace('−', '-')) for v in q['figure']['rows'][0][1:]]
    c = ex(m.group(1).split('=')[1])
    tab = sorted(Fr(h) for h, yv in zip(hd, ys) if yv == c)
    if tab != roots:
        return Verdict(False, f'table solutions {tab} differ from algebraic {roots}')
    return Expect(lst(roots))


@ref('alratl', 'rational function cancelled with SymPy; monic linear numerator/denominator read off', 'exhaustive')
def alratl(q):
    m = re.search(r'Reduce \((.+?)\) / \((.+?)\) to', U(q['prompt']))
    N, D = P(m.group(1)), P(m.group(2))
    ex_ = sp.cancel(N / D)
    n, d = sp.fraction(sp.together(ex_))
    pn, pd = sp.Poly(n, x), sp.Poly(d, x)
    if pn.degree() != 1 or pd.degree() != 1 or pn.LC() != 1 or pd.LC() != 1:
        return Unsupported(f'not (x+p)/(x+q): {n}/{d}')
    return Expect(tup([Q(pn.coeff_monomial(1)), Q(pd.coeff_monomial(1))]))


@ref('alratx', 'excluded values = distinct real zeros of the denominator as written', 'exhaustive')
def alratx(q):
    m = re.search(r'is \((.+?)\) / \((.+?)\) not defined', U(q['prompt']))
    D = P(m.group(2))
    r = sorted(set(Q(v) for v in sp.roots(sp.Poly(D, x))))
    return Expect(lst(r))


@ref('alrem', 'remainder by polynomial division, cross-checked with p(root)', 'exhaustive')
def alrem(q):
    m = re.search(r'remainder when p\(x\) = (.+?) is divided by (.+?)\.$', U(q['prompt']))
    N, D = P(m.group(1)), P(m.group(2))
    r = sp.rem(sp.Poly(N, x), sp.Poly(D, x)).as_expr()
    a, b = lin_ab(D)
    assert N.subs(x, sp.Rational(-b.numerator, b.denominator) / sp.Rational(a.numerator, a.denominator)) == r
    return Expect(str(r))


@ref('alrop', 'rational expression simplified with SymPy cancel / together; monic linear form (x+p)/(x+q) or numerator mx+n over the stated denominator', 'exhaustive')
def alrop(q):
    p = U(q['prompt'])
    m = re.search(r'Simplify (.+?)\. The result', p)
    if m:
        s = m.group(1)
        if ' ÷ ' in s or '/' in s and '÷' in s:
            a, b = s.split(' ÷ ')
            val = ex(a) / ex(b)
        else:
            a, b = s.split(' * ')
            val = ex(a) * ex(b)
        n, d = sp.fraction(sp.cancel(sp.together(val)))
        pn, pd = sp.Poly(n, x), sp.Poly(d, x)
        if pn.degree() != 1 or pd.degree() != 1 or pn.LC() != 1 or pd.LC() != 1:
            return Unsupported(f'not (x+p)/(x+q): {n}/{d}')
        return Expect(tup([Q(pn.coeff_monomial(1)), Q(pd.coeff_monomial(1))]))
    m = re.search(r'Write (.+?) as a single fraction with denominator (.+?)\. Its numerator', p)
    if m:
        e, den = ex(m.group(1)), ex(m.group(2))
        num = sp.expand(sp.cancel(sp.together(e) * den))
        return Expect(tup(coeffs(num, x, 1)))
    return Unsupported('template')


@ref('alrule', 'straight line fitted through the first two points and verified on every tabulated point', 'exhaustive')
def alrule(q):
    xs = [int(h.replace('−', '-')) for h in q['figure']['head'][1:]]
    ys = [int(v.replace('−', '-')) for v in q['figure']['rows'][0][1:]]
    m = Fr(ys[1] - ys[0], xs[1] - xs[0])
    b = ys[0] - m * xs[0]
    if any(m * a + b != c for a, c in zip(xs, ys)):
        return Ambiguous('points not collinear')
    return Expect(str(sp.expand(sp.Rational(m.numerator, m.denominator) * x + sp.Rational(b.numerator, b.denominator))))


@ref('alsol2', 'unknown coordinate solved from the equation by Fractions', 'exhaustive')
def alsol2(q):
    p = U(q['prompt'])
    m = re.search(r'\((-?\d+), y\) is a solution of the equation (.+?)\. Find y', p)
    if m:
        e = eq_sides(m.group(2)).subs(x, int(m.group(1)))
        a, b = lin_ab(e, y)
        return Expect(fs(-b / a))
    m = re.search(r'\(x, (-?\d+)\) is a solution of the equation (.+?)\. Find x', p)
    if m:
        e = eq_sides(m.group(2)).subs(y, int(m.group(1)))
        a, b = lin_ab(e, x)
        return Expect(fs(-b / a))
    return Unsupported('template')


@ref('alsplit', 'integer pairs (r, s) with r+s = b and rs = ac enumerated; statement numbers cross-checked', 'exhaustive')
def alsplit(q):
    p = U(q['prompt'])
    pol = P(re.search(r'To factorise (.+?) by splitting', p).group(1))
    A, B, C = [int(pol.coeff(x, d)) for d in (2, 1, 0)] if False else [int(sp.Poly(pol, x).coeff_monomial(x ** d)) for d in (2, 1, 0)]
    sols = [(r, s) for r in range(-400, 401) for s in range(r, 401) if r + s == B and r * s == A * C]
    m = re.search(r'where r \+ s = (-?\d+) and rs = .*? = (-?\d+)\.', p)
    if m and (int(m.group(1)), int(m.group(2))) != (B, A * C):
        return Verdict(False, 'statement numbers disagree with polynomial')
    if len(sols) != 1:
        return Ambiguous(str(sols))
    return Expect(f'{sols[0][0]}, {sols[0][1]}')


@ref('alsym', 'zeros found exactly (quadratic formula via SymPy roots) and the asked expression evaluated directly at them', 'exhaustive')
def alsym(q):
    p = U(q['prompt'])
    pol = P(re.search(r'zeros of p\(x\) = (.+?)\. Without', p).group(1))
    e = re.search(r'find the value of (.+?)\. \(A fraction', p).group(1)
    e = e.replace('α', 'A_').replace('β', 'B_')
    rts = sp.roots(sp.Poly(pol, x))
    rl = []
    for r, mlt in rts.items():
        rl += [r] * mlt
    if len(rl) != 2:
        return Verdict(False, 'zeros not both resolvable')
    val = sp.simplify(ex(e).subs({sp.Symbol('A_'): rl[0], sp.Symbol('B_'): rl[1]}, simultaneous=True))
    if not val.is_rational:
        return Verdict(False, f'value not rational: {val}')
    return Expect(fs(Q(val)))


def _lin2(eq1, eq2):
    sol = sp.linsolve([eq1, eq2], x, y)
    sol = list(sol)
    if len(sol) != 1 or any(len(v.free_symbols) for v in sol[0]):
        return None
    return sol[0]


@ref('alsys', 'SymPy linsolve; unique solution re-substituted in both original equations', 'exhaustive')
def alsys(q):
    m = re.search(r'Solve the pair of equations (.+?) and (.+?)\. Give', U(q['prompt']))
    e1, e2 = eq_sides(m.group(1)), eq_sides(m.group(2))
    s = _lin2(e1, e2)
    if s is None:
        return Ambiguous('not unique')
    assert e1.subs({x: s[0], y: s[1]}) == 0 and e2.subs({x: s[0], y: s[1]}) == 0
    return Expect(tup([Q(s[0]), Q(s[1])]))


@ref('alsysw', 'purchase equations a*pen + b*notebook = total solved with SymPy', 'exhaustive')
def alsysw(q):
    ms = re.findall(r'buys (\d+) pens? and (\d+) notebooks? (?:of the same kinds )?for ₹(\d+)', q['prompt'])
    if len(ms) != 2:
        return Unsupported('template')
    (a1, b1, c1), (a2, b2, c2) = [[int(v) for v in m] for m in ms]
    s = _lin2(a1 * x + b1 * y - c1, a2 * x + b2 * y - c2)
    if s is None:
        return Ambiguous('not unique')
    return Expect(tup([Q(s[0]), Q(s[1])]))


@ref('alsysx', 'each situation modelled and solved exhaustively (ages, digits) or by linear solve (boat) / integer search (rectangle)', 'exhaustive')
def alsysx(q):
    p = q['prompt']
    m = re.search(r'sum of the present ages of a father and his son is (\d+) years\. (\d+) years? ago, the father was (\d+) times', p)
    if m:
        S, ago, mult = [int(v) for v in m.groups()]
        sol = [(f, S - f) for f in range(0, S + 1) if (f - ago) == mult * (S - f - ago)]
        return Expect(tup(sol[0])) if len(sol) == 1 else Ambiguous(str(sol))
    m = re.search(r'sum of the digits of a two-digit number is (\d+)\. The number formed by reversing its digits is (greater|less) than the original number by (\d+)', p)
    if m:
        S, d, dd = int(m.group(1)), m.group(2), int(m.group(3))
        sol = []
        for n_ in range(10, 100):
            t_, u_ = divmod(n_, 10)
            rev = 10 * u_ + t_
            if t_ + u_ == S and (rev - n_ == dd if d == 'greater' else n_ - rev == dd):
                sol.append((t_, u_))
        return Expect(tup(sol[0])) if len(sol) == 1 else Ambiguous(str(sol))
    m = re.search(r'goes (\d+) km downstream in (\d+) hours?, and (\d+) km upstream in (\d+) hours?', p)
    if m:
        d1, t1, d2, t2 = [int(v) for v in m.groups()]
        bs = sp.linsolve([x + y - sp.Rational(d1, t1), x - y - sp.Rational(d2, t2)], x, y)
        s = list(bs)[0]
        return Expect(tup([Q(s[0]), Q(s[1])]))
    m = re.search(r'length of a rectangular garden is (\d+) m more than its width, and its perimeter is (\d+) m', p)
    if m:
        d, per = int(m.group(1)), int(m.group(2))
        sol = [(w + d, w) for w in range(1, 500) if 2 * (2 * w + d) == per]
        return Expect(tup(sol[0])) if len(sol) == 1 else Ambiguous(str(sol))
    return Unsupported('template')


@ref('alzgr', 'x-axis crossings/touches counted on the drawn polyline (sign changes between consecutive vertices, clusters of zero vertices); counts only what is visible', 'exhaustive')
def alzgr(q):
    segs = q['figure']['segments']
    pts = [tuple(segs[0][0])]
    for a, b in segs:
        if tuple(a) != pts[-1]:
            pts.append(tuple(a))  # broken polyline (clipped): start a new run
            pts.append(None)
        pts.append(tuple(b))
    # split into runs
    runs, cur = [], []
    for p in pts:
        if p is None:
            runs.append(cur); cur = []
        else:
            cur.append(p)
    runs.append(cur)
    zeros = 0
    for run in runs:
        ys = [pt[1] for pt in run]
        i = 0
        while i < len(ys):
            if abs(ys[i]) < 1e-9:
                j = i
                while j + 1 < len(ys) and abs(ys[j + 1]) < 1e-9:
                    j += 1
                zeros += 1
                i = j + 1
            else:
                if i + 1 < len(ys) and ys[i] * ys[i + 1] < 0:
                    zeros += 1
                i += 1
    return Expect(str(zeros))


@ref('ajzero', 'zeros of the quadratic from SymPy roots, re-substituted into p(x)', 'exhaustive')
def ajzero(q):
    pol = P(re.search(r'p\(x\) = (.+?) by factorising', U(q['prompt'])).group(1))
    r = sp.roots(sp.Poly(pol, x))
    assert all(pol.subs(x, v) == 0 for v in r)
    if sum(r.values()) != 2 or any(not v.is_rational for v in r):
        return Verdict(False, f'zeros not two rationals: {r}')
    return Expect(lst(sorted(Q(v) for v in r for _ in range(1))))


def _pmul(a, b):
    out = [0] * (len(a) + len(b) - 1)
    for i, u in enumerate(a):
        for j, v in enumerate(b):
            out[i + j] += u * v
    return out


@ref('ajfspl', 'integer search for the two box values so that the product of the two stated binomials expands to the trinomial', 'exhaustive')
def ajfspl(q):
    p = U(q['prompt'])
    pol = P(re.search(r'Factorise (.+?) by splitting', p).group(1))
    C2, C1, C0 = [int(sp.Poly(pol, x).coeff_monomial(x ** d)) for d in (2, 1, 0)]
    m = re.search(r'Write it as \((\d*)x \+ □\)\((\d*)x \+ □\)', p)
    a = int(m.group(1) or 1)
    b = int(m.group(2) or 1)
    sol = [(u, v) for u in range(-300, 301) for v in range(-300, 301) if _pmul([u, a], [v, b]) == [C0, C1, C2]]
    if len(sol) != 1:
        return Ambiguous(str(sol))
    return Expect(tup(sol[0]))


@ref('ajfsq', 'positive integer search for the stated form, expanded and compared coefficient-wise (x and y)', 'exhaustive')
def ajfsq(q):
    p = U(q['prompt'])
    m = re.search(r'Factorise (.+?) using an identity\. Write it as (.+?) with positive whole numbers and type \((\w), (\w)\)', p)
    pol = P(m.group(1))
    form, n1, n2 = m.group(2), m.group(3), m.group(4)
    A, B = sp.symbols('A_ B_')
    f = form.replace('(ax', '(A_*x').replace('(x +', '(x +').replace('c(', 'A_*(')
    f = f.replace(' − by', ' - B_*y').replace(' + by', ' + B_*y').replace('ax', 'A_*x') if False else form
    tpl = form.replace('ax', 'A*x').replace('by', 'B*y').replace('c(', 'A*(')
    tpl = re.sub(r'([+−-]) b\)', lambda mm: ('+' if mm.group(1) == '+' else '-') + ' B)', tpl)
    tpl = tpl.replace('−', '-').replace('²', '**2')
    tpl = tpl.replace('(x + b)', '(x + B)').replace('(x - b)', '(x - B)')
    Aa, Bb = sp.symbols('A B')
    sols = []
    for av in range(1, 25):
        for bv in range(1, 25):
            val = eval(tpl, {'A': av, 'B': bv, 'x': x, 'y': y})
            if sp.expand(val - pol) == 0:
                sols.append((av, bv))
    if len(sols) != 1:
        return Ambiguous(f'{tpl} -> {sols}')
    return Expect(tup(sols[0]))


@ref('ajfgrp', 'common-factor extraction by SymPy factor_list / grouping factor division', 'exhaustive')
def ajfgrp(q):
    p = U(q['prompt'])
    m = re.search(r'Factorise (.+?) completely by taking out the highest common factor\. Write it as g·xy\(ax ([+-]) by\)', p)
    if m:
        pol = P(m.group(1))
        g = sp.gcd(sp.Poly(pol, x, y).coeffs()[0], sp.Integer(0))
        c = sp.Poly(pol, x, y)
        gg = sp.igcd(*[int(v) for v in c.coeffs()])
        rest = sp.expand(sp.cancel(pol / (gg * x * y)))
        pr = sp.Poly(rest, x, y)
        a_ = pr.coeff_monomial(x)
        b_ = pr.coeff_monomial(y)
        sign = 1 if m.group(2) == '+' else -1
        if sp.expand(gg * x * y * (a_ * x + b_ * y) - pol) != 0:
            return Verdict(False, 'not of the claimed form')
        if b_ * sign < 0:
            return Verdict(False, 'sign of b inconsistent with the template')
        return Expect(tup([Q(gg), Q(a_), Q(abs(b_))]))
    m = re.search(r'Factorise (.+?) by grouping.*One factor is \((.+?)\)\. Write the other as \(ax \+ b\)', p)
    if m:
        pol = P(m.group(1))
        f1 = P(m.group(2))
        qq, r = sp.div(sp.Poly(pol, x), sp.Poly(f1, x))
        if r != 0:
            return Verdict(False, 'stated factor does not divide')
        return Expect(tup(coeffs(qq.as_expr(), x, 1)))
    return Unsupported('template')
