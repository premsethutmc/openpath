"""choice-type families: the keyed letter is checked against the option texts exported by the supplementary statement export
(/tmp/certout/calculus-trig-sequences/choiceopts/<family>.jsonl: the options exactly as shown to the student)."""
import json
import math
import re
import mpmath as mp
from kit import ref, Expect, Verdict, Unsupported, Ambiguous, Fraction, sp
from refs.calculus_trig_seq_util import *

pi = sp.pi
_OPT = {}


def options(fam, q):
    if fam not in _OPT:
        _OPT[fam] = {}
        for l in open(f'/tmp/certout/calculus-trig-sequences/choiceopts/{fam}.jsonl'):
            r = json.loads(l)
            _OPT[fam][r['id']] = r['options']
    return _OPT[fam][q['id']]


def pick(fam, q, test, what):
    """letter of the unique option for which test(option_text) is True; Verdict(False) if none / several"""
    opts = options(fam, q)
    hits = [i for i, o in enumerate(opts) if test(o)]
    if len(hits) != 1:
        return Verdict(False, f'{what}: {len(hits)} options match the derived answer ({[opts[i] for i in hits]}); options {opts}; keyed {q["answer"]}')
    return Expect('ABCDEFGH'[hits[0]])


def _rn(s):
    return s.replace('−', '-')


# ---------------------------------------------------------------- aqcontd
@ref('aqcontd', method='compare the left and right pieces at each break point inside [lo,hi] (SymPy values); a break point at the right end needs left=value, at the left end the right-continuity of the piece is automatic; then match the option text', coverage='exhaustive')
def aqcontd(q):
    m = re.search(r'f\(x\) = (.+?) for x < (−?\d+); (.+?) for −?\d+ ≤ x < (−?\d+); and (.+?) for x ≥ (−?\d+)\. Which statement about the continuity of f on (the closed interval \[(−?[\d.]+), (−?[\d.]+)\]|ℝ)', q['prompt'])
    f1, f2, f3 = E(m.group(1)), E(m.group(3)), E(m.group(5))
    c1, c2 = num(m.group(2)), num(m.group(4)); assert num(m.group(6)) == c2
    lo, hi = (num(m.group(8)), num(m.group(9))) if m.group(8) else (-sp.oo, sp.oo)
    D = set()
    for c, fl, fr in ((c1, f1, f2), (c2, f2, f3)):
        if lo <= c <= hi:
            if c == lo:
                continue   # at the left end only right-continuity matters and the piece to the right is the value
            if sp.simplify(fl.subs(x, c) - fr.subs(x, c)) != 0:
                D.add(c)

    def claimed(o):
        if 'continuous at every point' in o:
            return set()
        nums = [num(v) for v in re.findall(r'x = (−?\d+)', o)]
        return set(nums)
    return pick('aqcontd', q, lambda o: claimed(o) == D, f'discontinuities {sorted(D)}')


# ---------------------------------------------------------------- aqd2test
@ref('aqd2test', method='sign of f\'\'(c) from SymPy (and f\'(c)=0 verified); option text matched', coverage='exhaustive')
def aqd2test(q):
    m = re.search(r'For f\(x\) = (.+), x = (−?\d+) is a critical point', q['prompt'])
    f = E(m.group(1)); c = num(m.group(2))
    if sp.simplify(sp.diff(f, x).subs(x, c)) != 0:
        return Verdict(False, "statement false: f'(c) != 0")
    s = sp.diff(f, x, 2).subs(x, c)
    want = 'f has a local minimum' if s > 0 else 'f has a local maximum' if s < 0 else 'the test gives no conclusion'
    return pick('aqd2test', q, lambda o: o.startswith(want), want)


# ---------------------------------------------------------------- aqdecl
@ref('aqdecl', method='replace dy/dx, d2y/dx2... by symbols and test total degree (<=1 in the unknown and its derivatives => linear); ∂ present => partial', coverage='exhaustive')
def aqdecl(q):
    p = q['prompt']
    m = re.search(r'differential equation (.+?) \((?:y is the unknown function of x|u is the unknown function)\)', p)
    eq = m.group(1)
    opts = options('aqdecl', q)
    if '∂' in eq:
        return pick('aqdecl', q, lambda o: o == 'partial', 'partial equation')
    L = {1: 'p', 2: 'v', 3: 'w', 4: 'z'}
    for ch, n in (('²', 2), ('³', 3), ('⁴', 4)):
        eq = eq.replace(f'd{ch}y/dx{ch}', f' {L[n]} ')
    eq = eq.replace('dy/dx', f' {L[1]} ').replace('ʸ', '^(y)')
    eq = re.sub(r'(?<![a-zA-Z])y(?![a-zA-Z])', ' u ', eq)
    lhs, rhs = eq.split('=')
    e = E(lhs) - E(rhs)
    syms = [sp.Symbol(c) for c in 'upvwz']
    try:
        P = sp.Poly(e, *syms)
        linear = P.total_degree() <= 1
    except sp.PolynomialError:
        linear = False
    want = 'ordinary and linear' if linear else 'ordinary and non-linear'
    return pick('aqdecl', q, lambda o: o == want, want)


