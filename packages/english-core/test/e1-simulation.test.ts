import assert from "node:assert/strict";
import { test } from "node:test";
import { fingerprint, measures, runAll } from "../../../tools/english/sim/simulate.ts";
import { renderReport } from "../../../tools/english/sim/report.ts";
import { ctx } from "./helpers.ts";

test("E1-9 the ten-learner simulation runs, reports every measure against the frozen pass levels, and is deterministic and safe", async () => {
  const c = ctx();
  const a = await runAll(c);
  const b = await runAll(c);
  assert.equal(a.length, 10);
  for (const r of a) assert.equal(r.items, 120, `${r.learner.id} answered ${r.items} items`);
  const result = await measures(c, a, [fingerprint(a), fingerprint(b)]);
  assert.deepEqual(result.measures.map((m) => m.id), ["M1", "M2", "M3", "M4", "M5", "M6", "M7", "M8"]);
  // hard requirements: never apply faulty evaluator output; same inputs, same results
  assert.ok(result.measures.find((m) => m.id === "M7")!.pass, "safety");
  assert.ok(result.measures.find((m) => m.id === "M8")!.pass, "determinism");
  const html = renderReport(c, a, result.measures, { generatedAt: "test", fingerprint: fingerprint(a) });
  assert.match(html, /<title>OpenPath E1 Simulation<\/title>/);
  assert.match(html, /does not show that real learners behave this way/);
  for (const m of result.measures) assert.ok(html.includes(`<strong>${m.id}</strong>`), `${m.id} in report`);
  assert.equal((html.match(/class="pill (ok|miss)"/g) ?? []).length, 8);
});
