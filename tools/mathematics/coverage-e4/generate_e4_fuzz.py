"""E4 differential fuzz corpus. Independent of OpenPath: every expected relation is computed by e4_oracle.py (own parser, Fractions and 80-digit Decimals).
Two kinds of cases:
  * "line": a problem statement and ONE candidate line; expected relation between the problem's solution set and the line's (equal/widening/narrowing/incomparable);
    randomized rational coefficients, renamed symbols, radical / two-radical / rational / polynomial (rational and irrational roots) families.
  * "system": a linear system, a candidate line, and the expected status of the line (implied / partial / false) computed by exact Fraction elimination.
Deterministic (seed 20261102). Output: fuzz/e4-fuzz-cases.v1.json
"""
import json, random, sys, os, re, hashlib
from fractions import Fraction as F
from decimal import Decimal
sys.path.insert(0, os.path.dirname(__file__))
from e4_oracle import *

R = random.Random(20261102)
NAMES = ["x", "y", "t", "u", "m", "z", "w", "k"]

def lin(a, b, v):
    """a*v + b as text, with a, b ints"""
    if a == 0: return str(b)
    t = (f"{a}{v}" if abs(a) != 1 else (v if a == 1 else f"-{v}"))
    return t if b == 0 else (f"{t} + {b}" if b > 0 else f"{t} - {-b}")

def roots_quadratic(A, B, C):
    d = B * B - 4 * A * C
    if d < 0: return []
    s = D(d).sqrt()
    return [(-D(B) + s) / (2 * D(A)), (-D(B) - s) / (2 * D(A))]

def universe_for(lines, var, extra_dec):
    ex = list(extra_dec)
    for ln in lines:
        try: ex += find_roots(ln, var)
        except Exception: pass
        ex += branch_values(ln, var)
    return make_universe(ex)

def mk_line_case(problem, line, var, designed):
    lines = [problem, line]
    try:
        U = universe_for(lines, var, designed)
        S0 = line_truth(problem, var, U); S1 = line_truth(line, var, U)
        if unseen_root_scan([l for l in lines if "or" not in l and "±" not in l], var, U): return None
    except (Undef, ValueError, ZeroDivisionError): return None
    if not any(S0) and not any(S1) and R.random() < 0.7: return None   # keep some empty/empty but not many
    return {"kind": "line", "problem": problem, "line": line, "relation": relation(S0, S1), "var": var}

def gen_radical_linear(v):
    a, b = R.randint(1, 5), R.randint(-6, 9); c, d = R.choice([1, 2, -1, 3, -2]), R.randint(-6, 6)
    prob = f"sqrt({lin(a, b, v)}) = {lin(c, d, v)}"
    # squared: a v + b = (c v + d)^2 -> c^2 v^2 + (2cd - a) v + d^2 - b = 0
    A, B, C = c * c, 2 * c * d - a, d * d - b
    designed = roots_quadratic(A, B, C)
    cands = [f"{lin(a, b, v)} = ({lin(c, d, v)})^2", f"{lin(a, b, v)} = {lin(c, d, v)}", f"{lin(c, d, v)} = {lin(a, b, v)}",
             f"{lin(A, 0, v).replace(v, v + '^2') if A != 1 else v + '^2'} + {B}{v} + {C} = 0".replace("+ -", "- "),
             f"{v} = {R.randint(-4, 6)}", f"{v} = {R.randint(-4, 6)} or {v} = {R.randint(-4, 6)}"]
    dd = B * B - 4 * A * C
    if dd >= 0:
        cands.append(f"{v} = ({-B} + sqrt({dd}))/{2 * A} or {v} = ({-B} - sqrt({dd}))/{2 * A}")
        cands.append(f"{v} = ({-B} + sqrt({dd}))/{2 * A}")
        cands.append(f"{v} = ({-B} ± sqrt({dd}))/{2 * A}")
    return prob, cands, designed

def gen_radical_two(v):
    a, b = R.randint(0, 9), R.randint(1, 12)
    if a == b: b += 1
    c = R.randint(2, 6)
    prob = f"sqrt({v} + {a}) + sqrt({v} + {b}) = {c}" if a else f"sqrt({v}) + sqrt({v} + {b}) = {c}"
    A = f"sqrt({v} + {a})" if a else f"sqrt({v})"; B = f"sqrt({v} + {b})"
    # (c^2 - a - b - 2v)^2 = 4 (v+a)(v+b)
    # expand: 4v^2 + ... -> use designed numeric root solution: solve exactly via the linear equation after squaring twice:
    # c^2 - (a+b) - 2v = 2 sqrt((v+a)(v+b)) ; squaring: (c^2-a-b-2v)^2 = 4(v+a)(v+b) -> linear in v (leading terms cancel)
    k = c * c - a - b
    # (k - 2v)^2 = 4(v^2 + (a+b)v + ab) -> k^2 - 4kv = 4(a+b)v + 4ab -> v = (k^2 - 4ab)/(4k + 4(a+b))
    den = 4 * k + 4 * (a + b)
    designed = [D(F(k * k - 4 * a * b, den).numerator) / D(F(k * k - 4 * a * b, den).denominator)] if den else []
    cands = [f"{A} = {c} - {B}", f"{c} - {B} = {A}", f"{v} + {a} = {c * c} - {2 * c}*{B} + {v} + {b}", f"{2 * c}*{B} = {c * c + b - a}",
             f"{v} = {R.randint(-3, 12)}", f"{v} = {F(k * k - 4 * a * b, den) if den else 0}"]
    return prob, cands, designed

