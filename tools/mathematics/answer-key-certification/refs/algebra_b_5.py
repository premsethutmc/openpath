"""algebra-b module 5: partial fractions, inequalities, ranges, transformations, number lines, LP corner"""
import itertools
import random
import re
from kit import ref, Expect, Verdict, Unsupported, Ambiguous, Fraction, sp
from refs.algebra_b_common import *

x_ = sp.Symbol('x', real=True)


def ftxt(v):
    return str(v).replace('-', '−') if False else str(sp.nsimplify(v))


@ref('aonlread', 'interval text rebuilt from the structured number-line description (lo/hi, closed/open, null = arrow); the rendering itself is not independently checked', 'exhaustive',
     assumptions='the exported figure data is taken as the picture; pixel rendering of dots/arrows is not verified')
def aonlread(q):
    fig = q['figure']
    parts = []
    for iv in fig['intervals']:
        lo, hi = iv['lo'], iv['hi']
        l = '(−∞' if lo is None else ('[' if iv['loClosed'] else '(') + str(lo).replace('-', '−')
        r = '∞)' if hi is None else str(hi).replace('-', '−') + (']' if iv['hiClosed'] else ')')
        if lo is None and iv['loClosed'] or hi is None and iv['hiClosed']:
            return Verdict(False, 'closed end at infinity')
        parts.append(f'{l}, {r}')
    return Expect(' ∪ '.join(parts))


def solve_lin(rows, rhs):
    return sp.Matrix(rows).LUsolve(sp.Matrix(rhs))


def pf_generic(q, names):
    m = re.fullmatch(r'Resolve (.*?) into partial fractions of the form (.*?)\. Write the (?:pair|triple) \(.*\)\.', q['prompt'])
    X = sp.Symbol('x')
    syms = sp.symbols(' '.join(names))
    loc = dict(zip(names, syms))
    f = P(m.group(1))
    form = P(m.group(2), **loc)
    pts = [sp.Integer(v) for v in (100, -101, 37, 59, -83, 211)]
    eqs = [sp.Eq(form.subs(X, v), f.subs(X, v)) for v in pts[:len(names)]]
    sol = sp.solve(eqs, syms, dict=True)
    assert len(sol) == 1
    sol = sol[0]
    for v in [sp.Rational(1, 3), 7, -13, sp.Rational(5, 2), 29, -41, sp.Rational(7, 11)]:
        if f.subs(X, v) == sp.zoo or sp.denom(sp.together(f)).subs(X, v) == 0: continue
        assert form.subs(sol).subs(X, v) == f.subs(X, v), 'identity fails'
    return '(' + ', '.join(str(sol[s]) for s in syms) + ')'


@ref('aopf', 'unknowns found by sampling the identity at as many points as unknowns (sympy linear solve), then verified exactly at 7 further points', 'exhaustive')
def aopf(q):
    return Expect(pf_generic(q, ['A', 'B']))


@ref('aopfq', 'unknowns found by sampling the identity at 3 points (linear solve), then verified exactly at 7 further points', 'exhaustive')
def aopfq(q):
    return Expect(pf_generic(q, ['A', 'B', 'C']))


@ref('aopfint', 'integrand decomposed with sympy apart; antiderivative assembled term by term (c·log|x−a|), differentiated back and compared to the integrand at 8 points', 'exhaustive')
def aopfint(q):
    m = re.match(r'Find ∫ (.*?) dx by first', q['prompt'])
    X = sp.Symbol('x', real=True); f = P(m.group(1), x=X)
    parts = sp.apart(f, X)
    F = 0
    for term in sp.Add.make_args(parts):
        num_, den_ = sp.fraction(sp.together(term))
        if not den_.has(X):
            F += sp.integrate(term, X)
        else:
            lin = sp.Poly(den_, X)
            assert lin.degree() == 1, f'non-linear denominator in {term}'
            c = sp.simplify(term * (lin.as_expr()))  # numerator constant
            assert not c.has(X)
            a1 = lin.coeff_monomial(X)
            F += (c / a1) * sp.log(sp.Abs(lin.as_expr()))
    for v in [sp.Rational(1, 3), 7, sp.Rational(-13, 2), sp.Rational(5, 2), 29, -41, sp.Rational(11, 7), 100]:
        d = sp.diff(F, X).subs(X, v)
        if sp.simplify(d - f.subs(X, v)) != 0:
            raise AssertionError('antiderivative check failed')
    txt = ''
    for term in sp.Add.make_args(sp.expand(F)):
        txt += ' + ' + str(term)
    s = str(sp.expand(F)).replace('Abs(', 'ABS(')
    # render logs in the notation of the answers: c*log(ABS(u)) -> c log|u|
    s = re.sub(r'log\(ABS\((.*?)\)\)', r'log|\1|', s).replace('*log', 'log').replace('**', '^')
    return Expect(s)


