import re
from kit import ref, Expect, Verdict, Unsupported, Ambiguous, Fraction, sp
from refs.calculus_trig_seq_util import *


def _roots_text(vals):
    return ', '.join(str(v) for v in vals)


@ref('archain', method='compose w(x(t), y(t)) first, then differentiate in t and evaluate (not the chain-rule formula)', coverage='exhaustive')
def archain(q):
    m = re.search(r'w = (.+), where x = (.+) and y = (.+)\. Use the chain rule to find dw/dt when t = (−?\d+)\.', q['prompt'])
    w = E(m.group(1)); X = E(m.group(2)); Y = E(m.group(3))
    comp = w.subs({x: X, y: Y}, simultaneous=True)
    return Expect(str(sp.diff(comp, t).subs(t, num(m.group(4)))))


@ref('arerror', method='differential dA = A\'(s) ds with the SymPy derivative; percentage = 100 dA/A', coverage='exhaustive')
def arerror(q):
    m = re.search(r'side of a (square|cube) is measured as (\d+) cm, with a possible error of ([\d.]+) cm.*error in the (area of the square|volume of the cube|total surface area of the cube)', q['prompt'])
    s_, ds = num(m.group(2)), num(m.group(3))
    kind = m.group(4); pct = 'percentage error' in q['prompt']
    S = sp.Symbol('s')
    A = {'area of the square': S**2, 'volume of the cube': S**3, 'total surface area of the cube': 6 * S**2}[kind]
    dA = sp.diff(A, S).subs(S, s_) * ds
    if pct:
        return Expect(str(100 * dA / A.subs(S, s_)))
    return Expect(str(dA))


@ref('areuler', method='direct partial derivatives of the given polynomial evaluated at the point', coverage='exhaustive')
def areuler(q):
    m = re.search(r'f\(x, y\) = (.+) is a homogeneous function\. Find the value of x ∂f/∂x \+ y ∂f/∂y at \((−?\d+), (−?\d+)\)', q['prompt'])
    f = E(m.group(1)); a, b = num(m.group(2)), num(m.group(3))
    return Expect(str((x * sp.diff(f, x) + y * sp.diff(f, y)).subs({x: a, y: b})))


@ref('argamma', method='SymPy improper integral (exact); cross-checked by mpmath quad to 25 digits', coverage='exhaustive')
def argamma(q):
    import mpmath as mp
    m = re.search(r'Evaluate ∫ from (\d+) to ∞ of (.+?) dx\.', q['prompt'])
    a = int(m.group(1)); f = E(m.group(2))
    val = sp.integrate(f, (x, a, sp.oo))
    assert not val.has(sp.Integral) and not isinstance(val, sp.Piecewise), val
    mp.mp.dps = 30
    nv = mp.quad(sp.lambdify(x, f, 'mpmath'), [a, mp.inf])
    assert abs(complex(sp.N(val, 30)) - complex(nv)) < 1e-8, (val, nv)
    return Expect(str(val))


@ref('arimpl', method='implicit differentiation: dy/dx = -F_x/F_y for F = lhs - rhs (SymPy), compared as functions of x, y', coverage='exhaustive')
def arimpl(q):
    m = re.search(r'The equation (.+) = (−?\d+) defines y implicitly', q['prompt'])
    F = E(m.group(1)) - num(m.group(2))
    return Expect(str(-sp.diff(F, x) / sp.diff(F, y)))


@ref('arlhinf', method='SymPy limit of the stated expression (series-based, not by repeated differentiation)', coverage='exhaustive')
def arlhinf(q):
    m = re.search(r'Evaluate lim \(x → (∞|−?\d+)\) of (.+), an indeterminate form', q['prompt'])
    a = sp.oo if m.group(1) == '∞' else num(m.group(1))
    return Expect(str(sp.limit(E(m.group(2)), x, a)))


@ref('arlhop', method='SymPy limit of the stated expression', coverage='exhaustive')
def arlhop(q):
    m = re.search(r'Evaluate lim \(x → (∞|−?\d+)\) of (.+)\. Give the exact value', q['prompt'])
    a = sp.oo if m.group(1) == '∞' else num(m.group(1))
    return Expect(str(sp.limit(E(m.group(2)), x, a)))


@ref('arlinapp', method='tangent-line value f(a)+f\'(a)(b-a) with SymPy derivative of the stated root function', coverage='exhaustive')
def arlinapp(q):
    m = re.search(r'f\(x\) = (√|∛)x at x = (\d+) to estimate (?:√|∛)(\d+)\.', q['prompt'])
    n = 2 if m.group(1) == '√' else 3
    f = x ** sp.Rational(1, n); a, b = num(m.group(2)), num(m.group(3))
    return Expect(str(f.subs(x, a) + sp.diff(f, x).subs(x, a) * (b - a)))


