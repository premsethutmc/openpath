/**
 * Check one file of families (families@2) before it is registered: every family in the file is built, specified and
 * validated exactly as the release pipeline does, its module is built from the template, its pool depth is checked,
 * and the server's marking (backend/family/answer_types.py) is run on every answer and every predicted wrong answer.
 *
 *   node --import tsx packages/learning/scripts/check-family.ts packages/learning/src/fam/<file>.ts [--samples 4]
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { FAMILIES, pool, problemOf, phasePool, exposureKey, resetPools } from "../src/families";
import type { Def } from "../src/family-kit";
import { familySpec, validateFamily } from "../src/spec";
import { fromTemplate, poolDepth } from "../src/library";
import { NEW_TYPES, sameAnswer } from "../src/answer-types";
import { canonical, isCorrect, question } from "../src/content";
import { graph } from "../src/graph";

async function main() {
const file = process.argv[2];
const samples = Number(process.argv[process.argv.indexOf("--samples") + 1]) || 3;
if (!file) throw new Error("usage: check-family.ts <file.ts>");
const mod = (await import(pathToFileURL(resolve(file)).href)) as Record<string, unknown>;
const defs = Object.values(mod).flatMap((v) => (Array.isArray(v) ? v : [])).filter((d): d is Def => !!d && typeof d === "object" && "solve" in d && "id" in d);
if (!defs.length) throw new Error(`${file}: exports no family definitions (export const X: Def[] = [...])`);
const problems: string[] = [];
const fail = (s: string) => problems.push(s);
for (const d of defs) {
  const existing = FAMILIES.get(d.id);
  if (existing && existing !== d) fail(`${d.id}: the id is already used by another family`);
  if (!/^[a-z0-9]+$/.test(d.id)) fail(`${d.id}: ids are [a-z0-9]+`);
  FAMILIES.set(d.id, d);
}
resetPools();
const parity: { type: string; answer: string; wrong: string[]; same: string[] }[] = [];
for (const d of defs) {
  const tag = `${d.id} (${d.competency})`;
  try {
    graph.get(d.competency);
  } catch {
    fail(`${tag}: unknown competency (add it to the graph expansion first)`);
    continue;
  }
  if (!d.domain) {
    fail(`${tag}: no domain`);
    continue;
  }
  if (!d.teach) fail(`${tag}: no teaching hints (teach.idea, teach.method)`);
  if (!d.teach?.alternatives?.length) fail(`${tag}: no alternative way of explaining (teach.alternatives)`);
  const grade = graph.get(d.competency).gradeRange[0];
  if (grade <= 3 && !d.figure && !d.teach?.visual && !d.teach?.alternatives?.some((a) => a.visual)) fail(`${tag}: a Grade ${grade} family needs a picture (figure, teach.visual or an alternative's visual)`);
  let report;
  try {
    report = validateFamily(d.id);
  } catch (e) {
    fail(`${tag}: validation crashed: ${(e as Error).stack?.split("\n").slice(0, 3).join(" | ")}`);
    continue;
  }
  const { items, excluded } = pool(d.id);
  if (items.length < 80) fail(`${tag}: only ${items.length} problems in the release pool (at least 80)`);
  if (excluded.length) fail(`${tag}: ${excluded.length} candidates fail their own check, e.g. ${excluded.slice(0, 3).map((e) => `${e.params}: ${e.reason}`).join("; ")}`);
  for (const f of [...report.deterministic.failures, ...report.property.failures, ...report.boundary.failures].slice(0, 8)) fail(`${tag}: ${f}`);
  const spec = familySpec(d.id)!;
  // every item: the app accepts its answer; for answers@2 types, the server must agree (checked below)
  for (const p of items) {
    const q = question(p.id);
    if (!isCorrect(q, q.answer)) fail(`${p.id}: the app does not accept its own answer ${q.answer}`);
    if (canonical(q, q.answer) === null) fail(`${p.id}: the answer ${q.answer} is not readable as ${q.type}`);
    const wrong = p.bugs.flatMap((b) => (b.predict === null ? [] : p.type !== "set" && Array.isArray(b.predict) ? b.predict : [b.predict])).map((v) => (typeof v === "string" ? v : Array.isArray(v) ? v.join(", ") : String(v)));
    for (const w of wrong) if (isCorrect(q, w)) fail(`${p.id}: the predicted wrong answer ${w} is marked right`);
    if (NEW_TYPES.has(p.type)) parity.push({ type: p.type, answer: p.answer, wrong, same: [] });
    if (d.mc) {
      const m = problemOf(`${p.id}:mc`);
      if (!m) fail(`${p.id}:mc does not build`);
    }
    if (d.word) {
      const w = problemOf(`${p.id}:w`);
      if (!w) fail(`${p.id}:w does not build`);
    }
  }
  // the module this family gives (template@1/2) and its depth
  try {
    const m = fromTemplate(d.id, d.competency, "check");
    const depth = poolDepth(m)!;
    if (!depth.sufficient) fail(`${tag}: pool too small for ${depth.short.join(", ")} (${JSON.stringify(depth.counts)})`);
    if (m.strategies.length < 2) fail(`${tag}: the module has only ${m.strategies.length} teaching strategy`);
  } catch (e) {
    fail(`${tag}: no module: ${(e as Error).message}`);
  }
  // samples for the author to read
  console.log(`\n== ${d.id}: ${d.title} → ${d.competency} (Grade ${graph.get(d.competency).gradeRange.join("–")})  type ${d.type}  pool ${items.length}  fingerprint ${spec.fingerprint}`);
  const pick = [...new Set(["diagnostic", "practice", "retention"].flatMap((ph) => phasePool(d.id, ph as "practice").slice(0, samples)).map(exposureKey))].slice(0, samples * 2);
  for (const id of pick) {
    const p = problemOf(id)!;
    console.log(`  ${p.id}  ${p.prompt}  →  ${p.answer}${p.figure ? `  [figure ${JSON.stringify(p.figure).slice(0, 90)}]` : ""}`);
    for (const b of p.bugs) console.log(`      ${b.id} (${b.kind}) predicts ${JSON.stringify(b.predict)}: ${b.says}`);
    if (d.mc) console.log(`      mc: ${problemOf(`${id}:mc`)?.options?.join(" | ")}  answer ${problemOf(`${id}:mc`)?.answer}`);
    if (d.word) console.log(`      word: ${problemOf(`${id}:w`)?.prompt}`);
  }
}
// the server's marking (answers@2 types): the same verdicts as the app
if (parity.length) {
  const dir = mkdtempSync(join(tmpdir(), "fam-"));
  writeFileSync(join(dir, "cases.json"), JSON.stringify(parity));
  const backend = resolve(import.meta.dirname, "../../../backend");
  const out = execFileSync("python3", ["-c", `
import json, sys
sys.path.insert(0, ${JSON.stringify(backend)})
from family.answer_types import same_answer
bad = []
for c in json.load(open(sys.argv[1])):
    if not same_answer(c['type'], c['answer'], c['answer']):
        bad.append(f"server does not accept {c['answer']} ({c['type']})")
    for w in c['wrong']:
        if same_answer(c['type'], w, c['answer']):
            bad.append(f"server marks the wrong answer {w} right for {c['answer']} ({c['type']})")
print(json.dumps(bad[:20]))
`, join(dir, "cases.json")], { encoding: "utf8" });
  for (const b of JSON.parse(out) as string[]) fail(`server: ${b}`);
  // and the app agrees with itself under the type's rules
  for (const c of parity) if (!sameAnswer(c.type as never, c.answer, c.answer)) fail(`app: does not accept ${c.answer} (${c.type})`);
}
console.log(problems.length ? `\n${problems.length} PROBLEMS:\n${problems.slice(0, 60).map((p) => `  - ${p}`).join("\n")}` : `\nOK: ${defs.length} families`);
process.exit(problems.length ? 1 : 0);
}
void main();
