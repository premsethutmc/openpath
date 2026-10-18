/**
 * Gap hypotheses from essay observations, and diagnostic questions to check them.
 *
 * An error in one sentence is observed and may be a slip. The same kind of error in several sentences (or in
 * more than one essay) makes a gap suspected: a hypothesis, never a result. Diagnostic questions from the
 * existing bank then confirm it, weaken it or leave it unresolved. Only independent first answers decide;
 * answers given with help are shown and never used. Diagnostic answers are ordinary ledger evidence, so the
 * engine's existing rules decide on their own whether they change an estimate.
 */
import { leafView } from "../composite.ts";
import { contentStatus, itemVersion, scoreCode } from "../content.ts";
import { isIndependentProvenance, type CapabilityId, type EvidenceEvent, type InterventionEvent, type LedgerEvent } from "../types.ts";
import { Ledger } from "../updater.ts";
import { analyses, essayRecords, EssayRefusal, type EventMeta } from "./analysis.ts";
import { engineClaim, type EssayContext } from "./competencies.ts";
import { type BankItem, pickForRole } from "./allocation.ts";
import { ESSAY_CONTRACT, type DiagnosticOutcome, type DiagnosticRequest, type EssayAnalysis, type EssayObservation, type GapHypothesis } from "./contract.ts";

/** Analyses that count: accepted, and not a repeat of an essay already analysed. */
export const countedAnalyses = (events: readonly LedgerEvent[]): EssayAnalysis[] => analyses(events).filter((a) => a.status === "accepted" && !a.repeatOf);

const ledgerUpTo = (ectx: EssayContext, events: readonly LedgerEvent[], id: string, learner: string): Ledger => {
  const i = events.findIndex((e) => e.id === id);
  return Ledger.rebuild(ectx.ctx, learner, events.slice(0, i < 0 ? events.length : i + 1) as LedgerEvent[]);
};

const learnerOf = (events: readonly LedgerEvent[]): string => essayRecords(events, "submission")[0]?.record.submission.learner ?? "learner";

/**
 * Every hypothesis formed so far, oldest first, with its current status. One hypothesis per (essay,
 * competency) that met the rule; earlier essays' errors count as support for a later one.
 */
export function gapHypotheses(ectx: EssayContext, events: readonly LedgerEvent[]): GapHypothesis[] {
  const p = ectx.policy;
  const learner = learnerOf(events);
  const out: GapHypothesis[] = [];
  const earlier = new Map<CapabilityId, { essays: Set<string>; sentences: number; observations: string[] }>();
  const analysisEvents = new Map(essayRecords(events, "analysis").map((r) => [r.record.analysis.id, r.event.id]));
  for (const a of countedAnalyses(events)) {
    const errors = new Map<CapabilityId, EssayObservation[]>();
    // only errors count towards a suspected gap: never a stylistic preference, and never a low-confidence claim
    for (const o of a.observations) if (o.kind === "error" && o.confidence !== "low") errors.set(o.competency, [...(errors.get(o.competency) ?? []), o]);
    let ledger: Ledger | null = null;
    for (const [cap, obs] of errors) {
      const sentences = new Set(obs.map((o) => o.span.sentence)).size;
      const prior = earlier.get(cap);
      const suspected = sentences >= p.suspectMinSentences || (prior !== undefined && prior.essays.size > 0);
      if (suspected) {
        ledger ??= ledgerUpTo(ectx, events, analysisEvents.get(a.id) ?? a.id, learner);
        const total = sentences + (prior?.sentences ?? 0);
        const view = leafView(ledger.composite, ectx.ctx.index, cap, lastAt(events, analysisEvents.get(a.id)));
        const engine = view.verification.status;
        const claim = engineClaim(ectx, cap, view);
        const basis = [
          `${obs.length} error${obs.length === 1 ? "" : "s"} in ${sentences} sentence${sentences === 1 ? "" : "s"} of essay ${a.essay}`,
          ...(prior ? [`also seen in ${prior.essays.size} earlier essay${prior.essays.size === 1 ? "" : "s"} (${[...prior.essays].join(", ")})`] : []),
          ...(claim.level !== "none" ? [`the engine records this skill as ${claim.level} at the grade target: the essay disagrees, so it is checked, not retaught`] : []),
        ];
        out.push({
          id: `hyp:${a.essay}:${cap}`,
          competency: cap,
          status: "suspected",
          uncertainty: total >= 4 ? "low" : total >= 2 ? "medium" : "high",
          essays: [...(prior?.essays ?? []), a.essay],
          observations: [...(prior?.observations ?? []), ...obs.map((o) => o.id)],
          misconceptions: [...new Set(obs.map((o) => o.misconception).filter((m): m is string => !!m))],
          basis,
          engine,
          policy: p.version,
        });
      }
      const e = earlier.get(cap) ?? { essays: new Set<string>(), sentences: 0, observations: [] };
      e.essays.add(a.essay);
      e.sentences += sentences;
      e.observations.push(...obs.map((o) => o.id));
      earlier.set(cap, e);
    }
  }
  // the diagnosis each hypothesis has had so far
  // the formal track only: a request of generated (provisional) questions never decides a hypothesis
  const requests = essayRecords(events, "diagnostic").map((r) => r.record.request).filter((r) => r.source !== "generated");
  for (const h of out) {
    const req = requests.find((r) => r.hypothesis === h.id);
    if (!req) continue;
    const outcome = diagnosticOutcome(ectx, events, req, h.misconceptions);
    h.diagnostic = outcome;
    if (outcome.status !== "pending") h.status = outcome.status;
  }
  return out;
}

