"""algebra-a, part 5: choice-type families. The exported questions hold only the keyed letter; the option texts shown to the learner
(statement side) were exported separately to /tmp/certout/algebra-a/choiceopts/<family>.jsonl. Every option is evaluated
independently as a mathematical statement; exactly one must be true and it must be the keyed letter."""
import json
import os
from refs.algebra_a_util import *  # noqa: F401,F403
from kit import ref, Expect, Verdict, Unsupported, Ambiguous

x, y = sp.symbols('x y')
OPTDIR = os.environ.get('ALGA_OPTS', '/tmp/certout/algebra-a/choiceopts')
_C = {}


def options(fam, qid):
    if fam not in _C:
        _C[fam] = {}
        with open(f'{OPTDIR}/{fam}.jsonl') as f:
            for l in f:
                r = json.loads(l)
                _C[fam][r['id']] = r['options']
    return _C[fam][qid]


def pick(q, fam, truth):
    """truth(option_text) -> bool; exactly one option must be true"""
    opts = options(fam, q['id'])
    hits = [i for i, o in enumerate(opts) if truth(o)]
    if len(hits) != 1:
        return Ambiguous(f'{len(hits)} options satisfy the statement: {[opts[i] for i in hits]}')
    return Expect('ABCDEF'[hits[0]])


def num(s):
    return int(s.replace(',', '').replace('−', '-'))


@ref('above', 'both graphs evaluated at the given x with exact integers; the option naming the higher graph', 'exhaustive')
def above(q):
    p = U(q['prompt'])
    m = re.search(r'At x = (-?\d+), which graph is higher: y = (.+?) or y = x²', p)
    xv = int(m.group(1))
    l = int(ex(m.group(2)).subs(x, xv))
    r = xv * xv
    if l == r:
        return Ambiguous('graphs meet at this x')
    want = 'The line' if l > r else 'The parabola y = x²'
    return pick(q, 'above', lambda o: o == want)


@ref('accmpx', 'both sides evaluated exactly (Fractions); the option equal to the sign of the difference', 'exhaustive')
def accmpx(q):
    s = U(q['prompt']).split(': ')[-1]
    l, r = s.split('○')
    f = lambda t: Fr(eval(t.strip().replace('×', '*').replace('÷', '/')))
    a, b = f(l), f(r)
    sign = '>' if a > b else '<' if a < b else '='
    return pick(q, 'accmpx', lambda o: o == sign)


@ref('acfacts', 'each option parsed as an equation; it must be arithmetically true, of the asked operation, and use exactly the numbers of the given fact', 'exhaustive')
def acfacts(q):
    p = q['prompt']
    opts = options('acfacts', q['id'])
    def parse(o):
        m = re.fullmatch(r'([\d,]+) ([+−×÷=]) ([\d,]+) ([+−×÷=]) ([\d,]+)', o)
        if m:
            a, o1, b, o2, c = m.groups()
            if o1 == '=':
                return (num(a),), None  # not needed
            return (num(a), o1, num(b), num(c)) if o2 == '=' else None
        m = re.fullmatch(r'([\d,]+) = ([\d,]+) ([×]) ([\d,]+)', o)
        if m:
            return ('eqmul', num(m.group(1)), num(m.group(2)), num(m.group(4)))
        return None
    ev = {'+': lambda a, b: a + b, '−': lambda a, b: a - b, '×': lambda a, b: a * b, '÷': lambda a, b: Fr(a, b) if b else None}
    m = re.match(r'([\d,]+) \+ ([\d,]+) = ([\d,]+)\. Which subtraction fact', p)
    if m:
        nums = sorted(num(v) for v in m.groups()); want = '−'
    else:
        m = re.search(r'worked out ([\d,]+) − ([\d,]+) = ([\d,]+)\. Which addition', p)
        if m:
            nums = sorted(num(v) for v in m.groups()); want = '+'
        else:
            m = re.match(r'([\d,]+) × ([\d,]+) = ([\d,]+)\. Which division fact', p)
            if m:
                nums = sorted(num(v) for v in m.groups()); want = '÷'
            else:
                m = re.match(r'In ([\d,]+) ÷ ([\d,]+) = ([\d,]+), .*dividend = divisor × quotient', p)
                if not m:
                    return Unsupported('template')
                D, d, Qq = [num(v) for v in m.groups()]
                def t(o):
                    mm = re.fullmatch(r'([\d,]+) = ([\d,]+) × ([\d,]+)', o)
                    return bool(mm) and (num(mm.group(1)), num(mm.group(2)), num(mm.group(3))) == (D, d, Qq) and D == d * Qq
                return pick(q, 'acfacts', t)
    def truth(o):
        mm = re.fullmatch(r'([\d,]+) ([+−×÷]) ([\d,]+) = ([\d,]+)', o)
        if not mm:
            return False
        a, op, b, c = num(mm.group(1)), mm.group(2), num(mm.group(3)), num(mm.group(4))
        return op == want and ev[op](a, b) == c and sorted([a, b, c]) == nums
    return pick(q, 'acfacts', truth)


