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
  criticalRateBound,
  reviewProblems,
  reviewStatus,
  ruleDecision,
  ruleId,
  sampleRule,
} from "../src/index.ts";
import { CONTENT, loadBundle, loadContext, viewFor } from "../../../tools/english/load.ts";
import { loadPilotSet, parseCsv, pilotItems, pilotSetProblems, recordSheet, toCsv } from "../../../tools/english/spelling/review.ts";
import { GENERATOR } from "../../../tools/english/spelling/generate.ts";

type Code = Extract<Item, { kind: "code" }>;
const generated = JSON.parse(readFileSync(join(CONTENT, "spelling", "generated-items.json"), "utf8")) as Code[];
const retired = JSON.parse(readFileSync(join(CONTENT, "spelling", "retired-generated.json"), "utf8")) as Item[];
const committed = JSON.parse(readFileSync(join(CONTENT, "spelling", "review", "review.json"), "utf8")) as GeneratedReview;
const byTemplate = (t: string) => generated.filter((g) => g.generated!.template === t);
const today = "2026-10-13";

function approvedRule(template: string, minorExcluded: string[] = []): GeneratedReview {
  const r = emptyReview();
  const sample = sampleRule(generated, GENERATOR, template, 30, "t1");
  r.rules.push({
    id: `rule:${ruleId(GENERATOR, template)}:t1`,
    generator: GENERATOR,
    template,
    decision: "approved",
    by: "Tester",
    date: today,
    sample: { seed: "t1", size: sample.length, population: byTemplate(template).length, items: sample.map((i) => ({ id: i.id, version: i.version })), critical: [], minor: minorExcluded.map((id) => ({ id, note: "awkward wording", action: "exclude" as const })) },
  });
  for (const id of minorExcluded) r.exceptions.push({ item: id, action: "exclude", reason: "awkward wording", by: "Tester", date: today });
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
  r.sets.push({ id: "set:x", name: "x", decision: "approved", by: "Tester", date: today, items: [{ id: flagged.id, version: flagged.version }], critical: [], minor: [] });
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

test("a rule is approved only with no critical error in a large enough sample; every error is handled explicitly", () => {
  assert.equal(ruleDecision(600, MIN_SAMPLE - 1, 0).decision, "not_approved");
  assert.equal(ruleDecision(10, 10, 0).decision, "approved", "a small rule can be reviewed whole");
  assert.equal(ruleDecision(600, 30, 0, 4).decision, "approved", "minor errors never block");
  assert.equal(ruleDecision(600, 30, 1).decision, "not_approved", "one critical error blocks");
  assert.equal(criticalRateBound(30), 0.1);
  const r = approvedRule("add_ending");
  const first = r.rules[0].sample.items[0].id;
  // an approved rule with a critical error in its sample is refused, and the item must be excluded
  r.rules[0].sample.critical.push({ id: first, category: "wrong_answer", note: "x" });
  const p = reviewProblems(r, generated, retired);
  assert.ok(p.some((x) => x.includes("recorded as approved")));
  assert.ok(p.some((x) => x.includes("critical error on") && x.includes("no exclude exception")));
  // categories are fixed
  const bad = approvedRule("add_ending");
  bad.rules[0].decision = "not_approved";
  bad.rules[0].sample.critical.push({ id: first, category: "typo" as never, note: "x" });
  bad.exceptions.push({ item: first, action: "exclude", reason: "x", by: "T", date: today });
  assert.ok(reviewProblems(bad, generated, retired).some((x) => x.includes("unknown critical category")));
  // a minor error is kept (recorded) or excluded (with an exception)
  const minor = approvedRule("add_ending");
  minor.rules[0].sample.minor.push({ id: first, note: "a bit stiff", action: "keep" });
  assert.deepEqual(reviewProblems(minor, generated, retired), []);
  minor.rules[0].sample.minor.push({ id: r.rules[0].sample.items[1].id, note: "odd word", action: "exclude" });
  assert.ok(reviewProblems(minor, generated, retired).some((x) => x.includes("marked exclude but has no exclude exception")));
  const changedStatement = { ...emptyReview(), statement: "Approval makes items count." };
  assert.ok(reviewProblems(changedStatement, generated, retired).some((x) => x.includes("statement")));
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

test("recording a filled sheet: critical blocks, minor is kept or excluded, versions and notes are checked", () => {
  const sample = sampleRule(generated, GENERATOR, "add_ending", 30, "s9");
  const meta = { kind: "rule" as const, id: `rule:${ruleId(GENERATOR, "add_ending")}:s9`, generator: GENERATOR, template: "add_ending", seed: "s9", population: 655, wordbank: "x", created: today, instructions: "" };
  const cols = ["id", "version", "verdict", "category", "note"];
  const sheetOf = (f: (k: number) => Partial<Record<string, string>>) => parseCsv(toCsv(sample.map((g, k) => ({ id: g.id, version: String(g.version), verdict: "ok", category: "", note: "", ...f(k) })), cols));
  const kept = { path: "content/english/spelling/review/sheets/x.csv", sha256: "0".repeat(64) };
  // minor errors: approved; one kept with a note, one excluded
  const minor = sheetOf((k) => (k === 0 ? { verdict: "minor-keep", note: "stiff wording" } : k === 1 ? { verdict: "minor-exclude", note: "unusual word" } : {}));
  const ok = recordSheet(emptyReview(), generated, meta, minor, "Prem", today, kept);
  assert.equal(ok.review.rules[0].decision, "approved");
  assert.match(ok.summary, /does not prove every item is right/);
  assert.deepEqual(ok.review.exceptions.map((e) => [e.item, e.action]), [[sample[1].id, "exclude"]]);
  assert.equal(reviewStatus(generated, ok.review).get(sample[0].id)!.status, "approved", "a minor-keep item stays");
  assert.equal(reviewStatus(generated, ok.review).get(sample[1].id)!.status, "excluded");
  assert.deepEqual(reviewProblems(ok.review, generated, retired), []);
  // one critical error: recorded, the rule is not approved, and the item is excluded
  const crit = recordSheet(emptyReview(), generated, meta, sheetOf((k) => (k === 3 ? { verdict: "critical", category: "misleading_explanation", note: "the rule given is wrong" } : {})), "Prem", today, kept).review;
  assert.equal(crit.rules[0].decision, "not_approved");
  assert.equal(crit.rules[0].sample.critical[0].category, "misleading_explanation");
  assert.equal(reviewStatus(generated, crit).get(sample[3].id)!.status, "excluded");
  assert.equal(reviewStatus(generated, crit).get(sample[5].id)!.status, "unreviewed");
  // what is refused
  assert.throws(() => recordSheet(emptyReview(), generated, meta, sheetOf(() => ({ verdict: "" })), "Prem", today, kept), /verdict must be/);
  assert.throws(() => recordSheet(emptyReview(), generated, meta, sheetOf(() => ({ verdict: "problem", note: "x" })), "Prem", today, kept), /verdict must be/, "the old two-way verdict is no longer accepted");
  assert.throws(() => recordSheet(emptyReview(), generated, meta, sheetOf((k) => (k === 0 ? { verdict: "critical", note: "x" } : {})), "Prem", today, kept), /needs a category/);
  assert.throws(() => recordSheet(emptyReview(), generated, meta, sheetOf((k) => (k === 0 ? { verdict: "minor-keep" } : {})), "Prem", today, kept), /write a note/);
  assert.throws(() => recordSheet(emptyReview(), generated, meta, sheetOf(() => ({ version: "99" })), "Prem", today, kept), /make a new sheet/);
  assert.throws(() => recordSheet(emptyReview(), generated, meta, sheetOf(() => ({})), " ", today, kept), /who reviewed/);
});

test("the pilot set: four suffix patterns, typed exercises only, consistent with the content; its per-word sheet approves only what was reviewed", () => {
  const set = loadPilotSet();
  assert.deepEqual(set.templates, ["add_ending", "hear_spell"], "typed answers only: no recognition exercises");
  assert.deepEqual(pilotSetProblems(set, generated, committed), []);
  assert.deepEqual(set.items, pilotItems(set, generated));
  assert.equal(set.items.length, 2 * Object.values(set.patterns).flat().length);
  for (const r of set.items) assert.equal(reviewStatus(generated, committed).get(r.id)!.status, "unreviewed", "nothing in the pilot set is approved without a review");
  // a simulated review (in this test only): one critical, one minor-exclude, the rest ok
  const words = Object.values(set.patterns).flat();
  const byId = new Map(generated.map((g) => [g.id, g]));
  const rows = words.map((w, k) => ({
    word: w,
    items: set.items.filter((r) => byId.get(r.id)!.generated!.word === w).map((r) => `${r.id}@${r.version}`).join("; "),
    verdict: k === 0 ? "critical" : k === 1 ? "minor-exclude" : "ok",
    category: k === 0 ? "ambiguous_answer" : "",
    note: k < 2 ? "x" : "",
  }));
  const meta = { kind: "words" as const, id: "set:pilot-1", name: "pilot-1", wordbank: "x", created: today, instructions: "" };
  const { review } = recordSheet(committed, generated, meta, parseCsv(toCsv(rows, ["word", "items", "verdict", "category", "note"])), "Prem", today, { path: "x", sha256: "0".repeat(64) });
  const st = reviewStatus(generated, review);
  const approved = set.items.filter((r) => st.get(r.id)!.status === "approved");
  assert.equal(approved.length, set.items.length - 4, "both exercises of the two problem words are left out");
  assert.equal(review.sets[0].critical.length, 2);
  assert.deepEqual(reviewProblems(review, generated, retired), []);
});

test("CSV round trip keeps commas, quotes and line breaks", () => {
  const rows = [{ a: 'say "hi", then', b: "two\nlines" }];
  assert.deepEqual(parseCsv(toCsv(rows, ["a", "b"])), rows);
});
