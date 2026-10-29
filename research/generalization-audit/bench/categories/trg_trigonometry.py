"""TRG: Trigonometric reasoning.

All angles are in radians unless a case is explicitly about degree notation. Labels are derived by hand from the standard
identities and the natural domains of tan/sec (cos != 0) and cot/csc (sin != 0). Trig equations are posed on bounded
intervals (via assumptions) so that solution sets are finite; unrestricted periodic solution sets are avoided except where a
case is explicitly about that (marked and justified).
"""
from schema import T, W

C = "TRG"
ID = "identity transition (same function, same domain)"
FI = "rejecting a false identity by an exact counterexample"
DP = "natural-domain preservation with trig poles"
SSI = "solution-set preservation on a bounded interval"
I2 = ["0 <= x", "x < 2*pi"]


def te(principle, invariant, prev, nxt, rel, why, **kw):
    kw.setdefault("domain", "trigonometry")
    return T(C, principle, invariant, prev, nxt, "expression", rel, why=why, **kw)


def ts(principle, invariant, prev, nxt, rel, why, **kw):
    kw.setdefault("domain", "trigonometry")
    return T(C, principle, invariant, prev, nxt, "statement", rel, why=why, **kw)


def wk(*a, **kw):
    kw.setdefault("domain", "trigonometry")
    return W(C, *a, **kw)


# =====================================================================================================================
# 1. Pythagorean identities
# =====================================================================================================================
te("sin^2 + cos^2 = 1", ID, "sin(x)^2+cos(x)^2", "1", "valid-equivalence", difficulty="easy", why="Pythagorean identity, both defined on R")
te("sin^2 + cos^2 = 1 (unbracketed power notation)", ID, "sin^2 x+cos^2 x", "1", "valid-equivalence", difficulty="easy",
   notation="unfamiliar", oracle_prev="sin(x)^2+cos(x)^2", oracle_next="1", why="sin^2 x means (sin x)^2")
te("1 - sin^2 = cos^2", ID, "1-sin(x)^2", "cos(x)^2", "valid-equivalence", difficulty="easy", why="rearranged Pythagorean identity",
   pair="trg-pyth-a")
te("cos^2 is not 1 + sin^2", FI, "cos(x)^2", "1+sin(x)^2", "invalid", difficulty="easy",
   why="at x=pi/2: 0 vs 2 (sign error in rearranging)", pair="trg-pyth-a")
te("sin^2 = 1 - cos^2", ID, "sin(x)^2", "1-cos(x)^2", "valid-equivalence", difficulty="easy", why="rearranged Pythagorean identity")
te("(1-cos x)(1+cos x) = sin^2 x", ID, "(1-cos(x))(1+cos(x))", "sin(x)^2", "valid-equivalence",
   why="difference of squares then Pythagoras")
te("1 + tan^2 = sec^2 (same poles)", ID, "1+tan(x)^2", "sec(x)^2", "valid-equivalence", why="both undefined exactly where cos x = 0",
   pair="trg-pyth-b")
te("sec^2 is not 1 - tan^2", FI, "sec(x)^2", "1-tan(x)^2", "invalid", why="at x=pi/4: 2 vs 0", pair="trg-pyth-b")
te("sec^2 - tan^2 = 1 removes poles", DP, "sec(x)^2-tan(x)^2", "1", "domain-violation",
   why="prev undefined where cos x = 0; 1 is defined everywhere", pair="trg-pyth-b")
te("1 + cot^2 = csc^2", ID, "cot(x)^2+1", "csc(x)^2", "valid-equivalence", why="divide sin^2+cos^2=1 by sin^2; same poles",
   pair="trg-pyth-c")
te("1 + cot^2 is not sec^2", FI, "cot(x)^2+1", "sec(x)^2", "invalid", why="at x=pi/3: cot^2+1 = 4/3 but sec^2 = 4",
   pair="trg-pyth-c")
te("csc^2 - cot^2 = 1 removes poles", DP, "csc(x)^2-cot(x)^2", "1", "domain-violation", why="prev undefined at multiples of pi",
   pair="trg-pyth-c")
te("sqrt(1 - sin^2 x) = |cos x|", "even root of a square of a trig function", "sqrt(1-sin(x)^2)", "|cos(x)|", "valid-equivalence",
   why="1 - sin^2 = cos^2 and sqrt(cos^2) = |cos|", pair="trg-pyth-d")
te("sqrt(1 - sin^2 x) is not cos x", "even root of a square of a trig function", "sqrt(1-sin(x)^2)", "cos(x)", "invalid",
   why="at x=pi: 1 vs -1", pair="trg-pyth-d")
te("sec x - cos x = sin x tan x", ID, "sec(x)-cos(x)", "sin(x)tan(x)", "valid-equivalence", complexity=2,
   why="(1-cos^2)/cos = sin^2/cos; both undefined exactly where cos x = 0")
te("(sin x + cos x)^2 = 1 + sin 2x", ID, "(sin(x)+cos(x))^2", "1+sin(2x)", "valid-equivalence", complexity=2,
   why="sin^2+cos^2+2 sin cos", pair="trg-sq")
te("(sin x + cos x)^2 is not 1 (cross term forgotten)", FI, "(sin(x)+cos(x))^2", "1", "invalid", why="at x=pi/4: 2 vs 1",
   pair="trg-sq")

# =====================================================================================================================
# 2. Double angle
# =====================================================================================================================
te("sin 2x = 2 sin x cos x", ID, "sin(2x)", "2sin(x)cos(x)", "valid-equivalence", difficulty="easy", why="double-angle formula",
   pair="trg-dbl-sin")
te("sin 2x is not 2 sin x", FI, "sin(2x)", "2sin(x)", "invalid", difficulty="easy", why="at x=pi/2: 0 vs 2", pair="trg-dbl-sin")
te("sin 2x is not sin x cos x (factor 2 dropped)", FI, "sin(2x)", "sin(x)cos(x)", "invalid", why="at x=pi/4: 1 vs 1/2",
   pair="trg-dbl-sin")
te("sin x cos x = sin(2x)/2", ID, "sin(x)cos(x)", "sin(2x)/2", "valid-equivalence", why="halved double-angle formula", pair="trg-dbl-sin")
te("cos 2x = 1 - 2 sin^2 x", ID, "cos(2x)", "1-2sin(x)^2", "valid-equivalence", difficulty="easy", why="double angle", pair="trg-dbl-cos")
te("cos 2x = cos^2 x - sin^2 x", ID, "cos(2x)", "cos(x)^2-sin(x)^2", "valid-equivalence", difficulty="easy", why="double angle",
   pair="trg-dbl-cos")
te("cos 2x is not 2cos^2 x + 1", FI, "cos(2x)", "2cos(x)^2+1", "invalid", why="at x=0: 1 vs 3 (should be 2cos^2 x - 1)",
   pair="trg-dbl-cos")
te("cos 2x is not 2 cos x", FI, "cos(2x)", "2cos(x)", "invalid", difficulty="easy", why="at x=0: 1 vs 2", pair="trg-dbl-cos")
te("tan 2x is not 2 tan x", FI, "tan(2x)", "2tan(x)", "invalid", why="at x=pi/8: 1 vs 2tan(pi/8) = 2(sqrt 2 - 1)")
te("tan 2x as a rational function of tan x loses x = pi/2", DP, "tan(2x)", "2tan(x)/(1-tan(x)^2)", "invalid", difficulty="hard",
   why="tan(2 * pi/2) = tan(pi) = 0 is defined but tan(pi/2) is not", pair="trg-dbl-tan")
