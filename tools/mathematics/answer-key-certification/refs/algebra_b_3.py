"""algebra-b module 3: more multiple-choice families (graphs, GP/AP recognition, matrices types, equation modelling, standard form)"""
import itertools
import math
import re
from kit import ref, Expect, Verdict, Unsupported, Ambiguous, Fraction, sp
from refs.algebra_b_common import *
from refs.algebra_b_2 import pick


# ---- aograph ----
def fn_of(opt):
    s = opt.split(' (')[0]
    assert s.startswith('y = ')
    s = s[4:]
    s = s.replace('−', '-').replace('|x|', 'abs(x)').replace('[x]', 'floor(x)').replace('√x', 'sqrt(x)').replace('log₂ x', 'log2(x)').replace('2ˣ', '2**x').replace('sgn x', 'sgn(x)')
    s = s.replace('x³', 'x**3').replace('x²', 'x**2')
    s = re.sub(r'(?<![\w)*(])(\d+)x', r'\1*x', s)
    s = re.sub(r'(?<![A-Za-z])(\d+)\(', r'\1*(', s)
    env = {'abs': abs, 'floor': math.floor, 'sqrt': lambda v: math.sqrt(v), 'log2': lambda v: math.log2(v), 'sgn': lambda v: (v > 0) - (v < 0)}
    return eval('lambda x: ' + s, env)


@ref('aograph', 'each option function is evaluated at every vertex and marked point of the drawn graph (tolerance 0.01); exactly one option must pass', 'exhaustive')
def aograph(q):
    fig = q['figure']
    pts = [tuple(p) for p in fig['points']]
    for a, b in fig['segments']:
        pts += [tuple(a), tuple(b)]
    pts = sorted(set(pts))

    def fits(o):
        f = fn_of(o)
        for x, y in pts:
            try:
                v = f(x)
            except (ValueError, ZeroDivisionError, OverflowError):
                return False
            if isinstance(v, complex) or abs(v - y) > 0.01:
                return False
        return True
    return pick(q, fits)


# ---- aogpid / auapis ----
def term_list(o):
    return [int(x) for x in re.findall(r'−?\d+', o)] if False else [int(x.replace('−', '-')) for x in re.findall(r'−?\d+', o)]


@ref('aogpid', 'ratio test on the listed terms of every option', 'exhaustive')
def aogpid(q):
    def is_gp(o):
        t = term_list(o)
        return all(v != 0 for v in t) and len({Fraction(b, a) for a, b in zip(t, t[1:])}) == 1
    return pick(q, is_gp)


@ref('auapis', 'difference test on the five listed terms; every option evaluated', 'exhaustive')
def auapis(q):
    t = term_list(q['prompt'].split('are ')[1].split('. Which')[0])
    d = {b - a for a, b in zip(t, t[1:])}
    isap = len(d) == 1

    def tr(o):
        if o == 'Not an AP': return not isap
        m = re.fullmatch(r'An AP with first term (−?\d+) and common difference (−?\d+)', o)
        return isap and int(m.group(1).replace('−', '-')) == t[0] and int(m.group(2).replace('−', '-')) == list(d)[0]
    return pick(q, tr)


# ---- aogpcv ----
@ref('aogpcv', 'common ratio from the three printed terms (checked consistent), then the partial sums of 3000 terms in floating point vs the claimed sum; every option evaluated', 'exhaustive')
def aogpcv(q):
    body = q['prompt'].split('series ')[1].split(' + ⋯')[0]
    toks = re.findall(r'([+−]?)\s*(\d+(?:/\d+)?)', body)
    t = [(-1 if s == '−' else 1) * Fraction(v) for s, v in toks]
    assert len(t) == 3
    if t[1] / t[0] != t[2] / t[1]:
        return Verdict(False, 'printed terms are not geometric')
    r = t[1] / t[0]
    # numeric limit of partial sums
    s = 0.0; term = float(t[0]); sums = []
    for _ in range(3000):
        s += term; term *= float(r); sums.append(s)
    converges = abs(sums[-1] - sums[-2]) < 1e-9 and abs(sums[-2] - sums[-3]) < 1e-9
    limit = Fraction(sums[-1]).limit_denominator(1000) if converges else None

    def tr(o):
        if o.startswith('The series diverges'): return not converges
        m = re.fullmatch(r'The series converges, and its sum to infinity is (−?\d+(?:/\d+)?)', o)
        if not m: raise ValueError(o)
        return converges and abs(float(Fraction(m.group(1).replace('−', '-'))) - sums[-1]) < 1e-6
    return pick(q, tr)


