"""CAL — Differentiation and integration. Every label derived by hand; the oracle is a check, not the source.

Oracle-text note: the oracle cannot decide ln|linear| antiderivatives directly, so where a student writes ln|g(x)| the
oracle line uses the identical function (1/2)ln(g(x)^2) (same function on the same domain, not a different answer).
"""
from schema import W

C = "CAL"


def d(principle, invariant, f, work, ol, rel, why, ans, **kw):
    return W(C, principle, invariant, {"type": "derivative", "f": f, "var": "x"}, work, rel, why=why, answer=ans, oracle_lines=ol, **kw)


def ii(principle, invariant, f, work, ol, rel, why, ans, **kw):
    return W(C, principle, invariant, {"type": "indefinite-integral", "f": f, "var": "x"}, work, rel, why=why, answer=ans, oracle_lines=ol, **kw)


def di(principle, invariant, f, a, b, work, ol, rel, why, ans, **kw):
    return W(C, principle, invariant, {"type": "definite-integral", "f": f, "a": a, "b": b, "var": "x"}, work, rel, why=why, answer=ans,
             oracle_lines=ol, **kw)


def st(principle, invariant, statement, work, truth, why, ans, **kw):
    return W(C, principle, invariant, {"type": "statement-task", "calculusTask": "differentiability", "statement": statement}, work,
             "unsupported", truth=truth, why=why, answer=ans, oracle_lines=[None] * len(work), **kw)


DER = "derivative correctness"
ANTI = "antiderivative correctness"
PC = "constant of integration"
DOMA = "antiderivative domain (ln|u| vs ln u)"
DEF = "definite-integral value"
REASON = "cited rule must justify the step"
FORGE = "every intermediate line must be true"
FIN = "task completion"

# ============================================================ power rule
d("power rule term by term; constant differentiates to 0", DER, "x^5 - 3x^2 + 7",
  ["f'(x) = 5x^4 - 6x"], ["final: 5x^4 - 6x"], "valid-equivalence", "d/dx x^n = n x^(n-1); d/dx 7 = 0", "5x^4 - 6x",
  difficulty="easy", complexity=1, pair="cal-pw1")
d("constant term must vanish under differentiation", DER, "x^5 - 3x^2 + 7",
  ["f'(x) = 5x^4 - 6x + 7"], ["final: 5x^4 - 6x + 7"], "invalid", "the constant 7 has derivative 0; answer is off by 7", "5x^4 - 6x",
  difficulty="easy", complexity=1, pair="cal-pw1")
d("power rule with negative exponent", DER, "1/x^3",
  ["f(x) = x^(-3)", "f'(x) = -3x^(-4)", "= -3/x^4"], ["claim: 1/x^3 = x^(-3)", None, "final: -3/x^4"], "valid-equivalence",
  "x^-3 -> -3x^-4", "-3/x^4", difficulty="easy", pair="cal-pw2")
d("reciprocal is not differentiated by differentiating the denominator", DER, "1/x^3",
  ["f'(x) = 1/(3x^2)"], ["final: 1/(3x^2)"], "invalid", "true derivative -3/x^4; at x=1 it is -3, not 1/3", "-3/x^4",
  difficulty="easy", pair="cal-pw2")
d("rewrite product of powers before power rule", DER, "x sqrt(x)",
  ["f(x) = x^(3/2)", "f'(x) = (3/2)x^(1/2)", "= 3sqrt(x)/2"], ["claim: x sqrt(x) = x^(3/2)", None, "final: 3sqrt(x)/2"],
  "valid-equivalence", "x*x^(1/2)=x^(3/2), derivative (3/2)x^(1/2)", "3sqrt(x)/2", difficulty="easy")
d("sum of power terms incl. negative and fractional powers", DER, "4x^3 - 2/x + 5sqrt(x)",
  ["f'(x) = 12x^2 + 2/x^2 + 5/(2sqrt(x))"], ["final: 12x^2 + 2/x^2 + 5/(2sqrt(x))"], "valid-equivalence",
  "d(-2x^-1) = 2x^-2; d(5x^(1/2)) = (5/2)x^(-1/2)", "12x^2 + 2/x^2 + 5/(2sqrt(x))", pair="cal-pw3")
d("sign of the derivative of -2/x", DER, "4x^3 - 2/x + 5sqrt(x)",
  ["f'(x) = 12x^2 - 2/x^2 + 5/(2sqrt(x))"], ["final: 12x^2 - 2/x^2 + 5/(2sqrt(x))"], "invalid",
  "d/dx(-2x^-1) = +2x^-2, not -2x^-2; differs by 4/x^2", "12x^2 + 2/x^2 + 5/(2sqrt(x))", pair="cal-pw3")
d("expand then apply the power rule", DER, "(x^2+1)^2",
  ["(x^2+1)^2 = x^4 + 2x^2 + 1", "f'(x) = 4x^3 + 4x"], ["claim: (x^2+1)^2 = x^4 + 2x^2 + 1", "final: 4x^3 + 4x"], "valid-equivalence",
  "expansion exact; termwise power rule", "4x^3 + 4x", pair="cal-pw4")
d("power rule on a composite requires the chain factor", DER, "(x^2+1)^2",
  ["by the power rule f'(x) = 2(x^2+1)"], ["final: 2(x^2+1)"], "invalid", "missing inner derivative 2x; correct 4x(x^2+1)",
  "4x^3 + 4x", pair="cal-pw4")
d("forged expansion that happens to give the right derivative", FORGE, "(x+1)^2",
  ["(x+1)^2 = x^2 + 2x + 2", "f'(x) = 2x + 2"], ["claim: (x+1)^2 = x^2 + 2x + 2", "final: 2x + 2"], "invalid",
  "(x+1)^2 = x^2+2x+1, the stated expansion is false (x=0: 1 vs 2) even though the constant error vanishes on differentiation",
  "2x + 2", pair="cal-forge1")
d("correct expansion then power rule", DER, "(x+1)^2",
  ["(x+1)^2 = x^2 + 2x + 1", "f'(x) = 2x + 2"], ["claim: (x+1)^2 = x^2 + 2x + 1", "final: 2x + 2"], "valid-equivalence",
  "exact expansion; derivative 2x+2", "2x + 2", difficulty="easy", pair="cal-forge1")

# ============================================================ product rule
d("product rule", DER, "x^3 e^x", ["f'(x) = 3x^2 e^x + x^3 e^x"], ["final: 3x^2 e^x + x^3 e^x"], "valid-equivalence",
  "(uv)' = u'v + uv'", "3x^2 e^x + x^3 e^x", difficulty="easy", pair="cal-pr1")
d("derivative of a product is not the product of derivatives", DER, "x^3 e^x", ["f'(x) = 3x^2 e^x"], ["final: 3x^2 e^x"], "invalid",
  "u'v' = 3x^2 e^x omits u v' = x^3 e^x; at x=1: 3e vs 4e", "3x^2 e^x + x^3 e^x", difficulty="easy", pair="cal-pr1")
d("product rule with a logarithm", DER, "x ln(x)", ["f'(x) = 1·ln(x) + x·(1/x)", "= ln(x) + 1"], [None, "final: ln(x) + 1"],
  "valid-equivalence", "(x)' ln x + x (ln x)'", "ln(x) + 1", difficulty="easy")
d("product rule with cosine", DER, "x^2 cos(x)", ["f'(x) = 2x cos(x) - x^2 sin(x)"], ["final: 2x cos(x) - x^2 sin(x)"],
  "valid-equivalence", "(cos x)' = -sin x", "2x cos(x) - x^2 sin(x)", pair="cal-pr2")
d("derivative of cosine carries a minus sign", DER, "x^2 cos(x)", ["f'(x) = 2x cos(x) + x^2 sin(x)"], ["final: 2x cos(x) + x^2 sin(x)"],
  "invalid", "(cos x)' = -sin x; at x=pi/2: -pi^2/4 vs +pi^2/4", "2x cos(x) - x^2 sin(x)", pair="cal-pr2")
d("triple product rule", DER, "x e^x sin(x)", ["f'(x) = e^x sin(x) + x e^x sin(x) + x e^x cos(x)"],
  ["final: e^x sin(x) + x e^x sin(x) + x e^x cos(x)"], "valid-equivalence", "(uvw)' = u'vw + uv'w + uvw'",
  "e^x sin(x) + x e^x sin(x) + x e^x cos(x)", complexity=3, pair="cal-pr3")
d("triple product rule needs three terms", DER, "x e^x sin(x)", ["f'(x) = e^x sin(x) + x e^x cos(x)"],
  ["final: e^x sin(x) + x e^x cos(x)"], "invalid", "omits the u v' w = x e^x sin x term; nonzero at x=pi/2",
  "e^x sin(x) + x e^x sin(x) + x e^x cos(x)", complexity=3, pair="cal-pr3")
d("product rule with named parts", DER, "e^x sin(x)",
  ["u = e^x, v = sin(x)", "u' = e^x, v' = cos(x)", "f'(x) = u'v + uv' = e^x sin(x) + e^x cos(x)"],
  [None, "claim: d/dx(sin(x)) = cos(x)", "final: e^x sin(x) + e^x cos(x)"], "valid-equivalence", "standard derivatives, product rule",
  "e^x (sin(x) + cos(x))", complexity=3)
d("product rule cited as chain rule", REASON, "x^2 sin(x)", ["by the chain rule, f'(x) = 2x sin(x) + x^2 cos(x)"],
  ["final: 2x sin(x) + x^2 cos(x)"], "wrong-reason", "the result is the product rule; x^2 sin x is a product, not a composition",
  "2x sin(x) + x^2 cos(x)")

# ============================================================ quotient rule
d("quotient rule", DER, "(x^2+1)/(x-1)",
  ["f'(x) = (2x(x-1) - (x^2+1)·1)/(x-1)^2", "= (x^2 - 2x - 1)/(x-1)^2"],
  ["claim: (2x(x-1) - (x^2+1))/(x-1)^2 = (x^2 - 2x - 1)/(x-1)^2", "final: (x^2 - 2x - 1)/(x-1)^2"], "valid-equivalence",
  "(u'v - uv')/v^2; 2x^2-2x-x^2-1 = x^2-2x-1", "(x^2 - 2x - 1)/(x-1)^2", pair="cal-qr1")
d("quotient rule numerator order matters", DER, "(x^2+1)/(x-1)",
  ["f'(x) = ((x^2+1)·1 - 2x(x-1))/(x-1)^2", "= (-x^2 + 2x + 1)/(x-1)^2"],
  [None, "final: (-x^2 + 2x + 1)/(x-1)^2"], "invalid", "uv' - u'v gives the negative of the derivative; nonzero difference at x=0",
  "(x^2 - 2x - 1)/(x-1)^2", pair="cal-qr1")
d("quotient rule with trig numerator", DER, "sin(x)/x", ["f'(x) = (x cos(x) - sin(x))/x^2"], ["final: (x cos(x) - sin(x))/x^2"],
  "valid-equivalence", "quotient rule", "(x cos(x) - sin(x))/x^2")
d("quotient rule with exponentials simplifies", DER, "e^x/(1+e^x)",
  ["f'(x) = (e^x(1+e^x) - e^x·e^x)/(1+e^x)^2", "= e^x/(1+e^x)^2"],
  ["claim: (e^x(1+e^x) - e^x e^x)/(1+e^x)^2 = e^x/(1+e^x)^2", "final: e^x/(1+e^x)^2"], "valid-equivalence",
  "e^x + e^(2x) - e^(2x) = e^x", "e^x/(1+e^x)^2")
