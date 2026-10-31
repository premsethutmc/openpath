#!/usr/bin/env python3
import json,collections,statistics
from pathlib import Path
root=Path(__file__).parent
corpus=json.loads((root/'frozen-corpus.v1.json').read_text())
parts=[json.loads((root/f'{x}-results.v1.json').read_text()) for x in ('diagnostic','sealed-holdout')]
results=[r for p in parts for r in p['results']]
byid={c['id']:c for c in corpus['cases']}
assert len(results)==500 and len({r['id'] for r in results})==500
def metrics(rs):
 classified=collections.Counter(r['engine']['classification'] for r in rs)
 assessed=[r for r in rs if r['metrics']['assessed']]
 invalid=[r for r in rs if r['reference']['classification']=='invalid']
 alternate=[r for r in rs if r['reference']['alternativeMethodValid']]
 times=sorted(r['timingMs']['total'] for r in rs)
 pct=lambda p:times[int((len(times)-1)*p)] if times else 0
 return {"cases":len(rs),"parsed":sum(r['pipeline']['parseClassification']=='parsed' for r in rs),"assessable":len(assessed),
  "classifications":dict(classified),"correctVerdictsAmongAssessed":sum(r['metrics']['verdictMatch'] for r in assessed),
  "falseAcceptances":sum(r['metrics']['falseAcceptance'] for r in rs),"falseRejections":sum(r['metrics']['falseRejection'] for r in rs),
  "verdictAgreementAll":sum(r['metrics']['verdictMatch'] for r in rs),"invalidReferenceCases":len(invalid),
  "exactFirstInvalid":sum(r['metrics']['firstInvalidStepMatch'] is True for r in invalid),
  "accurateSourceSpan":sum(r['metrics']['sourceSpanAccurate'] is True for r in invalid),
  "alternativeTotal":len(alternate),"alternativeAccepted":sum(r['metrics']['alternativeAccepted'] is True for r in alternate),
  "restrictionCases":sum(r['primaryCategory']=='missing-restriction-or-branch' for r in rs),
  "restrictionDetected":sum(r['metrics']['restrictionDetected'] is True for r in rs),
  "verifiedWithoutObservableKernelEvidence":sum(r['engine']['classification']=='verified' and not r['evidence']['adequate'] for r in rs),
  "latencyMs":{"p50":pct(.5),"p95":pct(.95),"p99":pct(.99),"max":max(times)},
  "failureTaxonomy":dict(collections.Counter(r['metrics']['failureCategory'] for r in rs if r['metrics']['failureCategory']!='none'))}
overall=metrics(results)
domains={area:metrics([r for r in results if r['area']==area]) for area in corpus['areaCounts']}
primary=collections.Counter(r['primaryCategory'] for r in results)
categoryOutcomes={c:dict(collections.Counter(r['engine']['classification'] for r in results if r['primaryCategory']==c)) for c in primary}
out={"benchmark":corpus['benchmark'],"version":corpus['version'],"corpusSha256":(root/'FROZEN_SHA256').read_text().split()[0],
 "overall":overall,"diagnostic":metrics([r for r in results if r['partition']=='diagnostic']),
 "sealedHoldout":metrics([r for r in results if r['partition']=='sealed-holdout']),"domains":domains,"categoryOutcomes":categoryOutcomes,
 "results":results}
(root/'case-level-results.v1.json').write_text(json.dumps(out,indent=2)+'\n')
print(json.dumps({k:v for k,v in out.items() if k!='results'},indent=2))
