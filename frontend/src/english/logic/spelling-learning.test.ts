import assert from "node:assert/strict";
import { test } from "node:test";
import { Learner } from "./learner.ts";
import { loadContent } from "./content.ts";
import { MemoryRepo } from "./store.ts";
import { learningView } from "./spelling-learning.ts";
import { BANK, levelOf } from "./spelling.ts";
import { eventProblem } from "./events.ts";
import { scrubEvents } from "./scrub.ts";
const content = loadContent({ mode: "development" });
async function setup() {
  const repo = new MemoryRepo();
  let now = "2026-10-19T09:00:00Z";
  const clock = () => now;
  const l = await Learner.create(
    content,
    repo,
    "Synthetic Bee",
    "guardian",
    clock,
  );
  return {
    l,
    repo,
    clock,
    day: (d: number) => {
      now = new Date(
        Date.parse("2026-10-19T09:00:00Z") + d * 86400000,
      ).toISOString();
    },
  };
}
test("learning study/hide/draft resume in existing identity and event store; no native engine evidence", async () => {
  const { l, repo, clock } = await setup();
  const before = JSON.stringify(l.state.ledger.composite);
  await l.startSpelling(BANK, "device_voice", true);
  assert.equal(l.spelling().open!.event.words.length, 5);
  assert.equal(learningView(l)!.phase, "prepare");
  await l.learnSpelling("study");
  await l.learnSpelling("recall");
  await l.learnSpelling("draft", "fr");
  const resumed = await Learner.open(content, repo, l.profileId, clock);
  assert.equal(learningView(resumed)!.phase, "recall");
  assert.equal(learningView(resumed)!.draft, "fr");
  assert.equal(learningView(resumed)!.assisted, true);
  assert.equal(JSON.stringify(resumed.state.ledger.composite), before);
  assert.ok(l.events.every((e) => eventProblem(e) === null));
});
test("all freshly studied correct answers remain assisted, due next session, and cannot raise the practice level", async () => {
  const { l } = await setup();
  await l.startSpelling(BANK, "device_voice", true);
  while (l.spellingSession()?.word) {
    await l.learnSpelling("study");
    await l.learnSpelling("recall");
    await l.answerSpelling(l.spellingSession()!.word!.word, 1);
  }
  const answers = l.events.filter((e) => e.kind === "spell_answer");
  assert.equal(answers.length, 5);
  assert.ok(answers.every((e) => e.kind === "spell_answer" && e.assisted));
  assert.equal(levelOf(l.spelling(), BANK), 1);
  assert.ok(
    [...l.spelling().words.values()].every((w) => w.box === 0 && !w.reviewed),
  );
  assert.equal(l.state.ledger.events.length, 0);
});
test("hints remain assisted after reload; later hidden-spelling recall advances existing review schedule", async () => {
  const { l, repo, clock, day } = await setup();
  await l.startSpelling(BANK, "device_voice", true);
  const id = l.spellingSession()!.word!.id;
  await l.learnSpelling("study");
  await l.learnSpelling("recall");
  await l.answerSpelling(l.spellingSession()!.word!.word, 1);
  await l.stopSpelling();
  day(1);
  await l.startSpelling(BANK, "device_voice", true);
  assert.equal(l.spellingSession()!.word!.id, id);
  assert.equal(learningView(l)!.phase, "recall");
  assert.equal(learningView(l)!.assisted, false);
  await l.learnSpelling("hint");
  const resumed = await Learner.open(content, repo, l.profileId, clock);
  assert.equal(learningView(resumed)!.phase, "study");
  assert.equal(learningView(resumed)!.assisted, true);
  await resumed.learnSpelling("recall");
  await resumed.answerSpelling(resumed.spellingSession()!.word!.word, 1);
  assert.equal(resumed.spelling().words.get(`bank:spelling-bee/${id}`)!.box, 0);
  await resumed.stopSpelling();
  day(2);
  await resumed.startSpelling(BANK, "device_voice", true);
  await resumed.answerSpelling(resumed.spellingSession()!.word!.word, 1);
  const record = resumed.spelling().words.get(`bank:spelling-bee/${id}`)!;
  assert.equal(record.box, 1);
  assert.equal(Date.parse(record.due!), Date.parse(clock()) + 86400000);
});
test("ordinary Bee remains ten-word legacy mode; unknown learning metadata fails closed", async () => {
  const { l } = await setup();
  await l.startSpelling();
  assert.equal(l.spelling().open!.event.words.length, 10);
  assert.equal(l.spelling().open!.event.learningMode, undefined);
  await assert.rejects(() => l.learnSpelling("study"));
  const base = { id: "x", at: l.clock(), session: "x", source: BANK };
  assert.match(
    eventProblem({
      ...base,
      kind: "spell_learning",
      word: "x",
      action: "invented",
    })!,
    /invalid/,
  );
  assert.match(
    eventProblem({
      ...base,
      kind: "spell_answer",
      word: { id: "x" },
      correct: true,
      response: "x",
      assisted: "false",
    })!,
    /assistance/,
  );
});
test("deleting a parent list scrubs study IDs and drafts without deleting evidence metadata", async () => {
  const { l } = await setup();
  await l.saveWordList("Week one", [
    { id: "castle", word: "castle", variants: [] },
  ]);
  const source = { type: "list" as const, id: l.wordLists()[0].id };
  await l.startSpelling(source, "device_voice", true);
  await l.learnSpelling("study");
  await l.learnSpelling("draft", "casle");
  const ids = l.events.map((e) => e.id);
  const result = scrubEvents(l.events, source);
  assert.deepEqual(
    result.events.map((e) => e.id),
    ids,
  );
  for (const e of result.events.filter((e) => e.kind === "spell_learning")) {
    assert.equal(e.kind === "spell_learning" && e.response, "");
    assert.match(e.kind === "spell_learning" ? e.word : "", /^removed-/);
  }
  assert.equal(scrubEvents(result.events, source).changed, 0);
});
test("a failed instructional save does not reveal a learned phase or claim assistance", async () => {
  const { l, repo } = await setup();
  await l.startSpelling(BANK, "device_voice", true);
  const before = l.events.length;
  const append = repo.append.bind(repo);
  repo.append = async () => {
    throw new Error("synthetic disk unavailable");
  };
  await assert.rejects(l.learnSpelling("study"), /disk unavailable/);
  assert.equal(l.events.length, before);
  assert.equal(learningView(l)!.phase, "prepare");
  assert.equal(learningView(l)!.assisted, false);
  repo.append = append;
  await l.learnSpelling("study");
  assert.equal(learningView(l)!.phase, "study");
});
