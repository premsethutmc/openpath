"""Coverage evaluation of external proofs; unsupported is not a false rejection."""
from __future__ import annotations
import json
from collections import Counter
from pathlib import Path

root=Path(__file__).parent; data=json.loads((root/"external_geometry_proofs_v1.json").read_text()); counts=Counter()
for case in data["cases"]:
    # Formal System E and UniGeo text require a construction/parser adapter that the bounded
    # geometry IR does not yet provide. Refuse explicitly rather than inventing facts from text.
    outcome="unsupported"
    counts[outcome]+=1
result={"corpus":data["version"],"source_commit":data["source"]["commit"],"proofs":len(data["cases"]),"verified":counts["verified"],"invalid":counts["invalid"],"unsupported":counts["unsupported"],"false_acceptance":0,"false_rejection":0,"note":"unsupported cases are excluded from false-rejection counts; no natural-language or Formal System E adapter exists"}
(root/"external_proof_results.json").write_text(json.dumps(result,indent=2)+"\n"); print(json.dumps(result,indent=2))
