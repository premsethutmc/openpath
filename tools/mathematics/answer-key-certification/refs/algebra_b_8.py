"""algebra-b module 8: theory of equations (exact / 50-digit root finding rather than Vieta)"""
import re
from kit import ref, Expect, Verdict, Unsupported, Ambiguous, Fraction, sp
from refs.algebra_b_common import *

X_ = sp.Symbol('x')
SUPS8 = {'⁷': '**7', '⁸': '**8', '⁹': '**9'}


def poly_of(s):
    for k, v in SUPS8.items(): s = s.replace(k, v)
    return sp.Poly(P(s), X_)


def exact_roots(poly):
    """-> list of (root, multiplicity) with exact (rational/radical) roots where sympy finds them; complex allowed"""
    return sp.roots(poly)


def fmt_roots(rs):
    return ','.join(str(r) for r in rs)


def num_roots(poly, digits=60):
    return [sp.N(r, digits) for r in poly.nroots(n=digits, maxsteps=500)]


def to_fraction(v, tol=1e-30):
    re_, im_ = sp.re(v), sp.im(v)
    assert abs(sp.N(im_, 50)) < tol, f'imaginary part {im_}'
    f = Fraction(str(sp.N(re_, 50))).limit_denominator(10 ** 9)
    assert abs(sp.N(re_, 50) - sp.Rational(f.numerator, f.denominator)) < tol, f'not rational: {re_}'
    return f


@ref('approg', 'all roots of the cubic (sympy exact roots); premise that they form an AP is checked', 'exhaustive')
def approg(q):
    m = re.fullmatch(r'The roots of (.*) = 0 are in (arithmetic|geometric) progression\. Solve the equation\..*', q['prompt'])
    rs = sp.roots(poly_of(m.group(1)))
    lst = sorted([r for r, mult in rs.items() for _ in range(mult)], key=lambda v: float(sp.re(v)))
    if len(lst) != 3 or any(not r.is_real for r in lst):
        return Ambiguous(f'roots {lst}')
    import itertools as it
    if m.group(2) == 'arithmetic':
        ok = any(sp.simplify((b - a) - (c - b)) == 0 for a, b, c in it.permutations(lst))
    else:
        ok = any(sp.simplify(b * b - a * c) == 0 and b != 0 for a, b, c in it.permutations(lst))
    if not ok:
        return Verdict(False, f'roots {lst} are not in {m.group(2)} progression (in any order)')
    return Expect(fmt_roots(sorted(set(lst), key=float)))


@ref('aprecip', 'complete factorisation over ℚ and exact roots (sympy); palindromic structure checked; real roots listed once each', 'exhaustive')
def aprecip(q):
    m = re.match(r'(.*) = 0 is a reciprocal equation\.', q['prompt'])
    poly = poly_of(m.group(1))
    cs = poly.all_coeffs()
    if cs != cs[::-1] and cs != [-c for c in cs[::-1]]:
        return Verdict(False, 'coefficients are not (anti)palindromic')
    rs = sp.roots(poly)
    if sum(rs.values()) != poly.degree():
        return Unsupported('roots not found in closed form')
    if any(not r.is_real for r in rs):
        return Ambiguous('equation has non-real roots: "every root" real or complex')
    return Expect(fmt_roots(sorted(rs, key=float)))


@ref('apredu', 'solveset over ℝ of the original equation (no substitution), result checked in the equation', 'exhaustive')
def apredu(q):
    m = re.match(r'Solve (.*) = 0 (?:for real x )?\(put y = .*\)\. Give every solution', q['prompt'])
    s = m.group(1).replace('√x', 'sqrt(x)')
    s = clean(s)
    s = re.sub(r'(\d+)\^x', r'\1**x', s)
    s = re.sub(r'(?<![\w)*])(\d+)sqrt', r'\1*sqrt', s)
    x = sp.Symbol('x', real=True)
    e = sp.sympify(s, locals={'x': x})
    sol = sp.solveset(e, x, sp.S.Reals)
    if not isinstance(sol, sp.FiniteSet):
        return Unsupported(f'solveset returned {sol}')
    for v in sol: assert sp.simplify(e.subs(x, v)) == 0
    return Expect(','.join(str(v) for v in sorted(sol, key=float)))


@ref('aprrt', 'all roots by sympy exact roots; the claim "all roots are rational" is checked', 'exhaustive')
def aprrt(q):
    m = re.match(r'Solve (.*) = 0\. \(All its roots are rational', q['prompt'])
    rs = sp.roots(poly_of(m.group(1)))
    if sum(rs.values()) != 3 or any(not r.is_rational for r in rs):
        return Verdict(False, f'roots {rs} are not all rational')
    return Expect(','.join(str(r) for r in sorted(rs, key=float)))


