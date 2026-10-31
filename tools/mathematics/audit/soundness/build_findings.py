import json
F=[]
def add(id,area,claim,inp,truth,res,verdict,sev,scope):
    F.append(dict(id=id,area=area,claim_tested=claim,input=inp,true_answer_and_argument=truth,code_result=res,verdict=verdict,severity=sev,in_documented_scope=scope))
U,S,J='unsound','sound','unjustified-but-correct-in-scope'

add("S-01","domain-state.denominatorsOf / poly.RatFun.fromExpr","Every pole of a rational-function expression is recorded as a restriction (invariant I2: closure)",
 {"checkStepText":{"from":{"eq":"x^-1*x=1","excluded":[]},"to":{"eq":"1=1","excluded":[]},"effect":"equivalence"}},
 "x^-1 is 1/x and is undefined at 0, so the left equation lives on R\\{0} and its solution set is R\\{0}; '1=1' with no exclusion has solution set R. They are not equivalent. The parser never produces a negative num literal for an exponent (x^-1 and x^(-1) parse as pow(x, neg(1)), x^(1-2) as pow(x, sub)), so the `exp.kind===\"num\" && lt(0)` branch of denominatorsOf is dead for parsed text, while RatFun.fromExpr happily accepts negative integer exponents (|m|<=12) and cancels x^-1*x to 1.",
 "valid:true, reasons:[]. Same for x^(-1)*x=1 and x^(1-2)*x=1. zerosOfDenominators(parse('x^-1'))=[]; zerosOfDenominators(parse('1/x'))=['0'].  checkClaim('1/(x-1)+0*x^-1=-1',['0']) -> valid:true although x=0 is outside the domain (true answer: no solution). solve('1/(x-1)-1/(x-1)=x^-1*x-1') -> class identity-on-domain, restrictions ['1'], note 'every value except the restricted ones is a solution' (false: 0 is not a solution; true domain excludes 0 and 1). (probe.out P1-P4,P6,P8; probe2.out EP1-EP3,EP5)",
 U,"high",True)
add("S-02","domain-engine (candidate check) with negative exponent","Substitution into the original equation rescues a pole hidden by x^-1",
 {"solve":"1/(x-1)+0*x^-1=-1"},"Reduces to x=0 but 0 is outside the domain of x^-1: no solution.",
 "class none, candidate x=0 rejected (kernel evaluate throws on 0^-1). Correct; the unique-solution path is protected by exact substitution, the identity path (S-01) is not.",S,"low",True)
add("S-03","domain-state.checkTransition (from-state)","The 'from' state is a legal state: its denominators' zeros are in from.excluded (I2) and the original restrictions are kept (I3)",
 {"checkStepText":[{"from":{"eq":"(x^2-1)/(x-1)=2","excluded":[]},"to":{"eq":"x+1=2","excluded":[]}},{"from":{"eq":"0/x=0","excluded":[]},"to":{"eq":"0=0","excluded":[]}},{"from":{"eq":"x*x/x=x","excluded":[]},"to":{"eq":"x=x","excluded":[]}},{"from":{"eq":"(x^2-2)/(x^2-2)=1","excluded":[]},"to":{"eq":"x=x","excluded":[]}}]},
 "(x^2-1)/(x-1)=2 has natural domain R\\{1} and solution set empty (x+1=2 gives x=1, excluded). x+1=2 has solution set {1}. Not equivalent. 0/x=0: solution set R\\{0} vs R for 0=0. x*x/x=x: R\\{0} vs R. (x^2-2)/(x^2-2)=1: R\\{+-sqrt2} vs R. Closure (I2) is computed only for `to` (closureTo) and I3 needs the optional `original` argument, which checkStepText never passes, so a step that silently drops a restriction that the student never wrote down is accepted.",
 "All four: valid:true, reasons:[]. With the restriction written ([\"1\"] on both sides) F3 is correctly valid; with [\"1\"] -> [] it is correctly rejected (restriction-dropped, solution-set-changed). So the defect is only an unvalidated `from`. Also: irrational/complex denominators in `from` are never examined, so OutsideBoundary is not raised (the same text as the `to` state throws). (probe.out F1,F2,F3,F4; probe2.out G1,G4,G6)",
 U,"high",True)
