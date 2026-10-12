"""Profiles, the prerequisite graph, and choosing the next session."""

import unittest
from pathlib import Path

from assessment import build_profile, plan_next_session
from assessment.curriculum import load_curriculum, validate_curriculum
from assessment.export_golden import CURRICULUM, GOLDEN, render
from assessment.scenarios import history_scenarios

CARDINALITY = "math.counting.cardinality"


def profile_for(name: str) -> tuple[dict, dict]:
    scenario = history_scenarios()[name]
    curriculum = load_curriculum(str(CURRICULUM))
    profile = build_profile(curriculum, scenario["observations"], scenario["now"])
    return profile, plan_next_session(profile, scenario["sessions_completed"])


def statuses(profile: dict) -> dict[str, str]:
    return {s["key"]: s["status"] for s in profile["skills"]}


class ProfileTests(unittest.TestCase):
    def test_a_new_learner_starts_with_the_scenario_from_the_brief(self):
        profile, plan = profile_for("no_sessions_yet")
        self.assertEqual(set(statuses(profile).values()), {"no_evidence"})
        first = plan["rounds"][0]
        self.assertEqual((first["target"], first["target_kind"], first["representation"]), (5, "apple", "numeral"))
        self.assertEqual(first["available"], {"apple": 8})
        self.assertTrue(all(len(r["available"]) == 1 for r in plan["rounds"]), "one kind of fruit per trip")

    def test_one_perfect_session_masters_nothing(self):
        profile, _ = profile_for("one_perfect_session")
        self.assertNotIn("mastered", statuses(profile).values())

    def test_two_perfect_sessions_on_one_day_master_nothing(self):
        profile, _ = profile_for("two_perfect_sessions_on_the_same_day")
        self.assertNotIn("mastered", statuses(profile).values())

    def test_retained_success_masters_the_assessed_skills(self):
        profile, _ = profile_for("two_perfect_sessions_three_days_apart")
        assessed = {s["key"]: s["status"] for s in profile["skills"] if s["assessed"]}
        self.assertEqual(set(assessed.values()), {"mastered"})

    def test_five_apples_every_time_never_becomes_mastery_or_transfer(self):
        profile, _ = profile_for("the_same_five_apples_every_time")
        self.assertEqual(statuses(profile)[CARDINALITY], "developing")
        self.assertEqual(statuses(profile)["math.quantity.transfer"], "no_evidence")

    def test_later_skills_open_on_evidence_alone_with_no_age_or_grade_gate(self):
        before, _ = profile_for("one_perfect_session")
        after, _ = profile_for("two_perfect_sessions_on_the_same_day")
        self.assertEqual(before["ready_next"], [])
        self.assertEqual(after["ready_next"], ["math.quantity.compare", "math.operations.combine_sets"])

    def test_a_skill_waits_on_exactly_its_unmet_prerequisites(self):
        profile, _ = profile_for("one_perfect_session")
        by_key = {s["key"]: s for s in profile["skills"]}
        self.assertEqual(by_key["math.quantity.transfer"]["waiting_on"], [CARDINALITY])
        self.assertTrue(by_key[CARDINALITY]["ready"])


class PlanTests(unittest.TestCase):
    def test_a_learner_who_needs_help_gets_small_numbers_and_a_clear_shelf(self):
        _, plan = profile_for("only_ever_succeeds_with_help")
        self.assertEqual(plan["band"], "support")
        self.assertTrue(all(r["target"] <= 4 for r in plan["rounds"]))
        self.assertTrue(all(len(r["available"]) == 1 for r in plan["rounds"]))

    def test_secure_counting_brings_bigger_numbers_and_mixed_fruit(self):
        _, plan = profile_for("two_perfect_sessions_three_days_apart")
        self.assertEqual(plan["band"], "stretch")
        self.assertTrue(all(r["target"] >= 6 for r in plan["rounds"]))
        self.assertTrue(all(len(r["available"]) == 2 for r in plan["rounds"]))

    def test_slipping_after_mastery_steps_the_difficulty_back(self):
        _, plan = profile_for("retained_then_slips_twice")
        self.assertEqual(plan["band"], "core")

    def test_every_plan_is_playable_and_probes_transfer(self):
        for name in history_scenarios():
            with self.subTest(name):
                _, plan = profile_for(name)
                rounds = plan["rounds"]
                self.assertEqual([r["representation"] for r in rounds], ["numeral", "numeral", "set"])
                self.assertEqual([r["is_transfer"] for r in rounds], [False, True, True])
                self.assertEqual(len({r["target"] for r in rounds}), 3, "each round asks for a different amount")
                self.assertEqual(len({r["target_kind"] for r in rounds}), 3, "each round uses a different fruit")
                for r in rounds:
                    self.assertGreaterEqual(r["available"][r["target_kind"]], r["target"] + 3)
                    self.assertLessEqual(sum(r["available"].values()), 18, "must fit on the shelf")

    def test_plans_are_reproducible(self):
        self.assertEqual(profile_for("one_perfect_session")[1], profile_for("one_perfect_session")[1])


class CurriculumTests(unittest.TestCase):
    def test_the_shipped_curriculum_is_a_valid_graph(self):
        validate_curriculum(load_curriculum(str(CURRICULUM)))

    def test_cycles_and_unknown_prerequisites_are_refused(self):
        skill = {"name": "", "description": "", "assessed": True}
        with self.assertRaises(ValueError):
            validate_curriculum({"skills": [{**skill, "key": "a", "prerequisites": ["b"]}]})
        with self.assertRaises(ValueError):
            validate_curriculum(
                {
                    "skills": [
                        {**skill, "key": "a", "prerequisites": ["b"]},
                        {**skill, "key": "b", "prerequisites": ["a"]},
                    ]
                }
            )


class GoldenFileTests(unittest.TestCase):
    def test_golden_cases_match_the_engine(self):
        self.assertEqual(
            Path(GOLDEN).read_text(encoding="utf-8"),
            render(),
            "shared/golden/cases.json is stale: run `python -m assessment.export_golden`",
        )


if __name__ == "__main__":
    unittest.main()
