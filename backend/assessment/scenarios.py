"""Scripted learners, used by the tests and to generate `shared/golden/`.

`Script` writes an event stream the way the game would, so a scenario reads
like a description of what a child did.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

from . import build_profile, evaluate_session, plan_next_session

T0 = datetime(2026, 10, 5, 9, 0, tzinfo=timezone.utc)


class Script:
    def __init__(self) -> None:
        self.events: list[dict] = []
        self.t = 0
        self._round: str | None = None
        self._kind = "apple"
        self._basket: list[tuple[str, str]] = []
        self._next_item = 0

    def _emit(self, etype: str, data: dict | None = None) -> None:
        self.t += 900
        self.events.append(
            {"seq": len(self.events), "type": etype, "t": self.t, "round": self._round, "data": data or {}}
        )

    def round(self, round_id, target, kind="apple", representation="numeral", transfer=False, available=None):
        self._round, self._kind, self._basket = round_id, kind, []
        self._emit(
            "round_started",
            {
                "task_type": "produce_set",
                "target": target,
                "target_kind": kind,
                "representation": representation,
                "is_transfer": transfer,
                "available": available or {kind: max(target + 3, 8)},
            },
        )
        return self

    def add(self, n=1, kind=None):
        for _ in range(n):
            self._next_item += 1
            item = f"i{self._next_item}"
            self._basket.append((item, kind or self._kind))
            self._emit("item_added", {"item": item, "kind": kind or self._kind})
        return self

    def remove(self, n=1, kind=None):
        for _ in range(n):
            index = next(i for i, (_, k) in enumerate(self._basket) if kind is None or k == kind)
            item, _ = self._basket.pop(index)
            self._emit("item_removed", {"item": item})
        return self

    def check(self, counts=None):
        if counts is None:
            counts = {}
            for _, kind in self._basket:
                counts[kind] = counts.get(kind, 0) + 1
        self._emit("check_requested", {"counts": counts})
        return self

    def hint(self, level):
        self._emit("hint_shown", {"level": level})
        return self

    def complete(self):
        self._emit("round_completed")
        return self

    def solve(self, round_id, target, **spec):
        """A round done right first time."""
        return self.round(round_id, target, **spec).add(target).check().complete()


def perfect_session(targets=(5, 3, 4), kinds=("apple", "orange", "pear")) -> list[dict]:
    script = Script()
    script.solve("r1", targets[0], kind=kinds[0])
    script.solve("r2", targets[1], kind=kinds[1], transfer=True, available={kinds[1]: 8, kinds[0]: 4})
    script.solve("r3", targets[2], kind=kinds[2], representation="set", transfer=True)
    return script.events


def session_scenarios() -> dict[str, list[dict]]:
    s: dict[str, list[dict]] = {}

    s["right_first_time_in_all_three_rounds"] = perfect_session()

    s["takes_every_apple_then_fixes_it_after_a_hint"] = (
        Script().round("r1", 5).add(8).check().hint(1).remove(3).check().complete().events
    )

    script = Script()
    script.round("r1", 5).add(3).check().hint(1).add(1).check().hint(2).add(1).check().complete()
    script.round("r2", 3, kind="orange", transfer=True, available={"orange": 8, "apple": 4}).add(4).check().hint(1)
    script.solve("r3", 4, kind="pear", representation="set", transfer=True)
    s["misses_numerals_but_matches_a_pictured_set"] = script.events

    script = Script()
    script.round("r1", 5).add(2).check().hint(1)
    script.round("r3", 4, kind="pear", representation="set", transfer=True).add(6).check().hint(1)
    s["misses_everything_so_numeral_reading_stays_unjudged"] = script.events

    s["overshoots_and_self_corrects_before_checking"] = (
        Script().round("r1", 5).add(6).remove(1).check().complete().events
    )

    s["adds_a_wrong_fruit_then_fixes_it"] = (
        Script()
        .round("r2", 3, kind="orange", transfer=True, available={"orange": 8, "apple": 4})
        .add(3)
        .add(1, kind="apple")
        .check()
        .hint(1)
        .remove(1, kind="apple")
        .check()
        .complete()
        .events
    )

    s["never_checks_so_there_is_no_evidence"] = Script().round("r1", 5).add(2).events

    s["tampered_check_is_rejected"] = Script().round("r1", 5).add(2).check({"apple": 5}).complete().events

    s["completion_without_a_correct_check_is_rejected"] = Script().round("r1", 5).add(4).check().complete().events

    return s


def _observe(history: list[tuple[float, list[dict]]]) -> list[dict]:
    """history: [(days after T0, events)] -> observations with session + time."""
    observations = []
    for index, (days, events) in enumerate(history):
        when = T0 + timedelta(days=days)
        for o in evaluate_session(events)["observations"]:
            observations.append({**o, "session": f"s{index + 1}", "observed_at": when})
    return observations


def history_scenarios() -> dict[str, dict]:
    """Each: {"observations", "now", "sessions_completed"}."""
    stumble = Script().round("r1", 5).add(8).check().hint(1).events
    supported = Script().round("r1", 5).add(8).check().hint(1).remove(3).check().complete().events
    five_apples = Script().solve("r1", 5).events
    later = perfect_session((4, 6, 3), ("pear", "apple", "orange"))

    histories = {
        "no_sessions_yet": [],
        "one_perfect_session": [(0, perfect_session())],
        "two_perfect_sessions_on_the_same_day": [(0, perfect_session()), (0.1, later)],
        "two_perfect_sessions_three_days_apart": [(0, perfect_session()), (3, later)],
        "the_same_five_apples_every_time": [(0, five_apples), (3, five_apples), (6, five_apples), (9, five_apples)],
        "only_ever_succeeds_with_help": [(0, supported), (3, supported)],
        "retained_then_slips_twice": [(0, perfect_session()), (3, later), (10, stumble), (11, stumble)],
        "one_slip_among_many_successes": [(0, perfect_session()), (3, later), (6, stumble), (7, perfect_session())],
    }
    scenarios = {}
    for name, history in histories.items():
        last_day = history[-1][0] if history else 0
        scenarios[name] = {
            "observations": _observe(history),
            "now": T0 + timedelta(days=last_day, minutes=5),
            "sessions_completed": len(history),
        }
    return scenarios


def _iso(value):
    """JSON-friendly copy, with datetimes as JavaScript-style ISO strings."""
    if isinstance(value, datetime):
        return value.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.") + f"{value.microsecond // 1000:03d}Z"
    if isinstance(value, dict):
        return {k: _iso(v) for k, v in value.items()}
    if isinstance(value, (list, tuple)):
        return [_iso(v) for v in value]
    return value


def golden(curriculum: dict) -> dict:
    """Inputs and expected outputs for every scenario, for the on-device engine."""
    sessions = [
        {"name": name, "events": events, "expected": evaluate_session(events)}
        for name, events in session_scenarios().items()
    ]
    histories = []
    for name, scenario in history_scenarios().items():
        profile = build_profile(curriculum, scenario["observations"], scenario["now"])
        histories.append(
            {
                "name": name,
                **scenario,
                "expected_profile": profile,
                "expected_plan": plan_next_session(profile, scenario["sessions_completed"]),
            }
        )
    return _iso({"curriculum_version": curriculum["version"], "sessions": sessions, "histories": histories})
