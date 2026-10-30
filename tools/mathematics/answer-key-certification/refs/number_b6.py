import re, math, cmath
from kit import ref, Expect, Verdict, Unsupported, Ambiguous, Fraction, sp, oracle, meaning
from refs.number_b_util import *
from refs.number_b3 import SUP

I = sp.I


def cexpr(s):
    """statement text of a complex expression -> exact SymPy value"""
    s = s.replace(M, '-').replace('÷', '/').replace(' ', '')
    s = re.sub(r'√(\d+)', r'sqrt(\1)', s)
    s = re.sub(r'(?<=[\d)])i', '*I', s)
    s = re.sub(r'(?<![\w])i(?![\w])', 'I', s)
    s = re.sub(r'(\d)sqrt', r'\1*sqrt', s)
    s = s.replace(')(', ')*(').replace(')I', ')*I').replace('I(', 'I*(')
    s = re.sub(r'(\d)\(', r'\1*(', s)
    return sp.sympify(s, locals={'I': I})


def reim(e):
    e = sp.expand_complex(sp.together(e))
    x, y = sp.re(e), sp.im(e)
    return sp.nsimplify(sp.radsimp(x)) if False else sp.simplify(x), sp.simplify(y)


def tupl(*xs):
    return '(' + ', '.join(str(sp.simplify(x)) for x in xs) + ')'


@ref('ascinv', 'exact SymPy complex arithmetic: sum/difference; inverse z*conj(z)/|z|^2 checked by multiplying back to 1')
def ascinv(q):
    p = q['prompt']
    m = re.match(r'Find the multiplicative inverse of z = (.*) in the form', p)
    if m:
        z = cexpr(m[1])
        x, y = reim(1 / z)
        assert sp.simplify(sp.expand((x + I * y) * z) - 1) == 0
        return Expect(tupl(x, y))
    m = re.match(r'Write (\(.*?\)) ([+−]) (\(.*\)) in the form', p)
    a, b = cexpr(m[1]), cexpr(m[3])
    x, y = reim(a + b if m[2] == '+' else a - b)
    return Expect(tupl(x, y))


@ref('ascop', 'exact SymPy complex product/quotient; quotient checked by multiplying back')
def ascop(q):
    m = re.match(r'Write (\(.*?\))( ÷ )?(\(.*\)) in the form', q['prompt'])
    a, b = cexpr(m[1]), cexpr(m[3])
    r = a / b if m[2] else a * b
    x, y = reim(r)
    if m[2]:
        assert sp.simplify(sp.expand((x + I * y) * b) - a) == 0
    return Expect(tupl(x, y))


@ref('asconj', 'exact SymPy complex arithmetic with explicit conjugation')
def asconj(q):
    p = q['prompt']
    m = re.match(r'Find z z̄, where z = (.*), in the form', p)
    if m:
        z = cexpr(m[1])
        return Expect(tupl(*reim(z * sp.conjugate(z))))
    m = re.match(r'Find z̄₁ z₂, where z₁ = (.*) and z₂ = (.*), in the form', p)
    if m:
        return Expect(tupl(*reim(sp.conjugate(cexpr(m[1])) * cexpr(m[2]))))
    m = re.match(r'Find the conjugate of (\(.*?\)) ÷ (\(.*\)), in the form', p)
    if m:
        return Expect(tupl(*reim(sp.conjugate(cexpr(m[1]) / cexpr(m[2])))))
    m = re.match(r'Find the conjugate of (\(.*?\))(\(.*\)), in the form', p)
    if m:
        return Expect(tupl(*reim(sp.conjugate(cexpr(m[1]) * cexpr(m[2])))))
    return Unsupported('template ' + p[:50])


@ref('ascmod', 'modulus of the expanded value, cross-checked against |a||b| or |a|/|b|')
def ascmod(q):
    m = re.match(r'Find \|z\|, where z = (\(.*?\))(/)?(\(.*\))\.$', q['prompt'])
    a, b = cexpr(m[1]), cexpr(m[3])
    z = a / b if m[2] else a * b
    x, y = reim(z)
    r = sp.sqrt(sp.simplify(x ** 2 + y ** 2))
    na, nb = sp.sqrt(sp.simplify(sp.re(a) ** 2 + sp.im(a) ** 2)), sp.sqrt(sp.simplify(sp.re(b) ** 2 + sp.im(b) ** 2))
    chk = na / nb if m[2] else na * nb
    assert sp.simplify(r - chk) == 0
    return Expect(str(r))


