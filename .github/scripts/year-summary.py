"""Summarise the My Learning Year browser suites into one small JSON file (and the job summary).

usage: year-summary.py RESULTS_TSV LOG_DIR OUT_JSON
RESULTS_TSV rows: suite<TAB>pass|fail<TAB>seconds; each suite's log is LOG_DIR/<suite>.log (node --test output).
"""
import json, os, re, sys

tsv, log_dir, out = sys.argv[1:4]
suites = []
for row in open(tsv, encoding="utf-8"):
    name, status, secs = row.rstrip("\n").split("\t")
    try:
        log = open(os.path.join(log_dir, f"{name}.log"), encoding="utf-8", errors="replace").read()
    except OSError:
        log = ""
    counts = {k: sum(int(n) for n in re.findall(rf"^ℹ {k} (\d+)$", log, re.M)) for k in ("tests", "pass", "fail", "skipped")}
    failed = list(dict.fromkeys(m.strip() for m in re.findall(r"^✖ (.+?)(?: \(\d[\d.]*ms\))?$", log, re.M) if m.strip() != "failing tests:"))
    suites.append({"suite": name, "status": status, "seconds": int(secs), **counts, "failed_tests": failed[:20]})

summary = {
    "commit": os.environ.get("GITHUB_SHA", "")[:7],
    "run": os.environ.get("GITHUB_RUN_ID", ""),
    "status": "fail" if any(s["status"] == "fail" for s in suites) else "pass",
    "suites": suites,
}
os.makedirs(os.path.dirname(out), exist_ok=True)
json.dump(summary, open(out, "w", encoding="utf-8"), ensure_ascii=False, indent=1)

md = [f"### Browser suites: {summary['status']}", "", "| Suite | Result | Tests | Fail | Time |", "|---|---|---|---|---|"]
for s in suites:
    md.append(f"| {s['suite']} | {s['status']} | {s['tests'] or '–'} | {s['fail'] or 0} | {s['seconds']}s |")
for s in suites:
    for t in s["failed_tests"]:
        md.append(f"- **{s['suite']}** ✖ {t}")
if os.environ.get("GITHUB_STEP_SUMMARY"):
    open(os.environ["GITHUB_STEP_SUMMARY"], "a", encoding="utf-8").write("\n".join(md) + "\n")
print("\n".join(md))
