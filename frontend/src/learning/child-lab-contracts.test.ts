/**
 * child-lab@2: the hand-written acceptance contracts (content/owner/child-lab-contracts.v1.json) against the generated
 * scorecard, and the mutation runs live: each declared mutant must make at least one check fail that holds without it.
 * The contracts are never written by the lab script, so a scenario cannot quietly drop a check or stop catching a mutant.
 */
import test from "node:test";
import assert from "node:assert/strict";
import card from "../../../content/owner/child-lab.v1.json";
import contracts from "../../../content/owner/child-lab-contracts.v1.json";
import { SCENARIOS, runScenario } from "../../../packages/learning/src/lab/scenarios";
import { MUTANTS, mutant } from "../../../packages/learning/src/lab/mutants";

type Contract = { id: string; policy: string; pairedWith?: string; mustCheck: string[]; kills: string[] };
type Entry = { id: string; checks: { name: string; ok: boolean }[] };
const K = contracts.scenarios as Contract[];
const scored = new Map((card.scenarios as Entry[]).map((s) => [s.id, s]));
const byId = new Map(SCENARIOS.map((s) => [s.id, s]));

test("contracts: one for every scenario, and no other", () => {
  assert.deepEqual(K.map((k) => k.id).sort(), SCENARIOS.map((s) => s.id).sort());
});
for (const k of K) {
  test(`contract ${k.id}: learning assumption, pairing and required checks`, () => {
    const s = byId.get(k.id)!;
    assert.equal(s.policy.kind, k.policy, `${k.id} must assume "${k.policy}" learning`);
    assert.equal(s.pairedWith, k.pairedWith, `${k.id} must be paired with ${k.pairedWith ?? "nothing"}`);
    if (k.pairedWith) assert.notEqual(byId.get(k.pairedWith)!.policy.kind, s.policy.kind, `${k.id} and its pair must assume different learning`);
    assert.ok(k.mustCheck.length > 0, `${k.id}: a contract with no checks protects nothing`);
    const names = new Set(scored.get(k.id)!.checks.map((x) => x.name));
    for (const n of k.mustCheck) assert.ok(names.has(n), `${k.id} must check "${n}"`);
  });
}
test("contracts: every scenario that assumes teaching works at once on a slip has a control where it does not", () => {
  for (const id of ["S01", "S02", "S08", "S15", "S16"]) { const p = byId.get(id)!.pairedWith; assert.ok(p && byId.get(p)!.policy.kind === "unsuccessful", `${id} needs an unsuccessful-learning control`); }
});
test("contracts: every mutant is declared caught by some scenario", () => {
  for (const m of MUTANTS) assert.ok(K.some((k) => k.kills.includes(m.id)), `no scenario is meant to catch ${m.id}`);
});
for (const k of K) for (const m of k.kills) {
  test(`mutant ${m} is caught by ${k.id}`, () => {
    const clean = scored.get(k.id)!;
    const r = runScenario(byId.get(k.id)!, mutant(m));
    const flipped = clean.checks.filter((x, i) => x.ok && r.checks[i]?.ok === false).map((x) => x.name);
    assert.ok(flipped.length > 0, `${k.id} does not notice ${m}: every check that held still holds`);
    const rec = card.mutation.runs.find((x) => x.mutant === m && x.scenario === k.id);
    assert.ok(rec && rec.caught && JSON.stringify(rec.flipped) === JSON.stringify(flipped), `the scorecard's mutation runs are out of date: run the lab script`);
  });
}
