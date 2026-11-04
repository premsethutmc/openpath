"""Shared helpers for the number-a references (no production code, no generator code).

Everything here is an independent re-implementation: schoolbook digit algorithms, an English number-word parser, a
brute-force factor / prime search and an AST evaluator for arithmetic expressions with the usual precedence.
"""
import ast
import json
import math
import os
import re
from decimal import Decimal, ROUND_HALF_UP, getcontext
from fractions import Fraction

from kit import Expect, Verdict, Unsupported, Ambiguous  # noqa: F401

getcontext().prec = 80
OPTDIR = '/tmp/certout/number-a/opts'
_OPTS = {}
SUP = str.maketrans('⁰¹²³⁴⁵⁶⁷⁸⁹', '0123456789')


def fam_of(q):
    return q['id'].split(':')[1]


def opts(q):
    f = fam_of(q)
    if f not in _OPTS:
        _OPTS[f] = {}
        with open(f'{OPTDIR}/{f}.jsonl') as fh:
            for line in fh:
                d = json.loads(line)
                _OPTS[f][d['id']] = d['options']
    return _OPTS[f][q['id']]


def ints(s):
    """all integers in a text; commas inside a number (Indian or international grouping) are ignored"""
    return [int(x.replace(',', '')) for x in re.findall(r'\d+(?:,\d+)*', s)]


def decs(s):
    return [Fraction(x.replace(',', '')) for x in re.findall(r'\d+(?:,\d+)*(?:\.\d+)?', s)]


def letter(i):
    return 'ABCDEFGH'[i]


def pick(q, good, extra=''):
    """the unique option satisfying the derived condition -> its letter; otherwise the key cannot be right"""
    o = opts(q)
    idx = [i for i, t in enumerate(o) if good(t)]
    if len(idx) == 1:
        return Expect(letter(idx[0]))
    if not idx:
        return Verdict(False, f'no option is correct {extra}: {o}')
    return Verdict(False, f'{len(idx)} options are correct ({[o[i] for i in idx]}) {extra}')


# ------------------------------------------------------------------ schoolbook arithmetic on digit strings
def add_cols(a, b):
    x, y = str(a)[::-1], str(b)[::-1]
    out, carry = [], 0
    for i in range(max(len(x), len(y))):
        s = (int(x[i]) if i < len(x) else 0) + (int(y[i]) if i < len(y) else 0) + carry
        out.append(str(s % 10))
        carry = s // 10
    if carry:
        out.append(str(carry))
    return int(''.join(reversed(out)))


def sub_cols(a, b):
    """a - b by borrowing column by column, a >= b"""
    assert a >= b
    x, y = str(a)[::-1], str(b)[::-1]
    out, borrow = [], 0
    for i in range(len(x)):
        d = int(x[i]) - borrow - (int(y[i]) if i < len(y) else 0)
        borrow = 1 if d < 0 else 0
        out.append(str(d + 10 * borrow))
    return int(''.join(reversed(out)))


def mul_partial(a, b):
    """a * b as the sum of digit partial products"""
    tot = 0
    for i, ch in enumerate(reversed(str(b))):
        tot = add_cols(tot, int(ch) * a * 10 ** i) if int(ch) else tot
    return tot


def div_exact(a, b):
    """a / b by repeated subtraction of multiples (long division); None if there is a remainder"""
    if b == 0:
        return None
    q, r = 0, a
    for p in range(len(str(a)), -1, -1):
        step = b * 10 ** p
        while r >= step:
            r -= step
            q += 10 ** p
    return q if r == 0 else None


def calc(a, op, b):
    if op == '+':
        return add_cols(a, b)
    if op in ('−', '-'):
        return sub_cols(a, b) if a >= b else -sub_cols(b, a)
    if op == '×':
        return mul_partial(a, b)
    if op == '÷':
        return div_exact(a, b)
    raise ValueError(op)


ARITH = re.compile(r'(\d+(?:,\d+)*)\s*([+−×÷-])\s*(\d+(?:,\d+)*)')


def first_arith(prompt):
    m = ARITH.search(prompt)
    a, op, b = int(m.group(1).replace(',', '')), m.group(2), int(m.group(3).replace(',', ''))
    return a, op, b


