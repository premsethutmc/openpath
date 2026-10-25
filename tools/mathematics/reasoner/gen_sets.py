"""E0: freeze the acceptance sets for the mathematical reasoner BEFORE any planner code exists.

Shares no code with the planner (different language, no kernel import). Answers come from SymPy, not from the generator's
intended solution (the intended solution is only used to build the equation; the key is recomputed and must agree).

    PYTHONPATH=/home/claude/vendor/sympy:/home/claude/vendor/mpmath python3 gen_sets.py frozen

Equation text grammar: x, integers, + - * / ^ and brackets; explicit * between factors. One unknown, x.
"""
import hashlib, json, random, sys
from fractions import Fraction
import sympy as sp

x = sp.Symbol("x")
rnd = random.Random(20261025)

def S(text):
    lhs, rhs = text.split("=")
    return sp.sympify(lhs, evaluate=True), sp.sympify(rhs, evaluate=True)

def classify(text):
    """Independent classification and answer from SymPy."""
    lhs, rhs = S(text)
    if lhs.has(sp.zoo) or rhs.has(sp.zoo):
        return {"class": "invalid"}
    den_has_x = any(d.has(x) for e in (lhs, rhs) for d in [sp.denom(sp.together(e))])
    if den_has_x:
        return {"class": "unsupported-variable-denominator"}
    poly = sp.Poly(sp.expand(lhs - rhs), x)
    if poly.is_zero:
        return {"class": "identity"}
    if poly.degree() > 1:
        return {"class": "unsupported-nonlinear"}
    if poly.degree() == 0:
        return {"class": "no-solution"}
    sol = sp.solve(sp.Eq(lhs, rhs), x)
    assert len(sol) == 1
    s = sp.Rational(sol[0])
    return {"class": "unique", "solution": f"{s.p}/{s.q}" if s.q != 1 else f"{s.p}"}

def num(lo, hi, nz=True):
    while True:
        v = rnd.randint(lo, hi)
        if v != 0 or not nz:
            return v

def sgn(v):  # " + 3" / " - 3"
    return f"+{v}" if v >= 0 else f"-{-v}"

def lin(a, b):  # a*x + b rendered
    ax = "x" if a == 1 else "-x" if a == -1 else f"{a}*x"
    return ax if b == 0 else f"{ax}{sgn(b)}"

def target_x():
    # 70% integer solutions, 30% simple rationals
    if rnd.random() < 0.7:
        return Fraction(rnd.randint(-12, 12))
    return Fraction(rnd.randint(-12, 12), rnd.choice([2, 3, 4, 5]))

def fr(q):
    return f"{q.numerator}" if q.denominator == 1 else f"({q.numerator}/{q.denominator})"

FORMS = []
def form(f): FORMS.append(f); return f

@form
def f_ax_b_c():                      # a*x+b = c
    a, b, c = num(-9, 9), num(-20, 20), num(-40, 40)
    return f"{lin(a, b)}={c}"

@form
def f_c_eq_ax_b():                   # c = a*x+b  (unknown on the right)
    a, b, c = num(-9, 9), num(-20, 20), num(-40, 40)
    return f"{c}={lin(a, b)}"

@form
def f_both_sides():                  # a*x+b = c*x+d
    a, c = num(-9, 9), num(-9, 9)
    while a == c: c = num(-9, 9)
    return f"{lin(a, num(-20, 20))}={lin(c, num(-20, 20))}"

@form
def f_bracket():                     # a*(x+b) = c
    a, b, c = num(-9, 9), num(-12, 12), num(-60, 60)
    return f"{a}*(x{sgn(b)})={c}"

@form
def f_bracket_both():                # a*(x+b) = c*(x+d)
    a, c = num(-6, 6), num(-6, 6)
    while a == c: c = num(-6, 6)
    return f"{a}*(x{sgn(num(-9, 9))})={c}*(x{sgn(num(-9, 9))})"

@form
def f_bracket_plus():                # a*(x-b)+c = d
    return f"{num(-7, 7)}*(x{sgn(num(-9, 9))}){sgn(num(-15, 15))}={num(-40, 40)}"

@form
def f_x_over_a():                    # x/a + b = c
    return f"x/{rnd.randint(2, 9)}{sgn(num(-12, 12))}={num(-15, 15)}"

@form
def f_bracket_over_a():              # (x+b)/a = c
    return f"(x{sgn(num(-12, 12))})/{rnd.randint(2, 9)}={num(-12, 12)}"

@form
def f_two_fractions():               # x/a + x/b = c
    a, b = rnd.sample([2, 3, 4, 5, 6, 8], 2)
    return f"x/{a}+x/{b}={num(1, 20)}"

@form
def f_fraction_coeff():              # (p/q)*x + b = c
    p, q = num(-7, 7), rnd.choice([2, 3, 4, 5, 6])
    return f"({p}/{q})*x{sgn(num(-12, 12))}={num(-15, 15)}"

