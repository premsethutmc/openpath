/**
 * The English web app's learning journey, without a browser: persistence and resume, export and import,
 * placement, lessons, spelling practice, word review, transfer checks, the display rule, and that every
 * estimate comes from the existing engine (no separate scoring for spelling).
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { type Item, Ledger, type LedgerEvent, type Response, leafView } from "../../../../packages/english-core/src/index.ts";
import { parseBackup } from "./backup.ts";
import { GUIDED, GUIDED_ALL, loadContent, type Code } from "./content.ts";
import { isLedgerEvent } from "./events.ts";
import { Learner } from "./learner.ts";
import { capabilityProgress } from "./progress.ts";
import { PLACEMENT_MAX, PLACEMENT_MIN } from "./select.ts";
import { MemoryRepo } from "./store.ts";
import { REVIEW_DAYS, patternStatus } from "./state.ts";

const content = loadContent();
const DAY = 86_400_000;

/** A clock the test moves forward: one minute per reading, plus whole days on request. */
function testClock(start = "2026-10-13T09:00:00.000Z") {
  let t = Date.parse(start);
  const clock = () => {
    t += 60_000;
    return new Date(t).toISOString();
  };
  clock.days = (n: number) => {
    t += n * DAY;
  };
  return clock;
}

export function rightAnswer(item: Item): Response {
  if (item.kind !== "code") throw new Error("code items only");
  switch (item.format.split(":")[0]) {
    case "choice":
      return { kind: "choice", choice: item.answer! };
    case "typed":
      return { kind: "typed", text: item.answers![0] };
    case "order":
      return { kind: "order", order: item.answer_order! };
    case "match":
      return { kind: "match", pairs: item.answer_pairs! };
    case "multi":
      return { kind: "multi", choices: item.answer_set! };
  }
  throw new Error(item.format);
}

export function wrongAnswer(item: Item): Response {
  if (item.kind !== "code") throw new Error("code items only");
  switch (item.format.split(":")[0]) {
    case "choice":
      return { kind: "choice", choice: (item.answer! + 1) % item.options!.length };
    case "typed":
      return { kind: "typed", text: Object.keys(item.wrong ?? {})[0] ?? "zzzz" };
    case "order":
      return { kind: "order", order: [...item.answer_order!].reverse() };
    case "match":
      return { kind: "match", pairs: [...item.answer_pairs!].reverse() };
    case "multi":
      return { kind: "multi", choices: [0] };
  }
  throw new Error(item.format);
}

/** Run the open session to its end, answering with `policy` (true = right). Returns the items asked. */
async function runSession(l: Learner, policy: (item: Item, i: number) => boolean, opts: { lessonCheck?: boolean } = {}): Promise<Item[]> {
  const asked: Item[] = [];
  for (let guard = 0; guard < 60; guard++) {
    const cur = await l.current();
    if (cur.lesson) {
      await l.finishLesson(cur.lesson.id, opts.lessonCheck ?? true);
      continue;
    }
    if (!cur.next) return asked;
    const item = cur.next.item;
    await l.answer(item, policy(item, asked.length) ? rightAnswer(item) : wrongAnswer(item), { use: cur.next.use });
    asked.push(item);
  }
  throw new Error("session did not end");
}

async function newLearner(clock = testClock(), repo = new MemoryRepo()) {
  const l = await Learner.create(content, repo, "Asha", "guardian", clock, "p-test");
  return { l, repo, clock };
}

