#!/usr/bin/env python3
"""Create the independently authored, frozen E1 evaluation corpus.

The reference classifications and error locations are derived from the authored
solution variants below, never from OpenPath.  Text is released as CC0-1.0.
"""
from __future__ import annotations
import hashlib, json, random
from pathlib import Path

ROOT=Path(__file__).parent
AREAS={
 "algebra":90,"functions-trigonometry-logarithms":70,"calculus":70,
 "geometry-coordinate-geometry":70,"probability-combinatorics-statistics":60,
 "vectors-matrices":50,"complex-polynomial-roots":40,"mixed-domain":50,
}
CATEGORIES={"correct-conventional":150,"correct-alternative":75,"mathematical-error":100,
 "incomplete":75,"missing-restriction-or-branch":40,"ambiguous-or-malformed":30,
 "unsupported-out-of-scope":30}

def q(n,d=1):
 g=__import__('math').gcd(n,d); n//=g; d//=g
 return str(n) if d==1 else f"{n}/{d}"

def common(i, area, category, problem, working, expected, first=None, concepts=(), assumptions=(), restrictions=(), branches=(), alternative=False, scope=True, note=""):
 return {"id":f"e1-{i+1:03d}","area":area,"primaryCategory":category,"problem":problem,
  "studentWorking":{"format":"natural","text":"\n".join(working)},
  "reference":{"classification":expected,"firstInvalidStep":first,"complete":expected=="verified",
   "interpretation":note or "Interpret each line as the student's asserted next mathematical step.",
   "missingAssumptions":list(assumptions),"missingDomainRestrictions":list(restrictions),
   "missingSolutionBranches":list(branches),"alternativeMethodValid":alternative,
   "insideDocumentedScope":scope,"requiredConcepts":list(concepts)},
  "provenance":{"kind":"independently-authored","license":"CC0-1.0","authoringVersion":"e1-v1"}}

def algebra(i,cat):
 a=2+i%5; x=2+(i*3)%9; b=1+(i*7)%8; c=a*x+b
 p={"domain":"algebra","statement":f"{a}x + {b} = {c}"}
 good=[f"{a}x + {b} = {c}",f"{a}x = {c-b}",f"x = {x}"]
 if cat=="correct-conventional": return p,good,"verified",None,(),(),(),False,True,"Solve the linear equation by preserving equality."
 if cat=="correct-alternative": return p,[good[0],f"x = ({c} - {b})/{a}",f"x = {x}"],"verified",None,(),(),(),True,True,"Solve by isolating x in one valid rearrangement."
 if cat=="mathematical-error": return p,[good[0],f"{a}x = {c+b}",f"x = {q(c+b,a)}"],"invalid",1,(),(),(),False,True,"The constant must be subtracted from both sides."
 if cat=="incomplete": return p,[good[0],good[1]],"incomplete",None,(),(),(),False,True,"The rearrangement is valid but the requested value of x is absent."
 if cat=="missing-restriction-or-branch":
  r=2+i%8; return {"domain":"algebra","statement":f"x^2 = {r*r}"},[f"x^2 = {r*r}",f"x = {r}"],"incomplete",None,(),(),[f"x = {-r}"],False,True,"One square-root branch is missing."
 if cat=="ambiguous-or-malformed": return p,[good[0],"1/2x = 3","x = 6"],"ambiguous",None,(),(),(),False,True,"The expression 1/2x is convention-dependent."
 return {"domain":"algebra","statement":"Find all integer solutions of x^3 + y^3 = z^3"},["Assume x,y,z > 0","x^3 + y^3 = z^3","Use a complete proof of Fermat's Last Theorem"],"unsupported",None,(),(),(),False,False,"The requested general number-theory proof is outside the bounded engine."

