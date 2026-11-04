import json, random
import sympy as sp
from sympy import S, Interval, Union, FiniteSet, oo

x = sp.symbols('x', real=True)
R = S.Reals
def sol(eq, dom=R):
    return sp.solveset(eq, x, dom)
def ineq(expr):
    return sp.solve_univariate_inequality(expr, x, relational=False)
def chk(cond, msg):
    assert cond, msg

# ---------------- SymPy verification of every mathematical fact used ----------------
chk(sol(sp.Eq(x**2, 9)) == FiniteSet(-3, 3), "x^2=9")
chk(ineq(x**2 > 4) == Union(Interval.open(-oo, -2), Interval.open(2, oo)), "x^2>4")
chk(ineq(x**2 >= 1) == Union(Interval(-oo, -1), Interval(1, oo)), "x^2>=1")
chk(sol(sp.Eq(sp.sqrt(x+2), x)) == FiniteSet(2), "sqrt(x+2)=x")
chk(sol(sp.Eq(x+2, x**2)) == FiniteSet(-1, 2), "x+2=x^2")
chk(sol(sp.Eq(x**2/(x-1), 1/(x-1)), Interval.open(-oo,1) | Interval.open(1,oo)) == FiniteSet(-1), "rat1")
chk(sol(sp.Eq(x**2, 1)) == FiniteSet(-1, 1), "x^2=1")
chk(sol(sp.Eq(x**3, x)) == FiniteSet(-1, 0, 1), "x^3=x")
chk(ineq((x-1)/(x+2) >= 0) == Union(Interval.open(-oo, -2), Interval(1, oo)), "rat ineq")
chk(ineq((x-1)/(x+2) >= 0) != Union(Interval(-oo, -2), Interval(1, oo)), "rat ineq excl -2")
# F2
dom2 = Interval.open(-oo,2)|Interval.open(2,oo)
chk(sol(sp.Eq(x**2/(x-2), 4/(x-2)), dom2) == FiniteSet(-2), "pol1")
chk(sol(sp.Eq(x**3, 4*x)) == FiniteSet(-2, 0, 2), "x^3=4x")
chk(sol(sp.Eq(sp.sqrt(x+6), x)) == FiniteSet(3), "sqrt(x+6)=x")
chk(sol(sp.Eq(x+6, x**2)) == FiniteSet(-2, 3), "x+6=x^2")
chk(sp.sqrt(4) != -2, "check -2")
chk(sol(sp.Eq(x**2 - 5*x + 6, 0)) == FiniteSet(2, 3), "quad")
# F3
chk(sp.log(100, 10) == 2 and sp.N(sp.log(100)) != 2, "log100")
chk(sp.simplify(sp.log(sp.exp(2))) == 2, "ln exp 2")
chk(sp.log(8, 2) == 3, "log2 8")
chk(sp.log(1000, 10) == 3, "log10 1000")
rng = random.Random(7)
def ident(lhs, rhs, sample, n=40, tol=1e-9):
    for _ in range(n):
        v = sample()
        a = complex(lhs.subs(x, v).evalf()); b = complex(rhs.subs(x, v).evalf())
        if abs(a-b) > tol*(1+abs(a)): return False
    return True
pos = lambda: rng.uniform(0.1, 20)
anyr = lambda: rng.uniform(-20, 20)
for B in (2, 10, sp.E, 7):
    chk(ident(sp.log(x**2, B), 2*sp.log(x, B), pos), "log x^2 base-indep")
chk(sp.log(S(-1)**2) == 0 and sp.log(-1).is_real is False, "x=-1 lhs defined rhs not real")
chk(ident(sp.log(2*x), sp.log(2)+sp.log(x), pos), "ln 2x")
chk(ident(sp.log(x,2)+sp.log(3,2), sp.log(3*x,2), pos), "log2 sum")
chk(not ident(sp.log(x+1), sp.log(x)+sp.log(1), pos), "ln(x+1) false")
chk(sol(sp.Eq(sp.log(x, 10), 1), Interval.open(0, oo)) == FiniteSet(10), "log10 x=1")
chk(sol(sp.Eq(sp.log(x), 1), Interval.open(0, oo)) == FiniteSet(sp.E), "ln x=1")
for B in (2, 10, sp.E):
    chk(sol(sp.Eq(sp.log(x, B), 0), Interval.open(0, oo)) == FiniteSet(1), "log x=0")
