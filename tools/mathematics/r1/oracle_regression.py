"""R1: the oracle fix must not change any frozen label. Re-derive every frozen label with the modified oracle and compare with the stored value."""
import sys, os, json
sys.path.insert(0, '/home/claude/r1/tools/mathematics/domain-reasoner')
from domain_oracle import analyse, step_check, claim_check
F = '/home/claude/r1/tools/mathematics/domain-reasoner/frozen/'
out = {}
for name in ['dev', 'eval', 'holdout', 'unsupported']:
    cases = json.load(open(F + name + '.json')); diff = []
    for c in cases:
        a = analyse(c['text'])
        for k in ['class', 'solution', 'excluded', 'candidates', 'rejected', 'removable', 'reasons', 'supported', 'reducedDegree']:
            if a.get(k) != c.get(k): diff.append((c['id'], k, a.get(k), c.get(k))); break
    out[name] = {'cases': len(cases), 'label_differences': len(diff), 'examples': diff[:3]}
adv = json.load(open(F + 'adversarial.json')); bad = []
for t in adv:
    ok, why = step_check(t['from'], t['to'])
    if ok != t['expectedValid'] or (not ok and sorted(why) != sorted(t['reasons'])): bad.append(t['id'])
out['adversarial'] = {'cases': len(adv), 'label_differences': len(bad), 'examples': bad[:5]}
cl = json.load(open(F + 'claims.json')); bad = []
for c in cl:
    ok, _ = claim_check(c['text'], c['claimed'])
    if ok != c['expectedValid']: bad.append(c['id'])
out['claims'] = {'cases': len(cl), 'label_differences': len(bad), 'examples': bad[:5]}
json.dump(out, open('/home/claude/r1/tools/mathematics/r1/results/oracle-regression.json', 'w'), indent=1); print(json.dumps(out)[:900])
