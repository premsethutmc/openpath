"""LIM — Sequences, limits and convergence. Every label derived by hand; the oracle is a check, not the source.

Conventions: function and sequence limits use task type 'limit' (sequences with var 'n', to 'oo'). Proof-style work (series
tests, epsilon-delta, monotone convergence, non-existence of a limit) uses 'statement-task'. For an 'unsupported' case, truth
records whether the student's working as a whole is mathematically sound. The few proof-style cases labelled 'invalid' /
'wrong-reason' are the requested convergence-condition errors; they cannot be machine-certified (hand derivation only).
"""
from schema import W

C = "LIM"
PROOF = "proof-style argument: hand derivation only, no machine certification possible"


def lim(principle, invariant, f, to, work, ol, rel, why, ans, side="both", var="x", **kw):
    return W(C, principle, invariant, {"type": "limit", "f": f, "to": to, "side": side, "var": var}, work, rel, why=why, answer=ans,
             oracle_lines=ol, **kw)


def seq(principle, invariant, f, work, ol, rel, why, ans, **kw):
    return lim(principle, invariant, f, "oo", work, ol, rel, why, ans, var="n", **kw)


def pf(task, principle, invariant, statement, work, rel, why, ans, truth=None, **kw):
    if rel != "unsupported":
        why = why + " [uncertified: " + PROOF + "]"
    return W(C, principle, invariant, {"type": "statement-task", "calculusTask": task, "statement": statement}, work, rel, why=why,
             answer=ans, truth=truth, oracle_lines=[None] * len(work), **kw)


LV = "limit value"
IND = "indeterminate-form handling"
SIDE = "one-sided vs two-sided limit"
EXIST = "existence of the limit"
CONV = "convergence condition (necessary vs sufficient)"
TEST = "convergence-test hypotheses and conclusion"
EPS = "quantifier order in epsilon-delta / epsilon-N"
MON = "existence before computing a limit (monotone convergence)"
REASON = "cited reason must justify the step"
FORGE = "every intermediate line must be true"
FIN = "task completion"

# ============================================================ factor and cancel
lim("cancel a common factor for x != a, then substitute", IND, "(x^2-9)/(x-3)", "3",
    ["(x^2-9)/(x-3) = (x-3)(x+3)/(x-3) = x+3 for x != 3", "→ 6"], ["claim: (x^2-9)/(x-3) = x+3", "final: 6"], "valid-equivalence",
    "equal for x != 3, which is all the limit sees", "6", difficulty="easy", pair="lim-fc1")
lim("0/0 is not 0", IND, "(x^2-9)/(x-3)", "3", ["substituting x = 3 gives 0/0 = 0"], ["final: 0"], "invalid",
    "0/0 is indeterminate; the limit is 6", "6", difficulty="easy", pair="lim-fc1")
lim("cancel and stop before substituting", FIN, "(x^2-9)/(x-3)", "3", ["(x^2-9)/(x-3) = (x-3)(x+3)/(x-3)"],
    [None], "incomplete", "true rewrite, no limit value stated", "6", difficulty="easy", pair="lim-fc1")
lim("difference of cubes", IND, "(x^3-8)/(x-2)", "2", ["x^3 - 8 = (x-2)(x^2+2x+4)", "limit = 4 + 4 + 4 = 12"],
    ["claim: x^3 - 8 = (x-2)(x^2+2x+4)", "final: 12"], "valid-equivalence", "factorisation exact", "12", pair="lim-fc2")
lim("forged difference-of-cubes factorisation", FORGE, "(x^3-8)/(x-2)", "2", ["x^3 - 8 = (x-2)(x^2+4)", "limit = 4 + 4 = 8"],
    ["claim: x^3 - 8 = (x-2)(x^2+4)", "final: 8"], "invalid", "(x-2)(x^2+4) = x^3-2x^2+4x-8; limit is 12", "12", pair="lim-fc2")
lim("cancel to a rational function with nonzero denominator", IND, "(x^2+x)/(x^2-1)", "-1",
    ["(x^2+x)/(x^2-1) = x/(x-1) for x != -1", "→ -1/(-2) = 1/2"], ["claim: (x^2+x)/(x^2-1) = x/(x-1)", "final: 1/2"],
    "valid-equivalence", "removable singularity at -1", "1/2", pair="lim-fc3")
lim("after cancelling, the other zero gives an infinite right limit", SIDE, "(x^2+x)/(x^2-1)", "1",
    ["(x^2+x)/(x^2-1) = x/(x-1)", "x/(x-1) → +oo as x → 1+"], ["claim: (x^2+x)/(x^2-1) = x/(x-1)", "final: oo"], "valid-equivalence",
    "numerator → 1, denominator → 0+", "oo", side="right", pair="lim-fc3")
lim("sign of a one-sided infinite limit", SIDE, "(x^2+x)/(x^2-1)", "1", ["= x/(x-1)", "→ -oo as x → 1+"], [None, "final: -oo"],
    "invalid", "x-1 > 0 for x > 1, so the limit is +oo", "oo", side="right", pair="lim-fc3")
lim("factor a quadratic over a difference of squares", IND, "(x^2-5x+6)/(x^2-4)", "2",
    ["= (x-2)(x-3)/((x-2)(x+2))", "= (x-3)/(x+2) → -1/4"], ["claim: (x^2-5x+6)/(x^2-4) = (x-3)/(x+2)", "final: -1/4"],
    "valid-equivalence", "-1/4", "-1/4", pair="lim-fc4")
lim("wrongly factored quadratic", FORGE, "(x^2-5x+6)/(x^2-4)", "2", ["= (x-2)(x+3)/((x-2)(x+2))", "= (x+3)/(x+2) → 5/4"],
    ["claim: (x^2-5x+6)/(x^2-4) = (x+3)/(x+2)", "final: 5/4"], "invalid", "x^2-5x+6 = (x-2)(x-3)", "-1/4", pair="lim-fc4")
lim("quartic over linear", IND, "(x^4-1)/(x-1)", "1", ["x^4 - 1 = (x-1)(x+1)(x^2+1)", "→ 2·2 = 4"],
    ["claim: x^4 - 1 = (x-1)(x+1)(x^2+1)", "final: 4"], "valid-equivalence", "derivative of x^4 at 1 is 4", "4")
lim("polynomial limit by continuity", LV, "x^3 - 2x + 1", "2", ["polynomials are continuous, substitute: 8 - 4 + 1 = 5"], ["final: 5"],
    "valid-equivalence", "direct substitution", "5", difficulty="easy")

# ============================================================ rationalising
lim("multiply by the conjugate", IND, "(sqrt(x+4)-2)/x", "0", ["= ((x+4) - 4)/(x(sqrt(x+4)+2))", "= 1/(sqrt(x+4)+2)", "→ 1/4"],
    [None, "claim: (sqrt(x+4)-2)/x = 1/(sqrt(x+4)+2)", "final: 1/4"], "valid-equivalence", "conjugate removes the 0/0", "1/4",
    pair="lim-rat1")
lim("forged conjugate step with the right value", FORGE, "(sqrt(x+4)-2)/x", "0", ["= 1/(sqrt(x+4)-2)", "→ 1/4"],
    ["claim: (sqrt(x+4)-2)/x = 1/(sqrt(x+4)-2)", "final: 1/4"], "invalid",
    "the rewrite is false (x=5: 1/5 vs 1); also 1/(sqrt(x+4)-2) → oo, so the stated value does not follow", "1/4", pair="lim-rat1")
lim("conjugate with a square root of x", IND, "(sqrt(x)-3)/(x-9)", "9", ["= 1/(sqrt(x)+3)", "→ 1/6"],
    ["claim: (sqrt(x)-3)/(x-9) = 1/(sqrt(x)+3)", "final: 1/6"], "valid-equivalence", "x-9 = (sqrt x - 3)(sqrt x + 3)", "1/6", pair="lim-rat2")
