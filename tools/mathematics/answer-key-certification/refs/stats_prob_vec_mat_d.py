"""part D: events, Bayes, distributions (discrete and continuous). Probability spaces are rebuilt and enumerated; densities are integrated exactly."""
import itertools
import re
from kit import ref, Expect, Verdict, Unsupported, Ambiguous, Fraction, sp  # noqa: F401

SUP = str.maketrans('²³⁴⁵⁶−', '23456-')


def fr(x):
    return Fraction(str(x).replace('−', '-'))


def fracs(p):
    return [Fraction(int(a), int(b)) for a, b in re.findall(r'(\d+)/(\d+)', p)]


@ref('asadd3', 'rebuild the 7 disjoint Venn regions of three events and add the required ones; regions must be non-negative')
def asadd3(q):
    p = q['prompt']
    m = re.search(r'P\(A\) = (\S+), P\(B\) = (\S+), P\(C\) = (\S+), P\(A ∩ B\) = (\S+), P\(B ∩ C\) = (\S+), P\(A ∩ C\) = (\S+) and P\(A ∩ B ∩ C\) = (\S+?)\.', p)
    A, B, C, AB, BC, AC, ABC = [fr(x.rstrip(',')) for x in m.groups()]
    reg = {
        'abc': ABC, 'ab': AB - ABC, 'bc': BC - ABC, 'ac': AC - ABC,
        'a': A - AB - AC + ABC, 'b': B - AB - BC + ABC, 'c': C - AC - BC + ABC}
    if min(reg.values()) < 0:
        return Verdict(False, 'impossible event system: negative Venn region %r' % reg)
    union = sum(reg.values())
    if union > 1:
        return Verdict(False, 'union exceeds 1')
    s = p.split('Find')[1]
    if 'exactly one' in s:
        return Expect(str(reg['a'] + reg['b'] + reg['c']))
    if 'none of A, B, C' in s:
        return Expect(str(1 - union))
    if 'P(A ∪ B ∪ C)' in s:
        return Expect(str(union))
    raise ValueError(s)


@ref('asaddp', 'rebuild the 4 disjoint Venn regions of two events')
def asaddp(q):
    p = q['prompt']
    m = re.search(r'P\(A\) = (\S+), P\(B\) = (\S+) and P\((A ∩ B|A ∪ B)\) = (\S+?)\. Find (.*?)(,|$)', p)
    A, B = fr(m.group(1).rstrip(',')), fr(m.group(2))
    given = fr(m.group(4))
    both = given if '∩' in m.group(3) else A + B - given
    reg = {'both': both, 'a': A - both, 'b': B - both}
    reg['none'] = 1 - sum(reg.values())
    if min(reg.values()) < 0:
        return Verdict(False, 'impossible event system %r' % reg)
    t = m.group(5).strip()
    if t.startswith('P(A ∪ B)'):
        return Expect(str(reg['both'] + reg['a'] + reg['b']))
    if t.startswith('P(A ∩ B)'):
        return Expect(str(reg['both']))
    if t.startswith('P(A′ ∩ B′)'):
        return Expect(str(reg['none']))
    if t.startswith('P(A ∩ B′)'):
        return Expect(str(reg['a']))
    raise ValueError(t)


@ref('asbayes', 'population of 10000 items split by machine and defect; P = defective-from-machine / all defective')
def asbayes(q):
    p = q['prompt']
    share = {m: int(v) for m, v in re.findall(r"Machine ([A-C]) makes (\d+)%", p)}
    rate = {m: int(v) for v, m in re.findall(r"(\d+)% of ([A-C])'s", p)}
    if sum(share.values()) != 100:
        return Verdict(False, 'shares do not sum to 100')
    who = re.search(r'made by machine ([A-C])', p).group(1)
    pop = 10000
    bad = {m: Fraction(pop * share[m], 100) * Fraction(rate[m], 100) for m in share}
    return Expect(str(bad[who] / sum(bad.values())))