chk(sol(sp.Eq(sp.log(x), 2), Interval.open(0, oo)) == FiniteSet(sp.exp(2)), "ln x=2")
chk(sol(sp.Eq(sp.log(x, 2), 5), Interval.open(0, oo)) == FiniteSet(32), "log2 x=5")
chk(sol(sp.Eq(sp.log(x-1, 10), 1), Interval.open(1, oo)) == FiniteSet(11), "log10(x-1)=1")
chk(sp.N(sp.log(10)) != 1, "ln10 !=1")
# F4
cbrt = lambda e: sp.real_root(e, 3)
chk(cbrt(-8) == -2 and cbrt(-27) == -3, "cbrt")
sec = lambda e: 1/sp.cos(e)
secs = lambda: rng.choice([rng.uniform(-1.5, 1.5), rng.uniform(1.65, 4.6)])
chk(ident(sec(x)**2 - 1, sp.tan(x)**2, secs), "sec^2-1")
chk(not ident(sec(x)**2, 1+sp.sin(x)**2, secs), "sec^2 false")
chk(ident(sp.Piecewise((-(-x**3)**sp.Rational(1,3), x < 0), ((x**3)**sp.Rational(1,3), True)), x, anyr), "cbrt(x^3)=x")
chk(all(abs(float(sp.real_root(sp.Float(v)**3, 3)) - v) < 1e-9 for v in [-5.3, -0.2, 0.7, 9.1]), "cbrt x^3 numeric")
chk(sp.simplify(sp.diff(sec(x), x) - sec(x)*sp.tan(x)) == 0, "d sec")
chk(sp.simplify(sp.diff(sec(x), x) - sp.tan(x)**2) != 0, "d sec wrong")
# d/dx cbrt(x) for x>0 and x<0 numerically
def dcbrt(v, h=1e-6): return (float(sp.real_root(v+h,3)) - float(sp.real_root(v-h,3)))/(2*h)
for v in [-6.0, -0.5, 0.4, 3.3]:
    good = 1/(3*float(sp.real_root(v,3))**2); bad = 1/(3*float(sp.real_root(v,3)))
    chk(abs(dcbrt(v)-good) < 1e-5 and abs(dcbrt(v)-bad) > 1e-3, f"d cbrt {v}")
chk(cbrt(-8) == -2 and all(cbrt(v) > -2 for v in [-7, -1, 0, 5]) and all(cbrt(v) < -2 for v in [-9, -100]), "cbrt monotone, unique -8")
chk(sec(sp.pi/3) == 2, "sec(pi/3)=2")
# F5 limits
L = sp.limit
chk(L(sp.sin(x)/x, x, 0) == 1, "sinx/x")
chk(L((x**2-4)/(x-2), x, 2) == 4, "x^2-4")
chk(L(1/(x-2), x, 2, '+') == oo and L(1/(x-2), x, 2, '-') == -oo, "1/(x-2)")
chk(L(1/x, x, 0, '+') == oo and L(1/x, x, 0, '-') == -oo, "1/x DNE")
chk(L(1/x**2, x, 0, '+') == oo and L(1/x**2, x, 0, '-') == oo, "1/x^2")
chk(L((3*x**2+1)/(x**2-5), x, oo) == 3, "rat inf")
chk(L((2*x+1)/(x**2+1), x, oo) == 0, "rat inf 0")
chk(L(x**3/(x**2+1), x, -oo) == -oo, "rat -inf")
chk(L((1-sp.cos(x))/x**2, x, 0) == S(1)/2, "1-cos")
chk(L(sp.sin(3*x)/x, x, 0) == 3, "sin3x")
chk(L((x**2-1)/(x+1), x, -1) == -2, "x^2-1")
chk(L(sp.Abs(x)/x, x, 0, '+') == 1 and L(sp.Abs(x)/x, x, 0, '-') == -1, "abs")
chk(L((1+1/x)**x, x, oo) == sp.E, "e")
chk(L(x/(x+1), x, -1, '-') == oo and L(x/(x+1), x, -1, '+') == -oo, "x/(x+1)")
print("all sympy checks passed")

