"""The earlier Python stored-answer comparison (a mirror of the app's legacy canonical comparison), RETIRED from authoritative grading.

Phase C stage 10: grading-policy@1 never calls anything here. It is used only by
  - OPENPATH_GRADING=shadow|legacy (the migration and rollback modes; learning._decide), and
  - replay of a historical record that has no recorded verdict at all (learning.credited), which decision 3 keeps as it was until a
    reviewed reconstruction is approved.
It is deleted when the migration modes are retired (an approved release step); test_grading_modes.UnifiedNeverUsesLegacyComparison
fails if the unified path calls it.
"""
import re
from fractions import Fraction

from .answer_types import HUMAN, NEW_TYPES, SAMPLED, canonical_of, expanded_form, parse as parse_expression, same_answer

WRITTEN_LIMIT = 16000  # kept equal to learning.WRITTEN_LIMIT (a test checks)
NUMBER = r'[+-]?\d{1,9}(?:\.\d{0,9})?'  # a whole number may be typed with a zero decimal part (the app's canonical); 9 digits like the app's canonicalInteger (answer-core.ts)
# RATIONAL/MIXED: up to 30 digits per part (grading audit G2; the app's parseNumber reads up to 80 characters, so the server stays the stricter reader)
RATIONAL = r'[+-]?\d{1,30}(?:\.\d{1,30})?(?:/[+-]?\d{1,30})?'
# mixed@1: a mixed number "3 1/2" is 3 + 1/2 ("-3 1/2" is -(3 + 1/2)), never 31/2 (packages/mathematics answers.ts)
MIXED = r'([+-]?)(\d{1,30})\s+(\d{1,30})/(\d{1,30})'


def _rational(t):
    m = re.fullmatch(MIXED, t, flags=re.ASCII)
    if m:
        v = int(m.group(2)) + Fraction(int(m.group(3)), int(m.group(4)))
        return -v if m.group(1) == '-' else v
    if ' ' in t:
        raise ValueError('not a number')
    return Fraction(t)


def _unbrace(t):
    """An unordered set may be written with its braces: {1, 2} is 1, 2 (the app's canonical)."""
    m = re.fullmatch(r'\{([^{}]*)\}', t)
    return m.group(1) if m else t


def canonical(kind, raw):
    """The answer's canonical form (the app's `canonical`), or None if it is not one of this kind. answers@2 types
    (answer_types.py): exact types have a canonical form; sampled types are compared in `right`; written: none."""
    if kind in NEW_TYPES:
        return canonical_of(kind, raw)
    t = str(raw).strip().replace('−', '-')
    try:
        if kind == 'choice':
            return t.upper() if t.upper() in {'A', 'B', 'C', 'D'} else None
        if kind == 'integer':
            if not re.fullmatch(NUMBER, t, flags=re.ASCII):
                return None
            v = Fraction(t)
            return str(v.numerator) if v.denominator == 1 else str(v)
        if kind == 'fraction':
            return str(_rational(t))
        if kind == 'set':
            parts = [Fraction(p.strip()) for p in _unbrace(t).split(',')]
            return ','.join(sorted(str(p) for p in parts)) if len(set(parts)) == len(parts) else None
    except (ValueError, ZeroDivisionError):
        return None
    return t


def right(q, response):
    if q['type'] in HUMAN:
        return False  # an educator marks it
    # form@1: an "expand" task's answer must be written expanded, whatever its value
    if q.get('expanded') and not expanded_form(response):
        return False
    if q['type'] in SAMPLED:
        return same_answer(q['type'], response, q['answer'])
    c = canonical(q['type'], response)
    return c is not None and c == canonical(q['type'], q['answer'])


def _answer_ok(kind, raw):
    t = raw.strip().replace('−', '-')
    if kind in HUMAN:
        return 0 < len(t) <= WRITTEN_LIMIT
    if kind in SAMPLED:
        try:
            parse_expression(re.sub(r'\s*\+\s*[cCkK]\s*$', '', t) if kind == 'antiderivative' else t)
            return True
        except Exception:  # noqa: BLE001 - any unreadable expression
            return False
    if kind in NEW_TYPES:
        return canonical_of(kind, t) is not None
    if kind == 'choice':
        return t.upper() in {'A', 'B', 'C', 'D'}
    if kind == 'integer':
        return re.fullmatch(NUMBER, t, flags=re.ASCII) is not None
    if kind == 'fraction':
        return (re.fullmatch(RATIONAL, t, flags=re.ASCII) is not None or re.fullmatch(MIXED, t, flags=re.ASCII) is not None) and not re.search(r'/[+-]?0+$', t)
    if kind == 'set':
        parts = [p.strip() for p in _unbrace(t).split(',')]
        return 0 < len(parts) <= 30 and all(re.fullmatch(RATIONAL, p, flags=re.ASCII) for p in parts)
    if kind == 'polynomial':
        return re.fullmatch(r'[0-9x+\-*^() /.²³]{1,60}', t) is not None
    return False
