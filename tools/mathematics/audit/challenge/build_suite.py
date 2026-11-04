#!/usr/bin/env python3
"""Authoring list + builder for suite.json.  Every expected value comes from reference.py.

Each authored row: (category, intent, text[, override_reason]).  intent is S/U/A (what the
author meant).  The label written to suite.json is what reference.scope() computes from the
documented boundary; any disagreement with the intent is printed (and must be explained by
override_reason, which marks the label as a manual override)."""
import json
import os
import sys
from collections import Counter

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import reference as ref  # noqa: E402

S, U, A = "S", "U", "A"
ROWS = [
    # ---- syntax_equiv: unfamiliar syntax / algebraically equivalent forms
    ("syntax_equiv", S, "3/(x-2)+1=5/(x-2)"),
    ("syntax_equiv", S, "-(-(3/(x-2)))-(-1)=5/(x-2)"),
    ("syntax_equiv", S, "x*(1/x)=1"),
    ("syntax_equiv", S, "3/4*x/(x-1)=1/2"),
    ("syntax_equiv", S, "2-(1-(1/(x+1)))=3/2"),
    ("syntax_equiv", S, "2^2/(x-1)=2^-1"),
    ("syntax_equiv", U, "3/4x/(x-1)=1/2"),
    ("syntax_equiv", A, "2*(1/(x-1)+1)=4"),
    # ---- rule_order: different rule orders needed
    ("rule_order", S, "1/(x-1)+1/(x+1)=2/((x-1)*(x+1))"),
    ("rule_order", S, "1/(x-2)+3=(x+1)/(x-2)"),
    ("rule_order", S, "1/(x-1)-1/(x-2)=-1/((x-1)*(x-2))"),
    ("rule_order", S, "(x-1)/(x+2)*(x+2)/(x-1)=1"),
    ("rule_order", S, "2/(x+4)+3/(x-1)=(5*x+10)/((x+4)*(x-1))"),
    ("rule_order", S, "1/(2*x-4)+1/(x-2)=3/2"),
    ("rule_order", U, "(x+1)/(x-1)+(x-1)/(x+1)=3"),
    ("rule_order", A, "(x+1)/(x-1)*(x-1)/(x+1)*(x+2)/(x+2)=1"),
    # ---- greedy_trap: early cancellation loses or gains solutions
    ("greedy_trap", S, "(x^2-9)/(x-3)=6"),
    ("greedy_trap", S, "(x^2-9)/(x-3)=x+3"),
    ("greedy_trap", S, "x*(x-2)/x=0"),
    ("greedy_trap", S, "(x-1)^2/(x-1)=0"),
    ("greedy_trap", S, "(x+2)/(x+2)+1/x=1/x+1"),
    ("greedy_trap", S, "(x^2-5*x+6)/(x-2)=(x^2-5*x+6)/(x-3)"),
    ("greedy_trap", U, "(x^2-9)/(x-3)=x*(x+3)"),
    ("greedy_trap", A, "(x^2-9)*(x+1)/(x-3)=(x+3)*(x+1)"),
    # ---- expansion: factors visible only after expansion / complexity-increasing steps
    ("expansion", S, "(x+1)^2/(x-1)=(x^2+2*x+1)/(x-1)"),
    ("expansion", S, "(x+1)*(x+2)/(x-1)=(x^2+3*x+2)/(x-1)"),
    ("expansion", S, "(2*x+2)/(x^2-1)=2/(x-1)"),
    ("expansion", S, "1/(x-1)^2-1/(x-1)=(2-x)/(x-1)^2"),
    ("expansion", S, "3/(x^2-x)=3/x-3/(x-1)+3/(x*(x-1))"),
    ("expansion", S, "1/(x*(x-1))=1/(x-1)-1/x"),
    ("expansion", U, "(x+1)^3/(x-1)=0"),
    ("expansion", A, "(x+1)^3/(x+1)^2=x+1"),
    # ---- restricted_identity_empty
    ("restricted_identity_empty", S, "1/x+1/x=2/x"),
    ("restricted_identity_empty", S, "1/x=0"),
    ("restricted_identity_empty", S, "(x-1)/(x-1)=2"),
    ("restricted_identity_empty", S, "(3*x+6)/(x+2)=3"),
    ("restricted_identity_empty", S, "(3*x+6)/(x+2)=4"),
    ("restricted_identity_empty", S, "x/(x-1)+1/(1-x)=1"),
    ("restricted_identity_empty", U, "1/(x^2+1)=1/(x^2+1)"),
    ("restricted_identity_empty", A, "x/x=x^0"),
    # ---- repeated_multi_excl
    ("repeated_multi_excl", S, "1/(x-1)^2=1/(x-1)"),
    ("repeated_multi_excl", S, "x/(x-1)^2+1/(x-1)=2/(x-1)^2"),
    ("repeated_multi_excl", S, "(x-1)/(x-1)^3=0"),
    ("repeated_multi_excl", S, "1/(x-1)-1/(x-2)+1/(x-2)-1/(x-3)+1/(x-3)-1/(x-4)=1/(x-1)-1/(x-4)"),
    ("repeated_multi_excl", S, "x/((x-1)*(x-2)*(x-3))=0"),
    ("repeated_multi_excl", S, "x^2/(x*(x-1))=1"),
    ("repeated_multi_excl", U, "1/(x-1)^2=4"),
    ("repeated_multi_excl", U, "1/(x-1)+1/(x-2)+1/(x-3)=0"),
    ("repeated_multi_excl", A, "(x-1)^2*(x+1)/((x-1)^2*(x+1))=1"),
    # ---- removable singularities
    ("removable", S, "(x^2-1)/(x-1)=2"),
    ("removable", S, "(x^2-1)/(x-1)=0"),
    ("removable", S, "(2*x^2-2)/(x^2-1)=2"),
    ("removable", S, "(x^2-x-6)/(x-3)=x+2"),
    ("removable", S, "(x^2-x)/(x-1)=3"),
    ("removable", S, "(x^2-x)/(x-1)=0"),
    ("removable", U, "(x^3-x)/(x-1)=0"),
    ("removable", A, "(x^3-x)/(x-1)=x^2+x"),
    # ---- candidate_excluded
    ("candidate_excluded", S, "x/(x-1)=1/(x-1)"),
    ("candidate_excluded", S, "5/(x-1)=(x+4)/(x-1)"),
    ("candidate_excluded", S, "1/(x+1)+1/(x-1)=2/(x^2-1)"),
    ("candidate_excluded", S, "1/x+1/(x-1)=1/(x*(x-1))"),
    ("candidate_excluded", S, "(x^2-3*x)/(x-3)=3"),
    ("candidate_excluded", S, "x^2/(x-1)=1/(x-1)"),
    ("candidate_excluded", U, "x^2/(x-1)=x^2/(x-2)"),
    ("candidate_excluded", A, "(x^2-x)*x/(x*(x-1))=x"),
    # ---- lookalike_factors
    ("lookalike_factors", S, "(x-2)/(2-x)=-1"),
    ("lookalike_factors", S, "(2*x-4)/(x-2)=2"),
    ("lookalike_factors", S, "(x-4)/(x-2)=0"),
    ("lookalike_factors", S, "(x+1)/(x-1)=(x-1)/(x+1)"),
    ("lookalike_factors", S, "(x+1)/(x-1)=-1"),
    ("lookalike_factors", S, "(3-x)/(x-3)=x"),
    ("lookalike_factors", U, "(x-1)^2/(x+1)=(x+1)^2/(x-1)"),
    ("lookalike_factors", A, "(x^2-1)/(x+1)*(x+1)/(x-1)=1"),
    # ---- near_boundary
    ("near_boundary", S, "1/((x-1)*(x-2)*(x-3))=0"),
    ("near_boundary", S, "1/(x-1)^3=0"),
    ("near_boundary", S, "1/(x^3-x)=0"),
    ("near_boundary", U, "1/((x-1)*(x-2)*(x-3)*(x-4))=1"),
    ("near_boundary", U, "1/(x-1)^4=0"),
    ("near_boundary", U, "1/(x^3-2)=0"),
    ("near_boundary", U, "(x^2-5*x+6)/(x-1)=0"),
    ("near_boundary", S, "(x^2-1)/(x-1)+(x^2-4)/(x-2)=7"),
    ("near_boundary", U, "(x^2-1)/(x-1)=x*(x+1)"),
    ("near_boundary", S, "x/(x-1)=x/(x+1)"),
    ("near_boundary", A, "x/(x*(x-1)*(x-2)*(x-3))=0"),
    ("near_boundary", A, "1/((x-1)*(x-2))*1/((x-3)*(x-4))=0",
     "product of two fractions: each denominator has 2 factors, the combined term has 4"),
    # ---- irrational / non-splitting (unsupported)
    ("irrational", U, "1/(x^2-2)=1"),
    ("irrational", U, "3/(x^2-3)=0"),
    ("irrational", U, "x/(x^2-x-1)=1"),
    ("irrational", U, "1/(x^2-2)+1/(x^2-2)=2/(x^2-2)"),
    ("irrational", U, "1/(2*x^2-1)=1"),
    ("irrational", U, "(x+1)/(x^2-2*x-1)=0"),
    ("irrational", A, "(x^2-2)/(x-1)=x+1-1/(x-1)"),
    ("irrational", U, "x/(x^2+x+1)=1/3"),
    # ---- outside_boundary (clear numerator/denominator/degree cases)
    ("outside_boundary", U, "(x^3-1)/(x-1)=3"),
    ("outside_boundary", U, "x^4/(x-1)=0"),
    ("outside_boundary", U, "(x^2+1)/(x+1)=(x^2+1)/(x-1)"),
    ("outside_boundary", U, "x/(x^4-1)=0"),
    ("outside_boundary", U, "1/(x^3-x^2+x-1)=0"),
    ("outside_boundary", U, "1/(x-x)=1"),
    ("outside_boundary", U, "x^(1/2)/(x-1)=1"),
    ("outside_boundary", U, "(x^2+x+1)/(x+1)=1"),
    # ---- no_var_denominator
    ("no_var_denominator", U, "x/2+1=3"),
    ("no_var_denominator", U, "1/2*x=5/3"),
    ("no_var_denominator", U, "3*x/4-x/2=1"),
    ("no_var_denominator", U, "x=7"),
    ("no_var_denominator", U, "1/2+1/3=5/6"),
    ("no_var_denominator", U, "x/0=1"),
    ("no_var_denominator", U, "2*x/(1+1)=x"),
    ("no_var_denominator", U, "(x+1)/3=2"),
    # ---- parser_stress
    ("parser_stress", S, "   3 / ( x - 2 )   +  1 = 5/(x-2)"),
    ("parser_stress", S, "x^1/(x-1)=2"),
    ("parser_stress", S, "0*x/(x-1)=0"),
    ("parser_stress", S, "999999*x/(x-1)=999999"),
    ("parser_stress", S, "1/1000*x/(x-1)=1/1000"),
    ("parser_stress", S, "0.001/(x-1)=0.002/(x+1)"),
    ("parser_stress", S, "12/3/(x-1)=4/(x-1)"),
    ("parser_stress", S, "1/(x-1)=2^3^2/512"),
    ("parser_stress", S, "-x^2/x^2=-1"),
    ("parser_stress", U, "2x/(x-1)=1"),
    ("parser_stress", U, "2(x-1)/(x-1)=2"),
    ("parser_stress", U, "x/(x-1)=.5"),
    ("parser_stress", U, "1/(x-1)=1e0"),
    ("parser_stress", U, "+1/(x-1)=2"),
    ("parser_stress", U, "1/(x-1)=y"),
    ("parser_stress", A, "x^0/(x-1)=1"),
    ("parser_stress", A, "1000000/(x-1)=1000000"),
    ("parser_stress", A, "1/(x-1)=2=3", "multiple '=' signs: the documented grammar does not say how the equation splits"),
    ("parser_stress", A, "1 0/(x-1)=10/(x-1)"),
    ("parser_stress", A, "x/(x-1000000)=2"),
    # ---- const_times_x denominators
    ("const_times_x", S, "1/(3*x)=1/6"),
    ("const_times_x", S, "5/(2*x)+1=3/(2*x)"),
    ("const_times_x", S, "1/(x/2)=4"),
    ("const_times_x", S, "1/(0.25*x)=8"),
    ("const_times_x", S, "(1/2)/(3/4*x)=2/3"),
    ("const_times_x", S, "x/(5*x)=1/5"),
    ("const_times_x", S, "4/(2*x)=2/x+1"),
    ("const_times_x", U, "4/(3*x^2)=1/3"),
    # ---- ambiguous_shape
    ("ambiguous_shape", A, "(x^2-1)*(x+2)/(x-1)=x^2+3*x+1"),
    ("ambiguous_shape", A, "1/(x^2-1)=1/2*(1/(x-1)-1/(x+1))"),
    ("ambiguous_shape", A, "2*(1/(x-1)+1/(x+1))=4*x/(x^2-1)"),
    ("ambiguous_shape", A, "(1/x+1)/(1/x)=x+1"),
    ("ambiguous_shape", A, "1/(1/x)=3"),
    ("ambiguous_shape", A, "1/(x-1/x)=1/(x-1/x)"),
    ("ambiguous_shape", A, "x^-1=2"),
    ("ambiguous_shape", A, "(x^2+1)/(x-1)=x+1+2/(x-1)"),
]

