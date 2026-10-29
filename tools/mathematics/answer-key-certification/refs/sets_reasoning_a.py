"""sets-reasoning slice, part A: Cartesian products, intervals, binary operations, relations, functions, logic.
Independent of production code. Native multiple-choice (type 'choice') questions: the exported file has only the keyed letter, so the
option texts were exported separately (data only, /tmp/certout/sets-reasoning/choice_options.json, `problemOf(id).options`) and the
derived answer is mapped to the option whose wording states it (exactly one option must match)."""
import itertools
import json
import os
import re
import random
from kit import ref, Expect, Verdict, Unsupported, Ambiguous, Fraction, sp

OPTFILE = os.environ.get('SR_OPTS', '/tmp/certout/sets-reasoning/choice_options.json')
try:
    OPT = json.load(open(OPTFILE))
except Exception:  # noqa: BLE001
    OPT = {}


def fam_of(q):
    return q['id'].split(':')[1]


def options(q):
    return OPT[fam_of(q)][q['id']]['options']


def norm(s):
    return s.replace('−', '-').replace('−', '-')


def pick(q, pred):
    """letter of the unique option satisfying pred, else raises"""
    opts = options(q)
    hits = [i for i, o in enumerate(opts) if pred(o)]
    if len(hits) != 1:
        raise ValueError(f'{len(hits)} options match: {opts}')
    return 'ABCD'[hits[0]]


# ---------------------------------------------------------------- apcarteq
@ref('apcarteq', 'parse the two component expressions with SymPy, solve the 2x2 linear system exactly, substitute back into both equalities', 'exhaustive')
def apcarteq(q):
    m = re.match(r'If \((.+?), (.+?)\) = \((.+?), (.+?)\), find x and y', norm(q['prompt']))
    x, y = sp.symbols('x y')
    from sympy.parsing.sympy_parser import parse_expr, standard_transformations, implicit_multiplication_application
    tr = standard_transformations + (implicit_multiplication_application,)
    e = [parse_expr(m.group(i), transformations=tr, local_dict={'x': x, 'y': y}) for i in (1, 2)]
    v = [sp.Rational(m.group(i)) for i in (3, 4)]
    sol = sp.solve([e[0] - v[0], e[1] - v[1]], [x, y], dict=True)
    assert len(sol) == 1
    s = sol[0]
    assert all(sp.simplify(e[i].subs(s) - v[i]) == 0 for i in (0, 1))
    return Expect(f'({s[x]}, {s[y]})')


# ---------------------------------------------------------------- Cartesian helpers
def parse_sets(text):
    d = {}
    for name, body in re.findall(r'\b([ABC]) = \{([^{}]*)\}', text):
        d[name] = [t.strip() for t in body.split(',') if t.strip()]
    return d


def tuples_in(opt):
    return set(tuple(t.strip() for t in g.split(',')) for g in re.findall(r'\(([^()]*)\)', norm(opt)))


@ref('apcartl', 'build A x B (x C) with itertools.product from the sets read off the statement; the option whose set of tuples equals it', 'exhaustive')
def apcartl(q):
    p = norm(q['prompt'])
    S = parse_sets(p)
    expr = re.search(r'Which set is ([ABC](?: × [ABC])*)\?', p).group(1).split(' × ')
    target = set(itertools.product(*[S[n] for n in expr]))
    return Expect(pick(q, lambda o: tuples_in(o) == target and len(re.findall(r'\(', o)) == len(target)))


def set_elems(p, which):
    # returns list of elements of set `which` from "A = {..}" or "{x ∈ ℤ : a ≤ x < b}"
    m = re.search(rf'\b{which} = \{{x ∈ ℤ : (-?\d+) (≤|<) x (≤|<) (-?\d+)\}}', p)
    if m:
        lo, o1, o2, hi = int(m.group(1)), m.group(2), m.group(3), int(m.group(4))
        return [n for n in range(lo - 3, hi + 4) if (lo <= n if o1 == '≤' else lo < n) and (n <= hi if o2 == '≤' else n < hi)]
    m = re.search(rf'\b{which} = \{{([^{{}}]*)\}}', p)
    return [t.strip() for t in m.group(1).split(',') if t.strip()]


class _T:
    def __init__(self, items, flat=False):
        self.s = set(items)
    def __mul__(self, o):
        return _T((a if isinstance(a, tuple) else (a,)) + (b if isinstance(b, tuple) else (b,)) for a in self.s for b in o.s)
    def __and__(self, o):
        return _T(self.s & o.s)
    def __or__(self, o):
        return _T(self.s | o.s)


