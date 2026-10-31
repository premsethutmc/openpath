"""algebra-b module 2: multiple-choice (typed 'choice') families, derived from the statement and the option texts.
Method for all: evaluate EVERY option as a mathematical statement about the question's object, require exactly one true option,
and report its letter. Option texts come from the statement data (exported separately by the certifier: choice_options.json)."""
import itertools
import math
import re
from kit import ref, Expect, Verdict, Unsupported, Ambiguous, Fraction, sp
from refs.algebra_b_common import *


def pick(q, truth):
    """truth(option_text) -> bool ; returns Expect(letter) if exactly one option is true else Ambiguous/Verdict"""
    opts = options(q)
    hits = [i for i, o in enumerate(opts) if truth(o)]
    if len(hits) == 1:
        return Expect('ABCD'[hits[0]])
    if not hits:
        return Verdict(False, 'no option is true')
    return Ambiguous(f'{len(hits)} options are true: {[opts[i] for i in hits]}')


# ---------------- sets ----------------
def eval_builder(s):
    """'{x : x = 2n, n ∈ ℕ and n ≤ 3}' / '{x : x ∈ ℕ and x is a factor of 12}' -> set of ints (ℕ = {1,2,3,...})"""
    s = s.strip()
    inner = s[1:-1]
    m = re.fullmatch(r'x : x = (.+?), n ∈ ℕ and n (≤|<) (\d+)', inner)
    if m:
        expr, op, k = m.group(1), m.group(2), int(m.group(3))
        ns = [n for n in range(1, 200) if (n <= k if op == '≤' else n < k)]
        f = eval('lambda n: ' + re.sub(r'(?<![\w)*])(\d+)n', r'\1*n', clean(expr).replace('n²', 'n**2')))
        return {f(n) for n in ns}
    m = re.fullmatch(r'x : x ∈ ℕ and x is a factor of (\d+)', inner)
    if m:
        return {d for d in range(1, 500) if int(m.group(1)) % d == 0}
    m = re.fullmatch(r'x : x ∈ ℕ, x is a factor of (\d+) and x ([<>]) (\d+)', inner)
    if m:
        N, op, b = int(m.group(1)), m.group(2), int(m.group(3))
        return {d for d in range(1, 500) if N % d == 0 and (d < b if op == '<' else d > b)}
    m = re.fullmatch(r'x : x is a prime factor of (\d+)', inner)
    if m:
        return {d for d in range(2, 500) if int(m.group(1)) % d == 0 and isprime(d)}
    m = re.fullmatch(r'x : x is an odd number and (\d+) < x < (\d+)', inner)
    if m:
        return {d for d in range(int(m.group(1)) + 1, int(m.group(2))) if d % 2 == 1}
    m = re.fullmatch(r'x : x is an odd prime number and x < (\d+)', inner)
    if m:
        return {d for d in range(2, int(m.group(1))) if isprime(d) and d % 2 == 1}
    m = re.fullmatch(r'x : x is a prime number and x < (\d+)', inner)
    if m:
        return {d for d in range(2, int(m.group(1))) if isprime(d)}
    raise ValueError('builder not understood: ' + s)


def eval_desc(d):
    """'the first 3 positive multiples of 2', 'the squares of the first 3 natural numbers', ... -> set"""
    m = re.fullmatch(r'the first (\d+) positive multiples of (\d+)', d)
    if m:
        return {int(m.group(2)) * i for i in range(1, int(m.group(1)) + 1)}
    m = re.fullmatch(r'the squares of the first (\d+) natural numbers', d)
    if m:
        return {i * i for i in range(1, int(m.group(1)) + 1)}
    m = re.fullmatch(r'natural numbers greater than (\d+) and less than (\d+)', d)
    if m:
        return {i for i in range(1, 500) if int(m.group(1)) < i < int(m.group(2))}
    m = re.fullmatch(r'all the factors of (\d+)', d)
    if m:
        return {i for i in range(1, 500) if int(m.group(1)) % i == 0}
    m = re.fullmatch(r'prime numbers less than (\d+)', d)
    if m:
        return {i for i in range(2, int(m.group(1))) if isprime(i)}
    raise ValueError('description not understood: ' + d)


