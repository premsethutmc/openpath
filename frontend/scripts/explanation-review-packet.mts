/**
 * Workstream A2: the educator-review packet. For each explanation listed (default: every explanation the audited scenarios reach, before and
 * after the content gate, plus the four corrected ones), everything an educator needs to approve, request revision or block THAT revision:
 * the question it is about, the target skill, what triggers it, the full text, the mathematical steps and what the machine checked, the
 * independent recheck, the content revision, and the earlier AI screening. Display only: it records no decision.
 *
 *   node --import tsx scripts/explanation-review-packet.mts <out.md> <decisions.json>... [--ids a#b,c#d]
 */
import { readFileSync, writeFileSync } from "node:fs";
import { moduleFor, question } from "../../packages/learning/src/content.ts";
import { problemOf } from "../../packages/learning/src/families.ts";
import { graph } from "../../packages/learning/src/graph.ts";
import { contentHash, currentRevision, explanationId, explanationRegistry, isMisconceptionSpecific } from "../../packages/learning/src/explanation-review.ts";
import { lessonBlocks, teachingEligibility } from "../../packages/learning/src/teaching-contract.ts";

const args = process.argv.slice(2);
const out = args[0];
const idsArg = args.includes("--ids") ? args[args.indexOf("--ids") + 1].split(",") : [];
const decisionFiles = args.slice(1).filter((a, i, all) => a !== "--ids" && all[i - 1] !== "--ids");
const CORRECTED = ["MATH.number.multiplication-tables#doubling", "MATH.algebra.missing-number#worked_steps", "MATH.algebra.missing-number#check_what_it_uses", "MATH.number.rational-numbers#spot_the_mistake", "MATH.measurement.standard-mass#spot_the_mistake", "MATH.reasoning.propositional-logic#spot_the_mistake"];
const root = new URL("../../", import.meta.url);
const matrix = JSON.parse(readFileSync(new URL("docs/milestone-2/closure/teaching-content-matrix.json", root), "utf8")) as Record<string, string>[];
const ai = [1, 2, 3].flatMap((i) => JSON.parse(readFileSync(new URL(`docs/milestone-2/closure/ai-review-batch${i}.json`, root), "utf8")) as Record<string, string>[]);

// triggers: which scenario reached it, and on what evidence
const triggers = new Map<string, string[]>();
for (const f of decisionFiles)
  for (const sc of JSON.parse(readFileSync(f, "utf8")) as { id: string; learner: string; decisions: { competency: string; strategy: string; basis: string; evidence?: string; verdict: string }[] }[])
    for (const d of sc.decisions) {
      const cid = findCompetency(d.competency);
      if (!cid) continue;
      const k = explanationId(cid, d.strategy);
      triggers.set(k, [...(triggers.get(k) ?? []), `scenario ${sc.id} (${sc.learner}) — ${d.basis}${d.evidence ? `; evidence: ${d.evidence}` : ""}; ${d.verdict} [${f.split("/").pop()}]`]);
    }
function findCompetency(short: string): string | null {
  for (const e of explanationRegistry().entries) if (e.competency.endsWith(`.${short}`) || e.competency === short) return e.competency;
  return null;
}
const ids = [...new Set([...(idsArg.length ? idsArg : [...triggers.keys()]), ...CORRECTED])].sort();

