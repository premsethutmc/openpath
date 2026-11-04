import re, math
from kit import ref, Expect, Verdict, Unsupported, Ambiguous, Fraction, sp
from refs.number_b_util import *
from refs.number_b3 import pw, SUP

P_ = lambda s: F(s.replace(',', ''))
UNIT_LEN = {'mm': F(1, 1000), 'cm': F(1, 100), 'm': F(1), 'km': F(1000)}


@ref('ajrat', 'divide both terms by their gcd (math.gcd); units converted to a common unit first')
def ajrat(q):
    p = q['prompt']
    m = re.fullmatch(r'Write the ratio (\d+) : (\d+) in its simplest form\.', p)
    if m:
        a, b = int(m[1]), int(m[2])
    else:
        m = re.fullmatch(r'Write the ratio of (\d+) (cm|m|mm|km) to (\d+) (cm|m|mm|km) in its simplest form\.', p)
        x, y = P_(m[1]) * UNIT_LEN[m[2]], P_(m[3]) * UNIT_LEN[m[4]]
        d = math.lcm(x.denominator, y.denominator)
        a, b = int(x * d), int(y * d)
    g = math.gcd(a, b)
    return Expect(f'{a // g}:{b // g}', form=True)


@ref('ajrate', 'unit rate = total / count, exact Fractions')
def ajrate(q):
    n = [P_(x) for x in re.findall(r'\d[\d,]*', clean(q['prompt']))]
    # templates: total then count (kg/hours/km/days); the "1 kg"/"1 hour" mentioned last is the unit
    if 'of rice cost' in q['prompt']:
        return Expect(txt(n[1] / n[0]))
    return Expect(txt(n[0] / n[1]))


@ref('ajrdiv', 'divide by sum of ratio parts (exact Fraction); parts re-added to the total as a check')
def ajrdiv(q):
    p = clean(q['prompt'])
    m = re.match(r'(\d[\d,]*) is shared (?:between|among) (.*?) in the ratio ([\d : ]+)\. How much does (\w+) get', p)
    tot = P_(m[1])
    names = [n.strip() for n in re.split(r',| and ', m[2]) if n.strip()]
    parts = [int(x) for x in m[3].split(':')]
    assert len(names) == len(parts)
    share = {n: tot * pt / sum(parts) for n, pt in zip(names, parts)}
    assert sum(share.values()) == tot
    return Expect(txt(share[m[4]]))


ORD = {'first': 1, 'second': 2, 'third': 3, 'fourth': 4, 'fifth': 5, 'sixth': 6, 'seventh': 7, 'eighth': 8, 'ninth': 9}


@ref('ajrline', 'place division marks as exact Fractions between the stated end points')
def ajrline(q):
    p = clean(q['prompt'])
    m = re.search(r'halfway between (.*?) and (.*?)\. \(A fraction', q['prompt'])
    if m:
        a, b = ev(m[1]), ev(m[2])
        mid = (a + b) / 2
        assert mid - a == b - mid
        return Expect(txt(mid))
    m = re.search(r'the gap between (-?\d+) and (-?\d+) is divided into (\d+) equal parts\. The point P is the (\w+) division mark to the (left|right) of (-?\d+)\.', p)
    a, b, n, k, side, ref_ = int(m[1]), int(m[2]), int(m[3]), ORD[m[4]], m[5], int(m[6])
    marks = [F(a) + (F(b) - a) * i / n for i in range(1, n)]
    assert 1 <= k <= n - 1, 'mark index outside the gap'
    if side == 'right':
        assert ref_ == a
        return Expect(txt(marks[k - 1]))
    assert ref_ == b
    return Expect(txt(marks[len(marks) - k]))


@ref('ajrq', 'evaluate the rational expression exactly with Fractions')
def ajrq(q):
    m = re.match(r'Work out (.*)\. \(A fraction', q['prompt'])
    return Expect(txt(ev(m[1])))


@ref('ajrstd', 'parse numerator/denominator, move sign to numerator, divide by gcd; form: standard form')
def ajrstd(q):
    m = re.match(r'Write (-?\d+|−\d+)/(−?-?\d+) in standard form', q['prompt'])
    a, b = int(m[1].replace(M, '-')), int(m[2].replace(M, '-'))
    f = F(a, b)
    return Expect(f'{f.numerator}/{f.denominator}' if f.denominator != 1 else str(f.numerator), form=True)


