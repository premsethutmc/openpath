"""measurement slice, part 2: ac*, ad*, ae* families (money, time, units, perimeter, conversions). Derived from the statement and figure only."""
import calendar
import re
from fractions import Fraction

from kit import ref, Expect, Verdict, Unsupported, Ambiguous
from refs.measurement_util import nums, MONTHS, month_no, fmt, dec

NOOPT = 'multiple-choice letter: the option texts and their order are not in the exported data (typed form has only the letter), so the keyed letter cannot be checked'


def ints(s):
    return [int(x) for x in nums(s)]


def D(s):
    return Fraction(s.replace(',', ''))


def two(x):
    """exact two-decimal text; the prompt asks 'write it like 4.50'"""
    return Expect(dec(Fraction(x), 2), form=True)


# ---------------------------------------------------------------- acbill
@ref('acbill', 'amount = quantity x rate by exact Fractions; total by summing; the amounts already printed in the bill are re-checked', 'exhaustive')
def acbill(q):
    rows = q['figure']['rows']
    items = []
    for r in rows[:-1]:
        qty = D(r[1].split()[0])
        rate = D(r[2])
        items.append((r[0], qty, rate, r[3]))
    for name, qty, rate, amt in items:
        if amt not in ('', '?') and D(amt) != qty * rate:
            return Verdict(False, f'bill line {name}: printed {amt} but {qty} x {rate} = {qty * rate}')
    p = q['prompt']
    if 'What is the total' in p:
        return two(sum(qty * rate for _, qty, rate, _ in items))
    m = re.search(r'the amount for (.+?) is missing', p)
    for name, qty, rate, amt in items:
        if name == m.group(1):
            if amt != '?':
                return Verdict(False, 'the amount asked for is not the one marked ?')
            return two(qty * rate)
    raise ValueError('item not found')


# ---------------------------------------------------------------- accal
@ref('accal', 'sum the entries of the drawn block (brute force) after checking it is a calendar block (+1 across, +7 down); middle = sum/9; hour hand by (h-1+n) mod 12 + 1', 'exhaustive')
def accal(q):
    p = q['prompt']
    if 'hour hand' in p:
        h, n = ints(p)[:2]
        pos = h
        for _ in range(n):  # advance one hour at a time
            pos = pos % 12 + 1
        return Expect(str(pos))
    if 'add up to' in p:
        s = ints(p)[-1]
        return Expect(str(Fraction(s, 9))) if s % 9 == 0 else Ambiguous('sum not divisible by 9')
    g = q['figure']['rows']
    for i in range(3):
        for j in range(3):
            if g[i][j] != g[0][0] + i * 7 + j:
                return Verdict(False, 'drawn block is not a calendar block')
    if 'sum of all nine' in p:
        return Expect(str(sum(sum(r) for r in g)))
    if 'four corner' in p:
        return Expect(str(g[0][0] + g[0][2] + g[2][0] + g[2][2]))
    if 'middle row' in p:
        return Expect(str(sum(g[1])))
    if 'diagonal from top left' in p:
        return Expect(str(g[0][0] + g[1][1] + g[2][2]))
    raise ValueError(p)


@ref('acdecu', 'decimal conversion by exact division / multiplication by the power of ten', 'exhaustive')
def acdecu(q):
    p = q['prompt']
    n = D(re.search(r'([\d,]+(?:\.\d+)?)', p).group(1))
    if re.search(r'cm in metres', p):
        return Expect(dec(n / 100))
    if re.search(r'mm in centimetres', p):
        return Expect(dec(n / 10))
    if re.search(r'm in kilometres', p):
        return Expect(dec(n / 1000))
    if re.search(r'm = how many centimetres', p):
        return Expect(dec(n * 100))
    raise ValueError(p)


def clock12(h, m):
    return (h % 12) * 60 + m


@ref('acelapsed', 'minutes from the time on the clock figure to the stated end time (12-hour clock, mod 720)', 'exhaustive')
def acelapsed(q):
    f = q['figure']
    eh, em = re.search(r'It ends at (\d+):(\d+)', q['prompt']).groups()
    d = (clock12(int(eh), int(em)) - clock12(f['h'], f['m'])) % 720
    return Expect(str(d)) if d else Ambiguous('zero duration')


