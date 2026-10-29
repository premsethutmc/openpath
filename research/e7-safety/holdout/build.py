"""Holdout cases -> E7 input envelopes, reusing the audit adapter's SymPy -> E7 JSON conversion (with round-trip check).
Usage (repo root): python3 research/e7-safety/holdout/build.py research/e7-safety/holdout/cases.json research/e7-safety/holdout/inputs.json"""
import json, os, sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "generalization-audit", "adapter"))
import build_inputs as B  # noqa: E402

import re
NAT = lambda t: re.sub(r"\blog\(", "ln(", t)  # the holdout brief defines log as the natural log; the oracle parser refuses bare log
cases, out = json.load(open(sys.argv[1])), []
for c in cases:
    ch, row = c["channel"], {"id": c["id"], "channel": c["channel"]}
    try:
        if ch == "parser":
            row["text"] = c["text"]
        elif ch == "symbolic":
            a, ea = B.json_of(NAT(c["start"])); b, eb = B.json_of(NAT(c["next"]))
            if ea or eb: raise B.Unrep(ea or eb)
            prob = {"domain": "symbolic", "start": a}
            if c.get("assumptions"): prob["assumptions"] = [B.assumption_json(x) for x in c["assumptions"]]
            row.update(problem=prob, working=[{"id": "s0", "expression": b}])
        elif ch in ("algebra", "answer-first"):
            row.update(problem={"domain": "algebra", "statement": c["statement"]}, working={"format": "natural", "text": "\n".join(c["working"])})
        elif ch == "integral":
            f, ef = B.json_of(NAT(c["integrand"]))
            if ef: raise B.Unrep(ef)
            row.update(problem={"domain": "calculus", "task": "indefinite-integral", "integrand": f, "variable": "x"}, working={"format": "natural", "text": c["working"]})
    except Exception as e:  # noqa: BLE001
        row["unavailable"] = f"adapter: {e}"
    out.append(row)
json.dump(out, open(sys.argv[2], "w"))
print(len(out), sum("unavailable" in r for r in out), "unavailable")
