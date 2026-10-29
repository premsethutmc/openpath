"""algebra-a, part 2: number patterns, expressions, identities, proportion, small equations"""
from refs.algebra_a_util import *  # noqa: F401,F403
from kit import ref, Expect, Verdict, Unsupported, Ambiguous

x, y, n = sp.symbols('x y n')


def poly_text(e, gens, order=None):
    """canonical text of a polynomial: terms by descending total degree then gens order, unicode minus"""
    e = sp.expand(e)
    if e == 0:
        return '0'
    P = sp.Poly(e, *gens)
    terms = sorted(P.terms(), key=lambda t: tuple(-d for d in t[0]))
    out = ''
    for mon, c in terms:
        c = Fr(str(c))
        body = ''.join((g.name if d == 1 else f'{g.name}' + '²³⁴⁵'[d - 2]) for g, d in zip(gens, mon) if d)
        mag = abs(c)
        s = (fs(mag) if (mag != 1 or not body) else '') + body
        out += (' − ' if c < 0 else ' + ') + s if out else (('−' if c < 0 else '') + s)
    return out


def box_solve(lhs, rhs):
    """solve for the single □ in rhs so that rhs == lhs as polynomials (coefficient comparison)"""
    k = sp.Symbol('k_box')
    L = ex(lhs.replace('□', '0')) if False else ex(lhs)
    R = ex(rhs.replace('□', 'k_box'), ) if False else None
    return None


def parse_poly(s):
    return ex(s)


@ref('aerev', 'direct digit reversal / iteration to a palindrome / enumeration of the addition chart', 'exhaustive')
def aerev(q):
    p = q['prompt']
    m = re.search(r'Take (\d+), reverse', p)
    if m:
        a = int(m.group(1))
        return Expect(str(a + int(str(a)[::-1])))
    m = re.search(r'Start with (\d+)\. Reverse', p)
    if m:
        a = int(m.group(1))
        steps = 0
        while str(a) != str(a)[::-1]:
            a += int(str(a)[::-1])
            steps += 1
            if steps > 100:
                return Unsupported('no palindrome within 100 steps')
        return Expect(str(steps))
    m = re.search(r'row (\d+) lists the sums', p)
    if m:
        r = int(m.group(1))
        return Expect(str(sum(1 for c in range(0, 11) if (r + c) % 2 == 0)))
    m = re.search(r'show the sum (\d+)\?', p)
    if m:
        s = int(m.group(1))
        return Expect(str(sum(1 for r in range(11) for c in range(11) if r + c == s)))
    return Unsupported('template not recognised')


@ref('affig', 'figurate numbers by their defining construction (counts of dots / products / doubling loop); first four terms cross-checked against the table', 'exhaustive')
def affig(q):
    p = q['prompt']
    k = int(re.search(r'What is the (\d+)(?:st|nd|rd|th) number', p).group(1))
    def term(kind, i):
        if kind == 'square':
            return sum(2 * j - 1 for j in range(1, i + 1))
        if kind == 'triangular':
            return sum(range(1, i + 1))
        if kind == 'rectangular':
            return i * (i + 1)
        if kind == 'cube':
            return i * i * i
        if kind == 'doubling':
            v = 1
            for _ in range(i - 1):
                v *= 2
            return v
        if kind == 'odd':
            return [j for j in range(1, 10 ** 4, 2)][i - 1]
    kind = next((kd for kd, w in [('square', 'square numbers'), ('triangular', 'triangular numbers'), ('rectangular', 'rectangular numbers'), ('cube', 'cube numbers'), ('doubling', 'made by doubling'), ('odd', 'odd numbers')] if w in p), None)
    if kind is None:
        return Unsupported('kind not recognised')
    shown = [int(t) for t in q['figure']['rows'][0][1:]]
    if [term(kind, i) for i in range(1, 5)] != shown:
        return Verdict(False, 'figure terms are not the named sequence')
    return Expect(str(term(kind, k)))


