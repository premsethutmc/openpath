/**
 * Essay submission and analysis: an evaluator proposes observations; code keeps only what the essay supports.
 *
 * Every accepted observation names a competency in the grade profile, quotes the essay word for word (code
 * finds the span; a paraphrase is rejected), carries the evaluator's id and version, and is tentative: it is
 * recorded in the ledger and never changes an ability estimate.
 */
import { scrubIdentifiers } from "../evaluation.ts";
import { instructionLike } from "../freeform.ts";
import type { EssayEvent, LedgerEvent } from "../types.ts";
import { allowedTags, type EssayContext } from "./competencies.ts";
import {
  ESSAY_CONTRACT,
  ESSAY_OBSERVE_PROTOCOL,
  ESSAY_OBSERVE_PROTOCOL_V2,
  REAL_LEARNER_ESSAYS_ENABLED,
  type ObserveProtocol,
  type EssayAnalysis,
  type EssayEvaluator,
  type EssayObservation,
  type EssayRecord,
  type EssaySource,
  type EssaySubmission,
  type EvaluatorRef,
  type ObservationRequest,
} from "./contract.ts";
import { findSpan, fingerprint, wordCount } from "./text.ts";

export const essayEvents = (events: readonly LedgerEvent[]): EssayEvent[] => events.filter((e): e is EssayEvent => e.kind === "essay");

export function essayRecords<T extends EssayRecord["type"]>(events: readonly LedgerEvent[], type: T): { event: EssayEvent; record: Extract<EssayRecord, { type: T }> }[] {
  return essayEvents(events)
    .filter((e) => e.record.type === type)
    .map((e) => ({ event: e, record: e.record as Extract<EssayRecord, { type: T }> }));
}

export const submissions = (events: readonly LedgerEvent[]): EssaySubmission[] => essayRecords(events, "submission").map((r) => r.record.submission);
export const analyses = (events: readonly LedgerEvent[]): EssayAnalysis[] => essayRecords(events, "analysis").map((r) => r.record.analysis);

export class EssayRefusal extends Error {}

export interface EventMeta {
  id: string;
  at: string;
  session: string;
}

const MIN_WORDS = 30;
const MAX_WORDS = 1500;

/** Record an essay. Refuses real learners' writing until the privacy policies are approved. */
export function submitEssay(
  ectx: EssayContext,
  events: readonly LedgerEvent[],
  meta: EventMeta,
  input: { essayId: string; learner: string; text: string; source: Omit<EssaySource, "profile" | "grade"> & { grade?: number } },
): { event: EssayEvent; submission: EssaySubmission } {
  if (input.source.dataUse === "real_learner" && !REAL_LEARNER_ESSAYS_ENABLED)
    throw new EssayRefusal("real learners' essays are not accepted until consent, retention and deletion policies are approved");
  if (input.source.dataUse !== "synthetic_test" && input.source.dataUse !== "real_learner") throw new EssayRefusal("source.dataUse must be synthetic_test or real_learner");
  if (submissions(events).some((s) => s.id === input.essayId)) throw new EssayRefusal(`essay ${input.essayId} is already recorded`);
  const words = wordCount(input.text);
  if (words < MIN_WORDS) throw new EssayRefusal(`an essay needs at least ${MIN_WORDS} words to analyse (this has ${words})`);
  if (words > MAX_WORDS) throw new EssayRefusal(`an essay of more than ${MAX_WORDS} words is not analysed (this has ${words})`);
  const grade = input.source.grade ?? ectx.profile.profile.grade;
  if (grade !== ectx.profile.profile.grade) throw new EssayRefusal(`no competency profile for grade ${grade}; this one is for grade ${ectx.profile.profile.grade}`);
  const submission: EssaySubmission = {
    contract: ESSAY_CONTRACT,
    id: input.essayId,
    learner: input.learner,
    session: meta.session,
    at: meta.at,
    text: input.text,
    words,
    fingerprint: fingerprint(input.text),
    source: { ...input.source, grade, profile: ectx.profile.key },
  };
  return { event: { kind: "essay", id: meta.id, at: meta.at, session: meta.session, record: { type: "submission", submission } }, submission };
}

