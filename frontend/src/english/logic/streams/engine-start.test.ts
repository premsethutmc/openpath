/** engine-start@1: the lesson engine starts from the levels Find my level measured. A starting point, never evidence. */
import test from "node:test";
import assert from "node:assert/strict";
import { leafView } from "../../../../../packages/english-core/src/index.ts";
import { type Code, loadContent } from "../content.ts";
import { testClock } from "../journey-sim.ts";
import { Learner } from "../learner.ts";
import { MemoryRepo } from "../store.ts";
import { rightAnswer } from "../test-helpers.ts";
import { CHECK } from "../vocabulary/size-check.ts";
import { START_SD, TOPS, onFrameworkScale, strandStarts, withEngineStart } from "./engine-start.ts";
import { GAP_CHECK, READING_CHECK, TYPED_CHECK, levelsFrom, type LevelCheckRecord } from "./level-check.ts";

const content = loadContent({ mode: "development" });
const steps = (pairs: [number, boolean][]) => pairs.map(([level, ok], i) => ({ id: `s${i}`, word: `w${i}`, level, perfect: ok, correct: ok }));
/** Find my level in full, by a learner of low level: words 2, reading 2, listening 2, spelling 1, grammar 2. */
const LOW: LevelCheckRecord[] = [
  { type: "start", mode: "full" },
  { type: "words", band: 2, scale: CHECK.version, answered: 22 },
  { type: "reading", passed: 2, scale: 2, check: READING_CHECK, steps: [{ level: 3, right: 2, asked: 6 }, { level: 2, right: 5, asked: 6 }] },
  { type: "listening", level: 2, scale: 2, check: TYPED_CHECK, steps: steps([[4, false], [2, true], [3, false], [2, true]]) },
  { type: "spelling", level: 1, check: TYPED_CHECK, steps: steps([[3, false], [2, false], [1, true], [1, true]]) },
  { type: "grammar", level: 2, scale: 2, check: TYPED_CHECK, basics: { right: 2, asked: 2 }, steps: steps([[4, false], [2, true], [3, false], [2, true], [2, true]]) },
  { type: "done" },
];
const GAPS: LevelCheckRecord[] = [{ type: "start", mode: "gaps" }, { type: "gaps", level: 2, check: GAP_CHECK, steps: steps([[4, false], [2, true], [3, false], [2, true], [3, false], [2, true], [3, false], [2, true], [3, false], [2, true]]) }, { type: "done" }];
const SVA = "EN.GRM.VERB.sva";
async function learner(id: string) {
  const clock = testClock();
  const l = await Learner.create(content, new MemoryRepo(), id, "guardian", clock, id);
  const view = (cap: string) => leafView(l.state.ledger.composite, content.index, cap, clock());
  return { l, clock, view };
}

test("ES-1 a ladder is carried across in proportion, and only measured parts give a start", () => {
  assert.deepEqual([onFrameworkScale(1, 5), onFrameworkScale(5, 5), onFrameworkScale(3, 5), onFrameworkScale(0, 8)], [1, 8, 4.5, 1]);
  const tops = TOPS();
  const s = strandStarts(levelsFrom(LOW));
  assert.deepEqual(Object.keys(s).sort(), ["EN.FND", "EN.GRM", "EN.LIS", "EN.RDG", "EN.VOC"]);
  assert.equal(s["EN.VOC"].mean, 2);
  assert.equal(s["EN.FND"].mean, 1);
  assert.equal(s["EN.GRM"].mean, Math.round(onFrameworkScale(2, tops.grammar) * 100) / 100);
  assert.ok(Object.values(s).every((x) => x.sd === START_SD && x.mean >= 1 && x.mean < 4));
  // the quick gap check measures one overall level, not the parts: it gives no start
  assert.deepEqual(strandStarts(levelsFrom(GAPS)), {});
  assert.deepEqual(strandStarts(levelsFrom([])), {});
});

test("ES-2 after Find my level the engine's skills start at the measured level, as wide as before, and unmeasured strands stay in the middle", async () => {
  const { l, view } = await learner("p-start");
  const before = view(SVA);
  assert.deepEqual([before.mean, Math.round(before.sd * 100) / 100], [4, 1.5]);
  await l.recordLevelCheck(LOW);
  const after = view(SVA);
  assert.equal(after.mean, strandStarts(l.levels())["EN.GRM"].mean);
  assert.ok(after.mean < 3 && Math.abs(after.sd - 1.5) < 1e-9, `${after.mean} ± ${after.sd}`);
  assert.equal(view("EN.WRT.ACC.grammar").mean, 4, "writing has no part in Find my level: left alone");
  // nothing is stored for it, and it is not evidence: nothing is shown, and the plan still asks for answers given on their own
  assert.ok(!l.events.some((e) => (e.kind as string) === "starting_point"));
  assert.ok(l.state.ledger.decisions.every((d) => d.verdict !== "accepted"));
  const p = l.profile();
  assert.ok(p.capabilities.every((c) => c.evidence.independent === 0 && c.standing === "not_checked"));
  assert.equal(p.activities[0]?.step?.type, "placement");
});

test("ES-3 the quick gap check alone changes nothing in the engine, and a learner with no check is folded exactly as before", async () => {
  const { l, view } = await learner("p-gaps");
  await l.recordLevelCheck(GAPS);
  assert.equal(view(SVA).mean, 4);
  assert.deepEqual(withEngineStart(l.events), l.events);
});

test("ES-4 a skill that already has an answer of its own keeps its estimate", async () => {
  const { l, view } = await learner("p-kept");
  await l.start({ type: "guided", capability: SVA });
  const first = await l.current();
  if (first.lesson) await l.finishLesson(first.lesson.id, true);
  const cur = await l.current();
  await l.answer(cur.next!.item, rightAnswer(cur.next!.item), { use: cur.next!.use });
  await l.stop();
  const own = view(SVA).mean;
  assert.ok(own > 4);
  await l.recordLevelCheck(LOW);
  assert.equal(view(SVA).mean, own, "its own answer stands");
  assert.ok(view("EN.GRM.NOUN.articles").mean < 3, "a grammar skill with no answer starts at the measured level");
});

test("ES-5 the engine's first question is pitched at the learner: easier after a low Find my level than from the middle", async () => {
  const firstB = async (id: string, records: LevelCheckRecord[] | null) => {
    const { l } = await learner(id);
    if (records) await l.recordLevelCheck(records);
    await l.start({ type: "guided", capability: SVA });
    const first = await l.current();
    if (first.lesson) await l.finishLesson(first.lesson.id, true);
    return ((await l.current()).next!.item as Code).b;
  };
  const middle = await firstB("p-mid", null);
  const low = await firstB("p-low", LOW);
  assert.ok(low < middle, `first question difficulty ${low} after a low check, ${middle} from the middle`);
});

test("ES-6 the plan's starting check says where it begins once Find my level has measured a part", async () => {
  const { l } = await learner("p-line");
  assert.doesNotMatch(l.profile().activities[0].line, /Find my level/);
  await l.recordLevelCheck(LOW);
  assert.match(l.profile().activities[0].line, /begin at the levels Find my level found/);
});
