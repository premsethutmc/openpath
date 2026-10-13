/**
 * Pilot readiness: word mastery (kept apart from patterns and the composite), confirmation checks for
 * words answered right, the pilot content mode (approved practice words only), and the trial summary
 * and usability record.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { type GeneratedReview, type Response, automaticFlags, emptyReview, sampleRule } from "../../../../packages/english-core/src/index.ts";
import { parseBackup } from "./backup.ts";
import { type Code, loadContent } from "./content.ts";
import type { AppEvent, AttemptEvent } from "./events.ts";
import { Learner } from "./learner.ts";
import { rightAnswer, wrongAnswer } from "./test-helpers.ts";
import { spellingPracticeQueue } from "./select.ts";
import { fold } from "./state.ts";
import { MemoryRepo } from "./store.ts";
import { CONFIRM_AFTER_DAYS, wordMastery } from "./words.ts";
import { report } from "../../../../tools/english/pilot/report.ts";

const content = loadContent({ mode: "development" });
const DAY = 86_400_000;
const HOUR = 3_600_000;

/** Items for one word, by template. */
function itemsFor(word: string): Record<string, Code> {
  return Object.fromEntries(content.generatedAll.filter((g) => g.generated!.word === word).map((g) => [g.generated!.template, g]));
}
const WORD = (() => {
  const counts = new Map<string, Set<string>>();
  for (const g of content.generated) counts.set(g.generated!.word, (counts.get(g.generated!.word) ?? new Set()).add(g.generated!.template));
  return [...counts].find(([, t]) => t.has("add_ending") && t.has("hear_spell") && t.has("choose_spelling"))![0];
})();

/** A record built directly from attempts, so each rule of word mastery can be checked exactly. */
function record(steps: { at: number; template: string; correct: boolean; assisted?: boolean }[]): AppEvent[] {
  const items = itemsFor(WORD);
  const t0 = Date.parse("2026-10-13T09:00:00.000Z");
  const events: AppEvent[] = [
    { kind: "profile", id: "p", at: new Date(t0).toISOString(), name: "Asha", consent: { by: "guardian", scope: "this_device_only" }, app: "test" },
    { kind: "session", id: "s", at: new Date(t0).toISOString(), session: "s1", type: "spelling_practice" },
  ];
  steps.forEach((st, k) => {
    const item = items[st.template];
    const response: Response = st.correct ? rightAnswer(item) : wrongAnswer(item);
    const a: AttemptEvent = { kind: "attempt", id: `a${k}`, at: new Date(t0 + st.at).toISOString(), session: "s1", item: { id: item.id, version: item.version }, response, correct: st.correct, misconceptions: [], assisted: !!st.assisted, attempt: 1, use: "practice" };
    events.push(a);
  });
  return events;
}
const mastery = (steps: Parameters<typeof record>[0]) => wordMastery(fold(content, record(steps)), content).get(WORD)!;

test("word mastery: recognition alone is 'met'; only an unaided written answer counts as recall", () => {
  assert.equal(mastery([{ at: 0, template: "choose_spelling", correct: true }]).status, "met");
  const helped = mastery([
    { at: 0, template: "add_ending", correct: false },
    { at: 60_000, template: "add_ending", correct: true, assisted: true },
  ]);
  assert.equal(helped.status, "learning", "a right answer after a wrong first try is assisted, not recall");
  assert.equal(helped.assisted, 1);
  assert.equal(helped.independent.recall.right, 0);
  assert.equal(helped.mistakes, 1);
  const recalled = mastery([{ at: 0, template: "add_ending", correct: true }]);
  assert.equal(recalled.status, "recalled");
  assert.equal(recalled.independent.recall.right, 1);
});

test("word mastery: delayed retention needs a day's gap; mastered needs two later-day passes a week apart; a mistake resets it", () => {
  const sameDay = mastery([
    { at: 0, template: "add_ending", correct: true },
    { at: 2 * HOUR, template: "hear_spell", correct: true },
  ]);
  assert.equal(sameDay.status, "recalled", "two hours later is not a delayed check");
  assert.equal(sameDay.retention.passed, 0);
  const retained = mastery([
    { at: 0, template: "add_ending", correct: true },
    { at: DAY, template: "hear_spell", correct: true },
  ]);
  assert.equal(retained.status, "retained");
  assert.equal(retained.retention.passed, 1);
  const mastered = mastery([
    { at: 0, template: "add_ending", correct: true },
    { at: DAY, template: "hear_spell", correct: true },
    { at: 9 * DAY, template: "add_ending", correct: true },
  ]);
  assert.equal(mastered.status, "mastered");
  const tooClose = mastery([
    { at: 0, template: "add_ending", correct: true },
    { at: DAY, template: "hear_spell", correct: true },
    { at: 3 * DAY, template: "add_ending", correct: true },
  ]);
  assert.equal(tooClose.status, "retained", "two passes two days apart are not yet a week");
  const lapsed = mastery([
    { at: 0, template: "add_ending", correct: true },
    { at: DAY, template: "hear_spell", correct: true },
    { at: 9 * DAY, template: "add_ending", correct: false },
  ]);
  assert.equal(lapsed.status, "learning");
  assert.equal(lapsed.retention.failed, 1);
  assert.deepEqual(lapsed.retainedSince, []);
  const relearned = mastery([
    { at: 0, template: "add_ending", correct: false },
    { at: DAY, template: "add_ending", correct: true },
  ]);
  assert.equal(relearned.status, "retained", "written correctly a day after a mistake");
  const helpedLater = mastery([
    { at: 0, template: "add_ending", correct: true },
    { at: DAY, template: "hear_spell", correct: true, assisted: true },
  ]);
  assert.equal(helpedLater.status, "recalled", "help never counts as retention");
  assert.equal(helpedLater.retention.passed, 0);
  const recognitionLater = mastery([
    { at: 0, template: "add_ending", correct: true },
    { at: DAY, template: "choose_spelling", correct: true },
  ]);
  assert.equal(recognitionLater.status, "recalled", "choosing a spelling later is not delayed recall");
});

