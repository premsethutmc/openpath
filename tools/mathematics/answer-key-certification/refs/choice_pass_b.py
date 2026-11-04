"""choice-pass judges, part B: probability, statistics, data classification, vectors, linear systems."""
import itertools
import math
import re
from fractions import Fraction

import sympy as sp

from .choice_pass_util import (JUDGES, Ambiguous, Defect, Unsupported, event_pred, eq_text, fr, isprime, judge, nm, unsup)


def _cat(p):
    return 'imp' if p == 0 else 'cert' if p == 1 else 'unl' if p < Fraction(1, 2) else 'even' if p == Fraction(1, 2) else 'lik'


SCALE = {'Impossible (0)': 'imp', 'Unlikely (between 0 and 1/2)': 'unl', 'Even chance (1/2)': 'even',
         'Likely (between 1/2 and 1)': 'lik', 'Certain (1)': 'cert'}


def _bag_p(r, b, ev):
    if ev == 'red': return Fraction(r, r + b)
    if ev == 'blue': return Fraction(b, r + b)
    if ev == 'green': return Fraction(0)
    if ev == 'red or blue': return Fraction(r + b, r + b)
    raise KeyError(ev)


@judge('akscale', 'probability by direct enumeration of equally likely outcomes, then placed on the scale (0 / (0,1/2) / 1/2 / (1/2,1) / 1)')
def akscale(q, opts):
    p = q['prompt']
    m = re.search(r'A bag has (\d+) red and (\d+) blue marbles\. .*event "the marble is (.+)"\?', p)
    if m:
        r, b = int(m.group(1)), int(m.group(2))
        prob = _bag_p(r, b, m.group(3))
    else:
        m = re.search(r'An ordinary die is rolled\. .*event "the number shown is (.+)"\?', p)
        if not m:
            return Unsupported('unparsed prompt')
        ev = event_pred(m.group(1))
        if ev is None:
            return Unsupported(f'event {m.group(1)!r}')
        prob = Fraction(sum(ev(n) for n in range(1, 7)), 6)
    return [SCALE[nm(o)] == _cat(prob) for o in opts]


@judge('ansure', 'enumerate the sample space (dice, cards, bag), count favourable outcomes: 0 = impossible, all = sure, else neither')
def ansure(q, opts):
    p = q['prompt']
    m = re.search(r'A fair die is thrown\. Event: "the number shown is (.+)"\.', p)
    if m:
        ev = event_pred(m.group(1)); S = range(1, 7)
        if ev is None: return Unsupported(f'event {m.group(1)!r}')
        fav, tot = sum(ev(n) for n in S), 6
    else:
        m = re.search(r'Two fair dice are thrown together\. Event: "the sum of the two numbers is (at most )?(\d+)"', p)
        if m:
            k = int(m.group(2))
            outs = [a + b for a in range(1, 7) for b in range(1, 7)]
            fav, tot = sum((s <= k) if m.group(1) else (s == k) for s in outs), 36
        else:
            m = re.search(r'A bag has (\d+) red and (\d+) blue balls\. .*Event: "the ball is (.+)"\.', p)
            if m:
                fav = {'red': int(m.group(1)), 'blue': int(m.group(2)), 'green': 0, 'red or blue': int(m.group(1)) + int(m.group(2))}[m.group(3)]
                tot = int(m.group(1)) + int(m.group(2))
            else:
                m = re.search(r'Cards numbered (\d+) to (\d+) are shuffled and one is drawn\. Event: "the number on the card is (.+)"\.', p)
                if not m: return Unsupported('unparsed prompt')
                ev = event_pred(m.group(3))
                if ev is None: return Unsupported(f'event {m.group(3)!r}')
                S = range(int(m.group(1)), int(m.group(2)) + 1)
                fav, tot = sum(ev(n) for n in S), len(S)
    truth = {'an impossible event, with probability 0': fav == 0, 'a sure event, with probability 1': fav == tot,
             'neither: its probability is between 0 and 1': 0 < fav < tot}
    return [truth[nm(o)] for o in opts]


def _universe(p):
    m = re.search(r'cards numbered (\d+) to (\d+)', p)
    if m:
        return range(int(m.group(1)), int(m.group(2)) + 1)
    if 'ordinary die' in p:
        return range(1, 7)
    return None


