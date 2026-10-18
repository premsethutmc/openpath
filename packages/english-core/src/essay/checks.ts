/**
 * Later checks after an essay journey, and the separate claims for each competency (assessment evidence and
 * retention v1).
 *
 * Each claim is kept apart, and none is made from finishing a journey or reading a lesson:
 *   journey completed        every step of the competency's journey is done or blocked (it can finish while
 *                            the target is still not shown: the learner is never kept in a loop)
 *   independently shown      the engine's demonstrated (or verified) status at or above the grade target
 *   verified                 the engine's verified status at the target: a passed spaced check, under the
 *                            existing evidence policy
 *   retention pending / due  shown at the target; the delayed check may not be taken until `retentionDelayDays`
 *                            after it was first shown (default 7), and never in the same sitting
 *   retention shown / not    the delayed check's answers, judged by the engine's own retention rule
 *                            (retention.ts checkPassed: is the evidence at least as likely at the target as one band
 *                            lower?). One wrong answer does not revoke anything: the evidence is simply recorded.
 *
 * Planned checks reserve unseen questions (allocation.ts): a verification check uses questions from the target to
 * 1.5 bands above it, a retention check the questions kept back for it. When the bank has too few, nothing is recycled: the
 * claim stays pending and the outcome says why.
 */
import { leafView } from "../composite.ts";
import { binaryParams, itemVersion, scoreCode } from "../content.ts";
import { checkPassed, VERIFY_AT_LEVEL_MIN } from "../retention.ts";
import { PILOT_VERIFICATION } from "../verification.ts";
import { isIndependentProvenance, type CapabilityId, type EssayEvent, type EvidenceEvent, type LedgerEvent, type SessionObservation } from "../types.ts";
import { Ledger } from "../updater.ts";
import { ABOVE_TARGET, pickForRole } from "./allocation.ts";
import { essayRecords, EssayRefusal, type EventMeta } from "./analysis.ts";
import { engineClaim, type EssayContext } from "./competencies.ts";
import { ESSAY_CONTRACT, type CompetencyOutcome, type LearningJourney, type PlannedCheck } from "./contract.ts";

const DAY = 86_400_000;
const addDays = (iso: string, d: number) => new Date(Date.parse(iso) + d * DAY).toISOString();
const later = (a: string | null, b: string | null) => (!a ? b : !b ? a : a > b ? a : b);
const learnerOf = (events: readonly LedgerEvent[]): string => essayRecords(events, "submission")[0]?.record.submission.learner ?? "learner";

export const plannedChecks = (events: readonly LedgerEvent[]): PlannedCheck[] => essayRecords(events, "check").map((r) => r.record.check);

export interface CheckProgress {
  check: PlannedCheck;
  /** Items not yet answered. */
  left: string[];
  /** Answered without help, accepted by the engine, at or after notBefore and not straight after teaching. */
  valid: { item: string; correct: boolean; evidence: string }[];
  /** Answers that cannot count for this check, with why (too early, with help, after teaching, held). */
  invalid: { item: string; why: string }[];
  complete: boolean;
  /** When the last answer was given (complete checks), for spacing the next one. */
  completedAt: string | null;
  /** For a completed retention check: did it show the target was kept? (null: not judged) */
  passed: boolean | null;
}