def _seq_ok(rule, s):
    n = len(s)
    T = lambda k: k * (k + 1) // 2
    if 'consecutive square numbers' in rule:
        return any(all(s[i] == (k + i) ** 2 for i in range(n)) for k in range(1, 60))
    if 'consecutive triangular numbers' in rule:
        return any(all(s[i] == T(k + i) for i in range(n)) for k in range(1, 60))
    if 'consecutive cube numbers' in rule:
        return any(all(s[i] == (k + i) ** 3 for i in range(n)) for k in range(1, 40))
    if 'consecutive odd numbers' in rule:
        return all(s[i] == s[0] + 2 * i for i in range(n)) and s[0] % 2 == 1
    if 'consecutive even numbers' in rule:
        return all(s[i] == s[0] + 2 * i for i in range(n)) and s[0] % 2 == 0
    m = re.fullmatch(r'Add (\d+) each time', rule)
    if m:
        d = int(m.group(1))
        return all(s[i + 1] - s[i] == d for i in range(n - 1))
    m = re.fullmatch(r'Add (\d+), then (\d+), then (\d+), and so on \(one more each time\)', rule)
    if m:
        d = int(m.group(1))
        return all(s[i + 1] - s[i] == d + i for i in range(n - 1))
    if 'double the one before' in rule:
        return all(s[i + 1] == 2 * s[i] for i in range(n - 1))
    if 'three times the one before' in rule:
        return all(s[i + 1] == 3 * s[i] for i in range(n - 1))
    raise ValueError('option not recognised: ' + rule)


@ref('affrule', 'each option rule generated and compared with every shown term; exactly one option must reproduce the sequence', 'exhaustive')
def affrule(q):
    s = [int(v) for v in re.search(r'sequence ([\d, ]+), …', q['prompt']).group(1).replace(' ', '').split(',') if v]
    return pick(q, 'affrule', lambda o: _seq_ok(o, s))


@ref('ahvary', 'ratios y/x and products xy of the tabulated pairs (exact)', 'exhaustive')
def ahvary(q):
    xs = [Fr(U(v)) for v in q['figure']['head'][1:]]
    ys = [Fr(U(v)) for v in q['figure']['rows'][0][1:]]
    direct = len({b / a for a, b in zip(xs, ys)}) == 1
    inverse = len({a * b for a, b in zip(xs, ys)}) == 1
    if direct and inverse:
        return Ambiguous('both')
    want = 'direct' if direct else 'inverse' if inverse else 'neither'
    def t(o):
        if want == 'neither':
            return o.startswith('neither')
        return o.startswith(want)
    return pick(q, 'ahvary', t)


@ref('ajzchk', 'sum and product of the quoted zeros compared (exact Fractions) with -b/a and c/a of the quoted polynomial', 'exhaustive')
def ajzchk(q):
    p = U(q['prompt'])
    m = re.search(r'p\(x\) = (.+?) and found the zeros (.+?) and (.+?)\. Check', p)
    pol = sp.Poly(ex(m.group(1)), x)
    a, b, c = [Fr(str(pol.coeff_monomial(x ** d))) for d in (2, 1, 0)]
    r1, r2 = Fr(m.group(2)), Fr(m.group(3))
    s_ok = r1 + r2 == -b / a
    p_ok = r1 * r2 == c / a
    key = ('Both checks hold' if s_ok and p_ok else 'Only the sum check fails' if (not s_ok and p_ok) else
           'Only the product check fails' if (s_ok and not p_ok) else 'Both checks fail')
    return pick(q, 'ajzchk', lambda o: o.startswith(key))


def _rank_class(M, nv):
    ra, rb = M[:, :nv].rank(), M.rank()
    return 'Exactly one solution' if ra == nv else ('No solution' if rb > ra else 'Infinitely many solutions')


