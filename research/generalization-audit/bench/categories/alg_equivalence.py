"""ALG: Algebraic equivalence and transformations.
Every label is derived by hand (expansion / counterexample / domain comparison); see each `why`."""
from schema import T, W

C = "ALG"
DX = (" [oracle-dispute] oracle._form parses the final line with evaluate(False), so a polynomial of three or more terms is a"
      " nested Add and is always reported 'not expanded', although the line is fully expanded")
DF = (" [oracle-dispute] oracle._form sees a product of three or more factors as a nested Mul and reports the inner"
      " sub-product as a 'reducible factor', although every factor is irreducible over the reals")


def E(principle, invariant, prev, nxt, rel, why, d="medium", c=1, **k):
    """expression transition"""
    return T(C, principle, invariant, prev, nxt, "expression", rel, why=why, difficulty=d, complexity=c, **k)


# ============================================================ expansion: special products
SQ = "expansion of a binomial square"
E(SQ, "identity preservation under expansion", "(x+3)^2", "x^2+6x+9", "valid-equivalence",
  "(x+3)(x+3)=x^2+3x+3x+9", d="easy", pair="alg-sq1")
E("a power does not distribute over a sum", "identity preservation under expansion", "(x+3)^2", "x^2+9", "invalid",
  "x=1: 16 vs 10; the cross term 6x is missing", d="easy", pair="alg-sq1")
E(SQ, "sign handling in expansion", "(x-5)^2", "x^2-10x+25", "valid-equivalence", "(x-5)(x-5)=x^2-10x+25", d="easy", pair="alg-sq2")
E("sign of the constant term in a squared difference", "sign handling in expansion", "(x-5)^2", "x^2-10x-25", "invalid",
  "x=0: 25 vs -25; (-5)^2=+25", d="easy", pair="alg-sq2")
E("difference of two squares", "identity preservation under expansion", "(2x-3)(2x+3)", "4x^2-9", "valid-equivalence",
  "(2x)^2-3^2", d="easy", pair="alg-dos")
E("the coefficient must be squared too", "identity preservation under expansion", "(2x-3)(2x+3)", "2x^2-9", "invalid",
  "x=1: -5 vs -7; (2x)^2=4x^2", d="easy", pair="alg-dos")
E("binomial cube", "identity preservation under expansion", "(x+1)^3", "x^3+3x^2+3x+1", "valid-equivalence",
  "binomial coefficients 1,3,3,1", pair="alg-cube")
E("a power does not distribute over a sum (cube)", "identity preservation under expansion", "(x+1)^3", "x^3+1", "invalid",
  "x=1: 8 vs 2", pair="alg-cube")
E("cube of a difference", "sign handling in expansion", "(x-2)^3", "x^3-6x^2+12x-8", "valid-equivalence",
  "x^3-3*2x^2+3*4x-8", pair="alg-cube2")
E("alternating signs in the cube of a difference", "sign handling in expansion", "(x-2)^3", "x^3-6x^2+12x+8", "invalid",
  "x=0: -8 vs 8; (-2)^3=-8", pair="alg-cube2")
E("square of a trinomial", "identity preservation under expansion", "(x^2+x+1)^2", "x^4+2x^3+3x^2+2x+1", "valid-equivalence",
  "squares x^4+x^2+1 plus cross terms 2x^3+2x^2+2x", d="medium", c=2, pair="alg-tri")
E("square of a trinomial needs all cross terms", "identity preservation under expansion", "(x^2+x+1)^2", "x^4+x^2+1", "invalid",
  "x=1: 9 vs 3; cross terms 2x^3+2x^2+2x dropped", c=2, pair="alg-tri")
E("factor times the 'almost-square' gives a difference of cubes", "identity preservation under expansion", "(x-1)(x^2+x+1)", "x^3-1",
  "valid-equivalence", "telescoping: x^3+x^2+x-x^2-x-1", c=2)
E("negating a squared bracket", "sign of a leading minus", "-(x-4)^2", "-x^2+8x-16", "valid-equivalence",
  "-(x^2-8x+16)", pair="alg-negsq")
E("the minus applies to every term of the expansion", "sign of a leading minus", "-(x-4)^2", "-x^2+8x+16", "invalid",
  "x=0: -16 vs 16", pair="alg-negsq")
E("distributing a negative multiplier", "sign errors in distribution", "3-2(x-4)", "3-2x-8", "invalid",
  "-2*(-4)=+8 not -8; x=0: 11 vs -5", d="easy", pair="alg-dist")
E("distributing a negative multiplier", "sign errors in distribution", "3-2(x-4)", "11-2x", "valid-equivalence",
  "3-2x+8", d="easy", pair="alg-dist")
E("subtracting a bracket negates every term", "sign errors in distribution", "5-(x+2)", "5-x+2", "invalid", "x=0: 3 vs 7",
  d="easy", pair="alg-paren")
E("subtracting a bracket negates every term", "sign errors in distribution", "5-(x+2)", "3-x", "valid-equivalence", "5-x-2",
  d="easy", pair="alg-paren")
E("expanding a product of three factors", "identity preservation under expansion", "x(x-1)(x+1)", "x^3-x", "valid-equivalence",
  "x(x^2-1)", d="easy")
E("product of two different binomials", "identity preservation under expansion", "(3x-2)(x+4)", "3x^2+10x-8", "valid-equivalence",
  "3x^2+12x-2x-8", d="easy", pair="alg-foil")
E("FOIL: outer and inner terms both count", "identity preservation under expansion", "(3x-2)(x+4)", "3x^2-8", "invalid",
  "x=1: 5 vs -5; middle terms 12x-2x dropped", d="easy", pair="alg-foil")

# ============================================================ factorisation
E("factorising a monic quadratic", "identity preservation under factorisation", "x^2-x-6", "(x-3)(x+2)", "valid-equivalence",
  "(x-3)(x+2)=x^2-x-6", d="easy", pair="alg-fq")
E("signs of the factor pair must give the middle coefficient", "identity preservation under factorisation", "x^2-x-6", "(x+3)(x-2)",
  "invalid", "(x+3)(x-2)=x^2+x-6; x=0 agrees but x=1: -6 vs -4", d="easy", pair="alg-fq")
E("factorising a non-monic quadratic (ac method)", "identity preservation under factorisation", "6x^2+x-2", "(3x+2)(2x-1)",
  "valid-equivalence", "6x^2-3x+4x-2", pair="alg-fnm")
E("factor signs swapped give the wrong middle term", "identity preservation under factorisation", "6x^2+x-2", "(3x-2)(2x+1)",
  "invalid", "(3x-2)(2x+1)=6x^2-x-2; x=1: 5 vs 3", pair="alg-fnm")
E("difference of cubes", "identity preservation under factorisation", "x^3-8", "(x-2)(x^2+2x+4)", "valid-equivalence",
  "a^3-b^3=(a-b)(a^2+ab+b^2)", pair="alg-dcube")
E("difference of cubes: the quadratic factor has +ab", "identity preservation under factorisation", "x^3-8", "(x-2)(x^2-2x+4)",
  "invalid", "x=0: -8 vs -8 agree, x=1: -7 vs -3", pair="alg-dcube")
E("sum of cubes with a coefficient", "identity preservation under factorisation", "27x^3+1", "(3x+1)(9x^2-3x+1)",
  "valid-equivalence", "a=3x, b=1: (a+b)(a^2-ab+b^2)", c=2)
