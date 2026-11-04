"""number-a references, part 1: the aa* families (Class 1-2 number sense, addition, subtraction, place value)."""
import itertools
import re

from kit import ref, Expect, Verdict, Unsupported, Ambiguous, Fraction
from refs.number_a_common import *  # noqa: F401,F403
from refs.number_a_common import (opts, ints, pick, calc, first_arith, words_to_int, int_to_words_intl, evalexpr)


def _fig(q, key=None):
    f = q.get('figure') or {}
    return f if key is None else f.get(key)


# ---------------------------------------------------------------------------------------------------- aaadd
@ref('aaadd', method='sum by counting on: start at a and take b steps of +1 (checked against schoolbook column addition); '
                     'figure mark must equal the first addend', coverage='exhaustive')
def aaadd(q):
    a, op, b = first_arith(q['prompt'])
    assert op == '+'
    n = a
    for _ in range(b):
        n += 1
    assert n == calc(a, '+', b)
    if _fig(q, 'marks') != [a]:
        return Verdict(False, f'figure mark {_fig(q, "marks")} is not the first addend {a}')
    return Expect(str(n))


@ref('aasub', method='difference by counting back b steps from a (checked against column subtraction); the ten-frame figure must show a',
     coverage='exhaustive')
def aasub(q):
    a, op, b = first_arith(q['prompt'])
    assert op == '−'
    n = a
    for _ in range(b):
        n -= 1
    assert n == calc(a, '−', b)
    if _fig(q, 'filled') != a:
        return Verdict(False, f'figure shows {_fig(q, "filled")} counters, prompt says {a}')
    return Expect(str(n))


# ---------------------------------------------------------------------------------------------------- aabig
SIZE = {'an ant': 1e-6, 'a button': 1e-5, 'a lemon': 0.1, 'a mango': 0.4, 'a football': 5.5, 'a cat': 6, 'a chair': 150,
        'a bicycle': 500, 'an autorickshaw': 4000, 'a bus': 40000, 'a train': 1000000}  # litres of room taken, common knowledge


@ref('aabig', method='real-world size ranking (litres of room each object takes) written independently from common knowledge; '
                     'the keyed option must be the larger / smaller object and every pair must be clear-cut',
     coverage='exhaustive', assumptions='cat vs football, lemon vs mango, mango vs football would be near-ties and are reported Ambiguous')
def aabig(q):
    o = opts(q)
    a, b = SIZE[o[0]], SIZE[o[1]]
    if max(a, b) / min(a, b) < 2:
        return Ambiguous(f'{o}: sizes too close to call')
    big = 'bigger' in q['prompt']
    if not big:
        assert 'smaller' in q['prompt']
    win = 0 if (a > b) == big else 1
    return Expect('AB'[win])


# ---------------------------------------------------------------------------------------------------- aabond
@ref('aabond', method='missing addend by counting on from a until b is reached (checked by a + x = b); ten-frame figure shows a and has enough frames for b',
     coverage='exhaustive')
def aabond(q):
    m = re.search(r'shows? (\d+)\. How many more counters are needed to make (\d+)\? \((\d+) \+ \? = (\d+)\)', q['prompt'])
    a, b = int(m.group(1)), int(m.group(2))
    assert (a, b) == (int(m.group(3)), int(m.group(4)))
    n = 0
    while a + n != b:
        n += 1
        if n > 100:
            return Ambiguous('no solution')
    fr = q.get('figure') or {}
    if fr.get('filled') != a or fr.get('frames') != (1 if b <= 10 else 2):
        return Verdict(False, f'figure {fr} does not match a={a}, b={b}')
    return Expect(str(n))


# ---------------------------------------------------------------------------------------------------- aabund
@ref('aabund', method='total of the pictograph row counts (key 1 = one icon each); full tens / leftover by repeated removal of ten',
     coverage='exhaustive')
def aabund(q):
    fg = q['figure']
    assert fg['key'] == 1
    tot = sum(fg['counts'])
    left, groups = tot, 0
    while left >= 10:
        left -= 10
        groups += 1
    p = q['prompt']
    if 'How many full groups of ten' in p:
        return Expect(str(groups))
    if 'left over' in p:
        return Expect(str(left))
    if 'in all' in p:
        return Expect(str(tot))
    return Unsupported('unrecognised question: ' + p[-80:])


