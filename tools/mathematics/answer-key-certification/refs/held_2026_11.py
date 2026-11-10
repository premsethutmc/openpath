"""Independent references for families added after the 2026-10 certification (machine-validation@1, held families).

Each reference reads the printed question only and derives the answer by a first-principles method; none reads the generator.
A prompt the reference does not recognise is reported unsupported (never guessed).
"""
import re
from decimal import Decimal
from fractions import Fraction

from kit import Ambiguous, Expect, Unsupported, Verdict, ref


def _i(s):
    return int(s.replace('−', '-').replace(',', ''))


def _lin(s):
    """'3x − 4', 'x + 12', '2x', '7' -> (coefficient of x, constant)."""
    a = b = 0
    for sign, coef, x, const in re.findall(r'([+−-]?)\s*(?:(\d*)(x)|(\d+))', s.replace(' ', '')):
        k = -1 if sign in ('−', '-') else 1
        if x:
            a += k * (int(coef) if coef else 1)
        elif const:
            b += k * int(const)
    return a, b


def _solve(lhs, rhs):
    (a, b), (c, d) = lhs, rhs
    if a == c:
        return Verdict(False, 'no unique solution')
    x = Fraction(d - b, a - c)
    return Expect(str(x.numerator) if x.denominator == 1 else f'{x.numerator}/{x.denominator}')


@ref('lboth', 'collect x on one side and constants on the other; exact rational solution')
def lboth(q):
    m = re.fullmatch(r'Solve ([^=(]+) = ([^=(]+)\. What is x\?', q['prompt'])
    if not m:
        return Unsupported('prompt form')
    return _solve(_lin(m[1]), _lin(m[2]))


@ref('lbrk', 'expand the bracket, then collect terms; exact rational solution')
def lbrk(q):
    m = re.fullmatch(r'Solve (\d+)\(x ([+−]) (\d+)\) = ([^=(]+)\. What is x\?', q['prompt'])
    if not m:
        return Unsupported('prompt form')
    a, b = int(m[1]), int(m[3]) * (1 if m[2] == '+' else -1)
    return _solve((a, a * b), _lin(m[4]))


@ref('aerot', 'rotation about the origin by the rule for a quarter or half turn')
def aerot(q):
    m = re.fullmatch(r'In the picture, the point P is at \((−?\d+), (−?\d+)\)\. Rotate P through (\d+)°( anticlockwise| clockwise)? about the origin O\(0, 0\)\. What are the coordinates of its image\? Write them as \(x, y\)\.', q['prompt'])
    if not m:
        return Unsupported('prompt form')
    x, y, deg, way = _i(m[1]), _i(m[2]), int(m[3]), (m[4] or '').strip()
    if deg == 180 and not way:
        u, v = -x, -y
    elif deg == 90 and way == 'anticlockwise':
        u, v = -y, x
    elif deg == 90 and way == 'clockwise':
        u, v = y, -x
    else:
        return Unsupported(f'{deg}° {way}')
    return Expect(f'({u}, {v})'.replace('-', '−'))


@ref('agchange', 'note minus the two prices, in exact decimal arithmetic')
def agchange(q):
    m = re.fullmatch(r'\w+ buys an? .+? for ₹(\d+(?:\.\d\d)?) and an? .+? for ₹(\d+(?:\.\d\d)?), and pays with a ₹(\d+) note\. How much change should \w+ get, in rupees\?', q['prompt'])
    if not m:
        return Unsupported('prompt form')
    change = Decimal(m[3]) - Decimal(m[1]) - Decimal(m[2])
    if change < 0:
        return Verdict(False, 'the note does not cover the prices')
    return Expect(f'{change:.2f}')


@ref('ahfibp', 'list the sequence 1, 2, 3, 5, 8, … term by term and count or add')
def ahfibp(q):
    p = q['prompt']
    if not p.startswith('The Virahanka numbers are 1, 2, 3, 5, 8, 13, … (each number after the first two is the sum of the two before it).'):
        return Unsupported('prompt form')
    seq = [1, 2]
    while len(seq) < 200:
        seq.append(seq[-1] + seq[-2])
    m = re.search(r'What is the sum of the first (\d+) Virahanka numbers\?$', p)
    if m:
        return Expect(str(sum(seq[:int(m[1])])))
    m = re.search(r'How many of the first (\d+) Virahanka numbers are even\?$', p)
    if m:
        return Expect(str(sum(1 for v in seq[:int(m[1])] if v % 2 == 0)))
    m = re.search(r'How many of the first (\d+) Virahanka numbers are multiples of (\d+)\?$', p)
    if m:
        return Expect(str(sum(1 for v in seq[:int(m[1])] if v % int(m[2]) == 0)))
    return Unsupported('question form')


