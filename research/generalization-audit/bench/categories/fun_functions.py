"""FUN: Functions, composition and identities.
Function-notation text (f(g(x)), f^-1, ...) is marked notation='unfamiliar' and carries the explicitly substituted
expression for the oracle. All labels are derived by hand; see each `why`."""
from schema import T, W

C = "FUN"


def E(principle, invariant, prev, nxt, rel, why, d="medium", c=1, **k):
    return T(C, principle, invariant, prev, nxt, "expression", rel, why=why, difficulty=d, complexity=c, domain="functions", **k)


def S(principle, invariant, prev, nxt, rel, why, d="medium", c=2, **k):
    return T(C, principle, invariant, prev, nxt, "statement", rel, why=why, difficulty=d, complexity=c, domain="functions", **k)


def F(principle, invariant, text_prev, text_next, o_prev, o_next, rel, why, d="medium", c=2, **k):
    """function-notation transition; oracle reads the substituted expressions"""
    return E(principle, invariant, text_prev, text_next, rel, why, d=d, c=c, notation="unfamiliar", oracle_prev=o_prev,
             oracle_next=o_next, **k)


# ============================================================ composition written out
F("composition substitutes the inner function into the outer", "order of composition",
  "f(x)=x^2, g(x)=x+1: f(g(x))", "(x+1)^2", "(x+1)^2", "(x+1)^2", "valid-equivalence", "f(g(x))=(g(x))^2", d="easy",
  pair="fun-ord")
F("composition is not commutative", "order of composition", "f(x)=x^2, g(x)=x+1: f(g(x))", "x^2+1", "(x+1)^2", "x^2+1",
  "invalid", "x^2+1 is g(f(x)); x=1: 4 vs 2", d="easy", pair="fun-ord")
F("composition in the other order", "order of composition", "f(x)=x^2, g(x)=x+1: g(f(x))", "x^2+1", "x^2+1", "x^2+1",
  "valid-equivalence", "g(f(x))=f(x)+1", d="easy")
F("composing linear functions", "substitution into every occurrence", "f(x)=3x-1, g(x)=2x+5: f(g(x))", "6x+14", "3(2x+5)-1",
  "6x+14", "valid-equivalence", "6x+15-1", d="easy", pair="fun-lin")
F("the outer constant is applied after substitution", "substitution into every occurrence", "f(x)=3x-1, g(x)=2x+5: f(g(x))",
  "6x+4", "3(2x+5)-1", "6x+4", "invalid", "3*5-1=14, not 4", d="easy", pair="fun-lin")
F("composing with a reciprocal", "substitution into every occurrence", "f(x)=1/x, g(x)=x-2: f(g(x))", "1/(x-2)", "1/(x-2)",
  "1/(x-2)", "valid-equivalence", "f applied to x-2", d="easy", pair="fun-rec")
F("composing with a reciprocal: the shift goes inside", "substitution into every occurrence", "f(x)=1/x, g(x)=x-2: f(g(x))",
  "1/x-2", "1/(x-2)", "1/x-2", "invalid", "that is g(f(x)); x=1: -1 vs -1, x=4: 1/2 vs -7/4", d="easy", pair="fun-rec")
F("substituting into a quadratic with several occurrences", "substitution into every occurrence",
  "f(x)=x^2-3x, g(x)=x+2: f(g(x))", "x^2+x-2", "(x+2)^2-3(x+2)", "x^2+x-2", "valid-equivalence",
  "x^2+4x+4-3x-6", c=2, pair="fun-quad")
F("every occurrence of x must be replaced", "substitution into every occurrence", "f(x)=x^2-3x, g(x)=x+2: f(g(x))",
  "x^2+4x+4-3x", "(x+2)^2-3(x+2)", "x^2+4x+4-3x", "invalid", "the second x was not replaced: x=0: -2 vs 4", c=2, pair="fun-quad")
F("self-composition of a Möbius map narrows the domain", "natural domain of a composition", "f(x)=1/(1-x): f(f(x))",
  "(x-1)/x", "1/(1-1/(1-x))", "(x-1)/x", "domain-violation", "1-1/(1-x)=-x/(1-x); f(f(x)) needs x != 1 as well as x != 0",
  d="hard", c=3, pair="fun-mob")
F("self-composition of a Möbius map with x != 1 stated", "natural domain of a composition", "f(x)=1/(1-x): f(f(x)), x ≠ 1",
  "(x-1)/x", "1/(1-1/(1-x))", "(x-1)/x", "valid-equivalence", "with x != 1 both exclude only x=0", d="hard", c=3,
  assumptions=["x != 1"], pair="fun-mob")
F("triple composition of a period-3 map", "natural domain of a composition", "f(x)=1/(1-x): f(f(f(x)))", "x",
  "1/(1-1/(1-1/(1-x)))", "x", "domain-violation", "f∘f∘f is the identity, but only for x != 0, 1", d="hard", c=4,
  composition=True)
F("composition with a square root narrows the domain", "natural domain of a composition", "f(x)=x^2, g(x)=sqrt(x): f(g(x))",
  "x", "sqrt(x)^2", "x", "domain-violation", "(sqrt x)^2=x only for x>=0", pair="fun-sq")
F("square root of a square", "inverse-function identity", "f(x)=x^2, g(x)=sqrt(x): g(f(x))", "|x|", "sqrt(x^2)", "|x|",
  "valid-equivalence", "principal root of x^2", pair="fun-sq")
F("square root of a square is not x", "inverse-function identity", "f(x)=x^2, g(x)=sqrt(x): g(f(x))", "x", "sqrt(x^2)", "x",
  "invalid", "x=-2: 2 vs -2", pair="fun-sq")
F("exponential after logarithm", "inverse-function identity with domain", "f(x)=e^x, g(x)=ln(x): f(g(x))", "x", "e^(ln(x))",
  "x", "domain-violation", "e^(ln x)=x only for x>0", pair="fun-explog")
F("logarithm after exponential", "inverse-function identity", "f(x)=e^x, g(x)=ln(x): g(f(x))", "x", "ln(e^x)", "x",
  "valid-equivalence", "ln(e^x)=x for every real x", pair="fun-explog")
F("composition with a quadratic inside a root", "natural domain of a composition", "f(x)=sqrt(x), g(x)=x^2-4: f(g(x))",
  "sqrt(x-2)sqrt(x+2)", "sqrt(x^2-4)", "sqrt(x-2)sqrt(x+2)", "invalid",
  "at x=-3 sqrt(5) is defined but sqrt(-5) is not: the product form loses x<=-2", c=2)
F("difference quotient of a square", "function notation with two letters", "f(x)=x^2: (f(x+h)-f(x))/h", "2x+h",
  "((x+h)^2-x^2)/h", "2x+h", "domain-violation", "(2xh+h^2)/h = 2x+h needs h != 0", c=2, pair="fun-dq")
