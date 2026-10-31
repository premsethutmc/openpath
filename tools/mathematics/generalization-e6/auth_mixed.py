from kit import *
import auth_cx as _cx
CAT = "mixed-domain"
def GD(expr, var="x"): return ("deriv", diff(X(expr), var))
def dm(fam, expr, lines, expect, var="x", **kw):
    add(CAT, fam, dprob(expr, var), lines, expect, goal=GD(expr, var), var=var, restate=X(expr), **kw)
def NUM(v, closed=True): return ("num", ev(X(v), {}), closed)
def dim(fam, expr, lo, hi, lines, expect, val, var="x", **kw):
    add(CAT, fam, diprob(expr, lo, hi, var), lines, expect, goal=NUM(val), var=var, **kw)
def L(e, pt, side="both", v="x"): return ("LIM", e, v, pt, side)
def lm(fam, expr, pt, lines, expect, val, side="both", var="x", **kw):
    add(CAT, fam, lprob(expr, pt, side, var), lines, expect, goal=("lim", val), var=var, **kw)
def Gc(a, b=0): return EO.G(F(a), F(b))
R = lambda v: (Gc(v), "real")
def build():
    # ============================================================ A. algebra -> differentiation
    s = St("plain", dstyle="prime")
    dm("cancel-with-restriction", "(x^2 - 1)/(x - 1)", [defn(s, "f", "(x^2 - 1)/(x - 1)"), eq(s, "f", "(x - 1)*(x + 1)/(x - 1)", "x + 1", needs="x!=1", state="x ≠ 1"), eq(s, ("D", "f"), "1", final=True)], "verified", tags=["valid", "algebra-to-calculus", "restriction"])
    s = St("unicode", dstyle="prime")
    dm("cancel-missing-restriction", "(x^2 - 4)/(x - 2)", [defn(s, "f", "(x^2 - 4)/(x - 2)"), eq(s, "f", "(x - 2)*(x + 2)/(x - 2)", "x + 2", needs="x!=2"), eq(s, ("D", "f"), "1", final=True)], "missing-assumption", tags=["missing-restriction", "algebra-to-calculus"])
    s = St("implicit", dstyle="leib")
    dm("expand-then-differentiate", "(x + 3)^2", [defn(s, "y", "(x + 3)^2", "eq"), eq(s, "y", "x^2 + 6*x + 9"), eq(s, ("D", "y"), "2*x + 6", final=True)], "verified", alt=True, tags=["valid", "alternative", "algebra-to-calculus"])
    s = St("plain", dstyle="dd")
    dm("combine-logs-with-domain", "ln(x) + ln(x^2)", [eq(s, "ln(x) + ln(x^2)", "ln(x^3)", needs="x>0", state="for x > 0"), eq(s, ("D", "ln(x) + ln(x^2)"), "3/x", final=True)], "verified", tags=["valid", "restriction", "algebra-to-calculus"])
    s = St("latex", dstyle="prime")
    dm("exp-laws-then-diff", "e^(2*x)*e^(3*x)", [defn(s, "f", "e^(2*x)*e^(3*x)"), eq(s, "f", "e^(5*x)"), eq(s, ("D", "f"), "5*e^(5*x)", final=True)], "verified", tags=["valid", "latex", "algebra-to-calculus"])
    s = St("unicode", dstyle="leib")
    dm("double-angle-alternative", "sin(x)*cos(x)", [eq(s, "sin(x)*cos(x)", "sin(2*x)/2"), eq(s, ("D", "sin(x)*cos(x)"), "cos(2*x)", final=True)], "verified", alt=True, tags=["valid", "alternative", "identity"])
    s = St("implicit", dstyle="prime")
    dm("split-fraction-restricted", "(x^3 + 2*x)/x", [defn(s, "f", "(x^3 + 2*x)/x"), eq(s, "f", "x^2 + 2", needs="x!=0", state="x ≠ 0"), eq(s, ("D", "f"), "2*x", final=True)], "verified", tags=["valid", "restriction"])
    s = St("plain", dstyle="prime")
    dm("err-square-binomial", "(x + 3)^2", [defn(s, "f", "(x + 3)^2"), eq(s, "f", "x^2 + 9"), eq(s, ("D", "f"), "2*x", final=True)], "invalid", first_ok=[1], tags=["algebra-error"])
    s = St("unicode", dstyle="prime")
    dm("err-log-of-sum", "ln(x^2 + 1)", [defn(s, "f", "ln(x^2 + 1)"), eq(s, "f", "ln(x^2) + ln(1)"), eq(s, ("D", "f"), "2/x", final=True)], "invalid", first_ok=[1], tags=["log-rule"])
    s = St("implicit", dstyle="prime")
    dm("final-ok-after-bad-algebra", "e^(2*x)*e^(3*x)", [defn(s, "f", "e^(2*x)*e^(3*x)"), eq(s, "f", "e^(6*x)"), eq(s, ("D", "f"), "5*e^(5*x)", final=True)], "invalid", first_ok=[1], tags=["correct-final-after-error"])
    s = St("plain", dstyle="prime")
    dm("incomplete-algebra-only", "(x + 3)^2", [defn(s, "f", "(x + 3)^2"), eq(s, "f", "x^2 + 6*x + 9")], "incomplete", tags=["no-derivative"])
    s = St("unicode", dstyle="leib")
    dm("err-exponent-law", "e^(2*x)*e^(3*x)", [defn(s, "y", "e^(2*x)*e^(3*x)", "eq"), eq(s, "y", "e^(6*x)"), eq(s, ("D", "y"), "6*e^(6*x)", final=True)], "invalid", first_ok=[1], tags=["exponent-law"])
    s = St("implicit", dstyle="prime")
    dm("negative-half-power", "1/sqrt(x)", [defn(s, "f", "1/sqrt(x)"), eq(s, "f", "x^(-1/2)", needs="x>0", state="x > 0"), eq(s, ("D", "f"), "(-1/2)*x^(-3/2)", "-1/(2*x*sqrt(x))", final=True)], "verified", alt=True, tags=["valid", "alternative", "restriction"])
    s = St("plain", dstyle="dd")
    dm("combine-logs-no-domain", "ln(x) + ln(x^2)", [eq(s, "ln(x) + ln(x^2)", "ln(x^3)", needs="x>0"), eq(s, ("D", "ln(x) + ln(x^2)"), "3/x", final=True)], "missing-assumption", tags=["missing-restriction", "log-domain"])
    # ============================================================ B. algebra / probability -> definite integrals
    s = St("plain", bare=True)
    dim("split-fraction-bounds", "(x + 1)/sqrt(x)", 1, 4, [eq(s, "(x + 1)/sqrt(x)", "x^(1/2) + x^(-1/2)"), eq(s, ("DI", "(x + 1)/sqrt(x)", "x", 1, 4, "(2/3)*x^(3/2) + 2*x^(1/2)"), ("EV", "(2/3)*x^(3/2) + 2*x^(1/2)", "x", 1, 4), "(16/3 + 4) - (2/3 + 2)", "28/3 - 8/3", "20/3", final=True)], "verified", "20/3", tags=["valid", "algebra-to-calculus"])
    s = St("unicode", bare=True)
    dim("expand-vs-substitute-alt", "(x + 1)^2", 0, 2, [defn(s, "u", "x + 1", "eq"), duline(s, "u", "1"), prose("x = 0 gives u = 1 and x = 2 gives u = 3"), eq(s, ("DI", "(x + 1)^2", "x", 0, 2, "(x + 1)^3/3"), ("DI", "u^2", "u", 1, 3, "u^3/3"), ("EV", "u^3/3", "u", 1, 3), "27/3 - 1/3", "26/3", final=True)], "verified", "26/3", alt=True, tags=["valid", "alternative", "substitution"])
    s = St("latex", bare=True)
    dim("half-angle-identity", "sin(x)^2", 0, "pi", [eq(s, "sin(x)^2", "(1 - cos(2*x))/2"), eq(s, ("DI", "sin(x)^2", "x", 0, "pi", "x/2 - sin(2*x)/4"), ("EV", "x/2 - sin(2*x)/4", "x", 0, "pi"), "pi/2 - 0", "pi/2", final=True)], "verified", "pi/2", tags=["valid", "latex", "identity"])
    s = St("plain", bare=True)
    dim("err-swapped-endpoints", "(x + 1)^2", 0, 2, [eq(s, ("DI", "(x + 1)^2", "x", 0, 2, "(x + 1)^3/3"), ("EV", "(x + 1)^3/3", "x", 0, 2), "1/3 - 27/3", "-26/3", final=True)], "invalid", "26/3", first_ok=[0], tags=["endpoint-order"])
    s = St("implicit", bare=True)
    dim("err-expand-square", "(x + 1)^2", 0, 2, [eq(s, "(x + 1)^2", "x^2 + 1"), eq(s, ("DI", "x^2 + 1", "x", 0, 2, "x^3/3 + x"), ("EV", "x^3/3 + x", "x", 0, 2), "8/3 + 2", "14/3", final=True)], "invalid", "26/3", first_ok=[0], tags=["algebra-error"])
    s = St("plain", bare=True)
    dim("incomplete-not-evaluated", "(x + 1)/sqrt(x)", 1, 4, [eq(s, "(x + 1)/sqrt(x)", "x^(1/2) + x^(-1/2)"), eq(s, ("DI", "(x + 1)/sqrt(x)", "x", 1, 4, "(2/3)*x^(3/2) + 2*x^(1/2)"), final=True)], "incomplete", "20/3", tags=["not-evaluated"])
    s = St("unicode", bare=True)
    dim("expected-value-pdf", "x*(2*x)", 0, 1, [prose("E[X] is the integral of x f(x) over the support, with f(x) = 2x on [0, 1]"), eq(s, ("DI", "x*(2*x)", "x", 0, 1, "(2*x^3)/3"), ("EV", "(2*x^3)/3", "x", 0, 1), "2/3 - 0", "2/3", final=True)], "verified", "2/3", tags=["valid", "probability-to-calculus"])
    s = St("plain", bare=True)
    dim("pdf-normalisation", "x/2", 0, 2, [eq(s, ("DI", "x/2", "x", 0, 2, "x^2/4"), ("EV", "x^2/4", "x", 0, 2), "4/4 - 0", "1", final=True)], "verified", "1", tags=["valid", "probability-to-calculus"])
    add(CAT, "err-expected-value-forgot-x", diprob("x*(2*x)", 0, 1), [prose("E[X] for f(x) = 2x on [0, 1]"), eq(St("implicit", bare=True), ("DI", "2*x", "x", 0, 1, "x^2"), ("EV", "x^2", "x", 0, 1), "1 - 0", "1", final=True)],
        "invalid", goal=NUM("2/3"), ref_override=("invalid", 1, "the integrand must be x f(x) = 2x^2, not f(x) = 2x; the line integrates the density itself (which is 1) and the method is wrong"), first_ok=[1], tags=["wrong-method", "probability-to-calculus"])
    s = St("unicode", bare=True)
    dim("area-between-curves", "x - x^2", 0, 1, [eq(s, ("DI", "x - x^2", "x", 0, 1, "x^2/2 - x^3/3"), ("EV", "x^2/2 - x^3/3", "x", 0, 1), "1/2 - 1/3", "1/6", final=True)], "verified", "1/6", tags=["valid", "geometry-to-calculus"])
    # ============================================================ C. algebra -> limits
    s = St("plain")
    lm("factor-then-limit", "(x^3 - 8)/(x - 2)", 2, [eq(s, "(x^3 - 8)/(x - 2)", "(x - 2)*(x^2 + 2*x + 4)/(x - 2)", "x^2 + 2*x + 4"), eq(s, L("(x^3 - 8)/(x - 2)", 2), L("x^2 + 2*x + 4", 2), "4 + 4 + 4", "12", final=True)], "verified", ev(X("12"), {}), tags=["valid", "algebra-to-calculus"])
    s = St("implicit", lim="paren")
    lm("err-cancel-wrong", "(x^3 - 8)/(x - 2)", 2, [eq(s, "(x^3 - 8)/(x - 2)", "x^2 + 4"), eq(s, L("(x^3 - 8)/(x - 2)", 2), L("x^2 + 4", 2), "4 + 4", "8", final=True)], "invalid", ev(X("12"), {}), first_ok=[0], tags=["algebra-error"])
    s = St("unicode", lim="brace")
    lm("conjugate-sqrt-triple", "(sqrt(1 + 3*x) - 1)/x", 0, [eq(s, "(sqrt(1 + 3*x) - 1)/x", "3/(sqrt(1 + 3*x) + 1)"), eq(s, L("(sqrt(1 + 3*x) - 1)/x", 0), L("3/(sqrt(1 + 3*x) + 1)", 0), "3/(1 + 1)", "3/2", final=True)], "verified", ev(X("3/2"), {}), tags=["valid", "conjugate"])
    s = St("plain")
    lm("incomplete-limit-unevaluated", "(4*x^2 - 1)/(2*x - 1)", "1/2", [eq(s, "(4*x^2 - 1)/(2*x - 1)", "2*x + 1"), eq(s, L("(4*x^2 - 1)/(2*x - 1)", "1/2"), L("2*x + 1", "1/2"), final=True)], "incomplete", ev(X("2"), {}), tags=["not-evaluated"])
    # ============================================================ D. combinatorics -> probability
    PRN = {"PR": "P(two red)"}
    s = St("plain")
    addn(CAT, "draw-two-red", bprob("probability", "finite", dict(favourable=10, total=28), ["equiprobable"]),
         [nline(s, "PR", "C(5,2)/C(8,2)", "10/28", "5/14", final=True, names=PRN)], "verified", env={"PR": Gc(F(5, 14))}, goal=R(F(5, 14)), tags=["valid", "combinatorics-to-probability"])
    s = St("unicode")
    addn(CAT, "err-draw-denominator", bprob("probability", "finite", dict(favourable=10, total=28), ["equiprobable"]),
         [nline(s, "PR", "C(5,2)/8^2", "10/64", "5/32", final=True, names=PRN)], "invalid", env={"PR": Gc(F(5, 14))}, goal=R(F(5, 14)), tags=["wrong-denominator"])
    s = St("implicit")
    addn(CAT, "draw-sequential-alt", bprob("probability", "finite", dict(favourable=10, total=28), ["equiprobable", "without-replacement"]),
         [nline(s, "PR", "(5/8)*(4/7)", "20/56", "5/14", final=True, names=PRN)], "verified", env={"PR": Gc(F(5, 14))}, goal=R(F(5, 14)), alt=True, tags=["valid", "alternative", "combinatorics-to-probability"])
    s = St("latex")
    addn(CAT, "hypergeometric-one-red", bprob("probability", "finite", dict(favourable=15, total=28), ["equiprobable"]),
         [nline(s, "P1", "C(5,1)*C(3,1)/C(8,2)", "15/28", final=True, names={"P1": "P(exactly one red)"})], "verified", env={"P1": Gc(F(15, 28))}, goal=R(F(15, 28)), tags=["valid", "latex"])
    s = St("plain")
    addn(CAT, "binomial-pmf-independent", bprob("distribution", "binomial-pmf", dict(n=4, k=2, p="1/2")),
         [assume("The four tosses are independent.", "independent"), nline(s, "PX", "C(4,2)*(1/2)^2*(1/2)^2", "6/16", "3/8", req=["independent"], final=True, names={"PX": "P(X = 2)"})], "verified", env={"PX": Gc(F(3, 8))}, goal=R(F(3, 8)), tags=["valid", "stated-assumption"])
    s = St("unicode")
    addn(CAT, "binomial-pmf-no-independence", bprob("distribution", "binomial-pmf", dict(n=4, k=2, p="1/2")),
         [nline(s, "PX", "C(4,2)*(1/2)^2*(1/2)^2", "3/8", req=["independent"], final=True, names={"PX": "P(X = 2)"})], "missing-assumption", env={"PX": Gc(F(3, 8))}, goal=R(F(3, 8)), tags=["missing-assumption", "independence"])
    s = St("implicit")
    addn(CAT, "conditional-from-counts", bprob("probability", "conditional", dict(nab=6, nb=10)),
         [nline(s, "PAgB", "6/10", "3/5", final=True)], "verified", env={"PAgB": Gc(F(3, 5))}, goal=R(F(3, 5)), tags=["valid"])
    s = St("plain")
    addn(CAT, "err-conditional-wrong-base", bprob("probability", "conditional", dict(nab=6, nb=10, n=20)),
         [nline(s, "PAgB", "6/20", "3/10", final=True)], "invalid", env={"PAgB": Gc(F(3, 5))}, goal=R(F(3, 5)), tags=["wrong-denominator"])
    s = St("unicode")
    addn(CAT, "at-least-one-six", bprob("probability", "complement", dict(n=3, p="1/6")),
         [assume("The three rolls are independent and the die is fair.", "independent"), nline(s, "PS", "1 - (5/6)^3", "1 - 125/216", "91/216", req=["independent"], final=True, names={"PS": "P(at least one six)"})], "verified", env={"PS": Gc(F(91, 216))}, goal=R(F(91, 216)), alt=True, tags=["valid", "alternative", "stated-assumption"])
    s = St("plain")
    addn(CAT, "incomplete-at-least-one-six", bprob("probability", "complement", dict(n=3, p="1/6")),
         [assume("The three rolls are independent.", "independent"), nline(s, "PS", "1 - (5/6)^3", req=["independent"], final=True, names={"PS": "P(at least one six)"})], "incomplete", env={"PS": Gc(F(91, 216))}, goal=R(F(91, 216)), tags=["not-evaluated"])
    # ============================================================ E. complex -> polynomial
    cp = lambda task, data, asm=(), dom="complex": _cx.cxprob("polynomial", task, data, asm, dom)
    s = St("unicode")
    addn(CAT, "modulus-of-root", cp("verify-root", dict(coefficients=["1", "-6", "25"], root=_cx.cxv(3, 4)), ["real-coefficients"]),
         [nline(s, "mod(3 + 4*i)", "sqrt(9 + 16)", "sqrt(25)", "5", final=True)], "verified", env={}, goal=R(5), tags=["valid", "complex-to-polynomial"])
    s = St("plain")
    addn(CAT, "vieta-sum-from-roots", cp("vieta-sum", dict(coefficients=["1", "-6", "25"])),
         [nline(s, "(3 + 4*i) + (3 - 4*i)", "-(-6)/1", "6", final=True)], "verified", env={}, goal=R(6), tags=["valid", "complex-to-polynomial"])
    s = St("implicit")
    addn(CAT, "vieta-product-from-roots", cp("vieta-product", dict(coefficients=["1", "-6", "25"])),
         [nline(s, "(3 + 4*i)*(3 - 4*i)", "9 - 16*i^2", "9 + 16", "25/1", "25", final=True)], "verified", env={}, goal=R(25), tags=["valid", "complex-to-polynomial"])
    s = St("plain")
    addn(CAT, "err-vieta-product-i-squared", cp("vieta-product", dict(coefficients=["1", "-6", "25"])),
         [nline(s, "(3 + 4*i)*(3 - 4*i)", "9 - 16*i^2", "9 - 16", "-7", final=True)], "invalid", env={}, goal=R(25), tags=["incorrect-i-squared"])
    s = St("latex")
    addn(CAT, "verify-root-one-plus-i", cp("verify-root", dict(coefficients=["1", "-2", "2"], root=_cx.cxv(1, 1)), ["real-coefficients"]),
         [nline(s, "(1 + i)^2 - 2*(1 + i) + 2", "2*i - 2 - 2*i + 2", "0", final=True)], "verified", env={}, goal=R(0), tags=["valid", "latex"])
    s = St("unicode")
    addn(CAT, "err-verify-root-one-plus-i", cp("verify-root", dict(coefficients=["1", "-2", "2"], root=_cx.cxv(1, 1)), ["real-coefficients"]),
         [nline(s, "(1 + i)^2 - 2*(1 + i) + 2", "2 - 2 - 2*i + 2", "2 - 2*i")], "invalid", env={}, goal=R(0), tags=["incorrect-i-squared"])
    # ============================================================ F. adversarial cross-domain probes
    s = St("unicode")
    addn(CAT, "forged-imported-value", bprob("probability", "complement", dict(pa="1/2")),
         [ndef(s, "PA", "1/3", restate=True), nline(s, "PAc", "1 - PA", "2/3", final=True)], "invalid", env={"PA": Gc(F(1, 2)), "PAc": Gc(F(1, 2))}, goal=R(F(1, 2)), first_ok=[0], tags=["forged-dependency", "wrong-binding"])
    add(CAT, "wrong-symbol-binding", dict(domain="calculus", task="derivative", expression=to_expr(X("t^2")), variable="t"),
        [("f(t) = t^2", dict(k="prose")), ("d/dx t^2 = 2t", dict(k="prose"))], "invalid", ref_override=("invalid", 1, "the problem differentiates with respect to t; the working differentiates with respect to x, so the symbol binding is wrong and the claimed result does not follow"), first_ok=[1], tags=["wrong-binding"])
    add(CAT, "ambiguous-product-derivative", dict(domain="calculus", task="derivative", expression=to_expr(X("x*x")), variable="x"),
        [("d/dx(x y) = y", dict(k="prose"))], "ambiguous", ref_override=("ambiguous", None, "y is not defined; it may be a constant or a function of x, so d/dx(xy) cannot be assessed"), tags=["ambiguous"], scope="ambiguous")
    add(CAT, "ambiguous-log-base", iprob("1/x"),
        [("∫ 1/x dx = log x + C", dict(k="prose"))], "ambiguous", ref_override=("ambiguous", None, "log x may denote the natural or the base-10 logarithm; only the natural logarithm is an antiderivative"), tags=["ambiguous", "notation"], scope="ambiguous")
    add(CAT, "unsupported-sine-integral", iprob("sin(x)/x"),
        [("∫ sin(x)/x dx = Si(x) + C", dict(k="prose"))], "unsupported", ref_override=("unsupported", None, "the sine integral is a non-elementary antiderivative outside the supported calculus family"), tags=["out-of-scope"], scope="out-of-scope")
    add(CAT, "resource-huge-exponent", dprob("x^100000"),
        [("d/dx x^100000 = 100000 x^99999", dict(k="prose"))], "unsupported", ref_override=("unsupported", None, "the exponent exceeds the verifier's resource budget; a bounded engine must fail closed rather than assess it"), tags=["resource"], scope="out-of-scope")