# ---------------- cases ----------------
C = []
def add(feature, kind, channel, expected, rationale, **inp):
    d = {"id": None, "feature": feature, "kind": kind, "channel": channel}
    d.update(inp); d["expected"] = expected; d["rationale"] = rationale
    C.append(d)

# F1
A, AF = "algebra", "answer-first"
add("F1","negative",A,["invalid"],"Explicit ⇔ drops x=-3 (solution set {-3,3}).",statement="x^2 = 9",working=["x^2 = 9 ⇔ x = 3"])
add("F1","negative",A,["invalid"],"Line starting ⇔ claims equivalence with x=3; loses x=-3.",statement="x^2 = 9",working=["x^2 = 9","⇔ x = 3"])
add("F1","negative",A,["incomplete"],"No equivalence claimed; final set {3} misses -3.",statement="x^2 = 9",working=["x^2 = 9","x = 3"])
add("F1","negative",AF,["incomplete"],"Answer-first: final set {3} misses -3, no ⇔.",statement="x^2 = 9",working=["x^2 = 9","x = 3"])
add("F1","positive",A,["verified"],"Correct ⇔ chain; solution set {-3,3}.",statement="x^2 = 9",working=["x^2 = 9","⇔ x = 3 or x = -3"])
add("F1","positive",AF,["correct"],"Complete solution set {-3,3}.",statement="x^2 = 9",working=["x^2 = 9","x = 3 or x = -3"])
add("F1","negative",A,["invalid"],"x^2>4 ⇔ x>2 loses x<-2.",statement="x^2 > 4",working=["x^2 > 4 ⇔ x > 2"])
add("F1","positive",A,["verified"],"x^2>4 ⇔ x<-2 or x>2 is a true equivalence.",statement="x^2 > 4",working=["x^2 > 4","⇔ x < -2 or x > 2"])
add("F1","negative",AF,["incomplete"],"x^2>=1 has set (-inf,-1]∪[1,inf); x>=1 alone, no ⇔ → incomplete.",statement="x^2 >= 1",working=["x^2 >= 1","x >= 1"])
add("F1","negative",A,["invalid"],"Extraneous root -1 kept: sqrt(1)=1 != -1. Solution set {2}.",statement="sqrt(x + 2) = x",working=["x + 2 = x^2","x^2 - x - 2 = 0","x = 2 or x = -1"])
add("F1","negative",AF,["incorrect"],"Extraneous root -1 kept.",statement="sqrt(x + 2) = x",working=["x + 2 = x^2","x^2 - x - 2 = 0","x = 2 or x = -1"])
add("F1","positive",A,["verified"],"Squaring written as implication rows (no ⇔); final {2} is exactly the solution set.",statement="sqrt(x + 2) = x",working=["x + 2 = x^2","(x - 2)(x + 1) = 0","x = 2"])
add("F1","negative",A,["invalid"],"Explicit ⇔ with squared equation gains x=-1 (x+2=x^2 has {-1,2}).",statement="sqrt(x + 2) = x",working=["sqrt(x + 2) = x ⇔ x + 2 = x^2"])
add("F1","negative",A,["invalid"],"Excluded value x=1 kept as solution (denominator 0).",statement="x^2/(x - 1) = 1/(x - 1)",working=["x^2 = 1","x = 1 or x = -1"])
add("F1","positive",A,["verified"],"True equivalence on the domain x != 1: solution set {-1}.",statement="x^2/(x - 1) = 1/(x - 1)",working=["x^2/(x - 1) = 1/(x - 1) ⇔ x = -1"])
add("F1","negative",A,["invalid"],"Claimed ⇔ x^2=1 gains x=1, excluded from the domain.",statement="x^2/(x - 1) = 1/(x - 1)",working=["x^2/(x - 1) = 1/(x - 1) ⇔ x^2 = 1"])
add("F1","negative",A,["invalid"],"Dividing by x with <=> loses x=0 (set {-1,0,1}).",statement="x^3 = x",working=["x^3 = x <=> x^2 = 1","<=> x = 1 or x = -1"])
add("F1","negative",AF,["incomplete"],"No ⇔; final {1,-1} misses 0.",statement="x^3 = x",working=["x^2 = 1","x = 1 or x = -1"])
add("F1","positive",AF,["correct"],"(x-1)/(x+2)>=0 ⇔ x<-2 or x>=1 (x=-2 excluded).",statement="(x - 1)/(x + 2) >= 0",working=["x < -2 or x >= 1"])
add("F1","negative",AF,["incorrect"],"x=-2 is excluded (division by zero) but included via <=.",statement="(x - 1)/(x + 2) >= 0",working=["x <= -2 or x >= 1"])

