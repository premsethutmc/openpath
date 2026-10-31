from __future__ import annotations
import unittest
from geometry_reasoner import assess_unified

def triangle_request(steps,conditions=("nondegenerate:T",),facts=None,budget=None):
    p={"id":"triangle-api","objects":[{"id":"T","kind":"triangle","data":{"angles":["A","B","C"],"sides":["AB","BC","CA"]}}],"facts":facts or [{"predicate":"angle_measure","args":["A"],"value":50},{"predicate":"angle_measure","args":["B"],"value":60}],"conditions":list(conditions),"goal":{"predicate":"angle_measure","args":["C"],"value":70},"skill":"geometry.triangle-angle-sum"}
    return {"domain":"geometry","problem":p,"steps":steps,**({"resource_budget":budget} if budget else {})}
def S(i,value=70):return {"id":f"s{i}","statement":{"predicate":"angle_measure","args":["C"],"value":value},"cited_theorem":"triangle-sum"}

class UnifiedGeometryApiTests(unittest.TestCase):
    def test_structured_triangle_proof_success_criterion(self):
        r=assess_unified(triangle_request([S(1)]))
        self.assertEqual((r["outcome"],r["correct"],r["firstInvalidStep"]),("verified",True,None))
        self.assertEqual(r["geometry"]["native_verdicts"],["verified"]);self.assertTrue(r["geometry"]["skill_ids"]);self.assertTrue(r["geometry"]["mathematical_dependencies"][0])
    def test_invalid_and_first_step(self):
        r=assess_unified(triangle_request([S(1,80),S(2,70)]))
        self.assertEqual((r["outcome"],r["correct"],r["firstInvalidStep"]),("invalid",False,0))
    def test_incomplete_missing_unsupported_and_contradictory(self):
        inc=assess_unified(triangle_request([{"id":"s1","statement":{"predicate":"angle_measure","args":["A"],"value":50}}]))
        self.assertEqual(inc["outcome"],"incomplete")
        missing=assess_unified(triangle_request([S(1)],conditions=()))
        self.assertEqual(missing["outcome"],"unsupported");self.assertEqual(missing["geometry"]["native_verdicts"],["missing_assumption"])
        unsupported=assess_unified({"domain":"geometry","problem":{"id":"u","objects":[],"facts":[],"conditions":[],"goal":{"predicate":"concyclic","args":["A","B","C","D"]}},"steps":[{"id":"s1","statement":{"predicate":"concyclic","args":["A","B","C","D"]}}]})
        self.assertEqual((unsupported["outcome"],unsupported["correct"]),("unsupported",None))
        contradiction=assess_unified(triangle_request([S(1)],facts=[{"predicate":"angle_measure","args":["A"],"value":50},{"predicate":"angle_measure","args":["A"],"value":60}]))
        self.assertEqual((contradiction["outcome"],contradiction["correct"]),("unsupported",None))
    def test_resource_exhaustion_and_bad_domain(self):
        exhausted=assess_unified(triangle_request([S(1)],budget={"max_rule_applications":0}))
        self.assertEqual((exhausted["outcome"],exhausted["correct"],exhausted["resourceLimit"]),("unsupported",None,True))
        self.assertEqual(assess_unified({"domain":"calculus"})["outcome"],"unsupported")

if __name__=="__main__":unittest.main()