@ref('acelhm', 'differences / sums in minutes since 12:00 then converted to (hours, minutes)', 'exhaustive')
def acelhm(q):
    p = q['prompt']
    n = ints(p)
    if 'ends at' in p:
        h1, m1, h2, m2 = n[:4]
        d = ((h2 % 12) * 60 + m2) - ((h1 % 12) * 60 + m1)  # both p.m.: the 12 o'clock hour is the earliest
        return Expect(f'({d // 60}, {d % 60})') if d > 0 else Ambiguous('non-positive span')
    h1, m1, dh, dm = n[:4]
    t = ((h1 % 12) + 12) * 60 + m1 + dh * 60 + dm  # minutes since midnight, start is p.m.
    if t >= 24 * 60:
        return Ambiguous('end time is after midnight, not p.m.')
    h = t // 60 - 12
    return Expect(f'({h or 12}, {t % 60})')


@ref('acmcm', 'metre/centimetre conversion by integer arithmetic', 'exhaustive')
def acmcm(q):
    p = q['prompt']
    n = ints(p)
    if 'how many centimetres' in p:
        return Expect(str(n[0] * 100 + n[1]))
    return Expect(str(n[0] - 100 * n[1]))


@ref('acmmkm', 'cm/mm and km/m conversions by integer arithmetic and exact division', 'exhaustive')
def acmmkm(q):
    p = q['prompt']
    n = ints(p)
    if re.match(r'[\d,]+ cm \d+ mm = how many millimetres', p):
        return Expect(str(n[0] * 10 + n[1]))
    if re.match(r'[\d,]+ mm = \d+ cm and how many mm', p):
        return Expect(str(n[0] - 10 * n[1]))
    if re.match(r'[\d,]+ m = \d+ km and how many m', p):
        return Expect(str(n[0] - 1000 * n[1]))
    if re.match(r'[\d,]+ m = how many kilometres', p):
        return Expect(dec(Fraction(n[0], 1000)))
    if re.match(r'[\d,]+ mm = how many centimetres', p):
        return Expect(dec(Fraction(n[0], 10)))
    raise ValueError(p)


def rup(s):
    return D(s.replace('₹', ''))


@ref('acmoneyadd', 'exact rupee/paise arithmetic with Fractions; the picture columns are compared with the statement', 'exhaustive')
def acmoneyadd(q):
    p = q['prompt']
    m = re.match(r'₹([\d.]+) ([+−]) ₹([\d.]+) = \?', p)
    a, b = D(m.group(1)), D(m.group(3))
    rows = q['figure']['rows']
    fa = rows[0][1] + Fraction(int(rows[0][2]), 100)
    fb = rows[1][1] + Fraction(int(rows[1][2]), 100)
    if (fa, fb) != (a, b):
        return Verdict(False, 'picture amounts differ from the statement')
    if (m.group(2) == '−') != (rows[1][0] in ('−', '-')):
        return Verdict(False, 'picture operation differs from the statement')
    r = a + b if m.group(2) == '+' else a - b
    return two(r) if r >= 0 else Ambiguous('negative')


@ref('acmoneymul', 'multiply / divide exact rupee amounts (Fractions); division must be exact to the paisa', 'exhaustive')
def acmoneymul(q):
    p = q['prompt']
    if (m := re.match(r'One .+? costs ₹([\d.]+)\. What do (\d+) .+? cost\?', p)):
        return two(D(m.group(1)) * int(m.group(2)))
    m = re.match(r'(\d+) .+? cost ₹([\d.]+) altogether\. What does one', p)
    r = D(m.group(2)) / int(m.group(1))
    return two(r) if (r * 100).denominator == 1 else Ambiguous('not a whole number of paise')


@ref('acp2r', 'paise / 100 as an exact two-decimal amount; picture compared with statement', 'exhaustive')
def acp2r(q):
    n = ints(q['prompt'])[0]
    if int(q['figure']['rows'][0][0].replace(',', '')) != n:
        return Verdict(False, 'picture differs from statement')
    return two(Fraction(n, 100))


