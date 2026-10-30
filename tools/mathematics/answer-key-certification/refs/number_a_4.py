"""number-a references, part 4: ag*, ah*, ai* families (factors, multiples, fractions, percentages, decimals, squares)."""
import math
import re
from decimal import Decimal, ROUND_HALF_UP

from kit import ref, Expect, Verdict, Unsupported, Ambiguous, Fraction
from refs.number_a_common import *  # noqa: F401,F403
from refs.number_a_common import (opts, ints, decs, pick, calc, first_arith, evalexpr, ftext, dtext, mixedtext, divisors, is_prime, gcd_b,
                                  lcm_b, SUP)

FR = re.compile(r'(\d+)/(\d+)')


# ---------------------------------------------------------------------------------------------------- order of operations
@ref('agbod', method='exact Fraction evaluation of the expression with an AST evaluator (brackets, then x and /, then + and -, left to right)',
     coverage='exhaustive')
def agbod(q):
    e = q['prompt'].split('Work out', 1)[1].strip().rstrip('.')
    v = evalexpr(e)
    if v.denominator != 1:
        return Verdict(False, f'value {v} is not a whole number')
    return Expect(str(v))


def _split_terms(expr):
    """top-level terms of an expression: [(sign, text)]"""
    terms, depth, cur, sign = [], 0, '', 1
    for ch in expr.replace(' ', ''):
        if ch == '(':
            depth += 1
        elif ch == ')':
            depth -= 1
        if depth == 0 and ch in '+−' and cur:
            terms.append((sign, cur))
            cur, sign = '', (1 if ch == '+' else -1)
        else:
            cur += ch
    terms.append((sign, cur))
    return terms


@ref('agterm', method='split the expression at its top-level + and - signs (brackets respected) and evaluate the pieces exactly', coverage='exhaustive')
def agterm(q):
    p = q['prompt']
    if p.startswith('How many terms'):
        e = re.search(r'expression (.*) have\?', p).group(1)
        return Expect(str(len(_split_terms(e))))
    e = re.search(r'In the expression (.*?) what is the value of the (\w+) term', p)
    idx = {'first': 0, 'second': 1, 'third': 2, 'fourth': 3, 'fifth': 4}[e.group(2)]
    t = _split_terms(e.group(1))
    if idx >= len(t):
        return Verdict(False, 'term index out of range')
    s, txt = t[idx]
    return Expect(str(s * evalexpr(txt)))


@ref('agwrite', method='value of the story computed by hand from its numbers; the option whose expression (usual precedence, exact Fractions) has that value',
     coverage='exhaustive')
def agwrite(q):
    p = q['prompt']
    n = ints(p)
    if 'packets with' in p:
        a, b, c = n[:3]
        v = a + b * c
    elif 'pens costing' in p:
        a, b, c = n[:3]
        v = a - b * c
    elif 'rows of chairs' in p:
        r, a, b = n[:3]
        v = r * (a + b)
    elif 'get off and then' in p:
        a, b, c = n[:3]
        v = a - b + c
    elif 'shared equally' in p:
        a, b, c = n[:3]
        v = Fraction(a) + Fraction(b, c)
    elif 'taken out for a neighbour' in p:
        a, b, c = n[:3]
        v = a * (b - c)
    else:
        return Unsupported('unknown story')
    vals = [evalexpr(t) for t in opts(q)]
    return pick(q, lambda t: evalexpr(t) == v)


# ---------------------------------------------------------------------------------------------------- factors, primes
@ref('agcomf', method='divisors of both numbers found by trial division 1..min and intersected', coverage='exhaustive')
def agcomf(q):
    a, b = ints(q['prompt'])[:2]
    return Expect(','.join(str(d) for d in range(1, min(a, b) + 1) if a % d == 0 and b % d == 0))


@ref('agfac', method='trial division 1..n; the array picture must be a factor pair of n', coverage='exhaustive')
def agfac(q):
    n = ints(q['prompt'])[0]
    fg = q['figure']
    cells = fg['count'] if fg['type'] == 'dots' else fg['rows'] * fg['cols']
    if cells != n:
        return Verdict(False, 'picture is not n objects')
    return Expect(','.join(map(str, divisors(n))))


