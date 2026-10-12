/**
 * E2b: the 39 core capabilities and the new writing tasks. Content is candidate (unreviewed); these
 * tests check that it is complete, well formed and free of mechanical answer cues, not that it is right.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { type Item, type WritingTask, guessingFloor } from "../src/index.ts";
import { bankCheck } from "../../../tools/english/bank/main.ts";
import { CONTENT, FROZEN_FRAMEWORK, loadContext } from "../../../tools/english/load.ts";

type Code = Extract<Item, { kind: "code" }>;
const r = bankCheck();
const runtime = loadContext();
const code = [...runtime.content.items.values()].filter((i): i is Code => i.kind === "code");
const core = [...runtime.index.leaves.values()].filter((c) => c.tier === "core");

test("E2b: every core capability has items, a ladder and at least one low-guessing format", () => {
  assert.equal(core.length, 39);
  for (const c of core) {
    const cov = r.coverage.find((x) => x.capability === c.id);
    assert.ok(cov, `${c.id} has items`);
    assert.ok(cov.lowGuessing >= 1 && cov.formats.length >= 2, `${c.id}: formats`);
    assert.ok(cov.steps.length >= 4 && cov.steps.every((s) => s.items > 0), `${c.id}: every ladder step has an item`);
    // the only gate a core capability misses is the retention runway, and it is recorded
    assert.deepEqual(cov.gates.filter((g) => !g.pass).map((g) => g.id), ["G8"], c.id);
    assert.deepEqual(r.recorded[c.id].gates, ["G8"]);
  }
});

test("E2b: the runtime (0.2.0) sees the whole bank; the frozen 0.1.0 view sees none of the E2b content", () => {
  const e2b = JSON.parse(readFileSync(join(CONTENT, "items", "e2b-items.json"), "utf8")) as Code[];
  const tasks = JSON.parse(readFileSync(join(CONTENT, "writing", "e2b-tasks.json"), "utf8")) as WritingTask[];
  for (const i of e2b) assert.ok(runtime.content.items.has(i.id), i.id);
  const frozen = loadContext({ framework: FROZEN_FRAMEWORK });
  for (const i of [...e2b, ...tasks]) assert.ok(!frozen.content.items.has(i.id), `${i.id} must not reach the frozen simulation`);
});

test("E2b writing tasks: rubrics for every target, three or more untrusted anchors spread across the range", () => {
  const tasks = JSON.parse(readFileSync(join(CONTENT, "writing", "e2b-tasks.json"), "utf8")) as WritingTask[];
  assert.ok(tasks.length >= 5);
  for (const t of tasks) {
    assert.ok(runtime.content.items.has(t.id));
    assert.equal(t.review, "candidate-unvalidated");
    assert.ok(t.band_window[0] < t.b && t.b < t.band_window[1], t.id);
    for (const cap of t.targets) assert.ok(t.rubric[cap]?.length >= 2, `${t.id}: rubric for ${cap}`);
    assert.ok(t.anchors.length >= 3 && t.anchors.every((a) => !a.trusted), `${t.id}: candidate anchors only`);
    for (const cap of t.targets) {
      const scores = t.anchors.map((a) => a.scores[cap]);
      assert.ok(scores.every((s) => s !== undefined), `${t.id}: every anchor scores ${cap}`);
      assert.ok(Math.max(...scores) - Math.min(...scores) >= 3, `${t.id}: anchors for ${cap} span the range`);
    }
  }
  // the core writing capabilities can now be evidenced by extended writing
  for (const cap of ["EN.WRT.GEN.narrative", "EN.WRT.GEN.persuasive", "EN.WRT.GEN.functional", "EN.WRT.STY.register", "EN.WRT.TSK.idea_development", "EN.WRT.ORG.sequencing"])
    assert.ok(tasks.some((t) => t.targets.includes(cap)), cap);
});

test("no mechanical answer cues: keyed answers are spread across positions", () => {
  const choices = code.filter((i) => i.format.startsWith("choice:") && (i.options?.length ?? 0) >= 4);
  const at = [0, 1, 2, 3].map((k) => choices.filter((i) => i.answer === k).length / choices.length);
  assert.ok(Math.max(...at) < 0.4, `share of keyed answers by position: ${at.map((x) => x.toFixed(2)).join(" ")}`);
  const multis = code.filter((i) => i.format.startsWith("multi:"));
  const firstKeyed = multis.filter((i) => i.answer_set!.includes(0)).length / multis.length;
  assert.ok(firstKeyed < 0.6, `multi items with option 0 keyed: ${firstKeyed.toFixed(2)}`);
  // and a learner who always picks the first option is near chance
  const firstRight = choices.filter((i) => i.answer === 0).length / choices.length;
  const chance = choices.reduce((s, i) => s + guessingFloor(i), 0) / choices.length;
  assert.ok(firstRight < chance + 0.1, `always-first scores ${firstRight.toFixed(2)} against chance ${chance.toFixed(2)}`);
});
