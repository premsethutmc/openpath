"""Independent exact oracle + notation renderer for the E6 corpus. Never imports or calls OpenPath code (SymPy/mpmath are unavailable).

Reuses only the E5 oracle's private pieces (expression parser, Decimal(70) evaluator, own differentiator). Everything here is new:
  * a pretty-printer from the oracle AST to four student surface styles (plain / implicit / unicode / latex), so the text a student
    "wrote" is generated from the same AST the oracle judges (no text-vs-claim drift);
  * calculus claim judging with definitions, derivative members, unevaluated-integral members (judged through their x-derivative),
    definite-integral chains, and limits (one/two sided, numeric at 1e-25 with exact rational cross-check where the member is rational);
  * exact rational / Gaussian-rational number-chain judging for probability, counting and complex arithmetic.
Limitations (disclosed in the report): numeric equality of transcendental members is decided at >= 8 rational sample points with a 1e-35
tolerance in 70-digit arithmetic; this is overwhelming evidence, not a proof. Limits of non-rational members are decided numerically.
"""
import re, sys, os
from fractions import Fraction as F
from decimal import Decimal, getcontext
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "geocalc-e5"))
import e5_oracle as O
from e5_oracle import parse, ev, diff, same_function, Undef, TOL, SAMPLES, C

getcontext().prec = 70

# ------------------------------------------------------------------------------------------------ expression helpers
def X(s):
    """parse an oracle-syntax expression ('e^x' is accepted as exp(x))."""
    s = re.sub(r"\be\^\(([^()]*(?:\([^()]*\)[^()]*)*)\)", r"exp(\1)", s)
    s = re.sub(r"\be\^([A-Za-z0-9]+)", r"exp(\1)", s)
    return _fold(parse(s))

def _cexp(e):
    """exact Fraction value of a constant-only exponent expression (c, neg, + - * /), else None."""
    k = e[0]
    if k == "c": return F(e[1])
    if k == "neg":
        a = _cexp(e[1]); return None if a is None else -a
    if k in ("+", "-", "*", "/"):
        a, b = _cexp(e[1]), _cexp(e[2])
        if a is None or b is None: return None
        if k == "/": return None if b == 0 else a / b
        return a + b if k == "+" else a - b if k == "-" else a * b
    return None

def _fold(e):
    """fold a negated constant exponent: x^(-3) parses as ('^', x, ('neg', 3)) -> ('^', x, -3)."""
    if not isinstance(e, tuple): return e
    if e[0] in ("c", "pi", "x"): return e
    if e[0] == "^":
        q = _cexp(e[2])
        if q is not None: return ("^", _fold(e[1]), ("c", q))
    return (e[0],) + tuple(_fold(a) if isinstance(a, tuple) else a for a in e[1:])

def subst(e, env, keep=()):
    """replace variable nodes by their definitions (recursively); names in `keep` stay symbolic."""
    k = e[0]
    if k == "x":
        if e[1] in env and e[1] not in keep: return subst(env[e[1]], env, keep)
        return e
    if k in ("c", "pi"): return e
    return (k,) + tuple(subst(a, env, keep) if isinstance(a, tuple) else a for a in e[1:])

def has(e, name):
    if e[0] == "x": return e[1] == name
    return any(has(a, name) for a in e[1:] if isinstance(a, tuple))

