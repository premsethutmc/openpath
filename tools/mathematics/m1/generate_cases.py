"""Independent formula-labelled M1 cases. Expected values are not engine output."""
import json
from fractions import Fraction
from pathlib import Path
def t(x):return str(Fraction(x))
def interval(a,b,ia=False,ib=False):return {"min":None if a is None else t(a),"max":None if b is None else t(b),"includeMin":ia,"includeMax":ib}
cases=[]
def add(id,category,problem,working,classification="verified",first=None):cases.append({"id":id,"category":category,"problem":problem,"working":working,"expected":{"classification":classification,"firstInvalidStep":first},"oracle":"independent exact formula"})
for i in range(100):
 r=i%17-8;mode=i%4
 if mode==0:p={"domain":"inequality","parts":[{"numerator":[t(-r),"1"],"relation":">="}]};sol=[interval(r,None,True,False)]
 elif mode==1:p={"domain":"inequality","parts":[{"numerator":[t(-r),"1"],"relation":"<"}]};sol=[interval(None,r)]
 elif mode==2:
  a,b=sorted((r,r+3));p={"domain":"inequality","parts":[{"numerator":[t(a*b),t(-(a+b)),"1"],"relation":"<="}]};sol=[interval(a,b,True,True)]
 else:
  a,b=r,r+2;p={"domain":"inequality","parts":[{"numerator":[t(-a),"1"],"denominator":[t(-b),"1"],"relation":">"}]};sol=[interval(None,a),interval(b,None)]
 w={"kind":"solution-set","intervals":sol}
 if i<70:add(f"ineq-{i}","inequality",p,[w])
 elif i<85:
  bad=json.loads(json.dumps(w));bad["intervals"][0]["includeMin"]=not bad["intervals"][0]["includeMin"];add(f"ineq-{i}","inequality",p,[bad],"invalid",0)
 elif i<95:add(f"ineq-{i}","inequality",p,[],"incomplete")
 else:add(f"ineq-{i}","inequality",{"domain":"inequality","parts":[{"numerator":["1","0","0","1"],"relation":">"}]},[{"kind":"solution-set","intervals":[]}],"unsupported")
for i in range(100):
 r1=i%11-5;r2=(i*3)%13-6;a=i%3+1;b=-a*(r1+r2);c=a*r1*r2;p={"domain":"quadratic","a":t(a),"b":t(b),"c":t(c)};roots=sorted(set((r1,r2)))
 if i<20:w={"kind":"roots","values":[t(x) for x in roots]}
 elif i<40:w={"kind":"factors","scale":t(a),"roots":[t(x) for x in roots]}
 elif i<55:w={"kind":"quadratic-formula","a":t(a),"b":t(b),"c":t(c)}
 elif i<70:
  h=Fraction(b,2*a);rhs=h*h-Fraction(c,a);w={"kind":"completed-square","shift":t(h),"rhs":t(rhs)}
 elif i<85:w={"kind":"roots","values":[t(x) for x in roots+[99]]}
 elif i<95:add(f"quad-{i}","quadratic",p,[],"incomplete");continue
 else:p={"domain":"quadratic","a":"1","b":"0","c":"-2"};w={"kind":"roots","values":["(0-sqrt(8))/(2)","(0+sqrt(8))/(2)"]};add(f"quad-{i}","quadratic",p,[w]);continue
 add(f"quad-{i}","quadratic",p,[w],"invalid" if i>=70 else "verified",0 if i>=70 else None)
