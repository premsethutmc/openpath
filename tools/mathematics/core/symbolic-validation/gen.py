"""Case generator. Valid transformations are built from SymPy (a different engine) or by construction from textbook identities; invalid ones
by fault injection. LABELS are never taken from the generator: every case is labelled by oracle.py (pointwise exact evaluation)."""
import json, random, re, sys
sys.path.insert(0, "/home/claude/vendor/sympy"); sys.path.insert(0, "/home/claude/vendor/mpmath")
import sympy as sp
from multiprocessing import Pool
import oracle

POOL = list("xyzabc")
def S(e): return str(e).replace("**", "^")
def style(s, rng):
    """vary how students write the same thing: implicit multiplication"""
    if rng.random() < 0.5: return s
    s = re.sub(r"(\d)\*([a-z(])", r"\1\2", s); s = re.sub(r"([a-z])\*([a-z])", r"\1\2", s); s = re.sub(r"\)\*\(", ")(", s); s = re.sub(r"([a-z])\*\(", r"\1(", s)
    return s
def lin(rng, vs, k=None, const=None):
    k = k or rng.choice([1, 2, 2, 3]); chosen = rng.sample(vs, min(k, len(vs)))
    e = sum(rng.choice([-3, -2, -1, 1, 1, 2, 3]) * sp.Symbol(v) for v in chosen)
    if const is None: const = rng.random() < 0.5
    if const: e += rng.choice([-3, -2, -1, 1, 2, 3, 4])
    return e
def br(e): return f"({S(e)})"
def pick_vars(rng, n): return rng.sample(POOL, n)
def mono(rng, vs):
    return sp.Integer(rng.choice([1, 1, 2, 3])) * sp.prod([sp.Symbol(v) ** rng.choice([1, 1, 2]) for v in rng.sample(vs, rng.choice([1, 2]))])

