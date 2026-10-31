"""EQN: Equations, implication and solution sets (single real variable; solution sets over the reals, natural domains respected).

Every label below was derived by hand (solution sets computed explicitly in each `why`)."""
from schema import T, W

C = "EQN"
SSP = "solution-set preservation"
EXT = "extraneous-root obligation"
LOSS = "loss of solutions"
DOMP = "natural-domain preservation"
FORM = "solution-set notation"
SCOPE = "case-scope propagation"
REASON = "cited reason vs actual justification"
PARAM = "unstated parameter condition"


def t(principle, invariant, prev, nxt, rel, why, d="medium", c=1, **kw):
    if kw.get("composition") or kw.get("pair") in ("eqn-k4", "eqn-k5", "eqn-c5", "eqn-h2", "eqn-g1", "eqn-d7"):
        d, c = "hard", max(c, 2)
    return T(C, principle, invariant, prev, nxt, "statement", rel, why=why, difficulty=d, complexity=c, **kw)


def composition_hard(kw):
    return kw.get("composition", False)


def w(principle, invariant, st, lines, rel, why, ans, d="medium", c=2, **kw):
    if c >= 4 or composition_hard(kw):
        d = "hard"
    shown = [l if isinstance(l, str) else l[0] for l in lines]
    orc = [l if isinstance(l, str) else l[1] for l in lines]
    return W(C, principle, invariant, {"type": "solve", "statement": st}, shown, rel, why=why, answer=ans,
             oracle_lines=orc, difficulty=d, complexity=c, **kw)


# =====================================================================================================
# A. Equivalent operations (adding terms, multiplying/dividing by nonzero constants)
# =====================================================================================================
t("adding a constant to both sides is reversible", SSP, "3x-7=11", "3x=18", "valid-equivalence",
  "both sides +7; both have the solution set {6}", d="easy", pair="eqn-a1")
t("moving a term across the equals sign must change its sign", SSP, "3x-7=11", "3x=4", "invalid",
  "x=6 solves 3x-7=11 but 3*6=18 != 4; the -7 was subtracted instead of added", d="easy", pair="eqn-a1")
t("multiplying both sides by a nonzero constant is reversible", SSP, "(x+4)/3=2", "x+4=6", "valid-equivalence",
  "times 3; both give x=2", d="easy", pair="eqn-a2")
t("multiplying only one side by a constant changes the equation", SSP, "(x+4)/3=2", "x+4=6/3", "invalid",
  "x=2 solves the first; second gives x=-2; one side was divided instead of both multiplied", d="easy", pair="eqn-a2")
t("dividing by a negative constant keeps an equation's solutions", SSP, "-2x=10", "x=-5", "valid-equivalence",
  "divide by -2: x=-5; equations never flip", d="easy", pair="eqn-a3")
t("sign of the quotient when dividing by a negative constant", SSP, "-2x=10", "x=5", "invalid",
  "x=-5 is the solution; 5 gives -10 != 10", d="easy", pair="eqn-a3")
t("distributing a constant over a bracket", SSP, "5(x-2)=3(x+4)", "5x-10=3x+12", "valid-equivalence",
  "both sides expanded correctly; solution x=11 in both", d="easy", pair="eqn-a4")
t("distribution must multiply every term in the bracket", SSP, "5(x-2)=3(x+4)", "5x-2=3x+4", "invalid",
  "first equation: x=11; second: 2x=6, x=3; 11 is lost", d="easy", pair="eqn-a4")
t("clearing fractions with the LCD multiplies every term", SSP, "x/2+x/3=5", "3x+2x=30", "valid-equivalence",
  "multiply by 6: 3x+2x=30, x=6 in both", d="easy", pair="eqn-a5")
t("clearing fractions on one side only", SSP, "x/2+x/3=5", "3x+2x=5", "invalid",
  "x=6 solves the first; the right side 5 was not multiplied by 6, giving x=1", d="easy", pair="eqn-a5")
t("an identity reduces to a true constant statement", SSP, "4x-8=4(x-2)", "0=0", "valid-equivalence",
  "4(x-2)=4x-8 for every x, so both sets are all reals", d="easy", pair="eqn-a7")
t("an identity has every real as a solution, not one value", LOSS, "4x-8=4(x-2)", "x=2", "invalid",
  "every real solves the identity; x=0 is lost", d="easy", pair="eqn-a7")
t("a contradiction reduces to a false constant statement", SSP, "2(x+1)=2x+3", "0=1", "valid-equivalence",
  "2x+2=2x+3 gives 2=3, no x works; both sets are empty", d="easy")
t("expanding a square is an identity, so the equation becomes linear", SSP, "(x+1)^2=x^2+1", "x=0", "valid-equivalence",
  "x^2+2x+1=x^2+1 gives 2x=0", d="easy", pair="eqn-a8")
t("a true identity in x", SSP, "(x+1)^2=x^2+2x+1", "0=0", "valid-equivalence",
  "both sides agree for every real x", d="easy", pair="eqn-a8")
t("dividing every term by a common nonzero constant", SSP, "2x^2-8x=0", "x^2-4x=0", "valid-equivalence",
  "division by 2; roots 0 and 4 in both", d="easy", pair="eqn-b0")

# =====================================================================================================
# B. Multiplying / dividing by expressions that may be zero
# =====================================================================================================
t("dividing by the variable loses the root x=0", LOSS, "2x^2-8x=0", "x-4=0", "invalid",
  "x=0 solves 2x^2-8x=0 but not x-4=0; division by 2x is invalid when x=0", pair="eqn-b0")
t("collecting terms on one side before factoring", SSP, "x^2=5x", "x(x-5)=0", "valid-equivalence",
  "subtract 5x; roots 0 and 5", d="easy", pair="eqn-b1")
t("dividing by x loses x=0", LOSS, "x^2=5x", "x=5", "invalid", "x=0 solves x^2=5x but not x=5", d="easy", pair="eqn-b1")
t("factoring out a common binomial instead of dividing by it", SSP, "(x+1)(x-4)=3(x+1)", "(x+1)(x-7)=0", "valid-equivalence",
  "(x+1)(x-4)-3(x+1)=(x+1)(x-7); roots -1, 7", pair="eqn-b2")
t("dividing by a binomial that can vanish", LOSS, "(x+1)(x-4)=3(x+1)", "x-4=3", "invalid",
  "x=-1 makes both sides 0 but does not satisfy x-4=3", pair="eqn-b2")
t("dividing a cubic equation by x", LOSS, "x^3=4x", "x^2=4", "invalid", "x=0 solves x^3=4x but 0 != 4", pair="eqn-b3")
t("division by x is reversible once x != 0 is stated", SSP, "x^3=4x", "x^2=4", "valid-equivalence",
  "on x != 0 both sets are {-2, 2}", assumptions=["x != 0"], pair="eqn-b3")
t("full factorisation keeps every root", SSP, "x^3=4x", "x(x-2)(x+2)=0", "valid-equivalence",
  "x^3-4x=x(x-2)(x+2); roots -2,0,2", pair="eqn-b3")
t("multiplying by an expression that vanishes only at the existing solution adds nothing", SSP, "x+2=3", "(x-1)(x+2)=3(x-1)", "valid-equivalence",
  "prev {1}; next is (x-1)(x+2-3)=(x-1)^2=0, also {1}: the multiplier's zero coincides with the solution",
  pair="eqn-b5")
