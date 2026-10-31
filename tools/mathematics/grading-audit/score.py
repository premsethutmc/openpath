"""Grading audit, step 5: join the oracle's truth with the production verdicts and classify every case.

Verdicts per route: correct / incorrect / unresolved (refused = the server rejected the request as empty or too long).
Routes: client (grade.ts decide, what the learner sees and the app records), backend (Django: _authoritative + credited, what
mastery uses), kernel (server-grader gradeRequest in process; informational).

Outcome classes (never added together):
  FALSE_ACCEPTANCE           credited, but the oracle says wrong / malformed / approximation
  FALSE_REJECTION            marked incorrect, but the oracle says equivalent (incl. correct answer with wrong optional working)
  FORM_VIOLATION_ACCEPTED    credited a mathematically equal answer in a form the prompt explicitly forbids
  FORM_POLICY_REJECTION      marked incorrect a mathematically equal answer in a form the prompt does not forbid
  INVALID_MARKED_INCORRECT   an unreadable submission recorded as incorrect (should be unresolved)
  AMBIGUITY_CREDITED         credit for a submission with two differing readings (one of them the stored answer)
  AMBIGUITY_DECIDED          marked incorrect although one reading is the stored answer
  UNRESOLVED_ON_CORRECT      no decision on an equivalent answer (safe, but a missed credit)
  UNRESOLVED_ON_FORM         no decision on a form variant
  OK                         the expected verdict
  UNVERIFIED                 the oracle could not decide: not scored
Usage: python score.py data/oracle data/client data/backend data/results
"""
import json
import os
import sys
from collections import Counter, defaultdict

src_o, src_c, src_b, dst = sys.argv[1:5]
os.makedirs(dst, exist_ok=True)


def v_client(c):
    if 'error' in c:
        return 'error'
    return {True: 'correct', False: 'incorrect', None: 'unresolved'}[c['credit']]


def v_backend(b):
    if 'error' in b:
        return 'error'
    if b.get('request'):
        return 'refused'
    if b.get('unresolved'):
        return 'unresolved'
    return 'correct' if b['credited'] else 'incorrect'


def outcome(truth, violates, verdict):
    if truth == 'unverified':
        return 'UNVERIFIED'
    if verdict in ('error',):
        return 'GRADER_ERROR'
    if verdict == 'refused':
        return 'OK' if truth == 'malformed' else 'REFUSED_' + truth.upper()
    if truth == 'equivalent':
        return {'correct': 'OK', 'incorrect': 'FALSE_REJECTION', 'unresolved': 'UNRESOLVED_ON_CORRECT'}[verdict]
    if truth == 'form-variant':
        if violates:
            return 'FORM_VIOLATION_ACCEPTED' if verdict == 'correct' else 'OK'
        return {'correct': 'OK', 'incorrect': 'FORM_POLICY_REJECTION', 'unresolved': 'UNRESOLVED_ON_FORM'}[verdict]
    if truth in ('wrong', 'approximation'):
        return 'FALSE_ACCEPTANCE' if verdict == 'correct' else 'OK'
    if truth == 'malformed':
        return {'correct': 'FALSE_ACCEPTANCE', 'incorrect': 'INVALID_MARKED_INCORRECT', 'unresolved': 'OK'}[verdict]
    if truth == 'ambiguous':
        return {'correct': 'AMBIGUITY_CREDITED', 'incorrect': 'AMBIGUITY_DECIDED', 'unresolved': 'OK'}[verdict]
    return 'UNKNOWN'