for i in range(100):
 mode=i%5;x=i%9-4
 if mode==0:p={"domain":"function","task":"evaluate","f":{"kind":"polynomial","coefficients":["2","3","1"]},"input":t(x)};w={"kind":"value","value":t(x*x+3*x+2)}
 elif mode==1:p={"domain":"function","task":"compose","f":{"kind":"polynomial","coefficients":["1","2"]},"g":{"kind":"polynomial","coefficients":["-1","1"]},"input":t(x)};w={"kind":"value","value":t(2*x-1)}
 elif mode==2:p={"domain":"function","task":"domain","f":{"kind":"rational","numerator":["1"],"denominator":[t(-x),"1"]}};w={"kind":"domain","excluded":[t(x)]}
 elif mode==3:p={"domain":"function","task":"preimage","f":{"kind":"polynomial","coefficients":["0","0","1"]},"output":t(x*x)};w={"kind":"preimages","values":sorted(set((t(x),t(-x))),key=Fraction)}
 else:p={"domain":"function","task":"evaluate","f":{"kind":"piecewise","pieces":[{"min":None,"max":"0","includeMin":False,"includeMax":False,"expression":{"kind":"polynomial","coefficients":["0","-1"]}},{"min":"0","max":None,"includeMin":True,"includeMax":False,"expression":{"kind":"polynomial","coefficients":["0","1"]}}]},"input":t(x)};w={"kind":"value","value":t(abs(x))}
 if i<75:add(f"fn-{i}","function",p,[w])
 elif i<90:
  bad=json.loads(json.dumps(w))
  if "value" in bad:bad["value"]="999"
  elif "values" in bad:bad["values"].append("999")
  else:bad["excluded"].append("999")
  add(f"fn-{i}","function",p,[bad],"invalid",0)
 elif i<95:add(f"fn-{i}","function",p,[],"incomplete")
 else:add(f"fn-{i}","function",{"domain":"function","task":"preimage","f":{"kind":"rational","numerator":["1","1"],"denominator":["2","1"]},"output":"2"},[{"kind":"preimages","values":["-3"]}])
for i in range(100):
 mode=i%7;x1=i%7-3;y1=(i*2)%9-4;x2=x1+2;y2=y1+4
 if mode==0:p={"domain":"coordinate","task":"distance","points":[{"x":t(x1),"y":t(y1)},{"x":t(x2),"y":t(y2)}]};w={"kind":"value","value":"sqrt(20)"}
 elif mode==1:p={"domain":"coordinate","task":"midpoint","points":[{"x":t(x1),"y":t(y1)},{"x":t(x2),"y":t(y2)}]};w={"kind":"point","point":{"x":t(Fraction(x1+x2,2)),"y":t(Fraction(y1+y2,2))}}
 elif mode==2:p={"domain":"coordinate","task":"slope","points":[{"x":t(x1),"y":t(y1)},{"x":t(x2),"y":t(y2)}]};w={"kind":"slope","value":"2"}
 elif mode==3:p={"domain":"coordinate","task":"line","points":[{"x":t(x1),"y":t(y1)},{"x":t(x2),"y":t(y2)}]};w={"kind":"line","line":{"a":"-4","b":"2","c":t(4*x1-2*y1)}}
 elif mode==4:p={"domain":"coordinate","task":"intersection","lines":[{"a":"1","b":"0","c":t(-x1)},{"a":"0","b":"1","c":t(-y1)}]};w={"kind":"point","point":{"x":t(x1),"y":t(y1)}}
 elif mode==5:p={"domain":"coordinate","task":"relationship","lines":[{"a":"1","b":"-1","c":"0"},{"a":"1","b":"1","c":"0"}]};w={"kind":"relationship","value":"perpendicular"}
 else:p={"domain":"coordinate","task":"circle","circle":{"center":{"x":"0","y":"0"},"r2":"25"},"point":{"x":"3","y":"4"}};w={"kind":"circle-result","value":"on"}
 if i<80:add(f"coord-{i}","coordinate",p,[w])
 elif i<95:
  bad=json.loads(json.dumps(w));bad={"kind":"value","value":"999"} if bad["kind"]!="value" else {"kind":"value","value":"999"};add(f"coord-{i}","coordinate",p,[bad],"invalid",0)
 else:add(f"coord-{i}","coordinate",p,[],"incomplete")
assert len(cases)==400
out=Path(__file__).with_name("independent-cases.v1.json");out.write_text(json.dumps({"version":"math-domains-m1-corpus@1","cases":cases},indent=2)+"\n");print(out,len(cases))
