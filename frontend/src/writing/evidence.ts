/** Replay server practice receipts through the CANONICAL ledger and unchanged eligibility gate. */
import { mathematicsLedger } from "../../../packages/mathematics/src/registration";
import { indexContent } from "../../../packages/english-core/src/content";
import {
  verificationEligibility,
  PILOT_VERIFICATION,
  verificationClaim,
} from "../../../packages/english-core/src/verification";
import type {
  Item,
  EvidenceEvent,
  AssistedResponseEvent,
} from "../../../packages/english-core/src/types";
import type { WritingReceipt } from "./lesson-service";
export function writingEvidence(learnerId: string, receipts: WritingReceipt[]) {
  const ledger = mathematicsLedger(learnerId),
    items = new Map<string, Item>();
  const events: (EvidenceEvent | AssistedResponseEvent)[] = [];
  const disputed = new Set(
    receipts
      .filter((r) => r.action === "input-correction")
      .map((r) => r.payload.receiptId),
  );
  for (const r of receipts) {
    if (r.learnerId !== learnerId)
      throw Error("Writing receipt owner mismatch");
    if (r.action !== "validation" || disputed.has(r.id)) continue;
    const p = r.payload;
    if (!p.result || !p.competency) continue;
    for (const [i, o] of p.result.observations.entries()) {
      const id = `writing@1:${r.problem.id}:${o.region}:${o.position ?? "row"}`;
      items.set(id, {
        id,
        version: 1,
        kind: "code",
        family: `writing@1:${o.operation}`,
        target: p.competency,
        format: "typed:writing-number@1",
        prompt: `${r.problem.statement}: ${o.region}`,
        answers: [o.expected],
        a: 1,
        b: 3,
        evidence_status: "provisional",
        explain: "Server-validated mathematical working; provisional lesson.",
      });
      const base = {
        id: `native:${r.id}:${i}`,
        at: r.at,
        session: `writing:${r.draftId}`,
        item: { id, version: 1 },
        response: { kind: "typed" as const, text: o.response },
      };
      if (r.assisted || p.afterFeedback)
        events.push({
          ...base,
          kind: "assisted_response",
          attempt: 2,
          hints: [],
          afterFeedback: true,
        });
      else events.push({ ...base, kind: "evidence", use: "practice" });
    }
  }
  ledger.ctx.content = indexContent(
    { items: [...items.values()], passages: [], goals: [], misspellings: {} },
    ledger.ctx.index,
  );
  for (const e of events) ledger.apply(e);
  const eligibility = verificationEligibility(ledger.ctx, ledger.events);
  return {
    ledger,
    eligibility,
    claim: verificationClaim(
      ledger.ctx,
      learnerId,
      ledger.events,
      "MATH.number.long-division",
      new Date().toISOString(),
      PILOT_VERIFICATION,
    ),
  };
}
