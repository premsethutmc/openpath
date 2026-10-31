#!/usr/bin/env python3
"""check_student_set.py - recompute every label of student.json with SymPy (student_oracle.py) and compare.
Usage: python3 check_student_set.py [path/to/student.json]     exit 0 = all labels reproduced, 1 = any mismatch."""
import collections, hashlib, json, os, re, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import student_oracle as O

TAXONOMY = {"sign-error-moving-term", "one-sided-term-removal", "partial-division", "partial-distribution",
            "distribute-sign-error", "add-denominators", "cross-multiply-straight", "cancel-additive-term",
            "inverse-operation", "partial-clearing", "drop-denominator", "unbalanced-multiplication",
            "divided-by-unknown-factor", "arithmetic-slip"}
MINIMA = {"A": 120, "B": 300, "C": 60, "D": 40, "E": 36, "F": 30}
NAMES = ("status", "first_invalid", "invalid_at", "final_verdict")

def main(path):
    raw = open(path, "rb").read()
    data = json.loads(raw.decode("utf-8"))
    tasks, meta = data["tasks"], data["meta"]
    bad, pairs = [], 0
    for t in tasks:
        tid, e = t["id"], t["expected"]
        try:
            a = O.analyse(t["problem"], t["lines"], "lr")
            b = O.analyse(t["problem"], t["lines"], "tight")
        except Exception as ex:
            bad.append((tid, "analysis raised %s: %s" % (type(ex).__name__, ex)))
            continue
        pairs += len(t["lines"])
        ka, kb = O.verdict_key(a), O.verdict_key(b)
        if e["status"] == "ambiguous":
            if ka == kb:
                bad.append((tid, "marked ambiguous but both readings agree"))
            if e["readings"]["left-to-right"]["step_labels"] != a["step_labels"] or \
               e["readings"]["tight-denominator"]["step_labels"] != b["step_labels"]:
                bad.append((tid, "per-reading step labels differ"))
            for nm, k in (("left-to-right", ka), ("tight-denominator", kb)):
                if tuple(e["readings"][nm][n] for n in NAMES) != k:
                    bad.append((tid, "reading %s verdict differs" % nm))
            continue
        if ka != kb and e.get("readings_agree"):
            bad.append((tid, "readings_agree flag but readings differ"))
        if ka != kb and not e.get("readings_agree") and t["family"] != "E":
            bad.append((tid, "reading-dependent task outside family E"))
        got = tuple(e[n] for n in NAMES)
        if got != ka:
            bad.append((tid, "verdict %r != recomputed %r" % (got, ka)))
        if e["step_labels"] != a["step_labels"]:
            bad.append((tid, "step labels %r != %r" % (e["step_labels"], a["step_labels"])))
        if e["step_flags"] != a["step_flags"]:
            bad.append((tid, "step flags differ"))
        if e["status"] != "unsupported":
            fi = next((i for i, l in enumerate(a["step_labels"], 1) if l == "invalid"), None)
            if fi != e["first_invalid"]:
                bad.append((tid, "first_invalid %r vs first invalid label %r" % (e["first_invalid"], fi)))
        if e["status"] == "invalid" and e["invalid_at"] == "step" and t["family"] in ("B", "E"):
            if e["error_class"] not in TAXONOMY:
                bad.append((tid, "error_class %r not in taxonomy" % e["error_class"]))
        if e["error_class"] is not None and e["invalid_at"] != "step":
            bad.append((tid, "error_class set without a step error"))
        if t["truth"]["solution_set"] != a["truth"].to_json():
            bad.append((tid, "truth set differs"))
        if e["status"] == "unsupported" and not e.get("unsupported_lines"):
            bad.append((tid, "unsupported without listed lines"))
    ids = [t["id"] for t in tasks]
    if len(ids) != len(set(ids)):
        bad.append(("*", "duplicate ids"))
    fam = collections.Counter(t["family"] for t in tasks)
    for f, m in MINIMA.items():
        if fam[f] < m:
            bad.append(("*", "family %s has %d < %d" % (f, fam[f], m)))
    cls = collections.Counter(t["expected"]["error_class"] for t in tasks if t["family"] == "B")
    for c in TAXONOMY:
        if cls[c] < 15:
            bad.append(("*", "class %s has %d < 15" % (c, cls[c])))
    inc = sum(1 for t in tasks if t["family"] == "A" and t["expected"]["status"] == "valid-incomplete")
    if inc < 20:
        bad.append(("*", "only %d valid-incomplete in A" % inc))
    amb = sum(1 for t in tasks if t["expected"]["status"] == "ambiguous")
    agr = sum(1 for t in tasks if t["expected"].get("readings_agree"))
    if amb < 24 or agr < 12:
        bad.append(("*", "ambiguous %d (<24) or agreeing %d (<12)" % (amb, agr)))
    if meta["counts_per_family"] != dict(sorted(fam.items())):
        bad.append(("*", "meta family counts stale"))
    fz = os.path.join(HERE, "FROZEN.md")
    sha = hashlib.sha256(raw).hexdigest()
    if os.path.exists(fz) and path == os.path.join(HERE, "student.json"):
        m = re.search(r"SHA-256 of `student.json`: `([0-9a-f]{64})`", open(fz, encoding="utf-8").read())
        if not m or m.group(1) != sha:
            bad.append(("*", "FROZEN.md sha256 does not match student.json"))
    print("tasks: %d   lines checked: %d   sha256: %s" % (len(tasks), pairs, sha))
    print("families:", dict(sorted(fam.items())))
    print("status:  ", dict(sorted(collections.Counter(t["expected"]["status"] for t in tasks).items())))
    print("B classes:", dict(sorted(cls.items())))
    print("A valid-incomplete: %d   ambiguous: %d   readings-agree: %d" % (inc, amb, agr))
    print("dropped at generation: %d" % meta["dropped"])
    if bad:
        print("MISMATCHES: %d" % len(bad))
        for tid, msg in bad[:50]:
            print("  ", tid, msg)
        return 1
    print("OK: every label reproduced")
    return 0

if __name__ == "__main__":
    sys.exit(main(sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, "student.json")))