# ---------------- A: valid transformations (family -> (verb, problem_expr, lines))
def A(f, rng):
    vs = pick_vars(rng, rng.choice([2, 3]))
    L = lambda: lin(rng, vs)
    if f == "expand-product2": a, b = L(), L(); return "Expand", br(a) + br(b), [S(sp.expand(a * b))]
    if f == "expand-square": a = L(); return "Expand", br(a) + "^2", [S(sp.expand(a ** 2))]
    if f == "expand-product3": a, b, c = lin(rng, vs, 1), L(), L(); return "Expand", br(a) + br(b) + br(c), [S(sp.expand(a * b * c))]
    if f == "expand-cube": a, b = sp.Symbol(vs[0]), lin(rng, vs[1:] or vs, 1); return "Expand", br(a + b) + "^3", [S(sp.expand((a + b) ** 3))]
    if f == "diff-squares": p, q = lin(rng, vs, 1, False), lin(rng, vs, 1, False); return "Factorise", S(sp.expand(p ** 2 - q ** 2)), [br(sp.expand(p - q)) + br(sp.expand(p + q))] if p != q else None
    if f == "common-factor": m, a, b = mono(rng, vs), L(), L(); return "Factorise", S(sp.expand(m * (a + b))), [S(m) + br(a + b)]
    if f == "grouping": a, b, x, y = [sp.Symbol(v) for v in rng.sample(POOL, 4)]; return "Factorise", f"{a}*{x}+{a}*{y}+{b}*{x}+{b}*{y}", [rng.choice([f"({a}+{b})({x}+{y})", f"{a}({x}+{y})+{b}({x}+{y})"])]
    if f == "sum-diff-cubes": p, q = [sp.Symbol(v) for v in rng.sample(POOL, 2)]; sg = rng.choice([1, -1]); return "Factorise", S(sp.expand(p ** 3 + sg * q ** 3)), [f"({p}{'+' if sg == 1 else '-'}{q})({p}^2{'-' if sg == 1 else '+'}{p}*{q}+{q}^2)"]
    if f == "collect": ms = [mono(rng, vs) * rng.choice([1, -1]) for _ in range(rng.choice([4, 5]))]; ms += [ms[0] * rng.choice([2, -1, 3]), ms[1]]; rng.shuffle(ms); p = "+".join(S(m) for m in ms).replace("+-", "-"); return "Simplify", p, [S(sp.expand(sum(ms)))]
    if f == "rational-add": a, b = L(), L(); return "Simplify", f"1/({S(a)})+1/({S(b)})", [f"({S(a + b)})/({br(a)}{br(b)})"[0:] if False else f"({S(sp.expand(a + b))})/({br(a)}{br(b)})"]
    if f == "rational-add-letters": a, b, c, d = [sp.Symbol(v) for v in rng.sample(POOL, 4)]; return "Simplify", f"{a}/{b}+{c}/{d}", [f"({a}{d}+{b}{c})/({b}{d})"]
    if f == "power-laws": x, y = vs[0], vs[1]; p, q, r, s = [rng.randint(1, 4) for _ in range(4)]; return "Simplify", f"{x}^{p}*{x}^{q}*{y}^{r}*{y}^{s}", [f"{x}^{p + q}*{y}^{r + s}"]
    if f == "square-difference-expand": p, q = lin(rng, vs, 1, False), lin(rng, vs, 1, False); return "Simplify", f"({S(p + q)})^2-({S(p - q)})^2", [S(sp.expand(4 * p * q))]
    if f == "two-line-expand": a, b = L(), L(); ta = sp.Add.make_args(sp.expand(a)); mid = "+".join(f"{br(t)}{br(b)}" for t in ta).replace("+-", "-"); return "Expand", br(a) + br(b), [mid, S(sp.expand(a * b))]
    if f == "rational-multiply": a, b, c, d = [sp.Symbol(v) for v in rng.sample(POOL, 4)]; return "Simplify", f"({a}/{b})*({c}/{d})", [f"({a}{c})/({b}{d})"]
    if f == "expand-collect": a, b = L(), L(); return "Expand", f"{br(a)}^2-{br(b)}^2", [S(sp.expand(a ** 2 - b ** 2))]
    if f == "factor-then-expand-check": a, b = lin(rng, vs, 1, False), lin(rng, vs, 1, False); return "Expand", f"({S(a)}+{S(b)})({S(a)}-{S(b)})", [S(sp.expand(a ** 2 - b ** 2))] if a != b else None
    return None
A_FAMS = ["expand-product2", "expand-square", "expand-product3", "expand-cube", "diff-squares", "common-factor", "grouping", "sum-diff-cubes", "collect", "rational-add", "rational-add-letters", "power-laws", "square-difference-expand", "two-line-expand", "rational-multiply", "expand-collect", "factor-then-expand-check"]

