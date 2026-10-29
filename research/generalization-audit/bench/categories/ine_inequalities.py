"""INE: Inequalities and conditional transformations (single real variable; solution sets over the reals).

Every label below was derived by hand (sets written out in each `why`)."""
from schema import T, W

C = "INE"
SSP = "solution-set preservation"
SIGN = "sign of multiplier in inequalities"
MONO = "monotonicity of the applied function"
BND = "boundary inclusion (strict vs non-strict)"
EXCL = "excluded points of rational inequalities"
SCOPE = "case-scope propagation"
LOGIC = "and/or connective of the solution set"
REASON = "cited reason vs actual justification"
PARAM = "unstated parameter condition"


def t(principle, invariant, prev, nxt, rel, why, d="medium", c=1, **kw):
    if kw.get("composition"):
        d, c = "hard", max(c, 2)
    return T(C, principle, invariant, prev, nxt, "statement", rel, why=why, difficulty=d, complexity=c, **kw)


def w(principle, invariant, st, lines, rel, why, ans, d="medium", c=2, **kw):
    if c >= 4 or kw.get("composition"):
        d = "hard"
    shown = [l if isinstance(l, str) else l[0] for l in lines]
    orc = [l if isinstance(l, str) else l[1] for l in lines]
    return W(C, principle, invariant, {"type": "solve", "statement": st}, shown, rel, why=why, answer=ans,
             oracle_lines=orc, difficulty=d, complexity=c, **kw)


# =====================================================================================================
# A. Multiplying / dividing by constants
# =====================================================================================================
t("dividing by a positive constant keeps the direction", SIGN, "3x>12", "x>4", "valid-equivalence", "{x>4}", d="easy", pair="ine-a1")
t("dividing by a negative constant reverses the direction", SIGN, "-3x>12", "x<-4", "valid-equivalence", "{x<-4}", d="easy", pair="ine-a2")
t("dividing by a negative without reversing", SIGN, "-3x>12", "x>-4", "invalid", "x=-5 solves -3x>12 (15>12) but -5>-4 is false", d="easy", pair="ine-a2")
t("subtracting then dividing by a negative", SIGN, "5-2x<=11", "x>=-3", "valid-equivalence", "-2x<=6, x>=-3", d="easy", pair="ine-a3")
t("reversal forgotten after subtracting", SIGN, "5-2x<=11", "x<=-3", "invalid", "x=0 gives 5<=11 but 0<=-3 false", d="easy", pair="ine-a3")
t("multiplying both sides by -1 reverses", SIGN, "-x<7", "x>-7", "valid-equivalence", "multiply by -1 and reverse", d="easy", pair="ine-a4")
t("multiplying by -1 without reversing", SIGN, "-x<7", "x<-7", "invalid", "x=0: 0<7 true, 0<-7 false", d="easy", pair="ine-a4")
t("multiplying by a negative fraction", SIGN, "-x/4>=2", "x<=-8", "valid-equivalence", "times -4 reverses", d="easy", pair="ine-y1")
t("adding a term to both sides never reverses", SSP, "x-5<2x+1", "-6<x", "valid-equivalence", "subtract x and 1", d="easy", pair="ine-a5")
t("reversing when only adding terms", SSP, "x-5<2x+1", "x<-6", "invalid", "x=0 solves the first; 0<-6 false", d="easy", pair="ine-a5")

# =====================================================================================================
# B. Multiplying / dividing by expressions of unknown sign
# =====================================================================================================
t("dividing by x of unknown sign", SIGN, "x^2>3x", "x>3", "invalid", "x=-1: 1>-3 true but -1>3 false", pair="ine-b1")
t("dividing by x under the assumption x>0", SIGN, "x^2>3x", "x>3", "valid-equivalence", "on x>0 both sets are {x>3}", assumptions=["x > 0"], pair="ine-b1")
t("dividing by x under the assumption x<0 reverses", SIGN, "x^2>3x", "x<3", "valid-equivalence", "on x<0 both sets are all of x<0", assumptions=["x < 0"], pair="ine-b1")
t("factoring then using a sign chart", SSP, "x^2>3x", "x<0 or x>3", "valid-equivalence", "x(x-3)>0", pair="ine-b1")
t("clearing a denominator of unknown sign", SIGN, "1/x<2", "1<2x", "invalid", "x=-1: -1<2 true, 1<-2 false", pair="ine-b2")
t("solution set of 1/x<2", SSP, "1/x<2", "x<0 or x>1/2", "valid-equivalence", "(1-2x)/x<0", pair="ine-b2")
t("clearing a positive denominator", SIGN, "1/x<2", "1<2x", "valid-equivalence", "on x>0 both give x>1/2", assumptions=["x > 0"], pair="ine-b2")
t("multiplying by a square that can vanish", SIGN, "(x+1)/(x-2)>0", "(x+1)(x-2)>0", "valid-equivalence",
  "multiplying by (x-2)^2>0 on the domain x != 2; the product form excludes 2 because it gives 0", pair="ine-b3", composition=True)
t("non-strict version of the product trick admits the pole", EXCL, "(x+1)/(x-2)>=0", "(x+1)(x-2)>=0", "valid-implication",
  "next includes x=2 (product 0), where the quotient is undefined; prev is x<=-1 or x>2", pair="ine-b3", composition=True)
