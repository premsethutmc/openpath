/**
 * The controlled updater and the learner ledger.
 *
 * The learner's state is an append-only ledger of events: evidence, evaluator
 * proposals, evaluator qualifications and revocations. The composite and the
 * decision log are derived from it by a deterministic fold, so they can be
 * rebuilt at any time, any decision can be undone (by revoking it and
 * rebuilding), and better evaluators can re-score old evidence without losing it.
 *
 * Code-scored evidence is applied directly. Evaluator proposals pass through
 * eleven checks first; each judgement is accepted, held or rejected, and the
 * reasons are always recorded.
 */
import { applyDirect, createComposite, leafView } from "./composite.ts";
import { type ContentIndex, contextOf, familyOf, itemParams, itemVersion, scoreCode, wordCount } from "./content.ts";
import { parseProposal, scrubIdentifiers } from "./evaluation.ts";
import { type FrameworkIndex, misconceptionIds } from "./framework.ts";
import { type ItemParams, bandUpdate, binaryUpdate } from "./model.ts";
import type { Composite, Decision, Estimate, EvidenceEvent, Exposure, LedgerEvent, ProposalEvent, QualificationEvent, WritingTask } from "./types.ts";

export interface Context {
  index: FrameworkIndex;
  content: ContentIndex;
  /**
   * Development only: accept evaluators qualified against OpenPath's unreviewed
   * candidate anchors (the simulator and demo). Off by default, so a real
   * deployment fails closed until educator-scored anchors exist.
   */
  allowCandidateAnchors?: boolean;
  /**
   * Research only: an alternative update for right/wrong answers, so a candidate response model can
   * be compared on identical histories (tools/english/research). Never set in production, where
   * right/wrong answers always use `binaryUpdate`; leaving it unset changes nothing.
   */
  researchBinaryUpdate?: (est: Estimate, p: ItemParams, correct: boolean) => Estimate;
}

/** Capabilities with a code-checkable signal (check 6). */
export const SIGNALS = { spelling: "EN.WRT.ACC.spelling", task: "EN.WRT.TSK.task_response" };
const CONFIDENCE = { high: 1, medium: 1.25, low: 1.6 } as const;
const SURPRISE_SD = 2.5;
const SECOND_OPINION_AGREEMENT = 1;
const MIN_NOISE = 0.5;

