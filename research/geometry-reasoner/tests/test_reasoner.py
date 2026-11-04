from __future__ import annotations

import json
import unittest
from collections import Counter
from pathlib import Path

from geometry_reasoner import AlgebraicVerifier, Fact, GeometryObject, GeometryProblem, verify_geometry_step, verify_student_proof

ROOT = Path(__file__).parents[1]


def read_fact(row, status="given"):
    return Fact(row["predicate"], tuple(row["args"]), row.get("value"), status)


def read_case(row):
    objects = {item["id"]: GeometryObject.make(item["id"], item["kind"], **item.get("data", {})) for item in row["objects"]}
    problem = GeometryProblem(row["id"], objects, [read_fact(f) for f in row["facts"]], set(row["conditions"]), read_fact(row["goal"]), f"geometry.{row['category']}")
    return problem, [read_fact(f, "assumed") for f in row["student_steps"]]


class BenchmarkTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.benchmark = json.loads((ROOT / "benchmark/school_geometry_v1.json").read_text())

    def test_benchmark_has_independent_balanced_school_cases(self):
        cases = self.benchmark["cases"]
        self.assertEqual(len(cases), 180)
        self.assertEqual(len({case["id"] for case in cases}), 180)
        counts = Counter(case["category"] for case in cases)
        for required in ("vertical-opposite", "straight-line", "parallel-lines", "triangle-sum", "isosceles", "triangle-congruence", "triangle-similarity", "missing-assumption", "incorrect-conclusion", "degenerate", "outside-coverage", "valid-incomplete-proof"):
            self.assertGreater(counts[required], 0)
        self.assertTrue(all(case["oracle"] for case in cases))
        self.assertGreaterEqual(sum(bool(case["alternative_routes"]) for case in cases), 20)

    def test_all_180_expected_step_verdicts_and_completeness(self):
        verdicts = Counter()
        for row in self.benchmark["cases"]:
            problem, steps = read_case(row)
            assessment = verify_student_proof(problem, steps)
            expected = row["expected"]
            self.assertEqual(assessment.steps[-1].verdict, expected["verdict"], row["id"])
            self.assertEqual(assessment.valid, expected["valid"], row["id"])
            self.assertEqual(assessment.complete, expected["complete"], row["id"])
            verdicts[assessment.steps[-1].verdict] += 1
        self.assertEqual(verdicts, Counter(verified=140, missing_assumption=20, invalid=10, unsupported=10))

    def test_alternative_congruence_routes_are_not_solution_paths(self):
        rows = [row for row in self.benchmark["cases"] if len(row["alternative_routes"]) > 1]
        self.assertTrue(rows)
        for row in rows:
            problem, steps = read_case(row)
            result = verify_student_proof(problem, steps)
            self.assertTrue(result.complete)
            self.assertIn(result.goal.theorem, {"triangle-congruence", "cpctc"})

    def test_missing_parallel_is_not_called_false(self):
        row = next(row for row in self.benchmark["cases"] if row["category"] == "missing-assumption")
        problem, steps = read_case(row)
        result = verify_geometry_step(problem, [], steps[0])
        self.assertEqual(result.verdict, "missing_assumption")
        self.assertRegex(" ".join(result.missing_assumptions), r"parallel")

    def test_uncovered_relation_is_unsupported_not_invalid(self):
        row = next(row for row in self.benchmark["cases"] if row["category"] == "outside-coverage")
        problem, steps = read_case(row)
        result = verify_geometry_step(problem, [], steps[0])
        self.assertEqual(result.verdict, "unsupported")
        self.assertEqual(result.candidate_misconception, None)