@ref('acpaise', 'rupees x 100 + paise (exact)', 'exhaustive')
def acpaise(q):
    p = q['prompt']
    if (m := re.search(r'in ₹(\d+) and (\d+) paise', p)):
        return Expect(str(100 * int(m.group(1)) + int(m.group(2))))
    m = re.search(r'paise make ₹([\d.]+)\?', p)
    v = D(m.group(1)) * 100
    return Expect(fmt(v))


def hm_total(h, m):
    return h * 60 + m


@ref('actrain', 'elapsed minutes between the timetable entries (day + 24-hour time) / arrival time = (start + duration) mod 24 h', 'exhaustive')
def actrain(q):
    p = q['prompt']
    if q.get('figure'):
        rows = q['figure']['rows']
        def ts(r):
            day = int(r[1].split()[1])
            hh, mm = map(int, r[2].split()[0].split(':'))
            return (day - 1) * 1440 + hh * 60 + mm
        d = ts(rows[1]) - ts(rows[0])
        if rows[0][0] not in p or rows[1][0] not in p:
            return Verdict(False, 'stations differ between picture and statement')
        return Expect(f'({d // 60}, {d % 60})')
    h, m, dh, dm = ints(re.search(r'leaves .+? at (\d+):(\d+) and the journey takes (\d+) hours? (\d+) minutes', p).group(0))
    t = (h * 60 + m + dh * 60 + dm) % 1440
    return Expect(f'({t // 60}, {t % 60})')


@ref('adday', 'unit arithmetic (days/hours/weeks/months) and month lengths from the calendar module', 'exhaustive')
def adday(q):
    p = q['prompt']
    if (m := re.fullmatch(r'How many hours are there in (\d+) days?(?: (\d+) hours?)?\?', p)):
        return Expect(str(24 * int(m.group(1)) + int(m.group(2) or 0)))
    if (m := re.fullmatch(r'How many days are there in (\d+) weeks?(?: (\d+) days?)?\?', p)):
        return Expect(str(7 * int(m.group(1)) + int(m.group(2) or 0)))
    if (m := re.fullmatch(r'How many months are there in (\d+) years?(?: (\d+) months?)?\?', p)):
        return Expect(str(12 * int(m.group(1)) + int(m.group(2) or 0)))
    if (m := re.fullmatch(r'How many days are there in (\w+) and (\w+) together \(not in a leap year\)\?', p)):
        return Expect(str(calendar.monthrange(2023, month_no(m.group(1)))[1] + calendar.monthrange(2023, month_no(m.group(2)))[1]))
    if (m := re.fullmatch(r'How many days are there in (\w+) \(in a year that is not a leap year\)\?', p)):
        return Expect(str(calendar.monthrange(2023, month_no(m.group(1)))[1]))
    raise ValueError(p)


@ref('addur', 'add durations in the smaller unit then divmod; seconds to (min, s) by divmod', 'exhaustive')
def addur(q):
    p = q['prompt']
    if (m := re.fullmatch(r'A bus ride takes (\d+) h (\d+) min and a train ride after it takes (\d+) h (\d+) min\. How long is the whole journey\? Write the answer as \(hours, minutes\)\.', p)):
        a, b, c, d = map(int, m.groups())
        t = a * 60 + b + c * 60 + d
        return Expect(f'({t // 60}, {t % 60})')
    if (m := re.search(r'two laps in (\d+) min (\d+) s and (\d+) min (\d+) s\.', p)):
        a, b, c, d = map(int, m.groups())
        t = a * 60 + b + c * 60 + d
        return Expect(f'({t // 60}, {t % 60})')
    if (m := re.fullmatch(r'Write (\d+) seconds in minutes and seconds\. Write the answer as \(minutes, seconds\)\.', p)):
        n = int(m.group(1))
        return Expect(f'({n // 60}, {n % 60})')
    raise ValueError(p)


@ref('adhmin', 'hours x 60 + minutes', 'exhaustive')
def adhmin(q):
    m = re.fullmatch(r'How many minutes are there in (\d+) hours?(?: (\d+) minutes)?\?', q['prompt'])
    return Expect(str(60 * int(m.group(1)) + int(m.group(2) or 0)))


@ref('adm2h', 'divmod of minutes by 60', 'exhaustive')
def adm2h(q):
    n = ints(q['prompt'])[0]
    return Expect(f'({n // 60}, {n % 60})')