@ref('agprime', method='trial division by every d <= sqrt(n); endpoints inclusive', coverage='exhaustive')
def agprime(q):
    a, b = ints(q['prompt'])[:2]
    ps = [n for n in range(a, b + 1) if is_prime(n)]
    if not ps:
        return Ambiguous('no prime in the range')
    return Expect(','.join(map(str, ps)))


@ref('agptest', method='smallest divisor > 1 by trial division; largest prime <= sqrt(n) for the "primes needed" form (n must be prime)', coverage='exhaustive')
def agptest(q):
    p = q['prompt']
    n = ints(p)[0]
    if p.startswith('What is the smallest prime factor'):
        d = next(d for d in range(2, n + 1) if n % d == 0)
        return Expect(str(d))
    if not is_prime(n):
        return Verdict(False, f'{n} is not prime although the statement says no prime divides it')
    ps = [d for d in range(2, n) if d * d <= n and is_prime(d)]
    return Expect(str(max(ps)))


@ref('agcop', method='gcd by exhaustive search of common divisors; exactly one pair must be co-prime', coverage='exhaustive')
def agcop(q):
    def cop(t):
        a, b = (int(x) for x in re.fullmatch(r'(\d+) and (\d+)', t).groups())
        return gcd_b(a, b) == 1
    return pick(q, cop)


@ref('aghcf3', method='largest d dividing all three (search)', coverage='exhaustive')
def aghcf3(q):
    xs = ints(q['prompt'].split('(HCF) of')[1])[:3]
    return Expect(str(max(d for d in range(1, min(xs) + 1) if all(x % d == 0 for x in xs))))


@ref('aglcm', method='smallest positive multiple of the larger number divisible by the other (search)', coverage='exhaustive')
def aglcm(q):
    a, b = ints(q['prompt'].split('(LCM) of')[1])[:2]
    return Expect(str(lcm_b(a, b)))


@ref('aglcm3', method='smallest positive multiple of the largest number divisible by all three (search)', coverage='exhaustive')
def aglcm3(q):
    xs = ints(q['prompt'].split('(LCM) of')[1])[:3]
    return Expect(str(lcm_b(*xs)))


@ref('agjump', method='landing sets of the two jumpers listed by counting; intersection within 1..limit', coverage='exhaustive')
def agjump(q):
    p = q['prompt']
    a = int(re.search(r'jumps (\d+) at a time\. A rabbit', p).group(1))
    b = int(re.search(r'rabbit starts at 0 and jumps (\d+) at a time', p).group(1))
    L = int(re.search(r'up to (\d+) where both', p).group(1))
    fa = set(range(a, L + 1, a))
    fb = set(range(b, L + 1, b))
    both = sorted(fa & fb)
    if not both:
        return Ambiguous('no common landing')
    return Expect(','.join(map(str, both)))


def parse_fact(txt):
    """'2² × 5² × 7' -> (value, all factors prime)"""
    val, ok = 1, True
    for t in txt.split(' × '):
        t = t.strip()
        m = re.fullmatch(r'(\d+)([⁰¹²³⁴⁵⁶⁷⁸⁹]*)', t)
        base = int(m.group(1))
        e = int(m.group(2).translate(SUP)) if m.group(2) else 1
        ok = ok and is_prime(base)
        val *= base ** e
    return val, ok


@ref('agfta', method='the stated prime factorisations are checked (product and primality); HCF / LCM by exhaustive search on the numbers themselves',
     coverage='exhaustive')
def agfta(q):
    p = q['prompt']
    m = re.match(r'(\d+) = (.*?) and (\d+) = (.*?)\. Use these prime factorisations to find the (HCF|LCM) of (\d+) and (\d+)', p)
    a, fa, b, fb, kind, x, y = m.groups()
    a, b = int(a), int(b)
    for n, f in ((a, fa), (b, fb)):
        v, ok = parse_fact(f)
        if v != n or not ok:
            return Verdict(False, f'stated factorisation {n} = {f} is wrong (product {v}, primes {ok})')
    if (int(x), int(y)) != (a, b):
        return Verdict(False, 'numbers differ')
    return Expect(str(gcd_b(a, b) if kind == 'HCF' else lcm_b(a, b)))


@ref('aghlp', method='stated HCF / LCM fact is checked by search; the asked quantity is found by search (not by the formula) and the formula is only used for consistency',
     coverage='exhaustive')
