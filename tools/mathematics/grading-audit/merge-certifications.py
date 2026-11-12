"""Add the certifications of a later, partial audit run to the registry (grading-certifications@1).

The registry was issued from one whole-curriculum audit. Families added afterwards are audited on their own (the same stages
on a sample restricted to those families, see README "Auditing new families") and certify.py writes their entries to a
scratch file. This script appends those entries, each already naming its own audit in its evidence, records the run under
"addenda", and recomputes the hash exactly as certify.py does. A family already in the registry is refused, never replaced.

Usage: python merge-certifications.py <scratch certifications.json>      (from tools/mathematics/grading-audit)
"""
import hashlib
import json
import os
import sys

REG = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..', 'content', 'learning', 'grading-certifications.v1.json')
new = json.load(open(sys.argv[1]))
reg = json.load(open(REG))
if new['refused']:
    sys.exit(f'refused families in the new run: {sorted(new["refused"])}; nothing merged')
have = {e['family'] for e in reg['entries']}
clash = sorted({e['family'] for e in new['entries']} & have)
if clash:
    sys.exit(f'already certified, not replaced: {clash}')
reg['entries'] = sorted(reg['entries'] + new['entries'], key=lambda e: (e['family'], e['form'], e['verifier']))
reg.setdefault('addenda', []).append({'audit': new['audit'], 'oracle': new['oracle'], 'issued': new['issued'], 'families': sorted({e['family'] for e in new['entries']})})
reg['hash'] = hashlib.sha256(json.dumps({k: v for k, v in reg.items() if k not in ('issued', 'hash')}, sort_keys=True).encode()).hexdigest()
json.dump(reg, open(REG, 'w'), separators=(',', ':'))
print(json.dumps({'added': len(new['entries']), 'families': sorted({e['family'] for e in new['entries']}), 'entries': len(reg['entries'])}))