/** How far a planned check has got, judged from the ledger. */
export function checkProgress(ectx: EssayContext, events: readonly LedgerEvent[], check: PlannedCheck, ledger?: Ledger): CheckProgress {
  const L = ledger ?? Ledger.rebuild(ectx.ctx, learnerOf(events), events as LedgerEvent[]);
  const wanted = new Map(check.items.map((i) => [i.id, i.version]));
  const firsts = new Map<string, LedgerEvent>();
  for (const e of events) if ((e.kind === "evidence" || e.kind === "assisted_response") && wanted.has(e.item.id) && e.at >= check.at && !firsts.has(e.item.id)) firsts.set(e.item.id, e);
  const valid: CheckProgress["valid"] = [];
  const invalid: CheckProgress["invalid"] = [];
  const obs: SessionObservation[] = [];
  for (const [id, e] of firsts) {
    const item = itemVersion(ectx.ctx.content, id, wanted.get(id)!);
    if (!item || item.kind !== "code") continue;
    if (e.kind !== "evidence" || !isIndependentProvenance((e as EvidenceEvent).provenance)) {
      invalid.push({ item: id, why: "answered with help" });
      continue;
    }
    if (e.at < check.notBefore) {
      invalid.push({ item: id, why: `answered before the check was due (${check.notBefore.slice(0, 10)})` });
      continue;
    }
    const d = L.decisions.find((x) => x.source === e.id);
    const setting = (d?.observation as { setting?: string } | undefined)?.setting;
    if (!d || d.verdict !== "accepted") {
      invalid.push({ item: id, why: `not counted by the engine (${d?.verdict ?? "no decision"})` });
      continue;
    }
    if (setting === "after_teaching") {
      invalid.push({ item: id, why: "answered straight after teaching in the same sitting" });
      continue;
    }
    const { correct } = scoreCode(item, (e as EvidenceEvent).response);
    valid.push({ item: id, correct, evidence: e.id });
    const p = binaryParams(item)!;
    obs.push({ kind: "binary", b: p.b, a: p.a, c: p.c, correct });
  }
  const left = check.items.map((i) => i.id).filter((id) => !firsts.has(id));
  const complete = left.length === 0;
  const target = ectx.profile.byCapability.get(check.competency)?.expectedBand ?? null;
  const passed = complete && check.kind === "retention" && target !== null && obs.length ? checkPassed(obs, target, null) : null;
  const completedAt = complete ? [...firsts.values()].reduce((m, e) => (e.at > m ? e.at : m), "") || null : null;
  return { check, left, valid, invalid, complete, completedAt, passed };
}

/** When the learner first showed the target without help (the engine's per-session demonstrated level). */
export function targetShownAt(ledger: Ledger, capability: CapabilityId, target: number | null, now: string): string | null {
  if (target === null) return null;
  for (const s of ledger.composite.nodes[capability]?.sessions ?? []) {
    if (s.at > now) break;
    if (!s.teaching && s.level !== null && s.level >= target) return s.at;
  }
  return null;
}

/**
 * When the delay before a delayed check that can VERIFY the target starts (verification@2): the first session showing
 * the target without help since the engine's last failed check (a failed check means it must be shown again). Equal
 * to targetShownAt when no check has failed. Null: not shown since.
 */
export function targetClockAt(ledger: Ledger, capability: CapabilityId, target: number | null, now: string): string | null {
  if (target === null || !ledger.composite.nodes[capability]) return null;
  const failedAt = leafView(ledger.composite, ledger.ctx.index, capability, now).retention.lastFailedAt;
  for (const s of ledger.composite.nodes[capability].sessions ?? []) {
    if (s.at > now) break;
    if (failedAt && s.at < failedAt) continue;
    if (!s.teaching && s.level !== null && s.level >= target) return s.at;
  }
  return null;
}