d("tan as sin/cos via quotient rule and Pythagoras", DER, "tan(x)",
  ["tan(x) = sin(x)/cos(x)", "f'(x) = (cos(x)cos(x) + sin(x)sin(x))/cos(x)^2", "= 1/cos(x)^2", "= sec(x)^2"],
  ["claim: tan(x) = sin(x)/cos(x)", "claim: (cos(x)^2 + sin(x)^2)/cos(x)^2 = 1/cos(x)^2", None, "final: sec(x)^2"],
  "valid-equivalence", "quotient rule + sin^2+cos^2=1", "sec(x)^2", complexity=3)
d("quotient rule with logarithm", DER, "ln(x)/x", ["f'(x) = ((1/x)·x - ln(x)·1)/x^2", "= (1 - ln(x))/x^2"],
  [None, "final: (1 - ln(x))/x^2"], "valid-equivalence", "quotient rule", "(1 - ln(x))/x^2", pair="cal-qr2")
d("denominator must be squared in the quotient rule", DER, "ln(x)/x", ["f'(x) = ((1/x)·x - ln(x))/x^2", "= (1 - ln(x))/x"],
  ["claim: ((1/x) x - ln(x))/x^2 = (1 - ln(x))/x^2", "final: (1 - ln(x))/x"], "invalid",
  "the last line drops a factor x from the denominator; at x=2: (1-ln2)/4 vs (1-ln2)/2", "(1 - ln(x))/x^2", pair="cal-qr2")
d("quotient rule, cancelling terms", DER, "x^2/(x^2+1)", ["f'(x) = (2x(x^2+1) - x^2·2x)/(x^2+1)^2", "= 2x/(x^2+1)^2"],
  ["claim: (2x(x^2+1) - 2x^3)/(x^2+1)^2 = 2x/(x^2+1)^2", "final: 2x/(x^2+1)^2"], "valid-equivalence",
  "2x^3+2x-2x^3 = 2x", "2x/(x^2+1)^2", pair="cal-qr3")
d("derivative of a quotient is not the quotient of derivatives", DER, "x^2/(x^2+1)", ["f'(x) = 2x/(2x)", "= 1"],
  [None, "final: 1"], "invalid", "true derivative 2x/(x^2+1)^2 is 0 at x=0, not 1", "2x/(x^2+1)^2", pair="cal-qr3")

# ============================================================ chain rule
d("chain rule with linear inner function", DER, "(3x+1)^5", ["f'(x) = 5(3x+1)^4 · 3", "= 15(3x+1)^4"], [None, "final: 15(3x+1)^4"],
  "valid-equivalence", "outer 5u^4, inner derivative 3", "15(3x+1)^4", difficulty="easy", pair="cal-ch1")
d("chain rule: inner derivative omitted", DER, "(3x+1)^5", ["f'(x) = 5(3x+1)^4"], ["final: 5(3x+1)^4"], "invalid",
  "missing factor 3", "15(3x+1)^4", difficulty="easy", pair="cal-ch1")
d("chain rule sin of a square", DER, "sin(x^2)", ["f'(x) = cos(x^2)·2x"], ["final: 2x cos(x^2)"], "valid-equivalence",
  "outer cos, inner 2x", "2x cos(x^2)", pair="cal-ch2")
d("chain rule: differentiating the inner function inside the outer", DER, "sin(x^2)", ["f'(x) = cos(2x)"], ["final: cos(2x)"],
  "invalid", "cos(2x) is not 2x cos(x^2): at x=0 values 1 vs 0", "2x cos(x^2)", pair="cal-ch2")
d("chain rule on a power of sine", DER, "sin(x)^2", ["f'(x) = 2sin(x)cos(x)"], ["final: 2sin(x)cos(x)"], "valid-equivalence",
  "2 sin x * cos x", "2sin(x)cos(x)", difficulty="easy")
d("chain rule with square root", DER, "sqrt(1+x^2)", ["f'(x) = (1/(2sqrt(1+x^2)))·2x", "= x/sqrt(1+x^2)"],
  [None, "final: x/sqrt(1+x^2)"], "valid-equivalence", "chain rule", "x/sqrt(1+x^2)")
d("chain rule with exponential", DER, "e^(x^2)", ["f'(x) = e^(x^2)·2x"], ["final: 2x e^(x^2)"], "valid-equivalence",
  "(e^u)' = e^u u'", "2x e^(x^2)", pair="cal-ch3")
d("power rule misapplied to an exponential", DER, "e^(x^2)", ["f'(x) = x^2 e^(x^2 - 1)"], ["final: x^2 e^(x^2 - 1)"], "invalid",
  "exponent is variable; power rule does not apply; at x=0 true value 0, stated 0 too but at x=1: 2e vs 1", "2x e^(x^2)", pair="cal-ch3")
d("three-level chain: power of cosine of linear", DER, "cos(2x)^3",
  ["f'(x) = 3cos(2x)^2 · (-sin(2x)) · 2", "= -6cos(2x)^2 sin(2x)"], [None, "final: -6cos(2x)^2 sin(2x)"], "valid-equivalence",
  "three nested layers each contribute a factor", "-6cos(2x)^2 sin(2x)", complexity=3, pair="cal-ch4")
d("three-level chain: innermost factor dropped", DER, "cos(2x)^3", ["f'(x) = -3cos(2x)^2 sin(2x)"], ["final: -3cos(2x)^2 sin(2x)"],
  "invalid", "factor 2 from d/dx(2x) missing", "-6cos(2x)^2 sin(2x)", complexity=3, pair="cal-ch4")
d("log of cosine", DER, "ln(cos(x))", ["f'(x) = (1/cos(x))·(-sin(x))", "= -tan(x)"], [None, "final: -tan(x)"], "valid-equivalence",
  "chain rule", "-tan(x)")
d("exponential of sine of linear", DER, "e^(sin(3x))", ["f'(x) = e^(sin(3x)) · cos(3x) · 3"], ["final: 3cos(3x) e^(sin(3x))"],
  "valid-equivalence", "chain rule twice", "3cos(3x) e^(sin(3x))", complexity=3)
d("four-layer chain rule", DER, "sin(cos(x^2))", ["f'(x) = cos(cos(x^2)) · (-sin(x^2)) · 2x", "= -2x sin(x^2) cos(cos(x^2))"],
  [None, "final: -2x sin(x^2) cos(cos(x^2))"], "valid-equivalence", "each layer contributes its derivative",
  "-2x sin(x^2) cos(cos(x^2))", difficulty="hard", complexity=4, pair="cal-ch5")
d("four-layer chain rule: middle layer dropped", DER, "sin(cos(x^2))", ["f'(x) = cos(cos(x^2)) · 2x"],
  ["final: 2x cos(cos(x^2))"], "invalid", "missing -sin(x^2) factor; at x=1 the values differ", "-2x sin(x^2) cos(cos(x^2))",
  difficulty="hard", complexity=4, pair="cal-ch5")

# ============================================================ log / exp
d("log of a quadratic", DER, "ln(x^2+1)", ["f'(x) = 2x/(x^2+1)"], ["final: 2x/(x^2+1)"], "valid-equivalence", "chain rule",
  "2x/(x^2+1)", difficulty="easy")
d("ln(kx) has derivative 1/x", DER, "ln(3x)", ["f'(x) = (1/(3x))·3", "= 1/x"], [None, "final: 1/x"], "valid-equivalence",
  "chain factor 3 cancels", "1/x", difficulty="easy", pair="cal-lg1")
d("ln(kx): chain factor forgotten", DER, "ln(3x)", ["f'(x) = 1/(3x)"], ["final: 1/(3x)"], "invalid", "missing chain factor 3",
  "1/x", difficulty="easy", pair="cal-lg1")
d("forged log law with a coincidentally correct derivative", FORGE, "ln(5x)", ["ln(5x) = 5 + ln(x)", "f'(x) = 1/x"],
  ["claim: ln(5x) = 5 + ln(x)", "final: 1/x"], "invalid", "ln(5x) = ln 5 + ln x, not 5 + ln x (x=1: ln5 vs 5); constant error hides in the derivative",
  "1/x", pair="cal-lg1")
d("exponential with base 2", DER, "2^x", ["f'(x) = 2^x ln(2)"], ["final: 2^x ln(2)"], "valid-equivalence", "a^x ln a",
  "2^x ln(2)", difficulty="easy", pair="cal-ex1")
d("power rule misapplied to a^x", DER, "2^x", ["f'(x) = x·2^(x-1)"], ["final: x 2^(x-1)"], "invalid",
  "at x=0 true ln2, stated 0", "2^x ln(2)", difficulty="easy", pair="cal-ex1")
d("exponential base derivative with the power rule cited", REASON, "3^x", ["by the power rule, f'(x) = 3^x ln(3)"],
  ["final: 3^x ln(3)"], "wrong-reason", "result right but the power rule concerns x^n, not a^x", "3^x ln(3)", pair="cal-ex1")
d("log base 2", DER, "log2(x)", ["log2(x) = ln(x)/ln(2)", "f'(x) = 1/(x ln(2))"], ["claim: log2(x) = ln(x)/ln(2)", "final: 1/(x ln(2))"],
  "valid-equivalence", "change of base", "1/(x ln(2))")
d("logarithmic differentiation of x^x", DER, "x^x",
  ["ln y = x ln(x)", "y'/y = ln(x) + 1", "y' = x^x (ln(x) + 1)"], [None, "claim: d/dx(x ln(x)) = ln(x) + 1", "final: x^x (ln(x) + 1)"],
  "valid-equivalence", "differentiate ln y implicitly (x > 0)", "x^x (ln(x) + 1)", complexity=3, pair="cal-xx")
d("power rule misapplied to x^x", DER, "x^x", ["by the power rule f'(x) = x·x^(x-1)", "= x^x"], [None, "final: x^x"], "invalid",
  "exponent varies; at x=1 true derivative 1·(0+1)=1 equals, but at x=e true 2e^e vs e^e", "x^x (ln(x) + 1)", complexity=2, pair="cal-xx")
d("log of log", DER, "ln(ln(x))", ["f'(x) = (1/ln(x))·(1/x)"], ["final: 1/(x ln(x))"], "valid-equivalence", "chain rule (x > 1)",
  "1/(x ln(x))")
d("e^(2x) differentiated, chain rule cited", REASON, "e^(2x)", ["by the chain rule with inner 2x, f'(x) = e^(2x)·2"],
  ["final: 2e^(2x)"], "valid-equivalence", "correct rule and result", "2e^(2x)", difficulty="easy", pair="cal-wr1")
d("e^(2x) differentiated, power rule cited", REASON, "e^(2x)", ["by the power rule, f'(x) = 2e^(2x)"], ["final: 2e^(2x)"],
  "wrong-reason", "the result needs the chain rule for e^u; the power rule concerns x^n", "2e^(2x)", difficulty="easy", pair="cal-wr1")
d("derivative of ln|x|", DER, "ln|x|", ["f'(x) = 1/x for x != 0"], ["final: 1/x"], "valid-equivalence",
  "for x<0, ln(-x) has derivative 1/x as well", "1/x", pair="cal-abslog")
d("derivative of ln|x| is not 1/|x|", DER, "ln|x|", ["f'(x) = 1/|x|"], ["final: 1/|x|"], "invalid",
  "at x=-1 true derivative -1, stated 1", "1/x", pair="cal-abslog")
d("ln(x^2) via 2ln|x|", DER, "ln(x^2)", ["ln(x^2) = 2ln|x|", "f'(x) = 2/x"], ["claim: ln(x^2) = 2ln|x|", "final: 2/x"],
  "valid-equivalence", "identity valid for all x != 0", "2/x", pair="cal-lx2")
