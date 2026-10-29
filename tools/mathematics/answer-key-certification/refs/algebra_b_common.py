"""helpers shared by the algebra-b reference modules (no production imports)"""
import json
import re
from fractions import Fraction

SUP = str.maketrans('⁰¹²³⁴⁵⁶⁷⁸⁹', '0123456789')
SUB = str.maketrans('₀₁₂₃₄₅₆₇₈₉', '0123456789')
OPTS = None


def options(q):
    """the option texts of a typed multiple-choice question (exported separately by the certifier from the statement data)"""
    global OPTS
    if OPTS is None:
        OPTS = json.load(open('/tmp/certout/algebra-b/choice_options.json'))
    return OPTS[q['id'].split(':')[1]][q['id']]


def letter_of(q, pred):
    """the unique option letter whose text satisfies pred (None if zero or several satisfy it)"""
    hits = [i for i, o in enumerate(options(q)) if pred(o)]
    return 'ABCD'[hits[0]] if len(hits) == 1 else None


def num(s):
    s = s.replace('−', '-').replace(',', '')
    return Fraction(s) if ('.' in s or '/' in s) else int(s)


def ints(s, signed=True):
    pat = r'−?\d+' if signed else r'\d+'
    return [int(x.replace('−', '-')) for x in re.findall(pat, s)]


def nums(s):
    return [num(x) for x in re.findall(r'−?\d+(?:\.\d+)?(?:/\d+)?', s)]


def setlit(s):
    """'{1, 2, 3}' -> set of ints"""
    return {int(x.replace('−', '-')) for x in re.findall(r'−?\d+', s)}


def fmt_set(xs):
    return ','.join(str(x) for x in sorted(xs))


def sgn(x):
    return str(x).replace('-', '−') if False else str(x)
