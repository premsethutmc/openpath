"""algebra-b module 1: counting, sets, factorials (brute-force / enumeration references)"""
import itertools
import math
import re
from functools import lru_cache
from kit import ref, Expect, Verdict, Unsupported, Ambiguous, Fraction, sp
from refs.algebra_b_common import *


@ref('aofund', 'enumeration of the outcomes (itertools.product / permutations / explicit route lists)', 'exhaustive')
def aofund(q):
    p = q['prompt']
    if 'outfits' in p:
        a, b, c = ints(p)[:3]
        return Expect(str(sum(1 for _ in itertools.product(range(a), range(b), range(c)))))
    if 'codes' in p:
        k, n = ints(p)[0], ints(p)[2]
        rep = 'may be repeated' in p
        assert rep or 'no digit may be repeated' in p
        gen = itertools.product(range(n), repeat=k) if rep else itertools.permutations(range(n), k)
        return Expect(str(sum(1 for _ in gen)))
    if 'roads' in p or 'road' in p:
        a, b, c = ints(p)[0], ints(p)[2], ints(p)[4]  # X->Y, Y->Z, X->Z (skip the town letters: no digits in them)
        a, b, c = [int(x) for x in re.findall(r'(\d+) roads? ', p)]
        routes = [('xy', i, 'yz', j) for i in range(a) for j in range(b)] + [('xz', k) for k in range(c)]
        return Expect(str(len(routes)))
    if 'canteen' in p:
        ds = [int(x) for x in re.findall(r'(\d+) [A-Za-z ]*?dishes', p)]
        return Expect(str(len([(g, i) for g, n in enumerate(ds) for i in range(n)])))
    return Unsupported('unrecognised aofund template')


@ref('aogeoc', 'explicit vertex/point labelling; triangles/lines counted by enumerating point sets', 'exhaustive')
def aogeoc(q):
    p = q['prompt']
    if 'diagonals' in p:
        n = ints(p)[0]
        d = sum(1 for i, j in itertools.combinations(range(n), 2) if (j - i) % n not in (1, n - 1))
        return Expect(str(d))
    if 'vertices of a polygon' in p:
        n = ints(p)[0]
        return Expect(str(sum(1 for _ in itertools.combinations(range(n), 3))))
    n, k = ints(p)[:2]
    line = set(range(k))  # the collinear points; every other triple is non-collinear
    if 'triangles' in p:
        t = sum(1 for tr in itertools.combinations(range(n), 3) if not set(tr) <= line)
        return Expect(str(t))
    if 'straight lines' in p:
        lines = set()
        for a, b in itertools.combinations(range(n), 2):
            lines.add(frozenset(line) if (a in line and b in line) else frozenset((a, b)))
        return Expect(str(len(lines)))
    return Unsupported('unrecognised aogeoc template')


@ref('aomix', 'enumeration of selections and arrangements', 'exhaustive')
def aomix(q):
    p = q['prompt']
    if 'science exhibition' in p:
        r, n = ints(p)[:2]
        return Expect(str(sum(1 for _ in itertools.combinations(range(n), r))))
    if 'elects' in p:
        n = ints(p)[0]
        r = 3 if 'treasurer' in p else 2
        return Expect(str(sum(1 for _ in itertools.permutations(range(n), r))))
    if 'words' in p:
        m = re.search(r'choosing (\d+) vowels? from (\d+) given vowels and (\d+) consonants? from (\d+) given consonants', p)
        v, V, c, C = map(int, m.groups())
        L = int(re.search(r'of (\d+) different letters', p).group(1))
        assert L == v + c
        tot = 0
        for vs in itertools.combinations(range(V), v):
            for cs in itertools.combinations(range(100, 100 + C), c):
                tot += sum(1 for _ in itertools.permutations(vs + cs))
        return Expect(str(tot))
    if 'chairperson' in p:
        r, n = ints(p)[:2]
        return Expect(str(sum(1 for com in itertools.combinations(range(n), r) for _ in com)))
    return Unsupported('unrecognised aomix template')


@ref('aomulti', 'memoised recursion on the multiset (choose the next letter kind), cross-checked by set(permutations) when n<=8', 'exhaustive')
def aomulti(q):
    m = re.search(r'the (\d+) letters ([A-Z, ]+?), where', q['prompt'])
    n = int(m.group(1))
    letters = [x.strip() for x in m.group(2).split(',')]
    assert len(letters) == n
    kinds = sorted(set(letters))
    cnt = tuple(letters.count(k) for k in kinds)

    @lru_cache(None)
    def f(c):
        if sum(c) == 0:
            return 1
        return sum(f(c[:i] + (c[i] - 1,) + c[i + 1:]) for i in range(len(c)) if c[i] > 0)
    val = f(cnt)
    if n <= 8:
        assert val == len(set(itertools.permutations(letters)))
    return Expect(str(val))