@ref('arlinapp2', method='partial derivatives (SymPy): df = fx dx + fy dy; linear approximation f(a,b)+fx(c-a)+fy(d-b)', coverage='exhaustive')
def arlinapp2(q):
    p = q['prompt']
    m = re.search(r'For f\(x, y\) = (.+), find the total differential df at \((−?[\d.]+), (−?[\d.]+)\) when dx = (−?[\d.]+) and dy = (−?[\d.]+)\.', p)
    if m:
        f = E(m.group(1)); a, b = num(m.group(2)), num(m.group(3)); dx, dy = num(m.group(4)), num(m.group(5))
        return Expect(str((sp.diff(f, x).subs({x: a, y: b}) * dx + sp.diff(f, y).subs({x: a, y: b}) * dy)))
    m = re.search(r'linear approximation of f\(x, y\) = (.+) at \((−?[\d.]+), (−?[\d.]+)\) to estimate f\((−?[\d.]+), (−?[\d.]+)\)', p)
    f = E(m.group(1)); a, b, c, d = (num(m.group(i)) for i in (2, 3, 4, 5))
    return Expect(str(f.subs({x: a, y: b}) + sp.diff(f, x).subs({x: a, y: b}) * (c - a) + sp.diff(f, y).subs({x: a, y: b}) * (d - b)))


@ref('arlinde', method='substitute the stored y(x) into the ODE and the initial condition (numeric residual with SymPy derivative); uniqueness of the linear IVP', coverage='exhaustive')
def arlinde(q):
    m = re.search(r'Solve dy/dx \+ (.+?) = (.+?)(?: for x > (\d+))?, given that y\((−?\d+)\) = (−?\d+)\.', q['prompt'])
    rhs = E(m.group(2)) - E(m.group(1))
    x0 = num(m.group(4))
    return verdict_mc(q, ode_pred(rhs, m.group(4), m.group(5)))


@ref('arlindx', method='substitute the stored x(y) into the ODE (dx/dy = ...) and the initial condition (numeric residual with SymPy derivative); uniqueness of the linear IVP', coverage='exhaustive')
def arlindx(q):
    p = q['prompt']
    m = re.search(r'Solve dx/dy \+ (.+?) = (.+?)(?: for y > (\d+))?(?:, where x is a function of y)?, given that x = (−?\d+) when y = (−?\d+)\.', p)
    if m:
        # indep variable is y, dependent x
        rhs = E(m.group(2)) - E(m.group(1))          # dx/dy = Q - P x  (symbols: x dependent, y independent)
        rhs = rhs.subs({x: sp.Symbol('Dd')}).subs({y: x}).subs({sp.Symbol('Dd'): y})   # rename to (indep=x, dep=y)
        pred = ode_pred(rhs, m.group(5), m.group(4))
        return verdict_mc(q, lambda s: pred(s.replace('y', 'x')))
    m = re.search(r'y dx − \((.+)\) dy = 0(?: for y > (\d+))?, given that x = (−?\d+) when y = (−?\d+)\.', p)
    # y dx = (stuff) dy,  dx/dy = stuff / y  with stuff in x, y
    stuff = E(m.group(1))
    rhs = (stuff / y).subs({x: sp.Symbol('Dd')}).subs({y: x}).subs({sp.Symbol('Dd'): y})
    pred = ode_pred(rhs, m.group(4), m.group(3))
    return verdict_mc(q, lambda s: pred(s.replace('y', 'x')))


@ref('arlogdiff', method='differentiate u(x)^v(x) = exp(v ln u) with SymPy', coverage='exhaustive')
def arlogdiff(q):
    m = re.search(r'Differentiate y = (.+) with respect to x', q['prompt'])
    body = m.group(1)
    mm = re.fullmatch(r'(.+?)\^\((.+)\)', body)
    base, ex = E(mm.group(1)), E(mm.group(2))
    return Expect(str(sp.diff(sp.exp(ex * sp.log(base)), x)))


@ref('armaclaurin', method='n-th derivative at 0 divided by n! (SymPy)', coverage='exhaustive')
def armaclaurin(q):
    m = re.search(r'coefficient of x([⁰¹²³⁴⁵⁶⁷⁸⁹]*) in the Maclaurin series of (.+?)\.?$', q['prompt'])
    n = int(m.group(1).translate(SUP)) if m.group(1) else 1
    f = E(m.group(2))
    return Expect(str(sp.diff(f, x, n).subs(x, 0) / sp.factorial(n)))


