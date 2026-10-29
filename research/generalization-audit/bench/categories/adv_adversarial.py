"""ADV: adversarial and cross-domain combinations.

Tests whether a verifier COMPOSES principles (domain, sign, implication direction, case scope, constants, exactness,
notation) rather than recognising memorised surface patterns. Most cases come in minimal pairs/triples (pair=...).
All labels derived by hand; see each `why`.
"""
from schema import T, W

A = "ADV"
I = ["x >= 0", "x < 2pi"]          # trig equations/inequalities are posed on [0, 2pi)
ABST = dict(expected="abstain", acceptable=["abstain"], truth="unknown")


def t(principle, invariant, prev, nxt, rel, why, kind="statement", **kw):
    kw.setdefault("composition", True)
    return T(A, principle, invariant, prev, nxt, kind, rel, why=why, **kw)


def w(principle, invariant, task, lines, rel, why, answer, **kw):
    kw.setdefault("composition", True)
    return W(A, principle, invariant, task, lines, rel, why=why, answer=answer, **kw)


def solve(s):
    return {"type": "solve", "statement": s}


# =====================================================================================================================
# 1. log of a rational function whose cancellation hides a domain point
# =====================================================================================================================
t("cancelling inside a logarithm widens the domain", "natural-domain preservation (log of rational function)",
  "ln((x^2-1)/(x-1))", "ln(x+1)", "domain-violation", kind="expression", pair="adv-lograt", difficulty="medium", complexity=3,
  domain="algebra", why="ln((x^2-1)/(x-1)) is defined on (-1,1) U (1,oo); ln(x+1) is also defined at x=1, so they agree only for x != 1")
t("cancelling inside a logarithm with the excluded point carried", "assumption-aware equivalence",
  "ln((x^2-1)/(x-1))", "ln(x+1)", "valid-equivalence", kind="expression", assumptions=["x != 1"], pair="adv-lograt", complexity=3,
  why="with x != 1 both are defined exactly on (-1,1) U (1,oo) and agree there")
t("log of a quotient split into a difference needs both factors positive", "natural-domain preservation under log laws",
  "ln((x^2-1)/(x-1))", "ln(x^2-1) - ln(x-1)", "invalid", kind="expression", pair="adv-lograt", difficulty="hard", complexity=3,
  why="at x=0 the left side is ln(1)=0 but ln(-1) and ln(-1) are undefined; the split loses (-1,1)")

w("log equation with a rational argument: clear the denominator, state x != 1, check the log domain",
  "extraneous-root obligation across log + rational", solve("ln((x+1)/(x-1)) = ln(x)"),
  ["(x+1)/(x-1) = x", "x ≠ 1", "x + 1 = x^2 - x", "x^2 - 2x - 1 = 0", "x = 1 + sqrt(2) or x = 1 - sqrt(2)",
   "check x = 1 - sqrt(2): it is negative so ln(x) is undefined, reject", "x = 1 + sqrt(2)"],
  "valid-implication", answer="x = 1 + sqrt(2)", pair="adv-logrrat-w", difficulty="hard", complexity=4,
  oracle_lines=["(x+1)/(x-1) = x", "restrict: x != 1", "x + 1 = x^2 - x", "x^2 - 2x - 1 = 0", "x = 1 + sqrt(2) or x = 1 - sqrt(2)", None, "x = 1 + sqrt(2)"],
  why="ln is injective so the first line is a one-way step (it forgets positivity); 1-sqrt(2)<0 is rejected; 1+sqrt(2)>1 makes both arguments positive")
w("same working with the extraneous root kept", "extraneous-root obligation across log + rational", solve("ln((x+1)/(x-1)) = ln(x)"),
  ["(x+1)/(x-1) = x", "x ≠ 1", "x + 1 = x^2 - x", "x^2 - 2x - 1 = 0", "x = 1 + sqrt(2) or x = 1 - sqrt(2)"],
  "invalid", answer="x = 1 + sqrt(2)", pair="adv-logrrat-w", difficulty="medium", complexity=4,
  oracle_lines=["(x+1)/(x-1) = x", "restrict: x != 1", "x + 1 = x^2 - x", "x^2 - 2x - 1 = 0", "x = 1 + sqrt(2) or x = 1 - sqrt(2)"],
  why="x = 1 - sqrt(2) is negative, ln(x) is undefined there, so the final answer contains a non-solution")
w("same working with the extraneous root checked but the cleared denominator never restricted", "denominator-clearing obligation",
  solve("ln((x+1)/(x-1)) = ln(x)"),
  ["(x+1)/(x-1) = x", "x + 1 = x^2 - x", "x^2 - 2x - 1 = 0", "x = 1 + sqrt(2) or x = 1 - sqrt(2)",
   "check x = 1 - sqrt(2): negative, ln undefined, reject", "x = 1 + sqrt(2)"],
  "domain-violation", answer="x = 1 + sqrt(2)", pair="adv-logrrat-w", difficulty="hard", complexity=4,
  oracle_lines=["(x+1)/(x-1) = x", "x + 1 = x^2 - x", "x^2 - 2x - 1 = 0", "x = 1 + sqrt(2) or x = 1 - sqrt(2)", None, "x = 1 + sqrt(2)"],
  why="the answer is right, but multiplying by x-1 is done without stating x != 1 (obligation skipped)")

t("log-equation transition to a polynomial forgets the log domain", "solution-set preservation (log + rational)",
  "ln((x+1)/(x-1)) = ln(x)", "x^2 - 2x - 1 = 0", "domain-violation", pair="adv-logrrat-t", difficulty="medium", complexity=3,
  why="prev has solution set {1+sqrt(2)}; next also admits 1-sqrt(2) where ln(x) is undefined: one-way step that drops the domain")
t("log-equation solved with domain respected", "solution-set preservation (log + rational)",
  "ln((x+1)/(x-1)) = ln(x)", "x = 1 + sqrt(2)", "valid-equivalence", pair="adv-logrrat-t", difficulty="hard", complexity=3,
  why="1+sqrt(2) is the only root of x^2-2x-1 with x>1 (needed for both logs)")

t("log sum combined then base-10 equation solved", "domain of combined logarithms",
  "ln(x) + ln(x-3) = ln(10)", "x = 5", "valid-equivalence", pair="adv-log10", complexity=3,
  why="x(x-3)=10 with x>3 gives x=5 only (x=-2 is outside the domain)")
t("log sum combined: extraneous root from widening the domain", "domain of combined logarithms",
  "ln(x) + ln(x-3) = ln(10)", "x = 5 or x = -2", "domain-violation", pair="adv-log10", complexity=3,
  why="x=-2 makes ln(x) undefined; the step is prev => next only, losing the log domain")
t("bare log: base unspecified", "ambiguity of bare log", "log(x) + log(x-3) = 1", "x = 5", "insufficient-information",
  pair="adv-log10", notation="unfamiliar", difficulty="medium", complexity=2,
  why="with base 10 the answer is 5; with base e, x(x-3)=e gives x=(3+sqrt(9+4e))/2; bare log is ambiguous")
t("log of a product split with a sign-ambiguous factor", "natural-domain preservation under log laws",
  "ln(x^2 + x)", "ln(x) + ln(x+1)", "invalid", kind="expression", pair="adv-lnprod", complexity=2,
  why="at x=-2: ln(2) is defined, ln(-2) is not")
t("log of a product split under an assumption making both factors positive", "assumption-aware equivalence",
  "ln(x^2 + x)", "ln(x) + ln(x+1)", "valid-equivalence", kind="expression", assumptions=["x > 0"], pair="adv-lnprod", complexity=2,
  why="for x>0 both x and x+1 are positive so the product rule for logs applies")
t("ln of a square equals twice ln only for positive argument", "natural-domain preservation under log laws",
  "ln(x^2)", "2ln(x)", "invalid", kind="expression", pair="adv-lnsq", difficulty="easy",
  why="at x=-1, ln(1)=0 but ln(-1) is undefined")
t("ln of a square equals twice ln of the absolute value", "natural-domain preservation under log laws",
  "ln(x^2)", "2ln|x|", "valid-equivalence", kind="expression", pair="adv-lnsq", difficulty="easy",
  why="x^2 = |x|^2 and |x|>0 exactly when x != 0, the common domain")
t("log inequality: monotonicity of ln used without the domain", "natural domain in inequalities",
  "ln(x-1) < ln(3-x)", "x < 2", "domain-violation", pair="adv-lnineq", complexity=2, domain="algebra",
  why="true set is 1<x<2; x<2 also admits x<=1 where ln(x-1) is undefined")
t("log inequality solved with both arguments positive", "natural domain in inequalities",
  "ln(x-1) < ln(3-x)", "1 < x < 2", "valid-equivalence", pair="adv-lnineq", complexity=2,
  why="need x>1, x<3, and x-1<3-x; intersection is (1,2)")
t("ln of a square <= 0 rewritten as a polynomial inequality forgets x != 0", "natural domain in inequalities",
  "ln(x^2) <= 0", "x^2 <= 1", "domain-violation", pair="adv-lnsqineq", complexity=2,
  why="ln(x^2)<=0 iff 0<x^2<=1; x=0 satisfies x^2<=1 but ln(0) is undefined")
t("ln of a square <= 0 with x != 0 carried", "natural domain in inequalities",
  "ln(x^2) <= 0", "-1 <= x <= 1 and x ≠ 0", "valid-equivalence", pair="adv-lnsqineq", complexity=2, notation="unfamiliar",
  oracle_next="-1 <= x <= 1 and x != 0", why="0 < x^2 <= 1 iff x in [-1,1] with x != 0")
t("product of ln and a linear factor: sign analysis on the log domain", "sign charts with a log factor",
  "ln(x)(x-2) > 0", "0 < x < 1 or x > 2", "valid-equivalence", pair="adv-lnsign", difficulty="hard", complexity=3,
  why="on x>0: ln x<0 on (0,1), >0 on (1,oo); x-2 changes sign at 2; product positive on (0,1) and (2,oo)")
t("product of ln and a linear factor: the negative-negative region dropped", "sign charts with a log factor",
  "ln(x)(x-2) > 0", "x > 2", "invalid", pair="adv-lnsign", difficulty="hard", complexity=3,
  why="x=1/2: ln(1/2)<0 and 1/2-2<0, product positive, but 1/2 is not > 2")

# =====================================================================================================================
# 2. absolute value inside a square root inside an inequality
# =====================================================================================================================
t("sqrt(u) < 1 iff 0 <= u < 1, with u = |x| - 1", "abs inside sqrt inside inequality",
  "sqrt(|x| - 1) < 1", "1 <= |x| < 2", "valid-equivalence", pair="adv-sqrtabs", difficulty="medium", complexity=3,
  why="sqrt is defined for |x|>=1 and increasing, so sqrt(|x|-1)<1 iff 0<=|x|-1<1")
t("radical inequality squared without its domain", "abs inside sqrt inside inequality",
  "sqrt(|x| - 1) < 1", "|x| < 2", "domain-violation", pair="adv-sqrtabs", complexity=3,
  why="|x|<2 admits x=0 where sqrt(-1) is undefined; prev => next only")
t("radical inequality with the absolute value dropped", "abs inside sqrt inside inequality",
  "sqrt(|x| - 1) < 1", "1 <= x < 2", "invalid", pair="adv-sqrtabs", complexity=3,
  why="x=-3/2: sqrt(1/2)<1 holds, but -3/2 is not in [1,2)")
t("sqrt of a square is |x|, so sqrt(x^2) > x iff x < 0", "sqrt-square inside an inequality",
  "sqrt(x^2) > x + 1", "x < -1/2", "valid-equivalence", pair="adv-sqrtsq-ineq", difficulty="medium", complexity=2,
  why="|x| > x+1: for x>=0 it reads x > x+1 (never); for x<0 it reads -x > x+1, i.e. x < -1/2")
t("sqrt(x^2) replaced by x inside an inequality", "sqrt-square inside an inequality",
  "sqrt(x^2) > x + 1", "x > x + 1", "invalid", pair="adv-sqrtsq-ineq", complexity=2,
  why="x=-1: sqrt(1)=1 > 0 holds, but -1 > 0 is false")
t("absolute value of a quadratic below a linear bound: double inequality", "abs + quadratic inequality",
  "|x^2 - 4| < 3x", "-3x < x^2 - 4 < 3x", "valid-equivalence", pair="adv-absquad", complexity=3,
  why="|A|<B iff -B<A<B (no sign assumption on B needed: if B<=0 both sides fail)")
t("absolute value of a quadratic: solved set", "abs + quadratic inequality",
  "|x^2 - 4| < 3x", "1 < x < 4", "valid-equivalence", pair="adv-absquad", difficulty="hard", complexity=4,
  why="x^2-3x-4<0 gives (-1,4); x^2+3x-4>0 gives x<-4 or x>1; intersection (1,4)")
t("absolute value of a quadratic: only one half of |A| < B kept", "abs + quadratic inequality",
  "|x^2 - 4| < 3x", "x^2 - 4 < 3x", "valid-implication", pair="adv-absquad", complexity=3,
  why="prev set (1,4) is inside next set (-1,4): a sound but lossy one-way step (x=0 satisfies next only)")
t("|x|/(x-1) >= 0: the zero of the numerator is a boundary solution", "boundary points of rational inequalities",
  "|x|/(x-1) >= 0", "x > 1 or x = 0", "valid-equivalence", pair="adv-absrat", complexity=3,
  why="numerator >= 0 always, zero at x=0 (and then the quotient is 0 >= 0); positive iff x>1")
t("|x|/(x-1) >= 0: boundary solution x = 0 lost", "boundary points of rational inequalities",
  "|x|/(x-1) >= 0", "x > 1", "invalid", pair="adv-absrat", complexity=3,
  why="x=0: 0/(-1)=0 >= 0 holds, but 0 is not > 1")
t("sqrt(x-1)(x-3) >= 0: the radical's zero is an isolated solution", "boundary points with radicals",
  "sqrt(x-1)(x-3) >= 0", "x = 1 or x >= 3", "valid-equivalence", pair="adv-sqrtlin", complexity=3,
  why="domain x>=1; product 0 at x=1 and x=3, negative on (1,3), positive for x>3")
t("sqrt(x-1)(x-3) >= 0: isolated solution lost after dividing by the radical", "boundary points with radicals",
  "sqrt(x-1)(x-3) >= 0", "x >= 3", "invalid", pair="adv-sqrtlin", complexity=3,
  why="x=1 gives 0 >= 0 but is not >= 3")
t("same expression written with juxtaposition and unicode", "unfamiliar notation for a radical product",
  "√(x−1)(x−3) ≥ 0", "x = 1 or x ≥ 3", "valid-equivalence", pair="adv-sqrtlin", complexity=3, notation="unfamiliar",
  oracle_prev="sqrt(x-1)(x-3) >= 0", oracle_next="x = 1 or x >= 3",
  why="same statement as the ASCII version: sqrt applies to (x-1) only")

w("|x-1| = sqrt(x+5): both sides nonnegative, so squaring is reversible", "squaring with abs (no extraneous root)",
  solve("|x-1| = sqrt(x+5)"), ["(x-1)^2 = x + 5", "x^2 - 3x - 4 = 0", "(x-4)(x+1) = 0", "x = 4 or x = -1"],
  "valid-equivalence", answer="x = 4 or x = -1", pair="adv-abssqrt", difficulty="hard", complexity=3,
  why="|x-1|^2=(x-1)^2 and both sides are >=0, so squaring is an equivalence on x>=-5; both roots check: |3|=3=sqrt(9), |-2|=2=sqrt(4)")
w("|x-1| = sqrt(x+5): a valid root wrongly rejected as 'negative'", "squaring with abs (no extraneous root)",
  solve("|x-1| = sqrt(x+5)"), ["(x-1)^2 = x + 5", "x^2 - 3x - 4 = 0", "x = 4 or x = -1", "x = -1 is negative so reject it", "x = 4"],
  "invalid", answer="x = 4 or x = -1", pair="adv-abssqrt", difficulty="hard", complexity=3,
  oracle_lines=["(x-1)^2 = x + 5", "x^2 - 3x - 4 = 0", "x = 4 or x = -1", None, "x = 4"],
  why="x=-1 satisfies the original: |-2| = 2 = sqrt(4); the final answer loses it")
w("x-1 = sqrt(x+5) (no abs): squaring introduces x = -1, which must be checked", "extraneous-root obligation",
  solve("x - 1 = sqrt(x+5)"), ["(x-1)^2 = x + 5", "x^2 - 3x - 4 = 0", "x = 4 or x = -1", "check x = -1: -2 ≠ sqrt(4) = 2, reject", "x = 4"],
  "valid-implication", answer="x = 4", pair="adv-abssqrt", difficulty="medium", complexity=3,
  oracle_lines=["(x-1)^2 = x + 5", "x^2 - 3x - 4 = 0", "x = 4 or x = -1", None, "x = 4"],
  why="removing the absolute value changes the problem: x=-1 is now extraneous and is correctly rejected")
w("x-1 = sqrt(x+5) solved exactly like the abs version, no check", "extraneous-root obligation",
  solve("x - 1 = sqrt(x+5)"), ["(x-1)^2 = x + 5", "x^2 - 3x - 4 = 0", "x = 4 or x = -1"],
  "invalid", answer="x = 4", pair="adv-abssqrt", difficulty="medium", complexity=3,
  why="x=-1 gives -2 = 2, false; the final answer contains it")