add("S-04","domain-state.solSet / solEquals","'set' kind = real roots; equal squarefree polynomial <=> equal real solution set",
 {"checkStepText":[{"from":"x^2+1=0","to":"x^2+4=0"},{"from":"x^2+1=0","to":"1=0"},{"from":"x^4=4","to":"x^2=2"},{"from":"(x^2+1)*(x-1)=0","to":"x-1=0"}]},
 "x^2+1=0, x^2+4=0 and 1=0 all have empty real solution set, so each pair is equivalent over R. x^4-4=(x^2-2)(x^2+2) has the same real roots +-sqrt2 as x^2-2. (x^2+1)(x-1)=0 and x-1=0 both have real solution set {1}. Squarefree-polynomial equality is a theorem for COMPLEX roots; the comment on SolSet claims 'the real roots'. Equal polynomials imply equal real sets (no false accept), so the error is one-directional (false rejection).",
 "All four: valid:false (solution-set-changed). Also x^4=4 => x^2=2 as implication: solution-set-lost (true over R); x^2+1=0 => x=5 (vacuously true): solution-set-lost. Never a false accept: x^2=2 <=> x^2=3 correctly rejected, x^2=2 => x^4=4 correctly accepted. Engine is unaffected: gate refuses reduced degree >=2, so solSet only ever sees degree <=1 polynomials there. (probe.out C1-C5,C10-C12)",
 U,"medium",False)
add("S-05","domain-state.checkClaim / rootsOf","A claimed solution list is judged against the exact real solution set",
 {"checkClaim":[["x^2+1=0",[]],["(x-1)*(x^2+1)=0",["1"]]]},
 "x^2+1=0 has no real solution, so the claim [] is TRUE. (x-1)(x^2+1)=0 has real solution set {1}, so ['1'] is TRUE. rootsOf demands that the number of rational roots equals the degree, i.e. it treats 'not all roots rational' as 'undecidable' although the real solution set is decidable here (a degree-2 factor with negative discriminant has no real roots).",
 "valid:false, truth:'undecidable' for both (true claims rejected). False claims are correctly rejected: (x-1)(x^2-2)=0 -> ['1'] and x^2-2=0 -> [] both valid:false. No false accept found. (probe.out C6-C9)",
 U,"medium",False)
add("S-06","poly.squarefree / solEquals with repeated roots","Repeated roots do not change the solution set",
 {"checkStepText":[{"from":"(x-1)^2=0","to":"x-1=0"},{"from":"(x-1)^2*(x-2)=0","excl_from":["1"],"to":"x-2=0","excl_to":["1"]},{"from":"x*(x-1)=0","excl_from":["1"],"to":"x=0","excl_to":["1"]}]},
 "{1}={1}; excluding 1 removes the root 1 of (x-1)^2 entirely, leaving {2}; excluding 1 from x(x-1) leaves {0}.","all valid:true (correct). And the negative control x(x-1)=0 [] -> x=0 [1] is correctly rejected (1 is a solution of 'from'). (probe.out R1,R2,R5,R6)",S,"low",True)
add("S-07","solSet exclusion removal + reduce","Exclusions interacting with cancelled/repeated factors",
 {"checkClaim":["(x-1)^2/(x-1)=0 -> []","(x-1)/(x-1)^2=0 -> []","(x^2-x)/x=-1 -> []","(x^2-x)/x=x-1 -> all-except-excluded","x/(x-1)=1/(x-1) -> ['1']"],"solve":["(x^2-x)/x=-1","(x^2-1)/(x-1)=2","x/(x-1)=1/(x-1)","(x-1)^2/(x-1)=0","1/x^2=1/x"]},
 "(x-1)^2/(x-1)=x-1=0 -> x=1 excluded -> none. (x-1)/(x-1)^2=1/(x-1)=0 -> none. (x^2-x)/x=-1 -> x-1=-1 -> x=0 excluded -> none. (x^2-x)/x=x-1 identity on R\\{0}. x/(x-1)=1/(x-1) -> x=1 excluded -> none (claim ['1'] false). 1/x^2=1/x -> x^2=x with x != 0 -> x=1 (unique).",
 "All as hand-derived: claims valid/invalid accordingly; engine classes none, none, none, none, unique x=1. (probe.out R3,R4,F5,F6,E1-E7; probe2.out G8)",S,"low",True)