E("sum of cubes (two variables) has -xy", "identity preservation under factorisation", "x^3+y^3", "(x+y)(x^2+xy+y^2)", "invalid",
  "x=y=1: 2 vs 6", c=2, domain="algebra")
E("factorising by grouping", "identity preservation under factorisation", "x^3+x^2-4x-4", "(x+1)(x-2)(x+2)", "valid-equivalence",
  "x^2(x+1)-4(x+1)=(x+1)(x^2-4)", c=2)
E("factorising by grouping (two variables)", "identity preservation under factorisation", "xy+3x+2y+6", "(x+2)(y+3)",
  "valid-equivalence", "x(y+3)+2(y+3)", pair="alg-grp")
E("grouping must pair the matching coefficients", "identity preservation under factorisation", "xy+3x+2y+6", "(x+3)(y+2)",
  "invalid", "(x+3)(y+2)=xy+2x+3y+6; x=1,y=0: 9 vs 8", pair="alg-grp")
E("repeated difference of squares", "identity preservation under factorisation", "x^4-16", "(x^2+4)(x+2)(x-2)", "valid-equivalence",
  "(x^2-4)(x^2+4)", c=2, pair="alg-x4")
E("a difference of squares is not a perfect square", "identity preservation under factorisation", "x^4-16", "(x^2-4)^2",
  "invalid", "(x^2-4)^2=x^4-8x^2+16; x=0: -16 vs 16", c=2, pair="alg-x4")
E("perfect-square trinomial", "identity preservation under factorisation", "4x^2-12x+9", "(2x-3)^2", "valid-equivalence",
  "(2x)^2-2*2x*3+9", d="easy")
E("a sum of squares does not factor as a square", "identity preservation under factorisation", "x^2+4", "(x+2)^2", "invalid",
  "x=1: 5 vs 9", d="easy")
E("Sophie Germain identity (unfamiliar but valid factorisation)", "recognising valid unfamiliar factorisations", "x^4+4",
  "(x^2+2x+2)(x^2-2x+2)", "valid-equivalence", "(x^2+2)^2-(2x)^2", d="hard", c=3, composition=True)
E("adding and subtracting x^2 to factor a quartic", "recognising valid unfamiliar factorisations", "x^4+x^2+1",
  "(x^2+x+1)(x^2-x+1)", "valid-equivalence", "(x^2+1)^2-x^2", d="hard", c=3, composition=True, pair="alg-x4x2")
E("a near-square quartic is not a square", "recognising valid unfamiliar factorisations", "x^4+x^2+1", "(x^2+1)^2", "invalid",
  "(x^2+1)^2=x^4+2x^2+1; x=1: 3 vs 4", d="medium", c=2, pair="alg-x4x2")
E("difference of squares with a trinomial square inside", "recognising valid unfamiliar factorisations", "a^2-b^2-2b-1",
  "(a-b-1)(a+b+1)", "valid-equivalence", "a^2-(b+1)^2", d="hard", c=3, composition=True)
E("factorising over the reals with irrational roots", "identity preservation under factorisation", "x^2-2", "(x-sqrt(2))(x+sqrt(2))",
  "valid-equivalence", "difference of squares with b=sqrt(2)", d="medium")
E("taking out the common factor", "identity preservation under factorisation", "2x^2-8", "2(x-2)(x+2)", "valid-equivalence",
  "2(x^2-4)", d="easy", pair="alg-cf")
E("the common factor must divide every term", "identity preservation under factorisation", "2x^2-8", "2(x-4)(x+4)", "invalid",
  "2(x^2-16)=2x^2-32; x=0: -8 vs -32", d="easy", pair="alg-cf")

# ============================================================ completing the square
CS = "completing the square"
E(CS, "identity preservation (vertex form)", "x^2+6x+5", "(x+3)^2-4", "valid-equivalence", "x^2+6x+9-4", pair="alg-cs1")
E("completing the square: subtract the added square", "identity preservation (vertex form)", "x^2+6x+5", "(x+3)^2+5", "invalid",
  "x=0: 5 vs 14", pair="alg-cs1")
E("completing the square with a leading coefficient", "identity preservation (vertex form)", "2x^2-8x+3", "2(x-2)^2-5",
  "valid-equivalence", "2(x^2-4x+4)-8+3", c=2, pair="alg-cs2")
E("the added square is multiplied by the leading coefficient", "identity preservation (vertex form)", "2x^2-8x+3", "2(x-2)^2-1",
  "invalid", "2(x-2)^2-1=2x^2-8x+7; x=0: 3 vs 7", c=2, pair="alg-cs2")
E("completing the square with a fractional half-coefficient", "identity preservation (vertex form)", "x^2-x+1", "(x-1/2)^2+3/4",
  "valid-equivalence", "x^2-x+1/4+3/4")
E("completing the square with a negative leading coefficient", "identity preservation (vertex form)", "-x^2+4x+1", "-(x-2)^2+5",
  "valid-equivalence", "-(x^2-4x+4)+4+1", c=2, pair="alg-cs3")
E("factoring out -1 flips the sign of the compensating constant", "identity preservation (vertex form)", "-x^2+4x+1", "-(x-2)^2-3",
  "invalid", "-(x-2)^2-3=-x^2+4x-7; x=0: 1 vs -7", c=2, pair="alg-cs3")

# ============================================================ exponent laws
E("product of powers adds exponents", "exponent laws", "x^2·x^3", "x^5", "valid-equivalence", "x^(2+3)", d="easy", pair="alg-exp1",
  notation="unfamiliar", oracle_prev="x^2*x^3")
E("product of powers does not multiply exponents", "exponent laws", "x^2·x^3", "x^6", "invalid", "x=2: 32 vs 64", d="easy",
  pair="alg-exp1", notation="unfamiliar", oracle_prev="x^2*x^3")
E("power of a power multiplies exponents", "exponent laws", "(x^2)^3", "x^6", "valid-equivalence", "x^(2*3)", d="easy", pair="alg-exp2")
E("power of a power does not add exponents", "exponent laws", "(x^2)^3", "x^5", "invalid", "x=2: 64 vs 32", d="easy", pair="alg-exp2")
E("quotient of powers subtracts exponents, but x=0 is excluded", "natural-domain preservation", "x^5/x^2", "x^3", "domain-violation",
  "equal for x != 0; x^5/x^2 is undefined at 0, x^3 is not", pair="alg-exp3")
E("quotient of powers with the exclusion stated", "assumption-aware equivalence", "x^5/x^2", "x^3", "valid-equivalence",
  "with x != 0 both sides agree", assumptions=["x != 0"], pair="alg-exp3")
E("power of a product: every factor is raised", "exponent laws", "(2x)^3", "2x^3", "invalid", "x=1: 8 vs 2", d="easy", pair="alg-exp4")
E("power of a product", "exponent laws", "(2x)^3", "8x^3", "valid-equivalence", "2^3 x^3", d="easy", pair="alg-exp4")
E("negative exponent means reciprocal", "exponent laws", "x^(-2)", "1/x^2", "valid-equivalence", "both undefined only at 0",
  d="easy", pair="alg-neg")