def aghlp(q):
    p = q['prompt']
    if p.startswith('The HCF of'):
        a, b, h = ints(p)[:3]
        if gcd_b(a, b) != h:
            return Verdict(False, f'HCF({a},{b}) is {gcd_b(a, b)}, not {h}')
        return Expect(str(lcm_b(a, b)))
    if p.startswith('The LCM of'):
        a, b, l = ints(p)[:3]
        if lcm_b(a, b) != l:
            return Verdict(False, f'LCM({a},{b}) is {lcm_b(a, b)}, not {l}')
        return Expect(str(gcd_b(a, b)))
    h, l, a = ints(p)[:3]
    cands = [b for b in range(1, h * l + 1) if gcd_b(a, b) == h and lcm_b(a, b) == l] if h * l <= 5000 else None
    if cands is None:
        b = (h * l) // a
        if (h * l) % a or gcd_b(a, b) != h or lcm_b(a, b) != l:
            return Verdict(False, 'no consistent partner')
        cands = [b]
    if len(cands) != 1:
        return Ambiguous(f'partners {cands}')
    return Expect(str(cands[0]))


@ref('aghlw', method='the wording decides HCF (as long as possible / largest group / greatest number of plates) or LCM (next together / smallest number from packets); found by exhaustive search on the quantities',
     coverage='exhaustive')
def aghlw(q):
    p = q['prompt']
    a, b = ints(p)[:2]
    if 'as long as possible' in p or 'largest possible group size' in p or 'greatest number of plates' in p:
        return Expect(str(gcd_b(a, b)))
    if 'next arrive together' in p or 'next at the starting point together' in p or 'smallest number of each' in p:
        if 'a.m.' in p:
            a, b = ints(p)[:2]
        return Expect(str(lcm_b(a, b)))
    return Unsupported('unrecognised situation')


# ---------------------------------------------------------------------------------------------------- fractions
@ref('agimp', method='(whole x denominator + numerator) / denominator by exact Fractions', coverage='exhaustive')
def agimp(q):
    w, a, b = ints(q['prompt'])[:3]
    if a >= b:
        return Verdict(False, 'fraction part is not proper')
    return Expect(ftext(Fraction(w * b + a, b)))


def _good_mixed(t, v):
    """t is a mixed number in the required form (proper fractional part in lowest terms) equal to v"""
    m = re.fullmatch(r'(\d+) (\d+)/(\d+)', t)
    if not m:
        return False
    w, a, b = (int(x) for x in m.groups())
    return a < b and math.gcd(a, b) == 1 and Fraction(w * b + a, b) == v


def _good_frac(t, v):
    m = re.fullmatch(r'(\d+)/(\d+)', t)
    return bool(m) and math.gcd(int(m.group(1)), int(m.group(2))) == 1 and Fraction(t) == v


def _mc_form_check(q, v, good):
    """the multiple-choice form: exactly one option is the right value in the required form and it is the keyed one"""
    mc = q.get('mc')
    if not mc:
        return None
    hits = [i for i, t in enumerate(mc['options']) if good(t, v)]
    if hits != ['ABCD'.index(mc['key'])]:
        return Verdict(False, f'mc form: options {mc["options"]} key {mc["key"]} correct-in-form {hits}')
    return None


@ref('agmix', method='whole part and remainder by division, written as a mixed number in lowest terms', coverage='exhaustive')
def agmix(q):
    a, b = ints(q['prompt'])[:2]
    fr = Fraction(a, b)
    if fr.denominator == 1:
        return Ambiguous('whole number')
    bad = _mc_form_check(q, fr, _good_mixed)
    return bad or Expect(mixedtext(fr), form=True)


@ref('agnl', method='n jumps of 1/d from 0 = n/d as a mixed number in lowest terms; the picture must show the n jumps of 1/d', coverage='exhaustive')
def agnl(q):
    p = q['prompt']
    n = int(re.search(r'makes (\d+) equal jumps', p).group(1))
    d = int(re.search(r'jumps of 1/(\d+)', p).group(1))
    j = q['figure']['jumps']
    pos = Fraction(0)
    for _ in range(n):
        pos += Fraction(1, d)
    if len(j) != n or any(abs(j[i][1] - float(Fraction(i + 1, d))) > 1e-9 for i in range(n)):
        return Verdict(False, 'picture jumps differ from sentence')
    bad = _mc_form_check(q, pos, lambda t, v: _good_mixed(t, v) or (re.fullmatch(r'\d+', t) is not None and Fraction(t) == v) or _good_frac(t, v))
    return bad or Expect(mixedtext(pos), form=True)


