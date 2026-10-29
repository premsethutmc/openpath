import re
from kit import ref, Expect, Verdict, Unsupported, Ambiguous, Fraction, sp
from refs.calculus_trig_seq_util import *


@ref('alp', method='bounded area: intersect the parabola with the line (SymPy roots) and integrate (line - x^2) exactly', coverage='exhaustive')
def alp(q):
    m = re.search(r'x² ≤ y ≤ (.+)\}', q['prompt'])
    line = E(m.group(1))
    rs = sorted(sp.solve(x**2 - line, x))
    return Expect(str(sp.integrate(line - x**2, (x, rs[0], rs[1]))))


@ref('aqabs', method='critical points of the polynomial (exact real roots of f\') in the interval plus both endpoints; cross-checked on a 2001-point grid', coverage='exhaustive')
def aqabs(q):
    m = re.search(r'absolute (maximum|minimum) value of f\(x\) = (.+) on the interval \[(−?\d+), (−?\d+)\]', q['prompt'])
    f = E(m.group(2)); a, b = num(m.group(3)), num(m.group(4))
    pts = [a, b] + [r for r in real_roots(sp.diff(f, x)) if a < r < b]
    vals = [f.subs(x, p) for p in pts]
    v = max(vals) if m.group(1) == 'maximum' else min(vals)
    g = [float(f.subs(x, a + (b - a) * i / 2000)) for i in range(2001)]
    gv = max(g) if m.group(1) == 'maximum' else min(g)
    assert abs(gv - float(v)) < 0.05 * (1 + abs(float(v))) , (gv, v)
    return Expect(str(v))


def _lin_integral(f, a, b, brk):
    """integral of a piecewise-linear integrand with breakpoints brk, exact (trapezoids on linear pieces)"""
    pts = sorted(set([a, b] + [p for p in brk if a < p < b]))
    tot = 0
    for u, v in zip(pts, pts[1:]):
        mid = (u + v) / 2
        # linear on (u, v): trapezoid == midpoint rule; verify linearity at a quarter point
        q1 = u + (v - u) / 4
        assert sp.simplify(f(q1) - (f(u) * 3 + f(v)) / 4) == 0
        tot += (v - u) * (f(u) + f(v)) / 2
    return tot


@ref('aqabsint', method='split at breakpoints of |.| / floor; the integrand is linear/constant on each piece so exact trapezoids (SymPy Rationals)', coverage='exhaustive')
def aqabsint(q):
    lo, hi = bounds(q['prompt'])
    body = re.search(r'\d\s*(.+) dx\.', q['prompt'].split('∫', 1)[1]).group(1) if False else q['prompt'].split(' ', 2)[2].rsplit(' dx', 1)[0]
    body = re.sub(r'^[₀-₉₋⁰-⁹⁻]+\s*', '', body[1:] if body.startswith('∫') else body)
    body = re.sub(r'^[₀-₉₋]+[⁰-⁹⁻]+', '', q['prompt'].split('Evaluate ∫', 1)[1]).rsplit(' dx', 1)[0].strip()
    if '⌊' in body or '[' in body:
        raise ValueError('floor template ' + body)
    inner = re.fullmatch(r'\|(.+)\|', body)
    if not inner:
        raise ValueError('template ' + body)
    g = E(inner.group(1))
    c = sp.solve(g, x)[0]
    return Expect(str(_lin_integral(lambda v: abs(g.subs(x, v)), sp.Integer(lo), sp.Integer(hi), [c])))
