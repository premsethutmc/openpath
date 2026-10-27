#!/usr/bin/env python3
"""Independent consistency review of E1 labels; does not import OpenPath."""
import json,collections,hashlib
from pathlib import Path
root=Path(__file__).parent
p=json.loads((root/'frozen-corpus.v1.json').read_text()); cases=p['cases']
assert len(cases)==500 and collections.Counter(c['area'] for c in cases)==collections.Counter(p['areaCounts'])
assert collections.Counter(c['primaryCategory'] for c in cases)==collections.Counter(p['categoryCounts'])
assert sum(c['partition']=='sealed-holdout' for c in cases)==150
expected={"correct-conventional":"verified","correct-alternative":"verified","mathematical-error":"invalid",
 "incomplete":"incomplete","missing-restriction-or-branch":None,"ambiguous-or-malformed":None,"unsupported-out-of-scope":"unsupported"}
for c in cases:
 r=c['reference']; cat=c['primaryCategory']; text=c['studentWorking']['text']
 assert 2 <= len(text.splitlines()) <= 20
 if expected[cat]: assert r['classification']==expected[cat]
 if cat=='mathematical-error': assert isinstance(r['firstInvalidStep'],int) and 0<=r['firstInvalidStep']<len(text.splitlines())
 if cat=='correct-alternative': assert r['alternativeMethodValid']
 if cat=='unsupported-out-of-scope': assert not r['insideDocumentedScope']
 if cat=='missing-restriction-or-branch': assert r['missingAssumptions'] or r['missingDomainRestrictions'] or r['missingSolutionBranches']
assert hashlib.sha256((root/'frozen-corpus.v1.json').read_bytes()).hexdigest()==(root/'FROZEN_SHA256').read_text().split()[0]
print('reference-review: 500/500 internally consistent; 150 sealed')