@ref('apcartn', 'enumerate the product with itertools-style set construction after expanding each set (set-builder sets enumerated over integers); evaluate the set expression (x, intersection, union) on explicit sets of tuples and count', 'exhaustive')
def apcartn(q):
    p = norm(q['prompt'])
    expr = re.search(r'How many elements does (.+?) have', p).group(1)
    env = {n: _T(set_elems(p, n)) for n in set(re.findall(r'[ABC]', expr))}
    for n in env:
        assert len(env[n].s) == len(set_elems(p, n))
    r = eval(expr.replace('×', '*').replace('∩', '&').replace('∪', '|'), {}, env)
    return Expect(str(len(r.s)))


@ref('apcartset', 'read the listed ordered pairs; A and B are the sets of first and second components; confirm |A||B| = number of pairs and that every combination is present', 'exhaustive')
def apcartset(q):
    p = norm(q['prompt'])
    pairs = [tuple(int(v) for v in g.split(',')) for g in re.findall(r'\(([^()]*)\)', p.split('Find')[0])]
    A = sorted(set(a for a, b in pairs)); B = sorted(set(b for a, b in pairs))
    if set(itertools.product(A, B)) != set(pairs) or len(pairs) != len(set(pairs)):
        return Ambiguous('listed pairs are not a full Cartesian product')
    which = re.search(r'Find the set ([AB])', p).group(1)
    return Expect(', '.join(str(v) for v in (A if which == 'A' else B)))


# ---------------------------------------------------------------- intervals
INF = sp.oo


def num(s):
    s = norm(s).strip()
    if s in ('∞', '+∞'):
        return sp.oo
    if s == '-∞':
        return -sp.oo
    return sp.Rational(s)


def parse_interval(s):
    s = norm(s).strip()
    m = re.fullmatch(r'([\[(])\s*([^,]+?)\s*,\s*([^\])]+?)\s*([\])])', s)
    lo, hi = num(m.group(2)), num(m.group(3))
    return sp.Interval(lo, hi, m.group(1) == '(', m.group(4) == ')')


def fmt(v):
    if v == sp.oo:
        return '∞'
    if v == -sp.oo:
        return '-∞'
    return str(v)


def iv_text(S):
    if S == sp.S.EmptySet:
        return '∅'
    parts = []
    args = S.args if isinstance(S, sp.Union) else [S]
    for a in sorted(args, key=lambda t: (t.start if hasattr(t, 'start') else min(t.args))):
        if isinstance(a, sp.Interval):
            parts.append(('(' if a.left_open else '[') + fmt(a.start) + ', ' + fmt(a.end) + (')' if a.right_open else ']'))
        elif isinstance(a, sp.FiniteSet):
            parts.append('{' + ', '.join(str(e) for e in a.args) + '}')
        else:
            raise ValueError(a)
    return ' ∪ '.join(parts)


@ref('apineq', 'split into two one-sided inequalities, solve each with sympy.solve_univariate_inequality, intersect as sympy Intervals; spot-check membership of grid points directly in the original double inequality', 'exhaustive')
def apineq(q):
    p = norm(q['prompt'])
    m = re.match(r'Solve (.+?) (≤|<) (.+?) (≤|<) (.+?) for real x', p)
    x = sp.symbols('x', real=True)
    from sympy.parsing.sympy_parser import parse_expr, standard_transformations, implicit_multiplication_application
    tr = standard_transformations + (implicit_multiplication_application,)
    lo, mid, hi = (parse_expr(m.group(i), transformations=tr, local_dict={'x': x}) for i in (1, 3, 5))
    rel = {'≤': lambda a, b: a <= b, '<': lambda a, b: a < b}
    s1 = sp.solve_univariate_inequality(rel[m.group(2)](lo, mid), x, relational=False)
    s2 = sp.solve_univariate_inequality(rel[m.group(4)](mid, hi), x, relational=False)
    S = s1.intersect(s2)
    for g in range(-60, 61):
        t = sp.Rational(g, 4)
        direct = bool(rel[m.group(2)](lo, mid.subs(x, t)) and rel[m.group(4)](mid.subs(x, t), hi))
        assert direct == (t in S), (t, S)
    return Expect(iv_text(S), form=False)


