"""reading-ai@1: a second check by the AI on a typed reading answer that the on-device rules marked wrong.

Owner decision (21 Nov 2026): try it and measure whether it helps; a separate bucket from writing feedback.
  - off unless OPENPATH_READING_AI=on and the writing-feedback model and key are set;
  - only for a signed-in parent account's own pupil, after a parent's yes for this (its own yes, recorded with the
    policy "reading-ai@1"; the writing-feedback yes does not count for it);
  - limits: OPENPATH_READING_AI_DAILY per account and OPENPATH_READING_AI_SITE_DAILY for the site, per day;
  - only a known question id and a short answer are accepted; the passage, question and model answer are the
    server's own; names, e-mail addresses and phone numbers are removed; the answer is never stored;
  - the reply must be exactly {"right": true|false}: anything else counts as no second check.
"""

import json
import re
from functools import lru_cache
from pathlib import Path

from django.conf import settings
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle

from evaluation import gateway, llm
from .models import Pupil, WritingFeedbackConsent
from .views import AccountBase
from .writing_feedback import _config as _wf_config, scrub_identifiers

POLICY = "reading-ai@1"
MAX_ANSWER = 300
CONTENT = Path(__file__).resolve().parents[2] / "content" / "english" / "reading"

PROMPT = (
    "You mark a child's short answer to a reading question. You are given the passage, the question, a model answer "
    "and the child's answer. Decide whether the child's answer means the same as the model answer and is supported "
    "by the passage. Ignore spelling and grammar. An answer that names a wrong fact, gives two choices, or denies the "
    "right fact is not right. Reply with JSON only: {\"right\": true} or {\"right\": false}."
)


@lru_cache(maxsize=1)
def items() -> dict:
    passages = {}
    for n in range(1, 7):
        for p in json.loads((CONTENT / f"level-{n}.json").read_text("utf-8"))["passages"]:
            passages[p["id"]] = p["text"]
    out = {}
    for it in json.loads((CONTENT / "written-answers.json").read_text("utf-8"))["items"]:
        out[it["id"]] = {"passage": passages[it["passage"]], "question": it["question"], "model_answer": it["model"]}
    return out


def user_message(item_id, answer) -> str:
    it = items().get(item_id) if isinstance(item_id, str) else None
    if it is None or not isinstance(answer, str) or not answer.strip() or len(answer) > MAX_ANSWER:
        raise gateway.GatewayDenied("Invalid reading answer request")
    return json.dumps({**it, "child_answer": scrub_identifiers(" ".join(answer.split()))}, ensure_ascii=False)


def _config() -> llm.LLMConfig:
    from dataclasses import replace
    return replace(_wf_config(), max_output_tokens=60, timeout_s=20.0)


def enabled() -> str | None:
    if settings.OPENPATH_READING_AI != "on":
        return "switched off"
    try:
        problems = _config().problems()
    except gateway.GatewayDenied:
        return "AI configuration is invalid"
    return "; ".join(problems) if problems else None


def has_consent(pupil: Pupil) -> bool:
    latest = pupil.writing_feedback_consents.filter(policy_version=POLICY).order_by("-recorded_at", "-id").first()
    return bool(latest and latest.granted)


def parse(text: str) -> bool:
    data = llm.extract_json(text)
    if not isinstance(data, dict) or not isinstance(data.get("right"), bool):
        raise ValueError("not in the expected form")
    return data["right"]


def _pupil(request, pupil_id) -> Pupil:
    return get_object_or_404(Pupil, pk=pupil_id, parent=request.user)


class ReadingAiConsentView(AccountBase):
    """POST {granted} → a parent's yes or no to a second AI check on this pupil's typed reading answers."""

    def post(self, request, pupil_id):
        pupil = _pupil(request, pupil_id)
        granted = request.data.get("granted")
        if not isinstance(granted, bool):
            return Response({"detail": "Say yes or no."}, status=status.HTTP_400_BAD_REQUEST)
        WritingFeedbackConsent.objects.create(pupil=pupil, granted=granted, policy_version=POLICY)
        return Response({"consent": granted}, status=status.HTTP_201_CREATED)


class ReadingAiView(AccountBase):
    """GET → {available, consent}. POST {item, answer} → {right}. Nothing typed is stored."""

    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "reading-ai"
    transport = staticmethod(llm.urllib_transport)

    def get_throttles(self):
        return super().get_throttles() if self.request.method == "POST" else []

    def get(self, request, pupil_id):
        pupil = _pupil(request, pupil_id)
        return Response({"available": enabled() is None, "consent": has_consent(pupil)})

    def post(self, request, pupil_id):
        pupil = _pupil(request, pupil_id)
        if enabled() is not None:
            return Response({"detail": "Not switched on here."}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        if not has_consent(pupil):
            return Response({"detail": "A parent has not agreed."}, status=status.HTTP_403_FORBIDDEN)
        item, answer = request.data.get("item"), request.data.get("answer")
        try:
            user_message(item, answer)
        except gateway.GatewayDenied:
            return Response({"detail": "That request could not be read."}, status=status.HTTP_400_BAD_REQUEST)
        try:
            done = gateway.execute("reading.answer", {"item": item, "answer": answer}, request.user.pk, transport=self.transport)
            right = parse(done.text)
        except gateway.GatewayDenied:
            return Response({"detail": "Resting for today."}, status=status.HTTP_429_TOO_MANY_REQUESTS)
        except (llm.LLMError, ValueError):
            return Response({"detail": "No second check this time."}, status=status.HTTP_502_BAD_GATEWAY)
        return Response({"right": right})
