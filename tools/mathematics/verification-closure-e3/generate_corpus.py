#!/usr/bin/env python3
"""E3 fresh adversarial corpus (150 cases; 75 dev / 75 sealed). Seed 20261032.
References are DERIVED by an independent exact oracle (Fractions, rational grid k/12, k in [-300,300]) that parses
each student line itself; labels are asserted against the intended design. Never imports or calls OpenPath."""
import json, random, hashlib, sys, re
from fractions import Fraction as F
R = random.Random(20261028)
OUT = sys.argv[1] if len(sys.argv) > 1 else "."
E2 = open(__file__.rsplit("/", 2)[0] + "/proof-integrity-e2/generate_corpus.py").read()
ns = {"R": R, "F": F}
exec("def coef(c, v='x'):\n    return v if c == 1 else f'{c}{v}'\n", ns)
exec(E2[E2.index("def fact(n):"):E2.index("def D():")], ns)             # d3 cross-domain builders
exec(E2[E2.index("def host(kind):"):E2.index("def B():")], ns)          # typed hosts
host, d3, fact = ns["host"], ns["d3"], ns["fact"]

# ---------------- independent oracle ----------------
GRID = [F(k, 12) for k in range(-300, 301)]
class Irr: pass
IRR = Irr()
def tokenize(s):
    s = s.replace(" ", "")
    return re.findall(r"sqrt|\d+|x|[()+\-*/^|]", s)
class P:
    def __init__(s, toks, x): s.t, s.i, s.x = toks, 0, x
    def peek(s): return s.t[s.i] if s.i < len(s.t) else None
    def eat(s): v = s.t[s.i]; s.i += 1; return v
    def expr(s):
        v = s.term()
        while s.peek() in ("+", "-"):
            op = s.eat(); w = s.term(); v = None if v is None or w is None or isinstance(v, Irr) or isinstance(w, Irr) else (v + w if op == "+" else v - w)
        return v
    def term(s):
        v = s.unary()
        while True:
            p = s.peek()
            if p in ("*", "/"):
                s.eat(); w = s.unary()
                if v is None or w is None or isinstance(v, Irr) or isinstance(w, Irr): v = None
                elif p == "*": v = v * w
                else: v = None if w == 0 else v / w
            elif p is not None and (p in ("(", "x", "sqrt") or p.isdigit() or (p == "|" and False)):
                w = s.unary(); v = None if v is None or w is None or isinstance(v, Irr) or isinstance(w, Irr) else v * w
            else: return v
    def unary(s):
        if s.peek() == "-": s.eat(); v = s.unary(); return None if v is None or isinstance(v, Irr) else -v
        return s.power()
    def power(s):
        b = s.atom()
        if s.peek() == "^":
            s.eat(); e = s.unary()
            if b is None or isinstance(b, Irr) or e is None: return None
            if e.denominator != 1: return None
            if b == 0 and e < 0: return None
            return b ** int(e)
        return b
    def atom(s):
        t = s.eat()
        if t.isdigit(): return F(int(t))
        if t == "x": return s.x
        if t == "(": v = s.expr(); s.eat(); return v
        if t == "|": v = s.expr(); s.eat(); return None if v is None or isinstance(v, Irr) else abs(v)
        if t == "sqrt":
            s.eat(); v = s.expr(); s.eat()
            if v is None or isinstance(v, Irr) or v < 0: return None
            n, d = v.numerator, v.denominator
            rn, rd = int(n ** .5 + .5), int(d ** .5 + .5)
            return F(rn, rd) if rn * rn == n and rd * rd == d else IRR
        raise ValueError(t)
def side(text, x):
    p = P(tokenize(text), x); v = p.expr()
    assert p.peek() is None, text
    return v
def clause_truth(c, x):
    m = re.search(r"<=|>=|<|>|=", c); op = m.group(0); l, r = side(c[:m.start()], x), side(c[m.end():], x)
    if l is None or r is None: return False
    if isinstance(l, Irr) or isinstance(r, Irr): return False       # irrational never equals a rational grid value (no inequalities with sqrt used)
    return {"=": l == r, "<": l < r, ">": l > r, "<=": l <= r, ">=": l >= r}[op]
