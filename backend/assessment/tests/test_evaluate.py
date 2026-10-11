"""What the rules conclude from one session of play."""

import unittest

from assessment import evaluate_session
from assessment.scenarios import Script, perfect_session, session_scenarios

NUMERAL = "math.number.numeral_recognition"
ONE_TO_ONE = "math.counting.one_to_one"
CARDINALITY = "math.counting.cardinality"
TRANSFER = "math.quantity.transfer"


def outcomes(result: dict) -> set[tuple[str, str, str]]:
    return {(o["round"], o["skill"], o["outcome"]) for o in result["observations"]}


class RoundOutcomeTests(unittest.TestCase):
    def test_right_first_time_is_independent_evidence_for_every_skill_the_round_touches(self):
        result = evaluate_session(perfect_session())
        self.assertEqual(result["integrity"], "ok")
        self.assertEqual(
            outcomes(result),
            {
                ("r1", CARDINALITY, "independent"),
                ("r1", ONE_TO_ONE, "independent"),
                ("r1", NUMERAL, "independent"),
                ("r2", CARDINALITY, "independent"),
                ("r2", ONE_TO_ONE, "independent"),
                ("r2", NUMERAL, "independent"),
                ("r2", TRANSFER, "independent"),
                ("r3", ONE_TO_ONE, "independent"),
                ("r3", TRANSFER, "independent"),
            },
        )

    def test_the_familiar_first_round_is_never_transfer_evidence(self):
        result = evaluate_session(perfect_session())
        self.assertNotIn("r1", {o["round"] for o in result["observations"] if o["skill"] == TRANSFER})

    def test_a_pictured_set_round_says_nothing_about_numerals_or_cardinality(self):
        events = Script().solve("r3", 4, kind="pear", representation="set", transfer=True).events
        skills = {o["skill"] for o in evaluate_session(events)["observations"]}
        self.assertEqual(skills, {ONE_TO_ONE, TRANSFER})

    def test_success_after_a_hint_is_supported_not_independent(self):
        result = evaluate_session(session_scenarios()["takes_every_apple_then_fixes_it_after_a_hint"])
        self.assertEqual(
            outcomes(result), {("r1", CARDINALITY, "supported"), ("r1", ONE_TO_ONE, "supported")}
        )
        self.assertEqual(result["rounds"][0]["first_error"], "took_all")

    def test_fixing_an_overshoot_before_checking_still_counts_as_independent(self):
        result = evaluate_session(session_scenarios()["overshoots_and_self_corrects_before_checking"])
        self.assertIn(("r1", CARDINALITY, "independent"), outcomes(result))
        self.assertTrue(result["rounds"][0]["self_corrected"])
        self.assertEqual(result["rounds"][0]["removals"], 1)

    def test_a_wrong_fruit_in_the_basket_is_not_a_correct_set(self):
        result = evaluate_session(session_scenarios()["adds_a_wrong_fruit_then_fixes_it"])
        self.assertEqual(result["rounds"][0]["first_error"], "wrong_kind")
        self.assertIn(("r2", TRANSFER, "supported"), outcomes(result))

    def test_a_round_that_was_never_checked_is_not_evidence(self):
        result = evaluate_session(session_scenarios()["never_checks_so_there_is_no_evidence"])
        self.assertEqual(result["integrity"], "ok")
        self.assertEqual(result["observations"], [])

    def test_error_patterns_are_named(self):
        cases = {"too_few": 3, "too_many": 6, "took_all": 8, "empty": 0}
        for expected, count in cases.items():
            with self.subTest(expected):
                events = Script().round("r1", 5).add(count).check().events
                self.assertEqual(evaluate_session(events)["rounds"][0]["first_error"], expected)


class DifferentialRuleTests(unittest.TestCase):
    """A missed numeral round is ambiguous unless the session disambiguates it."""

    def test_missing_numerals_but_matching_a_pictured_set_points_at_numeral_reading(self):
        result = evaluate_session(session_scenarios()["misses_numerals_but_matches_a_pictured_set"])
        self.assertIn(("r1", NUMERAL, "not_yet"), outcomes(result))
        self.assertIn(("r2", NUMERAL, "not_yet"), outcomes(result))
        self.assertIn(("r3", ONE_TO_ONE, "independent"), outcomes(result))

    def test_missing_everything_leaves_numeral_reading_unjudged(self):
        result = evaluate_session(session_scenarios()["misses_everything_so_numeral_reading_stays_unjudged"])
        self.assertNotIn(NUMERAL, {o["skill"] for o in result["observations"]})
        self.assertIn(("r3", ONE_TO_ONE, "not_yet"), outcomes(result))

    def test_a_missed_numeral_round_alone_does_not_count_against_one_to_one_counting(self):
        events = Script().round("r1", 5).add(3).check().events
        self.assertEqual(outcomes(evaluate_session(events)), {("r1", CARDINALITY, "not_yet")})


class IntegrityTests(unittest.TestCase):
    """The engine replays events and does not take the game's word for it."""

    def assert_rejected(self, events):
        result = evaluate_session(events)
        self.assertEqual(result["integrity"], "inconsistent")
        self.assertEqual(result["observations"], [])
        self.assertTrue(result["problems"])

    def test_a_check_that_disagrees_with_the_replayed_basket_is_rejected(self):
        self.assert_rejected(session_scenarios()["tampered_check_is_rejected"])

    def test_completion_without_a_correct_check_is_rejected(self):
        self.assert_rejected(session_scenarios()["completion_without_a_correct_check_is_rejected"])

    def test_adding_the_same_item_twice_is_rejected(self):
        script = Script().round("r1", 5).add(1)
        script._emit("item_added", {"item": "i1", "kind": "apple"})
        self.assert_rejected(script.events)

    def test_adding_more_than_the_shelf_held_is_rejected(self):
        self.assert_rejected(Script().round("r1", 5, available={"apple": 4}).add(5).check().complete().events)

    def test_removing_something_that_was_never_added_is_rejected(self):
        script = Script().round("r1", 5)
        script._emit("item_removed", {"item": "ghost"})
        self.assert_rejected(script.events)

    def test_an_unknown_task_type_is_rejected(self):
        events = Script().solve("r1", 5).events
        events[0]["data"]["task_type"] = "mystery"
        self.assert_rejected(events)

    def test_event_order_follows_seq_not_arrival_order(self):
        events = perfect_session()
        self.assertEqual(evaluate_session(list(reversed(events))), evaluate_session(events))


if __name__ == "__main__":
    unittest.main()
