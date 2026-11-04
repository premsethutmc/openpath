"""MUL -- Multivariable mathematics. Expected answers derived by hand; see each `why`."""
from schema import T, W

C = "MUL"
ID = "exact multivariable identity"
PD = "partial derivative: other letters are constants"


def E(principle, inv, prev, nxt, rel, why, **kw):
    kw.setdefault("domain", "algebra")
    return T(C, principle, inv, prev, nxt, "expression", rel, why=why, **kw)


def S(principle, inv, prev, nxt, rel, why, **kw):
    return T(C, principle, inv, prev, nxt, "statement", rel, why=why, **kw)


def SYS(principle, inv, stmt, lines, rel, why, answer, **kw):
    return W(C, principle, inv, {"type": "system", "statement": stmt}, lines, rel, why=why, answer=answer, **kw)


def D(principle, inv, f, var, lines, rel, why, answer, **kw):
    return W(C, principle, inv, {"type": "derivative", "f": f, "var": var}, lines, rel, why=why, answer=answer, **kw)


# ============================================================ 1. polynomial identities in two or more variables
E("square of a binomial has a cross term", ID, "(x+y)^2", "x^2+2x y+y^2", "valid-equivalence",
  "(x+y)(x+y)=x^2+xy+yx+y^2", pair="m-sq", difficulty="easy")
E("freshman's dream: squaring does not distribute over +", ID, "(x+y)^2", "x^2+y^2", "invalid",
  "x=y=1: 4 vs 2", pair="m-sq", difficulty="easy")
E("cube of a sum has mixed terms", ID, "(x+y)^3", "x^3+y^3", "invalid", "x=y=1: 8 vs 2", difficulty="easy")
E("even power is invariant under negating the base", ID, "(x-y)^2", "(y-x)^2", "valid-equivalence",
  "y-x=-(x-y) and (-u)^2=u^2", pair="m-swap-pow")
E("odd power changes sign when the base is negated", ID, "(x-y)^3", "(y-x)^3", "invalid",
  "(-u)^3=-u^3; x=1,y=0 gives 1 vs -1", pair="m-swap-pow")
E("absolute value of a difference is symmetric", "symmetry under swapping variables", "|x-y|", "|y-x|", "valid-equivalence",
  "|-u|=|u|")
E("difference of squares then the identity (x+y)^2-(x-y)^2=4xy", ID, "(x+y)^2-(x-y)^2", "4x y", "valid-equivalence",
  "(x^2+2xy+y^2)-(x^2-2xy+y^2)=4xy", pair="m-polar")
E("polarisation identity needs the factor 1/4", ID, "x y", "((x+y)^2-(x-y)^2)/2", "invalid",
  "right side equals 4xy/2=2xy; x=y=1 gives 1 vs 2", pair="m-polar")
E("polarisation identity", ID, "x y", "((x+y)^2-(x-y)^2)/4", "valid-equivalence", "4xy/4=xy", pair="m-polar")
E("parallelogram identity", ID, "(x+y)^2+(x-y)^2", "2(x^2+y^2)", "valid-equivalence", "cross terms cancel; 2x^2+2y^2",
  pair="m-par")
E("parallelogram identity: both squares are doubled", ID, "(x+y)^2+(x-y)^2", "2x^2+y^2", "invalid",
  "x=0,y=1: 2 vs 1", pair="m-par")
E("sum of cubes factorisation", ID, "x^3+y^3", "(x+y)(x^2-x y+y^2)", "valid-equivalence",
  "expand: x^3-x^2y+xy^2+x^2y-xy^2+y^3", pair="m-cubes", difficulty="easy")
E("sum of cubes: middle sign of the quadratic factor", ID, "x^3+y^3", "(x+y)(x^2+x y+y^2)", "invalid",
  "x=y=1: 2 vs 6", pair="m-cubes")
E("difference of cubes is not the cube of the difference", ID, "x^3-y^3", "(x-y)^3", "invalid",
  "x=1,y=-1: 2 vs 8", pair="m-cubes")
E("sum of cubes via the cube of the sum", ID, "x^3+y^3", "(x+y)^3-3x y(x+y)", "valid-equivalence",
  "(x+y)^3=x^3+y^3+3xy(x+y)", pair="m-cubes2", difficulty="medium")
E("sum of cubes via the cube of the sum: the correction term carries (x+y)", ID, "x^3+y^3", "(x+y)^3-3x y",
  "invalid", "x=y=1: 2 vs 5", pair="m-cubes2")
E("completing the square in one of two variables", ID, "x^2+x y+y^2", "(x+y/2)^2+3y^2/4", "valid-equivalence",
  "(x+y/2)^2=x^2+xy+y^2/4; add 3y^2/4", pair="m-cts", difficulty="medium", complexity=2)
E("completing the square: the remainder term", ID, "x^2+x y+y^2", "(x+y/2)^2+y^2/4", "invalid",
  "x=0,y=2: 4 vs 2", pair="m-cts", complexity=2)
E("perfect square in two variables", ID, "x^2+y^2-2x y", "(x-y)^2", "valid-equivalence", "standard square",
  pair="m-psq", difficulty="easy")
E("perfect square: sign of the cross term", ID, "x^2+y^2+2x y", "(x-y)^2", "invalid", "x=y=1: 4 vs 0",
  pair="m-psq", difficulty="easy")
E("Brahmagupta-Fibonacci two-square identity", ID, "(a^2+b^2)(c^2+d^2)", "(a c-b d)^2+(a d+b c)^2",
  "valid-equivalence", "cross terms -2abcd and +2abcd cancel", pair="m-brahma", difficulty="hard", complexity=3)
E("two-square identity: the cross terms must cancel", ID, "(a^2+b^2)(c^2+d^2)", "(a c+b d)^2+(a d+b c)^2",
  "invalid", "a=b=c=d=1: 4 vs 8", pair="m-brahma", difficulty="hard", complexity=3)
E("Sophie Germain identity", ID, "x^4+4y^4", "(x^2+2x y+2y^2)(x^2-2x y+2y^2)", "valid-equivalence",
  "(x^2+2y^2)^2-(2xy)^2 = x^4+4y^4", pair="m-germain", difficulty="hard", complexity=3)
E("x^4+4y^4 is not a perfect square", ID, "x^4+4y^4", "(x^2+2y^2)^2", "invalid", "differs by 4x^2y^2; x=y=1: 5 vs 9",
  pair="m-germain", difficulty="medium", complexity=2)
E("three-variable cubic identity", ID, "a^3+b^3+c^3-3a b c", "(a+b+c)(a^2+b^2+c^2-a b-b c-c a)",
  "valid-equivalence", "standard factorisation; expanding gives the left side", pair="m-abc", difficulty="hard", complexity=3)
