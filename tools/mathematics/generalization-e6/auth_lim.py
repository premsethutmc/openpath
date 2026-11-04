from kit import *
CAT = "limits-continuity"
def LG(v): return ("lim", v)
def lc(fam, expr, pt, lines, expect, val, side="both", var="x", **kw):
    add(CAT, fam, lprob(expr, pt, side, var), lines, expect, goal=LG(val), var=var, **kw)
D = lambda s: ev(X(s), {})
def L(e, pt, side="both", v="x"): return ("LIM", e, v, pt, side)

def build():
    s = St("plain")
    lc("removable-quadratic", "(x^2 - 5*x + 6)/(x - 2)", 2, [eq(s, "(x^2 - 5*x + 6)/(x - 2)", "(x - 2)*(x - 3)/(x - 2)", "x - 3"), eq(s, L("(x^2 - 5*x + 6)/(x - 2)", 2), L("x - 3", 2), "2 - 3", "-1", final=True)], "verified", D("-1"), tags=["valid"])
    s = St("implicit", lim="paren")
    lc("infinity-divide-by-power", "(3*x^2 + x)/(x^2 - 4)", "infinity", [eq(s, "(3*x^2 + x)/(x^2 - 4)", "(3 + 1/x)/(1 - 4/x^2)"), eq(s, L("(3*x^2 + x)/(x^2 - 4)", "inf"), "(3 + 0)/(1 - 0)", "3", final=True)], "verified", D("3"), tags=["valid", "infinity"])
    s = St("unicode", lim="brace")
    lc("conjugate-sqrt", "(sqrt(x + 4) - 2)/x", 0, [eq(s, "(sqrt(x + 4) - 2)/x", "1/(sqrt(x + 4) + 2)"), eq(s, L("(sqrt(x + 4) - 2)/x", 0), L("1/(sqrt(x + 4) + 2)", 0), "1/(2 + 2)", "1/4", final=True)], "verified", D("1/4"), tags=["valid", "conjugate"])
    s = St("latex")
    lc("standard-sin-scaled", "sin(5*x)/(2*x)", 0, [eq(s, L("sin(5*x)/(2*x)", 0), L("5/2*(sin(5*x)/(5*x))", 0), "5/2*1", "5/2", final=True)], "verified", D("5/2"), tags=["valid", "standard-limit", "latex"])
    s = St("plain", lim="space", arrow="->")
    lc("one-sided-right-infinite", "1/(x - 2)", 2, [eq(s, L("1/(x - 2)", 2, "right"), ("V", "inf"), final=True)], "verified", "inf", side="right", tags=["valid", "one-sided"])
    s = St("unicode", lim="paren")
    lc("one-sided-left-neg-infinite", "1/x", 0, [eq(s, L("1/x", 0, "left"), ("V", "-inf"), final=True)], "verified", "-inf", side="left", tags=["valid", "one-sided"])
    s = St("implicit", lim="paren")
    lc("two-sided-dne", "1/(x - 1)", 1, [eq(s, L("1/(x - 1)", 1, "right"), ("V", "inf")), eq(s, L("1/(x - 1)", 1, "left"), ("V", "-inf")), eq(s, L("1/(x - 1)", 1), ("V", "dne"), final=True)], "verified", "dne", tags=["valid", "dne"])
    s = St("plain", lim="paren")
    lc("exp-at-minus-infinity", "e^x", "-infinity", [eq(s, L("e^x", "-inf"), "0", final=True)], "verified", D("0"), tags=["valid", "infinity"])
    s = St("implicit", lim="paren")
    lc("lhopital-exp", "(e^x - 1)/x", 0, [eq(s, L("(e^x - 1)/x", 0), L("e^x/1", 0), "e^0", "1", final=True, lhop=False) if False else eq(s, L("(e^x - 1)/x", 0), L("e^x/1", 0), final=False, lhop=True), eq(s, L("e^x/1", 0), "e^0", "1", final=True)], "verified", D("1"), alt=True, tags=["valid", "lhopital", "alternative"])
    s = St("plain", lim="paren")
    lc("lhopital-trig-poly", "sin(3*x)/(x^2 + x)", 0, [eq(s, L("sin(3*x)/(x^2 + x)", 0), L("3*cos(3*x)/(2*x + 1)", 0), lhop=True), eq(s, L("3*cos(3*x)/(2*x + 1)", 0), "3*1/(0 + 1)", "3", final=True)], "verified", D("3"), alt=True, tags=["valid", "lhopital", "alternative"])
    s = St("unicode", lim="brace")
    lc("direct-substitution-poly", "x^3 - 3*x + 1", 2, [eq(s, L("x^3 - 3*x + 1", 2), "2^3 - 3*2 + 1", "3", final=True)], "verified", D("3"), tags=["valid"])
    s = St("implicit", lim="paren")
    lc("perfect-square-cancel", "(x^2 + 2*x + 1)/(x + 1)", -1, [eq(s, "(x^2 + 2*x + 1)/(x + 1)", "(x + 1)^2/(x + 1)", "x + 1"), eq(s, L("x + 1", -1), "0", final=True)], "verified", D("0"), tags=["valid"])
    s = St("latex")
    lc("tan-standard", "tan(4*x)/x", 0, [eq(s, "tan(4*x)/x", "4*(sin(4*x)/(4*x))*(1/cos(4*x))"), eq(s, L("tan(4*x)/x", 0), "4*1*1", "4", final=True)], "verified", D("4"), tags=["valid", "standard-limit", "latex"])
    s = St("plain", lim="paren")
    lc("conjugate-root-difference", "(x - 4)/(sqrt(x) - 2)", 4, [eq(s, "(x - 4)/(sqrt(x) - 2)", "sqrt(x) + 2"), eq(s, L("sqrt(x) + 2", 4), "2 + 2", "4", final=True)], "verified", D("4"), tags=["valid", "conjugate"])
    s = St("implicit", lim="paren")
    lc("factor-both-numden", "(x^2 - 4)/(x^2 - 5*x + 6)", 2, [eq(s, "(x^2 - 4)/(x^2 - 5*x + 6)", "(x - 2)*(x + 2)/((x - 2)*(x - 3))", "(x + 2)/(x - 3)"), eq(s, L("(x + 2)/(x - 3)", 2), "(2 + 2)/(2 - 3)", "-4", final=True)], "verified", D("-4"), tags=["valid"])
    s = St("unicode", lim="paren")
    lc("infinity-cubic", "(5*x^3 - 2*x)/(2*x^3 + x^2)", "infinity", [eq(s, "(5*x^3 - 2*x)/(2*x^3 + x^2)", "(5 - 2/x^2)/(2 + 1/x)"), eq(s, L("(5*x^3 - 2*x)/(2*x^3 + x^2)", "inf"), "5/2", final=True)], "verified", D("5/2"), tags=["valid", "infinity"])
    # -------- invalid
    s = St("plain")
    lc("err-cancel-wrong", "(4*x^2 - 1)/(2*x - 1)", "1/2", [eq(s, "(4*x^2 - 1)/(2*x - 1)", "(2*x - 1)*(2*x + 1)/(2*x - 1)", "2*x - 1"), eq(s, L("2*x - 1", "1/2"), "0", final=True)], "invalid", D("2"), first_ok=[1], tags=["wrong-cancellation"])
    s = St("implicit", lim="paren")
    lc("err-infinity-claimed-divergent", "(3*x^2 + x)/(x^2 - 4)", "infinity", [eq(s, L("(3*x^2 + x)/(x^2 - 4)", "inf"), ("V", "inf"), final=True)], "invalid", D("3"), first_ok=[0], tags=["wrong-infinity"])
    s = St("plain", lim="paren")
    lc("err-lhopital-not-indeterminate", "(x^2 + 1)/(x + 1)", 1, [eq(s, L("(x^2 + 1)/(x + 1)", 1), L("2*x/1", 1), lhop=True), eq(s, L("2*x/1", 1), "2", final=True)], "invalid", D("1"), first_ok=[0], tags=["lhopital-misuse"])
    s = St("unicode", lim="paren")
    lc("err-one-sided-sign", "1/(x - 3)", 3, [eq(s, L("1/(x - 3)", 3, "left"), ("V", "inf"), final=True)], "invalid", "-inf", side="left", first_ok=[0], tags=["one-sided", "sign"])
    s = St("latex")
    lc("err-standard-limit-constant", "sin(5*x)/(2*x)", 0, [eq(s, L("sin(5*x)/(2*x)", 0), "5", final=True)], "invalid", D("5/2"), first_ok=[0], tags=["standard-limit"])
    s = St("plain")
    lc("err-conjugate-identity", "(sqrt(x + 4) - 2)/x", 0, [eq(s, "(sqrt(x + 4) - 2)/x", "1/(sqrt(x + 4) - 2)"), eq(s, L("1/(sqrt(x + 4) - 2)", 0), ("V", "inf"), final=True)], "invalid", D("1/4"), first_ok=[0], tags=["wrong-identity"])
    s = St("implicit", lim="paren")
    lc("correct-final-after-invalid-factor", "(x^2 + 5*x + 6)/(x + 2)", -2, [eq(s, "(x^2 + 5*x + 6)/(x + 2)", "(x + 2)*(x + 3)/(x + 2)", "x + 2"), eq(s, L("x + 3", -2), "1", final=True)], "invalid", D("1"), first_ok=[0], tags=["correct-final-after-error"])
    s = St("plain", lim="paren")
    lc("err-infinity-degree", "(x + 1)/(x^2 + 1)", "infinity", [eq(s, L("(x + 1)/(x^2 + 1)", "inf"), "1", final=True)], "invalid", D("0"), first_ok=[0], tags=["wrong-infinity"])
    # -------- incomplete
    s = St("plain")
    lc("incomplete-prose", "(x^2 + x - 6)/(x + 3)", -3, [prose("Factor the numerator and cancel the common factor")], "incomplete", D("-5"), tags=["prose-only"])
    s = St("implicit")
    lc("incomplete-factored-no-limit", "(x^2 + x - 6)/(x + 3)", -3, [eq(s, "(x^2 + x - 6)/(x + 3)", "(x + 3)*(x - 2)/(x + 3)")], "incomplete", D("-5"), tags=["no-final-line"])
    s = St("plain", lim="paren")
    lc("incomplete-lhopital-unevaluated", "sin(3*x)/(x^2 + x)", 0, [eq(s, L("sin(3*x)/(x^2 + x)", 0), L("3*cos(3*x)/(2*x + 1)", 0), lhop=True)], "incomplete", D("3"), tags=["lhopital", "no-final-line"])
    s = St("unicode")
    lc("incomplete-assertion-only", "(x^2 - 1)/(x - 1)", 1, [prose("the limit exists because the function is rational")], "incomplete", D("2"), tags=["prose-only"])
    # -------- unsupported
    add(CAT, "unsupported-squeeze", dict(domain="calculus", task="limit-squeeze", statement="lim x->0 x sin(1/x)"),
        [("-|x| ≤ x sin(1/x) ≤ |x|", dict(k="prose")), ("lim_(x→0) -|x| = lim_(x→0) |x| = 0", dict(k="prose")), ("so lim_(x→0) x sin(1/x) = 0 by the squeeze theorem", dict(k="prose"))],
        "unsupported", ref_override=("unsupported", None, "squeeze-theorem inequalities with sin(1/x) are outside the exact limit tools"), tags=["out-of-scope"], scope="out-of-scope")
    add(CAT, "unsupported-sequence-e", dict(domain="calculus", task="sequence-limit", statement="lim n->infinity (1+1/n)^n"),
        [("lim_(n→∞) (1 + 1/n)^n = e", dict(k="prose"))],
        "unsupported", ref_override=("unsupported", None, "a variable exponent limit is outside the typed limit expression language"), tags=["out-of-scope"], scope="out-of-scope")
    # -------- continuity / differentiability
    CT = lambda *a, **k: None
    s = St("plain", lim="paren")
    add(CAT, "continuity-valid", cprob("continuity", "x^2 + 3", "4*x", 1),
        [eq(s, L("x^2 + 3", 1, "left"), "1^2 + 3", "4"), eq(s, "4*1", "4"), concl("both sides equal 4 at x = 1, so f is continuous at 1", True, True)],
        "verified", goal=("cont",), tags=["valid", "continuity"])
    s = St("unicode", lim="paren")
    add(CAT, "continuity-jump", cprob("continuity", "x + 1", "3*x + 1", 2),
        [eq(s, L("x + 1", 2, "left"), "2 + 1", "3"), eq(s, "3*2 + 1", "7"), concl("3 ≠ 7, so f is not continuous at 2", False, False)],
        "verified", goal=("cont",), tags=["valid", "discontinuity"])
    s = St("plain", lim="paren")
    add(CAT, "continuity-wrong-conclusion", cprob("continuity", "x^2", "x + 2", 3),
        [eq(s, L("x^2", 3, "left"), "3^2", "9"), eq(s, "3 + 2", "5"), concl("the limits agree, so f is continuous at 3", True, False)],
        "invalid", goal=("cont",), first_ok=[2], tags=["wrong-conclusion"])
    s = St("implicit", lim="paren")
    add(CAT, "continuity-arith-slip", cprob("continuity", "x^2 + 1", "3*x - 1", 2),
        [eq(s, L("x^2 + 1", 2, "left"), "2^2 + 1", "6"), eq(s, "3*2 - 1", "5"), concl("5 ≠ 6, so f is not continuous at 2", False, False)],
        "invalid", goal=("cont",), first_ok=[0], tags=["arithmetic"])
    s = St("latex", lim="paren")
    add(CAT, "continuity-trig-piece", cprob("continuity", "sin(2*x)", "2*x", 0),
        [eq(s, L("sin(2*x)", 0, "left"), "sin(0)", "0"), eq(s, "2*0", "0"), concl("both pieces equal 0 at x = 0, hence f is continuous at 0", True, True)],
        "verified", goal=("cont",), tags=["valid", "continuity", "latex"])
    s = St("plain", lim="paren")
    add(CAT, "continuity-exp-piece", cprob("continuity", "e^x", "x + 1", 0),
        [eq(s, "e^0", "1"), eq(s, "0 + 1", "1"), concl("both equal 1, so f is continuous at 0", True, True)],
        "verified", goal=("cont",), tags=["valid", "continuity"])
    s = St("implicit", lim="paren")
    add(CAT, "differentiability-valid", cprob("differentiability", "x^2", "2*x - 1", 1),
        [eq(s, "1^2", "1"), eq(s, "2*1 - 1", "1"), eq(s, ("D", "x^2"), "2*x"), eq(s, ("D", "2*x - 1"), "2"), eq(s, "2*1", "2"), concl("values and slopes agree at 1, so f is differentiable at 1", True, True)],
        "verified", goal=("cont",), tags=["valid", "differentiability"])
    s = St("unicode", lim="paren")
    add(CAT, "differentiability-corner", cprob("differentiability", "3*x", "x^2 + 2", 1),
        [eq(s, "3*1", "3"), eq(s, "1^2 + 2", "3"), eq(s, ("D", "3*x"), "3"), eq(s, ("D", "x^2 + 2"), "2*x"), eq(s, "2*1", "2"), concl("the slopes 3 and 2 differ, so f is not differentiable at 1", False, False)],
        "verified", goal=("cont",), tags=["valid", "differentiability", "corner"])
    s = St("plain", lim="paren")
    add(CAT, "continuity-incomplete-one-side", cprob("continuity", "x^2 + 3", "4*x", 1),
        [eq(s, L("x^2 + 3", 1, "left"), "1^2 + 3", "4")],
        "incomplete", goal=("cont",), tags=["no-final-line"])
    s = St("implicit", lim="paren")
    add(CAT, "continuity-assertion-only", cprob("continuity", "x^2 + 3", "4*x", 1),
        [concl("f is continuous at 1", True, True)],
        "incomplete", goal=("cont",), tags=["assertion-only"])
