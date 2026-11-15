"""Independent references for the CISCE families added in 2026-11 (b28: aefword, aedfrl, aedlike, agtwin, agpgrid, aapat2;
b29: aqgst, aqrd, aqshare, aqogive).

Each reference reads the printed question (with its picture or options, as the learner sees them) and derives the answer from
first principles with exact fractions; none reads the generator. A prompt the reference does not recognise is reported
unsupported.
"""
import re
from fractions import Fraction
from decimal import Decimal

from kit import Expect, Unsupported, Verdict, ref

LET = 'ABCD'
NUM = r'(\d+(?: \d+/\d+)?|\d+/\d+)'


def _num(s):
    """'5', '3/4' or '2 1/2' as an exact fraction"""
    s = s.strip()
    if ' ' in s:
        w, f = s.split(' ')
        return int(w) + Fraction(f)
    return Fraction(s)


def _dec(x):
    """an exact fraction whose denominator divides a power of ten, written as a decimal"""
    d = x.denominator
    while d % 2 == 0:
        d //= 2
    while d % 5 == 0:
        d //= 5
    if d != 1:
        return None
    s = format(Decimal(x.numerator) / Decimal(x.denominator), 'f')
    return s.rstrip('0').rstrip('.') if '.' in s else s


def _one(choices, ok):
    hits = [i for i, c in enumerate(choices) if ok(c)]
    if len(hits) != 1 or len(set(choices)) != len(choices):
        return Verdict(False, f'{len(hits)} options satisfy the condition')
    return Expect(LET[hits[0]])


def _prime(n):
    return n > 1 and all(n % k for k in range(2, n))


# ------------------------------------------------------------------ b28
@ref('aefword', 'read the two fractions; a story that ends with in all, altogether, now or in the day adds them, one that asks what is left or still to go subtracts')
def aefword(q):
    p = q['prompt']
    fr = re.findall(r'(\d+/\d+) (?:km|kg|m|litre)', p)
    if len(fr) != 2:
        return Unsupported('two fractions not found')
    a, b = Fraction(fr[0]), Fraction(fr[1])
    if re.search(r'in all\?|altogether\?|have now\?|in the day\?', p):
        return Expect(str(a + b))
    if re.search(r'are left|left in the jug|still to go', p):
        return Expect(str(a - b))
    return Unsupported('operation not recognised')


@ref('aedfrl', 'read the quantity as a whole number and a fraction and write its exact value in decimal notation')
def aedfrl(q):
    m = re.search(r'(?:needs|pays|buys|holds) ₹?' + NUM + r'(?: of a rupee)? (?:metres?|kg|litres?|of a rupee|for)', q['prompt'])
    if not m or 'as a decimal' not in q['prompt']:
        return Unsupported('quantity not found')
    d = _dec(_num(m.group(1)))
    return Expect(d) if d is not None else Verdict(False, 'not a terminating decimal')


@ref('aedlike', 'count decimal places of each number in a pair, or compare each option with the target as an exact value')
def aedlike(q):
    p, ch = q['prompt'], q.get('choices')
    if not ch:
        return Unsupported('no options')
    if p.startswith('Like decimals'):
        def like(c):
            a, b = c.split(' and ')
            return len(a.split('.')[1]) == len(b.split('.')[1])
        return _one(ch, like)
    m = re.search(r'equivalent to ([\d.]+) ', p)
    if not m:
        return Unsupported('prompt form')
    return _one(ch, lambda c: Fraction(c) == Fraction(m.group(1)))


@ref('agtwin', 'test each number of each pair for primality by trial division and check that they differ by exactly 2')
def agtwin(q):
    def twin(c):
        a, b = map(int, c.split(' and '))
        return b - a == 2 and _prime(a) and _prime(b)
    return _one(q['choices'], twin)


@ref('agpgrid', 'count the shaded squares of the 10 × 10 picture; the unshaded part is the rest of the hundred')
def agpgrid(q):
    f = q.get('figure') or {}
    if f.get('type') != 'grid' or f.get('rows', 0) * f.get('cols', 0) != 100:
        return Unsupported('no hundred grid')
    s = f['shaded'] if isinstance(f['shaded'], int) else len(f['shaded'])
    return Expect(str(100 - s if 'NOT shaded' in q['prompt'] else s))


@ref('aapat2', 'split each item into colour and shape, find the shortest repeat of each sequence separately, and continue both')
def aapat2(q):
    m = re.search(r'repeat: (.*), … What comes next\?', q['prompt'])
    if not m:
        return Unsupported('prompt form')
    items = [s.strip().split(' ') for s in m.group(1).split(',')]
    col, shp = [i[0] for i in items], [i[-1] for i in items]

    def nxt(seq):
        for per in range(1, len(seq)):
            if all(seq[i] == seq[i - per] for i in range(per, len(seq))) and len(seq) >= 2 * per:
                return seq[len(seq) - per]
        return None
    c, s = nxt(col), nxt(shp)
    if c is None or s is None:
        return Unsupported('no repeat shown twice')
    return _one(q['choices'], lambda o: o == f'{c} {s}')