def diff(e, v):
    """own differentiator: the E5 rules plus abs (d|u| = u/|u| u')."""
    k = e[0]
    if k == "abs": return ("*", ("/", e[1], e), diff(e[1], v))
    if k in ("c", "pi"): return C(0)
    if k == "x": return C(1 if e[1] == v else 0)
    if k == "neg": return ("neg", diff(e[1], v))
    if k == "+": return ("+", diff(e[1], v), diff(e[2], v))
    if k == "-": return ("-", diff(e[1], v), diff(e[2], v))
    if k == "*": return ("+", ("*", diff(e[1], v), e[2]), ("*", e[1], diff(e[2], v)))
    if k == "/": return ("/", ("-", ("*", diff(e[1], v), e[2]), ("*", e[1], diff(e[2], v))), ("^", e[2], C(2)))
    if k == "^":
        b, n = e[1], e[2]
        if n[0] == "c": return ("*", ("*", n, ("^", b, C(n[1] - 1))), diff(b, v))
        raise ValueError("variable exponent")
    if k == "sin": return ("*", ("cos", e[1]), diff(e[1], v))
    if k == "cos": return ("*", ("neg", ("sin", e[1])), diff(e[1], v))
    if k == "tan": return ("*", ("^", ("cos", e[1]), C(-2)), diff(e[1], v))
    if k == "exp": return ("*", ("exp", e[1]), diff(e[1], v))
    if k == "ln": return ("*", ("/", C(1), e[1]), diff(e[1], v))
    if k == "sqrt": return ("*", ("/", C(1), ("*", C(2), ("sqrt", e[1]))), diff(e[1], v))
    raise ValueError(k)

# ------------------------------------------------------------------------------------------------ pretty printer
PREC = {"+": 1, "-": 1, "*": 2, "/": 2, "neg": 3, "^": 4}
SUP = {"0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹", "-": "⁻"}
def num(f):
    return str(f.numerator) if f.denominator == 1 else f"{f.numerator}/{f.denominator}"