te("the rational form in tan x collapses to tan 2x with widening", DP, "2tan(x)/(1-tan(x)^2)", "tan(2x)", "domain-violation",
   difficulty="hard", why="equal where the left side is defined; tan 2x is defined at x = pi/2 where tan x is not", pair="trg-dbl-tan")
te("sin^2 x = (1 - cos 2x)/2", "power-reduction", "sin(x)^2", "(1-cos(2x))/2", "valid-equivalence", why="from cos 2x = 1 - 2sin^2 x",
   pair="trg-pr")
te("sin^2 x is not (1 + cos 2x)/2", FI, "sin(x)^2", "(1+cos(2x))/2", "invalid", why="at x=0: 0 vs 1 (that is cos^2 x)", pair="trg-pr")
te("2 sin^2 x = 1 - cos 2x", "power-reduction", "2sin(x)^2", "1-cos(2x)", "valid-equivalence", why="double angle", pair="trg-pr")
te("cos^2 x = (1 + cos 2x)/2", "power-reduction", "cos(x)^2", "(1+cos(2x))/2", "valid-equivalence", why="double angle")
te("cos^4 - sin^4 = cos 2x", "difference of squares then double angle", "cos(x)^4-sin(x)^4", "cos(2x)", "valid-equivalence",
   complexity=2, composition=True, why="(cos^2 - sin^2)(cos^2 + sin^2)", pair="trg-4th")
te("sin^4 - cos^4 = -cos 2x", "difference of squares then double angle", "sin(x)^4-cos(x)^4", "-cos(2x)", "valid-equivalence",
   complexity=2, composition=True, why="(sin^2 - cos^2)(1)", pair="trg-4th")
te("sin^4 - cos^4 is not cos 2x (sign of the factor)", FI, "sin(x)^4-cos(x)^4", "cos(2x)", "invalid", complexity=2,
   why="at x=0: -1 vs 1", pair="trg-4th")
te("sin 3x = 3 sin x - 4 sin^3 x", "triple-angle", "sin(3x)", "3sin(x)-4sin(x)^3", "valid-equivalence", difficulty="hard", complexity=2,
   why="sin(2x+x) expanded with double angles", pair="trg-trip")
te("sin 3x is not 3 sin x", FI, "sin(3x)", "3sin(x)", "invalid", why="at x=pi/2: -1 vs 3", pair="trg-trip")
te("cos 3x = 4 cos^3 x - 3 cos x", "triple-angle", "cos(3x)", "4cos(x)^3-3cos(x)", "valid-equivalence", difficulty="hard",
   complexity=2, why="cos(2x+x) expanded")
te("sin 2x / sin x = 2 cos x removes zeros of sin", DP, "sin(2x)/sin(x)", "2cos(x)", "domain-violation",
   why="prev undefined at multiples of pi, 2cos x is defined there", pair="trg-dbl-div")
te("sin 2x / (2 sin x) = cos x on an interval avoiding zeros of sin", "assumption-aware equivalence", "sin(2x)/(2sin(x))", "cos(x)",
   "valid-equivalence", assumptions=["0 < x", "x < pi"], why="sin x > 0 on (0, pi)", pair="trg-dbl-div")
te("(1 - cos 2x)/sin x = 2 sin x removes zeros of sin", DP, "(1-cos(2x))/sin(x)", "2sin(x)", "domain-violation", complexity=2,
   why="2sin^2 x / sin x; prev undefined where sin x = 0")
te("sin 2x/(1 + cos 2x) = tan x (same poles)", "half-angle tangent", "sin(2x)/(1+cos(2x))", "tan(x)", "valid-equivalence",
   complexity=2, difficulty="hard", why="2sin cos/(2cos^2) = tan x; both undefined exactly where cos x = 0", pair="trg-tanform")
te("(1 - cos 2x)/sin 2x = tan x widens at multiples of pi", DP, "(1-cos(2x))/sin(2x)", "tan(x)", "domain-violation", complexity=2,
   difficulty="hard", why="prev undefined where sin 2x = 0 (includes x = 0, pi); tan is defined there", pair="trg-tanform")
te("tan^2 x = (1 - cos 2x)/(1 + cos 2x)", "power-reduction", "tan(x)^2", "(1-cos(2x))/(1+cos(2x))", "valid-equivalence", complexity=2,
   why="both undefined exactly where cos x = 0 (1 + cos 2x = 2cos^2 x)")

# =====================================================================================================================
# 3. Sum / difference, product-to-sum
# =====================================================================================================================
te("sin(a+b) expansion", ID, "sin(a+b)", "sin(a)cos(b)+cos(a)sin(b)", "valid-equivalence", difficulty="easy", why="addition formula",
   pair="trg-sum-sin")
te("sin(a+b) is not sin a + sin b", FI, "sin(a+b)", "sin(a)+sin(b)", "invalid", difficulty="easy", why="a=b=pi/2: 0 vs 2",
   pair="trg-sum-sin")
te("cos(a-b) expansion", ID, "cos(a-b)", "cos(a)cos(b)+sin(a)sin(b)", "valid-equivalence", why="subtraction formula",
   pair="trg-sum-cos")
te("cos(a-b) sign error", FI, "cos(a-b)", "cos(a)cos(b)-sin(a)sin(b)", "invalid", why="that is cos(a+b); a=b=pi/2 gives 1 vs -1",
   pair="trg-sum-cos")
te("sin x - sin y is not sin(x-y)", FI, "sin(x)-sin(y)", "sin(x-y)", "invalid", why="x=pi/2, y=-pi/2: 2 vs 0", pair="trg-s2p")
te("sum-to-product for sin x - sin y", "sum-to-product", "sin(x)-sin(y)", "2cos((x+y)/2)sin((x-y)/2)", "valid-equivalence",
   difficulty="hard", why="standard sum-to-product identity", pair="trg-s2p")
te("sum-to-product for cos x + cos y", "sum-to-product", "cos(x)+cos(y)", "2cos((x+y)/2)cos((x-y)/2)", "valid-equivalence",
   difficulty="hard", why="standard identity")
te("product-to-sum for sin x cos y", "product-to-sum", "sin(x)cos(y)", "(sin(x+y)+sin(x-y))/2", "valid-equivalence", difficulty="hard",
   why="add the expansions of sin(x+y) and sin(x-y)")
te("harmonic form sin x + cos x", "auxiliary-angle form", "sin(x)+cos(x)", "sqrt(2)sin(x+pi/4)", "valid-equivalence", complexity=2,
   why="sqrt2(sin x cos pi/4 + cos x sin pi/4)", pair="trg-harm")
te("harmonic form with the wrong phase sign", FI, "sin(x)+cos(x)", "sqrt(2)sin(x-pi/4)", "invalid", complexity=2,
   why="at x=pi/4: sqrt2 vs 0", pair="trg-harm")
te("tan(x + pi/4) as a rational function of tan x narrows the domain", DP, "tan(x+pi/4)", "(1+tan(x))/(1-tan(x))", "invalid",
   difficulty="hard", why="at x=pi/2: tan(3pi/4) = -1 is defined but tan(pi/2) is not", pair="trg-tanadd")