E("three-variable cubic is not (a+b+c)^3", ID, "a^3+b^3+c^3-3a b c", "(a+b+c)^3", "invalid",
  "a=b=c=1: 0 vs 27", pair="m-abc", difficulty="medium", complexity=2)
E("sum of squared differences identity", ID, "x^2+y^2+z^2-x y-y z-z x", "((x-y)^2+(y-z)^2+(z-x)^2)/2",
  "valid-equivalence", "the three squares sum to 2(x^2+y^2+z^2)-2(xy+yz+zx)", pair="m-sqdiff", difficulty="hard", complexity=3)
E("sum of squared differences identity: factor 1/2", ID, "x^2+y^2+z^2-x y-y z-z x", "(x-y)^2+(y-z)^2+(z-x)^2",
  "invalid", "x=1,y=z=0: 1 vs 2", pair="m-sqdiff", complexity=3)
E("Pythagorean triple parametrisation", ID, "(x^2+y^2)^2", "(x^2-y^2)^2+(2x y)^2", "valid-equivalence",
  "(x^2-y^2)^2+4x^2y^2=(x^2+y^2)^2", pair="m-pyth", difficulty="medium", complexity=2)
E("Pythagorean parametrisation: the leg is 2xy", ID, "(x^2+y^2)^2", "(x^2-y^2)^2+(x y)^2", "invalid",
  "x=y=1: 4 vs 1", pair="m-pyth", complexity=2)
E("cyclic product identity in three variables", ID, "a^2(b-c)+b^2(c-a)+c^2(a-b)", "-(a-b)(b-c)(c-a)",
  "valid-equivalence", "both vanish when two variables coincide, same degree, a=0,b=1,c=2 gives -2 on both sides",
  pair="m-cyc", difficulty="hard", complexity=3)
E("cyclic product identity: overall sign", ID, "a^2(b-c)+b^2(c-a)+c^2(a-b)", "(a-b)(b-c)(c-a)", "invalid",
  "a=0,b=1,c=2: -2 vs 2", pair="m-cyc", difficulty="hard", complexity=3)
E("power of a product", ID, "(x y)^3", "x^3 y^3", "valid-equivalence", "(xy)^n=x^n y^n for integer n", difficulty="easy")
E("dividing a sum by a single term", ID, "(x+y)/z", "x/z+y/z", "valid-equivalence", "both defined iff z != 0",
  pair="m-split", difficulty="easy")
E("a fraction does not split over a sum in the denominator", ID, "x/(y+z)", "x/y+x/z", "invalid",
  "x=y=z=1: 1/2 vs 2", pair="m-split", difficulty="easy")
E("reciprocal of a sum is not the sum of reciprocals", ID, "1/(a+b)", "1/a+1/b", "invalid", "a=b=1: 1/2 vs 2",
  difficulty="easy")
E("cancelling terms (not factors) across a fraction", ID, "(x+y)/(x+z)", "y/z", "invalid", "x=y=1,z=2: 2/3 vs 1/2")
E("rearranging monomials keeps the polynomial", ID, "x^2 y+x y^2", "y^2 x+y x^2", "valid-equivalence",
  "commutativity", pair="m-comm", difficulty="easy")
E("a difference is anti-symmetric under swapping the roles of the variables", ID, "x^2 y-x y^2", "y^2 x-y x^2",
  "invalid", "right side is the negative; x=2,y=1: 2 vs -2", pair="m-comm", difficulty="easy")
E("cyclic reordering of a symmetric sum", "symmetry under permutation", "x y+y z+z x", "z x+x y+y z",
  "valid-equivalence", "same three terms", difficulty="easy")
E("square root of a sum of squares is not the sum", ID, "sqrt(x^2+y^2)", "x+y", "invalid", "x=y=1: sqrt 2 vs 2",
  difficulty="easy")
E("exponential of a sum", ID, "e^(x+y)", "e^x e^y", "valid-equivalence", "law of exponents, all reals", pair="m-exp")
E("power of a sum is not the sum of powers", ID, "2^(x+y)", "2^x+2^y", "invalid", "x=y=2: 16 vs 8",
  pair="m-exp")
E("exponential of a difference", ID, "e^x e^(-y)", "e^(x-y)", "valid-equivalence", "e^x/e^y=e^(x-y)", pair="m-exp")
E("power of a power multiplies exponents, not adds", ID, "(2^x)^y", "2^(x+y)", "invalid", "x=1,y=3: 8 vs 16")
E("addition formula for sine", ID, "sin(x+y)", "sin(x)cos(y)+cos(x)sin(y)", "valid-equivalence", "standard",
  pair="m-trig", domain="trigonometry")
E("sine is not additive", ID, "sin(x+y)", "sin(x)+sin(y)", "invalid", "x=y=pi/2: 0 vs 2", pair="m-trig",
  domain="trigonometry")
E("addition formula for cosine has a minus sign", ID, "cos(x+y)", "cos(x)cos(y)+sin(x)sin(y)", "invalid",
  "this is cos(x-y); x=y=pi/2: -1 vs 1", pair="m-trig", domain="trigonometry")
E("subtraction formula for cosine", ID, "cos(x-y)", "cos(x)cos(y)+sin(x)sin(y)", "valid-equivalence", "standard",
  pair="m-trig", domain="trigonometry")
E("product of absolute values", ID, "|x y|", "|x| |y|", "valid-equivalence", "|ab|=|a||b| for all reals")
E("sum of squares of absolute values", ID, "|a|^2+|b|^2", "a^2+b^2", "valid-equivalence", "|u|^2=u^2", difficulty="easy")
E("reorder factors of a product of powers", ID, "a^2 b^2", "(a b)^2", "valid-equivalence", "(ab)^2=a^2b^2", difficulty="easy")

# ============================================================ 2. domain of rational expressions in several variables
E("cancelling a common binomial factor in two variables", "natural-domain preservation in expression rewriting",
  "(x^2-y^2)/(x-y)", "x+y", "domain-violation", "equal where x != y; x+y is also defined on the line x=y",
  pair="m-cancel", difficulty="easy")
E("cancelling a monomial denominator", "natural-domain preservation in expression rewriting", "(x^2 y+x y^2)/(x y)",
  "x+y", "domain-violation", "left side requires x != 0 and y != 0; right side does not")
E("cancelling (x-y) after factoring the numerator", "natural-domain preservation in expression rewriting",
  "(x^3-x y^2)/(x-y)", "x(x+y)", "domain-violation", "x(x-y)(x+y)/(x-y); the line x=y is lost", complexity=2)
E("a quotient of opposites is -1 away from the zero set", "natural-domain preservation in expression rewriting",
  "(x-y)/(y-x)", "-1", "domain-violation", "equals -1 for x != y; undefined on x=y", pair="m-opp")
E("a quotient of opposites is -1, not 1", ID, "(x-y)/(y-x)", "1", "invalid", "x=1,y=0: -1 vs 1", pair="m-opp")
E("cancelling (x+y) after a difference of squares", "natural-domain preservation in expression rewriting",
  "(x^2-y^2)/(x+y)", "x-y", "domain-violation", "the line x=-y is excluded on the left only")