t("dividing both sides by an expression that vanishes at the solution", LOSS, "x+2=3", "(x+2)/(x-1)=3/(x-1)", "invalid",
  "x=1 solves x+2=3 but makes x-1=0, so the new equation is undefined there; its set is empty", pair="eqn-b5")
t("multiplying by an expression that vanishes elsewhere adds a root", EXT, "x+2=5", "(x-1)(x+2)=5(x-1)", "valid-implication",
  "prev {3}; next (x-1)(x-3)=0 has {1,3}; every solution is kept, x=1 is new", pair="eqn-b5b")
t("dividing by a factor that is never zero", SSP, "(x^2+1)(x-3)=2(x^2+1)", "x-3=2", "valid-equivalence",
  "x^2+1>0 for all real x, so dividing is reversible; x=5 in both", pair="eqn-b6")
t("dividing by a factor that has real zeros", LOSS, "(x^2-1)(x-3)=2(x^2-1)", "x-3=2", "invalid",
  "x=1 and x=-1 make both sides 0 and are lost; only x=5 remains", pair="eqn-b6")
t("dividing by a positive exponential factor", SSP, "e^x(x-2)=0", "x-2=0", "valid-equivalence",
  "e^x>0 for all x; x=2 in both", d="easy")
t("zero-product with a square-root factor keeps x=0", SSP, "sqrt(x)(x-4)=0", "x=0 or x=4", "valid-equivalence",
  "domain x>=0; sqrt(x)=0 gives 0, x-4=0 gives 4; both admissible", pair="eqn-b7", composition=True)
t("dropping the square-root factor loses its zero", LOSS, "sqrt(x)(x-4)=0", "x=4", "invalid",
  "x=0 solves sqrt(x)(x-4)=0 but not x=4", pair="eqn-b7", composition=True)
t("zero-product ignoring the natural domain of sqrt", DOMP, "sqrt(x)(x+4)=0", "x=0 or x=-4", "domain-violation",
  "domain x>=0 so the set is {0}; x=-4 is outside the domain of sqrt and is only admitted by dropping x>=0", pair="eqn-b7", composition=True)
t("cancelling a common factor that leaves no root behind", SSP, "(x-1)(x-2)=(x-1)(x-3)", "x-2=x-3", "invalid",
  "prev: (x-1)(1)=0 so x=1; next has no solution; x=1 is lost")

# =====================================================================================================
# C. Squaring and extraneous roots; one-way implications that are sound
# =====================================================================================================
t("squaring both sides is a one-way implication", EXT, "sqrt(x+7)=x+1", "x+7=(x+1)^2", "valid-implication",
  "x^2+x-6=0 has 2 and -3; at -3 sqrt(4)=2 != -2; prev {2} subset of next {2,-3}", pair="eqn-c1")
t("the radical equation has exactly the checked root", SSP, "sqrt(x+7)=x+1", "x=2", "valid-equivalence",
  "sqrt(9)=3=2+1; x=-3 fails; set {2}", pair="eqn-c1")
t("keeping only the extraneous root of a squared equation", LOSS, "sqrt(x+7)=x+1", "x=-3", "invalid",
  "x=2 is the only solution and is lost; -3 gives 2 != -2", pair="eqn-c1")
t("squaring a linear equation adds the mirror solution", EXT, "x-1=2", "(x-1)^2=4", "valid-implication",
  "prev {3}; next x-1=+-2 gives {3,-1}", d="easy", pair="eqn-c2")
t("cubing is reversible on the reals", SSP, "x-1=2", "(x-1)^3=8", "valid-equivalence",
  "t -> t^3 is injective on R; both {3}", d="easy", pair="eqn-c2")
t("a sound consequence of a solved equation", EXT, "x=-1", "x^2=1", "valid-implication",
  "x=-1 implies x^2=1; converse admits x=1", d="easy", pair="eqn-c3")
t("odd powers preserve solved equations exactly", SSP, "x=-1", "x^3=-1", "valid-equivalence", "x^3=-1 only for x=-1", d="easy", pair="eqn-c3")
t("a polynomial consequence of a solved equation", EXT, "x=4", "x^2-3x-4=0", "valid-implication",
  "x^2-3x-4=(x-4)(x+1): next set {4,-1} contains prev {4}", d="easy")
t("squaring an equation whose radical equals a negative number", EXT, "sqrt(x)=-2", "x=4", "valid-implication",
  "sqrt(x)>=0 so prev is empty; empty implies {4}; squaring created the root", pair="eqn-c4")
t("squaring when the right side is a positive constant", SSP, "sqrt(x)=2", "x=4", "valid-equivalence",
  "both sets {4}", d="easy", pair="eqn-c4")
t("squaring two square roots whose domains overlap at the root", SSP, "sqrt(x+3)=sqrt(2x-1)", "x+3=2x-1", "valid-equivalence",
  "next gives x=4; at 4 both radicands are 7>=0, so prev is {4}", pair="eqn-c5")
t("squaring two square roots with disjoint domains", DOMP, "sqrt(x-5)=sqrt(1-x)", "x-5=1-x", "domain-violation",
  "x-5>=0 and 1-x>=0 cannot both hold, prev empty; next gives x=3, outside the natural domain", pair="eqn-c5")
t("squaring both sides of an equation between absolute values", SSP, "|x-1|=|x+3|", "(x-1)^2=(x+3)^2", "valid-equivalence",
  "both sides nonnegative so squaring is reversible; -8x=8, x=-1 in both")
t("squaring a linear equation with variables on both sides", EXT, "x-1=2x+3", "(x-1)^2=(2x+3)^2", "valid-implication",
  "prev {-4}; next x-1=+-(2x+3) gives {-4,-2/3}")
t("squaring 2sqrt(x)=x-3", EXT, "2sqrt(x)=x-3", "4x=(x-3)^2", "valid-implication",
  "x^2-10x+9=0: 1 and 9; at 1, 2 != -2; prev {9}")
t("cubing a cube-root equation", SSP, "cbrt(x+1)=-2", "x+1=-8", "valid-equivalence",
  "cube roots of negatives are real and cubing is injective; x=-9 in both", pair="eqn-c6")
t("squaring a square root set equal to a negative", EXT, "sqrt(x+1)=-2", "x+1=4", "valid-implication",
  "prev empty (sqrt >= 0); next {3}", pair="eqn-c6")
t("radical equation with one extraneous root kept", LOSS, "sqrt(x-2)=x-4", "x=3", "invalid",
  "squaring gives x^2-9x+18=0: 3, 6; at 3: 1 != -1; true set {6}, so 6 is lost", pair="eqn-c7")
t("radical equation solved correctly", SSP, "sqrt(x-2)=x-4", "x=6", "valid-equivalence",
  "sqrt(4)=2=6-4; x=3 fails", pair="eqn-c7")

# =====================================================================================================
# D. Square roots of both sides (losing +-), solution-set forms
# =====================================================================================================
t("taking a square root needs both signs", LOSS, "x^2=16", "x=4", "invalid", "x=-4 is lost", d="easy", pair="eqn-d1")
t("+- notation for both square roots", FORM, "x^2=16", "x=±4", "valid-equivalence", "{-4,4}", d="easy", pair="eqn-d1")
t("absolute-value form of the two roots", FORM, "x^2=16", "|x|=4", "valid-equivalence", "|x|=4 iff x=+-4", d="easy", pair="eqn-d1")
t("'or' joins alternative solutions; 'and' would demand both", FORM, "x^2=16", "x=4 and x=-4", "invalid",
  "no x equals both 4 and -4, so the conjunction is empty; both solutions are lost", pair="eqn-d1")
