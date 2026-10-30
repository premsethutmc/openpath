"""Independent answer-key certification kit.

A *reference* is a Python function that derives a question's correct answer from its structured parameters (and, where the
parameters alone do not say what is asked, from the question statement) by a method that is NOT the generator's code. It never
imports production code: only the exported question data is read. Texts are compared with the Phase-A oracle's SymPy readers
(`tools/mathematics/grading-audit/oracle`, which imports no production grader), so "the same answer" means mathematically equal
for the question's answer type, not the same string.

Usage in refs/<slice>.py:

    from kit import ref, Expect, Verdict, Unsupported, Ambiguous, Fraction, sp
    @ref('mul', method='exact integer product', coverage='exhaustive')
    def mul(q):
        a, b = q['params']
        return Expect(str(a * b))

Return values
  Expect(text, form=False)  the correct answer written as text of the question's answer type ("3/4", "2, -3", "[[1,2],[3,4]]",
                            "x^2+2x+1", "(-oo, 3]", ...). With form=True the stored answer must also be in that form (e.g. lowest terms).
  Verdict(ok, note)         the stored answer was checked directly against the question's conditions (substitution, enumeration,
                            differentiation ...) without deriving a competing text; ok=False is a mismatch with `note` as the evidence.
  Unsupported(reason)       this question cannot be verified independently (recorded, never counted as verified).
  Ambiguous(reason)         the statement admits more than one reasonable answer.
coverage: 'exhaustive' runs every released question; 'sampled' (with sample=N) runs N deterministic questions
(first, last, per-parameter minima/maxima, then evenly spaced).
"""
import os
import re
import sys
from fractions import Fraction  # noqa: F401  (re-exported for refs)

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', 'grading-audit', 'oracle'))
import sympy as sp  # noqa: E402,F401
import mathtext  # noqa: E402,F401
import oracle  # noqa: E402

REFS = {}


class Expect:
    def __init__(self, text, form=False):
        self.text, self.form = text, form


class Verdict:
    def __init__(self, ok, note=''):
        self.ok, self.note = ok, note


class Unsupported:
    def __init__(self, reason=''):
        self.reason = reason


class Ambiguous:
    def __init__(self, reason=''):
        self.reason = reason


def ref(family, method, coverage='exhaustive', sample=400, assumptions=''):
    def deco(fn):
        REFS[family] = {'fn': fn, 'method': method, 'coverage': coverage, 'sample': sample, 'assumptions': assumptions}
        return fn
    return deco


def context(q):
    return oracle.context({'answer': q['answer'], 'prompt': q.get('prompt'), 'options': None})


def meaning(q, text=None):
    """the mathematical object of `text` (default: the stored answer) for the question's answer type"""
    return oracle.meaning(q['type'], q['answer'] if text is None else text, context(q))


def norm_form(s):
    return re.sub(r'\s+', '', s.replace('−', '-')).lower()


def compare(q, exp):
    """('ok'|'mismatch'|'form'|'incomplete'|'unsupported', detail) for an Expect against the stored answer"""
    ctx = context(q)
    try:
        a = oracle.meaning(q['type'], q['answer'], ctx)
        b = oracle.meaning(q['type'], exp.text, ctx)
    except Exception as e:  # noqa: BLE001
        return 'unsupported', f'unreadable: {type(e).__name__}: {e}'[:200]
    try:
        eq = oracle.equal(q['type'], a, b, ctx)
    except Exception as e:  # noqa: BLE001
        return 'unsupported', f'comparison failed: {type(e).__name__}'[:200]
    if eq is None:
        return 'unsupported', 'equality undecided'
    if eq is False:
        if q['type'] in ('set', 'roots'):
            try:
                if len(a) < len(b) and all(any(oracle.equal(q['type'], [x], [y], ctx) for y in b) for x in a):
                    return 'incomplete', f'stored {q["answer"]!r} omits solutions of {exp.text!r}'
            except Exception:  # noqa: BLE001
                pass
        return 'mismatch', f'stored {q["answer"]!r} != derived {exp.text!r}'
    if exp.form and norm_form(q['answer']) != norm_form(exp.text):
        return 'form', f'equal in value but stored {q["answer"]!r} is not in the required form {exp.text!r}'
    return 'ok', ''


def sample_indices(items, n):
    """deterministic coverage sample: first, last, per-parameter extremes, then evenly spaced"""
    if len(items) <= n:
        return list(range(len(items)))
    chosen = {0, len(items) - 1}
    k = len(items[0]['params'])
    for j in range(k):
        vals = [it['params'][j] for it in items]
        chosen.add(vals.index(min(vals)))
        chosen.add(vals.index(max(vals)))
    step = max(1, len(items) // max(1, n - len(chosen)))
    for i in range(0, len(items), step):
        if len(chosen) >= n:
            break
        chosen.add(i)
    return sorted(chosen)