E("exp-log simplification requires positive arguments", "natural-domain preservation in expression rewriting",
  "e^(ln(x)+ln(y))", "x y", "domain-violation", "left defined only for x>0, y>0; xy is defined everywhere")
E("combining reciprocals over a common denominator keeps the domain", "natural-domain preservation in expression rewriting",
  "(a+b)/(a b)", "1/a+1/b", "valid-equivalence",
  "both defined exactly when a != 0 and b != 0 (ab != 0 iff a != 0 and b != 0), and values agree "
  "[oracle-dispute] the oracle compares the factored conditions {ab != 0, a != 0, b != 0} vs {a != 0, b != 0} syntactically and reports a domain change, but the sets are equal")

# ============================================================ 3. assumptions on several variables (a, b > 0)
P = ["a > 0", "b > 0"]
E("|a+b|=a+b when both are positive", "assumption-aware equivalence", "|a+b|", "a+b", "valid-equivalence",
  "a+b>0 under the assumptions", assumptions=P, pair="m-abs1")
E("|a|+|b| and |a+b| agree for positive a, b", "assumption-aware equivalence", "|a|+|b|", "|a+b|", "valid-equivalence",
  "both equal a+b when a,b>0", assumptions=P, pair="m-tri")
E("triangle inequality is strict in general", "assumption-aware equivalence", "|a|+|b|", "|a+b|", "invalid",
  "without assumptions a=1,b=-1: 2 vs 0", pair="m-tri")
E("|ab|=ab needs a sign assumption", "assumption-aware equivalence", "|a b|", "a b", "valid-equivalence",
  "ab>0 when a,b>0", assumptions=P, pair="m-absab")
E("|ab|=ab fails without assumptions", "assumption-aware equivalence", "|a b|", "a b", "invalid", "a=-1,b=1: 1 vs -1",
  pair="m-absab")
E("sqrt(4a^2)=2a for a > 0", "assumption-aware equivalence", "sqrt(4a^2)", "2a", "valid-equivalence",
  "sqrt(4a^2)=2|a|=2a", assumptions=["a > 0"], pair="m-sqrta")
E("sqrt(4a^2) is 2|a| in general", "assumption-aware equivalence", "sqrt(4a^2)", "2a", "invalid", "a=-1: 2 vs -2",
  pair="m-sqrta")
E("sqrt of a product of squares without sign assumptions", "assumption-aware equivalence", "sqrt(a^2 b^2)", "a b",
  "invalid", "a=-1,b=1: 1 vs -1")
E("|a|-|b| = a-b for positive a, b", "assumption-aware equivalence", "|a|-|b|", "a-b", "valid-equivalence",
  "|a|=a, |b|=b", assumptions=P, pair="m-absdiff")
E("|a|-|b| = a-b fails without assumptions", "assumption-aware equivalence", "|a|-|b|", "a-b", "invalid",
  "a=-1,b=0: 1 vs -1", pair="m-absdiff")
E("a|b|+b|a| = 2ab for positive a, b", "assumption-aware equivalence", "a|b|+b|a|", "2a b", "valid-equivalence",
  "each term is ab", assumptions=P, pair="m-mix", complexity=2)
E("|a|b - a|b| vanishes for positive a, b", "assumption-aware equivalence", "|a|b-a|b|", "0", "valid-equivalence",
  "ab-ab", assumptions=P, pair="m-mix0")
E("|a|b - a|b| does not vanish when the signs differ", "assumption-aware equivalence", "|a|b-a|b|", "0", "invalid",
  "a=-1,b=1: 1-(-1)=2", pair="m-mix0")
E("|a|^3 b = a^3|b| for positive a, b", "assumption-aware equivalence", "|a|^3 b", "a^3 |b|", "valid-equivalence",
  "both a^3 b", assumptions=P, pair="m-cubeabs")
E("|a|^3 b = a^3|b| fails for mixed signs", "assumption-aware equivalence", "|a|^3 b", "a^3 |b|", "invalid",
  "a=-1,b=1: 1 vs -1", pair="m-cubeabs")
E("removing absolute values then factoring", "assumption-aware equivalence", "a^2|b|-|a|b^2", "a b(a-b)",
  "valid-equivalence", "a^2 b - a b^2 = ab(a-b)", assumptions=P, pair="m-absfac", complexity=2, composition=True)
E("removing absolute values without the sign assumption", "assumption-aware equivalence", "a^2|b|-|a|b^2", "a b(a-b)",
  "invalid", "a=-1,b=1: left 1-1=0, right (-1)(1)(-2)=2", pair="m-absfac", complexity=2, composition=True)
E("squaring a sum of absolute values for positive a, b", "assumption-aware equivalence", "(|a|+|b|)^2", "a^2+2a b+b^2",
  "valid-equivalence", "(a+b)^2", assumptions=P, pair="m-abssq", composition=True)
E("squaring a sum of absolute values in general", "assumption-aware equivalence", "(|a|+|b|)^2", "a^2+2a b+b^2",
  "invalid", "a=1,b=-1: 4 vs 0", pair="m-abssq", composition=True)

# ============================================================ 4. homogeneity and symmetry
E("homogeneous degree 2: scaling pulls out t^2", "degree of homogeneity", "(t x)^2+(t x)(t y)", "t^2(x^2+x y)",
  "valid-equivalence", "each monomial has degree 2 in (x,y)", pair="m-hom2", complexity=2)
E("homogeneous degree 2: scaling does not pull out t", "degree of homogeneity", "(t x)^2+(t x)(t y)", "t(x^2+x y)",
  "invalid", "t=2,x=y=1: 8 vs 4", pair="m-hom2", complexity=2)
E("homogeneous degree 3 scaling", "degree of homogeneity", "(t x)^3-(t y)^3", "t^3(x^3-y^3)", "valid-equivalence",
  "degree 3 terms", complexity=2)
E("scaling by 2 of a cubic form", "degree of homogeneity", "(2x)^3+(2x)(2y)^2", "8(x^3+x y^2)", "valid-equivalence",
  "8x^3+8xy^2", pair="m-hom3", complexity=2)
E("scaling by 2 of a cubic form: factor 2^3 not 2^2", "degree of homogeneity", "(2x)^3+(2x)(2y)^2", "4(x^3+x y^2)",
  "invalid", "x=1,y=0: 8 vs 4", pair="m-hom3", complexity=2)
E("scaling inside a Euclidean norm gives |t|", "degree of homogeneity", "sqrt((t x)^2+(t y)^2)", "t sqrt(x^2+y^2)",
  "invalid", "t=-1,x=1,y=0: 1 vs -1", difficulty="hard", complexity=2)
