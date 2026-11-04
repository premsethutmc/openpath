/**
 * D1 + E1 integration: the twenty learner journeys, machine-readable (stored events included), and a Markdown summary.
 *   node --import tsx scripts/d1e1-journeys.mts <out.json> [<out.md>]
 */
import { writeFileSync } from "node:fs";
import { DE1_JOURNEYS } from "../src/journey/d1e1-journeys.ts";

const out = DE1_JOURNEYS.map((j) => j.run());
writeFileSync(process.argv[2], JSON.stringify(out, null, 1) + "\n");
if (process.argv[3]) {
  const md: string[] = [];
  for (const t of out) {
    md.push(`### ${t.id} ${t.title}`, "", `Learner \`${t.learnerId}\`. Authoritative (unchanged): ${t.authoritative.status}, verified ${t.authoritative.verified}, delayed check ${t.authoritative.retention}${t.authoritative.recoveryRequired ? ", recovery required" : ""}.`, "");
    md.push("| # | Question (family) | Activity | Response | Working | Answer verdict | Working verdict (method evidence) |", "|---|---|---|---|---|---|---|");
    t.submissions.forEach((s, i) => md.push(`| ${i + 1} | ${s.q} (${s.family ?? "unknown"}) | ${s.activity}${s.hints ? ", hint" : ""} | \`${s.response}\` | ${s.working.length ? "`" + s.working.join("; ") + "`" : "—"} | ${s.verdict ?? "—"} | ${s.workingStatus ?? "—"}${s.methodEvidence ? ` (${s.methodEvidence}${s.firstInvalid !== null ? `, first invalid line ${s.firstInvalid + 1}` : ""})` : ""} |`));
    md.push("", "| Sub-skill (shadow) | Status | Alone right / total | Assisted right / total | Contradicted | Method: verified / false step / unsupported / bare / no working / partial (no answer) / not recorded / historical | Delayed check (need; sampled; history) | Ever shown |", "|---|---|---|---|---|---|---|---|");
    for (const [k, x] of Object.entries(t.projection.subSkills)) md.push(`| ${k} | ${x.status} | ${x.attempts.independentRight} / ${x.attempts.independent} | ${x.attempts.assistedRight} / ${x.attempts.assisted} | ${x.attempts.contradicted} | ${x.method.verified} / ${x.method.falseStep} / ${x.method.unsupported} / ${x.method.noMethodEvidence} / ${x.method.noWorking} / ${x.method.partialWorking} / ${x.method.notRecorded} / ${x.method.historical} | ${x.retention.state} (${x.retention.need}; ${x.retention.sampled}; ${x.retention.history.join(", ") || "—"}) | ${x.everDemonstrated} |`);
    md.push("", `Unknown: ${JSON.stringify(t.projection.unknown)}. Discrepancies: ${t.projection.discrepancies.length ? t.projection.discrepancies.join("; ") : "none"}.`);
    if (Object.keys(t.checks).length) md.push("", `Checks: \`${JSON.stringify(t.checks)}\``);
    md.push("");
  }
  writeFileSync(process.argv[3], md.join("\n") + "\n");
}
console.log(out.map((t) => `${t.id} auth=${t.authoritative.status} ${Object.entries(t.projection.subSkills).map(([k, x]) => `${k}:${x.status}[v${x.method.verified} f${x.method.falseStep} u${x.method.unsupported} b${x.method.noMethodEvidence} p${x.method.partialWorking} nr${x.method.notRecorded} h${x.method.historical} c${x.attempts.contradicted}]`).join(" ")} unk=${JSON.stringify(t.projection.unknown)} disc=${t.projection.discrepancies.length} ${Object.keys(t.checks).length ? JSON.stringify(t.checks) : ""}`).join("\n"));
