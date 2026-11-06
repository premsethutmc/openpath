/**
 * R1: the read-only rule-level evidence projection (first increment of the learner-vector proposal).
 *
 * Synthetic learners only: passing shows the projection applies its draft policy as written and leaves the
 * engine untouched. It is not educational validation, and the policy values are drafts for review.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import {
  type RuleState,
  INFLECTION_RULES,
  Ledger,
  RULE_EVIDENCE_POLICY_DRAFT,
  betaCdf,
  betaQuantile,
  capabilityClaim,
  englishInflections,
  isAdjacentSwap,
  projectRuleEvidence,
} from "../src/index.ts";
import { CONTENT } from "../../../tools/english/load.ts";
import { CAP, PROFILES, engineView, profileContext, runProfile } from "./rule-profiles.ts";

/** A first, unaided answer under provenance@1. */
const IND = { schema: "provenance@1" as const, attempt: 1, hints: [] as string[], afterFeedback: false };
const project = (l: Ledger) => projectRuleEvidence(l, profileContext().content, englishInflections, engineView(l));
const rulesOf = (l: Ledger) => project(l).capabilities[CAP].rules;
const rule = (l: Ledger, id: string) => rulesOf(l).find((r) => r.rule === id)!;
const prefix = (name: string, upTo: number) => {
  const r = runProfile(name);
  return Ledger.rebuild(profileContext(), name, r.events.slice(0, upTo));
};

// ---------------------------------------------------------------- the subject module

test("R1-0 the English module's rules are the capability's ladder steps, each required from its descriptor's band", () => {
  const ladder = JSON.parse(readFileSync(`${CONTENT}/items/progressions.json`, "utf8")).capabilities[CAP].steps as { id: string; descriptor: string }[];
  assert.deepEqual(
    INFLECTION_RULES.map((r) => [r.id, r.requiredFromBand]),
    ladder.map((s) => [s.id, Number(s.descriptor)]),
  );
  assert.ok(isAdjacentSwap("smiled", "smield") && !isAdjacentSwap("smiled", "smileed") && !isAdjacentSwap("hoping", "hopping"));
});

test("R1-0 draft policy: the smallest evidence for 'demonstrated' and 'weak' is what the documentation states", () => {
  const p = RULE_EVIDENCE_POLICY_DRAFT;
  const demonstrated = (r: number, n: number) => n >= p.demonstratedMinApplications && betaQuantile(p.demonstratedQuantile, 1 + r, 1 + n - r) >= p.demonstratedLowerBound;
  const weak = (r: number, n: number) => n >= p.minApplications && betaCdf(p.weakRate, 1 + r, 1 + n - r) >= p.weakProbability;
  // demonstrated: 4/4, 5/5, 5/6, 6/7, 7/8 (never 3 of anything; 4 of 5 is not enough)
  for (const [r, n] of [[4, 4], [5, 5], [5, 6], [6, 7], [7, 8]]) assert.ok(demonstrated(r, n), `${r}/${n}`);
  for (const [r, n] of [[3, 3], [4, 5], [5, 7], [6, 8]]) assert.ok(!demonstrated(r, n), `${r}/${n}`);
  // weak: 0/3, 1/4, 2/7, 2/8 (but not 1/3 or 3/8)
  for (const [r, n] of [[0, 3], [1, 4], [2, 7], [2, 8]]) assert.ok(weak(r, n), `${r}/${n}`);
  for (const [r, n] of [[0, 2], [1, 3], [3, 8]]) assert.ok(!weak(r, n), `${r}/${n}`);
});

// ---------------------------------------------------------------- the learners

test("R1-1 never doubles: doubling is weak with an active misconception, and the engine's 'mastered 4.0' is not supported", () => {
  const { ledger } = runProfile("never_doubles");
  const p = project(ledger).capabilities[CAP];
  const d = p.rules.find((r) => r.rule === "double_short")!;
  assert.equal(d.status, "weak");
  assert.deepEqual([d.current.right, d.current.total], [0, 7]);
  assert.equal(d.misconceptions.find((m) => m.tag === "no_doubling")?.state, "active");
  for (const id of ["drop_e", "y_to_i"]) assert.equal(rule(ledger, id).status, "verified", id);
  // the engine's own view is reported unchanged ...
  assert.equal(p.claim.engine.mastered, 4);
  // ... but the claim does not support it, and names doubling as the reason
  assert.equal(p.claim.engineMasteryLabelSupported, false);
  assert.ok(p.claim.unverified.some((u) => u.rule === "double_short" && u.status === "weak"));
});

