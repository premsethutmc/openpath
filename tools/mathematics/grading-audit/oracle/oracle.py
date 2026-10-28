"""Independent grading oracle for the curriculum-wide grading audit.

For every sampled question it builds candidate submissions from the stored answer by textual transformations, then decides the
TRUTH of each candidate with its own reading of the answer type's mathematical meaning (SymPy exact arithmetic, symbolic
simplification and high-precision random-point evaluation). The construction intent is recorded, but the label comes from the
mathematics: a transformation that was meant to be wrong but is mathematically equal is labelled equivalent.

It never calls or imports the production graders. The stored answer is the reference (the answer-key premise); whether the
stored answer is itself right is a separate question, answered only for families with a verified generator-owned contract.

Labels:
  equivalent      mathematically the stored answer, in the same form class           expected: credited
  form-variant    mathematically equal, written in another form (unreduced, decimal,  expected: credited unless the prompt
                  mixed/improper, expanded/factored, no +C, option text, ...)        states the form (then: not credited)
  approximation   a decimal approximation of an irrational exact answer              expected: not credited
  wrong           readable and mathematically different                              expected: not credited
  malformed       not readable as an answer of this type                             expected: unresolved (never credited)
  ambiguous       two plausible readings that differ                                 expected: unresolved (never a definite verdict)
  unverified      the oracle cannot decide                                           not scored (reported)
Working probes (answer-only questions): correct answer + wrong working -> expected credited; wrong answer + plausible working ->
expected not credited.
"""
import json
import random
import re
import signal
import sys
from fractions import Fraction

import sympy as sp

from mathtext import Unreadable, expr, is_number, split_top, strip_wrap

ORACLE_VERSION = 'grading-oracle@1'

# ------------------------------------------------------------------------------------------------ form requirements in prompts
FORM_RULES = [
    ('reduced', r'simplest form|lowest terms|standard form|simplest surd|simplest ratio|in its simplest'),
    ('mixed-number', r'as a mixed number|write it as a mixed number|mixed number if'),
    ('improper', r'as an improper fraction'),
    ('interval-notation', r'interval notation'),
    ('inequality-form', r'as an inequality'),
    ('decimal', r'as a decimal|decimal form|in decimals'),
    ('rounded', r'nearest|correct to|decimal places?|significant figures|round(?:ed)? (?:off|to)'),
    ('expanded', r'\bexpand|expanded form|without brackets'),
    ('product-of-brackets', r'(?<!may )(?<!can )(?:write|give|leave) it as a product|factori[sz]e (?:it )?completely|in factori[sz]ed form'),
    ('in-terms-of-pi', r'in terms of π|in terms of pi'),
    ('exact', r'\bexact\b'),
    ('ordered', r'in order|ascending|descending|smallest first|largest first|from the smallest|from the largest|in the order'),
]


def form_rules(prompt, expanded):
    p = (prompt or '').lower()
    rules = [name for name, rx in FORM_RULES if re.search(rx, p)]
    if expanded and 'expanded' not in rules:
        rules.append('expanded')
    return rules


# ------------------------------------------------------------------------------------------------ time limits for SymPy calls
class _Timeout(Exception):
    pass


def _alarm(_s, _f):
    raise _Timeout()


signal.signal(signal.SIGALRM, _alarm)


def limited(fn, seconds=3):
    signal.setitimer(signal.ITIMER_REAL, seconds)
    try:
        return fn()
    except _Timeout:
        return None
    finally:
        signal.setitimer(signal.ITIMER_REAL, 0)


# ------------------------------------------------------------------------------------------------ meaning of an answer text
NUMERIC_TYPES = {'integer', 'fraction', 'mixed'}


def _mixed(t):
    """'1 1/2' / '-2 3/4' as a mixed number, or None"""
    m = re.fullmatch(r'\s*([+-]?)\s*(\d+)\s+(\d+)\s*/\s*(\d+)\s*', t.replace('−', '-'))
    if not m:
        return None
    v = int(m.group(2)) + Fraction(int(m.group(3)), int(m.group(4))) if int(m.group(4)) else None
    if v is None:
        return None
    return sp.Rational(-v if m.group(1) == '-' else v)


def number(t, imaginary=False):
    """an exact number; a mixed number 'a b/c' is read as a mixed number"""
    mx = _mixed(t)
    if mx is not None:
        return mx
    e = expr(t, imaginary=imaginary)
    if e.free_symbols:
        raise Unreadable('letters in a number')
    return e


def readings(t):
    """all plausible numeric readings of t (ambiguity: '1 1/2' is a mixed number, or 1 times 1/2)"""
    out = []
    mx = _mixed(t)
    if mx is not None:
        out.append(mx)
        try:
            e = expr(t)
            if not e.free_symbols:
                out.append(e)
        except Unreadable:
            pass
    else:
        out.append(number(t))
    return out