# ---------------------------------------------------------------- limits of two variables
def _limit_origin(g_text_fn):
    """numerical limit at the origin along circles r = 1e-3, 1e-5, 1e-7 over 720 angles (mp, 40 digits).
    returns ('exists', L) or ('dne', spread)"""
    mp.mp.dps = 40
    vals = {}
    for r in (mp.mpf('1e-3'), mp.mpf('1e-5'), mp.mpf('1e-7')):
        vs = []
        for k in range(720):
            th = 2 * mp.pi * k / 720
            vs.append(g_text_fn(r * mp.cos(th), r * mp.sin(th)))
        vals[r] = (min(vs), max(vs))
    (a1, b1), (a2, b2), (a3, b3) = vals[mp.mpf('1e-3')], vals[mp.mpf('1e-5')], vals[mp.mpf('1e-7')]
    spread = b3 - a3
    # curved paths x = c*y^k and y = c*x^k (circles miss thin cusps such as x = y^2)
    cv = []
    t = mp.mpf('1e-7')
    for c in (1, -1, 2, -2, mp.mpf(1) / 2, -mp.mpf(1) / 2):
        for k in (2, 3):
            for tt in (t, -t):
                try:
                    cv.append(g_text_fn(c * tt ** k, tt)); cv.append(g_text_fn(tt, c * tt ** k))
                except ZeroDivisionError:
                    pass
    if cv:
        spread = max(spread, max(cv + [b3]) - min(cv + [a3]))
    if spread < mp.mpf('1e-4'):
        return 'exists', (a3 + b3) / 2
    return 'dne', spread


@ref('armvcont', method='numerical limit at the origin over circles of radius 1e-3,1e-5,1e-7 at 720 angles (40 digits; spread must vanish) compared with f(0,0); option text matched', coverage='exhaustive')
def armvcont(q):
    m = re.search(r'f\(x, y\) = (.+) for \(x, y\) ≠ \(0, 0\), and f\(0, 0\) = (−?\d+)\. Which statement is true', q['prompt'])
    g = sp.lambdify((x, y), E(m.group(1)), 'mpmath'); v = num(m.group(2))
    kind, L = _limit_origin(g)
    if kind == 'dne':
        want = 'the limit does not exist'
    elif abs(L - mp.mpf(v.p) / v.q) < mp.mpf('1e-4'):
        want = 'f is continuous at (0, 0)'
    else:
        want = 'the limit exists but is not equal to f(0, 0)'
    return pick('armvcont', q, lambda o: (o == want) or (want in o), want)


@ref('armvlimx', method='numerical limit at the origin over circles of radius 1e-3,1e-5,1e-7 at 720 angles (40 digits); classification of existence / value 0; option text matched', coverage='exhaustive')
def armvlimx(q):
    m = re.search(r'Let f\(x, y\) = (.+) for \(x, y\) ≠ \(0, 0\)\. Which statement', q['prompt'])
    g = sp.lambdify((x, y), E(m.group(1)), 'mpmath')
    kind, L = _limit_origin(g)
    if kind == 'dne':
        want = 'The limit does not exist'
    elif abs(L) < mp.mpf('1e-4'):
        want = 'The limit exists and equals 0'
    else:
        want = 'The limit exists and is not 0'
    return pick('armvlimx', q, lambda o: o == want, want)


# ---------------------------------------------------------------- trig identities
def _trig_read(s):
    s = s.replace('[', '(').replace(']', ')').replace('θ', 'x').replace('cosec', 'csc').replace('½', '(1/2)').replace('÷', '/').replace('×', '*')
    s = re.sub(r'(sin|cos|tan|cot|sec|csc)([²³])\s*(\d*x)', lambda m_: f"(({m_.group(1)}({m_.group(3)}))**{m_.group(2).translate(SUP)})", s)
    return E(s)


