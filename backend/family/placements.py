"""
Real placements, for checking Find my level against real people (placements@1).

GET /placements/ lists every sitting of the English word check and of Find my level in the last days, by learner, with
the level given and the answers behind it, so a placement can be compared with what is known about the person.

Who sees what:

- every signed-in account sees its own learners, by name, with the words asked
- the owner (OPENPATH_OWNER_EMAILS), an administrator or an authorised developer also sees learners a parent shared
  for diagnostics (by name, with the words) and every other learner WITHOUT a name and without the words: only the
  level given and, for each answer, its level and whether it was right

Nothing a learner typed is ever included: a step holds the word or sentence that was asked (content of the app), its
level and the outcome. Reads of other accounts' learners are written to the diagnostic access log.
"""
from __future__ import annotations

from datetime import timedelta

from django.conf import settings
from django.utils import timezone
from rest_framework.response import Response

from .developer import audit, is_developer
from .models import Pupil, PupilEvent
from .views import AccountBase

KINDS = ["vocab", "level_check"]
PARTS = {"reading", "listening", "spelling", "grammar", "gaps"}
MAX_LEARNERS = 200


def sees_all(user) -> bool:
    email = (user.email or user.username or "").strip().lower()
    return bool(user.is_superuser or email in getattr(settings, "OWNER_EMAILS", ()) or is_developer(user))


def _iso(at) -> str:
    return at.isoformat().replace("+00:00", "Z")


def _step(s: dict, words: bool) -> dict:
    """One answer: its level and outcome, and (for a learner the reader may see in full) what was asked."""
    if "asked" in s:  # a reading text: several questions at one level
        return {"level": s.get("level"), "right": s.get("right"), "asked": s.get("asked")}
    right = s.get("correct", s.get("perfect"))
    asked = s.get("word") or s.get("id")
    return {"level": s.get("level"), "right": bool(right), **({"asked": str(asked)[:60]} if words and asked else {})}


def sittings(events, words: bool) -> list[dict]:
    """The sittings in a learner's events (kind, time, body), oldest first."""
    out: list[dict] = []
    open_words: dict | None = None
    mode = None
    for kind, at, body in events:
        r = body.get("record") if isinstance(body, dict) else None
        if not isinstance(r, dict):
            continue
        t = r.get("type")
        if kind == "vocab":
            if t == "start":
                open_words = {"part": "words", "at": _iso(at), "check": str(r.get("check", "")), "start": r.get("band"), "level": None, "answers": []}
                out.append(open_words)
            elif t == "answer" and open_words is not None:
                a = {"level": r.get("band"), "kind": r.get("kind"), "outcome": r.get("outcome")}
                if words and r.get("word"):
                    a["asked"] = str(r["word"])[:40]
                open_words["answers"].append(a)
            elif t == "result" and open_words is not None:
                open_words.update({"level": r.get("band"), "low": r.get("low"), "high": r.get("high"), "finished": True})
                open_words = None
        elif kind == "level_check":
            if t == "start":
                mode = r.get("mode")
            elif t in PARTS:
                level = r.get("passed") if t == "reading" else r.get("level")
                out.append({"part": t, "at": _iso(at), "mode": mode, "level": level, "check": r.get("check"), "answers": [_step(s, words) for s in r.get("steps") or [] if isinstance(s, dict)], "finished": True})
    return out


def placements(user, days: int = 60, now=None) -> dict:
    now = now or timezone.now()
    since = now - timedelta(days=days)
    everyone = sees_all(user)
    pupils = Pupil.objects.all() if everyone else Pupil.objects.filter(parent=user)
    with_events = PupilEvent.objects.filter(subject="english", kind__in=KINDS, occurred_at__gte=since, occurred_at__lte=now)
    pupils = pupils.filter(id__in=with_events.values("pupil_id")).select_related("parent")[:MAX_LEARNERS]
    learners = []
    unnamed = 0
    for p in pupils:
        mine = p.parent_id == user.id
        full = mine or p.shared_for_diagnostics
        if not full:
            unnamed += 1
        events = with_events.filter(pupil=p).order_by("seq").values_list("kind", "occurred_at", "body")
        rows = sittings(events.iterator(), words=full)
        if not rows:
            continue
        learners.append({"learner": p.display_name if full else f"Learner {unnamed}", "mine": mine, "shared": bool(p.shared_for_diagnostics and not mine), "sittings": rows, "last": rows[-1]["at"]})
    learners.sort(key=lambda x: x["last"], reverse=True)
    return {"placements": learners, "days": days, "everyone": everyone}