E("negative exponent is not a negative value", "exponent laws", "x^(-2)", "-x^2", "invalid", "x=1: 1 vs -1", d="easy", pair="alg-neg")
E("adding fractional exponents creates a domain obligation", "natural-domain preservation", "x^(1/2)x^(3/2)", "x^2",
  "domain-violation", "x^(1/2) needs x>=0; x^2 is defined for all x", c=2, pair="alg-frac")
E("adding fractional exponents with x>=0 stated", "assumption-aware equivalence", "x^(1/2)x^(3/2)", "x^2", "valid-equivalence",
  "on x>=0: x^(1/2+3/2)", assumptions=["x >= 0"], c=2, pair="alg-frac")
E("an even root of an even power is an absolute value", "natural-domain preservation / sign", "(x^4)^(1/4)", "x", "invalid",
  "x=-1: 1 vs -1", c=2, pair="alg-root4")
E("an even root of an even power is an absolute value", "natural-domain preservation / sign", "(x^4)^(1/4)", "|x|",
  "valid-equivalence", "(x^4)^(1/4) is the non-negative fourth root of x^4", c=2, pair="alg-root4")
E("fractional power of a power product (positive base)", "exponent laws with domains", "(8x^3)^(2/3)", "4x^2", "valid-equivalence",
  "x>0: (2x)^2", assumptions=["x > 0"], c=2)
E("x^(3/2) as x times a square root", "exponent laws with domains", "x^(3/2)", "x sqrt(x)", "valid-equivalence",
  "both need x>=0 and equal x*x^(1/2)")
E("shifting an exponent splits off a constant factor", "exponent laws", "2^(x+3)", "8·2^x", "valid-equivalence", "2^x*2^3",
  pair="alg-shift", oracle_next="8*2^x", notation="unfamiliar")
E("an exponent sum gives a product, not a sum", "exponent laws", "2^(x+3)", "2^x+8", "invalid", "x=0: 8 vs 9", pair="alg-shift")
E("rewriting the base: 3^(2x)=9^x", "exponent laws", "3^(2x)", "9^x", "valid-equivalence", "(3^2)^x", pair="alg-base")
E("an exponent factor does not multiply the base", "exponent laws", "3^(2x)", "6^x", "invalid", "x=1: 9 vs 6", pair="alg-base")
E("product of powers with equal exponent", "exponent laws", "4^x·2^x", "8^x", "valid-equivalence", "(4*2)^x", notation="unfamiliar",
  oracle_prev="4^x*2^x")
E("adding equal powers doubles, it does not multiply bases", "exponent laws", "4^x+4^x", "8^x", "invalid", "x=1: 8 vs 8 but x=0: 2 vs 1",
  pair="alg-dbl")
E("doubling a power of 2 increases the exponent by one", "exponent laws", "4^x+4^x", "2^(2x+1)", "valid-equivalence", "2*2^(2x)",
  d="hard", c=2, pair="alg-dbl", composition=True)
E("reciprocal of a sum is not the sum of reciprocals", "exponent laws", "(x+1)^(-1)", "x^(-1)+1", "invalid", "x=1: 1/2 vs 2")
E("precedence: the square binds before the minus", "notation and precedence", "-x^2", "(-x)^2", "invalid", "x=1: -1 vs 1",
  d="easy", pair="alg-negp")
E("squaring a negated variable", "notation and precedence", "(-x)^2", "x^2", "valid-equivalence", "(-1)^2=1", d="easy", pair="alg-negp")
E("odd power of a negation", "notation and precedence", "(-x)^3", "-x^3", "valid-equivalence", "(-1)^3=-1", d="easy")

# ============================================================ rational expressions
E("adding fractions over a common denominator", "rational-expression addition", "1/x+1/(x+1)", "(2x+1)/(x(x+1))",
  "valid-equivalence", "(x+1+x)/(x(x+1)); same excluded points 0,-1", pair="alg-radd")
E("fractions are not added by adding numerators and denominators", "rational-expression addition", "1/x+1/(x+1)", "2/(2x+1)",
  "invalid", "x=1: 3/2 vs 2/3", pair="alg-radd")
E("subtracting fractions distributes the minus over the numerator", "rational-expression subtraction", "3/(x-2)-2/(x+1)",
  "(x+7)/((x-2)(x+1))", "valid-equivalence", "3(x+1)-2(x-2)=x+7", c=2, pair="alg-rsub")
E("sign error when subtracting a numerator", "rational-expression subtraction", "3/(x-2)-2/(x+1)", "(x-1)/((x-2)(x+1))",
  "invalid", "3x+3-2x-4 drops the sign: x=0: -7/2 vs 1/2", c=2, pair="alg-rsub")
E("cancelling a common factor drops an excluded value", "natural-domain preservation", "(x^2-9)/(x+3)", "x-3", "domain-violation",
  "equal for x != -3 only", pair="alg-can1")
E("cancelling a common factor with the exclusion stated", "assumption-aware equivalence", "(x^2-9)/(x+3)", "x-3",
  "valid-equivalence", "x != -3 stated", assumptions=["x != -3"], pair="alg-can1")
E("cancelling a term is not cancelling a factor", "wrong cancellation of terms vs factors", "(x+6)/6", "x", "invalid",
  "x=6: 2 vs 6", d="easy", pair="alg-cant")
E("cancelling a genuine common factor", "wrong cancellation of terms vs factors", "(6x)/6", "x", "valid-equivalence", "6/6=1",
  d="easy", pair="alg-cant")
E("factor before cancelling: x is a factor of x^2+x", "wrong cancellation of terms vs factors", "(x^2+x)/x", "x+1",
  "domain-violation", "x(x+1)/x = x+1 for x != 0", pair="alg-canx")
E("cancelling x from one term only", "wrong cancellation of terms vs factors", "(x^2+x)/x", "x^2+1", "invalid", "x=1: 2 vs 2, x=2: 3 vs 5",
  pair="alg-canx")
E("cancelling across a sum in numerator and denominator", "wrong cancellation of terms vs factors", "(x^2+3)/(x+3)", "x+1",
  "invalid", "x=0: 1 vs 1, x=1: 1 vs 2")
E("cancelling a repeated factor drops one excluded value", "natural-domain preservation", "(x^2-4x+4)/(x^2-4)", "(x-2)/(x+2)",
  "domain-violation", "(x-2)^2/((x-2)(x+2)); x=2 is excluded on the left only", c=2, pair="alg-can2")
E("cancelling a repeated factor with x != 2 stated", "assumption-aware equivalence", "(x^2-4x+4)/(x^2-4)", "(x-2)/(x+2)",
  "valid-equivalence", "remaining exclusion x=-2 is shared", assumptions=["x != 2"], c=2, pair="alg-can2")
E("polynomial division by an exact factor (restricted)", "assumption-aware equivalence", "(2x^2+5x-3)/(x+3)", "2x-1",
  "valid-equivalence", "(2x-1)(x+3)=2x^2+5x-3", assumptions=["x != -3"], c=2)
E("opposite binomials cancel to -1", "sign errors in cancellation", "(x-3)/(3-x)", "-1", "domain-violation",
  "3-x=-(x-3); equal for x != 3", pair="alg-opp")
E("opposite binomials do not cancel to +1", "sign errors in cancellation", "(x-3)/(3-x)", "1", "invalid", "x=0: -1 vs 1",
  pair="alg-opp")