# ---------------------------------------------------------------------------------------------------- aacmp
@ref('aacmp', method='compare the two numbers named in the prompt (checked on the number line marks)', coverage='exhaustive')
def aacmp(q):
    m = re.search(r'Which number is (more|less): (\d+) or (\d+)\?', q['prompt'])
    a, b = int(m.group(2)), int(m.group(3))
    if a == b:
        return Ambiguous('equal numbers')
    if sorted(_fig(q, 'marks')) != sorted([a, b]):
        return Verdict(False, 'figure marks differ from the numbers in the prompt')
    return Expect(str(max(a, b) if m.group(1) == 'more' else min(a, b)))


# ---------------------------------------------------------------------------------------------------- aadigit
@ref('aadigit', method='locate the digit in the numeral and multiply by its place (10 for tens, 1 for ones); repeated digit -> ambiguous',
     coverage='exhaustive')
def aadigit(q):
    m = re.search(r'In (\d+), what is the value of the digit (\d)\?', q['prompt'])
    if not m:  # 'How many tens are there in N?'
        n = int(re.search(r'tens are there in (\d+)', q['prompt']).group(1))
        k, left = 0, n
        while left >= 10:
            left -= 10
            k += 1
        return Expect(str(k))
    s, d = m.group(1), m.group(2)
    pos = [i for i, c in enumerate(s) if c == d]
    if len(pos) != 1:
        return Ambiguous(f'digit {d} occurs {len(pos)} times in {s}')
    val = int(d) * 10 ** (len(s) - 1 - pos[0])
    fg = q['figure']
    if 100 * fg['hundreds'] + 10 * fg['tens'] + fg['ones'] != int(s):
        return Verdict(False, f'figure blocks {fg} do not show {s}')
    return Expect(str(val))


# ---------------------------------------------------------------------------------------------------- aadigmax
@ref('aadigmax', method='enumerate every permutation of the given digits, keep those with no leading zero, take max / min',
     coverage='exhaustive')
def aadigmax(q):
    m = re.search(r'digits ([\d, ]+) exactly once to make the (greatest|smallest) (\d+)-digit number', q['prompt'])
    ds = [int(x) for x in m.group(1).replace(' ', '').split(',')]
    k = int(m.group(3))
    if k != len(ds):
        return Verdict(False, f'{len(ds)} digits but a {k}-digit number is requested')
    vals = {int(''.join(map(str, p))) for p in itertools.permutations(ds) if p[0] != 0}
    return Expect(str(max(vals) if m.group(2) == 'greatest' else min(vals)))


# ---------------------------------------------------------------------------------------------------- aagreat
@ref('aagreat', method='enumerate ordered pairs of two different cards (leading card non-zero), take max / min',
     coverage='exhaustive')
def aagreat(q):
    m = re.search(r'\(([\d, ]+)\) to make the (greatest|smallest) two-digit', q['prompt'])
    cards = [int(x) for x in m.group(1).replace(' ', '').split(',')]
    vals = {10 * a + b for i, a in enumerate(cards) for j, b in enumerate(cards) if i != j and a != 0}
    row = q['figure']['rows'][0]
    if sorted(row) != sorted(cards):
        return Verdict(False, 'figure cards differ from prompt')
    return Expect(str(max(vals) if m.group(2) == 'greatest' else min(vals)))


# ---------------------------------------------------------------------------------------------------- aagrp
@ref('aagrp', method='compare counts from the pictograph (or the two numbers) and select the unique option stating the true comparison',
     coverage='exhaustive')
def aagrp(q):
    p = q['prompt']
    if p.startswith('Compare the numbers'):
        a, b = ints(p)[:2]

        def ok(t):
            m = re.fullmatch(r'(\d+) is (more than|less than|equal to) (\d+)', t)
            if not m or (int(m.group(1)), int(m.group(3))) != (a, b):
                return False
            rel = m.group(2)
            return (rel == 'more than' and a > b) or (rel == 'less than' and a < b) or (rel == 'equal to' and a == b)
        return pick(q, ok)
    fg = q['figure']
    c = dict(zip(fg['labels'], fg['counts']))
    assert fg['key'] == 1
    more = 'has more' in p
    assert more or 'has fewer' in p
    (la, lb), (ca, cb) = fg['labels'], fg['counts']
    if ca == cb:
        want = 'Both have the same number'
    else:
        want = la if (ca > cb) == more else lb
    return pick(q, lambda t: t == want)


# ---------------------------------------------------------------------------------------------------- aamore
@ref('aamore', method='difference of the two pictograph counts named in the prompt', coverage='exhaustive')
def aamore(q):
    m = re.search(r'How many more (.+?) than (.+?) are there\?', q['prompt'])
    fg = q['figure']
    c = dict(zip(fg['labels'], fg['counts']))
    x, y = c[m.group(1)], c[m.group(2)]
    if x < y:
        return Verdict(False, f'asks how many more {m.group(1)} than {m.group(2)} but counts are {x} < {y}')
    n = 0
    while y + n != x:
        n += 1
    return Expect(str(n))


