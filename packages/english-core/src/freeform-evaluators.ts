/**
 * E3 evaluators and the measurements that decide whether any evaluator may be trusted.
 *
 *   mockFreeformEvaluator  deterministic stand-in for protocols evaluate.v2 and short.v1, with
 *                          configurable noise, bias, anchoring, drift and failure behaviours (for tests)
 *   humanEvaluator         a teacher's marks entering through the same checks as any evaluator
 *   gatewayEvaluator       the device's client for the server gateway (transport injected; no network here)
 *   qualifyFreeform        noise and bias on writing anchors, agreement on short-answer anchors
 *   anchoringBiasTest      do shown estimates pull this evaluator's bands? (decides estimates_allowed)
 *   DriftMonitor           hidden drift anchors scored among live requests
 *
 * None of these can change a composite. Only the controlled updater can, after its checks.
 */
import type { Evaluator } from "./evaluation.ts";
import { type ShortRequest, type WritingRequestV2, SHORT_V1, WRITING_V2, buildShortRequest, buildWritingRequestV2, parseShortProposal } from "./freeform.ts";
import type { FrameworkIndex } from "./framework.ts";
import { QUALIFICATION } from "./evaluators.ts";
import { parseProposal } from "./evaluation.ts";
import { fnv1a, gaussian, rng } from "./model.ts";
import type { AnchorSet, CapabilityId, Composite, QualificationEvent, ShortItem, WritingTask } from "./types.ts";

export type FreeformRequest = WritingRequestV2 | ShortRequest;
export const isShortRequest = (r: FreeformRequest): r is ShortRequest => r.prompt_version === SHORT_V1;

/** Ways a stand-in evaluator can go wrong, to test that the updater catches (or cannot catch) each. */
export type Behaviour =
  | "contradict_band" // band far outside its own criterion scores
  | "drift_from_criteria" // band inside their range but more than one band from their mean
  | "incomplete_criteria" // one criterion left unscored
  | "no_criteria" // a band with no criterion scores at all
  | "unknown_criterion" // a criterion id the rubric does not have
  | "invent_criterion_quote" // a criterion quote that is not in the response
  | "plausible_inflation" // everything well formed and quoted, consistently, but two bands too high
  | "misjudge_quote" // quotes a real error and calls it correct (high band, consistent criteria)
  | "mark_present_without_quote"
  | "mark_all_present" // every key point present, with real quotes, whatever the answer says
  | "skip_key_point"
  | "extra_field_score"; // tries to return a score of its own

export interface FreeformMockConfig {
  id: string;
  seed: number;
  /** Writing: band noise (sd). */
  noise: number;
  bias?: number;
  /** Pull towards an estimate shown in the request: band ← (1 − anchoring)·band + anchoring·shown. */
  anchoring?: number;
  /** Short answers: chance of getting any one key-point mark wrong. */
  markError?: number;
  /** After this many requests, add this bias (to test drift detection). */
  driftAfter?: { requests: number; bias: number };
  /** What the response really shows (the test or simulation knows; nothing else does). */
  oracle: (req: FreeformRequest) => { bands?: Record<CapabilityId, number>; marks?: Record<string, boolean>; misconceptions?: string[] } | null;
  behaviours?: (req: FreeformRequest) => Behaviour[];
}

/** Sentences of a response, as an evaluator would quote them (verbatim). */
export function sentences(text: string): string[] {
  return (text.match(/[^.!?\n]+[.!?]?/g) ?? []).map((s) => s.trim()).filter((s) => s.length > 2);
}

const half = (x: number) => Math.round(Math.min(8, Math.max(1, x)) * 2) / 2;