def set_from_inequality(txt):
    """interval set from "a ≤ x < b" / "x ≥ a" text"""
    t = norm(txt).replace(' ', '')
    m = re.fullmatch(r'(-?\d+)(≤|<)x(≤|<)(-?\d+)', t)
    if m:
        return sp.Interval(int(m.group(1)), int(m.group(4)), m.group(2) == '<', m.group(3) == '<')
    m = re.fullmatch(r'x(≥|>|≤|<)(-?\d+)', t)
    if m:
        c = int(m.group(2))
        return {'≥': sp.Interval(c, sp.oo, False, True), '>': sp.Interval.open(c, sp.oo), '≤': sp.Interval(-sp.oo, c, True, False), '<': sp.Interval.open(-sp.oo, c)}[m.group(1)]
    raise ValueError(txt)


@ref('apintch', 'convert the given interval / set-builder condition to a sympy Interval and each option likewise; the keyed option must be the only one equal', 'exhaustive')
def apintch(q):
    p = norm(q['prompt'])
    opts = options(q)
    m = re.search(r'Which inequality describes the set of real numbers (.+)\?$', p)
    if m:
        target = parse_interval(m.group(1))
        return Expect(pick(q, lambda o: set_from_inequality(o) == target))
    m = re.search(r'Which interval is the set \{x ∈ ℝ : (.+)\}\?$', p)
    target = set_from_inequality(m.group(1))
    return Expect(pick(q, lambda o: parse_interval(o) == target))


@ref('apintop', 'sympy Interval Union / Intersection / Complement of the two given intervals, rendered with open/closed ends', 'exhaustive')
def apintop(q):
    p = norm(q['prompt'])
    m = re.match(r'A = (.+?) and B = (.+?)\. Write A (∪|∩|−|-) B', p)
    A, B = parse_interval(m.group(1)), parse_interval(m.group(2))
    op = m.group(3)
    S = A.union(B) if op == '∪' else A.intersect(B) if op == '∩' else A - B
    # cross-check by membership on a half-integer grid
    for g in range(-40, 41):
        t = sp.Rational(g, 4)
        inA, inB = t in A, t in B
        want = (inA or inB) if op == '∪' else (inA and inB) if op == '∩' else (inA and not inB)
        assert want == (t in S)
    return Expect(iv_text(S))


# ---------------------------------------------------------------- binary operations
def sympify_op(expr, names=('a', 'b')):
    from sympy.parsing.sympy_parser import parse_expr, standard_transformations, implicit_multiplication_application, split_symbols
    tr = standard_transformations + (split_symbols, implicit_multiplication_application)
    a, b = sp.symbols('a b')
    e = norm(expr).replace('^', '**')
    return parse_expr(e, transformations=tr, local_dict={'a': a, 'b': b}), a, b


@ref('aqbinid', 'solve a*e = a identically in a (coefficients of the polynomial identity), check e*a = a, then solve c*d = e and check d*c = e and that d lies in the stated domain', 'exhaustive')
def aqbinid(q):
    p = norm(q['prompt'])
    m = re.search(r'On (.+?), the binary operation ∗ is defined by a ∗ b = (.+?)\. Find (the identity element|the inverse of (-?\d+))', p)
    dom, expr = m.group(1), m.group(2)
    f, a, b = sympify_op(expr)
    op = lambda u, v: f.subs({a: u, b: v}, simultaneous=True)
    e = sp.symbols('e')
    num_ = sp.numer(sp.together(op(a, e) - a))
    sols = sp.solve(sp.Poly(sp.expand(num_), a).coeffs(), e, dict=True)
    assert len(sols) == 1
    ident = sols[0][e]
    assert sp.simplify(op(ident, a) - a) == 0
    excl = re.search(r'ℚ − \{(.+?)\}', dom)
    if m.group(4) is None:
        return Expect(str(ident))
    c = sp.Rational(m.group(4))
    d = sp.symbols('d')
    s = sp.solve(sp.Eq(op(c, d), ident), d)
    assert len(s) == 1
    inv = s[0]
    assert sp.simplify(op(inv, c) - ident) == 0
    if dom == 'ℤ' and not inv.is_integer:
        return Ambiguous('inverse not in ℤ')
    if excl and inv == sp.Rational(excl.group(1)):
        return Ambiguous('inverse outside domain')
    return Expect(str(inv))


