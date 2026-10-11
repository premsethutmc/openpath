"""Turn a session's raw interaction events into skill observations.

The engine never trusts the game's own idea of "correct". It replays the
events, rebuilds what was in the basket at each check, and applies the rules
registered for the round's task type. A session whose events do not replay
cleanly produces no observations at all.

Event shape (activity-agnostic):
    {"seq": int, "type": str, "t": int ms from session start,
     "round": str | None, "data": dict}
"""

from __future__ import annotations

from .rules import RULES


def split_rounds(events: list[dict]) -> list[list[dict]]:
    """Group events by round, in the order rounds started."""
    ordered = sorted(events, key=lambda e: e["seq"])
    rounds: dict[str, list[dict]] = {}
    for event in ordered:
        round_id = event.get("round")
        if round_id is None:
            continue
        rounds.setdefault(round_id, []).append(event)
    return list(rounds.values())


def evaluate_session(events: list[dict]) -> dict:
    """Return {"integrity", "problems", "rounds", "observations"}.

    integrity is "ok" or "inconsistent". Observations are only produced for
    sessions that replay cleanly.
    """
    summaries: list[dict] = []
    problems: list[str] = []

    for round_events in split_rounds(events):
        start = round_events[0]
        if start["type"] != "round_started":
            problems.append(f"round {start.get('round')}: first event is not round_started")
            continue
        task_type = start["data"].get("task_type")
        rule = RULES.get(task_type)
        if rule is None:
            problems.append(f"round {start['round']}: unknown task type {task_type}")
            continue
        summary = rule.summarize(round_events)
        problems.extend(f"round {summary['round']}: {p}" for p in summary["problems"])
        summaries.append(summary)

    if problems:
        return {"integrity": "inconsistent", "problems": problems, "rounds": summaries, "observations": []}

    observations: list[dict] = []
    by_task: dict[str, list[dict]] = {}
    for summary in summaries:
        by_task.setdefault(summary["task_type"], []).append(summary)
    for task_type, task_summaries in by_task.items():
        observations.extend(RULES[task_type].observe(task_summaries))

    order = {s["round"]: i for i, s in enumerate(summaries)}
    observations.sort(key=lambda o: (order[o["round"]], o["skill"]))
    return {"integrity": "ok", "problems": [], "rounds": summaries, "observations": observations}
