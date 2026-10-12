/**
 * The learner composite: one estimate per capability leaf of the full
 * framework, with uncertainty, evidence trail, misconceptions and stages.
 *
 * Two estimates are kept per capability:
 *   direct    – only evidence about this capability itself
 *   combined  – direct evidence plus small, capped effects from coupled capabilities
 * Selection uses `combined` (it is the best guess). Stages use `direct`, so an
 * inferred change can never make a capability demonstrated or mastered.
 */
import { type FrameworkIndex, ROOT, isSpecified } from "./framework.ts";
import { clamp, daysBetween, inflate, normalQuantile } from "./model.ts";
import type { CapabilityId, Composite, Estimate, NodeState, Policy } from "./types.ts";

export const MODEL_VERSION = "composite@1";
const MAX_TRACE = 40;
const MAX_EVIDENCE = 50;

export function createComposite(index: FrameworkIndex, learnerId: string): Composite {
  const { mean, sd } = index.framework.prior;
  const nodes: Record<string, NodeState> = {};
  for (const id of index.leafIds) {
    nodes[id] = {
      combined: { mean, variance: sd * sd },
      direct: { mean, variance: sd * sd },
      asOf: null,
      directN: 0,
      contexts: [],
      lastDirectAt: null,
      misconceptions: {},
      binary: [],
      demonstrations: [],
      evidence: [],
    };
  }
  return { learnerId, framework: index.key, model: MODEL_VERSION, nodes, appliedThrough: null, updatedAt: null };
}

const priorVariance = (index: FrameworkIndex) => index.framework.prior.sd ** 2;

/** Apply uncertainty growth up to `at` (estimates only ever move forward in time). */
function touch(node: NodeState, at: string, index: FrameworkIndex): void {
  const p = index.framework.policy;
  const days = daysBetween(node.asOf, at);
  if (node.asOf && days > 0) {
    node.combined = inflate(node.combined, days, p.time_variance_per_day, priorVariance(index));
    node.direct = inflate(node.direct, days, p.time_variance_per_day, priorVariance(index));
  }
  if (!node.asOf || days > 0) node.asOf = at;
}

function decayMisconceptions(node: NodeState, at: string, p: Policy): void {
  for (const [tag, m] of Object.entries(node.misconceptions)) {
    const days = daysBetween(m.at, at);
    if (days > 0) node.misconceptions[tag] = { strength: m.strength * 0.5 ** (days / p.misconception_half_life_days), at };
  }
}

export function demonstratedLevel(node: NodeState, p: Policy): number | null {
  if (node.directN < p.demonstrated_min_direct || node.contexts.length < p.demonstrated_min_contexts) return null;
  const z = normalQuantile(p.demonstrated_probability);
  const level = Math.floor((node.direct.mean - z * Math.sqrt(node.direct.variance)) * 2) / 2;
  return level >= 1 ? Math.min(level, 8) : null;
}

/** Highest level demonstrated in two different sessions at least `mastery_gap_days` apart. */
export function masteredLevel(node: NodeState, p: Policy): number | null {
  let best: number | null = null;
  const d = node.demonstrations;
  for (let i = 0; i < d.length; i++)
    for (let j = i + 1; j < d.length; j++) {
      if (d[i].session === d[j].session || daysBetween(d[i].at, d[j].at) < p.mastery_gap_days) continue;
      const level = Math.min(d[i].level, d[j].level);
      if (best === null || level > best) best = level;
    }
  return best;
}

export interface DirectObservation {
  capability: CapabilityId;
  at: string;
  session: string;
  context: string;
  decisionId: string;
  update: (e: Estimate) => Estimate;
  /** Largest allowed change of the mean from this one observation (evaluator evidence). */
  maxShift?: number;
  misconceptions: string[];
  /** For right/wrong items: difficulty and outcome (used for the struggling rule and misconception fading). */
  binary?: { b: number; correct: boolean };
  /** A judged band at or above the current estimate counts as success for misconception fading. */
  success?: boolean;
}

export interface Applied {
  before: { mean: number; sd: number };
  after: { mean: number; sd: number };
  capped: boolean;
  inferred: { capability: CapabilityId; shift: number }[];
}