@ref('agclass', method='proper: numerator < denominator; improper: numerator >= denominator; mixed: whole part with a proper fraction', coverage='exhaustive')
def agclass(q):
    p = q['prompt']
    n = ints(p)
    if len(n) == 3:
        w, a, b = n
        kind = 'mixed number' if a < b else None
        if kind is None:
            return Verdict(False, 'mixed number with improper part')
    else:
        a, b = n
        kind = 'proper fraction' if a < b else 'improper fraction'
    full = {'proper fraction': 'a proper fraction', 'improper fraction': 'an improper fraction', 'mixed number': 'a mixed number'}[kind]
    return pick(q, lambda t: t == full)


# ---------------------------------------------------------------------------------------------------- decimals, percentages
def _decfrac(t):
    return Fraction(t)


@ref('agdec', method='exact Fraction sum / difference of the two decimals (cross-checked with Decimal arithmetic)', coverage='exhaustive')
def agdec(q):
    m = re.search(r'Work out (\d+\.?\d*) ([+−]) (\d+\.?\d*)', q['prompt'])
    a, b = Fraction(m.group(1)), Fraction(m.group(3))
    r = a + b if m.group(2) == '+' else a - b
    dd = Decimal(m.group(1)) + Decimal(m.group(3)) if m.group(2) == '+' else Decimal(m.group(1)) - Decimal(m.group(3))
    assert Fraction(dd) == r
    if r < 0:
        return Verdict(False, 'negative result')
    return Expect(dtext(r))


@ref('aidmul', method='exact Fraction product of the decimals (cross-checked with Decimal)', coverage='exhaustive')
def aidmul(q):
    m = re.search(r'(\d+\.?\d*) × (\d+\.?\d*)', q['prompt'])
    r = Fraction(m.group(1)) * Fraction(m.group(2))
    assert Fraction(Decimal(m.group(1)) * Decimal(m.group(2))) == r
    return Expect(dtext(r))


@ref('aiddiv', method='exact Fraction quotient of the decimals (must terminate); cross-checked by multiplying back', coverage='exhaustive')
def aiddiv(q):
    m = re.search(r'(\d+\.?\d*) ÷ (\d+\.?\d*)', q['prompt'])
    a, b = Fraction(m.group(1)), Fraction(m.group(2))
    r = a / b
    try:
        t = dtext(r)
    except ValueError:
        return Ambiguous(f'{a}/{b} does not terminate')
    assert Fraction(t) * b == a
    return Expect(t)


@ref('aidp10', method='shift the decimal point: exact Fraction times / divided by 10^k', coverage='exhaustive')
def aidp10(q):
    m = re.search(r'(\d+\.?\d*) ([×÷]) (\d+) = \?', q['prompt'])
    a, k = Fraction(m.group(1)), int(m.group(3))
    r = a * k if m.group(2) == '×' else a / k
    return Expect(dtext(r))


@ref('aidword', method='division word problems as exact Fractions: money shared must come out in whole paise, counts must be whole numbers, per-litre rate exact',
     coverage='exhaustive')
def aidword(q):
    p = q['prompt']
    if '₹' in p:
        a = decs(p)[0]
        k = ints(p.split('among')[1])[0]
        r = a / k
        if (r * 100).denominator != 1:
            return Verdict(False, f'{a}/{k} is not a whole number of paise')
        return Expect(dtext(r))
    if p.startswith('A car goes'):
        a, litres = decs(p)[:2]
        r = a / litres
        try:
            return Expect(dtext(r))
        except ValueError:
            return Ambiguous('non-terminating')
    a, b = decs(p)[:2]
    r = a / b
    if r.denominator != 1:
        return Verdict(False, f'{a} / {b} = {r} is not a whole number of pieces/bags')
    return Expect(str(r))


@ref('agrupee', method='rupees and paise as integer paise (exact), printed with two decimals as the prompt requests', coverage='exhaustive')
def agrupee(q):
    m = re.search(r'₹(\d+\.\d\d) ([+−]) ₹(\d+\.\d\d)', q['prompt'])
    a, b = int(m.group(1).replace('.', '')), int(m.group(3).replace('.', ''))
    r = a + b if m.group(2) == '+' else a - b
    if r < 0:
        return Verdict(False, 'negative amount')
    return Expect(f'{r // 100}.{r % 100:02d}', form=True)


