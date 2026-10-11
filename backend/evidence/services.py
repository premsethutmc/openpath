"""Glue between stored evidence and the pure assessment engine."""

from __future__ import annotations

from datetime import datetime

from django.conf import settings
from django.db import transaction
from django.utils import timezone

from assessment import ENGINE_VERSION, build_profile, evaluate_session, plan_next_session
from assessment.curriculum import load_curriculum
from learners.models import Learner

from .models import ActivitySession, InteractionEvent, Observation, SkillState


def curriculum() -> dict:
    return load_curriculum(str(settings.OPENPATH_CURRICULUM))


def learner_profile(learner: Learner, now: datetime | None = None) -> dict:
    """Recompute the learner's profile from every stored observation."""
    now = now or timezone.now()
    observations = [
        {
            "skill": o.skill,
            "outcome": o.outcome,
            "context": o.context,
            "session": o.session_id,
            "observed_at": o.observed_at,
        }
        for o in Observation.objects.filter(learner=learner, session__integrity="ok")
    ]
    return build_profile(curriculum(), observations, now)


def sessions_completed(learner: Learner) -> int:
    return ActivitySession.objects.filter(learner=learner, finished=True, integrity="ok").count()


def learner_overview(learner: Learner, now: datetime | None = None) -> dict:
    profile = learner_profile(learner, now)
    completed = sessions_completed(learner)
    return {
        "learner_id": str(learner.pk),
        "sessions_completed": completed,
        "profile": profile,
        "next_session": plan_next_session(profile, completed),
    }


def _store_skill_states(learner: Learner, profile: dict) -> list[dict]:
    """Persist the current states and report which ones changed."""
    previous = {s.skill: s.status for s in SkillState.objects.filter(learner=learner)}
    changes = []
    for skill in profile["skills"]:
        before = previous.get(skill["key"], "no_evidence")
        if before != skill["status"]:
            changes.append({"skill": skill["key"], "from": before, "to": skill["status"]})
        SkillState.objects.update_or_create(
            learner=learner,
            skill=skill["key"],
            defaults={
                "status": skill["status"],
                "next_review_at": skill["next_review_at"],
                "summary": {
                    "counts": skill["counts"],
                    "contexts": skill["contexts"],
                    "criteria": skill["criteria"],
                    "recent_accuracy": skill["recent_accuracy"],
                    "sessions_with_success": skill["sessions_with_success"],
                },
            },
        )
    return changes


@transaction.atomic
def record_session(learner: Learner, client_session_id, payload: dict) -> dict:
    """Store (or replace) one session's events and reassess the learner.

    The client may send the same session several times as it progresses; each
    upload replaces the last, so the operation is idempotent.
    """
    # Serialise uploads per learner so concurrent requests cannot interleave.
    Learner.objects.select_for_update().get(pk=learner.pk)

    now = timezone.now()
    client_time = payload.get("ended_at")
    observed_at = client_time if (settings.OPENPATH_TRUST_CLIENT_CLOCK and client_time) else now

    session, created = ActivitySession.objects.get_or_create(
        learner=learner,
        client_session_id=client_session_id,
        defaults={"activity": payload["activity"], "observed_at": observed_at},
    )
    if not created:
        session.events.all().delete()
        session.observations.all().delete()
        if settings.OPENPATH_TRUST_CLIENT_CLOCK and client_time:
            session.observed_at = client_time

    result = evaluate_session(payload["events"])
    session.activity = payload["activity"]
    session.activity_version = payload.get("activity_version", "")
    session.plan = payload.get("plan") or {}
    session.finished = bool(payload.get("finished"))
    session.integrity = result["integrity"]
    session.problems = result["problems"]
    session.engine_version = ENGINE_VERSION
    session.save()

    InteractionEvent.objects.bulk_create(
        InteractionEvent(
            session=session, seq=e["seq"], type=e["type"], t=e["t"], round=e.get("round"), data=e.get("data") or {}
        )
        for e in payload["events"]
    )
    Observation.objects.bulk_create(
        Observation(learner=learner, session=session, observed_at=session.observed_at, **o)
        for o in result["observations"]
    )

    # Assess "as of" the session, so a reviewer simulating a later day sees
    # the profile that day would produce.
    as_of = max(now, session.observed_at)
    overview = learner_overview(learner, as_of)
    changes = _store_skill_states(learner, overview["profile"])
    return {
        "session": {
            "client_session_id": str(session.client_session_id),
            "integrity": session.integrity,
            "problems": session.problems,
            "rounds": result["rounds"],
        },
        "observations": result["observations"],
        "changes": changes,
        **overview,
    }


def reassess(learner: Learner) -> None:
    """Rebuild observations and skill states from raw events."""
    with transaction.atomic():
        for session in ActivitySession.objects.filter(learner=learner):
            events = list(session.events.values("seq", "type", "t", "round", "data"))
            result = evaluate_session(events)
            session.observations.all().delete()
            session.integrity = result["integrity"]
            session.problems = result["problems"]
            session.engine_version = ENGINE_VERSION
            session.save()
            Observation.objects.bulk_create(
                Observation(learner=learner, session=session, observed_at=session.observed_at, **o)
                for o in result["observations"]
            )
        _store_skill_states(learner, learner_profile(learner))


def export_learner(learner: Learner) -> dict:
    """Everything the system holds about one learner, in portable JSON."""
    return {
        "format": "openpath-export/1",
        "exported_at": timezone.now(),
        "learner_id": str(learner.pk),
        "created_at": learner.created_at,
        "consents": list(learner.consents.values("given_by", "policy_version", "given_at")),
        "sessions": [
            {
                "client_session_id": str(s.client_session_id),
                "activity": s.activity,
                "activity_version": s.activity_version,
                "plan": s.plan,
                "finished": s.finished,
                "integrity": s.integrity,
                "observed_at": s.observed_at,
                "events": list(s.events.values("seq", "type", "t", "round", "data")),
                "observations": list(
                    s.observations.values("skill", "outcome", "round", "context", "is_transfer", "rule", "detail")
                ),
            }
            for s in learner.sessions.order_by("observed_at", "id")
        ],
        "profile": learner_profile(learner),
    }