add("S-08","solSubset / implication direction","implication means sol(from) subset of sol(to); all-kind vs set-kind",
 {"checkStepText implication":["x=1 -> x^2=x","x^2=x -> x=1","x=x -> x=1","x=1 -> x=x","x=0 -> x/x=1 [0]","x=x -> x=x [0]","x/x=1 [0] -> x=x []"]},
 "{1} subset {0,1} yes; {0,1} subset {1} no; R subset {1} no; {1} subset R yes; {0} subset R\\{0} no; R subset R\\{0} no; R\\{0} subset R yes (but restriction dropped violates I1).",
 "valid, invalid, invalid, valid, invalid, invalid, invalid(restriction-dropped only) -- all match. 'all' vs 'all' uses excluded(b) subset excluded(a), which is the correct complement inclusion. (probe.out A3-A9)",S,"low",True)
add("S-09","solSet zero polynomial and constants","identically-zero difference -> all; non-zero constant -> empty",
 {"checkStepText":["0=0 <=> x-x=0","1=0 <=> 2=0","0*x=0 <=> 0=0","x/x=1 [0] <=> 1=1 [0]","x/x=1 [0] <=> x=x []"],"checkClaim":["1=0 -> []","x=x -> all-except-excluded","x=x -> all-real"]},
 "first four pairs equivalent; last pair NOT (restriction dropped; R\\{0} vs R). Claim [] for 1=0 true. x=x really is true for all real x, so 'all-real' is a correct claim for x=x.",
 "valid:true x4, last pair rejected, [] valid, all-except-excluded valid. The claim 'all-real' for x=x is rejected (valid:false) although true when no denominator exists -- conservative over-rejection, low. (probe.out A1,A2,A10-A16)",S,"low",True)
add("S-10","domain-state.checkClaim 'all-real'","'all-real' is accepted when the equation is an identity with no denominators",
 {"checkClaim":["x=x","all-real"]},"x=x holds for every real x; 'all-real' is a true claim.","valid:false (truth 'all-except-excluded'). Conservative false rejection; only the literal 'all-except-excluded' is ever accepted for identities.",U,"low",True)
add("S-11","division by zero / zero denominators","x/0, 0/0 and x/(x-x) are refused, never treated as a value",
 {"checkStepText":["x/0=1","0/0=1","x/(x-x)=1"],"solve":["x/0=1","1/(x-x)=1"]},
 "All undefined; no solution set can be asserted.","OutsideBoundary thrown by solSet (checkStepText/checkClaim) and class refused from solve. Sound refusal (RatFun.div returns null when the divisor polynomial is identically zero). (probe.out Z1,Z3-Z5,E8,E9)",S,"low",True)
add("S-12","domain-state.zerosOfDenominators","A denominator that is the zero polynomial",
 {"zerosOfDenominators":"1/(x-x)"},"No value of x makes the expression defined; there is no meaningful list of zeros.",
 "Returns [] (degree<1 => `continue`), silently. Not exploitable: every caller reaches RatFun.fromExpr afterwards, which refuses (S-11), and gate() refuses via numerator-outside-boundary. Unjustified by itself, safe by composition.",J,"low",True)
add("S-13","0/x and numerators that cancel only at an excluded value","0/x=0 with 0 excluded",
 {"checkStepText":{"from":"0/x=0 [0]","to":"0=0 [0]"},"solve":"0/x=0"},"Identity on R\\{0}.","valid:true; solve -> identity-on-domain, restrictions ['0']. Correct. (With [] on both sides it is wrongly valid: see S-03.) (probe.out Z2,Z6,E7)",S,"low",True)