test("content: the engine's 56 capabilities, the hand-written bank, generated spelling items, and a lesson for every guided step", () => {
  const specified = content.index.leafIds.filter((id) => {
    const c = content.index.leaves.get(id)!;
    return !!(c.bands && c.description && c.misconceptions);
  });
  assert.equal(specified.length, 56);
  assert.ok(content.handWritten.size >= 780);
  assert.ok(content.generated.length > 2000);
  for (const g of content.generated) assert.ok(!content.handWritten.has(g.id));
  for (const cap of GUIDED_ALL) {
    for (const step of content.ladders.get(cap)!) assert.ok(content.lessons.has(`${cap}#${step.id}`), `${cap}#${step.id} has a lesson`);
    for (const m of content.index.leaves.get(cap)!.misconceptions ?? []) assert.ok(content.feedback.has(`${cap}#${m.id}`), `${cap}#${m.id} has feedback`);
  }
  // no writing or short items: evaluation (E3b) is disabled
  for (const i of content.ctx.content.items.values()) assert.equal(i.kind, "code");
});

test("placement uses the engine's assessment mode on hand-written items only, and stops between its limits", async () => {
  const { l } = await newLearner();
  assert.equal(l.plan()[0].type, "placement");
  await l.start({ type: "placement" });
  const asked = await runSession(l, (_i, n) => n % 3 !== 2);
  assert.ok(asked.length >= PLACEMENT_MIN && asked.length <= PLACEMENT_MAX, `asked ${asked.length}`);
  for (const i of asked) assert.ok(content.handWritten.has(i.id), `${i.id} is hand-written`);
  const evidence = l.events.filter((e) => e.kind === "evidence");
  assert.equal(evidence.length, asked.length);
  for (const e of evidence) assert.equal((e as { use?: string }).use, "assessment");
  const caps = new Set(asked.map((i) => (i as Code).target));
  for (const c of caps) assert.ok(GUIDED_ALL.includes(c), c);
  assert.equal(l.plan()[0].type, "spelling_check");
});

test("composite integration: the app's estimates are exactly the engine's, rebuilt from the evidence alone", async () => {
  const { l } = await newLearner();
  await l.start({ type: "placement" });
  await runSession(l, (_i, n) => n % 2 === 0);
  const ledgerOnly = Ledger.rebuild(content.ctx, "p-test", l.events.filter(isLedgerEvent) as LedgerEvent[]);
  assert.deepEqual(l.state.ledger.composite, ledgerOnly.composite);
  assert.deepEqual(l.state.ledger.decisions, ledgerOnly.decisions);
});

test("persistence: every answer is stored before the state moves on, and reopening resumes the same question", async () => {
  const clock = testClock();
  const { l, repo } = await newLearner(clock);
  await l.start({ type: "placement" });
  for (let i = 0; i < 5; i++) {
    const cur = await l.current();
    await l.answer(cur.next!.item, rightAnswer(cur.next!.item), { use: cur.next!.use });
  }
  const pending = (await l.current()).next!.item.id;
  // the tab closes; the app reopens from storage
  const again = await Learner.open(content, repo, "p-test", clock);
  assert.deepEqual(again.events, l.events);
  assert.deepEqual(again.state.ledger.composite, l.state.ledger.composite);
  assert.equal(again.state.open?.event.type, "placement");
  assert.equal((await again.current()).next!.item.id, pending, "the same question is waiting");
  assert.equal((await again.current()).done, 5);
});

test("export and import: a backup rebuilds exactly the same learner on another device; damaged files are refused", async () => {
  const clock = testClock();
  const { l } = await newLearner(clock);
  await l.start({ type: "placement" });
  await runSession(l, () => true);
  await l.start({ type: "spelling_check" });
  await runSession(l, (_i, n) => n % 2 === 0);
  const text = JSON.stringify(l.backup());
  const parsed = parseBackup(text);
  assert.ok(parsed.ok);
  const other = new MemoryRepo();
  await other.replaceAll(parsed.backup.profile.id, parsed.backup.events);
  const restored = await Learner.open(content, other, parsed.backup.profile.id, clock);
  assert.deepEqual(restored.state.ledger.composite, l.state.ledger.composite);
  assert.deepEqual([...restored.state.words.keys()], [...l.state.words.keys()]);
  assert.deepEqual(restored.plan(), l.plan());
  // damaged or edited files
  assert.equal(parseBackup("not json").ok, false);
  const b = JSON.parse(text);
  b.events[3].at = "2020-01-01T00:00:00.000Z";
  const edited = parseBackup(JSON.stringify(b));
  assert.equal(edited.ok, false);
  assert.match((edited as { error: string }).error, /checksum/);
  assert.equal(parseBackup(JSON.stringify({ ...JSON.parse(text), format: "other" })).ok, false);
});

