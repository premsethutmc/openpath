"""Before/after comparison on the frozen benchmark (labels untouched).
Usage (repo root): python3 research/e7-safety/compare.py BASE.json AFTER.json [--md out.md] [--json out.json]
BASE/AFTER are per-case results written by research/generalization-audit/adapter/score.py.
"""
import json, sys, collections

G = {"verified": "accept", "equivalent": "accept", "implied": "one-way", "conditional": "objection", "missing-assumption": "objection",
     "incomplete": "objection", "invalid": "reject", "abstain": "abstain", "unrepresentable": "abstain", "adapter-defect": "abstain"}
COLS = ["accept", "one-way", "objection", "reject", "abstain"]
BAD = {"false-acceptance", "overclaim", "false-rejection", "misgrade"}


def matrix(rows):
    m = collections.Counter((G[r["expected"]], G[r["e7Verdict"]]) for r in rows)
    return {e: {g: m[(e, g)] for g in COLS} for e in COLS}


def md_matrix(m, title):
    out = [f"**{title}** (rows: expected verdict; columns: E7 verdict)", "", "| expected \\ E7 | " + " | ".join(COLS) + " | total |", "|---" * (len(COLS) + 2) + "|"]
    for e in COLS:
        out.append(f"| {e} | " + " | ".join(str(m[e][g]) for g in COLS) + f" | {sum(m[e].values())} |")
    return "\n".join(out)


def main():
    base = {r["id"]: r for r in json.load(open(sys.argv[1]))}
    after = {r["id"]: r for r in json.load(open(sys.argv[2]))}
    ids = sorted(base)
    oc = lambda d: collections.Counter(r["outcome"] for r in d.values())
    changed = [(i, base[i], after[i]) for i in ids if (base[i]["e7Verdict"], base[i]["outcome"]) != (after[i]["e7Verdict"], after[i]["outcome"])]
    resolved = [c for c in changed if c[1]["outcome"] != "correct" and c[2]["outcome"] in ("correct", "safe-abstention") and c[1]["outcome"] in BAD | {"safe-abstention"} and not (c[1]["outcome"] == "safe-abstention" and c[2]["outcome"] == "safe-abstention")]
    regress = [c for c in changed if (c[1]["outcome"] in ("correct", "safe-abstention") and c[2]["outcome"] in BAD) or (c[1]["outcome"] == "correct" and c[2]["outcome"] != "correct") or (c[2]["outcome"] == "false-acceptance" and c[1]["outcome"] != "false-acceptance")]
    trans = collections.Counter((c[1]["outcome"], c[2]["outcome"]) for c in changed)
    summary = {"outcomes_before": oc(base), "outcomes_after": oc(after), "changed": len(changed), "transitions": {f"{a} -> {b}": n for (a, b), n in trans.most_common()},
               "resolved": [{"id": i, "before": b["e7Verdict"], "after": a["e7Verdict"], "expected": a["expected"], "outcome": f'{b["outcome"]} -> {a["outcome"]}'} for i, b, a in resolved],
               "regressions": [{"id": i, "before": b["e7Verdict"], "after": a["e7Verdict"], "expected": a["expected"], "outcome": f'{b["outcome"]} -> {a["outcome"]}', "detail": str((a.get("diagnostic") or {}).get("detail", ""))[:160]} for i, b, a in regress],
               "matrix_before": matrix(base.values()), "matrix_after": matrix(after.values())}
    if "--json" in sys.argv:
        json.dump(summary, open(sys.argv[sys.argv.index("--json") + 1], "w"), indent=1)
    lines = ["| outcome | before | after | change |", "|---|---|---|---|"]
    for k in ["correct", "false-acceptance", "overclaim", "false-rejection", "misgrade", "safe-abstention", "adapter-defect"]:
        b, a = summary["outcomes_before"][k], summary["outcomes_after"][k]
        lines.append(f"| {k} | {b} | {a} | {a - b:+d} |")
    text = "\n".join(lines) + "\n\n" + md_matrix(summary["matrix_before"], "Before") + "\n\n" + md_matrix(summary["matrix_after"], "After") + "\n\n"
    text += f"Changed cases: {len(changed)}\n\n| transition | n |\n|---|---|\n" + "\n".join(f"| {k} | {n} |" for k, n in summary["transitions"].items()) + "\n"
    text += f"\nRegressions: {len(regress)}\n" + "\n".join(f"- {r['id']}: {r['before']} -> {r['after']} (expected {r['expected']}; {r['outcome']}) {r['detail']}" for r in summary["regressions"]) + "\n"
    if "--md" in sys.argv:
        open(sys.argv[sys.argv.index("--md") + 1], "w").write(text)
    print(text)


if __name__ == "__main__":
    main()
