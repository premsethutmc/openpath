"""DOM: Domain restrictions and singularities.

Every label is derived by hand from the natural domains (real-valued functions; ln needs a positive argument, even roots a
non-negative radicand, denominators non-zero, tan/sec need cos != 0, cot/csc need sin != 0).
Expression transitions: 'domain-violation' = equal where prev is defined but next is defined at more points (widening);
'invalid' = next undefined somewhere prev is defined (narrowing) or values differ.
"""
from schema import T, W

C = "DOM"
CANC = "cancelling a common factor that can vanish"
NDP = "natural-domain preservation in expression rewriting"
SSP = "solution-set preservation with excluded values"


def te(principle, invariant, prev, nxt, rel, why, **kw):
    return T(C, principle, invariant, prev, nxt, "expression", rel, why=why, **kw)


def ts(principle, invariant, prev, nxt, rel, why, **kw):
    return T(C, principle, invariant, prev, nxt, "statement", rel, why=why, **kw)


# =====================================================================================================================
# 1. Cancellation across zero-valued factors (removable singularities)
# =====================================================================================================================
te(CANC, NDP, "(x^2-9)/(x+3)", "x-3", "domain-violation", difficulty="easy",
   why="(x-3)(x+3)/(x+3) = x-3 only for x != -3; x-3 is defined at -3 (removable singularity filled)", pair="dom-canc-a")
te(CANC + " with the excluded value stated", "assumption-aware equivalence", "(x^2-9)/(x+3)", "x-3", "valid-equivalence",
   assumptions=["x != -3"], difficulty="easy", why="with x != -3 assumed, both sides agree on the whole assumed domain", pair="dom-canc-a")
te(CANC, NDP, "(x^2+x)/x", "x+1", "domain-violation", difficulty="easy",
   why="x(x+1)/x = x+1 for x != 0; next is defined at 0", pair="dom-canc-b")
te("introducing a denominator narrows the domain", NDP, "x+1", "(x^2+x)/x", "invalid", difficulty="easy",
   why="x+1 is defined at x=0 but (x^2+x)/x is not: the rewrite loses the point 0", pair="dom-canc-b")
te(CANC, NDP, "(x-1)/(x^2-1)", "1/(x+1)", "domain-violation",
   why="(x-1)/((x-1)(x+1)) = 1/(x+1) for x != 1; at x=1 next is 1/2 but prev is undefined", pair="dom-canc-c")
te(CANC + " with the excluded value stated", "assumption-aware equivalence", "(x-1)/(x^2-1)", "1/(x+1)", "valid-equivalence",
   assumptions=["x != 1"], why="x = -1 is excluded on both sides; x = 1 excluded by assumption", pair="dom-canc-c")
te("cancelling one copy of a repeated factor keeps the singularity", "non-removable singularity survives cancellation",
   "(x^2-4)/(x^2-4x+4)", "(x+2)/(x-2)", "valid-equivalence", difficulty="hard",
   why="(x-2)(x+2)/(x-2)^2 = (x+2)/(x-2); x=2 is still excluded by the remaining (x-2), so domains coincide", pair="dom-canc-d")
te(CANC + " where the factor leaves the denominator", "removable singularity filled",
   "(x-2)^2/(x^2-4)", "(x-2)/(x+2)", "domain-violation", difficulty="hard",
   why="(x-2)^2/((x-2)(x+2)) = (x-2)/(x+2) except x=2; next is defined at 2 (value 0) while prev is not", pair="dom-canc-d")
te("cancelling a factor whose zero is also a zero of a remaining factor", "domain unchanged after cancellation",
   "(x^2+2x)/(x^2+4x+4)", "x/(x+2)", "valid-equivalence", why="x(x+2)/(x+2)^2 = x/(x+2); x=-2 excluded on both sides")
te(CANC + " after factoring out -1", NDP, "(x^2-9)/(3-x)", "-(x+3)", "domain-violation",
   why="(x-3)(x+3)/(-(x-3)) = -(x+3) for x != 3; next defined at 3", pair="dom-canc-e")
te("sign error when cancelling (3-x) against (x-3)", "value preservation", "(x^2-9)/(3-x)", "x+3", "invalid",
   why="at x=0: -9/3 = -3 but next gives 3", pair="dom-canc-e")
te(CANC + " (two excluded values)", NDP, "(x^3-x)/(x^2-x)", "x+1", "domain-violation", difficulty="medium", complexity=2,
   why="x(x-1)(x+1)/(x(x-1)) = x+1 for x != 0,1; next defined at both", pair="dom-canc-f")
te(CANC + " with only one of two excluded values stated", "completeness of stated restrictions", "(x^3-x)/(x^2-x)", "x+1",
   "domain-violation", assumptions=["x != 0"], difficulty="hard", complexity=2,
   why="with x != 0 assumed, x=1 is still excluded from prev but not from next", pair="dom-canc-f")
te(CANC + " with all excluded values stated", "assumption-aware equivalence", "(x^3-x)/(x^2-x)", "x+1", "valid-equivalence",
   assumptions=["x != 0", "x != 1"], complexity=2, why="both zeros of the cancelled factor are excluded by assumption", pair="dom-canc-f")
te("x/x is not identically 1", NDP, "x/x", "1", "domain-violation", difficulty="easy",
   why="x/x = 1 for x != 0 only; 1 is defined at 0", pair="dom-xx")
te("writing 1 as x/x introduces a hole", NDP, "1", "x/x", "invalid", difficulty="easy",
   why="1 is defined at x=0, x/x is not", pair="dom-xx")
te("subtracting equal fractions leaves the singularity", NDP, "1/x-1/x", "0", "domain-violation",
   why="1/x - 1/x is undefined at 0; 0 is defined everywhere")
te("combining fractions with a common denominator then cancelling", NDP, "x/(x-1)-1/(x-1)", "1", "domain-violation",
   why="(x-1)/(x-1) = 1 for x != 1 only")
te("product of reciprocal fractions", NDP, "(x/(x-1))((x-1)/x)", "1", "domain-violation", complexity=2,
   why="the product is 1 for x != 0, 1; prev undefined at both points")
te("reciprocal of a reciprocal", NDP, "1/(1/x)", "x", "domain-violation", difficulty="easy",
   why="1/(1/x) is undefined at 0 (inner 1/x undefined); x is defined there", pair="dom-recip")
te("rewriting x as a double reciprocal narrows the domain", NDP, "x", "1/(1/x)", "invalid", difficulty="easy",
   why="x is defined at 0 but 1/(1/x) is not", pair="dom-recip")
te("clearing a compound fraction hides an inner excluded value", NDP, "1/(1+1/x)", "x/(x+1)", "domain-violation", complexity=2,
   why="prev excludes x=0 (inner 1/x) and x=-1; x/(x+1) only excludes -1, so x=0 is gained")
te("clearing a compound fraction (two inner excluded values)", NDP, "(1-1/x^2)/(1+1/x)", "(x-1)/x", "domain-violation",
   difficulty="hard", complexity=3, why="prev excludes 0 and -1; (x-1)/x only excludes 0; at x=-1 next is 2")
te("dividing numerator and denominator by x introduces a restriction", NDP, "x/(x^2+1)", "1/(x+1/x)", "invalid",
   why="x/(x^2+1) is defined (=0) at x=0; 1/(x+1/x) is undefined there")
te("division of fractions: the divisor's numerator becomes a denominator", "hidden restriction from a divisor",
   "((x+1)/(x-1))/((x+1)/(x+2))", "(x+2)/(x-1)", "domain-violation", difficulty="hard", complexity=3,
   why="prev excludes x=1, x=-2 (inner denominator) and x=-1 (divisor zero); next only excludes 1", pair="dom-divfrac")
te("division of fractions with one of two hidden restrictions stated", "completeness of stated restrictions",
   "((x+1)/(x-1))/((x+1)/(x+2))", "(x+2)/(x-1)", "domain-violation", assumptions=["x != -1"], difficulty="hard", complexity=3,
   why="x=-2 is still excluded from prev (inner denominator) but next is defined there", pair="dom-divfrac")