d("ln(x^2) via the law 2ln x that fails for x<0", REASON, "ln(x^2)", ["ln(x^2) = 2ln(x)", "f'(x) = 2/x"], [None, "final: 2/x"],
  "wrong-reason", "2/x is right on x != 0, but ln(x^2)=2ln x only holds for x>0 so the justification does not cover x<0", "2/x",
  pair="cal-lx2")

# ============================================================ trig / inverse trig
d("tan with chain rule", DER, "tan(3x)", ["f'(x) = 3sec(3x)^2"], ["final: 3sec(3x)^2"], "valid-equivalence", "(tan u)' = sec^2 u u'",
  "3sec(3x)^2", difficulty="easy")
d("derivative of sec", DER, "sec(x)", ["f'(x) = sec(x)tan(x)"], ["final: sec(x)tan(x)"], "valid-equivalence", "standard", "sec(x)tan(x)",
  difficulty="easy")
d("derivative of csc", DER, "csc(x)", ["f'(x) = -csc(x)cot(x)"], ["final: -csc(x)cot(x)"], "valid-equivalence", "standard",
  "-csc(x)cot(x)", difficulty="easy", pair="cal-trig1")
d("derivative of csc sign error", DER, "csc(x)", ["f'(x) = csc(x)cot(x)"], ["final: csc(x)cot(x)"], "invalid",
  "(1/sin)' = -cos/sin^2; at x=pi/4 sign differs", "-csc(x)cot(x)", difficulty="easy", pair="cal-trig1")
d("derivative of arcsin", DER, "asin(x)", ["f'(x) = 1/sqrt(1-x^2)"], ["final: 1/sqrt(1-x^2)"], "valid-equivalence", "standard (|x|<1)",
  "1/sqrt(1-x^2)", difficulty="easy")
d("arctan with chain rule", DER, "atan(2x)", ["f'(x) = 2/(1+(2x)^2)", "= 2/(1+4x^2)"], [None, "final: 2/(1+4x^2)"],
  "valid-equivalence", "1/(1+u^2) u'", "2/(1+4x^2)", pair="cal-it1")
d("arctan: inner function not squared", DER, "atan(2x)", ["f'(x) = 2/(1+2x^2)"], ["final: 2/(1+2x^2)"], "invalid",
  "must be (2x)^2 = 4x^2; at x=1: 2/5 vs 2/3", "2/(1+4x^2)", pair="cal-it1")
d("arccos of a square", DER, "acos(x^2)", ["f'(x) = -2x/sqrt(1-x^4)"], ["final: -2x/sqrt(1-x^4)"], "valid-equivalence",
  "-(1/sqrt(1-u^2)) u'", "-2x/sqrt(1-x^4)")
d("arcsin + arccos is constant", DER, "asin(x) + acos(x)", ["f'(x) = 1/sqrt(1-x^2) - 1/sqrt(1-x^2)", "= 0"], [None, "final: 0"],
  "valid-equivalence", "asin x + acos x = pi/2 on [-1,1]", "0")
d("product with arcsin", DER, "x asin(x)", ["f'(x) = asin(x) + x/sqrt(1-x^2)"], ["final: asin(x) + x/sqrt(1-x^2)"],
  "valid-equivalence", "product rule", "asin(x) + x/sqrt(1-x^2)")
d("arctan of reciprocal by the chain rule", DER, "atan(1/x)", ["f'(x) = (1/(1+1/x^2))·(-1/x^2)", "= -1/(x^2+1)"],
  [None, "final: -1/(x^2+1)"], "valid-equivalence", "valid for all x != 0", "-1/(x^2+1)", pair="cal-it2")
d("arctan of reciprocal via an identity false for x<0", FORGE, "atan(1/x)", ["atan(1/x) = pi/2 - atan(x)", "f'(x) = -1/(1+x^2)"],
  ["claim: atan(1/x) = pi/2 - atan(x)", "final: -1/(1+x^2)"], "invalid",
  "for x<0, atan(1/x) = -pi/2 - atan(x); the stated identity fails (x=-1: -pi/4 vs 3pi/4) though the derivative is right",
  "-1/(1+x^2)", pair="cal-it2")

# ============================================================ implicit forms (written explicitly)
d("implicit differentiation of a circle, upper branch", DER, "sqrt(25-x^2)",
  ["x^2 + y^2 = 25", "2x + 2y y' = 0", "y' = -x/y", "y' = -x/sqrt(25-x^2)"], [None, None, None, "final: -x/sqrt(25-x^2)"],
  "valid-equivalence", "y = sqrt(25-x^2) on the upper branch", "-x/sqrt(25-x^2)", complexity=3, pair="cal-imp1")
d("implicit differentiation: sign lost", DER, "sqrt(25-x^2)", ["2x + 2y y' = 0", "y' = x/y = x/sqrt(25-x^2)"],
  [None, "final: x/sqrt(25-x^2)"], "invalid", "y' = -x/y; sign error", "-x/sqrt(25-x^2)", complexity=3, pair="cal-imp1")
d("implicit differentiation: wrong branch substituted", DER, "-sqrt(25-x^2)",
  ["x^2 + y^2 = 25", "y' = -x/y", "y' = -x/sqrt(25-x^2)"], [None, None, "final: -x/sqrt(25-x^2)"], "invalid",
  "on the lower branch y = -sqrt(25-x^2), so y' = x/sqrt(25-x^2)", "x/sqrt(25-x^2)", difficulty="hard", complexity=3, pair="cal-imp1")
d("implicit: e^y = x", DER, "ln(x)", ["e^y = x", "e^y y' = 1", "y' = 1/e^y = 1/x"], [None, None, "final: 1/x"], "valid-equivalence",
  "inverse function derivative", "1/x")
d("implicit: sin y = x on the principal branch", DER, "asin(x)",
  ["sin(y) = x", "cos(y) y' = 1", "cos(y) = sqrt(1-x^2) since -pi/2 <= y <= pi/2", "y' = 1/sqrt(1-x^2)"],
  [None, None, None, "final: 1/sqrt(1-x^2)"], "valid-equivalence", "cos y >= 0 on the principal range", "1/sqrt(1-x^2)", complexity=3,
  pair="cal-imp2")
d("implicit: wrong sign of cos y on principal branch", DER, "asin(x)",
  ["sin(y) = x", "cos(y) y' = 1", "cos(y) = -sqrt(1-x^2)", "y' = -1/sqrt(1-x^2)"], [None, None, None, "final: -1/sqrt(1-x^2)"],
  "invalid", "asin is increasing; cos y >= 0 on [-pi/2, pi/2]", "1/sqrt(1-x^2)", complexity=3, pair="cal-imp2")
d("implicit: xy = 1", DER, "1/x", ["xy = 1", "y + x y' = 0", "y' = -y/x = -1/x^2"], [None, None, "final: -1/x^2"], "valid-equivalence",
  "product rule on xy", "-1/x^2")

# ============================================================ |x| and differentiability
d("derivative of |x| away from 0", DER, "|x|", ["f'(x) = x/|x| for x != 0; not differentiable at 0"], ["final: x/|x|"],
  "valid-equivalence", "|x| has slope ±1; corner at 0", "x/|x| (x != 0)", pair="cal-abs1")
d("|x| treated as x", DER, "|x|", ["f'(x) = 1"], ["final: 1"], "invalid", "for x<0 the derivative is -1", "x/|x| (x != 0)", pair="cal-abs1")
d("derivative of |2x| without a case condition", "case condition for |u|", "|2x|", ["f'(x) = 2"], ["final: 2"],
  "insufficient-information", "2 only for x>0 (-2 for x<0, none at 0); the needed condition x>0 is not stated", "2x/|x|",
  pair="cal-abs2")
d("derivative of |2x| with sign function", DER, "|2x|", ["f'(x) = 2x/|x| for x != 0"], ["final: 2x/|x|"],
  "valid-equivalence", "2 sign(x)", "2x/|x|", pair="cal-abs2")
d("x|x| is differentiable with derivative 2|x|", DER, "x|x|", ["f(x) = x^2 for x >= 0, -x^2 for x < 0", "f'(x) = 2|x|"],
  [None, "final: 2|x|"], "valid-equivalence", "2x on x>0, -2x on x<0, and 0 at 0 by the difference quotient", "2|x|",
  difficulty="hard", complexity=3, pair="cal-abs3")
d("x|x| treated as x^2", DER, "x|x|", ["x|x| = x^2", "f'(x) = 2x"], ["claim: x|x| = x^2", "final: 2x"], "invalid",
  "x|x| = -x^2 for x<0", "2|x|", complexity=2, pair="cal-abs3")
d("sqrt(x^2) is |x|, not x", DER, "sqrt(x^2)", ["sqrt(x^2) = x", "f'(x) = 1"], ["claim: sqrt(x^2) = x", "final: 1"], "invalid",
  "sqrt(x^2)=|x|; at x=-1 derivative -1", "x/|x|", pair="cal-abs4")
d("sqrt(x^2) = |x|", DER, "sqrt(x^2)", ["sqrt(x^2) = |x|", "f'(x) = x/|x| for x != 0"], ["claim: sqrt(x^2) = |x|", "final: x/|x|"],
  "valid-equivalence", "standard", "x/|x|", pair="cal-abs4")
d("derivative of cube root stated for all x", "differentiability at a vertical tangent", "cbrt(x)",
  ["f'(x) = 1/(3cbrt(x^2)) for every real x"], [None], "insufficient-information",
  "formula valid only for x != 0; cbrt has a vertical tangent at 0 (difference quotient unbounded); the claim 'every x' needs x != 0",
  "1/(3cbrt(x^2)) for x != 0")
st("continuity does not imply differentiability", "differentiability at a corner", "f(x)=|x| is differentiable at 0",
   ["|x| is continuous at 0", "so |x| is differentiable at 0"], "invalid",
   "left and right difference quotients at 0 are -1 and 1; continuity does not give differentiability", "not differentiable at 0",
   pair="cal-dif1")
st("difference quotient at 0 for x|x|", "differentiability at a corner", "f(x)=x|x| is differentiable at 0",
   ["(f(h)-f(0))/h = |h|", "|h| -> 0 as h -> 0", "so f'(0) = 0"], "valid", "the difference quotient |h| tends to 0", "f'(0)=0",
   pair="cal-dif1")
st("vertical tangent means no derivative", "differentiability at a cusp/vertical tangent", "f(x)=cbrt(x) is not differentiable at 0",
   ["(f(h)-f(0))/h = h^(-2/3)", "this is unbounded as h -> 0", "so f'(0) does not exist"], "valid", "h^(-2/3) -> oo",
   "not differentiable at 0")

# ============================================================ indefinite integrals: power, +C, ln|x|
ii("power rule for integrals with +C", ANTI, "x^3 + 2x", ["∫(x^3 + 2x) dx = x^4/4 + x^2 + C"], ["final: x^4/4 + x^2 + C"],
   "valid-equivalence", "derivative of answer is x^3+2x", "x^4/4 + x^2 + C", difficulty="easy", pair="cal-c1")
ii("missing constant of integration", PC, "x^3 + 2x", ["∫(x^3 + 2x) dx = x^4/4 + x^2"], ["final: x^4/4 + x^2"], "domain-violation",
   "one antiderivative given, the family needs + C", "x^4/4 + x^2 + C", difficulty="easy", pair="cal-c1")
ii("particular constant in place of +C", PC, "x^2", ["∫x^2 dx = x^3/3 + 5"], ["final: x^3/3 + 5"], "domain-violation",
   "a single antiderivative, not the general one", "x^3/3 + C", difficulty="easy", pair="cal-c1")