def _items(t):
    s = strip_wrap(t, ('{}', '()', '[]'))
    parts = [p for p in split_top(s, ',;') if p != '']
    if len(parts) == 1 and re.search(r'\bor\b|\band\b', parts[0]):
        parts = [p.strip() for p in re.split(r'\bor\b|\band\b', parts[0]) if p.strip()]
    return parts


def _var_strip(p):
    """'x = 3' -> '3' (a solution written as an equation)"""
    m = re.fullmatch(r'\s*[a-zA-Z]\s*=\s*(.+)', p)
    return m.group(1) if m else p


INTERVAL_RX = re.compile(r'^\s*([\(\[])\s*([^,]+?)\s*,\s*([^,]+?)\s*([\)\]])\s*$')


def _bound(t):
    t = t.strip().replace('−', '-')
    if t in ('-∞', '-oo', '-inf', '-infinity'):
        return -sp.oo
    if t in ('∞', 'oo', '+∞', '+oo', 'inf', 'infinity'):
        return sp.oo
    return number(t)


def interval_set(t):
    """interval notation, unions, or inequalities in one variable, as a SymPy set over the reals"""
    s = t.replace('−', '-').replace('≤', '<=').replace('≥', '>=').replace('∪', ' U ').replace('∞', 'oo').strip()
    s = re.sub(r'^[a-z]\s*∈\s*', '', s)
    if not s:
        raise Unreadable('empty')
    pieces = [p for p in re.split(r'\s+U\s+|\s+or\s+|\s+∪\s+', s) if p.strip()]
    out = sp.EmptySet
    for p in pieces:
        p = p.strip()
        m = INTERVAL_RX.match(p)
        if m:
            lo, hi = _bound(m.group(2)), _bound(m.group(3))
            if (m.group(1) == '[' and lo == -sp.oo) or (m.group(4) == ']' and hi == sp.oo):
                raise Unreadable('closed at infinity')
            if not lo < hi:
                raise Unreadable('empty or reversed interval')
            out = out | sp.Interval(lo, hi, m.group(1) == '(', m.group(4) == ')')
            continue
        # inequality chain: a < x <= b, x > a, x <= b, a > x
        toks = [x.strip() for x in re.split(r'(<=|>=|<|>)', p)]
        if len(toks) not in (3, 5) or not all(toks[i] for i in range(0, len(toks), 2)):
            raise Unreadable(f'not an interval: {p}')
        var = [i for i in range(0, len(toks), 2) if re.fullmatch(r'[a-zA-Z]', toks[i])]
        if len(var) != 1:
            raise Unreadable('inequality without one variable')
        v = sp.Symbol('v')
        cond = sp.true
        for i in range(1, len(toks), 2):
            a = v if i - 1 in var else number(toks[i - 1])
            b = v if i + 1 in var else number(toks[i + 1])
            cond = sp.And(cond, {'<': sp.Lt, '<=': sp.Le, '>': sp.Gt, '>=': sp.Ge}[toks[i]](a, b))
        out = out | cond.as_set()
    return out


def matrix_of(t):
    s = t.replace('−', '-').strip()
    if not (s.startswith('[') and s.endswith(']')):
        raise Unreadable('not a matrix')
    if s.startswith('[[') :
        rows = re.findall(r'\[([^\[\]]*)\]', s[1:-1])
    elif ';' in s:
        rows = [r for r in s[1:-1].split(';')]
    else:
        raise Unreadable('not a matrix')
    if not rows:
        raise Unreadable('no rows')
    m = [[number(x) for x in split_top(r, ',')] for r in rows]
    if len({len(r) for r in m}) != 1:
        raise Unreadable('ragged rows')
    return m


def ratio_of(t):
    s = t.replace('−', '-').replace('∶', ':').strip()
    parts = s.split(':') if ':' in s else s.split('/')
    if len(parts) != 2:
        raise Unreadable('not a ratio')
    a, b = number(parts[0]), number(parts[1])
    if a == 0 or b == 0 or a < 0 or b < 0:
        raise Unreadable('ratio with a zero or negative part')
    return (a, b)


def _item(p, ctx):
    """one element of a list: a mixed number is a mixed number where the stored answer is numeric"""
    if not ctx.get('stored_symbolic'):
        mx = _mixed(p)
        if mx is not None:
            return mx
    return expr(p, imaginary=ctx.get('imaginary', False))


