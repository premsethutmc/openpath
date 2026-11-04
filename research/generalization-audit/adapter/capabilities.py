"""Capability matrix: group each case's tested invariant into a capability family and summarise E7 per family.
Usage: python3 adapter/capabilities.py MATH_GENERALIZATION_RESULTS.json results/capability.json"""
import json, sys, collections, re
from score import wilson
FAMILIES = [
    ("Cited reasons / rule citation", r"cited"),
    ("Notation, ambiguity, malformed input", r"notation|malformed|ambigu|decimal|continuation|precedence|angle-unit|two letters"),
    ("Convergence and proof-style arguments", r"convergen|epsilon|quantifier|monotone convergence|FTC"),
    ("Multivariable (identities, systems, partials, parameters)", r"multivariable|partial derivative|linear system|homogeneity|two variables|parameter"),
    ("Limits", r"limit|indeterminate|one-sided"),
    ("Antiderivatives and definite integrals", r"antiderivative|integral|integration"),
    ("Derivatives", r"derivative|differentiab"),
    ("Case analysis and piecewise / absolute value", r"case-scope|piecewise|absolute|abs "),
    ("Assumption-aware equivalence", r"assumption"),
    ("Domain preservation and excluded values", r"natural-domain|natural domain|excluded|restriction|cancellation across zero|domain|pole"),
    ("Extraneous roots and candidate checks", r"extraneous|squaring|widening"),
    ("Inequalities: sign, monotonicity, boundaries", r"sign of multiplier|monotonic|boundary|inequalit|squaring an inequality"),
    ("Logarithm and exponential laws", r"log|exp"),
    ("Trigonometric identities and equations", r"parity|periodic|trig|power-reduction|quadrant|special value|angle"),
    ("Functions: composition and inverses", r"inverse|composition|function"),
    ("Multi-step chains, side claims, completion", r"chain|localisation|intermediate|side claim|completion|final step|restates|over-claiming|gap|every .* line|through an invalid step"),
    ("Solution-set preservation (equations)", r"solution|loss of solutions|connective|set notation|set where"),
    ("Algebraic identities (expand, factor, rational, exponent, radical)", r".*"),
]


def fam(inv):
    for name, pat in FAMILIES:
        if re.search(pat, inv, re.I):
            return name
    return FAMILIES[-1][0]


def main(res, out):
    R = [r for r in json.load(open(res)) if r["outcome"] != "adapter-defect"]
    by = collections.defaultdict(list)
    for r in R:
        by[fam(r["invariant"])].append(r)
    table = {}
    for name, _ in FAMILIES:
        rs = by.get(name, [])
        if not rs:
            continue
        dec = [r for r in rs if r["e7Verdict"] not in ("abstain", "unrepresentable")]  # E7 actually decided (correct abstentions are not capability)
        cor = sum(r["outcome"] == "correct" for r in rs)
        dcor = sum(r["outcome"] == "correct" for r in dec)
        fa_math = [r["id"] for r in rs if r["outcome"] == "false-acceptance" and r["failureClass"] != "G"]
        fa_pol = [r["id"] for r in rs if r["outcome"] == "false-acceptance" and r["failureClass"] == "G"]
        fr = [r["id"] for r in rs if r["outcome"] == "false-rejection"]
        ab = 1 - len(dec) / len(rs)
        dc = dcor / len(dec) if dec else None
        status = ("unsupported" if ab > 0.7 else "supported" if ab <= 0.3 and (dc or 0) >= 0.9 and not fa_math else "partial")
        table[name] = {"correctAbstentions": sum(r["outcome"] == "correct" and r["e7Verdict"] in ("abstain", "unrepresentable") for r in rs), "n": len(rs), "correct": cor, "correctRate": round(cor / len(rs), 3), "correctCI95": wilson(cor, len(rs)),
                       "decided": len(dec), "decisiveCorrect": round(dc, 3) if dc is not None else None, "decisiveCI95": wilson(dcor, len(dec)),
                       "abstentionRate": round(ab, 3), "falseAcceptMath": fa_math, "falseAcceptPolicy": fa_pol, "falseReject": fr,
                       "misgrade": [r["id"] for r in rs if r["outcome"] == "misgrade"], "status": status,
                       "failureClasses": dict(collections.Counter(r["failureClass"] for r in rs if r["outcome"] != "correct"))}
    json.dump(table, open(out, "w"), indent=1)
    for k, v in table.items():
        print(f"{k[:58]:58} n={v['n']:4} corr={v['correctRate']:.2f} abst={v['abstentionRate']:.2f} dec={v['decided']:4} decCorr={v['decisiveCorrect']} FAm={len(v['falseAcceptMath'])} FAp={len(v['falseAcceptPolicy'])} FR={len(v['falseReject'])} MG={len(v['misgrade'])} {v['status']} {v['failureClasses']}")


if __name__ == "__main__":
    main(*sys.argv[1:])