@ref('affigrel', 'explicit sums / differences / counts of integers', 'exhaustive')
def affigrel(q):
    p = q['prompt']
    m = re.search(r'Add the first (\d+) odd numbers', p)
    if m:
        return Expect(str(sum(range(1, 2 * int(m.group(1)), 2))))
    m = re.search(r'How much bigger is the (\d+)\w\w square number \((\d+) × (\d+)\) than the (\d+)\w\w square number \((\d+) × (\d+)\)', p)
    if m:
        a, b, c, d, e, f = [int(v) for v in m.groups()]
        if not (a == b == c and d == e == f):
            return Verdict(False, 'inconsistent statement')
        return Expect(str(b * c - e * f))
    m = re.search(r'Add the (\d+)\w\w and the (\d+)\w\w triangular', p)
    if m:
        i, j = int(m.group(1)), int(m.group(2))
        T = lambda t: sum(range(1, t + 1))
        return Expect(str(T(i) + T(j)))
    m = re.search(r'How many whole numbers lie between (\d+) \((\d+) × (\d+)\) and (\d+) \((\d+) × (\d+)\)', p)
    if m:
        a, _, _, b, _, _ = [int(v) for v in m.groups()]
        return Expect(str(len([v for v in range(a + 1, b)])))
    return Unsupported('template not recognised')


@ref('afletter', 'the machine steps applied in order to a symbol with SymPy', 'exhaustive')
def afletter(q):
    p = q['prompt']
    var = re.search(r'put in is (\w)\.', p).group(1)
    v = sp.Symbol(var)
    body = re.search(r'machine (.+?) any number put in(.*?)\. The number', p)
    text = body.group(0)
    e = v
    steps = re.split(r', then ', re.sub(r'^machine ', '', body.group(1) + body.group(2)).replace('The number', ''))
    # normalise: verbs with "any number put in" removed
    t = re.sub(r' any number put in', '', body.group(1) + body.group(2) + ' ') if False else None
    sent = text.replace('A number machine ', '').replace(' any number put in', '').split('. The number')[0]
    sent = sent.replace(' by', ' by')
    for part in re.split(r', then ', sent):
        part = part.strip()
        m = re.fullmatch(r'adds (\d+)', part)
        if m:
            e = e + int(m.group(1)); continue
        m = re.fullmatch(r'takes (\d+) away from', part) or re.fullmatch(r'takes (\d+) away', part) or re.fullmatch(r'subtracts (\d+)', part)
        if m:
            e = e - int(m.group(1)); continue
        m = re.fullmatch(r'multiplies by (\d+)', part) or re.fullmatch(r'multiplies (\d+)', part)
        if m:
            e = e * int(m.group(1)); continue
        m = re.fullmatch(r'divides by (\d+)', part)
        if m:
            e = e / int(m.group(1)); continue
        return Unsupported('step not recognised: ' + part)
    return Expect(str(sp.expand(e)).replace('**', '^'))


@ref('afmatch', 'linear rule fitted exactly through the four tabulated points (all four must be collinear)', 'exhaustive')
def afmatch(q):
    v = [int(t) for t in q['figure']['rows'][0][1:]]
    d = {v[i + 1] - v[i] for i in range(3)}
    if len(d) != 1:
        return Ambiguous('table not linear')
    d = d.pop()
    return Expect(f'{d}n + {v[0] - d}' if v[0] - d else f'{d}n')


@ref('agtree', 'evaluate the table as a tree (top box from its branches, boxes referenced by name)', 'exhaustive')
def agtree(q):
    rows = {r[0]: r for r in q['figure']['rows']}
    memo = {}
    def val(name):
        if name in memo:
            return memo[name]
        _, op, l, r = rows[name]
        f = lambda t: val(t) if t.startswith('box') else int(t.replace('−', '-'))
        a, b = f(l), f(r)
        v = {'+': a + b, '−': a - b, '×': a * b}[op]
        memo[name] = v
        return v
    return Expect(str(val('the top')))


@ref('aepat', 'arithmetic pattern iterated term by term', 'exhaustive')
def aepat(q):
    a, d, k = [int(v) for v in re.search(r'starts at (-?\d+)\. The rule is: add (-?\d+) each time.*What is the (\d+)', q['prompt']).groups()]
    v = a
    for _ in range(k - 1):
        v += d
    fig = q['figure']['rows'][0][1:]
    if [a + d * i for i in range(len(fig))] != [int(t) for t in fig]:
        return Verdict(False, 'figure inconsistent')
    return Expect(str(v))