export function mockFreeformEvaluator(cfg: FreeformMockConfig): Evaluator {
  let count = 0;
  const run = async (req: FreeformRequest): Promise<unknown> => {
    count++;
    const truth = cfg.oracle(req);
    if (!truth) throw new Error(`mock evaluator ${cfg.id} has no oracle answer for ${req.request_id}`);
    const next = rng((cfg.seed ^ parseInt(fnv1a(req.request_id), 16)) >>> 0);
    const b = new Set(cfg.behaviours?.(req) ?? []);
    const quotes = sentences(req.response.text);
    const quote = (k: number) => quotes[k % Math.max(1, quotes.length)] ?? req.response.text.slice(0, 40);
    const drift = cfg.driftAfter && count > cfg.driftAfter.requests ? cfg.driftAfter.bias : 0;
    const flags = { off_task: false, too_short: false, possibly_copied: false, safeguarding: false };
    if (isShortRequest(req)) {
      const key_points = req.key_points.map((k, i) => {
        let present = truth.marks?.[k.id] ?? false;
        if (cfg.markError && next() < cfg.markError) present = !present;
        if (b.has("mark_all_present")) present = true;
        return { id: k.id, present, quote: present && !b.has("mark_present_without_quote") ? quote(i) : null };
      });
      const body: Record<string, unknown> = { evidence_id: req.request_id.replace(/^req:/, ""), item: { id: req.item.id, version: req.item.version }, key_points: b.has("skip_key_point") ? key_points.slice(1) : key_points, misconceptions: truth.misconceptions ?? [], flags, rationale: "Stand-in evaluator." };
      if (b.has("extra_field_score")) body.score = 1;
      return body;
    }
    const judgements = req.targets.map((t, ti) => {
      let level = (truth.bands?.[t.capability] ?? 4) + (cfg.bias ?? 0) + drift + cfg.noise * gaussian(next);
      if (t.current && cfg.anchoring) level = (1 - cfg.anchoring) * level + cfg.anchoring * t.current.mean;
      if (b.has("plausible_inflation") || b.has("misjudge_quote")) level += 2;
      let criteria: unknown[] = t.criteria.map((c, k) => ({ id: c.id, band: half(level + 0.4 * gaussian(next)), quote: quote(ti + k) }));
      const mean = (criteria as { band: number }[]).reduce((s, c) => s + c.band, 0) / criteria.length;
      let band = half(mean);
      if (b.has("contradict_band")) band = half(Math.max(...(criteria as { band: number }[]).map((c) => c.band)) + 2);
      if (b.has("drift_from_criteria")) {
        const cs = criteria as { band: number }[];
        // spread the criteria, then put the band at one end: inside their range, far from their mean
        cs.forEach((c, k) => (c.band = half(mean + (k % 2 === 0 ? -1.75 : 1.75))));
        band = Math.max(...cs.map((c) => c.band));
      }
      if (b.has("incomplete_criteria")) criteria = criteria.slice(1);
      if (b.has("no_criteria")) criteria = [];
      if (b.has("unknown_criterion")) criteria = [...criteria, { id: `${t.capability}#99`, band, quote: quote(0) }];
      if (b.has("invent_criterion_quote")) (criteria[0] as { quote: string }).quote = "a sentence the learner never wrote";
      return { capability: t.capability, band, confidence: "medium", criteria, quotes: [quote(ti)], misconceptions: [], rationale: "Stand-in evaluator." } as Record<string, unknown>;
    });
    const body: Record<string, unknown> = { evidence_id: req.request_id.replace(/^req:/, ""), item: { id: req.task.id, version: req.task.version }, judgements, not_observable: [], flags };
    if (b.has("extra_field_score")) (judgements[0] as Record<string, unknown>).estimate = 7;
    return body;
  };
  return {
    id: cfg.id,
    model: "mock",
    async evaluate() {
      throw new Error(`${cfg.id} only answers E3 protocols (${WRITING_V2}, ${SHORT_V1})`);
    },
    evaluateFreeform: run,
  };
}

/** A teacher (or panel) marking through the same channel as any evaluator: their marks are proposals, checked like any other. */
export function humanEvaluator(id: string, mark: (req: FreeformRequest) => unknown): Evaluator {
  return {
    id,
    model: "human",
    async evaluate() {
      throw new Error("human marking uses the E3 protocols");
    },
    async evaluateFreeform(req) {
      return mark(req);
    },
  };
}

/**
 * The device's client for the server gateway (E3a). The gateway checks consent, removes identifiers,
 * records provenance and routes to an adapter; in E3a every live provider is disabled there. The
 * transport (`send`) is injected by the platform, so the core has no network code and tests never touch
 * the network.
 */
export function gatewayEvaluator(o: { id: string; endpoint: string; token: string; send: (url: string, init: { method: string; headers: Record<string, string>; body: string }) => Promise<{ ok: boolean; status: number; json(): Promise<unknown> }> }): Evaluator {
  return {
    id: o.id,
    model: "gateway",
    async evaluate() {
      throw new Error("the gateway accepts E3 protocols only");
    },
    async evaluateFreeform(req) {
      const r = await o.send(o.endpoint, { method: "POST", headers: { "content-type": "application/json", authorization: `Token ${o.token}` }, body: JSON.stringify({ request: req }) });
      const body = (await r.json()) as { proposal?: unknown; error?: string };
      if (!r.ok) throw new Error(`gateway refused the request (${r.status}): ${body.error ?? "no reason given"}`);
      return body.proposal;
    },
  };
}

