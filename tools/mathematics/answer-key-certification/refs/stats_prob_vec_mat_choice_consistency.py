"""Standalone analysis (NOT a reference module; nothing is registered): for the choice-letter families of the slice the option lists
are not in the export, so the keyed letter cannot be verified. This script derives the true category of every question independently
(enumeration / exact arithmetic) and tabulates the keyed letter against it. A letter that is a single-valued function of the true
category over all questions means the key is internally consistent (necessary, not sufficient: the letter -> option-text mapping
itself is not exported). Run:  python3 refs/stats_prob_vec_mat_choice_consistency.py DATA OUT.json   (needs SymPy on PYTHONPATH)"""
import collections
import itertools
import json
import re
import sys
from fractions import Fraction

import sympy as sp


def load(data, f):
    return [json.loads(l) for l in open(f'{data}/q/{f}.jsonl')]


def is_prime(n):
    return n > 1 and all(n % d for d in range(2, n))


def tab(rows):
    c = collections.defaultdict(collections.Counter)
    for cat, let in rows:
        c[str(cat)][let] += 1
    return {k: dict(v) for k, v in sorted(c.items())}


def main(data):
    out = {}
    rows = []
    for q in load(data, 'anstack'):
        v = q['figure']['values']; a = Fraction(v[0], v[0] + v[1]); b = Fraction(v[2], v[2] + v[3])
        rows.append(('9A walk share larger' if a > b else '9B walk share larger' if b > a else 'equal', q['answer']))
    out['anstack'] = tab(rows)
    rows = []
    for q in load(data, 'atcv'):
        n = [int(x) for x in re.findall(r'\d+', q['prompt'])[:4]]
        c1, c2 = Fraction(n[1], n[0]), Fraction(n[3], n[2])
        rows.append(('first has smaller CV' if c1 < c2 else 'second has smaller CV' if c2 < c1 else 'equal CV', q['answer']))
    out['atcv'] = tab(rows)
    rows = []
    for q in load(data, 'anavgav'):
        n1, m1, n2, m2, tot, claim = [int(x) for x in re.findall(r'\d+', q['prompt'])[:6]]
        w = Fraction(n1 * m1 + n2 * m2, n1 + n2)
        rows.append(('claim right' if w == claim else 'true mean above claim' if w > claim else 'true mean below claim', q['answer']))
    out['anavgav'] = tab(rows)
    rows = []
    x, y, z = sp.symbols('x y z')
    for q in load(data, 'aqrank'):
        eqs = q['prompt'].replace('−', '-').split('has: ')[1].rstrip('.').split(', ')
        A, b = [], []
        for e in eqs:
            l, r = e.split(' = '); l = re.sub(r'(\d)([xyz])', r'\1*\2', l)
            L = sp.expand(sp.sympify(l)); A.append([L.coeff(v) for v in (x, y, z)]); b.append(int(r))
        A = sp.Matrix(A); Ab = A.row_join(sp.Matrix(b))
        ra, rab = A.rank(), Ab.rank()
        rows.append(('inconsistent (no solution)' if ra < rab else 'unique' if ra == 3 else 'infinitely many', q['answer']))
    out['aqrank'] = tab(rows)
    rows = []
    for q in load(data, 'ansure'):
        p = q['prompt']; ev = re.search(r'Event: "([^"]*)"', p).group(1); k = [int(t) for t in re.findall(r'\d+', ev)]
        if p.startswith('A fair die'):
            S = [(d,) for d in range(1, 7)]
            f = (lambda t: t[0] < k[0]) if 'less than' in ev else (lambda t: t[0] > k[0]) if 'greater than' in ev else (lambda t: t[0] % k[0] == 0)
        elif p.startswith('Two fair dice'):
            S = list(itertools.product(range(1, 7), repeat=2))
            f = (lambda t: sum(t) <= k[0]) if 'at most' in ev else (lambda t: sum(t) == k[0])
        elif p.startswith('A bag'):
            r, b = [int(t) for t in re.findall(r'(\d+) (?:red|blue)', p)]
            S = ['red'] * r + ['blue'] * b
            f = (lambda t: t in ('red', 'blue')) if 'red or blue' in ev else (lambda t: t == 'green') if 'green' in ev else (lambda t: t == 'red')
        else:
            N = int(re.search(r'numbered 1 to (\d+)', p).group(1)); S = [(c,) for c in range(1, N + 1)]
            f = (lambda t: t[0] <= k[0]) if 'at most' in ev else (lambda t: t[0] > k[0]) if 'greater than' in ev else (lambda t: t[0] % 2 == 0)
        n = sum(1 for s in S if f(s))
        rows.append(('impossible' if n == 0 else 'sure' if n == len(S) else 'neither', q['answer']))
    out['ansure'] = tab(rows)

    def pr(d):
        k = [int(t) for t in re.findall(r'\d+', d)]
        if 'multiple of' in d: return lambda t: t % k[0] == 0
        if 'at most' in d: return lambda t: t <= k[0]
        if 'at least' in d: return lambda t: t >= k[0]
        if 'greater than' in d: return lambda t: t > k[0]
        if 'less than' in d: return lambda t: t < k[0]
        if 'even' in d: return lambda t: t % 2 == 0
        if 'odd' in d: return lambda t: t % 2 == 1
        if 'prime' in d: return is_prime
        raise ValueError(d)
    rows = []
    for q in load(data, 'atindt'):
        p = q['prompt']; N = int(re.search(r'…, (\d+)', p).group(1)); S = range(1, N + 1)
        e = re.findall(r'event "the number is ([^"]*)"', p)
        A = {t for t in S if pr(e[0])(t)}; B = {t for t in S if pr(e[1])(t)}
        ind = Fraction(len(A & B), N) == Fraction(len(A), N) * Fraction(len(B), N)
        rows.append((('independent' if ind else 'dependent') + ', ' + ('mutually exclusive' if not A & B else 'not mutually exclusive'), q['answer']))
    out['atindt'] = tab(rows)
    rows = []
    for q in load(data, 'asmex'):
        p = q['prompt']; n = int(re.search(r'with (\d+) equal', p).group(1))
        A, B = [set(int(t) for t in s.split(', ')) for s in re.findall(r'[AB] = \{([^}]*)\}', p)]
        rows.append((('mutually exclusive' if not A & B else 'not mutually exclusive') + ', ' + ('exhaustive' if A | B == set(range(1, n + 1)) else 'not exhaustive'), q['answer']))
    out['asmex'] = tab(rows)
    # families whose letters are shuffled per question (no function of the true category): tabulated to document it
    rows = []
    for q in load(data, 'adbartf'):
        f = q['figure']; lab = [t.lower() for t in f['labels']]; v = dict(zip(lab, f['values']))
        s = re.search(r'"(.*)"', q['prompt']).group(1).lower(); mm = re.search(r'(\d+)', s)
        found = sorted((s.find(l), l) for l in lab if l in s)
        if 'in all' in s or 'asked' in s: t = int(mm.group(1)) == sum(f['values'])
        elif mm:
            a, b = found[0][1], found[1][1]; n = int(mm.group(1))
            t = v[a] - v[b] == n if 'read' in s else v[b] - v[a] == n
        else:
            a, b = found[0][1], found[1][1]; t = v[a] > v[b]
        rows.append(('statement true' if t else 'statement false', q['answer']))
    out['adbartf'] = tab(rows)
    rows = []
    for q in load(data, 'akmex'):
        p = q['prompt']; N = 6 if 'die' in p else int(re.search(r'numbered 1 to (\d+)', p).group(1)); S = set(range(1, N + 1))
        a, b = re.search(r'Event A: (.*?)\. Event B: (.*?)\. Which', p).groups()
        def pe(d):
            k = [int(t) for t in re.findall(r'\d+', d)]
            if d == 'an even number': return lambda t: t % 2 == 0
            if d == 'an odd number': return lambda t: t % 2 == 1
            if d == 'a prime number': return is_prime
            if d.startswith('a multiple of'): return lambda t: t % k[0] == 0
            if d.startswith('a number greater than'): return lambda t: t > k[0]
            if d.endswith('or less'): return lambda t: t <= k[0]
            return lambda t: int(t ** .5) ** 2 == t
        A = {t for t in S if pe(a)(t)}; B = {t for t in S if pe(b)(t)}
        rows.append((('mutually exclusive' if not A & B else 'not mutually exclusive') + ', ' + ('exhaustive' if A | B == S else 'not exhaustive'), q['answer']))
    out['akmex'] = tab(rows)
    rows = []
    for q in load(data, 'akscale'):
        p = q['prompt']
        if 'bag' in p:
            r, b = [int(t) for t in re.findall(r'(\d+) red and (\d+) blue', p)[0]]
            ev = re.search(r'"the marble is ([^"]*)"', p).group(1); S = ['red'] * r + ['blue'] * b
            f = (lambda t: t == 'red') if ev == 'red' else (lambda t: t == 'blue') if ev == 'blue' else (lambda t: t in ('red', 'blue')) if ev == 'red or blue' else (lambda t: t == 'green')
        else:
            S = range(1, 7); k = int(re.findall(r'\d+', p.split('event')[1])[0]); f = (lambda t: t > k) if 'more than' in p else (lambda t: t < k)
        pp = Fraction(sum(1 for s in S if f(s)), len(S))
        rows.append(('P=0' if pp == 0 else 'P=1' if pp == 1 else 'P=1/2' if pp == Fraction(1, 2) else '0<P<1/2' if pp < Fraction(1, 2) else '1/2<P<1', q['answer']))
    out['akscale'] = tab(rows)
    return out


if __name__ == '__main__':
    res = main(sys.argv[1])
    json.dump(res, open(sys.argv[2], 'w'), indent=1, ensure_ascii=False)
    for k, v in res.items():
        func = all(len(c) == 1 for c in v.values())
        print(k, 'letter is a function of the true category' if func else 'NOT a function (letters vary within a category)')