# ---------------- B: invalid transformations (fault injection; labels from the oracle)
def B(f, rng):
    vs = pick_vars(rng, rng.choice([2, 3])); L = lambda: lin(rng, vs); x, y = [sp.Symbol(v) for v in vs[:2]]
    if f == "square-of-sum": a, b = L(), L(); return "Expand", br(a + b) + "^2", [S(sp.expand(a ** 2 + b ** 2))]
    if f == "square-of-diff": a, b = lin(rng, vs, 1, False), lin(rng, vs, 1, False); return "Expand", br(a - b) + "^2", [S(sp.expand(a ** 2 - b ** 2))]
    if f == "foil-missing-cross": a, b, c, d = lin(rng, vs, 1), lin(rng, vs, 1), lin(rng, vs, 1), lin(rng, vs, 1); return "Expand", br(a + b) + br(c + d), [S(sp.expand(a * c + b * d))]
    if f == "distribute-first-only": m, a, b = mono(rng, vs), L(), L(); return "Expand", S(m) + br(a + b), [S(sp.expand(m * a) + b)]
    if f == "coefficient-off": a, b = L(), L(); e = sp.expand(a * b); t = rng.choice(sp.Add.make_args(e)); return "Expand", br(a) + br(b), [S(e + rng.choice([1, -1]) * t)]
    if f == "dropped-term": a, b = L(), L(); e = sp.expand(a * b); ts = sp.Add.make_args(e); return "Expand", br(a) + br(b), [S(sum(ts[1:]))] if len(ts) > 1 else None
    if f == "sign-flip": a, b = L(), L(); e = sp.expand(a * b); ts = list(sp.Add.make_args(e)); i = rng.randrange(len(ts)); ts[i] = -ts[i]; return "Expand", br(a) + br(b), [S(sum(ts))]
    if f == "cube-factor-wrong": p, q = x, y; return "Factorise", S(sp.expand(p ** 3 - q ** 3)), [rng.choice([f"({p}-{q})^3", f"({p}-{q})({p}^2-{p}*{q}+{q}^2)", f"({p}-{q})({p}^2+{q}^2)"])]
    if f == "diff-squares-wrong": return "Factorise", S(x ** 2 - y ** 2), [rng.choice([f"({x}-{y})^2", f"({x}+{y})^2", f"({x}-{y})({x}-{y})"])]
    if f == "cancel-added-term": a, b, c = lin(rng, vs, 1), lin(rng, vs, 1), lin(rng, vs, 1); return "Simplify", f"({S(a + b)})/({S(a + c)})", [f"({S(b)})/({S(c)})"]
    if f == "cancel-in-numerator": a, b = x, y; return "Simplify", f"({a}^2+{b})/{a}", [f"{a}+{b}"]
    if f == "add-denominators": a, b, c, d = [sp.Symbol(v) for v in rng.sample(POOL, 4)]; return "Simplify", f"{a}/{b}+{c}/{d}", [f"({a}+{c})/({b}+{d})"]
    if f == "exponent-mult": n, m = rng.randint(2, 4), rng.randint(2, 4); return "Simplify", f"{x}^{n}*{x}^{m}", [f"{x}^{n * m}"]
    if f == "power-of-power-add": n, m = rng.randint(2, 4), rng.randint(2, 4); return "Simplify", f"({x}^{n})^{m}", [f"{x}^{n + m}"]
    if f == "quotient-exp": n, m = rng.randint(4, 7), rng.randint(2, 3); return "Simplify", f"{x}^{n}/{x}^{m}", [f"{x}^{n * 1 // m}" if n // m != n - m else f"{x}^{n + m}"]
    if f == "power-of-product": n = rng.randint(2, 3); return "Simplify", f"({x}*{y})^{n}", [f"{x}*{y}^{n}"]
    if f == "power-of-coeff": n = rng.randint(2, 3); k = rng.randint(2, 3); return "Simplify", f"({k}{x})^{n}", [f"{k}{x}^{n}"]
    if f == "reciprocal-sum": a, b = L(), L(); return "Simplify", f"1/({S(a + b)})", [f"1/({S(a)})+1/({S(b)})"]
    if f == "minus-bracket": a, b, c = lin(rng, vs, 1), lin(rng, vs, 1), lin(rng, vs, 1); return "Expand", f"{S(a)}-({S(b + c)})", [f"{S(a)}-{S(b)}+{S(c)}"]
    if f == "like-terms-wrong": k, m = rng.randint(2, 4), rng.randint(2, 4); return "Simplify", f"{k}{x}+{m}{x}", [f"{k + m}{x}^2"]
    if f == "repeat-as-multiple": return "Simplify", f"{x}*{x}", [f"2{x}"]
    if f == "difference-squared-wrong": a, b = L(), L(); return "Simplify", f"({S(a + b)})^2-({S(a - b)})^2", [S(sp.expand(2 * a * b))]
    if f == "sub-sign-in-fraction": a, b, c = lin(rng, vs, 1), lin(rng, vs, 1), lin(rng, vs, 1); return "Simplify", f"({S(a)}-{S(b)})/{S(c)}", [f"({S(a)}+{S(b)})/{S(c)}"] if c != 0 else None
    return None
B_FAMS = ["square-of-sum", "square-of-diff", "foil-missing-cross", "distribute-first-only", "coefficient-off", "dropped-term", "sign-flip", "cube-factor-wrong", "diff-squares-wrong", "cancel-added-term", "cancel-in-numerator", "add-denominators", "exponent-mult", "power-of-power-add", "quotient-exp", "power-of-product", "power-of-coeff", "reciprocal-sum", "minus-bracket", "like-terms-wrong", "repeat-as-multiple", "difference-squared-wrong", "sub-sign-in-fraction"]

# ---------------- C: domain-sensitive (the lost / introduced factor is known BY CONSTRUCTION; statements are variants around it)
def C(f, rng):
    vs = pick_vars(rng, 3); x, y, a = [sp.Symbol(v) for v in vs]
    def cancel_forms():
        k = rng.choice(["lin-lin", "param-squares", "mono", "mono2", "self", "multi", "sumfrac", "factor-2step"])
        if k == "lin-lin": c = rng.choice([1, 2, 3, -1]); r = rng.choice([1, 2, 3, -2]); return f"({x}^2-{r * r})/({x}-{r})", [[f"{x}+{r}"]], [f"{x}-{r}"], f"{x}+{r}"
        if k == "param-squares": return f"({x}^2-{a}^2)/({x}-{a})", [[f"{x}+{a}"]], [f"{x}-{a}"], f"{x}+{a}"
        if k == "mono": return f"({x}{y})/{x}", [[f"{y}"]], [f"{x}"], f"{y}"
        if k == "mono2": return f"({x}^2{y})/({x}{y}^2)", [[f"{x}/{y}"]], [f"{x}"], f"{x}/{y}"
        if k == "self": return f"({x}-{a})/({x}-{a})", [["1"]], [f"{x}-{a}"], "1"
        if k == "multi": return f"({x}-1)({y}+2)({a}-3)/(({x}-1)({a}-3)({y}+5))", [[f"({y}+2)/({y}+5)"]], [f"{x}-1", f"{a}-3"], f"({y}+2)/({y}+5)"
        if k == "sumfrac": return f"{x}/({x}-{a})-{a}/({x}-{a})", [["1"]], [], "1"      # numerators combine to (x-a)/(x-a); the loss is x-a
        if k == "factor-2step": return f"({x}^2-{a}^2)/({x}-{a})", [[f"({x}-{a})({x}+{a})/({x}-{a})", f"{x}+{a}"]], [f"{x}-{a}"], f"{x}+{a}"
    prob, routes, lost, final = cancel_forms()
    if f == "narrowing":
        k = rng.choice([0, 1, 2]); 
        if k == 0: return "Simplify", f"{x}+1", [f"({x}^2-1)/({x}-1)"], [f"{x}-1"]
        if k == 1: return "Simplify", f"{x}+{a}", [f"({x}^2-{a}^2)/({x}-{a})"], [f"{x}-{a}"]
        return "Simplify", f"{x}+{y}", [f"({x}^2-{y}^2)/({x}-{y})"], [f"{x}-{y}"]
    lines = routes[0]; lostN = lost
    variants = {"no-statement": lambda: lines,
        "same-line": lambda: lines[:-1] + [lines[-1] + ", " + ", ".join(f"{l} ≠ 0" for l in lostN)] if lostN else lines,
        "same-line-parens": lambda: lines[:-1] + [lines[-1] + " (" + ", ".join(f"{l} ≠ 0" for l in lostN) + ")"] if lostN else lines,
        "separate-after": lambda: lines + [", ".join(f"{l} ≠ 0" for l in lostN)] if lostN else lines,
        "separate-before": lambda: ([", ".join(f"{l} ≠ 0" for l in lostN)] if lostN else []) + lines,
        "partial": lambda: lines[:-1] + [lines[-1] + (", " + f"{lostN[0]} ≠ 0" if lostN else "")],
        "unrelated": lambda: lines[:-1] + [lines[-1] + f", {y} ≠ 7"],
        "extra-unnecessary": lambda: lines[:-1] + [lines[-1] + ", " + ", ".join(f"{l} ≠ 0" for l in lostN) + f", {a} ≠ 5"] if lostN else lines,
        "stated-twice": lambda: lines[:-1] + [lines[-1] + ", " + ", ".join(f"{l} ≠ 0" for l in lostN)] + [", ".join(f"{l} ≠ 0" for l in lostN)] if lostN else lines,
        "equation-form": lambda: lines[:-1] + [lines[-1] + ", " + ", ".join(f"{l.split('-')[0]} ≠ {l.split('-',1)[1]}" if '-' in l and l.count('-') == 1 and not l.startswith('-') else f"{l} ≠ 0" for l in lostN)] if lostN else lines}
    if f in variants: return "Simplify", prob, variants[f](), lostN
    return None
C_FAMS = ["no-statement", "same-line", "same-line-parens", "separate-after", "separate-before", "partial", "unrelated", "extra-unnecessary", "stated-twice", "equation-form", "narrowing"]

# ---------------- D: symbolic exponents
def D(f, rng):
    x, y = sp.Symbol("x"), sp.Symbol("y"); ex = ["n", "m", "n+1", "2n", "n-m", "n+m", "m+2", "k"]
    e1, e2 = rng.sample(ex, 2); base = rng.choice(["x", "y", "xy", "2", "2x", "(x+1)", "(a+b)", "x^2"])
    b = lambda s: f"({s})" if len(s) > 1 else s
    if f == "product": return "Simplify", f"{b(base)}^({e1})*{b(base)}^({e2})", [f"{b(base)}^({e1}+{e2})"]
    if f == "product-wrong": return "Simplify", f"{b(base)}^({e1})*{b(base)}^({e2})", [rng.choice([f"{b(base)}^(({e1})*({e2}))", f"{b(base)}^({e1})+{b(base)}^({e2})", f"{b(base)}^({e1}-{e2})"])]
    if f == "quotient": return "Simplify", f"{b(base)}^({e1})/{b(base)}^({e2})", [f"{b(base)}^({e1}-({e2}))"]
    if f == "quotient-wrong": return "Simplify", f"{b(base)}^({e1})/{b(base)}^({e2})", [f"{b(base)}^({e1}+{e2})"]
    if f == "power-of-power": return "Simplify", f"({b(base)}^({e1}))^({e2})", [f"{b(base)}^(({e1})*({e2}))"]
    if f == "power-of-power-wrong": return "Simplify", f"({b(base)}^({e1}))^({e2})", [f"{b(base)}^({e1}+{e2})"]
    if f == "power-of-product": return "Simplify", f"(x*y)^({e1})", [f"x^({e1})*y^({e1})"]
    if f == "power-of-product-wrong": return "Simplify", f"(x*y)^({e1})", [rng.choice([f"x*y^({e1})", f"x^({e1})+y^({e1})", f"x^({e1})*y"])]
    if f == "split-exponent": return "Simplify", f"{b(base)}^({e1}+{e2})", [f"{b(base)}^({e1})*{b(base)}^({e2})"]
    if f == "split-exponent-wrong": return "Simplify", f"{b(base)}^({e1}+{e2})", [f"{b(base)}^({e1})+{b(base)}^({e2})"]
    if f == "shift-one": return "Simplify", f"{b(base)}^({e1}+1)", [f"{b(base)}*{b(base)}^({e1})"]
    if f == "quotient-shift-domain": return "Simplify", f"x^({e1}+1)/x^({e1})", ["x", "x, x ≠ 0"][rng.randrange(2):][:1] if False else [rng.choice(["x", "x, x ≠ 0", "x ≠ 0"])]
    if f == "numeric-base": return "Simplify", f"4^({e1})", [rng.choice([f"2^(2*({e1}))", f"2^({e1})", f"2^(({e1})^2)"])]
    if f == "recombine": return "Simplify", f"x^({e1})*y^({e1})", [f"(x*y)^({e1})"]
    if f == "double": return "Simplify", f"x^(2*({e1}))", [f"(x^({e1}))^2", f"x^({e1})*x^({e1})"][rng.randrange(2):][:1]
    return None
D_FAMS = ["product", "product-wrong", "quotient", "quotient-wrong", "power-of-power", "power-of-power-wrong", "power-of-product", "power-of-product-wrong", "split-exponent", "split-exponent-wrong", "shift-one", "quotient-shift-domain", "numeric-base", "recombine", "double"]

# ---------------- E: multistep derivations with varied routes and optional injected faults / statements
def E(f, rng):
    vs = pick_vars(rng, 3); L = lambda: lin(rng, vs, rng.choice([1, 2]))
    if f in ("expand-route", "expand-route-fault"):
        a, b, c = L(), L(), L(); prob = br(a) + br(b) + br(c); ab = sp.expand(a * b); full = sp.expand(a * b * c)
        mids = [[S(ab) and f"({S(ab)}){br(c)}", S(full)], [f"{br(a)}({S(sp.expand(b * c))})", S(full)], [S(full)], [f"{br(a)}{br(b)}{br(c)}", S(full)]]
        lines = list(rng.choice(mids)); 
        if f.endswith("fault"): i = rng.randrange(len(lines)); lines[i] = lines[i] + rng.choice(["+1", "-x", "+2*y"])  if False else lines[i] + "+" + str(rng.choice([1, 2]))
        return "Expand", prob, lines
    if f in ("factor-cancel-route", "factor-cancel-fault"):
        x, y, a = [sp.Symbol(v) for v in vs]; r = rng.choice([1, 2, 3]); stm = rng.random() < 0.5
        prob = f"({x}^2-{y}^2)/({x}-{y})"; routes = [[f"({x}-{y})({x}+{y})/({x}-{y})", f"{x}+{y}"], [f"{x}+{y}"], [f"({x}-{y})({x}+{y})/({x}-{y})", f"({x}+{y})({x}-{y})/({x}-{y})", f"{x}+{y}"]]
        lines = list(rng.choice(routes))
        if stm: lines = lines + [f"{x} ≠ {y}"] if rng.random() < 0.5 else lines[:-1] + [lines[-1] + f", {x} ≠ {y}"]
        if f.endswith("fault"): i = rng.randrange(len(lines) - (1 if stm and lines[-1].startswith(f"{x} ≠") else 0)); 
        if f.endswith("fault"): lines[i] = rng.choice([f"{x}-{y}", f"({x}+{y})^2/({x}-{y})", f"{x}+{y}+1"]) if i == len(lines) - 1 or True else lines[i]
        return "Simplify", prob, lines
    if f in ("collect-route", "collect-route-fault"):
        x = [sp.Symbol(v) for v in vs]; a, b = L(), L(); prob = f"{S(a)}*({S(b)})-{S(b)}*({S(a)})+{S(a)}+{S(b)}"
        lines = [S(sp.expand(a * b - b * a + a + b))] if rng.random() < 0.5 else [f"{S(sp.expand(a * b))}-({S(sp.expand(b * a))})+{S(a)}+{S(b)}", S(sp.expand(a + b))]
        if f.endswith("fault"): lines[rng.randrange(len(lines))] += "+" + str(rng.choice([1, 2]))
        return "Simplify", prob, lines
    if f in ("rational-route", "rational-route-fault"):
        x, y, a = [sp.Symbol(v) for v in vs]; prob = f"1/({x}-{y})-1/({x}+{y})"
        routes = [[f"(({x}+{y})-({x}-{y}))/(({x}-{y})({x}+{y}))", f"{2 * y}/(({x}-{y})({x}+{y}))"], [f"{2 * y}/({x}^2-{y}^2)"], [f"({x}+{y}-{x}+{y})/(({x}-{y})({x}+{y}))", f"2{y}/({x}^2-{y}^2)"]]
        lines = list(rng.choice(routes))
        if f.endswith("fault"): lines[rng.randrange(len(lines))] = rng.choice([f"2/({x}^2-{y}^2)", f"({x}+{y}-{x}-{y})/(({x}-{y})({x}+{y}))", f"{2*y}/({x}-{y})"])
        return "Simplify", prob, lines
    if f in ("cube-route", "cube-route-fault"):
        x, y = [sp.Symbol(v) for v in vs[:2]]; prob = f"({x}^3-{y}^3)/({x}-{y})"
        routes = [[f"({x}-{y})({x}^2+{x}{y}+{y}^2)/({x}-{y})", f"{x}^2+{x}{y}+{y}^2"], [f"{x}^2+{x}{y}+{y}^2"]]
        lines = list(rng.choice(routes)); 
        if rng.random() < 0.5: lines = lines[:-1] + [lines[-1] + f", {x} ≠ {y}"]
        if f.endswith("fault"): lines[-1] = rng.choice([f"{x}^2+{y}^2", f"{x}^2-{x}{y}+{y}^2", f"{x}^2+{x}{y}+{y}^2"][:2])
        return "Simplify", prob, lines
    return None
E_FAMS = ["expand-route", "expand-route-fault", "factor-cancel-route", "factor-cancel-fault", "collect-route", "collect-route-fault", "rational-route", "rational-route-fault", "cube-route", "cube-route-fault"]

def build(kind, fam, i, seed):
    rng = random.Random(f"{seed}:{kind}:{fam}:{i}")
    for _ in range(8):
        try:
            if kind == "valid": r = A(fam, rng)
            elif kind == "invalid": r = B(fam, rng)
            elif kind == "domain": 
                r = C(fam, rng); 
                if r is None: continue
                if fam == "narrowing": verb, prob, lines, lost = r; lines = [lines[0]] if rng.random() < .6 else [lines[0] + ", " + ", ".join(f"{l} ≠ 0" for l in lost)] if rng.random() < .5 else [", ".join(f"{l} ≠ 0" for l in lost), lines[0]]; r = (verb, prob, lines)
                else: verb, prob, lines, lost = r; r = (verb, prob, lines)
            elif kind == "symexp": r = D(fam, rng)
            else: r = E(fam, rng)
            if r is None: continue
            verb, prob, lines = r
            if lines is None: continue
            if re.search(r"(^|[^\w])0([^\w.]|$)", prob.split(" ", 0)[0]) and prob.strip() in ("0", "(0)^2") or any(l.strip() in ("0", "(0)") or "(0)" in l for l in lines): continue
            if sp.simplify(sp.sympify(re.sub(r"(\d|[a-z]|\))(?=[a-z(])", r"\1*", prob.replace("^", "**")), locals={c: sp.Symbol(c) for c in "xyzabcnmk"})) == 0 if kind != "symexp" and "/" not in prob else False: continue
            lines = [style(l, rng) if "≠" not in l else l for l in lines]; problem = f"{verb} {style(prob, rng)}"
            body = problem.split(" ", 1)[1]
            res = oracle.derive(body, lines)
            return {"id": f"{kind}:{fam}:{i}", "kind": kind, "family": fam, "problem": problem, "lines": lines, "oracle": res}
        except (AssertionError, RecursionError, ZeroDivisionError, ValueError, KeyError): continue
    return None
def work(a): return build(*a)

if __name__ == "__main__":
    seed = int(sys.argv[1]) if len(sys.argv) > 1 else 1; out = sys.argv[2]
    plan = [("valid", A_FAMS, 1000), ("invalid", B_FAMS, 1000), ("domain", C_FAMS, 540), ("symexp", D_FAMS, 520), ("multistep", E_FAMS, 520)]
    jobs = []
    for kind, fams, n in plan:
        for j in range(n): jobs.append((kind, fams[j % len(fams)], j, seed))
    with Pool(2) as p: res = [r for r in p.map(work, jobs, chunksize=20) if r]
    json.dump(res, open(out, "w")); print(len(res), "cases", {k: sum(1 for r in res if r["kind"] == k) for k, _, _ in plan})
