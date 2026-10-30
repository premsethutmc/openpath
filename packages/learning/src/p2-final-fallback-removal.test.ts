/** P2-FINAL: the legacy numeral-provenance fallback no longer authorizes a derivation the authority cannot parse. These are the 39 engine calls whose
 *  verdict changed (verified -> unsupported / incomplete) when it was removed. They are recorded, not hidden: each must stay NOT verified. */
import { afterAll, describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { assessMathematicalWorking } from "./unified-math-engine.ts";
import { stopGeometryWorkers } from "./geometry-worker.ts";
afterAll(() => stopGeometryWorkers());
type Call = { problem: never; working: never; was: string; now: string };
const calls = JSON.parse(readFileSync(new URL("../../../tools/mathematics/answer-key-certification/p2-validation/FALLBACK-REMOVAL-changed-calls.json", import.meta.url), "utf8")) as Call[];
describe("P2-FINAL fallback removal: the newly unsupported calls stay unsupported", () => {
  test("39 recorded calls", () => expect(calls.length).toBe(39));
  test("none is verified, each keeps its recorded post-removal class, none is invalid (truth is not re-judged)", async () => {
    for (const c of calls) { const a = await assessMathematicalWorking(c.problem, c.working); expect(a.classification).not.toBe("verified"); expect(a.classification).toBe(c.now as never); }
  });
});