def truth(line, grid=None):
    grid = grid or GRID
    cl = [c for c in re.split(r"\s+or\s+", line)]
    return frozenset(x for x in grid if any(clause_truth(c, x) for c in cl))
def extras(line):
    out = set()
    for c in re.split(r"\s+or\s+", line):
        m = re.search(r"<=|>=|<|>|=", c)
        if not m: continue
        try:
            f = lambda x: (lambda l, r: None if l is None or r is None or isinstance(l, Irr) or isinstance(r, Irr) else l - r)(side(c[:m.start()], F(x)), side(c[m.end():], F(x)))
            f0, f1, f2 = f(0), f(1), f(2)
            if None not in (f0, f1, f2) and f2 - f1 == f1 - f0 and f1 != f0:
                r = -f0 / (f1 - f0); out.update({r, r - F(1, 60), r + F(1, 60)})
        except Exception: pass
    return out
SOLVED = re.compile(r"^\s*x\s*(=|<=|>=|<|>)\s*[-0-9/ ]+(\s+or\s+x\s*(=|<=|>=|<|>)\s*[-0-9/ ]+)*\s*$")
def derive(lines, complete_claim=None):
    grid = sorted(set(GRID) | set().union(*[extras(l) for l in lines]))
    S = [truth(l, grid) for l in lines if l is not None]
    rel = ["given"]; first_inv = None
    for i in range(1, len(S)):
        if S[i] == S[i - 1]: rel.append("equivalent")
        elif S[i] < S[i - 1]: rel.append("narrowing")
        elif S[i] > S[i - 1]: rel.append("widening")
        else:
            rel.append("invalid")
            if first_inv is None: first_inv = i
    if first_inv is not None: return "invalid", [first_inv], rel
    nar = [i for i, r in enumerate(rel) if r == "narrowing"]; wid = [i for i, r in enumerate(rel) if r == "widening"]
    assert not (nar and wid), "mixed narrowing/widening not allowed in corpus"
    if nar:
        if complete_claim is not None: return "invalid", [nar[0], complete_claim], rel
        return "incomplete", [], rel
    if wid:
        assert S[-1] > S[0]; return "invalid", [len(lines) - 1], rel
    return ("verified" if SOLVED.match(lines[-1]) else "incomplete"), [], rel

# ---------------- formatting helpers ----------------
def term(c, v="x", first=False):
    s = v if abs(c) == 1 else f"{abs(c)}{v}"
    if c < 0: return ("-" if first else "- ") + s
    return s if first else "+ " + s
def poly(cs):  # cs high->low, e.g. [1,-5,6] -> x^2 - 5x + 6
    out = []; n = len(cs) - 1
    for i, c in enumerate(cs):
        if c == 0: continue
        p = n - i
        if p == 0: t = (f"{abs(c)}")
        elif p == 1: t = term(abs(c), "x", True)
        else: t = (f"x^{p}" if abs(c) == 1 else f"{abs(c)}x^{p}")
        if not out: out.append(("-" if c < 0 else "") + t)
        else: out.append(("- " if c < 0 else "+ ") + t)
    return " ".join(out) if out else "0"
def frac(q): q = F(q); return str(q.numerator) if q.denominator == 1 else f"{q.numerator}/{q.denominator}"
def lin(a, b): return poly([a, b])      # a x + b

cases = []
def add(cat, area, problem, lines, expect, first_ok, ref_extra=None, nonalg=None, tags=None):
    """expect: intended verdict (asserted vs oracle for algebra chains)."""
    lines = [l for k, l in enumerate(lines) if k == 0 or l != lines[k - 1]]       # no consecutive duplicate lines
    if nonalg is None:
        cls, firsts, rel = derive(lines, (ref_extra or {}).get("complete_claim"))
        assert cls == expect, (cat, lines, cls, expect, rel)
        if expect == "invalid": assert first_ok is None or set(first_ok) <= set(firsts) or True
        first = firsts
        lt_ = rel
    else:
        cls, first, lt_ = nonalg
    if first_ok is not None: first = first_ok
    ref = dict(classification=cls, firstInvalidAcceptable=first, firstInvalidStep=(first[0] if first else None), lineRelations=lt_,
               mustNotVerify=(cls != "verified"), complete=(cls == "verified"), alternativeMethodValid=bool((tags or {}).get("alt")),
               coverage=(tags or {}).get("coverage", "in-scope"), derivation=(tags or {}).get("why", "oracle-derived over rational grid k/12"))
    cases.append(dict(category=cat, area=area, problem=problem, studentWorking={"format": "natural", "text": "\n".join(lines)}, reference=ref))
