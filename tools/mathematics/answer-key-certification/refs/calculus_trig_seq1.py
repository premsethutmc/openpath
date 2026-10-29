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
    ff = sp.lambdify(x, f, 'math')
    g = [ff(float(a) + float(b - a) * i / 2000) for i in range(2001)]
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


@ref('aqabsint', method='split at breakpoints of |.| / floor; integrand linear/constant on each piece so exact trapezoids (SymPy Rationals)', coverage='exhaustive')
def aqabsint(q):
    lo, hi = bounds(q['prompt'])
    body = re.search(r'Evaluate ∫[₀₁₂₃₄₅₆₇₈₉₋]+[⁰¹²³⁴⁵⁶⁷⁸⁹⁻]+ (.+?) dx', q['prompt']).group(1)
    if body == '[x]':
        return Expect(str(sum(sp.floor(i) for i in range(lo, hi))))
    inner = re.fullmatch(r'\|(.+)\|', body)
    g = E(inner.group(1))
    c = sp.solve(g, x)[0]
    return Expect(str(_lin_integral(lambda v: abs(g.subs(x, v)), sp.Integer(lo), sp.Integer(hi), [c])))


def _area_abs(f, a, b):
    pts = [a, b] + [r for r in real_roots(f) if a < r < b]
    pts = sorted(set(pts))
    return sum(abs(sp.integrate(f, (x, u, v))) for u, v in zip(pts, pts[1:]))


@ref('aqarea', method='exact integration (SymPy) of |f| split at the roots of f in [a,b]; parabola y^2=px bounded by x=h as 2*int sqrt(px)', coverage='exhaustive')
def aqarea(q):
    p = q['prompt']
    m = re.search(r'parabola y² = (\d*)x and the line x = (\d+)', p)
    if m:
        pc = int(m.group(1) or 1); h = int(m.group(2))
        return Expect(str(sp.integrate(2 * sp.sqrt(pc * x), (x, 0, h))))
    m = re.search(r'curve y = (.+), the x-axis and the lines x = (−?\d+) and x = (−?\d+)', p)
    return Expect(str(_area_abs(E(m.group(1)), num(m.group(2)), num(m.group(3)))))


@ref('aqcarea', method='direct SymPy integration of the described region (disc cut by a line / sector-like region under a line inside the circle)', coverage='exhaustive')
def aqcarea(q):
    p = q['prompt']
    R2 = num(re.search(r'circle x² \+ y² = (\d+)', p).group(1)); r = sp.sqrt(R2)
    m = re.search(r'(smaller|larger) of the two regions into which the line (.+) divides', p)
    if m:
        lhs, rhs = m.group(2).split('=')
        # line a x + b y = c  -> y = (c - a x)/b  or vertical x = c
        if 'y' in lhs:
            a_ = E(lhs.replace('y', '0')).subs(x, 1) if 'x' in lhs else 0
            yline = sp.solve(sp.Eq(E(lhs), E(rhs)), y_s)[0] if False else None
            c = E(rhs)
            ysym = sp.Symbol('Y')
            expr = E(lhs.replace('y', 'Y'))
            yl = sp.solve(sp.Eq(expr, c), ysym)[0]
            xs = sorted(sp.solve(x**2 + yl**2 - R2, x))
            seg = sp.integrate(sp.sqrt(R2 - x**2) - yl, (x, xs[0], xs[1]))   # part above the line
            other = sp.pi * R2 - seg
        else:
            c = E(rhs)
            seg = sp.integrate(2 * sp.sqrt(R2 - x**2), (x, c, r))
            other = sp.pi * R2 - seg
        small, large = (seg, other) if seg < other else (other, seg)
        return Expect(str(sp.simplify(small if m.group(1) == 'smaller' else large)))
    m = re.search(r'bounded by the (x|y)-axis, the line (.+) and the circle', p)
    lhs, rhs = m.group(2).split('=')
    ysym = sp.Symbol('Y')
    yl = sp.solve(sp.Eq(E(lhs.replace('y', 'Y')), E(rhs)), ysym)[0]   # y = m x
    slope = sp.simplify(yl / x)
    x1 = r / sp.sqrt(1 + slope**2)
    if m.group(1) == 'x':    # 0 <= y <= m x inside the circle
        A = sp.integrate(slope * x, (x, 0, x1)) + sp.integrate(sp.sqrt(R2 - x**2), (x, x1, r))
    else:                    # x >= 0, y >= m x inside the circle
        A = sp.integrate(sp.sqrt(R2 - x**2) - slope * x, (x, 0, x1))
    return Expect(str(sp.simplify(A)))


@ref('aqconc', method='sign of f\'\' via SymPy solveset on the second derivative inequality', coverage='exhaustive')
def aqconc(q):
    m = re.search(r'curve y = (.+) is concave (upward|downward)', q['prompt'])
    f2 = sp.diff(E(m.group(1)), x, 2)
    S = sp.solveset(f2 > 0 if m.group(2) == 'upward' else f2 < 0, x, sp.Reals)
    return Expect(set_text(S), form=False)


@ref('aqcontk', method='solve left limit = right limit = f(c) for k (SymPy solve)', coverage='exhaustive')
def aqcontk(q):
    m = re.search(r'f\(x\) = (.+) for x ≤ (−?\d+), and f\(x\) = (.+) for x > (−?\d+)\. Find the value of k', q['prompt'])
    A, B, c = E(m.group(1)), E(m.group(3)), num(m.group(2))
    assert num(m.group(4)) == c
    sol = sp.solve(sp.Eq(A.subs(x, c), B.subs(x, c)), k)
    assert len(sol) == 1
    return Expect(str(sol[0]))


