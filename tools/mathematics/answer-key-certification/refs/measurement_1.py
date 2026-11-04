"""measurement slice, part 1: aa* (early measurement, calendar, money, comparison) and ab* families.
Every answer is derived from the question statement and, where the statement refers to the picture, from the figure data
(the figure is part of the statement). No production code, no stored answer, no generator parameters are used."""
import calendar
import datetime
import itertools
import re
from fractions import Fraction

from kit import ref, Expect, Verdict, Unsupported, Ambiguous
from refs.measurement_util import (nums, MONTHS, DAYS, ABBR, month_no, sun_weekday, calendar_problems, fmt, dec)

ORD = {'first': 1, 'second': 2, 'third': 3, 'fourth': 4, 'fifth': 5}


def ints(s):
    return [int(x) for x in nums(s)]


def mon_in(s):
    return [m for m in MONTHS if re.search(r'\b' + m + r'\b', s)]


# ---------------------------------------------------------------- age / calendar
@ref('aaage', 'enumerate the birthdays n = 1, 2, ... that fall on or before the later date (datetime), count them', 'exhaustive')
def aaage(q):
    m = re.search(r'born on (\d+)/(\d+)/(\d+).*? on (\d+)/(\d+)/(\d+), in completed', q['prompt'])
    d1, m1, y1, d2, m2, y2 = map(int, m.groups())
    b, t = datetime.date(y1, m1, d1), datetime.date(y2, m2, d2)
    n = 0
    y = y1 + 1
    while True:
        try:
            ann = datetime.date(y, m1, d1)
        except ValueError:
            ann = datetime.date(y, m1, 28) + datetime.timedelta(days=1)
        if ann <= t:
            n += 1
            y += 1
        else:
            break
    return Expect(str(n))


def cal_fig(q):
    probs, (yr, mo) = calendar_problems(q['figure'])
    return probs, yr, mo


@ref('aacalc', 'count dates of the month with the weekday by enumeration (datetime); the drawn calendar is also checked against datetime', 'exhaustive')
def aacalc(q):
    probs, yr, mo = cal_fig(q)
    if probs:
        return Verdict(False, 'figure: ' + '; '.join(probs[:2]))
    m = re.search(r'calendar for (\w+) (\d+)\. How many (\w+?)s are there', q['prompt'])
    assert (month_no(m.group(1)), int(m.group(2))) == (mo, yr), 'prompt month != figure month'
    wd = DAYS.index(m.group(3))
    n = sum(1 for d in range(1, calendar.monthrange(yr, mo)[1] + 1) if sun_weekday(datetime.date(yr, mo, d)) == wd)
    return Expect(str(n))


@ref('aacald', 'list the dates of the month with the weekday (datetime) and take the n-th; drawn calendar checked against datetime', 'exhaustive')
def aacald(q):
    probs, yr, mo = cal_fig(q)
    if probs:
        return Verdict(False, 'figure: ' + '; '.join(probs[:2]))
    m = re.search(r'calendar for (\w+) (\d+)\. What is the date of the (\w+) (\w+)\?', q['prompt'])
    assert (month_no(m.group(1)), int(m.group(2))) == (mo, yr)
    k, wd = ORD[m.group(3)], DAYS.index(m.group(4))
    ds = [d for d in range(1, calendar.monthrange(yr, mo)[1] + 1) if sun_weekday(datetime.date(yr, mo, d)) == wd]
    if k > len(ds):
        return Ambiguous(f'there is no {m.group(3)} {m.group(4)} in this month (only {len(ds)})')
    return Expect(str(ds[k - 1]))


@ref('aacalgap', 'date subtraction with datetime; drawn calendar checked against datetime', 'exhaustive')
def aacalgap(q):
    probs, yr, mo = cal_fig(q)
    if probs:
        return Verdict(False, 'figure: ' + '; '.join(probs[:2]))
    m = re.search(r'Today is (\d+) (\w+) (\d+)\..*? is on (\d+) (\w+)\.', q['prompt'])
    d1, mn1, y1, d2, mn2 = int(m.group(1)), month_no(m.group(2)), int(m.group(3)), int(m.group(4)), month_no(m.group(5))
    assert (mn1, y1) == (mo, yr)
    return Expect(str((datetime.date(y1, mn2, d2) - datetime.date(y1, mn1, d1)).days))