/** A clock the test moves forward: one minute per reading, plus whole days on request. */
function testClock(start = "2026-10-13T09:00:00.000Z") {
  let t = Date.parse(start);
  const clock = () => ((t += 60_000), new Date(t).toISOString());
  clock.days = (n: number) => void (t += n * DAY);
  return clock;
}

async function runSession(l: Learner, policy: (i: number) => boolean): Promise<Code[]> {
  const asked: Code[] = [];
  for (let guard = 0; guard < 60; guard++) {
    const cur = await l.current();
    if (cur.lesson) {
      await l.finishLesson(cur.lesson.id, true);
      continue;
    }
    if (!cur.next) return asked;
    await l.answer(cur.next.item, policy(asked.length) ? rightAnswer(cur.next.item) : wrongAnswer(cur.next.item), { use: cur.next.use });
    asked.push(cur.next.item as Code);
  }
  throw new Error("session did not end");
}

test("words spelt right are checked again after a few days, so retention is measured for them too; word mastery never moves an estimate", async () => {
  const clock = testClock();
  const repo = new MemoryRepo();
  const l = await Learner.create(content, repo, "Asha", "guardian", clock, "p-pilot");
  await l.start({ type: "placement" });
  await runSession(l, () => true);
  await l.start({ type: "spelling_check" });
  const asked = await runSession(l, () => true);
  const recalled = [...wordMastery(l.state, content).values()].filter((w) => w.status === "recalled");
  assert.ok(recalled.length >= 1, "words written correctly in the check");
  assert.ok(!l.plan().some((p) => p.type === "spelling_review"), "nothing to review on the same day");
  clock.days(CONFIRM_AFTER_DAYS);
  const review = l.plan().find((p) => p.type === "spelling_review");
  assert.ok(review, "a review with words to confirm");
  assert.match(review!.reason, /spelt correctly a few days ago/);
  const composite = structuredClone(l.state.ledger.composite.nodes);
  await l.start(review!);
  const confirmed = await runSession(l, () => true);
  assert.ok(confirmed.length >= 1 && confirmed.length <= 3);
  for (const item of confirmed) {
    assert.ok(asked.some((a) => a.generated!.word === item.generated!.word), "only words met before");
    assert.equal(wordMastery(l.state, content).get(item.generated!.word)!.status, "retained");
  }
  assert.deepEqual(l.state.ledger.composite.nodes, composite, "generated practice and word mastery change no estimate");
  for (const d of l.state.ledger.decisions.filter((d) => d.observation && (content.ctx.content.items.get(d.observation.item) as Code).generated)) assert.equal(d.verdict, "held");
});

test("pilot content mode offers only approved practice words; flagged and excluded ones are never offered", () => {
  const pilotNone = loadContent({ mode: "pilot" });
  assert.equal(pilotNone.generated.length, 0, "nothing is approved in the committed record yet");
  assert.equal(pilotNone.generatedAll.length, content.generatedAll.length, "every item still rebuilds old answers");
  assert.ok(content.generated.length < content.generatedAll.length, "flagged items are left out of development builds too");
  for (const g of content.generated) assert.equal(automaticFlags(g).length, 0, g.id);

  const review: GeneratedReview = emptyReview();
  const gen = "spelling-templates@1";
  const sample = sampleRule(content.generatedAll, gen, "add_ending", 30, "p1");
  review.rules.push({ id: "rule:add_ending", generator: gen, template: "add_ending", decision: "approved", by: "Tester", date: "2026-10-13", sample: { seed: "p1", size: 30, population: 655, items: sample.map((i) => ({ id: i.id, version: i.version })), problems: [{ id: sample[0].id, note: "x" }] } });
  review.exceptions.push({ item: sample[0].id, action: "exclude", reason: "x", by: "Tester", date: "2026-10-13" });
  const pilot = loadContent({ mode: "pilot", review });
  assert.ok(pilot.generated.length > 500);
  assert.ok(pilot.generated.every((g) => g.generated!.template === "add_ending"));
  assert.ok(!pilot.generated.some((g) => g.id === sample[0].id), "an excluded item is not offered");
  // spelling practice in a pilot build only uses what is offered
  const s = fold(pilot, [{ kind: "profile", id: "p", at: "2026-10-13T09:00:00.000Z", name: "A", consent: { by: "guardian", scope: "this_device_only" }, app: "t" }]);
  const g = pilot.generated[0];
  const queue = spellingPracticeQueue(s, pilot, g.target, g.step!, true);
  const offered = new Set(pilot.generated.map((x) => x.id));
  for (const p of queue) assert.ok(offered.has(p.item) || pilot.handWritten.has(p.item), p.item);
});

