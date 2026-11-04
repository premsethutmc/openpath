/**
 * K4: assessment evidence and retention v1. Item roles and reservation, assisted@1, later checks, the separate
 * claims, and the deterministic learner simulations. These test the engine's behaviour, not teaching effectiveness.
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  allocateItems,
  competencyOutcome,
  dueCheck,
  type EssayEvent,
  itemEligibility,
  Ledger,
  type LedgerEvent,
  planCheck,
  teachingLeak,
  type BankItem,
  type CodeItem,
  type Item,
} from "../src/index.ts";
import { respond, runScenarios, SVA, type ScenarioResult } from "../../../tools/english/assessment-simulations.ts";
import { loadAppEssayContext, loadEssayContext } from "../../../tools/english/essay-load.ts";

/** The bank the app ships, with the pilot's pools (what a learner meets). */
const ectx = loadAppEssayContext();
/** The core bank, no pilot questions or pools: separates the estimator from the content limits. */
const core = loadEssayContext();
const item = (id: string) => ectx.ctx.content.items.get(id) as Item & CodeItem;
const at = (day: number, minute = 0) => new Date(Date.parse("2026-10-19T09:00:00.000Z") + day * 86_400_000 + minute * 60_000).toISOString();
const evidence = (id: string, right: boolean, day: number, n: number, policies: ("passage@1" | "assisted@1")[] = ["passage@1", "assisted@1"]): LedgerEvent => {
  const it = item(id);
  const response = respond(it, right);
  return { kind: "evidence", id: `e${n}`, at: at(day, n), session: `d${day}`, item: { id, version: it.version }, response, use: "assessment", provenance: { schema: "provenance@1", attempt: 1, hints: [], afterFeedback: false, policies } };
};
const assisted = (id: string, day: number, n: number): LedgerEvent => ({ kind: "assisted_response", id: `a${n}`, at: at(day, n), session: `d${day}`, item: { id, version: item(id).version }, response: { kind: "typed", text: "x" }, attempt: 1, hints: ["h"], afterFeedback: false });

const cache = new Map<string, ScenarioResult[]>();
const sims = async (bank: "app" | "core" = "app") => {
  if (!cache.has(bank)) cache.set(bank, await runScenarios(bank));
  return cache.get(bank)!;
};
const byId = async (id: string, bank: "app" | "core" = "app") => (await sims(bank)).find((s) => s.id === id)!;

test("K4-1 every question gets explicit roles: practice below the target, independent checks from the target up, nothing hard spent on practice", () => {
  const el = itemEligibility(core, SVA);
  assert.ok(el.length >= 10);
  for (const e of el) {
    assert.ok(e.roles.includes("teaching"));
    if (e.roles.includes("independent_verification")) {
      assert.ok(e.b >= 5 && e.b <= 6.5, `${e.item} b ${e.b}`);
      assert.ok(e.roles.includes("delayed_retention") && !e.roles.includes("guided_practice"));
    }
    if (e.roles.includes("guided_practice") && e.status === "candidate" && !e.leak) assert.ok(e.b < 5, e.item);
  }
  // a question whose answer a lesson shows is practice only
  const leaked = itemEligibility(core, "EN.GRM.VERB.present_past_simple").filter((e) => e.leak);
  assert.ok(leaked.length >= 1);
  for (const e of leaked) assert.deepEqual(e.roles, ["teaching", "guided_practice"]);
  assert.equal(teachingLeak(item("grm.sva.01") as BankItem, []), null, "no teaching text, no leak");
});

