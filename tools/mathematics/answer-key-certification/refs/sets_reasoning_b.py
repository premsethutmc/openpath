"""sets-reasoning slice, part B: arithmetic stories, estimation, counting / puzzle strategy, tables.
Independent of production code; every answer is derived from the statement (and the figure) by enumeration, BFS or exact arithmetic."""
import itertools
import json
import os
import re
from collections import deque
from fractions import Fraction
from kit import ref, Expect, Verdict, Unsupported, Ambiguous, sp
from refs.sets_reasoning_a import options, pick, norm, option_is, comm_assoc_text  # noqa: F401  (helpers only)


def nums(s):
    return [int(t.replace(',', '')) for t in re.findall(r'\d[\d,]*', s)]


def indian(n):
    return int(n.replace(',', ''))


# ---------------------------------------------------------------- one-step stories
def story_op(p):
    """operation of a one-step story, decided from the wording"""
    if 'equally' in p or 'shared' in p:
        return 'div'
    if re.search(r'\b(in each|on each|with \d+ [a-z]+ on each|with \d+ [a-z]+ in each)\b', p) or re.search(r'\d+ (plates|boxes|bunches) with', p):
        return 'mul'
    if re.search(r'\bmore\b', p) or re.search(r'\bin all\b|\baltogether\b', p) or ' and ' in p.split('.')[0] and re.search(r'(morning and|evening)', p):
        return 'add'
    if re.search(r'fly away|left|eat|gives|burst|swim away|swims away|go home|goes home|cut off|moved away|the rest|still to be|still on|are still|does he have now|have now', p):
        return 'sub'
    return 'add'


