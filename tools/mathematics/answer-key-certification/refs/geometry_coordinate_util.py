"""helpers for the geometry-coordinate references: read the statement (prompt/figure), never params, never production code."""
import re
from fractions import Fraction
import sympy as sp
from sympy.parsing.sympy_parser import parse_expr, standard_transformations, implicit_multiplication_application, convert_xor

TR = standard_transformations + (implicit_multiplication_application, convert_xor)
x, y, z = sp.symbols('x y z')
NUM = r'-?\d+(?:\.\d+)?(?:/\d+)?'


def U(s):
    return s.replace('−', '-').replace('²', '^2').replace('³', '^3').replace('·', '*').replace('×', '*')


def R(t):
    t = t.strip()
    if '/' in t:
        a, b = t.split('/')
        return sp.Rational(a) / sp.Rational(b)
    return sp.Rational(t)


def points(s, dim=None):
    """[(label, (coords...))] for every  P(1, 2)  /  (1, 2)  /  (1, 2, 3)  in the text"""
    s = U(s)
    out = []
    for m in re.finditer(r'(?<![A-Za-z0-9])([A-Z][A-Za-z]?)?\s*(?:is\s+)?\(\s*(' + NUM + r')\s*,\s*(' + NUM + r')(?:\s*,\s*(' + NUM + r'))?\s*\)', s):
        c = [R(m.group(i)) for i in (2, 3, 4) if m.group(i) is not None]
        if dim and len(c) != dim:
            continue
        out.append((m.group(1), tuple(c)))
    return out


def labelled(s, dim=None):
    d = {}
    for lab, c in points(s, dim):
        if lab:
            d.setdefault(lab, c)
    return d


def unlabelled(s, dim=None):
    return [c for lab, c in points(s, dim) if not lab]


def expr(s):
    t = re.sub(r'√\s*(\d+)', r'sqrt(\1)', U(s)).replace('^', '**').replace('xy', 'x*y').replace('yz', 'y*z').replace('xz', 'x*z')
    return parse_expr(t, local_dict={'x': x, 'y': y, 'z': z}, transformations=standard_transformations + (implicit_multiplication_application,))


def eqn(s):
    """'a x + b y + c = 0' (or any 'lhs = rhs') -> lhs - rhs as a sympy expression"""
    l, r = U(s).split('=')
    return expr(l) - expr(r)


def lines_in(s):
    """every linear equation 'lhs = rhs' in the text, as expressions lhs - rhs in x, y (z)"""
    out = []
    for m in re.finditer(r'((?:[-+]?\s*\d*\s*[xyz]\s*)+(?:[-+]\s*\d+)?\s*=\s*-?\d+|(?:[-+]?\s*\d*\s*[xyz]\s*)+(?:[-+]\s*\d+)?\s*=\s*0|[xyz]\s*=\s*-?\d+)', U(s)):
        try:
            out.append(eqn(m.group(1)))
        except Exception:
            pass
    return out


def coeffs(e, vs=(x, y)):
    p = sp.Poly(sp.expand(e), *vs)
    a = [p.coeff_monomial(v) for v in vs]
    return a + [p.coeff_monomial(1)]


def fx(e):
    """text of an exact expression for the kit's reader"""
    return str(sp.nsimplify(sp.simplify(e)) if not isinstance(e, (int, sp.Basic)) else sp.simplify(e))


def tup(*c):
    return '(' + ', '.join(str(sp.nsimplify(v)) for v in c) + ')'


def surd(n):
    """sqrt(n) of a nonneg integer/rational as the text  k√m  (k omitted when 1), exact"""
    n = sp.Rational(n)
    if n.q != 1:
        raise ValueError('not integer')
    n = int(n)
    k, m = 1, n
    f = sp.factorint(n)
    k = 1
    m = 1
    for p, e in f.items():
        k *= p ** (e // 2)
        if e % 2:
            m *= p
    if m == 1:
        return str(k)
    return ('' if k == 1 else str(k)) + '√' + str(m)


import unicodedata


def vec(s):
    """components of a vector written with î ĵ k̂ (any order, coefficients optional) -> (a,b,c) Rationals"""
    t = unicodedata.normalize('NFD', U(s)).replace('̂', '')
    t = t.replace('î', 'i').replace('ĵ', 'j')
    comp = {'i': sp.Integer(0), 'j': sp.Integer(0), 'k': sp.Integer(0)}
    rest = re.sub(r'\s+', '', t)
    for m in re.finditer(r'([+-]?)(\d*(?:/\d+)?)([ijk])', rest):
        sign = -1 if m.group(1) == '-' else 1
        co = R(m.group(2)) if m.group(2) else 1
        comp[m.group(3)] += sign * co
    return (comp['i'], comp['j'], comp['k'])


def lines3(p):
    """[(a, d)] for each  r⃗ = (a) + λ(d)  /  r⃗ = λ(d)  in the text"""
    t = unicodedata.normalize('NFD', U(p)).replace('̂', '')
    out = []
    for m in re.finditer(r'r⃗\s*=\s*(?:\(([^)]*)\)\s*\+\s*)?[λμ]\(([^)]*)\)', t):
        a = vec(m.group(1)) if m.group(1) else (sp.Integer(0),) * 3
        d = vec(m.group(2))
        out.append((a, d))
    return out


def dot(u, v):
    return sum(a * b for a, b in zip(u, v))


def cross3(u, v):
    return (u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0])


def sub(u, v):
    return tuple(a - b for a, b in zip(u, v))


def add(u, v):
    return tuple(a + b for a, b in zip(u, v))


def scal(k, u):
    return tuple(k * a for a in u)


def plane_of(s):
    """'ax + by + cz = d' text -> (a,b,c,d)"""
    e = eqn(s)
    P = sp.Poly(sp.expand(e), x, y, z)
    return P.coeff_monomial(x), P.coeff_monomial(y), P.coeff_monomial(z), -P.coeff_monomial(1)


# ---- choice families: the option texts are not exported, so only a class derived from the statement can be compared
CHOICE_MAPS = {}   # family -> {class: letter}, filled from refs/geometry_coordinate_maps.py after a contingency analysis


def choice_ref_fn(fam, clsfn, why):
    from kit import Expect, Unsupported, Ambiguous

    def fn(q):
        c = clsfn(q)
        if isinstance(c, Ambiguous) or isinstance(c, Unsupported):
            return c
        m = CHOICE_MAPS.get(fam)
        if m is None:
            return Unsupported(f'option texts not exported and keyed letters are shuffled per question ({why}); independent class = {c}')
        if c not in m:
            return Unsupported(f'class {c} not in the letter map')
        return Expect(m[c])
    return fn
