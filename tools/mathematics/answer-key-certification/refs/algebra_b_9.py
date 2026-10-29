"""algebra-b module 9: sequences, determinants, quadratics, word problems (au* families) and simple foundation families"""
import itertools
import math
import re
from kit import ref, Expect, Verdict, Unsupported, Ambiguous, Fraction, sp
from refs.algebra_b_common import *

X_ = sp.Symbol('x'); K_ = sp.Symbol('k'); L_ = sp.Symbol('λ')


def seq_terms(s):
    return [num(t) for t in re.findall(r'−?\d+(?:/\d+)?', s)]


@ref('apn', 'the progression generated term by term by repeated addition', 'exhaustive')
def apn(q):
    m = re.fullmatch(r'An arithmetic progression starts (.*?), … What is term number (\d+)\?', q['prompt'])
    t = ints(m.group(1)); n = int(m.group(2))
    d = t[1] - t[0]
    assert all(b - a == d for a, b in zip(t, t[1:]))
    cur = t[0]
    for _ in range(n - 1): cur += d
    return Expect(str(cur))


@ref('auaps', 'sum of the terms generated one by one', 'exhaustive')
def auaps(q):
    m = re.fullmatch(r'Find the sum of the first (\d+) terms of the AP (.*?), …\.', q['prompt'])
    n = int(m.group(1)); t = ints(m.group(2)); d = t[1] - t[0]
    assert all(b - a == d for a, b in zip(t, t[1:]))
    return Expect(str(sum(t[0] + i * d for i in range(n))))


@ref('auapc', 'sympy solve of 2·(middle) = first + third for k; the three terms then checked to be in AP at that k', 'exhaustive')
def auapc(q):
    m = re.fullmatch(r'For which value of k are (.*?), (.*?) and (.*?) \(in this order\) consecutive terms of an AP\?', q['prompt'])
    a, b, c = [P(m.group(i)) for i in (1, 2, 3)]
    sol = sp.solve(sp.Eq(b - a, c - b), K_)
    if len(sol) != 1:
        return Ambiguous(f'solutions {sol}')
    assert sp.simplify((b - a).subs(K_, sol[0]) - (c - b).subs(K_, sol[0])) == 0
    return Expect(str(sol[0]))


@ref('auapk', 'the AP listed term by term; term position / count / term from the end read off the explicit list', 'exhaustive')
def auapk(q):
    p = q['prompt']
    m = re.fullmatch(r'Which term of the AP (.*?), … is (−?\d+)\?', p)
    if m:
        t = ints(m.group(1)); d = t[1] - t[0]; target = int(m.group(2).replace('−', '-'))
        cur, n = t[0], 1
        while (d > 0 and cur < target) or (d < 0 and cur > target):
            cur += d; n += 1
        return Expect(str(n)) if cur == target else Verdict(False, 'target is not a term')
    m = re.fullmatch(r'How many terms does the AP (.*?), …, (−?\d+) have\?', p)
    if m:
        t = ints(m.group(1)); d = t[1] - t[0]; last = int(m.group(2).replace('−', '-'))
        lst = [t[0]]
        while (d > 0 and lst[-1] < last) or (d < 0 and lst[-1] > last): lst.append(lst[-1] + d)
        return Expect(str(len(lst))) if lst[-1] == last else Verdict(False, 'last term not reached')
    m = re.fullmatch(r'The AP (.*?), …, (−?\d+) ends at (−?\d+)\. Find its (\d+)th term from the end\.', p)
    if m:
        t = ints(m.group(1)); d = t[1] - t[0]; last = int(m.group(2).replace('−', '-'))
        lst = [t[0]]
        while (d > 0 and lst[-1] < last) or (d < 0 and lst[-1] > last): lst.append(lst[-1] + d)
        if lst[-1] != last: return Verdict(False, 'last term not reached')
        return Expect(str(lst[-int(m.group(4))]))
    return Unsupported('auapk template: ' + p[:60])


