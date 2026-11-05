/**
 * deep-recovery@0 phase-3 simulation (research only; SIMULATED learners, not evidence about real children).
 * Engines on the same seeded learner (paired): p3-current | p3-two-fresh | p3-selective (this branch, three confirmation rules),
 * p2 (frozen phase-2 prototype, d98ba668), app (the shipped two-level recovery on 61edf730, via runScenario).
 *
 *   node --import tsx src/journey/deep-recovery-sim3.ts <seedFrom> <seedTo> <engine,...> [orig:type,...]  -> JSONL, one run per line
 *
 * Gap measures (per hidden root skill, i.e. the deepest missing skill of the learner model):
 *   identified    the engine designated the root as the missing piece (a lesson decision on it, "blocked" on it, or a hand-over
 *                 naming it after its explanations failed)
 *   taught        a lesson on the root was delivered in the episode
 *   repaired      after that lesson, the learner answered a question on the root right, first try, unaided, in the episode
 *   blockedNamed  the episode ended "blocked" naming the root (identified, NOT taught or repaired)
 */
import { question } from "../../../packages/learning/src/content";
import { independentAttempt, rightAnswer } from "../../../packages/learning/src/evidence";
import { phasePool } from "../../../packages/learning/src/families";
import { graph } from "../../../packages/learning/src/graph";
import { deepRecovery } from "../../../packages/learning/src/deep-recovery";
import { deepRecovery as deepRecoveryP2 } from "../../../packages/learning/src/research-frozen/deep-recovery-d98ba668";
import { runDeep } from "./deep-recovery-journey";
import { mulberry32, SimLearner, type Truth } from "./deep-recovery-sim";
import { right } from "./learners";
import { runScenario } from "./scenarios";
import { SliceSession } from "./session";

const P = "MATH.";
const S = {
  PF: P + "algebra.partial-fractions", LS: P + "algebra.linear-systems", L2V: P + "algebra.linear-two-variables", FACT: P + "algebra.factorisation",
  IDS: P + "algebra.identities", IADD: P + "number.integer-add", INTS: P + "number.integers", LOG: P + "algebra.logarithms",
  DR: P + "calculus.derivative-rules", EXP: P + "number.exponents", FAL: P + "number.fraction-add-like", FM: P + "number.fraction-models",
};
export const ORIGINALS = {
  O1: { family: "aupfr", own: P + "calculus.integration-methods", label: "Find ∫ rational function dx (partial fractions)" },
  O2: { family: "aulax", own: P + "calculus.indefinite-integrals", label: "Find ∫ (ax + b)ⁿ dx" },
} as const;
type OK = keyof typeof ORIGINALS;
type T3 = Truth & { history?: boolean };
const chain = (fam: string, links: [string, string][]) => { const deps: Record<string, string[]> = { [`fam:${fam}`]: [links[0][0]] }; for (const [a, b] of links) deps[a] = [...(deps[a] ?? []), b]; return deps; };
const O1A = { deps: chain("aupfr", [[S.PF, S.LS], [S.LS, S.L2V]]), gap: [S.PF, S.LS, S.L2V], roots: [S.L2V] };
const O1B = { deps: chain("aupfr", [[S.PF, S.FACT], [S.FACT, S.IDS]]), gap: [S.PF, S.FACT, S.IDS], roots: [S.IDS] };
const O2A = { deps: chain("aulax", [[S.DR, S.EXP]]), gap: [S.DR, S.EXP], roots: [S.EXP] };
const O2B = { deps: chain("aulax", [[S.FAL, S.FM]]), gap: [S.FAL, S.FM], roots: [S.FM] };
const strong = { deps: {}, gap: [], roots: [], guess: 0 };
/** learner models per original; null = not applicable to that original (reported as n/a, never silently dropped) */
export const TYPES: Record<string, Record<OK, ((r: () => number) => T3) | null>> = {
  "strong-new": { O1: () => ({ ...strong, slip: 0.05, firstSlip: true }), O2: () => ({ ...strong, slip: 0.05, firstSlip: true }) },
  "strong-history": { O1: () => ({ ...strong, slip: 0.05, firstSlip: true, history: true }), O2: () => ({ ...strong, slip: 0.05, firstSlip: true, history: true }) },
  "strong-slips": { O1: () => ({ ...strong, slip: 0.15, firstSlip: true }), O2: () => ({ ...strong, slip: 0.15, firstSlip: true }) },
  lucky: { O1: () => ({ ...O1A, slip: 0.05, guess: 0.05, guessChoice: 0.25 }), O2: () => ({ ...O2A, slip: 0.05, guess: 0.05, guessChoice: 0.25 }) },
  "typed-guesser": { O1: () => ({ ...O1A, slip: 0.05, guess: 0.2, guessChoice: 0.3 }), O2: () => ({ ...O2A, slip: 0.05, guess: 0.2, guessChoice: 0.3 }) },
  "single-gap": { O1: (r) => ({ ...(r() < 0.5 ? O1A : O1B), slip: 0.05, guess: 0 }), O2: (r) => ({ ...(r() < 0.5 ? O2A : O2B), slip: 0.05, guess: 0 }) },
  "multiple-gaps": {
    O1: () => ({ deps: { "fam:aupfr": [S.PF], [S.PF]: [S.LS, S.FACT], [S.LS]: [S.L2V], [S.FACT]: [S.IDS] }, gap: [S.PF, S.LS, S.L2V, S.FACT, S.IDS], roots: [S.L2V, S.IDS], slip: 0.05, guess: 0 }),
    O2: () => ({ deps: { "fam:aulax": [S.DR, S.FAL], [S.DR]: [S.EXP], [S.FAL]: [S.FM] }, gap: [S.DR, S.EXP, S.FAL, S.FM], roots: [S.EXP, S.FM], slip: 0.05, guess: 0 }),
  },
  "missing-content": { O1: () => ({ deps: chain("aupfr", [[S.PF, S.FACT], [S.FACT, S.IADD], [S.IADD, S.INTS]]), gap: [S.PF, S.FACT, S.IADD, S.INTS], roots: [S.INTS], slip: 0.05, guess: 0 }), O2: null },
  "fails-to-learn": { O1: () => ({ ...O1A, slip: 0.05, guess: 0, noLearn: [S.L2V] }), O2: () => ({ ...O2A, slip: 0.05, guess: 0, noLearn: [S.EXP] }) },
  forgetting: { O1: () => ({ ...O1A, slip: 0.05, guess: 0, forget: O1A.gap }), O2: () => ({ ...O2A, slip: 0.05, guess: 0, forget: O2A.gap }) },
  "outside-map": { O1: () => ({ deps: { "fam:aupfr": [S.LOG] }, gap: [S.LOG], roots: [S.LOG], slip: 0.05, guess: 0 }), O2: () => ({ deps: { "fam:aulax": [S.LOG] }, gap: [S.LOG], roots: [S.LOG], slip: 0.05, guess: 0 }) },
};
export const ENGINES = ["p3-current", "p3-two-fresh", "p3-selective", "p2", "app"] as const;
type Engine = (typeof ENGINES)[number];