function lastAt(events: readonly LedgerEvent[], id?: string): string {
  const e = id ? events.find((x) => x.id === id) : events.at(-1);
  return e?.at ?? events.at(-1)?.at ?? "1970-01-01T00:00:00.000Z";
}

/** The latest hypothesis for each competency. */
export function currentHypotheses(ectx: EssayContext, events: readonly LedgerEvent[]): Map<CapabilityId, GapHypothesis> {
  const m = new Map<CapabilityId, GapHypothesis>();
  for (const h of gapHypotheses(ectx, events)) m.set(h.competency, h);
  return m;
}

// ---------------------------------------------------------------- diagnostic questions


/** Items the learner has met (answered or been shown). */
export function seenItems(events: readonly LedgerEvent[]): Set<string> {
  const items = new Set<string>();
  for (const e of events) if (e.kind === "evidence" || e.kind === "presented" || e.kind === "assisted_response") items.add(e.item.id);
  return items;
}

/** Items already set aside by a diagnostic request, a journey or a planned check, so no question is used twice. */
export function reservedItems(events: readonly LedgerEvent[]): Set<string> {
  const r = new Set<string>();
  for (const { record } of essayRecords(events, "diagnostic")) for (const i of record.request.items) r.add(i.id);
  for (const { record } of essayRecords(events, "journey"))
    for (const t of record.journey.trees) for (const n of t.nodes) for (const s of n.steps) if (s.kind !== "teach") for (const ref of s.content.refs) r.add(ref);
  for (const { record } of essayRecords(events, "check")) for (const i of record.check.items) r.add(i.id);
  return r;
}

export type { BankItem } from "./allocation.ts";

/**
 * Unseen, unreserved questions on one competency for diagnosis (allocation.ts): reviewed status first, then
 * closeness to the target band, never a question kept back for independent verification or the delayed
 * retention check. Generated items not yet checked by a person are never used. One per family.
 */
export function pickItems(ectx: EssayContext, events: readonly LedgerEvent[], capability: CapabilityId, n: number, exclude: Set<string> = new Set()): BankItem[] {
  return pickForRole(ectx, events, capability, "diagnostic", n, { exclude });
}

/** Plan diagnostic questions for every current hypothesis that has none yet. Returns the events to append. */
export function planDiagnostics(ectx: EssayContext, events: readonly LedgerEvent[], meta: (n: number) => EventMeta): { events: LedgerEvent[]; requests: DiagnosticRequest[] } {
  const planned = new Set(essayRecords(events, "diagnostic").map((r) => r.record.request.hypothesis));
  const out: LedgerEvent[] = [];
  const requests: DiagnosticRequest[] = [];
  let working = [...events];
  for (const h of currentHypotheses(ectx, events).values()) {
    if (planned.has(h.id) || h.status !== "suspected") continue;
    const m = meta(out.length);
    const { event: ev, request } = diagnosticRequestFor(ectx, working, h, m);
    out.push(ev);
    requests.push(request);
    working = [...working, ev];
  }
  return { events: out, requests };
}

/** The formal diagnostic request for one hypothesis: eligible, unseen bank questions, or the content gap stated. */
function diagnosticRequestFor(ectx: EssayContext, events: readonly LedgerEvent[], h: GapHypothesis, m: EventMeta): { event: LedgerEvent; request: DiagnosticRequest } {
  const essay = h.essays.at(-1)!;
  const ref = ectx.profile.byCapability.get(h.competency)!;
  const items = ref.specified ? pickItems(ectx, events, h.competency, ectx.policy.diagnosticItems) : [];
  const gap = !ref.specified
    ? `${ref.name} is not specified in the framework yet: no questions exist to check it`
    : items.length < ectx.policy.diagnosticMinIndependent
      ? `only ${items.length} unseen question${items.length === 1 ? "" : "s"} on ${ref.name}; at least ${ectx.policy.diagnosticMinIndependent} are needed`
      : undefined;
  const request: DiagnosticRequest = {
    contract: ESSAY_CONTRACT,
    id: m.id,
    essay,
    hypothesis: h.id,
    competency: h.competency,
    items: items.map((i) => ({ id: i.id, version: i.version, contentStatus: contentStatus(i) })),
    minIndependent: ectx.policy.diagnosticMinIndependent,
    ...(gap ? { contentGap: gap } : {}),
    policy: ectx.policy.version,
  };
  return { event: { kind: "essay", id: m.id, at: m.at, session: m.session, record: { type: "diagnostic", request } }, request };
}

/**
 * Plan the formal diagnostic for one chosen hypothesis (the learner picked this competency). Refuses when it is not
 * suspected or already has one. Bank questions only; when too few exist, the request records the gap and asks nothing.
 */