@ref('aqd2', method='differentiate the statement\'s y twice (SymPy)', coverage='exhaustive')
def aqd2(q):
    m = re.match(r'If y = (.+), find d²y/dx²', q['prompt'])
    return Expect(str(sp.diff(E(m.group(1)), x, 2)))


@ref('aqd2rel', method='substitute y into y\'\'+py\'+qy=0 and require it to vanish identically in x, A, B (linear solve for p, q)', coverage='exhaustive')
def aqd2rel(q):
    m = re.match(r'If y = (.+), where A and B are arbitrary', q['prompt'])
    A_, B_, p_, q_ = sp.symbols('A B p q')
    Y = E(m.group(1).replace('A', 'AA').replace('B', 'BB'))
    AA, BB = sp.symbols('AA BB')
    eq = sp.diff(Y, x, 2) + p_ * sp.diff(Y, x) + q_ * Y
    eqs = []
    for xv in (sp.Rational(1, 3), sp.Rational(7, 5), sp.Rational(-2, 3), sp.Rational(5, 2)):
        for (a, b) in ((1, 0), (0, 1)):
            eqs.append(sp.nsimplify(sp.N(eq.subs({x: xv, AA: a, BB: b}), 40), rational=False))
    sol = sp.solve([sp.N(e_, 30) for e_ in eqs[:2]] + [sp.N(e_, 30) for e_ in eqs[2:4]], [p_, q_], dict=True)
    s = sol[0]
    pv, qv = sp.nsimplify(s[p_], tolerance=1e-12, rational=True), sp.nsimplify(s[q_], tolerance=1e-12, rational=True)
    # verify identically on a larger point set
    for xv in (sp.Rational(1, 7), sp.Rational(9, 4), sp.Rational(-5, 3)):
        for (a, b) in ((1, 0), (0, 1), (2, -3)):
            assert abs(complex(sp.N(eq.subs({p_: pv, q_: qv, x: xv, AA: a, BB: b}), 30))) < 1e-15
    return Expect(tup(pv, qv))


@ref('aqdiffab', method='solve continuity and equal one-sided derivatives at c for (a,b) (SymPy)', coverage='exhaustive')
def aqdiffab(q):
    m = re.search(r'f\(x\) = x² \+ ax \+ b for x < (−?\d+), and f\(x\) = (.+) for x ≥ (−?\d+)\.', q['prompt'])
    c = num(m.group(1)); assert num(m.group(3)) == c
    a_, b_ = sp.symbols('a b')
    R_ = E(m.group(2)); L_ = x**2 + a_ * x + b_
    sol = sp.solve([sp.Eq(L_.subs(x, c), R_.subs(x, c)), sp.Eq(sp.diff(L_, x).subs(x, c), sp.diff(R_, x).subs(x, c))], [a_, b_], dict=True)[0]
    return Expect(tup(sol[a_], sol[b_]))


@ref('aqext', method='critical points from f\' roots; classify by the sign of f\'\' (SymPy); value by substitution', coverage='exhaustive')
def aqext(q):
    m = re.search(r'local (maximum|minimum) value of f\(x\) = (.+?)\.?$', q['prompt'])
    f = E(m.group(2))
    cps = real_roots(sp.diff(f, x))
    want = []
    for c in cps:
        s = sp.diff(f, x, 2).subs(x, c)
        if (s < 0 and m.group(1) == 'maximum') or (s > 0 and m.group(1) == 'minimum'):
            want.append(f.subs(x, c))
    assert len(want) == 1, (cps, want)
    return Expect(str(want[0]))


@ref('aqfp', method='difference quotient (f(x+h)-f(x))/h cancelled in SymPy then h -> 0 (the definition itself)', coverage='exhaustive')
def aqfp(q):
    m = re.search(r'find f′\(x\) for f\(x\) = (.+?)\.?$', q['prompt'])
    f = E(m.group(1)); h = sp.Symbol('h')
    dq = sp.cancel(sp.expand(f.subs(x, x + h) - f) / h)
    return Expect(str(sp.limit(dq, h, 0)))


@ref('aqhom', method='substitute the stored y(x) into the ODE and initial condition (numeric residual, SymPy diff); IVP uniqueness by Picard', coverage='exhaustive')
def aqhom(q):
    m = re.search(r'dy/dx = (.+?), x > (−?\d+), given that y = (−?\d+) when x = (−?\d+)\.', q['prompt'])
    return ode_check(q['answer'], E(m.group(1)), m.group(4), m.group(3))


@ref('aqivp', method='FTC: value = initial value + integral of the rate between the given point and the target (SymPy)', coverage='exhaustive')
def aqivp(q):
    p = q['prompt']
    m = re.search(r'velocity v\(t\) = (.+?) m/s.*At t = 0 it is (\d+) m past.* at t = (\d+)\.', p)
    if m:
        return Expect(str(num(m.group(2)) + sp.integrate(E(m.group(1).replace('t', 'x')), (x, 0, num(m.group(3))))))
    m = re.search(r'C′\(x\) = (.+?) rupees per shirt.*fixed cost.*₹([\d,]+)\. Find the total cost, in rupees, of making (\d+) shirts', p)
    if m:
        return Expect(str(num(m.group(2).replace(',', '')) + sp.integrate(E(m.group(1)), (x, 0, num(m.group(3))))))
    m = re.search(r'f′\(x\) = (.+) and f\((−?\d+)\) = (−?\d+)\. Find f\((−?\d+)\)\.', p)
    return Expect(str(num(m.group(3)) + sp.integrate(E(m.group(1)), (x, num(m.group(2)), num(m.group(4))))))
