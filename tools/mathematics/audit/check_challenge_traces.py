import sys, os, json
sys.path.insert(0, '/home/claude/k052/tools/mathematics/domain-reasoner')
from domain_oracle import step_check, claim_check
cases = {c['id']: c for c in json.load(open('challenge/suite.json'))}; tr = json.load(open('challenge/traces.json'))
steps = bad = wrong = 0; probs = []
for i, t in tr.items():
    if t['class'] == 'refused': continue
    for rule, params, before, after, ex in t['steps']:
        if after.startswith('x = '): continue
        steps += 1; ok, why = step_check({'eq': before, 'excluded': ex}, {'eq': after, 'excluded': ex})
        if not ok: bad += 1; probs.append((i, rule, before, after, why))
    claimed = t['solution'] if t['class'] == 'unique' else ('all-except-excluded' if t['class'] == 'identity-on-domain' else [])
    try: ok, truth = claim_check(cases[i]['text'], claimed)
    except Exception as e: ok, truth = None, str(e)[:80]
    if ok is not True: wrong += 1; probs.append((i, 'claim', claimed, str(truth)[:80]))
out = {'traces': len(tr), 'steps_checked': steps, 'invalid_steps': bad, 'claims_not_confirmed_by_sympy_oracle': wrong, 'problems': probs[:20]}
json.dump(out, open('challenge/trace-check.json', 'w'), indent=1); print(json.dumps(out, indent=1)[:2500])