lim("arithmetic slip after a correct conjugate", LV, "(sqrt(x)-3)/(x-9)", "9", ["= 1/(sqrt(x)+3)", "→ 1/3"],
    ["claim: (sqrt(x)-3)/(x-9) = 1/(sqrt(x)+3)", "final: 1/3"], "invalid", "sqrt 9 + 3 = 6", "1/6", pair="lim-rat2")
lim("conjugate for oo - oo", IND, "sqrt(x^2+x)-x", "oo", ["= x/(sqrt(x^2+x)+x)", "= 1/(sqrt(1+1/x)+1) → 1/2"],
    ["claim: sqrt(x^2+x)-x = x/(sqrt(x^2+x)+x)", "final: 1/2"], "valid-equivalence", "valid for x > 0", "1/2", pair="lim-rat3")
lim("oo - oo is not 0", IND, "sqrt(x^2+x)-x", "oo", ["sqrt(x^2+x) ≈ x for large x", "so the difference → 0"], [None, "final: 0"],
    "invalid", "the error in the approximation is about 1/2", "1/2", pair="lim-rat3")
lim("conjugate with a negative middle term", IND, "x - sqrt(x^2-2x)", "oo", ["= 2x/(x + sqrt(x^2-2x))", "→ 2/2 = 1"],
    ["claim: x - sqrt(x^2-2x) = 2x/(x + sqrt(x^2-2x))", "final: 1"], "valid-equivalence", "valid for x >= 2", "1")
lim("sqrt(x^2) = |x| = -x for x < 0", IND, "sqrt(x^2+1)/x", "-oo", ["for x < 0, sqrt(x^2+1) = |x|sqrt(1+1/x^2) = -x sqrt(1+1/x^2)",
    "so the ratio = -sqrt(1+1/x^2) → -1"], [None, "final: -1"], "valid-equivalence", "sign of x matters at -oo", "-1", pair="lim-abs1")
lim("sqrt(x^2) taken as x at -oo", IND, "sqrt(x^2+1)/x", "-oo", ["sqrt(x^2+1) = x sqrt(1+1/x^2)", "→ 1"], [None, "final: 1"],
    "invalid", "for x<0 sqrt(x^2) = -x; the ratio is negative", "-1", pair="lim-abs1")
lim("same expression at +oo", LV, "sqrt(x^2+1)/x", "oo", ["for x > 0, = sqrt(1+1/x^2) → 1"], ["final: 1"], "valid-equivalence",
    "x>0 so sqrt(x^2)=x", "1", pair="lim-abs1")

# ============================================================ standard limits
lim("scaled sin(u)/u", LV, "sin(5x)/x", "0", ["= 5·sin(5x)/(5x)", "→ 5·1 = 5"], [None, "final: 5"], "valid-equivalence",
    "u = 5x → 0", "5", difficulty="easy", pair="lim-st1")
lim("sin(u)/u needs the same u downstairs", LV, "sin(5x)/x", "0", ["sin(u)/u → 1, so sin(5x)/x → 1"], ["final: 1"], "invalid",
    "denominator is x, not 5x; limit 5", "5", difficulty="easy", pair="lim-st1")
lim("ratio of two sines", LV, "sin(3x)/sin(5x)", "0", ["= (3/5)·(sin(3x)/(3x))·((5x)/sin(5x))", "→ 3/5"], [None, "final: 3/5"],
    "valid-equivalence", "product of standard limits", "3/5")
lim("tan(x)/x", LV, "tan(x)/x", "0", ["= (sin(x)/x)·(1/cos(x)) → 1·1"], ["final: 1"], "valid-equivalence", "standard", "1", difficulty="easy")
lim("x/sin(x) is the reciprocal of a standard limit", LV, "x/sin(x)", "0", ["= 1/(sin(x)/x) → 1"], ["final: 1"], "valid-equivalence",
    "reciprocal of a nonzero limit", "1", difficulty="easy")
lim("half-angle form of 1 - cos x", LV, "(1-cos(x))/x^2", "0", ["1 - cos(x) = 2sin(x/2)^2", "= (1/2)(sin(x/2)/(x/2))^2 → 1/2"],
    ["claim: 1 - cos(x) = 2sin(x/2)^2", "final: 1/2"], "valid-equivalence", "standard", "1/2", pair="lim-st2")
lim("(1-cos x)/x → 0 does not give (1-cos x)/x^2 → 0", LV, "(1-cos(x))/x^2", "0", ["(1-cos(x))/x → 0", "so (1-cos(x))/x^2 → 0"],
    [None, "final: 0"], "invalid", "dividing by another x changes the limit; value 1/2", "1/2", pair="lim-st2")
lim("(1-cos x)/x", LV, "(1-cos(x))/x", "0", ["= ((1-cos(x))/x^2)·x → (1/2)·0 = 0"], ["final: 0"], "valid-equivalence", "product rule for limits",
    "0", pair="lim-st2")
lim("(cos x - 1)/x^2", LV, "(cos(x)-1)/x^2", "0", ["= -(1-cos(x))/x^2 → -1/2"], ["final: -1/2"], "valid-equivalence", "sign flip", "-1/2")
lim("(e^x - 1)/x", LV, "(e^x-1)/x", "0", ["this is the derivative of e^x at 0", "= e^0 = 1"], [None, "final: 1"], "valid-equivalence",
    "definition of derivative", "1", difficulty="easy")
lim("scaled exponential standard limit", LV, "(e^(2x)-1)/x", "0", ["= 2·(e^(2x)-1)/(2x) → 2"], ["final: 2"], "valid-equivalence",
    "u = 2x", "2", pair="lim-st3")
lim("scaled exponential standard limit, scale lost", LV, "(e^(2x)-1)/x", "0", ["(e^u-1)/u → 1, so the limit is 1"], ["final: 1"],
    "invalid", "u = 2x; limit 2", "2", pair="lim-st3")
lim("ln(1+x)/x", LV, "ln(1+x)/x", "0", ["derivative of ln(1+x) at 0", "= 1"], [None, "final: 1"], "valid-equivalence", "standard", "1")
lim("x ln x at 0+", LV, "x ln(x)", "0", ["write as ln(x)/(1/x), oo/oo", "l'Hôpital: (1/x)/(-1/x^2) = -x → 0"],
    [None, "final: 0"], "valid-equivalence", "x ln x → 0", "0", side="right", pair="lim-st4")
lim("0·(-oo) is not automatically 0 — but here a valid argument is missing", REASON, "x ln(x)", "0",
    ["x → 0 and anything times 0 is 0", "so the limit is 0"], [None, "final: 0"], "wrong-reason",
    "0·oo is indeterminate (e.g. x·(1/x) → 1); the value 0 is right only because x dominates ln x", "0", side="right", pair="lim-st4")
lim("x^x at 0+ via the exponential", IND, "x^x", "0", ["x^x = e^(x ln(x))", "x ln(x) → 0", "so x^x → e^0 = 1"],
    [None, None, "final: 1"], "valid-equivalence", "continuity of exp", "1", side="right", pair="lim-st5")
lim("0^0 is not 0", IND, "x^x", "0", ["0^0 = 0"], ["final: 0"], "invalid", "0^0 is an indeterminate form; limit 1", "1",
    side="right", pair="lim-st5")
seq("(1+1/n)^n → e", LV, "(1+1/n)^n",
    ["(1+1/n)^n = e^(n ln(1+1/n))", "n ln(1+1/n) = ln(1+1/n)/(1/n) → 1", "so (1+1/n)^n → e"], [None, None, "final: e"],
    "valid-equivalence", "ln(1+h)/h → 1. Uncertified: the oracle's numeric cross-check of this 1^oo form does not complete", "e",
    pair="lim-e1")