F("difference quotient of a square: the h^2 term", "function notation with two letters", "f(x)=x^2: (f(x+h)-f(x))/h", "2x",
  "((x+h)^2-x^2)/h", "2x", "invalid", "the h term was dropped: x=0,h=1 gives 1 vs 0", c=2, pair="fun-dq")
F("f(x+h) expands the whole argument", "substitution into every occurrence", "f(x)=x^2+1: f(x+h)", "x^2+2xh+h^2+1",
  "(x+h)^2+1", "x^2+2xh+h^2+1", "valid-equivalence", "(x+h)^2+1", d="easy", pair="fun-fxh")
F("f(x+h) is not f(x)+h", "substitution into every occurrence", "f(x)=x^2+1: f(x+h)", "x^2+1+h", "(x+h)^2+1", "x^2+1+h",
  "invalid", "x=1,h=1: 5 vs 3", d="easy", pair="fun-fxh")
F("f(2x) scales the argument", "substitution into every occurrence", "f(x)=x^2-x: f(2x)", "4x^2-2x", "(2x)^2-2x", "4x^2-2x",
  "valid-equivalence", "replace x by 2x", d="easy", pair="fun-f2x")
F("f(2x) is not 2f(x)", "substitution into every occurrence", "f(x)=x^2-x: f(2x)", "2x^2-2x", "(2x)^2-2x", "2x^2-2x", "invalid",
  "x=1: 2 vs 0", d="easy", pair="fun-f2x")
F("composing exponential and quadratic", "order of composition", "f(x)=e^x, g(x)=x^2: f(g(x))", "e^(x^2)", "e^(x^2)", "e^(x^2)",
  "valid-equivalence", "e raised to g(x)", pair="fun-ex2")
F("e^(x^2) is not (e^x)^2", "order of composition", "f(x)=e^x, g(x)=x^2: f(g(x))", "(e^x)^2", "e^(x^2)", "(e^x)^2", "invalid",
  "(e^x)^2=e^(2x) = g(f(x)); x=1: e vs e^2", pair="fun-ex2")
F("composing log and a product", "logarithm laws in composition", "f(x)=ln(x), g(x)=e^(2x)+e^x: f(g(x))", "x+ln(e^x+1)",
  "ln(e^(2x)+e^x)", "x+ln(e^x+1)", "valid-equivalence", "e^(2x)+e^x=e^x(e^x+1) and both factors are positive", d="hard", c=3,
  composition=True)

# ============================================================ inverse functions
F("composition with the true inverse is the identity", "inverse verification", "f(x)=2x+3, f⁻¹(x)=(x-3)/2: f(f⁻¹(x))", "x",
  "2((x-3)/2)+3", "x", "valid-equivalence", "x-3+3", d="easy", pair="fun-inv1")
F("the reciprocal is not the inverse function", "inverse verification", "f(x)=2x+3, 'f⁻¹(x)=1/(2x+3)': f(f⁻¹(x))", "x",
  "2/(2x+3)+3", "x", "invalid", "x=0: 2/3+3=11/3, not 0", d="easy", pair="fun-inv1")
F("undoing operations in the wrong order", "inverse verification", "f(x)=2x+3, 'f⁻¹(x)=x/2-3': f(f⁻¹(x))", "x",
  "2(x/2-3)+3", "x", "invalid", "2(x/2-3)+3=x-3", d="easy")
F("inverse of a Möbius map", "inverse verification with domains", "f(x)=(x+1)/(x-2), f⁻¹(x)=(2x+1)/(x-1): f(f⁻¹(x))", "x",
  "((2x+1)/(x-1)+1)/((2x+1)/(x-1)-2)", "x", "domain-violation",
  "numerator 3x/(x-1), denominator 3/(x-1): equals x but only for x != 1", d="hard", c=3, pair="fun-inv2")
F("inverse of a Möbius map (x != 1 stated)", "inverse verification with domains",
  "f(x)=(x+1)/(x-2), f⁻¹(x)=(2x+1)/(x-1): f(f⁻¹(x)), x ≠ 1", "x", "((2x+1)/(x-1)+1)/((2x+1)/(x-1)-2)", "x",
  "valid-equivalence", "x != 1 is the range restriction", d="hard", c=3, assumptions=["x != 1"], pair="fun-inv2")
F("swapping numerator and denominator is not inverting", "inverse verification with domains",
  "f(x)=(x+1)/(x-2), 'f⁻¹(x)=(x-2)/(x+1)': f(f⁻¹(x))", "x", "((x-2)/(x+1)+1)/((x-2)/(x+1)-2)", "x", "invalid",
  "x=0: (-2+1)/(-2-2)=1/4, not 0", d="hard", c=3, pair="fun-inv2")
F("a self-inverse rational function", "inverse verification with domains", "f(x)=x/(x-1): f(f(x))", "x",
  "(x/(x-1))/(x/(x-1)-1)", "x", "domain-violation", "x/(x-1)-1=1/(x-1); result x, but x=1 is excluded on the left",
  c=3)
F("inverse of a cube function", "inverse verification", "f(x)=x^3+1, f⁻¹(x)=cbrt(x-1): f(f⁻¹(x))", "x", "cbrt(x-1)^3+1", "x",
  "valid-equivalence", "real cube root is a bijection on all reals", c=2, pair="fun-inv3")
F("inverse of a cube function: shift on the wrong side", "inverse verification", "f(x)=x^3+1, 'f⁻¹(x)=cbrt(x)-1': f(f⁻¹(x))",
  "x", "(cbrt(x)-1)^3+1", "x", "invalid", "x=8: (2-1)^3+1=2", c=2, pair="fun-inv3")
E("real cube root undoes cubing for all reals", "inverse-function identity", "cbrt(x^3)", "x", "valid-equivalence",
  "odd root of an odd power, no sign loss", d="easy")
E("fractional power of a cube", "inverse-function identity with domain", "(x^(1/3))^3", "x", "valid-equivalence",
  "x^(1/3) is read as the real cube root (defined for all x) and cubing undoes it",
  d="medium", pair="fun-third")
E("fourth power of a fourth root", "inverse-function identity with domain", "(x^(1/4))^4", "x", "domain-violation",
  "x^(1/4) needs x>=0, x does not", pair="fun-third")
E("fourth root of a fourth power", "inverse-function identity with domain", "(x^4)^(1/4)", "|x|", "valid-equivalence",
  "principal even root", d="easy")
E("ln after exp", "inverse-function identity", "ln(e^x)", "x", "valid-equivalence", "exp is injective with inverse ln",
  d="easy")
E("exp after ln needs x>0", "inverse-function identity with domain", "e^(ln(x))", "x", "domain-violation", "defined only for x>0",
  d="easy", pair="fun-eln")
