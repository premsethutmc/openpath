"""Builds suite.json from case definitions; every expected value comes from reference.py."""
import json, sys, os
sys.setrecursionlimit(50000)
from reference import *

HERE = os.path.dirname(os.path.abspath(__file__))
cases = []
warn = []
ALL_CODES = ["PARSE_ERROR", "UNSUPPORTED_OPERATOR", "UNSUPPORTED_EXPRESSION", "DOMAIN_UNRESOLVED", "PROOF_FAILED"]

def eqcase(cid, defect, text, why, tags=(), force_flex=False):
    r = solve_text(text)
    sc = auto_scope(r)
    exp = fmt(r)
    c = {"id": cid, "defect": defect, "kind": "equation", "text": text, "why": why, "tags": list(tags)}
    if sc == "in" and not force_flex:
        c.update(must_answer=True, must_refuse=False, expect=exp)
    else:
        c.update(must_answer=False, must_refuse=False,
                 expect={"refusal": ["UNSUPPORTED_EXPRESSION"], "if_answered": exp})
    cases.append(c)

def refcase(cid, defect, text, codes, why, check=True, tags=()):
    if check:
        try:
            solve_text(text); warn.append((cid, "reference did not refuse"))
        except Refusal as e:
            if e.code not in codes: warn.append((cid, "ref code %s not in %s" % (e.code, codes)))
    cases.append({"id": cid, "defect": defect, "kind": "equation", "text": text, "why": why,
                  "tags": list(tags), "must_answer": False, "must_refuse": True, "expect": {"refusal": codes}})

def flexcase(cid, defect, text, why, exp, tags=()):
    cases.append({"id": cid, "defect": defect, "kind": "equation", "text": text, "why": why, "tags": list(tags),
                  "must_answer": False, "must_refuse": False, "expect": {"refusal": ALL_CODES[:4], "if_answered": exp}})