def functions(i,cat):
 n=1+i%5; p={"domain":"function","task":"evaluate","f":{"kind":"polynomial","coefficients":[str(n+1),str(n),"1"]},"input":str(n)}
 value=n*n+n*n+n+1; good=[f"f(x) = x^2 + {n}x + {n+1}",f"f({n}) = {n}^2 + {n}({n}) + {n+1}",f"f({n}) = {value}"]
 if cat=="correct-conventional": return p,good,"verified",None,(),(),(),False,True,"Evaluate a polynomial exactly."
 if cat=="correct-alternative": return p,[good[0],f"f({n}) = {n}({n+n}) + {n+1}",good[-1]],"verified",None,(),(),(),True,True,"Regroup before evaluating the same polynomial."
 if cat=="mathematical-error": return p,[good[0],f"f({n}) = {n}^2 + {n} + {n+1}",f"f({n}) = {n*n+2*n+1}"],"invalid",1,(),(),(),False,True,"The nx term was evaluated as n instead of n times x."
 if cat=="incomplete": return p,good[:2],"incomplete",None,(),(),(),False,True,"The substitution is shown but not evaluated."
 if cat=="missing-restriction-or-branch": return {"domain":"algebra","statement":"log(x^2) = 2log(x)"},["log(x^2) = 2log(x)","Therefore this holds for all real x"],"missing-assumption",1,("x > 0",),("x > 0",),(),False,True,"The logarithmic identity requires positive x in the real domain."
 if cat=="ambiguous-or-malformed": return p,[good[0],"sin^-1 x = 1/sin x","x = 1"],"ambiguous",None,(),(),(),False,True,"sin^-1 may denote inverse sine or reciprocal sine."
 return {"domain":"function","task":"classify","statement":"Classify all discontinuities of the Dirichlet function"},["f(x)=1 if x is rational","f(x)=0 if x is irrational","Analyze every real point"],"unsupported",None,(),(),(),False,False,"Dense-set discontinuity analysis is outside the bounded natural adapter."

def calculus(i,cat):
 k=2+i%6; p={"domain":"calculus","task":"derivative","expression":{"kind":"power","base":{"kind":"variable","name":"x"},"exponent":k},"variable":"x"}
 good=[f"f(x) = x^{k}",f"f'(x) = {k}x^{k-1}",f"d/dx x^{k} = {k}x^{k-1}"]
 if cat=="correct-conventional": return p,good,"verified",None,(),(),(),False,True,"Apply the power rule."
 if cat=="correct-alternative": return p,[good[0],f"x^{k} = x*x^{k-1}",f"f'(x) = x*({k-1}x^{k-2}) + x^{k-1}",good[1]],"verified",None,(),(),(),True,True,"Use the product rule and simplify."
 if cat=="mathematical-error": return p,[good[0],f"f'(x) = {k}x^{k}",f"f'(x) = {k}x^{k}"],"invalid",1,(),(),(),False,True,"The derivative exponent must decrease by one."
 if cat=="incomplete": return p,[good[0],"Use the power rule"],"incomplete",None,(),(),(),False,True,"A rule is named but no derivative is produced."
 if cat=="missing-restriction-or-branch": return {"domain":"calculus","task":"indefinite-integral","integrand":{"kind":"power","base":{"kind":"variable","name":"x"},"exponent":k},"variable":"x"},[f"∫ x^{k} dx = x^{k+1}/{k+1}",f"Differentiate x^{k+1}/{k+1} to check"],"missing-assumption",0,("add an arbitrary integration constant",),(),("+ C",),False,True,"An indefinite antiderivative requires an arbitrary constant."
 if cat=="ambiguous-or-malformed": return p,["f(x = x^2","f'(x) = 2x"],"malformed",None,(),(),(),False,True,"The first function application has unmatched punctuation."
 return {"domain":"calculus","task":"solve-pde","statement":"Solve the Navier-Stokes initial boundary value problem"},["∂u/∂t + (u·∇)u = -∇p + νΔu","∇·u=0","Find every smooth global solution"],"unsupported",None,(),(),(),False,False,"General nonlinear PDE solving is out of scope."