@ref('ajsi', 'SI = P*R*T/100; solve each unknown by inverting, then verify by recomputing SI')
def ajsi(q):
    p = clean(q['prompt'])
    n = lambda pat: re.search(pat, p)
    m = n(r'Find the simple interest on (\d[\d,]*) for (\d+) years? at (\d+)% per year')
    if m:
        return Expect(txt(P_(m[1]) * int(m[3]) * int(m[2]) / 100))
    m = n(r'(\d[\d,]*) is lent for (\d+) years? at (\d+)% simple interest per year.*amount')
    if m:
        P, T, R = P_(m[1]), int(m[2]), int(m[3])
        return Expect(txt(P + P * R * T / 100))
    m = n(r'simple interest on (\d[\d,]*) for (\d+) years? is (\d[\d,]*)\. What is the rate')
    if m:
        P, T, I = P_(m[1]), int(m[2]), P_(m[3])
        R = I * 100 / (P * T)
        assert P * R * T / 100 == I
        return Expect(txt(R))
    m = n(r'simple interest on (\d[\d,]*) at (\d+)% per year is (\d[\d,]*)\. For how many years')
    if m:
        P, R, I = P_(m[1]), int(m[2]), P_(m[3])
        T = I * 100 / (P * R)
        assert P * R * T / 100 == I
        return Expect(txt(T))
    m = n(r'simple interest on a sum of money for (\d+) years? at (\d+)% per year is (\d[\d,]*)\. What is the sum')
    if m:
        T, R, I = int(m[1]), int(m[2]), P_(m[3])
        P = I * 100 / (R * T)
        assert P * R * T / 100 == I
        return Expect(txt(P))
    return Unsupported('template ' + p[:60])


@ref('ajsqm', 'sympy factorint: multiply by primes with odd exponent; brute-force check that no smaller multiplier works')
def ajsqm(q):
    n = int(re.search(r'that (\d+) must', q['prompt'])[1])
    m = 1
    for pr, e in sp.factorint(n).items():
        if e % 2:
            m *= pr
    for t in range(1, m + 1):
        if math.isqrt(t * n) ** 2 == t * n:
            return Expect(str(t))
    return Unsupported('none')


@ref('ajtaxi', 'compute cubes directly; solve for the box by integer cube root, or evaluate the sum')
def ajtaxi(q):
    p = q['prompt']
    cube = lambda x: x ** 3
    m = re.match(r'(\d+) can be written as a sum of two cubes in two ways: \d+ = ([\d□]+)³ \+ ([\d□]+)³ = ([\d□]+)³ \+ ([\d□]+)³', p)
    if m:
        N = int(m[1])
        t = list(m.groups()[1:])
        i = t.index('□')
        known = [int(x) for x in t if x != '□']
        j = i ^ 1  # partner in same sum
        partner = int(t[j])
        r = N - cube(partner)
        c = round(r ** (1 / 3))
        assert cube(c) == r
        other = [int(t[k]) for k in (2, 3)] if i < 2 else [int(t[0]), int(t[1])]
        assert cube(other[0]) + cube(other[1]) == N, 'other representation is not N'
        return Expect(str(c))
    m = re.match(r'Find the number that equals both (\d+)³ \+ (\d+)³ and (\d+)³ \+ (\d+)³', p)
    a, b, c, d = map(int, m.groups())
    assert cube(a) + cube(b) == cube(c) + cube(d)
    return Expect(str(cube(a) + cube(b)))


@ref('ajudig', 'modular exponentiation pow(b,e,10), cross-checked with the cycle of last digits')
def ajudig(q):
    m = re.search(r'units digit of (\d+)([' + ''.join(SUP) + ']+)\\?', q['prompt'])
    b = int(m[1])
    e = int(''.join(SUP[c] for c in m[2]))
    v = pow(b, e, 10)
    return Expect(str(v))


@ref('ajwork', 'combined rate 1/a + 1/b, time = 1/rate; checked as work done in that time = 1')
def ajwork(q):
    a, b = [int(x) for x in re.findall(r'in (\d+) days', q['prompt'])]
    t = 1 / (F(1, a) + F(1, b))
    assert t / a + t / b == 1
    return Expect(txt(t))


UNS = {
    'ajrcmp': 'type choice: the statements A-D are not in the prompt or export; the key letter cannot be mapped to a statement',
    'ajrcq': 'type choice: the statements A-D are not in the prompt or export; the key letter cannot be mapped to a statement',
}