def any_set(t):
    t = t.strip()
    if re.fullmatch(r'\{[\d, −]*\}', t):
        return setlit(t)
    return eval_builder(t)


@ref('aosetform', 'evaluate every set-builder / roster / description to an explicit set (ℕ={1,2,3,…}); exactly one option equals the target set', 'exhaustive',
     assumptions='ℕ is the positive integers {1,2,3,…} (the option lists only make sense under this reading)')
def aosetform(q):
    p = q['prompt']
    m = re.fullmatch(r'Which set-builder form describes the set (\{[\d, ]*\})\?', p)
    if m:
        T = setlit(m.group(1))
        return pick(q, lambda o: eval_builder(o) == T)
    m = re.fullmatch(r'Write the set (\{.*\}) in roster form\. Which is it\?', p)
    if m:
        T = eval_builder(m.group(1))
        return pick(q, lambda o: setlit(o) == T)
    m = re.fullmatch(r'Which is the set of (.*), written in roster form\?', p)
    if m:
        T = eval_desc(m.group(1))
        return pick(q, lambda o: setlit(o) == T)
    return Unsupported('aosetform prompt: ' + p[:80])


# ---- aosetcl ----
def parse_cond_set(desc):
    """description of one set in aosetcl -> ('fin', frozenset) | ('inf',) ; uses bounded brute force over ℕ/ℤ and sympy over ℝ"""
    m = re.fullmatch(r'\{x ∈ (ℕ|ℤ|ℝ) : (.+)\}', desc)
    if m:
        dom, cond = m.groups()
        if dom == 'ℝ':
            x = sp.Symbol('x', real=True)
            if cond == 'x² + 1 = 0':
                return ('fin', frozenset(sp.solveset(sp.Eq(x ** 2 + 1, 0), x, sp.S.Reals)))
            m3 = re.fullmatch(r'(x²|x\^2) \+ (\d+) = 0', cond)
            if m3:
                return ('fin', frozenset(sp.solveset(sp.Eq(x ** 2 + int(m3.group(2)), 0), x, sp.S.Reals)))
            m2 = re.fullmatch(r'(\d+) < x < (\d+)', cond)
            if m2:
                iv = sp.Interval.open(int(m2.group(1)), int(m2.group(2)))
                return ('inf',) if iv.is_empty is False and not iv.is_FiniteSet else ('fin', frozenset())
            raise ValueError('real set ' + cond)
        pred = builder_to_pred(cond)
        rng = range(1, 600) if dom == 'ℕ' else range(-600, 600)
        a = {v for v in rng if pred(v)}
        b = {v for v in (range(1, 1200) if dom == 'ℕ' else range(-1200, 1200)) if pred(v)}
        return ('fin', frozenset(a)) if a == b else ('inf',)
    m = re.fullmatch(r'\{([\d, ]*)\}', desc)
    if m:
        return ('fin', frozenset(setlit(desc)))
    m = re.fullmatch(r'the set of letters of the word ([A-Z]+)', desc)
    if m:
        return ('fin', frozenset(m.group(1)))
    if desc == 'the set of vowels of the English alphabet':
        return ('fin', frozenset('AEIOU'))
    raise ValueError('set description: ' + desc)


@ref('aosetcl', 'explicit finite sets by brute force over a bounded universe (ℕ,ℤ) / sympy solveset (ℝ); every option statement evaluated', 'exhaustive',
     assumptions='ℕ={1,2,3,…}; "equivalent" = same number of elements; "disjoint" = empty intersection')
