"""Labelling oracle for the held-out adversarial corpus (written from scratch, SymPy only).

Two independent routes per line:
  A: numerator of cancel(together(L-R)), roots from factor_list over QQ.
  B: solveset(L-R, Reals) AND exact Fraction grid substitution on our own AST evaluator.
Any disagreement raises Disagree (caller drops + logs the task).
"""
import sys, re
from fractions import Fraction

try:
    import sympy as sp
except ImportError:
    sys.path[:0] = ['/home/claude/vendor/sympy', '/home/claude/vendor/mpmath']
    import sympy as sp

X = sp.Symbol('x')


class Unsupported(Exception):
    pass


class Disagree(Exception):
    pass


UNSUP_WORDS = ('sqrt', '√', 'sin', 'cos', 'tan', 'log', 'ln', 'π', 'abs')


def normalise(t):
    for a, b in (('−', '-'), ('–', '-'), ('—', '-'), ('×', '*'), ('·', '*'), ('⋅', '*'),
                 ('÷', '/'), ('∕', '/'), ('²', '^2'), ('³', '^3')):
        t = t.replace(a, b)
    return t.strip()


# ---------- tokenizer / parser -> AST ----------
TOK = re.compile(r'\s*(\d+\.\d+|\.\d+|\d+|x|[-+*/^()=])')


def tokenize(s):
    pos, out = 0, []
    s = s.rstrip()
    while pos < len(s):
        m = TOK.match(s, pos)
        if not m:
            raise Unsupported('unreadable: ' + s[pos:])
        tk = m.group(1)
        kind = 'num' if (tk[0].isdigit() or tk[0] == '.') else tk
        out.append((kind, tk))
        pos = m.end()
    for (k1, _), (k2, _) in zip(out, out[1:]):
        if (k1, k2) in (('num', 'num'), ('x', 'x'), ('x', 'num')):
            raise Unsupported('unreadable juxtaposition')
    return out


class Parser:
    def __init__(self, toks, mode):
        self.t, self.i, self.mode = toks, 0, mode

    def peek(self):
        return self.t[self.i][0] if self.i < len(self.t) else None

    def take(self):
        v = self.t[self.i]
        self.i += 1
        return v

    def expr(self):
        n = self.term()
        while self.peek() in ('+', '-'):
            op = self.take()[0]
            n = ('add' if op == '+' else 'sub', n, self.term())
        return n

    def term(self):
        n = self.unary()
        while True:
            p = self.peek()
            if p == '*':
                self.take()
                n = ('mul', n, self.unary())
            elif p == '/':
                self.take()
                d = self.unary()
                if self.mode == 'tight':
                    while self.peek() in ('num', 'x', '('):
                        d = ('mul', d, self.power())
                n = ('div', n, d)
            elif p in ('num', 'x', '('):
                n = ('mul', n, self.power())
            else:
                return n

    def unary(self):
        if self.peek() == '-':
            self.take()
            return ('neg', self.unary())
        if self.peek() == '+':
            self.take()
            return self.unary()
        return self.power()

    def power(self):
        b = self.primary()
        if self.peek() == '^':
            self.take()
            if self.peek() != 'num':
                raise Unsupported('bad exponent')
            e = self.take()[1]
            if not e.isdigit():
                raise Unsupported('bad exponent')
            b = ('pow', b, int(e))
        return b

    def primary(self):
        p = self.peek()
        if p == 'num':
            return ('num', Fraction(self.take()[1]))
        if p == 'x':
            self.take()
            return ('x',)
        if p == '(':
            self.take()
            n = self.expr()
            if self.peek() != ')':
                raise Unsupported('paren')
            self.take()
            return n
        raise Unsupported('syntax')


def parse_expr(s, mode):
    toks = tokenize(s)
    if not toks:
        raise Unsupported('empty')
    p = Parser(toks, mode)
    n = p.expr()
    if p.i != len(toks):
        raise Unsupported('trailing')
    return n


def parse_eq(s, mode):
    if s.count('=') != 1:
        raise Unsupported('need exactly one =')
    l, r = s.split('=')
    return parse_expr(l, mode), parse_expr(r, mode)


def to_sp(n):
    k = n[0]
    if k == 'num':
        return sp.Rational(n[1].numerator, n[1].denominator)
    if k == 'x':
        return X
    if k == 'neg':
        return -to_sp(n[1])
    if k == 'pow':
        return to_sp(n[1]) ** n[2]
    a, b = to_sp(n[1]), to_sp(n[2])
    if k == 'add':
        return a + b
    if k == 'sub':
        return a - b
    if k == 'mul':
        return a * b
    if b == 0:
        raise Unsupported('division by constant zero')
    return a / b


def fr_eval(n, xv):
    k = n[0]
    if k == 'num':
        return n[1]
    if k == 'x':
        return xv
    if k == 'neg':
        return -fr_eval(n[1], xv)
    if k == 'pow':
        return fr_eval(n[1], xv) ** n[2]
    a, b = fr_eval(n[1], xv), fr_eval(n[2], xv)
    if k == 'add':
        return a + b
    if k == 'sub':
        return a - b
    if k == 'mul':
        return a * b
    return a / b  # ZeroDivisionError => undefined


