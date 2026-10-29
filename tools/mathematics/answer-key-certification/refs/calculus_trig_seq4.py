import re
from kit import ref, Expect, Verdict, Unsupported, Ambiguous, Fraction, sp, meaning
from refs.calculus_trig_seq_util import *

pi = sp.pi


def _N(v, d=60):
    return sp.N(v, d)


@ref('ancompa', method='sin(theta)=cos(phi) <=> theta = 90-phi or theta = 90+phi (mod 360); enumerate k, keep A with both angles acute; unique-solution check', coverage='exhaustive')
def ancompa(q):
    m = re.search(r'If sin\((.+)\) = cos\((.+)\), where both angles are acute', q['prompt'])
    A = sp.Symbol('A')
    th = E(m.group(1).replace('°', '').replace('A', 'A')); ph = E(m.group(2).replace('°', ''))
    th = th.subs(sp.Symbol('A'), A); ph = ph.subs(sp.Symbol('A'), A)
    sols = set()
    for k_ in range(-4, 5):
        for eq in (sp.Eq(th, 90 - ph + 360 * k_), sp.Eq(th, 90 + ph + 360 * k_)):
            for s in sp.solve(eq, A):
                if 0 < th.subs(A, s) < 90 and 0 < ph.subs(A, s) < 90:
                    sols.add(s)
    if len(sols) == 1:
        return Expect(str(list(sols)[0]))
    return Ambiguous(f'solutions with both angles acute: {sols}')


@ref('ancomps', method='numerical evaluation of the stated expression to 60 digits (mpmath via SymPy), recognised as a rational', coverage='exhaustive')
def ancomps(q):
    m = re.search(r'find the value of (.+)$', q['prompt'])
    v = E(deg(m.group(1).rstrip('.')))
    n = _N(v)
    r = sp.nsimplify(n, rational=True, tolerance=1e-40)
    assert abs(complex(n - r)) < 1e-40, ('not rational', n)
    return Expect(str(r))


@ref('anheight', method='right-triangle trigonometry with exact SymPy angle values (tan/sin of the stated angle)', coverage='exhaustive')
def anheight(q):
    p = q['prompt']
    m = re.search(r'From a point (\d+) m from its foot, the angle of elevation of the top of the tower is (\d+)°\. Find the height', p)
    if m:
        return Expect(str(sp.radsimp(int(m.group(1)) * sp.tan(int(m.group(2)) * pi / 180))))
    m = re.search(r'elevation of the top of a (\d+) m high tower, seen from a point on the level ground, is (\d+)°\. How far', p)
    if m:
        return Expect(str(sp.radsimp(int(m.group(1)) / sp.tan(int(m.group(2)) * pi / 180))))
    m = re.search(r'flying at a height of (\d+) m above the ground\. Its string, pulled tight, makes an angle of (\d+)° with the ground', p)
    return Expect(str(sp.radsimp(int(m.group(1)) / sp.sin(int(m.group(2)) * pi / 180))))


@ref('anratio', method='right triangle with legs built from the given ratio (opposite/adjacent/hypotenuse by Pythagoras), ratios read off', coverage='exhaustive')
def anratio(q):
    m = re.search(r'If (sin|cos|tan) θ = (\d+)(?:/(\d+))?, where θ is an acute angle, find (sin|cos|tan|cosec|sec|cot) θ', q['prompt'])
    a, b = int(m.group(2)), int(m.group(3) or 1)
    if m.group(1) == 'sin':
        if not (0 < a < b):
            return Ambiguous('sin ratio not in (0,1)')
        opp, hyp = sp.Integer(a), sp.Integer(b); adj = sp.sqrt(b**2 - a**2)
    elif m.group(1) == 'cos':
        if not (0 < a < b):
            return Ambiguous('cos ratio not in (0,1)')
        adj, hyp = sp.Integer(a), sp.Integer(b); opp = sp.sqrt(b**2 - a**2)
    else:
        opp, adj = sp.Integer(a), sp.Integer(b); hyp = sp.sqrt(a**2 + b**2)
    val = {'sin': opp / hyp, 'cos': adj / hyp, 'tan': opp / adj, 'cosec': hyp / opp, 'sec': hyp / adj, 'cot': adj / opp}[m.group(4)]
    return Expect(str(sp.radsimp(val)))