t("clearing (x-2) as if positive", SIGN, "(x+1)/(x-2)>0", "x+1>0", "invalid", "x=-2: (-1)/(-4)>0 true but -1>0 false", pair="ine-b3", composition=True)
t("dividing by a factor that is always positive", SIGN, "(x^2+1)(x-3)<0", "x-3<0", "valid-equivalence", "x^2+1>0", pair="ine-b4")
t("dividing by a factor that is nonnegative but can vanish", SIGN, "(x-1)^2(x-3)<0", "x-3<0", "valid-implication",
  "prev is x<3 with x != 1 (at 1 the product is 0, not <0); next x<3 keeps every solution but adds x=1", pair="ine-b4")
t("squared factor and strict inequality", SSP, "(x-1)^2(x-3)<0", "x<3 and x!=1", "valid-equivalence", "(x-1)^2>0 except at 1", pair="ine-b4")
t("squared factor and non-strict inequality", BND, "(x-1)^2(x-3)<=0", "x<=3", "valid-equivalence", "at 1 the product is 0 <= 0", pair="ine-b4")
t("dividing by an exponential", SIGN, "x e^x<2e^x", "x<2", "valid-equivalence", "e^x>0", pair="ine-y8")
t("dividing by -e^x reverses", SIGN, "-e^x(x-1)>0", "x-1<0", "valid-equivalence", "-e^x<0, so the direction flips")

# =====================================================================================================
# C. Reciprocals
# =====================================================================================================
t("reciprocals of positive sides reverse", MONO, "x>3", "1/x<1/3", "valid-implication",
  "x>3 => 0<1/x<1/3; the converse admits negative x", pair="ine-c1")
t("reciprocal inequality has negative solutions too", MONO, "1/x<1/3", "x>3", "invalid", "x=-1: -1<1/3 but -1>3 false", pair="ine-c1")
t("full solution of a reciprocal inequality", SSP, "1/x<1/3", "x<0 or x>3", "valid-equivalence", "(3-x)/(3x)<0", pair="ine-c1")
t("reciprocal with both sides positive by assumption", MONO, "1/x>1/5", "x<5", "valid-equivalence", "on x>0: 0<x<5", assumptions=["x > 0"], pair="ine-c2")
t("reciprocal flip without sign information", MONO, "1/x>1/5", "x<5", "valid-implication",
  "prev is 0<x<5, next is x<5: every solution kept but negatives and 0 added", pair="ine-c2")
t("reciprocal flip without reversing", MONO, "1/x>1/5", "x>5", "invalid", "x=1: 1>1/5 true, 1>5 false", pair="ine-c2")
t("reciprocals of two negative sides reverse too", MONO, "1/x<-1/2", "-2<x<0", "valid-equivalence", "x negative and |x|<2", pair="ine-y9")

# =====================================================================================================
# D. Squaring inequalities and square roots
# =====================================================================================================
t("squaring when both sides are nonnegative", MONO, "sqrt(x)<3", "0<=x<9", "valid-equivalence", "domain x>=0, then x<9", pair="ine-d1")
t("squaring a square-root inequality dropping its domain", MONO, "sqrt(x)<3", "x<9", "valid-implication",
  "prev [0,9); next adds negatives where sqrt is undefined", pair="ine-d1")
t("squaring a negative left side breaks the order", MONO, "x<2", "x^2<4", "invalid", "x=-3: -3<2 but 9<4 false", pair="ine-d2")
t("squaring under x>=0", MONO, "x<2", "x^2<4", "valid-equivalence", "on x>=0 both give [0,2)", assumptions=["x >= 0"], pair="ine-d2")
t("square root of x^2<4 gives a two-sided bound", SSP, "x^2<4", "-2<x<2", "valid-equivalence", "|x|<2", pair="ine-d3")
t("taking square roots of x^2<4 as x<2", SSP, "x^2<4", "x<2", "valid-implication", "next contains every solution but adds x<=-2", pair="ine-d3")
t("square root of x^2>9 requires 'or'", LOGIC, "x^2>9", "x<-3 or x>3", "valid-equivalence", "|x|>3", pair="ine-d4")
t("square root of x^2>9 taken as x>3", SSP, "x^2>9", "x>3", "invalid", "x=-4 lost", pair="ine-d4")
t("writing x^2>9 as a chain", LOGIC, "x^2>9", "-3>x>3", "invalid", "the chain demands x<-3 and x>3, empty; -4 lost", pair="ine-d4")
t("square-root inequality with a variable right side", MONO, "sqrt(x+2)>x", "-2<=x<2", "valid-equivalence",
  "x<0: always (in domain); x>=0: x+2>x^2, 0<=x<2", d="hard", c=3, pair="ine-d5", composition=True)
t("squaring sqrt(x+2)>x without cases", MONO, "sqrt(x+2)>x", "x^2-x-2<0", "invalid",
  "x=-2: sqrt0=0>-2 true; 4+2-2=4<0 false", d="hard", c=2, pair="ine-d5", composition=True)
