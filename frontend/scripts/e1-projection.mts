/**
 * Workstream E1: learner journeys and their sub-skill projections (non-authoritative), machine-readable, with the stored events.
 *   node --import tsx scripts/e1-projection.mts <out.json> [<out.md>]
 */
import { writeFileSync } from "node:fs";
import { E1_JOURNEYS, e1Trace } from "../src/journey/sub-skill-journeys.ts";

const out = E1_JOURNEYS.map((j) => e1Trace(j));
writeFileSync(process.argv[2], JSON.stringify(out, null, 1) + "\n");
if (process.argv[3]) {
  const md: string[] = [];
  for (const t of out) {
    const fams = [...new Set(t.answered.map((a) => a.family))].map((f) => `${f}: ${t.answered.filter((a) => a.family === f).map((a) => (a.verdict === "correct" ? "✓" : a.verdict === "incorrect" ? "✗" : "·") + (a.hints || a.activity === "guided" ? "ᵃ" : "")).join("")}`).join("; ");
    md.push(`### ${t.id} ${t.title}`, "", `Learner \`${t.learnerId}\` (${t.kind === "flow" ? "real module flow" : "answers given straight to the real session"}); ${t.answered.length} answers. ${"ended" in t ? `Engine ended: ${(t as { ended: string }).ended}; explanations shown: ${((t as { teaching?: string[] }).teaching ?? []).join(", ") || "none"}.` : ""}`, "", `Answers by family (✓ right, ✗ wrong, ᵃ assisted): ${fams}`, "");
    md.push(`Production (unchanged evidence engine): ${t.production.map((p) => `${p.competency.split(".").pop()} = ${p.status}, verified ${p.verified}, delayed check ${p.retention}`).join("; ")}`, "");
    md.push("| Sub-skill | Projected status | Alone right / wrong | Assisted right / wrong | First shown | Delayed check (history) | Method (trusted verdicts) |", "|---|---|---|---|---|---|---|");
    for (const s of t.projection.subSkills) if (s.status !== "no-evidence" || ["two-step", "variables-both-sides", "brackets"].includes(s.id)) md.push(`| ${s.id} | ${s.status} | ${s.answers.independentRight} / ${s.answers.independentWrong} | ${s.answers.assistedRight} / ${s.answers.assistedWrong} | ${s.firstShownAt ?? "—"} | ${s.retention}${s.history.length ? ` (${s.history.join(", ")})` : ""} | ${Object.entries(s.method).map(([k, v]) => `${k} ${v}`).join(", ") || "—"} |`);
    const c = t.projection.competencies.find((x) => x.competency === "MATH.algebra.linear-equations")!;
    md.push("", `Projection for linear equations: supports **${c.supports}**; shown ${c.shown.join(", ") || "none"}; missing ${c.missing.join(", ") || "none"}; retained ${c.retained.join(", ") || "none"}.`, `Leakage: ${c.leakage.length ? c.leakage.map((l) => `**${l.kind}**: ${l.detail}`).join("; ") : "none"}.`, "", `Projection digest: \`${t.digest}\``, "");
  }
  writeFileSync(process.argv[3], md.join("\n") + "\n");
}
console.log("journeys", out.length);