def pp(e, mode="plain", ctx=0):
    k = e[0]
    L = mode == "latex"
    def par(s, need): return (r"\left(" + s + r"\right)" if L else "(" + s + ")") if need else s
    if k == "c":
        f = e[1]
        if f.denominator == 1: return (str(f) if f >= 0 else str(f))
        return (rf"\frac{{{abs(f.numerator)}}}{{{f.denominator}}}" if L else f"{f.numerator}/{f.denominator}") if f > 0 else "-" + (rf"\frac{{{abs(f.numerator)}}}{{{f.denominator}}}" if L else f"{abs(f.numerator)}/{f.denominator}")
    if k == "pi": return r"\pi" if L else ("π" if mode == "unicode" else "pi")
    if k == "x": return e[1]
    if k == "neg": return par("-" + pp(e[1], mode, 3), ctx > 3)
    if k in ("+", "-"):
        a = pp(e[1], mode, 1)
        b = pp(e[2], mode, 2 if k == "-" else 1)
        if k == "+" and e[2][0] == "neg": return par(f"{a} - {pp(e[2][1], mode, 3)}", ctx > 1)
        return par(f"{a} {k} {b}", ctx > 1)
    if k == "*":
        a, b = e[1], e[2]
        sa, sb = pp(a, mode, 2), pp(b, mode, 4 if b[0] == "neg" else 3)
        imp = mode in ("implicit", "unicode", "latex")
        # implicit multiplication only when it cannot be misread
        if imp and a[0] == "c" and a[1].denominator == 1 and b[0] in ("x", "sin", "cos", "tan", "exp", "ln", "sqrt", "pi") : return par(sa + (" " if b[0] in ("sin", "cos", "tan", "exp", "ln", "sqrt") and not L else "") + sb, ctx > 2) if not L else par(sa + sb, ctx > 2)
        if imp and a[0] == "c" and a[1].denominator == 1 and b[0] == "^" and b[1][0] == "x": return par(sa + sb, ctx > 2)
        if imp and a[0] == "x" and b[0] == "x" and a[1] != b[1]: return par(sa + sb, ctx > 2)
        if imp and a[0] in ("x", "^", "c") and b[0] in ("sin", "cos", "tan", "exp", "ln", "sqrt") and not (a[0] == "c" and a[1].denominator != 1): return par(sa + (" " if not L else "") + sb, ctx > 2)
        if imp and b[0] in ("+", "-") and a[0] in ("c", "x", "^", "sin", "cos", "tan", "exp", "ln", "sqrt"): return par(sa + "(" + pp(b, mode, 0) + ")" if not L else sa + r"\left(" + pp(b, mode, 0) + r"\right)", ctx > 2)
        op = r" \cdot " if L else (" · " if mode == "unicode" else "*")
        return par(f"{sa}{op}{sb}", ctx > 2)
    if k == "/":
        if L: return par(rf"\frac{{{pp(e[1], mode, 0)}}}{{{pp(e[2], mode, 0)}}}", False)
        return par(f"{pp(e[1], mode, 2)}/{pp(e[2], mode, 3)}", ctx > 2)
    if k == "^":
        b, n = e[1], e[2]
        if L: return par(rf"{pp(b, mode, 5)}^{{{pp(n, mode, 0)}}}", ctx > 4) if b[0] not in ("sin", "cos", "tan") else rf"\{b[0]}^{{{pp(n, mode, 0)}}}{pp(b[1], mode, 5)}"
        if mode == "unicode" and n[0] == "c" and n[1].denominator == 1 and abs(n[1]) < 100 and b[0] in ("x", "c", "pi") :
            return pp(b, mode, 5) + "".join(SUP[c] for c in str(int(n[1])))
        ns = pp(n, mode, 4)
        if n[0] != "c" or n[1].denominator != 1 or n[1] < 0: ns = f"({pp(n, mode, 0)})"
        return par(f"{pp(b, mode, 5)}^{ns}", ctx > 4)
    if k == "exp":
        a = e[1]
        if mode in ("implicit", "unicode") or L:
            inner = pp(a, mode, 0)
            if L: return rf"e^{{{inner}}}"
            return f"e^{inner}" if a[0] in ("x", "c") and (a[0] == "x" or a[1].denominator == 1) else f"e^({inner})"
        return f"exp({pp(a, mode, 0)})"
    if k == "sqrt":
        if L: return rf"\sqrt{{{pp(e[1], mode, 0)}}}"
        return f"√({pp(e[1], mode, 0)})" if mode == "unicode" else f"sqrt({pp(e[1], mode, 0)})"
    if k in ("sin", "cos", "tan", "ln", "abs"):
        a = e[1]
        if L:
            nm = {"ln": r"\ln", "abs": r"\left|"}[k] if k in ("ln", "abs") else "\\" + k
            if k == "abs": return rf"\left|{pp(a, mode, 0)}\right|"
            return rf"{nm}\left({pp(a, mode, 0)}\right)"
        if k == "abs": return f"|{pp(a, mode, 0)}|" if mode == "unicode" else f"abs({pp(a, mode, 0)})"
        return f"{k}({pp(a, mode, 0)})"
    raise ValueError(k)

# ------------------------------------------------------------------------------------------------ calculus judging
def val_fn(e, env_defs, var="x"):
    return subst(e, env_defs)

def eq_fn(a, b, defs, var="x", need=6):
    return same_function(subst(a, defs), subst(b, defs), var, need)

def member_derivative(m, defs, var="x"):
    """x-derivative AST of a member that contains an unevaluated integral or any expression: ('I', integrand, intvar) / plain AST."""
    if m[0] == "I":
        integrand, iv = m[1], m[2]
        g = subst(integrand, defs, keep=(iv,))
        # d/dx of ∫ g(iv) d iv, where iv is either var itself or a defined function of var
        if iv == var: return subst(g, defs)
        phi = defs.get(iv)
        if phi is None: raise ValueError("integration variable undefined")
        return subst(("*", g, diff(subst(phi, defs), var)), defs)
    return diff(subst(m, defs), var)

def _has_var(m):
    return m[0] == "x" or any(_has_var(a) for a in m[1:] if isinstance(a, tuple))
def contains_I(m): return m[0] == "I" or any(contains_I(a) for a in m[1:] if isinstance(a, tuple))

