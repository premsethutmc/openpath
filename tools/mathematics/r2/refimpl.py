"""R2 reference implementation (independent, exact).

Everything here is written from docs/milestones/R2_ACCEPTANCE_SPEC.md only.
Exact arithmetic with fractions.Fraction; own univariate polynomial and
rational-function code.  No external dependencies.

Public surface used by gen_r2_sets.py / check_sets.py:
  parse_eq, State, initial_state, canon, extract_state, apply_op, candidates,
  successors, goal_holds, equivalent, verify_trace, bfs, run_P1..run_P4,
  size_parts, in_scope, classify_limits
See README.md for conventions and resolved ambiguities.
"""
from __future__ import annotations

import itertools
import math
import random
import re
import sys
from collections import deque, namedtuple
from fractions import Fraction as F
from functools import lru_cache

sys.setrecursionlimit(20000)

OPS = ['restrict', 'move-to-left', 'combine-terms', 'cancel-common-factor',
       'clear-denominators', 'expand', 'collect-terms', 'add-sub-both-sides',
       'mul-div-const', 'divide-restricted-factor', 'accept-candidate']
GOALS = ['SOLVE', 'CLEARED', 'REDUCED', 'ONE_FRACTION_ZERO', 'EXPANDED_POLY']
CODES = ['PARSE_ERROR', 'UNSUPPORTED_OPERATOR', 'UNSUPPORTED_EXPRESSION',
         'DOMAIN_UNRESOLVED', 'PROOF_FAILED', 'SEARCH_LIMIT']
MAX_EXP = 64
MAX_COEF = 10 ** 12
MAX_TERMS = 400


class RefError(Exception):
    def __init__(self, code, msg=''):
        super().__init__(f'{code}: {msg}')
        self.code = code
        self.msg = msg


# ----------------------------------------------------------------------------
# univariate polynomials over Q: tuples of Fractions, low -> high, no trailing 0
# ----------------------------------------------------------------------------
def ptrim(p):
    p = list(p)
    while p and p[-1] == 0:
        p.pop()
    return tuple(p)


def padd(a, b):
    n = max(len(a), len(b))
    return ptrim(tuple((a[i] if i < len(a) else 0) + (b[i] if i < len(b) else 0) for i in range(n)))


def pneg(a):
    return tuple(-c for c in a)


def psub(a, b):
    return padd(a, pneg(b))


def pmul(a, b):
    if not a or not b:
        return ()
    out = [F(0)] * (len(a) + len(b) - 1)
    for i, x in enumerate(a):
        if x == 0:
            continue
        for j, y in enumerate(b):
            out[i + j] += x * y
    return ptrim(out)


def pscale(a, c):
    return ptrim(tuple(x * c for x in a))


def ppow(a, k):
    out = (F(1),)
    for _ in range(k):
        out = pmul(out, a)
    return out


def pdeg(p):
    return len(p) - 1


def peval(p, x):
    acc = F(0)
    for c in reversed(p):
        acc = acc * x + c
    return acc


def pdivmod(a, b):
    if not b:
        raise ZeroDivisionError
    a = list(a)
    db = len(b) - 1
    q = [F(0)] * max(len(a) - db, 0)
    lb = b[-1]
    while a and len(a) - 1 >= db:
        coef = a[-1] / lb
        k = len(a) - 1 - db
        q[k] = coef
        for i, bc in enumerate(b):
            a[i + k] -= coef * bc
        a.pop()
        while a and a[-1] == 0:
            a.pop()
    return ptrim(q), ptrim(a)


def pdivexact(a, b):
    q, r = pdivmod(a, b)
    assert not r, 'inexact division'
    return q


def pmonic(p):
    return tuple(c / p[-1] for c in p) if p else p


@lru_cache(maxsize=None)
def pgcd(a, b):
    while b:
        a, b = b, pdivmod(a, b)[1]
    return pmonic(a)


def prim(p):
    """p = c * q, q integer coefficients, gcd 1, positive leading coefficient."""
    d = 1
    for c in p:
        d = d * c.denominator // math.gcd(d, c.denominator)
    ints = [int(c * d) for c in p]
    g = 0
    for i in ints:
        g = math.gcd(g, abs(i))
    sign = 1 if ints[-1] > 0 else -1
    q = tuple(F(i, g * sign) for i in ints)
    return F(g * sign, d), q