te("rational function of tan x collapsed to tan(x + pi/4) widens", DP, "(1+tan(x))/(1-tan(x))", "tan(x+pi/4)", "domain-violation",
   difficulty="hard", why="equal where the left side is defined; the right side is also defined at x = pi/2", pair="trg-tanadd")
te("cos(x+2pi/3) + cos(x-2pi/3) = -cos x", "sum formula with special angles", "cos(x+2pi/3)+cos(x-2pi/3)", "-cos(x)",
   "valid-equivalence", difficulty="hard", complexity=2, why="2cos x cos(2pi/3) = -cos x")
te("cos(a+b) expansion", ID, "cos(a+b)", "cos(a)cos(b)-sin(a)sin(b)", "valid-equivalence", why="addition formula",
   pair="trg-sum-cos")

# =====================================================================================================================
# 4. Cofunction, parity and periodicity
# =====================================================================================================================
te("sin(pi/2 - x) = cos x", "cofunction identity", "sin(pi/2-x)", "cos(x)", "valid-equivalence", difficulty="easy", why="cofunction",
   pair="trg-cof-a")
te("cos(pi/2 - x) = sin x, not -sin x", FI, "cos(pi/2-x)", "-sin(x)", "invalid", why="at x=pi/2: 1 vs -1", pair="trg-cof-a")
te("tan(pi/2 - x) = cot x", "cofunction identity", "tan(pi/2-x)", "cot(x)", "valid-equivalence",
   why="both undefined exactly at multiples of pi")
te("cos(x - pi/2) = sin x", "phase shift", "cos(x-pi/2)", "sin(x)", "valid-equivalence", why="cos is even, then cofunction", pair="trg-cof-b")
te("sin(x - pi/2) is -cos x, not cos x", FI, "sin(x-pi/2)", "cos(x)", "invalid", why="at x=0: -1 vs 1", pair="trg-cof-b")
te("writing sin x as a shifted cosine", "phase shift", "sin(x)", "cos(x-pi/2)", "valid-equivalence", why="as above, reversed", pair="trg-cof-b")
te("sin(pi - x) = sin x", "supplementary angle", "sin(pi-x)", "sin(x)", "valid-equivalence", difficulty="easy", why="reflection",
   pair="trg-supp")
te("cos(pi - x) = -cos x, not cos x", FI, "cos(pi-x)", "cos(x)", "invalid", difficulty="easy", why="at x=0: -1 vs 1", pair="trg-supp")
te("tan(pi - x) = -tan x", "supplementary angle", "tan(pi-x)", "-tan(x)", "valid-equivalence", why="same poles", pair="trg-supp")
te("sin(x + pi) = -sin x", "half-period shift", "sin(x+pi)", "-sin(x)", "valid-equivalence", why="half-turn", pair="trg-per")
te("cos(x + pi) is -cos x, not cos x", FI, "cos(x+pi)", "cos(x)", "invalid", why="at x=0: -1 vs 1", pair="trg-per")
te("tan has period pi", "periodicity", "tan(x+pi)", "tan(x)", "valid-equivalence", why="tan(x+pi) = tan x with the same poles",
   pair="trg-per")
te("sin has period 2 pi", "periodicity", "sin(x+2pi)", "sin(x)", "valid-equivalence", difficulty="easy", why="full turn", pair="trg-per")
te("cos is even", "parity", "cos(-x)", "cos(x)", "valid-equivalence", difficulty="easy", why="cos is even", pair="trg-par")
te("sin is odd, not even", FI, "sin(-x)", "sin(x)", "invalid", difficulty="easy", why="at x=pi/2: -1 vs 1", pair="trg-par")
te("tan is odd", "parity", "tan(-x)", "-tan(x)", "valid-equivalence", why="ratio of odd and even", pair="trg-par")

# =====================================================================================================================
# 5. Half-angle forms
# =====================================================================================================================
te("sin^2(x/2) = (1 - cos x)/2", "half-angle (squared form)", "sin(x/2)^2", "(1-cos(x))/2", "valid-equivalence",
   why="power reduction with angle x/2", pair="trg-half-a")
te("cos^2(x/2) = (1 + cos x)/2", "half-angle (squared form)", "cos(x/2)^2", "(1+cos(x))/2", "valid-equivalence",
   why="power reduction", pair="trg-half-a")
te("cos^2(x/2) is not (1 - cos x)/2", FI, "cos(x/2)^2", "(1-cos(x))/2", "invalid", why="at x=0: 1 vs 0", pair="trg-half-a")
te("half-angle sine without the sign choice", "sign of the half-angle root", "sin(x/2)", "sqrt((1-cos(x))/2)", "invalid",
   why="at x=-pi: sin(-pi/2) = -1 but the root is 1", pair="trg-half-b")
te("half-angle sine on [0, 2pi] where sin(x/2) >= 0", "sign of the half-angle root", "sin(x/2)", "sqrt((1-cos(x))/2)",
   "valid-equivalence", assumptions=["0 <= x", "x <= 2*pi"], difficulty="hard", pair="trg-half-b",
   why="for 0 <= x <= 2pi, x/2 in [0, pi] so sin(x/2) >= 0 and equals the root of sin^2(x/2). Uncertified: the oracle cannot "
       "simplify sqrt of a trig square under an interval assumption")
te("half-angle tangent tan(x/2) = sin x/(1 + cos x) on (-pi, pi)", "half-angle tangent", "tan(x/2)", "sin(x)/(1+cos(x))",
   "valid-equivalence", assumptions=["-pi < x", "x < pi"], difficulty="hard", why="2 sin(x/2)cos(x/2)/(2cos^2(x/2)); cos(x/2) > 0 there",
   pair="trg-half-c")
te("tan(x/2) = (1 - cos x)/sin x narrows at multiples of 2pi", DP, "tan(x/2)", "(1-cos(x))/sin(x)", "invalid", difficulty="hard",
   why="at x=0: tan 0 = 0 is defined but (1-cos 0)/sin 0 is not", pair="trg-half-c")

# =====================================================================================================================
# 6. Reciprocal / quotient identities and their domains
# =====================================================================================================================
te("tan x = sin x / cos x (same poles)", "quotient identity", "tan(x)", "sin(x)/cos(x)", "valid-equivalence", difficulty="easy",
   why="definition of tan; both undefined where cos x = 0", pair="trg-quot")
te("sin x / cos x is tan x, not cot x", FI, "sin(x)/cos(x)", "cot(x)", "invalid", difficulty="easy", why="at x=0: sin/cos = 0 is defined but cot 0 is not; at x=pi/3: sqrt3 vs 1/sqrt3",
   pair="trg-quot")
te("cot x = cos x / sin x", "quotient identity", "cos(x)/sin(x)", "cot(x)", "valid-equivalence", difficulty="easy", why="definition",
   pair="trg-quot")
te("sec x = 1/cos x", "reciprocal identity", "sec(x)", "1/cos(x)", "valid-equivalence", difficulty="easy", why="definition",
   pair="trg-recip")
te("csc x is 1/sin x, not 1/cos x", FI, "csc(x)", "1/cos(x)", "invalid", difficulty="easy", why="at x=0: csc undefined, 1/cos 0 = 1; at x=pi/3: 2/sqrt3 vs 2",
   pair="trg-recip")
te("sin^(-1) as a reciprocal power is csc", "inverse vs reciprocal notation", "sin(x)^(-1)", "csc(x)", "valid-equivalence",
   why="(sin x)^(-1) = 1/sin x", pair="trg-recip")
