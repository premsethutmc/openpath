/**
 * Listen and write: sound content, word-by-word marking that survives a missing or extra word, capital letters and
 * end marks, one retry before the sentence is shown, levels that move, missed sentences that return, and no effect
 * on the engine.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { DICTATION, DictationSitting, SITTING_SIZE, buildDictation, dictationProblems, dictationSummary, fixes, levelFor, mark, pick, startLevel, wordsOf, type DictationRecord } from "./dictation.ts";
import { loadContent } from "../content.ts";
import { eventProblem } from "../events.ts";
import { testClock } from "../journey-sim.ts";
import { Learner } from "../learner.ts";
import { MemoryRepo } from "../store.ts";

const S = (text: string, alt: Record<string, string[]> = {}) => ({ text, alt });
const kinds = (text: string, typed: string) => mark(S(text), typed).words.map((w) => w.kind).join(" ");

test("LW-1 content: six levels of at least twenty-four sentences, each one markable", () => {
  assert.deepEqual(dictationProblems(DICTATION), []);
  for (const l of DICTATION.levels) assert.ok(DICTATION.sentences.filter((s) => s.level === l.id).length >= 24);
  assert.equal(DICTATION.levels.length, 6);
  const avg = (lv: number) => { const x = DICTATION.sentences.filter((s) => s.level === lv).map((s) => wordsOf(s.text).length); return x.reduce((a, b) => a + b, 0) / x.length; };
  assert.ok(avg(1) < avg(2) && avg(2) < avg(3) && avg(3) < avg(5) && avg(4) < avg(5), "sentences get longer by level");
  const bad = buildDictation({ version: 1, status: "", levels: DICTATION.levels, sentences: [["x", 9, "we have 3 cats"]] });
  assert.match(dictationProblems(bad).join("\n"), /unknown level[\s\S]*capital letter[\s\S]*must end[\s\S]*numbers/);
});

test("LW-2 marking: right, misspelt, missing and extra words are told apart", () => {
  const t = "They walked across the old bridge.";
  assert.equal(mark(S(t), t).perfect, true);
  assert.equal(mark(S(t), "  They walked  across the old bridge. ").perfect, true);
  assert.equal(kinds(t, "They walkd across the old bridge."), "ok wrong ok ok ok ok");
  assert.equal(kinds(t, "They walked the old bridge."), "ok ok missing ok ok ok");
  assert.equal(kinds(t, "They walked across the big old bridge."), "ok ok ok ok extra ok ok");
  assert.equal(kinds(t, "They walkd acros the bridg."), "ok wrong wrong ok missing wrong");
  const m = mark(S(t), "They walkd the old bridge.");
  assert.deepEqual([m.right, m.total, m.missed], [4, 6, ["walked", "across"]]);
  assert.equal(m.perfect, false);
});

test("LW-3 capital letters, the end mark, short forms and other accepted spellings", () => {
  assert.equal(kinds("I lost my pencil on Monday.", "i lost my pencil on monday."), "capital ok ok ok ok capital");
  assert.equal(kinds("The dog ran.", "the Dog ran."), "capital capital ok");
  const q = mark(S("Where did you put it?"), "Where did you put it.");
  assert.deepEqual([q.end, q.perfect, q.right], ["wrong", false, 5]);
  assert.equal(mark(S("Where did you put it?"), "Where did you put it").end, "missing");
  assert.equal(mark(S("Don't forget it."), "Don’t forget it.").perfect, true, "a curly apostrophe is the same mark");
  assert.equal(kinds("Don't forget it.", "Dont forget it."), "wrong ok ok");
  assert.equal(mark(S("We bought apples, bananas and grapes."), "We bought apples bananas and grapes.").perfect, true, "commas are not marked");
  const alt = { apologised: ["apologized"] };
  assert.equal(mark(S("She apologised at once.", alt), "She apologized at once.").perfect, true);
  assert.equal(mark(S("She apologised at once.", alt), "She Apologized at once.").words[1].kind, "capital");
});

test("LW-4 what to fix is said without giving the sentence away", () => {
  const m = mark(S("I lost my pencil on Monday."), "i lost my pensil on a monday");
  const f = fixes(m).join(" ");
  assert.match(f, /One word is not spelt right\. One word should not be there\. Check 2 capital letters\. Finish the sentence with the right mark\./);
  assert.ok(!/pencil|Monday/.test(f));
  assert.deepEqual(fixes(mark(S("The dog ran."), "The dog ran.")), []);
});

/** Sit one sitting: `how(i)` says what to type for sentence i on each try. */
function sit(level: number, history: DictationRecord[], how: (text: string, i: number, tryNo: number) => string) {
  const s = new DictationSitting(DICTATION, level, history);
  const asked: string[] = [];
  for (let v = s.snapshot(), i = 0; v.phase !== "done"; v = s.snapshot(), i++) {
    assert.equal(v.reveal, null, "the sentence is not on screen while writing");
    asked.push(v.id!);
    const text = s.spoken()!;
    s.check(how(text, i, 1), 1);
    if (s.snapshot().phase === "retry") {
      assert.equal(s.snapshot().reveal, null, "nor after the first check");
      s.check(how(text, i, 2), 2);
    }
    assert.equal(s.snapshot().phase, "marked");
    assert.equal(s.snapshot().reveal, text);
    s.next();
  }
  return { asked, done: s.snapshot().done!, records: [...history, ...s.take()] };
}
const spoil = (t: string) => t.replace(/[a-z]{4,}/, (w) => w.slice(0, -1));

