#!/usr/bin/env python3
"""Independent checker for adversarial2.json (family H2).

Recomputes every label from scratch with a route that shares no code with generate_adversarial2.py:
  * own lexer / parser (AST) for both readings (lr, tight);
  * set membership by exact Fraction substitution on a grid that contains every critical point
    (all roots, all excluded values, all claim constants) plus generic points;
  * every line is cross-checked against SymPy: solveset(numerator of cancel(together(L-R)), Reals)
    minus the zeros of the denominators (solveset as well);
  * relations between lines (equal / subset / finite-vs-cofinite) are decided on the grid.
Exit status 1 on any mismatch, 0 otherwise.   Usage: check_adversarial2.py [--regen]
"""
import sys, os, re, json, hashlib
from fractions import Fraction as Fr
try:
    import sympy
except ImportError:
    sys.path[:0] = ['/home/claude/vendor/sympy', '/home/claude/vendor/mpmath']
    import sympy

HERE = os.path.dirname(os.path.abspath(__file__))
XS = sympy.Symbol('x')


class Unsup(Exception):
    pass


class Mismatch(Exception):
    pass


# ------------------------------------------------------------------ lexer
_TR = {ord('−'): '-', ord('–'): '-', ord('—'): '-', ord('×'): '*', ord('·'): '*',
       ord('⋅'): '*', ord('÷'): '/', ord('∕'): '/', ord('²'): '^2', ord('³'): '^3'}
_PIECE = re.compile(r'\s*(?:(\d+\.\d+|\.\d+|\d+)|([A-Za-z]+)|(\S))')


def lex(text):
    s = text.translate(_TR)
    if '==' in s:
        raise Unsup('==')
    out = []
    for m in _PIECE.finditer(s):
        num, word, other = m.groups()
        if num is not None:
            out.append(('N', Fr(num)))
        elif word is not None:
            if word != 'x':
                raise Unsup(word)
            out.append(('X', None))
        elif other in '+-*/^()=':
            out.append((other, None))
        else:
            raise Unsup(other)
    for (a, _), (b, _) in zip(out, out[1:]):
        if (a, b) in (('N', 'N'), ('X', 'N'), ('X', 'X')):
            raise Unsup('adjacent')
    return out


# ------------------------------------------------------------------ parser -> AST
class Reader:
    def __init__(self, toks, tight):
        self.t, self.p, self.tight = toks, 0, tight

    def kind(self, off=0):
        i = self.p + off
        return self.t[i][0] if 0 <= i < len(self.t) else None

    def juxt(self):
        prev, nxt = self.kind(-1), self.kind()
        if nxt in ('X', '('):
            return prev in ('N', 'X', ')')
        if nxt == 'N':
            return prev == ')'
        return False

    def additive(self):
        node = self.multiplicative()
        while self.kind() in ('+', '-'):
            op = self.kind()
            self.p += 1
            rhs = self.multiplicative()
            node = (op, node, rhs)
        return node

    def multiplicative(self):
        node = self.factor()
        while True:
            k = self.kind()
            if k == '*':
                self.p += 1
                node = ('*', node, self.factor())
            elif k == '/':
                self.p += 1
                d = self.factor()
                while self.tight and self.juxt():
                    d = ('*', d, self.factor())
                node = ('/', node, d)
            elif self.juxt():
                node = ('*', node, self.factor())
            else:
                return node

    def factor(self):
        k = self.kind()
        if k == '-':
            self.p += 1
            return ('neg', self.factor())
        if k == '+':
            self.p += 1
            return self.factor()
        base = self.primary()
        if self.kind() == '^':
            self.p += 1
            if self.kind() != 'N':
                raise Unsup('exp')
            e = self.t[self.p][1]
            self.p += 1
            if e.denominator != 1 or e > 6:
                raise Unsup('exp')
            return ('^', base, int(e))
        return base

    def primary(self):
        k = self.kind()
        if k is None:
            raise Unsup('eof')
        tok = self.t[self.p]
        self.p += 1
        if k == 'N':
            return ('n', tok[1])
        if k == 'X':
            return ('x',)
        if k == '(':
            node = self.additive()
            if self.kind() != ')':
                raise Unsup('paren')
            self.p += 1
            return node
        raise Unsup('primary')


def parse_side(toks, tight):
    if not toks:
        raise Unsup('empty')
    r = Reader(toks, tight)
    node = r.additive()
    if r.p != len(toks):
        raise Unsup('trailing')
    return node


def parse_equation(text, tight):
    toks = lex(text)
    idx = [i for i, (k, _) in enumerate(toks) if k == '=']
    if len(idx) != 1:
        raise Unsup('equals')
    return parse_side(toks[:idx[0]], tight), parse_side(toks[idx[0] + 1:], tight)


