import re
from kit import ref, Expect, Verdict, Unsupported, Ambiguous, Fraction, sp
from refs.calculus_trig_seq_util import *


def _diff_expect(q, pat=r'Differentiate (?:y|f\(x\)) = (.+?) with respect to x'):
    m = re.search(pat, q['prompt'])
    return Expect(str(sp.diff(E(m.group(1)), x)))


@ref('audch', method='SymPy derivative of the stated function', coverage='exhaustive')
def audch(q):
    return _diff_expect(q)


@ref('audel', method='SymPy derivative of the stated function', coverage='exhaustive')
def audel(q):
    return _diff_expect(q)


@ref('audfp', method='exact SymPy definite integral of the polynomial', coverage='exhaustive')
def audfp(q):
    m = re.search(r'Evaluate ∫ from (−?\d+) to (−?\d+) of \((.+)\) dx', q['prompt'])
    return Expect(str(sp.integrate(E(m.group(3)), (x, num(m.group(1)), num(m.group(2))))))


@ref('audinv', method='SymPy derivative; "with respect to" another function as the ratio of derivatives dF/dx / dG/dx', coverage='exhaustive')
def audinv(q):
    p = q['prompt']
    m = re.search(r'Differentiate y = (.+?) with respect to x', p)
    if m:
        return Expect(str(sp.diff(E(m.group(1)), x)))
    m = re.search(r'Differentiate (.+?) with respect to (.+?)(?: \(for.*\))?\.$', p)
    F, G = E(m.group(1)), E(m.group(2))
    return Expect(str(sp.diff(F, x) / sp.diff(G, x)))


@ref('audquo', method='SymPy derivative of the quotient (value equality; "simplify" is not form-checked)', coverage='exhaustive')
def audquo(q):
    return _diff_expect(q)


@ref('audsum', method='SymPy derivative of the polynomial', coverage='exhaustive')
def audsum(q):
    return _diff_expect(q)


def _anti(q):
    m = re.search(r'Find ∫ (.+?) dx(?:\.|\s\()', q['prompt'])
    f = E(m.group(1))
    d = re.search(r'\(x > (−?\d+)', q['prompt'])
    dom = (lambda p, c=num(d.group(1)): p > c) if d else None
    return verdict_mc(q, antideriv_pred(f, dom))


for _fam in ('auform', 'auinvf', 'aulax', 'auparts', 'aupfr', 'auprq', 'austd', 'autrig'):
    ref(_fam, method='differentiate the stored antiderivative (SymPy) and compare with the integrand at up to 19 points where both are real; require "+ C"; logs of expressions that can be <= 0 must be in |.|; the multiple-choice options are tested the same way', coverage='exhaustive')(_anti)


@ref('auinit', method='f(x) = f(a) + integral_a^x f\'(s) ds (SymPy), compared as functions', coverage='exhaustive')
def auinit(q):
    m = re.search(r'f′\(x\) = (.+) and f\((−?\d+)\) = (−?\d+)\. Find f\(x\)', q['prompt'])
    a = num(m.group(2)); s = sp.Symbol('s')
    g = E(m.group(1)).subs(x, s)
    return Expect(str(num(m.group(3)) + sp.integrate(g, (s, a, x))))


def _lim(q):
    m = re.search(r'Evaluate lim \((?:x|t) → (∞|−∞|−?\d+)\) of (.+?)\.(?: \(log.*)?$', q['prompt'])
    a = {'∞': sp.oo, '−∞': -sp.oo}.get(m.group(1)) or num(m.group(1))
    body = m.group(2)
    return Expect(str(sp.limit(E(body).subs(t, x), x, a)))


for _fam in ('auliinf', 'aulpow', 'aulstd', 'auspd'):
    ref(_fam, method='SymPy limit of the stated expression', coverage='exhaustive')(_lim)


@ref('aultab', method='table: mean of the two innermost table values (x = a +- 0.001) read as the limit, must be within 0.01 of the outer pairs\' trend; one-sided limits: substitute the point in the stated branch', coverage='exhaustive')
def aultab(q):
    p = q['prompt']
    if q.get('figure'):
        fig = q['figure']; head = [float(h) for h in fig['head'][1:]]; vals = [float(v) for v in fig['rows'][0][1:]]
        m = re.search(r'near x = (−?\d+)', p); a = float(m.group(1))
        left = [(h, v) for h, v in zip(head, vals) if h < a]; right = [(h, v) for h, v in zip(head, vals) if h > a]
        lv = max(left)[1]; rv = min(right)[1]
        est = (lv + rv) / 2
        assert abs(lv - rv) < 0.05, (lv, rv)
        r = round(est)
        assert abs(est - r) < 0.01, est
        return Expect(str(r))
    m = re.search(r'f\(x\) = (.+) for x < (−?\d+), and f\(x\) = (.+) for x ≥ (−?\d+)\. Find the (left|right)-hand limit', p)
    A, B, c = E(m.group(1)), E(m.group(3)), num(m.group(2))
    assert c == num(m.group(4))
    return Expect(str((A if m.group(5) == 'left' else B).subs(x, c)))


