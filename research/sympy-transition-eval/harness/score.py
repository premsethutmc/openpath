"""Scoring for A (E7), B (SymPy prototype) and proposed combinations, kept per category."""
import collections, statistics

UNDECIDED = {"unsupported", "malformed", "ambiguous", "resource-exhausted", "error", "unresolved"}
DECISIVE = {"verified", "invalid", "incomplete", "missing-assumption"}


def combine(row, mode):
    a, b = row["A"], row["B"]
    if a == "invalid" and b == "verified":
        return "conflict"  # E7 asserts falsehood, SymPy proves the work correct: route to review, never auto-credit
    if a in UNDECIDED:
        if mode == "C1":
            return b if (b in DECISIVE or b == "ambiguous") else a
        if mode == "C2":
            return "verified" if b == "verified" else a
    return a


def pct(xs, p):
    if not xs:
        return None
    xs = sorted(xs)
    return round(xs[min(len(xs) - 1, int(len(xs) * p))], 2)


def metrics(rows, key):
    n = len(rows)
    got = [r[key] for r in rows]
    exact = sum(g == r["exp"] for g, r in zip(got, rows))
    fa = [r["id"] for g, r in zip(got, rows) if g == "verified" and r["exp"] != "verified"]
    fr = [r["id"] for g, r in zip(got, rows) if r["exp"] == "verified" and g != "verified"]
    false_invalid = [r["id"] for g, r in zip(got, rows) if g == "invalid" and r["exp"] == "verified"]
    cnt = collections.Counter(got)
    return {"n": n, "exact": exact, "falseAcceptances": len(fa), "faIds": fa, "falseRejections": len(fr),
            "falseInvalidOnVerified": len(false_invalid), "falseInvalidIds": false_invalid,
            "verified": cnt["verified"], "undecided": sum(cnt[k] for k in UNDECIDED), "conflict": cnt["conflict"], "dist": dict(cnt)}


def score_all(rows):
    for r in rows:
        r["C1"] = combine(r, "C1")
        r["C2"] = combine(r, "C2")
        fb = r["A"] in UNDECIDED or (r["A"] == "invalid")
        r["C_ms"] = round(r["A_ms"] + (r["B_ms"] if fb else 0), 2)
    out = {}
    for key in ("A", "B", "C1", "C2"):
        m = metrics(rows, key)
        aexact = {r["id"] for r in rows if r["A"] == r["exp"]}
        afr = {r["id"] for r in rows if r["exp"] == "verified" and r["A"] != "verified"}
        m["recoveredFromA_FR"] = sorted(r["id"] for r in rows if r["id"] in afr and r[key] == "verified")
        m["recovered"] = len(m["recoveredFromA_FR"])
        m["preservedAExact"] = sum(1 for r in rows if r["id"] in aexact and r[key] == r["exp"])
        m["lostAExact"] = sorted(r["id"] for r in rows if r["id"] in aexact and r[key] != r["exp"])
        m["newFA"] = sorted(set(m["faIds"]) - {r["id"] for r in rows if r["A"] == "verified" and r["exp"] != "verified"})
        out[key] = {k: v for k, v in m.items()}
    cats = sorted({r["cat"] for r in rows})
    out["byCategory"] = {}
    for c in cats:
        rs = [r for r in rows if r["cat"] == c]
        out["byCategory"][c] = {k: {kk: vv for kk, vv in metrics(rs, k).items() if kk in ("n", "exact", "falseAcceptances", "falseRejections", "falseInvalidOnVerified", "verified", "undecided", "conflict")} for k in ("A", "B", "C1", "C2")}
        afr = {r["id"] for r in rs if r["exp"] == "verified" and r["A"] != "verified"}
        for k in ("B", "C1", "C2"):
            out["byCategory"][c][k]["recovered"] = sum(1 for r in rs if r["id"] in afr and r[k] == "verified")
    bms = [r["B_ms"] for r in rows]
    ams = [r["A_ms"] for r in rows]
    cms = [r["C_ms"] for r in rows]
    out["latencyMs"] = {"A": {"p50": pct(ams, .5), "p95": pct(ams, .95), "p99": pct(ams, .99), "max": max(ams)},
                        "B": {"p50": pct(bms, .5), "p95": pct(bms, .95), "p99": pct(bms, .99), "max": max(bms)},
                        "C": {"p50": pct(cms, .5), "p95": pct(cms, .95), "p99": pct(cms, .99), "max": max(cms)}}
    out["timeouts"] = sum(r["timeout"] for r in rows)
    out["crashes"] = sum(r["crash"] for r in rows)
    out["B_reasonsOnUndecided"] = collections.Counter(r["B_reason"].split(":")[0][:60] for r in rows if r["B"] in UNDECIDED).most_common(25)
    return out