# ------------------------------------------------------------------ D1
D1 = [
 ("x^-1=2", "bare negative exponent: 1/x=2, x != 0"),
 ("x^(-1)=2", "parenthesised negative exponent"),
 ("(x+1)^-1=1", "negative exponent of a linear binomial; pole at -1, solution 0"),
 ("(x-2)^(-1)=3", "pole at 2, solution 7/3"),
 ("2*x^-1=1", "coefficient times x^-1"),
 ("x^-1+1=0", "x^-1 in a sum; x=-1"),
 ("x^-1=x^-1", "identity on R minus {0}, not all reals"),
 ("x^-1*x=1", "written denominator x cancels but x != 0 stays: identity on domain minus 0"),
 ("x*x^-1=1", "same, factors swapped"),
 ("x^-1*x=2", "after cancelling 1=2: none (not 'x=anything')"),
 ("(x+1)^-1*(x+1)=1", "identity on R minus {-1}"),
 ("(x-1)^-1*(x-1)=2", "none, excluded {1}"),
 ("x^-1*x^2=x", "x^-1*x^2 = x only for x != 0: identity on domain"),
 ("x^2*x^-2=1", "identity on domain, x != 0"),
 ("x^(1-3)*x=1", "exponent written as constant expression 1-3 = -2; reduces to 1/x=1 -> x=1"),
 ("x^(1-3)=1/x^2", "identity on domain; exponent expression -2"),
 ("x^-2=1/x^2", "identity on domain"),
 ("x^(0-2)=x^-2", "identity on domain"),
 ("x^-3=x^-3*1", "three-fold pole, identity"),
 ("x^-1=x^-1+x", "candidate x=0 equals the excluded value -> none"),
 ("(x-1)^-1=(x-1)^-1*x", "candidate x=1 is excluded -> none"),
 ("x^-1+x^-2=0", "(x+1)/x^2=0 -> -1, excluded 0"),
 ("x^-1-(x-1)^-1=0", "-1/(x(x-1))=0 -> none, excluded {0,1}"),
 ("x^-1=(x+1)^-1", "none; excluded {-1,0}"),
 ("x^-1+(x-2)^-1=2*(x-1)*x^-1*(x-2)^-1", "identity on R minus {0,2}"),
 ("2*x^-1+x^-1=3/x", "identity on R minus {0}"),
 ("x^-1+1=(x+1)/x", "identity on R minus {0}"),
 ("(x^2-1)^-1=1/(x-1)*1/(x+1)", "identity on R minus {-1,1}"),
 ("(x^2-1)^-1=(x+1)^-1", "candidates -1 (excluded) and 2"),
 ("(x-1)^-2=(x-1)^-1", "candidates 1 (excluded) and 2"),
 ("(x+1)^-3=1/(x+1)^3", "identity, triple pole"),
 ("3*(x-1)^-1=6*(2*x-2)^-1", "identity on R minus {1}"),
 ("(2*x)^-1=1", "1/(2x)=1 -> 1/2, excluded 0"),
 ("(x*(x-1))^-1=2/x", "1/(x(x-1))=2/x -> 3/2, excluded {0,1}"),
 ("2^-1*x/(x-1)=1", "numeric negative power is just 1/2; only x != 1"),
 ("x^0/(x-1)=1", "x^0 requires x != 0: excluded {0,1}; solution 2"),
 ("(x+1)^-1=(x+1)^-1*(x-1)^0", "(x-1)^0 requires x != 1: identity on R minus {-1,1}"),
 ("x^0=1", "base^0 requires base != 0: identity on R minus {0}"),
 ("(x-1)^0=1", "identity on R minus {1}"),
 ("x^(2-2)=1", "exponent expression 0: still needs x != 0"),
 ("1/x^-1=3", "1/(x^-1)=x; written pole at 0"),
 ("(1/x)^-1=3", "(1/x)^-1 = x; written restriction x != 0"),
 ("1/(1/x)=2", "nested denominator: x != 0 although 1/x is never 0"),
 ("(1/x)^-1=x", "identity on R minus {0}"),
 ("1/(1/x)=x", "identity on R minus {0}"),
 ("1/(x-1/x)=1/(x+1)", "x-1/x = (x^2-1)/x -> excluded {-1,0,1}; none"),
 ("1/(x-1/x)=x/(x^2-1)", "identity on R minus {-1,0,1}; 0 is excluded only via the nested 1/x"),
 ("1/(x-1/x)=2/(x+1)", "solution 2, excluded {-1,0,1}"),
 ("(x/(x-1))^-1=2", "(x-1)/x=2 -> -1; excluded {0,1} (base != 0 and base defined)"),
 ("(x/(x-1))^-2=1", "(x-1)^2/x^2=1 -> 1/2; excluded {0,1}"),
 ("(x/(x-1))^-2=4", "two candidates -1 and 1/3 (reduced degree 2: refusal tolerated)"),
 ("1/(1/x-1)=1", "x/(1-x)=1 -> 1/2; divisor 1/x-1 zero at 1 and undefined at 0"),
 ("1/(1-1/x)=2", "x/(x-1)=2 -> 2; excluded {0,1}"),
 ("(1/(x-1))/(1/x)=1", "x/(x-1)=1 -> none; excluded {0,1} (divisor 1/x undefined at 0)"),
 ("(x/(x-1))/(x/(x+1))=1", "divisor zero at 0; (x+1)/(x-1)=1 -> none; excluded {-1,0,1}"),
 ("1/(x-1)^-1=2", "1/((x-1)^-1)=x-1 -> 3; excluded {1}"),
 ("1/(x-1)^-1=x-1", "identity on R minus {1}"),
 ("(1/(x-1))^-1=x-1", "identity on R minus {1}"),
]
DROP1 = {"x^-2=1/x^2", "x^(0-2)=x^-2", "x^-3=x^-3*1", "2*x^-1+x^-1=3/x", "x^-1+1=(x+1)/x", "(x+1)^-3=1/(x+1)^3",
         "(1/x)^-1=x", "1/(1/x)=x", "1/(1-1/x)=2", "1/(x-1)^-1=x-1", "(1/(x-1))^-1=x-1", "(x+1)^-1*(x+1)=1", "x^(2-2)=1"}