E("exp after ln with x>0 stated", "assumption-aware equivalence", "e^(ln(x))", "x", "valid-equivalence", "x>0 stated",
  assumptions=["x > 0"], d="easy", pair="fun-eln")
E("base-2 exponential after base-2 logarithm", "inverse-function identity with domain", "2^(log2(x))", "x", "domain-violation",
  "defined only for x>0")
E("base-10 log after base-10 exponential", "inverse-function identity", "log10(10^x)", "x", "valid-equivalence",
  "inverse pair on all reals", d="easy")
E("exponent of a log sum", "inverse identity combined with log laws", "e^(ln(x)+ln(2))", "2x", "domain-violation",
  "e^(ln x)e^(ln 2)=2x only for x>0", c=2, composition=True)
E("power of e of a scaled log", "inverse identity combined with log laws", "e^(2ln(x))", "x^2", "domain-violation",
  "(e^(ln x))^2 = x^2 only for x>0", c=2, pair="fun-e2l")
E("power of e of a scaled log is not 2x", "inverse identity combined with log laws", "e^(2ln(x))", "2x", "invalid",
  "x=1: 1 vs 2", c=2, pair="fun-e2l")
E("shifted base-10 identity", "inverse identity combined with log laws", "10^(log10(x)+1)", "10x", "domain-violation",
  "10*10^(log10 x)=10x for x>0", c=2)
E("sine after arcsine", "inverse-function identity with domain", "sin(asin(x))", "x", "domain-violation",
  "asin needs -1<=x<=1", pair="fun-asin")
E("arcsine after sine is not the identity", "inverse-function identity with domain", "asin(sin(x))", "x", "invalid",
  "x=pi: asin(0)=0 != pi", pair="fun-asin")
E("tangent after arctangent", "inverse-function identity", "tan(atan(x))", "x", "valid-equivalence",
  "atan maps R into (-pi/2, pi/2) where tan is defined", d="easy", pair="fun-atan")
E("arctangent after tangent is not the identity", "inverse-function identity with domain", "atan(tan(x))", "x", "invalid",
  "x=pi: atan(0)=0", pair="fun-atan")
E("cosine after arccosine", "inverse-function identity with domain", "cos(acos(x))", "x", "domain-violation",
  "acos needs |x|<=1")
E("square of a square root", "inverse-function identity with domain", "sqrt(x)^2", "x", "domain-violation",
  "sqrt(x) needs x>=0", d="easy", pair="fun-sqrt2")
E("square of a square root with x>=0", "assumption-aware equivalence", "sqrt(x)^2", "x", "valid-equivalence", "x>=0 stated",
  assumptions=["x >= 0"], d="easy", pair="fun-sqrt2")
E("square root of a squared binomial", "inverse-function identity", "sqrt((x-3)^2)", "x-3", "invalid", "x=0: 3 vs -3",
  pair="fun-sqb")
E("square root of a squared binomial", "inverse-function identity", "sqrt((x-3)^2)", "|x-3|", "valid-equivalence",
  "principal root", pair="fun-sqb")

# ============================================================ even / odd / periodic
E("sine is odd", "parity identity", "sin(-x)", "-sin(x)", "valid-equivalence", "sin is odd", d="easy", pair="fun-sinodd")
E("sine is not even", "parity identity", "sin(-x)", "sin(x)", "invalid", "x=pi/2: -1 vs 1", d="easy", pair="fun-sinodd")
E("cosine is even", "parity identity", "cos(-x)", "cos(x)", "valid-equivalence", "cos is even", d="easy")
E("product of two odd functions is even", "parity identity", "(-x)sin(-x)", "x sin(x)", "valid-equivalence",
  "(-x)(-sin x)", pair="fun-oddodd")
E("product of two odd functions is even, not odd", "parity identity", "(-x)sin(-x)", "-x sin(x)", "invalid",
  "x=pi/2: pi/2 vs -pi/2", pair="fun-oddodd")
F("odd polynomial: f(-x)=-f(x)", "parity identity", "f(x)=x^3-x: f(-x)", "-f(x)", "(-x)^3-(-x)", "-(x^3-x)",
  "valid-equivalence", "-x^3+x", d="easy", pair="fun-oddpoly")
F("odd polynomial is not even", "parity identity", "f(x)=x^3-x: f(-x)", "f(x)", "(-x)^3-(-x)", "x^3-x", "invalid",
  "x=2: -6 vs 6", d="easy", pair="fun-oddpoly")
F("a polynomial with mixed powers is neither even nor odd", "parity identity", "f(x)=x^2+x: f(-x)", "f(x)", "(-x)^2+(-x)",
  "x^2+x", "invalid", "x=1: 0 vs 2", d="easy")
F("hyperbolic cosine is even", "parity identity", "f(x)=(e^x+e^(-x))/2: f(-x)", "f(x)", "(e^(-x)+e^(x))/2",
  "(e^x+e^(-x))/2", "valid-equivalence", "the two terms swap", pair="fun-cosh")
F("hyperbolic sine is odd", "parity identity", "f(x)=(e^x-e^(-x))/2: f(-x)", "f(x)", "(e^(-x)-e^(x))/2", "(e^x-e^(-x))/2",
  "invalid", "f(-x)=-f(x), and f(1) != 0", pair="fun-cosh")
F("composition of an odd function inside an even one is even", "parity identity", "g(x)=cos(x^3): g(-x)", "g(x)",
  "cos((-x)^3)", "cos(x^3)", "valid-equivalence", "(-x)^3=-x^3 and cos is even", c=2, composition=True)
F("absolute value of an odd function is even", "parity identity", "h(x)=|x^3-x|: h(-x)", "h(x)", "|(-x)^3-(-x)|", "|x^3-x|",
  "valid-equivalence", "|-(x^3-x)|=|x^3-x|", c=2)
F("x|x| is odd", "parity identity", "f(x)=x|x|: f(-x)", "-x|x|", "(-x)|-x|", "-x|x|", "valid-equivalence", "|-x|=|x|",
  pair="fun-xabs")
F("x|x| is not even", "parity identity", "f(x)=x|x|: f(-x)", "x|x|", "(-x)|-x|", "x|x|", "invalid", "x=1: -1 vs 1",
  pair="fun-xabs")
E("sine has period 2pi", "periodicity", "sin(x+2pi)", "sin(x)", "valid-equivalence", "period 2pi", d="easy", pair="fun-per1")
E("pi is a half period of sine", "periodicity", "sin(x+pi)", "sin(x)", "invalid", "sin(x+pi)=-sin x; x=pi/2", d="easy",
  pair="fun-per1")