add("S-14","poly.RatFun.fromExpr pow: 0 exponent","x^0, (x-1)^0, 0^0 are treated consistently",
 {"checkStepText":["x^0=1","(x-1)^0=1","0^0=1","0^-1=1","(1/x)^0=1"]},
 "0^0 is a convention; a^0=1 for a != 0. Silent assumption of 0^0=1 at the zero of the base would be an unstated theorem.",
 "All five throw OutsideBoundary 'not a rational function of x': the literal exponent 0 reduces to the zero polynomial, k.n.c[0] is undefined, `!undefined?.isInteger()` is true and fromExpr returns null. So 0^0 is never silently decided (good), but by accident, and legitimate x^0 is refused. x^(2/2) is accepted as x^1 (correct). Refusal, not a wrong answer.",J,"low",True)
add("S-15","poly.RatFun.fromExpr pow: exponent range and shape","|int|<=12; fractional/large exponents",
 {"checkStepText":["x^13=0","x^(1/2)=1","x^99999999999999999999=0","x^12=0"]},
 "x^13 and x^(1/2) are outside the stated boundary; x^12 inside.",
 "x^13, x^(1/2): OutsideBoundary (refusal). x^12: valid. x^99999999999999999999: RangeError from Rational.num (an untyped crash, not OutsideBoundary; no wrong answer).",J,"low",True)
add("S-16","poly.RatFun.fromExpr pow: exponent containing x","Exponent is a constant after reduce()",
 {"checkStepText":{"from":"x^(x/x)=x","to":"x=x"}},
 "x/x is undefined at 0, so x^(x/x) is undefined at 0: from has solution set R\\{0}, to has R. denominatorsOf never looks inside an exponent, and ex.reduce() cancels x/x to 1 without recording the pole.",
 "valid:true. Contrived (needs a non-constant exponent that reduces to an integer), but it is a silent loss of a restriction. solve('1/(x-1)=x^(x/x)/x') is unaffected only because another denominator supplies 0.",U,"low",True)
add("S-17","poly.rationalRoots coefficient limit 1e12","What happens beyond the limit",
 {"rationalRoots":["x - 10^13","10^13*x - 10^13"],"checkClaim":"x-10000000000000=0 -> ['10000000000000']","zerosOfDenominators":"1/(x-10^13)"},
 "Root 10^13 (resp. 1) exists and is rational; the limit is a scope boundary.",
 "Throws OutsideBoundary (explicit refusal), never a silent wrong answer: rationalRoots, splitLinear, zerosOfDenominators, checkClaim all throw. x - 10^12 is accepted. solSet/solEquals have no limit, so equivalence of huge-coefficient steps is still decided exactly (2x-2e13=0 <=> x-1e13=0 valid). Refusal is over-eager (content 10^13 is not stripped before the test), conservative. (probe.out L1-L4,L7-L11)",S,"low",True)
add("S-18","domain-engine.gate vs rationalRoots limit","solve() returns 'refused' for out-of-boundary input",
 {"solve":"(x^2-100000000000000000000000000)/x=1"},"Outside the stated boundary: should be class refused.",
 "solve THROWS OutsideBoundary instead of returning class refused: gate() wraps zerosOfDenominators in try/catch but calls n.splitLinear() on degree-2 numerators unguarded. Crash, not a wrong answer. (probe.out L6)",J,"low",True)
add("S-19","poly.rationalRoots cost under the limit","The coefficient limit bounds the work",
 {"rationalRoots":"hc*x - hc, hc in {720720, 735134400, 963761198400}"},
 "Number of candidate p/q grows as d(a0)*d(an); the limit 1e12 allows 6720*6720 = 45M exact evaluations.",
 "720720: 44 ms; 735134400: 1155 ms; 963761198400: did not finish in 100 s (killed). Refusal limit does not bound runtime; availability issue, not a wrong answer. (probe_timing.out)",J,"low",True)
add("S-20","zerosIn (rule preconditions) with irrational/complex divisors","A divisor with non-rational zeros is never declared non-zero on the domain",
 {"rules":["divide by x^2-2","divide by x^2+1","divide by (x-1)*(x^2+1) with 1 restricted","divide by (x-1)^2 with 1 restricted","divide by 0 / x-x","clear-denominators 1/(x^2-2)=1"]},
 "x^2-2 has zeros +-sqrt2, not restricted -> must be refused. x^2+1 has no real zeros so division is actually valid, refusal is merely conservative. (x-1)^2 has zero set {1}, restricted -> allowed. 0 and x-x are zero polynomials -> never allowed.",
 "FAIL, FAIL (conservative), FAIL (conservative), ok, FAIL/FAIL, FAIL. ok:true only when splitLinear fully splits over Q, i.e. all zeros rational and then each is checked against the rational restriction list: sound. (probe.out D1-D6,D15,D16)",S,"low",True)
