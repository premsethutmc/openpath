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
    s = s.replace('ˣ', '^x').replace('ʸ', '^y').replace('ᵗ', '^t')
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


def verdict_mc(q, pred):
    """pred(text) -> (ok: bool, note: str). Checks the stored answer and, if the question has a multiple-choice form, that exactly
    the keyed option satisfies the predicate (all of: stored answer and options are judged against the question's conditions)."""
    from kit import Verdict
    ok, note = pred(q['answer'])
    if not ok:
        return Verdict(False, note)
    mc = q.get('mc')
    if mc:
        hits = []
        for j, o in enumerate(mc['options']):
            try:
                good = pred(o)[0]
            except Exception:  # noqa: BLE001
                good = False
            if good:
                hits.append(j)
        key = 'ABCD'.index(mc['key'])
        if hits != [key]:
            return Verdict(False, f"multiple-choice: options satisfying the conditions {hits} but keyed {key}: {mc['options']}")
    return Verdict(True, note)


def ode_pred(rhs, x0, y0, ind=x, dep=y, offsets=None):
    offs = offsets or [sp.Rational(1, 20), sp.Rational(1, 10), sp.Rational(3, 20), sp.Rational(1, 5), sp.Rational(1, 3)]
    X0, Y0 = num(x0), num(y0)

    def pred(text):
        try:
            Y = E(text)
        except Exception as ex:  # noqa: BLE001
            return False, f'unreadable {text!r}: {ex}'
        v0 = complex(sp.N(Y.subs(ind, X0), 30))
        if abs(v0 - complex(Y0)) > 1e-12:
            return False, f'initial condition fails: value {v0} at {x0}, need {y0}'
        dY = sp.diff(Y, ind)
        good, bad = 0, None
        for o in offs:
            p = X0 + o
            try:
                yy = sp.N(Y.subs(ind, p), 30)
                l_ = complex(sp.N(dY.subs(ind, p), 30)); r_ = complex(sp.N(rhs.subs({ind: p, dep: yy}), 30))
            except Exception:  # noqa: BLE001
                continue
            if l_ != l_ or r_ != r_:
                continue
            good += 1
            if abs(l_ - r_) > 1e-9 * max(1, abs(l_), abs(r_)):
                bad = (str(p), l_, r_)
                break
        if bad:
            return False, f"ODE residual non-zero at {bad[0]}: y'={bad[1]} vs rhs={bad[2]}"
        if good < 3:
            return False, 'residual not evaluable'
        return True, 'satisfies ODE and initial condition'
    return pred


_PTS = [sp.Rational(a, 10) for a in (-97, -83, -61, -47, -33, -21, -9, 7, 13, 19, 27, 33, 41, 53, 67, 79, 91, 123, 157)]


def _bare_logs(text):
    """arguments of ln/log calls in the stored text that are not written as |...|"""
    out = []
    for m in re.finditer(r'(?:ln|log)\s*(?=[^|\s])', text):
        i = m.end()
        if text[i] == '(':
            d, j = 0, i
            while j < len(text):
                d += text[j] == '('
                d -= text[j] == ')'
                j += 1
                if d == 0:
                    break
            out.append(text[i + 1:j - 1])
        else:
            mm = re.match(r'[a-z0-9]+', text[i:])
            if mm:
                out.append(mm.group(0))
    return out


def antideriv_pred(integrand, domain=None):
    """pred for an antiderivative: derivative equals the integrand where defined, '+ C' present, log arguments that can be
    negative/zero on the domain are written with |.|"""
    def pred(text):
        try:
            F = E(text.replace('+ C', '').replace('+C', ''))
        except Exception as ex:  # noqa: BLE001
            return False, f'unreadable {text!r}: {ex}'
        xr = sp.Symbol('x', real=True)
        F = F.subs(x, xr)
        dF = sp.diff(F, xr)
        good = 0
        for p in _PTS:
            if domain is not None and not domain(p):
                continue
            try:
                a = complex(sp.N(dF.subs(xr, p), 30)); b = complex(sp.N(integrand.subs(x, p), 30))
            except Exception:  # noqa: BLE001
                continue
            if a != a or b != b or abs(a.imag) > 1e-12 or abs(b.imag) > 1e-12:
                continue
            good += 1
            if abs(a - b) > 1e-9 * max(1, abs(a), abs(b)):
                return False, f'derivative of stored result differs from integrand at x={p}: {a.real} vs {b.real}'
        if good < 4:
            return False, 'derivative could not be compared at enough points'
        if not re.search(r'\+\s*C\s*$', text.strip()):
            return False, 'missing "+ C"'
        for arg in _bare_logs(text):
            try:
                g = E(arg)
            except Exception:  # noqa: BLE001
                continue
            if any(sp.N(g.subs(x, p), 20) <= 0 for p in _PTS if (domain is None or domain(p)) and g.free_symbols <= {x}):
                return False, f'log of {arg} without absolute value but the argument is not positive on the domain'
        return True, 'derivative equals integrand'
    return pred


