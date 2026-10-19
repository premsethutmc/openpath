"""Answer types (answers@2), the server's copy of packages/learning/src/answer-types.ts.

The same rules, the same canonical forms: content/learning/answer-cases.v1.json is checked by both, and every pool
question of every family is checked for agreement (test_answer_types.py). Exact types are compared exactly
(Fractions and square-free surds); `expression` and `antiderivative` are compared at fixed sample points (numerical
identity testing, relative 1e-9); `written` is never compared automatically: an educator marks it.
"""
import math
import re
from fractions import Fraction

SAMPLED = {'expression', 'antiderivative'}
HUMAN = {'written'}
NEW_TYPES = {'exact', 'roots', 'tuple', 'matrix', 'interval', 'ratio', 'expression', 'antiderivative', 'written'}
FUNCS = {'sin', 'cos', 'tan', 'sec', 'cosec', 'csc', 'cot', 'ln', 'log', 'exp', 'sqrt', 'abs'}
NAMES = ['cosec', 'sqrt', 'sin', 'cos', 'tan', 'sec', 'csc', 'cot', 'exp', 'abs', 'log', 'ln', 'pi']
SUPER = {'⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4', '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9', '⁻': '-'}
SAMPLES = [0.3711, 0.6457, 0.9283, 1.2049, 1.5337, 1.8862, 2.3171]


class Unreadable(ValueError):
    pass


# ---------------------------------------------------------------- exact algebra: polynomials over Q(√…)

def _square_free(n):
    if n < 0:
        raise Unreadable('square root of a negative number')
    if n > 10 ** 12:
        raise Unreadable('number too large')
    k, m, p = 1, n, 2
    while p * p <= m:
        while m % (p * p) == 0:
            m //= p * p
            k *= p
        p += 1
    return k, m


def _cclean(c):
    return {m: r for m, r in c.items() if r != 0}


def _cadd(a, b):
    out = dict(a)
    for m, r in b.items():
        out[m] = out.get(m, Fraction(0)) + r
    return _cclean(out)


def _cmul(a, b):
    out = {}
    for m1, r1 in a.items():
        for m2, r2 in b.items():
            k, m = _square_free(m1 * m2)
            out = _cadd(out, {m: r1 * r2 * k})
    return out


def _cconst(r):
    return _cclean({1: Fraction(r)})


def _csurd(r):
    r = Fraction(r)
    if r < 0:
        raise Unreadable('square root of a negative number')
    if r == 0:
        return {}
    k, m = _square_free(r.numerator * r.denominator)
    return _cclean({m: Fraction(k, r.denominator)})


def _cinv(c):
    if len(c) != 1:
        raise Unreadable('a sum of surds in a denominator is not supported' if c else 'division by zero')
    (m, r), = c.items()
    return {m: 1 / (r * m)}


def _mono_parse(k):
    return [(v, int(n)) for v, n in re.findall(r'([a-z])(\d+)', k)]


def _mono_key(vs):
    return ''.join(f'{v}{n}' for v, n in sorted((x for x in vs if x[1] > 0), key=lambda x: x[0]))


def _mono_mul(a, b):
    m = dict(_mono_parse(a))
    for v, n in _mono_parse(b):
        m[v] = m.get(v, 0) + n
    return _mono_key(list(m.items()))


def _degree(k):
    return sum(n for _, n in _mono_parse(k))


def _pclean(p):
    return {k: c for k, c in p.items() if c}


def _padd(a, b):
    out = dict(a)
    for k, c in b.items():
        out[k] = _cadd(out.get(k, {}), c)
    return _pclean(out)


def _pscale(a, c):
    return _pclean({k: _cmul(x, c) for k, x in a.items()})


def _pmul(a, b):
    out = {}
    for k1, c1 in a.items():
        for k2, c2 in b.items():
            out = _padd(out, {_mono_mul(k1, k2): _cmul(c1, c2)})
    if any(_degree(k) > 12 for k in out):
        raise Unreadable('degree too high')
    return out


def _pconst(c):
    return _pclean({'': c})


def _as_const(p):
    return p.get('', {}) if all(k == '' for k in p) else None


def _qshow(r):
    return str(r.numerator) if r.denominator == 1 else f'{r.numerator}/{r.denominator}'