# F2 policy
P = "policy"
s1 = "x^2/(x - 2) = 4/(x - 2)"
add("F2","positive",P,["full"],"Answer-only, correct complete answer {-2}.",statement=s1,mode="answer-only",working=["x = -2"])
add("F2","negative",P,["none"],"States excluded value x=2 as solution.",statement=s1,mode="answer-only",working=["x = 2 or x = -2"])
add("F2","positive",P,["full"],"Method-required, valid steps, no rubric flags → omission of restriction not penalised.",statement=s1,mode="method-required",working=["x^2 = 4","x = -2"])
add("F2","negative",P,["partial"],"requireStatedRestrictions and x != 2 never stated → partial.",statement=s1,mode="method-required",rubric={"requireStatedRestrictions":True},working=["x^2 = 4","x = -2"])
add("F2","positive",P,["full"],"Restriction stated, flag satisfied.",statement=s1,mode="method-required",rubric={"requireStatedRestrictions":True},working=["x != 2","x^2 = 4","x = -2"])
add("F2","negative",P,["partial"],"Proof-required: bare one-line answer → partial.",statement=s1,mode="proof-required",working=["x = -2"])
add("F2","positive",P,["full"],"Proof-required: complete valid derivation with restriction.",statement=s1,mode="proof-required",working=["x != 2","x^2 = 4","x = -2"])
add("F2","negative",P,["none"],"Proof-required but final answer is the excluded value.",statement=s1,mode="proof-required",working=["x^2 = 4","x = 2"])
add("F2","negative",P,["none"],"Invalid step x^2=4 → x=4; wrong answer.",statement=s1,mode="method-required",working=["x^2 = 4","x = 4"])
add("F2","negative",P,["partial"],"x^3=4x has {-2,0,2}; dividing by x loses 0 (no ⇔) → incomplete → partial.",statement="x^3 = 4x",mode="method-required",working=["x^2 = 4","x = 2 or x = -2"])
add("F2","positive",P,["full"],"Complete factorised solution {-2,0,2}.",statement="x^3 = 4x",mode="proof-required",working=["x^3 - 4x = 0","x(x - 2)(x + 2) = 0","x = 0 or x = 2 or x = -2"])
s2 = "sqrt(x + 6) = x"
add("F2","positive",P,["full"],"Answer-only, correct {3}, no checks required.",statement=s2,mode="answer-only",working=["x = 3"])
add("F2","negative",P,["none"],"Extraneous -2 kept (sqrt(4)=2 != -2).",statement=s2,mode="answer-only",working=["x = 3 or x = -2"])
add("F2","positive",P,["full"],"Method-required, flags off: dropping -2 without written check is fine.",statement=s2,mode="method-required",working=["x + 6 = x^2","(x - 3)(x + 2) = 0","x = 3"])
add("F2","negative",P,["partial"],"requireShownCandidateChecks: -2 dropped without written check.",statement=s2,mode="method-required",rubric={"requireShownCandidateChecks":True},working=["x + 6 = x^2","(x - 3)(x + 2) = 0","x = 3"])
add("F2","positive",P,["full","unresolved"],"Check of -2 written; check-line parsing may cause abstention.",statement=s2,mode="method-required",rubric={"requireShownCandidateChecks":True},working=["x + 6 = x^2","(x - 3)(x + 2) = 0","x = 3 or x = -2","x = -2: sqrt(4) = 2 != -2","x = 3"])
add("F2","negative",P,["partial"],"Proof-required: extraneous candidate dropped without written check.",statement=s2,mode="proof-required",working=["x + 6 = x^2","(x - 3)(x + 2) = 0","x = 3"])
add("F2","positive",P,["full"],"deductForWrongCitation set but no citations made; valid complete work.",statement="x^2 - 5x + 6 = 0",mode="method-required",rubric={"deductForWrongCitation":True},working=["(x - 2)(x - 3) = 0","x = 2 or x = 3"])

