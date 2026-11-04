"""helpers for number-b references: parse the *statement* with Fractions (no production code)"""
import re
from fractions import Fraction as F

M = '−'


def clean(s):
    return s.replace(M, '-').replace('×', '*').replace('÷', '/').replace('₹', '').replace('°', ' ')


def val(tok):
    """'1,000' '1.6' '3/4' '1 4/9' '1½' -> Fraction"""
    tok = tok.replace(',', '').strip().replace(M, '-')
    neg = tok.startswith('-')
    tok = tok.lstrip('-')
    halves = {'½': F(1, 2), '¼': F(1, 4), '¾': F(3, 4)}
    for h, v in halves.items():
        if h in tok:
            w = tok.replace(h, '')
            r = (F(w) if w else 0) + v
            return -r if neg else r
    m = re.fullmatch(r'(\d+) (\d+)/(\d+)', tok)
    if m:
        r = F(int(m[1])) + F(int(m[2]), int(m[3]))
    elif '/' in tok:
        a, b = tok.split('/')
        r = F(int(a), int(b))
    else:
        r = F(tok)
    return -r if neg else r


def ev(expr):
    """evaluate an arithmetic expression string exactly (+ - * / ^ parentheses, mixed numbers, a/b as one number)"""
    e = expr.replace('\u00f7', ' DIV ').replace(M, '-').replace('\u00d7', '*').replace('\u20b9', '')

    def tok(m):
        if m[1]:
            return f"(F({m[1]})+F({m[2]},{m[3]}))"
        if m[4]:
            return f"F({m[4]},{m[5]})"
        return f"F('{m[6].replace(',', '')}')"
    e = re.sub(r'(?<![\d.])(\d+) (\d+)/(\d+)|(\d+)/(\d+)|(\d[\d,]*(?:\.\d+)?)', tok, e)
    e = e.replace(' DIV ', '/').replace('^', '**')
    return eval(e, {'__builtins__': {}, 'F': F})


def nums(s):
    """all signed numbers (ints, decimals, fractions a/b as a unit) of a text, in order"""
    s = s.replace(M, '-')
    out = []
    for m in re.finditer(r'(-?\d[\d,]*(?:\.\d+)?(?:/\d+)?)', s):
        out.append(m[1])
    return out


def fnums(s):
    return [val(t) for t in nums(s)]


def txt(x):
    """Fraction -> answer text: integer, 'p/q' or exact decimal when terminating"""
    x = F(x)
    if x.denominator == 1:
        return str(x.numerator)
    return f'{x.numerator}/{x.denominator}'


def dec(x):
    x = F(x)
    d = x.denominator
    while d % 2 == 0:
        d //= 2
    while d % 5 == 0:
        d //= 5
    if d != 1:
        return None
    if x.denominator == 1:
        return str(x.numerator)
    k = 0
    while (x * 10 ** k).denominator != 1:
        k += 1
    s = str(abs(x.numerator * 10 ** k // x.denominator)).rjust(k + 1, '0')
    s = s[:-k] + '.' + s[-k:]
    return ('-' if x < 0 else '') + s
