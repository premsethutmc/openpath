"""Independent reading of mathematical answer text into SymPy objects, for the grading audit oracle.

Written separately from the production readers (packages/learning answer-types.ts, backend answer_types.py): it shares no code
and no grammar with them. It reads what a learner may type: unicode or ASCII minus, √/sqrt, π/pi, superscript powers, implicit
multiplication, function application without brackets (sin x), |...| absolute value, log/ln, inverse trig (tan⁻¹ / arctan),
e^(...), i for the imaginary unit where asked. Anything it cannot read raises Unreadable: the oracle then labels the case
unverified, never passing.
"""
import re
import sympy as sp
from sympy.parsing.sympy_parser import (
    parse_expr, standard_transformations, implicit_multiplication_application, convert_xor, function_exponentiation,
)

TRANSFORMS = standard_transformations + (implicit_multiplication_application, convert_xor, function_exponentiation)


class Unreadable(Exception):
    pass


SUPER = str.maketrans('⁰¹²³⁴⁵⁶⁷⁸⁹⁻', '0123456789-')
_FUNCS = ['arcsin', 'arccos', 'arctan', 'arccot', 'arcsec', 'arccsc', 'sinh', 'cosh', 'tanh', 'sin', 'cos', 'tan', 'cot', 'sec',
          'csc', 'log', 'ln', 'exp', 'sqrt', 'Abs']


def _glyphs(s):
    s = s.strip()
    s = s.replace('−', '-').replace('–', '-').replace('—', '-').replace('×', '*').replace('·', '*').replace('⋅', '*').replace('÷', '/')
    s = s.replace('π', ' pi ').replace('∞', ' oo ').replace('cosec', 'csc')
    # inverse trig: tan⁻¹(x) / tan^-1 x  ->  arctan
    s = re.sub(r'(sin|cos|tan|cot|sec|csc)\s*(?:⁻¹|\^\s*\(?-1\)?)', r'arc\1', s)
    # superscript runs: x²  ->  x**(2)
    s = re.sub(r'([⁰¹²³⁴⁵⁶⁷⁸⁹⁻]+)', lambda m: '**(' + m.group(1).translate(SUPER) + ')', s)
    # √(...) / √x / 3√65 -> sqrt(...)
    s = re.sub(r'√\s*\(', 'sqrt(', s)
    s = re.sub(r'√\s*([0-9]+(?:\.[0-9]+)?|[a-zA-Z])', r'sqrt(\1)', s)
    s = s.replace('√', 'sqrt')
    return s


def _abs_bars(s):
    """|...| pairs -> Abs(...) (left-to-right, innermost pairing by alternation)."""
    out, opened = [], 0
    for i, ch in enumerate(s):
        if ch == '|':
            prev = s[:i].rstrip()
            starts = opened == 0 or (prev and prev[-1] in '(+-*/^,= ' ) or not prev
            if opened and not (prev and prev[-1] in '(+-*/^,'):
                out.append(')'); opened -= 1
            elif starts:
                out.append(' Abs('); opened += 1
            else:
                out.append(')'); opened -= 1
        else:
            out.append(ch)
    if opened:
        raise Unreadable('unbalanced |')
    return ''.join(out)