def sum_I(m, defs, var):
    """derivative of an expression whose leaves may include ('I',...) nodes."""
    if not contains_I(m): return diff(subst(m, defs), var)
    if m[0] == "I": return member_derivative(m, defs, var)
    if m[0] in ("c", "pi"): return C(0)
    if m[0] == "x": return diff(subst(m, defs), var)
    if m[0] in ("+", "-"): return (m[0], sum_I(m[1], defs, var), sum_I(m[2], defs, var))
    if m[0] == "neg": return ("neg", sum_I(m[1], defs, var))
    if m[0] == "*":
        if not contains_I(m[1]) and not _has_var(m[1]): return ("*", m[1], sum_I(m[2], defs, var))
        if not contains_I(m[2]) and not _has_var(m[2]): return ("*", sum_I(m[1], defs, var), m[2])
    raise ValueError("unsupported integral combination")

def judge_calc(lines, defs0=None, var="x"):
    """lines: list of claims. Returns list of per-line booleans (True = claim holds / definition accepted)."""
    defs = dict(defs0 or {}); out = []
    for cl in lines:
        k = cl[0]
        if k == "def": defs[cl[1]] = cl[2]; out.append(True)
        elif k == "prose": out.append(True)
        elif k == "eq":        # chain of function identities (members may be ('D', ast, v) / ('I', ...))
            members = cl[1]; ok = True
            has_int = any(contains_I(m) for m in members)
            ds = []
            for m in members:
                if m[0] == "D": ds.append(diff(subst(m[1], defs, keep=(m[2],)), m[2]) if m[2] != var else diff(subst(m[1], defs), var))
                else: ds.append(m)
            for a, b in zip(ds, ds[1:]):
                if has_int:
                    da = sum_I(a, defs, var) if contains_I(a) else diff(subst(a, defs), var)
                    db = sum_I(b, defs, var) if contains_I(b) else diff(subst(b, defs), var)
                    r = same_function(da, db, var, 6)
                else: r = eq_fn(a, b, defs, var)
                if r is not True: ok = False
            out.append(ok)
        elif k == "defint":    # ('defint', integrand, F, lo, hi, value_ast)
            _, g, Fa, lo, hi, vv = cl
            ok1 = same_function(diff(subst(Fa, defs), var), subst(g, defs), var, 6) is True
            ev_lo, ev_hi = ev(subst(Fa, defs), {var: lo}), ev(subst(Fa, defs), {var: hi})
            vtrue = ev_hi - ev_lo; vclaim = ev(vv, {})
            out.append(ok1 and abs(vtrue - vclaim) < TOL * max(1, abs(vtrue)))
        else: raise ValueError(k)
    return out

# ------------------------------------------------------------------------------------------------ limits (numeric, 1e-25 offsets)
def lim_numeric(e, a, side="both", var="x"):
    """returns Fraction-ish Decimal limit, 'inf', '-inf', 'dne'."""
    h = Decimal(10) ** -25
    def at(d):
        return ev(e, {var: (Decimal(a.numerator) / Decimal(a.denominator)) + d})
    try:
        if side == "right": return _norm(at(h), at(h * 2))
        if side == "left": return _norm(at(-h), at(-h * 2))
        r, l = _norm(at(h), at(h * 2)), _norm(at(-h), at(-h * 2))
        return r if (r == l or (isinstance(r, Decimal) and isinstance(l, Decimal) and abs(r - l) < Decimal(10) ** -15)) else "dne"
    except Undef: return "undef"
def _norm(v1, v2):
    if abs(v1) > Decimal(10) ** 12: return "inf" if v1 > 0 else "-inf"
    return v1

def lim_at_infinity(e, sign=1, var="x"):
    big = Decimal(10) ** 30 * sign
    v1, v2 = ev(e, {var: big}), ev(e, {var: big * 2})
    if abs(v1) > Decimal(10) ** 12: return "inf" if v1 > 0 else "-inf"
    return v1