def gen_radical_equal(v):
    a, b, c, d = R.randint(1, 6), R.randint(-9, 9), R.randint(1, 6), R.randint(-9, 9)
    if a == c: c += 1
    prob = f"sqrt({lin(a, b, v)}) = sqrt({lin(c, d, v)})"
    r = F(d - b, a - c)
    cands = [f"{lin(a, b, v)} = {lin(c, d, v)}", f"{v} = {r}", f"{lin(a - c, b - d, v)} = 0", f"{v} = {R.randint(-5, 9)}", f"{lin(a, b, v)} >= 0"]
    return prob, cands, [D(r.numerator) / D(r.denominator)]

def gen_rational(v):
    k = R.randint(1, 7); sgn = R.choice([1, -1]); m = sgn * k
    prob = f"({v}^2 - {k * k})/({v} - {m}) = {v} + {m}" if sgn == 1 else f"({v}^2 - {k * k})/({v} + {k}) = {v} - {k}"
    hole = m
    cands = [f"{v} + {m} = {v} + {m}" if sgn == 1 else f"{v} - {k} = {v} - {k}", f"{v}^2 - {k * k} = ({v} + {m})*({v} - {m})",
             f"{v} != {hole}", f"{v} = {hole}", f"{v} = {R.randint(-6, 6)}", f"{v} + {m} = {v} + {m}, {v} != {hole}" if sgn == 1 else f"{v} - {k} = {v} - {k}, {v} != {hole}"]
    if R.random() < 0.5:
        p, q_, s, r_ = R.randint(1, 5), R.randint(-5, 5), R.randint(1, 4), R.randint(1, 5)
        prob = f"({lin(p, q_, v)})/({v} + {r_}) = {s}"
        cands = [f"{lin(p, q_, v)} = {s}*({v} + {r_})", f"{lin(p, q_, v)} = {s}{v} + {s * r_}", f"{v} = {F(s * r_ - q_, p - s) if p != s else 0}", f"{v} != {-r_}", f"{lin(p - s, q_ - s * r_, v)} = 0"]
        designed = []
        if p != s: x0 = F(s * r_ - q_, p - s); designed = [D(x0.numerator) / D(x0.denominator)]
        return prob, cands, designed
    return prob, cands, [D(hole)]

def gen_polynomial(v):
    kind = R.choice(["rational", "surd"])
    if kind == "rational":
        r1, r2 = R.randint(-6, 6), R.randint(-6, 6)
        A = R.choice([1, 1, 2])
        B, C = -A * (r1 + r2), A * r1 * r2
        prob = f"{lin(A, 0, v).replace(v, v + '^2') if A != 1 else v + '^2'} + {B}{v} + {C} = 0".replace("+ -", "- ")
        cands = [f"{v} = {r1} or {v} = {r2}", f"{v} = {r1}", f"{v} = {R.randint(-6, 6)}", f"({v} - {r1})({v} - {r2}) = 0", f"{v} = {r1} or {v} = {r2} or {v} = {R.randint(-6, 6)}"]
        return prob, cands, [D(r1), D(r2)]
    A, B, C = 1, R.randint(-7, 7), R.randint(-9, 4)
    dd = B * B - 4 * A * C
    prob = f"{v}^2 + {B}{v} + {C} = 0".replace("+ -", "- ")
    cands = [f"{v} = ({-B} + sqrt({dd}))/2 or {v} = ({-B} - sqrt({dd}))/2", f"{v} = ({-B} ± sqrt({dd}))/2", f"{v} = ({-B} + sqrt({dd}))/2", f"{v} = {R.randint(-5, 5)}",
             f"({v} + {F(B, 2)})^2 = {F(dd, 4)}"]
    designed = roots_quadratic(A, B, C)
    return prob, cands, designed

GEN = [gen_radical_linear] * 3 + [gen_radical_two] * 2 + [gen_radical_equal] * 2 + [gen_rational] * 2 + [gen_polynomial] * 2

