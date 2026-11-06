/**
 * deep-recovery@0 journey driver (research prototype, opt-in): drives `deepRecovery` through the real SliceSession (real grader,
 * records, evidence, module teaching), as the Recovery view would if it adopted the prototype. Nothing here grades, diagnoses or
 * chooses teaching; the only scripted thing is the learner's answer. The shipped flow (flow.ts) is untouched.
 */
import { question } from "../../../packages/learning/src/content";
import { deepRecovery, type DeepRecoveryOptions, type DeepRecoveryState } from "../../../packages/learning/src/deep-recovery";
import { graph } from "../../../packages/learning/src/graph";
import { activityFor } from "../learning/driver";
import { right, wrong } from "./learners";
import { SliceSession } from "./session";

export type Answerer = (qid: string, ctx: { taughtSkills: string[]; answered: number; activity: string }) => string;
export interface DeepStep { kind: "ask" | "teach" | "decide"; phase: string; skill: string | null; qid?: string; correct?: boolean; path: string; reason?: string;
  /** the engine's decision for this step (phase, why, effort used before it): for traces */
  decision?: { phase: string; active: string | null; effort: number | null; why: string } }
const sh = (s: string | null) => (s ?? "-").replace(/^MATH\./, "");
const skillOf = (q: string) => graph.evidenceTarget(question(q.replace(/:(mc|w)$/, "")).competency);
const TERMINAL = new Set(["solved", "solved_after_help", "blocked", "escalate", "pause", "provisional"]);

/**
 * A learner whose knowledge has a real dependency structure: a skill in `gap` is right only after it has been taught AFTER every
 * gap skill it depends on was learnt (teaching a skill whose own foundation is missing does not stick). A key may be a skill id
 * or `fam:<family>` (a dependency of one question family only). Everything outside the gap is right, except optional slips.
 */
export function structuredLearner(deps: Record<string, string[]>, gap: Iterable<string>, slips: (qid: string, n: number) => boolean = () => false): Answerer {
  const G = new Set(gap);
  return (qid, c) => {
    if (slips(qid, c.answered)) return wrong(qid);
    const known = new Set<string>();
    for (const t of c.taughtSkills) if (G.has(t) && (deps[t] ?? []).every((d) => !G.has(d) || known.has(d))) known.add(t);
    const ok = (k: string): boolean => (!G.has(k) || known.has(k)) && (deps[k] ?? []).every(ok);
    const fam = qid.startsWith("gen:") ? `fam:${qid.split(":")[1]}` : null;
    return (fam && deps[fam] ? deps[fam].every(ok) : true) && ok(skillOf(qid)) ? right(qid) : wrong(qid);
  };
}

/** `engine`: the decision function (default: this branch's deepRecovery; the simulation also passes the frozen phase-2 copy) */
export function runDeep(s: SliceSession, original: string, answer: Answerer, o: DeepRecoveryOptions & { maxSteps?: number; stopAfter?: number; engine?: typeof deepRecovery } = {}) {
  const steps: DeepStep[] = [];
  const taughtSkills = () => s.events.filter((e) => (e as { record?: string }).record === "teach").map((e) => graph.evidenceTarget((e as { competency: string }).competency));
  const say = (qid: string, activity: string, context?: string | null, phase = "", path = "") => {
    const a = answer(qid, { taughtSkills: taughtSkills(), answered: s.replies.length, activity });
    const r = s.submit(qid, a, activity as never, context ? { context } : {});
    steps.push({ kind: "ask", phase, skill: skillOf(qid), qid, correct: r.credit === true, path, ...(st ? { decision: { phase: st.phase, active: st.active, effort: st.effort ?? null, why: st.reason } } : {}) });
  };
  let st: DeepRecoveryState | null = null;
  const decisions: { phase: string; active: string | null; diagnosis: string | null; cause: string | null }[] = [];
  for (let i = 0; i < (o.maxSteps ?? 150); i++) {
    if (o.stopAfter !== undefined && s.replies.length >= o.stopAfter) break;
    const recs = s.state();
    st = (o.engine ?? deepRecovery)(original, recs.records, recs.evidence, s.now, s.session, o);
    decisions.push({ phase: st.phase, active: st.active, diagnosis: st.diagnosis ?? null, cause: st.cause ?? null });
    const path = st.path.map(sh).join(">");
    if (TERMINAL.has(st.phase)) { steps.push({ kind: "decide", phase: st.phase, skill: st.active, path, reason: st.reason, decision: { phase: st.phase, active: st.active, effort: st.effort ?? null, why: st.reason } }); break; }
    if (st.phase === "attempt") { say(original, "original", st.context, "attempt", path); continue; }
    if (st.phase === "teach") {
      const ms = s.next(st.active!, { inRecovery: true });
      if (ms.phase === "chapter" && ms.strategy) { if (o.attribution === "adjacency") s.taught(ms); else s.taught(ms, st.episode ?? undefined); steps.push({ kind: "teach", phase: "teach", skill: st.active, path, reason: ms.strategy.id, decision: { phase: st.phase, active: st.active, effort: st.effort ?? null, why: st.reason } }); continue; }
      if (!ms.question) { steps.push({ kind: "decide", phase: "escalate", skill: st.active, path, reason: ms.reason }); break; }
      // every answer of the episode carries its context, the module's too (episode evidence, effort, saved path)
      say(ms.question, activityFor(ms), st.context, `module:${ms.phase}`, path);
      continue;
    }
    // probes are recorded as "diagnostic": the backend (family/learning.py INDEPENDENT) does not count "probe" as independent work
    say(st.question!, st.phase === "return" || st.phase === "slip-check" ? "original" : "diagnostic", st.context, st.phase, path);
  }
  return { steps, final: st, decisions };
}

/** compact one-line-per-step trace */
export const traceOf = (steps: DeepStep[]) => steps.map((x) => x.kind === "ask" ? `${x.phase}:${sh(x.skill)}${x.correct ? "+" : "-"}` : x.kind === "teach" ? `TEACH:${sh(x.skill)}` : `${x.phase.toUpperCase()}@${sh(x.skill)}`).join(" ");