def comm_assoc_text(comm, assoc):
    return {(True, True): 'commutative and associative', (True, False): 'commutative but not associative',
            (False, True): 'associative but not commutative', (False, False): 'neither commutative nor associative'}[(comm, assoc)]


def option_is(text):
    return lambda o: o == text


@ref('aqbinp', 'symbolic identity test (expand a*b - b*a, (a*b)*c - a*(b*c)) for polynomial ops; for max/min/|.| exhaustive search over a rational grid for a counterexample plus case analysis noted', 'exhaustive')
def aqbinp(q):
    p = norm(q['prompt'])
    expr = re.search(r'a ∗ b = (.+?)\. Which is true', p).group(1)
    a, b, c = sp.symbols('a b c')
    e = expr.replace('{', '(').replace('}', ')')
    e = re.sub(r'\bmax\b', 'Max', e); e = re.sub(r'\bmin\b', 'Min', e)
    e = re.sub(r'\|([^|]+)\|', r'Abs(\1)', e)
    f, _, _ = sympify_op(e)
    op = lambda u, v: f.subs({sp.Symbol('a'): u, sp.Symbol('b'): v}, simultaneous=True)
    grid = [sp.Rational(n, 2) for n in range(-12, 13)]
    if f.has(sp.Max, sp.Min, sp.Abs):
        comm = all(op(u, v) == op(v, u) for u in grid for v in grid)
        assoc = all(op(op(u, v), w) == op(u, op(v, w)) for u in grid for v in grid for w in grid[::2])
    else:
        comm = sp.expand(op(a, b) - op(b, a)) == 0
        assoc = sp.expand(op(op(a, b), c) - op(a, op(b, c))) == 0
        # cross-check on grid
        gc = all(op(u, v) == op(v, u) for u in grid[::3] for v in grid[::3])
        ga = all(op(op(u, v), w) == op(u, op(v, w)) for u in grid[::4] for v in grid[::4] for w in grid[::4])
        assert gc == comm and ga == assoc
    t = comm_assoc_text(comm, assoc)
    return Expect(pick(q, option_is(t)))


@ref('aqbinmod', 'brute force on the finite set (all pairs / triples) for mod-n operations and explicit tables; closure by enumeration; symbolic 2x2 matrices for the matrix operations', 'exhaustive')
def aqbinmod(q):
    p = norm(q['prompt'])
    if 'matrices' in p:
        expr = re.search(r'A ∗ B = (.+?)\. Which', p).group(1)
        A = sp.Matrix(2, 2, sp.symbols('a0:4')); B = sp.Matrix(2, 2, sp.symbols('b0:4')); C = sp.Matrix(2, 2, sp.symbols('c0:4'))
        I2 = sp.eye(2)
        def op(X, Y):
            e = expr.replace('AB', 'X*Y').replace('BA', 'Y*X').replace('A', 'X').replace('B', 'Y')
            return eval(e, {'X': X, 'Y': Y})
        comm = (op(A, B) - op(B, A)).expand() == sp.zeros(2, 2)
        assoc = (op(op(A, B), C) - op(A, op(B, C))).expand() == sp.zeros(2, 2)
        return Expect(pick(q, option_is(comm_assoc_text(comm, assoc))))
    m = re.search(r'the operation ∗ is given by the table in the picture .*?: (row .*?)\. Which is true', p)
    if m:
        els = re.search(r'On S = \{(.+?)\}', p).group(1).split(', ')
        rows = {}
        for r in m.group(1).split('; '):
            nm, vals = r[4:].split(': ')
            rows[nm] = vals.split(', ')
        T = {(x, y): rows[x][j] for x in els for j, y in enumerate(els)}
        comm = all(T[x, y] == T[y, x] for x in els for y in els)
        assoc = all(T[T[x, y], z] == T[x, T[y, z]] for x in els for y in els for z in els)
        fig = q.get('figure')
        if fig:  # the picture must carry the same table
            assert {(r[0], fig['head'][1 + j]): r[1 + j] for r in fig['rows'] for j in range(len(els))} == T
        return Expect(pick(q, option_is(comm_assoc_text(comm, assoc))))
    m = re.search(r'Let S = \{.*?\} and a ∗ b = \((.+?)\) mod (\d+)', p)
    if m:
        n = int(m.group(2))
        lo = int(re.search(r'S = \{(\d+)', p).group(1)); hi = int(re.search(r'(\d+)\}', p.split(' and a')[0]).group(1))
        S = range(lo, hi + 1)
        f, a, b = sympify_op(m.group(1))
        closed = all(int(f.subs({a: u, b: v}) % n) in S for u in S for v in S)
        return Expect(pick(q, (lambda o: o.startswith('Yes')) if closed else (lambda o: o.startswith('No'))))
    m = re.search(r'On S = \{(.+?)\}, a binary operation ∗ is defined by a ∗ b = \((.+?)\) mod (\d+)', p)
    n = int(m.group(3))
    S = list(range(n))
    assert m.group(1) in (', '.join(map(str, S)), ', '.join(map(str, S[:2])) + ', …, ' + str(n - 1))
    f, a, b = sympify_op(m.group(2))
    T = {(u, v): int(f.subs({a: u, b: v})) % n for u in S for v in S}
    comm = all(T[u, v] == T[v, u] for u in S for v in S)
    assoc = all(T[T[u, v], w] == T[u, T[v, w]] for u in S for v in S for w in S)
    return Expect(pick(q, option_is(comm_assoc_text(comm, assoc))))