def aosetcl(q):
    p = q['prompt']
    m = re.fullmatch(r'Classify the set (.*)\. Which statement is true\?', p)
    if m:
        s = parse_cond_set(m.group(1))
        cls = 'infinite' if s[0] == 'inf' else {0: 'empty', 1: 'singleton'}.get(len(s[1]), 'finite')
        txt = {'empty': 'The set is empty', 'singleton': 'The set is a singleton set', 'finite': 'The set is finite with more than one element', 'infinite': 'The set is infinite'}[cls]
        return pick(q, lambda o: o == txt)
    m = re.fullmatch(r'A is (.*) and B is (.*)\. Which statement is true\?', p)
    if m:
        A, B = parse_cond_set(m.group(1)), parse_cond_set(m.group(2))
        if A[0] == 'inf' or B[0] == 'inf':
            return Unsupported('infinite set in relation question')
        A, B = A[1], B[1]
        eq, equiv, disj = A == B, len(A) == len(B), not (A & B)

        def t(o):
            if o == 'A = B': return eq
            if o == 'A and B are equivalent but not equal, and they are disjoint': return equiv and not eq and disj
            if o == 'A and B are equivalent but not equal, and they are not disjoint': return equiv and not eq and not disj
            if o == 'A and B are not equivalent': return not equiv
            if o == 'A ⊂ B (A is a proper subset of B)': return A < B
            if o == 'B ⊂ A (B is a proper subset of A)': return B < A
            if o == 'Neither set is a subset of the other': return not (A <= B) and not (B <= A)
            raise ValueError(o)
        return pick(q, t)
    m = re.fullmatch(r'A = (\{[\d, ]*\})\. Which of these is the power set P\(A\)\?', p)
    if m:
        A = sorted(setlit(m.group(1)))
        T = {frozenset(c) for r in range(len(A) + 1) for c in itertools.combinations(A, r)}

        def parse_ps(t):
            t = t.replace('∅', 'E')
            toks = re.findall(r'E|\d+|\{|\}|,', t)
            pos = [0]

            def parse():
                tok = toks[pos[0]]
                if tok == '{':
                    pos[0] += 1; items = []
                    while toks[pos[0]] != '}':
                        if toks[pos[0]] == ',':
                            pos[0] += 1; continue
                        items.append(parse())
                    pos[0] += 1
                    return ('S', frozenset(items))
                pos[0] += 1
                return ('E',) if tok == 'E' else ('N', int(tok))
            return parse()

        def t(o):
            r = parse_ps(o)
            def val(x):
                if x[0] == 'E': return frozenset()
                if x[0] == 'N': return x[1]
                return frozenset(val(i) for i in x[1])
            return val(r) == frozenset(T)
        return pick(q, t)
    return Unsupported('aosetcl prompt ' + p[:80])


# ---- aosamp ----
def space(p):
    if p.startswith('Two coins'): return [''.join(t) for t in itertools.product('HT', repeat=2)]
    if p.startswith('Three coins'): return [''.join(t) for t in itertools.product('HT', repeat=3)]
    m = re.match(r'A coin is tossed and then a spinner with (\d+) equal parts numbered 1 to (\d+)', p)
    if m: return [c + str(i) for c in 'HT' for i in range(1, int(m.group(1)) + 1)]
    if p.startswith('A family has two children'): return [''.join(t) for t in itertools.product('BG', repeat=2)]
    if p.startswith('A family has three children'): return [''.join(t) for t in itertools.product('BG', repeat=3)]
    m = re.match(r'A spinner with (\d+) equal parts numbered 1 to (\d+) is spun twice', p)
    if m: return [f'{a}{b}' for a in range(1, int(m.group(1)) + 1) for b in range(1, int(m.group(1)) + 1)]
    m = re.match(r'A bag has (\d+) balls of different colours \(([A-Z, ]+):', p)
    if m:
        cols = [c.strip() for c in m.group(2).split(',')]
        return [a + b for a in cols for b in cols if a != b]
    if p.startswith('Two dice'): return [f'{a}{b}' for a in range(1, 7) for b in range(1, 7)]
    raise ValueError('experiment: ' + p[:60])