test("K4-2 assisted questions can never become unseen independent evidence (assisted@1 and the allocation)", () => {
  const target = allocateItems(ectx, [], SVA).reserved.independent_verification[0];
  const events = [assisted(target, 0, 1), evidence(target, true, 3, 2)];
  const L = Ledger.rebuild(ectx.ctx, "k4", events);
  const d = L.decisions.find((x) => x.source === "e2")!;
  assert.equal((d.observation as { exposure?: string }).exposure, "repeat");
  assert.match(d.reasons.join(" "), /met earlier with help/);
  assert.equal(L.composite.nodes[SVA].directN, 0, "no estimate change");
  // the allocation never offers it, or its family, for diagnosis, verification or retention
  const a = allocateItems(ectx, [assisted(target, 0, 1)], SVA);
  const fam = item(target).family ?? target;
  for (const role of ["diagnostic", "independent_verification", "delayed_retention"] as const)
    assert.ok(!a.available[role].some((id) => id === target || (item(id).family ?? id) === fam), role);
  // without the policy mark, an old record replays exactly as it was scored
  const legacy = Ledger.rebuild(ectx.ctx, "k4", [assisted(target, 0, 1), evidence(target, true, 3, 2, ["passage@1"])]);
  assert.equal((legacy.decisions.find((x) => x.source === "e2")!.observation as { exposure?: string }).exposure, "fresh");
});

test("K4-3 reserved assessment questions stay available through diagnosis and practice", async () => {
  const fresh = allocateItems(core, [], SVA);
  const keep = [...fresh.reserved.delayed_retention, ...fresh.reserved.independent_verification];
  assert.ok(fresh.reserved.delayed_retention.length === ectx.policy.retentionItems);
  assert.ok(!fresh.available.diagnostic.some((id) => keep.includes(id)));
  assert.ok(!fresh.available.guided_practice.some((id) => keep.includes(id)));
  // in a whole simulated journey, the retention reserve is still unused when the retention check comes
  for (const bank of ["app", "core"] as const) {
    assert.equal((await byId("S2", bank)).final.retention, "demonstrated", bank);
    for (const s of await sims(bank)) assert.equal(s.assistedCountedAsFresh.length, 0, `${bank} ${s.id}`);
  }
});

test("K4-3b the pilot's pools are honoured: a question reserved for one use is never taken for another", () => {
  const pools = ectx.pools!;
  assert.ok(pools.size > 50);
  const el = new Map(itemEligibility(ectx, SVA).map((e) => [e.item, e]));
  for (const [id, pool] of pools) {
    const e = el.get(id);
    if (!e) continue;
    const allowed = { diagnosis: "diagnostic", practice: "guided_practice", confirmation: "independent_verification", retention: "delayed_retention" }[pool];
    assert.ok(e.roles.every((r) => r === allowed), `${id} (${pool}): ${e.roles.join(",")}`);
  }
  const a = allocateItems(ectx, [], SVA);
  for (const id of a.reserved.delayed_retention) assert.equal(pools.get(id) ?? "retention", "retention");
  for (const id of a.reserved.independent_verification) assert.equal(pools.get(id) ?? "confirmation", "confirmation");
  for (const id of a.available.guided_practice) assert.ok(!pools.has(id) || pools.get(id) === "practice", id);
  // the pilot's confirmation and retention pools for agreement were written for lower bands: one question each at
  // the Grade 8 target, which the allocation reports instead of borrowing from another pool
  assert.ok(a.reserved.independent_verification.length < ectx.policy.checkItems);
  assert.match(a.shortfall.join(" "), /for an independent check/);
});

test("K4-4 an exhausted pool gives an honest pending state, and the journey still finishes", async () => {
  const s5 = await byId("S5");
  assert.equal(s5.final.journeyCompleted, true, "never trapped in a loop");
  assert.equal(s5.final.demonstrated, false);
  assert.equal(s5.final.verified, false);
  assert.match(s5.final.pending!, /more reviewed questions are needed/);
  assert.match(s5.steps[0].note!, /independent check/);
});

