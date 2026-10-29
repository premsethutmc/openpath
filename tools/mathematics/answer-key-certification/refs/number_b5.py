import re, math
from kit import ref, Expect, Verdict, Unsupported, Ambiguous, Fraction, sp
from refs.number_b_util import *
from refs.number_b3 import SUP, pw

P_ = lambda s: F(s.replace(',', ''))


def supint(s):
    return int(''.join(SUP[c] for c in s))


SUPRE = '[' + ''.join(SUP) + ']+'
SCI = r'(\d+(?:\.\d+)?) × 10(' + SUPRE + r')'


def sci_val(a, e):
    return F(a) * F(10) ** supint(e)


def sci_norm(v):
    """(a, n) with 1<=a<10 for positive Fraction v, via integer scaling only"""
    n = 0
    a = F(v)
    while a >= 10:
        a /= 10
        n += 1
    while a < 1:
        a *= 10
        n -= 1
    return a, n


def tup(a, n):
    d = dec(a)
    return None if d is None else f'({d}, {n})'


@ref('akscalc', 'exact Fraction arithmetic on the mantissa x 10^e values, then renormalised by repeated scaling')
def akscalc(q):
    m = re.match(r'Work out \(' + SCI + r'\) ([×÷]) \(' + SCI + r'\)\.', q['prompt'])
    x, y = sci_val(m[1], m[2]), sci_val(m[4], m[5])
    v = x * y if m[3] == '×' else x / y
    a, n = sci_norm(v)
    t = tup(a, n)
    if t is None:
        return Ambiguous('non-terminating mantissa')
    return Expect(t)


@ref('aksci', 'exact decimal as Fraction, renormalised by repeated scaling by 10')
def aksci(q):
    m = re.match(r'Write ([\d,.]+) in scientific notation', q['prompt'])
    a, n = sci_norm(P_(m[1]))
    return Expect(tup(a, n))


@ref('akscid', 'exact value of mantissa x 10^e as a decimal')
def akscid(q):
    m = re.match(r'Write ' + SCI + ' as an ordinary number', q['prompt'])
    return Expect(dec(sci_val(m[1], m[2])))


@ref('akscmp', 'exact value of each listed number; letters follow the listed order (A..D)')
def akscmp(q):
    body = q['prompt'].split('largest?')[1]
    vals = [sci_val(*re.fullmatch(r'\s*' + SCI + r'\s*', t).groups()) for t in body.split(';')]
    assert len(vals) == 4
    mx = max(vals)
    if vals.count(mx) > 1:
        return Ambiguous('tie for largest')
    return Expect('ABCD'[vals.index(mx)])


def mag(v):
    v = int(v)
    assert v > 0
    return len(str(v)) - 1


@ref('aksmag', 'exact integer product from the story data; order of magnitude from the digit count (not logarithms)')
def aksmag(q):
    p = q['prompt'].replace('−', '-')
    num = lambda pat: P_(re.search(pat, p)[1])
    if 'seconds are there in' in p:
        v = num(r'in (\d+) years') * 365 * 24 * 3600
    elif 'heart beats' in p:
        v = num(r'beats about (\d+) times') * num(r'beat in (\d+) years') * 365 * 24 * 60
    elif 'grains' in p:
        v = num(r'has about (\d+) grains') * num(r'in a (\d+) kg bag') * 1000
    elif 'steps' in p:
        v = num(r'walks about (\d+) steps a day') * num(r'walk in (\d+) years') * 365
    elif 'town of' in p:
        v = num(r'town of (\d+) thousand') * 1000 * num(r'uses about (\d+) litres') * 365
    elif 'hairs' in p:
        v = num(r'about ([\d,]+) hairs') * num(r'heads of (\d+) lakh') * 100000
    else:
        return Unsupported('story ' + p[:40])
    n = mag(v)
    if 'What is n' in p:
        return Expect(str(n))
    m = re.search(r'about 10(' + SUPRE + r')\. By how many powers', p)
    return Expect(str(supint(m[1]) - n))


@ref('aksqb', 'enumerate the whole numbers strictly between the two squares and count them')
def aksqb(q):
    m = re.match(r'How many whole numbers lie between (\d+)²(?: = \d+)? and (\d+)²(?: = \d+)?, not counting', q['prompt'])
    a, b = int(m[1]), int(m[2])
    return Expect(str(len(range(a * a + 1, b * b))))


@ref('aksqe', 'integer square root and neighbours; verify k^2 < n < (k+1)^2')
def aksqe(q):
    n = int(re.match(r'√(\d+) lies', q['prompt'])[1])
    k = math.isqrt(n)
    if k * k == n:
        return Ambiguous('perfect square')
    assert k * k < n < (k + 1) ** 2
    return Expect(f'({k}, {k + 1})')


@ref('aksqf', 'exact rational square root via integer roots of numerator and denominator, verified by squaring')
def aksqf(q):
    m = re.match(r'Find √([\d.]+)\.', q['prompt'])
    v = P_(m[1])
    a, b = math.isqrt(v.numerator), math.isqrt(v.denominator)
    if a * a != v.numerator or b * b != v.denominator:
        return Unsupported('not a perfect square')
    r = F(a, b)
    assert r * r == v
    return Expect(dec(r) or txt(r))


def parse_num(s):
    """items of amclass; returns sympy number"""
    s = s.strip().replace(M, '-')
    s = re.sub(r'√\(([^)]*)\)', r'sqrt(\1)', s)
    s = re.sub(r'√(\d+)', r'sqrt(\1)', s)
    s = re.sub(r'(\d)sqrt', r'\1*sqrt', s)
    s = re.sub(r'(?<![\d.])(\d+)/(\d+)', r'Rational(\1,\2)', s)
    return sp.sympify(s, locals={'Rational': sp.Rational})