@ref('agmeas', method='convert the smaller unit (m/cm 100, km/m 1000, kg/g 1000, L/mL 1000) with exact Fractions, add or subtract by the story verb',
     coverage='exhaustive')
def agmeas(q):
    p = q['prompt']
    big = decs(p)[0]
    small = decs(p)[1]
    m = re.search(r'(\d+(?:\.\d+)?) (km|kg|L|m)\b.*?(\d+) (cm|m|g|mL)\b', p)
    bu, su = m.group(2), m.group(4)
    factor = {('m', 'cm'): 100, ('km', 'm'): 1000, ('kg', 'g'): 1000, ('L', 'mL'): 1000}[(bu, su)]
    if not p.rstrip().endswith('in ' + {'m': 'metres', 'km': 'km', 'kg': 'kg', 'L': 'litres'}[bu] + '?'):
        return Verdict(False, 'the answer unit asked for is not the large unit of the story')
    sub = any(k in p for k in ('pours out', 'already walked', 'takes out', 'cuts off'))
    add = any(k in p for k in ('joins', 'adds', 'buys', 'cycles'))
    if sub == add:
        return Unsupported('operation not determined')
    v = big - Fraction(small) / factor if sub else big + Fraction(small) / factor
    return Expect(dtext(v))


@ref('agpct', method='per cent = value x 100 as an exact Fraction', coverage='exhaustive')
def agpct(q):
    p = q['prompt'].split('as a percentage')[0]
    m = FR.search(p)
    v = Fraction(int(m.group(1)), int(m.group(2))) if m else Fraction(re.search(r'Write (\d+\.?\d*)', p).group(1))
    r = v * 100
    try:
        return Expect(dtext(r))
    except ValueError:
        return Expect(ftext(r))


@ref('agpctd', method='per cent / 100 as an exact Fraction written as a decimal', coverage='exhaustive')
def agpctd(q):
    v = Fraction(re.search(r'Write (\d+\.?\d*)%', q['prompt']).group(1))
    return Expect(dtext(v / 100))


@ref('agpfrac', method='percentage / 100 or decimal as an exact Fraction in lowest terms, mixed number when above 1 (as the prompt asks)', coverage='exhaustive')
def agpfrac(q):
    p = q['prompt']
    m = re.search(r'Write (\d+\.?\d*)(%)? as a fraction', p)
    v = Fraction(m.group(1)) / (100 if m.group(2) else 1)
    bad = _mc_form_check(q, v, lambda t, v: _good_mixed(t, v) or _good_frac(t, v) or (re.fullmatch(r'\d+', t) is not None and Fraction(t) == v))
    return bad or Expect(mixedtext(v), form=True)


@ref('agfdec', method='exact value of the fraction compared with each option read as a decimal or a per cent', coverage='exhaustive')
def agfdec(q):
    p = q['prompt']
    a, b = ints(p)[:2]
    v = Fraction(a, b)
    if 'percentage' in p:
        return pick(q, lambda t: t.endswith('%') and Fraction(t[:-1]) / 100 == v)
    return pick(q, lambda t: re.fullmatch(r'\d+(\.\d+)?', t) is not None and Fraction(t) == v)


# ---------------------------------------------------------------------------------------------------- squares
@ref('ahpsq', method='perfect square test by integer square root; last digit of n^2 by computing n^2', coverage='exhaustive')
def ahpsq(q):
    p = q['prompt']
    if p.startswith('Exactly one'):
        return pick(q, lambda t: math.isqrt(int(t)) ** 2 == int(t))
    n = int(re.search(r'does (\d+)² end in', p).group(1))
    last = str(n * n)[-1]
    return pick(q, lambda t: t == last)


@ref('ahsqd', method='high-precision (60-digit) square root rounded half-up to one decimal; perfect squares would be out of scope', coverage='exhaustive')
def ahsqd(q):
    n = int(re.search(r'√(\d+)', q['prompt']).group(1))
    if math.isqrt(n) ** 2 == n:
        return Verdict(False, f'{n} is a perfect square')
    r = Decimal(n).sqrt().quantize(Decimal('0.1'), rounding=ROUND_HALF_UP)
    return Expect(str(r))