@ref('asbern', 'mean and variance from the definition over the listed (value, probability) pairs')
def asbern(q):
    p = q['prompt'].replace('−', '-')
    if 'Bernoulli' in p:
        pr = fracs(p)[0]; pairs = [(1, pr), (0, 1 - pr)]
    elif 'one-point' in p:
        v = int(re.search(r'takes the value (-?\d+) with', p).group(1)); pairs = [(v, Fraction(1))]
    else:
        pairs = [(int(v), Fraction(int(a), int(b))) for v, a, b in re.findall(r'value (-?\d+) with probability (\d+)/(\d+)', p)]
    if sum(w for _, w in pairs) != 1:
        return Verdict(False, 'probabilities do not sum to 1: %r' % pairs)
    mean = sum(v * w for v, w in pairs)
    var = sum((v - mean) ** 2 * w for v, w in pairs)
    s = p.split('Find')[1]
    if 'mean' in s:
        return Expect(str(mean))
    if 'variance' in s:
        return Expect(str(var))
    raise ValueError(s)


@ref('asbinmv', 'mean/variance of n Bernoulli trials; inverse problem solved by searching all integer n')
def asbinmv(q):
    p = q['prompt']
    if p.startswith('X has'):
        n = int(re.search(r'n = (\d+)', p).group(1)); pr = fracs(p)[0]
        return Expect('(%s, %s)' % (n * pr, n * pr * (1 - pr)))
    s = p.split('mean ')[1].split('. Find')[0]
    mean_s, var_s = s.split(' and variance ')
    mean, var = fr(mean_s), fr(var_s)
    sols = []
    for n in range(1, 2000):
        pr = mean / n
        if 0 < pr < 1 and n * pr * (1 - pr) == var:
            sols.append((n, pr))
    if len(sols) != 1:
        return Ambiguous('solutions %r' % sols)
    return Expect('(%s, %s)' % sols[0])


@ref('asbinom', 'exact distribution of the number of successes by convolving n Bernoulli trials (dynamic programme)')
def asbinom(q):
    p = q['prompt']
    n = int(re.search(r'n = (\d+)', p).group(1)); pr = fracs(p)[0]
    dist = [Fraction(1)]
    for _ in range(n):
        new = [Fraction(0)] * (len(dist) + 1)
        for i, w in enumerate(dist):
            new[i] += w * (1 - pr); new[i + 1] += w * pr
        dist = new
    s = p.split('Find')[1]
    k = int(re.search(r'(\d+)\)', s).group(1))
    if '≥' in s:
        return Expect(str(sum(dist[k:])))
    if '≤' in s:
        return Expect(str(sum(dist[:k + 1])))
    return Expect(str(dist[k] if k < len(dist) else 0))


def sample_space(p):
    m = re.search(r'S = \{1, 2, …, (\d+)\}', p)
    return list(range(1, int(m.group(1)) + 1))


def is_prime(n):
    return n > 1 and all(n % d for d in range(2, n))


def pred(desc):
    d = desc.replace('the number is ', '')
    k = re.findall(r'\d+', d)
    if d == 'even': return lambda x: x % 2 == 0
    if d == 'odd': return lambda x: x % 2 == 1
    if d == 'prime': return is_prime
    if d == 'a perfect square': return lambda x: int(x ** .5) ** 2 == x
    if d.startswith('a multiple of'): return lambda x: x % int(k[0]) == 0
    if d.startswith('greater than'): return lambda x: x > int(k[0])
    if d.startswith('less than'): return lambda x: x < int(k[0])
    raise ValueError(desc)


@ref('asevset', 'set algebra on the explicitly listed sample space')
def asevset(q):
    p = q['prompt']
    S = sample_space(p)
    evs = re.findall(r'the event "([^"]*)"', p)
    A = {x for x in S if pred(evs[0])(x)}
    B = {x for x in S if pred(evs[1])(x)} if len(evs) > 1 else set()
    t = re.search(r'Write the event (.*?) as a set', p).group(1)
    S = set(S)
    if t.startswith('A′ (not A)'): r = S - A
    elif t.startswith('A ∪ B'): r = A | B
    elif t.startswith('A ∩ B′'): r = A - B
    elif t.startswith('A ∩ B'): r = A & B
    elif t.startswith('A′ ∩ B′'): r = S - (A | B)
    else: raise ValueError(t)
    if not r:
        return Ambiguous('empty set; notation for the empty set not stated in the prompt')
    return Expect(','.join(map(str, sorted(r))))