def _pshow(p):
    if not p:
        return '0'
    ks = sorted(p, key=lambda k: (-_degree(k), k))
    return ' '.join('[' + '+'.join(_qshow(r) if m == 1 else f'{_qshow(r)}r{m}' for m, r in sorted(p[k].items())) + ']' + k for k in ks)


# ---------------------------------------------------------------- tokenising and parsing

def normalise(raw):
    s = str(raw).strip()
    s = re.sub('[−–]', '-', s)
    s = re.sub('[×·∙]', '*', s)
    s = s.replace('÷', '/').replace('π', 'pi').replace('θ', 't')
    s = re.sub('[⁰¹²³⁴⁵⁶⁷⁸⁹⁻]+', lambda m: '^(' + ''.join(SUPER[c] for c in m.group(0)) + ')', s)
    s = s.replace('√', 'sqrt')
    return re.sub(r'\s+', ' ', s)


def _tokens(s):
    out, i = [], 0
    while i < len(s):
        c = s[i]
        if c == ' ':
            i += 1
            continue
        m = re.match(r'\d+(?:\.\d+)?', s[i:])
        if m:
            out.append(('num', m.group(0)))
            i += len(m.group(0))
            continue
        m = re.match(r'[a-zA-Z]+', s[i:])
        if m:
            w = m.group(0).lower()
            i += len(w)
            while w:
                f = next((x for x in NAMES if w.startswith(x)), None)
                if f:
                    out.append(('id', f))
                    w = w[len(f):]
                else:
                    out.append(('id', w[0]))
                    w = w[1:]
            continue
        if c in '+-*/^()|,':
            out.append(('op', c))
            i += 1
            continue
        raise Unreadable(f'cannot read {c}')
    return out


def parse(raw):
    s = normalise(raw)
    if len(s) > 200:
        raise Unreadable('too long')
    ts = _tokens(s)
    st = {'i': 0, 'abs': 0}

    def peek():
        return ts[st['i']] if st['i'] < len(ts) else None

    def is_op(v):
        p = peek()
        return p is not None and p[0] == 'op' and p[1] == v

    def take():
        t = ts[st['i']]
        st['i'] += 1
        return t

    def eat(v):
        if not is_op(v):
            raise Unreadable(f'expected {v}')
        st['i'] += 1

    def starts_atom():
        p = peek()
        return p is not None and (p[0] in ('num', 'id') or (p[0] == 'op' and p[1] in '(|'))

    def expr():
        a = term()
        while is_op('+') or is_op('-'):
            op = take()[1]
            a = ('bin', op, a, term())
        return a

    def term():
        a = unary()
        while True:
            if is_op('*') or is_op('/'):
                op = take()[1]
                a = ('bin', op, a, unary())
            elif starts_atom() and not (is_op('|') and st['abs'] > 0):
                a = ('bin', '*', a, power())
            else:
                return a

    def unary():
        if is_op('-'):
            st['i'] += 1
            return ('neg', unary())
        if is_op('+'):
            st['i'] += 1
            return unary()
        return power()

    def arg_chain():
        if is_op('-'):
            st['i'] += 1
            return ('neg', arg_chain())
        a = power()
        while peek() is not None and (peek()[0] == 'num' or (peek()[0] == 'id' and peek()[1] not in FUNCS)):
            a = ('bin', '*', a, power())
        return a

    def power():
        a = atom()
        if is_op('^'):
            st['i'] += 1
            if is_op('-'):
                st['i'] += 1
                b = ('neg', atom())
            else:
                b = atom()
            return ('bin', '^', a, b)
        return a

    def atom():
        p = peek()
        if p is None:
            raise Unreadable('unexpected end')
        if p[0] == 'num':
            st['i'] += 1
            return ('num', p[1])
        if p == ('op', '('):
            st['i'] += 1
            e = expr()
            eat(')')
            return e
        if p == ('op', '|'):
            st['i'] += 1
            st['abs'] += 1
            e = expr()
            st['abs'] -= 1
            eat('|')
            return ('fn', 'abs', e)
        if p[0] == 'id':
            st['i'] += 1
            if p[1] == 'pi':
                return ('const', 'pi')
            if p[1] in FUNCS:
                pw = None
                if is_op('^'):
                    st['i'] += 1
                    pw = atom()
                if is_op('('):
                    arg = atom()
                elif p[1] in ('sqrt', 'abs'):
                    arg = power()
                else:
                    arg = arg_chain()
                f = ('fn', 'cosec' if p[1] == 'csc' else p[1], arg)
                return ('bin', '^', f, pw) if pw is not None else f
            if p[1] == 'e':
                return ('const', 'e')
            return ('var', p[1])
        raise Unreadable(f'unexpected {p[1]}')

    e = expr()
    if st['i'] != len(ts):
        raise Unreadable(f'unexpected {ts[st["i"]][1]}')
    return e