t("square root of a squared binomial", LOSS, "(x-3)^2=25", "x-3=5", "invalid", "x=-2 is lost", d="easy", pair="eqn-d2")
t("square root of a squared binomial keeping +-", SSP, "(x-3)^2=25", "x-3=±5", "valid-equivalence", "{8,-2}", d="easy", pair="eqn-d2")
t("list of solutions after +-", FORM, "(x-3)^2=25", "x=8 or x=-2", "valid-equivalence", "3+5 and 3-5", d="easy", pair="eqn-d2")
t("equal squares means equal or opposite bases", LOSS, "(2x+1)^2=(x-4)^2", "2x+1=x-4", "invalid",
  "the branch 2x+1=4-x gives x=1, which is lost", pair="eqn-d3")
t("equal squares split into two linear equations", SSP, "(2x+1)^2=(x-4)^2", "2x+1=x-4 or 2x+1=4-x", "valid-equivalence",
  "a^2=b^2 iff a=b or a=-b; set {-5,1}", pair="eqn-d3")
t("positive square root suffices under a stated sign restriction", SSP, "x^2=7", "x=sqrt(7)", "valid-equivalence",
  "with x>0 the negative root is excluded", assumptions=["x > 0"], pair="eqn-d4")
t("positive square root alone without a sign restriction", LOSS, "x^2=7", "x=sqrt(7)", "invalid",
  "x=-sqrt(7) is lost", pair="eqn-d4")
t("sqrt(x^2) is |x|, not x", LOSS, "sqrt(x^2)=5", "x=5", "invalid", "x=-5: sqrt(25)=5 is lost", pair="eqn-d5")
t("sqrt(x^2)=|x|", SSP, "sqrt(x^2)=5", "|x|=5", "valid-equivalence", "identity sqrt(x^2)=|x|", pair="eqn-d5")
t("solution set listed with commas", FORM, "x^2=1/4", "x=0.5, -0.5", "valid-equivalence", "{1/2,-1/2}", d="easy", pair="eqn-d6")
t("an interval is not the two-point solution set", FORM, "x^2=1/4", "-1/2<=x<=1/2", "valid-implication",
  "every solution lies in the interval, but the interval adds e.g. 0; prev implies next only", pair="eqn-d6")
t("sqrt(x)^2 = x only where sqrt(x) is defined", DOMP, "sqrt(x)^2=x", "0=0", "domain-violation",
  "prev holds exactly for x>=0; 0=0 admits negatives", pair="eqn-d7")
t("the solution set of sqrt(x)^2=x", SSP, "sqrt(x)^2=x", "x>=0", "valid-equivalence", "true wherever defined", pair="eqn-d7")
t("sqrt(x^2)=x holds exactly for nonnegative x", SSP, "sqrt(x^2)=x", "x>=0", "valid-equivalence", "|x|=x iff x>=0")

# =====================================================================================================
# E. Zero-product property
# =====================================================================================================
t("zero-product property with 'or'", SSP, "(x-2)(x+3)=0", "x=2 or x=-3", "valid-equivalence", "ab=0 iff a=0 or b=0", d="easy", pair="eqn-e1")
t("zero-product with 'and' gives no solutions", FORM, "(x-2)(x+3)=0", "x=2 and x=-3", "invalid",
  "the conjunction is empty; both roots lost", d="easy", pair="eqn-e1")
t("zero-product property needs a zero right side", LOSS, "(x-2)(x+3)=6", "x-2=6 or x+3=6", "invalid",
  "true roots: x^2+x-12=0, x=3 or -4; next set {8,3} loses -4", pair="eqn-e2")
t("expand and collect before factoring when the right side is nonzero", SSP, "(x-2)(x+3)=6", "x^2+x-12=0", "valid-equivalence",
  "x^2+x-6-6=0", pair="eqn-e2")
t("every factor contributes a root", LOSS, "x(x-1)(x+2)=0", "x=1 or x=-2", "invalid", "x=0 is lost", d="easy")
t("a repeated factor gives one root in the set", FORM, "(2x-1)^2(x+5)=0", "x=1/2 or x=-5", "valid-equivalence",
  "multiplicity does not change the set")

# =====================================================================================================
# F. Quadratics: factoring, formula, completing the square, discriminant
# =====================================================================================================
t("factoring a monic quadratic", SSP, "x^2-5x+6=0", "(x-2)(x-3)=0", "valid-equivalence", "product 6, sum 5", d="easy", pair="eqn-f1")
t("factor signs must reproduce the middle term", SSP, "x^2-5x+6=0", "(x+2)(x+3)=0", "invalid",
  "(x+2)(x+3)=x^2+5x+6; x=2 is lost", d="easy", pair="eqn-f1")
t("factoring with a negative constant term", SSP, "x^2-x-12=0", "(x-4)(x+3)=0", "valid-equivalence", "-4*3=-12, -4+3=-1", d="easy", pair="eqn-f2")
t("swapped signs in the factors", SSP, "x^2-x-12=0", "(x+4)(x-3)=0", "invalid", "gives x^2+x-12; 4 is lost", d="easy", pair="eqn-f2")
t("completing the square", SSP, "x^2+6x+2=0", "(x+3)^2=7", "valid-equivalence", "(x+3)^2=x^2+6x+9, so add 7 to -2", pair="eqn-f3")
t("completing the square adds the wrong constant", SSP, "x^2+6x+2=0", "(x+3)^2=11", "invalid",
  "(x+3)^2-11=x^2+6x-2, not x^2+6x+2; -3+sqrt(7) is lost", pair="eqn-f3")
t("quadratic formula", SSP, "x^2-4x-1=0", "x=2±sqrt(5)", "valid-equivalence", "(4+-sqrt(20))/2", pair="eqn-f4")
t("quadratic formula with the sign of b dropped", SSP, "x^2-4x-1=0", "x=-2±sqrt(5)", "invalid", "-b=+4 not -4; 2+sqrt5 lost", pair="eqn-f4")
t("quadratic formula unsimplified", FORM, "3x^2-2x-4=0", "x=(2±sqrt(52))/6", "valid-equivalence", "b^2-4ac=4+48=52", pair="eqn-f5")
t("quadratic formula simplified", FORM, "3x^2-2x-4=0", "x=(1±sqrt(13))/3", "valid-equivalence", "sqrt52=2sqrt13, divide by 2", pair="eqn-f5")
t("denominator 2a in the quadratic formula", SSP, "3x^2-2x-4=0", "x=(2±sqrt(52))/3", "invalid", "denominator is 2a=6 not 3", pair="eqn-f5")
t("perfect-square trinomial has one root", SSP, "x^2-6x+9=0", "x=3", "valid-equivalence", "(x-3)^2=0", d="easy")
t("completing the square with negative right side signals no real roots", SSP, "x^2+2x+5=0", "(x+1)^2=-4", "valid-equivalence",
  "both empty over the reals")