@judge('akmex', 'enumerate the sample space; mutually exclusive iff A∩B empty, exhaustive iff A∪B is the whole space')
def akmex(q, opts):
    p = q['prompt']
    m = re.search(r'Event A: (.*?)\. Event B: (.*?)\. Which statement', p)
    S = _universe(p)
    if not m or S is None:
        return Unsupported('unparsed prompt')
    fa, fb = event_pred(m.group(1)), event_pred(m.group(2))
    if fa is None or fb is None:
        return Unsupported('unparsed event')
    A, B = {n for n in S if fa(n)}, {n for n in S if fb(n)}
    me, ex = not (A & B), (A | B) == set(S)
    truth = {'A and B are mutually exclusive and exhaustive (complementary)': me and ex,
             'A and B are neither mutually exclusive nor exhaustive': (not me) and (not ex),
             'A and B are mutually exclusive, but not exhaustive': me and not ex,
             'A and B are exhaustive, but not mutually exclusive': ex and not me}
    return [truth[nm(o)] for o in opts]


@judge('asmex', 'set algebra on the stated events A, B and the sample space 1..n')
def asmex(q, opts):
    m = re.search(r'(\d+) equal sectors numbered 1 to (\d+) is spun once\. Let A = \{(.*?)\} and B = \{(.*?)\}\.', q['prompt'])
    if not m:
        return Unsupported('unparsed prompt')
    n = int(m.group(1))
    A, B = {int(x) for x in m.group(3).split(',')}, {int(x) for x in m.group(4).split(',')}
    S = set(range(1, n + 1))
    me, ex = not (A & B), (A | B) == S
    truth = {'mutually exclusive, but not exhaustive': me and not ex, 'exhaustive, but not mutually exclusive': ex and not me,
             'both mutually exclusive and exhaustive': me and ex, 'neither mutually exclusive nor exhaustive': not me and not ex}
    return [truth[nm(o)] for o in opts]


@judge('atindt', 'enumerate 1..n: independent iff P(A∩B)=P(A)P(B) (exact Fractions); mutually exclusive iff A∩B empty')
def atindt(q, opts):
    m = re.search(r'chosen at random from 1, 2, 3, …, (\d+)\. Let A be the event "(.*?)" and B the event "(.*?)"\.', q['prompt'])
    if not m:
        return Unsupported('unparsed prompt')
    n = int(m.group(1)); S = range(1, n + 1)
    fa, fb = event_pred(m.group(2)), event_pred(m.group(3))
    if fa is None or fb is None:
        return Unsupported('unparsed event')
    A, B = {k for k in S if fa(k)}, {k for k in S if fb(k)}
    pa, pb, pab = Fraction(len(A), n), Fraction(len(B), n), Fraction(len(A & B), n)
    ind, me = pab == pa * pb, not (A & B)
    truth = {'A and B are independent': ind,
             'A and B are mutually exclusive, so they are not independent': me and not ind,
             'A and B are neither independent nor mutually exclusive': (not ind) and (not me)}
    return [truth[nm(o)] for o in opts]


@judge('atcv', 'coefficient of variation sd/mean as exact Fractions; smaller CV = more consistent')
def atcv(q, opts):
    m = re.search(r"(\w+)'s cricket scores have mean (\d+) runs and standard deviation (\d+) runs; (\w+)'s scores have mean (\d+) runs and standard deviation (\d+) runs", q['prompt'])
    if not m:
        return Unsupported('unparsed prompt')
    n1, m1, s1, n2, m2, s2 = m.groups()
    c1, c2 = Fraction(int(s1), int(m1)), Fraction(int(s2), int(m2))
    want = 'Both are equally consistent' if c1 == c2 else f'{n1} is more consistent' if c1 < c2 else f'{n2} is more consistent'
    return eq_text(opts, want)