# F3 logs
I = "identity"
add("F3","ambiguous",I,["ambiguous"],"log(100)=2 only in base 10; no convention.",start="log(100)",next="2")
add("F3","positive",I,["verified"],"base10 convention: log(100)=2.",start="log(100)",next="2",convention={"log":"base10"})
add("F3","negative",I,["invalid"],"natural convention: ln(100)≈4.605 != 2.",start="log(100)",next="2",convention={"log":"natural"})
add("F3","positive",I,["verified"],"ln(exp(2)) = 2.",start="ln(exp(2))",next="2")
add("F3","positive",I,["verified"],"log_2(8)=3.",start="log_2(8)",next="3")
add("F3","negative",I,["invalid"],"log_10(1000)=3, not 2.",start="log_10(1000)",next="2")
add("F3","positive",I,["verified","ambiguous","unsupported"],"log(x^2)=2log(x) for x>0 in every base.",start="log(x^2)",next="2*log(x)",assumptions=["x > 0"])
add("F3","domain",I,["missing-assumption","invalid","unsupported","ambiguous"],"Without x>0 fails at x<0 (rhs undefined); base-independent.",start="log(x^2)",next="2*log(x)")
add("F3","positive",I,["verified","unsupported"],"ln(2x)=ln2+ln x for x>0.",start="ln(2x)",next="ln(2) + ln(x)",assumptions=["x > 0"])
add("F3","positive",I,["verified","unsupported"],"log_2(x)+log_2(3)=log_2(3x) for x>0.",start="log_2(x) + log_2(3)",next="log_2(3x)",assumptions=["x > 0"])
add("F3","negative",I,["invalid","unsupported"],"ln(x+1) != ln(x)+ln(1)=ln(x).",start="ln(x + 1)",next="ln(x) + ln(1)",assumptions=["x > 0"])
add("F3","ambiguous",A,["ambiguous"],"log(x)=1 → x=10 only in base 10.",statement="log(x) = 1",working=["x = 10"])
add("F3","positive",A,["verified"],"base10: x=10.",statement="log(x) = 1",working=["x = 10"],convention={"log":"base10"})
add("F3","negative",A,["invalid"],"natural: x=e, not 10.",statement="log(x) = 1",working=["x = 10"],convention={"log":"natural"})
add("F3","positive",A,["verified","ambiguous"],"log(x)=0 ⇔ x=1 in every base.",statement="log(x) = 0",working=["x = 1"])
add("F3","positive",A,["verified"],"ln x = 2 ⇔ x = e^2.",statement="ln(x) = 2",working=["x = exp(2)"])
add("F3","negative",A,["invalid"],"log_2(x)=5 ⇔ x=32.",statement="log_2(x) = 5",working=["x = 25"])
add("F3","positive",A,["verified"],"log_10(x-1)=1 ⇔ x=11.",statement="log_10(x - 1) = 1",working=["x - 1 = 10","x = 11"])

