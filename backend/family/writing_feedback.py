"""writing-feedback@1: short feedback from a language model on one guided writing task of the English app, or of the Tamil course
(icse-tamil@2: task ids "ta.", its own Tamil prompt; the same three pieces a learner a week across both).

Owner decisions (19 Nov 2026): a paid model may be used for this; three pieces per learner per week; a parent says yes
once per pupil before anything is sent; the API key lives only in the server environment.

How the cost is kept small and bounded:
  - one call per piece, a short fixed prompt, and a reply capped at 400 output tokens;
  - the app offers it only after its free on-device check finds nothing left to fix and the length is right;
  - the same piece (same text, same task) is never sent twice in a week: the app keeps the feedback it was given;
  - three pieces per pupil per week (OPENPATH_WRITING_FEEDBACK_WEEKLY), and a ceiling for the whole site per day;
  - its own model setting, so a small model can be used whatever the essay studio uses.

What is sent to the provider: the task's own wording (looked up here by id, never taken from the caller), the piece with
contact details removed, and the ids of the free check's notes. Never the pupil's name, the account, or any record.
What is kept: which task, a fingerprint of the text, the week, and token counts. Never the writing or the feedback.

Fails safely: off, no consent, misconfigured, over a limit, a provider error, or a reply that is not exactly the
expected shape all give a short refusal, and the task carries on with the grown-up's ticks as before.
"""

from __future__ import annotations

import datetime
import json
import re
from functools import lru_cache
from pathlib import Path

from django.conf import settings
from django.db import transaction
from django.db.models import F
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle

from evaluation import gateway, llm
from evaluation.hashing import fnv1a
from evaluation.scrub import scrub_identifiers

from .models import Pupil, WritingFeedbackConsent, WritingFeedbackUse
from .views import AccountBase

MAX_CHARS = 4_000
MET = ("yes", "partly", "no")
_PLAIN = re.compile(r"^[^<>{}\[\]\\]{1,300}$")
_NOTE_ID = re.compile(r"^[a-z-]{1,24}$")
CONTENT = Path(settings.BASE_DIR).parent / "content" / "english"


class Unusable(Exception):
    """The reply was not usable; never carries provider text."""


@lru_cache(maxsize=1)
TAMIL = CONTENT.parent / "tamil"


def tasks() -> dict:
    """The guided writing tasks, by id: only these can be given feedback. English tasks, and the Tamil course's tasks (ids "ta.")."""
    data = json.loads((CONTENT / "guided" / "tasks.json").read_text(encoding="utf-8"))
    out = {t["id"]: t for t in data["tasks"] if t.get("write")}
    tamil = json.loads((TAMIL / "writing.v1.json").read_text(encoding="utf-8"))
    out.update({t["id"]: t for t in tamil["tasks"] if t["id"].startswith("ta.")})
    return out


def is_tamil(task_id) -> bool:
    return isinstance(task_id, str) and task_id.startswith("ta.")


def prompt(task_id: str = "") -> str:
    """The server's own instructions for the model: the Tamil course's for its tasks, else the English app's."""
    return _prompt("ta" if is_tamil(task_id) else "en")


@lru_cache(maxsize=2)
def _prompt(language: str) -> str:
    if language == "ta":
        return (TAMIL / "prompts-writing-feedback.ta.v1.md").read_text(encoding="utf-8").strip()
    return (CONTENT / "prompts" / "writing-feedback.v2.md").read_text(encoding="utf-8").strip()


_TA_WORD = re.compile(r"[\u0B80-\u0BFF]+")


def word_count(task_id: str, text: str) -> int:
    if is_tamil(task_id):
        return len(_TA_WORD.findall(text))
    return len(re.findall(r"[A-Za-z][A-Za-z'’-]*", text))