# =====================================================================================================
# G. Higher degree by substitution
# =====================================================================================================
t("biquadratic factored as a quadratic in x^2", SSP, "x^4-5x^2+4=0", "(x^2-1)(x^2-4)=0", "valid-equivalence", "u^2-5u+4=(u-1)(u-4)", pair="eqn-g1")
t("forgetting to back-substitute u = x^2", LOSS, "x^4-5x^2+4=0", "x=1 or x=4", "invalid",
  "u=1,4 are values of x^2; x=-1 and x=2 are lost (x=4 is not even a root)", pair="eqn-g1")
t("back-substituting u = x^2 with both signs", SSP, "x^4-5x^2+4=0", "x=±1 or x=±2", "valid-equivalence", "x^2=1 or 4", pair="eqn-g1")
t("a negative value of u = x^2 gives no real x", SSP, "x^4-3x^2-4=0", "x=±2", "valid-equivalence", "(x^2-4)(x^2+1); x^2=-1 impossible", pair="eqn-g2")
t("back-substitution keeping only the positive root", LOSS, "x^4-3x^2-4=0", "x=2", "invalid", "x=-2 is lost", pair="eqn-g2")
t("substitution u = sqrt(x)", SSP, "x-5sqrt(x)+6=0", "x=4 or x=9", "valid-equivalence", "sqrt(x)=2 or 3", pair="eqn-g3")
t("forgetting to square back after u = sqrt(x)", LOSS, "x-5sqrt(x)+6=0", "x=2 or x=3", "invalid",
  "2-5sqrt2+6 != 0; true roots 4 and 9 are lost", pair="eqn-g3")
t("substitution u = e^x", SSP, "e^(2x)-5e^x+6=0", "x=ln(2) or x=ln(3)", "valid-equivalence", "e^x=2 or 3", pair="eqn-g4")
t("forgetting to take logs after u = e^x", LOSS, "e^(2x)-5e^x+6=0", "x=2 or x=3", "invalid", "the u-values were reported as x", pair="eqn-g4")
t("substitution u = x^2 - x", SSP, "(x^2-x)^2-8(x^2-x)+12=0", "x=-2, -1, 2 or 3", "valid-equivalence",
  "u=2: x=2,-1; u=6: x=3,-2", d="hard", c=2)
t("substitution u = 2^x with one inadmissible value", SSP, "4^x-3*2^x-4=0", "x=2", "valid-equivalence", "(2^x-4)(2^x+1); 2^x=-1 impossible")

# =====================================================================================================
# H. Absolute-value equations
# =====================================================================================================
t("|A|=c with c>0 splits into A=c or A=-c", SSP, "|x-3|=5", "x-3=5 or x-3=-5", "valid-equivalence", "{8,-2}", d="easy", pair="eqn-h1")
t("dropping the negative branch of |A|=c", LOSS, "|x-3|=5", "x-3=5", "invalid", "x=-2 is lost", d="easy", pair="eqn-h1")
t("absolute value equation solved as a list", FORM, "|x-3|=5", "x=8 or x=-2", "valid-equivalence", "3+-5", d="easy", pair="eqn-h1")
t("|A|=c with c<0 has no solution; splitting creates false roots", DOMP, "|2x+1|=-3", "2x+1=-3 or 2x+1=3", "domain-violation",
  "|A|>=0 so prev is empty; the split needs c>=0", pair="eqn-h0")
t("|A|=B splits only where B>=0", DOMP, "|x-1|=2x", "x-1=2x or x-1=-2x", "domain-violation",
  "branches give -1 and 1/3; at -1, |-2|=2 != -2; the condition 2x>=0 was dropped", pair="eqn-h2", composition=True)
t("|A|=B solved with the sign condition", SSP, "|x-1|=2x", "x=1/3", "valid-equivalence", "|-2/3|=2/3", pair="eqn-h2", composition=True)
t("|A|=B split is sound once B>=0 is assumed", SSP, "|x-1|=2x", "x-1=2x or x-1=-2x", "valid-equivalence",
  "on x>=0 the branch x=-1 is excluded by the domain; both sets are {1/3}", assumptions=["x >= 0"], pair="eqn-h2", composition=True)
t("sum of absolute values", SSP, "|x|+|x-2|=4", "x=-1 or x=3", "valid-equivalence",
  "x<0: -2x+2=4, x=-1; 0<=x<2: 2=4 none; x>=2: 2x-2=4, x=3", d="hard", c=2)
t("absolute value of a quadratic", SSP, "|x^2-4|=3", "x=±1 or x=±sqrt(7)", "valid-equivalence", "x^2=7 or x^2=1", pair="eqn-h4")
t("dropping the negative branch of |x^2-4|=3", LOSS, "|x^2-4|=3", "x^2-4=3", "invalid", "x=+-1 lost (x^2-4=-3)", pair="eqn-h4")
t("|A|=A holds exactly when A>=0", SSP, "|x-2|=x-2", "x>=2", "valid-equivalence", "|A|=A iff A>=0", pair="eqn-h3")
t("|A|=A is not a single point", LOSS, "|x-2|=x-2", "x=2", "invalid", "x=3 satisfies |1|=1 and is lost", pair="eqn-h3")

# =====================================================================================================
# I/J. Rational equations with excluded values
# =====================================================================================================
t("cross-multiplying when no excluded value is produced", SSP, "3/(x-2)=6/(x+1)", "3(x+1)=6(x-2)", "valid-equivalence",
  "next: x=5, allowed (5 != 2, -1)")
t("clearing a denominator produces an excluded value", DOMP, "x/(x-3)=3/(x-3)+2", "x=3+2(x-3)", "domain-violation",
  "next gives x=3, excluded from prev (x != 3); prev has no solution", pair="eqn-j1")
t("a rational equation with no solution", SSP, "x/(x-3)=3/(x-3)+2", "0=1", "valid-equivalence",
  "the only candidate 3 is excluded, so both sets are empty", pair="eqn-j1")
t("numerator zero but denominator also zero", DOMP, "(x^2-9)/(x-3)=0", "x=±3", "domain-violation",
  "x=3 makes the denominator 0; prev {-3}", pair="eqn-j2")
t("rational equation: only the root outside the excluded set", SSP, "(x^2-9)/(x-3)=0", "x=-3", "valid-equivalence", "x != 3", pair="eqn-j2")
t("cancelling (x-3) admits the excluded value", DOMP, "(x^2-9)/(x-3)=6", "x+3=6", "domain-violation",
  "x+3=6 gives 3, excluded; prev empty", pair="eqn-j3", composition=True)
t("cancelling (x-3) when the root is admissible", SSP, "(x^2-9)/(x-3)=5", "x+3=5", "valid-equivalence", "x=2 != 3", pair="eqn-j3", composition=True)
t("clearing a denominator that is nonzero at the root", SSP, "1/(x+1)=x/(x+1)", "1=x", "valid-equivalence", "x=1 allowed", pair="eqn-j4")
t("clearing a denominator that vanishes at the root", DOMP, "1/(x-1)=x/(x-1)", "1=x", "domain-violation",
  "x=1 is excluded; prev empty", pair="eqn-j4")
t("excluded value stated as an assumption", SSP, "x/(x-1)=1/(x-1)", "x=1", "valid-equivalence",
  "within x != 1 both sets are empty", assumptions=["x != 1"], pair="eqn-j5")
