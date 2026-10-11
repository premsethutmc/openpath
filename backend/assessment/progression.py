"""Build a learner profile from observations and choose what comes next.

Progression follows evidence and the prerequisite graph only. Nothing here
knows the learner's age or school grade, so a learner who shows secure skills
moves on, and one who does not gets a gentler next session.
"""

from __future__ import annotations

from datetime import datetime

from .mastery import SECURE, compute_skill_state

# Next-session plans rotate through fixed tables rather than drawing random
# numbers, so the server and the on-device engine always agree and every plan
# can be reproduced from the learner's history.
BANDS = {
    "support": [(3, 2, 4), (2, 4, 3), (4, 3, 2)],
    "core": [(5, 3, 4), (4, 6, 3), (7, 5, 6), (6, 4, 7), (3, 7, 5)],
    "stretch": [(8, 6, 9), (7, 10, 6), (9, 7, 8), (6, 9, 10), (10, 8, 7)],
}
KINDS = [("apple", "orange", "pear"), ("pear", "apple", "orange"), ("orange", "pear", "apple")]

CARDINALITY = "math.counting.cardinality"
ONE_TO_ONE = "math.counting.one_to_one"


def build_profile(curriculum: dict, observations: list[dict], now: datetime) -> dict:
    """observations: [{"skill", "outcome", "context", "session", "observed_at"}]"""
    by_skill: dict[str, list[dict]] = {}
    for o in observations:
        by_skill.setdefault(o["skill"], []).append(o)

    policy = curriculum["mastery_policy"]
    states = {
        skill["key"]: compute_skill_state(by_skill.get(skill["key"], []), policy, now)
        for skill in curriculum["skills"]
    }

    skills = []
    for skill in curriculum["skills"]:
        waiting_on = [p for p in skill["prerequisites"] if states[p]["status"] not in SECURE]
        skills.append(
            {
                "key": skill["key"],
                "name": skill["name"],
                "description": skill["description"],
                "prerequisites": skill["prerequisites"],
                "assessed": skill["assessed"],
                "ready": not waiting_on,
                "waiting_on": waiting_on,
                **states[skill["key"]],
            }
        )

    ready_next = [
        s["key"] for s in skills if s["ready"] and s["status"] == "no_evidence" and s["prerequisites"]
    ]
    review_due = [s["key"] for s in skills if s["review_due"]]
    return {
        "curriculum_version": curriculum["version"],
        "skills": skills,
        "ready_next": ready_next,
        "review_due": review_due,
    }


def choose_band(profile: dict) -> tuple[str, str]:
    status = {s["key"]: s["status"] for s in profile["skills"]}
    if status[CARDINALITY] in SECURE:
        return "stretch", "Counting out a set looks secure, so the numbers get bigger and other fruit is mixed in."
    if status[CARDINALITY] == "emerging" or status[ONE_TO_ONE] == "emerging":
        return "support", "Counting out a set is still new, so the numbers stay small and the shelf is uncluttered."
    return "core", "Gathering more evidence with numbers up to 7."


def plan_next_session(profile: dict, sessions_completed: int) -> dict:
    """Plan the three rounds of the next apple-shopping session."""
    band, reason = choose_band(profile)
    targets = BANDS[band][sessions_completed % len(BANDS[band])]
    kinds = KINDS[sessions_completed % len(KINDS)]
    distractors = band != "support"

    def shelf(kind: str, target: int, other: str | None) -> dict:
        available = {kind: max(target + 3, 8)}
        if other:
            available[other] = 4
        return available

    rounds = [
        {
            "id": "r1",
            "task_type": "produce_set",
            "target": targets[0],
            "target_kind": kinds[0],
            "representation": "numeral",
            "is_transfer": False,
            "available": shelf(kinds[0], targets[0], kinds[1] if band == "stretch" else None),
        },
        {
            "id": "r2",
            "task_type": "produce_set",
            "target": targets[1],
            "target_kind": kinds[1],
            "representation": "numeral",
            "is_transfer": True,
            "available": shelf(kinds[1], targets[1], kinds[0] if distractors else None),
        },
        {
            "id": "r3",
            "task_type": "produce_set",
            "target": targets[2],
            "target_kind": kinds[2],
            "representation": "set",
            "is_transfer": True,
            "available": shelf(kinds[2], targets[2], kinds[1] if band == "stretch" else None),
        },
    ]
    return {"activity": "apple-shopping", "band": band, "reason": reason, "rounds": rounds}
