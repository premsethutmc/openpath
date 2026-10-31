"""Independent SymPy checker for the engine trial (K02 arithmetic, K04 equations).

Offline engineering check only: SymPy is NOT a browser or production dependency. Input is the JSON written by
k02-arithmetic.mts and k04-equations.mts in this folder, never learner text.

    python3 check.py out/k02.json out/k04.json [--summary out/summary.json]

K02: every kernel result is recomputed from the exact input text with sympy.Rational; any difference is an error.
K04: for every equation
  1. the solver's own parse of the LaTeX must equal the intended equation (so we judge the equation intended);
  2. every claimed solution is substituted back into the intended equation and must make it exactly true
     (this alone decides "incorrect", independent of any solving);
  3. the claimed set is compared with SymPy's full solution set over the complex numbers ("complete").
Exit code is non-zero if any K02 result is wrong or any K04 claimed solution is incorrect.
"""
import json
import sys
from collections import Counter, defaultdict

import sympy as sp

x = sp.Symbol("x")


# ── K02 ────────────────────────────────────────────────────────────────────────────────────────────────────────
def exact(text: str) -> sp.Rational:
    # sympy.Rational reads "12.3456" and "-7/12" exactly (decimal text is not passed through a float)
    return sp.Rational(text)


def k02_expected(op: str, a: list[str]):
    if op == "expr":
        A, B, C = (exact(t) for t in a[:3])
        return (A + B) * C / (A - C) ** int(a[3])
    if op == "pow":
        return exact(a[0]) ** int(a[1])
    p, q = exact(a[0]), exact(a[1])
    return {"add": p + q, "sub": p - q, "mul": p * q, "div": p / q, "lt": p < q}[op]


def check_k02(data: dict) -> dict:
    by = defaultdict(Counter)
    wrong = []
    for c in data["cases"]:
        cat = by[c["category"]]
        cat["cases"] += 1
        if c.get("refused"):
            cat["refused"] += 1
            continue
        expected = k02_expected(c["op"], c["args"])
        got = c["result"]
        if c["op"] == "lt":
            ok = got == ("true" if bool(expected) else "false")
        else:
            ok = sp.Rational(got) == expected
        if ok:
            cat["correct"] += 1
        else:
            cat["wrong"] += 1
            if len(wrong) < 10:
                wrong.append({"id": c["id"], "op": c["op"], "args": c["args"], "kernel": got, "sympy": str(expected)})
    total = sum((v for v in by.values()), Counter())
    return {"total": dict(total), "byCategory": {k: dict(v) for k, v in by.items()}, "wrongExamples": wrong}


# ── K04 ────────────────────────────────────────────────────────────────────────────────────────────────────────
class Unsupported(Exception):
    pass


def mj(e):
    """MathJSON (as emitted by the Compute Engine) → SymPy, for the heads this trial meets. Anything else raises."""
    if isinstance(e, bool):
        raise Unsupported("boolean")
    if isinstance(e, int):
        return sp.Integer(e)
    if isinstance(e, float):
        return sp.Rational(repr(e))
    if isinstance(e, str):
        if e == "x":
            return x
        if e in ("ImaginaryUnit", "i"):
            return sp.I
        if e in ("Half",):
            return sp.Rational(1, 2)
        if e.lstrip("-").isdigit():
            return sp.Integer(e)
        if e.isidentifier():
            return sp.Symbol(e)  # a free parameter, e.g. "t" for "every value"
        raise Unsupported(f"symbol {e!r}")
    if isinstance(e, dict):
        if "num" in e:
            return sp.Rational(e["num"])
        if "sym" in e:
            return mj(e["sym"])
        if "fn" in e:
            return mj(e["fn"])
        raise Unsupported(f"object {e}")
    head, *args = e
    a = [mj(t) for t in args]
    if head == "Rational":
        return sp.Rational(a[0], a[1])
    if head == "Add":
        return sp.Add(*a)
    if head == "Subtract":
        return a[0] - a[1]
    if head == "Multiply":
        return sp.Mul(*a)
    if head == "Divide":
        return a[0] / a[1]
    if head == "Negate":
        return -a[0]
    if head == "Power":
        return a[0] ** a[1]
    if head == "Square":
        return a[0] ** 2
    if head == "Sqrt":
        return sp.sqrt(a[0])
    if head == "Root":
        return a[0] ** (sp.Integer(1) / a[1])
    if head == "Complex":
        return a[0] + sp.I * a[1]
    if head == "Equal":
        return sp.Eq(a[0], a[1], evaluate=False)
    raise Unsupported(f"head {head}")