def die_bags(p):
    faces = [int(x) for x in re.search(r'shows (?:a )?([\d, or]+),', p).group(1).replace(' or ', ', ').split(', ')]
    nums = [int(x) for x in re.findall(r'(\d+) (?:red|black)', p)]
    return faces, nums


def bag_joint(p):
    faces, (r1, b1, r2, b2) = die_bags(p)
    joint = []  # (bag, colour, weight)
    for face in range(1, 7):
        bag = 1 if face in faces else 2
        r, b = (r1, b1) if bag == 1 else (r2, b2)
        for ball in range(r + b):
            joint.append((bag, 'r' if ball < r else 'b', Fraction(1, 6) * Fraction(1, r + b)))
    return joint


@ref('astotp', 'enumerate (die face, ball) outcomes with exact weights; P(bag I | red)')
def astotp(q):
    j = bag_joint(q['prompt'])
    red = sum(w for b, c, w in j if c == 'r')
    return Expect(str(sum(w for b, c, w in j if c == 'r' and b == 1) / red))


@ref('attotal', 'enumerate (die face, ball) outcomes with exact weights; P(red)')
def attotal(q):
    j = bag_joint(q['prompt'])
    return Expect(str(sum(w for b, c, w in j if c == 'r')))


# ---------------- continuous
X = sp.Symbol('x')


def parse_poly(text):
    t = text.translate(SUP)
    t = re.sub(r'x(\d)', r'x**\1', t)
    t = re.sub(r'(\d)x', r'\1*x', t)
    return sp.sympify(t, locals={'x': X})


def density(p):
    m = re.search(r'f\(x\) = (.*?) for (\d+) ≤ x ≤ (\d+)', p)
    return parse_poly(m.group(1)), int(m.group(2)), int(m.group(3))


@ref('atcdf', 'integrate the density from the lower limit (F) / differentiate F (f); equivalence by SymPy expansion; support/normalisation checked',
     coverage='exhaustive')
def atcdf(q):
    p = q['prompt']
    if 'Find its density' in p:
        m = re.search(r'F\(x\) = (.*?) for (\d+) ≤ x ≤ (\d+)', p)
        F = parse_poly(m.group(1)); a, b = int(m.group(2)), int(m.group(3))
        if F.subs(X, a) != 0 or F.subs(X, b) != 1:
            return Verdict(False, 'F(a)=%s F(b)=%s' % (F.subs(X, a), F.subs(X, b)))
        return Expect(str(sp.expand(sp.diff(F, X))).replace('**', '^'))
    f, a, b = density(p)
    if sp.integrate(f, (X, a, b)) != 1:
        return Verdict(False, 'density does not integrate to 1')
    t = sp.Symbol('t')
    F = sp.integrate(f.subs(X, t), (t, a, X))
    return Expect(str(sp.expand(F)).replace('**', '^'))