NODENOM = {"x^0=1", "(x-1)^0=1"}
D1 = [x for x in D1 if x[0] not in DROP1]
for i, (t, w) in enumerate(D1, 1):
    eqcase("d1-%02d" % i, "D1", t, w, force_flex=t in NODENOM, tags=["no-variable-denominator"] if t in NODENOM else ())
n = len(D1)
# refusals under D1
refcase("d1-r1", "D1", "x^-4=1", ["UNSUPPORTED_EXPRESSION"], "denominator x^4 has 4 linear factors (>3): outside scope", tags=["scope"])
refcase("d1-r2", "D1", "1/(x-1)=0^0", ["DOMAIN_UNRESOLVED"], "0^0 undefined everywhere")
refcase("d1-r3", "D1", "1/(x-1)=0^-1", ["DOMAIN_UNRESOLVED"], "0^-1 = 1/0 undefined everywhere")
refcase("d1-r4", "D1", "(x-x)^0=1", ["DOMAIN_UNRESOLVED"], "base x-x is 0 everywhere, base^0 needs base != 0: undefined everywhere")
refcase("d1-r5", "D1", "x^-1=1/(x^2+1)", ["DOMAIN_UNRESOLVED", "UNSUPPORTED_EXPRESSION"], "complex poles of 1/(x^2+1): not an exactly resolvable rational domain", check=False)
refcase("d1-r6", "D1", "x^-1=1/(x^2-2)", ["DOMAIN_UNRESOLVED", "UNSUPPORTED_EXPRESSION"], "irrational poles +-sqrt2", check=False)
refcase("d1-r7", "D1", "(x^2-2)^-1=1", ["DOMAIN_UNRESOLVED", "UNSUPPORTED_EXPRESSION"], "negative exponent whose base has irrational zeros")
refcase("d1-r8", "D1", "x^-1=x^2", ["UNSUPPORTED_EXPRESSION"], "1=x^3: reduced numerator degree 3 with irrational root", tags=["scope"])
#refcase("d1-r9", "D1", "x^(0-1)*x^-1=x^3", ["UNSUPPORTED_EXPRESSION"], "x^-2=x^3: reduced degree 5", check=False, tags=["scope"])
#refcase("d1-r10", "D1", "x^1=x^2", ["UNSUPPORTED_EXPRESSION"], "no variable denominator at all (x^1 is not a negative exponent)", tags=["scope"], check=False)

# ------------------------------------------------------------------ D3
for i, (t, w) in enumerate([
 (" 1 /( x - 1 ) = 2 ", "spaces between tokens are allowed"),
 ("1/(x-1)=2.5", "decimal literal on rhs, 7/5"),
 ("1/(x-1)=1.0", "decimal 1.0"),
 ("2*x/(x-1)=1", "explicit * where '2x' would be a parse error"),
 ("2*(x-1)/(x-1)=2", "identity on R minus {1}"),
 ("x/(x-1)=0.5", "leading-zero decimal accepted, '.5' is not"),
 ("(1)/((x-1))=2", "redundant parentheses"),
 ("1 / ( x - 1 ) = 1 / 2", "spaced tokens, rational rhs"),
 ("1/(x-1)=10", "two-digit integer"),
 ("1/(x-1)=1", "x=2"),
 ("x*1/(x-1)=3", "x=3/2"),
], 1):
    eqcase("d3-ok%02d" % i, "D3", t, w, tags=["lookalike"])
    if i == 8: break