test("K4-5 a delayed check cannot be completed immediately", async () => {
  const s2 = await byId("S2");
  const retention = s2.steps.find((x) => /retention/.test(x.note ?? ""))!;
  assert.match(retention.note!, /offered early: no/);
  // planned straight after the target was shown: not offered, and early answers do not count
  const events: LedgerEvent[] = [];
  let n = 0;
  const ids = allocateItems(core, [], SVA).reserved.independent_verification;
  for (const [day, id] of [[0, ids[0]], [1, ids[1]], [2, "grm.sva.11"]] as const) events.push(evidence(id, true, day, ++n));
  // reach the target first, with right answers on unseen questions on separate days
  const extra = allocateItems(core, events, SVA).available.diagnostic.slice(0, 3);
  extra.forEach((id, k) => events.push(evidence(id, true, 3 + k, ++n)));
  const now = at(6, 100);
  const outcome = competencyOutcome(core, events, SVA, now);
  if (!outcome.demonstrated) return assert.fail(`setup: expected the target shown (level ${outcome.currentLevel})`);
  assert.equal(outcome.retention, "pending");
  const planned = planCheck(core, events, { id: "check:1", at: now, session: "d6" }, SVA);
  assert.equal(planned.check.kind, "retention");
  assert.ok(planned.check.notBefore >= new Date(Date.parse(outcome.targetShownAt!) + 7 * 86_400_000).toISOString());
  events.push(planned.event as EssayEvent);
  assert.equal(dueCheck(core, events, now), null, "not offered before it is due");
  // answering the reserved questions anyway, today, does not complete retention
  planned.check.items.forEach((i) => events.push(evidence(i.id, true, 6, ++n + 200)));
  const after = competencyOutcome(core, events, SVA, at(6, 400));
  assert.notEqual(after.retention, "demonstrated");
});

test("K4-6 evidence persists across sessions and essays; no question is asked twice", async () => {
  const s6 = await byId("S6");
  assert.match(s6.findings[0], /no question answered twice: yes/);
  assert.ok(s6.steps.at(-1)!.engine.n >= s6.steps[0].engine.n, "the second essay builds on the first's evidence");
});

test("K4-7 no simulated completion creates verified mastery; verified needs a passed delayed check", async () => {
  for (const bank of ["app", "core"] as const) {
    for (const s of await sims(bank)) {
      if (s.verified) assert.equal(s.final.retention, "demonstrated", `${bank} ${s.id}: verified only after the delayed check`);
      if (!s.final.demonstrated) assert.equal(s.verified, false, `${bank} ${s.id}`);
    }
    const s3 = await byId("S3", bank);
    assert.equal(s3.final.journeyCompleted, true);
    assert.equal(s3.verified, false);
    assert.equal(s3.final.demonstrated, false);
  }
});

test("K4-8 retention: failing the delayed check is recorded; one wrong answer alone does not revoke", async () => {
  for (const bank of ["app", "core"] as const) {
    const s4 = await byId("S4", bank);
    assert.equal(s4.final.retention, "not_demonstrated", bank);
    assert.equal(s4.verified, false);
  }
  // core bank: two retention questions (b 5 and 5.5), one right and one wrong: the check still passes
  const s4b = await byId("S4b", "core");
  assert.match(s4b.steps.at(-1)!.note!, /b = 5, 5\.5: one right, one wrong/);
  assert.equal(s4b.final.retention, "demonstrated");
  assert.equal(s4b.verified, true);
});

test("K4-9 band progression: the target is reachable with legitimate evidence; after a failed diagnostic the bank runs out first", async () => {
  for (const bank of ["app", "core"] as const) assert.equal((await byId("S2", bank)).reachedTarget, true, bank);
  // core bank: the journey's check is right, yet the level stays below 5 (estimator), then the bank runs out
  const s1 = await byId("S1", "core");
  assert.equal(s1.reachedTarget, false);
  assert.match(s1.final.pending!, /more reviewed questions are needed/);
  assert.match(s1.findings.join(" "), /cumulative estimate/);
  assert.match(s1.findings.join(" "), /more right answers, one per day, on new reviewed questions/);
  // the app bank: the pilot's confirmation pool has one question at the target, so the journey's check is blocked
  const a1 = await byId("S1", "app");
  assert.equal(a1.reachedTarget, false);
  assert.match(a1.findings.join(" "), /check was blocked/);
  // the simulations are deterministic
  const again = await runScenarios("core");
  assert.deepEqual(again.map((s) => s.final), (await sims("core")).map((s) => s.final));
});
