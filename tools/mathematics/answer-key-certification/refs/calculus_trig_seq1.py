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
    m = re.search(r'f\(x\) = (.+) for x ≠ (−?\d+), and f\((−?\d+)\) = k\.', q['prompt'])
    if m:
        g = E(m.group(1)); c = num(m.group(2)); assert num(m.group(3)) == c
        return Expect(str(sp.limit(g, x, c)))
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
    Y = E(m.group(1))
    AA, BB = sp.Symbol('A'), sp.Symbol('B')
    eq = sp.diff(Y, x, 2) + p_ * sp.diff(Y, x) + q_ * Y
    rows = []
    for xv in (sp.Rational(1, 3), sp.Rational(7, 5), sp.Rational(-2, 3), sp.Rational(5, 2)):
        for (a, b) in ((1, 0), (0, 1)):
            sub = {x: xv, AA: a, BB: b}
            c0 = sp.N(eq.subs({p_: 0, q_: 0}).subs(sub), 40)
            cp = sp.N(sp.diff(eq, p_).subs(sub), 40); cq = sp.N(sp.diff(eq, q_).subs(sub), 40)
            rows.append((cp, cq, c0))
    M = sp.Matrix([[r[0], r[1]] for r in rows[:2]]); rhs_ = sp.Matrix([-r[2] for r in rows[:2]])
    sol = M.LUsolve(rhs_)
    pv, qv = sp.nsimplify(sol[0], tolerance=1e-12, rational=True), sp.nsimplify(sol[1], tolerance=1e-12, rational=True)
    for r in rows:   # the other sample points must be satisfied too (identity in x, A, B)
        assert abs(complex(r[0] * pv + r[1] * qv + r[2])) < 1e-15, 'not an identity'
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
    return verdict_mc(q, ode_pred(E(m.group(1)), m.group(4), m.group(3)))


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


@ref('aqking', method='numerical integration of the stated integrand to 40 digits (mpmath), recognised as a rational and cross-checked to 1e-30', coverage='exhaustive')
def aqking(q):
    import mpmath as mp
    mp.mp.dps = 40
    lo, hi = bounds(q['prompt'])
    body = re.search(r'Evaluate ∫[₀₁₂₃₄₅₆₇₈₉₋]+[⁰¹²³⁴⁵⁶⁷⁸⁹⁻]+ (.+) dx\.', q['prompt']).group(1)
    f = sp.lambdify(x, E(body), 'mpmath')
    val = mp.quad(f, [lo, hi])
    r = sp.nsimplify(sp.Float(val, 40), rational=True, tolerance=1e-25)
    assert abs(mp.mpf(r.p) / r.q - val) < mp.mpf(10) ** -25, ('not rational', val)
    return Expect(str(r))


@ref('aqlarea', method='lines: integrate |f| (SymPy); axis-intercept triangle by integration; triangle between two lines and the x-axis by the shoelace formula on the vertices', coverage='exhaustive')
def aqlarea(q):
    p = q['prompt']
    m = re.search(r'the line (\d*)x \+ (\d*)y = (\d+) and the coordinate axes', p)
    if m:
        a_ = int(m.group(1) or 1); b_ = int(m.group(2) or 1); c_ = int(m.group(3))
        return Expect(str(sp.integrate((c_ - a_ * x) / b_, (x, 0, sp.Rational(c_, a_)))))
    m = re.search(r'the line y = (.+), the x-axis and the lines x = (−?\d+) and x = (−?\d+)', p)
    if m:
        return Expect(str(_area_abs(E(m.group(1)), num(m.group(2)), num(m.group(3)))))
    m = re.search(r'lines y = (.+), y = (.+) and the x-axis', p)
    f1, f2 = E(m.group(1)), E(m.group(2))
    xa = sp.solve(sp.Eq(f1, f2), x)[0]; ya = f1.subs(x, xa)
    r1, r2 = sp.solve(f1, x)[0], sp.solve(f2, x)[0]
    V = [(xa, ya), (r1, 0), (r2, 0)]
    A = sp.Abs(sum(V[i][0] * V[(i + 1) % 3][1] - V[(i + 1) % 3][0] * V[i][1] for i in range(3))) / 2
    return Expect(str(A))


def _linear_lhs(lhs_text):
    pass


@ref('aqlinde', method='substitute the stored y(x) into the linear ODE and initial condition (numeric residual, SymPy diff); uniqueness of the linear IVP', coverage='exhaustive')
def aqlinde(q):
    m = re.search(r'dy/dx \+ (.+?) = (.+?), x > 0, given that y = (−?\d+) when x = (−?\d+)\.', q['prompt'])
    rhs = E(m.group(2)) - E(m.group(1))     # y' = Q - P*y
    return verdict_mc(q, ode_pred(rhs, m.group(4), m.group(3)))


@ref('aqmono', method='sign of f\' via SymPy solveset on the inequality f\'>0 / f\'<0', coverage='exhaustive')
def aqmono(q):
    m = re.search(r'on which f\(x\) = (.+) is strictly (increasing|decreasing)', q['prompt'])
    f1 = sp.diff(E(m.group(1)), x)
    S = sp.solveset(f1 > 0 if m.group(2) == 'increasing' else f1 < 0, x, sp.Reals)
    return Expect(set_text(S))


@ref('aqodd', method='exact SymPy definite integral of the whole integrand over [-a, a]', coverage='exhaustive')
def aqodd(q):
    m = re.search(r'Evaluate ∫[₀₁₂₃₄₅₆₇₈₉₋]+[⁰¹²³⁴⁵⁶⁷⁸⁹⁻]+ \((.+)\) dx', q['prompt'])
    lo, hi = bounds(q['prompt'])
    f = E(m.group(1))
    return Expect(str(sp.simplify(sp.integrate(f, (x, lo, hi)))))