def _same_fn(a, b):
    for v in (sp.Rational(3, 10), sp.Rational(7, 10), sp.Rational(11, 10), sp.Rational(-9, 10), sp.Rational(13, 10)):
        if abs(complex(sp.N(a.subs(x, v) - b.subs(x, v), 30))) > 1e-18:
            return False
    return True


@ref('anidsimp', method='numerical identity test at 5 points against each option; exactly one option may equal the expression', coverage='exhaustive')
def anidsimp(q):
    m = re.search(r'Simplify (.+)\. Which of these is it equal to\?', q['prompt'])
    e = _trig_read(m.group(1))
    return pick('anidsimp', q, lambda o: _same_fn(e, _trig_read(o)), 'identity')


@ref('atcsimp', method='numerical identity test at 5 points against each option', coverage='exhaustive')
def atcsimp(q):
    m = re.search(r'Which of these is equal to (.+)\?', q['prompt'])
    e = _trig_read(m.group(1))
    return pick('atcsimp', q, lambda o: _same_fn(e, _trig_read(o)), 'identity')


@ref('atp2s', method='numerical identity test at 5 points against each option', coverage='exhaustive')
def atp2s(q):
    m = re.search(r'Which of these is equal to (.+?), written as a sum or difference', q['prompt'])
    e = _trig_read(m.group(1))
    return pick('atp2s', q, lambda o: _same_fn(e, _trig_read(o)), 'identity')


# ---------------------------------------------------------------- periods
@ref('atper', method='period of a*f(bx+c) = 2π/|b| (sin, cos, cosec, sec) or π/|b| (tan, cot), verified numerically: f(x+P)=f(x) at 12 points and f(x+P/k)!=f(x) for k=2..12; option matched', coverage='exhaustive')
def atper(q):
    m = re.search(r'period of y = (.+)\?', q['prompt'])
    f = E(m.group(1).replace('cosec', 'csc'))
    name = re.search(r'(sin|cos|tan|cot|sec|csc)', m.group(1).replace('cosec', 'csc')).group(1)
    arg = re.search(r'(?:sin|cos|tan|cot|sec|csc)\s*\(?([^)]*)\)?', m.group(1).replace('cosec', 'csc')).group(1)
    b = sp.diff(E(arg), x)
    P = (pi if name in ('tan', 'cot') else 2 * pi) / abs(b)
    pts = [sp.Rational(k, 7) + sp.Rational(1, 13) for k in range(1, 13)]
    ok = True
    for v in pts:
        a1, a2 = complex(sp.N(f.subs(x, v), 30)), complex(sp.N(f.subs(x, v + P), 30))
        ok &= abs(a1 - a2) < 1e-15 * max(1, abs(a1))
    smaller = []
    for k in range(2, 13):
        same = all(abs(complex(sp.N(f.subs(x, v), 30)) - complex(sp.N(f.subs(x, v + P / k), 30))) < 1e-15 * max(1, abs(complex(sp.N(f.subs(x, v), 30)))) for v in pts)
        if same:
            smaller.append(k)
    if not ok or smaller:
        return Verdict(False, f'internal: formula period {P} not minimal/valid {ok} {smaller}')
    return pick('atper', q, lambda o: mp_close(E(o), P), f'period {P}')


# ---------------------------------------------------------------- signs of sin t, cos t
@ref('atsign', method='numeric sin t, cos t at 60 digits; signs; the point must not lie on an axis', coverage='exhaustive')
def atsign(q):
    m = re.search(r'Take the real number t = (.+?) \(in radians\)', q['prompt'])
    tv = E(m.group(1))
    s, c = sp.N(sp.sin(tv), 60), sp.N(sp.cos(tv), 60)
    if abs(s) < 1e-30 or abs(c) < 1e-30:
        return Ambiguous('P(t) lies on an axis')
    want = ('sin t > 0' if s > 0 else 'sin t < 0') + ' and ' + ('cos t > 0' if c > 0 else 'cos t < 0')
    return pick('atsign', q, lambda o: o.startswith(want), want)