# ---- apmtype ----
def parse_matrix(s):
    rows = re.findall(r'\[([^\[\]]+)\]', s)
    return [[int(x.replace('−', '-')) for x in r.split(',')] for r in rows]


@ref('apmtype', 'shape and entries of the printed matrix tested against each definition; "most precise" = most specific true descriptor', 'exhaustive')
def apmtype(q):
    p = q['prompt']
    M = parse_matrix(p.split('. ')[0])
    r, c = len(M), len(M[0])
    if 'order of A' in p:
        return pick(q, lambda o: o == f'order {r} × {c}')
    zero = all(v == 0 for row in M for v in row)
    sq = r == c
    diag = sq and all(M[i][j] == 0 for i in range(r) for j in range(c) if i != j)
    scalar = diag and len({M[i][i] for i in range(r)}) == 1
    ident = scalar and M[0][0] == 1
    tags = []
    if zero: tags.append('a zero matrix')
    if ident: tags.append('an identity matrix')
    if scalar and not ident and not zero: tags.append('a scalar matrix that is not the identity matrix')
    if diag and not scalar: tags.append('a diagonal matrix that is not a scalar matrix')
    if sq and not diag: tags.append('a square matrix that is not a diagonal matrix')
    if r == 1: tags.append('a row matrix')
    if c == 1: tags.append('a column matrix')
    if r != 1 and c != 1 and not sq: tags.append('a rectangular matrix that is neither a row nor a column matrix')
    order = ['a zero matrix', 'an identity matrix', 'a scalar matrix that is not the identity matrix', 'a diagonal matrix that is not a scalar matrix',
             'a square matrix that is not a diagonal matrix', 'a row matrix', 'a column matrix', 'a rectangular matrix that is neither a row nor a column matrix']
    present = [o for o in options(q) if o in tags]
    if len(present) != 1:
        # several descriptors hold: the most precise is the earliest in the specificity order, unless the shape is 1x1
        if r == 1 and c == 1:
            return Ambiguous('1x1 matrix is row, column and square at once')
        best = min(present, key=order.index) if present else None
        return Expect('ABCD'[options(q).index(best)]) if best else Verdict(False, 'no option true')
    return Expect('ABCD'[options(q).index(present[0])])


# ---- auleq ----
@ref('auleq', 'story translated to an equation LHS−RHS; each option equation compared as a sympy polynomial identity', 'exhaustive')
def auleq(q):
    p = q['prompt']
    x = sp.Symbol('x')
    m = re.search(r'multiplies it by (\d+) and then adds (\d+)\. The result is (\d+)', p)
    if m:
        a, b, c = map(int, m.groups()); target = a * x + b - c
    else:
        m = re.search(r'buys (\d+) notebooks at ₹x each and one pen for ₹(\d+), and pays ₹(\d+) in all', p)
        if m:
            a, b, c = map(int, m.groups()); target = a * x + b - c
        else:
            m = re.search(r'had (\d+) boxes with x sweets in each\. After giving away (\d+) sweets, \w+ has (\d+) sweets left', p)
            a, b, c = map(int, m.groups()); target = a * x - b - c

    def tr(o):
        l, r = o.split(' = ')
        return sp.expand(P(l) - P(r) - target) == 0
    return pick(q, tr)


# ---- auqstd ----
@ref('auqstd', 'both sides expanded with sympy; every option equation compared with LHS−RHS exactly', 'exhaustive')
def auqstd(q):
    p = q['prompt']
    m = re.fullmatch(r'Write the equation (.*) in the form ax² \+ bx \+ c = 0, or decide that it is not a quadratic equation\. Which is correct\?', p)
    l, r = m.group(1).split(' = ')
    x = sp.Symbol('x')
    poly = sp.expand(P(l) - P(r))
    deg = sp.Poly(poly, x).degree() if poly != 0 else -1

    def tr(o):
        if o == 'It is not a quadratic equation': return deg != 2
        if deg != 2: return False
        ol, orr = o.split(' = ')
        return sp.expand(P(ol) - P(orr) - poly) == 0
    return pick(q, tr)
