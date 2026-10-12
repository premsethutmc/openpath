/**
 * E2-4, E2-5, E2-6 (E2a: the 17 skeleton capabilities; E2b: all 56 capabilities of 0.2.0).
 * The bank's content is well formed and candidate-marked; coverage gates are measured honestly, and
 * every gate a capability misses is recorded with a reason (no silent gaps, no stale ones).
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { type CodeItem, type Item, guessingFloor, scoreCode } from "../src/index.ts";
import { bankCheck } from "../../../tools/english/bank/main.ts";
import { GATES, RUNWAY, coverage, lint, loadProgressions, runwaySweep } from "../../../tools/english/bank/checks.ts";
import { CAP } from "../../../tools/english/sim/learners.ts";
import { loadContext } from "../../../tools/english/load.ts";

type Code = Extract<Item, { kind: "code" }>;
const r = bankCheck();

test("E2-6: all content passes the checker under the runtime framework and 0.2.0", () => {
  assert.deepEqual(r.problems, []);
  // content is valid (misconception tags etc.) under both versions: loading would throw otherwise
  assert.ok(loadContext().content.items.size === loadContext({ framework: "0.2.0" }).content.items.size);
  for (const i of r.ctx.content.items.values())
    if (i.kind === "code") {
      assert.equal(i.difficulty_source, "expert_estimate", `${i.id}: difficulty is an estimate, not calibrated`);
      assert.equal(i.review, "candidate-unvalidated", `${i.id}: marked as candidate content`);
    }
});

test("E2-4: every specified capability is covered, and every gate it misses is recorded with a reason", () => {
  assert.deepEqual(r.mismatches, []);
  for (const cap of Object.values(CAP)) assert.ok(r.coverage.some((c) => c.capability === cap), cap);
  assert.equal(r.coverage.length, 56);
  for (const c of r.coverage) {
    // G1–G7 (count, families, both ends of the range, gaps, formats, every ladder step) pass for all 56
    for (const g of c.gates.filter((x) => x.id !== "G8")) assert.ok(g.pass, `${c.name}: ${g.id} ${g.label} (${g.value})`);
    const rec = r.recorded[c.capability];
    if (!c.gates.every((g) => g.pass)) assert.ok(rec && rec.reason.length > 100, `${c.name}: gaps need a reason`);
  }
  // E2b: no specified capability is left without items
  assert.equal(r.pending.length, 0);
});

test("difficulty progression: items sit on their ladder step, ladders are ordered and cover every band descriptor", () => {
  const prog = loadProgressions();
  for (const cap of r.coverage.map((c) => c.capability)) {
    const steps = prog.capabilities[cap].steps;
    for (let k = 1; k < steps.length; k++) assert.ok(steps[k].band > steps[k - 1].band, `${cap}: ladder in order`);
    const bands = Object.keys(r.ctx.index.leaves.get(cap)!.bands!);
    assert.deepEqual(new Set(steps.map((s) => s.descriptor)), new Set(bands), `${cap}: a step under every descriptor`);
  }
  // a mislabelled item is caught
  const ctx = loadContext({ framework: "0.2.0" });
  const [first] = [...ctx.content.items.values()].filter((i): i is Code => i.kind === "code");
  const items = new Map(ctx.content.items);
  items.set(first.id, { ...first, b: first.b + 2 });
  assert.match(lint({ ...ctx, content: { ...ctx.content, items } }, prog).map((p) => p.message).join(), /more than 0.75 band from its step/);
});

test("formats: every capability has a low-guessing format, and the new typed formats score with the existing scorer", () => {
  for (const c of r.coverage) assert.ok(c.lowGuessing >= 1, c.name);
  const it = r.ctx.content.items.get("wrt.gra.10") as CodeItem;
  assert.equal(guessingFloor(it), 0);
  assert.equal(scoreCode(it, { kind: "typed", text: "would" }).correct, true);
  assert.equal(scoreCode(it, { kind: "typed", text: "Know." }).correct, true, "a second valid fix is accepted");
  assert.equal(scoreCode(it, { kind: "typed", text: "will" }).correct, false);
});

test("E2-5: the retention-runway sweep is explicit, deterministic and honest about the engine", () => {
  assert.deepEqual(RUNWAY.levels[0], 2);
  assert.equal(RUNWAY.checksWanted, 4);
  const prog = loadProgressions();
  const a = coverage(r.ctx, CAP.sva, prog);
  const b = coverage(r.ctx, CAP.sva, prog);
  assert.deepEqual(a.runway, b.runway);
  // a dense bank with variants: reserving variants for retention makes the runway, the engine as built does not
  const dense: CodeItem[] = Array.from({ length: 24 }, (_, i) => ({ id: `i${i}`, family: `f${Math.floor(i / 3)}`, version: 1, target: "x", format: "typed:x", a: 1.3, b: 1.5 + (6.5 * Math.floor(i / 3)) / 7, prompt: "", answers: ["a"] }));
  assert.ok(Math.min(...runwaySweep(dense, true).map((x) => x.checks)) >= RUNWAY.checksWanted);
  assert.ok(Math.min(...runwaySweep(dense).map((x) => x.checks)) < RUNWAY.checksWanted);
  assert.equal(GATES.maxGap, 0.75);
});
