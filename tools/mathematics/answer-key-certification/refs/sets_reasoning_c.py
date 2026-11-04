"""sets-reasoning slice, part C: codes, sequences, digit explorations, flowcharts, magic squares, modelling, remainders.
Independent of production code; simulation / brute force / exact algebra from the statement and figure."""
import itertools
import json
import math
import re
from fractions import Fraction
from kit import ref, Expect, Verdict, Unsupported, Ambiguous, sp
from refs.sets_reasoning_a import options, pick, norm, option_is, parse_formula, ev  # noqa: F401

A2Z = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'


def shift(word, k):
    return ''.join(A2Z[(A2Z.index(c) + k) % 26] for c in word)


@ref('akcode', 'apply / invert the stated shift letter by letter modulo 26; substitution key read from the figure (plain -> code), inverted for decoding and checked to be a bijection; the unique option equal to the result', 'exhaustive')
def akcode(q):
    p = q['prompt']
    m = re.search(r'moves forward (\d+) places', p)
    if m:
        k = int(m.group(1))
        mm = re.search(r'How is ([A-Z]+) written', p)
        if mm:
            want = shift(mm.group(1), k)
        else:
            msg = re.search(r'reads ([A-Z]+)\.', p).group(1)
            want = shift(msg, -k)
        return Expect(pick(q, lambda o: o == want))
    f = q['figure']
    plain, code = [], []
    # figure: head = Plain row, rows alternate Code, Plain, Code
    seqs = [f['head']] + f['rows']
    assert [s[0] for s in seqs] == ['Plain', 'Code', 'Plain', 'Code']
    plain = seqs[0][1:] + seqs[2][1:]; code = seqs[1][1:] + seqs[3][1:]
    assert plain == list(A2Z) and sorted(code) == list(A2Z)
    inv = dict(zip(code, plain))
    msg = re.search(r'reads ([A-Z]+)\.', p).group(1)
    want = ''.join(inv[c] for c in msg)
    return Expect(pick(q, lambda o: o == want))


@ref('akcollatz', 'iterate the Collatz rule from the start value', 'exhaustive')
def akcollatz(q):
    p = q['prompt']
    s = int(re.match(r'Start with (\d+)', p).group(1))
    k = int(re.search(r'What is the (\d+)(?:st|nd|rd|th) number', p).group(1))
    x = s
    for _ in range(k - 1):
        x = x // 2 if x % 2 == 0 else 3 * x + 1
    return Expect(str(x))


@ref('akcolst', 'iterate the Collatz rule until 1; steps = number of applications, largest = max of the sequence', 'exhaustive')
def akcolst(q):
    p = q['prompt']
    x = int(re.search(r'Start with (\d+)', p).group(1))
    seq = [x]
    while x != 1:
        x = x // 2 if x % 2 == 0 else 3 * x + 1
        seq.append(x)
    return Expect(str(len(seq) - 1 if 'how many steps' in p.lower() else max(seq)))


_cache = {}


def cryptarithm(eq, lead_nonzero):
    key = (eq, lead_nonzero)
    if key in _cache:
        return _cache[key]
    letters = sorted(set(re.findall(r'[A-Z]', eq)))
    words = re.findall(r'[A-Z]+', eq)
    leads = {w[0] for w in words if len(w) > 1} if lead_nonzero else set()
    lhs, rhs = eq.split('=')
    sols = []
    for digs in itertools.permutations(range(10), len(letters)):
        env = dict(zip(letters, digs))
        if any(env[l] == 0 for l in leads):
            continue
        val = lambda w: int(''.join(str(env[c]) for c in w))
        L = re.sub(r'[A-Z]+', lambda m: str(val(m.group(0))), lhs.replace('×', '*'))
        R = re.sub(r'[A-Z]+', lambda m: str(val(m.group(0))), rhs)
        iz = lambda e: re.sub(r'\d+', lambda m: str(int(m.group())), e)
        if eval(iz(L)) == eval(iz(R)):
            sols.append(env)
    _cache[key] = sols
    return sols


def asked_digit(q, eq, lead_nonzero):
    letter = re.search(r'What digit is ([A-Z])\?', q['prompt']).group(1)
    sols = cryptarithm(eq, lead_nonzero)
    vals = {s[letter] for s in sols}
    return sols, vals