@ref('acstory', 'operation chosen from the story wording (share/equally -> divide, "each" groups -> multiply, away/left -> subtract, else add) then exact integer arithmetic', 'exhaustive')
def acstory(q):
    p = q['prompt']
    a, b = nums(p)[:2]
    op = story_op(p)
    return Expect(str({'add': a + b, 'sub': a - b, 'mul': a * b, 'div': a // b if a % b == 0 else None}[op]))


def figure_digits_ok(q, a, b):
    f = q.get('figure')
    if not f:
        return True
    rows = f['rows']
    return int(''.join(rows[0])) == a and int(''.join(rows[1])) == b


@ref('acstory4', 'operation from the wording (together / more -> add, away / left / rest / still to -> subtract), exact arithmetic; the place-value table in the figure is checked to show the same two numbers', 'exhaustive')
def acstory4(q):
    p = q['prompt']
    a, b = nums(p)[:2]
    if not figure_digits_ok(q, a, b):
        return Verdict(False, 'figure shows different numbers than the statement')
    sub = re.search(r'moved away|are English|cut off|tarred|left in the town|still to be|are left', p) is not None
    return Expect(str(a - b if sub else a + b))


@ref('acstory9', 'operation from the wording (more / in all -> add, away / burst / goes home / gives to -> subtract), exact arithmetic; the dots figure is checked against the first number', 'exhaustive')
def acstory9(q):
    p = q['prompt']
    a, b = nums(p)[:2]
    f = q.get('figure')
    if f and f.get('type') == 'dots' and f['count'] != a:
        # dots show the first collection; allow total for addition stories
        if f['count'] not in (a, a + b):
            return Verdict(False, f'dots figure shows {f["count"]}, statement starts with {a}')
    add = re.search(r'\bmore\b|in all', p) is not None
    return Expect(str(a + b if add else a - b))


# ---------------------------------------------------------------- estimation
def r10(n):
    return (n + 5) // 10 * 10


@ref('adest', 'round each number half-up to the nearest ten, then add / subtract (exact integers)', 'exhaustive')
def adest(q):
    m = re.match(r'Estimate (\d+) ([+−-]) (\d+):', norm(q['prompt']).replace('-', '-'))
    m = re.match(r'Estimate (\d+) ([+\-]) (\d+):', norm(q['prompt']))
    a, op, b = int(m.group(1)), m.group(2), int(m.group(3))
    fig = q.get('figure')
    if fig and fig.get('marks') != [a, b]:
        return Verdict(False, 'number line marks differ from the statement')
    return Expect(str(r10(a) + r10(b) if op == '+' else r10(a) - r10(b)))


@ref('adestchk', 'estimate by rounding both numbers half-up to tens; the given answer is sensible when within 10 of the estimate (the largest possible rounding error of a sum/difference), clearly too big/small when 30 or more away, otherwise the question is Ambiguous', 'exhaustive',
     assumptions='"sensible" is not defined in the statement; thresholds 10 / 30 are mine; the data has no case in between')
def adestchk(q):
    m = re.search(r'worked out (\d+) ([+\-−]) (\d+) and got (\d+)', norm(q['prompt']))
    a, op, b, g = int(m.group(1)), m.group(2), int(m.group(3)), int(m.group(4))
    est = r10(a) + r10(b) if op == '+' else r10(a) - r10(b)
    d = g - est
    if abs(d) <= 10:
        t = 'The answer is sensible'
    elif d >= 30:
        t = 'The answer is too big to be right'
    elif d <= -30:
        t = 'The answer is too small to be right'
    else:
        return Ambiguous(f'got-estimate = {d}')
    return Expect(pick(q, option_is(t)))


@ref('adestcost', 'round each price in the figure table half-up to tens and add; the statement prices are checked against the table', 'exhaustive')
def adestcost(q):
    prices = [r[1] for r in q['figure']['rows']]
    if [int(x) for x in re.findall(r'₹(\d+)', q['prompt'])] != prices:
        return Verdict(False, 'figure prices differ from statement')
    return Expect(str(sum(r10(x) for x in prices)))


@ref('adwtcap', 'unit conversion with exact integers: kg+g to g; capacities in mL; difference between estimate and reading', 'exhaustive')
def adwtcap(q):
    p = q['prompt']
    m = re.search(r'estimated that .* weighs about (\d+) kg\. On the weighing scale it showed (\d+) kg', p)
    if m:
        return Expect(str(abs(int(m.group(1)) - int(m.group(2)))))
    m = re.search(r'has (\d+) kg of .* and (\d+) g of', p)
    if m:
        return Expect(str(int(m.group(1)) * 1000 + int(m.group(2))))
    m = re.search(r'A bucket holds (\d+) L of water\. A mug holds (\d+) mL', p)
    if m:
        t = Fraction(int(m.group(1)) * 1000, int(m.group(2)))
        assert t.denominator == 1
        return Expect(str(t))
    m = re.search(r'A jug holds (\d+) mL\. .* glass(?:es)? of (\d+) mL', p)
    if m:
        t = Fraction(int(m.group(1)), int(m.group(2)))
        assert t.denominator == 1
        return Expect(str(t))
    raise ValueError(p)


@ref('aebig', 'exact integer arithmetic on the numbers read from the statement (Indian digit grouping removed)', 'exhaustive')
def aebig(q):
    p = q['prompt']
    n = nums(p)
    if 'babies were born' in p:
        return Expect(str(n[0] + n[1] - n[2]))
    if 'computers' in p or 'to spend' in p:
        return Expect(str(n[0] - n[1] * n[2]))
    m = re.search(r'A truck makes (\d+) trips? a week between two cities that are (\d+) km apart \(each trip one way\)\. How many kilometres does it travel in (\d+) weeks', p)
    if m:
        return Expect(str(int(m.group(1)) * int(m.group(2)) * int(m.group(3))))
    raise ValueError(p)


@ref('aedrip', 'rate x minutes by exact integers', 'exhaustive')
def aedrip(q):
    m = re.search(r'drips (\d+) mL of water every minute\. How many millilitres of water drip out in (\d+) hours?', q['prompt'])
    return Expect(str(int(m.group(1)) * int(m.group(2)) * 60))


@ref('aeshop', 'change = note - (n1*p1 + n2*p2); prices cross-checked against the figure table', 'exhaustive')
def aeshop(q):
    p = q['prompt']
    m = re.search(r'cost ₹(\d+) each and .* cost ₹(\d+) each\. \w+ buys (\d+) .* and (\d+) .*, and pays with a ₹(\d+) note', p)
    p1, p2, n1, n2, note = map(int, m.groups())
    fig = q['figure']['rows']
    if [int(str(r[1]).replace('₹', '')) for r in fig] != [p1, p2]:
        return Verdict(False, 'figure prices differ')
    return Expect(str(note - n1 * p1 - n2 * p2))


@ref('aetrip', 'distance = speed x time then cost, or boat hire = hours x rate with hours = (2 x distance) / speed; exact', 'exhaustive')
def aetrip(q):
    p = q['prompt']
    m = re.search(r'A taxi travels at (\d+) km per hour for (\d+) hours?\. The fare is ₹(\d+) for every kilometre', p)
    if m:
        return Expect(str(int(m.group(1)) * int(m.group(2)) * int(m.group(3))))
    m = re.search(r'hired for ₹(\d+) an hour\. \w+ rows at (\d+) km per hour to an island (\d+) km away and back again', p)
    if m:
        rate, sp_, d = map(int, m.groups())
        h = Fraction(2 * d, sp_)
        assert h.denominator == 1
        return Expect(str(rate * h))
    raise ValueError(p)


def sing(w):
    return w[:-2] if w.endswith('xes') else (w[:-1] if w.endswith('s') else w)


@ref('aetab', 'each row obeys count x price = cost; solve the single "?" in every row (division must be exact); answer the asked quantity from the solved table', 'exhaustive')
def aetab(q):
    rows = []
    for r in q['figure']['rows']:
        name, cnt, price, cost = r
        unk = [x for x in (cnt, price, cost) if x == '?']
        if len(unk) != 1:
            return Ambiguous('row without exactly one unknown')
        if cnt == '?':
            cnt = Fraction(cost, price)
        elif price == '?':
            price = Fraction(cost, cnt)
        else:
            cost = cnt * price
        if Fraction(cnt).denominator != 1 or Fraction(price).denominator != 1:
            return Verdict(False, 'non-integer table entry')
        rows.append((name, int(cnt), int(price), int(cost)))
    p = q['prompt']
    if 'total cost of the whole order' in p:
        return Expect(str(sum(r[3] for r in rows)))
    m = re.search(r'price of one (.+?), in rupees', p)
    if m:
        want = m.group(1)
        def variants(nm):
            ws = nm.split(' ')
            return {' '.join(ws[:i] + [sing(ws[i])] + ws[i + 1:]) for i in range(len(ws))}
        hit = [r for r in rows if want in variants(r[0])]
        assert len(hit) == 1, (want, rows)
        return Expect(str(hit[0][2]))
    m = re.search(r'How many (.+?) were ordered', p)
    hit = [r for r in rows if r[0] == m.group(1)]
    assert len(hit) == 1
    return Expect(str(hit[0][1]))


# ---------------------------------------------------------------- counting
@ref('afcount', 'multiplication principle with the group sizes taken from the figure table (non-empty cells per column), cross-checked by itertools.product enumeration and against the statement', 'exhaustive')
def afcount(q):
    f = q['figure']
    cols = [[r[j] for r in f['rows'] if r[j] != ''] for j in range(len(f['head']))]
    stated = [int(x) for x in re.findall(r'(\d+) (?:main dishes|side dishes|sweets|shirts|pairs of shorts)', q['prompt'])]
    if stated != [len(c) for c in cols]:
        return Verdict(False, f'statement counts {stated} differ from the table {[len(c) for c in cols]}')
    return Expect(str(sum(1 for _ in itertools.product(*cols))))


@ref('afdigits', 'enumerate all ordered selections (permutations or product) from the digit list, discard numbers starting with 0, count distinct values', 'exhaustive')
def afdigits(q):
    p = q['prompt']
    k = int(re.search(r'different (\d)-digit', p).group(1))
    ds = [int(x) for x in re.search(r'digits ([\d, ]+?)(?:,? using| if)', p).group(1).replace(' ', '').split(',') if x]
    it = itertools.product(ds, repeat=k) if 'more than once' in p else itertools.permutations(ds, k)
    return Expect(str(len({int(''.join(map(str, t))) for t in it if t[0] != 0})))


def segments_triangle_count(k, m):
    """brute-force count of triangles in: apex (0,2), base from (-2,0)...(2,0) wait use exact coordinates; k inner rays to the base, m cross lines"""
    apex = (Fraction(0), Fraction(1))
    L, R = (Fraction(-1), Fraction(0)), (Fraction(1), Fraction(0))
    base_pts = [L] + [(Fraction(-1) + Fraction(2 * (i + 1), k + 1), Fraction(0)) for i in range(k)] + [R]
    segs = [(apex, b) for b in base_pts] + [(L, R)]
    for j in range(m):
        y = Fraction(j + 1, m + 1)
        # cross line from left side to right side at height 1-y... side at height h has x = +-(1-h)... apex at height 1
        h = y
        segs.append(((-(1 - h), h), ((1 - h), h)))
    def inter(s, t):
        (x1, y1), (x2, y2) = s; (x3, y3), (x4, y4) = t
        den = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4)
        if den == 0:
            return None
        px = ((x1 * y2 - y1 * x2) * (x3 - x4) - (x1 - x2) * (x3 * y4 - y3 * x4)) / den
        py = ((x1 * y2 - y1 * x2) * (y3 - y4) - (y1 - y2) * (x3 * y4 - y3 * x4)) / den
        def on(sg, x, y):
            (a, b), (c, d) = sg
            return min(a, c) <= x <= max(a, c) and min(b, d) <= y <= max(b, d)
        return (px, py) if on(s, px, py) and on(t, px, py) else None
    cnt = 0
    for a, b, c in itertools.combinations(range(len(segs)), 3):
        p1, p2, p3 = inter(segs[a], segs[b]), inter(segs[b], segs[c]), inter(segs[a], segs[c])
        if p1 and p2 and p3 and len({p1, p2, p3}) == 3:
            cnt += 1
    return cnt


@ref('afhidden', 'grid: enumerate all axis-aligned rectangles / squares by corner coordinates; triangles: exact-coordinate enumeration of line triples whose pairwise intersections lie on the drawn segments', 'exhaustive')
def afhidden(q):
    p = q['prompt']
    m = re.search(r'(\d+) rows? and (\d+) columns?', p)
    if m:
        r, c = int(m.group(1)), int(m.group(2))
        if q.get('figure') and (q['figure']['rows'], q['figure']['cols']) != (r, c):
            return Verdict(False, 'figure grid differs from statement')
        cnt = 0
        for x1, x2 in itertools.combinations(range(c + 1), 2):
            for y1, y2 in itertools.combinations(range(r + 1), 2):
                if 'squares of any size' in p:
                    cnt += (x2 - x1 == y2 - y1)
                else:
                    cnt += 1
        return Expect(str(cnt))
    ks = re.search(r'has (\d+) straight lines? drawn from its top corner', p)
    k = int(ks.group(1))
    mm = re.search(r'and (\d+) straight lines? drawn across', p)
    cross = int(mm.group(1)) if mm else 0
    return Expect(str(segments_triangle_count(k, cross)))


@ref('afmissd', 'try every digit 0-9 in the box and check the written equation by integer arithmetic; exactly one digit must work', 'exhaustive')
def afmissd(q):
    s = norm(re.search(r'digit: (.+?)\. Which', q['prompt']).group(1)).replace('−', '-')
    sols = []
    for d in range(10):
        t = s.replace('□', str(d))
        lhs, rhs = t.split('=')
        iz = lambda e: re.sub(r'\d+', lambda m: str(int(m.group())), e)
        if eval(iz(lhs)) == int(rhs.strip()):
            sols.append(d)
    if s.lstrip('+-( ').startswith('□') or '= □' in s:
        sols = [d for d in sols if d != 0] if len(sols) > 1 else sols
    if len(sols) != 1:
        return Ambiguous(f'digits {sols} satisfy {s}')
    fig = q['figure']['rows']
    if len(''.join(fig[0][1:]) + ''.join(fig[2][1:])) and ''.join(str(x) for r in fig for x in r[1:]).count('□') != 1:
        return Verdict(False, 'figure box count')
    return Expect(str(sols[0]))


def nim_good_moves(n, maxm, misere):
    moves = range(1, maxm + 1)
    memo = {}
    def mover_wins(k):
        # k counters, mover to move, k >= 1
        if k in memo:
            return memo[k]
        res = False
        for m in moves:
            if m > k:
                continue
            rest = k - m
            if rest == 0:
                if not misere:
                    res = True  # took the last counter and wins
                # misere: took the last counter and loses
            elif not mover_wins(rest):
                res = True
        memo[k] = res
        return res
    good = []
    for m in moves:
        if m > n:
            continue
        rest = n - m
        if rest == 0:
            ok = not misere
        else:
            ok = not mover_wins(rest)
        if ok:
            good.append(m)
    return good


@ref('afnim', 'game-tree search (memoised minimax) over the counters for normal and misere play; the set of winning first moves must be a single move', 'exhaustive')
def afnim(q):
    p = q['prompt']
    n = int(re.search(r'There are (\d+) counters', p).group(1))
    mx = int(re.search(r'removes ([\d, or]+) counters', p).group(1).replace(' or ', ',').replace(' ', '').split(',')[-1])
    mis = 'has to take the last counter loses' in p
    g = nim_good_moves(n, mx, mis)
    if len(g) != 1:
        return Ambiguous(f'winning first moves {g}' if g else 'no winning move exists')
    return Expect(str(g[0]))


@ref('afriver', 'breadth-first search over the exact state space (people on each bank, boat side) for the fewest crossings', 'exhaustive')
def afriver(q):
    p = q['prompt']
    m = re.match(r'(\d+) scouts must cross.*holds at most (\d+) people', p)
    if m:
        n, cap = int(m.group(1)), int(m.group(2))
        start, goal = (n, 0), (0, 1)  # (people on start bank, boat side 0=start)
        seen = {start: 0}; dq = deque([start])
        while dq:
            s = dq.popleft()
            L, side = s
            R = n - L
            for k in range(1, cap + 1):
                if side == 0 and k <= L:
                    t = (L - k, 1)
                elif side == 1 and k <= R:
                    t = (L + k, 0)
                else:
                    continue
                if t not in seen:
                    seen[t] = seen[s] + 1; dq.append(t)
        return Expect(str(seen[(0, 1)]))
    m = re.match(r'(\d+) soldiers? must cross a river\. The only boat belongs to two children', p)
    n = int(m.group(1))
    # state: soldiers on start bank, children on start bank, boat side (0 start); loads: 1 soldier, 1 child, 2 children
    start = (n, 2, 0)
    seen = {start: 0}; dq = deque([start])
    while dq:
        s = dq.popleft()
        S, C, side = s
        for ds, dc in ((1, 0), (0, 1), (0, 2)):
            if side == 0 and S >= ds and C >= dc:
                t = (S - ds, C - dc, 1)
            elif side == 1 and (n - S) >= ds and (2 - C) >= dc:
                t = (S + ds, C + dc, 0)
            else:
                continue
            if t not in seen:
                seen[t] = seen[s] + 1; dq.append(t)
    return Expect(str(seen[(0, 2, 0)]))


# ---------------------------------------------------------------- claims
def claim_pred(c):
    c = c.strip()
    table = [
        (r'Every multiple of (\d+) is also a multiple of (\d+)', lambda a, b: (lambda n: n % int(a) == 0, lambda n: n % int(b) == 0)),
        (r'Every odd number bigger than 1 is a prime number', lambda: (lambda n: n % 2 == 1 and n > 1, lambda n: sp.isprime(n))),
        (r'Every number that ends in (\d) is a multiple of (\d+)', lambda d, b: (lambda n: n % 10 == int(d), lambda n: n % int(b) == 0)),
        (r'Every multiple of (\d+) is an odd number', lambda a: (lambda n: n % int(a) == 0, lambda n: n % 2 == 1)),
        (r'Every multiple of (\d+) is an even number', lambda a: (lambda n: n % int(a) == 0, lambda n: n % 2 == 0)),
        (r'Every even number is a multiple of (\d+)', lambda a: (lambda n: n % 2 == 0, lambda n: n % int(a) == 0)),
        (r'Every odd number is a prime number', lambda: (lambda n: n % 2 == 1, lambda n: sp.isprime(n))),
        (r'Every number that ends in (\d) is a prime number', lambda d: (lambda n: n % 10 == int(d), lambda n: sp.isprime(n))),
        (r'Every prime number is odd', lambda: (lambda n: sp.isprime(n), lambda n: n % 2 == 1)),
    ]
    for pat, mk in table:
        m = re.fullmatch(pat, c)
        if m:
            return mk(*m.groups())
    raise ValueError(c)


@ref('agcex', 'the claim "every P is Q" is refuted exactly by a tested number with P true and Q false; test every number in the figure table and require exactly one such number', 'exhaustive')
def agcex(q):
    c = re.search(r'says: "(.+?)\."', q['prompt']).group(1)
    P, Q = claim_pred(c)
    tested = [int(r[0]) for r in q['figure']['rows']]
    hits = [n for n in tested if P(n) and not Q(n)]
    if len(hits) != 1:
        return Ambiguous(f'counterexamples in the table: {hits}')
    return Expect(str(hits[0]))


@ref('aapass', 'simulate the stated pass (compare neighbours left to right, swap when the first is bigger) the stated number of times', 'exhaustive')
def aapass(q):
    p = q['prompt']
    lst = [int(x) for x in re.search(r'Start with ([\d, ]+)\.', p).group(1).replace(' ', '').split(',')]
    assert lst == q['figure']['rows'][0]
    word = re.search(r'after\s+(one|two|three|four|five)\s+pass(?:es)?', p).group(1)
    n = {'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5}[word]
    for _ in range(n):
        for i in range(len(lst) - 1):
            if lst[i] > lst[i + 1]:
                lst[i], lst[i + 1] = lst[i + 1], lst[i]
    return Expect(', '.join(map(str, lst)))


@ref('absort', 'count the rows of the figure table that satisfy the colour / size condition', 'exhaustive')
def absort(q):
    p = q['prompt']
    rows = q['figure']['rows']
    m = re.search(r'all the (blue|red|big|small)(?: AND (blue|red|big|small))? buttons', p)
    conds = [c for c in m.groups() if c]
    cnt = sum(all(c in (r[1], r[2]) for c in conds) for r in rows)
    return Expect(str(cnt))


@ref('aematch', 'enumerate all 4! assignments of items to people and keep those satisfying every clue; the asked item must have a single holder across the surviving assignments (unique solution)', 'exhaustive')
def aematch(q):
    p = q['prompt']
    head, rest = p.split('Clues: ')
    names = re.match(r'(.+?) each', head).group(1)
    names = [n.strip() for n in re.split(r',| and ', names) if n.strip()]
    items = [t.strip() for t in re.search(r': (.+)\.?$', head.strip()).group(1).rstrip('.').replace(' and ', ', ').split(',')]
    clues, question = rest.rsplit('. Who ', 1)
    clues = [c.strip() for c in clues.split('.') if c.strip()]
    asked = re.match(r'(?:plays|likes|has|lives in|drinks|eats|owns|wears|sits in) (.+)\?', question)
    asked_item = next(it for it in items if it in question)
    sols = []
    for perm in itertools.permutations(items):
        a = dict(zip(names, perm))
        ok = True
        for c in clues:
            nm = c.split(' ')[0]
            it = next(i for i in items if c.endswith(i))
            neg = ' not ' in c
            if (a[nm] == it) == neg:
                ok = False; break
        if ok:
            sols.append(a)
    holders = {next(n for n, v in s.items() if v == asked_item) for s in sols}
    if len(sols) != 1:
        if len(holders) == 1:
            holder = holders.pop()
        else:
            return Ambiguous(f'{len(sols)} assignments satisfy the clues; holders {holders}')
    else:
        holder = next(n for n, v in sols[0].items() if v == asked_item)
    return Expect(pick(q, lambda o: o == holder))
