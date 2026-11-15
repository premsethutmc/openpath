"""Independent references for the ICSE Class 5 gap families of 2026-11-15 (icse5-gaps@1, packages/learning/src/fam/b28.ts).

Each reference reads the printed question (its options and picture as the learner sees them) and derives the answer from the
statement by its own method; none reads the generator. A prompt the reference does not recognise is reported unsupported.
Note: written by the same author as the families (no separate assessor was available); each method is chosen to differ from
the generator's (place-value sums by digit arithmetic, factor counting, exact Fractions, brute-force search).
"""
import re
from fractions import Fraction as F

from kit import Ambiguous, Expect, Unsupported, Verdict, ref

M = '−'
L4 = 'ABCD'


def _num(s):
    return int(s.replace(',', ''))


def _prime(n):
    return n > 1 and sum(1 for d in range(1, n + 1) if n % d == 0) == 2


def _one_right(flags):
    hits = [i for i, f in enumerate(flags) if f]
    return Expect(L4[hits[0]]) if len(hits) == 1 else Verdict(False, f'{len(hits)} options are right')


@ref('aeexpn', 'add the printed parts as integers (commas removed)')
def aeexpn(q):
    m = re.fullmatch(r'Write the number (.+) in figures\. Type the digits without commas\.', q['prompt'])
    if not m:
        return Unsupported('prompt form')
    parts = [_num(t.strip()) for t in m[1].split('+')]
    if any(len(str(p).rstrip('0')) != 1 for p in parts):
        return Verdict(False, 'a part is not a single place value')
    return Expect(str(sum(parts)))


@ref('aecmpd', 'sort the printed numbers (commas removed) from greatest to smallest')
def aecmpd(q):
    m = re.search(r'greatest first\): (.+)\. Write the list', q['prompt'])
    if not m:
        return Unsupported('prompt form')
    xs = sorted((_num(t.strip()) for t in m[1].split(';')), reverse=True)
    return Expect('(' + ', '.join(map(str, xs)) + ')')


_W = {w: i for i, w in enumerate('zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen'.split())}
_W.update({w: 10 * i for i, w in enumerate('_ _ twenty thirty forty fifty sixty seventy eighty ninety'.split()) if w != '_'})


def _below_1000(words):
    """A group's name ('six hundred thirty-nine') read right to left: the word before 'hundred' counts hundreds."""
    total, i = 0, 0
    ws = words
    if 'hundred' in ws:
        k = ws.index('hundred')
        if k != 1 or ws[0] not in _W or _W[ws[0]] > 9:
            return None
        total += 100 * _W[ws[0]]
        ws = ws[2:]
    for w in ws:
        if w not in _W:
            return None
        total += _W[w]
    return total if total < 1000 else None


@ref('aeintw', 'split the name at "million" and "thousand", read each group below 1000, combine as 10^6 and 10^3 multiples')
def aeintw(q):
    m = re.fullmatch(r'Write the number "(.+)" in figures\. Type the digits without commas\.', q['prompt'])
    if not m:
        return Unsupported('prompt form')
    words = m[1].replace('-', ' ').split()
    if 'million' not in words:
        return Unsupported('no million')
    i = words.index('million')
    mil = _below_1000(words[:i])
    rest = words[i + 1:]
    th = 0
    if 'thousand' in rest:
        j = rest.index('thousand')
        th = _below_1000(rest[:j])
        rest = rest[j + 1:]
    ones = _below_1000(rest) if rest else 0
    if None in (mil, th, ones):
        return Unsupported('a group could not be read')
    return Expect(str(mil * 10 ** 6 + th * 1000 + ones))


@ref('aedfrm', 'exact Fraction of the stated amount; the option whose decimal (read exactly) equals it')
def aedfrm(q):
    m = re.search(r'(?:is|costs) (?:(\d+) )?(\d+)/(\d+) (?:m long|rupees)', q['prompt'])
    if not m or 'choices' not in q:
        return Unsupported('prompt form')
    want = F(int(m[1] or 0)) + F(int(m[2]), int(m[3]))
    vals = [F(c.replace('₹', '').replace(' m', '')) for c in q['choices']]
    return _one_right([v == want for v in vals])


