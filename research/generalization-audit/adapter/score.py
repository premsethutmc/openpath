"""Evaluation step 3: score E7 raw output against the frozen expected verdicts.

Usage (from research/generalization-audit):
  python3 adapter/score.py frozen/benchmark.json results/e7-raw.json results/adapter-inputs.json MATH_GENERALIZATION_RESULTS.json results/summary.json
Primary channel per case: answer-first transition (T/statement), unified symbolic (T/expression), unified natural (W).
Outcomes: correct | false-acceptance | overclaim | false-rejection | misgrade | safe-abstention | adapter-defect.
Abstentions are never counted as correct proofs unless abstention is the expected behaviour.
"""
import json, sys, collections, math, re

ABSTAIN_RAW = {"unsupported", "malformed", "ambiguous", "resource-exhausted", "contradictory", "error", "unresolved"}
ACCEPT = {"transition": {"equivalent", "implied"}, "working": {"verified"}}
PARSE_MSG = re.compile(r"unsupported character|unexpected trailing|expected expression|malformed|comma suffix|missing closing|solution branches|plus-or-minus|conjunction may only|power exponent|PARSE_ERROR|ambiguous|could not be translated|unexpected charac", re.I)


def map_verdict(case, ch, rec):
    if rec is None:
        return "abstain", "no channel"
    if "unavailable" in rec:
        u = rec["unavailable"]
        return ("adapter-defect" if u.startswith(("ADAPTER-DEFECT", "unreadable by adapter", "adapter has no")) else "unrepresentable"), u
    raw = rec.get("raw")
    if ch == "answer-first-transition":
        return ({"equivalent": "equivalent", "implied": "implied", "invalid": "invalid", "narrowing": "invalid"}.get(raw, "abstain")), raw
    if ch == "unified-symbolic":
        return ({"verified": "equivalent", "invalid": "invalid", "missing-assumption": "conditional"}.get(raw, "abstain")), raw
    return (raw if raw in ("verified", "invalid", "incomplete", "missing-assumption") else "abstain"), raw


def outcome(case, got):
    if got == "adapter-defect":
        return "adapter-defect"
    g = "abstain" if got == "unrepresentable" else got
    if g in case["acceptable"]:
        return "correct"
    if g == "abstain":
        return "safe-abstention"
    acc = ACCEPT[case["kind"]]
    expect_accepting = case["expected"] in acc or (case["relation"] == "unsupported" and case.get("truth") == "valid")
    if g in acc:
        if case["relation"] == "valid-implication" and g == "equivalent":
            return "overclaim"
        if expect_accepting:
            return "misgrade"  # e.g. implied for a two-way equivalence
        return "false-acceptance"
    return "false-rejection" if expect_accepting else "misgrade"


def wilson(k, n):
    if n == 0:
        return None
    z, p = 1.96, k / n
    d = 1 + z * z / n
    c = (p + z * z / (2 * n)) / d
    h = z * math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / d
    return [round(max(0, c - h), 4), round(min(1, c + h), 4)]


def pct(xs, q):
    xs = sorted(xs)
    return round(xs[min(len(xs) - 1, int(len(xs) * q))], 3) if xs else None


def failure_class(case, rec, got, oc):
    """Primary failure class A-K (automatic first pass; reviewed cases override via review.json)."""
    if oc == "adapter-defect":
        return "J", ""
    if oc in ("correct",):
        return None, ""
    det = (rec or {}).get("detail", "") if rec else ""
    raw = (rec or {}).get("raw", "")
    parse = (rec or {}).get("parse") or {}
    sec = []
    if case.get("relation") in ("domain-violation", "insufficient-information") or re.search(r"domain|restriction|excluded|assumption", case["invariant"], re.I):
        sec.append("E")
    if case.get("composition"):
        sec.append("F")
    if got == "unrepresentable":
        return "B", ",".join(sec)
    if re.search(r"no lossless natural adapter|not an equation|more than one '='|unknown symbol", str(det)):
        return "B", ",".join(sec)
    if case.get("task", {}).get("type") == "statement-task":
        return "H", ",".join(sec)
    if re.search(r"outside the exact checker|UNSUPPORTED_OPERATOR|acceptance withdrawn|no bounded exact strategy|outside bounded exact|proof kernel could not verify", str(det)) and oc == "safe-abstention":
        return "C", ",".join(sec)
    if parse and parse.get("classification") not in (None, "parsed"):
        return "A", ",".join(sec)
    if PARSE_MSG.search(str(det)) and oc == "safe-abstention":
        return "A", ",".join(sec)
    if re.search(r"no lossless natural adapter|not an equation|more than one '='|unknown symbol|not a number problem|outside the exact checker", str(det)):
        return "B", ",".join(sec)
    if case.get("task", {}).get("type") == "statement-task" or re.search(r"outside bounded exact|no bounded exact strategy|outside prototype|task '", str(det)):
        return ("H" if case.get("task", {}).get("type") == "statement-task" else "C"), ",".join(sec)
    if oc in ("misgrade",) and case["relation"] in ("wrong-reason", "insufficient-information", "incomplete", "domain-violation"):
        return "G", ",".join(sec)
    if oc in ("false-acceptance", "overclaim"):
        if "E" in sec or case["relation"] in ("domain-violation",):
            return "E", ",".join(s for s in sec if s != "E")
        if case["relation"] == "wrong-reason":
            return "G", ",".join(sec)
        return "D", ",".join(sec)
    if oc == "false-rejection" and raw in ("invalid", "missing-assumption", "incomplete") or (oc == "false-rejection" and got in ("invalid", "conditional")):
        return ("E" if "E" in sec else "D"), ",".join(s for s in sec if s != "E")
    m = re.search(r"line\(s\) ([\d, ]+) could not be verified", str(det))
    if m and case["chainLength"] >= 3:
        return "F", ",".join(sec)
    if oc == "safe-abstention":
        return ("C" if case["kind"] == "working" and case.get("domain") == "calculus" else "F" if case["chainLength"] >= 3 else "C"), ",".join(sec)
    return "K", ",".join(sec)