E("Euler's relation for a homogeneous cubic", "degree of homogeneity", "x d/dx(x^2 y+x y^2)+y(x^2+2x y)",
  "3(x^2 y+x y^2)", "valid-equivalence", "x f_x + y f_y = 3f for f homogeneous of degree 3; f_y = x^2+2xy",
  pair="m-euler", difficulty="hard", complexity=3, composition=True)
E("Euler's relation: the multiplier is the degree", "degree of homogeneity", "x d/dx(x^2 y+x y^2)+y(x^2+2x y)",
  "2(x^2 y+x y^2)", "invalid", "the sum is 3f; x=y=1: 6 vs 4", pair="m-euler", difficulty="hard", complexity=3,
  composition=True)

# ============================================================ 5. partial derivatives as transitions (d/dx, y constant)
E("partial derivative of a product of powers", PD, "d/dx(x^2 y^2)", "2x y^2", "valid-equivalence",
  "y^2 is a constant factor", pair="m-pd1", domain="calculus", difficulty="easy")
E("partial derivative: y is not differentiated", PD, "d/dx(x^2 y^2)", "2x y^2+2x^2 y", "invalid",
  "the term 2x^2y treats y as depending on x; x=y=1: 2 vs 4", pair="m-pd1", domain="calculus")
E("partial derivative: keep the constant factor", PD, "d/dx(x^2 y^2)", "2x y", "invalid", "x=y=2: 16 vs 8",
  pair="m-pd1", domain="calculus")
E("chain rule inside a partial derivative", PD, "d/dx((x y+1)^3)", "3y(x y+1)^2", "valid-equivalence",
  "inner derivative w.r.t. x is y", pair="m-pd2", domain="calculus", complexity=2)
E("chain rule inside a partial derivative: inner factor y", PD, "d/dx((x y+1)^3)", "3(x y+1)^2", "invalid",
  "missing inner factor y; x=1,y=2: 54 vs 27", pair="m-pd2", domain="calculus", complexity=2)
E("partial derivative of an exponential of a product", PD, "d/dx(e^(x y))", "y e^(x y)", "valid-equivalence",
  "inner derivative is y", pair="m-pd3", domain="calculus")
E("partial derivative of e^(xy): wrong inner variable", PD, "d/dx(e^(x y))", "x e^(x y)", "invalid",
  "x e^(xy) is the y-derivative; x=1,y=2: 2e^2 vs e^2", pair="m-pd3", domain="calculus")
E("pure-y terms vanish under d/dx", PD, "d/dx(x^3 y-4y^2)", "3x^2 y", "valid-equivalence",
  "-4y^2 is constant in x", pair="m-pd4", domain="calculus")
E("pure-y terms vanish under d/dx, not differentiate", PD, "d/dx(x^3 y-4y^2)", "3x^2 y-8y", "invalid",
  "x=0,y=1: 0 vs -8", pair="m-pd4", domain="calculus")
E("separable product: other factor constant", PD, "d/dx(sin(x) cos(y))", "cos(x) cos(y)", "valid-equivalence",
  "cos(y) is constant", pair="m-pd5", domain="calculus")
E("separable product: no product-rule term in y", PD, "d/dx(sin(x) cos(y))", "cos(x) cos(y)-sin(x) sin(y)", "invalid",
  "x=y=pi/2: 0 vs -1", pair="m-pd5", domain="calculus")
E("partial derivative of (xy)^2", PD, "d/dx((x y)^2)", "2x y^2", "valid-equivalence", "(xy)^2=x^2y^2",
  pair="m-pd6", domain="calculus")
E("partial derivative of (xy)^2: chain factor y", PD, "d/dx((x y)^2)", "2x y", "invalid", "x=1,y=2: 8 vs 4",
  pair="m-pd6", domain="calculus")
E("product rule with a chain factor in two variables", PD, "d/dx(x^2 cos(x y))", "2x cos(x y)-x^2 y sin(x y)",
  "valid-equivalence", "(x^2)' cos(xy) + x^2 (-sin(xy)) y", pair="m-pd7", domain="calculus", difficulty="hard", complexity=3,
  composition=True)
E("product rule with a chain factor: inner derivative y omitted", PD, "d/dx(x^2 cos(x y))", "2x cos(x y)-x^2 sin(x y)",
  "invalid", "x=1,y=pi/2: -pi/2 vs -1", pair="m-pd7", domain="calculus", difficulty="hard", complexity=3, composition=True)
E("partial derivative of (x+y)^2", PD, "d/dx((x+y)^2)", "2(x+y)", "valid-equivalence", "inner derivative 1",
  pair="m-pd8", domain="calculus", difficulty="easy")
E("partial derivative of (x+y)^2: y does not move with x", PD, "d/dx((x+y)^2)", "2(x+y)+2(x+y)", "invalid",
  "doubling assumes dy/dx=1; x=y=1: 4 vs 8", pair="m-pd8", domain="calculus")
E("partial derivative of sin(xy)", PD, "d/dx(sin(x y))", "y cos(x y)", "valid-equivalence", "chain rule",
  pair="m-pd9", domain="calculus")
E("partial derivative of sin(xy): inner factor", PD, "d/dx(sin(x y))", "cos(x y)", "invalid",
  "x=0,y=2: 2 vs 1", pair="m-pd9", domain="calculus")
E("partial derivative of y/x keeps y", PD, "d/dx(y/x)", "-1/x^2", "invalid", "correct is -y/x^2; x=1,y=2: -2 vs -1",
  domain="calculus")
E("second partial derivative in x", PD, "d/dx(d/dx(x^3 y^2))", "6x y^2", "valid-equivalence",
  "3x^2y^2 then 6xy^2", domain="calculus", complexity=2)

# ============================================================ 6. partial derivatives as workings
D("power rule with a constant coefficient y^3", PD, "x^2 y^3+sin(x)", "x", ["f_x = 2x y^3 + cos(x)"],
  "valid-equivalence", "y^3 constant", "2xy^3+cos(x)", oracle_lines=["final: 2x y^3 + cos(x)"], difficulty="easy")
D("partial derivative in y of x^2 y^3", PD, "x^2 y^3", "y", ["f_y = 3x^2 y^2"], "valid-equivalence",
  "x^2 constant", "3x^2y^2", oracle_lines=["final: 3x^2 y^2"], difficulty="easy")
D("partial in x: linear term 3x contributes 3", PD, "x^2 y+3x", "x", ["f_x = 2x y + 3"], "valid-equivalence",
  "derivative of 3x is 3", "2xy+3", oracle_lines=["final: 2x y + 3"], pair="m-wpd1", difficulty="easy")
D("partial in x: linear term 3x is not constant", PD, "x^2 y+3x", "x", ["f_x = 2x y"], "invalid",
  "3x was dropped as if constant", "2xy+3", oracle_lines=["final: 2x y"], pair="m-wpd1", difficulty="easy")