/** The request an evaluator receives: scrubbed text, and the profile's competencies with their descriptors. */
export function buildObservationRequest(ectx: EssayContext, submission: EssaySubmission, protocol: ObserveProtocol = ESSAY_OBSERVE_PROTOCOL): ObservationRequest {
  return {
    protocol,
    ...(protocol === ESSAY_OBSERVE_PROTOCOL_V2 ? { rubric: ectx.profile.key, ...(submission.source.prompt ? { prompt: submission.source.prompt } : {}) } : {}),
    request_id: `obs:${submission.id}`,
    essay: { id: submission.id, text: scrubIdentifiers(submission.text), words: submission.words },
    grade: submission.source.grade,
    competencies: ectx.profile.profile.competencies.map((c) => {
      const leaf = ectx.ctx.index.leaves.get(c.capability)!;
      return { id: c.capability, name: c.name, area: c.area, bands: leaf.bands ?? {}, misconceptions: (leaf.misconceptions ?? []).map((m) => ({ id: m.id, description: m.description })) };
    }),
    max_observations: ectx.policy.maxObservations,
  };
}

const TOP_V1 = new Set(["essay_id", "observations", "not_observable"]);
const TOP_V2 = new Set(["essay_id", "rubric", "observations", "not_observable"]);
const OBS_V1 = new Set(["competency", "kind", "quote", "correction", "misconception", "confidence", "note"]);
const OBS_V2 = new Set(["competency", "kind", "quote", "explanation", "correction", "misconception", "confidence", "verification", "possible_slip"]);
const isObj = (x: unknown): x is Record<string, unknown> => !!x && typeof x === "object" && !Array.isArray(x);

/** Limits on what counts as specific evidence (v2). */
export const OBSERVATION_LIMITS = {
  /** A quote longer than this is not a specific piece of evidence. */
  maxQuoteChars: 400,
  /** A quote covering more than this share of the essay is not specific either. */
  maxQuoteShare: 0.5,
  minExplanationChars: 12,
  maxExplanationChars: 600,
} as const;

/**
 * Validate an evaluator's raw output against the essay. Whole-output problems reject the analysis; a bad
 * observation is rejected on its own with a reason; text addressed to the evaluator holds everything for a person.
 *
 * v2 adds: the rubric must match; every observation needs an explanation and a verification flag; a correction
 * identical to the quote shows no error; over-broad quotes are not evidence; an error and a strength on the same
 * words for the same competency contradict each other, so both are rejected; a competency cannot be both observed
 * and "not observable".
 */