t("clearing a denominator without the exclusion", DOMP, "x/(x-1)=1/(x-1)", "x=1", "domain-violation", "prev empty; next {1}", pair="eqn-j5")
t("cross-multiplying x/8 and 2/x", SSP, "2/x=x/8", "x^2=16", "valid-equivalence", "+-4 both nonzero")
t("multiplying x+1/x=2 by x", SSP, "x+1/x=2", "x^2+1=2x", "valid-equivalence", "x=1 in both; 0 is not a root of the next")
t("clearing a factored denominator", DOMP, "4/(x^2-1)=2/(x-1)", "4=2(x+1)", "domain-violation",
  "next gives x=1, excluded; prev empty")

# =====================================================================================================
# K. Exponential and logarithmic equations
# =====================================================================================================
t("reciprocal as a negative exponent", SSP, "3^(2x-1)=1/27", "2x-1=-3", "valid-equivalence", "1/27=3^-3", pair="eqn-k1")
t("reciprocal confused with a positive exponent", SSP, "3^(2x-1)=1/27", "2x-1=3", "invalid", "x=-1 lost", pair="eqn-k1")
t("solving with natural logs", SSP, "2^x=3", "x=ln(3)/ln(2)", "valid-equivalence", "take ln", pair="eqn-k2")
t("logarithm form of the solution", FORM, "2^x=3", "x=log2(3)", "valid-equivalence", "definition of log2", pair="eqn-k2")
t("quotient of logs is not log of the quotient", SSP, "2^x=3", "x=ln(3/2)", "invalid", "ln3/ln2 != ln(3/2)", pair="eqn-k2")
t("ln(x^2) is defined for negative x", LOSS, "ln(x^2)=ln(9)", "x=3", "invalid", "x=-3 gives ln9 and is lost", pair="eqn-k3")
t("ln(x^2)=ln(9) gives both signs", SSP, "ln(x^2)=ln(9)", "x=±3", "valid-equivalence", "x^2=9", pair="eqn-k3")
t("2ln(x) requires x>0", SSP, "2ln(x)=ln(9)", "x=3", "valid-equivalence", "x>0, x^2=9", pair="eqn-k4")
t("rewriting 2ln(x) as ln(x^2) widens the domain", DOMP, "2ln(x)=ln(9)", "ln(x^2)=ln(9)", "domain-violation",
  "next admits x=-3, outside the domain x>0", pair="eqn-k4")
t("rewriting ln(x^2) as 2ln(x) narrows the domain", LOSS, "ln(x^2)=ln(9)", "2ln(x)=ln(9)", "invalid",
  "x=-3 is lost", pair="eqn-k4")
t("combining log sums widens the domain", DOMP, "ln(x)+ln(x-2)=ln(3)", "ln(x(x-2))=ln(3)", "domain-violation",
  "x(x-2)=3: 3,-1; at -1 ln(x) is undefined but ln((-1)(-3)) is fine", pair="eqn-k5", composition=True)
t("splitting a log of a product narrows the domain", LOSS, "ln(x(x-2))=ln(3)", "ln(x)+ln(x-2)=ln(3)", "invalid",
  "x=-1 is lost", pair="eqn-k5", composition=True)
t("log sum equation solved with the domain", SSP, "ln(x)+ln(x-2)=ln(3)", "x=3", "valid-equivalence", "ln3+ln1=ln3; -1 excluded", pair="eqn-k5", composition=True)
t("decimal value of a base-10 log equation", SSP, "log10(x)=-2", "x=0.01", "valid-equivalence", "10^-2", d="easy", pair="eqn-k6")
t("log10(x)=-2 is not x=-100", SSP, "log10(x)=-2", "x=-100", "invalid", "x=0.01 lost; -100 outside domain", d="easy", pair="eqn-k6")
t("equal logs give equal arguments within the domain", SSP, "ln(x-3)=ln(5-x)", "x-3=5-x", "valid-equivalence",
  "x=4, with 1>0 on both sides", pair="eqn-k8")
t("equal logs of arguments that are never simultaneously positive", DOMP, "ln(x-6)=ln(2-x)", "x-6=2-x", "domain-violation",
  "x>6 and x<2 is empty; next gives 4", pair="eqn-k8")
t("taking logs of both sides of a mixed-base equation", SSP, "2^x=3^(x-1)", "x ln(2)=(x-1)ln(3)", "valid-equivalence",
  "both sides positive, ln injective")
t("equal exponents after cancelling e", SSP, "e^(x^2)=e^(4x)", "x^2=4x", "valid-equivalence", "{0,4}", pair="eqn-k7")
t("equal exponents then dividing by x", LOSS, "e^(x^2)=e^(4x)", "x=4", "invalid", "x=0 is lost", pair="eqn-k7",
  composition=True)

# =====================================================================================================
# Insufficient information (ambiguous notation / parameters)
# =====================================================================================================
t("a/bc juxtaposition is ambiguous", "unambiguous reading of notation", "1/2x=4", "x=8", "insufficient-information",
  "read as (1/2)x: x=8; as 1/(2x): x=1/8", pair="eqn-i1")
t("explicit grouping removes the ambiguity", SSP, "(1/2)x=4", "x=8", "valid-equivalence", "x/2=4", d="easy", pair="eqn-i1")
t("bare log has an unstated base", "unambiguous reading of notation", "log(x)=2", "x=100", "insufficient-information",
  "base 10 gives 100, base e gives e^2")
t("dividing by a parameter needs it nonzero", PARAM, "a x=b", "x=b/a", "insufficient-information",
  "requires a != 0; if a=0 the equation has no or every solution")

# =====================================================================================================
# WORKINGS
# =====================================================================================================
# --- squaring with candidate checks
w("squaring then checking candidates", EXT, "sqrt(x+5)=x-1",
  ["x+5=x^2-2x+1", "x^2-3x-4=0", "(x-4)(x+1)=0", "x=4 or x=-1", ("check x=-1: sqrt(4)=2 but -1-1=-2, reject", None), "x=4"],
  "valid-implication", "squaring is one-way; the extraneous root -1 is checked and rejected", "x=4", pair="eqn-w1")
w("squaring without checking keeps an extraneous root", EXT, "sqrt(x+5)=x-1",
  ["x+5=x^2-2x+1", "x^2-3x-4=0", "(x-4)(x+1)=0", "x=4 or x=-1"],
  "invalid", "x=-1 gives sqrt(4)=2 != -2, so the final answer is wrong", "x=4", pair="eqn-w1")
w("dropping an extraneous root with no visible check", EXT, "sqrt(x+5)=x-1",
  ["x+5=x^2-2x+1", "x^2-3x-4=0", "(x-4)(x+1)=0", "x=4"],
  "domain-violation", "the answer is right but the one-way squaring step is never justified by a check", "x=4", pair="eqn-w1")
w("rejecting the wrong candidate", EXT, "sqrt(x+5)=x-1",
  ["x+5=x^2-2x+1", "(x-4)(x+1)=0", ("reject x=4 because sqrt(9) is not 4-1", None), "x=-1"],
  "invalid", "x=4 is the actual solution; -1 is extraneous", "x=4", pair="eqn-w1")
w("cited reason for rejecting an extraneous root is false", REASON, "sqrt(x+2)=x",
  ["x+2=x^2", "(x-2)(x+1)=0", "x=2 or x=-1", ("reject x=-1 because a square-root equation cannot have a negative solution", None), "x=2"],
  "wrong-reason", "-1 must be rejected because sqrt(1)=1 != -1; negative solutions are possible in general (sqrt(x+5)=x+3 has x=-1)", "x=2")
