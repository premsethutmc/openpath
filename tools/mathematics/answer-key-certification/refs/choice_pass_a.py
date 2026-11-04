"""choice-pass judges, part A: calendar/time/money/measurement/number families."""
import datetime
import itertools
import math
import re
from fractions import Fraction

import sympy as sp

from .choice_pass_util import (JUDGES, Ambiguous, Defect, Unsupported, event_pred, eq_text, fr, isprime, judge, nm, only, unsup)

MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']  # datetime.weekday() order
DAYS_SUN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']


@judge('aaday', 'weekday of the date by the proleptic Gregorian calendar (datetime), cross-checked against the calendar table in the figure')
def aaday(q, opts):
    m = re.search(r'calendar for (\w+) (\d{4})\. On which day of the week is (\d+) \w+\?', q['prompt'])
    if not m:
        return Unsupported('unparsed prompt')
    mon, y, d = MONTHS.index(m.group(1)) + 1, int(m.group(2)), int(m.group(3))
    wd = DAYS[datetime.date(y, mon, d).weekday()]
    fig = q['figure']
    # figure: rows[0] = weekday names (Sun first); find the column of d
    names = fig['rows'][0]
    for r in fig['rows'][1:]:
        for c, v in enumerate(r):
            if v == d and names[c] != wd[:3]:
                return Defect(f'figure puts day {d} under {names[c]} but the calendar says {wd}')
    if fig['head'][0] != f'{m.group(1)} {y}':
        return Defect('figure title differs from the prompt')
    return eq_text(opts, wd)


@judge('aaddmm', 'format the date as DD/MM/YYYY by string formatting of the stated day, month, year')
def aaddmm(q, opts):
    m2 = re.fullmatch(r'A date is written as (\d\d)/(\d\d)/(\d{4}) \(DD/MM/YYYY\)\. Which date is it\?', q['prompt'])
    if m2:
        d, mon, y = int(m2.group(1)), int(m2.group(2)), int(m2.group(3))
        datetime.date(y, mon, d)
        return eq_text(opts, f'{d} {MONTHS[mon - 1]} {y}')
    m = re.search(r'Which shows (\d+) (\w+) (\d{4}) written as DD/MM/YYYY\?', q['prompt'])
    if not m:
        return Unsupported('unparsed prompt')
    d, mon, y = int(m.group(1)), MONTHS.index(m.group(2)) + 1, int(m.group(3))
    datetime.date(y, mon, d)
    return eq_text(opts, f'{d:02d}/{mon:02d}/{y}')


SEASONS = [('Winter', [1, 2]), ('Summer', [3, 4, 5]), ('Monsoon (rainy season)', [6, 7, 8, 9]), ('Post-monsoon', [10, 11, 12])]


@judge('aaseason', 'IMD four-season table (Winter Jan-Feb, Summer Mar-May, Monsoon Jun-Sep, Post-monsoon Oct-Dec; matches the figure), cyclic order')
def aaseason(q, opts):
    fig = q['figure']
    tbl = {r[0]: [MONTHS.index(x.strip()) + 1 for x in r[1].split(',')] for r in fig['rows']}
    if tbl != dict(SEASONS):
        return Defect(f'figure table {tbl} differs from the IMD seasons')
    season_of = {mo: s for s, ms in SEASONS for mo in ms}
    order = [s for s, _ in SEASONS]
    p = q['prompt']
    m = re.search(r'In which season is (\w+)\?', p)
    if m:
        return eq_text(opts, season_of[MONTHS.index(m.group(1)) + 1])
    m = re.search(r'in (\w+)\. The next visit is (\d+) months? later', p)
    if m:
        mo = (MONTHS.index(m.group(1)) + int(m.group(2))) % 12 + 1
        return eq_text(opts, season_of[mo])
    m = re.search(r'Which season comes just (after|before) (.+)\?$', p)
    if m:
        i = order.index(m.group(2))
        return eq_text(opts, order[(i + (1 if m.group(1) == 'after' else -1)) % 4])
    return Unsupported('unparsed prompt')


@judge('aaspan', 'compare the stated counts: same unit -> larger count is longer; one object measured with two units -> fewer units means the longer unit')
def aaspan(q, opts):
    p, fig = q['prompt'], q['figure']
    m = re.search(r'The (\w+) is (\d+) spans long and the (\w+) is (\d+) spans long', p)
    if m:
        a, x, b, y = m.group(1), int(m.group(2)), m.group(3), int(m.group(4))
        if fig['values'] != [x, y] or fig['labels'] != [a, b]:
            return Defect('figure bars differ from the statement')
        want = 'both are the same length' if x == y else (f'the {a}' if x > y else f'the {b}')
        return eq_text(opts, want)
    m = re.search(r'it is (\d+) ([\w ]+?)s? long and (\d+) ([\w ]+?)s? long\. Which is longer, one ([\w ]+) or one ([\w ]+)\?', p)
    if m:
        x, ua, y, ub = int(m.group(1)), m.group(2), int(m.group(3)), m.group(4)
        if (m.group(5), m.group(6)) != (ua, ub):
            return Unsupported('unit names unparsed')
        if [r[1] for r in fig['rows']] != [x, y]:
            return Defect('figure table differs from the statement')
        # same length L = x*ua = y*ub  =>  ua/ub = y/x
        want = 'both are the same length' if x == y else (f'a {ua}' if y > x else f'a {ub}')
        if x == y:
            return eq_text(opts, want)
        return [nm(o) in (want, want.replace('a ', 'an ', 1)) for o in opts]
    return Unsupported('unparsed prompt')