def has_x(n):
    if n[0] == 'x':
        return True
    if n[0] == 'n':
        return False
    return any(has_x(c) for c in n[1:] if isinstance(c, tuple))


def divisors(n, acc):
    if n[0] in ('n', 'x'):
        return
    for c in n[1:]:
        if isinstance(c, tuple):
            divisors(c, acc)
    if n[0] == '/':
        if not has_x(n[2]):
            if ev(n[2], Fr(1)) == 0:
                raise Unsup('div0')
        else:
            acc.append(n[2])


def ev(n, g):
    k = n[0]
    if k == 'n':
        return n[1]
    if k == 'x':
        return g
    if k == 'neg':
        return -ev(n[1], g)
    if k == '^':
        return ev(n[1], g) ** n[2]
    a, b = ev(n[1], g), ev(n[2], g)
    if k == '+':
        return a + b
    if k == '-':
        return a - b
    if k == '*':
        return a * b
    if b == 0:
        raise ZeroDivisionError
    return a / b


def to_sympy(n):
    k = n[0]
    if k == 'n':
        return sympy.Rational(n[1].numerator, n[1].denominator)
    if k == 'x':
        return XS
    if k == 'neg':
        return -to_sympy(n[1])
    if k == '^':
        return to_sympy(n[1]) ** n[2]
    a, b = to_sympy(n[1]), to_sympy(n[2])
    return {'+': a + b, '-': a - b, '*': a * b}.get(k) if k != '/' else a / b


def rational_real_roots(num):
    """solveset on a polynomial numerator; every real root must be rational."""
    if num == 0:
        return None
    if not sympy.expand(num).is_polynomial(XS):
        raise Unsup('nonpoly')
    sol = sympy.solveset(sympy.expand(num), XS, sympy.S.Reals)
    if sol == sympy.S.EmptySet:
        return set()
    if not isinstance(sol, sympy.FiniteSet):
        raise Unsup('solveset')
    out = set()
    for r in sol:
        if not r.is_Rational:
            raise Unsup('irrational')
        out.add(Fr(int(r.p), int(r.q)))
    return out


def den_zeros(ast_list):
    z = set()
    for d in ast_list:
        num, _ = sympy.fraction(sympy.cancel(sympy.together(to_sympy(d))))
        r = rational_real_roots(num)
        if r:
            z |= r
    return z


# ------------------------------------------------------------------ lines
class Line:
    """kind: 'eq' | 'none' | 'all'."""

    def __init__(self, text, tight, orig_divs, orig_zero):
        self.text = text
        low = text.strip().lower().rstrip('.')
        self.kind, self.parts, self.divs, self.except_ = 'eq', [], [], set()
        self.claim = None          # literal claim as a membership predicate data: ('vals', set) / ('all', set)
        if low in ('no solution', 'no solutions'):
            self.kind, self.claim = 'none', ('vals', set())
            return
        m = re.fullmatch(r'all real numbers(?: except (.+))?', low)
        if m:
            self.kind = 'all'
            if m.group(1):
                for piece in re.split(r',| and ', m.group(1)):
                    node = parse_side(lex(piece), tight)
                    if has_x(node):
                        raise Unsup('except')
                    self.except_.add(ev(node, Fr(0)))
            self.claim = ('all', set(self.except_))
            return
        vals, claimable = set(), True
        for part in re.split(r'\s+or\s+', text.strip()):
            L, R = parse_equation(part, tight)
            self.parts.append((L, R))
            divisors(L, self.divs)
            divisors(R, self.divs)
            for a, b in ((L, R), (R, L)):
                if a == ('x',) and not has_x(b):
                    vals.add(ev(b, Fr(0)))
                    break
            else:
                claimable = False
        if claimable:
            self.claim = ('vals', vals)
        self.zeros = den_zeros(self.divs) | set(orig_zero)
        self.orig_divs = orig_divs
        # solveset side of the cross-check
        roots, all_ = set(), False
        for L, R in self.parts:
            num, _ = sympy.fraction(sympy.cancel(sympy.together(to_sympy(L) - to_sympy(R))))
            r = rational_real_roots(sympy.expand(num))
            if r is None:
                all_ = True
            else:
                roots |= r
        self.ss_roots, self.ss_all = roots, all_

    def critical(self):
        pts = set()
        if self.kind == 'eq':
            pts |= self.zeros | self.ss_roots
        pts |= self.except_
        if self.claim and self.claim[0] == 'vals':
            pts |= self.claim[1]
        return pts

    def member(self, g, orig_excl_pred):
        if self.kind == 'none':
            return False
        if self.kind == 'all':
            return g not in self.except_ and orig_excl_pred(g)
        if not orig_excl_pred(g):
            return False
        try:
            for d in self.divs:
                if ev(d, g) == 0:
                    return False
            for L, R in self.parts:
                if ev(L, g) == ev(R, g):
                    return True
        except ZeroDivisionError:
            return False
        return False