function capShift(before: Estimate, after: Estimate, maxShift?: number): { est: Estimate; capped: boolean } {
  if (maxShift === undefined) return { est: after, capped: false };
  const shift = after.mean - before.mean;
  if (Math.abs(shift) <= maxShift) return { est: after, capped: false };
  return { est: { mean: before.mean + Math.sign(shift) * maxShift, variance: after.variance }, capped: true };
}

/** Apply one piece of direct evidence about one capability, then its capped effects on coupled capabilities. */
export function applyDirect(composite: Composite, index: FrameworkIndex, o: DirectObservation): Applied {
  const p = index.framework.policy;
  const node = composite.nodes[o.capability];
  if (!node) throw new Error(`unknown capability ${o.capability}`);
  touch(node, o.at, index);
  decayMisconceptions(node, o.at, p);

  const before = node.combined;
  const atOrBelow = o.binary ? o.binary.b <= node.direct.mean : false;
  const c = capShift(before, o.update(before), o.maxShift);
  const d = capShift(node.direct, o.update(node.direct), o.maxShift);
  node.combined = c.est;
  node.direct = d.est;
  node.directN += 1;
  if (!node.contexts.includes(o.context)) node.contexts.push(o.context);
  node.lastDirectAt = o.at;
  if (o.binary) {
    node.binary.push({ session: o.session, at: o.at, b: o.binary.b, correct: o.binary.correct, atOrBelow });
    if (node.binary.length > MAX_TRACE) node.binary.shift();
  }
  const success = o.binary ? o.binary.correct : o.success === true;
  if (success) for (const m of Object.values(node.misconceptions)) m.strength *= p.misconception_fade_on_success;
  for (const tag of o.misconceptions) {
    const prev = node.misconceptions[tag]?.strength ?? 0;
    node.misconceptions[tag] = { strength: prev + (1 - prev) * p.misconception_gain, at: o.at };
  }
  const level = demonstratedLevel(node, p);
  if (level !== null) {
    const last = node.demonstrations[node.demonstrations.length - 1];
    if (last && last.session === o.session) {
      last.level = level;
      last.at = o.at;
    } else node.demonstrations.push({ session: o.session, at: o.at, level });
  }
  node.evidence.push(o.decisionId);
  if (node.evidence.length > MAX_EVIDENCE) node.evidence.shift();

  // Coupled capabilities: a small, capped, flagged change to their combined estimate only.
  const shift = node.combined.mean - before.mean;
  const fraction = before.variance > 0 ? 1 - node.combined.variance / before.variance : 0;
  const inferred: Applied["inferred"] = [];
  for (const { other, strength } of index.couplings.get(o.capability) ?? []) {
    const n = composite.nodes[other];
    touch(n, o.at, index);
    const s = clamp(strength * shift, -p.inferred_max_shift, p.inferred_max_shift);
    n.combined = { mean: n.combined.mean + s, variance: n.combined.variance * (1 - strength * strength * fraction) };
    if (Math.abs(s) > 1e-9) inferred.push({ capability: other, shift: s });
  }
  composite.updatedAt = o.at;
  return {
    before: { mean: before.mean, sd: Math.sqrt(before.variance) },
    after: { mean: node.combined.mean, sd: Math.sqrt(node.combined.variance) },
    capped: c.capped,
    inferred,
  };
}

// ---------------------------------------------------------------- reading the composite

export type Stage = "unassessed" | "struggling" | "developing" | "demonstrated" | "mastered" | "needs_review";

export interface LeafView {
  id: CapabilityId;
  name: string;
  specified: boolean;
  mean: number;
  sd: number;
  direct: { mean: number; sd: number; n: number };
  inferred: boolean;
  contexts: string[];
  lastDirectAt: string | null;
  stage: Stage;
  demonstrated: number | null;
  mastered: number | null;
  /** Mastered earlier, but not currently demonstrated at that level. */
  masteredBefore: number | null;
  misconceptions: { id: string; strength: number }[];
}

export function isStruggling(node: NodeState, p: Policy): boolean {
  const sessions = [...new Set(node.binary.map((t) => t.session))].slice(-p.struggling_window_sessions);
  const recent = node.binary.filter((t) => sessions.includes(t.session) && t.atOrBelow);
  if (recent.length < p.struggling_min_observations) return false;
  return recent.filter((t) => t.correct).length / recent.length < p.struggling_max_success;
}

