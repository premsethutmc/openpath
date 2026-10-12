/**
 * Evaluator adapters that need no network and cost nothing, plus the anchor
 * calibration that every evaluator (including real LLM adapters, E3) must
 * pass before its proposals can change a composite.
 *
 *   mock    deterministic stand-in with configurable noise, bias and faults
 *   replay  returns recorded outputs (e.g. captured from a real LLM) by request fingerprint
 */
import { type EvaluationRequest, type Evaluator, parseProposal } from "./evaluation.ts";
import { fnv1a, gaussian, rng } from "./model.ts";
import type { CapabilityId, QualificationEvent, WritingTask } from "./types.ts";

export type Fault =
  | "invent_quote"
  | "out_of_range"
  | "unknown_tag"
  | "foreign_capability"
  | "set_stage"
  | "bad_schema"
  | "off_task_flag"
  | "inflate_spelling";

export interface MockConfig {
  id: string;
  seed: number;
  noise: number;
  bias?: number;
  /** What the response "really" shows, per capability (the simulator knows this; nothing else does). */
  oracle: (request: EvaluationRequest) => { bands: Record<CapabilityId, number>; misconceptions?: Record<CapabilityId, string[]> } | null;
  /** Faults to inject, by request id (for testing the updater). */
  faults?: (request: EvaluationRequest) => Fault[];
}

export function firstSentence(text: string, max = 60): string {
  const t = text.trim();
  const end = t.search(/[.!?]/);
  const s = end > 0 ? t.slice(0, end) : t;
  return s.length > max ? s.slice(0, max) : s;
}

export function mockEvaluator(cfg: MockConfig): Evaluator {
  return {
    id: cfg.id,
    model: "mock",
    async evaluate(req) {
      const truth = cfg.oracle(req);
      if (!truth) throw new Error(`mock evaluator ${cfg.id} has no oracle answer for ${req.request_id}`);
      const next = rng((cfg.seed ^ parseInt(fnv1a(req.request_id), 16)) >>> 0);
      const faults = new Set(cfg.faults?.(req) ?? []);
      const quote = firstSentence(req.response.text);
      const judgements = req.targets.map((t) => {
        const raw = truth.bands[t.capability] + (cfg.bias ?? 0) + cfg.noise * gaussian(next);
        return {
          capability: t.capability,
          band: Math.round(Math.min(8, Math.max(1, raw)) * 2) / 2,
          confidence: "medium",
          quotes: [quote],
          misconceptions: truth.misconceptions?.[t.capability] ?? [],
          rationale: "Stand-in evaluator: true level plus measurement noise.",
        } as Record<string, unknown>;
      });
      const j0 = judgements[0];
      if (faults.has("invent_quote")) j0.quotes = ["This sentence was never written by the learner"];
      if (faults.has("out_of_range")) j0.band = 9.5;
      if (faults.has("unknown_tag")) j0.misconceptions = ["made_up_tag"];
      if (faults.has("foreign_capability")) judgements.push({ ...j0, capability: "EN.RDG.INF.motives" });
      if (faults.has("set_stage")) j0.stage = "mastered";
      if (faults.has("inflate_spelling")) {
        const s = judgements.find((j) => j.capability === "EN.WRT.ACC.spelling");
        if (s) s.band = 8;
      }
      const body: Record<string, unknown> = {
        evidence_id: req.request_id.replace(/^req:/, ""),
        item: { id: req.task.id, version: req.task.version },
        judgements,
        not_observable: [],
        flags: { off_task: faults.has("off_task_flag"), too_short: false, possibly_copied: false, safeguarding: false },
      };
      if (faults.has("bad_schema")) delete body.flags;
      return body;
    },
  };
}

export function requestFingerprint(req: EvaluationRequest): string {
  return `${req.task.id}@${req.task.version}:${fnv1a(req.response.text)}`;
}

/** Replays recorded evaluator outputs. A missing recording is an error, never a silent pass. */
export function replayEvaluator(id: string, recordings: Record<string, unknown>, model = "replay"): Evaluator {
  return {
    id,
    model,
    async evaluate(req) {
      const key = requestFingerprint(req);
      if (!(key in recordings)) throw new Error(`replay evaluator ${id} has no recording for ${key}`);
      return structuredClone(recordings[key]);
    },
  };
}

export const QUALIFICATION = { maxNoise: 0.9, maxBias: 0.3 };

/**
 * Score anchor responses (with agreed human scores) and measure how far the
 * evaluator is from them. Noise = root-mean-square difference; bias = mean
 * signed difference. Qualified only if every capability is within limits.
 */
export async function qualify(
  evaluator: Evaluator,
  tasks: WritingTask[],
  buildAnchorRequest: (task: WritingTask, anchorId: string) => EvaluationRequest,
  at: string,
  opts: { trustedOnly?: boolean; drifting?: boolean } = {},
): Promise<QualificationEvent> {
  const diffs = new Map<string, number[]>();
  for (const task of tasks)
    for (const anchor of task.anchors) {
      if (opts.trustedOnly && !anchor.trusted) continue;
      const parsed = parseProposal(await evaluator.evaluate(buildAnchorRequest(task, anchor.id)));
      if (!parsed.ok) continue;
      for (const j of parsed.proposal.judgements) {
        const truth = anchor.scores[j.capability];
        if (truth === undefined) continue;
        diffs.set(j.capability, [...(diffs.get(j.capability) ?? []), j.band - truth]);
      }
    }
  const detail: QualificationEvent["detail"] = {};
  const all: number[] = [];
  for (const [cap, d] of diffs) {
    all.push(...d);
    detail[cap] = { n: d.length, noise: Math.sqrt(d.reduce((s, x) => s + x * x, 0) / d.length), bias: d.reduce((s, x) => s + x, 0) / d.length };
  }
  const noise = all.length ? Math.sqrt(all.reduce((s, x) => s + x * x, 0) / all.length) : Infinity;
  const bias = all.length ? all.reduce((s, x) => s + x, 0) / all.length : 0;
  // A lean smaller than its own sampling error (2 standard errors) is not evidence of bias:
  // with a dozen anchors, an unbiased evaluator would otherwise fail by chance about half the time.
  const biasLimit = (d: { n: number; noise: number }) => Math.max(QUALIFICATION.maxBias, (2 * d.noise) / Math.sqrt(d.n));
  const withinLimits = all.length > 0 && Object.values(detail).every((d) => d.noise <= QUALIFICATION.maxNoise && Math.abs(d.bias) <= biasLimit(d));
  return {
    kind: "qualification",
    id: `q:${evaluator.id}:${at}`,
    at,
    evaluator: evaluator.id,
    noise,
    bias,
    qualified: withinLimits,
    drifting: opts.drifting ? !withinLimits : false,
    detail,
  };
}
