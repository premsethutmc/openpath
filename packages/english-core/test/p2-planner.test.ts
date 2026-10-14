/**
 * P2: the minimal rule planner (planner.ts). Pure decisions from rule state and policy; synthetic only.
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { INFLECTION_STRATEGIES, PLANNER_POLICY_DRAFT, type RuleState, englishInflections, planRule, projectRuleEvidence } from "../src/index.ts";
import { CAP, engineView, profileContext, runProfile } from "./rule-profiles.ts";

const rule = (name: string): RuleState => {
  const l = runProfile(name).ledger;
  return projectRuleEvidence(l, profileContext().content, englishInflections, engineView(l)).capabilities[CAP].rules.find((r) => r.rule === "double_short")!;
};
const base = { strategies: INFLECTION_STRATEGIES.double_short, now: "2026-10-23T12:00:00.000Z", sessionStartedAt: "2026-10-23T11:00:00.000Z", session: "new", available: { apply: 4, contrast: 1, guided: 8 }, answeredThisSession: 0, guidedThisBlock: 0 };
const iv = (strategy: string, right: number, total: number) => ({ id: strategy, at: "2026-10-23T11:30:00.000Z", strategy, during: { right: 0, total: 4, hints: 4, items: 4, rightFirstTry: 0, rightWithHelp: 0 }, independentAfter: { right, total, newWordRight: right, newWordTotal: total } });

test("P2-1 a weak rule with an active misconception is taught with the first strategy", () => {
  const d = planRule({ ...base, rule: rule("never_doubles") });
  assert.deepEqual([d.action, d.strategy, d.diagnosis.kind], ["teach", "worked_examples", "misconception"]);
  assert.equal(d.policy, PLANNER_POLICY_DRAFT.version);
});

test("P2-2 a failed block changes strategy, never repeats it; after the configured number the planner recommends a person", () => {
  const r = rule("never_doubles");
  const one = planRule({ ...base, rule: { ...r, interventions: [iv("worked_examples", 0, 2)] } });
  assert.deepEqual([one.action, one.strategy], ["teach", "sound_first"]);
  const two = { ...r, interventions: [iv("worked_examples", 0, 2), iv("sound_first", 1, 2)] };
  assert.deepEqual([planRule({ ...base, rule: two }).action, planRule({ ...base, rule: two }).strategy], ["teach", "word_building"]);
  assert.equal(planRule({ ...base, rule: two, policy: { ...PLANNER_POLICY_DRAFT, maxStrategiesBeforeHuman: 2 } }).action, "recommend_human");
});

test("P2-3 a block in progress: guided practice first, then an independent reassessment; no questions left is a content gap, not a move on", () => {
  const r = { ...rule("never_doubles"), interventions: [iv("worked_examples", 0, 0)] };
  assert.equal(planRule({ ...base, rule: r }).action, "guided_practice");
  assert.equal(planRule({ ...base, rule: r, guidedThisBlock: 4 }).action, "reassess");
  const gap = planRule({ ...base, rule: r, guidedThisBlock: 4, available: { apply: 0, contrast: 0, guided: 0 } });
  assert.equal(gap.action, "content_gap");
});

test("P2-4 shown on new words: done, retention pending; a week later: a retention check", () => {
  const r = rule("rule_knower");
  const shown = { ...r, status: "demonstrated" as const, retention: { state: "not_checked" as const, checks: [] }, lastEvidenceAt: "2026-10-23T11:10:00.000Z" };
  const d = planRule({ ...base, rule: shown });
  assert.deepEqual([d.action, d.outcome], ["done", "shown_independently"]);
  assert.equal(planRule({ ...base, rule: shown, now: "2026-10-31T12:00:00.000Z" }).action, "retention_check");
});
