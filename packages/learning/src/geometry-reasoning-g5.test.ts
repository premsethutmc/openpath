/** Fixed adversarial oracle cases, now run against the cited-rule method authority.
 * Original reports remain historical; these assertions require repaired semantics. */
import { after, describe, it as test } from "node:test";
import assert from "node:assert/strict";
const expect = (value: unknown) => ({ toEqual: (expected: unknown) => assert.deepEqual(value, expected), toBe: (expected: unknown) => assert.equal(value, expected) });
import { stopGeometryWorkers } from './geometry-worker';
after(()=>stopGeometryWorkers());
import { G5_REASONING_CASES, runReasoningCases } from "./geometry-reasoning-g5";

describe("G5 geometric reasoning on structured givens (the existing geometry authority)", () => {
  test("no false acceptance; the observed rejections of valid reasoning are exactly the recorded ones", async () => {
    const r = await runReasoningCases();
    expect(r.filter((x) => x.outcome === "false-acceptance")).toEqual([]);
    expect(r.filter((x) => x.outcome === "false-rejection")).toEqual([]);
    expect(r.filter((x) => x.outcome === "accepts-unjustified")).toEqual([]);
    expect(r.filter((x) => x.outcome === "abstains-on-invalid")).toEqual([]);
    for (const c of G5_REASONING_CASES.filter((x) => x.oracle === "valid")) expect(r.find((x) => x.id === c.id)!.outcome).toBe("agrees");
    for (const c of G5_REASONING_CASES.filter((x) => x.oracleFirstInvalid !== undefined)) expect([c.id, r.find((x) => x.id === c.id)!.firstInvalid]).toEqual([c.id, c.oracleFirstInvalid]);
    expect(r.find((x) => x.id === "R02")!.outcome).toBe("abstains");
  });

  test("no claim is accepted from a picture: a relation not given as a fact blocks the step", async () => {
    const r = await runReasoningCases();
    assert.notEqual(r.find((x) => x.id === "R11")!.verdict, "verified");
    expect(r.find((x) => x.id === "R08")!.verdict).toBe("missing-assumption");
  });
});
