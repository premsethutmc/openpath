"""TEST ONLY: move a synthetic learner's My Learning Year records into the past, as if days had passed.

    OPENPATH_ALLOW_TIME_TRAVEL=1 python manage.py learning_time_travel <pupil id> --days 8

Browser acceptance tests use this to reach a delayed check (seven days) against the real API, which keeps the server's
clock. It refuses unless the environment variable is set, and only touches pupils whose name starts with "Synthetic".
Only "learning_record" bodies and their occurred_at move; nothing else in the record changes.
"""
import os
from datetime import timedelta

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

from family.models import Pupil, PupilEvent


def shifted(iso, days):
    at = timezone.datetime.fromisoformat(iso.replace("Z", "+00:00")) - timedelta(days=days)
    return at.isoformat().replace("+00:00", "Z")


class Command(BaseCommand):
    help = "TEST ONLY: shift a synthetic learner's learning records into the past."

    def add_arguments(self, parser):
        parser.add_argument("pupil")
        parser.add_argument("--days", type=float, required=True)

    def handle(self, pupil, days, **_):
        if os.environ.get("OPENPATH_ALLOW_TIME_TRAVEL") != "1":
            raise CommandError("Refused: set OPENPATH_ALLOW_TIME_TRAVEL=1 (test databases only).")
        p = Pupil.objects.filter(pk=pupil).first()
        if p is None or not p.display_name.startswith("Synthetic"):
            raise CommandError("Only a synthetic test pupil (name starting with 'Synthetic') can be moved in time.")
        with transaction.atomic():
            n = 0
            for e in PupilEvent.objects.select_for_update().filter(pupil=p, subject="mathematics", kind="learning_record"):
                body = dict(e.body)
                body["at"] = shifted(body["at"], days)
                if "savedAt" in body:
                    body["savedAt"] = shifted(body["savedAt"], days)
                e.body = body
                e.occurred_at = e.occurred_at - timedelta(days=days)
                e.save(update_fields=["body", "occurred_at"])
                n += 1
        self.stdout.write(f"moved {n} learning records {days} days into the past")