P = "PARSE_ERROR"; O = "UNSUPPORTED_OPERATOR"; U = "UNSUPPORTED_EXPRESSION"; DU = "DOMAIN_UNRESOLVED"
D3R = [
 ("2x/(x-1)=1", [P], "implicit multiplication number*variable"),
 ("2(x-1)/(x-1)=2", [P], "implicit multiplication number*parenthesis"),
 ("x/(x-1)=.5", [P], "decimal without leading digit"),
 ("1/(x-1)=1e0", [P], "scientific notation"),
 ("+1/(x-1)=2", [P], "unary plus"),
 ("1/(x-1)=y", [P], "second unknown"),
 ("1/(x-1)=2=3", [P], "multiple equals signs"),
 ("1 0/(x-1)=10/(x-1)", [P], "whitespace inside a number must not become 10"),
 ("1/(x-1)=1 0", [P], "whitespace inside number on rhs"),
 ("1/(x-1)=2.", [P], "trailing decimal point"),
 ("1/(x-1)=1.2.3", [P], "two decimal points"),
 ("1/(x-1)=1,5", [P], "comma decimal"),
 ("1/(x-1)=2;", [P], "stray character"),
 ("=2", [P], "empty left side"),
 ("1/(x-1)=", [P], "empty right side"),
 ("=", [P], "both sides empty"),
 ("", [P], "empty input"),
 ("   ", [P], "blank input"),
 ("1/(x-1)", [P], "no equals sign"),
 ("1/(x-1=2", [P], "unbalanced: missing )"),
 ("1/x-1)=2", [P], "unbalanced: extra )"),
 ("((1/x)=2", [P], "unbalanced: extra ("),
 ("1/()=2", [P], "empty parentheses"),
 ("1/(x-1)=2)", [P], "extra ) at end"),
 ("1//x=1", [P], "double operator"),
 ("1/(x-1)==2", [P], "double equals"),
 ("a/(x-1)=2", [P], "unknown letter a"),
 ("X/(X-1)=2", [P], "upper-case X is not the variable"),
 ("1/(x-1)=2x", [P], "implicit multiplication on rhs"),
 ("x x/(x-1)=2", [P], "juxtaposed variables"),
 ("1/(x−1)=2", [P], "unicode minus sign"),
 ("1/(x-1)=2*", [P], "dangling operator"),
 ("1/(x-1)=x^", [P], "missing exponent"),
 ("1/(x-1)=(2)(3)", [P], "implicit multiplication of parentheses"),
 ("1/(x-1)=xy", [P], "multi-letter identifier"),
 ("1/(x-1)=x^(1/2)", [O], "fractional exponent"),
 ("1/(x-1)=x^0.5", [O], "decimal exponent"),
 ("1/(x-1)=x^x", [O], "variable exponent"),
 ("1/(x-1)=2^x", [O], "variable in exponent"),
 ("1/(x-1)=x^(x-1)", [O], "variable in exponent expression"),
 ("1/(x-1)=sqrt(x)", [O], "sqrt"),
 ("1/(x-1)=|x|", [O], "absolute value"),
 ("1/(x-1)=x!", [O], "factorial"),
 ("1/(x-1)=3!", [O], "factorial of a constant"),
 ("1/(x-1)=sin(x)", [O], "trig function"),
 ("1/sqrt(x)=1", [O], "sqrt in denominator"),
 ("1/(x-1)=foo(x)", [O, P], "unknown function name"),
 ("x/0=1", [DU], "division by constant zero"),
 ("1/(x-x)=1", [DU], "denominator identically zero"),
 ("x/(x-1)=1/0", [DU], "1/0 on rhs"),
 ("1/(0*x)=1", [DU], "denominator identically zero via 0*x"),
 ("1/(x-1)=1/(x-1-x+1)", [DU], "second denominator simplifies to 0"),
 ("x+1=2", [U], "no variable denominator"),
 ("x^2=4", [U], "no variable denominator"),
 ("1/2=0.5", [U], "no variable at all"),
 ("1/(x-1)=x", [U], "reduced degree 2 with irrational roots"),
 ("x^3/(x-1)=2", [U], "numerator degree 3"),
 ("1/((x-1)*(x+1)*(x+2)*(x+3))=1", [U], "denominator with 4 linear factors"),
 ("1/(x^2+1)=1", [DU, U], "denominator without real zeros (complex poles)"),
 ("1/(x^2-2)=1", [DU, U], "denominator with irrational zeros"),
]
DROP3 = {"   ", "=", "1/x-1)=2", "1/(x-1)=2)", "1/(x-1)=1,5", "1/(x-1)=2;", "x x/(x-1)=2", "1/(x-1)=xy", "1/(x-1)=(2)(3)",
         "1/(x-1)=x^0.5", "1/(x-1)=x^(x-1)", "1/(x-1)=3!", "1/sqrt(x)=1", "1/(0*x)=1", "1/(x-1)=1.2.3", "1/(x-1)==2", "x^2=4"}