w("squaring with a coefficient on the root", EXT, "2sqrt(x)=x-3",
  ["4x=x^2-6x+9", "x^2-10x+9=0", "(x-1)(x-9)=0", ("x=1: 2 vs -2, discard; x=9: 6=6", None), "x=9"],
  "valid-implication", "squaring adds x=1, which is discarded after substitution", "x=9")
w("squaring twice with a check", EXT, "sqrt(2x-1)=sqrt(x)+1",
  ["2x-1=x+2sqrt(x)+1", "x-2=2sqrt(x)", "x^2-4x+4=4x", "x^2-8x+4=0", "x=4±2sqrt(3)",
   ("check: for x=4-2sqrt(3), x-2<0 but 2sqrt(x)>=0, reject", None), "x=4+2sqrt(3)"],
  "valid-implication", "second squaring adds 4-2sqrt3; 4+2sqrt3: sqrt(x)=sqrt3+1, sqrt(2x-1)=2+sqrt3, valid", "x=4+2sqrt(3)",
  d="hard", c=4, composition=True)
w("isolating a radical so that squaring adds nothing", SSP, "sqrt(x+3)+sqrt(x)=3",
  ["sqrt(x+3)=3-sqrt(x)", "x+3=9-6sqrt(x)+x", "6sqrt(x)=6", "sqrt(x)=1", "x=1"],
  "valid-equivalence", "every line has solution set {1}; at x=1: 2+1=3", "x=1", d="hard", c=3)
w("radical equation with an arithmetic slip", SSP, "sqrt(3x+1)=x-1",
  ["3x+1=x^2-2x+1", "x^2-5x=0", "x(x-5)=0", ("x=0: 1 vs -1, reject", None), "x=6"],
  "invalid", "x=5 is the root (sqrt16=4); the final line reports 6", "x=5")
w("radical equation solved correctly", EXT, "sqrt(3x+1)=x-1",
  ["3x+1=x^2-2x+1", "x^2-5x=0", "x(x-5)=0", "x=0 or x=5", ("check x=0: sqrt(1)=1, 0-1=-1, reject", None), "x=5"],
  "valid-implication", "squaring adds 0; check rejects it", "x=5", c=3)
w("square root equal to a negative number", EXT, "sqrt(x)=-3", ["x=9"], "invalid",
  "sqrt(x)>=0 so there is no solution; 9 gives 3 != -3", "no solution", d="easy", pair="eqn-w2")
w("square root equal to a negative number, with check", EXT, "sqrt(x)=-3",
  ["x=9", ("check: sqrt(9)=3, not -3, reject", None), "empty"], "valid-implication",
  "the squared candidate is rejected; the set is empty", "no solution", d="easy", pair="eqn-w2")

# --- quadratics
w("factoring a quadratic", SSP, "x^2-5x-14=0", ["(x-7)(x+2)=0", "x=7 or x=-2"], "valid-equivalence", "-7*2=-14, -7+2=-5", "x=7 or x=-2",
  d="easy", pair="eqn-w3")
w("factoring with swapped signs", SSP, "x^2-5x-14=0", ["(x+7)(x-2)=0", "x=-7 or x=2"], "invalid", "(x+7)(x-2)=x^2+5x-14", "x=7 or x=-2",
  d="easy", pair="eqn-w3")
w("factored but not solved", SSP, "x^2-7x+10=0", ["(x-2)(x-5)=0"], "incomplete", "correct factorisation but no solution stated", "x=2 or x=5", d="easy")
w("completing the square with +-", SSP, "x^2+4x-1=0", ["x^2+4x=1", "x^2+4x+4=5", "(x+2)^2=5", "x+2=±sqrt(5)", "x=-2±sqrt(5)"],
  "valid-equivalence", "all steps reversible", "x=-2±sqrt(5)", pair="eqn-w4")
w("completing the square losing the negative root", LOSS, "x^2+4x-1=0", ["x^2+4x=1", "(x+2)^2=5", "x+2=sqrt(5)", "x=-2+sqrt(5)"],
  "invalid", "-2-sqrt5 is lost at the square-root step", "x=-2±sqrt(5)", pair="eqn-w4")
w("discriminant then formula", SSP, "2x^2-3x-1=0", [("discriminant (-3)^2-4(2)(-1)=17", "claim: (-3)^2-4*2*(-1)=17"), "x=(3±sqrt(17))/4"],
  "valid-equivalence", "b^2-4ac=9+8=17, x=(3+-sqrt17)/4", "x=(3±sqrt(17))/4", pair="eqn-w5")
w("discriminant sign error", SSP, "2x^2-3x-1=0", [("discriminant (-3)^2-4(2)(-1)=1", "claim: (-3)^2-4*2*(-1)=1"), "x=(3±1)/4", "x=1 or x=1/2"],
  "invalid", "the discriminant is 17, not 1; 1 and 1/2 are not roots (2-3-1=-2)", "x=(3±sqrt(17))/4", pair="eqn-w5")
w("negative discriminant means no real roots", SSP, "x^2+2x+5=0", [("discriminant 2^2-4(1)(5)=-16<0", "claim: 2^2-4*1*5=-16"), "empty"],
  "valid-equivalence", "4-20=-16", "no real solution", pair="eqn-w6")
w("square root of a negative treated as real", SSP, "x^2+2x+5=0", ["(x+1)^2=-4", "x+1=±2", "x=1 or x=-3"],
  "invalid", "(x+1)^2=-4 has no real solution; x=1 gives 8 != 0", "no real solution", pair="eqn-w6")
w("factoring out x keeps x=0", SSP, "x^2=3x", ["x^2-3x=0", "x(x-3)=0", "x=0 or x=3"], "valid-equivalence", "zero-product", "x=0 or x=3",
  d="easy", pair="eqn-w7")
w("dividing by x loses x=0", LOSS, "x^2=3x", [("divide by x", None), "x=3"], "invalid", "x=0 is lost", "x=0 or x=3", d="easy", pair="eqn-w7")
w("repeated root with an irrelevant reason", REASON, "x^2-6x+9=0",
  ["(x-3)^2=0", ("the root is repeated because 9 is a perfect square", None), "x=3"], "wrong-reason",
  "the root is repeated because the discriminant 36-36 is 0; a perfect-square constant is not the reason (x^2-10x+9 has two distinct roots)", "x=3")
w("no real roots with a wrong reason", REASON, "x^2+4=0", ["x^2=-4", ("no real solution because -4 is not a perfect square", None), "empty"],
  "wrong-reason", "the reason is that squares are nonnegative; x^2=2 also has a non-square right side yet two real solutions", "no real solution")

# --- substitution
w("biquadratic via u = x^2", SSP, "x^4-13x^2+36=0",
  [("let u=x^2: u^2-13u+36=0", None), ("(u-4)(u-9)=0", None), "x^2=4 or x^2=9", "x=±2 or x=±3"],
  "valid-equivalence", "u=4,9 back to x", "x=±2 or x=±3", pair="eqn-w8")
w("biquadratic stopped at x^2 values", SSP, "x^4-13x^2+36=0",
  [("let u=x^2: u^2-13u+36=0", None), ("(u-4)(u-9)=0", None), "x^2=4 or x^2=9"],
  "incomplete", "nothing false, but x is not solved for", "x=±2 or x=±3", pair="eqn-w8")
