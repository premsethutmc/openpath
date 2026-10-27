from __future__ import annotations
import json, time, unittest
from collections import Counter
from pathlib import Path
from geometry_reasoner import Fact, GeometryObject, GeometryProblem, SubmittedProofStep, SyntheticReasoner, verify_geometry_step, verify_submitted_proof
from geometry_reasoner.synthetic import TheoremRule
from geometry_reasoner.assessment_contract import MathematicalStatement, MathematicalVerification, StepEvidence

ROOT=Path(__file__).parents[1]
def f(x): return Fact(x["predicate"],tuple(x["args"]),x.get("value"))

class CompleteProofCorpusTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls): cls.rows=json.loads((ROOT/"benchmark/student_complete_proofs_v1.json").read_text())["cases"]

    def test_independent_complete_proof_labels(self):
        self.assertEqual(len(self.rows),90)
        first_correct=final_correct=0; labels=Counter()
        for row in self.rows:
            objects={x["id"]:GeometryObject.make(x["id"],x["kind"],**x.get("data",{})) for x in row["objects"]}
            p=GeometryProblem(row["id"],objects,[f(x) for x in row["facts"]],set(row["conditions"]),f(row["goal"]))
            steps=[SubmittedProofStep(x["id"],f(x["statement"]),tuple(x.get("cited_step_ids",())),x.get("cited_theorem")) for x in row["steps"]]
            a=verify_submitted_proof(p,steps); e=row["expected"]
            first_correct += a.first_invalid_step==e["first_invalid_step"]
            final_correct += (a.valid,a.complete)==(e["valid"],e["complete"])
            labels[row["category"]]+=1
        self.assertEqual(first_correct,90); self.assertEqual(final_correct,90)
        self.assertEqual(set(labels.values()),{10})

    def test_dependency_graph_is_preserved(self):
        row=next(x for x in self.rows if x["category"]=="redundant-valid")
        objects={x["id"]:GeometryObject.make(x["id"],x["kind"],**x.get("data",{})) for x in row["objects"]}
        p=GeometryProblem(row["id"],objects,[f(x) for x in row["facts"]],set(),f(row["goal"]))
        steps=[SubmittedProofStep(x["id"],f(x["statement"]),tuple(x.get("cited_step_ids",())),x.get("cited_theorem")) for x in row["steps"]]
        self.assertEqual(verify_submitted_proof(p,steps).dependency_graph,(("s1",()),("s2",("s1",)),("s3",("s2",))))

    def test_irrelevant_citation_is_rejected(self):
        p=GeometryProblem("irrelevant",{},[Fact("vertical_pair",("a","b")),Fact("angle_measure",("x",),30)],goal=Fact("equal_angle",("a","b")))
        steps=(SubmittedProofStep("s1",Fact("angle_measure",("x",),30)),SubmittedProofStep("s2",Fact("equal_angle",("a","b")),("s1",),"vertical-opposite"))
        a=verify_submitted_proof(p,steps)
        self.assertEqual(a.first_invalid_step,1); self.assertFalse(a.valid)

class ReliabilityTests(unittest.TestCase):
    def test_malformed_relation_fails_closed(self):
        p=GeometryProblem("malformed",{},[Fact("linear_pair",("only-one",))])
        r=verify_geometry_step(p,[],Fact("angle_measure",("x",),90))
        self.assertEqual(r.verdict,"unsupported"); self.assertIn("Malformed",r.explanation)

    def test_repeated_facts_are_deterministic(self):
        facts=[Fact("vertical_pair",("a","b"))]*10
        p=GeometryProblem("repeat",{},facts)
        results=[verify_geometry_step(p,[],Fact("equal_angle",("a","b"))) for _ in range(20)]
        self.assertEqual({(x.verdict,x.theorem,x.proof_dependencies) for x in results},{("verified","vertical-opposite",(Fact("vertical_pair",("a","b")).key,))})

    def test_large_graph_terminates_deterministically(self):
        facts=[Fact("vertical_pair",(f"a{i}",f"b{i}")) for i in range(2000)]
        p=GeometryProblem("large",{},facts); start=time.perf_counter()
        r1=verify_geometry_step(p,[],Fact("equal_angle",("a1999","b1999")),synthetic=SyntheticReasoner(max_rule_applications=1000))
        r2=verify_geometry_step(p,[],Fact("equal_angle",("a1999","b1999")),synthetic=SyntheticReasoner(max_rule_applications=1000))
        self.assertEqual((r1.verdict,r1.resource_limit_reached),("unsupported",True)); self.assertEqual(r1,r2); self.assertLess(time.perf_counter()-start,2)

    def test_deep_chain_obeys_round_limit(self):
        def extend(state):
            for item in state.all("chain"):
                n=int(item.args[0])
                if n<100: yield Fact("chain",(str(n+1),)),(item,),()
        rule=TheoremRule("chain","test chain",("chain",),(),("chain",),"bounded test",extend)
        p=GeometryProblem("deep",{},[Fact("chain",("0",))])
        r=verify_geometry_step(p,[],Fact("chain",("100",)),synthetic=SyntheticReasoner((rule,),max_rounds=5,max_rule_applications=10000))
        self.assertEqual(r.verdict,"unsupported"); self.assertTrue(r.resource_limit_reached)

class AssessmentContractTests(unittest.TestCase):
    def test_contract_represents_all_reasoning_outcomes_and_skill_evidence(self):
        statement=MathematicalStatement("openpath-math-statement@1","geometry","equal_angle",("A","B"))
        for verdict in ("verified","invalid","missing_assumption","unsupported"):
            verification=MathematicalVerification(verdict,"rule" if verdict=="verified" else None,(statement,),(),"reason","geometry@3",("given:1",),("parallel:l:m",) if verdict=="missing_assumption" else (),"universal" if verdict=="verified" else "none",False,"complete" if verdict=="verified" else "incomplete",None if verdict=="verified" else 0)
            evidence=StepEvidence("learner","session","item",("geometry.parallel-lines",),statement,verification,"typed",(),True,2,("geometry.angles",))
            self.assertEqual(evidence.verification.verdict,verdict)
            self.assertEqual(evidence.competency_ids,("geometry.parallel-lines",))
        incomplete=MathematicalVerification("verified","triangle-sum",(statement,),(),"valid step","geometry@3",(),("goal:not-reached",),"universal",False,"incomplete",None)
        self.assertEqual(incomplete.proof_status,"incomplete"); self.assertTrue(incomplete.unresolved_obligations)

if __name__=="__main__": unittest.main()
