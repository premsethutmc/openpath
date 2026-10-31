"""Independent M3 labels. Held-out cases are emitted separately before evaluation."""
import json
from pathlib import Path
def c(n):return{"kind":"constant","value":str(n)}
def v(n):return{"kind":"variable","name":n}
x,y,z=v("x"),v("y"),v("z")
def add(*a):return{"kind":"add","terms":list(a)}
def mul(*a):return{"kind":"multiply","factors":list(a)}
def pw(a,n):return{"kind":"power","base":a,"exponent":n}
def fn(k,a):return{"kind":k,"argument":a}
def root(a,n=2):return{"kind":"root","radicand":a,"index":n}
def step(i,e,ass=None,carry=None):return{"id":f"s{i}","expression":e,**({"assumptions":ass}if ass else{}),**({"carriedRestrictions":carry}if carry else{}),**({"dependencies":[f"s{i-1}"]}if i else{})}
def budget():return[step(i,x)for i in range(65)]
cases=[]
def put(area,start,working,classification,first=None,ass=None):cases.append({"id":f"{area}-{sum(q['area']==area for q in cases)}","area":area,"problem":{"domain":"symbolic","start":start,**({"assumptions":ass}if ass else{})},"working":working,"expected":{"classification":classification,"firstInvalidStep":first},"oracle":"independently authored exact identity/domain argument"})
areas=["polynomial-rational","trigonometry","log-exp","radicals-solutions","calculus-symbolic","cross-domain"]
for area in areas:
 for i in range(100):
  mode=i%10
  if area=="polynomial-rational":
   a=i%5+1;b=i%7-3;left=mul(add(mul(c(a),x),c(b)),add(x,y));right=add(mul(c(a),pw(x,2)),mul(c(a),x,y),mul(c(b),x),mul(c(b),y))
   if mode<6:put(area,left,[step(0,right)],"verified")
   elif mode<8:put(area,left,[step(0,add(right,c(1)))],"invalid",0)
   elif mode==8:
    d=add(x,c(-a));before=mul(add(pw(x,2),c(-a*a)),pw(d,-1));after=add(x,c(a));restriction="nonzero:"+json.dumps({"kind":"add","terms":[c(-a),x]},separators=(",",":"));put(area,before,[step(0,after,carry=[restriction])],"verified")
   else:put(area,left,budget(),"resource-exhausted")
  elif area=="trigonometry":
   identity=add(pw(fn("sin",x),2),pw(fn("cos",x),2))
   if mode<5:put(area,identity,[step(0,c(1))],"verified")
   elif mode<7:put(area,fn("sin",add(x,y)),[step(0,add(mul(fn("sin",x),fn("cos",y)),mul(fn("cos",x),fn("sin",y))))],"verified")
   elif mode==7:put(area,identity,[step(0,c(2))],"invalid",0)
   elif mode==8:put(area,fn("sin",x),[step(0,fn("cos",x))],"unsupported")
   else:put(area,identity,[],"incomplete")
  elif area=="log-exp":
   assumptions=[{"kind":"positive","expression":x},{"kind":"positive","expression":y}];product=fn("log",mul(x,y));expanded=add(fn("log",x),fn("log",y))
   if mode<5:put(area,product,[step(0,expanded)],"verified",ass=assumptions)
   elif mode<7:put(area,product,[step(0,expanded)],"missing-assumption")
   elif mode==7:put(area,fn("log",fn("exp",x)),[step(0,mul(c(2),x))],"invalid",0)
   elif mode==8:put(area,fn("log",add(x,y)),[step(0,expanded)],"unsupported")
   else:put(area,product,[],"incomplete",ass=assumptions)
  elif area=="radicals-solutions":
   sq=root(pw(x,2));
   if mode<4:put(area,sq,[step(0,{"kind":"abs","argument":x})],"verified")
   elif mode<6:put(area,sq,[step(0,x)],"verified",ass=[{"kind":"nonnegative","expression":x}])
   elif mode<8:put(area,sq,[step(0,x)],"missing-assumption")
   elif mode==8:put(area,root(add(x,y)),[step(0,add(root(x),root(y)))],"unsupported")
   else:put(area,sq,budget(),"resource-exhausted")
  elif area=="calculus-symbolic":
   # Algebraically different but equal intermediate derivatives/antiderivatives.
   factored=mul(add(x,c(1)),add(x,c(2)));expanded=add(pw(x,2),mul(c(3),x),c(2))
   if mode<6:put(area,factored,[step(0,expanded)],"verified")
   elif mode<8:put(area,factored,[step(0,add(expanded,c(1)))],"invalid",0)
   elif mode==8:put(area,fn("sin",x),[step(0,fn("cos",x))],"unsupported")
   else:put(area,factored,[],"incomplete")
  else:
   start=mul(add(x,y),add(x,mul(c(-1),y)));mid=add(pw(x,2),mul(c(-1),pw(y,2)));final=add(mul(c(-1),pw(y,2)),pw(x,2))
   if mode<5:put(area,start,[step(0,mid),step(1,final)],"verified")
   elif mode<7:put(area,start,[step(0,mid),step(1,add(mid,c(1))),step(2,final)],"invalid",1)
   elif mode==7:put(area,start,[step(0,mid),step(1,fn("sin",x))],"unsupported")
   elif mode==8:put(area,start,[step(0,mid)],"verified")
   else:put(area,start,budget(),"resource-exhausted")
assert len(cases)==600

# Frozen held-out set: different compositions and routes from the main templates.
held=[]
def hold(area,start,working,classification,first=None,ass=None):held.append({"id":f"held-{len(held)}","area":area,"problem":{"domain":"symbolic","start":start,**({"assumptions":ass}if ass else{})},"working":working,"expected":{"classification":classification,"firstInvalidStep":first},"oracle":"held-out independently authored derivation"})
for i in range(150):
 k=i%6;a=i%9+1
 if k==0:hold("polynomial",pw(add(x,c(a)),3),[step(0,mul(add(x,c(a)),add(pw(x,2),mul(c(2*a),x),c(a*a))))],"verified")
 elif k==1:hold("rational-domain",mul(add(pw(x,2),c(-a*a)),pw(add(x,c(-a)),-1)),[step(0,add(x,c(a)))],"missing-assumption")
 elif k==2:hold("trig-composition",fn("cos",add(x,y)),[step(0,add(mul(fn("cos",x),fn("cos",y)),mul(c(-1),fn("sin",x),fn("sin",y))))],"verified")
 elif k==3:hold("log-reverse",add(fn("log",x),fn("log",y)),[step(0,fn("log",mul(x,y)))],"verified",ass=[{"kind":"positive","expression":x},{"kind":"positive","expression":y}])
 elif k==4:hold("invalid-route",add(pw(x,2),c(a)),[step(0,add(x,c(a))),step(1,add(pw(x,2),c(a)))],"invalid",0)
 else:hold("unsupported-composition",fn("exp",fn("sin",x)),[step(0,fn("sin",fn("exp",x)))],"unsupported")
Path(__file__).with_name("independent-cases.v1.json").write_text(json.dumps({"version":"symbolic-m3-corpus@1","cases":cases},indent=2)+"\n")
Path(__file__).with_name("heldout-cases.v1.json").write_text(json.dumps({"version":"symbolic-m3-heldout@1","frozenBeforeEvaluation":True,"cases":held},indent=2)+"\n")
print(len(cases),len(held))
