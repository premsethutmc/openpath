"""Generate 200 independently labelled U1 cases from explicit arithmetic/theorem oracles."""
from __future__ import annotations
import json
from pathlib import Path
cases=[]
def add(i,domain,problem,working,expected,first=None,options=None):cases.append({"id":f"u1-{domain}-{i:02d}","domain":domain,"problem":problem,"working":working,"options":options or {},"expected":{"classification":expected,"firstInvalidStep":first},"oracle":"authored formula/theorem expectation; not engine output"})
for i in range(50):
    a,b,c=2+i%11,3+(i*2)%9,2+(i*3)%7;statement=f"{a}+{b}*{c}";answer=a+b*c
    if i<30:add(i,"arithmetic",{"domain":"arithmetic","statement":statement},[str(answer)],"verified")
    elif i<40:add(i,"arithmetic",{"domain":"arithmetic","statement":statement},[str(answer+1)],"invalid",0)
    elif i<45:add(i,"arithmetic",{"domain":"arithmetic","statement":statement},[],"incomplete")
    elif i<48:add(i,"arithmetic",{"domain":"arithmetic","statement":"sin(2)"},["2"],"unsupported")
    else:add(i,"arithmetic",{"domain":"arithmetic","statement":statement},None,"malformed")
for i in range(50):
    a=2+i%13;b=a+5+(i%9);problem={"domain":"algebra","statement":f"x+{a}={b}"};solution=b-a
    if i<25:add(i,"algebra",problem,[f"x={b}-{a}",f"x={solution}"],"verified")
    elif i<35:add(i,"algebra",problem,[f"x+{a-a}={b-a}",f"x={solution}"],"verified")
    elif i<43:add(i,"algebra",problem,[f"x={solution+1}"],"invalid",0)
    elif i<46:add(i,"algebra",problem,[],"incomplete")
    elif i<48:add(i,"algebra",{"domain":"algebra","statement":"sin(x)=0"},["x=0"],"unsupported")
    else:add(i,"algebra",problem,None,"malformed")
def geometry(i,condition=True,contradict=False,unsupported=False):
    x=25+i%50;y=35+(i*3)%40
    if x+y>=170:y=30
    facts=[{"predicate":"angle_measure","args":["A"],"value":x},{"predicate":"angle_measure","args":["B"],"value":y}]
    if contradict:facts.append({"predicate":"angle_measure","args":["A"],"value":x+1})
    goal={"predicate":"concyclic","args":["A","B","C","D"]} if unsupported else {"predicate":"angle_measure","args":["C"],"value":180-x-y}
    return {"domain":"geometry","problem":{"id":f"g{i}","objects":[{"id":"T","kind":"triangle","data":{"angles":["A","B","C"],"sides":["AB","BC","CA"]}}],"facts":facts,"conditions":["nondegenerate:T"] if condition else [],"goal":goal,"skill":"geometry.triangle-angle-sum"}},goal,x,y
for i in range(50):
    p,g,x,y=geometry(i,condition=not(33<=i<38),contradict=38<=i<42,unsupported=42<=i<46)
    step={"id":"s1","statement":g,"cited_theorem":"triangle-sum"}
    if i<20:add(i,"geometry",p,{"steps":[step]},"verified")
    elif i<28:
        wrong={**g,"value":g["value"]+1};add(i,"geometry",p,{"steps":[{"id":"s1","statement":wrong},{"id":"s2","statement":g}]},"invalid",0)
    elif i<33:add(i,"geometry",p,{"steps":[{"id":"s1","statement":p["problem"]["facts"][0]}]},"incomplete")
    elif i<38:add(i,"geometry",p,{"steps":[step]},"missing-assumption",0)
    elif i<42:add(i,"geometry",p,{"steps":[step]},"contradictory",0)
    elif i<46:add(i,"geometry",p,{"steps":[{"id":"s1","statement":g}]},"unsupported",0)
    else:add(i,"geometry",p,{"steps":[step]},"resource-exhausted",0,{"maxRuleApplications":0})
for i in range(50):
    missing=38<=i<42;contradict=42<=i<45;unsupported=45<=i<48
    gp,g,x,y=geometry(100+i,condition=not missing,contradict=contradict,unsupported=unsupported);answer=180-x-y
    problem={"domain":"mixed","geometry":gp,"handoff":{"kind":"triangle-angle-sum","unknown":"C","total":180,"knownAngles":[x,y]}}
    geo={"steps":[{"id":"s1","statement":g,"cited_theorem":"triangle-sum"}]}
    if i<20:add(i,"mixed",problem,{"geometry":geo,"calculation":[f"x=180-{x}-{y}",f"x={answer}"]},"verified")
    elif i<30:add(i,"mixed",problem,{"geometry":geo,"calculation":[f"x+{x+y}=180",f"x={answer}"]},"verified")
    elif i<38:add(i,"mixed",problem,{"geometry":geo,"calculation":[f"x=180-{x}-{y}",f"x={answer+1}"]},"invalid",2)
    elif i<42:add(i,"mixed",problem,{"geometry":geo,"calculation":[f"x={answer}"]},"missing-assumption",0)
    elif i<45:add(i,"mixed",problem,{"geometry":geo,"calculation":[f"x={answer}"]},"contradictory",0)
    elif i<48:add(i,"mixed",problem,{"geometry":geo,"calculation":[f"x={answer}"]},"unsupported",0)
    else:add(i,"mixed",problem,{"geometry":geo,"calculation":[f"x={answer}"]},"resource-exhausted",0,{"maxRuleApplications":0})
assert len(cases)==200
out=Path(__file__).with_name("independent-cases.v1.json");out.write_text(json.dumps({"version":"unified-math-independent@1","cases":cases},indent=2)+"\n");print(out,len(cases))