te("(sin x)^(-1) is not arcsin x", "inverse vs reciprocal notation", "sin(x)^(-1)", "asin(x)", "invalid",
   why="(sin x)^(-1) is defined at x = 2 (1/sin 2) but arcsin 2 is not", pair="trg-recip")
te("arcsin x is not csc x", "inverse vs reciprocal notation", "asin(x)", "csc(x)", "invalid", why="at x=1: pi/2 vs 1/sin 1", pair="trg-recip")
te("tan x = 1/cot x narrows the domain", DP, "tan(x)", "1/cot(x)", "invalid", difficulty="hard",
   why="tan 0 = 0 is defined, but cot 0 is undefined", pair="trg-recip2")
te("cot x = 1/tan x narrows the domain", DP, "cot(x)", "1/tan(x)", "invalid", difficulty="hard",
   why="cot(pi/2) = 0 defined; 1/tan(pi/2) undefined", pair="trg-recip2")
te("cos x / sin x = cot x on (0, pi)", "assumption-aware equivalence", "cot(x)", "cos(x)/sin(x)", "valid-equivalence",
   assumptions=["0 < x", "x < pi"], why="identity, both defined on (0,pi)", pair="trg-recip2")
te("tan x cos x = sin x removes poles", DP, "tan(x)cos(x)", "sin(x)", "domain-violation", why="prev undefined at pi/2",
   pair="trg-tc")
te("tan x cos x = sin x on (0, pi/2)", "assumption-aware equivalence", "tan(x)cos(x)", "sin(x)", "valid-equivalence",
   assumptions=["0 < x", "x < pi/2"], why="cos x > 0 there", pair="trg-tc")
te("tan x + cot x as 2/sin 2x", "combining reciprocal functions", "tan(x)+cot(x)", "2/sin(2x)", "valid-equivalence", difficulty="hard",
   complexity=3, why="(sin^2+cos^2)/(sin cos) = 2/sin 2x; prev undefined where sin x cos x = 0, i.e. sin 2x = 0: same domain. "
   "Uncertified: the oracle cannot compute the domain of a sum of tan and cot exactly (union of two periodic pole sets)")
te("sin^2 x/(1 - cos x) = 1 + cos x removes zeros", DP, "sin(x)^2/(1-cos(x))", "1+cos(x)", "domain-violation", complexity=2,
   why="(1-cos)(1+cos)/(1-cos); prev undefined where cos x = 1")
te("sin x/(1 - cos x) to (1 + cos x)/sin x keeps the domain? no: the multiplier introduces zeros of sin", DP,
   "sin(x)/(1-cos(x))", "(1+cos(x))/sin(x)", "invalid", difficulty="hard", complexity=2,
   why="at x=pi: sin(pi)/(1-cos pi) = 0 is defined, but (1+cos pi)/sin pi is not", pair="trg-conj")
te("(1 + cos x)/sin x to sin x/(1 - cos x) widens", DP, "(1+cos(x))/sin(x)", "sin(x)/(1-cos(x))", "domain-violation", difficulty="hard",
   complexity=2, why="the left excludes all multiples of pi; the right excludes only even multiples (cos x = 1)", pair="trg-conj")
te("cos x/(1 - sin x) to (1 + sin x)/cos x narrows", DP, "cos(x)/(1-sin(x))", "(1+sin(x))/cos(x)", "invalid", difficulty="hard",
   complexity=2, why="at x=3pi/2: cos/(1-sin) = 0/2 = 0 defined; (1+sin)/cos = 0/0 undefined")
te("sin(arcsin x) = x on [-1,1]", "inverse trig domain", "sin(asin(x))", "x", "domain-violation", why="prev defined only for |x| <= 1",
   pair="trg-inv")
te("arcsin(sin x) is not x", "inverse trig range", "asin(sin(x))", "x", "invalid", why="at x=pi: 0 vs pi", pair="trg-inv")
te("arccos(cos x) = x on [0, pi]", "inverse trig range", "acos(cos(x))", "x", "valid-equivalence", assumptions=["0 <= x", "x <= pi"],
   pair="trg-inv", difficulty="hard",
   why="arccos restricted to [0,pi] inverts cos. Uncertified: the oracle has no rule for acos(cos x) under an interval assumption")
te("(sin x)^2 is not sin(x^2)", "function-power notation", "sin(x)^2", "sin(x^2)", "invalid", difficulty="easy", why="at x=pi: 0 vs sin(pi^2) != 0")

# special values
te("special value sin(pi/6)", "exact special values", "sin(pi/6)", "1/2", "valid-equivalence", difficulty="easy", why="30-60-90 triangle",
   pair="trg-val-a")
te("special value cos(pi/3) is 1/2, not sqrt3/2", "exact special values", "cos(pi/3)", "sqrt(3)/2", "invalid", difficulty="easy",
   why="cos(pi/3) = 1/2", pair="trg-val-a")
te("special value tan(pi/3)", "exact special values", "tan(pi/3)", "sqrt(3)", "valid-equivalence", difficulty="easy", why="sin/cos = (sqrt3/2)/(1/2)")
te("reference angle sign: sin(5pi/4)", "quadrant sign", "sin(5pi/4)", "sqrt(2)/2", "invalid", why="third quadrant: sin(5pi/4) = -sqrt2/2",
   pair="trg-val-b")
te("reference angle sign: cos(2pi/3)", "quadrant sign", "cos(2pi/3)", "-1/2", "valid-equivalence", why="second quadrant, cos negative",
   pair="trg-val-b")

# =====================================================================================================================
# 7. Degree vs radian notation
# =====================================================================================================================
te("sin(30) read in radians", "angle-unit notation", "sin(30)", "1/2", "insufficient-information", notation="unfamiliar",
   oracle_prev="sin(30)", oracle_next="1/2",
   why="a student who means 30 degrees is right (sin 30 deg = 1/2); read in radians sin(30) ~ -0.988. The unit is unstated, so "
       "the step cannot be judged without knowing the convention", pair="trg-deg-a")
te("sin(30 degrees) with the unit written", "angle-unit notation", "sin(30°)", "1/2", "valid-equivalence", notation="unfamiliar",
   oracle_prev="sin(pi/6)", oracle_next="1/2", why="30 degrees = pi/6 radians, sin = 1/2", pair="trg-deg-a")
te("cos(60 degrees) with the unit written, wrong value", "angle-unit notation", "cos(60°)", "sqrt(3)/2", "invalid", notation="unfamiliar",
   oracle_prev="cos(pi/3)", oracle_next="sqrt(3)/2", why="cos 60 deg = 1/2", pair="trg-deg-a")
te("tan(45) with no unit", "angle-unit notation", "tan(45)", "1", "insufficient-information", notation="unfamiliar",
   why="true for 45 degrees, false in radians (tan 45 ~ 1.62); unit unstated", pair="trg-deg-b")
te("tan(45 degrees) with the unit written", "angle-unit notation", "tan(45°)", "1", "valid-equivalence", notation="unfamiliar",
   oracle_prev="tan(pi/4)", oracle_next="1", why="tan 45 deg = 1", pair="trg-deg-b")
te("mixing degrees and radians in a shift", "angle-unit notation", "sin(x+90°)", "cos(x)", "insufficient-information", notation="unfamiliar",
   why="valid if x is also in degrees; if x is in radians the sum x + 90 deg mixes units and the expression is ill-defined without "
       "a convention")