te("division of fractions with every hidden restriction stated", "assumption-aware equivalence",
   "((x+1)/(x-1))/((x+1)/(x+2))", "(x+2)/(x-1)", "valid-equivalence", assumptions=["x != -1", "x != -2"], difficulty="hard",
   complexity=3, why="with -1 and -2 excluded, both sides are defined exactly for x not in {-2,-1,1} and agree", pair="dom-divfrac")
te("cancelling a factor that never vanishes needs no restriction", "non-vanishing factor", "(x^4-1)/(x^2+1)", "x^2-1",
   "valid-equivalence", why="x^2+1 > 0 for all real x, so the cancellation changes nothing", pair="dom-nonzero")
te(CANC + " (factor with two real zeros)", NDP, "(x^4-1)/(x^2-1)", "x^2+1", "domain-violation",
   why="x^2-1 vanishes at +-1; prev undefined there, x^2+1 defined", pair="dom-nonzero")
te(CANC + " after a common numeric factor", NDP, "(2x^2-8)/(4x-8)", "(x+2)/2", "domain-violation",
   why="2(x-2)(x+2)/(4(x-2)) = (x+2)/2 for x != 2")
te("rewriting a polynomial as a quotient introduces a hole", NDP, "x+1", "(x^2-1)/(x-1)", "invalid",
   why="x+1 is defined at 1 but (x^2-1)/(x-1) is not")
te("assumption that already excludes the hole", "assumption-aware equivalence", "(x^2-1)/(x+1)", "x-1", "valid-equivalence",
   assumptions=["x > 0"], why="the only excluded value -1 lies outside x > 0", pair="dom-signassume")
te("assumption that does not exclude the hole", "assumption-aware equivalence", "(x^2-1)/(x+1)", "x-1", "domain-violation",
   assumptions=["x < 0"], why="x=-1 satisfies x < 0; prev undefined there, next equals -2", pair="dom-signassume")
te("sin(x)/x is not a cancellation", "value preservation", "sin(x)/x", "1", "invalid",
   why="x is not a factor of sin(x); at x=pi/2: (1)/(pi/2) != 1")
te(CANC + " (trinomial numerator)", NDP, "(x^2+x-6)/(x-2)", "x+3", "domain-violation", difficulty="easy",
   why="(x+3)(x-2)/(x-2) = x+3 for x != 2")
te("cancelling powers keeps the excluded point if a power of x remains below", "domain unchanged after cancellation",
   "x^2/x^3", "1/x", "valid-equivalence", why="both undefined exactly at 0", pair="dom-powcanc")
te("cancelling powers removes the excluded point if none remains below", NDP, "x^3/x^2", "x", "domain-violation",
   why="x^3/x^2 = x for x != 0; x is defined at 0", pair="dom-powcanc")
te("rationalising a denominator keeps the domain", NDP, "1/(sqrt(x)-1)", "(sqrt(x)+1)/(x-1)", "valid-equivalence", complexity=2,
   why="both require x >= 0 and x != 1; multiplying by (sqrt(x)+1)/(sqrt(x)+1) uses a positive factor", pair="dom-ratl")
te("cancelling a conjugate factor", NDP, "(x-1)/(sqrt(x)-1)", "sqrt(x)+1", "domain-violation", complexity=2,
   why="(sqrt(x)-1)(sqrt(x)+1)/(sqrt(x)-1) = sqrt(x)+1 for x >= 0, x != 1; next defined at 1", pair="dom-ratl")
te("cancelling the wrong conjugate factor", "value preservation", "(x-4)/(sqrt(x)-2)", "sqrt(x)-2", "invalid", complexity=2,
   why="x-4 = (sqrt(x)-2)(sqrt(x)+2), so the quotient is sqrt(x)+2; at x=0: 2 vs -2")
te("cancelling a conjugate factor", NDP, "(x-4)/(sqrt(x)-2)", "sqrt(x)+2", "domain-violation", complexity=2,
   why="equal for x >= 0, x != 4; sqrt(x)+2 is defined at 4")

# =====================================================================================================================
# 2. Rational equations: excluded candidates, clearing denominators
# =====================================================================================================================
ts("clearing denominators can create an excluded candidate", "solution-set preservation under multiplication by an expression",
   "x/(x-2)=2/(x-2)", "x=2", "valid-implication",
   why="prev has no solution (x=2 excluded); the cleared equation has {2}: every prev-solution (none) satisfies next, not conversely",
   pair="dom-rat-a")
ts("clearing denominators when the candidate is allowed", SSP, "x/(x-2)=3/(x-2)", "x=3", "valid-equivalence",
   why="x=3 makes the denominator 1; both sets are {3}", pair="dom-rat-a")
ts("cancelling before solving creates an excluded root", SSP, "(x^2-1)/(x-1)=2", "x+1=2", "valid-implication",
   why="x+1=2 gives x=1, which is excluded in prev, so prev has no solution", pair="dom-rat-b")
ts("cancelling with the excluded value assumed", "assumption-aware equivalence", "(x^2-1)/(x-1)=2", "x+1=2", "valid-equivalence",
   assumptions=["x != 1"], why="under x != 1 both statements have empty solution set", pair="dom-rat-b")
ts("cancelling before solving when the root is allowed", SSP, "(x^2-1)/(x-1)=3", "x+1=3", "valid-equivalence",
   why="x=2 is not excluded; both sets are {2}", pair="dom-rat-b")
ts("a fraction is zero iff its numerator is zero AND the denominator is not", SSP, "(x+3)/(x^2-9)=0", "x+3=0",
   "valid-implication", why="x=-3 zeroes the denominator too, so prev has no solution; next has {-3}", pair="dom-rat-c")
ts("a fraction is zero iff its numerator is zero (denominator never zero there)", SSP, "(x-1)/(x+2)=0", "x-1=0",
   "valid-equivalence", why="x=1 keeps the denominator 3; both sets are {1}", pair="dom-rat-c")
ts("excluding a numerator root that is also a pole", SSP, "(x^2-3x)/(x-3)=0", "x=0", "valid-equivalence",
   why="numerator roots 0 and 3; x=3 is excluded; solution set {0}", pair="dom-rat-d")
ts("keeping a numerator root that is a pole", SSP, "(x^2-3x)/(x-3)=0", "x=0 or x=3", "valid-implication",
   why="next admits x=3, which is not in the domain of prev", pair="dom-rat-d")
ts("multiplying by the LCD (x-1)(x+1)", SSP, "1/(x-1)+1/(x+1)=2/(x^2-1)", "(x+1)+(x-1)=2", "valid-implication",
   complexity=2, why="next gives x=1, excluded in prev; prev has no solution")
ts("multiplying by (x-3) produces the excluded candidate", SSP, "x/(x-3)=3/(x-3)+2", "x=3+2(x-3)", "valid-implication",
   complexity=2, why="next simplifies to x=3, excluded in prev; prev has no solution")
ts("dividing an equation by x loses x=0", SSP, "x^2=x", "x=1", "invalid", difficulty="easy",
   why="x=0 solves x^2=x but not x=1", pair="dom-divx")
ts("dividing by x is reversible when x != 0 is given", "assumption-aware equivalence", "x^2=x", "x=1", "valid-equivalence",
   assumptions=["x != 0"], difficulty="easy", why="under x != 0, x^2=x iff x=1", pair="dom-divx")
ts("parameter in the excluded value", "parameter condition left open", "(x-a)/(x-2)=0", "x=a", "insufficient-information",
   why="if a=2 the candidate is excluded and there is no solution; the step needs a != 2")
ts("dividing by a parameter", "parameter condition left open", "a x^2=a x", "x^2=x", "insufficient-information",
   why="valid only if a != 0; for a=0 every x is a solution of prev")

# =====================================================================================================================
# 3. Logarithm laws and their positivity conditions
# =====================================================================================================================
LOGP = "ln(a^n) = n ln a needs a > 0"
te(LOGP, "natural-domain preservation (narrowing)", "ln(x^2)", "2ln(x)", "invalid", difficulty="easy",
   why="ln(x^2) is defined at x=-1 (=0) but 2ln(-1) is not", pair="dom-lnsq")
te(LOGP + " (stated by assumption)", "assumption-aware equivalence", "ln(x^2)", "2ln(x)", "valid-equivalence",
   assumptions=["x > 0"], why="for x > 0 the power law applies", pair="dom-lnsq")