# F4 notation
PR = "parser"
add("F4","negative",PR,["unsupported"],"Unknown function sech; must not be s*e*c*h*(x).",text="sech(x)")
add("F4","negative",PR,["unsupported"],"Unknown function blah.",text="blah(x) + 1")
add("F4","negative",PR,["unsupported"],"csc is not in the supported list.",text="csc(x)")
add("F4","malformed",PR,["malformed"],"Unclosed bracket.",text="sec(x")
add("F4","malformed",PR,["malformed"],"Unbalanced brackets.",text="sqrt((x + 1)")
add("F4","positive",PR,["parsed"],"cbrt of a negative constant is well formed.",text="cbrt(-8)")
add("F4","positive",PR,["parsed"],"sec(x)^2 well formed.",text="sec(x)^2 + 1")
add("F4","positive",I,["verified"],"Real cube root: cbrt(-8) = -2.",start="cbrt(-8)",next="-2")
add("F4","negative",I,["invalid"],"cbrt(-27) = -3, not 3.",start="cbrt(-27)",next="3")
add("F4","positive",I,["verified","unsupported"],"sec^2 x - 1 = tan^2 x where cos x != 0.",start="sec(x)^2 - 1",next="tan(x)^2")
add("F4","negative",I,["invalid","unsupported"],"sec^2 x != 1 + sin^2 x (x=pi/3: 4 vs 1.75).",start="sec(x)^2",next="1 + sin(x)^2")
add("F4","negative",I,["unsupported"],"csc unknown; must abstain, not guess.",start="csc(x)",next="1/sin(x)")
add("F4","positive",I,["verified","unsupported"],"Real cube root: cbrt(x^3) = x for all real x.",start="cbrt(x^3)",next="x")
D = "derivative"
add("F4","positive",D,["verified","unsupported"],"d/dx sec x = sec x tan x.",expression="sec(x)",working="sec(x)tan(x)")
add("F4","negative",D,["invalid","unsupported"],"d/dx sec x != tan^2 x.",expression="sec(x)",working="tan(x)^2")
add("F4","positive",D,["verified","unsupported"],"d/dx cbrt x = 1/(3 cbrt(x)^2), x != 0.",expression="cbrt(x)",working="1/(3*cbrt(x)^2)")
add("F4","negative",D,["invalid","unsupported"],"1/(3 cbrt x) is wrong (e.g. x=-6).",expression="cbrt(x)",working="1/(3*cbrt(x))")
add("F4","negative",D,["unsupported"],"Unknown function.",expression="blah(x)",working="blah(x)")
add("F4","positive",A,["verified"],"Real cube root: cbrt(x)=-2 ⇔ x=-8.",statement="cbrt(x) = -2",working=["x = (-2)^3","x = -8"])
add("F4","negative",A,["invalid"],"cbrt is real-valued for negatives; x=-8 is a solution.",statement="cbrt(x) = -2",working=["no solution"])
add("F4","positive",AF,["correct"],"cbrt(x)=-2 → x=-8.",statement="cbrt(x) = -2",working=["x = -8"])
add("F4","positive",A,["verified","unsupported"],"sec(pi/3) = 1/cos(pi/3) = 2.",statement="sec(pi/3) = 2",working=["1/cos(pi/3) = 2"])