te("sin x° = sin x is a unit confusion", "angle-unit notation", "sin(x°)", "sin(x)", "invalid", notation="unfamiliar",
   oracle_prev="sin(pi x/180)", oracle_next="sin(x)", why="x degrees = pi x/180 radians; at x=90: 1 vs sin(90) != 1")

# =====================================================================================================================
# 8. Trig equations on bounded intervals (transitions)
# =====================================================================================================================
ts("sin x = 1/2 on [0, 2pi)", SSI, "sin(x)=1/2", "x=pi/6 or x=5pi/6", "valid-equivalence", assumptions=I2, difficulty="easy",
   why="sin is positive in quadrants I and II", pair="trg-eq-a")
ts("sin x = 1/2 on [0, 2pi): second solution missed", SSI, "sin(x)=1/2", "x=pi/6", "invalid", assumptions=I2, difficulty="easy",
   why="x=5pi/6 is lost", pair="trg-eq-a")
ts("sin x = 1/2 without an interval", "periodic solution set", "sin(x)=1/2", "x=pi/6", "invalid", pair="trg-eq-a",
   why="over R the solution set is {pi/6 + 2k pi} union {5pi/6 + 2k pi}; x = 5pi/6 is lost. Uncertified: periodic solution sets "
       "over all reals are not computed exactly by the oracle")
ts("cos x = -1/2 on [0, 2pi)", SSI, "cos(x)=-1/2", "x=2pi/3 or x=4pi/3", "valid-equivalence", assumptions=I2, why="quadrants II and III",
   pair="trg-eq-b")
ts("cos x = -1/2: wrong quadrant", SSI, "cos(x)=-1/2", "x=2pi/3 or x=5pi/3", "invalid", assumptions=I2, why="cos(5pi/3) = 1/2",
   pair="trg-eq-b")
ts("cos x = 1/2 on (-pi, pi]", SSI, "cos(x)=1/2", "x=pi/3 or x=-pi/3", "valid-equivalence", assumptions=["-pi < x", "x <= pi"],
   why="cos is even")
ts("tan x = sqrt3 on [0, pi)", SSI, "tan(x)=sqrt(3)", "x=pi/3", "valid-equivalence", assumptions=["0 <= x", "x < pi"],
   why="tan has period pi, one solution per period", pair="trg-eq-c")
ts("tan x = sqrt3 on [0, 2pi) has two solutions", SSI, "tan(x)=sqrt(3)", "x=pi/3", "invalid", assumptions=I2, why="4pi/3 is lost",
   pair="trg-eq-c")
ts("tan x = 1 on [0, 2pi)", SSI, "tan(x)=1", "x=pi/4 or x=5pi/4", "valid-equivalence", assumptions=I2, why="period pi", pair="trg-eq-c")
ts("cos 2x = 0 on [0, 2pi): four solutions", SSI, "cos(2x)=0", "x=pi/4, 3pi/4, 5pi/4 or 7pi/4", "valid-equivalence", assumptions=I2,
   why="2x ranges over [0,4pi): 2x = pi/2, 3pi/2, 5pi/2, 7pi/2", pair="trg-eq-d")
ts("cos 2x = 0 on [0, 2pi): only one period of 2x considered", SSI, "cos(2x)=0", "x=pi/4 or x=3pi/4", "invalid", assumptions=I2,
   why="5pi/4 and 7pi/4 are lost", pair="trg-eq-d")
ts("dividing by sin x loses its zeros", SSI, "2sin(x)cos(x)=sin(x)", "2cos(x)=1", "invalid", assumptions=I2,
   why="x=0 and x=pi satisfy prev but not next", pair="trg-eq-e")
ts("factoring sin x keeps its zeros", SSI, "2sin(x)cos(x)=sin(x)", "sin(x)(2cos(x)-1)=0", "valid-equivalence", assumptions=I2,
   why="subtract and factor (reversible)", pair="trg-eq-e")
ts("dividing by sin x loses its zeros (quadratic in sin)", SSI, "sin(x)^2=sin(x)", "sin(x)=1", "invalid", assumptions=I2,
   why="x=0, pi lost", pair="trg-eq-f")
ts("dividing by cos x loses its zeros", SSI, "sin(x)cos(x)=cos(x)", "sin(x)=1", "invalid", assumptions=I2, why="x=3pi/2 (cos = 0) lost",
   pair="trg-eq-f")
ts("dividing by cos x when cos x cannot vanish at a solution", "dividing by cos x", "sin(x)=cos(x)", "tan(x)=1", "valid-equivalence",
   assumptions=I2, why="if cos x = 0 then sin x = +-1 != cos x, so no solution is lost", pair="trg-eq-g")
ts("squaring both sides of sin x = cos x", "squaring a trig equation", "sin(x)=cos(x)", "sin(x)^2=cos(x)^2", "valid-implication",
   assumptions=I2, why="next adds 3pi/4 and 7pi/4 (sin = -cos)", pair="trg-eq-g")
ts("sin^2 x = cos^2 x iff cos 2x = 0", "double angle in an equation", "sin(x)^2=cos(x)^2", "cos(2x)=0", "valid-equivalence",
   assumptions=I2, why="cos^2 - sin^2 = cos 2x", pair="trg-eq-g")
ts("sin^2 x = 1/4 splits into two equations", SSI, "sin(x)^2=1/4", "sin(x)=1/2 or sin(x)=-1/2", "valid-equivalence", assumptions=I2,
   why="square root of both sides with +-")
ts("a fraction of trig functions is zero only where defined", "excluded values in trig equations", "(sin(x)-1)/cos(x)=0", "sin(x)=1",
   "valid-implication", assumptions=I2, why="sin x = 1 forces cos x = 0, so prev has no solution; next has pi/2")
ts("tan x = 0 iff sin x = 0 (tan defined where sin = 0)", "quotient identity in an equation", "tan(x)=0", "sin(x)=0",
   "valid-equivalence", assumptions=I2, why="at sin x = 0, cos x = +-1 so tan is defined")
ts("sin x / cos x = 1 to sin x = cos x", "clearing a trig denominator", "sin(x)/cos(x)=1", "sin(x)=cos(x)", "valid-equivalence",
   assumptions=I2, why="sin = cos cannot hold where cos = 0")
ts("quadratic in cos x: factoring", SSI, "2cos(x)^2-cos(x)-1=0", "(2cos(x)+1)(cos(x)-1)=0", "valid-equivalence", assumptions=I2,
   why="polynomial identity in cos x",
   pair="trg-eq-h")
ts("quadratic in cos x: reading off solutions", SSI, "(2cos(x)+1)(cos(x)-1)=0", "x=0 or x=2pi/3 or x=4pi/3", "valid-equivalence",
   assumptions=I2, why="cos x = 1 gives 0; cos x = -1/2 gives 2pi/3, 4pi/3", pair="trg-eq-h")
ts("cos x = 1 without an interval", "periodic solution set", "cos(x)=1", "x=0", "invalid",
   why="x = 2pi also solves cos x = 1. Uncertified: the oracle does not compute periodic solution sets over all reals")
ts("tan x = sin x / cos x as an equation holds wherever tan is defined", "quotient identity in an equation", "tan(x)=sin(x)/cos(x)",
   "x=x", "valid-implication", why="prev holds exactly where cos x != 0; x = x holds for all x", notation="unfamiliar")