w("biquadratic back-substitution without negatives", LOSS, "x^4-13x^2+36=0",
  [("let u=x^2: u^2-13u+36=0", None), ("(u-4)(u-9)=0", None), "x=2 or x=3"],
  "invalid", "-2 and -3 lost", "x=±2 or x=±3", pair="eqn-w8")
w("exponential quadratic with an impossible branch", SSP, "e^(2x)-e^x-6=0",
  ["(e^x-3)(e^x+2)=0", "e^x=3 or e^x=-2", ("e^x=-2 is impossible since e^x>0", None), "x=ln(3)"],
  "valid-equivalence", "e^x>0 removes the second branch; lines are equivalent", "x=ln(3)")
w("u = sqrt(x) with an impossible branch", SSP, "x-3sqrt(x)-4=0",
  ["(sqrt(x)-4)(sqrt(x)+1)=0", ("sqrt(x)=-1 is impossible", None), "sqrt(x)=4", "x=16"],
  "valid-equivalence", "sqrt(x)+1>0", "x=16", pair="eqn-w9", composition=True)
w("squaring the impossible branch of u = sqrt(x)", SSP, "x-3sqrt(x)-4=0",
  ["(sqrt(x)-4)(sqrt(x)+1)=0", "sqrt(x)=4 or sqrt(x)=-1", "x=16 or x=1"],
  "invalid", "x=1 gives 1-3-4=-6 != 0", "x=16", pair="eqn-w9", composition=True)
w("cubic substitution", SSP, "x^6+7x^3-8=0", ["(x^3+8)(x^3-1)=0", "x^3=-8 or x^3=1", "x=-2 or x=1"], "valid-equivalence",
  "real cube roots", "x=-2 or x=1")
w("powers of 3 as a quadratic", SSP, "9^x-4*3^x+3=0", ["(3^x)^2-4*3^x+3=0", "(3^x-1)(3^x-3)=0", "3^x=1 or 3^x=3", "x=0 or x=1"],
  "valid-equivalence", "9^x=(3^x)^2", "x=0 or x=1", c=3)

# --- absolute value
w("|A|=c split", SSP, "|2x-3|=7", ["2x-3=7 or 2x-3=-7", "x=5 or x=-2"], "valid-equivalence", "7>0", "x=5 or x=-2", d="easy")
w("|A|=B by cases with scopes", SCOPE, "|x-4|=3x",
  ["scope x>=4 | x-4=3x", "scope x>=4 | x=-2", ("x=-2 is outside x>=4, no solution here", None), "scope x<4 | 4-x=3x",
   "scope x<4 | x=1", "x=1"],
  "valid-equivalence", "case x>=4 gives -2 (excluded); case x<4 gives 1", "x=1", c=4, pair="eqn-w10", composition=True)
w("|A|=B split without the sign condition", SCOPE, "|x-4|=3x", ["x-4=3x or x-4=-3x", "x=-2 or x=1"], "invalid",
  "x=-2: |-6|=6 but 3(-2)=-6", "x=1", pair="eqn-w10", composition=True)
w("|A|=B split then checked", EXT, "|x-4|=3x",
  ["x-4=3x or x-4=-3x", "x=-2 or x=1", ("check x=-2: |-6|=6 but 3(-2)=-6, reject", None), "x=1"],
  "valid-implication", "the split is one-way without B>=0; the check repairs it", "x=1", pair="eqn-w10", composition=True)
w("rejecting with a false general rule", REASON, "|x-4|=3x",
  ["x-4=3x or x-4=-3x", "x=-2 or x=1", ("reject x=-2 since absolute-value equations never have negative solutions", None), "x=1"],
  "wrong-reason", "|x|=2 has x=-2; the real reason is 3x<0 at x=-2", "x=1", pair="eqn-w10", composition=True)
w("|A|=|B|", SSP, "|x+1|=|2x-5|", ["x+1=2x-5 or x+1=-(2x-5)", "x=6 or x=4/3"], "valid-equivalence",
  "|7|=|7|; |7/3|=|-7/3|", "x=6 or x=4/3")
w("three-case analysis for a sum of absolute values", SCOPE, "|x|+|x-3|=5",
  ["scope x<0 | -x-(x-3)=5", "scope x<0 | x=-1", "scope 0<=x<3 | x-(x-3)=5", "scope 0<=x<3 | 3=5", "scope x>=3 | x+x-3=5",
   "scope x>=3 | x=4", "x=-1 or x=4"],
  "valid-equivalence", "middle case impossible", "x=-1 or x=4", d="hard", c=5, pair="eqn-w11", composition=True)
w("missing the middle case where every point solves", SCOPE, "|x|+|x-3|=3",
  ["scope x<0 | -2x+3=3", ("x=0 is not in x<0", None), "scope x>=3 | 2x-3=3", "scope x>=3 | x=3", "x=3"],
  "invalid", "for 0<=x<=3 the sum is identically 3; every point of [0,3] solves", "0<=x<=3", d="hard", c=4, pair="eqn-w11", composition=True)
w("the middle case can give an interval", SCOPE, "|x|+|x-3|=3",
  ["scope x<0 | -2x+3=3", "scope 0<=x<3 | 3=3", "scope x>=3 | 2x-3=3", "0<=x<=3"],
  "valid-equivalence", "x<0: x=0 excluded; middle all; x>=3: 3", "0<=x<=3", d="hard", c=4, pair="eqn-w11", composition=True)
w("|x|+2=0 has no solution", SSP, "|x|+2=0", ["|x|=-2", ("absolute values are never negative", None), "empty"], "valid-equivalence",
  "|x|>=0", "no solution", d="easy", pair="eqn-w12")
w("splitting |x|=-2", SSP, "|x|+2=0", ["|x|=-2", "x=±2"], "invalid", "|2|=2 != -2", "no solution", d="easy", pair="eqn-w12")

# --- rational equations
w("cleared denominator gives the excluded value", EXT, "x/(x-2)+1=2/(x-2)",
  [("x != 2", "restrict: x != 2"), "x+x-2=2", "2x=4", "x=2", ("x=2 is excluded, reject", None), "empty"],
  "valid-implication", "the only candidate makes a denominator zero", "no solution", pair="eqn-w13")
w("reporting the excluded value", DOMP, "x/(x-2)+1=2/(x-2)", ["x+x-2=2", "2x=4", "x=2"], "invalid",
  "x=2 makes the denominators zero; there is no solution", "no solution", pair="eqn-w13")
w("two fractions over x^2-1", EXT, "1/(x-1)+1/(x+1)=2/(x^2-1)",
  [("x != 1, x != -1", "restrict: x != 1 and x != -1"), "(x+1)+(x-1)=2", "2x=2", "x=1", ("x=1 is excluded, reject", None), "empty"],
  "valid-implication", "candidate 1 excluded", "no solution", c=4)
w("cross-multiplying with stated restrictions", SSP, "3/(x+1)=2/(x-2)",
  [("x != -1, x != 2", "restrict: x != -1 and x != 2"), "3(x-2)=2(x+1)", "3x-6=2x+2", "x=8"],
  "valid-equivalence", "8 is not excluded", "x=8", pair="eqn-w14")
w("cross-multiplying without stating restrictions", DOMP, "3/(x+1)=2/(x-2)", ["3(x-2)=2(x+1)", "3x-6=2x+2", "x=8"],
  "domain-violation", "answer correct but excluded values never stated", "x=8", pair="eqn-w14")