def _sc(s):
    return int(s.translate(SUP).translate(SUB))


@lru_cache(None)
def C_(n, r):
    if r < 0 or r > n:
        return 0
    if r == 0 or r == n:
        return 1
    return C_(n - 1, r - 1) + C_(n - 1, r)  # Pascal recursion


def P_(n, r):
    if r > n:
        return 0
    if n <= 9:
        return sum(1 for _ in itertools.permutations(range(n), r))
    return C_(n, r) * math.factorial(r)


@ref('aoncr', 'Pascal recursion (no factorial formula)', 'exhaustive')
def aoncr(q):
    m = re.search(r'Find ([⁰¹²³⁴⁵⁶⁷⁸⁹]+)C([₀₁₂₃₄₅₆₇₈₉]+),', q['prompt'])
    n, r = _sc(m.group(1)), _sc(m.group(2))
    mm = re.search(r'choosing (\d+) of (\d+) distinct', q['prompt'])
    assert (int(mm.group(2)), int(mm.group(1))) == (n, r)
    return Expect(str(C_(n, r)))


@ref('aonpr', 'enumeration of arrangements (n<=9) / C(n,r)*r! with Pascal C otherwise', 'exhaustive')
def aonpr(q):
    m = re.search(r'Find ([⁰¹²³⁴⁵⁶⁷⁸⁹]+)P([₀₁₂₃₄₅₆₇₈₉]+),', q['prompt'])
    n, r = _sc(m.group(1)), _sc(m.group(2))
    mm = re.search(r'arranging (\d+) of (\d+) distinct', q['prompt'])
    assert (int(mm.group(2)), int(mm.group(1))) == (n, r)
    return Expect(str(P_(n, r)))


@ref('aoncrp', 'search over n / r with Pascal-recursion C and enumerated P', 'exhaustive')
def aoncrp(q):
    p = q['prompt']
    S = '⁰¹²³⁴⁵⁶⁷⁸⁹'
    if re.match(r'If ⁿC[₀-₉]+ = ⁿC[₀-₉]+, find n', p):
        a, b = [_sc(x) for x in re.findall(r'ⁿC([₀-₉]+)', p)]
        sol = [n for n in range(max(a, b), 400) if C_(n, a) == C_(n, b)]
        return Expect(', '.join(map(str, sol)))
    m = re.match(r'If ⁿC([₀-₉]+) = (\d+), find n', p)
    if m:
        r, v = _sc(m.group(1)), int(m.group(2))
        sol = [n for n in range(r, 400) if C_(n, r) == v]
        return Expect(', '.join(map(str, sol)))
    m = re.match(r'For some r, ([⁰-⁹]+)Pᵣ = (\d+) and ([⁰-⁹]+)Cᵣ = (\d+)\. Find r', p)
    if m:
        n = _sc(m.group(1))
        pv, cv = int(m.group(2)), int(m.group(4))
        sol = [r for r in range(0, n + 1) if P_(n, r) == pv and C_(n, r) == cv]
        return Expect(', '.join(map(str, sol)))
    m = re.match(r'Find ([⁰-⁹]+)C([₀-₉]+) \+ ([⁰-⁹]+)C([₀-₉]+)', p)
    if m:
        return Expect(str(C_(_sc(m.group(1)), _sc(m.group(2))) + C_(_sc(m.group(3)), _sc(m.group(4)))))
    return Unsupported('unrecognised aoncrp template: ' + p[:60])


def pascal_rows(n):
    rows = [[1]]
    for _ in range(n):
        r = rows[-1]
        rows.append([1] + [r[i] + r[i + 1] for i in range(len(r) - 1)] + [1])
    return rows