# ---------------------------------------------------------------------------------------------------- aamul01
@ref('aamul01', method='direct product, or the unique value of the box found by trying 0..2000', coverage='exhaustive')
def aamul01(q):
    p = q['prompt']
    if '☐' in p:
        m = re.search(r'(\d+|☐) × (\d+|☐) = (\d+)', p)
        l, r, t = m.group(1), m.group(2), int(m.group(3))
        sol = [x for x in range(0, 2001) if (x if l == '☐' else int(l)) * (x if r == '☐' else int(r)) == t]
        if len(sol) != 1:
            return Ambiguous(f'box has {len(sol)} solutions in 0..2000')
        return Expect(str(sol[0]))
    a, op, b = first_arith(p)
    return Expect(str(calc(a, '×', b)))


# ---------------------------------------------------------------------------------------------------- aaname
@ref('aaname', method='parse each option as English number words and pick the one whose value is the numeral', coverage='exhaustive')
def aaname(q):
    n = ints(q['prompt'])[0]
    return pick(q, lambda t: words_to_int(t) == n)


# ---------------------------------------------------------------------------------------------------- aanext
@ref('aanext', method='successor / predecessor by counting', coverage='exhaustive')
def aanext(q):
    mb = re.search(r'between (\d+) and (\d+)', q['prompt'])
    if mb:
        a, b = int(mb.group(1)), int(mb.group(2))
        mid = [x for x in range(a + 1, b)]
        return Expect(str(mid[0])) if len(mid) == 1 else Ambiguous(f'{len(mid)} numbers between {a} and {b}')
    m = re.search(r'just (after|before) (\d+)', q['prompt'])
    n = int(m.group(2))
    return Expect(str(n + 1 if m.group(1) == 'after' else n - 1))


# ---------------------------------------------------------------------------------------------------- aaordn / aaordx
@ref('aaordn', method='sort the listed numbers', coverage='exhaustive')
def aaordn(q):
    p = q['prompt']
    body = p.split(':', 1)[1].rsplit('.', 1)[0]
    nums = ints(body.split('Write')[0])
    if len(set(nums)) != len(nums):
        return Ambiguous('repeated numbers')
    asc = 'smallest to the biggest' in p
    assert asc or 'biggest to the smallest' in p
    return Expect(', '.join(map(str, sorted(nums, reverse=not asc))))


@ref('aaordx', method='sort numbers (commas ignored, Indian or international grouping); the card form answers with card numbers 1..4',
     coverage='exhaustive')
def aaordx(q):
    p = q['prompt']
    asc = 'ascending' in p
    assert asc or 'descending' in p
    if p.startswith('The four cards'):
        cards = [int(x.replace(',', '')) for x in q['figure']['rows'][0]]
        if len(set(cards)) != 4:
            return Ambiguous('cards repeat')
        order = sorted(range(4), key=lambda i: cards[i], reverse=not asc)
        return Expect(', '.join(str(i + 1) for i in order))
    nums = ints(p.split(':', 1)[1].split('Write')[0])
    if len(set(nums)) != len(nums):
        return Ambiguous('repeated numbers')
    return Expect(', '.join(map(str, sorted(nums, reverse=not asc))))


# ---------------------------------------------------------------------------------------------------- aasenadd / aasensub
def _sentence(t):
    m = re.fullmatch(r'(\d+) ([+−]) (\d+) = (\d+)', t)
    return None if not m else (int(m.group(1)), m.group(2), int(m.group(3)), int(m.group(4)))


@ref('aasenadd', method='the option must be a true addition sentence made of the two numbers of the story (either order)', coverage='exhaustive')
def aasenadd(q):
    a, b = ints(q['prompt'])[:2]
    fg = q['figure']
    if fg['counts'] != [a, b]:
        return Verdict(False, 'figure counts differ from story')

    def ok(t):
        s = _sentence(t)
        return bool(s) and s[1] == '+' and {s[0], s[2]} == {a, b} and s[0] + s[2] == s[3]
    return pick(q, ok)


@ref('aasensub', method='the option must be the true subtraction sentence big - taken = left for the story numbers', coverage='exhaustive')
def aasensub(q):
    a, b = ints(q['prompt'])[:2]
    if q['figure']['counts'] != [a, b]:
        return Verdict(False, 'figure counts differ from story')

    def ok(t):
        s = _sentence(t)
        return bool(s) and s[1] == '−' and (s[0], s[2]) == (a, b) and s[0] - s[2] == s[3]
    return pick(q, ok)


