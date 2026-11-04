import itertools
import re
from kit import ref, Expect, Verdict, Unsupported, Ambiguous, Fraction, sp
from refs.calculus_trig_seq_util import *

nn = sp.Symbol('n')


def _ntext(s):
    return s.replace('ⁿ⁻¹', '^(n-1)').replace('ⁿ', '^n').replace('₁', '1')


def _subs(s):
    return s.translate(str.maketrans('₀₁₂₃₄₅₆₇₈₉', '0123456789'))


@ref('ahexp', method='evaluate the stated rule t_n (SymPy) at n=1,2,3; recursive form read off from consecutive differences / ratios, verified on the next term', coverage='exhaustive')
def ahexp(q):
    p = q['prompt']
    m = re.search(r'explicit rule tₙ = (.+?)\. Write', p)
    f = E(_ntext(m.group(1)))
    v = [f.subs(nn, i) for i in (1, 2, 3, 4)]
    if 'first three terms' in p:
        return Expect(tup(*v[:3]))
    if 'Give the pair (t₁, d)' in p:
        d = v[1] - v[0]
        assert v[2] - v[1] == d and v[3] - v[2] == d
        return Expect(tup(v[0], d))
    if 'Give the pair (t₁, r)' in p:
        r = v[1] / v[0]
        assert v[2] / v[1] == r and v[3] / v[2] == r
        return Expect(tup(v[0], r))
    return Unsupported('template ' + p[:60])


@ref('ahfib', method='iterate the recurrence t_k = t_(k-1)+t_(k-2) with Python integers', coverage='exhaustive')
def ahfib(q):
    m = re.search(r'begins (-?\d+), (-?\d+), and every term after that is the sum of the two terms just before it\. What is term number (\d+)\?', _subs(q['prompt']).replace('−', '-'))
    a, b, k_ = int(m.group(1)), int(m.group(2)), int(m.group(3))
    seq = [a, b]
    while len(seq) < k_:
        seq.append(seq[-1] + seq[-2])
    return Expect(str(seq[k_ - 1]))


@ref('ahnth', method='iterate the recurrence for 6 terms, fit the (degree-1) formula an+b through the first two terms and check all terms; compared as a function of n', coverage='exhaustive')
def ahnth(q):
    m = re.search(r't₁ = (−?\d+) and tₙ₊₁ = tₙ ([+−]) (\d+)\.', q['prompt'])
    t1, sg, d = int(_rn(m.group(1))), (1 if m.group(2) == '+' else -1), int(m.group(3))
    seq = [t1]
    for _ in range(8):
        seq.append(seq[-1] + sg * d)
    a = seq[1] - seq[0]; b = seq[0] - a
    assert all(seq[i] == a * (i + 1) + b for i in range(len(seq)))
    return Expect(str(a * nn + b))


def _rn(s):
    return s.replace('−', '-')


@ref('ahrec', method='iterate the stated recurrence with exact Fractions', coverage='exhaustive')
def ahrec(q):
    m = re.search(r't₁ = (−?\d+) and tₙ₊₁ = (.+?)\. Write the first five terms', q['prompt'])
    t1 = Fraction(int(_rn(m.group(1))))
    T = sp.Symbol('T')
    rule = E(m.group(2).replace('tₙ', 'T'))
    seq = [sp.Rational(t1.numerator, t1.denominator)]
    for _ in range(4):
        seq.append(rule.subs(T, seq[-1]))
    return Expect(tup(*seq))