D3R = [x for x in D3R if x[0] not in DROP3]
for i, (t, codes, w) in enumerate(D3R, 1):
    refcase("d3-%02d" % i, "D3", t, codes, w)
# long inputs: either a correct answer or a structured refusal, never a crash
flexcase("d3-long1", "D3", "1/(x-1)=2" + "+0" * 5000, "very long but valid sum of zeros", {"class": "unique", "solution": ["3/2"], "excluded": ["1"]}, tags=["long"])
flexcase("d3-long2", "D3", "1/(" + "(" * 1000 + "x-1" + ")" * 1000 + ")=2", "1000 nested parentheses", {"class": "unique", "solution": ["3/2"], "excluded": ["1"]}, tags=["long"])
big = "9" * 400
flexcase("d3-long3", "D3", "1/(x-1)=" + big, "400-digit integer rhs: x = 1 + 1/N",
         {"class": "unique", "solution": [str(F(1) + F(1, int(big)))], "excluded": ["1"]}, tags=["long"])
refcase("d3-long4", "D3", "1/(x-1)=" + "(" * 5000 + "1", [P], "5000 unclosed parentheses", check=False, tags=["long"])
refcase("d3-long5", "D3", "1/(x-1)=" + "x" * 3000, [P], "3000-letter identifier", tags=["long"])
refcase("d3-long6", "D3", "1/(x-1)=" + "+" * 5000 + "1", [P], "5000 unary pluses", check=False, tags=["long"])

# ------------------------------------------------------------------ D4 (oracle + equation)
D4 = [
 "0.001/(x-1)=0.002/(x+1)", "1/(0.25*x)=8", "0.1/(x-1)=0.2", "12.5/(x-1)=25", "3.75/(x+2)=1.25",
 "100.0625/(x-1)=1", "0.1/(x-0.1)=1", "1/(x-0.5)=2", "0.1*x/(x-0.3)=0.2", "0.7/(x-0.7)=0.7/(x-0.7)",
 "0.1/(x-0.1)=0.3/(x-0.3)", "1/(x-0.1)=1/(x-0.1)+0.000001", "0.5/(x-1)+0.25/(x-1)=0.75/(x-1)",
 "0.3/(x-0.3)=1", "3.14159/(x-1)=3.14159", "2.5*x^-1=5", "x/(x-0.01)=100", "0.0001/(x-1)=0.0003/(x+1)",
 "0.1/(x-0.3)=0.2/(x-0.4)", "0.2/(x-0.2)=0.6/(3*x-0.6)", "0.07/(x-0.07)=1", "1/(x-0.125)=0.5",
]
for i, t in enumerate(D4, 1):
    r = solve_text(t)
    cases.append({"id": "d4-o%02d" % i, "defect": "D4", "kind": "oracle", "text": t, "expect": fmt(r),
                  "why": "exact decimal literals must be read as rationals, not floats"})
