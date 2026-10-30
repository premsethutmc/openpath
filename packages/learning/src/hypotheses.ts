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
import { moduleFor, question } from "./content";
import { independentAttempt, rightAnswer } from "./evidence";
import { exposureKey, gradeOfQuestion, parseProblem, problemOf, type Phase } from "./families";
import { formCertified } from "./grading/certify";
import { modulePhasePool } from "./library";
import { selectable } from "./question-status";
import { probeReading, reason, REASONING_POLICY, type Reasoning } from "./reasoning";
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
  | "resolved" // taught (in scope) after it was established, then a DISCRIMINATING probe alone was right (probe@1)
  | "contested" // not taught, but the latest discriminating probes alone (two different questions) were right: kept, not resolved
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
export const RESOLUTION_PROBE_CONTRACT = "resolution-probe@1" as const;
export interface ResolutionProbe {
  contract: typeof RESOLUTION_PROBE_CONTRACT;
  hypothesis: { id: string; contract: typeof LEARNER_HYPOTHESIS_CONTRACT; policy: string };
  question: string;
  family: string;
  /** what the misunderstanding predicts here, and the target answer: the distinguishing observable */
  prediction: { explanation: string; values: string[] };
  expected: { target: string | null; distinguishes: true };
  response: string;
  assistance: { activity: string; hints: number; solution: boolean; n: number; independent: boolean };
  /** the authoritative recorded decision for this answer (mathematical certainty about the answer only) */
  grader: { credit: boolean | null; source: string | null };
  afterTeaching: boolean;
  /** contradicts: right alone; supports: the predicted wrong answer alone; inconclusive: other wrong, unreadable, or assisted */
  outcome: "contradicts" | "supports" | "inconclusive";
  at: string;
  attempt: string;
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
  teaching: { deliveredAt: string | null; strategy: string | null; competency: string | null; lastAt: string | null };
  resolvedBy: string | null;
  /** resolution-probe@1: every later answer to a question that discriminates this explanation from the target */
  probes: ResolutionProbe[];
  /** the balance of probe evidence (no probability is claimed) */
  uncertainty: { supporting: number; contradicting: number; inconclusive: number; note: string };
  /** teach again now: established, and either never taught or the misunderstanding showed again after the last teaching */
  teachingDue: boolean;
  /** a discriminating probe is owed: established, taught since the last supporting answer, not yet answered right */
  probeDue: boolean;
  /** why the investigation began (from the records; investigation-trigger@1) */
  trigger: { kind: "starting-check" | "stuck-problem" | "modelled-error" | "repeated-errors" | "other"; detail: string };
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
    const teachings = established ? records.teaching.filter((t) => scopeSkills.includes(t.competency) && t.at > established) : [];
    const taught = teachings[0] ?? null;
    const id = misconception?.id ?? null;
    const hid = `${id ?? "?"}@${a.questionId}`;
    // resolution-probe@1: later first answers to questions that tell this explanation apart from the target
    const probes: ResolutionProbe[] = id && established ? records.attempts.filter((x) => x.at > established && x.n === 1 && !all.includes(x)).flatMap((x) => {
      const pr = probeReading(x.questionId, id, x.response);
      if (!pr.discriminates) return [];
      const ind = independentAttempt(x) && !x.hints && !x.solution;
      const outcome: ResolutionProbe["outcome"] = !ind ? "inconclusive" : pr.reading === "correct" ? "contradicts" : pr.reading === "predicted" ? "supports" : "inconclusive";
      return [{
        contract: RESOLUTION_PROBE_CONTRACT, hypothesis: { id: hid, contract: LEARNER_HYPOTHESIS_CONTRACT, policy: r.policy }, question: x.questionId, family: problemOf(x.questionId)!.family,
        prediction: { explanation: id, values: pr.predicted }, expected: { target: pr.correct, distinguishes: true as const }, response: x.response,
        assistance: { activity: x.activity, hints: x.hints, solution: x.solution, n: x.n, independent: ind }, grader: { credit: x.credit ?? null, source: x.assessment?.source ?? null },
        afterTeaching: teachings.some((t) => t.at < x.at), outcome, at: x.at, attempt: x.id,
      }];
    }) : [];
    const lastSupport = probes.filter((p) => p.outcome === "supports").at(-1) ?? null;
    const lastTeach = teachings.at(-1) ?? null;
    // resolved: a right discriminating answer alone, after teaching, with no predicted answer since
    const fresh = probes.find((p) => p.outcome === "contradicts" && p.afterTeaching && (!lastSupport || p.at > lastSupport.at)) ?? null;
    // contested: not taught since the last supporting answer, and two different discriminating questions since then right alone
    const since = probes.filter((p) => !lastSupport || p.at > lastSupport.at);
    const contested = !fresh && !teachings.some((t) => !lastSupport || t.at > lastSupport.at) && new Set(since.filter((p) => p.outcome === "contradicts").map((p) => p.question)).size >= 2;
    const teachingDue = !!misconception && !fresh && !contested && (!lastTeach || (!!lastSupport && lastSupport.at > lastTeach.at));
    const probeDue = !!misconception && !fresh && !contested && !teachingDue;
    const supporting = id ? all.map((x, k) => obs(x, r.observed[k]?.matches ?? [])).filter((o) => o.matches.includes(id)) : [];
    const contradicting = id ? all.map((x, k) => ({ o: obs(x, r.observed[k]?.matches ?? []), right: r.observed[k]?.right ?? false })).filter((x) => !x.o.matches.includes(id)).map((x) => x.o) : [];
    for (const p of probes) {
      const x = records.attempts.find((y) => y.id === p.attempt)!;
      if (p.outcome === "contradicts") contradicting.push(obs(x, []));
      if (p.outcome === "supports") supporting.push(obs(x, [id!]));
    }
    const status: HypothesisStatus = status0 === "established" ? (fresh ? "resolved" : contested ? "contested" : "established") : status0;
    const counts = { supporting: probes.filter((p) => p.outcome === "supports").length, contradicting: probes.filter((p) => p.outcome === "contradicts").length, inconclusive: probes.filter((p) => p.outcome === "inconclusive").length };
    out.push({
      contract: LEARNER_HYPOTHESIS_CONTRACT,
      id: hid,
      claim: misconception ? { explanation: misconception.id, kind: misconception.kind as NonNullable<LearnerHypothesis["claim"]>["kind"], says: misconception.says } : null,
      scope: { question: a.questionId, family: familyOf(a.questionId)!, observedIn, about },
      status,
      support: r.support,
      competing: r.competing.map((e) => e.id),
      supporting, contradicting,
      obligations: status === "established" ? (teachingDue ? ["teaching in scope", "then a right answer alone to a question that discriminates it"] : ["a right answer alone to a question that discriminates it (resolution-probe@1)"])
        : status === "contested" ? ["kept: right answers alone without teaching; a later predicted answer re-opens it"]
        : status === "insufficient" ? ["further investigation questions"]
        : status === "unsupported" ? ["none the engine can ask: no known explanation fits; a person may look at the working"]
        : [],
      teaching: { deliveredAt: taught?.at ?? null, strategy: taught?.strategy ?? null, competency: taught?.competency ?? null, lastAt: lastTeach?.at ?? null },
      resolvedBy: fresh?.attempt ?? null,
      probes,
      uncertainty: { ...counts, note: !misconception ? "nothing established" : counts.supporting + counts.contradicting === 0 ? "no discriminating answer since it was established" : `${counts.contradicting} against, ${counts.supporting} for, after it was established (counts, not a probability)` },
      teachingDue, probeDue,
      trigger: triggerOf(a, records),
      provenance: { policy: r.policy ?? REASONING_POLICY.version, established, attempts: all.map((x) => x.id) },
      use: { teach: status === "established" && teachingDue, ask: status === "insufficient" || probeDue || status === "contested", evidence: false, mastery: false },
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

/** investigation-trigger@1: why a wrong answer was investigated, read from the records (no stored flag). */
export function triggerOf(a: Attempt, records: LearnerRecords): LearnerHypothesis["trigger"] {
  if (a.activity === "diagnostic") return { kind: "starting-check", detail: "a wrong answer in the starting-point check" };
  if (a.activity === "original") return { kind: "stuck-problem", detail: "the learner was stuck on this problem" };
  const t = investigationTrigger(a, records);
  return t ?? { kind: "other", detail: `a wrong answer (${a.activity})` };
}
/** The errors worth investigating in practice and verification: a modelled misunderstanding predicts the answer, or
 * two of the learner's last three answers alone in this skill were wrong. An isolated unexplained slip is not. */
export function investigationTrigger(a: Attempt, records: LearnerRecords): { kind: "modelled-error" | "repeated-errors"; detail: string } | null {
  const pr = problemOf(a.questionId);
  const modelled = pr?.bugs.filter((b) => probeReading(a.questionId, b.id, a.response).reading === "predicted").map((b) => b.id) ?? [];
  if (modelled.length) return { kind: "modelled-error", detail: `the answer is the one predicted by: ${modelled.join(", ")}` };
  const c = question(a.questionId).competency;
  const last = records.attempts.filter((x) => question(x.questionId).competency === c && x.n === 1 && independentAttempt(x) && !x.context && x.at <= a.at).slice(-3);
  const wrong = last.filter((x) => !rightAnswer(x)).length;
  if (wrong >= 2) return { kind: "repeated-errors", detail: `${wrong} of the last ${last.length} answers alone in this skill were wrong` };
  return null;
}

const PROBE_PHASES: Phase[] = ["check", "practice", "diagnostic", "retention"];
/**
 * The next question that would discriminate an open hypothesis, from the skill's own lists and pools: never seen, still
 * selectable (not quarantined), with a certified answer form, within the learner's grade. null: none is available, and
 * the hypothesis stays unresolved (it is never resolved without one).
 */
export function discriminatingProbe(h: LearnerHypothesis, records: LearnerRecords): string | null {
  if (!h.claim) return null;
  const m = moduleFor(h.scope.observedIn);
  if (!m) return null;
  const seen = new Set(records.attempts.map((x) => exposureKey(x.questionId)));
  const g = records.enrolments.at(-1)?.grade ?? null;
  const listed = [...m.practice, ...m.transfer, ...m.strategies.map((s) => s.check), ...m.retention];
  const pooled = m.pool ? PROBE_PHASES.flatMap((ph) => modulePhasePool(m, ph)) : [];
  for (const q of [...listed, ...pooled]) {
    if (seen.has(exposureKey(q)) || !selectable(q) || !problemOf(q)) continue;
    if (q.startsWith("gen:") && !formCertified(q)) continue;
    const qg = gradeOfQuestion(q);
    if (g !== null && qg !== null && qg > g) continue;
    if (probeReading(q, h.claim.explanation).discriminates) return q;
  }
  return null;
}