def meaning(typ, text, ctx):
    """the mathematical object a text denotes for this answer type (raises Unreadable)"""
    t = (text or '').strip()
    if not t:
        raise Unreadable('empty')
    if typ == 'choice':
        opts = [re.sub(r'\s+', ' ', o).strip().lower() for o in (ctx.get('options') or [])]
        norm = re.sub(r'\s+', ' ', t).strip().lower()
        if len(t) > 1 and norm in opts:
            return chr(65 + opts.index(norm))
        if not re.fullmatch(r'[A-Za-z]', t):
            raise Unreadable('not a single option letter')
        L = t.upper()
        if ord(L) - 65 >= len(ctx.get('options') or 'ABCD'):
            raise Unreadable('no such option')
        return L
    if typ in NUMERIC_TYPES:
        return number(t)
    if typ in ('set', 'roots'):
        items = _items(t)
        if not items:
            raise Unreadable('empty list')
        return [_item(_var_strip(p), ctx) for p in items]
    if typ == 'tuple':
        items = split_top(strip_wrap(t, ('()', '[]', '⟨⟩')), ',')
        if not all(items):
            raise Unreadable('empty item')
        return [_item(p, ctx) for p in items]
    if typ == 'matrix':
        return matrix_of(t)
    if typ == 'interval':
        return interval_set(t)
    if typ == 'ratio':
        return ratio_of(t)
    if typ in ('exact', 'expression', 'antiderivative'):
        s = t
        lhs = re.fullmatch(r'\s*([a-zA-Z](?:\s*\(\s*[a-z]\s*\))?|f⁻¹\(x\)|f\^-1\(x\)|dy/dx)\s*=\s*(.+)', s)
        if lhs and ctx.get('stored_lhs') is None:
            s = lhs.group(2)
        eq0 = re.fullmatch(r'(.+?)\s*=\s*0\s*', s)
        if eq0 and ctx.get('stored_symbolic'):
            s = eq0.group(1)
        if not ctx.get('stored_symbolic'):
            mx = _mixed(s)
            if mx is not None:
                return mx
        e = expr(s, imaginary=ctx.get('imaginary', False))
        return e
    raise Unreadable(f'unknown type {typ}')


# ------------------------------------------------------------------------------------------------ equality
POINTS = [sp.Rational(37, 100), sp.Rational(173, 100), sp.Rational(29, 10), sp.Rational(-13, 10), sp.Rational(81, 100),
          sp.Rational(36, 10), sp.Rational(-27, 10), sp.Rational(113, 100)]


def _num_eq(a, b):
    d = limited(lambda: sp.N(a - b, 60), 3)
    if d is None:
        return None
    try:
        mag = abs(complex(d))
    except (TypeError, ValueError):
        return None
    if mag > 1e-25:
        return False
    z = limited(lambda: sp.simplify(a - b) == 0, 3)
    if z is True:
        return True
    z = limited(lambda: sp.nsimplify(sp.N(a - b, 80), rational=False) == 0, 3)
    return True if (z or mag < 1e-50) else None


def _real(e):
    return e.subs({s: sp.Symbol(s.name, real=True) for s in e.free_symbols}) if isinstance(e, sp.Basic) else e


def _fn_eq(a, b, up_to_constant=False, constant=None):
    a, b = _real(a), _real(b)
    if constant is not None:
        constant = sp.Symbol(constant.name, real=True)
    syms = sorted((a.free_symbols | b.free_symbols) - ({constant} if constant else set()), key=str)
    if up_to_constant:
        if constant is not None:
            a, b = a.subs(constant, 0), b.subs(constant, 0)
        xs = [s for s in syms if str(s) == 'x'] or syms[:1]
        if not xs:
            return _num_eq(a, b) if (a - b).free_symbols == set() else None
        a, b = sp.diff(a, xs[0]), sp.diff(b, xs[0])
        syms = sorted(a.free_symbols | b.free_symbols, key=str)
    if not syms:
        return _num_eq(a, b)
    good, diff = 0, False
    for k in range(len(POINTS)):
        env = {s: POINTS[(k + 3 * j) % len(POINTS)] for j, s in enumerate(syms)}
        va = limited(lambda: sp.N(a.subs(env), 40), 3)
        vb = limited(lambda: sp.N(b.subs(env), 40), 3)
        if va is None or vb is None:
            continue
        try:
            ca, cb = complex(va), complex(vb)
        except (TypeError, ValueError):
            continue
        if any(map(lambda z: z != z or abs(z) == float('inf') or abs(z.imag) > 1e-20, (ca, cb))):
            continue
        good += 1
        if abs(ca - cb) > 1e-18 * max(1.0, abs(ca), abs(cb)):
            diff = True
            break
    if diff:
        return False
    if good < 3:
        return None
    return True