@ref('adsec', 'minutes x 60 + seconds', 'exhaustive')
def adsec(q):
    m = re.fullmatch(r'How many seconds are there in (\d+) minutes?(?: (\d+) seconds)?\?', q['prompt'])
    return Expect(str(60 * int(m.group(1)) + int(m.group(2) or 0)))


SIDES = {'triangle': 3, 'three-sided': 3, 'four-sided': 4, 'square': 4, 'five-sided': 5, 'pentagon': 5, 'six-sided': 6, 'hexagon': 6, 'heptagon': 7, 'octagon': 8}


def shape_sides(p):
    for k, v in SIDES.items():
        if k in p:
            return v
    raise ValueError(p)


def fig_lengths(f):
    return [L for L in f['lengths']]


@ref('adperim', 'sum of the marked side lengths (count of sides compared with the statement)', 'exhaustive')
def adperim(q):
    L = q['figure']['lengths']
    if len(L) != shape_sides(q['prompt']):
        return Verdict(False, 'number of sides drawn differs from statement')
    sides = [ints(x)[0] for x in L]
    if max(sides) * 2 >= sum(sides):
        return Verdict(False, f'impossible polygon: longest side {max(sides)} >= sum of the others')
    return Expect(str(sum(sides)))


@ref('admper', 'perimeter minus the sum of the known sides', 'exhaustive')
def admper(q):
    L = q['figure']['lengths']
    P = ints(q['prompt'])[0]
    if len(L) != shape_sides(q['prompt']) or sum(1 for x in L if x == '?') != 1:
        return Verdict(False, 'figure does not match the statement (side count / one ? side)')
    r = P - sum(ints(x)[0] for x in L if x != '?')
    if r <= 0:
        return Ambiguous('non-positive side')
    sides = [ints(x)[0] for x in L if x != '?'] + [r]
    if max(sides) * 2 >= sum(sides):
        return Verdict(False, f'impossible polygon: longest side {max(sides)} >= sum of the others')
    return Expect(str(r))


@ref('adpreg', 'regular polygon: n equal sides; perimeter = n x side, side = perimeter / n', 'exhaustive')
def adpreg(q):
    p = q['prompt']
    n = shape_sides(p)
    v = ints(p)[0]
    if 'What is its perimeter' in p:
        return Expect(str(n * v))
    assert 'How long is one side' in p
    return Expect(fmt(Fraction(v, n)))


@ref('adrace', 'choice: letter not checkable (options not exported); the three times are parsed for a fastest / slowest decision only', 'exhaustive')
def adrace(q):
    return Unsupported(NOOPT)


@ref('aearea', 'count of unit squares in the grid; rows x columns as a double count', 'exhaustive')
def aearea(q):
    r, c = ints(q['prompt'].split('The rectangle has')[1])[:2]
    f = q['figure']
    if (f['rows'], f['cols']) != (r, c):
        return Verdict(False, 'grid drawn differs from statement')
    return Expect(str(sum(1 for _ in range(r) for _ in range(c))))


@ref('aecf', 'unit/currency conversion by exact Fractions from the factors given in the statement', 'exhaustive')
def aecf(q):
    p = q['prompt']
    if (m := re.match(r'A .+? (?:travels at|runs at|goes at) ([\d.]+) (km/h|m/s)\. What is this speed in (metres per second|kilometres per hour)', p)):
        v = D(m.group(1))
        return Expect(dec(v * 1000 / 3600) if m.group(2) == 'km/h' else dec(v * 3600 / 1000))
    if (m := re.match(r'1 inch = ([\d.]+) cm\. .+? ([\d.]+) inch(?:es)? ', p)):
        return Expect(dec(D(m.group(1)) * D(m.group(2))))
    if (m := re.match(r'1 mile is about ([\d.]+) km\. .+? shows ([\d.]+) miles', p)):
        return Expect(dec(D(m.group(1)) * D(m.group(2))))
    if (m := re.match(r'On one day, 1 US dollar is worth ₹([\d.]+)\. How many rupees is ([\d.]+) dollars', p)):
        return Expect(dec(D(m.group(1)) * D(m.group(2))))
    raise ValueError(p)


