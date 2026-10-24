/**
 * Short exploratory diagnostics (diagnostic@1). Six hypotheses about a learner and a skill; each diagnostic question
 * probes one aspect (concept, procedure, recall or transfer), and a wrong answer that matches a written misconception
 * points to that misconception's hypothesis. Questions are chosen by expected information gain; the diagnosis stops
 * when one hypothesis is clearly ahead, or after three questions with "insufficient evidence" if none is.
 *
 * A wrong answer is never by itself proof of a missing prerequisite: the "prerequisite" hypothesis only rises on
 * answers whose written misconception says so, or when the supporting skills themselves are assessed (recovery).
 * Likelihoods are draft values for review, not calibrated estimates.
 */
import { misconceptionOf, question, type Hypothesis, type Module } from "./content";
import { independentAttempt, rightAnswer } from "./evidence";
import type { Attempt } from "./records";

export const HYPOTHESES: Hypothesis[] = ["secure", "conceptual", "procedural", "recall", "prerequisite", "transfer"];
export const DIAGNOSTIC_POLICY = { version: "diagnostic@1-draft", prior: { secure: 0.35, conceptual: 0.15, procedural: 0.15, recall: 0.15, prerequisite: 0.1, transfer: 0.1 }, confident: 0.6, stopAt: 0.75, maxQuestions: 3, misconceptionWeight: 3 } as const;
/** P(right | hypothesis), by what the question probes. */
const RIGHT: Record<string, Record<Hypothesis, number>> = {
  concept: { secure: 0.9, conceptual: 0.15, procedural: 0.6, recall: 0.6, prerequisite: 0.3, transfer: 0.8 },
  procedure: { secure: 0.9, conceptual: 0.3, procedural: 0.15, recall: 0.5, prerequisite: 0.3, transfer: 0.8 },
  recall: { secure: 0.9, conceptual: 0.3, procedural: 0.5, recall: 0.15, prerequisite: 0.35, transfer: 0.8 },
  transfer: { secure: 0.85, conceptual: 0.2, procedural: 0.3, recall: 0.4, prerequisite: 0.3, transfer: 0.15 },
};
type Posterior = Record<Hypothesis, number>;
const normalise = (p: Posterior): Posterior => {
  const t = HYPOTHESES.reduce((s, h) => s + p[h], 0);
  return Object.fromEntries(HYPOTHESES.map((h) => [h, p[h] / t])) as Posterior;
};
const entropy = (p: Posterior) => -HYPOTHESES.reduce((s, h) => s + (p[h] > 0 ? p[h] * Math.log2(p[h]) : 0), 0);

function update(p: Posterior, qid: string, response: string, right: boolean): Posterior {
  const q = question(qid);
  const table = RIGHT[q.probe ?? "procedure"];
  const tag = right ? null : misconceptionOf(q, response)?.hypothesis ?? null;
  return normalise(Object.fromEntries(HYPOTHESES.map((h) => [h, p[h] * (right ? table[h] : (1 - table[h]) * (tag === h ? DIAGNOSTIC_POLICY.misconceptionWeight : 1))])) as Posterior);
}
function expectedEntropy(p: Posterior, qid: string): number {
  const table = RIGHT[question(qid).probe ?? "procedure"];
  const pRight = HYPOTHESES.reduce((s, h) => s + p[h] * table[h], 0);
  const after = (right: boolean) => normalise(Object.fromEntries(HYPOTHESES.map((h) => [h, p[h] * (right ? table[h] : 1 - table[h])])) as Posterior);
  return pRight * entropy(after(true)) + (1 - pRight) * entropy(after(false));
}

export interface Diagnosis {
  /** Every diagnostic answer so far (first, unaided answers only count). */
  asked: { questionId: string; right: boolean; says: string | null }[];
  posterior: Posterior;
  /** The next question to ask, or null when the diagnosis is over. */
  next: string | null;
  result: Hypothesis | "insufficient_evidence" | null;
  confidence: number;
  policy: string;
}

export function diagnose(m: Module, attempts: readonly Attempt[]): Diagnosis {
  let p = { ...DIAGNOSTIC_POLICY.prior } as Posterior;
  const asked: Diagnosis["asked"] = [];
  for (const a of attempts) {
    if (!m.diagnostics.includes(a.questionId) || !independentAttempt(a) || asked.some((x) => x.questionId === a.questionId)) continue;
    const right = rightAnswer(a);
    p = update(p, a.questionId, a.response, right);
    asked.push({ questionId: a.questionId, right, says: right ? null : misconceptionOf(question(a.questionId), a.response)?.says ?? null });
  }
  const best = HYPOTHESES.reduce((b, h) => (p[h] > p[b] ? h : b), "secure" as Hypothesis);
  const done = p[best] >= DIAGNOSTIC_POLICY.stopAt || asked.length >= DIAGNOSTIC_POLICY.maxQuestions || asked.length === m.diagnostics.length;
  const remaining = m.diagnostics.filter((id) => !asked.some((x) => x.questionId === id));
  const next = done ? null : remaining.sort((a, b) => expectedEntropy(p, a) - expectedEntropy(p, b) || m.diagnostics.indexOf(a) - m.diagnostics.indexOf(b))[0] ?? null;
  const result = !done ? null : p[best] >= DIAGNOSTIC_POLICY.confident ? best : "insufficient_evidence";
  return { asked, posterior: p, next, result, confidence: Math.round(p[best] * 100) / 100, policy: DIAGNOSTIC_POLICY.version };
}

export const DIAGNOSIS_TEXT: Record<Hypothesis | "insufficient_evidence", string> = {
  secure: "You seem to know this already. One check on your own, then it is shown.",
  conceptual: "The idea itself needs building. We start with a picture of what it means.",
  procedural: "You have the idea; a step in the method slips. We go through the method step by step.",
  recall: "The method is fine; a fact you need is slow or shaky. We rebuild it from facts you know.",
  prerequisite: "Something this skill builds on looks shaky. We check that first, then come back.",
  transfer: "You can do it in a familiar form; the new kind of problem needs practice of its own.",
  insufficient_evidence: "Not enough to tell yet. We start gently and see how it goes.",
};
