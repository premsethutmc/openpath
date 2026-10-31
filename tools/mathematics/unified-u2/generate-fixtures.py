"""Independently authored U2 transfer cases; labels are formula/theorem expectations."""
from __future__ import annotations
import json
from pathlib import Path
C="openpath-mathematical-obligation@2"
def k(v):return {"kind":"constant","value":v}
def s(v):return {"kind":"symbol","name":v}
def add(*v):return {"kind":"add","terms":list(v)}
def mul(*v):return {"kind":"multiply","terms":list(v)}
def nz(v):return {"kind":"nonzero","expression":v}
def pos(v):return {"kind":"positive","expression":v}
def obligation(i,statement,restrictions=(),assumptions=()):return {"contractVersion":C,"id":f"o{i}","statement":statement,"originatingReasoner":"geometry:synthetic","sourceProofStepIds":["s1"],"dependencyReferences":[],"assumptions":list(assumptions),"domainRestrictions":list(restrictions),"status":"verified","dischargeEvidence":[]}
def fact(predicate,args,value=None):
 d={"predicate":predicate,"args":args}
 if value is not None:d["value"]=value
 return d
def problem(pid,objects,facts,conditions,goal,skill):return {"domain":"geometry","problem":{"id":pid,"objects":objects,"facts":facts,"conditions":conditions,"goal":goal,"skill":skill}}
def tri(t,angles=("A","B","C"),sides=("AB","BC","CA"),hyp=None):
 d={"angles":list(angles),"sides":list(sides)}
 if hyp:d["hypotenuse"]=hyp
 return {"id":t,"kind":"triangle","data":d}
cases=[]
def emit(cid,category,p,transfer,calc,expected="verified",first=None,opts=None,selection=None):
 w={"geometry":{"steps":[{"id":"s1","statement":p["problem"]["goal"]}]},"calculation":calc}
 if selection:w["domainConclusion"]=selection
 cases.append({"id":cid,"category":category,"problem":{"domain":"mixed","geometry":p,"transfer":transfer},"working":w,"options":opts or {},"expected":{"classification":expected,"firstInvalidStep":first},"oracle":"independent theorem precondition and exact arithmetic"})
def variant(index,base_calc,answer):
 if index<24:return base_calc,"verified",None
 if index<30:return [*base_calc[:-1],base_calc[-1].replace(str(answer),str(answer+1))],"invalid",2
 if index<34:return base_calc,"missing-assumption",0
 if index<37:return base_calc,"invalid",0
 return base_calc,"incomplete",None
for i in range(40):
 b=35+i%25;c=25+(i*3)%30;a=180-b-c;goal=fact("angle_measure",["A"],a);conds=[] if 30<=i<34 else ["nondegenerate:T"]
 p=problem(f"angle{i}",[tri("T")],[fact("angle_measure",["B"],b),fact("angle_measure",["C"],c)],conds,goal,"geometry.triangle-angle-sum")
 tr={"family":"triangle-angle-sum","geometryConclusion":goal,"bindings":[{"geometryId":"A","quantity":"angle-degrees","expression":s("x")},{"geometryId":"B","quantity":"angle-degrees","expression":k(b)},{"geometryId":"C","quantity":"angle-degrees","expression":k(c)}],"obligation":obligation(f"angle{i}",{"kind":"equality","left":add(s("x"),k(b),k(c)),"right":k(180)})}
 calc,exp,first=variant(i,[f"x=180-{b}-{c}",f"x={a}"],a)
 emit(f"u2-angle-{i:02}","triangle-angle",p,tr,calc,exp,first)
 if 34<=i<37:cases[-1]["working"]["geometry"]["steps"][0]["cited_theorem"]="parallel-alternate"
 if i>=37:cases[-1]["working"]["geometry"]["steps"]=[{"id":"s1","statement":p["problem"]["facts"][0]}]
for i in range(40):
 q=5+i%12;goal=fact("equal_angle",["B","C"]);conds=[] if 30<=i<34 else ["nondegenerate:T"]
 p=problem(f"iso{i}",[tri("T")],[fact("equal_length",["AB","CA"])],conds,goal,"geometry.isosceles")
 left=add(s("x"),k(q));right=mul(k(2),s("x"));tr={"family":"isosceles-angle","geometryConclusion":goal,"bindings":[{"geometryId":"B","quantity":"angle-degrees","expression":left},{"geometryId":"C","quantity":"angle-degrees","expression":right}],"obligation":obligation(f"iso{i}",{"kind":"equality","left":left,"right":right})}
 calc,exp,first=variant(i,[f"x+{q}=2*x",f"x={q}"],q);emit(f"u2-iso-{i:02}","isosceles",p,tr,calc,exp,first)
 if 34<=i<37:cases[-1]["working"]["geometry"]["steps"][0]["cited_theorem"]="triangle-sum"
 if i>=37:cases[-1]["working"]["geometry"]["steps"]=[{"id":"s1","statement":p["problem"]["facts"][0]}]