def equal(typ, a, b, ctx):
    """True / False / None (undecided) for two meanings of the same type"""
    if typ == 'choice':
        return a == b
    if typ in NUMERIC_TYPES:
        return _num_eq(a, b)
    if typ in ('set', 'roots'):
        if typ == 'set':
            ua, ub = _dedupe(a), _dedupe(b)
        else:
            ua, ub = list(a), list(b)
        if ua is None or ub is None or len(ua) != len(ub):
            return False if (ua is not None and ub is not None) else None
        left = list(ub)
        for x in ua:
            hit = None
            for i, y in enumerate(left):
                e = _num_eq(x, y) if not (x.free_symbols or y.free_symbols) else _fn_eq(x, y)
                if e is None:
                    return None
                if e:
                    hit = i
                    break
            if hit is None:
                return False
            left.pop(hit)
        return True
    if typ == 'tuple':
        if len(a) != len(b):
            return False
        r = [(_num_eq(x, y) if not (x.free_symbols or y.free_symbols) else _fn_eq(x, y)) for x, y in zip(a, b)]
        return False if False in r else (None if None in r else True)
    if typ == 'matrix':
        if len(a) != len(b) or len(a[0]) != len(b[0]):
            return False
        r = [_num_eq(x, y) for ra, rb in zip(a, b) for x, y in zip(ra, rb)]
        return False if False in r else (None if None in r else True)
    if typ == 'interval':
        z = limited(lambda: a == b or sp.simplify(sp.Complement(a, b) | sp.Complement(b, a)) == sp.EmptySet, 4)
        return bool(z) if z is not None else None
    if typ == 'ratio':
        return _num_eq(a[0] * b[1], a[1] * b[0])
    if typ == 'antiderivative':
        return _fn_eq(a, b, up_to_constant=True, constant=sp.Symbol('C'))
    if typ in ('exact', 'expression'):
        if not a.free_symbols and not b.free_symbols:
            return _num_eq(a, b)
        return _fn_eq(a, b)
    return None


def _dedupe(xs):
    out = []
    for x in xs:
        dup = False
        for y in out:
            e = _num_eq(x, y) if not (x.free_symbols or y.free_symbols) else _fn_eq(x, y)
            if e is None:
                return None
            if e:
                dup = True
                break
        if not dup:
            out.append(x)
    return out


# ------------------------------------------------------------------------------------------------ candidate construction
NUM_TOKEN = re.compile(r'(?<![\w.])(\d+(?:\.\d+)?)')


def _perturb(s, which=0):
    """add 1 to the first (which=0) or last (which=-1) number written in s"""
    ms = list(NUM_TOKEN.finditer(s))
    if not ms:
        return None
    m = ms[which]
    v = m.group(1)
    nv = str(Fraction(v) + 1) if '.' not in v else f'{float(v) + 1:g}'
    return s[:m.start()] + nv + s[m.end():]


def _ascii(s):
    t = s.replace('−', '-').replace('π', 'pi').replace('×', '*')
    t = re.sub(r'√\(', 'sqrt(', t)
    t = re.sub(r'√(\d+|[a-z])', r'sqrt(\1)', t)
    t = re.sub(r'([²³⁴⁵⁶⁷⁸⁹])', lambda m: '^' + '²³⁴⁵⁶⁷⁸⁹'.index(m.group(1)).__add__(2).__str__(), t)
    t = t.replace('⁻¹', '^-1')
    return t


def _neg(s):
    t = s.strip()
    return t[1:].lstrip() if t[:1] in '-−' else '-' + t


def _fmt(e):
    """a learner-plausible ASCII rendering of a SymPy number/expression"""
    return str(e).replace('**', '^').replace('*', '')  # 3*sqrt(2) -> 3sqrt(2)


def _frac_text(r):
    r = sp.Rational(r)
    return str(r.p) if r.q == 1 else f'{r.p}/{r.q}'


def _decimal_text(r):
    r = Fraction(int(sp.Rational(r).p), int(sp.Rational(r).q))
    d = r.denominator
    while d % 2 == 0:
        d //= 2
    while d % 5 == 0:
        d //= 5
    if d != 1:
        return None
    s = f'{float(r):.12f}'.rstrip('0').rstrip('.')
    return s