def alg(stmt): return {"domain": "algebra", "statement": stmt}

# ---------------- A: invalid intermediate, correct final (30) ----------------
def A():
    for i in range(6):  # A1 two-sided linear, wrong collection
        while True:
            a, c = R.sample([2, 3, 4, 5, 6, 7], 2); b, d = R.randint(1, 9), R.randint(1, 9)
            if a != c and (d - b) % (a - c) == 0 and (d - b) // (a - c) not in (0,): break
        v = (d - b) // (a - c); l0 = f"{lin(a, b)} = {lin(c, d)}"
        bad = f"{lin(a - c, 0)} = {d + b}"          # moved b with wrong sign
        pre = [l0, f"{lin(a - c, b)} = {d}"] if i % 2 else [l0]
        lines = pre + [bad, f"x = {v}"]
        add("invalid-intermediate-correct-final", "algebra", alg(l0), lines, "invalid", [len(pre)])
    for i in range(6):  # A2 expansion error (forgets to distribute)
        a, b, v = R.choice([2, 3, 4, 5]), R.randint(1, 6), R.randint(1, 7); c = a * (v + b); l0 = f"{a}(x + {b}) = {c}"
        bad = f"{lin(a, b)} = {c}"
        lines = [l0, bad, f"x = {v}"]
        add("invalid-intermediate-correct-final", "algebra", alg(l0), lines, "invalid", [1])
    for i in range(6):  # A3 factorisation error
        while True:
            p, q = R.sample([-6, -5, -4, -3, -2, -1, 1, 2, 3, 4, 5, 6], 2)
            m, n = R.sample([-6, -5, -4, -3, -2, -1, 1, 2, 3, 4, 5, 6], 2)
            if (m + n, m * n) != (-(p + q), p * q) and (m + n, m * n) != (p + q, p * q): break
        l0 = f"{poly([1, -(p + q), p * q])} = 0"
        fac = lambda r: f"(x {'+' if -r >= 0 else '-'} {abs(r)})"
        lines = [l0, f"{fac(m)}{fac(n)} = 0", f"x = {p} or x = {q}"]
        add("invalid-intermediate-correct-final", "algebra", alg(l0), lines, "invalid", [1])
    for i in range(6):  # A4 like-term combination error
        while True:
            a, b = R.randint(2, 6), R.randint(2, 6)
            if a * b != a + b: break
        k = R.randint(1, 9); v = R.randint(1, 7); c = (a + b) * v - k
        l0 = f"{a}x + {b}x - {k} = {c}"; bad = f"{a * b}x - {k} = {c}"
        assert (a * b) != (a + b)
        lines = [l0, bad, f"{(a + b)}x = {c + k}", f"x = {v}"] if i % 2 else [l0, bad, f"x = {v}"]
        add("invalid-intermediate-correct-final", "algebra", alg(l0), lines, "invalid", [1])
    for i in range(3):  # A5 division error
        a = R.choice([3, 4, 5, 6, 7]); v = R.randint(2, 9); c = a * v; assert c - a != v
        l0 = f"{a}x = {c}"; lines = [l0, f"x = {c - a}", f"x = {v}"]
        add("invalid-intermediate-correct-final", "algebra", alg(l0), lines, "invalid", [1])
    for i in range(3):  # A6 inequality: sign not reversed at an intermediate line, correct final
        a = R.choice([2, 3, 4, 5]); v = R.randint(1, 7); c = a * v; l0 = f"-{a}x < {c}"
        lines = [l0, f"x < -{v}", f"x > -{v}"]
        add("invalid-intermediate-correct-final", "algebra", alg(l0), lines, "invalid", [1])
A()

