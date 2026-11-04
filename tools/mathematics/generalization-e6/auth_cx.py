from kit import *
CAT = "complex-polynomial"
C_ = lambda a, b=0: (EO.G(F(a), F(b)) if False else EO.G(F(a), F(b)), "complex")
def Gc(a, b=0): return EO.G(F(a), F(b))
def CG(a, b=0): return (Gc(a, b), "complex")
def RG(a): return (Gc(a), "real")
def SG(v): return (v, "surd")

def build():
    S = lambda m: St(m)
    z, w = "z", "w"
    nm = {"z": "z", "w": "w", "zc": "conj(z)"}
    # ------------------------------------------------ arithmetic (valid)
    s = S("plain")
    addn(CAT, "multiply-binomials", cxprob("arithmetic", "multiply", dict(a=cxv(3, 2), b=cxv(1, -4))),
         [nline(s, "(3 + 2*i)*(1 - 4*i)", "3 - 12*i + 2*i - 8*i^2", "3 - 10*i + 8", "11 - 10*i", final=True, canon="complex")], "verified", env={}, goal=CG(11, -10), tags=["valid"])
    s = S("unicode")
    addn(CAT, "divide-by-conjugate", cxprob("arithmetic", "divide", dict(a=cxv(5, 1), b=cxv(2, 3))),
         [nline(s, "(5 + i)/(2 + 3*i)", "((5 + i)*(2 - 3*i))/((2 + 3*i)*(2 - 3*i))", "(10 - 15*i + 2*i - 3*i^2)/(4 + 9)", "(13 - 13*i)/13", "1 - i", final=True, canon="complex")], "verified", env={}, goal=CG(1, -1), tags=["valid", "conjugate"])
    s = S("latex")
    addn(CAT, "subtract-complex", cxprob("arithmetic", "subtract", dict(a=cxv(7, -2), b=cxv(4, 5))),
         [nline(s, "(7 - 2*i) - (4 + 5*i)", "7 - 4 - 2*i - 5*i", "3 - 7*i", final=True, canon="complex")], "verified", env={}, goal=CG(3, -7), tags=["valid", "latex"])
    s = S("implicit")
    addn(CAT, "power-of-i", cxprob("arithmetic", "power-i", dict(exponent=27)),
         [nline(s, "i^27", "(i^4)^6*i^3", "1^6*(-i)", "-i", final=True, canon="complex")], "verified", env={}, goal=CG(0, -1), tags=["valid"])
    s = S("unicode")
    addn(CAT, "modulus-345", cxprob("arithmetic", "modulus", dict(z=cxv(-3, 4))),
         [nline(s, "mod(-3 + 4*i)", "sqrt((-3)^2 + 4^2)", "sqrt(25)", "5", final=True, canon="real")], "verified", env={}, goal=RG(5), tags=["valid"])
    s = S("plain")
    addn(CAT, "modulus-square-product", cxprob("arithmetic", "modulus-square", dict(z=cxv(2, -5))),
         [nline(s, "(2 - 5*i)*conj(2 - 5*i)", "(2 - 5*i)*(2 + 5*i)", "4 + 25", "29", final=True, canon="real")], "verified", env={}, goal=RG(29), tags=["valid"])
    s = S("implicit")
    addn(CAT, "reciprocal-surd-free", cxprob("arithmetic", "reciprocal", dict(z=cxv(3, -4))),
         [nline(s, "1/(3 - 4*i)", "(3 + 4*i)/((3 - 4*i)*(3 + 4*i))", "(3 + 4*i)/25", "3/25 + (4/25)*i", final=True, canon="complex")], "verified", env={}, goal=CG(F(3, 25), F(4, 25)), tags=["valid"])
    s = S("unicode")
    addn(CAT, "conjugate-of-sum", cxprob("arithmetic", "conjugate", dict(z=cxv(2, 3), w=cxv(-1, 5))),
         [nline(s, "conj((2 + 3*i) + (-1 + 5*i))", "conj(1 + 8*i)", "1 - 8*i", final=True, canon="complex")], "verified", env={}, goal=CG(1, -8), tags=["valid"])
    s = S("plain")
    addn(CAT, "conjugate-product-alt", cxprob("arithmetic", "multiply", dict(a=cxv(1, 2), b=cxv(3, -1))),
         [nline(s, "conj((1 + 2*i)*(3 - i))", "conj(1 + 2*i)*conj(3 - i)", "(1 - 2*i)*(3 + i)", "3 + i - 6*i - 2*i^2", "5 - 5*i", final=True, canon="complex")], "verified", env={}, goal=CG(5, -5), alt=True, tags=["valid", "alternative"])
    s = S("latex")
    addn(CAT, "square-complex", cxprob("arithmetic", "multiply", dict(a=cxv(2, 3), b=cxv(2, 3))),
         [nline(s, "(2 + 3*i)^2", "4 + 12*i + 9*i^2", "-5 + 12*i", final=True, canon="complex")], "verified", env={}, goal=CG(-5, 12), tags=["valid", "latex"])
    # ------------------------------------------------ polynomial (valid)
    s = S("plain")
    addn(CAT, "verify-root-quadratic", cxprob("polynomial", "verify-root", dict(coefficients=["1", "-2", "5"], root=cxv(1, 2)), ["real-coefficients"], "complex"),
         [nline(s, "(1 + 2*i)^2 - 2*(1 + 2*i) + 5", "(1 + 4*i - 4) - 2 - 4*i + 5", "0", final=True)], "verified", env={}, goal=RG(0), tags=["valid"])
    s = S("unicode")
    addn(CAT, "remainder-by-evaluation", cxprob("polynomial", "remainder", dict(coefficients=["2", "-3", "0", "5"], divisor_root="2"), [], "real"),
         [nline(s, "2*2^3 - 3*2^2 + 5", "16 - 12 + 5", "9", final=True)], "verified", env={}, goal=RG(9), tags=["valid", "remainder-theorem"])
    s = S("implicit")
    addn(CAT, "factor-theorem-cubic", cxprob("polynomial", "factor-theorem", dict(coefficients=["1", "-6", "11", "-6"], root="3"), [], "real"),
         [nline(s, "3^3 - 6*3^2 + 11*3 - 6", "27 - 54 + 33 - 6", "0", final=True)], "verified", env={}, goal=RG(0), tags=["valid"])
    s = S("plain")
    addn(CAT, "vieta-sum-quartic", cxprob("polynomial", "vieta-sum", dict(coefficients=["2", "-10", "3", "1", "7"]), [], "complex"),
         [nline(s, "r", "-(-10)/2", "5", final=True, names={"r": "sum of roots"})], "verified", env={"r": Gc(5)}, goal=RG(5), tags=["valid"])
    s = S("unicode")
    addn(CAT, "vieta-product-cubic", cxprob("polynomial", "vieta-product", dict(coefficients=["3", "0", "-5", "12"]), [], "complex"),
         [nline(s, "q", "-12/3", "-4", final=True, names={"q": "product of roots"})], "verified", env={"q": Gc(-4)}, goal=RG(-4), tags=["valid"])
    s = S("latex")
    addn(CAT, "quadratic-roots-negative-disc", cxprob("polynomial", "quadratic-roots", dict(coefficients=["1", "4", "13"]), [], "complex"),
         [ndef(s, "D", "4^2 - 4*1*13", names={}), nline(s, "D", "16 - 52", "-36", names={}), nline(s, "(-4 + sqrt(-36))/2", "(-4 + 6*i)/2", "-2 + 3*i", final=True, canon="complex", names={})], "verified", env={}, goal=CG(-2, 3), tags=["valid"])
    s = S("implicit")
    addn(CAT, "conjugate-root-theorem", cxprob("polynomial", "conjugate-root", dict(coefficients=["1", "-6", "13"], root=cxv(3, 2)), ["real-coefficients"], "real"),
         [assume("The coefficients of p are real.", "real-coefficients"), nline(s, "conj(3 + 2*i)", "3 - 2*i", req=["real-coefficients"], final=True, canon="complex")], "verified", env={}, goal=CG(3, -2), tags=["valid", "stated-assumption"])
    s = S("plain")
    addn(CAT, "verify-second-root", cxprob("polynomial", "verify-root", dict(coefficients=["1", "-2", "5"], root=cxv(1, -2)), ["real-coefficients"], "complex"),
         [nline(s, "(1 - 2*i)^2 - 2*(1 - 2*i) + 5", "1 - 4*i - 4 - 2 + 4*i + 5", "0", final=True)], "verified", env={}, goal=RG(0), tags=["valid"])
    s = S("unicode")
    addn(CAT, "cubic-value-synthetic-alt", cxprob("polynomial", "remainder", dict(coefficients=["1", "0", "-7", "6"], divisor_root="2"), [], "real"),
         [nline(s, "2^3 - 7*2 + 6", "8 - 14 + 6", "0", final=True)], "verified", env={}, goal=RG(0), alt=True, tags=["valid", "alternative"])
    # ------------------------------------------------ geometry / polar
    s = S("plain")
    addn(CAT, "distance-in-plane", cxprob("geometry", "distance", dict(a=cxv(1, 2), b=cxv(7, 10))),
         [nline(s, "mod((7 + 10*i) - (1 + 2*i))", "mod(6 + 8*i)", "sqrt(36 + 64)", "sqrt(100)", "10", final=True)], "verified", env={}, goal=RG(10), tags=["valid"])
    s = S("unicode")
    addn(CAT, "rotate-quarter-turn", cxprob("geometry", "rotate-quarter", dict(z=cxv(3, 5))),
         [nline(s, "i*(3 + 5*i)", "3*i + 5*i^2", "-5 + 3*i", final=True, canon="complex")], "verified", env={}, goal=CG(-5, 3), tags=["valid"])
    s = S("implicit")
    addn(CAT, "reflect-real-axis", cxprob("geometry", "reflect", dict(z=cxv(-4, 7))),
         [nline(s, "conj(-4 + 7*i)", "-4 - 7*i", final=True, canon="complex")], "verified", env={}, goal=CG(-4, -7), tags=["valid"])
    s = S("plain")
    addn(CAT, "translate-point", cxprob("geometry", "translate", dict(z=cxv(2, -3), shift=cxv(-5, 4))),
         [nline(s, "(2 - 3*i) + (-5 + 4*i)", "-3 + i", final=True, canon="complex")], "verified", env={}, goal=CG(-3, 1), tags=["valid"])
    s = S("unicode")
    addn(CAT, "fourth-root-of-unity-check", cxprob("polynomial", "roots-of-unity", dict(n=4, root=cxv(0, 1))),
         [nline(s, "i^4", "(i^2)^2", "(-1)^2", "1", final=True)], "verified", env={}, goal=RG(1), tags=["valid"])
    s = S("latex")
    addn(CAT, "de-moivre-small-power", cxprob("polar", "de-moivre", dict(z=cxv(1, 1), n=4)),
         [nline(s, "(1 + i)^4", "((1 + i)^2)^2", "(2*i)^2", "-4", final=True)], "verified", env={}, goal=RG(-4), alt=True, tags=["valid", "alternative"])
    # ------------------------------------------------ invalid
    s = S("plain")
    addn(CAT, "err-i-squared-plus", cxprob("arithmetic", "multiply", dict(a=cxv(3, 2), b=cxv(1, -4))),
         [nline(s, "(3 + 2*i)*(1 - 4*i)", "3 - 12*i + 2*i - 8*i^2", "3 - 10*i - 8", "-5 - 10*i", final=True, canon="complex")], "invalid", env={}, goal=CG(11, -10), tags=["incorrect-i-squared"])
    s = S("unicode")
    addn(CAT, "err-wrong-conjugate", cxprob("arithmetic", "conjugate", dict(z=cxv(2, 3), w=cxv(-1, 5))),
         [nline(s, "conj((2 + 3*i) + (-1 + 5*i))", "conj(1 + 8*i)", "-1 + 8*i", final=True, canon="complex")], "invalid", env={}, goal=CG(1, -8), tags=["incorrect-conjugation"])
    s = S("implicit")
    addn(CAT, "err-divide-wrong-multiplier", cxprob("arithmetic", "divide", dict(a=cxv(5, 1), b=cxv(2, 3))),
         [nline(s, "(5 + i)/(2 + 3*i)", "((5 + i)*(2 + 3*i))/((2 + 3*i)*(2 + 3*i))", "(7 + 17*i)/(-5 + 12*i)", "(7 + 17*i)/13", final=True, canon="complex")], "invalid", env={}, goal=CG(1, -1), tags=["incorrect-conjugation"])
    s = S("plain")
    addn(CAT, "err-modulus-no-root", cxprob("arithmetic", "modulus", dict(z=cxv(-3, 4))),
         [nline(s, "mod(-3 + 4*i)", "(-3)^2 + 4^2", "25", final=True)], "invalid", env={}, goal=RG(5), tags=["wrong-formula"])
    s = S("unicode")
    addn(CAT, "err-vieta-sign", cxprob("polynomial", "vieta-sum", dict(coefficients=["2", "-10", "3", "1", "7"]), [], "complex"),
         [nline(s, "r", "(-10)/2", "-5", final=True, names={"r": "sum of roots"})], "invalid", env={"r": Gc(5)}, goal=RG(5), tags=["wrong-formula"])
    s = S("latex")
    addn(CAT, "err-root-check-slip", cxprob("polynomial", "verify-root", dict(coefficients=["1", "-2", "5"], root=cxv(1, 2)), ["real-coefficients"], "complex"),
         [nline(s, "(1 + 2*i)^2 - 2*(1 + 2*i) + 5", "(1 + 4*i + 4) - 2 - 4*i + 5", "12", final=True)], "invalid", env={}, goal=RG(0), tags=["incorrect-i-squared"])
    s = S("plain")
    addn(CAT, "err-quadratic-disc", cxprob("polynomial", "quadratic-roots", dict(coefficients=["1", "4", "13"]), [], "complex"),
         [ndef(s, "D", "4^2 - 4*1*13", names={}), nline(s, "D", "16 + 52", "68", names={}), nline(s, "(-4 + sqrt(68))/2", "(-4 + 2*sqrt(17))/2", final=True, canon="surd", names={})], "invalid", env={}, goal=CG(-2, 3), tags=["wrong-formula"])
    s = S("unicode")
    addn(CAT, "final-ok-after-bad-power", cxprob("arithmetic", "power-i", dict(exponent=27)),
         [nline(s, "i^27", "(i^4)^6*i^3", "i^6*i^3", "1"), nline(s, "i^27", "-i", final=True, canon="complex")], "invalid", env={}, goal=CG(0, -1), first_ok=[1], tags=["correct-final-after-error"])
    s = S("implicit")
    addn(CAT, "err-distance-no-square", cxprob("geometry", "distance", dict(a=cxv(1, 2), b=cxv(7, 10))),
         [nline(s, "mod((7 + 10*i) - (1 + 2*i))", "mod(6 + 8*i)", "sqrt(6 + 8)", "sqrt(14)", final=True, canon="surd")], "invalid", env={}, goal=RG(10), tags=["wrong-formula"])
    s = S("plain")
    addn(CAT, "err-missing-root-quadratic", cxprob("polynomial", "quadratic-roots", dict(coefficients=["1", "-5", "6"]), [], "complex"),
         [nline(s, "(5 + 1)/2", "3", final=True, names={})], "incomplete", env={"x": Gc(3)}, goal=RG(3), ref_override=("incomplete", None, "only one of the two roots 2 and 3 is reported; the root set is incomplete"), tags=["missing-root"])
    # ------------------------------------------------ missing assumption
    s = S("unicode")
    addn(CAT, "missing-real-coeffs-conjugate-root", cxprob("polynomial", "conjugate-root", dict(coefficients=["1", "-6", "13"], root=cxv(3, 2)), [], "complex"),
         [nline(s, "conj(3 + 2*i)", "3 - 2*i", req=["real-coefficients"], final=True, canon="complex")], "missing-assumption", env={}, goal=CG(3, -2), tags=["missing-assumption", "real-coefficients"])
    s = S("implicit")
    addn(CAT, "missing-real-coeffs-second", cxprob("polynomial", "conjugate-root", dict(coefficients=["1", "-4", "29"], root=cxv(2, 5)), [], "complex"),
         [nline(s, "conj(2 + 5*i)", "2 - 5*i", req=["real-coefficients"], final=True, canon="complex")], "missing-assumption", env={}, goal=CG(2, -5), tags=["missing-assumption", "real-coefficients"])
    s = S("unicode")
    addn(CAT, "err-reflect-imaginary-axis", cxprob("geometry", "reflect", dict(z=cxv(3, 2), axis="imaginary")),
         [nline(s, "-conj(3 + 2*i)", "conj(3 + 2*i)", "3 - 2*i", final=True, canon="complex")], "invalid", env={}, goal=CG(-3, 2), tags=["incorrect-conjugation"])
    s = S("plain")
    addn(CAT, "factor-theorem-complex-root", cxprob("polynomial", "factor-theorem", dict(coefficients=["1", "2", "1", "2"], root=cxv(0, 1)), [], "complex"),
         [nline(s, "i^3 + 2*i^2 + i + 2", "-i - 2 + i + 2", "0", final=True)], "verified", env={}, goal=RG(0), tags=["valid"])
    # ------------------------------------------------ incomplete
    s = S("unicode")
    addn(CAT, "incomplete-expression-left", cxprob("arithmetic", "multiply", dict(a=cxv(3, 2), b=cxv(1, -4))),
         [nline(s, "(3 + 2*i)*(1 - 4*i)", "3 - 12*i + 2*i - 8*i^2", final=True, canon="complex")], "incomplete", env={}, goal=CG(11, -10), tags=["not-evaluated"])
    s = S("plain")
    addn(CAT, "incomplete-prose-only-vieta", cxprob("polynomial", "vieta-product", dict(coefficients=["3", "0", "-5", "12"]), [], "complex"),
         [prose("Use Vieta's formulas on the cubic")], "incomplete", env={}, goal=RG(-4), tags=["prose-only"])
    s = S("implicit")
    addn(CAT, "incomplete-unrationalised-quotient", cxprob("arithmetic", "divide", dict(a=cxv(5, 1), b=cxv(2, 3))),
         [nline(s, "(5 + i)/(2 + 3*i)", "((5 + i)*(2 - 3*i))/13", final=True, canon="complex")], "incomplete", env={}, goal=CG(1, -1), tags=["not-evaluated"])
    # ------------------------------------------------ unsupported / ambiguous
    add(CAT, "unsupported-complex-log", cxprob("arithmetic", "complex-log", dict(z=cxv(0, 1))),
        [("Log(i) = i*pi/2", dict(k="prose"))], "unsupported", ref_override=("unsupported", None, "general complex logarithms are outside B3"), tags=["out-of-scope"], scope="out-of-scope")
    add(CAT, "unsupported-quintic-roots", cxprob("polynomial", "solve", dict(coefficients=["1", "0", "0", "1", "-1", "3"])),
        [("The roots of x^5 + x^2 - x + 3 are found by radicals.", dict(k="prose"))], "unsupported", ref_override=("unsupported", None, "unrestricted symbolic root solving is outside B3"), tags=["out-of-scope"], scope="out-of-scope")
    add(CAT, "ambiguous-sqrt-branch", cxprob("arithmetic", "principal-argument", dict(z=cxv(-4, 0))),
        [("sqrt(-4) = +-2i", dict(k="prose"))], "ambiguous", ref_override=("ambiguous", None, "the principal square root is 2i; the +- form conflates the two roots of z^2 = -4 with a function value"), tags=["ambiguous"], scope="ambiguous")
