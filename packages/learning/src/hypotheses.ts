/**
 * learner-hypothesis@1: what the engine has come to believe about WHY a learner answered as they did, kept as a
 * hypothesis that later observations may revise, never as a mathematical fact and never as evidence of mastery.
 *
 * It is derived from the learner's records alone (no stored state of its own), so every entry path (the starting-point
 * check, a skill's module, recovery from a stuck problem, the planner) reads the SAME hypotheses; each still makes its
 * own decision from them. Two kinds of certainty are kept apart:
 *
 *   mathematical   per observation: the authoritative decision that was RECORDED for the answer (credit, and the
 *                  assessment@1 evidence: source, method examined, first invalid transition). Certain within its own
 *                  contract; never re-derived or overridden here.
 *   about the learner  the diagnostic@2 reading of those answers (reasoning.ts): established only on two matching
 *                  answers; otherwise "insufficient" (more questions would help) or "unsupported" (no known explanation
 *                  fits; the engine does not guess).
 *
 * Permitted downstream use: choosing what to TEACH and what to ASK next. Never credit, evidence, status or mastery.
 */
import { question } from "./content";
import { independentAttempt, rightAnswer } from "./evidence";
import { parseProblem, problemOf } from "./families";
import { reason, REASONING_POLICY, type Reasoning } from "./reasoning";
import type { Attempt, AttemptAssessment, LearnerRecords } from "./records";

export const LEARNER_HYPOTHESIS_CONTRACT = "learner-hypothesis@1" as const;
export const investigateContext = (original: string) => `investigate:${original}`;

/** The supported-family form of a question: itself if generated, or its prompt read as a problem. */
export function familyOf(qid: string): string | null {
  if (problemOf(qid)) return qid;
  const p = parseProblem(question(qid).prompt);
  return p.supported ? p.problem.id : null;
}

/** diagnostic@2 on one question from the learner's records: its first answer and the investigation answers (context
 * investigate:<question>, first tries; a repeat is a second try and is left out). */
export function investigation(qid: string, records: LearnerRecords): { reasoning: Reasoning | null; follow: Attempt[] } {
  const fam = familyOf(qid);
  const first = records.attempts.find((a) => a.questionId === qid);
  if (!fam || !first) return { reasoning: null, follow: [] };
  const follow = records.attempts.filter((a) => a.context === investigateContext(qid) && a.n === 1);
  return { reasoning: reason(fam, [{ questionId: fam, response: first.response }, ...follow.map((a) => ({ questionId: a.questionId, response: a.response }))]), follow };
}

export type HypothesisStatus =
  | "established" // two matching answers; open until the obligation below is met
  | "resolved" // taught (in scope) after it was established, then a fresh answer alone in scope was right
  | "slip" // the first answer was wrong, but the follow-ups say the learner knows it (diagnostic@2 "secure")
  | "insufficient" // investigation not finished: more questions would tell explanations apart
  | "unsupported"; // investigation finished, no explanation fits well enough: the engine does not guess

export interface HypothesisObservation {
  attempt: string;
  questionId: string;
  response: string;
  at: string;
  /** the authoritative, recorded decision for this answer: mathematical certainty, scoped to the answer itself */
  mathematical: { credit: boolean | null; assessment: Pick<AttemptAssessment, "source" | "methodExamined" | "firstError"> | null };
  /** explanations whose prediction this answer matches (diagnostic@2) */
  matches: string[];
}
export interface LearnerHypothesis {
  contract: typeof LEARNER_HYPOTHESIS_CONTRACT;
  /** `${explanation}@${question}`, or `?@${question}` when nothing is established */
  id: string;
  /** the claim about the learner (null when nothing is established) */
  claim: { explanation: string; kind: "conceptual" | "procedural" | "recall" | "prerequisite"; says: string } | null;
  /** observedIn: the skill whose question showed it; about: the skill whose teaching addresses it (the prerequisite graph) */
  scope: { question: string; family: string; observedIn: string; about: string | null };
  status: HypothesisStatus;
  /** relative support of the competing explanations (uncalibrated), and those still in play */
  support: Record<string, number>;
  competing: string[];
  supporting: HypothesisObservation[];
  contradicting: HypothesisObservation[];
  /** what would change the status, in words: open questions or the evidence still owed */
  obligations: string[];
  teaching: { deliveredAt: string | null; strategy: string | null; competency: string | null };
  resolvedBy: string | null;
  provenance: { policy: string; established: string | null; attempts: string[] };
  use: { teach: boolean; ask: boolean; evidence: false; mastery: false };
}

