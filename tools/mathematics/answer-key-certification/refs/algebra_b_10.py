"""algebra-b module 10: foundation families (determinant, discriminant count, expand/factor boxes, linear equations/inequalities, tabulation)"""
import re
from kit import ref, Expect, Verdict, Unsupported, Ambiguous, Fraction, sp
from refs.algebra_b_common import *

X_ = sp.Symbol('x')
B_ = sp.Symbol('B')


@ref('det2', 'ad − bc from the printed rows, cross-checked by sympy Matrix.det()', 'exhaustive')
def det2(q):
    m = re.search(r'matrix \[\[(−?\d+), (−?\d+)\], \[(−?\d+), (−?\d+)\]\] \(first row (.*?); second row (.*?)\)', q['prompt'])
    a, b, c, d = [int(m.group(i).replace('−', '-')) for i in (1, 2, 3, 4)]
    assert ints(m.group(5)) == [a, b] and ints(m.group(6)) == [c, d]
    assert sp.Matrix([[a, b], [c, d]]).det() == a * d - b * c
    return Expect(str(a * d - b * c))


@ref('disc', 'number of distinct real roots counted by sympy (exact real root isolation)', 'exhaustive')
def disc(q):
    m = re.fullmatch(r'How many different real solutions does (.*) = 0 have\? \(0, 1 or 2\)', q['prompt'])
    return Expect(str(len(set(sp.real_roots(sp.Poly(P(m.group(1)), X_))))))


def box(q, lhs_rhs):
    """solve for the box value B so that LHS - RHS == 0 identically in x"""
    l, r = lhs_rhs
    d = sp.Poly(sp.expand(P(l) - P(r.replace('□', 'B'), B=B_)), X_)
    sol = sp.solve(d.all_coeffs(), B_, dict=True)
    if len(sol) != 1:
        return Ambiguous(f'box solutions: {sol}')
    return Expect(str(sol[0][B_]))


@ref('dist', 'box value found so that both sides agree as polynomials (sympy)', 'exhaustive')
def dist(q):
    m = re.fullmatch(r'Expand the bracket: (.*) = (.*)\. What number goes in the box\?', q['prompt'])
    return box(q, (m.group(1), m.group(2)))


@ref('expand', 'box value found so that both sides agree as polynomials (sympy)', 'exhaustive')
def expand(q):
    m = re.fullmatch(r'Expand (.*) = (.*)\. What number goes in the box.*', q['prompt'])
    return box(q, (m.group(1), m.group(2)))


@ref('factor', 'box value found so that both sides agree as polynomials (sympy)', 'exhaustive')
def factor(q):
    m = re.fullmatch(r'Factorise: (.*) = (.*)\. What number goes in the box.*', q['prompt'])
    return box(q, (m.group(1), m.group(2)))


@ref('lin', 'sympy solve and exact substitution', 'exhaustive')
def lin(q):
    m = re.fullmatch(r'Solve (.*) = (.*)\. What is x\?', q['prompt'])
    sol = sp.solve(sp.Eq(P(m.group(1)), P(m.group(2))), X_)
    if len(sol) != 1: return Ambiguous(f'{sol}')
    assert P(m.group(1)).subs(X_, sol[0]) == P(m.group(2)).subs(X_, sol[0])
    return Expect(str(sol[0]))


@ref('lneg', 'sympy solve and exact substitution', 'exhaustive')
def lneg(q):
    m = re.fullmatch(r'Solve (.*) = (.*)\.', q['prompt'])
    sol = sp.solve(sp.Eq(P(m.group(1)), P(m.group(2))), X_)
    if len(sol) != 1: return Ambiguous(f'{sol}')
    return Expect(str(sol[0]))


@ref('lineq', 'sympy solve_univariate_inequality (reversal of the sign by a negative coefficient included)', 'exhaustive')
def lineq(q):
    m = re.fullmatch(r'Solve (.*) (<|>|≤|≥) (.*)\. Write the answer as an inequality for x.*', q['prompt'])
    l, r = P(m.group(1), x=sp.Symbol('x', real=True)), P(m.group(3), x=sp.Symbol('x', real=True))
    xr = sp.Symbol('x', real=True)
    rel = {'<': l < r, '>': l > r, '≤': l <= r, '≥': l >= r}[m.group(2)]
    return Expect(ineq_text(sp.solve_univariate_inequality(rel, xr, relational=False), 'x'))


@ref('linev', 'substitute x into the printed line', 'exhaustive')
def linev(q):
    m = re.fullmatch(r'On the line y = (.*), what is y when x = (−?\d+)\?', q['prompt'])
    return Expect(str(P(m.group(1)).subs(X_, int(m.group(2).replace('−', '-')))))


@ref('meet', 'all integers −4..4 tested against x·x = mx + c', 'exhaustive')
def meet(q):
    m = re.fullmatch(r'Try whole numbers x from (−?\d+) to (−?\d+)\. For which of them is x × x equal to (.*)\? Enter both, separated by a comma\.', q['prompt'])
    lo, hi = int(m.group(1).replace('−', '-')), int(m.group(2))
    e = P(m.group(3))
    sol = [v for v in range(lo, hi + 1) if v * v == e.subs(X_, v)]
    if len(sol) != 2:
        return Verdict(False, f'{len(sol)} solutions {sol}, but "Enter both" asks for two')
    return Expect(','.join(map(str, sol)))


@ref('quad', 'sympy exact roots; two distinct values required by "give both solutions"', 'exhaustive')
def quad(q):
    m = re.fullmatch(r'Solve (.*) = 0\. Give both solutions, separated by a comma\.', q['prompt'])
    rs = sp.roots(sp.Poly(P(m.group(1)), X_))
    if len(rs) != 2:
        return Verdict(False, f'roots {rs}: not two distinct solutions')
    return Expect(','.join(str(r) for r in sorted(rs, key=float)))