@ref('aopas', 'Pascal rows built by neighbour addition; coefficients by polynomial multiplication', 'exhaustive')
def aopas(q):
    p = q['prompt']
    m = re.match(r"Row (\d+) of Pascal's triangle is ([\d, ]+)\. Build the next row, row (\d+), by adding neighbours\. What is its entry in position (\d+)", p)
    if m:
        n = int(m.group(1))
        rows = pascal_rows(n + 1)
        given = [int(x) for x in m.group(2).split(',')]
        if given != rows[n]:
            return Verdict(False, f'row stated in the prompt is wrong: {given} vs {rows[n]}')
        return Expect(str(rows[n + 1][int(m.group(4))]))
    m = re.match(r"Row (\d+) of Pascal's triangle is ([\d, ]+)\. Use it to find the coefficient of (.+?) in the expansion of \(a \+ b\)([⁰-⁹]+)", p)
    if m:
        n = _sc(m.group(4))
        given = [int(x) for x in m.group(2).split(',')]
        if given != pascal_rows(n)[n] or int(m.group(1)) != n:
            return Verdict(False, 'row stated in prompt wrong')
        term = m.group(3)
        ea = re.search(r'a([⁰-⁹]*)', term); eb = re.search(r'b([⁰-⁹]*)', term)
        ia = _sc(ea.group(1)) if ea and ea.group(1) else (1 if ea else 0)
        ib = _sc(eb.group(1)) if eb and eb.group(1) else (1 if eb else 0)
        assert ia + ib == n
        poly = {(0, 0): 1}
        for _ in range(n):
            new = {}
            for (x, y), c in poly.items():
                new[(x + 1, y)] = new.get((x + 1, y), 0) + c
                new[(x, y + 1)] = new.get((x, y + 1), 0) + c
            poly = new
        return Expect(str(poly[(ia, ib)]))
    m = re.match(r"What is the sum of all the entries in row (\d+) of Pascal's triangle", p)
    if m:
        n = int(m.group(1))
        return Expect(str(sum(pascal_rows(n)[n])))
    return Unsupported('aopas template not handled: ' + p[:80])


@ref('aosub', 'enumeration of all subsets as bitmasks', 'exhaustive')
def aosub(q):
    p = q['prompt']
    els = re.match(r'A = \{([a-z, ]+)\}', p).group(1).replace(' ', '').split(',')
    n = len(els)
    subs = [frozenset(e for i, e in enumerate(els) if m >> i & 1) for m in range(1 << n)]
    full = frozenset(els)
    if 'non-empty proper subsets' in p:
        return Expect(str(sum(1 for s in subs if s and s != full)))
    if 'proper subsets' in p:
        return Expect(str(sum(1 for s in subs if s != full)))
    m = re.search(r'exactly (\d+) elements?', p)
    if m:
        return Expect(str(sum(1 for s in subs if len(s) == int(m.group(1)))))
    m = re.search(r'contain the element ([a-z])', p)
    if m:
        return Expect(str(sum(1 for s in subs if m.group(1) in s)))
    if 'How many subsets does A have' in p:
        return Expect(str(len(subs)))
    return Unsupported('aosub template: ' + p[:80])


@ref('aoinex', 'explicit sets with the stated overlap built from integers; union/intersection/difference by set operations', 'exhaustive')
def aoinex(q):
    p = q['prompt']
    nA, nB = [int(x) for x in re.findall(r'n\(([AB])\) = (\d+)', p) and [m[1] for m in re.findall(r'n\(([AB])\) = (\d+)', p)]]
    given = re.search(r'and n\((A ∪ B|A ∩ B)\) = (\d+)\.', p)
    ask = re.search(r'Find n\((.+?)\)\.$', p).group(1)
    found = []
    for i in range(0, min(nA, nB) + 1):
        A = set(range(nA)); B = set(range(nA - i, nA - i + nB))
        val = len(A | B) if given.group(1) == 'A ∪ B' else len(A & B)
        if val == int(given.group(2)):
            found.append((A, B))
    if len(found) != 1:
        return Verdict(False, f'no consistent pair of sets exists for the stated numbers ({len(found)} models)')
    A, B = found[0]
    res = {'A ∩ B': A & B, 'A ∪ B': A | B, 'A − B': A - B, 'B − A': B - A}[ask]
    return Expect(str(len(res)))


@ref('aoven3', 'region decomposition into the 7 Venn regions then an explicit-set construction; formula n(AuBuC) not used', 'exhaustive',
     assumptions='"x play both cricket and football" is read as n(C ∩ F), i.e. including those who play all three (the standard textbook reading)')