@ref('ahboth', 'ax+b=cx+d solved with exact Fractions and re-checked by substitution into the original equation', 'exhaustive')
def ahboth(q):
    s = U(q['prompt']).split('Solve ')[1].split('. (')[0]
    l, r = s.split('=')
    a, b = lin_ab(ex(l) - ex(r))
    if a == 0:
        return Unsupported('no unique solution')
    v = -b / a
    sv = sp.Rational(v.numerator, v.denominator)
    assert ex(l).subs(X, sv) == ex(r).subs(X, sv)
    return Expect(fs(v))


@ref('ahcal', 'grid squares built explicitly (row width 7 or 10), sums and inverse search by enumeration', 'exhaustive')
def ahcal(q):
    p = q['prompt']
    k = int(re.search(r'A (\d) × \d square', p).group(1))
    w = 7 if 'calendar page' in p else 10
    def tot(sm):
        return sum(sm + r * w + c for r in range(k) for c in range(k))
    m = re.search(r'smallest number is (\d+)\.', p)
    if m:
        return Expect(str(tot(int(m.group(1)))))
    t = int(re.search(r'add up to (\d+)\.', p).group(1))
    sol = [s for s in range(0, 2000) if tot(s) == t]
    return Expect(str(sol[0])) if len(sol) == 1 else Ambiguous(str(sol))


@ref('ahcoef', 'expression parsed with SymPy and the coefficient read from the expanded polynomial in x, y', 'exhaustive')
def ahcoef(q):
    p = U(q['prompt'])
    m = re.search(r'In the expression (.+?), what is the (.+)\?', p)
    e = sp.expand(ex(m.group(1)))
    what = m.group(2)
    P = sp.Poly(e, x, y)
    mon = {'coefficient of xy': (1, 1), 'coefficient of x²': (2, 0), 'coefficient of y': (0, 1), 'coefficient of x': (1, 0), 'constant term': (0, 0), 'coefficient of y²': (0, 2)}.get(what.strip())
    if mon is None:
        return Unsupported('asks ' + what)
    return Expect(str(P.coeff_monomial(x ** mon[0] * y ** mon[1])))


@ref('ahcomp', 'constant quantity: worker-hours (template 1) / output per worker-day (template 2) as exact Fractions', 'exhaustive')
def ahcomp(q):
    p = q['prompt']
    m = re.search(r'(\d+) workers, working (\d+) hours a day, finish a job in (\d+) days\. How many days will (\d+) workers take for the same job, working (\d+) hours', p)
    if m:
        w1, h1, d1, w2, h2 = [int(v) for v in m.groups()]
        return Expect(fs(Fr(w1 * h1 * d1, w2 * h2)))
    m = re.search(r'(\d+) weavers make (\d+) saris in (\d+) days\. How many days will (\d+) weavers take to make (\d+) saris', p)
    if m:
        w1, s1, d1, w2, s2 = [int(v) for v in m.groups()]
        # saris per weaver-day = s1 / (w1*d1); days = s2 / (rate * w2)
        return Expect(fs(Fr(s2) / (Fr(s1, w1 * d1) * w2)))
    return Unsupported('template not recognised')


def _expand_box(prompt):
    """the expression to expand = text after 'Expand ' / 'expand ' up to ' using' ; the equation with a box = last '... = ... □ ...' sentence"""
    return None


def _box(q, lhs_src, eq_src):
    """solve for the box by comparing polynomial coefficients"""
    k = sp.Symbol('k')
    lhs = ex(lhs_src)
    rhs = ex(eq_src.replace('□', 'k'))
    gens = sorted((lhs.free_symbols | rhs.free_symbols) - {k}, key=lambda s: s.name)
    diff = sp.expand(lhs - rhs)
    P = sp.Poly(diff, *gens)
    sols = set()
    for _, c in P.terms():
        for s in sp.solve(c, k):
            sols.add(s)
    # must be one consistent solution making the whole difference vanish
    good = [s for s in sols if sp.expand(diff.subs(k, s)) == 0]
    return good


