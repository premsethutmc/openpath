"""Independent references for the everyday-wording form (":w") of a family (machine-validation@1).

The answer-key certification checks only that a wording form has the same stored answer as the typed question; it never reads
the wording. A reference here reads the WORDING ALONE (never the typed prompt, the parameters or the generator), derives the
answer from it, and returns the answer as text, or None when it does not recognise the wording (reported unsupported, never
guessed). A family's wording form is admitted only when every wording of the family is verified this way.
"""
import re

WORDREFS = {}


def wordref(family, method):
    def deco(fn):
        WORDREFS[family] = {'fn': fn, 'method': method}
        return fn
    return deco


def _i(s):
    return int(s.replace('−', '-'))


def same_answer(kind, derived, stored):
    """Exact comparison after normalising signs and spaces; a set compares as a set."""
    norm = lambda s: s.replace('−', '-').replace(' ', '')
    if kind == 'set':
        return sorted(norm(derived).split(',')) == sorted(norm(stored).split(',')) and len(set(norm(stored).split(','))) == len(norm(stored).split(','))
    return norm(derived) == norm(stored)


@wordref('aeineqz', 'try every number the wording allows and keep those whose result meets the stated condition')
def aeineqz(text):
    m = re.fullmatch(
        r'\w+ thinks of (a whole number \(0 is allowed\)|a counting number \(1, 2, 3, …\)|an integer \(a whole number or a negative whole number\) from (−?\d+) to (−?\d+), both included)'
        r'(?:, multiplies it by (−?\d+) and then| and) (adds|takes away) (\d+)\. The result is (less than|at most) (−?\d+)\. Which numbers could \w+ be thinking of\? List them all\.', text)
    if not m:
        return None
    mult = _i(m[4]) if m[4] else 1
    add = int(m[6]) * (1 if m[5] == 'adds' else -1)
    limit = _i(m[8])
    meets = (lambda v: v < limit) if m[7] == 'less than' else (lambda v: v <= limit)
    if m[2] is not None:
        domain = range(_i(m[2]), _i(m[3]) + 1)
    else:
        if mult <= 0:
            return None  # an unbounded list: not a question with a finite answer
        domain = range(0 if m[1].startswith('a whole') else 1, 100000)
    hits = [x for x in domain if meets(mult * x + add)]
    if not hits or (m[2] is None and hits[-1] > 50000):
        return None
    return ','.join(str(x) for x in hits)
