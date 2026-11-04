"""Evaluate the committed hardening benchmark and emit reproducible family metrics."""
from __future__ import annotations
import json, time
from collections import defaultdict
from pathlib import Path
from geometry_reasoner import AlgebraicVerifier, Fact, GeometryObject, GeometryProblem, verify_student_proof

ROOT=Path(__file__).parent
def f(x,status="given"): return Fact(x["predicate"],tuple(x["args"]),x.get("value"),status)
rows=json.loads((ROOT/"school_geometry_hardening_v2.json").read_text())["cases"]
metrics=defaultdict(lambda:{"cases":0,"false_acceptance":0,"false_rejection":0,"mismatch":0})
start=time.perf_counter()
for row in rows:
    objects={x["id"]:GeometryObject.make(x["id"],x["kind"],**x.get("data",{})) for x in row["objects"]}
    p=GeometryProblem(row["id"],objects,[f(x) for x in row["facts"]],set(row["conditions"]),f(row["goal"]))
    steps=[f(x,"assumed") for x in row["student_steps"]]
    if row.get("strategy")=="algebraic": actual=AlgebraicVerifier().verify(p,steps[-1]).verdict
    else: actual=verify_student_proof(p,steps).steps[-1].verdict
    expected=row["expected"]["verdict"]; m=metrics[row["category"]]; m["cases"]+=1
    m["false_acceptance"]+=int(actual=="verified" and expected!="verified")
    m["false_rejection"]+=int(actual!="verified" and expected=="verified")
    m["mismatch"]+=int(actual!=expected)
elapsed=time.perf_counter()-start
output={"benchmark":"school-geometry-hardening@2","cases":len(rows),"elapsed_seconds":round(elapsed,6),"cases_per_second":round(len(rows)/elapsed,1),"families":dict(sorted(metrics.items()))}
(ROOT/"hardening_results.json").write_text(json.dumps(output,indent=2)+"\n")
print(json.dumps(output,indent=2))