def geometry(i,cat):
 a=3+i%5;b=4+i%4;p={"domain":"geometry","problem":{"objects":[{"id":"ABC","kind":"triangle"}],"facts":[{"predicate":"angle_measure","args":["A"],"value":a*10},{"predicate":"angle_measure","args":["B"],"value":b*10}],"conditions":["nondegenerate:ABC"],"goal":{"predicate":"angle_measure","args":["C"],"value":180-10*(a+b)}}}
 c=180-10*(a+b);good=["A + B + C = 180°",f"{a*10}° + {b*10}° + C = 180°",f"C = {c}°"]
 if cat=="correct-conventional": return p,good,"verified",None,(),(),(),False,True,"Use the triangle angle sum."
 if cat=="correct-alternative": return p,[f"A + B = {(a+b)*10}°",f"C = 180° - {(a+b)*10}°",f"C = {c}°"],"verified",None,(),(),(),True,True,"Subtract the combined known angles."
 if cat=="mathematical-error": return p,[good[0],f"C = 180° - {a*10}° + {b*10}°",f"C = {180-a*10+b*10}°"],"invalid",1,(),(),(),False,True,"Both known angles must be subtracted."
 if cat=="incomplete": return p,good[:2],"incomplete",None,(),(),(),False,True,"The angle equation is valid but unsolved."
 if cat=="missing-restriction-or-branch": return {"domain":"geometry","problem":{"objects":[{"id":"ABC","kind":"triangle"}],"facts":[],"conditions":[],"goal":{"predicate":"angle_sum","args":["ABC"],"value":180}}},["A + B + C = 180°","Therefore C = 180° - A - B"],"missing-assumption",0,("ABC is a nondegenerate Euclidean triangle",),(),(),False,True,"Triangle nondegeneracy and Euclidean setting are required."
 if cat=="ambiguous-or-malformed": return p,["AB = 5","AC = 5","angle B = angle C maybe from picture"],"ambiguous",None,(),(),(),False,True,"The final claim relies on an unspecified diagram/given."
 return {"domain":"geometry","problem":{"statement":"Prove the general Jordan curve theorem"}},["Let C be any simple closed curve","It separates the plane","Give a complete topological proof"],"unsupported",None,(),(),(),False,False,"General topology is outside the school geometry reasoner."

def probability(i,cat):
 red=2+i%5; blue=3+(i*2)%5; total=red+blue;p={"domain":"probability-statistics","area":"probability","task":"complement","data":{"pa":q(red,total)}}
 good=[f"P(R) = {red}/{total}","P(not R) = 1 - P(R)",f"P(not R) = {q(blue,total)}"]
 if cat=="correct-conventional": return p,good,"verified",None,(),(),(),False,True,"Use the complement rule."
 if cat=="correct-alternative": return p,[f"There are {blue} non-red outcomes out of {total}",f"P(not R) = {blue}/{total}",f"P(not R) = {q(blue,total)}"],"verified",None,(),(),(),True,True,"Count complementary outcomes directly."
 if cat=="mathematical-error": return p,[good[0],"P(not R) = 1 + P(R)",f"P(not R) = {q(total+red,total)}"],"invalid",1,(),(),(),False,True,"Complementary probabilities subtract from one."
 if cat=="incomplete": return p,good[:2],"incomplete",None,(),(),(),False,True,"The correct formula is not evaluated."
 if cat=="missing-restriction-or-branch": return {"domain":"probability-statistics","area":"probability","task":"independent-intersection","data":{"pa":"1/2","pb":"1/3"}},["P(A)=1/2","P(B)=1/3","P(A∩B)=P(A)P(B)=1/6"],"missing-assumption",2,("A and B are independent",),(),(),False,True,"The product rule requires independence."
 if cat=="ambiguous-or-malformed": return p,["P(A|B = 1/2","P(A and B)=1/4"],"malformed",None,(),(),(),False,True,"Conditional-probability notation is unclosed."
 return {"domain":"probability-statistics","area":"distribution","task":"continuous-stochastic-process","data":{}},["Let W(t) be Brownian motion","Use Ito's lemma","Find the stopping-time distribution"],"unsupported",None,(),(),(),False,False,"Stochastic calculus is outside B1."