PREFIX = {}


def fmt_list(v):
    return None if v is None else list(v)


def build():
    out, mism, seen = [], [], set()
    counters = Counter()
    for row in ROWS:
        cat, intent, text = row[:3]
        override = row[3] if len(row) > 3 else None
        key = text
        assert key not in seen, "duplicate " + text
        seen.add(key)
        d = ref.describe(text)
        label = {"supported": "supported", "unsupported": "unsupported", "ambiguous": "ambiguous"}[d["label"]]
        want = {"S": "supported", "U": "unsupported", "A": "ambiguous"}[intent]
        if label != want:
            if override:
                label = want
            else:
                mism.append((text, want, d["label"], d["reasons"], d["notes"]))
        counters[cat] += 1
        rid = "%s-%02d" % (cat[:3].upper() + cat[3:5].upper() if False else cat, counters[cat])
        e = {"id": rid, "category": cat, "text": text, "label": label}
        truth = {"status": d["status"]}
        if d["status"] == "ok":
            truth.update({"class": d["cls"], "solution": d["solution"], "excluded": d["excluded"],
                          "irrational_excluded_values": d["irrational_excluded"]})
        else:
            truth["error"] = d.get("error")
            truth.update({"class": "out-of-scope", "solution": None, "excluded": None})
        if label == "unsupported" or d["status"] != "ok":
            e["class"], e["solution"], e["excluded"] = "out-of-scope", None, None
        elif label == "ambiguous" and d["cls"] == "degree>=2":
            e["class"], e["solution"], e["excluded"] = "out-of-scope", None, None
        else:
            e["class"], e["solution"], e["excluded"] = d["cls"], d["solution"], d["excluded"]
        e["reasons"] = d["reasons"] if label != "supported" else []
        if override:
            e["reasons"] = [override]
            e["override"] = True
        e["truth"] = truth
        why = {
            "supported": "Inside the documented boundary; expected values derived by exact reduction.",
            "unsupported": "Outside the documented boundary (%s); expected behaviour is a refusal with one of these reason codes." % ", ".join(e["reasons"]),
            "ambiguous": "Documented boundary does not clearly decide (%s). If the engine accepts, class/solution/excluded below are the exact truth; a refusal is also defensible." % ("; ".join(e["reasons"] + d["notes"]) or "see notes"),
        }[label]
        if d["status"] == "ok" and label != "supported":
            why += " Exact truth: class=%s, rational solutions=%s, excluded=%s%s." % (
                d["cls"], d["solution"], d["excluded"],
                (", plus %d irrational excluded value(s)" % d["irrational_excluded"]) if d["irrational_excluded"] else "")
        e["why"] = why
        e["intent_note"] = d["notes"]
        out.append(e)
    return out, mism


