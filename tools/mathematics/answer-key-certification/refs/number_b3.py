import re, math
from kit import ref, Expect, Verdict, Unsupported, Ambiguous, Fraction, sp
from refs.number_b_util import *

SUP = {'⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4', '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9', '⁻': '-'}


def unsup(s):
    """a² -> a**(2) with superscript run read as exponent"""
    return re.sub('[' + ''.join(SUP) + ']+', lambda m: '**(' + ''.join(SUP[c] for c in m[0]) + ')', s)


def pw(s):
    """evaluate an expression with superscript exponents, integers and Fractions"""
    e = unsup(s.replace('×', '*').replace('÷', '/').replace(M, '-'))
    e = re.sub(r'(?<![\w.])(\d+)(?![\w.])', lambda m: f'F({m[1]})', e)
    return eval(e, {'__builtins__': {}, 'F': F})


@ref('ajidiv', 'exact division of the integers in the statement; checks divisibility')
def ajidiv(q):
    r = ev(q['prompt'].split('=')[0])
    return Expect(txt(r))


@ref('ajimul', 'exact product of the integers in the statement')
def ajimul(q):
    return Expect(txt(ev(q['prompt'].split('=')[0])))


def sign_of(phrase):
    pos = ('above', 'profit', 'deposit', 'gain')
    neg = ('below', 'loss', 'withdrawal')
    a = any(w in phrase for w in pos)
    b = any(w in phrase for w in neg)
    assert a != b, phrase
    return 1 if a else -1


@ref('ajintl', 'parse each template: number-line moves, signed-quantity reading, opposite, distance |a-b|')
def ajintl(q):
    p = q['prompt'].replace(M, '-')
    m = re.search(r'point P is (\d+) units? to the (left|right) of (-?\d+)\.', p)
    if m:
        d = int(m[1]) * (-1 if m[2] == 'left' else 1)
        return Expect(str(int(m[3]) + d))
    m = re.search(r'write "([^"]+)" as an integer', p)
    if m:
        n = int(re.search(r'\d+', m[1])[0])
        return Expect(str(sign_of(m[1]) * n))
    m = re.search(r'Write the opposite of "([^"]+)" as an integer', p)
    if m:
        n = int(re.search(r'\d+', m[1])[0])
        return Expect(str(-sign_of(m[1]) * n))
    m = re.fullmatch(r'What is the opposite of (-?\d+)\?', p)
    if m:
        return Expect(str(-int(m[1])))
    m = re.fullmatch(r'How many units apart are (-?\d+) and (-?\d+) on the number line\?', p)
    if m:
        return Expect(str(abs(int(m[1]) - int(m[2]))))
    return Unsupported('template ' + p[:50])


@ref('ajinv', 'additive inverse / reciprocal / distributive expression evaluated exactly with Fractions')
def ajinv(q):
    p = q['prompt']
    m = re.fullmatch(r'What is the additive inverse of (.*)\?', p)
    if m:
        x = ev(m[1])
        assert x + (-x) == 0
        return Expect(txt(-x))
    m = re.fullmatch(r'What is the multiplicative inverse \(reciprocal\) of (.*)\?', p)
    if m:
        x = ev(m[1])
        return Expect(txt(1 / x))
    m = re.match(r'Use the distributive property to work out (.*)\. \(A fraction', p)
    return Expect(txt(ev(m[1])))


@ref('ajlaw', 'evaluate both sides as exact numbers and find the integer k with base^k equal to the value')
def ajlaw(q):
    p = q['prompt']
    m = re.match(r'Write (.*?) as a single power of (\d+),', p)
    v = pw(m[1])
    b = int(m[2])
    for k in range(-60, 61):
        if F(b) ** k == v:
            return Expect(str(k))
    return Unsupported('no integer power')


@ref('ajmill', 'strip Indian grouping, check the words, divide by 10^6')
def ajmill(q):
    p = q['prompt']
    m = re.match(r'([\d,]+) is (\d+) crore(?: (\d+) lakh)?\. How many millions is it\?', p)
    n = int(m[1].replace(',', ''))
    g = m[1].split(',')
    assert all(len(x) == 2 for x in g[1:-1]) and len(g[-1]) == 3
    assert n == int(m[2]) * 10 ** 7 + int(m[3] or 0) * 10 ** 5, 'words disagree with numeral'
    return Expect(txt(F(n, 10 ** 6)))


@ref('ajneg', 'evaluate the power expression exactly with Fractions (negative exponent = reciprocal)')
def ajneg(q):
    m = re.match(r'Find the value of (.*)\. \(A fraction', q['prompt'])
    return Expect(txt(pw(m[1])))


@ref('ajord', 'sort the listed integers numerically')
def ajord(q):
    m = re.search(r'smallest first\): (.*)\. Write them', q['prompt'])
    xs = sorted(int(x.strip().replace(M, '-')) for x in m[1].split(','))
    return Expect('(' + ', '.join(str(x) for x in xs) + ')')


@ref('ajpf', 'sympy factorint expanded to a sorted list; product re-multiplied')
def ajpf(q):
    n = int(re.search(r'Write (\d+) as a product', q['prompt'])[1])
    out = []
    for pr, e in sorted(sp.factorint(n).items()):
        out += [pr] * e
    assert math.prod(out) == n
    return Expect('(' + ', '.join(map(str, out)) + ')')


@ref('ajpl', 'exact percentage arithmetic with Fractions')
def ajpl(q):
    p = clean(q['prompt'])
    m = re.search(r'buys a .* for (\d[\d,]*) and sells it at a (\d+)% (profit|loss)', p)
    if m:
        c = F(m[1].replace(',', ''))
        r = F(int(m[2]), 100) * (1 if m[3] == 'profit' else -1)
        return Expect(txt(c * (1 + r)))
    m = re.search(r'sells a .* for (\d[\d,]*) and makes a (\d+)% (profit|loss)', p)
    s = F(m[1].replace(',', ''))
    r = F(int(m[2]), 100) * (1 if m[3] == 'profit' else -1)
    c = s / (1 + r)
    assert c * (1 + r) == s
    return Expect(txt(c))


@ref('ajplamt', 'profit = selling - cost; solve each unknown from that identity')
def ajplamt(q):
    p = clean(q['prompt'])
    P = lambda s: F(s.replace(',', ''))
    m = re.search(r'bought a .* for (\d[\d,]*) and sold it for (\d[\d,]*)\. Find the profit or loss', p)
    if m:
        return Expect(txt(P(m[2]) - P(m[1])))
    m = re.search(r'bought a .* for (\d[\d,]*) and made a (profit|loss) of (\d[\d,]*)\. What was the selling', p)
    if m:
        return Expect(txt(P(m[1]) + (1 if m[2] == 'profit' else -1) * P(m[3])))
    m = re.search(r'sold a .* for (\d[\d,]*) and made a (profit|loss) of (\d[\d,]*)\. What was the cost', p)
    if m:
        return Expect(txt(P(m[1]) - (1 if m[2] == 'profit' else -1) * P(m[3])))
    return Unsupported('template ' + p[:50])


UNS = {
    'ajcmpx': 'type choice: the exported question has no options (no mc field, none in the prompt); the letter A/B/C cannot be mapped to a sign, and for the same relation (e.g. "=") the stored letter varies A/B/C across questions, so options are evidently per-question; correctness of the key cannot be established from the export',
    'ajpfdc': 'type choice: statements A-D are not in the prompt or export; the key letter cannot be mapped to a statement',
    'ajprop': 'type choice: property names for A-D are not in the prompt or export; the key letter cannot be mapped to a property',
}