def linear(i,cat):
 a=1+i%4;b=2+(i*2)%5;c=3+(i*3)%4;d=1+(i*5)%6;p={"domain":"linear-algebra","area":"matrix","task":"determinant","data":{"a":[[str(a),str(b)],[str(c),str(d)]]}}
 det=a*d-b*c;good=[f"A = [[{a},{b}],[{c},{d}]]",f"det(A) = {a}*{d} - {b}*{c}",f"det(A) = {det}"]
 if cat=="correct-conventional": return p,good,"verified",None,(),(),(),False,True,"Evaluate a 2 by 2 determinant."
 if cat=="correct-alternative": return p,[good[0],f"det(A) = -({b}*{c} - {a}*{d})",good[-1]],"verified",None,(),(),(),True,True,"Use an equivalent signed rearrangement."
 if cat=="mathematical-error": return p,[good[0],f"det(A) = {a}*{d} + {b}*{c}",f"det(A) = {a*d+b*c}"],"invalid",1,(),(),(),False,True,"The off-diagonal product must be subtracted."
 if cat=="incomplete": return p,good[:2],"incomplete",None,(),(),(),False,True,"The determinant expression is not evaluated."
 if cat=="missing-restriction-or-branch": return {"domain":"linear-algebra","area":"matrix","task":"inverse","data":{"a":[["1","2"],["2","4"]]}},["A = [[1,2],[2,4]]","A^-1 = 1/det(A) adj(A)","Compute A^-1"],"missing-assumption",1,("det(A) ≠ 0",),("matrix must be invertible",),(),False,True,"The matrix is singular, so inverse reasoning requires a false precondition."
 if cat=="ambiguous-or-malformed": return p,["A = [[1,2],[3]","det(A) = -2"],"malformed",None,(),(),(),False,True,"The matrix has malformed rows."
 return {"domain":"linear-algebra","area":"operator","task":"spectral-theorem-infinite-dimensional","data":{}},["Let T be an unbounded self-adjoint operator","Apply the spectral theorem","Construct its projection-valued measure"],"unsupported",None,(),(),(),False,False,"Functional analysis is outside bounded finite linear algebra."

def complex_case(i,cat):
 a=1+i%5;b=1+(i*2)%5;p={"domain":"complex-polynomial","area":"arithmetic","task":"modulus-square","data":{"a":{"re":str(a),"im":str(b)}}}
 s=a*a+b*b;good=[f"z = {a} + {b}i",f"|z|^2 = {a}^2 + {b}^2",f"|z| = sqrt({s})"]
 if cat=="correct-conventional": return p,good,"verified",None,(),(),(),False,True,"Use Cartesian modulus."
 if cat=="correct-alternative": return p,[good[0],f"z*conj(z) = ({a}+{b}i)({a}-{b}i)",f"z*conj(z) = {s}",f"|z| = sqrt({s})"],"verified",None,(),(),(),True,True,"Use the conjugate product."
 if cat=="mathematical-error": return p,[good[0],f"|z| = {a}+{b}",f"|z| = {a+b}"],"invalid",1,(),(),(),False,True,"Modulus is not the sum of components."
 if cat=="incomplete": return p,good[:2],"incomplete",None,(),(),(),False,True,"The squared modulus is set up but the modulus is absent."
 if cat=="missing-restriction-or-branch": return {"domain":"complex-polynomial","area":"polar","task":"argument","data":{"a":{"re":"-1","im":"0"}}},["z = -1","arg(z) = pi"],"incomplete",None,(),(),("arg(z) = pi + 2pi k for integer k",),False,True,"A principal argument is not the complete argument family."
 if cat=="ambiguous-or-malformed": return p,["z = 2 + 3i","sqrt(z^2) = z always"],"ambiguous",None,(),(),(),False,True,"Square-root branch semantics are unspecified."
 return {"domain":"complex-polynomial","area":"polynomial","task":"general-radicals","data":{"degree":5}},["p(x)=x^5-x+1","Find every root in radicals","Give a general radical formula"],"unsupported",None,(),(),(),False,False,"General quintic solution by radicals is unsupported and impossible in general."