te("ln(x^2) = 2 ln|x| on x != 0", "even-power log law with absolute value", "ln(x^2)", "2ln(|x|)", "valid-equivalence",
   why="x^2 = |x|^2 and |x| > 0 for x != 0; both defined exactly for x != 0", pair="dom-lnsq")
te("ln(x^2) = 2 ln(-x) for negative x", "assumption-aware equivalence", "ln(x^2)", "2ln(-x)", "valid-equivalence",
   assumptions=["x < 0"], difficulty="hard", why="x^2 = (-x)^2 with -x > 0", pair="dom-lnsq")
te("ln(x^4) = 4ln|x|", "even-power log law with absolute value", "ln(x^4)", "4ln(|x|)", "valid-equivalence",
   why="x^4 = |x|^4, |x|>0 for x != 0", pair="dom-ln4")
te(LOGP, "natural-domain preservation (narrowing)", "ln(x^4)", "4ln(x)", "invalid", why="ln(x^4) defined at x=-1, 4ln(-1) is not",
   pair="dom-ln4")
te(LOGP + " (base 10)", "natural-domain preservation (narrowing)", "log10(x^2)", "2log10(x)", "invalid",
   why="log10(x^2) is defined for x=-1; log10(-1) is not")
te(LOGP + " (shifted base)", "natural-domain preservation (narrowing)", "ln((x-1)^2)", "2ln(x-1)", "invalid",
   why="ln((x-1)^2) defined at x=0 (=0); ln(-1) undefined")
te("ln(ab) = ln a + ln b needs a, b > 0", "natural-domain preservation (narrowing)", "ln(x(x-1))", "ln(x)+ln(x-1)", "invalid",
   why="at x=-1: ln(2) is defined, ln(-1) is not", pair="dom-lnprod")
te("ln(ab) = ln a + ln b with both factors positive", "assumption-aware equivalence", "ln(x(x-1))", "ln(x)+ln(x-1)",
   "valid-equivalence", assumptions=["x > 1"], why="for x > 1 both x and x-1 are positive", pair="dom-lnprod")
te("ln(ab) = ln a + ln b fails when both factors are negative", "assumption-aware equivalence", "ln(x(x-1))", "ln(x)+ln(x-1)",
   "invalid", assumptions=["x < 0"], difficulty="hard", why="for x<0 the product is positive but each factor is negative; ln(-1) undefined",
   pair="dom-lnprod")
te("ln(ab) = ln(-a) + ln(-b) when both factors are negative", "assumption-aware equivalence", "ln(x(x-1))", "ln(-x)+ln(1-x)",
   "valid-equivalence", assumptions=["x < 0"], difficulty="hard", why="x(x-1) = (-x)(1-x) with -x>0 and 1-x>0 for x<0",
   pair="dom-lnprod")
te("ln(ab) = ln a + ln b for a difference of squares, negative branch", "assumption-aware equivalence", "ln(x^2-4)",
   "ln(x-2)+ln(x+2)", "invalid", assumptions=["x < -2"], difficulty="hard", why="for x<-2 both x-2 and x+2 are negative; at x=-3: ln 5 vs undefined")
te("ln(a/b) = ln a - ln b needs a, b > 0", "natural-domain preservation (narrowing)", "ln(x/(x-1))", "ln(x)-ln(x-1)", "invalid",
   why="x/(x-1) = 1/2 > 0 at x=-1 but ln(-1) undefined")
te("splitting ln of a product with a positive constant", "log law with a positive constant factor", "ln(e^2 x)", "2+ln(x)",
   "valid-equivalence", why="e^2 > 0, so the domains (x>0) match and ln(e^2)=2")
te("combining logs of positive constant and x", "log law with a positive constant factor", "ln(x)+ln(2)", "ln(2x)", "valid-equivalence",
   difficulty="easy", why="both defined exactly for x>0")
te("log10 product law with a positive constant", "log law with a positive constant factor", "log10(100x)", "2+log10(x)",
   "valid-equivalence", why="100 > 0, domain x > 0 on both sides")
te("log2 quotient law with the sign of x given", "assumption-aware equivalence", "log2(8/x)", "3-log2(x)", "valid-equivalence",
   assumptions=["x > 0"], why="for x > 0, log2(8/x) = log2 8 - log2 x")
te("ln of a square root", "power law with a fractional exponent", "ln(sqrt(x))", "ln(x)/2", "valid-equivalence",
   why="both require x > 0 (sqrt(x)>0 iff x>0)")
te("ln(sqrt(x^2)) = ln|x|", "even root inside a log", "ln(sqrt(x^2))", "ln(|x|)", "valid-equivalence",
   why="sqrt(x^2) = |x|; both defined for x != 0", pair="dom-lnsqrt")
te("treating sqrt(x^2) as x inside a log", "natural-domain preservation (narrowing)", "ln(sqrt(x^2))", "ln(x)", "invalid",
   why="defined at x=-1 (value 0) but ln(-1) is not", pair="dom-lnsqrt")
te("ln and exp are inverse: ln(e^x) = x for all real x", "inverse-function domain", "ln(e^x)", "x", "valid-equivalence",
   difficulty="easy", why="e^x > 0 for all x", pair="dom-inv-exp")
te("e^(ln x) = x only for x > 0", "inverse-function domain", "e^(ln(x))", "x", "domain-violation", difficulty="easy",
   why="e^(ln x) is defined only for x > 0; x is defined everywhere", pair="dom-inv-exp")
te("rewriting x as e^(ln x) narrows the domain", "inverse-function domain", "x", "e^(ln(x))", "invalid",
   why="x is defined at -1, e^(ln(-1)) is not", pair="dom-inv-exp")
te("rewriting x as e^(ln x) for positive x", "assumption-aware equivalence", "x", "e^(ln(x))", "valid-equivalence",
   assumptions=["x > 0"], why="for x>0 the identity holds and both are defined", pair="dom-inv-exp")
te("2^(log2 x) = x only for x > 0", "inverse-function domain", "2^(log2(x))", "x", "domain-violation",
   why="prev requires x > 0", pair="dom-inv-2")
te("log10(10^x) = x for all real x", "inverse-function domain", "log10(10^x)", "x", "valid-equivalence",
   why="10^x > 0 for all x", pair="dom-inv-2")
te("e^(2 ln x) = x^2 only for x > 0", "inverse-function domain", "e^(2ln(x))", "x^2", "domain-violation",
   why="prev requires x>0; x^2 is defined everywhere")
te("e^(ln(x^2)) = x^2 only for x != 0", "inverse-function domain", "e^(ln(x^2))", "x^2", "domain-violation",
   why="prev excludes exactly x=0")
te("e^(ln(x)/2) = sqrt(x) only for x > 0", "inverse-function domain", "e^(ln(x)/2)", "sqrt(x)", "domain-violation",
   difficulty="hard", why="prev requires x > 0, sqrt(x) is also defined at 0")
te("ln(-x) is not -ln(x)", "value/domain preservation", "ln(-x)", "-ln(x)", "invalid",
   why="ln(-x) is defined at x=-1 (=0) while ln(-1) is not; the 'law' confuses ln(1/x) with ln(-x)")
te("(ln x)^2 is not 2 ln x", "value preservation", "ln(x)^2", "2ln(x)", "invalid", difficulty="easy",
   why="at x=e: 1 vs 2")
te("bare log: base not determined", "ambiguous notation", "log(100x)", "2+log(x)", "insufficient-information",
   why="log(100)=2 only if log means log10; with log = ln it is ln 100", notation="unfamiliar")

# log equations
ts("equating arguments of ln (both sides defined at the root)", SSP, "ln(x)=ln(2x-3)", "x=2x-3", "valid-equivalence",
   why="x=3 gives ln 3 = ln 3; both sets {3}", pair="dom-lneq-a")
ts("equating arguments of ln where the root is outside the domain", SSP, "ln(x-4)=ln(2x-1)", "x-4=2x-1", "valid-implication",
   why="x=-3 makes x-4 negative, so prev has no solution; next has {-3}", pair="dom-lneq-a")
ts("ln(x^2) = ln 4 keeps both signs", SSP, "ln(x^2)=ln(4)", "x^2=4", "valid-equivalence",
   why="x^2=4 > 0, both sets {-2,2}", pair="dom-lneq-b")
