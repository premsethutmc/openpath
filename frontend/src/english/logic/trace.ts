/**
 * Decision traces: what the engine knew, what it weighed and why it chose, recorded at the moment of the decision.
 * Built only from the engine's own Recommendation and the selection input it was given; nothing is re-scored.
 */
import { type PlannerDecision, type Recommendation, type Scored, type SelectionInput, leafView } from "../../../../packages/english-core/src/index.ts";
import type { AppContent } from "./content.ts";
import type { EvidenceTarget, PlanTrace, SelectionTrace, TracedCandidate } from "./events.ts";
import type { LearnerProfile } from "./profile.ts";
import type { AppState } from "./state.ts";

const r3 = (x: number) => Math.round(x * 1000) / 1000;

function candidate(c: AppContent, x: Scored, best?: Scored): TracedCandidate {
  const it = c.ctx.content.items.get(x.item);
  const out: TracedCandidate = {
    item: x.item,
    capability: it && it.kind !== "writing" ? it.target : null,
    difficulty: it && it.kind === "code" ? it.b : null,
    score: r3(x.score),
    p: r3(x.p),
    parts: Object.fromEntries(Object.entries(x.parts).map(([k, v]) => [k, r3(v)])),
    reasons: x.reasons.slice(0, 3).map((r) => r.slice(0, 160)),
  };
  if (best) out.whyNot = x.score < best.score ? `lower score (${r3(x.score)} < ${r3(best.score)})` : `equal score (${r3(x.score)}); the engine's tie-break chose the other`;
  return out;
}

export function selectionTrace(s: AppState, c: AppContent, inp: SelectionInput, r: Recommendation, use: string, excluded: Map<string, string>, pool: Iterable<string> = c.handWritten): SelectionTrace {
  const goalCaps = new Set(Object.keys(inp.goal.weights));
  const inGoal = (id: string) => {
    const it = c.ctx.content.items.get(id);
    return !!it && it.kind === "code" && goalCaps.has(it.target);
  };
  const handWritten = [...pool].filter(inGoal);
  const unseen = handWritten.filter((id) => !inp.seen.has(id));
  const count = (why: string) => handWritten.filter((id) => excluded.get(id) === why).length;
  const capsInPlay = [...new Set([r.choice, ...r.alternatives].filter((x): x is Scored => !!x).flatMap((x) => (x.focus ? [x.focus] : x.targets)))].slice(0, 4);
  return {
    selector: "engine",
    use,
    mode: r.mode,
    schedule: r.schedule.reason,
    path: r.path,
    goal: r.goal,
    target: { band: r.target.band, source: r.target.source, note: r.target.note },
    knew: capsInPlay.map((id) => {
      const v = leafView(s.ledger.composite, c.index, id, inp.now);
      return { capability: id, mean: r3(v.mean), sd: r3(v.sd), n: v.direct.n, stage: v.stage };
    }),
    candidates: {
      eligible: unseen.filter((id) => inp.only?.has(id) ?? true).length,
      unseen: unseen.length,
      excludedReserved: count("reserved"),
      excludedPassage: count("passage"),
      excludedSeenWord: count("seen_word"),
      seen: handWritten.length - unseen.length,
    },
    chosen: r.choice ? candidate(c, r.choice) : undefined,
    alternatives: r.alternatives.slice(0, 4).map((x) => candidate(c, x, r.choice ?? undefined)),
    bankGaps: r.bankGaps.slice(0, 3).map((g) => ({ capability: g.capability, suitable: g.suitableDifficulty, unused: g.unusedDifficulties.slice(0, 8), note: g.note.slice(0, 200) })),
    explanation: r.explanation.slice(0, 400),
  };
}

export function queueTrace(type: string, position: number, length: number, use: string): SelectionTrace {
  const reason: Record<string, string> = {
    spelling_check: "the spelling check: one unseen word per spelling pattern up to about two bands above the estimate, fixed when the session started",
    spelling_practice: "spelling practice on one pattern: unseen words in a mix of templates, fixed when the session started",
    spelling_review: "word review: words due in word memory, fixed when the session started",
    spelling_transfer: "a check with new words for a practised pattern, fixed when the session started",
  };
  return { selector: "queue", use, queue: { position, length, reason: reason[type] ?? "a fixed list planned when the session started" } };
}

export function planTrace(profile: LearnerProfile, started: PlanTrace["started"], target?: EvidenceTarget): PlanTrace {
  const offered = profile.activities.map((a) => ({
    title: a.title,
    kind: a.kind,
    action: a.recommendation?.action ?? null,
    capability: a.step.capability ?? null,
    priority: a.recommendation?.priority ?? null,
    why: (a.recommendation?.why ?? a.step.reason ?? "").slice(0, 300),
  }));
  const rank = profile.activities.findIndex((a) => a.step.type === started.type && (a.step.capability ?? undefined) === started.capability && (a.step.purpose ?? undefined) === (started.purpose ?? undefined));
  return {
    offered,
    started,
    startedRank: rank >= 0 ? rank : null,
    standings: Object.fromEntries(profile.capabilities.filter((x) => x.standing !== "not_checked").map((x) => [x.id, x.standing])),
    ...(profile.capabilities.some((x) => x.notYetShown || x.higherNotYetShown) ? { gaps: Object.fromEntries(profile.capabilities.filter((x) => x.notYetShown || x.higherNotYetShown).map((x) => [x.id, (x.notYetShown ?? x.higherNotYetShown)!.slice(0, 400)])) } : {}),
    ...(target ? { target } : {}),
  };
}

export function plannerTrace(d: PlannerDecision, use: string): SelectionTrace {
  return {
    selector: "planner",
    use,
    planner: { action: d.action, ...(d.itemRole ? { itemRole: d.itemRole } : {}), ...(d.strategy ? { strategy: d.strategy } : {}), diagnosis: d.diagnosis.kind, detail: d.diagnosis.detail, reason: d.reason, policy: d.policy },
  };
}