seq("1^oo is not 1", IND, "(1+1/n)^n", ["1 + 1/n → 1", "1^n = 1, so the limit is 1"], [None, "final: 1"], "invalid",
    "1^oo is indeterminate; the limit is e ≈ 2.718 (n=1 already gives 2). Uncertified: the oracle's numeric cross-check of this 1^oo "
    "form does not complete", "e", pair="lim-e1")
lim("1^oo by exponentiating, cosine version", IND, "cos(x)^(1/x^2)", "0", ["= e^(ln(cos(x))/x^2)", "ln(cos(x))/x^2 → -1/2",
    "so the limit is e^(-1/2)"], [None, None, "final: e^(-1/2)"], "valid-equivalence", "ln cos x ~ -x^2/2", "e^(-1/2)",
    difficulty="hard", complexity=3, pair="lim-e2")
lim("cos(x)^(1/x^2): 1^oo taken as 1", IND, "cos(x)^(1/x^2)", "0", ["cos(x) → 1, so the power → 1"], ["final: 1"], "invalid",
    "1^oo is indeterminate; the limit is e^(-1/2)", "e^(-1/2)", pair="lim-e2")

# ============================================================ l'Hôpital
lim("repeated l'Hôpital on 0/0", IND, "(x-sin(x))/x^3", "0",
    ["0/0, l'Hôpital: (1-cos(x))/(3x^2)", "0/0 again: sin(x)/(6x)", "→ 1/6"],
    ["claim: d/dx(x - sin(x)) = 1 - cos(x)", "claim: d/dx(1 - cos(x)) = sin(x)", "final: 1/6"], "valid-equivalence",
    "each stage is 0/0", "1/6", difficulty="hard", complexity=3, pair="lim-lh1")
lim("l'Hôpital chain stopped early", FIN, "(x-sin(x))/x^3", "0", ["0/0, l'Hôpital: (1-cos(x))/(3x^2)"],
    ["claim: d/dx(x - sin(x)) = 1 - cos(x)"], "incomplete", "still 0/0, no value reached", "1/6", complexity=2, pair="lim-lh1")
lim("l'Hôpital with a dropped constant", IND, "(x-sin(x))/x^3", "0", ["(1-cos(x))/(3x^2)", "sin(x)/(3x)", "→ 1/3"],
    [None, "claim: d/dx(3x^2) = 3x", "final: 1/3"], "invalid", "d/dx(3x^2) = 6x", "1/6", complexity=3, pair="lim-lh1")
lim("l'Hôpital on a determinate quotient", IND, "(x+1)/(x+2)", "0", ["by l'Hôpital, = 1/1 = 1"], ["final: 1"], "invalid",
    "not 0/0; direct substitution gives 1/2", "1/2", difficulty="easy", pair="lim-lh2")
lim("direct substitution for a determinate quotient", LV, "(x+1)/(x+2)", "0", ["continuous at 0: = 1/2"], ["final: 1/2"],
    "valid-equivalence", "continuity", "1/2", difficulty="easy", pair="lim-lh2")
lim("l'Hôpital cited where it does not apply, value coincidentally right", REASON, "(2+2x)/(1+x)", "0", ["by l'Hôpital, = 2/1 = 2"],
    ["final: 2"], "wrong-reason", "the form is 2/1, not indeterminate; the value 2 is right only because the quotient is constant 2",
    "2", pair="lim-lh2")
lim("l'Hôpital on oo/oo", IND, "ln(x)/x", "oo", ["oo/oo, l'Hôpital: (1/x)/1 → 0"], ["final: 0"], "valid-equivalence",
    "valid oo/oo form", "0", pair="lim-lh3")
lim("oo/oo is not 1", IND, "ln(x)/x", "oo", ["both → oo, so the ratio → 1"], ["final: 1"], "invalid", "oo/oo is indeterminate; limit 0",
    "0", pair="lim-lh3")
lim("l'Hôpital twice at infinity", IND, "x^2/e^x", "oo", ["oo/oo: 2x/e^x", "oo/oo: 2/e^x → 0"], [None, "final: 0"],
    "valid-equivalence", "exponential dominates polynomials", "0")
lim("l'Hôpital at x = 1", IND, "(x-1)/ln(x)", "1", ["0/0: 1/(1/x) = x → 1"], ["final: 1"], "valid-equivalence", "standard", "1")
lim("l'Hôpital differentiates numerator and denominator separately", IND, "(e^x-1-x)/x^2", "0",
    ["0/0: (e^x - 1)/(2x)", "0/0: e^x/2 → 1/2"], [None, "final: 1/2"], "valid-equivalence", "two applications", "1/2", pair="lim-lh4")
lim("l'Hôpital misread as the quotient rule", IND, "(e^x-1-x)/x^2", "0",
    ["l'Hôpital: ((e^x-1)x^2 - (e^x-1-x)2x)/x^4", "→ 0"], [None, "final: 0"], "invalid",
    "l'Hôpital uses f'/g', not (f/g)'; the limit is 1/2", "1/2", complexity=3, pair="lim-lh4")
lim("rational at infinity by l'Hôpital (oo/oo)", IND, "(x^2+3)/(x+1)", "oo", ["oo/oo: 2x/1 → oo"], ["final: oo"], "valid-equivalence",
    "valid oo/oo application", "oo", pair="lim-inf3")

# ============================================================ limits at infinity of rational functions
lim("equal degrees: ratio of leading coefficients", LV, "(2x+1)/(3x-2)", "oo", ["divide by x: (2+1/x)/(3-2/x) → 2/3"], ["final: 2/3"],
    "valid-equivalence", "leading terms", "2/3", difficulty="easy", pair="lim-inf1")
lim("substituting 1 for x at infinity", LV, "(2x+1)/(3x-2)", "oo", ["= (2+1)/(3-2) = 3"], ["final: 3"], "invalid",
    "that is the value at x=1; limit 2/3", "2/3", difficulty="easy", pair="lim-inf1")
lim("ratio of constant terms is not the limit at infinity", LV, "(3x^2-x)/(x^2+1)", "oo", ["the constant terms give 0/1 = 0"],
    ["final: 0"], "invalid", "leading terms 3x^2/x^2 → 3", "3", pair="lim-inf1")
lim("equal degrees at minus infinity", LV, "(2x^3-x)/(5x^3+4)", "-oo", ["divide by x^3: (2-1/x^2)/(5+4/x^3) → 2/5"], ["final: 2/5"],
    "valid-equivalence", "same at ±oo", "2/5")
lim("degree numerator larger, odd excess, at -oo", LV, "(x^2+3)/(x+1)", "-oo", ["≈ x for large |x|", "→ -oo"], [None, "final: -oo"],
    "valid-equivalence", "x^2/x = x → -oo", "-oo", pair="lim-inf3")
lim("sign at -oo ignored", LV, "(x^2+3)/(x+1)", "-oo", ["degree of top larger, so → oo"], ["final: oo"], "invalid",
    "for x → -oo the quotient behaves like x → -oo", "-oo", pair="lim-inf3")
seq("degree of denominator larger", LV, "2n/(n^2+1)", ["divide by n^2: (2/n)/(1+1/n^2) → 0"], ["final: 0"], "valid-equivalence",
    "→ 0", "0", difficulty="easy", pair="lim-inf2")
seq("leading coefficients taken across different degrees", LV, "2n/(n^2+1)", ["leading coefficients 2 and 1, so → 2"], ["final: 2"],
    "invalid", "degrees differ; limit 0", "0", difficulty="easy", pair="lim-inf2")
seq("cubic over cubic", LV, "(5n^3+2)/(n^3-n)", ["→ 5/1 = 5"], ["final: 5"], "valid-equivalence", "leading terms", "5")
seq("quadratic over linear diverges", LV, "n^2/(n+1)", ["≈ n → oo"], ["final: oo"], "valid-equivalence", "degree excess 1", "oo")