# =====================================================================================================================
# 3. squaring an equation that contains a fraction
# =====================================================================================================================
w("square a radical equation with a fractional right side: state x != 0, factor a cubic, check", "squaring + fraction + double root",
  solve("sqrt(x+3) = 2/x"),
  ["x ≠ 0", "x + 3 = 4/x^2", "x^3 + 3x^2 - 4 = 0", "(x-1)(x+2)^2 = 0", "x = 1 or x = -2",
   "check x = -2: sqrt(1) = 1 but 2/(-2) = -1, reject", "x = 1"],
  "valid-implication", answer="x = 1", pair="adv-sqfrac", difficulty="hard", complexity=5,
  oracle_lines=["restrict: x != 0", "x + 3 = 4/x^2", "x^3 + 3x^2 - 4 = 0", "(x-1)(x+2)^2 = 0", "x = 1 or x = -2", None, "x = 1"],
  why="squaring loses the sign of 2/x; x=-2 is a root of the cubic but makes the RHS negative; x=1: 2 = 2")
w("same working, extraneous root kept", "squaring + fraction + double root", solve("sqrt(x+3) = 2/x"),
  ["x ≠ 0", "x + 3 = 4/x^2", "x^3 + 3x^2 - 4 = 0", "(x-1)(x+2)^2 = 0", "x = 1 or x = -2"],
  "invalid", answer="x = 1", pair="adv-sqfrac", difficulty="hard", complexity=5,
  oracle_lines=["restrict: x != 0", "x + 3 = 4/x^2", "x^3 + 3x^2 - 4 = 0", "(x-1)(x+2)^2 = 0", "x = 1 or x = -2"],
  why="at x=-2 the left side is 1 and the right side is -1")
w("same working, check done, x != 0 never stated before multiplying by x^2", "denominator-clearing obligation",
  solve("sqrt(x+3) = 2/x"),
  ["x + 3 = 4/x^2", "x^3 + 3x^2 - 4 = 0", "(x-1)(x+2)^2 = 0", "x = 1 or x = -2", "check x = -2: 1 ≠ -1, reject", "x = 1"],
  "domain-violation", answer="x = 1", pair="adv-sqfrac", difficulty="hard", complexity=5,
  oracle_lines=["x + 3 = 4/x^2", "x^3 + 3x^2 - 4 = 0", "(x-1)(x+2)^2 = 0", "x = 1 or x = -2", None, "x = 1"],
  why="correct answer; denominator x^2 cleared without stating x != 0 (obligation skipped)")
t("squaring an equation with a fraction is one-way", "implication direction under squaring", "sqrt(x+3) = 2/x",
  "x^3 + 3x^2 - 4 = 0", "valid-implication", pair="adv-sqfrac-t", complexity=3,
  why="prev set {1}; next set {1,-2}; every solution of prev satisfies next")
t("squaring an equation with a fraction then solving correctly", "implication direction under squaring", "sqrt(x+3) = 2/x",
  "x = 1", "valid-equivalence", pair="adv-sqfrac-t", complexity=3, why="x=1 is the only solution (see the cubic and the sign check)")
w("radical equals a half-linear expression: factor instead of dividing", "cancellation across zero inside a radical equation",
  solve("(x-1)/2 = sqrt(x-1)"),
  ["(x-1)^2/4 = x - 1", "(x-1)^2 = 4(x-1)", "(x-1)(x-5) = 0", "x = 1 or x = 5", "check: x = 1 gives 0 = 0, x = 5 gives 2 = 2", "x = 1 or x = 5"],
  "valid-implication", answer="x = 1 or x = 5", pair="adv-sqdiv", difficulty="medium", complexity=4,
  oracle_lines=["(x-1)^2/4 = x - 1", "(x-1)^2 = 4(x-1)", "(x-1)(x-5) = 0", "x = 1 or x = 5", None, "x = 1 or x = 5"],
  why="squaring is one-way but both candidates check; no division by x-1")
w("radical equals a half-linear expression: dividing by x-1 loses x = 1", "cancellation across zero inside a radical equation",
  solve("(x-1)/2 = sqrt(x-1)"), ["(x-1)^2/4 = x - 1", "(x-1)^2 = 4(x-1)", "x - 1 = 4", "x = 5"],
  "invalid", answer="x = 1 or x = 5", pair="adv-sqdiv", difficulty="medium", complexity=4,
  why="x=1 satisfies the original (0 = 0) but is lost when dividing by x-1")
w("sum of two radicals with disjoint domains", "hidden domain makes squaring produce a non-point",
  solve("sqrt(x-3) + sqrt(1-x) = 0"),
  ["sqrt(x-3) = -sqrt(1-x)", "x - 3 = 1 - x", "x = 2", "check x = 2: sqrt(-1) is undefined, reject", "empty"],
  "valid-implication", answer="no solution", pair="adv-disjoint", difficulty="hard", complexity=3,
  oracle_lines=["sqrt(x-3) = -sqrt(1-x)", "x - 3 = 1 - x", "x = 2", None, "empty"],
  why="domain needs x>=3 and x<=1: empty; squaring manufactures x=2, which is outside the domain")
w("sum of two radicals with disjoint domains, candidate accepted", "hidden domain makes squaring produce a non-point",
  solve("sqrt(x-3) + sqrt(1-x) = 0"), ["sqrt(x-3) = -sqrt(1-x)", "x - 3 = 1 - x", "x = 2"],
  "invalid", answer="no solution", pair="adv-disjoint", difficulty="hard", complexity=3,
  why="x=2 is not in the domain (sqrt(-1)); the equation has no real solution")
t("squaring an impossible radical equation: vacuous implication", "implication direction (empty premise)",
  "sqrt(x) = -3", "x = 9", "valid-implication", pair="adv-sqneg", difficulty="hard", complexity=2,
  why="prev has no solution, so prev => next holds vacuously; next is not equivalent (x=9 gives sqrt 9 = 3)")
t("squaring a possible radical equation", "implication direction", "sqrt(x) = 3", "x = 9", "valid-equivalence",
  pair="adv-sqneg", difficulty="easy", why="sqrt(x)=3 iff x=9")
w("impossible radical equation solved by squaring, no check", "extraneous-root obligation", solve("sqrt(x) = -3"), ["x = 9"],
  "invalid", answer="no solution", pair="adv-sqneg-w", difficulty="easy",
  why="sqrt(9) = 3 != -3; the equation has no solution")
w("impossible radical equation solved by squaring, then checked", "extraneous-root obligation", solve("sqrt(x) = -3"),
  ["x = 9", "check: sqrt(9) = 3 ≠ -3, reject", "empty"], "valid-implication", answer="no solution", pair="adv-sqneg-w",
  oracle_lines=["x = 9", None, "empty"], difficulty="easy", why="the candidate is checked and rejected; no solution")

# =====================================================================================================================
# 4. trig identity inside an equation/inequality solved on an interval [0, 2pi)
# =====================================================================================================================
t("double angle then factor: keep sin x = 0", "solution-set preservation (trig + factoring)",
  "sin(2x) = sin(x)", "sin(x)(2cos(x) - 1) = 0", "valid-equivalence", assumptions=I, pair="adv-sin2x", domain="trigonometry",
  complexity=3, why="sin 2x = 2 sin x cos x; moving sin x across and factoring is reversible")
t("double angle then divide by sin x", "solution-set preservation (trig + division)", "sin(2x) = sin(x)", "2cos(x) = 1",
  "invalid", assumptions=I, pair="adv-sin2x", domain="trigonometry", complexity=3,
  why="x=0 (and x=pi) satisfy sin 2x = sin x but not 2cos x = 1")
t("trig inequality: dividing by cos x whose sign varies", "sign of multiplier in inequalities (trig)",
  "2sin(x)cos(x) > cos(x)", "2sin(x) > 1", "invalid", assumptions=I, pair="adv-trigineq", domain="trigonometry", difficulty="hard",
  complexity=3, why="x=7pi/6: cos<0 and sin=-1/2, so 2 sin cos = sqrt(3)/2 > cos = -sqrt(3)/2 holds, but 2 sin = -1 < 1")
t("trig inequality: move and factor instead", "sign of multiplier in inequalities (trig)",
  "2sin(x)cos(x) > cos(x)", "cos(x)(2sin(x) - 1) > 0", "valid-equivalence", assumptions=I, pair="adv-trigineq",
  domain="trigonometry", complexity=3, why="subtracting cos x and factoring is reversible")
t("multiplying a tan equation by cos x reintroduces the excluded point", "natural domain (trig) under clearing",
  "tan(x) = 1/cos(x)", "sin(x) = 1", "domain-violation", assumptions=I, pair="adv-tansec", domain="trigonometry", difficulty="hard",
  complexity=3, why="tan x = sec x needs cos x != 0; sin x = 1 forces cos x = 0, so prev has no solution while next has x = pi/2")
t("multiplying a tan equation by cos x where no excluded point survives", "natural domain (trig) under clearing",
  "tan(x) = sin(x)", "sin(x) - sin(x)cos(x) = 0", "valid-equivalence", assumptions=I, pair="adv-tansec", domain="trigonometry",
  difficulty="hard", complexity=3,
  why="next has solutions 0, pi (sin x = 0) only; cos x = 0 points give 1 - 0 != 0, so the cleared form adds nothing")
w("tan x = sec x on [0, 2pi): solved without checking the domain", "natural domain (trig) under clearing",
  {"type": "solve", "statement": "tan(x) = 1/cos(x)"}, ["sin(x)/cos(x) = 1/cos(x)", "sin(x) = 1", "x = pi/2"], "invalid",
  answer="no solution", assumptions=I, pair="adv-tansec-w", domain="trigonometry", difficulty="hard", complexity=3,
  why="tan(pi/2) and 1/cos(pi/2) are undefined; the equation has no solution in [0, 2pi)")
w("tan x = sec x on [0, 2pi): cos x != 0 stated, candidate rejected", "natural domain (trig) under clearing",
  {"type": "solve", "statement": "tan(x) = 1/cos(x)"},
  ["cos(x) ≠ 0", "sin(x)/cos(x) = 1/cos(x)", "sin(x) = 1", "x = pi/2", "but cos(pi/2) = 0 is excluded, reject", "empty"],
  "valid-implication", answer="no solution", assumptions=I, pair="adv-tansec-w", domain="trigonometry", difficulty="hard", complexity=3,
  oracle_lines=["restrict: cos(x) != 0", "sin(x)/cos(x) = 1/cos(x)", "sin(x) = 1", "x = pi/2", None, "empty"],
  why="the only candidate violates the stated restriction; no solution")
t("log sum of trig functions combined via a double angle: domain lost", "log domain + trig identity",
  "ln(sin(x)) + ln(cos(x)) = ln(1/4)", "sin(2x) = 1/2", "domain-violation", assumptions=I, pair="adv-lntrig", domain="trigonometry",
  difficulty="hard", complexity=4,
  why="ln sin + ln cos needs sin>0 and cos>0 (first quadrant); sin 2x = 1/2 also has 13pi/12, 17pi/12 where both are negative")
t("log sum of trig functions solved in the first quadrant", "log domain + trig identity",
  "ln(sin(x)) + ln(cos(x)) = ln(1/4)", "x = pi/12 or x = 5pi/12", "valid-equivalence", assumptions=I, pair="adv-lntrig",
  domain="trigonometry", difficulty="hard", complexity=4,
  why="sin x cos x = 1/4 iff sin 2x = 1/2; in the first quadrant 2x = pi/6 or 5pi/6")
t("cos 2x as a quadratic in cos x", "trig identity in an equation", "cos(2x) = cos(x)", "(cos(x) - 1)(2cos(x) + 1) = 0",
  "valid-equivalence", assumptions=I, pair="adv-cos2x", domain="trigonometry", complexity=2,
  why="cos 2x = 2cos^2 x - 1, rearranged to 2c^2 - c - 1 = (c-1)(2c+1) = 0")
t("cos 2x quadratic factored with a sign error", "trig identity in an equation", "cos(2x) = cos(x)",
  "cos(x) = 1 or cos(x) = 1/2", "invalid", assumptions=I, pair="adv-cos2x", domain="trigonometry", complexity=3,
  why="2c^2 - c - 1 = (c-1)(2c+1), roots 1 and -1/2; x = 2pi/3 solves prev but cos(2pi/3) = -1/2")
t("cos 2x quadratic solved on the interval", "trig identity in an equation", "cos(2x) = cos(x)",
  "x = 0 or x = 2pi/3 or x = 4pi/3", "valid-equivalence", assumptions=I, pair="adv-cos2x", domain="trigonometry", complexity=3,
  why="cos x = 1 gives 0; cos x = -1/2 gives 2pi/3, 4pi/3")
t("sqrt(1 - cos^2 x) is |sin x|, not sin x", "sqrt-square inside trig", "sqrt(1 - cos(x)^2)", "sin(x)", "invalid", kind="expression",
  assumptions=I, pair="adv-sqrtcos", domain="trigonometry", why="x = 3pi/2: left side 1, right side -1")
t("sqrt(1 - cos^2 x) is |sin x|", "sqrt-square inside trig", "sqrt(1 - cos(x)^2)", "|sin(x)|", "valid-equivalence", kind="expression",
  assumptions=I, pair="adv-sqrtcos", domain="trigonometry", why="1 - cos^2 = sin^2 and sqrt(u^2) = |u|")
t("sin(asin x) = x needs |x| <= 1", "composition domain (inverse trig)", "sin(asin(x))", "x", "domain-violation", kind="expression",
  pair="adv-asin", domain="trigonometry", why="the left side is defined only on [-1,1]; x is defined everywhere")
t("sin(asin x) = x on [-1, 1]", "composition domain (inverse trig)", "sin(asin(x))", "x", "valid-equivalence", kind="expression",
  assumptions=["x >= -1", "x <= 1"], pair="adv-asin", domain="trigonometry", why="sin and asin are inverse on [-1,1]")
t("asin(sin x) = x fails outside [-pi/2, pi/2]", "composition domain (inverse trig)", "asin(sin(x))", "x", "invalid",
  kind="expression", pair="adv-asin", domain="trigonometry", why="x = pi: asin(sin pi) = asin 0 = 0 != pi")
t("tangent-half rewrite: multiplying by conjugate loses the point where the original is defined", "natural domain (trig rewriting)",
  "cos(x)/(1 - sin(x))", "(1 + sin(x))/cos(x)", "invalid", kind="expression", assumptions=I, pair="adv-conj-trig",
  domain="trigonometry", difficulty="hard", complexity=3,
  why="x = 3pi/2: left = 0/2 = 0 is defined; right has cos = 0 in the denominator")
t("tangent-half rewrite in the reverse direction widens the domain", "natural domain (trig rewriting)",
  "(1 + sin(x))/cos(x)", "cos(x)/(1 - sin(x))", "domain-violation", kind="expression", assumptions=I, pair="adv-conj-trig",
  domain="trigonometry", difficulty="hard", complexity=3,
  why="equal wherever cos x != 0; the new expression is also defined at 3pi/2")
t("sec^2 - tan^2 = 1 only where tan is defined", "natural domain (Pythagorean identity)", "sec(x)^2 - tan(x)^2", "1",
  "domain-violation", kind="expression", assumptions=I, pair="adv-sectan", domain="trigonometry", complexity=2,
  why="left is undefined at pi/2 and 3pi/2; 1 is defined there")
t("sec^2 - tan^2 = 1 with the excluded points carried", "natural domain (Pythagorean identity)", "sec(x)^2 - tan(x)^2",
  "1", "valid-equivalence", kind="expression", assumptions=["x > 0", "x < pi/2"], pair="adv-sectan", domain="trigonometry",
  complexity=2, why="on (0, pi/2) cos x != 0, so the identity holds everywhere considered")
t("unicode squared-trig notation for the Pythagorean identity", "unfamiliar notation", "sin²x + cos²x", "1", "valid-equivalence",
  kind="expression", notation="unfamiliar", oracle_prev="sin(x)^2 + cos(x)^2", domain="trigonometry", difficulty="easy",
  pair="adv-sin2notation", why="sin^2 x + cos^2 x = 1 for all real x")
t("sin x^2 is not sin^2 x under the usual convention", "ambiguous function-power notation", "sin x^2", "sin(x)^2",
  "insufficient-information", kind="expression", notation="unfamiliar", domain="trigonometry", pair="adv-sin2notation",
  why="'sin x^2' is read by most conventions as sin(x^2) but often written to mean (sin x)^2; the two differ (x=pi: 0 vs sin(pi^2))")
t("sin^2 x < 1/4 as a double inequality", "square inside a trig inequality", "sin(x)^2 < 1/4", "-1/2 < sin(x) < 1/2",
  "valid-equivalence", assumptions=I, domain="trigonometry", pair="adv-abssin", complexity=2,
  why="u^2 < c^2 iff -c < u < c (c > 0)")
t("sin^2 x < 1/4 with only the upper root kept", "square inside a trig inequality", "sin(x)^2 < 1/4", "sin(x) < 1/2",
  "valid-implication", assumptions=I, domain="trigonometry", pair="adv-abssin", complexity=2,
  why="sin^2 x < 1/4 implies sin x < 1/2; converse fails at x = 3pi/2 (sin = -1, sin^2 = 1)")
t("quadratic in sin x factored on an interval", "factoring a trig quadratic inequality", "2sin(x)^2 - sin(x) - 1 < 0",
  "(2sin(x) + 1)(sin(x) - 1) < 0", "valid-equivalence", assumptions=I, domain="trigonometry", difficulty="hard", complexity=3,
  pair="adv-sinquad",
  why="2s^2 - s - 1 = (2s+1)(s-1) is a polynomial identity, so the two inequalities have the same solution set "
      "([0,7pi/6) U (11pi/6,2pi) minus pi/2). [oracle-dispute] SymPy solveset returns only [0, pi/2) for the left inequality "
      "(e.g. x = 2pi/3 gives 2(3/4) - sqrt(3)/2 - 1 = -0.37 < 0 yet is omitted), so the oracle reports 'implication' or, under its time limits, leaves the case uncertified")
