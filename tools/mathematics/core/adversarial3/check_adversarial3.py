#!/usr/bin/env python3
"""Independent checker for adversarial3.json (family H3, seed 20261030).

Recomputes every label from scratch with a route that shares no code with generate_adversarial3.py:
  * own lexer / parser (AST) for both readings (lr, tight);
  * set membership by exact Fraction substitution on a grid that contains every critical point
    (all roots, excluded values, claim / case / restriction constants) plus generic points;
  * every equation line is cross-checked against SymPy: solveset(numerator of cancel(together(L-R)), Reals)
    minus the zeros of the denominators;
  * relations between lines (equal / subset / finite-vs-cofinite) are decided on the grid.
Exit status 1 on any mismatch, 0 otherwise.   Usage: check_adversarial3.py [--regen]
SymPy is the only oracle (falls back to /home/claude/vendor/sympy and mpmath).
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
       ord('⋅'): '*', ord('÷'): '/', ord('∕'): '/'}
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
            node = (op, node, self.multiplicative())
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
    if k == '/':
        return a / b
    return {'+': a + b, '-': a - b, '*': a * b}[k]


def rational_real_roots(num):
    """solveset on a polynomial numerator; every real root must be rational (else out of scope)."""
    num = sympy.expand(num)
    if num == 0:
        return None
    if not num.is_polynomial(XS):
        raise Unsup('nonpoly')
    sol = sympy.solveset(num, XS, sympy.S.Reals)
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


def const_of(text, tight):
    node = parse_side(lex(text), tight)
    if has_x(node):
        raise Unsup('const')
    divs = []
    divisors(node, divs)
    return ev(node, Fr(0))


# ------------------------------------------------------------------ lines
class Line:
    """kinds: 'eq' (equation parts [+ restrictions]), 'none', 'all', 'case'."""

    def __init__(self, text, tight):
        self.text = text
        t = text.strip().replace('≠', '!=')
        low = t.lower().rstrip('.')
        self.kind, self.parts, self.divs, self.restr = 'eq', [], [], set()
        self.except_, self.claim = set(), None
        self.zeros, self.ss_roots, self.ss_all = set(), set(), False
        if low in ('no solution', 'no solutions'):
            self.kind, self.claim = 'none', ('vals', set())
            return
        m = re.fullmatch(r'all real numbers(?: except (.+))?', low)
        if m:
            self.kind = 'all'
            if m.group(1):
                for piece in re.split(r',| and ', m.group(1)):
                    self.except_.add(const_of(piece, tight))
            self.claim = ('all', set(self.except_))
            return
        m = re.match(r'case\s+x\s*(=|!=)\s*([^:]+?)\s*:\s*(.*)$', t, re.I | re.S)
        if m:
            self.kind, self.op = 'case', m.group(1)
            self.c = const_of(m.group(2), tight)
            body = m.group(3).strip()
            self.E = None if body.lower().rstrip('.') == 'excluded' else Line(body, tight)
            if self.E is not None and self.E.kind != 'eq':
                raise Unsup('case body')
            return
        pieces = re.split(r'\s*,\s*(?=x\s*!=)', t)
        body = pieces[0]
        for rp in pieces[1:]:
            mm = re.fullmatch(r'x\s*!=\s*(.+)', rp.strip())
            if not mm:
                raise Unsup('restriction')
            self.restr.add(const_of(mm.group(1), tight))
        vals, claimable = set(), not self.restr
        for part in re.split(r'\s+or\s+', body.strip()):
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
        self.zeros = den_zeros(self.divs)
        roots, all_ = set(), False
        for L, R in self.parts:
            num, _ = sympy.fraction(sympy.cancel(sympy.together(to_sympy(L) - to_sympy(R))))
            r = rational_real_roots(num)
            if r is None:
                all_ = True
            else:
                roots |= r
        self.ss_roots, self.ss_all = roots, all_

    def critical(self):
        pts = set(self.except_) | set(self.restr)
        if self.kind == 'eq':
            pts |= self.zeros | self.ss_roots
        if self.kind == 'case':
            pts.add(self.c)
            if self.E is not None:
                pts |= self.E.critical()
        if self.claim and self.claim[0] == 'vals':
            pts |= self.claim[1]
        return pts

    def holds_at(self, g):
        """True/False, or None when some denominator of the line vanishes at g."""
        try:
            for d in self.divs:
                if ev(d, g) == 0:
                    return None
            return any(ev(L, g) == ev(R, g) for L, R in self.parts)
        except ZeroDivisionError:
            return None

    def member(self, g, ok):
        if self.kind == 'none':
            return False
        if self.kind == 'all':
            return g not in self.except_ and ok(g)
        if self.kind == 'case':
            raise ValueError('case lines have no set')
        if not ok(g) or g in self.restr:
            return False
        return self.holds_at(g) is True


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


def fs(q):
    return str(q.numerator) if q.denominator == 1 else '%d/%d' % (q.numerator, q.denominator)


def route2(problem, lines, tight, pairwise=False):
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
    prob = Line(problem, tight)
    infos = []
    for t in lines:
        try:
            infos.append(Line(t, tight))
        except Unsup:
            infos.append(None)
    # solveset cross-check material is built in Line.__init__; critical points:
    pts = set(pzero) | prob.critical()
    for ln in infos:
        if ln is not None:
            pts |= ln.critical()
    G = sorted(pts | {Fr(i) for i in range(-25, 26)} | {Fr(i, 2) for i in range(-30, 31)} | set(GENERIC))
    gen_idx = [G.index(g) for g in GENERIC]

    def check_eq_line(ln):
        for g in G:
            base = (ln.ss_all or g in ln.ss_roots) and g not in ln.zeros and ok(g) and g not in ln.restr
            if base != ln.member(g, ok):
                raise Mismatch('solveset vs substitution at %s for %r' % (g, ln.text))
    check_eq_line(prob)
    for ln in infos:
        if ln is None:
            continue
        if ln.kind == 'eq':
            check_eq_line(ln)
        if ln.kind == 'case' and ln.E is not None:
            check_eq_line(ln.E)

    def isfin(v):
        return not any(v[i] for i in gen_idx)

    def minus(v, R):
        return tuple(a and (g not in R) for a, g in zip(v, G))
    truth = vec(prob, G, ok)
    prev, R = truth, set()
    Lline, Lvec = prob, truth          # the ordinary line being split
    labels, flags, unsup = [], [], []
    seen, have_prev = False, True
    for i, ln in enumerate(infos, 1):
        if ln is None:
            labels.append('unsupported')
            unsup.append(i)
            seen, have_prev = True, False
            continue
        if seen and not pairwise:
            labels.append('not-assessed')
            continue
        if ln.kind == 'case':
            if seen:
                labels.append('not-assessed')
                continue
            c = ln.c
            if ln.op == '=':
                if ln.E is None:
                    valid = (not ok(c))
                else:
                    E = ln.E
                    if any(has_x(a) or has_x(b) for a, b in E.parts) or not ok(c) or Lline.kind != 'eq' \
                            or Lline.holds_at(c) is None:
                        valid = False
                    else:
                        valid = (E.holds_at(c) is True) == (Lline.holds_at(c) is True)
                labels.append('equivalent' if valid else 'invalid')
            else:
                if ln.E is None:
                    labels.append('invalid')
                    continue
                ve = minus(vec(ln.E, G, ok), {c})
                vl = minus(Lvec, {c})
                labels.append('equivalent' if ve == vl else 'invalid')
                R = R | {c}
                prev = minus(vec(ln.E, G, ok), R)
            continue
        cur_raw = vec(ln, G, ok)
        cur = minus(cur_raw, R)
        if ln.kind == 'eq' or ln.kind in ('none', 'all'):
            Lline, Lvec = ln, cur_raw
        if not have_prev:
            labels.append('not-assessed')
            prev, have_prev = cur, True
            continue
        tr = minus(truth, R)
        rel = relation(prev, cur)
        if rel == 'eq':
            lab = 'equivalent'
        elif rel == 'sub':
            lab = 'invalid' if (isfin(prev) and not isfin(cur)) else 'valid-with-obligation'
        elif rel == 'sup':
            lab = 'valid-discharge' if all((not t) or c2 for t, c2 in zip(tr, cur)) else 'invalid'
        else:
            lab = 'invalid'
        labels.append(lab)
        if lab in ('valid-with-obligation', 'valid-discharge'):
            flags.append({'line': i, 'flag': lab})
        prev = cur
    verdict = 'no-claim'
    last = infos[-1]
    if last is not None and last.claim is not None:
        kindc, data = last.claim
        lit = tuple(g in data for g in G) if kindc == 'vals' else tuple(g not in data for g in G)
        verdict = 'correct' if lit == truth else 'wrong'
    fi = next((i for i, l in enumerate(labels, 1) if l == 'invalid'), None)
    inv = 'step' if fi else None
    if unsup:
        status, fi, inv = 'unsupported', None, None
    elif fi:
        status = 'invalid'
    elif verdict == 'wrong':
        status, fi, inv = 'invalid', len(lines), 'final-claim'
    elif verdict == 'correct':
        status = 'valid-complete'
    else:
        status = 'valid-incomplete'
    if prob.ss_all:
        tj = {'kind': 'all-except', 'except': [fs(v) for v in sorted(pzero)]}
    else:
        tj = {'kind': 'finite', 'values': [fs(v) for v in sorted(prob.ss_roots - pzero)]}
    return dict(status=status, first_invalid=fi, invalid_at=inv, final_verdict=verdict, step_flags=flags,
                step_labels=labels, unsupported_lines=unsup, truth=tj, excluded=[fs(v) for v in sorted(pzero)])


# ------------------------------------------------------------------ record-level expectations
STATUSES = {'valid-complete', 'valid-incomplete', 'invalid', 'unsupported', 'ambiguous'}
LABELS = {'equivalent', 'valid-with-obligation', 'valid-discharge', 'invalid', 'unsupported', 'not-assessed'}
CATS = ['divide-by-variable', 'multiply-by-possibly-zero', 'cancellation', 'rational-expressions',
        'removable-singularity', 'explicit-case-split', 'introduced-denominator', 'alternative-paths',
        'glyph-variants', 'ambiguous-notation', 'broken-evidence-chain', 'unsupported']
PAIRWISE = {'broken-evidence-chain'}


def rkey(r):
    return (r['status'], r['first_invalid'], r['invalid_at'], r['final_verdict'], r['truth'])


def expected_for(rec):
    pw = rec['category'] in PAIRWISE
    return route2(rec['problem'], rec['lines'], False, pw), route2(rec['problem'], rec['lines'], True, pw)


def check_record(rec, errs):
    rid = rec['id']
    e = rec['expected']
    try:
        lr, ti = expected_for(rec)
    except (Unsup, Mismatch) as ex:
        errs.append('%s: %s' % (rid, ex))
        return
    if rec['category'] == 'glyph-variants':
        try:
            a = route2(rec['problem'], rec['ascii_lines'], False)
            b = route2(rec['problem'], rec['ascii_lines'], True)
        except (Unsup, Mismatch) as ex:
            errs.append('%s: ascii equivalent: %s' % (rid, ex))
            return
        if a != lr or b != ti:
            errs.append('%s: glyph labels differ from the ASCII equivalent' % rid)
        if not any(ch in ''.join(rec['lines']) for ch in '⋅∕×÷−–'):
            errs.append('%s: no glyph present' % rid)
    if rec['category'] != 'ambiguous-notation':
        if lr != ti:
            errs.append('%s: readings disagree on a non-ambiguous task' % rid)
        if rec['truth'] != {'solution_set': lr['truth'], 'excluded': lr['excluded']}:
            errs.append('%s: truth mismatch' % rid)
    else:
        differ = lr['truth'] != ti['truth']
        if differ != (e['status'] == 'ambiguous'):
            errs.append('%s: ambiguity flag inconsistent with differing truth' % rid)
        if differ:
            if rec['truth'] != {'lr': {'solution_set': lr['truth'], 'excluded': lr['excluded']},
                                'tight': {'solution_set': ti['truth'], 'excluded': ti['excluded']}}:
                errs.append('%s: ambiguous truth mismatch' % rid)
        else:
            want = {'solution_set': lr['truth'], 'excluded': lr['excluded']}
            if lr['excluded'] != ti['excluded']:
                want['excluded_by_reading'] = {'lr': lr['excluded'], 'tight': ti['excluded']}
            if rec['truth'] != want:
                errs.append('%s: truth mismatch' % rid)
            if rkey(lr) != rkey(ti) or lr['step_labels'] != ti['step_labels'] or lr['step_flags'] != ti['step_flags'] \
                    or not e.get('readings_agree'):
                errs.append('%s: agreeing control inconsistent' % rid)
    if e['status'] == 'ambiguous':
        for name, r in (('lr', lr), ('tight', ti)):
            got = e['readings'][name]
            for k in ('status', 'first_invalid', 'invalid_at', 'final_verdict', 'step_labels', 'step_flags'):
                if got[k] != r[k]:
                    errs.append('%s: reading %s %s stored %r recomputed %r' % (rid, name, k, got[k], r[k]))
        if any(e[k] is not None for k in ('first_invalid', 'invalid_at', 'final_verdict', 'step_labels', 'step_flags')):
            errs.append('%s: ambiguous record has non-null verdict fields' % rid)
        return
    for k in ('status', 'first_invalid', 'invalid_at', 'final_verdict', 'step_flags', 'step_labels'):
        if e[k] != lr[k]:
            errs.append('%s: %s stored %r recomputed %r' % (rid, k, e[k], lr[k]))
    if lr['status'] == 'unsupported' and e.get('unsupported_lines') != lr['unsupported_lines']:
        errs.append('%s: unsupported_lines mismatch' % rid)
    if (e['status'] == 'invalid') != (e['error_class'] is not None):
        errs.append('%s: error_class presence inconsistent with status' % rid)
    if len(e['step_labels']) != len(rec['lines']) or not set(e['step_labels']) <= LABELS:
        errs.append('%s: bad step_labels shape' % rid)
    if e['status'] == 'unsupported' and len(lr['unsupported_lines']) != 1:
        errs.append('%s: expected exactly one unsupported line' % rid)


def main():
    path = os.path.join(HERE, 'adversarial3.json')
    raw = open(path, 'rb').read()
    tasks = json.loads(raw.decode('utf-8'))['tasks']
    errs, ids = [], set()
    from collections import Counter
    for rec in tasks:
        if rec['id'] in ids:
            errs.append('duplicate id ' + rec['id'])
        ids.add(rec['id'])
        if rec['family'] != 'H3' or rec['category'] not in CATS or rec['expected']['status'] not in STATUSES:
            errs.append('%s: bad family/category/status' % rec['id'])
            continue
        check_record(rec, errs)
    cc = Counter(t['category'] for t in tasks)
    for c in CATS:
        if cc[c] < 36:
            errs.append('category %s has only %d tasks' % (c, cc[c]))
    if '--regen' in sys.argv:
        import subprocess, tempfile, shutil
        tmp = tempfile.mkdtemp()
        shutil.copy(os.path.join(HERE, 'generate_adversarial3.py'), tmp)
        shutil.copy(os.path.join(HERE, 'check_adversarial3.py'), tmp)
        subprocess.run([sys.executable, os.path.join(tmp, 'generate_adversarial3.py')], check=True, capture_output=True)
        if open(os.path.join(tmp, 'adversarial3.json'), 'rb').read() != raw:
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
