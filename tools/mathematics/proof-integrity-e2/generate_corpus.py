#!/usr/bin/env python3
"""E2 fresh adversarial corpus (200 cases). References are established by independent exact arithmetic
(fractions.Fraction) and analytic knowledge; this script never imports or calls the OpenPath engine.
Output: dev-cases.v1.json (100), sealed-cases.v1.json (100). Deterministic (seed 20261027)."""
import json, random, hashlib, sys
from fractions import Fraction as F
R = random.Random(20261027)
OUT = sys.argv[1] if len(sys.argv) > 1 else "."
cases = []

def add(cat, area, problem, working, ref, deriv):
    cases.append(dict(category=cat, area=area, problem=problem, studentWorking=working, reference=ref, derivation=deriv))

def nat(lines): return {"format": "natural", "text": "\n".join(lines)}
def lt(kind, **k): return dict(kind=kind, **k)
def ref(cls, first, line_truth, must_not_verify, complete=None, alt=False, missing=None):
    return dict(classification=cls, firstInvalidStep=first, lineTruth=line_truth, mustNotVerify=must_not_verify,
                complete=(cls == "verified") if complete is None else complete, alternativeMethodValid=alt, missing=missing or [])
def coef(c, v="x"):
    if c == 1: return v
    return f"{c}{v}"

