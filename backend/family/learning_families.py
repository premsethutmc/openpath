"""Generated questions ("gen:<family>:<params>", packages/learning/src/families.ts): which ids exist, their competency,
answer type and answer, so the server can check a record that refers to one. The same rules as the app; a parity test
(content/learning/families-parity.v1.json, written by the app's own code) keeps them identical.
"""
import json
import math
import re
from fractions import Fraction
from functools import lru_cache
from pathlib import Path

from django.conf import settings

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


EXP = 'MATH.number.exponents'


def _sgn(v):
    return (v > 0) - (v < 0)


def _pow(p):
    a, n = p
    if a < 2 or a > 12 or n < 2 or n > 5 or a ** n > 100000:
        return None
    return EXP, 'integer', a ** n, [a * n, a ** (n - 1), a + n]


def _dist(p):
    a, b = p
    if a < 2 or a > 12 or b < 1 or b > 12:
        return None
    return 'MATH.algebra.identities-intro', 'integer', a * b, [b, a + b, a * (b + 1)]


def _expand(p):
    a, b = p
    if a == 0 or b == 0 or abs(a) > 12 or abs(b) > 12 or a + b == 0:
        return None
    firsts = [a * b, a]
    if _sgn(a) != _sgn(b):
        firsts.append(-(a + b) if abs(a) + abs(b) == a + b else _sgn(a + b) * (abs(a) + abs(b)))
    return 'MATH.algebra.identities', 'integer', a + b, firsts


def _dpow(p):
    k, n, t = p
    if k < 1 or k > 9 or n < 2 or n > 5 or t < 1 or t > 4 or k * n * t ** (n - 1) > 5000:
        return None
    firsts = [k * n * t ** n, k * t ** (n - 1), k * t ** n]
    if n - 1 >= 2 and t >= 2:
        firsts.append(k * n * t * (n - 1))
    return 'MATH.calculus.derivative-rules', 'integer', k * n * t ** (n - 1), firsts


def _pint(p):
    a, b, k, n = p
    if a < 0 or b <= a or b > 4 or k < 1 or k > 12 or n < 1 or n > 3:
        return None
    F = lambda x: Fraction(k * x ** (n + 1), n + 1)
    firsts = [k * (b ** (n + 1) - a ** (n + 1)), k * n * (b ** (n - 1) - a ** (n - 1)), Fraction(k * (b ** n - a ** n), n)]
    if a > 0:
        firsts.append(Fraction(k * b ** (n + 1), n + 1))
    if b >= 2:
        firsts.append(Fraction(k * ((n + 1) * b - (n + 1) * a), n + 1))
    return 'MATH.calculus.indefinite-integrals', 'fraction', F(b) - F(a), firsts


def _subst(p):
    a, b, c, n = p
    if a < 0 or b <= a or b > 3 or c < 1 or c > 4 or n < 1 or n > 3:
        return None
    u1, u2 = a * a + c, b * b + c
    d = u2 ** (n + 1) - u1 ** (n + 1)
    firsts = [Fraction(b ** (n + 1) - a ** (n + 1), n + 1), d, Fraction(d, 2 * (n + 1))]
    if u2 <= 12 and n + 1 <= 5:
        firsts.append(u2 - u1)
    return 'MATH.calculus.integration-methods', 'fraction', Fraction(d, n + 1), firsts


def _disc(p):
    pp, q = p
    if abs(pp) > 12 or abs(q) > 40 or pp == 0 or q == 0:
        return None
    d = pp * pp - 4 * q
    return 'MATH.algebra.quadratic-discriminant', 'integer', 2 if d > 0 else 1 if d == 0 else 0, 'fixed:0,1,2'


def _options(answer, firsts):
    """The multiple-choice options (families.ts mcOptions): the answer and up to three mal-rule answers, topped up."""
    if firsts == 'fixed:0,1,2':
        return [Fraction(0), Fraction(1), Fraction(2)]
    answer = Fraction(answer)
    out = []

    def add(v):
        v = Fraction(v)
        if v != answer and v not in out and (answer < 0 or v >= 0) and len(out) < 3:
            out.append(v)
    for v in firsts:
        add(v)
    for v in [answer + 1, answer - 1, answer + 2, 2 * answer, answer + 3, answer - 2]:
        add(v)
    return sorted(out + [answer])


MC = {'pow': (2, _pow), 'dist': (2, _dist), 'expand': (2, _expand), 'dpow': (3, _dpow), 'pint': (4, _pint), 'subst': (4, _subst), 'disc': (2, _disc)}

FAMILIES = {'mul': (2, _mul), 'rect': (2, _rect), 'eqfrac': (3, _eqfrac), 'fadd': (4, _fadd), 'cint': (3, _cint), 'quad': (2, _quad),
            'linev': (3, _linev), 'meet': (2, _meetf), 'above': (3, _above), 'alp': (2, _alp)}


@lru_cache
def _table():
    """The release pool of every family (content/learning/generated.v1.json, written by the app's own code)."""
    return json.loads((Path(settings.BASE_DIR).parent / 'content/learning/generated.v1.json').read_text())['families']


def generated(qid):
    """A generated question as {competency, type, answer}, or None if the id is unknown or unsupported.
    "gen:<family>:<params>:mc" is the multiple-choice form of a family that has one: the answer is a letter.
    The families written before families@2 are computed here (any supported parameters, as a learner may type a
    problem); every family's release pool is also in the generated table, which is the only source for the rest."""
    r = _mirror(qid)
    if r is not None:
        return r
    m = re.fullmatch(r'gen:([a-z0-9]+):(-?\d+(?:,-?\d+)*)(:mc|:w)?', qid or '')
    fam = _table().get(m.group(1)) if m else None
    key = f"{m.group(2)}{m.group(3) or ''}" if m else ''
    if not fam or key not in fam['items']:
        return None
    return {'id': qid, 'competency': fam['competency'], 'type': 'choice' if m.group(3) == ':mc' else fam['type'], 'answer': fam['items'][key], 'role': 'generated'}


def _mirror(qid):
    m = re.fullmatch(r'gen:([a-z]+):(-?\d+(?:,-?\d+)*)(:mc)?', qid or '')
    if not m or (m.group(1) not in FAMILIES and m.group(1) not in MC):
        return None
    arity, fn = FAMILIES.get(m.group(1)) or MC[m.group(1)]
    p = [int(x) for x in m.group(2).split(',')]
    if len(p) != arity:
        return None
    if m.group(3) and m.group(1) not in MC:
        return None
    r = fn(p)
    if r is None:
        return None
    if m.group(1) in MC:
        competency, kind, answer, firsts = r
        if m.group(3):
            options = _options(answer, firsts)
            return {'id': qid, 'competency': competency, 'type': 'choice', 'answer': 'ABCD'[options.index(Fraction(answer))], 'options': [_show(o) for o in options], 'role': 'generated'}
        return {'id': qid, 'competency': competency, 'type': kind, 'answer': _show(answer), 'role': 'generated'}
    competency, kind, answer = r
    return {'id': qid, 'competency': competency, 'type': kind, 'answer': answer if kind == 'choice' else _show(answer), 'role': 'generated'}
