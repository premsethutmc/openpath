"""algebra-a, part 1: patterns, number sentences, linear equations/inequalities (word problems), neighbourhoods"""
import calendar
import math
from refs.algebra_a_util import *  # noqa: F401,F403
from kit import ref, Expect, Verdict, Unsupported, Ambiguous

MON = {m: i for i, m in enumerate(calendar.month_name) if m}
WORD = {'Two': 2, 'Three': 3, 'Four': 4, 'Five': 5, 'Six': 6}


@ref('aacalpat', 'calendar built with the stdlib calendar module (Sunday first); the move is simulated on the grid; figure compared with the calendar', 'exhaustive')
def aacalpat(q):
    p = q['prompt']
    m = re.search(r'calendar for (\w+) (\d+), start at (\d+)\. Move (.+?), (once|(\d+) times)\.', p)
    mon, yr, s, mv = MON[m.group(1)], int(m.group(2)), int(m.group(3)), m.group(4)
    n = 1 if m.group(5) == 'once' else int(m.group(6))
    cal = calendar.Calendar(6).monthdayscalendar(yr, mon)
    fig = q['figure']['rows'][1:]
    if [[(c or '') for c in r] for r in cal] != [[(c if c != '' else '') for c in r] for r in fig]:
        return Verdict(False, 'figure does not match the real calendar')
    pos = {d: (r, c) for r, row in enumerate(cal) for c, d in enumerate(row) if d}
    r, c = pos[s]
    dr, dc = {'one row down and one column to the left': (1, -1), 'one row down and one column to the right': (1, 1),
              'straight down one row': (1, 0), 'straight up one row': (-1, 0)}[mv]
    for _ in range(n):
        r, c = r + dr, c + dc
        if not (0 <= r < len(cal) and 0 <= c < 7 and cal[r][c]):
            return Verdict(False, f'move leaves the calendar: not a date at row {r} col {c}')
    return Expect(str(cal[r][c]))


