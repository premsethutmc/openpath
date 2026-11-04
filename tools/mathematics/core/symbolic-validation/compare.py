"""Compare engine results with the oracle's labels. Writes fixtures for every disagreement."""
import json, sys, collections
cases = {c["id"]: c for c in json.load(open(sys.argv[1]))}; res = {r["id"]: r for r in json.load(open(sys.argv[2]))}
out_fix = sys.argv[3] if len(sys.argv) > 3 else None
lines_n = lambda c: len(c["lines"])
MAP = {"valid": "valid", "no-change": "valid", "valid-with-obligation": "conditional", "invalid": "invalid", "unsupported": "unsupported"}
tab = collections.defaultdict(lambda: collections.Counter()); fix = []
for id_, c in cases.items():
    r = res.get(id_)
    if r is None or "crash" in r: tab[c["kind"]]["crash"] += 1; fix.append({"id": id_, "why": "crash", "case": c, "engine": r}); continue
    o = c["oracle"]; es = [MAP.get(s, s) for s in r["steps"]]; os_ = [("valid" if s["cls"] in ("statement", "empty") else s["cls"]) for s in o["steps"]]
    k = c["kind"]; tab[k]["cases"] += 1
    if not es and lines_n(c) and r.get("outcome") in ("ambiguous", "unsupported", "incomplete"):
        tab[c["kind"]]["engine-refused-whole"] += 1; tab[c["kind"]][f"refused:{c['family']}"] += 1; continue
    if len(es) != len(os_): tab[k]["length-mismatch"] += 1; fix.append({"id": id_, "why": "step-count", "case": c, "engine": r}); continue
    bad = None
    for i, (e, x) in enumerate(zip(es, os_)):
        tab[k]["steps"] += 1
        if e == x: tab[k]["step-agree"] += 1; continue
        if e == "unsupported": tab[k]["step-unsupported"] += 1; tab[k][f"unsupported:{c['family']}"] += 1; bad = bad or "unsupported"; continue
        if x == "invalid" and e in ("valid", "conditional"): tab[k]["FALSE-ACCEPT"] += 1; bad = "FALSE-ACCEPT"
        elif e == "invalid" and x in ("valid", "conditional"): tab[k]["FALSE-REJECT"] += 1; bad = "FALSE-REJECT"
        elif {e, x} == {"valid", "conditional"}: tab[k]["conditionality-mismatch"] += 1; bad = "conditionality"
        else: tab[k]["other-mismatch"] += 1; bad = "other"
        break   # later steps depend on the first disagreement
    # whole-derivation: first invalid step, and the domain flags when the working is otherwise valid
    if bad is None or bad == "unsupported":
        if o["first_invalid"] != r["first"] and bad is None: tab[k]["first-invalid-mismatch"] += 1; bad = "first-invalid"
    if bad is None and o["first_invalid"] is None and r["domain"] is not None:
        m_e = bool(r["domain"]["missing"]); m_o = o["final"]["missing"]; n_e = bool(r["domain"]["narrowed"]); n_o = o["final"]["narrowed"]
        tab[k]["domain-final-checked"] += 1
        if m_e != m_o: tab[k]["missing-flag-mismatch"] += 1; bad = "missing-flag"
        if n_e != n_o: tab[k]["narrowed-flag-mismatch"] += 1; bad = bad or "narrowed-flag"
    if bad is None: tab[k]["whole-agree"] += 1
    elif bad != "unsupported": fix.append({"id": id_, "why": bad, "case": c, "engine": r})
    else: tab[k]["whole-unsupported"] += 1
for k, c in tab.items(): print(k, dict(sorted(c.items())))
print("disagreements (excluding unsupported):", len(fix))
if out_fix: json.dump(fix, open(out_fix, "w"), indent=1)
