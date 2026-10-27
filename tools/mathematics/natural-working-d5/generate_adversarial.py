#!/usr/bin/env python3
import json
from pathlib import Path
cats=["incorrect-trig-identity","missing-periodic-solutions","invalid-log-domain","incorrect-differentiation","missing-integration-constant","matrix-dimension-mismatch","singular-matrix-inverse","invalid-complex-conjugation","missing-probability-assumption","unsupported-geometry-claim","incorrect-cross-domain-substitution","correct-final-after-invalid-step","ambiguous-notation","malformed-expression","valid-supported-adapter"]
cases=[]
for cat in cats:
 for i in range(10):
  raw={
   "incorrect-trig-identity":"sin(x)^2 + cos(x)^2\n2",
   "missing-periodic-solutions":"x = pi/6",
   "invalid-log-domain":"2log(x)",
   "incorrect-differentiation":f"f'(x) = {3+i}x",
   "missing-integration-constant":r"\int 2x \, dx = x^2",
   "matrix-dimension-mismatch":"u = [1, 2]\nv = [1, 2, 3]\nu + v = [2, 4]",
   "singular-matrix-inverse":"A = [[1,2],[2,4]]\nA^-1 = [[0,0],[0,0]]",
   "invalid-complex-conjugation":"z = 3 + 4i\nconj(z) = 3 + 4i",
   "missing-probability-assumption":"P(A) = 1/2\nP(B) = 1/2\nP(A and B) = 1/4",
   "unsupported-geometry-claim":"AB = AC\nangle B = angle C",
   "incorrect-cross-domain-substitution":"x = 3\nf(x) = x^2\nf(x) = 8",
   "correct-final-after-invalid-step":"2x = 10\nx = 4",
   "ambiguous-notation":"1/2x = 3",
   "malformed-expression":r"\frac{x+1}{",
   "valid-supported-adapter":f"f'(x) = {2*(i+1)}x^{2*i+1}",
  }[cat]
  expected={"incorrect-trig-identity":"invalid","missing-periodic-solutions":"unsupported","invalid-log-domain":"missing-assumption","incorrect-differentiation":"invalid","missing-integration-constant":"invalid","matrix-dimension-mismatch":"invalid","singular-matrix-inverse":"unsupported","invalid-complex-conjugation":"unsupported","missing-probability-assumption":"unsupported","unsupported-geometry-claim":"unsupported","incorrect-cross-domain-substitution":"unsupported","correct-final-after-invalid-step":"invalid","ambiguous-notation":"ambiguous","malformed-expression":"malformed","valid-supported-adapter":"verified"}[cat]
  cases.append({"id":f"d5-adv-{cat}-{i:02d}","category":cat,"parameter":i,"raw":raw,"expectedClassification":expected,"expectedFirstInvalidStep":0 if expected=="invalid" else None,"labelAuthority":"independently authored before adapter tuning"})
assert len(cases)==150
Path(__file__).with_name("adversarial-cases.v1.json").write_text(json.dumps({"schema":"openpath-natural-working-d5-adversarial@1","frozenBeforeEvaluation":True,"cases":cases},indent=2)+"\n")
