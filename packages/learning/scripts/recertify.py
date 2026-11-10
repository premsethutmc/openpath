#!/usr/bin/env python3
"""Re-run the independent answer-key certification for chosen families and keep a status for EVERY question.

  eval "$(backend/vendor-deps.sh --audit)"        # SymPy / mpmath from GitHub tags (no package index needed)
  bun tools/mathematics/answer-key-certification/export.ts /tmp/exp
  python3 packages/learning/scripts/recertify.py --data /tmp/exp --out /tmp/recert --family f1,f2
  bun packages/learning/scripts/machine-validation.ts ledger-add /tmp/exp /tmp/recert <source>

It calls the unchanged runner (tools/mathematics/answer-key-certification/certify.py) and the unchanged reference modules. The
runner lists the ids of mismatched, ambiguous, incomplete, form and unsupported questions but not of questions whose reference
raised an error, so this wrapper records those too: a question is certified only if its reference ran and agreed.
"""
import argparse
import importlib
import json
import os
import sys

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..')
CERT = os.path.join(ROOT, 'tools', 'mathematics', 'answer-key-certification')
sys.path.insert(0, CERT)
import certify  # noqa: E402
import kit  # noqa: E402

ap = argparse.ArgumentParser()
ap.add_argument('--data', required=True)
ap.add_argument('--out', required=True)
ap.add_argument('--family', required=True)
ap.add_argument('--budget', type=float, default=900)
a = ap.parse_args()
for f in sorted(os.listdir(os.path.join(CERT, 'refs'))):
    if f.endswith('.py') and not f.startswith('_'):
        importlib.import_module('refs.' + f[:-3])
os.makedirs(f'{a.out}/fam', exist_ok=True)
for fam in a.family.split(','):
    if fam not in kit.REFS:
        json.dump({'family': fam, 'noReference': True}, open(f'{a.out}/fam/{fam}.json', 'w'))
        print(fam, 'no reference')
        continue
    seen, errors = [], []
    spec = kit.REFS[fam]
    fn = spec['fn']

    def wrapped(q, fn=fn):
        seen.append(q['id'])
        try:
            return fn(q)
        except Exception:
            errors.append(q['id'])
            raise

    spec['fn'] = wrapped
    try:
        res = certify.run_family(a.data, fam, a.budget)
    finally:
        spec['fn'] = fn
    bad = set(errors) | set(res['mismatchIds']) | set(res['formIds']) | set(res['incompleteIds']) | set(res['ambiguousIds']) | set(res['unsupportedIds'])
    res['refErrorIds'] = errors
    res['okIds'] = [i for i in seen if i not in bad]
    assert len(res['okIds']) == res['ok'], (fam, len(res['okIds']), res['ok'])
    json.dump(res, open(f'{a.out}/fam/{fam}.json', 'w'), ensure_ascii=False)
    print(fam, {k: res[k] for k in ('released', 'checked', 'ok', 'mismatch', 'form', 'ambiguous', 'unsupported', 'refError', 'mcChecked', 'mcBad', 'wordBad', 'timedOut')})