const skillOf = (q: string) => graph.evidenceTarget(question(q.replace(/:(mc|w)$/, "")).competency);
const TERMINAL = new Set(["solved", "solved_after_help", "blocked", "escalate"]);

export function simulate3(engine: Engine, ok: OK, type: string, seed: number) {
  const t0 = Date.now();
  const O = ORIGINALS[ok];
  const make = TYPES[type][ok];
  const rec: Record<string, unknown> = { phase: 3, engine, orig: ok, type, seed };
  if (!make) return { ...rec, status: "n/a" };
  if (engine === "app" && type === "strong-history") return { ...rec, status: "n/a", note: "the app harness cannot pre-load history" };
  // the learner model and the original drawn from the seed alone (identical across engines: paired)
  const rnd = mulberry32(seed * 7919 + type.length * 31 + (ok === "O1" ? 1 : 2));
  const truth = make(rnd);
  const pool = phasePool(O.family, "diagnostic");
  const original = pool[Math.floor(rnd() * pool.length)];
  const L = new SimLearner(truth, rnd);
  rec.original = original;
  try {
    let s = new SliceSession(`sim3-${engine}-${ok}-${type}-${seed}`, O.own, Date.parse("2026-11-05T09:00:00Z"));
    if (truth.history) {
      for (const q of phasePool(O.family, "practice").filter((x) => !x.endsWith(":mc")).slice(0, 3)) s.submit(q, right(q), "practice");
      s.wait(3);
    }
    const episode = (orig: string) => {
      let evFrom = s.events.length, repFrom = s.replies.length;
      let outcome: string, diagnosis: string | null = null, cause: string | null = null, effort: number | null = null, designated: string[] = [], status = "ok";
      if (engine === "app") {
        const r = runScenario({ id: `sim3-${seed}`, category: 3, start: orig, entry: "practice", expect: {}, learner: () => ({ name: type, act: (v) => ({ answer: L.answer(v.q, { taughtSkills: v.taughtSkills, answered: v.answered }) }) }) } as never);
        // the app's own session (its own learner id and records) is the one measured
        s = r.f.session; evFrom = 0; repFrom = 0;
        outcome = `app:${r.f.ended?.phase ?? (r.terminated ? "ended" : "running")}`;
        if (!r.terminated) status = "incomplete";
        const recs = r.f.session.trace.filter((t) => t.component === "intervention.recovery").map((t) => t.output as { phase: string; active: string | null });
        designated = [...new Set(recs.filter((x) => (x.phase === "support" || x.phase === "teach" || x.phase === "escalate") && x.active).map((x) => graph.evidenceTarget(x.active!)))];
      } else {
        const confirm = engine === "p3-two-fresh" ? "two-fresh" : engine === "p3-selective" ? "selective" : "current";
        const r = runDeep(s, orig, (q, c) => L.answer(q, { ...c, answered: s.replies.length - repFrom }), engine === "p2" ? { engine: deepRecoveryP2 as unknown as typeof deepRecovery, attribution: "adjacency" } : { confirm });
        const f = r.final!;
        outcome = f.phase; diagnosis = f.diagnosis ?? null; cause = f.cause ?? null; effort = f.effort ?? null;
        if (!TERMINAL.has(f.phase)) status = "incomplete";
        const teachSkills = r.steps.filter((x) => x.kind === "teach").map((x) => x.skill!);
        designated = [...new Set([...teachSkills, ...(f.blocked ? [f.blocked.skill] : []), ...(f.phase === "escalate" && f.active && f.active !== O.own ? [f.active] : [])])];
      }
      L.sync(s.events.slice(0).filter((e) => (e as { record?: string }).record === "teach").map((e) => graph.evidenceTarget((e as { competency: string }).competency)));
      const evs = s.events.slice(evFrom) as unknown as { record?: string; competency?: string; at: string }[];
      const lessons = evs.filter((e) => e.record === "teach").map((e) => ({ skill: graph.evidenceTarget(e.competency!), at: e.at }));
      const st = s.state();
      const attempts = st.records.attempts.filter((a) => a.at >= (evs[0]?.at ?? ""));
      const repaired = truth.roots.filter((root) => { const l = lessons.find((x) => x.skill === root); return !!l && attempts.some((a) => a.at > l.at && skillOf(a.questionId) === root && a.n === 1 && independentAttempt(a) && rightAnswer(a)); });
      const truthCan = L.can(orig);
      const questions = s.replies.length - repFrom;
      const ownStatus = st.evidence(O.own).status;
      const claimsSolved = engine === "app" ? ["independent", "transfer", "verified"].includes(ownStatus) : outcome === "solved" || outcome === "solved_after_help";
      const noGap = truth.gap.length === 0;
      const firstRight = !truth.firstSlip;
      const minimal = firstRight ? 1 : 2;
      return {
        outcome, diagnosis, cause, effort, status, questions, lessons: lessons.length, taughtSkills: lessons.map((l) => l.skill), ownStatus,
        prereqQuestions: attempts.filter((a) => skillOf(a.questionId) !== O.own).length,
        claimsSolved, falseReassurance: claimsSolved && !truthCan, truthCan,
        roots: truth.roots, designated, identified: truth.roots.filter((x) => designated.includes(x)), taught: truth.roots.filter((x) => lessons.some((l) => l.skill === x)), repaired,
        blockedNamed: outcome === "blocked" && truth.roots.some((x) => designated.includes(x)),
        wrongDesignated: designated.filter((x) => x !== O.own && !truth.gap.includes(x)), ownTaught: lessons.some((l) => l.skill === O.own),
        ...(noGap ? { strongRecognised: claimsSolved && lessons.length === 0, unnecessaryQuestions: Math.max(0, questions - minimal) } : {}),
      };
    };
    const first = episode(original);
    Object.assign(rec, first);
    if (truth.forget && engine !== "app" && first.outcome === "solved_after_help") {
      s.wait(30);
      for (const f of truth.forget) L.learned.delete(f);
      const seen = new Set(s.state().records.attempts.map((a) => a.questionId));
      const next = phasePool(O.family, "retention").find((q) => !seen.has(q))!;
      rec.second = episode(next);
    }
    const ms = Date.now() - t0;
    return { ...rec, ms, status: ms > 300_000 ? "timeout" : (rec.status as string) };
  } catch (e) {
    return { ...rec, status: "error", error: String((e as Error).stack ?? e).slice(0, 400), ms: Date.now() - t0 };
  }
}

if (process.argv[1]?.endsWith("deep-recovery-sim3.ts")) {
  const from = Number(process.argv[2]), to = Number(process.argv[3]);
  const engines = (process.argv[4] ?? ENGINES.join(",")).split(",") as Engine[];
  const cells = process.argv[5] ? process.argv[5].split(",").map((c) => c.split(":") as [OK, string]) : (["O1", "O2"] as OK[]).flatMap((o) => Object.keys(TYPES).map((t) => [o, t] as [OK, string]));
  for (const [o, t] of cells) for (let seed = from; seed <= to; seed++) for (const e of engines) console.log(JSON.stringify(simulate3(e, o, t, seed)));
}