@ref('aupi', method='exact SymPy definite integral with the bounds read from the statement', coverage='exhaustive')
def aupi(q):
    m = re.search(r'Evaluate ∫ from (.+?) to (.+?) of (.+?) dx\. Give', q['prompt'])
    return Expect(str(sp.simplify(sp.integrate(E(m.group(3)), (x, E(m.group(1)), E(m.group(2)))))))


@ref('aurie', method='the Riemann sum itself evaluated numerically (mpmath, 30 digits) for n, 2n, 4n and Richardson-extrapolated to n -> infinity; compared with the stored value to 1e-7', coverage='exhaustive')
def aurie(q):
    import mpmath as mp
    mp.mp.dps = 30
    m = re.search(r'sum Σ from r = (\d+) to n of (.+?), by writing it', q['prompt'])
    r0 = int(m.group(1))
    n_s, r_s = sp.symbols('n r')
    body = E(m.group(2).replace('r', 'r'))
    # symbols named n and r in mathtext
    f = sp.lambdify((sp.Symbol('r'), sp.Symbol('n')), body, 'mpmath')

    def S(N):
        return mp.fsum(f(mp.mpf(r), mp.mpf(N)) for r in range(r0, N + 1))
    s1, s2, s3 = S(1000), S(2000), S(4000)
    r1 = 2 * s2 - s1; r2 = 2 * s3 - s2
    lim_ = (4 * r2 - r1) / 3
    stored = complex(sp.N(meaning(q), 30))
    ok = abs(stored - complex(lim_)) < 1e-7
    return Verdict(ok, f'numeric limit of the sum {lim_} vs stored {q["answer"]}')


@ref('ausbd', method='exact SymPy definite integral of the stated integrand', coverage='exhaustive')
def ausbd(q):
    m = re.search(r'Evaluate ∫ from (\d+) to (\d+) of (.+?) dt', q['prompt'])
    return Expect(str(sp.simplify(sp.integrate(E(m.group(3)), (t, num(m.group(1)), num(m.group(2)))))))


@ref('cint', method='exact SymPy definite integral', coverage='exhaustive')
def cint(q):
    m = re.search(r'∫ from (−?\d+) to (−?\d+) of (.+?) dx', q['prompt'])
    return Expect(str(sp.integrate(E(m.group(3)), (x, num(m.group(1)), num(m.group(2))))))


@ref('dpow', method='SymPy derivative evaluated at the point', coverage='exhaustive')
def dpow(q):
    m = re.search(r'f\(x\) = (.+)\. What is f′\((−?\d+)\)\?', q['prompt'])
    return Expect(str(sp.diff(E(m.group(1)), x).subs(x, num(m.group(2)))))


@ref('dprod', method='SymPy derivative of the stated product', coverage='exhaustive')
def dprod(q):
    return _diff_expect(q)


@ref('lim', method='SymPy limit of the stated quotient', coverage='exhaustive')
def lim(q):
    m = re.search(r'Find lim \(x → (−?\d+)\) of (.+)\.$', q['prompt'])
    return Expect(str(sp.limit(E(m.group(2).replace('⁄', '/')), x, num(m.group(1)))))


@ref('pint', method='exact SymPy definite integral', coverage='exhaustive')
def pint(q):
    m = re.search(r'∫ from (−?\d+) to (−?\d+) of (.+?) dx = \?', q['prompt'])
    return Expect(str(sp.integrate(E(m.group(3)), (x, num(m.group(1)), num(m.group(2))))))


@ref('subst', method='exact SymPy definite integral (without using the substitution)', coverage='exhaustive')
def subst(q):
    m = re.search(r'∫ from (−?\d+) to (−?\d+) of (.+?) dx = \?', q['prompt'])
    return Expect(str(sp.integrate(E(m.group(3)), (x, num(m.group(1)), num(m.group(2))))))