t("sqrt(x)<x-2", MONO, "sqrt(x)<x-2", "x>4", "valid-equivalence", "need x-2>0, then x<(x-2)^2 => x>4")
t("squaring an inequality between absolute values", MONO, "|x-1|<|x+1|", "(x-1)^2<(x+1)^2", "valid-equivalence",
  "both sides nonnegative; each gives x>0", pair="ine-d6")
t("dropping absolute values from both sides", MONO, "|x-1|<|x+1|", "x-1<x+1", "valid-implication",
  "prev {x>0}; next is always true", pair="ine-d6")
t("x^4>16 has two branches", SSP, "x^4>16", "x>2", "invalid", "x=-3 lost", pair="ine-d7")
t("x^4>16 as |x|>2", SSP, "x^4>16", "|x|>2", "valid-equivalence", "t -> t^4 increasing on t>=0", pair="ine-d7")
t("cubing preserves order", MONO, "x^3<-8", "x<-2", "valid-equivalence", "odd power increasing", d="easy", pair="ine-y2")
t("cube root of both sides", MONO, "cbrt(x)>2", "x>8", "valid-equivalence", "cbrt increasing")

# =====================================================================================================
# E. Sign charts, products and quotients, excluded points
# =====================================================================================================
t("sign chart of a product of two linear factors", SSP, "(x-1)(x+4)<0", "-4<x<1", "valid-equivalence", "negative between roots", d="easy", pair="ine-e1")
t("between-roots vs outside-roots confusion", LOGIC, "(x-1)(x+4)<0", "x<-4 or x>1", "invalid", "x=0: -4<0 true but 0 is not in the next set", d="easy", pair="ine-e1")
t("non-strict product includes the roots", BND, "(x-1)(x+4)<=0", "-4<=x<=1", "valid-equivalence", "nonpositive between and at the roots", d="easy", pair="ine-e1")
t("non-strict product with strict endpoints", BND, "(x-1)(x+4)<=0", "-4<x<1", "invalid", "x=1 gives 0<=0 and is lost", d="easy", pair="ine-e1")
t("three-factor sign chart", SSP, "x(x-2)(x+3)>0", "-3<x<0 or x>2", "valid-equivalence", "signs - + - + across -3,0,2")
t("three-factor sign chart with alternation started wrong", SSP, "x(x-2)(x+3)>0", "x<-3 or 0<x<2", "invalid", "x=3: 3*1*6>0 lost")
t("negative leading factor flips the chart", SSP, "(2-x)(x+1)>=0", "-1<=x<=2", "valid-equivalence", "-(x-2)(x+1)>=0", pair="ine-y3")
t("quotient sign chart with an excluded point", EXCL, "(x-3)/(x+2)<=0", "-2<x<=3", "valid-equivalence", "x=-2 excluded, x=3 included", pair="ine-e2")
t("including the pole in a quotient inequality", EXCL, "(x-3)/(x+2)<=0", "-2<=x<=3", "valid-implication",
  "next adds x=-2 where the quotient is undefined", pair="ine-e2")
t("excluding the numerator zero by mistake", BND, "(x-3)/(x+2)<=0", "-2<x<3", "invalid", "x=3 gives 0<=0 and is lost", pair="ine-e2")
t("comparison with a nonzero constant needs a common denominator", EXCL, "(x-3)/(x+1)<=2", "x-3<=2(x+1)", "invalid",
  "x=-6: (-9)/(-5)=1.8<=2 holds, but -9<=-10 fails; multiplying by x+1<0 needed a reversal", pair="ine-e3", composition=True)
t("rational inequality solved via common denominator", EXCL, "(x-3)/(x+1)<=2", "x<=-5 or x>-1", "valid-equivalence",
  "(-x-5)/(x+1)<=0 => (x+5)/(x+1)>=0: x<=-5 or x>-1", pair="ine-e3", composition=True)
t("rational inequality with boundary misplaced", BND, "(x-3)/(x+1)<=2", "x<-5 or x>-1", "invalid", "x=-5: (-8)/(-4)=2<=2 lost", pair="ine-e3", composition=True)
t("quotient of a factor with itself as a hole", EXCL, "(x-2)/(x^2-4)<=0", "x<-2", "valid-equivalence",
  "= 1/(x+2) for x != 2 (x=2 excluded), negative for x<-2")
t("difference of reciprocals", SSP, "1/(x-1)>=1/(x+1)", "x<-1 or x>1", "valid-equivalence",
  "difference 2/((x-1)(x+1))>=0, strictly positive outside [-1,1]", d="hard", c=2)
t("cross-multiplying reciprocals of unknown sign", SIGN, "1/(x-1)>=1/(x+1)", "x+1>=x-1", "valid-implication",
  "next is always true; prev only x<-1 or x>1", d="hard", c=2)
t("quotient positive iff product positive", SSP, "(x+5)/(3-x)>0", "-5<x<3", "valid-equivalence", "numerator and denominator both positive on (-5,3), opposite signs outside")