# ============================================================ one-sided limits
lim("right limit of |x-3|/(x-3)", SIDE, "|x-3|/(x-3)", "3", ["for x > 3, |x-3| = x-3", "so the quotient is 1"], [None, "final: 1"],
    "valid-equivalence", "constant 1 on x>3", "1", side="right", pair="lim-os1")
lim("left limit of |x-3|/(x-3)", SIDE, "|x-3|/(x-3)", "3", ["for x < 3, |x-3| = 3-x", "so the quotient is -1"], [None, "final: -1"],
    "valid-equivalence", "constant -1 on x<3", "-1", side="left", pair="lim-os1")
lim("left limit taken as the right limit", SIDE, "|x-3|/(x-3)", "3", ["|x-3|/(x-3) = 1"], ["final: 1"], "invalid",
    "for x<3 the quotient is -1", "-1", side="left", pair="lim-os1")
lim("two-sided limit claimed where one-sided limits differ", EXIST, "|x|/x", "0", ["|x|/x = 1", "so the limit is 1"], [None, "final: 1"],
    "invalid", "right limit 1, left limit -1, so the two-sided limit does not exist. Uncertified: the oracle cannot compute a "
    "reference for a limit that does not exist", "does not exist", pair="lim-os1")
lim("right limit to +oo", SIDE, "1/(x-3)", "3", ["x - 3 → 0+", "so 1/(x-3) → +oo"], [None, "final: oo"], "valid-equivalence",
    "positive small denominator", "oo", side="right", pair="lim-os2")
lim("left limit sign error", SIDE, "1/(x-3)", "3", ["denominator → 0, so → +oo"], ["final: oo"], "invalid", "x-3 < 0 on the left: -oo",
    "-oo", side="left", pair="lim-os2")
lim("1/x from the left", SIDE, "1/x", "0", ["x < 0 small", "→ -oo"], [None, "final: -oo"], "valid-equivalence", "negative small denominator",
    "-oo", side="left", pair="lim-os3")
lim("two-sided 1/x claimed infinite", EXIST, "1/x", "0", ["1/(small) is large", "→ oo"], [None, "final: oo"], "invalid",
    "left limit -oo, right +oo; the two-sided limit does not exist (not even as oo). Uncertified: the oracle cannot compare a value "
    "against a two-sided limit that does not exist", "does not exist", pair="lim-os3")
lim("1/x^2 two-sided is +oo", LV, "1/x^2", "0", ["x^2 → 0+ from both sides", "→ +oo"], [None, "final: oo"], "valid-equivalence",
    "both one-sided limits are +oo", "oo", pair="lim-os3")
lim("tan at pi/2 from the left", SIDE, "tan(x)", "pi/2", ["sin → 1, cos → 0+", "→ +oo"], [None, "final: oo"], "valid-equivalence",
    "cos x > 0 just left of pi/2", "oo", side="left")
lim("e^(1/x) from the left", SIDE, "e^(1/x)", "0", ["1/x → -oo", "e^(-oo) = 0"], [None, "final: 0"], "valid-equivalence", "composition",
    "0", side="left", pair="lim-os4")
lim("e^(1/x) from the right", SIDE, "e^(1/x)", "0", ["1/x → +oo", "→ +oo"], [None, "final: oo"], "valid-equivalence", "composition",
    "oo", side="right", pair="lim-os4")
lim("e^(1/x) from the right taken as the left value", SIDE, "e^(1/x)", "0", ["1/x → -oo, so e^(1/x) → 0"], ["final: 0"], "invalid",
    "for x>0, 1/x → +oo", "oo", side="right", pair="lim-os4")
lim("arctan(1/x) from the right", SIDE, "atan(1/x)", "0", ["1/x → +oo", "atan → pi/2"], [None, "final: pi/2"], "valid-equivalence",
    "composition", "pi/2", side="right", pair="lim-os5")
lim("arctan(1/x) from the left", SIDE, "atan(1/x)", "0", ["1/x → -oo", "atan → -pi/2"], [None, "final: -pi/2"], "valid-equivalence",
    "composition", "-pi/2", side="left", pair="lim-os5")
lim("arctan(1/x) from the left: sign error", SIDE, "atan(1/x)", "0", ["1/x → oo, so → pi/2"], ["final: pi/2"], "invalid",
    "for x<0, 1/x → -oo", "-pi/2", side="left", pair="lim-os5")
lim("root at the edge of its domain", SIDE, "sqrt(x-2)", "2", ["continuous on [2, oo)", "= 0"], [None, "final: 0"], "valid-equivalence",
    "right-continuity", "0", side="right")
lim("cos(x)/x from the right", SIDE, "cos(x)/x", "0", ["numerator → 1, denominator → 0+", "→ oo"], [None, "final: oo"],
    "valid-equivalence", "1/0+", "oo", side="right")

# ============================================================ squeeze
lim("squeeze x^2 sin(1/x)", LV, "x^2 sin(1/x)", "0", ["-x^2 <= x^2 sin(1/x) <= x^2", "both bounds → 0", "by the squeeze theorem → 0"],
    [None, None, "final: 0"], "valid-equivalence", "|sin| <= 1", "0", pair="lim-sq1")
lim("product rule for limits used on a factor with no limit", REASON, "x^2 sin(1/x)", "0",
    ["lim x^2 = 0 and lim sin(1/x) = 0", "so the product → 0·0 = 0"], [None, "final: 0"], "wrong-reason",
    "sin(1/x) has no limit at 0; the value 0 is right by the squeeze theorem, not by the product rule", "0", pair="lim-sq1")
lim("squeeze x sin(1/x)", LV, "x sin(1/x)", "0", ["|x sin(1/x)| <= |x| → 0"], ["final: 0"], "valid-equivalence", "squeeze", "0",
    pair="lim-sq2")
lim("sin x / x at infinity by squeeze", LV, "sin(x)/x", "oo", ["|sin(x)/x| <= 1/x → 0"], ["final: 0"], "valid-equivalence",
    "bounded over unbounded", "0", pair="lim-sq3")
lim("standard limit sin x / x misapplied at infinity", LV, "sin(x)/x", "oo", ["sin(x)/x → 1"], ["final: 1"], "invalid",
    "sin(x)/x → 1 only as x → 0", "0", pair="lim-sq3")
lim("x sin(1/x) at infinity via t = 1/x", LV, "x sin(1/x)", "oo", ["let t = 1/x → 0+", "= sin(t)/t → 1"], [None, "final: 1"],
    "valid-equivalence", "substitution", "1", pair="lim-sq2")
lim("squeeze misapplied at infinity", LV, "x sin(1/x)", "oo", ["|x sin(1/x)| <= |x|", "so by the squeeze theorem → 0"],
    [None, "final: 0"], "invalid", "the bound |x| → oo squeezes nothing; limit is 1", "1", pair="lim-sq2")
seq("squeeze cos n / n", LV, "cos(n)/n", ["|cos(n)/n| <= 1/n → 0"], ["final: 0"], "valid-equivalence", "squeeze", "0")
seq("squeeze sin n / n", LV, "sin(n)/n", ["-1/n <= sin(n)/n <= 1/n"], [None], "incomplete", "bounds stated, no conclusion drawn", "0")
lim("bounded plus vanishing at infinity", LV, "(x+sin(x))/x", "oo", ["= 1 + sin(x)/x", "→ 1 + 0 = 1"],
    ["claim: (x+sin(x))/x = 1 + sin(x)/x", "final: 1"], "valid-equivalence", "|sin x / x| <= 1/x", "1", pair="lim-lh5")
