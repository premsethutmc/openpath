import assert from "node:assert/strict";
import { test } from "node:test";
import { Ledger, recommend } from "../src/index.ts";
import { runAll, STRANDS, estimate } from "../../../tools/english/sim/simulate.ts";
import { nextAfterTwoSessions } from "../../../tools/english/sim/report.ts";
import { runDemo } from "../../../tools/english/demo.ts";
import { ctx } from "./helpers.ts";

test("E1-8 selection is repeatable and every recommendation is explained", async () => {
  const c = ctx();
  const results = await runAll(c);
  for (const r of results) {
    assert.ok(r.recommendations.length > 0);
    for (const rec of r.recommendations) assert.match(rec.explanation, /Chosen because .+\. Current estimate: /);
  }
  const r = results[3];
  const s = r.sessions[1];
  const input = () => ({ index: c.index, content: c.content, composite: s.composite, goal: c.content.goals.get("overall")!, now: s.now, seen: new Set(r.recommendations.slice(0, s.items).map((x) => x.item)), recent: [], writingThisSession: 0, writingAvailable: true });
  const a = recommend(input());
  const b = recommend(input());
  const rebuilt = Ledger.rebuild(c, r.learner.id, r.ledger.events.slice(0, r.ledger.events.findIndex((e) => e.at > s.now)));
  const d = recommend({ ...input(), composite: rebuilt.composite });
  assert.deepEqual(a, b);
  assert.deepEqual(d.choice, a.choice, "a rebuilt composite gives the same choice");
  assert.ok(a.choice && a.choice.reasons !== undefined && a.explanation.length > 20);
});

test("E1-13 two learners with different English capabilities get different composites and different next activities (simulation: L3 vs L4)", async () => {
  const c = ctx();
  const results = await runAll(c);
  const [l3, l4] = ["L3", "L4"].map((id) => results.find((r) => r.learner.id === id)!);
  const g3 = estimate(c, l3, "EN.GRM", l3.sessions[1].composite, l3.sessions[1].now);
  const g4 = estimate(c, l4, "EN.GRM", l4.sessions[1].composite, l4.sessions[1].now);
  assert.ok(g3.mean - g4.mean > g3.sd + g4.sd, `grammar after 40 items: L3 ${g3.mean.toFixed(2)}±${g3.sd.toFixed(2)} vs L4 ${g4.mean.toFixed(2)}±${g4.sd.toFixed(2)}`);
  const n3 = nextAfterTwoSessions(c, l3);
  const n4 = nextAfterTwoSessions(c, l4);
  assert.notEqual(n3.choice!.item, n4.choice!.item);
  assert.notDeepEqual(STRANDS.map((s) => estimate(c, l3, s).mean), STRANDS.map((s) => estimate(c, l4, s).mean));
});

test("E1-13 and E1-10 the demonstration: Asha and Ben differ, the invented quote is rejected, state reloads and undo is exact, all offline", async () => {
  const original = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = (async () => {
    calls++;
    throw new Error("network used");
  }) as typeof fetch;
  try {
    const demo = await runDemo({ quiet: true, dir: (await import("node:fs")).mkdtempSync((await import("node:path")).join((await import("node:os")).tmpdir(), "demo-")) });
    assert.equal(calls, 0, "no network requests");
    assert.notEqual(demo.next.asha.item, demo.next.ben.item);
    const c = ctx();
    const now = "2026-10-13T11:20:00.000Z";
    const sentences = ["asha", "ben"].map((id) => estimate(c, { ledger: demo.ledgers[id], sessions: [{ now }] } as never, "EN.SEN", demo.ledgers[id].composite, now));
    assert.ok(Math.abs(sentences[0].mean - sentences[1].mean) > 0.5, "sentence construction differs");
    const rejected = demo.writingDecisions.find((d) => d.verdict === "rejected")!;
    assert.match(rejected.reasons.join(), /check 4: quote not found/);
    assert.equal(demo.writingDecisions.filter((d) => d.verdict === "accepted").length, 4);
    assert.ok(demo.reloadedIdentical);
    assert.ok(demo.undoIdentical);
  } finally {
    globalThis.fetch = original;
  }
});