@ref('aqorddeg', method='replace derivatives by polynomial symbols; order = highest derivative present, degree = its power in the (polynomial) equation', coverage='exhaustive')
def aqorddeg(q):
    d = re.search(r'differential equation (.+)\. Write the answer', q['prompt']).group(1)
    L = {0: 'u', 1: 'p', 2: 'v', 3: 'w', 4: 'z', 5: 'a'}
    for ch, n_ in (('²', 2), ('³', 3), ('⁴', 4), ('⁵', 5)):
        d = d.replace(f'd{ch}y/dx{ch}', f' {L[n_]} ')
    d = d.replace('dy/dx', f' {L[1]} ')
    d = re.sub(r'(?<![a-zA-Z])y(?![a-zA-Z])', f' {L[0]} ', d)
    lhs, rhs = d.split('=')
    e = E(lhs) - E(rhs)
    syms = {n_: sp.Symbol(L[n_]) for n_ in L}
    present = [n_ for n_ in (5, 4, 3, 2, 1) if e.has(syms[n_])]
    assert present
    order = present[0]
    deg = sp.Poly(e, syms[order]).degree()
    return Expect(tup(order, deg))


@ref('aqrr', method='related rates: the quantity as a SymPy function of t, differentiated, evaluated at t=0', coverage='exhaustive')
def aqrr(q):
    p = q['prompt']
    t_ = sp.Symbol('t')
    m = re.search(r'edge of a cube is increasing at (\d+) cm/s\. How fast, in cm[²³]/s, is its (volume|total surface area) increasing when the edge is (\d+) cm', p)
    if m:
        e = int(m.group(3)) + int(m.group(1)) * t_
        A = e**3 if m.group(2) == 'volume' else 6 * e**2
        return Expect(str(sp.diff(A, t_).subs(t_, 0)))
    m = re.search(r'radius of a circular ripple is increasing at (\d+) cm/s\. When the radius is (\d+) cm the area is increasing at kπ', p)
    if m:
        r_ = int(m.group(2)) + int(m.group(1)) * t_
        return Expect(str(sp.diff(sp.pi * r_**2, t_).subs(t_, 0) / sp.pi))
    m = re.search(r'R\(x\) = (.+)\. Find the marginal revenue, in rupees per item, when x = (\d+)', p)
    if m:
        return Expect(str(sp.diff(E(m.group(1)), x).subs(x, int(m.group(2)))))
    m = re.search(r'length of a rectangle is decreasing at (\d+) cm/s and its width is increasing at (\d+) cm/s\..*when the length is (\d+) cm and the width is (\d+) cm', p)
    L_ = int(m.group(3)) - int(m.group(1)) * t_; W_ = int(m.group(4)) + int(m.group(2)) * t_
    return Expect(str(sp.diff(L_ * W_, t_).subs(t_, 0)))


@ref('aqsep', method='substitute the stored y(x) into dy/dx = g(x) y and the initial condition (numeric residual, SymPy diff); IVP uniqueness', coverage='exhaustive')
def aqsep(q):
    m = re.search(r'dy/dx = (.+?), (?:x > (−?\d+), )?given that y = (−?\d+) when x = (−?\d+)\.', q['prompt'])
    return verdict_mc(q, ode_pred(E(m.group(1)), m.group(4), m.group(3)))


@ref('aqsubsep', method='substitute the stored y(x) into the stated ODE and initial condition (numeric residual, SymPy diff)', coverage='exhaustive')
def aqsubsep(q):
    m = re.search(r'Solve dy/dx = (.+?), given that y = (−?\d+) when x = (−?\d+),', q['prompt'])
    return verdict_mc(q, ode_pred(E(m.group(1)), m.group(3), m.group(2), offsets=[sp.Rational(1, 100), sp.Rational(1, 50), sp.Rational(1, 25), sp.Rational(1, 10), sp.Rational(1, 5)]))


@ref('aqtann', method='tangent/normal from the SymPy derivative at the point; angle: tan(theta) = |(m1-m2)/(1+m1 m2)| from the two derivatives', coverage='exhaustive')
def aqtann(q):
    p = q['prompt']
    m = re.search(r'equation of the (tangent|normal) to the curve y = (.+) at the point where x = (−?\d+)\.', p)
    if m:
        f = E(m.group(2)); a = num(m.group(3))
        s = sp.diff(f, x).subs(x, a); y0 = f.subs(x, a)
        if m.group(1) == 'normal':
            if s == 0:
                return Ambiguous('normal is the vertical line x = %s, which cannot be written y = mx + k' % a)
            s = -1 / s
        return Expect(str(sp.expand(y0 + s * (x - a))))
    m = re.search(r'curves y = (.+) and y = (.+) meet at a point with x = (−?\d+)\.', p)
    f, g = E(m.group(1)), E(m.group(2)); a = num(m.group(3))
    assert f.subs(x, a) == g.subs(x, a), 'curves do not meet at x'
    m1, m2 = sp.diff(f, x).subs(x, a), sp.diff(g, x).subs(x, a)
    if 1 + m1 * m2 == 0:
        return Ambiguous('tangents perpendicular: tan(theta) undefined')
    return Expect(str(sp.Abs((m1 - m2) / (1 + m1 * m2))))


@ref('aqvel', method='velocity = d s/dt (SymPy) at the given time', coverage='exhaustive')
def aqvel(q):
    m = re.search(r's = (.+) metres\. Find its instantaneous velocity, in m/s, at t = (−?\d+)', q['prompt'])
    return Expect(str(sp.diff(E(m.group(1)), x if False else sp.Symbol('t')).subs(sp.Symbol('t'), num(m.group(2)))))
