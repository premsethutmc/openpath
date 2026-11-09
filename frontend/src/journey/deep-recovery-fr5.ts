/**
 * Phase 5 (confidence): why each phase-4 false-reassurance run passed. Re-runs the run exactly (simulate4 is deterministic per
 * seed) and lists the answers on the goal skill: item, format (typed / choice), options, right?, could the learner model do it
 * (a right answer it could not do = lucky). One JSON line per run.
 *   node --import tsx src/journey/deep-recovery-fr5.ts <phase-4 jsonl>...
 */
import { readFileSync } from "node:fs";
import { question } from "../../../packages/learning/src/content";
import { gradeRequest } from "../../../packages/learning/src/server-grader";
import { ORIGINALS } from "./deep-recovery-sim3";
import { simulate4 } from "./deep-recovery-sim4";

for (const f of process.argv.slice(2)) for (const line of readFileSync(f, "utf8").split("\n")) {
  if (!line.startsWith("{")) continue;
  const d = JSON.parse(line);
  if (d.outcome !== "false-reassurance") continue;
  const own = ORIGINALS[d.orig as "O1"].own;
  const goal: Record<string, unknown>[] = [];
  const r = simulate4(d.engine, d.orig, d.type, d.seed, (x) => {
    const b = x.qid.replace(/:(mc|w)$/, "");
    if (question(b).competency !== own) return;
    const opts = question(b).options?.length ?? 0;
    const choice = x.qid.endsWith(":mc") || opts > 0;
    const right = gradeRequest({ id: x.qid, response: x.answer }).credit === true;
    goal.push({ qid: x.qid, format: choice ? "choice" : "typed", options: choice ? Math.max(opts, 4) : null, right, lucky: right && !x.can, sitting: x.phase + 1 });
  }) as Record<string, unknown>;
  const claim = goal.filter((g) => g.right).slice(-2);
  console.log(JSON.stringify({ file: f.split("/").pop(), engine: d.engine, orig: d.orig, type: d.type, seed: d.seed, reproduced: r.outcome === d.outcome, enginePhase: d.enginePhase, diagnosis: d.diagnosis,
    path: d.enginePhase === "solved" && goal.length === 1 ? "first-try" : d.enginePhase === "solved" ? "slip-check" : "after-help",
    goalAnswers: goal, claimFormats: claim.map((g) => g.format), luckyInClaim: claim.filter((g) => g.lucky).length, lessons: d.lessons }));
}