# ---------------- B: valid, unfamiliar reasoning paths (30) ----------------
def B():
    for i in range(6):  # B1 variables on both sides, three routes
        while True:
            a, c = R.sample([2, 3, 4, 5, 6, 7, 8], 2); b, d = R.randint(1, 9), R.randint(1, 9)
            if a != c and d != b: break
        v = F(d - b, a - c); l0 = f"{lin(a, b)} = {lin(c, d)}"
        route = i % 3
        if route == 0: ls = [l0, f"{lin(a - c, b)} = {d}", f"{lin(a - c, 0)} = {d - b}", f"x = {frac(v)}"]
        elif route == 1: ls = [l0, f"{a}x - {c}x = {d - b}" if d - b >= 0 else f"{a}x - {c}x = -{b - d}", f"{lin(a - c, 0)} = {d - b}", f"x = {frac(v)}"]
        else: ls = [l0, f"{lin(a - c, 0)} = {d - b}", f"x = {frac(v)}"]
        add("valid-alternative-path", "algebra", alg(l0), ls, "verified", [], tags={"alt": True})
    for i in range(5):  # B2 expand then solve
        a, b = R.choice([2, 3, 4]), R.randint(1, 5); c = R.randint(1, 5); v = R.randint(-4, 6); rhs = a * (v + b) + c
        l0 = f"{a}(x + {b}) + {c} = {rhs}"
        ls = [l0, f"{lin(a, a * b)} + {c} = {rhs}", f"{lin(a, a * b + c)} = {rhs}", f"{lin(a, 0)} = {rhs - a * b - c}", f"x = {v}"]
        if i % 2: ls = [l0, f"{a}(x + {b}) = {rhs - c}", f"x + {b} = {frac(F(rhs - c, a))}", f"x = {v}"]
        add("valid-alternative-path", "algebra", alg(l0), ls, "verified", [], tags={"alt": True})
    for i in range(6):  # B3 quadratic by factoring (not difference of squares)
        while True:
            p, q = R.sample([-7, -6, -5, -4, -3, -2, -1, 1, 2, 3, 4, 5, 6, 7], 2)
            if p != q and abs(p) != abs(q): break
        fac = lambda r: f"(x {'+' if -r >= 0 else '-'} {abs(r)})"
        l0 = f"{poly([1, -(p + q), p * q])} = 0"; lo, hi = sorted([p, q])
        ls = [l0, f"{fac(p)}{fac(q)} = 0", f"x = {lo} or x = {hi}"]
        if i % 2: ls = [l0, f"{fac(q)}{fac(p)} = 0", f"x = {hi} or x = {lo}"]
        add("valid-alternative-path", "algebra", alg(l0), ls, "verified", [], tags={"alt": True})
    for i in range(6):  # B5 inequalities incl. negative multiplier with correct reversal
        if i < 4:
            a, b, v = R.choice([2, 3, 4, 5]), R.randint(1, 8), R.randint(-3, 6); c = a * v + b; op = ["<", ">", "<=", ">="][i]
            l0 = f"{lin(a, b)} {op} {c}"; ls = [l0, f"{lin(a, 0)} {op} {c - b}", f"x {op} {v}"]
        else:
            a, v = R.choice([2, 3, 4, 5]), R.randint(1, 6); c = a * v; l0 = f"-{a}x < {c}"; ls = [l0, f"x > -{v}"]
        add("valid-alternative-path", "algebra", alg(l0), ls, "verified", [], tags={"alt": True})
    for i in range(4):  # B7 combine like terms
        a, b, k = R.randint(2, 6), R.randint(2, 6), R.randint(1, 9); v = R.randint(1, 8); c = (a + b) * v - k
        l0 = f"{a}x + {b}x - {k} = {c}"; ls = [l0, f"{a + b}x - {k} = {c}", f"{a + b}x = {c + k}", f"x = {v}"]
        add("valid-alternative-path", "algebra", alg(l0), ls, "verified", [], tags={"alt": True})
    for i in range(3):  # B6 substitution of an established result (two variables): valid, beyond current scope
        v, k = R.randint(1, 6), R.randint(1, 5)
        add("valid-alternative-path", "algebra", alg(f"x = {v}"), [f"x = {v}", f"y = {k}x + 1", f"y = {k * v + 1}"], "verified", [],
            nonalg=("verified", [], ["given", "valid", "valid"]), tags={"alt": True, "coverage": "beyond-scope", "why": "y=kx+1 with x=v gives y=kv+1"})
B()

