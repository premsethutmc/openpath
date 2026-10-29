import re, math
from kit import ref, Expect, Verdict, Unsupported, Ambiguous, Fraction, sp
from refs.number_b_util import *


def sim_ci(P, rate_pct, months, per_year):
    """balance after `months` months with `per_year` compounding periods per year, period by period"""
    step = F(12, per_year)
    n = F(months) / step
    assert n.denominator == 1, 'partial period'
    bal = F(P)
    for _ in range(int(n)):
        bal += bal * F(rate_pct) / 100 / per_year
    return bal


def months_of(s):
    s = s.replace('½', '.5')
    m = re.match(r'(\d+(?:\.5)?) (year|years|months?)', s)
    v = F(m[1])
    return v * 12 if m[2].startswith('year') else v


@ref('ajcip', 'period-by-period balance simulation with Fractions; SI = P*r*t; decimals exact')
def ajcip(q):
    p = clean(q['prompt'])
    m = re.search(r'compound interest on (\d[\d,]*) for ([\d½.]+ (?:years?|months?)) at (\d+)% per year, compounded (annually|half-yearly|quarterly)', p)
    if m:
        P = F(m[1].replace(',', ''))
        k = {'annually': 1, 'half-yearly': 2, 'quarterly': 4}[m[4]]
        return Expect(dec(sim_ci(P, int(m[3]), months_of(m[2]), k) - P) or txt(sim_ci(P, int(m[3]), months_of(m[2]), k) - P))
    m = re.search(r'difference between the compound interest \(compounded yearly\) and the simple interest on (\d[\d,]*) for (\d+) years at (\d+)% per year', p)
    if m:
        P, n, r = F(m[1].replace(',', '')), int(m[2]), int(m[3])
        ci = sim_ci(P, r, n * 12, 1) - P
        si = P * r * n / 100
        d = ci - si
        return Expect(dec(d) or txt(d))
    return Unsupported('template ' + p[:50])


def icbrt(n):
    s = -1 if n < 0 else 1
    a = abs(n)
    r = round(a ** (1 / 3))
    for c in (r - 1, r, r + 1):
        if c ** 3 == a:
            return s * c
    return None


@ref('ajcmul', 'prime factorisation exponents (sympy factorint) then brute-force check that m*n is a cube and no smaller m works')
def ajcmul(q):
    n = q['params'][0]
    if str(n) not in re.sub(r'[^\d]', ' ', q['prompt']).split():
        return Unsupported('param/prompt mismatch')
    n = int(re.search(r'that (\d+) must', q['prompt'])[1])
    f = sp.factorint(n)
    m = 1
    for pr, e in f.items():
        m *= pr ** ((-e) % 3)
    # brute force upper bound: first m' that works
    for t in range(1, m + 1):
        if icbrt(t * n) is not None:
            return Expect(str(t))
    return Unsupported('no m found')


@ref('ajcrcmp', 'parse Indian-grouped numerals by stripping commas; letters assumed to follow the listed order A..D')
def ajcrcmp(q):
    body = q['prompt'].split('greatest?')[1]
    xs = [int(t.strip().replace(',', '')) for t in body.split(';')]
    assert len(xs) == 4 and len(set(xs)) == 4
    # check the Indian grouping is well-formed (3 then pairs)
    for t in body.split(';'):
        g = t.strip().split(',')
        assert len(g[-1]) == 3 or len(g) == 1
        assert all(len(x) == 2 for x in g[1:-1]) and 1 <= len(g[0]) <= 2, t
    return Expect('ABCD'[xs.index(max(xs))])


UNITS = {'thousand': 10 ** 3, 'lakh': 10 ** 5, 'lakhs': 10 ** 5, 'crore': 10 ** 7, 'crores': 10 ** 7, 'million': 10 ** 6, 'billion': 10 ** 9, 'millions': 10 ** 6, 'billions': 10 ** 9}


@ref('ajcrore', 'place-value arithmetic with explicit unit sizes (crore 10^7, lakh 10^5, thousand 10^3, million 10^6, billion 10^9)')
def ajcrore(q):
    p = q['prompt']
    m = re.match(r'Write the number "([^"]+)" in figures', p)
    if m:
        tot = 0
        for n, u in re.findall(r'(\d+) (crore|lakh|thousand)', m[1]):
            tot += int(n) * UNITS[u]
        return Expect(str(tot))
    m = re.match(r'(\d+) (million|billion) is how many (lakh|crore)\?', p)
    if m:
        return Expect(txt(F(int(m[1]) * UNITS[m[2]], UNITS[m[3]])))
    return Unsupported('template ' + p[:50])


@ref('ajcube', 'integer cube / integer cube root found by search and verified by cubing')
def ajcube(q):
    p = q['prompt'].replace(M, '-')
    m = re.fullmatch(r'(-?\d+)³ = \?', p)
    if m:
        return Expect(str(int(m[1]) ** 3))
    m = re.fullmatch(r'∛\(?(-?\d+)\)? = \?', p)
    r = icbrt(int(m[1]))
    if r is None:
        return Unsupported('not a perfect cube')
    assert r ** 3 == int(m[1])
    return Expect(str(r))


@ref('ajd99', 'exact product of the two numbers in the statement')
def ajd99(q):
    return Expect(txt(ev(re.search(r'Work out (.*?) without', q['prompt'])[1])))


@ref('ajeqr', 'solve the proportion by cross-multiplication with Fractions, then verify by cross products')
def ajeqr(q):
    p = q['prompt'].split(': ')[1].split('.')[0]
    m = re.fullmatch(r'(\d+) : (\d+) = (\d+|□) : (\d+|□)', p)
    a, b, c, d = m.groups()
    if c == '□':
        x = F(int(a) * int(d), int(b))
        assert F(int(a), int(b)) == x / int(d)
    else:
        x = F(int(b) * int(c), int(a))
        assert F(int(a), int(b)) == F(int(c)) / x
    return Expect(txt(x))


@ref('ajfare', 'rate times quantity (the two numbers in the statement)')
def ajfare(q):
    n = [int(x) for x in re.findall(r'\d+', q['prompt'])]
    assert len(n) == 2, n
    return Expect(str(n[0] * n[1]))


@ref('ajgrow', 'day-by-day simulation of both plans')
def ajgrow(q):
    m = re.search(r'Plan A: ₹(\d+) on day 0, then ₹(\d+) more each day\. Plan B: ₹(\d+) on day 0, then doubled each day', q['prompt'])
    a, k, b = map(int, m.groups())
    A, B, d = a, b, 0
    while d < 1000:
        if B > A:
            return Expect(str(d))
        d += 1
        A += k
        B *= 2
    return Unsupported('no crossing')
