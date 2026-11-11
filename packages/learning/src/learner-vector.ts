/**
 * learner-vector@1 (SHADOW): a measured picture of one learner, one entry per skill, built from the learner's own answers and
 * the prerequisite graph. Nothing reads it to decide what a learner sees or what counts as mastery: it is computed alongside the
 * shipped behaviour so that what it WOULD choose can be compared first (docs/product/LEARNER_VECTOR.md).
 *
 * Two things the shipped picture does not use:
 *   1. Difficulty. Every maths question reaches the shared engine with the same difficulty. Here a right answer to a hard
 *      question moves the estimate more than a right answer to an easy one, and a wrong answer to an easy question lowers it
 *      more than a wrong answer to a hard one (difficulty class 1 to 3 of the question's family; hand-written questions: 2).
 *   2. The graph. Mathematics is gap-based: a wrong answer on a skill is also evidence about the skills it builds on, and a
 *      right answer is (weaker) evidence that they are in place. Evidence passes down the "builds on" relations, weaker for
 *      looser relations and for each further step, and never outweighs what the learner has shown on the lower skill itself.
 *
 * Only a first, unaided answer counts (evidence.ts independentAttempt); a helped answer or a second try says nothing here.
 * The numbers (step sizes, relation weights) are design values, not fitted to any learner: until real answers exist they are
 * guesses, which is why this stays shadow-only.
 */
import { question } from "./content";
import { independentAttempt, rightAnswer } from "./evidence";
import { difficultyOf, problemOf } from "./families";
import { graph, walkSupports } from "./graph";
import type { LearnerRecords } from "./records";

export const LEARNER_VECTOR = "learner-vector@1";
/** How far down the "builds on" relations an answer is passed. */
export const VECTOR_DEPTH = 2;
/** How much of an answer's weight reaches a skill below, by relation, per step down. */
const RELATION_WEIGHT: Record<string, number> = { mandatory: 0.5, uses: 0.5, support: 0.3, plausible: 0.15 };
/** Difficulty class (1 easy, 2 medium, 3 hard) as a position on the estimate's scale. */
const DIFFICULTY: Record<number, number> = { 1: -1, 2: 0, 3: 1 };
const PRIOR_WEIGHT = 1; // one "virtual" answer of prior: the first real answers move the estimate quickly
const sigmoid = (x: number) => 1 / (1 + Math.exp(-x));

export interface VectorEntry {
  skill: string;
  /** Estimated chance of a right, unaided answer to a medium question on this skill, 0 to 1. */
  estimate: number;
  /** 1 with no evidence, falling towards 0 as evidence accumulates. */
  uncertainty: number;
  /** First unaided answers on this skill itself. */
  direct: number;
  /** Weight of evidence that arrived from skills that build on this one. */
  inferred: number;
}

/** own: what the learner's answers on this skill say; passed: what answers on skills above it say (bounded) */
interface Cell { own: number; passed: number; direct: number; inferred: number }
const PASSED_LIMIT = 1.5;
/** Inference counts for less with every answer the learner has given on the skill itself. */
const thetaOf = (c: Cell) => c.own + c.passed / (1 + c.direct);

function difficultyClass(questionId: string): number {
  if (!questionId.startsWith("gen:")) return 2;
  const p = problemOf(questionId);
  return p ? difficultyOf(p) : 2;
}

/** The learner's vector at the end of their records (all first unaided answers, in order). */
export function learnerVector(records: LearnerRecords, opts: { graph?: boolean; difficulty?: boolean } = {}): Map<string, VectorEntry> {
  const useGraph = opts.graph !== false, useDifficulty = opts.difficulty !== false;
  const cells = new Map<string, Cell>();
  const cell = (id: string) => cells.get(id) ?? (cells.set(id, { own: 0, passed: 0, direct: 0, inferred: 0 }), cells.get(id)!);
  const seen = new Set<string>();
  for (const a of [...records.attempts].sort((x, y) => x.at.localeCompare(y.at))) {
    if (!independentAttempt(a) || seen.has(a.questionId)) continue; // a first, unaided answer only
    seen.add(a.questionId);
    let skill: string;
    try { skill = graph.evidenceTarget(question(a.questionId).competency); } catch { continue; }
    const right = rightAnswer(a) ? 1 : 0;
    const b = useDifficulty ? DIFFICULTY[difficultyClass(a.questionId)] ?? 0 : 0;
    const own = cell(skill);
    // the surprise of this answer given the current estimate and the question's difficulty
    const surprise = right - sigmoid(thetaOf(own) - b);
    own.own += (2 / (PRIOR_WEIGHT + own.direct)) * surprise;
    own.direct += 1;
    if (!useGraph) continue;
    for (const s of walkSupports(skill, VECTOR_DEPTH)) {
      const below = graph.evidenceTarget(s.id);
      if (below === skill) continue;
      // a wrong answer passes down in full strength of its relation; a right answer passes down half as strongly (a learner can
      // get one question right around a gap, but cannot keep getting a skill wrong with everything below it in place)
      const w = (RELATION_WEIGHT[s.type] ?? 0.15) * Math.pow(0.5, s.depth - 1) * (right ? 0.5 : 1);
      const c = cell(below);
      // what the learner has shown on the lower skill itself outweighs inference (thetaOf), and inference alone is bounded
      c.passed = Math.max(-PASSED_LIMIT, Math.min(PASSED_LIMIT, c.passed + w * (right - sigmoid(thetaOf(c)))));
      c.inferred += w;
    }
  }
  return new Map([...cells].map(([skill, c]) => [skill, { skill, estimate: sigmoid(thetaOf(c)), uncertainty: 1 / (1 + c.direct + c.inferred), direct: c.direct, inferred: c.inferred }]));
}

/**
 * Where to look first when a learner is stuck on `skill`: the skills it builds on, the most doubtful first (lowest estimate;
 * a skill with no evidence at all sits at 0.5). Ties keep the graph's own order, which is what the shipped recovery follows.
 */
export function suspectsBelow(skill: string, vector: Map<string, VectorEntry>, depth = VECTOR_DEPTH): { skill: string; estimate: number; uncertainty: number; type: string; depth: number }[] {
  const own = graph.evidenceTarget(skill);
  const out: { skill: string; estimate: number; uncertainty: number; type: string; depth: number; order: number }[] = [];
  const have = new Set<string>();
  for (const [order, s] of walkSupports(skill, depth).entries()) {
    const id = graph.evidenceTarget(s.id);
    if (id === own || have.has(id)) continue;
    have.add(id);
    const v = vector.get(id);
    out.push({ skill: id, estimate: v?.estimate ?? 0.5, uncertainty: v?.uncertainty ?? 1, type: s.type, depth: s.depth, order });
  }
  return out.sort((a, b) => a.estimate - b.estimate || a.order - b.order).map(({ order: _order, ...rest }) => rest);
}
