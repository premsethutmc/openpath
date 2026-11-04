/**
 * K5: multiple later checks (assessment recovery). While the evidence is insufficient, further independent checks
 * are planned on unseen eligible questions, spaced by the policy (1, 3, 7 days), never offered early, at most
 * followUpChecks of them, and never recycled when the questions run out. Also: the proposed supplement stays
 * provisional (never evidence), and the shadow estimator study reproduces the production estimate.
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { competencyOutcome, dueCheck, type EssayContext, type EssayEvent, EssayRefusal, Ledger, type LedgerEvent, planCheck, plannedChecks, type CodeItem, type Item, itemEligibility } from "../src/index.ts";
import { respond, runScenarios, scenarioRecord, SVA } from "../../../tools/english/assessment-simulations.ts";
import { loadEssayContext } from "../../../tools/english/essay-load.ts";
import { loadContextWithSupplement, loadSupplementItems } from "../../../tools/english/supplement/load.ts";
import { checkSupplement } from "../../../tools/english/supplement/main.ts";
import { METHODS, observationsFrom, shadow } from "../../../tools/english/research/estimator-recovery.ts";

const DAY = 86_400_000;
const T0 = Date.parse("2026-10-19T09:00:00.000Z");
const at = (day: number, minute = 0) => new Date(T0 + day * DAY + minute * 60_000).toISOString();

/** A learner record on agreement: three wrong diagnostic answers (day 0), then teaching. */
function start(ectx: EssayContext): { events: LedgerEvent[]; n: { v: number } } {
  const events: LedgerEvent[] = [];
  const n = { v: 0 };
  const diag = (ectx.ctx.content.byCapability.get(SVA) ?? []).filter((i) => i.kind === "code" && i.b >= 4.5 && i.b < 5 && !ectx.pools?.has(i.id)).slice(0, 3);
  for (const it of diag) answer(ectx, events, n, it.id, false, 0);
  events.push({ kind: "intervention", id: `i${++n.v}`, at: at(0, 50), session: "d0", capability: SVA, strategy: "lesson", content: "lesson" });
  return { events, n };
}

function answer(ectx: EssayContext, events: LedgerEvent[], n: { v: number }, id: string, right: boolean, day: number, minute = n.v) {
  const it = ectx.ctx.content.items.get(id) as Item & CodeItem;
  events.push({ kind: "evidence", id: `e${++n.v}`, at: at(day, minute + 1), session: `d${day}`, item: { id, version: it.version }, response: respond(it, right), use: "assessment", provenance: { schema: "provenance@1", attempt: 1, hints: [], afterFeedback: false, policies: ["passage@1", "assisted@1"] } });
}

/** Plan the next check, try it early, then answer it when due: the first question right, the rest wrong. */
function takeCheck(ectx: EssayContext, events: LedgerEvent[], n: { v: number }, now: string) {
  const p = planCheck(ectx, events, { id: `check:${++n.v}`, at: now, session: "plan" }, SVA);
  events.push(p.event as EssayEvent);
  const early = dueCheck(ectx, events, now);
  const day = Math.ceil((Date.parse(p.check.notBefore) - T0) / DAY);
  p.check.items.forEach((i, k) => answer(ectx, events, n, i.id, k === 0, day, 100 + k));
  return { check: p.check, early, day };
}

const reviewed = loadContextWithSupplement({ asIfReviewed: true });

test("K5-1 later checks continue while evidence is insufficient: spaced 1, 3, 7 days, unseen questions, never early", () => {
  const ectx = reviewed;
  const { events, n } = start(ectx);
  const gaps: number[] = [];
  let from = Math.max(...events.map((e) => Date.parse(e.at)));
  const used = new Set<string>();
  let now = at(0, 60);
  for (let k = 0; k < 3; k++) {
    const o = competencyOutcome(ectx, events, SVA, now);
    assert.equal(o.demonstrated, false, `check ${k + 1}: still not shown`);
    assert.equal(o.next?.kind, "verification");
    const { check, early, day } = takeCheck(ectx, events, n, now);
    assert.equal(early, null, "never offered before notBefore");
    for (const i of check.items) {
      assert.ok(!used.has(i.id), "a question is never asked twice");
      used.add(i.id);
      const e = itemEligibility(ectx, SVA).find((x) => x.item === i.id)!;
      assert.ok(e.roles.includes("independent_verification"), `${i.id} is eligible for an independent check`);
    }
    gaps.push(Math.round(((Date.parse(check.notBefore) - from) / DAY) * 100) / 100);
    from = Math.max(...events.map((e) => Date.parse(e.at)));
    now = at(day, 500);
  }
  // spacing from the previous check's last answer (the first from the last teaching or answer): 1, then 3, then 7 days
  assert.deepEqual(gaps, ectx.policy.followUpSpacingDays);
});