# ------------------------------------------------------------------------------------------------ exact number chains (Q and Q(i))
class G:
    """Gaussian rational a+bi with exact Fraction parts (real numbers are the b=0 case)."""
    __slots__ = ("a", "b")
    def __init__(s, a=0, b=0): s.a, s.b = F(a), F(b)
    def __add__(s, o): return G(s.a + o.a, s.b + o.b)
    def __sub__(s, o): return G(s.a - o.a, s.b - o.b)
    def __mul__(s, o): return G(s.a * o.a - s.b * o.b, s.a * o.b + s.b * o.a)
    def __truediv__(s, o):
        n = o.a * o.a + o.b * o.b
        if n == 0: raise ZeroDivisionError
        return G((s.a * o.a + s.b * o.b) / n, (s.b * o.a - s.a * o.b) / n)
    def __neg__(s): return G(-s.a, -s.b)
    def __eq__(s, o): return s.a == o.a and s.b == o.b
    def conj(s): return G(s.a, -s.b)
    def norm(s): return s.a * s.a + s.b * s.b
    def ipow(s, n):
        if n < 0: return G(1) / s.ipow(-n)
        r = G(1)
        for _ in range(n): r = r * s
        return r
    def __repr__(s): return f"{s.a}+{s.b}i"

def isqrt_exact(f):
    """exact sqrt of a nonnegative Fraction when rational, else None."""
    import math
    if f < 0: return None
    n, d = f.numerator, f.denominator
    rn, rd = math.isqrt(n), math.isqrt(d)
    return F(rn, rd) if rn * rn == n and rd * rd == d else None

def nev(t, env):
    """evaluate a token tree produced by NP (below) to G."""
    k = t[0]
    if k == "n": return G(t[1])
    if k == "i": return G(0, 1)
    if k == "v":
        if t[1] not in env: raise KeyError(t[1])
        return env[t[1]]
    if k == "neg": return -nev(t[1], env)
    if k == "+": return nev(t[1], env) + nev(t[2], env)
    if k == "-": return nev(t[1], env) - nev(t[2], env)
    if k == "*": return nev(t[1], env) * nev(t[2], env)
    if k == "/": return nev(t[1], env) / nev(t[2], env)
    if k == "^":
        n = nev(t[2], env)
        if n.b != 0 or n.a.denominator != 1 or abs(n.a) > 4000: raise ValueError("bad exponent")
        return nev(t[1], env).ipow(int(n.a))
    if k == "conj": return nev(t[1], env).conj()
    if k == "abs2": return G(nev(t[1], env).norm())
    if k == "fact":
        import math
        v = nev(t[1], env)
        if v.b != 0 or v.a.denominator != 1 or v.a < 0 or v.a > 200: raise ValueError("bad factorial")
        return G(math.factorial(int(v.a)))
    if k in ("C", "Pm"):
        import math
        n, r = nev(t[1], env), nev(t[2], env)
        if n.b or r.b or n.a.denominator != 1 or r.a.denominator != 1 or r.a < 0 or n.a < 0: raise ValueError("bad nCr")
        n, r = int(n.a), int(r.a)
        if r > n: return G(0)
        return G(math.comb(n, r) if k == "C" else math.perm(n, r))
    if k == "mod": return _modv(t, env)
    if k == "sqrt":
        v = nev(t[1], env)
        if v.b != 0: raise ValueError("complex sqrt")
        if v.a < 0:
            r = isqrt_exact(-v.a)
            if r is None: raise ValueError("irrational")
            return G(0, r)
        r = isqrt_exact(v.a)
        if r is None: raise ValueError("irrational")
        return G(r)
    if k == "modulus":
        v = nev(t[1], env); r = isqrt_exact(v.norm())
        if r is None: raise ValueError("irrational modulus")
        return G(r)
    raise ValueError(k)

