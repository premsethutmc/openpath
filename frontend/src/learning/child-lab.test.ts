/**
 * child-lab@2: every lab scenario runs on every change. A scenario the scorecard records as passing must still pass (a
 * regression fails here); the scorecard must match what the app does now, response provenance and how each run ended
 * included (rerun the lab script when it does not):
 *   node --import tsx ../packages/learning/scripts/child-lab.ts
 * The acceptance contracts and the mutation runs are held in child-lab-contracts.test.ts; the child's own arithmetic in
 * child-lab-fixtures.test.ts.
 */
import test from "node:test";
import assert from "node:assert/strict";
import card from "../../../content/owner/child-lab.v1.json";
import { SCENARIOS, runScenario } from "../../../packages/learning/src/lab/scenarios";

type Entry = { id: string; expected: string; pass: boolean; questions: number; provenance: Record<string, number>; termination: string; checks: { name: string; ok: boolean }[] };
const recorded = new Map((card.scenarios as Entry[]).map((s) => [s.id, s]));

for (const s of SCENARIOS) {
  test(`child lab ${s.id}: ${s.title}`, () => {
    const r = runScenario(s);
    const was = recorded.get(s.id);
    assert.ok(was, `${s.id} is not on the scorecard: run the lab script`);
    if (was.expected === "pass") assert.ok(r.pass, `regression: ${s.id} passed before and now fails: ${r.checks.filter((x) => !x.ok).map((x) => x.name).join("; ")}\n${r.trace}`);
    assert.ok(r.checks.some((x) => !x.name.startsWith("harness:")), `${s.id} has no checks of its own`);
    assert.deepEqual({ pass: r.pass, questions: r.questions, provenance: r.provenance, termination: r.termination, checks: r.checks.map((x) => ({ name: x.name, ok: x.ok })) },
      { pass: was.pass, questions: was.questions, provenance: was.provenance, termination: was.termination, checks: was.checks.map((x) => ({ name: x.name, ok: x.ok })) }, `${s.id}: the scorecard is out of date: run the lab script`);
  });
}
test("child lab: the scorecard lists exactly the lab's scenarios", () => {
  assert.deepEqual([...recorded.keys()], SCENARIOS.map((s) => s.id));
});
test("child lab: the summary counts what the scorecard lists", () => {
  const sc = card.scenarios as Entry[];
  assert.equal(card.summary.scenarios, sc.length);
  assert.equal(card.summary.pass, sc.filter((s) => s.pass).length);
  assert.equal(card.summary.mutationRuns, card.mutation.runs.length);
  assert.equal(card.summary.mutationCaught, card.mutation.runs.filter((r) => r.caught).length);
});
