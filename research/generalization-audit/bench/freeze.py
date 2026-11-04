"""Freeze the benchmark: canonical JSON + SHA-256, before any E7 run. Refuses if an oracle disagreement is unresolved.
Usage (from research/generalization-audit): python3 bench/freeze.py
Later corrections must go into a new revision (frozen/benchmark.r2.json + frozen/REVISIONS.md), never edit r1."""
import json, hashlib, os, sys, collections, datetime
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
d = json.load(open(os.path.join(ROOT, "frozen", "benchmark-draft.json")))
bad = [c["id"] for c in d if c["oracleCertification"]["status"] == "disagree" and "[oracle-dispute]" not in c["explanation"]]
if bad:
    sys.exit(f"unresolved oracle disagreements: {bad[:20]} ({len(bad)})")
if os.path.exists(os.path.join(ROOT, "frozen", "benchmark.json")):
    sys.exit("frozen/benchmark.json exists: write a new revision instead")
canon = json.dumps(sorted(d, key=lambda c: c["id"]), sort_keys=True, ensure_ascii=False, separators=(",", ":"))
sha = hashlib.sha256(canon.encode()).hexdigest()
open(os.path.join(ROOT, "frozen", "benchmark.json"), "w").write(canon)
st = collections.Counter(c["oracleCertification"]["status"].split(" (")[0] for c in d)
meta = {"revision": 1, "sha256": sha, "cases": len(d), "frozenAtUTC": datetime.datetime.utcnow().isoformat(timespec="seconds") + "Z",
        "engineBaselineCommit": "837c79cc8d7b1effa06b8553960322af7ec3f88b", "byCategory": dict(collections.Counter(c["category"] for c in d)),
        "oracleStatus": dict(st), "byRelation": dict(collections.Counter(c["relation"] for c in d)), "byKind": dict(collections.Counter(c["kind"] for c in d)),
        "note": "Expected verdicts are author-declared and oracle-checked; frozen before any E7 execution. The freeze commit is recorded in results/RUN.md."}
json.dump(meta, open(os.path.join(ROOT, "frozen", "FREEZE.json"), "w"), indent=1)
print(json.dumps(meta, indent=1))