E("dividing by a difference of cubes factor", "natural-domain preservation", "(x^3-1)/(x-1)", "x^2+x+1", "domain-violation",
  "equal for x != 1", c=2)
E("multiplying rational expressions and cancelling", "natural-domain preservation", "x/(x+1)·(x^2-1)/x^2", "(x-1)/x",
  "domain-violation", "x(x-1)(x+1)/((x+1)x^2); x=-1 excluded on the left only", c=3, notation="unfamiliar",
  oracle_prev="x/(x+1)*(x^2-1)/x^2")
E("dividing rational expressions (multiply by reciprocal)", "natural-domain preservation", "(x/(x+1))/(x^2/(x^2-1))", "(x-1)/x",
  "domain-violation", "x/(x+1)*(x-1)(x+1)/x^2; x=-1,1 excluded on left; x=1 is in the domain of (x-1)/x", c=3)
E("difference of reciprocals", "rational-expression subtraction", "1/(x-1)-1/(x+1)", "2/(x^2-1)", "valid-equivalence",
  "(x+1-(x-1))/(x^2-1)", pair="alg-rdiff")
E("difference of reciprocals: order of subtraction", "rational-expression subtraction", "1/(x-1)-1/(x+1)", "-2/(x^2-1)", "invalid",
  "x=0: left is -1-1=-2, right is -2/(-1)=2", pair="alg-rdiff")
E("negating a denominator to combine fractions", "rational-expression addition", "x/(x-2)+2/(2-x)", "1", "domain-violation",
  "(x-2)/(x-2)=1 for x != 2", c=2)
E("splitting a fraction over its numerator", "rational-expression simplification", "(x+1)/x-1", "1/x", "valid-equivalence",
  "1+1/x-1; both exclude 0", d="easy")
E("a fraction does not split over its denominator", "rational-expression simplification", "1/(x+2)", "1/x+1/2", "invalid",
  "x=2: 1/4 vs 1", d="easy")

# ============================================================ nested fractions
E("simplifying a complex fraction drops x=0", "natural-domain preservation in nested fractions", "1/(1+1/x)", "x/(x+1)",
  "domain-violation", "multiply by x/x; x=0 is excluded in the original only", pair="alg-nf1")
E("simplifying a complex fraction with x != 0 stated", "assumption-aware equivalence", "1/(1+1/x)", "x/(x+1)", "valid-equivalence",
  "with x != 0 both exclude only -1", assumptions=["x != 0"], pair="alg-nf1")
E("clearing an inner denominator", "natural-domain preservation in nested fractions", "(1/x-1)/(1/x+1)", "(1-x)/(1+x)",
  "domain-violation", "multiply by x/x; x=0 excluded on the left only", c=2, pair="alg-nf2")
E("clearing an inner denominator: sign of the numerator", "rational-expression simplification", "(1/x-1)/(1/x+1)", "(x-1)/(x+1)",
  "invalid", "x=2: -1/3 vs 1/3", c=2, pair="alg-nf2")
E("a continued fraction collapses to x", "natural-domain preservation in nested fractions", "1/(1-1/(1-1/(1-x)))", "x",
  "domain-violation", "inner 1-1/(1-x)=-x/(1-x), reciprocal (x-1)/x, 1-(x-1)/x=1/x; original excludes 0 and 1", d="hard", c=4,
  composition=True)
E("nested fraction with sums in both levels", "natural-domain preservation in nested fractions", "(x+1/x)/(x-1/x)", "(x^2+1)/(x^2-1)",
  "domain-violation", "multiply by x/x; x=0 excluded on the left only", c=2)
E("a self-inverse nested fraction (restricted)", "assumption-aware equivalence", "((x+1)/(x-1)+1)/((x+1)/(x-1)-1)", "x",
  "valid-equivalence", "numerator 2x/(x-1), denominator 2/(x-1), quotient x; only x=1 is excluded", assumptions=["x != 1"],
  d="hard", c=3)
E("dividing by a fraction multiplies by its reciprocal", "rational-expression division", "(2/x)/(x/4)", "8/x^2", "valid-equivalence",
  "2/x*4/x; both exclude 0", pair="alg-divf")
E("dividing by a fraction is not multiplying by it", "rational-expression division", "(2/x)/(x/4)", "x^2/8", "invalid",
  "x=1: 8 vs 1/8", pair="alg-divf")

# ============================================================ rationalising
E("rationalising with the conjugate", "rationalising denominators", "1/(sqrt(3)-1)", "(sqrt(3)+1)/2", "valid-equivalence",
  "(sqrt(3)+1)/(3-1)", pair="alg-rat1")
E("the numerator also gets the conjugate", "rationalising denominators", "1/(sqrt(3)-1)", "(sqrt(3)-1)/2", "invalid",
  "values 1.366 vs 0.366", pair="alg-rat1")
E("rationalising a variable denominator creates an exclusion", "natural-domain preservation", "1/(sqrt(x)+1)", "(sqrt(x)-1)/(x-1)",
  "invalid", "at x=1 the left is 1/2 while the right is undefined; the rewrite narrows the domain", c=2, pair="alg-ratx")
E("rationalising a variable denominator (x != 1 stated)", "assumption-aware equivalence", "1/(sqrt(x)+1)", "(sqrt(x)-1)/(x-1)",
  "valid-equivalence", "multiply by (sqrt(x)-1)/(sqrt(x)-1), nonzero for x != 1", assumptions=["x != 1"], c=2, pair="alg-ratx")
E("rationalising a numerator removes a removable zero", "natural-domain preservation", "x/(sqrt(x+4)-2)", "sqrt(x+4)+2",
  "domain-violation", "x(sqrt(x+4)+2)/(x+4-4); original excludes x=0", d="hard", c=3)
E("simple surd quotient", "rationalising denominators", "2/sqrt(2)", "sqrt(2)", "valid-equivalence", "2sqrt(2)/2", d="easy")
E("rationalising a cube-root denominator", "rationalising denominators", "1/cbrt(2)", "cbrt(4)/2", "valid-equivalence",
  "multiply by cbrt(4)/cbrt(4); cbrt(8)=2", d="hard", c=2)
E("conjugate of a sum of surds", "rationalising denominators", "1/(sqrt(5)+sqrt(3))", "(sqrt(5)-sqrt(3))/2", "valid-equivalence",
  "denominator 5-3=2", pair="alg-rat2")
E("conjugate product is a difference, not a sum", "rationalising denominators", "1/(sqrt(5)+sqrt(3))", "(sqrt(5)-sqrt(3))/8",
  "invalid", "denominator should be 5-3=2", pair="alg-rat2")
E("difference of square roots as a reciprocal", "rationalising numerators", "sqrt(x+1)-sqrt(x)", "1/(sqrt(x+1)+sqrt(x))",
  "valid-equivalence", "(x+1-x)/(sqrt(x+1)+sqrt(x)); both need x>=0 and the new denominator is positive", d="hard", c=2)

# ============================================================ radicals
E("simplifying a surd by a square factor", "radical simplification", "sqrt(12)", "2sqrt(3)", "valid-equivalence", "sqrt(4*3)",
  d="easy", pair="alg-r12")
E("simplifying a surd: wrong square factor", "radical simplification", "sqrt(12)", "3sqrt(2)", "invalid", "3sqrt(2)=sqrt(18)",
  d="easy", pair="alg-r12")