# ---------------------------------------------------------------- relations
def pairs_of(text):
    return set((int(x), int(y)) for x, y in re.findall(r'\((\d+), (\d+)\)', text))


@ref('aqeqcl', 'minimal equivalence relation containing R via union-find classes (sum of squared class sizes minus |R|); cross-checked by fixed-point closure iteration', 'exhaustive')
def aqeqcl(q):
    p = norm(q['prompt'])
    n = len(re.search(r'On A = \{(.+?)\}', p).group(1).split(', '))
    R = pairs_of(p.split('R = ')[1])
    parent = list(range(n + 1))
    def find(u):
        while parent[u] != u:
            parent[u] = parent[parent[u]]; u = parent[u]
        return u
    for u, v in R:
        parent[find(u)] = find(v)
    sizes = {}
    for u in range(1, n + 1):
        sizes[find(u)] = sizes.get(find(u), 0) + 1
    ans = sum(s * s for s in sizes.values()) - len(R)
    E = set(R)
    while True:
        new = set(E) | {(u, u) for u in range(1, n + 1)} | {(v, u) for u, v in E} | {(u, w) for u, v in E for v2, w in E if v == v2}
        if new == E:
            break
        E = new
    assert len(E) - len(R) == ans
    return Expect(str(ans))


@ref('aqrel', 'test reflexive / symmetric / transitive by direct enumeration over A and its pairs', 'exhaustive')
def aqrel(q):
    p = norm(q['prompt'])
    A = [int(t) for t in re.search(r'On A = \{(.+?)\}', p).group(1).split(', ')]
    R = pairs_of(p.split('R = ')[1])
    refl = all((a, a) in R for a in A)
    sym = all((b, a) in R for a, b in R)
    trans = all((a, d) in R for a, b in R for c, d in R if b == c)
    want = ('' if refl else 'not ') + 'reflexive, ' + ('' if sym else 'not ') + 'symmetric, ' + ('' if trans else 'not ') + 'transitive'
    clean = lambda s: s.replace(' and ', ', ').replace(',,', ',')
    return Expect(pick(q, lambda o: clean(o) == clean(want)))


# ---------------------------------------------------------------- functions
def parse_fn(expr):
    x = sp.Symbol('x', real=True)
    e = norm(expr).replace('²', '**2').replace('³', '**3')
    e = re.sub(r'\|([^|]+)\|', r'Abs(\1)', e)
    from sympy.parsing.sympy_parser import parse_expr, standard_transformations, implicit_multiplication_application
    return parse_expr(e, transformations=standard_transformations + (implicit_multiplication_application,), local_dict={'x': x}), x


