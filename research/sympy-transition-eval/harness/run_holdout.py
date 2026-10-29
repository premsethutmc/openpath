"""Run the isolated SymPy case verifier (B) over the exposed E7 holdout and score A, B and the proposed combinations C.

Usage (repo root): python3 research/sympy-transition-eval/harness/run_holdout.py [--workers N] [--timeout S]
Inputs : tools/mathematics/generalization-e7/holdout/{cases,labels}.json (read-only)
         research/sympy-transition-eval/out/e7-rows.json (engine A, produced by e7-dump.ts)
Outputs: research/sympy-transition-eval/out/holdout-results.json (per case), holdout-summary.json
"""
import json, os, sys, time, argparse, statistics, collections
from concurrent.futures import ThreadPoolExecutor
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
sys.path.insert(0, os.path.join(ROOT, "research/sympy-transition-eval/verifier")); sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from service import VerifierClient  # noqa: E402
from score import score_all  # noqa: E402

ap = argparse.ArgumentParser()
ap.add_argument("--workers", type=int, default=6)
ap.add_argument("--timeout", type=float, default=20.0)
ap.add_argument("--only", default="")
args = ap.parse_args()
H = os.path.join(ROOT, "tools/mathematics/generalization-e7/holdout/")
OUT = os.path.join(ROOT, "research/sympy-transition-eval/out/")
cases = json.load(open(H + "cases.json"))
labels = {l["id"]: l for l in json.load(open(H + "labels.json"))}
e7 = {r["id"]: r for r in json.load(open(OUT + "e7-rows.json"))}
if args.only:
    cases = [c for c in cases if args.only in c["id"]]

clients = [VerifierClient(args.timeout) for _ in range(args.workers)]
free = list(clients)
import threading
lock = threading.Lock()


def run(c):
    with lock:
        cl = free.pop()
    try:
        r = cl.call("case", {"problem": c["problem"], "working": c["studentWorking"]})
    finally:
        with lock:
            free.append(cl)
    res = r.get("result") if r.get("ok") else {"verdict": "unsupported", "reason": "error: " + str(r.get("error"))}
    return {"id": c["id"], "cat": labels[c["id"]]["cat"], "exp": labels[c["id"]]["exp"], "alt": labels[c["id"]]["alt"],
            "A": e7[c["id"]]["final"], "B": res["verdict"], "B_reason": str(res.get("reason", ""))[:240], "B_ms": round(r["ms"], 2),
            "timeout": bool(r.get("timeout")), "crash": bool(r.get("crash")), "A_ms": e7[c["id"]]["ms"]}


t0 = time.time()
with ThreadPoolExecutor(args.workers) as ex:
    rows = list(ex.map(run, cases))
for cl in clients:
    cl.close()
summary = score_all(rows)
summary["wallSec"] = round(time.time() - t0, 1)
summary["workerRestarts"] = sum(c.restarts for c in clients)
suffix = "-" + args.only if args.only else ""
json.dump(rows, open(OUT + f"holdout-results{suffix}.json", "w"), indent=0)
json.dump(summary, open(OUT + f"holdout-summary{suffix}.json", "w"), indent=1)
print(json.dumps({k: summary[k] for k in ("A", "B", "C1", "C2")}, indent=None))