@judge('anavgav', 'weighted mean (n1*m1+n2*m2)/(n1+n2) versus the claimed average of the two means (exact Fractions); the two "Yes" options are judged on their stated reasons')
def anavgav(q, opts):
    m = re.search(r'Section A has (\d+) students with a mean mark of (\d+), and Section B has (\d+) students with a mean mark of (\d+)\..*mean mark of all (\d+) students is (\S+),', q['prompt'])
    if not m:
        return Unsupported('unparsed prompt')
    n1, m1, n2, m2, tot, claim = int(m.group(1)), int(m.group(2)), int(m.group(3)), int(m.group(4)), int(m.group(5)), fr(m.group(6))
    if tot != n1 + n2:
        return Defect('total student count inconsistent')
    true = Fraction(n1 * m1 + n2 * m2, n1 + n2)
    avg = Fraction(m1 + m2, 2)
    if claim != avg:
        return Defect('claimed value is not the average of the two means')
    truth = {
        'Yes, because the two sections have the same number of students': n1 == n2,
        'No: the true mean is higher, because the section with the higher mean has more students': true > claim,
        'No: the true mean is lower, because the section with the lower mean has more students': true < claim,
        'Yes: the average of the two means is always the mean of everyone': False,  # false as a general claim
    }
    return [truth[nm(o)] for o in opts]


@judge('anstack', 'row-wise shares walk/(walk+bus) of each class as exact Fractions (figure holds the counts)')
def anstack(q, opts):
    f = q['figure']
    v = f['values']
    if f['labels'] != ['9A walk', '9A bus', '9B walk', '9B bus']:
        return Unsupported('unexpected figure layout')
    ta, tb = v[0] + v[1], v[2] + v[3]
    if ta == 0 or tb == 0:
        return Ambiguous('a class has no children: share undefined')
    a, b = Fraction(v[0], ta), Fraction(v[2], tb)
    return eq_text(opts, 'Both would be the same length' if a == b else 'Class 9A' if a > b else 'Class 9B')


@judge('anvalid', 'a probability must lie in [0,1] (exact Fractions)')
def anvalid(q, opts):
    if q['prompt'] != 'Which of these numbers cannot be the probability of an event?':
        return Unsupported('unparsed prompt')
    out = []
    for o in opts:
        x = Fraction(nm(o).replace(' ', '')) if '/' in o else Fraction(nm(o).replace('-', '-'))
        out.append(not (0 <= x <= 1))
    return out


@judge('anaxiom', 'an assignment is valid iff every P(ωi) >= 0 and the four values sum to exactly 1')
def anaxiom(q, opts):
    if not q['prompt'].startswith('A random experiment has the sample space S = {ω₁, ω₂, ω₃, ω₄}'):
        return Unsupported('unparsed prompt')
    out = []
    for o in opts:
        vals = re.findall(r'P\(ω[₁₂₃₄]\) = (\S+?)(?:,|$)', nm(o))
        if len(vals) != 4:
            return Unsupported('option not parsed')
        v = [fr(x) for x in vals]
        out.append(all(x >= 0 for x in v) and sum(v) == 1)
    return out


# ---- sample spaces ----
def _ss(kind):
    if kind == 'coin': return {'H', 'T'}
    if kind == '2coins': return {a + b for a in 'HT' for b in 'HT'}
    if kind == '3coins': return {''.join(t) for t in itertools.product('HT', repeat=3)}
    if kind == 'die': return {str(i) for i in range(1, 7)}
    if kind == 'kids': return {a + b for a in 'BG' for b in 'BG'}
    if kind == 'suit': return {'spades', 'hearts', 'diamonds', 'clubs'}
    if kind == 'coindie': return {c + str(d) for c in 'HT' for d in range(1, 7)}
    if kind == 'spin2': return {a + b for a in 'RYG' for b in 'RYG'}


SS_STEM = [('A coin is tossed once.', 'coin'), ('Two coins are tossed together.', '2coins'), ('Three coins are tossed together.', '3coins'),
           ('An ordinary die is rolled once.', 'die'), ('A family has two children', 'kids'), ('One card is drawn from a full pack of playing cards, and its suit is noted.', 'suit'),
           ('A coin is tossed and a die is rolled.', 'coindie'), ('A spinner with three equal parts coloured red (R), yellow (Y) and green (G) is spun twice.', 'spin2')]


@judge('akssl', 'sample spaces generated by itertools.product over the stated experiment; events by filtering 1..n; an option is correct iff it is exactly that set (no omissions, no extras, no repeats)')
def akssl(q, opts):
    p = q['prompt']
    for stem, kind in SS_STEM:
        if p.startswith(stem):
            want = _ss(kind)
            break
    else:
        m = re.search(r'cards numbered 1 to (\d+)\. Which set is the event "the number is (.+)"\?', p)
        if not m:
            return Unsupported('unparsed prompt')
        ev = event_pred(m.group(2))
        if ev is None:
            return Unsupported(f'event {m.group(2)!r}')
        want = {str(n) for n in range(1, int(m.group(1)) + 1) if ev(n)}
    out = []
    for o in opts:
        mm = re.fullmatch(r'\{(.*)\}', nm(o))
        toks = [t.strip() for t in mm.group(1).split(',')]
        out.append(len(toks) == len(set(toks)) and set(toks) == want)
    return out