def number_chain_ok(members, env):
    """members: list of token trees; all must evaluate to the same exact G."""
    vals = [nev(m, env) for m in members]
    return all(v == vals[0] for v in vals[1:])

# ------------------------------------------------------------------------------------------------ number-expression syntax (oracle side)
NTOK = re.compile(r"\s*(?:(\d+(?:\.\d+)?)|(conj|fact|C|Pm|sqrt|mod|abs2)(?=\()|([A-Za-z][A-Za-z0-9_]*)|(\^|[()+\-*/,!]))")
def ntokenize(s):
    out, i = [], 0
    while i < len(s):
        if s[i].isspace(): i += 1; continue
        m = NTOK.match(s, i)
        if not m: raise ValueError(f"bad number syntax at {s[i:]!r}")
        i = m.end()
        out.append(("n", m.group(1)) if m.group(1) else ("f", m.group(2)) if m.group(2) else ("v", m.group(3)) if m.group(3) else ("o", m.group(4)))
    return out
class NP:
    def __init__(s, t): s.t, s.i = ntokenize(t), 0
    def pk(s): return s.t[s.i] if s.i < len(s.t) else (None, None)
    def eat(s): v = s.t[s.i]; s.i += 1; return v
    def expr(s):
        v = s.term()
        while s.pk() in (("o", "+"), ("o", "-")): op = s.eat()[1]; v = (op, v, s.term())
        return v
    def term(s):
        v = s.un()
        while s.pk() in (("o", "*"), ("o", "/")): op = s.eat()[1]; v = (op, v, s.un())
        return v
    def un(s):
        if s.pk() == ("o", "-"): s.eat(); return ("neg", s.un())
        return s.pw()
    def pw(s):
        b = s.at()
        if s.pk() == ("o", "^"):
            s.eat()
            if s.pk() == ("o", "-"): s.eat(); e = ("neg", s.at())
            else: e = s.at()
            return ("^", b, e)
        return b
    def at(s):
        k, v = s.eat()
        if k == "n": r = ("n", F(v))
        elif k == "v": r = ("i",) if v == "i" else ("v", v)
        elif k == "f":
            s.eat(); args = [s.expr()]
            while s.pk() == ("o", ","): s.eat(); args.append(s.expr())
            s.eat(); r = (v, *args)
        elif (k, v) == ("o", "("):
            r = s.expr(); s.eat()
        else: raise ValueError("unexpected " + str(v))
        while s.pk() == ("o", "!"): s.eat(); r = ("fact", r)
        return r
def NX(s):
    p = NP(s); t = p.expr()
    if p.i != len(p.t): raise ValueError("trailing in " + s)
    return t