def dens(n, acc):
    if n[0] in ('num', 'x'):
        return
    if n[0] in ('neg', 'pow'):
        dens(n[1], acc)
        return
    dens(n[1], acc)
    dens(n[2], acc)
    if n[0] == 'div':
        acc.append(to_sp(n[2]))


def real_roots_of_dens(dl):
    out = set()
    for d in dl:
        if not d.has(X):
            continue
        for f, _ in sp.factor_list(sp.numer(sp.together(d)), X)[1]:
            if sp.Poly(f, X).degree() == 1:
                out.add(sp.Rational(-sp.Poly(f, X).coeff_monomial(1), sp.Poly(f, X).coeff_monomial(X)))
            elif sp.Poly(f, X).degree() > 1:
                raise Unsupported('nonlinear denominator factor')
    return out


# ---------- sets: ('fin', frozenset) or ('cof', frozenset excluded) ----------
def S_fin(it):
    return ('fin', frozenset(it))


def S_cof(it):
    return ('cof', frozenset(it))


def s_sub(a, b):  # a subset of b
    (ka, ea), (kb, eb) = a, b
    if ka == 'fin' and kb == 'fin':
        return ea <= eb
    if ka == 'fin':
        return not (ea & eb)
    if kb == 'fin':
        return False
    return eb <= ea


def s_minus_dom(s, D):
    return S_fin(s[1] - D) if s[0] == 'fin' else S_cof(s[1] | D)


def s_union(a, b):
    (ka, ea), (kb, eb) = a, b
    if ka == 'fin' and kb == 'fin':
        return S_fin(ea | eb)
    if ka == 'cof' and kb == 'cof':
        return S_cof(ea & eb)
    f, c = (ea, eb) if ka == 'fin' else (eb, ea)
    return S_cof(c - f)


GRID = sorted({Fraction(i) for i in range(-45, 46)} | {Fraction(i, 2) for i in range(-61, 62, 2)} |
              {Fraction(i, 3) for i in range(-30, 31) if i % 3} | {Fraction(i, 4) for i in range(-41, 42, 2)})


def eq_set(l, r, D0):
    """Return (set, own_dens_roots) for one equation AST pair; routes A and B cross-checked."""
    acc = []
    dens(l, acc)
    dens(r, acc)
    own = real_roots_of_dens(acc)
    D = set(D0) | own
    Ls, Rs = to_sp(l), to_sp(r)
    diff = sp.cancel(sp.together(Ls - Rs))
    num = sp.numer(diff)
    if num == 0:
        A = S_cof(D)
    elif not num.has(X):
        A = S_fin([])
    else:
        roots = set()
        for f, _ in sp.factor_list(num, X)[1]:
            p = sp.Poly(f, X)
            if p.degree() == 1:
                roots.add(sp.Rational(-p.coeff_monomial(1), p.coeff_monomial(X)))
            elif p.degree() > 1:
                raise Unsupported('irreducible nonlinear factor')
        A = S_fin(roots - D)
    # route B1: solveset on the cleared polynomial (independent of factor_list)
    if num == 0:
        B = S_cof(D)
    elif not num.has(X):
        B = S_fin([])
    else:
        sset = sp.solveset(num, X, sp.S.Reals)
        if isinstance(sset, sp.FiniteSet) and all(isinstance(v, sp.Rational) for v in sset):
            B = S_fin(set(sset) - D)
        else:
            raise Unsupported('solveset returned non-rational/non-finite set')
    if B != A:
        raise Disagree('solveset vs factor_list roots: %s vs %s' % (A, B))
    # route B2: exact Fraction substitution
    Dfr = {Fraction(int(v.p), int(v.q)) for v in D}
    if A[0] == 'fin':
        for v in A[1]:
            xv = Fraction(int(v.p), int(v.q))
            try:
                if fr_eval(l, xv) != fr_eval(r, xv):
                    raise Disagree('claimed root fails substitution: %s' % v)
            except ZeroDivisionError:
                raise Disagree('claimed root hits pole: %s' % v)
    Afr = {Fraction(int(v.p), int(v.q)) for v in A[1]}
    for g in GRID:
        if g in Dfr:
            continue
        try:
            ok = fr_eval(l, g) == fr_eval(r, g)
        except ZeroDivisionError:
            raise Disagree('undefined at non-excluded grid point %s' % g)
        want = (g in Afr) if A[0] == 'fin' else True
        if ok != want:
            raise Disagree('grid mismatch at %s' % g)
    return A, own


def const_value(s, mode):
    n = parse_expr(s, mode)
    if 'x' in repr(n):
        return None
    try:
        return fr_eval(n, Fraction(0))
    except ZeroDivisionError:
        return None


