"""Independent secondary check of engine traces with the SymPy oracle (not the TypeScript checker).
import sys, os; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
usage: python3 check_traces.py <dataset> [label]   -> every step re-verified by domain_oracle.step_check; every final answer by claim_check."""
import json, sys
from domain_oracle import step_check, claim_check
name = sys.argv[1]; label = sys.argv[2] if len(sys.argv) > 2 else ''
suf = f'-{label}' if label else ''
cases = {c['id']: c for c in json.load(open(f'frozen/{name}.json'))}
tr = json.load(open(f'results/traces-{name}{suf}.json'))
steps = bad = wrong = 0; problems = []
for i, t in tr.items():
    c = cases[i]
    if t['class'] == 'refused': continue
    for rule, params, before, after, ex in t['steps']:
        if after.startswith('x = '): continue          # final acceptance step: checked by claim_check + exact substitution
        steps += 1
        prev = [s for s in t['steps'] if s[3] == before][:1]
        ok, why = step_check({'eq': before, 'excluded': ex}, {'eq': after, 'excluded': ex})
        if not ok: bad += 1; problems.append((i, rule, before, after, why))
    claimed = t['solution'] if t['class'] == 'unique' else ('all-except-excluded' if t['class'] == 'identity-on-domain' else [])
    ok, truth = claim_check(c['text'], claimed)
    if not ok: wrong += 1; problems.append((i, 'claim', claimed, truth))
out = {'dataset': name, 'label': label, 'traces': len(tr), 'steps_checked': steps, 'invalid_steps': bad, 'wrong_claims': wrong, 'problems': problems[:20]}
json.dump(out, open(f'results/trace-check-{name}{suf}.json', 'w'), indent=1); print(json.dumps(out, indent=1)[:1500])