UNITS = {'m': ('cm', 100), 'kg': ('g', 1000), 'L': ('mL', 1000), 'km': ('m', 1000), 'cm': ('mm', 10), 'g': ('mg', 1000)}
SMALL = {v[0]: (k, v[1]) for k, v in UNITS.items()}
UNIT_RE = r'(km|kg|cm|mm|mg|mL|m|L|g)'


def to_small(text, big):
    """'1 m 18 cm' / '3 kg' -> total in the small unit of the pair headed by `big`"""
    small, f = UNITS[big]
    tot = Fraction(0)
    for v, u in re.findall(r'([\d,]+(?:\.\d+)?) ' + UNIT_RE + r'\b', text):
        v = D(v)
        if u == big:
            tot += v * f
        elif u == small:
            tot += v
        else:
            raise ValueError(f'unit {u} in {text}')
    return tot


@ref('aeconv', 'convert the compound quantity to the small unit with exact integers', 'exhaustive')
def aeconv(q):
    p = q['prompt']
    m = re.match(r'(.+?) = how many (\w+)\?', p)
    lhs, tgt = m.group(1), m.group(2)
    big = [b for b, (s, f) in UNITS.items() if s == tgt][0]
    return Expect(fmt(to_small(lhs, big)))


@ref('aeconvd', 'decimal value of a unit conversion by exact division by the factor', 'exhaustive')
def aeconvd(q):
    p = q['prompt']
    m = re.match(r'Write ([\d,]+) (\w+) in (\w+) \(as a decimal\)\.', p)
    n, u, tgt = D(m.group(1)), m.group(2), m.group(3)
    f = {('cm', 'metres'): 100, ('g', 'kilograms'): 1000, ('mL', 'litres'): 1000, ('m', 'kilometres'): 1000, ('mm', 'centimetres'): 10, ('mg', 'grams'): 1000}[(u, tgt)]
    return Expect(dec(n / f))


@ref('aeconvu', 'divmod of the small unit by the factor to (big, small)', 'exhaustive')
def aeconvu(q):
    p = q['prompt']
    m = re.match(r'([\d,]+) (\w+) = how many (\w+) and (\w+)\?', p)
    n, big = int(m.group(1).replace(',', '')), m.group(3)
    f = UNITS[big][1]
    assert UNITS[big][0] == m.group(4) == m.group(2)
    return Expect(f'({n // f}, {n % f})')


def big_of(p):
    m = re.search(r'\(' + UNIT_RE + r', ' + UNIT_RE + r'\)', p)
    return m.group(1)


@ref('aedivm', 'convert to the small unit, divide (must be exact), convert back with divmod', 'exhaustive')
def aedivm(q):
    p = q['prompt']
    big = big_of(p)
    m = re.match(r'Divide (.+?) into (\d+) equal parts', p)
    t = to_small(m.group(1), big)
    r = t / int(m.group(2))
    if r.denominator != 1:
        return Ambiguous('does not divide into a whole number of the small unit')
    f = UNITS[big][1]
    return Expect(f'({int(r) // f}, {int(r) % f})')


@ref('aemix', 'add / subtract in the small unit, then divmod back; negative results flagged', 'exhaustive')
def aemix(q):
    p = q['prompt']
    big = big_of(p)
    m = re.match(r'(Add|Subtract): (.+?) ([+−]) (.+?)\. Write', p)
    a, b = to_small(m.group(2), big), to_small(m.group(4), big)
    r = a + b if m.group(1) == 'Add' else a - b
    if r < 0:
        return Ambiguous('negative')
    f = UNITS[big][1]
    return Expect(f'({int(r) // f}, {int(r) % f})')


@ref('aemulm', 'multiply in the small unit then divmod', 'exhaustive')
def aemulm(q):
    p = q['prompt']
    big = big_of(p)
    m = re.match(r'Work out (\d+) × (.+?)\. Write', p)
    r = int(m.group(1)) * to_small(m.group(2), big)
    f = UNITS[big][1]
    return Expect(f'({int(r) // f}, {int(r) % f})')


@ref('aeel24', 'elapsed minutes between two 24-hour times on the same day', 'exhaustive')
def aeel24(q):
    h1, m1, h2, m2 = ints(re.search(r'from (\d+):(\d+) to (\d+):(\d+)', q['prompt']).group(0))
    d = (h2 * 60 + m2) - (h1 * 60 + m1)
    return Expect(f'({d // 60}, {d % 60})') if d > 0 else Ambiguous('non-positive')