class AlgebraicTests(unittest.TestCase):
    def setUp(self):
        points = {
            "A": GeometryObject.make("A", "point", x=0, y=0), "B": GeometryObject.make("B", "point", x=4, y=0),
            "C": GeometryObject.make("C", "point", x=0, y=3), "D": GeometryObject.make("D", "point", x=4, y=3),
            "E": GeometryObject.make("E", "point", x=8, y=0),
        }
        objects = {
            **points,
            "AB": GeometryObject.make("AB", "segment", points=("A", "B")), "CD": GeometryObject.make("CD", "segment", points=("C", "D")),
            "AC": GeometryObject.make("AC", "line", points=("A", "C")), "BD": GeometryObject.make("BD", "line", points=("B", "D")),
            "AE": GeometryObject.make("AE", "line", points=("A", "E")),
        }
        self.problem = GeometryProblem("coordinates", objects, [], {"distinct:A:B"})
        self.verifier = AlgebraicVerifier()

    def test_exact_coordinate_invariants(self):
        for fact in (Fact("parallel", ("AC", "BD")), Fact("perpendicular", ("AC", "AE")), Fact("equal_length", ("AB", "CD")), Fact("collinear", ("A", "B", "E"))):
            self.assertEqual(self.verifier.verify(self.problem, fact).verdict, "verified")

    def test_false_coordinate_claim_is_invalid(self):
        self.assertEqual(self.verifier.verify(self.problem, Fact("parallel", ("AB", "AC"))).verdict, "invalid")

    def test_degenerate_coordinate_object_needs_assumption(self):
        objects = {"A": GeometryObject.make("A", "point", x=0, y=0), "AA": GeometryObject.make("AA", "line", points=("A", "A")), "AB": self.problem.objects["AE"]}
        problem = GeometryProblem("degenerate-coordinate", objects, [])
        result = self.verifier.verify(problem, Fact("parallel", ("AA", "AB")))
        self.assertEqual(result.verdict, "missing_assumption")

    def test_hybrid_strategies_agree_on_twenty_shared_obligations(self):
        compared = []
        for i in range(5):
            # Two right angles: synthetic vertical-angle rule and exact dot/cosine invariant agree.
            points = {
                f"O{i}": GeometryObject.make(f"O{i}", "point", x=0, y=0), f"A{i}": GeometryObject.make(f"A{i}", "point", x=1+i, y=0), f"B{i}": GeometryObject.make(f"B{i}", "point", x=0, y=1+i),
                f"P{i}": GeometryObject.make(f"P{i}", "point", x=10, y=10), f"C{i}": GeometryObject.make(f"C{i}", "point", x=11+i, y=10), f"D{i}": GeometryObject.make(f"D{i}", "point", x=10, y=11+i),
            }
            a1, a2 = f"right{i}a", f"right{i}b"
            objects = {**points, a1: GeometryObject.make(a1, "angle", points=(f"A{i}", f"O{i}", f"B{i}")), a2: GeometryObject.make(a2, "angle", points=(f"C{i}", f"P{i}", f"D{i}"))}
            problem = GeometryProblem(f"hybrid-angle-{i}", objects, [Fact("vertical_pair", (a1, a2))])
            goal = Fact("equal_angle", (a1, a2))
            compared.append((verify_geometry_step(problem, [], goal), self.verifier.verify(problem, goal)))

            # Coordinate-congruent triangles: SSS synthetic proof and coordinate invariant agree.
            points2 = {}
            for prefix, dx in (("L", 0), ("R", 10+i)):
                for name, (x, y) in zip("ABC", ((0, 0), (3, 0), (0, 4))): points2[f"{prefix}{i}{name}"] = GeometryObject.make(f"{prefix}{i}{name}", "point", x=x+dx, y=y)
            objects2 = dict(points2); triangles = []
            for prefix in ("L", "R"):
                sides = []
                for edge in ("AB", "BC", "CA"):
                    sid = f"{prefix}{i}{edge}"; sides.append(sid); objects2[sid] = GeometryObject.make(sid, "segment", points=(f"{prefix}{i}{edge[0]}", f"{prefix}{i}{edge[1]}"))
                tid = f"{prefix}{i}T"; triangles.append(tid); objects2[tid] = GeometryObject.make(tid, "triangle", points=(f"{prefix}{i}A", f"{prefix}{i}B", f"{prefix}{i}C"), sides=sides, angles=[f"{prefix}{i}a", f"{prefix}{i}b", f"{prefix}{i}c"])
            facts = [Fact("equal_length", (f"L{i}{edge}", f"R{i}{edge}")) for edge in ("AB", "BC", "CA")]
            problem2 = GeometryProblem(f"hybrid-congruent-{i}", objects2, facts, {f"nondegenerate:{triangles[0]}", f"nondegenerate:{triangles[1]}"})
            goal2 = Fact("congruent", tuple(triangles))
            compared.append((verify_geometry_step(problem2, [], goal2), self.verifier.verify(problem2, goal2)))

            # Similar triangles scaled by 2: AA is supplied synthetically; exact squared-side ratios verify it algebraically.
            for prefix, scale, dx in (("S", 1, 0), ("U", 2, 20+i)):
                for name, (x, y) in zip("ABC", ((0, 0), (3, 0), (0, 4))): objects2[f"{prefix}{i}{name}"] = GeometryObject.make(f"{prefix}{i}{name}", "point", x=dx+scale*x, y=scale*y)
                objects2[f"{prefix}{i}T"] = GeometryObject.make(f"{prefix}{i}T", "triangle", points=(f"{prefix}{i}A", f"{prefix}{i}B", f"{prefix}{i}C"), sides=[f"{prefix}{i}AB", f"{prefix}{i}BC", f"{prefix}{i}CA"], angles=[f"{prefix}{i}a", f"{prefix}{i}b", f"{prefix}{i}c"])
            simfacts = [Fact("equal_angle", (f"S{i}a", f"U{i}a")), Fact("equal_angle", (f"S{i}b", f"U{i}b"))]
            problem3 = GeometryProblem(f"hybrid-similar-{i}", objects2, simfacts, {f"nondegenerate:S{i}T", f"nondegenerate:U{i}T"})
            goal3 = Fact("similar", (f"S{i}T", f"U{i}T"))
            compared.append((verify_geometry_step(problem3, [], goal3), self.verifier.verify(problem3, goal3)))

            # A false parallel claim is contradicted by explicit synthetic information and by its coordinate invariant.
            false_goal = Fact("parallel", ("AB", "AC"))
            false_problem = GeometryProblem(f"hybrid-false-{i}", self.problem.objects, [Fact("not_parallel", ("AB", "AC"))])
            compared.append((verify_geometry_step(false_problem, [], false_goal), self.verifier.verify(false_problem, false_goal)))
        self.assertEqual(len(compared), 20)
        self.assertEqual(Counter((a.verdict, b.verdict) for a, b in compared), Counter({("verified", "verified"): 15, ("invalid", "invalid"): 5}))


if __name__ == "__main__":
    unittest.main()
