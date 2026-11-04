"""Independent exact-oracle cases for M2 native domains."""
import json,math
from fractions import Fraction
from pathlib import Path
def r(x):return str(Fraction(x))
def exact(x=0,rad=None):
 d={"rational":r(x)}
 if rad:d["radicals"]=[{"coefficient":r(c),"radicand":n,"index":i} for c,n,i in rad]
 return {"kind":"exact","value":d}
def claim(result,method="independent formula"):return {"kind":"claim","result":result,"method":method}
cases=[]
def add(id,area,p,w,cls="verified",first=None):cases.append({"id":id,"area":area,"problem":p,"working":w,"expected":{"classification":cls,"firstInvalidStep":first},"oracle":"independently authored exact formula/identity"})
trig={
 ("sin",0):exact(0),("sin",30):exact(Fraction(1,2)),("sin",45):exact(0,[(Fraction(1,2),2,2)]),("sin",60):exact(0,[(Fraction(1,2),3,2)]),("sin",90):exact(1),
 ("cos",0):exact(1),("cos",30):exact(0,[(Fraction(1,2),3,2)]),("cos",45):exact(0,[(Fraction(1,2),2,2)]),("cos",60):exact(Fraction(1,2)),("cos",90):exact(0),
 ("tan",0):exact(0),("tan",30):exact(0,[(Fraction(1,3),3,2)]),("tan",45):exact(1),("tan",60):exact(0,[(1,3,2)])}
ident=["pythagorean","tan-ratio","angle-addition","angle-subtraction","double-angle","half-angle"]
period={"sin:0":(["0"],"180"),"sin:1":(["90"],"360"),"sin:-1":(["270"],"360"),"sin:1/2":(["30","150"],"360"),"sin:-1/2":(["210","330"],"360"),"cos:0":(["90"],"180"),"cos:1":(["0"],"360"),"cos:-1":(["180"],"360"),"cos:1/2":(["60","300"],"360"),"cos:-1/2":(["120","240"],"360"),"tan:0":(["0"],"180"),"tan:1":(["45"],"180"),"tan:-1":(["135"],"180")}
for i in range(120):
 if i<40:
  fn,a=list(trig)[i%len(trig)];p={"domain":"trigonometry","task":"value","fn":fn,"degrees":a};res=trig[(fn,a)]
 elif i<70:
  name=ident[i%len(ident)];p={"domain":"trigonometry","task":"identity","identity":name};res={"kind":"identity","name":name,"valid":True}
 else:
  key=list(period)[i%len(period)];fn,v=key.split(":");bases,per=period[key];p={"domain":"trigonometry","task":"equation","fn":fn,"value":v};res={"kind":"periodic","set":{"bases":bases,"period":per,"unit":"degrees"}}
 if i<85:add(f"trig-{i}","trigonometry",p,[claim(res)])
 elif i<105:
  bad=json.loads(json.dumps(res));bad={"kind":"exact","value":{"rational":"99"}} if bad["kind"]!="periodic" else {"kind":"periodic","set":{"bases":["999"],"period":"360","unit":"degrees"}};add(f"trig-{i}","trigonometry",p,[claim(bad)],"invalid",0)
 elif i<112:add(f"trig-{i}","trigonometry",p,[],"incomplete")
 elif i<116:add(f"trig-{i}","trigonometry",{"domain":"trigonometry","task":"value","fn":"tan","degrees":90},[claim(exact(0))],"unsupported")
 else:add(f"trig-{i}","trigonometry",p,[claim(res)]*65,"resource-exhausted")
laws=["product-powers","quotient-powers","power-power","log-product","log-quotient","log-power","change-base","invalid-log-sum"]
for i in range(120):
 mode=i%4
 if mode==0:
  law=laws[i%len(laws)];p={"domain":"exponential-log","task":"law","law":law};res={"kind":"identity","name":law,"valid":law!="invalid-log-sum"}
 elif mode==1:
  base=["2","3","1/2"][i%3];a=i%4+1;b=i%5-2;c=b+a*(i%7-3);x=Fraction(c-b,a);p={"domain":"exponential-log","task":"exponential-equation","base":base,"left":{"a":r(a),"b":r(b)},"rightExponent":r(c)};res={"kind":"solutions","values":[r(x)]}
 elif mode==2:
  base=2+(i%3);a=i%4+1;b=i%5-2;rhs=i%4;target=base**rhs;x=Fraction(target-b,a);p={"domain":"exponential-log","task":"log-equation","base":r(base),"argument":{"a":r(a),"b":r(b)},"rhs":rhs};res={"kind":"solutions","values":[r(x)]}
 else:
  base=["2","1/2"][i%2];a=1;b=i%5;c=i%7;boundary=Fraction(c-b,a);rel=["<","<=",">",">="][i%4];reverse=base=="1/2";rev={"<":">","<=":">=",">":"<",">=":"<="};p={"domain":"exponential-log","task":"exponential-inequality","base":base,"left":{"a":"1","b":r(b)},"rightExponent":r(c),"relation":rel};res={"kind":"domain","restrictions":[f"x {rev[rel] if reverse else rel} {r(boundary)}"]}
 if i<90:add(f"explog-{i}","exponential-log",p,[claim(res)])
 elif i<108:add(f"explog-{i}","exponential-log",p,[claim({"kind":"solutions","values":["999"]})],"invalid",0)
 elif i<114:add(f"explog-{i}","exponential-log",p,[],"incomplete")
 elif i<117:add(f"explog-{i}","exponential-log",{"domain":"exponential-log","task":"exponential-equation","base":"1","left":{"a":"1","b":"0"},"rightExponent":"2"},[claim({"kind":"solutions","values":["2"]})],"unsupported")
 else:add(f"explog-{i}","exponential-log",p,[claim(res)]*65,"resource-exhausted")
