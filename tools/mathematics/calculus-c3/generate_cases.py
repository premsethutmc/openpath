"""Independent closed-form C3 method corpus."""
import json
from fractions import Fraction
from pathlib import Path
def R(x):return str(Fraction(x))
def c(x):return{"kind":"constant","value":R(x)}
def v(n):return{"kind":"variable","name":n}
x,u=v("x"),v("u")
def add(*z):return{"kind":"add","terms":list(z)}
def mul(*z):return{"kind":"multiply","factors":list(z)}
def pw(z,n):return{"kind":"power","base":z,"exponent":n}
def fn(k,z):return{"kind":k,"argument":z}
def st(i,claim,deps=None):return{"id":f"s{i}","rule":claim["kind"],"claim":claim,**({"dependencies":deps}if deps else{})}
cases=[]
def budget():return [st(j,{"kind":"value","value":"0"},[f"s{j-1}"]if j else None) for j in range(65)]
def put(area,p,w,cls="verified",first=None):cases.append({"id":f"{area}-{sum(z['area']==area for z in cases)}","area":area,"problem":p,"working":w,"expected":{"classification":cls,"firstInvalidStep":first},"oracle":"independently authored exact method identity"})
# substitution 120
for i in range(120):
 a=i%4+1;n=i%4;sub=add(pw(x,2),c(a));integ=mul(pw(sub,n),mul(c(2),x));definite=i%3==0;p={"domain":"calculus","task":"substitution","integrand":integ,"variable":"x",**({"definite":{"lower":"0","upper":"2"}}if definite else{})};setup={"kind":"substitution","symbol":"u","expression":sub,"differential":mul(c(2),x),"transformedIntegrand":pw(u,n),**({"lower":R(a),"upper":R(a+4),"invertibility":"monotone-increasing"}if definite else{})};anti={"kind":"antiderivative","expression":mul(c(Fraction(1,n+1)),pw(u,n+1)),"variable":"u"};final={"kind":"value","value":R(Fraction((a+4)**(n+1)-a**(n+1),n+1))}if definite else{"kind":"back-substitution","expression":mul(c(Fraction(1,n+1)),pw(sub,n+1)),"constantIncluded":True};good=[st(0,setup),st(1,anti,["s0"]),st(2,final,["s1"])]
 if i<80:put("substitution",p,good)
 elif i<100:
  bad=json.loads(json.dumps(good));bad[0]["claim"]["differential"]=x;put("substitution",p,bad,"invalid",0)
 elif i<110:
  if not definite:p["definite"]={"lower":"0","upper":"2"}
  bad=json.loads(json.dumps(good));bad[0]["claim"]["lower"]="0";bad[0]["claim"]["upper"]="2";put("substitution",p,bad,"invalid",0)
 elif i<115:put("substitution",p,good[:1],"incomplete")
 else:put("substitution",p,budget(),"resource-exhausted")
# integration by parts 100
for i in range(100):
 trig=i%2==1;g=fn("sin",x)if trig else fn("exp",x);integ=mul(x,g)
 if trig:vpart=mul(c(-1),fn("cos",x));F=add(mul(c(-1),x,fn("cos",x)),fn("sin",x))
 else:vpart=g;F=add(mul(x,g),mul(c(-1),g))
 p={"domain":"calculus","task":"integration-by-parts","integrand":integ,"variable":"x"};parts={"kind":"parts","integrand":integ,"u":x,"dv":g,"du":c(1),"v":vpart};good=[st(0,parts),st(1,{"kind":"antiderivative","expression":F,"variable":"x","constantIncluded":True},["s0"])]
 if i<70:put("parts",p,good)
 elif i<90:
  bad=json.loads(json.dumps(good));bad[0]["claim"]["du"]=c(2);put("parts",p,bad,"invalid",0)
 elif i<95:put("parts",p,good[:1],"incomplete")
 else:put("parts",p,budget(),"resource-exhausted")
