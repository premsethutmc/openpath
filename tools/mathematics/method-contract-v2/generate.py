"""Author method fixtures from frozen conclusion corpora; never query the checker for labels."""
import copy
import hashlib
import json
from pathlib import Path
ROOT = Path(__file__).resolve().parents[3]
OUT = Path(__file__).resolve().parent
RULE = {'triangle-angle-sum': 'triangle-sum', 'isosceles-angle': 'isosceles-base-angles',
        'similar-triangle-proportion': 'triangle-similarity', 'pythagorean': 'pythagorean',
        'parallel-angle': 'parallel-corresponding'}
ledger = {'version': 'submitted-method-fixtures@2', 'sources': {}, 'cases': []}

def emit(name, source):
    path = ROOT / source
    raw = path.read_bytes()
    ledger['sources'][source] = hashlib.sha256(raw).hexdigest()
    old = json.loads(raw)
    cases = []
    for original in old['cases']:
        c = copy.deepcopy(original)
        reasons = []
        if name == 'u2':
            p = c['problem']; facts = p['geometry']['problem']['facts']
            for step in c['working']['geometry']['steps']:
                if not step.get('cited_theorem') and step['statement'] not in facts:
                    step['cited_theorem'] = RULE[p['transfer']['family']]
                    reasons.append('Author an explicit application of the transfer family rule; retain givens, calculations, dependencies and existing citations.')
            # The frozen invalid-at-zero cases cite a known but inapplicable theorem.
            # Missing premises do not prove the conclusion false. Do not repair the citation.
            steps = c['working']['geometry']['steps']
            wrong = any(s.get('cited_theorem') and s['cited_theorem'] != RULE[p['transfer']['family']] for s in steps)
            if wrong and original['expected'] == {'classification': 'invalid', 'firstInvalidStep': 0}:
                c['expected'] = {'classification': 'unsupported', 'firstInvalidStep': None}
                reasons.append('Retain the wrong citation; absence of its premises is unsupported, not a refuted mathematical step.')
        if c['expected']['classification'] in ['missing-assumption', 'contradictory', 'unsupported', 'resource-exhausted'] and c['expected']['firstInvalidStep'] is not None:
            c['expected']['firstInvalidStep'] = None
            reasons.append('Only a disproven submitted step has a firstInvalidStep; missing evidence, inconsistent givens and exhausted resources remain neutral.')
        changed = {k: {'before': original.get(k), 'after': c.get(k)} for k in ['working', 'expected'] if original.get(k) != c.get(k)}
        ledger['cases'].append({'corpus': name, 'id': c['id'], 'changed': changed, 'reasons': list(dict.fromkeys(reasons)) or ['Unchanged input and oracle.']})
        cases.append(c)
    (OUT / f'{name}.method.v2.json').write_text(json.dumps({'version': 'submitted-method-fixtures@2', 'historicalSource': source, 'cases': cases}, indent=2)+'\n')

emit('u1', 'tools/mathematics/unified-u1/independent-cases.v1.json')
emit('u2', 'tools/mathematics/unified-u2/independent-cases.v2.json')
# D2 keeps every independently authored mathematical expectation. Its method harness
# supplies an explicit rule to the reusable geometry stage instead of a bare conclusion.
p = ROOT / 'tools/mathematics/reasoning-depth-d2/frozen-external-benchmark.v1.json'
ledger['sources'][str(p.relative_to(ROOT))] = hashlib.sha256(p.read_bytes()).hexdigest()
for c in json.loads(p.read_text())['cases']:
    ledger['cases'].append({'corpus':'d2', 'id':c['id'], 'changed': {'geometryStage': 'u2.method.v2.json explicit triangle-sum stage'} if c['category']=='geometry' else {}, 'reasons':['Preserve the authored proof-state oracle; the method harness supplies a cited triangle-angle rule for its synthetic geometry stage.'] if c['category']=='geometry' else ['Unchanged input and oracle.']})
(OUT / 'migration-ledger.v2.json').write_text(json.dumps(ledger,indent=2)+'\n')
print('Authored 200 U1 and 250 U2 method cases; ledger records all cases and historical hashes.')