ii("negative power integral", ANTI, "1/x^2", ["∫x^(-2) dx = x^(-1)/(-1) + C", "= -1/x + C"], [None, "final: -1/x + C"],
   "valid-equivalence", "d/dx(-1/x) = 1/x^2", "-1/x + C", difficulty="easy", pair="cal-np")
ii("integrating 1/x^2 as a logarithm", ANTI, "1/x^2", ["∫1/x^2 dx = ln(x^2) + C"], ["final: ln(x^2) + C"], "invalid",
   "d/dx ln(x^2) = 2/x", "-1/x + C", difficulty="easy", pair="cal-np")
ii("integral of 1/x is ln|x|", DOMA, "1/x", ["∫1/x dx = ln|x| + C"], ["final: ln|x| + C"], "valid-equivalence",
   "valid on both intervals of the domain", "ln|x| + C", difficulty="easy", pair="cal-ln1")
ii("ln x covers only x>0", DOMA, "1/x", ["∫1/x dx = ln(x) + C"], ["final: ln(x) + C"], "domain-violation",
   "1/x is defined for x<0 where ln x is undefined", "ln|x| + C", difficulty="easy", pair="cal-ln1")
ii("integrating 1/x by the power rule is wrong reasoning", REASON, "1/x", ["by the power rule with n = -1, ∫1/x dx = ln|x| + C"],
   ["final: ln|x| + C"], "wrong-reason", "the power rule excludes n=-1 (it would divide by 0); the result comes from d/dx ln|x| = 1/x",
   "ln|x| + C", pair="cal-ln1")
ii("integrating instead of differentiating confused", ANTI, "1/x", ["∫1/x dx = -1/x^2 + C"], ["final: -1/x^2 + C"], "invalid",
   "-1/x^2 is the derivative of 1/x", "ln|x| + C", difficulty="easy", pair="cal-ln1")
ii("fractional power", ANTI, "sqrt(x)", ["∫x^(1/2) dx = x^(3/2)/(3/2) + C", "= (2/3)x^(3/2) + C"], [None, "final: (2/3)x^(3/2) + C"],
   "valid-equivalence", "power rule n=1/2", "(2/3)x^(3/2) + C", difficulty="easy")
ii("exponential with linear exponent", ANTI, "e^(3x)", ["∫e^(3x) dx = e^(3x)/3 + C"], ["final: e^(3x)/3 + C"], "valid-equivalence",
   "reverse chain rule", "e^(3x)/3 + C", difficulty="easy", pair="cal-e3")
ii("multiplying instead of dividing by the inner coefficient", ANTI, "e^(3x)", ["∫e^(3x) dx = 3e^(3x) + C"], ["final: 3e^(3x) + C"],
   "invalid", "derivative of 3e^(3x) is 9e^(3x)", "e^(3x)/3 + C", difficulty="easy", pair="cal-e3")
ii("exponential integral attributed to the power rule", REASON, "e^(3x)", ["by the power rule, ∫e^(3x) dx = e^(3x)/3 + C"],
   ["final: e^(3x)/3 + C"], "wrong-reason", "the result follows from reversing the chain rule for e^u, not the power rule",
   "e^(3x)/3 + C", pair="cal-e3")
ii("cosine with linear argument", ANTI, "cos(2x)", ["∫cos(2x) dx = sin(2x)/2 + C"], ["final: sin(2x)/2 + C"], "valid-equivalence",
   "d/dx sin(2x)/2 = cos 2x", "sin(2x)/2 + C", difficulty="easy", pair="cal-cs")
ii("sign when integrating cosine", ANTI, "cos(2x)", ["∫cos(2x) dx = -sin(2x)/2 + C"], ["final: -sin(2x)/2 + C"], "invalid",
   "derivative gives -cos 2x", "sin(2x)/2 + C", difficulty="easy", pair="cal-cs")
ii("sec^2 integrates to tan", ANTI, "sec(x)^2", ["∫sec^2 x dx = tan(x) + C"], ["final: tan(x) + C"], "valid-equivalence",
   "standard", "tan(x) + C", difficulty="easy")
ii("arctan antiderivative", ANTI, "1/(1+x^2)", ["∫1/(1+x^2) dx = atan(x) + C"], ["final: atan(x) + C"], "valid-equivalence",
   "standard", "atan(x) + C", difficulty="easy")
ii("arcsin antiderivative", ANTI, "1/sqrt(1-x^2)", ["∫1/sqrt(1-x^2) dx = asin(x) + C"], ["final: asin(x) + C"], "valid-equivalence",
   "standard", "asin(x) + C", difficulty="easy")
ii("a^x antiderivative", ANTI, "2^x", ["∫2^x dx = 2^x/ln(2) + C"], ["final: 2^x/ln(2) + C"], "valid-equivalence",
   "d/dx 2^x/ln2 = 2^x", "2^x/ln(2) + C", difficulty="easy")
ii("ln|x+1| antiderivative", DOMA, "1/(x+1)", ["∫1/(x+1) dx = ln|x+1| + C"], ["final: (1/2)ln((x+1)^2) + C"], "valid-equivalence",
   "valid on x<-1 and x>-1", "ln|x+1| + C", pair="cal-ln2")
ii("ln(x+1) covers only x>-1", DOMA, "1/(x+1)", ["∫1/(x+1) dx = ln(x+1) + C"], ["final: ln(x+1) + C"], "domain-violation",
   "undefined for x<-1 where the integrand exists", "ln|x+1| + C", pair="cal-ln2")
ii("antiderivative of tan as ln|sec|", DOMA, "tan(x)", ["∫tan(x) dx = -ln|cos(x)| + C", "= ln|sec(x)| + C"],
   [None, "final: ln|sec(x)| + C"], "valid-equivalence", "d/dx(-ln|cos x|) = tan x wherever cos x != 0", "ln|sec(x)| + C", pair="cal-tn")
ii("antiderivative of tan without absolute value", DOMA, "tan(x)", ["∫tan(x) dx = -ln(cos(x)) + C"], ["final: -ln(cos(x)) + C"],
   "domain-violation", "fails where cos x < 0 (e.g. x = pi)", "-ln|cos(x)| + C", pair="cal-tn")
ii("antiderivative of cot", DOMA, "cot(x)", ["∫cot(x) dx = ln|sin(x)| + C"], ["final: (1/2)ln(sin(x)^2) + C"], "valid-equivalence",
   "d/dx ln|sin x| = cot x", "ln|sin(x)| + C")

# ============================================================ substitution
ii("u-substitution with constant factor", ANTI, "x(x^2+1)^3",
   ["let u = x^2+1, du = 2x dx", "∫x(x^2+1)^3 dx = (1/2)∫u^3 du", "= u^4/8 + C", "= (x^2+1)^4/8 + C"],
   [None, None, None, "final: (x^2+1)^4/8 + C"], "valid-equivalence", "derivative of answer: 4(x^2+1)^3 2x/8", "(x^2+1)^4/8 + C",
   complexity=3, pair="cal-sb1")
ii("u-substitution: factor 1/2 forgotten", ANTI, "x(x^2+1)^3",
   ["let u = x^2+1, du = 2x dx", "∫x(x^2+1)^3 dx = ∫u^3 du", "= (x^2+1)^4/4 + C"], [None, None, "final: (x^2+1)^4/4 + C"], "invalid",
   "x dx = du/2; answer is twice too large", "(x^2+1)^4/8 + C", complexity=3, pair="cal-sb1")
ii("u-substitution set up but never finished", FIN, "x(x^2+1)^3", ["let u = x^2+1, du = 2x dx", "∫x(x^2+1)^3 dx = (1/2)∫u^3 du"],
   [None, None], "incomplete", "nothing false; no antiderivative reached", "(x^2+1)^4/8 + C", pair="cal-sb1")
ii("reverse chain rule with cos of square", ANTI, "2x cos(x^2)", ["let u = x^2", "∫cos(u) du = sin(u) + C", "= sin(x^2) + C"],
   [None, None, "final: sin(x^2) + C"], "valid-equivalence", "d/dx sin(x^2) = 2x cos x^2", "sin(x^2) + C", difficulty="easy")
ii("substitution for x e^(x^2)", ANTI, "x e^(x^2)", ["let u = x^2, du = 2x dx", "= (1/2)∫e^u du = e^(x^2)/2 + C"],
   [None, "final: e^(x^2)/2 + C"], "valid-equivalence", "derivative check", "e^(x^2)/2 + C", pair="cal-sb2")
ii("forged antiderivative of e^(x^2) giving the right final", FORGE, "x e^(x^2)",
   ["an antiderivative of e^(x^2) is e^(x^2)/(2x)", "so ∫x e^(x^2) dx = x · e^(x^2)/(2x) + C", "= e^(x^2)/2 + C"],
   ["claim: d/dx(e^(x^2)/(2x)) = e^(x^2)", None, "final: e^(x^2)/2 + C"], "invalid",
   "e^(x^2)/(2x) has derivative e^(x^2) - e^(x^2)/(2x^2); also x cannot be pulled out of the integral", "e^(x^2)/2 + C",
   difficulty="hard", complexity=3, pair="cal-sb2")
ii("substitution u = ln x", ANTI, "ln(x)/x", ["let u = ln(x), du = dx/x", "∫u du = u^2/2 + C", "= ln(x)^2/2 + C"],
   [None, None, "final: ln(x)^2/2 + C"], "valid-equivalence", "domain x>0 throughout", "ln(x)^2/2 + C")
ii("sin x cos x via u = sin x", ANTI, "sin(x)cos(x)", ["let u = sin(x)", "= sin(x)^2/2 + C"], [None, "final: sin(x)^2/2 + C"],
   "valid-equivalence", "d/dx sin^2/2 = sin cos", "sin(x)^2/2 + C", pair="cal-sc")
ii("sin x cos x via u = cos x (differs by a constant)", ANTI, "sin(x)cos(x)", ["let u = cos(x), du = -sin(x) dx", "= -cos(x)^2/2 + C"],
   [None, "final: -cos(x)^2/2 + C"], "valid-equivalence", "-cos^2/2 = sin^2/2 - 1/2; both families coincide", "-cos(x)^2/2 + C",
   pair="cal-sc")
ii("averaging two antiderivatives incorrectly", ANTI, "sin(x)cos(x)", ["= sin(x)^2/2 - cos(x)^2/2 + C"],
   ["final: sin(x)^2/2 - cos(x)^2/2 + C"], "invalid", "derivative is 2 sin x cos x, twice the integrand", "sin(x)^2/2 + C", pair="cal-sc")
ii("substitution under a root", ANTI, "x/sqrt(x^2+4)", ["let u = x^2+4", "= (1/2)∫u^(-1/2) du = sqrt(u) + C", "= sqrt(x^2+4) + C"],
   [None, None, "final: sqrt(x^2+4) + C"], "valid-equivalence", "derivative x/sqrt(x^2+4)", "sqrt(x^2+4) + C")
ii("1/(x ln x) gives ln|ln x|", DOMA, "1/(x ln(x))", ["let u = ln(x)", "∫du/u = ln|u| + C", "= ln|ln(x)| + C"],
   [None, None, "final: (1/2)ln(ln(x)^2) + C"], "valid-equivalence", "covers 0<x<1 (ln x<0) and x>1", "ln|ln(x)| + C", pair="cal-lnln")