t("quadratic in sin x: factor signs reversed", "factoring a trig quadratic inequality", "(2sin(x) + 1)(sin(x) - 1) < 0",
  "-1 < sin(x) < 1/2", "invalid", assumptions=I, domain="trigonometry", difficulty="hard", complexity=3, pair="adv-sinquad",
  why="product negative iff -1/2 < sin x < 1; x = pi/3 (sin = sqrt(3)/2) solves prev but not next")
t("quadratic in sin x: the product form solved", "factoring a trig quadratic inequality", "(2sin(x) + 1)(sin(x) - 1) < 0",
  "-1/2 < sin(x) < 1", "valid-equivalence", assumptions=I, domain="trigonometry", complexity=3, pair="adv-sinquad",
  why="(2s+1)(s-1) < 0 iff -1/2 < s < 1")
t("x sin x = 2 sin x: dividing by sin x loses its zeros", "division by a symbolic quantity (trig)", "x sin(x) = 2sin(x)", "x = 2",
  "invalid", assumptions=I, pair="adv-xfx", domain="trigonometry", complexity=2,
  why="x = 0 and x = pi satisfy the original (sin = 0) but not x = 2")
t("x ln x = ln x: dividing by ln x happens to lose nothing", "division by a symbolic quantity (log)", "x ln(x) = ln(x)", "x = 1",
  "valid-equivalence", pair="adv-xfx", difficulty="hard", complexity=2,
  why="(x-1) ln x = 0 with x>0: x=1 or ln x=0 i.e. x=1; the only zero of ln x coincides with x=1")
t("x e^x = e^x: dividing by e^x is safe (never zero)", "division by a symbolic quantity (exp)", "x e^x = e^x", "x = 1",
  "valid-equivalence", pair="adv-xfx", difficulty="medium", complexity=2, why="e^x > 0 for all x")

# =====================================================================================================================
# 5. derivatives whose simplification needs a restriction; derivative + inequality / equation
# =====================================================================================================================
t("derivative of a removable-singularity quotient", "domain of the derivative after cancellation", "d/dx((x^2-1)/(x-1))", "1",
  "domain-violation", kind="expression", pair="adv-dremov", domain="calculus", complexity=3,
  why="the function and its derivative exist only for x != 1; the constant 1 is defined at 1")
t("derivative of a removable-singularity quotient with x != 1", "domain of the derivative after cancellation",
  "d/dx((x^2-1)/(x-1))", "1", "valid-equivalence", kind="expression", assumptions=["x != 1"], pair="adv-dremov", domain="calculus",
  complexity=3, why="for x != 1 the function is x+1 with derivative 1")
t("derivative of ln(x^2) is 2/x on the whole domain", "derivative vs. log law", "d/dx(ln(x^2))", "2/x", "valid-equivalence",
  kind="expression", pair="adv-dlnsq", domain="calculus", complexity=2,
  why="chain rule: 2x/x^2 = 2/x, both defined for x != 0")
t("rewriting ln(x^2) as 2 ln x before differentiating changes the domain", "derivative vs. log law", "ln(x^2)", "2ln(x)", "invalid",
  kind="expression", pair="adv-dlnsq", domain="calculus", complexity=2, why="x = -1: ln 1 = 0 defined, ln(-1) undefined")
w("d/dx ln(x^2) via the chain rule", "derivative vs. log law", {"type": "derivative", "f": "ln(x^2)", "var": "x"},
  ["by the chain rule, f'(x) = 2x/x^2", "f'(x) = 2/x"], "valid-equivalence", answer="2/x", pair="adv-dlnsq-w", complexity=2,
  oracle_lines=["claim: 2x/x^2 = 2/x", "final: 2/x"], why="(ln u)' = u'/u with u = x^2")
w("d/dx ln(x^2) via the false identity ln(x^2) = 2 ln x", "cited rule invalid on part of the domain",
  {"type": "derivative", "f": "ln(x^2)", "var": "x"}, ["ln(x^2) = 2ln(x) for all x, so", "f'(x) = 2/x"], "wrong-reason",
  answer="2/x", pair="adv-dlnsq-w", difficulty="hard", complexity=2, oracle_lines=[None, "final: 2/x"],
  why="the result 2/x is correct for all x != 0, but the justification is false for x < 0 (ln x undefined)")
w("d/dx ln((x-1)^2) justified by a log law valid only for x > 1", "cited rule invalid on part of the domain",
  {"type": "derivative", "f": "ln((x-1)^2)", "var": "x"}, ["f(x) = 2ln(x-1)", "f'(x) = 2/(x-1)"], "wrong-reason",
  answer="2/(x-1)", pair="adv-dln2", difficulty="hard", complexity=3, oracle_lines=[None, "final: 2/(x-1)"],
  why="f(x) = 2 ln|x-1|, not 2 ln(x-1) (false for x < 1); the derivative 2/(x-1) happens to be right everywhere x != 1")
w("d/dx ln((x-1)^2) with the absolute value", "cited rule invalid on part of the domain",
  {"type": "derivative", "f": "ln((x-1)^2)", "var": "x"}, ["f(x) = 2ln|x-1|", "f'(x) = 2/(x-1)"], "valid-equivalence",
  answer="2/(x-1)", pair="adv-dln2", complexity=3, oracle_lines=[None, "final: 2/(x-1)"],
  why="ln(u^2) = 2 ln|u| for u != 0 and (ln|u|)' = u'/u")
t("derivative of sqrt(x^2) is not 1", "derivative of a composite with abs", "d/dx(sqrt(x^2))", "1", "invalid", kind="expression",
  pair="adv-dsqrtsq", domain="calculus", complexity=2, why="sqrt(x^2) = |x|, whose derivative at x = -1 is -1")
w("derivative of sqrt(x^2) via the chain rule", "derivative of a composite with abs", {"type": "derivative", "f": "sqrt(x^2)", "var": "x"},
  ["f'(x) = 2x/(2sqrt(x^2))", "f'(x) = x/|x|"], "valid-equivalence", answer="x/|x|", pair="adv-dsqrtsq", complexity=2,
  oracle_lines=[None, "final: x/|x|"], why="chain rule; defined for x != 0 (|x| is not differentiable at 0)")
t("x|x| is differentiable everywhere with derivative 2|x|", "differentiability at a kink", "d/dx(x|x|)", "2|x|", "valid-equivalence",
  kind="expression", pair="adv-dxabs", domain="calculus", difficulty="hard", complexity=3,
  why="x|x| is x^2 for x>=0 and -x^2 for x<0: derivative 2x and -2x, both 0 at 0, i.e. 2|x|")
t("x|x| differentiated as if |x| were x", "differentiability at a kink", "d/dx(x|x|)", "2x", "invalid", kind="expression",
  pair="adv-dxabs", domain="calculus", complexity=3, why="x = -1: derivative is 2|-1| = 2, not -2")
t("increasing where the derivative is positive: x + 4/x", "derivative + inequality with a pole",
  "d/dx(x + 4/x) > 0", "x^2 > 4", "valid-equivalence", pair="adv-dineq", domain="calculus", complexity=3,
  why="1 - 4/x^2 > 0 with x != 0 iff x^2 > 4 (multiplying by x^2 > 0)")
t("increasing where the derivative is positive: one branch lost", "derivative + inequality with a pole",
  "d/dx(x + 4/x) > 0", "x > 2", "invalid", pair="adv-dineq", domain="calculus", complexity=3,
  why="x = -3: 1 - 4/9 > 0 holds but -3 is not > 2")
t("derivative inequality multiplied by x^2 loses the pole", "derivative + inequality with a pole",
  "d/dx(x - 4/x) > 0", "x^2 + 4 > 0", "domain-violation", pair="adv-dineq", domain="calculus", complexity=3,
  why="1 + 4/x^2 > 0 holds for all x != 0; x^2 + 4 > 0 also holds at x = 0 where the derivative is undefined")
t("decreasing region of x - 2 sqrt(x) without the radical's domain", "derivative + inequality with a radical",
  "d/dx(x - 2sqrt(x)) < 0", "x < 1", "domain-violation", pair="adv-dsqrt", domain="calculus", complexity=3,
  why="1 - 1/sqrt(x) < 0 iff 0 < x < 1; x < 1 admits x <= 0 where the derivative is undefined")
t("decreasing region of x - 2 sqrt(x) with its domain", "derivative + inequality with a radical",
  "d/dx(x - 2sqrt(x)) < 0", "0 < x < 1", "valid-equivalence", pair="adv-dsqrt", domain="calculus", complexity=3,
  why="1/sqrt(x) > 1 iff 0 < x < 1")
t("critical points of x^2 e^x: factor", "derivative + equation (division by symbolic)", "d/dx(x^2 e^x) = 0", "x(x+2) = 0",
  "valid-equivalence", pair="adv-dcrit", domain="calculus", complexity=2, why="(2x + x^2) e^x = 0 iff x(x+2) = 0 since e^x > 0")
t("critical points of x^2 e^x: divide by x", "derivative + equation (division by symbolic)", "d/dx(x^2 e^x) = 0", "x + 2 = 0",
  "invalid", pair="adv-dcrit", domain="calculus", complexity=2, why="x = 0 is a critical point lost by dividing by x")
w("derivative of x^x by logarithmic differentiation", "exponent law with a variable base", {"type": "derivative", "f": "x^x", "var": "x"},
  ["ln(f) = x ln(x)  (x > 0)", "f'/f = ln(x) + 1", "f'(x) = x^x(ln(x) + 1)"], "valid-equivalence", answer="x^x(ln(x)+1)",
  pair="adv-xx", complexity=3, oracle_lines=[None, None, "final: x^x(ln(x) + 1)"], why="x^x = e^(x ln x), chain rule")
w("derivative of x^x by the power rule", "exponent law with a variable base", {"type": "derivative", "f": "x^x", "var": "x"},
  ["by the power rule, f'(x) = x·x^(x-1)", "f'(x) = x^x"], "invalid", answer="x^x(ln(x)+1)", pair="adv-xx", complexity=3,
  oracle_lines=[None, "final: x^x"], notation="unfamiliar",
  why="the power rule needs a constant exponent; at x = 2 the true derivative is 4(ln 2 + 1), not 4")
w("chain rule result cited as the product rule", "cited rule", {"type": "derivative", "f": "e^(x^2)", "var": "x"},
  ["by the product rule, f'(x) = 2x e^(x^2)"], "wrong-reason", answer="2x e^(x^2)", pair="adv-chain-cite", difficulty="easy",
  oracle_lines=["final: 2x e^(x^2)"], why="the result is right but it comes from the chain rule; there is no product")
w("chain rule result with the correct citation", "cited rule", {"type": "derivative", "f": "e^(x^2)", "var": "x"},
  ["by the chain rule, f'(x) = 2x e^(x^2)"], "valid-equivalence", answer="2x e^(x^2)", pair="adv-chain-cite", difficulty="easy",
  oracle_lines=["final: 2x e^(x^2)"], why="(e^u)' = u' e^u")
w("derivative of |x| + x^2 away from the kink", "differentiability assumption", {"type": "derivative", "f": "|x| + x^2", "var": "x"},
  ["f'(x) = x/|x| + 2x  for x ≠ 0"], "valid-equivalence", answer="x/|x| + 2x", pair="adv-dabs1", complexity=2,
  oracle_lines=["final: x/|x| + 2x"], why="|x|' = x/|x| for x != 0; f is not differentiable at x = 0")
w("derivative of |x| + x^2 as if the kink were absent", "differentiability assumption", {"type": "derivative", "f": "|x| + x^2", "var": "x"},
  ["f'(x) = 1 + 2x"], "invalid", answer="x/|x| + 2x", pair="adv-dabs1", complexity=2, oracle_lines=["final: 1 + 2x"],
  why="for x < 0, f(x) = -x + x^2 so f'(x) = -1 + 2x")
w("derivative of a quotient simplified first, restriction stated", "derivative after cancellation",
  {"type": "derivative", "f": "(x^2 - 4)/(x + 2)", "var": "x"}, ["for x ≠ -2, f(x) = x - 2", "f'(x) = 1"], "valid-equivalence",
  answer="1 (x != -2)", pair="adv-dcancel2", complexity=2, oracle_lines=[None, "final: 1"],
  why="f equals x - 2 on its domain x != -2; derivative 1 there")
w("derivative of a quotient: quotient rule with a sign slip", "derivative after cancellation",
  {"type": "derivative", "f": "(x^2 - 4)/(x + 2)", "var": "x"},
  ["f'(x) = (2x(x+2) + (x^2-4))/(x+2)^2", "f'(x) = (3x^2 + 4x - 4)/(x+2)^2"], "invalid", answer="1 (x != -2)", pair="adv-dcancel2",
  complexity=3, oracle_lines=[None, "final: (3x^2 + 4x - 4)/(x+2)^2"],
  why="quotient rule has a minus: (2x(x+2) - (x^2-4))/(x+2)^2 = 1; at x = 0 the student's value is -1")

# =====================================================================================================================
# 6. substitution u = x^2 in a radical equation
# =====================================================================================================================
w("u = x^2 in a radical equation where the extraneous u is real", "substitution + squaring + back-substitution",
  solve("sqrt(x^2 + 1) = x^2 - 5"),
  ["let u = x^2 >= 0: sqrt(u + 1) = u - 5", "u + 1 = u^2 - 10u + 25", "u^2 - 11u + 24 = 0", "u = 3 or u = 8",
   "check u = 3: sqrt(4) = 2 but 3 - 5 = -2, reject", "u = 8: sqrt(9) = 3 = 8 - 5", "x^2 = 8", "x = ±2√2"],
  "valid-implication", answer="x = 2sqrt(2) or x = -2sqrt(2)", pair="adv-usub1", difficulty="hard", complexity=5, notation="unfamiliar",
  oracle_lines=[None, "x^2 + 1 = x^4 - 10x^2 + 25", "x^4 - 11x^2 + 24 = 0", "x^2 = 3 or x^2 = 8", None, None, "x^2 = 8", "x = ±2sqrt(2)"],
  why="squaring admits u = 3 (RHS negative); rejected; u = 8 gives x = ±2 sqrt 2, both valid since the equation depends on x^2")
w("u = x^2 in a radical equation without the check", "substitution + squaring + back-substitution",
  solve("sqrt(x^2 + 1) = x^2 - 5"),
  ["let u = x^2: sqrt(u + 1) = u - 5", "u + 1 = u^2 - 10u + 25", "u^2 - 11u + 24 = 0", "u = 3 or u = 8", "x = ±√3 or x = ±2√2"],
  "invalid", answer="x = 2sqrt(2) or x = -2sqrt(2)", pair="adv-usub1", difficulty="hard", complexity=5, notation="unfamiliar",
  oracle_lines=[None, "x^2 + 1 = x^4 - 10x^2 + 25", "x^4 - 11x^2 + 24 = 0", "x^2 = 3 or x^2 = 8", "x = ±sqrt(3) or x = ±2sqrt(2)"],
  why="x = sqrt(3): sqrt(4) = 2 but 3 - 5 = -2")
w("u = x^2 back-substitution keeps only the positive root", "substitution + back-substitution",
  solve("sqrt(x^2 + 1) = x^2 - 5"),
  ["let u = x^2: sqrt(u + 1) = u - 5", "u^2 - 11u + 24 = 0", "u = 3 or u = 8", "u = 3 rejected (u - 5 < 0)", "x = 2√2"],
  "invalid", answer="x = 2sqrt(2) or x = -2sqrt(2)", pair="adv-usub1", difficulty="medium", complexity=4, notation="unfamiliar",
  oracle_lines=[None, "x^4 - 11x^2 + 24 = 0", "x^2 = 3 or x^2 = 8", None, "x = 2sqrt(2)"],
  why="x^2 = 8 has two real roots; -2 sqrt 2 is lost")
w("u = x^2 where the extraneous u is impossible anyway", "substitution + squaring", solve("sqrt(x^2 + 5) = x^2 - 1"),
  ["let u = x^2 >= 0: sqrt(u + 5) = u - 1", "u + 5 = u^2 - 2u + 1", "u^2 - 3u - 4 = 0", "u = 4 or u = -1",
   "u = -1 < 0 impossible; u = 4 checks: sqrt(9) = 3", "x = 2 or x = -2"],
  "valid-implication", answer="x = 2 or x = -2", pair="adv-usub2", difficulty="medium", complexity=4,
  oracle_lines=[None, "x^2 + 5 = x^4 - 2x^2 + 1", "x^4 - 3x^2 - 4 = 0", "x^2 = 4 or x^2 = -1", None, "x = 2 or x = -2"],
  why="u = -1 has no real x; u = 4 satisfies the radical equation (3 = 3)")
w("u = x^2 with the u-solution reported as the answer", "substitution: answer in the wrong variable", solve("sqrt(x^2 + 5) = x^2 - 1"),
  ["let u = x^2: sqrt(u + 5) = u - 1", "u^2 - 3u - 4 = 0", "u = 4 or u = -1", "u = -1 rejected", "x = 4"],
  "invalid", answer="x = 2 or x = -2", pair="adv-usub2", difficulty="medium", complexity=4,
  oracle_lines=[None, "x^4 - 3x^2 - 4 = 0", "x^2 = 4 or x^2 = -1", None, "x = 4"],
  why="u = 4 means x^2 = 4; x = 4 gives sqrt(21) != 15")