@ref('aoqin', 'sympy solve_univariate_inequality on the printed quadratic inequality', 'exhaustive')
def aoqin(q):
    m = re.fullmatch(r'Solve (.*?) (≤|≥|<|>) 0\. Write the answer in interval notation\.', q['prompt'])
    e = P(m.group(1), x=x_)
    rel = {'≤': e <= 0, '≥': e >= 0, '<': e < 0, '>': e > 0}[m.group(2)]
    return Expect(iv_text(sp.solve_univariate_inequality(rel, x_, relational=False)))


@ref('aorat', 'sympy solve_univariate_inequality on the printed rational inequality', 'exhaustive')
def aorat(q):
    m = re.fullmatch(r'Solve (.*?) (≤|≥|<|>) 0\. Write the answer in interval notation\.', q['prompt'])
    e = P(m.group(1), x=x_)
    rel = {'≤': e <= 0, '≥': e >= 0, '<': e < 0, '>': e > 0}[m.group(2)]
    return Expect(iv_text(sp.solve_univariate_inequality(rel, x_, relational=False)))


@ref('aorange', 'sympy function_range over ℝ', 'exhaustive')
def aorange(q):
    m = re.search(r'f\(x\) = (.*)\. Write it in interval notation', q['prompt'])
    e = P(m.group(1), x=x_)
    return Expect(iv_text(sp.calculus.util.function_range(e, x_, sp.S.Reals)))


@ref('aotrans', 'solve g(x)=x0 for the new abscissa with sympy, new ordinate A·y0 + D', 'exhaustive')
def aotrans(q):
    p = q['prompt'].replace('−', '-')
    m = re.fullmatch(r'The point \((-?\d+), (-?\d+)\) lies on the graph of y = f\(x\)\. Which point must lie on the graph of y = (-?\d*)f\((.*?)\)(?: ([+-]) (\d+))?\? Write it as \(x, y\)\.', p)
    x0, y0 = int(m.group(1)), int(m.group(2))
    a = m.group(3)
    A = {'': 1, '-': -1}.get(a, None) if a in ('', '-') else int(a)
    D = 0 if m.group(5) is None else (int(m.group(6)) if m.group(5) == '+' else -int(m.group(6)))
    g = P(m.group(4).replace('-', '-'), x=x_)
    xs = sp.solve(sp.Eq(g, x0), x_)
    assert len(xs) == 1
    return Expect(f'({xs[0]}, {A * y0 + D})')


@ref('aocorner', 'all pairwise intersections of the four boundary lines in exact Fractions, feasibility-filtered; the single vertex with x>0,y>0', 'exhaustive')
def aocorner(q):
    p = q['prompt'].replace('−', '-')
    m = re.search(r'x ≥ 0, y ≥ 0, (\d*)x \+ (\d*)y ≤ (\d+) and (\d*)x \+ (\d*)y ≤ (\d+) has', p)
    g = lambda s: int(s) if s else 1
    a1, b1, c1, a2, b2, c2 = g(m.group(1)), g(m.group(2)), int(m.group(3)), g(m.group(4)), g(m.group(5)), int(m.group(6))
    lines = [(1, 0, 0), (0, 1, 0), (a1, b1, c1), (a2, b2, c2)]
    verts = set()
    for (p1, q1, r1), (p2, q2, r2) in itertools.combinations(lines, 2):
        det = p1 * q2 - p2 * q1
        if det == 0: continue
        X = Fraction(r1 * q2 - r2 * q1, det); Y = Fraction(p1 * r2 - p2 * r1, det)
        if X >= 0 and Y >= 0 and a1 * X + b1 * Y <= c1 and a2 * X + b2 * Y <= c2:
            verts.add((X, Y))
    off = [v for v in verts if v[0] > 0 and v[1] > 0]
    if len(off) != 1:
        return Verdict(False, f'{len(off)} corner points off the axes: {off}')
    return Expect(f'({off[0][0]}, {off[0][1]})')
