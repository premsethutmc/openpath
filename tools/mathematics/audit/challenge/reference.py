#!/usr/bin/env python3
"""Independent exact reference for the K05.2 challenge suite.

Authority: Python fractions.Fraction plus the polynomial arithmetic in this file.
SymPy is NOT used as an authority (optional cross-check only, see sympy_check()).

The reference never looks at the engine, the generators or the frozen datasets.
It mirrors the grammar of packages/learning/src/reasoner/expr-text.ts:
    sum  := prod (('+'|'-') prod)*
    prod := unary (('*'|'/') unary)*          (left associative)
    unary:= '-' unary | power
    power:= atom ('^' unary)?                  (right associative via unary)
    atom := '(' sum ')' | 'x' | \\d+(\\.\\d+)?
    all whitespace is removed before parsing; no implicit multiplication, no unary '+'.

Usage:
    python3 reference.py "3/(x-2)+1=5/(x-2)"
    python3 reference.py --verify      # re-derive suite.json and brute-force check it
"""
from fractions import Fraction as Fr
import json
import math
import os
import re
import sys


class ParseError(Exception):
    pass


class Undefined(Exception):
    pass


class OutOfGrammar(Exception):
    pass


class Complex(Exception):
    pass


# ---------------------------------------------------------------- polynomials
# list of Fractions, lowest degree first; [] is the zero polynomial.
def trim(p):
    p = list(p)
    while p and p[-1] == 0:
        p.pop()
    return p


def deg(p):
    return len(p) - 1


def padd(a, b):
    n = max(len(a), len(b))
    return trim([(a[i] if i < len(a) else 0) + (b[i] if i < len(b) else 0) for i in range(n)])


def pneg(a):
    return [-c for c in a]


def psub(a, b):
    return padd(a, pneg(b))


def pmul(a, b):
    if not a or not b:
        return []
    r = [Fr(0)] * (len(a) + len(b) - 1)
    for i, x in enumerate(a):
        for j, y in enumerate(b):
            r[i + j] += x * y
    return trim(r)


def pdivmod(a, b):
    a = trim(a)
    b = trim(b)
    if not b:
        raise Undefined("polynomial division by zero")
    q = [Fr(0)] * max(len(a) - len(b) + 1, 0)
    r = list(a)
    while len(r) >= len(b) and r:
        c = r[-1] / b[-1]
        k = len(r) - len(b)
        q[k] = c
        for i, y in enumerate(b):
            r[i + k] -= c * y
        r = trim(r)
    return trim(q), r


def pgcd(a, b):
    a, b = trim(a), trim(b)
    while b:
        a, b = b, pdivmod(a, b)[1]
    return [c / a[-1] for c in a] if a else []


def peval(p, v):
    r = Fr(0)
    for c in reversed(p):
        r = r * v + c
    return r


def pderiv(p):
    return trim([i * c for i, c in enumerate(p)][1:])


def sign(v):
    return (v > 0) - (v < 0)


def sturm_distinct_real(p):
    """Number of distinct real roots of p (exact, Sturm sequence)."""
    p = trim(p)
    if deg(p) < 1:
        return 0
    g = pgcd(p, pderiv(p))
    if deg(g) >= 1:
        p = pdivmod(p, g)[0]
    if deg(p) < 1:
        return 0
    seq = [p, pderiv(p)]
    while True:
        r = pdivmod(seq[-2], seq[-1])[1]
        if not r:
            break
        seq.append(pneg(r))
    B = 1 + max([abs(c / p[-1]) for c in p[:-1]] or [Fr(0)])

    def changes(v):
        s = [sign(peval(q, v)) for q in seq]
        s = [t for t in s if t != 0]
        return sum(1 for a, b in zip(s, s[1:]) if a != b)

    return changes(-B) - changes(B)