@judge('aaways', 'parse the coin multisets; an option is correct iff it sums to the amount and is a different multiset of denominations')
def aaways(q, opts):
    m = re.search(r'makes ₹(\d+) with the money in the picture: ([₹\d +]+)\. Which', q['prompt'])
    if not m:
        return Unsupported('unparsed prompt')
    tot = int(m.group(1))
    base = sorted(int(x) for x in re.findall(r'₹(\d+)', m.group(2)))
    if sum(base) != tot or sorted(q['figure']['items']) != base:
        return Defect('statement/figure amounts inconsistent')
    out = []
    for o in opts:
        vals = sorted(int(x) for x in re.findall(r'₹(\d+)', o))
        out.append(sum(vals) == tot and vals != base)
    return out


@judge('aaweek', 'day index arithmetic mod 7 from the named day')
def aaweek(q, opts):
    p = q['prompt']
    mm = re.fullmatch(r'Which month comes just (after|before) (\w+)\?', p) or re.fullmatch(r'Which month is (\d+) months (after|before) (\w+)\?', p)
    if mm:
        g = mm.groups()
        k, sgn, d = (1, g[0], g[1]) if len(g) == 2 else (int(g[0]), g[1], g[2])
        return eq_text(opts, MONTHS[(MONTHS.index(d) + (k if sgn == 'after' else -k)) % 12])
    mo = re.fullmatch(r'Which is the (\w+) month of the year\?', p)
    if mo:
        ords = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth', 'tenth', 'eleventh', 'twelfth']
        return eq_text(opts, MONTHS[ords.index(mo.group(1))])
    m = re.fullmatch(r'Which day comes just (after|before) (\w+)\?', p)
    k, sgn, d = (1, m.group(1), m.group(2)) if m else (None, None, None)
    if not m:
        m = re.fullmatch(r'Which day is (\d+) days (after|before) (\w+)\?', p)
        if not m:
            return Unsupported('unparsed prompt')
        k, sgn, d = int(m.group(1)), m.group(2), m.group(3)
    i = DAYS_SUN.index(d)
    return eq_text(opts, DAYS_SUN[(i + (k if sgn == 'after' else -k)) % 7])


def _h12(h, mi):
    return f"{(h % 12) or 12}:{mi:02d} {'a.m.' if h < 12 else 'p.m.'}"


@judge('ab24h', 'standard 12/24-hour clock conversion (00:xx = 12:xx a.m., 12:xx = 12:xx p.m., 13-23 = h-12 p.m.)')
def ab24h(q, opts):
    p = q['prompt']
    m = re.fullmatch(r'What is (\d+):(\d+) (a\.m\.|p\.m\.) in the 24-hour clock\?', p)
    if m:
        h, mi, ap = int(m.group(1)), int(m.group(2)), m.group(3)
        assert 1 <= h <= 12
        h24 = (h % 12) + (12 if ap == 'p.m.' else 0)
        return eq_text(opts, f'{h24:02d}:{mi:02d}')
    m = re.search(r'shows a train at (\d+):(\d+) \(24-hour clock\)\. What is that in the 12-hour clock\?', p)
    if m:
        return eq_text(opts, _h12(int(m.group(1)), int(m.group(2))))
    return Unsupported('unparsed prompt')


@judge('aeampm', '24-hour to 12-hour clock conversion; clock figure cross-checked')
def aeampm(q, opts):
    m = re.search(r'shows (\d+):(\d+) \(24-hour time\)', q['prompt'])
    if not m:
        return Unsupported('unparsed prompt')
    h, mi = int(m.group(1)), int(m.group(2))
    f = q['figure']
    if (f.get('h'), f.get('m')) != (h % 12, mi):
        return Defect('clock figure differs from the statement')
    return eq_text(opts, _h12(h, mi))


@judge('abenough', 'compare the money with the sum of the two prices (figure table cross-checked)')
def abenough(q, opts):
    nums = [int(x) for x in re.findall(r'₹(\d+)', q['prompt'])]
    if len(nums) != 3:
        return Unsupported('unparsed prompt')
    if [r[1] for r in q['figure']['rows']] != nums:
        return Defect('figure table differs from the statement')
    money, cost = nums[0], nums[1] + nums[2]
    want = 'It is more than enough' if money > cost else 'It is exactly enough' if money == cost else 'It is not enough'
    return eq_text(opts, want)


