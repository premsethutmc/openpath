import { type Context, type EvidenceEvent, type LedgerEvent, Ledger, type QualificationEvent, type WritingTask } from "../src/index.ts";
import { FROZEN_FRAMEWORK, loadContext } from "../../../tools/english/load.ts";

let cached: Context | null = null;
export function ctx(): Context {
  // E1 acceptance tests are defined on framework 0.1.0 (the frozen 17-capability view).
  return (cached ??= loadContext({ allowCandidateAnchors: true, framework: FROZEN_FRAMEWORK }));
}

export const T = (minute: number, day = 0) => new Date(Date.UTC(2026, 9, 12, 10, 30) + day * 86_400_000 + minute * 60_000).toISOString();

export const qualified = (id = "eval:test", noise = 0.6): QualificationEvent => ({ kind: "qualification", id: `q:${id}`, at: T(-1), evaluator: id, noise, bias: 0, qualified: true, drifting: false, anchor_set: "trusted", detail: {} });

export const EMAIL = "Dear Mrs. Rao, I would like to ask you to order a book called The Secret of the Stars. It is about two children who build a telescope. I want to read it because I love space. Many of my friends also like science, so I think they will borrow it too. Thank you very much for your help. Yours sincerely, Ravi";

export function writingTask(): WritingTask {
  return ctx().content.items.get("wr.email.librarian") as WritingTask;
}

export function writingEvidence(text = EMAIL, id = "w1", minute = 5): EvidenceEvent {
  const t = writingTask();
  return { kind: "evidence", id, at: T(minute), session: "s0", item: { id: t.id, version: t.version }, response: { kind: "writing", text } };
}

export function judgement(capability: string, band = 4.5, extra: Record<string, unknown> = {}) {
  return { capability, band, confidence: "medium", quotes: ["I would like to ask you to order a book"], misconceptions: [], rationale: "test", ...extra };
}

export function proposalBody(judgements: unknown[], evidence = "w1", extra: Record<string, unknown> = {}) {
  const t = writingTask();
  return { evidence_id: evidence, item: { id: t.id, version: t.version }, judgements, not_observable: [], flags: { off_task: false, too_short: false, possibly_copied: false, safeguarding: false }, ...extra };
}

export function proposal(body: unknown, id = "p1", evaluator = "eval:test", evidence = "w1", minute = 6): LedgerEvent {
  return { kind: "proposal", id, at: T(minute), evidence, evaluator: { id: evaluator }, body };
}

/** A ledger with a qualified evaluator and one written response, then the given events. */
export function withProposal(...events: LedgerEvent[]): Ledger {
  return Ledger.rebuild(ctx(), "learner", [qualified(), writingEvidence(), ...events]);
}

export const near = (a: number, b: number, places = 2) => Math.abs(a - b) < 0.5 * 10 ** -places + 1e-9;