def cls(x):
    isint = x.is_integer
    israt = x.is_rational
    return {'natural': bool(isint and x > 0), 'whole': bool(isint and x >= 0), 'integer': bool(isint), 'rational': bool(israt), 'irrational': x.is_irrational is True}


@ref('amclass', 'evaluate each listed number with SymPy exact arithmetic and test the category; exactly one must qualify')
def amclass(q):
    m = re.match(r'Which of these numbers is (?:a|an) (natural number|whole number that is not a natural number|integer that is not a whole number|rational number that is not an integer|irrational number)\? (.*)$', q['prompt'])
    kind, items = m[1], [t for t in m[2].split(';')]
    assert len(items) == 4
    cs = [cls(parse_num(t)) for t in items]
    test = {'natural number': lambda c: c['natural'],
            'whole number that is not a natural number': lambda c: c['whole'] and not c['natural'],
            'integer that is not a whole number': lambda c: c['integer'] and not c['whole'],
            'rational number that is not an integer': lambda c: c['rational'] and not c['integer'],
            'irrational number': lambda c: c['irrational']}[kind]
    hits = [i for i, c in enumerate(cs) if test(c)]
    if len(hits) != 1:
        return Ambiguous(f'{len(hits)} options qualify: {hits}')
    return Expect('ABCD'[hits[0]])


@ref('amcyc', 'exact long-division digit: floor(k*10^N/d) mod 10 in integers')
def amcyc(q):
    m = re.search(r'what is the (\d+)(?:st|nd|rd|th) digit after the decimal point of (\d+)/(\d+)\?', q['prompt'])
    N, k, d = int(m[1]), int(m[2]), int(m[3])
    return Expect(str(k * 10 ** N // d % 10))


@ref('amplaces', 'smallest m with fraction*10^m an integer (exact search)')
def amplaces(q):
    m = re.match(r'(\d+)/(\d+) has a terminating', q['prompt'])
    f = F(int(m[1]), int(m[2]))
    for k in range(0, 40):
        if (f * 10 ** k).denominator == 1:
            return Expect(str(k))
    return Unsupported('does not terminate')


@ref('amnline', 'exact Fractions: absolute difference / distance / division marks')
def amnline(q):
    p = q['prompt']
    m = re.match(r'Find \|(.*)\|\. \(A fraction', p)
    if m:
        return Expect(txt(abs(ev(m[1]))))
    m = re.match(r'How far apart are (.*?) and (.*?) on the number line', p)
    if m:
        return Expect(txt(abs(ev(m[1]) - ev(m[2]))))
    m = re.match(r'On the number line, each unit is divided into (\d+) equal parts\. The point P is (\d+) parts? to the (left|right) of (-?[\d−]+)\.', p)
    n, k, side, a = int(m[1]), int(m[2]), m[3], ev(m[4])
    return Expect(txt(a + (F(k, n) if side == 'right' else -F(k, n))))


def strip_dec(s):
    return s


@ref('amrec', 'geometric-series sum of the repeating block, verified by long-division expansion matching the displayed decimal')
def amrec(q):
    p = q['prompt']
    m = re.match(r'Write 0\.(\d+)… \((.*)\) as a fraction p/q', p)
    digs = m[1]
    desc = m[2]
    if desc.startswith('the digit') or desc.startswith('the block'):
        rep = re.search(r'(?:digit|block) (\d+) repeats', desc)[1]
        pre = ''
        assert digs.startswith(rep)
    else:
        rep = re.search(r'only the (\d+) repeats', desc)[1]
        pre = digs[:len(digs) - len(rep)] if digs.endswith(rep) else None
        pre = digs[:digs.index(rep)] if False else digs[:len(digs) - len(rep)]
    k, L = len(pre), len(rep)
    v = (F(int(pre)) / 10 ** k if pre else F(0)) + F(int(rep), 10 ** k * (10 ** L - 1))
    # verify: expansion of v matches the shown digits
    s, r = '', v
    for _ in range(len(digs)):
        r *= 10
        s += str(int(r))
        r -= int(r)
    assert s == digs[:len(s)], (s, digs)
    return Expect(txt(v), form=True)


def surd_expr(s):
    s = s.replace(M, '-').replace('²', '**2')
    s = re.sub(r'√(\d+)', r'sqrt(\1)', s)
    s = re.sub(r'(\d)sqrt', r'\1*sqrt', s)
    s = s.replace(')(', ')*(')
    return sp.sympify(s)


@ref('amrop', 'SymPy exact expansion of the surd expression; coefficient by division')
def amrop(q):
    p = q['prompt']
    m = re.match(r'Simplify (.*?) to a single surd c√(\d+)\. What is c\?', p)
    if m:
        e = surd_expr(m[1])
        c = sp.nsimplify(sp.simplify(e / sp.sqrt(int(m[2]))))
        assert c.is_integer
        return Expect(str(c))
    m = re.match(r'Simplify: (.*)\. \(Write the answer without brackets', p)
    e = sp.expand(surd_expr(m[1]))
    return Expect(str(e))


UNS = {
    'amdec': 'type choice: options A-D (decimal expansions) are not in the prompt or export; the key letter cannot be mapped to an expansion',
    'amirr': 'type choice: the four candidate numbers are not in the prompt or export; the key letter cannot be mapped to a number',
    'amterm': 'type choice: the option texts A-D (kinds of decimal expansion) are not in the prompt or export; the key letter cannot be mapped to an option',
}
