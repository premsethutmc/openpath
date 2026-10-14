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
# only one with an engine today; mathematics is reserved so a later engine can keep
# its own ordered ledger for the same pupil.
SUBJECTS = [("english", "English"), ("mathematics", "Mathematics")]
ACTIVE_SUBJECTS = {"english"}


class Pupil(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    parent = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="pupils")
    display_name = models.CharField(max_length=40, help_text="A first name or nickname, as the parent typed it.")
    consent_policy = models.CharField(max_length=40)
    created_at = models.DateTimeField(auto_now_add=True)

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