test("spelling: a lesson comes first, practice uses unseen words, and generated answers change no estimate", async () => {
  const clock = testClock();
  const { l } = await newLearner(clock);
  await l.start({ type: "placement" });
  await runSession(l, () => true);
  await l.start({ type: "spelling_check" });
  await runSession(l, () => false); // every pattern looks like it needs work
  const step = l.plan().find((p) => p.type === "spelling_practice")!;
  assert.ok(step, "the plan offers spelling practice");
  const before = structuredClone(l.state.ledger.composite.nodes);
  const cur = await l.start(step);
  assert.ok(cur.lesson, "the session starts with its lesson");
  assert.equal(cur.next, null, "no question before the lesson");
  await l.finishLesson(cur.lesson!.id, true);
  const first = await l.current();
  assert.ok(first.next);
  const sessionId = l.state.open!.event.session;
  const all = await runSession(l, () => true);
  assert.equal(all[0].id, first.next!.item.id);
  const words = all.filter((i) => (i as Code).generated).map((i) => (i as Code).generated!.word);
  assert.equal(new Set(words).size, words.length, "each word once");
  for (const w of words) assert.ok(!l.state.words.has(w) || l.state.words.get(w)!.history.length >= 1);
  // generated answers: held, no estimate change; a hand-written item in the session does change it
  const sessionEvidence = new Set(l.events.filter((e) => e.kind === "evidence" && e.session === sessionId).map((e) => e.id));
  const decisions = l.state.ledger.decisions.filter((d) => sessionEvidence.has(d.source));
  assert.equal(decisions.length, all.length);
  for (const d of decisions) assert.equal(d.verdict, (content.ctx.content.items.get(d.observation!.item) as Code).generated ? "held" : "accepted", d.observation!.item);
  const hand = all.find((i) => content.handWritten.has(i.id)) as Code | undefined;
  for (const cap of GUIDED.spelling) {
    if (hand?.target === cap) continue;
    // no new direct evidence and the same mean (uncertainty may grow with time, as it always does)
    assert.equal(l.state.ledger.composite.nodes[cap].directN, before[cap].directN, `${cap}: no evidence from generated practice`);
    assert.equal(l.state.ledger.composite.nodes[cap].direct.mean, before[cap].direct.mean, `${cap}: estimate unchanged`);
  }
  if (hand) assert.notDeepEqual(l.state.ledger.composite.nodes[hand.target].direct, before[hand.target].direct, "the hand-written item counts");
  // the lesson is not shown again for the same pattern
  const again = await l.start(step);
  assert.equal(again.lesson, null);
});

test("hints and second tries are assisted practice: one piece of evidence per item, and a misspelt word enters word memory", async () => {
  const clock = testClock();
  const { l } = await newLearner(clock);
  await l.start({ type: "placement" });
  await runSession(l, () => true);
  await l.start({ type: "spelling_check" });
  const cur = await l.current();
  const item = cur.next!.item as Code;
  const fb = await l.answer(item, wrongAnswer(item), { use: cur.next!.use });
  assert.equal(fb.correct, false);
  assert.ok(fb.explanation.length > 10, "feedback explains the rule");
  assert.equal(fb.answer, item.generated!.word);
  const fb2 = await l.answer(item, rightAnswer(item), { use: cur.next!.use });
  assert.equal(fb2.correct, true);
  const evidence = l.events.filter((e) => e.kind === "evidence" && e.item.id === item.id);
  assert.equal(evidence.length, 1, "only the first try is evidence");
  const attempts = l.state.open!.attempts.filter((a) => a.item.id === item.id);
  assert.deepEqual(attempts.map((a) => a.assisted), [false, true]);
  const m = l.state.words.get(item.generated!.word)!;
  assert.equal(m.box, 0);
  assert.equal(Date.parse(m.due) - Date.parse(attempts[0].at), REVIEW_DAYS[0] * DAY);
});