test("trial record: ratings and notes are kept, exported and imported; the trial summary has no name and keeps the three spelling levels apart", async () => {
  const clock = testClock();
  const repo = new MemoryRepo();
  const l = await Learner.create(content, repo, "Asha Verma", "guardian", clock, "p-trial");
  await l.start({ type: "placement" });
  await runSession(l, () => true);
  await l.start({ type: "spelling_check" });
  await runSession(l, (i) => i % 2 === 0);
  const check = [...l.state.sessions.values()].find((x) => x.event.type === "spelling_check")!;
  await l.rate(check.event.session, "too_hard");
  await l.note("end:spelling_check", "The word was hard to hear.");
  await l.note("settings", "   ");
  assert.equal(l.events.filter((e) => e.kind === "note").length, 1, "an empty note is not saved");

  const b = l.backup();
  const parsed = parseBackup(JSON.stringify(b));
  assert.ok(parsed.ok, parsed.ok ? "" : parsed.error);
  const repo2 = new MemoryRepo();
  await repo2.replaceAll(b.profile.id, (parsed as { ok: true; backup: typeof b }).backup.events);
  const l2 = await Learner.open(content, repo2, b.profile.id, clock);
  assert.deepEqual(l2.pilotSummary({ speech: false }).usability, l.pilotSummary({ speech: false }).usability);

  const p = l.pilotSummary({ speech: false, width: 390 });
  const text = JSON.stringify(p);
  assert.ok(!text.includes("Asha") && !text.includes("Verma"), "no name in the summary");
  assert.ok(!text.includes("p-trial"), "no profile id either");
  assert.match(p.learner.code, /^[0-9a-f]{8}$/);
  assert.equal(p.learner.code, l2.pilotSummary({ speech: false }).learner.code, "the same learner gets the same code");
  assert.equal(p.content.mode, "development");
  assert.equal(p.usability.ratings.too_hard, 1);
  assert.deepEqual(p.usability.notes.map((n) => n.text), ["The word was hard to hear."]);
  assert.equal(p.sessions.find((x) => x.type === "spelling_check")!.rating, "too_hard");
  assert.equal(p.activity.sessions, 2);
  assert.ok(p.activity.median_seconds_per_question! > 0);
  // the three levels, apart
  const words = wordMastery(l.state, content);
  assert.equal(p.spelling.words.list.length, words.size);
  assert.equal(p.spelling.words.counts.learning, [...words.values()].filter((w) => w.status === "learning").length);
  assert.ok(p.spelling.words.list.some((w) => w.misspellings.length), "misspellings typed in spelling items are kept for analysis");
  assert.ok(p.spelling.patterns.length >= 1);
  assert.equal(p.spelling.proficiency.length, 3);
  assert.equal(p.grammar_and_vocabulary.length, 10);
  // the product owner's report reads the summaries back: learning and usability, still no name
  const md = report([p, { ...p, made_at: "2026-10-20T09:00:00.000Z" }] as never);
  assert.match(md, new RegExp(`## Learner ${p.learner.code}`));
  assert.match(md, /Words over time/);
  assert.match(md, /The word was hard to hear\./);
  assert.equal((md.match(/\| 2026-10-\d\d \|/g) ?? []).length, 2, "one row per summary");
  assert.ok(!md.includes("Asha"));
  assert.throws(() => report([{ format: "other" }] as never), /not an OpenPath trial summary/);
});

test("an import with an unknown rating is refused", async () => {
  const clock = testClock();
  const l = await Learner.create(content, new MemoryRepo(), "A", "guardian", clock, "p-bad");
  const b = l.backup();
  const events = [...b.events, { kind: "rating", id: "x1", at: b.exported_at, session: "s", rating: "amazing" } as unknown as AppEvent];
  const bad = { ...b, events, checksum: (await import("./backup.ts")).checksum(events) };
  const r = parseBackup(JSON.stringify(bad));
  assert.ok(!r.ok && /unknown rating/.test(r.error));
});

test("the committed review record is what the app reads", () => {
  const committed = JSON.parse(readFileSync(new URL("../../../../content/english/spelling/review/review.json", import.meta.url), "utf8")) as GeneratedReview;
  assert.deepEqual(loadContent({ mode: "pilot", review: committed }).generated.map((g) => g.id), loadContent({ mode: "pilot" }).generated.map((g) => g.id));
});
