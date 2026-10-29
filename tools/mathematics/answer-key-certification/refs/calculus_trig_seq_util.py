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
    s = re.sub(r'(?<![\w.])(\d+)(?=[a-zA-Z])', lambda m: m.group(1) + '*', s) if re.search(r'(?<![\w.])0[a-zA-Z]', s) else s
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
    m = re.search(r'∫([₀₁₂₃₄₅₆₇₈₉₋]+)([⁰¹²³⁴⁵⁶⁷⁸⁹⁻]+)', prompt)
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


def poly_of(s):
    return E(s)


def ode_check(stored, rhs, x0, y0, offsets=(Fraction(1, 20), Fraction(1, 10), Fraction(3, 20), Fraction(1, 5), Fraction(1, 3)), extra=None):
    """Verdict-style check: does the stored y(x) satisfy y' = rhs(x, y) and y(x0) = y0?  (numeric residuals at several x near/after x0)"""
    from kit import Verdict
    Y = E(stored)
    X0, Y0 = num(x0), num(y0)
    try:
        v0 = sp.N(Y.subs(x, X0), 30)
    except Exception:  # noqa: BLE001
        return Verdict(False, f'stored y undefined at x0={x0}')
    if abs(complex(v0 - Y0)) > 1e-12:
        return Verdict(False, f'initial condition fails: y({x0}) = {v0} not {y0}')
    dY = sp.diff(Y, x)
    bad = []
    pts = [X0 + sp.Rational(o.numerator, o.denominator) for o in offsets]
    good = 0
    for p in pts:
        try:
            yy = sp.N(Y.subs(x, p), 30)
            lhs = sp.N(dY.subs(x, p), 30)
            r = sp.N(rhs.subs({x: p, y: yy}), 30)
            c1, c2 = complex(lhs), complex(r)
        except Exception:  # noqa: BLE001
            continue
        if c1 != c1 or c2 != c2:
            continue
        good += 1
        if abs(c1 - c2) > 1e-9 * max(1, abs(c1), abs(c2)):
            bad.append((str(p), c1, c2))
    if good < 3:
        return Verdict(False, 'could not evaluate the residual at enough points')
    if bad:
        return Verdict(False, f"ODE residual non-zero at {bad[0][0]}: y'={bad[0][1]} vs rhs={bad[0][2]}")
    return Verdict(True, 'stored y satisfies the ODE at %d points and the initial condition' % good)
