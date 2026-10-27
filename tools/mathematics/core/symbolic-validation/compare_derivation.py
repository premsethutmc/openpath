"""Derivation harness vs oracle: mathematics verdict, first invalid step, conditional-never-silently-unconditional, outstanding obligations."""
import json, sys, collections
cases = {c["id"]: c for c in json.load(open(sys.argv[1]))}; res = {r["id"]: r for r in json.load(open(sys.argv[2]))}
st = collections.Counter(); bad = []
for i, c in cases.items():
    r = res[i]; o = c["oracle"]; st["cases"] += 1
    if "crash" in r: st["crash"] += 1; bad.append((i, "crash", r)); continue
    if r["math"] == "undetermined": st["undetermined"] += 1; continue
    clss = [s["cls"] for s in o["steps"]]
    exp_first = o["first_invalid"]
    exp_math = "incorrect" if exp_first is not None else "correct"
    if r["math"] != exp_math: st["math-mismatch"] += 1; bad.append((i, "math", r, o)); continue
    if exp_first is not None and r["first"] != exp_first: st["first-mismatch"] += 1; bad.append((i, "first", r, o)); continue
    st["math-agree"] += 1
    if exp_math == "correct":
        exp_cond = any(k == "conditional" for k in clss) or o["final"]["missing"]
        if exp_cond and r["cond"] == "unconditional": st["SILENT-UNCONDITIONAL"] += 1; bad.append((i, "silent", r, o)); continue
        if (not exp_cond) and r["cond"] == "conditional" and not r["outstanding"] and r["obligations"] == 0: st["spurious-conditional"] += 1
        if bool(o["final"]["missing"]) != bool(r["outstanding"]): st["outstanding-mismatch"] += 1; bad.append((i, "outstanding", r, o))
    else: st["invalid-later-repair-violations"] += (0 if r["repair"] else 1)
print(dict(st))
json.dump([{"id": b[0], "why": b[1], "case": cases[b[0]], "result": b[2]} for b in bad], open(sys.argv[3], "w"))