E("adding like surds", "radical simplification", "sqrt(50)+sqrt(18)", "8sqrt(2)", "valid-equivalence", "5sqrt(2)+3sqrt(2)",
  pair="alg-radd")
E("square roots do not add under the sign", "radical simplification", "sqrt(50)+sqrt(18)", "sqrt(68)", "invalid",
  "8sqrt(2)=sqrt(128) != sqrt(68)", pair="alg-radd")
E("square root of a square is the absolute value", "sign/domain in radicals", "sqrt(x^2)", "x", "invalid", "x=-1: 1 vs -1",
  pair="alg-sqx")
E("square root of a square is the absolute value", "sign/domain in radicals", "sqrt(x^2)", "|x|", "valid-equivalence",
  "definition of the principal root", pair="alg-sqx")
E("square root of a perfect square trinomial", "sign/domain in radicals", "sqrt((x-3)^2)", "|x-3|", "valid-equivalence",
  "principal root of a square")
E("coefficient under a root keeps an absolute value", "sign/domain in radicals", "sqrt(9x^2)", "3x", "invalid", "x=-1: 3 vs -3",
  pair="alg-9x")
E("coefficient under a root keeps an absolute value", "sign/domain in radicals", "sqrt(9x^2)", "3|x|", "valid-equivalence",
  "sqrt(9)sqrt(x^2)", pair="alg-9x")
E("sqrt(x^4) needs no absolute value", "sign/domain in radicals", "sqrt(x^4)", "x^2", "valid-equivalence", "x^2>=0 always")
E("product of roots needs both radicands non-negative", "natural-domain preservation", "sqrt(x(x-1))", "sqrt(x)sqrt(x-1)", "invalid",
  "x=-1: sqrt(2) defined on the left, sqrt(-1) undefined on the right", c=2)
E("a root does not distribute over a sum", "radical simplification", "sqrt(x+9)", "sqrt(x)+3", "invalid", "x=16: 5 vs 7", d="easy")
E("taking a square factor out of a radical", "radical simplification", "sqrt(4x+8)", "2sqrt(x+2)", "valid-equivalence",
  "sqrt(4(x+2)); both need x>=-2")
E("real cube root of a negative cube", "radical simplification", "cbrt(-8x^3)", "-2x", "valid-equivalence",
  "cube roots are odd functions: cbrt((-2x)^3)=-2x for all real x", c=2)
E("product of surds", "radical simplification", "sqrt(2)sqrt(8)", "4", "valid-equivalence", "sqrt(16)", d="easy", pair="alg-s28")
E("sum of surds is not the surd of the sum", "radical simplification", "sqrt(2)+sqrt(8)", "sqrt(10)", "invalid",
  "3sqrt(2)=sqrt(18)", d="easy", pair="alg-s28")
E("squaring a sum containing a root", "radical simplification", "(sqrt(x)+1)^2", "x+1", "invalid", "x=1: 4 vs 2", pair="alg-sqb")
E("squaring a sum containing a root", "radical simplification", "(sqrt(x)+1)^2", "x+2sqrt(x)+1", "valid-equivalence",
  "binomial square; domain x>=0 both", pair="alg-sqb")

# ============================================================ like terms / signs
E("collecting like terms in two variables", "like-term collection", "3x+2y-x+4y", "2x+6y", "valid-equivalence", "(3-1)x+(2+4)y",
  d="easy", pair="alg-lt1")
E("unlike terms cannot be merged", "like-term collection", "3x+2y-x+4y", "8xy", "invalid", "x=y=1: 8 vs 8; x=1,y=0: 2 vs 0",
  d="easy", pair="alg-lt1")
E("adding like terms keeps the power", "like-term collection", "2x^2+3x^2", "5x^4", "invalid", "x=2: 20 vs 80", d="easy",
  pair="alg-lt2")
E("adding like terms keeps the power", "like-term collection", "2x^2+3x^2", "5x^2", "valid-equivalence", "(2+3)x^2", d="easy",
  pair="alg-lt2")
E("different powers are unlike terms", "like-term collection", "x^2+x", "x^3", "invalid", "x=1: 2 vs 1", d="easy")
E("expanding and collecting with two brackets", "sign errors in distribution", "x(2-x)-2(x-1)", "2-x^2", "valid-equivalence",
  "2x-x^2-2x+2", pair="alg-lt3")
E("sign of the second distributed term", "sign errors in distribution", "x(2-x)-2(x-1)", "-x^2+4x-2", "invalid",
  "-2(x-1)=-2x+2; x=0: 2 vs -2", pair="alg-lt3")
E("collecting after distributing two multipliers", "sign errors in distribution", "2(x-3)-3(x+1)", "-x-9", "valid-equivalence",
  "2x-6-3x-3", pair="alg-lt4")
E("only the first term of the bracket gets the multiplier", "sign errors in distribution", "2(x-3)-3(x+1)", "-x-5", "invalid",
  "x=0: -9 vs -5 (student wrote -3x+1)", pair="alg-lt4")

# ============================================================ notation
E("x·x is x squared", "equivalent unfamiliar notation", "x·x", "x^2", "valid-equivalence", "definition of a square",
  notation="unfamiliar", oracle_prev="x*x", d="easy")
E("programming-style powers", "equivalent unfamiliar notation", "x**2+2*x+1", "(x+1)**2", "valid-equivalence", "perfect square",
  notation="unfamiliar", oracle_prev="x^2+2x+1", oracle_next="(x+1)^2", d="easy", pair="alg-not1")
E("programming-style powers: square misplaced", "equivalent unfamiliar notation", "x**2+2*x+1", "(x**2+1)", "invalid",
  "x=1: 4 vs 2", notation="unfamiliar", oracle_prev="x^2+2x+1", oracle_next="x^2+1", d="easy", pair="alg-not1")
E("superscript glyphs and Unicode minus", "equivalent unfamiliar notation", "x²−4", "(x−2)(x+2)", "valid-equivalence",
  "difference of squares", notation="unfamiliar", oracle_prev="x^2-4", oracle_next="(x-2)(x+2)", d="easy")
E("superscript cube as repeated product", "equivalent unfamiliar notation", "x³", "x·x²", "valid-equivalence", "x^1 x^2",
  notation="unfamiliar", oracle_prev="x^3", oracle_next="x*x^2", d="easy")
E("2x² is not (2x)²", "notation and precedence", "2x²", "(2x)²", "invalid", "x=1: 2 vs 4", notation="unfamiliar",
  oracle_prev="2x^2", oracle_next="(2x)^2", d="easy")
E("1/2x is ambiguous (x/2 or 1/(2x))", "ambiguous notation", "1/2x", "x/2", "insufficient-information",
  "reading as (1/2)x gives x/2; reading as 1/(2x) does not", d="easy", pair="alg-amb")
E("explicit brackets remove the ambiguity", "ambiguous notation", "(1/2)x", "x/2", "valid-equivalence", "(1/2)*x", d="easy",
  pair="alg-amb")
E("division followed by juxtaposition is ambiguous", "ambiguous notation", "6/2(1+2)", "9", "insufficient-information",
  "left-to-right gives 9, juxtaposition-first gives 1", d="easy")

# ============================================================ multivariable identities
E("Brahmagupta-Fibonacci identity", "multivariable identity", "(a^2+b^2)(c^2+d^2)", "(ac-bd)^2+(ad+bc)^2", "valid-equivalence",
  "both expand to a^2c^2+a^2d^2+b^2c^2+b^2d^2", d="hard", c=3)
