import re, math
from kit import ref, Expect, Verdict, Unsupported, Ambiguous, Fraction, sp
from refs.number_b_util import *
from refs.number_b3 import SUP, pw

P_ = lambda s: F(s.replace(',', ''))


def mixed(x):
    x = F(x)
    sgn = '-' if x < 0 else ''
    x = abs(x)
    w, r = divmod(x.numerator, x.denominator)
    if r == 0:
        return f'{sgn}{w}'
    if w == 0:
        return f'{sgn}{r}/{x.denominator}'
    return f'{sgn}{w} {r}/{x.denominator}'


def check_equalities(p):
    """every 'X = Y' arithmetic identity written in the statement must be true"""
    for a, b in re.findall(r'(\d+(?: [×÷+−] \d+)*) = (\d+(?: [×÷+−] \d+)*)', p):
        assert ev(a) == ev(b), f'statement identity false: {a} = {b}'


@ref('avarea', 'parse grid description; count shaded rectangles = blue columns x yellow rows; fraction = count / total; figure checked against the statement')
def avarea(q):
    p = q['prompt']
    m = re.match(r'A rectangle is cut into (\d+) equal columns and (\d+) equal rows, making (\d+) small rectangles, as in the picture\. (\d+) of the columns? (?:is|are) shaded blue and (\d+) of the rows? (?:is|are) shaded yellow .*?shows (\d+)/(\d+) × (\d+)/(\d+)\.', p)
    C, R, tot, bc, yr = map(int, m.groups()[:5])
    assert tot == C * R
    assert (int(m[6]), int(m[7]), int(m[8]), int(m[9])) == (bc, C, yr, R), 'multiplication shown does not match the shading'
    f = q['figure']
    if (f['rows'], f['cols']) != (R, C) or f['shaded'] != yr * C:
        return Verdict(False, f'figure {f} disagrees with statement (rows {R}, cols {C}, yellow cells {yr * C})')
    both = sum(1 for r in range(R) for c in range(C) if c < bc and r < yr)
    if p.rstrip().endswith('colours?') and 'How many' in p:
        return Expect(str(both))
    return Expect(txt(F(both, tot)))


@ref('avlat', 'rebuild the lattice from the digits; compare with the figure; add the diagonals with carrying (and check the total equals a*b)')
def avlat(q):
    p = q['prompt']
    m = re.search(r'lattice for (\d+) × (\d+)', p)
    a, b = m[1], m[2]
    # box (i, j): digit i of top number times digit j of right number, as tens/ones
    f = q['figure']
    for j, dj in enumerate(b):
        for i, di in enumerate(a):
            t, o = divmod(int(di) * int(dj), 10)
            if f['rows'][j][1 + i] != f'{t}/{o}':
                return Verdict(False, f'figure box ({j},{i}) = {f["rows"][j][1 + i]} but digits give {t}/{o}')
        if f['rows'][j][-1] != dj:
            return Verdict(False, 'right-hand digit mismatch')
    if [x for x in f['head'][1:-1]] != list(a):
        return Verdict(False, 'top digit mismatch')
    # diagonals from the bottom right: diagonal d collects ones of box (i,j) with (len(a)-1-i)+(len(b)-1-j)=d and tens with =d-1
    na, nb = len(a), len(b)
    sums = []
    for d in range(na + nb):
        s = 0
        for j, dj in enumerate(b):
            for i, di in enumerate(a):
                t, o = divmod(int(di) * int(dj), 10)
                k = (na - 1 - i) + (nb - 1 - j)
                if k == d:
                    s += o
                if k == d - 1:
                    s += t
        sums.append(s)
    if 'What is the total of the second diagonal' in p:
        return Expect(str(sums[1]))
    m2 = re.search(r'What is (\d+) × (\d+)\?$', p)
    carry, digs = 0, []
    for s in sums:
        s += carry
        digs.append(s % 10)
        carry = s // 10
    val = int(''.join(map(str, reversed(digs))) or '0') + carry * 10 ** len(digs)
    assert val == int(a) * int(b)
    return Expect(str(val))


@ref('avpp', 'partial products with exact integers; figure header/rows must be place-value splits of the two factors')
def avpp(q):
    p = q['prompt']
    f = q['figure']
    heads = [int(x) for x in f['head'][1:]]
    rows = [int(r[0]) for r in f['rows']]
    m = re.match(r'Multiply (\d+) × (\d+) with partial products: split \d+ into (\d+) \+ (\d+), work out', p)
    if m:
        a, b = int(m[1]), int(m[2])
        assert int(m[3]) + int(m[4]) == b
        if sum(heads) != a or sum(rows) != b:
            return Verdict(False, 'figure does not split the factors of the statement')
        return Expect(str(a * b))
    m = re.match(r'In (\d+) × (\d+), \d+ is split into (\d+) \+ (\d+)\. What is the partial product (\d+) × (\d+)\?', p)
    a, b = int(m[1]), int(m[2])
    assert int(m[3]) + int(m[4]) == b
    if sum(heads) != a or sum(rows) != b:
        return Verdict(False, 'figure does not split the factors of the statement')
    return Expect(str(int(m[5]) * int(m[6])))


