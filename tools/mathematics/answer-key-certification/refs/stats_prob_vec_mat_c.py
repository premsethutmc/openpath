"""part C: elementary and classical probability, counting. Everything is computed by enumerating the outcomes of the experiment."""
import itertools
import math
import re
from kit import ref, Expect, Verdict, Unsupported, Ambiguous, Fraction, sp  # noqa: F401

COLOURS = ['red', 'blue', 'green', 'yellow', 'white', 'black', 'orange', 'pink', 'purple']


def is_prime(n):
    return n > 1 and all(n % d for d in range(2, int(n ** 0.5) + 1))


def last_q(p):
    return re.findall(r'[^.?]*\?', p)[-1]


def colours_in(s):
    return [c for c in COLOURS if re.search(r'\b' + c + r'\b', s.lower())]


@ref('akchance', 'enumerate the marbles of the bag listed in the table; event = set of colours named')
def akchance(q):
    rows = q['figure']['rows']
    bag = []
    for name, n in rows:
        bag += [name.lower()] * n
    s = last_q(q['prompt']).split('probability that it is')[1].rstrip('? ').split('(')[0]
    # strip the trailing "(A fraction is fine.)" if the split on '?' put it after
    s = re.sub(r'\(.*', '', s)
    neg = s.strip().startswith('not ')
    cols = colours_in(s)
    ev = [m for m in bag if m in cols]
    k = len(ev) if not neg else len(bag) - len(ev)
    return Expect(str(Fraction(k, len(bag))))


def spinner_ranges(p):
    s = p.split('Each gives')[0].split('The first gives')[0]
    if 'two ordinary dice' in s:
        return [6, 6]
    if 'two spinners, each numbered' in s:
        n = int(re.search(r'numbered 1 to (\d+)', s).group(1)); return [n, n]
    if 'and an ordinary die' in s:
        return [int(re.search(r'numbered 1 to (\d+)', s).group(1)), 6]
    ns = re.findall(r'numbered 1 to (\d+)', s)
    return [int(ns[0]), int(ns[1])]


@ref('akdice', 'enumerate all ordered pairs of the two spinners/dice')
def akdice(q):
    p = q['prompt']
    a, b = spinner_ranges(p)
    # the statement of ranges is repeated in "from 1 to a ... from 1 to b"; cross-check
    rr = [int(x) for x in re.findall(r'from 1 to (\d+)', p)]
    if rr and rr != [a, b] and not (len(rr) == 2 and rr == [a, b]):
        return Verdict(False, 'ranges disagree %r vs %r' % (rr, [a, b]))
    pairs = list(itertools.product(range(1, a + 1), range(1, b + 1)))
    s = last_q(p)
    k = int(re.findall(r'\d+', s)[-1]) if re.findall(r'\d+', s) else None
    if 'second number is bigger' in s:
        ev = [t for t in pairs if t[1] > t[0]]
    elif 'or more' in s:
        ev = [t for t in pairs if sum(t) >= k]
    elif 'total of the two numbers is' in s:
        ev = [t for t in pairs if sum(t) == k]
    else:
        raise ValueError(s)
    return Expect(str(Fraction(len(ev), len(pairs))))


@ref('akexp', 'relative frequency from the table in the figure (total checked against the prompt)')
def akexp(q):
    rows = q['figure']['rows']
    n = int(re.search(r'(\d+) times', q['prompt']).group(1))
    if sum(r[1] for r in rows) != n:
        return Verdict(False, 'table total %d != %d' % (sum(r[1] for r in rows), n))
    s = q['prompt'].split('experimental probability of')[1]
    key = None
    for r in rows:
        if re.search(r'\b' + str(r[0]).lower() + r'\b', s.lower()):
            key = r
    if key is None:
        m = re.search(r'rolling a (\d+)', s)
        key = [r for r in rows if str(r[0]) == m.group(1)][0]
    return Expect(str(Fraction(key[1], n)))


@ref('aksarr', 'brute-force over all permutations / digit strings')
def aksarr(q):
    p = q['prompt']
    if p.startswith('In how many'):
        m = re.search(r'can (.*) stand in a row if (.*)\?', p)
        people = re.split(r', | and ', m.group(1)); cond = m.group(2)
        n = len(people)
        cnt = 0
        for perm in itertools.permutations(range(n)):
            if 'at the left end' in cond:
                ok = perm[0] == people.index(cond.split(' must')[0])
            elif 'next to each other' in cond:
                a, b = [people.index(x) for x in cond.split(' must')[0].split(' and ')]
                ok = abs(perm.index(a) - perm.index(b)) == 1
            elif 'either end' in cond:
                a = people.index(cond.split(' must')[0])
                ok = perm[0] != a and perm[-1] != a
            else:
                raise ValueError(cond)
            cnt += ok
        return Expect(str(cnt))
    digs = [int(x) for x in re.search(r'digits (.*?), using', p).group(1).replace(' and ', ', ').split(', ')]
    cnt = 0
    for t in itertools.permutations(digs, 3):
        if t[0] == 0:
            continue
        v = 100 * t[0] + 10 * t[1] + t[2]
        if 'even' in p:
            cnt += v % 2 == 0
        else:
            k = int(re.search(r'greater than (\d+)', p).group(1)); cnt += v > k
    return Expect(str(cnt))


@ref('akss', 'size of the Cartesian product of the stages (enumerated)')
def akss(q):
    p = q['prompt'].split('How many')[0]
    ns = [int(x) for x in re.findall(r'\d+', p)]
    return Expect(str(sum(1 for _ in itertools.product(*[range(n) for n in ns]))))


