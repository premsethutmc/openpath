from __future__ import annotations
import unittest
from geometry_reasoner import Fact,GeometryProblem,SubmittedProofStep,SyntheticReasoner,adapt_geometry_assessment,verify_submitted_proof

class UnifiedContractAdapterTests(unittest.TestCase):
    def assess(self,problem,steps):return verify_submitted_proof(problem,steps)
    def test_verified_invalid_incomplete_and_dependencies(self):
        p=GeometryProblem("p",{},[Fact("vertical_pair",("a","b"))],goal=Fact("equal_angle",("a","b")))
        verified=self.assess(p,[SubmittedProofStep("s1",p.goal,cited_theorem="vertical-opposite")])
        u=adapt_geometry_assessment(verified,("geometry.vertical-angles",))
        self.assertEqual((u.outcome,u.correct),("verified",True));self.assertEqual(u.geometry.skill_ids,("geometry.vertical-angles",))
        bad=self.assess(GeometryProblem("bad",{},[Fact("angle_measure",("a",),30)],goal=Fact("angle_measure",("a",),30)),[SubmittedProofStep("s1",Fact("angle_measure",("a",),40))])
        self.assertEqual((adapt_geometry_assessment(bad).outcome,adapt_geometry_assessment(bad).correct),("invalid",False))
        incomplete=self.assess(p,[SubmittedProofStep("s1",Fact("vertical_pair",("a","b")))])
        self.assertEqual(adapt_geometry_assessment(incomplete).outcome,"incomplete")
    def test_missing_assumption_and_unsupported_are_preserved_in_extension(self):
        p=GeometryProblem("m",{},[Fact("corresponding_pair",("a","b","l","m"))],goal=Fact("equal_angle",("a","b")))
        a=self.assess(p,[SubmittedProofStep("s1",p.goal)]);u=adapt_geometry_assessment(a)
        self.assertEqual((u.outcome,u.correct),("unsupported",None));self.assertEqual(u.geometry.native_verdicts,("missing_assumption",));self.assertTrue(a.unresolved_obligations)
        q=GeometryProblem("u",{},[],goal=Fact("concyclic",("a","b","c","d")))
        v=adapt_geometry_assessment(self.assess(q,[SubmittedProofStep("s1",q.goal)]))
        self.assertEqual(v.geometry.native_verdicts,("unsupported",))
    def test_resource_exhaustion_maps_without_becoming_wrong(self):
        p=GeometryProblem("r",{},[Fact("vertical_pair",(f"a{i}",f"b{i}")) for i in range(5)],goal=Fact("equal_angle",("a4","b4")))
        # Exercise the native result directly because submitted verifier intentionally uses default budgets.
        from geometry_reasoner import verify_geometry_step
        r=verify_geometry_step(p,[],p.goal,synthetic=SyntheticReasoner(max_rule_applications=1))
        from geometry_reasoner.model import ProofAssessment
        u=adapt_geometry_assessment(ProofAssessment((r,),False,False,r,0,(0,),r.unsupported_conditions))
        self.assertEqual((u.outcome,u.correct,u.resourceLimit),("unsupported",None,True))

if __name__=="__main__":unittest.main()