# =====================================================================================================
# F. Absolute-value inequalities
# =====================================================================================================
t("|A|<c becomes a chain (and)", LOGIC, "|2x-1|<5", "-5<2x-1<5", "valid-equivalence", "|A|<c iff -c<A<c", d="easy", pair="ine-f1")
t("|A|<c written with 'or'", LOGIC, "|2x-1|<5", "2x-1<-5 or 2x-1>5", "invalid", "that is |A|>5; x=0 lost", d="easy", pair="ine-f1")
t("|A|<c keeping only the upper bound", LOGIC, "|2x-1|<5", "2x-1<5", "valid-implication", "next x<3 contains (-2,3) and more", d="easy", pair="ine-f1")
t("|A|>c becomes 'or'", LOGIC, "|2x-1|>5", "x<-2 or x>3", "valid-equivalence", "2x-1<-5 or 2x-1>5", d="easy", pair="ine-f2")
t("|A|>c written as a chain", LOGIC, "|2x-1|>5", "-2>x>3", "invalid", "empty chain; x=4 lost", d="easy", pair="ine-f2")
t("|A|>c written with 'and'", LOGIC, "|2x-1|>5", "x<-2 and x>3", "invalid", "empty conjunction", d="easy", pair="ine-f2")
t("|A|<c with c negative has no solution", SSP, "|x+3|<-1", "-1<x+3<1", "valid-implication",
  "|A|<-1 is impossible, so prev is empty; an empty set implies anything; next is -4<x<-2", pair="ine-f3")
t("|A|>c with c negative holds everywhere", SSP, "|x+3|>-1", "x+3>-1", "invalid", "every real solves prev; x=-5 lost", pair="ine-f3")
t("|A|<=0 forces A=0", BND, "|x-4|<=0", "x=4", "valid-equivalence", "|A|>=0, so |A|<=0 iff A=0", pair="ine-f4")
t("|A|<0 has no solution", BND, "|x-4|<0", "x=4", "valid-implication", "prev empty; empty implies anything", pair="ine-f4")
t("|A|>0 excludes only the zero of A", BND, "|x-4|>0", "x!=4", "valid-equivalence", "|A|>0 iff A != 0", pair="ine-f4")
t("absolute value with a variable right side", SCOPE, "|x-1|<2x", "x>1/3", "valid-equivalence",
  "-2x<x-1<2x: x>1/3 and x>-1", pair="ine-y4")
t("absolute value of a quadratic below a constant", SSP, "|x^2-5|<4", "-3<x<-1 or 1<x<3", "valid-equivalence", "1<x^2<9", d="hard", c=2)
t("distance interpretation |x-a|<=r", SSP, "|x+2|<=3", "-5<=x<=1", "valid-equivalence", "within 3 of -2", d="easy")

# =====================================================================================================
# G. Quadratic inequalities
# =====================================================================================================
t("upward parabola below zero between roots", SSP, "x^2-x-6<0", "-2<x<3", "valid-equivalence", "(x-3)(x+2)<0", pair="ine-g1")
t("upward parabola above zero outside roots", SSP, "x^2-x-6>0", "x<-2 or x>3", "valid-equivalence", "(x-3)(x+2)>0 outside the roots", pair="ine-g1")
t("using the wrong region for >", SSP, "x^2-x-6>0", "-2<x<3", "invalid", "x=4: 16-4-6=6>0 holds but 4 is not in (-2,3)", pair="ine-g1")
t("downward parabola", SSP, "-x^2+2x+3>=0", "-1<=x<=3", "valid-equivalence", "x^2-2x-3<=0")
t("perfect square strictly positive except at its root", SSP, "x^2-6x+9>0", "x!=3", "valid-equivalence", "(x-3)^2>0", pair="ine-g2")
t("perfect square treated as always positive", SSP, "x^2-6x+9>0", "-oo<x<oo", "valid-implication", "next adds x=3", pair="ine-g2")
t("perfect square non-positive only at its root", SSP, "x^2-6x+9<=0", "x=3", "valid-equivalence", "(x-3)^2<=0 only at 3", pair="ine-g2")
t("negative discriminant: always positive", SSP, "x^2+x+1>0", "-oo<x<oo", "valid-equivalence", "disc -3<0", pair="ine-g3")
t("negative discriminant: never negative", SSP, "x^2+x+1<0", "x>0", "valid-implication", "prev empty", pair="ine-g3")
t("quadratic with irrational roots", SSP, "x^2-2x-1<=0", "1-sqrt(2)<=x<=1+sqrt(2)", "valid-equivalence", "roots 1+-sqrt(2), upward parabola")
t("square root form of a quadratic inequality", SSP, "x^2<=5", "|x|<=sqrt(5)", "valid-equivalence", "x^2=|x|^2 and t^2 increasing for t>=0", d="easy")

# =====================================================================================================
# H. Chained inequalities
# =====================================================================================================
t("operating on all three parts of a chain", SSP, "1<2x+3<=9", "-1<x<=3", "valid-equivalence", "subtract 3, divide by 2", d="easy", pair="ine-h1")
t("subtracting from only the middle of a chain", SSP, "1<2x+3<=9", "1<2x<=9", "invalid", "x=-1/2 solves the first (1<2<=9) but 1<-1 false", d="easy", pair="ine-h1")
t("dividing a chain by a negative reverses both", SIGN, "-4<=-2x<6", "-3<x<=2", "valid-equivalence", "divide by -2: 2>=x>-3", pair="ine-h2")
t("dividing a chain by a negative without reversing", SIGN, "-4<=-2x<6", "2<=x<-3", "invalid", "empty chain; 0 lost", pair="ine-h2")
t("chain with a subtraction from a constant", SIGN, "-1<3-x<5", "-2<x<4", "valid-equivalence", "-4<-x<2", pair="ine-y5")
t("splitting a chain into 'and'", LOGIC, "x-1<2x<x+3", "x>-1 and x<3", "valid-equivalence", "each part separately", pair="ine-h3")
t("splitting a chain into 'or'", LOGIC, "x-1<2x<x+3", "x>-1 or x<3", "valid-implication", "every real satisfies the disjunction", pair="ine-h3")
t("an empty chain", SSP, "5<x<2", "x>5", "valid-implication", "prev empty")