E("a half-period shift of sine negates it", "periodicity", "sin(x+pi)", "-sin(x)", "valid-equivalence", "addition formula",
  d="easy", pair="fun-per1")
E("tangent has period pi", "periodicity", "tan(x+pi)", "tan(x)", "valid-equivalence", "period pi; same excluded points")
E("horizontal stretch changes the period", "periodicity under composition", "sin((x+2pi)/2)", "sin(x/2)", "invalid",
  "sin(x/2+pi)=-sin(x/2); the period of sin(x/2) is 4pi", c=2, pair="fun-per2")
E("horizontal compression changes the period", "periodicity under composition", "sin(2(x+pi))", "sin(2x)", "valid-equivalence",
  "sin(2x+2pi)", c=2, pair="fun-per2")
E("cosine shifted by pi", "periodicity", "cos(x+pi)", "-cos(x)", "valid-equivalence", "half-period shift negates cosine", d="easy")
E("square of sine has period pi", "periodicity under composition", "sin(x+pi)^2", "sin(x)^2", "valid-equivalence",
  "(-sin x)^2", c=2)
E("a periodic function composed with a non-linear map is not periodic", "periodicity under composition", "sin((x+2pi)^2)",
  "sin(x^2)", "invalid", "x=0: sin(4pi^2) != 0", d="hard", c=2)

# ============================================================ piecewise / absolute value
E("|x| on x>0", "piecewise identity on a restricted domain", "|x|", "x", "valid-equivalence", "x>0 stated",
  assumptions=["x > 0"], d="easy", pair="fun-abs1")
E("|x| is not x on the whole line", "piecewise identity on a restricted domain", "|x|", "x", "invalid", "x=-1", d="easy",
  pair="fun-abs1")
E("|x| on x<0", "piecewise identity on a restricted domain", "|x|", "-x", "valid-equivalence", "x<0 stated",
  assumptions=["x < 0"], d="easy")
E("positive part (x+|x|)/2 on x>0", "piecewise identity on a restricted domain", "(x+|x|)/2", "x", "valid-equivalence",
  "x>0 stated", assumptions=["x > 0"], pair="fun-pos")
E("positive part (x+|x|)/2 on x<0", "piecewise identity on a restricted domain", "(x+|x|)/2", "0", "valid-equivalence",
  "x<0: (x-x)/2", assumptions=["x < 0"], pair="fun-pos")
E("positive part is not x everywhere", "piecewise identity on a restricted domain", "(x+|x|)/2", "x", "invalid", "x=-2: 0 vs -2",
  pair="fun-pos")
E("sign function on the positive axis", "piecewise identity on a restricted domain", "|x|/x", "1", "valid-equivalence",
  "x>0 stated", assumptions=["x > 0"], d="easy")
E("absolute value is multiplicative", "absolute-value identity", "|x||x-1|", "|x^2-x|", "valid-equivalence", "|ab|=|a||b|",
  pair="fun-absmul")
E("absolute value is not additive", "absolute-value identity", "|x|+|x-1|", "|2x-1|", "invalid",
  "x=1/2: 1 vs 0 (triangle inequality is strict there)", pair="fun-absmul")
E("absolute value of a square", "absolute-value identity", "|x|^2", "x^2", "valid-equivalence", "|x|^2=x^2", d="easy")
E("absolute value of a cube", "absolute-value identity", "|x^3|", "x^2|x|", "valid-equivalence", "|x|^3=x^2|x|")
E("absolute value of a difference of squares", "absolute-value identity", "|x^2-1|", "x^2-1", "invalid", "x=0: 1 vs -1")
E("absolute value inside a log", "absolute-value identity with domain", "ln(|-x|)", "ln(|x|)", "valid-equivalence",
  "|-x|=|x|; both exclude x=0")
S("|x-3|=x-3 holds exactly when x>=3", "set where a piecewise identity holds", "|x-3|=x-3", "x>=3", "valid-equivalence",
  "|a|=a iff a>=0")
S("|x^2-4|=x^2-4 holds outside (-2,2)", "set where a piecewise identity holds", "|x^2-4|=x^2-4", "x<=-2 or x>=2",
  "valid-equivalence", "x^2-4>=0")
S("|x+1|+|x-1|=2 on the segment", "set where a piecewise identity holds", "|x+1|+|x-1|=2", "-1<=x<=1", "valid-equivalence",
  "sum of distances to ±1 equals 2 only between them", c=3, pair="fun-seg")
S("|x+1|+|x-1|=2 on the segment, endpoints matter", "set where a piecewise identity holds", "|x+1|+|x-1|=2", "-1<x<1", "invalid",
  "x=1: 2+0=2, so the endpoint is a solution", c=3, pair="fun-seg")
S("|x|=-x includes zero", "set where a piecewise identity holds", "|x|=-x", "x<=0", "valid-equivalence", "|a|=-a iff a<=0",
  pair="fun-negabs")
S("|x|=-x includes zero (strict inequality loses it)", "set where a piecewise identity holds", "|x|=-x", "x<0", "invalid",
  "x=0 satisfies |0|=-0", pair="fun-negabs")
S("piecewise definition rewritten as cases", "case-scope propagation", "x<0 and x^2=4 or x>=0 and 2x+1=4", "x=-2 or x=3/2",
  "valid-equivalence", "branch x<0 keeps -2 only; branch x>=0 gives 3/2", c=3, pair="fun-pw")
S("piecewise case: a root outside its branch is kept", "case-scope propagation", "x<0 and x^2=4 or x>=0 and 2x+1=4",
  "x=-2 or x=2 or x=3/2", "invalid", "x=2 lies in the x>=0 branch, where 2*2+1=5 != 4", c=3, pair="fun-pw")

# ============================================================ exponential / logarithm laws
E("log of a product (positive factors)", "logarithm laws with domains", "ln(x(x-1))", "ln(x)+ln(x-1)", "invalid",
  "at x=-1 the left is ln 2, the right is undefined", c=2, pair="fun-lprod")
E("log of a product with x>1 stated", "logarithm laws with domains", "ln(x(x-1))", "ln(x)+ln(x-1)", "valid-equivalence",
  "both factors positive for x>1", assumptions=["x > 1"], c=2, pair="fun-lprod")
E("log of a quotient", "logarithm laws with domains", "ln((x-1)/(x+1))", "ln(x-1)-ln(x+1)", "invalid",
  "x=-2: ln 3 on the left, undefined on the right", c=2, pair="fun-lquot")
E("log of a quotient with x>1 stated", "logarithm laws with domains", "ln((x-1)/(x+1))", "ln(x-1)-ln(x+1)", "valid-equivalence",
  "x>1 makes both positive", assumptions=["x > 1"], c=2, pair="fun-lquot")
E("log of an even power loses negative x", "logarithm laws with domains", "ln(x^2)", "2ln(x)", "invalid",
  "x=-1: ln 1=0 on the left, ln(-1) undefined", pair="fun-lsq")