ts("ln(x^2) = ln 4 does not give only x = 2", SSP, "ln(x^2)=ln(4)", "x=2", "invalid", why="x=-2 also solves prev",
   pair="dom-lneq-b")
ts("replacing ln(x^2) by 2 ln x in an equation loses negative roots", SSP, "ln(x^2)=ln(4)", "2ln(x)=ln(4)", "invalid",
   why="x=-2 solves prev but 2ln(-2) is undefined", pair="dom-lneq-b")
ts("replacing 2 ln x by ln(x^2) admits negative roots", SSP, "2ln(x)=ln(4)", "ln(x^2)=ln(4)", "valid-implication",
   why="prev has {2}; next has {-2,2}", pair="dom-lneq-c")
ts("2 ln x = ln 4 squared form", SSP, "2ln(x)=ln(4)", "x^2=4", "valid-implication", why="prev {2}, next {-2,2}",
   pair="dom-lneq-c")
ts("2 ln x = ln 4 solved respecting x > 0", SSP, "2ln(x)=ln(4)", "x=2", "valid-equivalence", why="x>0 forces x=2",
   pair="dom-lneq-c")
ts("combining ln x + ln(x+3) widens the domain", SSP, "ln(x)+ln(x+3)=ln(4)", "ln(x^2+3x)=ln(4)", "valid-implication",
   complexity=2, why="next has {1,-4}; -4 is not in the domain of prev (prev set {1})", pair="dom-lneq-d")
ts("splitting ln(x^2+3x) into ln x + ln(x+3) narrows the domain", SSP, "ln(x^2+3x)=ln(4)", "ln(x)+ln(x+3)=ln(4)", "invalid",
   complexity=2, why="x=-4 solves prev (ln 4 = ln 4) but ln(-4) is undefined", pair="dom-lneq-d")
ts("solving ln x + ln(x+3) = ln 4 correctly", SSP, "ln(x)+ln(x+3)=ln(4)", "x=1", "valid-equivalence", complexity=2,
   why="x(x+3)=4 with x>0 gives x=1 only", pair="dom-lneq-d")
ts("quotient law in an equation", SSP, "ln(x-1)-ln(x+1)=ln(2)", "(x-1)/(x+1)=2", "valid-implication", complexity=2,
   why="next gives x=-3, where ln(x-1) is undefined; prev has no solution")

# =====================================================================================================================
# 4. Radicals: even and odd roots
# =====================================================================================================================
SQ = "sqrt(x^2) = |x|"
te(SQ, "even root of an even power", "sqrt(x^2)", "|x|", "valid-equivalence", difficulty="easy", why="the principal root is non-negative",
   pair="dom-sqsq")
te(SQ + " (not x)", "even root of an even power", "sqrt(x^2)", "x", "invalid", difficulty="easy", why="x=-1: 1 vs -1", pair="dom-sqsq")
te(SQ + " with x > 0 assumed", "assumption-aware equivalence", "sqrt(x^2)", "x", "valid-equivalence", assumptions=["x > 0"],
   difficulty="easy", why="|x| = x for x > 0", pair="dom-sqsq")
te(SQ + " with x < 0 assumed", "assumption-aware equivalence", "sqrt(x^2)", "-x", "valid-equivalence", assumptions=["x < 0"],
   why="|x| = -x for x < 0", pair="dom-sqsq")
te("sqrt(x^4) = x^2 (even power is already non-negative)", "even root of an even power", "sqrt(x^4)", "x^2", "valid-equivalence",
   why="x^2 >= 0, so no absolute value is needed", pair="dom-sq46")
te("sqrt(x^6) is |x|^3, not x^3", "even root of an even power", "sqrt(x^6)", "x^3", "invalid", why="x=-1: 1 vs -1", pair="dom-sq46")
te("sqrt(x^6) = |x|^3", "even root of an even power", "sqrt(x^6)", "|x|^3", "valid-equivalence", why="sqrt((x^3)^2) = |x^3| = |x|^3",
   pair="dom-sq46")
te("sqrt(4x^2) = 2|x|", "even root of an even power", "sqrt(4x^2)", "2|x|", "valid-equivalence", why="sqrt(4) sqrt(x^2) with both factors >= 0",
   pair="dom-sq4")
te("sqrt(4x^2) is not 2x", "even root of an even power", "sqrt(4x^2)", "2x", "invalid", why="x=-1: 2 vs -2", pair="dom-sq4")
te("sqrt((x-3)^2) = |x-3|", "even root of an even power", "sqrt((x-3)^2)", "|x-3|", "valid-equivalence", why="principal root",
   pair="dom-sqshift")
te("sqrt((x-3)^2) is not x-3", "even root of an even power", "sqrt((x-3)^2)", "x-3", "invalid", why="x=0: 3 vs -3", pair="dom-sqshift")
te("recognising a perfect square under the root, sign lost", "even root of an even power", "sqrt(x^2-2x+1)", "x-1", "invalid",
   complexity=2, why="sqrt((x-1)^2) = |x-1|; x=0: 1 vs -1")
te("sqrt of a numeric square", "principal root", "sqrt((-3)^2)", "-3", "invalid", difficulty="easy", why="sqrt(9) = 3", pair="dom-sqnum")
te("sqrt of a numeric square", "principal root", "sqrt((-3)^2)", "3", "valid-equivalence", difficulty="easy", why="sqrt(9) = 3",
   pair="dom-sqnum")
te("(sqrt x)^2 = x only for x >= 0", "natural-domain preservation (widening)", "sqrt(x)^2", "x", "domain-violation", difficulty="easy",
   why="prev requires x >= 0", pair="dom-sqrtsq")
te("writing x as (sqrt x)^2 narrows the domain", "natural-domain preservation (narrowing)", "x", "sqrt(x)^2", "invalid",
   difficulty="easy", why="x=-1 is lost", pair="dom-sqrtsq")
te("writing x as (sqrt x)^2 for positive x", "assumption-aware equivalence", "x", "sqrt(x)^2", "valid-equivalence",
   assumptions=["x > 0"], why="both defined and equal for x > 0", pair="dom-sqrtsq")
te("(sqrt(-x))^2 = -x only for x <= 0", "natural-domain preservation (widening)", "sqrt(-x)^2", "-x", "domain-violation",
   why="prev requires x <= 0")
te("sqrt(ab) = sqrt a sqrt b needs a, b >= 0", "natural-domain preservation (narrowing)", "sqrt(x(x-1))", "sqrt(x)sqrt(x-1)", "invalid",
   why="at x=-1: sqrt(2) is defined, sqrt(-1) is not", pair="dom-sqprod")
te("odd roots split over products for all reals", "odd roots have no sign condition", "cbrt(x(x-1))", "cbrt(x)cbrt(x-1)",
   "valid-equivalence", why="cube root is defined and multiplicative on all of R", pair="dom-sqprod")
te("sqrt a sqrt b = sqrt(ab) with both radicands non-negative", "assumption-aware equivalence", "sqrt(x)sqrt(x-1)", "sqrt(x(x-1))",
   "valid-equivalence", assumptions=["x >= 1"], why="for x >= 1 both radicands are >= 0", pair="dom-sqprod")
te("combining sqrt a sqrt b into sqrt(ab) widens the domain", "natural-domain preservation (widening)", "sqrt(x)sqrt(x-1)",
   "sqrt(x(x-1))", "domain-violation", pair="dom-sqprod", difficulty="hard",
   why="prev defined for x >= 1, next for x <= 0 or x >= 1; equal on x >= 1. Uncertified: the oracle's zero test cannot "
       "prove sqrt(x)sqrt(x-1) - sqrt(x^2-x) = 0 on x >= 1 without an assumption (sign-dependent radical identity)")
te("cube roots combine for all reals", "odd roots have no sign condition", "cbrt(x)cbrt(x-1)", "cbrt(x(x-1))", "valid-equivalence",
   why="real cube root is multiplicative on R")
te("sqrt(a/b) = sqrt a / sqrt b needs a >= 0, b > 0", "natural-domain preservation (narrowing)", "sqrt(x/(x+1))", "sqrt(x)/sqrt(x+1)",
   "invalid", why="at x=-2: sqrt(2) defined, sqrt(-2) not")
