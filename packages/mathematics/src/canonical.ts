/** Practice-only codec for the EXISTING OpenPath ledger. No estimator or eligibility policy. */
import type {
  Composite,
  EvidenceEvent,
  Item,
  Provenance,
} from "../../english-core/src/types";
import { leafView } from "../../english-core/src/composite";
import type { Ledger, Context } from "../../english-core/src/updater";
import { indexContent } from "../../english-core/src/content";
import { generate, evaluate, type GeneratedItem } from "./generator";
import { parseNumber, show, polynomial } from "./answers";
import { competencies, examTracks } from "./curriculum";
import { programFor, type ProgramRecord, type AttemptReceipt } from "./program";
import type { SharedCompetencyView } from "./adapter";
export type ExistingIdentity = Pick<Composite, "learnerId">;
export interface PracticePacket {
  contract: "math-ledger-practice@1";
  item: Item & { kind: "code"; evidence_status: "provisional" };
  event: EvidenceEvent;
  /** Must be persisted with the native item version; not another evidence ledger. */
  sidecar: {
    learnerId: string;
    journeyId: string;
    programId: string;
    programVersion: string;
    receipt: AttemptReceipt;
    generatedItem: GeneratedItem;
    codec: "math-answer@1";
    correct: boolean;
    admissible: false;
    independence: "unknown" | "host-provenance";
    durationSource: "activity-receipt";
    exposureCountsSource: "host-ledger-responses";
  };
}
function canonicalAnswer(item: GeneratedItem, text: string): string {
  switch (item.answer.kind) {
    case "number":
      return `number:${show(parseNumber(text))}`;
    case "polynomial":
      return `polynomial:${polynomial(text)}`;
    case "set":
      return `set:${text
        .split(",")
        .map((x) => show(parseNumber(x)))
        .sort()
        .join(",")}`;
    case "choice": {
      const value = text.trim().toUpperCase();
      if (!/^[A-D]$/.test(value)) throw new Error("Unsupported choice");
      return item.format === "single-choice"
        ? `option:${item.options!["ABCD".indexOf(value)]}`
        : `choice:${value}`;
    }
  }
}
function checkIdentity(identity: ExistingIdentity, ledger: Ledger) {
  if (!identity.learnerId || identity.learnerId !== ledger.learnerId)
    throw new Error("Existing learner identity mismatch");
}
/** Actual stem + semantic answer, not seed or unused parameters, determine native identity. */
export function canonicalItemId(item: GeneratedItem) {
  return `math:canonical@1:${encodeURIComponent(JSON.stringify([item.familyId, item.version, item.statement, canonicalAnswer(item, item.answer.value)]))}`;
}
export function preparePractice(
  identity: ExistingIdentity,
  ledger: Ledger,
  record: ProgramRecord,
  receiptId: string,
  sessionId: string,
  provenance?: Provenance,
): PracticePacket {
  checkIdentity(identity, ledger);
  if (record.learnerId !== identity.learnerId || !sessionId)
    throw new Error("Activity learner/session mismatch");
  const c = competencies.find((c) => c.id === record.programId);
  if (!c || record.programVersion !== c.version || record.schemaVersion !== 1)
    throw new Error("Unknown competency or program version");
  if (!ledger.ctx.index.leaves.has(c.id))
    throw new Error(
      "Host has not registered this mathematics competency; never alias it to English",
    );
  const receipt = record.attempts.find((r) => r.id === receiptId);
  if (
    !receipt ||
    record.attempts.filter((r) => r.id === receiptId).length !== 1
  )
    throw new Error("Missing or ambiguous activity receipt");
  if (record.journeyId !== "school") {
    const track = examTracks.find((t) => t.id === record.journeyId);
    if (
      !track ||
      !track.syllabusMapping.some((m) => m.competencyId === c.id) ||
      !(track.questionFamilies as string[]).includes(receipt.familyId)
    )
      throw new Error("Unregistered exam journey/competency/family");
  }
  const item = generate(receipt.familyId, receipt.seed),
    def = programFor(c);
  if (
    item.competencyId !== c.id ||
    receipt.itemId !== item.id ||
    !def.families.includes(receipt.familyId) ||
    !def.stages.some((s) => s.id === receipt.stage)
  )
    throw new Error("Receipt/item/competency mismatch");
  if (
    !Number.isFinite(Date.parse(receipt.at)) ||
    !Number.isFinite(receipt.elapsedMs) ||
    receipt.elapsedMs < 0 ||
    receipt.elapsedMs > 3600000 ||
    !Number.isInteger(receipt.hints) ||
    receipt.hints < 0 ||
    typeof receipt.solutionSeen !== "boolean"
  )
    throw new Error("Invalid receipt metadata");
  const scored = evaluate(item, receipt.response);
  if (!scored.supported)
    throw new Error(
      "Unsupported answer: do not manufacture a binary observation",
    );
  const id = canonicalItemId(item),
    ref = { id, version: 1 };
  // Hint counts alone do not establish event IDs or display timestamps. Missing provenance remains unknown.
  if (provenance) {
    const presented = ledger.events.find((e) => e.id === provenance.presented);
    if (
      provenance.schema !== "provenance@1" ||
      !presented ||
      presented.kind !== "presented" ||
      presented.session !== sessionId ||
      presented.item.id !== id ||
      presented.item.version !== 1 ||
      Date.parse(presented.at) > Date.parse(receipt.at) ||
      provenance.attempt !== (ledger.exposures.get(id)?.count ?? 0) + 1 ||
      provenance.hints.length < receipt.hints ||
      (receipt.solutionSeen && !provenance.afterFeedback)
    )
      throw new Error("Host provenance does not match activity");
    for (const hint of provenance.hints) {
      const event = ledger.events.find((e) => e.id === hint);
      if (
        !event ||
        event.kind !== "hint" ||
        event.session !== sessionId ||
        event.item.id !== id ||
        event.item.version !== 1 ||
        Date.parse(event.at) > Date.parse(receipt.at)
      )
        throw new Error("Unresolved host hint provenance");
    }
    if (provenance.intervention) {
      const event = ledger.events.find((e) => e.id === provenance.intervention);
      if (
        !event ||
        event.kind !== "intervention" ||
        event.session !== sessionId ||
        Date.parse(event.at) > Date.parse(receipt.at)
      )
        throw new Error("Unresolved host intervention");
    }
  }
  const nativeItem: PracticePacket["item"] = {
    kind: "code",
    id,
    version: 1,
    family: `math-family:${item.familyId}@${item.version}`,
    target: c.id,
    format: "typed:math-canonical@1",
    prompt: item.statement,
    answers: [canonicalAnswer(item, item.answer.value)],
    explain: item.workedSolution,
    evidence_status: "provisional",
    review:
      "Unreviewed generated practice. Transport-only a/b; not calibrated mathematics difficulty.",
    a: 1,
    b: ledger.ctx.index.framework.prior.mean,
  };
  const event: EvidenceEvent = {
    kind: "evidence",
    id: `math-receipt:${JSON.stringify([identity.learnerId, record.journeyId, record.programId, record.programVersion, receipt.id])}`,
    at: receipt.at,
    session: sessionId,
    item: ref,
    response: { kind: "typed", text: canonicalAnswer(item, receipt.response) },
    use: "practice",
    ...(provenance ? { provenance: structuredClone(provenance) } : {}),
  };
  return {
    contract: "math-ledger-practice@1",
    item: nativeItem,
    event,
    sidecar: {
      learnerId: identity.learnerId,
      journeyId: record.journeyId,
      programId: c.id,
      programVersion: c.version,
      receipt: structuredClone(receipt),
      generatedItem: item,
      codec: "math-answer@1",
      correct: scored.correct,
      admissible: false,
      independence: provenance ? "host-provenance" : "unknown",
      durationSource: "activity-receipt",
      exposureCountsSource: "host-ledger-responses",
    },
  };
}
/** Host validates/installs this immutable content snapshot BEFORE appending/applying the native event. */
export function contentWithPractice(
  ctx: Context,
  packets: readonly PracticePacket[],
) {
  const items = new Map(ctx.content.items);
  for (const p of packets) {
    if (
      p.item.evidence_status !== "provisional" ||
      p.sidecar.admissible !== false
    )
      throw new Error("Practice eligibility cannot be upgraded");
    const old = items.get(p.item.id);
    if (old && JSON.stringify(old) !== JSON.stringify(p.item))
      throw new Error("Conflicting canonical item version");
    items.set(p.item.id, structuredClone(p.item));
  }
  return indexContent(
    {
      items: [...items.values()],
      passages: [...ctx.content.passages.values()],
      goals: [...ctx.content.goals.values()],
      misspellings: Object.fromEntries(ctx.content.misspellings),
      retired: [...(ctx.content.retired?.values() ?? [])],
    },
    ctx.index,
  );
}
/** Projection delegates stages, retention and verification entirely to the existing core. */
export function sharedProfile(
  identity: ExistingIdentity,
  ledger: Ledger,
  competencyId: string,
  at: string,
): SharedCompetencyView {
  checkIdentity(identity, ledger);
  if (!Number.isFinite(Date.parse(at)))
    throw new Error("Invalid profile timestamp");
  const node = ledger.composite.nodes[competencyId];
  if (!node || !ledger.ctx.index.leaves.has(competencyId))
    return {
      competencyId,
      status: "unavailable",
      source: "shared-engine",
      evidenceIds: [],
      retention: "unavailable",
    };
  const view = leafView(ledger.composite, ledger.ctx.index, competencyId, at);
  const status =
    view.verification.status === "verified" &&
    view.verification.currentLevel !== null
      ? "verified"
      : view.demonstrated !== null
        ? "demonstrated"
        : view.stage === "struggling"
          ? "suspected"
          : view.stage === "developing"
            ? "learning"
            : "unavailable";
  return {
    competencyId,
    status,
    source: "shared-engine",
    evidenceIds: [...node.evidence],
    retention: view.verification.status,
  };
}