def event_pred(ev, p):
    if ev.endswith('head') or 'head' in ev and 'number' not in ev and 'first' not in ev:
        pass
    E = {
        'at least one head': lambda o: o.count('H') >= 1, 'exactly one head': lambda o: o.count('H') == 1,
        'at most one head': lambda o: o.count('H') <= 1, 'no tail': lambda o: o.count('T') == 0,
        'the first coin shows a head': lambda o: o[0] == 'H', 'exactly two heads': lambda o: o.count('H') == 2,
        'all the coins show the same face': lambda o: len(set(o)) == 1,
        'at least one girl': lambda o: 'G' in o, 'all the children are of the same gender': lambda o: len(set(o)) == 1,
        'the eldest child is a boy': lambda o: o[0] == 'B', 'exactly one boy': lambda o: o.count('B') == 1,
        'both spins give the same number': lambda o: o[0] == o[1], 'the first number is greater than the second': lambda o: int(o[0]) > int(o[1]),
        'the first ball is red': lambda o: o[0] == 'R', 'the red ball is not drawn': lambda o: 'R' not in o, 'one of the balls is green': lambda o: 'G' in o,
        'an odd number': lambda o: int(o[1:]) % 2 == 1, 'a head and an even number': lambda o: o[0] == 'H' and int(o[1:]) % 2 == 0,
    }
    if ev in E: return E[ev]
    m = re.fullmatch(r'the sum of the two numbers is (\d+)', ev)
    if m: return lambda o: int(o[0]) + int(o[1]) == int(m.group(1))
    m = re.fullmatch(r'the first die shows (\d+)', ev)
    if m: return lambda o: int(o[0]) == int(m.group(1))
    m = re.fullmatch(r'a head and a number at least (\d+)', ev)
    if m: return lambda o: o[0] == 'H' and int(o[1:]) >= int(m.group(1))
    m = re.fullmatch(r'a tail and a number greater than (\d+)', ev)
    if m: return lambda o: o[0] == 'T' and int(o[1:]) > int(m.group(1))
    raise ValueError('event: ' + ev)


@ref('aosamp', 'enumerate the sample space with itertools and filter by the event wording; evaluate every option set', 'exhaustive')
def aosamp(q):
    p = q['prompt']
    S = space(p)
    m = re.search(r'Which set is (?:the event "(.*)"|the sample space S)\?$', p)
    T = set(S) if m.group(1) is None else {o for o in S if event_pred(m.group(1), p)(o)}
    return pick(q, lambda o: set(re.findall(r'[A-Z0-9]+', o)) == T)


# ---- functions ----
def pairs_of(s):
    return [(int(a.replace('−', '-')), int(b.replace('−', '-'))) for a, b in re.findall(r'\((−?\d+), (−?\d+)\)', s)]


@ref('aoisfn', 'pairs of the relation (from text, table or point figure) checked against the definition of a function; every option evaluated', 'exhaustive')
def aoisfn(q):
    p = q['prompt']
    A = setlit(re.match(r'A = (\{[^}]*\})', p).group(1)); B = setlit(re.search(r'B = (\{[^}]*\})', p).group(1))
    fig = q.get('figure')
    if 'The relation R = ' in p:
        R = pairs_of(p.split('The relation R = ')[1])
    elif 'table in the picture' in p:
        R = [tuple(r) for r in fig['rows']]
    elif 'as points' in p:
        R = [tuple(r) for r in fig['points']]
    else:
        rule = re.search(r'y ∈ B and (.*?)\}\. Is R', p).group(1)
        r = clean(rule)
        r = re.sub(r'\|([^|]+)\|', r'abs(\1)', r)
        r = re.sub(r'(?<![\w)*])(\d+)([xy])', r'\1*\2', r)
        r = re.sub(r'(?<![<>=!])=(?!=)', '==', r)
        r = r.replace('x²', 'x**2').replace('y²', 'y**2')
        f = eval('lambda x, y: ' + r)
        R = [(x, y) for x in sorted(A) for y in sorted(B) if f(x, y)]
    imgs = {x: {y for a, y in R if a == x} for x in A}
    no_image = any(len(v) == 0 for v in imgs.values()); multi = any(len(v) > 1 for v in imgs.values())
    isfn = not no_image and not multi

    def t(o):
        if o.startswith('Yes'): return isfn
        if 'has no image' in o: return no_image
        if 'two or more images' in o: return multi
        if 'same image' in o: return False  # sharing an image never stops a relation being a function
        raise ValueError(o)
    return pick(q, t)