@ref('alcons', 'rank of coefficient vs augmented matrix (SymPy)', 'exhaustive')
def alcons(q):
    m = re.search(r'have\? (.+?) and (.+?)\.$', U(q['prompt']))
    rows = []
    for s in (m.group(1), m.group(2)):
        e = sp.Poly(sp.expand(eq_sides(s)), x, y)
        rows.append([e.coeff_monomial(x), e.coeff_monomial(y), -e.coeff_monomial(1)])
    want = _rank_class(sp.Matrix(rows), 2)
    return pick(q, 'alcons', lambda o: o == want)


def eq_sides(s):
    l, r = U(s).split('=')
    return ex(l) - ex(r)


@ref('al3cons', 'rank of coefficient vs augmented matrix (SymPy)', 'exhaustive')
def al3cons(q):
    z = sp.Symbol('z')
    body = U(q['prompt']).split('have? ')[1].rstrip('.')
    rows = []
    for s in body.split(';'):
        e = sp.Poly(sp.expand(eq_sides(s)), x, y, z)
        rows.append([e.coeff_monomial(x), e.coeff_monomial(y), e.coeff_monomial(z), -e.coeff_monomial(1)])
    want = _rank_class(sp.Matrix(rows), 3)
    return pick(q, 'al3cons', lambda o: o == want)


@ref('alinf', 'each claimed point substituted into the equation (exact)', 'exhaustive')
def alinf(q):
    p = U(q['prompt'])
    m = re.search(r'equation (.+?), (\w+) says \((-?\d+), (-?\d+)\) is a solution and (\w+) says \((-?\d+), (-?\d+)\) is a solution', p)
    e = eq_sides(m.group(1))
    n1, n2 = m.group(2), m.group(5)
    s1 = e.subs({x: int(m.group(3)), y: int(m.group(4))}) == 0
    s2 = e.subs({x: int(m.group(6)), y: int(m.group(7))}) == 0
    def t(o):
        if s1 and s2:
            return o.startswith('Both are right')
        if s1:
            return o == f'Only {n1} is right'
        if s2:
            return o == f'Only {n2} is right'
        return o == 'Neither is right'
    return pick(q, 'alinf', t)


def _nf(o):
    return o


def _coef_text(A):
    return 'x' if A == 1 else '−x' if A == -1 else f'{fs(A)}x'.replace('-', '−')


@ref('almeth', 'the stated procedure carried out exactly (Fractions); option compared as text of the resulting equation / triple; uniqueness checked', 'exhaustive')
def almeth(q):
    p = U(q['prompt'])
    opts = options('almeth', q['id'])
    if 'by substitution' in p:
        m = re.search(r'Solve (.+?) and (.+?) by substitution', p)
        e1, e2 = [sp.Poly(sp.expand(eq_sides(s)), x, y) for s in (m.group(1), m.group(2))]
        a1, b1, c1 = e1.coeff_monomial(x), e1.coeff_monomial(y), -e1.coeff_monomial(1)
        a2, b2, c2 = e2.coeff_monomial(x), e2.coeff_monomial(y), -e2.coeff_monomial(1)
        if b1 != 1:
            return Unsupported('coefficient of y in first equation not 1')
        # y = c1 - a1 x ; a2 x + b2 (c1 - a1 x) = c2
        A, C = Fr(str(a2 - b2 * a1)), Fr(str(c2 - b2 * c1))
        want = f'{_coef_text(A)} = {fs(C)}'.replace('-', '−')
        return pick(q, 'almeth', lambda o: o == want)
    if 'by elimination' in p:
        m = re.search(r'Solve (.+?) … \(1\) and (.+?) … \(2\) by elimination: multiply \(1\) by (\d+) and \(2\) by (\d+)', p)
        e1, e2 = [sp.Poly(sp.expand(eq_sides(s)), x, y) for s in (m.group(1), m.group(2))]
        mu, nu = int(m.group(3)), int(m.group(4))
        a1, b1, c1 = [Fr(str(v)) for v in (e1.coeff_monomial(x), e1.coeff_monomial(y), -e1.coeff_monomial(1))]
        a2, b2, c2 = [Fr(str(v)) for v in (e2.coeff_monomial(x), e2.coeff_monomial(y), -e2.coeff_monomial(1))]
        if mu * b1 != nu * b2:
            return Verdict(False, 'y does not cancel under the stated multipliers')
        A, C = mu * a1 - nu * a2, mu * c1 - nu * c2
        want = f'{_coef_text(A)} = {fs(C)}'.replace('-', '−')
        return pick(q, 'almeth', lambda o: o == want)
    if 'cross-multiplication' in p:
        m = re.search(r'Solve (.+?) = 0 and (.+?) = 0 by cross|Solve (.+?) and (.+?) by cross', p)
        s1, s2 = (m.group(1) or m.group(3)), (m.group(2) or m.group(4))
        e1, e2 = [sp.Poly(sp.expand(eq_sides(s if '=' in s else s + ' = 0')), x, y) for s in (s1, s2)]
        a1, b1, c1 = [Fr(str(v)) for v in (e1.coeff_monomial(x), e1.coeff_monomial(y), e1.coeff_monomial(1))]
        a2, b2, c2 = [Fr(str(v)) for v in (e2.coeff_monomial(x), e2.coeff_monomial(y), e2.coeff_monomial(1))]
        X, Y, Z = b1 * c2 - b2 * c1, c1 * a2 - c2 * a1, a1 * b2 - a2 * b1
        if Z == 0:
            return Verdict(False, 'no unique solution')
        # verify by solving: x = X/Z, y = Y/Z satisfies both equations
        xs_, ys_ = X / Z, Y / Z
        assert a1 * xs_ + b1 * ys_ + c1 == 0 and a2 * xs_ + b2 * ys_ + c2 == 0
        def parse(o):
            mm = re.fullmatch(r'x/\((.+?)\) = y/\((.+?)\) = 1/\((.+?)\)', o)
            return tuple(Fr(g.replace('−', '-')) for g in mm.groups())
        want = (X, Y, Z)
        hits = [i for i, o in enumerate(opts) if parse(o) == want]
        scaled = [i for i, o in enumerate(opts) if parse(o) != want and parse(o)[2] != 0 and (parse(o)[0] / parse(o)[2], parse(o)[1] / parse(o)[2]) == (xs_, ys_)]
        if len(hits) != 1 or scaled:
            return Ambiguous(f'exact {hits}, scaled-equivalent {scaled}')
        return Expect('ABCDEF'[hits[0]])
    return Unsupported('template')


