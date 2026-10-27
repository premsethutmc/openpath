"""Independent exact reference for the one-variable rational-equation reasoner tests.

Own polynomial arithmetic over fractions.Fraction. No SymPy, no engine code.

Semantics (see README.md):
  * Parse the WRITTEN expression tree. Every division a/b records "b != 0"; every
    power base^k with k <= 0 records "base != 0" (so x^0 needs x != 0).
    Conditions are polynomials (numerators of the divisor as a rational function);
    sub-expression domains are inherited because every node records its own.
  * excluded = union of rational roots of all recorded conditions.
  * L = R is solved as N/D = 0 with N = L.num*R.den - R.num*L.den; solutions are the
    rational roots of N that are not excluded; N identically 0 => identity-on-domain.
"""
from fractions import Fraction as F
from math import isqrt
import re


class Refusal(Exception):
    def __init__(self, code, msg=""):
        super().__init__(code + ": " + msg)
        self.code = code


# ---------------------------------------------------------------- polynomials
# dense list, low -> high, trimmed (zero polynomial = [])
def trim(p):
    p = list(p)
    while p and p[-1] == 0:
        p.pop()
    return p


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
    r = [F(0)] * (len(a) + len(b) - 1)
    for i, x in enumerate(a):
        for j, y in enumerate(b):
            r[i + j] += x * y
    return trim(r)


def ppow(a, k):
    r = [F(1)]
    for _ in range(k):
        r = pmul(r, a)
    return r


def deg(a):
    return len(a) - 1  # zero poly -> -1


def pdivmod(a, b):
    a = list(a)
    q = [F(0)] * max(0, len(a) - len(b) + 1)
    while len(a) >= len(b) and a:
        c = a[-1] / b[-1]
        d = len(a) - len(b)
        q[d] = c
        for i, y in enumerate(b):
            a[i + d] -= c * y
        a = trim(a)
    return trim(q), a


def pgcd(a, b):
    while b:
        a, b = b, pdivmod(a, b)[1]
    return [c / a[-1] for c in a] if a else a


def peval(a, x):
    r = F(0)
    for c in reversed(a):
        r = r * x + c
    return r


def _divisors(n, limit=10**7):
    n = abs(n)
    if n == 0:
        return [0]
    if n > limit * limit:
        raise Refusal("UNSUPPORTED_EXPRESSION", "coefficients too large for reference")
    ds = [1]
    m = n
    p = 2
    while p * p <= m and p <= limit:
        e = 0
        while m % p == 0:
            m //= p
            e += 1
        if e:
            ds = [d * p ** i for d in ds for i in range(e + 1)]
        p += 1
    if m > 1:
        ds = [d * f for d in ds for f in (1, m)]
    return ds


def _lcm_den(a):
    from math import lcm
    l = 1
    for c in a:
        l = lcm(l, c.denominator)
    return l


def rational_roots(p):
    """Return (roots_with_multiplicity sorted, remainder poly). remainder is the
    part with no rational roots (degree 0 const if p splits completely)."""
    p = trim(p)
    if not p:
        raise ValueError("zero polynomial")
    roots = []
    while deg(p) >= 1:
        if deg(p) == 1:
            roots.append(-p[0] / p[1])
            p = [F(1)] * 1 and [p[1]]
            p = [F(p[0])]
            continue
        # strip zero root
        if p[0] == 0:
            roots.append(F(0))
            p = p[1:]
            continue
        if deg(p) == 2:
            a, b, c = p[2], p[1], p[0]
            disc = b * b - 4 * a * c
            if disc >= 0:
                n, d = disc.numerator, disc.denominator
                sn, sd = isqrt(n), isqrt(d)
                if sn * sn == n and sd * sd == d:
                    s = F(sn, sd)
                    roots += [(-b + s) / (2 * a), (-b - s) / (2 * a)]
                    p = [a]
                    continue
            break
        # general: rational root theorem on integerised poly
        l = _lcm_den(p)
        ip = [int(c * l) for c in p]
        found = None
        for dn in _divisors(ip[-1]):
            for nm in _divisors(ip[0]):
                for sgn in (1, -1):
                    r = F(sgn * nm, dn)
                    if peval(p, r) == 0:
                        found = r
                        break
                if found is not None:
                    break
            if found is not None:
                break
        if found is None:
            break
        roots.append(found)
        p, rem = pdivmod(p, [-found, F(1)])
        assert not rem
    return sorted(roots), p