te("sqrt a / sqrt b = sqrt(a/b) with radicands known non-negative", "assumption-aware equivalence", "sqrt(x-2)/sqrt(x+2)",
   "sqrt((x-2)/(x+2))", "valid-equivalence", assumptions=["x >= 2"], why="for x >= 2 both radicands are >= 0 and x+2 > 0")
te("cbrt(x^3) = x for every real x", "odd root of an odd power", "cbrt(x^3)", "x", "valid-equivalence", why="odd root inverts odd power on R",
   pair="dom-oddeven")
te("(cbrt x)^3 = x for every real x", "odd root of an odd power", "cbrt(x)^3", "x", "valid-equivalence", why="no domain restriction",
   pair="dom-oddeven")
te("odd root of a negative number", "odd roots of negatives are real", "cbrt(-8)", "-2", "valid-equivalence", difficulty="easy",
   why="(-2)^3 = -8")
te("x^(1/2) is the square root", "fractional exponent with even denominator", "x^(1/2)", "sqrt(x)", "valid-equivalence",
   difficulty="easy", why="both defined for x >= 0")
te("1/sqrt(x) rationalised", "radical in a denominator", "1/sqrt(x)", "sqrt(x)/x", "valid-equivalence", why="both need x > 0",
   pair="dom-sqrtden")
te("x/sqrt(x) = sqrt(x) only for x > 0", "radical in a denominator", "x/sqrt(x)", "sqrt(x)", "domain-violation",
   why="prev excludes 0, sqrt(x) is defined at 0", pair="dom-sqrtden")
te("sqrt(x)/x simplified", "radical in a denominator", "sqrt(x)/x", "1/sqrt(x)", "valid-equivalence", why="both defined for x > 0")
te("sqrt((ln x)^2) = |ln x|", "even root of an even power", "sqrt(ln(x)^2)", "ln(x)", "invalid", difficulty="hard",
   why="at x=1/e: sqrt(1)=1 vs -1")
te("|x|/x is the sign function", "absolute value over its argument", "|x|/x", "1", "invalid", why="x=-1 gives -1", pair="dom-sgn")
te("|x|/x = 1 for positive x", "assumption-aware equivalence", "|x|/x", "1", "valid-equivalence", assumptions=["x > 0"],
   why="|x| = x for x>0", pair="dom-sgn")
te("x/|x| = -1 for negative x", "assumption-aware equivalence", "x/|x|", "-1", "valid-equivalence", assumptions=["x < 0"],
   why="|x| = -x for x<0", pair="dom-sgn")

# radical equations
ts("squaring a product of roots widens the domain", SSP, "sqrt(x)sqrt(x-3)=2", "x(x-3)=4", "valid-implication",
   why="next {4,-1}; x=-1 is outside x >= 3; prev {4}", pair="dom-sqeq-a")
ts("squaring a single root keeps the set when the RHS is positive", SSP, "sqrt(x(x-3))=2", "x(x-3)=4", "valid-equivalence",
   why="x(x-3)=4 forces the radicand to be 4 > 0; both sets {4,-1}", pair="dom-sqeq-a")
ts("merging roots inside an equation", SSP, "sqrt(x)sqrt(x-3)=2", "sqrt(x(x-3))=2", "valid-implication",
   why="next admits x=-1 (sqrt(4)=2) which prev does not", pair="dom-sqeq-a")
ts("square root equal to a negative number has no solution", SSP, "sqrt(x)=-2", "x=4", "valid-implication", difficulty="easy",
   why="sqrt(x) >= 0, so prev is empty; next is {4}", pair="dom-oddeq")
ts("cube root equal to a negative number", "odd roots of negatives are real", "cbrt(x)=-2", "x=-8", "valid-equivalence",
   difficulty="easy", why="cubing is a bijection of R", pair="dom-oddeq")
ts("equal square roots: root inside both domains", SSP, "sqrt(x+1)=sqrt(2x-3)", "x+1=2x-3", "valid-equivalence",
   why="x=4: both radicands 5 >= 0", pair="dom-sqeq-b")
ts("equal square roots: candidate outside both domains", SSP, "sqrt(x-5)=sqrt(3-x)", "x-5=3-x", "valid-implication",
   why="prev requires x>=5 and x<=3: empty; next {4}", pair="dom-sqeq-b")

# trig poles inside domain questions
te("tan x cos x = sin x only where cos x != 0", "pole of tan removed", "tan(x)cos(x)", "sin(x)", "domain-violation",
   why="prev undefined at x=pi/2, sin defined there", pair="dom-tancos")
te("writing sin x as tan x cos x introduces poles", "pole of tan introduced", "sin(x)", "tan(x)cos(x)", "invalid",
   assumptions=["0 < x", "x < pi"], why="x=pi/2 lies in (0,pi): sin defined, tan undefined", pair="dom-tancos")
te("writing sin x as tan x cos x on an interval without poles", "assumption-aware equivalence", "sin(x)", "tan(x)cos(x)",
   "valid-equivalence", assumptions=["0 < x", "x < pi/2"], why="cos x > 0 on (0,pi/2)", pair="dom-tancos")
te("sec x cos x = 1 only where cos x != 0", "pole of sec removed", "sec(x)cos(x)", "1", "domain-violation",
   why="prev undefined at pi/2")
te("cot x tan x = 1 only where both are defined", "poles of tan and cot removed", "cot(x)tan(x)", "1", "domain-violation",
   why="prev undefined at multiples of pi/2")
te("1/tan x = cot x widens at odd multiples of pi/2", "poles of tan and cot", "1/tan(x)", "cot(x)", "domain-violation",
   difficulty="hard", why="1/tan x undefined at pi/2 (tan undefined); cot(pi/2)=0", pair="dom-cottan")
te("cot x = 1/tan x narrows at odd multiples of pi/2", "poles of tan and cot", "cot(x)", "1/tan(x)", "invalid",
   difficulty="hard", why="cot(pi/2)=0 defined, 1/tan(pi/2) undefined", pair="dom-cottan")
te("tan x / sin x = sec x only where sin x != 0", "pole introduced by dividing by sin", "tan(x)/sin(x)", "sec(x)", "domain-violation",
   why="prev undefined at x=0 (division by sin 0); sec 0 = 1")
te("dividing by sin x then rewriting", "assumption-aware equivalence", "tan(x)/sin(x)", "1/cos(x)", "valid-equivalence",
   assumptions=["0 < x", "x < pi/2"], why="on (0,pi/2) sin and cos are positive")
te("1/(1+tan^2 x) = cos^2 x only where tan is defined", "pole of tan removed", "1/(1+tan(x)^2)", "cos(x)^2", "domain-violation",
   why="prev undefined at pi/2 where cos^2 = 0 is defined")
te("sin(arcsin x) = x on [-1,1] only", "inverse-function domain", "sin(asin(x))", "x", "domain-violation",
   why="prev is defined only for |x| <= 1", pair="dom-asin")
te("arcsin(sin x) is not x", "inverse-function range", "asin(sin(x))", "x", "invalid", why="x=pi: arcsin(0)=0 != pi", pair="dom-asin")
ts("tan x cos x = 1: candidate where tan is undefined", "solution-set preservation with excluded values", "tan(x)cos(x)=1",
   "sin(x)=1", "valid-implication", assumptions=["0 <= x", "x < 2*pi"],
   why="sin x = 1 only at pi/2 in [0,2pi), where tan is undefined; prev empty, next {pi/2}")

# notation / ambiguity
te("1/2x is ambiguous", "ambiguous notation", "1/2x", "1/(2x)", "insufficient-information", notation="unfamiliar",
   why="1/2x may mean x/2 (defined at 0) or 1/(2x) (undefined at 0); the domain itself depends on the reading")

# =====================================================================================================================
# 5. Workings (multi-line): restrictions stated or omitted
# =====================================================================================================================
S = "solve"
W(C, "clearing denominators requires stating the excluded value", "excluded-value obligation",
  {"type": S, "statement": "x/(x-2)=3/(x-2)"}, ["x=3"], "domain-violation", answer="x=3", pair="dom-w-rat1", difficulty="easy",
  why="answer correct, but denominators were cleared without stating x != 2")
