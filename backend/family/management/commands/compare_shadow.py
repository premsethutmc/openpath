"""Shadow-mode comparison report (G5, UNIFIED_GRADING_ARCHITECTURE.md §12-13). Read-only.

For every mathematics attempt recorded in shadow mode it compares the authoritative (earlier-policy) decision with the unified decision
kept beside it, and classifies every difference. Switching OPENPATH_GRADING to "unified" requires this report to have no difference in
the classes marked investigate (reviewed by the product owner).

  python manage.py compare_shadow [--out report.json]
"""
import json
from collections import Counter

from django.core.management.base import BaseCommand

from family.models import PupilEvent

INVESTIGATE = {'investigate: unified rejects an answer the earlier policy credited', 'investigate: unified cannot decide what the earlier policy decided',
               'unclassified'}


def classify(legacy, unified, reason):
    if legacy == unified:
        return None
    if unified == 'unresolved' and reason in ('unresolved.invalid-response', 'unresolved.ambiguous'):
        return 'policy P1/P3: not an answer, no longer marked incorrect' if legacy == 'incorrect' else 'policy P3: strict syntax asks for clarification'
    if unified == 'unresolved' and reason in ('unresolved.infrastructure', 'unresolved.contract-inconsistency', 'unresolved.quarantined'):
        return 'grader failure, contract inconsistency or quarantine'
    if unified == 'incorrect' and reason == 'incorrect.required-form' and legacy == 'correct':
        return 'policy P2: stated form enforced'
    if unified == 'correct' and legacy in ('incorrect', 'unresolved'):
        return 'fix: an equal answer is now credited'
    if unified == 'incorrect' and legacy == 'unresolved':
        return 'fix: a readable wrong answer is now decided'
    if unified == 'incorrect' and legacy == 'correct':
        return 'investigate: unified rejects an answer the earlier policy credited'
    if unified == 'unresolved':
        return 'investigate: unified cannot decide what the earlier policy decided'
    return 'unclassified'


class Command(BaseCommand):
    help = "Compare authoritative and shadow decisions recorded in shadow mode (read-only)."

    def add_arguments(self, parser):
        parser.add_argument("--out")

    def handle(self, *args, out=None, **opts):
        diffs, rows, compared = Counter(), [], 0
        for b in PupilEvent.objects.filter(subject="mathematics", kind="learning_record").values_list("body", flat=True).iterator():
            if b.get("record") != "attempt" or not isinstance(b.get("shadowDecision"), dict) or not isinstance(b.get("decision"), dict):
                continue
            compared += 1
            L, U = b["decision"]["verdict"], b["shadowDecision"]["verdict"]
            c = classify(L, U, b["shadowDecision"].get("reason"))
            if c:
                diffs[c] += 1
                rows.append({"attemptId": b.get("id"), "questionId": b.get("questionId"), "response": b.get("response"), "earlier": L, "unified": U,
                             "unifiedReason": b["shadowDecision"].get("reason"), "class": c})
        summary = {"compared": compared, "different": sum(diffs.values()), "differences": dict(diffs),
                   "toInvestigate": sum(n for k, n in diffs.items() if k in INVESTIGATE)}
        if out:
            with open(out, "w") as f:
                json.dump({"schema": "shadow-comparison@1", "summary": summary, "rows": rows}, f, indent=1)
        self.stdout.write(json.dumps(summary))
