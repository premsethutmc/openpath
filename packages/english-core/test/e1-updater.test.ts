import assert from "node:assert/strict";
import { test } from "node:test";
import { Ledger, leafView } from "../src/index.ts";
import { EMAIL, T, ctx, judgement, proposal, proposalBody, qualified, withProposal, writingEvidence } from "./helpers.ts";
import { runAll, faultInjection } from "../../../tools/english/sim/simulate.ts";

const RUN = "EN.SEN.CMP.run_ons";
const TASK = "EN.WRT.TSK.task_response";
const SPELL = "EN.WRT.ACC.spelling";
const verdicts = (l: Ledger, source = "p1") => l.decisions.filter((d) => d.source === source).map((d) => `${d.capability ?? "*"}:${d.verdict}`);
const reasons = (l: Ledger, source = "p1") => l.decisions.filter((d) => d.source === source).flatMap((d) => d.reasons).join(" | ");

test("E1-6 a well-formed proposal from a qualified evaluator is accepted and moves only its capabilities", () => {
  const l = withProposal(proposal(proposalBody([judgement(RUN, 4.5), judgement(TASK, 5)])));
  assert.deepEqual(verdicts(l), [`${RUN}:accepted`, `${TASK}:accepted`]);
  assert.ok(leafView(l.composite, ctx().index, RUN, T(7)).direct.n === 1);
});

test("E1-6 check 1: malformed, misdirected and repeated proposals are rejected or ignored", () => {
  assert.match(reasons(withProposal(proposal({ nonsense: true }))), /check 1/);
  assert.match(reasons(withProposal(proposal(proposalBody([judgement(RUN)], "w-missing"), "p1", "eval:test", "w-missing"))), /check 1: the evidence/);
  const twice = withProposal(proposal(proposalBody([judgement(RUN)])), proposal(proposalBody([judgement(RUN)])));
  assert.deepEqual(twice.decisions.filter((d) => d.source === "p1").map((d) => d.verdict), ["accepted", "ignored"]);
});

test("E1-6 check 2: a judgement about a capability the task cannot show is rejected", () => {
  assert.match(reasons(withProposal(proposal(proposalBody([judgement("EN.RDG.INF.motives")])))), /check 2/);
});

test("E1-6 check 3: bands off the scale or far outside the task's range are rejected", () => {
  assert.match(reasons(withProposal(proposal(proposalBody([judgement(RUN, 9.5)])))), /check 3/);
  assert.match(reasons(withProposal(proposal(proposalBody([judgement(RUN, 0.5)])))), /check 3/);
});

test("E1-6 check 4: a quote the learner never wrote is rejected; missing quotes too", () => {
  assert.match(reasons(withProposal(proposal(proposalBody([judgement(RUN, 4, { quotes: ["In conclusion, I agree"] })])))), /check 4: quote not found/);
  assert.match(reasons(withProposal(proposal(proposalBody([judgement(RUN, 4, { quotes: [] })])))), /check 4: no quoted/);
  // whitespace and curly quotes do not cause false rejections
  assert.deepEqual(verdicts(withProposal(proposal(proposalBody([judgement(RUN, 4, { quotes: ["I  would like to\nask you"] })])))), [`${RUN}:accepted`]);
});

test("E1-6 check 5: unknown misconception tags are dropped, listed ones kept", () => {
  const l = withProposal(proposal(proposalBody([judgement(RUN, 4, { misconceptions: ["comma_splice", "made_up_tag"] })])));
  assert.match(reasons(l), /check 5: dropped unknown misconception tag\(s\) made_up_tag/);
  assert.ok("comma_splice" in l.composite.nodes[RUN].misconceptions);
  assert.ok(!("made_up_tag" in l.composite.nodes[RUN].misconceptions));
});

test("E1-6 check 6: judgements that contradict what code can check are held", () => {
  const misspelt = "dear mrs rao i want a book becos my freind has it and i realy like it it is intresting plz order it thankyou becuase it is good and libary has no copy";
  const l = Ledger.rebuild(ctx(), "x", [qualified(), writingEvidence(misspelt), proposal(proposalBody([judgement(SPELL, 7.5, { quotes: ["dear mrs rao"] })]))]);
  assert.match(reasons(l), /check 6: \d+ common misspellings/);
  const short = Ledger.rebuild(ctx(), "x", [qualified(), writingEvidence("Dear Mrs. Rao, please order a space book. Thanks."), proposal(proposalBody([judgement(TASK, 6, { quotes: ["please order a space book"] })]))]);
  assert.match(reasons(short), /check 6: \d+ words/);
});