def _small_int(c):
    if c is None:
        return None
    if not c:
        return 0
    if len(c) != 1 or 1 not in c:
        return None
    r = c[1]
    return int(r) if r.denominator == 1 and -12 <= r <= 12 else None


def exact(n):
    k = n[0]
    if k == 'num':
        return _pconst(_cconst(Fraction(n[1])))
    if k == 'var':
        return {f'{n[1]}1': _cconst(1)}
    if k == 'const':
        raise Unreadable('not exact')
    if k == 'neg':
        return _pscale(exact(n[1]), _cconst(-1))
    if k == 'fn':
        if n[1] != 'sqrt':
            raise Unreadable('not exact')
        c = _as_const(exact(n[2]))
        if c is None or any(m != 1 for m in c):
            raise Unreadable('square root of an expression is not supported')
        return _pconst(_csurd(c.get(1, Fraction(0))))
    _, op, na, nb = n
    a = exact(na)
    if op == '^':
        e = _small_int(_as_const(exact(nb)))
        if e is None:
            b = _as_const(exact(nb))
            ac = _as_const(a)
            if b is not None and ac is not None and len(b) == 1 and 1 in b and b[1] == Fraction(1, 2) and all(m == 1 for m in ac):
                return _pconst(_csurd(ac.get(1, Fraction(0))))
            raise Unreadable('unsupported power')
        if e < 0:
            c = _as_const(a)
            if c is None:
                raise Unreadable('negative power of an expression')
            out = _cconst(1)
            for _ in range(-e):
                out = _cmul(out, _cinv(c))
            return _pconst(out)
        out = _pconst(_cconst(1))
        for _ in range(e):
            out = _pmul(out, a)
        return out
    b = exact(nb)
    if op == '+':
        return _padd(a, b)
    if op == '-':
        return _padd(a, _pscale(b, _cconst(-1)))
    if op == '*':
        return _pmul(a, b)
    c = _as_const(b)
    if c is None:
        raise Unreadable('division by an expression is not supported')
    return _pscale(a, _cinv(c))


def exact_canonical(raw):
    return _pshow(exact(parse(raw)))


def _exact_number(raw):
    p = exact(parse(raw))
    if _as_const(p) is None:
        raise Unreadable('a number, not an expression')
    return _pshow(p)


# ---------------------------------------------------------------- numerical evaluation

def evaluate(n, env):
    k = n[0]
    if k == 'num':
        return float(n[1])
    if k == 'var':
        if n[1] not in env:
            raise Unreadable(f'unknown letter {n[1]}')
        return env[n[1]]
    if k == 'const':
        return math.pi if n[1] == 'pi' else math.e
    if k == 'neg':
        return -evaluate(n[1], env)
    if k == 'fn':
        a = evaluate(n[2], env)
        f = n[1]
        try:
            if f == 'sin':
                return math.sin(a)
            if f == 'cos':
                return math.cos(a)
            if f == 'tan':
                return math.tan(a)
            if f == 'sec':
                return 1 / math.cos(a)
            if f == 'cosec':
                return 1 / math.sin(a)
            if f == 'cot':
                return math.cos(a) / math.sin(a)
            if f in ('ln', 'log'):
                return math.log(a) if a > 0 else (float('-inf') if a == 0 else float('nan'))
            if f == 'exp':
                return math.exp(a)
            if f == 'sqrt':
                return math.sqrt(a) if a >= 0 else float('nan')
            if f == 'abs':
                return abs(a)
        except (ZeroDivisionError, OverflowError):
            return float('nan')
    _, op, na, nb = n
    a, b = evaluate(na, env), evaluate(nb, env)
    try:
        if op == '+':
            return a + b
        if op == '-':
            return a - b
        if op == '*':
            return a * b
        if op == '/':
            return a / b if b != 0 else float('nan')
        r = a ** b
        return r if isinstance(r, float) or isinstance(r, int) else float('nan')
    except (ZeroDivisionError, OverflowError, ValueError):
        return float('nan')