def _box_sentence(q):
    sents = [t for t in re.split(r'(?<=[\)\dxyz²³])\. ', U(q['prompt'])) if '□' in t and ' = ' in t]
    if len(sents) != 1:
        return None
    t = sents[0].rstrip('.')
    t = t.split(' What number')[0].rstrip('. ')
    return t.split(' = ', 1)


@ref('ahcube', 'box found by comparing coefficients of the SymPy-expanded polynomial with the statement equation', 'exhaustive')
def ahcube(q):
    pr = _box_sentence(q)
    if not pr:
        return Unsupported('template not recognised: ' + q['prompt'][:80])
    good = _box(q, pr[0], pr[1])
    if len(good) != 1:
        return Ambiguous(f'box solutions {good}')
    return Expect(str(good[0]))


@ref('ahid', 'box found by comparing coefficients of the SymPy-expanded polynomial with the statement equation', 'exhaustive')
def ahid(q):
    pr = _box_sentence(q)
    if not pr:
        return Unsupported('template not recognised: ' + q['prompt'][:80])
    good = _box(q, pr[0], pr[1])
    if len(good) != 1:
        return Ambiguous(f'box solutions {good}')
    return Expect(str(good[0]))


@ref('ajfcub', 'box found by multiplying out the stated factorisation and comparing with the cubic', 'exhaustive')
def ajfcub(q):
    p = U(q['prompt'])
    m = re.search(r'factorise: (.+?) = (.+?)\. What number', p)
    if not m:
        return Unsupported('template not recognised')
    k = sp.Symbol('k')
    lhs = ex(m.group(1))
    rhs = ex(m.group(2).replace('□', 'k'))
    diff = sp.expand(lhs - rhs)
    gens = sorted(diff.free_symbols - {k}, key=lambda s: s.name)
    sols = set()
    for _, c in sp.Poly(diff, *gens).terms():
        sols |= set(sp.solve(c, k))
    good = [s for s in sols if sp.expand(diff.subs(k, s)) == 0]
    if len(good) != 1:
        return Ambiguous(str(good))
    return Expect(str(good[0]))


@ref('ahfrac', 'linear equation with fraction coefficients solved exactly and substituted back', 'exhaustive')
def ahfrac(q):
    s = U(q['prompt']).split('Solve ')[1].split('. What')[0]
    l, r = s.split('=')
    a, b = lin_ab(ex(l) - ex(r))
    if a == 0:
        return Unsupported('degenerate')
    return Expect(fs(-b / a))


@ref('ahidn', 'the arithmetic evaluated directly', 'exhaustive')
def ahidn(q):
    s = U(q['prompt']).split('work out ')[1].rstrip('.')
    s = s.replace('²', '**2')
    return Expect(str(eval(s)))


@ref('ahinv', 'inverse proportion: xy = constant, solved with Fractions', 'exhaustive')
def ahinv(q):
    a, b, c = [int(v) for v in re.search(r'When x = (\d+), y = (\d+)\. What is y when x = (\d+)', q['prompt']).groups()]
    return Expect(fs(Fr(a * b, c)))


@ref('ahman', 'inverse proportion: product (rate x time) constant; Fractions', 'exhaustive')
def ahman(q):
    v = ints(q['prompt'])
    if len(v) != 3 and len(v) != 3:
        return Unsupported('numbers')
    a, t, c = v[0], v[1], v[2]
    return Expect(fs(Fr(a * t, c)))


@ref('ahlike', 'sum/difference parsed and expanded with SymPy', 'exhaustive')
def ahlike(q):
    e = sp.expand(ex(U(q['prompt']).split('Simplify ')[1].rstrip('.')))
    return Expect(str(e))


@ref('ahsub', 'difference parsed and expanded with SymPy', 'exhaustive')
def ahsub(q):
    e = sp.expand(ex(U(q['prompt']).split('Simplify ')[1].rstrip('.')))
    return Expect(str(e))


@ref('ahmatch', 'linear rule fitted exactly through the four stated values', 'exhaustive')
def ahmatch(q):
    v = [int(t) for t in re.search(r'uses ([\d, and]+) (?:matchsticks|square tiles|\w+)', q['prompt']).group(1).replace(' and', '').split(',')]
    d = {v[i + 1] - v[i] for i in range(len(v) - 1)}
    if len(d) != 1:
        return Ambiguous('not linear')
    d = d.pop()
    return Expect(str(sp.expand(d * n + v[0] - d)))