t("u = x^2 squared form", "substitution + squaring", "sqrt(x^2 + 1) = x^2 - 5", "x^4 - 11x^2 + 24 = 0", "valid-implication",
  pair="adv-usub-t", complexity=3, why="prev set {±2sqrt2}; next adds ±sqrt3")
t("u = x^2 reduced correctly", "substitution + squaring", "sqrt(x^2 + 1) = x^2 - 5", "x^2 = 8", "valid-equivalence",
  pair="adv-usub-t", complexity=3, why="only u = 8 survives the sign check")
t("exponential quadratic via u = 2^x", "substitution in an exponential equation", "4^x + 2^x - 6 = 0", "2^x = -3 or 2^x = 2",
  "valid-equivalence", pair="adv-u2x", complexity=2, why="4^x = (2^x)^2; u^2 + u - 6 = (u+3)(u-2)")
w("exponential quadratic: impossible branch discarded", "substitution in an exponential equation", solve("4^x + 2^x - 6 = 0"),
  ["(2^x)^2 + 2^x - 6 = 0", "(2^x + 3)(2^x - 2) = 0", "2^x = -3 or 2^x = 2", "2^x > 0, so only 2^x = 2", "x = 1"],
  "valid-equivalence", answer="x = 1", pair="adv-u2x", complexity=3,
  oracle_lines=["(2^x)^2 + 2^x - 6 = 0", "(2^x + 3)(2^x - 2) = 0", "2^x = -3 or 2^x = 2", None, "x = 1"],
  why="2^x = -3 has no real solution; 2^x = 2 iff x = 1")
w("exponential quadratic: impossible branch 'solved' with a log", "substitution in an exponential equation", solve("4^x + 2^x - 6 = 0"),
  ["(2^x + 3)(2^x - 2) = 0", "2^x = -3 or 2^x = 2", "x = -log2(3) or x = 1"], "invalid", answer="x = 1", pair="adv-u2x", complexity=3,
  why="2^(-log2 3) = 1/3, not -3; x = -log2(3) is not a solution")
w("exponential quadratic: stopped at the u-level", "missing final step", solve("e^(2x) - 5e^x + 6 = 0"),
  ["(e^x - 2)(e^x - 3) = 0", "e^x = 2 or e^x = 3"], "incomplete", answer="x = ln(2) or x = ln(3)", pair="adv-uex", complexity=2,
  composition=False, why="nothing false, but x is not isolated")
w("exponential quadratic: finished", "missing final step", solve("e^(2x) - 5e^x + 6 = 0"),
  ["(e^x - 2)(e^x - 3) = 0", "e^x = 2 or e^x = 3", "x = ln(2) or x = ln(3)"], "valid-equivalence", answer="x = ln(2) or x = ln(3)",
  pair="adv-uex", complexity=2, why="ln is the inverse of exp")
t("exponential quadratic inequality solved through u = e^x", "substitution + monotonic map in an inequality",
  "e^(2x) - 5e^x + 6 < 0", "ln(2) < x < ln(3)", "valid-equivalence", pair="adv-uexineq", complexity=3,
  why="(u-2)(u-3) < 0 iff 2 < u < 3; ln is increasing")
t("exponential quadratic inequality: the u-interval reported for x", "substitution + monotonic map in an inequality",
  "e^(2x) - 5e^x + 6 < 0", "2 < x < 3", "invalid", pair="adv-uexineq", complexity=3,
  why="x = 1 (e^1 in (2,3)) solves prev but is not in (2,3)")
t("exponential inequality with base below 1 flips", "monotonicity direction of an exponential", "(1/2)^x > 4", "x < -2",
  "valid-equivalence", pair="adv-halfexp", complexity=2, notation="unfamiliar", oracle_prev="2^(-x) > 4", why="(1/2)^x = 2^(-x) > 2^2 iff -x > 2")
t("exponential inequality with base below 1, flip forgotten", "monotonicity direction of an exponential", "(1/2)^x > 4", "x > -2",
  "invalid", pair="adv-halfexp", complexity=2, notation="unfamiliar", oracle_prev="2^(-x) > 4", why="x = -3: (1/2)^-3 = 8 > 4 but -3 is not > -2")
t("decimal base below 1, same inequality", "monotonicity direction + decimal notation", "0.5^x > 4", "x < -2", "valid-equivalence",
  pair="adv-halfexp", notation="unfamiliar", complexity=2, oracle_prev="2^(-x) > 4",
  why="0.5 = 1/2 exactly and 0.5^x = 2^(-x) (canonical oracle form used because the oracle's solver cannot decide (1/2)^x directly)")
t("exponent equation with a product on the right", "exponent laws in an equation", "2^(x^2) = 8·2^x", "x^2 = 3 + x",
  "valid-equivalence", notation="unfamiliar", oracle_prev="2^(x^2) = 8*2^x", pair="adv-exp2", complexity=2,
  why="8 * 2^x = 2^(x+3); 2^t is injective")
t("exponent equation: product of powers misread as power of a product", "exponent laws in an equation", "2^(x^2) = 8·2^x",
  "x^2 = 3x", "invalid", notation="unfamiliar", oracle_prev="2^(x^2) = 8*2^x", pair="adv-exp2", complexity=2,
  why="8 * 2^x = 2^(x+3), not 2^(3x); x = (1+sqrt13)/2 solves prev but not next")

# =====================================================================================================================
# 7. partial fractions followed by a log rule; integration constants; antiderivative domains
# =====================================================================================================================
w("partial fractions then combine logs, defined only for |x| > 1", "antiderivative domain after a log rule",
  {"type": "indefinite-integral", "f": "1/(x^2-1)", "var": "x"},
  ["1/(x^2-1) = (1/2)/(x-1) - (1/2)/(x+1)", "= (1/2)ln|x-1| - (1/2)ln|x+1| + C", "= (1/2)ln((x-1)/(x+1)) + C"],
  "domain-violation", answer="(1/2)ln|(x-1)/(x+1)| + C", pair="adv-pf1", difficulty="hard", complexity=4,
  oracle_lines=["claim: 1/(x^2-1) = (1/2)/(x-1) - (1/2)/(x+1)", None, "final: (1/2)ln((x-1)/(x+1)) + C"],
  why="dropping the absolute value makes the result undefined on (-1,1) where the integrand is defined")
w("partial fractions then combine logs keeping the absolute value", "antiderivative domain after a log rule",
  {"type": "indefinite-integral", "f": "1/(x^2-1)", "var": "x"},
  ["1/(x^2-1) = (1/2)/(x-1) - (1/2)/(x+1)", "= (1/2)ln|x-1| - (1/2)ln|x+1| + C", "= (1/2)ln|(x-1)/(x+1)| + C"],
  "valid-equivalence", answer="(1/2)ln|(x-1)/(x+1)| + C", pair="adv-pf1", difficulty="hard", complexity=4,
  oracle_lines=["claim: 1/(x^2-1) = (1/2)/(x-1) - (1/2)/(x+1)", None, "final: (1/2)ln|(x-1)/(x+1)| + C"],
  why="derivative of (1/2)ln|x-1| - (1/2)ln|x+1| is (1/2)(1/(x-1) - 1/(x+1)) = 1/(x^2-1) on its whole domain. "
      "[uncertified: the oracle cannot differentiate-and-compare ln|u| antiderivatives exactly; unavoidable for the natural |.| form]")
w("partial fractions with the coefficients' signs swapped", "partial fractions correctness",
  {"type": "indefinite-integral", "f": "1/(x^2-1)", "var": "x"},
  ["1/(x^2-1) = (1/2)/(x+1) - (1/2)/(x-1)", "= (1/2)ln|(x+1)/(x-1)| + C"], "invalid", answer="(1/2)ln|(x-1)/(x+1)| + C",
  pair="adv-pf1", complexity=4, oracle_lines=["claim: 1/(x^2-1) = (1/2)/(x+1) - (1/2)/(x-1)", "final: (1/2)ln|(x+1)/(x-1)| + C"],
  why="at x = 0: 1/(0-1) = -1 but (1/2)/1 - (1/2)/(-1) = 1; the result is the negative of an antiderivative")
w("partial fractions then a false log rule (difference of logs as quotient of logs)", "incorrectly applied log law",
  {"type": "indefinite-integral", "f": "1/(x^2-1)", "var": "x"},
  ["= (1/2)ln|x-1| - (1/2)ln|x+1| + C", "= (1/2)·ln|x-1|/ln|x+1| + C"], "invalid", answer="(1/2)ln|(x-1)/(x+1)| + C",
  pair="adv-pf1", complexity=4, notation="unfamiliar", oracle_lines=[None, "final: (1/2)ln|x-1|/ln|x+1| + C"],
  why="ln a - ln b = ln(a/b), not ln a / ln b; differentiating the result does not give 1/(x^2-1) (e.g. at x = 3)")
w("partial fractions with unequal coefficients, logs combined", "partial fractions + log power rule",
  {"type": "indefinite-integral", "f": "(3x+1)/((x-1)(x+1))", "var": "x"},
  ["(3x+1)/((x-1)(x+1)) = 2/(x-1) + 1/(x+1)", "= 2ln|x-1| + ln|x+1| + C", "= ln|(x-1)^2(x+1)| + C"], "valid-equivalence",
  answer="ln|(x-1)^2(x+1)| + C", pair="adv-pf2", difficulty="hard", complexity=4,
  oracle_lines=["claim: (3x+1)/((x-1)(x+1)) = 2/(x-1) + 1/(x+1)", None, "final: ln|(x-1)^2(x+1)| + C"],
  why="cover-up: A = 4/2 = 2, B = -2/-2 = 1; 2 ln|u| = ln u^2 for u != 0. "
      "[uncertified: the oracle cannot decide ln|u| antiderivatives; unavoidable for the natural |.| form]")
w("partial fractions with one coefficient wrong", "partial fractions + log power rule",
  {"type": "indefinite-integral", "f": "(3x+1)/((x-1)(x+1))", "var": "x"},
  ["(3x+1)/((x-1)(x+1)) = 2/(x-1) - 1/(x+1)", "= ln|(x-1)^2/(x+1)| + C"], "invalid", answer="ln|(x-1)^2(x+1)| + C",
  pair="adv-pf2", complexity=4, oracle_lines=["claim: (3x+1)/((x-1)(x+1)) = 2/(x-1) - 1/(x+1)", "final: ln|(x-1)^2/(x+1)| + C"],
  why="at x = 0: (3*0+1)/(-1) = -1 but 2/(-1) - 1/1 = -3")
w("antiderivative of 2x/(x^2-1) without absolute value", "antiderivative domain", {"type": "indefinite-integral", "f": "2x/(x^2-1)", "var": "x"},
  ["u = x^2 - 1, du = 2x dx", "= ln(x^2 - 1) + C"], "domain-violation", answer="ln|x^2-1| + C", pair="adv-ln2x", complexity=3,
  oracle_lines=[None, "final: ln(x^2 - 1) + C"], why="ln(x^2-1) is undefined on (-1,1), where the integrand is defined")
w("antiderivative of 2x/(x^2-1) written as half the log of a square", "antiderivative domain", {"type": "indefinite-integral", "f": "2x/(x^2-1)", "var": "x"},
  ["u = x^2 - 1, du = 2x dx", "= (1/2)ln((x^2 - 1)^2) + C"], "valid-equivalence", answer="ln|x^2-1| + C", pair="adv-ln2x", complexity=3,
  notation="unfamiliar", oracle_lines=[None, "final: (1/2)ln((x^2 - 1)^2) + C"],
  why="(1/2)ln(u^2) = ln|u| for u != 0, so this is ln|x^2-1|, an antiderivative on the whole domain x != ±1")
w("antiderivative of 1/x as ln x", "antiderivative domain", {"type": "indefinite-integral", "f": "1/x", "var": "x"}, ["ln(x) + C"],
  "domain-violation", answer="ln|x| + C", pair="adv-lnx", difficulty="easy", complexity=1, composition=False,
  oracle_lines=["final: ln(x) + C"], why="ln x covers only x > 0; 1/x is also defined for x < 0")
w("antiderivative of 1/x as ln|x|", "antiderivative domain", {"type": "indefinite-integral", "f": "1/x", "var": "x"}, ["ln|x| + C"],
  "valid-equivalence", answer="ln|x| + C", pair="adv-lnx", difficulty="easy", complexity=1, composition=False,
  oracle_lines=["final: ln|x| + C"], why="(ln|x|)' = 1/x for x != 0")
w("antiderivative of tan x without the absolute value", "antiderivative domain (trig)", {"type": "indefinite-integral", "f": "tan(x)", "var": "x"},
  ["tan(x) = sin(x)/cos(x), u = cos(x)", "= -ln(cos(x)) + C"], "domain-violation", answer="-ln|cos(x)| + C", pair="adv-tan-int",
  complexity=3, oracle_lines=[None, "final: -ln(cos(x)) + C"], why="-ln(cos x) is undefined where cos x < 0 but tan is defined there")
w("antiderivative of tan x with absolute value", "antiderivative domain (trig)", {"type": "indefinite-integral", "f": "tan(x)", "var": "x"},
  ["tan(x) = sin(x)/cos(x), u = cos(x)", "= -ln|cos(x)| + C"], "valid-equivalence", answer="-ln|cos(x)| + C", pair="adv-tan-int",
  complexity=3, oracle_lines=[None, "final: -ln|cos(x)| + C"], why="d/dx(-ln|cos x|) = sin x / cos x wherever cos x != 0. [uncertified: oracle cannot decide ln|u| antiderivatives]")
w("two different-looking antiderivatives of sin x cos x: sin^2/2", "constant of integration (equivalent families)",
  {"type": "indefinite-integral", "f": "sin(x)cos(x)", "var": "x"}, ["u = sin(x)", "= sin(x)^2/2 + C"], "valid-equivalence",
  answer="sin(x)^2/2 + C", pair="adv-sincos-int", complexity=2, oracle_lines=[None, "final: sin(x)^2/2 + C"], domain="calculus",
  why="d/dx sin^2/2 = sin cos")
w("two different-looking antiderivatives of sin x cos x: -cos^2/2", "constant of integration (equivalent families)",
  {"type": "indefinite-integral", "f": "sin(x)cos(x)", "var": "x"}, ["u = cos(x)", "= -cos(x)^2/2 + C"], "valid-equivalence",
  answer="-cos(x)^2/2 + C", pair="adv-sincos-int", complexity=2, oracle_lines=[None, "final: -cos(x)^2/2 + C"],
  why="d/dx(-cos^2/2) = sin cos; differs from sin^2/2 by the constant 1/2")
w("two different-looking antiderivatives of sin x cos x: -cos(2x)/4", "constant of integration (equivalent families)",
  {"type": "indefinite-integral", "f": "sin(x)cos(x)", "var": "x"}, ["sin(x)cos(x) = sin(2x)/2", "= -cos(2x)/4 + C"],
  "valid-equivalence", answer="-cos(2x)/4 + C", pair="adv-sincos-int", complexity=2,
  oracle_lines=["claim: sin(x)cos(x) = sin(2x)/2", "final: -cos(2x)/4 + C"], why="d/dx(-cos 2x / 4) = sin(2x)/2")
w("double-angle antiderivative with a factor-of-2 slip", "chain rule inside an integral",
  {"type": "indefinite-integral", "f": "sin(x)cos(x)", "var": "x"}, ["sin(x)cos(x) = sin(2x)/2", "= -cos(2x)/2 + C"], "invalid",
  answer="-cos(2x)/4 + C", pair="adv-sincos-int", complexity=2,
  oracle_lines=["claim: sin(x)cos(x) = sin(2x)/2", "final: -cos(2x)/2 + C"], why="d/dx(-cos 2x / 2) = sin 2x = 2 sin x cos x")
w("same antiderivative without + C", "constant of integration", {"type": "indefinite-integral", "f": "sin(x)cos(x)", "var": "x"},
  ["u = sin(x)", "= sin(x)^2/2"], "domain-violation", answer="sin(x)^2/2 + C", pair="adv-sincos-int", complexity=2,
  oracle_lines=[None, "final: sin(x)^2/2"], why="the constant of integration is omitted")
w("antiderivative of sqrt(x^2) treated as x", "sqrt-square inside an integral", {"type": "indefinite-integral", "f": "sqrt(x^2)", "var": "x"},
  ["sqrt(x^2) = x", "= x^2/2 + C"], "invalid", answer="x|x|/2 + C", pair="adv-intabs", difficulty="hard", complexity=3,
  oracle_lines=[None, "final: x^2/2 + C"], why="d/dx(x^2/2) = x, which is -1 at x = -1 where sqrt(x^2) = 1")
w("antiderivative of sqrt(x^2) as x|x|/2", "sqrt-square inside an integral", {"type": "indefinite-integral", "f": "sqrt(x^2)", "var": "x"},
  ["sqrt(x^2) = |x|", "= x|x|/2 + C"], "valid-equivalence", answer="x|x|/2 + C", pair="adv-intabs", difficulty="hard", complexity=3,
  oracle_lines=["claim: sqrt(x^2) = |x|", "final: x|x|/2 + C"], why="d/dx(x|x|/2) = |x| (see d/dx x|x| = 2|x|)")
w("integral of a removable-singularity quotient", "antiderivative after cancellation",
  {"type": "indefinite-integral", "f": "(x^2-1)/(x-1)", "var": "x"}, ["for x ≠ 1 the integrand is x + 1", "= x^2/2 + x + C"],
  "valid-equivalence", answer="x^2/2 + x + C", pair="adv-intcancel", complexity=2, oracle_lines=[None, "final: x^2/2 + x + C"],
  why="the antiderivative's derivative x + 1 equals the integrand on its domain")
