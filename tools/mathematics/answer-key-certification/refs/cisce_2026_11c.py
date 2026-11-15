"""Independent references for the CISCE Class 5 families added on 2026-11-15 (b30: aeintl, aeexpb, aedesc, aeestq, aecomp,
aeints, aeidesc, aefpct).

Each reference reads the printed question and options, as the learner sees them, and derives the answer from first principles;
none reads the generator. A prompt the reference does not recognise is reported unsupported.
"""
import re
from fractions import Fraction

from kit import Expect, Unsupported, Verdict, ref

LET = 'ABCD'
ORD = {'first': 1, 'second': 2, 'third': 3, 'fourth': 4, 'fifth': 5}
_W = {w: i for i, w in enumerate('zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen'.split())}
_W.update({w: 10 * (i + 2) for i, w in enumerate('twenty thirty forty fifty sixty seventy eighty ninety'.split())})


def _one(choices, ok):
    hits = [i for i, c in enumerate(choices) if ok(c)]
    if len(hits) != 1 or len(set(choices)) != len(choices):
        return Verdict(False, f'{len(hits)} options satisfy the condition')
    return Expect(LET[hits[0]])


def _read_intl(name):
    """value of an international-system number name; None if it uses any other word (lakh, crore, billion ...)"""
    total, group = 0, 0
    for w in re.split(r'[\s,-]+', name.strip()):
        if not w:
            continue
        if w in _W:
            group += _W[w]
        elif w == 'hundred':
            group *= 100
        elif w == 'thousand':
            total, group = total + group * 1000, 0
        elif w == 'million':
            total, group = total + group * 10 ** 6, 0
        else:
            return None
    return total + group


@ref('aeintl', 'commas: groups of exactly three digits from the right; names: read each option word by word with only international place names')
def aeintl(q):
    p, ch = q['prompt'], q.get('choices')
    m = re.search(r'Which shows (\d+) with its commas', p)
    if m:
        n = m.group(1)

        def ok(c):
            g = c.split(',')
            return c.replace(',', '') == n and 1 <= len(g[0]) <= 3 and all(len(x) == 3 for x in g[1:])
        return _one(ch, ok)
    m = re.search(r'number name of ([\d,]+) in the international system', p)
    if m:
        n = int(m.group(1).replace(',', ''))
        return _one(ch, lambda c: _read_intl(c) == n)
    return Unsupported('prompt form')


@ref('aeexpb', 'multiply each digit by its place value and add')
def aeexpb(q):
    terms = re.findall(r'(\d+) × (\d+)', q['prompt'])
    if not terms:
        return Unsupported('no terms')
    return Expect(str(sum(int(a) * int(b) for a, b in terms)))


def _ordered(q, pat):
    m = re.search(pat, q['prompt'])
    if not m:
        return None, None
    nums = [int(x.replace('−', '-')) for x in m.group(1).split(', ')]
    k = ORD[m.group(2)]
    # the k-th in descending order: the number with exactly k − 1 numbers larger than it
    hits = [x for x in nums if sum(y > x for y in nums) == k - 1]
    return hits, nums


@ref('aedesc', 'count, for each number, how many of the others are larger')
def aedesc(q):
    hits, _ = _ordered(q, r'largest first\): ([\d, ]+)\. Which number is (\w+)\?')
    if hits is None:
        return Unsupported('prompt form')
    return Expect(str(hits[0])) if len(hits) == 1 else Verdict(False, 'not a single answer')


@ref('aeidesc', 'count, for each integer, how many of the others are larger')
def aeidesc(q):
    hits, _ = _ordered(q, r'largest first\): ([\d, −-]+)\. Which integer is (\w+)\?')
    if hits is None:
        return Unsupported('prompt form')
    return Expect(str(hits[0])) if len(hits) == 1 else Verdict(False, 'not a single answer')


@ref('aeestq', 'round half up to the stated place with exact fractions, then divide the rounded numbers')
def aeestq(q):
    m = re.search(r'round (\d+) to the nearest hundred and (\d+) to the nearest ten', q['prompt'])
    if not m:
        return Unsupported('prompt form')
    D, d = int(m.group(1)), int(m.group(2))
    rD = (D + 50) // 100 * 100
    rd = (d + 5) // 10 * 10
    v = Fraction(rD, rd)
    return Expect(str(v)) if v.denominator == 1 else Unsupported('the rounded division is not exact')


def _factors(n):
    return [k for k in range(1, n + 1) if n % k == 0]


@ref('aecomp', 'list every factor of each option by trial division and count them')
def aecomp(q):
    p = q['prompt']
    if 'is composite' in p:
        return _one(q['choices'], lambda c: len(_factors(int(c))) > 2)
    if 'is prime' in p:
        return _one(q['choices'], lambda c: len(_factors(int(c))) == 2)
    return Unsupported('prompt form')


def _val(c):
    return Fraction(c.replace('−', '-'))


@ref('aeints', 'read each option as an exact number and test whether it is whole, and whether it is at most zero')
def aeints(q):
    p = q['prompt']
    if 'NOT an integer' in p:
        return _one(q['choices'], lambda c: _val(c).denominator != 1)
    if 'NOT a counting number' in p:
        return _one(q['choices'], lambda c: _val(c).denominator == 1 and _val(c) <= 0)
    return Unsupported('prompt form')


@ref('aefpct', 'the value as an exact fraction, times 100')
def aefpct(q):
    m = re.search(r'Write ([\d./]+) as a percentage', q['prompt'])
    if not m:
        return Unsupported('prompt form')
    v = Fraction(m.group(1)) * 100
    return Expect(str(v))