@ref('anbag', 'enumerate the balls in the bag')
def anbag(q):
    p = q['prompt']
    desc = re.search(r'A bag has (.*?) balls', p).group(1)
    bag = []
    for n, c in re.findall(r'(\d+) (\w+)', desc):
        bag += [c] * int(n)
    c = re.search(r'that it is (\w+)', p).group(1)
    return Expect(str(Fraction(bag.count(c), len(bag))))


@ref('ancardn', 'enumerate the cards 1..N')
def ancardn(q):
    p = q['prompt']
    N = int(re.search(r'numbered 1 to (\d+)', p).group(1))
    s = p.split('number on it is')[1]
    cards = range(1, N + 1)
    if 'not a multiple of' in s:
        k = int(re.search(r'\d+', s).group()); ev = [c for c in cards if c % k]
    elif 'a multiple of' in s:
        k = int(re.search(r'\d+', s).group()); ev = [c for c in cards if c % k == 0]
    elif 'prime' in s:
        ev = [c for c in cards if is_prime(c)]
    elif 'perfect square' in s:
        ev = [c for c in cards if int(c ** .5) ** 2 == c]
    else:
        raise ValueError(s)
    return Expect(str(Fraction(len(ev), N)))


@ref('ancomp', 'complement rule with exact fractions')
def ancomp(q):
    p = q['prompt']
    fs = [Fraction(int(a), int(b)) for a, b in re.findall(r'(\d+)/(\d+)', p)]
    return Expect(str(1 - sum(fs)))


@ref('andice', 'enumerate the 36 outcomes of two dice')
def andice(q):
    s = q['prompt'].split('probability that')[1]
    pairs = list(itertools.product(range(1, 7), repeat=2))
    k = int(re.findall(r'\d+', s)[0]) if re.findall(r'\d+', s) else None
    if 'sum of the two numbers is a multiple of' in s:
        ev = [t for t in pairs if sum(t) % k == 0]
    elif 'sum of the two numbers is greater than' in s:
        ev = [t for t in pairs if sum(t) > k]
    elif 'sum of the two numbers is less than' in s:
        ev = [t for t in pairs if sum(t) < k]
    elif 'sum of the two numbers is' in s:
        ev = [t for t in pairs if sum(t) == k]
    elif 'product of the two numbers is greater than' in s:
        ev = [t for t in pairs if t[0] * t[1] > k]
    elif 'product of the two numbers is' in s:
        ev = [t for t in pairs if t[0] * t[1] == k]
    elif 'same number' in s:
        ev = [t for t in pairs if t[0] == t[1]]
    elif 'differ by' in s:
        ev = [t for t in pairs if abs(t[0] - t[1]) == k]
    elif 'at least one of the dice shows' in s:
        ev = [t for t in pairs if k in t]
    elif 'both dice show a number greater than' in s:
        ev = [t for t in pairs if min(t) > k]
    else:
        raise ValueError(s)
    return Expect(str(Fraction(len(ev), 36)))


@ref('anncr', 'enumerate all equally likely selections with itertools.combinations')
def anncr(q):
    p = q['prompt']
    if p.startswith('A committee'):
        r, b, g = map(int, re.findall(r'\d+', p.split('What')[0])[:3])
        pop = ['b'] * b + ['g'] * g
        tail = p.split('has ')[1]
        sel = list(itertools.combinations(range(len(pop)), r))
        def girls(c): return sum(pop[i] == 'g' for i in c)
        if tail.startswith('no girls'):
            ev = [c for c in sel if girls(c) == 0]
        elif tail.startswith('at least one girl'):
            ev = [c for c in sel if girls(c) >= 1]
        else:
            k = int(re.search(r'exactly (\d+)', tail).group(1)); ev = [c for c in sel if girls(c) == k]
    else:
        good, bad, r = map(int, re.findall(r'\d+', p)[:3])
        k = int(re.search(r'exactly (\d+) of them', p).group(1))
        pop = ['g'] * good + ['f'] * bad
        sel = list(itertools.combinations(range(len(pop)), r))
        ev = [c for c in sel if sum(pop[i] == 'f' for i in c) == k]
    return Expect(str(Fraction(len(ev), len(sel))))


@ref('antree', 'enumerate ordered draws (with / without replacement) of labelled counters')
def antree(q):
    p = q['prompt']
    r, b = map(int, re.findall(r'\d+', p)[:2])
    bag = ['r'] * r + ['b'] * b
    idx = range(len(bag))
    if 'without putting' in p:
        draws = [(bag[i], bag[j]) for i in idx for j in idx if i != j]
    else:
        draws = [(bag[i], bag[j]) for i in idx for j in idx]
    s = p.split('probability that')[1]
    if 'same colour' in s:
        ev = [d for d in draws if d[0] == d[1]]
    elif 'one counter is red and the other is blue' in s:
        ev = [d for d in draws if set(d) == {'r', 'b'}]
    elif 'at least one counter is red' in s:
        ev = [d for d in draws if 'r' in d]
    elif 'both counters are red' in s:
        ev = [d for d in draws if d == ('r', 'r')]
    elif 'both counters are blue' in s:
        ev = [d for d in draws if d == ('b', 'b')]
    else:
        raise ValueError(s)
    return Expect(str(Fraction(len(ev), len(draws))))


@ref('anunion', 'inclusion-exclusion with exact fractions')
def anunion(q):
    a, b, c = [Fraction(int(x), int(y)) for x, y in re.findall(r'(\d+)/(\d+)', q['prompt'])]
    if not (max(a, b) >= c and a + b - c <= 1):
        return Verdict(False, 'inconsistent probabilities')
    return Expect(str(a + b - c))
