import re, math
from kit import ref, Expect, Verdict, Unsupported, Ambiguous, Fraction
from refs.number_b_util import *


def half_up(x):
    return math.floor(x + F(1, 2))


@ref('aiest', 'parse statement; round each exact decimal half-up to integer; exact Fraction product/quotient')
def aiest(q):
    p = clean(q['prompt'])
    m = re.match(r'Estimate ([\d.]+) ([*/]) ([\d.]+) by first', p)
    a, b = val(m[1]), val(m[3])
    ra, rb = half_up(a), half_up(b)
    if rb == 0:
        return Ambiguous('divisor rounds to 0')
    r = F(ra) * rb if m[2] == '*' else F(ra) / rb
    if any((x * 2).denominator == 1 and x.denominator != 1 for x in (a, b)):
        pass
    return Expect(txt(r))


@ref('aifdiv', 'parse fractions from statement; exact Fraction division; form: lowest terms')
def aifdiv(q):
    e = q['prompt'].split('=')[0]
    return Expect(txt(ev(e)), form=True)


@ref('aifmul', 'parse (mixed) fractions from statement; exact Fraction product; form: lowest terms')
def aifmul(q):
    e = q['prompt'].split('=')[0]
    return Expect(txt(ev(e)), form=True)


@ref('aiwdiv', 'exact Fraction division of whole by fraction; form: lowest terms')
def aiwdiv(q):
    e = q['prompt'].split('=')[0]
    return Expect(txt(ev(e)), form=True)


@ref('aifword', 'parse numbers from word statement per story template; exact Fractions')
def aifword(q):
    p = q['prompt']
    n = [val(t) for t in re.findall(r'\d+/\d+|\d+', p)]
    if 'buttermilk' in p or 'school bag' in p:
        r = n[0] / n[1]
        if r.denominator != 1:
            return Ambiguous('whole-glass/bag count not integral')
        return Expect(txt(r))
    if 'packet holds' in p:
        return Expect(txt(n[0] * n[1]))
    if 'tomatoes' in p:
        return Expect(txt(n[0] * n[1]))
    if 'cupfuls' in p:
        return Expect(txt(n[0] / n[1]))
    if 'for each km' in p:
        return Expect(txt(n[0] * n[1]))
    return Unsupported('unknown template')


@ref('aiint', 'evaluate the signed-integer expression in the statement exactly (Fractions)')
def aiint(q):
    return Expect(txt(ev(q['prompt'].split('=')[0])))


@ref('aiintx', 'evaluate the integer expression in the statement exactly (Fractions)')
def aiintx(q):
    p = q['prompt']
    m = re.match(r'Work out (.*)\.$', p)
    if not m:
        n = [val(t) for t in re.findall(r'\d+', p.replace(M, ''))]
        if 'quiz' in p:
            return Expect(txt(n[0] * n[2] - n[1] * n[3]) if False else txt(n[0] * n[2] - n[1] * n[3]))
        if 'Shimla' in p:
            s0 = val(re.search(r'was (\u2212?\d+)', p)[1])
            drop, hrs = [val(x) for x in re.search(r'fell by (\d+) \u00b0C every hour for (\d+) hours', p).groups()]
            t = s0
            for _ in range(int(hrs)):
                t -= drop
            return Expect(txt(t))
        return Unsupported('template not an expression')
    return Expect(txt(ev(m[1])))


@ref('aimulti', 'parse the story and add/subtract successive changes')
def aimulti(q):
    p = q['prompt'].replace(M, '-')
    if 'temperature' in p:
        s, a, b, c = [val(t) for t in re.findall(r'-?\d+', p)[1:5]] if False else [val(t) for t in re.findall(r'(?<=was )-?\d+|(?<=by )\d+(?= °C)', p)]
        return Expect(txt(s + a - b + c))
    if 'lift' in p:
        s = val(re.search(r'starts at floor (-?\d+)', p)[1])
        a, b, c = [val(x) for x in re.search(r'up (\d+) floors, then down (\d+) floors, then up (\d+) floors', p).groups()]
        return Expect(txt(s + a - b + c))
    if 'diver' in p:
        s = val(re.search(r'at (-?\d+) m', p)[1])
        a, b, c = [val(x) for x in re.search(r'rises (\d+) m, then dives down (\d+) m, then rises (\d+) m', p).groups()]
        return Expect(txt(s + a - b + c))
    return Unsupported('template')


@ref('aitemp', 'parse the two levels; difference upper minus lower')
def aitemp(q):
    p = q['prompt'].replace(M, '-')
    if 'temperature' in p:
        a, b = [val(x) for x in re.findall(r'(?:was|it was) (-?\d+) °C', p)]
        return Expect(txt(b - a))
    a = val(re.search(r'diver is at (-?\d+) m', p)[1])
    b = val(re.search(r'(?:fish|seagull) is at (-?\d+) m', p)[1])
    return Expect(txt(b - a))


@ref('ajbest', 'unit price of each pack as exact Fraction; smaller is better value')
def ajbest(q):
    p = clean(q['prompt'])
    a, pa, b, pb = [val(x) for x in re.findall(r'(?<![\w])\d[\d,]*', p)[0:4]] if False else [val(x) for x in re.search(r'has (\d+) soaps for (\d[\d,]*)\. Pack B has (\d+) soaps for (\d[\d,]*)', p).groups()]
    return Expect(txt(min(F(pa) / a, F(pb) / b)))


@ref('ajbrk', 'evaluate the bracketed expression exactly')
def ajbrk(q):
    return Expect(txt(ev(q['prompt'].split(':')[1].split('=')[0])))


def money(s):
    return val(s.replace('₹', ''))


@ref('ajci', 'period-by-period simulation of balance with Fractions (not the closed formula)')
def ajci(q):
    p = clean(q['prompt'])
    m = re.search(r'compound interest on (\d[\d,]*) for (\d+) years at (\d+)% per year, compounded (annually|half-yearly|quarterly)', p)
    if m:
        P, yrs, r, kind = F(m[1].replace(',', '')), int(m[2]), F(int(m[3]), 100), m[4]
        k = {'annually': 1, 'half-yearly': 2, 'quarterly': 4}[kind]
        bal = P
        for _ in range(yrs * k):
            bal += bal * r / k
        return Expect(txt(bal - P))
    m = re.search(r'worth (\d[\d,]*) loses (\d+)% of its value each year .* after (\d+) years', p)
    if m:
        bal = F(m[1].replace(',', ''))
        for _ in range(int(m[3])):
            bal -= bal * F(int(m[2]), 100)
        return Expect(txt(bal))
    return Unsupported('template: ' + p[:60])


@ref('ajdisc', 'exact percentage of the marked price')
def ajdisc(q):
    p = clean(q['prompt'])
    m = re.search(r'marked (\d[\d,]*)\. .* (\d+)% discount', p)
    if m:
        P = F(m[1].replace(',', ''))
        return Expect(txt(P - P * int(m[2]) / 100))
    m = re.search(r'costs (\d[\d,]*) before GST\. GST is (\d+)%', p)
    P = F(m[1].replace(',', ''))
    return Expect(txt(P + P * int(m[2]) / 100))