CLAIM_NO = re.compile(r'^no solution$', re.I)
CLAIM_ALL = re.compile(r'^all real numbers(?:\s+except\s+(.+))?$', re.I)


def line_set(text, D0, mode):
    """-> (set_over_line_domain, own_den_roots, raw_claim_set_or_None)."""
    t = normalise(text)
    low = t.lower()
    if CLAIM_NO.match(low):
        return S_fin([]), set(), S_fin([])
    m = CLAIM_ALL.match(low)
    if m:
        ex = set()
        if m.group(1):
            for p in re.split(r',|\band\b', m.group(1)):
                p = p.strip()
                p = re.sub(r'^x\s*=\s*', '', p)
                v = const_value(p, mode)
                if v is None:
                    raise Unsupported('bad except list')
                ex.add(sp.Rational(v.numerator, v.denominator))
        return S_cof(set(ex) | set(D0)), set(), S_cof(ex)
    if any(w in low for w in UNSUP_WORDS) or '==' in t:
        raise Unsupported('unsupported function/operator')
    parts = re.split(r'\s+or\s+', t)
    total, own_all, claim = S_fin([]), set(), []
    sets = []
    for p in parts:
        if re.search(r'[a-wyzA-WYZ]', p):
            raise Unsupported('unknown letter')
        l, r = parse_eq(p, mode)
        s, own = eq_set(l, r, D0)
        sets.append(s)
        own_all |= own
        # claim shape: x = const
        lo, ro = p.split('=')
        lv, rv = None, None
        try:
            if lo.strip() == 'x':
                rv = const_value(ro, mode)
                claim.append(rv)
            elif ro.strip() == 'x':
                lv = const_value(lo, mode)
                claim.append(lv)
            else:
                claim.append(None)
        except Unsupported:
            claim.append(None)
    for s in sets:
        total = s_union(total, s)
    # re-apply the line's full domain to the union
    total = s_minus_dom(total, set(D0) | own_all)
    raw = None
    if all(c is not None for c in claim):
        raw = S_fin(sp.Rational(c.numerator, c.denominator) for c in claim)
    return total, own_all, raw


def problem_info(problem, mode='lr'):
    l, r = parse_eq(normalise(problem), mode)
    acc = []
    dens(l, acc)
    dens(r, acc)
    D0 = real_roots_of_dens(acc)
    T, _ = eq_set(l, r, D0)
    return D0, T


def fmt_num(v):
    return str(v.p) if v.q == 1 else '%d/%d' % (v.p, v.q)


def set_json(s):
    vals = sorted(s[1])
    if s[0] == 'fin':
        return {'kind': 'finite', 'values': [fmt_num(v) for v in vals]}
    return {'kind': 'all-reals-except', 'values': [fmt_num(v) for v in vals]}


def analyze(problem, lines, mode='lr'):
    D0, T = problem_info(problem, mode)
    labels, flags = [], []
    prev, open_ob, dead = T, False, False
    claim_raw = None
    for i, ln in enumerate(lines, 1):
        if dead:
            labels.append('not-assessed')
            continue
        try:
            cur, _, raw = line_set(ln, D0, mode)
        except Unsupported:
            labels.append('unsupported')
            dead = True
            continue
        if i == len(lines):
            claim_raw = raw
        if cur == prev:
            lab = 'equivalent'
        elif s_sub(prev, cur):
            if cur[0] == 'cof' and prev[0] == 'fin':
                lab = 'invalid'
            else:
                lab = 'valid-with-obligation'
                open_ob = True
        elif s_sub(cur, prev):
            if open_ob and s_sub(T, cur):
                lab = 'valid-discharge'
                if cur == T:
                    open_ob = False
            else:
                lab = 'invalid'
        else:
            lab = 'invalid'
        if lab in ('valid-with-obligation', 'valid-discharge'):
            flags.append({'line': i, 'label': lab})
        labels.append(lab)
        prev = cur
    out = {'step_labels': labels, 'step_flags': flags, 'first_invalid': None, 'invalid_at': None,
           'error_class': 'none', 'final_verdict': 'no-claim'}
    if 'unsupported' in labels:
        out.update(status='unsupported', final_verdict=None, error_class='unsupported')
        out['unsupported_lines'] = [i + 1 for i, l in enumerate(labels) if l == 'unsupported']
        return out
    if claim_raw is not None:
        out['final_verdict'] = 'correct' if claim_raw == T else 'wrong'
    if 'invalid' in labels:
        out.update(status='invalid', first_invalid=labels.index('invalid') + 1, invalid_at='step', error_class='step')
    elif out['final_verdict'] == 'wrong':
        out.update(status='invalid', first_invalid=len(lines), invalid_at='final-claim', error_class='final-claim')
    elif out['final_verdict'] == 'correct':
        out['status'] = 'valid-complete'
    else:
        out['status'] = 'valid-incomplete'
    return out


def truth(problem):
    D0, T = problem_info(problem, 'lr')
    return {'solution_set': set_json(T), 'excluded': [fmt_num(v) for v in sorted(D0)]}
