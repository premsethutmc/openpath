/**
 * Adaptive activity selection, in two explicit modes.
 *
 *   assessment  find out where the learner is: prefer the activity that removes
 *               the largest share of current uncertainty on uncertain capabilities,
 *               and that best settles "has this capability reached the target?"
 *
 *   learning    make progress towards the learner's target: prefer the capability
 *               with the greatest target-relative need (respecting prerequisites
 *               the framework defines), then an activity at a suitable difficulty.
 *               When none exists, step down: a prerequisite, then an easier item
 *               for the same capability. Every gap in the item bank is reported.
 *
 * Fresh and retention items are kept apart. Assessment and learning only use
 * items the learner has not seen (an unseen variant of a seen item counts as
 * unseen, and the ledger flags it). A retention check prefers an unseen item,
 * then an unseen variant, then, after `repeatAfterDays`, a flagged repeat of an
 * item already done; the ledger records a repeat for the retention check only
 * and never moves the estimate with it. So long-term retention tracking does
 * not need an unlimited supply of new questions.
 *
 * Targets come from the learner's goal. Where the goal sets none, the plan's
 * documented default ("the next band up") is used and named in every
 * recommendation; the engine never changes a target.
 *
 * Deterministic: the same composite, goal, content and history always give the
 * same choice (ties are broken by item or capability id).
 */
import { type LeafView, leafView } from "./composite.ts";
import { type ContentIndex, familyOf, goalWeights, itemParams, targetsOf } from "./content.ts";
import type { FrameworkIndex } from "./framework.ts";
import { daysBetween, itemInformation, logistic, normalQuantile, pCorrect } from "./model.ts";
import type { CapabilityId, Composite, Exposure, Goal, Item } from "./types.ts";

export type Mode = "assessment" | "learning";
export type Path = "assessment" | "retention_check" | "contradiction_probe" | "direct" | "prerequisite_step" | "easier_step" | "assessment_fallback" | "none";
/** Why the scheduler chose this kind of activity. */
export type ScheduleReason = "explicit" | "retention_check" | "contradiction" | "initial_assessment" | "probe" | "learning";

/**
 * The hybrid scheduler's settings: an initial experimental configuration, not a fixed product policy.
 * Priority: overdue retention checks, then contradictory evidence, then an initial assessment phase
 * while uncertainty is high, then every `probeEvery`-th activity as an assessment probe, else learning.
 */
export interface SchedulerConfig {
  probeEvery: number;
  initialAssessmentSd: number;
  retentionFirst: boolean;
  contradictionFirst: boolean;
  /**
   * A retention check may reuse an item the learner has already done, flagged as a repeat, once at least
   * this many days have passed since they last saw it, and only when no unseen item or variant fits.
   * Repeats are never used for assessment or learning, and never change the ability estimate.
   */
  repeatAfterDays: number;
}
export const HYBRID: SchedulerConfig = { probeEvery: 3, initialAssessmentSd: 0.9, retentionFirst: true, contradictionFirst: true, repeatAfterDays: 14 };

export interface Target {
  band: number;
  source: "learner" | "default";
  note: string;
}

export interface Scored {
  item: string;
  kind: Item["kind"];
  /** Goal-weighted capabilities this item gives evidence on. */
  targets: CapabilityId[];
  /** The capability this choice is meant to serve (learning mode). */
  focus: CapabilityId | null;
  score: number;
  parts: Record<string, number>;
  /** Predicted chance of success on the focus capability (or the first target). */
  p: number;
  reasons: string[];
  /** For retention checks: whether the item is new to the learner, a variant of one they have seen, or a repeat. */
  exposure?: Exposure;
}

export interface BankGap {
  capability: CapabilityId;
  name: string;
  estimate: { mean: number; sd: number };
  /** Approximate item difficulties that would be suitable now (typed items). */
  suitableDifficulty: [number, number];
  /** Difficulties of the unused items the bank still has for this capability. */
  unusedDifficulties: number[];
  note: string;
}

