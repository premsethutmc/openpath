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