E("log of an even power with x>0", "logarithm laws with domains", "ln(x^2)", "2ln(x)", "valid-equivalence", "x>0 stated",
  assumptions=["x > 0"], pair="fun-lsq")
E("log of an odd power with x>0", "logarithm laws with domains", "ln(x^3)", "3ln(x)", "valid-equivalence",
  "x^3>0 iff x>0, so the domains already coincide", assumptions=["x > 0"])
E("log of a sum is not a sum of logs", "logarithm laws", "log10(x+10)", "log10(x)+1", "invalid",
  "x=-5: log10(5) defined, log10(-5) not; x=10: log10(20) vs 2")
E("log of a scaled argument", "logarithm laws", "log10(1000x)", "3+log10(x)", "valid-equivalence", "log10 1000=3; both x>0",
  d="easy")
E("change of base", "logarithm laws", "ln(x)/ln(2)", "log2(x)", "valid-equivalence", "log_b x = ln x/ln b", d="easy")
E("log of a power of a constant", "logarithm laws", "ln(8)", "3ln(2)", "valid-equivalence", "8=2^3", d="easy",
  pair="fun-ln8")
E("a product of logs is not the log of a product", "logarithm laws", "ln(2)ln(4)", "ln(8)", "invalid",
  "ln2*ln4=2(ln2)^2≈0.96, ln8≈2.08", d="easy", pair="fun-ln8")
E("log of a square root of an exponential", "logarithm laws", "ln(sqrt(e^x))", "x/2", "valid-equivalence",
  "sqrt(e^x)=e^(x/2)>0", d="easy")
E("exponential with a log coefficient", "exponential laws", "e^(x ln(2))", "2^x", "valid-equivalence", "(e^(ln 2))^x")
E("exponential of a double", "exponential laws", "e^(2x)", "(e^x)^2", "valid-equivalence", "(e^x)^2=e^(2x)", d="easy")
E("log difference collapses on the common domain", "logarithm laws with domains", "ln(x^2)-ln(x)", "ln(x)", "valid-equivalence",
  "ln(x) forces x>0, where ln(x^2)=2ln x", c=2)
E("bare log is ambiguous", "ambiguous notation", "log(1000)", "3", "insufficient-information",
  "true in base 10, false in base e", d="easy")

# ============================================================ statements: identities holding on part of the domain
S("sqrt(x^2)=x exactly for x>=0", "set where an identity holds", "sqrt(x^2)=x", "x>=0", "valid-equivalence", "|x|=x iff x>=0",
  pair="fun-part1")
S("sqrt(x^2)=x: strict inequality loses zero", "set where an identity holds", "sqrt(x^2)=x", "x>0", "invalid", "x=0 is a solution",
  pair="fun-part1")
S("ln(x^2)=2ln(x) only for x>0", "set where an identity holds", "ln(x^2)=2ln(x)", "x>0", "valid-equivalence",
  "2ln x needs x>0, and there the law holds")
S("e^(ln x)=x only for x>0", "set where an identity holds", "e^(ln(x))=x", "x>0", "valid-equivalence", "domain of ln")
S("cancellation identity holds off the hole", "set where an identity holds", "(x^2-1)/(x-1)=x+1", "x != 1",
  "valid-equivalence", "equal wherever the left is defined", notation="unfamiliar", oracle_next="x!=1")
S("product of roots equals root of product for x>=1", "set where an identity holds", "sqrt(x)sqrt(x-1)=sqrt(x^2-x)", "x>=1",
  "valid-equivalence", "for x<=0 the left side is undefined; for x>=1 both agree", c=3)
S("an identity checked at one point is not an identity", "set where an identity holds", "ln(x^2)=2", "2ln(x)=2", "invalid",
  "x=-e solves the first but not the second", pair="fun-l2")
S("an identity checked at one point is not an identity", "set where an identity holds", "ln(x^2)=2", "2ln(|x|)=2",
  "valid-equivalence", "ln(x^2)=2ln|x| for x != 0", pair="fun-l2")

# ============================================================ function equations (solve f(x)=k)
def Ws(principle, invariant, stmt, lines, rel, why, answer, ol=None, d="medium", c=None, **k):
    c = c or min(5, max(2, len(lines)))
    return W(C, principle, invariant, {"type": "solve", "statement": stmt}, lines, rel, why=why, answer=answer, oracle_lines=ol,
             difficulty=d, complexity=c, domain="functions", **k)


Ws("solving an exponential equation", "solution-set preservation", "2^x+1=9", ["f(x)=9 means 2^x+1=9", "2^x=8", "x=3"],
   "valid-equivalence", "2^x is injective", "x=3", ol=["2^x+1=9", "2^x=8", "x=3"], d="easy", notation="unfamiliar",
   pair="fun-s1")
Ws("solving an exponential equation", "solution-set preservation", "2^x+1=9", ["2^x=8", "x=4"], "invalid", "2^4=16",
   "x=3", d="easy", pair="fun-s1")
Ws("log equation: product law then check", "extraneous-root obligation", "ln(x)+ln(x-1)=ln(6)",
   ["ln(x(x-1))=ln(6)", "x^2-x-6=0", "x=3 or x=-2", "check: x=-2 makes ln(x) undefined, reject", "x=3"], "valid-implication",
   "combining the logs widens the domain; the extraneous root is rejected", "x=3",
   ol=["ln(x(x-1))=ln(6)", "x^2-x-6=0", "x=3 or x=-2", None, "x=3"], c=4, pair="fun-s2")
Ws("log equation: extraneous root kept", "extraneous-root obligation", "ln(x)+ln(x-1)=ln(6)",
   ["ln(x(x-1))=ln(6)", "x^2-x-6=0", "x=3 or x=-2"], "invalid", "x=-2 is outside the domain of ln(x)", "x=3", c=3,
   pair="fun-s2")
Ws("log equation: extraneous root dropped silently", "extraneous-root obligation", "ln(x)+ln(x-1)=ln(6)",
   ["ln(x(x-1))=ln(6)", "x^2-x-6=0", "x=3"], "domain-violation", "the answer is right but -2 is discarded with no reason", "x=3",
   c=3, pair="fun-s2")
Ws("log equation with base change", "extraneous-root obligation", "ln(x)+ln(x-2)=ln(8)",
   ["x(x-2)=8", "(x-4)(x+2)=0", "x=4 or x=-2", "x=-2 is not in the domain (x>2), reject", "x=4"], "valid-implication",
   "domain x>2", "x=4", ol=["x(x-2)=8", "(x-4)(x+2)=0", "x=4 or x=-2", None, "x=4"], c=4)