for i, t in enumerate(["1/(0.25*x)=8", "0.001/(x-1)=0.002/(x+1)", "x/(x-0.01)=100"], 1):
    eqcase("d4-e%02d" % i, "D4", t, "solver (not just oracle) must keep decimals exact", tags=["decimal"])

# ------------------------------------------------------------------ D2 steps
S = []
def st(fe, fx, te, tx, eff, truth, reason, tags=()):
    S.append((fe, fx, te, tx, eff, truth, reason, tags))
EQ, IM = "equivalence", "implication"
V, I = "valid", "invalid"
st("1/(x-1)=2", ["1"], "1=2*(x-1)", ["1"], EQ, V, "clear denominator, restriction carried")
st("(x^2-1)/(x-1)=2", ["1"], "x+1=2", ["1"], EQ, V, "cancel common factor, restriction x!=1 carried: both solution sets empty")
st("(x^2-1)/(x-1)=2", ["1"], "x+1=2", ["1"], IM, V, "same step claimed as implication")
st("x+1=2", ["1"], "(x^2-1)/(x-1)=2", ["1"], EQ, V, "reverse: multiply by x-1 with restriction kept")
st("x^-1=2", ["0"], "1=2*x", ["0"], EQ, V, "negative exponent cleared", ("neg-exp",))
st("x^-1*x=1", ["0"], "1=1", ["0"], EQ, V, "cancellation with restriction kept: identity on R minus 0", ("neg-exp",))
st("x/(x-1)=1/(x-1)", ["1"], "x=1", ["1"], EQ, V, "multiply by x-1, candidate 1 excluded")
st("x/(x-1)=3", ["1"], "x^2/(x-1)^2=9", ["1"], IM, V, "squaring is an implication: {3/2} subset of {3/2,3/4}")
st("x^-1+x^-2=0", ["0"], "x+1=0", ["0"], EQ, V, "combine: (x+1)/x^2=0", ("neg-exp",))
st("(x-1)^-1=(x-1)^-1*x", ["1"], "1=x", ["1"], EQ, V, "multiply by x-1, both empty", ("neg-exp",))
st("1/(1/x)=2", ["0"], "x=2", ["0"], EQ, V, "nested denominator simplifies", ("neg-exp", "nested"))
st("x^0=1", ["0"], "1=1", ["0"], EQ, V, "x^0=1 with x!=0 carried", ("neg-exp",))
st("1/(x-1/x)=1/(x+1)", ["-1", "0", "1"], "x=x-1", ["-1", "0", "1"], EQ, V, "closed nested state; both empty", ("nested",))
st("1/(x-1)+1/(x+1)=2/(x-1)", ["-1", "1"], "2*x=2*(x+1)", ["-1", "1"], EQ, V, "combine fractions; both empty")
st("2/(x-1)=4/(2*x-2)", ["1"], "1=1", ["1"], EQ, V, "identity on R minus 1")
st("1/(x-1)=1/(x+1)", ["-1", "1"], "x+1=x-1", ["-1", "1"], EQ, V, "cross-multiply; both empty")
st("x^-2=4*x^-2", ["0"], "1=4", ["0"], EQ, V, "(1-4)/x^2=0: both empty", ("neg-exp",))
st("1/(x-1)=2", ["1"], "1/(x-1)=2", ["1"], EQ, V, "identity step")
st("x^-1=x^-1+x", ["0"], "x=0", ["0"], EQ, V, "root 0 is excluded: both empty", ("neg-exp",))
st("x^(1-3)*x=1", ["0"], "x=1", ["0"], EQ, V, "1/x=1 -> x=1", ("neg-exp",))
st("(x/(x-1))^-1=2", ["0", "1"], "x-1=2*x", ["0", "1"], EQ, V, "invert: (x-1)/x=2 -> -1", ("neg-exp", "nested"))
# invalid
st("(x^2-1)/(x-1)=2", [], "x+1=2", [], EQ, I, "from-state omits x!=1 (the audited false accept)")
st("(x^2-1)/(x-1)=2", [], "x+1=2", ["1"], EQ, I, "from-state not closed even though to-state is fine")
st("1/(x-1)=2", [], "1=2*(x-1)", [], EQ, I, "from-state missing 1")
st("x^-1=2", [], "1=2*x", [], EQ, I, "from-state missing 0 (negative exponent)", ("neg-exp",))
st("x^-1=2", ["1"], "1=2*x", ["1"], EQ, I, "from-state lists 1 but misses 0", ("neg-exp",))
st("1/(x-1)=2", ["2"], "1=2*(x-1)", ["2"], EQ, I, "from-state lists a wrong value, misses 1")
st("1/(1/x)=2", [], "x=2", [], EQ, I, "from-state misses 0 from nested denominator", ("nested",))
st("1/(x-1/x)=1/(x+1)", ["-1", "1"], "x=x-1", ["-1", "1"], EQ, I, "from-state misses 0", ("nested",))
st("x^0=1", [], "1=1", [], EQ, I, "from-state misses 0 for x^0", ("neg-exp",))
st("1/(x-1)=2", ["1"], "1/(x-1)=2", [], EQ, I, "to-state not closed")
st("1/(x-1)=2", ["1"], "1/(x-1)=2", ["0"], EQ, I, "to-state lists wrong value")
st("(x^2-1)/(x-1)=2", ["1"], "x+1=2", [], EQ, I, "dropping restriction adds extraneous root 1")
st("x^-1*x=1", ["0"], "1=1", [], EQ, I, "dropping x!=0: identity on R vs R minus 0", ("neg-exp",))
st("1/(x-1)=2", ["1"], "1=2*(x+1)", ["1"], EQ, I, "wrong algebra: -1/2 vs 3/2")
st("x/(x-1)=3", ["1"], "x^2/(x-1)^2=9", ["1"], EQ, I, "squaring is not an equivalence")
st("x^2/(x-1)^2=9", ["1"], "x/(x-1)=3", ["1"], IM, I, "backwards implication: {3/2,3/4} not subset of {3/2}")
st("x/(x-1)=1/(x-1)", ["1"], "x=1", [], EQ, I, "equivalence fails: empty vs {1}")
st("x^-1=x^-1+x", ["0"], "x=0", [], EQ, I, "dropped restriction readmits 0", ("neg-exp",))
st("x^(1-3)*x=1", [], "x=1", [], EQ, I, "from-state misses 0 (exponent 1-3)", ("neg-exp",))
st("(x/(x-1))^-1=2", ["1"], "x-1=2*x", ["1"], EQ, I, "from-state misses 0", ("neg-exp", "nested"))
st("1/x=1/x", ["0"], "1=1", [], EQ, I, "dropping x!=0 changes identity domain")
for i, (fe, fx, te, tx, eff, truth, reason, tags) in enumerate(S, 1):
    comp, why = step_truth({"eq": fe, "excluded": fx}, {"eq": te, "excluded": tx}, eff)
    if comp != truth:
        warn.append(("d2-%02d" % i, "intended %s computed %s (%s)" % (truth, comp, why)))
        truth = comp
    cases.append({"id": "d2-%02d" % i, "defect": "D2", "kind": "step", "from": {"eq": fe, "excluded": fx},
                  "to": {"eq": te, "excluded": tx}, "effect": eff, "truth": truth, "reason": reason, "tags": list(tags)})

json.dump(cases, open(os.path.join(HERE, "suite.json"), "w"), indent=1, ensure_ascii=False)
from collections import Counter
print(Counter((c["defect"], c["kind"]) for c in cases), len(cases))
print(Counter((c["defect"], c.get("must_answer"), c.get("must_refuse")) for c in cases if c["kind"] == "equation"))
print(Counter(c["truth"] for c in cases if c["kind"] == "step"))
for w in warn: print("WARN", w)