def candidates(q):
    """[(text, working, intent, tag)] for one sampled question"""
    s, typ = q['answer'], q['type']
    C = []
    add = lambda text, intent, tag, working=None: C.append((text, working or [], intent, tag)) if text is not None else None
    add(s, 'equivalent', 'stored')
    if typ == 'choice':
        opts = q.get('options') or []
        add(s.lower(), 'form', 'lowercase-letter')
        for i, _ in enumerate(opts):
            L = chr(65 + i)
            if L != s.upper():
                add(L, 'wrong', 'other-option')
        add(chr(65 + len(opts)) if opts else 'E', 'malformed', 'no-such-option')
        add('Z', 'malformed', 'invalid-letter')
        if opts:
            idx = ord(s.upper()) - 65
            if 0 <= idx < len(opts):
                add(opts[idx], 'form', 'option-text-correct')
            wrong = [o for i, o in enumerate(opts) if i != idx]
            if wrong:
                add(wrong[0], 'wrong', 'option-text-wrong')
        add('AB', 'malformed', 'two-letters')
    else:
        add(re.sub(r'\s+', '', s), 'equivalent', 'no-spaces')
        add(re.sub(r'\s*(,|\+|(?<![<>!])=(?!=)|:)\s*', r' \1 ', s).strip(), 'equivalent', 'extra-spaces')
        if _ascii(s) != s:
            add(_ascii(s), 'equivalent', 'ascii-glyphs')
        add(_perturb(s, 0), 'wrong', 'first-number-plus-one')
        p_last = _perturb(s, -1)
        if p_last != _perturb(s, 0):
            add(p_last, 'wrong', 'last-number-plus-one')
        if typ not in ('interval', 'ratio', 'matrix', 'set', 'roots', 'tuple'):
            add(_neg(s), 'wrong', 'sign-flip')
        add(s.rstrip() + ' +', 'malformed', 'dangling-operator')
        add('(' + s, 'malformed', 'unbalanced-bracket')
        add('?', 'malformed', 'question-mark')
        add('1/0', 'malformed', 'division-by-zero')
        add('xyz' if not re.search(r'[a-z]', s) else '@@', 'malformed', 'letters')
    add(' ', 'malformed', 'blank')
    if typ != 'choice':
        # a number broken by a space that no digit-grouping convention uses ("17714 7"): not a number
        m = re.search(r'(?<![\d./])(\d{2,})(?![\d./])', s)
        if m:
            add(s[:m.start()] + m.group(1)[:-1] + ' ' + m.group(1)[-1] + s[m.end():], 'malformed', 'digits-split')
        # the generator's own predicted misconception answers (domain-invalid roots, sign slips, ...): truth decided below
        for b in (q.get('bugPredictions') or [])[:4]:
            if b != s:
                add(b, 'wrong', 'predicted-misconception')
    add(s, 'equivalent', 'correct-with-wrong-working', ['2 + 2 = 5', 'so the answer follows'])
    w = next((c[0] for c in C if c[3] == 'other-option'), None) if typ == 'choice' else _perturb(s, 0)
    if w is not None:
        add(w, 'wrong', 'wrong-with-plausible-working', [f'answer = {w}'])
    C.extend(_typed(q))
    seen, out = set(), []
    for c in C:
        k = (c[0], tuple(c[1]))
        if k not in seen:
            seen.add(k)
            out.append(c)
    return out


