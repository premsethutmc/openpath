"""part F: matrices and linear systems. Matrices are re-read from the prompt; results derived by exact elimination (Fractions) and verified by substitution/multiplication."""
import re
from kit import ref, Expect, Verdict, Unsupported, Ambiguous, Fraction, sp  # noqa: F401


def norm(s):
    return s.replace('−', '-')


def matrices(p):
    out = []
    for m in re.findall(r'\[\[[^A-Za-z]*?\]\]', norm(p)):
        rows = re.findall(r'\[([^\[\]]*)\]', m)
        out.append([[Fraction(x.strip()) for x in r.split(',')] for r in rows])
    return out


def mtxt(M):
    return '[' + ', '.join('[' + ', '.join(str(Fraction(x)) for x in r) + ']' for r in M) + ']'


def mmul(A, B):
    return [[sum(A[i][k] * B[k][j] for k in range(len(B))) for j in range(len(B[0]))] for i in range(len(A))]


def T(A):
    return [list(r) for r in zip(*A)]


def eye(n):
    return [[Fraction(int(i == j)) for j in range(n)] for i in range(n)]


def gauss_jordan_inverse(A):
    n = len(A)
    M = [list(map(Fraction, A[i])) + eye(n)[i] for i in range(n)]
    for c in range(n):
        piv = next((r for r in range(c, n) if M[r][c] != 0), None)
        if piv is None:
            return None
        M[c], M[piv] = M[piv], M[c]
        M[c] = [x / M[c][c] for x in M[c]]
        for r in range(n):
            if r != c and M[r][c] != 0:
                f = M[r][c]
                M[r] = [x - f * y for x, y in zip(M[r], M[c])]
    return [r[n:] for r in M]


def rank(A):
    M = [list(map(Fraction, r)) for r in A]
    rk = 0
    for c in range(len(M[0])):
        piv = next((r for r in range(rk, len(M)) if M[r][c] != 0), None)
        if piv is None:
            continue
        M[rk], M[piv] = M[piv], M[rk]
        for r in range(len(M)):
            if r != rk and M[r][c] != 0:
                f = M[r][c] / M[rk][c]
                M[r] = [x - f * y for x, y in zip(M[r], M[rk])]
        rk += 1
    return rk


@ref('apadj3', 'adjugate = transpose of the cofactor matrix (SymPy minors); verified by A adj(A) = det(A) I')
def apadj3(q):
    A = matrices(q['prompt'])[0]
    S = sp.Matrix([[sp.Rational(x.numerator, x.denominator) for x in r] for r in A])
    cof = sp.Matrix(3, 3, lambda i, j: (-1) ** (i + j) * S.minor(i, j))
    adj = cof.T
    assert S * adj == S.det() * sp.eye(3)
    return Expect(str(adj.tolist()).replace('], [', '], [').replace('[[', '[[').replace(']]', ']]'))


@ref('apgj3', 'Gauss-Jordan elimination on [A | I] with exact fractions, verified by A A^-1 = I')
def apgj3(q):
    A = matrices(q['prompt'])[0]
    inv = gauss_jordan_inverse(A)
    if inv is None:
        return Ambiguous('singular matrix: no inverse')
    assert mmul(A, inv) == eye(3)
    return Expect(mtxt(inv))


@ref('apinv2', 'Gauss-Jordan elimination with exact fractions, verified by A A^-1 = I')
def apinv2(q):
    A = matrices(q['prompt'])[0]
    inv = gauss_jordan_inverse(A)
    if inv is None:
        return Ambiguous('singular matrix: no inverse')
    assert mmul(A, inv) == eye(2)
    return Expect(mtxt(inv))


@ref('aprank', 'rank by exact row reduction; cross-checked with SymPy rank')
def aprank(q):
    A = matrices(q['prompt'])[0]
    r = rank(A)
    assert r == sp.Matrix([[sp.Rational(x.numerator, x.denominator) for x in row] for row in A]).rank()
    return Expect(str(r))


def parse_system(p):
    p = norm(p)
    s = re.search(r'system (.*?) (?:fail|have)', p).group(1) if 'For which' in p else \
        re.search(r'(?:this system has: |The system )(.*?)(?:\.$| has infinitely)', p).group(1)
    eqs = [e.strip() for e in s.split(', ')]
    return eqs


def lin(expr_text, syms):
    t = expr_text.replace('\u03bb', 'lam*').replace('\u03bc', 'mu')
    t = re.sub(r'(\d)\s*([a-z])', r'\1*\2', t)
    return sp.sympify(t, locals={str(s): s for s in syms})


