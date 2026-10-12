import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { Ledger, type LedgerEvent, buildEvaluationRequest, parseProposal, replayEvaluator, requestFingerprint } from "../src/index.ts";
import { LEARNERS, writeResponse } from "../../../tools/english/sim/learners.ts";
import { anchorRequest, simEvaluator, writingTasks } from "../../../tools/english/sim/run.ts";
import { qualify } from "../src/index.ts";
import { T, ctx } from "./helpers.ts";

const SRC = join(import.meta.dirname, "..", "src");

test("E1-7 the core has no network code, no platform imports and no provider names", () => {
  for (const f of readdirSync(SRC)) {
    const code = readFileSync(join(SRC, f), "utf8");
    assert.doesNotMatch(code, /from\s+["']node:|require\(|\bfetch\(|XMLHttpRequest|WebSocket|process\.env/, `${f} must stay platform-free`);
    assert.doesNotMatch(code, /anthropic|openai|gemini|claude|gpt-|llama|mistral/i, `${f} must not name a provider`);
  }
});

test("E1-7 swapping the stand-in evaluator for a replay of its recordings gives identical decisions", async () => {
  const c = ctx();
  const learner = LEARNERS[2];
  const mock = simEvaluator(c, learner, () => 0, { noise: 0.7, seed: 3 });
  const tasks = writingTasks(c);
  const recordings: Record<string, unknown> = {};
  const record = async (req: Parameters<typeof mock.evaluate>[0]) => {
    const body = await mock.evaluate(req);
    recordings[requestFingerprint(req)] = body;
    return body;
  };
  for (const t of tasks) for (const a of t.anchors) await record(anchorRequest(c, t, a.id, T(0)));
  const replay = replayEvaluator("swap", recordings);
  const build = async (ev: typeof mock) => {
    const events: LedgerEvent[] = [{ ...(await qualify(ev, tasks, (t, id) => anchorRequest(c, t, id, T(0)), T(-1), { candidateAnchors: true })), evaluator: "evaluator", id: "q" }];
    let ledger = Ledger.rebuild(c, "x", events);
    for (const [i, t] of tasks.entries()) {
      const text = writeResponse(learner, t, 0);
      const evidence: LedgerEvent = { kind: "evidence", id: `w${i}`, at: T(i * 2), session: "s", item: { id: t.id, version: t.version }, response: { kind: "writing", text } };
      ledger = Ledger.rebuild(c, "x", [...ledger.events, evidence]);
      const req = buildEvaluationRequest(t, `w${i}`, text, ledger.composite, c.index, T(i * 2), "candidates");
      const body = ev === mock ? await record(req) : await ev.evaluate(req);
      ledger = Ledger.rebuild(c, "x", [...ledger.events, { kind: "proposal", id: `p${i}`, at: T(i * 2 + 1), evidence: `w${i}`, evaluator: { id: "evaluator" }, body }]);
    }
    return ledger;
  };
  const a = await build(mock);
  const b = await build(replay);
  assert.deepEqual(b.decisions, a.decisions);
  assert.deepEqual(b.composite, a.composite);
});

test("E1-7 the evaluation request carries standards, anchors, the response and current estimates, but no identity", () => {
  const c = ctx();
  const t = writingTasks(c)[0];
  const ledger = new Ledger(c, "learner-123");
  const req = buildEvaluationRequest(t, "w1", "Email me at ravi@example.com or call 98765 43210. I want a book.", ledger.composite, c.index, T(0));
  assert.ok(req.targets.every((x) => Object.keys(x.band_descriptors).length >= 3 && x.criteria.length && typeof x.current.mean === "number"));
  // by default only trusted (educator-scored) anchors are sent; none exist yet (D-4)
  assert.equal(req.anchor_set, "trusted");
  assert.ok(req.anchors.every((a) => a.trusted));
  const dev = buildEvaluationRequest(t, "w1", "I want a book.", ledger.composite, c.index, T(0), "candidates");
  assert.ok(dev.anchors.length >= 2 && dev.anchors.length <= 3);
  assert.doesNotMatch(JSON.stringify(req), /learner-123|ravi@example\.com|98765/);
  assert.match(req.response.text, /\[removed\]/);
  assert.equal(parseProposal({}).ok, false);
});

test("E1-7 fail closed: outside development, an evaluator qualified only on unreviewed candidate anchors cannot change a composite", async () => {
  const dev = ctx();
  const prod = { ...dev, allowCandidateAnchors: false };
  const learner = LEARNERS[0];
  const mock = simEvaluator(dev, learner, () => 0, { noise: 0.5, seed: 1 });
  const q = await qualify(mock, writingTasks(dev), (t, id) => anchorRequest(dev, t, id, T(0)), T(-1), { candidateAnchors: true });
  assert.equal(q.anchor_set, "candidates");
  const strict = await qualify(mock, writingTasks(dev), (t, id) => anchorRequest(dev, t, id, T(0)), T(-1));
  assert.equal(strict.qualified, false, "no trusted anchors exist yet, so strict qualification cannot pass");
  const t = writingTasks(dev)[0];
  const text = writeResponse(learner, t, 0);
  const evidence: LedgerEvent = { kind: "evidence", id: "w", at: T(1), session: "s", item: { id: t.id, version: t.version }, response: { kind: "writing", text } };
  const body = await mock.evaluate(buildEvaluationRequest(t, "w", text, new Ledger(dev, "x").composite, dev.index, T(1), "candidates"));
  const events: LedgerEvent[] = [q, evidence, { kind: "proposal", id: "p", at: T(2), evidence: "w", evaluator: { id: mock.id }, body }];
  const held = Ledger.rebuild(prod, "x", events).decisions.filter((d) => d.source === "p");
  assert.ok(held.length > 0 && held.every((d) => d.verdict === "held"));
  assert.match(held[0].reasons.join(), /trusted \(educator-scored\) anchors are required/);
  assert.ok(Ledger.rebuild(dev, "x", events).decisions.some((d) => d.source === "p" && d.verdict === "accepted"), "the same proposal is accepted in development mode");
});
