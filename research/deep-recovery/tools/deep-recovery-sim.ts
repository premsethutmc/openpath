/**
 * deep-recovery@0 simulation (research only). Seeded synthetic learners with a hidden dependency structure answer through the
 * real SliceSession (real grader, records, evidence, module teaching) while `runDeep` drives the prototype. The results describe
 * the prototype's behaviour against these MODELS; they are not evidence about how real children learn.
 *
 *   node --import tsx ../research/deep-recovery/tools/deep-recovery-sim.ts <seedFrom> <seedTo> [type,...]   -> one JSON line per run
 */
import { question } from "../../../packages/learning/src/content";
import { phasePool } from "../../../packages/learning/src/families";
import { graph } from "../../../packages/learning/src/graph";
import { runDeep } from "../../../frontend/src/journey/deep-recovery-journey";
import { right, wrong } from "../../../frontend/src/journey/learners";
import { SliceSession } from "../../../frontend/src/journey/session";

const P = "MATH.";
export const OWN = P + "calculus.integration-methods";
const PF = P + "algebra.partial-fractions", LS = P + "algebra.linear-systems", L2V = P + "algebra.linear-two-variables";
const FACT = P + "algebra.factorisation", IDS = P + "algebra.identities", IADD = P + "number.integer-add", INTS = P + "number.integers", LOG = P + "algebra.logarithms";
const ORIG_FAMILY = "aupfr";

export function mulberry32(seed: number) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

/** hidden truth: `deps` (key: skill or fam:<family>) and the gap skills; `roots` = the deepest gap skills (what should be found) */
export interface Truth { deps: Record<string, string[]>; gap: string[]; roots: string[]; slip: number; guess: number; guessChoice?: number; noLearn?: string[]; forget?: string[]; firstSlip?: boolean }
const chainA = { deps: { [`fam:${ORIG_FAMILY}`]: [PF], [PF]: [LS], [LS]: [L2V] }, gap: [PF, LS, L2V], roots: [L2V] };
const chainB = { deps: { [`fam:${ORIG_FAMILY}`]: [PF], [PF]: [FACT], [FACT]: [IDS] }, gap: [PF, FACT, IDS], roots: [IDS] };
export const TYPES: Record<string, (r: () => number) => Truth> = {
  /** knows everything, but slips on the integral first (so recovery starts): measures unnecessary detours */
  knowledgeable: () => ({ deps: {}, gap: [], roots: [], slip: 0.05, guess: 0, firstSlip: true }),
  "repeated-slips": () => ({ deps: {}, gap: [], roots: [], slip: 0.3, guess: 0, firstSlip: true }),
  "single-deep-gap": (r) => ({ ...(r() < 0.5 ? chainA : chainB), slip: 0.05, guess: 0 }),
  "multiple-gaps": () => ({ deps: { [`fam:${ORIG_FAMILY}`]: [PF], [PF]: [LS, FACT], [LS]: [L2V], [FACT]: [IDS] }, gap: [PF, LS, L2V, FACT, IDS], roots: [L2V, IDS], slip: 0.05, guess: 0 }),
  "outside-map": () => ({ deps: { [`fam:${ORIG_FAMILY}`]: [LOG] }, gap: [LOG], roots: [LOG], slip: 0.05, guess: 0 }),
  /** guesses: 1 in 4 on a choice item, rarely on a typed answer */
  guessing: () => ({ ...chainA, slip: 0.05, guess: 0.02, guessChoice: 0.25 }),
  /** stress case: right by luck 30% of the time on EVERY item, typed or not (unrealistic for typed answers like 165/2) */
  "guessing-harsh": () => ({ ...chainA, slip: 0.05, guess: 0.3, guessChoice: 0.3 }),
  "fails-to-learn": () => ({ ...chainA, slip: 0.05, guess: 0, noLearn: [L2V] }),
  "missing-content": () => ({ deps: { [`fam:${ORIG_FAMILY}`]: [PF], [PF]: [FACT], [FACT]: [IADD], [IADD]: [INTS] }, gap: [PF, FACT, IADD, INTS], roots: [INTS], slip: 0.05, guess: 0 }),
  forgetting: () => ({ ...chainA, slip: 0.05, guess: 0, forget: [L2V, LS, PF] }),
};

