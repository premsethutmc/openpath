from __future__ import annotations

import json
import time
import unittest
from collections import Counter, defaultdict
from pathlib import Path

from geometry_reasoner import AlgebraicVerifier, Fact, GeometryObject, GeometryProblem, SyntheticReasoner, verify_geometry_step, verify_student_proof

ROOT = Path(__file__).parents[1]

def rf(row, status="given"): return Fact(row["predicate"], tuple(row["args"]), row.get("value"), status)
def problem(row):
    objects={x["id"]:GeometryObject.make(x["id"],x["kind"],**x.get("data",{})) for x in row["objects"]}
    return GeometryProblem(row["id"],objects,[rf(x) for x in row["facts"]],set(row["conditions"]),rf(row["goal"]))

class IndependentAdversarialTests(unittest.TestCase):
    def test_inconsistent_premises_do_not_explode(self):
        p=GeometryProblem("inconsistent",{},[Fact("parallel",("l","m")),Fact("not_parallel",("l","m"))])
        result=verify_geometry_step(p,[],Fact("equal_length",("AB","CD")))
        self.assertEqual(result.verdict,"unsupported")
        self.assertIn("inconsistent",result.explanation)

    def test_degenerate_circle_and_polygon_do_not_fire(self):
        objects={"c":GeometryObject.make("c","circle"),"a":GeometryObject.make("a","angle"),"b":GeometryObject.make("b","angle"),"q":GeometryObject.make("q","polygon",angles=("a","b","x","y"))}
        p=GeometryProblem("degenerate",objects,[Fact("same_segment_pair",("a","b","c")),Fact("angle_measure",("a",),90),Fact("angle_measure",("b",),90),Fact("angle_measure",("x",),90)])
        self.assertEqual(verify_geometry_step(p,[],Fact("equal_angle",("a","b"))).verdict,"unsupported")
        self.assertEqual(verify_geometry_step(p,[],Fact("angle_measure",("y",),90)).verdict,"unsupported")

    def test_angle_orientation_is_not_lost(self):
        # Equal_angle is symmetric between angle objects, but an angle's ordered rays remain in its object.
        pts={n:GeometryObject.make(n,"point",x=x,y=y) for n,(x,y) in {"O":(0,0),"A":(1,0),"B":(0,1),"C":(-1,0)}.items()}
        objs={**pts,"a":GeometryObject.make("a","angle",points=("A","O","B")),"reflex":GeometryObject.make("reflex","angle",points=("B","O","C"))}
        r=AlgebraicVerifier().check(GeometryProblem("angle",objs,[]),Fact("equal_angle",("a","reflex")))
        self.assertEqual(r.classification,"verified_for_instance")

    def test_later_correct_step_does_not_repair_invalid_step(self):
        p=GeometryProblem("proof",{},[Fact("angle_measure",("a",),50)],goal=Fact("angle_measure",("a",),50))
        assessment=verify_student_proof(p,[Fact("angle_measure",("a",),70),Fact("angle_measure",("a",),50)])
        self.assertFalse(assessment.valid); self.assertFalse(assessment.complete); self.assertEqual(assessment.first_invalid_step,0)

    def test_exact_coordinate_instance_is_not_labeled_universal(self):
        objs={"A":GeometryObject.make("A","point",x=0,y=0),"B":GeometryObject.make("B","point",x=2,y=0),"M":GeometryObject.make("M","point",x=1,y=0)}
        r=AlgebraicVerifier().verify(GeometryProblem("m",objs,[]),Fact("midpoint",("M","A","B")))
        self.assertEqual(r.verdict,"verified"); self.assertEqual(r.verification_scope,"problem_instance")

    def test_exact_counterexample(self):
        objs={"A":GeometryObject.make("A","point",x=0,y=0),"B":GeometryObject.make("B","point",x=2,y=0),"M":GeometryObject.make("M","point",x=3,y=0)}
        self.assertEqual(AlgebraicVerifier().check(GeometryProblem("m",objs,[]),Fact("midpoint",("M","A","B"))).classification,"exact_counterexample")

    def test_resource_limit_fails_closed(self):
        facts=[Fact("vertical_pair",(f"a{i}",f"b{i}")) for i in range(20)]
        p=GeometryProblem("bounded",{},facts)
        r=verify_geometry_step(p,[],Fact("equal_angle",("a19","b19")),synthetic=SyntheticReasoner(max_rule_applications=3))
        self.assertEqual(r.verdict,"unsupported"); self.assertTrue(r.resource_limit_reached)

    def test_proof_dependency_graph_is_acyclic(self):
        p=GeometryProblem("deps",{},[Fact("vertical_pair",("a","b"))])
        state=SyntheticReasoner().close(p)
        self.assertTrue(state.proof_graph_acyclic())
        proof=state.proofs[Fact("equal_angle",("a","b")).key]
        self.assertEqual(proof.theorem,"vertical-opposite")
        self.assertEqual(proof.dependencies,(Fact("vertical_pair",("a","b")).key,))

class HardeningBenchmarkTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls): cls.rows=json.loads((ROOT/"benchmark/school_geometry_hardening_v2.json").read_text())["cases"]

    def test_540_case_benchmark_and_family_error_rates(self):
        self.assertGreaterEqual(len(self.rows),500)
        outcomes=defaultdict(Counter); started=time.perf_counter()
        for row in self.rows:
            p=problem(row); steps=[rf(x,"assumed") for x in row["student_steps"]]
            if row.get("strategy")=="algebraic":
                actual=AlgebraicVerifier().verify(p,steps[-1]).verdict
                valid=actual=="verified"; complete=valid
            else:
                a=verify_student_proof(p,steps); actual=a.steps[-1].verdict; valid=a.valid; complete=a.complete
            expected=row["expected"]
            outcomes[row["category"]]["cases"]+=1
            outcomes[row["category"]]["false_accept"]+=int(actual=="verified" and expected["verdict"]!="verified")
            outcomes[row["category"]]["false_reject"]+=int(actual!="verified" and expected["verdict"]=="verified")
            self.assertEqual((actual,valid,complete),(expected["verdict"],expected["valid"],expected["complete"]),row["id"])
        self.elapsed=time.perf_counter()-started
        self.assertTrue(all(x["false_accept"]==x["false_reject"]==0 for x in outcomes.values()))
        self.assertLess(self.elapsed,5.0)

    def test_each_expanded_family_has_forty_cases(self):
        counts=Counter(x["category"] for x in self.rows if x["id"].startswith("g2-"))
        self.assertEqual(set(counts.values()),{40})

if __name__=="__main__": unittest.main()