for i in range(40):
 scale=2+i%4;den=3+i%5;rightnum=scale*(2+i%6);rightden=scale*den;ans=rightnum*den//rightden;goal=fact("similar",["T1","T2"]);conds=[] if 30<=i<34 else ["nondegenerate:T1","nondegenerate:T2"]
 p=problem(f"sim{i}",[tri("T1",("A","B","C"),("AB","BC","CA")),tri("T2",("D","E","F"),("DE","EF","FD"))],[fact("equal_angle",["A","D"]),fact("equal_angle",["B","E"])],conds,goal,"geometry.similarity")
 bindings=[{"geometryId":"AB","quantity":"segment-length","expression":s("x")},{"geometryId":"BC","quantity":"segment-length","expression":k(den)},{"geometryId":"DE","quantity":"segment-length","expression":k(rightnum)},{"geometryId":"EF","quantity":"segment-length","expression":k(rightden)}]
 stmt={"kind":"proportion","leftNumerator":s("x"),"leftDenominator":k(den),"rightNumerator":k(rightnum),"rightDenominator":k(rightden)};tr={"family":"similar-triangle-proportion","geometryConclusion":goal,"bindings":bindings,"obligation":obligation(f"sim{i}",stmt,[nz(k(den)),nz(k(rightden))])}
 calc,exp,first=variant(i,[f"x/{den}={rightnum}/{rightden}",f"x={ans}"],ans);emit(f"u2-sim-{i:02}","similarity",p,tr,calc,exp,first)
 if 34<=i<37:cases[-1]["working"]["geometry"]["steps"][0]["cited_theorem"]="triangle-congruence"
 if i>=37:cases[-1]["working"]["geometry"]["steps"]=[{"id":"s1","statement":p["problem"]["facts"][0]}]
for i in range(40):
 triples=[(3,4,5),(5,12,13),(6,8,10),(8,15,17)];a,b,c=triples[i%4];goal=fact("length_squared",["b"],b*b);conds=[] if 30<=i<34 else ["nondegenerate:T"]
 p=problem(f"pyth{i}",[tri("T",("A","B","C"),("a","b","c"),"c")],[fact("right_triangle",["T"]),fact("length_squared",["a"],a*a),fact("length_squared",["c"],c*c)],conds,goal,"geometry.pythagorean")
 bindings=[{"geometryId":"a","quantity":"segment-length","expression":k(a)},{"geometryId":"b","quantity":"segment-length","expression":s("x")},{"geometryId":"c","quantity":"segment-length","expression":k(c)}];stmt={"kind":"pythagorean","legA":k(a),"legB":s("x"),"hypotenuse":k(c)};tr={"family":"pythagorean","geometryConclusion":goal,"bindings":bindings,"obligation":obligation(f"pyth{i}",stmt,[],[pos(s("x"))])}
 calc,exp,first=variant(i,[f"x^2={c*c}-{a*a}",f"x={b} or x=-{b}"],b);selection={"symbol":"x","value":b}
 emit(f"u2-pyth-{i:02}","pythagorean",p,tr,calc,exp,first,None,selection)
 if 24<=i<30:cases[-1]["working"]["domainConclusion"]={"symbol":"x","value":b+1};cases[-1]["expected"]["firstInvalidStep"]=2
 if 34<=i<37:cases[-1]["working"]["geometry"]["steps"][0]["cited_theorem"]="triangle-sum"
 if i>=37:cases[-1]["working"]["geometry"]["steps"]=[{"id":"s1","statement":p["problem"]["facts"][0]}]
for i in range(40):
 q=10+i%20;goal=fact("equal_angle",["P","Q"]);p=problem(f"par{i}",[],[fact("parallel",["l1","l2"]),fact("corresponding_pair",["P","Q","l1","l2"])],[],goal,"geometry.parallel-angles")
 left=add(mul(k(2),s("x")),k(q));right=add(s("x"),k(q+15));tr={"family":"parallel-angle","geometryConclusion":goal,"bindings":[{"geometryId":"P","quantity":"angle-degrees","expression":left},{"geometryId":"Q","quantity":"angle-degrees","expression":right}],"obligation":obligation(f"par{i}",{"kind":"equality","left":left,"right":right})}
 calc,exp,first=variant(i,[f"2*x+{q}=x+{q+15}","x=15"],15);emit(f"u2-par-{i:02}","parallel",p,tr,calc,exp,first)
 if 30<=i<34:cases[-1]["problem"]["geometry"]["problem"]["facts"]=cases[-1]["problem"]["geometry"]["problem"]["facts"][1:]
 if 34<=i<37:cases[-1]["working"]["geometry"]["steps"][0]["cited_theorem"]="vertical-opposite"
 if i>=37:cases[-1]["working"]["geometry"]["steps"]=[{"id":"s1","statement":p["problem"]["facts"][0]}]
# 50 adversarial variants of sound base cases.
for i in range(50):
 base=json.loads(json.dumps(cases[(i%5)*40+(i%20)]));base["id"]=f"u2-adversarial-{i:02d}";base["category"]="adversarial"
 if i<10:
  base["problem"]["transfer"]["obligation"]["dependencyReferences"]=[base["problem"]["transfer"]["obligation"]["id"]];base["expected"]={"classification":"malformed","firstInvalidStep":None}
 elif i<20:
  base["problem"]["transfer"]["geometryConclusion"]["predicate"]="unsupported_relation";base["expected"]={"classification":"malformed","firstInvalidStep":None}
 elif i<30:
  base["working"]["calculation"]=["x=999"];base["expected"]={"classification":"invalid","firstInvalidStep":1}
 elif i<40:
  base["options"]={"maxRuleApplications":0};base["expected"]={"classification":"resource-exhausted","firstInvalidStep":0}
 elif i<45:
  base["options"]={"geometryRoot":"/tmp/openpath-u2-missing-worker"};base["expected"]={"classification":"unsupported","firstInvalidStep":None}
 else:
  base["problem"]["transfer"]["obligation"]["sourceProofStepIds"]=["future-step"];base["expected"]={"classification":"malformed","firstInvalidStep":None}
 cases.append(base)
assert len(cases)==250
out=Path(__file__).with_name("independent-cases.v2.json");out.write_text(json.dumps({"version":"unified-math-independent@2","cases":cases},indent=2)+"\n");print(out,len(cases))
