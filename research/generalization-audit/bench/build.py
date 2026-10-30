"""Build the benchmark: collect authored cases, assign IDs, certify each with the independent oracle, write the draft.

Usage (from research/generalization-audit): python3 bench/build.py [--only CAT] [--procs N]
Outputs: frozen/benchmark-draft.json, frozen/oracle-report.json. Freezing is a separate step (bench/freeze.py).
No E7 code is imported or executed here.
"""
import importlib, json, os, sys, argparse, collections, traceback
from multiprocessing import Pool
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.join(ROOT, "oracle"))
import schema  # noqa: E402

COMPAT_T = {"valid-equivalence": {"equivalence"}, "valid-implication": {"implication"}, "invalid": {"invalid"}}
COMPAT_W = {"valid-equivalence": {"verified"}, "valid-implication": {"verified"}, "invalid": {"invalid"}, "incomplete": {"incomplete"},
            "domain-violation": {"missing-assumption", "invalid"}, "wrong-reason": {"verified"}}


def load(only=None):
    for f in sorted(os.listdir(os.path.join(HERE, "categories"))):
        if f.endswith(".py") and not f.startswith("_"):
            name = f[:-3]
            if only and not name.lower().startswith(only.lower()):
                continue
            schema._ctx["module"] = name
            importlib.import_module("categories." + name)
    cs = schema.cases()
    counters = collections.Counter()
    for c in cs:
        counters[c["category"]] += 1
        c["id"] = f"{c['category']}-{counters[c['category']]:04d}"
    return cs


def certify(c):
    import oracle as O
    try:
        if c["kind"] == "transition":
            r = O.certify_transition(c["oracle"]["prev"], c["oracle"]["next"], c["transitionKind"], c["assumptions"])
            got = r["relation"]
            if c["relation"] in COMPAT_T:
                status = "uncertified" if got is None else ("agree" if got in COMPAT_T[c["relation"]] else "disagree")
            elif c["relation"] == "domain-violation":
                ok = {"domain-violation"} if c["transitionKind"] == "expression" else {"implication", "invalid"}
                status = "uncertified" if got is None else ("agree" if got in ok else "disagree")
            elif c["relation"] == "insufficient-information" and got == "ambiguous":
                status = "agree"
            else:
                status = "policy"
            return {"status": status, "oracle": got, "evidence": r["evidence"]}
        t = c["task"]["type"]
        lines = c["oracle"]["lines"]
        raw = "\n".join(c["working"])
        if t in ("solve", "system"):
            r = O.certify_solve(c["task"], c["assumptions"], lines, raw) if t == "solve" else O.certify_system(c["task"], lines)
        elif t in ("simplify", "expand", "factor", "evaluate", "show"):
            r = O.certify_expression_chain(c["task"], c["assumptions"], lines)
        elif t in ("derivative", "indefinite-integral", "definite-integral", "limit"):
            r = O.certify_calculus(c["task"], lines)
        else:
            r = {"verdict": None, "certified": False, "evidence": "proof-style task: hand derivation only"}
        got = r.get("verdict")
        rel = c["relation"]
        if rel in COMPAT_W:
            status = "uncertified" if got is None else ("agree" if got in COMPAT_W[rel] else "disagree")
            if rel == "wrong-reason" and status == "agree":
                status = "agree (math certified; cited-reason label is policy)"
        elif rel == "unsupported" and got is not None:
            want = {"valid": "verified", "invalid": "invalid"}.get(c["truth"])
            status = "agree" if want is None or got == want or (want == "verified" and got in ("verified",)) else "disagree"
        else:
            status = "policy" if got is None else f"policy (oracle: {got})"
        return {"status": status, "oracle": got, "evidence": str(r.get("evidence"))[:300], "facts": {k: str(v)[:200] for k, v in (r.get("facts") or {}).items()}}
    except Exception as e:  # noqa: BLE001
        return {"status": "uncertified", "oracle": None, "evidence": f"oracle error {type(e).__name__}: {str(e)[:200]}"}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--only")
    ap.add_argument("--procs", type=int, default=2)
    a = ap.parse_args()
    cs = load(a.only)
    with Pool(a.procs) as p:
        res = p.map(certify, cs, chunksize=4)
    for c, r in zip(cs, res):
        c["oracleCertification"] = r
    out = os.path.join(ROOT, "frozen", "benchmark-draft.json" if not a.only else f"draft-{a.only}.json")
    json.dump(cs, open(out, "w"), indent=1, ensure_ascii=False)
    st = collections.Counter(r["status"].split(" (")[0] for r in res)
    print(len(cs), "cases", dict(collections.Counter(c["category"] for c in cs)), dict(st))
    for c, r in zip(cs, res):
        if r["status"] in ("disagree", "uncertified") and c["relation"] not in ("unsupported", "insufficient-information"):
            print(" ", c["id"], c["relation"], r["status"], "| oracle:", r["oracle"], "|", r["evidence"][:150])


if __name__ == "__main__":
    main()
