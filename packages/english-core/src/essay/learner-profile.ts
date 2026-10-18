/**
 * The persistent learner profile for essays, read from the one learner ledger.
 *
 * Engine claims (demonstrated, verified) come only from the existing composite and its verification. Essay
 * claims (observed, suspected) come only from validated essay observations and stay tentative. The next essay
 * reads the same ledger, so it starts from everything already known.
 */
import { leafView } from "../composite.ts";
import { isIndependentProvenance, type CapabilityId, type EvidenceEvent, type LedgerEvent } from "../types.ts";
import { Ledger } from "../updater.ts";
import { analyses, essayRecords, submissions } from "./analysis.ts";
import { engineClaim, type EssayContext } from "./competencies.ts";
import { ESSAY_CONTRACT, type CompetencyState, type CompetencyStatus, type EssayLearnerProfile, type ProfileUpdate } from "./contract.ts";
import { countedAnalyses, currentHypotheses } from "./gaps.ts";

const RANK: Record<CompetencyState, number> = { unknown: 0, observed: 1, suspected: 2, demonstrated: 3, verified: 4 };

export function essayProfile(ectx: EssayContext, learner: string, events: readonly LedgerEvent[], now: string): EssayLearnerProfile {
  const ledger = Ledger.rebuild(ectx.ctx, learner, events as LedgerEvent[]);
  const hyps = currentHypotheses(ectx, events);
  const counted = countedAnalyses(events);
  const evidence = new Map(events.filter((e): e is EvidenceEvent => e.kind === "evidence").map((e) => [e.id, e]));
  const competencies: CompetencyStatus[] = ectx.profile.profile.competencies.map((ref) => {
    const cap = ref.capability;
    const v = leafView(ledger.composite, ectx.ctx.index, cap, now);
    const obs = counted.flatMap((a) => a.observations.filter((o) => o.competency === cap));
    const errors = obs.filter((o) => o.kind === "error").length;
    const strengths = obs.filter((o) => o.kind === "strength").length;
    const style = obs.filter((o) => o.kind === "style").length;
    const notObservable = counted.filter((a) => a.notObservable.includes(cap)).length;
    const essays = new Set(obs.map((o) => o.essay)).size;
    const gap = hyps.get(cap) ?? null;
    const notes: string[] = [];
    let state: CompetencyState = "unknown";
    if (obs.length) state = "observed";
    if (gap && gap.status !== "weakened") state = "suspected";
    const claim = engineClaim(ectx, cap, v);
    if (claim.level !== "none") state = claim.level;
    if (claim.note) notes.push(`Not counted as shown: ${claim.note}.`);
    if (gap && gap.status !== "weakened" && RANK[state] >= RANK.demonstrated)
      notes.push(`The engine records this as ${state}, but essay evidence suggests a gap (${gap.status}): checked, not assumed either way.`);
    if (v.verification.status === "overdue" || v.verification.status === "failed")
      notes.push(`Shown earlier, but ${v.verification.status === "overdue" ? "a later check is overdue" : "the later check was not passed"}: not counted as shown now.`);
    if (errors === 1 && !gap) notes.push("One error in essays so far: it may be a slip.");
    if (gap?.status === "weakened") notes.push("The essay suggested a gap, but questions answered without help were right.");
    if (!ref.specified) notes.push("Not specified in the framework yet: it can be observed in an essay but not checked with questions.");
    if (counted.length && errors === 0 && RANK[state] < RANK.demonstrated)
      notes.push(strengths ? "Used well in essays so far. That is not mastery: only questions answered without help can show it." : "No errors seen in essays so far. That is not evidence of mastery.");
    if (notObservable) notes.push(`${notObservable} essay${notObservable === 1 ? "" : "s"} gave no chance to show this.`);
    if (style) notes.push(`${style} style suggestion${style === 1 ? "" : "s"}: preferences, not errors.`);
    // provenance: what kind of evidence there is, by permission to change estimates
    const decisions = ledger.decisions.filter((d) => d.capability === cap);
    const independent: string[] = [];
    const assisted: string[] = [];
    const held: string[] = [];
    for (const d of decisions) {
      const ev = evidence.get(d.source);
      if (d.verdict === "accepted" && ev && isIndependentProvenance(ev.provenance)) independent.push(d.source);
      else if (d.verdict === "held" && ev?.provenance && !isIndependentProvenance(ev.provenance)) assisted.push(d.source);
      else if (d.verdict === "held") held.push(d.source);
    }
    for (const e of events)
      if (e.kind === "assisted_response") {
        const item = ectx.ctx.content.items.get(e.item.id);
        if (item?.kind === "code" && item.target === cap) assisted.push(e.id);
      }
    return {
      competency: cap,
      name: ref.name,
      area: ref.area,
      state,
      gap,
      engine: { stage: v.stage, verification: v.verification.status, currentLevel: v.verification.currentLevel, target: claim.target, demonstrated: v.demonstrated, mastered: v.mastered, directN: v.direct.n },
      essays: { errors, strengths, essays, style, notObservable },
      provenance: { tentative: obs.map((o) => o.id), independent, assisted, held },
      notes,
    };
  });
  const repeatOf = new Map(analyses(events).filter((a) => a.repeatOf).map((a) => [a.essay, a.repeatOf!]));
  return {
    contract: ESSAY_CONTRACT,
    learner,
    asOf: now,
    profile: ectx.profile.key,
    competencies,
    essays: submissions(events).map((s) => ({ id: s.id, at: s.at, words: s.words, fingerprint: s.fingerprint, ...(repeatOf.has(s.id) ? { repeatOf: repeatOf.get(s.id) } : {}) })),
    journeys: essayRecords(events, "journey").map((r) => r.record.journey.id),
    rewrites: essayRecords(events, "rewrite").map((r) => ({ id: r.record.rewrite.id, essay: r.record.rewrite.essay, at: r.record.rewrite.at })),
  };
}