X, Y, Z, LAM, MU = sp.symbols('x y z lam mu')


@ref('aqcpar', 'lambda: determinant of the coefficient matrix vanishes (no unique solution); mu: rank of the augmented matrix equals rank of A (infinitely many solutions); verified with explicit rank computations')
def aqcpar(q):
    p = norm(q['prompt'])
    asked = re.search(r'For which value of (\u03bb|\u03bc)', p).group(1)
    eqs = parse_system(p)
    rows, rhs = [], []
    for e in eqs:
        l, r = e.split(' = ')
        L = sp.expand(lin(l, (X, Y, Z, LAM, MU)))
        rows.append([L.coeff(v) for v in (X, Y, Z)])
        rhs.append(lin(r, (X, Y, Z, LAM, MU)))
    M = sp.Matrix(rows)
    if asked == '\u03bb':
        sols = sp.solve(sp.expand(M.det()), LAM)
        if len(sols) != 1:
            return Ambiguous('det(lambda) has solutions %r' % (sols,))
        lam0 = sols[0]
        assert M.subs(LAM, lam0).rank() < 3
        return Expect(str(lam0))
    # mu asked: A has numeric entries
    if M.det() != 0 or M.rank() != 2:
        return Verdict(False, 'coefficient matrix rank %d (det %s): "infinitely many" needs rank 2' % (M.rank(), M.det()))
    aug = M.row_join(sp.Matrix(rhs))
    # rank(aug) == 2 <=> every 3x3 minor of aug vanishes; here the only 3x3 minors are dets with the mu-column
    ds = []
    for cols in ((0, 1, 3), (0, 2, 3), (1, 2, 3)):
        ds.append(sp.expand(aug[:, list(cols)].det()))
    sols = [set(sp.solve(d, MU)) if d.has(MU) else (set() if d != 0 else None) for d in ds]
    cand = None
    for s_ in sols:
        if s_ is None:
            continue
        cand = s_ if cand is None else cand & s_
    if cand is None or len(cand) != 1:
        return Ambiguous('mu candidates %r' % (cand,))
    mu0 = list(cand)[0]
    assert aug.subs(MU, mu0).rank() == 2
    return Expect(str(mu0))


@ref('aqsolset', 'solve the system exactly with SymPy linsolve, then verify the tuple by substituting x=p+qt, y=r+st, z=t into every equation')
def aqsolset(q):
    p = norm(q['prompt'])
    eqs = parse_system(p)
    E = []
    for e in eqs:
        l, r = e.split(' = ')
        E.append(sp.Eq(lin(l, (X, Y, Z)), lin(r, (X, Y, Z))))
    sol = sp.linsolve(E, [X, Y, Z])
    sol = list(sol)
    if len(sol) != 1:
        return Ambiguous('no solution')
    x, y, z = sol[0]
    t = sp.Symbol('t')
    if z != Z:
        return Verdict(False, 'z is not free: %r' % ((x, y, z),))
    x, y = [sp.expand(e.subs(Z, t)) for e in (x, y)]
    if x.free_symbols - {t} or y.free_symbols - {t}:
        return Verdict(False, 'x or y free: %r' % ((x, y),))
    pp, qq, rr, ss = x.coeff(t, 0), x.coeff(t, 1), y.coeff(t, 0), y.coeff(t, 1)
    for e in E:
        assert sp.simplify(e.lhs.subs({X: x, Y: y, Z: t}) - e.rhs.subs({X: x, Y: y, Z: t})) == 0
    return Expect('(%s, %s, %s, %s)' % (pp, qq, rr, ss))


@ref('aqsym', 'P = (A + A^T)/2, Q = (A - A^T)/2, with P + Q = A verified')
def aqsym(q):
    A = matrices(q['prompt'])[0]
    P = [[(A[i][j] + A[j][i]) / 2 for j in range(3)] for i in range(3)]
    Q = [[(A[i][j] - A[j][i]) / 2 for j in range(3)] for i in range(3)]
    assert all(P[i][j] + Q[i][j] == A[i][j] for i in range(3) for j in range(3))
    s = q['prompt'].split('Find ')[1][0]
    return Expect(mtxt(P if s == 'P' else Q))


@ref('aqtrab', 'transpose of the explicit product AB')
def aqtrab(q):
    A, B = matrices(q['prompt'])[:2]
    return Expect(mtxt(T(mmul(A, B))))