pf("limit-existence", "failure of l'Hôpital is not non-existence of the limit", REASON, "lim_{x→oo} (x+sin x)/x does not exist",
   ["oo/oo, l'Hôpital: (1+cos x)/1", "this oscillates, so the limit does not exist"], "unsupported",
   "l'Hôpital gives no information when f'/g' has no limit; the limit is 1", "1", truth="invalid", difficulty="hard", pair="lim-lh5")

# ============================================================ sequence limits (var n)
seq("n-th root of n", LV, "n^(1/n)", ["ln(n^(1/n)) = ln(n)/n → 0", "so n^(1/n) → e^0 = 1"], [None, "final: 1"], "valid-equivalence",
    "log trick", "1", pair="lim-sq4")
seq("oo^0 handled by logs, but the log limit misjudged", IND, "n^(1/n)", ["n^(1/n) = e^(ln(n)/n)", "ln(n)/n → 1", "so n^(1/n) → e"],
    [None, None, "final: e"], "invalid", "ln(n)/n → 0 (log grows slower than n); limit 1", "1", pair="lim-sq4")
seq("exponential beats polynomial", LV, "n e^(-n)", ["= n/e^n → 0"], ["final: 0"], "valid-equivalence", "standard growth", "0")
seq("log grows slower than n", LV, "ln(n)/n", ["ln(n) grows slower than n", "→ 0"], [None, "final: 0"], "valid-equivalence", "growth rates",
    "0", pair="lim-sq5")
seq("oo/oo taken as 1 for a sequence", IND, "ln(n)/n", ["both → oo", "so → 1"], [None, "final: 1"], "invalid", "limit 0", "0",
    pair="lim-sq5")
seq("shifted ratio", LV, "(n+1)/n", ["= 1 + 1/n → 1"], ["final: 1"], "valid-equivalence", "1/n → 0", "1", difficulty="easy")
seq("n sin(1/n)", LV, "n sin(1/n)", ["= sin(1/n)/(1/n) → 1"], ["final: 1"], "valid-equivalence", "standard limit with t = 1/n", "1",
    pair="lim-sq6")
seq("vanishing factor does not force a zero limit", IND, "n sin(1/n)", ["sin(1/n) → 0, so the product → 0"], ["final: 0"], "invalid",
    "oo·0 is indeterminate; limit 1", "1", pair="lim-sq6")
seq("difference of square roots", IND, "sqrt(n+1)-sqrt(n)", ["= 1/(sqrt(n+1)+sqrt(n))", "→ 0"],
    ["claim: sqrt(n+1)-sqrt(n) = 1/(sqrt(n+1)+sqrt(n))", "final: 0"], "valid-equivalence", "conjugate", "0")
seq("exponential decay", LV, "e^(-n)", ["e^(-n) = 1/e^n → 0"], ["final: 0"], "valid-equivalence", "standard", "0", difficulty="easy")
seq("n^2 e^(-n)", LV, "n^2 e^(-n)", ["exponential beats any power", "→ 0"], [None, "final: 0"], "valid-equivalence", "growth", "0")
seq("leading-term division begun, never concluded", FIN, "(n^2+1)/(2n^2-3)", ["divide top and bottom by n^2",
    "= (1 + 1/n^2)/(2 - 3/n^2)"], [None, "claim: (n^2+1)/(2n^2-3) = (1 + 1/n^2)/(2 - 3/n^2)"], "incomplete",
    "true rewrite, the value 1/2 is never stated", "1/2")

# ============================================================ compositions
lim("composite standard limits", LV, "sin(x^2)/(1-cos(x))", "0", ["= (sin(x^2)/x^2)·(x^2/(1-cos(x)))", "→ 1·2 = 2"],
    [None, "final: 2"], "valid-equivalence", "(1-cos x)/x^2 → 1/2", "2", difficulty="hard", complexity=3, composition=True, pair="lim-cp1")
lim("composite standard limits with a reciprocal error", LV, "sin(x^2)/(1-cos(x))", "0", ["= (sin(x^2)/x^2)·(x^2/(1-cos(x)))",
    "→ 1·(1/2) = 1/2"], [None, "final: 1/2"], "invalid", "x^2/(1-cos x) → 2, not 1/2", "2", difficulty="hard", complexity=3,
    composition=True, pair="lim-cp1")
lim("exponential of sine", LV, "(e^(sin(x))-1)/x", "0", ["= ((e^(sin(x))-1)/sin(x))·(sin(x)/x)", "→ 1·1 = 1"], [None, "final: 1"],
    "valid-equivalence", "chain of standard limits", "1", complexity=3, composition=True)
lim("log of cosine", LV, "ln(cos(x))/x^2", "0", ["ln(cos(x)) = ln(1 - (1-cos(x)))", "≈ -(1-cos(x)) ≈ -x^2/2", "→ -1/2"],
    [None, None, "final: -1/2"], "valid-equivalence", "ln(1+u)/u → 1 with u = cos x - 1", "-1/2", difficulty="hard", complexity=3,
    composition=True)
lim("conjugate over a sine", LV, "(sqrt(1+x)-1)/sin(x)", "0", ["= (x/sin(x))·(1/(sqrt(1+x)+1))", "→ 1·(1/2)"], [None, "final: 1/2"],
    "valid-equivalence", "rationalise and use x/sin x → 1", "1/2", complexity=3, composition=True, pair="lim-cp2")
lim("conjugate over a sine: rationalising factor inverted", LV, "(sqrt(1+x)-1)/sin(x)", "0", ["= (x/sin(x))·(sqrt(1+x)+1)", "→ 2"],
    [None, "final: 2"], "invalid", "(sqrt(1+x)-1) = x/(sqrt(1+x)+1); limit 1/2", "1/2", complexity=3, composition=True, pair="lim-cp2")
lim("tan over log", LV, "tan(2x)/ln(1+x)", "0", ["= (tan(2x)/(2x))·2·(x/ln(1+x))", "→ 2"], [None, "final: 2"], "valid-equivalence",
    "standard limits", "2", complexity=3, composition=True)
lim("squeeze inside an exponential", LV, "e^(x sin(1/x))", "0", ["x sin(1/x) → 0 by squeeze", "exp is continuous", "→ e^0 = 1"],
    [None, None, "final: 1"], "valid-equivalence", "continuity of exp", "1", complexity=3, composition=True)
lim("polynomial times decaying exponential at a one-sided singularity", LV, "e^(-1/x^2)/x", "0", ["let t = 1/x", "= t e^(-t^2) → 0 as |t| → oo"],
    [None, "final: 0"], "valid-equivalence", "exponential dominates", "0", difficulty="hard", complexity=3, composition=True)
lim("rational inside a root at infinity", LV, "sqrt((4x^2+1)/(x^2-3))", "oo", ["inside → 4", "sqrt continuous → 2"], [None, "final: 2"],
    "valid-equivalence", "continuity of sqrt", "2", complexity=2, composition=True)
lim("difference of logs at infinity", LV, "ln(2x+1) - ln(x+3)", "oo", ["= ln((2x+1)/(x+3))", "→ ln(2)"],
    [None, "final: ln(2)"], "valid-equivalence", "valid for x > -1/2", "ln(2)",
    complexity=3, composition=True, pair="lim-cp3")
lim("oo - oo of logs taken as 0", IND, "ln(2x+1) - ln(x+3)", "oo", ["both → oo, so the difference → 0"], ["final: 0"], "invalid",
    "oo - oo is indeterminate; limit ln 2", "ln(2)", composition=True, pair="lim-cp3")
lim("arctan of a rational function at infinity", LV, "atan((x^2+1)/x)", "oo", ["(x^2+1)/x → oo", "atan → pi/2"], [None, "final: pi/2"],
    "valid-equivalence", "composition", "pi/2", complexity=2, composition=True)