@ref('atcexp', 'exact integration of x f and x^2 f; linearity rules checked on a two-point distribution')
def atcexp(q):
    p = q['prompt']
    if p.startswith('A continuous'):
        f, a, b = density(p)
        if sp.integrate(f, (X, a, b)) != 1:
            return Verdict(False, 'density not normalised')
        mu = sp.integrate(X * f, (X, a, b))
        if 'variance' in p:
            return Expect(str(sp.integrate(X ** 2 * f, (X, a, b)) - mu ** 2))
        return Expect(str(mu))
    m = re.search(r'\(X\) = (-?\d+)\. Find (E|Var)\((.*)\)', p.replace('−', '-'))
    v = int(m.group(1)); kind = m.group(2); ex = m.group(3).replace(' ', '')
    ex = re.sub(r'(\d)X', r'\1*X', ex).replace('-X', '-1*X')
    if ex.startswith('X'):
        ex = '1*' + ex
    coef = sp.sympify(ex, locals={'X': sp.Symbol('X')})
    a = coef.coeff(sp.Symbol('X')); b = coef.subs(sp.Symbol('X'), 0)
    # check linearity on the explicit two-point distribution mean v (e.g. X in {v-1, v+1}) for the mean rule, and variance with sd 1 for the variance rule
    if kind == 'E':
        pts = [(v - 1, Fraction(1, 2)), (v + 1, Fraction(1, 2))]
        got = sum((a * x + b) * w for x, w in pts)
        return Expect(str(got))
    pts = [(-1, Fraction(1, 2)), (1, Fraction(1, 2))]   # variance 1
    got1 = sum((a * x + b) ** 2 * w for x, w in pts) - (sum((a * x + b) * w for x, w in pts)) ** 2
    return Expect(str(got1 * v))


@ref('atindu', 'count cells of a 100 x 100 product space in which A occupies p(A)*100 rows and B p(B)*100 columns')
def atindu(q):
    p = q['prompt']
    a, b = [int(Fraction(x) * 100) for x in re.findall(r'= (0\.\d+)', p)[:2]]
    n = 100
    A = lambda i: i < a
    B = lambda j: j < b
    s = p.split('Find')[1]
    def cnt(f):
        return sum(1 for i in range(n) for j in range(n) if f(i, j))
    if 'P(A ∩ B)' in s: c = cnt(lambda i, j: A(i) and B(j))
    elif 'P(A ∪ B)' in s: c = cnt(lambda i, j: A(i) or B(j))
    elif 'neither' in s: c = cnt(lambda i, j: not A(i) and not B(j))
    elif 'exactly one' in s: c = cnt(lambda i, j: A(i) != B(j))
    else: raise ValueError(s)
    return Expect(str(Fraction(c, n * n)))


@ref('atpdfk', 'normalising constant from integrating x^m exactly over the support')
def atpdfk(q):
    p = q['prompt']
    m = re.search(r'f\(x\) = k(x[²³⁴]?)? for (\d+) ≤ x ≤ (\d+)', p)
    g = parse_poly((m.group(1) or '1'))
    a, b = int(m.group(2)), int(m.group(3))
    return Expect(str(1 / sp.integrate(g, (X, a, b))))


@ref('atpdfp', 'exact integration of the (normalised) density over the requested interval')
def atpdfp(q):
    p = q['prompt']
    f, a, b = density(p)
    if sp.integrate(f, (X, a, b)) != 1:
        return Verdict(False, 'density not normalised')
    s = p.split('Find')[1]
    m = re.search(r'P\((\d+) ≤ X ≤ (\d+)\)', s)
    if m:
        lo, hi = int(m.group(1)), int(m.group(2))
    else:
        lo, hi = a, int(re.search(r'P\(X ≤ (\d+)\)', s).group(1))
    lo, hi = max(lo, a), min(hi, b)
    return Expect(str(sp.integrate(f, (X, lo, hi)) if hi > lo else 0))


@ref('atpmf', 'enumerate the underlying sample space and tabulate the random variable')
def atpmf(q):
    p = q['prompt']
    if 'fair coins' in p:
        n = int(re.match(r'(\d+)', p).group(1))
        vals = [sum(o) for o in itertools.product((0, 1), repeat=n)]
    elif 'dice' in p:
        d = list(itertools.product(range(1, 7), repeat=2))
        if 'the larger' in p: vals = [max(t) for t in d]
        elif 'the smaller' in p: vals = [min(t) for t in d]
        elif 'sum of' in p: vals = [sum(t) for t in d]
        elif 'difference' in p: vals = [abs(t[0] - t[1]) for t in d]
        elif 'number of dice that show an even' in p: vals = [sum(1 for x in t if x % 2 == 0) for t in d]
        else: raise ValueError(p)
    else:
        r, b = map(int, re.findall(r'(\d+) (?:red|blue)', p)[:2])
        balls = ['r'] * r + ['b'] * b
        vals = [sum(1 for i in pair if balls[i] == 'r') for pair in itertools.permutations(range(len(balls)), 2)]
    s = p.split('Find')[1]
    k = int(re.search(r'\((?:X|F\()?\s*[=\(]?\s*(\d+)', s).group(1)) if False else int(re.findall(r'\d+', s)[0])
    if 'F(' in s:
        return Expect(str(Fraction(sum(1 for v in vals if v <= k), len(vals))))
    return Expect(str(Fraction(sum(1 for v in vals if v == k), len(vals))))