w("one of two candidates is excluded", EXT, "x^2/(x-3)=9/(x-3)",
  [("x != 3", "restrict: x != 3"), "x^2=9", "x=3 or x=-3", ("x=3 excluded, reject", None), "x=-3"],
  "valid-implication", "x=3 makes the denominator zero", "x=-3", pair="eqn-w15")
w("excluded candidate kept", DOMP, "x^2/(x-3)=9/(x-3)", ["x^2=9", "x=3 or x=-3"], "invalid", "x=3 is not in the domain", "x=-3", pair="eqn-w15")
w("excluded candidate silently dropped", DOMP, "x^2/(x-3)=9/(x-3)", ["x^2=9", "x=-3"], "domain-violation",
  "answer right but no restriction and no check stated", "x=-3", pair="eqn-w15")
w("fraction equation leading to a quadratic", SSP, "x/(x+1)=6/(x+4)",
  [("x != -1, x != -4", "restrict: x != -1 and x != -4"), "x(x+4)=6(x+1)", "x^2-2x-6=0", "x=1±sqrt(7)"],
  "valid-equivalence", "neither 1+-sqrt7 is -1 or -4", "x=1±sqrt(7)", c=3)

# --- exponentials and logs
w("log sum with domain check", EXT, "ln(x)+ln(x-3)=ln(4)",
  ["ln(x(x-3))=ln(4)", "x^2-3x-4=0", "(x-4)(x+1)=0", "x=4 or x=-1", ("x=-1 rejected: ln(-1) undefined", None), "x=4"],
  "valid-implication", "combining logs widens the domain; -1 rejected", "x=4", c=4, pair="eqn-w16")
w("log sum keeping the out-of-domain candidate", DOMP, "ln(x)+ln(x-3)=ln(4)",
  ["ln(x(x-3))=ln(4)", "x^2-3x-4=0", "(x-4)(x+1)=0", "x=4 or x=-1"], "invalid", "ln(-1) undefined", "x=4", pair="eqn-w16")
w("log sum dropping the candidate without a reason", DOMP, "ln(x)+ln(x-3)=ln(4)",
  ["ln(x(x-3))=ln(4)", "x^2-3x-4=0", "(x-4)(x+1)=0", "x=4"], "domain-violation", "correct answer; the domain obligation is skipped", "x=4", pair="eqn-w16")
w("logs of both sides with different bases", SSP, "3^(x+1)=5^x",
  ["(x+1)ln(3)=x ln(5)", "x(ln(5)-ln(3))=ln(3)", "x=ln(3)/(ln(5)-ln(3))"], "valid-equivalence", "linear in x after logs",
  "x=ln(3)/(ln(5)-ln(3))", pair="eqn-w17")
w("sign error collecting log terms", SSP, "3^(x+1)=5^x",
  ["(x+1)ln(3)=x ln(5)", "x(ln(5)+ln(3))=ln(3)", "x=ln(3)/(ln(5)+ln(3))"], "invalid",
  "x ln3 moved without changing sign", "x=ln(3)/(ln(5)-ln(3))", pair="eqn-w17")
w("log difference by exponentiating", SSP, "ln(x+1)-ln(x)=1",
  ["ln(x+1)=1+ln(x)", "x+1=e x", "x(e-1)=1", "x=1/(e-1)"], "valid-equivalence", "1/(e-1)>0 so in the domain; each line has the same set", "x=1/(e-1)", c=4)
w("dividing by a positive exponential", SSP, "e^(2x)=3e^x", ["e^x=3", "x=ln(3)"], "valid-equivalence",
  "dividing by e^x>0 is reversible, unlike dividing by x", "x=ln(3)", composition=True)
w("injectivity justified by positivity", REASON, "e^(2x)=e^(x+1)",
  ["2x=x+1", ("exponents can be equated because exponentials are positive", None), "x=1"], "wrong-reason",
  "the valid reason is injectivity of exp; positivity does not imply it (x^2 is positive yet not injective)", "x=1")
w("exponent quadratic with both roots", SSP, "5^(x^2-1)=25", ["x^2-1=2", "x^2=3", "x=±sqrt(3)"], "valid-equivalence", "25=5^2, exponents equal, x^2=3 has two roots", "x=±sqrt(3)", pair="eqn-w18")
w("exponent quadratic losing a root", LOSS, "5^(x^2-1)=25", ["x^2-1=2", "x^2=3", "x=sqrt(3)"], "invalid", "-sqrt3 lost", "x=±sqrt(3)", pair="eqn-w18")
w("power rule for logs narrows the domain", LOSS, "ln(x^2)=4", ["2ln(x)=4", "ln(x)=2", "x=e^2"], "invalid",
  "ln(x^2)=2ln|x|; x=-e^2 is lost", "x=±e^2", pair="eqn-w19", composition=True)
w("log of a square solved by exponentiating", SSP, "ln(x^2)=4", ["x^2=e^4", "x=±e^2"], "valid-equivalence", "x^2>0 at both", "x=±e^2", pair="eqn-w19", composition=True)

# --- linear multi-line, no solution / all reals
w("fractions cleared in a linear equation", SSP, "(x-1)/3-(x+2)/4=1",
  ["4(x-1)-3(x+2)=12", "4x-4-3x-6=12", "x-10=12", "x=22"], "valid-equivalence", "LCD 12", "x=22", pair="eqn-w20")
w("sign error distributing a negative", SSP, "(x-1)/3-(x+2)/4=1",
  ["4(x-1)-3(x+2)=12", "4x-4-3x+6=12", "x+2=12", "x=10"], "invalid", "-3*2=-6 not +6", "x=22", pair="eqn-w20")
w("identity: all reals", SSP, "3(x-2)+6=3x", ["3x-6+6=3x", "3x=3x", "0=0", "-oo<x<oo"], "valid-equivalence", "true for every x", "all real x",
  pair="eqn-w21")
w("identity mistaken for x=0", SSP, "3(x-2)+6=3x", ["3x-6+6=3x", "0=0", "x=0"], "invalid", "every real solves; final {0} loses the rest", "all real x",
  pair="eqn-w21")
w("contradiction: no solution", SSP, "2x+5=2(x+3)", ["2x+5=2x+6", "5=6", "empty"], "valid-equivalence", "5 != 6", "no solution", pair="eqn-w22")
w("contradiction reported as a solution", SSP, "2x+5=2(x+3)", ["2x+5=2x+6", "x=1"], "invalid", "no x solves it", "no solution", pair="eqn-w22")
w("radical equation stopped after squaring", EXT, "sqrt(x+7)=x+1", ["x+7=x^2+2x+1", "x^2+x-6=0"], "incomplete",
  "lines are consequences but no solution is stated", "x=2")

# --- parameters
w("dividing by a parameter", PARAM, "a x+3=7", ["a x=4", "x=4/a"], "insufficient-information", "needs a != 0", "x=4/a (a != 0)")
w("square root of a parameter", PARAM, "x^2=k", ["x=±sqrt(k)"], "insufficient-information", "needs k >= 0", "x=±sqrt(k) for k>=0")
w("cancelling a parameter factor", PARAM, "(a-1)x=a^2-1", ["x=(a^2-1)/(a-1)", "x=a+1"], "insufficient-information",
  "needs a != 1; a=1 gives 0=0, every x", "x=a+1 (a != 1)")