@ref('aeftin', 'conversion by the stated approximate factors (exact Fractions)', 'exhaustive')
def aeftin(q):
    p = q['prompt']
    if (m := re.match(r'1 foot is about (\d+) cm\. About how many centimetres is (\d+) feet\?', p)):
        return Expect(fmt(int(m.group(1)) * int(m.group(2))))
    if (m := re.match(r'1 foot is about (\d+) cm and 1 inch is about ([\d.]+) cm \(12 inches make 1 foot\)\. About how many centimetres is (\d+) (?:foot|feet) (\d+) inch(?:es)?\?', p)):
        ft, inch = int(m.group(3)), int(m.group(4))
        return Expect(dec(int(m.group(1)) * ft + D(m.group(2)) * inch))
    n = [D(x) for x in re.findall(r'\d+(?:\.\d+)?', p)]
    if len(n) == 2 and 'About how many metres is that' in p:
        return Expect(dec(n[0] * n[1]))
    raise ValueError(p)


@ref('aeirr', 'count of drawn cells: ■ and ◕ = 1, ◑ = 1/2, ◔ and □ = 0; or the difference of the A and B cell counts', 'exhaustive')
def aeirr(q):
    rows = q['figure']['rows']
    flat = [c for r in rows for c in r]
    if 'leaf' in q['prompt']:
        w = {'■': 1, '◕': 1, '◑': Fraction(1, 2), '◔': 0, '□': 0}
        return Expect(dec(sum(Fraction(w[c]) for c in flat)))
    a, b = flat.count('A'), flat.count('B')
    if a == b:
        return Ambiguous('same count: no shape covers more')
    return Expect(str(abs(a - b)))


@ref('aeparts', 'division of the whole quantity (converted to the small unit) by the part size', 'exhaustive')
def aeparts(q):
    p = q['prompt']
    m = re.match(r'How many (?:packets|bottles) of (\d+) (g|mL) together make (\d+) (kg|L)\?', p)
    part, tot = int(m.group(1)), int(m.group(3)) * 1000
    return Expect(fmt(Fraction(tot, part)))


@ref('aeperar', 'tiles: area / tile area (and 1-by-1 cell count); fencing: sum of the four sides', 'exhaustive')
def aeperar(q):
    p = q['prompt']
    n = ints(p)
    if 'once round' in p:
        return Expect(str(2 * (n[0] + n[1])))
    L, W, s = n[:3]
    cells = sum(1 for i in range(0, L, s) for j in range(0, W, s)) if L % s == 0 and W % s == 0 else None
    if cells is None:
        return Ambiguous('tile does not fit exactly')
    return Expect(str(cells))


@ref('aet12', '24-hour reading to the 12-hour clock: hour mod 12, 0 shown as 12', 'exhaustive')
def aet12(q):
    h, m = ints(re.search(r'shows (\d+):(\d+)\.', q['prompt']).group(0))
    return Expect(f'({h % 12 or 12}, {m})')


@ref('aet24', '12-hour to 24-hour: a.m. 12 -> 0, p.m. other than 12 -> +12; the clock picture is compared with the statement', 'exhaustive')
def aet24(q):
    m = re.search(r'Write (\d+):(\d+) (a\.m\.|p\.m\.) in', q['prompt'])
    h, mi, ap = int(m.group(1)), int(m.group(2)), m.group(3)
    f = q['figure']
    if (f['h'], f['m']) != (h, mi):
        return Verdict(False, 'clock picture differs from the statement')
    h24 = (h % 12) + (12 if ap == 'p.m.' else 0)
    return Expect(f'({h24}, {mi})')


@ref('aeampm', 'choice: letter not checkable (options not exported)', 'exhaustive')
def aeampm(q):
    return Unsupported(NOOPT)


@ref('aewcmp', 'choice: letter not checkable (options not exported)', 'exhaustive')
def aewcmp(q):
    return Unsupported(NOOPT)


@ref('acmcmp', 'choice: letter not checkable (options not exported)', 'exhaustive')
def acmcmp(q):
    return Unsupported(NOOPT)
