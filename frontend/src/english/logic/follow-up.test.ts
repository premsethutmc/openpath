/**
 * follow-up@1: after an unaided answer that is wrong in a way the question names, guided practice asks a question
 * that can show the same mistake again, so one more answer tells a slip from a gap. It changes only which question
 * comes next: the answers are ordinary evidence.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { leafView, type Response } from "../../../../packages/english-core/src/index.ts";
import { type Code, loadContent } from "./content.ts";
import { testClock } from "./journey-sim.ts";
import { Learner } from "./learner.ts";
import { mistakesShownBy } from "./select.ts";
import { MemoryRepo } from "./store.ts";
import { rightAnswer } from "./test-helpers.ts";

const CAP = "EN.GRM.VERB.sva";
const content = loadContent({ mode: "development" });
/** A wrong answer to this question that carries a tagged mistake, if it has one. */
function taggedWrong(item: Code, want?: string): { response: Response; tag: string } | null {
  for (const [text, tag] of Object.entries(item.wrong ?? {})) if (!want || tag === want) return { response: { kind: "typed", text }, tag };
  for (const [index, tag] of Object.entries(item.distractor_tags ?? {})) if (!want || tag === want) return { response: { kind: "choice", choice: Number(index) }, tag };
  return null;
}
/** Open guided practice on subject-verb agreement and answer right until a question with a tagged mistake comes, then miss it that way. */
async function untilMistake() {
  const clock = testClock();
  const l = await Learner.create(content, new MemoryRepo(), "Follow", "guardian", clock, "p-follow");
  const first = await l.start({ type: "guided", capability: CAP });
  if (first.lesson) await l.finishLesson(first.lesson.id, true);
  for (let i = 0; i < 6; i++) {
    const cur = await l.current();
    const item = cur.next!.item as Code;
    const miss = taggedWrong(item);
    if (miss) {
      const fb = await l.answer(item, miss.response, { use: cur.next!.use });
      assert.deepEqual([fb.correct, fb.misconceptions.includes(miss.tag)], [false, true]);
      return { l, clock, missed: item, tag: miss.tag };
    }
    await l.answer(item, rightAnswer(item), { use: cur.next!.use });
  }
  throw new Error("no question with a tagged mistake came up");
}
const strength = (l: Learner, clock: () => string, tag: string) => leafView(l.state.ledger.composite, content.index, CAP, clock()).misconceptions.find((m) => m.id === tag)?.strength ?? 0;

test("FU-1 after a tagged mistake the next question can show the same mistake, on the same skill, no harder", async () => {
  const { l, clock, missed, tag } = await untilMistake();
  const cur = await l.current();
  const probe = cur.next!.item as Code;
  assert.equal(cur.next!.trace?.path, "misconception_follow_up");
  assert.match(cur.next!.trace!.explanation!, new RegExp(`follow-up@1[\\s\\S]*"${tag}"`));
  assert.notEqual(probe.id, missed.id);
  assert.equal(probe.target, CAP);
  assert.ok(mistakesShownBy(probe).includes(tag), `${probe.id} can show ${tag}`);
  assert.ok(probe.b <= missed.b + 0.25, `difficulty ${probe.b} after ${missed.b}`);
  assert.equal(cur.next!.use, "practice");
  // right on the follow-up: the mistake fades, and the engine chooses again
  const before = strength(l, clock, tag);
  await l.answer(probe, rightAnswer(probe), { use: cur.next!.use });
  assert.ok(strength(l, clock, tag) < before, "a right answer lets the mistake fade");
  const after = await l.current();
  assert.notEqual(after.next?.trace?.path, "misconception_follow_up");
  // the follow-up answer is ordinary evidence: one evidence record, accepted
  const ev = l.events.filter((e) => e.kind === "evidence" && e.item.id === probe.id);
  assert.equal(ev.length, 1);
  assert.equal(l.state.ledger.decisions.find((d) => d.source === ev[0].id)!.verdict, "accepted");
});

test("FU-2 the same mistake again strengthens the record of it, and is not followed by a third question of the kind", async () => {
  const { l, clock, tag } = await untilMistake();
  const cur = await l.current();
  const probe = cur.next!.item as Code;
  const again = taggedWrong(probe, tag)!;
  const before = strength(l, clock, tag);
  await l.answer(probe, again.response, { use: cur.next!.use });
  assert.ok(strength(l, clock, tag) > before, `the mistake is now stronger: ${before} to ${strength(l, clock, tag)}`);
  const next = await l.current();
  assert.notEqual(next.next?.trace?.path, "misconception_follow_up", "one follow-up per mistake");
});

test("FU-3 no follow-up after a right answer, after a retry, or outside guided practice", async () => {
  const clock = testClock();
  const l = await Learner.create(content, new MemoryRepo(), "Plain", "guardian", clock, "p-plain");
  const first = await l.start({ type: "guided", capability: CAP });
  if (first.lesson) await l.finishLesson(first.lesson.id, true);
  let cur = await l.current();
  await l.answer(cur.next!.item, rightAnswer(cur.next!.item), { use: cur.next!.use });
  cur = await l.current();
  assert.notEqual(cur.next!.trace?.path, "misconception_follow_up");
  // a second try at a missed question is help under way: no follow-up is forced then
  const m = await untilMistake();
  await m.l.answer(m.missed, rightAnswer(m.missed), { use: "practice" });
  assert.notEqual((await m.l.current()).next?.trace?.path, "misconception_follow_up");
});