export function leafView(composite: Composite, index: FrameworkIndex, id: CapabilityId, now: string): LeafView {
  const p = index.framework.policy;
  const node = composite.nodes[id];
  const cap = index.leaves.get(id)!;
  const days = daysBetween(node.asOf, now);
  const combined = node.asOf ? inflate(node.combined, days, p.time_variance_per_day, priorVariance(index)) : node.combined;
  const direct = node.asOf ? inflate(node.direct, days, p.time_variance_per_day, priorVariance(index)) : node.direct;
  const demonstrated = demonstratedLevel(node, p);
  const masteredHist = masteredLevel(node, p);
  // Mastery is reported only while the capability is still demonstrated at that level.
  const slipped = masteredHist !== null && (demonstrated === null || demonstrated < masteredHist);
  const mastered = slipped ? null : masteredHist;
  let stage: Stage;
  if (node.directN < 2) stage = "unassessed";
  else if (isStruggling(node, p)) stage = "struggling";
  else if (slipped) stage = "needs_review";
  else if (mastered !== null) stage = "mastered";
  else if (demonstrated !== null) stage = "demonstrated";
  else stage = "developing";
  const misconceptions = Object.entries(node.misconceptions)
    .map(([mid, m]) => ({ id: mid, strength: m.strength * 0.5 ** (Math.max(0, daysBetween(m.at, now)) / p.misconception_half_life_days) }))
    .filter((m) => m.strength >= p.misconception_active)
    .sort((a, b) => b.strength - a.strength);
  return {
    id,
    name: cap.name,
    specified: isSpecified(cap),
    mean: combined.mean,
    sd: Math.sqrt(combined.variance),
    direct: { mean: direct.mean, sd: Math.sqrt(direct.variance), n: node.directN },
    inferred: Math.abs(node.combined.mean - node.direct.mean) > 0.05 || (node.directN === 0 && Math.abs(node.combined.mean - index.framework.prior.mean) > 1e-9),
    contexts: node.contexts,
    lastDirectAt: node.lastDirectAt,
    stage,
    demonstrated,
    mastered,
    masteredBefore: slipped ? masteredHist : null,
    misconceptions,
  };
}

export interface AggregateView {
  id: string;
  name: string;
  mean: number;
  sd: number;
  /** Leaves that count towards this value / all leaves under it. */
  coverage: { counted: number; total: number; assessed: number };
}

/**
 * Values for sub-strands, strands and the root, computed from leaves (weighted
 * mean; uncertainty combined assuming independence). Scope "specified" counts
 * only capabilities specified in this framework version; "all" counts every leaf.
 * Returns null for a node with nothing to count.
 */
export function aggregate(composite: Composite, index: FrameworkIndex, now: string, scope: "specified" | "all" = "specified"): Map<string, AggregateView | null> {
  const leaves = new Map(index.leafIds.map((id) => [id, leafView(composite, index, id, now)]));
  const out = new Map<string, AggregateView | null>();
  const collect = (id: string): { id: string; w: number }[] => {
    const kids = index.children.get(id);
    if (!kids) return [{ id, w: 1 }];
    return kids.flatMap((k) => collect(k.id).map((x) => ({ id: x.id, w: x.w * k.weight })));
  };
  for (const id of index.children.keys()) {
    const all = collect(id);
    const counted = all.filter((x) => scope === "all" || leaves.get(x.id)!.specified);
    const assessed = all.filter((x) => leaves.get(x.id)!.direct.n > 0).length;
    if (!counted.length) {
      out.set(id, null);
      continue;
    }
    const W = counted.reduce((s, x) => s + x.w, 0);
    const mean = counted.reduce((s, x) => s + (x.w / W) * leaves.get(x.id)!.mean, 0);
    const variance = counted.reduce((s, x) => s + (x.w / W) ** 2 * leaves.get(x.id)!.sd ** 2, 0);
    out.set(id, { id, name: index.names.get(id)!, mean, sd: Math.sqrt(variance), coverage: { counted: counted.length, total: all.length, assessed } });
  }
  return out;
}

export { ROOT };
