"""choice-recheck: number-b choice families judged against the ACTUAL option texts (parsed from the options, not from the prompt order)."""
import re
import sys
import os
from fractions import Fraction as F

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
import sympy as sp  # noqa: E402
from refs.choice_pass_util import JUDGES, Ambiguous, Defect, Unsupported, judge, nm  # noqa: E402

SUP = {'⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4', '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9', '⁻': '-'}
SUPRE = '[' + ''.join(SUP) + ']+'
SCI = r'(\d+(?:\.\d+)?) × 10(' + SUPRE + r')'
MINUS = '−'


def order_note(q, o, sep=';'):
    """the option list must equal the list printed in the prompt (in order); report if not (informational: the judge itself uses the options)"""
    return None


@judge('ajcrcmp', 'each option parsed as an Indian-grouped numeral (3 digits, then groups of 2; comma-stripped integer); correct = the unique maximum, read from the option texts')
def ajcrcmp(q, o):
    vals = []
    for t in o:
        g = nm(t).split(',')
        if not (all(len(s) == 2 for s in g[1:-1]) and (len(g) == 1 or len(g[-1]) == 3) and 1 <= len(g[0]) <= 2 + (len(g) == 1) * 5):
            return Unsupported('malformed Indian grouping ' + t)
        vals.append(int(''.join(g)))
    mx = max(vals)
    if vals.count(mx) > 1:
        return Ambiguous('tie for greatest')
    return [v == mx for v in vals]


@judge('akscmp', 'each option parsed as mantissa x 10^e and evaluated as an exact Fraction; correct = the unique maximum')
def akscmp(q, o):
    vals = []
    for t in o:
        m = re.fullmatch(SCI, nm(t))
        if not m:
            return Unsupported('option not scientific notation ' + t)
        vals.append(F(m[1]) * F(10) ** int(''.join(SUP[c] for c in m[2])))
    mx = max(vals)
    if vals.count(mx) > 1:
        return Ambiguous('tie for largest')
    return [v == mx for v in vals]


def parse_num(s):
    s = s.strip().replace(MINUS, '-')
    if s == 'π':
        return sp.pi
    if '(one more' in s:
        return sp.Symbol('nonrepeating', irrational=True)
    m = re.fullmatch(r'(\d+)\.(\d+)…', s)
    if m:
        d = m[2]
        for L in range(1, len(d) + 1):
            if all(d[i] == d[i % L] for i in range(len(d))):
                break
        return sp.Rational(int(m[1])) + sp.Rational(int(d[:L]), 10 ** L - 1)
    s = re.sub(r'(?<![\w.])(\d+\.\d+)(?![\w.])', lambda m: f"Rational('{m[1]}')", s)
    s = re.sub(r'√\(([^)]*)\)', r'sqrt(\1)', s)
    s = re.sub(r'√(\d+)', r'sqrt(\1)', s)
    s = re.sub(r'(\d)sqrt', r'\1*sqrt', s)
    s = re.sub(r'(?<![\d.\'])(\d+)/(\d+)', r'Rational(\1,\2)', s)
    return sp.sympify(s, locals={'Rational': sp.Rational})


@judge('amclass', 'each option text evaluated exactly with SymPy (integer/rational/irrational predicates); the category is read from the prompt; correct options = those satisfying it (must be exactly one)')
def amclass(q, o):
    m = re.match(r'Which of these numbers is (?:a|an) (natural number|whole number that is not a natural number|integer that is not a whole number|rational number that is not an integer|irrational number)\?', q['prompt'])
    if not m:
        return Unsupported('prompt template')
    kind = m[1]
    out = []
    for t in o:
        x = parse_num(t)
        isint, israt = x.is_integer, x.is_rational
        c = {'natural': bool(isint and x > 0), 'whole': bool(isint and x >= 0), 'integer': bool(isint), 'rational': bool(israt), 'irrational': x.is_irrational is True}
        out.append({'natural number': c['natural'], 'whole number that is not a natural number': c['whole'] and not c['natural'],
                    'integer that is not a whole number': c['integer'] and not c['whole'],
                    'rational number that is not an integer': c['rational'] and not c['integer'], 'irrational number': c['irrational']}[kind])
    return out
