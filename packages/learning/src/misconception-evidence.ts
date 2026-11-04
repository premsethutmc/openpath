/**
 * misconception-evidence@1: what the learner's evidence shows, kept apart from what it does not, before an
 * explanation is chosen. Read-only: it derives facts from the records and changes no learner state.
 *
 *   observed-incorrect         at least one wrong answer in this skill
 *   repeated-difficulty        two or more wrong answers alone in this skill, with no misconception established
 *   hint-dependence            right only with help (hints, a shown solution, guided practice), never right alone
 *   verified-misconception     a misconception ESTABLISHED by learner-hypothesis@1 (two matching answers, not
 *                              resolved or contested), or one diagnostic@2 established and passed in by recovery
 *   uncertain-hypothesis       an investigation not finished, a contested reading, or a starting-check diagnosis
 *                              (a posterior), with nothing established: a lead, never a fact about the learner
 *   missing-prerequisite       a skill this one builds on was found missing (diagnosis "prerequisite", or recovery)
 *   failed-retention           the delayed check failed (retention-failure@1: recovery required)
 *   general-need               none of the above: teaching for the skill itself, no diagnosis claimed
 *
 * Rule: a misconception-specific explanation (explanation-review@1) needs verified-misconception. Repeated wrong
 * answers, hint dependence or an uncertain hypothesis never stand in for it; for those, a general explanation of the
 * skill may be used, subject to the usual eligibility gate and retry limits.
 */
import { question } from "./content";
import type { Diagnosis } from "./diagnostic";
import { assistedAttempt, independentAttempt, rightAnswer, type SkillEvidence } from "./evidence";
import { hypothesesFor } from "./hypotheses";
import type { LearnerRecords } from "./records";

export const MISCONCEPTION_EVIDENCE = "misconception-evidence@1" as const;
export type EvidenceFact = "verified-misconception" | "failed-retention" | "missing-prerequisite" | "uncertain-hypothesis" | "hint-dependence" | "repeated-difficulty" | "observed-incorrect" | "general-need";
/** Most specific first: the primary basis is the first fact that holds. */
export const FACT_ORDER: EvidenceFact[] = ["verified-misconception", "failed-retention", "missing-prerequisite", "uncertain-hypothesis", "hint-dependence", "repeated-difficulty", "observed-incorrect", "general-need"];
export interface EvidenceBasis {
  contract: typeof MISCONCEPTION_EVIDENCE;
  competency: string;
  facts: EvidenceFact[];
  primary: EvidenceFact;
  /** True only for verified-misconception: what a misconception-specific explanation requires. */
  misconceptionEvidence: boolean;
  /** The established misconceptions (diagnosis ids); a misconception-specific explanation must be about one of them. */
  established: string[];
  detail: string[];
}

const inSkill = (competency: string) => (qid: string) => { try { return question(qid).competency === competency; } catch { return false; } };

export function evidenceBasis(competency: string, records: LearnerRecords, opts: { evidence?: SkillEvidence; diagnosis?: Diagnosis | null; established?: { says: string } | null } = {}): EvidenceBasis {
  const mine = records.attempts.filter((a) => inSkill(competency)(a.questionId));
  const alone = mine.filter(independentAttempt);
  const wrongAlone = alone.filter((a) => !rightAnswer(a));
  const helped = mine.filter((a) => assistedAttempt(a) && rightAnswer(a));
  const hs = hypothesesFor(competency, records);
  const est = hs.filter((h) => h.status === "established");
  const facts = new Set<EvidenceFact>(), detail: string[] = [];
  if (est.length || opts.established) {
    facts.add("verified-misconception");
    detail.push(opts.established ? `established by recovery: ${opts.established.says}` : `established: ${est.map((h) => `${h.claim?.explanation} (${h.supporting.length} supporting)`).join(", ")}`);
  }
  if (opts.evidence && (opts.evidence.retention === "failed" || opts.evidence.recoveryRequired)) { facts.add("failed-retention"); detail.push("the delayed check failed: recovery required"); }
  if (opts.diagnosis?.result === "prerequisite") { facts.add("missing-prerequisite"); detail.push("the starting check points to a skill this builds on"); }
  const uncertain = hs.filter((h) => h.status === "insufficient" || h.status === "contested");
  const posterior = opts.diagnosis && ["conceptual", "procedural", "recall", "transfer"].includes(opts.diagnosis.result ?? "");
  if (!facts.has("verified-misconception") && (uncertain.length || posterior)) {
    facts.add("uncertain-hypothesis");
    detail.push([uncertain.length ? `${uncertain.length} unfinished or contested reading(s)` : "", posterior ? `starting-check reading "${opts.diagnosis!.result}" (confidence ${opts.diagnosis!.confidence.toFixed(2)}), not established` : ""].filter(Boolean).join("; "));
  }
  if (helped.length && !alone.some(rightAnswer)) { facts.add("hint-dependence"); detail.push(`${helped.length} right answer(s) with help, none alone`); }
  if (wrongAlone.length >= 2 && !facts.has("verified-misconception")) { facts.add("repeated-difficulty"); detail.push(`${wrongAlone.length} wrong answers alone`); }
  if (mine.some((a) => !rightAnswer(a))) facts.add("observed-incorrect");
  if (!facts.size) facts.add("general-need");
  const list = FACT_ORDER.filter((f) => facts.has(f));
  return { contract: MISCONCEPTION_EVIDENCE, competency, facts: list, primary: list[0], misconceptionEvidence: facts.has("verified-misconception"), established: est.map((h) => h.claim?.explanation).filter((x): x is string => !!x), detail };
}