export interface Recommendation {
  /** The kind of activity chosen. */
  mode: Mode;
  /** How it was scheduled: explicitly by the caller, or by the hybrid scheduler and why. */
  schedule: { policy: "explicit" | "hybrid"; reason: ScheduleReason };
  goal: string;
  target: Target;
  path: Path;
  choice: Scored | null;
  alternatives: Scored[];
  bankGaps: BankGap[];
  explanation: string;
}

export interface SelectionInput {
  index: FrameworkIndex;
  content: ContentIndex;
  composite: Composite;
  goal: Goal;
  now: string;
  /** Items already used for this learner: assessment and learning only ever use items outside this set. */
  seen: Set<string>;
  /**
   * The ledger's record of this learner's history with each item (Ledger.exposures). Lets a retention check
   * fall back to a flagged variant or repeat. Without it, retention checks use unseen items only, as before.
   */
  exposures?: Map<string, { count: number; lastAt: string }>;
  /** Most recent items first, for variety. */
  recent: { item: string; targets: CapabilityId[]; format: string }[];
  /** Writing tasks already given in the current session. */
  writingThisSession: number;
  /** Is an evaluator available for written answers right now (online, consented)? */
  writingAvailable: boolean;
  /** Limit candidates to these items (used by experiments). */
  only?: Set<string>;
  /** "assessment" or "learning" force one mode (for testing); "hybrid" (default) uses the scheduler. */
  mode?: Mode | "hybrid";
  /** Number of activities this learner has done so far (the scheduler's probe counter). */
  activityIndex?: number;
  scheduler?: Partial<SchedulerConfig>;
}

const WRITING_NOISE = 0.9;
const IDEAL = 0.7;
/** A retention item about this likely to succeed at the retained level separates it best from one band lower. */
const RETENTION_PROBE = 0.65;
const ZONE: [number, number] = [0.55, 0.85];
const ZONE_STRUGGLING: [number, number] = [0.7, 0.92];
const ASSESSMENT_SD = 0.9;
const WEAK_PREREQUISITE = 0.7;
const PREREQUISITE_STEP_NEED = 0.5;

const Phi = (z: number): number => 0.5 * (1 + erf(z / Math.SQRT2));
function erf(x: number): number {
  // Abramowitz and Stegun 7.1.26 (max error 1.5e-7)
  const s = Math.sign(x);
  const t = 1 / (1 + 0.3275911 * Math.abs(x));
  const y = 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
  return s * y;
}

export function chooseMode(views: Map<string, LeafView>, weights: Map<string, number>, threshold = ASSESSMENT_SD): Mode {
  let W = 0;
  let S = 0;
  for (const [id, w] of weights) {
    const v = views.get(id);
    if (!v || !v.specified || w <= 0) continue;
    W += w;
    S += w * v.sd;
  }
  return W > 0 && S / W > threshold ? "assessment" : "learning";
}

/** The learner's target band for a capability: explicit (most specific id wins), else the documented default. */
export function resolveTarget(goal: Goal, index: FrameworkIndex, capability: CapabilityId, fallback: Target): Target {
  let node: string | undefined = capability;
  while (node) {
    const t = goal.targets?.[node];
    if (t !== undefined) return { band: t, source: "learner", note: `your target for ${index.names.get(node)} is band ${t}` };
    node = index.parent.get(node);
  }
  return fallback;
}

/** The plan's default when no target is set: the next band above the learner's current median level on the goal. */
export function defaultTarget(views: Map<string, LeafView>, weights: Map<string, number>): Target {
  const means = [...weights].filter(([id, w]) => w > 0 && views.get(id)?.specified).map(([id]) => views.get(id)!.mean).sort((a, b) => a - b);
  const median = means.length ? (means[Math.floor((means.length - 1) / 2)] + means[Math.ceil((means.length - 1) / 2)]) / 2 : 4;
  const band = Math.min(8, Math.floor(median) + 1);
  return { band, source: "default", note: `no target is set, so the default applies: band ${band}, the next band above your current median level (${median.toFixed(1)})` };
}