# ---- measurement: typical sizes are the certifier's own reference table (SI metres / grams), see refNotes ----
LEN = {  # quantity -> typical size in metres
    'thickness of a ₹1 coin': 0.0017, 'length of an ant': 0.004, 'width of a pencil tip': 0.001, 'length of a grain of rice': 0.006,
    'thickness of a notebook cover': 0.0008, 'length of a mosquito': 0.005, 'thickness of a fingernail': 0.0005,
    'width of a mustard seed': 0.0015, 'gap between two teeth of a comb': 0.002, 'thickness of a bus pass card': 0.0008,
    'length of a pencil': 0.17, 'length of a notebook': 0.25, 'length of a hand span': 0.18, 'length of a shoe': 0.25,
    'length of a mango leaf': 0.2, 'length of a spoon': 0.18, 'length of a banana': 0.18, 'length of a stick of chalk': 0.08,
    'length of a mobile phone': 0.15, 'height of a water bottle': 0.25,
    'length of a classroom': 8, 'length of a saree': 5.5, 'length of a cricket pitch': 20.12, 'height of a coconut tree': 15,
    'length of a swimming pool': 25, 'length of a school corridor': 40, 'length of a bus': 12, 'length of a skipping rope': 2.5,
    'length of a wall of a house': 4, 'length of a running race on Sports Day': 100,
    'road from Chennai to Madurai': 460000, 'length of a long train journey': 800000, 'length of a marathon': 42195,
    'distance to the next town': 20000, 'river Kaveri': 800000, 'length of a flight from Delhi to Mumbai': 1150000,
    'beach road along the coast of Chennai': 6000, 'length of a bus route across the city': 25000,
    'length of a cycle trip to the next village': 5000, 'road from Ooty to Coimbatore': 85000,
    # tool section
    'length of an eraser': 0.05, 'length of an envelope': 0.23, 'length of a door': 2, 'length of a bed': 2,
    'length of a playground': 80, 'length of a wall': 4, 'length of the road from Chennai to Madurai': 460000,
    'length of a bus trip to the next town': 25000, 'length of the drive from Salem to Erode': 60000,
    # estimate section
    'height of a classroom door': 2, 'height of a school bag': 0.45, 'height of a table': 0.75, 'height of a chair seat': 0.45,
    'length of a cricket bat': 0.85, 'length of a ruler': 0.30, 'a hand span': 0.18, 'hand span': 0.18, 'walk from one end of a street to the other': 200,
    'distance from Chennai to Bengaluru': 350000, 'width of a thumb': 0.02, 'thickness of a coin': 0.002, 'width of a door': 0.9,
    'walk from home to a nearby shop': 300, 'bus ride to the next town': 40000,
}
UNIT_M = {'mm': 0.001, 'cm': 0.01, 'm': 1, 'km': 1000}
FRAC = {'¼': 0.25, '½': 0.5, '¾': 0.75}


def _quantity(p, pat):
    m = re.search(pat, p)
    if not m:
        return None
    return re.sub(r'^the ', '', m.group(1).rstrip('?'))


def _best_len_unit(size):
    return 'mm' if size < 0.01 else 'cm' if size < 1 else 'm' if size < 1000 else 'km'


def _val_len(o):
    m = re.fullmatch(r'about ([\d.¼½¾]+) (mm|cm|m|km)', nm(o))
    if not m:
        return None
    v = FRAC.get(m.group(1)) or float(m.group(1))
    return v * UNIT_M[m.group(2)]


@judge('abunit', 'certifier-owned typical-size table: best unit = largest of mm/cm/m/km in which the size is >= 1; tool by magnitude (ruler < 0.5 m <= tape < 1 km <= odometer); estimate = option within a factor 2.5 of the typical size', assumptions='typical sizes are real-world approximations (see choice_pass_a.LEN)')
def abunit(q, opts):
    p = q['prompt']
    if p.startswith('Which unit is best'):
        key = _quantity(p, r'measuring (.+)$')
        if key not in LEN:
            return Unsupported(f'no typical size for {key!r}')
        return [nm(o) == _best_len_unit(LEN[key]) for o in opts]
    if p.startswith('Which tool is best'):
        key = _quantity(p, r'measuring (.+)$')
        if key not in LEN:
            return Unsupported(f'no typical size for {key!r}')
        s = LEN[key]
        tool = 'a 30 cm ruler' if s < 0.5 else 'a measuring tape (metre tape)' if s < 1000 else 'the odometer (distance meter) of the vehicle'
        return eq_text(opts, tool)
    if p.startswith('Which is the most sensible estimate'):
        key = _quantity(p, r'estimate of (.+)$')
        if key not in LEN:
            return Unsupported(f'no typical size for {key!r}')
        s = LEN[key]
        out = []
        for o in opts:
            v = _val_len(o)
            out.append(v is not None and 1 / 2.5 <= v / s <= 2.5)
        return out
    return Unsupported('unparsed prompt')