w("integral of a removable-singularity quotient, division done wrongly", "antiderivative after cancellation",
  {"type": "indefinite-integral", "f": "(x^2-1)/(x-1)", "var": "x"}, ["the integrand is x - 1", "= x^2/2 - x + C"], "invalid",
  answer="x^2/2 + x + C", pair="adv-intcancel", complexity=2, oracle_lines=[None, "final: x^2/2 - x + C"],
  why="(x^2-1)/(x-1) = x + 1 for x != 1, not x - 1")
w("definite integral across a non-integrable singularity by the FTC", "limits/convergence condition for the FTC",
  {"type": "definite-integral", "f": "1/(x-1)^2", "a": "0", "b": "2", "var": "x"},
  ["antiderivative -1/(x-1)", "[-1/(x-1)] from 0 to 2 = -1 - 1", "= -2"], "invalid", answer="diverges (+oo)", pair="adv-ftc",
  difficulty="hard", complexity=3, oracle_lines=[None, None, "final: -2"],
  why="the integrand is positive and not integrable at x = 1; the improper integral diverges to +oo, so a negative value is impossible")
w("definite integral away from the singularity", "limits/convergence condition for the FTC",
  {"type": "definite-integral", "f": "1/(x-1)^2", "a": "2", "b": "3", "var": "x"},
  ["antiderivative -1/(x-1)", "[-1/(x-1)] from 2 to 3 = -1/2 + 1", "= 1/2"], "valid-equivalence", answer="1/2", pair="adv-ftc",
  difficulty="medium", complexity=3, oracle_lines=[None, None, "final: 1/2"], why="the integrand is continuous on [2,3]; FTC applies")
w("definite integral of |cos x| split at the sign change", "abs inside a definite integral",
  {"type": "definite-integral", "f": "|cos(x)|", "a": "0", "b": "pi", "var": "x"},
  ["= integral of cos x on [0, pi/2] - integral of cos x on [pi/2, pi]", "= (1 - 0) - (0 - 1)", "= 2"], "valid-equivalence",
  answer="2", pair="adv-intabscos", complexity=3, oracle_lines=[None, None, "final: 2"], why="cos >= 0 on [0,pi/2], <= 0 on [pi/2,pi]")
w("definite integral of |cos x| with the absolute value ignored", "abs inside a definite integral",
  {"type": "definite-integral", "f": "|cos(x)|", "a": "0", "b": "pi", "var": "x"}, ["= [sin x] from 0 to pi", "= 0"], "invalid",
  answer="2", pair="adv-intabscos", complexity=3, oracle_lines=[None, "final: 0"],
  why="|cos x| >= 0 and is positive except at pi/2, so the integral is positive (it is 2)")
w("definite integral of 1/x on a negative interval via ln|x|", "antiderivative domain in a definite integral",
  {"type": "definite-integral", "f": "1/x", "a": "-2", "b": "-1", "var": "x"}, ["= [ln|x|] from -2 to -1", "= ln(1) - ln(2)", "= -ln(2)"],
  "valid-equivalence", answer="-ln(2)", pair="adv-intneg", complexity=3, oracle_lines=[None, None, "final: -ln(2)"],
  why="ln|x| is an antiderivative of 1/x on [-2,-1]")
w("definite integral of 1/x on a negative interval via ln of negatives", "antiderivative domain in a definite integral",
  {"type": "definite-integral", "f": "1/x", "a": "-2", "b": "-1", "var": "x"},
  ["= [ln(x)] from -2 to -1", "= ln(-1) - ln(-2) = ln((-1)/(-2))", "= -ln(2)"], "wrong-reason", answer="-ln(2)", pair="adv-intneg",
  difficulty="hard", complexity=3, oracle_lines=[None, None, "final: -ln(2)"],
  why="the value -ln 2 is right, but ln x is undefined on [-2,-1]; the cancellation of ln(-1) - ln(-2) uses meaningless terms")
w("definite integral of 1/x across 0 'by symmetry'", "limits/convergence condition for the FTC",
  {"type": "definite-integral", "f": "1/x", "a": "-1", "b": "1", "var": "x"}, ["1/x is odd, so the integral is", "= 0"], "invalid",
  answer="diverges", pair="adv-ftc", difficulty="hard", complexity=3, oracle_lines=[None, "final: 0"],
  why="the improper integral diverges (each half diverges); symmetry only gives the Cauchy principal value. "
      "[uncertified: the oracle's exact integral reference is not computable for a divergent odd integrand]")

# =====================================================================================================================
# 8. exponent laws with negative bases / even roots
# =====================================================================================================================
t("(x^2)^(3/2) is |x|^3, not x^3", "exponent law with a possibly negative base", "(x^2)^(3/2)", "x^3", "invalid", kind="expression",
  pair="adv-explaw1", complexity=2, why="x = -1: (1)^(3/2) = 1 but (-1)^3 = -1")
t("(x^2)^(3/2) is |x|^3", "exponent law with a possibly negative base", "(x^2)^(3/2)", "|x|^3", "valid-equivalence", kind="expression",
  pair="adv-explaw1", complexity=2, why="(x^2)^(3/2) = (sqrt(x^2))^3 = |x|^3")
t("(x^2)^(3/2) = x^3 under x >= 0", "exponent law with a possibly negative base", "(x^2)^(3/2)", "x^3", "valid-equivalence",
  kind="expression", assumptions=["x >= 0"], pair="adv-explaw1", complexity=2, why="|x| = x for x >= 0")
t("(x^4)^(1/4) is |x|", "even root of an even power", "(x^4)^(1/4)", "x", "invalid", kind="expression", pair="adv-explaw2",
  why="x = -2: 16^(1/4) = 2 != -2")
t("(x^4)^(1/4) = |x|", "even root of an even power", "(x^4)^(1/4)", "|x|", "valid-equivalence", kind="expression", pair="adv-explaw2",
  why="the principal fourth root of x^4 is |x|")
t("(x^(1/4))^4 = x needs x >= 0", "even root then power widens the domain", "(x^(1/4))^4", "x", "domain-violation", kind="expression",
  pair="adv-explaw2", why="x^(1/4) is defined only for x >= 0; x is defined everywhere")
t("(x^6)^(1/3) = x^2 for all real x", "odd root of an even power", "(x^6)^(1/3)", "x^2", "valid-equivalence", kind="expression",
  pair="adv-explaw3", difficulty="hard", why="x^6 >= 0 and (x^2)^3 = x^6, so the real cube root is x^2 (no sign issue)")
t("(x^6)^(1/2) = x^3 is false", "even root of an even power", "(x^6)^(1/2)", "x^3", "invalid", kind="expression",
  pair="adv-explaw3", why="x = -1: sqrt(1) = 1 != -1")
w("cube root of a negative number rewritten through an even power", "exponent law with a negative base",
  {"type": "evaluate", "start": "cbrt(-8)"}, ["((-8)^2)^(1/6)", "64^(1/6)", "2"], "invalid", answer="-2", pair="adv-negbase",
  complexity=2, why="(a^m)^(1/n) = a^(m/n) fails for a < 0 when m is even: cbrt(-8) = -2, not 2")
w("cube root of a negative number via oddness", "exponent law with a negative base", {"type": "evaluate", "start": "cbrt(-8)"},
  ["-cbrt(8)", "-2"], "valid-equivalence", answer="-2", pair="adv-negbase", complexity=2, why="the real cube root is odd")
t("e^(2 ln x) = x^2 only for x > 0", "exp-log composition domain", "e^(2ln(x))", "x^2", "domain-violation", kind="expression",
  pair="adv-explog", why="the left side is defined only for x > 0")
t("e^(2 ln x) = x^2 with x > 0", "exp-log composition domain", "e^(2ln(x))", "x^2", "valid-equivalence", kind="expression",
  assumptions=["x > 0"], pair="adv-explog", why="e^(2 ln x) = (e^(ln x))^2 = x^2 for x > 0")
t("sqrt of a product split into a product of sqrts", "radical law domain", "sqrt(x(x-1))", "sqrt(x)sqrt(x-1)", "invalid",
  kind="expression", pair="adv-sqrtprod", why="x = -1: sqrt(2) is defined, sqrt(-1) is not")
t("sqrt of a product split with both factors nonnegative", "radical law domain", "sqrt(x(x-1))", "sqrt(x)sqrt(x-1)",
  "valid-equivalence", kind="expression", assumptions=["x >= 1"], pair="adv-sqrtprod", why="for x >= 1 both factors are >= 0")
t("sqrt of a quotient split into a quotient of sqrts", "radical law domain", "sqrt((x-1)/(x+2))", "sqrt(x-1)/sqrt(x+2)", "invalid",
  kind="expression", pair="adv-sqrtquot", complexity=2, why="x = -3: sqrt(4) = 2 defined; sqrt(-4) undefined")
t("sqrt of a quotient split for x >= 1", "radical law domain", "sqrt((x-1)/(x+2))", "sqrt(x-1)/sqrt(x+2)", "valid-equivalence",
  kind="expression", assumptions=["x >= 1"], pair="adv-sqrtquot", complexity=2, why="x - 1 >= 0 and x + 2 > 0")
t("sqrt(-x)·sqrt(-x) = -x requires x <= 0", "radical product with a negated argument", "sqrt(-x)·sqrt(-x)", "-x", "domain-violation",
  kind="expression", notation="unfamiliar", oracle_prev="sqrt(-x)*sqrt(-x)", pair="adv-sqrtneg", why="defined only for x <= 0; -x is defined everywhere")
t("sqrt(-x)·sqrt(-x) = x is false", "radical product with a negated argument", "sqrt(-x)·sqrt(-x)", "x", "invalid",
  kind="expression", notation="unfamiliar", oracle_prev="sqrt(-x)*sqrt(-x)", pair="adv-sqrtneg", why="x = -1: 1*1 = 1 but x = -1")
t("cube both sides of an equation with a negative right side", "odd power is injective", "(x-1)^3 = -8", "x - 1 = -2",
  "valid-equivalence", pair="adv-cube", why="t -> t^3 is injective on the reals")
t("square root of both sides without ±", "even power is not injective", "(x-1)^2 = 4", "x - 1 = 2", "invalid", pair="adv-cube",
  why="x = -1 solves (x-1)^2 = 4 but not x - 1 = 2")
t("square root of both sides with ±", "even power is not injective", "(x-1)^2 = 4", "x - 1 = ±2", "valid-equivalence", pair="adv-cube",
  notation="unfamiliar", why="t^2 = 4 iff t = 2 or t = -2")

# =====================================================================================================================
# 9. cancellation across zero / division by symbolic quantities, in equations and inequalities
# =====================================================================================================================
t("cubic inequality: dividing by x^2 - 1 whose sign varies", "sign of multiplier in inequalities", "x(x^2-1) > 2(x^2-1)", "x > 2",
  "invalid", pair="adv-cubineq", complexity=3, why="x = 0: 0 > -2 holds but 0 is not > 2")
t("cubic inequality: move and factor", "sign of multiplier in inequalities", "x(x^2-1) > 2(x^2-1)", "(x-2)(x^2-1) > 0",
  "valid-equivalence", pair="adv-cubineq", complexity=3, why="subtracting 2(x^2-1) and factoring is reversible")
t("cubic inequality solved by a sign chart", "sign of multiplier in inequalities", "x(x^2-1) > 2(x^2-1)", "-1 < x < 1 or x > 2",
  "valid-equivalence", pair="adv-cubineq", complexity=3, why="(x-2)(x-1)(x+1) > 0 on (-1,1) and (2,oo)")
t("dividing by a positive factor e^x in an inequality is safe", "sign of multiplier in inequalities", "e^x(x^2-1) < 0", "x^2 < 1",
  "valid-equivalence", pair="adv-posdiv", why="e^x > 0 for every x")
t("dividing by x in an inequality", "sign of multiplier in inequalities", "x(x^2-1) < 0", "x^2 < 1", "invalid", pair="adv-posdiv",
  why="x = -2: -2*3 = -6 < 0 holds but 4 < 1 fails")
t("dividing by sqrt(x) in an inequality is safe where defined, but changes nothing else", "sign of multiplier in inequalities",
  "sqrt(x)(x-2) > 0", "x > 2", "valid-equivalence", pair="adv-posdiv", complexity=2,
  why="domain x >= 0; product > 0 needs sqrt(x) > 0 and x > 2")
t("reciprocal inequality: multiplying by x", "sign of multiplier in inequalities", "1/x < 2", "1 < 2x", "invalid", pair="adv-recip",
  why="x = -1: -1 < 2 holds but 1 < -2 fails")
t("reciprocal inequality solved", "sign of multiplier in inequalities", "1/x < 2", "x < 0 or x > 1/2", "valid-equivalence",
  pair="adv-recip", why="(1 - 2x)/x < 0 iff x < 0 or x > 1/2")
t("reciprocal inequality: decimal boundary", "exact decimals", "1/x < 2", "x < 0 or x > 0.5", "valid-equivalence", pair="adv-recip",
  notation="unfamiliar", why="0.5 = 1/2 exactly")
t("rational inequality with a squared numerator: the zero is a solution", "boundary points of rational inequalities",
  "(x-2)^2/(x+1) <= 0", "x < -1 or x = 2", "valid-equivalence", pair="adv-sqnum", complexity=3,
  why="numerator >= 0, zero only at x = 2; denominator negative iff x < -1")
t("rational inequality with a squared numerator: the zero lost", "boundary points of rational inequalities",
  "(x-2)^2/(x+1) <= 0", "x < -1", "invalid", pair="adv-sqnum", complexity=3, why="x = 2 gives 0 <= 0 but is not < -1")
t("rational inequality with a squared numerator: pole included", "boundary points of rational inequalities",
  "(x-2)^2/(x+1) <= 0", "x <= -1 or x = 2", "domain-violation", pair="adv-sqnum", complexity=3,
  why="x = -1 makes the denominator zero; next admits it, prev does not")
t("radical quotient cancelled, x = 1 removable", "cancellation across zero (radical)", "(x-1)/(sqrt(x)-1)", "sqrt(x) + 1",
  "domain-violation", kind="expression", pair="adv-radcancel", complexity=2,
  why="x - 1 = (sqrt x - 1)(sqrt x + 1) for x >= 0; the quotient is undefined at x = 1")
t("radical quotient cancelled with x != 1", "cancellation across zero (radical)", "(x-1)/(sqrt(x)-1)", "sqrt(x) + 1",
  "valid-equivalence", kind="expression", assumptions=["x != 1"], pair="adv-radcancel", complexity=2,
  why="both defined on [0,1) U (1,oo), equal there")
w("radical-quotient equation solved via cancellation with x != 1", "cancellation across zero (radical)",
  solve("(x-1)/(sqrt(x)-1) = 3"), ["x ≠ 1", "sqrt(x) + 1 = 3", "sqrt(x) = 2", "x = 4"], "valid-equivalence", answer="x = 4",
  pair="adv-radcancel-w", complexity=3, oracle_lines=["restrict: x != 1", "sqrt(x) + 1 = 3", "sqrt(x) = 2", "x = 4"],
  why="for x >= 0, x != 1 the equation is sqrt x + 1 = 3")
w("radical-quotient equation where cancellation would admit the excluded point", "cancellation across zero (radical)",
  solve("(x-1)/(sqrt(x)-1) = 2"), ["sqrt(x) + 1 = 2", "sqrt(x) = 1", "x = 1"], "invalid", answer="no solution",
  pair="adv-radcancel-w", difficulty="hard", complexity=3,
  why="the left side is undefined at x = 1 (0/0) and equals sqrt x + 1 != 2 elsewhere; no solution")
w("simplify a rational expression with continuation lines, restriction stated", "cancellation across zero (expression)",
  {"type": "simplify", "start": "(x^2-9)/(x^2-x-6)"}, ["= (x-3)(x+3)/((x-3)(x+2))", "x ≠ 3, x ≠ -2", "= (x+3)/(x+2)"],
  "valid-equivalence", answer="(x+3)/(x+2), x != 3", pair="adv-ratsimp", notation="unfamiliar", complexity=2,
  oracle_lines=["(x-3)(x+3)/((x-3)(x+2))", "restrict: x != 3", "(x+3)/(x+2)"],
  why="factor and cancel x - 3 with x = 3 excluded")
w("simplify a rational expression with continuation lines, restriction omitted", "cancellation across zero (expression)",
  {"type": "simplify", "start": "(x^2-9)/(x^2-x-6)"}, ["= (x-3)(x+3)/((x-3)(x+2))", "= (x+3)/(x+2)"], "domain-violation",
  answer="(x+3)/(x+2), x != 3", pair="adv-ratsimp", notation="unfamiliar", complexity=2,
  oracle_lines=["(x-3)(x+3)/((x-3)(x+2))", "(x+3)/(x+2)"], why="the result is defined at x = 3 where the original is not")
w("simplify a rational expression: stopped before cancelling", "missing final step", {"type": "simplify", "start": "(x^2-9)/(x^2-x-6)"},
  ["= (x-3)(x+3)/((x-3)(x+2))"], "incomplete", answer="(x+3)/(x+2), x != 3", pair="adv-ratsimp", notation="unfamiliar",
  oracle_lines=["(x-3)(x+3)/((x-3)(x+2))"], why="a common factor remains")
w("simplify a rational expression: wrong cancellation of terms", "cancellation of terms vs. factors",
  {"type": "simplify", "start": "(x^2-9)/(x^2-x-6)"}, ["= (x^2-9)/(x^2-x-6)", "= 9/(x+6)"], "invalid", answer="(x+3)/(x+2), x != 3",
  pair="adv-ratsimp", oracle_lines=["(x^2-9)/(x^2-x-6)", "9/(x+6)"], why="x^2 terms cannot be cancelled across a sum; at x = 1 the original is (-8)/(-6) = 4/3 but 9/7")
