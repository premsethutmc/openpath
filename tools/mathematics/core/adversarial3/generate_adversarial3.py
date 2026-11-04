#!/usr/bin/env python3
"""Seeded generator for the H3 held-out adversarial corpus (seed 20261030).

Label route (generator): own tokenizer/parser -> SymPy expressions; the solution set of a line is the set of
rational real roots of the numerator of together(L-R) minus the line's domain.  The checker
(check_adversarial3.py) uses a different route (AST + Fraction substitution on a critical-point grid,
cross-checked with solveset) and shares no code with this file; the generator asserts that both routes agree
on every task before keeping it.
"""
import sys, os, re, json, random
from fractions import Fraction as F
from math import gcd, isqrt
try:
    import sympy
except ImportError:
    sys.path[:0] = ['/home/claude/vendor/sympy', '/home/claude/vendor/mpmath']
    import sympy

SEED = 20261030
HERE = os.path.dirname(os.path.abspath(__file__))
X = sympy.Symbol('x')


class Bad(Exception):
    """unreadable or out of scope (label 'unsupported')."""


# ---------------------------------------------------------------- tokenizer / parser
UNI = {'−': '-', '–': '-', '—': '-', '×': '*', '·': '*', '⋅': '*', '÷': '/', '∕': '/'}
TOKRE = re.compile(r'\s*(\d+\.\d*|\.\d+|\d+|[A-Za-z]+|\S)')
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
        if not (t == 'x' or isnum(t) or (len(t) == 1 and t in '+-*/^()=')):
            raise Bad('token ' + t)
    for a, b in zip(toks, toks[1:]):
        if (isnum(a) or a == 'x') and isnum(b):
            raise Bad('adjacent')
        if a == 'x' and b == 'x':
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


# ---------------------------------------------------------------- sets: ('fin', frozenset) | ('cof', frozenset of holes)
def fr(r):
    r = sympy.Rational(r)
    return F(int(r.p), int(r.q))


def rat_roots(expr):
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


def s_minus(S, pts):
    pts = frozenset(pts)
    if S[0] == 'fin':
        return ('fin', S[1] - pts)
    return ('cof', S[1] | pts)


def subset(a, b):
    (ka, va), (kb, vb) = a, b
    if ka == 'fin' and kb == 'fin':
        return va <= vb
    if ka == 'fin':
        return not (va & vb)
    if kb == 'fin':
        return False
    return vb <= va


def transition(prev, cur, truth):
    if cur == prev:
        return 'equivalent'
    if subset(prev, cur):
        if prev[0] == 'fin' and cur[0] == 'cof':
            return 'invalid'
        return 'valid-with-obligation'
    if subset(cur, prev):
        return 'valid-discharge' if subset(truth, cur) else 'invalid'
    return 'invalid'


def const_value(toks, tight):
    v, d = parse_side(toks, tight)
    if v.has(X) or not v.is_Rational:
        raise Bad('not const')
    return fr(v)


def const_text(text, tight):
    return const_value(tokenize(text), tight)


class Info:
    """what a parsed ordinary line offers: its set, a literal claim, and parts/dens for evaluation."""
    pass


def holds_at(info, c):
    """True / False / None (undefined) for a parsed equation line at x = c (Fraction)."""
    cc = sympy.Rational(c.numerator, c.denominator)
    for d in info.dens:
        if d.subs(X, cc) == 0:
            return None
    return any(sympy.simplify(L.subs(X, cc) - R.subs(X, cc)) == 0 for L, R in info.parts)


def analyse(text, tight, excl):
    """-> Info (kind 'set') or a case record (kind 'case')."""
    t = text.strip().replace('≠', '!=')
    low = t.lower().rstrip('.')
    I = Info()
    I.kind, I.parts, I.dens, I.claim = 'set', [], [], None
    if low in ('no solution', 'no solutions'):
        I.S, I.claim = ('fin', frozenset()), ('fin', frozenset())
        return I
    m = re.fullmatch(r'all real numbers(?: except (.+))?', low)
    if m:
        ex = set()
        if m.group(1):
            for piece in re.split(r',| and ', m.group(1)):
                ex.add(const_text(piece, tight))
        I.S, I.claim = ('cof', frozenset(set(excl) | ex)), ('cof', frozenset(ex))
        return I
    m = re.match(r'case\s+x\s*(=|!=)\s*([^:]+?)\s*:\s*(.*)$', t, re.I | re.S)
    if m:
        I.kind, I.op, I.c = 'case', m.group(1), const_text(m.group(2), tight)
        body = m.group(3).strip()
        I.body = None if body.lower().rstrip('.') == 'excluded' else body
        if I.body is not None:
            I.E = analyse(I.body, tight, excl)
            if I.E.kind != 'set' or not I.E.parts:
                raise Bad('case body')
        return I
    pieces = re.split(r'\s*,\s*(?=x\s*!=)', t)
    restr = set()
    for rp in pieces[1:]:
        mm = re.fullmatch(r'x\s*!=\s*(.+)', rp.strip())
        if not mm:
            raise Bad('restriction')
        restr.add(const_text(mm.group(1), tight))
    roots, allr, claimvals, isclaim = set(), False, set(), not restr
    for p in re.split(r'\s+or\s+', pieces[0].strip()):
        L, R, d, lt, rt = parse_eq(p, tight)
        I.parts.append((L, R))
        I.dens += d
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
    dom = set(excl) | zero_set(I.dens)
    S = S_of(None if allr else roots, dom)
    I.S = s_minus(S, restr) if restr else S
    I.claim = ('fin', frozenset(claimvals)) if isclaim else None
    return I


def label_task(problem, lines, tight, pairwise=False):
    pL, pR, pd, _, _ = parse_eq(problem, tight)
    excl = zero_set(pd)
    truth = S_of(eq_roots(pL, pR), excl)
    P0 = Info()
    P0.parts, P0.dens = [(pL, pR)], pd
    prev, R = truth, frozenset()
    Lraw, Linfo = truth, P0
    labels, flags, unsup = [], [], []
    seen, have_prev = False, True
    for i, l in enumerate(lines, 1):
        try:
            I = analyse(l, tight, excl)
        except Bad:
            labels.append('unsupported')
            unsup.append(i)
            seen, have_prev = True, False
            continue
        if seen and not pairwise:
            labels.append('not-assessed')
            continue
        if I.kind == 'case':
            if seen:
                labels.append('not-assessed')
                continue
            c = I.c
            if I.op == '=':
                if I.body is None:
                    valid = c in excl
                else:
                    E = I.E
                    if any(L.has(X) or Rr.has(X) for L, Rr in E.parts) or c in excl or not Linfo.parts:
                        valid = False
                    else:
                        hl = holds_at(Linfo, c)
                        valid = hl is not None and (holds_at(E, c) is True) == (hl is True)
                labels.append('equivalent' if valid else 'invalid')
            else:
                if I.body is None:
                    labels.append('invalid')
                    continue
                valid = s_minus(I.E.S, {c}) == s_minus(Lraw, {c})
                labels.append('equivalent' if valid else 'invalid')
                R = R | {c}
                prev = s_minus(I.E.S, R)
            continue
        cur = s_minus(I.S, R)
        Lraw = I.S
        Linfo = I
        if not have_prev:
            labels.append('not-assessed')
            prev, have_prev = cur, True
            continue
        lab = transition(prev, cur, s_minus(truth, R))
        labels.append(lab)
        if lab in ('valid-with-obligation', 'valid-discharge'):
            flags.append({'line': i, 'flag': lab})
        prev = cur
    verdict = 'no-claim'
    try:
        I = analyse(lines[-1], tight, excl)
        if I.kind == 'set' and I.claim is not None:
            verdict = 'correct' if I.claim == truth else 'wrong'
    except Bad:
        pass
    fi = next((i for i, l in enumerate(labels, 1) if l == 'invalid'), None)
    inv_at = 'step' if fi else None
    if unsup:
        status, fi, inv_at = 'unsupported', None, None
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


# ================================================================ polynomials & rendering (ascending coefficient lists)
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
    """a*x + b"""
    return ptrim([F(b), F(a)])


def pdiv_root(p, a):
    """quotient of p by (x - a) (exact division assumed)."""
    p = ptrim(p)
    n = len(p) - 1
    q = [F(0)] * n
    carry = F(0)
    for i in range(n, 0, -1):
        carry = p[i] + carry * F(a)
        q[i - 1] = carry
    return ptrim(q)


