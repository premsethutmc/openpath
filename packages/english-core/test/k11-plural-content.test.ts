/**
 * K11: the proposed plural-noun questions (g8-plurals-v1) expand assessment by COVERAGE: six sub-skills (regular,
 * irregular, already-plural nouns, number + plural, quantifiers, countable/uncountable), each with distinct
 * diagnostic, independent, transfer and delayed-retention questions, constructed responses included. All provisional,
 * never loaded by the app; a counterfactual review (validated) makes one full verification sequence possible.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { allocateItems, type BankItem, scoreCode, teachingLeak, validateContent } from "../src/index.ts";
import { loadAppEssayContext } from "../../../tools/english/essay-load.ts";
import { REPO } from "../../../tools/english/load.ts";
import { loadContextWithPlurals, loadPluralItems, loadPluralManifest, PLURAL_COVERAGE } from "../../../tools/english/supplement/plurals.ts";
import { exportRoundPlurals, PLURALS_ROUND_DIR, roundPlurals } from "../../../tools/english/educator/round-plurals.ts";

const PLU = "EN.GRM.NOUN.plurals_countability";
const items = loadPluralItems() as BankItem[];
const m = loadPluralManifest();
const app = loadAppEssayContext();
const words = (s: string) => new Set(s.toLowerCase().replace(/_{3,}/g, " ").replace(/[^a-z' ]+/g, " ").split(/\s+/).filter(Boolean));
const text = (i: BankItem) => [i.prompt, ...(i.options ?? [])].join(" ");
const similar = (a: string, b: string) => {
  const x = words(a);
  const y = words(b);
  let both = 0;
  for (const w of x) if (y.has(w)) both++;
  return both / (x.size + y.size - both);
};

test("K11-1 provisional, valid, unique, never loaded by the app, and every key scores as intended", () => {
  assert.equal(items.length, 30);
  assert.ok(items.every((i) => i.kind === "code" && i.target === PLU && i.evidence_status === "provisional" && i.difficulty_source === "expert_estimate"));
  assert.deepEqual(validateContent({ items, passages: [], goals: [], misspellings: {} }, app.ctx.index), []);
  assert.equal(new Set(items.map((i) => i.id)).size, items.length);
  for (const i of items) assert.ok(!app.ctx.content.items.has(i.id), `${i.id} is not in the shipped bank`);
  assert.doesNotMatch(readFileSync(join(REPO, "frontend", "src", "english", "logic", "content.ts"), "utf8"), /g8-plurals/, "the app never loads the proposed questions");
  const steps = new Set((JSON.parse(readFileSync(join(REPO, "content", "english", "items", "progressions.json"), "utf8")).capabilities[PLU].steps as { id: string }[]).map((s) => s.id));
  for (const i of items) {
    assert.ok(steps.has(i.step!), `${i.id}: ladder step ${i.step}`);
    const kind = i.format.split(":")[0];
    const right = kind === "typed" ? { kind: "typed" as const, text: i.answers![0] } : kind === "multi" ? { kind: "multi" as const, choices: i.answer_set! } : { kind: "choice" as const, choice: i.answer! };
    assert.ok(scoreCode(i, right).correct, `${i.id}: its key scores right`);
    for (const w of Object.keys(i.wrong ?? {})) assert.ok(!scoreCode(i, { kind: "typed", text: w }).correct, `${i.id}: a tagged wrong answer is wrong`);
    if (kind === "typed" && i.format === "typed:cloze") assert.equal((i.prompt.match(/_{3,}/g) ?? []).length, 1, `${i.id}: one blank`);
    if (kind === "typed" && i.format === "typed:correction") assert.match(i.prompt, /^(One word in this sentence is wrong|Replace the wrong word)/, `${i.id}: says what to correct`);
  }
});

test("K11-2 coverage: every sub-skill has a diagnostic, two independent, a transfer and a retention question, constructed responses included", () => {
  for (const cov of PLURAL_COVERAGE) {
    const mine = items.filter((i) => m.coverage[i.id] === cov);
    const by = (u: string) => mine.filter((i) => m.proposedUse[i.id] === u);
    assert.equal(by("diagnostic").length, 1, `${cov}: diagnostic`);
    assert.equal(by("independent").length, 2, `${cov}: independent`);
    assert.equal(by("transfer").length, 1, `${cov}: transfer`);
    assert.equal(by("retention").length, 1, `${cov}: retention`);
    assert.ok(mine.some((i) => i.format.startsWith("typed")), `${cov}: at least one constructed response`);
    // transfer questions apply the skill in a sentence the learner must correct, unprompted
    assert.ok(by("transfer").every((i) => i.format === "typed:correction"), `${cov}: transfer is a constructed correction in context`);
  }
  assert.ok(items.filter((i) => i.format.startsWith("typed")).length >= 15, "at least half constructed");
  // bands: diagnosis near the target (so right answers can rule a gap out); checks and retention at band 5–6.5
  for (const i of items) {
    const u = m.proposedUse[i.id];
    if (u === "diagnostic") assert.ok(i.b >= 4.5 && i.b <= 5.25, `${i.id} b ${i.b}`);
    else assert.ok(i.b >= 5 && i.b <= 6.5, `${i.id} b ${i.b}`);
    assert.equal(m.proposedPools[i.id], { diagnostic: "diagnosis", independent: "confirmation", transfer: "confirmation", retention: "retention" }[u]);
  }
});

test("K11-3 no duplicate of the bank or of each other, and no answer shown in a lesson", () => {
  const bank = [...app.ctx.content.byCapability.get(PLU)!].filter((i): i is BankItem => i.kind === "code");
  for (const i of items) {
    for (const j of bank) assert.ok(similar(text(i), text(j)) < 0.8, `${i.id} is close to bank ${j.id}`);
    for (const j of items) if (j.id !== i.id) assert.ok(similar(text(i), text(j)) < 0.8, `${i.id} is close to ${j.id}`);
    assert.equal(teachingLeak(i, app.teachingText?.get(PLU) ?? []), null, `${i.id}: its answer appears in a lesson`);
  }
});

test("K11-4 counterfactual: reviewed (validated), these make one full verification sequence possible, which the shipped bank cannot", () => {
  const now = allocateItems(app, [], PLU);
  assert.ok(now.available.independent_verification.length < app.policy.checkItems, "shipped bank: not enough for an independent check");
  const reviewed = loadContextWithPlurals({ asIfReviewed: true });
  const a = allocateItems(reviewed, [], PLU);
  assert.ok(a.available.diagnostic.length >= reviewed.policy.diagnosticItems, `diagnosis ${a.available.diagnostic.length}`);
  assert.ok(a.reserved.delayed_retention.length >= reviewed.policy.retentionItems, `retention ${a.reserved.delayed_retention.length}`);
  assert.ok(a.reserved.independent_verification.length >= reviewed.policy.checkItems * (1 + reviewed.policy.followUpChecks), `checks ${a.reserved.independent_verification.length}`);
  // as shipped (unreviewed), they would be practice only
  const provisional = loadContextWithPlurals();
  const p = allocateItems(provisional, [], PLU);
  assert.ok(!p.reserved.independent_verification.some((id) => id.startsWith("sup.plu.")));
  assert.ok(!p.available.diagnostic.some((id) => id.startsWith("sup.plu.")));
});

test("K11-5 H-V4: all 30 questions are prepared for item-by-item review, in order, blank, and none is approved", () => {
  const entries = roundPlurals();
  assert.equal(entries.length, 30);
  assert.deepEqual(entries.map((e) => e.review_order), entries.map((_, k) => k + 1));
  assert.deepEqual(new Set(entries.map((e) => e.record.id)), new Set(items.map((i) => i.id)), "every proposed plural question, once");
  for (const e of entries) {
    assert.equal(e.record.kind, "question");
    assert.match((e.record as { evidence_status: string }).evidence_status, /^provisional/, e.record.id);
  }
  // the committed package is current, and both reviewers' files are blank (no decision recorded or simulated)
  const fresh = exportRoundPlurals(join(REPO, "tools", "english", "out", "k11-round-plurals"));
  for (const [f, t] of fresh) assert.equal(readFileSync(join(PLURALS_ROUND_DIR, f), "utf8"), t, `${f} is stale: run node tools/english/educator/round-plurals.ts export`);
  for (const slot of ["A", "B"]) {
    const rows = readFileSync(join(PLURALS_ROUND_DIR, `reviewer-${slot}`, "decisions.csv"), "utf8").trim().split(/\r?\n/).slice(1);
    assert.equal(rows.length, 30);
    assert.ok(rows.every((r) => r.endsWith(",,,,,,")), `reviewer ${slot}: blank`);
  }
  assert.ok(items.every((i) => i.evidence_status === "provisional" && !("released_at" in i)), "nothing approved or released");
  // the review notes cover every question
  const notes = readFileSync(join(PLURALS_ROUND_DIR, "REVIEW_NOTES.md"), "utf8");
  for (const i of items) assert.ok(notes.includes(`\`${i.id}\``), `${i.id} has a review note`);
});
