"""Regrade answers left unresolved because the trusted grader could not run (UNIFIED_GRADING_ARCHITECTURE.md §9, §11).

The only regrade that may happen without a reviewed batch: an attempt whose current decision is `unresolved.infrastructure` is graded
again with the (now healthy) trusted grader, and the new decision is APPENDED with `supersedes` naming the old one. Nothing is changed or
deleted. If the grader still cannot run, nothing is written. `--dry-run` reports what would be appended.
"""
from django.core.management.base import BaseCommand
from django.db import IntegrityError, transaction
from django.utils import timezone

from family import decisions, kernel_grader
from family.learning import _decide, content, generated
from family.models import GradingDecisionRecord, Pupil, PupilEvent


class Command(BaseCommand):
    help = "Append superseding decisions for attempts left unresolved by a grader failure (never changes a stored record)."

    def add_arguments(self, parser):
        parser.add_argument("--dry-run", action="store_true")

    def handle(self, *args, dry_run=False, **opts):
        if not kernel_grader.enabled():
            self.stdout.write("the trusted grader is not runnable: nothing regraded")
            return
        done = still = raced = 0
        for pupil in Pupil.objects.filter(pk__in=GradingDecisionRecord.objects.filter(reason="unresolved.infrastructure").values("pupil")):
            cur = decisions.latest(pupil)
            events = {b.get("id"): b for b in PupilEvent.objects.filter(pupil=pupil, subject="mathematics", kind="learning_record").values_list("body", flat=True)}
            for attempt_id, d in cur.items():
                if d.get("reason") != "unresolved.infrastructure" or attempt_id not in events:
                    continue
                e = events[attempt_id]
                q = content()["questions"].get(e["questionId"]) or generated(e["questionId"])
                now = timezone.now()
                _, new = _decide({**e, "id": attempt_id}, q, now)
                if new["reason"] == "unresolved.infrastructure":
                    still += 1
                    continue
                new = {**new, "supersedes": d["decisionId"], "regrade": {"reason": "infrastructure-recovered", "approvedBy": "policy: automatic (§9)"}}
                if not dry_run:
                    try:
                        with transaction.atomic():
                            decisions.record(pupil, "mathematics", new, now)
                    except IntegrityError:
                        raced += 1  # another run already superseded it: one successor per decision (never two outcomes)
                        continue
                done += 1
        self.stdout.write(f"{'would append' if dry_run else 'appended'} {done} superseding decisions; {still} still unresolved (grader failure); {raced} already superseded")