def main(bench_p, raw_p, inputs_p, out_p, summ_p, review_p=None):
    B = {c["id"]: c for c in json.load(open(bench_p))}
    R = {r["id"]: r for r in json.load(open(raw_p))}
    I = {r["id"]: r for r in json.load(open(inputs_p))}
    review = json.load(open(review_p)) if review_p else {}
    rows = []
    for cid, c in B.items():
        r = R[cid]
        ch = r["primary"]
        rec = r["channels"].get(ch)
        got, raw = map_verdict(c, ch, rec)
        oc = outcome(c, got)
        fc, sec = failure_class(c, rec, got, oc)
        if cid in review:
            fc, sec = review[cid].get("class", fc), review[cid].get("secondary", sec)
        af = r["channels"].get("answer-first")
        rows.append({
            "id": cid, "category": c["category"], "domain": c["domain"], "principle": c["principle"], "invariant": c["invariant"],
            "kind": c["kind"], "relation": c["relation"], "truth": c.get("truth"), "chainLength": c["chainLength"], "composition": c["composition"],
            "notation": c["notation"], "difficulty": c["difficulty"], "complexity": c["complexity"], "minimalPair": c["minimalPair"],
            "input": {"statement": c["statement"], "working": c["working"], "assumptions": c["assumptions"], "e7": I[cid]["channels"].get(ch)},
            "expected": c["expected"], "acceptable": c["acceptable"], "channel": ch, "e7Raw": raw, "e7Verdict": got, "outcome": oc,
            "abstainedSafely": oc == "safe-abstention" or (oc == "correct" and got in ("abstain", "unrepresentable")),
            "incorrectlyAccepted": oc in ("false-acceptance",), "overclaim": oc == "overclaim", "incorrectlyRejected": oc == "false-rejection",
            "failureClass": fc, "secondaryClasses": sec, "ms": (rec or {}).get("ms"), "parsed": (rec or {}).get("parse"),
            "diagnostic": {k: (rec or {}).get(k) for k in ("detail", "rule", "steps", "restrictions", "outstanding", "transitions") if (rec or {}).get(k) is not None},
            "studentFacing": None if af is None else {"status": af.get("raw"), "credit": af.get("credit")},
            "oracleStatus": c.get("oracleCertification", {}).get("status"),
        })
    json.dump(rows, open(out_p, "w"), indent=1, ensure_ascii=False)
    json.dump(summarise(rows), open(summ_p, "w"), indent=1)
    s = summarise(rows)
    print(json.dumps(s["overall"], indent=None))