# =====================================================================================================
# I. Exponentials and logarithms
# =====================================================================================================
t("exponential with base > 1 preserves order", MONO, "2^x>8", "x>3", "valid-equivalence", "2^t increasing, 8=2^3", d="easy", pair="ine-i1")
t("exponential with base < 1 reverses order", MONO, "0.5^x<=0.25", "x>=2", "valid-equivalence", "0.25=0.5^2, decreasing", pair="ine-i1")
t("base < 1 without reversing", MONO, "0.5^x<=0.25", "x<=2", "invalid", "x=0: 1<=0.25 false but 0<=2 true; x=3 lost", pair="ine-i1")
t("negative exponent reverses via base 1/e", MONO, "e^(-x)>2", "x<-ln(2)", "valid-equivalence", "-x>ln2", pair="ine-i2")
t("negative exponent sign slip", MONO, "e^(-x)>2", "x>-ln(2)", "invalid", "x=-1: e>2 true; -1>-0.69 false", pair="ine-i2")
t("natural log preserves order but needs positivity", MONO, "ln(x)<0", "0<x<1", "valid-equivalence", "ln increasing with ln(1)=0, domain x>0", pair="ine-i3")
t("ln(x)<0 written without the domain", MONO, "ln(x)<0", "x<1", "valid-implication", "next adds x<=0", pair="ine-i3")
t("decreasing log via a minus sign", MONO, "-log2(x)>3", "0<x<1/8", "valid-equivalence", "log2 x<-3", pair="ine-i4")
t("decreasing log reversed wrongly", MONO, "-log2(x)>3", "x>1/8", "invalid", "x=1/16: 4>3 lost", pair="ine-i4")
t("log inequality with a shifted argument", MONO, "log10(x-1)<=1", "1<x<=11", "valid-equivalence", "0<x-1<=10", pair="ine-y6")
t("exponentiating a ln inequality", MONO, "ln(2x+1)>=0", "x>=0", "valid-equivalence", "2x+1>=1")
t("exponential always exceeds a negative number", SSP, "3^x>-1", "-oo<x<oo", "valid-equivalence", "3^x>0", pair="ine-y7")
t("taking logs of an exponential inequality", MONO, "2^x<5", "x<ln(5)/ln(2)", "valid-equivalence", "ln increasing")
t("dividing by ln of a base less than 1", SIGN, "0.5^x>3", "x<ln(3)/ln(0.5)", "valid-equivalence",
  "x ln0.5>ln3 with ln0.5<0 reverses", pair="ine-i5", composition=True)
t("dividing by ln(0.5) without reversing", SIGN, "0.5^x>3", "x>ln(3)/ln(0.5)", "invalid",
  "x=-2: 4>3 true; ln3/ln0.5 is about -1.58 and -2>-1.58 false", pair="ine-i5", composition=True)

# =====================================================================================================
# Insufficient information
# =====================================================================================================
t("dividing by a parameter of unknown sign", PARAM, "k x>6", "x>6/k", "insufficient-information", "valid only for k>0; reverses for k<0")
t("bare log in an inequality", "unambiguous reading of notation", "log(x)<1", "0<x<10", "insufficient-information",
  "base 10 gives (0,10), base e gives (0,e)")

# =====================================================================================================
# WORKINGS
# =====================================================================================================
w("linear inequality with a negative coefficient", SIGN, "4-3x>=10", ["-3x>=6", "x<=-2"], "valid-equivalence", "reverse on /(-3)", "x<=-2",
  d="easy", pair="ine-w1")
w("forgetting to reverse", SIGN, "4-3x>=10", ["-3x>=6", "x>=-2"], "invalid", "x=-3 lost", "x<=-2", d="easy", pair="ine-w1")
w("fractions in a linear inequality", SIGN, "(x+1)/2-(2x-1)/3<1", ["3(x+1)-2(2x-1)<6", "3x+3-4x+2<6", "-x<1", "x>-1"],
  "valid-equivalence", "multiply by 6", "x>-1", pair="ine-w2")