test("word memory: due words come back after 1, 3, 7 and 14 days until learned; a miss starts again", async () => {
  const clock = testClock();
  const { l } = await newLearner(clock);
  await l.start({ type: "placement" });
  await runSession(l, () => true);
  await l.start({ type: "spelling_check" });
  await runSession(l, (_i, n) => n !== 0); // exactly one word misspelt
  const word = [...l.state.words.keys()][0];
  assert.ok(word);
  assert.ok(!l.plan().some((p) => p.type === "spelling_review"), "nothing due today");
  const gaps = [...REVIEW_DAYS];
  for (let k = 0; k < gaps.length; k++) {
    clock.days(gaps[k]);
    const review = l.plan().find((p) => p.type === "spelling_review");
    assert.ok(review, `review due after ${gaps[k]} days`);
    await l.start(review!);
    const asked = await runSession(l, () => true);
    assert.equal((asked[0] as Code).generated!.word, word);
    const e = l.events.filter((x) => x.kind === "evidence").at(-1) as { use?: string };
    assert.equal(e.use, "retention");
  }
  assert.equal(l.state.words.get(word)!.learned, true);
  clock.days(30);
  assert.ok(!l.plan().some((p) => p.type === "spelling_review"));
});

test("transfer: practise a pattern well, then a check with words never seen; passing makes it secure", async () => {
  const clock = testClock();
  const { l } = await newLearner(clock);
  await l.start({ type: "placement" });
  await runSession(l, () => true);
  await l.start({ type: "spelling_check" });
  await runSession(l, () => false);
  let step = l.plan().find((p) => p.type === "spelling_practice")!;
  const key = `${step.capability}#${step.step}`;
  await l.start(step);
  await runSession(l, () => true);
  assert.equal(patternStatus(l.state.patterns.get(key)), "ready_for_check");
  const check = l.plan().find((p) => p.type === "spelling_transfer")!;
  assert.ok(check, "the plan offers a check with new words");
  assert.equal(`${check.capability}#${check.step}`, key);
  const seen = new Set(l.state.wordsSeen);
  await l.start(check);
  const asked = await runSession(l, () => true);
  const words = asked.filter((i) => (i as Code).generated).map((i) => (i as Code).generated!.word);
  assert.ok(words.length >= 3);
  for (const w of words) assert.ok(!seen.has(w), `${w} was never seen before`);
  for (const i of asked) assert.ok(!(i as Code).generated || ["add_ending", "hear_spell", "meaning_first_letter", "homophone_context"].includes((i as Code).generated!.template));
  assert.equal(patternStatus(l.state.patterns.get(key)), "secure");
  step = l.plan().find((p) => p.type === "spelling_practice")!;
  assert.notEqual(`${step.capability}#${step.step}`, key, "the plan moves on");
});

test("without on-device speech, no dictation item is ever chosen", async () => {
  for (const speech of [false, true]) {
    const clock = testClock();
    const { l } = await newLearner(clock);
    l.speechAvailable = speech;
    await l.start({ type: "placement" });
    await runSession(l, () => true);
    await l.start({ type: "spelling_check" });
    const a = await runSession(l, () => false);
    await l.start(l.plan().find((p) => p.type === "spelling_practice")!);
    const b = await runSession(l, () => true);
    const dictation = [...a, ...b].filter((i) => (i as Code).generated?.template === "hear_spell");
    if (speech) assert.ok(dictation.length > 0, "dictation is used when speech works");
    else assert.equal(dictation.length, 0);
  }
});

