"""Independent exact oracle for the E5 corpus. Never imports or calls OpenPath code (SymPy is unavailable offline).

  * linear angle algebra: exact Fraction row reduction (span membership / satisfiability);
  * coordinate geometry: exact Fraction arithmetic, line values parsed by a private expression parser;
  * calculus: a private differentiator over its own AST; equality is decided by evaluation at many rational points with
    Decimal(60) arithmetic and a 1e-35 tolerance (transcendental functions via series); polynomial facts are exact Fractions;
  * limits: exact polynomial arithmetic over Q (gcd cancellation) and degree comparison.
"""
import re
from fractions import Fraction as F
from decimal import Decimal, getcontext
getcontext().prec = 70
TOL = Decimal(10) ** -35

# ----------------------------------------------------------------------------------------------------- expression parser
TOK = re.compile(r"\s*(?:(\d+(?:\.\d+)?)|(sin|cos|tan|exp|ln|sqrt|abs)|(pi)|([A-Za-z])|(\^|[()+\-*/]))")
def tokenize(s):
    s = s.replace("×", "*").replace("−", "-").replace("·", "*"); out, i = [], 0
    while i < len(s):
        if s[i].isspace(): i += 1; continue
        m = TOK.match(s, i)
        if not m: raise ValueError(f"bad char {s[i]!r} in {s!r}")
        i = m.end()
        out.append(("n", m.group(1)) if m.group(1) else ("f", m.group(2)) if m.group(2) else ("p", "pi") if m.group(3) else ("v", m.group(4)) if m.group(4) else ("o", m.group(5)))
    return out

class P:
    def __init__(s, t): s.t, s.i = t, 0
    def peek(s): return s.t[s.i] if s.i < len(s.t) else (None, None)
    def eat(s): v = s.t[s.i]; s.i += 1; return v
    def prim_start(s):
        k, v = s.peek(); return k in ("n", "v", "f", "p") or (k == "o" and v == "(")
    def expr(s):
        v = s.term()
        while s.peek() in (("o", "+"), ("o", "-")):
            op = s.eat()[1]; v = (op, v, s.term())
        return v
    def term(s):
        v = s.unary()
        while True:
            k, p = s.peek()
            if (k, p) in (("o", "*"), ("o", "/")): s.eat(); v = (p, v, s.unary())
            elif s.prim_start(): v = ("*", v, s.unary())
            else: return v
    def unary(s):
        if s.peek() == ("o", "-"): s.eat(); return ("neg", s.unary())
        if s.peek() == ("o", "+"): s.eat(); return s.unary()
        return s.power()
    def power(s):
        b = s.primary()
        if s.peek() == ("o", "^"):
            s.eat(); neg = False
            if s.peek() == ("o", "-"): s.eat(); neg = True
            k, v = s.eat()
            if (k, v) == ("o", "("):
                e = s.expr(); s.eat(); n = e
            else: n = ("c", F(-int(v) if neg else int(v)))
            if neg and n[0] != "c": n = ("neg", n)
            return ("^", b, n)
        return b
    def primary(s):
        k, v = s.eat()
        if k == "n": return ("c", F(v))
        if k == "v": return ("x", v)
        if k == "p": return ("pi",)
        if k == "f":
            if s.peek() == ("o", "("): s.eat(); e = s.expr(); s.eat(); return (v, e)
            return (v, s.unary())
        if (k, v) == ("o", "("):
            e = s.expr(); s.eat(); return e
        raise ValueError(f"unexpected {v}")

def parse(s):
    p = P(tokenize(s)); e = p.expr()
    if p.i != len(p.t): raise ValueError("trailing: " + s)
    return e

# ----------------------------------------------------------------------------------------------------- Decimal functions
def d_pi():
    getcontext().prec += 5
    # Machin
    def arctan_inv(n):
        x = Decimal(1) / n; t = x; s = x; k = 1; n2 = n * n
        while abs(t) > Decimal(10) ** -(getcontext().prec + 2):
            t = -t / n2; k += 2; s += t / k
        return s
    r = 4 * (4 * arctan_inv(5) - arctan_inv(239)); getcontext().prec -= 5; return +r
PI = d_pi()
def d_sin(x):
    x = x % (2 * PI)
    if x > PI: x -= 2 * PI
    t = x; s = x; k = 1
    while abs(t) > Decimal(10) ** -(getcontext().prec + 3):
        t = -t * x * x / ((k + 1) * (k + 2)); k += 2; s += t
    return s
def d_cos(x): return d_sin(x + PI / 2)

class Undef(Exception): pass
def ev(e, env):
    k = e[0]
    if k == "c": return Decimal(e[1].numerator) / Decimal(e[1].denominator)
    if k == "pi": return PI
    if k == "x":
        if e[1] not in env: raise Undef
        v = env[e[1]]; return v if isinstance(v, Decimal) else Decimal(v.numerator) / Decimal(v.denominator)
    if k == "neg": return -ev(e[1], env)
    if k == "+": return ev(e[1], env) + ev(e[2], env)
    if k == "-": return ev(e[1], env) - ev(e[2], env)
    if k == "*": return ev(e[1], env) * ev(e[2], env)
    if k == "/":
        d = ev(e[2], env)
        if abs(d) < TOL: raise Undef
        return ev(e[1], env) / d
    if k == "^":
        b = ev(e[1], env); n = ev(e[2], env)
        if n == n.to_integral_value():
            n = int(n)
            if n < 0 and abs(b) < TOL: raise Undef
            return b ** n
        if b <= 0: raise Undef
        return (n * b.ln()).exp()
    if k == "sin": return d_sin(ev(e[1], env))
    if k == "cos": return d_cos(ev(e[1], env))
    if k == "tan":
        a = ev(e[1], env); c = d_cos(a)
        if abs(c) < TOL: raise Undef
        return d_sin(a) / c
    if k == "exp": return ev(e[1], env).exp()
    if k == "ln":
        a = ev(e[1], env)
        if a <= 0: raise Undef
        return a.ln()
    if k == "sqrt":
        a = ev(e[1], env)
        if a < 0: raise Undef
        return a.sqrt()
    if k == "abs": return abs(ev(e[1], env))
    raise ValueError(k)