W(C, "clearing denominators with the excluded value stated", "excluded-value obligation",
  {"type": S, "statement": "x/(x-2)=3/(x-2)"}, ["x != 2", "x=3"], "valid-equivalence", answer="x=3", pair="dom-w-rat1",
  difficulty="easy", why="restriction stated; x=3 is allowed", oracle_lines=["restrict: x != 2", "x=3"])
W(C, "an excluded candidate must be rejected", "excluded-value obligation", {"type": S, "statement": "x/(x-2)=2/(x-2)"},
  ["x=2"], "invalid", answer="no solution", pair="dom-w-rat2", difficulty="easy",
  why="x=2 makes the denominators zero; the equation has no solution")
W(C, "an excluded candidate must be rejected", "excluded-value obligation", {"type": S, "statement": "x/(x-2)=2/(x-2)"},
  ["x != 2", "x=2", "but x=2 is excluded, so there is no solution"], "valid-implication", answer="no solution", pair="dom-w-rat2",
  difficulty="easy", why="restriction stated, cleared equation solved, the only candidate rejected",
  oracle_lines=["restrict: x != 2", "x=2", "empty"])
W(C, "cancelling before solving then accepting the hole", "excluded-value obligation", {"type": S, "statement": "(x^2-1)/(x-1)=2"},
  ["x+1=2", "x=1"], "invalid", answer="no solution", pair="dom-w-rat3", why="x=1 is excluded by the original denominator")
W(C, "cancelling with the restriction and rejecting the hole", "excluded-value obligation", {"type": S, "statement": "(x^2-1)/(x-1)=2"},
  ["x != 1", "x+1=2", "x=1", "x=1 is excluded, so no solution"], "valid-implication", answer="no solution", pair="dom-w-rat3",
  why="restriction carried from line 1 to the conclusion", oracle_lines=["restrict: x != 1", "x+1=2", "x=1", "empty"])
W(C, "LCD clearing yields only an excluded candidate", "restriction carried through several lines",
  {"type": S, "statement": "1/(x-1)+1/(x+1)=2/(x^2-1)"},
  ["x != 1 and x != -1", "(x+1)+(x-1)=2", "2x=2", "x=1", "x=1 is excluded: no solution"], "valid-implication", answer="no solution",
  pair="dom-w-rat4", complexity=3, why="restriction stated first and applied at the end",
  oracle_lines=["restrict: x != 1 and x != -1", "(x+1)+(x-1)=2", "2x=2", "x=1", "empty"])
W(C, "LCD clearing yields only an excluded candidate", "restriction carried through several lines",
  {"type": S, "statement": "1/(x-1)+1/(x+1)=2/(x^2-1)"}, ["(x+1)+(x-1)=2", "2x=2", "x=1"], "invalid", answer="no solution",
  pair="dom-w-rat4", complexity=3, why="x=1 makes x-1 and x^2-1 zero; the true solution set is empty")
W(C, "clearing (x-3) produces the excluded value", "excluded-value obligation", {"type": S, "statement": "x/(x-3)=3/(x-3)+2"},
  ["x=3+2(x-3)", "x=2x-3", "x=3"], "invalid", answer="no solution", pair="dom-w-rat5", complexity=2, why="x=3 is excluded")
W(C, "clearing (x-3) with the restriction carried", "restriction carried through several lines",
  {"type": S, "statement": "x/(x-3)=3/(x-3)+2"},
  ["x != 3", "x=3+2(x-3)", "x=2x-3", "x=3", "this is excluded, so no solution"], "valid-implication", answer="no solution",
  pair="dom-w-rat5", complexity=3, why="the restriction stated on line 1 rejects the only candidate",
  oracle_lines=["restrict: x != 3", "x=3+2(x-3)", "x=2x-3", "x=3", "empty"])
W(C, "zero numerator that is also a pole", "excluded-value obligation", {"type": S, "statement": "(x^2-3x)/(x-3)=0"},
  ["x(x-3)=0", "x=0 or x=3"], "invalid", answer="x=0", pair="dom-w-rat6", why="x=3 is excluded; only x=0 solves")
W(C, "zero numerator that is also a pole", "excluded-value obligation", {"type": S, "statement": "(x^2-3x)/(x-3)=0"},
  ["x != 3", "x(x-3)=0", "x=0 or x=3", "reject x=3 (excluded)", "x=0"], "valid-implication", answer="x=0", pair="dom-w-rat6",
  complexity=2, why="restriction stated and the excluded root rejected",
  oracle_lines=["restrict: x != 3", "x(x-3)=0", "x=0 or x=3", None, "x=0"])
W(C, "rational equation with two denominators", "restriction carried through several lines",
  {"type": S, "statement": "3/(x-1)=x/(x-1)+1"}, ["3=x+(x-1)", "2x=4", "x=2"], "domain-violation", answer="x=2", complexity=2,
  why="x=2 is correct, but x != 1 was never stated when the denominators were cleared", pair="dom-w-rat7")
W(C, "rational equation with two denominators", "restriction carried through several lines",
  {"type": S, "statement": "3/(x-1)=x/(x-1)+1"}, ["x != 1", "3=x+(x-1)", "2x=4", "x=2"], "valid-equivalence", answer="x=2",
  complexity=2, why="restriction stated; candidate allowed", pair="dom-w-rat7",
  oracle_lines=["restrict: x != 1", "3=x+(x-1)", "2x=4", "x=2"])
W(C, "dividing by x loses the root x = 0", "solution-set preservation under division", {"type": S, "statement": "x^3=4x"},
  ["x^2=4", "x=2 or x=-2"], "invalid", answer="x=0, 2 or -2", pair="dom-w-divx", why="x=0 is a root lost by dividing by x")
W(C, "factoring instead of dividing keeps x = 0", "solution-set preservation under division", {"type": S, "statement": "x^3=4x"},
  ["x^3-4x=0", "x(x-2)(x+2)=0", "x=0, 2 or -2"], "valid-equivalence", answer="x=0, 2 or -2", pair="dom-w-divx",
  why="every step is reversible")

# log equations
W(C, "combining logs then checking the domain", "domain check after widening", {"type": S, "statement": "ln(x)+ln(x-2)=ln(3)"},
  ["ln(x(x-2))=ln(3)", "x^2-2x-3=0", "x=3 or x=-1", "reject x=-1 since ln(-1) is undefined", "x=3"], "valid-implication", answer="x=3",
  pair="dom-w-log1", complexity=3, why="the product law widens the domain; the extraneous candidate is checked and rejected",
  oracle_lines=["ln(x(x-2))=ln(3)", "x^2-2x-3=0", "x=3 or x=-1", None, "x=3"])
W(C, "combining logs and keeping an out-of-domain root", "domain check after widening",
  {"type": S, "statement": "ln(x)+ln(x-2)=ln(3)"}, ["ln(x(x-2))=ln(3)", "x^2-2x-3=0", "x=3 or x=-1"], "invalid", answer="x=3",
  pair="dom-w-log1", complexity=3, why="x=-1 is not in the domain of ln(x)")
W(C, "dropping an out-of-domain root silently", "domain check after widening", {"type": S, "statement": "ln(x)+ln(x-2)=ln(3)"},
  ["ln(x(x-2))=ln(3)", "x^2-2x-3=0", "x=3 or x=-1", "x=3"], "domain-violation", answer="x=3", pair="dom-w-log1", complexity=3,
  why="final answer correct but -1 is dropped with no stated reason or check")
W(C, "replacing 2ln x by ln(x^2) admits a negative root", "domain check after widening", {"type": S, "statement": "2ln(x)=ln(9)"},
  ["ln(x^2)=ln(9)", "x^2=9", "x=3 or x=-3"], "invalid", answer="x=3", pair="dom-w-log2", why="x=-3 is outside the domain of ln x")
W(C, "replacing 2ln x by ln(x^2) and checking", "domain check after widening", {"type": S, "statement": "2ln(x)=ln(9)"},
  ["ln(x^2)=ln(9)", "x^2=9", "x=3 or x=-3", "x must be positive for ln(x), so reject x=-3", "x=3"], "valid-implication",
  answer="x=3", pair="dom-w-log2", why="extraneous negative root explicitly rejected",
  oracle_lines=["ln(x^2)=ln(9)", "x^2=9", "x=3 or x=-3", None, "x=3"])
