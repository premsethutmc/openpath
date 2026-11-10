/**
 * method-sections@2 gap check (2026-11-10): no explanation can be followed by a question needing a method it does not show. For every
 * module the app serves (built and hand-written) and every explanation, the method kinds of the questions its follow-ups may ask (a
 * scoped explanation: its scope; otherwise the whole module) must each be worked through by one of its sections. Coverage is computed
 * from the content (method-kinds.ts), not from a hand map. Runs in about a minute, with no learner simulation. When it fails, the
 * message names the module, the explanation and the missing kinds: usually a family with no teaching hints or no spare example.
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { modules } from "../../../packages/learning/src/content";
import { missingKinds } from "../../../packages/learning/src/library";
import { methodCompatibility } from "../../../packages/learning/src/method-alignment";

test("every explanation shows every method its follow-ups may ask (all modules, all grades)", () => {
  const gaps: string[] = [];
  for (const m of modules) for (const s of m.strategies) { const g = missingKinds(m, s); if (g.size) gaps.push(`${m.competency}/${s.id}: ${[...g.keys()].join(", ")}`); }
  assert.deepEqual(gaps, []);
  assert.ok(modules.length > 300);
});

test("the gate reads the same coverage: an added section makes its kind a follow-up the lesson covers", () => {
  const m = modules.find((x) => x.competency === "MATH.geometry.pythagoras")!;
  for (const s of m.strategies) {
    const added = s.screens.filter((sc) => sc.section === "method" && sc.instance);
    for (const sc of added) assert.equal(methodCompatibility(m, s, sc.instance!).status, "covered", `${s.id}: ${sc.instance}`);
  }
  assert.ok(m.strategies.some((s) => s.screens.some((sc) => sc.section === "method")));
});