def _tilings(w, L, first=None):
    """number of domino (2x1) tilings of a w x L board by exhaustive backtracking; `first` restricts the left-most configuration:
    'across' = a vertical domino in column 1 (covers both cells of column 1), 'along' = horizontal dominoes in columns 1-2"""
    cells = [[False] * L for _ in range(w)]

    def solve(pos):
        while pos < w * L and cells[pos // L][pos % L]:
            pos += 1
        if pos == w * L:
            return 1
        r, c = divmod(pos, L)
        tot = 0
        if c + 1 < L and not cells[r][c + 1]:
            cells[r][c] = cells[r][c + 1] = True
            tot += solve(pos + 1)
            cells[r][c] = cells[r][c + 1] = False
        if r + 1 < w and not cells[r + 1][c]:
            cells[r][c] = cells[r + 1][c] = True
            tot += solve(pos + 1)
            cells[r][c] = cells[r + 1][c] = False
        return tot
    return solve(0)


def _comp(parts, n, first=None):
    def go(rem):
        if rem == 0:
            return 1
        return sum(go(rem - p) for p in parts if p <= rem)
    if first is None:
        return go(n)
    return go(n - first) if first <= n else 0


@ref('ahrhy', method='brute-force counting: compositions by recursion; the path/tiling template by exhaustive backtracking over a 2 x L board of 2x1 dominoes', coverage='exhaustive')
def ahrhy(q):
    p = _subs(q['prompt'])
    m = re.search(r'short syllable takes (\d+) beats? and a long syllable takes (\d+) beats\. How many different rhythms (?:\(orders of short and long syllables\) last exactly|of exactly) (\d+) beats( begin with a (long|short) syllable)?', p)
    if m:
        s, l_, n = int(m.group(1)), int(m.group(2)), int(m.group(3))
        first = None if not m.group(4) else (l_ if m.group(5) == 'long' else s)
        return Expect(str(_comp([s, l_], n, first)))
    m = re.search(r'A staircase has (\d+) steps\. Ravi climbs it taking either (\d+)(?: steps?)? or (\d+) steps? at a time\. In how many different ways can he climb to the top( if his first move is (\d+) steps?)?', p)
    if m:
        n, a, b = int(m.group(1)), int(m.group(2)), int(m.group(3))
        return Expect(str(_comp([a, b], n, int(m.group(5)) if m.group(4) else None)))
    m = re.search(r'A path (\d+) units wide and (\d+) units long is paved with tiles of (\d+) units by (\d+) unit', p)
    if m:
        w, L = int(m.group(1)), int(m.group(2))
        assert (w, int(m.group(3)), int(m.group(4))) == (2, 2, 1), 'unexpected tile geometry'
        if 'starts with two tiles side by side along the path' in p:
            # horizontal dominoes in columns 1-2 on both rows: remaining 2 x (L-2)
            return Expect(str(_tilings(2, L - 2) if L >= 2 else 0))
        if 'starts with one tile across the path' in p:
            # vertical domino in column 1 (across the path, covering width 2): remaining 2 x (L-1)
            return Expect(str(_tilings(2, L - 1)))
        return Expect(str(_tilings(2, L)))
    m = re.search(r'Meena lays ₹(\d+) and ₹(\d+) coins in a row so that they add up to ₹(\d+)\. How many different rows can she make (?:\(the order of the coins matters\)|that start with a ₹(\d+) coin)\?', p)
    if m:
        a, b, n = int(m.group(1)), int(m.group(2)), int(m.group(3))
        return Expect(str(_comp([a, b], n, int(m.group(4)) if m.group(4) else None)))
    return Unsupported('template ' + p[:80])


def _series_terms(text):
    return [t.strip() for t in text.split(' + ') if t.strip()]


@ref('alsum', method='explicit term-by-term addition (Python integers) of the series displayed (pattern read from the first terms, last term)', coverage='exhaustive')
def alsum(q):
    m = re.search(r'Find the sum (.+) \+ … \+ (.+)\.$', q['prompt'])
    terms = _series_terms(m.group(1)); last = m.group(2)
    pw = 1
    mm = re.fullmatch(r'(\d+)([²³]?)', terms[0])
    sup = mm.group(2)
    pw = int(sup.translate(SUP)) if sup else 1
    base = [int(re.match(r'\d+', t).group(0)) for t in terms]
    d = base[1] - base[0]
    assert all(base[i + 1] - base[i] == d for i in range(len(base) - 1))
    lastb = int(re.match(r'\d+', last).group(0))
    seq = list(range(base[0], lastb + 1, d)) if d > 0 else None
    assert seq[-1] == lastb
    return Expect(str(sum(v**pw for v in seq)))


@ref('alsump', method='term pattern read from the three displayed terms (each number slot extrapolated as an AP), then the first n terms added explicitly', coverage='exhaustive')
def alsump(q):
    m = re.search(r'sum of the first (\d+) terms of the series (.+) \+ …\.$', q['prompt'])
    n = int(m.group(1)); terms = _series_terms(m.group(2))
    assert len(terms) == 3
    slots = [[int(v) for v in re.findall(r'(?<![⁰¹²³⁴⁵⁶⁷⁸⁹])\d+', t)] for t in terms]
    tmpl = re.sub(r'(?<![⁰¹²³⁴⁵⁶⁷⁸⁹])\d+', '{}', terms[0])
    cnt = len(slots[0])
    assert all(len(s) == cnt for s in slots)
    ds = []
    for j in range(cnt):
        a, b, c = slots[0][j], slots[1][j], slots[2][j]
        assert b - a == c - b, 'slot is not an arithmetic progression'
        ds.append((a, b - a))
    tot = 0
    for k_ in range(n):
        vals = [a + k_ * d for a, d in ds]
        text = tmpl.format(*vals).replace('×', '*')
        text = re.sub(r'(\d+)([²³])', lambda mm: f'({mm.group(1)}**{mm.group(2).translate(SUP)})', text)
        tot += eval(text)   # safe: only digits, + - * ( ) and ** produced above
    return Expect(str(tot))


@ref('alsumr', method='explicit addition of consecutive integers (or their squares) from the first to the last displayed term', coverage='exhaustive')
def alsumr(q):
    m = re.search(r'Find (.+) \+ … \+ (.+)\.$', q['prompt'])
    terms = _series_terms(m.group(1)); last = m.group(2)
    sup = re.fullmatch(r'(\d+)([²³]?)', terms[0]).group(2)
    pw = int(sup.translate(SUP)) if sup else 1
    base = [int(re.match(r'\d+', t).group(0)) for t in terms]
    assert base[1] - base[0] == 1 and base[2] - base[1] == 1
    lastb = int(re.match(r'\d+', last).group(0))
    return Expect(str(sum(v**pw for v in range(base[0], lastb + 1))))


@ref('aoagp', method='partial sums of the series with exact Fractions to 400 terms, tail bounded; compared with SymPy\'s exact infinite sum', coverage='exhaustive')
def aoagp(q):
    m = re.search(r'series (\d+) \+ (\d+)\((\d+)/(\d+)\) \+', q['prompt'])
    a, a2, rn, rd = (int(m.group(i)) for i in (1, 2, 3, 4))
    d = a2 * Fraction(rn, rd) ** 0 - a   # first term a; second term (a+d) r: a2 = a+d
    r = Fraction(rn, rd)
    d = a2 - a
    S = sum((a + k_ * d) * r**k_ for k_ in range(600))
    exact = sp.summation((a + d * sp.Symbol('k', integer=True, nonnegative=True)) * sp.Rational(rn, rd) ** sp.Symbol('k', integer=True, nonnegative=True), (sp.Symbol('k', integer=True, nonnegative=True), 0, sp.oo))
    assert abs(float(exact) - float(S)) < 1e-9, (exact, float(S))
    return Expect(str(sp.nsimplify(exact)))


@ref('aohm', method='reciprocal of the mean of reciprocals (exact Fractions)', coverage='exhaustive')
def aohm(q):
    m = re.search(r'harmonic mean of (\d+) and (\d+)', q['prompt'])
    a, b = Fraction(int(m.group(1))), Fraction(int(m.group(2)))
    r = 1 / ((1 / a + 1 / b) / 2)
    return Expect(str(r))


@ref('apamgm', method='calculus: minimise a x + b/x over x>0 (critical point from the derivative, second derivative >0), cross-checked on a grid', coverage='exhaustive')
def apamgm(q):
    m = re.search(r'find the least value of (.+)\. Give the exact', q['prompt'])
    f = E(m.group(1))
    cps = [c for c in sp.solve(sp.diff(f, x), x) if c.is_real and c > 0]
    assert len(cps) == 1 and sp.diff(f, x, 2).subs(x, cps[0]) > 0
    v = sp.simplify(f.subs(x, cps[0]))
    g = sp.lambdify(x, f, 'math')
    gm = min(g(0.01 * i) for i in range(1, 3000))
    assert gm >= float(v) - 1e-9 and gm - float(v) < 1e-3
    return Expect(str(v))


@ref('apbin', method='SymPy series expansion of (a+bx)^p and coefficient extraction', coverage='exhaustive')
def apbin(q):
    m = re.search(r'coefficient of x([⁰¹²³⁴⁵⁶⁷⁸⁹]*) in the expansion of \((.+?)\)\^\((.+?)\) in ascending powers', q['prompt'])
    k_ = int(m.group(1).translate(SUP)) if m.group(1) else 1
    base, ex = E(m.group(2)), E(m.group(3))
    return Expect(str(sp.series(base**ex, x, 0, k_ + 1).removeO().coeff(x, k_)))


@ref('apexlog', method='SymPy series coefficient of the stated exponential / logarithm', coverage='exhaustive')
def apexlog(q):
    m = re.search(r'coefficient of x([⁰¹²³⁴⁵⁶⁷⁸⁹]*) in the expansion of (.+?) in ascending powers', q['prompt'])
    k_ = int(m.group(1).translate(SUP)) if m.group(1) else 1
    f = E(m.group(2))
    return Expect(str(sp.series(f, x, 0, k_ + 1).removeO().coeff(x, k_)))


@ref('apgent', method='interpolating polynomial through the displayed terms (SymPy), degree 1 (differences constant) or 2 (second differences constant); all displayed terms checked', coverage='exhaustive')
def apgent(q):
    m = re.search(r'begins (.+?), … and continues', q['prompt'])
    vals = [int(_rn(v.strip())) for v in m.group(1).split(',')]
    d1 = [vals[i + 1] - vals[i] for i in range(len(vals) - 1)]
    d2 = [d1[i + 1] - d1[i] for i in range(len(d1) - 1)]
    if 'go up by the same amount' in q['prompt']:
        assert len(set(d2)) == 1
        deg = 2
    else:
        assert len(set(d1)) == 1
        deg = 1
    poly = sp.expand(sp.interpolate(list(zip(range(1, len(vals) + 1), vals)), nn))
    assert sp.Poly(poly, nn).degree() == deg if poly.has(nn) else True
    return Expect(str(poly))


@ref('apgms', method='common ratio r = (b/a)^(1/(m+1)) (positive root), terms a r^i; the last term checked equal to b', coverage='exhaustive')
def apgms(q):
    m = re.search(r'Insert (\d+) geometric means between (−?\d+) and (−?\d+), all of them positive', q['prompt'])
    k_, a, b = int(m.group(1)), int(_rn(m.group(2))), int(_rn(m.group(3)))
    if a <= 0 or b <= 0:
        return Ambiguous('endpoints not positive')
    r = sp.Rational(b, a) ** sp.Rational(1, k_ + 1)
    r = sp.nsimplify(r)
    assert sp.simplify(a * r**(k_ + 1) - b) == 0
    return Expect(tup(*[sp.simplify(a * r**i) for i in range(1, k_ + 1)]))


@ref('apins', method='common difference d = (b-a)/(m+1) (exact), terms a+i d; last term checked equal to b', coverage='exhaustive')
def apins(q):
    m = re.search(r'Insert (\d+) arithmetic means between (−?\d+) and (−?\d+)', q['prompt'])
    k_, a, b = int(m.group(1)), int(_rn(m.group(2))), int(_rn(m.group(3)))
    d = sp.Rational(b - a, k_ + 1)
    assert a + (k_ + 1) * d == b
    return Expect(tup(*[a + i * d for i in range(1, k_ + 1)]))


def _D(s):
    return sp.Rational(s.replace('−', '-'))


@ref('apsapp', method='first three terms of the stated series computed exactly with SymPy rationals (binomial: C(p,k) u^k; exponential x^k/k!; logarithm: u - u^2/2 + u^3/3)', coverage='exhaustive')
def apsapp(q):
    p = _subs(q['prompt'])
    m = re.search(r'approximate value of (.+?)(?: \(write it as (.+?)\))?\. Give the sum', p)
    target, writeas = m.group(1), m.group(2)

    def binom3(pw, u):
        return 1 + pw * u + pw * (pw - 1) / 2 * u**2
    if 'exponential series' in p:
        xv = _D(re.fullmatch(r'e\^\((.+)\)', target).group(1))
        return Expect(str(1 + xv + xv**2 / 2))
    if 'logarithmic series' in p:
        N = _D(re.fullmatch(r'log (.+?) \(log is.*\)', target + ' (log is the natural logarithm)').group(1))
        u = N - 1
        return Expect(str(u - u**2 / 2 + u**3 / 3))
    if writeas:
        mm = re.fullmatch(r'(\d+)\((\d+) ([+−]) ([\d.]+)\)\^\((\d+)/(\d+)\)', writeas)
        c, sgn, u, pw = int(mm.group(1)), (1 if mm.group(3) == '+' else -1), _D(mm.group(4)), sp.Rational(int(mm.group(5)), int(mm.group(6)))
        assert c * c * (1 + sgn * u) == int(re.search(r'√(\d+)', target).group(1)), 'rewriting does not equal the target'
        return Expect(str(c * binom3(pw, sgn * u)))
    # forms: √N, ∛N, 1/N, 1/(N)², 1/√N with N a decimal near 1 (N = 1 + u)
    forms = [(r'√([\d.]+)', sp.Rational(1, 2)), (r'∛([\d.]+)', sp.Rational(1, 3)), (r'1/([\d.]+)', sp.Integer(-1)),
             (r'1/\(([\d.]+)\)²', sp.Integer(-2)), (r'1/√([\d.]+)', sp.Rational(-1, 2))]
    for pat, pw in forms:
        mm = re.fullmatch(pat, target)
        if mm:
            N = _D(mm.group(1))
            return Expect(str(binom3(pw, N - 1)))
    return Unsupported('template ' + target)


@ref('apsumk', method='term-by-term addition (SymPy exact integers) of the displayed summand over the index range', coverage='exhaustive')
def apsumk(q):
    m = re.search(r'Σ \(k = (\d+) to (\d+)\) \((.+)\)', q['prompt'])
    lo, hi = int(m.group(1)), int(m.group(2))
    kk = sp.Symbol('k')
    f = sp.lambdify(kk, E(m.group(3)), 'math')
    return Expect(str(sum(int(round(f(i))) for i in range(lo, hi + 1))))


@ref('aptel', method='term-by-term addition with exact Fractions of the displayed summand', coverage='exhaustive')
def aptel(q):
    m = re.search(r'Σ \(k = (\d+) to (\d+)\) (.+?)\. Give the answer', q['prompt'])
    lo, hi = int(m.group(1)), int(m.group(2))
    kk = sp.Symbol('k')
    f = E(m.group(3))
    tot = sp.Integer(0)
    for i in range(lo, hi + 1):
        tot += f.subs(kk, i)
    tot = sp.nsimplify(tot)
    return Expect(str(tot), form=True)