def _vars_of(n, out=None):
    out = set() if out is None else out
    if n[0] == 'var':
        out.add(n[1])
    elif n[0] in ('neg',):
        _vars_of(n[1], out)
    elif n[0] == 'fn':
        _vars_of(n[2], out)
    elif n[0] == 'bin':
        _vars_of(n[2], out)
        _vars_of(n[3], out)
    return out


def _strip_c(raw):
    return re.sub(r'\s*\+\s*[cCkK]\s*$', '', normalise(raw))


def _sampled(raw, letters, up_to_constant):
    n = parse(_strip_c(raw) if up_to_constant else raw)
    for v in _vars_of(n):
        if v not in letters:
            raise Unreadable(f'unknown letter {v}')
    return [evaluate(n, {v: SAMPLES[(i + 3 * j) % len(SAMPLES)] for j, v in enumerate(letters)}) for i in range(len(SAMPLES))]


def _close(a, b):
    return abs(a - b) <= 1e-9 * max(1, abs(a), abs(b))


def _finite(v):
    return isinstance(v, float) and math.isfinite(v) or isinstance(v, int)


def _same_sampled(raw, answer, up_to_constant):
    letters = sorted(_vars_of(parse(_strip_c(answer) if up_to_constant else answer))) or ['x']
    a = _sampled(raw, letters, up_to_constant)
    b = _sampled(answer, letters, up_to_constant)
    ok = [_finite(v) and _finite(a[i]) for i, v in enumerate(b)]
    if sum(ok) < 5:
        return False
    if not up_to_constant:
        return all(not ok[i] or _close(a[i], v) for i, v in enumerate(b))
    d = [a[i] - v for i, v in enumerate(b) if ok[i]]
    return all(_close(x, d[0]) for x in d)


# ---------------------------------------------------------------- intervals, tuples, matrices, ratios

def _q_of(raw):
    c = _as_const(exact(parse(raw)))
    if c is None or any(m != 1 for m in c):
        raise Unreadable('end points must be rational numbers')
    return c.get(1, Fraction(0))


def _read_interval(raw):
    s = normalise(raw).replace('∞', 'inf')
    s = re.sub('infinity', 'inf', s, flags=re.I)
    s = s.replace('≤', '<=').replace('=<', '<=').replace('≥', '>=').replace('=>', '>=')
    s = re.sub(r'∪|\bu\b|\bor\b', '|', s, flags=re.I).lower()
    if re.fullmatch(r'(all real numbers|r|ℝ|\(-inf, ?inf\))', s.strip()):
        return [((None, False), (None, False))]
    if re.fullmatch(r'(no solution|none|∅|\{\}|empty)', s.strip()):
        return []
    out = []
    for part in s.split('|'):
        t = part.strip()
        m = re.fullmatch(r'([\[(])\s*([^,]+?)\s*,\s*([^,]+?)\s*([\])])', t)
        if m:
            lo, hi = re.sub(r'^\+', '', m.group(2)), re.sub(r'^\+', '', m.group(3))
            out.append(((None, False) if lo == '-inf' else (_q_of(lo), m.group(1) == '['),
                        (None, False) if hi == 'inf' else (_q_of(hi), m.group(4) == ']')))
            continue
        m = re.fullmatch(r'(.+?)\s*(<=|<)\s*[a-z]\s*(<=|<)\s*(.+)', t)
        if m:
            out.append(((_q_of(m.group(1)), m.group(2) == '<='), (_q_of(m.group(4)), m.group(3) == '<=')))
            continue
        m = re.fullmatch(r'[a-z]\s*(<=|<|>=|>)\s*(.+)', t) or re.fullmatch(r'(.+?)\s*(<=|<|>=|>)\s*[a-z]', t)
        if m:
            var_first = re.match(r'[a-z]\s*[<>]', t) is not None
            op = m.group(1) if var_first else {'<': '>', '<=': '>=', '>': '<', '>=': '<='}[m.group(2)]
            v = _q_of(m.group(2) if var_first else m.group(1))
            out.append(((None, False), (v, op == '<=')) if op.startswith('<') else ((v, op == '>='), (None, False)))
            continue
        raise Unreadable('cannot read the interval')
    return out


def _lo_key(e):
    v, closed = e
    return (0, 0, 0) if v is None else (1, v, 0 if closed else 1)