D("partial in y: 2y contributes 2", PD, "x^3 y+2y", "y", ["f_y = x^3 + 2"], "valid-equivalence",
  "both terms are linear in y", "x^3+2", oracle_lines=["final: x^3 + 2"], pair="m-wpd2")
D("partial in y: dropping a y-term", PD, "x^3 y+2y", "y", ["f_y = x^3"], "invalid", "2y differentiates to 2",
  "x^3+2", oracle_lines=["final: x^3"], pair="m-wpd2")
D("partial in x of x y^2 + x^3", PD, "x y^2+x^3", "x", ["f_x = y^2 + 3x^2"], "valid-equivalence",
  "power rule", "y^2+3x^2", oracle_lines=["final: y^2 + 3x^2"], pair="m-wpd3")
D("partial in x: exponent slip", PD, "x y^2+x^3", "x", ["f_x = y^2 + 3x"], "invalid", "d/dx x^3 = 3x^2, not 3x",
  "y^2+3x^2", oracle_lines=["final: y^2 + 3x"], pair="m-wpd3")
D("partial in y: x-terms are constant", PD, "y^2+5x", "y", ["f_y = 2y"], "valid-equivalence", "5x is constant in y",
  "2y", oracle_lines=["final: 2y"], pair="m-wpd4", difficulty="easy")
D("partial in y: differentiating an x-term", PD, "y^2+5x", "y", ["f_y = 2y + 5"], "invalid",
  "5x is constant with respect to y", "2y", oracle_lines=["final: 2y + 5"], pair="m-wpd4", difficulty="easy")
D("partial in y of x^2 y + y^3", PD, "x^2 y+y^3", "y", ["f_y = x^2 + 3y^2"], "valid-equivalence", "term by term",
  "x^2+3y^2", oracle_lines=["final: x^2 + 3y^2"], pair="m-wpd5")
D("partial in y: power slip on y^3", PD, "x^2 y+y^3", "y", ["f_y = x^2 + 3y"], "invalid", "d/dy y^3 = 3y^2",
  "x^2+3y^2", oracle_lines=["final: x^2 + 3y"], pair="m-wpd5")
D("chain rule in y with the inner factor 2", PD, "x^2+(2y+1)^3", "y", ["f_y = 3(2y+1)^2 * 2", "= 6(2y+1)^2"],
  "valid-equivalence", "inner derivative of 2y+1 is 2", "6(2y+1)^2", oracle_lines=[None, "final: 6(2y+1)^2"],
  pair="m-wpd6", complexity=2)
D("chain rule in y: inner factor omitted", PD, "x^2+(2y+1)^3", "y", ["f_y = 3(2y+1)^2"], "invalid",
  "missing factor 2", "6(2y+1)^2", oracle_lines=["final: 3(2y+1)^2"], pair="m-wpd6", complexity=2)
D("partial in x via product rule with exponential", PD, "x e^(x y)", "x",
  ["product rule: f_x = 1*e^(x y) + x*d/dx(e^(x y))", "d/dx(e^(x y)) = y e^(x y)", "f_x = e^(x y) + x y e^(x y)"],
  "valid-equivalence", "u=x, v=e^(xy), v_x = y e^(xy)", "e^(xy)(1+xy)",
  oracle_lines=[None, "claim: d/dx(e^(x y)) = y e^(x y)", "final: e^(x y)+x y e^(x y)"], pair="m-wpd7",
  difficulty="hard", complexity=3, composition=True)
D("partial in x via product rule: product-rule term dropped", PD, "x e^(x y)", "x",
  ["d/dx(e^(x y)) = y e^(x y)", "f_x = x y e^(x y)"],
  "invalid", "the u'v term 1*e^(xy) of the product rule is dropped; at x=0 the derivative is 1, not 0", "e^(xy)(1+xy)",
  oracle_lines=["claim: d/dx(e^(x y)) = y e^(x y)", "final: x y e^(x y)"], pair="m-wpd7",
  difficulty="hard", complexity=3, composition=True)
D("partial in x of y ln(x)", PD, "y ln(x)", "x", ["f_x = y/x"], "valid-equivalence", "y constant", "y/x",
  oracle_lines=["final: y/x"])
D("partial in x of y/x", PD, "y/x", "x", ["f = y x^(-1)", "f_x = -y x^(-2) = -y/x^2"], "valid-equivalence",
  "power rule with constant y", "-y/x^2", oracle_lines=[None, "final: -y/x^2"], complexity=2)
D("partial in y of cos(xy)", PD, "cos(x y)", "y", ["f_y = -sin(x y) * x"], "valid-equivalence", "inner derivative x",
  "-x sin(xy)", oracle_lines=["final: -x sin(x y)"])
D("partial in y of (x+y)^3", PD, "(x+y)^3", "y", ["f_y = 3(x+y)^2"], "valid-equivalence", "inner derivative 1",
  "3(x+y)^2", oracle_lines=["final: 3(x+y)^2"], difficulty="easy")
D("partial in y of sin(x)cos(y)", PD, "sin(x) cos(y)", "y", ["f_y = -sin(x) sin(y)"], "valid-equivalence",
  "sin(x) constant", "-sin(x)sin(y)", oracle_lines=["final: -sin(x) sin(y)"])
D("partial in y of e^(2x+3y)", PD, "e^(2x+3y)", "y", ["f_y = 3e^(2x+3y)"], "valid-equivalence", "inner derivative 3",
  "3e^(2x+3y)", oracle_lines=["final: 3e^(2x+3y)"])
D("partial in x with a square root of y as coefficient", PD, "x sqrt(y)+x^2", "x", ["f_x = sqrt(y) + 2x"],
  "valid-equivalence", "sqrt(y) constant", "sqrt(y)+2x", oracle_lines=["final: sqrt(y) + 2x"])
D("partial in x mixing e^x y and y^2 x", PD, "e^x y+y^2 x", "x", ["f_x = y e^x + y^2"], "valid-equivalence",
  "term by term", "ye^x+y^2", oracle_lines=["final: e^x y + y^2"])
D("partial in x with cos(y) as a coefficient", PD, "sin(x)+x cos(y)", "x", ["f_x = cos(x) + cos(y)"],
  "valid-equivalence", "d/dx (x cos y) = cos y", "cos(x)+cos(y)", oracle_lines=["final: cos(x) + cos(y)"])
D("partial in y with coefficient 3x^2", PD, "3x^2 y^2", "y", ["f_y = 6x^2 y"], "valid-equivalence", "3x^2 constant",
  "6x^2y", oracle_lines=["final: 6x^2 y"], difficulty="easy")
D("partial in y: x-terms vanish in a quadratic form", PD, "x^2+x y+y^2", "y", ["f_y = 0 + x + 2y"],
  "valid-equivalence", "d/dy x^2 = 0", "x+2y", oracle_lines=["final: x + 2y"], pair="m-wpd8")