# ---------------------------------------------------------------------------------------------------- aasign
@ref('aasign', method='compare the two numerals (any comma grouping) and select the sign', coverage='exhaustive')
def aasign(q):
    m = re.search(r'box: (\S+) ☐ (\S+)\?', q['prompt'])
    a, b = int(m.group(1).replace(',', '')), int(m.group(2).replace(',', ''))
    sg = '<' if a < b else '>' if a > b else '='
    return pick(q, lambda t: t == sg)


# ---------------------------------------------------------------------------------------------------- aastadd / aastsub
@ref('aastadd', method='sum of the two quantities of the story (column addition)', coverage='exhaustive')
def aastadd(q):
    a, b = ints(q['prompt'])[:2]
    return Expect(str(calc(a, '+', b)))


@ref('aastsub', method='what is left after taking the second quantity from the first (column subtraction, first >= second)', coverage='exhaustive')
def aastsub(q):
    a, b = ints(q['prompt'])[:2]
    if a < b:
        return Verdict(False, 'more taken than there was')
    return Expect(str(calc(a, '−', b)))


# ---------------------------------------------------------------------------------------------------- aatens
@ref('aatens', method='100*hundreds + 10*tens + ones read from the block picture', coverage='exhaustive')
def aatens(q):
    fg = q['figure']
    return Expect(str(100 * fg['hundreds'] + 10 * fg['tens'] + fg['ones']))


@ref('abhto', method='100*hundreds + 10*tens + ones read from the block picture', coverage='exhaustive')
def abhto(q):
    fg = q['figure']
    return Expect(str(100 * fg['hundreds'] + 10 * fg['tens'] + fg['ones']))


@ref('abreg', method='100h + 10t + o from the counts in the sentence; picture must show the same counts', coverage='exhaustive')
def abreg(q):
    h, t, o = ints(q['prompt'])[:3]
    fg = q['figure']
    if (fg['hundreds'], fg['tens'], fg['ones']) != (h, t, o):
        return Verdict(False, 'figure differs from the sentence')
    return Expect(str(100 * h + 10 * t + o))


# ---------------------------------------------------------------------------------------------------- aaword
@ref('aaword', method='English number-word parser', coverage='exhaustive')
def aaword(q):
    w = re.search(r'"([^"]+)"', q['prompt']).group(1)
    v = words_to_int(w)
    if v is None:
        return Unsupported('unparsable word ' + w)
    return Expect(str(v))


# ---------------------------------------------------------------------------------------------------- aazero
@ref('aazero', method='evaluate the stated sum / difference by counting; ten-frame shows the number being worked on', coverage='exhaustive')
def aazero(q):
    a, op, b = first_arith(q['prompt'])
    return Expect(str(calc(a, op, b)))


# ---------------------------------------------------------------------------------------------------- abgroup
@ref('abgroup', method='plates x per plate by repeated addition; array figure must be rows x cols', coverage='exhaustive')
def abgroup(q):
    r, c = ints(q['prompt'])[:2]
    n = 0
    for _ in range(r):
        n += c
    fg = q['figure']
    if (fg['rows'], fg['cols']) != (r, c):
        return Verdict(False, 'array differs from sentence')
    return Expect(str(n))


# ---------------------------------------------------------------------------------------------------- abrep
@ref('abrep', method='the option that is r copies of c added (or the multiplication with the same factors); other options must differ',
     coverage='exhaustive')
def abrep(q):
    p = q['prompt']
    if 'repeated addition' in p:
        r, c = ints(p)[:2]
        want = ' + '.join([str(c)] * r)
        fg = q['figure']
        if (fg['rows'], fg['cols']) != (r, c):
            return Verdict(False, 'array differs from sentence')

        def total_equal(t):  # any equal-addend sum with the right total also "shows how many"
            xs = [int(x) for x in t.split('+')] if re.fullmatch(r'\d+( \+ \d+)+', t) else []
            return len(xs) > 1 and len(set(xs)) == 1 and sum(xs) == r * c
        alt = [t for t in opts(q) if total_equal(t)]
        if len(alt) > 1:
            return Ambiguous(f'several equal-addend sums have total {r * c}: {alt}')
        return pick(q, lambda t: t == want)
    m = re.search(r'same as ([\d +]+)\?', p)
    terms = [int(x) for x in m.group(1).split('+')]
    assert len(set(terms)) == 1
    n, a = len(terms), terms[0]

    def ok(t):
        mm = re.fullmatch(r'(\d+) × (\d+)', t)
        return bool(mm) and {int(mm.group(1)), int(mm.group(2))} == {n, a} and True
    # either order is the same product
    return pick(q, ok)