# partial fractions 100
for i in range(100):
 mode=i%4
 if mode==0:p={"domain":"calculus","task":"partial-fractions","variable":"x","numerator":["1"],"quotientDegree":0,"linearFactors":[{"root":"0","multiplicity":1},{"root":"1","multiplicity":1}],"quadraticFactors":[]};cl={"kind":"partial-fractions","quotient":["0"],"linearTerms":[{"root":"0","power":1,"coefficient":"-1"},{"root":"1","power":1,"coefficient":"1"}],"quadraticTerms":[]}
 elif mode==1:p={"domain":"calculus","task":"partial-fractions","variable":"x","numerator":["1"],"quotientDegree":0,"linearFactors":[{"root":"1","multiplicity":2}],"quadraticFactors":[]};cl={"kind":"partial-fractions","quotient":["0"],"linearTerms":[{"root":"1","power":2,"coefficient":"1"}],"quadraticTerms":[]}
 elif mode==2:p={"domain":"calculus","task":"partial-fractions","variable":"x","numerator":["3","2"],"quotientDegree":0,"linearFactors":[],"quadraticFactors":[{"p":"2","q":"5"}]};cl={"kind":"partial-fractions","quotient":["0"],"linearTerms":[],"quadraticTerms":[{"p":"2","q":"5","linear":"2","constant":"3","logCoefficient":"1","remainder":"1"}]}
 else:p={"domain":"calculus","task":"partial-fractions","variable":"x","numerator":["1","0","1"],"quotientDegree":1,"linearFactors":[{"root":"1","multiplicity":1}],"quadraticFactors":[]};cl={"kind":"partial-fractions","quotient":["1","1"],"linearTerms":[{"root":"1","power":1,"coefficient":"2"}],"quadraticTerms":[]}
 if mode==0:pr={"kind":"partial-fraction-primitives","linearTerms":[{"root":"0","power":1,"coefficient":"-1","primitiveKind":"log","primitiveCoefficient":"-1"},{"root":"1","power":1,"coefficient":"1","primitiveKind":"log","primitiveCoefficient":"1"}],"quadraticTerms":[]}
 elif mode==1:pr={"kind":"partial-fraction-primitives","linearTerms":[{"root":"1","power":2,"coefficient":"1","primitiveKind":"power","primitiveCoefficient":"-1"}],"quadraticTerms":[]}
 elif mode==2:pr={"kind":"partial-fraction-primitives","linearTerms":[],"quadraticTerms":[{"p":"2","q":"5","logCoefficient":"1","remainder":"1","shift":"1","scale":"2","atanCoefficient":"1/2"}]}
 else:pr={"kind":"partial-fraction-primitives","linearTerms":[{"root":"1","power":1,"coefficient":"2","primitiveKind":"log","primitiveCoefficient":"2"}],"quadraticTerms":[]}
 good=[st(0,cl),st(1,pr,["s0"])]
 if i<70:put("partial-fractions",p,good)
 elif i<90:
  bad=json.loads(json.dumps(good));bad[0]["claim"]["quotient"]=["999"];put("partial-fractions",p,bad,"invalid",0)
 elif i<95:put("partial-fractions",p,good[:1],"incomplete")
 else:put("partial-fractions",p,budget(),"resource-exhausted")
# L'Hopital 80
for i in range(80):
 a=i%7+1;b=i%5+1;num=fn("sin",mul(c(a),x));den=mul(c(b),x);p={"domain":"calculus","task":"lhopital","variable":"x","numerator":num,"denominator":den,"approach":"0"};rule={"kind":"lhopital","numerator":num,"denominator":den,"derivedNumerator":mul(c(a),fn("cos",mul(c(a),x))),"derivedDenominator":c(b),"form":"0/0"};good=[st(0,rule),st(1,{"kind":"limit","value":{"kind":"finite","value":R(Fraction(a,b))}},["s0"])]
 if i<55:put("lhopital",p,good)
 elif i<70:
  bad=json.loads(json.dumps(good));bad[0]["claim"]["form"]="infinity/infinity";put("lhopital",p,bad,"invalid",0)
 elif i<75:put("lhopital",p,good[:1],"incomplete")
 else:put("lhopital",p,budget(),"resource-exhausted")
# piecewise and improper 100
for i in range(100):
 if i%2==0:p={"domain":"calculus","task":"piecewise-integral","variable":"x","pieces":[{"integrand":mul(c(2),x),"lower":"0","upper":"1"},{"integrand":c(1),"lower":"1","upper":"3"}]};cl={"kind":"piecewise-antiderivatives","pieces":[{"expression":pw(x,2),"value":"1"},{"expression":x,"value":"2"}],"total":"3"}
 else:
  a=Fraction((i%5)+1,2);p={"domain":"calculus","task":"improper-family","family":"p-tail","parameter":R(a)};ok=a>1;cl={"kind":"convergence","converges":ok,**({"value":R(1/(a-1))}if ok else{})}
 good=[st(0,cl)]
 if i<70:put("piecewise-improper",p,good)
 elif i<90:
  bad=json.loads(json.dumps(good));bad[0]["claim"]={"kind":"convergence","converges":True,"value":"999"}if p["task"]=="improper-family"else{**cl,"total":"999"};put("piecewise-improper",p,bad,"invalid",0)
 elif i<95:put("piecewise-improper",p,[],"incomplete")
 else:put("piecewise-improper",p,budget(),"resource-exhausted")
assert len(cases)==500
out=Path(__file__).with_name("independent-cases.v1.json");out.write_text(json.dumps({"version":"calculus-c3-corpus@1","cases":cases},indent=2)+"\n");print(out,len(cases))
