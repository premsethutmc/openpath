"""Create the independently labelled complete-proof corpus.

Expected labels are authored per proof pattern from stated school theorems; they are not
obtained from the reasoner under test.
"""
from __future__ import annotations
import json
from pathlib import Path

def fact(p,*a,value=None): return {"predicate":p,"args":list(a),**({"value":value} if value is not None else {})}
def obj(i,k,**d): return {"id":i,"kind":k,"data":d}
cases=[]
def add(category,objects,facts,conditions,goal,steps,valid,complete,first,oracle):
    cases.append({"id":f"proof-{len(cases)+1:03d}","category":category,"objects":objects,"facts":facts,"conditions":conditions,"goal":goal,"steps":steps,
                  "expected":{"valid":valid,"complete":complete,"first_invalid_step":first},"oracle":oracle})
def step(i,statement,cites=(),theorem=None): return {"id":i,"statement":statement,"cited_step_ids":list(cites),**({"cited_theorem":theorem} if theorem else {})}

for i in range(10):
    a,b=f"v{i}a",f"v{i}b"; goal=fact("equal_angle",a,b)
    add("correct-proof",[obj(a,"angle"),obj(b,"angle")],[fact("vertical_pair",a,b)],[],goal,[step("s1",goal,theorem="vertical-opposite")],True,True,None,"Explicit vertical-pair construction entails equal angles.")
for i in range(10):
    # Alternating SSS and SAS provides distinct valid theorem sequences for the same proof obligation.
    ts=[]
    for q in "LR":
        sides=[f"{q}{i}{x}" for x in ("AB","BC","CA")]; angles=[f"{q}{i}{x}" for x in "ABC"]
        ts.append((f"{q}{i}T",sides,angles))
    objects=[obj(t,"triangle",sides=s,angles=a) for t,s,a in ts]; conditions=[f"nondegenerate:{ts[0][0]}",f"nondegenerate:{ts[1][0]}"]
    if i%2==0: facts=[fact("equal_length",ts[0][1][j],ts[1][1][j]) for j in range(3)]; theorem="triangle-congruence"
    else: facts=[fact("equal_length",ts[0][1][0],ts[1][1][0]),fact("equal_length",ts[0][1][2],ts[1][1][2]),fact("equal_angle",ts[0][2][0],ts[1][2][0])]; theorem="triangle-congruence"
    goal=fact("congruent",ts[0][0],ts[1][0])
    add("alternative-valid-route",objects,facts,conditions,goal,[step("s1",goal,theorem=theorem)],True,True,None,"Independent SSS or SAS criterion with ordered correspondence.")
for i in range(10):
    a=f"bad{i}"; goal=fact("angle_measure",a,value=50)
    add("incorrect-intermediate",[obj(a,"angle")],[goal],[],goal,[step("s1",fact("angle_measure",a,value=70)),step("s2",goal)],False,False,0,"First assertion contradicts the given 50 degree measure; later repetition cannot repair it.")
for i in range(10):
    a,b,l,m=f"ma{i}",f"mb{i}",f"l{i}",f"m{i}"; goal=fact("equal_angle",a,b)
    add("missing-assumption",[obj(a,"angle"),obj(b,"angle"),obj(l,"line"),obj(m,"line")],[fact("corresponding_pair",a,b,l,m)],[],goal,[step("s1",goal)],False,False,0,"Corresponding position needs parallel lines.")
for i in range(10):
    a,b=f"ca{i}",f"cb{i}"; goal=fact("equal_angle",a,b)
    add("circular-proof",[obj(a,"angle"),obj(b,"angle")],[fact("vertical_pair",a,b)],[],goal,[step("s1",goal,("s2",)),step("s2",goal,("s1",))],False,False,0,"The first step cites a future step, creating a cycle/forward dependency.")
for i in range(10):
    a,b=f"ra{i}",f"rb{i}"; given=fact("vertical_pair",a,b); goal=fact("equal_angle",a,b)
    add("redundant-valid",[obj(a,"angle"),obj(b,"angle")],[given],[],goal,[step("s1",given),step("s2",given,("s1",)),step("s3",goal,("s2",),"vertical-opposite")],True,True,None,"Repeated givens are redundant but true; vertical-angle conclusion remains valid.")
for i in range(10):
    t=f"it{i}"; angles=[f"i{i}{x}" for x in "ABC"]; given=fact("angle_measure",angles[0],value=50); goal=fact("angle_measure",angles[2],value=70)
    add("incomplete-proof",[obj(t,"triangle",angles=angles)],[given,fact("angle_measure",angles[1],value=60)],[f"nondegenerate:{t}"],goal,[step("s1",given)],True,False,None,"The submitted statement is true but the goal is absent.")
for i in range(10):
    t=f"dt{i}"; angles=[f"d{i}{x}" for x in "ABC"]; goal=fact("angle_measure",angles[2],value=60)
    add("degenerate-configuration",[obj(t,"triangle",angles=angles)],[fact("angle_measure",angles[0],value=60),fact("angle_measure",angles[1],value=60)],[],goal,[step("s1",goal)],False,False,0,"Triangle angle sum cannot apply without nondegeneracy.")
for i in range(10):
    points=[obj(f"u{i}{x}","point") for x in "ABCD"]; goal=fact("concyclic",*[x["id"] for x in points])
    add("unsupported-theorem",points,[],[],goal,[step("s1",goal,theorem="converse-opposite-angles")],False,False,0,"No supported construction or theorem establishes concyclicity.")

assert len(cases)==90
Path(__file__).with_name("student_complete_proofs_v1.json").write_text(json.dumps({"version":"student-complete-proofs@1","cases":cases},indent=2)+"\n")
print(f"wrote {len(cases)} independently labelled proof sequences")