ii("ln(ln x) only covers x>1", DOMA, "1/(x ln(x))", ["let u = ln(x)", "= ln(ln(x)) + C"], [None, "final: ln(ln(x)) + C"],
   "domain-violation", "integrand is defined on 0<x<1 where ln(ln x) is not", "ln|ln(x)| + C", difficulty="hard", pair="cal-lnln")
ii("tan x sec^2 x", ANTI, "tan(x)sec(x)^2", ["let u = tan(x), du = sec^2 x dx", "= tan(x)^2/2 + C"], [None, "final: tan(x)^2/2 + C"],
   "valid-equivalence", "derivative check", "tan(x)^2/2 + C")
ii("log of a positive quadratic needs no absolute value", DOMA, "2x/(x^2+1)", ["∫2x/(x^2+1) dx = ln(x^2+1) + C"],
   ["final: ln(x^2+1) + C"], "valid-equivalence", "x^2+1>0 everywhere", "ln(x^2+1) + C", pair="cal-ab")
ii("log of a sign-changing quadratic needs an absolute value", DOMA, "2x/(x^2-1)", ["∫2x/(x^2-1) dx = ln(x^2-1) + C"],
   ["final: ln(x^2-1) + C"], "domain-violation", "integrand exists on -1<x<1 where x^2-1<0", "ln|x^2-1| + C", pair="cal-ab")
ii("ln|x^2-1| covers the full domain", DOMA, "2x/(x^2-1)", ["∫2x/(x^2-1) dx = ln|x^2-1| + C"], ["final: (1/2)ln((x^2-1)^2) + C"],
   "valid-equivalence", "valid on all three intervals", "ln|x^2-1| + C", pair="cal-ab")
ii("ln(1+e^x)", ANTI, "e^x/(1+e^x)", ["let u = 1+e^x", "= ln(1+e^x) + C"], [None, "final: ln(1+e^x) + C"], "valid-equivalence",
   "1+e^x>0", "ln(1+e^x) + C")
ii("e^(sin x) cos x", ANTI, "cos(x) e^(sin(x))", ["let u = sin(x)", "= e^(sin(x)) + C"], [None, "final: e^(sin(x)) + C"],
   "valid-equivalence", "reverse chain", "e^(sin(x)) + C")
ii("power of sine times cosine", ANTI, "sin(x)^3 cos(x)", ["let u = sin(x)", "= sin(x)^4/4 + C"], [None, "final: sin(x)^4/4 + C"],
   "valid-equivalence", "reverse chain", "sin(x)^4/4 + C")
ii("substitution with back-substitution of x", ANTI, "x sqrt(x+1)",
   ["let u = x+1, x = u-1", "∫(u-1)sqrt(u) du = (2/5)u^(5/2) - (2/3)u^(3/2) + C", "= (2/5)(x+1)^(5/2) - (2/3)(x+1)^(3/2) + C"],
   [None, None, "final: (2/5)(x+1)^(5/2) - (2/3)(x+1)^(3/2) + C"], "valid-equivalence", "derivative gives (x+1)^(3/2) - (x+1)^(1/2) = x sqrt(x+1)",
   "(2/5)(x+1)^(5/2) - (2/3)(x+1)^(3/2) + C", difficulty="hard", complexity=4, pair="cal-sb3")
ii("substitution: x not re-expressed in u", ANTI, "x sqrt(x+1)",
   ["let u = x+1", "∫x sqrt(u) du = (2/3)x u^(3/2) + C", "= (2/3)x(x+1)^(3/2) + C"], [None, None, "final: (2/3)x(x+1)^(3/2) + C"],
   "invalid", "x is not constant in u; derivative of answer is not x sqrt(x+1) (at x=0: 2/3 vs 0)",
   "(2/5)(x+1)^(5/2) - (2/3)(x+1)^(3/2) + C", difficulty="medium", complexity=3, pair="cal-sb3")

# ============================================================ integration by parts
ii("integration by parts x e^x", ANTI, "x e^x",
   ["u = x, dv = e^x dx, du = dx, v = e^x", "∫x e^x dx = x e^x - ∫e^x dx", "= x e^x - e^x + C"],
   [None, None, "final: x e^x - e^x + C"], "valid-equivalence", "derivative x e^x", "x e^x - e^x + C", complexity=3, pair="cal-ibp1")
ii("integration by parts sign error", ANTI, "x e^x", ["∫x e^x dx = x e^x + ∫e^x dx", "= x e^x + e^x + C"],
   [None, "final: x e^x + e^x + C"], "invalid", "uv - ∫v du has a minus; derivative of answer is x e^x + 2e^x", "x e^x - e^x + C",
   complexity=3, pair="cal-ibp1")
ii("integration by parts checked by differentiation", ANTI, "x e^x",
   ["∫x e^x dx = x e^x - e^x + C", "check: d/dx(x e^x - e^x) = x e^x"], ["final: x e^x - e^x + C", "claim: d/dx(x e^x - e^x) = x e^x"],
   "valid-equivalence", "check line is a true identity", "x e^x - e^x + C", complexity=2, pair="cal-ibp1")
ii("integration by parts x cos x", ANTI, "x cos(x)", ["u = x, v = sin(x)", "= x sin(x) - ∫sin(x) dx", "= x sin(x) + cos(x) + C"],
   [None, None, "final: x sin(x) + cos(x) + C"], "valid-equivalence", "derivative: sin + x cos - sin", "x sin(x) + cos(x) + C",
   complexity=3, pair="cal-ibp2")
ii("integration by parts: sign of ∫sin", ANTI, "x cos(x)", ["= x sin(x) - ∫sin(x) dx", "= x sin(x) - cos(x) + C"],
   [None, "final: x sin(x) - cos(x) + C"], "invalid", "∫sin = -cos, so - ∫sin = + cos", "x sin(x) + cos(x) + C", complexity=3,
   pair="cal-ibp2")
ii("forged v in integration by parts, sign patched at the end", FORGE, "x cos(x)",
   ["u = x, dv = cos(x) dx, v = -sin(x) since d/dx(-sin(x)) = cos(x)", "= -x sin(x) - cos(x)", "so ∫x cos(x) dx = x sin(x) + cos(x) + C"],
   ["claim: d/dx(-sin(x)) = cos(x)", None, "final: x sin(x) + cos(x) + C"], "invalid",
   "d/dx(-sin x) = -cos x; the middle work is false and the sign is flipped without reason", "x sin(x) + cos(x) + C",
   difficulty="hard", complexity=3, pair="cal-ibp2")
ii("integration by parts for ln x", ANTI, "ln(x)", ["u = ln(x), dv = dx", "= x ln(x) - ∫x·(1/x) dx", "= x ln(x) - x + C"],
   [None, None, "final: x ln(x) - x + C"], "valid-equivalence", "derivative ln x", "x ln(x) - x + C", complexity=3)
ii("repeated integration by parts", ANTI, "x^2 e^x",
   ["= x^2 e^x - ∫2x e^x dx", "= x^2 e^x - 2(x e^x - e^x)", "= (x^2 - 2x + 2)e^x + C"], [None, None, "final: (x^2 - 2x + 2)e^x + C"],
   "valid-equivalence", "derivative (2x-2)e^x + (x^2-2x+2)e^x = x^2 e^x", "(x^2 - 2x + 2)e^x + C", difficulty="hard", complexity=4,
   pair="cal-ibp3")
ii("repeated integration by parts stopped after one step", FIN, "x^2 e^x", ["u = x^2, dv = e^x dx", "= x^2 e^x - ∫2x e^x dx"],
   [None, None], "incomplete", "a remaining integral is left", "(x^2 - 2x + 2)e^x + C", complexity=3, pair="cal-ibp3")
ii("repeated integration by parts: second sign lost", ANTI, "x^2 e^x", ["= x^2 e^x - ∫2x e^x dx", "= x^2 e^x - 2x e^x - 2e^x + C"],
   [None, "final: x^2 e^x - 2x e^x - 2e^x + C"], "invalid", "-2(x e^x - e^x) = -2x e^x + 2e^x", "(x^2 - 2x + 2)e^x + C",
   difficulty="hard", complexity=4, pair="cal-ibp3")
ii("by parts x ln x", ANTI, "x ln(x)", ["u = ln(x), v = x^2/2", "= (x^2/2)ln(x) - ∫x/2 dx", "= (x^2/2)ln(x) - x^2/4 + C"],
   [None, None, "final: (x^2/2)ln(x) - x^2/4 + C"], "valid-equivalence", "derivative x ln x + x/2 - x/2", "(x^2/2)ln(x) - x^2/4 + C",
   complexity=3)
ii("cyclic integration by parts", ANTI, "e^x sin(x)",
   ["I = e^x sin(x) - ∫e^x cos(x) dx", "I = e^x sin(x) - e^x cos(x) - I", "I = e^x(sin(x) - cos(x))/2 + C"],
   [None, None, "final: e^x(sin(x) - cos(x))/2 + C"], "valid-equivalence", "derivative: e^x(sin - cos + cos + sin)/2 = e^x sin x",
   "e^x(sin(x) - cos(x))/2 + C", difficulty="hard", complexity=5, pair="cal-ibp4")
ii("cyclic integration by parts: solved for I with wrong factor", ANTI, "e^x sin(x)",
   ["I = e^x sin(x) - e^x cos(x) - I", "I = e^x(sin(x) - cos(x)) + C"], [None, "final: e^x(sin(x) - cos(x)) + C"], "invalid",
   "2I = ..., the factor 1/2 is lost", "e^x(sin(x) - cos(x))/2 + C", difficulty="hard", complexity=4, pair="cal-ibp4")
ii("by parts for arctan", ANTI, "atan(x)", ["u = atan(x), dv = dx", "= x atan(x) - ∫x/(1+x^2) dx", "= x atan(x) - (1/2)ln(1+x^2) + C"],
   [None, None, "final: x atan(x) - (1/2)ln(1+x^2) + C"], "valid-equivalence", "derivative atan x", "x atan(x) - (1/2)ln(1+x^2) + C",
   difficulty="hard", complexity=4)
ii("poor choice of parts leaves a harder integral", FIN, "x sin(x)", ["u = sin(x), dv = x dx", "= (x^2/2)sin(x) - ∫(x^2/2)cos(x) dx"],
   [None, None], "incomplete", "line is a true identity but the task is unfinished", "-x cos(x) + sin(x) + C", pair="cal-ibp5")
ii("good choice of parts for x sin x", ANTI, "x sin(x)", ["u = x, v = -cos(x)", "= -x cos(x) + ∫cos(x) dx", "= -x cos(x) + sin(x) + C"],
   [None, None, "final: -x cos(x) + sin(x) + C"], "valid-equivalence", "derivative x sin x", "-x cos(x) + sin(x) + C", complexity=3,
   pair="cal-ibp5")
ii("integration by parts cited for a substitution integral", REASON, "2x e^(x^2)",
   ["by integration by parts with u = 2x, ∫2x e^(x^2) dx = e^(x^2) + C"], ["final: e^(x^2) + C"], "wrong-reason",
   "parts with u=2x needs ∫e^(x^2), which has no elementary form; the result comes from substitution u=x^2", "e^(x^2) + C")

# ============================================================ partial fractions
ii("partial fractions 1/(x^2-1)", ANTI, "1/(x^2-1)",
   ["1/(x^2-1) = 1/(2(x-1)) - 1/(2(x+1))", "∫ = (1/2)ln|x-1| - (1/2)ln|x+1| + C"],
   ["claim: 1/(x^2-1) = 1/(2(x-1)) - 1/(2(x+1))", "final: (1/4)ln((x-1)^2) - (1/4)ln((x+1)^2) + C"], "valid-equivalence",
   "cover-up gives ±1/2", "(1/2)ln|x-1| - (1/2)ln|x+1| + C", complexity=3, pair="cal-pf1")