# =====================================================================================================================
# 9. Workings: show-that, simplify, solve
# =====================================================================================================================
SH = "show"
wk("show-that with Pythagoras", "show-that chain", {"type": SH, "start": "sin(x)tan(x)+cos(x)", "target": "sec(x)"},
   ["sin(x)^2/cos(x)+cos(x)", "(sin(x)^2+cos(x)^2)/cos(x)", "1/cos(x)", "sec(x)"], "valid-equivalence", answer="sec x",
   complexity=4, pair="trg-w-sh1", why="each line is an identity on cos x != 0, the common domain")
wk("show-that with a sign error", "show-that chain", {"type": SH, "start": "sin(x)tan(x)+cos(x)", "target": "sec(x)"},
   ["sin(x)^2/cos(x)+cos(x)", "(sin(x)^2-cos(x)^2)/cos(x)", "1/cos(x)", "sec(x)"], "invalid", answer="sec x", complexity=4,
   pair="trg-w-sh1", why="line 2 subtracts cos^2 instead of adding; at x=0 it gives -1 vs 1")
wk("show-that stops before the target", "show-that chain", {"type": SH, "start": "sin(x)tan(x)+cos(x)", "target": "sec(x)"},
   ["sin(x)^2/cos(x)+cos(x)", "(sin(x)^2+cos(x)^2)/cos(x)"], "incomplete", answer="sec x", complexity=2, pair="trg-w-sh1",
   why="every line is correct but the target sec x is never reached")
wk("difference of fourth powers", "show-that chain", {"type": SH, "start": "cos(x)^4-sin(x)^4", "target": "cos(2x)"},
   ["(cos(x)^2-sin(x)^2)(cos(x)^2+sin(x)^2)", "cos(x)^2-sin(x)^2", "cos(2x)"], "valid-equivalence", answer="cos 2x", complexity=3,
   composition=True, pair="trg-w-sh2", why="factor, Pythagoras, double angle")
wk("difference of fourth powers with a wrong factorisation", "show-that chain", {"type": SH, "start": "cos(x)^4-sin(x)^4", "target": "cos(2x)"},
   ["(cos(x)^2-sin(x)^2)^2", "cos(2x)^2", "cos(2x)"], "invalid", answer="cos 2x", complexity=3, composition=True, pair="trg-w-sh2",
   why="a^2 - b^2 is not (a-b)^2; at x=pi/2: -1 vs 1")
wk("half-angle form of tan^2", "show-that chain", {"type": SH, "start": "(1-cos(2x))/(1+cos(2x))", "target": "tan(x)^2"},
   ["2sin(x)^2/(2cos(x)^2)", "tan(x)^2"], "valid-equivalence", answer="tan^2 x", complexity=2,
   why="both double-angle forms; domains coincide (cos x != 0)")
wk("show-that whose chain removes a singularity", "pole removed in a show-that", {"type": SH, "start": "(1-cos(2x))/sin(2x)", "target": "tan(x)"},
   ["2sin(x)^2/(2sin(x)cos(x))", "sin(x)/cos(x)", "tan(x)"], "domain-violation", answer="tan x, sin 2x != 0", complexity=3,
   pair="trg-w-sh3", why="cancelling sin x widens the domain: the start is undefined at x = 0, tan 0 is defined")
wk("show-that with the restriction stated", "pole removed in a show-that", {"type": SH, "start": "(1-cos(2x))/sin(2x)", "target": "tan(x)"},
   ["2sin(x)^2/(2sin(x)cos(x))", "sin(x) != 0", "sin(x)/cos(x)", "tan(x)"], "valid-equivalence", answer="tan x, sin 2x != 0",
   complexity=3, pair="trg-w-sh3", why="cancelled factor declared non-zero",
   oracle_lines=["2sin(x)^2/(2sin(x)cos(x))", "restrict: sin(x) != 0", "sin(x)/cos(x)", "tan(x)"])
wk("show-that on an interval where the cancelled factor is non-zero", "assumption-aware show-that",
   {"type": SH, "start": "(1-cos(2x))/sin(2x)", "target": "tan(x)"}, ["2sin(x)^2/(2sin(x)cos(x))", "sin(x)/cos(x)", "tan(x)"],
   "valid-equivalence", assumptions=["0 < x", "x < pi/2"], answer="tan x", complexity=3, pair="trg-w-sh3",
   why="sin x and cos x are positive on (0, pi/2)")
wk("sum of squares harmonic expansion", "show-that chain", {"type": SH, "start": "(sin(x)+cos(x))^2", "target": "1+sin(2x)"},
   ["sin(x)^2+2sin(x)cos(x)+cos(x)^2", "1+2sin(x)cos(x)", "1+sin(2x)"], "valid-equivalence", answer="1 + sin 2x", complexity=3,
   pair="trg-w-sh4", why="expand, Pythagoras, double angle")
wk("sum of squares with the cross term dropped", "show-that chain", {"type": SH, "start": "(sin(x)+cos(x))^2", "target": "1+sin(2x)"},
   ["sin(x)^2+cos(x)^2", "1", "1+sin(2x)"], "invalid", answer="1 + sin 2x", complexity=3, pair="trg-w-sh4",
   why="(a+b)^2 != a^2 + b^2; line 1 is false at x = pi/4")
wk("show-that by expanding cos(a+b) with a sign error", "show-that chain", {"type": SH, "start": "cos(x+pi/3)+cos(x-pi/3)", "target": "cos(x)"},
   ["cos(x)cos(pi/3)+sin(x)sin(pi/3)+cos(x)cos(pi/3)+sin(x)sin(pi/3)", "cos(x)+sqrt(3)sin(x)", "cos(x)"], "invalid", answer="cos x",
   complexity=3, pair="trg-w-sh5", why="cos(x+pi/3) = cos x cos pi/3 - sin x sin pi/3; line 1 is false (at x = pi/2: 0 vs sqrt3)")
wk("show-that by expanding cos(a+b) correctly", "show-that chain", {"type": SH, "start": "cos(x+pi/3)+cos(x-pi/3)", "target": "cos(x)"},
   ["cos(x)cos(pi/3)-sin(x)sin(pi/3)+cos(x)cos(pi/3)+sin(x)sin(pi/3)", "2cos(x)cos(pi/3)", "cos(x)"], "valid-equivalence",
   answer="cos x", complexity=3, pair="trg-w-sh5", why="the sine terms cancel and 2cos(pi/3) = 1")
wk("simplifying sin 2x / sin x", "pole removed in a simplification", {"type": "simplify", "start": "sin(2x)/sin(x)"},
   ["2sin(x)cos(x)/sin(x)", "2cos(x)"], "domain-violation", answer="2cos x, sin x != 0", pair="trg-w-s1",
   why="sin x = 0 points are excluded from the start but not from 2cos x")
wk("simplifying sin 2x / sin x with the restriction", "pole removed in a simplification", {"type": "simplify", "start": "sin(2x)/sin(x)"},
   ["2sin(x)cos(x)/sin(x)", "sin(x) != 0", "2cos(x)"], "valid-equivalence", answer="2cos x, sin x != 0", pair="trg-w-s1",
   why="restriction stated", oracle_lines=["2sin(x)cos(x)/sin(x)", "restrict: sin(x) != 0", "2cos(x)"])