@ref('aqonto', 'injectivity by collision search f(y)=f(x0) over a rational grid (ℝ: solveset of f(y)=f(x0), plus sign test of f\' on a grid; ℤ/ℕ: enumeration), surjectivity by sympy function_range (domain ℝ) or window enumeration (domain ℤ/ℕ); ℕ read both as {1,2,..} and {0,1,..} (differing results are Ambiguous)', 'exhaustive')
def aqonto(q):
    from sympy.calculus.util import function_range
    p = norm(q['prompt'])
    m = re.search(r'f: (\S+) → (.+?) is given by f\(x\) = (.+?)\. Which is true', p)
    D, C, expr = m.group(1), m.group(2), m.group(3)
    f, x = parse_fn(expr)
    res = {}
    for nat0 in ((False, True) if 'ℕ' in (D + C) else (False,)):
        if D == 'ℝ':
            collide = False
            for k in range(-12, 13):
                x0 = sp.Rational(k, 2)
                ys = sp.solveset(sp.Eq(f, f.subs(x, x0)), x, sp.S.Reals)
                if ys != sp.FiniteSet(x0):
                    collide = True; break
            if not collide:  # also require f' of one sign on a fine grid (strict monotonicity) when differentiable
                d = sp.diff(f, x)
                vals = [d.subs(x, sp.Rational(k, 3)) for k in range(-60, 61)]
                collide = not (all(v <= 0 for v in vals) or all(v >= 0 for v in vals))
            inj = not collide
            rng = function_range(f, x, sp.S.Reals)
            cod = sp.S.Reals if C == 'ℝ' else parse_interval(C)
            sur = rng == cod
            assert rng.is_subset(cod)
        else:
            dom = list(range(0 if (D == 'ℕ' and nat0) else (1 if D == 'ℕ' else -60), 61))
            img = [f.subs(x, v) for v in dom]
            inj = len(set(img)) == len(img)
            if C == 'ℤ':
                cset = lambda v: v == int(v)
                tgt = range(-30, 31)
            elif C == 'ℕ':
                cset = lambda v: v == int(v) and v >= (0 if nat0 else 1)
                tgt = range(0 if nat0 else 1, 31)
            else:
                raise ValueError(C)
            assert all(cset(v) for v in img)
            imgset = set(img)
            sur = all(t in imgset for t in tgt)
        res[nat0] = (inj, sur)
    if len(set(res.values())) > 1:
        return Ambiguous(f'ℕ read as {{1,2,..}} vs {{0,1,..}} gives different classes {res}')
    inj, sur = res[False]
    t = {(True, True): 'one-one and onto (bijective)', (True, False): 'one-one but not onto', (False, True): 'onto but not one-one', (False, False): 'neither one-one nor onto'}[(inj, sur)]
    return Expect(pick(q, option_is(t)))


# ---------------------------------------------------------------- logic
class Parser:
    def __init__(self, s):
        self.t = re.findall(r'[pqr]|¬|∧|∨|→|↔|\(|\)', norm(s))
        assert ''.join(self.t) == re.sub(r'\s+', '', norm(s)), s
        self.i = 0
    def peek(self):
        return self.t[self.i] if self.i < len(self.t) else None
    def eat(self):
        v = self.t[self.i]; self.i += 1; return v
    def expr(self):
        left = self.unary(); op = None; items = [left]
        while self.peek() in ('∧', '∨', '→', '↔'):
            o = self.eat()
            if op and o != op:
                raise ValueError('mixed operators without parentheses')
            if o in ('→', '↔') and op:
                raise ValueError('chained implication')
            op = o; items.append(self.unary())
        if op is None:
            return left
        return (op,) + tuple(items)
    def unary(self):
        t = self.eat()
        if t == '¬':
            return ('¬', self.unary())
        if t == '(':
            e = self.expr(); assert self.eat() == ')'; return e
        return t


def ev(node, env):
    if isinstance(node, str):
        return env[node]
    op = node[0]
    if op == '¬':
        return not ev(node[1], env)
    vs = [ev(n, env) for n in node[1:]]
    if op == '∧': return all(vs)
    if op == '∨': return any(vs)
    if op == '→': return (not vs[0]) or vs[1]
    if op == '↔': return vs[0] == vs[1]


def parse_formula(s):
    P = Parser(s); e = P.expr(); assert P.i == len(P.t); return e


@ref('atcex', 'search n = 1,2,3,… with sympy.isprime on the evaluated polynomial for the first composite value (n² + bn + c; value 1 would also be non-prime)', 'exhaustive')
def atcex(q):
    p = norm(q['prompt'])
    m = re.search(r'claims: "n² ([+-]) ?(\d*)n? ?([+-]) (\d+) is a prime', p) or re.search(r'"(n² .+?) is a prime', p)
    expr = re.search(r'"(n².+?) is a prime', p).group(1)
    n = sp.Symbol('n')
    from sympy.parsing.sympy_parser import parse_expr, standard_transformations, implicit_multiplication_application
    f = parse_expr(expr.replace('²', '**2'), transformations=standard_transformations + (implicit_multiplication_application,), local_dict={'n': n})
    for k in range(1, 400):
        if not sp.isprime(f.subs(n, k)):
            return Expect(str(k))
    return Unsupported('no counterexample below 400')


