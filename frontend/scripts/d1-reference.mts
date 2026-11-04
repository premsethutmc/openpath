/**
 * D1: the exact input and output records of the seven reference cases for "3x = 19 - 4" (the trusted grader's own replies; timing removed).
 *   node --import tsx scripts/d1-reference.mts <out.json>
 */
import { writeFileSync } from "node:fs";
import { gradeRequest } from "../../packages/learning/src/server-grader.ts";
import { readSubmission } from "../../packages/learning/src/grading/submission.ts";
import { feedbackFromDecision, workingFeedback } from "../src/journey/renderer-adapter.ts";
import type { GradingDecision } from "../../packages/learning/src/grading/decision.ts";

const CASES: [string, string, string][] = [
  ["A", "x = 4", "Incorrect final answer; no verified misconception"],
  ["B", "x = 5", "Correct final answer; no method evidence from a bare answer"],
  ["C", "3x = 15; x = 5", "Correct answer and verified working, if supported by the certificate checker"],
  ["D", "3x = 15; x = 4", "Incorrect final answer; first invalid transformation identified"],
  ["E", "3x = 16; x = 16/3", "Incorrect transformation from the original equation; identify the first invalid step"],
  ["F", "3x = 15", "Valid partial working; incomplete final solution"],
  ["G1", "3x=15 => x=5", "Unsupported or ambiguous notation: no fabricated verdict or method evidence"],
  ["G2", "x = 15/3x", "Unsupported or ambiguous notation: no fabricated verdict or method evidence"],
  ["G3", "divide by 3 so x is 5", "Unsupported or ambiguous notation: no fabricated verdict or method evidence"],
  ["G4", "3x = 15 => x = 5; x = 5", "Unsupported working beside a correct final answer"],
  ["X", "3x = 16; x = 5", "(extra) correct answer reached through invalid working"],
];
const out = CASES.map(([id, typed, required]) => {
  const request = { id: "le-ref-3x-19-4", ...readSubmission(typed, true) };
  const { ms: _ms, ...reply } = gradeRequest(request);
  const d = reply.decision as GradingDecision;
  const fb = feedbackFromDecision(d), wf = workingFeedback(d);
  return { case: id, required, typed, request, reply, shown: { level: fb.level, message: fb.message, evidence: fb.evidence, workingLines: wf?.steps.map((s) => ({ line: s.math.plain || s.description, label: s.description, checked: s.verified, badge: s.verified ? null : s.badge })) ?? [] } };
});
writeFileSync(process.argv[2], JSON.stringify(out, null, 1) + "\n");
console.log(out.map((o) => `${o.case} ${o.reply.verdict} ${o.reply.decision?.working?.status}`).join("\n"));
