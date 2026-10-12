"""When does accumulated evidence amount to mastery - and when does it not."""

import unittest
from datetime import datetime, timedelta, timezone

from assessment import compute_skill_state

POLICY = {
    "min_independent": 3,
    "min_sessions": 2,
    "min_contexts": 2,
    "retention_gap_days": 3,
    "window": 5,
    "min_accuracy": 0.8,
    "max_review_interval_days": 60,
}
T0 = datetime(2026, 10, 5, 9, 0, tzinfo=timezone.utc)


def obs(spec: str) -> list[dict]:
    """'I@0:a:s1 N@3:b:s2' -> observations. I/S/N = independent/supported/not_yet,
    then day offset, context and session."""
    names = {"I": "independent", "S": "supported", "N": "not_yet"}
    result = []
    for token in spec.split():
        outcome, rest = token.split("@")
        day, context, session = rest.split(":")
        result.append(
            {
                "outcome": names[outcome],
                "context": context,
                "session": session,
                "observed_at": T0 + timedelta(days=float(day), seconds=len(result)),
            }
        )
    return result


def state(spec: str, now_day: float = 30, policy: dict = POLICY) -> dict:
    return compute_skill_state(obs(spec), policy, T0 + timedelta(days=now_day))


class MasteryTests(unittest.TestCase):
    def test_nothing_observed(self):
        self.assertEqual(state("")["status"], "no_evidence")

    def test_one_successful_interaction_is_not_mastery(self):
        self.assertEqual(state("I@0:a:s1")["status"], "developing")

    def test_one_flawless_session_is_not_mastery_however_many_rounds_it_had(self):
        result = state("I@0:a:s1 I@0:b:s1 I@0:c:s1 I@0:d:s1 I@0:e:s1")
        self.assertEqual(result["status"], "secure_pending_retention")
        self.assertFalse(result["criteria"]["multiple_sessions"])
        self.assertFalse(result["criteria"]["retained_over_time"])

    def test_two_sessions_on_the_same_day_are_not_retention(self):
        result = state("I@0:a:s1 I@0:b:s1 I@0.2:c:s2")
        self.assertEqual(result["status"], "secure_pending_retention")
        self.assertTrue(result["criteria"]["multiple_sessions"])
        self.assertFalse(result["criteria"]["retained_over_time"])

    def test_success_again_after_the_retention_gap_is_mastery(self):
        result = state("I@0:a:s1 I@0:b:s1 I@3:c:s2")
        self.assertEqual(result["status"], "mastered")
        self.assertTrue(all(result["criteria"].values()))

    def test_just_short_of_the_retention_gap_is_not_mastery(self):
        self.assertEqual(state("I@0:a:s1 I@0:b:s1 I@2.9:c:s2")["status"], "secure_pending_retention")

    def test_repeating_one_memorised_context_is_not_mastery(self):
        result = state("I@0:a:s1 I@3:a:s2 I@6:a:s3 I@9:a:s4")
        self.assertEqual(result["status"], "developing")
        self.assertFalse(result["criteria"]["varied_contexts"])

    def test_supported_successes_never_count_towards_mastery(self):
        result = state("S@0:a:s1 S@0:b:s1 S@3:c:s2 S@6:d:s3")
        self.assertEqual(result["status"], "emerging")
        self.assertEqual(result["counts"], {"independent": 0, "supported": 4, "not_yet": 0})

    def test_recent_accuracy_must_hold(self):
        result = state("N@0:a:s1 N@0:b:s1 I@3:a:s2 I@3:b:s2 I@6:c:s3")
        self.assertEqual(result["recent_accuracy"], 0.6)
        self.assertEqual(result["status"], "developing")

    def test_old_misses_age_out_of_the_window(self):
        result = state("N@0:a:s1 N@0:b:s1 I@3:a:s2 I@3:b:s2 I@6:c:s3 I@6:d:s3 I@9:e:s4")
        self.assertEqual(result["status"], "mastered")

    def test_one_slip_does_not_undo_mastery(self):
        self.assertEqual(state("I@0:a:s1 I@0:b:s1 I@3:c:s2 I@3:d:s2 N@6:e:s3")["status"], "mastered")

    def test_repeated_slips_after_mastery_call_for_review(self):
        result = state("I@0:a:s1 I@0:b:s1 I@3:c:s2 N@6:d:s3 N@7:e:s4")
        self.assertEqual(result["status"], "needs_review")
        self.assertTrue(result["review_due"])

    def test_status_does_not_depend_on_the_order_observations_arrive(self):
        forward = obs("I@0:a:s1 I@0:b:s1 I@3:c:s2")
        now = T0 + timedelta(days=30)
        self.assertEqual(
            compute_skill_state(forward, POLICY, now), compute_skill_state(list(reversed(forward)), POLICY, now)
        )


class RetentionScheduleTests(unittest.TestCase):
    def test_pending_skills_are_rechecked_once_the_gap_has_passed(self):
        spec = "I@0:a:s1 I@0:b:s1 I@0:c:s1"
        self.assertEqual(state(spec, now_day=1)["next_review_at"], T0 + timedelta(days=3))
        self.assertFalse(state(spec, now_day=1)["review_due"])
        self.assertTrue(state(spec, now_day=3.5)["review_due"])

    def test_review_intervals_grow_with_each_retained_session_up_to_a_cap(self):
        two = state("I@0:a:s1 I@0:b:s1 I@3:c:s2", now_day=3)
        three = state("I@0:a:s1 I@0:b:s1 I@3:c:s2 I@9:d:s3", now_day=9)
        self.assertEqual(two["next_review_at"] - T0, timedelta(days=3 + 6, seconds=2))
        self.assertEqual(three["next_review_at"] - T0, timedelta(days=9 + 12, seconds=3))
        many = " ".join(f"I@{3 * i}:c{i}:s{i}" for i in range(12))
        capped = state(many, now_day=40)
        self.assertEqual(capped["next_review_at"] - capped["last_observed_at"], timedelta(days=60))

    def test_the_policy_is_data_not_code(self):
        strict = {**POLICY, "min_independent": 5}
        self.assertEqual(state("I@0:a:s1 I@0:b:s1 I@3:c:s2", policy=strict)["status"], "developing")


if __name__ == "__main__":
    unittest.main()
