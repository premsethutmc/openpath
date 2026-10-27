#!/usr/bin/env python3
import json
from pathlib import Path
root=Path(__file__).parents[3];frozen=json.loads((root/"tools/mathematics/natural-working-d4/frozen-natural-working-cases.v1.json").read_text());d5=json.loads((root/"tools/mathematics/natural-working-d5/final-results.v1.json").read_text());by={x["id"]:x for x in frozen["cases"]};rows=[]
for r in d5["results"]:
 if r["classification"]!="unsupported":continue
 c=by[r["id"]];i=int(r["id"][-3:])
 if c["category"]=="geometry-vectors":blocker="missing-domain-or-assumption-handling";detail="segment name and value are text; adapter must match a typed geometric object, given measurement and nonzero condition before U4 checks the derived scalar claim"
 elif i%2==0:blocker="missing-multi-step-relationship";detail="exact scalar assignment must substitute into a symbolic formula with source/dependency preservation"
 else:blocker="missing-typed-conversion";detail="a prior scalar assignment must bind the symbolic function argument before M3/U4 evaluation"
 rows.append({"id":r["id"],"category":c["category"],"blocker":blocker,"detail":detail})
assert len(rows)==50
out={"schema":"openpath-natural-working-d6-remaining-inventory@1","sourceBenchmarkSha256":"3dad06d2fa23b9f0fe56e04a0b1ebcce28b449ef82d99bbcf559a09a500f14e5","total":50,"cases":rows};Path(__file__).with_name("d5-remaining-inventory.v1.json").write_text(json.dumps(out,indent=2)+"\n")
