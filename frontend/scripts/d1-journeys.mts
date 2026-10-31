/**
 * Workstream D1: integrated learner journeys (grading with working -> feedback -> A3 teaching -> recheck -> retention), machine-readable.
 *   node --import tsx scripts/d1-journeys.mts <out.json> [<out.md>]
 */
import { writeFileSync } from "node:fs";
import { JOURNEYS, runJourney, traceOf, type JourneyTrace } from "../src/journey/grader-journeys.ts";
import { replayJourney } from "../src/journey/grader-replay.ts";

const out: (JourneyTrace | ReturnType<typeof replayJourney>)[] = JOURNEYS.map((j) => traceOf(j, runJourney(j)));
out.push(replayJourney());
writeFileSync(process.argv[2], JSON.stringify(out, null, 1) + "\n");
if (process.argv[3]) {
  const md: string[] = [];
  for (const t of out as JourneyTrace[]) {
    if (!("submissions" in t)) { md.push(`### ${(t as { id: string }).id} ${(t as { title: string }).title}\n\n\`\`\`json\n${JSON.stringify(t, null, 1)}\n\`\`\`\n`); continue; }
    md.push(`### ${t.id} ${t.title}\n\nLearner (scripted submissions only): ${t.learner}. Mode: ${t.mode}. Ended: ${t.ended}.\n`);
    md.push("| # | Question (family) | Activity | Typed | Answer verdict | Working status / method evidence / completeness | First invalid step | Feedback shown |", "|---|---|---|---|---|---|---|---|");
    for (const s of t.submissions) md.push(`| ${s.n} | ${s.question} (${s.family}) | ${s.activity} | \`${s.typed}\` | ${s.answer.verdict} (${s.answer.reason}) | ${s.method ? `${s.method.status} / ${s.method.evidence} / ${s.method.completeness}` : "—"} | ${s.method?.firstInvalid ? `line ${s.method.firstInvalid.index + 1} \`${s.method.firstInvalid.text}\` (lost ${s.method.firstInvalid.lost}, gained ${s.method.firstInvalid.gained})` : "—"} | ${s.feedback?.level}: ${s.feedback?.message?.replace(/\|/g, "\\|")} |`);
    md.push("");
    if (t.teaching.length) { md.push("| Explanation | Basis | Review | Displayed | Recheck (family, fresh) | Recheck credit | Recheck method |", "|---|---|---|---|---|---|---|"); for (const x of t.teaching) md.push(`| ${x.explanation} | ${x.basis} | ${x.review} | ${x.displayed} | ${x.recheck ? `${x.recheck.question} (${x.recheck.family}, ${x.recheck.freshQuestion})` : "not reached"} | ${x.recheck?.credit ?? "—"} | ${x.recheck?.method ?? "—"} |`); md.push(""); }
    if (t.refused.length) md.push(`Refused by the content gate: ${t.refused.map((x) => `${x.explanation} (${x.mode}: ${x.failed?.join(", ")})`).join("; ")}\n`);
    md.push(`After: status ${t.after.status}, verified ${t.after.verified}, recovery required ${t.after.recoveryRequired}, retention ${t.after.retention}${t.after.retentionHistory.length ? ` (${t.after.retentionHistory.join(", ")})` : ""}, independent ${t.after.independent.right}/${t.after.independent.total}; families in the evidence: ${t.after.familiesInEvidence.join(", ")}.\n`);
  }
  writeFileSync(process.argv[3], md.join("\n") + "\n");
}
console.log("journeys", out.length);
