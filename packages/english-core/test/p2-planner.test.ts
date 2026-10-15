/**
 * P2: the minimal rule planner (planner.ts). Pure decisions from rule state and policy; synthetic only.
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { INFLECTION_STRATEGIES, PLANNER_POLICY_DRAFT, type RuleState, englishInflections, planRule, projectRuleEvidence, rateOf } from "../src/index.ts";
import { CAP, engineView, profileContext, runProfile } from "./rule-profiles.ts";

const rule = (name: string): RuleState => {
  const l = runProfile(name).ledger;
  return projectRuleEvidence(l, profileContext().content, englishInflections, engineView(l)).capabilities[CAP].rules.find((r) => r.rule === "double_short")!;
};
const base = { strategies: INFLECTION_STRATEGIES.double_short, now: "2026-10-23T12:00:00.000Z", sessionStartedAt: "2026-10-23T11:00:00.000Z", session: "new", available: { apply: 4, contrast: 1, guided: 8 }, answeredThisSession: 0, guidedThisBlock: 0 };
/** A teaching block: right/total on new "must double" words after it, and (by default, once any were asked) one contrast answered right. */
const iv = (strategy: string, right: number, total: number, contrastRight = total ? 1 : 0, contrastTotal = total ? 1 : 0) => ({
  id: strategy,
  at: "2026-10-23T11:30:00.000Z",
  strategy,
  during: { right: 0, total: 4, hints: 4, items: 4, rightFirstTry: 0, rightWithHelp: 0 },
  independentAfter: { right: right + contrastRight, total: total + contrastTotal, newWordRight: right, newWordTotal: total, contrastRight, contrastTotal, lastAt: total + contrastTotal ? "2026-10-23T11:40:00.000Z" : null },
});

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

test("P2-5 reassessment checks both using and withholding the rule: apply, then a contrast, then apply; a missing contrast is a content gap", () => {
  const r = rule("never_doubles");
  const at = (right: number, total: number, cr: number, ct: number) => planRule({ ...base, rule: { ...r, interventions: [iv("worked_examples", right, total, cr, ct)] }, guidedThisBlock: 4 });
  assert.deepEqual([at(0, 0, 0, 0).action, at(0, 0, 0, 0).itemRole], ["reassess", "apply"]);
  assert.deepEqual([at(1, 1, 0, 0).action, at(1, 1, 0, 0).itemRole], ["reassess", "contrast"]);
  assert.deepEqual([at(1, 1, 1, 1).action, at(1, 1, 1, 1).itemRole], ["reassess", "apply"]);
  const noContrast = planRule({ ...base, rule: { ...r, interventions: [iv("worked_examples", 1, 1, 0, 0)] }, guidedThisBlock: 4, available: { apply: 3, contrast: 0, guided: 0 } });
  assert.equal(noContrast.action, "content_gap");
  assert.match(noContrast.reason, /must not double/);
});

test("P2-6 a learner who doubles everything cannot pass a reassessment: every apply item right, the contrast wrong, the block fails", () => {
  const r = rule("never_doubles");
  const d = planRule({ ...base, rule: { ...r, interventions: [iv("worked_examples", 2, 2, 0, 1)] } });
  assert.deepEqual([d.action, d.strategy], ["teach", "sound_first"]);
  const passed = planRule({ ...base, rule: { ...r, interventions: [iv("worked_examples", 2, 2, 1, 1)] }, sessionStartedAt: "2026-10-23T11:00:00.000Z" });
  assert.deepEqual([passed.action, passed.outcome], ["done", "improved_after_teaching"]);
});

test("P2-7 a recognised slip does not use up the diagnostic budget, and the budget alone never leads to teaching without a rule error", () => {
  const clean: RuleState = { ...rule("rule_knower"), status: "emerging", current: rateOf(3, 3), contrast: { right: 1, total: 1, lastCorrect: true }, misconceptions: [], interventions: [] };
  // five answers, one of them a slip: four count, so another question is asked
  assert.equal(planRule({ ...base, rule: clean, answeredThisSession: 5, slipsThisSession: 1 }).action, "assess");
  // even past the budget, no rule error: keep asking rather than teach
  assert.equal(planRule({ ...base, rule: clean, answeredThisSession: 7 }).action, "assess");
  // nothing left to ask: insufficient evidence, reported as a content gap, not a learning deficit
  const gap = planRule({ ...base, rule: clean, answeredThisSession: 6, slipsThisSession: 1, available: { apply: 0, contrast: 0, guided: 8 } });
  assert.deepEqual([gap.action, gap.diagnosis.kind], ["content_gap", "insufficient_evidence"]);
  // with a real rule error the budget leads to teaching as before
  const oneError: RuleState = { ...clean, current: rateOf(2, 3) };
  assert.equal(planRule({ ...base, rule: oneError, answeredThisSession: 5 }).action, "teach");
  assert.equal(planRule({ ...base, rule: oneError, answeredThisSession: 5, slipsThisSession: 1 }).action, "assess");
});

test("P2-8 over-doubling with every apply item right is taught as when not to double, not as 'not yet right on new words'", () => {
  const over: RuleState = { ...rule("rule_knower"), status: "emerging", current: rateOf(4, 4), contrast: { right: 0, total: 1, lastCorrect: false }, misconceptions: [], interventions: [] };
  const d = planRule({ ...base, rule: over, answeredThisSession: 5 });
  assert.equal(d.action, "teach");
  assert.match(d.reason, /should not be doubled/);
});