GENERIC = [Fr(1000003, 3), Fr(-999983, 7), Fr(7919, 13)]


def vec(line, G, ok):
    return tuple(line.member(g, ok) for g in G)


def relation(a, b):
    if a == b:
        return 'eq'
    if all((not x) or y for x, y in zip(a, b)):
        return 'sub'          # a strictly inside b
    if all((not y) or x for x, y in zip(a, b)):
        return 'sup'
    return 'cross'


def route2(problem, lines, tight):
    pL, pR = parse_equation(problem, tight)
    pdivs = []
    divisors(pL, pdivs)
    divisors(pR, pdivs)
    pzero = den_zeros(pdivs)

    def ok(g):
        try:
            return all(ev(d, g) != 0 for d in pdivs)
        except ZeroDivisionError:
            return False
    prob_line = Line(problem, tight, pdivs, pzero)
    infos, bad = [], []
    for i, t in enumerate(lines, 1):
        try:
            infos.append(Line(t, tight, pdivs, pzero))
        except Unsup:
            infos.append(None)
    pts = set(pzero) | prob_line.critical()
    for ln in infos:
        if ln is not None:
            pts |= ln.critical()
    G = sorted(pts | {Fr(i) for i in range(-25, 26)} | {Fr(i, 2) for i in range(-30, 31)} | set(GENERIC))
    gen_idx = [G.index(g) for g in GENERIC]

    # cross-check of substitution against solveset
    for ln in [prob_line] + [l for l in infos if l is not None]:
        if ln.kind != 'eq':
            continue
        for g in G:
            expect = (ln.ss_all or g in ln.ss_roots) and g not in ln.zeros and ok(g)
            if expect != ln.member(g, ok):
                raise Mismatch('solveset vs substitution at %s for %r' % (g, ln.text))

    def isfin(v):
        return not any(v[i] for i in gen_idx)
    truth = vec(prob_line, G, ok)
    prev, opened = truth, False
    labels, flags, unsup = [], [], []
    seen = False
    for i, ln in enumerate(infos, 1):
        if ln is None:
            labels.append('unsupported')
            unsup.append(i)
            seen = True
            continue
        if seen:
            labels.append('not-assessed')
            continue
        cur = vec(ln, G, ok)
        rel = relation(prev, cur)
        if rel == 'eq':
            lab = 'equivalent'
        elif rel == 'sub':      # prev inside cur: set grew
            lab = 'invalid' if (isfin(prev) and not isfin(cur)) else 'valid-with-obligation'
        elif rel == 'sup':      # set shrank
            covers = all((not t) or c for t, c in zip(truth, cur))
            lab = 'valid-discharge' if (opened and isfin(prev) and covers) else 'invalid'
        else:
            lab = 'invalid'
        labels.append(lab)
        if lab == 'valid-with-obligation':
            opened = True
            flags.append({'line': i, 'flag': lab})
        elif lab == 'valid-discharge':
            flags.append({'line': i, 'flag': lab})
            if cur == truth:
                opened = False
        prev = cur
    verdict = 'no-claim'
    last = infos[-1]
    if last is not None and last.claim is not None:
        kindc, data = last.claim
        if kindc == 'vals':
            lit = tuple(g in data for g in G)
        else:
            lit = tuple(g not in data for g in G)
        verdict = 'correct' if lit == truth else 'wrong'
    fi = next((i for i, l in enumerate(labels, 1) if l == 'invalid'), None)
    inv = 'step' if fi else None
    if unsup:
        status = 'unsupported'
    elif fi:
        status = 'invalid'
    elif verdict == 'wrong':
        status, fi, inv = 'invalid', len(lines), 'final-claim'
    elif verdict == 'correct':
        status = 'valid-complete'
    else:
        status = 'valid-incomplete'
    # truth description via solveset
    if prob_line.ss_all:
        tj = {'kind': 'all-except', 'except': [fs(v) for v in sorted(pzero)]}
    else:
        tj = {'kind': 'finite', 'values': [fs(v) for v in sorted(prob_line.ss_roots - pzero)]}
    return dict(status=status, first_invalid=fi, invalid_at=inv, final_verdict=verdict, step_flags=flags,
                step_labels=labels, unsupported_lines=unsup, truth=tj, excluded=[fs(v) for v in sorted(pzero)])


def fs(q):
    return str(q.numerator) if q.denominator == 1 else '%d/%d' % (q.numerator, q.denominator)