lim("arctan of a rational function at minus infinity", LV, "atan((x^2+1)/x)", "-oo", ["(x^2+1)/x → -oo", "atan → -pi/2"],
    [None, "final: -pi/2"], "valid-equivalence", "sign of x", "-pi/2", complexity=2, composition=True)

# ============================================================ non-existence (proof-style)
pf("limit-existence", "different one-sided limits", EXIST, "lim_{x→0} |x|/x does not exist",
   ["for x > 0, |x|/x = 1; for x < 0, |x|/x = -1", "the one-sided limits 1 and -1 differ", "so the limit does not exist"],
   "unsupported", "one-sided limits differ", "does not exist", truth="valid", pair="lim-dne1")
pf("limit-existence", "oscillation via two sequences", EXIST, "lim_{x→0} sin(1/x) does not exist",
   ["x_n = 1/(nπ) → 0 gives sin(1/x_n) = 0", "y_n = 2/((4n+1)π) → 0 gives sin(1/y_n) = 1", "different sequential limits, so no limit"],
   "unsupported", "sequential criterion", "does not exist", truth="valid", pair="lim-dne2")
pf("limit-existence", "oscillation of one factor does not prevent a limit", EXIST, "lim_{x→0} x sin(1/x) does not exist",
   ["sin(1/x) oscillates", "so x sin(1/x) has no limit"], "unsupported", "|x sin(1/x)| <= |x| → 0, so the limit is 0", "0",
   truth="invalid", pair="lim-dne2")
pf("sequence-limit", "alternating sequence", EXIST, "lim (-1)^n does not exist",
   ["even terms are 1, odd terms are -1", "two subsequences with different limits", "so the sequence diverges"], "unsupported",
   "subsequence criterion", "does not exist", truth="valid", pair="lim-dne3")
pf("sequence-limit", "a subsequence limit is not the limit", EXIST, "lim (-1)^n = 1",
   ["the even terms are all 1", "so the limit is 1"], "unsupported", "odd terms are -1; the sequence diverges", "does not exist",
   truth="invalid", pair="lim-dne3")
pf("limit-existence", "periodic function at infinity", EXIST, "lim_{x→oo} sin x does not exist",
   ["sin(2nπ) = 0 and sin(2nπ + π/2) = 1 for all n", "two sequences → oo with different limits"], "unsupported",
   "sequential criterion", "does not exist", truth="valid")
pf("limit-existence", "equal one-sided limits give a limit", EXIST, "lim_{x→0} x^2/|x| exists",
   ["for x > 0, x^2/|x| = x; for x < 0, x^2/|x| = -x", "both one-sided limits are 0", "so the limit is 0"], "unsupported",
   "x^2/|x| = |x| → 0", "0", truth="valid", pair="lim-dne1")
pf("limit-existence", "a limit at a point not in the domain may exist", EXIST, "lim_{x→1} (x^2-1)/(x-1) does not exist because the function is undefined at 1",
   ["f(1) = 0/0 is undefined", "so the limit at 1 does not exist"], "unsupported", "limits ignore the value at the point; the limit is 2",
   "2", truth="invalid")

# ============================================================ series convergence
pf("series-convergence", "n-th term → 0 is necessary, not sufficient", CONV, "Σ 1/n converges",
   ["1/n → 0", "so Σ 1/n converges"], "invalid", "harmonic series diverges (grouping: each block 1/(2^k+1)+...+1/2^(k+1) >= 1/2)",
   "diverges", pair="lim-harm")
pf("series-convergence", "n-th term → 0 cited as sufficient for a convergent series", REASON, "Σ 1/n^2 converges",
   ["1/n^2 → 0", "so Σ 1/n^2 converges"], "wrong-reason", "conclusion true (p-series p=2>1) but terms → 0 does not imply convergence",
   "converges", pair="lim-harm")
pf("series-convergence", "p-series test", TEST, "Σ 1/n^2 converges",
   ["Σ 1/n^p converges for p > 1", "here p = 2", "so it converges"], "unsupported", "p-series", "converges", truth="valid", pair="lim-harm")
pf("series-convergence", "harmonic series diverges by the integral test", TEST, "Σ 1/n diverges",
   ["1/x is positive and decreasing", "∫_1^oo dx/x = lim ln(b) = oo", "so Σ 1/n diverges"], "unsupported", "integral test", "diverges",
   truth="valid", pair="lim-harm")
pf("series-convergence", "ratio-test limit 1 is inconclusive", TEST, "Σ 1/n converges by the ratio test",
   ["a_(n+1)/a_n = n/(n+1) → 1", "the ratio limit is not bigger than 1", "so the series converges"], "invalid",
   "ratio limit 1 gives no conclusion; the harmonic series diverges", "diverges", pair="lim-ratio")
pf("series-convergence", "ratio-test limit 1 cited for a convergent series", REASON, "Σ 1/n^2 converges by the ratio test",
   ["a_(n+1)/a_n = n^2/(n+1)^2 → 1", "so the series converges by the ratio test"], "wrong-reason",
   "true conclusion, but the ratio test with limit 1 is inconclusive", "converges", pair="lim-ratio")
pf("series-convergence", "ratio test with limit below 1", TEST, "Σ n/2^n converges",
   ["a_(n+1)/a_n = (n+1)/(2n) → 1/2", "1/2 < 1, so the series converges"], "unsupported", "ratio test", "converges", truth="valid",
   pair="lim-ratio")
pf("series-convergence", "ratio test with factorials", TEST, "Σ 2^n/n! converges",
   ["a_(n+1)/a_n = 2/(n+1) → 0 < 1", "so it converges"], "unsupported", "ratio test", "converges", truth="valid", pair="lim-fact")
pf("series-convergence", "ratio test giving divergence", TEST, "Σ n!/2^n diverges",
   ["a_(n+1)/a_n = (n+1)/2 → oo > 1", "so it diverges"], "unsupported", "ratio test", "diverges", truth="valid", pair="lim-fact")
pf("series-convergence", "ratio test for n!/n^n", TEST, "Σ n!/n^n converges",
   ["a_(n+1)/a_n = (n/(n+1))^n → 1/e", "1/e < 1"], "unsupported", "ratio test", "converges", truth="valid", difficulty="hard")
pf("series-convergence", "ratio test arithmetic error flips the conclusion", TEST, "Σ n!/n^n diverges",
   ["a_(n+1)/a_n = ((n+1)/n)^n → e", "e > 1, so the series diverges"], "unsupported",
   "the ratio is (n/(n+1))^n → 1/e < 1; the series converges", "converges", truth="invalid", difficulty="hard")
pf("series-convergence", "direct comparison with a convergent series", TEST, "Σ 1/(n^2+1) converges",
   ["0 < 1/(n^2+1) < 1/n^2", "Σ 1/n^2 converges", "so Σ 1/(n^2+1) converges"], "unsupported", "comparison", "converges", truth="valid",
   pair="lim-cmp")
pf("series-convergence", "comparison in the wrong direction", REASON, "Σ 1/(n+1) diverges",
   ["1/(n+1) < 1/n", "Σ 1/n diverges", "so Σ 1/(n+1) diverges"], "wrong-reason",
   "being smaller than a divergent series proves nothing; the conclusion is true (it is the harmonic series shifted)", "diverges",
   pair="lim-cmp")
pf("series-convergence", "comparison in the wrong direction with a false conclusion", CONV, "Σ 1/(n ln n) converges (n >= 2)",
   ["1/(n ln n) < 1/n for n >= 3", "so Σ 1/(n ln n) converges"], "unsupported",
   "smaller than a divergent series proves nothing, and the series diverges (integral of 1/(x ln x) is ln ln x → oo)", "diverges",
   truth="invalid", difficulty="hard", pair="lim-cmp")