@ref('alpoly', 'each option parsed with SymPy and tested: polynomial in x (SymPy is_polynomial), degree, number of terms', 'exhaustive')
def alpoly(q):
    p = U(q['prompt'])
    opts = options('alpoly', q['id'])
    if p.startswith('Which of these expressions is a polynomial in x'):
        return pick(q, 'alpoly', lambda o: sp.sympify(ex(U(o))).is_polynomial(x))
    if p.startswith('Which of these is a linear polynomial in x'):
        def lin(o):
            e = sp.sympify(ex(U(o)))
            return e.is_polynomial(x) and sp.Poly(e, x).degree() == 1
        return pick(q, 'alpoly', lin)
    m = re.search(r'By its degree, what kind of polynomial is (.+)\?$', p)
    if m:
        d = sp.Poly(sp.expand(ex(m.group(1))), x).degree()
        nm = {0: 'constant', 1: 'linear', 2: 'quadratic', 3: 'cubic'}[d]
        return pick(q, 'alpoly', lambda o: nm in o)
    m = re.search(r'By its number of terms \(after collecting like terms\), what kind of polynomial is (.+)\?$', p)
    if m:
        k_ = len(sp.Poly(sp.expand(ex(m.group(1))), x).terms())
        nm = {1: 'monomial', 2: 'binomial', 3: 'trinomial', 4: 'four terms'}.get(k_)
        if nm is None:
            return Unsupported(f'{k_} terms')
        return pick(q, 'alpoly', lambda o: nm in o)
    return Unsupported('template')


@ref('alqline', 'a option line L is correct when a_d x^2 - L(x) is a nonzero multiple of the target quadratic (same roots, from the same equation); uniqueness checked', 'exhaustive')
def alqline(q):
    p = U(q['prompt'])
    m = re.search(r'graph of y = (.+?) has been drawn\. To solve (.+?) = 0 with it', p)
    drawn = ex(m.group(1))
    E = sp.Poly(sp.expand(ex(m.group(2))), x)
    def t(o):
        rhs = ex(U(o).split('=')[1])
        D = sp.Poly(sp.expand(drawn - rhs), x)
        if D.degree() != 2:
            return False
        ratio = D.coeff_monomial(x ** 2) / E.coeff_monomial(x ** 2)
        return ratio != 0 and sp.expand(D.as_expr() - ratio * E.as_expr()) == 0
    return pick(q, 'alqline', t)