const normalise = (s: string): string =>
  scrubIdentifiers(s)
    .replace(/[’‘]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

export function misspellingRate(text: string, content: ContentIndex): { words: number; misspelled: string[]; rate: number } {
  const tokens = (text.match(/[A-Za-z’']+/g) ?? []).map((t) => t.toLowerCase().replace(/’/g, "'"));
  const misspelled = tokens.filter((t) => content.misspellings.has(t));
  return { words: tokens.length, misspelled, rate: tokens.length ? misspelled.length / tokens.length : 0 };
}

/** The highest band the automatic misspelling count allows (null: no constraint). */
export function spellingCeiling(rate: number): number | null {
  if (rate >= 0.08) return 3;
  if (rate >= 0.04) return 4;
  if (rate >= 0.02) return 5.5;
  return null;
}

export class Ledger {
  readonly ctx: Context;
  composite: Composite;
  decisions: Decision[] = [];
  events: LedgerEvent[] = [];
  evaluators = new Map<string, QualificationEvent>();
  private revoked: Set<string>;
  private evidence = new Map<string, EvidenceEvent>();
  /** The learner's history with each item and item family (decided here, from the ledger; never from the client). */
  exposures = new Map<string, { count: number; lastAt: string }>();
  familyExposures = new Map<string, { count: number; lastAt: string }>();
  private proposals = new Set<string>();
  private heldSurprise = new Map<string, { band: number; proposal: string }>();
  private exposureOf = new Map<string, Exposure>();

  constructor(ctx: Context, learnerId: string, revoked: Set<string> = new Set()) {
    this.ctx = ctx;
    this.composite = createComposite(ctx.index, learnerId);
    this.revoked = revoked;
  }

  /** Fold a whole event list from scratch. Revocations anywhere in the list apply to the whole history. */
  static rebuild(ctx: Context, learnerId: string, events: LedgerEvent[]): Ledger {
    const revoked = new Set(events.filter((e) => e.kind === "revoke").map((e) => (e as { decision: string }).decision));
    const ledger = new Ledger(ctx, learnerId, revoked);
    for (const e of events) ledger.fold(e);
    return ledger;
  }

  /** Append one event. A revocation re-folds the history without the revoked decision. */
  apply(event: LedgerEvent): Decision[] {
    if (event.kind === "revoke") {
      const rebuilt = Ledger.rebuild(this.ctx, this.composite.learnerId, [...this.events, event]);
      Object.assign(this, rebuilt);
      return this.decisions.filter((d) => d.id === event.decision);
    }
    return this.fold(event);
  }

  get learnerId(): string {
    return this.composite.learnerId;
  }

  evidenceEvent(id: string): EvidenceEvent | undefined {
    return this.evidence.get(id);
  }

  private record(ds: Decision[], event: LedgerEvent): Decision[] {
    this.events.push(event);
    this.decisions.push(...ds);
    this.composite.appliedThrough = event.id;
    return ds;
  }

  private fold(event: LedgerEvent): Decision[] {
    switch (event.kind) {
      case "evidence":
        return this.record(this.onEvidence(event), event);
      case "proposal":
        return this.record(this.onProposal(event), event);
      case "qualification":
        this.evaluators.set(event.evaluator, event);
        return this.record([], event);
      case "revoke":
        return this.record([], event);
    }
  }

  private onEvidence(ev: EvidenceEvent): Decision[] {
    if (this.evidence.has(ev.id)) return [{ id: `d:${ev.id}`, at: ev.at, source: ev.id, capability: null, verdict: "ignored", reasons: ["this evidence was already recorded"] }];
    // the item as the learner saw it: answers to an earlier version are scored against that version
    const item = itemVersion(this.ctx.content, ev.item.id, ev.item.version);
    if (!item)
      return [{ id: `d:${ev.id}`, at: ev.at, source: ev.id, capability: null, verdict: "rejected", reasons: [`unknown item ${ev.item.id} v${ev.item.version}`] }];
    this.evidence.set(ev.id, ev);
    const exposure: Exposure = this.exposures.has(item.id) ? "repeat" : this.familyExposures.has(familyOf(item)) ? "variant" : "fresh";
    const bump = (m: Map<string, { count: number; lastAt: string }>, k: string) => m.set(k, { count: (m.get(k)?.count ?? 0) + 1, lastAt: ev.at });
    bump(this.exposures, item.id);
    bump(this.familyExposures, familyOf(item));
    this.exposureOf.set(ev.id, exposure);
    if (item.kind === "writing") return []; // waits for an evaluator proposal
    const { correct, misconceptions } = scoreCode(item, ev.response);
    const id = `d:${ev.id}:${item.target}`;
    const observation = { kind: "binary" as const, value: correct ? 1 : 0, item: item.id, context: contextOf(item), misconceptions, exposure };
    if (this.revoked.has(id)) return [{ id, at: ev.at, source: ev.id, capability: item.target, verdict: "revoked", reasons: ["revoked"], observation }];
    const params = itemParams(item);
    const applied = applyDirect(this.composite, this.ctx.index, {
      capability: item.target,
      at: ev.at,
      session: ev.session,
      context: observation.context,
      decisionId: id,
      update: (e) => (this.ctx.researchBinaryUpdate ?? binaryUpdate)(e, params, correct),
      misconceptions,
      binary: { b: item.b, correct, a: params.a, c: params.c },
      exposure,
    });
    return [
      {
        id,
        at: ev.at,
        source: ev.id,
        capability: item.target,
        verdict: "accepted",
        reasons: [
          `scored by code: ${correct ? "right" : "wrong"} on an item of difficulty ${item.b}`,
          ...(exposure === "repeat" ? ["repeated item: recorded for retention only; the ability estimate is not changed"] : exposure === "variant" ? ["variant of an item seen before"] : []),
        ],
        observation,
        before: applied.before,
        after: applied.after,
        inferred: applied.inferred,
      },
    ];
  }

  private onProposal(ev: ProposalEvent): Decision[] {
    const base = { at: ev.at, source: ev.id };
    const whole = (verdict: Decision["verdict"], reasons: string[]): Decision[] => [{ id: `d:${ev.id}`, ...base, capability: null, verdict, reasons }];

    // Check 1: shape, evidence, repeats.
    if (this.proposals.has(ev.id)) return whole("ignored", ["check 1: this proposal was already processed"]);
    this.proposals.add(ev.id);
    const parsed = parseProposal(ev.body);
    if (!parsed.ok) return whole("rejected", parsed.errors.map((e) => `check 1: ${e}`));
    const proposal = parsed.proposal;
    const evidence = this.evidence.get(ev.evidence);
    if (!evidence || proposal.evidence_id !== ev.evidence) return whole("rejected", ["check 1: the evidence this proposal refers to is not in the ledger"]);
    const task = this.ctx.content.items.get(evidence.item.id);
    if (!task || task.kind !== "writing" || evidence.response.kind !== "writing") return whole("rejected", ["check 1: proposals are only accepted for written responses"]);
    if (proposal.item.id !== task.id || proposal.item.version !== task.version) return whole("rejected", ["check 1: the proposal names a different item or version"]);

    // Check 8: the response must be usable evidence at all.
    const f = proposal.flags;
    if (f.safeguarding) return whole("rejected", ["check 8: safeguarding flag; no learning update, route to the safeguarding process"]);
    if (f.off_task || f.too_short || f.possibly_copied)
      return whole("rejected", [`check 8: response flagged as ${Object.entries(f).filter(([, v]) => v).map(([k]) => k.replace("_", " ")).join(", ")}; no update`]);

    const text = evidence.response.text;
    const normText = normalise(text);
    const allowedCaps = new Set([...task.targets, ...task.secondary]);
    const q = this.evaluators.get(ev.evaluator.id);
    const signals = misspellingRate(text, this.ctx.content);
    const ceiling = spellingCeiling(signals.rate);
    const words = wordCount(text);
    const seenCaps = new Set<string>();
    const out: Decision[] = [];

    for (const j of proposal.judgements) {
      const id = `d:${ev.id}:${j.capability}`;
      const reasons: string[] = [];
      const reject = (r: string) => out.push({ id, ...base, capability: j.capability, verdict: "rejected", reasons: [...reasons, r] });
      const hold = (r: string) => out.push({ id, ...base, capability: j.capability, verdict: "held", reasons: [...reasons, r] });

      // Check 2: only capabilities this task can show.
      if (!allowedCaps.has(j.capability)) {
        reject(`check 2: ${j.capability} is not a target of task ${task.id}`);
        continue;
      }
      if (seenCaps.has(j.capability)) {
        reject("check 2: a second judgement for the same capability in one proposal");
        continue;
      }
      seenCaps.add(j.capability);
      // Check 3: band on the scale and near the task's range.
      const [lo, hi] = (task as WritingTask).band_window;
      if (j.band < 1 || j.band > 8 || j.band < lo - 2 || j.band > hi + 2) {
        reject(`check 3: band ${j.band} is outside the scale or more than 2 bands outside the task's range ${lo}–${hi}`);
        continue;
      }
      // Check 4: every quote must be in the learner's text.
      if (!j.quotes.length) {
        reject("check 4: no quoted evidence from the response");
        continue;
      }
      const missing = j.quotes.filter((quote) => !normText.includes(normalise(quote)));
      if (missing.length) {
        reject(`check 4: quote not found in the learner's response: "${missing[0]}"`);
        continue;
      }
      // Check 5: only listed misconception tags survive.
      const allowedTags = misconceptionIds(this.ctx.index, j.capability);
      const tags = j.misconceptions.filter((t) => allowedTags.has(t));
      const dropped = j.misconceptions.filter((t) => !allowedTags.has(t));
      if (dropped.length) reasons.push(`check 5: dropped unknown misconception tag(s) ${dropped.join(", ")}`);
      // Check 6: agree with what code can check.
      if (j.capability === SIGNALS.spelling && ceiling !== null && j.band > ceiling + 1.5) {
        hold(`check 6: ${signals.misspelled.length} common misspellings in ${signals.words} words allow at most band ${ceiling}, but the proposal says ${j.band}`);
        continue;
      }
      if (j.capability === SIGNALS.task && words < 0.5 * task.min_words && j.band > 4.5) {
        hold(`check 6: ${words} words for a task asking for at least ${task.min_words}; band ${j.band} is not credible`);
        continue;
      }
      // Check 7: the evaluator must be qualified against anchors and not drifting.
      if (!q || !q.qualified || q.drifting) {
        hold(`check 7: evaluator ${ev.evaluator.id} is ${!q ? "not qualified against anchors" : q.drifting ? "drifting from the anchors" : "not qualified"}`);
        continue;
      }
      if (q.anchor_set !== "trusted" && !this.ctx.allowCandidateAnchors) {
        hold(`check 7: evaluator ${ev.evaluator.id} was qualified only against unreviewed candidate anchors; trusted (educator-scored) anchors are required`);
        continue;
      }
      // Check 9: very surprising judgements need a second opinion.
      const view = leafView(this.composite, this.ctx.index, j.capability, ev.at);
      const key = `${ev.evidence}|${j.capability}`;
      let noiseFactor = 1;
      if (Math.abs(j.band - view.mean) > SURPRISE_SD * view.sd) {
        const first = this.heldSurprise.get(key);
        if (first && first.proposal !== ev.id && Math.abs(first.band - j.band) <= SECOND_OPINION_AGREEMENT) {
          reasons.push(`check 9: surprising, but a second evaluation agrees (${first.band} and ${j.band}); accepted with doubled noise`);
          noiseFactor = 2;
        } else {
          this.heldSurprise.set(key, { band: j.band, proposal: ev.id });
          hold(`check 9: band ${j.band} is more than ${SURPRISE_SD} sd from the current estimate ${view.mean.toFixed(2)} ± ${view.sd.toFixed(2)}; needs a second evaluation`);
          continue;
        }
      }
      const noise = Math.max(MIN_NOISE, q.noise * CONFIDENCE[j.confidence]) * noiseFactor;
      const exposure = this.exposureOf.get(evidence.id) ?? "fresh";
      if (exposure === "repeat") reasons.push("repeated task: recorded for retention only; the ability estimate is not changed");
      else if (exposure === "variant") reasons.push("variant of a task seen before");
      const observation = { kind: "band" as const, value: j.band, noise, item: task.id, context: contextOf(task), misconceptions: tags, exposure };
      if (this.revoked.has(id)) {
        out.push({ id, ...base, capability: j.capability, verdict: "revoked", reasons: [...reasons, "revoked"], observation });
        continue;
      }
      // Checks 10 and 11: capped movement; stages are never set by a proposal.
      const applied = applyDirect(this.composite, this.ctx.index, {
        capability: j.capability,
        at: ev.at,
        session: evidence.session,
        context: observation.context,
        decisionId: id,
        update: (e) => bandUpdate(e, j.band, noise),
        maxShift: this.ctx.index.framework.policy.evaluator_max_shift,
        band: { value: j.band, noise },
        misconceptions: tags,
        success: j.band >= view.mean,
        exposure,
      });
      if (applied.capped) reasons.push(`check 10: change capped at ±${this.ctx.index.framework.policy.evaluator_max_shift} bands`);
      out.push({
        id,
        ...base,
        capability: j.capability,
        verdict: "accepted",
        reasons: [`evaluator ${ev.evaluator.id} judged band ${j.band} (${j.confidence} confidence, noise ${noise.toFixed(2)})`, ...reasons],
        observation,
        before: applied.before,
        after: applied.after,
        inferred: applied.inferred,
      });
    }
    return out;
  }
}
