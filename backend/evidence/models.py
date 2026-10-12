"""Learning evidence, stored independently of any game's presentation.

    ActivitySession    one sitting with one activity
    InteractionEvent   raw, append-only record of what the learner did
    Observation        what the rules concluded about one skill in one round
    SkillState         current reading of all observations for one skill

Observations and skill states are derived data. They can be deleted and
rebuilt from the events whenever the rules improve (`manage.py reassess`).
"""

from django.db import models

from learners.models import Learner


class ActivitySession(models.Model):
    learner = models.ForeignKey(Learner, on_delete=models.CASCADE, related_name="sessions")
    client_session_id = models.UUIDField()
    activity = models.CharField(max_length=64)
    activity_version = models.CharField(max_length=32, blank=True)
    plan = models.JSONField(default=dict)
    finished = models.BooleanField(default=False)
    integrity = models.CharField(max_length=16, default="ok")
    problems = models.JSONField(default=list)
    engine_version = models.CharField(max_length=16, blank=True)
    observed_at = models.DateTimeField()
    received_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["learner", "client_session_id"], name="unique_client_session")
        ]


class InteractionEvent(models.Model):
    session = models.ForeignKey(ActivitySession, on_delete=models.CASCADE, related_name="events")
    seq = models.PositiveIntegerField()
    type = models.CharField(max_length=40)
    t = models.PositiveIntegerField(help_text="Milliseconds since the session started.")
    round = models.CharField(max_length=32, null=True, blank=True)
    data = models.JSONField(default=dict)

    class Meta:
        ordering = ["seq"]
        constraints = [models.UniqueConstraint(fields=["session", "seq"], name="unique_event_seq")]


class Observation(models.Model):
    OUTCOMES = [("independent", "Independent"), ("supported", "Supported"), ("not_yet", "Not yet")]

    learner = models.ForeignKey(Learner, on_delete=models.CASCADE, related_name="observations")
    session = models.ForeignKey(ActivitySession, on_delete=models.CASCADE, related_name="observations")
    skill = models.CharField(max_length=80)
    outcome = models.CharField(max_length=16, choices=OUTCOMES)
    round = models.CharField(max_length=32)
    context = models.CharField(max_length=80)
    is_transfer = models.BooleanField(default=False)
    rule = models.CharField(max_length=80)
    detail = models.JSONField(default=dict)
    observed_at = models.DateTimeField()

    class Meta:
        ordering = ["observed_at", "id"]
        indexes = [models.Index(fields=["learner", "skill"])]


class SkillState(models.Model):
    learner = models.ForeignKey(Learner, on_delete=models.CASCADE, related_name="skill_states")
    skill = models.CharField(max_length=80)
    status = models.CharField(max_length=32)
    summary = models.JSONField(default=dict)
    next_review_at = models.DateTimeField(null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=["learner", "skill"], name="unique_skill_state")]
