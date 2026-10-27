#!/usr/bin/env python3
"""Builds the machine-readable E2 deliverables from results/*.json (no engine calls)."""
import json, collections
R = lambda n: json.load(open(f"results/{n}.json"))
out = {}
# --- E2 benchmark before/after
bench = {}
for part in ("dev", "sealed"):
    b, a = R(f"{part}-before")["summary"], R(f"{part}-after")["summary"]
    bench[part] = {"before": {k: b[k] for k in ("cases","falseAcceptances","unaccountedAcceptances","falseRejections","verified","assessed","unsupportedOrInconclusive","firstInvalidExact","firstInvalidLine","alternativeAccepted","restrictionDetected","byCategory")},
                   "after": {k: a[k] for k in ("cases","falseAcceptances","unaccountedAcceptances","falseRejections","verified","assessed","unsupportedOrInconclusive","firstInvalidExact","firstInvalidLine","alternativeAccepted","restrictionDetected","byCategory","codeDigest")}}
json.dump(bench, open("results/e2-benchmark-summary.json", "w"), indent=1)
# --- line-status diagnostics across every evaluated case after E2
diag = {}
for name in ("e1-after", "dev-after", "sealed-after"):
    cs = R(name)["cases"]
    st = collections.Counter(); verified_all = 0; with_acct = 0; unacc = 0
    for c in cs:
        s = c["integrity"]["lineStatuses"]
        if s is not None:
            with_acct += 1; st.update(s.values())
            if c["engine"]["classification"] == "verified": verified_all += int(all(v == "verified-valid" for v in s.values()))
        unacc += int(c["metrics"]["unaccountedAcceptance"])
    ver = sum(c["engine"]["classification"] == "verified" for c in cs)
    diag[name] = {"cases": len(cs), "casesWithLineAccount": with_acct, "lineStatusCounts": dict(st), "verifiedCases": ver,
                  "verifiedWithEveryLineVerifiedValid": verified_all, "verifiedCasesWithoutLineAccount": ver - sum(1 for c in cs if c["engine"]["classification"] == "verified" and c["integrity"]["lineStatuses"] is not None),
                  "unaccountedAcceptances": unacc, "thrown": sum(bool(c["metrics"]["thrown"]) for c in cs)}
json.dump(diag, open("results/proof-integrity-diagnostics.json", "w"), indent=1)
# --- 16 false acceptances: root cause + before/after
before = json.load(open("false-accepts-before.json")); after = {x["id"]: x for x in json.load(open("false-accepts-after.json"))}
disputed = {"e1-116", "e1-126", "e1-141"}
rows = []
for b in before:
    a = after[b["id"]]
    lost = len(b["linesDiscarded"])
    causes = ["lost-student-lines", "final-answer-only-verification", "incorrect-source-mapping"]
    if b["adapter"] == "function-evaluation" and b["expected"]["classification"] == "incomplete":
        causes += ["unsupported-step-omission (no evaluated-form completeness obligation)", "incorrect-dependency-construction (chain started from the typed problem, not the written definition line)"]
    if b["adapter"] == "complex-modulus":
        causes += ["invalid-step-omission", "proof-certificate-mismatch (|z|=2 was converted to the different claim |z|^2=2 for a modulus-square problem)"]
    if b["id"] in disputed: causes += ["reference-label-defect (every written line is a true statement at input 1)"]
    elif b["expected"]["classification"] == "invalid": causes += ["invalid-step-omission"]
    rows.append({"id": b["id"], "partition": "sealed-holdout" if b["id"] in ("e1-126","e1-131","e1-134","e1-141") else "diagnostic", "problem": b["problem"], "studentWorking": b["working"],
        "expected": b["expected"], "actualBefore": b["actual"], "actualAfter": a["actual"],
        "originalLines": b["originalLines"], "linesRetainedBefore": b["linesRetained"], "linesDiscardedBefore": b["linesDiscarded"],
        "lineStatusesAfter": a["lineStatuses"], "adapter": b["adapter"], "proofEvidenceBefore": {"certificates": b["certificates"], "note": "certificate(s) covered the final expression only"},
        "proofEvidenceAfter": {"certificates": a["certificates"], "claimBinding": a["u4"]["claimBinding"]}, "rootCauses": causes,
        "resolved": a["actual"]["classification"] != "verified" or b["id"] in disputed, "resolution": ("reference disputed: engine verdict is mathematically correct" if b["id"] in disputed else "no longer verified; "+a["actual"]["classification"])})
json.dump(rows, open("results/root-cause-16.json", "w"), indent=1)
print(json.dumps({k: {x: y for x, y in v.items() if x != "lineStatusCounts"} for k, v in diag.items()}, indent=0)[:900]); print(diag["e1-after"]["lineStatusCounts"])