Ws("quadratic in e^x", "substitution u=e^x", "e^(2x)-3e^x+2=0", ["(e^x-1)(e^x-2)=0", "e^x=1 or e^x=2", "x=0 or x=ln(2)"],
   "valid-equivalence", "both values of e^x are positive", "x=0 or x=ln 2", c=3, pair="fun-s3")
Ws("quadratic in e^x: solving for u but not for x", "substitution u=e^x", "e^(2x)-3e^x+2=0",
   ["(e^x-1)(e^x-2)=0", "x=1 or x=2"], "invalid", "e^x=1 gives x=0, not 1", "x=0 or x=ln 2", c=2, pair="fun-s3")
Ws("quadratic in 2^x with an impossible branch", "substitution u=2^x", "4^x-2^(x+1)-8=0",
   ["(2^x)^2-2·2^x-8=0", "(2^x-4)(2^x+2)=0", "2^x=4 or 2^x=-2", "2^x=-2 is impossible", "x=2"], "valid-equivalence",
   "2^x>0 so only 2^x=4", "x=2", ol=["(2^x)^2-2*2^x-8=0", "(2^x-4)(2^x+2)=0", "2^x=4 or 2^x=-2", None, "x=2"], d="hard", c=5,
   composition=True, pair="fun-s4")
Ws("quadratic in 2^x: impossible branch turned into a root", "substitution u=2^x", "4^x-2^(x+1)-8=0",
   ["(2^x-4)(2^x+2)=0", "x=2 or x=-1"], "invalid", "2^(-1)=1/2, not -2; x=-1 gives 1/4-1-8 != 0", "x=2", d="hard", c=3,
   pair="fun-s4")
Ws("radical equation: square and check", "extraneous-root obligation", "sqrt(x+3)=x-3",
   ["x+3=x^2-6x+9", "x^2-7x+6=0", "x=1 or x=6", "check x=1: sqrt(4)=2 but 1-3=-2, reject", "x=6"], "valid-implication",
   "squaring introduced x=1", "x=6", ol=["x+3=x^2-6x+9", "x^2-7x+6=0", "x=1 or x=6", None, "x=6"], c=4, pair="fun-s5")
Ws("radical equation: no check", "extraneous-root obligation", "sqrt(x+3)=x-3", ["x+3=x^2-6x+9", "x^2-7x+6=0", "x=1 or x=6"],
   "invalid", "x=1 fails the original", "x=6", c=3, pair="fun-s5")
Ws("absolute value equation: both cases", "case completeness", "|2x-1|=5", ["2x-1=5 or 2x-1=-5", "x=3 or x=-2"],
   "valid-equivalence", "|a|=5 iff a=±5", "x=3 or x=-2", d="easy", pair="fun-s6")
Ws("absolute value equation: one case forgotten", "case completeness", "|2x-1|=5", ["2x-1=5", "x=3"], "invalid",
   "x=-2 is lost", "x=3 or x=-2", d="easy", pair="fun-s6")
Ws("equal absolute values: squaring both non-negative sides", "solution-set preservation", "|x-2|=|x+1|",
   ["(x-2)^2=(x+1)^2", "-4x+4=2x+1", "x=1/2"], "valid-equivalence", "squaring non-negative quantities is reversible", "x=1/2", c=3)
Ws("quadratic function equal to a value", "solution-set preservation", "x^2-4x=5",
   ["f(x)=x^2-4x, f(x)=5", "x^2-4x-5=0", "(x-5)(x+1)=0", "x=5 or x=-1"], "valid-equivalence", "factorisation", "x=5 or x=-1",
   ol=[None, "x^2-4x-5=0", "(x-5)(x+1)=0", "x=5 or x=-1"], d="easy", notation="unfamiliar")
Ws("rational function value never attained", "empty solution set", "(2x+1)/(x-3)=2",
   ["x ≠ 3", "2x+1=2x-6", "1=-6, impossible", "no solution"], "valid-equivalence", "2 is the horizontal asymptote value", "no solution",
   ol=["restrict: x != 3", "2x+1=2x-6", "claim: 1=-6", "empty"], c=4)
Ws("solving f(x)=x for a self-map", "solution-set preservation", "x/(x-1)=x",
   ["x ≠ 1", "x=x(x-1)", "x^2-2x=0", "x=0 or x=2"], "valid-equivalence", "both are allowed (neither is 1)", "x=0 or x=2",
   ol=["restrict: x != 1", "x=x(x-1)", "x^2-2x=0", "x=0 or x=2"], c=4, pair="fun-s7")
Ws("solving f(x)=x: dividing by x loses a root", "solution-set preservation under division", "x/(x-1)=x",
   ["x ≠ 1", "1/(x-1)=1", "x=2"], "invalid", "dividing by x lost x=0", "x=0 or x=2",
   ol=["restrict: x != 1", "1/(x-1)=1", "x=2"], c=3, pair="fun-s7")
Ws("|x|/x=1 holds only for positive x", "set where an identity holds", "|x|/x=1", ["x>0"], "valid-equivalence",
   "x=0 is excluded by the denominator", "x>0", d="easy", pair="fun-s8")
Ws("|x|/x=1 does not hold at zero", "set where an identity holds", "|x|/x=1", ["x>=0"], "invalid", "x=0 is not in the domain",
   "x>0", d="easy", pair="fun-s8")
Ws("logarithmic equation with a power", "domain of a log equation", "ln(x^2)=2",
   ["2ln(x)=2", "x=e"], "invalid", "ln(x^2)=2 iff x=±e; the power law needs x>0 and loses -e", "x=e or x=-e", c=2,
   pair="fun-s9")
Ws("logarithmic equation with a power, absolute value kept", "domain of a log equation", "ln(x^2)=2",
   ["2ln(|x|)=2", "|x|=e", "x=e or x=-e"], "valid-equivalence", "ln(x^2)=2ln|x|", "x=e or x=-e", c=3, pair="fun-s9")
Ws("piecewise function equals a value", "case-scope propagation", "x<0 and x^2=4 or x>=0 and 2x+1=4",
   ["case x<0: x^2=4 gives x=-2 (x=2 is not in this case)", "case x≥0: 2x+1=4 gives x=3/2", "x=-2 or x=3/2"],
   "valid-equivalence", "each root checked against its case", "x=-2 or x=3/2",
   ol=["scope x<0 | x=-2", "scope x>=0 | x=3/2", "x=-2 or x=3/2"], c=4, notation="unfamiliar", pair="fun-s10")
Ws("piecewise function: root outside its case kept", "case-scope propagation", "x<0 and x^2=4 or x>=0 and 2x+1=4",
   ["case x<0: x^2=4 gives x=±2", "case x≥0: 2x+1=4 gives x=3/2", "x=2 or x=-2 or x=3/2"], "invalid",
   "x=2 is not in the x<0 case", "x=-2 or x=3/2", ol=["scope x<0 | x=2 or x=-2", "scope x>=0 | x=3/2", "x=2 or x=-2 or x=3/2"],
   c=4, notation="unfamiliar", pair="fun-s10")
