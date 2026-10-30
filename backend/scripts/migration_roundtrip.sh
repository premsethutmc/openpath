#!/usr/bin/env bash
# Release check: migrations 0006 (grading decision table) and 0007 (uniqueness constraints) apply, reverse and re-apply, with data in place,
# and the recovery procedure (export decisions before reversing 0006, re-import after) restores them exactly.
#
# Usage (from backend/, with vendored deps loaded):  DATABASE_URL=<postgres url or empty for SQLite> scripts/migration_roundtrip.sh
# It uses a throwaway database: never point it at a database holding learner records.
set -euo pipefail
OUT=${OUT:-$(mktemp -d)}
m() { python3 manage.py "$@"; }
step() { echo "== $*"; }

step "fresh database to 0007"
m migrate --noinput >/dev/null
m showmigrations family | tail -3

step "seed: one pupil, three decisions (original, superseding regrade, another attempt)"
python3 manage.py shell -c "
from django.utils import timezone as tz
from django.contrib.auth import get_user_model
from family.models import Pupil, GradingDecisionRecord as G
u = get_user_model().objects.create_user(username='roundtrip', password='x')
p = Pupil.objects.create(parent=u, display_name='r', consent_policy='synthetic')
for i, (a, d, sup, v) in enumerate([('a1', 'd1', '', 'unresolved'), ('a1', 'd2', 'd1', 'correct'), ('a2', 'd3', '', 'incorrect')]):
    G.objects.create(pupil=p, subject='mathematics', attempt_id=a, decision_id=d, supersedes=sup, reason='r', verdict=v, decided_at=tz.now(), body={'decisionId': d, 'verdict': v})
print(G.objects.count(), 'decisions')
"

step "recovery export (before any reversal)"
m dumpdata family.gradingdecisionrecord --indent 1 -o "$OUT/decisions.json"
python3 -c "import json,sys;print(len(json.load(open('$OUT/decisions.json'))),'exported')"

step "reverse 0007 (drop constraints): data kept"
m migrate family 0006 --noinput >/dev/null
m shell -c "from family.models import GradingDecisionRecord as G; print(G.objects.count(), 'decisions after reversing 0007')"

step "re-apply 0007"
m migrate family 0007 --noinput >/dev/null
m shell -c "
from django.db import IntegrityError, transaction
from django.utils import timezone as tz
from family.models import Pupil, GradingDecisionRecord as G
p = Pupil.objects.first()
try:
    with transaction.atomic():
        G.objects.create(pupil=p, subject='mathematics', attempt_id='a1', decision_id='dx', supersedes='', reason='r', verdict='correct', decided_at=tz.now(), body={})
    print('CONSTRAINT MISSING'); raise SystemExit(1)
except IntegrityError:
    print('one_original_decision_per_attempt enforced after re-apply')
"

step "reverse 0006 (drop table; decisions exist only in the export and, for originals, in the event bodies)"
m migrate family 0005 --noinput >/dev/null
m showmigrations family | tail -3

step "re-apply 0006 and 0007, restore from export"
m migrate family --noinput >/dev/null
m loaddata "$OUT/decisions.json"
m shell -c "
from family.models import GradingDecisionRecord as G
rows = sorted((r.attempt_id, r.decision_id, r.supersedes, r.verdict) for r in G.objects.all())
assert rows == [('a1','d1','','unresolved'), ('a1','d2','d1','correct'), ('a2','d3','','incorrect')], rows
print('restored exactly:', rows)
"
step "OK"