ROUTES = ('client', 'backend')
total = {r: Counter() for r in ROUTES}
by_truth = {r: defaultdict(Counter) for r in ROUTES}
by_type = {r: defaultdict(Counter) for r in ROUTES}
by_tag = {r: defaultdict(Counter) for r in ROUTES}
disagree = Counter()
families = []
findings = []
truths = Counter()
for f in sorted(os.listdir(src_o)):
    if not f.endswith('.json'):
        continue
    o = json.load(open(os.path.join(src_o, f)))
    c = json.load(open(os.path.join(src_c, f)))['rows']
    b = json.load(open(os.path.join(src_b, f)))['rows']
    i = 0
    fam = {'family': o['family'], 'questions': len(o['questions']), 'cases': 0, 'unverified': 0, 'client': Counter(), 'backend': Counter(),
           'disagreements': 0, 'types': sorted({q['type'] for q in o['questions']}), 'forms': sorted({q['form'] for q in o['questions']}),
           'formRules': sorted({r for q in o['questions'] for r in q['formRules']}), 'storedUnreadableByOracle': sum(1 for q in o['questions'] if not q['storedReadable']),
           'acceptedEqualForms': Counter(), 'rejectedEqualForms': Counter(), 'unresolvedEqualForms': Counter(), 'verifiers': Counter()}
    for q in o['questions']:
        for cand in q['candidates']:
            cr, br = c[i], b[i]
            i += 1
            assert cr['qid'] == q['qid'] == br['qid'] and cr['response'] == cand['response'] == br['response'], (f, i)
            truths[cand['truth']] += 1
            fam['cases'] += 1
            kv = cr.get('kernel', {})
            if kv.get('verdict') in ('correct', 'incorrect') and kv.get('verifier'):
                fam['verifiers'][f"{q['form']}:{kv['verifier']}"] += 1
            vc, vb = v_client(cr['client']), v_backend(br['backend'])
            oc, ob = outcome(cand['truth'], cand['violates'], vc), outcome(cand['truth'], cand['violates'], vb)
            if cand['truth'] == 'unverified':
                fam['unverified'] += 1
            for route, ocm in (('client', oc), ('backend', ob)):
                total[route][ocm] += 1
                by_truth[route][cand['truth']][ocm] += 1
                by_type[route][q['type']][ocm] += 1
                by_tag[route][cand['tag']][ocm] += 1
                fam[route][ocm] += 1
            if cand['truth'] in ('equivalent', 'form-variant'):
                key = {'correct': 'acceptedEqualForms', 'incorrect': 'rejectedEqualForms', 'unresolved': 'unresolvedEqualForms'}.get(vb)
                if key:
                    fam[key][cand['tag']] += 1
            dis = vc != vb and not (vb == 'refused' and vc == 'unresolved')
            if dis:
                disagree[(vc, vb, cr['client'].get('source'), br['backend'].get('source'))] += 1
                fam['disagreements'] += 1
            if oc not in ('OK', 'UNVERIFIED') or ob not in ('OK', 'UNVERIFIED') or dis:
                findings.append({'family': o['family'], 'qid': q['qid'], 'type': q['type'], 'form': q['form'], 'stored': q['answer'], 'response': cand['response'],
                                 'working': cand['working'], 'tag': cand['tag'], 'truth': cand['truth'], 'invalid': cand.get('invalid'), 'basis': cand['basis'], 'violates': cand['violates'],
                                 'client': {'verdict': vc, 'outcome': oc, 'source': cr['client'].get('source')},
                                 'backend': {'verdict': vb, 'outcome': ob, 'source': br['backend'].get('source'), 'readable': br['backend'].get('readable')},
                                 'grader': {k: cr.get('kernel', {}).get(k) for k in ('verdict', 'reason', 'verifier')}})
    assert i == len(c) == len(b)
    for k in ('client', 'backend', 'acceptedEqualForms', 'rejectedEqualForms', 'unresolvedEqualForms', 'verifiers'):
        fam[k] = dict(fam[k])
    families.append(fam)

json.dump(families, open(os.path.join(dst, 'per-family.json'), 'w'))
with open(os.path.join(dst, 'findings.jsonl'), 'w') as fh:
    for x in findings:
        fh.write(json.dumps(x, ensure_ascii=False) + '\n')
summary = {
    'cases': sum(truths.values()), 'truths': dict(truths),
    'totals': {r: dict(total[r]) for r in ROUTES},
    'byTruth': {r: {k: dict(v) for k, v in by_truth[r].items()} for r in ROUTES},
    'byType': {r: {k: dict(v) for k, v in by_type[r].items()} for r in ROUTES},
    'byTag': {r: {k: dict(v) for k, v in by_tag[r].items()} for r in ROUTES},
    'clientBackendDisagreements': [{'client': k[0], 'backend': k[1], 'clientSource': k[2], 'backendSource': k[3], 'n': n} for k, n in disagree.most_common()],
}
json.dump(summary, open(os.path.join(dst, 'summary.json'), 'w'), indent=1)
print(json.dumps({'cases': summary['cases'], 'truths': summary['truths'], 'client': summary['totals']['client'], 'backend': summary['totals']['backend'],
                  'disagreements': sum(disagree.values())}, indent=1))
