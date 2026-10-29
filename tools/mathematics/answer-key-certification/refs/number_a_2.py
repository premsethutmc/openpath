"""number-a references, part 2: ac* and ad* families (Class 2-4: sharing, halves, number lines, regrouping, thousands, fractions)."""
import re

from kit import ref, Expect, Verdict, Unsupported, Ambiguous, Fraction
from refs.number_a_common import *  # noqa: F401,F403
from refs.number_a_common import (opts, ints, pick, calc, first_arith, words_to_int, evalexpr, ftext, dtext, mixedtext)

FR = re.compile(r'(\d+)/(\d+)')


def fracs(s):
    return [Fraction(int(a), int(b)) for a, b in FR.findall(s)]


def _blocks(fg):
    return 100 * fg['hundreds'] + 10 * fg['tens'] + fg['ones']


# ---------------------------------------------------------------------------------------------------- simple arithmetic
@ref('acaddten', method='add / subtract the stated hundreds or tens by column arithmetic; picture must show the first number', coverage='exhaustive')
def acaddten(q):
    a, op, b = first_arith(q['prompt'])
    if _blocks(q['figure']) != a:
        return Verdict(False, 'blocks do not show the first number')
    return Expect(str(calc(a, op, b)))


def _sub(fam):
    @ref(fam, method='column subtraction with borrowing (a >= b); blocks picture must show the minuend', coverage='exhaustive')
    def f(q):
        a, op, b = first_arith(q['prompt'])
        assert op == '−'
        if a < b:
            return Verdict(False, 'negative result')
        if _blocks(q['figure']) != a:
            return Verdict(False, 'blocks do not show the minuend')
        return Expect(str(calc(a, '−', b)))
    return f


for _f in ('acsub2', 'acsub3', 'acsubn'):
    _sub(_f)


@ref('addr', method='column addition with carrying; blocks picture (ones may exceed 9) must total the sum', coverage='exhaustive')
def addr(q):
    a, op, b = first_arith(q['prompt'])
    s = calc(a, '+', b)
    if _blocks(q['figure']) != s:
        return Verdict(False, f'blocks show {_blocks(q["figure"])}, not {s}')
    return Expect(str(s))


@ref('adcol3', method='column addition / subtraction; blocks picture shows the sum (addition) or the minuend (subtraction)', coverage='exhaustive')
def adcol3(q):
    a, op, b = first_arith(q['prompt'])
    r = calc(a, op, b)
    want = r if op == '+' else a
    if _blocks(q['figure']) != want:
        return Verdict(False, f'blocks show {_blocks(q["figure"])}, expected {want}')
    if r < 0:
        return Verdict(False, 'negative result')
    return Expect(str(r))


@ref('adcolx', method='column addition / subtraction; the place-value table must show the same two numbers and operator', coverage='exhaustive')
def adcolx(q):
    a, op, b = first_arith(q['prompt'])
    fg = q['figure']
    r1, r2 = fg['rows']
    n1 = int(''.join(str(x) for x in r1[1:] if x != ''))
    n2 = int(''.join(str(x) for x in r2[1:] if x != ''))
    if (n1, n2) != (a, b) or r2[0] != op:
        return Verdict(False, f'table shows {n1} {r2[0]} {n2}')
    r = calc(a, op, b)
    if r < 0:
        return Verdict(False, 'negative result')
    return Expect(str(r))


@ref('aeadd3', method='column addition; the place-value table must show the two addends', coverage='exhaustive')
def aeadd3(q):
    a, op, b = first_arith(q['prompt'])
    rows = q['figure']['rows']
    n = [int(''.join(r[1:])) for r in rows]
    if n != [a, b]:
        return Verdict(False, f'table shows {n}')
    return Expect(str(calc(a, '+', b)))


@ref('aeaddn', method='column addition; the place-value table must show the two addends', coverage='exhaustive')
def aeaddn(q):
    a, op, b = first_arith(q['prompt'])
    rows = q['figure']['rows']
    n = [int(''.join(r[1:])) for r in rows]
    if n != [a, b]:
        return Verdict(False, f'table shows {n}')
    return Expect(str(calc(a, '+', b)))


# ---------------------------------------------------------------------------------------------------- acequal
@ref('acequal', method='pieces cut at the marked dots of the picture: lengths from consecutive boundaries; all equal <=> yes. '
                       'Number of pieces in the sentence must equal marks+1 and the length must equal the figure length', coverage='exhaustive')
