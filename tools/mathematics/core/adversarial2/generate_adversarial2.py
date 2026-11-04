#!/usr/bin/env python3
"""Seeded generator for the H2 held-out adversarial corpus (seed 20261028).

Label route (generator): own tokenizer/parser -> SymPy expressions; the solution set of a
line is the set of rational real roots of the numerator of together(L-R), minus the line's
domain.  The checker (check_adversarial2.py) uses a different route (Fraction evaluator,
solveset on the cleared polynomial, exact grid substitution) and shares no code with this file.
"""
import sys, os, re, json, random, hashlib
from fractions import Fraction as F
try:
    import sympy
except ImportError:
    sys.path[:0] = ['/home/claude/vendor/sympy', '/home/claude/vendor/mpmath']
    import sympy

SEED = 20261028
HERE = os.path.dirname(os.path.abspath(__file__))
X = sympy.Symbol('x')


class Bad(Exception):
    """unreadable or unsupported (scope policy: label 'unsupported')."""


# ---------------------------------------------------------------- tokenizer / parser
UNI = {'−': '-', '–': '-', '—': '-', '×': '*', '·': '*', '⋅': '*',
       '÷': '/', '∕': '/', '²': '^2', '³': '^3'}
TOKRE = re.compile(r'\s*(\d+\.\d*|\.\d+|\d+|[A-Za-z]+|[-+*/^()=]|\S)')
NUMRE = re.compile(r'\d+\.\d*|\.\d+|\d+')


def isnum(t):
    return t is not None and NUMRE.fullmatch(t) is not None


def tokenize(s):
    for k, v in UNI.items():
        s = s.replace(k, v)
    if '==' in s:
        raise Bad('==')
    toks, pos = [], 0
    while pos < len(s):
        m = TOKRE.match(s, pos)
        if not m:
            break
        toks.append(m.group(1))
        pos = m.end()
    for t in toks:
        if not (t == 'x' or isnum(t) or t in '+-*/^()=' and len(t) == 1):
            raise Bad('token ' + t)
    for a, b in zip(toks, toks[1:]):
        if (isnum(a) or a == 'x') and isnum(b):
            raise Bad('adjacent')
        if a == 'x' and b == 'x':
            raise Bad('adjacent')
        if isnum(a) and a is not None and isnum(b):
            raise Bad('adjacent')
    return toks


class Parser:
    def __init__(s, toks, tight):
        s.t, s.i, s.tight, s.dens = toks, 0, tight, []

    def pk(s):
        return s.t[s.i] if s.i < len(s.t) else None

    def nx(s):
        v = s.pk()
        s.i += 1
        return v

    def implicit(s):
        p, n = s.t[s.i - 1], s.pk()
        if n is None:
            return False
        if n in ('x', '('):
            return p == 'x' or p == ')' or isnum(p)
        if isnum(n):
            return p == ')'
        return False

    def expr(s):
        v = s.term()
        while s.pk() in ('+', '-'):
            o = s.nx()
            w = s.term()
            v = v + w if o == '+' else v - w
        return v

    def term(s):
        v = s.power()
        while True:
            n = s.pk()
            if n == '*':
                s.nx()
                v = v * s.power()
            elif n == '/':
                s.nx()
                d = s.power()
                if s.tight:
                    while s.implicit():
                        d = d * s.power()
                if d == 0:
                    raise Bad('div0')
                if d.has(X):
                    s.dens.append(d)
                v = v / d
            elif s.implicit():
                v = v * s.power()
            else:
                return v

    def power(s):
        n = s.pk()
        if n == '-':
            s.nx()
            return -s.power()
        if n == '+':
            s.nx()
            return s.power()
        a = s.atom()
        if s.pk() == '^':
            s.nx()
            e = s.nx()
            if e is None or not e.isdigit() or int(e) > 6:
                raise Bad('exp')
            a = a ** int(e)
        return a

    def atom(s):
        n = s.nx()
        if n is None:
            raise Bad('eof')
        if isnum(n):
            return sympy.Rational(n)
        if n == 'x':
            return X
        if n == '(':
            v = s.expr()
            if s.nx() != ')':
                raise Bad('paren')
            return v
        raise Bad('atom ' + n)


def parse_side(toks, tight):
    if not toks:
        raise Bad('empty')
    p = Parser(toks, tight)
    v = p.expr()
    if p.i != len(toks):
        raise Bad('trailing')
    return sympy.sympify(v), p.dens


def parse_eq(text, tight):
    toks = tokenize(text)
    if toks.count('=') != 1:
        raise Bad('eq count')
    k = toks.index('=')
    L, d1 = parse_side(toks[:k], tight)
    R, d2 = parse_side(toks[k + 1:], tight)
    return L, R, d1 + d2, toks[:k], toks[k + 1:]


# ---------------------------------------------------------------- sets
def fr(r):
    r = sympy.Rational(r)
    return F(int(r.p), int(r.q))


def rat_roots(expr):
    """rational real roots of a polynomial in x; Bad if a real irrational root exists."""
    expr = sympy.expand(expr)
    if not expr.is_polynomial(X):
        raise Bad('nonpoly')
    p = sympy.Poly(expr, X)
    if p.degree() <= 0:
        return set()
    out = set()
    _, facs = sympy.factor_list(p.as_expr(), X)
    for f, _m in facs:
        fp = sympy.Poly(f, X)
        if fp.degree() == 1:
            a, b = fp.all_coeffs()
            out.add(fr(-b / a))
        elif fp.degree() >= 2 and fp.count_roots() > 0:
            raise Bad('irrational')
    return out


def zero_set(dens):
    z = set()
    for d in dens:
        n, _ = sympy.fraction(sympy.together(d))
        z |= rat_roots(n)
    return z


def eq_roots(L, R):
    n, _ = sympy.fraction(sympy.together(L - R))
    n = sympy.expand(n)
    if n == 0:
        return None
    return rat_roots(n)


def S_of(roots, dom):
    if roots is None:
        return ('cof', frozenset(dom))
    return ('fin', frozenset(roots - set(dom)))


def subset(a, b):
    (ka, va), (kb, vb) = a, b
    if ka == 'fin' and kb == 'fin':
        return va <= vb
    if ka == 'fin':
        return not (va & vb)
    if kb == 'fin':
        return False
    return vb <= va


def transition(prev, cur, truth, open_obl):
    if cur == prev:
        return 'equivalent'
    if subset(prev, cur):
        if prev[0] == 'fin' and cur[0] == 'cof':
            return 'invalid'
        return 'valid-with-obligation'
    if subset(cur, prev):
        if open_obl and prev[0] == 'fin' and subset(truth, cur):
            return 'valid-discharge'
        return 'invalid'
    return 'invalid'


def const_value(toks, tight):
    v, d = parse_side(toks, tight)
    if v.has(X) or not v.is_Rational:
        raise Bad('not const')
    return fr(v)


def analyse(text, tight, excl):
    """-> (set, literal_claim_set_or_None)"""
    t = text.strip()
    low = t.lower().rstrip('.')
    if low in ('no solution', 'no solutions'):
        return ('fin', frozenset()), ('fin', frozenset())
    m = re.fullmatch(r'all real numbers(?: except (.+))?', low)
    if m:
        ex = set()
        if m.group(1):
            for piece in re.split(r',| and ', m.group(1)):
                ex.add(const_value(tokenize(piece), tight))
        return ('cof', frozenset(set(excl) | ex)), ('cof', frozenset(ex))
    parts = re.split(r'\s+or\s+', t)
    roots, dens, allr, claimvals, isclaim = set(), [], False, set(), True
    for p in parts:
        L, R, d, lt, rt = parse_eq(p, tight)
        dens += d
        r = eq_roots(L, R)
        if r is None:
            allr = True
        else:
            roots |= r
        side = None
        if lt == ['x'] and 'x' not in rt:
            side = rt
        elif rt == ['x'] and 'x' not in lt:
            side = lt
        if side is None:
            isclaim = False
        else:
            try:
                claimvals.add(const_value(side, tight))
            except Bad:
                isclaim = False
    dom = set(excl) | zero_set(dens)
    return S_of(None if allr else roots, dom), (('fin', frozenset(claimvals)) if isclaim else None)


def label_task(problem, lines, tight):
    pL, pR, pd, _, _ = parse_eq(problem, tight)
    excl = zero_set(pd)
    truth = S_of(eq_roots(pL, pR), excl)
    prev, open_obl, labels, flags, unsup = truth, False, [], [], []
    seen = False
    for i, l in enumerate(lines, 1):
        try:
            cur, _c = analyse(l, tight, excl)
        except Bad:
            labels.append('unsupported')
            unsup.append(i)
            seen = True
            continue
        if seen:
            labels.append('not-assessed')
            continue
        lab = transition(prev, cur, truth, open_obl)
        labels.append(lab)
        if lab == 'valid-with-obligation':
            open_obl = True
            flags.append({'line': i, 'flag': lab})
        elif lab == 'valid-discharge':
            flags.append({'line': i, 'flag': lab})
            if cur == truth:
                open_obl = False
        prev = cur
    verdict, claim_ok = 'no-claim', None
    try:
        _s, lit = analyse(lines[-1], tight, excl)
        if lit is not None:
            claim_ok = lit == truth
            verdict = 'correct' if claim_ok else 'wrong'
    except Bad:
        pass
    fi = next((i for i, l in enumerate(labels, 1) if l == 'invalid'), None)
    inv_at = 'step' if fi else None
    if unsup:
        status = 'unsupported'
    elif fi:
        status = 'invalid'
    elif verdict == 'wrong':
        status, fi, inv_at = 'invalid', len(lines), 'final-claim'
    elif verdict == 'correct':
        status = 'valid-complete'
    else:
        status = 'valid-incomplete'
    return dict(status=status, first_invalid=fi, invalid_at=inv_at, final_verdict=verdict,
                step_flags=flags, step_labels=labels, unsupported_lines=unsup,
                truth=truth, excl=sorted(excl))


def fstr(q):
    q = F(q)
    return str(q.numerator) if q.denominator == 1 else '%d/%d' % (q.numerator, q.denominator)


def set_json(s):
    if s[0] == 'fin':
        return {'kind': 'finite', 'values': [fstr(v) for v in sorted(s[1])]}
    return {'kind': 'all-except', 'except': [fstr(v) for v in sorted(s[1])]}


# ================================================================ polynomials & rendering
def ptrim(p):
    p = list(p)
    while p and p[-1] == 0:
        p.pop()
    return p


def padd(a, b):
    n = max(len(a), len(b))
    return ptrim([(a[i] if i < len(a) else 0) + (b[i] if i < len(b) else 0) for i in range(n)])


def pscale(a, k):
    return ptrim([c * k for c in a])


def psub(a, b):
    return padd(a, pscale(b, -1))


def pmul(a, b):
    if not a or not b:
        return []
    r = [F(0)] * (len(a) + len(b) - 1)
    for i, x in enumerate(a):
        for j, y in enumerate(b):
            r[i + j] += x * y
    return ptrim(r)


def pev(a, v):
    return sum((c * F(v) ** i for i, c in enumerate(a)), F(0))


