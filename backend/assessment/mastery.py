"""Decide what the accumulated evidence says about one skill.

A status describes the evidence about a skill, never the learner. It is a pure
function of the observations, the policy and the current time, so it can be
recomputed at any moment and explained criterion by criterion.

Statuses
    no_evidence               nothing observed yet
    emerging                  observed, but no unaided success yet
    developing                some unaided success; criteria not all met
    secure_pending_retention  enough varied, accurate evidence - but all of it
                              recent. Not mastery until it survives a gap.
    mastered                  the above, plus unaided success in at least
                              `min_sessions` sessions spanning
                              `retention_gap_days`
    needs_review              was mastered at an earlier point in the record,
                              but recent accuracy has since dropped

One good session can never produce `mastered`: the retention criterion needs
successes separated in time.
"""

from __future__ import annotations

from datetime import datetime, timedelta

STATUSES = (
    "no_evidence",
    "emerging",
    "developing",
    "secure_pending_retention",
    "mastered",
    "needs_review",
)

SECURE = ("secure_pending_retention", "mastered")


def _measure(obs: list[dict], policy: dict) -> dict:
    """Evidence measures and mastery criteria for a time-ordered list."""
    independent = [o for o in obs if o["outcome"] == "independent"]
    contexts = sorted({o["context"] for o in independent})
    sessions = {o["session"] for o in independent}
    window = obs[-policy["window"]:]
    accuracy = (
        sum(1 for o in window if o["outcome"] == "independent") / len(window) if window else 0.0
    )
    gap = timedelta(days=policy["retention_gap_days"])
    span = independent[-1]["observed_at"] - independent[0]["observed_at"] if independent else timedelta(0)
    criteria = {
        "enough_observations": len(independent) >= policy["min_independent"],
        "varied_contexts": len(contexts) >= policy["min_contexts"],
        "recent_accuracy": bool(window) and accuracy >= policy["min_accuracy"],
        "multiple_sessions": len(sessions) >= policy["min_sessions"],
        "retained_over_time": len(sessions) >= 2 and span >= gap,
    }
    return {
        "independent": independent,
        "contexts": contexts,
        "sessions": sessions,
        "accuracy": accuracy,
        "criteria": criteria,
        "core": criteria["enough_observations"] and criteria["varied_contexts"] and criteria["recent_accuracy"],
        "retained": criteria["multiple_sessions"] and criteria["retained_over_time"],
    }


def compute_skill_state(observations: list[dict], policy: dict, now: datetime) -> dict:
    """observations: [{"outcome", "context", "session", "observed_at": datetime}]"""
    obs = sorted(observations, key=lambda o: o["observed_at"])
    counts = {"independent": 0, "supported": 0, "not_yet": 0}
    for o in obs:
        counts[o["outcome"]] += 1

    m = _measure(obs, policy)
    independent, sessions, criteria = m["independent"], m["sessions"], m["criteria"]
    first_success = independent[0]["observed_at"] if independent else None
    last_success = independent[-1]["observed_at"] if independent else None
    gap = timedelta(days=policy["retention_gap_days"])

    def was_mastered_before() -> bool:
        return any(
            earlier["core"] and earlier["retained"]
            for earlier in (_measure(obs[:end], policy) for end in range(1, len(obs)))
        )

    next_review_at = None
    if not obs:
        status = "no_evidence"
    elif m["core"] and m["retained"]:
        status = "mastered"
        days = min(
            policy.get("max_review_interval_days", 60),
            policy["retention_gap_days"] * 2 ** max(1, len(sessions) - 1),
        )
        next_review_at = last_success + timedelta(days=days)
    elif m["core"]:
        status = "secure_pending_retention"
        next_review_at = first_success + gap
    elif was_mastered_before():
        status = "needs_review"
        next_review_at = now
    elif independent:
        status = "developing"
    else:
        status = "emerging"

    return {
        "status": status,
        "counts": counts,
        "contexts": m["contexts"],
        "sessions_with_success": len(sessions),
        "recent_accuracy": round(m["accuracy"], 3),
        "criteria": criteria,
        "first_success_at": first_success,
        "last_observed_at": obs[-1]["observed_at"] if obs else None,
        "next_review_at": next_review_at,
        "review_due": bool(next_review_at and next_review_at <= now),
    }