def user_message(task_id: str, text: str, checked: list) -> str:
    """What the model is shown. Raises GatewayDenied for anything but a known task and a bounded, plain request."""
    task = tasks().get(task_id) if isinstance(task_id, str) else None
    if task is None or not isinstance(text, str) or not text.strip() or len(text) > MAX_CHARS:
        raise gateway.GatewayDenied("Invalid writing feedback request")
    if not isinstance(checked, list) or len(checked) > 30 or not all(isinstance(c, str) and _NOTE_ID.match(c) for c in checked):
        raise gateway.GatewayDenied("Invalid writing feedback request")
    return json.dumps({"task": task["task"], "words": task["write"], "form": task.get("form", ""), "look": task["look"], "text": scrub_identifiers(text), "checked": checked}, ensure_ascii=False)


def _config() -> llm.LLMConfig:
    return gateway.config_for("writing.feedback", llm.LLMConfig(
        provider=settings.OPENPATH_WRITING_FEEDBACK_PROVIDER,
        model=settings.OPENPATH_WRITING_FEEDBACK_MODEL,
        base_url=settings.OPENPATH_WRITING_FEEDBACK_BASE_URL,
        api_key=settings.OPENPATH_WRITING_FEEDBACK_API_KEY,
        max_output_tokens=400,
        max_input_chars=10_000,
        timeout_s=30.0,
        retries=0,
    ))


def enabled() -> str | None:
    """None when feedback can be asked for, else why not (for the developer's eyes)."""
    if settings.OPENPATH_WRITING_FEEDBACK != "on":
        return "switched off"
    try:
        problems = _config().problems()
    except gateway.GatewayDenied:
        return "AI configuration is invalid"
    return "; ".join(problems) if problems else None


def _line(value) -> str:
    if not isinstance(value, str):
        raise Unusable("not text")
    text = " ".join(value.split())[:300]
    if not text or not _PLAIN.match(text):
        raise Unusable("not plain text")
    return text


def parse(reply: str, looks: int) -> dict:
    """The model's reply → {"points": [{"met", "note"}], "strength", "next"}; anything else is Unusable."""
    try:
        data = llm.extract_json(reply)
    except Exception:
        raise Unusable("not in the expected form")
    if not isinstance(data, dict) or not isinstance(data.get("points"), list) or len(data["points"]) != looks:
        raise Unusable("not in the expected form")
    points = []
    for p in data["points"]:
        if not isinstance(p, dict) or p.get("met") not in MET:
            raise Unusable("not in the expected form")
        points.append({"met": p["met"], "note": _line(p.get("note"))})
    return {"points": points, "strength": _line(data.get("strength")), "next": _line(data.get("next"))}


def week_of(day: datetime.date) -> datetime.date:
    return day - datetime.timedelta(days=day.weekday())


def has_consent(pupil: Pupil) -> bool:
    latest = pupil.writing_feedback_consents.order_by("-recorded_at", "-id").first()
    return bool(latest and latest.granted)


def _left(pupil: Pupil) -> int:
    used = WritingFeedbackUse.objects.filter(pupil=pupil, week=week_of(timezone.localdate())).count()
    return max(0, settings.OPENPATH_WRITING_FEEDBACK_WEEKLY - used)


def _pupil(request, pupil_id) -> Pupil:
    return get_object_or_404(Pupil, pk=pupil_id, parent=request.user)


class WritingFeedbackConsentView(AccountBase):
    """POST {granted} → the parent's yes or no for this pupil. The latest answer wins."""

    def post(self, request, pupil_id):
        pupil = _pupil(request, pupil_id)
        granted = request.data.get("granted")
        if not isinstance(granted, bool):
            return Response({"detail": "Say yes or no."}, status=status.HTTP_400_BAD_REQUEST)
        WritingFeedbackConsent.objects.create(pupil=pupil, granted=granted, policy_version=settings.OPENPATH_CONSENT_POLICY_VERSION)
        return Response({"consent": granted}, status=status.HTTP_201_CREATED)