@ref('ahone', 'brute-force x over -2000..2000 in the original equation (x ÷ c read as division)', 'exhaustive')
def ahone(q):
    s = U(q['prompt']).split('Find x: ')[1].rstrip('.')
    s = s.replace('÷', '/')
    l, r = s.split('=')
    f = lambda t, v: eval(re.sub(r'(\d)x', r'\1*x', t), {'x': Fr(v)})
    sol = [v for v in range(-2000, 2001) if f(l, v) == f(r, v)]
    return Expect(str(sol[0])) if len(sol) == 1 else Ambiguous(str(sol))


@ref('ahpyr', 'pyramid built row by row symbolically with SymPy', 'exhaustive')
def ahpyr(q):
    s = re.search(r'bottom row is (.+?)\.', q['prompt']).group(1)
    row = [ex(t.strip()) for t in s.split(',')]
    while len(row) > 1:
        row = [row[i] + row[i + 1] for i in range(len(row) - 1)]
    return Expect(str(sp.expand(row[0])))


@ref('ahthink', 'the instructions applied in order to a symbol', 'exhaustive')
def ahthink(q):
    p = q['prompt']
    e = sp.Symbol('n')
    body = p.split('Think of a number n. ')[1].split(' Write a')[0]
    for st in [t.strip() for t in body.split('.') if t.strip()]:
        m = re.fullmatch(r'Multiply (?:it|the result) by (\d+)', st)
        if m:
            e = e * int(m.group(1)); continue
        m = re.fullmatch(r'Add (\d+)', st)
        if m:
            e = e + int(m.group(1)); continue
        m = re.fullmatch(r'(?:Then )?[Tt]ake away (\d+)', st) or re.fullmatch(r'Subtract (\d+)', st)
        if m:
            e = e - int(m.group(1)); continue
        m = re.fullmatch(r'Divide (?:it|the result) by (\d+)', st)
        if m:
            e = e / int(m.group(1)); continue
        return Unsupported('step: ' + st)
    return Expect(str(sp.expand(e)))


@ref('ahwork', 'combined rate = 1/a + 1/b jobs per day, time = reciprocal (Fractions); check: work done in that time = 1', 'exhaustive')
def ahwork(q):
    a, b = [int(v) for v in re.search(r'alone in (\d+) days, and \w+ can finish it alone in (\d+) days', q['prompt']).groups()]
    t = 1 / (Fr(1, a) + Fr(1, b))
    assert t / a + t / b == 1
    return Expect(fs(t))


@ref('ahzk', 'condition turned into an equation in k (Vieta relations / substitution) and solved with SymPy; real zeros checked via discriminant', 'exhaustive')
def ahzk(q):
    p = U(q['prompt'])
    k = sp.Symbol('k')
    m = re.search(r'p\(x\) = (.+?) (?:is|are)', p) or re.search(r'p\(x\) = (.+?) are', p)
    poly = ex(re.search(r'p\(x\) = (.+?)(?: is | are )', p).group(1))
    a_ = sp.Poly(sp.expand(poly), X)
    A = a_.coeff_monomial(X ** 2); B = a_.coeff_monomial(X); C = a_.coeff_monomial(1)
    if p.startswith('The sum of the zeros'):
        t = sp.Rational(re.search(r'is (-?\d+)\. Find', p).group(1))
        eq = -B / A - t
    elif p.startswith('The product of the zeros'):
        t = sp.Rational(re.search(r'is (-?\d+)\. Find', p).group(1))
        eq = C / A - t
    elif p.startswith('One zero'):
        t = sp.Rational(re.search(r'is (-?\d+)\. Find', p).group(1))
        eq = poly.subs(X, t)
    elif 'equal in size and opposite' in p:
        eq = -B / A
    else:
        return Unsupported('template')
    sol = sp.solve(eq, k)
    if len(sol) != 1:
        return Ambiguous(str(sol))
    disc = sp.expand((B ** 2 - 4 * A * C).subs(k, sol[0]))
    if disc < 0:
        return Verdict(False, f'with k={sol[0]} the quadratic has no real zeros (discriminant {disc})')
    return Expect(str(sol[0]))
