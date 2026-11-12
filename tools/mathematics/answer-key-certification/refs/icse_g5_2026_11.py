"""Independent references for the ICSE Grade 5 families added in 2026-11 (akromr, akromw, aesym3, adline).

Each reference reads the printed question (and its picture or options, as the learner sees them) and derives the answer by a
first-principles method; none reads the generator. A prompt the reference does not recognise is reported unsupported.
"""
import re
from itertools import product

from kit import Expect, Unsupported, Verdict, ref

# largest first; the six two-letter values are listed as values of their own (greedy reading, no take-away rule)
_TOKENS = [('M', 1000), ('CM', 900), ('D', 500), ('CD', 400), ('C', 100), ('XC', 90), ('L', 50), ('XL', 40), ('X', 10), ('IX', 9), ('V', 5), ('IV', 4), ('I', 1)]


def _write(n):
    """Build the numeral by taking the largest value that fits, again and again."""
    out = ''
    for sym, val in _TOKENS:
        while n >= val:
            out += sym
            n -= val
    return out


def _read(s):
    """The number whose numeral, built from scratch, is exactly s (search 1..1000); None if s is not a proper numeral."""
    hits = [n for n in range(1, 1001) if _write(n) == s]
    return hits[0] if len(hits) == 1 else None


@ref('akromr', 'build the numeral of every number from 1 to 1000 from scratch and find the one that matches')
def akromr(q):
    m = re.fullmatch(r'What number does the Roman numeral ([IVXLCDM]+) stand for\?', q['prompt'])
    if not m:
        return Unsupported('prompt form')
    n = _read(m[1])
    return Expect(str(n)) if n is not None else Verdict(False, 'not a proper numeral')


@ref('akromw', 'build the numeral from scratch (largest value that fits, repeatedly) and find it among the options')
def akromw(q):
    m = re.fullmatch(r'Which of these is (\d+) written in Roman numerals\?', q['prompt'])
    if not m or 'choices' not in q:
        return Unsupported('prompt form or no options')
    want = _write(int(m[1]))
    hits = [i for i, c in enumerate(q['choices']) if c == want]
    if len(hits) != 1 or len(set(q['choices'])) != len(q['choices']):
        return Verdict(False, 'the right numeral is not exactly one of the options')
    return Expect('ABCD'[hits[0]])


@ref('aesym3', 'test every plane through the centre of the block spanned by lattice directions: reflect a grid of points of the block')
def aesym3(q):
    m = re.fullmatch(r'A solid block is (\d+) cm long, (\d+) cm wide and (\d+) cm high\. One straight flat cut can divide it into two halves that are mirror images of each other\. In how many different ways can this be done\?', q['prompt'])
    if not m:
        return Unsupported('prompt form')
    a, b, c = (int(x) for x in m.groups())
    fig = q.get('figure') or {}
    if fig.get('dims') != [f'{a} cm', f'{b} cm', f'{c} cm']:
        return Verdict(False, 'the picture does not show the stated block')
    # corners of the block centred at the origin (doubled coordinates keep everything whole)
    corners = {(x, y, z) for x in (-a, a) for y in (-b, b) for z in (-c, c)}
    count = 0
    seen = set()
    for n in product((-1, 0, 1), repeat=3):
        if n == (0, 0, 0):
            continue
        key = max(n, tuple(-t for t in n))
        if key in seen:
            continue
        seen.add(key)
        nn = sum(t * t for t in n)
        # reflection of p in the plane through the origin with normal n: p − 2 (p·n / n·n) n, kept exact with fractions cleared
        ok = True
        for p in corners:
            d = sum(pi * ni for pi, ni in zip(p, n))
            r = tuple(pi * nn - 2 * d * ni for pi, ni in zip(p, n))
            if any(t % nn for t in r) or tuple(t // nn for t in r) not in corners:
                ok = False
                break
        count += ok
    return Expect(str(count))


@ref('adline', 'read the values printed in the line graph (each checked to lie on a scale line) and answer from them')
def adline(q):
    fig = q.get('figure') or {}
    if fig.get('type') != 'linegraph':
        return Unsupported('no line graph')
    labels, values, scale = fig['labels'], fig['values'], fig['scale']
    if len(labels) != len(values) or any(v % scale or v < 0 for v in values):
        return Verdict(False, 'a point is not on a scale line')
    full = {'Mon': 'Monday', 'Tue': 'Tuesday', 'Wed': 'Wednesday', 'Thu': 'Thursday', 'Fri': 'Friday', 'Sat': 'Saturday',
            'Jan': 'January', 'Feb': 'February', 'Mar': 'March', 'Apr': 'April', 'May': 'May', 'Jun': 'June'}
    name = lambda l: full.get(l) or l.replace('Wk ', 'week ')
    at = {name(l): v for l, v in zip(labels, values)}
    s = q['prompt'].split('Read the scale carefully. ', 1)
    if len(s) != 2:
        return Unsupported('prompt form')
    s = s[1]
    if 'than on the day before' in s or 'than in the month before' in s or 'than in the week before' in s:
        return Expect(str(sum(1 for i in range(1, len(values)) if values[i] > values[i - 1])))
    m = re.search(r'(?:on|in) ([A-Za-z]+(?: \d)?) than (?:on|in) ([A-Za-z]+(?: \d)?)\?$', s)
    if m:
        if m[1] not in at or m[2] not in at:
            return Unsupported('time not on the graph')
        return Expect(str(at[m[1]] - at[m[2]]))
    m = re.search(r'(?:on|in) ([A-Za-z]+(?: \d)?)(?:, in °C)?\?$', s)
    if m and m[1] in at:
        return Expect(str(at[m[1]]))
    return Unsupported('prompt form')
