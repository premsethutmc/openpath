"""Independent exact-oracle for the E4 corpus. Never imports or calls OpenPath code.
SymPy is not installable in this offline environment (no PyPI route), so the oracle is built on Fractions and
80-digit Decimals with its own parser:
  * single-variable lines: truth sets over a finite universe U of exact rationals (k/24) plus every designed candidate
    (roots, extraneous roots, surds); a dense float sign-change scan rejects any case whose equations have a real root that U cannot see;
  * systems: exact Fraction Gaussian elimination; a line is judged by evaluating it on sample points of the solution space.
"""
import re
from fractions import Fraction as F
from decimal import Decimal, getcontext
getcontext().prec = 80
TOL = Decimal(10) ** -45

# ----------------------------------------------------------------------------- expression parser (own implementation)
TOK = re.compile(r"\s*(?:(\d+(?:\.\d+)?)|(sqrt|abs)|([A-Za-z])|(\^|[()+\-*/|]))")
def tokenize(s):
    s = s.replace("×", "*").replace("−", "-")
    out, i = [], 0
    while i < len(s):
        if s[i].isspace(): i += 1; continue
        m = TOK.match(s, i)
        if not m: raise ValueError(f"bad char {s[i]!r} in {s!r}")
        i = m.end()
        out.append(("n", m.group(1)) if m.group(1) else ("f", m.group(2)) if m.group(2) else ("v", m.group(3)) if m.group(3) else ("o", m.group(4)))
    return out

class Parser:
    def __init__(s, t): s.t, s.i = t, 0
    def peek(s): return s.t[s.i] if s.i < len(s.t) else (None, None)
    def eat(s): v = s.t[s.i]; s.i += 1; return v
    def starts_primary(s):
        k, v = s.peek(); return k in ("n", "v", "f") or (k == "o" and v == "(")
    def expr(s):
        v = s.term()
        while s.peek() in (("o", "+"), ("o", "-")):
            op = s.eat()[1]; w = s.term(); v = ("+" if op == "+" else "-", v, w)
        return v
    def term(s):
        v = s.unary()
        while True:
            k, p = s.peek()
            if (k, p) in (("o", "*"), ("o", "/")):
                s.eat(); w = s.unary(); v = (p, v, w)
            elif s.starts_primary(): w = s.unary(); v = ("*", v, w)
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
            if k == "o" and v == "(":
                e = s.expr(); s.eat(); n = ("expr", e)
            else: n = ("num", int(v))
            if n[0] == "num": return ("^", b, -n[1] if neg else n[1])
            raise ValueError("non-integer exponent")
        return b
    def primary(s):
        k, v = s.eat()
        if k == "n": return ("c", F(v))
        if k == "v": return ("x", v)
        if k == "f":
            s.eat(); e = s.expr(); s.eat(); return (v, e)
        if (k, v) == ("o", "("):
            e = s.expr(); s.eat(); return e
        raise ValueError(f"unexpected {v}")

def parse(s):
    p = Parser(tokenize(s)); e = p.expr()
    if p.i != len(p.t): raise ValueError("trailing: " + s)
    return e

def D(x): return Decimal(x.numerator) / Decimal(x.denominator) if isinstance(x, F) else Decimal(x)

class Undef(Exception): pass
def ev(e, env):
    k = e[0]
    if k == "c": return D(e[1])
    if k == "x":
        if e[1] not in env: raise Undef
        v = env[e[1]]; return D(v) if not isinstance(v, Decimal) else v
    if k == "neg": return -ev(e[1], env)
    if k == "+": return ev(e[1], env) + ev(e[2], env)
    if k == "-": return ev(e[1], env) - ev(e[2], env)
    if k == "*": return ev(e[1], env) * ev(e[2], env)
    if k == "/":
        d = ev(e[2], env)
        if abs(d) < TOL: raise Undef
        return ev(e[1], env) / d
    if k == "^":
        b = ev(e[1], env)
        if e[2] >= 0: return b ** e[2]
        if abs(b) < TOL: raise Undef
        return b ** e[2]
    if k == "sqrt":
        a = ev(e[1], env)
        if a < -TOL: raise Undef
        return max(a, Decimal(0)).sqrt()
    if k == "abs": return abs(ev(e[1], env))
    raise ValueError(k)

def variables(e, out=None):
    out = set() if out is None else out
    if e[0] == "x": out.add(e[1])
    elif e[0] in ("c",): pass
    elif e[0] == "^": variables(e[1], out)
    elif e[0] in ("neg", "sqrt", "abs"): variables(e[1], out)
    else:
        for a in e[1:]: variables(a, out)
    return out

# ----------------------------------------------------------------------------- relations / statements
REL = re.compile(r"(<=|>=|!=|≠|=|<|>)")
def split_rel(s):
    m = REL.search(s)
    if not m: return None
    op = m.group(1).replace("≠", "!="); return s[:m.start()].strip(), op, s[m.end():].strip()