# ---------------------------------------------------------------- the server log (placements-log@1)
#
# The same sittings as lines of text for the server's own log, which only the people who run the server can read.
# This is how placements are checked during development without anyone copying them out by hand. No names at all:
# learners are numbered. The words asked are included only for learners on an owner's, administrator's or
# developer's own account and for learners a parent shared for diagnostics; for everyone else, only each answer's
# level and outcome. Nothing a learner typed is included.

TAG = "placements@1 |"
PART_NAMES = {"words": "Word check", "gaps": "Quick check", "reading": "Reading", "listening": "Listening", "spelling": "Spelling", "grammar": "Grammar"}


def _right(a: dict) -> bool:
    if a.get("outcome"):
        return a["outcome"] == "no" if a.get("level") == 0 else a["outcome"] in ("yes", "right")
    return a.get("right") is True


def _by_level(answers: list[dict]) -> str:
    real = [a for a in answers if a.get("level") not in (0, None)]
    out = []
    for level in sorted({a["level"] for a in real}):
        at = [a for a in real if a["level"] == level]
        marks = "".join(f" {a['right']}/{a['asked']}" if isinstance(a.get("right"), int) and not isinstance(a.get("right"), bool) else ("Y" if _right(a) else "n") for a in at)
        out.append(f"L{level} {marks.strip()}")
    return " ".join(out)


def _say(a: dict) -> str:
    return {"yes": "said-knows", "no": "said-not", "unknown": "unsure"}.get(a.get("outcome"), "right" if _right(a) else "wrong")


def log_lines(days: int = 14, now=None) -> list[str]:
    now = now or timezone.now()
    since = now - timedelta(days=days)
    with_events = PupilEvent.objects.filter(subject="english", kind__in=KINDS, occurred_at__gte=since, occurred_at__lte=now)
    pupils = Pupil.objects.filter(id__in=with_events.values("pupil_id")).select_related("parent").order_by("created_at", "id")[:MAX_LEARNERS]
    lines = [f"{TAG} word check and Find my level, last {days} days, {now.isoformat()[:16]} UTC; owner accounts configured: {len(getattr(settings, 'OWNER_EMAILS', ()))}"]
    for n, p in enumerate(pupils, start=1):
        own = sees_all(p.parent)
        full = own or p.shared_for_diagnostics
        rows = sittings(with_events.filter(pupil=p).order_by("seq").values_list("kind", "occurred_at", "body").iterator(), words=full)
        if not rows:
            continue
        lines.append(f"{TAG} Learner {n}{' (owner account)' if own else ' (shared)' if full else ''}")
        for s in rows:
            level = "not finished" if s.get("level") is None else f"level {s['level']}"
            span = f" ({s['low']}-{s['high']})" if isinstance(s.get("low"), (int, float)) and isinstance(s.get("high"), (int, float)) else ""
            start = f" start {s['start']}" if s.get("start") is not None else ""
            fake = [a for a in s["answers"] if a.get("level") == 0]
            claimed = f" invented-claimed {sum(a.get('outcome') == 'yes' for a in fake)}/{len(fake)}" if fake else ""
            lines.append(f"{TAG}   {PART_NAMES[s['part']]} {s['at'][:16]} {level}{span}{start} answers {len(s['answers'])}{claimed} | {_by_level(s['answers'])}")
            asked = [f"{a['asked']}({'inv' if a.get('level') == 0 else a.get('level')}){_say(a)}" for a in s["answers"] if isinstance(a.get("asked"), str)]
            for i in range(0, len(asked), 12):
                lines.append(f"{TAG}     {' '.join(asked[i:i + 12])}")
    return lines


class PlacementsView(AccountBase):
    """GET: real sittings of the word check and Find my level (see the module's note on who sees what)."""

    def get(self, request):
        data = placements(request.user)
        if data["everyone"]:
            audit(request.user, "placements", detail=f"{len(data['placements'])} learners")
        return Response(data)