@judge('aqrank', 'sympy matrix_rank of A and of the augmented [A|b] (Rouche-Capelli), cross-checked with sympy linsolve')
def aqrank(q, opts):
    m = re.fullmatch(r'Use the rank method to decide how many solutions this system has: (.+)\.', nm(q['prompt']))
    if not m:
        return Unsupported('unparsed prompt')
    eqs = m.group(1).split(', ')
    x, y, z = sp.symbols('x y z')
    rows, rhs = [], []
    for e in eqs:
        lhs, r = e.split(' = ')
        ex = _lin(lhs, (x, y, z))
        rows.append([ex.coeff(v) for v in (x, y, z)]); rhs.append(sp.Integer(int(nm(r))))
    A = sp.Matrix(rows); Ab = A.row_join(sp.Matrix(rhs))
    ra, rb = A.rank(), Ab.rank()
    kind = 'none' if ra < rb else 'one' if ra == 3 else 'many'
    sol = sp.linsolve((A, sp.Matrix(rhs)), x, y, z)
    k2 = 'none' if sol == sp.EmptySet else 'one' if len(list(sol)[0].free_symbols) == 0 else 'many'
    assert kind == k2
    truth = {'exactly one solution': kind == 'one', 'infinitely many solutions': kind == 'many', 'no solution': kind == 'none'}
    return [truth[nm(o)] for o in opts]


def _lin(lhs, syms):
    s = nm(lhs).replace(' ', '')
    s = re.sub(r'([+-]?)(\d*)([xyz])', lambda m: f"{m.group(1) or '+'}{m.group(2) or 1}*{m.group(3)}", s)
    return sp.sympify(s, locals={str(v): v for v in syms})


# ---- data classification (textbook definitions) ----
PRIMARY = {
    'A class measures the heights of its own students for a project.': True,
    'A farmer weighs the mangoes picked from each tree in his orchard.': True,
    'Divya asks shoppers at the market what they paid for a kilogram of tomatoes.': True,
    'Imran asks every student in his class how they travel to school.': True,
    'Kavya records the temperature outside her house every morning for a month.': True,
    'Meena counts the vehicles passing her school gate between 8 and 9 a.m.': True,
    'Ravi asks 30 neighbours which newspaper they read.': True,
    'The sports teacher times each runner in the 100 m race on sports day.': True,
    'A class uses the number of tourists to Ooty given in a government report.': False,
    'A student uses rainfall figures printed in a newspaper.': False,
    'A teacher uses milk-production figures from a table in a textbook.': False,
    'Arjun copies the population of each state from the census website.': False,
    'Farhan uses temperature records published by the weather department.': False,
    'Karthik writes down cricket scores from a sports magazine.': False,
    "Priya copies her town's monthly bus-passenger numbers from the transport department's website.": False,
    "Selvi takes last year's exam results from the school's annual report.": False,
}


@judge('akprim', 'textbook definition (NCERT/CBSE): primary data are collected first-hand by the investigator; secondary data are taken from an existing published source. Each of the 16 scenarios labelled by the certifier from the scenario text alone.', assumptions='scenario labels are the certifier\'s own reading of each sentence')
def akprim(q, opts):
    want_primary = {'Which of these is primary data?': True, 'Which of these is secondary data?': False}.get(q['prompt'])
    if want_primary is None:
        return Unsupported('unparsed prompt')
    try:
        return [PRIMARY[nm(o)] == want_primary for o in opts]
    except KeyError as e:
        return Unsupported(f'unlabelled scenario {e}')


NAMES = {'Anu', 'Arjun', 'Divya', 'Imran', 'Karthik', 'Kavya', 'Kumar', 'Lakshmi', 'Meena', 'Priya', 'Ravi', 'Selvi', 'Vijay'}