def lin(a, b):
    return ptrim([F(b), F(a)])


def dec_txt(q):
    q = F(q)
    d = q.denominator
    for k in range(0, 7):
        if 10 ** k % d == 0:
            v = abs(q.numerator) * (10 ** k // d)
            t = str(v).rjust(k + 1, '0')
            return (t[:-k] + '.' + t[-k:]) if k else t
    return None


def num_txt(q, rng, allow_dec=True):
    """|q| as explicit-grammar text (a single atom or p/q)."""
    q = abs(F(q))
    if q.denominator == 1:
        return str(q.numerator)
    opts = ['(%d/%d)' % (q.numerator, q.denominator), '%d/%d' % (q.numerator, q.denominator)]
    if allow_dec:
        dt = dec_txt(q)
        if dt:
            opts.append(dt)
    return rng.choice(opts)


def term_txt(c, k, rng):
    a = abs(F(c))
    if k == 0:
        return num_txt(a, rng)
    v = 'x' if k == 1 else 'x^%d' % k
    if a == 1:
        return v
    return num_txt(a, rng) + '*' + v


def ptxt(p, rng, order='desc'):
    p = ptrim(p)
    if not p:
        return '0'
    ks = [k for k in range(len(p)) if p[k] != 0]
    if order == 'desc':
        ks.sort(reverse=True)
    elif order == 'asc':
        ks.sort()
    else:
        rng.shuffle(ks)
    out = ''
    for j, k in enumerate(ks):
        neg = p[k] < 0
        t = term_txt(p[k], k, rng)
        if j == 0:
            out += ('-' if neg else '') + t
        else:
            out += ('-' if neg else '+') + t
    return out


def pw(p, rng, order='desc'):
    """parenthesised polynomial text unless it is a plain nonnegative monomial."""
    p = ptrim(p)
    ks = [k for k in range(len(p)) if p[k] != 0]
    s = ptxt(p, rng, order)
    if len(ks) <= 1 and (not ks or p[ks[0]] > 0) and '/' not in s:
        return s
    return '(' + s + ')'


def nest_lin(a, b, rng):
    """text for a*x+b written with nested brackets: k*(m*(x+s)+t)."""
    a, b = F(a), F(b)
    k = rng.choice([2, 3, -2, 5, F(1, 2)])
    m = a / F(k)
    s = F(rng.randint(-6, 6))
    t = b / F(k) - m * s
    def sg(v):
        return ('+' if v >= 0 else '-') + num_txt(v, rng, False)
    mm = '' if m == 1 else ('-' if m == -1 else ('-' if m < 0 else '') + num_txt(m, rng, False) + '*')
    core = mm + '(x' + (sg(s) if s != 0 else '') + ')' + (sg(t) if t != 0 else '')
    kk = ('-' if F(k) < 0 else '') + num_txt(k, rng, False)
    return kk + '*(' + core + ')'


# ================================================================ surfaces
def split_math(line):
    return TOKRE.findall(line)


def operand_start(toks, j):
    if toks[j] != ')':
        return j
    depth = 0
    for i in range(j, -1, -1):
        if toks[i] == ')':
            depth += 1
        elif toks[i] == '(':
            depth -= 1
            if depth == 0:
                return i
    return j


def implicitize(toks):
    out, n = [], len(toks)
    for i, t in enumerate(toks):
        if t == '*' and 0 < i < n - 1:
            l, r = toks[i - 1], toks[i + 1]
            okl = isnum(l) or l == 'x' or l == ')'
            okr = r == 'x' or r == '(' or (l == ')' and isnum(r))
            if l == 'x' and r == 'x':
                okr = False
            ls = operand_start(toks, i - 1)
            prev = toks[ls - 1] if ls > 0 else None
            if okl and okr and prev not in ('/', '^'):
                continue
        out.append(t)
    return out


def restyle(line, rng, implicit=False, spacing='norm', uni=False):
    """re-render an explicit-grammar line (tokens only) in another surface style."""
    low = line.strip().lower()
    if low.startswith(('no solution', 'all real')):
        return line
    parts = re.split(r'\s+or\s+', line.strip())
    rendered = []
    for p in parts:
        toks = split_math(p)
        if implicit:
            toks = implicitize(toks)
        if uni:
            o2 = []
            i = 0
            while i < len(toks):
                t = toks[i]
                if t == '^' and i + 1 < len(toks) and toks[i + 1] in ('2', '3') and \
                        (i + 2 >= len(toks) or not isnum(toks[i + 2])):
                    o2.append('²' if toks[i + 1] == '2' else '³')
                    i += 2
                    continue
                if t == '-':
                    t = rng.choice(['−', '−', '−', '–'])
                elif t == '*':
                    t = rng.choice(['×', '×', '·', '⋅'])
                elif t == '/':
                    t = rng.choice(['÷', '÷', '∕'])
                o2.append(t)
                i += 1
            toks = o2
        s = ''
        for i, t in enumerate(toks):
            if i == 0:
                s = t
                continue
            prev = toks[i - 1]
            binary = t in ('+', '-', '=', '*', '/', '−', '–', '×', '·', '⋅',
                           '÷', '∕') or prev in ('=',)
            if spacing == 'none':
                g = ''
            elif spacing == 'norm':
                g = ' ' if (t in ('=', '+', '-', '−', '–') or prev in ('=', '+')) else ''
                if prev in ('-', '−', '–') and i >= 2 and toks[i - 2] not in ('(', '=', '+', '*', '/', '^'):
                    g = ' '
            else:
                g = ' ' * rng.choice([0, 0, 1, 1, 2])
            # never glue two numbers (cannot happen) ; keep decimals intact
            s += g + t
        rendered.append(s)
    return (' ' + rng.choice(['or', 'or']) + ' ').join(rendered) if len(rendered) > 1 else rendered[0]


def pick_surface(rng, line, force_explicit=False, no_implicit=False):
    if force_explicit:
        return line
    imp = (not no_implicit) and rng.random() < 0.45
    uni = rng.random() < 0.3
    sp = rng.choice(['none', 'norm', 'norm', 'odd'])
    return restyle(line, rng, imp, sp, uni)


# ---------------------------------------------------------------- claims
def x_eq(c, rng, style=None):
    c = F(c)
    neg = c < 0
    a = abs(c)
    p, q = a.numerator, a.denominator
    pq = str(p) if q == 1 else '%d/%d' % (p, q)
    sg = '-' if neg else ''
    opts = [
        'x = ' + sg + pq,
        'x=' + sg + pq,
        'x = (' + sg + pq + ')',
        'x = ' + ('− ' if neg else '') + pq,
        'x = ' + sg + pq.replace('/', ' ÷ '),
        ('(' + sg + pq.replace('/', ' ÷ ') + ') = x') if q != 1 else (sg + pq + ' = x'),
        (sg + pq + ' = x'),
        'x = ' + ('(' + sg + str(p) + ')/' + str(q) if q != 1 else sg + str(p)),
        'x = ' + (('-(' + pq + ')') if neg else pq),
        'x  =  ' + ('−' if neg else '') + pq,
    ]
    dt = dec_txt(a)
    if dt and q != 1:
        opts += ['x = ' + sg + dt, 'x = ' + sg + dt]
    if style is not None:
        return opts[style % len(opts)]
    return rng.choice(opts)


def claim_txt(vals, rng):
    vals = sorted(set(F(v) for v in vals))
    if not vals:
        return rng.choice(['no solution', 'No solution'])
    if len(vals) > 1 and rng.random() < 0.5:
        rng.shuffle(vals)
    return ' or '.join(x_eq(v, rng) for v in vals)


def all_txt(excl, rng):
    ex = sorted(F(v) for v in excl)
    if not ex:
        return rng.choice(['all real numbers', 'All real numbers'])
    return 'all real numbers except ' + rng.choice([', ', ' and ']).join(fstr(v) for v in ex) \
        if len(ex) > 1 else 'all real numbers except ' + fstr(ex[0])


# ================================================================ rational-equation engine
from math import gcd, isqrt


def lcm(a, b):
    return a * b // gcd(a, b)


class Den:
    def __init__(s, const, fac, txt):
        s.const, s.fac, s.txt = int(const), dict(fac), txt
        p = [F(s.const)]
        for r, m in s.fac.items():
            for _ in range(m):
                p = pmul(p, lin(1, -F(r)))
        s.poly = p


def rint(rng, R, nz=True):
    while True:
        v = rng.randint(-R, R)
        if v or not nz:
            return v


def mkden(kind, rng, R=9, root=None):
    a = root if root is not None else rint(rng, R)
    if kind == 'x':
        return Den(1, {F(0): 1}, 'x')
    if kind == 'cx':
        c = rng.randint(2, 9)
        return Den(c, {F(0): 1}, '(%d*x)' % c)
    if kind == 'lin':
        return Den(1, {F(a): 1}, '(' + ptxt(lin(1, -F(a)), rng) + ')')
    if kind == 'cl':
        c, d = rng.randint(2, 6), rint(rng, R)
        return Den(c, {F(-d, c): 1}, '(%d*x%s%d)' % (c, '+' if d > 0 else '-', abs(d)))
    if kind == 'sq':
        return Den(1, {F(a): 1 + 1}, '(' + ptxt(lin(1, -F(a)), rng) + ')^2')
    if kind == 'prod':
        b = rint(rng, R)
        while b == a:
            b = rint(rng, R)
        return Den(1, {F(a): 1, F(b): 1}, '((%s)*(%s))' % (ptxt(lin(1, -F(a)), rng), ptxt(lin(1, -F(b)), rng)))
    if kind == 'prodc':
        b = rint(rng, R)
        while b == a:
            b = rint(rng, R)
        c = rng.randint(2, 5)
        return Den(c, {F(a): 1, F(b): 1}, '(%d*(%s)*(%s))' % (c, ptxt(lin(1, -F(a)), rng), ptxt(lin(1, -F(b)), rng)))
    raise ValueError(kind)


def roots_of(P):
    """full rational factorisation for deg<=2: list of roots (with multiplicity), [] if no real root, None else."""
    P = ptrim(P)
    if len(P) == 2:
        return [-P[0] / P[1]]
    if len(P) == 3:
        c, b, a = P
        d = b * b - 4 * a * c
        if d < 0:
            return []
        num, den = d.numerator, d.denominator
        sn, sd = isqrt(num), isqrt(den)
        if sn * sn != num or sd * sd != den:
            return None
        s = F(sn, sd)
        return [(-b - s) / (2 * a), (-b + s) / (2 * a)]
    return None


def lead_scale(P):
    """positive-ish integer content so that factor forms have integer coefficients."""
    return P[-1]


def factored_txt(P, rng):
    """c*(q1*x-p1)*(q2*x-p2) text for P with rational roots (deg 1 or 2)."""
    rs = roots_of(P)
    c = P[-1]
    fs = []
    for r in rs:
        p, q = r.numerator, r.denominator
        fs.append(pw(ptrim([F(-p), F(q)]), rng))
        c = c / q
    out = []
    if c != 1:
        out.append(('-' if c < 0 else '') + num_txt(c, rng, False)) if c != -1 else out.append('-1')
    out += fs
    s = '*'.join(out)
    return s


def side_text(terms, rng):
    out = ''
    for j, (sg, N, den, nest) in enumerate(terms):
        if den is not None:
            body = pw(N, rng) + '/' + den.txt
        elif nest and len(N) == 2:
            body = '(' + nest_lin(N[1], N[0], rng) + ')'
        else:
            body = pw(N, rng) if (len(N) > 1 or (len(N) == 1 and '/' in num_txt(N[0], rng))) else ptxt(N, rng)
        if j == 0:
            out += ('-' if sg < 0 else '') + body
        else:
            out += ('-' if sg < 0 else '+') + body
    return out


def lcd_of(dens):
    c, fac = 1, {}
    for d in dens:
        c = lcm(c, d.const)
        for r, m in d.fac.items():
            fac[r] = max(fac.get(r, 0), m)
    return c, fac


def cof_of(den, Lc, Lfac):
    if den is None:
        return Lc, dict(Lfac)
    f = {r: m - den.fac.get(r, 0) for r, m in Lfac.items()}
    return Lc // den.const, {r: m for r, m in f.items() if m > 0}


def cof_poly(cc, fac):
    p = [F(cc)]
    for r, m in fac.items():
        for _ in range(m):
            p = pmul(p, lin(1, -r))
    return p


def cof_pieces(cc, fac, rng):
    out = []
    if cc != 1:
        out.append(str(cc))
    for r, m in sorted(fac.items()):
        t = pw(lin(1, -r), rng)
        if m > 1:
            t = (t if t.startswith('(') or t == 'x' else '(' + t + ')') + '^%d' % m
        out.append(t)
    return out


def cleared_side(terms, Lc, Lfac, rng, mods=None):
    """-> (poly, text, per-term (poly_wrong_or_right, cof_poly, N)) with optional mods {idx: kind}."""
    mods = mods or {}
    tot, txt, info = [], '', []
    for j, (sg, N, den, nest) in enumerate(terms):
        cc, fac = cof_of(den, Lc, Lfac)
        s = sg
        mk = mods.get(j)
        pieces_fac = dict(fac)
        if mk == 'sign':
            s = -sg
        cp = cof_poly(cc, fac)
        if mk == 'forget' and (cc != 1 or fac):
            pieces = [] if N == [F(1)] else [pw(N, rng)]
            tp = N
        elif mk == 'wrongcof' and fac:
            r0 = sorted(fac)[0]
            f2 = dict(fac)
            f2[r0] -= 1
            f2 = {r: m for r, m in f2.items() if m > 0}
            pieces_w = cof_pieces(cc, f2, rng) + [pw(lin(1, r0), rng)]
            pieces = ([] if N == [F(1)] else [pw(N, rng)]) + pieces_w
            tp = pmul(N, pmul(cof_poly(cc, f2), lin(1, r0)))
        else:
            pieces = ([] if N == [F(1)] else [pw(N, rng)]) + cof_pieces(cc, fac, rng)
            tp = pmul(N, cp)
            if mk in ('forget', 'wrongcof'):
                return None
        rng.shuffle(pieces)
        body = '*'.join(pieces) if pieces else '1'
        txt += (('-' if s < 0 else '') if j == 0 else ('-' if s < 0 else '+')) + body
        tot = padd(tot, pscale(tp, s))
        info.append((tp, cp, N, s))
    return tot, txt, info


def wrong_expand(N, cp):
    """distribution error: only the first term of N is multiplied by cp."""
    if len(N) != 2 or N[0] == 0:
        return None
    return padd(pmul([F(0), N[1]], cp), [N[0]])


class Prob:
    pass


def norm_terms(ts):
    out = []
    for (sg, N, den, nest) in ts:
        if den is None and len(N) == 1 and N[0] < 0:
            sg, N = -sg, pscale(N, -1)
        out.append((sg, N, den, nest))
    return out


def rand_N(rng, R, frac=False, allow_const=False, nonzero_x=True):
    a = rint(rng, R)
    b = rint(rng, R, nz=False)
    if frac and rng.random() < 0.5:
        a = F(a, rng.choice([2, 3, 4, 5, 8]))
    if allow_const and rng.random() < 0.25:
        return ptrim([F(b if b else 1)])
    return ptrim([F(b), F(a)])


def make_prob(rng, shape, R=9, kinds=None, frac=False, nest=False, tries=400):
    """random rational equation with rational (<=2) roots; returns Prob or None."""
    for _ in range(tries):
        kinds_ = kinds or rng.choice([['x'], ['cx'], ['lin'], ['cl'], ['sq'], ['prod'], ['x', 'lin'],
                                      ['lin', 'lin'], ['cx', 'lin'], ['x', 'cl'], ['prodc'], ['lin', 'prod']])
        base_root = rint(rng, R)
        if shape == 'same':          # all denominators share structure -> linear after clearing
            k = kinds_[0]
            d = [mkden(k, rng, R, root=base_root) for _ in range(3)]
            for dd in d[1:]:
                pass
            D = [d[0], d[0], d[0]]
        else:
            D = [mkden(rng.choice(kinds_), rng, R) for _ in range(3)]
        Ns = [rand_N(rng, R, frac, allow_const=True) for _ in range(3)]
        if shape in ('same', 'cross'):
            lhs = [(1, Ns[0], D[0], False)]
            rhs = [(1, Ns[1], D[1], False)]
        elif shape == 'sum_rhs':   # N0/D0 + N1/D1 = N2/D2
            lhs = [(1, Ns[0], D[0], False), (rng.choice([1, -1]), Ns[1], D[1], False)]
            rhs = [(1, Ns[2], D[2], False)]
        elif shape == 'const_rhs':  # N0/D0 + poly = N1/D1
            lhs = [(1, Ns[0], D[0], False), (rng.choice([1, -1]), rand_N(rng, R, frac, True), None, nest)]
            rhs = [(1, Ns[1], D[1], False)]
        elif shape == 'frac_eq_lin':   # N0/D0 = linear
            lhs = [(1, Ns[0], D[0], False)]
            rhs = [(1, rand_N(rng, R, frac, True), None, nest)]
        elif shape == 'both_poly':  # N0/D0 + c = N1/D1 + d
            lhs = [(1, Ns[0], D[0], False), (1, ptrim([F(rint(rng, R))]), None, False)]
            rhs = [(1, Ns[1], D[1], False), (rng.choice([1, -1]), ptrim([F(rint(rng, R))]), None, False)]
        else:
            raise ValueError(shape)
        lhs, rhs = norm_terms(lhs), norm_terms(rhs)
        dens = [t[2] for t in lhs + rhs if t[2] is not None]
        Lc, Lfac = lcd_of(dens)
        a = cleared_side(lhs, Lc, Lfac, rng)
        b = cleared_side(rhs, Lc, Lfac, rng)
        P = psub(a[0], b[0])
        rs = roots_of(P)
        if rs is None or len(P) < 2:
            continue
        pr = Prob()
        pr.lhs, pr.rhs, pr.dens, pr.Lc, pr.Lfac = lhs, rhs, dens, Lc, Lfac
        pr.P, pr.roots = P, rs
        ex = set()
        for d in dens:
            ex |= set(d.fac)
        pr.excl = ex
        pr.text = side_text(lhs, rng) + ' = ' + side_text(rhs, rng)
        return pr
    return None


def chain(pr, rng, err=None, tail='conseq', stop=None, solve_line=False):
    """Worked solution of a Prob up to (not including) the final claim.
    err: None | s1sign | s1forget | s1wrongcof | s2dist | s2sign | s3move | s4root
    tail: 'conseq' (later steps follow the erroneous line) | 'recover' (later steps return to the correct chain)
    stop: None | 'cleared' | 'expanded' | 'collected'
    returns dict(lines, roots, P, err_line) or None when the instance is unusable."""
    mods_l, mods_r = {}, {}
    if err in ('s1sign', 's1forget', 's1wrongcof'):
        terms = rng.choice([pr.lhs, pr.rhs])
        j = rng.randrange(len(terms))
        (mods_l if terms is pr.lhs else mods_r)[j] = err[2:]
    ra = cleared_side(pr.lhs, pr.Lc, pr.Lfac, rng, mods_l)
    rb = cleared_side(pr.rhs, pr.Lc, pr.Lfac, rng, mods_r)
    ga = cleared_side(pr.lhs, pr.Lc, pr.Lfac, rng)
    gb = cleared_side(pr.rhs, pr.Lc, pr.Lfac, rng)
    if ra is None or rb is None:
        return None
    gl, gr = ga[0], gb[0]
    l1, r1 = ra[0], rb[0]
    lines = ['%s = %s' % (ra[1], rb[1])]
    err_line = 1 if (err or '').startswith('s1') else None
    if (err or '').startswith('s1') and (l1, r1) == (gl, gr):
        return None
    out = dict(lines=lines, P=None, roots=None, err_line=err_line)
    if stop == 'cleared':
        out['P'] = psub(l1, r1)
        return out
    l2, r2 = (l1, r1) if (tail == 'conseq' or not (err or '').startswith('s1')) else (gl, gr)
    if err in ('s2dist', 's2sign'):
        if err == 's2dist':
            cands = []
            for side, inf in (('l', ra[2]), ('r', rb[2])):
                for (tp, cp, N, sgn) in inf:
                    w = wrong_expand(N, cp)
                    if w is not None and w != tp:
                        cands.append((side, tp, w, sgn))
            if not cands:
                return None
            side, tp, w, sgn = rng.choice(cands)
            delta = pscale(psub(w, tp), sgn)
            if side == 'l':
                l2 = padd(l2, delta)
            else:
                r2 = padd(r2, delta)
        else:
            ks = [k for k in range(len(r2)) if r2[k] != 0]
            if not ks:
                return None
            k = rng.choice(ks)
            r2 = list(r2)
            r2[k] = -r2[k]
            r2 = ptrim(r2)
        err_line = 2
    od = rng.choice(['desc', 'desc', 'asc'])
    lines.append('%s = %s' % (ptxt(l2, rng, od), ptxt(r2, rng, od)))
    out['lines'] = lines
    if stop == 'expanded':
        out['P'] = psub(l2, r2)
        return out
    if tail == 'recover' and (err or '').startswith(('s1', 's2')):
        P = psub(gl, gr)
    else:
        P = psub(l2, r2)
    if err == 's3move':
        n = max(len(l2), len(r2))
        ks = [k for k in range(len(r2)) if r2[k] != 0]
        if not ks:
            return None
        k = rng.choice(ks)
        g = lambda p, i: p[i] if i < len(p) else F(0)
        P = ptrim([g(l2, i) + (g(r2, i) if i == k else -g(r2, i)) for i in range(n)])
        err_line = 3
    if len(P) < 2:
        return None
    lines.append('%s = 0' % ptxt(P, rng, 'desc'))
    out['P'] = P
    if stop == 'collected':
        out['roots'] = roots_of(P)
        return out
    if tail == 'recover' and err in ('s1sign', 's1forget', 's1wrongcof', 's2dist', 's2sign', 's3move'):
        Pu = psub(gl, gr)
    else:
        Pu = P
    rs = roots_of(Pu)
    if rs is None:
        return None
    if len(Pu) == 3 and rs:
        lines.append('%s = 0' % factored_txt(Pu, rng))
    elif len(Pu) == 2 and abs(Pu[1]) != 1 and solve_line:
        lines.append('%s%s = %s' % ('-' if Pu[1] < 0 else '', term_txt(Pu[1], 1, rng), ('-' if Pu[0] > 0 else '') + num_txt(Pu[0], rng)))
    if err == 's4root':
        if not rs:
            return None
        rs = list(rs)
        i = rng.randrange(len(rs))
        o = rs[i]
        rs[i] = rng.choice([-o, o + 1, o - 2, (1 / o) if o != 0 else F(3)])
        if rs[i] == o:
            return None
        err_line = len(lines) + 1
    out['lines'], out['roots'], out['err_line'] = lines, rs, err_line
    return out


# ================================================================ task drafts
class T:
    def __init__(s, cat, tag, problem, status, first_invalid=None, error_class=None, note='', amb=None):
        s.cat, s.tag, s.problem = cat, tag, problem
        s.status, s.first_invalid, s.error_class, s.note, s.amb = status, first_invalid, error_class, note, amb
        s.items = []          # (text, fixed)
        s.mut = None          # optional post-surface mutation (unsupported tasks)

    def L(s, text, fixed=False):
        s.items.append((text, fixed))
        return s

    def C(s, text):
        return s.L(text, True)

    def n(s):
        return len(s.items)


def lin_eq(rng, R=9, frac=False, nest=False, tries=300):
    for _ in range(tries):
        a, c = rint(rng, R), rint(rng, R)
        b, d = rint(rng, R, False), rint(rng, R, False)
        a, b, c, d = F(a), F(b), F(c), F(d)
        if frac:
            q = rng.choice([2, 3, 4, 5, 6, 8])
            a, c = a / rng.choice([1, q]), c / rng.choice([1, q])
            b, d = b / rng.choice([1, q]), d / rng.choice([1, q])
        if a == c:
            continue
        A, B = ptrim([b, a]), ptrim([d, c])
        order = rng.choice(['desc', 'asc', 'rand'])
        ta = nest_lin(a, b, rng) if (nest and a != 0 and rng.random() < 0.7) else ptxt(A, rng, order)
        tb = nest_lin(c, d, rng) if (nest and c != 0 and rng.random() < 0.4) else ptxt(B, rng, order)
        if tb == '0' or ta == '0':
            continue
        return dict(A=A, B=B, r=(d - b) / (a - c), ta=ta, tb=tb, text='%s = %s' % (ta, tb))
    return None


def finish(t, rng):
    lines = []
    for text, fixed in t.items:
        if fixed:
            lines.append(text)
        elif t.amb is not None:
            lines.append(restyle(text, rng, False, rng.choice(['none', 'norm', 'odd']), rng.random() < 0.3))
        else:
            lines.append(pick_surface(rng, text))
    if t.mut:
        lines = t.mut(lines, rng)
        if lines is None:
            return None
    return lines


def mx(a):
    """text of the multiplier (x - a)."""
    return pw(lin(1, -F(a)), random.Random(0)) if a != 0 else 'x'


def ok_ints(rng, R, avoid):
    for _ in range(100):
        v = rint(rng, R)
        if F(v) not in avoid:
            return v
    return None


def valid_roots(roots, excl):
    return sorted(set(roots) - set(excl))


def build_prob(lhs, rhs, rng):
    lhs, rhs = norm_terms(lhs), norm_terms(rhs)
    dens = [t[2] for t in lhs + rhs if t[2] is not None]
    Lc, Lfac = lcd_of(dens)
    a = cleared_side(lhs, Lc, Lfac, rng)
    b = cleared_side(rhs, Lc, Lfac, rng)
    P = psub(a[0], b[0])
    rs = roots_of(P)
    if rs is None or len(P) < 2:
        return None
    pr = Prob()
    pr.lhs, pr.rhs, pr.dens, pr.Lc, pr.Lfac, pr.P, pr.roots = lhs, rhs, dens, Lc, Lfac, P, rs
    ex = set()
    for d in dens:
        ex |= set(d.fac)
    pr.excl = ex
    pr.text = side_text(lhs, rng) + ' = ' + side_text(rhs, rng)
    return pr


def sides(text):
    l, r = text.split(' = ')
    return l, r


def lin_setup(rng):
    R = rng.choice([6, 9, 20, 60])
    return lin_eq(rng, R, frac=rng.random() < 0.3, nest=rng.random() < 0.4), R


# ---------------------------------------------------------------- domain-change
def dc_extra(rng, accept):
    e, R = lin_setup(rng)
    if not e:
        return None
    r = e['r']
    a = ok_ints(rng, min(R, 15), {r})
    if a is None:
        return None
    m = mx(a)
    P = psub(e['A'], e['B'])
    if not P:
        return None
    t = T('domain-change', 'DC1', e['text'], 'invalid' if accept else 'valid-complete',
          error_class='extraneous-root-accepted' if accept else None,
          note='multiplied both sides by %s (not an original denominator)%s' % (m, ', then accepted the introduced root' if accept else ', then discarded it'))
    t.L('%s*(%s) = %s*(%s)' % (m, e['ta'], m, e['tb']))
    if rng.random() < 0.6 or accept:
        t.L('%s*(%s) = 0' % (m, ptxt(P, rng)))
    if accept or rng.random() < 0.5:
        t.C(claim_txt([a, r], rng))
    if not accept:
        t.C(claim_txt([r], rng))
    else:
        t.first_invalid = t.n()
    return t


def dc_denline(rng, shrink):
    e, R = lin_setup(rng)
    if not e:
        return None
    r = e['r']
    if shrink:
        if r.denominator != 1:
            return None
        a = int(r)
    else:
        a = ok_ints(rng, 15, {r})
        if a is None:
            return None
    m = mx(a)
    t = T('domain-change', 'DC4' if shrink else 'DC3', e['text'], 'invalid' if shrink else 'valid-complete',
          first_invalid=1 if shrink else None, error_class='domain-shrink-lost-root' if shrink else None,
          note='wrote both sides over %s%s' % (m, ' where the root equals the new excluded value' if shrink else ''))
    t.L('(%s)/%s = (%s)/%s' % (e['ta'], m, e['tb'], m))
    t.L('%s = %s' % (e['ta'], e['tb']))
    t.C(claim_txt([r], rng))
    return t


def dc_cancel_back(rng, accept):
    e, R = lin_setup(rng)
    if not e:
        return None
    r = e['r']
    a = ok_ints(rng, 15, {r})
    P = psub(e['A'], e['B'])
    if a is None or not P:
        return None
    m = mx(a)
    t = T('domain-change', 'DC8', e['text'], 'invalid' if accept else 'valid-complete',
          error_class='extraneous-root-accepted' if accept else None,
          note='over %s then un-divided (domain grows back)' % m)
    t.L('%s*(%s)/%s = 0' % (m, ptxt(P, rng), m))
    t.L('%s*(%s) = 0' % (m, ptxt(P, rng)))
    t.C(claim_txt([a, r], rng))
    if accept:
        t.first_invalid = t.n()
    else:
        t.C(claim_txt([r], rng))
    return t


def dc_rational(rng, accept):
    shape = rng.choice(['frac_eq_lin', 'cross', 'sum_rhs', 'same', 'const_rhs'])
    pr = make_prob(rng, shape, R=rng.choice([5, 9, 12]), frac=rng.random() < 0.2, nest=rng.random() < 0.4)
    if pr is None:
        return None
    vr = valid_roots(pr.roots, pr.excl)
    c = ok_ints(rng, 12, set(pr.roots) | set(pr.excl))
    if c is None:
        return None
    m = mx(c)
    l, r = sides(pr.text)
    t = T('domain-change', 'DC5', pr.text, 'invalid' if accept else 'valid-complete',
          error_class='extraneous-root-accepted' if accept else None,
          note='rational equation multiplied by %s (new factor)' % m)
    t.L('%s*(%s) = %s*(%s)' % (m, l, m, r))
    t.C(claim_txt(vr + [F(c)], rng))
    if accept:
        t.first_invalid = t.n()
    else:
        t.C(claim_txt(vr, rng))
    return t


# ---------------------------------------------------------------- extraneous-root
def ex_quad(rng, mode):
    a = rint(rng, 9)
    u, w = rint(rng, 6), rint(rng, 6)
    v, z = rint(rng, 12, False), rint(rng, 12, False)
    if u == w or u == 0:
        return None
    s = F(z - v, u - w)
    if s == a:
        return None
    N = pmul(lin(1, -a), lin(u, v))
    D = mkden('lin', rng, root=a)
    pr = build_prob([(1, N, D, False)], [(1, ptrim([F(z), F(w)]), None, False)], rng)
    if pr is None:
        return None
    ch = chain(pr, rng, solve_line=False)
    if ch is None:
        return None
    roots = ch['roots']
    t = T('extraneous-root', 'EX1-' + mode, pr.text, 'valid-complete', note='quadratic after clearing; %s is an extraneous root' % a)
    for ln in ch['lines']:
        t.L(ln)
    t.C(claim_txt(roots, rng))
    if mode == 'reject':
        t.C(claim_txt([s], rng))
    elif mode == 'accept':
        t.status, t.error_class, t.first_invalid = 'invalid', 'extraneous-root-accepted', t.n()
    elif mode == 'keep-bad':
        t.C(claim_txt([a], rng))
        t.status, t.error_class, t.first_invalid = 'invalid', 'rejected-valid-root', t.n()
    return t


def ex_nosol(rng, mode):
    a = rint(rng, 12)
    p = rint(rng, 12, False)
    k = rint(rng, 9)
    q = rint(rng, 9, False)
    D = mkden('lin', rng, root=a)
    lhs = [(1, ptrim([F(k * p), F(k)]), D, False)]
    rhs = [(1, ptrim([F(k * (a + p))]), D, False)]
    if rng.random() < 0.5:
        lhs.append((1, ptrim([F(q)]), None, False))
        rhs.append((1, ptrim([F(q)]), None, False))
    pr = build_prob(lhs, rhs, rng)
    if pr is None or not pr.P or pr.roots != [F(a)]:
        return None
    ch = chain(pr, rng, solve_line=True)
    if ch is None:
        return None
    t = T('extraneous-root', 'EX2-' + mode, pr.text, 'valid-complete',
          note='only candidate %s is excluded; true answer is no solution' % a)
    for ln in ch['lines']:
        t.L(ln)
    t.C(claim_txt([a], rng))
    if mode == 'reject':
        t.C(claim_txt([], rng))
    else:
        t.status, t.error_class, t.first_invalid = 'invalid', 'extraneous-root-accepted', t.n()
    return t


def ex_square(rng, mode):
    e, R = lin_setup(rng)
    if not e:
        return None
    A, B = e['A'], e['B']
    S = padd(A, B)
    if len(S) < 2:
        return None
    r = e['r']
    r2 = -S[0] / S[1]
    if r2 == r:
        return None
    Dm = psub(A, B)
    t = T('extraneous-root', 'EX3-' + mode, e['text'], 'valid-complete',
          note='squared both sides; extra root %s' % fstr(r2))
    t.L('(%s)^2 = (%s)^2' % (e['ta'], e['tb']))
    if rng.random() < 0.7:
        t.L('(%s)*(%s) = 0' % (ptxt(Dm, rng), ptxt(S, rng)))
    t.C(claim_txt([r, r2], rng))
    if mode == 'reject':
        t.C(claim_txt([r], rng))
    else:
        t.status, t.error_class, t.first_invalid = 'invalid', 'extraneous-root-accepted', t.n()
    return t


def LT(u, v, rng):
    return ptxt(lin(u, v), rng)


# ---------------------------------------------------------------- cancellation
def ca_additive(rng, kind):
    p = rint(rng, 20)
    q = rng.randint(1, 15)
    m, n = rint(rng, 9), rng.randint(2, 9)
    if m == n or F(p, q) == F(m, n):
        return None
    if kind == 'ab':
        cx = rng.randint(2, 6)
        num, den = ptxt(lin(cx, p), rng), ptxt(lin(cx, q), rng)
        root = F(m * q - n * p, cx * (n - m))
    else:
        num, den = ptxt(lin(1, p), rng), ptxt(lin(1, q), rng)
        root = F(m * q - n * p, n - m)
    if root == F(-q, 1 if kind != 'ab' else cx):
        return None
    t = T('cancellation', 'CA1' + kind, '(%s)/(%s) = %d/%d' % (num, den, m, n), 'invalid', 1, 'cancelled-additive-term',
          note='cancelled the x term between numerator and denominator sums')
    t.L('%d/%d = %d/%d' % (p, q, m, n) if p >= 0 else '%d/%d = %d/%d' % (p, q, m, n))
    t.C('no solution')
    return t


def ca_cancel_c(rng):
    p = rint(rng, 20)
    q = rng.randint(1, 15)
    k = rint(rng, 9)
    if p == 0:
        return None
    t = T('cancellation', 'CA1c', '(x+%d)/x = %d' % (p, k) if p > 0 else '(x-%d)/x = %d' % (-p, k), 'invalid', 1,
          'cancelled-additive-term', note='cancelled x in (x+p)/x leaving p')
    t.L('%d = %d' % (p, k))
    t.C('no solution')
    return t


def ca_common(rng, trap):
    a = rint(rng, 12)
    u, v, m = rint(rng, 12), rint(rng, 20, False), rng.randint(2, 9)
    root0 = F(-v, u)
    if trap:
        k = F(u * a + v, m)
    else:
        k = F(rint(rng, 12)) if rng.random() < 0.6 else F(rint(rng, 12), rng.randint(2, 5))
    root = (m * k - v) / F(u)
    if (root == a) != trap or (not trap and k == F(u * a + v, m)):
        return None
    fa = pw(lin(1, -a), rng)
    prob = '(%s*%s)/(%s*%d) = %s' % (fa, pw(lin(u, v), rng), fa, m, num_txt(k, rng) if k >= 0 else '-' + num_txt(k, rng))
    t = T('cancellation', 'CA2-trap' if trap else 'CA2', prob, 'invalid' if trap else 'valid-complete',
          error_class='extraneous-root-accepted' if trap else None,
          note='cancelled the common factor (x-%d); %s' % (a, 'solution equals the cancelled value' if trap else 'legitimate cancellation'))
    t.L('(%s)/%d = %s' % (LT(u, v, rng), m, num_txt(k, rng) if k >= 0 else '-' + num_txt(k, rng)))
    t.L('%s = %s' % (LT(u, v, rng), fstr(m * k)))
    t.L('%s*x = %s' % (u, fstr(m * k - v)) if u != 1 else 'x = %s' % fstr(m * k - v))
    t.C(claim_txt([root], rng))
    if trap:
        t.first_invalid = t.n()
    return t


def ca_lin(rng, kind):
    e, R = lin_setup(rng)
    if not e:
        return None
    A, B = e['A'], e['B']
    if len(A) < 2 or len(B) < 2:
        return None
    if kind == 'dropvar':
        A2, B2 = [A[0]], B            # cancelled a*x against nothing
    elif kind == 'dropconst':
        A2, B2 = ptrim([F(0), A[1]]), ptrim([F(0), B[1]])
    else:
        A2, B2 = A, [B[0] + 0]         # forgot c*x on the right
        B2 = ptrim([B[0]])
    A2, B2 = ptrim(A2), ptrim(B2)
    P = psub(A2, B2)
    if len(P) != 2:
        return None
    rs = -P[0] / P[1]
    t = T('cancellation', 'CA4-' + kind, e['text'], 'invalid', 1, 'cancelled-additive-term',
          note='cancelled terms from one side only (%s)' % kind)
    t.L('%s = %s' % (ptxt(A2, rng) if A2 else '0', ptxt(B2, rng) if B2 else '0'))
    t.L('%s*x = %s' % (fstr(P[1]), fstr(-P[0])) if P[1] != 1 else 'x = %s' % fstr(-P[0]))
    t.C(claim_txt([rs], rng))
    return t


# ---------------------------------------------------------------- multiplication by zero
def mz_zero(rng, tail):
    if rng.random() < 0.5:
        e, R = lin_setup(rng)
        if not e:
            return None
        prob, ta, tb = e['text'], e['ta'], e['tb']
    else:
        pr = make_prob(rng, rng.choice(['frac_eq_lin', 'cross', 'same']), R=9)
        if pr is None:
            return None
        prob = pr.text
        ta, tb = sides(prob)
    k = rng.randint(1, 15)
    z = rng.choice(['0', '0', '(%d-%d)' % (k, k), '(%d-%d)' % (k, k)])
    t = T('multiplication-by-zero', 'MZ1', prob, 'invalid', 1, 'multiply-by-zero', note='multiplied both sides by 0 (%s)' % z)
    t.L('%s*(%s) = %s*(%s)' % (z, ta, z, tb))
    if tail >= 1:
        t.L('0 = 0')
    if tail >= 2:
        t.C(all_txt([], rng))
    return t


def mz_root(rng, rational):
    if not rational:
        e, R = lin_setup(rng)
        if not e:
            return None
        r = e['r']
        P = psub(e['A'], e['B'])
        m = mx(r)
        t = T('multiplication-by-zero', 'MZ2', e['text'], 'valid-complete', note='multiplied by (x - r) where r is the solution (set unchanged)')
        t.L('%s*(%s) = %s*(%s)' % (m, e['ta'], m, e['tb']))
        t.L('%s*(%s) = 0' % (m, ptxt(P, rng)))
        t.C(claim_txt([r], rng))
        return t
    pr = make_prob(rng, rng.choice(['frac_eq_lin', 'cross', 'same', 'const_rhs']), R=9)
    if pr is None:
        return None
    vr = valid_roots(pr.roots, pr.excl)
    if not vr:
        return None
    r = rng.choice(vr)
    m = mx(r)
    l, rr = sides(pr.text)
    t = T('multiplication-by-zero', 'MZ7', pr.text, 'valid-complete', note='multiplied by (x - r), r a valid root of the rational equation')
    t.L('%s*(%s) = %s*(%s)' % (m, l, m, rr))
    t.C(claim_txt(vr, rng))
    return t


def mz_collapse(rng):
    e, R = lin_setup(rng)
    if not e:
        return None
    r = e['r']
    P = psub(e['A'], e['B'])
    s = rint(rng, 9)
    if F(-s) == r or not P:
        return None
    t = T('multiplication-by-zero', 'MZ3', e['text'], 'invalid', 3, 'multiply-by-zero',
          note='correct, then multiplied by (x+s), then substituted the root making a factor 0')
    t.L('%s = 0' % ptxt(P, rng))
    t.L('(%s)*(%s) = 0' % (ptxt(P, rng), LT(1, s, rng)))
    rr = fstr(r)
    t.L(rng.choice(['0 = 0', '(%s-%s)*(%s+%d) = 0' % (rr if r >= 0 else '(' + rr + ')', rr if r >= 0 else '(' + rr + ')', rr if r >= 0 else '(' + rr + ')', s)]))
    if rng.random() < 0.5:
        t.C(all_txt([], rng))
    return t


def mz_excluded(rng):
    pr = make_prob(rng, rng.choice(['cross', 'sum_rhs', 'frac_eq_lin', 'same']), R=9, kinds=rng.choice([['lin'], ['x'], ['lin', 'lin'], ['cl']]))
    if pr is None or not pr.excl:
        return None
    a = rng.choice(sorted(pr.excl))
    m = mx(a) if a.denominator == 1 else None
    if m is None:
        return None
    l, rr = sides(pr.text)
    ch = chain(pr, rng)
    if ch is None:
        return None
    t = T('multiplication-by-zero', 'MZ5', pr.text, 'valid-complete', note='multiplied by (x-a) with a an original excluded value (equivalent)')
    t.L('%s*(%s) = %s*(%s)' % (m, l, m, rr))
    for ln in ch['lines']:
        t.L(ln)
    t.C(claim_txt(valid_roots(ch['roots'], pr.excl), rng))
    return t


# ---------------------------------------------------------------- invalid division
def id_poly(rng):
    a = rint(rng, 12)
    u, w = rint(rng, 6), rint(rng, 6)
    v, z = rint(rng, 15, False), rint(rng, 15, False)
    if u == w:
        return None
    s = F(z - v, u - w)
    if s == a:
        return None
    m = mx(a)
    t = T('invalid-division', 'ID1', '%s*(%s) = %s*(%s)' % (m, LT(u, v, rng), m, LT(w, z, rng)), 'invalid', 1,
          'division-by-variable', note='divided both sides by %s, losing root %d' % (m, a))
    t.L('%s = %s' % (LT(u, v, rng), LT(w, z, rng)))
    t.L('%s = %s' % (ptxt(ptrim([F(0), F(u - w)]), rng), fstr(z - v)))
    t.C(claim_txt([s], rng))
    return t


def id_den(rng):
    a, k = rint(rng, 9), rint(rng, 9)
    if a == -k:
        return None
    u, v, w = rint(rng, 6), rint(rng, 12, False), rint(rng, 6)
    s_den = u - w
    # (x-a)(ux+v)/(x+k) = (x-a)*w  ->  ux+v = w(x+k)
    if u == w:
        return None
    s = F(w * k - v, u - w)
    if s == a:
        return None
    m = mx(a)
    wk = LT(w, w * k, rng)
    t = T('invalid-division', 'ID2', '(%s*%s)/%s = %s*%s' % (m, pw(lin(u, v), rng), pw(lin(1, k), rng), m, str(w) if w > 0 else '(%d)' % w), 'invalid', 2,
          'division-by-variable', note='cleared correctly then divided both sides by %s' % m)
    t.L('%s*(%s) = %s*(%s)' % (m, LT(u, v, rng), m, wk))
    t.L('%s = %s' % (LT(u, v, rng), wk))
    t.L('%s = %s' % (ptxt(ptrim([F(0), F(u - w)]), rng), fstr(w * k - v)))
    t.C(claim_txt([s], rng))
    return t


def id_xsq(rng):
    b, c = rint(rng, 20, False), rint(rng, 20, False)
    u = rint(rng, 6)
    if b == c or (c - b) % 1:
        return None
    s = F(c - b, u)
    if s == 0:
        return None
    P = ptrim([F(0), F(b), F(u)])
    Q = ptrim([F(0), F(c)])
    t = T('invalid-division', 'ID3', '%s = %s' % (ptxt(P, rng), ptxt(Q, rng)), 'invalid', 1, 'division-by-variable',
          note='divided both sides by x, losing root 0')
    t.L('%s = %s' % (ptxt(ptrim([F(b), F(u)]), rng), c))
    t.C(claim_txt([s], rng))
    return t


def id_prod(rng):
    a = rint(rng, 12)
    u, v = rint(rng, 8), rint(rng, 20, False)
    m = mx(a)
    t = T('invalid-division', 'ID5', '%s*(%s) = 0' % (m, LT(u, v, rng)), 'invalid', 1, 'division-by-variable',
          note='divided both sides by %s in a zero-product equation' % m)
    t.L('%s = 0' % LT(u, v, rng))
    t.C(claim_txt([F(-v, u)], rng))
    return t


def id_const(rng):
    e, R = lin_setup(rng)
    if not e:
        return None
    k = rng.randint(2, 9)
    A, B = pscale(e['A'], k), pscale(e['B'], k)
    if any(c.denominator != 1 for c in A + B):
        return None
    t = T('invalid-division', 'ID6', '%s = %s' % (ptxt(A, rng), ptxt(B, rng)), 'valid-complete',
          note='divided both sides by the constant %d (valid)' % k)
    t.L('%s = %s' % (ptxt(e['A'], rng), ptxt(e['B'], rng)))
    P = psub(e['A'], e['B'])
    t.L('%s*x = %s' % (fstr(P[1]), fstr(-P[0])) if P[1] != 1 else 'x = %s' % fstr(-P[0]))
    t.C(claim_txt([e['r']], rng))
    return t


def id_excluded(rng):
    a = rint(rng, 12)
    u, w = rint(rng, 6), rint(rng, 6)
    v, z = rint(rng, 15, False), rint(rng, 15, False)
    if u == w:
        return None
    s = F(z - v, u - w)
    if s == a:
        return None
    m = mx(a)
    t = T('invalid-division', 'ID7', '(%s*%s)/%s = (%s*%s)/%s' % (m, pw(lin(u, v), rng), m, m, pw(lin(w, z), rng), m), 'valid-complete',
          note='divided by %s where a is already excluded by the problem (valid)' % m)
    t.L('%s*(%s) = %s*(%s)' % (m, LT(u, v, rng), m, LT(w, z, rng)))
    t.L('%s = %s' % (LT(u, v, rng), LT(w, z, rng)))
    t.C(claim_txt([s], rng))
    return t


def mk_kden(c):
    return Den(c, {}, str(c))


def student_claim_lines(t, roots, excl, rng):
    """append roots line (all roots) then rejection line when some root is excluded; return nothing."""
    roots = sorted(set(roots))
    if set(roots) & set(excl):
        t.C(claim_txt(roots, rng))
        t.C(claim_txt(valid_roots(roots, excl), rng))
    else:
        t.C(claim_txt(roots, rng))


def rnd_prob(rng, big=False):
    shape = rng.choice(['frac_eq_lin', 'cross', 'sum_rhs', 'same', 'const_rhs', 'both_poly'])
    R = rng.choice([5, 9, 12]) if not big else rng.choice([20, 60])
    return make_prob(rng, shape, R=R, frac=rng.random() < 0.2, nest=rng.random() < 0.4,
                     tries=600)


def const_den_prob(rng, R=60):
    for _ in range(200):
        ks = [rng.randint(2, 12) for _ in range(3)]
        N = [ptrim([F(rint(rng, R, False)), F(rint(rng, R))]) for _ in range(3)]
        lhs = [(1, N[0], mk_kden(ks[0]), False), (rng.choice([1, -1]), N[1], mk_kden(ks[1]), False)]
        rhs = [(1, N[2], mk_kden(ks[2]), False)]
        if rng.random() < 0.4:
            rhs.append((rng.choice([1, -1]), ptrim([F(rint(rng, 9))]), None, False))
        pr = build_prob(lhs, rhs, rng)
        if pr is not None and len(pr.P) == 2:
            return pr
    return None


# ---------------------------------------------------------------- rational-expressions
def re_correct(rng, cat='rational-expressions', tag='RE1', const=False):
    pr = const_den_prob(rng) if const else rnd_prob(rng, big=rng.random() < 0.3)
    if pr is None:
        return None
    stop = rng.choice([None] * 6 + ['cleared', 'expanded', 'collected'])
    ch = chain(pr, rng, stop=stop, solve_line=rng.random() < 0.5)
    if ch is None:
        return None
    t = T(cat, tag, pr.text, 'valid-complete' if stop is None else 'valid-incomplete',
          note='correct working of a rational equation%s' % ('' if stop is None else ' (stops after the %s line, no claim)' % stop))
    for ln in ch['lines']:
        t.L(ln)
    if stop is None:
        student_claim_lines(t, ch['roots'], pr.excl, rng)
    return t


ERRS = ['s1sign', 's1forget', 's1wrongcof', 's2dist', 's2sign', 's3move', 's4root']
ECLS = {'s1sign': 'sign-error', 's1forget': 'forgot-to-multiply-term', 's1wrongcof': 'wrong-cofactor',
        's2dist': 'distribution-error', 's2sign': 'sign-error', 's3move': 'sign-error', 's4root': 'arithmetic-slip'}


def re_error(rng, const=False):
    pr = const_den_prob(rng) if const else rnd_prob(rng, big=rng.random() < 0.3)
    if pr is None:
        return None
    err = rng.choice(ERRS + ['s1wrongcof'] * 3 + ['s1forget'] * 2)
    tail = rng.choice(['conseq', 'conseq', 'recover'])
    ch = chain(pr, rng, err=err, tail=tail, solve_line=rng.random() < 0.5)
    if ch is None or ch['err_line'] is None:
        return None
    t = T('rational-expressions', 'RE2', pr.text, 'invalid', None, ECLS[err],
          note='%s error (%s tail)' % (err, tail))
    for ln in ch['lines']:
        t.L(ln)
    t.C(claim_txt(ch['roots'], rng))
    t.first_invalid = ch['err_line']
    return t


def re_addden(rng):
    kinds = ['x', 'cx', 'lin', 'cl']
    for _ in range(50):
        D0, D1 = mkden(rng.choice(kinds), rng, 9), mkden(rng.choice(kinds), rng, 9)
        if D0.txt == D1.txt:
            continue
        N0 = ptrim([F(rint(rng, 20, False)), F(rint(rng, 9))])
        N1 = ptrim([F(rint(rng, 20, False)), F(rint(rng, 9))]) if rng.random() < 0.5 else ptrim([F(rint(rng, 20, False))])
        c = rint(rng, 12)
        sg = rng.choice([1, -1])
        pr = build_prob([(1, N0, D0, False), (sg, N1, D1, False)], [(1, ptrim([F(c)]), None, False)], rng)
        if pr is None:
            continue
        Ns = padd(N0, pscale(N1, sg))
        Ds = padd(D0.poly, pscale(D1.poly, sg))
        Q = psub(Ns, pscale(Ds, c))
        if len(Q) != 2 or len(Ds) < 2:
            continue
        op = '+' if sg == 1 else '-'
        t = T('rational-expressions', 'RE3', pr.text, 'invalid', 1, 'added-denominators',
              note='combined a/b %s c/d as (a%sc)/(b%sd)' % (op, op, op))
        t.L('(%s%s%s)/(%s%s%s) = %d' % (pw(N0, rng), op, pw(N1, rng), D0.txt, op, D1.txt, c))
        t.L('%s%s%s = %d*(%s%s%s)' % (pw(N0, rng), op, pw(N1, rng), c, D0.txt, op, D1.txt))
        t.L('%s = 0' % ptxt(Q, rng))
        t.C(claim_txt([-Q[0] / Q[1]], rng))
        return t
    return None


def re_nested(rng, err):
    for _ in range(100):
        k, m, s, tt = rint(rng, 9), rint(rng, 6), rint(rng, 9, False), rint(rng, 12, False)
        if abs(k) < 2:
            continue
        c, d = rint(rng, 20), rint(rng, 30, False)
        A = padd(pscale(lin(1, s), F(k * m)), [F(k * tt)])
        B = ptrim([F(d), F(c)])
        if len(A) != 2 or A[1] == B[1] if len(B) == 2 else len(A) != 2:
            continue
        P = psub(A, B)
        if len(P) != 2:
            continue
        inner = 'm*(x+s)+t'
        ms = ('' if m == 1 else ('-' if m == -1 else '%d*' % m))
        prob = '%d*(%s(x%s%d)%s%d) = %s' % (k, ms, '+' if s > 0 else '-', abs(s), '+' if tt > 0 else '-', abs(tt), ptxt(B, rng))
        t = T('rational-expressions', 'RE6-' + (err or 'ok'), prob, 'invalid' if err else 'valid-complete', None,
              'distribution-error' if err else None, note='nested brackets; ' + ('distribution slip' if err else 'correct'))
        l1 = '%d*%s(x%s%d)%s%d = %s' % (k, ms, '+' if s > 0 else '-', abs(s), '+' if k * tt > 0 else '-', abs(k * tt), ptxt(B, rng))
        if err == 'forgot':
            l1 = '%d*%s(x%s%d)%s%d = %s' % (k, ms, '+' if s > 0 else '-', abs(s), '+' if tt > 0 else '-', abs(tt), ptxt(B, rng))
            A2 = padd(pscale(lin(1, s), F(k * m)), [F(tt)])
        elif err == 'firstonly':
            l1 = '%d*%s(x)%s%d%s%d = %s' % (k, ms, '+' if s > 0 else '-', abs(s), '+' if k * tt > 0 else '-', abs(k * tt), ptxt(B, rng))
            A2 = padd(pscale([F(0), F(1)], F(k * m)), [F(s), ]) if False else padd(pscale([F(0), F(1)], F(k * m)), [F(s + k * tt)])
        else:
            A2 = A
        if err and A2 == A:
            continue
        P2 = psub(A2, B)
        if len(P2) != 2:
            continue
        t.L(l1)
        t.L('%s = %s' % (ptxt(A2, rng), ptxt(B, rng)))
        t.L('%s = 0' % ptxt(P2, rng))
        t.C(claim_txt([-P2[0] / P2[1]], rng))
        if err:
            t.first_invalid = 1
        return t
    return None


# ---------------------------------------------------------------- alternative paths
def kt(k):
    k = F(k)
    return ('(%s)' % fstr(k)) if (k < 0 or k.denominator != 1) else str(k.numerator)


def ap_walk(rng, finish_incomplete=False):
    e, R = lin_setup(rng)
    if not e:
        return None
    A, B = e['A'], e['B']
    t = T('alternative-paths', 'AP1', e['text'], 'valid-incomplete' if finish_incomplete else 'valid-complete',
          note='random walk of equivalence-preserving operations')
    for _ in range(rng.randint(2, 4)):
        op = rng.choice(['swap', 'mul', 'add', 'subx', 'swap'])
        od = rng.choice(['desc', 'asc', 'rand'])
        if op == 'swap':
            A, B = B, A
            t.L('%s = %s' % (ptxt(A, rng, od), ptxt(B, rng, od)))
        elif op == 'mul':
            k = rng.choice([2, 3, 4, 5, 10, 12, -1, -2, F(1, 2), F(1, 3), F(3, 2), F(-5, 4)])
            if rng.random() < 0.5:
                t.L('%s*(%s) = %s*(%s)' % (kt(k) if k > 0 and F(k).denominator == 1 else kt(k), ptxt(A, rng), kt(k), ptxt(B, rng)))
            A, B = pscale(A, k), pscale(B, k)
            t.L('%s = %s' % (ptxt(A, rng, od), ptxt(B, rng, od)))
        elif op == 'add':
            tm = ptrim([F(rint(rng, 9, False)), F(rint(rng, 6))])
            if rng.random() < 0.5:
                t.L('(%s)+(%s) = (%s)+(%s)' % (ptxt(A, rng), ptxt(tm, rng), ptxt(B, rng), ptxt(tm, rng)))
            A, B = padd(A, tm), padd(B, tm)
            t.L('%s = %s' % (ptxt(A, rng, od), ptxt(B, rng, od)))
        else:
            bx = B[1] if len(B) > 1 else F(0)
            if bx == 0:
                continue
            A = psub(A, [F(0), bx])
            B = psub(B, [F(0), bx])
            t.L('%s = %s' % (ptxt(A, rng, od), ptxt(B, rng, od)))
    P = psub(A, B)
    if len(P) != 2:
        return None
    A2, B2 = ptrim([F(0), P[1]]), ptrim([-P[0]])
    t.L('%s = %s' % (ptxt(A2, rng), ptxt(B2, rng)))
    if finish_incomplete:
        return t
    if P[1] != 1:
        t.C(claim_txt([e['r']], rng))
    else:
        t.C(claim_txt([e['r']], rng))
    return t


def ap_special(rng, kind):
    if kind == 'nosol':
        a, b, d = rint(rng, 12), rint(rng, 20, False), rint(rng, 20, False)
        if b == d:
            return None
        k = rng.randint(1, 4)
        A, B = ptrim([F(b), F(a)]), ptrim([F(d), F(a)])
        t = T('alternative-paths', 'AP5-nosol', '%s = %s' % (ptxt(A, rng), ptxt(B, rng)), 'valid-complete', note='no solution via subtracting the x term')
        t.L('%s = %s' % (num_txt(b, rng) if b >= 0 else '-' + num_txt(b, rng), num_txt(d, rng) if d >= 0 else '-' + num_txt(d, rng)))
        t.C('no solution')
        return t
    if kind == 'ident':
        a, b, k = rint(rng, 9), rint(rng, 15, False), rng.randint(2, 5)
        A = ptrim([F(b), F(a)])
        t = T('alternative-paths', 'AP5-ident', '%d*(%s) = %s' % (k, ptxt(A, rng), ptxt(pscale(A, k), rng, 'asc')), 'valid-complete',
              note='identity: all real numbers')
        t.L('%s = %s' % (ptxt(pscale(A, k), rng), ptxt(pscale(A, k), rng, 'asc')))
        t.L('0 = 0')
        t.C(all_txt([], rng))
        return t
    # rational identity with excluded value
    a = rint(rng, 12)
    u, v = rint(rng, 6), rint(rng, 15, False)
    N = pmul(lin(1, -a), lin(u, v))
    t = T('alternative-paths', 'AP5-ratident', '%s/%s = %s' % (pw(N, rng), pw(lin(1, -a), rng), pw(lin(u, v), rng)), 'valid-complete',
          note='rational identity: all reals except %d' % a)
    t.L('%s = (%s)*(%s)' % (ptxt(N, rng), LT(1, -a, rng), LT(u, v, rng)))
    t.L('0 = 0')
    t.C(all_txt([F(a)], rng))
    return t


# ---------------------------------------------------------------- correct controls
def cc_linear(rng, incomplete):
    e, R = lin_setup(rng)
    if not e:
        return None
    A, B = e['A'], e['B']
    P = psub(A, B)
    if len(P) != 2:
        return None
    t = T('correct-controls', 'CC1', e['text'], 'valid-incomplete' if incomplete else 'valid-complete', note='standard linear solution')
    if len(A) == 2 and len(B) == 2 and rng.random() < 0.7:
        t.L('%s = %s' % (ptxt(ptrim([A[0], A[1] - B[1]]), rng), ptxt(ptrim([B[0]]), rng)))
    t.L('%s = %s' % (ptxt(ptrim([F(0), P[1]]), rng), ptxt(ptrim([-P[0]]), rng)))
    if not incomplete:
        t.C(claim_txt([e['r']], rng))
    return t


# ---------------------------------------------------------------- ambiguous notation
def sx(s):
    return ('+%d' % s) if s > 0 else ('-%d' % -s)


def am_task(rng, form, bad=False):
    p = rint(rng, 60)
    q = rng.randint(2, 12)
    s = rint(rng, 15, False)
    c = F(rint(rng, 40), rng.choice([1, 1, 2, 3]))
    if c == 0:
        return None
    sc = fstr(c)
    if form == 'A1':        # (p/q)(x+s) = c
        val = c * F(q, p) - s
        prob = '(%d/%d)*(x%s) = %s' % (p, q, sx(s), sc)
        t = T('ambiguous-notation', 'AM-A1', prob, '', amb='amb', note='p/q(x+s): left-to-right vs q(x+s) in the denominator')
        t.L('%d/%d(x%s) = %s' % (p, q, sx(s), sc))
        rhs = c * F(q, p)
        if bad:
            rhs = rhs + 1
        t.L('x%s = %s' % (sx(s), fstr(rhs)))
        t.C(claim_txt([rhs - s], rng))
        return t
    if form == 'A2':        # (p/q)*x + s = c, written p/qx+s
        prob = '(%d/%d)*x%s = %s' % (p, q, sx(s), sc)
        t = T('ambiguous-notation', 'AM-A2', prob, '', amb='amb', note='p/qx: (p/q)x vs p/(qx)')
        t.L('%d/%dx%s = %s' % (p, q, sx(s), sc))
        rhs = (c - s) * F(q, p)
        t.L('%d/%d*x = %s' % (p, q, fstr(c - s)))
        if bad:
            rhs = rhs + 2
        t.C(claim_txt([rhs], rng))
        return t
    if form == 'A3':        # (k/m)(x-a)(x-b) = 0
        a, b = rint(rng, 9), rint(rng, 9)
        if a == b:
            return None
        prob = '(%d/%d)*(x%s)*(x%s) = 0' % (p, q, sx(-a), sx(-b))
        t = T('ambiguous-notation', 'AM-A3', prob, '', amb='amb', note='k/m(x-a)(x-b): product vs (k/m)*... ')
        t.L('%d/%d(x%s)(x%s) = 0' % (p, q, sx(-a), sx(-b)))
        t.L('(x%s)*(x%s) = 0' % (sx(-a), sx(-b)))
        t.C(claim_txt([a, b] if not bad else [a], rng))
        return t
    if form == 'B1':        # p/(q x) = c, written p/qx
        prob = '%d/(%d*x) = %s' % (p, q, sc)
        t = T('ambiguous-notation', 'AM-B1', prob, '', amb='amb', note='p/qx intended as p/(qx)')
        t.L('%d/%dx = %s' % (p, q, sc))
        t.L('%d = %d*(%s)*x' % (p, q, sc))
        val = F(p) / (q * c)
        if bad:
            val = val + 1
        t.C(claim_txt([val], rng))
        return t
    if form == 'B2':        # p/(q(x+s)) = c
        prob = '%d/(%d*(x%s)) = %s' % (p, q, sx(s), sc)
        t = T('ambiguous-notation', 'AM-B2', prob, '', amb='amb', note='p/q(x+s) intended as p/(q(x+s))')
        t.L('%d/%d(x%s) = %s' % (p, q, sx(s), sc))
        t.L('%d = %d*(%s)*(x%s)' % (p, q, sc, sx(s)))
        val = F(p) / (q * c) - s
        if bad:
            val = val - 3
        t.L('x%s = %s' % (sx(s), fstr(val + s)))
        t.C(claim_txt([val], rng))
        return t
    # agreeing controls: a juxtaposed factor equal to 1
    one = rng.choice(['(1)', '(1)', '(%d-%d)' % (s + 3 if s + 3 > 1 else 5, (s + 3 if s + 3 > 1 else 5) - 1)])
    if form == 'E1':        # (x+s)/q(1) = c
        prob = '(x%s)/%d = %s' % (sx(s), q, sc)
        t = T('ambiguous-notation', 'AM-E1', prob, '', amb='agree', note='/q(1): both readings identical')
        t.L('(x%s)/%d%s = %s' % (sx(s), q, one, sc))
        t.L('x%s = %s' % (sx(s), fstr(c * q + (1 if bad else 0))))
        t.C(claim_txt([c * q - s + (1 if bad else 0)], rng))
        return t
    if form == 'E2':        # p/(x+s) = c with /(x+s)(1)
        prob = '%d/(x%s) = %s' % (p, sx(s), sc)
        t = T('ambiguous-notation', 'AM-E2', prob, '', amb='agree', note='/(x+s)(1): both readings identical')
        t.L('%d/(x%s)%s = %s' % (p, sx(s), one, sc))
        t.L('%d = %s*(x%s)' % (p, sc if c > 0 else '(' + sc + ')', sx(s)))
        val = F(p) / c - s + (1 if bad else 0)
        t.C(claim_txt([val], rng))
        return t
    if form == 'E3':        # x/q(1) + s = c
        prob = 'x/%d%s = %s' % (q, sx(s), sc)
        t = T('ambiguous-notation', 'AM-E3', prob, '', amb='agree', note='x/q(1)+s: both readings identical')
        t.L('x/%d%s%s = %s' % (q, one, sx(s), sc))
        t.L('x/%d = %s' % (q, fstr(c - s)))
        t.C(claim_txt([(c - s) * q + (1 if bad else 0)], rng))
        return t
    return None


# ---------------------------------------------------------------- unsupported
INTRE = re.compile(r'(?<![\d./])(\d+)(?![\d./])')


def mut_fn(kind, k):
    def mut(lines, rng):
        s = lines[k]
        low = s.lower()
        if low.startswith(('no solution', 'all real')):
            return None
        if kind == 'sqrt':
            m = INTRE.search(s)
            if not m:
                return None
            n = int(m.group(1))
            rep = rng.choice(['sqrt(%d)', '√%d', 'sqrt(%d)']) % (n * n)
            new = s[:m.start()] + rep + s[m.end():]
        elif kind == 'letter':
            if rng.random() < 0.5 and 'x' in s:
                new = s.replace('x', rng.choice(['y', 'z', 't']))
            else:
                m = INTRE.search(s)
                if not m:
                    return None
                new = s[:m.start()] + rng.choice(['a', 'n', 'k', 'b']) + s[m.end():]
        elif kind == 'eqeq':
            new = s.replace('=', '==', 1)
        elif kind == 'trig':
            if 'x' not in s:
                return None
            new = s.replace('x', rng.choice(['sin(x)', 'cos(x)', 'tan(x)', 'ln(x)']), 1)
        elif kind == 'abs':
            if 'x' not in s:
                return None
            new = s.replace('x', rng.choice(['abs(x)', '|x|']), 1)
        else:   # '?'
            i = s.rfind('=')
            if i < 0:
                return None
            new = s[:i + 1] + rng.choice([' ?', ' ??', '?'])
        out = list(lines)
        out[k] = new
        return out
    return mut


def un_task(rng, kind):
    base = cc_linear(rng, False) if rng.random() < 0.55 else re_correct(rng, 'unsupported', 'UN')
    if base is None or base.status not in ('valid-complete',) or len(base.items) < 2:
        return None
    k = rng.randrange(len(base.items))
    t = T('unsupported', 'UN-' + kind, base.problem, 'unsupported', note='line %d replaced by a %s variant' % (k + 1, kind))
    t.items = list(base.items)
    t.mut = mut_fn(kind, k)
    return t


# ================================================================ category plans
def plans():
    P = {}
    P['domain-change'] = [
        (3, lambda r: dc_extra(r, False)), (2, lambda r: dc_extra(r, True)),
        (2, lambda r: dc_denline(r, False)), (2, lambda r: dc_denline(r, True)),
        (2, lambda r: dc_cancel_back(r, False)), (1, lambda r: dc_cancel_back(r, True)),
        (2, lambda r: dc_rational(r, False)), (2, lambda r: dc_rational(r, True))]
    P['extraneous-root'] = [
        (3, lambda r: ex_quad(r, 'reject')), (3, lambda r: ex_quad(r, 'accept')), (1, lambda r: ex_quad(r, 'keep-bad')),
        (2, lambda r: ex_nosol(r, 'reject')), (2, lambda r: ex_nosol(r, 'accept')),
        (2, lambda r: ex_square(r, 'reject')), (2, lambda r: ex_square(r, 'accept'))]
    P['cancellation'] = [
        (2, lambda r: ca_additive(r, 'ab')), (2, lambda r: ca_additive(r, 'a')), (1, ca_cancel_c),
        (3, lambda r: ca_common(r, False)), (2, lambda r: ca_common(r, True)),
        (1, lambda r: ca_lin(r, 'dropvar')), (1, lambda r: ca_lin(r, 'dropconst')), (1, lambda r: ca_lin(r, 'forgotx'))]
    P['multiplication-by-zero'] = [
        (3, lambda r: mz_zero(r, r.randint(0, 2))), (2, lambda r: mz_root(r, False)), (2, lambda r: mz_root(r, True)),
        (3, mz_collapse), (3, mz_excluded)]
    P['invalid-division'] = [
        (3, id_poly), (2, id_den), (2, id_xsq), (2, id_prod), (2, id_const), (2, id_excluded)]
    P['rational-expressions'] = [
        (2, lambda r: re_correct(r)), (1, lambda r: re_correct(r, const=True)),
        (6, lambda r: re_error(r)), (4, lambda r: re_error(r, True)), (2, re_addden),
        (1, lambda r: re_nested(r, 'forgot')), (1, lambda r: re_nested(r, 'firstonly')), (1, lambda r: re_nested(r, None))]
    P['alternative-paths'] = [
        (6, lambda r: ap_walk(r)), (2, lambda r: ap_walk(r, True)),
        (1, lambda r: ap_special(r, 'nosol')), (1, lambda r: ap_special(r, 'ident')), (1, lambda r: ap_special(r, 'rat')),
        (2, lambda r: re_correct(r, 'alternative-paths', 'AP2'))]
    P['correct-controls'] = [
        (4, lambda r: cc_linear(r, False)), (1, lambda r: cc_linear(r, True)),
        (3, lambda r: re_correct(r, 'correct-controls', 'CC2')), (1, lambda r: re_correct(r, 'correct-controls', 'CC3', True))]
    P['ambiguous-notation'] = []
    P['unsupported'] = [(1, (lambda k: (lambda r: un_task(r, k)))(k)) for k in ['sqrt', 'letter', 'eqeq', 'trig', 'abs', 'q']]
    return P


def pick(rng, items):
    tot = sum(w for w, _ in items)
    x = rng.random() * tot
    for w, f in items:
        x -= w
        if x <= 0:
            return f
    return items[-1][1]


def same_as_route2(res, r2):
    a = (res['status'], res['first_invalid'], res['invalid_at'], res['final_verdict'], res['step_flags'],
         res['step_labels'], res['unsupported_lines'], set_json(res['truth']), [fstr(v) for v in res['excl']])
    b = (r2['status'], r2['first_invalid'], r2['invalid_at'], r2['final_verdict'], r2['step_flags'],
         r2['step_labels'], r2['unsupported_lines'], r2['truth'], r2['excluded'])
    return a == b


def key_of(res):
    return (res['status'], res['first_invalid'], res['invalid_at'], res['final_verdict'])


def rec_expected(res, t):
    return dict(status=res['status'], first_invalid=res['first_invalid'], invalid_at=res['invalid_at'],
                error_class=(t.error_class or ('arithmetic-slip' if t.cat == 'ambiguous-notation' else None)) if res['status'] == 'invalid' else None,
                final_verdict=res['final_verdict'], step_flags=res['step_flags'], step_labels=res['step_labels'])


def build_record(cid, t, lines, rl, rt):
    exp = rec_expected(rl, t)
    if t.cat == 'unsupported' or rl['unsupported_lines']:
        exp['unsupported_lines'] = rl['unsupported_lines']
    if t.amb is not None:
        if key_of(rl) != key_of(rt):
            sub = lambda r: dict(status=r['status'], first_invalid=r['first_invalid'], invalid_at=r['invalid_at'],
                                 final_verdict=r['final_verdict'], step_labels=r['step_labels'])
            exp = dict(status='ambiguous', first_invalid=None, invalid_at=None, error_class=None, final_verdict=None,
                       step_flags=None, step_labels=None, readings=dict(lr=sub(rl), tight=sub(rt)))
        else:
            exp['readings_agree'] = True
    return dict(id=cid, family='H2', category=t.cat, problem=t.problem, lines=lines, expected=exp,
                truth=dict(solution_set=set_json(rl['truth']), excluded=[fstr(v) for v in rl['excl']]),
                notes='%s [%s]' % (t.note, t.tag))


def generate(target=44, max_cand=2000):
    P = plans()
    tasks, dropped, stats = [], [], {}
    for cat, items in P.items():
        rng = random.Random('%d-%s' % (SEED, cat))
        got, seen, tries, skips = [], set(), 0, 0
        quota = {'amb': 28, 'agree': 16} if cat == 'ambiguous-notation' else None
        cnt = {'amb': 0, 'agree': 0}
        while len(got) < target and tries < max_cand:
            tries += 1
            if cat == 'ambiguous-notation':
                kind = 'amb' if cnt['amb'] < quota['amb'] and (cnt['agree'] >= quota['agree'] or rng.random() < 0.64) else 'agree'
                forms = ['A1', 'A2', 'A3', 'B1', 'B2'] if kind == 'amb' else ['E1', 'E2', 'E3']
                f = rng.choice(forms)
                bad = rng.random() < 0.3
                t = am_task(rng, f, bad)
            else:
                t = pick(rng, items)(rng)
            if t is None or not t.items:
                skips += 1
                continue
            lines = finish(t, rng)
            if lines is None:
                skips += 1
                continue
            sig = (t.problem, tuple(lines))
            if sig in seen:
                skips += 1
                continue
            seen.add(sig)
            info = dict(category=cat, tag=t.tag, problem=t.problem, lines=lines)
            try:
                rl, rt = label_task(t.problem, lines, False), label_task(t.problem, lines, True)
            except Bad as e:
                dropped.append(dict(info, reason='oracle-unreadable-problem-or-irrational: %s' % e))
                continue
            try:
                from check_adversarial2 import route2, Unsup, Mismatch
                for res, tg in ((rl, False), (rt, True)):
                    if not same_as_route2(res, route2(t.problem, lines, tg)):
                        raise Mismatch('generator route and checker route disagree')
            except (Unsup, Mismatch) as e:
                dropped.append(dict(info, reason='label-routes-disagree: %s' % e))
                continue
            if t.amb is None:
                if rl != rt:
                    dropped.append(dict(info, reason='readings-disagree-on-nonambiguous-task'))
                    continue
                if rl['status'] != t.status or (t.first_invalid is not None and rl['first_invalid'] != t.first_invalid):
                    dropped.append(dict(info, reason='intended-differs', intended=[t.status, t.first_invalid],
                                        got=[rl['status'], rl['first_invalid'], rl['step_labels']]))
                    continue
                if t.status == 'invalid' and rl['first_invalid'] is None:
                    continue
            else:
                if 'unsupported' in (rl['status'], rt['status']):
                    dropped.append(dict(info, reason='ambiguous-task-has-unsupported-reading'))
                    continue
                differ = key_of(rl) != key_of(rt)
                if differ != (t.amb == 'amb'):
                    dropped.append(dict(info, reason='intended-%s-but-readings-%s' % (t.amb, 'differ' if differ else 'agree'),
                                        got=[key_of(rl), key_of(rt)]))
                    continue
                if not differ and rl != rt:
                    dropped.append(dict(info, reason='same-verdict-different-step-labels'))
                    continue
                cnt[t.amb] += 1
            got.append((t, lines, rl, rt))
        stats[cat] = dict(candidates=tries, skipped_redraws=skips, accepted=len(got))
        for i, (t, lines, rl, rt) in enumerate(got, 1):
            tasks.append(build_record('H2-%s-%03d' % (cat, i), t, lines, rl, rt))
    return tasks, dropped, stats


sys.path.insert(0, HERE)


def dumps(obj):
    return json.dumps(obj, ensure_ascii=False, indent=1) + '\n'


def main():
    tasks, dropped, stats = generate()
    open(os.path.join(HERE, 'adversarial2.json'), 'w', encoding='utf-8').write(dumps({'tasks': tasks}))
    open(os.path.join(HERE, 'dropped.json'), 'w', encoding='utf-8').write(dumps(
        {'seed': SEED, 'dropped_count': len(dropped), 'generation_stats': stats, 'dropped': dropped}))
    from collections import Counter
    print(len(tasks), 'tasks;', len(dropped), 'dropped')
    print(dict(Counter(t['category'] for t in tasks)))
    print(dict(Counter(t['expected']['status'] for t in tasks)))


if __name__ == '__main__':
    main()