function predicted(item: Item, v: LeafView): number {
  return item.kind === "code" ? pCorrect(v.mean, itemParams(item)) : logistic(v.mean - item.b);
}

/** Share of the current uncertainty (variance) about a capability that this item is expected to remove. */
export function relativeInformation(item: Item, v: LeafView): number {
  const variance = v.sd * v.sd;
  if (item.kind === "code") return 1 - 1 / (1 + variance * itemInformation(v.mean, itemParams(item)));
  return variance / (variance + WRITING_NOISE ** 2);
}

/** Probability that the capability is below the target band (target-relative need). */
export const need = (v: LeafView, target: number): number => Phi((target - v.mean) / v.sd);

export function recommend(input: SelectionInput, count = 1): Recommendation {
  const { index, content, composite, goal, now } = input;
  const weights = goalWeights(goal, index);
  const views = new Map(index.leafIds.map((id) => [id, leafView(composite, index, id, now)]));
  // Learning works from what is currently verified. After a failed retention check the estimate still
  // averages older evidence, so practice is pitched at the lower level the check supports. The
  // estimate itself is not changed; it is still reported, separately, in the explanation.
  const working = (v: LeafView): LeafView =>
    v.verification.status === "failed" && v.retention.level !== null && v.retention.level < v.mean ? { ...v, mean: v.retention.level } : v;
  const lviews = new Map([...views].map(([id, v]) => [id, working(v)]));
  const cfg: SchedulerConfig = { ...HYBRID, ...input.scheduler };
  const fallbackTarget = defaultTarget(views, weights);
  const targetOf = (cap: CapabilityId) => resolveTarget(goal, index, cap, fallbackTarget);
  const maxW = Math.max(...weights.values(), 1e-9);
  const prior = index.framework.prior.sd;
  const lastCaps = new Set(input.recent.slice(0, 2).flatMap((r) => r.targets));
  const lastFormat = input.recent[0]?.format;

  // Every item the learner could do now; `available` keeps those that serve the goal.
  const pool = [...content.items.values()].filter((item) => {
    if (input.seen.has(item.id) || (input.only && !input.only.has(item.id))) return false;
    return !(item.kind === "writing" && (!input.writingAvailable || input.writingThisSession >= 1));
  });
  const available = pool.filter((item) => targetsOf(item).some((t) => (weights.get(t) ?? 0) > 0 && views.get(t)!.specified));
  const goalTargets = (item: Item) => targetsOf(item).filter((t) => (weights.get(t) ?? 0) > 0 && views.get(t)!.specified);
  const variety = (item: Item) => (goalTargets(item).some((t) => lastCaps.has(t)) ? -0.05 : 0) + (item.format === lastFormat ? -0.03 : 0);

  if (input.mode === "assessment") return { ...assess(), schedule: { policy: "explicit", reason: "explicit" } };
  if (input.mode === "learning") return { ...learn(), schedule: { policy: "explicit", reason: "explicit" } };
  let blockedRetention: BankGap[] = [];
  return hybrid();

  // ------------------------------------------------------------ hybrid scheduler
  function hybrid(): Recommendation {
    // retention checks that are due but could not run are reported with whatever runs instead
    const tag = (r: Recommendation, reason: ScheduleReason, lead?: string): Recommendation => ({ ...r, bankGaps: reason === "retention_check" ? r.bankGaps : [...blockedRetention, ...r.bankGaps], schedule: { policy: "hybrid", reason }, explanation: lead ? `${lead} ${r.explanation}` : r.explanation });
    if (cfg.retentionFirst) {
      const r = retentionCheck();
      if (r) return tag(r, "retention_check");
    }
    if (cfg.contradictionFirst) {
      const c = contradictionProbe();
      if (c) return tag(c, "contradiction");
    }
    if (chooseMode(views, weights, cfg.initialAssessmentSd) === "assessment") return tag(assess(), "initial_assessment", "Starting out, so measuring first.");
    if (cfg.probeEvery > 0 && (input.activityIndex ?? 0) % cfg.probeEvery === cfg.probeEvery - 1)
      return tag(assess(), "probe", `Assessment probe (every ${cfg.probeEvery === 3 ? "third" : `${cfg.probeEvery}th`} activity), to keep the composite reliable.`);
    return tag(learn(), "learning");
  }

  /** An overdue spaced-retention check, on the goal capability most overdue (weighted). */
  function retentionCheck(): Recommendation | null {
    blockedRetention = [];
    const overdue = [...weights]
      .filter(([id, w]) => w > 0 && views.get(id)!.specified && views.get(id)!.retention.status === "overdue")
      .map(([id, w]) => ({ id, v: views.get(id)!, order: (w / maxW) * (1 + views.get(id)!.retention.overdueDays) }))
      .sort((a, b) => b.order - a.order || a.id.localeCompare(b.id));
    // Exposure tiers for retention: an unseen item, else an unseen variant of a seen item, else a repeat
    // seen at least repeatAfterDays ago. The ledger decides the exposure again when the answer arrives.
    const seenFamilies = new Set([...input.seen].map((id) => content.items.get(id)).filter((i): i is Item => !!i).map(familyOf));
    const tierOf = (i: Item): Exposure => (input.seen.has(i.id) ? "repeat" : seenFamilies.has(familyOf(i)) ? "variant" : "fresh");
    const rank: Record<Exposure, number> = { fresh: 0, variant: 1, repeat: 2 };
    const repeatable = [...content.items.values()].filter((i) => {
      if (i.kind !== "code" || !input.seen.has(i.id) || (input.only && !input.only.has(i.id))) return false;
      const last = input.exposures?.get(i.id)?.lastAt;
      return !!last && daysBetween(last, now) >= cfg.repeatAfterDays;
    });
    for (const o of overdue) {
      const R = o.v.retention.level ?? o.v.mean;
      const atRetained: LeafView = { ...o.v, mean: R };
      const pick = [...pool, ...repeatable]
        .filter((i) => targetsOf(i).includes(o.id))
        .map((i) => ({ i, p: predicted(i, atRetained), exposure: tierOf(i) }))
        .sort((a, b) => rank[a.exposure] - rank[b.exposure] || Math.abs(a.p - RETENTION_PROBE) - Math.abs(b.p - RETENTION_PROBE) || a.i.id.localeCompare(b.i.id))[0];
      if (!pick) {
        blockedRetention.push({ ...gapFor(o.id), note: `retention check for ${o.v.name} is overdue, but the bank has no unused item for it, and no used item was last seen ${cfg.repeatAfterDays} or more days ago` });
        continue;
      }
      const T = targetOf(o.id);
      const ret = o.v.retention;
      const day = (iso: string | null) => (iso ? iso.slice(0, 10) : "never");
      const choice: Scored = { item: pick.i.id, kind: pick.i.kind, targets: targetsOf(pick.i), focus: o.id, score: o.order, parts: { overdueDays: ret.overdueDays, retainedLevel: R, information: relativeInformation(pick.i, o.v) }, p: pick.p, reasons: ["retention check", ...(pick.exposure === "fresh" ? [] : [`${pick.exposure} item`])], exposure: pick.exposure };
      const seenNote =
        pick.exposure === "repeat"
          ? ` This is a repeat of an item last seen on ${day(input.exposures!.get(pick.i.id)!.lastAt)}: it counts towards the retention check only and does not change the estimate.`
          : pick.exposure === "variant"
            ? " This is a variant of an item seen before."
            : "";
      return {
        mode: "assessment",
        schedule: { policy: "hybrid", reason: "retention_check" },
        goal: goal.id,
        target: T,
        path: "retention_check",
        choice,
        alternatives: [],
        bankGaps: blockedRetention,
        explanation: `Retention check: ${o.v.name} was ${ret.lastVerifiedAt ? `last verified on ${day(ret.lastVerifiedAt)}` : `first demonstrated on ${day(ret.firstDemonstratedAt)}`} at band ${R}; its check was due on ${day(ret.dueAt)} (${ret.overdueDays.toFixed(0)} days overdue), so it is not currently verified, even though the estimate is ${o.v.mean.toFixed(1)} ± ${o.v.sd.toFixed(1)}. This item tests the retained level (about ${Math.round(pick.p * 100)}% likely to succeed if still at band ${R}).${seenNote}`,
      };
    }
    return null;
  }

  /** Recent direct evidence that disagrees with the estimate: re-measure before teaching on top of it. */
  function contradictionProbe(): Recommendation | null {
    const contradicted = [...weights]
      .filter(([id, w]) => w > 0 && views.get(id)!.specified)
      .map(([id]) => ({ id, why: contradiction(id) }))
      .filter((x): x is { id: string; why: string } => x.why !== null)
      .sort((a, b) => a.id.localeCompare(b.id));
    for (const c of contradicted) {
      const items = available.filter((i) => targetsOf(i).includes(c.id));
      if (!items.length) continue;
      const v = views.get(c.id)!;
      const best = items
        .map((i) => ({ i, r: relativeInformation(i, v) }))
        .sort((a, b) => b.r - a.r || a.i.id.localeCompare(b.i.id))[0];
      const choice: Scored = { item: best.i.id, kind: best.i.kind, targets: goalTargets(best.i), focus: c.id, score: best.r, parts: { information: best.r }, p: predicted(best.i, v), reasons: ["contradictory evidence"] };
      return {
        mode: "assessment",
        schedule: { policy: "hybrid", reason: "contradiction" },
        goal: goal.id,
        target: targetOf(c.id),
        path: "contradiction_probe",
        choice,
        alternatives: [],
        bankGaps: [],
        explanation: `Contradictory evidence: ${c.why}. Re-measuring ${v.name} (${v.mean.toFixed(1)} ± ${v.sd.toFixed(1)}) before building on it; this item is expected to remove ${Math.round(100 * best.r)}% of the remaining uncertainty.`,
      };
    }
    return null;
  }

  /** In the latest session on this capability: failing easy items, or passing hard ones, against the estimate. */
  function contradiction(cap: CapabilityId): string | null {
    const node = composite.nodes[cap];
    const last = node.binary[node.binary.length - 1];
    if (!last) return null;
    const session = node.binary.filter((t) => t.session === last.session);
    const easy = session.filter((t) => t.atOrBelow);
    const hard = session.filter((t) => t.b >= node.direct.mean + 1);
    const rate = (xs: typeof session) => xs.filter((t) => t.correct).length / xs.length;
    const name = views.get(cap)!.name;
    if (easy.length >= 2 && rate(easy) <= 1 / 3) return `${name}: ${easy.filter((t) => !t.correct).length} of ${easy.length} items at or below the estimate were missed in the latest session`;
    if (hard.length >= 2 && rate(hard) >= 0.75) return `${name}: ${hard.filter((t) => t.correct).length} of ${hard.length} items a band or more above the estimate were answered correctly in the latest session`;
    return null;
  }

  // ------------------------------------------------------------ assessment
  function assess(): Recommendation {
    const scored: Scored[] = available.map((item) => {
      const ts = goalTargets(item);
      let value = 0;
      let info = 0;
      let unc = 0;
      let amb = 0;
      for (const t of ts) {
        const v = views.get(t)!;
        const w = (weights.get(t) ?? 0) / maxW;
        const r = relativeInformation(item, v);
        const q = 1 - need(v, targetOf(t).band); // P(already at target)
        const ambiguity = 4 * q * (1 - q);
        const uncertainty = Math.min(1, v.sd / prior);
        value += w * r * (0.5 * uncertainty + 0.5 * ambiguity);
        info += r / ts.length;
        unc += uncertainty / ts.length;
        amb += ambiguity / ts.length;
      }
      const parts = { value, information: info, uncertainty: unc, ambiguity: amb, variety: variety(item) };
      return { item: item.id, kind: item.kind, targets: ts, focus: null, score: value + parts.variety, parts, p: predicted(item, views.get(ts[0])!), reasons: [] };
    });
    scored.sort((a, b) => b.score - a.score || a.item.localeCompare(b.item));
    const choice = scored[0] ?? null;
    return {
      mode: "assessment",
      schedule: { policy: "explicit", reason: "explicit" },
      goal: goal.id,
      target: choice ? targetOf(choice.targets[0]) : fallbackTarget,
      path: choice ? "assessment" : "none",
      choice,
      alternatives: scored.slice(1, Math.max(4, count + 3)),
      bankGaps: [],
      explanation: choice ? explainAssessment(choice) : "Nothing left to assess for this goal.",
    };
  }

  function explainAssessment(c: Scored): string {
    const parts = c.targets.slice(0, 3).map((t) => {
      const v = views.get(t)!;
      const T = targetOf(t);
      const item = content.items.get(c.item)!;
      return `${v.name} ${v.mean.toFixed(1)} ± ${v.sd.toFixed(1)}: this activity is expected to remove ${Math.round(100 * relativeInformation(item, v))}% of that uncertainty; ${Math.round(100 * (1 - need(v, T.band)))}% likely already at band ${T.band}`;
    });
    const T = targetOf(c.targets[0]);
    return `Assessment: chosen to find out where you are, not to practise. ${parts.join("; ")}. Target: ${T.note}.`;
  }

  // ------------------------------------------------------------ learning
  function learn(): Recommendation {
    const caps = [...weights]
      .filter(([id, w]) => w > 0 && lviews.get(id)!.specified)
      .map(([id, w]) => {
        const v = lviews.get(id)!;
        const T = targetOf(id);
        const n = need(v, T.band);
        const weakPrereqs = (index.requires.get(id) ?? []).filter((p) => need(lviews.get(p)!, targetOf(p).band) >= WEAK_PREREQUISITE);
        const readiness = weakPrereqs.length ? 0.5 : 1;
        const misconception = Math.max(0, ...v.misconceptions.map((m) => m.strength));
        const retention = v.verification.status === "overdue" || v.verification.status === "failed" ? 1 : 0;
        const uncertainty = Math.min(1, v.sd / prior);
        const priority = (w / maxW) * (n * readiness + 0.3 * misconception + 0.3 * retention + 0.2 * uncertainty);
        return { id, v, T, need: n, readiness, weakPrereqs, misconception, retention, uncertainty, priority };
      })
      .sort((a, b) => b.priority - a.priority || a.id.localeCompare(b.id));

    const zoneOf = (v: LeafView) => (v.stage === "struggling" ? ZONE_STRUGGLING : ZONE);
    const forCap = (cap: CapabilityId) => pool.filter((i) => targetsOf(i).includes(cap));
    const suitable = (cap: CapabilityId) => {
      const v = lviews.get(cap)!;
      const [lo, hi] = zoneOf(v);
      return forCap(cap).filter((i) => {
        const p = predicted(i, v);
        return p >= lo && p <= hi;
      });
    };
    const bestFit = (cap: CapabilityId, items: Item[]) => {
      const v = lviews.get(cap)!;
      const tags = new Set(v.misconceptions.map((m) => m.id));
      return items
        .map((i) => {
          const p = predicted(i, v);
          const addresses = i.kind === "code" && i.addresses?.some((a) => tags.has(a)) ? 1 : 0;
          const s = 1 - Math.abs(p - IDEAL) / IDEAL + 0.3 * relativeInformation(i, v) + 0.2 * addresses + variety(i);
          return { i, p, s, addresses };
        })
        .sort((a, b) => b.s - a.s || a.i.id.localeCompare(b.i.id))[0];
    };
    const scoredFor = (c: (typeof caps)[number], pick: { i: Item; p: number; s: number; addresses: number }, reasons: string[]): Scored => ({
      item: pick.i.id,
      kind: pick.i.kind,
      targets: goalTargets(pick.i).length ? goalTargets(pick.i) : targetsOf(pick.i),
      focus: c.id,
      score: c.priority + pick.s,
      parts: { priority: c.priority, need: c.need, readiness: c.readiness, misconception: c.misconception, retention: c.retention, uncertainty: c.uncertainty, fit: 1 - Math.abs(pick.p - IDEAL) / IDEAL, information: relativeInformation(pick.i, c.v), variety: variety(pick.i) },
      p: pick.p,
      reasons,
    });

    const gaps: BankGap[] = [];
    let choice: Scored | null = null;
    let path: Path = "none";
    for (const c of caps) {
      const direct = suitable(c.id);
      if (direct.length) {
        choice = scoredFor(c, bestFit(c.id, direct), []);
        path = "direct";
        break;
      }
      gaps.push(gapFor(c.id));
      // (a) a prerequisite the framework defines, if it is itself still needed
      const pre = (index.requires.get(c.id) ?? [])
        .filter((p) => lviews.get(p)!.specified)
        .map((p) => ({ p, n: need(lviews.get(p)!, targetOf(p).band), items: suitable(p) }))
        .filter((x) => x.n >= PREREQUISITE_STEP_NEED && x.items.length)
        .sort((a, b) => b.n - a.n || a.p.localeCompare(b.p))[0];
      if (pre) {
        const pv = lviews.get(pre.p)!;
        const pc = caps.find((x) => x.id === pre.p) ?? { ...c, id: pre.p, v: pv, need: pre.n, readiness: 1, misconception: 0, retention: 0, uncertainty: Math.min(1, pv.sd / prior) };
        choice = scoredFor(pc, bestFit(pre.p, pre.items), [`prerequisite step for ${c.v.name}`]);
        choice.focus = pre.p;
        path = "prerequisite_step";
        break;
      }
      // (b) an easier item for the same capability
      const [, hi] = zoneOf(c.v);
      const easier = forCap(c.id)
        .map((i) => ({ i, p: predicted(i, c.v) }))
        .filter((x) => x.p > hi)
        .sort((a, b) => a.p - b.p || a.i.id.localeCompare(b.i.id))[0];
      if (easier) {
        choice = scoredFor(c, { ...easier, s: 1 - Math.abs(easier.p - IDEAL) / IDEAL, addresses: 0 }, [`easier step for ${c.v.name}`]);
        path = "easier_step";
        break;
      }
      // (c) nothing usable for this capability: report the gap and move to the next one
    }
    const alternatives: Scored[] = [];
    for (const c of caps) {
      if (alternatives.length >= Math.max(3, count + 2)) break;
      if (choice && c.id === choice.focus) continue;
      const items = suitable(c.id).filter((i) => i.id !== choice?.item);
      if (items.length) alternatives.push(scoredFor(c, bestFit(c.id, items), []));
    }
    if (!choice) {
      // Nothing usable for any needed capability: say so, and measure instead of stalling.
      const a = assess();
      if (!a.choice) return { ...a, path: "none", bankGaps: gaps };
      return {
        ...a,
        path: "assessment_fallback",
        bankGaps: gaps,
        explanation: `Learning: no unused activity at a suitable or easier difficulty for any capability on this goal (${gaps.length} item-bank gaps reported), so this is an assessment activity instead. ${a.explanation}`,
      };
    }
    return {
      mode: "learning",
      schedule: { policy: "explicit", reason: "explicit" },
      goal: goal.id,
      target: choice?.focus ? targetOf(choice.focus) : fallbackTarget,
      path,
      choice,
      alternatives,
      bankGaps: gaps,
      explanation: choice ? explainLearning(choice, path, caps[0], gaps) : "Nothing left to practise for this goal.",
    };
  }

  function gapFor(cap: CapabilityId): BankGap {
    const v = lviews.get(cap)!;
    const [lo, hi] = v.stage === "struggling" ? ZONE_STRUGGLING : ZONE;
    // typed-item difficulty that gives success probability p: b = mean − logit(p) / 1.3
    const b = (p: number) => Math.round((v.mean - Math.log(p / (1 - p)) / 1.3) * 10) / 10;
    const unused = available.filter((i) => targetsOf(i).includes(cap)).map((i) => i.b).sort((x, y) => x - y);
    return {
      capability: cap,
      name: v.name,
      estimate: { mean: views.get(cap)!.mean, sd: views.get(cap)!.sd },
      suitableDifficulty: [b(hi), b(lo)],
      unusedDifficulties: unused,
      note: `no unused item for ${v.name} at a suitable difficulty (about ${b(hi)}–${b(lo)}); unused items: ${unused.length ? unused.join(", ") : "none"}`,
    };
  }

  function explainLearning(c: Scored, p: Path, top: { id: string; v: LeafView } | undefined, gaps: BankGap[]): string {
    const v = lviews.get(c.focus!)!;
    const T = targetOf(c.focus!);
    const est = views.get(c.focus!)!;
    const pitched = v.mean !== est.mean;
    const head = pitched
      ? `Learning: ${v.name} needs review: its retention check on ${est.retention.lastFailedAt!.slice(0, 10)} failed, so it is not currently verified, and practice is pitched at band ${v.mean} (what that check supports), not at the estimate ${est.mean.toFixed(1)} ± ${est.sd.toFixed(1)}, which still includes older evidence. ${Math.round(100 * need(v, T.band))}% likely below band ${T.band}. Target: ${T.note}.`
      : `Learning: ${v.name} (${v.mean.toFixed(1)} ± ${v.sd.toFixed(1)}; ${Math.round(100 * need(v, T.band))}% likely below band ${T.band}). Target: ${T.note}.`;
    const fit = `This activity is at a suitable difficulty (about ${Math.round(c.p * 100)}% likely to succeed).`;
    if (p === "direct") {
      const dependants = [...index.requires].filter(([cap, reqs]) => reqs.includes(c.focus!) && (weights.get(cap) ?? 0) > 0 && need(lviews.get(cap)!, targetOf(cap).band) >= PREREQUISITE_STEP_NEED).map(([cap]) => lviews.get(cap)!.name);
      const extra = [
        dependants.length ? `the framework lists it as a prerequisite of ${dependants.join(" and ")}, which is also below target, so it comes first` : "",
        c.parts.misconception >= 0.3 ? "it also works on a mistake seen recently" : "",
        c.parts.readiness < 1 ? "a prerequisite is still weak, so this capability is ranked lower than its need alone suggests" : "",
      ].filter(Boolean);
      const skipped = gaps.length ? ` (Skipped: ${gaps.map((g) => g.note).join("; ")}.)` : "";
      const more = extra.join("; ");
      return `${head} ${fit}${more ? " " + more[0].toUpperCase() + more.slice(1) + "." : ""}${skipped}`;
    }
    const gap = gaps[gaps.length - 1];
    const need0 = top ? lviews.get(gap.capability)! : v;
    if (p === "prerequisite_step")
      return `Learning: ${need0.name} is the most needed capability, but ${gap.note}. Prerequisite step: ${v.name} (${v.mean.toFixed(1)} ± ${v.sd.toFixed(1)}), which the framework lists as a prerequisite and which is itself below target. ${fit} Target: ${T.note}.`;
    return `Learning: ${need0.name} is the most needed capability, but ${gap.note}. Easier step on the same capability (about ${Math.round(c.p * 100)}% likely to succeed). Target: ${T.note}.`;
  }
}

/** For reports: the z-value used for 80% ranges. */
export const Z80 = normalQuantile(0.9);