export function planDiagnosticFor(ectx: EssayContext, events: readonly LedgerEvent[], hypothesisId: string, meta: EventMeta): { event: LedgerEvent; request: DiagnosticRequest } {
  const h = gapHypotheses(ectx, events).find((x) => x.id === hypothesisId);
  if (!h) throw new EssayRefusal(`no hypothesis ${hypothesisId}`);
  if (h.status !== "suspected") throw new EssayRefusal(`${hypothesisId} is already ${h.status}`);
  if (essayRecords(events, "diagnostic").some((r) => r.record.request.hypothesis === hypothesisId && r.record.request.source !== "generated")) throw new EssayRefusal(`${hypothesisId} already has diagnostic questions`);
  return diagnosticRequestFor(ectx, events, h, meta);
}

/** What the answers to a diagnostic request show so far. */
export function diagnosticOutcome(ectx: EssayContext, events: readonly LedgerEvent[], request: DiagnosticRequest, misconceptions: string[] = []): DiagnosticOutcome {
  const p = ectx.policy;
  const wanted = new Map(request.items.map((i) => [i.id, i.version]));
  const reqAt = events.find((e) => e.id === request.id)?.at ?? "";
  const learner = learnerOf(events);
  const ledger = Ledger.rebuild(ectx.ctx, learner, events as LedgerEvent[]);
  const verdictOf = (id: string) => ledger.decisions.find((d) => d.source === id)?.verdict ?? "none";
  const taughtItems = new Set(events.filter((e): e is InterventionEvent => e.kind === "intervention").flatMap((e) => e.items ?? []));
  const answers: DiagnosticOutcome["answers"] = [];
  const assisted = { right: 0, total: 0 };
  const firstAnswer = new Set<string>();
  let matches = 0;
  for (const e of events) {
    if (e.at < reqAt) continue;
    if ((e.kind === "evidence" || e.kind === "assisted_response") && wanted.get(e.item.id) === e.item.version) {
      const item = itemVersion(ectx.ctx.content, e.item.id, e.item.version);
      if (!item || item.kind !== "code") continue;
      const { correct, misconceptions: tags } = scoreCode(item, e.response);
      const independent = e.kind === "evidence" && isIndependentProvenance((e as EvidenceEvent).provenance) && !taughtItems.has(item.id) && !firstAnswer.has(item.id);
      firstAnswer.add(item.id);
      if (!independent) {
        assisted.total++;
        if (correct) assisted.right++;
      } else if (!correct && tags.some((t) => misconceptions.includes(t))) matches++;
      answers.push({ evidence: e.id, item: item.id, correct, independent, verdict: e.kind === "evidence" ? verdictOf(e.id) : "assisted" });
    }
  }
  const ind = answers.filter((a) => a.independent);
  const right = ind.filter((a) => a.correct).length;
  const wrong = ind.length - right;
  const allAnswered = request.items.every((i) => answers.some((a) => a.item === i.id));
  const base = { request: request.id, competency: request.competency, independent: { right, total: ind.length }, assisted, misconceptionMatches: matches, answers };
  if (request.contentGap && request.items.length < request.minIndependent)
    return { ...base, status: "unresolved", reason: `Not checked: ${request.contentGap}. The essay's suggestion stays a suggestion.` };
  if (wrong >= p.confirmMinWrong)
    return { ...base, status: "confirmed", reason: `${wrong} of ${ind.length} answered without help were wrong${matches ? `, ${matches} with the same kind of mistake as the essay` : ""}: the essay's suggestion is supported.` };
  if (!allAnswered) return { ...base, status: "pending", reason: `${ind.length} of ${request.items.length} answered without help so far.` };
  // Right answers can only rule out a gap at the grade target if at least one was on a question near it (within half a
  // band): all right on easier questions leaves the suggestion unresolved (policy @1).
  const target = ectx.profile.byCapability.get(request.competency)?.expectedBand ?? null;
  const nearTarget = target === null || ind.some((a) => a.correct && (itemVersion(ectx.ctx.content, a.item, wanted.get(a.item)!)?.b ?? -Infinity) >= target - 0.5);
  const weakens = ind.length >= request.minIndependent && (p.weakenAllRight ? wrong === 0 : wrong < p.confirmMinWrong);
  if (weakens && !nearTarget)
    return { ...base, status: "unresolved", reason: `${right} of ${ind.length} answered without help were right, but every question was below the band ${target} target: that cannot rule out a gap at the target, so practice and a check at the target follow.` };
  if (weakens)
    return { ...base, status: "weakened", reason: `${right} of ${ind.length} answered without help were right: the essay's errors may have been slips. Not a claim of mastery.` };
  return {
    ...base,
    status: "unresolved",
    reason:
      ind.length < request.minIndependent
        ? `Only ${ind.length} answer${ind.length === 1 ? "" : "s"} given without help (${assisted.total} with help): not enough to decide.`
        : `${right} right and ${wrong} wrong without help: mixed, so the essay's suggestion is neither supported nor ruled out.`,
  };
}

export { EssayRefusal };
