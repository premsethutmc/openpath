/**
 * child-lab@1: every lab scenario runs on every change. A scenario the scorecard records as passing must still pass (a
 * regression fails here); the scorecard must match what the app does now (rerun the lab script when it does not).
 *   node --import tsx ../packages/learning/scripts/child-lab.ts
 */
import test from "node:test";
import assert from "node:assert/strict";
import card from "../../../content/owner/child-lab.v1.json";
import { SCENARIOS, runScenario } from "../../../packages/learning/src/lab/scenarios";

type Entry = { id: string; expected: string; pass: boolean; questions: number; checks: { name: string; ok: boolean }[] };
const recorded = new Map((card.scenarios as Entry[]).map((s) => [s.id, s]));

for (const s of SCENARIOS) {
  test(`child lab ${s.id}: ${s.title}`, () => {
    const r = runScenario(s);
    const was = recorded.get(s.id);
    assert.ok(was, `${s.id} is not on the scorecard: run the lab script`);
    if (was.expected === "pass") assert.ok(r.pass, `regression: ${s.id} passed before and now fails: ${r.checks.filter((x) => !x.ok).map((x) => x.name).join("; ")}\n${r.trace}`);
    assert.deepEqual({ pass: r.pass, questions: r.questions, checks: r.checks }, { pass: was.pass, questions: was.questions, checks: was.checks }, `${s.id}: the scorecard is out of date: run the lab script`);
  });
}
test("child lab: the scorecard lists exactly the lab's scenarios", () => {
  assert.deepEqual([...recorded.keys()], SCENARIOS.map((s) => s.id));
});