W(C, "replacing ln(x^2) by 2ln x loses a root", "solution-set preservation (narrowing)", {"type": S, "statement": "ln(x^2)=ln(9)"},
  ["2ln(x)=ln(9)", "ln(x)=ln(3)", "x=3"], "invalid", answer="x=3 or x=-3", pair="dom-w-log3", why="x=-3 also solves ln(x^2)=ln 9")
W(C, "ln(x^2) = ln 9 solved without narrowing", "solution-set preservation (narrowing)", {"type": S, "statement": "ln(x^2)=ln(9)"},
  ["x^2=9", "x=3 or x=-3"], "valid-equivalence", answer="x=3 or x=-3", pair="dom-w-log3", why="ln is injective on (0,inf) and x^2=9>0")
W(C, "quotient law produces an out-of-domain candidate", "domain check after widening",
  {"type": S, "statement": "ln(x-1)-ln(x+1)=ln(2)"},
  ["ln(x-1)=ln(2)+ln(x+1)", "ln(x-1)=ln(2x+2)", "x-1=2x+2", "x=-3", "check: ln(-4) is undefined, so reject", "no solution"],
  "valid-implication", answer="no solution", pair="dom-w-log4", complexity=3,
  why="dropping the logs widens the domain; the only candidate fails the domain check",
  oracle_lines=["ln(x-1)=ln(2)+ln(x+1)", "ln(x-1)=ln(2x+2)", "x-1=2x+2", "x=-3", None, "empty"])
W(C, "quotient law produces an out-of-domain candidate", "domain check after widening",
  {"type": S, "statement": "ln(x-1)-ln(x+1)=ln(2)"}, ["ln(x-1)=ln(2)+ln(x+1)", "ln(x-1)=ln(2x+2)", "x-1=2x+2", "x=-3"], "invalid",
  answer="no solution", pair="dom-w-log4", complexity=3, why="x=-3 makes ln(x-1) undefined")
W(C, "log product law with a domain check", "domain check after widening", {"type": S, "statement": "ln(x)+ln(x+21)=ln(100)"},
  ["ln(x(x+21))=ln(100)", "x^2+21x-100=0", "(x+25)(x-4)=0", "x=-25 or x=4", "reject x=-25 (log of a negative)", "x=4"],
  "valid-implication", answer="x=4", complexity=4, difficulty="hard",
  why="x(x+21)=100 gives -25 and 4; -25 is outside the domain",
  oracle_lines=["ln(x(x+21))=ln(100)", "x^2+21x-100=0", "(x+25)(x-4)=0", "x=-25 or x=4", None, "x=4"])
W(C, "domain of a sum of roots is empty", "domain-first reasoning", {"type": S, "statement": "sqrt(x-4)+sqrt(2-x)=1"},
  ["need x >= 4 and x <= 2, impossible", "no solution"], "valid-equivalence", answer="no solution", pair="dom-w-emptydom",
  why="the natural domain is empty, so the solution set is empty", oracle_lines=[None, "empty"])
W(C, "domain of a sum of roots is empty", "domain-first reasoning", {"type": S, "statement": "sqrt(x-4)+sqrt(2-x)=1"},
  ["x-4=0 gives a nice value", "x=4"], "invalid", answer="no solution", pair="dom-w-emptydom",
  why="at x=4 the term sqrt(2-4) is undefined", oracle_lines=[None, "x=4"])
W(C, "merging square roots then squaring", "domain check after widening", {"type": S, "statement": "sqrt(x)sqrt(x-3)=2"},
  ["x(x-3)=4", "x^2-3x-4=0", "x=4 or x=-1", "check x=-1: sqrt(-1) undefined, reject", "x=4"], "valid-implication", answer="x=4",
  pair="dom-w-sqprod", complexity=3, why="squaring widens; -1 rejected by the check",
  oracle_lines=["x(x-3)=4", "x^2-3x-4=0", "x=4 or x=-1", None, "x=4"])
W(C, "merging square roots then squaring", "domain check after widening", {"type": S, "statement": "sqrt(x)sqrt(x-3)=2"},
  ["x(x-3)=4", "x^2-3x-4=0", "x=4 or x=-1"], "invalid", answer="x=4", pair="dom-w-sqprod", complexity=3,
  why="x=-1 makes sqrt(x) undefined")
W(C, "merging square roots then squaring", "domain check after widening", {"type": S, "statement": "sqrt(x)sqrt(x-3)=2"},
  ["x(x-3)=4", "x^2-3x-4=0", "x=4 or x=-1", "x=4"], "domain-violation", answer="x=4", pair="dom-w-sqprod", complexity=3,
  why="correct final answer but the candidate -1 is dropped without a stated check")
W(C, "tan-cos product equation with an excluded candidate", "excluded-value obligation",
  {"type": S, "statement": "tan(x)cos(x)=1"}, ["sin(x)=1", "x=pi/2"], "invalid", answer="no solution", assumptions=["0 <= x", "x < 2*pi"],
  pair="dom-w-tan", why="tan(pi/2) is undefined; there is no solution in [0,2pi)")
W(C, "tan-cos product equation with an excluded candidate", "excluded-value obligation",
  {"type": S, "statement": "tan(x)cos(x)=1"},
  ["sin(x)=1", "x=pi/2", "but tan(pi/2) is undefined, so reject: no solution"], "valid-implication", answer="no solution",
  assumptions=["0 <= x", "x < 2*pi"], pair="dom-w-tan", why="candidate checked against the domain of tan",
  oracle_lines=["sin(x)=1", "x=pi/2", "empty"])
W(C, "parameter in the excluded value", "parameter condition left open", {"type": S, "statement": "(x-a)/(x-2)=0"},
  ["x-a=0", "x=a"], "insufficient-information", answer="x=a if a != 2; no solution if a=2",
  why="the answer depends on whether a = 2, which the working never addresses")

# simplify / evaluate chains
SIM = "simplify"
W(C, CANC, "excluded-value obligation", {"type": SIM, "start": "(x^2-9)/(x^2+3x)"}, ["(x-3)(x+3)/(x(x+3))", "(x-3)/x"],
  "domain-violation", answer="(x-3)/x, x != -3", pair="dom-w-s1", why="x=-3 excluded originally but not after cancelling; not stated")
W(C, CANC, "excluded-value obligation", {"type": SIM, "start": "(x^2-9)/(x^2+3x)"},
  ["(x-3)(x+3)/(x(x+3))", "x != -3", "(x-3)/x"], "valid-equivalence", answer="(x-3)/x, x != -3", pair="dom-w-s1",
  why="restriction stated; x=0 remains excluded by the result", oracle_lines=["(x-3)(x+3)/(x(x+3))", "restrict: x != -3", "(x-3)/x"])
W(C, "cancelling one copy of a repeated factor needs no extra restriction", "non-removable singularity survives cancellation",
  {"type": SIM, "start": "(x^2-4)/(x^2-4x+4)"}, ["(x-2)(x+2)/(x-2)^2", "(x+2)/(x-2)"], "valid-equivalence", answer="(x+2)/(x-2)",
  pair="dom-w-s1", difficulty="hard", why="x=2 stays excluded by the remaining factor, so no restriction is lost")
W(C, CANC + " (stopping before cancelling)", "task completion", {"type": SIM, "start": "(x^2-9)/(x^2+3x)"},
  ["(x-3)(x+3)/(x(x+3))"], "incomplete", answer="(x-3)/x, x != -3", pair="dom-w-s1",
  why="the common factor (x+3) is still present; nothing false")
W(C, "stating only one of two needed restrictions", "completeness of stated restrictions", {"type": SIM, "start": "(x^3-x)/(x^2-x)"},
  ["x(x-1)(x+1)/(x(x-1))", "x != 0", "x+1"], "domain-violation", answer="x+1, x != 0, 1", pair="dom-w-s2", difficulty="hard",
  why="x=1 is also excluded from the original expression but the stated restriction omits it. [oracle-dispute] the oracle "
      "accepts any stated '!=' restriction as sufficient; it does not check that x != 1 is missing",
  oracle_lines=["x(x-1)(x+1)/(x(x-1))", "restrict: x != 0", "x+1"])
