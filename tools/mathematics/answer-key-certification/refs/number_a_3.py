"""number-a references, part 3: ae* families (Class 4-6: estimation, rounding, decimals, large numbers, surds)."""
import math
import re
from decimal import Decimal

import mpmath
import sympy as sp

from kit import ref, Expect, Verdict, Unsupported, Ambiguous, Fraction
from refs.number_a_common import *  # noqa: F401,F403
from refs.number_a_common import (opts, ints, pick, calc, first_arith, words_to_int, int_to_words_intl, group_intl, group_indian,
                                  ftext, dtext, mixedtext, round_half_up, is_prime, divisors)

mpmath.mp.dps = 50


# ---------------------------------------------------------------------------------------------------- column arithmetic
for _fam in ('aecol4', 'aemult', 'aep10', 'aediv0'):
    def _mk(fam):
        @ref(fam, method='schoolbook digit algorithm (column add/sub with carry/borrow, partial products, long division); exact division required',
             coverage='exhaustive')
        def f(q):
            a, op, b = first_arith(q['prompt'])
            r = calc(a, op, b)
            if r is None:
                return Ambiguous('division leaves a remainder')
            if r < 0:
                return Verdict(False, 'negative result')
            return Expect(str(r))
        return f
    _mk(_fam)


# ---------------------------------------------------------------------------------------------------- ordering
@ref('aecmp', method='sort the listed numbers (grouping commas removed); answer must be bracketed with no commas inside the numbers',
     coverage='exhaustive')
def aecmp(q):
    p = q['prompt']
    body = p.split(':', 1)[1].split('Write the list')[0]
    nums = ints(body)
    if len(set(nums)) != len(nums):
        return Ambiguous('repeated')
    assert 'ascending' in p
    return Expect('(' + ', '.join(map(str, sorted(nums))) + ')', form=True)


@ref('aedord', method='sort the decimals by exact Fraction value', coverage='exhaustive')
def aedord(q):
    p = q['prompt']
    body = p.split(':', 1)[1].split('Write them')[0]
    txt = re.findall(r'\d+\.\d+|\d+', body)
    v = [Fraction(t) for t in txt]
    if len(set(v)) != len(v):
        return Ambiguous('equal decimals')
    asc = 'ascending' in p
    assert asc or 'descending' in p
    order = sorted(range(len(v)), key=lambda i: v[i], reverse=not asc)
    return Expect('(' + ', '.join(txt[i] for i in order) + ')')


@ref('aedecc', method='compare two decimals by exact Fraction value', coverage='exhaustive')
def aedecc(q):
    m = re.search(r'greater: (\d+\.\d+|\d+) or (\d+\.\d+|\d+)\?', q['prompt'])
    a, b = m.group(1), m.group(2)
    if Fraction(a) == Fraction(b):
        return Ambiguous('equal')
    return Expect(a if Fraction(a) > Fraction(b) else b)


@ref('aedec', method='flats + rods/10 + cubes/100 as exact fractions, printed as a decimal; picture must show the counts in the sentence',
     coverage='exhaustive')
def aedec(q):
    p = q['prompt']
    m = re.search(r'shows (\d+) flats?, (\d+) rods? and (\d+) small cubes?', p)
    h, t, o = (int(x) for x in m.groups())
    fg = q['figure']
    if (fg['hundreds'], fg['tens'], fg['ones']) != (h, t, o):
        return Verdict(False, 'picture differs from sentence')
    v = Fraction(h) + Fraction(t, 10) + Fraction(o, 100)
    return Expect(dtext(v))


# ---------------------------------------------------------------------------------------------------- estimation
UNIT = {'ten': 10, 'hundred': 100, 'thousand': 1000}