@ref('aofname', 'injective / surjective / identity / constant tested directly on the pairs; every option evaluated', 'exhaustive')
def aofname(q):
    p = q['prompt']
    A = setlit(re.match(r'A = (\{[^}]*\})', p).group(1))
    mb = re.search(r'B = (\{[^}]*\})', p)
    B = setlit(mb.group(1)) if mb else A
    f = dict(pairs_of(p.split('f = ')[-1]))
    if set(f) != A or not set(f.values()) <= B:
        return Verdict(False, 'f is not a function A -> B')
    inj = len(set(f.values())) == len(A); onto = set(f.values()) == B
    ident = all(f[x] == x for x in A); const = len(set(f.values())) == 1

    def t(o):
        return {
            'f is one-one and onto (a bijection)': inj and onto, 'f is one-one and into': inj and not onto,
            'f is many-one and into': not inj and not onto, 'f is many-one and onto': not inj and onto,
            'f is the identity function on A': ident, 'f is a constant function': const,
            'f is one-one but not the identity function': inj and not ident, 'f is neither constant nor one-one': not const and not inj}[o]
    return pick(q, t)


@ref('aofclass', 'f(x)=x²+px+q on [lo,∞): injectivity by exhaustive search for x≠y with f(x)=f(y) on a dyadic grid, range by grid minimum (exact Fractions); every option evaluated', 'exhaustive')
def aofclass(q):
    p = q['prompt'].replace('−', '-')
    m = re.fullmatch(r'Let f : \[(-?\d+), ∞\) → (ℝ|\[(-?\d+), ∞\)) be given by f\(x\) = (.+)\. Which statement is true\?', p)
    lo = int(m.group(1)); cod = None if m.group(2) == 'ℝ' else int(m.group(3))
    cf = sp.Poly(P(m.group(4)), sp.Symbol('x')).all_coeffs()
    cf = [0] * (3 - len(cf)) + list(cf); assert cf[0] == 1
    pp, qq = int(cf[1]), int(cf[2])
    f = lambda x: x * x + pp * x + qq
    grid = [Fraction(lo) + Fraction(i, 4) for i in range(0, 4 * 60)]
    vals = {}
    inj = True
    for x in grid:
        v = f(x)
        if v in vals and vals[v] != x:
            inj = False; break
        vals[v] = x
    mn = min(f(x) for x in grid)
    if cod is not None and mn < cod:
        return Verdict(False, f'f takes the value {mn} below the stated codomain [{cod}, ∞): not a map into the codomain')
    onto = cod is not None and mn == cod

    def t(o):
        return {'f is one-one and onto (a bijection)': inj and onto, 'f is one-one but not onto': inj and not onto,
                'f is onto but not one-one': onto and not inj, 'f is neither one-one nor onto': not inj and not onto}[o]
    return pick(q, t)


@ref('aorel', 'the relation as an explicit set of pairs on A; reflexive/symmetric/transitive tested from the definitions', 'exhaustive')
def aorel(q):
    p = q['prompt']
    m = re.fullmatch(r'On the set A = (\{[\d, …]*\}), the relation R = \{\(a, b\) : a, b ∈ A, (.*)\}\. Which statement is true\?', p)
    mm = re.fullmatch(r'\{1, 2, …, (\d+)\}', m.group(1))
    A = list(range(1, int(mm.group(1)) + 1)) if mm else sorted(setlit(m.group(1)))
    rule = m.group(2)
    r = clean(rule)
    r = re.sub(r'\|([^|]+)\|', r'abs(\1)', r)
    r = re.sub(r'ab is even', '(a*b) % 2 == 0', r)
    r = re.sub(r'a - b is divisible by (\d+)', r'(a-b) % \1 == 0', r)
    r = re.sub(r'a divides b', 'b % a == 0', r)
    r = r.replace('≤', '<=')
    r = re.sub(r'(?<![<>=!])=(?!=)', '==', r)
    f = eval('lambda a, b: ' + r)
    R = {(a, b) for a in A for b in A if f(a, b)}
    refl = all((a, a) in R for a in A); sym = all((b, a) in R for a, b in R)
    trans = all((a, d) in R for a, b in R for c, d in R if b == c)

    def t(o):
        mm = re.fullmatch(r'R is (not )?reflexive, (not )?symmetric and (not )?transitive', o)
        return (not mm.group(1)) == refl and (not mm.group(2)) == sym and (not mm.group(3)) == trans
    return pick(q, t)