def ppn(t, mode="plain", names=None, ctx=0):
    """print a number tree. names: internal-name -> surface text (e.g. PA -> P(A))."""
    names = names or {}
    k = t[0]
    def par(s, need): return "(" + s + ")" if need else s
    L = mode == "latex"
    if k == "n":
        f = t[1]
        return str(f.numerator) if f.denominator == 1 else (rf"\frac{{{f.numerator}}}{{{f.denominator}}}" if L else f"{f.numerator}/{f.denominator}")
    if k == "i": return "i"
    if k == "v": return names.get(t[1], t[1])
    if k == "neg":
        inner = ppn(t[1], mode, names, 3)
        return par("-" + (f"({inner})" if inner.startswith("-") else inner), ctx > 3)
    if k in ("+", "-"):
        return par(f"{ppn(t[1], mode, names, 1)} {k} {ppn(t[2], mode, names, 2 if k == '-' else 1)}", ctx > 1)
    if k == "*":
        imp = mode != "plain" and ((t[2][0] in ("^", "fact", "C", "Pm", "i", "v", "conj") or ppn(t[2], mode, names, 3).startswith("(")) and t[1][0] in ("n", "^", "v", "C", "fact", "+", "-", "/", "conj", "i"))
        if imp and not (t[1][0] == "n" and t[2][0] == "n") and not (t[2][0] == "n") and not re.match(r"\d|\\frac", ppn(t[2], mode, names, 3)):
            a, b = ppn(t[1], mode, names, 3), ppn(t[2], mode, names, 3)
            return par(a + b, ctx > 2)
        a, b = ppn(t[1], mode, names, 2), ppn(t[2], mode, names, 4 if t[2][0] == "neg" else 3)
        op = r" \cdot " if L else (" × " if mode == "unicode" else "*")
        return par(f"{a}{op}{b}", ctx > 2)
    if k == "/":
        if L: return rf"\frac{{{ppn(t[1], mode, names, 0)}}}{{{ppn(t[2], mode, names, 0)}}}"
        return par(f"{ppn(t[1], mode, names, 2)}/{ppn(t[2], mode, names, 3)}", ctx > 2)
    if k == "^":
        e = ppn(t[2], mode, names, 4)
        if t[2][0] not in ("n",) or t[2][1].denominator != 1: e = "(" + ppn(t[2], mode, names, 0) + ")"
        if L:
            base = ppn(t[1], mode, names, 5)
            if t[1][0] == "^": base = "(" + base + ")"
            return rf"{base}^{{{ppn(t[2], mode, names, 0)}}}"
        if mode == "unicode" and t[2][0] == "n" and t[2][1].denominator == 1 and t[2][1] >= 0 and t[1][0] in ("n", "i", "v"): return ppn(t[1], mode, names, 5) + "".join(SUP[c] for c in str(int(t[2][1])))
        return par(f"{ppn(t[1], mode, names, 5)}^{e}", ctx > 4)
    if k == "fact":
        a = ppn(t[1], mode, names, 5)
        return f"{a}!" if t[1][0] in ("n", "v") else f"({ppn(t[1], mode, names, 0)})!"
    if k == "C":
        a, b = ppn(t[1], mode, names, 0), ppn(t[2], mode, names, 0)
        return rf"\binom{{{a}}}{{{b}}}" if L else (f"{a}C{b}" if mode == "unicode" and t[1][0] == "n" and t[2][0] == "n" else f"C({a},{b})")
    if k == "Pm":
        a, b = ppn(t[1], mode, names, 0), ppn(t[2], mode, names, 0)
        return f"{a}P{b}" if mode == "unicode" and t[1][0] == "n" and t[2][0] == "n" else f"P({a},{b})"
    if k == "conj": return rf"\overline{{{ppn(t[1], mode, names, 0)}}}" if L else (ppn(t[1], mode, names, 5) + "̄" if mode == "unicode" and t[1][0] in ("v",) else f"conj({ppn(t[1], mode, names, 0)})")
    if k == "abs2": return f"|{ppn(t[1], mode, names, 0)}|^2" if mode != "latex" else rf"\left|{ppn(t[1], mode, names, 0)}\right|^{{2}}"
    if k == "mod": return rf"\left|{ppn(t[1], mode, names, 0)}\right|" if L else f"|{ppn(t[1], mode, names, 0)}|"
    if k == "sqrt": return rf"\sqrt{{{ppn(t[1], mode, names, 0)}}}" if L else (f"√({ppn(t[1], mode, names, 0)})" if mode == "unicode" else f"sqrt({ppn(t[1], mode, names, 0)})")
    raise ValueError(k)

def nev2(t, env):
    """like nev but understands the 'mod' node (|z|) = exact sqrt of the norm when rational."""
    if t[0] == "mod": return nev(("modulus", t[1]), env) if False else _modv(t, env)
    return nev(t, env)
def _modv(t, env):
    v = nev(t[1], env); r = isqrt_exact(v.norm())
    if r is None: raise ValueError("irrational modulus")
    return G(r)