w("sign slip in the last step", SIGN, "(x+1)/2-(2x-1)/3<1", ["3(x+1)-2(2x-1)<6", "-x+5<6", "x<-1"], "invalid", "x=0 lost", "x>-1", pair="ine-w2")
w("quadratic via factor and sign chart", SSP, "x^2+2x-8<=0", ["(x+4)(x-2)<=0", "-4<=x<=2"], "valid-equivalence", "between and at the roots", "-4<=x<=2", pair="ine-w3")
w("quadratic with the outside region chosen", SSP, "x^2+2x-8<=0", ["(x+4)(x-2)<=0", "x<=-4 or x>=2"], "invalid", "x=0 lost", "-4<=x<=2", pair="ine-w3")
w("quadratic factored only", SSP, "x^2+2x-8<=0", ["(x+4)(x-2)<=0"], "incomplete", "no solution set stated", "-4<=x<=2", pair="ine-w3")
w("roots found but no region chosen", SSP, "x^2-9>0", ["(x-3)(x+3)>0", ("critical points x=3 and x=-3", None)], "incomplete",
  "lines true, set never stated", "x<-3 or x>3", pair="ine-w4")
w("x^2>9 solved fully", SSP, "x^2-9>0", ["(x-3)(x+3)>0", "x<-3 or x>3"], "valid-equivalence", "outside the roots", "x<-3 or x>3", pair="ine-w4")
w("x^2>9 with only the positive square root", SSP, "x^2-9>0", ["x^2>9", "x>3"], "invalid", "x=-4 lost", "x<-3 or x>3", pair="ine-w4")
w("dividing by x by cases", SCOPE, "x^2<2x",
  ["scope x>0 | x<2", "scope x<0 | x>2", ("no x satisfies x<0 and x>2", None), ("x=0 gives 0<0, false", None), "0<x<2"],
  "valid-equivalence", "case x>0: 0<x<2; case x<0: reversal gives x>2, empty", "0<x<2", c=4, pair="ine-w5")
w("dividing by x without cases", SIGN, "x^2<2x", ["x<2"], "invalid", "x=-1: 1<-2 false but next admits it; final set wrong", "0<x<2", pair="ine-w5")
w("dividing by x via factoring instead", SSP, "x^2<2x", ["x^2-2x<0", "x(x-2)<0", "0<x<2"], "valid-equivalence", "between the roots", "0<x<2", pair="ine-w5")
w("wrong reason for excluding negatives", REASON, "x^2<2x",
  ["x(x-2)<0", ("x cannot be negative because squares are positive", None), "0<x<2"], "wrong-reason",
  "x<0 is excluded because x(x-2)>0 there; the positivity of squares does not exclude negative x (x^2<2-x has x=-1)", "0<x<2")
w("rational inequality with a common denominator", EXCL, "(2x-1)/(x+3)>=1",
  [("x != -3", "restrict: x != -3"), "(2x-1)/(x+3)-1>=0", "(x-4)/(x+3)>=0", "x<-3 or x>=4"], "valid-equivalence", "x=-3 excluded, 4 included", "x<-3 or x>=4", c=3, pair="ine-w6", composition=True)
w("multiplying by x+3 as if positive", SIGN, "(2x-1)/(x+3)>=1", ["2x-1>=x+3", "x>=4"], "invalid", "x=-4: (-9)/(-1)=9>=1 lost", "x<-3 or x>=4", pair="ine-w6", composition=True)
w("including the pole", EXCL, "(2x-1)/(x+3)>=1", ["(x-4)/(x+3)>=0", "x<=-3 or x>=4"], "invalid", "x=-3 is not in the domain", "x<-3 or x>=4", pair="ine-w6", composition=True)
w("multiplying by the square of the denominator", EXCL, "(2x-1)/(x+3)>=1",
  [("x != -3", "restrict: x != -3"), "(2x-1)(x+3)>=(x+3)^2", "(x+3)(x-4)>=0", ("exclude x=-3", None), "x<-3 or x>=4"],
  "valid-implication", "multiplying by (x+3)^2 adds x=-3, which is then excluded", "x<-3 or x>=4", c=4, pair="ine-w6", composition=True)
w("quotient comparison via a common denominator", EXCL, "(x+1)/(x-1)>=(x-1)/(x+1)",
  [("x != 1, x != -1", "restrict: x != 1 and x != -1"), "(x+1)/(x-1)-(x-1)/(x+1)>=0", "((x+1)^2-(x-1)^2)/((x-1)(x+1))>=0", "4x/((x-1)(x+1))>=0", "-1<x<=0 or x>1"],
  "valid-equivalence", "sign chart of 4x/((x-1)(x+1)): + on (-1,0] and (1,oo)", "-1<x<=0 or x>1", c=4)
w("absolute-value inequality as a chain", LOGIC, "|3x+2|<=7", ["-7<=3x+2<=7", "-9<=3x<=5", "-3<=x<=5/3"], "valid-equivalence", "|A|<=c iff -c<=A<=c",
  "-3<=x<=5/3", d="easy", pair="ine-w7")
w("absolute-value inequality with 'or'", LOGIC, "|3x+2|<=7", ["3x+2<=-7 or 3x+2>=7", "x<=-3 or x>=5/3"], "invalid", "x=0 lost", "-3<=x<=5/3", pair="ine-w7")
w("absolute-value greater-than", LOGIC, "|x-5|>=2", ["x-5<=-2 or x-5>=2", "x<=3 or x>=7"], "valid-equivalence", "|A|>=c iff A<=-c or A>=c", "x<=3 or x>=7", d="easy", pair="ine-w8")
w("greater-than as a chain", LOGIC, "|x-5|>=2", ["-2>=x-5>=2", "3>=x>=7"], "invalid", "empty chain; x=0 lost", "x<=3 or x>=7", pair="ine-w8")
w("absolute value by cases", SCOPE, "|x-2|<3x-2",
  ["scope x>=2 | x-2<3x-2", "scope x>=2 | x>0", "scope x<2 | 2-x<3x-2", "scope x<2 | x>1", "x>1"],
  "valid-equivalence", "case 1 gives all x>=2, case 2 gives 1<x<2", "x>1", c=5, pair="ine-w9", composition=True)
