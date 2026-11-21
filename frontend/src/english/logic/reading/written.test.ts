/** Written answers: checked by rule for key words, a second try, the model answer; the typed words never stored. */
import test from "node:test";
import assert from "node:assert/strict";
import { WRITTEN, WrittenSitting, markWritten, pickWritten, writtenProblems, writtenSummary, passageOf, type WrittenRecord } from "./written.ts";
import { loadContent } from "../content.ts";
import { testClock } from "../journey-sim.ts";
import { Learner } from "../learner.ts";
import { MemoryRepo } from "../store.ts";
import { eventProblem } from "../events.ts";

const item = (id: string) => WRITTEN.items.find((i) => i.id === id)!;

test("WA-1 content: four or more questions at each of six levels, on the Reading course's own passages, each model answer marked right", () => {
  assert.deepEqual(writtenProblems(WRITTEN), []);
  for (const it of WRITTEN.items) assert.ok(passageOf(it).text.length > 100, it.id);
});

test("WA-2 marking: every key, simple endings and a one-letter slip; not a wrong answer; a short right answer is nudged to a sentence", () => {
  const bus = item("wa.L1.P1.1"); // why was the bus late? tyre + flat
  assert.equal(markWritten(bus, "Because one tyre was flat.").correct, true);
  assert.equal(markWritten(bus, "the tire had gone flat").correct, true, "American spelling and no capital still right");
  assert.equal(markWritten(bus, "It had a puncture in a wheel.").correct, true);
  assert.equal(markWritten(bus, "Because the tyre.").correct, false, "half the answer");
  assert.equal(markWritten(bus, "The driver was sleeping.").correct, false);
  const m = markWritten(item("wa.L1.T.1"), "red");
  assert.deepEqual([m.correct, m.short, m.sentence], [true, true, false]);
  assert.equal(markWritten(item("wa.L3.T.1"), "She wrote a leter to the office.").correct, true, "one letter missing in a longer word");
  assert.equal(markWritten(item("wa.L2.T.2"), "There were 41 books.").correct, true, "a number in figures");
});

test("WA-3 a sitting: a miss, a second try, the model answer; records say right or not and on which try, never the words", async () => {
  const its = pickWritten([], 1);
  assert.equal(its.length, 3);
  assert.ok(its.every((i) => i.level === 1));
  const s = new WrittenSitting(its, "w1");
  s.check("I am not sure.");
  assert.equal(s.snapshot().phase, "marked");
  assert.equal(s.snapshot().reveal, false, "a second try first");
  s.again();
  s.check(its[0].model);
  assert.equal(s.snapshot().reveal, true);
  s.next();
  s.check("nothing");
  s.again();
  s.check("still nothing");
  assert.equal(s.snapshot().mark!.correct, false);
  assert.equal(s.snapshot().reveal, true, "after two tries, the model answer");
  s.next();
  s.check(its[2].model);
  s.next();
  assert.equal(s.snapshot().phase, "done");
  const recs = s.take();
  assert.deepEqual(recs.map((r) => (r.type === "answer" ? [r.correct, r.tries] : [r.asked, r.right])), [[true, 2], [false, 2], [true, 1], [3, 2]]);
  assert.ok(!JSON.stringify(recs).includes("nothing"), "the typed words are not kept");
  assert.deepEqual(writtenSummary(recs), { answered: 3, right: 2, firstTry: 1 });
  // next time: questions not yet answered right come first (the new one, then the missed one)
  const next = pickWritten(recs, 1, 2).map((i) => i.id);
  assert.ok(next.includes(its[1].id) && !next.includes(its[0].id) && !next.includes(its[2].id), next.join());
  const c = loadContent({ mode: "development" });
  const repo = new MemoryRepo();
  const l = await Learner.create(c, repo, "Writer", "guardian", testClock(), "p-written");
  await l.recordWritten(recs as WrittenRecord[]);
  for (const e of await repo.load("p-written")) assert.equal(eventProblem(e), null);
  assert.equal(l.writtenRecords().length, 4);
});

test("WA-4 answers that hold the key words without meaning them are not marked right; the model answer still is", () => {
  const tricks = (it: (typeof WRITTEN.items)[number]) => {
    // "not" before every word of the first key group that the model uses
    const negatedModel = it.keys[0].reduce((m, k) => m.replace(new RegExp(`\\b(${k.replace(/[-]/g, "\\$&")}\\w*)`, "gi"), "not $1"), it.model);
    return [
      negatedModel,
      // two choices
      `${it.model.replace(/\.$/, "")} or something else.`,
      // the whole passage pasted in
      passageOf(it).text,
    ];
  };
  const fooled: string[] = [];
  for (const it of WRITTEN.items) {
    assert.ok(markWritten(it, it.model).correct, `${it.id}: model`);
    for (const t of tricks(it)) if (markWritten(it, t).correct) fooled.push(`${it.id}: ${t.slice(0, 60)}`);
    for (const w of it.avoid ?? []) {
      assert.equal(markWritten(it, `${it.model.replace(/\.$/, "")}, ${w}.`).correct, false, `${it.id}: names a wrong answer (${w})`);
      assert.equal(markWritten(it, `${it.model.replace(/\.$/, "")}, not ${w}.`).correct, true, `${it.id}: rules out a wrong answer (not ${w})`);
    }
  }
  assert.deepEqual(fooled, []);
  const tomato = WRITTEN.items.find((i) => i.id === "wa.L1.T.1")!;
  assert.equal(markWritten(tomato, "It was not red.").correct, false);
  assert.equal(markWritten(tomato, "It wasn't red.").correct, false);
  assert.equal(markWritten(tomato, "Red or green.").correct, false);
  assert.equal(markWritten(tomato, "Red or maybe pink.").guard, "choice");
  assert.equal(markWritten(tomato, "It was green.").correct, false);
  assert.equal(markWritten(tomato, "It was red, not green.").correct, true);
  assert.equal(markWritten(tomato, "Red.").correct, true);
});