@ref('auapln', 'points (n, a_n) built from the line / the printed terms; first term and slope read from the explicit points', 'exhaustive')
def auapln(q):
    p = q['prompt'].replace('−', '-')
    m = re.fullmatch(r'The terms of an AP are plotted as points \(n, aₙ\) for n = (\d+), (\d+), (\d+), …, and they lie on the line y = (-?\d*)x ([+-]) (\d+)\. Find the first term a and the common difference d of the AP, as \(a, d\)\.', p)
    if m:
        n0 = int(m.group(1)); mm = {'': 1, '-': -1}.get(m.group(4), None) if m.group(4) in ('', '-') else int(m.group(4))
        c = int(m.group(6)) * (1 if m.group(5) == '+' else -1)
        pts = [(n, mm * n + c) for n in range(n0, n0 + 5)]
        return Expect(f'({pts[0][1]}, {pts[1][1] - pts[0][1]})')
    m = re.fullmatch(r'The terms of the AP (.*?), … are plotted as points \(n, aₙ\) for n = (.*?), as in the picture\. They lie on a straight line y = mx \+ c\. Find m and c, as \(m, c\)\.', p)
    if m:
        t = ints(m.group(1)); ns = ints(m.group(2))
        pts = list(zip(ns, t))
        fig = q.get('figure')
        if fig and [tuple(v) for v in fig['points']] != pts:
            return Verdict(False, 'figure points differ from the printed terms')
        (n1, a1), (n2, a2) = pts[0], pts[1]
        mm = Fraction(a2 - a1, n2 - n1); c = a1 - mm * n1
        assert all(a == mm * n + c for n, a in pts)
        return Expect(f'({mm}, {c})')
    return Unsupported('auapln template')


@ref('auaprec', 'sequence iterated from the recurrence / general term evaluated for n = 1..4', 'exhaustive')
def auaprec(q):
    p = q['prompt'].replace('−', '-')
    m = re.fullmatch(r'A sequence is given by a₁ = (-?\d+) and aₙ = (-?\d*)aₙ₋₁ ([+-]) (\d+) for n ≥ 2\. Write its first four terms as \(a₁, a₂, a₃, a₄\)\.', p)
    if m:
        a = int(m.group(1)); r = {'': 1, '-': -1}.get(m.group(2), None) if m.group(2) in ('', '-') else int(m.group(2))
        c = int(m.group(4)) * (1 if m.group(3) == '+' else -1)
        t = [a]
        for _ in range(3): t.append(r * t[-1] + c)
        return Expect('(' + ', '.join(map(str, t)) + ')')
    m = re.fullmatch(r'A sequence is given by aₙ = (.*)\. Write its first four terms as \(a₁, a₂, a₃, a₄\)\.', p)
    if m:
        n = sp.Symbol('n')
        f = P(m.group(1), n=n)
        return Expect('(' + ', '.join(str(f.subs(n, i)) for i in range(1, 5)) + ')')
    return Unsupported('auaprec template')


@ref('aubin', 'sympy expand / product of the printed factors', 'exhaustive')
def aubin(q):
    p = q['prompt']
    y = sp.Symbol('y')
    m = re.match(r'Expand (.*?) and simplify\.', p)
    if m:
        return Expect(str(sp.expand(P(m.group(1)))))
    m = re.match(r'Multiply (.*?) by (.*?)\.', p)
    if m:
        return Expect(str(sp.expand(P(m.group(1)) * P(m.group(2)))))
    return Unsupported('aubin template ' + p[:50])


@ref('audk', 'triangle area by the shoelace determinant solved for k with sympy (both signs), cross-checked with Heron on the solutions', 'exhaustive')
def audk(q):
    m = re.fullmatch(r'The area of the triangle with vertices \((.*?), (.*?)\), \((.*?), (.*?)\) and \(k, (.*?)\) is (\d+) square units?\. Using determinants, find the possible values of k \(fractions are fine\)\.', q['prompt'])
    x1, y1, x2, y2, y3 = [int(m.group(i).replace('−', '-')) for i in (1, 2, 3, 4, 5)]; A = int(m.group(6))
    D = sp.Matrix([[x1, y1, 1], [x2, y2, 1], [K_, y3, 1]]).det()
    sols = sorted(set(sp.solve(sp.Eq(D ** 2, (2 * A) ** 2), K_)), key=float)
    for s in sols:
        pts = [(x1, y1), (x2, y2), (s, y3)]
        d = lambda a, b: sp.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2)
        a_, b_, c_ = d(pts[0], pts[1]), d(pts[1], pts[2]), d(pts[2], pts[0])
        sp_ = (a_ + b_ + c_) / 2
        heron = sp.sqrt(sp.simplify(sp_ * (sp_ - a_) * (sp_ - b_) * (sp_ - c_)))
        assert abs(float(heron) - A) < 1e-6
    if not sols:
        return Verdict(False, 'no value of k')
    return Expect(','.join(str(s) for s in sols))