# ------------------------------------------------------------------ b29
@ref('aqgst', 'exact money arithmetic: price after discount, GST at the rate on it, CGST half of it; the price before GST solves price × (1 + rate) = amount paid by trying every whole rupee')
def aqgst(q):
    p = q['prompt']
    m = re.search(r'paid ₹([\d.]+) for .*including GST at (\d+)%', p)
    if m:
        paid, r = Fraction(m.group(1)), int(m.group(2))
        hits = [x for x in range(1, 20001) if Fraction(x) * (100 + r) / 100 == paid]
        return Expect(str(hits[0])) if len(hits) == 1 else Unsupported('price before GST is not a whole rupee')
    m = re.search(r'list price of ₹(\d+)(?: at a discount of (\d+)%)?\. GST is charged at (\d+)%', p)
    if not m:
        return Unsupported('prompt form')
    lp, disc, r = Fraction(m.group(1)), Fraction(m.group(2) or 0), Fraction(m.group(3))
    sale = lp - lp * disc / 100
    gst = sale * r / 100
    if 'How much CGST' in p:
        return Expect(_dec(gst / 2))
    if 'How much does' in p:
        return Expect(_dec(sale + gst))
    return Unsupported('question not recognised')


@ref('aqrd', 'add the simple interest earned by the balance standing in the account month by month')
def aqrd(q):
    m = re.search(r'deposits ₹(\d+) every month .* for (\d+) months\. The bank pays simple interest at (\d+)% per year', q['prompt'])
    if not m:
        return Unsupported('prompt form')
    P, N, r = int(m.group(1)), int(m.group(2)), Fraction(m.group(3))
    bal, interest = 0, Fraction(0)
    for _ in range(N):
        bal += P
        interest += bal * r / 100 / 12
    if 'How much interest' in q['prompt']:
        return Expect(_dec(interest))
    if 'maturity value' in q['prompt']:
        return Expect(_dec(bal + interest))
    return Unsupported('question not recognised')


@ref('aqshare', 'one share: cost is the market value, dividend is the rate of the face value; totals multiply by the number of shares; return = income ÷ cost × 100')
def aqshare(q):
    p = q['prompt']
    m = re.search(r'buys (\d+) shares of face value ₹(\d+) each, at ₹([\d.]+) each .* dividend of (\d+)%', p)
    if not m:
        return Unsupported('prompt form')
    n, fv, mv, d = int(m.group(1)), Fraction(m.group(2)), Fraction(m.group(3)), Fraction(m.group(4))
    income, cost = n * fv * d / 100, n * mv
    if 'yearly income' in p:
        return Expect(_dec(income))
    if 'How much money' in p:
        return Expect(_dec(cost))
    if 'percentage return' in p:
        x = _dec(income / cost * 100)
        return Expect(x) if x is not None else Unsupported('return does not terminate')
    return Unsupported('question not recognised')


@ref('aqogive', 'build the ogive points (upper limit, running total) from the table and read along its straight segments at n/4, n/2 or 3n/4')
def aqogive(q):
    f = q.get('figure') or {}
    if f.get('type') != 'table':
        return Unsupported('no table')
    rows = [(Fraction(r[0].split('–')[0].strip()), Fraction(r[0].split('–')[1].strip()), int(r[1])) for r in f['rows']]
    pts, run = [(rows[0][0], 0)], 0
    for lo, hi, fr in rows:
        run += fr
        pts.append((hi, run))
    n = run
    p = q['prompt']
    m = re.search(r'less than (\d+) marks', p)
    if m:
        hit = [y for x, y in pts if x == int(m.group(1))]
        return Expect(str(hit[0])) if hit else Unsupported('not an upper limit')

    def at(y):
        for (x0, y0), (x1, y1) in zip(pts, pts[1:]):
            if y1 >= y and y1 > y0:
                return x0 + (y - y0) * (x1 - x0) / (y1 - y0)
        return None
    if 'interquartile range' in p:
        v = at(Fraction(3 * n, 4)) - at(Fraction(n, 4))
    elif 'lower quartile' in p:
        v = at(Fraction(n, 4))
    elif 'upper quartile' in p:
        v = at(Fraction(3 * n, 4))
    elif 'median' in p:
        v = at(Fraction(n, 2))
    else:
        return Unsupported('question not recognised')
    return Expect(str(v))