@ref('akcrypt', 'brute force over all assignments of distinct digits to the letters, both with and without the leading-digit-nonzero convention; the asked letter must take one value', 'exhaustive')
def akcrypt(q):
    eq = re.search(r'different digits: (.+?)\. What digit', norm(q['prompt']).replace('−', '-')).group(1)
    eq = eq.replace('−', '-')
    s1, v1 = asked_digit(q, eq, True)
    s0, v0 = asked_digit(q, eq, False)
    if len(v1) != 1:
        return Ambiguous(f'{len(s1)} solutions, values {sorted(v1)}')
    if v0 != v1:
        return Ambiguous(f'unique with leading digits nonzero ({sorted(v1)}) but {sorted(v0)} if a leading 0 is allowed')
    return Expect(str(v1.pop()))


@ref('akcrypt2', 'brute force over all assignments of distinct digits (no leading zero as stated); the asked letter must take one value', 'exhaustive')
def akcrypt2(q):
    eq = re.search(r'starts with 0\. (.+?)\. What digit', q['prompt']).group(1).replace('−', '-')
    s1, v1 = asked_digit(q, eq, True)
    if len(v1) != 1:
        return Ambiguous(f'{len(s1)} solutions, values {sorted(v1)}')
    return Expect(str(v1.pop()))


def kap(n):
    d = sorted(f'{n:04d}')
    return int(''.join(reversed(d))) - int(''.join(d))


@ref('akkap', 'sort the four digits (with leading zeros) ascending / descending and subtract', 'exhaustive')
def akkap(q):
    n = int(re.search(r'four digits of (\d+)', q['prompt']).group(1))
    return Expect(str(kap(n)))


@ref('akdig', 'Kaprekar iteration counted to 6174; repeated digit sum by iteration; reverse-and-add until palindrome (counting additions)', 'exhaustive')
def akdig(q):
    p = q['prompt']
    if p.startswith("Kaprekar's routine"):
        n = int(re.search(r'Start with (\d+)', p).group(1))
        c = 0
        while n != 6174:
            n = kap(n); c += 1
            if c > 50:
                return Unsupported('does not reach 6174')
        return Expect(str(c))
    if p.startswith('Add the digits of'):
        n = int(re.search(r'digits of (\d+)', p).group(1))
        while n > 9:
            n = sum(map(int, str(n)))
        return Expect(str(n))
    n = int(re.search(r'Reverse the digits of (\d+)', p).group(1))
    c = 0
    while str(n) != str(n)[::-1] or c == 0:
        n = n + int(str(n)[::-1]); c += 1
        if c > 200:
            return Unsupported('no palindrome found')
        if str(n) == str(n)[::-1]:
            break
    return Expect(str(c))


@ref('akdirinv', 'direct if y/x constant, inverse if x*y constant (exact fractions), else neither', 'exhaustive')
def akdirinv(q):
    f = q['figure']
    xs = [Fraction(v) for v in f['head'][1:]]; ys = [Fraction(v) for v in f['rows'][0][1:]]
    direct = len({y / x for x, y in zip(xs, ys)}) == 1
    inverse = len({y * x for x, y in zip(xs, ys)}) == 1
    if direct and inverse:
        return Ambiguous('both')
    t = 'Direct proportion' if direct else 'Inverse proportion' if inverse else 'Neither'
    return Expect(pick(q, option_is(t)))


@ref('akdivd', 'try every digit 0-9 in the box and test divisibility of the resulting integer; smallest that works (also computed without allowing a leading 0)', 'exhaustive')
def akdivd(q):
    m = re.search(r'so that (\S+) is divisible by (\d+)', q['prompt'])
    s, d = m.group(1), int(m.group(2))
    ok = [k for k in range(10) if int(s.replace('□', str(k))) % d == 0]
    ok_nz = [k for k in ok if not (s.startswith('□') and k == 0)]
    if not ok or not ok_nz:
        return Ambiguous('no digit works')
    if ok[0] != ok_nz[0]:
        return Ambiguous('box is the leading digit: 0 gives a leading zero')
    return Expect(str(ok[0]))