def rv_table(q):
    f = q['figure']
    xs = [fr(x) for x in f['head'][1:]]
    ps = [Fraction(x) for x in f['rows'][0][1:]]
    return xs, ps


@ref('atrvmean', 'E(X) = sum x p from the table; probabilities must sum to 1')
def atrvmean(q):
    xs, ps = rv_table(q)
    if sum(ps) != 1:
        return Verdict(False, 'probabilities sum to %s' % sum(ps))
    return Expect(str(sum(x * p for x, p in zip(xs, ps))))


@ref('atrvvar', 'Var(X) = sum p (x - mean)^2')
def atrvvar(q):
    xs, ps = rv_table(q)
    if sum(ps) != 1:
        return Verdict(False, 'probabilities sum to %s' % sum(ps))
    mu = sum(x * p for x, p in zip(xs, ps))
    return Expect(str(sum(p * (x - mu) ** 2 for x, p in zip(xs, ps))))


@ref('avcond', 'counts in a population of 10000 equally likely points')
def avcond(q):
    p = q['prompt']
    if 'P(A | B) = ' in p:
        pb = fr(re.search(r'P\(B\) = (\d+(?:\.\d+)?)', p).group(1)); pa = Fraction(*[int(x) for x in re.search(r'P\(A \| B\) = (\d+)/(\d+)', p).groups()])
        N = 10000
        nb = pb * N
        return Expect(str(nb * pa / N))
    pab = fr(re.search(r'P\(A ∩ B\) = (\d+(?:\.\d+)?)', p).group(1)); pb = fr(re.search(r'P\(B\) = (\d+(?:\.\d+)?)', p).group(1))
    N = 10000
    nab, nb = pab * N, pb * N
    if nab > nb:
        return Verdict(False, 'P(A and B) > P(B)')
    if 'P(A′ | B)' in p:
        return Expect(str((nb - nab) / nb))
    return Expect(str(nab / nb))


@ref('avdraw', 'enumerate ordered draws of labelled balls')
def avdraw(q):
    p = q['prompt']
    r, b = map(int, re.findall(r'(\d+) (?:red|blue)', p)[:2])
    bag = ['r'] * r + ['b'] * b
    idx = range(len(bag))
    if 'without replacement' in p:
        draws = [(bag[i], bag[j]) for i in idx for j in idx if i != j]
    else:
        draws = [(bag[i], bag[j]) for i in idx for j in idx]
    s = p.split('What is the probability that')[1]
    if 'both are red' in s: ev = [d for d in draws if d == ('r', 'r')]
    elif 'first is red and the second is blue' in s: ev = [d for d in draws if d == ('r', 'b')]
    elif 'same colour' in s: ev = [d for d in draws if d[0] == d[1]]
    elif 'both are blue' in s: ev = [d for d in draws if d == ('b', 'b')]
    else: raise ValueError(s)
    return Expect(str(Fraction(len(ev), len(draws))))


@ref('condp', 'conditional probability within the chosen subgroup (girls): girls in club / all girls')
def condp(q):
    p = q['prompt']
    gi, bi, go, bo = map(int, re.findall(r'\d+', p)[:4])
    pop = ['gi'] * gi + ['bi'] * bi + ['go'] * go + ['bo'] * bo
    girls = [x for x in pop if x[0] == 'g']
    if 'A girl is chosen' not in p or 'she is in the chess club' not in p:
        raise ValueError(p)
    return Expect(str(Fraction(sum(1 for x in girls if x == 'gi'), len(girls))))