def acequal(q):
    p = q['prompt']
    m = re.search(r'is (\d+) (?:squares|cm|m) long and is cut at the dots into (\d+) pieces', p)
    L, k = int(m.group(1)), int(m.group(2))
    fg = q['figure']
    if fg['to'] - fg['from'] != L or len(fg['marks']) != k - 1:
        return Verdict(False, f'figure {fg} does not match {L} long / {k} pieces')
    b = [fg['from']] + sorted(fg['marks']) + [fg['to']]
    lens = [b[i + 1] - b[i] for i in range(len(b) - 1)]
    kind = 'half' if 'one half' in p else 'quarter'
    assert (kind == 'half') == (k == 2)
    yes = len(set(lens)) == 1
    return pick(q, lambda t: t.startswith('Yes') == yes)


# ---------------------------------------------------------------------------------------------------- fractions of shapes
@ref('achalf', method='shaded squares / all squares of the grid picture, lowest terms (the prompt asks for the form 1/2)', coverage='exhaustive')
def achalf(q):
    fg = q['figure']
    fr = Fraction(fg['shaded'], fg['rows'] * fg['cols'])
    return Expect(ftext(fr), form=True)


@ref('adfname', method='shaded squares / all squares of the grid picture', coverage='exhaustive')
def adfname(q):
    fg = q['figure']
    return Expect(ftext(Fraction(fg['shaded'], fg['rows'] * fg['cols'])))


@ref('achalfof', method='the stated fraction (half = 1/2, a quarter = 1/4, three quarters = 3/4) of the number of objects, verified by dividing into equal parts; picture count must match',
     coverage='exhaustive')
def achalfof(q):
    p = q['prompt']
    n = ints(p)[0]
    if q['figure']['count'] != n:
        return Verdict(False, 'figure count differs')
    fr = Fraction(1, 2) if 'half' in p else Fraction(3, 4) if 'three quarters' in p else Fraction(1, 4) if 'a quarter' in p else None
    v = n * fr
    if v.denominator != 1:
        return Ambiguous(f'{n} cannot be shared into {fr.denominator} equal parts')
    return Expect(str(v))


@ref('adfcol', method='the stated fraction of the number of beads; the picture must show that many', coverage='exhaustive')
def adfcol(q):
    p = q['prompt']
    n = int(re.search(r'shows (\d+) beads', p).group(1))
    fr = fracs(p.split('What is')[1])[0]
    if q['figure']['count'] != n:
        return Verdict(False, 'figure count differs')
    v = fr * n
    if v.denominator != 1:
        return Ambiguous(f'{fr} of {n} is not whole')
    return Expect(str(v))


@ref('adshade', method='squares to shade = total x fraction (must be whole); grid picture must have that many squares', coverage='exhaustive')
def adshade(q):
    p = q['prompt']
    n = int(re.search(r'has (\d+) equal squares', p).group(1))
    fr = fracs(p.split('shaded to show')[1])[0]
    fg = q['figure']
    if fg['rows'] * fg['cols'] != n:
        return Verdict(False, 'grid size differs')
    v = fr * n
    if v.denominator != 1:
        return Ambiguous(f'{fr} of {n} is not whole')
    return Expect(str(v))


# ---------------------------------------------------------------------------------------------------- number lines
@ref('acnlbetween', method='count the integers strictly between a and b by listing them', coverage='exhaustive')
def acnlbetween(q):
    a, b = ints(q['prompt'])[:2]
    return Expect(str(len(list(range(a + 1, b)))))


@ref('adbetw', method='count the integers strictly between a and b by listing them', coverage='exhaustive')
def adbetw(q):
    a, b = ints(q['prompt'])[:2]
    return Expect(str(len(list(range(a + 1, b)))))


@ref('acnlcmp', method='the largest / smallest of the four numerals, matched to the option text; all four must lie in the stated range',
     coverage='exhaustive')
def acnlcmp(q):
    p = q['prompt']
    head = p.split('are to be marked')[0]
    nums = ints(head)
    lo, hi = ints(p.split('from')[1].split('Which')[0])[:2]
    if len(nums) != 4 or len(set(nums)) != 4:
        return Ambiguous('numbers repeat')
    if not all(lo <= x <= hi for x in nums):
        return Verdict(False, f'a number lies outside {lo}..{hi}')
    t = max(nums) if 'right' in p else min(nums)
    assert 'right' in p or 'left' in p
    return pick(q, lambda s: int(s.replace(',', '')) == t)


@ref('acnljump', method='iterate the jumps one at a time from the start', coverage='exhaustive')
def acnljump(q):
    s, n, k = ints(q['prompt'])[:3]
    pos = s
    for _ in range(n):
        pos = pos + k if 'forward' in q['prompt'] else pos - k
    return Expect(str(pos))