/**
 * What changed between two points in the learner's history. `estimateChanged` is true only when the engine's
 * own estimate for the competency moved; essay records alone never move it.
 */
export function profileUpdates(ectx: EssayContext, learner: string, before: readonly LedgerEvent[], after: readonly LedgerEvent[], now: string): ProfileUpdate[] {
  const a = essayProfile(ectx, learner, before, now);
  const b = essayProfile(ectx, learner, after, now);
  const la = Ledger.rebuild(ectx.ctx, learner, before as LedgerEvent[]).composite;
  const lb = Ledger.rebuild(ectx.ctx, learner, after as LedgerEvent[]).composite;
  const newIds = new Set(after.map((e) => e.id).filter((id) => !before.some((e) => e.id === id)));
  const out: ProfileUpdate[] = [];
  for (const nb of b.competencies) {
    const na = a.competencies.find((c) => c.competency === nb.competency)!;
    const ea = la.nodes[nb.competency]?.direct;
    const eb = lb.nodes[nb.competency]?.direct;
    const estimateChanged = !!ea && !!eb && (Math.abs(ea.mean - eb.mean) > 1e-12 || Math.abs(ea.variance - eb.variance) > 1e-12);
    const gapFrom = na.gap?.status ?? null;
    const gapTo = nb.gap?.status ?? null;
    if (na.state === nb.state && gapFrom === gapTo && !estimateChanged) continue;
    const evidence = [...nb.provenance.tentative, ...nb.provenance.independent, ...nb.provenance.assisted, ...nb.provenance.held].filter((id) => newIds.has(id) || [...newIds].some((n) => id.startsWith(`${n}:`)));
    out.push({
      competency: nb.competency as CapabilityId,
      from: na.state,
      to: nb.state,
      gapFrom,
      gapTo,
      estimateChanged,
      reason: describe(na.state, nb.state, gapFrom, gapTo, estimateChanged),
      evidence,
    });
  }
  return out;
}

function describe(from: CompetencyState, to: CompetencyState, gapFrom: string | null, gapTo: string | null, est: boolean): string {
  const parts: string[] = [];
  if (from !== to) parts.push(`${from} → ${to}`);
  if (gapFrom !== gapTo) parts.push(`gap ${gapFrom ?? "none"} → ${gapTo ?? "none"}`);
  if (est) parts.push("the engine's estimate moved (independent evidence)");
  else parts.push("no estimate change");
  return parts.join("; ");
}
