#!/usr/bin/env python3
"""Correct the observable-kernel metric without rerunning the sealed corpus.

The first harness looked only for `kernelVersion` plus an `outcome` on the same
object. Symbolic U4 uses `version`, while successful B1/B2/B3 envelopes expose
their kernel-backed reasoner rather than the internal result. Engine verdicts,
timings, and labels are untouched.
"""
import json
from pathlib import Path
root=Path(__file__).parent
kernel_reasoners={'symbolic:m3','probability-statistics:b1','linear-algebra:b2','complex-polynomial:b3'}
for name in ('diagnostic-results.v1.json','sealed-holdout-results.v1.json'):
 p=json.loads((root/name).read_text())
 for r in p['results']:
  ids={x['id'] for x in r['engine']['reasoners']}
  signal=bool(ids & kernel_reasoners)
  r['evidence']['reasonerSignal']=signal
  r['evidence']['adequate']=r['engine']['classification']!='verified' or signal or r['evidence']['kernelVerified']>0
 p['summary']['verifiedWithoutObservableKernelEvidence']=sum(r['engine']['classification']=='verified' and not r['evidence']['adequate'] for r in p['results'])
 p.setdefault('harnessCorrections',[]).append({'id':'proof-audit-shape-e1-1','effect':'evidence metric only; no engine rerun','reason':'recognized version-based U4 and B1/B2/B3 kernel-backed reasoners'})
 (root/name).write_text(json.dumps(p,indent=2)+'\n')
print('corrected proof-audit metadata without rerunning either partition')