const obs = (a: Attempt, matches: string[]): HypothesisObservation => ({
  attempt: a.id, questionId: a.questionId, response: a.response, at: a.at, matches,
  mathematical: { credit: a.credit ?? null, assessment: a.assessment ? { source: a.assessment.source, methodExamined: a.assessment.methodExamined, firstError: a.assessment.firstError } : null },
});

/**
 * Every hypothesis the records support: one per wrong first answer, alone, that was investigated (the learner answered
 * at least one investigation question about it). Deterministic: a function of the records only.
 */
export function hypotheses(records: LearnerRecords): LearnerHypothesis[] {
  const out: LearnerHypothesis[] = [];
  const investigated = new Set(records.attempts.filter((a) => a.context?.startsWith("investigate:")).map((a) => a.context!.slice("investigate:".length)));
  for (const a of records.attempts) {
    if (!investigated.has(a.questionId) || a.n !== 1 || !independentAttempt(a) || rightAnswer(a)) continue;
    if (records.attempts.find((x) => x.questionId === a.questionId) !== a) continue; // its first answer only
    const { reasoning: r, follow } = investigation(a.questionId, records);
    if (!r || !follow.length) continue;
    const all = [a, ...follow];
    const observedIn = question(a.questionId).competency;
    const b = r.status === "established" ? r.best : null;
    const misconception = b && b.kind !== "secure" && b.kind !== "unexplained" ? b : null;
    const status0: HypothesisStatus = misconception ? "established" : b?.kind === "secure" ? "slip" : r.status === "need_more" ? "insufficient" : "unsupported";
    const established = misconception ? follow.at(-1)!.at : null;
    const about = misconception?.competency ?? null;
    const scopeSkills = [observedIn, ...(about && about !== observedIn ? [about] : [])];
    // teaching that came after it was established, in scope (the skill it was seen in, or the skill it is about)
    const taught = established ? records.teaching.find((t) => scopeSkills.includes(t.competency) && t.at > established) ?? null : null;
    const fresh = taught ? records.attempts.find((x) => scopeSkills.includes(question(x.questionId).competency) && x.at > taught.at && x.n === 1 && independentAttempt(x) && !x.context && rightAnswer(x)) ?? null : null;
    const id = misconception?.id ?? null;
    const supporting = id ? all.map((x, k) => obs(x, r.observed[k]?.matches ?? [])).filter((o) => o.matches.includes(id)) : [];
    const contradicting = id ? all.map((x, k) => ({ o: obs(x, r.observed[k]?.matches ?? []), right: r.observed[k]?.right ?? false })).filter((x) => !x.o.matches.includes(id)).map((x) => x.o) : [];
    if (fresh) contradicting.push(obs(fresh, []));
    const status: HypothesisStatus = status0 === "established" && fresh ? "resolved" : status0;
    out.push({
      contract: LEARNER_HYPOTHESIS_CONTRACT,
      id: `${id ?? "?"}@${a.questionId}`,
      claim: misconception ? { explanation: misconception.id, kind: misconception.kind as NonNullable<LearnerHypothesis["claim"]>["kind"], says: misconception.says } : null,
      scope: { question: a.questionId, family: familyOf(a.questionId)!, observedIn, about },
      status,
      support: r.support,
      competing: r.competing.map((e) => e.id),
      supporting, contradicting,
      obligations: status === "established" ? (taught ? ["a fresh answer alone, in scope, after teaching"] : ["teaching in scope", "then a fresh answer alone, in scope"])
        : status === "insufficient" ? ["further investigation questions"]
        : status === "unsupported" ? ["none the engine can ask: no known explanation fits; a person may look at the working"]
        : [],
      teaching: { deliveredAt: taught?.at ?? null, strategy: taught?.strategy ?? null, competency: taught?.competency ?? null },
      resolvedBy: fresh?.id ?? null,
      provenance: { policy: r.policy ?? REASONING_POLICY.version, established, attempts: all.map((x) => x.id) },
      use: { teach: status === "established", ask: status === "insufficient", evidence: false, mastery: false },
    });
  }
  return out;
}

/** The hypotheses that bear on one skill: seen in it, or about it (the prerequisite it points to). */
export const hypothesesFor = (competency: string, records: LearnerRecords, all = hypotheses(records)) =>
  all.filter((h) => h.scope.observedIn === competency || h.scope.about === competency);
/** The latest open (established, not yet resolved) hypothesis for a skill, or null. */
export const openHypothesis = (competency: string, records: LearnerRecords, all?: LearnerHypothesis[]) =>
  hypothesesFor(competency, records, all).filter((h) => h.status === "established").at(-1) ?? null;