w("difference quotient simplified, h != 0 stated", "cancellation across zero in a limit setup",
  {"type": "simplify", "start": "((x+h)^2 - x^2)/h"}, ["= (2xh + h^2)/h", "h ≠ 0", "= 2x + h"], "valid-equivalence",
  answer="2x + h (h != 0)", pair="adv-diffq", domain="calculus", complexity=2,
  oracle_lines=["(2xh + h^2)/h", "restrict: h != 0", "2x + h"], why="expand and cancel h, which is nonzero in a difference quotient")
w("difference quotient simplified, h != 0 not stated", "cancellation across zero in a limit setup",
  {"type": "simplify", "start": "((x+h)^2 - x^2)/h"}, ["= (2xh + h^2)/h", "= 2x + h"], "domain-violation", answer="2x + h (h != 0)",
  pair="adv-diffq", domain="calculus", complexity=2, oracle_lines=["(2xh + h^2)/h", "2x + h"],
  why="2x + h is defined at h = 0 where the quotient is not")
w("difference quotient with an expansion error", "cancellation across zero in a limit setup",
  {"type": "simplify", "start": "((x+h)^2 - x^2)/h"}, ["= (x^2 + h^2 - x^2)/h", "= h"], "invalid", answer="2x + h (h != 0)",
  pair="adv-diffq", domain="calculus", complexity=2, oracle_lines=["(x^2 + h^2 - x^2)/h", "h"],
  why="(x+h)^2 = x^2 + 2xh + h^2; at x = 1, h = 1 the original is 3, not 1")

# =====================================================================================================================
# 10. squaring inequalities; radical inequalities
# =====================================================================================================================
t("radical inequality squared although the right side can be negative", "squaring an inequality (sign of sides)",
  "sqrt(x+2) > x", "x + 2 > x^2", "invalid", pair="adv-sqineq1", difficulty="hard", complexity=3,
  why="x = -3/2: sqrt(1/2) > -3/2 holds, but 1/2 > 9/4 fails")
t("radical inequality solved by cases on the sign of x", "squaring an inequality (sign of sides)", "sqrt(x+2) > x", "-2 <= x < 2",
  "valid-equivalence", pair="adv-sqineq1", difficulty="hard", complexity=3,
  why="x < 0 in domain: always true ([-2,0)); x >= 0: x + 2 > x^2 iff x < 2")
t("radical inequality with unicode", "squaring an inequality (sign of sides)", "√(x+2) > x", "−2 ≤ x < 2", "valid-equivalence",
  pair="adv-sqineq1", difficulty="hard", complexity=3, notation="unfamiliar", oracle_prev="sqrt(x+2) > x", oracle_next="-2 <= x < 2",
  why="same statement as the ASCII version")
t("radical below x: squared without the sign condition", "squaring an inequality (sign of sides)", "sqrt(x+2) < x", "x + 2 < x^2",
  "valid-implication", pair="adv-sqineq2", difficulty="hard", complexity=3,
  why="prev implies x > 0 and x + 2 < x^2; next also admits x < -1 (e.g. x = -3), so only prev => next")
t("radical below x: solved", "squaring an inequality (sign of sides)", "sqrt(x+2) < x", "x > 2", "valid-equivalence",
  pair="adv-sqineq2", difficulty="hard", complexity=3, why="need x > 0 and x^2 - x - 2 > 0, i.e. x > 2")
t("radical inequality with unicode ≤ and implicit sqrt", "unfamiliar notation", "√(x+1) ≤ 2", "-1 ≤ x ≤ 3", "valid-equivalence",
  pair="adv-sqineq3", notation="unfamiliar", oracle_prev="sqrt(x+1) <= 2", oracle_next="-1 <= x <= 3", composition=False,
  why="0 <= x + 1 <= 4")
t("radical inequality, domain dropped", "natural domain in inequalities", "√(x+1) ≤ 2", "x ≤ 3", "domain-violation",
  pair="adv-sqineq3", notation="unfamiliar", oracle_prev="sqrt(x+1) <= 2", oracle_next="x <= 3", composition=False,
  why="x = -2 satisfies x <= 3 but sqrt(-1) is undefined")
t("abs inequality |x-3| < 2x as a double inequality", "abs inequality with a variable bound", "|x-3| < 2x", "-2x < x - 3 < 2x",
  "valid-equivalence", pair="adv-abslin", complexity=2, why="|A| < B iff -B < A < B")
t("abs inequality |x-3| < 2x solved", "abs inequality with a variable bound", "|x-3| < 2x", "x > 1", "valid-equivalence",
  pair="adv-abslin", complexity=2, why="x - 3 < 2x iff x > -3; -2x < x - 3 iff x > 1")
t("abs inequality |x-3| < 2x: only the positive case kept", "abs inequality with a variable bound", "|x-3| < 2x", "x > -3",
  "valid-implication", pair="adv-abslin", complexity=2, why="prev set (1,oo) is inside (-3,oo); x = 0 satisfies next only")

# =====================================================================================================================
# 11. multi-line reasoning with carried assumptions (case scopes)
# =====================================================================================================================
w("sum of two absolute values by cases, each case checked against its scope", "case-scope propagation",
  solve("|x-1| + |x+2| = 5"),
  ["case x < -2: -(x-1) - (x+2) = 5", "-2x - 1 = 5, x = -3 (in scope)", "case -2 ≤ x < 1: -(x-1) + (x+2) = 5", "3 = 5, no solution",
   "case x ≥ 1: (x-1) + (x+2) = 5", "2x + 1 = 5, x = 2 (in scope)", "x = -3 or x = 2"],
  "valid-equivalence", answer="x = -3 or x = 2", pair="adv-abscase", complexity=4,
  oracle_lines=["scope x < -2 | -(x-1) - (x+2) = 5", "scope x < -2 | x = -3", "scope -2 <= x < 1 | -(x-1) + (x+2) = 5", "scope -2 <= x < 1 | 3 = 5",
                "scope x >= 1 | (x-1) + (x+2) = 5", "scope x >= 1 | x = 2", "x = -3 or x = 2"],
  why="|-4| + |-1| = 5 and |1| + |4| = 5; the middle case is 3 = 5")
w("sum of two absolute values by cases, middle case algebra slip and scope not checked", "case-scope propagation",
  solve("|x-1| + |x+2| = 5"),
  ["case x < -2: -2x - 1 = 5, x = -3", "case -2 ≤ x < 1: -(x-1) + (x+2) = 5", "2x + 3 = 5, x = 1", "case x ≥ 1: 2x + 1 = 5, x = 2",
   "x = -3 or x = 1 or x = 2"],
  "invalid", answer="x = -3 or x = 2", pair="adv-abscase", complexity=4,
  oracle_lines=["scope x < -2 | x = -3", "scope -2 <= x < 1 | -(x-1) + (x+2) = 5", "scope -2 <= x < 1 | 2x + 3 = 5", "scope x >= 1 | x = 2",
                "x = -3 or x = 1 or x = 2"],
  why="-(x-1) + (x+2) = 3, not 2x + 3; and x = 1 is outside the case anyway; |0| + |3| = 3 != 5")
w("sum of two absolute values by cases, a valid case solution discarded", "case-scope propagation", solve("|x-1| + |x+2| = 5"),
  ["case x < -2: -2x - 1 = 5, x = -3", "but x must be positive for absolute values, reject", "case x ≥ 1: x = 2", "x = 2"],
  "invalid", answer="x = -3 or x = 2", pair="adv-abscase", complexity=3,
  oracle_lines=["scope x < -2 | x = -3", None, "scope x >= 1 | x = 2", "x = 2"], why="x = -3 is a solution; the reason given for rejecting it is false")
w("rational inequality: multiply by (x-1) with sign cases carried", "case-scope propagation in an inequality",
  solve("x/(x-1) > 2"),
  ["x ≠ 1", "case x > 1: x > 2(x-1), so x < 2", "giving 1 < x < 2", "case x < 1: x < 2(x-1), so x > 2", "no x satisfies x < 1 and x > 2", "1 < x < 2"],
  "valid-equivalence", answer="1 < x < 2", pair="adv-ratcase", complexity=4,
  oracle_lines=["restrict: x != 1", "scope x > 1 | x > 2(x-1)", "scope x > 1 | 1 < x < 2", "scope x < 1 | x < 2(x-1)", "scope x < 1 | empty", "1 < x < 2"],
  why="multiplying by x - 1 keeps the sign for x > 1 and flips it for x < 1")
w("rational inequality: multiply by (x-1) without cases", "sign of multiplier in inequalities", solve("x/(x-1) > 2"),
  ["x > 2(x-1)", "x > 2x - 2", "x < 2"], "invalid", answer="1 < x < 2", pair="adv-ratcase", complexity=3,
  why="x = 0: 0/(-1) = 0 > 2 is false, but 0 < 2")
w("rational inequality: bring to one side", "sign of multiplier in inequalities", solve("x/(x-1) > 2"),
  ["x ≠ 1", "x/(x-1) - 2 > 0", "(2 - x)/(x-1) > 0", "1 < x < 2"], "valid-equivalence", answer="1 < x < 2", pair="adv-ratcase", complexity=3,
  oracle_lines=["restrict: x != 1", "x/(x-1) - 2 > 0", "(2 - x)/(x-1) > 0", "1 < x < 2"],
  why="(2-x)/(x-1) > 0 iff numerator and denominator have the same sign: 1 < x < 2")
w("rational equation with a carried exclusion that removes a candidate", "carried assumption removes a root",
  solve("x/(x-2) + 1/(x+1) = 6/((x-2)(x+1))"),
  ["x ≠ 2 and x ≠ -1", "x(x+1) + (x-2) = 6", "x^2 + 2x - 8 = 0", "(x+4)(x-2) = 0", "x = -4 or x = 2", "x = 2 is excluded", "x = -4"],
  "valid-implication", answer="x = -4", pair="adv-ratexcl", complexity=4,
  oracle_lines=["restrict: x != 2 and x != -1", "x(x+1) + (x-2) = 6", "x^2 + 2x - 8 = 0", "(x+4)(x-2) = 0", "x = -4 or x = 2", None, "x = -4"],
  why="clearing (x-2)(x+1) is one-way; x = 2 is a root of the cleared equation but excluded; x = -4: -4/-6 + 1/-3 = 1/3 = 6/18")
w("rational equation: excluded value kept in the answer", "carried assumption removes a root",
  solve("x/(x-2) + 1/(x+1) = 6/((x-2)(x+1))"),
  ["x ≠ 2 and x ≠ -1", "x(x+1) + (x-2) = 6", "x^2 + 2x - 8 = 0", "(x+4)(x-2) = 0", "x = -4 or x = 2"],
  "invalid", answer="x = -4", pair="adv-ratexcl", complexity=4,
  oracle_lines=["restrict: x != 2 and x != -1", "x(x+1) + (x-2) = 6", "x^2 + 2x - 8 = 0", "(x+4)(x-2) = 0", "x = -4 or x = 2"],
  why="x = 2 was stated as excluded two lines earlier but is still reported")
w("log equation via ln with the domain carried from line 1", "carried assumption (log domain)",
  solve("ln(x) + ln(x-2) = ln(8)"), ["x > 2 for both logs", "ln(x(x-2)) = ln(8)", "x^2 - 2x - 8 = 0", "x = 4 or x = -2", "x = -2 < 2, reject", "x = 4"],
  "valid-implication", answer="x = 4", pair="adv-log2", complexity=3,
  oracle_lines=[None, "ln(x(x-2)) = ln(8)", "x^2 - 2x - 8 = 0", "x = 4 or x = -2", None, "x = 4"],
  why="combining logs widens the domain; -2 rejected using the carried condition x > 2")
w("log equation via ln: quotient rule cited for a product", "cited rule", solve("ln(x) + ln(x-2) = ln(8)"),
  ["by the quotient rule, ln(x(x-2)) = ln(8)", "x^2 - 2x - 8 = 0", "x = 4 or x = -2", "x = -2 makes ln(x) undefined, reject", "x = 4"],
  "wrong-reason", answer="x = 4", pair="adv-log2", complexity=3,
  oracle_lines=["ln(x(x-2)) = ln(8)", "x^2 - 2x - 8 = 0", "x = 4 or x = -2", None, "x = 4"],
  why="the step uses log a + log b = log(ab), the product rule; the cited quotient rule is wrong; result correct")
w("log equation via ln: no check", "carried assumption (log domain)", solve("ln(x) + ln(x-2) = ln(8)"),
  ["ln(x(x-2)) = ln(8)", "x^2 - 2x - 8 = 0", "x = 4 or x = -2"], "invalid", answer="x = 4", pair="adv-log2", complexity=3,
  why="x = -2 makes ln(x) undefined")
t("ln sum to polynomial: implication only", "carried assumption (log domain)", "ln(x) + ln(x-2) = ln(8)", "x^2 - 2x - 8 = 0",
  "domain-violation", pair="adv-log2t", complexity=2, why="next admits x = -2 where the logs are undefined")
t("ln sum solved", "carried assumption (log domain)", "ln(x) + ln(x-2) = ln(8)", "x = 4", "valid-equivalence", pair="adv-log2t",
  complexity=2, why="x(x-2) = 8 with x > 2")
w("show an identity on its domain with the restriction carried", "carried assumption in an identity proof",
  {"type": "show", "start": "(1 - cos(2x))/sin(2x)", "target": "tan(x)"},
  ["= 2sin(x)^2/(2sin(x)cos(x))", "= sin(x)/cos(x)", "= tan(x)"], "valid-equivalence", answer="tan(x) where sin(2x) != 0",
  pair="adv-showtan", domain="trigonometry", difficulty="hard", complexity=3, assumptions=["x > 0", "x < pi/2"],
  oracle_lines=["2sin(x)^2/(2sin(x)cos(x))", "sin(x)/cos(x)", "tan(x)"],
  why="on (0, pi/2) sin 2x != 0; 1 - cos 2x = 2 sin^2 x, sin 2x = 2 sin x cos x")
w("show the same identity with a double-angle error", "carried assumption in an identity proof",
  {"type": "show", "start": "(1 - cos(2x))/sin(2x)", "target": "tan(x)"}, ["= 2cos(x)^2/(2sin(x)cos(x))", "= cos(x)/sin(x)"], "invalid",
  answer="tan(x) where sin(2x) != 0", pair="adv-showtan", domain="trigonometry", difficulty="hard", complexity=3,
  assumptions=["x > 0", "x < pi/2"], oracle_lines=["2cos(x)^2/(2sin(x)cos(x))", "cos(x)/sin(x)"],
  why="1 - cos 2x = 2 sin^2 x, not 2 cos^2 x; at x = pi/6 the original is (1/2)/(sqrt3/2) = 1/sqrt3, the line gives sqrt3")
w("show (sin x + cos x)^2 = 1 + sin 2x", "trig identity chain", {"type": "show", "start": "(sin(x) + cos(x))^2", "target": "1 + sin(2x)"},
  ["= sin(x)^2 + 2sin(x)cos(x) + cos(x)^2", "= 1 + 2sin(x)cos(x)", "= 1 + sin(2x)"], "valid-equivalence", answer="1 + sin(2x)",
  oracle_lines=["sin(x)^2 + 2sin(x)cos(x) + cos(x)^2", "1 + 2sin(x)cos(x)", "1 + sin(2x)"],
  pair="adv-showsq", domain="trigonometry", why="expand; Pythagorean identity; double angle")
w("show (sin x + cos x)^2 = 1 + sin 2x with the freshman's dream", "trig identity chain",
  {"type": "show", "start": "(sin(x) + cos(x))^2", "target": "1 + sin(2x)"}, ["= sin(x)^2 + cos(x)^2", "= 1"], "invalid", oracle_lines=["sin(x)^2 + cos(x)^2", "1"],
  answer="1 + sin(2x)", pair="adv-showsq", domain="trigonometry", why="(a+b)^2 != a^2 + b^2; at x = pi/4 the start is 2, not 1")

# =====================================================================================================================
# 12. limits + domain / convergence
# =====================================================================================================================
w("limit at -oo of sqrt(x^2 + x) + x using |x| = -x", "limit with sqrt(x^2) = |x| for negative x",
  {"type": "limit", "f": "sqrt(x^2 + x) + x", "to": "-oo", "side": "both", "var": "x"},
  ["multiply by the conjugate: x/(sqrt(x^2 + x) - x)", "for x < 0, sqrt(x^2 + x) = |x|sqrt(1 + 1/x) = -x sqrt(1 + 1/x)",
   "= x/(-x(sqrt(1 + 1/x) + 1)) = -1/(sqrt(1 + 1/x) + 1)", "-> -1/2"],
  "valid-equivalence", answer="-1/2", pair="adv-limabs", difficulty="hard", complexity=4, oracle_lines=[None, None, None, "final: -1/2"],
  why="(sqrt(x^2+x)+x)(sqrt(x^2+x)-x) = x; with |x| = -x the quotient tends to -1/2")
w("limit at -oo of sqrt(x^2 + x) + x treating sqrt(x^2) as x", "limit with sqrt(x^2) = |x| for negative x",
  {"type": "limit", "f": "sqrt(x^2 + x) + x", "to": "-oo", "side": "both", "var": "x"},
  ["multiply by the conjugate: x/(sqrt(x^2 + x) - x)", "sqrt(x^2 + x) = x sqrt(1 + 1/x)", "= 1/(sqrt(1 + 1/x) - 1)", "the limit does not exist (division by 0)"],
  "invalid", answer="-1/2", pair="adv-limabs", difficulty="hard", complexity=4, oracle_lines=[None, "claim: sqrt(x^2 + x) = x sqrt(1 + 1/x)", None, None],
  why="line 2 is false for x < 0 (left > 0, right < 0); the limit exists and equals -1/2")