test("R1-2 unrelated-rule success does not clear a misconception: no_doubling stays active through 10 correct silent e and y to i answers", () => {
  const r = runProfile("never_doubles");
  const atDoublingCheck = rule(prefix("never_doubles", r.stageEnds.checkA), "double_short").misconceptions.find((m) => m.tag === "no_doubling")!;
  const afterOtherRules = rule(prefix("never_doubles", r.stageEnds.checkC), "double_short").misconceptions.find((m) => m.tag === "no_doubling")!;
  assert.equal(atDoublingCheck.state, "active");
  assert.equal(afterOtherRules.state, "active");
  assert.deepEqual(afterOtherRules.errors, atDoublingCheck.errors);
  assert.deepEqual(afterOtherRules.history, atDoublingCheck.history);
  // the engine's own tag did fade over the same answers (unchanged behaviour, reported for contrast)
  const engineTag = (l: Ledger) => l.composite.nodes[CAP].misconceptions.no_doubling?.strength ?? 0;
  assert.ok(engineTag(prefix("never_doubles", r.stageEnds.checkC)) < 0.3 && engineTag(prefix("never_doubles", r.stageEnds.checkA)) > 0.8);
});

test("R1-3 a provisionally resolved misconception keeps its history, and a recurrence makes it active again", () => {
  // the recovering pattern, built from the draft questions: errors on day 0, then correct new words and contrasts on two later days
  const ctx = profileContext();
  const l = new Ledger(ctx, "recovers");
  const at = (day: number, min: number) => new Date(Date.parse("2026-10-14T09:00:00Z") + day * 86_400_000 + min * 60_000).toISOString();
  const ans = (id: string, text: string, day: number, min: number, session: string) => l.apply({ kind: "evidence", id: `${id}-${day}-${min}`, at: at(day, min), session, item: { id, version: 1 }, response: { kind: "typed", text }, provenance: IND });
  ans("spl.infl.18", "choping", 0, 1, "d0");
  ans("spl.infl.19", "stoped", 0, 2, "d0");
  ans("spl.infl.22", "triming", 0, 3, "d0");
  ans("spl.infl.21", "digging", 1, 1, "d1");
  ans("spl.infl.24", "jumping", 1, 2, "d1");
  ans("spl.infl.20", "bigger", 2, 1, "d2");
  ans("spl.infl.23", "wettest", 2, 2, "d2");
  let m = rule(l, "double_short").misconceptions.find((x) => x.tag === "no_doubling")!;
  assert.equal(m.state, "provisionally_resolved");
  assert.deepEqual(m.history.map((h) => h.state), ["suspected", "active", "improving", "provisionally_resolved"]);
  assert.equal(m.errors.length, 3);
  ans("spl.infl.11", "runing", 3, 1, "d3");
  m = rule(l, "double_short").misconceptions.find((x) => x.tag === "no_doubling")!;
  assert.equal(m.state, "active");
  assert.equal(m.recurrences, 1);
  assert.deepEqual(m.history.map((h) => h.state), ["suspected", "active", "improving", "provisionally_resolved", "active"]);
});

test("R1-4 memoriser: weak on new words with a transfer gap; errors stay 'suspected', not misconceptions", () => {
  const { ledger } = runProfile("memoriser");
  for (const id of ["double_short", "drop_e", "y_to_i"]) {
    const r = rule(ledger, id);
    assert.equal(r.status, "weak", id);
    assert.equal(r.transferGap, true, id);
    assert.deepEqual([r.practice.right, r.practice.total], [8, 8], id);
    assert.ok(r.misconceptions.every((m) => m.state === "suspected"), id);
  }
  assert.equal(project(ledger).capabilities[CAP].claim.engineMasteryLabelSupported, false);
});

test("R1-5 guesser: no rule demonstrated, answers flagged inconsistent, no active misconception", () => {
  const { ledger } = runProfile("guesser");
  const rules = rulesOf(ledger).filter((r) => ["double_short", "drop_e", "y_to_i"].includes(r.rule));
  for (const r of rules) {
    assert.ok(!["demonstrated", "verified"].includes(r.status), r.rule);
    assert.ok(r.misconceptions.every((m) => m.state !== "active"), r.rule);
  }
  assert.ok(rules.filter((r) => r.inconsistent).length >= 2);
  const claim = project(ledger).capabilities[CAP].claim;
  assert.equal(claim.engine.mastered, 3); // the engine's label, unchanged
  assert.equal(claim.engineMasteryLabelSupported, false);
});