test("LW-5 a sitting: five sentences, one retry, the sentence shown only afterwards, records kept", () => {
  const r = sit(1, [], (t, i, tryNo) => (i === 0 && tryNo === 1 ? spoil(t) : i === 1 ? spoil(t) : t));
  assert.equal(r.asked.length, SITTING_SIZE);
  assert.equal(new Set(r.asked).size, SITTING_SIZE);
  assert.deepEqual([r.done.asked, r.done.perfectFirst, r.done.fixed], [5, 3, 1]);
  assert.equal(r.done.missed.length, 2);
  const answers = r.records.filter((x) => x.type === "answer");
  assert.deepEqual(answers.map((a) => [a.tries, a.perfectFirst, a.perfect]), [[2, false, true], [2, false, false], [1, true, true], [1, true, true], [1, true, true]]);
  assert.equal(r.records.at(-1)!.type, "end");
  const s = new DictationSitting(DICTATION, 1, []);
  s.check("   ", 0);
  assert.equal(s.snapshot().phase, "write", "nothing typed is not an answer");
});

test("LW-6 the level moves with the last sitting; missed sentences come back; new ones come first", () => {
  assert.deepEqual([startLevel("early"), startLevel("school"), startLevel(null), startLevel("older")], [1, 3, 3, 4]);
  // a sitting stored before the six-level scale is read on today's scale: old 2 is 3, old 3 is 5
  assert.equal(levelFor(DICTATION, [{ type: "end", sitting: "old", level: 2, asked: 5, perfectFirst: 3 }], 1), 3);
  assert.equal(levelFor(DICTATION, [{ type: "end", sitting: "old", level: 3, asked: 5, perfectFirst: 5 }], 1), 6);
  assert.equal(levelFor(DICTATION, [{ type: "end", sitting: "new", level: 3, scale: 2, asked: 5, perfectFirst: 3 }], 1), 3);
  const good = sit(1, [], (t) => t);
  assert.equal(good.done.nextLevel, 2);
  assert.equal(levelFor(DICTATION, good.records, 1), 2);
  const poor = sit(2, good.records, (t) => spoil(t));
  assert.equal(levelFor(DICTATION, poor.records, 2), 1);
  const mixed = sit(1, [], (t, i) => (i < 2 ? spoil(t) : t));
  assert.equal(levelFor(DICTATION, mixed.records, 1), 1);
  assert.equal(levelFor(DICTATION, sit(6, [], (t) => t).records, 6), 6, "no level above the top");
  const next = pick(DICTATION, 1, mixed.records).map((s) => s.id);
  assert.deepEqual(next.filter((id) => mixed.asked.includes(id)).sort(), mixed.asked.slice(0, 2).sort(), "the two missed sentences return");
  assert.equal(next.filter((id) => !mixed.asked.includes(id)).length, 3);
  let h: DictationRecord[] = [];
  const seen = new Set<string>();
  for (let k = 0; k < 8; k++) {
    const r = sit(2, h, (t) => t);
    r.asked.forEach((id) => seen.add(id));
    h = r.records;
  }
  assert.equal(seen.size, 40, "all forty before any repeats");
  assert.equal(pick(DICTATION, 1, h).length, SITTING_SIZE, "then the oldest again");
  assert.deepEqual(dictationSummary(mixed.records).missed.length, 2);
  assert.deepEqual([dictationSummary(mixed.records).sentences, dictationSummary(mixed.records).perfectFirst], [5, 3]);
});

test("LW-7 stored on the learner's record without touching the engine", async () => {
  const c = loadContent({ mode: "development" });
  const repo = new MemoryRepo();
  const clock = testClock();
  const l = await Learner.create(c, repo, "Listener", "guardian", clock, "p-dict");
  const picture = () => JSON.stringify(l.profile().capabilities.map((x) => [x.standing, x.evidence]));
  const before = picture();
  const r = sit(2, [], (t) => t);
  await l.recordDictation(r.records);
  const events = await repo.load("p-dict");
  for (const e of events) assert.equal(eventProblem(e), null);
  assert.ok(!events.some((e) => e.kind === "evidence" || e.kind === "session"));
  assert.equal(picture(), before);
  const again = await Learner.open(c, repo, "p-dict", clock);
  assert.equal(again.dictationRecords().length, r.records.length);
  assert.equal(levelFor(DICTATION, again.dictationRecords(), 2), 3);
  assert.match(String(eventProblem({ kind: "dictation", id: "x", at: clock(), record: {} })), /without its type/);
});