@form
def f_nested():                      # a*(b*(x+c)+d) = e
    return f"{num(-4, 4)}*({num(-4, 4)}*(x{sgn(num(-6, 6))}){sgn(num(-8, 8))})={num(-50, 50)}"

@form
def f_sub_x():                       # a - b*x = c
    return f"{num(-20, 20)}-{rnd.randint(2, 9)}*x={num(-30, 30)}"

@form
def f_neg_bracket():                 # a - (x + b) = c*x + d
    c = num(-5, 5)
    return f"{num(-15, 15)}-(x{sgn(num(-9, 9))})={lin(c, num(-15, 15))}"

@form
def f_frac_both():                   # (x+a)/b = (x+c)/d
    b, d = rnd.sample([2, 3, 4, 5, 6], 2)
    return f"(x{sgn(num(-9, 9))})/{b}=(x{sgn(num(-9, 9))})/{d}"

def make_solvable(seen):
    while True:
        t = rnd.choice(FORMS)()
        if t in seen:
            continue
        c = classify(t)
        if c["class"] != "unique":
            continue
        s = Fraction(c["solution"])
        if abs(s.numerator) > 500 or s.denominator > 60:   # keep answers readable
            continue
        seen.add(t)
        return {"text": t, **c, "form": t_form(t)}

def t_form(t):
    return "mixed"

def smoke():
    base = [("3*(x+2)=21", "x=5"), ("5*x-7=18", "x=5"), ("2*(x-3)=x+4", "x=10"), ("x/3+4=9", "x=15"), ("4*(x+1)=2*(x+7)", "x=5")]
    out = []
    for t, _ in base:
        out.append({"text": t, **classify(t)})
    extra = ["7-2*x=15", "(x+3)/2=x-1", "x/2+x/3=10", "3*(2*x-1)=4*(x+2)-5", "-4*x+9=-3*x-2", "2*(3*(x-1)+4)=22",
             "(2/3)*x-5=7", "10-(x+4)=3*x", "x/4-x/6=1", "6=2*(x-5)+3*x", "5*(x-2)-3*(x+1)=1", "(3*x-1)/4=(x+5)/2",
             "0.5*x+1=4", "-(x-3)=2*x+9", "9*x-4=5*x+12"]
    for t in extra:
        out.append({"text": t, **classify(t)})
    return out

def edge():
    out, seen = [], set()
    def add(t):
        if t in seen: return
        seen.add(t); out.append({"text": t, **classify(t)})
    while sum(1 for o in out if o["class"] == "no-solution") < 20:
        a = num(-9, 9); b = num(-15, 15); d = num(-9, 9)
        add(f"{lin(a, b)}={lin(a, b + d)}")
    while sum(1 for o in out if o["class"] == "identity") < 10:
        a = num(-9, 9); b = num(-12, 12)
        add(f"{a}*(x{sgn(b)})={lin(a, a * b)}")
    while sum(1 for o in out if o["class"] == "unsupported-nonlinear") < 10:
        a, b = num(1, 5), num(-9, 9)
        add(rnd.choice([f"x^2{sgn(b)}={num(-30, 30)}", f"{a}*x^2={num(1, 50)}", f"x*(x{sgn(b)})={num(-20, 20)}", f"x*x-{a}*x=0"]))
    while sum(1 for o in out if o["class"] == "unsupported-variable-denominator") < 10:
        a = num(1, 9)
        add(rnd.choice([f"{a}/x={num(1, 9)}", f"1/x+{a}={num(1, 9)}", f"{a}/(x+{num(1, 5)})=2", f"({a}*x)/x={num(1, 9)}+1"]))
    return out

def main(out_dir):
    seen, seeded = set(), []
    while len(seeded) < 500:
        seeded.append(make_solvable(seen))
    for i, o in enumerate(seeded): o["id"] = f"s{i:03d}"
    sm = smoke()
    for i, o in enumerate(sm): o["id"] = f"m{i:02d}"
    ed = edge()
    for i, o in enumerate(ed): o["id"] = f"e{i:02d}"
    files = {"smoke20.json": sm[:20], "seeded500.json": seeded, "edge50.json": ed}
    assert len(sm) >= 20 and all(o["class"] == "unique" for o in sm[:20]), [o for o in sm if o["class"] != "unique"]
    manifest = {"seed": 20261025, "sympy": sp.__version__, "files": {}}
    for name, rows in files.items():
        body = json.dumps(rows, indent=1, ensure_ascii=False) + "\n"
        open(f"{out_dir}/{name}", "w").write(body)
        manifest["files"][name] = {"count": len(rows), "sha256": hashlib.sha256(body.encode()).hexdigest(),
                                   "classes": {c: sum(1 for r in rows if r["class"] == c) for c in sorted({r["class"] for r in rows})}}
    open(f"{out_dir}/manifest.json", "w").write(json.dumps(manifest, indent=1) + "\n")
    print(json.dumps(manifest["files"], indent=0)[:600])

if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "frozen")
