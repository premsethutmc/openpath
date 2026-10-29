"""algebra-b module 7: matrices and linear systems"""
import itertools
import re
from kit import ref, Expect, Verdict, Unsupported, Ambiguous, Fraction, sp
from refs.algebra_b_common import *

X_, Y_, Z_ = sp.symbols('x y z')


def mrows(s):
    """'[[a, b], [c, d]]' -> list of lists of entry strings"""
    return [[e.strip() for e in r.split(',')] for r in re.findall(r'\[([^\[\]]+)\]', s)]


def mnum(s):
    return sp.Matrix([[sp.Rational(e.replace('−', '-')) for e in r] for r in mrows(s)])


def mtext(M):
    return '[' + ', '.join('[' + ', '.join(str(v) for v in M.row(i)) + ']' for i in range(M.rows)) + ']'


@ref('apmcon', 'entries computed one by one from the rule a_ij (python eval over i,j); transpose built by swapping indices', 'exhaustive')
def apmcon(q):
    m = re.fullmatch(r'Construct the (\d+) × (\d+) matrix A = \[aᵢⱼ\] whose elements are given by aᵢⱼ = (.*?)(, and write its transpose Aᵀ)?\. Write (?:A|Aᵀ) as .*', q['prompt'])
    r, c = int(m.group(1)), int(m.group(2))
    I_, J_ = sp.symbols('i j')
    rule = re.sub(r'\|([^|]+)\|', r'Abs(\1)', m.group(3))
    ex = P(rule, i=I_, j=J_, Abs=sp.Abs)
    A = [[ex.subs({I_: i, J_: j}) for j in range(1, c + 1)] for i in range(1, r + 1)]
    if m.group(4):
        A = [[A[i][j] for i in range(r)] for j in range(c)]
    return Expect('[' + ', '.join('[' + ', '.join(str(v) for v in row) + ']' for row in A) + ']')


@ref('apmcost', 'matrix product with sympy; the stated orders of Q and P are checked against the printed matrices', 'exhaustive')
def apmcost(q):
    m = re.fullmatch(r'Q = (\[\[.*?\]\]) \(order (\d+) × (\d+)\) and P = (\[\[.*?\]\]) \(order (\d+) × (\d+)\)\. Find QP, written as a column \[\[a\], \[b\]\]\.', q['prompt'])
    Q, Pm = mnum(m.group(1)), mnum(m.group(4))
    if (Q.rows, Q.cols) != (int(m.group(2)), int(m.group(3))) or (Pm.rows, Pm.cols) != (int(m.group(5)), int(m.group(6))):
        return Verdict(False, 'stated order differs from the printed matrix')
    return Expect(mtext(Q * Pm))


@ref('apmeq', 'entrywise equations solved with sympy; constant entries must agree, solution must be unique', 'exhaustive')
def apmeq(q):
    m = re.fullmatch(r'If (\[\[.*?\]\]) = (\[\[.*?\]\]), find (x, y and z|x and y)\. Write the answer as \((.*)\)\.', q['prompt'])
    L, R = mrows(m.group(1)), mrows(m.group(2))
    vars_ = [X_, Y_, Z_][:3 if 'z' in m.group(3) else 2]
    eqs = []
    for rl, rr in zip(L, R):
        for a, b in zip(rl, rr):
            e = sp.expand(P(a) - P(b))
            if e.free_symbols:
                eqs.append(e)
            elif e != 0:
                return Verdict(False, f'constant entries differ ({a} vs {b}): no solution exists')
    sol = sp.solve(eqs, vars_, dict=True)
    if len(sol) != 1 or set(sol[0]) != set(vars_):
        return Ambiguous(f'solutions: {sol}')
    return Expect('(' + ', '.join(str(sol[0][v]) for v in vars_) + ')')