@ref('akdsort', 'evaluate the stated divisibility condition on the four numbers; exactly one satisfies it and must be keyed (the options are the numbers themselves)', 'exhaustive')
def akdsort(q):
    p = q['prompt']
    m = re.match(r'Which of these numbers is divisible by (\d+)( but not by (\d+))?\?', p)
    a = int(m.group(1)); b = int(m.group(3)) if m.group(3) else None
    ns = [int(x) for x in options(q)]
    assert ns == [int(x) for x in re.findall(r'\d+', p.split('?', 1)[1])]
    hits = [n for n in ns if n % a == 0 and (b is None or n % b != 0)]
    if len(hits) != 1:
        return Ambiguous(f'numbers satisfying the condition: {hits}')
    return Expect(pick(q, lambda o: int(o) == hits[0]))


@ref('akeuclid', 'simulate the replace-larger-by-difference game until both cards are equal', 'exhaustive')
def akeuclid(q):
    a, b = [int(x) for x in re.search(r'Two cards show (\d+) and (\d+)', q['prompt']).groups()]
    if a == b:
        return Expect(str(a))
    while a != b:
        if a > b: a -= b
        else: b -= a
    return Expect(str(a))


def safe_eval(expr, env):
    e = expr.replace('×', '*').replace('÷', '//').replace('−', '-')
    return eval(e, {}, dict(env))


@ref('akflow', 'interpret the flowchart table box by box (input, decision, assignment, output) with exact integers', 'exhaustive')
def akflow(q):
    rows = {r[0]: r for r in q['figure']['rows']}
    x = int(re.search(r'with the input (\d+)', q['prompt']).group(1))
    env = {}
    box = '1'; out = None; steps = 0
    while True:
        steps += 1
        assert steps < 2000
        _, shape, text, nxt = rows[box]
        if shape == 'Oval':
            if text == 'Stop':
                break
            box = nxt; continue
        if shape == 'Parallelogram':
            if text.startswith('Input'):
                var = text.split(' ')[1]
                env[var] = x; box = nxt; continue
            var = text.split(' ')[1]
            out = env[var]; box = nxt; continue
        if shape == 'Diamond':
            cond = re.match(r'Is (.+)\?', text).group(1).replace('≤', '<=').replace('≥', '>=')
            if cond.endswith(' even'):
                v = cond.split(' ')[0]
                res = env[v] % 2 == 0
            else:
                res = bool(safe_eval(cond, env))
            yes, no = re.match(r'Yes: (\d+)\. No: (\d+)', nxt).groups()
            box = yes if res else no; continue
        if shape == 'Rectangle':
            for part in text.split(' and '):
                var, rhs = [t.strip() for t in part.split(' = ')]
                env[var] = safe_eval(rhs, env)
            box = nxt; continue
        raise ValueError(shape)
    return Expect(str(out))


@ref('akloop', 'execute the table steps literally (start values, add K to S, increase K, loop test)', 'exhaustive')
def akloop(q):
    st = [r[1] for r in q['figure']['rows']]
    S, K = [int(v) for v in re.search(r'S = (\d+) and K = (\d+)', st[0]).groups()]
    inc = int(re.search(r'Increase K by (\d+)', st[2]).group(1))
    lim = int(re.search(r'If K is (\d+) or less', st[3]).group(1))
    assert 'Add K to S' in st[1] and 'go back to Step 2' in st[3]
    while True:
        S += K
        K += inc
        if not K <= lim:
            break
    return Expect(str(S))


@ref('akmagic', 'unknown cells ?, □ and the common line sum are solved from all 8 line-sum equalities with SymPy; the solution must be unique', 'exhaustive')
def akmagic(q):
    g = q['figure']['rows']
    a, b, S = sp.symbols('a b S')
    G = [[(a if v == '?' else b if v == '□' else sp.Integer(v)) for v in r] for r in g]
    lines = [G[i] for i in range(3)] + [[G[i][j] for i in range(3)] for j in range(3)] + [[G[i][i] for i in range(3)], [G[i][2 - i] for i in range(3)]]
    sol = sp.solve([sum(l) - S for l in lines], [a, b, S], dict=True)
    if len(sol) != 1 or a not in sol[0]:
        return Ambiguous(f'solutions {sol}')
    return Expect(str(sol[0][a]))


