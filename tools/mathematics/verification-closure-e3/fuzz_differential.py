#!/usr/bin/env python3
"""E3 differential fuzz: 2-line workings [S1, S2] whose set relation is decided by the INDEPENDENT rational-grid oracle of
generate_corpus.py (never by OpenPath). Output fuzz/fuzz-cases.v1.json; consumed by independent-checker.test.ts.
Deterministic (seed 20261029)."""
import json, random, re, sys
from fractions import Fraction as F
src = open(__file__.rsplit("/", 1)[0] + "/generate_corpus.py").read()
ns = {"F": F, "re": re, "json": json}
exec(src[src.index("# ---------------- independent oracle"):src.index("# ---------------- formatting helpers")], ns)
exec(src[src.index("# ---------------- formatting helpers"):src.index("cases = []")], ns)
truth, extras, GRID, frac, poly, term = ns["truth"], ns["extras"], ns["GRID"], ns["frac"], ns["poly"], ns["term"]
R = random.Random(20261029)
def rt(): return F(R.choice([-6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6]), R.choice([1, 1, 1, 2, 3]))
def fac(r):  # (x - r) as text
    r = F(r)
    if r == 0: return "x"
    return f"(x - {frac(r)})" if r > 0 else f"(x + {frac(-r)})"
def pcoeffs(roots, k=1):  # k * prod (x - r)  (low->high)
    c = [F(k)]
    for r in roots:
        n = [F(0)] * (len(c) + 1)
        for i, v in enumerate(c): n[i + 1] += v; n[i] -= v * r
        c = n
    return c
def ptext(cs):  # low->high -> text
    parts = []
    for p in range(len(cs) - 1, -1, -1):
        v = cs[p]
        if v == 0: continue
        a = abs(v); lit = frac(a)
        body = lit if p == 0 else ("x" if p == 1 and a == 1 else (f"{lit}x" if p == 1 else (f"x^{p}" if a == 1 else f"{lit}x^{p}")))
        if "/" in lit and p > 0: body = f"({lit})" + ("x" if p == 1 else f"x^{p}")
        parts.append(("- " if v < 0 else ("+ " if parts else "")) + body if parts else (("-" if v < 0 else "") + body))
    return " ".join(parts) or "0"
def split_eq(cs):  # distribute terms randomly across the two sides
    L, Rr = [F(0)] * len(cs), [F(0)] * len(cs)
    for p, v in enumerate(cs):
        if v == 0: continue
        if R.random() < .5: L[p] = v
        else: Rr[p] = -v
    return f"{ptext(L)} = {ptext(Rr)}"
def stmt(kind, roots, k=None):
    k = k or R.choice([1, 1, 2, 3, -1, -2, F(1, 2)])
    if kind == "poly": return split_eq(pcoeffs(roots, k))
    if kind == "factored": return (f"{frac(k)}" if k != 1 else "") + "".join(fac(r) for r in roots) + " = 0" if k != 1 else "".join(fac(r) for r in roots) + " = 0"
    if kind == "list": return " or ".join(f"x = {frac(r)}" for r in sorted(set(roots)))
    if kind == "hole": c = rt(); return f"({ptext(pcoeffs(roots + [c]))})/{fac(c)} = 0" if False else f"{''.join(fac(r) for r in roots + [c])}/{fac(c)} = 0"
    raise ValueError(kind)
def perturb(roots):
    m = R.choice(["same", "same", "drop", "add", "swap"])
    if m == "same" or (len(roots) == 1 and m == "drop"): return list(roots)
    if m == "drop": r = list(roots); r.pop(R.randrange(len(r))); return r
    if m == "add": return list(roots) + [rt()]
    r = list(roots); r[R.randrange(len(r))] = rt(); return r
cases = []
def rel(a, b):
    grid = sorted(set(GRID) | extras(a) | extras(b)); A, B = truth(a, grid), truth(b, grid)
    return "equal" if A == B else ("subset" if A < B else ("superset" if A > B else "incomparable"))
tries = 0
while len(cases) < 1400 and tries < 20000:
    tries += 1
    roots = [rt() for _ in range(R.choice([1, 2, 2, 3]))]
    if len(set(roots)) < len(roots): continue
    k1, k2 = R.choice(["poly", "factored", "poly"]), R.choice(["poly", "factored", "list", "hole", "poly"])
    s1 = stmt(k1, roots); r2 = perturb(roots)
    if not r2: continue
    try: s2 = stmt(k2, r2)
    except Exception: continue
    if len(set(r2)) < len(r2): continue
    try: relation = rel(s1, s2)
    except Exception: continue
    cases.append({"problem": s1, "line": s2, "relation": relation, "kinds": [k1, k2]})
# abs / sqrt / inequality families
for _ in range(500):
    a, k = rt(), R.choice([1, 2, 3, 4, 5]); t = R.choice(["abs", "sqrt", "ineq", "absineq"])
    if t == "abs":
        p = f"|x - {frac(a)}| = {k}" if a > 0 else f"|x + {frac(-a)}| = {k}" if a < 0 else f"|x| = {k}"
        l = R.choice([f"x = {frac(a + k)}", f"x = {frac(a - k)}", f"x = {frac(a + k)} or x = {frac(a - k)}", f"x = {frac(a + k + 1)}"])
    elif t == "absineq":
        p = f"|x| < {k}"; l = R.choice([f"x < {k}", f"x > -{k}", f"x < {k + 1}", f"x < {k} or x > -{k}"])
    elif t == "sqrt":
        d = R.randint(0, 4); q_ = R.randint(0, 9); p_ = R.randint(1, 3)
        p = f"sqrt({p_}x + {q_}) = x - {d}" if d else f"sqrt({p_}x + {q_}) = x"
        l = R.choice([f"{p_}x + {q_} = (x - {d})^2" if d else f"{p_}x + {q_} = x^2", f"x - {d} = {p_}x + {q_}"])
    else:
        c = R.choice([1, 2, 3, -1, -2]); b = R.randint(-5, 5); v = rt(); op = R.choice(["<", ">", "<=", ">="])
        p = f"{ptext([F(b), F(c)])} {op} {frac(c * v + b)}"; l = R.choice([f"x {op} {frac(v)}", f"x {({'<': '>', '>': '<', '<=': '>=', '>=': '<='})[op]} {frac(v)}", f"{ptext([F(0), F(c)])} {op} {frac(c * v)}"])
    try: relation = rel(p, l)
    except Exception: continue
    cases.append({"problem": p, "line": l, "relation": relation, "kinds": [t]})
json.dump({"benchmark": "e3-differential-fuzz", "seed": 20261029, "cases": cases}, open(sys.argv[1] if len(sys.argv) > 1 else "fuzz/fuzz-cases.v1.json", "w"), indent=0)
import collections; print(len(cases), collections.Counter(c["relation"] for c in cases))