def line_cases(n):
    out, seen = [], set()
    tries = 0
    while len(out) < n and tries < n * 40:
        tries += 1
        v = R.choice(NAMES); g = R.choice(GEN)
        try: prob, cands, designed = g(v)
        except Exception: continue
        line = R.choice(cands)
        key = (prob, line)
        if key in seen: continue
        seen.add(key)
        c = mk_line_case(prob, line, v, designed)
        if c: out.append(c)
    return out

# ----------------------------------------------------------------------------- linear systems (exact Fractions)
def solve(rows, n):
    M = [r[:] for r in rows]; piv = []; r = 0
    for c in range(n):
        p = next((i for i in range(r, len(M)) if M[i][c] != 0), None)
        if p is None: continue
        M[r], M[p] = M[p], M[r]; M[r] = [x / M[r][c] for x in M[r]]
        for i in range(len(M)):
            if i != r and M[i][c] != 0: f = M[i][c]; M[i] = [a - f * b for a, b in zip(M[i], M[r])]
        piv.append(c); r += 1
    for i in range(r, len(M)):
        if M[i][n] != 0: return None, None
    x = [F(0)] * n
    for i, c in enumerate(piv): x[c] = M[i][n]
    return x, len(piv)

def eq_text(coefs, names, const):
    parts = []
    for c, nm in zip(coefs, names):
        if c == 0: continue
        t = (nm if abs(c) == 1 else f"{abs(c)}{nm}")
        parts.append(("-" if c < 0 else "+") + t)
    s = " ".join(parts) if parts else "0"
    s = s.replace("+", "", 1).strip() if s.startswith("+") else s
    s = re.sub(r"([+-])", r" \1 ", s).replace("  ", " ").strip()
    if s.startswith("- "): s = "-" + s[2:]
    return f"{s} = {const}"

def system_cases(n):
    out = []
    while len(out) < n:
        k = R.choice([2, 2, 3]); names = R.sample(NAMES, k)
        sol = [F(R.randint(-6, 6)) for _ in range(k)]
        rows = []
        for _ in range(k):
            co = [R.randint(-5, 5) for _ in range(k)]
            if all(c == 0 for c in co): co[0] = 1
            rows.append([F(c) for c in co] + [sum(F(c) * s for c, s in zip(co, sol))])
        # make rank full most of the time
        x, rank = solve(rows, k)
        if x is None or rank is None: continue
        stmt = " and ".join(eq_text([int(c) for c in r[:k]], names, int(r[k])) for r in rows)
        # candidate line
        mode = R.choice(["combo", "combo", "wrong", "single", "pair", "pair_wrong"])
        if mode == "combo":
            ws = [R.randint(-3, 3) for _ in rows]
            if all(w == 0 for w in ws): ws[0] = 1
            co = [sum(w * r[j] for w, r in zip(ws, rows)) for j in range(k + 1)]
            line = eq_text([int(c) for c in co[:k]], names, int(co[k])); truth = "implied"
        elif mode == "wrong":
            co = [R.randint(-4, 4) for _ in range(k)]; c0 = int(sum(F(a) * s for a, s in zip(co, sol))) + R.choice([-2, -1, 1, 2, 3])
            if all(c == 0 for c in co): continue
            line = eq_text(co, names, c0); truth = "false"
        elif mode == "single":
            i = R.randrange(k); val = sol[i] if R.random() < 0.6 else sol[i] + R.choice([-1, 1, 2])
            line = f"{names[i]} = {val}"; truth = "implied" if val == sol[i] else "false"
        elif mode == "pair":
            line = " and ".join(f"{nm} = {s}" for nm, s in zip(names, sol)); truth = "implied"
        else:
            vals = [s + (R.choice([0, 1, -1]) if i == 0 else 0) for i, s in enumerate(sol)]
            line = " and ".join(f"{nm} = {s}" for nm, s in zip(names, vals)); truth = "implied" if vals == sol else "false"
        if "= 0 = " in line: continue
        out.append({"kind": "system", "problem": stmt, "line": line, "status": truth, "vars": names})
    return out

if __name__ == "__main__":
    N = int(sys.argv[1]) if len(sys.argv) > 1 else 400
    cases = line_cases(N) + system_cases(N // 4)
    for i, c in enumerate(cases): c["id"] = f"e4-fuzz-{i + 1:04d}"
    os.makedirs(os.path.join(os.path.dirname(__file__), "fuzz"), exist_ok=True)
    path = os.path.join(os.path.dirname(__file__), "fuzz", "e4-fuzz-cases.v1.json")
    body = json.dumps({"contract": "e4-differential-fuzz@1", "seed": 20261102, "oracle": "tools/mathematics/coverage-e4/e4_oracle.py (Fractions + 80-digit Decimal; no OpenPath code)", "cases": cases}, indent=1)
    open(path, "w").write(body)
    print(len(cases), "cases", hashlib.sha256(body.encode()).hexdigest())
