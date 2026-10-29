"""Case-level adversarial suite: A (E7 assessMathematicalWorking, from e7-dump.ts), B (SymPy adapter), C1/C2."""
import json, os, sys, collections
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "verifier")); sys.path.insert(0, os.path.join(HERE, "..", "harness"))
from service import VerifierClient  # noqa: E402
from score import combine, metrics  # noqa: E402
S = json.load(open(os.path.join(HERE, "cases-suite.json")))
A = {r["id"]: r for r in json.load(open(os.path.join(HERE, "..", "out", "e7-rows-cases-suite.json")))}
cl = VerifierClient(15)
rows = []
for c in S:
    r = cl.call("case", {"problem": c["problem"], "working": c["studentWorking"]})
    res = r["result"]
    row = {"id": c["id"], "cat": "adversarial-cases", "exp": c["exp"], "A": A[c["id"]]["final"], "B": res["verdict"], "B_reason": str(res.get("reason"))[:200], "why": c["why"]}
    row["C1"], row["C2"] = combine(row, "C1"), combine(row, "C2")
    rows.append(row)
cl.close()
summ = {k: {kk: vv for kk, vv in metrics(rows, k).items()} for k in ("A", "B", "C1", "C2")}
json.dump({"rows": rows, "summary": summ}, open(os.path.join(HERE, "..", "out", "adversarial-cases-results.json"), "w"), indent=1)
for k in ("A", "B", "C1", "C2"):
    m = summ[k]
    print(k, {x: m[x] for x in ("exact", "falseAcceptances", "faIds", "falseRejections", "falseInvalidOnVerified", "falseInvalidIds", "undecided")})
for r in rows:
    if r["B"] != r["exp"]:
        print(r["id"], "exp", r["exp"], "A", r["A"], "B", r["B"], "|", r["B_reason"][:110])
