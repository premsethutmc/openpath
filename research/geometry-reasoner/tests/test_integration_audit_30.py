from __future__ import annotations
import json,unittest
from collections import Counter
from pathlib import Path
from geometry_reasoner import AlgebraicVerifier,ConstructionRequest,ConstructionVerifier,Fact,GeometryObject,GeometryProblem,SubmittedProofStep,verify_submitted_proof

ROOT=Path(__file__).parents[1]
def O(i,k,**d):return GeometryObject.make(i,k,**d)
def P(i,x,y):return O(i,"point",x=x,y=y)
def proof(problem,statements):
    steps=[SubmittedProofStep(f"s{i+1}",s) for i,s in enumerate(statements)];a=verify_submitted_proof(problem,steps)
    if a.valid and a.complete:return "verified",a.first_invalid_step
    if a.valid:return "incomplete",a.first_invalid_step
    return a.steps[a.first_invalid_step or 0].verdict,a.first_invalid_step
def triangles(prefix="T"):
    angles=tuple(prefix+x for x in "ABC");sides=tuple(prefix+x for x in ("AB","BC","CA"));return O(prefix,"triangle",angles=angles,sides=sides),angles,sides

def evaluate():
    out={}
    t,a,s=triangles(); base=GeometryProblem("tri",{t.id:t},[Fact("angle_measure",(a[0],),50),Fact("angle_measure",(a[1],),60)],{f"nondegenerate:{t.id}"},Fact("angle_measure",(a[2],),70))
    out["tri-sum"]=proof(base,[base.goal]);out["tri-wrong"]=proof(base,[Fact("angle_measure",(a[2],),80),base.goal]);out["tri-incomplete"]=proof(base,[base.facts[0]])
    deg=GeometryProblem("deg",{t.id:t},base.facts,set(),base.goal);out["tri-degenerate"]=proof(deg,[deg.goal])
    l,la,ls=triangles("L");r,ra,rs=triangles("R");objs={l.id:l,r.id:r};conds={"nondegenerate:L","nondegenerate:R"};goal=Fact("congruent",("L","R"))
    sss=[Fact("equal_length",(ls[i],rs[i])) for i in range(3)];out["cong-sss"]=proof(GeometryProblem("sss",objs,sss,conds,goal),[goal])
    sas=[Fact("equal_length",(ls[0],rs[0])),Fact("equal_length",(ls[2],rs[2])),Fact("equal_angle",(la[0],ra[0]))];out["cong-sas"]=proof(GeometryProblem("sas",objs,sas,conds,goal),[goal])
    out["cong-missing"]=proof(GeometryProblem("cm",objs,sss[:2],conds,goal),[goal]);out["cong-contradicted"]=proof(GeometryProblem("cx",objs,[Fact("not_congruent",("L","R"))],conds,goal),[goal])
    sim=Fact("similar",("L","R"));aa=[Fact("equal_angle",(la[0],ra[0])),Fact("equal_angle",(la[1],ra[1]))]
    out["sim-aa"]=proof(GeometryProblem("aa",objs,aa,conds,sim),[sim]);out["sim-missing"]=proof(GeometryProblem("am",objs,aa[:1],conds,sim),[sim]);out["sim-contradicted"]=proof(GeometryProblem("ax",objs,[Fact("not_similar",("L","R"))],conds,sim),[sim]);out["sim-incomplete"]=proof(GeometryProblem("ai",objs,aa,conds,sim),[aa[0]])
    for name,rel in (("parallel-corresponding","corresponding_pair"),("parallel-alternate","alternate_pair")):
        facts=[Fact("parallel",("l","m")),Fact(rel,("x","y","l","m"))];g=Fact("equal_angle",("x","y"));out[name]=proof(GeometryProblem(name,{},facts,goal=g),[g])
    g=Fact("equal_angle",("x","y"));out["parallel-missing"]=proof(GeometryProblem("pm",{},[Fact("corresponding_pair",("x","y","l","m"))],goal=g),[g])
    out["parallel-wrong"]=proof(GeometryProblem("pw",{},[Fact("angle_measure",("x",),40),Fact("angle_measure",("y",),50)],goal=g),[g])
    c=O("c","circle");cg=Fact("angle_measure",("i",),40);cp=GeometryProblem("cc",{"c":c},[Fact("central_inscribed_pair",("o","i","c")),Fact("angle_measure",("o",),80)],{"nondegenerate:c"},cg);out["circle-centre"]=proof(cp,[cg])
    sg=Fact("equal_angle",("i","j"));out["circle-segment"]=proof(GeometryProblem("cs",{"c":c},[Fact("same_segment_pair",("i","j","c"))],{"nondegenerate:c"},sg),[sg]);out["circle-degenerate"]=proof(GeometryProblem("cd",{"c":c},[Fact("same_segment_pair",("i","j","c"))],goal=sg),[sg]);out["circle-wrong"]=proof(GeometryProblem("cw",{"c":c},cp.facts,{"nondegenerate:c"},Fact("angle_measure",("i",),30)),[Fact("angle_measure",("i",),30)])
    q=O("q","polygon",sides=("a","b","c","d"),angles=("A","B","C","D"));qg=Fact("equal_length",("a","c"));out["quad-parallelogram"]=proof(GeometryProblem("qp",{"q":q},[Fact("parallelogram",("q",))],{"nondegenerate:q"},qg),[qg]);out["quad-degenerate"]=proof(GeometryProblem("qd",{"q":q},[Fact("parallelogram",("q",))],goal=qg),[qg]);out["quad-wrong"]=proof(GeometryProblem("qw",{"q":q},[Fact("angle_measure",("A",),80),Fact("angle_measure",("C",),100)],goal=Fact("equal_angle",("A","C"))),[Fact("equal_angle",("A","C"))])
    pts={"O":P("O",0,0),"A":P("A",-2,0),"B":P("B",2,0),"N":P("N",0,2),"S":P("S",0,-2),"Q":P("Q",1,1)};co={**pts,"h":O("h","line",points=("A","B")),"v":O("v","line",points=("N","S")),"c":O("c","circle",center="O",radius_squared=4)};gp=GeometryProblem("construct",co,[]);cv=ConstructionVerifier()
    out["construct-lines"]=(cv.verify(gp,ConstructionRequest("line_line_intersection",("h","v"),("O",))).verdict,None);out["construct-line-circle"]=(cv.verify(gp,ConstructionRequest("line_circle_intersection",("v","c"),("N","S"))).verdict,None);out["construct-ambiguous"]=(cv.verify(gp,ConstructionRequest("line_line_intersection",("h","h"),("O",))).verdict,None);out["construct-bad-midpoint"]=(cv.verify(gp,ConstructionRequest("midpoint",("A","B"),("Q",))).verdict,None)
    av=AlgebraicVerifier();out["coordinate-midpoint"]=(av.verify(gp,Fact("midpoint",("O","A","B"))).verdict,None);out["coordinate-parallel"]=(av.verify(gp,Fact("parallel",("h","v"))).verdict,None)
    bad=GeometryProblem("bad",{"A":P("A",0,0),"AA":O("AA","line",points=("A","A")),"h":co["h"]},[]);out["coordinate-degenerate"]=(av.verify(bad,Fact("parallel",("AA","h"))).verdict,None)
    return out

class IndependentThirtyProblemAudit(unittest.TestCase):
    def test_independent_expected_results(self):
        data=json.loads((ROOT/"benchmark/integration_audit_30_expected.json").read_text());self.assertEqual(len(data["cases"]),30);actual=evaluate();self.assertEqual(set(actual),{x["id"] for x in data["cases"]})
        false_accept=false_reject=unsupported=first=0
        for case in data["cases"]:
            got,idx=actual[case["id"]];want=case["expected"];unsupported+=got in {"unsupported","missing_assumption"};false_accept+=got=="verified" and want!="verified";false_reject+=got!="verified" and want=="verified";first+=idx==case["first_invalid"]
            self.assertEqual((got,idx),(want,case["first_invalid"]),case["id"])
        self.assertEqual((false_accept,false_reject),(0,0));self.assertEqual(first,30);self.assertGreater(unsupported,0)

if __name__=="__main__":unittest.main()