ii("partial fractions: coefficients not computed", ANTI, "1/(x^2-1)",
   ["1/(x^2-1) = 1/(x-1) - 1/(x+1)", "∫ = ln|x-1| - ln|x+1| + C"],
   ["claim: 1/(x^2-1) = 1/(x-1) - 1/(x+1)", "final: (1/2)ln((x-1)^2) - (1/2)ln((x+1)^2) + C"], "invalid",
   "1/(x-1) - 1/(x+1) = 2/(x^2-1)", "(1/2)ln|x-1| - (1/2)ln|x+1| + C", complexity=3, pair="cal-pf1")
ii("partial fractions: decomposition only", FIN, "1/(x^2-1)", ["1/(x^2-1) = 1/(2(x-1)) - 1/(2(x+1))"],
   ["claim: 1/(x^2-1) = 1/(2(x-1)) - 1/(2(x+1))"], "incomplete", "true decomposition, never integrated",
   "(1/2)ln|x-1| - (1/2)ln|x+1| + C", pair="cal-pf1")
ii("partial fractions with cover-up", ANTI, "(3x+5)/((x+1)(x+3))",
   ["(3x+5)/((x+1)(x+3)) = A/(x+1) + B/(x+3)", "x = -1: 2 = 2A, A = 1", "x = -3: -4 = -2B, B = 2", "∫ = ln|x+1| + 2ln|x+3| + C"],
   [None, None, None, "final: (1/2)ln((x+1)^2) + ln((x+3)^2) + C"], "valid-equivalence",
   "A=1, B=2: (x+3) + 2(x+1) = 3x+5", "ln|x+1| + 2ln|x+3| + C", difficulty="hard", complexity=4, pair="cal-pf2")
ii("partial fractions: sign error in a coefficient", ANTI, "(3x+5)/((x+1)(x+3))",
   ["x = -3: -4 = -2B, B = -2", "∫ = ln|x+1| - 2ln|x+3| + C"], [None, "final: (1/2)ln((x+1)^2) - ln((x+3)^2) + C"], "invalid",
   "-4 = -2B gives B = 2", "ln|x+1| + 2ln|x+3| + C", difficulty="hard", complexity=4, pair="cal-pf2")
ii("partial fractions 1/(x(x+1))", DOMA, "1/(x(x+1))", ["1/(x(x+1)) = 1/x - 1/(x+1)", "∫ = ln|x| - ln|x+1| + C"],
   ["claim: 1/(x(x+1)) = 1/x - 1/(x+1)", "final: (1/2)ln(x^2) - (1/2)ln((x+1)^2) + C"], "valid-equivalence",
   "valid on all three intervals", "ln|x| - ln|x+1| + C", complexity=3, pair="cal-pf3")
ii("partial fractions without absolute values", DOMA, "1/(x(x+1))", ["1/(x(x+1)) = 1/x - 1/(x+1)", "∫ = ln(x) - ln(x+1) + C"],
   ["claim: 1/(x(x+1)) = 1/x - 1/(x+1)", "final: ln(x) - ln(x+1) + C"], "domain-violation",
   "answer only defined for x>0; integrand also lives on x<-1 and -1<x<0", "ln|x| - ln|x+1| + C", complexity=3, pair="cal-pf3")
ii("cancel a common factor then integrate", ANTI, "(x+1)/(x^2+x)", ["(x+1)/(x^2+x) = 1/x for x != -1, 0", "∫ = ln|x| + C"],
   [None, "final: ln|x| + C"], "valid-equivalence", "integrand equals 1/x on its domain (x != 0, -1); ln|x| works on each interval",
   "ln|x| + C")
ii("improper rational: divide first", ANTI, "x^2/(x^2-1)",
   ["x^2/(x^2-1) = 1 + 1/(x^2-1)", "= 1 + 1/(2(x-1)) - 1/(2(x+1))", "∫ = x + (1/2)ln|x-1| - (1/2)ln|x+1| + C"],
   ["claim: x^2/(x^2-1) = 1 + 1/(x^2-1)", "claim: 1 + 1/(x^2-1) = 1 + 1/(2(x-1)) - 1/(2(x+1))",
    "final: x + (1/4)ln((x-1)^2) - (1/4)ln((x+1)^2) + C"], "valid-equivalence", "polynomial division then partial fractions",
   "x + (1/2)ln|(x-1)/(x+1)| + C", difficulty="hard", complexity=4, pair="cal-pf4")
ii("improper rational decomposed without division", ANTI, "x^2/(x^2-1)",
   ["x^2/(x^2-1) = A/(x-1) + B/(x+1)", "A = 1/2, B = -1/2", "∫ = (1/2)ln|x-1| - (1/2)ln|x+1| + C"],
   [None, "claim: x^2/(x^2-1) = 1/(2(x-1)) - 1/(2(x+1))", "final: (1/4)ln((x-1)^2) - (1/4)ln((x+1)^2) + C"], "invalid",
   "deg numerator = deg denominator; the polynomial part 1 is lost", "x + (1/2)ln|(x-1)/(x+1)| + C", difficulty="hard", complexity=4,
   pair="cal-pf4")
ii("repeated linear factor", ANTI, "1/(x-1)^2", ["∫(x-1)^(-2) dx = -(x-1)^(-1) + C", "= -1/(x-1) + C"], [None, "final: -1/(x-1) + C"],
   "valid-equivalence", "derivative 1/(x-1)^2", "-1/(x-1) + C")
ii("repeated factor integrated as a logarithm", ANTI, "1/(x-1)^2", ["∫1/(x-1)^2 dx = ln((x-1)^2) + C"], ["final: ln((x-1)^2) + C"],
   "invalid", "derivative 2/(x-1)", "-1/(x-1) + C")
ii("numerator is derivative of denominator", ANTI, "(2x+3)/(x^2+3x+2)", ["d/dx(x^2+3x+2) = 2x+3", "∫ = ln|x^2+3x+2| + C"],
   ["claim: d/dx(x^2+3x+2) = 2x+3", "final: (1/2)ln((x^2+3x+2)^2) + C"], "valid-equivalence", "f'/f integrates to ln|f|",
   "ln|x^2+3x+2| + C")

# ============================================================ definite integrals
di("FTC for a monomial", DEF, "x^2", "0", "1", ["= [x^3/3]_0^1", "= 1/3"], [None, "final: 1/3"], "valid-equivalence", "1/3 - 0",
   "1/3", difficulty="easy")
di("odd integrand over a symmetric interval", DEF, "x^3", "-1", "1", ["x^3 is odd, interval symmetric", "= 0"], [None, "final: 0"],
   "valid-equivalence", "∫ odd over [-a,a] = 0", "0", difficulty="easy", pair="cal-odd1")
di("x^3 + 1 is not odd", DEF, "x^3 + 1", "-1", "1", ["x^3 + 1 is odd", "= 0"], [None, "final: 0"], "invalid",
   "the constant contributes 2; value 2", "2", difficulty="easy", pair="cal-odd1")
di("odd part vanishes, even part remains", DEF, "x^3 + 1", "-1", "1", ["∫x^3 = 0 (odd)", "∫1 = 2", "= 2"], [None, None, "final: 2"],
   "valid-equivalence", "split into odd and even parts", "2", pair="cal-odd1")
di("odd power of sine over [-pi, pi]", DEF, "sin(x)^3", "-pi", "pi", ["sin^3 is odd", "= 0"], [None, "final: 0"], "valid-equivalence",
   "odd function", "0")
di("improper integral through a non-integrable singularity", "integrability across a singularity", "1/x^2", "-1", "1",
   ["= [-1/x]_-1^1", "= -1 - 1", "= -2"], [None, None, "final: -2"], "invalid",
   "1/x^2 > 0 so a negative value is impossible; the integral diverges (∫_0^1 dx/x^2 = oo)", "diverges", difficulty="hard",
   complexity=3, pair="cal-impr")
di("FTC on an interval free of singularities", DEF, "1/x^2", "1", "2", ["= [-1/x]_1^2", "= -1/2 + 1", "= 1/2"], [None, None, "final: 1/2"],
   "valid-equivalence", "continuous on [1,2]", "1/2", pair="cal-impr")
di("principal value is not the improper integral", "integrability across a singularity", "1/x", "-1", "1",
   ["1/x is odd", "so the integral is 0"], [None, "final: 0"], "invalid",
   "∫_0^1 dx/x diverges, so the integral does not exist; symmetry only gives the Cauchy principal value. "
   "Uncertified: the oracle's reference integral of a divergent integrand is not computable", "diverges", difficulty="hard",
   complexity=3, pair="cal-impr")
di("antiderivative of sine is -cos", DEF, "sin(x)", "0", "pi", ["= [-cos(x)]_0^pi", "= 1 + 1 = 2"], [None, "final: 2"],
   "valid-equivalence", "-cos pi + cos 0 = 2", "2", difficulty="easy", pair="cal-sn")
di("antiderivative of sine taken as +cos", DEF, "sin(x)", "0", "pi", ["= [cos(x)]_0^pi", "= -1 - 1 = -2"], [None, "final: -2"],
   "invalid", "sin ≥ 0 on [0,pi], value 2", "2", difficulty="easy", pair="cal-sn")
di("definite integral by parts", DEF, "x e^x", "0", "1", ["= [x e^x - e^x]_0^1", "= (e - e) - (0 - 1)", "= 1"],
   [None, None, "final: 1"], "valid-equivalence", "antiderivative x e^x - e^x", "1", complexity=3, pair="cal-dibp")
di("definite integral by parts, evaluation not done", FIN, "x e^x", "0", "1", ["antiderivative x e^x - e^x", "= [x e^x - e^x]_0^1"],
   ["claim: d/dx(x e^x - e^x) = x e^x", None], "incomplete", "never evaluated", "1", complexity=2, pair="cal-dibp")
di("definite integral by parts: lower limit term dropped", DEF, "x e^x", "0", "1", ["= [x e^x - e^x]_0^1", "= e - e", "= 0"],
   [None, None, "final: 0"], "invalid", "at 0 the antiderivative is -1, contributing +1", "1", complexity=3, pair="cal-dibp")
di("integral of ln x from 1 to e", DEF, "ln(x)", "1", "e", ["= [x ln(x) - x]_1^e", "= (e - e) - (0 - 1) = 1"], [None, "final: 1"],
   "valid-equivalence", "by parts", "1")
di("absolute value split at its kink", DEF, "|x-1|", "0", "2", ["= ∫_0^1 (1-x) dx + ∫_1^2 (x-1) dx", "= 1/2 + 1/2 = 1"], [None, "final: 1"],
   "valid-equivalence", "two triangles of area 1/2", "1", complexity=3, pair="cal-absd")
di("absolute value ignored in a definite integral", DEF, "|x-1|", "0", "2", ["= [(x-1)^2/2]_0^2", "= 1/2 - 1/2 = 0"], [None, "final: 0"],
   "invalid", "(x-1)^2/2 is an antiderivative of x-1, not |x-1|; a positive integrand cannot integrate to 0", "1", complexity=2,
   pair="cal-absd")
di("even integrand doubled", DEF, "x^2", "-2", "2", ["x^2 is even, so = 2∫_0^2 x^2 dx", "= 2·8/3 = 16/3"], [None, "final: 16/3"],
   "valid-equivalence", "even symmetry", "16/3", difficulty="easy")
di("cosine over a quarter period", DEF, "cos(x)", "0", "pi/2", ["= [sin(x)]_0^(pi/2) = 1"], ["final: 1"], "valid-equivalence",
   "sin(pi/2) - sin 0", "1", difficulty="easy")
