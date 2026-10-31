"""PRF -- Multi-step reasoning and proof obligations (all workings). Every label derived by hand; see `why`."""
from schema import W

C = "PRF"


def _split(lines):
    work, ol = [], []
    for l in lines:
        if isinstance(l, tuple):
            work.append(l[0]); ol.append(l[1])
        else:
            work.append(l); ol.append(l)
    return work, ol


def _cx(n):
    return max(1, min(5, (n + 1) // 2))


def SOL(principle, inv, stmt, lines, rel, why, answer, **kw):
    w, o = _split(lines)
    kw.setdefault("complexity", _cx(len(w)))
    return W(C, principle, inv, {"type": "solve", "statement": stmt}, w, rel, why=why, answer=answer, oracle_lines=o, **kw)


def SYS(principle, inv, stmt, lines, rel, why, answer, **kw):
    w, o = _split(lines)
    kw.setdefault("complexity", _cx(len(w)))
    return W(C, principle, inv, {"type": "system", "statement": stmt}, w, rel, why=why, answer=answer, oracle_lines=o, **kw)


def SHOW(principle, inv, start, target, lines, rel, why, **kw):
    w, o = _split(lines)
    kw.setdefault("complexity", _cx(len(w)))
    return W(C, principle, inv, {"type": "show", "start": start, "target": target}, w, rel, why=why, answer=target,
             oracle_lines=o, **kw)


def EXPR(kind, principle, inv, start, lines, rel, why, answer, **kw):
    w, o = _split(lines)
    kw.setdefault("complexity", _cx(len(w)))
    return W(C, principle, inv, {"type": kind, "start": start}, w, rel, why=why, answer=answer, oracle_lines=o, **kw)


def CAL(task, principle, inv, lines, rel, why, answer, **kw):
    w, o = _split(lines)
    kw.setdefault("complexity", _cx(len(w)))
    return W(C, principle, inv, task, w, rel, why=why, answer=answer, oracle_lines=o, **kw)


CHAIN = "error localisation in a long solve chain"
SET = "solution-set preservation along a chain"

# ======================================================================= A. long chains, one wrong step (start/middle/end)
s = "2(x-3)+4=3x-5"
SOL("linear chain, all steps correct", SET, s, ["2x-6+4=3x-5", "2x-2=3x-5", "-2+5=3x-2x", "3=x", "x=3"], "valid-equivalence",
    "each step is a reversible linear operation; check 2(0)+4=4=9-5", "x=3", pair="p-a1", difficulty="easy")
SOL("distribution error in the first line propagates", CHAIN, s, ["2x-3+4=3x-5", "2x+1=3x-5", "1+5=3x-2x", "6=x", "x=6"],
    "invalid", "2(x-3)=2x-6, not 2x-3; x=6 gives 2(3)+4=10 vs 13", "x=3", pair="p-a1", difficulty="easy")
SOL("sign error when moving a constant (middle of chain)", CHAIN, s,
    ["2x-6+4=3x-5", "2x-2=3x-5", "-2-5=3x-2x", "-7=x", "x=-7"], "invalid",
    "moving -5 across gives +5: -2+5=x; the third line is false at x=3", "x=3", pair="p-a1")
SOL("final transcription error at the end of a correct chain", CHAIN, s,
    ["2x-6+4=3x-5", "2x-2=3x-5", "-2+5=3x-2x", "3=x", "x=-3"], "invalid", "3=x then x=-3 flips the sign", "x=3", pair="p-a1")

s = "(x+1)/3-(x-2)/4=1"
SOL("clearing constant denominators then a linear chain", SET, s,
    ["4(x+1)-3(x-2)=12", "4x+4-3x+6=12", "x+10=12", "x=2"], "valid-equivalence",
    "multiply by 12; check (3)/3-0/4=1", "x=2", pair="p-a2")
SOL("multiplying only one side by the common denominator", CHAIN, s,
    ["4(x+1)-3(x-2)=1", "4x+4-3x+6=1", "x+10=1", "x=-9"], "invalid", "the right side must become 12", "x=2", pair="p-a2")
SOL("sign error distributing a negative coefficient", CHAIN, s,
    ["4(x+1)-3(x-2)=12", "4x+4-3x-6=12", "x-2=12", "x=14"], "invalid", "-3(x-2)=-3x+6", "x=2", pair="p-a2")
SOL("arithmetic error in the last step", CHAIN, s,
    ["4(x+1)-3(x-2)=12", "4x+4-3x+6=12", "x+10=12", "x=22"], "invalid", "12-10=2", "x=2", pair="p-a2")

s = "5-2(3-x)=4(x+1)-7"
SOL("double distribution chain", SET, s, ["5-6+2x=4x+4-7", "-1+2x=4x-3", "-1+3=4x-2x", "2=2x", "x=1"], "valid-equivalence",
    "check 5-2(2)=1 and 4(2)-7=1", "x=1", pair="p-a3")
SOL("combining like terms incorrectly mid-chain", CHAIN, s, ["5-6+2x=4x+4-7", "-1+2x=4x-3", "-1+3=4x-2x", "2=6x", "x=1/3"],
    "invalid", "4x-2x=2x, not 6x", "x=1", pair="p-a3")
SOL("sign error distributing -2 at the start", CHAIN, s, ["5-6-2x=4x+4-7", "-1-2x=4x-3", "2=6x", "x=1/3"], "invalid",
    "-2(3-x)=-6+2x", "x=1", pair="p-a3")

s = "3(2x-1)-2(x+4)=5(x-3)+x"
L10 = ["6x-3-2(x+4)=5(x-3)+x", "6x-3-2x-8=5(x-3)+x", "6x-3-2x-8=5x-15+x", "4x-3-8=5x-15+x", "4x-11=5x-15+x", "4x-11=6x-15",
       "4x-11+15=6x", "4x+4=6x", "4=2x", "x=2"]
SOL("ten-line expansion chain, all correct", SET, s, L10, "valid-equivalence",
    "each line expands or collects one group; check 3(3)-2(6)=-3 and 5(-1)+2=-3", "x=2", pair="p-a4", difficulty="medium")
SOL("sign error in the second of eight lines", CHAIN, s,
    ["6x-3-2(x+4)=5(x-3)+x", "6x-3-2x+8=5(x-3)+x", "6x-3-2x+8=5x-15+x", "4x+5=5x-15+x", "4x+5=6x-15", "4x+20=6x", "20=2x", "x=10"],
    "invalid", "-2(x+4)=-2x-8, not -2x+8; every later line inherits the error", "x=2", pair="p-a4")
SOL("sign error in the sixth of nine lines", CHAIN, s, L10[:5] + ["4x-11=6x+15", "-11-15=2x", "-26=2x", "x=-13"], "invalid",
    "-15 became +15 while collecting 5x+x", "x=2", pair="p-a4")
SOL("division error in the tenth line", CHAIN, s, L10[:9] + ["x=1/2"], "invalid", "4=2x gives x=2", "x=2", pair="p-a4")
SOL("long chain stopped before isolating x", "completeness of a chain", s, L10[:6], "incomplete",
    "every line is equivalent to the task but x is never isolated", "x=2", pair="p-a4")

s = "x^2-6x+5=0"
SOL("completing the square", SET, s, ["x^2-6x=-5", "x^2-6x+9=4", "(x-3)^2=4", "x-3=2 or x-3=-2", "x=5 or x=1"],
    "valid-equivalence", "(x-3)^2=4 has two square roots; check 25-30+5=0, 1-6+5=0", "x=1 or x=5", pair="p-a5")
SOL("completing the square: adding 9 to one side only", CHAIN, s, ["x^2-6x=-5", "x^2-6x+9=14", "(x-3)^2=14", "x=3 ± sqrt(14)"],
    "invalid", "both sides get +9: -5+9=4", "x=1 or x=5", pair="p-a5")
SOL("completing the square: arithmetic slip in the last line", CHAIN, s,
    ["x^2-6x=-5", "x^2-6x+9=4", "(x-3)^2=4", "x-3=2 or x-3=-2", "x=5 or x=-1"], "invalid", "x-3=-2 gives x=1", "x=1 or x=5",
    pair="p-a5")
SOL("completing the square: the negative square root dropped", CHAIN, s, ["x^2-6x=-5", "x^2-6x+9=4", "(x-3)^2=4", "x-3=2", "x=5"],
    "invalid", "x-3=-2 is lost, so x=1 is lost", "x=1 or x=5", pair="p-a5")

s = "3^(2x-1)=27^(x-2)"
SOL("common base for an exponential equation", SET, s, ["3^(2x-1)=(3^3)^(x-2)", "3^(2x-1)=3^(3x-6)", "2x-1=3x-6", "5=x", "x=5"],
    "valid-equivalence", "27=3^3 and t -> 3^t is one-to-one", "x=5", pair="p-a6")
SOL("wrong base power at the start of an exponential chain", CHAIN, s,
    ["3^(2x-1)=(3^2)^(x-2)", "3^(2x-1)=3^(2x-4)", "2x-1=2x-4", "-1=-4", "empty"], "invalid", "27=3^3, not 3^2; x=5 is a solution",
    "x=5", pair="p-a6")
SOL("sign slip in the last steps of an exponential chain", CHAIN, s,
    ["3^(2x-1)=(3^3)^(x-2)", "3^(2x-1)=3^(3x-6)", "2x-1=3x-6", "-5=x", "x=-5"], "invalid", "-1+6=x gives 5", "x=5", pair="p-a6")

s = "2^(x+3)=4^(x-1)"
SOL("rewrite 4 as 2^2 and equate exponents", SET, s, ["2^(x+3)=2^(2(x-1))", "x+3=2x-2", "x=5"], "valid-equivalence",
    "4^(x-1)=2^(2x-2)", "x=5", pair="p-a7")
SOL("power of a power: exponent not fully distributed", CHAIN, s, ["2^(x+3)=2^(2x-1)", "x+3=2x-1", "x=4"], "invalid",
    "2(x-1)=2x-2, not 2x-1", "x=5", pair="p-a7")

s = "0.5(x-4)+1.2=0.3x"
SOL("decimal coefficients chain", SET, s, ["0.5x-2+1.2=0.3x", "0.5x-0.8=0.3x", "0.2x=0.8", "x=4"], "valid-equivalence",
    "check 0+1.2=1.2", "x=4", pair="p-a8")
SOL("decimal coefficients: subtracting 0.3x as adding", CHAIN, s, ["0.5x-2+1.2=0.3x", "0.5x-0.8=0.3x", "0.8x=0.8", "x=1"],
    "invalid", "0.5x-0.3x=0.2x", "x=4", pair="p-a8")

s = "2[3-(x-1)]=4x-10"
SOL("nested brackets chain", SET, s, ["2[3-x+1]=4x-10", "2(4-x)=4x-10", "8-2x=4x-10", "18=6x", "x=3"], "valid-equivalence",
    "check 2[3-2]=2=12-10", "x=3", pair="p-a9")
SOL("nested brackets: inner sign not distributed", CHAIN, s, ["2[3-x-1]=4x-10", "2(2-x)=4x-10", "4-2x=4x-10", "14=6x", "x=7/3"],
    "invalid", "-(x-1)=-x+1", "x=3", pair="p-a9")

s = "(2x+1)/3-(x-1)/2=(x+5)/6"
SOL("an identity: every real number is a solution", SET, s,
    ["2(2x+1)-3(x-1)=x+5", "4x+2-3x+3=x+5", "x+5=x+5", ("this holds for every real x", "-oo<x<oo")], "valid-equivalence",
    "multiplying by 6 gives x+5=x+5, true for all x", "all real x", pair="p-ident", difficulty="medium")
SOL("an identity mistaken for a single solution", "over-claiming a conclusion", s,
    ["2(2x+1)-3(x-1)=x+5", "4x+2-3x+3=x+5", "x+5=x+5", "x=0"], "invalid", "x=0 is one of infinitely many solutions",
    "all real x", pair="p-ident")

# ======================================================================= B. carried restrictions
RES = "restriction carried across lines"
s = "x/(x-1)=3/(x-1)+2"
SOL("clear denominators with the restriction stated", RES, s,
    [("x ≠ 1", "restrict: x != 1"), "x=3+2(x-1)", "x=3+2x-2", "-x=1", "x=-1"], "valid-equivalence",
    "with x != 1 multiplying by x-1 is reversible; -1 is allowed", "x=-1", pair="p-b1")
SOL("clear denominators without stating the restriction", RES, s, ["x=3+2(x-1)", "x=3+2x-2", "-x=1", "x=-1"], "domain-violation",
    "answer correct but x != 1 is never stated when multiplying by x-1", "x=-1", pair="p-b1")

s = "(x+3)/(x^2-9)=1"
SOL("restriction stated, excluded candidate rejected", RES, s,
    [("x ≠ 3 and x ≠ -3", "restrict: x != 3 and x != -3"), "x+3=x^2-9", "x^2-x-12=0", "(x-4)(x+3)=0", "x=4 or x=-3",
     ("x=-3 is excluded, so x=4", "x=4")], "valid-implication",
    "clearing x^2-9 adds the candidate -3, rejected by the stated restriction", "x=4", pair="p-b2")
SOL("excluded candidate kept despite the restriction", RES, s,
    [("x ≠ 3 and x ≠ -3", "restrict: x != 3 and x != -3"), "x+3=x^2-9", "x^2-x-12=0", "(x-4)(x+3)=0", "x=4 or x=-3"], "invalid",
    "x=-3 makes the denominator zero", "x=4", pair="p-b2")
SOL("excluded candidate silently dropped, no restriction", RES, s, ["x+3=x^2-9", "x^2-x-12=0", "(x-4)(x+3)=0", "x=4 or x=-3", "x=4"],
    "domain-violation", "final answer right, but -3 is dropped with no stated reason or restriction", "x=4", pair="p-b2")

s = "x/(x-3)=3/(x-3)+2"
SOL("the only candidate is excluded: no solution", RES, s,
    [("x ≠ 3", "restrict: x != 3"), "x=3+2(x-3)", "x=3+2x-6", "-x=-3", "x=3", ("but x=3 is excluded, so there is no solution", "empty")],
    "valid-implication", "x=3 is outside the domain; solution set empty", "no solution", pair="p-b3")
SOL("excluded candidate reported as the answer", RES, s,
    [("x ≠ 3", "restrict: x != 3"), "x=3+2(x-3)", "x=3+2x-6", "-x=-3", "x=3"], "invalid",
    "x=3 contradicts the stated restriction; there is no solution", "no solution", pair="p-b3")

s = "x/(x+2)-2/(x-2)=8/(x^2-4)"
SOL("eight-line rational equation with restriction and rejection", RES, s,
    [("x ≠ 2 and x ≠ -2", "restrict: x != 2 and x != -2"), "x(x-2)-2(x+2)=8", "x^2-2x-2x-4=8", "x^2-4x-12=0", "(x-6)(x+2)=0",
     "x=6 or x=-2", ("x=-2 is excluded, reject", None), "x=6"], "valid-implication",
    "check 6/8-2/4=1/4=8/32", "x=6", pair="p-b4", difficulty="hard")
SOL("rational equation: excluded root kept", RES, s,
    [("x ≠ 2 and x ≠ -2", "restrict: x != 2 and x != -2"), "x(x-2)-2(x+2)=8", "x^2-2x-2x-4=8", "x^2-4x-12=0", "(x-6)(x+2)=0",
     "x=6 or x=-2"], "invalid", "x=-2 is excluded", "x=6", pair="p-b4", difficulty="hard")
SOL("rational equation: sign slip in the middle", CHAIN, s,
    [("x ≠ 2 and x ≠ -2", "restrict: x != 2 and x != -2"), "x(x-2)-2(x+2)=8", "x^2-2x-2x+4=8", "x^2-4x-4=0", "x=2 ± 2sqrt(2)"],
    "invalid", "-2(x+2)=-2x-4", "x=6", pair="p-b4", difficulty="hard")

s = "1/(x-1)+1=2/(x-1)"
SOL("short rational equation with restriction", RES, s, [("x ≠ 1", "restrict: x != 1"), "1+(x-1)=2", "x=2"], "valid-equivalence",
    "2 is allowed", "x=2", pair="p-b5", difficulty="easy")
SOL("short rational equation, restriction omitted", RES, s, ["1+(x-1)=2", "x=2"], "domain-violation",
    "clears x-1 without stating x != 1", "x=2", pair="p-b5", difficulty="easy")

s = "3/(x-2)=1"
SOL("correct excluded value stated", RES, s, [("x ≠ 2", "restrict: x != 2"), "3=x-2", "x=5"], "valid-equivalence",
    "excluded value is 2", "x=5", pair="p-b6", difficulty="easy")
SOL("wrong excluded value stated", RES, s, [("x ≠ -2", "restrict: x != -2"), "3=x-2", "x=5"], "invalid",
    "the stated restriction is false: x=-2 is in the domain and x=2 is not; the line is a false claim", "x=5", pair="p-b6")

s = "(x^2-4)/(x-2)=4"
SOL("cancelled factor brings back the excluded value: no solution", RES, s,
    [("x ≠ 2", "restrict: x != 2"), "x+2=4", "x=2", ("x=2 is excluded, reject: no solution", "empty")], "valid-implication",
    "the only candidate is the excluded value", "no solution", pair="p-b7")
SOL("cancelled factor: excluded value reported", RES, s, [("x ≠ 2", "restrict: x != 2"), "x+2=4", "x=2"], "invalid",
    "x=2 makes the original undefined", "no solution", pair="p-b7")

s = "(x+1)/(x-1)<0"
SOL("sign analysis of a quotient with the restriction", RES, s,
    [("x ≠ 1", "restrict: x != 1"), ("Case x>1: x+1<0", "scope x>1 | x+1<0"), ("so x<-1, impossible in this case", "scope x>1 | empty"),
     ("Case x<1: x+1>0", "scope x<1 | x+1>0"), ("so -1<x<1", "scope x<1 | -1<x<1"), "-1<x<1"], "valid-equivalence",
    "numerator and denominator have opposite signs exactly on (-1,1)", "-1<x<1", pair="p-b8", difficulty="hard")
SOL("multiplying an inequality by a denominator of unknown sign", RES, s, ["x+1<0", "x<-1"], "invalid",
    "multiplying by x-1 assumes it is positive; x=0 solves the task but not x<-1", "-1<x<1", pair="p-b8")

# ======================================================================= C. case analysis
CASE = "case-scope propagation"
s = "|x-1|=2x"
SOL("case split on an absolute value, candidate checked against its case", CASE, s,
    [("Case x ≥ 1: x-1=2x", "scope x>=1 | x-1=2x"), ("so x=-1, not ≥ 1, reject", "scope x>=1 | x=-1"),
     ("Case x < 1: 1-x=2x", "scope x<1 | 1-x=2x"), ("so x=1/3", "scope x<1 | x=1/3"), "x=1/3"], "valid-equivalence",
    "only 1/3 lies in its case; check |1/3-1|=2/3", "x=1/3", pair="p-c1")
SOL("case split: candidate outside its case kept", CASE, s,
    [("Case x ≥ 1: x-1=2x", "scope x>=1 | x-1=2x"), ("so x=-1", "scope x>=1 | x=-1"),
     ("Case x < 1: 1-x=2x", "scope x<1 | 1-x=2x"), ("so x=1/3", "scope x<1 | x=1/3"), "x=-1 or x=1/3"], "invalid",
    "x=-1 gives |-2|=2 vs -2", "x=1/3", pair="p-c1")
SOL("case analysis with no conclusion", "completeness of a case analysis", s,
    [("Case x ≥ 1: x-1=2x", "scope x>=1 | x-1=2x"), ("Case x < 1: 1-x=2x", "scope x<1 | 1-x=2x")], "incomplete",
    "both case equations are right but neither is solved and nothing is concluded", "x=1/3", pair="p-c1")

s = "|x|+|x-2|=4"
C3 = [("Case x<0: -x-(x-2)=4", "scope x<0 | -x-(x-2)=4"), ("x=-1", "scope x<0 | x=-1"),
      ("Case 0≤x<2: x-(x-2)=4, i.e. 2=4, no solution", "scope 0<=x<2 | 2=4"),
      ("Case x≥2: x+x-2=4", "scope x>=2 | 2x-2=4"), ("x=3", "scope x>=2 | x=3")]
SOL("three-case split on two absolute values", CASE, s, C3 + ["x=-1 or x=3"], "valid-equivalence",
    "check |-1|+|-3|=4, |3|+|1|=4", "x=-1 or x=3", pair="p-c2", difficulty="hard")
SOL("three-case split: a case's solution not carried to the conclusion", CASE, s, C3 + ["x=3"], "invalid",
    "x=-1 found in case 1 is lost", "x=-1 or x=3", pair="p-c2", difficulty="hard")

s = "x^2-|x|-2=0"
SOL("case split with rejections in both cases", CASE, s,
    [("Case x ≥ 0: x^2-x-2=0", "scope x>=0 | x^2-x-2=0"), ("x=2 or x=-1; reject -1", "scope x>=0 | x=2 or x=-1"),
     ("Case x < 0: x^2+x-2=0", "scope x<0 | x^2+x-2=0"), ("x=-2 or x=1; reject 1", "scope x<0 | x=-2 or x=1"), "x=2 or x=-2"],
    "valid-equivalence", "each case keeps only its own-sign root", "x=2 or x=-2", pair="p-c3", difficulty="hard")
SOL("case split: roots outside their cases kept", CASE, s,
    [("Case x ≥ 0: x^2-x-2=0", "scope x>=0 | x^2-x-2=0"), ("x=2 or x=-1", "scope x>=0 | x=2 or x=-1"),
     ("Case x < 0: x^2+x-2=0", "scope x<0 | x^2+x-2=0"), ("x=-2 or x=1", "scope x<0 | x=-2 or x=1"), "x=2, -1, -2 or 1"],
    "invalid", "x=1: 1-1-2=-2 ≠ 0", "x=2 or x=-2", pair="p-c3", difficulty="hard")

s = "|2x-1|<5"
SOL("absolute-value inequality by cases", CASE, s,
    [("Case x ≥ 1/2: 2x-1<5", "scope x>=1/2 | 2x-1<5"), ("x<3", "scope x>=1/2 | x<3"), ("Case x < 1/2: 1-2x<5", "scope x<1/2 | 1-2x<5"),
     ("x>-2", "scope x<1/2 | x>-2"), "-2<x<3"], "valid-equivalence", "union of [1/2,3) and (-2,1/2)", "-2<x<3", pair="p-c4")
SOL("absolute-value inequality: case conclusions not intersected with the case", CASE, s,
    [("Case x ≥ 1/2: 2x-1<5", "scope x>=1/2 | 2x-1<5"), ("x<3", "scope x>=1/2 | x<3"), ("Case x < 1/2: 1-2x<5", "scope x<1/2 | 1-2x<5"),
     ("x>-2", "scope x<1/2 | x>-2"), "x<3"], "invalid", "x=-5 satisfies x<3 but |−11|=11", "-2<x<3", pair="p-c4")

s = "|x|=x+4"
SOL("one case is contradictory", CASE, s,
    [("Case x ≥ 0: x=x+4, i.e. 0=4", "scope x>=0 | 0=4"), ("no solution here", "scope x>=0 | empty"),
     ("Case x < 0: -x=x+4", "scope x<0 | -x=x+4"), ("x=-2", "scope x<0 | x=-2"), "x=-2"], "valid-equivalence",
    "check |-2|=2=-2+4", "x=-2", pair="p-c5")
SOL("one contradictory case taken as the whole answer", CASE, s,
    [("Case x ≥ 0: x=x+4, i.e. 0=4", "scope x>=0 | 0=4"), ("no solution", "empty")], "invalid",
    "the case x<0 gives x=-2", "x=-2", pair="p-c5")

s = "|x-3|=x-3"
SOL("a case that holds identically", CASE, s,
    [("Case x ≥ 3: x-3=x-3, true for all such x", "scope x>=3 | x-3=x-3"), ("Case x < 3: 3-x=x-3", "scope x<3 | 3-x=x-3"),
     ("x=3, not < 3, reject", "scope x<3 | x=3"), "x>=3"], "valid-equivalence", "|u|=u iff u ≥ 0", "x ≥ 3", pair="p-c6")
SOL("a case that holds identically, reported as a single point", CASE, s,
    [("Case x ≥ 3: x-3=x-3", "scope x>=3 | x-3=x-3"), ("Case x < 3: 3-x=x-3", "scope x<3 | 3-x=x-3"), "x=3"], "invalid",
    "x=4 also works", "x ≥ 3", pair="p-c6")

s = "1/x<2"
SOL("reciprocal inequality by the sign of x", CASE, s,
    [("x ≠ 0", "restrict: x != 0"), ("Case x>0: 1<2x", "scope x>0 | 1<2x"), ("x>1/2", "scope x>0 | x>1/2"),
     ("Case x<0: 1>2x (sign reversed)", "scope x<0 | 1>2x"), ("x<1/2, so all x<0", "scope x<0 | x<1/2"), "x<0 or x>1/2"],
    "valid-equivalence", "negative x always satisfy 1/x<2", "x<0 or x>1/2", pair="p-c7", difficulty="hard")
SOL("reciprocal inequality: multiplying by x without cases", CASE, s, ["1<2x", "x>1/2"], "invalid",
    "x=-1 satisfies 1/x<2 but not x>1/2", "x<0 or x>1/2", pair="p-c7")

s = "(x-2)/(x+1)>=0"
SOL("sign of a quotient by cases with the excluded point", CASE, s,
    [("x ≠ -1", "restrict: x != -1"), ("Case x>-1: x-2≥0", "scope x>-1 | x-2>=0"), ("x≥2", "scope x>-1 | x>=2"),
     ("Case x<-1: x-2≤0", "scope x<-1 | x-2<=0"), ("x≤2, so all x<-1", "scope x<-1 | x<=2"), "x<-1 or x>=2"],
    "valid-equivalence", "quotient ≥ 0 on (-oo,-1) and [2,oo)", "x<-1 or x ≥ 2", pair="p-c8", difficulty="hard")
SOL("sign of a quotient: excluded point included", CASE, s,
    [("x ≠ -1", "restrict: x != -1"), ("Case x>-1: x-2≥0", "scope x>-1 | x-2>=0"), ("x≥2", "scope x>-1 | x>=2"),
     ("Case x<-1: x-2≤0", "scope x<-1 | x-2<=0"), "x<=-1 or x>=2"], "invalid", "x=-1 makes the quotient undefined",
    "x<-1 or x ≥ 2", pair="p-c8", difficulty="hard")

s = "|x+1|+|x-1|=2"
C10 = [("Case x<-1: -2x=2", "scope x<-1 | -2x=2"), ("x=-1, not < -1, reject", "scope x<-1 | x=-1"),
       ("Case -1≤x≤1: (x+1)+(1-x)=2, always true", "scope -1<=x<=1 | 2=2"), ("Case x>1: 2x=2", "scope x>1 | 2x=2"),
       ("x=1, not > 1, reject", "scope x>1 | x=1")]
SOL("a case that contributes a whole interval", CASE, s, C10 + ["-1<=x<=1"], "valid-equivalence",
    "the middle case is an identity", "-1 ≤ x ≤ 1", pair="p-c9", difficulty="hard")
SOL("an identity case reduced to its endpoints", CASE, s, C10 + ["x=1 or x=-1"], "invalid", "x=0 also works",
    "-1 ≤ x ≤ 1", pair="p-c9", difficulty="hard")

s = "x|x|=4"
SOL("case split on the sign of x for x|x|", CASE, s,
    [("Case x ≥ 0: x^2=4", "scope x>=0 | x^2=4"), ("x=2", "scope x>=0 | x=2"), ("Case x < 0: -x^2=4, no solution", "scope x<0 | -x^2=4"),
     "x=2"], "valid-equivalence", "x|x|=4>0 forces x>0", "x=2", pair="p-c10")
SOL("treating x|x| as x^2 without cases", CASE, s, ["x^2=4", "x=2 or x=-2"], "invalid", "(-2)|-2|=-4", "x=2", pair="p-c10")

# ======================================================================= D. candidate checking obligations
CHK = "extraneous-root obligation"
s = "sqrt(x+2)=x"
SOL("squaring with an explicit check", CHK, s,
    ["x+2=x^2", "x^2-x-2=0", "x=2 or x=-1", ("check x=-1: sqrt(1)=1, not -1, reject", None), "x=2"], "valid-implication",
    "squaring is one-way; -1 is extraneous and rejected", "x=2", pair="p-d1")
SOL("squaring, extraneous root dropped with no check", CHK, s, ["x+2=x^2", "x^2-x-2=0", "x=2 or x=-1", "x=2"], "domain-violation",
    "answer right, but the rejection of -1 is never justified", "x=2", pair="p-d1")
SOL("squaring, extraneous root kept", CHK, s, ["x+2=x^2", "x^2-x-2=0", "x=2 or x=-1"], "invalid", "sqrt(1)=1 ≠ -1",
    "x=2", pair="p-d1")

s = "sqrt(x+7)=x-5"
SOL("checking both candidates after squaring", CHK, s,
    ["x+7=x^2-10x+25", "x^2-11x+18=0", "(x-2)(x-9)=0", "x=2 or x=9", ("check x=2: sqrt(9)=3 but 2-5=-3, reject", None),
     ("check x=9: sqrt(16)=4=9-5, ok", None), "x=9"], "valid-implication", "2 is extraneous", "x=9", pair="p-d2", difficulty="medium")
SOL("a check performed wrongly selects the extraneous root", CHK, s,
    ["x+7=x^2-10x+25", "x^2-11x+18=0", "(x-2)(x-9)=0", "x=2 or x=9", ("check x=9: reject", None), ("check x=2: ok", None), "x=2"],
    "invalid", "x=2: sqrt(9)=3 vs -3; the opposite root is correct", "x=9", pair="p-d2")

s = "sqrt(5x-4)=x"
SOL("checking candidates when neither is extraneous", CHK, s,
    ["5x-4=x^2", "x^2-5x+4=0", "x=1 or x=4", ("check: sqrt(1)=1 and sqrt(16)=4, both ok", None), "x=1 or x=4"], "valid-implication",
    "both candidates satisfy the original", "x=1 or x=4", pair="p-d3")
SOL("rejecting a genuine root", CHK, s, ["5x-4=x^2", "x^2-5x+4=0", "x=1 or x=4", ("reject x=1", None), "x=4"], "invalid",
    "sqrt(1)=1, so x=1 is a solution", "x=1 or x=4", pair="p-d3")

s = "ln(x)+ln(x-2)=ln(3)"
SOL("combining logarithms then rejecting the out-of-domain candidate", CHK, s,
    ["ln(x(x-2))=ln(3)", "x^2-2x=3", "(x-3)(x+1)=0", "x=3 or x=-1", ("x=-1 rejected since ln(-1) is undefined", None), "x=3"],
    "valid-implication", "ln a + ln b = ln(ab) widens the domain to x<0; the check restores it", "x=3", pair="p-d4")
SOL("combining logarithms, out-of-domain candidate kept", CHK, s,
    ["ln(x(x-2))=ln(3)", "x^2-2x=3", "(x-3)(x+1)=0", "x=3 or x=-1"], "invalid", "ln(-1) is undefined", "x=3", pair="p-d4")
SOL("combining logarithms, candidate dropped without comment", CHK, s,
    ["ln(x(x-2))=ln(3)", "x^2-2x=3", "(x-3)(x+1)=0", "x=3 or x=-1", "x=3"], "domain-violation",
    "-1 is dropped with no stated reason", "x=3", pair="p-d4")

s = "x-2sqrt(x)-3=0"
SOL("substitution u = sqrt(x) with a sign obligation", CHK, s,
    ["(sqrt(x)-3)(sqrt(x)+1)=0", "sqrt(x)=3 or sqrt(x)=-1", ("sqrt(x)=-1 is impossible", None), "x=9"], "valid-equivalence",
    "sqrt(x) ≥ 0; check 9-6-3=0", "x=9", pair="p-d5")
SOL("substitution: squaring the impossible branch", CHK, s, ["(sqrt(x)-3)(sqrt(x)+1)=0", "sqrt(x)=3 or sqrt(x)=-1", "x=9 or x=1"],
    "invalid", "x=1: 1-2-3=-4", "x=9", pair="p-d5")

s = "sqrt(x+3)-sqrt(x)=1"
SOL("squaring twice with a final check", CHK, s,
    ["sqrt(x+3)=1+sqrt(x)", "x+3=1+2sqrt(x)+x", "2=2sqrt(x)", "sqrt(x)=1", "x=1", ("check: sqrt(4)-sqrt(1)=1", "claim: sqrt(4)-sqrt(1)=1")],
    "valid-equivalence", "both squared sides are nonnegative, so each step is reversible; check passes", "x=1", pair="p-d6",
    difficulty="hard")
SOL("squaring a binomial without the cross term", CHK, s, ["sqrt(x+3)=1+sqrt(x)", "x+3=1+sqrt(x)+x", "sqrt(x)=2", "x=4"],
    "invalid", "(1+sqrt x)^2=1+2sqrt x+x; x=4 gives sqrt7-2 ≠ 1", "x=1", pair="p-d6", difficulty="hard")

s = "e^(2x)-e^x-2=0"
SOL("exponential quadratic with an impossible factor stated", CHK, s,
    ["(e^x-2)(e^x+1)=0", "e^x=2 or e^x=-1", ("e^x=-1 is impossible since e^x>0", None), "x=ln(2)"], "valid-equivalence",
    "e^x>0", "x=ln 2", pair="p-d7")
SOL("exponential quadratic: impossible factor omitted silently (a harmless gap)", "missing intermediate step that is still correct",
    s, ["(e^x-2)(e^x+1)=0", "e^x=2", "x=ln(2)"], "valid-equivalence",
    "e^x+1>0 for every x, so dropping it changes nothing; the step is correct though unexplained", "x=ln 2", pair="p-d7")

# ======================================================================= E. side claims
SIDE = "truth of side claims"
s = "2^(x+1)=32"
SOL("true arithmetic aside", SIDE, s, [("since 2^5=32", "claim: 2^5=32"), "x+1=5", "x=4"], "valid-equivalence",
    "2^5=32", "x=4", pair="p-e1", difficulty="easy")
SOL("false arithmetic aside with a correct answer", SIDE, s, [("since 2^5=64", "claim: 2^5=64"), "x+1=5", "x=4"], "invalid",
    "2^5=32; the aside is false even though the answer is right", "x=4", pair="p-e1", difficulty="easy")

s = "x+y=10, x-y=4"
SYS("true aside used in elimination", SIDE, s, [("adding: 10+4=14", "claim: 10+4=14"), "2x=14", "x=7", "y=3"], "valid-equivalence",
    "check 7+3=10, 7-3=4", "x=7, y=3", pair="p-e2")
SYS("false aside propagates into the answer", SIDE, s, [("adding: 10+4=12", "claim: 10+4=12"), "2x=12", "x=6", "y=4"], "invalid",
    "10+4=14", "x=7, y=3", pair="p-e2")

s = "x^2-4x+1=0"
SOL("quadratic formula with a discriminant aside", SIDE, s,
    [("discriminant (-4)^2-4(1)(1)=12", "claim: (-4)^2-4(1)(1)=12"), "x=(4 ± sqrt(12))/2", "x=2 ± sqrt(3)"], "valid-equivalence",
    "sqrt12=2sqrt3", "x=2 ± sqrt 3", pair="p-e3")
SOL("quadratic formula: wrong discriminant", SIDE, s,
    [("discriminant (-4)^2-4(1)(1)=20", "claim: (-4)^2-4(1)(1)=20"), "x=(4 ± sqrt(20))/2", "x=2 ± sqrt(5)"], "invalid",
    "16-4=12", "x=2 ± sqrt 3", pair="p-e3")
SOL("quadratic formula: halving slip at the end", CHAIN, s,
    [("discriminant (-4)^2-4(1)(1)=12", "claim: (-4)^2-4(1)(1)=12"), "x=(4 ± sqrt(12))/2", "x=2 ± 2sqrt(3)"], "invalid",
    "sqrt(12)/2=sqrt3", "x=2 ± sqrt 3", pair="p-e3")

s = "3x+5=20"
SOL("irrelevant but true aside", SIDE, s, ["3x=15", ("note 15/3=5", "claim: 15/3=5"), "x=5"], "valid-equivalence", "aside true",
    "x=5", pair="p-e4", difficulty="easy")
SOL("irrelevant false aside", SIDE, s, ["3x=15", ("note 15/3=6", "claim: 15/3=6"), "x=5"], "invalid",
    "15/3=5; a false line makes the working invalid even if unused", "x=5", pair="p-e4", difficulty="easy")

s = "2x^2-3x-2=0"
SOL("quadratic formula step by step", SIDE, s,
    [("a=2, b=-3, c=-2", None), ("b^2-4ac=9+16=25", "claim: (-3)^2-4(2)(-2)=25"), "x=(3 ± 5)/4",
     "x=2 or x=-1/2"], "valid-equivalence", "(2x+1)(x-2)=0", "x=2 or x=-1/2", pair="p-e5")
SOL("quadratic formula: -b taken as b", CHAIN, s,
    [("a=2, b=-3, c=-2", None), ("b^2-4ac=25", "claim: (-3)^2-4(2)(-2)=25"), "x=(-3 ± 5)/4", "x=1/2 or x=-2"], "invalid",
    "-b=3", "x=2 or x=-1/2", pair="p-e5")

CAL({"type": "definite-integral", "f": "3x^2+2x", "a": "1", "b": "2", "var": "x"}, "antiderivative aside in a definite integral", SIDE,
    [("antiderivative x^3+x^2, since d/dx(x^3+x^2)=3x^2+2x", "claim: d/dx(x^3+x^2) = 3x^2+2x"), ("(8+4)-(1+1)", None), ("= 10", "final: 10")],
    "valid-equivalence", "F(2)-F(1)=12-2", "10", pair="p-e6")
CAL({"type": "definite-integral", "f": "3x^2+2x", "a": "1", "b": "2", "var": "x"}, "correct value reached through a false antiderivative claim",
    SIDE, [("antiderivative x^3+x^2, since d/dx(x^3+x^2)=3x^2+x", "claim: d/dx(x^3+x^2) = 3x^2+x"), ("(8+4)-(1+1)", None), ("= 10", "final: 10")],
    "invalid", "d/dx(x^2)=2x, so the stated derivative claim is false", "10", pair="p-e6")

CAL({"type": "derivative", "f": "sin(x^2)", "var": "x"}, "chain rule with an inner-derivative aside", SIDE,
    [("inner derivative d/dx(x^2)=2x", "claim: d/dx(x^2) = 2x"), ("f'(x)=2x cos(x^2)", "final: 2x cos(x^2)")], "valid-equivalence",
    "chain rule", "2x cos(x^2)", pair="p-e7", domain="calculus")
CAL({"type": "derivative", "f": "sin(x^2)", "var": "x"}, "correct derivative with a false aside", SIDE,
    [("inner derivative d/dx(x^2)=x", "claim: d/dx(x^2) = x"), ("f'(x)=2x cos(x^2)", "final: 2x cos(x^2)")], "invalid",
    "d/dx(x^2)=2x; the aside is false", "2x cos(x^2)", pair="p-e7", domain="calculus")

SHOW("side computation inside an identity proof", SIDE, "(x+3)^2-(x-3)^2", "12x",
     [("cross terms: 2(3)(2)=12", "claim: 2(3)(2)=12"), "x^2+6x+9-(x^2-6x+9)", "12x"], "valid-equivalence", "6x-(-6x)=12x", pair="p-e8")
SHOW("false side computation inside an identity proof", SIDE, "(x+3)^2-(x-3)^2", "12x",
     [("cross terms: 2(3)(2)=10", "claim: 2(3)(2)=10"), "x^2+6x+9-(x^2-6x+9)", "12x"], "invalid", "2·3·2=12", pair="p-e8")

# ======================================================================= F. gaps: correct vs error-hiding
GAP = "missing intermediate step that is still correct"
HIDE = "a gap that hides an error"
SOL("one-line answer to a multi-step linear equation", GAP, "2(x-3)+4=3x-5", ["x=3"], "valid-equivalence",
    "omitted algebra is routine and the answer is correct", "x=3", pair="p-f1", difficulty="easy")
SOL("one-line answer hiding a distribution error", HIDE, "2(x-3)+4=3x-5", ["x=6"], "invalid", "x=6: 10 vs 13", "x=3", pair="p-f1",
    difficulty="easy")
SOL("factor-and-read-off in one line", GAP, "x^3=4x", ["x=0, 2 or -2"], "valid-equivalence", "x(x-2)(x+2)=0", "x=0, ±2", pair="p-f2")
SOL("dividing by x hides a lost root", HIDE, "x^3=4x", ["x^2=4", "x=2 or x=-2"], "invalid", "dividing by x loses x=0", "x=0, ±2",
    pair="p-f2")
SOL("adding fractions mentally", GAP, "x/2+x/3=5", ["5x/6=5", "x=6"], "valid-equivalence", "x/2+x/3=5x/6", "x=6", pair="p-f3")
SOL("adding fractions by adding denominators", HIDE, "x/2+x/3=5", ["x/5=5", "x=25"], "invalid", "x/2+x/3 ≠ x/5; x=25 gives 125/6",
    "x=6", pair="p-f3")
SOL("inequality answered in one line", GAP, "3-2x>=7", ["x<=-2"], "valid-equivalence", "-2x≥4, reverse", "x ≤ -2", pair="p-f4",
    difficulty="easy")
SOL("inequality answered in one line with the sign flip missed", HIDE, "3-2x>=7", ["x>=-2"], "invalid", "x=0 gives 3 ≥ 7 false",
    "x ≤ -2", pair="p-f4", difficulty="easy")
SYS("system answered directly", GAP, "2x+y=5, x-y=1", ["x=2, y=1"], "valid-equivalence", "check 5 and 1", "x=2, y=1",
    pair="p-f5", difficulty="easy")
SYS("system answered directly but wrongly", HIDE, "2x+y=5, x-y=1", ["x=3, y=-1"], "invalid", "x-y=4 ≠ 1", "x=2, y=1", pair="p-f5",
    difficulty="easy")

# ======================================================================= G. show-that chains of increasing length
ICH = "identity chain of increasing length"
SHOW("two-link show: difference of cubes of shifted x", ICH, "(x+1)^3-(x-1)^3", "6x^2+2",
     ["(x^3+3x^2+3x+1)-(x^3-3x^2+3x-1)", "6x^2+2"], "valid-equivalence", "binomial expansions", pair="p-g1")
SHOW("restating the start is not a proof", "statement that restates the problem", "(x+1)^3-(x-1)^3", "6x^2+2",
     ["(x+1)^3-(x-1)^3"], "incomplete",
     "the only line repeats the given expression; nothing has been shown",
     pair="p-g1")
S3 = ["(x^3+6x^2+12x+8)-(x^3-6x^2+12x-8)", "x^3+6x^2+12x+8-x^3+6x^2-12x+8", "12x^2+16"]
SHOW("three-link show with a bracket removal", ICH, "(x+2)^3-(x-2)^3", "12x^2+16", S3, "valid-equivalence",
     "the minus distributes over every term", pair="p-g2")
SHOW("three-link show: minus not distributed", ICH, "(x+2)^3-(x-2)^3", "12x^2+16",
     ["(x^3+6x^2+12x+8)-(x^3-6x^2+12x-8)", "x^3+6x^2+12x+8-x^3-6x^2+12x-8", "24x"], "invalid",
     "the second line equals 24x, not the previous line", pair="p-g2")
SHOW("show-that stopped before the target is written", "completeness of a show chain", "(x+2)^3-(x-2)^3", "12x^2+16", S3[:1],
     "incomplete",
     "the expansion is right but the simplification to 12x^2+16 is never done", pair="p-g2")
SHOW("partial fractions identity", ICH, "1/x-1/(x+1)", "1/(x(x+1))", ["(x+1)/(x(x+1))-x/(x(x+1))", "(x+1-x)/(x(x+1))", "1/(x(x+1))"],
     "valid-equivalence", "same domain x ≠ 0,-1 throughout", pair="p-g3")
SHOW("partial fractions identity: numerator slip", ICH, "1/x-1/(x+1)", "1/(x(x+1))",
     ["(x+1)/(x(x+1))-x/(x(x+1))", "(x+1+x)/(x(x+1))", "1/(x(x+1))"], "invalid", "subtracting x, not adding", pair="p-g3")
SHOW("four-link factorisation of x^4+x^2+1", ICH, "x^4+x^2+1", "(x^2+x+1)(x^2-x+1)",
     ["x^4+2x^2+1-x^2", "(x^2+1)^2-x^2", "(x^2+1-x)(x^2+1+x)", "(x^2+x+1)(x^2-x+1)"], "valid-equivalence",
     "add and subtract x^2, difference of squares", pair="p-g4", difficulty="hard")
SHOW("four-link factorisation: difference of squares misapplied", ICH, "x^4+x^2+1", "(x^2+x+1)(x^2-x+1)",
     ["x^4+2x^2+1-x^2", "(x^2+1)^2-x^2", "(x^2+1-x)^2", "(x^2+x+1)(x^2-x+1)"], "invalid", "A^2-B^2=(A-B)(A+B), not (A-B)^2",
     pair="p-g4", difficulty="hard")
G6 = ["((x+1)(x+4))((x+2)(x+3))+1", "(x^2+5x+4)(x^2+5x+6)+1", "(x^2+5x)^2+10(x^2+5x)+24+1", "(x^2+5x)^2+10(x^2+5x)+25",
      "((x^2+5x)+5)^2", "(x^2+5x+5)^2"]
SHOW("six-link show by pairing factors", ICH, "(x+1)(x+2)(x+3)(x+4)+1", "(x^2+5x+5)^2", G6, "valid-equivalence",
     "pair outer and inner factors, put u=x^2+5x", pair="p-g5", difficulty="hard")
SHOW("six-link show with a coefficient slip in the middle", ICH, "(x+1)(x+2)(x+3)(x+4)+1", "(x^2+5x+5)^2",
     G6[:2] + ["(x^2+5x)^2+9(x^2+5x)+24+1"] + G6[3:], "invalid", "(u+4)(u+6)=u^2+10u+24", pair="p-g5", difficulty="hard")
SHOW("the same identity in one step", GAP, "(x+1)(x+2)(x+3)(x+4)+1", "(x^2+5x+5)^2", ["(x^2+5x+5)^2"], "valid-equivalence",
     "the identity is true; only the reasoning is compressed", pair="p-g5")
SHOW("the same identity via a wrong intermediate square", HIDE, "(x+1)(x+2)(x+3)(x+4)+1", "(x^2+5x+5)^2",
     ["(x^2+5x+4)^2", "(x^2+5x+5)^2"], "invalid", "x=0: 25 vs 16 for the first link", pair="p-g5")
SHOW("double-angle show for tan", ICH, "sin(2x)/(1+cos(2x))", "tan(x)",
     ["2sin(x)cos(x)/(1+2cos(x)^2-1)", "2sin(x)cos(x)/(2cos(x)^2)", "sin(x)/cos(x)", "tan(x)"], "valid-equivalence",
     "1+cos2x=0 exactly where cos x=0, so the domain is unchanged", pair="p-g6", domain="trigonometry")
SHOW("double-angle show whose last step widens the domain", ICH, "(1-cos(2x))/sin(2x)", "tan(x)",
     ["2sin(x)^2/(2sin(x)cos(x))", "sin(x)/cos(x)", "tan(x)"], "domain-violation",
     "the left side is undefined at x=0 (sin 2x=0) but tan 0=0; cancelling sin x needs sin x ≠ 0", pair="p-g6", domain="trigonometry")
SHOW("identity with a cancelled reciprocal: restriction stated", RES, "(x+1/x)^2-(x-1/x)^2", "4",
     [("x ≠ 0", "restrict: x != 0"), "x^2+2+1/x^2-(x^2-2+1/x^2)", "4"], "valid-equivalence", "valid for x ≠ 0, which is stated",
     pair="p-g7")
SHOW("identity with a cancelled reciprocal: restriction omitted", RES, "(x+1/x)^2-(x-1/x)^2", "4",
     ["x^2+2+1/x^2-(x^2-2+1/x^2)", "4"], "domain-violation", "the constant 4 is defined at 0, the start is not", pair="p-g7")
SHOW("cancel then subtract with restriction", RES, "(x^2-1)/(x-1)-1", "x", [("x ≠ 1", "restrict: x != 1"), "(x-1)(x+1)/(x-1)-1", "x+1-1", "x"],
     "valid-equivalence", "x ≠ 1 stated", pair="p-g8")
SHOW("cancel then subtract without restriction", RES, "(x^2-1)/(x-1)-1", "x", ["(x-1)(x+1)/(x-1)-1", "x+1-1", "x"],
     "domain-violation", "x is defined at 1, the start is not", pair="p-g8")
G10 = ["((x+1)^2)^2-((x-1)^2)^2", "((x+1)^2-(x-1)^2)((x+1)^2+(x-1)^2)", "(4x)((x+1)^2+(x-1)^2)", "(4x)(x^2+2x+1+x^2-2x+1)",
       "(4x)(2x^2+2)", "8x^3+8x"]
SHOW("six-link show via nested difference of squares", ICH, "(x+1)^4-(x-1)^4", "8x^3+8x", G10, "valid-equivalence",
     "A^4-B^4=(A^2-B^2)(A^2+B^2)", pair="p-g9", difficulty="hard")
SHOW("six-link show with a slip in the fifth line", ICH, "(x+1)^4-(x-1)^4", "8x^3+8x", G10[:4] + ["(4x)(2x^2+1)", "8x^3+8x"], "invalid",
     "1+1=2, not 1; the fifth line is not equal to the fourth", pair="p-g9", difficulty="hard")
SHOW("two-variable show", ICH, "(a+b)^2-(a-b)^2", "4a b", ["a^2+2a b+b^2-(a^2-2a b+b^2)", "4a b"], "valid-equivalence",
     "squares cancel", difficulty="easy")
SHOW("two-variable four-term identity", ICH, "(a^2+b^2)(c^2+d^2)", "(a c-b d)^2+(a d+b c)^2",
     ["a^2 c^2+a^2 d^2+b^2 c^2+b^2 d^2", "(a^2 c^2-2a b c d+b^2 d^2)+(a^2 d^2+2a b c d+b^2 c^2)", "(a c-b d)^2+(a d+b c)^2"],
     "valid-equivalence", "insert ±2abcd", difficulty="hard")
SHOW("difference of reciprocals over a product", ICH, "1/(x-1)-1/(x+1)", "2/(x^2-1)",
     ["((x+1)-(x-1))/((x-1)(x+1))", "2/((x-1)(x+1))", "2/(x^2-1)"], "valid-equivalence", "domains agree", pair="p-g10")
SHOW("difference of reciprocals: bracket dropped", ICH, "1/(x-1)-1/(x+1)", "2/(x^2-1)",
     ["(x+1-x-1)/((x-1)(x+1))", "0", "2/(x^2-1)"], "invalid", "-(x-1)=-x+1", pair="p-g10")
SHOW("square of sin+cos", ICH, "(sin(x)+cos(x))^2", "1+sin(2x)", ["sin(x)^2+2sin(x)cos(x)+cos(x)^2", "1+2sin(x)cos(x)", "1+sin(2x)"],
     "valid-equivalence", "Pythagorean identity and double angle", pair="p-g11", domain="trigonometry")
SHOW("square of sin+cos: cross term forgotten", ICH, "(sin(x)+cos(x))^2", "1+sin(2x)", ["sin(x)^2+cos(x)^2", "1", "1+sin(2x)"],
     "invalid", "x=pi/4: 2 vs 1", pair="p-g11", domain="trigonometry")

# ======================================================================= H. correct final answer via an invalid step
VIA = "a correct final answer reached through an invalid step"
SOL("two compensating errors", VIA, "2(x-3)+4=3x-5", ["2x-3+4=3x-5", "2x-2=3x-5", "x=3"], "invalid",
    "line 1 is false at x=3 (5 vs 4); line 2 does not follow from line 1", "x=3", pair="p-h1")
SOL("wrong factorisation, right roots", VIA, "x^2-5x+6=0", ["(x+2)(x+3)=0", "x=2 or x=3"], "invalid",
    "(x+2)(x+3)=x^2+5x+6; its roots are -2,-3", "x=2 or x=3", pair="p-h2")
SOL("factorisation and roots both correct", SET, "x^2-5x+6=0", ["(x-2)(x-3)=0", "x=2 or x=3"], "valid-equivalence",
    "zero-product property", "x=2 or x=3", pair="p-h2", difficulty="easy")
SOL("arithmetic error compensated later", VIA, "5x-3=2x+9", ["5x=2x+6", "3x=12", "x=4"], "invalid", "9+3=12, so 5x=2x+12; line 2 contradicts line 1",
    "x=4")
SOL("lost branch then answer restored from nowhere", VIA, "(x-1)^2=9", ["x-1=3", "x=4 or x=-2"], "invalid",
    "x-1=3 loses x-1=-3; the final answer does not follow", "x=4 or x=-2", pair="p-h3")
SOL("both branches of a square root", SET, "(x-1)^2=9", ["x-1=3 or x-1=-3", "x=4 or x=-2"], "valid-equivalence",
    "two square roots", "x=4 or x=-2", pair="p-h3", difficulty="easy")
SHOW("identity reached through a wrong expansion", VIA, "(x+1)^2-(x-1)^2", "4x", ["x^2+2x+1-x^2-2x+1", "4x"], "invalid",
     "the first line equals 2, not 4x")
SYS("system with a false intermediate line", VIA, "2x+y=5, x-y=1", ["3x=6", "x=2", "y=x+1", "y=1"], "invalid",
    "y=x+1 is false at (2,1)", "x=2, y=1")
SOL("inequality: missed flip then corrected silently", VIA, "-3x>6", ["x>-2", "x<-2"], "invalid",
    "line 1 is false (x=0 satisfies it, not the task); the final line contradicts the previous", "x<-2", pair="p-h4")
SOL("inequality: flip done correctly", SET, "-3x>6", ["x<-2"], "valid-equivalence", "divide by -3, reverse", "x<-2", pair="p-h4",
    difficulty="easy")

# ======================================================================= I. statements that restate the problem
RST = "statement that restates the problem"
SOL("restating the equation as the answer", RST, "x^2-5x+6=0", ["x^2-5x+6=0"], "incomplete", "nothing is solved", "x=2 or x=3",
    pair="p-h2", difficulty="easy")
SOL("factored form without reading off the roots", RST, "x^2-5x+6=0", ["(x-2)(x-3)=0"], "incomplete",
    "equivalent form, roots not stated", "x=2 or x=3", pair="p-h2", difficulty="easy")
SOL("one step then stop", RST, "3x+2=11", ["3x=9"], "incomplete", "x not isolated", "x=3", pair="p-i1", difficulty="easy")
SOL("one step then finish", SET, "3x+2=11", ["3x=9", "x=3"], "valid-equivalence", "subtract, divide", "x=3", pair="p-i1",
    difficulty="easy")
SYS("restating a system", RST, "2x+y=5, x-y=1", ["2x+y=5", "x-y=1"], "incomplete", "no variable is found", "x=2, y=1",
    difficulty="easy")
SOL("rearranged restatement of a radical equation", RST, "sqrt(x+2)=x", ["x=sqrt(x+2)"], "incomplete",
    "same equation with sides swapped", "x=2")
SOL("inequality rewritten but not solved", RST, "-2x<6", ["2x>-6"], "incomplete", "equivalent, but x is not isolated", "x>-3")

# ======================================================================= J. over-claiming conclusions
OVR = "over-claiming a conclusion"
SOL("adding an unjustified extra condition", OVR, "3x-7<5", ["3x<12", "x<4", "x<4 and x>0"], "invalid",
    "x=-1 satisfies the task but is excluded", "x<4")
SOL("keeping only the positive square root", OVR, "x^2=9", ["x=3"], "invalid", "x=-3 also works", "x=±3", difficulty="easy")
SOL("keeping one branch of a quadratic inequality", OVR, "x^2>4", ["x>2"], "invalid", "x=-3 works", "x<-2 or x>2", pair="p-j1")
SOL("quadratic inequality via |x|", SET, "x^2>4", ["|x|>2", "x>2 or x<-2"], "valid-equivalence", "sqrt(x^2)=|x|",
    "x<-2 or x>2", pair="p-j1")
SOL("claiming a spurious second root", OVR, "2x+1=5", ["2x=4", "x=2 or x=-2"], "invalid", "linear equation; -2 gives -3",
    "x=2", difficulty="easy")
SOL("strict square inequality said to hold everywhere", OVR, "(x-1)^2>0", [("true for every real x", "-oo<x<oo")], "invalid",
    "fails at x=1", "x ≠ 1", pair="p-j2")
SOL("strict square inequality with its exception", SET, "(x-1)^2>0", ["x != 1"], "valid-equivalence", "zero only at 1", "x ≠ 1",
    pair="p-j2")
SOL("dividing an inequality by x of unknown sign", OVR, "x^2<=4x", ["x^2-4x<=0", "x<=4"], "invalid",
    "x=-1 satisfies x ≤ 4 but 1 ≤ -4 is false", "0 ≤ x ≤ 4", pair="p-j3")
SOL("factored quadratic inequality", SET, "x^2<=4x", ["x^2-4x<=0", "x(x-4)<=0", "0<=x<=4"], "valid-equivalence",
    "product ≤ 0 between the roots", "0 ≤ x ≤ 4", pair="p-j3")
SOL("an always-true inequality reduced to a partial range", OVR, "x^2+1>0", ["x^2>-1", "x>-1"], "invalid",
    "x=-2 also satisfies the task", "all real x", pair="p-j4")
SOL("an always-true inequality", SET, "x^2+1>0", ["x^2>-1", ("a square is never negative, so every real x works", "-oo<x<oo")],
    "valid-equivalence", "x^2 ≥ 0 > -1", "all real x", pair="p-j4")

# ======================================================================= K. cited reasons
WR = "cited reason matches the step"
SOL("subtracting from both sides, correctly named", WR, "2x+3=11",
    [("subtract 3 from both sides: 2x=8", "2x=8"), ("divide both sides by 2: x=4", "x=4")], "valid-equivalence",
    "the named operations are the ones performed", "x=4", pair="p-k1", difficulty="easy")
SOL("subtracting from both sides, named as the distributive property", WR, "2x+3=11",
    [("by the distributive property, 2x=8", "2x=8"), ("divide both sides by 2: x=4", "x=4")], "wrong-reason",
    "the step is subtraction of 3 from both sides; distributivity plays no role", "x=4", pair="p-k1", difficulty="easy")
CAL({"type": "derivative", "f": "sin(x^2)", "var": "x"}, "chain rule named correctly", WR,
    [("by the chain rule: f'(x)=cos(x^2)·2x", "final: 2x cos(x^2)")], "valid-equivalence", "composition sin∘(x^2)", "2x cos(x^2)",
    pair="p-k2")
CAL({"type": "derivative", "f": "sin(x^2)", "var": "x"}, "chain-rule result attributed to the product rule", WR,
    [("by the product rule: f'(x)=cos(x^2)·2x", "final: 2x cos(x^2)")], "wrong-reason",
    "sin(x^2) is a composition, not a product; the result is right", "2x cos(x^2)", pair="p-k2")
s = "ln(x)+ln(x-2)=ln(3)"
SOL("product rule for logarithms named correctly", WR, s,
    [("by the product rule for logarithms: ln(x(x-2))=ln(3)", "ln(x(x-2))=ln(3)"), "x^2-2x=3", "x=3 or x=-1",
     ("reject x=-1 since ln(-1) is undefined", None), "x=3"], "valid-implication", "ln a + ln b = ln ab for a,b>0", "x=3", pair="p-k3")
SOL("product rule for logarithms called the power rule", WR, s,
    [("by the power rule for logarithms: ln(x(x-2))=ln(3)", "ln(x(x-2))=ln(3)"), "x^2-2x=3", "x=3 or x=-1",
     ("reject x=-1 since ln(-1) is undefined", None), "x=3"], "wrong-reason",
    "the power rule is ln(a^k)=k ln a; the step used ln a + ln b = ln ab", "x=3", pair="p-k3")
SOL("dividing by a negative reverses the inequality", WR, "-2x<6",
    [("divide by -2 and reverse the inequality: x>-3", "x>-3")], "valid-equivalence", "multiplying by a negative reverses order",
    "x>-3", pair="p-k4", difficulty="easy")
SOL("correct inequality with a false justification", WR, "-2x<6",
    [("divide by -2; dividing by a negative keeps the direction: x>-3", "x>-3")], "wrong-reason",
    "the result reverses the direction, contradicting the stated reason", "x>-3", pair="p-k4", difficulty="easy")
EXPR("expand", "perfect-square identity named correctly", WR, "(x+3)^2", [("by the perfect-square identity: x^2+6x+9", "x^2+6x+9")],
     "valid-equivalence", "(a+b)^2=a^2+2ab+b^2", "x^2+6x+9", pair="p-k5", difficulty="easy")
EXPR("expand", "perfect-square expansion attributed to difference of squares", WR, "(x+3)^2",
     [("by the difference of squares: x^2+6x+9", "x^2+6x+9")], "wrong-reason", "no difference of squares is involved", "x^2+6x+9",
     pair="p-k5", difficulty="easy")
EXPR("factor", "difference of squares named correctly", WR, "x^2-9", [("difference of squares: (x-3)(x+3)", "(x-3)(x+3)")],
     "valid-equivalence", "a^2-b^2=(a-b)(a+b)", "(x-3)(x+3)", pair="p-k6", difficulty="easy")
EXPR("factor", "difference of squares attributed to the perfect-square formula", WR, "x^2-9",
     [("by the perfect-square formula: (x-3)(x+3)", "(x-3)(x+3)")], "wrong-reason", "x^2-9 is not a perfect square", "(x-3)(x+3)",
     pair="p-k6", difficulty="easy")
CAL({"type": "derivative", "f": "e^(3x)", "var": "x"}, "exponential with linear inner function: chain rule", WR,
    [("by the chain rule: 3e^(3x)", "final: 3e^(3x)")], "valid-equivalence", "inner derivative 3", "3e^(3x)", pair="p-k7")
CAL({"type": "derivative", "f": "e^(3x)", "var": "x"}, "exponential with linear inner function attributed to the product rule", WR,
    [("by the product rule: 3e^(3x)", "final: 3e^(3x)")], "wrong-reason", "e^(3x) is not a product", "3e^(3x)", pair="p-k7")
SOL("absolute-value inequality by its definition", WR, "|x-2|<3",
    [("since |u|<a means -a<u<a: -3<x-2<3", "-3<x-2<3"), "-1<x<5"], "valid-equivalence", "standard equivalence", "-1<x<5", pair="p-k8")
SOL("absolute-value inequality attributed to the triangle inequality", WR, "|x-2|<3",
    [("by the triangle inequality: -3<x-2<3", "-3<x-2<3"), "-1<x<5"], "wrong-reason",
    "the triangle inequality |a+b| ≤ |a|+|b| does not give this equivalence", "-1<x<5", pair="p-k8")
CAL({"type": "definite-integral", "f": "3x^2", "a": "1", "b": "2", "var": "x"}, "fundamental theorem cited correctly", WR,
    [("by the fundamental theorem of calculus: [x^3] from 1 to 2", None), ("= 8-1 = 7", "final: 7")], "valid-equivalence",
    "F(x)=x^3", "7", pair="p-k9", domain="calculus")
CAL({"type": "definite-integral", "f": "3x^2", "a": "1", "b": "2", "var": "x"}, "definite integral attributed to the chain rule", WR,
    [("by the chain rule: [x^3] from 1 to 2", None), ("= 8-1 = 7", "final: 7")], "wrong-reason",
    "evaluation uses the fundamental theorem; the chain rule is not involved", "7", pair="p-k9", domain="calculus")
SYS("adding equations, named correctly", WR, "2x+y=5, x-y=1", [("adding the equations: 3x=6", "3x=6"), "x=2", "y=1"],
    "valid-equivalence", "y cancels on addition", "x=2, y=1", pair="p-k10")
SYS("adding equations, described as subtracting", WR, "2x+y=5, x-y=1", [("subtracting the equations: 3x=6", "3x=6"), "x=2", "y=1"],
    "wrong-reason", "subtracting gives x+2y=4; the line 3x=6 comes from adding", "x=2, y=1", pair="p-k10")
SOL("repeated root justified by a zero discriminant", WR, "x^2-6x+9=0",
    [("the discriminant is 0, so there is one repeated root: (x-3)^2=0", "(x-3)^2=0"), "x=3"], "valid-equivalence",
    "36-36=0", "x=3", pair="p-k11")
SOL("repeated root justified by a negative discriminant", WR, "x^2-6x+9=0",
    [("the discriminant is negative, so there is only one root: (x-3)^2=0", "(x-3)^2=0"), "x=3"], "wrong-reason",
    "the discriminant is 0; a negative discriminant would mean no real roots", "x=3", pair="p-k11")

# ======================================================================= L. parameters (policy)
SOL("dividing by a parameter in a solve chain", "parameter condition when dividing", "a x+1=7", ["a x=6", "x=6/a"],
    "insufficient-information", "needs a ≠ 0; for a=0 there is no solution", "x=6/a (a ≠ 0)")
SOL("square root of a parameter", "parameter condition for real roots", "x^2=k", ["x=± sqrt(k)"], "insufficient-information",
    "real roots only when k ≥ 0", "x=±sqrt(k) for k ≥ 0")

# ======================================================================= N. calculus chains
DER = {"type": "derivative", "f": "(3x+1)^5 sin(x)", "var": "x"}
CAL(DER, "product rule with an embedded chain rule", "multi-step derivative",
    [("u=(3x+1)^5, u'=15(3x+1)^4", "claim: d/dx((3x+1)^5) = 15(3x+1)^4"), ("v=sin x, v'=cos x", "claim: d/dx(sin(x)) = cos(x)"),
     ("f'=15(3x+1)^4 sin(x)+(3x+1)^5 cos(x)", "final: 15(3x+1)^4 sin(x)+(3x+1)^5 cos(x)")], "valid-equivalence", "u'v+uv'",
    "15(3x+1)^4 sin x + (3x+1)^5 cos x", pair="p-n1", domain="calculus")
CAL(DER, "product rule with the inner chain factor missing", "multi-step derivative",
    [("u=(3x+1)^5, u'=5(3x+1)^4", "claim: d/dx((3x+1)^5) = 5(3x+1)^4"), ("v=sin x, v'=cos x", "claim: d/dx(sin(x)) = cos(x)"),
     ("f'=5(3x+1)^4 sin(x)+(3x+1)^5 cos(x)", "final: 5(3x+1)^4 sin(x)+(3x+1)^5 cos(x)")], "invalid", "missing factor 3",
    "15(3x+1)^4 sin x + (3x+1)^5 cos x", pair="p-n1", domain="calculus")
CAL(DER, "derivative pieces found but never assembled", "completeness of a chain",
    [("u'=15(3x+1)^4", "claim: d/dx((3x+1)^5) = 15(3x+1)^4"), ("v'=cos x", "claim: d/dx(sin(x)) = cos(x)")], "incomplete",
    "both pieces are right; f' is never written", "15(3x+1)^4 sin x + (3x+1)^5 cos x", pair="p-n1", domain="calculus")
QD = {"type": "derivative", "f": "x/(x^2+1)", "var": "x"}
CAL(QD, "quotient rule", "multi-step derivative",
    [("d/dx(x^2+1)=2x", "claim: d/dx(x^2+1) = 2x"), ("f'=((x^2+1)-x·2x)/(x^2+1)^2", None), ("=(1-x^2)/(x^2+1)^2", "final: (1-x^2)/(x^2+1)^2")],
    "valid-equivalence", "(u'v-uv')/v^2", "(1-x^2)/(x^2+1)^2", pair="p-n2", domain="calculus")
CAL(QD, "quotient rule with the numerator reversed", "multi-step derivative",
    [("d/dx(x^2+1)=2x", "claim: d/dx(x^2+1) = 2x"), ("f'=(x·2x-(x^2+1))/(x^2+1)^2", None), ("=(x^2-1)/(x^2+1)^2", "final: (x^2-1)/(x^2+1)^2")],
    "invalid", "order u'v-uv' matters; sign flipped", "(1-x^2)/(x^2+1)^2", pair="p-n2", domain="calculus")
IN = {"type": "indefinite-integral", "f": "2x cos(x^2)", "var": "x"}
CAL(IN, "substitution with the constant of integration", "constant of integration",
    [("let u=x^2, du=2x dx", None), ("∫cos(u) du = sin(u) + C", None), ("= sin(x^2) + C", "final: sin(x^2) + C")], "valid-equivalence",
    "d/dx sin(x^2)=2x cos(x^2)", "sin(x^2)+C", pair="p-n3", domain="calculus")
CAL(IN, "substitution without the constant of integration", "constant of integration",
    [("let u=x^2, du=2x dx", None), ("∫cos(u) du = sin(u)", None), ("= sin(x^2)", "final: sin(x^2)")], "domain-violation",
    "one antiderivative only; + C missing", "sin(x^2)+C", pair="p-n3", domain="calculus")
IR = {"type": "indefinite-integral", "f": "1/x", "var": "x"}
CAL(IR, "antiderivative of 1/x on both half-lines", "antiderivative valid on the whole domain", [("∫1/x dx = ln|x| + C", "final: ln|x| + C")],
    "valid-equivalence", "d/dx ln|x| = 1/x for x ≠ 0", "ln|x|+C", pair="p-n4", domain="calculus")
CAL(IR, "antiderivative of 1/x only for x>0", "antiderivative valid on the whole domain", [("∫1/x dx = ln(x) + C", "final: ln(x) + C")],
    "domain-violation", "ln x misses x<0 where 1/x is defined", "ln|x|+C", pair="p-n4", domain="calculus")
ED = {"type": "derivative", "f": "e^(x^2) sin(3x)", "var": "x"}
CAL(ED, "product of two chain-rule factors", "multi-step derivative",
    [("d/dx(e^(x^2))=2x e^(x^2)", "claim: d/dx(e^(x^2)) = 2x e^(x^2)"), ("d/dx(sin(3x))=3cos(3x)", "claim: d/dx(sin(3x)) = 3cos(3x)"),
     ("product rule", None), ("f'=2x e^(x^2) sin(3x)+3e^(x^2) cos(3x)", "final: 2x e^(x^2) sin(3x)+3e^(x^2) cos(3x)")],
    "valid-equivalence", "u'v+uv'", "e^(x^2)(2x sin 3x + 3 cos 3x)", pair="p-n5", domain="calculus", difficulty="hard")
CAL(ED, "product of two chain-rule factors: inner factor 3 dropped", "multi-step derivative",
    [("d/dx(e^(x^2))=2x e^(x^2)", "claim: d/dx(e^(x^2)) = 2x e^(x^2)"), ("d/dx(sin(3x))=cos(3x)", "claim: d/dx(sin(3x)) = cos(3x)"),
     ("product rule", None), ("f'=2x e^(x^2) sin(3x)+e^(x^2) cos(3x)", "final: 2x e^(x^2) sin(3x)+e^(x^2) cos(3x)")],
    "invalid", "d/dx sin(3x)=3cos(3x)", "e^(x^2)(2x sin 3x + 3 cos 3x)", pair="p-n5", domain="calculus", difficulty="hard")

# ======================================================================= extra: logarithmic chain
s = "5^x=3^(x+1)"
SOL("taking logarithms of both sides", SET, s, ["x ln(5)=(x+1)ln(3)", "x ln(5)-x ln(3)=ln(3)", "x(ln(5)-ln(3))=ln(3)",
    "x=ln(3)/(ln(5)-ln(3))"], "valid-equivalence", "ln is one-to-one; ln5-ln3 ≠ 0", "x=ln3/(ln5-ln3)", pair="p-x1", difficulty="hard")
SOL("taking logarithms: the (x+1) factor not distributed", CHAIN, s, ["x ln(5)=x ln(3)+1", "x(ln(5)-ln(3))=1", "x=1/(ln(5)-ln(3))"],
    "invalid", "(x+1)ln3 = x ln3 + ln3, not + 1", "x=ln3/(ln5-ln3)", pair="p-x1", difficulty="hard")