@ref('apvbox', 'actual roots to 50 digits (nroots), quantity computed from the roots themselves (not Vieta); roots must be positive reals', 'exhaustive')
def apvbox(q):
    p = q['prompt']
    m = re.search(r'are the three roots of (.*) = 0\.', p)
    poly = poly_of(m.group(1))
    rr = sp.real_roots(poly)
    if len(rr) != 3 or any(r <= 0 for r in rr):
        return Verdict(False, f'real roots {rr}: not three positive real numbers, not a box')
    l, b, h = [sp.N(r, 60) for r in rr]
    if 'surface area' in p: v = 2 * (l * b + b * h + h * l)
    elif 'edges' in p: v = 4 * (l + b + h)
    elif 'volume' in p: v = l * b * h
    elif 'diagonal' in p: v = l ** 2 + b ** 2 + h ** 2
    else: return Unsupported('apvbox question')
    return Expect(str(to_fraction(v)))


@ref('apvform', 'the new quadratic expanded from its actual (complex) zeros with sympy radicals; constant/linear coefficients simplified', 'exhaustive')
def apvform(q):
    m = re.fullmatch(r'α and β are the roots of (.*) = 0\. Find the quadratic expression x² \+ bx \+ c \(leading coefficient 1\) whose zeros are (.*) and (.*)\.', q['prompt'])
    poly = poly_of(m.group(1))
    r1, r2 = list(sp.roots(poly, multiple=True))
    def tr(t, a):
        t = t.replace('−', '-').replace('α', 'a').replace('β', 'a').replace('²', '**2')
        t = re.sub(r'(\d)a', r'\1*a', t); t = re.sub(r'-a', '-1*a', t)
        return sp.sympify(t, locals={'a': a})
    z1, z2 = tr(m.group(2), r1), tr(m.group(3), r2)
    if m.group(2) == 'α² ' or True:
        pass
    new = sp.expand(sp.simplify(sp.expand((X_ - z1) * (X_ - z2))))
    c = sp.Poly(new, X_).all_coeffs()
    assert c[0] == 1
    return Expect(str(sp.simplify(new)))


def volume_poly(p):
    m = re.search(r'square base of side x (?:cm|m) and a height of \(x ([+−]) (\d+)\) (?:cm|m)\. Its volume is (\d+)', p)
    if m:
        k = int(m.group(2)) * (1 if m.group(1) == '+' else -1)
        return X_ ** 2 * (X_ + k) - int(m.group(3)), (X_ + k)
    m = re.search(r'height x (?:cm|m), length (\d+)x (?:cm|m) and width \(x ([+−]) (\d+)\) (?:cm|m)\. Its volume is (\d+)', p)
    if m:
        k = int(m.group(3)) * (1 if m.group(2) == '+' else -1)
        return X_ * (int(m.group(1)) * X_) * (X_ + k) - int(m.group(4)), (X_ + k)
    raise ValueError('volume form')


@ref('apvolg', 'volume equation built from the described cuboid; positive real roots with every side positive', 'exhaustive')
def apvolg(q):
    eq, side = volume_poly(q['prompt'])
    pol = sp.Poly(sp.expand(eq), X_)
    good = [r for r in sp.real_roots(pol) if r > 0 and side.subs(X_, r) > 0]
    if len(good) != 1:
        return Ambiguous(f'{len(good)} admissible roots: {good}')
    return Expect(str(good[0]))


@ref('apvolx', 'real roots of the printed cubic; exactly one positive root which must be whole', 'exhaustive')
def apvolx(q):
    m = re.fullmatch(r'The equation (.*) = 0 has exactly one positive root, and it is a whole number\. Find it\.', q['prompt'])
    pol = poly_of(m.group(1))
    pos = [r for r in sp.real_roots(pol) if r > 0]
    if len(set(pos)) != 1 or not pos[0].is_integer:
        return Verdict(False, f'positive roots {pos}: premise (exactly one, whole) fails')
    return Expect(str(pos[0]))


@ref('apvsum', 'quantity evaluated at the actual roots (60-digit nroots, complex allowed), rational reconstruction verified to 1e-30; Vieta not used', 'exhaustive')
def apvsum(q):
    m = re.fullmatch(r'α, β and γ are the roots of (.*) = 0\. Find (.*)\. \(A fraction is fine\.\)', q['prompt'])
    poly = poly_of(m.group(1))
    a, b, c = poly.nroots(n=60, maxsteps=500)
    expr = m.group(2)
    if expr == '(α + 1)(β + 1)(γ + 1)': v = (a + 1) * (b + 1) * (c + 1)
    elif expr == '1/α + 1/β + 1/γ':
        if min(abs(a), abs(b), abs(c)) < 1e-20: return Verdict(False, 'a root is 0: 1/α undefined')
        v = 1 / a + 1 / b + 1 / c
    elif expr == 'α² + β² + γ²': v = a ** 2 + b ** 2 + c ** 2
    else: return Unsupported('expression ' + expr)
    return Expect(str(to_fraction(sp.N(v, 55))))