@ref('atclass', 'truth table of the parsed formula over all 2^k assignments', 'exhaustive')
def atclass(q):
    f = parse_formula(re.search(r'Is the statement (.+?) a tautology', norm(q['prompt'])).group(1))
    vs = sorted(set(re.findall(r'[pqr]', norm(q['prompt']).split('statement')[1].split('a tautology')[0])))
    rows = [ev(f, dict(zip(vs, bits))) for bits in itertools.product([True, False], repeat=len(vs))]
    t = 'a tautology' if all(rows) else 'a contradiction' if not any(rows) else 'a contingency'
    return Expect(pick(q, option_is(t)))


@ref('atrows', 'truth table of the parsed formula over the 8 assignments; count true rows', 'exhaustive')
def atrows(q):
    f = parse_formula(re.search(r'truth table of (.+?) are true', norm(q['prompt'])).group(1))
    return Expect(str(sum(ev(f, dict(zip('pqr', bits))) for bits in itertools.product([True, False], repeat=3))))


FIXED = {'Chennai is the capital of Tamil Nadu.': True, 'Every square is a rectangle.': True, 'Close the door.': False,
         'How many sides does a hexagon have?': False, 'What a beautiful kolam!': False, 'Please solve this equation.': False}


def is_statement(s):
    """my own judgement: a statement is a declarative sentence that is definitely true or definitely false"""
    if s in FIXED:
        return FIXED[s]
    if re.fullmatch(r'\d+ is (a multiple of 3|a prime number|an even number)\.', s):
        return True
    if re.fullmatch(r'\d+ \+ \d+ = \d+\.', s):
        return True
    if re.fullmatch(r'x \+ \d+ = \d+\.', s) or re.fullmatch(r'y is greater than \d+\.', s):
        return False  # open sentence: truth depends on the unspecified value of the variable
    if re.fullmatch(r'Is \d+ a multiple of 3\?', s):
        return False  # question
    raise KeyError(s)


@ref('atstmt', 'truth-table column by enumeration for column questions; for "statement" questions each sentence is classified by hand (see refNotes): declarative with a definite truth value (true or false) vs question, command, exclamation, open sentence', 'exhaustive')
def atstmt(q):
    p = norm(q['prompt'])
    m = re.search(r'Which column gives the truth values of (.+?) in the rows', p)
    if m:
        f = parse_formula(m.group(1))
        col = ', '.join('T' if ev(f, {'p': a, 'q': b}) else 'F' for a, b in [(True, True), (True, False), (False, True), (False, False)])
        return Expect(pick(q, lambda o: o == col))
    neg = 'NOT a statement' in p
    opts = options(q)
    return Expect(pick(q, (lambda o: not is_statement(o)) if neg else is_statement))


@ref('atconv', 'evaluate the statement and its converse over n = 0..3000 (counterexample search); each template is a divisibility / square fact', 'exhaustive')
def atconv(q):
    p = norm(q['prompt'])
    m = re.search(r'"If (.+?), then (.+?)\."', p)
    def pred(s):
        s = s.strip()
        mm = re.fullmatch(r'n is a multiple of both (\d+) and (\d+)', s)
        if mm: return lambda n: n % int(mm.group(1)) == 0 and n % int(mm.group(2)) == 0
        mm = re.fullmatch(r'n is a multiple of (\d+)', s)
        if mm: return lambda n: n % int(mm.group(1)) == 0
        mm = re.fullmatch(r'n² is a multiple of (\d+)', s)
        if mm: return lambda n: (n * n) % int(mm.group(1)) == 0
        mm = re.fullmatch(r'n is even', s)
        if mm: return lambda n: n % 2 == 0
        raise ValueError(s)
    P, Qp = pred(m.group(1)), pred(m.group(2))
    st = all((not P(n)) or Qp(n) for n in range(0, 3001))
    cv = all((not Qp(n)) or P(n) for n in range(0, 3001))
    t = {(True, True): 'The statement and its converse are both true', (True, False): 'The statement is true, but its converse is false',
         (False, True): 'The statement is false, but its converse is true', (False, False): 'The statement and its converse are both false'}[(st, cv)]
    return Expect(pick(q, option_is(t)))
