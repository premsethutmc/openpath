"""Free-form evaluation gateway (E3a).

    PurposeConsent     consent for one specific purpose, recorded separately from enrolment consent.
                       The latest record for a purpose wins, so consent can be withdrawn.
    EvaluationRecord   one request that reached the gateway: what was sent on (after identifier
                       removal), to which adapter, and what came back, or why it was refused.

No live LLM provider exists in E3a. The record keeps provenance so that any proposal can be traced to
the protocol, adapter and request that produced it.
"""

from django.conf import settings
from django.db import models

from learners.models import Learner

AI_EVALUATION = "ai_evaluation_of_writing"


class PurposeConsent(models.Model):
    PURPOSES = [(AI_EVALUATION, "AI evaluation of written answers")]
    GIVEN_BY = [("guardian", "Parent or guardian"), ("school", "School")]

    learner = models.ForeignKey(Learner, on_delete=models.CASCADE, related_name="purpose_consents")
    purpose = models.CharField(max_length=40, choices=PURPOSES)
    granted = models.BooleanField()
    given_by = models.CharField(max_length=16, choices=GIVEN_BY)
    policy_version = models.CharField(max_length=40)
    recorded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["recorded_at", "id"]


class EvaluationRecord(models.Model):
    STATUS = [("answered", "Answered"), ("refused", "Refused"), ("failed", "Failed")]

    learner = models.ForeignKey(Learner, on_delete=models.CASCADE, related_name="evaluations")
    protocol = models.CharField(max_length=24)
    item_id = models.CharField(max_length=80)
    item_version = models.PositiveIntegerField()
    fingerprint = models.CharField(max_length=160)
    request = models.JSONField(help_text="The request as forwarded, after identifier removal.")
    adapter = models.CharField(max_length=24)
    status = models.CharField(max_length=16, choices=STATUS)
    reason = models.CharField(max_length=200, blank=True)
    proposal = models.JSONField(null=True, blank=True, help_text="Exactly what the adapter returned. Untrusted.")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at", "id"]


class EssayEvaluationRecord(models.Model):
    """One essay evaluation request (Essay Intelligence v2; synthetic test data only).

    Metadata only: never the essay, the rewrite, the request or the model's output, and never a credential.
    It keeps enough to trace provenance (protocol, adapter, model, rubric, text fingerprint) and to enforce the
    daily request and token limits."""

    STATUS = [("answered", "Answered"), ("refused", "Refused"), ("failed", "Failed")]

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="essay_evaluations")
    task = models.CharField(max_length=12)
    protocol = models.CharField(max_length=24)
    adapter = models.CharField(max_length=16)
    model = models.CharField(max_length=80, blank=True)
    rubric = models.CharField(max_length=60, blank=True)
    fingerprint = models.CharField(max_length=40, blank=True)
    text_chars = models.PositiveIntegerField(default=0)
    status = models.CharField(max_length=16, choices=STATUS)
    reason = models.CharField(max_length=200, blank=True)
    input_tokens = models.PositiveIntegerField(default=0)
    output_tokens = models.PositiveIntegerField(default=0)
    latency_ms = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at", "id"]
