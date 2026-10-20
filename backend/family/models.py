"""Parent accounts, their pupils, and each pupil's append-only event ledger.

A parent is a Django user (django.contrib.auth: its password hashing, sessions and
reset tokens; nothing home-made). A pupil belongs to exactly one parent. A pupil's
learning record is the same append-only event list the app keeps on a device: the
engine's evidence and provenance events plus the app's own sessions, lessons and
attempts. The server stores it verbatim, in order, per subject. It never rewrites
history: events are appended with their sequence number, and the only way an event
leaves the table is the deletion of the pupil or of the parent's account.

The Learner Vector (the engine's estimates) is derived from these events by the
engine, by replay; it is never stored in place of them.
"""

import uuid

from django.conf import settings
from django.db import models

# Subjects that share the pupil identity and the event architecture. English is the
# existing implementation; mathematics uses the same engine and pupil identity,
# with its own ordered subject events.
SUBJECTS = [("english", "English"), ("mathematics", "Mathematics")]
ACTIVE_SUBJECTS = {"english", "mathematics"}


class Pupil(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    parent = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="pupils")
    display_name = models.CharField(max_length=40, help_text="A first name or nickname, as the parent typed it.")
    consent_policy = models.CharField(max_length=40)
    created_at = models.DateTimeField(auto_now_add=True)
    # The parent's explicit choice to let OpenPath's authorised developers inspect this record (diagnostics).
    # Off by default: a developer sees only their own account's pupils unless a parent shares one.
    shared_for_diagnostics = models.BooleanField(default=False)
    shared_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["created_at", "id"]

    def __str__(self) -> str:
        return f"pupil {self.pk}"


class PupilEvent(models.Model):
    pupil = models.ForeignKey(Pupil, on_delete=models.CASCADE, related_name="events")
    subject = models.CharField(max_length=24, choices=SUBJECTS)
    seq = models.PositiveIntegerField()
    kind = models.CharField(max_length=32)
    occurred_at = models.DateTimeField(help_text="The event's own time, as the app recorded it.")
    body = models.JSONField(help_text="The event exactly as the app recorded it.")
    received_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["pupil", "subject", "seq"]
        constraints = [models.UniqueConstraint(fields=["pupil", "subject", "seq"], name="unique_pupil_event_seq")]

    def save(self, *args, **kwargs):
        # append-only: an event, once stored, is never changed
        if not self._state.adding:
            raise ValueError("pupil events are append-only")
        super().save(*args, **kwargs)


# ---------------------------------------------------------------- developer diagnostics and observability


class DeveloperAccess(models.Model):
    """An explicit grant of developer diagnostics to one account. Knowing the URL or an email grants nothing."""

    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="developer_access")
    granted_at = models.DateTimeField(auto_now_add=True)
    granted_via = models.CharField(max_length=40, help_text="claim code, or the management command")
    revoked_at = models.DateTimeField(null=True, blank=True)

    @property
    def active(self) -> bool:
        return self.revoked_at is None


class DeveloperClaim(models.Model):
    """A one-time code that turns the signed-in account into a developer. Only its hash is stored."""

    code_hash = models.CharField(max_length=64, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    used_at = models.DateTimeField(null=True, blank=True)
    used_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="+")


class DiagnosticAccessLog(models.Model):
    """Every developer read of diagnostics, and every grant, claim and share change."""

    at = models.DateTimeField(auto_now_add=True)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL, related_name="+")
    action = models.CharField(max_length=40)
    pupil = models.UUIDField(null=True, blank=True)
    detail = models.CharField(max_length=200, blank=True)

    class Meta:
        ordering = ["-at", "-id"]


class ApiMetric(models.Model):
    """One API request: which endpoint (its route name, never the path with ids), how long, and the status."""

    at = models.DateTimeField(auto_now_add=True, db_index=True)
    route = models.CharField(max_length=60)
    method = models.CharField(max_length=8)
    status = models.PositiveSmallIntegerField()
    ms = models.FloatField()


class ServerError(models.Model):
    """An unhandled server error: the route and the error's class and first line. No request body, no ids."""

    at = models.DateTimeField(auto_now_add=True, db_index=True)
    route = models.CharField(max_length=60)
    method = models.CharField(max_length=8)
    error = models.CharField(max_length=200)


class ClientMetric(models.Model):
    """A measurement sent by the app (save latency, rebuild and selection time, a failed save, a runtime error)."""

    at = models.DateTimeField(auto_now_add=True, db_index=True)
    # who sent it, so a flood from one account can be found and removed (kept only as long as the metric)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.CASCADE, related_name="+")
    name = models.CharField(max_length=40)
    ms = models.FloatField(null=True, blank=True)
    ok = models.BooleanField(default=True)
    app_version = models.CharField(max_length=40, blank=True)
    detail = models.CharField(max_length=200, blank=True)


class WritingDraft(models.Model):
    """Resumable input/activity state, not a learner estimate or evidence ledger."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    pupil = models.ForeignKey(Pupil, on_delete=models.CASCADE, related_name='writing_drafts')
    problem_key = models.CharField(max_length=160)
    topic = models.CharField(max_length=24)
    parameters = models.JSONField(default=dict)
    work = models.JSONField(null=True)
    version = models.PositiveIntegerField(default=0)
    stage = models.CharField(max_length=24, default='intro')
    support = models.JSONField(default=dict)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=['pupil', 'problem_key'], name='unique_pupil_writing_problem')]
