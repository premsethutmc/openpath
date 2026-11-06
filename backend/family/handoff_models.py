"""recovery-handoff@0 (RESEARCH, deep-recovery@0): the model behind family/handoff.py. Imported once from models.py so Django registers it."""
from __future__ import annotations

from django.conf import settings
from django.db import models

from .models import Pupil


class RecoveryHandoff(models.Model):
    """A deep recovery that stopped without teaching the learner through (blocked or escalated), kept so the educator the parent shared this
    pupil with (MarkingShare) sees which learner needs help, on which skill, and why. It is NOT a mark, NOT evidence and NOT mastery; resolving
    it changes nothing in the learner's records. At most one open item per pupil and original skill; a re-report updates that item."""

    REASONS = [
        ("missing-content", "OpenPath has no teachable content for the step"),
        ("no-fresh-question", "No fresh question tests the same skill"),
        ("teaching-not-worked", "Teaching did not work"),
        ("budget-exhausted", "The recovery used its effort limit"),
        ("unsettled", "The recovery could not settle on a next step"),
    ]
    pupil = models.ForeignKey(Pupil, on_delete=models.CASCADE, related_name="recovery_handoffs")
    skill = models.CharField(max_length=120)
    original = models.CharField(max_length=120)
    episode = models.CharField(max_length=200)
    step = models.CharField(max_length=120, blank=True, default="")
    reason = models.CharField(max_length=24, choices=REASONS)
    detail = models.TextField(max_length=1000)
    path = models.JSONField(default=list)
    created_at = models.DateTimeField(auto_now_add=True)
    reported_at = models.DateTimeField()
    reports = models.PositiveIntegerField(default=1)
    resolved_at = models.DateTimeField(null=True, blank=True)
    resolved_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="+")
    note = models.TextField(max_length=1000, blank=True, default="")

    class Meta:
        app_label = "family"
        ordering = ["created_at", "id"]
        constraints = [models.UniqueConstraint(fields=["pupil", "skill"], condition=models.Q(resolved_at__isnull=True), name="one_open_recovery_handoff_per_skill")]


class RecoveryAnswersShare(models.Model):
    """recovery-handoff@0 (RESEARCH): a parent's SEPARATE, explicit permission for one educator (who already marks this pupil's written work,
    MarkingShare) to see the pupil's answers from a recovery that was handed to them: the questions, what was answered, and whether each was
    right, plus the recovery's explanation and the skills it checked. Without it a help item shows the skill, the reason and the step only.
    Nothing is shared by default; revoking stops it from the next request. Distinct from, and never implied by, "Share written work"."""

    pupil = models.ForeignKey(Pupil, on_delete=models.CASCADE, related_name="recovery_answer_shares")
    educator = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="+")
    granted_at = models.DateTimeField(auto_now_add=True)
    revoked_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        app_label = "family"
        ordering = ["granted_at", "id"]