di("arctan definite integral", DEF, "1/(1+x^2)", "0", "1", ["= atan(1) - atan(0)", "= pi/4"], [None, "final: pi/4"], "valid-equivalence",
   "atan 1 = pi/4", "pi/4")
di("substitution in a definite integral with limits changed", DEF, "2x(x^2+1)^2", "0", "1",
   ["let u = x^2+1; x=0 -> u=1, x=1 -> u=2", "= ∫_1^2 u^2 du = (8-1)/3", "= 7/3"], [None, None, "final: 7/3"], "valid-equivalence",
   "limits transformed", "7/3", complexity=3, pair="cal-sbd")
di("substitution in a definite integral with old limits kept", DEF, "2x(x^2+1)^2", "0", "1",
   ["let u = x^2+1", "= ∫_0^1 u^2 du", "= 1/3"], [None, None, "final: 1/3"], "invalid", "u-limits must be 1 and 2; value 7/3", "7/3",
   complexity=3, pair="cal-sbd")
di("substitution then back-substitution in a definite integral", DEF, "x sqrt(x+1)", "0", "3",
   ["= [(2/5)(x+1)^(5/2) - (2/3)(x+1)^(3/2)]_0^3", "= (64/5 - 16/3) - (2/5 - 2/3)", "= 116/15"], [None, None, "final: 116/15"],
   "valid-equivalence", "62/5 - 14/3 = 116/15", "116/15", difficulty="hard", complexity=4)
di("partial fractions in a definite integral", DEF, "1/(x^2-1)", "2", "3", ["= [(1/2)ln|(x-1)/(x+1)|]_2^3", "= (1/2)(ln(1/2) - ln(1/3))",
   "= (1/2)ln(3/2)"], [None, None, "final: (1/2)ln(3/2)"], "valid-equivalence", "(1/2)ln((1/2)/(1/3))", "(1/2)ln(3/2)", complexity=4)
di("odd rational function over a symmetric interval", DEF, "x/(x^2+1)", "-1", "1", ["x/(x^2+1) is odd", "= 0"], [None, "final: 0"],
   "valid-equivalence", "odd and continuous", "0", pair="cal-odd2")
di("even rational function mistaken for odd", DEF, "x^2/(x^2+1)", "-1", "1", ["x^2/(x^2+1) is odd", "= 0"], [None, "final: 0"],
   "invalid", "it is even and positive; value 2 - pi/2", "2 - pi/2", pair="cal-odd2")
di("even rational function computed", DEF, "x^2/(x^2+1)", "-1", "1", ["x^2/(x^2+1) = 1 - 1/(x^2+1)", "= 2 - 2atan(1)", "= 2 - pi/2"],
   ["claim: x^2/(x^2+1) = 1 - 1/(x^2+1)", None, "final: 2 - pi/2"], "valid-equivalence", "split and integrate", "2 - pi/2",
   complexity=3, pair="cal-odd2")
di("odd-symmetry with a wrongly identified odd factor", REASON, "x^2 sin(x)", "-1", "1", ["x^2 is even, so the integral is 0"],
   ["final: 0"], "wrong-reason", "value 0 is right because x^2 sin x is odd; 'x^2 is even' does not imply a zero integral", "0",
   pair="cal-odd3")
di("odd-symmetry correctly identified", DEF, "x^2 sin(x)", "-1", "1", ["x^2 sin(x) is odd (even times odd)", "= 0"], [None, "final: 0"],
   "valid-equivalence", "odd integrand", "0", pair="cal-odd3")
di("root substitution in a definite integral", DEF, "x/sqrt(x^2+1)", "0", "1", ["= [sqrt(x^2+1)]_0^1", "= sqrt(2) - 1"],
   [None, "final: sqrt(2) - 1"], "valid-equivalence", "antiderivative sqrt(x^2+1)", "sqrt(2) - 1")

# ============================================================ misc wrong-reason / incomplete / forged
d("chain rule stated, never applied", FIN, "ln(sin(x))", ["by the chain rule, f'(x) = (1/sin(x)) times the derivative of sin(x)"],
  [None], "incomplete", "nothing false, no final derivative", "cot(x)", pair="cal-inc1")
d("chain rule completed for ln(sin x)", DER, "ln(sin(x))", ["f'(x) = (1/sin(x))·cos(x)", "= cot(x)"], [None, "final: cot(x)"],
  "valid-equivalence", "chain rule", "cot(x)", pair="cal-inc1")
d("rules named but nothing computed", FIN, "(x^2+1)^3 sin(x)", ["use the product rule with u = (x^2+1)^3, v = sin(x)",
  "u' needs the chain rule"], [None, None], "incomplete", "no derivative stated", "6x(x^2+1)^2 sin(x) + (x^2+1)^3 cos(x)", pair="cal-inc2")
d("product and chain rule combined", DER, "(x^2+1)^3 sin(x)", ["u' = 3(x^2+1)^2·2x", "f'(x) = 6x(x^2+1)^2 sin(x) + (x^2+1)^3 cos(x)"],
  ["claim: d/dx((x^2+1)^3) = 6x(x^2+1)^2", "final: 6x(x^2+1)^2 sin(x) + (x^2+1)^3 cos(x)"], "valid-equivalence", "product + chain",
  "6x(x^2+1)^2 sin(x) + (x^2+1)^3 cos(x)", complexity=3, composition=True, pair="cal-inc2")
d("product rule with forged chain step", FORGE, "(x^2+1)^3 sin(x)", ["u' = 3(x^2+1)^2", "f'(x) = 6x(x^2+1)^2 sin(x) + (x^2+1)^3 cos(x)"],
  ["claim: d/dx((x^2+1)^3) = 3(x^2+1)^2", "final: 6x(x^2+1)^2 sin(x) + (x^2+1)^3 cos(x)"], "invalid",
  "the stated u' omits 2x; the final answer silently reinstates it", "6x(x^2+1)^2 sin(x) + (x^2+1)^3 cos(x)", complexity=3,
  composition=True, pair="cal-inc2")

# ============================================================ unfamiliar compositions
d("chain rule inside a quotient inside a log", DER, "ln((x^2+1)^3/(e^x+1))",
  ["f'(x) = ((e^x+1)/(x^2+1)^3) · (6x(x^2+1)^2(e^x+1) - (x^2+1)^3 e^x)/(e^x+1)^2", "= (6x(e^x+1) - (x^2+1)e^x)/((x^2+1)(e^x+1))"],
  [None, "final: (6x(e^x+1) - (x^2+1)e^x)/((x^2+1)(e^x+1))"], "valid-equivalence",
  "equals 6x/(x^2+1) - e^x/(e^x+1)", "6x/(x^2+1) - e^x/(e^x+1)", difficulty="hard", complexity=5, composition=True, pair="cal-cmp1")
d("log-quotient-chain: inner chain factor dropped", DER, "ln((x^2+1)^3/(e^x+1))",
  ["f'(x) = ((e^x+1)/(x^2+1)^3) · (3(x^2+1)^2(e^x+1) - (x^2+1)^3 e^x)/(e^x+1)^2", "= (3(e^x+1) - (x^2+1)e^x)/((x^2+1)(e^x+1))"],
  [None, "final: (3(e^x+1) - (x^2+1)e^x)/((x^2+1)(e^x+1))"], "invalid", "missing 2x from d/dx (x^2+1)^3; at x=0: 3/2-1/2=1 vs 0-1/2",
  "6x/(x^2+1) - e^x/(e^x+1)", difficulty="hard", complexity=5, composition=True, pair="cal-cmp1")
d("log-quotient via log laws", DER, "ln((x^2+1)^3/(e^x+1))", ["f(x) = 3ln(x^2+1) - ln(e^x+1)", "f'(x) = 6x/(x^2+1) - e^x/(e^x+1)"],
  ["claim: ln((x^2+1)^3/(e^x+1)) = 3ln(x^2+1) - ln(e^x+1)", "final: 6x/(x^2+1) - e^x/(e^x+1)"], "valid-equivalence",
  "both arguments positive for all x, so the log laws are exact", "6x/(x^2+1) - e^x/(e^x+1)", difficulty="hard", complexity=4,
  composition=True, pair="cal-cmp1")
d("square root of a logarithm of a quadratic", DER, "sqrt(ln(x^2+1))", ["f'(x) = (1/(2sqrt(ln(x^2+1))))·(2x/(x^2+1))",
  "= x/((x^2+1)sqrt(ln(x^2+1)))"], [None, "final: x/((x^2+1)sqrt(ln(x^2+1)))"], "valid-equivalence", "chain of three (x != 0)",
  "x/((x^2+1)sqrt(ln(x^2+1)))", difficulty="hard", complexity=4, composition=True)
d("product with log of cosine", DER, "e^x ln(cos(x))", ["f'(x) = e^x ln(cos(x)) + e^x·(-sin(x)/cos(x))", "= e^x ln(cos(x)) - e^x tan(x)"],
  [None, "final: e^x ln(cos(x)) - e^x tan(x)"], "valid-equivalence", "product + chain", "e^x (ln(cos(x)) - tan(x))", complexity=4,
  composition=True)
d("quotient with arctan of exponential", DER, "atan(e^x)/(1+x)",
  ["f'(x) = ((e^x/(1+e^(2x)))(1+x) - atan(e^x))/(1+x)^2"], ["final: ((e^x/(1+e^(2x)))(1+x) - atan(e^x))/(1+x)^2"], "valid-equivalence",
  "quotient + chain", "((e^x/(1+e^(2x)))(1+x) - atan(e^x))/(1+x)^2", difficulty="hard", complexity=4, composition=True)
d("variable base and exponent", DER, "x^(sin(x))", ["ln y = sin(x) ln(x)", "y'/y = cos(x)ln(x) + sin(x)/x", "y' = x^(sin(x))(cos(x)ln(x) + sin(x)/x)"],
  [None, "claim: d/dx(sin(x)ln(x)) = cos(x)ln(x) + sin(x)/x", "final: x^(sin(x))(cos(x)ln(x) + sin(x)/x)"], "valid-equivalence",
  "logarithmic differentiation", "x^(sin(x))(cos(x)ln(x) + sin(x)/x)", difficulty="hard", complexity=4, composition=True)
d("log of x plus a root simplifies", DER, "ln(x + sqrt(x^2+1))",
  ["f'(x) = (1 + x/sqrt(x^2+1))/(x + sqrt(x^2+1))", "= ((sqrt(x^2+1) + x)/sqrt(x^2+1))/(x + sqrt(x^2+1))", "= 1/sqrt(x^2+1)"],
  [None, None, "final: 1/sqrt(x^2+1)"], "valid-equivalence", "factor cancels", "1/sqrt(x^2+1)", difficulty="hard", complexity=4,
  composition=True, pair="cal-cmp2")
d("log of x plus a root: chain factor forgotten", DER, "ln(x + sqrt(x^2+1))", ["f'(x) = 1/(x + sqrt(x^2+1))"],
  ["final: 1/(x + sqrt(x^2+1))"], "invalid", "missing inner derivative 1 + x/sqrt(x^2+1); at x=1 values differ", "1/sqrt(x^2+1)",
  complexity=3, composition=True, pair="cal-cmp2")
ii("by parts twice on (ln x)^2", ANTI, "ln(x)^2", ["= x ln(x)^2 - ∫2ln(x) dx", "= x ln(x)^2 - 2(x ln(x) - x) + C"],
   [None, "final: x ln(x)^2 - 2x ln(x) + 2x + C"], "valid-equivalence", "derivative ln^2 x + 2ln x - 2ln x - 2 + 2",
   "x ln(x)^2 - 2x ln(x) + 2x + C", difficulty="hard", complexity=4, composition=True)