@ref('audsg', 'determinant of the matrix / coefficient matrix of the homogeneous system as a polynomial in the unknown, solved with sympy', 'exhaustive')
def audsg(q):
    p = q['prompt']
    m = re.fullmatch(r'For which value of k is the matrix (\[\[.*?\]\]) singular\?', p)
    if m:
        rows = [[P(e) for e in r.split(', ')] for r in re.findall(r'\[([^\[\]]+)\]', m.group(1))]
        d = sp.Matrix(rows).det()
        sol = sp.solve(d, K_)
        if len(sol) != 1: return Ambiguous(f'{len(sol)} values {sol}; det={d}')
        return Expect(str(sol[0]))
    m = re.fullmatch(r'For which value of λ does the system (.*) have a solution other than x = y = z = 0\?', p)
    if m:
        eqs = m.group(1).split(', ')
        rows = []
        x, y, z = sp.symbols('x y z')
        for e in eqs:
            l, r = e.split(' = ')
            assert r.strip() == '0'
            ex = sp.expand(P(l.replace('λ', 'L'), L=L_))
            rows.append([ex.coeff(v) for v in (x, y, z)])
        d = sp.Matrix(rows).det()
        sol = sp.solve(d, L_)
        if len(sol) != 1: return Ambiguous(f'{len(sol)} values {sol}')
        return Expect(str(sol[0]))
    return Unsupported('audsg template')


@ref('audt3', 'determinant by sympy (and for |AB| the explicit product matrix determinant)', 'exhaustive')
def audt3(q):
    p = q['prompt']
    mats = re.findall(r'\[\[.*?\]\]', p)
    Ms = [sp.Matrix([[int(e.replace('−', '-')) for e in r.split(', ')] for r in re.findall(r'\[([^\[\]]+)\]', mm)]) for mm in mats]
    if p.startswith('Evaluate'):
        return Expect(str(Ms[0].det()))
    return Expect(str((Ms[0] * Ms[1]).det()))


@ref('auinv', 'sympy Matrix.inv() with check A·A⁻¹=I', 'exhaustive')
def auinv(q):
    m = re.match(r'A = (\[\[.*?\]\])\. Find A⁻¹', q['prompt'])
    A = sp.Matrix([[int(e.replace('−', '-')) for e in r.split(', ')] for r in re.findall(r'\[([^\[\]]+)\]', m.group(1))])
    if A.det() == 0: return Verdict(False, 'singular')
    I = A.inv(); assert A * I == sp.eye(3)
    return Expect('[' + ', '.join('[' + ', '.join(str(v) for v in I.row(i)) + ']' for i in range(3)) + ']')


@ref('auqcs', 'coefficient matching of (x+h)²+k with x²+bx+c solved by sympy; verified at 5 points', 'exhaustive')
def auqcs(q):
    m = re.fullmatch(r'Write (.*?) in the form \(x \+ h\)² \+ k by completing the square\..*', q['prompt'])
    f = P(m.group(1)); h, k = sp.symbols('h k')
    eqs = sp.Poly(sp.expand((X_ + h) ** 2 + k - f), X_).all_coeffs()
    sol = sp.solve(eqs, [h, k], dict=True)[0]
    for v in range(-3, 3): assert (f - ((v + sol[h]) ** 2 + sol[k])).subs(X_, v) == 0 if False else sp.simplify(f.subs(X_, v) - ((v + sol[h]) ** 2 + sol[k])) == 0
    return Expect(f'({sol[h]}, {sol[k]})')


@ref('auqf', 'roots of the quadratic from sympy solve, substituted back; discriminant not a perfect square (irrational roots, as stated)', 'exhaustive')
def auqf(q):
    m = re.fullmatch(r'Solve (.*) = 0 using the quadratic formula\. Give both roots in simplest surd form\.', q['prompt'])
    f = P(m.group(1)); rs = sp.solve(f, X_)
    for r in rs: assert sp.simplify(f.subs(X_, r)) == 0
    D = sp.discriminant(f, X_)
    if len(rs) != 2 or sp.sqrt(D).is_rational:
        return Verdict(False, f'roots {rs} are not two irrational roots (disc {D})')
    return Expect(', '.join(str(r) for r in rs))