test("grammar and vocabulary: a lesson, then the engine's own scheduler; evidence records assessment or practice as the engine chose", async () => {
  const clock = testClock();
  const { l } = await newLearner(clock);
  await l.start({ type: "placement" });
  await runSession(l, () => true);
  await l.start({ type: "spelling_check" });
  await runSession(l, () => true);
  const g = l.plan().find((p) => p.type === "guided")!;
  assert.ok(g && [...GUIDED.grammar, ...GUIDED.vocabulary].includes(g.capability as never));
  const cur = await l.start(g);
  if (cur.lesson) assert.equal(cur.lesson.capability, g.capability);
  const asked = await runSession(l, () => true);
  assert.ok(asked.length > 0 && asked.length <= 6);
  for (const i of asked) assert.ok(content.handWritten.has(i.id));
  const uses = new Set(l.events.filter((e) => e.kind === "evidence").slice(-asked.length).map((e) => (e as { use?: string }).use));
  for (const u of uses) assert.ok(["assessment", "practice", "retention"].includes(u!));
});

test("more practice reaches every capability through the existing engine, without pretending to teach it", async () => {
  const { l } = await newLearner();
  await l.start({ type: "placement" });
  await runSession(l, () => true);
  const cur = await l.start({ type: "explore" });
  assert.equal(cur.lesson, null);
  const asked = await runSession(l, () => true);
  assert.equal(asked.length, 10);
  assert.ok(asked.some((i) => !GUIDED_ALL.includes((i as Code).target)), "reaches capabilities outside the guided set");
});

test("display rule: not assessed, early estimate, measured; practice on generated words is shown apart", async () => {
  const clock = testClock();
  const { l } = await newLearner(clock);
  let p = capabilityProgress(l.state, content, clock());
  assert.ok(p.every((x) => x.certainty === "not_assessed"));
  await l.start({ type: "placement" });
  await runSession(l, () => true);
  p = capabilityProgress(l.state, content, clock());
  const placed = p.filter((x) => x.certainty !== "not_assessed");
  assert.ok(placed.length > 0);
  assert.ok(placed.every((x) => x.certainty === "early"), "a short placement only gives early estimates");
  for (const x of p.filter((y) => !y.guided)) assert.equal(x.certainty, "not_assessed");
  await l.start({ type: "spelling_check" });
  await runSession(l, () => true);
  p = capabilityProgress(l.state, content, clock());
  const spelling = p.filter((x) => GUIDED.spelling.includes(x.id as never));
  assert.ok(spelling.some((x) => x.evidence.generatedPractice > 0));
  // measured needs enough direct, independent evidence
  for (const x of p) if (x.certainty === "measured") assert.ok(x.view.direct.n >= 4 && x.evidence.assessment + x.evidence.retention >= 2 && x.view.direct.sd <= 0.9);
  assert.ok(leafView(l.state.ledger.composite, content.index, "EN.FND.SPL.inflections", clock()).direct.n >= 0);
});

test("the same answers always give the same record and the same plan (deterministic)", async () => {
  const run = async () => {
    const { l } = await newLearner(testClock());
    await l.start({ type: "placement" });
    await runSession(l, (_i, n) => n % 3 === 0);
    await l.start({ type: "spelling_check" });
    await runSession(l, (_i, n) => n % 2 === 0);
    return l;
  };
  const a = await run();
  const b = await run();
  assert.deepEqual(a.events, b.events);
  assert.deepEqual(a.plan(), b.plan());
});

test("a reported problem with a question is kept with the record and exported", async () => {
  const { l } = await newLearner();
  await l.start({ type: "placement" });
  const cur = await l.current();
  await l.flag(cur.next!.item, "The sentence is confusing.");
  assert.equal(l.state.flags.length, 1);
  assert.equal(l.backup().events.filter((e) => e.kind === "flag").length, 1);
});
