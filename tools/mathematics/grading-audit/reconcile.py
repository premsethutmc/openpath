"""Certification reconciliation (release preparation, check C). Read-only: it never edits either certification.

Joins, per family, evidence that answers different questions and must not be conflated:
  answerKey     is the stored answer mathematically right?           PR #83 answer-key certification (exhaustive over typed questions)
  presentation  is the question shown correctly?                     PR #83 register (wording, distractors, ambiguity); figures and most
                                                                      word-form wording are NOT verified by anyone
  grader        does the grader judge responses against the key?     content/learning/grading-certifications.v1.json (sampled audit)
  working       is the student's working verified?                   nowhere: every released question is answer-only (working never
                                                                      changes credit; methodExamined is diagnosis only)
  quarantine    is the presentation withheld?                        content/learning/question-status.v1.json
The derived `releaseReadiness` never promotes anything: a family is "ready" only if every dimension that is checked is clean, and the
dimensions nobody checked are listed as such.

Usage: python reconcile.py <pr83 commit> data/certification-reconciliation.json   (from tools/mathematics/grading-audit, in the git repo)
"""
import json
import subprocess
import sys
from collections import Counter, defaultdict

commit, out = sys.argv[1], sys.argv[2]
PR83 = 'tools/mathematics/answer-key-certification/data/'


def show(path):
    return json.loads(subprocess.run(['git', 'show', f'{commit}:{path}'], capture_output=True, text=True, check=True).stdout)


ak = {f['family']: f for f in show(PR83 + 'certification.json')['families']}
register = defaultdict(list)
for r in show(PR83 + 'discrepancy-register.json'):
    register[r['family']].append({k: r.get(k) for k in ('class', 'severity', 'affectedCount')})
root = '../../../'
cert = json.load(open(root + 'content/learning/grading-certifications.v1.json'))
status = json.load(open(root + 'content/learning/question-status.v1.json'))
meta = json.load(open('data/family-meta.json'))
graded = defaultdict(list)
for e in cert['entries']:
    graded[e['family']].append(f"{e['form']}:{e['verifier']}")
quar = Counter(e['id'].split(':')[1] for e in status['entries'])
quar_reason = defaultdict(Counter)
for e in status['entries']:
    quar_reason[e['id'].split(':')[1]][e['reason']] += 1

rows, tally = [], Counter()
for fam in sorted(meta):
    m, a = meta[fam], ak.get(fam)
    released = m['released']
    key = {'source': f'PR #83 @ {commit[:7]}', 'certification': a['certification'] if a else 'not run', 'status': a['status'] if a else None,
           'coverage': a.get('coverage') if a else None, 'typedChecked': a.get('checked') if a else 0, 'ok': a.get('ok') if a else 0,
           'mismatch': a.get('mismatch') if a else None, 'ambiguous': a.get('ambiguous') if a else None, 'form': a.get('form') if a else None,
           'independentContractKeys': m['verification'].get('verified', 0)}
    pres = {'register': register.get(fam, []), 'wordWording': 'sampled templates only (PR #83)' if released.get('word') else None,
            'figures': 'data checked, rendering not verified' if a else None, 'distractors': 'exactly-one-true checked (PR #83)' if released.get('mc') or m['answerTypes'].get('choice') else None}
    grader = {'source': f"grading-certifications ({cert['audit']})", 'basis': 'sampled audit (≤19 questions per family)', 'certifiedFormVerifiers': sorted(graded.get(fam, [])),
              'status': 'certified (sample)' if graded.get(fam) else 'provisional'}
    working = 'not verified (answer-only)'
    q = {'quarantined': quar.get(fam, 0), 'reasons': dict(quar_reason.get(fam, {}))}
    blockers = []
    if not a or a['certification'] != 'Fully certified':
        blockers.append(f"answer key: {a['certification'] if a else 'not run'}")
    if any(r['severity'] in ('critical', 'medium') for r in register.get(fam, [])):
        blockers.append('presentation defect (critical/medium) in register')
    if not graded.get(fam):
        blockers.append('grader: provisional')
    readiness = 'ready (grading and key; presentation partly unverified)' if not blockers and not quar.get(fam) else 'ready except quarantined presentations' if not blockers else 'hold: ' + '; '.join(blockers)
    tally[readiness.split(':')[0]] += 1
    rows.append({'family': fam, 'released': released, 'answerKey': key, 'presentation': pres, 'grader': grader, 'working': working, 'quarantine': q,
                 'releaseReadiness': readiness})
summary = {
    'families': len(rows), 'readiness': dict(tally),
    'answerKey': dict(Counter(r['answerKey']['certification'] for r in rows)),
    'grader': dict(Counter(r['grader']['status'] for r in rows)),
    'quarantinedPresentations': sum(quar.values()), 'quarantineByReason': dict(Counter(e['reason'] for e in status['entries'])),
    'note': 'answer-key certification is exhaustive over typed questions; grading certification is sampled; neither verifies working, figures or most word wording',
}
json.dump({'schema': 'certification-reconciliation@1', 'pr83': commit, 'gradingCertifications': cert['hash'], 'questionStatus': status['hash'], 'summary': summary, 'families': rows},
          open(out, 'w'), indent=1, ensure_ascii=False)
print(json.dumps(summary, indent=1, ensure_ascii=False))