def block(rs):
    n = len(rs)
    oc = collections.Counter(r["outcome"] for r in rs)
    ev = [r for r in rs if r["outcome"] != "adapter-defect"]
    shouldReject = [r for r in ev if r["expected"] not in ("verified", "equivalent", "implied") and not (r["relation"] == "unsupported" and r["truth"] == "valid")]
    shouldAccept = [r for r in ev if r["expected"] in ("verified", "equivalent", "implied")]
    fa = sum(r["outcome"] in ("false-acceptance",) for r in shouldReject)
    fr = sum(r["outcome"] == "false-rejection" for r in shouldAccept)
    ab = sum(r["outcome"] == "safe-abstention" for r in ev)
    cor = oc["correct"]
    return {"n": n, "evaluated": len(ev), "outcomes": dict(oc),
            "correctRate": round(cor / len(ev), 4) if ev else None, "correctCI95": wilson(cor, len(ev)),
            "falseAcceptance": fa, "falseAcceptanceDenominator": len(shouldReject), "falseAcceptanceRate": round(fa / len(shouldReject), 4) if shouldReject else None, "falseAcceptanceCI95": wilson(fa, len(shouldReject)),
            "overclaim": oc["overclaim"],
            "falseRejection": fr, "falseRejectionDenominator": len(shouldAccept), "falseRejectionRate": round(fr / len(shouldAccept), 4) if shouldAccept else None,
            "safeAbstention": ab, "safeAbstentionRate": round(ab / len(ev), 4) if ev else None,
            "decided": sum(r["e7Verdict"] not in ("abstain", "unrepresentable") for r in ev),
            "decisiveCorrectAmongDecided": round(sum(r["outcome"] == "correct" for r in ev if r["e7Verdict"] not in ("abstain", "unrepresentable")) / max(1, sum(r["e7Verdict"] not in ("abstain", "unrepresentable") for r in ev)), 4)}


def summarise(rows):
    out = {"overall": block(rows)}
    for key in ("category", "kind", "relation", "difficulty", "notation", "composition", "channel", "domain"):
        out["by_" + key] = {str(k): block([r for r in rows if r[key] == k]) for k in sorted({r[key] for r in rows}, key=str)}
    buckets = lambda L: "1" if L == 1 else "2" if L == 2 else "3-4" if L <= 4 else "5-6" if L <= 6 else "7+"
    out["by_chainLength"] = {b: block([r for r in rows if buckets(r["chainLength"]) == b]) for b in ("1", "2", "3-4", "5-6", "7+") if any(buckets(r["chainLength"]) == b for r in rows)}
    out["by_invariant"] = {k: block([r for r in rows if r["invariant"] == k]) for k in sorted({r["invariant"] for r in rows})}
    fails = [r for r in rows if r["outcome"] not in ("correct",)]
    out["failureClasses"] = dict(collections.Counter(r["failureClass"] for r in fails))
    out["failureClassesByOutcome"] = {o: dict(collections.Counter(r["failureClass"] for r in fails if r["outcome"] == o)) for o in sorted({r["outcome"] for r in fails})}
    nat = [r for r in rows if r["channel"] in ("unified-natural", "answer-first-transition")]
    out["parserFailureRate"] = {"numerator": sum(r["failureClass"] == "A" for r in nat), "denominator": len(nat), "rate": round(sum(r["failureClass"] == "A" for r in nat) / max(1, len(nat)), 4)}
    dom = [r for r in rows if r["relation"] in ("domain-violation", "insufficient-information") or re.search(r"domain|restriction|excluded|assumption", r["invariant"], re.I)]
    out["domainSemantics"] = {"cases": len(dom), "failures": sum(r["outcome"] not in ("correct", "safe-abstention", "adapter-defect") for r in dom),
                              "failureRate": round(sum(r["outcome"] not in ("correct", "safe-abstention", "adapter-defect") for r in dom) / max(1, len(dom)), 4),
                              "falseAcceptances": sum(r["outcome"] in ("false-acceptance", "overclaim") for r in dom)}
    comp = [r for r in rows if r["composition"]]
    out["composition"] = {"cases": len(comp), "failureRate": round(sum(r["outcome"] != "correct" for r in comp) / max(1, len(comp)), 4),
                          "decisiveFailureRate": round(sum(r["outcome"] in ("false-acceptance", "overclaim", "false-rejection", "misgrade") for r in comp) / max(1, len(comp)), 4)}
    ms = [r["ms"] for r in rows if r["ms"] is not None]
    out["latencyMs"] = {"p50": pct(ms, .5), "p95": pct(ms, .95), "p99": pct(ms, .99), "max": max(ms) if ms else None, "n": len(ms)}
    sf = [r for r in rows if r["studentFacing"]]
    out["studentFacingAnswerFirst"] = {"cases": len(sf), "status": dict(collections.Counter(r["studentFacing"]["status"] for r in sf)),
                                      "creditTrueOnInvalidOrIncomplete": [r["id"] for r in sf if r["studentFacing"]["credit"] is True and r["relation"] in ("invalid",)],
                                      "creditFalseOnValid": [r["id"] for r in sf if r["studentFacing"]["credit"] is False and r["relation"].startswith("valid")]}
    return out


if __name__ == "__main__":
    main(*sys.argv[1:])