pf("series-convergence", "comparison with a divergent series from below", TEST, "Σ 1/sqrt(n) diverges",
   ["1/sqrt(n) >= 1/n for n >= 1", "Σ 1/n diverges", "so Σ 1/sqrt(n) diverges"], "unsupported", "comparison", "diverges", truth="valid",
   pair="lim-cmp")
pf("series-convergence", "comparison with a geometric series", TEST, "Σ 1/(2^n + n) converges",
   ["1/(2^n + n) < 1/2^n", "Σ 1/2^n converges"], "unsupported", "comparison", "converges", truth="valid")
pf("series-convergence", "limit comparison", TEST, "Σ (n+1)/(n^3+2) converges",
   ["a_n/(1/n^2) = (n^3+n^2)/(n^3+2) → 1", "Σ 1/n^2 converges", "so the series converges"], "unsupported", "limit comparison",
   "converges", truth="valid")
pf("series-convergence", "divergence test", CONV, "Σ n/(n+1) diverges",
   ["n/(n+1) → 1 ≠ 0", "so the series diverges"], "unsupported", "n-th term test", "diverges", truth="valid", pair="lim-nth")
pf("series-convergence", "n-th term not tending to 0 cannot be outweighed", CONV, "Σ n/(n+1) converges",
   ["n/(n+1) < 1 for every n", "bounded terms, so the series converges"], "unsupported",
   "terms → 1, partial sums grow without bound", "diverges", truth="invalid", pair="lim-nth")
pf("series-convergence", "bounded partial sums do not imply convergence", CONV, "Σ (-1)^n converges",
   ["partial sums are 0 or -1 (bounded)", "so the series converges"], "unsupported", "terms do not → 0; partial sums oscillate",
   "diverges", truth="invalid", pair="lim-nth")
pf("series-convergence", "alternating series test", TEST, "Σ (-1)^n/n converges",
   ["1/n decreases to 0", "by the alternating series test it converges"], "unsupported", "Leibniz", "converges", truth="valid",
   pair="lim-alt")
pf("series-convergence", "conditional vs absolute convergence", TEST, "Σ (-1)^n/n converges absolutely",
   ["1/n decreases to 0", "so the series converges absolutely"], "unsupported", "Σ |(-1)^n/n| = Σ 1/n diverges; only conditional",
   "converges conditionally", truth="invalid", pair="lim-alt")
pf("series-convergence", "absolute convergence by comparison", TEST, "Σ sin(n)/n^2 converges",
   ["|sin(n)/n^2| <= 1/n^2", "Σ 1/n^2 converges", "absolute convergence implies convergence"], "unsupported", "comparison",
   "converges", truth="valid", pair="lim-alt")
pf("series-convergence", "geometric series with ratio > 1", CONV, "Σ_{n>=0} (3/2)^n = -2",
   ["geometric sum = 1/(1 - r)", "= 1/(1 - 3/2) = -2"], "invalid", "the formula needs |r| < 1; the series diverges", "diverges",
   pair="lim-geo")
pf("series-convergence", "geometric series sum", TEST, "Σ_{n>=0} (1/2)^n = 2",
   ["|r| = 1/2 < 1", "sum = 1/(1 - 1/2) = 2"], "unsupported", "geometric series", "2", truth="valid", difficulty="easy", pair="lim-geo")
pf("series-convergence", "geometric series starting index", TEST, "Σ_{n>=1} (1/2)^n = 2",
   ["sum = 1/(1 - 1/2) = 2"], "unsupported", "starting at n=1 the sum is (1/2)/(1-1/2) = 1", "1", truth="invalid", pair="lim-geo")
pf("series-convergence", "telescoping series", TEST, "Σ_{n>=1} 1/(n(n+1)) = 1",
   ["1/(n(n+1)) = 1/n - 1/(n+1)", "partial sum S_N = 1 - 1/(N+1)", "→ 1"], "unsupported", "telescoping", "1", truth="valid",
   pair="lim-tel")
pf("series-convergence", "telescoping series with a lost term", TEST, "Σ_{n>=1} 1/(n(n+1)) = 1/2",
   ["1/(n(n+1)) = 1/n - 1/(n+1)", "S_N = 1/2 - 1/(N+1)", "→ 1/2"], "unsupported", "S_N = 1 - 1/(N+1); the first term is 1, not 1/2",
   "1", truth="invalid", pair="lim-tel")
pf("series-convergence", "root test", TEST, "Σ (n/(2n+1))^n converges",
   ["(a_n)^(1/n) = n/(2n+1) → 1/2 < 1", "so it converges"], "unsupported", "root test", "converges", truth="valid")
pf("series-convergence", "integral test for p = 1/2", TEST, "Σ 1/n^(1/2) converges because ∫ x^(-1/2) dx = 2sqrt(x)",
   ["an antiderivative exists, so the integral test gives convergence"], "unsupported",
   "∫_1^oo x^(-1/2) dx = lim 2sqrt(b) - 2 = oo; the series diverges", "diverges", truth="invalid", pair="lim-cmp")

# ============================================================ epsilon-delta / epsilon-N
pf("epsilon-delta-proof", "linear limit with delta = epsilon/3", EPS, "lim_{x→2} (3x+1) = 7",
   ["given ε > 0, let δ = ε/3", "if 0 < |x-2| < δ then |3x+1-7| = 3|x-2| < 3δ = ε"], "unsupported", "correct choice", "7", truth="valid",
   pair="lim-ed1")
pf("epsilon-delta-proof", "delta chosen too large", EPS, "lim_{x→2} (3x+1) = 7",
   ["given ε > 0, let δ = 3ε", "if |x-2| < δ then |3x+1-7| = 3|x-2| < ε"], "unsupported",
   "3|x-2| < 9ε, not ε (e.g. ε=1, x=4.5 gives 7.5)", "7", truth="invalid", pair="lim-ed1")
pf("epsilon-delta-proof", "quadratic limit with a bounded factor", EPS, "lim_{x→2} x^2 = 4",
   ["let δ = min(1, ε/5)", "|x-2| < 1 gives |x+2| < 5", "|x^2-4| = |x-2||x+2| < 5δ <= ε"], "unsupported", "standard bounding",
   "4", truth="valid", difficulty="hard", pair="lim-ed2")
pf("epsilon-delta-proof", "unbounded factor ignored", EPS, "lim_{x→2} x^2 = 4",
   ["let δ = ε/4", "|x^2-4| = |x-2||x+2| < 4δ = ε"], "unsupported",
   "|x+2| < 4 is not guaranteed (ε=100, δ=25, x=26 gives 672 > 100)", "4", truth="invalid", difficulty="hard", pair="lim-ed2")
pf("epsilon-delta-proof", "delta may not depend on x", EPS, "lim_{x→2} x^2 = 4",
   ["let δ = ε/|x+2|", "then |x^2-4| = |x-2||x+2| < ε"], "unsupported", "δ must be chosen before x; it may depend on ε only",
   "4", truth="invalid", difficulty="hard", pair="lim-ed2")
pf("epsilon-delta-proof", "squeeze in epsilon-delta form", EPS, "lim_{x→0} x sin(1/x) = 0",
   ["let δ = ε", "|x sin(1/x)| <= |x| < δ = ε"], "unsupported", "|sin| <= 1", "0", truth="valid")
pf("epsilon-delta-proof", "reciprocal near a nonzero point", EPS, "lim_{x→1} 1/x = 1",
   ["let δ = min(1/2, ε/2)", "|x-1| < 1/2 gives x > 1/2", "|1/x - 1| = |x-1|/x < 2δ <= ε"], "unsupported", "standard", "1", truth="valid",
   difficulty="hard")
pf("sequence-limit", "epsilon-N for 1/n", EPS, "lim 1/n = 0",
   ["given ε > 0 choose N > 1/ε", "for n > N, |1/n| < 1/N < ε"], "unsupported", "Archimedean property", "0", truth="valid", pair="lim-en1")
