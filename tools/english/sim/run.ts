/** Drives the real engine with simulated learners. Nothing here reaches into the engine's internals. */
import {
  type Composite,
  type Context,
  type EvaluationRequest,
  type Evaluator,
  type Goal,
  type LedgerEvent,
  Ledger,
  type Recommendation,
  type WritingTask,
  buildEvaluationRequest,
  createComposite,
  mockEvaluator,
  qualify,
  recommend,
  rng,
} from "../../../packages/english-core/src/index.ts";
import { type SimLearner, respond, trueLevels, writeResponse } from "./learners.ts";

export const T0 = Date.UTC(2026, 9, 12, 10, 30); // 12 Oct 2026, 16:00 IST
export const at = (day: number, minute = 0): string => new Date(T0 + day * 86_400_000 + minute * 60_000).toISOString();

/** A request for scoring an anchor response (used to qualify evaluators). */
export function anchorRequest(ctx: Context, task: WritingTask, anchorId: string, when: string): EvaluationRequest {
  const anchor = task.anchors.find((a) => a.id === anchorId)!;
  return buildEvaluationRequest(task, `anchor:${anchorId}`, anchor.text, createComposite(ctx.index, "anchor"), ctx.index, when);
}

export function writingTasks(ctx: Context): WritingTask[] {
  return [...ctx.content.items.values()].filter((i) => i.kind === "writing") as WritingTask[];
}

/** The stand-in evaluator: on anchors it reports their agreed scores, on a learner's text that learner's true level, plus noise. */
export function simEvaluator(ctx: Context, learner: SimLearner | null, day: () => number, opts: { id?: string; noise: number; seed: number; bias?: number; faults?: Parameters<typeof mockEvaluator>[0]["faults"] }): Evaluator {
  const anchors = new Map<string, Record<string, number>>(writingTasks(ctx).flatMap((t) => t.anchors.map((a) => [`req:anchor:${a.id}`, a.scores] as [string, Record<string, number>])));
  return mockEvaluator({
    id: opts.id ?? "mock:stand-in",
    seed: opts.seed,
    noise: opts.noise,
    bias: opts.bias,
    faults: opts.faults,
    oracle: (req) => {
      const anchor = anchors.get(req.request_id);
      if (anchor) return { bands: anchor };
      if (!learner) return null;
      const truth = trueLevels(learner, day());
      const allowed = (cap: string) => new Set((ctx.index.leaves.get(cap)?.misconceptions ?? []).map((m) => m.id));
      return {
        bands: truth,
        misconceptions: Object.fromEntries(req.targets.map((t) => [t.capability, learner.misconceptions.filter((m) => allowed(t.capability).has(m))])),
      };
    },
  });
}

export interface RunOptions {
  goal: Goal;
  sessionDays: number[];
  itemsPerSession: number;
  seed: number;
  evaluatorNoise: number;
  order?: "adaptive" | "random";
  only?: Set<string>;
  writing?: boolean;
  /** Stop early when this returns true (checked after each item). */
  stop?: (ledger: Ledger, now: string) => boolean;
  onItem?: (info: { session: number; n: number; item: string; rec: Recommendation | null; ledger: Ledger; now: string }) => void;
}

export interface RunResult {
  learner: SimLearner;
  ledger: Ledger;
  /** Composite after each session, and the time it was taken. */
  sessions: { day: number; now: string; composite: Composite; items: number }[];
  items: number;
  recommendations: { now: string; item: string; mode: string; explanation: string }[];
}

export async function runLearner(ctx: Context, learner: SimLearner, o: RunOptions): Promise<RunResult> {
  const next = rng(o.seed ^ hashId(learner.id));
  let day = o.sessionDays[0];
  const evaluator = simEvaluator(ctx, learner, () => day, { noise: o.evaluatorNoise, seed: o.seed });
  const ledger = new Ledger(ctx, learner.id);
  const events: LedgerEvent[] = [];
  const push = (e: LedgerEvent) => {
    events.push(e);
    ledger.apply(e);
  };
  if (o.writing !== false) push(await qualify(evaluator, writingTasks(ctx), (t, id) => anchorRequest(ctx, t, id, at(day)), at(day, -1)));

  const seen = new Set<string>();
  const recent: { item: string; targets: string[]; format: string }[] = [];
  const sessions: RunResult["sessions"] = [];
  const recommendations: RunResult["recommendations"] = [];
  let n = 0;
  outer: for (const [s, d] of o.sessionDays.entries()) {
    day = d;
    let writingThisSession = 0;
    for (let k = 0; k < o.itemsPerSession; k++) {
      const now = at(d, k);
      let itemId: string;
      let rec: Recommendation | null = null;
      if (o.order === "random") {
        const pool = [...ctx.content.items.values()].filter((i) => !seen.has(i.id) && (!o.only || o.only.has(i.id)) && i.kind === "code").map((i) => i.id);
        if (!pool.length) break outer;
        itemId = pool[Math.floor(next() * pool.length)];
      } else {
        rec = recommend({
          index: ctx.index,
          content: ctx.content,
          composite: ledger.composite,
          goal: o.goal,
          now,
          seen,
          recent,
          writingThisSession,
          writingAvailable: o.writing !== false,
          only: o.only,
        });
        if (!rec.choice) break outer;
        itemId = rec.choice.item;
        recommendations.push({ now, item: itemId, mode: rec.mode, explanation: rec.explanation });
      }
      const item = ctx.content.items.get(itemId)!;
      const evId = `${learner.id}:e${n}`;
      if (item.kind === "code") {
        push({ kind: "evidence", id: evId, at: now, session: `${learner.id}:s${s}`, item: { id: item.id, version: item.version }, response: respond(learner, item, d, next) });
      } else {
        const text = writeResponse(learner, item, d);
        push({ kind: "evidence", id: evId, at: now, session: `${learner.id}:s${s}`, item: { id: item.id, version: item.version }, response: { kind: "writing", text } });
        const req = buildEvaluationRequest(item, evId, text, ledger.composite, ctx.index, now);
        push({ kind: "proposal", id: `p:${evId}`, at: now, evidence: evId, evaluator: { id: evaluator.id, model: evaluator.model }, body: await evaluator.evaluate(req) });
        writingThisSession++;
      }
      seen.add(item.id);
      recent.unshift({ item: item.id, targets: item.kind === "code" ? [item.target] : item.targets, format: item.format });
      n++;
      o.onItem?.({ session: s, n, item: item.id, rec, ledger, now });
      if (o.stop?.(ledger, now)) break outer;
    }
    sessions.push({ day: d, now: at(d, o.itemsPerSession), composite: structuredClone(ledger.composite), items: n });
  }
  return { learner, ledger, sessions, items: n, recommendations };
}

export function hashId(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}