def _typed(q):
    s, typ, C = q['answer'], q['type'], []
    add = lambda text, intent, tag: C.append((text, [], intent, tag)) if text is not None and text != s else None
    try:
        if typ in NUMERIC_TYPES or (typ == 'exact' and not re.search(r'[a-zA-Zπ√]', s)):
            v = number(s) if typ != 'exact' else expr(s)
            if v.is_rational:
                r = sp.Rational(v)
                add(_frac_text(r), 'equivalent' if typ != 'mixed' or abs(r) < 1 else 'form', 'improper-fraction')
                add(f'{2 * r.p}/{2 * r.q}', 'form', 'unreduced-fraction')
                add(_decimal_text(r), 'form' if r.q != 1 else 'equivalent', 'decimal')
                if r.q == 1:
                    add(f'{r.p}.0', 'form', 'trailing-zero')
                    add(f'{2 * r.p}/2', 'form', 'integer-as-fraction')
                    add(f'+{r.p}' if r.p >= 0 else None, 'equivalent', 'explicit-plus')
                if r.q != 1 and abs(r) > 1:
                    whole = int(abs(r)) * (1 if r > 0 else -1)
                    rest = abs(r) - abs(whole)
                    add(f'{whole} {rest.p}/{rest.q}', 'form', 'mixed-number')
                if r.q != 1:
                    add(f'{r.q}/{r.p}', 'wrong', 'reciprocal')
                    add(f'{r.p}/{r.q * 2}', 'wrong', 'half')
                if r != 0:
                    add(_frac_text(r * 10), 'wrong', 'times-ten')
                if typ == 'fraction' and r.q != 1 and abs(r) < 1:
                    add(f'1 {abs(r.p)}/{r.q}', 'wrong', 'one-plus')
            else:
                add(_fmt(sp.N(v, 6)), 'approximation', 'decimal-approximation')
        elif typ == 'exact' or typ == 'expression':
            e = expr(s, imaginary=bool(q.get('_imag')))
            add(_fmt(e), 'equivalent', 'sympy-rendering')
            if e.free_symbols:
                ex = limited(lambda: sp.expand(e), 2)
                fa = limited(lambda: sp.factor(e), 2)
                if ex is not None and str(ex) != str(e):
                    add(_fmt(ex), 'form', 'expanded')
                if fa is not None and str(fa) != str(e):
                    add(_fmt(fa), 'form', 'factored')
                add(f'{_fmt(e)} = 0' if typ == 'exact' else None, 'form', 'equation-equals-zero')
                add(_fmt(sp.diff(e, sorted(e.free_symbols, key=str)[0])), 'wrong', 'derivative-instead')
                add(_fmt(2 * e), 'wrong', 'doubled')
            elif not e.is_rational:
                add(_fmt(sp.N(e, 6)), 'approximation', 'decimal-approximation')
                add(_fmt(sp.radsimp(1 / e)) if e != 0 else None, 'wrong', 'reciprocal')
        elif typ == 'antiderivative':
            e = expr(s)
            noC = re.sub(r'\s*\+\s*C\s*$', '', s)
            if noC != s:
                add(noC, 'form', 'no-constant')
                add(noC + ' + 7', 'equivalent', 'other-constant')
                add(noC + ' + K', 'equivalent', 'other-constant-letter')
            else:
                add(s + ' + C', 'equivalent', 'with-constant')
            add(s.replace('log', 'ln') if 'log' in s else s.replace('ln', 'log'), 'equivalent', 'log-ln-spelling')
            x = sp.Symbol('x', real=True)
            d = limited(lambda: sp.simplify(sp.diff(_real(e).subs(sp.Symbol('C', real=True), 0), x)), 3)
            add(_fmt(d).replace('Abs', '') if d is not None and not d.has(sp.sign, sp.Derivative, sp.Piecewise) else None, 'wrong', 'derivative-instead')
        elif typ in ('set', 'roots'):
            items = _items(s)
            if len(items) > 1:
                add(', '.join(reversed(items)), 'equivalent', 'reordered')
                add(', '.join(items[:-1]), 'wrong', 'missing-one')
                add(', '.join(items + [items[0]]), 'form' if typ == 'set' else 'wrong', 'duplicate')
            add('{' + ', '.join(items) + '}', 'equivalent', 'braces')
            add(' or '.join(f'x = {i}' for i in items), 'form', 'x-equals-or')
            add(', '.join(items + ['1000']), 'wrong', 'extra-one')
            add(' '.join(items) if len(items) > 1 else None, 'malformed', 'space-separated')
        elif typ == 'tuple':
            inner = strip_wrap(s, ('()',))
            items = split_top(inner, ',')
            wrapped = s.strip().startswith('(')
            add(inner if wrapped else f'({inner})', 'form', 'parentheses-toggled')
            if len(items) > 1:
                add(('(' if wrapped else '') + ', '.join(reversed(items)) + (')' if wrapped else ''), 'wrong', 'reversed')
                sw = [items[1], items[0]] + items[2:]
                add(('(' if wrapped else '') + ', '.join(sw) + (')' if wrapped else ''), 'wrong', 'first-two-swapped')
                add(('(' if wrapped else '') + ', '.join(items[:-1]) + (')' if wrapped else ''), 'wrong', 'missing-component')
        elif typ == 'matrix':
            m = matrix_of(s)
            add('[' + ', '.join('[' + ', '.join(_frac_text(x) if x.is_rational else _fmt(x) for x in r) + ']' for r in m) + ']', 'equivalent', 'plain-rendering')
            if len(m) == len(m[0]):
                tr = [list(r) for r in zip(*m)]
                add('[' + ', '.join('[' + ', '.join(_fmt(x) for x in r) + ']' for r in tr) + ']', 'wrong', 'transpose')
            add('[' + '; '.join(', '.join(_fmt(x) for x in r) for r in m) + ']', 'form', 'semicolon-rows')
        elif typ == 'interval':
            t = s.replace('−', '-')
            m = INTERVAL_RX.match(t.split('∪')[0].strip()) if '∪' not in t else None
            if m:
                lo, hi = m.group(2), m.group(3)
                flip = {'(': '[', '[': '(', ')': ']', ']': ')'}
                if 'oo' not in lo and '∞' not in lo:
                    add(flip[m.group(1)] + lo + ', ' + hi + m.group(4), 'wrong', 'left-closure-flipped')
                if 'oo' not in hi and '∞' not in hi:
                    add(m.group(1) + lo + ', ' + hi + flip[m.group(4)], 'wrong', 'right-closure-flipped')
                op = {'(': '<', '[': '<='}[m.group(1)], {')': '<', ']': '<='}[m.group(4)]
                if '∞' in lo and '∞' not in hi:
                    add(f'x {op[1]} {hi}', 'form', 'as-inequality')
                elif '∞' in hi and '∞' not in lo:
                    add(f'x {">" if op[0] == "<" else ">="} {lo}', 'form', 'as-inequality')
                elif '∞' not in lo and '∞' not in hi:
                    add(f'{lo} {op[0]} x {op[1]} {hi}', 'form', 'as-inequality')
            if '∪' in s:
                add(s.replace('∪', 'U'), 'equivalent', 'U-for-union')
                add(s.replace('∪', 'or'), 'form', 'or-for-union')
            if '∞' in s:
                add(s.replace('∞', 'oo').replace('−oo', '-oo'), 'equivalent', 'oo-for-infinity')
                add(s.replace('(−∞', '[−∞').replace('∞)', '∞]'), 'malformed', 'closed-at-infinity')
            im = re.fullmatch(r'\s*([a-z])\s*(<=|>=|<|>|≤|≥)\s*(\S+)\s*', s)
            if im:
                v, o, b = im.groups()
                o = {'≤': '<=', '≥': '>='}.get(o, o)
                iv = {'<': f'(−∞, {b})', '<=': f'(−∞, {b}]', '>': f'({b}, ∞)', '>=': f'[{b}, ∞)'}[o]
                add(iv, 'form', 'as-interval')
                add(f'{v} {"<" if o in (">", ">=") else ">"} {b}', 'wrong', 'direction-flipped')
                add(f'{b} {"<" if o == ">" else "<=" if o == ">=" else ">" if o == "<" else ">="} {v}', 'equivalent', 'reversed-sides')
        elif typ == 'ratio':
            a, b = [x.strip() for x in s.replace('∶', ':').split(':')]
            add(f'{a} : {b}', 'equivalent', 'spaced')
            add(f'{b}:{a}', 'wrong', 'swapped')
            try:
                add(f'{2 * int(a)}:{2 * int(b)}', 'form', 'unsimplified')
            except ValueError:
                pass
            add(f'{a}/{b}', 'form', 'as-fraction')
    except Unreadable:
        pass
    # ambiguity: "(1/N)x" or "x/N" written as "1/Nx" reads as x/N or as 1/(Nx)
    if typ in ('exact', 'expression', 'antiderivative'):
        m = re.search(r'\(1/(\d+)\)\s*([a-z])(?![a-z(])', s) or re.search(r'(?<![\w)^])([a-z])/(\d+)(?![\d.])', s)
        if m:
            n, v = (m.group(1), m.group(2)) if s[m.start()] == '(' else (m.group(2), m.group(1))
            text = s[:m.start()] + f'1/{n}{v}' + s[m.end():]
            other = s[:m.start()] + f'1/({n}{v})' + s[m.end():]
            C.append((text, [], 'ambiguous', 'reciprocal-juxtaposition|' + other))
    return C