def main():
    suite, mism = build()
    here = os.path.dirname(os.path.abspath(__file__))
    with open(os.path.join(here, "suite.json"), "w") as f:
        json.dump(suite, f, indent=1)
    print("entries:", len(suite))
    print("labels:", dict(Counter(e["label"] for e in suite)))
    print("categories:", dict(Counter(e["category"] for e in suite)))
    print("by label x category:")
    for c in sorted({e["category"] for e in suite}):
        print("  %-26s %s" % (c, dict(Counter(e["label"] for e in suite if e["category"] == c))))
    print("classes:", dict(Counter(e["class"] for e in suite)))
    print("INTENT MISMATCHES (author intent vs boundary computation):", len(mism))
    for m in mism:
        print("  ", m)
    # self-check: brute force
    bad = 0
    for e in suite:
        d = ref.describe(e["text"])
        if d["status"] == "ok" and d["brute_errors"]:
            bad += 1
            print("BRUTE FAIL", e["id"], e["text"], d["brute_errors"][:3])
    print("brute-force (direct Fraction evaluation on %d grid points) failures: %d" % (len(ref.GRID), bad))
    # sympy
    sp = ref.sympy_check("x/(x-1)=1")
    if sp is None:
        print("sympy: not installed, cross-check skipped")
    else:
        dis = 0
        for e in suite:
            s = ref.solve(e["text"])
            if s["status"] != "ok":
                continue
            c = ref.sympy_check(e["text"])
            mine = {"cls": s["cls"], "solution": s["solution"], "excluded": s["excluded"]}
            if c is None or "error" in c or (c["cls"], c["solution"], c["excluded"]) != (mine["cls"], mine["solution"], mine["excluded"]):
                dis += 1
                print("SYMPY DISAGREE", e["id"], e["text"], "ref:", {k: str(v) for k, v in mine.items()}, "sympy:", c)
        print("sympy disagreements:", dis)


if __name__ == "__main__":
    main()