def poly(coeffs: list[str]):
    c0, c1, c2 = (sp.Rational(t) for t in coeffs)
    return c0 + c1 * x + c2 * x**2


def check_k04(data: dict) -> dict:
    by = defaultdict(Counter)
    problems = []
    for q in data["equations"]:
        k = by[q["kind"]]
        k["equations"] += 1
        f = sp.expand(poly(q["poly"]["lhs"]) - poly(q["poly"]["rhs"]))  # intended equation: f(x) = 0

        def note(outcome, detail=None):
            k[outcome] += 1
            if outcome not in ("complete",) and len(problems) < 25:
                problems.append({"id": q["id"], "kind": q["kind"], "latex": q["latex"], "outcome": outcome, "detail": detail})

        # 1. did the solver read the intended equation?
        try:
            parsed = mj(q["parsed"])
            if not isinstance(parsed, sp.Equality) or sp.expand(parsed.lhs - parsed.rhs - f) != 0:
                note("misread", str(q.get("parsed")))
                continue
        except (Unsupported, KeyError) as err:
            note("misread", str(err))
            continue

        if "error" in q or q.get("solutions") is None:
            note("unsolved", q.get("error"))
            continue

        # 2. substitution: every claimed solution must make f exactly 0 (or, for a free parameter, identically 0)
        try:
            claimed = [mj(s) for s in q["solutions"]]
        except Unsupported as err:
            note("unverifiable", str(err))
            continue
        bad = [s for s in claimed if sp.simplify(f.subs(x, s)) != 0]
        if bad:
            note("incorrect", [str(b) for b in bad])
            continue

        # 3. completeness against SymPy's full solution set over ℂ
        truth = sp.solveset(f, x, domain=sp.S.Complexes)
        free = [s for s in claimed if s.free_symbols]
        if truth == sp.S.Complexes:
            note("complete" if free else "incomplete", "every x is a solution")
            if free:
                k["identity-reported-as-parameter"] += 1
            continue
        if free:
            note("incorrect", "reported every x, but the equation has finitely many solutions")
            continue
        got = {sp.nsimplify(sp.simplify(s)) for s in claimed}
        want = {sp.nsimplify(sp.simplify(s)) for s in truth}
        same = len(got) == len(want) and all(any(sp.simplify(g - w) == 0 for w in want) for g in got)
        note("complete" if same else "incomplete", {"claimed": [str(s) for s in got], "sympy": [str(s) for s in want]})
        if same and any(not s.is_real for s in want):
            k["complex-roots"] += 1  # correct over ℂ; a school answer would say "no real solution"

    total = sum((v for v in by.values()), Counter())
    return {"total": dict(total), "byKind": {k: dict(v) for k, v in by.items()}, "problems": problems}


def main(argv):
    paths = [a for a in argv[1:] if not a.startswith("--")]
    summary_path = argv[argv.index("--summary") + 1] if "--summary" in argv else None
    if summary_path in paths:
        paths.remove(summary_path)
    out = {"sympy": sp.__version__}
    failed = False
    for p in paths:
        data = json.load(open(p))
        if data["benchmark"] == "k02-arithmetic":
            res = check_k02(data)
            out["k02"] = {"seed": data["seed"], **res}
            t = res["total"]
            print(f"K02 arithmetic: {t.get('cases', 0)} cases, {t.get('correct', 0)} correct, "
                  f"{t.get('wrong', 0)} wrong, {t.get('refused', 0)} refused")
            failed |= t.get("wrong", 0) > 0
        elif data["benchmark"] == "k04-equations":
            res = check_k04(data)
            out["k04"] = {"seed": data["seed"], "solver": data["solver"], **res}
            t = res["total"]
            print(f"K04 equations: {t.get('equations', 0)} equations, {t.get('complete', 0)} complete, "
                  f"{t.get('incomplete', 0)} incomplete, {t.get('incorrect', 0)} incorrect, "
                  f"{t.get('unsolved', 0)} unsolved, {t.get('misread', 0)} misread, {t.get('unverifiable', 0)} unverifiable")
            failed |= t.get("incorrect", 0) > 0
    print(f"SymPy {sp.__version__}")
    if summary_path:
        json.dump(out, open(summary_path, "w"), indent=1)
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