@ref('aeest', method='round each number half-up to the stated place, then add / subtract the rounded numbers', coverage='exhaustive')
def aeest(q):
    m = re.search(r'Estimate (\d+) ([+−]) (\d+) by rounding each number to the nearest (ten|hundred|thousand)', q['prompt'])
    a, b, u = int(m.group(1)), int(m.group(3)), UNIT[m.group(4)]
    ra, rb = round_half_up(a, u), round_half_up(b, u)
    return Expect(str(ra + rb if m.group(2) == '+' else ra - rb))


@ref('aeestp', method='round each factor half-up to the stated place, then multiply', coverage='exhaustive')
def aeestp(q):
    p = q['prompt']
    m = re.search(r'Estimate (\d+) × (\d+) by rounding each number to the nearest (ten|hundred|thousand)', p)
    if m:
        a, b, ua, ub = int(m.group(1)), int(m.group(2)), UNIT[m.group(3)], UNIT[m.group(3)]
    else:
        m = re.search(r'Estimate (\d+) × (\d+) by rounding \d+ to the nearest (ten|hundred|thousand) and \d+ to the nearest (ten|hundred|thousand)', p)
        a, b, ua, ub = int(m.group(1)), int(m.group(2)), UNIT[m.group(3)], UNIT[m.group(4)]
    return Expect(str(calc(round_half_up(a, ua), '×', round_half_up(b, ub))))


EXACT_NEEDED = {
    'the amount written on a cheque': True, 'the change a shopkeeper gives back': True, 'the marks written on a report card': True,
    'the number of chairs to put out for 32 invited guests': True, 'the number of tablets a doctor tells you to take': True,
    'the price printed on a train ticket': True, 'the time a train leaves the station': True,
    'the weight of gold bought at a jewellery shop': True,
    "how long it takes to walk to a friend's house": False, 'how many leaves are on a neem tree': False,
    'the distance from Chennai to Madurai, when planning a trip': False, 'the number of ants in an anthill': False,
    'the number of grains in a bag of rice': False, 'the number of mangoes on a big tree': False,
    'the number of people at a temple festival, for a news report': False, 'the number of stars you can see on a clear night': False,
}


def lead1(n):
    """round to one significant figure, half up"""
    d = len(str(n)) - 1
    return round_half_up(n, 10 ** d)


@ref('aechk', method='reasonableness: estimate by rounding to the leading digit and compare with the claimed answer (within 25% of both the exact value and the rounded estimate: reasonable, '
                     '>=1.5x or <=2/3x of both: far off, otherwise ambiguous); product size: option within a factor 2 of the exact product; '
                     '"needs an exact answer": human classification table of the 16 situations (8 exact / 8 estimate), exactly one exact per question',
     coverage='exhaustive', assumptions='classification of two borderline situations (chairs for 32 guests, gold weight) as exact is a judgement')
def aechk(q):
    p = q['prompt']
    if p.startswith('Which of these needs an EXACT'):
        o = opts(q)
        flags = [EXACT_NEEDED[t] for t in o]
        if flags.count(True) != 1:
            return Verdict(False, f'{flags.count(True)} options need an exact answer: {o}')
        return Expect(letter_of(flags.index(True)))
    if p.startswith('Without working it out exactly, about how big'):
        a, b = ints(p)[:2]
        ex = a * b

        def val(t):
            return int(t.replace('about ', '').replace(',', ''))
        good = [t for t in opts(q) if Fraction(1, 2) <= Fraction(val(t), ex) <= 2]
        return pick(q, lambda t: t in good)
    m = re.search(r'worked out (\d+) ([+−×]) (\d+) and got (\d+)\.', p)
    a, op, b, got = int(m.group(1)), m.group(2), int(m.group(3)), int(m.group(4))
    exact = calc(a, op, b)
    est = calc(lead1(a), op, lead1(b))
    if got == exact:
        kind = 'ok'
    else:
        r = Fraction(got, exact) if exact else None
        rs = Fraction(got, est) if est else None
        if r is None or rs is None:
            return Ambiguous('zero estimate')
        if Fraction(4, 5) <= r <= Fraction(5, 4) and Fraction(4, 5) <= rs <= Fraction(5, 4):
            kind = 'ok'
        elif r >= Fraction(3, 2) and rs >= Fraction(3, 2):
            kind = 'big'
        elif r <= Fraction(2, 3) and rs <= Fraction(2, 3):
            kind = 'small'
        else:
            return Ambiguous(f'got {got}, exact {exact}, rounded estimate {est}: neither clearly close nor far')
    want = {'ok': 'Reasonable', 'big': 'Not reasonable: it is far too big', 'small': 'Not reasonable: it is far too small'}[kind]
    return pick(q, lambda t: t.startswith(want))