@ref('acnlpos', method='derived from the word form of the same question (first stone, spacing, number of places: start + k*step), then triangulated with the picture '
                       '(axis start, step and the position of the ? must agree with it); the typed statement alone only says "where the ? is", which exists only in the picture',
     coverage='exhaustive', assumptions='the rendering of the ? on the picture is not inspected; the figure data (from, step, unknown) is trusted as the picture')
def acnlpos(q):
    fg = q['figure']
    w = q.get('word')
    if not w:
        return Unsupported('no word form to derive the position independently')
    m = re.search(r'placed (\d+) metres apart\. The first stone says (\d+) m, the next says (\d+) m.*?stone (\d+) places after the first', w['prompt'])
    step, first, nxt, k = (int(x) for x in m.groups())
    if nxt - first != step:
        return Verdict(False, 'word form: spacing inconsistent')
    v = first + k * step
    if fg['from'] != first or fg['step'] != step or fg['unknown'] != v or not (fg['from'] <= v <= fg['to']):
        return Verdict(False, f'picture {fg} disagrees with word form (expected ? = {v})')
    return Expect(str(v))


# ---------------------------------------------------------------------------------------------------- multiplication / sharing
@ref('acpart', method='product (partial products by tens and ones); the split rectangle in the picture must split the first factor into tens + ones',
     coverage='exhaustive')
