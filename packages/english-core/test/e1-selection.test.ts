import assert from "node:assert/strict";
import { test } from "node:test";
import { Ledger, aggregate, leafView, recommend } from "../src/index.ts";
import { runAll, STRANDS, estimate, trueValue } from "../../../tools/english/sim/simulate.ts";
import { nextAfterTwoSessions } from "../../../tools/english/sim/report.ts";
import { runDemo } from "../../../tools/english/demo.ts";
import { ctx } from "./helpers.ts";

test("E1-8 selection is repeatable and every recommendation is explained", async () => {
  const c = ctx();
  const results = await runAll(c);
  for (const r of results) {
    assert.ok(r.recommendations.length > 0);
    for (const rec of r.recommendations) {
      // every recommendation says what kind of activity it is and why it was scheduled
      assert.match(rec.explanation, /(Assessment: |Learning: |Retention check: |Contradictory evidence: )/);
      assert.ok(["initial_assessment", "probe", "learning", "retention_check", "contradiction"].includes(rec.reason), rec.reason);
    }
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
  // Compared at capability level, where estimates are calibrated measurements (strand values are summaries only).
  const c = ctx();
  const results = await runAll(c);
  const [l3, l4] = ["L3", "L4"].map((id) => results.find((r) => r.learner.id === id)!);
  const at40 = (r: (typeof results)[number], cap: string) => leafView(r.sessions[1].composite, c.index, cap, r.sessions[1].now);
  // Same standard as before (gap larger than both uncertainties combined), stated at the level of the
  // profiles' real difference: some grammar capability (L4 is weak at grammar) and some writing capability
  // (L3 is the weak writer). Which capability separates first depends on which items selection chose.
  const separatedSomewhere = (strand: string, higher: typeof l3, lower: typeof l3) => {
    const caps = c.index.leafIds.filter((id) => id.startsWith(strand + ".") && c.index.leaves.get(id)!.tier === "skeleton");
    const rows = caps.map((cap) => ({ cap, h: at40(higher, cap), l: at40(lower, cap) }));
    assert.ok(rows.some((r) => r.h.mean - r.l.mean > r.h.sd + r.l.sd), rows.map((r) => `${r.cap}: ${r.h.mean.toFixed(2)}±${r.h.sd.toFixed(2)} vs ${r.l.mean.toFixed(2)}±${r.l.sd.toFixed(2)}`).join("; "));
  };
  separatedSomewhere("EN.GRM", l3, l4);
  separatedSomewhere("EN.WRT", l4, l3);
  const n3 = nextAfterTwoSessions(c, l3);
  const n4 = nextAfterTwoSessions(c, l4);
  assert.notEqual(n3.choice!.item, n4.choice!.item);
  assert.notDeepEqual(STRANDS.map((s) => estimate(c, l3, s).mean), STRANDS.map((s) => estimate(c, l4, s).mean));
});

test("strand values are labelled as uncalibrated summaries, and their ranges are not narrower than the evidence supports", async () => {
  const c = ctx();
  let inside = 0;
  let n = 0;
  for (const seed of [20261012, 7]) {
    const results = await runAll(c, seed);
    for (const r of results) {
      const s = r.sessions[1];
      const ag = aggregate(s.composite, c.index, s.now);
      for (const st of STRANDS) {
        const a = ag.get(st)!;
        assert.equal(a.calibrated, false);
        n++;
        if (Math.abs(trueValue(r.learner, st, s.day) - a.mean) <= 1.2816 * a.sd) inside++;
      }
    }
  }
  // The independence formula held the truth in only 57-67% of "80%" ranges; the conservative bound must not fall back to that.
  assert.ok(inside / n >= 0.75, `strand coverage ${(100 * inside / n).toFixed(0)}%`);
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
