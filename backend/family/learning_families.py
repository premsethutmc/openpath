"""Generated questions ("gen:<family>:<params>", packages/learning/src/families.ts): which ids exist, their competency,
answer type and answer, so the server can check a record that refers to one. The same rules as the app; a parity test
(content/learning/families-parity.v1.json, written by the app's own code) keeps them identical.
"""
import math
import re
from fractions import Fraction

MT = 'MATH.number.multiplication-tables'


def _ints(xs):
    return [int(x) if float(x).is_integer() else x for x in xs]


def _show(v):
    if isinstance(v, list):
        return ','.join(_show(x) for x in sorted(v))
    f = Fraction(v).limit_denominator(1000)
    return str(f.numerator) if f.denominator == 1 else f'{f.numerator}/{f.denominator}'


def _meet(m, c, lo=-4, hi=4):
    return [x for x in range(lo, hi + 1) if x * x == m * x + c]


def _mul(p):
    a, b = p
    if a < 1 or b < 1 or a > 12 or b > 12:
        return None
    return MT, 'integer', a * b


def _rect(p):
    l, w = p
    if l < 1 or w < 1 or l > 12 or w > 12:
        return None
    return 'MATH.measurement.rectangle-area', 'integer', l * w


def _eqfrac(p):
    a, b, d = p
    if b < 1 or a < 1 or d % b != 0 or d <= b or d > 100:
        return None
    return 'MATH.number.equivalent-fractions', 'integer', a * d // b


def _fadd(p):
    a, b, n, s = p
    if n < 2 or n > 20 or (s < 0 and b > a) or s not in (1, -1):
        return None
    return 'MATH.number.fraction-add-like', 'fraction', Fraction(a + s * b, n)


def _cint(p):
    a, b, c = p
    if b <= a or c < 1 or c > 12 or b - a > 12 or a < 0:
        return None
    return 'MATH.calculus.definite-integrals', 'integer', c * (b - a)


def _quad(p):
    pp, q = p
    d = pp * pp - 4 * q
    if d <= 0:
        return None
    r = math.isqrt(d)
    if r * r != d or (-pp + r) % 2 != 0 or abs(pp) > 20 or abs(q) > 100:
        return None
    return 'MATH.algebra.quadratics', 'set', [(-pp - r) // 2, (-pp + r) // 2]


def _linev(p):
    m, c, t = p
    if abs(m) > 12 or abs(c) > 50 or abs(t) > 12:
        return None
    return 'MATH.algebra.variables', 'integer', m * t + c


def _meetf(p):
    m, c = p
    v = _meet(m, c)
    return ('MATH.algebra.linear-equations', 'set', v) if len(v) == 2 else None


def _above(p):
    m, c, t = p
    if m * t + c == t * t:
        return None
    return 'MATH.algebra.functions', 'choice', 'A' if m * t + c > t * t else 'B'


def _alp(p):
    m, c = p
    d = m * m + 4 * c
    if d <= 0:
        return None
    r = math.isqrt(d)
    if r * r != d or (m + r) % 2 != 0:
        return None
    x1, x2 = Fraction(m - r, 2), Fraction(m + r, 2)
    F = lambda x: Fraction(m) * x * x / 2 + c * x - x * x * x / 3
    return 'MATH.calculus.area-integrals', 'fraction', F(x2) - F(x1)


FAMILIES = {'mul': (2, _mul), 'rect': (2, _rect), 'eqfrac': (3, _eqfrac), 'fadd': (4, _fadd), 'cint': (3, _cint), 'quad': (2, _quad),
            'linev': (3, _linev), 'meet': (2, _meetf), 'above': (3, _above), 'alp': (2, _alp)}


def generated(qid):
    """A generated question as {competency, type, answer}, or None if the id is unknown or unsupported."""
    m = re.fullmatch(r'gen:([a-z]+):(-?\d+(?:,-?\d+)*)', qid or '')
    if not m or m.group(1) not in FAMILIES:
        return None
    arity, fn = FAMILIES[m.group(1)]
    p = [int(x) for x in m.group(2).split(',')]
    if len(p) != arity:
        return None
    r = fn(p)
    if r is None:
        return None
    competency, kind, answer = r
    return {'id': qid, 'competency': competency, 'type': kind, 'answer': answer if kind == 'choice' else _show(answer), 'role': 'generated'}