@ref('aacalmo', 'date subtraction with datetime in the year of the drawn calendar (December rolls into the next year); calendar checked', 'exhaustive')
def aacalmo(q):
    probs, yr, mo = cal_fig(q)
    if probs:
        return Verdict(False, 'figure: ' + '; '.join(probs[:2]))
    m = re.search(r'Today is (\d+) (\w+)\..*? is on (\d+) (\w+)\.', q['prompt'])
    d1, mn1, d2, mn2 = int(m.group(1)), month_no(m.group(2)), int(m.group(3)), month_no(m.group(4))
    assert mn1 == mo
    y2 = yr + (1 if mn2 < mn1 else 0)
    return Expect(str((datetime.date(y2, mn2, d2) - datetime.date(yr, mn1, d1)).days))


# ---------------------------------------------------------------- non-standard units, money pictures
@ref('aaclip', 'unit jumps between the two dots counted on the figure; prompt endpoints must agree with the figure', 'exhaustive')
def aaclip(q):
    a, b = ints(q['prompt'].split('starts')[1])[:2]
    f = q['figure']
    if f['marks'] != [a, b]:
        return Verdict(False, f'figure marks {f["marks"]} differ from the statement {a}, {b}')
    return Expect(str(len(f['jumps'])) if f['jumps'] == [[i, i + 1] for i in range(a, b)] else str(b - a))


@ref('aacoin', 'maximum / minimum / count over the coins drawn in the picture', 'exhaustive')
def aacoin(q):
    items = q['figure']['items']
    p = q['prompt']
    if 'worth the most' in p:
        return Expect(str(max(items)))
    if 'worth the least' in p:
        return Expect(str(min(items)))
    m = re.search(r'How many ₹(\d+) (coins|notes) are in the picture', p)
    v = int(m.group(1))
    return Expect(str(sum(1 for i in items if i == v)))


def table_nums(fig, col=1):
    return {int(r[0]): int(r[col]) for r in fig['rows']}


@ref('aacups', 'read the capacities from the table; largest / smallest', 'exhaustive')
def aacups(q):
    t = table_nums(q['figure'])
    most = 'holds the most' in q['prompt']
    v = max(t.values()) if most else min(t.values())
    w = [k for k, x in t.items() if x == v]
    if len(w) != 1:
        return Ambiguous(f'tie {w}')
    return Expect(str(w[0]))


ACT_DUR = {'tie your shoelaces': 10, 'brush your teeth': 120, 'eat lunch': 1500, 'watch a film': 7200, 'sleep at night': 8 * 3600,
           'a school week, Monday to Friday': 5 * 86400, 'the summer holidays': 60 * 86400}


@ref('aadur', 'rank the activities by a typical duration (own scale: laces 10 s < teeth 2 min < lunch 25 min < film 2 h < night sleep 8 h < school week 5 d < holidays 2 months)', 'exhaustive',
     assumptions='typical durations are my own common-sense scale, only their order matters')
def aadur(q):
    rows = q['figure']['rows']
    d = {int(r[0]): ACT_DUR[r[1]] for r in rows}
    v = max(d.values()) if 'longest' in q['prompt'] else min(d.values())
    w = [k for k, x in d.items() if x == v]
    return Expect(str(w[0])) if len(w) == 1 else Ambiguous(f'tie {w}')


def bar_lab(fig):
    return {int(re.search(r'\d+', l).group()): v for l, v in zip(fig['labels'], fig['values'])}


@ref('aaheavy', 'cube counts read from the balance chart; largest / smallest', 'exhaustive')
def aaheavy(q):
    t = bar_lab(q['figure'])
    v = max(t.values()) if 'heaviest' in q['prompt'] else min(t.values())
    w = [k for k, x in t.items() if x == v]
    return Expect(str(w[0])) if len(w) == 1 else Ambiguous(f'tie {w}')


