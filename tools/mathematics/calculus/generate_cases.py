"""Independently derived bounded C2 cases; labels come from closed-form rules below."""
import json
from fractions import Fraction
from pathlib import Path
def R(x): return str(Fraction(x))
def c(x): return {"kind":"constant","value":R(x)}
x={"kind":"variable","name":"x"}
def add(*a): return {"kind":"add","terms":list(a)}
def mul(*a): return {"kind":"multiply","factors":list(a)}
def power(a,n): return {"kind":"power","base":a,"exponent":n}
def fun(k,a): return {"kind":k,"argument":a}
def expr(e,C=False): return {"kind":"expression","value":e,**({"constantIncluded":True} if C else {})}
def step(claim,i=0,deps=None): return {"id":f"s{i}","rule":"independent exact rule","claim":claim,**({"dependencies":deps} if deps else {})}
cases=[]
def put(area,p,w,expected="verified",first=None): cases.append({"id":f"{area}-{sum(z['area']==area for z in cases)}","area":area,"problem":p,"working":w,"expected":{"classification":expected,"firstInvalidStep":first},"oracle":"independently authored closed-form calculus rule"})
# 150 differentiation: monomial, chain/trig, exp, log, product; last 45 adversarial.
for i in range(150):
 k=i%5;a=i%7+1;n=i%5+1
 if k==0: f=mul(c(a),power(x,n)); d=mul(c(a*n),power(x,n-1))
 elif k==1: f=fun("sin",mul(c(a),x));d=mul(c(a),fun("cos",mul(c(a),x)))
 elif k==2: f=fun("exp",mul(c(a),x));d=mul(c(a),fun("exp",mul(c(a),x)))
 elif k==3: f=fun("log",mul(c(a),x));d=mul(c(a),power(mul(c(a),x),-1))
 else: f=mul(power(x,n),fun("sin",x));d=add(mul(c(n),power(x,n-1),fun("sin",x)),mul(power(x,n),fun("cos",x)))
 p={"domain":"calculus","task":"derivative","expression":f,"variable":"x"}
 if i<105: put("differentiation",p,[step(expr(d))])
 elif i<135: put("differentiation",p,[step(expr(c(999)))],"invalid",0)
 elif i<143: put("differentiation",p,[],"incomplete")
 else: put("differentiation",p,[step(expr(d),j,[f"s{j-1}"] if j else None) for j in range(65)],"resource-exhausted")
# 150 indefinite integration, checked independently by power/trig/exp primitives.
for i in range(150):
 k=i%3;a=i%6+1;n=i%5
 if k==0: f=mul(c(a),power(x,n));F=mul(c(Fraction(a,n+1)),power(x,n+1))
 elif k==1: f=mul(c(a),fun("cos",mul(c(a),x)));F=fun("sin",mul(c(a),x))
 else: f=mul(c(a),fun("exp",mul(c(a),x)));F=fun("exp",mul(c(a),x))
 p={"domain":"calculus","task":"indefinite-integral","integrand":f,"variable":"x"}
 if i<105:put("indefinite",p,[step(expr(F,True))])
 elif i<125:put("indefinite",p,[step(expr(F,False))],"invalid",0)
 elif i<140:put("indefinite",p,[step(expr(c(999),True))],"invalid",0)
 else:put("indefinite",p,[],"incomplete")
# 100 definite / improper cases.
for i in range(100):
 if i%5:
  a=i%5+1;n=i%4;lo=i%3;hi=lo+i%4+1;f=mul(c(a),power(x,n));F=mul(c(Fraction(a,n+1)),power(x,n+1));ans=Fraction(a,n+1)*(hi**(n+1)-lo**(n+1));p={"domain":"calculus","task":"definite-integral","integrand":f,"variable":"x","lower":R(lo),"upper":R(hi)};good=[step(expr(F),0),step({"kind":"value","value":R(ans)},1,["s0"])]
 else:
  a=i%7+1;f=fun("exp",mul(c(-a),x));p={"domain":"calculus","task":"definite-integral","integrand":f,"variable":"x","lower":"0","upper":"0","improper":"upper-infinity"};good=[step({"kind":"value","value":R(Fraction(1,a))})]
 if i<75:put("definite-improper",p,good)
 elif i<90:
  bad=json.loads(json.dumps(good));bad[-1]["claim"]={"kind":"value","value":"999"};put("definite-improper",p,bad,"invalid",len(bad)-1)
 elif i<95:put("definite-improper",p,good[:-1],"incomplete")
 else:
  p={"domain":"calculus","task":"definite-integral","integrand":fun("sin",power(x,2)),"variable":"x","lower":"0","upper":"1","improper":"upper-infinity"};put("definite-improper",p,[step({"kind":"value","value":"0"})],"unsupported")
# 150 limits/continuity.
for i in range(150):
 k=i%5;a=i%7+1
 if k==0:p={"domain":"calculus","task":"limit","expression":add(mul(c(a),x),c(2)),"variable":"x","approach":"3","method":"direct"};claim={"kind":"limit","value":{"kind":"finite","value":R(3*a+2)}}
 elif k==1:p={"domain":"calculus","task":"limit","expression":mul(fun("sin",mul(c(a),x)),power(x,-1)),"variable":"x","approach":"0","method":"standard-trig"};claim={"kind":"limit","value":{"kind":"finite","value":R(a)}}
 elif k==2:p={"domain":"calculus","task":"limit","expression":power(add(x,c(-a)),-1),"variable":"x","approach":R(a),"side":"right","method":"reciprocal"};claim={"kind":"limit","value":{"kind":"positive-infinity"}}
 elif k==3:p={"domain":"calculus","task":"limit","expression":mul(add(power(x,2),c(-a*a)),power(add(x,c(-a)),-1)),"equivalentExpression":add(x,c(a)),"variable":"x","approach":R(a),"method":"removable"};claim={"kind":"limit","value":{"kind":"finite","value":R(2*a)}}
 else:p={"domain":"calculus","task":"continuity","left":add(x,c(a)),"right":add(x,c(a)),"variable":"x","point":"0"};claim={"kind":"boolean","value":True}
 if i<105:put("limits-continuity",p,[step(claim)])
 elif i<130:put("limits-continuity",p,[step({"kind":"limit","value":{"kind":"finite","value":"999"}})],"invalid",0)
 elif i<140:put("limits-continuity",p,[],"incomplete")
 else:
  p={"domain":"calculus","task":"limit","expression":fun("log",x),"variable":"x","approach":"0","side":"right"};put("limits-continuity",p,[step({"kind":"limit","value":{"kind":"negative-infinity"}})],"unsupported")
assert len(cases)==550
out=Path(__file__).with_name("independent-cases.v1.json");out.write_text(json.dumps({"version":"calculus-c2-corpus@1","cases":cases},indent=2)+"\n");print(out,len(cases))