# F5 limits
LM = "limit"
add("F5","positive",LM,["verified"],"Standard limit = 1.",expression="sin(x)/x",approach="0",side="both",working="lim(x→0) sin(x)/x = 1")
add("F5","positive",LM,["verified"],"Cancel to x+2 → 4.",expression="(x^2-4)/(x-2)",approach="2",side="both",working="(x^2-4)/(x-2) = x+2 → 4")
add("F5","negative",LM,["invalid"],"Limit is 4.",expression="(x^2-4)/(x-2)",approach="2",side="both",working="lim(x→2) (x^2-4)/(x-2) = 2")
add("F5","positive",LM,["verified"],"Right-hand → +∞.",expression="1/(x-2)",approach="2",side="right",working="lim(x→2+) 1/(x-2) = ∞")
add("F5","negative",LM,["invalid"],"Left-hand → -∞.",expression="1/(x-2)",approach="2",side="left",working="lim(x→2-) 1/(x-2) = ∞")
add("F5","positive",LM,["verified"],"One-sided limits ±∞ differ → DNE.",expression="1/x",approach="0",side="both",working="lim(x→0) 1/x does not exist")
add("F5","negative",LM,["invalid"],"Two-sided limit of 1/x at 0 does not exist.",expression="1/x",approach="0",side="both",working="lim(x→0) 1/x = ∞")
add("F5","positive",LM,["verified"],"Both sides → +∞.",expression="1/x^2",approach="0",side="both",working="lim(x→0) 1/x^2 = ∞")
add("F5","ambiguous",LM,["unsupported","invalid","verified"],"Convention-dependent DNE vs ∞.",expression="1/x^2",approach="0",side="both",working="lim(x→0) 1/x^2 does not exist")
add("F5","positive",LM,["verified"],"Leading coefficients ratio 3.",expression="(3x^2+1)/(x^2-5)",approach="infinity",side="both",working="lim(x→∞) (3x^2+1)/(x^2-5) = 3")
add("F5","negative",LM,["invalid"],"Degree num < den → 0.",expression="(2x+1)/(x^2+1)",approach="infinity",side="both",working="lim(x→∞) (2x+1)/(x^2+1) = 2")
add("F5","positive",LM,["verified"],"x^3/(x^2+1) ~ x → -∞.",expression="x^3/(x^2+1)",approach="-infinity",side="both",working="lim(x→-∞) x^3/(x^2+1) = -∞")
add("F5","positive",LM,["verified","unsupported"],"Standard (1-cos x)/x^2 → 1/2.",expression="(1-cos(x))/x^2",approach="0",side="both",working="lim(x→0) (1-cos(x))/x^2 = 1/2")
add("F5","positive",LM,["verified","unsupported"],"sin(3x)/x → 3.",expression="sin(3x)/x",approach="0",side="both",working="lim(x→0) sin(3x)/x = 3")
add("F5","negative",LM,["incomplete"],"Simplification only, no value stated (value is -2).",expression="(x^2-1)/(x+1)",approach="-1",side="both",working="(x^2-1)/(x+1) = x - 1")
add("F5","positive",LM,["verified","unsupported"],"|x|/x → 1 from the right.",expression="abs(x)/x",approach="0",side="right",working="lim(x→0+) abs(x)/x = 1")
add("F5","negative",LM,["invalid","unsupported"],"Two-sided |x|/x DNE (±1).",expression="abs(x)/x",approach="0",side="both",working="lim(x→0) abs(x)/x = 1")
add("F5","positive",LM,["verified","unsupported"],"(1+1/x)^x → e.",expression="(1+1/x)^x",approach="infinity",side="both",working="lim(x→∞) (1+1/x)^x = exp(1)")
add("F5","negative",LM,["invalid"],"x/(x+1) as x→-1- → +∞, not -∞.",expression="x/(x+1)",approach="-1",side="left",working="lim(x→-1-) x/(x+1) = -∞")

DROP = {8,11,16,18,20,25,29,33,38,41,43,48,55,59,61,63,65,71,73,74,78,81,89,92,95,96}
C = [c for i, c in enumerate(C, 1) if i not in DROP]
for i, c in enumerate(C, 1):
    c["id"] = f"N-{i:03d}"
out = "/home/claude/e7fix/research/e7-safety/holdout2/cases.json"
json.dump(C, open(out, "w"), ensure_ascii=False, indent=1)
from collections import Counter
print(len(C), Counter(c["feature"] for c in C), Counter(c["channel"] for c in C))
acc = {"verified","correct","full","parsed"}
print("accept-expected:", sum(1 for c in C if set(c["expected"]) & acc), Counter(c["kind"] for c in C))
