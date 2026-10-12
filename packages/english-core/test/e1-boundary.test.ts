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
    const events: LedgerEvent[] = [{ ...(await qualify(ev, tasks, (t, id) => anchorRequest(c, t, id, T(0)), T(-1))), evaluator: "evaluator", id: "q" }];
    let ledger = Ledger.rebuild(c, "x", events);
    for (const [i, t] of tasks.entries()) {
      const text = writeResponse(learner, t, 0);
      const evidence: LedgerEvent = { kind: "evidence", id: `w${i}`, at: T(i * 2), session: "s", item: { id: t.id, version: t.version }, response: { kind: "writing", text } };
      ledger = Ledger.rebuild(c, "x", [...ledger.events, evidence]);
      const req = buildEvaluationRequest(t, `w${i}`, text, ledger.composite, c.index, T(i * 2));
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
  assert.ok(req.anchors.length >= 2 && req.anchors.length <= 3);
  assert.doesNotMatch(JSON.stringify(req), /learner-123|ravi@example\.com|98765/);
  assert.match(req.response.text, /\[removed\]/);
  assert.equal(parseProposal({}).ok, false);
});