export function validateObservations(ectx: EssayContext, submission: EssaySubmission, raw: unknown, evaluator: EvaluatorRef, analysisId: string, repeatOf?: string): EssayAnalysis {
  const base = { contract: ESSAY_CONTRACT, id: analysisId, essay: submission.id, evaluator, ...(repeatOf ? { repeatOf } : {}) };
  const whole = (status: EssayAnalysis["status"], reasons: string[]): EssayAnalysis => ({ ...base, status, reasons, observations: [], rejected: [], notObservable: [] });
  if (!evaluator.id || !evaluator.version) return whole("rejected", ["the evaluator has no id or version"]);
  const v2 = evaluator.protocol === ESSAY_OBSERVE_PROTOCOL_V2;
  if (!v2 && evaluator.protocol !== ESSAY_OBSERVE_PROTOCOL) return whole("rejected", [`the evaluator answered protocol ${evaluator.protocol}, not ${ESSAY_OBSERVE_PROTOCOL} or ${ESSAY_OBSERVE_PROTOCOL_V2}`]);
  if (!isObj(raw)) return whole("rejected", ["the output is not a JSON object"]);
  const shape: string[] = [];
  for (const k of Object.keys(raw)) if (!(v2 ? TOP_V2 : TOP_V1).has(k)) shape.push(`unexpected field "${k}": an evaluator may only propose observations`);
  if (raw.essay_id !== submission.id) shape.push(`essay_id must be ${submission.id}`);
  if (v2 && raw.rubric !== ectx.profile.key) shape.push(`rubric must be ${ectx.profile.key} (the output names ${JSON.stringify(raw.rubric)})`);
  if (v2 && evaluator.rubric !== undefined && evaluator.rubric !== ectx.profile.key) shape.push(`the evaluator is configured for rubric ${evaluator.rubric}, not ${ectx.profile.key}`);
  if (!Array.isArray(raw.observations)) shape.push("observations must be a list");
  if (!Array.isArray(raw.not_observable) || !raw.not_observable.every((x) => typeof x === "string")) shape.push("not_observable must be a list of competency ids");
  if (shape.length) return whole("rejected", shape);
  const injected = instructionLike(submission.text);
  if (injected) return whole("held", [`the essay contains text that could be read as an instruction to the evaluator ("${injected}"): a person should look before anything is kept`]);

  const list = raw.observations as unknown[];
  const reasons: string[] = [];
  if (list.length > ectx.policy.maxObservations) reasons.push(`only the first ${ectx.policy.maxObservations} of ${list.length} observations were considered`);
  const accepted: EssayObservation[] = [];
  const rejected: EssayAnalysis["rejected"] = [];
  const seen = new Set<string>();
  const kinds = v2 ? ["error", "strength", "style"] : ["error", "strength"];
  const norm = (t: string) => t.replace(/[’‘]/g, "'").replace(/\s+/g, " ").trim().toLowerCase();
  list.slice(0, ectx.policy.maxObservations).forEach((o, index) => {
    const reject = (reason: string, competency?: string) => rejected.push({ index, ...(competency ? { competency } : {}), reason });
    if (!isObj(o)) return reject("not an object");
    const extra = Object.keys(o).filter((k) => !(v2 ? OBS_V2 : OBS_V1).has(k));
    if (extra.length) return reject(`unexpected field "${extra[0]}"`, typeof o.competency === "string" ? o.competency : undefined);
    if (typeof o.competency !== "string") return reject("competency must be a string");
    const ref = ectx.profile.byCapability.get(o.competency);
    if (!ref) return reject(`${o.competency} is not a competency in profile ${ectx.profile.key}`, o.competency);
    if (!kinds.includes(o.kind as string)) return reject(`kind must be ${kinds.join(", ")}`, o.competency);
    if (!["high", "medium", "low"].includes(o.confidence as string)) return reject("confidence must be high, medium or low", o.competency);
    const explanation = v2 ? o.explanation : o.note;
    if (typeof explanation !== "string") return reject(`${v2 ? "explanation" : "note"} must be a string`, o.competency);
    if (v2 && explanation.trim().length < OBSERVATION_LIMITS.minExplanationChars) return reject("no explanation grounded in the text", o.competency);
    if (v2 && explanation.length > OBSERVATION_LIMITS.maxExplanationChars) return reject("explanation too long", o.competency);
    if (v2 && o.verification !== "required" && o.verification !== "not_required") return reject("verification must be required or not_required", o.competency);
    if (v2 && o.possible_slip !== undefined && typeof o.possible_slip !== "boolean") return reject("possible_slip must be true or false", o.competency);
    if (typeof o.quote !== "string" || !o.quote.trim()) return reject("no quoted evidence from the essay", o.competency);
    if (o.correction !== undefined && typeof o.correction !== "string") return reject("correction must be a string", o.competency);
    if (o.misconception !== undefined && typeof o.misconception !== "string") return reject("misconception must be a string", o.competency);
    const span = findSpan(submission.text, o.quote);
    if (!span) return reject(`quote not found word for word in the essay: "${o.quote}"`, o.competency);
    if (v2 && (span.quote.length > OBSERVATION_LIMITS.maxQuoteChars || span.quote.length > OBSERVATION_LIMITS.maxQuoteShare * submission.text.length))
      return reject("the quote is too broad to be specific evidence", o.competency);
    if (v2 && typeof o.correction === "string" && norm(o.correction) === norm(span.quote)) return reject("the correction is the same as the quoted text: no error is shown", o.competency);
    if (v2 && o.kind === "error" && o.possible_slip === true && o.confidence === "high" && o.verification === "not_required")
      reasons.push(`a high-confidence possible slip on ${o.competency} is kept as observed, not as a gap`);
    const key = `${o.competency}|${o.kind}|${span.start}|${span.end}`;
    if (seen.has(key)) return reject("the same competency and span were observed twice", o.competency);
    seen.add(key);
    let misconception = o.misconception as string | undefined;
    if (misconception !== undefined && !allowedTags(ectx, o.competency).has(misconception)) {
      reasons.push(`dropped unknown misconception tag "${misconception}" on ${o.competency}`);
      misconception = undefined;
    }
    if (o.kind !== "error" && misconception) misconception = undefined;
    const kind = o.kind as EssayObservation["kind"];
    accepted.push({
      id: `${analysisId}:o${accepted.length + 1}`,
      essay: submission.id,
      competency: o.competency,
      area: ref.area,
      kind,
      span,
      ...(typeof o.correction === "string" && kind !== "strength" ? { correction: o.correction } : {}),
      ...(misconception ? { misconception } : {}),
      confidence: o.confidence as EssayObservation["confidence"],
      note: explanation,
      ...(v2 ? { verification: kind === "style" ? ("not_required" as const) : (o.verification as "required" | "not_required") } : {}),
      ...(v2 && o.possible_slip === true && kind === "error" ? { possibleSlip: true } : {}),
      evaluator,
    });
  });
  // an error and a strength on overlapping words for the same competency contradict each other: neither stands
  const overlaps = (a: EssayObservation, b: EssayObservation) => a.span.start < b.span.end && b.span.start < a.span.end;
  const contradicted = new Set<string>();
  for (const a of accepted)
    for (const b of accepted)
      if (a.competency === b.competency && a.kind === "error" && b.kind === "strength" && overlaps(a, b)) {
        contradicted.add(a.id);
        contradicted.add(b.id);
      }
  const kept = accepted.filter((o) => !contradicted.has(o.id)).map((o, i) => ({ ...o, id: `${analysisId}:o${i + 1}` }));
  for (const o of accepted)
    if (contradicted.has(o.id)) rejected.push({ index: -1, competency: o.competency, reason: `contradictory: an error and a strength were both claimed for "${o.span.quote}"` });
  const observedCaps = new Set(kept.map((o) => o.competency));
  const notObservable = (raw.not_observable as string[]).filter((c) => {
    if (!ectx.profile.byCapability.has(c)) return false;
    if (observedCaps.has(c)) {
      reasons.push(`${c} was both observed and called not observable: the "not observable" claim is dropped`);
      return false;
    }
    return true;
  });
  if (repeatOf) reasons.push(`this essay repeats ${repeatOf}: its observations are kept for the record but not counted again`);
  return { ...base, status: "accepted", reasons, observations: kept, rejected, notObservable };
}

