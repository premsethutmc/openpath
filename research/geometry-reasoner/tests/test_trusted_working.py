"""Rule-level method checks, separate from conclusion entailment (no case-ID patches)."""
import unittest
from fractions import Fraction
from geometry_reasoner import Fact, GeometryObject, GeometryProblem, SubmittedProofStep, verify_geometry_step, verify_submitted_proof


def measure(angle, value):
    return Fact("angle_measure", (angle,), value)


def triangle(facts, goal, conditions=True):
    return GeometryProblem("test", {"T": GeometryObject.make("T", "triangle", angles=("A", "B", "C"), sides=("AB", "BC", "CA"))},
                           facts, {"nondegenerate:T"} if conditions else set(), goal)


def step(id, fact, theorem=None, cites=()):
    return SubmittedProofStep(id, fact, cites, theorem)


class TrustedWorkingTests(unittest.TestCase):
    def test_all_direct_exterior_forward_and_inverse_instances(self):
        for a in range(10, 100, 11):
            for b in range(10, 80, 13):
                if a + b >= 180:
                    continue
                pair = Fact("linear_pair", ("C", "D"))
                p = triangle([measure("A", a), measure("B", b), pair], measure("D", a + b))
                direct = verify_submitted_proof(p, [step("s", p.goal, "exterior-angle")])
                self.assertTrue(direct.complete, (a, b, direct))
                self.assertEqual(direct.steps[0].theorem, "exterior-angle")
                reverse = triangle([measure("A", a), measure("D", a + b), pair], measure("B", b))
                self.assertTrue(verify_submitted_proof(reverse, [step("s", reverse.goal, "exterior-angle")]).complete)
                wrong = verify_submitted_proof(p, [step("s", measure("D", a + b + 1), "exterior-angle")])
                self.assertEqual(wrong.steps[0].verdict, "invalid")
                absent = triangle([measure("A", a), measure("B", b)], p.goal)
                self.assertEqual(verify_submitted_proof(absent, [step("s", p.goal, "exterior-angle")]).steps[0].verdict, "unsupported")

    def test_valid_alternative_routes_and_independent_order(self):
        facts = [measure("A", 50), measure("E", 60), measure("F", 120), Fact("vertical_pair", ("E", "B")), Fact("linear_pair", ("F", "B"))]
        p = triangle(facts, measure("C", 70))
        for theorem in ("vertical-opposite", "straight-line"):
            proof = [step("b", measure("B", 60), theorem), step("c", p.goal, "triangle-sum", ("b",))]
            self.assertTrue(verify_submitted_proof(p, proof).complete)
        p = triangle([measure("E", 50), measure("F", 120), Fact("vertical_pair", ("E", "A")), Fact("linear_pair", ("F", "B"))], measure("C", 70))
        a, b = step("a", measure("A", 50), "vertical-opposite"), step("b", measure("B", 60), "straight-line")
        for order in ([a, b], [b, a]):
            self.assertTrue(verify_submitted_proof(p, [*order, step("c", p.goal, "triangle-sum", ("a", "b"))]).complete)

    def test_conclusion_search_cannot_supply_omitted_method_steps(self):
        p = triangle([measure("A", 50), measure("E", 60), Fact("vertical_pair", ("E", "B"))], measure("C", 70))
        self.assertEqual(verify_geometry_step(p, [], p.goal).verdict, "verified")
        for theorem in (None, "triangle-sum", "unknown-rule"):
            a = verify_submitted_proof(p, [step("c", p.goal, theorem)])
            self.assertFalse(a.complete)
            self.assertEqual(a.steps[0].verdict, "unsupported")
            self.assertIsNone(a.first_invalid_step)
        # Neither many uncited entailed claims nor restating givens demonstrates a method.
        a = verify_submitted_proof(p, [step("b", measure("B", 60)), step("c", p.goal)])
        self.assertFalse(a.valid)
        given = GeometryProblem("given", {}, [measure("A", 50)], goal=measure("A", 50))
        for theorem in (None, "given"):
            assessment = verify_submitted_proof(given, [step("a", given.goal, theorem)])
            self.assertTrue(assessment.valid)
            self.assertFalse(assessment.complete)

    def test_equal_angle_measure_and_false_vertical_claim(self):
        p = triangle([measure("A", 50), measure("E", 60), Fact("vertical_pair", ("E", "B"))], measure("C", 70))
        wrong = verify_submitted_proof(p, [step("b", measure("B", 120), "straight-line")])
        self.assertEqual(wrong.steps[0].verdict, "invalid")
        explicit = GeometryProblem("equal", {}, [Fact("equal_angle", ("E", "B")), measure("E", Fraction(121, 2))], goal=measure("B", Fraction(121, 2)))
        self.assertTrue(verify_submitted_proof(explicit, [step("b", explicit.goal, "equal-angle-measure")]).complete)

    def test_unified_version_and_exact_fraction_serialization(self):
        from geometry_reasoner.unified_api import assess_unified
        response = assess_unified({"domain": "geometry", "problem": {
            "id": "fraction", "facts": [
                {"predicate": "equal_angle", "args": ["A", "B"]},
                {"predicate": "angle_measure", "args": ["A"], "value": "121/2"}],
            "goal": {"predicate": "angle_measure", "args": ["B"], "value": "121/2"}},
            "steps": [{"id": "b", "statement": {"predicate": "angle_measure", "args": ["B"], "value": "121/2"},
                       "cited_theorem": "equal-angle-measure"}]})
        self.assertEqual(response["authorityVersion"], "geometry-reasoner@foundation-1")
        self.assertEqual(response["outcome"], "verified")
        self.assertIn("121/2", str(response["geometry"]["mathematical_dependencies"]))

    def test_explicit_angle_pairs_and_missing_conditions(self):
        for theorem, total in (("complementary", 90), ("supplementary", 180)):
            for value in (1, 20, Fraction(91, 2), total - 1):
                p = GeometryProblem("pair", {}, [Fact(theorem + "_pair", ("A", "B")), measure("A", value)], goal=measure("B", total - value))
                self.assertTrue(verify_submitted_proof(p, [step("b", p.goal, theorem)]).complete)
        p = triangle([measure("A", 50), measure("B", 60)], measure("C", 70), False)
        self.assertEqual(verify_submitted_proof(p, [step("c", p.goal, "triangle-sum")]).steps[0].verdict, "missing_assumption")

    def test_unknown_first_step_is_not_reported_as_false(self):
        p = triangle([measure("A", 50), measure("B", 60)], measure("C", 70))
        a = verify_submitted_proof(p, [step("unknown", measure("D", 80), "unknown"), step("wrong", measure("C", 90), "triangle-sum", ("unknown",))])
        self.assertEqual([s.verdict for s in a.steps], ["unsupported", "invalid"])
        self.assertEqual(a.first_invalid_step, 1)
        self.assertFalse(a.complete)

    def test_inconsistent_givens_cannot_demonstrate_method(self):
        p = triangle([measure("A", 100), measure("B", 100)], measure("C", -20))
        a = verify_submitted_proof(p, [step("c", p.goal, "triangle-sum")])
        self.assertFalse(a.valid)
        self.assertEqual(a.steps[0].verdict, "unsupported")

    def test_irrelevant_or_unestablished_citations_are_not_method_evidence(self):
        p = triangle([measure("A", 50), measure("B", 60), measure("D", 80)], measure("C", 70))
        a = verify_submitted_proof(p, [step("d", measure("D", 80)), step("c", p.goal, "triangle-sum", ("d",))])
        self.assertEqual(a.steps[1].verdict, "unsupported")
        b = verify_submitted_proof(p, [step("a", measure("A", 50), "unknown"), step("c", p.goal, "triangle-sum", ("a",))])
        self.assertEqual(b.steps[1].verdict, "unsupported")


if __name__ == "__main__":
    unittest.main()
