/**
 * teacher-evidence@1: a READ-ONLY view of what the engine knows about one learner and one skill, for a teacher.
 * It keeps three kinds of statement apart and labels each:
 *
 *   observation   what the learner answered and how the grader decided it (authoritative, certain about the answer)
 *   hypothesis    what the engine suspects about WHY (learner-hypothesis@1): always worded as a possibility, with its
 *                 evidence for and against; never stated as a fact, never part of the status
 *   policy        the status and the delayed checks (mastery and retention policy), as the policy computed them
 *
 * Nothing here is learner-facing and nothing writes: it is a pure function of the records and the evidence.
 */
import { moduleFor, question } from "./content";
import type { SkillEvidence } from "./evidence";
import { hypothesesFor, type LearnerHypothesis } from "./hypotheses";
import { teachingHistory } from "./intervention";
import type { LearnerRecords } from "./records";

export const TEACHER_EVIDENCE_CONTRACT = "teacher-evidence@1" as const;
export interface TeacherStatement { kind: "observation" | "hypothesis" | "policy" | "teaching"; certainty: "verified" | "suspected" | "unknown" | "policy" | "record"; text: string; evidence: string[] }
export interface TeacherEvidence { contract: typeof TEACHER_EVIDENCE_CONTRACT; competency: string; statements: TeacherStatement[] }

const HYPOTHESIS_WORDING: Record<LearnerHypothesis["status"], (h: LearnerHypothesis) => string> = {
  established: (h) => `Possible misunderstanding (not a confirmed fact): ${h.claim!.says} Seen in ${h.supporting.length} answers that match it. ${h.teachingDue ? "Not yet addressed by teaching." : "Taught; waiting for an answer on a question that tells it apart."}`,
  resolved: (h) => `Earlier possible misunderstanding, now not seen: after teaching, the learner answered right on a question that tells it apart. (${h.claim!.says})`,
  contested: (h) => `Possible misunderstanding with conflicting evidence: later answers on questions that tell it apart were right without teaching. Kept open. (${h.claim!.says})`,
  slip: () => "A wrong answer the follow-up questions suggest was a slip (not a pattern).",
  insufficient: () => "A wrong answer is being looked into: not enough answers yet to say why.",
  unsupported: () => "A wrong answer that no known explanation fits. The engine does not guess; it may be worth looking at the working.",
};

export function teacherEvidence(competency: string, records: LearnerRecords, ev: SkillEvidence): TeacherEvidence {
  const st: TeacherStatement[] = [];
  const mine = records.attempts.filter((a) => question(a.questionId).competency === competency);
  for (const a of mine) {
    const verdict = a.credit === true ? "right" : a.credit === false ? "wrong" : "not decided";
    const how = a.hints || a.solution || a.n > 1 || a.activity === "guided" ? "with help" : "alone";
    const fe = a.assessment?.firstError;
    st.push({ kind: "observation", certainty: a.credit === undefined ? "unknown" : "verified", text: `${a.questionId}: answered ${verdict}, ${how} (${a.activity}).${fe ? ` First invalid step (${a.assessment!.source}): ${fe.explanation}` : ""}${a.working?.length ? " Working written (not assessed as evidence)." : ""}`, evidence: [a.id] });
  }
  for (const h of hypothesesFor(competency, records))
    st.push({ kind: "hypothesis", certainty: "suspected", text: HYPOTHESIS_WORDING[h.status](h).replace(/\s+/g, " ").trim(), evidence: [...h.provenance.attempts, ...h.probes.map((p) => p.attempt)] });
  const m = moduleFor(competency);
  if (m) for (const s of teachingHistory(m, records)) if (s.delivered.length)
    st.push({ kind: "teaching", certainty: "record", text: `Explanation "${s.strategy}" delivered ${s.delivered.length}×; ${s.effective === null ? "no check alone after it yet" : s.effective ? "a check alone after it was right" : "the check alone after it was not right"}.`, evidence: [] });
  st.push({ kind: "policy", certainty: "policy", text: `Status (policy): ${ev.status}; on your own ${ev.independent.right}/${ev.independent.total}, with help ${ev.assisted.right}/${ev.assisted.total}.`, evidence: [] });
  for (const c of ev.retentionHistory ?? []) st.push({ kind: "policy", certainty: "policy", text: `Delayed check due ${c.due.slice(0, 10)}: ${c.result}${c.recoveredAt ? `; shown again alone on ${c.recoveredAt.slice(0, 10)}, so a new check was scheduled` : ""}.`, evidence: [] });
  return { contract: TEACHER_EVIDENCE_CONTRACT, competency, statements: st };
}