def nevD(t, env):
    """Decimal(70) evaluation of a number tree -> (re, im); used only when an exact (rational) evaluation is impossible (irrational moduli/roots)."""
    k = t[0]
    D = lambda f: Decimal(f.numerator) / Decimal(f.denominator)
    if k == "n": return (D(t[1]), Decimal(0))
    if k == "i": return (Decimal(0), Decimal(1))
    if k == "v": g = env[t[1]]; return (D(g.a), D(g.b))
    if k == "neg": a = nevD(t[1], env); return (-a[0], -a[1])
    if k in ("+", "-"):
        a, b = nevD(t[1], env), nevD(t[2], env); sg = 1 if k == "+" else -1; return (a[0] + sg * b[0], a[1] + sg * b[1])
    if k == "*": a, b = nevD(t[1], env), nevD(t[2], env); return (a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0])
    if k == "/":
        a, b = nevD(t[1], env), nevD(t[2], env); n = b[0] ** 2 + b[1] ** 2
        if n == 0: raise ZeroDivisionError
        return ((a[0] * b[0] + a[1] * b[1]) / n, (a[1] * b[0] - a[0] * b[1]) / n)
    if k == "sqrt":
        a = nevD(t[1], env)
        if a[1] != 0 or a[0] < 0: raise ValueError("complex sqrt")
        return (a[0].sqrt(), Decimal(0))
    if k == "mod": a = nevD(t[1], env); return ((a[0] ** 2 + a[1] ** 2).sqrt(), Decimal(0))
    if k == "conj": a = nevD(t[1], env); return (a[0], -a[1])
    g = nev(t, env); return (D(g.a), D(g.b))   # ^, fact, C, Pm, abs2 are exact

def nchain_ok(members, env):
    """True/False; raises KeyError/ValueError/ZeroDivisionError for unevaluable members."""
    try:
        vals = [nev(m, env) for m in members]
        return all(v == vals[0] for v in vals[1:])
    except ValueError as e:
        if "irrational" not in str(e): raise
        vs = [nevD(m, env) for m in members]
        return all(abs(v[0] - vs[0][0]) < Decimal(10) ** -40 and abs(v[1] - vs[0][1]) < Decimal(10) ** -40 for v in vs[1:])

def is_canonical_real(t):
    import math
    if t[0] == "n": return True
    if t[0] == "neg": return is_canonical_real(t[1])
    if t[0] == "/" and t[1][0] == "n" and t[2][0] == "n":
        a, b = t[1][1], t[2][1]
        return a.denominator == 1 and b.denominator == 1 and b > 1 and math.gcd(int(a), int(b)) == 1
    return False
def _imag_part(t):
    """returns True when t is an imaginary literal: i, -i, k i, (p/q) i"""
    if t[0] == "i": return True
    if t[0] == "neg": return _imag_part(t[1])
    if t[0] == "*" and t[2][0] == "i" and is_canonical_real(t[1]) and not (t[1][0] == "n" and t[1][1] in (1, 0)): return True
    return False
def is_canonical_complex(t):
    if is_canonical_real(t) or _imag_part(t): return True
    if t[0] in ("+", "-"):
        a, b = t[1], t[2]
        return (is_canonical_real(a) and _imag_part(b)) or (_imag_part(a) and is_canonical_real(b) and False)
    return False
def is_canonical_surd(t):
    """integer, reduced fraction, or sqrt(squarefree n) / k*sqrt(n)"""
    if is_canonical_real(t): return True
    def sqf(n):
        n = int(n)
        d = 2
        while d * d <= n:
            if n % (d * d) == 0: return False
            d += 1
        return n > 1
    if t[0] == "sqrt" and t[1][0] == "n" and t[1][1].denominator == 1 and sqf(t[1][1]): return True
    if t[0] == "*" and t[1][0] == "n" and t[1][1].denominator == 1 and t[2][0] == "sqrt" and is_canonical_surd(t[2]): return True
    return False