class WritingFeedbackView(AccountBase):
    """GET → {available, consent, limit, left}. POST {task, text, checked} → {points, strength, next, left}.
    Signed-in parent accounts only, for their own pupils, with the parent's yes, three pieces a week."""

    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "writing-feedback"
    # replaced in tests: no test ever calls a provider
    transport = staticmethod(llm.urllib_transport)

    def get_throttles(self):
        return super().get_throttles() if self.request.method == "POST" else []

    def get(self, request, pupil_id):
        pupil = _pupil(request, pupil_id)
        return Response({"available": enabled() is None, "consent": has_consent(pupil), "limit": settings.OPENPATH_WRITING_FEEDBACK_WEEKLY, "left": _left(pupil)})

    def post(self, request, pupil_id):
        pupil = _pupil(request, pupil_id)
        if enabled() is not None:
            return Response({"detail": "AI feedback is not switched on here."}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        if not has_consent(pupil):
            return Response({"detail": "A parent has not agreed to AI feedback for this learner."}, status=status.HTTP_403_FORBIDDEN)
        task_id, text, checked = request.data.get("task"), request.data.get("text"), request.data.get("checked", [])
        task = tasks().get(task_id) if isinstance(task_id, str) else None
        if task is None:
            return Response({"detail": "That is not a writing task."}, status=status.HTTP_400_BAD_REQUEST)
        if not isinstance(text, str) or not text.strip():
            return Response({"detail": "Write the piece first."}, status=status.HTTP_400_BAD_REQUEST)
        if len(text) > MAX_CHARS:
            return Response({"detail": "That is too long for this task."}, status=status.HTTP_400_BAD_REQUEST)
        words = word_count(task_id, text)
        if words < task["write"]["min"]:
            return Response({"detail": f"Write at least {task['write']['min']} words before asking for feedback.", "min": task["write"]["min"]}, status=status.HTTP_400_BAD_REQUEST)
        try:
            user_message(task_id, text, checked)
        except gateway.GatewayDenied:
            return Response({"detail": "That request could not be read."}, status=status.HTTP_400_BAD_REQUEST)
        week, mark = week_of(timezone.localdate()), fnv1a(" ".join(text.split()))
        # counted before the provider is called: a slow or failed call still uses one of the week's pieces
        with transaction.atomic():
            Pupil.objects.select_for_update().get(pk=pupil.pk)
            used = WritingFeedbackUse.objects.filter(pupil=pupil, week=week)
            if used.filter(task=task_id, fingerprint=mark, answered=True).exists():
                return Response({"detail": "This piece has already had its feedback. Change the writing, then ask again.", "left": _left(pupil)}, status=status.HTTP_409_CONFLICT)
            if used.count() >= settings.OPENPATH_WRITING_FEEDBACK_WEEKLY:
                return Response({"detail": f"This week's {settings.OPENPATH_WRITING_FEEDBACK_WEEKLY} pieces of AI feedback are used. More come on Monday.", "left": 0}, status=status.HTTP_429_TOO_MANY_REQUESTS)
            use = WritingFeedbackUse.objects.create(pupil=pupil, week=week, task=task_id, fingerprint=mark)
        left = _left(pupil)
        try:
            done = gateway.execute("writing.feedback", {"task": task_id, "text": text, "checked": checked}, request.user.pk, transport=self.transport)
            result = parse(done.text, len(task["look"]))
        except gateway.GatewayDenied:
            # nothing was sent, so the piece is not counted
            use.delete()
            return Response({"detail": "AI feedback is resting for today. Try again tomorrow.", "left": _left(pupil)}, status=status.HTTP_429_TOO_MANY_REQUESTS)
        except (llm.LLMError, Unusable):
            # no provider text and no reason that could carry it
            return Response({"detail": "The feedback could not be read this time. Ask a grown-up to look at the piece.", "left": left}, status=status.HTTP_502_BAD_GATEWAY)
        WritingFeedbackUse.objects.filter(pk=use.pk).update(answered=True, input_tokens=F("input_tokens") + done.input_tokens, output_tokens=F("output_tokens") + done.output_tokens)
        return Response({**result, "look": task["look"], "left": left})
