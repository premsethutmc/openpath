"""helpers shared by the algebra-a reference modules (no production code)"""
import re
import sys
import os
from fractions import Fraction as Fr
import itertools
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
import kit  # noqa: E402
import sympy as sp  # noqa: E402
from mathtext import expr as mexpr  # noqa: E402

X = sp.Symbol('x')
ORD = {'once': 1}


def ints(s):
    return [int(t) for t in re.findall(r'-?\d+', s.replace('−', '-'))]


def U(s):
    return s.replace('−', '-').replace('≤', '<=').replace('≥', '>=').replace('×', '*').replace('÷', '/')


def fs(v):
    """Fraction -> text"""
    v = Fr(v)
    return str(v.numerator) if v.denominator == 1 else f'{v.numerator}/{v.denominator}'


def lst(vs):
    return ', '.join(fs(v) for v in vs)


def ex(s, **kw):
    """sympy expr from prompt text"""
    return mexpr(s, **kw)


def lin_ab(e, var=X):
    """a, b with e = a*var + b (checked linear)"""
    e = sp.expand(e)
    p = sp.Poly(e, var)
    assert p.degree() <= 1, e
    return Fr(str(p.coeff_monomial(var))), Fr(str(p.coeff_monomial(1)))


def Q(v):
    return Fr(str(sp.Rational(v))) if not isinstance(v, (int, Fr)) else Fr(v)


def ivl_text(lo, lc, hi, hc):
    a = '-∞' if lo is None else fs(lo)
    b = '∞' if hi is None else fs(hi)
    return f"{'[' if lc else '('}{a}, {b}{']' if hc else ')'}"


def isect(A, B):
    """intervals (lo, lc, hi, hc) None = infinite; returns intersection or None when empty"""
    lo, lc = A[0], A[1]
    if B[0] is not None and (lo is None or B[0] > lo or (B[0] == lo and not B[1])):
        lo, lc = B[0], B[1]
    hi, hc = A[2], A[3]
    if B[2] is not None and (hi is None or B[2] < hi or (B[2] == hi and not B[3])):
        hi, hc = B[2], B[3]
    if lo is not None and hi is not None and (lo > hi or (lo == hi and not (lc and hc))):
        return None
    return (lo, lc, hi, hc)


def lin_ineq(a, b, op):
    """solution interval of a*x + b op 0"""
    if a == 0:
        t = {'<': b < 0, '<=': b <= 0, '>': b > 0, '>=': b >= 0}[op]
        return (None, False, None, False) if t else None
    r = -b / a
    if a < 0:
        op = {'<': '>', '<=': '>=', '>': '<', '>=': '<='}[op]
    if op == '<':
        return (None, False, r, False)
    if op == '<=':
        return (None, False, r, True)
    if op == '>':
        return (r, False, None, False)
    return (r, True, None, False)


def split_ineq(s):
    """'A op B' -> (A, op, B) with op in < <= > >="""
    s = U(s)
    m = re.fullmatch(r'\s*(.+?)\s*(<=|>=|<|>)\s*(.+?)\s*', s)
    return m.group(1), m.group(2), m.group(3)


def ineq_ab(s):
    A, op, B = split_ineq(s)
    a, b = lin_ab(ex(A) - ex(B))
    return a, b, op


def member(s, v):
    """does x=v satisfy the inequality text s (substitution into the ORIGINAL statement)"""
    A, op, B = split_ineq(s)
    sv = sp.Rational(v.numerator, v.denominator)
    l = Fr(str(ex(A).subs(X, sv)))
    r = Fr(str(ex(B).subs(X, sv)))
    return {'<': l < r, '<=': l <= r, '>': l > r, '>=': l >= r}[op]


def digit_root_nines(n):
    n = abs(int(n))
    while n >= 10:
        n = sum(int(c) for c in str(n))
    return 0 if n == 9 else n


def pol(s, var=None):
    return sp.sympify(ex(s))


SUPD = '⁰¹²³⁴⁵⁶⁷⁸⁹'


def canon(e, gens):
    """canonical text of a polynomial with rational coefficients: descending total degree, gens order within a degree,
    unicode minus, coefficient 1 omitted, superscript powers"""
    e = sp.expand(e)
    if e == 0:
        return '0'
    P_ = sp.Poly(e, *gens)
    terms = sorted(P_.terms(), key=lambda t: (-sum(t[0]), tuple(-d for d in t[0])))
    out = ''
    for mon, c in terms:
        c = Fr(str(c))
        body = ''.join(g.name + ('' if d == 1 else ''.join(SUPD[int(ch)] for ch in str(d))) for g, d in zip(gens, mon) if d)
        mag = abs(c)
        s = (fs(mag) if (mag != 1 or not body) else '') + body
        if not out:
            out = ('−' if c < 0 else '') + s
        else:
            out += (' − ' if c < 0 else ' + ') + s
    return out