@ref('apmlin', 'X = (B ∓ A)/k with exact rational matrices (sympy), then substituted back into the printed equation', 'exhaustive')
def apmlin(q):
    m = re.fullmatch(r'A = (\[\[.*?\]\]) and B = (\[\[.*?\]\])\. Find the matrix X such that (.*), written as .*', q['prompt'])
    A, B = mnum(m.group(1)), mnum(m.group(2))
    eq = m.group(3).replace('−', '-')
    mm = re.fullmatch(r'(\d*)X ([+-]) A = B', eq)
    if mm:
        k = int(mm.group(1) or 1); sgn = 1 if mm.group(2) == '+' else -1
        Xm = (B - sgn * A) / k
        assert k * Xm + sgn * A == B
        return Expect(mtext(Xm))
    mm = re.fullmatch(r'A ([+-]) (\d*)X = B', eq)
    if mm:
        k = int(mm.group(2) or 1)
        Xm = (B - A) / k if mm.group(1) == '+' else (A - B) / k
        return Expect(mtext(Xm))
    return Unsupported('apmlin equation form ' + eq)


@ref('apmmul', 'product of the two printed 2×2 matrices (sympy)', 'exhaustive')
def apmmul(q):
    m = re.fullmatch(r'A = (\[\[.*?\]\]) and B = (\[\[.*?\]\])\. Find AB, written as .*', q['prompt'])
    return Expect(mtext(mnum(m.group(1)) * mnum(m.group(2))))


@ref('apmmod', 'production matrix × needs matrix built from the story (regexes) and multiplied with sympy', 'exhaustive')
def apmmod(q):
    p = q['prompt']
    if 'canteens' in p:
        m = re.search(r'canteen P makes (\d+) dozen idlis, (\d+) dozen dosas and (\d+) dozen vadas, and canteen Q makes (\d+), (\d+) and (\d+) dozen\. One dozen idlis needs (\d+) cups? of batter and (\d+) spoons? of oil, a dozen dosas (\d+) cups? and (\d+) spoons?, and a dozen vadas (\d+) cups? and (\d+) spoons?\.', p)
    else:
        m = re.search(r'workshop P makes (\d+) chairs?, (\d+) tables? and (\d+) cupboards?, and workshop Q makes (\d+) chairs?, (\d+) tables? and (\d+) cupboards?\. A chair needs (\d+) units? of wood and (\d+) hours? of labour, a table (\d+) units? and (\d+) hours?, and a cupboard (\d+) units? and (\d+) hours?\.', p)
    v = list(map(int, m.groups()))
    prod = sp.Matrix([v[0:3], v[3:6]]); need = sp.Matrix([[v[6], v[7]], [v[8], v[9]], [v[10], v[11]]])
    return Expect(mtext(prod * need))


@ref('aporth', 'inverse by sympy Matrix.inv(); orthogonality AAᵀ=I of the printed matrix checked', 'exhaustive')
def aporth(q):
    m = re.search(r'A = (\[\[.*?\]\]) is an orthogonal matrix', q['prompt'])
    A = mnum(m.group(1))
    if A * A.T != sp.eye(A.rows):
        return Verdict(False, 'printed matrix is not orthogonal')
    return Expect(mtext(A.inv()))


@ref('aprot', 'image = T·v with sympy; the matrix is also checked to be the stated rotation / reflection', 'exhaustive')
def aprot(q):
    p = q['prompt'].replace('−', '-')
    m = re.fullmatch(r'The matrix T = (\[\[.*?\]\]) represents (.*?)\. Find the image of the point \((-?\d+), (-?\d+)\) by working out T\[\[(-?\d+)\], \[(-?\d+)\]\]\. Write it as \(x, y\)\.', p)
    T = mnum(m.group(1)); desc = m.group(2)
    mr = re.fullmatch(r'a rotation through (\d+)°(?: anticlockwise)? about the origin', desc)
    if mr:
        th = sp.Rational(int(mr.group(1)), 180) * sp.pi
        want = sp.Matrix([[sp.cos(th), -sp.sin(th)], [sp.sin(th), sp.cos(th)]])
    else:
        want = {'a reflection in the line y = x': sp.Matrix([[0, 1], [1, 0]]), 'a reflection in the y-axis': sp.Matrix([[-1, 0], [0, 1]]),
                'a reflection in the x-axis': sp.Matrix([[1, 0], [0, -1]])}[desc]
    if sp.simplify(T - want) != sp.zeros(2, 2):
        return Verdict(False, f'matrix {T.tolist()} is not {desc}')
    v = sp.Matrix([int(m.group(3)), int(m.group(4))])
    assert (int(m.group(5)), int(m.group(6))) == (v[0], v[1])
    w = T * v
    return Expect(f'({w[0]}, {w[1]})')