w("absolute value case result not intersected with its scope", SCOPE, "|x-2|<3x-2",
  ["scope x>=2 | x>0", "scope x<2 | x>1", "x>0"], "invalid", "x=1/2: |-1.5|=1.5 < -0.5 false; the x>0 result ignored the case x>=2", "x>1", c=4, pair="ine-w9", composition=True)
w("two absolute values", SCOPE, "|x+1|>|x-3|", ["(x+1)^2>(x-3)^2", "8x>8", "x>1"], "valid-equivalence",
  "both sides nonnegative, squaring reversible", "x>1", pair="ine-y10")
w("square root inequality by cases", SCOPE, "sqrt(x+2)>x",
  ["scope -2<=x<0 | sqrt(x+2)>x", ("left side >= 0 > right side, all hold", None), "scope x>=0 | x+2>x^2", "scope x>=0 | 0<=x<2", "-2<=x<2"],
  "valid-equivalence", "negative right side: automatic in the domain; otherwise square", "-2<=x<2", c=5, pair="ine-w10", composition=True)
w("square root inequality squared without cases", MONO, "sqrt(x+2)>x", ["x+2>x^2", "(x-2)(x+1)<0", "-1<x<2"], "invalid",
  "x=-2 (0>-2) and x=-3/2 are lost", "-2<=x<2", pair="ine-w10", composition=True)
w("square root less than a linear term", MONO, "sqrt(x+4)<x-2",
  [("need x-2>0 and x+4>=0", None), "scope x>2 | x+4<(x-2)^2", "scope x>2 | x^2-5x>0", "scope x>2 | x>5", "x>5"],
  "valid-equivalence", "x>2 and x(x-5)>0 gives x>5", "x>5", c=4)
w("exponential with base 1/2", MONO, "(1/2)^(x-1)>=1/16", ["(1/2)^(x-1)>=(1/2)^4", "x-1<=4", "x<=5"], "valid-equivalence",
  "decreasing", "x<=5", pair="ine-w11")
w("exponential with base 1/2 not reversed", MONO, "(1/2)^(x-1)>=1/16", ["(1/2)^(x-1)>=(1/2)^4", "x-1>=4", "x>=5"], "invalid",
  "x=0 (2>=1/16) lost", "x<=5", pair="ine-w11")
w("reversal attributed to the wrong cause", REASON, "(1/2)^(x-1)>=1/16",
  ["(1/2)^(x-1)>=(1/2)^4", ("flip because 1/16 is less than 1", None), "x-1<=4", "x<=5"], "wrong-reason",
  "the flip is because the base 1/2 is less than 1; the size of 1/16 is irrelevant (2^x>=1/16 does not flip)", "x<=5", pair="ine-w11")
w("exponential quadratic inequality", MONO, "e^(2x)-3e^x+2<0", ["(e^x-1)(e^x-2)<0", "1<e^x<2", "0<x<ln(2)"], "valid-equivalence",
  "u between roots, ln increasing", "0<x<ln(2)", c=3, composition=True)
w("log inequality with the domain", MONO, "ln(x-2)<ln(6-x)", [("domain 2<x<6, so exclude anything outside it", None), "x-2<6-x", "x<4", "2<x<4"],
  "valid-equivalence", "ln increasing on the domain", "2<x<4", pair="ine-w12")
w("log inequality ignoring the domain", MONO, "ln(x-2)<ln(6-x)", ["x-2<6-x", "x<4"], "invalid", "x=0 is outside the domain", "2<x<4", pair="ine-w12")
w("log inequality with base below 1 via a minus", MONO, "-ln(x)>=1", ["ln(x)<=-1", "0<x<=e^(-1)"], "valid-equivalence", "ln increasing, domain x>0", "0<x<=e^(-1)", pair="ine-y11")
w("carried positivity condition", SCOPE, "x+4/x>=5",
  [("x>0 assumed throughout", None), "x^2+4>=5x", "(x-1)(x-4)>=0", "0<x<=1 or x>=4"],
  "valid-equivalence", "with the stated assumption x>0 multiplying by x is safe", "0<x<=1 or x>=4", assumptions=["x > 0"], c=3, pair="ine-w13", composition=True)
w("same clearing without the positivity assumption", SIGN, "x+4/x>=5",
  ["x^2+4>=5x", "(x-1)(x-4)>=0", "x<=1 or x>=4"], "invalid", "x=-1: -5>=5 false; negatives wrongly included", "0<x<=1 or x>=4", pair="ine-w13", composition=True)
w("chained inequality worked in steps", SSP, "-3<(2x+1)/3<=5", ["-9<2x+1<=15", "-10<2x<=14", "-5<x<=7"], "valid-equivalence", "multiply by 3, subtract 1, halve",
  "-5<x<=7", d="easy")