# ------------------------------------------------------------------------------------------------ labels
VIOLATES = {
    'unreduced-fraction': {'reduced'}, 'integer-as-fraction': {'reduced'}, 'unsimplified': {'reduced'},
    'decimal': {'reduced', 'mixed-number', 'improper'}, 'mixed-number': {'improper'}, 'improper-fraction': {'mixed-number'},
    'expanded': {'product-of-brackets'}, 'factored': {'expanded'}, 'as-inequality': {'interval-notation'},
    'as-interval': {'inequality-form'}, 'reordered': {'ordered'}, 'or-for-union': {'interval-notation'},
}


def context(q):
    stored = q['answer']
    imag = bool(re.search(r'(?<![a-zA-Z])i(?![a-zA-Z])', stored)) or 'complex' in (q.get('prompt') or '').lower()
    return {'options': q.get('options'), 'imaginary': imag, 'stored_symbolic': bool(re.search(r'[a-zA-Z]', re.sub(r'sqrt|√|π|pi|log|ln|sin|cos|tan', '', stored)))}


def numeric_form(text):
    t = re.sub(r'\s+', ' ', (text or '').replace('−', '-')).strip()
    if re.fullmatch(r'[+-]?\d+', t):
        return 'integer'
    mm = re.fullmatch(r'[+-]?\d+ (\d+)/(\d+)', t)
    if mm:
        from math import gcd
        b, c = int(mm.group(1)), int(mm.group(2))
        return 'mixed' if 0 < b < c and gcd(b, c) == 1 else 'improper-mixed'
    if re.fullmatch(r'[+-]?(\d+\.\d*|\.\d+)', t):
        return 'decimal'
    m = re.fullmatch(r'([+-]?)(\d+)\s*/\s*([+-]?\d+)', t)
    if m:
        a, b = int(m.group(2)), int(m.group(3))
        from math import gcd
        return 'fraction' if b > 0 and gcd(a, b) == 1 else 'unreduced-fraction'
    return 'other'


FORM_VIOLATES = {'mixed': {'improper'}, 'improper-mixed': {'reduced', 'mixed-number', 'improper'}, 'unreduced-ratio': {'reduced'}, 'fraction': {'mixed-number'}, 'unreduced-fraction': {'reduced', 'mixed-number'},
                 'decimal': {'reduced', 'mixed-number', 'improper'}, 'integer': set()}