# ---------------------------------------------------------------- sigma notation
@ref('apsigch', method='expected AP terms from the printed series (first terms, last term, count); each option\'s sigma term list is evaluated and compared; the printed terms are checked for consistency', coverage='exhaustive')
def apsigch(q):
    m = re.search(r'the series (.+) \((\d+) terms\) written in sigma notation', q['prompt'])
    series, n = m.group(1), int(m.group(2))
    head, last = series.split('…')
    firsts = [int(_rn(t.strip().strip('+').strip().strip('()'))) for t in head.split(' + ') if t.strip()]
    lastv = int(_rn(last.replace('+', '').strip().strip('()')))
    d = firsts[1] - firsts[0]
    terms = [firsts[0] + i * d for i in range(n)]
    if any(firsts[i] != terms[i] for i in range(len(firsts))) or terms[-1] != lastv:
        return Verdict(False, f'printed series inconsistent with an AP of {n} terms: {series}')
    k = sp.Symbol('k')

    def sig(o):
        mm = re.fullmatch(r'Σ \(k = (\d+) to (\d+)\) \((.+)\)', o)
        lo, hi, body = int(mm.group(1)), int(mm.group(2)), E(mm.group(3))
        return [int(body.subs(k, i)) for i in range(lo, hi + 1)] == terms
    return pick('apsigch', q, sig, f'terms {terms}')


# ---------------------------------------------------------------- general solutions
def _scan_roots(F, lo, hi, N=24000):
    Ff = sp.lambdify(x, F, 'math'); Fm = sp.lambdify(x, F, 'mpmath'); dFm = sp.lambdify(x, sp.diff(F, x), 'mpmath')
    mp.mp.dps = 30
    h = (hi - lo) / N
    xs = [lo + i * h for i in range(N + 1)]
    vals = [Ff(v) for v in xs]
    roots = []
    for i in range(N):
        if vals[i] == 0:
            roots.append(xs[i])
        elif vals[i] * vals[i + 1] < 0 and not (abs(vals[i]) > 50 and abs(vals[i + 1]) > 50):
            roots.append(float(mp.findroot(Fm, (xs[i], xs[i + 1]), solver='illinois', tol=1e-25, maxsteps=200)))
    for i in range(1, N):
        if abs(vals[i]) < abs(vals[i - 1]) and abs(vals[i]) <= abs(vals[i + 1]) and abs(vals[i]) < 2e-3 and vals[i - 1] * vals[i] > 0 and vals[i] * vals[i + 1] > 0:
            try:
                roots.append(float(mp.findroot(dFm, xs[i], tol=1e-25, maxsteps=100)))
            except Exception:  # noqa: BLE001
                roots.append(xs[i])
    out = []
    for r in sorted(roots):
        if abs(Ff(r)) < 1e-9 and (not out or abs(r - out[-1]) > 1e-6):
            out.append(r)
    return out


def _option_points(o, lo, hi):
    body = o.replace('x = ', '').replace(', n ∈ ℤ', '').strip().replace('(−1)ⁿ', '(-1)**n')
    forms = [body.replace('±', '+'), body.replace('±', '-')] if '±' in body else [body]
    pts = []
    for fm in forms:
        expr = E(_rn(fm).replace('n', ' n ') if False else fm)
        nn = sp.Symbol('n')
        fn = sp.lambdify(nn, expr, 'math')
        for n in range(-60, 61):
            v = fn(n)
            if lo <= v <= hi:
                pts.append(v)
    return sorted(set(round(p, 9) for p in pts))


@ref('atgen', method='true solution set of the equation in the window [-10,10] by a dense numeric scan (sign changes and tangential minima, refined with mpmath); each option generates its points for n in [-60,60]; the matching option must give the same set', coverage='exhaustive')
def atgen(q):
    m = re.search(r'general solution of (.+)\?$', q['prompt'])
    eq = m.group(1)
    lhs, rhs = eq.split('=')
    F = E(lhs.replace('cosec', 'csc')) - E(rhs)
    lo, hi = -10.0, 10.0
    true = [round(r, 9) for r in _scan_roots(F, lo, hi)]

    def test(o):
        try:
            pts = _option_points(o, lo, hi)
        except Exception:  # noqa: BLE001
            return False
        return len(pts) == len(true) and all(abs(a - b) < 1e-6 for a, b in zip(pts, true))
    return pick('atgen', q, test, f'{len(true)} solutions in [-10,10]')