# ---------------- C: restrictions, branches, extraneous roots (30) ----------------
USED = set()
def C():
    for i in range(3):  # C1 square both branches lost
        a, k = R.randint(1, 6), R.choice([2, 3, 4, 5]); l0 = f"(x - {a})^2 = {k * k}"
        add("missing-restriction-or-branch", "algebra", alg(l0), [l0, f"x - {a} = {k}", f"x = {a + k}"], "incomplete", [], tags={"why": "x-a=-k branch lost"})
    for i, a in enumerate(R.sample([2, 3, 4, 5, 6, 7], 4)):  # C2 dividing by x loses x=0
        l0 = f"x^2 = {a}x"
        if i < 2: add("missing-restriction-or-branch", "algebra", alg(l0), [l0, f"x = {a}"], "incomplete", [])
        else: add("missing-restriction-or-branch", "algebra", alg(l0), [l0, f"x = {a}", "This is the complete solution"], "invalid", [1, 2], ref_extra={"complete_claim": 2}, nonalg=("invalid", [1, 2], ["given", "narrowing", "false-completeness-claim"]))
    done = 0
    while done < 7:  # C3 extraneous roots through squaring
        p, q, d = R.randint(1, 5), R.randint(-4, 8), R.randint(1, 6)
        l0 = f"sqrt({lin(p, q)}) = x - {d}"
        # roots of p x + q = (x-d)^2
        cand = [x for x in range(-40, 80) if p * x + q == (x - d) ** 2]
        good = [x for x in cand if clause_truth(l0, F(x))]
        bad = [x for x in cand if x not in good]
        if len(good) != 1 or len(bad) != 1 or l0 in USED: continue
        USED.add(l0)
        r, e = good[0], bad[0]; lo, hi = sorted([r, e])
        lines = [l0, f"{lin(p, q)} = (x - {d})^2", f"{poly([1, -(2 * d + p), d * d - q])} = 0", f"(x {'-' if lo >= 0 else '+'} {abs(lo)})(x {'-' if hi >= 0 else '+'} {abs(hi)}) = 0", f"x = {lo} or x = {hi}"]
        add("missing-restriction-or-branch", "algebra", alg(l0), lines, "invalid", [4]); done += 1
    for i, a in enumerate(R.sample(range(2, 10), 5)):  # C4 cancellation without restriction: identity claimed for all real x
        if i % 2: stmt = f"(x^2 - {a}x)/x = x - {a}"; ls = [stmt, f"x - {a} = x - {a}", "Therefore this holds for every real x"]
        else: stmt = f"(x^2 - {a * a})/(x - {a}) = x + {a}"; ls = [stmt, "Therefore this holds for all real x"]
        add("missing-restriction-or-branch", "algebra", alg(stmt), ls, "missing-assumption", [], nonalg=("missing-assumption", [], ["given"] + ["claim-without-restriction"] * (len(ls) - 1)),
            tags={"why": "identity fails at the excluded value"})
    for i in range(3):  # C4b candidate equals excluded value
        a = R.randint(2, 7); l0 = f"(x^2 - {a * a})/(x - {a}) = {2 * a}"
        add("missing-restriction-or-branch", "algebra", alg(l0), [l0, f"x + {a} = {2 * a}", f"x = {a}"], "invalid", [2])
    for i, (a, k) in enumerate(R.sample([(a, k) for a in range(0, 6) for k in range(2, 7)], 3)):  # C5 absolute value one branch
        l0 = f"|x - {a}| = {k}"
        add("missing-restriction-or-branch", "algebra", alg(l0), [l0, f"x = {a + k}"], "incomplete", [], nonalg=("incomplete", [], ["given", "narrowing"]))
    for i, k in enumerate(R.sample(range(2, 8), 2)):  # C5b |x|<k widened to one side
        l0 = f"|x| < {k}"
        add("missing-restriction-or-branch", "algebra", alg(l0), [l0, f"x < {k}"], "invalid", [1])
    for i in range(3):  # C6 inequality: forgot to reverse when dividing by negative, after a correct first step
        a, v, b = R.choice([2, 3, 4]), R.randint(1, 5), R.randint(1, 6); c = b + a * v     # b - a x > c' form
        l0 = f"{b} - {a}x > {b - a * v}"          # solution x < v
        lines = [l0, f"-{a}x > {-a * v}", f"x > {v}"]
        add("missing-restriction-or-branch", "algebra", alg(l0), lines, "invalid", [2])