def _divisors(n):
    n = abs(n)
    if n > MAX_COEF:
        raise RefError('UNSUPPORTED_EXPRESSION', 'coefficient too large for exact root search')
    out = set()
    i = 1
    while i * i <= n:
        if n % i == 0:
            out.add(i)
            out.add(n // i)
        i += 1
    return sorted(out)


@lru_cache(maxsize=None)
def _find_root(q):
    """q monic, degree >= 2, nonzero constant term. a rational root or None."""
    c, ip = prim(q)
    a0, an = int(ip[0]), int(ip[-1])
    for num in _divisors(a0):
        for den in _divisors(an):
            for s in (1, -1):
                r = F(s * num, den)
                if peval(q, r) == 0:
                    return r
    return None


@lru_cache(maxsize=None)
def split_linear(p):
    """p != 0.  p = lead * prod (x-r)^m * rem, rem monic without rational roots.
    returns (lead, ((r, m), ...) sorted by r, rem)"""
    lead = p[-1]
    q = pmonic(p)
    roots = {}
    while len(q) > 1 and q[0] == 0:
        roots[F(0)] = roots.get(F(0), 0) + 1
        q = q[1:]
    while len(q) > 1:
        if len(q) == 2:
            r = -q[0]
        else:
            r = _find_root(q)
        if r is None:
            break
        roots[r] = roots.get(r, 0) + 1
        q = pdivexact(q, (-r, F(1)))
        while len(q) > 1 and q[0] == 0:
            roots[F(0)] = roots.get(F(0), 0) + 1
            q = q[1:]
    return lead, tuple(sorted(roots.items())), q


# ----------------------------------------------------------------------------
# AST: ('n',F) ('x',) ('neg',a) ('+',a,b) ('-',a,b) ('*',a,b) ('/',a,b) ('^',a,int)
# ----------------------------------------------------------------------------
X = ('x',)
ZERO = ('n', F(0))


def N(c):
    return ('n', F(c))


def mk_prod(parts):
    acc = parts[0]
    for p in parts[1:]:
        acc = ('*', acc, p)
    return acc


def build_sum(sterms):
    if not sterms:
        return ZERO
    s0, t0 = sterms[0]
    acc = t0 if s0 > 0 else ('neg', t0)
    for s, t in sterms[1:]:
        acc = ('+' if s > 0 else '-', acc, t)
    return acc


def terms_of(t):
    k = t[0]
    if k == '+':
        return terms_of(t[1]) + [(1, t[2])]
    if k == '-':
        return terms_of(t[1]) + [(-1, t[2])]
    if k == 'neg':
        return [(-1, t[1])]
    return [(1, t)]


# ---- printing ---------------------------------------------------------------
def _dec_digits(f):
    d = f.denominator
    a = b = 0
    while d % 2 == 0:
        d //= 2
        a += 1
    while d % 5 == 0:
        d //= 5
        b += 1
    if d != 1:
        return None
    return max(a, b)


def _num_str(f):
    if f.denominator == 1:
        return str(f.numerator)
    nd = _dec_digits(f)
    if nd is not None and nd <= 4:
        scaled = f * 10 ** nd
        s = str(int(scaled)).rjust(nd + 1, '0')
        out = s[:-nd] + '.' + s[-nd:]
        return out.rstrip('0').rstrip('.')
    return f'{f.numerator}/{f.denominator}'


def prec(t):
    k = t[0]
    if k in '+-':
        return 1
    if k in '*/':
        return 2
    if k == 'neg':
        return 3
    if k == '^':
        return 4
    if k == 'n':
        f = t[1]
        if f < 0:
            return 1
        if f.denominator != 1:
            nd = _dec_digits(f)
            return 5 if (nd is not None and nd <= 4) else 2
        return 5
    return 5


@lru_cache(maxsize=None)
def pr(t, minp=0):
    k = t[0]
    if k == 'n':
        f = t[1]
        s = _num_str(abs(f)) if f < 0 else _num_str(f)
        s = ('-' + s) if f < 0 else s
    elif k == 'x':
        s = 'x'
    elif k == 'neg':
        c = t[1]
        s = '-' + pr(c, 2 if prec(c) == 2 else 3)
    elif k == '+':
        s = pr(t[1], 1) + ' + ' + pr(t[2], 2)
    elif k == '-':
        s = pr(t[1], 1) + ' - ' + pr(t[2], 2)
    elif k == '*':
        s = pr(t[1], 2) + '*' + pr(t[2], 4)
    elif k == '/':
        s = pr(t[1], 2) + '/' + pr(t[2], 4)
    elif k == '^':
        e = t[2]
        s = pr(t[1], 5) + '^' + (str(e) if e >= 0 else f'({e})')
    else:
        raise ValueError(t)
    return '(' + s + ')' if prec(t) < minp else s


def eq_text(L, R):
    return pr(L) + ' = ' + pr(R)


# ---- parsing ----------------------------------------------------------------
FUNCS = {'sqrt', 'abs', 'sin', 'cos', 'tan', 'log', 'ln', 'exp', 'floor', 'ceil', 'max', 'min', 'mod',
         'sec', 'csc', 'cot', 'arcsin', 'arccos', 'arctan', 'sinh', 'cosh', 'tanh'}
UNSUP_CH = set('!%<>|&~√∑∫≤≥≠')


_TOK = re.compile(r'\s+|(\d+\.\d*|\.\d+|\d+)|([A-Za-z]+)|(\*\*|[<>!=]=)|(.)', re.S)


def tokenize(s):
    if len(s) > 4000:
        raise RefError('UNSUPPORTED_EXPRESSION', 'input too long')
    toks = []
    n = len(s)
    for m in _TOK.finditer(s):
        num, ident, two, ch = m.groups()
        if num is not None:
            if num.endswith('.'):
                raise RefError('PARSE_ERROR', 'malformed number ' + num)
            toks.append(('num', num))
        elif ident is not None:
            if ident == 'x':
                toks.append(('x', 'x'))
                continue
            k = m.end()
            while k < n and s[k].isspace():
                k += 1
            if ident.lower() in FUNCS or (k < n and s[k] == '('):
                raise RefError('UNSUPPORTED_OPERATOR', 'function ' + ident)
            raise RefError('UNSUPPORTED_EXPRESSION', 'unknown symbol ' + ident)
        elif two is not None:
            raise RefError('UNSUPPORTED_OPERATOR', two)
        elif ch is not None:
            if ch in '+-*/^()=':
                toks.append(('op', ch))
            elif ch in UNSUP_CH:
                raise RefError('UNSUPPORTED_OPERATOR', ch)
            elif ch.isalpha():
                raise RefError('UNSUPPORTED_EXPRESSION', 'unknown symbol ' + ch)
            else:
                raise RefError('PARSE_ERROR', 'unexpected character ' + repr(ch))
    return toks


class _P:
    def __init__(self, toks):
        self.t = toks
        self.i = 0
        self.depth = 0

    def peek(self):
        return self.t[self.i] if self.i < len(self.t) else (None, None)

    def eat(self):
        tok = self.t[self.i]
        self.i += 1
        return tok

    def expr(self):
        a = self.term()
        t = self.t
        while self.i < len(t) and t[self.i][0] == 'op' and t[self.i][1] in '+-':
            op = t[self.i][1]
            self.i += 1
            a = (op, a, self.term())
        return a

    def term(self):
        a = self.unary()
        t = self.t
        while self.i < len(t) and t[self.i][0] == 'op' and t[self.i][1] in '*/':
            op = t[self.i][1]
            self.i += 1
            a = (op, a, self.unary())
        return a

    def unary(self):
        tk = self.peek()
        if tk == ('op', '-') or tk == ('op', '+'):
            self.depth += 1
            if self.depth > 120:
                raise RefError('UNSUPPORTED_EXPRESSION', 'nesting too deep')
            self.i += 1
            r = self.unary()
            self.depth -= 1
            return ('neg', r) if tk[1] == '-' else r
        a = self.atom()
        if self.i < len(self.t) and self.t[self.i] == ('op', '^'):
            self.i += 1
            e = self.unary()
            if 'x' in _flat(e):
                raise RefError('UNSUPPORTED_EXPRESSION', 'variable exponent')
            N_, D_ = rf(e)
            if len(N_) > 1 or len(D_) > 1:
                raise RefError('UNSUPPORTED_EXPRESSION', 'exponent')
            v = (N_[0] if N_ else F(0)) / D_[0]
            if v.denominator != 1:
                raise RefError('UNSUPPORTED_EXPRESSION', 'non-integer exponent')
            if abs(v) > MAX_EXP:
                raise RefError('UNSUPPORTED_EXPRESSION', 'exponent too large')
            return ('^', a, int(v))
        return a

    def atom(self):
        tk = self.peek()
        if tk[0] == 'num':
            self.i += 1
            return ('n', F(tk[1]))
        if tk[0] == 'x':
            self.i += 1
            return X
        if tk == ('op', '('):
            self.i += 1
            self.depth += 1
            if self.depth > 120:
                raise RefError('UNSUPPORTED_EXPRESSION', 'nesting too deep')
            e = self.expr()
            self.depth -= 1
            if self.peek() != ('op', ')'):
                raise RefError('PARSE_ERROR', 'missing )')
            self.i += 1
            return e
        raise RefError('PARSE_ERROR', 'unexpected ' + str(tk[1]))


@lru_cache(maxsize=None)
def _flat(t):
    """set of node kinds in tree (for x detection)."""
    k = t[0]
    if k == 'n':
        return frozenset()
    if k == 'x':
        return frozenset('x')
    if k == 'neg':
        return _flat(t[1])
    if k == '^':
        return _flat(t[1])
    return _flat(t[1]) | _flat(t[2])


def x_free(t):
    return 'x' not in _flat(t)


@lru_cache(maxsize=4096)
def parse_eq(text):
    try:
        toks = tokenize(text)
        if len(toks) > 1500:
            raise RefError('UNSUPPORTED_EXPRESSION', 'too many tokens')
        eqs = [i for i, t in enumerate(toks) if t == ('op', '=')]
        if len(eqs) != 1:
            raise RefError('PARSE_ERROR', 'need exactly one =')
        sides = []
        for part in (toks[:eqs[0]], toks[eqs[0] + 1:]):
            if not part:
                raise RefError('PARSE_ERROR', 'empty side')
            p = _P(part)
            e = p.expr()
            if p.i != len(part):
                raise RefError('PARSE_ERROR', 'trailing tokens')
            sides.append(e)
        return sides[0], sides[1]
    except RecursionError:
        raise RefError('UNSUPPORTED_EXPRESSION', 'nesting too deep')


@lru_cache(maxsize=4096)
def parse_expr(text):
    toks = tokenize(text)
    if not toks:
        raise RefError('PARSE_ERROR', 'empty')
    p = _P(toks)
    e = p.expr()
    if p.i != len(toks):
        raise RefError('PARSE_ERROR', 'trailing tokens')
    return e


# ----------------------------------------------------------------------------
# rational functions
# ----------------------------------------------------------------------------
def _red(Np, Dp):
    if not Np:
        return ((), (F(1),))
    g = pgcd(Np, Dp)
    if len(g) > 1:
        Np = pdivexact(Np, g)
        Dp = pdivexact(Dp, g)
    l = Dp[-1]
    if l != 1:
        Np = tuple(c / l for c in Np)
        Dp = tuple(c / l for c in Dp)
    return (Np, Dp)


@lru_cache(maxsize=None)
def rf(t):
    k = t[0]
    if k == 'n':
        return ((t[1],) if t[1] != 0 else (), (F(1),))
    if k == 'x':
        return ((F(0), F(1)), (F(1),))
    if k == 'neg':
        a = rf(t[1])
        return (pneg(a[0]), a[1])
    if k in '+-':
        a, b = rf(t[1]), rf(t[2])
        bn = b[0] if k == '+' else pneg(b[0])
        return _red(padd(pmul(a[0], b[1]), pmul(bn, a[1])), pmul(a[1], b[1]))
    if k == '*':
        a, b = rf(t[1]), rf(t[2])
        return _red(pmul(a[0], b[0]), pmul(a[1], b[1]))
    if k == '/':
        a, b = rf(t[1]), rf(t[2])
        if not b[0]:
            raise RefError('DOMAIN_UNRESOLVED', 'division by identically zero')
        return _red(pmul(a[0], b[1]), pmul(a[1], b[0]))
    if k == '^':
        a = rf(t[1])
        e = t[2]
        if e == 0:
            if not a[0]:
                raise RefError('DOMAIN_UNRESOLVED', '0^0')
            return ((F(1),), (F(1),))
        if e > 0:
            return (ppow(a[0], e), ppow(a[1], e))
        if not a[0]:
            raise RefError('DOMAIN_UNRESOLVED', 'zero to a negative power')
        return _red(ppow(a[1], -e), ppow(a[0], -e))
    raise ValueError(t)


def const_val(t):
    n, d = rf(t)
    if len(n) > 1 or len(d) > 1:
        return None
    return (n[0] if n else F(0)) / d[0]


def poly_of(t):
    n, d = rf(t)
    assert d == (F(1),), 'not a polynomial'
    return n


@lru_cache(maxsize=None)
def has_xden(t):
    k = t[0]
    if k in 'nx':
        return False
    if k == 'neg':
        return has_xden(t[1])
    if k == '^':
        return (t[2] < 0 and not x_free(t[1])) or has_xden(t[1])
    if k == '/':
        return (not x_free(t[2])) or has_xden(t[1]) or has_xden(t[2])
    return has_xden(t[1]) or has_xden(t[2])


def _zeros(d):
    n, _ = rf(d)
    if not n:
        raise RefError('DOMAIN_UNRESOLVED', 'denominator identically zero')
    if len(n) == 1:
        return frozenset()
    lead, roots, rem = split_linear(n)
    if len(rem) > 1:
        if len(rem) == 3 and rem[1] ** 2 - 4 * rem[2] * rem[0] < 0:
            pass
        else:
            raise RefError('DOMAIN_UNRESOLVED', 'denominator roots not rational')
    return frozenset(r for r, m in roots)


@lru_cache(maxsize=None)
def extract(t):
    """Restrictions (values of x) from the WRITTEN expression."""
    k = t[0]
    if k in 'nx':
        return frozenset()
    if k == 'neg':
        return extract(t[1])
    if k in '+-*':
        return extract(t[1]) | extract(t[2])
    if k == '/':
        return extract(t[1]) | extract(t[2]) | _zeros(t[2])
    if k == '^':
        out = extract(t[1])
        if t[2] <= 0:
            out = out | _zeros(t[1])
        return out
    raise ValueError(t)


# ----------------------------------------------------------------------------
# state
# ----------------------------------------------------------------------------
State = namedtuple('State', 'eq restr')


def initial_state(text):
    return State(text, ())


@lru_cache(maxsize=None)
def canon(eq):
    L, R = parse_eq(eq)
    return eq_text(L, R)


def key(st):
    return (canon(st.eq), st.restr)


def extract_state(st):
    L, R = parse_eq(st.eq)
    return extract(L) | extract(R)


def known(st):
    return set(st.restr) | extract_state(st)


def fmt_state(st):
    return canon(st.eq) + '  | restr=' + ','.join(str(r) for r in st.restr)


def _grow(st, newtext):
    Ln, Rn = parse_eq(newtext)
    s = known(st) | extract(Ln) | extract(Rn)
    return tuple(sorted(s))


def _ret(st, L, R):
    text = eq_text(L, R)
    return State(text, _grow(st, text))


# ----------------------------------------------------------------------------
# term views:  term = coef * prod nf^e / prod df^e   (nf, df: denominator-free trees)
# ----------------------------------------------------------------------------
@lru_cache(maxsize=None)
def view(t):
    if x_free(t):
        v = const_val(t)
        return (v, (), ())
    k = t[0]
    if k == 'x':
        return (F(1), ((t, 1),), ())
    if k == 'neg':
        v = view(t[1])
        return None if v is None else (-v[0], v[1], v[2])
    if k == '*':
        a, b = view(t[1]), view(t[2])
        if a is None or b is None:
            return None
        return (a[0] * b[0], a[1] + b[1], a[2] + b[2])
    if k == '/':
        a, b = view(t[1]), view(t[2])
        if a is None or b is None:
            return None
        if b[0] == 0:
            raise RefError('DOMAIN_UNRESOLVED', 'division by zero')
        return (a[0] / b[0], a[1] + b[2], a[2] + b[1])
    if k == '^':
        base, e = t[1], t[2]
        if e == 0:
            return (F(1), (), ())
        if base[0] in '+-':
            if has_xden(base):
                return None
            return (F(1), ((base, e),), ()) if e > 0 else (F(1), (), ((base, -e),))
        v = view(base)
        if v is None:
            return None
        if e > 0:
            return (v[0] ** e, tuple((f, x * e) for f, x in v[1]), tuple((f, x * e) for f, x in v[2]))
        return (v[0] ** e if v[0] != 0 else None, tuple((f, x * -e) for f, x in v[2]),
                tuple((f, x * -e) for f, x in v[1]))
    if k in '+-':
        if has_xden(t):
            return None
        return (F(1), ((t, 1),), ())
    raise ValueError(t)


def sign_of(f):
    return -1 if f < 0 else 1


def mono_tree(c, k):
    c = abs(c)
    xk = X if k == 1 else ('^', X, k)
    if k == 0:
        return N(c)
    return xk if c == 1 else ('*', N(c), xk)


def poly_tree(p):
    st = []
    for k in range(len(p) - 1, -1, -1):
        if p[k] != 0:
            st.append((sign_of(p[k]), mono_tree(p[k], k)))
    return build_sum(st)


def mk_term(coef, nf, df):
    """-> (sign, tree) for coef * prod nf / prod df."""
    s = sign_of(coef)
    a = abs(coef)
    parts = []
    if a != 1 or not nf:
        parts.append(N(a))
    for f, e in nf:
        parts.append(f if e == 1 else ('^', f, e))
    num = mk_prod(parts)
    if df:
        dp = [f if e == 1 else ('^', f, e) for f, e in df]
        return s, ('/', num, mk_prod(dp))
    return s, num


def D_poly(df):
    out = (F(1),)
    for f, e in df:
        out = pmul(out, ppow(poly_of(f), e))
    return out


def N_poly(coef, nf):
    out = (coef,) if coef != 0 else ()
    for f, e in nf:
        out = pmul(out, ppow(poly_of(f), e))
    return out


def lin_factors(p):
    """p != 0 poly -> (const, [(tree, exp)]) with p = const * prod tree^exp (linear brackets, primitive)."""
    lead, roots, rem = split_linear(p)
    c = lead
    facs = []
    for r, m in roots:
        q, pn = r.denominator, r.numerator
        br = poly_tree((F(-pn), F(q)))
        c /= F(q) ** m
        facs.append((br, m))
    if len(rem) > 1:
        cc, qq = prim(rem)
        c *= cc
        facs.append((poly_tree(qq), 1))
    return c, facs


def plcm(a, b):
    g = pgcd(a, b)
    return pmonic(pmul(a, pdivexact(b, g)))


# ----------------------------------------------------------------------------
# atomic monomials and expansion machinery
# ----------------------------------------------------------------------------
def mono_of(t):
    k = t[0]
    if k == 'n':
        return (t[1], 0)
    if k == 'x':
        return (F(1), 1)
    if k == 'neg':
        m = mono_of(t[1])
        return None if m is None else (-m[0], m[1])
    if k == '*':
        a, b = mono_of(t[1]), mono_of(t[2])
        if a is None or b is None:
            return None
        return (a[0] * b[0], a[1] + b[1])
    if k == '/':
        if not x_free(t[2]):
            return None
        v = const_val(t[2])
        a = mono_of(t[1])
        if a is None or not v:
            return None
        return (a[0] / v, a[1])
    if k == '^':
        a = mono_of(t[1])
        if a is None:
            return None
        e = t[2]
        if e >= 0:
            return (a[0] ** e, a[1] * e)
        if a[1] == 0 and a[0] != 0:
            return (a[0] ** e, 0)
        return None
    return None


class _Unsup(Exception):
    pass


def _et(t):
    """-> list of (monos [(F,int)], dens ((tree,exp),...)); raises _Unsup."""
    if x_free(t):
        return [([(const_val(t), 0)], ())]
    k = t[0]
    if k == 'x':
        return [([(F(1), 1)], ())]
    if k == 'neg':
        return [([(-c, e) for c, e in m], d) for m, d in _et(t[1])]
    if k == '+':
        return _et(t[1]) + _et(t[2])
    if k == '-':
        return _et(t[1]) + [([(-c, e) for c, e in m], d) for m, d in _et(t[2])]
    if k == '*':
        return _et_mul(_et(t[1]), _et(t[2]))
    if k == '/':
        A = _et(t[1])
        b = t[2]
        v = view(b)
        if v is None or v[2]:
            raise _Unsup
        if x_free(b):
            raise _Unsup
        out = []
        for m, d in A:
            out.append(([(c / v[0], e) for c, e in m], d + v[1]))
        return out
    if k == '^':
        base, e = t[1], t[2]
        if e == 0:
            return [([(F(1), 0)], ())]
        if e > 0:
            B = _et(base)
            acc = B
            for _ in range(e - 1):
                acc = _et_mul(acc, B)
            return acc
        v = view(base)
        if v is None or v[2]:
            raise _Unsup
        return [([(F(1) / (v[0] ** -e), 0)], tuple((f, x * -e) for f, x in v[1]))]
    raise _Unsup


def _et_mul(A, B):
    out = []
    for m1, d1 in A:
        for m2, d2 in B:
            ms = [(c1 * c2, e1 + e2) for c1, e1 in m1 for c2, e2 in m2]
            if len(ms) > MAX_TERMS:
                raise _Unsup
            out.append((ms, d1 + d2))
    if len(out) > MAX_TERMS:
        raise _Unsup
    return out


def et_terms(t):
    """expanded term list for one top-level term; terms sharing the same denominator
    factors (non-empty) are grouped into one quotient with a summed numerator."""
    try:
        raw = _et(t)
    except _Unsup:
        return None
    out = []
    idx = {}
    for monos, dens in raw:
        if dens:
            if dens in idx:
                out[idx[dens]][0].extend(monos)
                continue
            idx[dens] = len(out)
            out.append((list(monos), dens))
        else:
            out.append((list(monos), dens))
    return out


def needs_expand(t, top=True):
    k = t[0]
    if k in 'nx':
        return False
    if k == 'neg':
        return t[1][0] in '+-' or needs_expand(t[1], False)
    if k in '+-':
        right_group = k in '+-' and t[2][0] in '+-'
        return right_group or needs_expand(t[1], False) or needs_expand(t[2], False)
    if k == '*':
        return any(c[0] in '+-' or (c[0] == 'neg' and c[1][0] in '+-') for c in (t[1], t[2])) \
            or needs_expand(t[1], False) or needs_expand(t[2], False)
    if k == '/':
        if x_free(t[2]):
            return t[1][0] in '+-' or needs_expand(t[1], False)
        return needs_expand(t[1], False)
    if k == '^':
        return (t[2] >= 2 and t[1][0] in '+-') or needs_expand(t[1], False)
    return False


# ----------------------------------------------------------------------------
# operations
# ----------------------------------------------------------------------------
def _sides(st):
    return parse_eq(st.eq)


def op_restrict(st):
    new = _grow(st, st.eq)
    if new == st.restr:
        return None
    return State(st.eq, new)


def op_move_to_left(st):
    L, R = _sides(st)
    if R == ZERO:
        return None
    if L == ZERO:
        return _ret(st, ('neg', R), ZERO)
    return _ret(st, ('-', L, R), ZERO)


def _lcd_of(views):
    lcd = (F(1),)
    for coef, nf, df in views:
        Dm = pmonic(D_poly(df))
        lcd = plcm(lcd, Dm)
    return lcd


def _all_views(terms):
    vs = []
    for s, t in terms:
        v = view(t)
        if v is None:
            return None
        vs.append((v[0] * s, v[1], v[2]))
    return vs


def op_combine(st, side):
    L, R = _sides(st)
    S = L if side == 'L' else R
    terms = terms_of(S)
    if len(terms) < 2:
        return None
    vs = _all_views(terms)
    if vs is None or not any(v[2] for v in vs):
        return None
    lcd = _lcd_of(vs)
    c_lcd, br_l = lin_factors(lcd)
    summands = []
    for coef, nf, df in vs:
        Dp = D_poly(df)
        lt = Dp[-1]
        cof = pdivexact(lcd, pmonic(Dp))
        c_cof, br_c = lin_factors(cof) if len(cof) > 1 else (cof[0], [])
        summands.append(mk_term(coef * c_cof / (lt * c_lcd), nf + tuple(br_c), ()))
    numer = build_sum(summands)
    dparts = [f if e == 1 else ('^', f, e) for f, e in br_l]
    newS = ('/', numer, mk_prod(dparts))
    return _ret(st, newS, R) if side == 'L' else _ret(st, L, newS)


def op_cancel(st, side, idx):
    L, R = _sides(st)
    S = L if side == 'L' else R
    terms = terms_of(S)
    if idx >= len(terms):
        return None
    s, t = terms[idx]
    v = view(t)
    if v is None or not v[2]:
        return None
    coef, nf, df = v
    nfc = [[f, poly_of(f), False] for f, e in nf for _ in range(e)]
    dfc = [[f, poly_of(f), False] for f, e in df for _ in range(e)]
    changed = False
    while True:
        hit = False
        for a in nfc:
            for b in dfc:
                if len(a[1]) < 2 or len(b[1]) < 2:
                    continue
                g = pgcd(a[1], b[1])
                if len(g) > 1:
                    qa = pdivexact(a[1], g)
                    qb = pdivexact(b[1], g)
                    a[1], a[2] = qa, True
                    b[1], b[2] = qb, True
                    hit = changed = True
                    break
            if hit:
                break
        if not hit:
            break
    if not changed:
        return None
    coef = coef
    new_nf, new_df = [], []

    def emit(copies, out, inv):
        nonlocal coef
        last = None
        for f, p, mod in copies:
            if not mod:
                if out and out[-1][0] == f:
                    out[-1] = (f, out[-1][1] + 1)
                else:
                    out.append((f, 1))
                continue
            if len(p) == 1:
                coef = coef / p[0] if inv else coef * p[0]
                continue
            c, facs = lin_factors(p)
            coef = coef / c if inv else coef * c
            out.extend(facs)

    emit(nfc, new_nf, False)
    emit(dfc, new_df, True)
    ns, nt = mk_term(coef * s, tuple(new_nf), tuple(new_df))
    terms = list(terms)
    terms[idx] = (ns, nt)
    newS = build_sum(terms)
    return _ret(st, newS, R) if side == 'L' else _ret(st, L, newS)


def op_clear(st):
    L, R = _sides(st)
    tl, tr = terms_of(L), terms_of(R)
    vl, vr = _all_views(tl), _all_views(tr)
    if vl is None or vr is None:
        return None
    allv = vl + vr
    if not any(v[2] for v in allv):
        return None
    lcd = _lcd_of(allv)
    if len(lcd) < 2:
        return None
    c_lcd, br_l = lin_factors(lcd)

    def side(vs):
        out = []
        for coef, nf, df in vs:
            Dp = D_poly(df)
            lt = Dp[-1]
            cof = pdivexact(lcd, pmonic(Dp))
            c_cof, br_c = lin_factors(cof) if len(cof) > 1 else (cof[0], [])
            out.append(mk_term(coef * c_cof / lt, nf + tuple(br_c), ()))
        return build_sum(out)

    return _ret(st, side(vl), side(vr))


def op_expand(st):
    L, R = _sides(st)
    if not (needs_expand(L) or needs_expand(R)):
        return None

    def side(S):
        out = []
        for s, t in terms_of(S):
            ets = et_terms(t if s > 0 else ('neg', t))
            if ets is None:
                raise _Unsup
            for monos, dens in ets:
                monos = [(c, e) for c, e in monos if c != 0]
                if not monos:
                    continue
                if not dens:
                    for c, e in monos:
                        out.append((sign_of(c), mono_tree(c, e)))
                else:
                    dparts = [f if x == 1 else ('^', f, x) for f, x in dens]
                    den = mk_prod(dparts)
                    if len(monos) == 1:
                        c, e = monos[0]
                        out.append((sign_of(c), ('/', mono_tree(c, e), den)))
                    else:
                        num = build_sum([(sign_of(c), mono_tree(c, e)) for c, e in monos])
                        out.append((1, ('/', num, den)))
        return build_sum(out)

    try:
        nl, nr = side(L), side(R)
    except _Unsup:
        return None
    if nl == L and nr == R:
        return None
    return _ret(st, nl, nr)


def _collect_side(S):
    terms = terms_of(S)
    atoms = {}
    rest = []
    reduced = False
    for s, t in terms:
        m = mono_of(t)
        if m is not None:
            c, k = m
            if k in atoms:
                reduced = True
            atoms[k] = atoms.get(k, F(0)) + s * c
            if c == 0:
                reduced = True
            continue
        v = view(t)
        if v is not None and v[2] and len(v[1]) == 1 and v[1][0][1] == 1 and v[1][0][0][0] in '+-':
            numer = v[1][0][0]
            nts = terms_of(numer)
            ms = [mono_of(u) for _, u in nts]
            if all(m is not None for m in ms):
                acc = {}
                for (ss, _u), (c, k) in zip(nts, ms):
                    acc[k] = acc.get(k, F(0)) + ss * c
                if len(acc) < len(nts) or any(c == 0 for c in acc.values()):
                    keep = [(k, c) for k, c in sorted(acc.items(), reverse=True) if c != 0]
                    reduced = True
                    if not keep:
                        continue
                    if len(keep) == 1:
                        k, c = keep[0]
                        nfs = ((X, k),) if k > 0 else ()
                        ns, nt = mk_term(v[0] * s * c, nfs, v[2])
                    else:
                        nn = build_sum([(sign_of(c), mono_tree(c, k)) for k, c in keep])
                        ns, nt = mk_term(v[0] * s, ((nn, 1),), v[2])
                    rest.append((ns, nt))
                    continue
        rest.append((s, t))
    out = []
    for k, c in sorted(atoms.items(), reverse=True):
        if c != 0:
            out.append((sign_of(c), mono_tree(c, k)))
    out.extend(rest)
    return build_sum(out), reduced


def op_collect(st):
    L, R = _sides(st)
    nl, rl = _collect_side(L)
    nr, rr = _collect_side(R)
    if not (rl or rr):
        return None
    return _ret(st, nl, nr)


def op_add_sub(st, term_text):
    try:
        e = parse_expr(term_text)
    except RefError:
        return None
    et_ = terms_of(e)
    if len(et_) != 1:
        return None
    se, te = et_[0]
    if te == ZERO:
        return None
    if not extract(e) <= known(st):
        return None
    L, R = _sides(st)

    def tkey(s, t):
        return pr(t if s > 0 else ('neg', t))

    want = tkey(-se, te)

    def side(S):
        terms = terms_of(S)
        for i, (s, t) in enumerate(terms):
            if tkey(s, t) == want:
                return build_sum(terms[:i] + terms[i + 1:])
        return build_sum(terms + [(se, te)])

    return _ret(st, side(L), side(R))


def op_mul_div(st, cstr):
    c = F(cstr)
    if c == 0 or c == 1:
        return None
    L, R = _sides(st)

    def side(S):
        out = []
        for s, t in terms_of(S):
            v = view(t)
            if v is None:
                out.append((s * sign_of(c), ('*', N(abs(c)), t) if abs(c) != 1 else t))
            else:
                out.append(mk_term(v[0] * s * c, v[1], v[2]))
        return build_sum(out)

    return _ret(st, side(L), side(R))


def op_divide_restricted(st, astr):
    a = F(astr)
    if a not in known(st):
        return None
    L, R = _sides(st)
    if L == ZERO and R == ZERO:
        return None

    def side(S):
        if S == ZERO:
            return S
        v = view(S)
        if v is None:
            return None
        coef, nf, df = v
        nfl = list(nf)
        for i, (f, e) in enumerate(nfl):
            p = poly_of(f)
            if len(p) == 2 and -p[0] / p[1] == a:
                coef = coef * p[1]
                if e == 1:
                    del nfl[i]
                else:
                    nfl[i] = (f, e - 1)
                s, t = mk_term(coef, tuple(nfl), df)
                return t if s > 0 else ('neg', t)
        return None

    nl, nr = side(L), side(R)
    if nl is None or nr is None:
        return None
    return _ret(st, nl, nr)


def divide_factor_structural(st, a):
    """Would dividing both sides by (x-a) be structurally possible, ignoring legality?"""
    tmp = State(st.eq, tuple(sorted(set(st.restr) | {F(a)})))
    return op_divide_restricted(tmp, str(F(a))) is not None


def op_accept(st):
    L, R = _sides(st)
    if L == X and x_free(R):
        c = const_val(R)
    elif R == X and x_free(L):
        c = const_val(L)
    else:
        return None
    if c is None or c not in known(st):
        return None
    return _ret(st, ZERO, N(1))


@lru_cache(maxsize=120000)
def _apply(st, name, ptuple):
    p = dict(ptuple)
    try:
        if name == 'restrict':
            return op_restrict(st)
        if name == 'move-to-left':
            return op_move_to_left(st)
        if name == 'combine-terms':
            return op_combine(st, p['side'])
        if name == 'cancel-common-factor':
            return op_cancel(st, p['side'], int(p['idx']))
        if name == 'clear-denominators':
            return op_clear(st)
        if name == 'expand':
            return op_expand(st)
        if name == 'collect-terms':
            return op_collect(st)
        if name == 'add-sub-both-sides':
            return op_add_sub(st, p['term'])
        if name == 'mul-div-const':
            return op_mul_div(st, p['c'])
        if name == 'divide-restricted-factor':
            return op_divide_restricted(st, p['a'])
        if name == 'accept-candidate':
            return op_accept(st)
    except (RefError, ZeroDivisionError, KeyError, ValueError):
        return None
    raise KeyError(name)


def apply_op(st, name, params=None):
    return _apply(st, name, tuple(sorted((params or {}).items())))


def _fstr(f):
    f = F(f)
    return str(f.numerator) if f.denominator == 1 else f'{f.numerator}/{f.denominator}'


@lru_cache(maxsize=60000)
def _cands(st, name):
    try:
        L, R = _sides(st)
    except RefError:
        return []
    if name in ('restrict', 'move-to-left', 'clear-denominators', 'expand', 'collect-terms', 'accept-candidate'):
        return [{}]
    if name == 'combine-terms':
        return [{'side': 'L'}, {'side': 'R'}]
    if name == 'cancel-common-factor':
        out = []
        for sd, S in (('L', L), ('R', R)):
            for i, (s, t) in enumerate(terms_of(S)):
                if has_xden(t) or not x_free(t):
                    v = None
                    try:
                        v = view(t)
                    except RefError:
                        pass
                    if v is not None and v[2]:
                        out.append({'side': sd, 'idx': i})
        return out
    if name == 'add-sub-both-sides':
        seen, out = set(), []
        for S in (L, R):
            for s, t in terms_of(S):
                if t == ZERO:
                    continue
                txt = pr(t if -s > 0 else ('neg', t))
                if txt not in seen:
                    seen.add(txt)
                    out.append({'term': txt})
        return out
    if name == 'mul-div-const':
        cs = set()
        coefs = []
        for S in (L, R):
            for s, t in terms_of(S):
                try:
                    v = view(t)
                except RefError:
                    v = None
                if v is not None and v[0] != 0:
                    coefs.append(v[0] * s)
        for a in coefs:
            if a != 1:
                cs.add(1 / a)
        if coefs:
            d = 1
            for a in coefs:
                d = d * a.denominator // math.gcd(d, a.denominator)
            if d != 1:
                cs.add(F(d))
            ints = [int(a * d) for a in coefs]
            g = 0
            for i in ints:
                g = math.gcd(g, abs(i))
            if g > 1:
                cs.add(F(d, g))
        cs.add(F(-1))
        cs.discard(F(1))
        return [{'c': _fstr(c)} for c in sorted(cs)]
    if name == 'divide-restricted-factor':
        return [{'a': _fstr(a)} for a in sorted(known(st))]
    raise KeyError(name)


def candidates(st, name):
    return _cands(st, name)


def successors(st, allowed):
    out = []
    for name in OPS:
        if name not in allowed:
            continue
        for p in _cands(st, name):
            ns = apply_op(st, name, p)
            if ns is not None:
                out.append((name, p, ns))
    return out


# ----------------------------------------------------------------------------
# goals
# ----------------------------------------------------------------------------
def _is_monomial_sum(S):
    if S == ZERO:
        return True
    ks = set()
    for s, t in terms_of(S):
        m = mono_of(t)
        if m is None or m[0] == 0 or m[1] in ks:
            return False
        if t[0] in '+-' or not _no_sum(t):
            return False
        ks.add(m[1])
    return True


def _no_sum(t):
    k = t[0]
    if k in 'nx':
        return True
    if k in '+-':
        return False
    if k == 'neg' or k == '^':
        return _no_sum(t[1])
    return _no_sum(t[1]) and _no_sum(t[2])


def _term_reduced(t):
    v = view(t)
    if v is None:
        return None
    coef, nf, df = v
    if not df:
        return True
    Np = N_poly(F(1), nf)
    Dp = D_poly(df)
    return len(pgcd(Np, Dp)) == 1


def _quotient_terms(S):
    """list of terms with x in denominators (written)."""
    return [(s, t) for s, t in terms_of(S) if has_xden(t) or (view(t) is not None and view(t)[2])]


def goal_holds(goal, st, start=None):
    try:
        return _goal(goal, st, start)
    except RefError:
        return False


def _goal(goal, st, start):
    L, R = parse_eq(st.eq)
    if goal == 'SOLVE':
        if L == X and x_free(R):
            c = const_val(R)
            if c is None or c in known(st):
                return False
            if start is not None:
                R0 = extract_state(start)
                if c in R0 or c in start.restr:
                    return False
                sl, sr = parse_eq(start.eq)
                n1, d1 = rf(sl)
                n2, d2 = rf(sr)
                if peval(n1, c) * peval(d2, c) != peval(n2, c) * peval(d1, c):
                    return False
            return True
        if x_free(L) and x_free(R):
            const_val(L), const_val(R)
            return True
        return False
    if goal == 'CLEARED':
        return not has_xden(L) and not has_xden(R)
    if goal == 'EXPANDED_POLY':
        return (not has_xden(L) and not has_xden(R) and R == ZERO and _is_monomial_sum(L))
    if goal == 'ONE_FRACTION_ZERO':
        if R != ZERO:
            return False
        if not has_xden(L):
            return True
        terms = terms_of(L)
        if len(terms) != 1:
            return False
        t = terms[0][1]
        v = view(t)
        if v is None or not v[2]:
            return False
        return bool(_term_reduced(t))
    if goal == 'REDUCED':
        q = 0
        for S in (L, R):
            for s, t in terms_of(S):
                v = view(t)
                if v is None:
                    if has_xden(t):
                        return False
                    continue
                if v[2]:
                    if not _term_reduced(t):
                        return False
                    q += 1
        if start is not None:
            return q == _q_irreducible(start)
        return True
    raise KeyError(goal)


def _q_irreducible(start):
    L, R = parse_eq(start.eq)
    q = 0
    for S in (L, R):
        for s, t in terms_of(S):
            n, d = rf(t)
            if len(d) > 1:
                q += 1
    return q


# ----------------------------------------------------------------------------
# solution sets and equivalence
# ----------------------------------------------------------------------------
def solset(st):
    """(kind, roots, rem) : kind 'all' (identity on domain) or 'fin'."""
    L, R = parse_eq(st.eq)
    n, d = rf(('-', L, R))
    if not n:
        return ('all', frozenset(), ())
    if len(n) == 1:
        return ('fin', frozenset(), ())
    lead, roots, rem = split_linear(n)
    return ('fin', frozenset(r for r, m in roots), rem if len(rem) > 1 else ())


def equivalent(orig, st):
    """Exact equivalence over the ORIGINAL domain.  Returns (ok, reason)."""
    R0 = extract_state(orig)
    if not R0 <= set(st.restr) | extract_state(st):
        return False, 'original restrictions not retained'
    if not R0 <= set(st.restr):
        return False, 'restriction list lost original restrictions'
    kA, rA, remA = solset(orig)
    kB, rB, remB = solset(st)
    exA = set(R0) | set(orig.restr)
    exB = set(st.restr) | extract_state(st) | set(R0)
    if kA != kB:
        return False, f'solution kind differs {kA} vs {kB}'
    if remA != remB:
        return False, 'irrational part differs'
    if kA == 'all':
        if exA != exB:
            return False, 'domains differ'
        return True, ''
    if rA - exA != rB - exB:
        return False, f'solution sets differ {sorted(rA - exA)} vs {sorted(rB - exB)}'
    return True, ''


def sol_description(st):
    kind, roots, rem = solset(st)
    ex = set(st.restr) | extract_state(st)
    if kind == 'all':
        return {'kind': 'all', 'excluded': sorted(_fstr(e) for e in ex)}
    irr = bool(rem) and not (len(rem) == 3 and rem[1] ** 2 - 4 * rem[2] * rem[0] < 0)
    return {'kind': 'finite', 'solutions': sorted(_fstr(r) for r in roots - ex),
            'irrational_part': irr}


def verify_trace(start_text, steps, goal):
    """steps: [{op, params}] -> (ok, report). Independent replay."""
    st = initial_state(start_text)
    orig = st
    R0 = extract_state(orig)
    prev_restr = set()
    for i, s in enumerate(steps):
        new = apply_op(st, s['op'], s.get('params', {}))
        if new is None:
            return False, f'step {i} {s["op"]} illegal/inapplicable at {fmt_state(st)}'
        if not set(st.restr) <= set(new.restr):
            return False, f'step {i}: restrictions shrank'
        if not R0 <= set(new.restr):
            return False, f'step {i}: original restrictions lost'
        ok, why = equivalent(orig, new)
        if not ok:
            return False, f'step {i} {s["op"]}: not equivalent ({why})'
        st = new
    if not goal_holds(goal, st, orig):
        return False, f'goal {goal} not satisfied at end: {fmt_state(st)}'
    return True, fmt_state(st)


# ----------------------------------------------------------------------------
# size measure (P4)
# ----------------------------------------------------------------------------
@lru_cache(maxsize=None)
def size_parts(st):
    L, R = parse_eq(st.eq)
    terms = degree = fractions = 0
    for S in (L, R):
        for s, t in terms_of(S):
            ets = et_terms(t)
            if ets is None:
                terms += 50
                continue
            for monos, dens in ets:
                monos = [(c, e) for c, e in monos if c != 0]
                terms += max(len(monos), 1)
                if monos:
                    degree = max(degree, max(e for c, e in monos))
                dd = 0
                for f, e in dens:
                    p = poly_of(f)
                    terms += sum(1 for c in p if c != 0)
                    dd += (len(p) - 1) * e
                degree = max(degree, dd)
                if dens:
                    fractions += 1
    return (terms, degree, fractions)


def size(st):
    return sum(size_parts(st))


# ----------------------------------------------------------------------------
# scope
# ----------------------------------------------------------------------------
def _walk_dens(t, out):
    k = t[0]
    if k in 'nx':
        return
    if k == 'neg':
        _walk_dens(t[1], out)
    elif k == '^':
        if t[2] < 0 and not x_free(t[1]):
            out.append(t[1])
        _walk_dens(t[1], out)
    else:
        if k == '/' and not x_free(t[2]):
            out.append(t[2])
        _walk_dens(t[1], out)
        _walk_dens(t[2], out)


def in_scope(text):
    """one unknown x, <=3 distinct linear denominator roots (rational), each factor mult <=2,
    reduced numerator degree <= 1."""
    try:
        L, R = parse_eq(text)
        extract(L), extract(R)
        dens = []
        _walk_dens(L, dens)
        _walk_dens(R, dens)
        roots = set()
        for d in dens:
            n, dd = rf(d)
            if len(dd) > 1:
                return False
            lead, rts, rem = split_linear(n)
            if len(rem) > 1:
                return False
            for r, m in rts:
                if m > 2:
                    return False
                roots.add(r)
        if len(roots) > 3:
            return False
        n, _ = rf(('-', L, R))
        return len(n) <= 2
    except RefError:
        return False


# ----------------------------------------------------------------------------
# search
# ----------------------------------------------------------------------------
def bfs(start, allowed, goal, node_cap=20000, depth_cap=12, state_filter=None, orig=None):
    """Uninformed BFS.  Returns dict(found, path, nodes, capped, exhausted, depth)."""
    orig = orig or start
    k0 = key(start)
    if state_filter and not state_filter(start):
        return dict(found=False, path=None, nodes=1, capped=False, exhausted=True, depth=0)
    if goal_holds(goal, start, orig):
        return dict(found=True, path=[], nodes=1, capped=False, exhausted=False, depth=0)
    seen = {k0: None}
    store = {k0: (start, None, None, 0)}
    dq = deque([k0])
    nodes = 1
    while dq:
        k = dq.popleft()
        st, _, _, d = store[k]
        if d >= depth_cap:
            continue
        for name, p, ns in successors(st, allowed):
            kn = key(ns)
            if kn in store:
                continue
            if state_filter and not state_filter(ns):
                continue
            nodes += 1
            store[kn] = (ns, k, (name, p), d + 1)
            if goal_holds(goal, ns, orig):
                path = []
                cur = kn
                while store[cur][1] is not None:
                    path.append({'op': store[cur][2][0], 'params': store[cur][2][1]})
                    cur = store[cur][1]
                path.reverse()
                return dict(found=True, path=path, nodes=nodes, capped=False, exhausted=False, depth=d + 1)
            if nodes >= node_cap:
                return dict(found=False, path=None, nodes=nodes, capped=True, exhausted=False, depth=d + 1)
            dq.append(kn)
    return dict(found=False, path=None, nodes=nodes, capped=False, exhausted=True, depth=0)


def dist_from(st, allowed, goal, orig, node_cap=20000, depth_cap=12):
    r = bfs(st, allowed, goal, node_cap, depth_cap, orig=orig)
    return r


# ----------------------------------------------------------------------------
# baselines
# ----------------------------------------------------------------------------
def _try(st, allowed, name, params=None):
    if name not in allowed:
        return None
    return apply_op(st, name, params or {})


def _xterm_info(S):
    out = []
    for s, t in terms_of(S):
        m = mono_of(t)
        out.append((s, t, None if m is None else (s * m[0], m[1])))
    return out


def linear_delegate(st, allowed, cap=40):
    """The 'delegate linear solving' stage used by P1: deterministic linear solver."""
    trace = []
    for _ in range(cap):
        if goal_holds('SOLVE', st):
            break
        moved = False
        n = _try(st, allowed, 'collect-terms')
        if n is not None:
            trace.append({'op': 'collect-terms', 'params': {}})
            st = n
            continue
        L, R = parse_eq(st.eq)
        for s, t, m in _xterm_info(R):
            if m is not None and m[1] >= 1:
                e = pr(t if -s > 0 else ('neg', t))
                n = _try(st, allowed, 'add-sub-both-sides', {'term': e})
                if n is not None:
                    trace.append({'op': 'add-sub-both-sides', 'params': {'term': e}})
                    st = n
                    moved = True
                    break
        if moved:
            continue
        li = _xterm_info(L)
        has_x = any(m is not None and m[1] >= 1 for _, _, m in li)
        if has_x:
            for s, t, m in li:
                if m is None or m[1] == 0:
                    if t == ZERO:
                        continue
                    e = pr(t if -s > 0 else ('neg', t))
                    n = _try(st, allowed, 'add-sub-both-sides', {'term': e})
                    if n is not None:
                        trace.append({'op': 'add-sub-both-sides', 'params': {'term': e}})
                        st = n
                        moved = True
                        break
            if moved:
                continue
            if len(li) == 1 and li[0][2] is not None and li[0][2][1] == 1 and li[0][2][0] not in (0, 1):
                c = _fstr(1 / li[0][2][0])
                n = _try(st, allowed, 'mul-div-const', {'c': c})
                if n is not None:
                    trace.append({'op': 'mul-div-const', 'params': {'c': c}})
                    st = n
                    continue
        else:
            # constants on left, x on right was handled above; nothing to do
            pass
        n = _try(st, allowed, 'accept-candidate')
        if n is not None:
            trace.append({'op': 'accept-candidate', 'params': {}})
            st = n
            continue
        break
    return st, trace


def run_P1(start_text, allowed, goal):
    """Fixed pipeline: restrict, cancel each fraction, clear denominators, expand and collect,
    move-to-left, divide restricted factors, then delegate linear solving."""
    allowed = set(allowed)
    st = initial_state(start_text)
    orig = st
    trace = []

    def do(name, params=None):
        nonlocal st
        n = _try(st, allowed, name, params)
        if n is not None:
            trace.append({'op': name, 'params': params or {}})
            st = n
            return True
        return False

    do('restrict')
    for _ in range(12):
        hit = False
        for p in candidates(st, 'cancel-common-factor'):
            if do('cancel-common-factor', p):
                hit = True
                break
        if not hit:
            break
    do('clear-denominators')
    do('expand')
    do('collect-terms')
    do('move-to-left')
    for a in sorted(known(st)):
        for _ in range(4):
            if not do('divide-restricted-factor', {'a': _fstr(a)}):
                break
    st, tr = linear_delegate(st, allowed)
    trace.extend(tr)
    ok = goal_holds(goal, st, orig) and equivalent(orig, st)[0]
    return ok, trace, st


def run_priority(start_text, allowed, goal, order, cap=30):
    """Fixed priority order: repeatedly apply the first applicable op in `order`
    (first applicable parameterisation), never revisiting a state."""
    st = initial_state(start_text)
    orig = st
    seen = {key(st)}
    trace = []
    for _ in range(cap):
        if goal_holds(goal, st, orig):
            break
        moved = False
        for name in order:
            if name not in allowed:
                continue
            for p in candidates(st, name):
                ns = apply_op(st, name, p)
                if ns is not None and key(ns) not in seen:
                    seen.add(key(ns))
                    trace.append({'op': name, 'params': p})
                    st = ns
                    moved = True
                    break
            if moved:
                break
        if not moved:
            break
    ok = goal_holds(goal, st, orig) and equivalent(orig, st)[0]
    return ok, trace, st


def run_P4(start_text, allowed, goal, cap=30):
    """Greedy: take the applicable operation whose result has the smallest size
    (terms + degree + fractions); ties by op order then parameter order; never revisit."""
    allowed = set(allowed)
    st = initial_state(start_text)
    orig = st
    seen = {key(st)}
    trace = []
    for _ in range(cap):
        if goal_holds(goal, st, orig):
            break
        best = None
        for name, p, ns in successors(st, allowed):
            if key(ns) in seen:
                continue
            sz = size(ns)
            if best is None or sz < best[0]:
                best = (sz, name, p, ns)
        if best is None:
            break
        seen.add(key(best[3]))
        trace.append({'op': best[1], 'params': best[2]})
        st = best[3]
    ok = goal_holds(goal, st, orig) and equivalent(orig, st)[0]
    return ok, trace, st


def run_P3(start_text, allowed, goal, node_cap=20000):
    st = initial_state(start_text)
    r = bfs(st, set(allowed), goal, node_cap=node_cap, depth_cap=30)
    return r['found'], r


# ----------------------------------------------------------------------------
# limits classification (Dataset C expectations)
# ----------------------------------------------------------------------------
def classify_limits(text):
    """Reference verdict for an equation text:
    ('refuse', code, msg) or ('answer', description-dict) or ('out-of-scope-answerable', description)"""
    try:
        L, R = parse_eq(text)
        extract(L), extract(R)
    except RefError as e:
        return ('refuse', e.code, e.msg)
    if not in_scope(text):
        try:
            st = initial_state(text)
            st = State(text, tuple(sorted(extract_state(st))))
            n, _ = rf(('-', L, R))
            if n and len(n) > 1:
                lead, roots, rem = split_linear(n)
                if len(rem) == 1 or (len(rem) == 3 and rem[1] ** 2 - 4 * rem[2] * rem[0] < 0):
                    return ('out-of-scope-answerable', sol_description(st))
                return ('refuse', 'UNSUPPORTED_EXPRESSION', 'irrational roots outside the scope')
        except RefError as e:
            return ('refuse', e.code, e.msg)
        return ('refuse', 'UNSUPPORTED_EXPRESSION', 'outside the scope boundary')
    st = initial_state(text)
    st = State(text, tuple(sorted(extract_state(st))))
    return ('answer', sol_description(st))


def clear_caches():
    """Drop all memoisation (keeps memory bounded between independent tasks)."""
    for fn in (_apply, _cands, rf, view, pr, extract, has_xden, size_parts, split_linear, pgcd, canon,
               parse_eq, parse_expr, _flat, _find_root):
        fn.cache_clear()