def evalexpr(s):
    """value of an arithmetic expression with + - x / brackets and the usual precedence (exact Fractions)"""
    t = s.replace('×', '*').replace('÷', '/').replace('−', '-').replace(',', '')
    t = re.sub(r'(\d+(?:\.\d+)?)', r'F("\1")', t)

    def ev(n):
        if isinstance(n, ast.Expression):
            return ev(n.body)
        if isinstance(n, ast.BinOp):
            l, r = ev(n.left), ev(n.right)
            if isinstance(n.op, ast.Add):
                return l + r
            if isinstance(n.op, ast.Sub):
                return l - r
            if isinstance(n.op, ast.Mult):
                return l * r
            if isinstance(n.op, ast.Div):
                return l / r
            raise ValueError('op')
        if isinstance(n, ast.UnaryOp) and isinstance(n.op, ast.USub):
            return -ev(n.operand)
        if isinstance(n, ast.Call):
            return Fraction(n.args[0].value)
        raise ValueError(ast.dump(n))
    return ev(ast.parse(t, mode='eval'))


def dtext(fr, places=None):
    """exact decimal text of a Fraction (terminating); `places` pads/limits to that many decimals"""
    fr = Fraction(fr)
    d = fr.denominator
    while d % 2 == 0:
        d //= 2
    while d % 5 == 0:
        d //= 5
    if d != 1:
        raise ValueError('non-terminating')
    if places is None:
        places = 0
        while (fr * 10 ** places).denominator != 1:
            places += 1
    n = fr * 10 ** places
    assert n.denominator == 1
    n = int(n)
    neg = n < 0
    s = str(abs(n)).rjust(places + 1, '0')
    out = s[:-places] + '.' + s[-places:] if places else s
    return ('-' if neg else '') + out


def ftext(fr):
    fr = Fraction(fr)
    return str(fr.numerator) if fr.denominator == 1 else f'{fr.numerator}/{fr.denominator}'


def mixedtext(fr):
    fr = Fraction(fr)
    w, r = divmod(fr.numerator, fr.denominator)
    if r == 0:
        return str(w)
    return f'{w} {r}/{fr.denominator}' if w else f'{r}/{fr.denominator}'


def round_half_up(x, unit):
    """x rounded to the nearest multiple of unit, ties upward (x >= 0), exact"""
    x = Fraction(x)
    return int((x / unit + Fraction(1, 2)).__floor__()) * unit


# ------------------------------------------------------------------ number theory by brute force
def divisors(n):
    return [d for d in range(1, n + 1) if n % d == 0]


def is_prime(n):
    return n >= 2 and all(n % d for d in range(2, int(math.isqrt(n)) + 1))


def gcd_b(a, b):
    return max(d for d in divisors(min(a, b)) if a % d == 0 and b % d == 0)


def lcm_b(*xs):
    m = max(xs)
    k = m
    while any(k % x for x in xs):
        k += m
    return k


# ------------------------------------------------------------------ English number words
ONES = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen',
        'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen']
TENSW = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety']
WORDV = {w: i for i, w in enumerate(ONES)}
WORDV.update({w: 10 * i for i, w in enumerate(TENSW) if w})
SCALE = {'thousand': 10 ** 3, 'lakh': 10 ** 5, 'million': 10 ** 6, 'crore': 10 ** 7, 'billion': 10 ** 9}


def words_to_int(text):
    """None when any word is not a number word (so a distractor like 'two eight' or 'undefined' is never a match)"""
    toks = [t for t in re.split(r'[\s-]+', text.lower().strip()) if t]
    if not toks:
        return None
    total, cur = 0, 0
    for t in toks:
        if t in WORDV:
            cur += WORDV[t]
        elif t == 'hundred':
            cur *= 100
        elif t in SCALE:
            total += cur * SCALE[t]
            cur = 0
        else:
            return None
    return total + cur


def int_to_words_intl(n):
    def below1000(k):
        parts = []
        if k >= 100:
            parts += [ONES[k // 100], 'hundred']
            k %= 100
        if k >= 20:
            parts.append(TENSW[k // 10] + ('-' + ONES[k % 10] if k % 10 else ''))
        elif k > 0:
            parts.append(ONES[k])
        return ' '.join(parts)
    out = []
    for name, v in (('billion', 10 ** 9), ('million', 10 ** 6), ('thousand', 1000)):
        if n >= v:
            out.append(below1000(n // v) + ' ' + name)
            n %= v
    if n or not out:
        out.append(below1000(n))
    return ' '.join(x for x in out if x)


def group_intl(n):
    return f'{n:,}'


def group_indian(n):
    s = str(n)
    if len(s) <= 3:
        return s
    head, tail = s[:-3], s[-3:]
    parts = []
    while len(head) > 2:
        parts.insert(0, head[-2:])
        head = head[:-2]
    if head:
        parts.insert(0, head)
    return ','.join(parts + [tail])
