"""
English usage, counts only (english-usage@1): how many children use each daily activity, how many sittings are
started and finished, how much is right and how long a sitting takes. Read from the synced pupil events of accounts
(a phone without an account keeps its records to itself and is not counted). No names, no typed words, no writing:
only counts, medians and rates, so the summary can be printed in the server log.
"""
from __future__ import annotations

from collections import defaultdict
from datetime import timedelta
from statistics import median

from django.utils import timezone

from .models import PupilEvent

# activity: (event kinds, how a record is read)
ACTIVITIES = [
    ("First words", "first_words"),
    ("Words", "word_learn"),
    ("Reading", "reading"),
    ("Listen and write", "dictation"),
    ("Listen and answer", "listen_passage"),
    ("Spelling", "spell"),
    ("Grammar", "grammar_use"),
    ("Syllabus tasks", "guided_task"),
    ("Find my level", "level_check"),
]
SPELL = {"spell_session", "spell_answer", "spell_end"}
MAX_SITTING = timedelta(minutes=60)


def _row():
    return {"pupils": set(), "days": set(), "started": 0, "finished": 0, "answers": 0, "right": 0, "spans": defaultdict(list)}


def usage(days: int = 30, now=None) -> dict:
    now = now or timezone.now()
    since = now - timedelta(days=days)
    rows = {name: _row() for name, _ in ACTIVITIES}
    by_kind = {kind: name for name, kind in ACTIVITIES}
    active7, active = set(), set()
    pupil_days = defaultdict(set)
    events = PupilEvent.objects.filter(subject="english", occurred_at__gte=since, occurred_at__lte=now).order_by("pupil", "seq").values_list("pupil_id", "kind", "occurred_at", "body")
    for pupil, kind, at, body in events.iterator():
        name = by_kind.get("spell" if kind in SPELL else kind)
        if not name:
            continue
        r = rows[name]
        day = at.date().isoformat()
        r["pupils"].add(pupil)
        r["days"].add((pupil, day))
        active.add(pupil)
        pupil_days[pupil].add(day)
        if now - at < timedelta(days=7):
            active7.add(pupil)
        rec = body.get("record") if isinstance(body, dict) else None
        rec = rec if isinstance(rec, dict) else {}
        t = rec.get("type")
        sitting = rec.get("sitting") or (body.get("session") if isinstance(body, dict) else None)
        if sitting:
            r["spans"][(pupil, sitting)].append(at)
        if kind in ("dictation", "grammar_use"):
            r["started"] += t == "start"
            r["finished"] += t == "end"
            if t == "answer":
                r["answers"] += 1
                r["right"] += bool(rec.get("perfectFirst") if kind == "dictation" else rec.get("correct"))
        elif kind == "first_words":
            r["finished"] += t == "end"
            if t == "step":
                r["answers"] += 1
                r["right"] += bool(rec.get("correct"))
        elif kind == "listen_passage" and t == "result":
            r["started"] += 1
            r["finished"] += 1
            r["answers"] += len(rec.get("answers") or [])
            r["right"] += int(rec.get("right") or 0)
        elif kind == "word_learn" and t == "result":
            r["answers"] += 1
            r["right"] += bool(rec.get("clean"))
        elif kind == "reading":
            r["started"] += t == "unit_start"
            if t == "check_result":
                r["finished"] += 1
                r["answers"] += 1
                r["right"] += bool(rec.get("passed"))
        elif kind in SPELL:
            r["started"] += kind == "spell_session"
            r["finished"] += kind == "spell_end" and body.get("reason") == "finished"
            if kind == "spell_answer":
                r["answers"] += 1
                r["right"] += bool(body.get("correct"))
        elif kind == "guided_task" and t == "done":
            r["finished"] += 1
        elif kind == "level_check":
            r["started"] += t == "start"
            r["finished"] += t == "done"
    out = []
    for name, _ in ACTIVITIES:
        r = rows[name]
        spans = [max(ts) - min(ts) for ts in r["spans"].values() if len(ts) > 1]
        spans = [s for s in spans if s <= MAX_SITTING]
        if name in ("First words",):
            r["started"] = len(r["spans"])
        out.append(
            {
                "activity": name,
                "children": len(r["pupils"]),
                "child_days": len(r["days"]),
                "started": r["started"],
                "finished": r["finished"],
                "answers": r["answers"],
                "right_pct": round(100 * r["right"] / r["answers"]) if r["answers"] else None,
                "median_minutes": round(median(s.total_seconds() for s in spans) / 60, 1) if spans else None,
            }
        )
    return {
        "days": days,
        "children_active": len(active),
        "children_active_last_7_days": len(active7),
        "median_days_active": median(len(d) for d in pupil_days.values()) if pupil_days else 0,
        "activities": out,
    }


def as_text(u: dict) -> str:
    lines = [
        f"english-usage@1 last {u['days']} days: {u['children_active']} children active ({u['children_active_last_7_days']} in the last 7 days); median days active {u['median_days_active']}",
        "activity | children | child-days | started | finished | answers | right % | median minutes",
    ]
    for a in u["activities"]:
        cell = lambda v: "-" if v is None else str(v)
        lines.append(" | ".join([a["activity"], *(cell(a[k]) for k in ("children", "child_days", "started", "finished", "answers", "right_pct", "median_minutes"))]))
    return "\n".join(lines)
