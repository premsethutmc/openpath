/**
 * Pilot readiness (W2): content validation for generated spelling items. A person approves a rule from a
 * sample, or a reviewed set; problems become exceptions; deterministic checks flag items for a look.
 * Approval only lets items be offered as practice: it never marks them checked, so the composite and
 * every decision are exactly the same with or without it (the updater is unchanged).
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import {
  type EvidenceEvent,
  type GeneratedReview,
  type Item,
  Ledger,
  MIN_SAMPLE,
  automaticFlags,
  emptyReview,
  indexContent,
  problemRateBound,
  reviewProblems,
  reviewStatus,
  ruleDecision,
  ruleId,
  sampleRule,
} from "../src/index.ts";
import { CONTENT, loadBundle, loadContext, viewFor } from "../../../tools/english/load.ts";
import { parseCsv, recordSheet, toCsv } from "../../../tools/english/spelling/review.ts";
import { GENERATOR } from "../../../tools/english/spelling/generate.ts";

type Code = Extract<Item, { kind: "code" }>;
const generated = JSON.parse(readFileSync(join(CONTENT, "spelling", "generated-items.json"), "utf8")) as Code[];
const retired = JSON.parse(readFileSync(join(CONTENT, "spelling", "retired-generated.json"), "utf8")) as Item[];
const committed = JSON.parse(readFileSync(join(CONTENT, "spelling", "review", "review.json"), "utf8")) as GeneratedReview;
const byTemplate = (t: string) => generated.filter((g) => g.generated!.template === t);
const today = "2026-10-13";

function approvedRule(template: string, problems: string[] = []): GeneratedReview {
  const r = emptyReview();
  const sample = sampleRule(generated, GENERATOR, template, 30, "t1");
  r.rules.push({
    id: `rule:${ruleId(GENERATOR, template)}:t1`,
    generator: GENERATOR,
    template,
    decision: "approved",
    by: "Tester",
    date: today,
    sample: { seed: "t1", size: sample.length, population: byTemplate(template).length, items: sample.map((i) => ({ id: i.id, version: i.version })), problems: problems.map((id) => ({ id, note: "wrong" })) },
  });
  for (const id of problems) r.exceptions.push({ item: id, action: "exclude", reason: "wrong", by: "Tester", date: today });
  return r;
}

test("the committed review record is consistent with the content", () => {
  assert.deepEqual(reviewProblems(committed, generated, retired), []);
});

test("automatic checks flag giveaways, broken options and source punctuation, and pass sound items", () => {
  const add = byTemplate("add_ending")[0];
  const choose = byTemplate("choose_spelling")[0];
  const clue = byTemplate("meaning_first_letter").find((g) => !automaticFlags(g).length)!;
  for (const ok of [add, choose, clue]) assert.deepEqual(automaticFlags(ok), [], ok.id);
  assert.ok(automaticFlags({ ...add, prompt: `Write ${add.answers![0]} again.` }).includes("the prompt contains the answer"));
  assert.ok(automaticFlags({ ...choose, options: [choose.options![0], choose.options![0]] }).includes("two options are the same"));
  assert.ok(automaticFlags({ ...choose, answer: 5 }).includes("the answer is not one of the options"));
  assert.ok(automaticFlags({ ...clue, prompt: clue.prompt + " (see; also)" }).some((f) => f.includes("punctuation")));
  assert.ok(automaticFlags({ ...clue, explain: undefined }).includes("no explanation for feedback"));
  const vitally = generated.find((g) => g.id === "gen.mor.meaning_first_letter.vitally");
  if (vitally) assert.ok(automaticFlags(vitally).some((f) => f.includes("stem")), "a clue built from the word's own stem is flagged");
  // hand-written items are never flagged
  assert.deepEqual(automaticFlags(loadContext().content.items.get("spl.infl.07")!), []);
});

test("review status: exclusions win, then flags (unless allowed), then a reviewed set, then a rule", () => {
  const sample = sampleRule(generated, GENERATOR, "add_ending", 30, "t1");
  const bad = sample[0];
  const r = approvedRule("add_ending", [bad.id]);
  const flagged = generated.find((g) => automaticFlags(g).length)!;
  const st = reviewStatus(generated, r);
  assert.equal(st.get(bad.id)!.status, "excluded");
  assert.equal(st.get(sample[1].id)!.status, "approved");
  assert.equal(st.get(sample[1].id)!.by, r.rules[0].id);
  const unsampled = byTemplate("add_ending").find((g) => !sample.some((x) => x.id === g.id) && !automaticFlags(g).length)!;
  assert.equal(st.get(unsampled.id)!.status, "approved", "a rule approval covers items that were not in the sample");
  assert.equal(st.get(byTemplate("hear_spell")[0].id)!.status, "unreviewed");
  assert.equal(st.get(flagged.id)!.status, "flagged");
  // an "allow" exception clears a flag; a set approval then covers it
  r.exceptions.push({ item: flagged.id, action: "allow", reason: "fine", by: "Tester", date: today });
  r.sets.push({ id: "set:x", name: "x", decision: "approved", by: "Tester", date: today, items: [{ id: flagged.id, version: flagged.version }], problems: [] });
  assert.equal(reviewStatus(generated, r).get(flagged.id)!.status, "approved");
  // a set approval covers only the version reviewed
  assert.equal(reviewStatus([{ ...flagged, version: flagged.version + 1 }], r).get(flagged.id)!.status, "unreviewed");
  // a word exclusion removes every item for that word
  r.exceptions.push({ word: unsampled.generated!.word, action: "exclude", reason: "unsuitable word", by: "Tester", date: today });
  for (const g of generated.filter((x) => x.generated!.word === unsampled.generated!.word)) assert.equal(reviewStatus(generated, r).get(g.id)!.status, "excluded", g.id);
});

test("a rule approval lapses when the generator changes", () => {
  const r = approvedRule("add_ending");
  const item = byTemplate("add_ending").find((g) => !automaticFlags(g).length)!;
  const changed = { ...item, generated: { ...item.generated!, generator: "spelling-templates@2" } };
  assert.equal(reviewStatus([changed], r).get(item.id)!.status, "unreviewed");
});

test("approval never marks an item checked and never changes an estimate: the ledger is identical", () => {
  const base = loadContext();
  const content = indexContent(viewFor({ ...loadBundle(), items: [...loadBundle().items, ...generated] }, base.index), base.index);
  const ctx = { ...base, content };
  const r = approvedRule("add_ending");
  const approved = byTemplate("add_ending").filter((g) => reviewStatus(generated, r).get(g.id)!.status === "approved").slice(0, 12);
  assert.ok(approved.length >= 10);
  for (const g of approved) assert.equal(g.generated!.checked, undefined, `${g.id} is still unchecked`);
  const events: EvidenceEvent[] = approved.map((g, k) => ({ kind: "evidence", id: `e${k}`, at: `2026-10-13T10:${String(k).padStart(2, "0")}:00.000Z`, session: "s1", item: { id: g.id, version: g.version }, response: { kind: "typed", text: k % 3 ? g.answers![0] : "wrong" }, use: "practice" }));
  const l = Ledger.rebuild(ctx, "x", events);
  const fresh = new Ledger(ctx, "x");
  assert.deepEqual(l.composite.nodes, fresh.composite.nodes, "no estimate moved (only the ledger position advances)");
  assert.ok(l.decisions.every((d) => d.verdict === "held"));
});

test("a rule needs a large enough sample with few problems; problem items must be excluded", () => {
  assert.equal(ruleDecision(600, MIN_SAMPLE - 1, 0).decision, "not_approved");
  assert.equal(ruleDecision(10, 10, 0).decision, "approved", "a small rule can be reviewed whole");
  assert.equal(ruleDecision(600, 30, 1).decision, "approved");
  assert.equal(ruleDecision(600, 30, 2).decision, "not_approved");
  assert.equal(problemRateBound(30, 0), 0.1);
  const r = approvedRule("add_ending", []);
  r.rules[0].sample.problems.push({ id: r.rules[0].sample.items[0].id, note: "x" });
  assert.ok(reviewProblems(r, generated, retired).some((p) => p.includes("no exclude exception")));
  const tooMany = approvedRule("add_ending", r.rules[0].sample.items.slice(0, 3).map((x) => x.id));
  assert.ok(reviewProblems(tooMany, generated, retired).some((p) => p.includes("recorded as approved")));
  const changedStatement = { ...emptyReview(), statement: "Approval makes items count." };
  assert.ok(reviewProblems(changedStatement, generated, retired).some((p) => p.includes("statement")));
});

test("samples are deterministic, spread across patterns, and skip flagged items", () => {
  const a = sampleRule(generated, GENERATOR, "add_ending", 30, "s1");
  const b = sampleRule(generated, GENERATOR, "add_ending", 30, "s1");
  const c = sampleRule(generated, GENERATOR, "add_ending", 30, "s2");
  assert.deepEqual(a.map((x) => x.id), b.map((x) => x.id));
  assert.notDeepEqual(a.map((x) => x.id), c.map((x) => x.id));
  const steps = new Set(byTemplate("add_ending").map((g) => `${g.target}#${g.step}`));
  assert.equal(new Set(a.map((g) => `${g.target}#${g.step}`)).size, Math.min(steps.size, 30), "every pattern is represented");
  const clue = sampleRule(generated, GENERATOR, "meaning_first_letter", 400, "s1");
  assert.ok(clue.every((g) => !automaticFlags(g).length));
  // words already excluded are not sampled again
  const r = emptyReview();
  const word = a[0].generated!.word;
  r.exceptions.push({ word, action: "exclude", reason: "x", by: "T", date: today });
  assert.ok(!sampleRule(generated, GENERATOR, "add_ending", 30, "s1", r).some((g) => g.generated!.word === word));
});

test("recording a filled sheet: approvals, exceptions, version checks and notes", () => {
  const sample = sampleRule(generated, GENERATOR, "add_ending", 30, "s9");
  const meta = { kind: "rule" as const, id: `rule:${ruleId(GENERATOR, "add_ending")}:s9`, generator: GENERATOR, template: "add_ending", seed: "s9", population: 655, wordbank: "x", created: today, instructions: "" };
  const rows = sample.map((g, k) => ({ id: g.id, version: String(g.version), verdict: k === 0 ? "problem" : "ok", note: k === 0 ? "the base word is unusual" : "" }));
  const csv = parseCsv(toCsv(rows, ["id", "version", "verdict", "note"]));
  const kept = { path: "content/english/spelling/review/sheets/x.csv", sha256: "0".repeat(64) };
  const { review, summary } = recordSheet(emptyReview(), generated, meta, csv, "Prem", today, kept);
  assert.equal(review.rules[0].decision, "approved");
  assert.match(summary, /approved/);
  assert.deepEqual(review.exceptions.map((e) => [e.item, e.action]), [[sample[0].id, "exclude"]]);
  assert.deepEqual(reviewProblems(review, generated, retired), []);
  assert.throws(() => recordSheet(emptyReview(), generated, meta, csv.map((r) => ({ ...r, verdict: "" })), "Prem", today, kept), /verdict must be/);
  assert.throws(() => recordSheet(emptyReview(), generated, meta, csv.map((r, k) => (k === 0 ? { ...r, note: "" } : r)), "Prem", today, kept), /write a note/);
  assert.throws(() => recordSheet(emptyReview(), generated, meta, csv.map((r) => ({ ...r, version: "99" })), "Prem", today, kept), /make a new sheet/);
  assert.throws(() => recordSheet(emptyReview(), generated, meta, csv, " ", today, kept), /who reviewed/);
  // two problems in 30 is too many: recorded, but not approved, and both items are excluded
  const two = csv.map((r, k) => (k < 2 ? { ...r, verdict: "problem", note: "wrong" } : r));
  const no = recordSheet(emptyReview(), generated, meta, two, "Prem", today, kept).review;
  assert.equal(no.rules[0].decision, "not_approved");
  assert.equal(reviewStatus(generated, no).get(sample[5].id)!.status, "unreviewed");
});

test("CSV round trip keeps commas, quotes and line breaks", () => {
  const rows = [{ a: 'say "hi", then', b: "two\nlines" }];
  assert.deepEqual(parseCsv(toCsv(rows, ["a", "b"])), rows);
});