WT = {  # grams
    'the medicine in one small tablet': 0.5, 'a grain of salt': 0.0001, 'a mosquito': 0.0025, 'a strand of hair': 0.00005, 'a grain of rice': 0.025,
    'an ant': 0.003, 'a pinch of saffron': 0.05, 'a small feather': 0.1, 'an egg': 50, 'a pencil': 5, 'a letter in an envelope': 5,
    'a tomato': 100, 'a packet of biscuits': 100, 'a ₹10 coin': 8, 'a banana': 120, 'a pen': 10, 'a sack of rice': 50000, 'a watermelon': 4000,
    'a school bag': 3000, 'a child of 8': 25000, 'a bicycle': 15000, 'a goat': 30000, 'a bag of cement': 50000, 'a cooking gas cylinder': 30000,
    'a bag of rice for a family': 25000, 'a mango': 250, 'a new-born baby': 3000, 'a coconut': 1000, 'a packet of salt': 1000,
    'a pumpkin': 5000, 'a brick': 3000, 'a dictionary': 1000, 'a cricket ball': 160, 'a bucket of water': 10000, 'a laptop': 2000,
    'a slice of bread': 30,
}
WU = {'mg': 0.001, 'g': 1, 'kg': 1000}


@judge('abwunit', 'certifier-owned typical-weight table: best unit = mg if < 1 g, g if < 1 kg else kg; sensible = within a factor 5; estimate = option within a factor 2.5', assumptions='typical weights are real-world approximations (see choice_pass_a.WT)')
def abwunit(q, opts):
    p = q['prompt']
    m = re.fullmatch(r'Which unit is best for the weight of (.+): milligrams \(mg\), grams \(g\) or kilograms \(kg\)\?', p)
    if m:
        if m.group(1) not in WT:
            return Unsupported(f'no typical weight for {m.group(1)!r}')
        w = WT[m.group(1)]
        return [nm(o) == ('mg' if w < 1 else 'g' if w < 1000 else 'kg') for o in opts]
    m = re.fullmatch(r'A record says that (.+) weighs ([\d.]+) (mg|g|kg)\. Is this weight sensible\?', p)
    if m:
        if m.group(1) not in WT:
            return Unsupported(f'no typical weight for {m.group(1)!r}')
        r = float(m.group(2)) * WU[m.group(3)] / WT[m.group(1)]
        want = 'Sensible' if 0.2 <= r <= 5 else 'Too heavy to be true' if r > 5 else 'Too light to be true'
        return eq_text(opts, want)
    m = re.fullmatch(r'About how heavy is (.+)\?', p)
    if m:
        if m.group(1) not in WT:
            return Unsupported(f'no typical weight for {m.group(1)!r}')
        out = []
        for o in opts:
            mm = re.fullmatch(r'about ([\d.]+) (mg|g|kg)', nm(o))
            out.append(bool(mm) and 0.4 <= float(mm.group(1)) * WU[mm.group(2)] / WT[m.group(1)] <= 2.5)
        return out
    return Unsupported('unparsed prompt')


def _len_mm(s):
    tot = Fraction(0)
    for n, u in re.findall(r'(\d+) (km|m|cm|mm)', s):
        tot += int(n) * {'km': 1000000, 'm': 1000, 'cm': 10, 'mm': 1}[u]
    return tot


@judge('acmcmp', 'convert both lengths to mm exactly and compare')
def acmcmp(q, opts):
    m = re.fullmatch(r'Which is longer: (.+) or (.+)\?', q['prompt'])
    if not m:
        return Unsupported('unparsed prompt')
    a, b = m.group(1), m.group(2)
    x, y = _len_mm(a), _len_mm(b)
    want = 'They are the same length' if x == y else (f'{a} is longer' if x > y else f'{b} is longer')
    return eq_text(opts, want)


@judge('adbartf', 'evaluate the statement on the bar values in the figure (comparison / difference / total statements)')
def adbartf(q, opts):
    f = q['figure']
    labs = [l.lower() for l in f['labels']]
    vals = f['values']
    s = re.search(r'"(.*)"', q['prompt']).group(1).rstrip('.')
    def val(word):
        w = word.lower()
        for l, v in zip(labs, vals):
            if w == l or w == l + 's' or w == l + 'es':
                return v
        raise KeyError(word)
    truth = None
    m = re.fullmatch(r'More children like (\w+) best than (\w+)', s)
    if m: truth = val(m.group(1)) > val(m.group(2))
    m = m or re.fullmatch(r'(\w+) read more books than (\w+)', s)
    if m and truth is None: truth = val(m.group(1)) > val(m.group(2))
    if truth is None:
        m = re.fullmatch(r'More (\w+) than (\w+) were (?:seen|passed)', s)
        if m: truth = val(m.group(1)) > val(m.group(2))
    if truth is None:
        m = re.fullmatch(r'(\d+) more child(?:ren)? likes? (\w+) best than (\w+)', s)
        if m: truth = val(m.group(2)) - val(m.group(3)) == int(m.group(1))
    if truth is None:
        m = re.fullmatch(r'(\w+) read (\d+) books? more than (\w+)', s)
        if m: truth = val(m.group(1)) - val(m.group(3)) == int(m.group(2))
    if truth is None:
        m = re.fullmatch(r'(\d+) more (\w+) than (\w+) (?:were|was) (?:seen|passed)', s)
        if m: truth = val(m.group(2)) - val(m.group(3)) == int(m.group(1))
    if truth is None:
        m = re.fullmatch(r'(?:The four friends read )?(\d+) (?:children were asked|books in all|birds were seen|vehicles were passed)(?: in all)?', s)
        if m: truth = sum(vals) == int(m.group(1))
    if truth is None:
        m = re.fullmatch(r'The four friends read (\d+) books in all', s)
        if m: truth = sum(vals) == int(m.group(1))
    if truth is None:
        return Unsupported(f'unparsed statement {s!r}')
    return eq_text(opts, 'True' if truth else 'False')