D("partial in y: x^2 does not contribute but xy contributes x", PD, "x^2+x y+y^2", "y", ["f_y = x + y"], "invalid",
  "should be x+2y", "x+2y", oracle_lines=["final: x + y"], pair="m-wpd8")

# ============================================================ 7. linear (and simple nonlinear) systems
st1 = "2x+y=5, x-y=1"
SYS("elimination by adding equations", "solution of a linear system", st1,
    ["add the equations: 3x=6", "x=2", "from x-y=1: y=x-1=1", "x=2, y=1"], "valid-equivalence",
    "adding gives 3x=6; then y=1; check 4+1=5, 2-1=1", "x=2, y=1",
    oracle_lines=["3x=6", "x=2", "y=x-1", "x=2, y=1"], pair="m-sys1", difficulty="easy", complexity=2)
SYS("elimination: arithmetic slip when adding", "solution of a linear system", st1,
    ["add the equations: 3x=4", "x=4/3", "y=x-1=1/3", "x=4/3, y=1/3"], "invalid",
    "5+1=6, not 4; 3x=4 is false at the solution (2,1)", "x=2, y=1",
    oracle_lines=["3x=4", "x=4/3", "y=1/3", "x=4/3, y=1/3"], pair="m-sys1", difficulty="easy", complexity=2)
SYS("back-substitution slip", "solution of a linear system", st1,
    ["3x=6", "x=2", "2(2)+y=5", "y=9"], "invalid", "4+y=5 gives y=1, not 9", "x=2, y=1",
    pair="m-sys1", difficulty="easy", complexity=2)
SYS("elimination stopped after one variable", "completeness of a system solution", st1, ["3x=6", "x=2"], "incomplete",
    "y is never found", "x=2, y=1", pair="m-sys1", difficulty="easy")

st2 = "3x+2y=12, x-y=-1"
SYS("substitution method", "solution of a linear system", st2,
    ["x=y-1", "3(y-1)+2y=12", "5y-3=12", "y=3", "x=2"], "valid-equivalence",
    "y=3, x=2; check 6+6=12 and 2-3=-1", "x=2, y=3", pair="m-sys2", complexity=3)
SYS("substitution: distribution slip", "solution of a linear system", st2,
    ["x=y-1", "3y-1+2y=12", "5y=13", "y=13/5", "x=8/5"], "invalid", "3(y-1)=3y-3, not 3y-1", "x=2, y=3",
    pair="m-sys2", complexity=3)
SYS("substitution: sign slip isolating x", "solution of a linear system", st2,
    ["x=y+1", "3(y+1)+2y=12", "5y=9", "y=9/5", "x=14/5"], "invalid", "x-y=-1 gives x=y-1", "x=2, y=3",
    pair="m-sys2", complexity=3)

st3 = "4x-3y=6, 2x+5y=16"
SYS("elimination after scaling one equation", "solution of a linear system", st3,
    ["4x+10y=32", "13y=26", "y=2", "2x+10=16", "x=3"], "valid-equivalence",
    "double the second, subtract the first: 13y=26; x=3; check 12-6=6", "x=3, y=2", pair="m-sys3", complexity=3)
SYS("scaling only the left side of an equation", "solution of a linear system", st3,
    ["4x+10y=16", "13y=10", "y=10/13", "x=..."], "invalid", "doubling must also double 16; 4x+10y=16 is false at (3,2)",
    "x=3, y=2", oracle_lines=["4x+10y=16", "13y=10", "y=10/13", None], pair="m-sys3", complexity=3)
SYS("subtracting equations: sign slip on the y-terms", "solution of a linear system", st3,
    ["4x+10y=32", "7y=26", "y=26/7"], "invalid", "10y-(-3y)=13y, not 7y", "x=3, y=2", pair="m-sys3", complexity=3)

st4 = "x+y+z=6, 2x-y+z=3, x+2y-z=2"
SYS("three equations reduced by pairwise elimination", "solution of a linear system", st4,
    ["2x+3y=8", "3x+y=5", "y=5-3x", "2x+15-9x=8", "x=1", "y=2", "z=3"], "valid-equivalence",
    "eq1+eq3 and eq2+eq3 eliminate z; x=1,y=2,z=3 satisfies all three", "x=1, y=2, z=3", pair="m-sys4",
    difficulty="hard", complexity=4)
SYS("three equations: slip in the middle of the elimination", "solution of a linear system", st4,
    ["2x+3y=8", "3x+y=5", "y=5-3x", "2x+15-3x=8", "x=7", "y=-16", "z=15"], "invalid",
    "3(5-3x)=15-9x; the slip makes the line false at the solution", "x=1, y=2, z=3", pair="m-sys4",
    difficulty="hard", complexity=4)
SYS("three equations: last variable not found", "completeness of a system solution", st4,
    ["2x+3y=8", "3x+y=5", "y=5-3x", "2x+15-9x=8", "x=1", "y=2"], "incomplete", "z never stated", "x=1, y=2, z=3",
    pair="m-sys4", difficulty="hard", complexity=4)
SYS("three equations with two trivial ones", "solution of a linear system", "x+y+z=6, x-y=0, 2z=6",
    ["z=3", "x=y", "2x+3=6", "x=3/2, y=3/2, z=3"], "valid-equivalence", "z=3, x=y=3/2", "x=3/2, y=3/2, z=3",
    complexity=2)

st6 = "x/2+y/3=4, x-y=3"
SYS("clearing fractions in a system", "solution of a linear system", st6,
    ["3x+2y=24", "x=y+3", "3y+9+2y=24", "y=3", "x=6"], "valid-equivalence", "check 3+1=4 and 6-3=3", "x=6, y=3",
    pair="m-sys6", complexity=3)
SYS("clearing fractions: only one term multiplied", "solution of a linear system", st6,
    ["3x+2y=4", "x=y+3", "5y+9=4", "y=-1", "x=2"], "invalid", "the right side must also be multiplied by 6",
    "x=6, y=3", pair="m-sys6", complexity=3)

st9 = "2x+y=5, x-y=1"
SYS("Cramer's rule with determinant side computations", "solution of a linear system", st9,
    ["D = 2(-1)-1(1) = -3", "D_x = 5(-1)-1(1) = -6", "x = -6/(-3) = 2", "D_y = 2(1)-5(1) = -3", "y = -3/(-3) = 1"],
    "valid-equivalence", "determinants -3, -6, -3", "x=2, y=1",
    oracle_lines=["claim: 2(-1)-1(1) = -3", "claim: 5(-1)-1(1) = -6", "x=2", "claim: 2(1)-5(1) = -3", "y=1"],
    pair="m-cramer", difficulty="medium", complexity=3)