E("sum of cubes via the cube of a sum", "multivariable identity", "a^3+b^3", "(a+b)^3-3ab(a+b)", "valid-equivalence",
  "(a+b)^3=a^3+b^3+3ab(a+b)", c=2)
E("three-variable cube identity", "multivariable identity", "a^3+b^3+c^3-3abc", "(a+b+c)(a^2+b^2+c^2-ab-bc-ca)",
  "valid-equivalence", "standard factorisation; expand to check", d="hard", c=4, notation="unfamiliar",
  oracle_prev="a^3+b^3+c^3-3a*b*c", oracle_next="(a+b+c)(a^2+b^2+c^2-a*b-b*c-c*a)")
E("difference of a sum-square and a difference-square", "multivariable identity", "(a+b)^2-(a-b)^2", "4ab", "valid-equivalence",
  "2ab-(-2ab)", pair="alg-mv1")
E("difference of a sum-square and a difference-square: sign slip", "multivariable identity", "(a+b)^2-(a-b)^2", "2b^2", "invalid",
  "a=b=1: 4 vs 2", pair="alg-mv1")
E("difference of squares is not the square of the difference", "multivariable identity", "x^2-y^2", "(x-y)^2", "invalid",
  "x=1,y=-1: 0 vs 4")
E("cube of a difference is not a difference of cubes", "multivariable identity", "(a-b)^3", "a^3-b^3", "invalid", "a=2,b=1: 1 vs 7")
E("telescoping product of conjugates", "multivariable identity", "(x+y)(x-y)(x^2+y^2)", "x^4-y^4", "valid-equivalence",
  "(x^2-y^2)(x^2+y^2)", c=2)
E("two-variable Sophie Germain identity", "multivariable identity", "a^4+4b^4", "(a^2+2ab+2b^2)(a^2-2ab+2b^2)",
  "valid-equivalence", "(a^2+2b^2)^2-(2ab)^2", d="hard", c=3, composition=True)

# ============================================================ multi-line workings
def Wk(principle, invariant, typ, start, lines, rel, why, answer, ol=None, target=None, d="medium", c=None, **k):
    task = {"type": typ, "start": start}
    if target:
        task["target"] = target
    c = c or min(5, max(2, len(lines)))
    return W(C, principle, invariant, task, lines, rel, why=why, answer=answer, oracle_lines=ol, difficulty=d, complexity=c, **k)


Wk("expanding a triple product in stages", "identity chain + final expanded form", "expand", "(x+2)(x-3)(x+1)",
   ["(x^2-x-6)(x+1)", "x^3-x^2-6x+x^2-x-6", "x^3-7x-6"], "valid-equivalence", "each line is an exact identity"+DX, "x^3-7x-6",
   c=3, pair="alg-w-exp")
Wk("expanding a triple product in stages", "final-form obligation (unexpanded)", "expand", "(x+2)(x-3)(x+1)",
   ["(x^2-x-6)(x+1)"], "incomplete", "true but still a product", "x^3-7x-6", c=2, pair="alg-w-exp")
Wk("expanding a triple product in stages", "error localisation in a chain", "expand", "(x+2)(x-3)(x+1)",
   ["(x^2-x-6)(x+1)", "x^3-x^2-6x+x^2-x-6", "x^3-5x-6"], "invalid", "-6x-x=-7x, not -5x (x=1: -12 vs -10)", "x^3-7x-6",
   c=3, pair="alg-w-exp")
Wk("full factorisation after a common factor", "final-form obligation (not fully factorised)", "factor", "2x^3-8x",
   ["2x(x^2-4)"], "incomplete", "x^2-4 still factors", "2x(x-2)(x+2)", pair="alg-w-fac")
Wk("full factorisation after a common factor", "identity chain + final factor form", "factor", "2x^3-8x",
   ["2x(x^2-4)", "2x(x-2)(x+2)"], "valid-equivalence", "difference of squares completes it"+DF, "2x(x-2)(x+2)", pair="alg-w-fac")
Wk("difference of squares twice", "identity chain + final factor form", "factor", "x^4-81",
   ["(x^2-9)(x^2+9)", "(x-3)(x+3)(x^2+9)"], "valid-equivalence", "x^2+9 is irreducible over the reals"+DF, "(x-3)(x+3)(x^2+9)",
   c=2, pair="alg-w-x4")
Wk("a sum of squares is not a difference of squares", "error localisation in a chain", "factor", "x^4-81",
   ["(x^2-9)(x^2+9)", "(x-3)(x+3)(x-3)(x+3)"], "invalid", "x^2+9 != (x-3)(x+3); x=0: -81 vs 81", "(x-3)(x+3)(x^2+9)",
   c=2, pair="alg-w-x4")
Wk("factor out the constant then the trinomial", "final-form obligation (not fully factorised)", "factor", "3x^2+6x-24",
   ["3(x^2+2x-8)"], "incomplete", "x^2+2x-8=(x+4)(x-2) still factors", "3(x+4)(x-2)", pair="alg-w-fac3")
Wk("factor out the constant then the trinomial", "identity chain + final factor form", "factor", "3x^2+6x-24",
   ["3(x^2+2x-8)", "3(x+4)(x-2)"], "valid-equivalence", "3(x^2+2x-8)", "3(x+4)(x-2)", pair="alg-w-fac3")
Wk("simplify a rational expression by cancelling", "common factor left in a fraction", "simplify", "(x^2-1)/(x^2+2x+1)",
   ["((x-1)(x+1))/((x+1)^2)"], "incomplete", "x+1 is still a common factor", "(x-1)/(x+1)", pair="alg-w-simp")
Wk("simplify a rational expression by cancelling", "identity chain with domains", "simplify", "(x^2-1)/(x^2+2x+1)",
   ["((x-1)(x+1))/((x+1)^2)", "(x-1)/(x+1)"], "valid-equivalence",
   "the only exclusion x=-1 survives in the answer, so no restriction is lost", "(x-1)/(x+1)", pair="alg-w-simp")
Wk("cancelling x-2 must state x != 2", "excluded-value obligation", "simplify", "(x^2-4)/(x^2-2x)",
   ["((x-2)(x+2))/(x(x-2))", "(x+2)/x"], "domain-violation", "x=2 is excluded originally but not in (x+2)/x", "(x+2)/x, x != 2",
   pair="alg-w-simp2")
Wk("cancelling x-2 with the restriction stated", "excluded-value obligation", "simplify", "(x^2-4)/(x^2-2x)",
   ["((x-2)(x+2))/(x(x-2))", "x ≠ 0, x ≠ 2", "(x+2)/x"], "valid-equivalence", "restriction stated", "(x+2)/x, x != 0, 2",
   ol=["((x-2)(x+2))/(x(x-2))", "restrict: x != 0 and x != 2", "(x+2)/x"], pair="alg-w-simp2")
Wk("cancelling terms instead of factors", "wrong cancellation of terms vs factors", "simplify", "(x^2-4)/(x^2-2x)",
   ["(-4)/(-2x)", "2/x"], "invalid", "x^2 cancelled as a term: x=1: 3 vs 2", "(x+2)/x", pair="alg-w-simp2")