const skillOf = (q: string) => graph.evidenceTarget(question(q.replace(/:(mc|w)$/, "")).competency);
export class SimLearner {
  learned = new Set<string>();
  private seen = 0;
  /** `wrongOf` (phase 6): how a wrong answer is written; default the shared learners.ts helper (phases 2-5, unchanged) */
  readonly t: Truth;
  readonly rnd: () => number;
  readonly wrongOf: (q: string) => string;
  // explicit fields (erasableSyntaxOnly: tsconfig.mathematics-integration.json); same behaviour as the former parameter properties
  constructor(t: Truth, rnd: () => number, wrongOf: (q: string) => string = wrong) { this.t = t; this.rnd = rnd; this.wrongOf = wrongOf; }
  /** fold in lessons delivered since the last call: a gap skill is learnt when taught after every gap skill it rests on */
  sync(taught: string[]) {
    for (const s of taught.slice(this.seen)) if (this.t.gap.includes(s) && !this.t.noLearn?.includes(s) && (this.t.deps[s] ?? []).every((d) => !this.t.gap.includes(d) || this.learned.has(d))) this.learned.add(s);
    this.seen = taught.length;
  }
  ok = (k: string): boolean => (!this.t.gap.includes(k) || this.learned.has(k)) && (this.t.deps[k] ?? []).every(this.ok);
  can(q: string) { const f = q.startsWith("gen:") ? `fam:${q.split(":")[1]}` : null; return (f && this.t.deps[f] ? this.t.deps[f].every(this.ok) : true) && this.ok(skillOf(q)); }
  answer = (q: string, c: { taughtSkills: string[]; answered: number }) => {
    this.sync(c.taughtSkills);
    if (this.t.firstSlip && c.answered === 0) return this.wrongOf(q);
    const can = this.can(q), r = this.rnd();
    const g = q.endsWith(":mc") || question(q.replace(/:(mc|w)$/, "")).options?.length ? this.t.guessChoice ?? this.t.guess : this.t.guess;
    return can ? (r < this.t.slip ? this.wrongOf(q) : right(q)) : r < g ? right(q) : this.wrongOf(q);
  };
}

export interface SimResult { type: string; seed: number; original: string; outcome: string; confidence: string | null; questions: number; lessons: number; effort: number;
  falseReassurance: boolean; rootsFound: number; rootsTotal: number; wrongTaught: string[]; prereqProbes: number; truthCanAtEnd: boolean; blocked: string | null;
  second?: { outcome: string; rootsFound: number; falseReassurance: boolean; effort: number } }

export function simulate(type: string, seed: number): SimResult {
  const rnd = mulberry32(seed * 7919 + type.length);
  const truth = TYPES[type](rnd);
  const pool = phasePool(ORIG_FAMILY, "diagnostic");
  const original = pool[Math.floor(rnd() * pool.length)];
  const L = new SimLearner(truth, rnd);
  const s = new SliceSession(`sim-${type}-${seed}`, OWN, Date.parse("2026-11-05T09:00:00Z"));
  const taughtOf = (from = 0) => s.events.slice(from).filter((e) => (e as { record?: string }).record === "teach").map((e) => graph.evidenceTarget((e as { competency: string }).competency));
  const episode = (orig: string, from: number) => {
    const repliesFrom = s.replies.length;
    const r = runDeep(s, orig, (q, c) => L.answer(q, { ...c, answered: s.replies.length - repliesFrom }));
    L.sync(taughtOf());
    const taught = taughtOf(from);
    const asks = r.steps.filter((x) => x.kind === "ask");
    const solved = r.final!.phase === "solved" || r.final!.phase === "solved_after_help";
    const truthCan = L.can(orig);
    const blocked = r.final!.blocked?.skill ?? null;
    return { outcome: r.final!.phase, confidence: r.final!.confidence, questions: s.replies.length - repliesFrom, lessons: taught.length, effort: r.final!.effort,
      falseReassurance: solved && !truthCan, rootsFound: truth.roots.filter((x) => taught.includes(x) || blocked === x).length, rootsTotal: truth.roots.length,
      wrongTaught: [...new Set(taught.filter((x) => !truth.gap.includes(x)))], prereqProbes: asks.filter((x) => x.skill !== OWN).length, truthCanAtEnd: truthCan, blocked };
  };
  const first = episode(original, 0);
  const res: SimResult = { type, seed, original, ...first };
  if (truth.forget && first.outcome === "solved_after_help") {
    // a month later the learner has forgotten the chain; a new integral of the same kind, new episode
    s.wait(30);
    for (const f of truth.forget) L.learned.delete(f);
    const seen = new Set(s.state().records.attempts.map((a) => a.questionId));
    const next = phasePool(ORIG_FAMILY, "retention").find((q) => !seen.has(q))!;
    const from = s.events.length;
    const e2 = episode(next, from);
    res.second = { outcome: e2.outcome, rootsFound: e2.rootsFound, falseReassurance: e2.falseReassurance, effort: e2.effort };
  }
  return res;
}

if (process.argv[1]?.endsWith("deep-recovery-sim.ts")) {
  const [from, to, types] = [Number(process.argv[2] ?? 1), Number(process.argv[3] ?? 3), (process.argv[4] ?? Object.keys(TYPES).join(",")).split(",")];
  for (const t of types) for (let seed = from; seed <= to; seed++) {
    try { console.log(JSON.stringify(simulate(t, seed))); } catch (e) { console.log(JSON.stringify({ type: t, seed, error: String((e as Error).message).slice(0, 200) })); }
  }
}
