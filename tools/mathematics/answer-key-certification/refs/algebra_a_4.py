"""algebra-a, part 4: absolute value, counting, binomial theorem, logarithms, relations"""
import math
from refs.algebra_a_util import *  # noqa: F401,F403
from kit import ref, Expect, Verdict, Unsupported, Ambiguous

x = sp.Symbol('x')
SUP = str.maketrans('⁰¹²³⁴⁵⁶⁷⁸⁹', '0123456789')
SUB = str.maketrans('₀₁₂₃₄₅₆₇₈₉', '0123456789')


def sup(s):
    return int(s.translate(SUP))


@ref('aoabseq', 'both branches ax+b = ±c solved with Fractions, solutions substituted into |ax+b| = c, distinct values listed', 'exhaustive')
def aoabseq(q):
    m = re.search(r'Solve \|(.+?)\| = (-?\d+)\.', U(q['prompt']))
    a, b = lin_ab(ex(m.group(1)))
    c = int(m.group(2))
    cand = set()
    for rhs in (c, -c):
        cand.add((rhs - b) / a)
    sol = sorted(v for v in cand if abs(a * v + b) == c)
    if not sol:
        return Unsupported('empty solution set')
    return Expect(lst(sol))


@ref('aoabsin', 'interval from -c < ax+b < c (or its complement); endpoints tested in the original |ax+b| condition', 'exhaustive')
def aoabsin(q):
    m = re.search(r'Solve \|(.+?)\| (<=|<|>=|>) (-?\d+)\.', U(q['prompt']))
    a, b = lin_ab(ex(m.group(1)))
    op, c = m.group(2), int(m.group(3))
    if c <= 0:
        return Unsupported(f'degenerate c={c}')
    lo, hi = sorted([(-c - b) / a, (c - b) / a])
    chk = lambda v: {'<': abs(a * v + b) < c, '<=': abs(a * v + b) <= c, '>': abs(a * v + b) > c, '>=': abs(a * v + b) >= c}[op]
    closed = op in ('<=', '>=')
    assert chk(lo) == closed and chk(hi) == closed
    if op in ('<', '<='):
        return Expect(ivl_text(lo, closed, hi, closed), form=True)
    return Expect(f"{ivl_text(None, False, lo, closed)} ∪ {ivl_text(hi, closed, None, False)}", form=True)


@ref('aoarr', 'enumeration of all arrangements (permutations, products, rotation/reflection classes, sorted permutations for the rank)', 'exhaustive')
def aoarr(q):
    p = q['prompt']
    m = re.search(r'How many (\d+)-letter codes can be made from (\d+) different letters', p)
    if m:
        k_, n_ = int(m.group(1)), int(m.group(2))
        return Expect(str(sum(1 for _ in itertools.product(range(n_), repeat=k_))))
    m = re.search(r'In how many ways can (\d+) people stand in a row if (two|three) particular people must (not )?(.+)\?', p)
    if m:
        n_, g, neg = int(m.group(1)), (2 if m.group(2) == 'two' else 3), bool(m.group(3))
        cnt = 0
        for perm in itertools.permutations(range(n_)):
            pos = sorted(perm.index(i) for i in range(g))
            together = pos[-1] - pos[0] == g - 1
            if together != neg:
                cnt += 1
        return Expect(str(cnt))
    m = re.search(r'In how many ways can (\d+) people be seated around a round table', p)
    if m:
        n_ = int(m.group(1))
        seen = set()
        for perm in itertools.permutations(range(n_)):
            i = perm.index(0)
            seen.add(perm[i:] + perm[:i])
        return Expect(str(len(seen)))
    m = re.search(r'In how many ways can (\d+) different beads be arranged to form a necklace', p)
    if m:
        n_ = int(m.group(1))
        seen = set()
        for perm in itertools.permutations(range(n_)):
            i = perm.index(0)
            a = perm[i:] + perm[:i]
            b = tuple(reversed(a))
            j = b.index(0)
            b = b[j:] + b[:j]
            seen.add(min(a, b))
        return Expect(str(len(seen)))
    m = re.search(r'letters of the word (\w+) are arranged.*rank of the word', p)
    if m:
        w = m.group(1)
        allp = sorted(set(itertools.permutations(w)))
        return Expect(str(allp.index(tuple(w)) + 1))
    return Unsupported('template')


@ref('aobinapp', 'exact power by repeated multiplication (mode 0); first three terms 1 + n*d + C(n,2)*d^2 as exact Fractions (mode 1)', 'exhaustive')
def aobinapp(q):
    p = q['prompt']
    m = re.search(r'evaluate (\d+)([⁰¹²³⁴⁵⁶⁷⁸⁹]+) exactly', p)
    if m:
        v = 1
        for _ in range(sup(m.group(2))):
            v *= int(m.group(1))
        return Expect(str(v))
    m = re.search(r'binomial expansion of \(1 ([+−-]) ([\d.]+)\)([⁰¹²³⁴⁵⁶⁷⁸⁹]+)', p)
    if m:
        d = Fr(m.group(2))
        d = d if m.group(1) == '+' else -d
        n_ = sup(m.group(3))
        v = 1 + n_ * d + Fr(n_ * (n_ - 1), 2) * d * d
        return Expect(fs(v))
    return Unsupported('template')