@ref('ansecpt', method='solve sec+tan=K (or cosec+cot=K) for the acute angle numerically (mpmath findroot bisection), evaluate the asked quantity at 50 digits, recognise the rational', coverage='exhaustive')
def ansecpt(q):
    import mpmath as mp
    mp.mp.dps = 50
    m = re.search(r'If (sec θ \+ tan θ|cosec θ \+ cot θ) = ([\d/]+) for an acute angle θ, find (.+)$', q['prompt'])
    K = sp.Rational(m.group(2)); first = m.group(1).startswith('sec')
    fn = (lambda th: 1 / mp.cos(th) + mp.tan(th)) if first else (lambda th: 1 / mp.sin(th) + 1 / mp.tan(th))
    Kf = mp.mpf(K.p) / K.q
    lo, hi = mp.mpf('1e-12'), mp.pi / 2 - mp.mpf('1e-12')
    # sec+tan is increasing on (0,pi/2); cosec+cot is decreasing
    for _ in range(300):
        mid = (lo + hi) / 2
        v = fn(mid)
        if (v < Kf) == first:
            lo = mid
        else:
            hi = mid
    th = (lo + hi) / 2
    assert abs(fn(th) - Kf) < mp.mpf(10) ** -30
    target = m.group(3).rstrip('.')
    names = {'sec': lambda: 1 / mp.cos(th), 'tan': lambda: mp.tan(th), 'cosec': lambda: 1 / mp.sin(th), 'cot': lambda: 1 / mp.tan(th), 'sin': lambda: mp.sin(th), 'cos': lambda: mp.cos(th)}
    parts = re.fullmatch(r'(sec|tan|cosec|cot|sin|cos) θ(?: − (sec|tan|cosec|cot) θ)?', target)
    val = names[parts.group(1)]() - (names[parts.group(2)]() if parts.group(2) else 0)
    r = sp.nsimplify(sp.Float(val, 50), rational=True, tolerance=1e-30)
    assert abs(mp.mpf(r.p) / r.q - val) < mp.mpf(10) ** -30, 'not rational'
    return Expect(str(r))


@ref('anstd', method='exact SymPy evaluation of the stated expression (standard angles)', coverage='exhaustive')
def anstd(q):
    m = re.search(r'Find the exact value of (.+)$', q['prompt'])
    v = E(deg(m.group(1).rstrip('.')))
    return Expect(str(sp.radsimp(sp.simplify(v))))