wk("simplifying sin 2x / sin x on (0, pi)", "assumption-aware simplification", {"type": "simplify", "start": "sin(2x)/sin(x)"},
   ["2sin(x)cos(x)/sin(x)", "2cos(x)"], "valid-equivalence", assumptions=["0 < x", "x < pi"], answer="2cos x", pair="trg-w-s1",
   why="sin x > 0 on (0, pi)")
wk("simplifying sin 2x / sin x with the double angle misremembered", FI, {"type": "simplify", "start": "sin(2x)/sin(x)"},
   ["2sin(x)/sin(x)", "2"], "invalid", answer="2cos x", pair="trg-w-s1", why="sin 2x != 2 sin x; at x = pi/3 the start is 1, not 2")
wk("sec^2 - 1 = tan^2", "Pythagorean simplification", {"type": "simplify", "start": "sec(x)^2-1"}, ["tan(x)^2"], "valid-equivalence",
   answer="tan^2 x", difficulty="easy", why="same poles on both sides")
wk("evaluating special values", "exact special values", {"type": "evaluate", "start": "sin(pi/6)+cos(pi/3)"}, ["1/2+1/2", "1"],
   "valid-equivalence", answer="1", difficulty="easy", pair="trg-w-ev", why="both are 1/2")
wk("evaluating special values with a swapped value", "exact special values", {"type": "evaluate", "start": "sin(pi/6)+cos(pi/3)"},
   ["1/2+sqrt(3)/2", "(1+sqrt(3))/2"], "invalid", answer="1", difficulty="easy", pair="trg-w-ev", why="cos(pi/3) = 1/2, not sqrt3/2")
wk("evaluating with a quadrant sign error", "quadrant sign", {"type": "evaluate", "start": "sin(7pi/6)+cos(5pi/3)"},
   ["1/2+1/2", "1"], "invalid", answer="0", pair="trg-w-ev2", why="sin(7pi/6) = -1/2 (third quadrant)")
wk("evaluating with correct quadrant signs", "quadrant sign", {"type": "evaluate", "start": "sin(7pi/6)+cos(5pi/3)"},
   ["-1/2+1/2", "0"], "valid-equivalence", answer="0", pair="trg-w-ev2", why="sin(7pi/6) = -1/2, cos(5pi/3) = 1/2")
wk("simplification justified by the wrong identity", "cited identity", {"type": "simplify", "start": "1-2sin(x)^2"},
   ["cos(2x)   (by the Pythagorean identity)"], "wrong-reason", answer="cos 2x",
   why="the result is right, but it follows from the double-angle formula, not from sin^2 + cos^2 = 1 alone",
   oracle_lines=["cos(2x)"])
wk("show-that justified by the wrong identity", "cited identity", {"type": SH, "start": "sin(x)cos(x)", "target": "sin(2x)/2"},
   ["sin(2x)/2   (since sin(a+b) = sin a + sin b)"], "wrong-reason", answer="sin 2x / 2",
   why="result correct (double angle), but the cited rule is a false identity", oracle_lines=["sin(2x)/2"])

# solve workings on intervals
SV = "solve"
wk("solving a quadratic in cos x on [0, 2pi)", SSI, {"type": SV, "statement": "2cos(x)^2-cos(x)-1=0"},
   ["(2cos(x)+1)(cos(x)-1)=0", "cos(x)=-1/2 or cos(x)=1", "x=2pi/3 or x=4pi/3 or x=0"], "valid-equivalence", assumptions=I2,
   answer="x = 0, 2pi/3, 4pi/3", complexity=3, pair="trg-w-q1",
   why="each line has the solution set {0, 2pi/3, 4pi/3} on [0, 2pi). [oracle-dispute] SymPy's solveset on this interval "
       "returns only {0}, missing 2pi/3 and 4pi/3 (cos(2pi/3) = -1/2 exactly), so the oracle reports this correct working as invalid")
wk("solving a quadratic in cos x: one solution missed", SSI, {"type": SV, "statement": "2cos(x)^2-cos(x)-1=0"},
   ["(2cos(x)+1)(cos(x)-1)=0", "cos(x)=-1/2 or cos(x)=1", "x=2pi/3 or x=0"], "invalid", assumptions=I2,
   answer="x = 0, 2pi/3, 4pi/3", complexity=3, pair="trg-w-q1", why="4pi/3 (cos = -1/2) is lost")
wk("quadratic in sin x via a double angle", SSI, {"type": SV, "statement": "cos(2x)=sin(x)"},
   ["1-2sin(x)^2=sin(x)", "2sin(x)^2+sin(x)-1=0", "(2sin(x)-1)(sin(x)+1)=0", "x=pi/6, 5pi/6 or 3pi/2"], "valid-equivalence",
   assumptions=I2, answer="x = pi/6, 5pi/6, 3pi/2", complexity=4, composition=True, pair="trg-w-q2",
   why="double angle, then a quadratic in sin x; sin x = 1/2 or -1. [oracle-dispute] the oracle's per-line solveset drops 3pi/2 "
       "for the polynomial-in-sin lines although sin(3pi/2) = -1 satisfies them exactly")
wk("quadratic in sin x via the wrong double angle", SSI, {"type": SV, "statement": "cos(2x)=sin(x)"},
   ["2sin(x)^2-1=sin(x)", "2sin(x)^2-sin(x)-1=0", "(2sin(x)+1)(sin(x)-1)=0", "x=pi/2, 7pi/6 or 11pi/6"], "invalid",
   assumptions=I2, answer="x = pi/6, 5pi/6, 3pi/2", complexity=4, composition=True, pair="trg-w-q2",
   why="cos 2x = 1 - 2sin^2 x, not 2sin^2 x - 1; the final set is wrong (pi/2 gives cos(pi) = -1 != 1)")
wk("factoring instead of dividing by sin x", SSI, {"type": SV, "statement": "2sin(x)cos(x)=sin(x)"},
   ["sin(x)(2cos(x)-1)=0", "sin(x)=0 or cos(x)=1/2", "x=0, pi, pi/3 or 5pi/3"], "valid-equivalence", assumptions=I2,
   answer="x = 0, pi/3, pi, 5pi/3", complexity=3, pair="trg-w-div", why="all steps reversible")
wk("dividing by sin x loses solutions", SSI, {"type": SV, "statement": "2sin(x)cos(x)=sin(x)"}, ["2cos(x)=1", "x=pi/3 or x=5pi/3"],
   "invalid", assumptions=I2, answer="x = 0, pi/3, pi, 5pi/3", complexity=2, pair="trg-w-div", why="x = 0 and x = pi are lost")
wk("sin 2x = cos x by factoring cos x", SSI, {"type": SV, "statement": "sin(2x)=cos(x)"},
   ["2sin(x)cos(x)-cos(x)=0", "cos(x)(2sin(x)-1)=0", "cos(x)=0 or sin(x)=1/2", "x=pi/2, 3pi/2, pi/6 or 5pi/6"], "valid-equivalence",
   assumptions=I2, answer="x = pi/6, pi/2, 5pi/6, 3pi/2", complexity=4, composition=True, pair="trg-w-s2c",
   why="double angle then factor; no division")
wk("sin 2x = cos x by dividing by cos x", SSI, {"type": SV, "statement": "sin(2x)=cos(x)"},
   ["2sin(x)cos(x)=cos(x)", "2sin(x)=1", "x=pi/6 or x=5pi/6"], "invalid", assumptions=I2, answer="x = pi/6, pi/2, 5pi/6, 3pi/2",
   complexity=3, composition=True, pair="trg-w-s2c", why="dividing by cos x loses pi/2 and 3pi/2")