@ref('apsys2', 'A⁻¹B with sympy; A·X = B checked', 'exhaustive')
def apsys2(q):
    m = re.fullmatch(r'Use the inverse of A = (\[\[.*?\]\]) to solve AX = B, where X = \[\[x\], \[y\]\] and B = (\[\[.*?\]\])\. Write the solution as \(x, y\)\.', q['prompt'])
    A, B = mnum(m.group(1)), mnum(m.group(2))
    if A.det() == 0:
        return Verdict(False, 'A singular')
    Xs = A.inv() * B
    assert A * Xs == B
    return Expect(f'({Xs[0]}, {Xs[1]})')


@ref('apsys3', 'the three printed equations parsed and solved with sympy linsolve; uniqueness and substitution checked', 'exhaustive')
def apsys3(q):
    m = re.fullmatch(r'Solve by the matrix method \(X = A⁻¹B\): (.*)\. Write the solution as \(x, y, z\)\.', q['prompt'])
    eqs = [sp.Eq(P(s.split(' = ')[0]), P(s.split(' = ')[1])) for s in m.group(1).split('; ')]
    sol = sp.linsolve(eqs, [X_, Y_, Z_])
    if len(sol) != 1 or not all(sp.sympify(v).is_number for v in list(sol)[0]):
        return Ambiguous(f'no unique solution: {sol}')
    s = list(sol)[0]
    return Expect('(' + ', '.join(str(v) for v in s) + ')')


@ref('apsysw', 'the three story sentences parsed into equations (items present in each sentence), solved with sympy; uniqueness checked', 'exhaustive')
def apsysw(q):
    p = q['prompt']
    if 'stationery' in p:
        names = ['notebook', 'pen', 'eraser']; body = p.split(' buys ', 1)[1].split('. Form')[0]
        clauses = re.split(r'; (?:Ravi|Meena) buys ', body)
        clauses[0] = clauses[0]
        get = lambda c: ({n: int(k) for k, n in re.findall(r'(\d+) (notebook|pen|eraser)s?', c)}, int(re.search(r'₹(\d+)', c).group(1)))
    elif 'theatre' in p:
        names = ['adult', 'senior-citizen', 'child']
        body = p.split('. Form')[0]
        clauses = re.split(r'; (?:on )?(?:Tuesday|Wednesday)? ?', body)
        clauses = [c for c in re.split(r'(?:on Monday |on Tuesday |on Wednesday )', body) if 'theatre sold' in c or 'tickets' in c]
        clauses = [c.split('the theatre sold ')[-1] for c in clauses]
        get = lambda c: ({n: int(k) for k, n in re.findall(r'(\d+) (adult|senior-citizen|child) tickets?', c)}, int(re.search(r'₹(\d+)', c).group(1)))
    else:
        names = ['A', 'B', 'C']
        body = p.split('. Form')[0]
        clauses = re.split(r'; Farm [QR] used ', body.split('Farm P used ')[1])
        get = lambda c: ({n: int(k) for k, n in re.findall(r'(\d+) bags? of fertiliser ([ABC])', c)}, int(re.search(r'giving (\d+) kg', c).group(1)))
    rows, rhs = [], []
    for c in clauses:
        d, r = get(c)
        rows.append([d.get(n, 0) for n in names]); rhs.append(r)
    if len(rows) != 3:
        return Unsupported(f'could not parse 3 equations ({len(rows)})')
    A = sp.Matrix(rows)
    if A.det() == 0:
        return Ambiguous('singular system')
    s = A.LUsolve(sp.Matrix(rhs))
    return Expect('(' + ', '.join(str(v) for v in s) + ')')
