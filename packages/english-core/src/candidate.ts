/**
 * Candidate learner model (research M002, openpath-research results/M002_report.md), run for comparison only.
 *
 *   P(right) = c + (1 − c) · logistic( ability + strand offset + skill offset
 *                                      − skill difficulty − question correction − trust · hand difficulty )
 *
 * It differs from the production estimator in three ways: one broad ability per learner with strand and skill
 * offsets that are pulled towards zero (instead of a separate estimate per capability); question difficulty that
 * starts from the hand-set band and is corrected by answers; and one learned number, `trust`, for how far the
 * hand-set bands deserve to be believed.
 *
 * Isolation: nothing here is imported by the updater, the planner or selection. compareModels() builds its own
 * Ledger from a copy of the events and returns numbers; it never changes a learner's record, estimate or plan.
 * The step sizes below were tuned on synthetic learners and are provisional until re-tuned on real answers.
 */
import type { LedgerEvent } from "./types.ts";
import { itemParams, itemVersion } from "./content.ts";
import { strandOf } from "./framework.ts";
import { MODEL_VERSION } from "./composite.ts";
import { type ItemParams, logistic, pCorrect } from "./model.ts";
import { type Context, Ledger } from "./updater.ts";

export const CANDIDATE_MODEL_VERSION = "m002-candidate@1";

export interface CandidateParams {
  aTheta: number;
  bTheta: number;
  aPsi: number;
  bPsi: number;
  aPhi: number;
  bPhi: number;
  /** Pull of strand and skill offsets towards zero at each answer. */
  shrink: number;
  aItem: number;
  bItem: number;
  aSkill: number;
  bSkill: number;
  /** Added to the skill offset at each answer on the skill (practice effect). */
  learn: number;
  trust0: number;
  etaTrust: number;
  priorSd: number;
}

/** Frozen from openpath-research M002 (time and session terms off: they did not help there). */
export const M002_CANDIDATE: Readonly<CandidateParams> = Object.freeze({
  aTheta: 1.0,
  bTheta: 0.2,
  aPsi: 0.1,
  bPsi: 0.02,
  aPhi: 0.1,
  bPhi: 0.05,
  shrink: 0.02,
  aItem: 0.2,
  bItem: 0.02,
  aSkill: 0.05,
  bSkill: 0.01,
  learn: 0.03,
  trust0: 0.8,
  etaTrust: 0.01,
  priorSd: 1.0,
});

export interface CandidateAnswer {
  learner: string;
  skill: string;
  strand: string;
  item: string;
  correct: boolean;
  /** The question's hand-set difficulty in logits: a · (b − prior mean). */
  hand: number;
  /** Chance of a right answer by blind guessing. */
  c: number;
}

const get = (m: Map<string, number>, k: string) => m.get(k) ?? 0;

export class CandidateModel {
  readonly params: Readonly<CandidateParams>;
  trust: number;
  private nTrust = 0;
  private readonly theta = new Map<string, number>();
  private readonly nTheta = new Map<string, number>();
  private readonly info = new Map<string, number>();
  private readonly psi = new Map<string, number>();
  private readonly nPsi = new Map<string, number>();
  private readonly phi = new Map<string, number>();
  private readonly nPhi = new Map<string, number>();
  private readonly dSkill = new Map<string, number>();
  private readonly nSkill = new Map<string, number>();
  private readonly delta = new Map<string, number>();
  private readonly nItem = new Map<string, number>();

  constructor(params: Readonly<CandidateParams> = M002_CANDIDATE) {
    this.params = params;
    this.trust = params.trust0;
  }

  predict(x: Omit<CandidateAnswer, "correct">): number {
    const z = get(this.theta, x.learner) + get(this.phi, `${x.learner}|${x.skill}`) - get(this.dSkill, x.skill) - get(this.delta, x.item) + get(this.psi, `${x.learner}|${x.strand}`) - this.trust * x.hand;
    return x.c + (1 - x.c) * logistic(z);
  }

  /** Predict, then learn from the answer. Returns the prediction made before the answer was used. */
  update(x: CandidateAnswer): number {
    const p = this.params;
    const prob = this.predict(x);
    const e = (x.correct ? 1 : 0) - prob;
    const step = (map: Map<string, number>, count: Map<string, number>, key: string, a: number, b: number, sign: number, keep = 1, add = 0) => {
      const n = get(count, key);
      map.set(key, keep * get(map, key) + sign * (a / (1 + b * n)) * e + add);
      count.set(key, n + 1);
    };
    step(this.theta, this.nTheta, x.learner, p.aTheta, p.bTheta, 1);
    this.info.set(x.learner, get(this.info, x.learner) + prob * (1 - prob));
    step(this.psi, this.nPsi, `${x.learner}|${x.strand}`, p.aPsi, p.bPsi, 1, 1 - p.shrink);
    step(this.phi, this.nPhi, `${x.learner}|${x.skill}`, p.aPhi, p.bPhi, 1, 1 - p.shrink, p.learn);
    step(this.dSkill, this.nSkill, x.skill, p.aSkill, p.bSkill, -1);
    step(this.delta, this.nItem, x.item, p.aItem, p.bItem, -1);
    if (x.hand && p.etaTrust) {
      this.trust = Math.min(2, Math.max(0, this.trust - (p.etaTrust / (1 + 0.001 * this.nTrust)) * e * x.hand));
      this.nTrust++;
    }
    return prob;
  }

  /** A learner's broad ability (logits) and its standard deviation. */
  ability(learner: string): { mean: number; sd: number; answers: number } {
    return { mean: get(this.theta, learner), sd: 1 / Math.sqrt(1 / this.params.priorSd ** 2 + get(this.info, learner)), answers: get(this.nTheta, learner) };
  }
}