Ws("exponential equation with different bases", "solution-set preservation", "2^(x+1)=3^x",
   ["(x+1)ln(2)=x ln(3)", "x(ln(3)-ln(2))=ln(2)", "x=ln(2)/(ln(3)-ln(2))"], "valid-equivalence",
   "taking ln of positive sides is reversible", "x=ln 2/(ln 3-ln 2)", d="hard", c=3)
Ws("solving with an inverse that needs a domain", "solution-set preservation", "sqrt(x)^2=4", ["x=4"], "valid-equivalence",
   "x>=0 and x=4", "x=4", d="easy")

# ============================================================ show-that / simplify workings
def Wx(principle, invariant, typ, start, lines, rel, why, answer, ol=None, target=None, d="medium", c=None, **k):
    task = {"type": typ, "start": start}
    if target:
        task["target"] = target
    c = c or min(5, max(2, len(lines)))
    return W(C, principle, invariant, task, lines, rel, why=why, answer=answer, oracle_lines=ol, difficulty=d, complexity=c,
             domain="functions", **k)


Wx("verifying an inverse by composition", "inverse verification chain", "show", "((2x+3)-3)/2",
   ["f(g(x)) = ((2x+3)-3)/2", "= 2x/2", "= x"], "valid-equivalence", "f(x)=(x-3)/2, g(x)=2x+3", "x", target="x",
   ol=["((2x+3)-3)/2", "2x/2", "x"], notation="unfamiliar", d="easy", pair="fun-w-inv")
Wx("verifying an inverse by composition: arithmetic slip", "inverse verification chain", "show", "((2x+3)-3)/2",
   ["f(g(x)) = ((2x+3)-3)/2", "= (2x-6)/2", "= x-3"], "invalid", "(2x+3)-3=2x", "x", target="x",
   ol=["((2x+3)-3)/2", "(2x-6)/2", "x-3"], notation="unfamiliar", d="easy", pair="fun-w-inv")
Wx("self-inverse function, restriction omitted", "excluded-value obligation", "show", "(x/(x-1))/(x/(x-1)-1)",
   ["f(f(x)) = (x/(x-1))/(x/(x-1)-1)", "= (x/(x-1))/(1/(x-1))", "= x"], "domain-violation",
   "f(f(x)) is undefined at x=1 but the conclusion 'f(f(x))=x' is stated for all x", "x (x != 1)", target="x",
   ol=["(x/(x-1))/(x/(x-1)-1)", "(x/(x-1))/(1/(x-1))", "x"], notation="unfamiliar", c=3, pair="fun-w-self")
Wx("self-inverse function, restriction stated", "excluded-value obligation", "show", "(x/(x-1))/(x/(x-1)-1)",
   ["for x ≠ 1:", "f(f(x)) = (x/(x-1))/(x/(x-1)-1)", "= (x/(x-1))/(1/(x-1))", "= x"], "valid-equivalence",
   "x=1 excluded explicitly", "x (x != 1)", target="x",
   ol=["restrict: x != 1", "(x/(x-1))/(x/(x-1)-1)", "(x/(x-1))/(1/(x-1))", "x"], notation="unfamiliar", c=4, pair="fun-w-self")
Wx("hyperbolic identity from exponentials", "show-that identity chain", "show", "((e^x+e^(-x))/2)^2-((e^x-e^(-x))/2)^2",
   ["(e^(2x)+2+e^(-2x))/4-(e^(2x)-2+e^(-2x))/4", "4/4", "1"], "valid-equivalence", "cosh^2-sinh^2=1", "1", target="1",
   d="hard", c=3, pair="fun-w-cosh")
Wx("hyperbolic identity: cross term sign", "show-that identity chain", "show", "((e^x+e^(-x))/2)^2-((e^x-e^(-x))/2)^2",
   ["(e^(2x)+e^(-2x))/4-(e^(2x)+e^(-2x))/4", "0"], "invalid", "e^x*e^(-x)=1 cross terms dropped: the value is 1, not 0", "1",
   target="1", d="hard", c=3, pair="fun-w-cosh")
Wx("proving a function is odd", "parity proof chain", "show", "(-x)^3+(-x)",
   ["f(-x) = (-x)^3+(-x)", "= -x^3-x", "= -(x^3+x)", "= -f(x)"], "valid-equivalence", "odd powers change sign", "-(x^3+x)",
   target="-(x^3+x)", ol=["(-x)^3+(-x)", "-x^3-x", "-(x^3+x)", None], notation="unfamiliar", d="easy", pair="fun-w-odd")
Wx("proving a function is odd: (-x)^3 sign error", "parity proof chain", "show", "(-x)^3+(-x)",
   ["f(-x) = (-x)^3+(-x)", "= x^3-x", "so f is neither even nor odd"], "invalid", "(-x)^3=-x^3", "-(x^3+x)",
   target="-(x^3+x)", ol=["(-x)^3+(-x)", "x^3-x", None], notation="unfamiliar", d="easy", pair="fun-w-odd")
Wx("exponent of a log sum, domain omitted", "excluded-value obligation", "simplify", "e^(ln(x)+ln(3))",
   ["e^(ln(3x))", "3x"], "domain-violation", "valid only for x>0, never stated", "3x, x > 0", c=2, pair="fun-w-elog")
Wx("exponent of a log sum, domain stated", "excluded-value obligation", "simplify", "e^(ln(x)+ln(3))",
   ["x > 0 for ln(x)", "e^(ln(3x))", "3x"], "valid-equivalence", "x>0 stated", "3x, x > 0",
   ol=["restrict: x > 0", "e^(ln(3x))", "3x"], c=3, pair="fun-w-elog")
Wx("exponent of a log sum read as a sum", "logarithm laws in a chain", "simplify", "e^(ln(x)+ln(3))", ["x+3"], "invalid",
   "e^(a+b)=e^a e^b, a product (x=1: 3 vs 4)", "3x, x > 0", pair="fun-w-elog")
Wx("difference of logs of exponentials", "inverse identity chain", "simplify", "ln(e^(3x))-ln(e^x)", ["3x-x", "2x"],
   "valid-equivalence", "ln(e^u)=u for all u", "2x", d="easy", pair="fun-w-lnexp")
Wx("difference of logs of exponentials: quotient confusion", "inverse identity chain", "simplify", "ln(e^(3x))-ln(e^x)",
   ["ln(e^(3x)-e^x)"], "invalid", "ln a - ln b = ln(a/b), not ln(a-b); also ln(e^(3x)-e^x) is undefined at x=0",
   "2x", d="easy", pair="fun-w-lnexp")