@ref('aaheavyo', 'all permutations of the three items, keep those consistent with every balance statement in the table; the order must be unique', 'exhaustive')
def aaheavyo(q):
    rel = []
    for _, txt in q['figure']['rows']:
        m = re.fullmatch(r'\w+ (\d) is (heavier|lighter) than \w+ (\d)', txt)
        a, b = int(m.group(1)), int(m.group(3))
        rel.append((a, b) if m.group(2) == 'heavier' else (b, a))  # (heavier, lighter)
    ok = []
    for perm in itertools.permutations([1, 2, 3]):  # lightest -> heaviest
        pos = {x: i for i, x in enumerate(perm)}
        if all(pos[h] > pos[l] for h, l in rel):
            ok.append(perm)
    asc = 'lightest to the heaviest' in q['prompt']
    assert asc or 'heaviest to the lightest' in q['prompt']
    if len(ok) != 1:
        return Ambiguous(f'{len(ok)} orders fit the two balances')
    o = ok[0] if asc else ok[0][::-1]
    return Expect(', '.join(map(str, o)))


@ref('aalong', 'bar heights from the picture; largest / smallest', 'exhaustive')
def aalong(q):
    t = bar_lab(q['figure'])
    v = max(t.values()) if re.search(r'longest|tallest', q['prompt']) else min(t.values())
    w = [k for k, x in t.items() if x == v]
    return Expect(str(w[0])) if len(w) == 1 else Ambiguous(f'tie {w}')


