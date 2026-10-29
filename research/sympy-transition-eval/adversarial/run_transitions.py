"""Run the adversarial transition suite through B (isolated SymPy verifier, worker process) and score A, B, C.
Usage (repo root): python3 research/sympy-transition-eval/adversarial/run_transitions.py   (run e7-transitions.ts first)"""
import json, os, sys, collections
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "verifier"))
from service import VerifierClient  # noqa: E402

cases = json.load(open(os.path.join(HERE, "transitions.json")))
A = {r["id"]: r for r in json.load(open(os.path.join(HERE, "e7-transitions-out.json")))}
cl = VerifierClient(timeout_s=15)
rows = []
for c in cases:
    r = cl.call("transition", {"prev": c["prev"], "next": c["next"], "assumptions": c["assumptions"], "task": c["task"]})
    res = r["result"] if r.get("ok") else {"verdict": "unresolved", "reason": r.get("error")}
    a = A[c["id"]]["verdict"]
    b = res["verdict"]
    if a == "invalid" and b in ("equivalent", "implication"):
        cc = "conflict"
    elif a == "conditional" and b in ("equivalent", "implication", "invalid"):
        cc = b  # E7 asks for an assumption; an exact SymPy decision refines it
    elif a != "unresolved":
        cc = a
    else:
        cc = b
    rows.append({"id": c["id"], "category": c["category"], "task": c["task"], "expected": c["expected"], "A": a, "A_detail": A[c["id"]]["detail"][:200],
                 "B": b, "B_reason": str(res.get("reason", ""))[:200], "B_counterexample": res.get("counterexample"),
                 "B_restrictions": res.get("required_restrictions"), "C": cc, "A_ms": A[c["id"]]["ms"], "B_ms": round(r["ms"], 2), "B_timeout": bool(r.get("timeout"))})
cl.close()


def outcome(exp, got):
    if got == exp:
        return "correct"
    if got == "conditional":  # E7 'missing-assumption': requires a restriction, does not accept
        return "correct" if exp == "implication" else ("safe-miss" if exp in ("invalid", "unresolved") else "over-restrictive")
    if got in ("unresolved", "conflict"):
        return "safe-miss" if exp != "unresolved" else "correct"
    if exp in ("invalid", "unresolved") and got in ("equivalent", "implication"):
        return "FALSE-ACCEPT"
    if exp in ("equivalent", "implication") and got == "invalid":
        return "FALSE-INVALID"
    if exp == "implication" and got == "equivalent":
        return "DOMAIN-LOSS"  # accepted as equivalent although a restriction is required
    if exp == "equivalent" and got == "implication":
        return "over-restrictive"
    if exp == "unresolved" and got == "invalid":
        return "decided-on-bad-input"
    return "other"


summary = {}
for k in ("A", "B", "C"):
    oc = collections.Counter(outcome(r["expected"], r[k]) for r in rows)
    bycat = {}
    for cat in sorted({r["category"] for r in rows}):
        rs = [r for r in rows if r["category"] == cat]
        bycat[cat] = dict(collections.Counter(outcome(r["expected"], r[k]) for r in rs)) | {"n": len(rs)}
    bad = [r["id"] for r in rows if outcome(r["expected"], r[k]) in ("FALSE-ACCEPT", "FALSE-INVALID", "DOMAIN-LOSS", "decided-on-bad-input", "other")]
    summary[k] = {"outcomes": dict(oc), "byCategory": bycat, "unsoundIds": bad}
ms = sorted(r["B_ms"] for r in rows)
summary["B_latencyMs"] = {"p50": ms[len(ms) // 2], "p95": ms[int(len(ms) * .95)], "p99": ms[min(len(ms) - 1, int(len(ms) * .99))], "max": ms[-1]}
ams = sorted(r["A_ms"] for r in rows)
summary["A_latencyMs"] = {"p50": ams[len(ams) // 2], "p95": ams[int(len(ams) * .95)], "p99": ams[min(len(ams) - 1, int(len(ams) * .99))], "max": ams[-1]}
summary["B_timeouts"] = sum(r["B_timeout"] for r in rows)
summary["n"] = len(rows)
json.dump(rows, open(os.path.join(HERE, "..", "out", "adversarial-transitions-results.json"), "w"), indent=1)
json.dump(summary, open(os.path.join(HERE, "..", "out", "adversarial-transitions-summary.json"), "w"), indent=1)
for k in ("A", "B", "C"):
    print(k, summary[k]["outcomes"], "unsound:", summary[k]["unsoundIds"])
print(summary["A_latencyMs"], summary["B_latencyMs"], "timeouts", summary["B_timeouts"])