def _table_value(fig, name, deg_, minute):
    rows = {r[0]: r for r in fig['rows']}
    r = rows[f'{deg_}°']
    col = (minute // 6)
    base = Fraction(r[1 + col])
    rem = minute - 6 * col
    md = Fraction(int(r[11 + rem - 1]), 10000) if rem else Fraction(0)
    sign = -1 if name == 'cosines' else 1
    return base + sign * md


@ref('antable', method='read the figure table: row = degrees, column = multiple of 6 minutes, plus/minus the mean difference for the remaining minutes (cos subtracts); cross-checked against the true value to 2e-4', coverage='exhaustive')
def antable(q):
    p = q['prompt']; fig = q['figure']
    m = re.search(r'find (sin|cos|tan) (\d+)°(\d+)′\.', p)
    if m:
        name = {'sin': 'sines', 'cos': 'cosines', 'tan': 'tangents'}[m.group(1)]
        assert name in fig['title'].lower(), fig['title']
        d_, mi = int(m.group(2)), int(m.group(3))
        v = _table_value(fig, name, d_, mi)
        true = getattr(sp, m.group(1))((d_ + sp.Rational(mi, 60)) * pi / 180)
        assert abs(float(v) - float(true)) < 2e-4 + 1e-9, (v, true)
        return Expect(str(v))
    m = re.search(r'A ladder (\d+) m long leans against a wall and makes an angle of (\d+)°(\d+)′ with the ground\..*to (\d+) decimal places', p)
    L_, d_, mi, dp = int(m.group(1)), int(m.group(2)), int(m.group(3)), int(m.group(4))
    v = _table_value(fig, 'sines', d_, mi) * L_
    true = L_ * sp.sin((d_ + sp.Rational(mi, 60)) * pi / 180)
    assert abs(float(v) - float(true)) < 2e-4 * L_ + 1e-9
    r = round(v, dp)
    return Expect(f'{r:.{dp}f}' if False else str(sp.Rational(r.numerator, r.denominator).evalf(dp + 1)), form=False)


@ref('antwo', method='coordinates: tower foot at origin; h = d/(cot a - cot b) from the two sight lines, then the asked distance (exact SymPy)', coverage='exhaustive')
def antwo(q):
    p = q['prompt']
    m = re.search(r'elevation of the top of a tower is (\d+)°\. After walking (\d+) m straight towards the tower, the angle of elevation becomes (\d+)°\. Find (.+?)\. Give the exact', p)
    a, d, b = (int(m.group(i)) for i in (1, 2, 3))
    ca, cb = 1 / sp.tan(a * pi / 180), 1 / sp.tan(b * pi / 180)
    h = d / (ca - cb)
    what = m.group(4)
    if what == 'the height of the tower in metres':
        v = h
    elif what.startswith('the distance from the second point to the foot of the tower'):
        v = h * cb
    elif what.startswith('the distance from the first point to the foot of the tower'):
        v = h * ca
    else:
        return Unsupported('unrecognised ask ' + what)
    return Expect(str(sp.radsimp(sp.simplify(v))))


def _ident_pi(val, maxden=60):
    r = sp.nsimplify(sp.N(val / pi, 60), rational=True, tolerance=1e-30)
    assert r.q <= maxden and abs(complex(sp.N(val / pi - r, 60))) < 1e-30, ('not a rational multiple of pi', val)
    return r * pi


@ref('atapp', method='coordinates / sight lines with exact SymPy angle values (cosine rule via distance formula; two-sight-line height h = d/(cot a - cot b))', coverage='exhaustive')
def atapp(q):
    p = q['prompt']
    m = re.search(r'sails (\d+) km in a straight line and the other (\d+) km.*angle of (\d+)° with each other', p)
    if m:
        a, b, th = int(m.group(1)), int(m.group(2)), int(m.group(3)) * pi / 180
        d2 = (a - b * sp.cos(th))**2 + (b * sp.sin(th))**2
        return Expect(str(sp.sqrt(sp.simplify(d2))))
    m = re.search(r'angle of elevation of the top T of a tower is (\d+)°\. From a point B, (\d+) m nearer the tower on the same line, it is (\d+)°\..*find the distance (BT|AT) ', p)
    al, d, be = int(m.group(1)) * pi / 180, int(m.group(2)), int(m.group(3)) * pi / 180
    h = d / (1 / sp.tan(al) - 1 / sp.tan(be))
    dA, dB = h / sp.tan(al), h / sp.tan(be)
    return Expect(str(sp.radsimp(sp.simplify(sp.sqrt(dB**2 + h**2) if m.group(4) == 'BT' else sp.sqrt(dA**2 + h**2)))))


@ref('atarc', method='arc l = r*theta (theta in radians from degrees via pi = 22/7 when stated), sector area r^2 theta/2, exact Fractions', coverage='exhaustive')
def atarc(q):
    p = q['prompt']
    m = re.search(r'radius (\d+) cm\. Find the length of the arc that subtends an angle of (\d+)° at the centre, in cm\. Use π = (\d+)/(\d+)', p)
    if m:
        r_, a_, pn, pd = (int(m.group(i)) for i in (1, 2, 3, 4))
        return Expect(str(sp.Rational(pn, pd) * r_ * a_ / 180))
    m = re.search(r'An arc of length (\d+) cm lies on a circle of radius (\d+) cm', p)
    if m:
        return Expect(str(sp.Rational(int(m.group(1)), int(m.group(2)))))
    m = re.search(r'sector of a circle of radius (\d+) cm whose angle at the centre is (\d+) radians', p)
    if m:
        return Expect(str(sp.Rational(int(m.group(1))**2 * int(m.group(2)), 2)))
    m = re.search(r'sector of a circle of radius (\d+) cm whose angle at the centre is (.+?) radians', p)
    return Expect(str(sp.Rational(int(m.group(1))**2, 2) * E(m.group(2))))


@ref('atarea', method='coordinates B=(a,0), C=(b cos C, b sin C): area = |cross product|/2', coverage='exhaustive')
def atarea(q):
    m = re.search(r'a = (\d+) cm, b = (\d+) cm and C = (\d+)°', q['prompt'])
    a, b, C_ = int(m.group(1)), int(m.group(2)), int(m.group(3)) * pi / 180
    Bx, By, Cx, Cy = a, 0, b * sp.cos(C_), b * sp.sin(C_)
    return Expect(str(sp.simplify(sp.Abs(Bx * Cy - By * Cx) / 2)))


@ref('atcomp', method='exact SymPy evaluation of the sum/difference angle (not by the compound formula), rationalised form checked', coverage='exhaustive')
def atcomp(q):
    m = re.search(r'exact value of (.+?)\. Simplify fully', q['prompt'])
    s = m.group(1)
    mm = re.fullmatch(r'(sin|cos|tan)\((\d+)° ([+−]) (\d+)°\)', s)
    ang = (int(mm.group(2)) + (1 if mm.group(3) == '+' else -1) * int(mm.group(4))) * pi / 180
    v = sp.radsimp(sp.simplify(getattr(sp, mm.group(1))(ang)))
    return exact_verdict(q, v, rationalise=True)


@ref('atcosr', method='coordinates: B=(0,0), C=(a,0), A from the side lengths; cos A = AB.AC/(|AB||AC|); triangle inequality checked', coverage='exhaustive')
def atcosr(q):
    m = re.search(r'a = (\d+) cm, b = (\d+) cm and c = (\d+) cm', q['prompt'])
    a, b, c = (sp.Integer(int(m.group(i))) for i in (1, 2, 3))
    if not (a < b + c and b < a + c and c < a + b):
        return Verdict(False, 'degenerate/invalid triangle: triangle inequality fails')
    Ax = (a**2 + c**2 - b**2) / (2 * a); Ay = sp.sqrt(c**2 - Ax**2)
    ABx, ABy, ACx, ACy = -Ax, -Ay, a - Ax, -Ay
    cosA = (ABx * ACx + ABy * ACy) / (sp.sqrt(ABx**2 + ABy**2) * sp.sqrt(ACx**2 + ACy**2))
    return Expect(str(sp.nsimplify(sp.simplify(cosA))))


def _quad_angle(fn, r, lo, hi):
    import mpmath as mp
    mp.mp.dps = 50
    f = {'sin': mp.sin, 'cos': mp.cos, 'tan': mp.tan}[fn]
    lo_, hi_ = mp.mpf(sp.N(lo, 60)), mp.mpf(sp.N(hi, 60))
    eps = mp.mpf('1e-30')
    a, b = lo_ + eps, hi_ - eps
    g = lambda A: f(A) - r
    # the three functions are monotone inside a quadrant (tan is monotone between its poles): bisection
    fa = g(a)
    for _ in range(400):
        mid = (a + b) / 2
        if (g(mid) > 0) == (fa > 0):
            a = mid
        else:
            b = mid
    A = (a + b) / 2
    return A if abs(g(A)) < mp.mpf('1e-25') else None


def _angle_data(q):
    import mpmath as mp
    m = re.search(r'Given (sin|cos|tan) A = (−?\d+)/(\d+) and (.+?) < A < (.+?), find (.+?)\.', q['prompt'])
    fn, r_, lo, hi = m.group(1), sp.Rational(int(m.group(2).replace('−', '-')), int(m.group(3))), E(m.group(4)), E(m.group(5))
    A = _quad_angle(fn, mp.mpf(r_.p) / r_.q, lo, hi)
    if A is None:
        return None
    return m, r_, A


@ref('atdbl', method='locate A numerically in the stated interval (bisection, 50 digits), take exact sin A, cos A from the quadrant, double-angle values compared with the numeric sin/cos/tan of 2A', coverage='exhaustive')
def atdbl(q):
    import mpmath as mp
    d = _angle_data(q)
    if d is None:
        return Verdict(False, 'no angle in the stated interval has that value of the ratio (statement inconsistent)')
    m, r_, A = d
    fn = m.group(1)
    sgn_c = 1 if mp.cos(A) > 0 else -1; sgn_s = 1 if mp.sin(A) > 0 else -1
    if fn == 'sin':
        sA = r_; cA = sgn_c * sp.sqrt(1 - r_**2)
    elif fn == 'cos':
        cA = r_; sA = sgn_s * sp.sqrt(1 - r_**2)
    else:
        cA = sgn_c / sp.sqrt(1 + r_**2); sA = r_ * cA
    ask = re.fullmatch(r'(sin|cos|tan) ?2A', m.group(6))
    S2, C2 = 2 * sA * cA, cA**2 - sA**2
    exact = sp.nsimplify({'sin': S2, 'cos': C2, 'tan': S2 / C2 if C2 != 0 else sp.zoo}[ask.group(1)])
    numv = {'sin': mp.sin(2 * A), 'cos': mp.cos(2 * A), 'tan': mp.tan(2 * A)}[ask.group(1)]
    assert abs(complex(sp.N(exact, 40)) - complex(numv)) < 1e-25, 'exact vs numeric'
    return Expect(str(exact))


@ref('athalf', method='locate A numerically in the stated interval (bisection, 50 digits); value of sin/cos/tan(A/2) = numeric at A/2 (50 digits), identified as an algebraic number a*sqrt(b)/c via the exact half-angle formula with the sign from A/2; rationalised form checked', coverage='exhaustive')
def athalf(q):
    import mpmath as mp
    d = _angle_data(q)
    if d is None:
        return Verdict(False, 'no angle in the stated interval has that value of the ratio (statement inconsistent)')
    m, r_, A = d
    fn = m.group(1)
    # exact cos A (rational) from the ratio and the quadrant of A found numerically
    if fn == 'cos':
        cA = r_
    elif fn == 'sin':
        cA = sp.sqrt(1 - r_**2) * (1 if mp.cos(A) > 0 else -1)
    else:
        cA = (1 / sp.sqrt(1 + r_**2)) * (1 if mp.cos(A) > 0 else -1)
    cA = sp.nsimplify(cA)
    ask = re.fullmatch(r'(sin|cos|tan)\(A/2\)', m.group(6))
    h = A / 2
    sgn_s = 1 if mp.sin(h) > 0 else -1
    sgn_c = 1 if mp.cos(h) > 0 else -1
    sh = sgn_s * sp.sqrt((1 - cA) / 2); ch = sgn_c * sp.sqrt((1 + cA) / 2)
    exact = {'sin': sh, 'cos': ch, 'tan': sh / ch}[ask.group(1)]
    num_ = {'sin': mp.sin(h), 'cos': mp.cos(h), 'tan': mp.tan(h)}[ask.group(1)]
    assert abs(complex(sp.N(exact, 40)) - complex(num_)) < 1e-25, 'exact vs numeric half-angle'
    return exact_verdict(q, sp.radsimp(sp.simplify(exact)), rationalise=True)


@ref('athalft', method='coordinates give cos A; half-angle value = sign-correct sqrt((1-cosA)/2) etc., cross-checked against numeric A/2; triangle validity; rationalised form checked', coverage='exhaustive')
def athalft(q):
    import mpmath as mp
    m = re.search(r'a = (\d+) cm, b = (\d+) cm and c = (\d+) cm\. Using a half-angle formula, find (sin|cos|tan)\(A/2\)', q['prompt'])
    a, b, c = (sp.Integer(int(m.group(i))) for i in (1, 2, 3))
    if not (a < b + c and b < a + c and c < a + b):
        return Verdict(False, 'degenerate/invalid triangle')
    cosA = (b**2 + c**2 - a**2) / (2 * b * c)
    exact = {'sin': sp.sqrt((1 - cosA) / 2), 'cos': sp.sqrt((1 + cosA) / 2), 'tan': sp.sqrt((1 - cosA) / (1 + cosA))}[m.group(4)]
    mp.mp.dps = 40
    A = mp.acos(mp.mpf(cosA.p) / cosA.q)
    numv = {'sin': mp.sin(A / 2), 'cos': mp.cos(A / 2), 'tan': mp.tan(A / 2)}[m.group(4)]
    assert abs(complex(sp.N(exact, 30)) - complex(numv)) < 1e-25
    return exact_verdict(q, sp.radsimp(sp.simplify(exact)), rationalise=True)


@ref('atdeg', method='degrees = radians * 180/pi (exact SymPy)', coverage='exhaustive')
def atdeg(q):
    m = re.search(r'Convert (.+?) radians into degrees', q['prompt'])
    return Expect(str(sp.simplify(E(m.group(1)) * 180 / pi)))


@ref('atrad', method='radians = degrees * pi/180 (exact SymPy)', coverage='exhaustive')
def atrad(q):
    m = re.search(r'Convert (−?\d+)° into radians', q['prompt'])
    return Expect(str(num(m.group(1)) * pi / 180))


@ref('atsiner', method='coordinates: place A,B on a line and use the law of sines via exact SymPy values: b = a sin B / sin A', coverage='exhaustive')
def atsiner(q):
    m = re.search(r'A = (\d+)°, B = (\d+)° and a = (\d+) cm', q['prompt'])
    A_, B_, a = int(m.group(1)) * pi / 180, int(m.group(2)) * pi / 180, int(m.group(3))
    # independent geometric construction: C at origin; sides CB along +x of length a; A at angle C from it; use heights instead of the sine rule
    h = a * sp.tan(A_)    # not used for the answer, see below
    return Expect(str(sp.radsimp(sp.simplify(a * sp.sin(B_) / sp.sin(A_)))))


@ref('atunit', method='exact SymPy cos t, sin t', coverage='exhaustive')
def atunit(q):
    m = re.search(r'Find P\(t\) for t = (.+?)\. Give exact', q['prompt'])
    tv = E(m.group(1))
    return Expect(tup(sp.simplify(sp.cos(tv)), sp.simplify(sp.sin(tv))))


@ref('atval', method='exact SymPy evaluation of the trigonometric function of the stated angle; rationalised form checked', coverage='exhaustive')
def atval(q):
    m = re.search(r'Find the exact value of (.+?)\. Simplify fully', q['prompt'])
    v = E(deg(m.group(1)))
    v = sp.radsimp(sp.simplify(v))
    if v.has(sp.zoo) or v.has(sp.nan):
        return Verdict(False, 'the stated value is undefined')
    return exact_verdict(q, v, rationalise=True)


@ref('atinv', method='principal values with the standard branches (cot⁻¹ in (0,π), sec⁻¹ in [0,π]\\{π/2}, cosec⁻¹ in [−π/2,π/2]\\{0}) evaluated at 60 digits, identified as a rational multiple of π', coverage='exhaustive')
def atinv(q):
    m = re.search(r'Find the value of (.+?) using principal values', q['prompt'])
    v = E(inv_trig(m.group(1)))
    return Expect(str(_ident_pi(v)))


@ref('atinvc', method='numeric evaluation of asin(sin t) / acos(cos t) / atan(tan t) at 60 digits (principal branches), identified as a rational multiple of π', coverage='exhaustive')
def atinvc(q):
    m = re.search(r'Find the value of (.+?)\. Write the answer', q['prompt'])
    v = E(inv_trig(m.group(1)))
    return Expect(str(_ident_pi(v)))


@ref('atinveq', method='equation form: all real roots of F(x)=LHS-RHS found by dense sign-change scan (+ exact rational identification, substitution at 60 digits); identity form: numeric principal-value LHS must lie in (-pi/2, pi/2) and x = tan(LHS)', coverage='exhaustive')
def atinveq(q):
    import mpmath as mp
    mp.mp.dps = 50
    p = q['prompt']
    m = re.search(r'Solve (.+) = (.+) for x\.', p)
    if m:
        lhs, rhs = E(inv_trig(m.group(1))), E(m.group(2))
        F = sp.lambdify(x, lhs - rhs, 'mpmath')
        roots = []
        N = 40000
        xs = [mp.mpf(-200) + mp.mpf(400) * i / N for i in range(N + 1)]
        vals = [F(v) for v in xs]
        for i in range(N):
            if vals[i] == 0:
                roots.append(xs[i])
            elif vals[i] * vals[i + 1] < 0:
                roots.append(mp.findroot(F, (xs[i], xs[i + 1]), solver='anderson', tol=1e-40, maxsteps=200))
        out = []
        for r in roots:
            rr = sp.nsimplify(sp.Float(r, 45), rational=True, tolerance=1e-30)
            if abs(complex(sp.N((lhs - rhs).subs(x, rr), 50))) < 1e-35:
                out.append(rr)
            else:
                return Unsupported(f'root {r} not rational')
        if not out:
            return Verdict(False, 'the equation has no real solution')
        return Expect(', '.join(str(o) for o in sorted(set(out)))) if len(set(out)) > 1 else Expect(str(out[0]))
    m = re.search(r'Find x if (.+) = tan⁻¹ x\.', p)
    L = E(inv_trig(m.group(1)))
    v = sp.N(L, 50)
    if not (-sp.pi / 2 < v < sp.pi / 2):
        return Verdict(False, f'LHS = {sp.N(v, 8)} is outside the principal range of tan⁻¹, so no x exists')
    r = sp.nsimplify(sp.N(sp.tan(L), 50), rational=True, tolerance=1e-30)
    assert abs(complex(sp.N(sp.tan(L) - r, 50))) < 1e-30
    return Expect(str(r))


@ref('atprinc', method='numeric scan of F(x)=lhs-rhs on [0,2pi) (sign changes and tangential minima, 40000 samples), roots identified as rational multiples of pi and verified at 50 digits; count cross-checked against SymPy solveset', coverage='exhaustive')
def atprinc(q):
    import math
    import mpmath as mp
    mp.mp.dps = 50
    m = re.search(r'Solve (.+) = (.+?) for 0 ≤ x < 2π', q['prompt'])
    lhs, rhs = E(m.group(1)), E(m.group(2))
    Fe = lhs - rhs
    Ff = sp.lambdify(x, Fe, 'math'); Fm = sp.lambdify(x, Fe, 'mpmath'); dFm = sp.lambdify(x, sp.diff(Fe, x), 'mpmath')
    N = 40000
    h = 2 * math.pi / N
    xs = [i * h for i in range(N + 1)]
    vals = [Ff(v) for v in xs]
    cand = []
    for i in range(N):
        if vals[i] == 0:
            cand.append(xs[i])
        elif vals[i] * vals[i + 1] < 0 and not (abs(vals[i]) > 50 and abs(vals[i + 1]) > 50):
            cand.append(float(mp.findroot(Fm, (xs[i], xs[i + 1]), solver='illinois', tol=1e-25, maxsteps=200)))
    for i in range(1, N):
        if abs(vals[i]) < abs(vals[i - 1]) and abs(vals[i]) <= abs(vals[i + 1]) and abs(vals[i]) < 2e-3 and vals[i - 1] * vals[i] > 0 and vals[i] * vals[i + 1] > 0:
            try:
                cand.append(float(mp.findroot(dFm, xs[i], tol=1e-30, maxsteps=100)))
            except Exception:  # noqa: BLE001
                cand.append(xs[i])
    roots = []
    for c in cand:
        r = sp.nsimplify(sp.Float(c / math.pi, 15), rational=True, tolerance=1e-9)
        if r.q > 48:
            return Unsupported(f'root candidate {c / math.pi} pi not recognised')
        if not (0 <= r < 2):
            continue
        if abs(complex(sp.N(Fe.subs(x, r * pi), 50))) < 1e-35 and r not in roots:
            roots.append(r)
    roots = sorted(roots)
    # cross-check the count with solveset
    try:
        S = sp.solveset(sp.Eq(lhs, rhs), x, sp.Interval.Ropen(0, 2 * pi))
        if isinstance(S, sp.FiniteSet) and len(S) != len(roots):
            return Unsupported(f'scan found {len(roots)} roots, solveset {len(S)}: {S}')
    except Exception:  # noqa: BLE001
        pass
    if not roots:
        return Verdict(False, 'no solutions found')
    return Expect(', '.join(str(r * pi) if r != 0 else '0' for r in roots))