w("strictness lost at the boundary", BND, "x^2-4x+3<0", ["(x-1)(x-3)<0", "1<=x<=3"], "invalid", "x=1 gives 0<0 false", "1<x<3")
w("cubic sign chart", SSP, "x^3-4x>=0", ["x(x-2)(x+2)>=0", "-2<=x<=0 or x>=2"], "valid-equivalence", "sign chart - + - + across -2,0,2", "-2<=x<=0 or x>=2", c=3, pair="ine-w14")
w("cubic divided by x", SIGN, "x^3-4x>=0", ["x^2-4>=0", "x<=-2 or x>=2"], "invalid", "x=-1: -1+4=3>=0 lost; x=-3 wrongly included", "-2<=x<=0 or x>=2", pair="ine-w14")
w("parameter inequality", PARAM, "a x<3", ["x<3/a"], "insufficient-information", "needs a>0", "x<3/a for a>0")

# --- additional invalid transformations (balance)
t("moving a term across an inequality changes only its sign", SSP, "x^2+x<6", "x<6-x^2", "valid-equivalence",
  "moving x^2 across is an ordinary subtraction; both give -3<x<2", pair="ine-x1")
t("dropping a nonnegative term weakens a < inequality", MONO, "x^2+x<6", "x<6", "valid-implication", "x<6-x^2<=6, so prev (-3,2) lies in next; next adds e.g. x=-4 (16-4=12, not <6)", pair="ine-x1")
t("squaring both sides of a negative-valued inequality", MONO, "-3<x", "9>x^2", "invalid", "x=4: -3<4 but 16<9 false")
t("strict becomes non-strict at an excluded point", EXCL, "1/(x-2)>0", "x>=2", "valid-implication", "next adds x=2 where 1/(x-2) is undefined")
t("absolute value bound split into one side only", LOGIC, "|x+1|>=4", "x>=3", "invalid", "x=-6: 5>=4 lost")
t("log of both sides with a base less than one", MONO, "3^(-x)<9", "x<-2", "invalid", "3^(-x)=(1/3)^x is decreasing; -x<2 gives x>-2. x=0: 1<9 true but 0<-2 false")
t("raising to a negative power reverses for positive sides", MONO, "x>2", "x^(-2)<1/4", "valid-implication", "x>2 gives 0<1/x^2<1/4; next also admits x<-2")
t("taking ln and applying the power rule narrows the domain", MONO, "x^2>1", "2ln(x)>0", "invalid", "x=-2: 4>1 but ln(-2) is undefined; x<-1 is lost")
t("chain multiplied by a variable", SIGN, "0<1/x<1", "0<1<x", "valid-equivalence", "0<1/x forces x>0, so multiplying by x keeps directions: x>1 in both", composition=True)
t("chain multiplied by x of unknown sign", SIGN, "-1<1/x<1", "-x<1<x", "invalid", "x=-2: -1<-1/2<1 true; 2<1 false", composition=True)

# --- invalid partners of earlier valid cases (minimal pairs)
t("multiplying by a negative fraction without reversing", SIGN, "-x/4>=2", "x>=-8", "invalid", "x=0: 0>=2 false yet 0>=-8; x=-9 (9/4>=2) is lost", d="easy", pair="ine-y1")
t("odd power: no sign split is needed", MONO, "x^3<-8", "-2<x<2", "invalid", "x=-3: -27<-8 true, lost; cubing is increasing so the set is x<-2", pair="ine-y2")
t("negative leading factor ignored in the sign chart", SSP, "(2-x)(x+1)>=0", "x<=-1 or x>=2", "invalid", "x=0: 2>=0 true, lost", pair="ine-y3")
t("|A|<B: keeping only one branch", SCOPE, "|x-1|<2x", "x-1<2x", "valid-implication", "next is x>-1, containing x>1/3 but adding e.g. 0 (1<0 false)", pair="ine-y4")
t("subtracting 3 but forgetting to reverse when negating", SIGN, "-1<3-x<5", "-4<x<2", "invalid", "x=3: -1<0<5 true; 3 is lost", pair="ine-y5")
t("dropping the domain of a log inequality", MONO, "log10(x-1)<=1", "x<=11", "valid-implication", "next adds x<=1 where the log is undefined", pair="ine-y6")
t("exponential compared with a negative: no log may be taken", MONO, "3^x>-1", "x>0", "invalid", "x=-1: 1/3>-1 true, lost", pair="ine-y7")
t("dividing by e^x with a reversal", SIGN, "x e^x<2e^x", "x>2", "invalid", "e^x>0 keeps the direction; x=0 is lost", pair="ine-y8")
t("reciprocal of a negative bound without the sign condition", MONO, "1/x<-1/2", "x>-2", "valid-implication", "next contains (-2,0) and adds positives", pair="ine-y9")
t("dropping absolute values on both sides", MONO, "|x+1|>|x-3|", "x+1>x-3", "valid-implication", "next is always true; prev is x>1", pair="ine-y10")
t("minus sign handled as a base change without reversal", MONO, "-ln(x)>=1", "x>=e^(-1)", "invalid", "x=0.1: -ln(0.1)=2.30>=1 true, lost; x=1 wrongly admitted", pair="ine-y11")