@ref('auqsplit', 'sympy exact roots; both distinct and rational as stated', 'exhaustive')
def auqsplit(q):
    m = re.fullmatch(r'Solve (.*) = 0 by splitting the middle term\. Give both roots \(fractions are fine\)\.', q['prompt'])
    f = P(m.group(1)); rs = sp.roots(sp.Poly(f, X_))
    if len(rs) != 2 or any(not r.is_rational for r in rs):
        return Verdict(False, f'roots {rs}')
    return Expect(','.join(str(r) for r in sorted(rs, key=float)))


@ref('auqwp', 'the stated condition is turned into a predicate and the unknown found by exhaustive search over a fine grid of positive rationals', 'exhaustive')
def auqwp(q):
    p = q['prompt']
    grid = [Fraction(i, 2) for i in range(1, 2001)]
    m = re.match(r'Two positive whole numbers differ by (\d+), and the sum of their squares is (\d+)\. .* the smaller number\.', p)
    if m:
        d, S = int(m.group(1)), int(m.group(2))
        sol = [n for n in range(1, 2000) if n * n + (n + d) ** 2 == S]
    else:
        m = re.match(r'The product of two consecutive positive whole numbers is (\d+)\. .* the smaller number\.', p)
        if m:
            sol = [n for n in range(1, 5000) if n * (n + 1) == int(m.group(1))]
        else:
            m = re.match(r'\w+ is (\d+) years older than (?:his|her) brother, and the product of their ages \(in years\) is (\d+)\. .* the brother\'s age\.', p)
            if m:
                d, pr = int(m.group(1)), int(m.group(2))
                sol = [n for n in range(1, 5000) if n * (n + d) == pr]
            else:
                m = re.match(r'A train travels (\d+) km at a uniform speed\. If the speed had been (\d+) km/h more, the journey would have taken (\d+) hours? less\.', p)
                if m:
                    D, dv, dt = map(int, m.groups())
                    sol = [s for s in range(1, 2000) if Fraction(D, s) - Fraction(D, s + dv) == dt]
                else:
                    return Unsupported('auqwp template ' + p[:60])
    if len(sol) != 1: return Ambiguous(f'{len(sol)} solutions {sol}')
    return Expect(str(sol[0]))


@ref('auvexp', 'the phrase parsed to an expression with sympy (in the question\'s own variable) and compared as an expression', 'exhaustive')
def auvexp(q):
    s = re.search(r'“(.*)”', q['prompt']).group(1)
    v = re.search(r'using (\w), for', q['prompt']).group(1)
    x = sp.Symbol(v)
    pats = [(r'(\d+) more than (\d+) times V', lambda a, b: b * x + a), (r'(\d+) less than (\d+) times V', lambda a, b: b * x - a),
            (r'(\d+) times the sum of V and (\d+)', lambda b, a: b * (x + a)), (r'(\d+) times the number you get when (\d+) is subtracted from V', lambda b, a: b * (x - a)),
            (r'V divided by (\d+), then increased by (\d+)', lambda b, a: x / b + a)]
    for pat, fn in pats:
        m = re.fullmatch(pat.replace('V', v), s)
        if m: return Expect(str(sp.expand(fn(*map(int, m.groups())))))
    return Unsupported('auvexp phrase ' + s)


@ref('aulwp', 'the stated condition as a predicate, unknown found by exhaustive search over whole numbers', 'exhaustive')
def aulwp(q):
    p = q['prompt']
    m = re.match(r'One number is (\d+) times another\. When (\d+) is added to each of them, the two new numbers add up to (\d+)\.', p)
    if m:
        k, a, S = map(int, m.groups()); sol = [n for n in range(0, 5000) if (n + a) + (k * n + a) == S]
    else:
        m = re.match(r'The length of a rectangle is (\d+) cm more than its width, and its perimeter is (\d+) cm\.', p)
        if m:
            d, per = map(int, m.groups()); sol = [w for w in range(0, 5000) if 2 * (w + (w + d)) == per]
        else:
            m = re.match(r'Five times a number, added to ten times the number that is (\d+) more than it, gives (\d+)\.', p)
            if m:
                a, S = map(int, m.groups()); sol = [n for n in range(0, 5000) if 5 * n + 10 * (n + a) == S]
            else:
                m = re.match(r'The sum of three consecutive whole numbers is (\d+)\.', p)
                if m:
                    S = int(m.group(1)); sol = [n for n in range(0, 5000) if n + (n + 1) + (n + 2) == S]
                else:
                    return Unsupported('aulwp template ' + p[:60])
    if len(sol) != 1: return Ambiguous(f'{len(sol)} solutions')
    return Expect(str(sol[0]))