add("S-21","multiply-both-sides / cancel-common-factor / clear-denominators preconditions","Rule fires only when the factor's zeros are restricted",
 {"rules":["multiply by x, restricted [0] vs []","cancel (x^2-1)/(x-1), restricted [1] vs []","cancel 0/x [0]","clear 1/x+1/(x-1)=1 [0,1]"]},
 "Multiplying/cancelling by a factor that may vanish loses or adds solutions unless the zero is excluded.","ok/FAIL/ok/FAIL/ok/ok as hand-expected. Every rule's result additionally goes through checkTransition in the kernel registry, so a wrong precondition cannot by itself produce an accepted step except via S-01/S-03 gaps. (probe.out D8-D14)",S,"low",True)
add("S-22","clear-denominators precondition with hidden negative-exponent pole","LCD is built from all denominators",
 {"rule":"clear-denominators on 1/(x-1)+0*x^-1=-1 with [1]"},"The LCD must include x (pole of x^-1).","LCD = x-1 only; precondition 'LCD zeros restricted' passes. Same root cause as S-01 (denominatorsOf).",U,"medium",True)
add("S-23","poly.gcd, divmod, squarefree, rationalRoots, splitLinear, RatFun.reduce, RatFun.add","Core exact algebra is correct",
 {"method":"400 random trials; polynomials built from chosen rational roots (with multiplicities, negative/zero/fractional), content, and irreducible quadratics (x^2+1, x^2-2, x^2+x+1, x^2-3, x^2+2x+5); checked against an independent bigint Fraction implementation"},
 "rationalRoots must equal the chosen distinct roots; squarefree must equal prod(x-r)*prod(quad) monic; gcd(AG,BG)=monic G for coprime A,B; q*b+r=a with deg r<deg b; reduce is a cross-multiplication-equal coprime monic-denominator form; RatFun.add agrees pointwise.",
 "0 failures in 298 (rationalRoots, squarefree, divmod, gcd, reduce), 167 (splitLinear incl. content/multiplicity), 131 (splitLinear returns null with a quadratic factor), 280 (RatFun.add). (props.out)",S,"low",True)
add("S-24","expr-text.parseExpr","Parser faithfulness for the shapes the reasoner relies on",
 {"parse":["x^-1","-x^2","2^3^2","1 0"]},"x^-1 -> pow(x,neg(1)); -x^2 = -(x^2); 2^3^2 = 2^(3^2); '1 0' must not be read as ten (it is two tokens).",
 "x^-1 as expected (cause of S-01); -x^2 and 2^3^2 correct; '1 0' prints 10 because all whitespace is stripped before tokenising, so a typo merges two numbers. Low.",U,"low",True)
add("S-25","domain-state.checkClaim claim parsing","Claim values are a set of exact rationals",
 {"checkClaim":[["x=1",["1","1"]],["x=1",["2/2"]],["2*x=1",["0.5"]],["x=1",["1/0"]]]},
 "['1','1'] and ['2/2'] denote the set {1}: acceptable. '0.5' and '1/0' are malformed.","valid:true, valid:true; '0.5' throws SyntaxError, '1/0' throws Error('Division by zero') (untyped crashes, no wrong answer).",J,"low",True)
add("S-26","domain-engine accept-candidate catch-all (code reading)","Any exception while accepting a candidate means the candidate is rejected",
 {"code":"domain-engine.ts:124  try { applyDomainRule(... accept-candidate ...) } catch { rejected.push(c); cls = 'none' }"},
 "An exception that is not a mathematical rejection (e.g. OutsideBoundary from origRestr) would be reported as 'no solution' (a wrong answer rather than a refusal).",
 "Not reproduced: gate() already runs the same zerosOfDenominators on the original text, so the exception is unreachable for gated input. Recorded as unjustified-but-correct-in-scope by reading only.",J,"low",True)
json.dump(F,open('findings.json','w'),indent=1)
print(len(F))