def _interval_canonical(raw):
    def nonempty(iv):
        (lv, lc), (hv, hc) = iv
        return lv is None or hv is None or lv < hv or (lv == hv and lc and hc)
    ivs = sorted((iv for iv in _read_interval(raw) if nonempty(iv)), key=lambda iv: _lo_key(iv[0]))
    out = []
    for lo, hi in ivs:
        if out:
            llo, lhi = out[-1]
            touches = lhi[0] is None or (lo[0] is not None and (lo[0] < lhi[0] or (lo[0] == lhi[0] and (lo[1] or lhi[1]))))
            if touches:
                if lhi[0] is not None and (hi[0] is None or hi[0] > lhi[0] or (hi[0] == lhi[0] and hi[1])):
                    out[-1] = (llo, hi)
                continue
        out.append((lo, hi))
    if not out:
        return 'empty'
    return 'U'.join(('[' if lo[1] else '(') + (_qshow(lo[0]) if lo[0] is not None else '-inf') + ',' + (_qshow(hi[0]) if hi[0] is not None else 'inf') + (']' if hi[1] else ')') for lo, hi in out)


def _split_top(s, sep=','):
    out, depth, cur = [], 0, ''
    for c in s:
        if c in '([':
            depth += 1
        if c in ')]':
            depth -= 1
        if c == sep and depth == 0:
            out.append(cur)
            cur = ''
        else:
            cur += c
    out.append(cur)
    return [x.strip() for x in out]


def _unwrap(s):
    t = s.strip()
    if not re.match(r'[(\[⟨<]', t) or not re.search(r'[)\]⟩>]$', t):
        return t
    depth = 0
    for k, c in enumerate(t):
        if c in '([⟨<':
            depth += 1
        if c in ')]⟩>':
            depth -= 1
        if depth == 0 and k < len(t) - 1:
            return t
    return t[1:-1]


def _tuple_canonical(raw):
    parts = _split_top(_unwrap(normalise(raw)))
    if len(parts) < 2 or any(not x for x in parts):
        raise Unreadable('a list of numbers')
    return '(' + ';'.join(_exact_number(x) for x in parts) + ')'


def _matrix_canonical(raw):
    t = normalise(raw).strip()
    if t.startswith('[[') or t.startswith('(('):
        rows = [_split_top(_unwrap(r)) for r in _split_top(t[1:-1])]
    else:
        rows = [[x for x in re.split(r'[ ,]+', r.strip()) if x] for r in re.split(r';|\n', t)]
    if not rows or any(len(r) != len(rows[0]) or not r for r in rows):
        raise Unreadable('rows of the same length')
    return '[' + '|'.join(';'.join(_exact_number(x) for x in r) for r in rows) + ']'


def _ratio_canonical(raw):
    parts = [x.strip() for x in normalise(raw).split(':')]
    if len(parts) < 2 or any(not re.fullmatch(r'\d{1,9}', x) for x in parts):
        raise Unreadable('whole numbers separated by :')
    return ':'.join(str(int(x)) for x in parts)


def canonical_of(kind, raw):
    t = str(raw).strip().replace('−', '-')
    if not t or len(t) > 300:
        return None
    try:
        if kind == 'exact':
            return exact_canonical(t)
        if kind == 'roots':
            parts = [_exact_number(x) for x in _split_top(re.sub(r'^\{(.*)\}$', r'\1', normalise(t)))]
            return '&'.join(sorted(parts)) if len(set(parts)) == len(parts) else None
        if kind == 'tuple':
            return _tuple_canonical(t)
        if kind == 'matrix':
            return _matrix_canonical(t)
        if kind == 'interval':
            return _interval_canonical(t)
        if kind == 'ratio':
            return _ratio_canonical(t)
    except (Unreadable, ValueError, ZeroDivisionError, RecursionError, IndexError, KeyError):
        return None
    return None


def same_answer(kind, a, b):
    if kind in HUMAN:
        return False
    if kind in SAMPLED:
        try:
            return _same_sampled(str(a).replace('−', '-'), str(b).replace('−', '-'), kind == 'antiderivative')
        except (Unreadable, ValueError, ZeroDivisionError, RecursionError, IndexError, KeyError, OverflowError, TypeError):
            return False
    x = canonical_of(kind, a)
    return x is not None and x == canonical_of(kind, b)