# ---------------------------------------------------------------- domain and range of the six trig functions
def _set_from_text(t):
    t = t.strip()
    mm0 = re.fullmatch(r'(.+?) − \{(.+)\}', t)
    if mm0:
        return sp.Complement(_set_from_text(mm0.group(1)), sp.FiniteSet(*[E(v) for v in mm0.group(2).split(',')]))
    if t.startswith('ℝ (all') or t == 'ℝ':
        return sp.Reals
    m = re.fullmatch(r'ℝ − \((.+?), (.+?)\), that is.*', t)
    if m:
        return sp.Complement(sp.Reals, sp.Interval.open(E(m.group(1)), E(m.group(2))))
    parts = [p.strip() for p in t.split('∪')]
    S = sp.EmptySet
    for p in parts:
        mm = re.fullmatch(r'([\[(])\s*(.+?)\s*,\s*(.+?)\s*([\])])', p)
        if not mm:
            raise ValueError('unreadable set ' + t)
        a = -sp.oo if mm.group(2) in ('−∞', '-∞') else E(mm.group(2))
        b = sp.oo if mm.group(3) in ('∞', '+∞') else E(mm.group(3))
        S = S | sp.Interval(a, b, mm.group(1) == '(' and a != -sp.oo, mm.group(4) == ')' and b != sp.oo)
    return S


def _fn_parse(s):
    """'2 sin 2x' / 'tan x' / '2 cosec 2x' -> (a, name, b)"""
    s = s.replace('cosec', 'csc').strip()
    m = re.fullmatch(r'(\d+)?\s*(sin|cos|tan|cot|sec|csc)\s*(\d+)?x', s)
    return int(m.group(1) or 1), m.group(2), int(m.group(3) or 1)


def _poles_true(name, b, lo, hi):
    """zeros of the denominator (cos for tan/sec, sin for cot/csc) of the function in the window, by direct root enumeration"""
    if name in ('sin', 'cos'):
        return []
    den = (lambda v: math.cos(b * v)) if name in ('tan', 'sec') else (lambda v: math.sin(b * v))
    pts = []
    N = 40000
    h = (hi - lo) / N
    xs = [lo + i * h for i in range(N + 1)]
    vals = [den(v) for v in xs]
    for i in range(N):
        if vals[i] == 0:
            pts.append(xs[i])
        elif vals[i] * vals[i + 1] < 0:
            f = lambda v: den(v)
            a_, b_ = xs[i], xs[i + 1]
            for _ in range(80):
                mid = (a_ + b_) / 2
                if den(a_) * den(mid) <= 0:
                    b_ = mid
                else:
                    a_ = mid
            pts.append((a_ + b_) / 2)
    return pts


def _excluded_points(o, lo, hi):
    mm = re.fullmatch(r'all real x except x = (.+), n ∈ ℤ', o)
    if not mm:
        return None
    expr = E(mm.group(1).replace('(2n + 1)', '(2*n + 1)'))
    nn = sp.Symbol('n')
    fn = sp.lambdify(nn, expr, 'math')
    return sorted(v for v in (fn(n) for n in range(-80, 81)) if lo <= v <= hi)


@ref('atdom', method='domain: poles = zeros of the denominator cos(bx) (tan, sec) or sin(bx) (cot, cosec) found by direct root scan in [-10,10] and compared with each option\'s excluded points; range: a*{[-1,1] | R | (-oo,-1]u[1,oo)} with the sign of a irrelevant (symmetric sets) cross-checked by sampling', coverage='exhaustive')
def atdom(q):
    m = re.search(r'What is the (domain|range) of the function y = (.+)\?', q['prompt'])
    kind = m.group(1)
    a, name, b = _fn_parse(m.group(2))
    lo, hi = -10.0, 10.0
    if kind == 'domain':
        poles = _poles_true(name, b, lo, hi)

        def test(o):
            if o == 'all real numbers':
                return not poles
            pts = _excluded_points(o, lo, hi)
            if pts is None:
                return False
            return len(pts) == len(poles) and all(abs(p - r) < 1e-6 for p, r in zip(pts, poles))
        return pick('atdom', q, test, f'poles {len(poles)}')
    base = {'sin': sp.Interval(-1, 1), 'cos': sp.Interval(-1, 1), 'tan': sp.Reals, 'cot': sp.Reals,
            'sec': sp.Union(sp.Interval(-sp.oo, -1), sp.Interval(1, sp.oo)), 'csc': sp.Union(sp.Interval(-sp.oo, -1), sp.Interval(1, sp.oo))}[name]
    # scale by |a| (all base sets are symmetric about 0)
    if base == sp.Reals:
        want = sp.Reals
    elif isinstance(base, sp.Interval):
        want = sp.Interval(-a, a)
    else:
        want = sp.Union(sp.Interval(-sp.oo, -a), sp.Interval(a, sp.oo))
    # numeric cross-check: sample values lie in `want` and approach its boundary
    fnum = {'sin': math.sin, 'cos': math.cos, 'tan': math.tan, 'cot': lambda v: 1 / math.tan(v), 'sec': lambda v: 1 / math.cos(v), 'csc': lambda v: 1 / math.sin(v)}[name]
    vals = [a * fnum(b * (lo + (hi - lo) * i / 20000 + 1e-7)) for i in range(20001)]
    if isinstance(base, sp.Interval) and base != sp.Reals:
        assert abs(max(vals) - a) < 1e-6 and abs(min(vals) + a) < 1e-6
    elif base == sp.Reals:
        assert max(vals) > 1e3 and min(vals) < -1e3
    else:
        assert min(abs(v) for v in vals) >= a - 1e-9 and min(abs(v) for v in vals) < a + 1e-6 and max(vals) > 1e3 and min(vals) < -1e3
    return pick('atdom', q, lambda o: _set_from_text(o) == want, f'range {want}')


