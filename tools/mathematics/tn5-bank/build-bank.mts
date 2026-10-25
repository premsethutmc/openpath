/**
 * T0: export the Tamil Nadu Grade 5 question bank, deterministically, with one verification label per item, and write
 * a manifest (counts, SHA-256) and a coverage report for the syllabus requirements.
 *
 *   node --import tsx tools/mathematics/tn5-bank/build-bank.mts <outDir>
 *
 * Output (outDir): bank.jsonl (one problem per line; not committed, ~60 MB), manifest.json, coverage.json.
 * Rebuilding must give a byte-identical bank.jsonl: nothing here reads a clock, a random source or the environment.
 */
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { FAMILIES, pool, difficultyOf } from "../../../packages/learning/src/families";
import { boardReleases } from "../../../packages/learning/src/board-releases";
import { assigned, allOutcomesOf } from "../../../packages/learning/src/curriculum";
import { adaptProblem } from "../../../packages/learning/src/kernel-adapter";
import { fingerprintOf } from "../../../packages/learning/src/review";
import { canonicalOf } from "../../../packages/learning/src/answer-types";
import { CLAIM_BASIS } from "../../../packages/learning/src/claims/index";

/** Claims that rest on a convention rather than pure mathematics; the owner reviews these. */
const CONVENTION = new Set(["aechk/estimate", "acstory/choose operation", "acstory4/choose operation", "acstory9/choose operation", "aabig/compare sizes", "avfwq/evaluate"]);

const RELEASE = "tn-samacheer-mathematics-grade-5";
const outDir = process.argv[2] ?? "out";
const here = dirname(fileURLToPath(import.meta.url));
const sha = (s: string | Buffer) => createHash("sha256").update(s).digest("hex");
const src = (f: string) => readFileSync(join(here, "../../../packages/learning/src", f));
const ENGINE = `kernel@${sha(Buffer.concat([src("math-kernel.ts"), src("kernel-adapter.ts")])).slice(0, 12)}`;

const release: any = boardReleases.find((r: any) => r.id === RELEASE);
if (!release) throw new Error(`release ${RELEASE} not found`);
const comps = [...new Set(assigned(release).map((a) => a.competency))].sort();
const families = [...FAMILIES.values()].filter((f) => comps.includes(f.competency)).map((f) => f.id).sort();

type Label = "kernel-verified" | "partial" | "answer-verified";
const lines: string[] = [];
const byLabel: Record<Label, number> = { "kernel-verified": 0, partial: 0, "answer-verified": 0 };
const unverifiedOps: Record<string, number> = {};
const perFamily: Record<string, Record<Label, number>> = {};
const depth: Record<string, Record<string, number>> = {}; // competency → difficulty band → distinct items
const ids = new Set<string>();
const weak = { figureConsistentItems: 0, conventionItems: 0, figureConsistentSteps: 0, conventionSteps: 0 };

for (const fam of families) {
  const fp = fingerprintOf(fam);
  perFamily[fam] = { "kernel-verified": 0, partial: 0, "answer-verified": 0 };
  for (const p of pool(fam).items) {
    if (ids.has(p.id)) throw new Error(`duplicate id ${p.id}`);
    ids.add(p.id);
    const a = adaptProblem(p);
    const label: Label = a.fullyAdapted ? "kernel-verified" : a.steps.some((s) => s.adapted) ? "partial" : "answer-verified";
    byLabel[label]++;
    perFamily[fam][label]++;
    const unchecked = p.steps.filter((_, i) => !a.steps[i].adapted).map((s) => s.op);
    for (const op of unchecked) unverifiedOps[`${fam}/${op}`] = (unverifiedOps[`${fam}/${op}`] ?? 0) + 1;
    const keyOf = (i: number) => `${fam}/${p.steps[i].op}`;
    const fcSteps = p.steps.filter((_, i) => a.steps[i].adapted && CLAIM_BASIS[keyOf(i)] === "figure-consistent").length;
    const cvSteps = p.steps.filter((_, i) => a.steps[i].adapted && CONVENTION.has(keyOf(i))).length;
    weak.figureConsistentSteps += fcSteps; weak.conventionSteps += cvSteps;
    if (fcSteps) weak.figureConsistentItems++;
    if (cvSteps) weak.conventionItems++;
    const diff = difficultyOf(p);
    ((depth[p.competency] ??= {})[diff] = (depth[p.competency][diff] ?? 0) + 1);
    lines.push(JSON.stringify({
      id: p.id, family: fam, competency: p.competency, skill: p.skill, form: p.form, difficulty: diff,
      question: p.prompt, figure: p.figure ?? null, options: p.options ?? null,
      answer: p.answer, answerType: p.type, canonical: canonicalOf(p.type, p.answer),
      steps: p.steps.map((s, i) => ({ id: s.id, op: s.op, competency: s.competency, inputs: s.inputs, value: s.value, checked: a.steps[i].adapted })),
      wrongAnswers: p.bugs.map((b) => ({ id: b.id, kind: b.kind, says: b.says, predicts: b.predict })),
      label, uncheckedOps: unchecked, figureConsistentSteps: fcSteps, conventionSteps: cvSteps, engine: ENGINE, fingerprint: fp,
    }));
  }
}

mkdirSync(outDir, { recursive: true });
const body = lines.join("\n") + "\n";
writeFileSync(join(outDir, "bank.jsonl"), body);

// coverage of the requirements (outcomes) in the release
const requirements = allOutcomesOf(release).map((o: any) => {
  const cs: string[] = (o.outcome.mapping?.competencies ?? []).map((m: any) => m.competency ?? m.id).filter(Boolean);
  const fams = families.filter((f) => cs.includes(FAMILIES.get(f)!.competency));
  const n = fams.reduce((t, f) => t + pool(f).items.length, 0);
  return { id: o.outcome.id, text: String(o.outcome.text ?? o.outcome.title ?? "").slice(0, 140), verdict: o.outcome.mapping?.verdict, competencies: cs, families: fams.length, problems: n };
});
const unmapped = requirements.filter((r) => r.families === 0);
writeFileSync(join(outDir, "coverage.json"), JSON.stringify({ release: RELEASE, requirements: requirements.length, unmapped, requirementsList: requirements }, null, 1) + "\n");

const manifest = {
  release: RELEASE, engine: ENGINE, competencies: comps.length, families: families.length, problems: lines.length,
  labels: byLabel, weakerBasis: weak, sha256: sha(body), bytes: Buffer.byteLength(body),
  uncheckedStepTypes: Object.keys(unverifiedOps).length,
  uncheckedSteps: Object.entries(unverifiedOps).sort((x, y) => y[1] - x[1] || (x[0] < y[0] ? -1 : 1)),
  depthShortfalls: Object.entries(depth).flatMap(([c, d]) => [1, 2, 3].filter((b) => (d[b] ?? 0) < 30).map((b) => ({ competency: c, band: b, items: d[b] ?? 0 }))),
  perFamily,
};
writeFileSync(join(outDir, "manifest.json"), JSON.stringify(manifest, null, 1) + "\n");
console.log(`bank: ${manifest.problems} problems, ${manifest.families} families, labels ${JSON.stringify(byLabel)}, sha256 ${manifest.sha256.slice(0, 16)}, unmapped requirements ${unmapped.length}/${requirements.length}`);
