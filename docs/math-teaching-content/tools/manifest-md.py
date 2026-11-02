"""Renders 08-INTEGRATION-MANIFEST.md from integration-manifest.json and review-status.json (independent-review outcome per package).
   python3 tools/manifest-md.py docs/math-teaching-content"""
import json, sys
root = sys.argv[1]
m = json.load(open(f"{root}/integration-manifest.json"))
rs = json.load(open(f"{root}/review-status.json"))
ORDER = ["batch-1", "batch-2"]
CAT = {
    "ready": "Ready for integration review",
    "runtime": "Blocked by shared runtime support",
    "content": "Blocked by missing questions or visuals",
    "review": "Unresolved mathematical or instructional review",
}

def categories(o):
    c = set()
    if any(x.startswith(("B1", "B2", "B3", "policy")) for x in o["contract"]): c.add("runtime")
    if o["missingQuestions"] or o["visuals"]["missing"] or o["itemIssues"]: c.add("content")
    if rs["packages"].get(o["id"], {}).get("outstanding"): c.add("review")
    return c or {"ready"}

L = ["# 8. Integration manifest and readiness (18 packages)", "",
     f"Source commit for every id, partition and check: `{m['sourceCommit']}` (foundation, draft PR #96). Regenerate with `tools/build.mts`, then `tools/manifest.mts`, then `tools/manifest-md.py`. The machine-readable form is `integration-manifest.json`.", "",
     "Categories are **integration readiness only. They are not educator approval**: every package is still a review candidate. A package can be in more than one category; its primary category is the first that applies, in the order review → content → runtime → ready.", "",
     "Shared runtime requirements (Codex):",
     "- **B1** teaching scope (`teachingScopeFor` accepts only the module's main family).",
     "- **B2** diagnosis reader (`probeReading` cannot read decimal, money or tuple predictions).",
     "- **B3** addressed misconception read from verbatim family text.",
     "- **P1** diagnosis policy: misconception-evidence@1 establishes a misconception from any two matches, while these packages need a contrast or written-form condition. **This is not one of the three blockers Codex is handling; it is flagged here as an unresolved contract requirement.**", "",
     "## Summary", "", "| Package | Primary | All categories | Runtime | Missing questions / visuals | Review |", "|---|---|---|---|---|---|"]
rows = []
for o in sorted(m["packages"], key=lambda o: (ORDER.index(o["batch"]), o["id"])):
    c = categories(o)
    primary = next(k for k in ["review", "content", "runtime", "ready"] if k in c)
    rt = sorted({x.split(" ")[0] for x in o["contract"] if x.startswith(("B1", "B2", "B3"))} | ({"P1"} if any(x.startswith("policy") for x in o["contract"]) else set()))
    mq = len(o["missingQuestions"]) + len(o["visuals"]["missing"]) + len(o["itemIssues"])
    rv = rs["packages"].get(o["id"], {}).get("outstanding") or []
    rows.append((primary, o))
    L.append(f"| [{o['id']}]({o['batch']}/{o['id']}.md) | **{CAT[primary]}** | {'; '.join(CAT[k] for k in ['review','content','runtime','ready'] if k in c)} | {', '.join(rt) or '—'} | {mq or '—'} | {'; '.join(rv) or '—'} |")
L += ["", "## Per package", ""]
for primary, o in rows:
    s = o["scope"]
    L += [f"### {o['id']} — {o['title']}", "",
          f"- **Scope:** `{s['competency']}`, family `{s['family']}` ({s['familyTitle']}). Parameters: {s['parameters']} The served module is {s['module']['origin']}, its main family is `{s['module']['mainFamily']}`, and the family is in its pools: {'yes' if s['module']['familyInPools'] else 'NO'}.",
          f"- **Misconception ids targeted:** {', '.join(f'`{t['id']}` ({t['kind']}; {'diagnosable' if t['diagnosable'] else 'NOT diagnosable: ' + t['reading']}) → `{t['specificStrategy']}`' for t in o['misconceptions']['targets']) or '—'}. **Reused:** {', '.join(f'`{r['strategy']}` ({r['covers']})' for r in o['misconceptions']['reusedExisting']) or '—'}. **Modelled but not targeted** (general teaching only): {', '.join(f'`{x}`' for x in o['misconceptions']['modelledButNotTargeted']) or '—'}.",
          f"- **Diagnostic contrast:** {'; '.join(f'{c['case']} `{c['id']}` ({c['partition']})' for c in o['contrast']['cases'])}. Rule: {o['contrast']['rule']}" + (f" Trigger conditions: {'; '.join(f'`{t['strategy']}`: {t['condition']}' for t in o['contrast']['triggerConditions'])}." if o['contrast']['triggerConditions'] else ""),
          f"- **Answer formats:** family type `{o['answerFormats']['familyType']}`; forms used: {', '.join(o['answerFormats']['forms'])}; multiple choice {'available' if o['answerFormats']['mcAvailable'] else 'not available'}; everyday form {'available' if o['answerFormats']['wordAvailable'] else 'NOT available'}. Trusted grader: supported. Diagnosis reader: {'supported' if o['answerFormats']['diagnosisReaderSupported'] else '**not supported (B2)**'}.",
          f"- **Evidence:** answer evidence comes from {o['evidence']['answer']}. Method evidence: {o['evidence']['method']}.",
          f"- **Visuals:** used {', '.join(f'`{v}`' for v in o['visuals']['used']) or 'none'}; missing: {'; '.join(o['visuals']['missing']) or 'none'}.",
          f"- **New strategies:** {', '.join(f'`{x}`' for x in o['newStrategies'])}.", "",
          "| Role | Question | Partition | Form | Reconciliation |", "|---|---|---|---|---|"]
    L += [f"| {i['role']} | `{i['id']}` | {i['partition']} | {i['form']} | {'; '.join(i['issues']) or 'served, fresh, unexposed'} |" for i in o["items"]]
    L += ["", "**Missing questions:** " + ("; ".join(o["missingQuestions"]) or "none") + ".", "", "**Unresolved contract requirements (Codex):**", ""] + [f"- {x}" for x in o["contract"]] + [""]
    rv = rs["packages"].get(o["id"], {})
    L += [f"**Independent review:** {rv.get('summary', 'not recorded')}", ""]
open(f"{root}/08-INTEGRATION-MANIFEST.md", "w").write("\n".join(L) + "\n")
print("\n".join(f"{o['id']}: {CAT[p]}" for p, o in rows))