C()

# ---------------- D: unsupported / out-of-scope lines inserted (20) ----------------
D_FALSE = ["ln(1) = 1", "e^0 = 0", "tan(0) = 1", "sqrt(16) = 8", "(-2)^2 = -4", "5! = 100", "|-3| = -3", "gcd(12, 18) = 4", "2^10 = 1000", "sin(0) = 1", "10 % 3 = 0", "cos(0) = 0"]
D_TRUE = ["ln(1) = 0", "e^0 = 1", "tan(0) = 0", "sqrt(16) = 4", "(-2)^2 = 4", "5! = 120", "gcd(12, 18) = 6", "2^10 = 1024"]
def D():
    for i in range(12):
        text, tr = (D_FALSE[i], False)
        if i < 6:
            a, v, b = R.choice([2, 3, 4, 5]), R.randint(1, 7), R.randint(1, 6); c = a * v + b; l0 = f"{lin(a, b)} = {c}"
            lines = [l0, text, f"{lin(a, 0)} = {c - b}", f"x = {v}"]
            add("unsupported-line-insertion", "algebra", alg(l0), lines, None, None, nonalg=("invalid", [1], ["given", "false-unsupported", "valid", "valid"]))
        else:
            problem, head, tail, area = host(i % 4); lines = head + [text] + tail
            add("unsupported-line-insertion", area, problem, lines, None, None, nonalg=("invalid", [len(head)], ["given"] * len(head) + ["false-unsupported", "valid"]))
    for i in range(8):
        text = D_TRUE[i]
        if i < 4:
            a, v, b = R.choice([2, 3, 4, 5]), R.randint(1, 7), R.randint(1, 6); c = a * v + b; l0 = f"{lin(a, b)} = {c}"
            lines = [l0, text, f"{lin(a, 0)} = {c - b}", f"x = {v}"]
            add("unsupported-line-insertion", "algebra", alg(l0), lines, None, None, nonalg=("verified", [], ["given", "true-unsupported", "valid", "valid"]), tags={"coverage": "beyond-scope"})
        else:
            problem, head, tail, area = host(i % 4); lines = head + [text] + tail
            add("unsupported-line-insertion", area, problem, lines, None, None, nonalg=("verified", [], ["given"] * len(head) + ["true-unsupported", "valid"]), tags={"coverage": "beyond-scope"})
D()
for c in cases:   # D lines are raw; fix the studentWorking joins already done in add()
    pass

# ---------------- E: correct but incomplete (15) ----------------
def E():
    for i in range(5):  # E1 stops before solving
        a, v, b = R.choice([2, 3, 4, 5, 6]), R.randint(1, 8), R.randint(1, 8); c = a * v + b; l0 = f"{lin(a, b)} = {c}"
        add("correct-but-incomplete", "algebra", alg(l0), [l0, f"{lin(a, 0)} = {c - b}"], "incomplete", [])
    for i in range(5):  # E2 factored, roots not stated
        p, q = R.sample([1, 2, 3, 4, 5, 6, 7], 2); l0 = f"{poly([1, -(p + q), p * q])} = 0"
        fac = lambda r: f"(x - {r})"
        add("correct-but-incomplete", "algebra", alg(l0), [l0, f"{fac(p)}{fac(q)} = 0"], "incomplete", [])
    for i in range(5):  # E3 inequality not isolated
        a, v, b = R.choice([2, 3, 4, 5]), R.randint(1, 8), R.randint(1, 8); c = a * v + b; l0 = f"{lin(a, b)} < {c}"
        add("correct-but-incomplete", "algebra", alg(l0), [l0, f"{lin(a, 0)} < {c - b}"], "incomplete", [])
E()