def int_poly(p):
    L = 1
    for c in p:
        L = L * c.denominator // math.gcd(L, c.denominator)
    ints = [int(c * L) for c in p]
    g = 0
    for c in ints:
        g = math.gcd(g, c)
    return [c // g for c in ints]


def divisors(n, cap=10 ** 12):
    n = abs(n)
    if n > cap:
        raise OutOfGrammar("coefficient too large to factor")
    fs, d, m = {}, 2, n
    while d * d <= m:
        while m % d == 0:
            fs[d] = fs.get(d, 0) + 1
            m //= d
        d += 1
    if m > 1:
        fs[m] = fs.get(m, 0) + 1
    divs = [1]
    for pr, e in fs.items():
        divs = [dv * pr ** k for dv in divs for k in range(e + 1)]
    return divs


def find_rational_root(p):
    if p[0] == 0:
        return Fr(0)
    ip = int_poly(p)
    d = len(ip) - 1
    if d == 1:
        return Fr(-ip[0], ip[1])
    if d == 2:
        a, b, c = ip[2], ip[1], ip[0]
        disc = b * b - 4 * a * c
        if disc < 0:
            return None
        s = math.isqrt(disc)
        return Fr(-b + s, 2 * a) if s * s == disc else None
    for pp in divisors(ip[0]):
        for q in divisors(ip[-1]):
            for sg in (1, -1):
                r = Fr(sg * pp, q)
                if peval(p, r) == 0:
                    return r
    return None


def split(p):
    """(dict rational_root -> multiplicity, remainder poly with no rational roots)."""
    p = trim(p)
    roots = {}
    while deg(p) >= 1:
        r = find_rational_root(p)
        if r is None:
            break
        p = pdivmod(p, [-r, Fr(1)])[0]
        roots[r] = roots.get(r, 0) + 1
    return roots, p


# ------------------------------------------------------- rational functions
def rf_make(n, d):
    n, d = trim(n), trim(d)
    if not d:
        raise Undefined("zero denominator")
    if not n:
        return ([], [Fr(1)])
    g = pgcd(n, d)
    if deg(g) >= 1:
        n, d = pdivmod(n, g)[0], pdivmod(d, g)[0]
    lc = d[-1]
    return ([c / lc for c in n], [c / lc for c in d])


def rf_add(a, b):
    return rf_make(padd(pmul(a[0], b[1]), pmul(b[0], a[1])), pmul(a[1], b[1]))


def rf_sub(a, b):
    return rf_add(a, (pneg(b[0]), b[1]))


def rf_mul(a, b):
    return rf_make(pmul(a[0], b[0]), pmul(a[1], b[1]))


def rf_inv(a):
    if not a[0]:
        raise Undefined("inverse of zero")
    return rf_make(a[1], a[0])


# ------------------------------------------------------------------- parser
def parse_expr(src):
    s = re.sub(r"\s+", "", src)
    st = {"i": 0}

    def peek():
        return s[st["i"]] if st["i"] < len(s) else None

    def fail(m):
        raise ParseError('parse error at %d in "%s": %s' % (st["i"], src, m))

    def sum_():
        l = prod()
        while peek() in ("+", "-"):
            op = s[st["i"]]
            st["i"] += 1
            r = prod()
            l = ("add" if op == "+" else "sub", l, r)
        return l

    def prod():
        l = unary()
        while peek() in ("*", "/"):
            op = s[st["i"]]
            st["i"] += 1
            r = unary()
            l = ("mul" if op == "*" else "div", l, r)
        return l

    def unary():
        if peek() == "-":
            st["i"] += 1
            return ("neg", unary())
        return power()

    def power():
        b = atom()
        if peek() == "^":
            st["i"] += 1
            return ("pow", b, unary())
        return b

    def atom():
        c = peek()
        if c == "(":
            st["i"] += 1
            e = sum_()
            if peek() != ")":
                fail("expected )")
            st["i"] += 1
            return e
        if c == "x":
            st["i"] += 1
            return ("x",)
        m = re.match(r"\d+(\.\d+)?", s[st["i"]:])
        if not m:
            fail("unexpected token")
        st["i"] += len(m.group(0))
        return ("num", Fr(m.group(0)))

    e = sum_()
    if st["i"] != len(s):
        fail("trailing input")
    return e


def parse_equation(text):
    parts = text.split("=")
    if len(parts) != 2:
        raise ParseError("expected exactly one '=' (got %d)" % (len(parts) - 1))
    if not parts[0].strip() or not parts[1].strip():
        raise ParseError("empty side")
    return parse_expr(parts[0]), parse_expr(parts[1])


def has_x(a):
    return a[0] == "x" or (a[0] not in ("num", "x") and any(has_x(c) for c in a[1:] if isinstance(c, tuple)))


# ---------------------------------------------------------------- evaluator
class Ctx:
    def __init__(self):
        self.excl = []      # polynomials that must be nonzero (read from the unevaluated tree)
        self.flags = set()


def const_int(rf):
    if deg(rf[0]) > 0 or deg(rf[1]) > 0:
        raise OutOfGrammar("variable exponent")
    v = (rf[0][0] if rf[0] else Fr(0)) / rf[1][0]
    if v.denominator != 1:
        raise OutOfGrammar("non-integer exponent")
    return int(v)


def ev(a, ctx):
    k = a[0]
    if k == "num":
        return rf_make([a[1]], [Fr(1)])
    if k == "x":
        return ([Fr(0), Fr(1)], [Fr(1)])
    if k == "neg":
        n, d = ev(a[1], ctx)
        return (pneg(n), d)
    if k in ("add", "sub", "mul"):
        l, r = ev(a[1], ctx), ev(a[2], ctx)
        return {"add": rf_add, "sub": rf_sub, "mul": rf_mul}[k](l, r)
    if k == "div":
        l, r = ev(a[1], ctx), ev(a[2], ctx)
        if not r[0]:
            raise Undefined("division by an expression that is identically zero")
        if deg(r[0]) >= 1:
            ctx.excl.append(r[0])
        return rf_mul(l, rf_inv(r))
    if k == "pow":
        base = ev(a[1], ctx)
        e = const_int(ev(a[2], Ctx()))
        if abs(e) > 200:
            raise OutOfGrammar("exponent too large")
        if e == 0:
            if has_x(a[1]):
                ctx.flags.add("x^0")
            return rf_make([Fr(1)], [Fr(1)])
        if e < 0:
            if not base[0]:
                raise Undefined("zero to a negative power")
            if deg(base[0]) >= 1:
                ctx.excl.append(base[0])
            base = rf_inv(base)
            e = -e
        out = rf_make([Fr(1)], [Fr(1)])
        for _ in range(e):
            out = rf_mul(out, base)
        return out
    raise AssertionError(k)


def eval_at(a, v):
    """Direct exact evaluation at x=v; None when some operation is undefined."""
    k = a[0]
    if k == "num":
        return a[1]
    if k == "x":
        return v
    if k == "neg":
        t = eval_at(a[1], v)
        return None if t is None else -t
    if k == "pow":
        b, e = eval_at(a[1], v), eval_at(a[2], v)
        if b is None or e is None or e.denominator != 1:
            return None
        e = int(e)
        if e == 0:
            return Fr(1)
        if b == 0 and e < 0:
            return None
        return b ** e
    l, r = eval_at(a[1], v), eval_at(a[2], v)
    if l is None or r is None:
        return None
    if k == "add":
        return l + r
    if k == "sub":
        return l - r
    if k == "mul":
        return l * r
    if k == "div":
        return None if r == 0 else l / r
    raise AssertionError(k)


# --------------------------------------------------------- the exact solver
def fmt(r):
    return str(r.numerator) if r.denominator == 1 else "%d/%d" % (r.numerator, r.denominator)


def solve(text):
    """Ground truth by exact reduction.  Returns a dict; 'status' is ok / parse-error /
    undefined / out-of-grammar."""
    try:
        L, R = parse_equation(text)
    except ParseError as e:
        return {"status": "parse-error", "error": str(e)}
    ctx = Ctx()
    try:
        F = rf_sub(ev(L, ctx), ev(R, ctx))
    except Undefined as e:
        return {"status": "undefined", "error": str(e)}
    except OutOfGrammar as e:
        return {"status": "out-of-grammar", "error": str(e)}
    uniq = []
    for p in ctx.excl:
        if p not in uniq:
            uniq.append(p)
    X, irr_excl, nonsplit = set(), 0, []
    for p in uniq:
        roots, rem = split(p)
        X |= set(roots)
        if deg(rem) >= 1:
            irr_excl += sturm_distinct_real(rem)
            nonsplit.append(p)
    n, d = F
    res = {"status": "ok", "L": L, "R": R, "F": F, "excl_polys": uniq, "excluded": sorted(X),
           "irrational_excluded": irr_excl, "nonsplit_excl": nonsplit, "flags": set(ctx.flags),
           "num_degree": deg(n), "den_degree": deg(d)}
    if deg(n) <= 1:
        if not n:
            res.update(cls="identity-on-domain", solution=[])
        elif deg(n) == 0:
            res.update(cls="none", solution=[])
        else:
            r = -n[0] / n[1]
            res.update(cls="none" if r in X else "unique", solution=[] if r in X else [r])
    else:
        roots, rem = split(n)
        rats = sorted(r for r in roots if r not in X)
        res.update(cls="degree>=2", solution=rats,
                   irrational_real_roots=sturm_distinct_real(rem) if deg(rem) >= 1 else 0)
    return res


# -------------------------------------------------------------- scope logic
def flatten(a, sg=1):
    k = a[0]
    if k == "add":
        return flatten(a[1], sg) + flatten(a[2], sg)
    if k == "sub":
        return flatten(a[1], sg) + flatten(a[2], -sg)
    if k == "neg":
        return flatten(a[1], -sg)
    return [(sg, a)]


def has_xdiv(a):
    k = a[0]
    if k == "div" and has_x(a[2]):
        return True
    if k == "pow":
        try:
            e = const_int(ev(a[2], Ctx()))
        except (OutOfGrammar, Undefined):
            return True
        if e < 0 and has_x(a[1]):
            return True
    return any(has_xdiv(c) for c in a[1:] if isinstance(c, tuple))


def nd(a, ctx):
    """Written numerator / denominator factor lists of a product-quotient term."""
    k = a[0]
    if k == "num":
        return [[a[1]]] if a[1] != 0 else [[]], []
    if k == "x":
        return [[Fr(0), Fr(1)]], []
    if k == "neg":
        return nd(a[1], ctx)
    if k in ("add", "sub"):
        if has_xdiv(a):
            raise Complex("a grouped sum that contains a fraction in x is used as a factor")
        return [ev(a, Ctx())[0]], []
    if k == "mul":
        n1, d1 = nd(a[1], ctx)
        n2, d2 = nd(a[2], ctx)
        return n1 + n2, d1 + d2
    if k == "div":
        n1, d1 = nd(a[1], ctx)
        n2, d2 = nd(a[2], ctx)
        if any(deg(p) >= 1 for p in d2):
            raise Complex("a fraction in x appears inside a denominator (nested denominator)")
        return n1 + d2, d1 + n2
    if k == "pow":
        e = const_int(ev(a[2], Ctx()))
        if not has_x(a[1]):
            return [ev(a, Ctx())[0]], []
        if e < 0:
            raise Complex("negative exponent on x-containing base (denominator not written with '/')")
        if e == 0:
            ctx.flags.add("x^0")
            return [[Fr(1)]], []
        n1, d1 = nd(a[1], ctx)
        return n1 * e, d1 * e
    raise AssertionError(k)


def prod_polys(fs):
    r = [Fr(1)]
    for f in fs:
        r = pmul(r, f)
    return r


def lit_nums(a, out):
    if a[0] == "num":
        out.append(a[1])
    for c in a[1:]:
        if isinstance(c, tuple):
            lit_nums(c, out)
    return out


def scope(text, s):
    """Apply the documented boundary.  Returns (label, reasons[], notes[])."""
    if s["status"] != "ok":
        reason = {"parse-error": "syntax-rejected", "undefined": "undefined-expression",
                  "out-of-grammar": "outside-grammar:" + s.get("error", "")}[s["status"]]
        return "unsupported", [reason], []
    L, R = s["L"], s["R"]
    reasons, notes = [], []
    terms = flatten(L, 1) + flatten(R, -1)
    ctx = Ctx()
    complex_msg = None
    infos = []
    try:
        for sg, t in terms:
            nf, df = nd(t, ctx)
            infos.append((prod_polys(nf), prod_polys(df)))
    except Complex as c:
        complex_msg = str(c)
    n, d = s["F"]
    # F-level (fully reduced) view
    rd, rem = split(d) if deg(d) >= 1 else ({}, [Fr(1)])
    f_den_split = deg(rem) < 1 and sum(rd.values()) <= 3
    f_den_ok = f_den_split and not s["nonsplit_excl"]
    reduced_hi = s["num_degree"] >= 2
    nums = []
    for lit in lit_nums(L, []) + lit_nums(R, []):
        nums.append(lit)
    big = any(abs(v) >= 10 ** 6 or v.denominator >= 10 ** 6 for v in nums)
    if re.search(r"\d\s+\d", text):
        notes.append("whitespace-inside-number")
    if "x^0" in (s["flags"] | ctx.flags):
        notes.append("x^0")
    if big:
        notes.append("coefficient>=1e6")
    if complex_msg:
        notes.append("complex-structure: " + complex_msg)
        if s["nonsplit_excl"] or (deg(rem) >= 1):
            return "unsupported", ["denominator-outside-boundary"], notes
        if reduced_hi:
            return "unsupported", ["reduced-degree>=2"], notes
        return "ambiguous", ["complex-structure"], notes
    has_var_den = any(deg(dp) >= 1 for _, dp in infos)
    if not has_var_den:
        reasons.append("no-variable-denominator")
    lit_den = lit_num = False
    for np_, dp in infos:
        if deg(dp) >= 1:
            r, rm = split(dp)
            if deg(rm) >= 1 or sum(r.values()) > 3:
                lit_den = True
        if deg(np_) > 2:
            lit_num = True
        elif deg(np_) >= 1:
            r, rm = split(np_)
            if deg(rm) >= 1:
                lit_num = True
    if lit_den:
        reasons.append("denominator-outside-boundary")
    if lit_num:
        reasons.append("numerator-outside-boundary")
    if reduced_hi:
        reasons.append("reduced-degree>=2")
    if "no-variable-denominator" in reasons or reduced_hi:
        return "unsupported", reasons, notes
    if lit_den or lit_num:
        if f_den_ok:
            notes.append("literal terms exceed the boundary but the fully reduced function is inside it")
            return "ambiguous", reasons, notes
        return "unsupported", reasons, notes
    if notes and (set(notes) & {"coefficient>=1e6", "x^0", "whitespace-inside-number"}):
        return "ambiguous", ["convention"] + notes, notes
    return "supported", [], notes


# --------------------------------------------------------- brute-force check
GRID = sorted({Fr(k, q) for q in range(1, 7) for k in range(-12 * q, 12 * q + 1)})


def brute_check(s):
    """Independent confirmation by direct Fraction evaluation of the text (no polynomial algebra)."""
    L, R = s["L"], s["R"]
    errs = []
    X = set(s["excluded"])
    sol = set(s.get("solution", []))
    for v in GRID:
        l, r = eval_at(L, v), eval_at(R, v)
        defined = l is not None and r is not None
        if (v in X) == defined:
            errs.append("domain mismatch at %s (excluded=%s, defined=%s)" % (fmt(v), v in X, defined))
            continue
        if not defined:
            continue
        holds = l == r
        if s["cls"] == "identity-on-domain":
            if not holds:
                errs.append("identity fails at %s" % fmt(v))
        elif holds != (v in sol):
            errs.append("equation %s at %s but solution list says %s" % (holds, fmt(v), v in sol))
    for v in sol:
        l, r = eval_at(L, v), eval_at(R, v)
        if l is None or r is None or l != r:
            errs.append("claimed solution %s does not satisfy the original" % fmt(v))
    return errs


# ------------------------------------------------------------ sympy (optional)
def sympy_check(text):
    """Cross-check only.  Returns dict or {'error':..}; None if sympy unavailable."""
    try:
        import sympy as sp
    except Exception:
        return None
    x = sp.Symbol("x")
    try:
        lt, rt = text.replace("^", "**").split("=")
        Lu = sp.sympify(lt, locals={"x": x}, evaluate=False)
        Ru = sp.sympify(rt, locals={"x": x}, evaluate=False)
        X = set()
        irr = [0]

        def walk(e):
            if isinstance(e, sp.Pow) and e.exp.is_number and e.exp < 0 and e.base.has(x):
                nm = sp.numer(sp.together(e.base))
                if nm.has(x):
                    for r in sp.real_roots(sp.Poly(nm, x)):
                        if r.is_rational:
                            X.add(Fr(int(r.p), int(r.q)))
                        else:
                            irr[0] += 1
            for a in e.args:
                walk(a)

        walk(Lu - Ru if False else Lu)
        walk(Ru)
        F = sp.cancel(sp.together(sp.sympify(lt, locals={"x": x}) - sp.sympify(rt, locals={"x": x})))
        n, _ = sp.fraction(F)
        if n == 0:
            return {"cls": "identity-on-domain", "solution": [], "excluded": sorted(X)}
        P = sp.Poly(n, x)
        if P.degree() > 1:
            sols = sorted(Fr(int(r.p), int(r.q)) for r in sp.roots(P, x) if r.is_rational and Fr(int(r.p), int(r.q)) not in X)
            return {"cls": "degree>=2", "solution": sols, "excluded": sorted(X)}
        if P.degree() == 0:
            return {"cls": "none", "solution": [], "excluded": sorted(X)}
        r = sp.solve(n, x)[0]
        r = Fr(int(r.p), int(r.q))
        return {"cls": "none" if r in X else "unique", "solution": [] if r in X else [r], "excluded": sorted(X)}
    except Exception as e:  # honest reporting
        return {"error": "%s: %s" % (type(e).__name__, e)}


def describe(text):
    s = solve(text)
    label, reasons, notes = scope(text, s)
    out = {"text": text, "label": label, "reasons": reasons, "notes": notes, "status": s["status"]}
    if s["status"] == "ok":
        out.update(cls=s["cls"], solution=[fmt(v) for v in s["solution"]],
                   excluded=[fmt(v) for v in s["excluded"]],
                   irrational_excluded=s["irrational_excluded"])
        out["brute_errors"] = brute_check(s)
    else:
        out["error"] = s.get("error")
    return out


def verify_suite(path):
    suite = json.load(open(path))
    bad = 0
    for e in suite:
        d = describe(e["text"])
        t = e["truth"]
        probs = []
        if d["label"] != e["label"] and not e.get("override"):
            probs.append("label %s != %s" % (d["label"], e["label"]))
        if d["status"] == "ok":
            if (d["cls"], d["solution"], d["excluded"]) != (t["class"], t["solution"], t["excluded"]):
                probs.append("truth drift")
            if d["brute_errors"]:
                probs.append("brute: " + "; ".join(d["brute_errors"][:2]))
        if probs:
            bad += 1
            print("VERIFY FAIL", e["id"], e["text"], probs)
    print("verify: %d entries, %d problems" % (len(suite), bad))
    return bad


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--verify":
        here = os.path.dirname(os.path.abspath(__file__))
        sys.exit(1 if verify_suite(os.path.join(here, "suite.json")) else 0)
    for t in sys.argv[1:]:
        r = describe(t)
        print(json.dumps(r, indent=1, default=str))