@ref('armix', method='tank ODE dQ/dt = r*c_in - r*Q/V, Q(0)=Q0 (written from the statement); stored Q(t) substituted (numeric residual)', coverage='exhaustive')
def armix(q):
    m = re.search(r'A tank holds (\d+) litres of (?:salt water containing (\d+) g of salt|fresh water)\. (?:Salt water containing (\d+) g of salt per litre|Fresh water) flows in at (\d+) litres per minute', q['prompt'])
    V, Q0, cin, r_ = int(m.group(1)), int(m.group(2) or 0), int(m.group(3) or 0), int(m.group(4))
    Qs = sp.Symbol('Q')
    rhs = r_ * cin - r_ * Qs / V
    return verdict_mc(q, ode_pred(rhs, 0, Q0, ind=t, dep=Qs))


def _ineq_text(S):
    def one(i):
        if i.start == -sp.oo:
            return f'x < {i.end}'
        if i.end == sp.oo:
            return f'x > {i.start}'
        return f'{i.start} < x < {i.end}'
    if isinstance(S, sp.Union):
        return ' or '.join(one(i) for i in sorted(S.args, key=lambda i: float(i.start) if i.start != -sp.oo else -1e99))
    return one(S)


@ref('armono', method='sign of f\' via SymPy solveset on f\'>0 / f\'<0, written as inequalities', coverage='exhaustive')
def armono(q):
    m = re.search(r'For f\(x\) = (.+), find where f is strictly (increasing|decreasing)', q['prompt'])
    f1 = sp.diff(E(m.group(1)), x)
    S = sp.solveset(f1 > 0 if m.group(2) == 'increasing' else f1 < 0, x, sp.Reals)
    return Expect(_ineq_text(S))


@ref('armvlim', method='SymPy limits along three different paths to the point (must agree)', coverage='exhaustive')
def armvlim(q):
    m = re.search(r'Evaluate lim \(\(x, y\) → \((−?\d+), (−?\d+)\)\) of (.+)$', q['prompt'])
    a, b = num(m.group(1)), num(m.group(2)); f = E(m.group(3).rstrip('.'))
    s = sp.Symbol('s', positive=True)
    vals = [sp.limit(f.subs({x: a + s, y: b + s * k_ }, simultaneous=True), s, 0) for k_ in (1, -2, sp.Rational(1, 3))]
    vals.append(sp.limit(f.subs({x: a + s, y: b + s**2}, simultaneous=True), s, 0))
    assert all(sp.simplify(v - vals[0]) == 0 for v in vals), vals
    return Expect(str(vals[0]))


@ref('armvt', method='solve f\'(c) = (f(b)-f(a))/(b-a) exactly (SymPy) and keep the roots in the open interval', coverage='exhaustive')
def armvt(q):
    m = re.search(r'values of c in \((−?\d+), (−?\d+)\) that satisfy the conclusion of Lagrange\'s mean value theorem for f\(x\) = (.+) on \[(−?\d+), (−?\d+)\]', q['prompt'])
    a, b = num(m.group(1)), num(m.group(2)); assert (a, b) == (num(m.group(4)), num(m.group(5)))
    f = E(m.group(3)); c = sp.Symbol('c')
    eq = sp.diff(f, x).subs(x, c) - (f.subs(x, b) - f.subs(x, a)) / (b - a)
    rs = [r for r in sp.solve(eq, c) if sp.im(r) == 0 and a < r < b]
    if not rs:
        return Ambiguous('no value of c in the open interval')
    return Expect(_roots_text(sorted(rs, key=lambda r: float(r))))