@ref('aamake', 'amount remaining divided by the coin value (checked to be exact and against the table)', 'exhaustive')
def aamake(q):
    p = q['prompt']
    rows = {r[0]: int(r[1].replace('₹', '')) for r in q['figure']['rows']}
    m = re.match(r'How many ₹(\d+) coins make ₹(\d+)\?', p)
    if m:
        a, b = int(m.group(1)), int(m.group(2))
        if rows['Each small coin'] != a or rows['Amount to pay'] != b:
            return Verdict(False, 'table differs from statement')
        return Expect(str(b // a)) if b % a == 0 else Ambiguous('not a whole number of coins')
    m = re.search(r'has to pay ₹(\d+)\. \w+ gives one ₹(\d+) (?:coin|note) and then some ₹(\d+) coins', p)
    P, a, b = map(int, m.groups())
    if rows['Each small coin'] != b or rows['Amount to pay'] != P:
        return Verdict(False, 'table differs from statement')
    return Expect(str((P - a) // b)) if (P - a) % b == 0 and P > a else Ambiguous('remaining amount not a whole number of coins')


@ref('aamdays', 'calendar / datetime for month and year lengths; direct arithmetic for the unit conversions', 'exhaustive')
def aamdays(q):
    p = q['prompt']
    if (m := re.fullmatch(r'How many days are there in (\w+) (\d+)\?', p)):
        return Expect(str(calendar.monthrange(int(m.group(2)), month_no(m.group(1)))[1]))
    if (m := re.fullmatch(r'How many days are there in the year (\d+)\?', p)):
        return Expect(str(366 if calendar.isleap(int(m.group(1))) else 365))
    if (m := re.fullmatch(r'How many days are there in (\w+) and (\w+) (\d+) together\?', p)):
        y = int(m.group(3))
        return Expect(str(calendar.monthrange(y, month_no(m.group(1)))[1] + calendar.monthrange(y, month_no(m.group(2)))[1]))
    if (m := re.fullmatch(r'How many months are there in (\d+) years? and (\d+) months?\?', p)):
        return Expect(str(sum(12 for _ in range(int(m.group(1)))) + int(m.group(2))))
    if (m := re.fullmatch(r'How many days are there in (\d+) weeks? and (\d+) days?\?', p)):
        return Expect(str(7 * int(m.group(1)) + int(m.group(2))))
    if (m := re.fullmatch(r'How many full weeks are there in (?:a year of )?(\d+) days\?', p)):
        n = int(m.group(1))
        return Expect(str(sum(1 for k in range(1, n + 1) if 7 * k <= n)))
    raise ValueError('unrecognised ' + p)


@ref('aamoney', 'sum of the values of the coins and notes drawn', 'exhaustive')
def aamoney(q):
    return Expect(str(sum(q['figure']['items'])))


@ref('aaorder', 'sort the bar heights; ties are ambiguous', 'exhaustive')
def aaorder(q):
    t = bar_lab(q['figure'])
    if len(set(t.values())) != len(t):
        return Ambiguous('equal heights')
    asc = re.search(r'from the (?:shortest|tallest) to the (?:longest|tallest)|from the shortest to', q['prompt']) is not None
    asc = 'from the shortest to' in q['prompt']
    assert asc or re.search(r'from the (longest|tallest) to the shortest', q['prompt'])
    order = sorted(t, key=lambda k: t[k], reverse=not asc)
    return Expect(', '.join(map(str, order)))


DAYPART = {'wakes up': 0, 'eats breakfast': 1, 'goes to school': 2, 'eats lunch at school': 3, 'comes back home': 4,
           'plays outside after coming home, before dinner': 5, 'eats dinner': 6, 'goes to bed': 7}


@ref('aaseq', 'order the day-activities by their time of day (own scale: wakes up, breakfast, school, lunch at school, back home, play, dinner, bed)', 'exhaustive')
def aaseq(q):
    d = {int(r[0]): DAYPART[r[1]] for r in q['figure']['rows']}
    return Expect(', '.join(map(str, sorted(d, key=lambda k: d[k]))))


# ---------------------------------------------------------------- ab*
@ref('abchange', 'payment minus price', 'exhaustive')
def abchange(q):
    cost = ints(q['prompt'].split('costs')[1])[0]
    pay = q['figure']['items']
    m = re.search(r'pay with the ₹(\d+) ', q['prompt'])
    if len(pay) != 1 or pay[0] != int(m.group(1)):
        return Verdict(False, 'picture and statement disagree on the coin/note paid')
    return Expect(str(pay[0] - cost))


@ref('abclock', 'time read from the clock figure data (hour, minute)', 'exhaustive')
def abclock(q):
    f = q['figure']
    return Expect(f'({f["h"]}, {f["m"]})')


@ref('abcost', 'sum of the two prices; the table must agree', 'exhaustive')
def abcost(q):
    a, b = ints(q['prompt'])[:2]
    t = [int(r[1].replace('₹', '')) for r in q['figure']['rows']]
    if t != [a, b]:
        return Verdict(False, 'table prices differ from statement')
    return Expect(str(a + b))


@ref('abcup', 'read the bar chart (labels Bucket, Pot, Jug) and subtract / read off', 'exhaustive')
def abcup(q):
    f = q['figure']
    d = {l.lower(): v for l, v in zip(f['labels'], f['values'])}
    p = q['prompt']
    if (m := re.search(r'How many more cups does the (\w+) hold than the (\w+)\?', p)):
        return Expect(str(d[m.group(1)] - d[m.group(2)]))
    m = re.search(r'How many cups does the (\w+) hold\?', p)
    return Expect(str(d[m.group(1)]))


@ref('abcupord', 'sort containers by cups held (the height column is irrelevant); ties ambiguous', 'exhaustive')
def abcupord(q):
    d = {int(r[0]): int(r[3]) for r in q['figure']['rows']}
    if len(set(d.values())) != len(d):
        return Ambiguous('equal capacities')
    most_first = 'holds the most to the one that holds the least' in q['prompt']
    assert most_first or 'holds the least to the one that holds the most' in q['prompt']
    return Expect(', '.join(map(str, sorted(d, key=lambda k: d[k], reverse=most_first))))


@ref('abdisp', 'water-level difference = volume (1 ml = 1 cm3); marks in the figure must agree with the statement', 'exhaustive')
def abdisp(q):
    p = q['prompt']
    n = ints(p)
    marks = q['figure']['marks']
    if 'To which mark' in p:
        start, vol = n[0], n[1]
        if marks[0] != start:
            return Verdict(False, 'figure mark differs from the statement')
        return Expect(str(start + vol))
    if 'one marble' in p:
        start, k, end = n[0], n[1], n[2]
        if marks != [start, end]:
            return Verdict(False, 'figure marks differ from the statement')
        return Expect(str(Fraction(end - start, k)))
    start, end = n[0], n[1]
    if marks != [start, end]:
        return Verdict(False, 'figure marks differ from the statement')
    return Expect(str(end - start))


@ref('abjug', 'read the dot on the jug scale; capacity minus level', 'exhaustive')
def abjug(q):
    p = q['prompt']
    cap = ints(p)[0]
    f = q['figure']
    if f['to'] != cap:
        return Verdict(False, 'scale end differs from the stated jug size')
    lvl = f['marks'][0]
    if 'How much more water' in p:
        tgt = ints(p.split('fill the jug to')[1])[0]
        return Expect(str(tgt - lvl))
    return Expect(str(lvl))


def mass_g(txt):
    tot = 0
    for part in txt.split('+'):
        v, u = part.split()
        tot += int(v) * {'g': 1, 'kg': 1000}[u]
    return tot


@ref('abkg', 'sum of the masses on the other pan (kg = 1000 g)', 'exhaustive')
def abkg(q):
    return Expect(str(mass_g(q['figure']['right'])))


@ref('abkgg', 'integer division of the grams by 1000 (divmod)', 'exhaustive')
def abkgg(q):
    g = ints(q['prompt'])[0]
    return Expect(f'({g // 1000}, {g % 1000})')


@ref('ablen', 'length = end mark - start mark (ruler figure checked)', 'exhaustive')
def ablen(q):
    p = q['prompt']
    a, b = ints(p.split('One end is at')[1])[:2]
    if q['figure']['marks'] != [a, b]:
        return Verdict(False, 'figure marks differ from statement')
    return Expect(str(b - a))


def tape_val(s):
    s = s.strip()
    tot = Fraction(0)
    for ch, v in (('¼', Fraction(1, 4)), ('½', Fraction(1, 2)), ('¾', Fraction(3, 4))):
        if ch in s:
            tot += v
            s = s.replace(ch, '')
    s = s.strip()
    return tot + (int(s) if s else 0)


@ref('abmeas', 'end mark minus start mark on the tape (quarters read from ¼ ½ ¾ in the statement); figure marks compared', 'exhaustive')
def abmeas(q):
    p = q['prompt']
    if 'marked in millimetres' in p:
        # ruler near its tip: labelled numbers are centimetres, ticks every 0.1 cm = 1 mm; the pencil starts at 0
        tip = Fraction(str(q['figure']['marks'][0]))
        return Expect(str(tip * 10))
    m = re.search(r'(?:starts at|It starts at the dot at) ?(?:the )?([\d¼½¾]+) m(?: mark)? and ends at (?:the )?(?:dot at )?([\d¼½¾]+) m', p)
    a, b = tape_val(m.group(1)), tape_val(m.group(2))
    fm = [Fraction(str(x)) for x in q['figure']['marks']]
    if fm != [a, b]:
        return Verdict(False, f'figure marks {fm} differ from statement {a}, {b}')
    return Expect(dec(b - a))


@ref('abminute', 'minutes read from the clock figure; complement to 60 when asked how many are left; unit conversions by arithmetic', 'exhaustive')
def abminute(q):
    p = q['prompt']
    if q.get('figure'):
        f = q['figure']
        hh = ints(p.split('between')[1])[0]
        if f['h'] != hh:
            return Verdict(False, 'clock hour differs from statement')
        return Expect(str(60 - f['m'] if 'left until' in p else f['m']))
    if (m := re.fullmatch(r'How many minutes are there in (\d+) quarters? of an hour\?', p)):
        return Expect(str(15 * int(m.group(1))))
    if (m := re.fullmatch(r'How many minutes are there in (\d+) and a half hours\?', p)):
        return Expect(str(60 * int(m.group(1)) + 30))
    if (m := re.fullmatch(r'How many minutes are there in (\d+) and a quarter hours\?', p)):
        return Expect(str(60 * int(m.group(1)) + 15))
    if (m := re.fullmatch(r'How many minutes are there in (\d+) and three quarters hours\?', p)):
        return Expect(str(60 * int(m.group(1)) + 45))
    raise ValueError(p)


@ref('abneed', 'price minus the value of the coins drawn (checked not already enough)', 'exhaustive')
def abneed(q):
    cost = ints(q['prompt'].split('costs')[1])[0]
    have = sum(q['figure']['items'])
    return Expect(str(cost - have)) if cost > have else Ambiguous('money already enough: the question presupposes it is not')


# ---------------------------------------------------------------- choice (lettered options are not in the export)
NOOPT = 'multiple-choice letter: the option texts and their order are not in the exported data (typed form has only the letter), so the keyed letter cannot be checked'


@ref('aaday', 'choice: letter cannot be checked (options not exported); the calendar picture is checked against datetime', 'exhaustive')
def aaday(q):
    probs, yr, mo = cal_fig(q)
    if probs:
        return Verdict(False, 'figure: ' + '; '.join(probs[:2]))
    m = re.search(r'calendar for (\w+) (\d+)\. On which day of the week is (\d+) (\w+)\?', q['prompt'])
    if (month_no(m.group(1)), int(m.group(2)), month_no(m.group(4))) != (mo, yr, mo):
        return Verdict(False, 'statement month/year differ from the picture')
    return Unsupported(NOOPT)


@ref('aaddmm', 'choice: not checkable (options not exported)', 'exhaustive')
def aaddmm(q):
    return Unsupported(NOOPT)


IMD = {'Winter': [1, 2], 'Summer': [3, 4, 5], 'Monsoon (rainy season)': [6, 7, 8, 9], 'Post-monsoon': [10, 11, 12]}


@ref('aaseason', 'choice: letter not checkable; the seasons table is compared with the IMD four-season division', 'exhaustive')
def aaseason(q):
    got = {}
    for s, mm in q['figure']['rows']:
        got[s] = [month_no(x.strip()) for x in mm.split(',')]
    if got != IMD:
        return Verdict(False, f'seasons table {got} differs from the IMD division')
    return Unsupported(NOOPT)


@ref('aaspan', 'choice: letter not checkable; statement numbers compared with the bar chart', 'exhaustive')
def aaspan(q):
    n = ints(q['prompt'])
    fv = q['figure']['values'] if 'values' in q['figure'] else [r[1] for r in q['figure']['rows']]
    if n[:2] != [int(x) for x in fv]:
        return Verdict(False, 'statement numbers differ from the chart')
    return Unsupported(NOOPT)


@ref('aaways', 'choice: letter not checkable; picture must sum to the stated total', 'exhaustive')
def aaways(q):
    tot = ints(q['prompt'])[0]
    listed = [int(x) for x in re.findall(r'₹(\d+)', q['prompt'].split(':')[1].split('.')[0])]
    if sum(q['figure']['items']) != tot or sorted(listed) != sorted(q['figure']['items']):
        return Verdict(False, 'picture / listed coins do not make the stated total')
    return Unsupported(NOOPT)


for _f in ('aaweek', 'ab24h', 'abunit', 'abwunit'):
    ref(_f, 'choice: not checkable (options not exported)', 'exhaustive')(lambda q: Unsupported(NOOPT))


@ref('abenough', 'choice: letter not checkable; the table amounts are compared with the statement', 'exhaustive')
def abenough(q):
    m = re.search(r'has ₹(\d+) .*?ribbon for ₹(\d+) and a hair clip for ₹(\d+)', q['prompt'])
    rows = [int(r[1]) for r in q['figure']['rows']]
    if rows != [int(x) for x in m.groups()]:
        return Verdict(False, 'table differs from statement')
    return Unsupported(NOOPT)