w("limit at -oo of a rational-radical quotient with the sign of x respected", "limit with sqrt(x^2) = |x|",
  {"type": "limit", "f": "(2x + 1)/sqrt(x^2 + 1)", "to": "-oo", "side": "both", "var": "x"},
  ["divide by |x| = -x: (2x + 1)/(-x) over sqrt(1 + 1/x^2)", "= (-2 - 1/x)/sqrt(1 + 1/x^2)", "-> -2"], "valid-equivalence", answer="-2",
  pair="adv-limabs2", complexity=3, oracle_lines=[None, None, "final: -2"], why="for x < 0, sqrt(x^2) = -x")
w("limit at -oo of a rational-radical quotient dividing by x inside the root", "limit with sqrt(x^2) = |x|",
  {"type": "limit", "f": "(2x + 1)/sqrt(x^2 + 1)", "to": "-oo", "side": "both", "var": "x"},
  ["divide top and bottom by x: (2 + 1/x)/sqrt(1 + 1/x^2)", "-> 2"], "invalid", answer="-2", pair="adv-limabs2", complexity=3,
  oracle_lines=[None, "final: 2"], why="sqrt(x^2 + 1)/x = -sqrt(1 + 1/x^2) for x < 0; the sign is lost")
w("limit of a radical difference quotient by rationalising", "limit after cancellation across zero",
  {"type": "limit", "f": "(sqrt(x+2) - 2)/(x - 2)", "to": "2", "side": "both", "var": "x"},
  ["for x ≠ 2: (sqrt(x+2) - 2)/(x - 2) = 1/(sqrt(x+2) + 2)", "-> 1/4"], "valid-equivalence", answer="1/4", pair="adv-limrad",
  complexity=3, oracle_lines=[None, "final: 1/4"], why="(sqrt(x+2) - 2)(sqrt(x+2) + 2) = x - 2")
w("limit of a radical difference quotient with a conjugate sign slip", "limit after cancellation across zero",
  {"type": "limit", "f": "(sqrt(x+2) - 2)/(x - 2)", "to": "2", "side": "both", "var": "x"},
  ["(sqrt(x+2) - 2)/(x - 2) = 1/(sqrt(x+2) - 2)", "-> 1/0, so the limit is infinite"], "invalid", answer="1/4", pair="adv-limrad",
  complexity=3, oracle_lines=["claim: (sqrt(x+2) - 2)/(x - 2) = 1/(sqrt(x+2) - 2)", None], why="the claimed identity is false (x = 7: 1/5 vs 1); the limit is 1/4")
w("limit of a removable singularity, justified by cancellation", "limit vs. value at a point",
  {"type": "limit", "f": "(x^2 - 1)/(x - 1)", "to": "1", "side": "both", "var": "x"}, ["for x ≠ 1 the quotient is x + 1", "-> 2"],
  "valid-equivalence", answer="2", pair="adv-limval", difficulty="easy", oracle_lines=[None, "final: 2"],
  why="the limit only uses values near 1, where the quotient equals x + 1")
w("limit of a removable singularity, justified by 'f(1) = 2'", "limit vs. value at a point",
  {"type": "limit", "f": "(x^2 - 1)/(x - 1)", "to": "1", "side": "both", "var": "x"}, ["f(1) = 2, so by continuity", "the limit is 2"],
  "wrong-reason", answer="2", pair="adv-limval", difficulty="medium", oracle_lines=[None, "final: 2"],
  why="f(1) is 0/0, undefined; f is not continuous at 1 (not defined), though the limit 2 is right")
w("sin(3x)/x by rescaling the standard limit", "standard limit under a substitution",
  {"type": "limit", "f": "sin(3x)/x", "to": "0", "side": "both", "var": "x"}, ["sin(3x)/x = 3·sin(3x)/(3x)", "-> 3·1 = 3"],
  "valid-equivalence", answer="3", pair="adv-limsin", oracle_lines=["claim: sin(3x)/x = 3sin(3x)/(3x)", "final: 3"],
  why="sin(u)/u -> 1 as u = 3x -> 0")
w("sin(3x)/x with the standard limit applied to the wrong argument", "standard limit under a substitution",
  {"type": "limit", "f": "sin(3x)/x", "to": "0", "side": "both", "var": "x"}, ["sin(u)/u -> 1", "so sin(3x)/x -> 1"], "invalid",
  answer="3", pair="adv-limsin", oracle_lines=[None, "final: 1"], why="the denominator is x, not 3x; the limit is 3")
w("one-sided limit of a quotient with an absolute value", "limits + domain of |.|",
  {"type": "limit", "f": "(x^2 - 4)/|x - 2|", "to": "2", "side": "right", "var": "x"}, ["for x > 2, |x - 2| = x - 2", "= x + 2", "-> 4"],
  "valid-equivalence", answer="4", pair="adv-limabs3", complexity=3, oracle_lines=[None, None, "final: 4"],
  why="(x-2)(x+2)/(x-2) = x + 2 for x > 2")
w("left limit of the same quotient taken as if from the right", "limits + domain of |.|",
  {"type": "limit", "f": "(x^2 - 4)/|x - 2|", "to": "2", "side": "left", "var": "x"}, ["|x - 2| = x - 2", "= x + 2", "-> 4"], "invalid",
  answer="-4", pair="adv-limabs3", complexity=3, oracle_lines=[None, None, "final: 4"],
  why="for x < 2, |x - 2| = 2 - x, giving -(x + 2) -> -4")
w("limit of ln x / (x - 1) at 1", "limit + log", {"type": "limit", "f": "ln(x)/(x - 1)", "to": "1", "side": "both", "var": "x"},
  ["this is the derivative of ln at 1", "= 1"], "valid-equivalence", answer="1", oracle_lines=[None, "final: 1"],
  why="(ln x - ln 1)/(x - 1) -> (ln)'(1) = 1")
w("series convergence argued from terms tending to 0", "convergence condition (necessary vs sufficient)",
  {"type": "statement-task", "calculusTask": "series", "statement": "sum of 1/n converges"},
  ["1/n -> 0 as n -> oo", "so the series sum 1/n converges"], "unsupported", answer="false: the harmonic series diverges",
  truth="invalid", pair="adv-series", why="terms tending to 0 is necessary, not sufficient; sum 1/n diverges (compare with log)")
w("series convergence by comparison with p = 2", "convergence condition (comparison test)",
  {"type": "statement-task", "calculusTask": "series", "statement": "sum of 1/(n^2 + n) converges"},
  ["0 < 1/(n^2 + n) < 1/n^2", "sum 1/n^2 converges (p = 2 > 1)", "so sum 1/(n^2 + n) converges by comparison"], "unsupported",
  answer="true", truth="valid", pair="adv-series", why="direct comparison with a convergent p-series")
w("Fermat's theorem applied at a non-differentiable minimum", "differentiability assumption",
  {"type": "statement-task", "calculusTask": "proof", "statement": "f(x) = |x| has f'(0) = 0"},
  ["|x| has a minimum at x = 0", "by Fermat's theorem f'(0) = 0"], "unsupported", answer="false: |x| is not differentiable at 0",
  truth="invalid", pair="adv-fermat", why="Fermat's theorem needs differentiability at the extremum; |x| has a corner at 0")
w("Fermat's theorem applied at a differentiable minimum", "differentiability assumption",
  {"type": "statement-task", "calculusTask": "proof", "statement": "f(x) = x^2 has f'(0) = 0"},
  ["x^2 has a minimum at x = 0 and is differentiable there", "by Fermat's theorem f'(0) = 0"], "unsupported", answer="true",
  truth="valid", pair="adv-fermat", why="hypotheses hold; also f'(0) = 0 directly")
w("mean value theorem across a pole", "continuity hypothesis of the MVT",
  {"type": "statement-task", "calculusTask": "proof", "statement": "there is c in (-1, 1) with f'(c) = (f(1) - f(-1))/2 for f(x) = 1/x"},
  ["by the mean value theorem such c exists"], "unsupported", answer="false: 1/x is not continuous on [-1,1]", truth="invalid",
  why="f'(c) = -1/c^2 < 0 but (f(1) - f(-1))/2 = 1; MVT fails because f is undefined at 0")
w("Rolle's theorem for |x| on [-1, 1]", "differentiability hypothesis of Rolle", {"type": "statement-task", "calculusTask": "proof",
  "statement": "there is c in (-1, 1) with f'(c) = 0 for f(x) = |x|"}, ["f(-1) = f(1) = 1", "by Rolle's theorem such c exists"],
  "unsupported", answer="false: |x| has no horizontal tangent", truth="invalid",
  why="f'(c) = ±1 wherever it exists; Rolle needs differentiability on (-1,1), which fails at 0")
w("limit of a sequence through a continuous function", "continuity condition for limits of sequences",
  {"type": "statement-task", "calculusTask": "sequence", "statement": "lim sqrt(1 + 1/n) = 1"},
  ["1 + 1/n -> 1", "sqrt is continuous at 1", "so sqrt(1 + 1/n) -> 1"], "unsupported", answer="true", truth="valid",
  why="limits pass through continuous functions")

# =====================================================================================================================
# 13. equivalent but unfamiliar notation (with canonical oracle text) and exactness
# =====================================================================================================================
t("x = ±2 as an answer", "± notation", "x² - 4 = 0", "x = ±2", "valid-equivalence", notation="unfamiliar", oracle_prev="x^2 - 4 = 0",
  pair="adv-pm", composition=False, difficulty="easy", why="x^2 = 4 iff x = 2 or x = -2")
t("x = 2 as an answer to x² = 4", "± notation", "x² - 4 = 0", "x = 2", "invalid", notation="unfamiliar", oracle_prev="x^2 - 4 = 0",
  pair="adv-pm", composition=False, difficulty="easy", why="x = -2 also solves x^2 - 4 = 0")
t("set-builder style answer", "set notation for answers", "x^2 - 3x + 2 = 0", "x ∈ {1, 2}", "valid-equivalence", notation="unfamiliar",
  oracle_next="x = 1 or x = 2", pair="adv-setnot", composition=False, difficulty="easy", why="(x-1)(x-2) = 0")
t("set-builder style answer with a sign error", "set notation for answers", "x^2 - 3x + 2 = 0", "x ∈ {-1, -2}", "invalid",
  notation="unfamiliar", oracle_next="x = -1 or x = -2", pair="adv-setnot", composition=False, difficulty="easy",
  why="x = 1 solves prev; neither -1 nor -2 does")
t("comma list answer", "list notation for answers", "x^3 - x = 0", "x = 0, 1, -1", "valid-equivalence", notation="unfamiliar",
  pair="adv-setnot", composition=False, why="x(x-1)(x+1) = 0")
t("x·x notation in a quadratic: divide by x", "division by a symbolic quantity", "x·x = 2x", "x = 2", "invalid",
  notation="unfamiliar", oracle_prev="x*x = 2x", pair="adv-xdotx", composition=False, difficulty="easy", why="x = 0 is lost")
t("x·x notation in a quadratic: factor", "division by a symbolic quantity", "x·x = 2x", "x(x - 2) = 0", "valid-equivalence",
  notation="unfamiliar", oracle_prev="x*x = 2x", pair="adv-xdotx", composition=False, difficulty="easy", why="x^2 - 2x = x(x-2)")
t("(x)(x) juxtaposition", "juxtaposed factors", "(x)(x) - 9 = 0", "x = 3 or x = -3", "valid-equivalence", notation="unfamiliar",
  pair="adv-xdotx", composition=False, difficulty="easy", why="(x)(x) = x^2")
t("mixed bracket styles", "bracket variations", "[ (x+1) ]^2 = { 4 }", "x = 1 or x = -3", "valid-equivalence", notation="unfamiliar",
  oracle_prev="((x+1))^2 = (4)", pair="adv-brackets", composition=False, why="x + 1 = ±2")
t("mixed bracket styles, one root lost", "bracket variations", "[ (x+1) ]^2 = { 4 }", "x = 1", "invalid", notation="unfamiliar",
  oracle_prev="((x+1))^2 = (4)", pair="adv-brackets", composition=False, why="x = -3: (-2)^2 = 4")
t("unicode ≠ answer for a quadratic inequation", "unicode relations", "x² ≠ 9", "x ≠ 3 and x ≠ −3", "valid-equivalence",
  notation="unfamiliar", oracle_prev="x^2 != 9", oracle_next="x != 3 and x != -3", pair="adv-neq", composition=False,
  why="x^2 = 9 iff x = ±3")
t("unicode ≠ answer missing the negative root", "unicode relations", "x² ≠ 9", "x ≠ 3", "valid-implication", notation="unfamiliar",
  oracle_prev="x^2 != 9", oracle_next="x != 3", pair="adv-neq", composition=False,
  why="prev set is R minus {3,-3}, next is R minus {3}: every solution of prev satisfies next, but x = -3 satisfies next only")
t("a self-cancelling quotient equal to 1 means x ≠ 3", "cancellation across zero (statement)", "(x−3)/(x−3) = 1", "x ≠ 3",
  "valid-equivalence", notation="unfamiliar", oracle_prev="(x-3)/(x-3) = 1", oracle_next="x != 3", pair="adv-selfcancel",
  difficulty="medium", why="the quotient is 1 exactly where it is defined")
t("a self-cancelling quotient equal to 1 'for all x'", "cancellation across zero (statement)", "(x−3)/(x−3) = 1",
  "1 = 1, true for every x", "domain-violation", notation="unfamiliar", oracle_prev="(x-3)/(x-3) = 1", oracle_next="x = x",
  pair="adv-selfcancel", why="x = 3 is not a solution (0/0 undefined) but is admitted by 'every x'")
t("x ≥ 0 vs x > 0 boundary in a square-root equation's domain", "boundary inclusion", "sqrt(x) = x", "x = 0 or x = 1",
  "valid-equivalence", pair="adv-sqrtx", why="x = x^2 with x >= 0: 0 and 1, both check")
t("sqrt(x) = x after dividing by sqrt(x)", "division by a symbolic quantity (radical)", "sqrt(x) = x", "x = 1", "invalid",
  pair="adv-sqrtx", why="x = 0 solves sqrt(x) = x but was divided away")
t("exact decimal answer", "exactness of decimals", "2x = 1", "x = 0.5", "valid-equivalence", notation="unfamiliar", pair="adv-decimal",
  composition=False, difficulty="easy", why="0.5 = 1/2 exactly")
t("rounded decimal answer", "exactness of decimals", "3x = 1", "x = 0.33", "invalid", notation="unfamiliar", pair="adv-decimal",
  composition=False, difficulty="easy", why="3 * 0.33 = 0.99 != 1")
t("rounded root in ± form", "exactness of decimals", "x² = 2", "x = ±1.414", "invalid", notation="unfamiliar", oracle_prev="x^2 = 2",
  pair="adv-decimal", composition=False, why="1.414^2 = 1.999396 != 2")
t("exact root in ± form", "exactness of decimals", "x² = 2", "x = ±√2", "valid-equivalence", notation="unfamiliar",
  oracle_prev="x^2 = 2", oracle_next="x = ±sqrt(2)", pair="adv-decimal", composition=False, why="sqrt2^2 = 2")
t("decimal coefficient equation", "exactness of decimals", "0.5x + 1 = 2", "x = 2", "valid-equivalence", notation="unfamiliar",
  pair="adv-decimal", composition=False, why="0.5 * 2 + 1 = 2")
t("1/2x ambiguity", "ambiguous division juxtaposition", "1/2x = 4", "x = 8", "insufficient-information", notation="unfamiliar",
  pair="adv-ambig1", composition=False, why="(1/2)x = 4 gives 8; 1/(2x) = 4 gives 1/8")
t("1/(2x) made explicit", "ambiguous division juxtaposition", "1/(2x) = 4", "x = 1/8", "valid-equivalence", pair="adv-ambig1",
  composition=False, why="2x = 1/4")
t("(1/2)x made explicit", "ambiguous division juxtaposition", "(1/2)x = 4", "x = 8", "valid-equivalence", pair="adv-ambig1",
  composition=False, why="x = 8")
t("6/2(1+2) ambiguity", "ambiguous division juxtaposition", "6/2(1+2)", "9", "insufficient-information", kind="expression",
  notation="unfamiliar", pair="adv-ambig2", composition=False, why="(6/2)(1+2) = 9 but 6/(2(1+2)) = 1; the notation does not decide")
t("(6/2)(1+2) explicit", "ambiguous division juxtaposition", "(6/2)(1+2)", "9", "valid-equivalence", kind="expression",
  pair="adv-ambig2", composition=False, difficulty="easy", why="3 * 3 = 9")
t("6/(2(1+2)) explicit", "ambiguous division juxtaposition", "6/(2(1+2))", "9", "invalid", kind="expression", pair="adv-ambig2",
  composition=False, difficulty="easy", why="6/6 = 1, not 9")
t("bare log in an exponential equation", "ambiguity of bare log", "10^x = 5", "x = log(5)", "insufficient-information",
  notation="unfamiliar", pair="adv-ambig3", composition=False, why="correct only if log means log base 10; ln 5 is a different number")
t("log10 explicit", "ambiguity of bare log", "10^x = 5", "x = log10(5)", "valid-equivalence", pair="adv-ambig3", composition=False,
  why="log10 is the inverse of 10^x")