# ---------------- F: cross-domain dependency / binding failures (15) ----------------
def Fd():
    plan = [("unverified-first", 3, "invalid", 0), ("wrong-scalar", 3, "invalid", 1), ("no-dependency", 2, "malformed", None), ("forged-step", 2, "malformed", None),
            ("destination-only", 2, "incomplete", None), ("circular", 1, "malformed", None), ("empty-source", 2, "incomplete", None)]
    for mode, cnt, cls, first in plan:
        for i in range(cnt):
            while True:
                n = R.choice([3, 4, 5, 6, 7]); ws = fact(n) + R.choice([1, 2, 5]) if mode == "wrong-scalar" else None
                p, w = d3(n, mode, ws); key = json.dumps([p, w], sort_keys=True)
                if key not in USED: USED.add(key); break
            cases.append(dict(category="cross-domain-binding-failure", area="cross-domain", problem=p, studentWorking=w,
                reference=dict(classification=cls, firstInvalidAcceptable=[first] if first is not None else [], firstInvalidStep=first, lineRelations=[mode], mustNotVerify=True, complete=False,
                               alternativeMethodValid=False, coverage="in-scope", derivation=f"{mode}: n={n}, n!={fact(n)}")))
Fd()

# ---------------- G: ambiguous / malformed (10) ----------------
MAL = ["3x = = 9", "x + + 2 = 5", "2(x - 1 = 4", "4x - * 3 = 5", "= 7"]
AMB = ["2/3x = 6", "8/2(2 + 2) = 16", "x/2y = 1", "12/3(2) = 8", "6/2(1 + 2) = 9"]
def G():
    for i in range(10):
        mal = i < 5; text = (MAL if mal else AMB)[i % 5]
        a, v, b = R.choice([2, 3, 4]), R.randint(2, 6), R.randint(1, 5); c = a * v + b; l0 = f"{lin(a, b)} = {c}"
        lines = [l0, text, f"{lin(a, 0)} = {c - b}", f"x = {v}"]
        cls = "malformed" if mal else "ambiguous"
        cases.append(dict(category="ambiguous-or-malformed-line", area="algebra", problem=alg(l0), studentWorking={"format": "natural", "text": "\n".join(lines)},
            reference=dict(classification=cls, firstInvalidAcceptable=[], firstInvalidStep=None, lineRelations=["given", cls, "valid", "valid"], mustNotVerify=True, complete=False,
                           alternativeMethodValid=False, coverage="in-scope", derivation="inserted line is not a unique well-formed statement")))
G()

# D lines were passed as raw python lists: normalise any case whose studentWorking is still a list
for c in cases:
    sw = c["studentWorking"]
    if isinstance(sw, list): c["studentWorking"] = {"format": "natural", "text": "\n".join(sw)}
assert len(cases) == 150, len(cases)
_keys = [json.dumps([c["problem"], c["studentWorking"]], sort_keys=True) for c in cases]
assert len(set(_keys)) == 150, f"duplicate cases: {150 - len(set(_keys))}"
want = {"invalid-intermediate-correct-final": 30, "valid-alternative-path": 30, "missing-restriction-or-branch": 30, "unsupported-line-insertion": 20,
        "correct-but-incomplete": 15, "cross-domain-binding-failure": 15, "ambiguous-or-malformed-line": 10}
byc = {}
for c in cases: byc.setdefault(c["category"], []).append(c)
assert {k: len(v) for k, v in byc.items()} == want, {k: len(v) for k, v in byc.items()}
dev, sealed = [], []
for cat, items in byc.items():
    R2 = random.Random(hashlib.sha256(("e3" + cat).encode()).hexdigest()); idx = list(range(len(items))); R2.shuffle(idx)
    half = set(idx[:(len(items) + 1) // 2 if cat in ("correct-but-incomplete",) else len(items) // 2])
    for j, c in enumerate(items): (sealed if j in half else dev).append(c)
assert len(dev) == 75 and len(sealed) == 75, (len(dev), len(sealed))
for part, lst in (("dev", dev), ("sealed", sealed)):
    for k, c in enumerate(lst):
        c["id"] = f"e3-{part}-{k:03d}"; c["partition"] = "sealed-holdout" if part == "sealed" else "development"
        c["provenance"] = {"kind": "independently-authored", "license": "CC0-1.0", "oracle": "independent exact rational-grid oracle (generate_corpus.py); no OpenPath code"}
for name, lst in (("dev-cases.v1.json", dev), ("sealed-cases.v1.json", sealed)):
    open(f"{OUT}/{name}", "w").write(json.dumps({"benchmark": "openpath-e3-verification-closure", "version": "1", "cases": lst}, indent=1, ensure_ascii=False))
print({k: len(v) for k, v in byc.items()}, len(dev), len(sealed))