test("E1-6 check 7: proposals from an unqualified or drifting evaluator are held", () => {
  assert.match(reasons(withProposal(proposal(proposalBody([judgement(RUN)]), "p1", "eval:unknown"))), /check 7: evaluator eval:unknown is not qualified/);
  const drift = Ledger.rebuild(ctx(), "x", [{ ...qualified("eval:d"), drifting: true }, writingEvidence(), proposal(proposalBody([judgement(RUN)]), "p1", "eval:d")]);
  assert.match(reasons(drift), /drifting/);
});

test("E1-6 check 8: off-task, too short, copied or safeguarding responses change nothing", () => {
  for (const flag of ["off_task", "too_short", "possibly_copied", "safeguarding"]) {
    const flags = { off_task: false, too_short: false, possibly_copied: false, safeguarding: false, [flag]: true };
    const l = withProposal(proposal(proposalBody([judgement(RUN)], "w1", { flags })));
    assert.deepEqual(verdicts(l), ["*:rejected"], flag);
  }
  assert.match(reasons(withProposal(proposal(proposalBody([judgement(RUN)], "w1", { flags: { off_task: false, too_short: false, possibly_copied: false, safeguarding: true } })))), /safeguarding process/);
});

test("E1-6 check 9: a very surprising judgement is held until a second evaluation agrees", () => {
  // make the learner's run-ons estimate precise and low with three earlier writing samples
  const events = [qualified(), qualified("eval:second")];
  for (let i = 0; i < 6; i++) events.push(writingEvidence(EMAIL, `w${i}`, i * 2) as never, proposal(proposalBody([judgement(RUN, 2.5)], `w${i}`), `p${i}`, "eval:test", `w${i}`, i * 2 + 1) as never);
  events.push(writingEvidence(EMAIL, "wx", 30) as never);
  const first = proposal(proposalBody([judgement(RUN, 7.5)], "wx"), "px", "eval:test", "wx", 31);
  const held = Ledger.rebuild(ctx(), "x", [...events, first]);
  assert.match(reasons(held, "px"), /check 9/);
  const second = proposal(proposalBody([judgement(RUN, 7)], "wx"), "py", "eval:second", "wx", 32);
  const agreed = Ledger.rebuild(ctx(), "x", [...events, first, second]);
  assert.match(reasons(agreed, "py"), /second evaluation agrees/);
  assert.deepEqual(verdicts(agreed, "py"), [`${RUN}:accepted`]);
});

test("E1-6 check 10: one evaluation never moves a mean more than 0.75 bands", () => {
  const l = withProposal(proposal(proposalBody([judgement(TASK, 7.5, { confidence: "high" })])));
  const d = l.decisions.find((x) => x.source === "p1")!;
  assert.equal(d.verdict, "accepted");
  assert.ok(Math.abs(d.after!.mean - d.before!.mean) <= 0.75 + 1e-9);
  assert.match(d.reasons.join(), /check 10/);
});

test("E1-6 check 11: a proposal cannot set an estimate or a stage, and one evaluation never demonstrates anything", () => {
  for (const extra of [{ stage: "mastered" }, { mean: 7 }, { new_estimate: 6 }]) {
    const l = withProposal(proposal(proposalBody([judgement(RUN, 5, extra)])));
    assert.deepEqual(verdicts(l), ["*:rejected"]);
    assert.match(reasons(l), /may only propose observations/);
  }
  const top = withProposal(proposal(proposalBody([judgement(RUN, 5)], "w1", { set_stage: "mastered" })));
  assert.deepEqual(verdicts(top), ["*:rejected"]);
  const one = withProposal(proposal(proposalBody([judgement(RUN, 7, { confidence: "high" })])));
  assert.equal(leafView(one.composite, ctx().index, RUN, T(10)).demonstrated, null);
});

test("E1-6 fault injection across all ten simulated learners: no faulty evaluator output is ever applied", async () => {
  const results = await runAll(ctx());
  const safety = await faultInjection(ctx(), results);
  assert.ok(safety.total >= 250, `${safety.total} injected faults`);
  assert.equal(safety.applied, 0, JSON.stringify(safety.byCase));
});