# ----------------------------------------------------------------------------------------------------- differentiation (own rules)
C = lambda n: ("c", F(n))
def diff(e, v):
    k = e[0]
    if k in ("c", "pi"): return C(0)
    if k == "x": return C(1 if e[1] == v else 0)
    if k == "neg": return ("neg", diff(e[1], v))
    if k == "+": return ("+", diff(e[1], v), diff(e[2], v))
    if k == "-": return ("-", diff(e[1], v), diff(e[2], v))
    if k == "*": return ("+", ("*", diff(e[1], v), e[2]), ("*", e[1], diff(e[2], v)))
    if k == "/": return ("/", ("-", ("*", diff(e[1], v), e[2]), ("*", e[1], diff(e[2], v))), ("^", e[2], C(2)))
    if k == "^":
        b, n = e[1], e[2]
        if n[0] == "c":  # constant exponent: chain rule
            return ("*", ("*", n, ("^", b, C(n[1] - 1))), diff(b, v))
        raise ValueError("variable exponent")
    if k == "sin": return ("*", ("cos", e[1]), diff(e[1], v))
    if k == "cos": return ("*", ("neg", ("sin", e[1])), diff(e[1], v))
    if k == "tan": return ("*", ("^", ("cos", e[1]), C(-2)), diff(e[1], v))
    if k == "exp": return ("*", ("exp", e[1]), diff(e[1], v))
    if k == "ln": return ("*", ("/", C(1), e[1]), diff(e[1], v))
    if k == "sqrt": return ("*", ("/", C(1), ("*", C(2), ("sqrt", e[1]))), diff(e[1], v))
    raise ValueError(k)

SAMPLES = [F(k, 7) for k in (-19, -13, -11, -8, -5, -3, -2, 2, 3, 4, 5, 8, 9, 11, 12, 15, 17, 22)] + [F(1, 3), F(2, 5), F(3, 4), F(7, 6), F(5, 9), F(13, 10)]
def same_function(a, b, var="x", need=8):
    """True if a and b agree at >= need sample points where both are defined, and never disagree. None if too few common points."""
    good = 0
    for s in SAMPLES:
        env = {var: s}
        try: va, vb = ev(a, env), ev(b, env)
        except (Undef, ZeroDivisionError, ArithmeticError): continue
        except Exception: continue
        if abs(va - vb) > TOL * max(Decimal(1), abs(va)): return False
        good += 1
    return True if good >= need else None

# ----------------------------------------------------------------------------------------------------- polynomials over Q
def pmul(a, b):
    out = [F(0)] * (len(a) + len(b) - 1)
    for i, x in enumerate(a):
        for j, y in enumerate(b): out[i + j] += x * y
    return out
def padd(a, b): n = max(len(a), len(b)); return [(a[i] if i < len(a) else 0) + (b[i] if i < len(b) else 0) for i in range(n)]
def ptrim(a):
    a = list(a)
    while len(a) > 1 and a[-1] == 0: a.pop()
    return a
def peval(a, x): r = F(0); [r := r * x + c for c in reversed(a)]; return r
def pdivmod(a, b):
    a, b = ptrim(a), ptrim(b); q = [F(0)] * max(1, len(a) - len(b) + 1); r = list(a)
    while len(r) >= len(b) and any(r):
        c = r[-1] / b[-1]; sh = len(r) - len(b); q[sh] = c
        for i, y in enumerate(b): r[sh + i] -= c * y
        r = ptrim(r[:-1] if r[-1] == 0 else r)
        if len(r) < len(b): break
    return ptrim(q), ptrim(r)
def pgcd(a, b):
    a, b = ptrim(a), ptrim(b)
    while any(b):
        _, r = pdivmod(a, b); a, b = b, r
    return [c / a[-1] for c in a]

def finite_limit_at(num, den, a):
    """Exact two-sided analysis of num/den at x=a (polynomials). Returns ('finite', value) | ('dne',) | ('inf', sign)."""
    num, den = ptrim(num), ptrim(den)
    while peval(den, a) == 0 and peval(num, a) == 0:
        # cancel one factor (x-a) exactly
        lin = [-a, F(1)]; num, _ = pdivmod(num, lin); den, _ = pdivmod(den, lin)
    d = peval(den, a); n = peval(num, a)
    if d != 0: return ("finite", n / d)
    if n == 0: return ("finite", F(0))
    return ("inf-or-dne",)

def one_sided_sign(num, den, a, side):
    """Sign of num/den just right (+1) or left (-1) of a once common factors are removed; assumes den(a)=0, num(a)!=0."""
    eps = F(1, 10 ** 6) * side
    x = a + eps
    n, d = peval(num, x), peval(den, x)
    return 1 if (n / d) > 0 else -1