const q = (id: string) => { try { const x = question(id); return `${x.prompt} — answer: ${x.answer}`; } catch { return `${id} (not found)`; } };
const lines: string[] = [
  "# Educator-review packet (explanation-review@1)", "",
  "Each section is one explanation at one exact revision. **Nothing here is approved.** The status shown is AI screening or registry bookkeeping, not an educator decision.", "",
  "To record a decision, an authorised educator (listed in `reviewers` of `content/learning/explanation-review.v1.json` by a reviewed change) runs, for the revision shown:", "",
  "```", "node --import tsx packages/learning/scripts/explanation-review.ts decide '<id>' --status approved|revision_required|blocked --reviewer <id> --note \"<what was checked>\"", "```", "",
  "The command refuses a reviewer who is not authorised and records the decision against the current content hash only; any later edit of the explanation voids it.", "",
  `Explanations in this packet: ${ids.length}.`, "",
];
for (const id of ids) {
  const [cid, sid] = id.split("#");
  const m = moduleFor(cid), s = m?.strategies.find((x) => x.id === sid);
  lines.push(`## ${id}`, "");
  if (!m || !s) { lines.push("Not found in the current content.", ""); continue; }
  const cur = currentRevision(m, s);
  const rec = explanationRegistry().entries.find((e) => e.id === id);
  const elig = teachingEligibility(m, s);
  const blocks = lessonBlocks({ ...m, strategies: [s] }).slice(1).filter((b) => s.screens.some((x) => x.title === b.title));
  const inst = s.screens.find((x) => x.instance)?.instance ?? s.guided;
  lines.push(
    `- **Target competency:** ${graph.get(cid)?.name ?? cid} (\`${cid}\`)`,
    `- **Explanation:** “${s.title}” — intervention type \`${s.kind}\`${isMisconceptionSpecific(s) ? ", **misconception-specific** (shown only when a misconception is established for the learner)" : ", general"}`,
    `- **Content revision:** \`${contentHash(cid, s)}\``,
    `- **Current status:** ${cur ? `${cur.revision.status} — ${cur.revision.provenance.source} (${cur.revision.provenance.note})` : "unregistered"}`,
    ...(rec && rec.revisions.length > 1 ? [`- **Earlier revisions:** ${rec.revisions.filter((r) => r !== cur?.revision).map((r) => `\`${r.contentHash.slice(0, 19)}…\` ${r.status}${r.knownIssues.length ? ` (${r.knownIssues.join("; ")})` : ""}`).join("; ")}`] : []),
    `- **Original question:** ${inst ? `\`${inst}\` ${problemOf(inst)?.prompt ?? q(inst)}${problemOf(inst) ? ` — answer: ${problemOf(inst)!.answer}` : ""}` : "none recorded"}`,
    `- **Learner error or teaching trigger:** ${triggers.get(id)?.length ? "" : "not reached by the audited scenarios; triggered when the engine selects it for this skill"}`,
    ...(triggers.get(id) ?? []).map((t) => `  - ${t}`),
    "", "**Full explanation (verbatim):**", "",
    ...s.screens.flatMap((sc) => [`> **${sc.title}**`, ...sc.text.map((t) => `> ${t}`), ...(sc.math ?? []).map((x) => `> \`${x}\``), ">"]),
    "", "**Mathematical steps, and what the machine checked:**", "",
    ...blocks.flatMap((b) => b.worked ? [`- ${b.title}: ${b.worked.verified ? "steps checked" : "steps NOT checked"} (${b.worked.source})`, ...b.worked.steps.map((x) => `  - \`${x.expression}\` — ${x.explanation}`)] : [`- ${b.title}: no worked steps`]),
    `- Teaching-contract check: ${elig.review}; ${elig.violations.length ? `violations: ${elig.violations.join("; ")}` : "no violations"}`,
    "", `**Expected learner understanding:** not stated in the content. As the content is built, the learner should afterwards answer the independent recheck below alone. The educator confirms or corrects this.`,
    "", "**Independent recheck:**", "",
    `- guided (with help): \`${s.guided}\` ${q(s.guided)}`,
    `- independent check: \`${s.check}\` ${q(s.check)}`,
    "", "**Previous AI audit findings (screening only, not educator review):**", "",
  );
  const mr = matrix.find((r) => r.cid === cid && r.strategy === sid);
  if (mr) lines.push(`- Matrix: **${mr.classification}** — math ${mr.math}; clarity ${mr.clarity}; fit ${mr.fit}; difficulty ${mr.difficulty}. ${mr.notes}`);
  for (const r of ai.filter((x) => x.competency === cid && x.strategy === sid)) lines.push(`- Reviewer: correctness ${r.mathematical_correctness} (${r.correctness_note}); clarity ${r.conceptual_clarity} (${r.clarity_note}); fit ${r.age_curriculum_fit}; difficulty ${r.addresses_difficulty} (${r.difficulty_note})`);
  if (!mr) lines.push("- not in the Milestone 2 audit");
  lines.push("", "**Educator decision:** ☐ approve this revision ☐ request revision ☐ block — reviewer id: ______ date: ______ note: ______", "");
}
writeFileSync(out, lines.join("\n") + "\n");
console.log(`packet: ${ids.length} explanations → ${out}`);