def deg(s):
    """rewrite 'sin² 45°', 'cosec(30°)', 'tan 60°' ... so that mathtext can read it: degrees -> radians, exponent after the name"""
    s = s.replace('cosec', 'csc')
    s = re.sub(r'(sin|cos|tan|cot|sec|csc)([²³]?)\s*(?:\(\s*(−?\d+(?:\.\d+)?)\s*°\s*\)|(−?\d+(?:\.\d+)?)\s*°)',
               lambda m: f"(({m.group(1)}(({m.group(3) or m.group(4)})*pi/180)))" + (f"**{m.group(2).translate(SUP)}" if m.group(2) else ''), s)
    s = s.replace('−', '-').replace('÷', '/').replace('×', '*')
    return s


def _balanced(text, i):
    """index just after the bracketed argument starting at text[i] == '('"""
    d = 0
    for j in range(i, len(text)):
        d += text[j] == '('
        d -= text[j] == ')'
        if d == 0:
            return j + 1
    raise ValueError('unbalanced')


def inv_trig(s):
    """read 'sin⁻¹(...)' / 'tan⁻¹ 3' etc. with the standard principal branches:
    sin⁻¹ [-pi/2,pi/2], cos⁻¹ [0,pi], tan⁻¹ (-pi/2,pi/2), cot⁻¹ (0,pi), sec⁻¹ [0,pi]-{pi/2}, cosec⁻¹ [-pi/2,pi/2]-{0}"""
    s = s.replace('cosec⁻¹', 'csc⁻¹')
    while True:
        m = re.search(r'(sin|cos|tan|cot|sec|csc)⁻¹\s*', s)
        if not m:
            break
        i = m.end()
        if s[i] == '(':
            j = _balanced(s, i); arg = s[i:j]
        else:
            mm = re.match(r'[−-]?\d+(?:/\d+)?(?:√\d+)?', s[i:])
            arg = '(' + mm.group(0) + ')'; j = i + len(mm.group(0))
        name = m.group(1)
        rep = {'sin': f'arcsin{arg}', 'cos': f'arccos{arg}', 'tan': f'arctan{arg}', 'cot': f'(pi/2-arctan{arg})',
               'sec': f'arccos(1/{arg})', 'csc': f'arcsin(1/{arg})'}[name]
        s = s[:m.start()] + ' ' + rep + ' ' + s[j:]
    return s


def mp_close(a, b, tol=1e-25):
    try:
        return abs(complex(sp.N(a - b, 60))) < tol
    except Exception:  # noqa: BLE001
        return False


def value_pred(q, value, rationalise=False):
    """pred(text): text denotes the number `value` (oracle reader, 60-digit numeric), optionally with a rationalised denominator"""
    from kit import oracle, context

    def pred(text):
        try:
            v = oracle.meaning(q['type'], text, context(q))
        except Exception as ex:  # noqa: BLE001
            return False, f'unreadable {text!r}: {ex}'
        if isinstance(v, list):
            return False, 'not a single value'
        if not mp_close(v, value):
            return False, f'value differs: stored {text!r} = {sp.N(v, 15)} vs derived {sp.N(value, 15)}'
        if rationalise and re.search(r'/\s*(?:\([^)]*√|[^()\s]*√)', text.replace(' ', '')) and not re.search(r'√\d+\)?/\d+$', text):
            return False, f'FORM: denominator of {text!r} still contains a root'
        return True, 'value matches'
    return pred
