"""Rules for "produce a set of N objects" tasks.

This is the classic give-N task: the learner is shown a quantity (as a numeral
or as a pictured set) and builds a matching set, then decides for themselves
when they are done. The apple-shopping activity is one skin over it.

Round outcome
    independent  the first time the learner said "done", the set was right
    supported    wrong at first, right after feedback or a hint
    not_yet      checked at least once and never got there
    (none)       never checked: no evidence either way

What each outcome is evidence of
    cardinality          numeral rounds only. Stopping at exactly N on their
                         own is the behaviour that defines it.
    one_to_one           any round they complete. A miss only counts against
                         it in "set" rounds, where pairing one object to one
                         picture is the whole task; in numeral rounds a miss
                         could be a reading or a stopping problem instead.
    numeral_recognition  an independent numeral round counts for it. A missed
                         numeral round only counts against it when the same
                         session shows the learner can build a set without a
                         numeral (the differential rule) - otherwise the miss
                         is ambiguous and nothing is recorded.
    quantity transfer    rounds flagged is_transfer: a number, object or
                         representation the learner has not just practised.
"""

from __future__ import annotations

TASK_TYPE = "produce_set"

NUMERAL = "math.number.numeral_recognition"
ONE_TO_ONE = "math.counting.one_to_one"
CARDINALITY = "math.counting.cardinality"
TRANSFER = "math.quantity.transfer"


def _show(counts: dict[str, int]) -> str:
    return ", ".join(f"{count} {kind}" for kind, count in sorted(counts.items())) or "nothing"


def summarize(events: list[dict]) -> dict:
    """Replay one round's events and describe what happened."""
    start = events[0]
    spec = start["data"]
    target = spec["target"]
    kind = spec["target_kind"]
    available = dict(spec.get("available", {}))

    problems: list[str] = []
    basket: dict[str, str] = {}  # item id -> kind
    checks: list[dict] = []
    hints: list[int] = []
    removals = 0
    wrong_kind_adds = 0
    max_in_basket = 0
    completed = False
    solved_at_check: int | None = None

    def counts() -> dict[str, int]:
        result: dict[str, int] = {}
        for item_kind in basket.values():
            result[item_kind] = result.get(item_kind, 0) + 1
        return result

    for event in events[1:]:
        etype = event["type"]
        data = event.get("data") or {}
        if etype == "item_added":
            item, item_kind = data.get("item"), data.get("kind")
            if item in basket:
                problems.append(f"item {item} added twice")
                continue
            if item_kind not in available:
                problems.append(f"item kind {item_kind} was not on offer")
                continue
            basket[item] = item_kind
            if counts()[item_kind] > available[item_kind]:
                problems.append(f"more {item_kind} added than were on offer")
            if item_kind != kind:
                wrong_kind_adds += 1
            max_in_basket = max(max_in_basket, len(basket))
        elif etype == "item_removed":
            item = data.get("item")
            if item not in basket:
                problems.append(f"item {item} removed but was not in the basket")
                continue
            del basket[item]
            removals += 1
        elif etype == "check_requested":
            replayed = counts()
            claimed = {k: v for k, v in (data.get("counts") or {}).items() if v}
            if claimed != replayed:
                problems.append(f"check reported {_show(claimed)} but replay gives {_show(replayed)}")
            n_target = replayed.get(kind, 0)
            n_other = sum(v for k, v in replayed.items() if k != kind)
            correct = n_target == target and n_other == 0
            checks.append(
                {
                    "count": n_target,
                    "other": n_other,
                    "correct": correct,
                    "hint_level_before": max(hints) if hints else 0,
                    "t": event["t"],
                }
            )
            if correct and solved_at_check is None:
                solved_at_check = len(checks) - 1
        elif etype == "hint_shown":
            hints.append(int(data.get("level", 1)))
        elif etype == "round_completed":
            completed = True

    if completed and solved_at_check is None:
        problems.append("round marked complete without a correct check")

    if not checks:
        outcome = None
    elif checks[0]["correct"]:
        outcome = "independent"
    elif solved_at_check is not None:
        outcome = "supported"
    else:
        outcome = "not_yet"

    first = checks[0] if checks else None
    error = None
    if first and not first["correct"]:
        if first["count"] == 0 and first["other"] == 0:
            error = "empty"
        elif first["other"] > 0 and first["count"] == target:
            error = "wrong_kind"
        elif first["count"] >= available.get(kind, target) and first["count"] > target:
            error = "took_all"
        elif first["count"] > target:
            error = "too_many"
        elif first["count"] < target:
            error = "too_few"
        else:
            error = "wrong_kind"

    return {
        "round": start["round"],
        "task_type": TASK_TYPE,
        "target": target,
        "target_kind": kind,
        "representation": spec.get("representation", "numeral"),
        "is_transfer": bool(spec.get("is_transfer", False)),
        "context": f"{spec.get('representation', 'numeral')}:{kind}:{target}",
        "outcome": outcome,
        "first_check_count": first["count"] if first else None,
        "first_error": error,
        "checks": len(checks),
        "wrong_checks": sum(1 for c in checks if not c["correct"]),
        "max_hint_level": max(hints) if hints else 0,
        "removals": removals,
        "wrong_kind_adds": wrong_kind_adds,
        "max_in_basket": max_in_basket,
        "self_corrected": bool(first and first["correct"] and (removals > 0 or wrong_kind_adds > 0)),
        "completed": completed,
        "duration_ms": events[-1]["t"] - start["t"],
        "problems": problems,
    }


def _observation(summary: dict, skill: str, outcome: str, rule: str) -> dict:
    return {
        "skill": skill,
        "outcome": outcome,
        "round": summary["round"],
        "context": summary["context"],
        "is_transfer": summary["is_transfer"],
        "rule": rule,
        "detail": {
            "target": summary["target"],
            "first_check_count": summary["first_check_count"],
            "first_error": summary["first_error"],
            "checks": summary["checks"],
            "max_hint_level": summary["max_hint_level"],
            "self_corrected": summary["self_corrected"],
        },
    }


def observe(summaries: list[dict]) -> list[dict]:
    """Apply the rules to every produce_set round of one session."""
    observations: list[dict] = []
    built_a_set_unaided = any(
        s["representation"] == "set" and s["outcome"] == "independent" for s in summaries
    )

    for s in summaries:
        outcome = s["outcome"]
        if outcome is None:
            continue
        numeral_round = s["representation"] == "numeral"

        if numeral_round:
            observations.append(_observation(s, CARDINALITY, outcome, "produce_set.cardinality"))
            if outcome == "independent":
                observations.append(_observation(s, NUMERAL, "independent", "produce_set.numeral"))
            elif built_a_set_unaided:
                observations.append(_observation(s, NUMERAL, "not_yet", "produce_set.numeral_differential"))

        if outcome in ("independent", "supported"):
            observations.append(_observation(s, ONE_TO_ONE, outcome, "produce_set.one_to_one"))
        elif not numeral_round:
            observations.append(_observation(s, ONE_TO_ONE, "not_yet", "produce_set.one_to_one"))

        if s["is_transfer"]:
            observations.append(_observation(s, TRANSFER, outcome, "produce_set.transfer"))

    return observations