def letter_of(i):
    return 'ABCDEFGH'[i]


# ---------------------------------------------------------------------------------------------------- Euclid
def euclid_steps(a, b):
    """list of (dividend, divisor, quotient, remainder): divide a by b, then b by the remainder, ... until remainder 0"""
    out = []
    while b:
        qu, r = divmod(a, b)
        out.append((a, b, qu, r))
        a, b = b, r
    return out


def _euclid(fam):
    @ref(fam, method='simulate the repeated division a = bq + r exactly as the prompt describes and count the steps / read the second remainder',
         coverage='exhaustive')
    def f(q):
        p = q['prompt']
        a, b = ints(p)[:2]
        st = euclid_steps(a, b)
        if 'How many divisions' in p:
            return Expect(str(len(st)))
        assert 'remainder in the second division' in p
        if len(st) < 2:
            return Ambiguous('fewer than two divisions')
        return Expect(str(st[1][3]))
    return f


_euclid('aeeuc')
_euclid('agediv')


# ---------------------------------------------------------------------------------------------------- even numbers
@ref('aeeven', method='filter the listed numbers by n mod 2 == 0', coverage='exhaustive')
def aeeven(q):
    p = q['prompt']
    nums = ints(p.split('even?')[1].split('Write')[0])
    ev = [n for n in nums if n % 2 == 0]
    if not ev:
        return Ambiguous('no even number in the list')
    return Expect(', '.join(map(str, sorted(ev))))


# ---------------------------------------------------------------------------------------------------- number words
@ref('aeind', method='parse the English / Indian number words (thousand, lakh) into an integer', coverage='exhaustive')
def aeind(q):
    w = re.search(r'Write in figures: (.*?)\. \(', q['prompt']).group(1)
    v = words_to_int(w)
    return Unsupported('unparsable words') if v is None else Expect(str(v))


@ref('aenumf', method='number names parsed to values; comma placement compared with an independent grouping routine (Indian 3-2-2, international 3-3); expanded form summed',
     coverage='exhaustive')
def aenumf(q):
    p = q['prompt']
    if p.startswith('Which is the number name of'):
        n = int(re.search(r'name of ([\d,]+) in the', p).group(1).replace(',', ''))
        return pick(q, lambda t: words_to_int(t) == n)
    if p.startswith('Which shows'):
        n = int(re.search(r'shows (\d+) with', p).group(1))
        want = group_indian(n) if 'Indian' in p else group_intl(n)
        assert 'Indian' in p or 'International' in p
        return pick(q, lambda t: t == want)
    if p.startswith('Which is the expanded form of'):
        n = int(re.search(r'form of ([\d,]+)\?', p).group(1).replace(',', ''))

        def val(t):
            tot = 0
            for term in t.split(' + '):
                f = [int(x.replace(',', '')) for x in term.split(' × ')]
                tot += math.prod(f)
            return tot
        return pick(q, lambda t: val(t) == n)
    return Unsupported('unknown form')


# ---------------------------------------------------------------------------------------------------- decimals as choices
def _is_lowest(fr_text):
    a, b = (int(x) for x in fr_text.split('/'))
    return math.gcd(a, b) == 1


@ref('aedfr', method='option value compared with the exact Fraction of the given decimal / fraction; "simplest form" additionally needs lowest terms',
     coverage='exhaustive')
