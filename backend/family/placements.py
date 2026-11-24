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


class PlacementsView(AccountBase):
    """GET: real sittings of the word check and Find my level (see the module's note on who sees what)."""

    def get(self, request):
        data = placements(request.user)
        if data["everyone"]:
            audit(request.user, "placements", detail=f"{len(data['placements'])} learners")
        return Response(data)
