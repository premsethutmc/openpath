// Permanent regression fixtures: every disagreement found while validating the engine against the independent oracle
// (tools/mathematics/core/symbolic-validation). Expectations are the ORACLE's labels (independent of production code), never engine output.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { assessWorking } from "./working-assessment.ts";
const fx = JSON.parse(readFileSync(new URL("../../../../tools/mathematics/core/symbolic-validation/fixtures/regressions.json", import.meta.url), "utf8")) as any[];
const cls = (s: string) => (s === "valid" || s === "no-change" ? "valid" : s === "valid-with-obligation" ? "conditional" : s);
for (const f of fx) {
  test(`regression ${f.id} (seed ${f.seed}, ${f.class})`, () => {
    const a = assessWorking(f.problem, f.lines);
    const sub = (a.symbolic ?? a.multivariate)!;
    const got = sub.steps.map((s: any) => cls(s.status));
    const exp = f.oracle.steps.map((c: string) => (c === "statement" ? "valid" : c));
    assert.deepEqual(got, exp, `${f.problem} | ${f.lines.join(" ; ")}`);
    assert.equal(a.firstInvalidStep, f.oracle.first_invalid);
    if (f.oracle.first_invalid === null) assert.equal(sub.domain.missing.length > 0, f.oracle.final.missing);
  });
}