test("K5-2 finite: after followUpChecks later checks, nothing more is planned and the outcome says why", () => {
  const ectx = reviewed;
  const { events, n } = start(ectx);
  let now = at(0, 60);
  for (let k = 0; k < ectx.policy.followUpChecks; k++) now = at(takeCheck(ectx, events, n, now).day, 500);
  const o = competencyOutcome(ectx, events, SVA, now);
  if (o.demonstrated) return; // shown by the third check: nothing more is needed (also finite)
  assert.equal(o.next, null);
  assert.match(o.pending!, /later checks this policy allows have been used/);
  assert.throws(() => planCheck(ectx, events, { id: "check:extra", at: now, session: "plan" }, SVA), EssayRefusal);
  assert.equal(plannedChecks(events).filter((c) => c.kind === "verification").length, ectx.policy.followUpChecks);
});

test("K5-3 a later check with no right answer stops further checks: teaching comes first", () => {
  const ectx = reviewed;
  const { events, n } = start(ectx);
  const p = planCheck(ectx, events, { id: "check:a", at: at(0, 60), session: "plan" }, SVA);
  events.push(p.event as EssayEvent);
  p.check.items.forEach((i, k) => answer(ectx, events, n, i.id, false, 1, 100 + k));
  const o = competencyOutcome(ectx, events, SVA, at(2));
  assert.equal(o.next, null);
  assert.match(o.pending!, /no right answers: teaching again/);
});

test("K5-4 when unseen eligible questions run out, the outcome is pending, never a recycled question", () => {
  const ectx = loadEssayContext(); // core bank: four questions between band 5 and 6.5 for agreement
  const { events, n } = start(ectx);
  let now = at(0, 60);
  const asked = new Set<string>();
  for (let k = 0; k < 5; k++) {
    const o = competencyOutcome(ectx, events, SVA, now);
    if (!o.next) {
      assert.match(o.pending!, /more reviewed questions are needed|later checks this policy allows|no right answers/);
      break;
    }
    const { check, day } = takeCheck(ectx, events, n, now);
    for (const i of check.items) {
      assert.ok(!asked.has(i.id));
      asked.add(i.id);
    }
    now = at(day, 500);
  }
  const answered = events.filter((e) => e.kind === "evidence").map((e) => (e as { item: { id: string } }).item.id);
  assert.equal(new Set(answered).size, answered.length, "no question answered twice");
});

test("K5-5 the proposed supplement: 96 questions, all provisional, never evidence until reviewed; checks pass", () => {
  const items = loadSupplementItems();
  assert.equal(items.length, 96);
  assert.ok(items.every((i) => (i as { evidence_status?: string }).evidence_status === "provisional" && (i as { review?: string }).review === "draft-unreviewed"));
  // loaded beside the app bank as it stands: practice only, and the ledger holds every answer
  const asIs = loadContextWithSupplement();
  for (const i of items.slice(0, 20)) {
    const roles = itemEligibility(asIs, (i as CodeItem).target).find((e) => e.item === i.id)!.roles;
    assert.ok(roles.every((r) => r === "teaching" || r === "guided_practice"), `${i.id}: ${roles.join(",")}`);
  }
  const choice = items.find((i) => (i as CodeItem).format.startsWith("choice")) as Item & CodeItem;
  const L = Ledger.rebuild(asIs.ctx, "k5", [{ kind: "evidence", id: "e1", at: at(0), session: "d0", item: { id: choice.id, version: choice.version }, response: respond(choice, true), use: "assessment", provenance: { schema: "provenance@1", attempt: 1, hints: [], afterFeedback: false, policies: ["passage@1", "assisted@1"] } }]);
  assert.equal(L.decisions[0].verdict, "held");
  // the app's own content never loads the proposal
  const app = loadEssayContext();
  assert.ok(!items.some((i) => app.ctx.content.items.has(i.id)));
  const { findings } = checkSupplement();
  assert.deepEqual(findings.filter((f) => f.severity === "blocking"), []);
});

test("K5-6 shadow study: the re-implemented production estimator reproduces the ledger; alternatives stay shadow-only", async () => {
  for (const bank of ["core", "reviewed-supplement"] as const)
    for (const r of await runScenarios(bank)) {
      const { events, ectx } = scenarioRecord(r);
      const { obs, instructions } = observationsFrom(events, ectx.ctx, SVA);
      if (!obs.length) continue;
      const L = Ledger.rebuild(ectx.ctx, "k5", events);
      const node = L.composite.nodes[SVA];
      const t = shadow("cumulative", obs, instructions).at(-1)!;
      // compare at the ledger's own time for agreement (later answers on other skills do not inflate it)
      if (node.asOf === obs.at(-1)!.at) {
        assert.ok(Math.abs(t.mean - node.direct.mean) < 1e-9, `${bank} ${r.id} mean`);
        assert.ok(Math.abs(t.sd ** 2 - node.direct.variance) < 1e-9, `${bank} ${r.id} variance`);
      }
      for (const m of METHODS) assert.ok(shadow(m, obs, instructions).length === obs.length);
    }
});