for i in range(120):
 mode=i%6;a=Fraction(i%7+1);d=Fraction(i%5-2);ratio=Fraction((i%5)-2,3);n=i%8+1
 if mode==0:p={"domain":"sequence-series","task":"ap-term","first":r(a),"difference":r(d),"n":n};res=exact(a+(n-1)*d)
 elif mode==1:p={"domain":"sequence-series","task":"ap-sum","first":r(a),"difference":r(d),"n":n};res=exact(Fraction(n,2)*(2*a+(n-1)*d))
 elif mode==2:p={"domain":"sequence-series","task":"gp-term","first":r(a),"ratio":r(ratio),"n":n};res=exact(a*ratio**(n-1))
 elif mode==3:p={"domain":"sequence-series","task":"gp-sum","first":r(a),"ratio":r(ratio),"n":n};res=exact(a*n if ratio==1 else a*(1-ratio**n)/(1-ratio))
 elif mode==4:
  ok=i%4!=0;p={"domain":"sequence-series","task":"induction","identity":"sum-natural" if i%2 else "sum-odd","baseVerified":ok,"inductionStepVerified":ok};res={"kind":"identity","name":p["identity"],"valid":ok}
 else:
  p={"domain":"sequence-series","task":"infinite-gp","first":r(a),"ratio":r(ratio)};ok=abs(ratio)<1;res={"kind":"convergence","converges":ok};
  if ok:res["sum"]={"rational":r(a/(1-ratio))}
 if i<90:add(f"seq-{i}","sequence-series",p,[claim(res)])
 elif i<108:add(f"seq-{i}","sequence-series",p,[claim(exact(999))],"invalid",0)
 elif i<114:add(f"seq-{i}","sequence-series",p,[],"incomplete")
 else:add(f"seq-{i}","sequence-series",p,[claim(res)]*65,"resource-exhausted")
def simplify(n,index=2):
 sign=-1 if n<0 else 1;n=abs(n);outside=1;p=2
 while p**index<=n:
  while n%(p**index)==0:n//=p**index;outside*=p
  p+=1
 outside*=sign
 return exact(outside if n==1 else 0,None if n==1 else [(outside,n,index)])
for i in range(120):
 mode=i%6
 if mode==0:n=(i%12+1)*12;p={"domain":"radical","task":"sqrt","radicand":n};res=simplify(n)
 elif mode==1:n=(i%5+1)**3*2;p={"domain":"radical","task":"nth-root","radicand":n,"index":3};res=simplify(n,3)
 elif mode==2:n=i%7+2;num=i%5+1;p={"domain":"radical","task":"rationalize","numerator":r(num),"radicand":n};res=exact(0,[(Fraction(num,n),n,2)])
 elif mode==3:
  assumption="nonnegative" if i%2 else None;p={"domain":"radical","task":"sqrt-square","symbol":"x"};
  if assumption:p["assumption"]=assumption
  res={"kind":"identity","name":"x" if assumption else "abs(x)","valid":True}
 elif mode==4:
  # This bounded radical-equation family deliberately uses c=d.  The
  # discriminant is exactly one, so both candidate roots are rational and
  # can be checked in the original equation without numerical sampling.
  c=d=i%4;p={"domain":"radical","task":"equation","offset":r(c),"rightOffset":r(d)}
  # independent brute exact rational candidates in bounded range
  vals=[]
  for x in range(-20,21):
   if x+c>=0 and x+d>=0 and (x+d)**2==x+c:vals.append(r(x))
  res={"kind":"solutions","values":vals}
 else:
  m=i%5+1;n=i%4+1;p={"domain":"radical","task":"nested","sum":m+n,"product":m*n};a=simplify(m);b=simplify(n);terms=(a["value"].get("radicals",[])+b["value"].get("radicals",[]));res={"kind":"exact","value":{"rational":r(Fraction(a["value"]["rational"])+Fraction(b["value"]["rational"])),"radicals":terms}}
 if i<90:add(f"rad-{i}","radical",p,[claim(res)])
 elif i<108:add(f"rad-{i}","radical",p,[claim(exact(999))],"invalid",0)
 elif i<114:add(f"rad-{i}","radical",p,[],"incomplete")
 else:add(f"rad-{i}","radical",p,[claim(res)]*65,"resource-exhausted")
assert len(cases)==480
out=Path(__file__).with_name("independent-cases.v1.json");out.write_text(json.dumps({"version":"math-domains-m2-corpus@1","cases":cases},indent=2)+"\n");print(out,len(cases))