def label_one(q, ctx, ref, cand):
    text, working, intent, tag = cand
    typ = q['type']
    rec = {'response': text, 'working': working, 'intent': intent, 'tag': tag.split('|')[0]}
    if intent == 'ambiguous':
        other = tag.split('|', 1)[1]
        try:
            a, b = meaning(typ, q['answer'], ctx), meaning(typ, other, ctx)
            same = equal(typ, a, b, ctx)
        except Unreadable:
            same = None
        rec['truth'] = 'unverified' if same is None else ('equivalent' if same else 'ambiguous')
        rec['basis'] = 'two readings: as stored, and ' + other
        return rec
    try:
        m = meaning(typ, text, ctx)
    except Unreadable as ex:
        rec['truth'], rec['basis'] = 'malformed', f'unreadable: {ex}'
        rec['invalid'] = 'type-mismatch' if re.search(r'option|letter', str(ex)) else 'syntax'
        return rec
    if _symbols(ref) == set() and _symbols(m) - {sp.Symbol('C')}:
        rec['truth'], rec['basis'], rec['invalid'] = 'malformed', 'unreadable: letters where numbers are expected', 'type-mismatch'
        return rec
    eq = equal(typ, ref, m, ctx)
    if eq is None:
        rec['truth'], rec['basis'] = 'unverified', 'oracle could not decide equality'
    elif eq is False:
        rec['truth'], rec['basis'] = ('approximation' if intent == 'approximation' else 'wrong'), 'oracle: not equal to the stored answer'
    else:
        rec['truth'] = 'form-variant' if intent == 'form' else 'equivalent'
        rec['basis'] = 'oracle: equal to the stored answer' + (' (constructed as wrong)' if intent in ('wrong', 'malformed') else '')
        # an equal number written in another number form (mixed / improper / decimal / unreduced) is a form variant, whatever the intent
        if typ in NUMERIC_TYPES or (typ == 'exact' and not ctx.get('stored_symbolic')):
            fs, fc = numeric_form(q['answer']), numeric_form(text)
            if 'other' not in (fs, fc) and fs != fc:
                rec['truth'] = 'form-variant'
                rec['numberForm'] = fc
        if typ == 'ratio':
            from math import gcd
            a_, b_ = m
            if a_.is_Integer and b_.is_Integer and gcd(int(a_), int(b_)) != 1:
                rec['truth'] = 'form-variant'
                rec['numberForm'] = 'unreduced-ratio'
    return rec


def _symbols(m):
    if isinstance(m, sp.Basic):
        return m.free_symbols - ({sp.Symbol('C')} if False else set()) if not isinstance(m, sp.Set) else set()
    if isinstance(m, (list, tuple)):
        out = set()
        for x in m:
            out |= _symbols(x)
        return out
    return set()


def run_family(rows):
    out = []
    for q in rows:
        ctx = context(q)
        rules = form_rules(q.get('prompt'), q.get('expanded'))
        try:
            ref = meaning(q['type'], q['answer'], ctx)
            ref_ok = True
        except Unreadable as ex:
            ref, ref_ok = None, str(ex)
        q2 = dict(q, _imag=ctx['imaginary'])
        cands = []
        for c in candidates(q2):
            if ref_ok is not True:
                cands.append({'response': c[0], 'working': c[1], 'intent': c[2], 'tag': c[3].split('|')[0], 'truth': 'unverified', 'basis': f'oracle cannot read the stored answer: {ref_ok}'})
                continue
            r = label_one(q, ctx, ref, c)
            viol = FORM_VIOLATES.get(r['numberForm'], set()) if 'numberForm' in r else VIOLATES.get(r['tag'], set())
            r['violates'] = sorted(viol & set(rules)) if r['truth'] == 'form-variant' else []
            cands.append(r)
        out.append({'qid': q['qid'], 'family': q['family'], 'form': q['form'], 'type': q['type'], 'answer': q['answer'], 'formRules': rules,
                    'storedReadable': ref_ok is True, 'candidates': cands})
    return out


def _work(args):
    fam, rows, path = args
    import os
    if os.path.exists(path):
        return fam, 'cached'
    res = run_family(rows)
    tmp = path + '.tmp'
    with open(tmp, 'w') as f:
        json.dump({'oracle': ORACLE_VERSION, 'family': fam, 'questions': res}, f)
    os.replace(tmp, path)
    return fam, len(res)


if __name__ == '__main__':
    import os
    from collections import defaultdict
    from multiprocessing import Pool
    samples, outdir = sys.argv[1], sys.argv[2]
    only = set(sys.argv[3].split(',')) if len(sys.argv) > 3 else None
    os.makedirs(outdir, exist_ok=True)
    fams = defaultdict(list)
    for line in open(samples):
        q = json.loads(line)
        if only is None or q['family'] in only:
            fams[q['family']].append(q)
    jobs = [(f, rs, os.path.join(outdir, f + '.json')) for f, rs in sorted(fams.items())]
    done = 0
    with Pool(int(os.environ.get('ORACLE_PROCS', '6'))) as pool:
        for fam, n in pool.imap_unordered(_work, jobs):
            done += 1
            if done % 100 == 0:
                print(done, 'families', flush=True)
    print('oracle done', done)