@ref('akodd', 'sum the odd numbers from the first to the last term shown in the statement (direct summation)', 'exhaustive')
def akodd(q):
    s = q['prompt'].split('to find ')[1].rstrip('.')
    ns = [int(x) for x in re.findall(r'\d+', s)]
    a, b = ns[0], ns[-1]
    assert a % 2 == 1 and b % 2 == 1
    return Expect(str(sum(range(a, b + 1, 2))))


@ref('akpar', 'evaluate each calculation in the figure exactly and count the odd results', 'exhaustive')
def akpar(q):
    cnt = 0
    for r in q['figure']['rows']:
        v = eval(r[1].replace('×', '*').replace('−', '-'))
        cnt += (v % 2 == 1)
    return Expect(str(cnt))


@ref('akresize', 'proportional scaling with exact fractions (new = old x ratio of the known measurements)', 'exhaustive')
def akresize(q):
    p = q['prompt']
    m = re.match(r'A photo is (\d+) cm wide and (\d+) cm tall\. \w+ prints a (?:bigger|smaller) copy that is (\d+) cm wide', p)
    if m:
        w, h, w2 = map(int, m.groups())
        return Expect(str(Fraction(h * w2, w)))
    m = re.match(r'A recipe for (\d+) people uses (\d+) cups of rice\. How many cups are needed for (\d+) people', p)
    a, c, b = map(int, m.groups())
    return Expect(str(Fraction(c * b, a)))


@ref('akshift', 'for every letter pair (plain, cipher) compute (cipher - plain) mod 26; all letters must give the same shift', 'exhaustive')
def akshift(q):
    m = re.search(r'In this code, ([A-Z]+) is written as ([A-Z]+)', q['prompt'])
    ks = {(A2Z.index(c) - A2Z.index(p)) % 26 for p, c in zip(m.group(1), m.group(2))}
    if len(ks) != 1:
        return Verdict(False, f'inconsistent shifts {ks}')
    return Expect(str(ks.pop()))


@ref('akthink', 'apply the stated operations to a symbolic x with SymPy; the result must be a constant', 'exhaustive')
def akthink(q):
    x = sp.Symbol('x')
    steps = re.findall(r'(Multiply it by \d+|Add \d+|Divide by \d+|Take away [^.]+)', q['prompt'].split('Think of a number.')[1])
    v = x
    for s in steps:
        if s.startswith('Multiply'): v = v * int(s.split()[-1])
        elif s.startswith('Add'): v = v + int(s.split()[-1])
        elif s.startswith('Divide'): v = v / int(s.split()[-1])
        elif s == 'Take away the number you first thought of': v = v - x
        else:
            m = re.fullmatch(r'Take away (\d+) times the number you first thought of', s)
            if m: v = v - int(m.group(1)) * x
            else: v = v - int(s.split()[-1])
    v = sp.simplify(v)
    if v.has(x):
        return Verdict(False, f'result depends on x: {v}')
    return Expect(str(v))


@ref('angarr', 'enumerate all permutations of the four digits into two two-digit numbers and take the maximum product', 'exhaustive')
def angarr(q):
    ds = [int(x) for x in re.search(r'digits ([\d, and]+) exactly once', q['prompt']).group(1).replace(' and ', ',').replace(' ', '').split(',')]
    best = max((10 * a + b) * (10 * c + d) for a, b, c, d in itertools.permutations(ds))
    return Expect(str(best))


@ref('anpair', 'translate the two statements into a 2x2 linear system and solve exactly (SymPy); substitute back', 'exhaustive')
def anpair(q):
    p = q['prompt']
    eqs = re.findall(r'(\d+) child(?:ren)?\'s tickets? and (\d+) adult tickets? cost ₹(\d+)', p)
    x, y = sp.symbols('x y')
    sol = sp.solve([int(a) * x + int(b) * y - int(c) for a, b, c in eqs], [x, y], dict=True)
    if len(sol) != 1:
        return Ambiguous('no unique solution')
    s = sol[0]
    return Expect(f'({s[x]}, {s[y]})')