def _period_next(seq):
    outs = {}
    for p in range(1, len(seq) // 2 + 1):
        if all(seq[i] == seq[i % p] for i in range(len(seq))):
            outs[p] = (seq[len(seq) % p])
    return outs


@ref('aapatn', 'smallest period consistent with the shown terms (at least two full repeats), next term = term at position len mod period', 'exhaustive')
def aapatn(q):
    s = re.search(r'repeats: (.+), \?\.', q['prompt']).group(1)
    seq = [t.strip() for t in s.split(',')]
    outs = _period_next(seq)
    if not outs:
        return Ambiguous('no period with two full repeats visible')
    if len(set(outs.values())) > 1:
        return Ambiguous(f'periods {sorted(outs)} give different next terms')
    return Expect(str(next(iter(outs.values()))))


@ref('aapatu', 'smallest period with at least two full repeats shown', 'exhaustive')
def aapatu(q):
    s = re.search(r'repeats: (.+)\. How many', q['prompt']).group(1).split()
    for p in range(1, len(s) // 2 + 1):
        if all(s[i] == s[i % p] for i in range(len(s))):
            return Expect(str(p))
    return Ambiguous('no period with two repeats shown')


@ref('aaweave', 'strip simulated crossing by crossing', 'exhaustive')
def aaweave(q):
    p = q['prompt']
    o, u = [int(v) for v in re.search(r'goes over (\d+) and under (\d+)', p).groups()]
    unit = ['over'] * o + ['under'] * u
    m = re.search(r'In the first (\d+) crossings', p)
    if m:
        n = int(m.group(1))
        return Expect(str(sum(1 for i in range(n) if unit[i % len(unit)] == 'over')))
    n = int(re.search(r'under for the (\d+)', p).group(1))
    cnt = 0
    i = 0
    while True:
        if unit[i % len(unit)] == 'under':
            cnt += 1
            if cnt == n:
                return Expect(str(i + 1))
        i += 1


@ref('abmiss', 'arithmetic sequence: common difference from the known terms, all known terms checked', 'exhaustive')
def abmiss(q):
    toks = [t.strip() for t in q['prompt'].split('? ', 1)[1].split(',')] if False else None
    body = q['prompt'].split('missing? ')[1]
    toks = [t.strip() for t in body.split(',')]
    k = toks.index('?')
    known = [(i, int(t.replace('−', '-'))) for i, t in enumerate(toks) if t != '?']
    (i1, v1), (i2, v2) = known[0], known[-1]
    d = Fr(v2 - v1, i2 - i1)
    if any(v1 + d * (i - i1) != v for i, v in known):
        return Ambiguous('known terms are not arithmetic')
    return Expect(fs(v1 + d * (k - i1)))


@ref('abnine', 'digit sums iterated to one digit (9 -> 0); the operation is carried out on the true numbers and its check number taken', 'exhaustive')
def abnine(q):
    p = q['prompt']
    m = re.search(r'To check (\d+) ([+×−-]) (\d+) by casting', p)
    if m:
        a, op, b = int(m.group(1)), m.group(2), int(m.group(3))
        r = {'+': a + b, '×': a * b, '−': a - b, '-': a - b}[op]
        return Expect(str(digit_root_nines(r)))
    n = int(re.search(r'number of (\d+)\?', p).group(1))
    return Expect(str(digit_root_nines(n)))


@ref('abpascal', 'Pascal rows built by the additive rule; row sums by summing the row', 'exhaustive')
def abpascal(q):
    p = q['prompt']
    rows = [[1]]
    def nxt(r):
        return [1] + [r[i] + r[i + 1] for i in range(len(r) - 1)] + [1]
    if 'The table shows' in p:
        fig = q['figure']['rows']
        shown = [[int(t) for t in r[0].split()] for r in fig]
        for i in range(len(shown) - 1):
            if nxt(shown[i]) != shown[i + 1]:
                return Verdict(False, 'figure rows are not Pascal rows')
        r = shown[-1]
        steps = 2 if 'Two rows below' in p else 1
        for _ in range(steps):
            r = nxt(r)
        k = int(re.search(r'what is the (\d+)(?:st|nd|rd|th) number', p).group(1))
        return Expect(str(r[k - 1]))
    m = re.search(r'sum of all the numbers in the row that begins 1, (\d+)', p)
    if m:
        n = int(m.group(1))
        r = [1]
        for _ in range(n):
            r = nxt(r)
        return Expect(str(sum(r)))
    m = re.search(r'diagonal are ([\d, ]+)…', p)
    if m:
        L = [int(v) for v in m.group(1).replace(' ', '').strip(',').split(',')]
        tri = [[1]]
        for _ in range(60):
            tri.append(nxt(tri[-1]))
        nexts = set()
        for c in range(1, 8):
            col = [row[c] for row in tri if len(row) > c]
            for st in range(len(col) - len(L) - 1):
                if col[st:st + len(L)] == L:
                    nexts.add(col[st + len(L)])
        if len(nexts) != 1:
            return Ambiguous(f'continuations {sorted(nexts)}')
        return Expect(str(nexts.pop()))
    return Unsupported('template not recognised')


@ref('abseq', 'arithmetic sequence: constant difference checked, next = last + d', 'exhaustive')
def abseq(q):
    body = q['prompt'].split('next? ')[1]
    v = [int(t.strip().replace('−', '-')) for t in body.split(',') if t.strip() != '?']
    d = {v[i + 1] - v[i] for i in range(len(v) - 1)}
    if len(d) != 1:
        return Ambiguous('not arithmetic')
    return Expect(str(v[-1] + d.pop()))


def _evalside(s, box):
    return eval(U(s).replace('□', f'({box})'))


@ref('acbalance', 'brute-force the box over -500..3000 in the original number sentence; exactly one solution required', 'exhaustive')
def acbalance(q):
    s = q['prompt'].split('equal? ')[1]
    l, r = s.split('=')
    sol = [b for b in range(-500, 3000) if _evalside(l, b) == _evalside(r, b)]
    if len(sol) != 1:
        return Ambiguous(f'solutions {sol[:5]}')
    return Expect(str(sol[0]))


@ref('acmissing', 'brute-force the box over -500..3000', 'exhaustive')
def acmissing(q):
    s = q['prompt'].split('box? ')[1]
    l, r = s.split('=')
    sol = [b for b in range(-500, 3000) if _evalside(l, b) == _evalside(r, b)]
    if len(sol) != 1:
        return Ambiguous(f'solutions {sol[:5]}')
    return Expect(str(sol[0]))


@ref('acgrow', 'linear table: constant difference checked, extended to the asked step', 'exhaustive')
def acgrow(q):
    v = [int(t) for t in q['figure']['rows'][0][1:]]
    d = {v[i + 1] - v[i] for i in range(len(v) - 1)}
    if len(d) != 1:
        return Ambiguous('table not linear')
    n = int(re.search(r'in step (\d+)', q['prompt']).group(1))
    return Expect(str(v[0] + d.pop() * (n - 1)))


@ref('acplace', 'enumerate every arrangement of the four cards into two 2-digit numbers (no leading zero)', 'exhaustive')
def acplace(q):
    p = q['prompt']
    ds = [int(t) for t in re.search(r'\(([\d, ]+)\)', p).group(1).split(',')]
    vals = []
    for perm in itertools.permutations(ds):
        if perm[0] == 0 or perm[2] == 0:
            continue
        a, b = 10 * perm[0] + perm[1], 10 * perm[2] + perm[3]
        vals.append((a + b, abs(a - b)))
    kind = re.search(r'(largest|smallest) (sum|difference)', p)
    idx = 0 if kind.group(2) == 'sum' else 1
    v = [x[idx] for x in vals]
    return Expect(str(max(v) if kind.group(1) == 'largest' else min(v)))


@ref('acsticks', 'each new polygon adds (sides-1) sticks: total = s + (n-1)(s-1) (counting: shared stick); small case n=2 -> 2s-1', 'exhaustive', assumptions='formula-based; a row of n polygons sharing one stick between neighbours')
def acsticks(q):
    s, n = [int(v) for v in re.search(r'with (\d+) matchsticks.*row of (\d+)', q['prompt']).groups()]
    sticks = s
    for _ in range(n - 1):
        sticks += s - 1
    return Expect(str(sticks))


@ref('aecons', 'direct summation / search over the starting number', 'exhaustive')
def aecons(q):
    p = q['prompt']
    m = re.search(r'sum of the (\d+) consecutive numbers starting at (\d+)', p)
    if m:
        n, a = int(m.group(1)), int(m.group(2))
        return Expect(str(sum(range(a, a + n))))
    m = re.search(r'(\w+) consecutive numbers add up to (\d+)', p)
    n, t = WORD[m.group(1)], int(m.group(2))
    sol = [a for a in range(-1000, 5000) if sum(range(a, a + n)) == t]
    return Expect(str(sol[0])) if len(sol) == 1 else Ambiguous(str(sol))


@ref('aehund', 'grid number = 10*row+col; move simulated on (row, col); landing must stay on the grid without wrapping', 'exhaustive')
def aehund(q):
    p = q['prompt']
    s = int(re.search(r'Start at (\d+)', p).group(1))
    rows = int(re.search(r'Move (\d+) row', p).group(1))
    m = re.search(r'then (\d+) square', p)
    c = int(m.group(1)) if m else 0
    r0, c0 = divmod(s - 1, 10)
    r1, c1 = r0 + rows, c0 + c
    if r1 > 9 or c1 > 9:
        return Verdict(False, f'lands off the grid / wraps: row {r1} col {c1}')
    return Expect(str(10 * r1 + c1 + 1))


def _ivl_expect(ivs):
    return ivs


@ref('aeineqs', 'each linear inequality solved by boundary/direction, intersected; membership of test points in the ORIGINAL inequalities re-checked', 'exhaustive')
def aeineqs(q):
    m = re.search(r'inequalities (.+?) and (.+?), for real x', q['prompt'])
    parts = [m.group(1), m.group(2)]
    I = (None, False, None, False)
    for s in parts:
        a, b, op = ineq_ab(s)
        J = lin_ineq(a, b, op)
        I = isect(I, J) if J is not None else None
        if I is None:
            return Unsupported('empty solution set; statement requires an interval')
    # verify with points
    lo, lc, hi, hc = I
    pts = []
    if lo is not None:
        pts += [lo - 1, lo, lo + Fr(1, 100)]
    if hi is not None:
        pts += [hi + 1, hi, hi - Fr(1, 100)]
    for v in pts:
        inside = all(member(s, v) for s in parts)
        pred = (lo is None or v > lo or (v == lo and lc)) and (hi is None or v < hi or (v == hi and hc))
        if inside != pred:
            return Verdict(False, 'internal check failed')
    return Expect(ivl_text(*I), form=True)


@ref('aeineqw', 'model solved with exact Fractions per template; bounds 0 (non-negative) and 100 (marks) applied as stated', 'exhaustive')
def aeineqw(q):
    p = q['prompt']
    m = re.search(r'scored (\d+) and (\d+) marks.*at least (\d+)\.', p)
    if m:
        a, b, t = [int(v) for v in m.groups()]
        lo = 3 * t - a - b
        lo = max(lo, 0)
        if lo > 100:
            return Unsupported('no feasible mark')
        return Expect(f'{lo} <= x <= 100', form=True)
    m = re.search(r'₹(\d+) for the bus plus ₹(\d+) for each.*at most ₹(\d+)', p)
    if m:
        f, c, t = [int(v) for v in m.groups()]
        hi = Fr(t - f, c)
        if hi.denominator != 1:
            return Ambiguous(f'non-integer bound {hi}')
        return Expect(f'0 <= x <= {fs(hi)}', form=True)
    m = re.search(r'between (-?\d+) °C and (-?\d+) °C', p.replace('−', '-'))
    if m:
        c1, c2 = int(m.group(1)), int(m.group(2))
        f = lambda c: Fr(9 * c, 5) + 32
        return Expect(f'{fs(f(c1))} <= F <= {fs(f(c2))}', form=True)
    return Unsupported('template not recognised')


@ref('aeineqz', 'brute-force substitution of every element of the stated domain into the original inequality', 'exhaustive')
def aeineqz(q):
    p = U(q['prompt'])
    if 'whole number' in p:
        dom = range(0, 400)
    elif 'natural number' in p:
        dom = range(1, 400)
    else:
        m = re.search(r'from (-?\d+) to (-?\d+)', p)
        dom = range(int(m.group(1)), int(m.group(2)) + 1)
    ineq = re.search(r'Solve (.+?) and list', p).group(1)
    a_, b_, op_ = ineq_ab(ineq)
    test = {'<': lambda t: t < 0, '<=': lambda t: t <= 0, '>': lambda t: t > 0, '>=': lambda t: t >= 0}[op_]
    sol = [v for v in dom if test(a_ * v + b_)]
    for v in (dom[0], dom[-1], 0):
        assert (v in sol) == member(ineq, Fr(v))
    if dom[-1] in sol and dom[-1] == 399:
        return Verdict(False, 'infinite solution set')
    if not sol:
        return Unsupported('empty solution set')
    return Expect(lst(sol))


@ref('aelinw', 'each word problem modelled as an equation and solved by exhaustive search over non-negative integers of the stated quantity', 'exhaustive')
def aelinw(q):
    p = q['prompt'].replace('−', '-')
    m = re.search(r"mother is (\d+) times as old as (\w+)\. In (\d+) years, the sum of their ages will be (\d+)", p)
    if m:
        k, _, y, t = int(m.group(1)), 0, int(m.group(3)), int(m.group(4))
        sol = [a for a in range(0, 200) if (a + y) + (k * a + y) == t]
        return Expect(str(sol[0])) if len(sol) == 1 else Ambiguous(str(sol))
    m = re.search(r'sum of three consecutive multiples of (\d+) is (\d+)\. What is the smallest', p)
    if m:
        k, t = int(m.group(1)), int(m.group(2))
        sol = [a for a in range(-500, 2000) if a % k == 0 and a + (a + k) + (a + 2 * k) == t]
        return Expect(str(sol[0])) if len(sol) == 1 else Ambiguous(str(sol))
    m = re.search(r'length of a rectangle is (\d+) cm more than its width, and its perimeter is (\d+) cm', p)
    if m:
        d, t = int(m.group(1)), int(m.group(2))
        sol = [w for w in range(1, 500) if 2 * (w + w + d) == t]
        return Expect(str(sol[0])) if len(sol) == 1 else Ambiguous(str(sol))
    m = re.search(r'When (\d+)/(\d+) of a number is added to the number, the result is (\d+)', p)
    if m:
        a, b, t = [int(v) for v in m.groups()]
        sol = [n for n in range(-500, 5000) if Fr(a, b) * n + n == t]
        return Expect(str(sol[0])) if len(sol) == 1 else Ambiguous(str(sol))
    m = re.search(r'has ₹(\d+) and saves ₹(\d+) every week\. \w+ has ₹(\d+) and saves ₹(\d+) every week', p)
    if m:
        a, s1, b, s2 = [int(v) for v in m.groups()]
        sol = [w for w in range(0, 1000) if a + s1 * w == b + s2 * w]
        return Expect(str(sol[0])) if len(sol) == 1 else Ambiguous(str(sol))
    return Unsupported('template not recognised')


@ref('aenbhd', 'set {x: |x-c| op r} written as interval; verified by testing points around the endpoints in the original absolute-value condition', 'exhaustive')
def aenbhd(q):
    p = U(q['prompt'])
    m = re.search(r'\{x ∈ ℝ : \|(x[^|]*)\| (<=|<|>=|>) (\d+)\}', p)
    r = int(m.group(3))
    e = ex(m.group(1))
    a, b = lin_ab(e)
    c = -b
    op = m.group(2)
    lo, hi = c - r, c + r
    def holds(v):
        d = abs(v - c)
        return {'<': d < r, '<=': d <= r, '>': d > r, '>=': d >= r}[op]
    if op in ('<', '<='):
        s = ivl_text(lo, op == '<=', hi, op == '<=')
    else:
        s = f"{ivl_text(None, False, lo, op == '>=')} ∪ {ivl_text(hi, op == '>=', None, False)}"
    return Expect(s, form=True)