Wk("negative exponents of a sum", "exponent laws in evaluation", "evaluate", "(2^(-1)+3^(-1))^(-1)",
   ["(1/2+1/3)^(-1)", "(5/6)^(-1)", "6/5"], "valid-equivalence", "reciprocal of 5/6", "6/5", pair="alg-w-ev")
Wk("the reciprocal of a sum is not the sum of reciprocals", "exponent laws in evaluation", "evaluate", "(2^(-1)+3^(-1))^(-1)",
   ["(1/2+1/3)^(-1)", "2+3", "5"], "invalid", "(1/2+1/3)^(-1)=6/5, not 5", "6/5", pair="alg-w-ev")
Wk("fractional exponents of perfect powers", "exponent laws in evaluation", "evaluate", "8^(2/3)·27^(-1/3)",
   ["4·(1/3)", "4/3"], "valid-equivalence", "8^(2/3)=4, 27^(-1/3)=1/3", "4/3", ol=["4*(1/3)", "4/3"], notation="unfamiliar",
   pair="alg-w-ev2")
Wk("negative fractional exponent is a reciprocal root", "exponent laws in evaluation", "evaluate", "8^(2/3)·27^(-1/3)",
   ["4·(-3)", "-12"], "invalid", "27^(-1/3)=1/3, not -3", "4/3", ol=["4*(-3)", "-12"], notation="unfamiliar", pair="alg-w-ev2")
Wk("difference of cubes of binomials", "show-that identity chain", "show", "(x+1)^3-(x-1)^3",
   ["x^3+3x^2+3x+1-(x^3-3x^2+3x-1)", "6x^2+2"], "valid-equivalence", "the x^3 and 3x terms cancel", "6x^2+2", target="6x^2+2",
   c=2, pair="alg-w-show")
Wk("difference of cubes of binomials", "sign errors when removing brackets", "show", "(x+1)^3-(x-1)^3",
   ["x^3+3x^2+3x+1-x^3-3x^2+3x-1", "6x"], "invalid", "the minus was not applied to -3x^2, 3x, -1 (x=1: 8 vs 6)", "6x^2+2",
   target="6x^2+2", c=2, pair="alg-w-show")
Wk("difference of cubes of binomials", "show-that: target not reached", "show", "(x+1)^3-(x-1)^3",
   ["x^3+3x^2+3x+1-(x^3-3x^2+3x-1)"], "incomplete",
   "the line is true but 6x^2+2 is never written. [oracle-dispute] the oracle's show check accepts any line equivalent to the target, so it reports verified although the student has not reached the stated form",
   "6x^2+2", target="6x^2+2", pair="alg-w-show")
Wk("simplifying surds before dividing", "radical simplification chain", "simplify", "(sqrt(8)+sqrt(18))/sqrt(2)",
   ["(2sqrt(2)+3sqrt(2))/sqrt(2)", "5sqrt(2)/sqrt(2)", "5"], "valid-equivalence", "5sqrt(2)/sqrt(2)=5", "5", c=2)
Wk("complex fraction simplification must state x != 0", "excluded-value obligation", "simplify", "1/(1+1/x)", ["x/(x+1)"],
   "domain-violation", "x=0 excluded in the original only", "x/(x+1), x != 0", pair="alg-w-nf")
Wk("complex fraction simplification with x != 0 stated", "excluded-value obligation", "simplify", "1/(1+1/x)",
   ["multiply top and bottom by x (x ≠ 0)", "x/(x+1)"], "valid-equivalence", "restriction stated", "x/(x+1), x != 0",
   ol=["restrict: x != 0", "x/(x+1)"], pair="alg-w-nf")
Wk("squaring a trinomial", "identity chain + final expanded form", "expand", "(x^2-2x+3)^2",
   ["x^4+4x^2+9-4x^3+6x^2-12x", "x^4-4x^3+10x^2-12x+9"], "valid-equivalence", "squares plus doubled cross products"+DX,
   "x^4-4x^3+10x^2-12x+9", c=3, pair="alg-w-tri")
Wk("squaring a trinomial needs the cross terms", "error localisation in a chain", "expand", "(x^2-2x+3)^2",
   ["x^4+4x^2+9"], "invalid", "cross terms -4x^3+6x^2-12x missing (x=1: 4 vs 14)", "x^4-4x^3+10x^2-12x+9", c=2, pair="alg-w-tri")
Wk("factorising by grouping", "final-form obligation (not fully factorised)", "factor", "x^3-3x^2-4x+12",
   ["x^2(x-3)-4(x-3)", "(x-3)(x^2-4)"], "incomplete", "x^2-4 still factors", "(x-3)(x-2)(x+2)", c=2, pair="alg-w-grp")
Wk("factorising by grouping", "identity chain + final factor form", "factor", "x^3-3x^2-4x+12",
   ["x^2(x-3)-4(x-3)", "(x-3)(x^2-4)", "(x-3)(x-2)(x+2)"], "valid-equivalence", "grouping then difference of squares"+DF,
   "(x-3)(x-2)(x+2)", c=3, pair="alg-w-grp")
Wk("grouping: sign of the second group", "sign errors in grouping", "factor", "x^3-3x^2-4x+12",
   ["x^2(x-3)-4(x+3)", "(x-3)(x+3)(x^2-4)"], "invalid", "-4x+12=-4(x-3), not -4(x+3) (x=0: 12 vs -12)", "(x-3)(x-2)(x+2)",
   c=3, pair="alg-w-grp")
Wk("completing the square in a show-that", "show-that identity chain", "show", "x^2-8x+10",
   ["x^2-8x+16-16+10", "(x-4)^2-6"], "valid-equivalence", "add and subtract 16", "(x-4)^2-6", target="(x-4)^2-6", pair="alg-w-cs")
Wk("completing the square: forgetting to subtract", "error localisation in a chain", "show", "x^2-8x+10",
   ["x^2-8x+16+10", "(x-4)^2+10"], "invalid", "adding 16 changes the value (x=0: 10 vs 26)", "(x-4)^2-6", target="(x-4)^2-6",
   pair="alg-w-cs")
Wk("adding rational expressions in a working", "rational-expression addition chain", "simplify", "2/(x+1)+3/(x-1)",
   ["(2(x-1)+3(x+1))/((x+1)(x-1))", "(5x+1)/(x^2-1)"], "valid-equivalence", "2x-2+3x+3=5x+1", "(5x+1)/(x^2-1)", c=2,
   pair="alg-w-radd")
Wk("adding rational expressions: incomplete distribution", "error localisation in a chain", "simplify", "2/(x+1)+3/(x-1)",
   ["(2x-2+3x+1)/((x+1)(x-1))", "(5x-1)/(x^2-1)"], "invalid", "3(x+1)=3x+3 not 3x+1 (x=0: -1 vs 1)", "(5x+1)/(x^2-1)", c=2,
   pair="alg-w-radd")
Wk("fractional exponents then division: domain x>0", "excluded-value obligation", "simplify", "(x^(1/2)x^(3/2))/x",
   ["x^2/x", "x"], "domain-violation", "original needs x>0; x is defined everywhere", "x, x > 0", c=2, pair="alg-w-fx")
Wk("fractional exponents then division with x>0 stated", "excluded-value obligation", "simplify", "(x^(1/2)x^(3/2))/x",
   ["for x > 0:", "x^2/x", "x"], "valid-equivalence", "restriction stated", "x, x > 0", ol=["restrict: x > 0", "x^2/x", "x"], c=2,
   pair="alg-w-fx")
