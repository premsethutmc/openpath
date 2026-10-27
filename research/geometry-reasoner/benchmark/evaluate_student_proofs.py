"""Evaluate complete proof labels, including first-invalid-step accuracy."""
from __future__ import annotations
import json,time
from collections import Counter
from pathlib import Path
from geometry_reasoner import Fact,GeometryObject,GeometryProblem,SubmittedProofStep,verify_submitted_proof

ROOT=Path(__file__).parent; rows=json.loads((ROOT/"student_complete_proofs_v1.json").read_text())["cases"]
def f(x): return Fact(x["predicate"],tuple(x["args"]),x.get("value"))
matrix=Counter(); first=final=0; start=time.perf_counter()
for row in rows:
    objects={x["id"]:GeometryObject.make(x["id"],x["kind"],**x.get("data",{})) for x in row["objects"]}
    p=GeometryProblem(row["id"],objects,[f(x) for x in row["facts"]],set(row["conditions"]),f(row["goal"]))
    steps=[SubmittedProofStep(x["id"],f(x["statement"]),tuple(x.get("cited_step_ids",())),x.get("cited_theorem")) for x in row["steps"]]
    a=verify_submitted_proof(p,steps); e=row["expected"]
    expected_ok=e["valid"] and e["complete"]; actual_ok=a.valid and a.complete
    matrix["false_acceptance"]+=actual_ok and not expected_ok; matrix["false_rejection"]+=expected_ok and not actual_ok
    first+=a.first_invalid_step==e["first_invalid_step"]; final+=(a.valid,a.complete)==(e["valid"],e["complete"])
elapsed=time.perf_counter()-start
out={"corpus":"student-complete-proofs@1","proofs":len(rows),"final_verdict_correct":final,"first_invalid_step_correct":first,
     "false_acceptance":matrix["false_acceptance"],"false_rejection":matrix["false_rejection"],"elapsed_seconds":round(elapsed,6),
     "categories":dict(sorted(Counter(x["category"] for x in rows).items()))}
(ROOT/"student_proof_results.json").write_text(json.dumps(out,indent=2)+"\n"); print(json.dumps(out,indent=2))