@judge('avstatq', 'textbook definition: a statistical question anticipates variability in the answers (asks about a group); a question about one named individual has one answer (not statistical); a declarative sentence is a statement', assumptions='classification of each stem by the certifier from grammar (declarative / singular named person / group)')
def avstatq(q, opts):
    m = re.search(r'What kind of item is this: [“"](.*)[”"]$', q['prompt'])
    if not m:
        return Unsupported('unparsed prompt')
    s = m.group(1).strip()
    if s.endswith('.'):
        kind = 'A statement, not a question'
    elif s.endswith('?'):
        group = re.search(r'\b(students|children|players|each of the)\b', s)
        named = any(re.search(rf'\b{n}\b', s) for n in NAMES)
        if group and not named:
            kind = 'A statistical question'
        elif named and not group:
            kind = 'A question that is not statistical'
        else:
            return Ambiguous('cannot classify')
    else:
        return Unsupported('odd punctuation')
    return eq_text(opts, kind)


# ---- vectors / physics ----
VECTOR_Q = {'acceleration', 'displacement', 'electric field strength', 'force', 'momentum', 'velocity', 'weight'}
SCALAR_Q = {'density', 'distance', 'energy', 'mass', 'speed', 'temperature', 'time', 'volume', 'work done'}


def _vec(s):
    s = nm(s).replace('î', 'i').replace('ĵ', 'j').replace('k̂', 'k')
    v = {'i': Fraction(0), 'j': Fraction(0), 'k': Fraction(0)}
    for sign, coef, axis in re.findall(r'([+-]?)\s*(\(\d+/\d+\)|\d+/\d+|\d*)\s*([ijk])', s.replace(' ', '')):
        c = Fraction(coef.strip('()')) if coef else Fraction(1)
        v[axis] += -c if sign == '-' else c
    return [v['i'], v['j'], v['k']]


@judge('atvtype', 'standard definitions: scalar = magnitude only (distance, speed, mass, time, energy, work, density, volume, temperature); vector = magnitude and direction (displacement, velocity, acceleration, force, weight, momentum, electric field); vector kinds by coordinates; co-initial = same initial point')
def atvtype(q, opts):
    p = nm(q['prompt'])
    if p == 'Which of these is a vector quantity?':
        return [nm(o) in VECTOR_Q for o in opts] if all(nm(o) in VECTOR_Q | SCALAR_Q for o in opts) else Unsupported('unknown quantity')
    if p == 'Which of these is a scalar quantity?':
        return [nm(o) in SCALAR_Q for o in opts] if all(nm(o) in VECTOR_Q | SCALAR_Q for o in opts) else Unsupported('unknown quantity')
    m = re.fullmatch(r'Which pair of vectors are co-initial vectors\?', p)
    if m:
        out = []
        for o in opts:
            a, b = re.fullmatch(r'(\w\w) and (\w\w)', nm(o)).groups()
            out.append(a[0] == b[0])
        return out
    m = re.fullmatch(r'P is the point \((.*?)\) and Q is the point \((.*?)\)\. What kind of vector is PQ\?', p)
    if m:
        P = [int(x) for x in m.group(1).split(', ')]; Qp = [int(x) for x in m.group(2).split(', ')]
        v = [b - a for a, b in zip(P, Qp)]
        n2 = sum(c * c for c in v)
        truth = {'a zero vector': n2 == 0, 'a unit vector': n2 == 1, 'neither a zero vector nor a unit vector': n2 not in (0, 1)}
        return [truth[nm(o)] for o in opts]
    m = re.fullmatch(r'What kind of vector is v = (.+)\?', p)
    if m:
        v = _vec(m.group(1))
        n2 = sum(c * c for c in v)  # |v|^2 exact
        truth = {'a zero vector': n2 == 0, 'a unit vector': n2 == 1, 'neither a zero vector nor a unit vector': n2 not in (0, 1)}
        return [truth[nm(o)] for o in opts]
    m = re.fullmatch(r'How are the vectors a = (.+) and b = (.+) related\?', p)
    if m:
        a, b = _vec(m.group(1)), _vec(m.group(2))
        eq = a == b
        neg = b == [-x for x in a]
        cross = [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
        col = all(c == 0 for c in cross)
        truth = {'a and b are equal vectors': eq, 'b is the negative of a (b = −a)': neg and not eq,
                 'a and b are collinear, but neither equal nor negatives of each other': col and not eq and not neg,
                 'a and b are not collinear': not col}
        return [truth[nm(o).replace('-', '−') if '(b =' in o else nm(o)] for o in opts]
    return Unsupported('unparsed prompt')