def expr(text, imaginary=False, allow_eq=False):
    """A SymPy expression for one mathematical term. Raises Unreadable."""
    if not isinstance(text, str) or not text.strip():
        raise Unreadable('empty')
    s = _abs_bars(_glyphs(text))
    if re.search(r'[^0-9a-zA-Z_+\-*/^().,\s=<>!|]', s):
        raise Unreadable(f'unexpected symbol in {text!r}')
    # a written decimal is an exact decimal: 1.5 -> (3/2)
    s = re.sub(r'(?<![\d.])(\d*\.\d+|\d+\.\d*)(?![\d.])', lambda m: '(' + str(__import__('fractions').Fraction(m.group(1))) + ')', s)
    if '=' in s and not allow_eq:
        raise Unreadable('equation where a term was expected')
    FN = r'(?:arc)?(?:sin|cos|tan|cot|sec|csc)|log|ln|sqrt|exp'
    # a letter, number or bracket written against a function name: xcos(x), xlogx, 2sqrt(3)  ->  x*cos(x), x*logx, 2*sqrt(3)
    s = re.sub(r'(?<=[a-zA-Z0-9)])(?<!arc)(?<!s)(?<!c)(?<!t)(?<!e)(?=(?:' + FN + r'))', '*', s)
    s = re.sub(r'(?<=[a-zA-Z0-9)])(?<!arc)(?=(?:arc)(?:sin|cos|tan|cot|sec|csc))', '*', s)
    s = re.sub(r'(?<=[a-z0-9)])(?<!arc)(?<![a-z]{2})(?=(?:sin|cos|tan|sec|csc|cot|log|exp|sqrt))', '*', s)
    # function applied without brackets: sin x, cos 3x, sec x tan x, logx  ->  sin(x), cos(3x), sec(x)tan(x), log(x)
    s = re.sub(r'(?<![a-z])(' + FN + r')\s*(\d*[a-z](?![a-z(])|\d+(?![\d.(/^]))', r'\1(\2)', s)
    s = re.sub(r'(?<![a-z])ln(?![a-z])', 'log', s)
    if re.search(r'\d\s+\d', s):
        raise Unreadable('numbers written side by side')
    if re.search(r'\*\*\s*$|[+\-*/^]\s*$|^\s*[*/^]|\(\s*\)', s):
        raise Unreadable('dangling operator')
    if s.count('(') != s.count(')'):
        raise Unreadable('unbalanced brackets')
    local = {'e': sp.E, 'pi': sp.pi, 'oo': sp.oo, 'I': sp.I, 'E': sp.E, 'Abs': sp.Abs, 'log': sp.log, 'ln': sp.log, 'sqrt': sp.sqrt,
             'arcsin': sp.asin, 'arccos': sp.acos, 'arctan': sp.atan, 'arccot': sp.acot, 'arcsec': sp.asec, 'arccsc': sp.acsc,
             'sec': sp.sec, 'csc': sp.csc, 'cot': sp.cot, 'exp': sp.exp}
    local['i'] = sp.I if imaginary else sp.Symbol('i')
    try:
        with sp.evaluate(True):
            e = parse_expr(s, local_dict=local, transformations=TRANSFORMS, evaluate=True)
    except Exception as ex:  # noqa: BLE001 - any parse failure is "unreadable"
        raise Unreadable(f'parse: {ex.__class__.__name__}') from None
    if isinstance(e, (tuple, list)):
        raise Unreadable('a list where a term was expected')
    if not isinstance(e, sp.Basic):
        e = sp.sympify(e)
    if e.has(sp.zoo) or e.has(sp.nan):
        raise Unreadable('undefined value (division by zero)')
    return e


def split_top(s, seps=','):
    """split on separators that are not inside brackets"""
    out, depth, cur = [], 0, []
    for ch in s:
        if ch in '([{':
            depth += 1
        elif ch in ')]}':
            depth -= 1
        if ch in seps and depth == 0:
            out.append(''.join(cur)); cur = []
        else:
            cur.append(ch)
    out.append(''.join(cur))
    return [p.strip() for p in out]


def strip_wrap(s, pairs=('()', '{}', '[]')):
    t = s.strip()
    for a, b in pairs:
        if t.startswith(a) and t.endswith(b):
            inner = t[1:-1]
            depth = 0
            ok = True
            for ch in inner:
                depth += ch in '([{'
                depth -= ch in ')]}'
                if depth < 0:
                    ok = False
                    break
            if ok and depth == 0:
                return inner.strip()
    return t


def is_number(e):
    return isinstance(e, sp.Basic) and not e.free_symbols and e.is_number