def _secs(s):
    mm = re.fullmatch(r'(?:(\d+) min)? ?(?:(\d+) s)?', s.strip())
    return int(mm.group(1) or 0) * 60 + int(mm.group(2) or 0)


@judge('adrace', 'parse each time to seconds; fastest = minimum, slowest = maximum; time-unit items by certifier-owned typical durations')
def adrace(q, opts):
    p = q['prompt']
    m = re.fullmatch(r'In a running race, (.+)\. Who was the (fastest|slowest)\?', p)
    if m:
        ts = re.findall(r'(\w+) took ((?:\d+ min)? ?(?:\d+ s)?)(?:,|$)', m.group(1) + ',')
        if len(ts) != 3:
            return Unsupported('unparsed times')
        secs = [(n, _secs(t)) for n, t in ts]
        vals = [t for _, t in secs]
        best = min(vals) if m.group(2) == 'fastest' else max(vals)
        if vals.count(best) != 1:
            return Ambiguous('tie for fastest/slowest')
        return [nm(o) == [n for n, t in secs if t == best][0] for o in opts]
    m = re.fullmatch(r'Which unit is best for measuring how long it takes to (.+)\?', p)
    if m:
        D = {'clap your hands once': 0.5, 'brush your teeth': 120, 'sleep at night': 28800, 'run 100 metres': 18, 'cook a pot of rice': 1200,
             'finish a whole school day': 25200, 'tie your shoelaces': 15, 'watch a full film': 9000, 'boil an egg': 600, 'clap your hands ten times': 5,
             'walk one kilometre': 720, 'travel from Chennai to Madurai by train': 25200, 'drink a glass of water': 10, 'have a bath': 900,
             'play one day of a test match': 21600, 'write your name': 5, 'eat your lunch': 1200, 'make one kabaddi raid': 20,
             'cycle to a school 2 km away': 600, 'fly from Chennai to Delhi': 10000, 'jump over a skipping rope once': 1}
        if m.group(1) not in D:
            return Unsupported(f'no typical duration for {m.group(1)!r}')
        t = D[m.group(1)]
        return [nm(o) == ('seconds' if t < 60 else 'minutes' if t < 3600 else 'hours') for o in opts]
    return Unsupported('unparsed prompt')


@judge('aewcmp', 'convert both sides to the smallest unit exactly (Fractions) and compare')
def aewcmp(q, opts):
    m = re.fullmatch(r'Which sign goes in the box: (.+) ☐ (.+)\. Choose <, = or >\.', q['prompt'].rstrip('?'))
    if not m:
        m = re.fullmatch(r'Which sign goes in the box: (.+) ☐ (.+)\? Choose <, = or >\.', q['prompt'])
    if not m:
        return Unsupported('unparsed prompt')
    U = {'kg': 1000000, 'g': 1000, 'mg': 1}
    def mg(s):
        return sum(int(n) * U[u] for n, u in re.findall(r'(\d+) (kg|g|mg)', s))
    a, b = mg(m.group(1)), mg(m.group(2))
    return eq_text(opts, '<' if a < b else '=' if a == b else '>')


def _eval_expr(s):
    s = nm(s).replace('×', '*').replace('÷', '/')
    if not re.fullmatch(r'[\d+\-*/() ]+', s):
        raise ValueError(s)
    s = re.sub(r'\d+', lambda m: f'Fraction({m.group(0)})', s)
    return eval(s, {'Fraction': Fraction})


@judge('ajcmpx', 'evaluate both sides exactly with Fractions (left-to-right standard precedence) and compare')
def ajcmpx(q, opts):
    m = re.search(r'which sign goes in the box: (.+?) □ (.+)$', q['prompt'])
    if not m:
        return Unsupported('unparsed prompt')
    a, b = _eval_expr(m.group(1)), _eval_expr(m.group(2))
    return eq_text(opts, '<' if a < b else '=' if a == b else '>')