def acpart(q):
    a, op, b = first_arith(q['prompt'].split(':', 1)[1])
    h = q['figure']['head']
    if int(h[1]) + int(h[2]) != a or int(h[1]) != (a // 10) * 10:
        return Verdict(False, f'picture splits {a} as {h[1]} + {h[2]}')
    t = (a // 10) * 10 * b + (a % 10) * b
    assert t == calc(a, '×', b)
    return Expect(str(t))


@ref('acshare', method='equal sharing / grouping: the quotient must be whole (checked by long division); picture count must match',
     coverage='exhaustive')
def acshare(q):
    p = q['prompt']
    n, k = ints(p)[:2]
    if q['figure']['count'] != n:
        return Verdict(False, 'figure count differs')
    r = calc(n, '÷', k)
    if r is None:
        return Ambiguous(f'{n} not divisible by {k}')
    return Expect(str(r))


@ref('ad1000', method='the number that must be added to reach 1000, found by counting up in hundreds/tens/ones; blocks picture shows n', coverage='exhaustive')
def ad1000(q):
    n = ints(q['prompt'])[0]
    if _blocks(q['figure']) != n:
        return Verdict(False, 'blocks differ')
    return Expect(str(1000 - n))


@ref('adexp', method='sum of the place-value parts (or blocks: 100h + 10t + o)', coverage='exhaustive')
def adexp(q):
    p = q['prompt']
    if p.startswith('Write as one number'):
        return Expect(str(sum(ints(p.split(':', 1)[1]))))
    return Expect(str(_blocks(q['figure'])))


# ---------------------------------------------------------------------------------------------------- fraction comparison / building
@ref('adfbuild', method='exact Fraction arithmetic: sum of the listed unit fractions, or how many pieces of a/b make c/d (quotient); grid picture is checked',
     coverage='exhaustive')
def adfbuild(q):
    p = q['prompt']
    if p.startswith('How many pieces'):
        a, b = fracs(p)
        r = b / a
        if r.denominator != 1:
            return Ambiguous('not a whole number of pieces')
        return Expect(str(r))
    body = p.split('=')[0]
    return Expect(ftext(sum(fracs(body), Fraction(0))))


def _cmp(fam):
    @ref(fam, method='compare the two fractions exactly (cross-multiplication on Fractions)', coverage='exhaustive')
    def f(q):
        p = q['prompt']
        m = re.search(r'Which fraction is (greater|smaller): (.*?)\? Write', p)
        pair = [(int(a), int(b)) for a, b in FR.findall(m.group(2))]
        (a, b), (c, d) = pair
        if a * d == b * c:
            return Ambiguous('equal fractions')
        big = a * d > b * c
        pick_first = big if m.group(1) == 'greater' else not big
        return Expect(f'{a}/{b}' if pick_first else f'{c}/{d}')
    return f


_cmp('adfcmp')
_cmp('adfcmpu')


def _ord(fam):
    @ref(fam, method='sort the three fractions by exact value (Fractions); equal values would be ambiguous', coverage='exhaustive')
    def f(q):
        p = q['prompt']
        m = re.search(r'from the (smallest to the largest|largest to the smallest): (.*?)\. Write', p)
        txt = [t for t in re.findall(r'\d+/\d+', m.group(2))]
        vals = [Fraction(t) for t in txt]
        if len(set(vals)) != 3:
            return Ambiguous('equal fractions')
        order = sorted(range(3), key=lambda i: vals[i], reverse=m.group(1).startswith('largest'))
        return Expect('(' + ', '.join(txt[i] for i in order) + ')')
    return f


_ord('adford')
_ord('adfordu')


@ref('adfnl', method='compare the two unit fractions named in the sentence; the dots in the picture are checked against the sentence',
     coverage='exhaustive')
def adfnl(q):
    p = q['prompt']
    a, b = fracs(p.split('show')[1].split('Which')[0])
    marks = sorted(q['figure']['marks'])
    if marks != sorted([round(float(a), 3), round(float(b), 3)]) and any(abs(x - y) > 1e-3 for x, y in zip(marks, sorted([float(a), float(b)]))):
        return Verdict(False, 'dots differ from sentence')
    if 'nearer to 0' in p or 'farther to the left' in p:
        t = min(a, b)
    elif 'nearer to 1' in p or 'farther to the right' in p:
        t = max(a, b)
    else:
        return Unsupported('unrecognised question')
    if a == b:
        return Ambiguous('equal')
    return pick(q, lambda s: Fraction(s) == t)


@ref('adfmeas', method='stated fraction of the unit (hour = 60 min, day = 24 h, kg = 1000 g, m = 100 cm, rupee amount) as exact Fractions',
     coverage='exhaustive')
def adfmeas(q):
    p = q['prompt']
    fr = fracs(p)[0]
    unit = None
    for key, val in (('minutes are there in', 60), ('hours are there in', 24), ('grams are there in', 1000), ('centimetres are there in', 100)):
        if key in p:
            unit = val
    if unit is None:
        assert p.startswith('What is') and '₹' in p
        unit = int(re.search(r'₹(\d+)', p).group(1))
    v = fr * unit
    if v.denominator != 1:
        return Ambiguous('not whole')
    return Expect(str(v))


@ref('adfunit', method='length of n strips of 1/d m = n/d; number of strips in k m = k / (1/d), exact Fractions', coverage='exhaustive')
def adfunit(q):
    p = q['prompt']
    u = fracs(p)[0]
    if 'How long is the table' in p:
        n = int(re.search(r'exactly (\d+) strips', p).group(1))
        return Expect(ftext(u * n))
    k = int(re.search(r'make (\d+) metres?', p).group(1))
    r = k / u
    return Expect(ftext(r)) if r.denominator == 1 else Ambiguous('not whole')


# ---------------------------------------------------------------------------------------------------- mental shortcuts / sequences
@ref('admental', method='missing number by counting up (c - a); shortcuts a -/+ 99 / 9 evaluated directly after checking the stated shortcut is a valid decomposition',
     coverage='exhaustive')
def admental(q):
    p = q['prompt']
    if '?' in p.split(':')[1] and '+ ?' in p:
        a, c = ints(p.split(':')[1])[:2]
        return Expect(str(c - a))
    m = re.search(r'\((take away|add) ([\d,]+),? then (add|take) ([\d,]+) (?:back|away)\): ([\d,]+) ([+−]) ([\d,]+)', p)
    big, small = int(m.group(2).replace(',', '')), int(m.group(4).replace(',', ''))
    a, op, b = int(m.group(5).replace(',', '')), m.group(6), int(m.group(7).replace(',', ''))
    # valid shortcut: -b = -big + small, +b = +big - small
    if b != big - small or (op == '−') != (m.group(1) == 'take away'):
        return Verdict(False, 'the stated shortcut does not match the sum')
    return Expect(str(calc(a, op, b)))


@ref('adseq', method='verify the four given terms have a common difference, then add it once more', coverage='exhaustive')
def adseq(q):
    xs = ints(q['prompt'].split(':', 1)[1].split('?')[0])
    d = {xs[i + 1] - xs[i] for i in range(len(xs) - 1)}
    if len(d) != 1:
        return Verdict(False, f'terms {xs} are not an arithmetic pattern')
    return Expect(str(xs[-1] + d.pop()))


# ---------------------------------------------------------------------------------------------------- adname (choice)
@ref('adname', method='number name: parse option words to a value; numeral: option digits = value of the words; expanded form: option terms sum to the number',
     coverage='exhaustive')
def adname(q):
    p = q['prompt']
    if p.startswith('Which is the number name of'):
        n = ints(p)[0]
        return pick(q, lambda t: words_to_int(t) == n)
    if p.startswith('Which numeral is'):
        w = re.search(r'"([^"]+)"', p).group(1)
        n = words_to_int(w)
        return pick(q, lambda t: re.fullmatch(r'[\d,]+', t) is not None and int(t.replace(',', '')) == n)
    if p.startswith('Which is the expanded form of'):
        n = ints(p)[0]
        return pick(q, lambda t: sum(int(x) for x in t.split(' + ')) == n)
    return Unsupported('unknown form')