Wx("evaluating logs in several bases", "log evaluation", "evaluate", "log2(8)+log10(0.01)", ["3+(-2)", "1"],
   "valid-equivalence", "2^3=8, 10^(-2)=0.01", "1", d="easy", pair="fun-w-log")
Wx("evaluating a log of a decimal", "log evaluation", "evaluate", "log2(8)+log10(0.01)", ["3+(-1/2)", "5/2"], "invalid",
   "log10(0.01)=-2", "1", d="easy", pair="fun-w-log")
Wx("evaluating a composition at a point", "composition evaluation", "evaluate", "(3-2)^2-1",
   ["g(2)=3-2=1", "f(g(2))=f(1)=1^2-1", "0"], "valid-equivalence", "f(x)=x^2-1, g(x)=3-x", "0",
   ol=["(1)^2-1", "1^2-1", "0"], notation="unfamiliar", d="easy", pair="fun-w-comp")
Wx("evaluating a composition in the wrong order", "composition evaluation", "evaluate", "(3-2)^2-1",
   ["f(2)=2^2-1=3", "g(f(2))=g(3)=3-3", "0"], "wrong-reason",
   "the value 0 coincides (f(g(2))=g(f(2))=0) but the student evaluated g∘f instead of f∘g",
   "0", ol=["3-3", "3-3", "0"], notation="unfamiliar", d="medium")
Wx("square of a root plus root of a square, domain dropped then used", "excluded-value obligation", "simplify",
   "sqrt(x)^2+sqrt(x^2)", ["x+|x|", "2x"], "domain-violation",
   "2x is right only on x>=0 (the natural domain), but the step x+|x|=2x uses that restriction without stating it",
   "2x, x >= 0", c=2, pair="fun-w-sq")
Wx("square of a root plus root of a square, domain stated", "excluded-value obligation", "simplify", "sqrt(x)^2+sqrt(x^2)",
   ["domain: x ≥ 0", "x+|x|", "2x"], "valid-equivalence", "on x>=0, |x|=x", "2x, x >= 0",
   ol=["restrict: x >= 0", "x+|x|", "2x"], c=3, pair="fun-w-sq")
Wx("cube roots undo cubes on all reals", "inverse identity chain", "simplify", "cbrt(x)^3+cbrt(x^3)", ["x+x", "2x"],
   "valid-equivalence", "real cube root is a bijection", "2x", d="easy")
Wx("log of a squared shift minus log of the shift", "logarithm laws with domains", "simplify", "ln((x+1)^2)-ln(x+1)",
   ["2ln(x+1)-ln(x+1)", "ln(x+1)"], "valid-equivalence", "ln(x+1) already forces x>-1, where the power law holds",
   "ln(x+1)", c=2)
Wx("composition then simplification", "composition with domain", "simplify", "1/(1/(x-1)-1)",
   ["f(x)=1/x, g(x)=1/(x-1)-1: f(g(x))", "1/((1-(x-1))/(x-1))", "(x-1)/(2-x)"], "domain-violation",
   "x=1 is excluded in f(g(x)) but allowed in (x-1)/(2-x)", "(x-1)/(2-x), x != 1",
   ol=[None, "1/((1-(x-1))/(x-1))", "(x-1)/(2-x)"], notation="unfamiliar", c=3)
Wx("difference quotient of a reciprocal", "function notation with two letters", "simplify", "(1/(x+1)-1/x)",
   ["(x-(x+1))/(x(x+1))", "-1/(x(x+1))"], "valid-equivalence", "f(x+1)-f(x) for f=1/x; exclusions 0,-1 are shared",
   "-1/(x(x+1))", c=2, pair="fun-w-dq")
Wx("difference quotient of a reciprocal: sign of the numerator", "function notation with two letters", "simplify",
   "(1/(x+1)-1/x)", ["(x+1-x)/(x(x+1))", "1/(x(x+1))"], "invalid", "the numerator is x-(x+1)=-1", "-1/(x(x+1))", c=2,
   pair="fun-w-dq")
Wx("exponential growth factor", "exponential laws in a chain", "simplify", "2^(x+3)-2^x", ["2^x·8-2^x", "7·2^x"],
   "valid-equivalence", "2^x(8-1)", "7*2^x", ol=["2^x*8-2^x", "7*2^x"], notation="unfamiliar", pair="fun-w-exp")
Wx("exponential growth factor: exponent subtraction", "exponential laws in a chain", "simplify", "2^(x+3)-2^x",
   ["2^(x+3-x)", "8"], "invalid", "2^a-2^b is not 2^(a-b) (x=0: 7 vs 8)", "7*2^x", pair="fun-w-exp")
Wx("periodic simplification", "periodicity in a chain", "simplify", "sin(x+2pi)+cos(x+pi)", ["sin(x)-cos(x)"],
   "valid-equivalence", "period 2pi and half-period shift", "sin x - cos x", d="easy")
Wx("absolute value of a product, sign case", "piecewise chain with assumption", "simplify", "|x^2-x|",
   ["|x||x-1|", "x(x-1)"], "valid-equivalence", "for x>1 both factors are positive", "x(x-1)", assumptions=["x > 1"], c=2,
   pair="fun-w-abs")
Wx("absolute value of a product, sign case on (0,1)", "piecewise chain with assumption", "simplify", "|x^2-x|",
   ["|x||x-1|", "x(x-1)"], "invalid", "for 0<x<1, |x-1|=1-x; x=1/2: 1/4 vs -1/4", "x(1-x)",
   assumptions=["x > 0", "x < 1"], c=2, pair="fun-w-abs")
Wx("power-of-a-root rewritten with exponents", "exponent laws with domains", "simplify", "sqrt(x^3)/x",
   ["x > 0", "x^(3/2)/x", "x^(1/2)"], "valid-equivalence", "x>0 from the domain; x^(3/2-1)", "sqrt(x)",
   ol=["restrict: x > 0", "x^(3/2)/x", "x^(1/2)"], c=3)
Wx("proving a function equation by showing", "show-that identity chain", "show", "(e^x-e^(-x))/(e^x+e^(-x))",
   ["(e^(2x)-1)/(e^(2x)+1)"], "valid-equivalence", "multiply numerator and denominator by e^x>0", "(e^(2x)-1)/(e^(2x)+1)",
   target="(e^(2x)-1)/(e^(2x)+1)", d="hard", c=2)
Wx("log of a reciprocal (proof by cited rule)", "cited rule vs result", "simplify", "ln(e^(-2x))",
   ["-2x   (because ln is odd)"], "wrong-reason", "ln(e^u)=u gives -2x; ln is not an odd function (its domain is x>0)",
   "-2x", ol=["-2x"], d="easy")