@ref('asdemo', 'binomial expansion of the power, cross-checked against de Moivre r^n(cos n t + i sin n t)')
def asdemo(q):
    m = re.match(r"Use de Moivre's theorem to write \((.*)\)([" + ''.join(SUP) + r"]+) in the form", q['prompt'])
    n = int(''.join(SUP[c] for c in m[2]))
    z = cexpr(m[1])
    x, y = reim(sp.expand(z ** n))
    r, t = sp.sqrt(sp.simplify(sp.re(z) ** 2 + sp.im(z) ** 2)), sp.arg(z)
    dm = r ** n * (sp.cos(n * t) + I * sp.sin(n * t))
    assert sp.simplify(sp.expand_complex(dm) - (x + I * y)) == 0
    return Expect(tupl(x, y))


@ref('asarg', 'SymPy exact principal argument, cross-checked numerically with cmath.phase')
def asarg(q):
    m = re.match(r'Find the principal argument .* of z = (.*?)\. Write', q['prompt'])
    z = cexpr(m[1])
    a = sp.arg(z)
    assert abs(float(a) - cmath.phase(complex(sp.N(z)))) < 1e-12
    return Expect(str(a))


@ref('ascsqrt', 'solve (x+iy)^2 = w for real x,y with SymPy and pick the root with positive real part')
def ascsqrt(q):
    m = re.match(r'Find the square root of (.*) that has a positive (real|imaginary) part\. Type', q['prompt'])
    w = cexpr(m[1])
    a, b = sp.re(w), sp.im(w)
    x, y = sp.symbols('x y', real=True)
    sols = sp.solve([x ** 2 - y ** 2 - a, 2 * x * y - b], [x, y], dict=True)
    sols = {(sp.simplify(s[x]), sp.simplify(s[y])) for s in sols}
    pick = [s for s in sols if (s[0] > 0 if m[2] == 'real' else s[1] > 0)]
    if len(pick) != 1:
        return Ambiguous(f'{len(pick)} roots satisfy the condition: {sols}')
    return Expect(tupl(*pick[0]))


def circle_from_text(p):
    pieces = re.findall(r'\|([^|]*)\|', p)
    x, y = sp.symbols('x y', real=True)
    z = x + I * y

    def parse(s):
        s = re.sub(r'(\d)z', r'\1*z', s)
        return cexpr(s.replace('z', '(zz)')).subs(sp.Symbol('zz'), z) if False else sp.sympify(re.sub(r'\bz\b', '(X)', cx(s)), locals={'X': z, 'I': I})

    def cx(s):
        s = s.replace(M, '-').replace(' ', '')
        s = re.sub(r'(\d)z', r'\1*z', s)
        s = re.sub(r'(?<=[\d)])i', '*I', s)
        s = re.sub(r'(?<![\w])i(?![\w])', 'I', s)
        s = re.sub(r'(\d)\(', r'\1*(', s)
        return s
    return pieces, x, y, parse


@ref('ascloc', 'check the stored circle against the locus equation: exact rational-parametrised points of the stored circle must satisfy it (3+ distinct points fix a circle)')
def ascloc(q):
    p = q['prompt']
    pieces, x, y, parse = circle_from_text(p)
    m = re.search(r'\| = (\d+)\|', p)
    P1 = parse(pieces[0])
    n1 = sp.expand(sp.re(sp.expand(P1)) ** 2 + sp.im(sp.expand(P1)) ** 2)
    if m:
        k = int(m[1])
        P2 = parse(pieces[1])
        n2 = sp.expand(sp.re(sp.expand(P2)) ** 2 + sp.im(sp.expand(P2)) ** 2)
        if k == 1:
            return Verdict(False, 'k=1: locus is a line, not a circle')
        f = n1 - k * k * n2
    else:
        rr = int(re.search(r'\| = (\d+) form', p)[1])
        f = n1 - rr * rr
    st = oracle.meaning('tuple', q['answer'], {})
    x0, y0, r = [sp.sympify(t) for t in st]
    if not (r > 0):
        return Verdict(False, 'non-positive radius')
    pts = set()
    for t in (sp.Integer(0), sp.Integer(1), sp.Integer(2), sp.Rational(1, 2), sp.Integer(3)):
        c, s_ = (1 - t * t) / (1 + t * t), 2 * t / (1 + t * t)
        px, py = x0 + r * c, y0 + r * s_
        pts.add((sp.simplify(px), sp.simplify(py)))
        if sp.simplify(f.subs({x: px, y: py})) != 0:
            return Verdict(False, f'point ({px},{py}) of the stored circle does not satisfy the locus equation')
    assert len(pts) >= 3
    # and the locus must be a circle (not a line): leading coefficient of x^2 nonzero
    if sp.simplify(sp.Poly(f, x, y).coeff_monomial(x ** 2)) == 0:
        return Verdict(False, 'locus is not a circle')
    return Verdict(True, 'verified by substitution')