export const handLogit = (p: ItemParams, priorMean: number): number => p.a * (p.b - priorMean);

export interface ComparedAnswer {
  learner: string;
  evidence: string;
  at: string;
  item: string;
  capability: string;
  correct: boolean;
  /** Each model's chance of a right answer, stated before it saw the answer. */
  live: number;
  candidate: number;
}

export interface ModelScore {
  logLoss: number;
  brier: number;
  /** Mean gap between stated chance and what happened, over ten equal-width bins. */
  calibrationError: number;
}

export interface ModelComparison {
  liveModel: string;
  candidateModel: string;
  learners: number;
  answers: number;
  /** Fewer than this many answers, or fewer than `minLearners` learners: the scores below are not worth reading. */
  minAnswers: number;
  minLearners: number;
  enough: boolean;
  live: ModelScore | null;
  candidate: ModelScore | null;
  /** candidate.logLoss − live.logLoss: negative means the candidate predicted better. */
  logLossDifference: number | null;
  /** Learners (with 10 or more scored answers) for whom the candidate's log loss was lower, and how many such learners there are. */
  learnersBetter: number;
  learnersCompared: number;
  /** How far the candidate ended up believing the hand-set difficulties (1 = at face value). */
  trust: number;
  rows: ComparedAnswer[];
}

const clip = (p: number) => Math.min(1 - 1e-6, Math.max(1e-6, p));
const loss = (y: boolean, p: number) => -Math.log(y ? clip(p) : 1 - clip(p));

export function scorePredictions(rows: { correct: boolean; p: number }[]): ModelScore | null {
  if (!rows.length) return null;
  let ll = 0;
  let br = 0;
  const bins = Array.from({ length: 10 }, () => ({ n: 0, p: 0, y: 0 }));
  for (const r of rows) {
    ll += loss(r.correct, r.p);
    br += (r.p - (r.correct ? 1 : 0)) ** 2;
    const b = bins[Math.min(9, Math.floor(r.p * 10))];
    b.n++;
    b.p += r.p;
    b.y += r.correct ? 1 : 0;
  }
  const ece = bins.reduce((t, b) => t + (b.n ? Math.abs(b.p - b.y) : 0), 0) / rows.length;
  return { logLoss: ll / rows.length, brier: br / rows.length, calibrationError: ece };
}

/**
 * Replay learners' records through the production estimator and the candidate, side by side.
 *
 * An answer is scored when production accepted it as fresh evidence on a code-scored question (not a repeat,
 * not given with help). The production prediction is pCorrect at its combined estimate for the question's
 * capability just before the answer. Learners are taken in order of id and the candidate carries what it learned
 * about questions from one learner to the next, as it would in use; each prediction is made before its answer.
 */
export function compareModels(
  ctx: Context,
  histories: { learner: string; events: readonly LedgerEvent[] }[],
  options: { params?: Readonly<CandidateParams>; minAnswers?: number; minLearners?: number } = {},
): ModelComparison {
  const minAnswers = options.minAnswers ?? 500;
  const minLearners = options.minLearners ?? 10;
  const model = new CandidateModel(options.params ?? M002_CANDIDATE);
  const priorMean = ctx.index.framework.prior.mean;
  const rows: ComparedAnswer[] = [];
  for (const h of [...histories].sort((a, b) => (a.learner < b.learner ? -1 : a.learner > b.learner ? 1 : 0))) {
    const ledger = new Ledger(ctx, h.learner);
    for (const stored of h.events) {
      const ev = structuredClone(stored) as LedgerEvent;
      let live: number | null = null;
      let item = null;
      if (ev.kind === "evidence") {
        item = itemVersion(ctx.content, ev.item.id, ev.item.version) ?? null;
        const node = item?.kind === "code" ? ledger.composite.nodes[item.target] : undefined;
        if (item?.kind === "code" && node) live = pCorrect(node.combined.mean, itemParams(item));
      }
      const decisions = ledger.apply(ev);
      if (ev.kind !== "evidence" || item?.kind !== "code" || live === null) continue;
      const d = decisions.find((x) => x.capability === item.target && x.verdict === "accepted" && x.observation?.kind === "binary");
      if (!d || d.observation?.exposure === "repeat") continue;
      const correct = d.observation!.kind === "binary" && d.observation!.value === 1;
      const params = itemParams(item);
      const candidate = model.update({ learner: h.learner, skill: item.target, strand: strandOf(item.target), item: item.id, correct, hand: handLogit(params, priorMean), c: params.c });
      rows.push({ learner: h.learner, evidence: ev.id, at: ev.at, item: item.id, capability: item.target, correct, live, candidate });
    }
  }
  const per = new Map<string, ComparedAnswer[]>();
  for (const r of rows) per.set(r.learner, [...(per.get(r.learner) ?? []), r]);
  let better = 0;
  let compared = 0;
  for (const rs of per.values()) {
    if (rs.length < 10) continue;
    compared++;
    if (rs.reduce((t, r) => t + loss(r.correct, r.candidate) - loss(r.correct, r.live), 0) < 0) better++;
  }
  const live = scorePredictions(rows.map((r) => ({ correct: r.correct, p: r.live })));
  const candidate = scorePredictions(rows.map((r) => ({ correct: r.correct, p: r.candidate })));
  return {
    liveModel: MODEL_VERSION,
    candidateModel: CANDIDATE_MODEL_VERSION,
    learners: per.size,
    answers: rows.length,
    minAnswers,
    minLearners,
    enough: rows.length >= minAnswers && per.size >= minLearners,
    live,
    candidate,
    logLossDifference: live && candidate ? candidate.logLoss - live.logLoss : null,
    learnersBetter: better,
    learnersCompared: compared,
    trust: model.trust,
    rows,
  };
}