def aedfr(q):
    p = q['prompt']
    simplest = 'simplest form' in p
    if p.rstrip('.').endswith('as a decimal'):
        v = Fraction(re.search(r'Write (\d+/\d+) as', p).group(1))
        return pick(q, lambda t: re.fullmatch(r'\d+\.\d+', t) is not None and Fraction(t) == v)
    v = Fraction(re.search(r'Write (\d+\.\d+) as', p).group(1))
    return pick(q, lambda t: '/' in t and Fraction(t) == v and (not simplest or _is_lowest(t)))


@ref('aedpv', method='place value of the digit by its position (digit unique in the numeral required); expanded form by summing the option parts; '
                     'place-value description by building the number from its digits', coverage='exhaustive')
def aedpv(q):
    p = q['prompt']
    if p.startswith('What is the place value'):
        m = re.search(r'digit (\d) in (\d+\.\d+)', p)
        d, s = m.group(1), m.group(2)
        ip, fp = s.split('.')
        pos = [i for i, c in enumerate(ip) if c == d] + [-(j + 1) for j, c in enumerate(fp) if c == d]
        if len(pos) != 1:
            return Ambiguous(f'digit {d} occurs {len(pos)} times in {s}')
        k = pos[0]
        pv = Fraction(int(d)) * (Fraction(10) ** (len(ip) - 1 - k) if k >= 0 else Fraction(1, 10 ** (-k)))
        return pick(q, lambda t: Fraction(t) == pv)
    if p.startswith('Which is the expanded form of'):
        s = re.search(r'form of (\d+\.\d+)\?', p).group(1)
        n = Fraction(s)
        return pick(q, lambda t: sum(Fraction(x) for x in t.split(' + ')) == n)
    m = re.search(r'has (\d+) tens, (\d+) ones, (\d+) tenths, (\d+) hundredths and (\d+) thousandths', p)
    a, b, c, d, e = (int(x) for x in m.groups())
    n = 10 * a + b + Fraction(c, 10) + Fraction(d, 100) + Fraction(e, 1000)
    return pick(q, lambda t: Fraction(t) == n)


# ---------------------------------------------------------------------------------------------------- even/odd
@ref('aepair', method='pair the objects up: remainder of the picture count on division by 2', coverage='exhaustive')
def aepair(q):
    fg = q['figure']
    n = fg['count'] if 'count' in fg else fg['filled']
    want = 'even' if n % 2 == 0 else 'odd'
    return pick(q, lambda t: t == want)


# ---------------------------------------------------------------------------------------------------- rounding
@ref('aerdec', method='exact Fraction rounded half-up to 0, 1 or 2 decimals', coverage='exhaustive')
def aerdec(q):
    m = re.search(r'Round (\d+\.\d+) to the nearest (whole number|tenth|hundredth)', q['prompt'])
    x = Fraction(m.group(1))
    u = {'whole number': Fraction(1), 'tenth': Fraction(1, 10), 'hundredth': Fraction(1, 100)}[m.group(2)]
    r = round_half_up(x, u)
    return Expect(dtext(r))


RU = {'ten': 10, 'hundred': 100, 'thousand': 1000, 'ten thousand': 10 ** 4, 'lakh': 10 ** 5, 'ten lakh': 10 ** 6, 'crore': 10 ** 7}


@ref('aernd', method='round half-up to the stated place (ten ... crore) on the integer value (Indian or international grouping)', coverage='exhaustive')
def aernd(q):
    p = q['prompt']
    m = re.search(r'nearest (ten lakh|ten thousand|thousand|hundred|ten|lakh|crore)\.', p)
    n = int(re.search(r'(\d+(?:,\d+)+|\d+)', p).group(1).replace(',', ''))
    return Expect(str(round_half_up(n, RU[m.group(1)])))