// ---------------------------------------------------------------- qualification

export const SHORT_QUALIFICATION = { minAgreement: 0.9, maxFailures: 0.05 };

const inSet = (a: { set?: AnchorSet }, set: AnchorSet) => a.set === set || a.set === undefined;

/**
 * Qualify an evaluator on E3 protocols: noise and bias per capability on writing anchors (the same
 * limits as E1), and key-point agreement on short-answer anchors. Only anchors of the requested set
 * (default: qualification) are used, so an evaluator is never checked on examples it was shown.
 * Malformed outputs count against it.
 */
export async function qualifyFreeform(
  evaluator: Evaluator,
  o: {
    tasks: WritingTask[];
    shortItems: ShortItem[];
    index: FrameworkIndex;
    composite: Composite;
    at: string;
    candidateAnchors?: boolean;
    set?: AnchorSet;
    estimatesAllowed?: boolean;
    drifting?: boolean;
  },
): Promise<QualificationEvent> {
  if (!evaluator.evaluateFreeform) throw new Error(`${evaluator.id} does not support the E3 protocols`);
  const set = o.set ?? "qualification";
  const use = (a: { trusted: boolean; set?: AnchorSet }) => inSet(a, set) && (a.trusted || !!o.candidateAnchors);
  let usedCandidates = false;
  let failures = 0;
  let requests = 0;
  const diffs = new Map<string, number[]>();
  for (const task of o.tasks)
    for (const a of task.anchors.filter(use)) {
      if (!a.trusted) usedCandidates = true;
      requests++;
      const req = buildWritingRequestV2(task, `anchor:${a.id}`, a.text, o.composite, o.index, o.at, { anchorSet: o.candidateAnchors ? "candidates" : "trusted" });
      const parsed = parseProposal(await evaluator.evaluateFreeform(req));
      if (!parsed.ok) {
        failures++;
        continue;
      }
      for (const j of parsed.proposal.judgements) {
        const truth = a.scores[j.capability];
        if (truth !== undefined) diffs.set(j.capability, [...(diffs.get(j.capability) ?? []), j.band - truth]);
      }
    }
  let agree = 0;
  let marks = 0;
  for (const item of o.shortItems)
    for (const a of item.anchors.filter(use)) {
      if (!a.trusted) usedCandidates = true;
      requests++;
      const req = buildShortRequest(item, `anchor:${a.id}`, a.text, o.index, { anchorSet: o.candidateAnchors ? "candidates" : "trusted" });
      const parsed = parseShortProposal(await evaluator.evaluateFreeform(req));
      const n = Object.keys(a.marks).length;
      marks += n;
      if (!parsed.ok) {
        failures++;
        continue;
      }
      for (const k of parsed.proposal.key_points) if (a.marks[k.id] === k.present) agree++;
    }
  const detail: QualificationEvent["detail"] = {};
  const all: number[] = [];
  for (const [cap, d] of diffs) {
    all.push(...d);
    detail[cap] = { n: d.length, noise: Math.sqrt(d.reduce((s, x) => s + x * x, 0) / d.length), bias: d.reduce((s, x) => s + x, 0) / d.length };
  }
  const noise = all.length ? Math.sqrt(all.reduce((s, x) => s + x * x, 0) / all.length) : 0;
  const bias = all.length ? all.reduce((s, x) => s + x, 0) / all.length : 0;
  const biasLimit = (d: { n: number; noise: number }) => Math.max(QUALIFICATION.maxBias, (2 * d.noise) / Math.sqrt(d.n));
  const writingOk = Object.values(detail).every((d) => d.noise <= QUALIFICATION.maxNoise && Math.abs(d.bias) <= biasLimit(d));
  const short = marks ? { n: marks, agreement: agree / marks, qualified: agree / marks >= SHORT_QUALIFICATION.minAgreement } : undefined;
  const failureOk = requests > 0 && failures / requests <= SHORT_QUALIFICATION.maxFailures;
  const qualified = requests > 0 && failureOk && writingOk && (short?.qualified ?? true);
  return {
    kind: "qualification",
    id: `q:${evaluator.id}:${o.at}`,
    at: o.at,
    evaluator: evaluator.id,
    noise,
    bias,
    qualified,
    drifting: o.drifting ? !qualified : false,
    anchor_set: usedCandidates ? "candidates" : "trusted",
    detail,
    ...(short ? { short } : {}),
    estimates_allowed: o.estimatesAllowed ?? false,
  };
}