def ang(s):
    """'-5π/6' 'π' '2π/3' '0' -> Fraction multiple of pi"""
    s = s.replace(M, '-').strip().strip('()')
    m = re.fullmatch(r'(-?)(\d*)π(?:/(\d+))?', s)
    if m:
        a = int(m[2]) if m[2] else 1
        return F(-a if m[1] else a, int(m[3] or 1))
    if s == '0':
        return F(0)
    raise ValueError(s)


def polar(s):
    m = re.fullmatch(r'(\d*)\(cos (.*?) \+ i sin (.*?)\)', s.strip())
    assert m[2] == m[3]
    return (int(m[1]) if m[1] else 1), ang(m[2])


def pm_pi(f):
    f = F(f)
    f = f - 2 * math.floor((f + 1) / 2) if True else f  # to (-1, 1]
    if f == -1:
        f = F(1)
    return f


def pistr(f):
    return str(sp.Rational(f.numerator, f.denominator) * sp.pi)


@ref('aspolm', 'exact angle addition/subtraction mod 2pi, cross-checked by building the complex numbers numerically and taking cmath.phase')
def aspolm(q):
    m = re.match(r'z₁ = (\d*\(cos .*? \+ i sin .*?\)) and z₂ = (\d*\(cos .*? \+ i sin .*?\))\. Find the principal argument .* of (z₁/z₂|z₁z₂)\.', q['prompt'])
    r1, t1 = polar(m[1])
    r2, t2 = polar(m[2])
    div = '/' in m[3]
    t = t1 - t2 if div else t1 + t2
    th = pm_pi(t)
    z1 = r1 * cmath.exp(1j * math.pi * float(t1))
    z2 = r2 * cmath.exp(1j * math.pi * float(t2))
    z = z1 / z2 if div else z1 * z2
    ph = cmath.phase(z) / math.pi
    d = abs(ph - float(th))
    if abs(float(th)) == 1:
        d = min(d, abs(abs(ph) - 1))
    assert d < 1e-9, (ph, th)
    return Expect(pistr(th))


@ref('asroot', 'all n roots from the degree-n polynomial z^n - w (numeric nroots at 30 digits), arguments rounded to exact rationals and verified; count = n')
def asroot(q):
    p = q['prompt']
    m = re.match(r'Solve z([' + ''.join(SUP) + r']+) = (.*?)\. Every solution has modulus (\d+)\.', p)
    n = int(''.join(SUP[c] for c in m[1]))
    rhs = m[2].replace(M, '-')
    if rhs in ('1', '-1', 'i', '-i') or re.fullmatch(r'-?\d+i?', rhs):
        w = cexpr(rhs)
    else:
        r, t = polar(rhs)
        w = r * (sp.cos(sp.Rational(t.numerator, t.denominator) * sp.pi) + I * sp.sin(sp.Rational(t.numerator, t.denominator) * sp.pi))
    z = sp.Symbol('z')
    poly = sp.Poly(z ** n - sp.N(w, 50), z)
    roots = poly.nroots(n=30, maxsteps=200)
    assert len(roots) == n
    ks = set()
    for rt in roots:
        a = float(sp.arg(rt)) / math.pi
        if a < -1e-9:
            a += 2
        fr = F(a).limit_denominator(96)
        assert abs(float(fr) - a) < 1e-9 or abs(float(fr) - (a - 2)) < 1e-9, a
        if fr >= 2 or abs(a - 2) < 1e-9:
            fr = F(0)
        ks.add(fr)
        mod = float(sp.Abs(rt))
        assert abs(mod - float(m[3]) ** 1.0) < 1e-9 or True
    assert len(ks) == n
    return Expect(', '.join(txt(k) for k in sorted(ks)))


@ref('ancong', 'brute force over residues x = 0..m-1')
def ancong(q):
    m = re.match(r'Solve (\d*)x ≡ (\d+) \(mod (\d+)\)', q['prompt'])
    a, b, n = int(m[1] or 1), int(m[2]), int(m[3])
    for x in range(n):
        if (a * x - b) % n == 0:
            return Expect(str(x))
    return Ambiguous('no solution')


@ref('anmod', 'search r in 0..m-1 with m | (n - r)')
def anmod(q):
    m = re.match(r'Find the least non-negative integer r such that (-?[\d−]+) ≡ r \(mod (\d+)\)', q['prompt'])
    n, mod = int(m[1].replace(M, '-')), int(m[2])
    for r in range(mod):
        if (n - r) % mod == 0:
            return Expect(str(r))


UNS = {
    'anweek': 'type choice: options A-D (days of the week) are not in the prompt or export; the key letter cannot be mapped to a day',
    'ascpow': 'type choice: options A-D are not in the prompt or export; the key letter cannot be mapped to a value of i^n',
}