def _pf(expr):
    n = 1
    for base, ex in re.findall(r'(\d+)([⁰¹²³⁴⁵⁶⁷⁸⁹]*)', expr):
        n *= int(base) ** (int(unsup(ex)) if ex else 1)
    return n


@judge('ajpfdc', 'multiply out both factorisations and test divisibility / gcd directly')
def ajpfdc(q, opts):
    m = re.search(r'A = (.+?) and B = (.+?)\. Using', q['prompt'])
    if not m:
        return Unsupported('unparsed prompt')
    A, B = _pf(m.group(1)), _pf(m.group(2))
    g = math.gcd(A, B)
    truth = {
        'A is divisible by B': A % B == 0,
        'B is divisible by A': B % A == 0,
        'A and B are co-prime (their only common factor is 1)': g == 1,
        'A and B have a common factor greater than 1, but neither is divisible by the other': g > 1 and A % B != 0 and B % A != 0,
    }
    try:
        return [truth[nm(o)] for o in opts]
    except KeyError:
        return Unsupported('unknown option text')


# ---- ajprop: structural classification of the stated identity ----
def _tok(s):
    s = nm(s)
    return re.findall(r'\d+/\d+|\d+|[()+×=]|-', s)


def _parse(s):
    toks = []
    s = nm(s).replace(' ', '')
    i = 0
    while i < len(s):
        mm = re.match(r'-?\d+(?:/\d+)?', s[i:])
        if mm and (mm.group(0)[0] != '-' or not toks or toks[-1] in ('(', '+', '×', '=')):
            toks.append(mm.group(0)); i += len(mm.group(0))
        else:
            toks.append(s[i]); i += 1
    pos = [0]
    def peek():
        return toks[pos[0]] if pos[0] < len(toks) else None
    def eat():
        pos[0] += 1; return toks[pos[0] - 1]
    def expr():
        l = term()
        while peek() == '+':
            eat(); l = ('+', l, term())
        return l
    def term():
        l = atom()
        while peek() == '×':
            eat(); l = ('×', l, atom())
        return l
    def atom():
        t = eat()
        if t == '(':
            e = expr(); assert eat() == ')'; return e
        return ('n', Fraction(t))
    e = expr()
    assert pos[0] == len(toks), s
    return e


def _val(t):
    if t[0] == 'n':
        return t[1]
    a, b = _val(t[1]), _val(t[2])
    return a + b if t[0] == '+' else a * b


def _props(stmt):
    L, R = stmt.split('=')
    l, r = _parse(L), _parse(R)
    props = set()
    if _val(l) != _val(r):
        return None
    op = l[0]
    if op != 'n' and r[0] == op and l[1] == r[2] and l[2] == r[1] and l[1] != l[2]:
        props.add('Commutative property')
    if op != 'n' and r[0] == op and l[1][0] == op and r[2][0] == op and l[1][1] == r[1] and l[1][2] == r[2][1] and l[2] == r[2][2]:
        props.add('Associative property')
    if op == '×' and l[2][0] == '+' and r[0] == '+' and r[1][0] == '×' and r[2][0] == '×' and r[1][1] == l[1] == r[2][1] and r[1][2] == l[2][1] and r[2][2] == l[2][2]:
        props.add('Distributive property')
    if op == '+' and r[0] == 'n' and l[2] == ('n', Fraction(0)) and l[1] == r:
        props.add('Additive identity (adding 0)')
    if op == '×' and r[0] == 'n' and l[2] == ('n', Fraction(1)) and l[1] == r:
        props.add('Multiplicative identity (multiplying by 1)')
    if op == '+' and r == ('n', Fraction(0)) and l[1][0] == 'n' and l[2][0] == 'n' and l[1][1] == -l[2][1]:
        props.add('Additive inverse')
    if op == '×' and r == ('n', Fraction(1)) and l[1][0] == 'n' and l[2][0] == 'n' and l[1][1] * l[2][1] == 1:
        props.add('Multiplicative inverse')
    return props


@judge('ajprop', 'parse both sides into expression trees and test the structural definition of each property (commutative, associative, distributive, identity, inverse); closure statements checked against the stated number set')
def ajprop(q, opts):
    s = q['prompt'].split('Which property does this statement show? ', 1)[1] if 'Which property does this statement show? ' in q['prompt'] else None
    if s is None:
        return Unsupported('unparsed prompt')
    m = re.fullmatch(r'(.+?) and (.+?) are (whole|rational) numbers, and (.+?) ([+×]) (.+?) = (.+?) is also a \3 number\.', nm(s))
    if m:
        a, b, kind, _, op, _, res = m.groups()
        a, b = fr(a), fr(b)
        r = a + b if op == '+' else a * b
        ok = fr(res) == r and (kind == 'rational' or (r.denominator == 1 and r >= 0 and a.denominator == 1 and b.denominator == 1 and a >= 0 and b >= 0))
        return ['Closure property' == nm(o) and ok for o in opts]
    try:
        props = _props(s)
    except Exception as e:  # noqa: BLE001
        return Unsupported(f'unparsed statement: {e}')
    if props is None:
        return Defect(f'statement {s!r} is not a true identity')
    return [nm(o) in props for o in opts]