def real_nature(rem):
    """for a non-constant remainder with no rational roots: 'irrational' or 'complex'."""
    if deg(rem) == 2:
        a, b, c = rem[2], rem[1], rem[0]
        return "irrational" if b * b - 4 * a * c > 0 else "complex"
    return "irrational" if deg(rem) % 2 == 1 else "complex"  # crude; avoided in suite


# ---------------------------------------------------------------- parsing
FUNC_CODE = "UNSUPPORTED_OPERATOR"


def tokenize(s):
    toks = []
    i = 0
    n = len(s)
    while i < n:
        c = s[i]
        if c == " ":
            i += 1
        elif c.isdigit() and c.isascii():
            m = re.compile(r"\d+(\.\d+)?").match(s, i)
            toks.append(("NUM", F(m.group(0))))
            i = m.end()
            if i < n and (s[i] == "." or (s[i].isascii() and s[i].isalpha()) or s[i].isdigit()):
                # '2.' , '1e0', '2x' handled: letter after number is parsed next, '.' is error
                if s[i] == ".":
                    raise Refusal("PARSE_ERROR", "bad number")
        elif c.isascii() and c.isalpha():
            m = re.compile(r"[A-Za-z]+").match(s, i)
            name = m.group(0)
            j = m.end()
            k = j
            while k < n and s[k] == " ":
                k += 1
            if name == "x":
                toks.append(("X", None))
            elif k < n and s[k] == "(" and len(name) > 1:
                raise Refusal(FUNC_CODE, "function " + name)
            else:
                raise Refusal("PARSE_ERROR", "unknown name " + name)
            i = j
        elif c in "+-*/^()=":
            toks.append((c, None))
            i += 1
        elif c in "!|":
            raise Refusal(FUNC_CODE, "operator " + c)
        else:
            raise Refusal("PARSE_ERROR", "bad char %r" % c)
    return toks


class Ctx:
    def __init__(self):
        self.conds = []     # polys that must be nonzero
        self.nested = False


# AST nodes: ('num',F) ('x',) ('add',a,b) ('sub',a,b) ('mul',a,b) ('div',a,b) ('pow',a,k)
class Parser:
    def __init__(self, toks):
        self.t = toks
        self.i = 0

    def peek(self):
        return self.t[self.i][0] if self.i < len(self.t) else None

    def take(self, kind=None):
        if self.i >= len(self.t):
            raise Refusal("PARSE_ERROR", "unexpected end")
        tk = self.t[self.i]
        if kind and tk[0] != kind:
            raise Refusal("PARSE_ERROR", "expected " + kind)
        self.i += 1
        return tk

    def expr(self):
        a = self.term()
        while self.peek() in ("+", "-"):
            op = self.take()[0]
            b = self.term()
            a = ("add" if op == "+" else "sub", a, b)
        return a

    def term(self):
        a = self.power()
        while self.peek() in ("*", "/"):
            op = self.take()[0]
            b = self.power()
            a = ("mul" if op == "*" else "div", a, b)
        return a

    def power(self):
        a = self.atom()
        if self.peek() == "^":
            self.take()
            e = self.expo()
            a = ("pow", a, e)
            if self.peek() == "^":
                raise Refusal("PARSE_ERROR", "chained ^ not in grammar")
        return a

    def expo(self):
        neg = False
        if self.peek() == "-":
            self.take()
            neg = True
        if self.peek() == "(":
            self.take()
            neg2 = False
            if self.peek() == "-":
                self.take()
                neg2 = True
            e = self.expr()
            self.take(")")
            if neg2:
                e = ("sub", ("num", F(0)), e)
        elif self.peek() == "NUM":
            e = ("num", self.take()[1])
        else:
            if self.peek() == "X":
                raise Refusal(FUNC_CODE, "x in exponent")
            raise Refusal("PARSE_ERROR", "bad exponent")
        v = const_value(e)
        if neg:
            v = -v
        if v.denominator != 1:
            raise Refusal(FUNC_CODE, "non-integer exponent")
        if abs(v) > 60:
            raise Refusal("UNSUPPORTED_EXPRESSION", "exponent too large")
        return int(v)

    def atom(self):
        k = self.peek()
        if k == "NUM":
            return ("num", self.take()[1])
        if k == "X":
            self.take()
            return ("x",)
        if k == "(":
            self.take()
            e = self.expr()
            self.take(")")
            return e
        raise Refusal("PARSE_ERROR", "unexpected token %r" % k)


