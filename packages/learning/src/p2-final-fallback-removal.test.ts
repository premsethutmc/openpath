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
  // grader generalization (@3): 8 of the 39 are derivations the authority now certifies with its own replayable rules (conditions x ⋈ c, inequalities,
  // balance by a whole side, substitution under bindings). They are listed with the rule that certifies them; every other call keeps its class.
  const recovered = JSON.parse(readFileSync(new URL("../../../tools/mathematics/grader-generalization/RECOVERED-BY-GENERALIZATION.json", import.meta.url), "utf8")) as { index: number; statement: string; rule: string }[];
  test("none is verified, each keeps its recorded post-removal class, none is invalid (truth is not re-judged) - except the listed derivations certified by the generalized rules", async () => {
    const idx = new Set(recovered.map((r) => r.index)); expect(recovered.length).toBe(8); expect(recovered.every((r) => r.rule.length > 0)).toBe(true);
    for (const [i, c] of calls.entries()) { const a = await assessMathematicalWorking(c.problem, c.working); if (idx.has(i)) { expect(a.classification).toBe("verified"); continue; } expect(a.classification).not.toBe("verified"); expect(a.classification).toBe(c.now as never); }
  });
  test("each recovered derivation is certified by the authority and replays independently", async () => {
    const { assessChain, replayDerivationChain } = await import("./derivation-authority.ts");
    for (const r of recovered) { const c = calls[r.index] as unknown as { problem: { statement: string }; working: { text: string } }; const lines = c.working.text.split("\n");
      const v = assessChain(c.problem.statement, lines); expect(v.status).toBe("verified"); expect(replayDerivationChain(c.problem.statement, lines, v.chain).ok).toBe(true); }
  });
});
