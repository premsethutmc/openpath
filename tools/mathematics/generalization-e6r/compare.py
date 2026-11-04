#!/usr/bin/env python3
"""Builds the benchmark comparison tables of MATH_E6R_SOUNDNESS_REPORT.md from the committed result files.
usage: python3 tools/mathematics/generalization-e6r/compare.py   (prints markdown)"""
import json,os
R=os.path.join(os.path.dirname(__file__),"..","generalization-e6","results")
PARTS=["e1adj","e2dev","e2sealed","e3dev","e3sealed","e4dev","e4sealed","e5dev","e5sealedadj","e6dev","e6val","e6sealed"]
def load(f):
    p=os.path.join(R,f)
    return json.load(open(p))["summary"] if os.path.exists(p) else None
def row(s):
    if not s: return ["-"]*9
    c=s["engineClassCounts"]; fi=s.get("firstInvalidExact") or [0,0]
    return [str(s["cases"]),str(s["exactVerdicts"]),str(s["falseAcceptances"]),str(s["falseRejections"]),str(c.get("unsupported",0)),str(c.get("ambiguous",0)),str(c.get("resource-exhausted",0)),f"{fi[0]}/{fi[1]}",f"{s['latencyMs']['p50']:.1f}/{s['latencyMs']['p95']:.1f}"]
H="| partition | engine | cases | exact | FA | FR | unsupported | ambiguous | resource-exh. | first-invalid exact | latency p50/p95 ms |\n|---|---|---|---|---|---|---|---|---|---|---|"
print(H)
for p in PARTS:
    for name,f in (("E5",f"{p}-base-e5.json"),("E6 (9ac079e)",f"{p}-base-e6.json"),("E6-R raw",f"{p}-e6r-final2.json")):
        print("| "+p+" | "+name+" | "+" | ".join(row(load(f)))+" |")
    if p in("e6val","e6sealed"): print("| "+p+" | E6-R adjudicated overlay | "+" | ".join(row(load(f"{p}-e6r-final2-overlay.json")))+" |")