_SIDES = {'triangular': 3, 'square': 4, 'rectangular': 4, 'pentagonal': 5, 'hexagonal': 6, 'heptagonal': 7, 'octagonal': 8, 'nonagonal': 9, 'decagonal': 10}
_COUNT = {
    'prism': {'faces': lambda n: n + 2, 'vertices': lambda n: 2 * n, 'edges': lambda n: 3 * n},
    'pyramid': {'faces': lambda n: n + 1, 'vertices': lambda n: n + 1, 'edges': lambda n: 2 * n},
}


@ref('aipolyc', 'count faces, vertices and edges of an n-gonal prism or pyramid from its construction; invert by search')
def aipolyc(q):
    m = re.fullmatch(r'How many (faces|vertices|edges) does an? (\w+) (prism|pyramid) have\?', q['prompt'])
    if m:
        if m[2] not in _SIDES:
            return Unsupported(m[2])
        return Expect(str(_COUNT[m[3]][m[1]](_SIDES[m[2]])))
    m = re.fullmatch(r'A (prism|pyramid) has (\d+) (faces|vertices|edges)\. How many sides does its base have\?', q['prompt'])
    if m:
        hits = [n for n in range(3, 200) if _COUNT[m[1]][m[3]](n) == int(m[2])]
        if len(hits) != 1:
            return Verdict(False, f'{len(hits)} possible bases')
        return Expect(str(hits[0]))
    return Unsupported('prompt form')


@ref('ajmilr', 'write the number out and divide by one lakh or one crore')
def ajmilr(q):
    m = re.fullmatch(r'(\d+) (million|billion) is ([\d,]+) in the international system\. How many (lakh|crore) is it\?', q['prompt'])
    if not m:
        return Unsupported('prompt form')
    value = int(m[1]) * (10 ** 6 if m[2] == 'million' else 10 ** 9)
    if _i(m[3]) != value:
        return Verdict(False, f'the printed numeral {m[3]} is not {m[1]} {m[2]}')
    unit = 10 ** 5 if m[4] == 'lakh' else 10 ** 7
    if value % unit:
        return Verdict(False, 'not a whole number of ' + m[4])
    return Expect(str(value // unit))


@ref('ajsize', 'convert with 60 s = 1 min, 60 min = 1 h, 24 h = 1 day and the stated year; round to the nearest whole number')
def ajsize(q):
    m = re.fullmatch(r'About how many (hours|days|years) are (\d+) (lakh|crore) \(([\d,]+)\) (seconds|minutes|hours|days)\? Give the answer to the nearest whole number of (hours|days|years)(?: \(take a year as (\d+) days\))?\.', q['prompt'])
    if not m or m[1] != m[6]:
        return Unsupported('prompt form')
    amount = int(m[2]) * (10 ** 5 if m[3] == 'lakh' else 10 ** 7)
    if _i(m[4]) != amount:
        return Verdict(False, f'the printed numeral {m[4]} is not {m[2]} {m[3]}')
    seconds = {'seconds': 1, 'minutes': 60, 'hours': 3600, 'days': 86400}[m[5]]
    if m[1] == 'years' and not m[7]:
        return Unsupported('year length not stated')
    target = {'hours': 3600, 'days': 86400, 'years': 86400 * int(m[7] or 0)}[m[1]]
    value = Fraction(amount * seconds, target)
    if value.denominator == 2:
        return Ambiguous('exactly halfway between two whole numbers')
    return Expect(str(int(value + Fraction(1, 2))))


@ref('akhtab', 'tally the listed values into the named class (lower limit included, upper limit excluded)')
def akhtab(q):
    p = q['prompt']
    m = re.search(r' are: ([\d, ]+)\. They are grouped in classes (\d+)–(\d+), (\d+)–(\d+), … where each class includes its lower limit but not its upper limit\. What is the frequency of the class (\d+)–(\d+)\?$', p)
    if not m:
        return Unsupported('prompt form')
    data = [int(v) for v in m[1].split(',')]
    n = re.search(r'(\d+) (?:students|players|children|families)', p)
    if n and int(n[1]) != len(data):
        return Verdict(False, f'{len(data)} values listed, {n[1]} stated')
    width = int(m[3]) - int(m[2])
    lo, hi = int(m[6]), int(m[7])
    if hi - lo != width or (lo - int(m[2])) % width:
        return Verdict(False, 'the named class is not one of the stated classes')
    return Expect(str(sum(1 for v in data if lo <= v < hi)))