@ref('aeqest', 'round each printed number to its greatest place with exact half-up arithmetic, divide the rounded numbers exactly')
def aeqest(q):
    m = re.match(r'Estimate ([\d,]+) ÷ (\d+) by rounding each number to its greatest place', q['prompt'])
    if not m:
        return Unsupported('prompt form')

    def rnd(n):
        p = 10 ** (len(str(n)) - 1)
        q_, r = divmod(n, p)
        return (q_ + (1 if 2 * r >= p else 0)) * p
    a, b = rnd(_num(m[1])), rnd(int(m[2]))
    if a % b:
        return Ambiguous('the rounded numbers do not divide exactly')
    return Expect(str(a // b))


@ref('agcomp', 'count all factors of each number in the range; composite = more than two factors')
def agcomp(q):
    m = re.search(r'composite numbers from (\d+) to (\d+)\.', q['prompt'])
    if not m:
        return Unsupported('prompt form')
    cs = [n for n in range(int(m[1]), int(m[2]) + 1) if sum(1 for d in range(1, n + 1) if n % d == 0) > 2]
    return Expect(','.join(map(str, cs))) if cs else Ambiguous('no composite number')


@ref('agtwin', 'each option: both numbers prime by counting factors, and difference exactly 2')
def agtwin(q):
    if 'twin primes' not in q['prompt'] or 'choices' not in q:
        return Unsupported('prompt form')
    flags = []
    for c in q['choices']:
        a, b = (int(x) for x in re.fullmatch(r'(\d+) and (\d+)', c).groups())
        flags.append(_prime(a) and _prime(b) and abs(a - b) == 2)
    return _one_right(flags)


@ref('agfstry', 'exact Fractions; the operation from the story (together/more → add, poured out/cuts off/left → subtract)')
def agfstry(q):
    p = q['prompt']
    fs = [F(int(a), int(b)) for a, b in re.findall(r'(\d+)/(\d+)', p)]
    if len(fs) != 2:
        return Unsupported('two fractions expected')
    if re.search(r'pours out|cuts off|left for|still full|are left', p):
        op = -1
    elif re.search(r'together|more to school|in the afternoon', p):
        op = 1
    else:
        return Unsupported('operation not recognised')
    v = fs[0] + op * fs[1]
    if v <= 0:
        return Verdict(False, 'not a positive amount')
    return Expect(str(v))


def _places(s):
    return len(s.split('.')[1]) if '.' in s else 0


@ref('agdeqv', 'equal: exact Fraction of each decimal; like/unlike: count the digits after the point in each number of a pair')
def agdeqv(q):
    p = q['prompt']
    if 'choices' not in q:
        return Unsupported('no options')
    m = re.fullmatch(r'Which of these decimals is equal to ([\d.]+)\?', p)
    if m:
        return _one_right([F(c) == F(m[1]) for c in q['choices']])
    pairs = [c.split(' and ') for c in q['choices']]
    if 'Which pair are like decimals' in p:
        return _one_right([_places(a) == _places(b) for a, b in pairs])
    if 'Which pair are unlike decimals' in p:
        return _one_right([_places(a) != _places(b) for a, b in pairs])
    return Unsupported('prompt form')


@ref('ajisint', 'read each option as an exact Fraction (a/b, decimal, signed whole number); integer = denominator 1')
def ajisint(q):
    p = q['prompt']
    if 'choices' not in q:
        return Unsupported('no options')
    vals = []
    for c in q['choices']:
        t = c.replace(M, '-')
        vals.append(F(t) if re.fullmatch(r'-?\d+(?:/\d+|\.\d+)?', t) else None)
    if None in vals:
        return Unsupported('an option could not be read')
    if 'is NOT an integer' in p:
        return _one_right([v.denominator != 1 for v in vals])
    if 'IS an integer' in p:
        return _one_right([v.denominator == 1 for v in vals])
    return Unsupported('prompt form')


@ref('ajordd', 'sort the listed integers numerically, greatest first')
def ajordd(q):
    m = re.search(r'greatest first\): (.*)\. Write them', q['prompt'])
    if not m:
        return Unsupported('prompt form')
    xs = sorted((int(x.strip().replace(M, '-')) for x in m[1].split(',')), reverse=True)
    return Expect('(' + ', '.join(str(x) for x in xs) + ')')


@ref('agpgrid', 'count the shaded cells of the pictured grid; percentage = exact Fraction shaded/all × 100')
def agpgrid(q):
    fig = q.get('figure') or {}
    m = re.match(r'The grid in the picture has (\d+) equal squares\.', q['prompt'])
    if not m or fig.get('type') != 'grid':
        return Unsupported('prompt or picture form')
    n = fig['rows'] * fig['cols']
    if n != int(m[1]):
        return Verdict(False, 'the picture does not have the stated number of squares')
    v = F(fig['shaded'], n) * 100
    return Expect(str(v)) if v.denominator == 1 else Ambiguous('not a whole percentage')


@ref('agpfr', 'exact Fraction × 100')
def agpfr(q):
    m = re.match(r'Write (\d+)/(\d+) as a percentage\.', q['prompt'])
    if not m:
        return Unsupported('prompt form')
    v = F(int(m[1]), int(m[2])) * 100
    return Expect(str(v)) if v.denominator == 1 else Ambiguous('not a whole percentage')


@ref('abcest', 'litres × 1000 ÷ millilitres by repeated subtraction count; the option equal to it')
def abcest(q):
    m = re.search(r'holds about (\d+) mL of water and a .+ holds about (\d+) L\.', q['prompt'])
    if not m or 'choices' not in q:
        return Unsupported('prompt form')
    small, big = int(m[1]), int(m[2]) * 1000
    count, left = 0, big
    while left >= small:
        left -= small
        count += 1
    if left:
        return Ambiguous('not a whole number of measures')
    return _one_right([int(c.replace(',', '')) == count for c in q['choices']])


@ref('afmkang', 'the angle between an arm on 0 and an arm turned to the stated mark on the same scale is the stated size; checked against the 180 − reading on the other scale')
def afmkang(q):
    m = re.match(r'Make an angle of (\d+)° on the protractor\. One arm lies along the line marked 0 on the (inner|outer) scale\.', q['prompt'])
    if not m:
        return Unsupported('prompt form')
    d = int(m[1])
    fixed_inner = 0 if m[2] == 'inner' else 180
    arm_inner = d if fixed_inner == 0 else 180 - d
    angle = abs((180 - arm_inner) - (180 - fixed_inner))
    return Expect(str(angle))


@ref('adbarmk', 'read each value from the pictured table, in order; every value must lie on a line of the stated scale')
def adbarmk(q):
    m = re.search(r'each line is (\d+) ', q['prompt'])
    fig = q.get('figure') or {}
    if not m or fig.get('type') != 'table':
        return Unsupported('prompt or picture form')
    step = int(m[1])
    vals = [int(r[1]) for r in fig['rows']]
    if any(v % step for v in vals):
        return Verdict(False, 'a value is not on a line of the scale')
    return Expect('(' + ', '.join(map(str, vals)) + ')')