test("R1-6 careless: swapped letters are slips, never misconceptions, and never make a rule weak", () => {
  const { ledger, answers } = runProfile("careless");
  const rules = rulesOf(ledger).filter((r) => ["double_short", "drop_e", "y_to_i"].includes(r.rule));
  assert.ok(answers.some((a) => !a.correct), "the run must contain slips to test anything");
  assert.equal(rules.reduce((s, r) => s + r.slips, 0), answers.filter((a) => !a.correct && !a.stage.startsWith("practice")).length);
  for (const r of rules) {
    assert.ok(!["weak", "inconsistent", "needs_reconfirmation"].includes(r.status), r.rule);
    assert.equal(r.misconceptions.length, 0, r.rule);
  }
});

test("R1-7 forgets after day 9: history kept, current retention failed, 'needs reconfirmation', engine numbers unchanged", () => {
  const { ledger } = runProfile("forgets");
  const d = rule(ledger, "double_short");
  assert.equal(d.status, "needs_reconfirmation");
  assert.equal(d.retention.state, "failed");
  assert.equal(d.history.firstDemonstratedAt?.slice(0, 10), "2026-10-14");
  assert.equal(d.retention.checks.at(-1)!.ruleErrors, 2);
  const claim = project(ledger).capabilities[CAP].claim;
  assert.equal(claim.engine.verification, "verified"); // the engine still says verified ...
  assert.equal(claim.engineMasteryLabelSupported, false); // ... and the projection says doubling is not
  assert.ok(claim.unverified.some((u) => u.rule === "double_short" && u.status === "needs_reconfirmation"));
});

test("R1-8 missing evidence is not weakness: no answers or too few answers give 'insufficient evidence'; three wrong give 'weak'", () => {
  const ctx = profileContext();
  const l = new Ledger(ctx, "few");
  const t = (m: number) => new Date(Date.parse("2026-10-14T09:00:00Z") + m * 60_000).toISOString();
  const wrong = [["spl.infl.fx34", "tryed"], ["spl.infl.fx35", "babys"], ["spl.infl.fx36", "easyer"]];
  for (const [i, [id, text]] of wrong.slice(0, 2).entries()) l.apply({ kind: "evidence", id: `f${i}`, at: t(i), session: "s", item: { id, version: 1 }, response: { kind: "typed", text }, provenance: IND });
  assert.equal(rule(l, "y_to_i").status, "insufficient_evidence");
  assert.equal(rule(l, "plain").status, "insufficient_evidence"); // never asked
  l.apply({ kind: "evidence", id: "f2", at: t(2), session: "s", item: { id: wrong[2][0], version: 1 }, response: { kind: "typed", text: wrong[2][1] }, provenance: IND });
  assert.equal(rule(l, "y_to_i").status, "weak");
  assert.equal(rule(l, "plain").status, "insufficient_evidence");
  // and in every profile, rules never asked about are insufficient evidence, never weak
  for (const name of Object.keys(PROFILES)) for (const id of ["plain", "es_plural", "stress_doubling"]) assert.equal(rule(runProfile(name).ledger, id).status, "insufficient_evidence", `${name} ${id}`);
});

test("R1-9 the claim guard: mastery is supported only up to the first band whose required rules are not all verified", () => {
  const st = (rule: string, band: number, status: RuleState["status"]) => ({ rule, requiredFromBand: band, status }) as RuleState;
  const engine = (mastered: number | null) => ({ mean: 5, sd: 0.4, demonstrated: mastered, mastered, verification: "verified" });
  const ok = [st("plain", 2, "verified"), st("es_plural", 2, "verified"), st("double_short", 4, "verified"), st("drop_e", 4, "verified"), st("stress_doubling", 6, "insufficient_evidence")];
  assert.equal(capabilityClaim(engine(5), ok, CAP).supportedMasteryBand, 5);
  assert.equal(capabilityClaim(engine(5), ok, CAP).engineMasteryLabelSupported, true);
  assert.equal(capabilityClaim(engine(6.5), ok, CAP).supportedMasteryBand, 5.5);
  const weakDoubling = ok.map((r) => (r.rule === "double_short" ? st("double_short", 4, "weak") : r));
  const c = capabilityClaim(engine(4), weakDoubling, CAP);
  assert.deepEqual([c.supportedMasteryBand, c.engineMasteryLabelSupported, c.rulesVerifiedThroughBand], [3.5, false, 2]);
  assert.equal(capabilityClaim(engine(null), ok, CAP).supportedMasteryBand, null);
});