// ---------------------------------------------------------------- anchoring bias

export const ANCHORING = { shift: 1.5, maxPull: 0.3 };

/**
 * Score the qualification anchors three times: showing the agreed score as the learner's estimate, then
 * an estimate `shift` bands too high, then too low. If the bands move by more than `maxPull` on average,
 * estimates must not be shown to this evaluator (they would leak into its judgements).
 */
export async function anchoringBiasTest(
  evaluator: Evaluator,
  o: { tasks: WritingTask[]; index: FrameworkIndex; composite: Composite; at: string; candidateAnchors?: boolean },
): Promise<{ pullUp: number; pullDown: number; n: number; estimatesAllowed: boolean }> {
  if (!evaluator.evaluateFreeform) throw new Error(`${evaluator.id} does not support the E3 protocols`);
  const up: number[] = [];
  const down: number[] = [];
  for (const task of o.tasks)
    for (const a of task.anchors.filter((x) => inSet(x, "qualification") && (x.trusted || !!o.candidateAnchors))) {
      const score = async (delta: number) => {
        const shown = Object.fromEntries(Object.entries(a.scores).map(([c, v]) => [c, v + delta]));
        const req = buildWritingRequestV2(task, `anchor:${a.id}`, a.text, o.composite, o.index, o.at, { anchorSet: o.candidateAnchors ? "candidates" : "trusted", includeEstimates: true, estimatesOverride: shown });
        const p = parseProposal(await evaluator.evaluateFreeform!(req));
        return p.ok ? new Map(p.proposal.judgements.map((j) => [j.capability, j.band])) : new Map<string, number>();
      };
      const [t, hi, lo] = [await score(0), await score(ANCHORING.shift), await score(-ANCHORING.shift)];
      for (const [cap, b] of t) {
        if (hi.has(cap)) up.push(hi.get(cap)! - b);
        if (lo.has(cap)) down.push(b - lo.get(cap)!);
      }
    }
  const mean = (x: number[]) => (x.length ? x.reduce((s, v) => s + v, 0) / x.length : 0);
  const pullUp = mean(up);
  const pullDown = mean(down);
  return { pullUp, pullDown, n: up.length, estimatesAllowed: up.length > 0 && Math.max(Math.abs(pullUp), Math.abs(pullDown)) <= ANCHORING.maxPull };
}

// ---------------------------------------------------------------- drift

/** One hidden drift anchor every `every` live requests (deterministic, so it can be audited). */
export const isDriftSlot = (requestNumber: number, every = 20) => requestNumber > 0 && requestNumber % every === 0;

/**
 * Hidden drift anchors scored among live requests. With at least `minN` results in the window, the
 * evaluator is drifting if its noise or bias leaves the qualification limits; the returned event,
 * applied to the ledger, makes check 7 hold its new proposals until it is re-qualified.
 */
export class DriftMonitor {
  private diffs: number[] = [];
  readonly evaluator: string;
  readonly window: number;
  readonly minN: number;
  constructor(evaluator: string, window = 20, minN = 6) {
    this.evaluator = evaluator;
    this.window = window;
    this.minN = minN;
  }
  record(band: number, agreed: number): void {
    this.diffs.push(band - agreed);
    if (this.diffs.length > this.window) this.diffs.shift();
  }
  status(): { n: number; noise: number; bias: number; drifting: boolean } {
    const d = this.diffs;
    const n = d.length;
    if (!n) return { n, noise: 0, bias: 0, drifting: false };
    const noise = Math.sqrt(d.reduce((s, x) => s + x * x, 0) / n);
    const bias = d.reduce((s, x) => s + x, 0) / n;
    const limit = Math.max(QUALIFICATION.maxBias, (2 * noise) / Math.sqrt(n));
    return { n, noise, bias, drifting: n >= this.minN && (noise > QUALIFICATION.maxNoise || Math.abs(bias) > limit) };
  }
  /** The evaluator's qualification with its drift status applied (append to the ledger). */
  event(base: QualificationEvent, at: string): QualificationEvent {
    const s = this.status();
    return { ...base, id: `q:${this.evaluator}:drift:${at}`, at, drifting: s.drifting };
  }
}