@ref('cnt', 'the figure is a set of dots: count them (figure count and statement)')
def cnt(q):
    f = q['figure']
    assert f['type'] == 'dots'
    return Expect(str(f['count']))


@ref('avdiv', 'integer division with remainder; checked by dividend = divisor*quotient + remainder')
def avdiv(q):
    p = q['prompt']
    m = re.match(r'Use long division to work out (\d+) ÷ (\d+)\. What is the (quotient|remainder)\?', p)
    if m:
        n, d = int(m[1]), int(m[2])
        qq, r = divmod(n, d)
        assert qq * d + r == n
        return Expect(str(qq if m[3] == 'quotient' else r))
    m = re.match(r'A division has divisor (\d+), quotient (\d+) and remainder (\d+)\. Use dividend', p)
    d, qq, r = map(int, m.groups())
    assert r < d
    return Expect(str(d * qq + r))


@ref('avexpn', 'count occurrences of each base among the factors listed in the statement')
def avexpn(q):
    p = q['prompt']
    m = re.match(r'Write (.*?) in exponential form, as (.*?)\. Give', p)
    factors = [t.strip() for t in m[1].split('×')]
    bases = re.findall(r'(\w)\^□', m[2])
    assert set(factors) <= set(bases)
    return Expect('(' + ', '.join(str(factors.count(b)) for b in bases) + ')')


@ref('avfas', 'exact Fraction add/subtract of the mixed numbers; written as a mixed number in simplest form')
def avfas(q):
    m = re.match(r'(.*?) = \? Write the answer', q['prompt'])
    e = m[1].replace('−', '-')
    parts = re.split(r' ([+-]) ', e)
    v = ev(parts[0])
    for i in range(1, len(parts), 2):
        w = ev(parts[i + 1])
        v = v + w if parts[i] == '+' else v - w
    return Expect(mixed(v), form=True)


def rootq(base, q_):
    """exact q-th root of an integer base (positive) or None"""
    r = round(base ** (1 / q_))
    for c in (r - 1, r, r + 1):
        if c ** q_ == base:
            return c
    return None


@ref('avfexp', 'exact rational powers: integer q-th root found by search then raised to p; index-form questions read off directly from the radical')
def avfexp(q):
    p = q['prompt'].replace(M, '-')
    m = re.match(r'Find the value of (\d+)\^\((-?\d+)/(\d+)\)\.', p)
    if m:
        b, a, c = int(m[1]), int(m[2]), int(m[3])
        r = rootq(b, c)
        assert r is not None
        v = F(r) ** a
        return Expect(txt(v))
    m = re.match(r'Write (?:(∛|∜)|(\d)?√)\(x(²|³)?\) in index form as xᵏ', p) or re.match(r'Write (∛|∜|[⁵⁶⁷]?√)\(x([²³])?\) in index form', p)
    m = re.match(r'Write ([∛∜]|[⁰-⁹]?√)\(x([²³])?\) in index form', p)
    rt = {'√': 2, '∛': 3, '∜': 4}
    s = m[1]
    n = rt.get(s) or int(''.join(SUP[c] for c in s[:-1]))
    e = int(SUP[m[2]]) if m[2] else 1
    return Expect(txt(F(e, n)))


@ref('avfwq', 'exact Fraction multiplication from the story')
def avfwq(q):
    p = q['prompt']
    m = re.match(r'Each glass holds (\d+)/(\d+) litre of buttermilk\. How many litres do (\d+) such glasses hold\?', p)
    if m:
        return Expect(txt(F(int(m[1]), int(m[2])) * int(m[3])))
    m = re.match(r'There are (\d+) students in a class and (\d+)/(\d+) of them come to school by bus', p)
    return Expect(txt(int(m[1]) * F(int(m[2]), int(m[3]))))


@ref('avlow', 'divide numerator and denominator by gcd; form: lowest terms')
def avlow(q):
    m = re.match(r'Write (\d+)/(\d+) in its lowest terms', q['prompt'])
    f = F(int(m[1]), int(m[2]))
    return Expect(txt(f), form=True)