pf("sequence-limit", "N must depend on epsilon correctly", EPS, "lim 1/n = 0",
   ["given ε > 0 choose N = ε", "for n > N, 1/n < ε"], "unsupported", "ε = 1/2, N = 1/2, n = 1 gives 1 > 1/2", "0", truth="invalid",
   pair="lim-en1")
pf("sequence-limit", "single epsilon does not prove a limit", EPS, "lim (-1)^n = 1",
   ["take ε = 3", "every term is within 3 of 1", "so the limit is 1"], "unsupported", "must hold for every ε > 0; fails for ε = 1",
   "does not exist", truth="invalid", pair="lim-en2")
pf("sequence-limit", "epsilon-N for n/(n+1)", EPS, "lim n/(n+1) = 1",
   ["|n/(n+1) - 1| = 1/(n+1)", "choose N > 1/ε; for n > N, 1/(n+1) < ε"], "unsupported", "standard", "1", truth="valid", pair="lim-en2")
seq("the epsilon-N value computed as an ordinary limit", LV, "n/(n+1)", ["= 1 - 1/(n+1) → 1"], ["final: 1"], "valid-equivalence",
    "same limit computed directly", "1", pair="lim-en2")

# ============================================================ monotone convergence
pf("sequence-limit", "monotone convergence then fixed point", MON, "a_1 = 1, a_(n+1) = sqrt(2 + a_n) converges to 2",
   ["by induction a_n < 2 and a_(n+1) > a_n", "increasing and bounded, so a_n → L", "L = sqrt(2 + L), L >= 0, so L = 2"],
   "unsupported", "existence established before solving for L", "2", truth="valid", difficulty="hard", pair="lim-mon1")
pf("sequence-limit", "fixed-point equation without existence", MON, "a_1 = 1, a_(n+1) = 2a_n converges to 0",
   ["if a_n → L then L = 2L", "so L = 0"], "unsupported", "a_n = 2^(n-1) → oo; the fixed-point step assumed a limit exists",
   "diverges", truth="invalid", pair="lim-mon1")
pf("sequence-limit", "fixed point with sign of the limit", MON, "a_1 = 1, a_(n+1) = sqrt(2 + a_n) converges to -1",
   ["L = sqrt(2 + L) gives L^2 - L - 2 = 0", "L = 2 or L = -1", "take L = -1"], "unsupported",
   "a_n > 0 so L >= 0; -1 is extraneous from squaring", "2", truth="invalid", pair="lim-mon1")
pf("sequence-limit", "Babylonian iteration", MON, "a_1 = 2, a_(n+1) = (a_n + 2/a_n)/2 → sqrt(2)",
   ["by AM-GM a_(n+1) >= sqrt(2)", "a_(n+1) - a_n = (2 - a_n^2)/(2a_n) <= 0", "decreasing, bounded below: L = (L + 2/L)/2, L = sqrt(2)"],
   "unsupported", "monotone convergence", "sqrt(2)", truth="valid", difficulty="hard")
pf("sequence-limit", "bounded does not imply convergent", MON, "sin(n) converges",
   ["|sin(n)| <= 1, so the sequence is bounded", "bounded sequences converge"], "unsupported",
   "boundedness alone is not enough (e.g. (-1)^n); monotonicity is also needed", "diverges", truth="invalid", pair="lim-mon2")
pf("sequence-limit", "increasing does not imply convergent", MON, "a_n = ln(n) converges",
   ["ln(n) is increasing", "monotone sequences converge"], "unsupported", "needs boundedness; ln n → oo", "diverges", truth="invalid",
   pair="lim-mon2")
pf("sequence-limit", "monotone and bounded", MON, "a_n = 1 - 1/n converges",
   ["a_n is increasing", "a_n < 1 for all n", "by the monotone convergence theorem it converges"], "unsupported", "MCT", "1", truth="valid",
   pair="lim-mon2")
pf("sequence-limit", "a lower bound is not the limit", MON, "a_n = 1 + 1/n → 0",
   ["a_n is decreasing", "a_n > 0 for all n", "so a_n → 0"], "unsupported", "the limit is the infimum 1, not an arbitrary lower bound 0",
   "1", truth="invalid", pair="lim-mon3")
pf("sequence-limit", "limit of a decreasing sequence is its infimum", MON, "a_n = 1 + 1/n → 1",
   ["a_n is decreasing and bounded below by 1", "inf a_n = 1", "so a_n → 1"], "unsupported", "MCT gives limit = infimum", "1",
   truth="valid", pair="lim-mon3")
pf("sequence-limit", "(1+1/n)^n increasing and bounded", MON, "(1+1/n)^n converges",
   ["by the binomial theorem (1+1/n)^n is increasing", "and (1+1/n)^n < 1 + 1 + 1/2 + 1/4 + ... = 3", "so it converges (to e)"],
   "unsupported", "standard proof", "e", truth="valid", difficulty="hard")

# ============================================================ extra minimal pairs / compositions with limits
lim("limit of a composition through a continuous outer function", LV, "cos((x^2-1)/(x-1))", "1", ["(x^2-1)/(x-1) → 2", "cos continuous → cos(2)"],
    [None, "final: cos(2)"], "valid-equivalence", "continuity of cos", "cos(2)", complexity=2, composition=True, pair="lim-cp4")
lim("outer function evaluated at the indeterminate point", LV, "cos((x^2-1)/(x-1))", "1", ["at x = 1 the inside is 0/0 = 0", "→ cos(0) = 1"],
    [None, "final: 1"], "invalid", "inside → 2; limit cos 2", "cos(2)", composition=True, pair="lim-cp4")
lim("one-sided limit of a log near its boundary", SIDE, "ln(x-1)", "1", ["x - 1 → 0+", "ln → -oo"], [None, "final: -oo"],
    "valid-equivalence", "ln u → -oo as u → 0+", "-oo", side="right", pair="lim-cp5")
lim("one-sided log limit with the wrong sign", SIDE, "ln(x-1)", "1", ["x - 1 → 0", "ln(0) = 0"], [None, "final: 0"], "invalid",
    "ln(0) is undefined; ln u → -oo", "-oo", side="right", pair="lim-cp5")
lim("limit at infinity of a difference quotient form", LV, "x(e^(1/x) - 1)", "oo", ["let t = 1/x → 0+", "= (e^t - 1)/t → 1"],
    [None, "final: 1"], "valid-equivalence", "standard limit", "1", complexity=3, composition=True)
lim("rational times trig at infinity", LV, "(x^2/(x+1)) sin(1/x)", "oo", ["= (x/(x+1))·(x sin(1/x))", "→ 1·1 = 1"], [None, "final: 1"],
    "valid-equivalence", "product of limits", "1", difficulty="hard", complexity=3, composition=True)
lim("l'Hôpital on a composite 0/0", IND, "(atan(x) - x)/x^3", "0", ["0/0: (1/(1+x^2) - 1)/(3x^2)", "= -1/(3(1+x^2)) → -1/3"],
    ["claim: d/dx(atan(x) - x) = 1/(1+x^2) - 1", "final: -1/3"], "valid-equivalence", "(1/(1+x^2) - 1) = -x^2/(1+x^2)", "-1/3",
    difficulty="hard", complexity=4, composition=True, pair="lim-cp6")
lim("l'Hôpital on a composite with a sign error", IND, "(atan(x) - x)/x^3", "0", ["0/0: (1 - 1/(1+x^2))/(3x^2)", "→ 1/3"],
    ["claim: d/dx(atan(x) - x) = 1 - 1/(1+x^2)", "final: 1/3"], "invalid", "the derivative is 1/(1+x^2) - 1", "-1/3",
    difficulty="hard", complexity=4, composition=True, pair="lim-cp6")
