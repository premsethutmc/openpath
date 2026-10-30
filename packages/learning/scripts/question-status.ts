/**
 * Write the question-status registry (GENERATED; a test checks it is current):
 *
 *   content/learning/question-status.v1.json   every released presentation (typed, :mc, :w) that must not be selected or
 *                                              authoritatively graded, with its reason. Read by the app (question-status.ts)
 *                                              and by the server (backend/family/question_status.py).
 *
 * Generated entries come from the contract builder: a presentation whose contract is "held" (the independent statement does not
 * match what the learner is shown) is quarantined for "contract-inconsistency". Manual entries (MANUAL below) are added by a
 * reviewed change. Nothing is deleted: a quarantined question keeps its definition and its historical records.
 *
 *   bun packages/learning/scripts/question-status.ts
 */
import { createHash } from "node:crypto";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { contractFor } from "../src/assessment";
import { FAMILIES, pool, problemOf } from "../src/families";
import { contractV2 } from "../src/grading/contract";

// aofclass (release preparation, 2026-10-29): invalid as written — the stated codomain excludes a value f takes, so "f : A -> B" is not a
// function; confirmed by the answer-key certification (PR #83, handoff/aofclass-quarantine.json) and re-checked here on f(x)=(x+4)^2-4 on [-5, oo).
const AOFCLASS: string[] = ["gen:aofclass:-4,-4,-5,2", "gen:aofclass:-3,2,-5,2", "gen:aofclass:-2,0,-3,2", "gen:aofclass:-2,9,-5,2", "gen:aofclass:-1,-8,-3,2", "gen:aofclass:-1,-6,-3,2", "gen:aofclass:-1,-6,-2,2", "gen:aofclass:-1,-3,-4,2", "gen:aofclass:-1,6,-2,2", "gen:aofclass:-1,7,-4,2", "gen:aofclass:-1,9,-2,2", "gen:aofclass:0,-9,-3,2", "gen:aofclass:0,-7,-2,2", "gen:aofclass:0,-6,-3,2", "gen:aofclass:0,-3,-1,2", "gen:aofclass:0,1,-3,2", "gen:aofclass:1,3,-2,2", "gen:aofclass:1,7,-1,2", "gen:aofclass:1,8,0,2", "gen:aofclass:2,-7,1,2", "gen:aofclass:2,-1,-1,2", "gen:aofclass:2,-1,0,2", "gen:aofclass:2,8,0,2", "gen:aofclass:2,8,1,2", "gen:aofclass:2,9,-1,2", "gen:aofclass:3,-5,0,2", "gen:aofclass:3,-5,1,2", "gen:aofclass:3,-1,2,2", "gen:aofclass:3,8,0,2", "gen:aofclass:4,-8,2,2", "gen:aofclass:4,-5,2,2", "gen:aofclass:4,-1,2,2", "gen:aofclass:4,0,3,2", "gen:aofclass:4,4,3,2", "gen:aofclass:5,-9,2,2", "gen:aofclass:5,-8,3,2", "gen:aofclass:5,-7,3,2", "gen:aofclass:5,-3,3,2", "gen:aofclass:5,-2,4,2", "gen:aofclass:5,0,3,2", "gen:aofclass:5,5,4,2"];
// D09 (owner decision 4, 2026-10-29): the 951 word-form presentations stay excluded until their release is approved. The contract guard that
// held them is repaired in E7 (837c79c, "G1": they now keep the stored-answer comparison), so they are no longer derived from held contracts;
// they are listed here so the quarantine does not lapse silently when the code changes.
import d09 from "../../../content/learning/question-status-d09-hold.v1.json";
const D09 = (d09 as string[]).map((id) => ({ id, reason: "pending-release-review", detail: "word-form presentation excluded by owner decision 4 (D09); the contract-guard defect is repaired in E7 G1; release needs owner approval", since: "2026-10-29", evidence: "manual entry: MATH_CURRICULUM_GRADING_AUDIT_REPORT.md D09; SHADOW_RELEASE_CHECKLIST.md" }));
// Ambiguous questions (release preparation review, 2026-10-29): only those that cannot be graded unambiguously, from the PR #83 register.
// Defective multiple-choice distractors that violate a form the question states (agmix, amceva, ajrat, ...) remain: exactly one option
// satisfies the question as written, so they can be graded.
import ambiguous from "../../../content/learning/question-status-ambiguous.v1.json";
const AMBIGUOUS = (ambiguous as { entries: { id: string; family: string; why: string }[] }).entries.map((e) => ({ id: e.id, reason: "ambiguous-question", detail: e.why, since: "2026-10-29", evidence: "manual entry: MATH_ANSWER_KEY_CERTIFICATION_REPORT.md section 5 (PR #83 register), reviewed in SHADOW_RELEASE_CHECKLIST.md" }));
const MANUAL: { id: string; reason: string; detail: string; since: string; evidence: string }[] = [...D09, ...AMBIGUOUS, ...AOFCLASS.map((id) => ({
  id, reason: "invalid-question", detail: "the stated codomain excludes a value the function takes (f is not a function into it); the key cannot be right or wrong",
  since: "2026-10-29", evidence: "manual entry: MATH_ANSWER_KEY_CERTIFICATION_REPORT.md section 5 (PR #83), aofclass handoff",
}))];

const entries: { id: string; status: "quarantined"; reason: string; detail: string; since: string; evidence: string }[] = [];
for (const [fam, def] of FAMILIES) {
  for (const q of pool(fam).items) {
    for (const sfx of ["", ":mc", ":w"]) {
      const id = q.id + sfx;
      if (sfx && !problemOf(id)) continue;
      const c = contractFor(id);
      if (c?.verification === "held") { entries.push({ id, status: "quarantined", reason: "contract-inconsistency", detail: c.reason, since: "2026-10-29", evidence: "MATH_CURRICULUM_GRADING_AUDIT_REPORT.md D09" }); continue; }
      // contract@2: the stored answer is not readable by the strict parser, or does not satisfy its own stated form
      const v2 = contractV2(id);
      if (v2.inconsistencies.length) entries.push({ id, status: "quarantined", reason: "contract-inconsistency", detail: v2.inconsistencies.join("; "), since: "2026-10-29", evidence: "contract@2 build (Phase C stage 3; D18)" });
    }
  }
}
for (const m of MANUAL) if (!entries.some((e) => e.id === m.id)) entries.push({ ...m, status: "quarantined" });
entries.sort((a, b) => a.id.localeCompare(b.id));
const body = { schema: "question-status@1", note: "GENERATED by packages/learning/scripts/question-status.ts. A listed question is not selectable by any route and receives no authoritative grade; its definition and records are kept.", entries };
const hash = createHash("sha256").update(JSON.stringify(entries)).digest("hex");
writeFileSync(join(import.meta.dirname, "../../../content/learning/question-status.v1.json"), JSON.stringify({ ...body, hash }, null, 0).replace(/\},\{/g, "},\n{") + "\n");
console.log(entries.length, "quarantined", hash.slice(0, 12));