t("ln where log10 is needed", "ambiguity of bare log", "10^x = 5", "x = ln(5)", "invalid", pair="adv-ambig3", composition=False,
  why="10^(ln 5) != 5 since ln 5 != log10 5")
t("ambiguous a/bc in a rational equation", "ambiguous division juxtaposition", "x/2x = 1/2", "x ≠ 0", "insufficient-information",
  notation="unfamiliar", oracle_next="x != 0", pair="adv-ambig1",
  why="as x/(2x) it is 1/2 for all x != 0; as (x/2)x = x^2/2 it gives x = ±1")
t("parameter left open: divide by k", "parameter condition", "k(x - 1) = k", "x = 2", "insufficient-information", pair="adv-param",
  composition=False, why="valid only for k != 0; if k = 0 every x solves the equation")
t("parameter left open: divide by a in an inequality", "parameter condition (sign)", "x/a > 1", "x > a", "insufficient-information",
  pair="adv-param", why="valid for a > 0; for a < 0 the inequality flips")
t("leading '=' continuation is a chain, not a new equation", "continuation-line notation", "(x+1)^2 - (x-1)^2", "= 4x",
  "valid-equivalence", kind="expression", notation="unfamiliar", oracle_next="4x", pair="adv-contline", composition=False,
  why="difference of squares: (2x)(2) = 4x")
t("leading '=' continuation with a sign slip", "continuation-line notation", "(x+1)^2 - (x-1)^2", "= 2x^2 + 2",
  "invalid", kind="expression", notation="unfamiliar", oracle_next="2x^2 + 2", pair="adv-contline", composition=False,
  why="that is the sum, not the difference; at x = 0: 0 vs 2")
t("spaces inside numbers and operators", "spacing variations", "2 x ( x - 3 ) = 0", "x = 0 or x = 3", "valid-equivalence",
  notation="unfamiliar", oracle_prev="2x(x-3) = 0", pair="adv-spaces", composition=False, difficulty="easy", why="zero product")
t("spaces, one root lost", "spacing variations", "2 x ( x - 3 ) = 0", "x = 3", "invalid", notation="unfamiliar",
  oracle_prev="2x(x-3) = 0", pair="adv-spaces", composition=False, difficulty="easy", why="x = 0 lost")
t("unicode minus and ≥ in a quadratic inequality", "unicode relations", "x² ≥ 2x", "x ≤ 0 or x ≥ 2", "valid-equivalence",
  notation="unfamiliar", oracle_prev="x^2 >= 2x", oracle_next="x <= 0 or x >= 2", pair="adv-unisq", composition=False,
  why="x(x-2) >= 0")
t("unicode quadratic inequality divided by x", "sign of multiplier in inequalities", "x² ≥ 2x", "x ≥ 2", "invalid",
  notation="unfamiliar", oracle_prev="x^2 >= 2x", oracle_next="x >= 2", pair="adv-unisq", composition=False,
  why="x = -1: 1 >= -2 holds but -1 < 2")
w("expression chain written with continuation lines and ·", "continuation-line notation", {"type": "factor", "start": "2x(x+1) - 3(x+1)"},
  ["= (x+1)·(2x - 3)"], "valid-equivalence", answer="(x+1)(2x-3)", notation="unfamiliar", pair="adv-factcont", composition=False,
  oracle_lines=["(x+1)*(2x - 3)"], why="common factor x + 1")
w("expression chain with continuation lines and a sign slip", "continuation-line notation", {"type": "factor", "start": "2x(x+1) - 3(x+1)"},
  ["= (x+1)·(2x + 3)"], "invalid", answer="(x+1)(2x-3)", notation="unfamiliar", pair="adv-factcont", composition=False,
  oracle_lines=["(x+1)*(2x + 3)"], why="at x = 0: -3 vs 3")
w("set notation answer in a working (oracle reads 'or')", "set notation for answers", solve("x^3 - 4x = 0"),
  ["x(x^2 - 4) = 0", "x(x - 2)(x + 2) = 0", "x ∈ {−2, 0, 2}"], "valid-equivalence", answer="x in {-2, 0, 2}", notation="unfamiliar",
  pair="adv-setw", composition=False, oracle_lines=["x(x^2 - 4) = 0", "x(x - 2)(x + 2) = 0", "x = -2 or x = 0 or x = 2"],
  why="zero product")
w("set notation answer with 0 lost by division", "set notation for answers", solve("x^3 - 4x = 0"),
  ["x^2 - 4 = 0", "x ∈ {−2, 2}"], "invalid", answer="x in {-2, 0, 2}", notation="unfamiliar", pair="adv-setw",
  oracle_lines=["x^2 - 4 = 0", "x = -2 or x = 2"], why="dividing by x loses x = 0")
w("fractional answer given as a terminating decimal", "exactness of decimals", solve("4x^2 - 1 = 0"), ["x² = 1/4", "x = ±0.5"],
  "valid-equivalence", answer="x = 1/2 or x = -1/2", notation="unfamiliar", pair="adv-decw", composition=False,
  oracle_lines=["x^2 = 1/4", "x = ±0.5"], why="0.5 = 1/2 exactly")
w("fractional answer given as a rounded decimal", "exactness of decimals", solve("9x^2 - 1 = 0"), ["x² = 1/9", "x = ±0.33"],
  "invalid", answer="x = 1/3 or x = -1/3", notation="unfamiliar", pair="adv-decw", composition=False,
  oracle_lines=["x^2 = 1/9", "x = ±0.33"], why="0.33^2 = 0.1089 != 1/9")

# =====================================================================================================================
# 14. extra cross-domain compositions
# =====================================================================================================================
t("tan double-angle formula narrows the domain", "natural domain (trig identity)", "tan(2x)", "2tan(x)/(1 - tan(x)^2)", "invalid",
  kind="expression", assumptions=I, pair="adv-tan2x", domain="trigonometry", difficulty="hard", complexity=3,
  why="x = pi/2: tan(pi) = 0 is defined but tan(pi/2) is not")
t("tan double-angle formula read backwards widens the domain", "natural domain (trig identity)", "2tan(x)/(1 - tan(x)^2)", "tan(2x)",
  "domain-violation", kind="expression", assumptions=I, pair="adv-tan2x", domain="trigonometry", difficulty="hard", complexity=3,
  why="equal where tan x is defined and tan^2 x != 1; tan 2x is also defined at pi/2 and 3pi/2")
t("composite with a log inside a square root", "nested natural domains", "sqrt(ln(x))", "ln(x)^(1/2)", "valid-equivalence",
  kind="expression", pair="adv-sqrtln", composition=False, why="same function: both need ln x >= 0 i.e. x >= 1")
t("composite with a log inside a square root: domain stated as x > 0", "nested natural domains", "sqrt(ln(x)) >= 0", "x > 0",
  "domain-violation", pair="adv-sqrtln", why="prev holds exactly on [1, oo) (where sqrt(ln x) is defined); next (0, oo) admits x = 1/2 "
  "where sqrt(ln x) is undefined: prev => next only, the radical's domain is dropped")
t("composite with a log inside a square root: domain set", "nested natural domains", "sqrt(ln(x)) >= 0", "x >= 1", "valid-equivalence",
  pair="adv-sqrtln", why="sqrt is >= 0 wherever it is defined, and it is defined iff ln x >= 0 iff x >= 1")
t("quotient of logs is not the log of a quotient", "incorrectly cited log law", "ln(x^2)/ln(x)", "ln(x)", "invalid", kind="expression", assumptions=["x > 0"],
  pair="adv-lnquot", why="for x > 0, x != 1: ln(x^2)/ln x = 2 ln x / ln x = 2, not ln x (x = e: 2 vs 1)")
t("quotient of logs simplified on its domain", "incorrectly cited log law", "ln(x^2)/ln(x)", "2", "domain-violation", kind="expression",
  assumptions=["x > 0"], pair="adv-lnquot", why="even with x > 0 stated, the quotient is undefined at x = 1 (ln 1 = 0) while 2 is defined there")
t("quotient of logs simplified with the restrictions carried", "incorrectly cited log law", "ln(x^2)/ln(x)", "2", "valid-equivalence",
  kind="expression", assumptions=["x > 1"], pair="adv-lnquot", why="for x > 1, ln x > 0 and ln(x^2) = 2 ln x")
t("rational equation hidden in a log equation's argument: exponentiate", "logs + rational equations",
  "ln(x) - ln(x-1) = ln(2)", "x = 2", "valid-equivalence", pair="adv-lnrat2", why="x/(x-1) = 2 with x > 1 gives x = 2")
t("rational equation hidden in a log equation: subtraction law read as quotient of logs", "logs + rational equations",
  "ln(x) - ln(x-1) = ln(2)", "x - (x-1) = 2", "invalid", pair="adv-lnrat2",
  why="ln a - ln b = ln(a/b), not a - b; x = 2 solves prev but x - (x-1) = 1 != 2 (next has no solution)")
t("absolute value equation solved by squaring", "squaring with abs on both sides", "|x - 1| = |2x + 1|", "(x-1)^2 = (2x+1)^2",
  "valid-equivalence", pair="adv-absabs", why="|a| = |b| iff a^2 = b^2")
t("absolute value equation solved by dropping both bars", "squaring with abs on both sides", "|x - 1| = |2x + 1|", "x - 1 = 2x + 1",
  "invalid", pair="adv-absabs", why="x = 0: |-1| = |1| holds but -1 != 1")
t("absolute value equation solved fully", "squaring with abs on both sides", "|x - 1| = |2x + 1|", "x = -2 or x = 0",
  "valid-equivalence", pair="adv-absabs", why="x - 1 = ±(2x + 1): x = -2 or x = 0")
t("sum of absolute values equal to a constant", "case analysis with abs", "|x| + |x - 2| = 4", "x = -1 or x = 3",
  "valid-equivalence", pair="adv-abssum", why="x < 0: 2 - 2x = 4, x = -1; 0 <= x <= 2: 2 != 4; x > 2: 2x - 2 = 4, x = 3")
t("sum of absolute values: only the 'all positive' case", "case analysis with abs", "|x| + |x - 2| = 4", "x = 3", "invalid",
  pair="adv-abssum", why="x = -1: 1 + 3 = 4")
t("sum of absolute values equal to the minimum value", "case analysis with abs", "|x| + |x - 2| = 2", "0 <= x <= 2",
  "valid-equivalence", pair="adv-abssum", difficulty="hard", why="by the triangle inequality the sum is >= 2, with equality exactly on [0,2]")
t("trig equation with tan via sin/cos and squaring", "squaring a trig equation", "sin(x) + cos(x) = 1", "sin(2x) = 0",
  "valid-implication", assumptions=I, pair="adv-trigsq", domain="trigonometry", difficulty="hard", complexity=3,
  why="squaring gives 1 + sin 2x = 1; prev set {0, pi/2}, next set {0, pi/2, pi, 3pi/2}")
t("trig equation with sin + cos = 1 solved", "squaring a trig equation", "sin(x) + cos(x) = 1", "x = 0 or x = pi/2",
  "valid-equivalence", assumptions=I, pair="adv-trigsq", domain="trigonometry", difficulty="hard", complexity=3,
  why="sqrt2 sin(x + pi/4) = 1: x + pi/4 = pi/4 or 3pi/4")
t("trig equation with sin + cos = 1: extraneous squaring roots kept", "squaring a trig equation", "sin(x) + cos(x) = 1",
  "x = 0 or x = pi/2 or x = pi or x = 3pi/2", "valid-implication", assumptions=I, pair="adv-trigsq", domain="trigonometry",
  difficulty="hard", complexity=3, why="pi gives 0 - 1 = -1 != 1; this is still a weaker consequence (prev => next)")
w("trig equation with sin + cos = 1, squared and checked", "squaring a trig equation (W)",
  {"type": "solve", "statement": "sin(x) + cos(x) = 1"},
  ["(sin(x) + cos(x))^2 = 1", "1 + sin(2x) = 1", "sin(2x) = 0", "x = 0 or x = pi/2 or x = pi or x = 3pi/2",
   "check: pi gives -1 and 3pi/2 gives -1, reject", "x = 0 or x = pi/2"],
  "valid-implication", answer="x = 0 or x = pi/2", assumptions=I, pair="adv-trigsq-w", domain="trigonometry", difficulty="hard", complexity=4,
  oracle_lines=["(sin(x) + cos(x))^2 = 1", "1 + sin(2x) = 1", "sin(2x) = 0", "x = 0 or x = pi/2 or x = pi or x = 3pi/2", None, "x = 0 or x = pi/2"],
  why="squaring admits sin + cos = -1 solutions, which are checked and rejected")
w("trig equation with sin + cos = 1, squared, no check", "squaring a trig equation (W)", {"type": "solve", "statement": "sin(x) + cos(x) = 1"},
  ["(sin(x) + cos(x))^2 = 1", "1 + sin(2x) = 1", "sin(2x) = 0", "x = 0 or x = pi/2 or x = pi or x = 3pi/2"], "invalid",
  answer="x = 0 or x = pi/2", assumptions=I, pair="adv-trigsq-w", domain="trigonometry", difficulty="hard", complexity=4,
  why="x = pi: sin pi + cos pi = -1 != 1")
t("inverse-function composition across domains", "composition domain (exp/log)", "ln(e^x)", "x", "valid-equivalence",
  kind="expression", pair="adv-lnexp", composition=False, difficulty="easy", why="e^x > 0 always; ln(e^x) = x on R")
t("inverse-function composition across domains, reversed", "composition domain (exp/log)", "e^(ln(x))", "x", "domain-violation",
  kind="expression", pair="adv-lnexp", composition=False, difficulty="easy", why="defined only for x > 0")
t("quadratic in ln x", "substitution in a log equation", "ln(x)^2 - 3ln(x) + 2 = 0", "x = e or x = e^2", "valid-equivalence",
  pair="adv-lnquad", why="(ln x - 1)(ln x - 2) = 0")
t("quadratic in ln x with u-values reported", "substitution in a log equation", "ln(x)^2 - 3ln(x) + 2 = 0", "x = 1 or x = 2", "invalid",
  pair="adv-lnquad", why="x = e solves prev; ln(1)^2 - 0 + 2 = 2 != 0")
t("exponential equation with a negative 'solution' from taking logs", "exp range", "e^(2x) = e^x + 2", "e^x = 2",
  "valid-equivalence", pair="adv-exprange", why="u^2 - u - 2 = (u-2)(u+1); u = e^x > 0 so u = -1 is impossible")
t("exponential equation: impossible branch kept as ln(-1)", "exp range", "e^(2x) = e^x + 2", "e^x = 2 or e^x = -1",
  "valid-equivalence", pair="adv-exprange", why="e^x = -1 has no real solution, so adding it changes nothing")
t("exponential equation solved", "exp range", "e^(2x) = e^x + 2", "x = ln(2)", "valid-equivalence", pair="adv-exprange",
  why="see above")
t("exponential equation: both sides divided by e^x leaves a non-equivalent equation", "exp range", "e^(2x) = e^x + 2", "e^x = 1 + 2",
  "invalid", pair="adv-exprange", why="dividing e^x + 2 by e^x gives 1 + 2e^(-x), not 3; x = ln 2 solves prev but e^(ln 2) = 2 != 3")

# =====================================================================================================================
# 15. hostile / malformed inputs: correct behaviour is to abstain
# =====================================================================================================================
t("unbalanced bracket", "malformed input handling", "x^2 = (4", "x = 2", "unsupported", pair="adv-hostile1", composition=False,
  why="the premise is not a well-formed statement; no relation can be assigned", **ABST)
t("dangling operator", "malformed input handling", "2x + = 6", "x = 3", "unsupported", pair="adv-hostile1", composition=False,
  why="'2x + = 6' is not well-formed", **ABST)
t("injection-like text", "malformed input handling", "__import__('os').system('ls')", "x = 1", "unsupported", composition=False,
  pair="adv-hostile2", why="not mathematics; must not be evaluated", **ABST)
t("injection-like text in the next line", "malformed input handling", "2x = 2", "x = 1; __import__('os')", "unsupported",
  composition=False, pair="adv-hostile2", why="the next line contains non-mathematical code; refuse rather than guess", **ABST)
t("unclosed sqrt", "malformed input handling", "sqrt(x+1 = 2", "x = 3", "unsupported", composition=False, pair="adv-hostile3",
  why="unclosed function bracket makes the scope of sqrt unknowable", **ABST)
t("trailing relation", "malformed input handling", "x^2 - 1 =", "x = 1 or x = -1", "unsupported", composition=False, pair="adv-hostile3",
  why="the relation has an empty side", **ABST)
t("doubled relation operator", "malformed input handling", "x == 2", "x = 2", "unsupported", composition=False, pair="adv-hostile4",
  why="'==' is programming syntax, not a mathematical relation; ambiguous intent", **ABST)
t("absolute-value bars mismatched", "malformed input handling", "|x - 1 = 2", "x = 3", "unsupported", composition=False,
  pair="adv-hostile4", why="the absolute value is never closed", **ABST)
w("hostile working: lines that are code, not mathematics", "malformed input handling", solve("2x + 1 = 5"),
  ["exec('import os')", "x = eval('2')"], "unsupported", answer="x = 2", truth="unknown", composition=False, pair="adv-hostile-w",
  oracle_lines=[None, None], why="the working contains code rather than mathematics; nothing can be verified")
w("hostile working: unbalanced brackets throughout", "malformed input handling", solve("2x + 1 = 5"), ["2x = (5 - 1", "x = 2)"],
  "unsupported", answer="x = 2", truth="unknown", composition=False, pair="adv-hostile-w", oracle_lines=[None, None],
  why="neither line is well-formed")
