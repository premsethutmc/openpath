"""helpers shared by the calculus_trig_seq*.py reference modules (prompt reading only; no production code)"""
import re
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
from kit import sp, Fraction, mathtext  # noqa: E402

x, y, t, k, n_, C = sp.symbols('x y t k n C')
SUB = str.maketrans('₀₁₂₃₄₅₆₇₈₉₋', '0123456789-')
SUP = str.maketrans('⁰¹²³⁴⁵⁶⁷⁸⁹⁻', '0123456789-')


def E(s, **kw):
    """a SymPy expression from statement text (independent reader from the grading-audit oracle)"""
    return mathtext.expr(s, **kw)


def R(v):
    return sp.nsimplify(v) if not isinstance(v, sp.Basic) else v


def txt(e):
    """text of a SymPy expression readable by the oracle (ASCII)"""
    return str(e).replace('oo', '∞') if False else str(e)


def num(s):
    return sp.Rational(str(s).replace('−', '-'))


def bounds(prompt):
    """bounds of '∫₋₄⁻¹' style: returns (lo, hi) as ints"""
    m = re.search(r'∫([₀-₉₋]+)([⁰-⁹⁻]+)', prompt)
    return int(m.group(1).translate(SUB)), int(m.group(2).translate(SUP))


def set_text(S):
    """SymPy Set (of reals) -> interval text in the kit's notation"""
    def one(i):
        a = '−∞' if i.start == -sp.oo else str(i.start)
        b = '∞' if i.end == sp.oo else str(i.end)
        l = '(' if (i.left_open or i.start == -sp.oo) else '['
        r = ')' if (i.right_open or i.end == sp.oo) else ']'
        return f'{l}{a}, {b}{r}'
    if isinstance(S, sp.Union):
        return ' ∪ '.join(one(i) for i in sorted(S.args, key=lambda i: float(i.start) if i.start != -sp.oo else -1e99))
    return one(S)


def tup(*a):
    return '(' + ', '.join(str(v) for v in a) + ')'


def real_roots(poly_expr, var=x):
    return sorted(r for r in sp.Poly(poly_expr, var).real_roots())
