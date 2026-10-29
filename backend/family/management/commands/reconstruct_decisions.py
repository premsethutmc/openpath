"""READ-ONLY dry run of reconstructing decisions for historical attempts (approved decision 3, 2026-10-29).

Nothing is written: the command refuses to run without --dry-run, runs inside a transaction that is rolled back, and never calls the
decision log. For every mathematics attempt saved before the server recorded grading decisions it reports:
  the original verdict (what the record itself says), the reconstructed verdict (the current trusted grader), the change,
  the missing historical context, whether the record can be reconstructed safely, and the effect on mastery (when independent success
  was first shown, per pupil and skill, with original versus reconstructed verdicts).
Writing reconstructed decisions is not implemented here and needs explicit approval of this report first.

  python manage.py reconstruct_decisions --dry-run [--out report.json] [--pupil <uuid>]
"""
import json
from collections import Counter

import re

from django.core.management.base import BaseCommand, CommandError
from django.db import connection, transaction

from family import decisions, kernel_grader
from family.learning import HUMAN, _decide, content, generated, independent_at, quarantined
from family.models import Pupil, PupilEvent, WrittenMark


WRITE = re.compile(r'^\s*(insert|update|delete|replace|create|alter|drop|truncate|grant|revoke|vacuum|reindex|attach|detach|copy|lock|merge|call|do|listen|notify|refresh|comment|savepoint|release)\b', re.I)


class ReadOnlyViolation(Exception):
    pass


def _block_writes(execute, sql, params, many, context):
    """read-only by construction: any statement other than a read is refused before it reaches the database"""
    if WRITE.match(sql or '') and not re.match(r'^\s*(savepoint|release)\b', sql or '', re.I):
        raise ReadOnlyViolation(f'refused a write in the read-only dry run: {sql[:80]}')
    return execute(sql, params, many, context)


def _original(e):
    v = decisions.verdict_of(e)
    return v if v is not None else 'none-recorded'


class Command(BaseCommand):
    help = "Report (never write) what reconstructing grading decisions for historical attempts would change."

    def add_arguments(self, parser):
        parser.add_argument("--dry-run", action="store_true")
        parser.add_argument("--out")
        parser.add_argument("--pupil")

    def handle(self, *args, dry_run=False, out=None, pupil=None, **opts):
        if not dry_run:
            raise CommandError("Only --dry-run is available: writing reconstructed decisions needs explicit approval of the dry-run report.")
        report = {"schema": "decision-reconstruction-dry-run@1", "graderRunnable": kernel_grader.enabled(), "graderBundle": kernel_grader.bundle_sha256(),
                  "summary": {}, "records": [], "mastery": []}
        totals = Counter()
        # three independent guards: (1) the database session itself is read-only (PostgreSQL: SET TRANSACTION READ ONLY; SQLite:
        # PRAGMA query_only), (2) every SQL statement is checked before it is sent and writes are refused, (3) the transaction is rolled
        # back. Use read-only database credentials as well (a role with SELECT only): docs in MATH grading release checklist.
        try:
            with transaction.atomic(), connection.execute_wrapper(_block_writes):
                with connection.cursor() as cur:
                    if connection.vendor == 'postgresql':
                        cur.execute('SET TRANSACTION READ ONLY')
                    elif connection.vendor == 'sqlite':
                        cur.execute('PRAGMA query_only = ON')
                report["readOnlyGuards"] = {"session": connection.vendor, "statementFilter": True, "rollback": True}
                pupils = Pupil.objects.filter(pk=pupil) if pupil else Pupil.objects.filter(events__subject="mathematics").distinct()
                for p in pupils:
                    bodies = list(PupilEvent.objects.filter(pupil=p, subject="mathematics", kind="learning_record").order_by("seq").values_list("body", flat=True))
                    marks = dict(WrittenMark.objects.filter(pupil=p).values_list("attempt_id", "verdict"))
                    rebuilt, comps = [], set()
                    for e in bodies:
                        if e.get("record") != "attempt":
                            rebuilt.append(e)
                            continue
                        if isinstance(e.get("decision"), dict):
                            totals["already-decided"] += 1
                            rebuilt.append(e)
                            continue
                        totals["historical"] += 1
                        qid = e.get("questionId")
                        q = content()["questions"].get(qid) or generated(qid)
                        missing = ["grader and contract versions at the time", "the stored answer at the time (assumed unchanged)"]
                        if "assessment" not in e:
                            missing.append("no recorded assessment")
                        if not e.get("working"):
                            missing.append("no working recorded")
                        row = {"pupil": str(p.pk), "attemptId": e.get("id"), "at": e.get("at"), "questionId": qid, "response": e.get("response"),
                               "original": _original(e), "missingContext": missing}
                        unsafe = None
                        if q is None:
                            unsafe = "the question is no longer known"
                        elif quarantined(qid):
                            unsafe = "the question is quarantined"
                        elif q["type"] in HUMAN:
                            unsafe = "a written answer is marked by an educator, not reconstructed"
                        if unsafe is None:
                            _, d = _decide(e, q)
                            row["reconstructed"] = d["verdict"]
                            row["reason"] = d["reason"]
                            row["certified"] = d.get("certified")
                            if d["reason"] == "unresolved.infrastructure":
                                unsafe = "the trusted grader could not run"
                            else:
                                e2 = {**e, "decision": {**d, "decidedBy": "server"}}
                                rebuilt.append(e2)
                                comps.add(q["competency"])
                        if unsafe is not None:
                            row["reconstructed"] = None
                            row["cannotReconstruct"] = unsafe
                            rebuilt.append(e)
                            totals["cannot-reconstruct"] += 1
                        else:
                            totals[f"{row['original']}->{row['reconstructed']}"] += 1
                            totals["changed" if row["original"] != row["reconstructed"] else "unchanged"] += 1
                        report["records"].append(row)
                    for comp in sorted(comps):
                        before, after = independent_at(bodies, comp, marks), independent_at(rebuilt, comp, marks)
                        if before != after:
                            report["mastery"].append({"pupil": str(p.pk), "competency": comp, "independentAtOriginal": before and before.isoformat(),
                                                      "independentAtReconstructed": after and after.isoformat()})
                transaction.set_rollback(True)  # read-only by construction
        finally:
            if connection.vendor == 'sqlite':
                with connection.cursor() as cur:
                    cur.execute('PRAGMA query_only = OFF')  # the session guard is per connection on SQLite: restore it for the caller
        report["summary"] = {**dict(totals), "masteryChanges": len(report["mastery"])}
        text = json.dumps(report, indent=1, default=str)
        if out:
            with open(out, "w") as f:
                f.write(text)
        self.stdout.write(json.dumps(report["summary"]))