SYS("Cramer's rule: determinant miscomputed", "solution of a linear system", st9,
    ["D = 2(-1)-1(1) = -1", "D_x = 5(-1)-1(1) = -6", "x = 6", "D_y = 2(1)-5(1) = -3", "y = 3"],
    "invalid", "2(-1)-1 = -3, not -1", "x=2, y=1",
    oracle_lines=["claim: 2(-1)-1(1) = -1", "claim: 5(-1)-1(1) = -6", "x=6", "claim: 2(1)-5(1) = -3", "y=3"],
    pair="m-cramer", complexity=3)
SYS("verifying a system solution by substitution", "solution of a linear system", "3x-y=7, x+2y=7",
    ["x=3, y=2", "check: 3(3)-2 = 7", "check: 3+2(2) = 7"], "valid-equivalence", "both checks hold", "x=3, y=2",
    oracle_lines=["x=3, y=2", "claim: 3(3)-2 = 7", "claim: 3+2(2) = 7"], pair="m-check")
SYS("a check with false arithmetic", "solution of a linear system", "3x-y=7, x+2y=7",
    ["x=3, y=2", "check: 3(3)-2 = 7", "check: 3+2(2) = 8"], "invalid", "3+4=7, the stated check is false", "x=3, y=2",
    oracle_lines=["x=3, y=2", "claim: 3(3)-2 = 7", "claim: 3+2(2) = 8"], pair="m-check")
SYS("tangent line meets a parabola once", "solution of a nonlinear system", "y=x^2, y=2x-1",
    ["x^2=2x-1", "(x-1)^2=0", "x=1", "y=1"], "valid-equivalence", "double root x=1", "x=1, y=1", complexity=3)
SYS("two parabolas touching at the origin", "solution of a nonlinear system", "y=x^2, y=-x^2",
    ["x^2=-x^2", "2x^2=0", "x=0", "y=0"], "valid-equivalence", "only x=0", "x=0, y=0", complexity=2)
SYS("dividing an equation by a variable loses a solution", "solution-set preservation in systems", "x y=2x, x+y=3",
    ["y=2", "x=1", "x=1 and y=2"], "invalid", "dividing by x loses x=0, y=3, which satisfies both equations",
    "x=0, y=3 or x=1, y=2", pair="m-divx", complexity=3)
SYS("factoring instead of dividing keeps both solutions", "solution-set preservation in systems", "x y=2x, x+y=3",
    ["x(y-2)=0", "x=0 or y=2", "x=0, y=3 or x=1, y=2"], "valid-equivalence",
    "x=0 gives y=3; y=2 gives x=1; both pairs satisfy both equations "
    "[oracle-dispute] the oracle's completeness test only recognises a single 'and' list of pinned values, not a disjunction of solution pairs, so it reports incomplete",
    "x=0, y=3 or x=1, y=2", pair="m-divx", complexity=3)

# systems the oracle cannot certify (infinitely many / no / parameter-dependent solutions) -> policy relations
SYS("dependent system has infinitely many solutions", "solution-set description of a dependent system", "x+y=2, 2x+2y=4",
    ["the second equation is twice the first", "y=2-x, x any real"], "unsupported", truth="valid",
    why="the equations are proportional, so the solution set is the line y=2-x; the oracle only certifies finite solution sets",
    answer="y=2-x (x any real)", oracle_lines=[None, None], pair="m-dep")
SYS("dependent system: one point is not the solution set", "solution-set description of a dependent system",
    "x+y=2, 2x+2y=4", ["2x+2y=4 so x+y=2", "x=1, y=1"], "unsupported", truth="invalid",
    why="(1,1) is one of infinitely many solutions; presenting it as the solution over-claims uniqueness; not oracle-certifiable",
    answer="y=2-x (x any real)", oracle_lines=[None, "x=1, y=1"], pair="m-dep")
SYS("inconsistent system has no solution", "solution-set description of an inconsistent system", "x+y=2, x+y=5",
    ["subtracting: 0=3", "contradiction, so no solution"], "unsupported", truth="valid",
    why="parallel lines; 0=3 is impossible; the oracle cannot certify an empty system solution", answer="no solution",
    oracle_lines=[None, None], pair="m-incons")
SYS("inconsistent system: a 'solution' from an arithmetic slip", "solution-set description of an inconsistent system",
    "x+y=2, x+y=5", ["subtracting: 0=3", "so x=3, y=-1"], "unsupported", truth="invalid",
    why="x=3,y=-1 satisfies the first equation only (3-1=2 but not 5); there is no solution", answer="no solution",
    oracle_lines=[None, None], pair="m-incons")
SYS("parameter system: the answer needs a != -1", "parameter condition in a system", "a x+y=1, x-y=0",
    ["y=x", "a x+x=1", "x=1/(a+1), y=1/(a+1)"], "insufficient-information",
    why="dividing by a+1 requires a != -1; for a=-1 the system has no solution", answer="x=y=1/(a+1) for a != -1",
    oracle_lines=[None, None, None], pair="m-param")

# ============================================================ 8. factoring in two variables (workings)
F = lambda start, lines, rel, why, answer, **kw: W(C, kw.pop("principle"), "complete factorisation in two variables",
                                                  {"type": "factor", "start": start}, lines, rel, why=why, answer=answer, **kw)
F("x^2-y^2", ["(x-y)(x+y)"], "valid-equivalence", "difference of squares", "(x-y)(x+y)",
  principle="difference of squares in two variables", difficulty="easy")
F("6x^2-x y-2y^2", ["(3x-2y)(2x+y)"], "valid-equivalence", "6x^2+3xy-4xy-2y^2", "(3x-2y)(2x+y)",
  principle="factoring a two-variable quadratic form", pair="m-fq", complexity=2)
F("6x^2-x y-2y^2", ["(3x+2y)(2x-y)"], "invalid", "expands to 6x^2+xy-2y^2: the cross term has the wrong sign",
  "(3x-2y)(2x+y)", principle="factoring a two-variable quadratic form", pair="m-fq", complexity=2)
F("a x+a y+b x+b y", ["a(x+y)+b(x+y)", "(a+b)(x+y)"], "valid-equivalence", "grouping", "(a+b)(x+y)",
  principle="factoring by grouping in four variables", complexity=2)
F("x^3-8y^3", ["(x-2y)(x^2+2x y+4y^2)"], "valid-equivalence", "a^3-b^3 with a=x, b=2y", "(x-2y)(x^2+2xy+4y^2)",
  principle="difference of cubes with a coefficient", pair="m-fc", complexity=2)
F("x^3-8y^3", ["(x-2y)(x^2+4x y+4y^2)"], "invalid", "the middle term is ab=2xy; the quadratic used is (x+2y)^2",
  "(x-2y)(x^2+2xy+4y^2)", principle="difference of cubes with a coefficient", pair="m-fc", complexity=2)
F("x^2+2x y+y^2-4", ["(x+y)^2-4", "(x+y-2)(x+y+2)"], "valid-equivalence", "perfect square then difference of squares",
  "(x+y-2)(x+y+2)", principle="perfect square followed by difference of squares", composition=True, complexity=3,
  difficulty="hard")
