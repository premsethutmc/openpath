/**
 * Verified mastery: ONE definition for every surface (engine, main-app profile, essay studio; H-V1, 18 October 2026).
 *
 * Definition (verification@2, retention.ts `verifiedLevel`): band L is verified only when L was first shown without
 * help, and a later session at least the delay after that has at least VERIFY_AT_LEVEL_MIN DISTINCT fresh answers at L
 * (questions of difficulty ≥ L − tolerance, never a repeat; H-V2) whose evidence favours L over L − 1.
 *
 * Eligibility (verification-eligibility@2):
 *   reviewed  the pilot policy (default). The definition must hold when only ELIGIBLE answers are counted. An answer is
 *             eligible when (H-V3):
 *               - its question version is educator-approved ("validated") and carries a release time (released_at);
 *               - it was given at or after that release, to that exact version;
 *               - it is the learner's first encounter with the question (an earlier answer, with or without help,
 *                 makes a later one a repeat, which never verifies).
 *             Earlier answers stay in the ledger with their original meaning (estimate, shown) and never become
 *             eligible retroactively.
 *   counted   developer testing only: every answer the engine counts; the claim says it was on unreviewed questions.
 *
 * Nothing is rewritten: the reviewed reading rebuilds the same ledger, with the same engine, from the same events
 * minus the ineligible answers. The estimator, thresholds and evidence rules are unchanged.
 */
import { leafView, type LeafView } from "./composite.ts";
import { itemVersion } from "./content.ts";
import type { CapabilityId, LedgerEvent } from "./types.ts";
import { type Context, Ledger } from "./updater.ts";

export interface VerificationPolicy {
  version: "verification-eligibility@1" | "verification-eligibility@2";
  eligibility: "reviewed" | "counted";
}
export const PILOT_VERIFICATION: VerificationPolicy = { version: "verification-eligibility@2", eligibility: "reviewed" };
export const DEVELOPER_VERIFICATION: VerificationPolicy = { version: "verification-eligibility@2", eligibility: "counted" };

/** Why an answer can or cannot contribute to pilot verification (H-V3). */
export type Eligibility = "eligible" | "not_answer" | "unreviewed" | "not_released" | "before_release" | "repeat";

/** Per evidence event, whether it may contribute to pilot verification, in record order. */
export function verificationEligibility(ctx: Context, events: readonly LedgerEvent[]): Map<string, Eligibility> {
  const out = new Map<string, Eligibility>();
  const met = new Set<string>();
  for (const e of events) {
    if (e.kind === "assisted_response") {
      met.add(e.item.id);
      continue;
    }
    if (e.kind !== "evidence") continue;
    const first = !met.has(e.item.id);
    met.add(e.item.id);
    const it = itemVersion(ctx.content, e.item.id, e.item.version);
    if (!it || it.kind !== "code") out.set(e.id, "not_answer");
    else if (it.evidence_status !== "validated") out.set(e.id, "unreviewed");
    else if (!it.released_at || !Number.isFinite(Date.parse(it.released_at))) out.set(e.id, "not_released");
    else if (Date.parse(e.at) < Date.parse(it.released_at)) out.set(e.id, "before_release");
    else if (!first) out.set(e.id, "repeat");
    else out.set(e.id, "eligible");
  }
  return out;
}

const eligibleLedgers = new WeakMap<object, Map<string, Ledger>>();
/** The ledger rebuilt from eligible answers only (cached per record state). Teaching, help and other events are kept. */
export function eligibleLedger(ctx: Context, learner: string, events: readonly LedgerEvent[]): Ledger {
  let byKey = eligibleLedgers.get(events);
  if (!byKey) eligibleLedgers.set(events, (byKey = new Map()));
  // keyed by the record's length and last event (a record that grew is rebuilt) and by the content
  const key = `${learner}#${events.length}#${events.at(-1)?.id ?? ""}#${ctx.content.items.size}#${contentStamp(ctx)}`;
  let L = byKey.get(key);
  if (!L) {
    const ok = verificationEligibility(ctx, events);
    L = Ledger.rebuild(ctx, learner, events.filter((e) => e.kind !== "evidence" || ok.get(e.id) === "eligible") as LedgerEvent[]);
    byKey.set(key, L);
  }
  return L;
}
const stamps = new WeakMap<object, string>();
function contentStamp(ctx: Context): string {
  let s = stamps.get(ctx.content);
  if (s === undefined) {
    s = [...ctx.content.items.values()].filter((i) => i.kind === "code" && i.evidence_status === "validated").map((i) => `${i.id}@${i.version}:${(i as { released_at?: string }).released_at}`).join("|");
    stamps.set(ctx.content, s);
  }
  return s;
}

export interface VerificationClaim {
  /** The verified band under the policy (null: none). */
  level: number | null;
  /** Verified on eligible (reviewed, released) answers, or only with unreviewed ones under the developer policy. */
  on: "reviewed" | "unreviewed" | null;
  /** Verified on all counted answers, but not on eligible ones: withheld under the pilot policy. */
  withheld: boolean;
  /** The verified band on all counted answers (verification@2, any content). */
  countedLevel: number | null;
  /** The verified band on eligible answers only. */
  eligibleLevel: number | null;
  policy: VerificationPolicy;
}

/**
 * The verified band for a capability now, under a policy. `view` is the engine's view on all counted evidence (it is
 * computed when absent). A band is reported only up to what the counted evidence currently supports.
 */
export function verificationClaim(ctx: Context, learner: string, events: readonly LedgerEvent[], capability: CapabilityId, now: string, policy: VerificationPolicy = PILOT_VERIFICATION, view?: LeafView): VerificationClaim {
  const v = view ?? leafView(Ledger.rebuild(ctx, learner, events as LedgerEvent[]).composite, ctx.index, capability, now);
  // the same clock as the view: target-anchored when the view is (essay layer), the engine's own otherwise (main app)
  const target = v.atTarget?.band ?? null;
  const cap = (x: LeafView) => {
    const ver = x.atTarget && x.atTarget.verification.status !== "not_demonstrated" ? x.atTarget.verification : x.verification;
    const lv = ver.verifiedLevel ?? null;
    const cur = ver.currentLevel;
    if (lv === null || cur === null || !(ver.status === "verified" || ver.status === "demonstrated")) return null;
    return Math.min(lv, cur);
  };
  const counted = cap(v);
  const ev = counted === null ? null : leafView(eligibleLedger(ctx, learner, events).composite, ctx.index, capability, now, { target });
  const eligible = ev ? cap(ev) : null;
  const e = eligible === null || counted === null ? null : Math.min(eligible, counted);
  if (e !== null && !(policy.eligibility === "counted" && counted! > e)) return { level: e, on: "reviewed", withheld: false, countedLevel: counted, eligibleLevel: e, policy };
  if (counted !== null && policy.eligibility === "counted") return { level: counted, on: "unreviewed", withheld: false, countedLevel: counted, eligibleLevel: null, policy };
  return { level: null, on: null, withheld: counted !== null, countedLevel: counted, eligibleLevel: e, policy };
}