# ---------- A: invalid intermediate steps, correct final answers (50) ----------
def A():
    for i in range(18):  # A1 linear algebra
        a = R.choice([2, 3, 4, 5, 6, 7]); v = R.choice([x for x in range(-6, 9) if x not in (0,)]); b = R.choice([x for x in range(1, 9)])
        c = a * v + b
        bad_kind = i % 3
        l0 = f"{coef(a)} + {b} = {c}"; mid_ok = f"{coef(a)} = {c - b}"
        bad = [f"{coef(a)} = {c + b}", f"{coef(a)} = {c - b + a}", f"{coef(a)} = {b - c}"][bad_kind]
        assert F(c + b, a) != v and F(c - b + a, a) != v and F(b - c, a) != v
        final = f"x = {v}"
        lines = [l0, bad, final]; truth = ["given", "invalid", "valid-in-isolation"]; first = 1
        if i % 2:  # 4-line variant with an extra correct-looking line after the bad one
            lines = [l0, bad, f"x = {F(c + b, a) if bad_kind == 0 else F(c-b+a, a) if bad_kind == 1 else F(b-c, a)}", final]
            truth = ["given", "invalid", "follows-from-invalid", "valid-in-isolation"]
        add("invalid-intermediate-correct-final", "algebra", {"domain": "algebra", "statement": l0}, nat(lines),
            ref("invalid", first, truth, True), f"solution of '{l0}' is x={v}; line 2 has solution {bad}, differing from x={v}")
    for i in range(10):  # A2 function evaluation
        a = R.choice([2, 3, 4, 5]); p = R.choice([2, 3, 4, 5, 6]); q = R.choice([1, 2, 3, 4, 5]); val = a * a + p * a + q
        bad = f"f({a}) = {a}^2 + {p} + {q}"; assert a * a + p + q != val
        lines = [f"f(x) = x^2 + {p}x + {q}", bad, f"f({a}) = {a}^2 + {p}({a}) + {q}", f"f({a}) = {val}"]
        add("invalid-intermediate-correct-final", "functions", {"domain": "function", "task": "evaluate", "f": {"kind": "polynomial", "coefficients": [str(q), str(p), "1"]}, "input": str(a)},
            nat(lines), ref("invalid", 1, ["given", "invalid", "valid", "valid"], True), f"line 2 evaluates to {a*a+p+q}, f({a})={val}")
    tri = [(3, 4, 5), (5, 12, 13), (8, 15, 17), (6, 8, 10), (20, 21, 29), (7, 24, 25)]
    for i, (x, y, h) in enumerate(tri):  # A3 complex modulus
        sx = (-1) ** (i % 2); sy = (-1) ** ((i // 2) % 2)
        zs = f"z = {sx*x} {'+' if sy > 0 else '-'} {y}i"
        assert (x + y) != h
        add("invalid-intermediate-correct-final", "complex", {"domain": "complex-polynomial", "area": "arithmetic", "task": "modulus", "data": {"a": {"re": str(sx * x), "im": str(sy * y)}}},
            nat([zs, f"|z| = {x}+{y}", f"|z| = {h}"]), ref("invalid", 1, ["given", "invalid", "valid-in-isolation"], True), f"|z|=sqrt({x}^2+{y}^2)={h}; line 2 is {x+y}")
    for i in range(8):  # A4 determinant
        a, b, c, d = [R.choice([1, 2, 3, 4, 5]) for _ in range(4)]; det = a * d - b * c
        bad_t = f"det(A) = {a}*{d} + {b}*{c}"; assert a * d + b * c != det
        add("invalid-intermediate-correct-final", "matrices", {"domain": "linear-algebra", "area": "matrix", "task": "determinant", "data": {"a": [[str(a), str(b)], [str(c), str(d)]]}},
            nat([f"A = [[{a},{b}],[{c},{d}]]", bad_t, f"det(A) = {det}"]), ref("invalid", 1, ["given", "invalid", "valid-in-isolation"], True), f"det={det}; line2={a*d+b*c}")
    for i in range(4):  # A5 derivative of power
        n = R.choice([3, 4, 5, 6, 7])
        add("invalid-intermediate-correct-final", "calculus", {"domain": "calculus", "task": "derivative", "expression": {"kind": "power", "base": {"kind": "variable", "name": "x"}, "exponent": n}, "variable": "x"},
            nat([f"f(x) = x^{n}", f"f'(x) = {n}x^{n}", f"f'(x) = {n}x^{n-1}"]), ref("invalid", 1, ["given", "invalid", "valid-in-isolation"], True), f"d/dx x^{n}={n}x^{n-1}")
    for i in range(4):  # A6 mean
        vals = [R.randint(1, 9) for _ in range(3)]; s = sum(vals)
        while s % 3: vals = [R.randint(1, 9) for _ in range(3)]; s = sum(vals)
        wrong = s + 3
        add("invalid-intermediate-correct-final", "statistics", {"domain": "probability-statistics", "area": "statistics", "task": "mean", "data": {"values": [str(v) for v in vals]}},
            nat([f"mean = ({vals[0]}+{vals[1]}+{vals[2]})/3", f"mean = {wrong}/3", f"mean = {s // 3}"]), ref("invalid", 1, ["given", "invalid", "valid-in-isolation"], True), f"sum={s}")
A()

# ---------- B: silently skippable unsupported lines (30): 20 false inserted, 10 true inserted ----------
UNSUP = [  # (text, truth)
    ("sin(x)^2 + cos(x)^2 = 2", False), ("sin(x)^2 + cos(x)^2 = 1", True),
    ("lim x->0 sin(x)/x = 0", False), ("lim x->0 sin(x)/x = 1", True),
    ("∫ x dx = x^2", False), ("∫ x dx = x^2/2", True),
    ("log(8)/log(2) = 4", False), ("log(8)/log(2) = 3", True),
    ("{1,2} ∪ {2,3} = {1,3}", False), ("{1,2} ∪ {2,3} = {1,2,3}", True),
    ("2 > 3", False), ("3 > 2", True), ("d/dx sin(x) = -cos(x)", False), ("d/dx sin(x) = cos(x)", True),
]
FALSE_U = [u for u in UNSUP if not u[1]]; TRUE_U = [u for u in UNSUP if u[1]]
def host(kind):
    if kind == 0:
        a = R.choice([2, 3, 4, 5]); p = R.choice([2, 3, 4]); q = R.choice([1, 2, 3]); val = a * a + p * a + q
        return {"domain": "function", "task": "evaluate", "f": {"kind": "polynomial", "coefficients": [str(q), str(p), "1"]}, "input": str(a)}, \
            [f"f(x) = x^2 + {p}x + {q}"], [f"f({a}) = {val}"], "functions"
    if kind == 1:
        a, b, c, d = [R.choice([1, 2, 3, 4, 5]) for _ in range(4)]
        return {"domain": "linear-algebra", "area": "matrix", "task": "determinant", "data": {"a": [[str(a), str(b)], [str(c), str(d)]]}}, \
            [f"A = [[{a},{b}],[{c},{d}]]"], [f"det(A) = {a*d-b*c}"], "matrices"
    if kind == 2:
        x, y, h = R.choice([(3, 4, 5), (5, 12, 13), (8, 15, 17), (7, 24, 25)])
        return {"domain": "complex-polynomial", "area": "arithmetic", "task": "modulus", "data": {"a": {"re": str(x), "im": str(y)}}}, \
            [f"z = {x} + {y}i"], [f"|z| = {h}"], "complex"
    vals = [R.randint(1, 9) for _ in range(3)]
    while sum(vals) % 3: vals = [R.randint(1, 9) for _ in range(3)]
    return {"domain": "probability-statistics", "area": "statistics", "task": "mean", "data": {"values": [str(v) for v in vals]}}, \
        [f"mean = ({vals[0]}+{vals[1]}+{vals[2]})/3"], [f"mean = {sum(vals)//3}"], "statistics"
def B():
    hosts = [0] * 10 + [1] * 8 + [2] * 6 + [3] * 6
    for i, h in enumerate(hosts):
        problem, head, tail, area = host(h)
        if i < 20: text, truth = FALSE_U[i % len(FALSE_U)]
        else: text, truth = TRUE_U[i % len(TRUE_U)]
        lines = head + [text] + tail
        lt_ = ["given", "unsupported-true" if truth else "unsupported-false", "valid-in-isolation"]
        add("silently-skippable-unsupported-line", area, problem, nat(lines),
            ref("verified" if truth else "invalid", None if truth else 1, lt_, not truth, missing=[] if not truth else []),
            "inserted outside-scope line is " + ("true" if truth else "false") + " by standard analysis")
B()

# ---------- C: missing restrictions / branches (40) ----------
def C():
    sq = [4, 9, 16, 25, 36, 49, 64, 81, 100, 121]
    for k in sq:  # C1 x^2=k, only positive root
        r = int(k ** .5)
        add("missing-restriction-or-branch", "algebra", {"domain": "algebra", "statement": f"x^2 = {k}"}, nat([f"x^2 = {k}", f"x = {r}"]),
            ref("incomplete", None, ["given", "valid-incomplete"], True, complete=False, missing=[f"x = -{r}"]), f"solutions ±{r}")
    for a in [2, 3, 4, 5, 6, 7, 8, 9]:  # C2 cancel (x-a)
        add("missing-restriction-or-branch", "algebra", {"domain": "algebra", "statement": f"(x^2 - {a*a})/(x - {a}) = x + {a}"},
            nat([f"(x^2 - {a*a})/(x - {a}) = x + {a}", "Therefore this holds for all real x"]),
            ref("missing-assumption", None, ["given", "claim-without-restriction"], True, complete=False, missing=[f"x != {a}"]), f"identity holds only for x≠{a}")
    for p, q in [(1, 2), (2, 3), (1, 4), (2, 5), (3, 4), (1, 6), (2, 7), (3, 5)]:  # C3 quadratic one root only
        s, pr = p + q, p * q
        add("missing-restriction-or-branch", "algebra", {"domain": "algebra", "statement": f"x^2 - {s}x + {pr} = 0"},
            nat([f"x^2 - {s}x + {pr} = 0", f"(x - {p})(x - {q}) = 0", f"x = {p}"]),
            ref("incomplete", None, ["given", "valid", "valid-incomplete"], True, complete=False, missing=[f"x = {q}"]), f"roots {p},{q}")
    for a in [2, 3, 4, 5, 6, 7]:  # C4 extraneous root sqrt(x+k)=x
        k = a * a - a; b = a - 1
        add("missing-restriction-or-branch", "algebra", {"domain": "algebra", "statement": f"sqrt(x + {k}) = x"},
            nat([f"sqrt(x + {k}) = x", f"x + {k} = x^2", f"x^2 - x - {k} = 0", f"(x - {a})(x + {b}) = 0", f"x = {a} or x = -{b}"]),
            ref("invalid", 4, ["given", "valid", "valid", "valid", "invalid-extraneous"], True, missing=[f"reject x = -{b}"]), f"x=-{b} gives sqrt({-b+k})={a-0}!= -{b}")
    for k in [3, 5, 7, 9]:  # C5 |x|=k one sign
        add("missing-restriction-or-branch", "algebra", {"domain": "algebra", "statement": f"|x| = {k}"}, nat([f"|x| = {k}", f"x = {k}"]),
            ref("incomplete", None, ["given", "valid-incomplete"], True, complete=False, missing=[f"x = -{k}"]), "two branches")
    for a in [2, 3, 4, 5]:  # C6 excluded value accepted
        add("missing-restriction-or-branch", "algebra", {"domain": "algebra", "statement": f"x/(x - {a}) = {a}/(x - {a})"},
            nat([f"x/(x - {a}) = {a}/(x - {a})", f"x = {a}"]), ref("invalid", 1, ["given", "invalid-excluded"], True, missing=[f"x != {a}"]), f"x={a} makes denominator zero; no solution")
C()

# ---------- D: cross-domain dependency / binding failures (30), typed D3 stages ----------
def fact(n):
    r = 1
    for i in range(2, n + 1): r *= i
    return r
def d3(n, mode, wrong_scalar=None):
    sp = {"domain": "probability-statistics", "area": "combinatorics", "task": "factorial", "data": {"n": n, "r": 3, "a": 3, "b": 5, "intersection": 2}, "assumptions": []}
    ok = fact(n)
    two = mode == "unverified-first"
    ex_path, ex_id = (["1", "result"], "s1") if two else (["0", "result"], "s0")
    if mode == "forged-step": ex_id = "s9"
    sw = [{"id": "s0", "rule": "direct", "result": {"kind": "integer", "value": str(ok + 1 if two else ok)}, "dependencies": []}]
    if two: sw.append({"id": "s1", "rule": "direct", "result": {"kind": "integer", "value": str(ok)}, "dependencies": ["s0"]})
    if mode == "empty-source": sw = []
    sc = ok if wrong_scalar is None else wrong_scalar
    dp = {"domain": "linear-algebra", "area": "vector", "task": "scalar-multiply", "data": {"a": ["1", "2", "3"], "scalar": {"kind": "binding-reference", "bindingId": "count", "expectedType": "exact-scalar", "symbol": {"name": "n", "scope": "problem"}}}, "assumptions": []}
    src = {"id": "source", "problem": sp, "dependsOn": ["destination"] if mode == "circular" else [], "exports": [{"id": "count", "mathematicalType": "exact-scalar", "symbol": {"name": "n", "scope": "problem"}, "source": {"workingPath": ex_path, "proofStepId": ex_id}, "assumptions": [], "domainRestrictions": [], "outstandingObligations": []}]}
    dst = {"id": "destination", "problem": dp, "dependsOn": [] if mode == "no-dependency" else ["source"], "imports": [{"bindingId": "count", "expectedType": "exact-scalar", "symbol": {"name": "n", "scope": "problem"}}]}
    stages = [src, dst]
    dw = {"id": "destination", "working": [{"id": "s0", "rule": "component-wise", "result": {"kind": "vector", "value": [str(sc), str(2 * sc), str(3 * sc)]}, "dependencies": []}]}
    sub = [{"id": "source", "working": sw}, dw]
    if mode == "destination-only": sub = [dw]
    if mode == "reversed": sub = [dw, {"id": "source", "working": sw}]
    return {"domain": "d3-cross-domain", "stages": stages}, {"stages": sub}
def D():
    plan = [("unverified-first", 6, "invalid", 0), ("wrong-scalar", 6, "invalid", 1), ("no-dependency", 4, "malformed", None), ("forged-step", 4, "malformed", None),
            ("destination-only", 4, "incomplete", None), ("circular", 3, "malformed", None), ("empty-source", 3, "incomplete", None)]
    for mode, cnt, cls, first in plan:
        for i in range(cnt):
            n = R.choice([3, 4, 5, 6, 7]); ws = fact(n) + R.choice([1, 2, 5]) if mode == "wrong-scalar" else None
            p, w = d3(n, mode, ws)
            add("cross-domain-binding-failure", "cross-domain", p, w, ref(cls, first, [mode], True, complete=False), f"{mode}: n={n}, n!={fact(n)}")
D()

# ---------- E: valid alternative paths (30) ----------
def E():
    for i in range(10):  # E1 linear, alternative route
        a = R.choice([2, 3, 4, 5]); v = R.choice([1, 2, 3, 4, 5, 6]); b = R.choice([1, 2, 3, 4]); c = a * v + b
        if i % 2: lines = [f"{coef(a)} + {b} = {c}", f"x = ({c} - {b})/{a}", f"x = {v}"]
        else:
            lines = [f"{a}(x + {b}) = {a*(v+b)}", f"x + {b} = {v+b}", f"x = {v}"]; c = None
        stmt = lines[0]
        add("valid-alternative-path", "algebra", {"domain": "algebra", "statement": stmt}, nat(lines), ref("verified", None, ["given", "valid", "valid"], False, alt=True), f"x={v}")
    for i in range(6):  # E2 det, reordered products
        a, b, c, d = [R.choice([1, 2, 3, 4, 5]) for _ in range(4)]
        add("valid-alternative-path", "matrices", {"domain": "linear-algebra", "area": "matrix", "task": "determinant", "data": {"a": [[str(a), str(b)], [str(c), str(d)]]}},
            nat([f"A = [[{a},{b}],[{c},{d}]]", f"det(A) = {d}*{a} - {c}*{b}", f"det(A) = {a*d-b*c}"]), ref("verified", None, ["given", "valid", "valid"], False, alt=True), "commuted products")
    for x, y, h in [(3, 4, 5), (5, 12, 13), (8, 15, 17), (6, 8, 10)]:  # E3 modulus via sqrt
        add("valid-alternative-path", "complex", {"domain": "complex-polynomial", "area": "arithmetic", "task": "modulus", "data": {"a": {"re": str(x), "im": str(y)}}},
            nat([f"z = {x} + {y}i", f"|z| = sqrt({x}^2 + {y}^2)", f"|z| = {h}"]), ref("verified", None, ["given", "valid", "valid"], False, alt=True), "sqrt form")
    for i in range(4):  # E4 function factored substitution
        a = R.choice([2, 3, 4, 5]); p = R.choice([2, 3, 4]); q = R.choice([1, 2, 3, 4]); val = a * a + p * a + q
        add("valid-alternative-path", "functions", {"domain": "function", "task": "evaluate", "f": {"kind": "polynomial", "coefficients": [str(q), str(p), "1"]}, "input": str(a)},
            nat([f"f(x) = x^2 + {p}x + {q}", f"f({a}) = {a}({a} + {p}) + {q}", f"f({a}) = {val}"]), ref("verified", None, ["given", "valid", "valid"], False, alt=True), "factored")
    for k in [9, 16, 25]:  # E5 both branches
        r = int(k ** .5)
        add("valid-alternative-path", "algebra", {"domain": "algebra", "statement": f"x^2 = {k}"}, nat([f"x^2 = {k}", f"x^2 - {k} = 0", f"(x - {r})(x + {r}) = 0", f"x = {r} or x = -{r}"]),
            ref("verified", None, ["given", "valid", "valid", "valid"], False, alt=True), "factor difference of squares")
    for i in range(3):  # E6 mean split fractions
        vals = [R.randint(1, 9) for _ in range(3)]
        while sum(vals) % 3: vals = [R.randint(1, 9) for _ in range(3)]
        add("valid-alternative-path", "statistics", {"domain": "probability-statistics", "area": "statistics", "task": "mean", "data": {"values": [str(v) for v in vals]}},
            nat([f"mean = ({vals[0]}+{vals[1]}+{vals[2]})/3", f"mean = {vals[0]}/3 + {vals[1]}/3 + {vals[2]}/3", f"mean = {sum(vals)//3}"]), ref("verified", None, ["given", "valid", "valid"], False, alt=True), "split")
E()

# ---------- F: ambiguous / malformed intermediate lines (20) ----------
MAL = ["2x + = 4", "x = = 2", "(2x + 1 = 5", "3x +* 1 = 7", "x - = 2"]
AMB = ["1/2x = 3", "sin x^2 = 1", "6/2(1+2) = 9", "x/2y = 1", "a/b/c = 1"]
def F_():
    for i in range(20):
        mal = i < 10; text = (MAL if mal else AMB)[i % 5]; h = i % 4
        if h in (0, 1):
            a = R.choice([2, 3, 4]); v = R.choice([2, 3, 4, 5]); b = R.choice([1, 2, 3]); c = a * v + b
            problem = {"domain": "algebra", "statement": f"{coef(a)} + {b} = {c}"}; lines = [f"{coef(a)} + {b} = {c}", text, f"{coef(a)} = {c-b}", f"x = {v}"]; area = "algebra"
        elif h == 2:
            problem, head, tail, area = host(0); lines = head + [text] + tail
        else:
            problem, head, tail, area = host(1); lines = head + [text] + tail
        add("ambiguous-or-malformed-line", area, problem, nat(lines), ref("malformed" if mal else "ambiguous", None, ["given", "malformed" if mal else "ambiguous"], True, complete=False), "inserted line is not a well-formed/unambiguous claim")
F_()

assert len(cases) == 200, len(cases)
byc = {}
for c in cases: byc.setdefault(c["category"], []).append(c)
want = {"invalid-intermediate-correct-final": 50, "silently-skippable-unsupported-line": 30, "missing-restriction-or-branch": 40, "cross-domain-binding-failure": 30, "valid-alternative-path": 30, "ambiguous-or-malformed-line": 20}
assert {k: len(v) for k, v in byc.items()} == want, {k: len(v) for k, v in byc.items()}
dev, sealed = [], []
n = 0
for cat, items in byc.items():
    R2 = random.Random(hashlib.sha256(cat.encode()).hexdigest()); idx = list(range(len(items))); R2.shuffle(idx)
    half = set(idx[:len(items) // 2])
    for j, c in enumerate(items): (sealed if j in half else dev).append(c)
for part, lst in (("dev", dev), ("sealed", sealed)):
    for k, c in enumerate(lst): c["id"] = f"e2-{part}-{k:03d}"; c["partition"] = "sealed-holdout" if part == "sealed" else "development"; c["provenance"] = {"kind": "independently-authored", "license": "CC0-1.0", "oracle": "python-fractions-and-analytic-truth", "authoringVersion": "e2-v1"}
assert len(dev) == 100 and len(sealed) == 100
for name, lst in (("dev-cases.v1.json", dev), ("sealed-cases.v1.json", sealed)):
    open(f"{OUT}/{name}", "w").write(json.dumps({"benchmark": "openpath-e2-proof-integrity", "version": "1", "cases": lst}, indent=1, ensure_ascii=False))
print({k: len(v) for k, v in byc.items()}, len(dev), len(sealed))