@ref('aobinco', 'coefficient read from the SymPy expansion of (ax+b)^n', 'exhaustive')
def aobinco(q):
    m = re.search(r'coefficient of (x[²³⁴⁵⁶⁷⁸⁹]?) in the expansion of \((.+?)\)([⁰¹²³⁴⁵⁶⁷⁸⁹]+)', U(q['prompt']))
    e = sp.expand(ex(m.group(2)) ** sup(m.group(3)))
    return Expect(fs(Q(sp.Poly(e, x).coeff_monomial(ex(m.group(1))))))


@ref('aobinexp', 'power expanded with SymPy', 'exhaustive')
def aobinexp(q):
    m = re.search(r'Expand \((.+?)\)([⁰¹²³⁴⁵⁶⁷⁸⁹]+) using', U(q['prompt']))
    return Expect(canon(ex(m.group(1)) ** sup(m.group(2)), [x]), form=True)


@ref('aobinind', 'constant term (x^0) of the SymPy expansion of the power', 'exhaustive')
def aobinind(q):
    m = re.search(r'expansion of \((.+?)\)([⁰¹²³⁴⁵⁶⁷⁸⁹]+)\.', U(q['prompt']))
    e = sp.expand(ex(m.group(1)) ** sup(m.group(2)))
    return Expect(fs(Q(e.coeff(x, 0))))


@ref('aobinmid', 'terms of the SymPy expansion listed in descending powers; middle one (n even) or the stated one of the two middle terms (n odd)', 'exhaustive')
def aobinmid(q):
    p = U(q['prompt'])
    m = re.search(r'\((.+?)\)([⁰¹²³⁴⁵⁶⁷⁸⁹]+)', p)
    n_ = sup(m.group(2))
    e = sp.expand(ex(m.group(1)) ** n_)
    pp = sp.Poly(e, x)
    terms = [pp.coeff_monomial(x ** d) * x ** d for d in range(n_, -1, -1)]
    if 'two middle terms' in p:
        idx = (n_ - 1) // 2 + (0 if 'first of them' in p else 1)
    else:
        if n_ % 2:
            return Unsupported('odd n with single middle term')
        idx = n_ // 2
    return Expect(canon(terms[idx], [x]), form=True)


@ref('aocart', 'sizes of the sets read from the braces; |AxB| = |A||B|, relations = subsets of AxB (2^|AxB|)', 'exhaustive')
def aocart(q):
    p = q['prompt']
    A = re.search(r'A = \{([^}]*)\}', p).group(1).split(',')
    a = len(A)
    m = re.search(r'B = \{([^}]*)\}', p)
    if m:
        b = len(m.group(1).split(','))
        if 'ordered pairs' in p:
            pairs = list(itertools.product(A, m.group(1).split(',')))
            return Expect(str(len(pairs)))
        if 'relations' in p:
            return Expect(str(2 ** (a * b)))
    m = re.search(r'n\(A × B\) = (\d+)\. How many elements does B have', p)
    if m:
        n_ = int(m.group(1))
        if n_ % a:
            return Verdict(False, 'n(AxB) not divisible by |A|')
        return Expect(str(n_ // a))
    return Unsupported('template')


@ref('aochb', 'logarithms evaluated numerically to 50 digits (mpmath) and recognised as a rational; change-of-base identity not used', 'exhaustive')
def aochb(q):
    import mpmath
    mpmath.mp.dps = 50
    p = q['prompt']
    L = lambda b_, a_: mpmath.log(a_) / mpmath.log(b_)
    m = re.search(r'evaluate log([₀-₉]+) (\d+) × log([₀-₉]+) (\d+)', p)
    if m:
        v = L(int(m.group(1).translate(SUB)), int(m.group(2))) * L(int(m.group(3).translate(SUB)), int(m.group(4)))
    else:
        m = re.search(r'Evaluate 1/log([₀-₉]+) (\d+) \+ 1/log([₀-₉]+) (\d+)', p)
        if not m:
            return Unsupported('template')
        v = 1 / L(int(m.group(1).translate(SUB)), int(m.group(2))) + 1 / L(int(m.group(3).translate(SUB)), int(m.group(4)))
    fr = Fr(str(sp.nsimplify(sp.Float(str(v), 40), rational=True, tolerance=1e-30)))
    if abs(mpmath.mpf(fr.numerator) / fr.denominator - v) > mpmath.mpf(10) ** -40:
        return Unsupported('value not recognised as rational')
    return Expect(fs(fr))


@ref('aocomm', 'enumeration of all committees (combinations) with the stated condition', 'exhaustive')
def aocomm(q):
    m = re.search(r'committee of (\d+) is to be chosen from (\d+) men and (\d+) women.*exactly (\d+) (women|woman|men|man)', q['prompt'])
    k_, nm, nw, e, who = int(m.group(1)), int(m.group(2)), int(m.group(3)), int(m.group(4)), m.group(5)
    people = [('m', i) for i in range(nm)] + [('w', i) for i in range(nw)]
    cnt = sum(1 for c in itertools.combinations(people, k_) if sum(1 for g, _ in c if g == ('w' if who.startswith('wom') else 'm')) == e)
    return Expect(str(cnt))