W(C, "stating all needed restrictions", "completeness of stated restrictions", {"type": SIM, "start": "(x^3-x)/(x^2-x)"},
  ["x(x-1)(x+1)/(x(x-1))", "x != 0 and x != 1", "x+1"], "valid-equivalence", answer="x+1, x != 0, 1", pair="dom-w-s2",
  why="both zeros of the cancelled factor are stated", oracle_lines=["x(x-1)(x+1)/(x(x-1))", "restrict: x != 0 and x != 1", "x+1"])
W(C, "sqrt(x^2) treated as x", "even root of an even power", {"type": SIM, "start": "sqrt(x^2)/x"}, ["x/x", "1"], "invalid",
  answer="|x|/x", pair="dom-w-s3", why="sqrt(x^2) = |x|; at x=-1 the value is -1, not 1")
W(C, "sqrt(x^2) = x for positive x", "assumption-aware simplification", {"type": SIM, "start": "sqrt(x^2)/x"}, ["x/x", "1"],
  "valid-equivalence", assumptions=["x > 0"], answer="1", pair="dom-w-s3", why="for x>0, |x| = x and x != 0")
W(C, "log of a square with the absolute value kept", "even-power log law with absolute value",
  {"type": SIM, "start": "ln(x^2)/2"}, ["2ln(|x|)/2", "ln(|x|)"], "valid-equivalence", answer="ln|x|",
  pair="dom-w-s4", why="ln(x^2) = 2ln|x| for x != 0")
W(C, "log of a square with the absolute value dropped", "even-power log law with absolute value",
  {"type": SIM, "start": "ln(x^2)/2"}, ["2ln(x)/2", "ln(x)"], "invalid", answer="ln|x|", pair="dom-w-s4",
  why="line 1 is undefined for x<0 although the start is defined there (at x=-1 the start is 0)")
W(C, "inverse functions with restricted domains", "inverse-function domain", {"type": SIM, "start": "e^(ln(x))+ln(e^x)"},
  ["x+x", "2x"], "domain-violation", answer="2x, x > 0", pair="dom-w-s5", why="e^(ln x) requires x > 0, never stated")
W(C, "inverse functions with restricted domains", "inverse-function domain", {"type": SIM, "start": "e^(ln(x))+ln(e^x)"},
  ["x+x", "2x"], "valid-equivalence", assumptions=["x > 0"], answer="2x", pair="dom-w-s5", why="with x > 0 assumed all steps are identities")
W(C, "pole of tan removed in a sum", "pole of tan removed", {"type": SIM, "start": "tan(x)cos(x)+sin(x)"}, ["sin(x)+sin(x)", "2sin(x)"],
  "domain-violation", answer="2sin x, cos x != 0", pair="dom-w-s6", why="tan x cos x = sin x only where cos x != 0")
W(C, "pole of tan removed in a sum", "pole of tan removed", {"type": SIM, "start": "tan(x)cos(x)+sin(x)"},
  ["sin(x)+sin(x)", "cos(x) != 0", "2sin(x)"], "valid-equivalence", answer="2sin x, cos x != 0", pair="dom-w-s6",
  why="restriction stated", oracle_lines=["sin(x)+sin(x)", "restrict: cos(x) != 0", "2sin(x)"])
W(C, "compound fraction cancellation", "restriction carried through several lines", {"type": SIM, "start": "(1/x-1)/(1-x)"},
  ["((1-x)/x)/(1-x)", "1/x"], "domain-violation", answer="1/x, x != 1", pair="dom-w-s7", complexity=2,
  why="x=1 is excluded from the start (division by 1-x) but not from 1/x")
W(C, "compound fraction cancellation", "restriction carried through several lines", {"type": SIM, "start": "(1/x-1)/(1-x)"},
  ["((1-x)/x)/(1-x)", "x != 1", "1/x"], "valid-equivalence", answer="1/x, x != 1", pair="dom-w-s7", complexity=2,
  why="restriction stated", oracle_lines=["((1-x)/x)/(1-x)", "restrict: x != 1", "1/x"])
W(C, "division of fractions over several lines", "restriction carried through several lines",
  {"type": SIM, "start": "((x+1)/(x-1))/((x+1)/(x+2))"},
  ["((x+1)/(x-1))((x+2)/(x+1))", "(x+1)(x+2)/((x-1)(x+1))", "(x+2)/(x-1)"], "domain-violation", answer="(x+2)/(x-1), x != -1, -2",
  pair="dom-w-s8", complexity=3, difficulty="hard", why="the hidden exclusions x=-2 and x=-1 disappear without being stated")
W(C, "division of fractions over several lines", "restriction carried through several lines",
  {"type": SIM, "start": "((x+1)/(x-1))/((x+1)/(x+2))"},
  ["x != 1, x != -2 and x != -1", "((x+1)/(x-1))((x+2)/(x+1))", "(x+1)(x+2)/((x-1)(x+1))", "(x+2)/(x-1)"], "valid-equivalence",
  answer="(x+2)/(x-1), x != -1, -2", pair="dom-w-s8", complexity=4, difficulty="hard", why="all three exclusions stated first",
  oracle_lines=["restrict: x != 1 and x != -2 and x != -1", "((x+1)/(x-1))((x+2)/(x+1))", "(x+1)(x+2)/((x-1)(x+1))", "(x+2)/(x-1)"])
W(C, "product of rational expressions cancels to a constant", "restriction carried through several lines",
  {"type": SIM, "start": "((x^2-1)/(x^2-x))(x/(x+1))"}, ["((x-1)(x+1)/(x(x-1)))(x/(x+1))", "1"], "domain-violation",
  answer="1, x != 0, 1, -1", complexity=3, difficulty="hard", why="the start is undefined at 0, 1 and -1; the constant 1 is not")
W(C, "conjugate cancellation with the root excluded", "excluded-value obligation", {"type": SIM, "start": "(x-4)/(sqrt(x)-2)"},
  ["(sqrt(x)-2)(sqrt(x)+2)/(sqrt(x)-2)", "sqrt(x)+2"], "domain-violation", answer="sqrt(x)+2, x != 4", pair="dom-w-s9",
  why="x=4 excluded originally; result is defined there")
W(C, "conjugate cancellation with the root excluded", "excluded-value obligation", {"type": SIM, "start": "(x-4)/(sqrt(x)-2)"},
  ["(sqrt(x)-2)(sqrt(x)+2)/(sqrt(x)-2)", "x != 4", "sqrt(x)+2"], "valid-equivalence", answer="sqrt(x)+2, x != 4", pair="dom-w-s9",
  why="restriction stated", oracle_lines=["(sqrt(x)-2)(sqrt(x)+2)/(sqrt(x)-2)", "restrict: x != 4", "sqrt(x)+2"])
W(C, "principal square root of a numeric square", "principal root", {"type": "evaluate", "start": "sqrt((-2)^2)+cbrt(-8)"},
  ["sqrt(4)+(-2)", "2-2", "0"], "valid-equivalence", answer="0", pair="dom-w-ev", difficulty="easy",
  why="sqrt(4) = 2, cbrt(-8) = -2")
W(C, "principal square root of a numeric square", "principal root", {"type": "evaluate", "start": "sqrt((-2)^2)+cbrt(-8)"},
  ["-2+(-2)", "-4"], "invalid", answer="0", pair="dom-w-ev", difficulty="easy", why="sqrt((-2)^2) = 2, not -2")
W(C, "log power law justified by the wrong rule", "cited reason vs domain condition", {"type": SIM, "start": "ln(x^2)"},
  ["2ln(-x)   (by ln(a^b) = b ln a with a = x)"], "wrong-reason", answer="2ln(-x)", assumptions=["x < 0"], difficulty="hard",
  why="the result is right for x<0, but ln(a^b) = b ln a with a = x would give 2ln(x), undefined for x<0; the correct reason is "
      "x^2 = (-x)^2 with -x > 0", oracle_lines=["2ln(-x)"])
W(C, "even root of a square justified by a false cancellation rule", "cited reason vs domain condition",
  {"type": SIM, "start": "sqrt(x^2)+x"}, ["x+x   (square root and square always cancel)", "2x"], "wrong-reason", answer="2x",
  assumptions=["x > 0"], why="2x is correct for x > 0, but the cited rule 'sqrt(a^2) = a always' is false (sqrt(a^2) = |a|); "
  "the valid reason is |x| = x because x > 0", oracle_lines=["x+x", "2x"])