def dec_txt(q):
    q = F(q)
    d = q.denominator
    for k in range(1, 6):
        if 10 ** k % d == 0:
            v = abs(q.numerator) * (10 ** k // d)
            t = str(v).rjust(k + 1, '0')
            return t[:-k] + '.' + t[-k:]
    return None


def num_txt(q, rng, allow_dec=True):
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
        out += ('-' if neg else '') + t if j == 0 else ('-' if neg else '+') + t
    return out


def pw(p, rng, order='desc'):
    p = ptrim(p)
    ks = [k for k in range(len(p)) if p[k] != 0]
    s = ptxt(p, rng, order)
    if len(ks) <= 1 and (not ks or p[ks[0]] > 0) and '/' not in s:
        return s
    return '(' + s + ')'


def xm(a):
    """text of the factor (x - a) for integer a."""
    a = F(a)
    assert a.denominator == 1
    a = int(a)
    if a == 0:
        return 'x'
    return '(x%s%d)' % ('-' if a > 0 else '+', abs(a))


def nest_lin(a, b, rng):
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


def rint(rng, R, nz=True):
    while True:
        v = rng.randint(-R, R)
        if v or not nz:
            return v


# ---------------------------------------------------------------- claims
def x_eq(c, rng):
    c = F(c)
    neg = c < 0
    a = abs(c)
    p, q = a.numerator, a.denominator
    pq = str(p) if q == 1 else '%d/%d' % (p, q)
    sg = '-' if neg else ''
    opts = ['x = ' + sg + pq, 'x=' + sg + pq, 'x = (' + sg + pq + ')', sg + pq + ' = x',
            'x = ' + ('-(' + pq + ')' if neg else pq), 'x  =  ' + sg + pq, 'x = ' + sg + pq]
    dt = dec_txt(a)
    if dt and q != 1:
        opts += ['x = ' + sg + dt]
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
    if len(ex) > 1:
        return 'all real numbers except ' + rng.choice([', ', ' and ']).join(fstr(v) for v in ex)
    return 'all real numbers except ' + fstr(ex[0])


def neq(rng):
    return rng.choice(['≠', '≠', '!='])


def cond_txt(op, c, rng):
    """'x = c' / 'x ≠ c' condition text."""
    cs = fstr(c)
    if op == '=':
        return rng.choice(['x = ' + cs, 'x=' + cs])
    n = neq(rng)
    return rng.choice(['x %s %s' % (n, cs), 'x%s%s' % (n, cs)])


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
            okr = r == 'x' or r == '('
            if l == 'x' and r == 'x':
                okr = False
            ls = operand_start(toks, i - 1)
            prev = toks[ls - 1] if ls > 0 else None
            if okl and okr and prev not in ('/', '^') and not (isnum(l) and prev == '.'):
                continue
        out.append(t)
    return out


def render(toks, rng, spacing):
    s = ''
    for i, t in enumerate(toks):
        if i == 0:
            s = t
            continue
        prev = toks[i - 1]
        if spacing == 'none':
            g = ''
        elif spacing == 'norm':
            valprev = isnum(prev) or prev in ('x', ')')
            g = ' ' if (t == '=' or prev == '=' or (t in ('+', '-') and valprev) or (prev in ('+', '-') and i >= 2 and (isnum(toks[i - 2]) or toks[i - 2] in ('x', ')')))) else ''
        else:
            g = ' ' * rng.choice([0, 0, 1, 1, 2])
        s += g + t
    return s


def restyle(line, rng, implicit=False, spacing='norm'):
    low = line.strip().lower()
    if low.startswith(('no solution', 'all real', 'case')):
        return line
    pieces = re.split(r'\s+or\s+', line.strip())
    out = []
    for p in pieces:
        toks = split_math(p)
        if implicit:
            toks = implicitize(toks)
        out.append(render(toks, rng, spacing))
    return ' or '.join(out)


def pick_surface(rng, line):
    imp = rng.random() < 0.4
    sp = rng.choice(['none', 'norm', 'norm', 'odd'])
    return restyle(line, rng, imp, sp)


GLYPH_MINUS = ['−', '–']
GLYPH_MUL = ['×', '⋅']
GLYPH_DIV = ['÷', '∕']


def glyphify(line, rng):
    """character-level glyph substitution + spacing/parenthesis variants (meaning preserved)."""
    low = line.strip().lower()
    out = []
    for i, ch in enumerate(line):
        if ch == '-':
            out.append(rng.choice(GLYPH_MINUS) if rng.random() < 0.85 else ch)
        elif ch == '*':
            out.append(rng.choice(GLYPH_MUL) if rng.random() < 0.85 else ch)
        elif ch == '/':
            out.append(rng.choice(GLYPH_DIV) if rng.random() < 0.85 else ch)
        else:
            out.append(ch)
    s = ''.join(out)
    # redundant parentheses around some plain integer literals (never exponents / decimals)
    if not low.startswith(('no solution', 'all real')):
        s = re.sub(r'(?<![\w.^(])(\d+)(?![\w.(])', lambda m: '(%s)' % m.group(1) if rng.random() < 0.18 else m.group(1), s)
    # extra spacing around some operator glyphs
    s = re.sub(r'(?<=\S)([⋅×÷∕−–+])(?=\S)', lambda m: (' ' + m.group(1) + ' ') if rng.random() < 0.35 else m.group(1), s)
    return s


GLYPHS = '⋅∕×÷−–'


def has_glyph(lines):
    return sum(ch in GLYPHS for ch in ''.join(lines))


# ================================================================ task draft
class T:
    def __init__(s, cat, tag, problem, status, first_invalid=None, error_class=None, note='', amb=None):
        s.cat, s.tag, s.problem = cat, tag, problem
        s.status, s.first_invalid, s.error_class, s.note, s.amb = status, first_invalid, error_class, note, amb
        s.items = []
        s.post = None

    def L(s, text, fixed=False):
        s.items.append((text, fixed))
        return s

    def C(s, text):
        return s.L(text, True)

    def n(s):
        return len(s.items)


def finish(t, rng):
    lines = []
    for text, fixed in t.items:
        lines.append(text if fixed else pick_surface(rng, text))
    return lines


def S(eq, rng):
    """surface a bare equation for embedding in a composed (fixed) line."""
    return pick_surface(rng, eq)


# ================================================================ linear equation maker
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


def lin_setup(rng):
    R = rng.choice([6, 9, 20, 60])
    return lin_eq(rng, R, frac=rng.random() < 0.3, nest=rng.random() < 0.4)


def roots_of(P):
    """rational roots for deg 1/2 (with multiplicity); [] if none real; None if irrational / unsuitable."""
    P = ptrim(P)
    if len(P) == 2:
        return [-P[0] / P[1]]
    if len(P) == 3:
        c, b, a = P
        d = b * b - 4 * a * c
        if d < 0:
            return []
        sn, sd = isqrt(d.numerator), isqrt(d.denominator)
        if sn * sn != d.numerator or sd * sd != d.denominator:
            return None
        s = F(sn, sd)
        return [(-b - s) / (2 * a), (-b + s) / (2 * a)]
    return None


def factored_txt(P, rng):
    rs = roots_of(P)
    c = P[-1]
    fs = []
    for r in rs:
        p, q = r.numerator, r.denominator
        fs.append(pw(ptrim([F(-p), F(q)]), rng))
        c = c / q
    out = []
    if c == -1:
        out.append('-1')
    elif c != 1:
        out.append(('-' if c < 0 else '') + num_txt(c, rng, False))
    return '*'.join(out + fs)


def root_line(P, rng):
    """'p*x = q' style line for a linear polynomial (None when it would equal the claim)."""
    if len(P) != 2 or abs(P[1]) == 1:
        return None
    return '%s%s = %s' % ('-' if P[1] < 0 else '', term_txt(P[1], 1, rng), ('-' if P[0] > 0 else '') + num_txt(P[0], rng, False))


# ================================================================ category builders
# Each builder returns a T (or None when the random draw is degenerate).  The intended status is checked
# against both label routes by the driver; a mismatch is logged in dropped.json.

def pn(c):
    return '(%d)' % c if c < 0 else str(c)


def xp(b):
    """text of (x + b)."""
    return xm(-F(b))


def subs_x(text, c):
    c = F(c)
    return re.sub(r'x', '(%s)' % fstr(c), text)


def side_vals(text, c):
    """evaluate both sides of an explicit-grammar equation 'A = B' at x=c with the generator's parser."""
    L, R, _, _, _ = parse_eq(text, False)
    cc = sympy.Rational(c.numerator, c.denominator)
    return fr(L.subs(X, cc)), fr(R.subs(X, cc))


def e_text(Ltext, c, rng, force_wrong=False, simplified=None):
    """variable-free equation obtained by substituting x=c into the line 'Ltext' (explicit grammar)."""
    lv, rv = side_vals(Ltext, c)
    if force_wrong:
        rv = rv + rng.choice([1, 2, -1, 3]) if lv == rv else lv
    simp = rng.random() < 0.6 if simplified is None else simplified
    if simp or force_wrong:
        return '%s = %s' % (fstr(lv), fstr(rv))
    l, r = Ltext.split(' = ')
    return '%s = %s' % (subs_x(l, c), subs_x(r, c))


# ---------------------------------------------------------------- divide-by-variable
def dv_eq(rng):
    form = rng.choice(['a', 'a', 'b', 'c', 'd'])
    if form == 'a':
        s = F(rint(rng, 9)) * rng.choice([1, 1, 1, F(1, 2), F(1, 3)])
        c = rng.choice([1, 1, 2, 3])
        Lp, Rp = [F(0), F(0), F(c)], [F(0), c * s]
        Lt = 'x^2' if c == 1 else '%d*x^2' % c
        Rt = ptxt(Rp, rng)
        sp = F(0)
    elif form in ('b', 'c'):
        b, e = rint(rng, 9), rint(rng, 9)
        if b == e or e == 0:
            return None
        Lp, Rp = [F(0), F(b), F(1)], [F(0), F(e)]
        Lt = ('x*(x%+d)' % b) if form == 'b' else ptxt(Lp, rng)
        Rt = ptxt(Rp, rng)
        sp = F(0)
    else:
        a, c = rint(rng, 9), rint(rng, 9)
        Lp = pmul(lin(1, -a), lin(1, -a))
        Rp = pscale(lin(1, -a), c)
        Lt = xm(a) + '^2'
        Rt = '%d*%s' % (c, xm(a)) if c != 1 else xm(a)
        sp = F(a)
    P = psub(Lp, Rp)
    rs = roots_of(P)
    if rs is None or len(rs) != 2 or rs[0] == rs[1]:
        return None
    oth = [r for r in rs if r != sp]
    if len(oth) != 1 or sp not in rs:
        return None
    return dict(text='%s = %s' % (Lt, Rt), Lt=Lt, Rt=Rt, Lp=Lp, Rp=Rp, P=P, sp=sp, oth=oth[0])


def b_dv(rng, v):
    d = dv_eq(rng)
    if d is None:
        return None
    sp, oth, P = d['sp'], d['oth'], d['P']
    Lq, Rq = pdiv_root(d['Lp'], sp), pdiv_root(d['Rp'], sp)
    red = '%s = %s' % (ptxt(Lq, rng), ptxt(Rq, rng))
    D = 'x' if sp == 0 else xm(sp)
    if v == 'inv1':
        t = T('divide-by-variable', 'DV1', d['text'], 'invalid', 1, 'lost-root-division', 'divided by %s without a case split' % D)
        t.L(red).C(claim_txt([oth], rng))
    elif v == 'inv2':
        t = T('divide-by-variable', 'DV2', d['text'], 'invalid', 2, 'lost-root-division', 'moved terms, then divided by %s' % D)
        t.L('%s = 0' % ptxt(P, rng)).L('%s = 0' % ptxt(pdiv_root(P, sp), rng)).C(claim_txt([oth], rng))
    elif v == 'inv3':
        t = T('divide-by-variable', 'DV3', d['text'], 'invalid', 1, 'lost-root-division', 'wrote both sides over %s' % D)
        t.L('(%s)/%s = (%s)/%s' % (d['Lt'], D, d['Rt'], D)).L(red).C(claim_txt([oth], rng))
    elif v == 'inv4':     # divided, then "forgets" the zero root exists but reports only one value in words of a claim
        t = T('divide-by-variable', 'DV4', d['text'], 'invalid', 2, 'lost-root-division', 'factored, then divided by the factor %s' % D)
        t.L('%s*(%s) = 0' % (D, ptxt(pdiv_root(P, sp), rng))).L('%s = 0' % ptxt(pdiv_root(P, sp), rng)).C(claim_txt([oth], rng))
        # first line is correct (factored); second line is the division
    elif v == 'val1':
        t = T('divide-by-variable', 'DV5', d['text'], 'valid-complete', note='moved to one side, factored, no division')
        t.L('%s = 0' % ptxt(P, rng)).L('%s = 0' % factored_txt(P, rng)).C(claim_txt([sp, oth], rng))
    elif v == 'val2':
        t = T('divide-by-variable', 'DV6', d['text'], 'valid-complete', note='factored directly; zero-product')
        t.L('%s = 0' % factored_txt(P, rng)).C(claim_txt([sp, oth], rng))
    elif v == 'inc':
        t = T('divide-by-variable', 'DV7', d['text'], 'valid-incomplete', note='stops at the factored form')
        t.L('%s = 0' % ptxt(P, rng)).L('%s = 0' % factored_txt(P, rng))
    else:
        raise ValueError(v)
    return t


# ---------------------------------------------------------------- multiply-by-possibly-zero
def rp_sides(pr):
    return pr['ltxt'], pr['rtxt']


def b_mz(rng, v):
    kind, mode = v
    if kind == 'lin':
        e = lin_setup(rng)
        if not e:
            return None
        r, A, B = e['r'], e['A'], e['B']
        m = rint(rng, 12, False) if rng.random() < 0.8 else 0
        if F(m) == r:
            return None
        P = psub(A, B)
        mt = xm(m)
        base = [('%s*(%s) = %s*(%s)' % (mt, e['ta'], mt, e['tb']), False)]
        if rng.random() < 0.7 or mode in ('stop2',):
            base.append(('%s*(%s) = 0' % (mt, ptxt(P, rng)), False))
        prob, vals_true, extra = e['text'], [r], m
    elif kind == 'rat':
        pr = make_rp(rng, layout=rng.choice(['fl', 'cross', 'same', 'cl']), want='clean')
        if pr is None:
            return None
        vr = sorted(set(pr['roots']) - set(pr['excl']))
        cands = [c for c in range(-10, 11) if F(c) not in set(pr['roots']) | set(pr['excl'])]
        m = rng.choice(cands)
        mt = xm(m)
        base = [('%s*(%s) = %s*(%s)' % (mt, pr['ltxt'], mt, pr['rtxt']), False)]
        prob, vals_true, extra = pr['text'], vr, m
    elif kind == 'sq':
        e = lin_setup(rng)
        if not e:
            return None
        A, B = e['A'], e['B']
        Ssum = padd(A, B)
        if len(Ssum) < 2:
            return None
        r = e['r']
        r2 = -Ssum[0] / Ssum[1]
        if r2 == r:
            return None
        Dm = psub(A, B)
        base = [('(%s)^2 = (%s)^2' % (e['ta'], e['tb']), False)]
        if rng.random() < 0.7:
            base.append(('(%s)*(%s) = 0' % (ptxt(Dm, rng), ptxt(Ssum, rng)), False))
        prob, vals_true, extra = e['text'], [r], r2
    elif kind == 'zero':
        e = lin_setup(rng)
        if not e:
            return None
        z = rng.choice(['0', '(%d-%d)' % (k := rng.randint(2, 9), k), '(x-x)'])
        t = T('multiply-by-possibly-zero', 'MZ-zero', e['text'], 'invalid', 1, 'multiplied-by-zero',
              'multiplied both sides by %s' % z)
        t.L('%s*(%s) = %s*(%s)' % (z, e['ta'], z, e['tb'])).L('0 = 0').C(rng.choice(['all real numbers', 'All real numbers']))
        return t
    else:
        raise ValueError(kind)
    t = T('multiply-by-possibly-zero', 'MZ-%s-%s' % (kind, mode), prob, 'valid-complete',
          note='%s: gained root %s' % (kind, fstr(extra)))
    for tx, fx in base:
        t.L(tx, fx)
    tv = list(vals_true)
    if mode == 'accept':
        t.C(claim_txt(tv + [extra], rng))
        t.status, t.error_class, t.first_invalid = 'invalid', 'extraneous-root-accepted', t.n()
    elif mode == 'discharge':
        if rng.random() < 0.5:
            t.C(claim_txt(tv + [extra], rng))
        t.C(claim_txt(tv, rng))
    elif mode == 'stop':
        t.status = 'valid-incomplete'
    elif mode == 'lost':
        t.C(claim_txt([extra], rng))
        t.status, t.error_class, t.first_invalid = 'invalid', 'rejected-valid-root', t.n()
    else:
        raise ValueError(mode)
    return t


# ---------------------------------------------------------------- cancellation
def b_cn(rng, v):
    a, b, c = rint(rng, 9), rint(rng, 9, False), rint(rng, 9)
    if v == 'eq':
        if F(a) == c - b:
            return None
        prob = '%s*%s = %s*%s' % (xm(a), xp(b), xm(a), pn(c))
        t = T('cancellation', 'CN1', prob, 'invalid', 1, 'lost-root-cancellation', 'cancelled the factor %s' % xm(a))
        t.L('%s = %d' % (ptxt(lin(1, b), rng), c)).C(claim_txt([c - b], rng))
    elif v == 'sq':
        if c == 0:
            return None
        prob = '%s^2 = %s*%s' % (xm(a), pn(c), xm(a))
        t = T('cancellation', 'CN2', prob, 'invalid', 1, 'lost-root-cancellation', 'cancelled one factor of the square')
        t.L('%s = %d' % (xm(a), c)).C(claim_txt([a + c], rng))
    elif v == 'both':
        d = rint(rng, 9, False)
        if b == d:
            return None
        prob = '%s*%s = %s*%s' % (xm(a), xp(b), xm(a), xp(d))
        t = T('cancellation', 'CN3', prob, 'invalid', 1, 'lost-root-cancellation', 'cancelled the factor %s' % xm(a))
        t.L('%s = %s' % (ptxt(lin(1, b), rng), ptxt(lin(1, d), rng))).C('no solution')
    elif v == 'frac':
        d = rint(rng, 9, False)
        cc = rint(rng, 9, False)
        if len({a, cc}) < 2 or F(a) == d - b or F(cc) == d - b or F(cc) == a:
            return None
        prob = '%s*%s/%s = %s*%s/%s' % (xm(a), xp(b), xm(cc), xm(a), pn(d), xm(cc))
        t = T('cancellation', 'CN4', prob, 'invalid', 2, 'lost-root-cancellation',
              'cleared the denominator (fine) then cancelled %s (loses %d)' % (xm(a), a))
        t.L('%s*%s = %s*%d' % (xm(a), xp(b), xm(a), d)).L('%s = %d' % (ptxt(lin(1, b), rng), d)).C(claim_txt([d - b], rng))
    elif v == 'term':
        if a == 0 or c == 1:
            return None
        prob = '(x+%d)/x = %d' % (a, c) if a > 0 else '(x-%d)/x = %d' % (-a, c)
        t = T('cancellation', 'CN5', prob, 'invalid', 1, 'illegal-term-cancellation', 'cancelled x against a single term')
        t.L('%d = %d' % (a, c)).C(rng.choice(['no solution', 'all real numbers']))
    elif v == 'ctl-num':
        k = rng.choice([2, 3, 4, 5, -2, -3])
        e = lin_setup(rng)
        if not e:
            return None
        prob = '%d*(%s) = %d*(%s)' % (k, e['ta'], k, e['tb'])
        t = T('cancellation', 'CN6', prob, 'valid-complete', note='cancelled a nonzero numeric factor')
        t.L(e['text']).C(claim_txt([e['r']], rng))
    elif v == 'ctl-den':
        if F(a) == c - b:
            return None
        prob = '%s*%s/%s = %d' % (xm(a), xp(b), xm(a), c)
        t = T('cancellation', 'CN7', prob, 'valid-complete', note='cancelled a factor that is an original denominator')
        t.L('%s = %d' % (ptxt(lin(1, b), rng), c)).C(claim_txt([c - b], rng))
    elif v == 'ctl-prod':
        d = rint(rng, 9)
        cc = rint(rng, 9, False)
        if a == cc or d == 1:
            return None
        den = F(1 - d)
        xr = (-b - d * cc) / den
        prob = '(%s*%s)/(%s*%s) = %d' % (xm(a), xp(b), xm(a), xm(cc), d)
        t = T('cancellation', 'CN8', prob, 'valid-complete', note='cancelled %s present in the denominator' % xm(a))
        t.L('%s/%s = %d' % (xp(b), xm(cc), d)).L('%s = %d*%s' % (ptxt(lin(1, b), rng), d, xm(cc)))
        ok = xr not in (F(a), F(cc))
        t.C(claim_txt([xr] if ok else [], rng))
    elif v == 'inc':
        d = rint(rng, 9, False)
        cc = rint(rng, 9, False)
        if a == cc or F(a) == d - b:
            return None
        prob = '%s*%s/%s = %s*%s/%s' % (xm(a), xp(b), xm(cc), xm(a), pn(d), xm(cc))
        t = T('cancellation', 'CN9', prob, 'valid-incomplete', note='clears the denominator only')
        t.L('%s*%s = %s*%d' % (xm(a), xp(b), xm(a), d))
    else:
        raise ValueError(v)
    return t


# ---------------------------------------------------------------- removable singularity
def b_rs(rng, v):
    a = rint(rng, 9, False) if rng.random() < 0.85 else 0
    p = rng.choice([1, 1, 1, 2, 3, -1])
    q = rint(rng, 9, False)
    f = lin(p, q)
    N = pmul(f, lin(1, -a))
    typ = rng.choice(['id', 'const', 'const', 'lin'])
    if typ == 'id':
        G = f
    elif typ == 'const':
        cc = rint(rng, 12)
        if rng.random() < 0.5:
            cc = p * a + q                       # forces the root onto the removable point
        G = ptrim([F(cc)])
    else:
        G = lin(rng.choice([1, 2, -1, 3]), rint(rng, 9, False))
        if psub(f, G) == [] or len(psub(f, G)) < 2:
            return None
    prob = '%s/%s = %s' % (pw(N, rng), xm(a), ptxt(G, rng))
    diff = psub(f, G)
    if typ == 'id':
        truth_vals, kind = None, 'id'
    else:
        if len(diff) < 2:
            return None
        r0 = -diff[0] / diff[1]
        truth_vals = [] if r0 == a else [r0]
        kind = 'fin'
    fG = '%s = %s' % (ptxt(f, rng), ptxt(G, rng))
    rtxt = ', x %s %s' % (neq(rng), a) if rng.random() < 0.7 else ', x%s%d' % (neq(rng), a)
    claim_ok = all_txt([a], rng) if typ == 'id' else claim_txt(truth_vals, rng)
    if kind == 'id':
        naive = rng.choice(['all real numbers', 'All real numbers'])
    else:
        naive = claim_txt([r0], rng)
    pre = '%s*%s/%s = %s' % (pw(f, rng), xm(a), xm(a), ptxt(G, rng))
    t = None
    if v == 'keep':
        t = T('removable-singularity', 'RS1', prob, 'valid-complete', note='restriction x != %d kept' % a)
        if rng.random() < 0.4:
            t.L(pre)
        t.C(fG + rtxt)
        t.C(claim_ok)
    elif v == 'keep-short':
        t = T('removable-singularity', 'RS2', prob, 'valid-incomplete', note='simplifies with the restriction kept; no final claim')
        if rng.random() < 0.4:
            t.L(pre)
        t.C(fG + rtxt)
    elif v == 'quiet':
        t = T('removable-singularity', 'RS3', prob, 'valid-complete', note='simplifies, final claim states the exclusion')
        t.L(fG)
        t.C(claim_ok)
    elif v == 'drop':
        if not (kind == 'id' or truth_vals == []):
            return None
        t = T('removable-singularity', 'RS4', prob, 'invalid', None, 'removable-singularity-ignored',
              'restriction dropped; final claim ignores x != %d' % a)
        t.L(fG)
        t.C(naive)
        t.first_invalid = t.n()
    elif v == 'wrong-restriction':
        if kind == 'fin':
            if not truth_vals or truth_vals[0].denominator != 1:
                return None
            w = int(truth_vals[0])
        else:
            w = rng.choice([x for x in range(-9, 10) if x != a])
        t = T('removable-singularity', 'RS5', prob, 'invalid', None, 'wrong-restriction',
              'restriction x != %d does not match the singular point %d' % (w, a))
        t.C(fG + ', x %s %d' % (neq(rng), w))
        t.first_invalid = 1
    else:
        raise ValueError(v)
    return t


# ---------------------------------------------------------------- explicit case split
def b_cs(rng, v):
    kind, mode = v
    if kind == 'dv':
        d = dv_eq(rng)
        if d is None:
            return None
        sp, oth, P = d['sp'], d['oth'], d['P']
        Lq, Rq = pdiv_root(d['Lp'], sp), pdiv_root(d['Rp'], sp)
        branch = '%s = %s' % (ptxt(Lq, rng), ptxt(Rq, rng))
        Ltext, prob = d['text'], d['text']
        pre = []
        if rng.random() < 0.4:
            Ltext = '%s = 0' % ptxt(P, rng)
            pre = [Ltext]
        roots_all = [sp, oth]
        bchain = [('x = %s' % fstr(oth), False)]
    elif kind == 'fac':
        a, b, c = rint(rng, 9), rint(rng, 9, False), rint(rng, 9)
        sub = rng.choice(['c', 'c', 'x'])
        if sub == 'c':
            if F(a) == c - b:
                return None
            prob = '%s*%s = %s*%s' % (xm(a), xp(b), xm(a), pn(c))
            branch = '%s = %d' % (ptxt(lin(1, b), rng), c)
            roots_all = [F(a), F(c - b)]
            bchain = [('x = %d' % (c - b), False)]
        else:
            d2 = rint(rng, 9, False)
            if b == d2:
                return None
            prob = '%s*%s = %s*%s' % (xm(a), xp(b), xm(a), xp(d2))
            branch = '%s = %s' % (ptxt(lin(1, b), rng), ptxt(lin(1, d2), rng))
            roots_all = [F(a)]
            bchain = []
        sp = F(a)
        Ltext = prob
        pre = []
        oth = roots_all[-1]
    elif kind == 'rat':
        a = rint(rng, 9, False)
        p = rng.choice([1, 1, 2, -1])
        q = rint(rng, 9, False)
        cc = rint(rng, 12) if rng.random() < 0.6 else p * a + q
        f = lin(p, q)
        N = pmul(f, lin(1, -a))
        prob = '%s/%s = %d' % (pw(N, rng), xm(a), cc)
        r0 = F(cc - q, p)
        sp = F(a)
        Ltext = prob
        pre = []
        branch = '%s = %d' % (ptxt(f, rng), cc)
        roots_all = [] if r0 == a else [r0]
        bchain = [] if r0 == a else [('x = %s' % fstr(r0), False)]
        oth = r0
    else:
        raise ValueError(kind)
    excluded_point = (kind == 'rat')

    def eq_case(wrong=False):
        if excluded_point:
            if wrong:
                return 'case %s: %s' % (cond_txt('=', sp, rng), '0 = %d' % rng.randint(0, 3))
            return 'case %s: excluded' % cond_txt('=', sp, rng)
        return 'case %s: %s' % (cond_txt('=', sp, rng), e_text(Ltext, sp, rng, force_wrong=wrong))

    def neq_case(wrong=False):
        br = branch
        if wrong:
            if kind == 'dv':
                br = '%s = %s' % (ptxt(Lq, rng), ptxt(padd(Rq, [F(rng.choice([1, 2, -1, -3]))]), rng))
            else:
                br = branch.rsplit(' = ', 1)[0] + ' = %d' % (int(branch.rsplit(' = ', 1)[1]) + rng.choice([1, 2, -1, 3]))
        return 'case %s: %s' % (cond_txt('!=', sp, rng), br)

    base_status = {'ok': 'valid-complete', 'short': 'valid-incomplete', 'drop': 'invalid', 'falsecase': 'invalid',
                   'wrongbranch': 'invalid', 'inclfalse': 'invalid', 'nodiv': 'invalid'}[mode]
    t = T('explicit-case-split', 'CS-%s-%s' % (kind, mode), prob, base_status, note='case split on x = %s (%s)' % (fstr(sp), mode))
    for p_ in pre:
        t.L(p_)
    true_roots = roots_all
    if mode in ('ok', 'short'):
        t.C(eq_case()).C(neq_case())
        if mode == 'ok' and bchain and rng.random() < 0.5:
            t.L(bchain[0][0])
        if mode == 'ok':
            t.C(claim_txt(true_roots if not excluded_point else true_roots, rng))
    elif mode == 'drop':
        t.C(neq_case())
        if bchain and rng.random() < 0.5:
            t.L(bchain[0][0])
        t.C(claim_txt([r for r in true_roots if r != sp] if not excluded_point else true_roots, rng))
        if excluded_point:
            return None
        t.error_class = 'dropped-case'
        t.first_invalid = t.n()
    elif mode == 'falsecase':
        t.C(eq_case(wrong=True)).C(neq_case()).C(claim_txt(true_roots, rng))
        t.error_class, t.first_invalid = 'false-case-statement', 1 + len(pre)
    elif mode == 'wrongbranch':
        t.C(eq_case()).C(neq_case(wrong=True)).C(claim_txt(true_roots, rng))
        t.error_class, t.first_invalid = 'wrong-branch', 2 + len(pre)
    elif mode == 'inclfalse':
        if not excluded_point:
            return None
        t.C(eq_case()).C(neq_case()).C(claim_txt([sp] + true_roots, rng))
        t.error_class = 'false-case-root-included'
        t.first_invalid = t.n()
    elif mode == 'nodiv':
        if excluded_point:
            return None
        # divides first (invalid), then patches with a case line
        t.L(branch)
        t.error_class, t.first_invalid = 'lost-root-division', 1 + len(pre)
        t.C(eq_case())
        t.C(claim_txt(true_roots, rng))
    return t


# ---------------------------------------------------------------- introduced denominator
def b_id(rng, v):
    kind, mode = v
    if kind == 'lin':
        e = lin_setup(rng)
        if not e:
            return None
        r = e['r']
        ta, tb, prob = e['ta'], e['tb'], e['text']
        solve = [(e['text'], False)]
        vals = [r]
        excl = set()
        if mode == 'lost':
            if r.denominator != 1:
                return None
            m = int(r)
        else:
            m = ok_int(rng, 15, {r})
    else:
        pr = make_rp(rng, layout=rng.choice(['fl', 'cross', 'same']), want='clean')
        if pr is None:
            return None
        vr = sorted(set(pr['roots']) - set(pr['excl']))
        ta, tb, prob = pr['ltxt'], pr['rtxt'], pr['text']
        solve = [(prob, False)]
        vals = vr
        excl = set(pr['excl'])
        if mode == 'lost':
            ints = [x for x in vr if x.denominator == 1]
            if not ints:
                return None
            m = int(rng.choice(ints))
        else:
            m = ok_int(rng, 12, set(pr['roots']))
    if m is None:
        return None
    mt = xm(m)
    sty = rng.choice(['over', 'over', 'times'])
    if sty == 'over':
        l1 = '(%s)/%s = (%s)/%s' % (ta, mt, tb, mt)
    else:
        l1 = '(%s)*%s/%s = (%s)*%s/%s' % (ta, mt, mt, tb, mt, mt)
    if mode == 'lost':
        t = T('introduced-denominator', 'ID1', prob, 'invalid', 1, 'introduced-denominator-lost-root',
              'both sides over %s where %d is the root' % (mt, m))
        t.L(l1).L(prob)
        t.C(claim_txt(vals, rng))
    elif mode == 'ok':
        t = T('introduced-denominator', 'ID2', prob, 'valid-complete', note='both sides over %s, multiplied back; %d is not a root' % (mt, m))
        t.L(l1).L(prob)
        t.C(claim_txt(vals, rng))
    elif mode == 'short':
        t = T('introduced-denominator', 'ID3', prob, 'valid-incomplete', note='both sides over %s, multiplied back, stops' % mt)
        t.L(l1).L(prob)
    elif mode == 'nomult':
        t = T('introduced-denominator', 'ID4', prob, 'valid-complete', note='introduces and removes %s; %d is not a root' % (mt, m))
        t.L(l1).L(prob)
        t.C(claim_txt(vals, rng))
    else:
        raise ValueError(mode)
    return t


def ok_int(rng, R, avoid):
    for _ in range(100):
        v = rint(rng, R) if rng.random() < 0.9 else 0
        if F(v) not in avoid:
            return v
    return None


# ================================================================ rational-equation engine
def lcm(a, b):
    return a * b // gcd(a, b)


def mk_N(rng):
    p = rng.choice([0, 1, 1, 2, 3, -1, -2, 4, -3])
    q = rint(rng, 9, False)
    return lin(p, q) if p else ptrim([F(q)])


def rp_cof(d, Lc, A):
    if d is None:
        c, fac = Lc, list(A)
    elif d[0] == 'c':
        c, fac = Lc // d[1], list(A)
    else:
        c, fac = Lc, [a for a in A if a != d[1]]
    p = [F(c)]
    for a in fac:
        p = pmul(p, lin(1, -a))
    return p, c, fac


def den_txt(d):
    return xm(d[1]) if d[0] == 'l' else str(d[1])


def side_txt(terms, rng):
    out = ''
    for j, (sg, N, d) in enumerate(terms):
        body = ptxt(N, rng) if d is None else pw(N, rng) + '/' + den_txt(d)
        out += (('-' if sg < 0 else '') if j == 0 else ('-' if sg < 0 else '+')) + body
    return out


def norm_terms(ts):
    out = []
    for (sg, N, d) in ts:
        if d is None and N and N[-1] < 0:
            sg, N = -sg, pscale(N, -1)
        out.append((sg, N, d))
    return out


def cof_pieces(c, fac):
    out = []
    if c != 1:
        out.append(str(c))
    for a in fac:
        out.append(xm(a))
    return out


def cleared(terms, Lc, A, rng, mods=None):
    mods = mods or {}
    tot, txt = [], ''
    for j, (sg, N, d) in enumerate(terms):
        cp, c, fac = rp_cof(d, Lc, A)
        s, mk = sg, mods.get(j)
        npieces = [] if N == [F(1)] else [pw(N, rng)]
        if mk == 'forget':
            if cp == [F(1)]:
                return None
            pieces, tp = npieces, N
        elif mk == 'dropfac':
            if not fac:
                return None
            f2 = fac[1:]
            c2 = [F(c)]
            for a in f2:
                c2 = pmul(c2, lin(1, -a))
            pieces, tp = npieces + cof_pieces(c, f2), pmul(N, c2)
        else:
            pieces, tp = npieces + cof_pieces(c, fac), pmul(N, cp)
            if mk == 'sign':
                s = -sg
        rng.shuffle(pieces)
        body = '*'.join(pieces) if pieces else '1'
        txt += (('-' if s < 0 else '') if j == 0 else ('-' if s < 0 else '+')) + body
        tot = padd(tot, pscale(tp, s))
    return tot, txt


def make_rp(rng, layout=None, want=None, tries=500):
    for _ in range(tries):
        lay = layout or rng.choice(['cross', 'sum', 'cl', 'fl', 'same', 'const'])
        a, b = rint(rng, 6, False) if rng.random() < 0.8 else 0, rint(rng, 6, False)
        if a == b:
            continue
        sgn = rng.choice([1, -1])
        k = rng.randint(2, 6)
        if lay == 'cross':
            lhs, rhs = [(1, mk_N(rng), ('l', a))], [(1, mk_N(rng), ('l', b))]
        elif lay == 'sum':
            lhs = [(1, mk_N(rng), ('l', a)), (sgn, mk_N(rng), rng.choice([('l', b), ('c', k)]))]
            rhs = [(1, mk_N(rng), None if rng.random() < 0.5 else ('c', k))]
        elif lay == 'cl':
            lhs = [(1, mk_N(rng), ('l', a)), (sgn, ptrim([F(rint(rng, 9, False))]), None)]
            rhs = [(1, mk_N(rng), ('l', rng.choice([a, b])))]
        elif lay == 'fl':
            lhs, rhs = [(1, mk_N(rng), ('l', a))], [(1, mk_N(rng), None)]
        elif lay == 'same':
            lhs = [(1, mk_N(rng), ('l', a)), (sgn, mk_N(rng), ('l', a))]
            rhs = [(1, mk_N(rng), None)]
        else:
            lhs = [(1, mk_N(rng), ('c', k)), (sgn, mk_N(rng), ('l', a))]
            rhs = [(1, mk_N(rng), ('c', rng.randint(2, 6)))]
        lhs, rhs = norm_terms(lhs), norm_terms(rhs)
        dens = [t[2] for t in lhs + rhs if t[2] is not None]
        Lc = 1
        for d in dens:
            if d[0] == 'c':
                Lc = lcm(Lc, d[1])
        A = sorted({d[1] for d in dens if d[0] == 'l'})
        ca = cleared(lhs, Lc, A, rng)
        cb = cleared(rhs, Lc, A, rng)
        P = psub(ca[0], cb[0])
        rs = roots_of(P)
        if rs is None or len(P) < 2:
            continue
        rs = sorted(set(rs))
        excl = set(F(x) for x in A)
        inex = [r for r in rs if r in excl]
        outex = [r for r in rs if r not in excl]
        if want == 'clean' and (inex or not outex):
            continue
        if want == 'twoclean' and (inex or len(outex) < 2):
            continue
        if want == 'extraneous' and not (inex and outex):
            continue
        if want == 'allexcl' and not (inex and not outex):
            continue
        lt, rt = side_txt(lhs, rng), side_txt(rhs, rng)
        return dict(lhs=lhs, rhs=rhs, Lc=Lc, A=A, P=P, roots=rs, excl=excl, ltxt=lt, rtxt=rt,
                    text='%s = %s' % (lt, rt))
    return None


def rat_chain(rng, pr, err=None):
    """worked solution; err in None|forget|dropfac|sign|expsign|coll|root.  -> dict(lines, roots, P) or None"""
    mods_l, mods_r = {}, {}
    if err in ('forget', 'dropfac', 'sign'):
        side = rng.choice([0, 1])
        terms = pr['lhs'] if side == 0 else pr['rhs']
        j = rng.randrange(len(terms))
        (mods_l if side == 0 else mods_r)[j] = err
    ra = cleared(pr['lhs'], pr['Lc'], pr['A'], rng, mods_l)
    rb = cleared(pr['rhs'], pr['Lc'], pr['A'], rng, mods_r)
    if ra is None or rb is None:
        return None
    l2, r2 = ra[0], rb[0]
    if err in ('forget', 'dropfac', 'sign') and psub(l2, r2) == pr['P']:
        return None
    lines = ['%s = %s' % (ra[1], rb[1])]
    if err == 'expsign':
        tgt = rng.choice([0, 1])
        pp = list(l2 if tgt == 0 else r2)
        ks = [k for k in range(len(pp)) if pp[k] != 0]
        if not ks:
            return None
        k = rng.choice(ks)
        pp[k] = -pp[k]
        pp = ptrim(pp)
        l2, r2 = (pp, r2) if tgt == 0 else (l2, pp)
    od = rng.choice(['desc', 'desc', 'asc'])
    if err == 'expsign' or rng.random() < 0.85:
        lines.append('%s = %s' % (ptxt(l2, rng, od), ptxt(r2, rng, od)))
    P = psub(l2, r2)
    if err == 'coll':
        ks = [k for k in range(len(r2)) if r2[k] != 0]
        if not ks:
            return None
        k = rng.choice(ks)
        n = max(len(l2), len(r2))
        g = lambda p, i: p[i] if i < len(p) else F(0)
        P = ptrim([g(l2, i) + (g(r2, i) if i == k else -g(r2, i)) for i in range(n)])
    if len(P) < 2:
        return None
    lines.append('%s = 0' % ptxt(P, rng))
    rs = roots_of(P)
    if rs is None:
        return None
    if len(P) == 3 and rs:
        lines.append('%s = 0' % factored_txt(P, rng))
    elif len(P) == 2 and rng.random() < 0.6:
        rl = root_line(P, rng)
        if rl:
            lines.append(rl)
    rs = list(rs)
    if err == 'root':
        if not rs:
            return None
        i = rng.randrange(len(rs))
        o = rs[i]
        rs[i] = rng.choice([-o, o + 1, o - 2]) if o != 0 else F(3)
        if rs[i] == o:
            return None
    return dict(lines=lines, roots=sorted(set(rs)), P=P)


def b_re(rng, v):
    excl_want = {'ok-clean': 'clean', 'ok-excl': 'extraneous', 'nosol': 'allexcl', 'accept': 'extraneous',
                 'drop': 'twoclean', 'inc': None}.get(v, None)
    pr = make_rp(rng, want=excl_want)
    if pr is None:
        return None
    err = v if v in ('forget', 'dropfac', 'sign', 'expsign', 'coll', 'root') else None
    ch = rat_chain(rng, pr, err)
    if ch is None:
        return None
    roots = ch['roots']
    vr = [r for r in roots if r not in pr['excl']]
    t = T('rational-expressions', 'RE-' + v, pr['text'], 'valid-complete', note='rational equation, %s' % v)
    for ln in ch['lines']:
        t.L(ln)
    if v == 'ok-clean':
        t.C(claim_txt(roots, rng))
    elif v in ('ok-excl', 'nosol'):
        if rng.random() < 0.6 and roots:
            t.C(claim_txt(roots, rng))
        t.C(claim_txt(vr, rng))
    elif v == 'accept':
        t.C(claim_txt(roots, rng))
        t.status, t.error_class, t.first_invalid = 'invalid', 'extraneous-root-accepted', t.n()
    elif v == 'drop':
        t.C(claim_txt([roots[0]], rng))
        t.status, t.error_class, t.first_invalid = 'invalid', 'dropped-valid-root', t.n()
    elif v == 'inc':
        t.status = 'valid-incomplete'
    else:
        t.C(claim_txt(vr, rng))
        t.status = 'invalid'
        t.error_class = {'forget': 'forgot-to-multiply-term', 'dropfac': 'wrong-cofactor', 'sign': 'sign-error',
                         'expsign': 'expansion-sign-error', 'coll': 'collection-sign-error', 'root': 'arithmetic-error-in-root'}[v]
    return t


# ================================================================ alternative paths (correct controls)
def b_ap(rng, v):
    kind, inc = v
    if kind == 'lin':
        e = lin_setup(rng)
        if not e:
            return None
        A, B, r = e['A'], e['B'], e['r']
        P = psub(A, B)
        if len(P) != 2:
            return None
        t = T('alternative-paths', 'AP-lin', e['text'], 'valid-incomplete' if inc else 'valid-complete', note='linear, alternative route')
        route = rng.choice(['std', 'consts-first', 'one-side', 'swap', 'scaled'])
        a1, a0, b1, b0 = (A + [F(0)] * 2)[1], (A + [F(0)] * 2)[0], (B + [F(0)] * 2)[1], (B + [F(0)] * 2)[0]
        if route == 'std':
            t.L('%s = %s' % (ptxt([F(0), a1], rng), ptxt(padd([b0 - a0], [F(0), b1]), rng)))
        elif route == 'consts-first':
            t.L('%s = %s' % (ptxt([F(0), a1], rng), ptxt([b0 - a0, b1], rng)))
        elif route == 'one-side':
            t.L('%s = 0' % ptxt(P, rng))
        elif route == 'swap':
            t.L('%s = %s' % (e['tb'], e['ta']))
        else:
            k = rng.choice([2, 3, 4, -1, 5])
            t.L('%s = %s' % (ptxt(pscale(A, k), rng), ptxt(pscale(B, k), rng)))
        if route in ('std', 'consts-first', 'swap', 'scaled'):
            t.L('%s = %s' % (ptxt([F(0), P[1]], rng), ptxt([-P[0]], rng))) if rng.random() < 0.8 else None
        if not inc:
            if rng.random() < 0.5 and abs(P[1]) != 1:
                rl = root_line(P, rng)
                if rl:
                    t.L(rl)
            t.C(claim_txt([r], rng))
        else:
            # make sure the working does not already end in a bare claim
            if len(t.items) >= 1 and re.fullmatch(r'-?x\s*=\s*.*', t.items[-1][0].strip()):
                return None
        return t
    if kind == 'quad':
        r1 = F(rint(rng, 8)) * rng.choice([1, 1, F(1, 2)])
        r2 = F(rint(rng, 8)) * rng.choice([1, 1, F(1, 3)])
        if r1 == r2:
            return None
        den = r1.denominator * r2.denominator
        a2 = rng.choice([1, 1, 2, den]) if den != 1 else rng.choice([1, 1, 2, 3])
        P = pscale(pmul(lin(1, -r1), lin(1, -r2)), F(a2))
        if any(c.denominator != 1 for c in P):
            P = pscale(P, F(den))
        form = rng.choice(['all-left', 'sq-right', 'split'])
        if form == 'all-left':
            prob = '%s = 0' % ptxt(P, rng)
        elif form == 'sq-right':
            prob = '%s = %s' % (ptxt([F(0), F(0), P[2]], rng), ptxt(pscale(ptrim([P[0], P[1]]), -1), rng))
        else:
            prob = '%s = %s' % (ptxt([F(0), P[1], P[2]], rng), ptxt([-P[0]], rng))
        t = T('alternative-paths', 'AP-quad', prob, 'valid-incomplete' if inc else 'valid-complete', note='quadratic, rational roots')
        if form != 'all-left':
            t.L('%s = 0' % ptxt(P, rng))
        t.L('%s = 0' % factored_txt(P, rng))
        if not inc:
            if rng.random() < 0.5:
                t.L(' or '.join('%s = 0' % ptxt(lin(1, -r) if r.denominator == 1 else ptrim([F(-r.numerator), F(r.denominator)]), rng) for r in (r1, r2)))
            t.C(claim_txt([r1, r2], rng))
        return t
    if kind == 'rat':
        pr = make_rp(rng, layout=rng.choice(['cross', 'fl', 'same', 'cl']), want=rng.choice(['clean', 'twoclean', 'extraneous']))
        if pr is None:
            return None
        ch = rat_chain(rng, pr, None)
        if ch is None:
            return None
        vr = [r for r in ch['roots'] if r not in pr['excl']]
        t = T('alternative-paths', 'AP-rat', pr['text'], 'valid-incomplete' if inc else 'valid-complete', note='rational equation, cleared denominators')
        lines = ch['lines']
        keep = [lines[0]] + [l for l in lines[1:] if rng.random() < 0.8]
        if inc:
            keep = [l for l in keep]
        for l in keep:
            t.L(l)
        if not inc:
            t.C(claim_txt(vr, rng))
        return t
    if kind == 'special':
        sub = inc
        if sub == 'identity':
            e = lin_setup(rng)
            if not e:
                return None
            A = e['A']
            k = rng.choice([2, 3, 5])
            prob = '%d*(%s) = %s' % (k, ptxt(A, rng), ptxt(pscale(A, k), rng))
            t = T('alternative-paths', 'AP-identity', prob, 'valid-complete', note='identity: all real numbers')
            t.L('%s = %s' % (ptxt(pscale(A, k), rng), ptxt(pscale(A, k), rng))).L('0 = 0').C(rng.choice(['all real numbers', 'All real numbers']))
            return t
        if sub == 'contradiction':
            e = lin_setup(rng)
            if not e:
                return None
            A = e['A']
            d = rint(rng, 9, False)
            prob = '%s = %s' % (ptxt(A, rng), ptxt(padd(A, [F(d)]), rng))
            t = T('alternative-paths', 'AP-contradiction', prob, 'valid-complete', note='contradiction: no solution')
            t.L('0 = %d' % d).C(rng.choice(['no solution', 'No solution']))
            return t
        a = rint(rng, 9, False)
        p, q = rng.choice([1, 2, 3]), rint(rng, 9, False)
        f = lin(p, q)
        prob = '%s/%s = %s' % (pw(pmul(f, lin(1, -a)), rng), xm(a), ptxt(f, rng))
        t = T('alternative-paths', 'AP-ratident', prob, 'valid-complete', note='rational identity: all reals except %d' % a)
        t.L('%s*%s/%s = %s' % (pw(f, rng), xm(a), xm(a), ptxt(f, rng))).L('0 = 0').C(all_txt([a], rng))
        return t
    raise ValueError(kind)


# ================================================================ glyph variants
def b_gv(rng, v):
    kind = v[0]
    if kind == 'ap':
        t = b_ap(rng, v[1])
    elif kind == 'mz':
        t = b_mz(rng, ('lin', 'discharge'))
    elif kind == 'id':
        t = b_id(rng, (v[1], 'ok'))
    elif kind == 'cs':
        t = b_cs(rng, (v[1], 'ok'))
    elif kind == 'rs':
        t = b_rs(rng, 'keep')
    else:
        raise ValueError(kind)
    if t is None:
        return None
    t.cat = 'glyph-variants'
    t.tag = 'GV-' + t.tag
    t.status = t.status                    # label of the ASCII equivalent
    t.glyph = True
    if t.status not in ('valid-complete', 'valid-incomplete'):
        return None
    return t


# ================================================================ ambiguous notation
def spaced(text, rng):
    return render(split_math(text), rng, rng.choice(['none', 'norm', 'odd']))


def b_am(rng, v):
    form, ctl = v
    p, q = rng.randint(1, 9), rng.randint(2, 9)
    if form == 'half':
        p, q = 1, 2
    r = rint(rng, 9, False)
    k, m = rng.randint(1, 9), rng.randint(2, 9)
    a = rint(rng, 9, False)
    sgn = rng.choice([1, -1])
    if form in ('pqx', 'half'):
        if ctl:
            c = sgn * F(p, q)
        else:
            c = F(rint(rng, 9), rng.choice([1, 1, 2, 3]))
        if c == 0:
            return None
        prob = '%d/%dx = %s' % (p, q, fstr(c))
        lr_eq = '(%d/%d)*x = %s' % (p, q, fstr(c))
        ti_eq = '%d/(%d*x) = %s' % (p, q, fstr(c))
        root_lr, root_ti = c * F(q, p), F(p) / (q * c)
    elif form == 'pqxr':
        if ctl:
            c = r + sgn * F(p, q)
        else:
            c = F(rint(rng, 9), rng.choice([1, 2]))
        if c == r:
            return None
        sg = '+' if r > 0 else '-'
        prob = '%d/%dx %s %d = %s' % (p, q, sg, abs(r), fstr(c))
        lr_eq = '(%d/%d)*x %s %d = %s' % (p, q, sg, abs(r), fstr(c))
        ti_eq = '%d/(%d*x) %s %d = %s' % (p, q, sg, abs(r), fstr(c))
        root_lr, root_ti = (c - r) * F(q, p), F(p) / (q * (c - r))
    elif form == 'kma':
        if ctl:
            c = sgn * F(k, m)
        else:
            c = F(rint(rng, 9), rng.choice([1, 2]))
        if c == 0:
            return None
        prob = '%d/%d(x%s) = %s' % (k, m, ('-%d' % a) if a > 0 else ('+%d' % -a), fstr(c))
        lr_eq = '(%d/%d)*(x%s) = %s' % (k, m, ('-%d' % a) if a > 0 else ('+%d' % -a), fstr(c))
        ti_eq = '%d/(%d*(x%s)) = %s' % (k, m, ('-%d' % a) if a > 0 else ('+%d' % -a), fstr(c))
        root_lr, root_ti = a + c * F(m, k), a + F(k) / (m * c)
    else:
        raise ValueError(form)
    if ctl != (root_lr == root_ti):
        return None
    t = T('ambiguous-notation', 'AM-' + form, spaced(prob, rng), '', amb='agree' if ctl else 'amb',
          note='%s; lr root %s, tight root %s' % (form, fstr(root_lr), fstr(root_ti)))
    t.error_class = 'wrong-claim'
    intended = rng.choice(['lr', 'ti'])
    root = root_lr if intended == 'lr' else root_ti
    wrong = rng.random() < 0.25
    if rng.random() < 0.5:
        t.L(spaced(prob, rng), True)           # the student copies the ambiguous line
    t.L(lr_eq if intended == 'lr' else ti_eq)
    t.C(claim_txt([root + (rng.choice([1, 2, -1]) if wrong else 0)], rng))
    return t


# ================================================================ broken evidence chain / unsupported
def unsup_mutations(line, rng):
    """unreadable variants of an equation line; each contains a construct outside the grammar."""
    if '=' not in line or line.strip().lower().startswith(('case', 'no solution', 'all real')):
        return []
    lhs, rhs = line.split('=', 1)
    opts = []
    ints = list(re.finditer(r'(?<![\w.^])\d+(?![\w.])', line))
    if ints:
        mm = rng.choice(ints)
        n = int(mm.group(0))
        opts.append(('sqrt', line[:mm.start()] + 'sqrt(%d)' % (n * n) + line[mm.end():]))
    if 'x' in line:
        idx = [i for i, ch in enumerate(line) if ch == 'x']
        i = rng.choice(idx)
        opts.append(('unknown-symbol', line[:i] + rng.choice(['y', 'k', 't']) + line[i + 1:]))
    opts.append(('abs', '|%s| =%s' % (lhs.strip(), rhs)))
    opts.append(('abs-rhs', '%s= |%s|' % (lhs, rhs.strip())))
    opts.append(('double-equals', lhs + '==' + rhs))
    opts.append(('placeholder', lhs + '= ?'))
    opts.append(('trig', lhs.rstrip() + ' + sin(0) =' + rhs))
    opts.append(('approx', lhs + '≈' + rhs))
    opts.append(('inequality', lhs + '<' + rhs))
    opts.append(('log', 'ln(1) + ' + lhs.strip() + ' =' + rhs))
    opts.append(('unit-word', lhs + '= ' + rhs.strip() + ' units'))
    return opts


def base_chain_task(rng, cat, which):
    if which == 're-ok':
        return b_re(rng, rng.choice(['ok-clean', 'ok-excl', 'inc']))
    if which == 're-err':
        return b_re(rng, rng.choice(['sign', 'expsign', 'coll', 'forget', 'root', 'accept']))
    if which == 'quad':
        return b_ap(rng, ('quad', False))
    if which == 'lin':
        return b_ap(rng, ('lin', False))
    if which == 'mz':
        return b_mz(rng, ('lin', 'discharge'))
    return None


def b_bc(rng, v):
    base = base_chain_task(rng, 'broken-evidence-chain', v)
    if base is None:
        return None
    lines = finish(base, rng)
    n = len(lines)
    if n < 4:
        return None
    try:
        rb = label_task(base.problem, lines, False)
    except Bad:
        return None
    fi = rb['first_invalid'] if rb['invalid_at'] == 'step' else None
    u = rng.randint(2, n - 2)               # 1-based, with at least two lines after it
    if fi is not None and u >= fi:
        return None
    ms = unsup_mutations(lines[u - 1], rng)
    if not ms:
        return None
    which, newline = rng.choice(ms)
    t = T('broken-evidence-chain', 'BC-' + which, base.problem, 'unsupported', note='line %d replaced by an unsupported variant (%s); %s' % (u, which, base.tag))
    for i, l in enumerate(lines, 1):
        t.C(newline if i == u else l)
    return t


def b_un(rng, v):
    which, pos = v
    base = base_chain_task(rng, 'unsupported', which)
    if base is None:
        return None
    lines = finish(base, rng)
    n = len(lines)
    if pos == 'first':
        u = 1
    elif pos == 'last':
        u = n
    else:
        u = rng.randint(1, n)
    if rng.random() < 0.12 and pos != 'last':
        s = rng.choice([2, 3, 5, 6, 7, 10, 11])
        newline = rng.choice(['x^2 = %d' % s, 'x^2 - %d = 0' % s, '%d*x^2 = %d' % (rng.randint(1, 3), s * 7)])
        which_m = 'irrational-root'
        t = T('unsupported', 'UN-' + which_m, base.problem, 'unsupported', note='line %d replaced by a line with irrational roots' % u)
    else:
        ms = unsup_mutations(lines[u - 1], rng)
        if not ms:
            return None
        which_m, newline = rng.choice(ms)
        t = T('unsupported', 'UN-' + which_m, base.problem, 'unsupported', note='line %d replaced by an unsupported variant (%s)' % (u, which_m))
    for i, l in enumerate(lines, 1):
        t.C(newline if i == u else l)
    return t


# ================================================================ driver
PAIRWISE = {'broken-evidence-chain'}


def plan():
    P = {}
    P['divide-by-variable'] = [(b_dv, v) for v, n in (('inv1', 7), ('inv2', 6), ('inv3', 6), ('inv4', 5), ('val1', 6), ('val2', 3), ('inc', 5)) for _ in range(n)]
    mz = []
    for kind, modes in (('lin', (('accept', 4), ('discharge', 6), ('stop', 3), ('lost', 2))),
                        ('rat', (('accept', 3), ('discharge', 4), ('stop', 2), ('lost', 1))),
                        ('sq', (('accept', 3), ('discharge', 4), ('stop', 1), ('lost', 1)))):
        for mode, n in modes:
            mz += [(b_mz, (kind, mode))] * n
    mz += [(b_mz, ('zero', None))] * 4
    P['multiply-by-possibly-zero'] = mz
    P['cancellation'] = [(b_cn, v) for v, n in (('eq', 5), ('sq', 3), ('both', 3), ('frac', 5), ('term', 4), ('ctl-num', 4),
                                                ('ctl-den', 5), ('ctl-prod', 5), ('inc', 4)) for _ in range(n)]
    P['rational-expressions'] = [(b_re, v) for v, n in (('ok-clean', 5), ('ok-excl', 3), ('nosol', 1), ('inc', 4), ('accept', 5), ('drop', 3),
                                                       ('forget', 4), ('dropfac', 3), ('sign', 4), ('expsign', 3), ('coll', 2), ('root', 1))
                                 for _ in range(n)]
    P['removable-singularity'] = [(b_rs, v) for v, n in (('keep', 10), ('keep-short', 4), ('quiet', 5), ('drop', 10), ('wrong-restriction', 9))
                                  for _ in range(n)]
    cs = []
    for kind, modes in (('dv', (('ok', 5), ('short', 1), ('drop', 2), ('falsecase', 1), ('wrongbranch', 2), ('nodiv', 1))),
                        ('fac', (('ok', 5), ('short', 2), ('drop', 2), ('falsecase', 2), ('wrongbranch', 2), ('nodiv', 1))),
                        ('rat', (('ok', 6), ('short', 1), ('inclfalse', 2), ('falsecase', 2), ('wrongbranch', 1)))):
        for mode, n in modes:
            cs += [(b_cs, (kind, mode))] * n
    P['explicit-case-split'] = cs
    idp = []
    for kind, modes in (('lin', (('lost', 8), ('ok', 7), ('short', 3))), ('rat', (('lost', 8), ('ok', 8), ('short', 4)))):
        for mode, n in modes:
            idp += [(b_id, (kind, mode))] * n
    P['introduced-denominator'] = idp
    P['alternative-paths'] = ([(b_ap, ('lin', False))] * 14 + [(b_ap, ('lin', True))] * 5 + [(b_ap, ('quad', False))] * 6 +
                              [(b_ap, ('quad', True))] * 2 + [(b_ap, ('rat', False))] * 4 + [(b_ap, ('rat', True))] * 2 +
                              [(b_ap, ('special', 'identity')), (b_ap, ('special', 'contradiction')), (b_ap, ('special', 'ratident'))] +
                              [(b_mz, ('lin', 'discharge'))] * 1)
    P['alternative-paths'] += [(b_mz, ('sq', 'discharge'))] * 1
    P['glyph-variants'] = ([(b_gv, ('ap', ('lin', False)))] * 12 + [(b_gv, ('ap', ('lin', True)))] * 2 + [(b_gv, ('ap', ('quad', False)))] * 5 +
                           [(b_gv, ('ap', ('rat', False)))] * 3 + [(b_gv, ('mz', None))] * 5 + [(b_gv, ('id', 'lin'))] * 2 +
                           [(b_gv, ('id', 'rat'))] * 2 + [(b_gv, ('cs', 'dv'))] * 2 + [(b_gv, ('cs', 'fac'))] * 2 + [(b_gv, ('rs', None))] * 3)
    am = []
    for form, na, nc in (('pqx', 9, 3), ('pqxr', 6, 3), ('kma', 6, 3), ('half', 5, 3)):
        am += [(b_am, (form, False))] * na + [(b_am, (form, True))] * nc
    P['ambiguous-notation'] = am
    P['broken-evidence-chain'] = [(b_bc, v) for v, n in (('re-ok', 12), ('re-err', 12), ('quad', 6), ('lin', 4), ('mz', 4)) for _ in range(n)]
    un = []
    for which, pos, n in (('lin', 'first', 4), ('lin', 'mid', 4), ('lin', 'last', 3), ('re-ok', 'first', 4), ('re-ok', 'mid', 5), ('re-ok', 'last', 3),
                          ('quad', 'mid', 4), ('quad', 'last', 3), ('mz', 'mid', 4), ('mz', 'first', 4)):
        un += [(b_un, (which, pos))] * n
    P['unsupported'] = un
    return P


def same_as_route2(res, r2):
    return (res['status'] == r2['status'] and res['first_invalid'] == r2['first_invalid'] and res['invalid_at'] == r2['invalid_at']
            and res['final_verdict'] == r2['final_verdict'] and res['step_flags'] == r2['step_flags']
            and res['step_labels'] == r2['step_labels'] and res['unsupported_lines'] == r2['unsupported_lines']
            and set_json(res['truth']) == r2['truth'] and [fstr(v) for v in res['excl']] == r2['excluded'])


def key_of(r):
    return (r['status'], r['first_invalid'], r['invalid_at'], r['final_verdict'], r['step_labels'], r['step_flags'])


def reading(r):
    return dict(status=r['status'], first_invalid=r['first_invalid'], invalid_at=r['invalid_at'],
                final_verdict=r['final_verdict'], step_labels=r['step_labels'], step_flags=r['step_flags'])


def truth_rec(r):
    return {'solution_set': set_json(r['truth']), 'excluded': [fstr(v) for v in r['excl']]}


def build_record(rid, t, lines, rl, rt, ascii_lines=None):
    base = dict(id=rid, family='H3', category=t.cat, problem=t.problem, lines=lines)
    if ascii_lines is not None:
        base['ascii_lines'] = ascii_lines
    note = '%s [%s]' % (t.note, t.tag)
    if t.amb == 'amb':
        exp = dict(status='ambiguous', first_invalid=None, invalid_at=None, error_class=None, final_verdict=None,
                   step_flags=None, step_labels=None, readings={'lr': reading(rl), 'tight': reading(rt)})
        base['expected'] = exp
        base['truth'] = {'lr': truth_rec(rl), 'tight': truth_rec(rt)}
    else:
        exp = dict(status=rl['status'], first_invalid=rl['first_invalid'], invalid_at=rl['invalid_at'],
                   error_class=(t.error_class or 'unclassified') if rl['status'] == 'invalid' else None,
                   final_verdict=rl['final_verdict'], step_flags=rl['step_flags'], step_labels=rl['step_labels'])
        if rl['status'] == 'unsupported':
            exp['unsupported_lines'] = rl['unsupported_lines']
        if t.amb == 'agree':
            exp['readings_agree'] = True
        base['expected'] = exp
        base['truth'] = truth_rec(rl)
        if t.amb == 'agree' and rl['excl'] != rt['excl']:
            base['truth']['excluded_by_reading'] = {'lr': [fstr(v) for v in rl['excl']], 'tight': [fstr(v) for v in rt['excl']]}
    base['notes'] = note
    return base


def generate():
    from check_adversarial3 import route2, Unsup, Mismatch
    rng = random.Random(SEED)
    plans = plan()
    tasks, dropped, stats = [], [], {}
    seen = set()
    for cat, slots in plans.items():
        slots = list(slots)
        rng.shuffle(slots)
        pw_ = cat in PAIRWISE
        got, tries, skips = [], 0, 0
        for fn, spec in slots:
            ok_ = False
            for _attempt in range(250):
                tries += 1
                t = fn(rng, spec)
                if t is None:
                    skips += 1
                    continue
                t.cat = cat
                lines = finish(t, rng)
                asc = None
                if getattr(t, 'glyph', False):
                    asc = lines
                    lines = [glyphify(l, rng) for l in asc]
                    if has_glyph(lines) < 3:
                        skips += 1
                        continue
                sig = (t.problem, tuple(lines))
                if sig in seen:
                    skips += 1
                    continue
                info = dict(category=cat, tag=t.tag, problem=t.problem, lines=lines)
                try:
                    rl, rt = label_task(t.problem, lines, False, pw_), label_task(t.problem, lines, True, pw_)
                    ra = label_task(t.problem, asc, False, pw_) if asc else None
                except Bad as e:
                    dropped.append(dict(info, reason='oracle-unreadable-problem-or-irrational: %s' % e))
                    continue
                try:
                    for res, tg in ((rl, False), (rt, True)):
                        if not same_as_route2(res, route2(t.problem, lines, tg, pw_)):
                            raise Mismatch('generator route and checker route disagree')
                except (Unsup, Mismatch) as e:
                    dropped.append(dict(info, reason='label-routes-disagree: %s' % e))
                    continue
                if asc is not None:
                    if ra is None or key_of(ra) != key_of(rl) or set_json(ra['truth']) != set_json(rl['truth']):
                        dropped.append(dict(info, reason='glyph-labels-differ-from-ascii'))
                        continue
                if t.amb is None:
                    if key_of(rl) != key_of(rt) or rl['truth'] != rt['truth']:
                        dropped.append(dict(info, reason='readings-disagree-on-nonambiguous-task'))
                        continue
                    if rl['status'] != t.status or (t.first_invalid is not None and rl['first_invalid'] != t.first_invalid):
                        dropped.append(dict(info, reason='intended-differs', intended=[t.status, t.first_invalid],
                                            got=[rl['status'], rl['first_invalid'], rl['step_labels']]))
                        continue
                else:
                    if 'unsupported' in (rl['status'], rt['status']):
                        dropped.append(dict(info, reason='ambiguous-task-has-unsupported-reading'))
                        continue
                    truth_differs = rl['truth'] != rt['truth']
                    if truth_differs != (t.amb == 'amb'):
                        dropped.append(dict(info, reason='intended-%s-but-truth-%s' % (t.amb, 'differs' if truth_differs else 'agrees')))
                        continue
                    if not truth_differs and (key_of(rl) != key_of(rt)):
                        dropped.append(dict(info, reason='same-truth-different-labels'))
                        continue
                seen.add(sig)
                got.append((t, lines, rl, rt, asc))
                ok_ = True
                break
            if not ok_:
                from collections import Counter as _C
                raise SystemExit('could not realise a slot in category %s: %r; skips=%d dropped=%s' % (
                    cat, spec, skips, dict(_C(d['reason'].split(':')[0] for d in dropped if d['category'] == cat))))
        stats[cat] = dict(slots=len(slots), candidates=tries, skipped_redraws=skips, accepted=len(got))
        for i, (t, lines, rl, rt, asc) in enumerate(got, 1):
            tasks.append(build_record('H3-%s-%03d' % (cat, i), t, lines, rl, rt, asc))
    return tasks, dropped, stats


sys.path.insert(0, HERE)


def dumps(obj):
    return json.dumps(obj, ensure_ascii=False, indent=1) + '\n'


def main():
    tasks, dropped, stats = generate()
    open(os.path.join(HERE, 'adversarial3.json'), 'w', encoding='utf-8').write(dumps({'tasks': tasks}))
    from collections import Counter
    reasons = Counter(d['reason'].split(':')[0] for d in dropped)
    open(os.path.join(HERE, 'dropped.json'), 'w', encoding='utf-8').write(dumps(
        {'seed': SEED, 'dropped_count': len(dropped), 'reasons': dict(sorted(reasons.items())),
         'generation_stats': stats, 'dropped': dropped}))
    print(len(tasks), 'tasks;', len(dropped), 'dropped')
    print(dict(Counter(t['category'] for t in tasks)))
    print(dict(Counter(t['expected']['status'] for t in tasks)))


if __name__ == '__main__':
    main()