@judge('ajrcmp', 'cross-multiplication with exact Fractions')
def ajrcmp(q, opts):
    m = re.fullmatch(r'Compare the ratios (\d+) : (\d+) and (\d+) : (\d+)\. Which statement is true\?', q['prompt'])
    if not m:
        return Unsupported('unparsed prompt')
    a, b, c, d = map(int, m.groups())
    x, y = Fraction(a, b), Fraction(c, d)
    A, B = f'{a} : {b}', f'{c} : {d}'
    want = f'{A} and {B} are equivalent' if x == y else f'{A} is greater than {B}' if x > y else f'{B} is greater than {A}'
    return eq_text(opts, want)


@judge('ajrcq', 'compare the exact rational values (common-denominator / Fraction)')
def ajrcq(q, opts):
    m = re.fullmatch(r'Compare (\S+) and (\S+)\. Which statement is true\?', nm(q['prompt']).replace('-', '−'))
    if not m:
        return Unsupported('unparsed prompt')
    A, B = m.group(1), m.group(2)
    x, y = fr(A), fr(B)
    want = f'{A} and {B} are equal' if x == y else f'{A} is greater than {B}' if x > y else f'{B} is greater than {A}'
    return [nm(o) == nm(want) for o in opts]


@judge('amdec', 'exact value of each printed expansion (finite or finite head plus the stated repeating block) compared with a/b')
def amdec(q, opts):
    m = re.fullmatch(r'Which of these is the decimal expansion of (\d+)/(\d+)\?', q['prompt'])
    if not m:
        return Unsupported('unparsed prompt')
    t = Fraction(int(m.group(1)), int(m.group(2)))
    out = []
    for o in opts:
        o = nm(o)
        mm = re.fullmatch(r'(\d+)\.(\d*)… \(the (\d+) repeats?\)', o)
        if mm:
            ip, fp, block = mm.group(1), mm.group(2), mm.group(3)
            # printed digits = fp, which ends with one copy of block; the pattern continues repeating that block
            if not fp.endswith(block):
                out.append(False); continue
            lead = fp[: len(fp) - len(block)]
            v = Fraction(int(ip + lead), 10 ** len(lead)) + Fraction(int(block), (10 ** len(block) - 1) * 10 ** len(lead))
            out.append(v == t)
        elif re.fullmatch(r'\d+(\.\d+)?', o):
            ip, _, fp = o.partition('.')
            out.append(Fraction(int(ip + fp), 10 ** len(fp)) == t)
        else:
            return Unsupported(f'unparsed option {o!r}')
    return out


def _irrational(o):
    o = nm(o)
    m = re.fullmatch(r'0\.(\d+)… \(the block (\d+) repeats\)', o)
    if m:
        return False  # a repeating decimal is rational
    e = o.replace('×', '*').replace('√', 'sqrt').replace('²', '**2')
    e = re.sub(r'sqrt(\d+)', r'sqrt(\1)', e)
    ex = sp.sympify(e)
    # independent confirmation: rational iff minimal polynomial has degree 1
    deg = sp.degree(sp.minimal_polynomial(ex, sp.Symbol('t')), sp.Symbol('t'))
    irr = deg > 1
    assert irr == bool(ex.is_irrational) or ex.is_irrational is None
    return irr


@judge('amirr', 'sympy: a number is irrational iff its minimal polynomial over Q has degree > 1 (cross-checked with is_irrational); repeating decimals are rational')
def amirr(q, opts):
    if q['prompt'] != 'Which one of these numbers is irrational?':
        return Unsupported('unparsed prompt')
    return [_irrational(o) for o in opts]


def _terminates_by_division(a, b):
    """long division: True iff the remainder reaches 0 (cycle detection otherwise)"""
    r = a % b
    seen = set()
    while r and r not in seen:
        seen.add(r)
        r = (r * 10) % b
    return r == 0


@judge('amterm', 'long division with remainder-cycle detection (a rational never has a non-repeating non-terminating expansion)')
def amterm(q, opts):
    m = re.search(r'expansion (\d+)/(\d+) has\.?$|has\.', q['prompt'])
    m = re.search(r'decimal expansion (\d+)/(\d+) has', q['prompt'])
    if not m:
        return Unsupported('unparsed prompt')
    a, b = int(m.group(1)), int(m.group(2))
    term = _terminates_by_division(a, b)
    T = 'It terminates (it stops after some digits).'
    R = 'It goes on for ever, with a block of digits that repeats.'
    N = 'It goes on for ever and never repeats.'
    truth = {T: term, R: not term, N: False}
    try:
        return [truth[nm(o)] for o in opts]
    except KeyError:
        return Unsupported('unknown option text')