def aoven3(q):
    p = q['prompt']
    nums_ = [int(x) for x in re.findall(r'(\d+) (?:plays?|students)', p)]
    total = None
    m = re.search(r'A survey of (\d+) students', p)
    if m:
        total = int(m.group(1))
    c = int(re.search(r'(\d+) play cricket', p).group(1)); f = int(re.search(r'(\d+) play football', p).group(1)); k = int(re.search(r'(\d+) play kabaddi', p).group(1))
    cf = int(re.search(r'(\d+) plays? both cricket and football', p).group(1))
    fk = int(re.search(r'(\d+) plays? both football and kabaddi', p).group(1))
    kc = int(re.search(r'(\d+) plays? both kabaddi and cricket', p).group(1))
    t = int(re.search(r'(\d+) plays? all three', p).group(1))
    reg = {'cf': cf - t, 'fk': fk - t, 'kc': kc - t, 't': t}
    reg['c'] = c - reg['cf'] - reg['kc'] - t
    reg['f'] = f - reg['cf'] - reg['fk'] - t
    reg['k'] = k - reg['fk'] - reg['kc'] - t
    if min(reg.values()) < 0:
        return Verdict(False, f'inconsistent data, negative region {reg}')
    # explicit sets
    nxt = itertools.count()
    mem = {r: [next(nxt) for _ in range(v)] for r, v in reg.items()}
    C = set(mem['c'] + mem['cf'] + mem['kc'] + mem['t']); F = set(mem['f'] + mem['cf'] + mem['fk'] + mem['t']); K = set(mem['k'] + mem['fk'] + mem['kc'] + mem['t'])
    assert len(C) == c and len(F) == f and len(K) == k and len(C & F) == cf and len(F & K) == fk and len(K & C) == kc and len(C & F & K) == t
    U = C | F | K
    if 'none of the three' in p:
        if total is None:
            return Unsupported('no total')
        if total < len(U):
            return Verdict(False, 'total smaller than the union')
        return Expect(str(total - len(U)))
    if 'at least one' in p:
        return Expect(str(len(U)))
    if 'exactly one' in p:
        return Expect(str(sum(1 for x in U if (x in C) + (x in F) + (x in K) == 1)))
    if 'only cricket' in p:
        return Expect(str(len(C - F - K)))
    return Unsupported('aoven3 question: ' + p[-60:])


@ref('aofact', 'direct evaluation by iterated products / search for n / exact Fractions', 'exhaustive')
def aofact(q):
    p = q['prompt']
    fa = lambda n: math.prod(range(1, n + 1))
    m = re.fullmatch(r'Evaluate (\d+)!/(\d+)!\.', p)
    if m:
        return Expect(str(Fraction(fa(int(m.group(1))), fa(int(m.group(2)))))) if False else Expect(str(fa(int(m.group(1))) // fa(int(m.group(2)))))
    m = re.fullmatch(r'Evaluate (\d+)!/\((\d+)! × (\d+)!\)\.', p)
    if m:
        a, b, c = map(int, m.groups())
        return Expect(str(Fraction(fa(a), fa(b) * fa(c))))
    m = re.fullmatch(r'If n!/\(n − (\d+)\)! = (\d+), find the natural number n\.', p)
    if m:
        d, v = int(m.group(1)), int(m.group(2))
        sol = [n for n in range(d, 200) if Fraction(fa(n), fa(n - d)) == v]
        return Expect(', '.join(map(str, sol)))
    m = re.fullmatch(r'If 1/(\d+)! \+ 1/(\d+)! = x/(\d+)!, find x\.', p)
    if m:
        a, b, c = map(int, m.groups())
        return Expect(str((Fraction(1, fa(a)) + Fraction(1, fa(b))) * fa(c)))
    return Unsupported('aofact template: ' + p)


@ref('aosetop', 'explicit set construction by filtering U and Python set operations', 'exhaustive')
def aosetop(q):
    p = q['prompt']
    m = re.match(r'Let U = \{1, 2, 3, …, (\d+)\}, A = \{x ∈ U : x is a multiple of (\d+)\} and B = \{x ∈ U : x is a multiple of (\d+)\}\. List the elements of (.+?), separated', p)
    N, a, b, ex = int(m.group(1)), int(m.group(2)), int(m.group(3)), m.group(4)
    U = set(range(1, N + 1)); A = {x for x in U if x % a == 0}; B = {x for x in U if x % b == 0}
    py = ex.replace('∪', '|').replace('∩', '&').replace('−', '-')
    py = re.sub(r'\((.*?)\)′', r'(U-(\1))', py)
    py = re.sub(r"\b([AB])′", r'(U-\1)', py)
    res = eval(py, {'U': U, 'A': A, 'B': B})
    return Expect(fmt_set(res))


@ref('aosetlaw', 'explicit set evaluation of the bracketed expression', 'exhaustive')
def aosetlaw(q):
    p = q['prompt']
    S = {n: setlit(s) for n, s in re.findall(r'([ABC]) = (\{[\d, −]*\})', p)}
    ex = re.search(r'Find (.+?), working out', p).group(1)
    py = ex.replace('∪', '|').replace('∩', '&')
    res = eval(py, {}, S)
    return Expect(fmt_set(res))


@ref('aostd', 'exact Fractions with math.floor', 'exhaustive')
def aostd(q):
    p = q['prompt']
    m = re.search(r'Find \[(−?[\d.]+)\] ([+−]) \[(−?[\d.]+)\]\.', p)
    a, b = Fraction(m.group(1).replace('−', '-')), Fraction(m.group(3).replace('−', '-'))
    fa, fb = math.floor(a), math.floor(b)
    return Expect(str(fa + fb if m.group(2) == '+' else fa - fb))
