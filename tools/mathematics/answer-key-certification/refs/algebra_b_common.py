"""helpers shared by the algebra-b reference modules (no production imports)"""
import json
import re
from fractions import Fraction

SUP = str.maketrans('⁰¹²³⁴⁵⁶⁷⁸⁹', '0123456789')
SUB = str.maketrans('₀₁₂₃₄₅₆₇₈₉', '0123456789')
OPTS = None


def options(q):
    """the option texts of a typed multiple-choice question (exported separately by the certifier from the statement data)"""
    global OPTS
    if OPTS is None:
        OPTS = json.load(open('/tmp/certout/algebra-b/choice_options.json'))
    return OPTS[q['id'].split(':')[1]][q['id']]


def letter_of(q, pred):
    """the unique option letter whose text satisfies pred (None if zero or several satisfy it)"""
    hits = [i for i, o in enumerate(options(q)) if pred(o)]
    return 'ABCD'[hits[0]] if len(hits) == 1 else None


def num(s):
    s = s.replace('−', '-').replace(',', '')
    return Fraction(s) if ('.' in s or '/' in s) else int(s)


def ints(s, signed=True):
    pat = r'−?\d+' if signed else r'\d+'
    return [int(x.replace('−', '-')) for x in re.findall(pat, s)]


def nums(s):
    return [num(x) for x in re.findall(r'−?\d+(?:\.\d+)?(?:/\d+)?', s)]


def setlit(s):
    """'{1, 2, 3}' -> set of ints"""
    return {int(x.replace('−', '-')) for x in re.findall(r'−?\d+', s)}


def fmt_set(xs):
    return ','.join(str(x) for x in sorted(xs))


def sgn(x):
    return str(x).replace('-', '−') if False else str(x)


# ---------- shared parsers (statement text -> python objects) ----------
import itertools as _it
import sympy as _sp
from sympy.parsing.sympy_parser import parse_expr, standard_transformations, implicit_multiplication_application, convert_xor

_TR = standard_transformations + (implicit_multiplication_application, convert_xor)
_SUPS = {'²': '**2', '³': '**3', '⁴': '**4', '¹': '**1', '⁵': '**5', '⁶': '**6'}


def clean(s):
    s = s.replace('−', '-').replace('×', '*').replace('·', '*').replace('÷', '/').replace('⋅', '*')
    for k, v in _SUPS.items():
        s = s.replace(k, v)
    return s


def P(s, **loc):
    """parse a school-notation algebraic string with sympy (implicit multiplication allowed)"""
    return parse_expr(clean(s), transformations=_TR, local_dict={k: _sp.Symbol(k) for k in 'xyzabcdkmnpqt'} | loc)


def isprime(n):
    return n > 1 and all(n % d for d in range(2, int(n ** 0.5) + 1))


def natset(cond, hi=400, lo=1):
    return {x for x in range(lo, hi) if cond(x)}


def builder_to_pred(cond):
    """cond like 'x is a factor of 12', 'x is even and x ≤ 8', '1 < x < 5', 'x² < 10', '2x − 1 < 10' -> python predicate"""
    c = cond
    c = re.sub(r'x is a factor of (\d+)', r'(\1 % x == 0)', c)
    c = re.sub(r'x is a multiple of (\d+)', r'(x % \1 == 0)', c)
    c = c.replace('x is even', '(x % 2 == 0)').replace('x is odd', '(x % 2 == 1)').replace('x is prime', 'isprime(x)').replace('x is a prime number', 'isprime(x)')
    c = c.replace('≤', '<=').replace('≥', '>=').replace('≠', '!=')
    c = clean(c)
    c = re.sub(r'(?<![\w)*])(\d+)x', r'\1*x', c)
    c = re.sub(r'(?<![<>=!])=(?!=)', '==', c)
    return eval('lambda x: (' + c + ')', {'isprime': isprime})