def holds(op, a, b):
    d = a - b
    return (abs(d) < TOL) if op == "=" else (abs(d) >= TOL) if op == "!=" else (d < -TOL) if op == "<" else (d <= TOL) if op == "<=" else (d > TOL) if op == ">" else (d >= -TOL)

def line_truth(line, var, U):
    """Truth set (tuple of bools over universe U) of one student line in the variable `var`. Lines: 'A op B', 'x = a or x = b', 'x = a, restriction'."""
    line = line.strip()
    if "±" in line:
        a, b = line_truth(line.replace("±", "+", 1), var, U), line_truth(line.replace("±", "-", 1), var, U)
        return tuple(x or y for x, y in zip(a, b))
    if " or " in line:
        parts = [p.strip() for p in re.split(r"\s+or\s+", line)]
        sets = [line_truth(p, var, U) for p in parts]
        return tuple(any(s[i] for s in sets) for i in range(len(U)))
    rel = split_rel(line.split(",")[0])
    restr = [split_rel(r) for r in line.split(",")[1:]]
    res = []
    for u in U:
        env = {var: u}
        try:
            ok = holds(rel[1], ev(parse(rel[0]), env), ev(parse(rel[2]), env))
            for r in restr: ok = ok and holds(r[1], ev(parse(r[0]), env), ev(parse(r[2]), env))
        except Undef: ok = False
        res.append(ok)
    return tuple(res)

def relation(prev, cur):
    ps, cs = {i for i, v in enumerate(prev) if v}, {i for i, v in enumerate(cur) if v}
    if ps == cs: return "equal"
    if ps < cs: return "widening"
    if cs < ps: return "narrowing"
    return "incomparable"

def make_universe(extras=()):
    U = [F(k, 24) for k in range(-240, 241)]
    seen = {D(u).quantize(Decimal(10) ** -12) for u in U}
    for e in extras:
        key = D(e).quantize(Decimal(10) ** -12)
        if key in seen: continue
        seen.add(key); U.append(e)
    return U

def branch_values(line, var):
    """Closed values written as 'var = expr' (or +/-) in a student line; evaluated exactly to Decimal."""
    out = []
    for part in re.split(r"\s+or\s+", line.split(",")[0]):
        rel = split_rel(part)
        if not rel or rel[1] != "=" or rel[0].strip() != var: continue
        for cand in ([rel[2].replace("±", "+", 1), rel[2].replace("±", "-", 1)] if "±" in rel[2] else [rel[2]]):
            try: out.append(ev(parse(cand), {}))
            except Exception: pass
    return out

def unseen_root_scan(eq_lines, var, U):
    """Reject a case when any equation line has a real sign change that is not at a U point (an unmodelled root)."""
    import math
    pts = [x / 200.0 for x in range(-2400, 2401)]
    Ur = sorted(float(u) for u in U)
    for ln in eq_lines:
        rel = split_rel(ln.split(",")[0])
        if not rel or rel[1] != "=": continue
        a, b = parse(rel[0]), parse(rel[2])
        prev = None
        for x in pts:
            try: f = float(ev(a, {var: Decimal(x)}) - ev(b, {var: Decimal(x)}))
            except Undef: prev = None; continue
            if prev is not None and (prev[1] < 0) != (f < 0) and prev[1] != 0 and f != 0:
                lo, hi = prev[0], x
                if any(lo - 1e-9 <= r <= hi + 1e-9 for r in Ur): prev = (x, f); continue
                flo, fhi = prev[1], f
                try:
                    for _ in range(60):
                        mid = (lo + hi) / 2; fm = float(ev(a, {var: Decimal(mid)}) - ev(b, {var: Decimal(mid)}))
                        if (fm < 0) == (flo < 0): lo, flo = mid, fm
                        else: hi, fhi = mid, fm
                    if abs(fm) < 1e-6: return ln      # a genuine root the universe cannot see
                except Undef: pass                     # sign change across a pole / domain edge, not a root
            prev = (x, f)
    return None


def find_roots(eq_line, var, lo=-12.0, hi=12.0, step=0.005):
    """Real roots (as 80-digit Decimals) of 'A = B' by sign-change scan + Decimal bisection; poles are rejected (|f| does not shrink)."""
    rel = split_rel(eq_line.split(",")[0])
    if not rel or rel[1] != "=": return []
    a, b = parse(rel[0]), parse(rel[2]); out = []
    def f(x): return ev(a, {var: x}) - ev(b, {var: x})
    n = int((hi - lo) / step); prev = None
    for i in range(n + 1):
        x = Decimal(lo + i * step).quantize(Decimal("0.000001"))
        try: fx = f(x)
        except Undef: prev = None; continue
        if prev is not None and (prev[1] < 0) != (fx < 0) and prev[1] != 0:
            l, h, fl = prev[0], x, prev[1]
            try:
                for _ in range(200):
                    m = (l + h) / 2; fm = f(m)
                    if (fm < 0) == (fl < 0): l, fl = m, fm
                    else: h = m
                if abs(f((l + h) / 2)) < Decimal("1e-20"): out.append((l + h) / 2)
            except Undef: pass
        prev = (x, fx)
    return out