def const_value(e):
    t = e[0]
    if t == "num":
        return e[1]
    if t == "x":
        raise Refusal(FUNC_CODE, "x in exponent")
    if t in ("add", "sub", "mul", "div"):
        a, b = const_value(e[1]), const_value(e[2])
        if t == "add":
            return a + b
        if t == "sub":
            return a - b
        if t == "mul":
            return a * b
        if b == 0:
            raise Refusal("DOMAIN_UNRESOLVED", "division by zero in exponent")
        return a / b
    if t == "pow":
        a = const_value(e[1])
        if a == 0 and e[2] <= 0:
            raise Refusal("DOMAIN_UNRESOLVED", "0^k")
        return a ** e[2]
    raise AssertionError


def parse_equation(text):
    toks = tokenize(text)
    eqs = [i for i, t in enumerate(toks) if t[0] == "="]
    if len(eqs) != 1:
        raise Refusal("PARSE_ERROR", "need exactly one '='")
    i = eqs[0]
    sides = []
    for part in (toks[:i], toks[i + 1:]):
        if not part:
            raise Refusal("PARSE_ERROR", "empty side")
        p = Parser(part)
        e = p.expr()
        if p.i != len(part):
            raise Refusal("PARSE_ERROR", "trailing tokens")
        sides.append(e)
    return sides


# ---------------------------------------------------------------- evaluation
X = [F(0), F(1)]


def has_rational(e):
    """does the tree contain a division or negative/zero power (a denominator)?"""
    t = e[0]
    if t == "div":
        return True
    if t == "pow":
        return e[2] <= 0 or has_rational(e[1])
    if t in ("add", "sub", "mul"):
        return has_rational(e[1]) or has_rational(e[2])
    return False


def ev(e, ctx):
    t = e[0]
    if t == "num":
        return ([e[1]] if e[1] != 0 else []), [F(1)]
    if t == "x":
        return list(X), [F(1)]
    if t in ("add", "sub"):
        (na, da), (nb, db) = ev(e[1], ctx), ev(e[2], ctx)
        n1, n2 = pmul(na, db), pmul(nb, da)
        return (padd(n1, n2) if t == "add" else psub(n1, n2)), pmul(da, db)
    if t == "mul":
        (na, da), (nb, db) = ev(e[1], ctx), ev(e[2], ctx)
        return pmul(na, nb), pmul(da, db)
    if t == "div":
        if has_rational(e[2]):
            ctx.nested = True
        (na, da), (nb, db) = ev(e[1], ctx), ev(e[2], ctx)
        need(nb, ctx)
        return pmul(na, db), pmul(da, nb)
    if t == "pow":
        k = e[2]
        if k <= 0 and has_rational(e[1]):
            ctx.nested = True
        n, d = ev(e[1], ctx)
        if k > 0:
            return ppow(n, k), ppow(d, k)
        need(n, ctx)
        return ppow(d, -k), ppow(n, -k)
    raise AssertionError


def need(poly, ctx):
    if not poly:
        raise Refusal("DOMAIN_UNRESOLVED", "expression undefined everywhere (divisor identically 0)")
    if deg(poly) >= 1:
        ctx.conds.append(poly)


def top_terms(e):
    if e[0] in ("add", "sub"):
        return top_terms(e[1]) + top_terms(e[2])
    return [e]