@ref('arodemod', method='exponential model solved for k from the data (SymPy), then evaluated', coverage='exhaustive')
def arodemod(q):
    p = q['prompt']
    kk = sp.Symbol('kk', positive=True); T = sp.Symbol('T')
    m = re.search(r'starts with (\d+) bacteria.*doubles every (\d+) hours\. How many bacteria are there after (\d+) hours', p)
    if m:
        N0, th, tt = (int(m.group(i)) for i in (1, 2, 3))
        k_ = sp.solve(sp.Eq(N0 * sp.exp(kk * th), 2 * N0), kk)[0]
        return Expect(str(sp.simplify(N0 * sp.exp(k_ * tt))))
    m = re.search(r'half-life is (\d+) years and it starts at (\d+) g\. How many grams remain after (\d+) years', p)
    if m:
        H, N0, tt = (int(m.group(i)) for i in (1, 2, 3))
        k_ = sp.solve(sp.Eq(N0 * sp.exp(-kk * H), N0 / 2), kk)[0]
        return Expect(str(sp.simplify(N0 * sp.exp(-k_ * tt))))
    m = re.search(r'a cup of tea at (\d+)°C is left in a room at (\d+)°C\. After (\d+) minutes it is at (\d+)°C\. What is its temperature, in °C, after (\d+) minutes', p)
    T0, S, t1, T1, t2 = (int(m.group(i)) for i in (1, 2, 3, 4, 5))
    k_ = sp.solve(sp.Eq(S + (T0 - S) * sp.exp(-kk * t1), T1), kk)[0]
    return Expect(str(sp.simplify(S + (T0 - S) * sp.exp(-k_ * t2))))


@ref('arparam', method='dy/dx = (dy/dt)/(dx/dt) with SymPy', coverage='exhaustive')
def arparam(q):
    m = re.search(r'x = (.+), y = (.+)\. Find dy/dx in terms of t', q['prompt'])
    X, Y = E(m.group(1)), E(m.group(2))
    return Expect(str(sp.simplify(sp.diff(Y, t) / sp.diff(X, t))))


@ref('arpartial', method='SymPy partial derivative of the given polynomial', coverage='exhaustive')
def arpartial(q):
    m = re.search(r'For f\(x, y\) = (.+), find ∂f/∂(x|y)\.', q['prompt'])
    return Expect(str(sp.diff(E(m.group(1)), x if m.group(2) == 'x' else y)))


@ref('arpfint', method='differentiate the stored antiderivative (SymPy) and compare with the integrand at 19 points; check "+ C" and |.| in logs of linear factors', coverage='exhaustive')
def arpfint(q):
    m = re.search(r'Find ∫ (.+) dx\.?', q['prompt'])
    f = E(m.group(1))
    return verdict_mc(q, antideriv_pred(f))


@ref('arrolle', method='check f(a)=f(b); solve f\'(c)=0 exactly (SymPy) and keep the roots in the open interval', coverage='exhaustive')
def arrolle(q):
    m = re.search(r'f\(x\) = (.+) satisfies the conditions of Rolle\'s theorem on \[(−?\d+), (−?\d+)\], and find all values of c in \((−?\d+), (−?\d+)\)', q['prompt'])
    f = E(m.group(1)); a, b = num(m.group(2)), num(m.group(3))
    assert f.subs(x, a) == f.subs(x, b), 'Rolle hypothesis f(a)=f(b) fails'
    rs = [r for r in sp.solve(sp.diff(f, x), x) if sp.im(r) == 0 and a < r < b]
    if not rs:
        return Ambiguous('no root in the open interval')
    return Expect(_roots_text(sorted(rs, key=lambda r: float(r))))


@ref('artaylor', method='n-th derivative at a divided by n! (SymPy)', coverage='exhaustive')
def artaylor(q):
    m = re.search(r'coefficient of \(x ([+−]) (\d+)\)([⁰¹²³⁴⁵⁶⁷⁸⁹]*) in the Taylor series of f\(x\) = (.+?) about x = (−?\d+)', q['prompt'])
    a = num(m.group(5)); n = int(m.group(3).translate(SUP)) if m.group(3) else 1
    assert (-1 if m.group(1) == '+' else 1) * num(m.group(2)) == a, 'bracket and centre disagree'
    f = E(m.group(4))
    return Expect(str(sp.diff(f, x, n).subs(x, a) / sp.factorial(n)))


@ref('arwallis', method='SymPy exact definite integral of the stated trigonometric power product', coverage='exhaustive')
def arwallis(q):
    m = re.search(r'Evaluate ∫ from 0 to (π/2|π) of (.+) dx\.', q['prompt'])
    top = sp.pi / 2 if m.group(1) == 'π/2' else sp.pi
    return Expect(str(sp.integrate(E(m.group(2)), (x, 0, top))))


@ref('audbe', method='SymPy exact definite integral of the stated product', coverage='exhaustive')
def audbe(q):
    m = re.search(r'Evaluate ∫ from (\d+) to (π/2|π|\d+) of (.+) dx\. Give the exact value', q['prompt'])
    lo = int(m.group(1)); hi = {'π/2': sp.pi / 2, 'π': sp.pi}.get(m.group(2)) or int(m.group(2))
    return Expect(str(sp.integrate(E(m.group(3)), (x, lo, hi))))