@judge('ascpow', 'sympy exact power of the imaginary unit I**n')
def ascpow(q, opts):
    m = re.fullmatch(r'Simplify i([⁻⁰¹²³⁴⁵⁶⁷⁸⁹]+)\.', q['prompt'])
    if not m:
        return Unsupported('unparsed prompt')
    n = int(unsup(m.group(1)).replace('⁻', '-'))
    val = sp.simplify(sp.I ** n)
    names = {'1': 1, 'i': sp.I, '-1': -1, '-i': -sp.I}
    return [sp.simplify(names[nm(o)] - val) == 0 for o in opts]


@judge('anweek', 'day index arithmetic mod 7')
def anweek(q, opts):
    m = re.fullmatch(r'Today is (\w+)\. Which day of the week will it be (\d+) days from today\?', q['prompt'])
    if not m:
        return Unsupported('unparsed prompt')
    return eq_text(opts, DAYS_SUN[(DAYS_SUN.index(m.group(1)) + int(m.group(2))) % 7])


@judge('avdfact', 'a multiplication fact shows a/b=c iff it is arithmetically true and uses exactly the divisor and quotient as factors and the dividend as product')
def avdfact(q, opts):
    m = re.fullmatch(r'Which multiplication fact shows that (\d+) ÷ (\d+) = (\d+)\?', q['prompt'])
    if not m:
        return Unsupported('unparsed prompt')
    a, b, c = map(int, m.groups())
    if a != b * c:
        return Defect('stated division is false')
    out = []
    for o in opts:
        mm = re.fullmatch(r'(\d+) × (\d+) = (\d+)', nm(o))
        x, y, z = map(int, mm.groups())
        out.append(x * y == z and z == a and sorted((x, y)) == sorted((b, c)))
    return out


@judge('avdirv', 'x and y vary directly iff y/x is the same for every pair (exact Fractions, figure table is the data)')
def avdirv(q, opts):
    f = q['figure']
    xs = [Fraction(v) for v in f['head'][1:]]
    ys = [Fraction(v) for v in f['rows'][0][1:]]
    if f['head'][0] != 'x' or f['rows'][0][0] != 'y' or any(x == 0 for x in xs):
        return Unsupported('unexpected table layout')
    ratios = {y / x for x, y in zip(xs, ys)}
    want = 'Yes, x and y vary directly' if len(ratios) == 1 else 'No, x and y do not vary directly'
    return eq_text(opts, want)


@judge('avfold', 'coloured fraction is unchanged by further equal folds (a/b = a*k/(b*k)); option correct iff equal as a rational number; figure grid cross-checked')
def avfold(q, opts):
    m = re.search(r'folded into (\d+) equal strips and (\d+) of the strips (?:is|are) coloured, so (\d+)/(\d+) of the sheet is coloured.*cut into (\d+) equal parts', q['prompt'])
    if not m:
        return Unsupported('unparsed prompt')
    n, a, _, _, k = map(int, m.groups())
    f = q['figure']
    if Fraction(f['shaded'], f['rows'] * f['cols']) != Fraction(a, n) or f['rows'] * f['cols'] != n * k:
        return Defect('grid figure differs from the statement')
    return [fr(o) == Fraction(a, n) for o in opts]


@judge('avlike', 'like fractions have the same denominator as written')
def avlike(q, opts):
    if q['prompt'] != 'Which pair are like fractions?':
        return Unsupported('unparsed prompt')
    out = []
    for o in opts:
        m = re.fullmatch(r'(\d+)/(\d+) and (\d+)/(\d+)', nm(o))
        out.append(m.group(2) == m.group(4))
    return out


@judge('avprop', 'a, b, c, d are in proportion iff a*d == b*c (exact integers)')
def avprop(q, opts):
    m = re.fullmatch(r'Are (\d+), (\d+), (\d+) and (\d+) in proportion, in this order\?.*', q['prompt'])
    if not m:
        return Unsupported('unparsed prompt')
    a, b, c, d = map(int, m.groups())
    # cross-check with ratio equality a/b == c/d
    assert (a * d == b * c) == (Fraction(a, b) == Fraction(c, d))
    return eq_text(opts, 'Yes, they are in proportion' if a * d == b * c else 'No, they are not in proportion')


@judge('avvcmp', 'volume = product of the three stated edge counts; table figure cross-checked')
def avvcmp(q, opts):
    m = re.search(r'Box A .*?: (\d+) long, (\d+) wide and (\d+) high\. Box B .*?: (\d+) long, (\d+) wide and (\d+) high', q['prompt'])
    if not m:
        return Unsupported('unparsed prompt')
    v = list(map(int, m.groups()))
    f = q['figure']
    if [[int(c.split()[0]) for c in r[1:]] for r in f['rows']] != [v[:3], v[3:]]:
        return Defect('figure table differs from the statement')
    A, B = v[0] * v[1] * v[2], v[3] * v[4] * v[5]
    return eq_text(opts, 'Both boxes have the same volume' if A == B else 'Box A has the greater volume' if A > B else 'Box B has the greater volume')
