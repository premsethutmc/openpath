"""helpers shared by the measurement reference modules (no production imports)"""
import re
import calendar
import datetime
from fractions import Fraction

NUM = re.compile(r'\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+(?:\.\d+)?')
VULGAR = {'¼': Fraction(1, 4), '½': Fraction(1, 2), '¾': Fraction(3, 4)}


def nums(s):
    """all numbers of a text, thousands commas removed, as Fractions"""
    return [Fraction(x.replace(',', '')) for x in NUM.findall(s)]


def F(x):
    return Fraction(str(x)) if not isinstance(x, Fraction) else x


def dec(fr, places=None):
    """decimal text of a Fraction (exact; with `places` forced)"""
    fr = Fraction(fr)
    if places is not None:
        q = fr * 10 ** places
        assert q.denominator == 1, f'not representable with {places} places: {fr}'
        q = int(q)
        s = str(abs(q)).rjust(places + 1, '0')
        return ('-' if q < 0 else '') + s[:-places] + '.' + s[-places:] if places else str(q)
    if fr.denominator == 1:
        return str(fr.numerator)
    d = fr.denominator
    k = 0
    while d % 2 == 0:
        d //= 2; k += 1
    j = 0
    while d % 5 == 0:
        d //= 5; j += 1
    assert d == 1, f'non-terminating {fr}'
    return dec(fr, max(j, k))


def fmt(fr):
    """a Fraction as 'a' or 'a/b' (Fraction is lowest terms)"""
    fr = Fraction(fr)
    return str(fr.numerator) if fr.denominator == 1 else f'{fr.numerator}/{fr.denominator}'


MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
ABBR = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']


def month_no(name):
    return MONTHS.index(name) + 1


def sun_weekday(d):
    """0 = Sunday ... 6 = Saturday (datetime counts Monday as 0)"""
    return (d.weekday() + 1) % 7


def calendar_problems(fig):
    """check a calendar-table figure against the real Gregorian calendar (datetime); returns list of problems and (year, month)"""
    head = fig['head'][0]
    m = re.fullmatch(r'(\w+) (\d{4})', head)
    mo, yr = month_no(m.group(1)), int(m.group(2))
    probs = []
    if fig['rows'][0] != ABBR:
        probs.append('header row is not Sun..Sat')
    seen = []
    for row in fig['rows'][1:]:
        for c, v in enumerate(row):
            if v == '':
                continue
            seen.append(v)
            try:
                d = datetime.date(yr, mo, v)
            except ValueError:
                probs.append(f'date {v} does not exist in {head}')
                continue
            if sun_weekday(d) != c:
                probs.append(f'{v} {head} is a {DAYS[sun_weekday(d)]} but is drawn under {ABBR[c]}')
    nd = calendar.monthrange(yr, mo)[1]
    if sorted(seen) != list(range(1, nd + 1)):
        probs.append(f'dates shown {sorted(seen)[:3]}..{sorted(seen)[-3:]} are not 1..{nd}')
    return probs, (yr, mo)