// ---------------------------------------------------------------- the engine is untouched

test("R1-10 capability estimates are byte-identical with the projection, and replay is deterministic", () => {
  for (const name of Object.keys(PROFILES)) {
    const run = runProfile(name);
    const before = JSON.stringify(run.ledger.composite);
    const decisionsBefore = JSON.stringify(run.ledger.decisions);
    const first = project(run.ledger);
    assert.equal(JSON.stringify(run.ledger.composite), before, `${name}: composite changed`);
    assert.equal(JSON.stringify(run.ledger.decisions), decisionsBefore, `${name}: decisions changed`);
    const rebuilt = Ledger.rebuild(profileContext(), name, run.events);
    assert.equal(JSON.stringify(rebuilt.composite), before, `${name}: rebuild differs`);
    assert.deepEqual(project(rebuilt), first, `${name}: projection differs after rebuild`);
    assert.deepEqual(project(run.ledger), first, `${name}: projection is not repeatable`);
  }
});

// ---------------------------------------------------------------- review fixes (PR #15 review)

const seq = (label: string, steps: [string, string, number, number, string][]) => {
  const ctx = profileContext();
  const l = new Ledger(ctx, label);
  const at = (d: number, m: number) => new Date(Date.parse("2026-10-14T09:00:00Z") + d * 86_400_000 + m * 60_000).toISOString();
  steps.forEach(([id, text, d, m, s], k) => l.apply({ kind: "evidence", id: `${label}${k}`, at: at(d, m), session: s, item: { id, version: ctx.content.items.get(id)!.version }, response: { kind: "typed", text }, provenance: IND }));
  return l;
};
const shown: [string, string, number, number, string][] = [
  ["spl.infl.18", "chopping", 0, 1, "a"],
  ["spl.infl.19", "stopped", 0, 2, "a"],
  ["spl.infl.22", "trimming", 0, 3, "a"],
  ["spl.infl.21", "digging", 0, 4, "a"],
  ["spl.infl.24", "jumping", 0, 5, "a"],
];

test("R1-11 practice earlier in the same session is not delayed recall: the check after it does not verify", () => {
  const l = seq("practice-then-check", [...shown, ["gen.infl.add_ending.batting", "batting", 9, 1, "b"], ["gen.infl.add_ending.cutting", "cutting", 9, 2, "b"], ["spl.infl.20", "bigger", 9, 3, "b"], ["spl.infl.23", "wettest", 9, 4, "b"]]);
  const d = rule(l, "double_short");
  assert.equal(d.status, "demonstrated");
  assert.equal(d.retention.state, "not_checked");
  assert.equal(d.history.firstVerifiedAt, null);
  // the same answers in a session of their own, 9 days on, do verify
  const clean = rule(seq("check-alone", [...shown, ["spl.infl.20", "bigger", 9, 3, "b"], ["spl.infl.23", "wettest", 9, 4, "b"]]), "double_short");
  assert.equal(clean.status, "verified");
});

test("R1-12 a delayed check is judged on the whole session: an error after two right answers fails it, and nothing was ever 'verified'", () => {
  const d = rule(seq("partial", [...shown, ["spl.infl.20", "bigger", 9, 1, "b"], ["spl.infl.23", "wettest", 9, 2, "b"], ["spl.infl.11", "runing", 9, 3, "b"]]), "double_short");
  assert.equal(d.status, "needs_reconfirmation");
  assert.equal(d.history.firstVerifiedAt, null);
  assert.ok(!d.history.statusChanges.some((c) => c.status === "verified"));
});

test("R1-13 a misconception that was 'not confirmed' and is seen again goes back to 'suspected', with both events in its history", () => {
  const l = seq("seen-again", [
    ["spl.infl.18", "choping", 0, 1, "a"],
    ["spl.infl.19", "stopped", 0, 2, "a"],
    ["spl.infl.22", "trimming", 1, 1, "b"],
    ["spl.infl.24", "jumping", 1, 2, "b"],
    ["spl.infl.21", "digging", 1, 3, "b"],
    ["spl.infl.20", "biggr", 2, 1, "c"],
    ["spl.infl.23", "wetst", 2, 2, "c"],
    ["spl.infl.11", "runing", 2, 3, "c"],
  ]);
  const m = rule(l, "double_short").misconceptions.find((x) => x.tag === "no_doubling")!;
  assert.deepEqual(m.history.map((h) => h.state), ["suspected", "not_confirmed", "suspected"]);
});
