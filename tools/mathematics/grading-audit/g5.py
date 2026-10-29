"""G5 shadow comparison over the audit corpus (UNIFIED_GRADING_ARCHITECTURE.md §12-13): the earlier policy (OPENPATH_GRADING=legacy) against
grading-policy@1 (unified), case by case on the server route, each difference classified with the same classes as
`manage.py compare_shadow` and checked against the independent oracle's truth.

Usage: python g5.py data/oracle data/backend-c8-legacy data/backend-c8 data/g5.json
"""
import json
import os
import sys
from collections import Counter

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..', 'backend'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
import django  # noqa: E402

django.setup()
from family.management.commands.compare_shadow import INVESTIGATE, classify  # noqa: E402

src_o, src_l, src_u, out = sys.argv[1:5]
GOOD = {'equivalent': 'correct', 'form-variant': None, 'wrong': 'incorrect', 'approximation': 'incorrect', 'malformed': 'unresolved', 'ambiguous': 'unresolved'}
diffs, oracle_side, cases, rows = Counter(), Counter(), 0, []
for f in sorted(os.listdir(src_o)):
    if not f.endswith('.json'):
        continue
    o = json.load(open(os.path.join(src_o, f)))
    L = json.load(open(os.path.join(src_l, f)))['rows']
    U = json.load(open(os.path.join(src_u, f)))['rows']
    i = 0
    for q in o['questions']:
        for c in q['candidates']:
            lb, ub = L[i]['backend'], U[i]['backend']
            assert L[i]['response'] == U[i]['response'] == c['response']
            i += 1
            if 'verdict' not in lb or 'verdict' not in ub:
                continue  # refused requests (too long) are identical in both
            cases += 1
            k = classify(lb['verdict'], ub['verdict'], ub.get('reason'))
            if not k:
                continue
            diffs[k] += 1
            truth = c['truth']
            want = GOOD.get(truth)
            better = 'unified agrees with the oracle' if want == ub['verdict'] else 'earlier agrees with the oracle' if want == lb['verdict'] else 'neither/form-dependent'
            oracle_side[(k, better)] += 1
            if k in INVESTIGATE or better == 'earlier agrees with the oracle':
                rows.append({'qid': q['qid'], 'stored': q['answer'], 'response': c['response'], 'truth': truth, 'earlier': lb['verdict'], 'unified': ub['verdict'],
                             'reason': ub.get('reason'), 'class': k, 'oracle': better})
summary = {'cases': cases, 'different': sum(diffs.values()), 'differences': dict(diffs), 'toInvestigate': sum(n for k, n in diffs.items() if k in INVESTIGATE),
           'oracle': {f'{k} | {b}': n for (k, b), n in sorted(oracle_side.items())}}
json.dump({'schema': 'g5-corpus@1', 'summary': summary, 'review': rows}, open(out, 'w'), indent=1)
print(json.dumps(summary, indent=1))