Wk("two-variable expansion and collection", "multivariable identity chain", "simplify", "(a+b)^2-(a-b)^2",
   ["a^2+2ab+b^2-a^2+2ab-b^2", "4ab"], "valid-equivalence", "squares cancel", "4ab")
Wk("factorising with a hidden common binomial", "multivariable factorisation", "factor", "a^2-b^2+a-b",
   ["(a-b)(a+b)+(a-b)", "(a-b)(a+b+1)"], "valid-equivalence", "(a-b) is common", "(a-b)(a+b+1)", d="hard", c=3, composition=True)
Wk("cancelling two factors", "common factor left in a fraction", "simplify", "(x^3-x)/(x^2-x)",
   ["(x(x-1)(x+1))/(x(x-1))"], "incomplete", "x(x-1) is still common", "x+1, x != 0, 1", c=2, pair="alg-w-c2")
Wk("cancelling two factors without stating exclusions", "excluded-value obligation", "simplify", "(x^3-x)/(x^2-x)",
   ["(x(x-1)(x+1))/(x(x-1))", "x+1"], "domain-violation", "x=0 and x=1 excluded originally", "x+1, x != 0, 1", c=2,
   pair="alg-w-c2")
Wk("cancelling two factors with exclusions stated", "excluded-value obligation", "simplify", "(x^3-x)/(x^2-x)",
   ["(x(x-1)(x+1))/(x(x-1))", "x ≠ 0, x ≠ 1", "x+1"], "valid-equivalence", "restriction stated", "x+1, x != 0, 1",
   ol=["(x(x-1)(x+1))/(x(x-1))", "restrict: x != 0 and x != 1", "x+1"], c=2, pair="alg-w-c2")
Wk("evaluating a surd expression", "radical arithmetic", "evaluate", "(sqrt(3)+1)^2-2sqrt(3)",
   ["3+2sqrt(3)+1-2sqrt(3)", "4"], "valid-equivalence", "(sqrt(3)+1)^2=4+2sqrt(3)", "4", pair="alg-w-surd")
Wk("squaring a surd binomial without the cross term", "radical arithmetic", "evaluate", "(sqrt(3)+1)^2-2sqrt(3)",
   ["3+1-2sqrt(3)", "4-2sqrt(3)"], "invalid", "cross term 2sqrt(3) dropped", "4", pair="alg-w-surd")
Wk("cancelling part of a sum", "wrong cancellation of terms vs factors", "simplify", "(2x+4)/2", ["x+4"], "invalid",
   "only 2x was divided by 2 (x=0: 2 vs 4)", "x+2", d="easy", pair="alg-w-ct")
Wk("dividing every term by the common factor", "wrong cancellation of terms vs factors", "simplify", "(2x+4)/2",
   ["2(x+2)/2", "x+2"], "valid-equivalence", "factor 2 first", "x+2", d="easy", pair="alg-w-ct")
Wk("expanding a square in Unicode notation", "equivalent unfamiliar notation", "expand", "(x−3)²", ["x²−6x+9"],
   "valid-equivalence", "binomial square"+DX, "x^2-6x+9", ol=["x^2-6x+9"], notation="unfamiliar", d="easy")
Wk("rationalising a denominator in a working", "rationalising chain", "simplify", "6/(3-sqrt(3))",
   ["6(3+sqrt(3))/(9-3)", "(18+6sqrt(3))/6", "3+sqrt(3)"], "valid-equivalence", "(3-sqrt(3))(3+sqrt(3))=6", "3+sqrt(3)", c=3,
   pair="alg-w-rat")
Wk("conjugate product computed as a sum", "rationalising chain", "simplify", "6/(3-sqrt(3))",
   ["6(3+sqrt(3))/(9+3)", "(3+sqrt(3))/2"], "invalid", "9-3=6, not 12", "3+sqrt(3)", c=2, pair="alg-w-rat")
Wk("expand and collect with a subtracted product", "sign errors in distribution", "simplify", "2(x-1)^2-(x+1)(x-3)",
   ["2x^2-4x+2-(x^2-2x-3)", "2x^2-4x+2-x^2+2x+3", "x^2-2x+5"], "valid-equivalence", "removing the bracket negates all three terms",
   "x^2-2x+5", c=3, pair="alg-w-sub")
Wk("expand and collect with a subtracted product", "sign errors in distribution", "simplify", "2(x-1)^2-(x+1)(x-3)",
   ["2x^2-4x+2-x^2-2x-3", "x^2-6x-1"], "invalid", "only the first term was negated (x=0: 5 vs -1)", "x^2-2x+5", c=3,
   pair="alg-w-sub")
Wk("expanding a sum of squares", "final-form obligation (unexpanded)", "expand", "(x+1)^2+(x-1)^2", ["(x+1)^2+x^2-2x+1"],
   "incomplete", "(x+1)^2 is still unexpanded", "2x^2+2", pair="alg-w-ss")
Wk("expanding a sum of squares", "identity chain + final expanded form", "expand", "(x+1)^2+(x-1)^2",
   ["x^2+2x+1+x^2-2x+1", "2x^2+2"], "valid-equivalence", "the linear terms cancel"+DX, "2x^2+2", pair="alg-w-ss")
Wk("power of a power (cited as adding exponents)", "cited rule vs result", "simplify", "(x^2)^2",
   ["x^4   (add the exponents: 2+2)"], "wrong-reason", "the result x^4 is right, but the rule is multiplying exponents; 2+2=2*2 by coincidence",
   "x^4", ol=["x^4"], d="easy")
Wk("quotient of powers (cited as dividing exponents)", "cited rule vs result", "simplify", "x^4/x^2",
   ["x ≠ 0", "x^2   (divide the exponents: 4 ÷ 2)"], "wrong-reason",
   "x^2 is right for x != 0, but the rule is subtracting exponents; 4/2=4-2 by coincidence", "x^2, x != 0",
   ol=["restrict: x != 0", "x^2"], d="easy")
Wk("multi-step simplification of a rational expression", "identity chain with domains", "simplify",
   "(x^2+3x+2)/(x^2-1)-1/(x-1)", ["((x+1)(x+2))/((x+1)(x-1))-1/(x-1)", "x ≠ -1", "(x+2)/(x-1)-1/(x-1)", "(x+1)/(x-1)"],
   "valid-equivalence", "after cancelling (x+1) with x != -1 stated, the fractions combine", "(x+1)/(x-1), x != -1",
   ol=["((x+1)(x+2))/((x+1)(x-1))-1/(x-1)", "restrict: x != -1", "(x+2)/(x-1)-1/(x-1)", "(x+1)/(x-1)"], d="hard", c=4,
   composition=True, pair="alg-w-long")
Wk("multi-step simplification: unstated cancellation", "excluded-value obligation", "simplify",
   "(x^2+3x+2)/(x^2-1)-1/(x-1)", ["((x+1)(x+2))/((x+1)(x-1))-1/(x-1)", "(x+2)/(x-1)-1/(x-1)", "(x+1)/(x-1)"],
   "domain-violation", "x=-1 excluded originally but allowed by (x+1)/(x-1)", "(x+1)/(x-1), x != -1", d="hard", c=4,
   composition=True, pair="alg-w-long")