/** The separate claims for one competency now. `journey` (from journeyStatus) supplies "journey completed". */
export function competencyOutcome(ectx: EssayContext, events: readonly LedgerEvent[], capability: CapabilityId, now: string, journey?: LearningJourney | null, ledger?: Ledger): CompetencyOutcome {
  const p = ectx.policy;
  const L = ledger ?? Ledger.rebuild(ectx.ctx, learnerOf(events), events as LedgerEvent[]);
  const view = leafView(L.composite, ectx.ctx.index, capability, now);
  const claim = engineClaim(ectx, capability, view, events, now);
  const target = claim.target;
  const name = ectx.profile.byCapability.get(capability)?.name ?? capability;
  const nodes = journey ? journey.trees.flatMap((t) => t.nodes).filter((n) => n.competency === capability) : [];
  const journeyCompleted = nodes.length ? nodes.every((n) => n.steps.every((s) => s.status !== "pending")) : null;
  const demonstrated = claim.level !== "none";
  const verified = claim.level === "verified";
  const shownAt = targetShownAt(L, capability, target, now);
  // the delay for a check that can verify the target runs from the clock (re-started by a failed check)
  const clockAt = targetClockAt(L, capability, target, now) ?? shownAt;
  // a journey step that is the delayed retention check (policy @3) counts as a retention check like a planned one;
  // it counts for the essay's delayed check only from retentionDelayDays after the target was first shown
  const journeyRetention: PlannedCheck[] = essayRecords(events, "journey").flatMap(({ record }) =>
    record.journey.trees.flatMap((t) =>
      t.nodes
        .filter((n) => n.competency === capability)
        .flatMap((n) => n.steps.filter((x) => x.purpose === "retention" && x.content.available))
        .map((x) => ({
          contract: ESSAY_CONTRACT,
          id: x.id,
          competency: capability,
          kind: "retention" as const,
          at: record.journey.at,
          notBefore: clockAt ? (later(record.journey.at, addDays(clockAt, p.retentionDelayDays)) ?? record.journey.at) : record.journey.at,
          items: x.content.refs.map((id) => ({ id, version: ectx.ctx.content.items.get(id)?.version ?? 1 })),
          reason: x.reason,
        })),
    ),
  );
  const checks = [...plannedChecks(events).filter((c) => c.competency === capability), ...journeyRetention];
  const progress = checks.map((c) => checkProgress(ectx, events, c, L));
  const open = progress.find((x) => !x.complete);

  // retention: only once the target has been shown without help
  let retention: CompetencyOutcome["retention"] = "not_applicable";
  let dueAt: string | null = null;
  if (shownAt) {
    dueAt = later(addDays(clockAt!, p.retentionDelayDays), view.retention.dueAt && view.retention.dueAt >= shownAt ? view.retention.dueAt : null);
    const done = progress.filter((x) => x.check.kind === "retention" && x.complete && x.passed !== null && x.check.notBefore >= addDays(shownAt, p.retentionDelayDays) && x.valid.length > 0);
    const last = done.at(-1);
    retention = last ? (last.passed ? "demonstrated" : "not_demonstrated") : now >= dueAt! ? "due" : "pending";
  }

  const verificationsUsed = checks.filter((c) => c.kind === "verification").length;
  const lastVerification = progress.filter((x) => x.check.kind === "verification").at(-1);
  let next: CompetencyOutcome["next"] = null;
  let pending: string | null = null;
  const fmt = (iso: string) => iso.slice(0, 10);
  if (open) {
    next = { kind: open.check.kind, notBefore: open.check.notBefore, itemsAvailable: open.left.length, planned: open.check.id };
    pending = now < open.check.notBefore ? `a later ${open.check.kind} check is planned for ${fmt(open.check.notBefore)}` : `a later ${open.check.kind} check is ready to take`;
  } else if (!demonstrated && !(shownAt !== null && view.verification.status === "overdue")) {
    // (an overdue engine check after the target was shown is a retention question, handled below: policy @3)
    const available = pickForRole(ectx, events, capability, "independent_verification", p.checkItems).length;
    if (target === null) pending = `${name} has no grade target, so no claim is made`;
    else if (journeyCompleted === false) pending = `the journey's steps for ${name} are not finished`;
    else if (verificationsUsed >= p.followUpChecks) pending = `not yet shown at band ${target} without help; the ${p.followUpChecks} later check${p.followUpChecks === 1 ? "" : "s"} this policy allows have been used, so it is recommended for the next essay or a later assessment`;
    // a later check with no right answer at all: another check now would not help; teaching comes first
    else if (lastVerification?.complete && lastVerification.valid.length > 0 && lastVerification.valid.every((x) => !x.correct))
      pending = `not yet shown at band ${target} without help, and the last later check had no right answers: teaching again (a new essay or lesson) is recommended before another check`;
    else if (available < p.checkItems) pending = `not yet shown at band ${target} without help, and the question bank has only ${available} unseen question${available === 1 ? "" : "s"} between band ${target} and ${target + ABOVE_TARGET} (${p.checkItems} needed): more reviewed questions are needed before it can be checked again`;
    else {
      // spaced: from the journey for the first later check, then from the previous check's last answer
      const spacing = p.followUpSpacingDays[Math.min(verificationsUsed, p.followUpSpacingDays.length - 1)] ?? 1;
      const from = lastVerification?.completedAt ?? (journey?.at && journey.at > lastActivity(events) ? journey.at : lastActivity(events));
      const notBefore = addDays(from, spacing);
      next = { kind: "verification", notBefore, itemsAvailable: available, planned: null };
      pending = `not yet shown at band ${target} without help: a later check, in a new sitting, is recommended from ${fmt(notBefore)}`;
    }
  } else if (retention === "pending" || retention === "due" || retention === "not_demonstrated") {
    const available = pickForRole(ectx, events, capability, "delayed_retention", p.retentionItems).length;
    const retentionUsed = checks.some((c) => c.kind === "retention" && progress.find((x) => x.check.id === c.id)?.complete);
    if (retention === "not_demonstrated" && retentionUsed) pending = `the delayed check did not show band ${target} kept; the evidence is recorded and the engine's own status is unchanged by this note`;
    else if (available < 1) pending = `shown at band ${target}, but no unseen question is left for the delayed retention check: more reviewed questions are needed`;
    else {
      next = { kind: "retention", notBefore: dueAt!, itemsAvailable: available, planned: null };
      pending = retention === "pending" ? `retention pending: the delayed check is due on ${fmt(dueAt!)}` : "retention check due now";
    }
  }
  // H-V3 (pilot policy): a delayed check whose questions are not educator-reviewed and released before it is taken
  // still records retention evidence, but it can never verify mastery; the outcome says so instead of implying it can
  if (next?.kind === "retention" && (ectx.verification ?? PILOT_VERIFICATION).eligibility === "reviewed") {
    const ids = open?.check.kind === "retention" ? open.check.items.map((i) => i.id) : pickForRole(ectx, events, capability, "delayed_retention", p.retentionItems).map((i) => i.id);
    const eligible = ids.filter((id) => {
      const it = ectx.ctx.content.items.get(id);
      return it?.kind === "code" && it.evidence_status === "validated" && !!it.released_at && it.released_at <= (next!.notBefore > now ? next!.notBefore : now);
    }).length;
    if (eligible < VERIFY_AT_LEVEL_MIN) pending = `${pending ?? ""} Its questions are not ${eligible ? "all " : ""}reviewed by an educator and released, so under the pilot policy this check records retention but cannot verify mastery.`.trim();
  }
  return { competency: capability, target, journeyCompleted, demonstrated, verified, currentLevel: claim.currentLevel, targetShownAt: shownAt, retention, retentionDueAt: dueAt, pending, next };
}