def solve_text(text):
    """Return dict with class, solution (list of Fraction strings), excluded, plus diagnostics.
    Raises Refusal for parse / domain problems (code per README)."""
    sides = parse_equation(text)
    ctx = Ctx()
    (nl, dl), (nr, dr) = ev(sides[0], ctx), ev(sides[1], ctx)
    exc = set()
    complex_pole = irrational_pole = False
    cond_ok = True
    for c in ctx.conds:
        rs, rem = rational_roots(c)
        exc.update(rs)
        if deg(rem) >= 1:
            cond_ok = False
            if real_nature(rem) == "irrational":
                irrational_pole = True
            else:
                complex_pole = True
        elif len(rs) > 3:
            cond_ok = False
    if irrational_pole or complex_pole:
        raise Refusal("DOMAIN_UNRESOLVED", "irrational/complex pole")
    N = psub(pmul(nl, dr), pmul(nr, dl))
    D = pmul(dl, dr)
    g = pgcd(N, D) if N else D
    red = pdivmod(N, g)[0] if N else []
    info = {"nested": ctx.nested, "cond_ok": cond_ok, "n_conds": len(ctx.conds),
            "reduced_degree": deg(red) if N else -1}
    # term numerator scope (each top-level additive term numerator splits, deg<=2)
    term_ok = True
    for side in sides:
        for tm in top_terms(side):
            c2 = Ctx()
            tn, _ = ev(tm, c2)
            if deg(tn) > 2:
                term_ok = False
            elif deg(tn) >= 1:
                rs, rem = rational_roots(tn)
                if deg(rem) >= 1:
                    term_ok = False
    info["term_ok"] = term_ok
    exs = sorted(exc)
    if not N:
        return dict(cls="identity-on-domain", solution=None, excluded=exs, info=info, N=N)
    rs, rem = rational_roots(N)
    if deg(rem) >= 1:
        raise Refusal("UNSUPPORTED_EXPRESSION", "non-rational solutions")
    sol = sorted(set(r for r in rs if r not in exc))
    return dict(cls="unique" if sol else "none", solution=sol, excluded=exs, info=info, N=N)


def auto_scope(r):
    i = r["info"]
    if (not i["nested"] and i["cond_ok"] and i["n_conds"] >= 1 and i["reduced_degree"] <= 1
            and i["term_ok"]):
        return "in"
    return "flex"


def fs(q):
    return str(F(q))


def fmt(r):
    return {"class": r["cls"], "solution": None if r["solution"] is None else [fs(q) for q in r["solution"]],
            "excluded": [fs(q) for q in r["excluded"]]}


# ---------------------------------------------------------------- step truth
def state_set(eq, excluded):
    """(kind, payload): ('fin', set) or ('all', set_of_excluded). Also returns closed flag."""
    r = solve_text(eq)
    ex = set(F(q) for q in excluded)
    closed = set(r["excluded"]) <= ex
    allex = ex | set(r["excluded"])
    if r["cls"] == "identity-on-domain":
        return closed, ("all", allex)
    return closed, ("fin", set(q for q in _all_roots(r["N"]) if q not in allex))


def _all_roots(N):
    rs, rem = rational_roots(N)
    if deg(rem) >= 1:
        raise Refusal("UNSUPPORTED_EXPRESSION", "irrational roots in step state")
    return set(rs)


def subset(a, b):
    ka, sa = a
    kb, sb = b
    if ka == "fin" and kb == "fin":
        return sa <= sb
    if ka == "fin" and kb == "all":
        return not (sa & sb)
    if ka == "all" and kb == "fin":
        return False
    return sb <= sa  # all\Sa subset all\Sb iff Sb subset Sa


def step_truth(frm, to, effect):
    c1, s1 = state_set(frm["eq"], frm["excluded"])
    c2, s2 = state_set(to["eq"], to["excluded"])
    if not (c1 and c2):
        return "invalid", ("from-state not closed" if not c1 else "to-state not closed")
    if effect == "equivalence":
        ok = subset(s1, s2) and subset(s2, s1)
    else:
        ok = subset(s1, s2)
    return ("valid" if ok else "invalid"), "solution-set relation " + ("holds" if ok else "fails")


if __name__ == "__main__":
    import sys
    for t in sys.argv[1:]:
        try:
            r = solve_text(t)
            print(t, fmt(r), r["info"], auto_scope(r))
        except Refusal as e:
            print(t, "REFUSE", e.code, e)