wk("sin^2 x = sin x by factoring", SSI, {"type": SV, "statement": "sin(x)^2=sin(x)"},
   ["sin(x)(sin(x)-1)=0", "sin(x)=0 or sin(x)=1", "x=0, pi or pi/2"], "valid-equivalence", assumptions=I2, answer="x = 0, pi/2, pi",
   pair="trg-w-sq", why="reversible steps")
wk("sin^2 x = sin x by dividing", SSI, {"type": SV, "statement": "sin(x)^2=sin(x)"}, ["sin(x)=1", "x=pi/2"], "invalid", assumptions=I2,
   answer="x = 0, pi/2, pi", pair="trg-w-sq", why="sin x = 0 solutions lost")
wk("sin^2 x = 1/4 taking only the positive root", SSI, {"type": SV, "statement": "sin(x)^2=1/4"}, ["sin(x)=1/2", "x=pi/6 or x=5pi/6"],
   "invalid", assumptions=I2, answer="x = pi/6, 5pi/6, 7pi/6, 11pi/6", pair="trg-w-pm", why="sin x = -1/2 branch lost")
wk("sin^2 x = 1/4 with both roots", SSI, {"type": SV, "statement": "sin(x)^2=1/4"},
   ["sin(x)=1/2 or sin(x)=-1/2", "x=pi/6, 5pi/6, 7pi/6 or 11pi/6"], "valid-equivalence", assumptions=I2,
   answer="x = pi/6, 5pi/6, 7pi/6, 11pi/6", pair="trg-w-pm", why="both branches solved")
wk("sin x = cos x via tan x = 1", SSI, {"type": SV, "statement": "sin(x)=cos(x)"}, ["tan(x)=1", "x=pi/4 or x=5pi/4"], "valid-equivalence",
   assumptions=I2, answer="x = pi/4, 5pi/4", pair="trg-w-tan",
   why="cos x = 0 cannot give sin x = cos x, so dividing by cos x is safe")
wk("sin x = cos x via squaring, unchecked", SSI, {"type": SV, "statement": "sin(x)=cos(x)"},
   ["sin(x)^2=cos(x)^2", "cos(2x)=0", "x=pi/4, 3pi/4, 5pi/4 or 7pi/4"], "invalid", assumptions=I2, answer="x = pi/4, 5pi/4",
   pair="trg-w-tan", complexity=3, why="squaring admits 3pi/4 and 7pi/4 where sin x = -cos x")
wk("sin x = cos x via squaring, checked", SSI, {"type": SV, "statement": "sin(x)=cos(x)"},
   ["sin(x)^2=cos(x)^2", "cos(2x)=0", "x=pi/4, 3pi/4, 5pi/4 or 7pi/4", "check: at 3pi/4 and 7pi/4 sin x = -cos x, reject",
    "x=pi/4 or x=5pi/4"], "valid-implication", assumptions=I2, answer="x = pi/4, 5pi/4", pair="trg-w-tan", complexity=4,
   why="squaring then rejecting the extraneous candidates",
   oracle_lines=["sin(x)^2=cos(x)^2", "cos(2x)=0", "x=pi/4, 3pi/4, 5pi/4 or 7pi/4", None, "x=pi/4 or x=5pi/4"])
wk("harmonic form solving", SSI, {"type": SV, "statement": "sqrt(3)sin(x)+cos(x)=1"}, ["2sin(x+pi/6)=1", "x=0 or x=2pi/3"],
   "valid-equivalence", assumptions=I2, answer="x = 0, 2pi/3", difficulty="hard", complexity=3, composition=True,
   why="sqrt3 sin x + cos x = 2 sin(x + pi/6); x + pi/6 in [pi/6, 13pi/6) gives pi/6 and 5pi/6")
wk("sec equation via cos", SSI, {"type": SV, "statement": "sec(x)=2"}, ["cos(x)=1/2", "x=pi/3 or x=5pi/3"], "valid-equivalence",
   assumptions=I2, answer="x = pi/3, 5pi/3", why="sec = 1/cos; cos never zero at a solution")
wk("tan equation on [0, pi)", SSI, {"type": SV, "statement": "tan(x)=1"}, ["x=pi/4"], "valid-equivalence",
   assumptions=["0 <= x", "x < pi"], answer="x = pi/4", difficulty="easy", why="one solution per period")
wk("unbracketed sin^2 notation in an equation", SSI, {"type": SV, "statement": "sin(x)=sin^2 x"}, ["x=0, pi, pi/2"], "valid-equivalence",
   assumptions=I2, answer="x = 0, pi/2, pi", notation="unfamiliar", why="sin x (1 - sin x) = 0")
wk("excluded candidate in a trig rational equation", "excluded values in trig equations", {"type": SV, "statement": "sin(x)/(1+cos(x))=0"},
   ["sin(x)=0", "x=0, pi or 2pi"], "invalid", assumptions=["0 <= x", "x <= 2*pi"], answer="x = 0, 2pi", pair="trg-w-exc",
   why="at x = pi the denominator 1 + cos pi = 0, so pi is excluded")
wk("excluded candidate in a trig rational equation, rejected", "excluded values in trig equations",
   {"type": SV, "statement": "sin(x)/(1+cos(x))=0"},
   ["sin(x)=0", "x=0, pi or 2pi", "reject pi: 1+cos(pi)=0", "x=0 or x=2pi"], "valid-implication",
   assumptions=["0 <= x", "x <= 2*pi"], answer="x = 0, 2pi", pair="trg-w-exc", complexity=3,
   why="the excluded candidate is checked and rejected",
   oracle_lines=["sin(x)=0", "x=0, pi or 2pi", None, "x=0 or x=2pi"])
wk("excluded candidate dropped silently", "excluded values in trig equations", {"type": SV, "statement": "sin(x)/(1+cos(x))=0"},
   ["sin(x)=0", "x=0, pi or 2pi", "x=0 or x=2pi"], "domain-violation", assumptions=["0 <= x", "x <= 2*pi"], answer="x = 0, 2pi",
   pair="trg-w-exc", complexity=3, why="correct answer, but pi is dropped without any stated reason")
wk("periodic general solution without an interval", "periodic solution set", {"type": SV, "statement": "sin(x)=1/2"},
   ["x=pi/6 or x=5pi/6"], "invalid", answer="x = pi/6 + 2k pi or 5pi/6 + 2k pi",
   why="over all reals infinitely many solutions are lost (e.g. 13pi/6). Uncertified: the oracle cannot compute periodic sets")
wk("interval endpoint included", SSI, {"type": SV, "statement": "sin(x)=0"}, ["x=0, pi or 2pi"], "valid-equivalence",
   assumptions=["0 <= x", "x <= 2*pi"], answer="x = 0, pi, 2pi", pair="trg-w-end", difficulty="easy", why="closed interval includes 2pi")
wk("interval endpoint wrongly included", SSI, {"type": SV, "statement": "sin(x)=0"}, ["x=0, pi or 2pi"], "invalid",
   assumptions=["0 <= x", "x < 2*pi"], answer="x = 0, pi", pair="trg-w-end", difficulty="easy", why="2pi is outside [0, 2pi)")