def mixed(i,cat):
 r=2+i%5;p={"domain":"algebra","statement":f"x^2 = {r*r}"};good=[f"x^2 = {r*r}",f"x = ±{r}",f"f(x)=x^2 gives f({r})=f({-r})={r*r}"]
 if cat=="correct-conventional": return p,good,"verified",None,(),(),(),False,True,"Solve then verify both roots by function evaluation."
 if cat=="correct-alternative": return p,[f"x^2-{r*r}=0",f"(x-{r})(x+{r})=0",f"x={r} or x={-r}"],"verified",None,(),(),(),True,True,"Factor as a difference of squares."
 if cat=="mathematical-error": return p,[good[0],f"x={r}",f"This is the complete solution"],"invalid",1,(),(),(f"x={-r}",),False,True,"The negative root is omitted before claiming completeness."
 if cat=="incomplete": return p,[good[0],f"Take square roots on both sides"],"incomplete",None,(),(),(),False,True,"No roots are stated."
 if cat=="missing-restriction-or-branch": return p,[good[0],f"x={r}"],"incomplete",None,(),(),(f"x={-r}",),False,True,"One valid branch is omitted."
 if cat=="ambiguous-or-malformed": return p,["Let f x = x^2",f"f^-1({r*r})={r}"],"ambiguous",None,(),(),(),False,True,"Inverse-function notation and branch restriction are unspecified."
 return {"domain":"mixed","statement":"Combine a general algebraic variety with sheaf cohomology"},["Let X be a projective scheme","Compute H^i(X,F)","Use the derived category"],"unsupported",None,(),(),(),False,False,"Algebraic geometry and sheaf cohomology are out of scope."

BUILD={"algebra":algebra,"functions-trigonometry-logarithms":functions,"calculus":calculus,
 "geometry-coordinate-geometry":geometry,"probability-combinatorics-statistics":probability,
 "vectors-matrices":linear,"complex-polynomial-roots":complex_case,"mixed-domain":mixed}

def main():
 areas=[a for a,n in AREAS.items() for _ in range(n)]
 cats=[c for c,n in CATEGORIES.items() for _ in range(n)]
 random.Random(8101).shuffle(cats)
 cases=[]
 for i,(area,cat) in enumerate(zip(areas,cats)):
  vals=BUILD[area](i,cat)
  p,w,e,first,assume,restrict,branches,alt,scope,note=vals
  cases.append(common(i,area,cat,p,w,e,first,(area,),assume,restrict,branches,alt,scope,note))
 # deterministic stratified 30% holdout selected before any engine call
 for area in AREAS:
  ids=[j for j,c in enumerate(cases) if c["area"]==area]
  random.Random(f"e1-holdout-{area}").shuffle(ids)
  take=round(AREAS[area]*.3)
  for j in ids[:take]: cases[j]["partition"]="sealed-holdout"
  for j in ids[take:]: cases[j]["partition"]="diagnostic"
 # exact total adjustment (rounding currently sums to 150, asserted below)
 assert sum(c["partition"]=="sealed-holdout" for c in cases)==150
 payload={"benchmark":"openpath-end-to-end-e1","version":"1.0.0","frozenBeforeEvaluation":True,
  "provenance":{"authorship":"independently authored for E1","license":"CC0-1.0","externalCopyrightedTextIncluded":False},
  "areaCounts":AREAS,"categoryCounts":CATEGORIES,"cases":cases}
 out=ROOT/"frozen-corpus.v1.json"; out.write_text(json.dumps(payload,indent=2)+"\n")
 digest=hashlib.sha256(out.read_bytes()).hexdigest(); (ROOT/"FROZEN_SHA256").write_text(f"{digest}  frozen-corpus.v1.json\n")
 print(digest, len(cases))
if __name__=="__main__":main()
