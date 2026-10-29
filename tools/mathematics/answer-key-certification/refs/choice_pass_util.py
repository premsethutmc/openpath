"""Shared helpers for the choice-pass slice (standalone: no production imports, stored answer never used as oracle).

A judge is fn(q, opts) -> list[bool] (is option i a correct answer?) | Unsupported | Ambiguous | Defect.
"""
import re
from fractions import Fraction

JUDGES = {}


class Unsupported:
    def __init__(self, reason=''):
        self.reason = reason


class Ambiguous:
    def __init__(self, reason=''):
        self.reason = reason


class Defect:
    """the construction itself is wrong (figure contradicts statement, invalid parameters ...)"""
    def __init__(self, reason=''):
        self.reason = reason


def judge(family, method, coverage='exhaustive', assumptions=''):
    def deco(fn):
        JUDGES[family] = {'fn': fn, 'method': method, 'coverage': coverage, 'assumptions': assumptions}
        return fn
    return deco


def nm(s):
    return re.sub(r'\s+', ' ', s.replace('−', '-')).strip()


def fr(s):
    """'-9/2', '3/8', '5' (unicode minus allowed) -> Fraction"""
    s = nm(s).replace(' ', '')
    return Fraction(s)


SUP = {'⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4', '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9', '⁻': '-'}


def unsup(s):
    return ''.join(SUP.get(c, c) for c in s)


def isprime(n):
    return n > 1 and all(n % d for d in range(2, int(n ** 0.5) + 1))


def event_pred(phrase):
    """predicate on a positive integer for a verbal event description, or None"""
    p = nm(phrase).lower().rstrip('.')
    p = re.sub(r'^(the )?number (shown |on the card )?(is|are) ', '', p)
    p = re.sub(r'^(a|an) number (is )?', 'a number ', p)
    p = re.sub(r'^an? number (?=(greater|more|less|of|at))', '', p) if False else p
    m = None
    if p in ('an even number', 'even'):
        return lambda n: n % 2 == 0
    if p in ('an odd number', 'odd'):
        return lambda n: n % 2 == 1
    if p in ('a prime number', 'prime'):
        return isprime
    if p in ('a perfect square',):
        return lambda n: int(round(n ** 0.5)) ** 2 == n
    m = re.fullmatch(r'(?:a )?multiple of (\d+)', p)
    if m:
        k = int(m.group(1)); return lambda n: n % k == 0
    m = re.fullmatch(r'(?:a )?factor of (\d+)', p)
    if m:
        k = int(m.group(1)); return lambda n: k % n == 0
    m = re.fullmatch(r'(?:a number )?(?:greater|more) than (\d+)', p)
    if m:
        k = int(m.group(1)); return lambda n: n > k
    m = re.fullmatch(r'(?:a number )?less than (\d+)', p)
    if m:
        k = int(m.group(1)); return lambda n: n < k
    m = re.fullmatch(r'(?:a number )?(?:of )?(\d+) or less', p)
    if m:
        k = int(m.group(1)); return lambda n: n <= k
    m = re.fullmatch(r'(?:a number )?(?:of )?(\d+) or more', p)
    if m:
        k = int(m.group(1)); return lambda n: n >= k
    m = re.fullmatch(r'(?:a number )?at most (\d+)', p)
    if m:
        k = int(m.group(1)); return lambda n: n <= k
    m = re.fullmatch(r'(?:a number )?at least (\d+)', p)
    if m:
        k = int(m.group(1)); return lambda n: n >= k
    return None


def only(opts, text_fn):
    return [bool(text_fn(o)) for o in opts]


def eq_text(opts, text):
    t = nm(text)
    return [nm(o) == t for o in opts]
