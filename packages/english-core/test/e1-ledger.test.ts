import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { Ledger, type LedgerEvent, MemoryStore, rng } from "../src/index.ts";
import { FileStore } from "../../../tools/english/file-store.ts";
import { runAll } from "../../../tools/english/sim/simulate.ts";
import { ctx } from "./helpers.ts";

test("E1-5 rebuilding from the ledger reproduces the composite and the decision log exactly", async () => {
  const results = await runAll(ctx());
  for (const r of results) {
    const rebuilt = Ledger.rebuild(ctx(), r.learner.id, r.ledger.events);
    assert.deepEqual(rebuilt.composite, r.ledger.composite, r.learner.id);
    assert.deepEqual(rebuilt.decisions, r.ledger.decisions, r.learner.id);
  }
});

test("E1-5 revoking a decision equals never having applied it, and keeps the evidence", async () => {
  const [r] = await runAll(ctx());
  const events = r.ledger.events;
  const next = rng(9);
  for (let i = 0; i < 12; i++) {
    // a code-scored decision: revoking equals removing its evidence
    const codeDecisions = r.ledger.decisions.filter((d) => d.verdict === "accepted" && d.observation?.kind === "binary");
    const d = codeDecisions[Math.floor(next() * codeDecisions.length)];
    const revoked = Ledger.rebuild(ctx(), r.learner.id, [...events, { kind: "revoke", id: `rv${i}`, at: "2026-12-01T00:00:00.000Z", decision: d.id, reason: "test" }]);
    const without = Ledger.rebuild(ctx(), r.learner.id, events.filter((e) => e.id !== d.source));
    assert.deepEqual({ ...revoked.composite, appliedThrough: null, updatedAt: null, nodes: strip(revoked.composite.nodes) }, { ...without.composite, appliedThrough: null, updatedAt: null, nodes: strip(without.composite.nodes) });
    assert.ok(revoked.events.some((e) => e.id === d.source), "the evidence itself is kept");
    assert.equal(revoked.decisions.find((x) => x.id === d.id)!.verdict, "revoked");
  }
  // an evaluator judgement: revoking equals the same proposal without that judgement
  const j = r.ledger.decisions.find((d) => d.verdict === "accepted" && d.observation?.kind === "band")!;
  const revoked = Ledger.rebuild(ctx(), r.learner.id, [...events, { kind: "revoke", id: "rvj", at: "2026-12-01T00:00:00.000Z", decision: j.id, reason: "test" }]);
  const edited = events.map((e) => (e.id === j.source && e.kind === "proposal" ? { ...e, body: { ...(e.body as object), judgements: (e.body as { judgements: { capability: string }[] }).judgements.filter((x) => x.capability !== j.capability) } } : e)) as LedgerEvent[];
  const without = Ledger.rebuild(ctx(), r.learner.id, edited);
  assert.deepEqual(strip(revoked.composite.nodes), strip(without.composite.nodes));
});

/** Decision ids differ when an event is removed, so compare estimates and evidence counts, not id lists. */
function strip(nodes: Record<string, { evidence: string[] }>) {
  return Object.fromEntries(Object.entries(nodes).map(([k, n]) => [k, { ...n, evidence: n.evidence.length }]));
}

test("E1-10 local-first: a learner's state survives a restart from local files, identical to a full rebuild", async () => {
  const [r] = await runAll(ctx());
  const dir = mkdtempSync(join(tmpdir(), "openpath-"));
  const store = new FileStore(dir);
  for (const e of r.ledger.events) await store.append(e);
  await store.saveSnapshot({ composite: r.ledger.composite, decisions: r.ledger.decisions });
  const reopened = new FileStore(dir);
  const rebuilt = Ledger.rebuild(ctx(), r.learner.id, await reopened.events());
  const snap = (await reopened.loadSnapshot())!;
  assert.deepEqual(rebuilt.composite, snap.composite);
  assert.deepEqual(rebuilt.decisions, snap.decisions);
  const mem = new MemoryStore();
  for (const e of r.ledger.events) await mem.append(e);
  assert.deepEqual(await mem.events(), await reopened.events());
});