/** Ask the evaluator, validate its answer, and return the ledger event to append. */
export async function analyseEssay(
  ectx: EssayContext,
  events: readonly LedgerEvent[],
  evaluator: EssayEvaluator,
  essayId: string,
  meta: EventMeta,
): Promise<{ event: EssayEvent; analysis: EssayAnalysis }> {
  const all = submissions(events);
  const submission = all.find((s) => s.id === essayId);
  if (!submission) throw new EssayRefusal(`essay ${essayId} is not recorded`);
  const repeatOf = all.find((s) => s.fingerprint === submission.fingerprint && s.at < submission.at && s.id !== submission.id)?.id;
  const protocol = evaluator.protocols?.observe ?? ESSAY_OBSERVE_PROTOCOL;
  const ref: EvaluatorRef = { id: evaluator.id, version: evaluator.version, protocol, ...(evaluator.model ? { model: evaluator.model } : {}), ...(protocol === ESSAY_OBSERVE_PROTOCOL_V2 ? { rubric: ectx.profile.key } : {}) };
  let raw: unknown;
  try {
    raw = await evaluator.observe(buildObservationRequest(ectx, submission, protocol));
  } catch (e) {
    raw = undefined;
    const analysis: EssayAnalysis = { contract: ESSAY_CONTRACT, id: meta.id, essay: submission.id, evaluator: ref, status: "rejected", reasons: [`the evaluator failed: ${(e as Error).message}`], observations: [], rejected: [], notObservable: [] };
    return { event: { kind: "essay", ...meta, record: { type: "analysis", analysis } }, analysis };
  }
  const analysis = validateObservations(ectx, submission, raw, ref, meta.id, repeatOf);
  return { event: { kind: "essay", ...meta, record: { type: "analysis", analysis } }, analysis };
}