# ---------------------------------------------------------------- domain and range of inverse trig functions
_INV = {  # (domain, principal range) of each inverse function with the standard branches
    'sin': (sp.Interval(-1, 1), sp.Interval(-pi / 2, pi / 2)),
    'cos': (sp.Interval(-1, 1), sp.Interval(0, pi)),
    'tan': (sp.Reals, sp.Interval.open(-pi / 2, pi / 2)),
    'cot': (sp.Reals, sp.Interval.open(0, pi)),
    'sec': (sp.Union(sp.Interval(-sp.oo, -1), sp.Interval(1, sp.oo)), sp.Union(sp.Interval.Ropen(0, pi / 2), sp.Interval.Lopen(pi / 2, pi))),
    'csc': (sp.Union(sp.Interval(-sp.oo, -1), sp.Interval(1, sp.oo)), sp.Union(sp.Interval.Ropen(-pi / 2, 0), sp.Interval.Lopen(0, pi / 2))),
}


def _inv_name(s):
    return {'cosec': 'csc'}.get(s, s)


@ref('atinvd', method='domain of a*f⁻¹(x/b) = b*dom(f⁻¹); range = a*range(f⁻¹) (standard principal branches; numeric spot checks of f⁻¹ at the end points); option set equality (SymPy)', coverage='exhaustive')
def atinvd(q):
    m = re.search(r'What is the (domain|range) of y = (\d+)? ?(sin|cos|tan|cot|sec|cosec)⁻¹ ?\(?(x(?:/(\d+))?)\)?', q['prompt'])
    kind, a, name = m.group(1), int(m.group(2) or 1), _inv_name(m.group(3))
    b = int(m.group(5) or 1)
    dom, rng = _INV[name]
    if kind == 'domain':
        want = sp.imageset(sp.Lambda(x, b * x), dom) if dom != sp.Reals else sp.Reals
    else:
        want = sp.imageset(sp.Lambda(x, a * x), rng)
    return pick('atinvd', q, lambda o: _set_from_text(o) == want, f'{kind} {want}')


@ref('aqinvbr', method='domain/range tables of the principal branches (standard NCERT branches) applied to the asked property of each option', coverage='exhaustive')
def aqinvbr(q):
    p = q['prompt']
    names = {'sin⁻¹': 'sin', 'cos⁻¹': 'cos', 'tan⁻¹': 'tan', 'cot⁻¹': 'cot', 'sec⁻¹': 'sec', 'cosec⁻¹': 'csc'}
    nm = re.search(r'(sin|cos|tan|cot|sec|cosec)⁻¹', p).group(0)
    name = names[nm]
    dom, rng = _INV[name]
    if p.startswith('Which of these is the range'):
        return pick('aqinvbr', q, lambda o: _set_from_text(o) == rng, f'range {rng}')
    if p.startswith('What is the domain'):
        return pick('aqinvbr', q, lambda o: _set_from_text(o) == dom, f'domain {dom}')
    if p.startswith('Which one of these angles is a possible principal value'):
        return pick('aqinvbr', q, lambda o: E(o) in rng, f'in range {rng}')
    if p.startswith('For which one of these numbers x'):
        return pick('aqinvbr', q, lambda o: E(o) in dom, f'in domain {dom}')
    return Unsupported('unrecognised aqinvbr statement ' + p[:60])