ii("cyclic parts after substitution: sin(ln x)", ANTI, "sin(ln(x))",
   ["I = x sin(ln(x)) - ∫cos(ln(x)) dx", "= x sin(ln(x)) - x cos(ln(x)) - I", "I = (x/2)(sin(ln(x)) - cos(ln(x))) + C"],
   [None, None, "final: (x/2)(sin(ln(x)) - cos(ln(x))) + C"], "valid-equivalence",
   "derivative (1/2)(sin - cos) + (1/2)(cos + sin) = sin(ln x)", "(x/2)(sin(ln(x)) - cos(ln(x))) + C", difficulty="hard", complexity=5,
   composition=True)
ii("substitution then parts: e^(sqrt x)", ANTI, "e^(sqrt(x))",
   ["let u = sqrt(x), x = u^2, dx = 2u du", "= ∫2u e^u du = 2(u e^u - e^u)", "= 2e^(sqrt(x))(sqrt(x) - 1) + C"],
   [None, None, "final: 2e^(sqrt(x))(sqrt(x) - 1) + C"], "valid-equivalence", "derivative e^(sqrt x)", "2e^(sqrt(x))(sqrt(x) - 1) + C",
   difficulty="hard", complexity=5, composition=True, pair="cal-cmp3")
ii("substitution with dx not transformed", ANTI, "e^(sqrt(x))", ["let u = sqrt(x)", "= ∫e^u du = e^(sqrt(x)) + C"],
   [None, "final: e^(sqrt(x)) + C"], "invalid", "dx = 2u du is missing; derivative is e^(sqrt x)/(2sqrt x)", "2e^(sqrt(x))(sqrt(x) - 1) + C",
   complexity=3, composition=True, pair="cal-cmp3")
ii("complete the square, split log and arctan", ANTI, "x/(x^2-4x+5)",
   ["x = (1/2)(2x-4) + 2", "= (1/2)ln(x^2-4x+5) + 2∫dx/((x-2)^2+1)", "= (1/2)ln(x^2-4x+5) + 2atan(x-2) + C"],
   [None, None, "final: (1/2)ln(x^2-4x+5) + 2atan(x-2) + C"], "valid-equivalence", "derivative (x-2)/q + 2/q = x/q",
   "(1/2)ln(x^2-4x+5) + 2atan(x-2) + C", difficulty="hard", complexity=5, composition=True, pair="cal-cmp4")
ii("complete the square: arctan coefficient lost", ANTI, "x/(x^2-4x+5)", ["= (1/2)ln(x^2-4x+5) + atan(x-2) + C"],
   ["final: (1/2)ln(x^2-4x+5) + atan(x-2) + C"], "invalid", "the constant 2 from x = (1/2)(2x-4)+2 is dropped; derivative (x-1)/q",
   "(1/2)ln(x^2-4x+5) + 2atan(x-2) + C", difficulty="hard", complexity=4, composition=True, pair="cal-cmp4")
ii("parts inside a substitution, +C omitted", PC, "e^(sqrt(x))", ["let u = sqrt(x), dx = 2u du", "= 2e^(sqrt(x))(sqrt(x) - 1)"],
   [None, "final: 2e^(sqrt(x))(sqrt(x) - 1)"], "domain-violation", "correct antiderivative but no + C", "2e^(sqrt(x))(sqrt(x) - 1) + C",
   complexity=3, composition=True, pair="cal-cmp3")
di("substitution into a log of a quotient, definite", DEF, "1/(x ln(x))", "e", "e^2", ["= [ln(ln(x))]_e^(e^2)", "= ln 2 - ln 1 = ln(2)"],
   [None, "final: ln(2)"], "valid-equivalence", "x>1 on [e, e^2], so ln(ln x) is a valid antiderivative there", "ln(2)", complexity=3,
   composition=True, pair="cal-lnln")
d("derivative of an antiderivative (FTC round trip)", DER, "x ln(x) - x", ["f'(x) = ln(x) + 1 - 1 = ln(x)"], ["final: ln(x)"],
  "valid-equivalence", "product rule", "ln(x)", difficulty="easy")
d("chain rule in a negative power of a trig function", DER, "1/(2+cos(x^2))^2",
  ["f(x) = (2+cos(x^2))^(-2)", "f'(x) = -2(2+cos(x^2))^(-3)·(-sin(x^2))·2x", "= 4x sin(x^2)/(2+cos(x^2))^3"], [None, None, "final: 4x sin(x^2)/(2+cos(x^2))^3"],
  "valid-equivalence", "three-layer chain", "4x sin(x^2)/(2+cos(x^2))^3", difficulty="hard", complexity=4, composition=True, pair="cal-cmp5")
d("negative power: sign of (cos)' lost", DER, "1/(2+cos(x^2))^2", ["f'(x) = -2(2+cos(x^2))^(-3)·sin(x^2)·2x", "= -4x sin(x^2)/(2+cos(x^2))^3"],
  [None, "final: -4x sin(x^2)/(2+cos(x^2))^3"], "invalid", "(cos u)' = -sin u u'; the two minus signs cancel", "4x sin(x^2)/(2+cos(x^2))^3",
  difficulty="hard", complexity=4, composition=True, pair="cal-cmp5")
d("arctan of a quotient", DER, "atan((1+x)/(1-x))",
  ["u = (1+x)/(1-x), u' = 2/(1-x)^2", "f'(x) = u'/(1+u^2)", "= 2/((1-x)^2 + (1+x)^2)", "= 1/(1+x^2)"],
  ["claim: d/dx((1+x)/(1-x)) = 2/(1-x)^2", None, None, "final: 1/(1+x^2)"], "valid-equivalence",
  "(1-x)^2+(1+x)^2 = 2+2x^2; valid for x != 1", "1/(1+x^2)", difficulty="hard", complexity=4, composition=True)
d("exponential of a log simplifies first", DER, "e^(2ln(x))", ["e^(2ln(x)) = x^2 for x > 0", "f'(x) = 2x"],
  [None, "final: 2x"], "valid-equivalence", "domain x>0 kept; derivative 2x there", "2x", composition=True)
d("power rule on a log-power: chain factor 1/x lost", DER, "ln(x)^3", ["f'(x) = 3ln(x)^2"], ["final: 3ln(x)^2"], "invalid",
  "chain factor 1/x missing", "3ln(x)^2/x", pair="cal-lp")
d("power of a log with chain factor", DER, "ln(x)^3", ["f'(x) = 3ln(x)^2 · (1/x)"], ["final: 3ln(x)^2/x"], "valid-equivalence",
  "chain rule", "3ln(x)^2/x", pair="cal-lp")
d("ln(x^3) is not (ln x)^3", DER, "ln(x^3)", ["ln(x^3) = 3ln(x)", "f'(x) = 3/x"], ["claim: ln(x^3) = 3ln(x)", "final: 3/x"],
  "valid-equivalence", "domain x>0, so the log law is exact", "3/x", pair="cal-lp")
ii("antiderivative of a log-power by substitution", ANTI, "ln(x)^2/x", ["let u = ln(x)", "= ln(x)^3/3 + C"], [None, "final: ln(x)^3/3 + C"],
   "valid-equivalence", "u^2 du", "ln(x)^3/3 + C", pair="cal-lp")
ii("trig square via double angle", ANTI, "sin(x)^2", ["sin^2 x = (1 - cos(2x))/2", "= x/2 - sin(2x)/4 + C"],
   ["claim: sin(x)^2 = (1 - cos(2x))/2", "final: x/2 - sin(2x)/4 + C"], "valid-equivalence", "half-angle", "x/2 - sin(2x)/4 + C",
   complexity=3, pair="cal-sq")
ii("trig square integrated as a power", ANTI, "sin(x)^2", ["by the power rule, = sin(x)^3/3 + C"], ["final: sin(x)^3/3 + C"],
   "invalid", "derivative sin^2 cos, not sin^2", "x/2 - sin(2x)/4 + C", pair="cal-sq")
ii("trig square with wrong half-angle sign", ANTI, "sin(x)^2", ["sin^2 x = (1 + cos(2x))/2", "= x/2 + sin(2x)/4 + C"],
   ["claim: sin(x)^2 = (1 + cos(2x))/2", "final: x/2 + sin(2x)/4 + C"], "invalid", "that is cos^2 x", "x/2 - sin(2x)/4 + C",
   complexity=3, pair="cal-sq")
ii("cos^2 via half angle, +C missing", PC, "cos(x)^2", ["cos^2 x = (1 + cos(2x))/2", "= x/2 + sin(2x)/4"],
   ["claim: cos(x)^2 = (1 + cos(2x))/2", "final: x/2 + sin(2x)/4"], "domain-violation", "correct antiderivative, no + C",
   "x/2 + sin(2x)/4 + C", complexity=3, pair="cal-sq")
d("chain rule with an arcsin of a root", DER, "asin(sqrt(x))", ["f'(x) = (1/sqrt(1-x))·(1/(2sqrt(x)))", "= 1/(2sqrt(x(1-x)))"],
  [None, "final: 1/(2sqrt(x)sqrt(1-x))"], "valid-equivalence", "valid for 0<x<1", "1/(2sqrt(x(1-x)))", difficulty="hard", complexity=3,
  composition=True)
ii("integral of a derivative of a quotient (recognise the quotient rule)", ANTI, "(x cos(x) - sin(x))/x^2",
   ["this is d/dx(sin(x)/x)", "= sin(x)/x + C"], ["claim: d/dx(sin(x)/x) = (x cos(x) - sin(x))/x^2", "final: sin(x)/x + C"],
   "valid-equivalence", "reverse quotient rule", "sin(x)/x + C", difficulty="hard", complexity=3, composition=True, pair="cal-rq")
ii("reverse quotient rule with numerator sign flipped", ANTI, "(sin(x) - x cos(x))/x^2", ["this is d/dx(sin(x)/x)", "= sin(x)/x + C"],
   ["claim: d/dx(sin(x)/x) = (sin(x) - x cos(x))/x^2", "final: sin(x)/x + C"], "invalid", "the integrand is d/dx(-sin(x)/x)",
   "-sin(x)/x + C", difficulty="hard", complexity=3, composition=True, pair="cal-rq")
d("derivative of a definite-integral-free product of inverse functions", DER, "atan(x) ln(1+x^2)",
  ["f'(x) = ln(1+x^2)/(1+x^2) + atan(x)·2x/(1+x^2)"], ["final: (ln(1+x^2) + 2x atan(x))/(1+x^2)"], "valid-equivalence",
  "product + chain", "(ln(1+x^2) + 2x atan(x))/(1+x^2)", complexity=3, composition=True)
d("quotient rule with forged simplification", FORGE, "(x+1)/(x-1)", ["f'(x) = ((x-1) - (x+1))/(x-1)^2", "= -2/(x-1)", "= -2/(x-1)^2"],
  [None, "claim: ((x-1) - (x+1))/(x-1)^2 = -2/(x-1)", "final: -2/(x-1)^2"], "invalid",
  "the middle line drops the square; the final reinstates it", "-2/(x-1)^2", pair="cal-qr4")
d("quotient rule with a clean simplification", DER, "(x+1)/(x-1)", ["f'(x) = ((x-1) - (x+1))/(x-1)^2", "= -2/(x-1)^2"],
  [None, "final: -2/(x-1)^2"], "valid-equivalence", "numerator -2", "-2/(x-1)^2", pair="cal-qr4")