# ------------------------------------------------------------------ record-level expectations
STATUSES = {'valid-complete', 'valid-incomplete', 'invalid', 'unsupported', 'ambiguous'}
LABELS = {'equivalent', 'valid-with-obligation', 'valid-discharge', 'invalid', 'unsupported', 'not-assessed'}
CATS = ['domain-change', 'extraneous-root', 'cancellation', 'multiplication-by-zero', 'invalid-division',
        'rational-expressions', 'ambiguous-notation', 'alternative-paths', 'correct-controls', 'unsupported']


def rkey(r):
    return (r['status'], r['first_invalid'], r['invalid_at'], r['final_verdict'])


def expected_for(rec):
    lr = route2(rec['problem'], rec['lines'], False)
    ti = route2(rec['problem'], rec['lines'], True)
    if rec['category'] != 'ambiguous-notation':
        if lr != ti:
            raise Mismatch('readings disagree on a non-ambiguous task')
    return lr, ti


def check_record(rec, errs):
    rid = rec['id']
    e = rec['expected']
    try:
        lr, ti = expected_for(rec)
    except (Unsup, Mismatch) as ex:
        errs.append('%s: %s' % (rid, ex))
        return
    if rec['truth'] != {'solution_set': lr['truth'], 'excluded': lr['excluded']}:
        errs.append('%s: truth mismatch %s vs %s' % (rid, rec['truth'], lr['truth']))
    if e['status'] == 'ambiguous':
        if rkey(lr) == rkey(ti):
            errs.append('%s: marked ambiguous but readings agree' % rid)
        for name, r in (('lr', lr), ('tight', ti)):
            got = e['readings'][name]
            for k in ('status', 'first_invalid', 'invalid_at', 'final_verdict', 'step_labels'):
                if got[k] != r[k]:
                    errs.append('%s: reading %s %s stored %r recomputed %r' % (rid, name, k, got[k], r[k]))
        if any(e[k] is not None for k in ('first_invalid', 'invalid_at', 'final_verdict', 'step_labels', 'step_flags')):
            errs.append('%s: ambiguous record has non-null verdict fields' % rid)
        return
    if rec['category'] == 'ambiguous-notation':
        if lr != ti or not e.get('readings_agree'):
            errs.append('%s: agreeing control inconsistent (readings_agree=%r)' % (rid, e.get('readings_agree')))
    for k in ('status', 'first_invalid', 'invalid_at', 'final_verdict', 'step_flags', 'step_labels'):
        if e[k] != lr[k]:
            errs.append('%s: %s stored %r recomputed %r' % (rid, k, e[k], lr[k]))
    if lr['status'] == 'unsupported' and e.get('unsupported_lines') != lr['unsupported_lines']:
        errs.append('%s: unsupported_lines mismatch' % rid)
    if (e['status'] == 'invalid') != (e['error_class'] is not None):
        errs.append('%s: error_class presence inconsistent with status' % rid)
    if len(e['step_labels']) != len(rec['lines']) or not set(e['step_labels']) <= LABELS:
        errs.append('%s: bad step_labels shape' % rid)


def main():
    path = os.path.join(HERE, 'adversarial2.json')
    raw = open(path, 'rb').read()
    tasks = json.loads(raw.decode('utf-8'))['tasks']
    errs, ids = [], set()
    from collections import Counter
    for rec in tasks:
        if rec['id'] in ids:
            errs.append('duplicate id ' + rec['id'])
        ids.add(rec['id'])
        if rec['family'] != 'H2' or rec['category'] not in CATS or rec['expected']['status'] not in STATUSES:
            errs.append('%s: bad family/category/status' % rec['id'])
            continue
        check_record(rec, errs)
    cc = Counter(t['category'] for t in tasks)
    for c in CATS:
        if cc[c] < 40:
            errs.append('category %s has only %d tasks' % (c, cc[c]))
    if '--regen' in sys.argv:
        import subprocess, tempfile, shutil
        tmp = tempfile.mkdtemp()
        shutil.copy(os.path.join(HERE, 'generate_adversarial2.py'), tmp)
        shutil.copy(os.path.join(HERE, 'check_adversarial2.py'), tmp)
        subprocess.run([sys.executable, os.path.join(tmp, 'generate_adversarial2.py')], check=True, capture_output=True)
        if open(os.path.join(tmp, 'adversarial2.json'), 'rb').read() != raw:
            errs.append('regeneration is not byte-identical')
        shutil.rmtree(tmp)
    print('records:', len(tasks), ' sha256:', hashlib.sha256(raw).hexdigest())
    print('per category:', dict(cc))
    print('per status:', dict(Counter(t['expected']['status'] for t in tasks)))
    if errs:
        print('MISMATCHES: %d' % len(errs))
        for x in errs[:60]:
            print('  ', x)
        return 1
    print('OK: all labels recomputed from scratch')
    return 0


if __name__ == '__main__':
    sys.exit(main())