function lastActivity(events: readonly LedgerEvent[]): string {
  let at = "";
  for (const e of events) if (e.kind === "evidence" || e.kind === "assisted_response" || e.kind === "intervention") at = e.at > at ? e.at : at;
  return at;
}

/**
 * Plan the next check for a competency, reserving its questions. Refuses (EssayRefusal) when there is nothing to
 * plan: the outcome's `pending` says why. A retention check is never planned to start before it is due.
 */
export function planCheck(ectx: EssayContext, events: readonly LedgerEvent[], meta: EventMeta, capability: CapabilityId, journey?: LearningJourney | null): { event: EssayEvent; check: PlannedCheck } {
  const outcome = competencyOutcome(ectx, events, capability, meta.at, journey);
  if (!outcome.next) throw new EssayRefusal(outcome.pending ?? "nothing to check");
  if (outcome.next.planned) throw new EssayRefusal(`check ${outcome.next.planned} is already planned`);
  const role = outcome.next.kind === "verification" ? "independent_verification" : "delayed_retention";
  const n = outcome.next.kind === "verification" ? ectx.policy.checkItems : ectx.policy.retentionItems;
  const items = pickForRole(ectx, events, capability, role, n);
  if (!items.length) throw new EssayRefusal("no unseen question is available for this check");
  const check: PlannedCheck = {
    contract: ESSAY_CONTRACT,
    id: meta.id,
    competency: capability,
    kind: outcome.next.kind,
    at: meta.at,
    notBefore: outcome.next.notBefore,
    items: items.map((i) => ({ id: i.id, version: i.version })),
    reason: outcome.pending ?? "",
  };
  return { event: { kind: "essay", id: meta.id, at: meta.at, session: meta.session, record: { type: "check", check } }, check };
}

/** The next planned check whose time has come, with the question to ask, or null. */
export function dueCheck(ectx: EssayContext, events: readonly LedgerEvent[], now: string): { check: PlannedCheck; item: string; position: number; total: number } | null {
  const L = Ledger.rebuild(ectx.ctx, learnerOf(events), events as LedgerEvent[]);
  for (const c of plannedChecks(events)) {
    if (now < c.notBefore) continue;
    const pr = checkProgress(ectx, events, c, L);
    if (pr.complete) continue;
    return { check: c, item: pr.left[0], position: c.items.length - pr.left.length + 1, total: c.items.length };
  }
  return null;
}