@ref('aeround', method='round half-up to the nearest ten / hundred / thousand using exact arithmetic', coverage='exhaustive')
def aeround(q):
    m = re.search(r'Round ([\d,]+) to the nearest (ten|hundred|thousand)', q['prompt'])
    return Expect(str(round_half_up(int(m.group(1).replace(',', '')), UNIT[m.group(2)])))


# ---------------------------------------------------------------------------------------------------- surds
def sv(text):
    """numeric value (mpmath, 50 digits) of a surd expression written with √ and ∛"""
    s = text.replace('−', '-').replace(' ', '')
    s = re.sub(r'∛(\d+)', r'cbrt(\1)', s)
    s = re.sub(r'√\(([^()]*)\)', r'sqrt(\1)', s)
    s = re.sub(r'√(\d+)', r'sqrt(\1)', s)
    s = re.sub(r'(\d)(sqrt|cbrt)', r'\1*\2', s)
    s = re.sub(r'\)(sqrt|cbrt)', r')*\1', s)
    e = sp.sympify(s)
    return mpmath.mpf(sp.N(e, 50))


def same(x, y):
    return abs(x - y) < mpmath.mpf(10) ** -35


@ref('aerat', method='numeric value (50 digits) of the original quotient compared with each option; exactly one option must equal it',
     coverage='exhaustive')
def aerat(q):
    m = re.search(r'denominator of (.*?) and simplify', q['prompt'])
    target = sv(m.group(1))
    return pick(q, lambda t: same(sv(t), target))


def _irr_root(t):
    m = re.fullmatch(r'√(\d+)', t)
    if m:
        n = int(m.group(1))
        return math.isqrt(n) ** 2 != n
    m = re.fullmatch(r'√\((\d+)/(\d+)\)', t)
    if m:
        fr = Fraction(int(m.group(1)), int(m.group(2)))
        return not (math.isqrt(fr.numerator) ** 2 == fr.numerator and math.isqrt(fr.denominator) ** 2 == fr.denominator)
    m = re.fullmatch(r'∛(\d+)', t)
    if m:
        n = int(m.group(1))
        c = round(n ** (1 / 3))
        return not any(k ** 3 == n for k in (c - 1, c, c + 1))
    raise ValueError(t)


@ref('aesurc', method='surd test by exact integer square / cube checks (fractions: numerator and denominator both squares); comparison by squaring (k√m)^2 = k^2 m',
     coverage='exhaustive')
def aesurc(q):
    p = q['prompt']
    if p.startswith('Which of these is a surd'):
        return pick(q, _irr_root)
    o = opts(q)
    vals = {}
    for t in o:
        if t == 'They are equal':
            continue
        m = re.fullmatch(r'(\d+)√(\d+)', t)
        vals[t] = int(m.group(1)) ** 2 * int(m.group(2))  # square of the value
    a, b = vals.values()
    if a == b:
        want = 'They are equal'
    else:
        want = max(vals, key=vals.get)
    return pick(q, lambda t: t == want)


def _simplest(t):
    m = re.fullmatch(r'(?:(\d+))?√(\d+)', t)
    if not m:
        return re.fullmatch(r'\d+', t) is not None
    n = int(m.group(2))
    return all(n % (k * k) for k in range(2, math.isqrt(n) + 1)) and (m.group(1) != '1')


@ref('aesurop', method='numeric value (50 digits) of the stated operation on the surds compared with each option; the matching option must be fully simplified',
     coverage='exhaustive')
def aesurop(q):
    m = re.search(r'Simplify (√\d+) ([+−×÷]) (√\d+)', q['prompt'])
    x, y = sv(m.group(1)), sv(m.group(3))
    t = {'+': x + y, '−': x - y, '×': x * y, '÷': x / y}[m.group(2)]
    r = pick(q, lambda s: same(sv(s), t))
    if isinstance(r, Expect):
        o = opts(q)
        k = 'ABCDEFGH'.index(r.text)
        if not _simplest(o[k]):
            return Verdict(False, f'the equal option {o[k]!r} is not in simplest surd form')
    return r