F("x^4-y^4", ["(x^2-y^2)(x^2+y^2)"], "incomplete", "x^2-y^2 still factors as (x-y)(x+y)", "(x-y)(x+y)(x^2+y^2)",
  principle="repeated difference of squares")
F("x^2-x y", ["x(x-y)"], "valid-equivalence", "common factor x", "x(x-y)", principle="common monomial factor",
  difficulty="easy")
F("x^2 y-x y^2", ["x y(x-y)"], "valid-equivalence",
  "xy(x-y) is a product of irreducible factors x, y, x-y",
  "xy(x-y)", principle="common monomial factor in two variables")
F("x^2+y^2", ["(x+y)(x+y)"], "invalid", "(x+y)^2 has the extra term 2xy; x^2+y^2 is irreducible over the reals",
  "x^2+y^2 (irreducible)", principle="sum of squares does not factor over the reals", difficulty="easy")

# simplification workings with restrictions in two variables
W(C, "cancelling (x-y) with the restriction stated", "assumption-aware simplification", {"type": "simplify", "start": "(x^2-y^2)/(x-y)"},
  ["x != y", "(x-y)(x+y)/(x-y)", "x+y"], "valid-equivalence", why="cancellation is valid off the line x=y, which is stated",
  answer="x+y (x != y)", oracle_lines=["restrict: x != y", "(x-y)(x+y)/(x-y)", "x+y"], pair="m-simp")
W(C, "cancelling (x-y) without stating the restriction", "assumption-aware simplification",
  {"type": "simplify", "start": "(x^2-y^2)/(x-y)"}, ["(x-y)(x+y)/(x-y)", "x+y"], "domain-violation",
  why="x+y is defined on x=y where the original is not; the restriction is never stated", answer="x+y (x != y)", pair="m-simp")
W(C, "expanding a two-variable product", "identity chain", {"type": "expand", "start": "(x+y)^2-(x-y)^2"},
  ["x^2+2x y+y^2-(x^2-2x y+y^2)", "4x y"], "valid-equivalence", why="cross terms survive, squares cancel", answer="4xy",
  pair="m-expd", complexity=2)
W(C, "expanding a two-variable product: sign slip in the subtraction", "identity chain", {"type": "expand", "start": "(x+y)^2-(x-y)^2"},
  ["x^2+2x y+y^2-x^2-2x y+y^2", "2y^2"], "invalid", why="-(x^2-2xy+y^2) = -x^2+2xy-y^2", answer="4xy",
  pair="m-expd", complexity=2)
W(C, "expanding (2x-3y)^2", "identity chain", {"type": "expand", "start": "(2x-3y)^2"}, ["4x^2-12x y+9y^2"],
  "valid-equivalence", why="(a-b)^2 with a=2x, b=3y", answer="4x^2-12xy+9y^2", difficulty="easy")
W(C, "expanding (a-b)(a^2+ab+b^2)", "identity chain", {"type": "expand", "start": "(a-b)(a^2+a b+b^2)"}, ["a^3-b^3"],
  "valid-equivalence", why="telescoping cross terms", answer="a^3-b^3")

# ============================================================ 9. rearranging formulas for a variable
S("isolating x in a linear equation in two variables", "solution-set preservation (constant multiple)", "2x+3y=12",
  "x=6-3y/2", "valid-equivalence", "subtract 3y and divide by the nonzero constant 2", pair="m-rear1", difficulty="easy")
S("isolating y in a linear equation in two variables", "solution-set preservation (constant multiple)", "2x+3y=12",
  "y=4-2x/3", "valid-equivalence", "divide by 3", pair="m-rear1", difficulty="easy")
S("isolating y: forgetting to divide one term", "solution-set preservation", "2x+3y=12", "y=4-2x", "invalid",
  "x=3,y=2 satisfies the first (6+6=12) but not y=4-2x (gives -2); the oracle only certifies constant-multiple equivalence "
  "between multi-variable equations, so this is uncertified", pair="m-rear1")
S("collecting x-terms before dividing", "solution-set preservation (constant multiple)", "a x+b=c x+d", "x(a-c)=d-b",
  "valid-equivalence", "subtract cx and b; no division yet", pair="m-rear2", complexity=2)
S("dividing by (a-c) needs a != c", "parameter condition when dividing", "a x+b=c x+d", "x=(d-b)/(a-c)",
  "insufficient-information", "for a=c the equation is b=d (no or all solutions); the condition is unstated", pair="m-rear2",
  complexity=2)
S("solving v=u+at for t", "parameter condition when dividing", "v=u+a t", "t=(v-u)/a", "insufficient-information",
  "division by a requires a != 0", pair="m-rear3")
S("first step of solving v=u+at for t", "solution-set preservation (constant multiple)", "v=u+a t", "v-u=a t",
  "valid-equivalence", "subtract u", pair="m-rear3", difficulty="easy")
S("ideal gas law solved for T", "parameter condition when dividing", "P V=n R T", "T=P V/(n R)", "insufficient-information",
  "requires n R != 0")
S("slope-intercept form solved for x", "parameter condition when dividing", "y=m x+c", "x=(y-c)/m",
  "insufficient-information", "requires m != 0 (a horizontal line cannot be solved for x)")
S("trapezium area: clearing the fraction", "solution-set preservation (constant multiple)", "A=h(a+b)/2", "2A=h(a+b)",
  "valid-equivalence", "multiply by 2")
S("cancelling a parameter on both sides", "parameter condition when dividing", "a x=a y", "x=y", "insufficient-information",
  "if a=0 every (x,y) works; dividing by a needs a != 0")
S("perimeter solved for w", "solution-set preservation (constant multiple)", "P=2l+2w", "w=(P-2l)/2", "valid-equivalence",
  "subtract 2l, divide by 2", difficulty="easy")
S("lens formula solved for f", "natural-domain bookkeeping in several variables", "1/f=1/u+1/v", "f=u v/(u+v)",
  "valid-equivalence",
  "on the natural domain (u,v,f != 0) 1/f=(u+v)/(uv) forces u+v != 0, so f=uv/(u+v); conversely f=uv/(u+v) with u,v,f != 0 "
  "gives 1/f=1/u+1/v. Uncertified: the oracle cannot compare multi-variable solution sets beyond constant multiples",
  difficulty="hard", complexity=3)
S("solving a x=3a with a > 0 stated", "assumption-aware division", "a x=3a", "x=3", "valid-equivalence",
  "a>0 so a != 0 and division is reversible. Uncertified: the oracle reads multi-variable statements only up to constant multiples",
  assumptions=["a > 0"], pair="m-ax")
S("solving a x=3a with no condition on a", "parameter condition when dividing", "a x=3a", "x=3", "insufficient-information",
  "if a=0 every x works", pair="m-ax")
