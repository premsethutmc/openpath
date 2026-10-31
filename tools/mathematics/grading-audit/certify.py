"""Grading certification (UNIFIED_GRADING_ARCHITECTURE.md §6; approved decision 1, 2026-10-29).

Writes content/learning/grading-certifications.v1.json from an independent audit run. A certification is issued per FAMILY and per
(presentation form × verifier) that actually decided cases in that family, and only when the family's sampled audit shows, on both the
app route and the server route:
  0 false acceptances, 0 false rejections, 0 stated forms not enforced, 0 equal answers in an unstated form marked incorrect,
  0 ambiguous texts credited, 0 invalid inputs marked incorrect, 0 app/server disagreements, 0 cases the oracle could not decide,
and no quarantined presentation. Missed credit (an equal answer left unresolved) does not block certification but is recorded with it.
The "verified" label of a contract plays no part. Everything else is provisional.

Usage: python certify.py <results dir> <audit id> <oracle version> [out]   (from tools/mathematics/grading-audit)
"""
import hashlib
import json
import os
import sys
from datetime import date

res_dir, audit_id, oracle = sys.argv[1:4]
out = sys.argv[4] if len(sys.argv) > 4 else os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..', 'content', 'learning', 'grading-certifications.v1.json')
per = json.load(open(os.path.join(res_dir, 'per-family.json')))
BLOCK = ('FALSE_ACCEPTANCE', 'FALSE_REJECTION', 'FORM_VIOLATION_ACCEPTED', 'FORM_POLICY_REJECTION', 'AMBIGUITY_CREDITED', 'INVALID_MARKED_INCORRECT', 'GRADER_ERROR', 'UNKNOWN')
FIXTURES = ['packages/learning/src/grading-audit-regressions.test.ts', 'packages/learning/src/grading/parse.test.ts', 'packages/learning/src/grading/contract.test.ts',
            'backend/family/test_grading_regressions.py', 'tools/mathematics/grading-audit/oracle/test_oracle.py']

entries, refused = [], {}
for f in sorted(per, key=lambda r: r['family']):
    blockers = {f'{route}.{k}': f[route][k] for route in ('client', 'backend') for k in BLOCK if f[route].get(k)}
    if f.get('disagreements'):
        blockers['disagreements'] = f['disagreements']
    if f.get('unverified'):
        blockers['oracle-unverified'] = f['unverified']
    if blockers:
        refused[f['family']] = blockers
        continue
    missed = {k: max(f['client'].get(k, 0), f['backend'].get(k, 0)) for k in ('UNRESOLVED_ON_CORRECT', 'UNRESOLVED_ON_FORM')}
    for key, n in sorted(f.get('verifiers', {}).items()):
        form, verifier = key.split(':', 1)
        entries.append({'family': f['family'], 'form': form, 'verifier': verifier, 'decidedCases': n,
                        'evidence': {'audit': audit_id, 'oracle': oracle, 'sampledQuestions': f['questions'], 'cases': f['cases'], 'missedCredit': missed}})

body = {'schema': 'grading-certifications@1', 'issued': date.today().isoformat(), 'audit': audit_id, 'oracle': oracle,
        'criteria': 'zero of ' + ', '.join(BLOCK[:6]) + ', disagreements and oracle-unverified, on app and server routes, per family (sampled audit)',
        'fixtures': FIXTURES, 'entries': entries, 'refused': refused}
body['hash'] = hashlib.sha256(json.dumps({k: v for k, v in body.items() if k != 'issued'}, sort_keys=True).encode()).hexdigest()
json.dump(body, open(out, 'w'), separators=(',', ':'))
fams = {e['family'] for e in entries}
print(json.dumps({'certifiedFamilies': len(fams), 'entries': len(entries), 'refusedFamilies': len(refused)}))