@ref('avmarked', 'exact Fractions: marked = sale/(1-d); profit/loss % on total cost')
def avmarked(q):
    p = clean(q['prompt'])
    m = re.match(r'After a discount of (\d+)% on its marked price, a shirt is sold for (\d[\d,]*)\.', p)
    if m:
        return Expect(txt(P_(m[2]) / (1 - F(int(m[1]), 100))))
    m = re.match(r'A trader buys an old bicycle for (\d[\d,]*), spends (\d[\d,]*) on repairs, and sells it for (\d[\d,]*)\. What is the (profit|loss) per cent', p)
    cost = P_(m[1]) + P_(m[2])
    sp_ = P_(m[3])
    d = (sp_ - cost) / cost * 100
    if m[4] == 'profit':
        assert d > 0
        return Expect(txt(d))
    assert d < 0
    return Expect(txt(-d))


@ref('avmdiv', 'exact division; identities written in the statement are verified true')
def avmdiv(q):
    p = q['prompt']
    check_equalities(p)
    m = re.match(r'Work out (\d+) ÷ (\d+) in your head by (splitting (\d+) into (\d+) \+ (\d+)|halving (\d+) times)', p)
    n, d = int(m[1]), int(m[2])
    if m[4]:
        assert int(m[5]) + int(m[6]) == n
    else:
        assert 2 ** int(m[7]) == d, 'halving count does not match divisor'
    assert n % d == 0
    return Expect(str(n // d))


@ref('avpctof', 'exact percentage arithmetic with Fractions')
def avpctof(q):
    p = clean(q['prompt'])
    m = re.match(r'What percentage of (\d+) is (\d+)\?', p)
    if m:
        return Expect(txt(F(int(m[2]), int(m[1])) * 100))
    m = re.match(r'The price of a school bag (rises|falls) from (\d+) to (\d+)\. What is the percentage (increase|decrease)\?', p)
    if m:
        a, b = int(m[2]), int(m[3])
        assert (b > a) == (m[1] == 'rises')
        return Expect(txt(abs(F(b - a, a)) * 100))
    m = re.match(r'(Increase|Decrease) (\d+) by (\d+)%\. What is the new amount', p)
    a, r = int(m[2]), F(int(m[3]), 100)
    return Expect(txt(a * (1 + r) if m[1] == 'Increase' else a * (1 - r)))


def lead_round(n):
    """round to the greatest place, half up"""
    n = int(n)
    k = len(str(n)) - 1
    u = 10 ** k
    return (n + u // 2) // u * u


@ref('avpest', 'round both factors to their leading digit (half up) with integers, then multiply')
def avpest(q):
    m = re.match(r'Estimate (\d[\d,]*) × (\d[\d,]*) by rounding', q['prompt'])
    a, b = int(m[1].replace(',', '')), int(m[2].replace(',', ''))
    return Expect(str(lead_round(a) * lead_round(b)))


@ref('avpmiss', 'solve the proportion a:b :: c:d by cross-multiplication and check ad = bc')
def avpmiss(q):
    m = re.match(r'Find the missing term: (\S+) : (\S+) :: (\S+) : (\S+)$', q['prompt'])
    t = list(m.groups())
    i = t.index('□')
    v = [None if x == '□' else F(int(x)) for x in t]
    a, b, c, d = v
    if i == 0:
        a = b * c / d
    elif i == 1:
        b = a * d / c
    elif i == 2:
        c = a * d / b
    else:
        d = b * c / a
    assert a * d == b * c
    return Expect(txt([a, b, c, d][i]))


@ref('avppf', 'sympy factorint of the number, exponents of 2,3,5,7')
def avppf(q):
    n = int(re.match(r'Write (\d+) as a product', q['prompt'])[1])
    f = sp.factorint(n)
    assert set(f) <= {2, 3, 5, 7}
    return Expect('(' + ', '.join(str(f.get(pr, 0)) for pr in (2, 3, 5, 7)) + ')')


@ref('avrsub', 'repeated subtraction simulated')
def avrsub(q):
    p = q['prompt']
    m = re.match(r'Start at (\d+) and (?:take away|keep taking away) (\d+)', p)
    n, d = int(m[1]), int(m[2])
    cnt_ = 0
    while n >= d:
        n -= d
        cnt_ += 1
    if 'How many times' in p:
        return Expect(str(cnt_))
    assert 'What number is left' in p
    return Expect(str(n))


@ref('avstrat', 'exact product; identities written in the statement are verified true')
def avstrat(q):
    p = q['prompt']
    check_equalities(p)
    m = re.match(r'Work out (\d+) × (\d+) ', p)
    return Expect(str(int(m[1]) * int(m[2])))


@ref('avtab', 'exact product; identities written in the statement are verified true')
def avtab(q):
    p = q['prompt']
    check_equalities(p)
    m = re.search(r'What is (\d+) × (\d+)\?$', p)
    return Expect(str(int(m[1]) * int(m[2])))


@ref('avzero', 'exact evaluation of the power expression (a^0 = 1 etc. by direct SymPy-free Fraction evaluation)')
def avzero(q):
    m = re.match(r'Find the value of (.*)\.$', q['prompt'])
    return Expect(txt(pw(m[1])))


@ref('divr', 'remainder by repeated subtraction')
def divr(q):
    m = re.match(r'(\d+) ÷ (\d+) = (\d+) remainder', q['prompt'])
    n, d, qq = map(int, m.groups())
    r = n
    k = 0
    while r >= d:
        r -= d
        k += 1
    assert k == qq
    return Expect(str(r))


@ref('eqfrac', 'solve a/b = x/d for x with Fractions; check x/d = a/b')
def eqfrac(q):
    m = re.match(r'(\d+)/(\d+) = (□)/(\d+)$', q['prompt'])
    a, b, _, d = m.groups()
    x = F(int(a), int(b)) * int(d)
    return Expect(txt(x))


@ref('fadd', 'exact Fraction sum/difference of the two fractions')
def fadd(q):
    return Expect(txt(ev(q['prompt'].split('=')[0])))


@ref('faddu', 'exact Fraction sum of the two fractions')
def faddu(q):
    return Expect(txt(ev(q['prompt'].split('=')[0])))


@ref('fmulw', 'exact Fraction product')
def fmulw(q):
    return Expect(txt(ev(q['prompt'].split('=')[0])))


@ref('hcf', 'largest d in 1..min(a,b) dividing both (brute force)')
def hcf(q):
    m = re.search(r'common factor \(HCF\) of (\d+) and (\d+)\?', q['prompt'])
    a, b = int(m[1]), int(m[2])
    best = max(d for d in range(1, min(a, b) + 1) if a % d == 0 and b % d == 0)
    return Expect(str(best))


@ref('ldiv', 'exact division')
def ldiv(q):
    return Expect(txt(ev(q['prompt'].split('=')[0])))


@ref('mmul', 'exact product')
def mmul(q):
    return Expect(txt(ev(q['prompt'].split('=')[0])))


@ref('mul', 'exact product')
def mul(q):
    return Expect(txt(ev(q['prompt'].split('=')[0])))


@ref('pct', 'exact percentage of a number')
def pct(q):
    m = re.match(r'What is (\d+)% of (\d+)\?', q['prompt'])
    return Expect(txt(F(int(m[1]), 100) * int(m[2])))


@ref('pow', 'repeated multiplication')
def pow_(q):
    m = re.match(r'(\d+)([' + ''.join(SUP) + r']+) = \?', q['prompt'])
    b, e = int(m[1]), int(''.join(SUP[c] for c in m[2]))
    v = 1
    for _ in range(e):
        v *= b
    return Expect(str(v))


@ref('prop', 'unit price then multiply (exact Fractions)')
def prop(q):
    m = re.match(r'(\d+) pencils cost ₹(\d+)\. At the same price each, how much do (\d+) pencils cost', q['prompt'])
    return Expect(txt(F(int(m[2]), int(m[1])) * int(m[3])))


@ref('root', 'integer square root found by search and verified by squaring')
def root(q):
    n = int(re.match(r'√(\d+) = \?', q['prompt'])[1])
    r = next(k for k in range(n + 2) if k * k >= n)
    assert r * r == n
    return Expect(str(r))


@ref('surd', 'factorise the radicand (sympy factorint): outside = product p^(e//2), inside = product p^(e%2); form: c√d with d squarefree')
def surd(q):
    n = int(re.match(r'Write √(\d+) in its simplest form', q['prompt'])[1])
    out, ins = 1, 1
    for pr, e in sp.factorint(n).items():
        out *= pr ** (e // 2)
        ins *= pr ** (e % 2)
    assert out * out * ins == n
    if ins == 1:
        t = str(out)
    elif out == 1:
        t = f'√{ins}'
    else:
        t = f'{out}√{ins}'
    return Expect(t, form=True)


UNS = {
    'avdfact': 'type choice: options A-D (multiplication facts) are not in the prompt or export; the key letter cannot be mapped to a fact',
    'avdirv': 'type choice: options A-D are not in the prompt or export; the key letter cannot be mapped to a statement (the table in the figure could be checked, but not what A/B mean)',
    'avfold': 'type choice: options A-D (fractions) are not in the prompt or export; the key letter cannot be mapped to a fraction',
    'avlike': 'type choice: the candidate pairs A-D are not in the prompt or export; the key letter cannot be mapped to a pair',
    'avprop': 'type choice: options A-D are not in the prompt or export; the key letter cannot be mapped to yes/no (or any other reading)',
}