@ref('anpow0', 'last digit of a^n for n = 1..40 by integer arithmetic (can it be 0?) and prime factorisation of a with sympy.factorint selects the stated reason', 'exhaustive')
def anpow0(q):
    a = int(re.match(r'Can (\d+)ⁿ', q['prompt']).group(1))
    ends0 = any(pow(a, n) % 10 == 0 for n in range(1, 41))
    fs = sp.factorint(a)
    has2, has5 = 2 in fs, 5 in fs
    assert ends0 == (has2 and has5)
    if ends0:
        return Expect(pick(q, lambda o: o.startswith('Yes')))
    if has2:
        return Expect(pick(q, lambda o: o.startswith('No') and 'prime factor 2 but never the prime factor 5' in o))
    if has5:
        return Expect(pick(q, lambda o: o.startswith('No') and 'prime factor 5 but never the prime factor 2' in o))
    return Expect(pick(q, lambda o: o.startswith('No') and 'neither 2 nor 5' in o))


@ref('anpts', 'squared distances with exact integers; collinearity by the cross product; right angle by Pythagoras on squared sides; isosceles by two equal squared sides; if two listed statements are both true the item is Ambiguous', 'exhaustive')
def anpts(q):
    pts = [tuple(int(v) for v in g.split(',')) for g in re.findall(r'[PQR]\((-?\d+), (-?\d+)\)', norm(q['prompt']).replace(', ', ','))]
    pts = [tuple(int(v) for v in t) for t in re.findall(r'[PQR]\((-?\d+), ?(-?\d+)\)', norm(q['prompt']))]
    (x1, y1), (x2, y2), (x3, y3) = pts
    d = lambda a, b: (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2
    s = sorted([d(pts[0], pts[1]), d(pts[1], pts[2]), d(pts[0], pts[2])])
    cross = (x2 - x1) * (y3 - y1) - (y2 - y1) * (x3 - x1)
    if cross == 0:
        return Expect(pick(q, lambda o: 'one straight line' in o))
    right = s[0] + s[1] == s[2]
    iso = s[0] == s[1] or s[1] == s[2]
    if right and iso:
        return Ambiguous('right-angled and isosceles at once: two listed statements are true')
    if right:
        return Expect(pick(q, lambda o: 'right-angled triangle' in o))
    if iso:
        return Expect(pick(q, lambda o: 'isosceles triangle' in o and 'neither' not in o))
    return Expect(pick(q, lambda o: 'neither' in o))


@ref('anquad', 'solve w(w + d) = A with SymPy, keep the positive root (width), check it is the only positive root', 'exhaustive')
def anquad(q):
    d, A = [int(x) for x in re.search(r'is (\d+) m more than its width, and its area is (\d+) m', q['prompt']).groups()]
    w = sp.Symbol('w')
    roots = sp.solve(w * (w + d) - A, w)
    pos = [r for r in roots if r > 0]
    if len(pos) != 1:
        return Ambiguous(f'positive roots {pos}')
    return Expect(str(pos[0]))


@ref('avrem', 'brute-force enumeration of integers (smallest n > N with the remainder; count in 1..N; representative numbers a + m*i for sum / product remainders, all giving one value)', 'exhaustive')
def avrem(q):
    p = q['prompt']
    m = re.match(r'What is the smallest number greater than (\d+) that leaves remainder (\d+) when divided by (\d+)\?', p)
    if m:
        N, r, d = map(int, m.groups())
        n = N + 1
        while n % d != r: n += 1
        return Expect(str(n))
    m = re.match(r'How many numbers from 1 to (\d+) leave remainder (\d+) when divided by (\d+)\?', p)
    if m:
        N, r, d = map(int, m.groups())
        return Expect(str(sum(1 for n in range(1, N + 1) if n % d == r)))
    m = re.match(r'A number leaves remainder (\d+) when divided by (\d+), and another number leaves remainder (\d+) when divided by \d+\. What remainder does their (sum|product) leave', p)
    a, d, b, op = int(m.group(1)), int(m.group(2)), int(m.group(3)), m.group(4)
    vals = {((x + y) if op == 'sum' else (x * y)) % d for x in range(a, a + 8 * d, d) for y in range(b, b + 8 * d, d)}
    assert len(vals) == 1
    return Expect(str(vals.pop()))
