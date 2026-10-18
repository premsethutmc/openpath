/**
 * The final rewrite: the learner rewrites the original essay in at most 50 words.
 *
 * Five dimensions are judged separately: meaning preservation, clarity, coherence, grammar and concision. The
 * word count is checked by code. Every quote must be found word for word (in the rewrite, or in the original
 * for key ideas). A rewrite never verifies a competency and never changes an estimate: it is written straight
 * after teaching, about the learner's own essay, so it cannot stand for independent work on new material.
 */
import { scrubIdentifiers } from "../evaluation.ts";
import { instructionLike } from "../freeform.ts";
import type { EssayEvent, LedgerEvent } from "../types.ts";
import { EssayRefusal, essayRecords, submissions, type EventMeta } from "./analysis.ts";
import type { EssayContext } from "./competencies.ts";
import {
  ESSAY_CONTRACT,
  ESSAY_REWRITE_PROTOCOL,
  type EssayEvaluator,
  type EssaySubmission,
  type EvaluatorRef,
  type RewriteDimension,
  type RewriteDimensionResult,
  type RewriteEvaluation,
  type RewriteRating,
  type RewriteRequest,
  type RewriteSubmission,
} from "./contract.ts";
import { findSpan, normaliseText, wordCount } from "./text.ts";

export const REWRITE_DIMENSIONS: RewriteDimension[] = ["meaning_preservation", "clarity", "coherence", "grammar", "concision"];
const RATINGS: RewriteRating[] = ["not_yet", "partly", "mostly", "fully"];

/** Check and record a rewrite. A rewrite over the limit is refused, so the learner can shorten it first. */
export function submitRewrite(ectx: EssayContext, events: readonly LedgerEvent[], meta: EventMeta, input: { rewriteId: string; essayId: string; text: string }): RewriteSubmission {
  const original = submissions(events).find((s) => s.id === input.essayId);
  if (!original) throw new EssayRefusal(`essay ${input.essayId} is not recorded`);
  if (essayRecords(events, "rewrite").some((r) => r.record.rewrite.id === input.rewriteId)) throw new EssayRefusal(`rewrite ${input.rewriteId} is already recorded`);
  const words = wordCount(input.text);
  const { rewriteLimit: limit, rewriteMin: min } = ectx.policy;
  if (words > limit) throw new EssayRefusal(`the rewrite has ${words} words; at most ${limit} are allowed`);
  if (words < min) throw new EssayRefusal(`the rewrite has ${words} words; at least ${min} are needed to keep the essay's meaning`);
  return { contract: ESSAY_CONTRACT, id: input.rewriteId, essay: original.id, at: meta.at, session: meta.session, text: input.text, words, limit };
}

export function buildRewriteRequest(original: EssaySubmission, rewrite: RewriteSubmission): RewriteRequest {
  return {
    protocol: ESSAY_REWRITE_PROTOCOL,
    request_id: `rw:${rewrite.id}`,
    original: { id: original.id, text: scrubIdentifiers(original.text) },
    rewrite: { id: rewrite.id, text: scrubIdentifiers(rewrite.text), words: rewrite.words, limit: rewrite.limit },
    dimensions: REWRITE_DIMENSIONS,
  };
}

const isObj = (x: unknown): x is Record<string, unknown> => !!x && typeof x === "object" && !Array.isArray(x);

/** Validate an evaluator's rewrite judgement. Each dimension stands or falls on its own. */
export function validateRewrite(ectx: EssayContext, original: EssaySubmission, rewrite: RewriteSubmission, raw: unknown, evaluator: EvaluatorRef | null): RewriteEvaluation {
  const words = { count: rewrite.words, limit: rewrite.limit, min: ectx.policy.rewriteMin, within: rewrite.words <= rewrite.limit && rewrite.words >= ectx.policy.rewriteMin };
  const base = { contract: ESSAY_CONTRACT, rewrite: rewrite.id, essay: original.id, evaluator, words, affectsEstimates: false as const, verifiesCompetencies: false as const, artifacts: { original: original.id, revised: rewrite.id } };
  const notAssessed = (reason: string): RewriteDimensionResult[] => REWRITE_DIMENSIONS.map((dimension) => ({ dimension, rating: null, quotes: [], note: "", status: "not_assessed", reason }));
  const whole = (status: RewriteEvaluation["status"], reasons: string[]): RewriteEvaluation => ({ ...base, dimensions: notAssessed(reasons[0]), keyIdeas: [], status, reasons });

  const injected = instructionLike(rewrite.text);
  if (injected) return whole("held", [`the rewrite contains text that could be read as an instruction to the evaluator ("${injected}"): a person should look`]);
  const o = normaliseText(original.text);
  const r = normaliseText(rewrite.text);
  if (r.length > 40 && o.includes(r)) return whole("held", ["the rewrite is copied word for word from the original: there is nothing to judge"]);
  if (!evaluator) return whole("held", ["no evaluator is available: the rewrite is kept and can be judged later"]);
  if (evaluator.protocol !== ESSAY_REWRITE_PROTOCOL) return whole("rejected", [`the evaluator answered protocol ${evaluator.protocol}, not ${ESSAY_REWRITE_PROTOCOL}`]);
  if (!isObj(raw)) return whole("rejected", ["the output is not a JSON object"]);
  const extra = Object.keys(raw).filter((k) => !["rewrite_id", "dimensions", "key_ideas"].includes(k));
  if (extra.length) return whole("rejected", [`unexpected field "${extra[0]}"`]);
  if (raw.rewrite_id !== rewrite.id) return whole("rejected", [`rewrite_id must be ${rewrite.id}`]);
  if (!Array.isArray(raw.dimensions) || !Array.isArray(raw.key_ideas)) return whole("rejected", ["dimensions and key_ideas must be lists"]);

  const reasons: string[] = [];
  // key ideas: each original quote must be in the original; each kept idea's quote must be in the rewrite
  const keyIdeas: RewriteEvaluation["keyIdeas"] = [];
  let badIdeas = 0;
  for (const k of raw.key_ideas as unknown[]) {
    if (!isObj(k) || typeof k.original_quote !== "string" || !(k.rewrite_quote === null || typeof k.rewrite_quote === "string")) {
      badIdeas++;
      continue;
    }
    const inOriginal = findSpan(original.text, k.original_quote);
    const inRewrite = k.rewrite_quote === null ? null : findSpan(rewrite.text, k.rewrite_quote);
    if (!inOriginal || (k.rewrite_quote !== null && !inRewrite)) {
      badIdeas++;
      continue;
    }
    keyIdeas.push({ original: inOriginal.quote, rewrite: inRewrite ? inRewrite.quote : null });
  }
  if (badIdeas) reasons.push(`${badIdeas} key idea${badIdeas === 1 ? "" : "s"} dropped: quote not found word for word or wrong shape`);

  const dimensions: RewriteDimensionResult[] = [];
  for (const dimension of REWRITE_DIMENSIONS) {
    const entries = (raw.dimensions as unknown[]).filter((d) => isObj(d) && d.dimension === dimension) as Record<string, unknown>[];
    const reject = (reason: string) => dimensions.push({ dimension, rating: null, quotes: [], note: "", status: "rejected", reason });
    if (entries.length !== 1) {
      reject(entries.length ? "judged more than once" : "not judged");
      continue;
    }
    const d = entries[0];
    const extraD = Object.keys(d).filter((k) => !["dimension", "rating", "quotes", "note"].includes(k));
    if (extraD.length) {
      reject(`unexpected field "${extraD[0]}"`);
      continue;
    }
    if (!RATINGS.includes(d.rating as RewriteRating)) {
      reject("rating must be not_yet, partly, mostly or fully");
      continue;
    }
    if (typeof d.note !== "string" || !Array.isArray(d.quotes) || !d.quotes.every((q) => typeof q === "string")) {
      reject("note must be a string and quotes a list of strings");
      continue;
    }
    const quotes = d.quotes as string[];
    if (dimension !== "meaning_preservation" && dimension !== "concision" && !quotes.length) {
      reject("no quoted evidence from the rewrite");
      continue;
    }
    const missing = quotes.find((q) => !findSpan(rewrite.text, q));
    if (missing) {
      reject(`quote not found word for word in the rewrite: "${missing}"`);
      continue;
    }
    const rating = d.rating as RewriteRating;
    // meaning preservation must agree with the key ideas the evaluator itself listed
    if (dimension === "meaning_preservation") {
      if (!keyIdeas.length) {
        reject("no usable key ideas, so meaning preservation cannot be checked");
        continue;
      }
      const kept = keyIdeas.filter((k) => k.rewrite !== null).length / keyIdeas.length;
      const allowed: Record<RewriteRating, [number, number]> = { fully: [0.99, 1], mostly: [0.6, 0.99], partly: [0.25, 0.75], not_yet: [0, 0.4] };
      const [lo, hi] = allowed[rating];
      if (kept < lo || kept > hi) {
        reject(`rated ${rating}, but ${Math.round(kept * 100)}% of the listed key ideas are kept`);
        continue;
      }
    }
    dimensions.push({ dimension, rating, quotes: quotes.map((q) => findSpan(rewrite.text, q)!.quote), note: d.note, status: "accepted" });
  }
  return { ...base, dimensions, keyIdeas, status: "evaluated", reasons };
}

/** Record a rewrite and its evaluation (the evaluator may be absent: the rewrite is then kept and held). */
export async function evaluateRewrite(
  ectx: EssayContext,
  events: readonly LedgerEvent[],
  evaluator: EssayEvaluator | null,
  meta: EventMeta,
  input: { rewriteId: string; essayId: string; text: string },
): Promise<{ event: EssayEvent; evaluation: RewriteEvaluation; rewrite: RewriteSubmission }> {
  const rewrite = submitRewrite(ectx, events, meta, input);
  const original = submissions(events).find((s) => s.id === input.essayId)!;
  const ref: EvaluatorRef | null = evaluator ? { id: evaluator.id, version: evaluator.version, protocol: ESSAY_REWRITE_PROTOCOL, ...(evaluator.model ? { model: evaluator.model } : {}) } : null;
  let raw: unknown = undefined;
  let failure: string | null = null;
  if (evaluator && !instructionLike(rewrite.text)) {
    try {
      raw = await evaluator.rewrite(buildRewriteRequest(original, rewrite));
    } catch (e) {
      failure = (e as Error).message;
    }
  }
  const evaluation = failure
    ? { ...validateRewrite(ectx, original, rewrite, undefined, null), status: "held" as const, reasons: [`the evaluator failed: ${failure}; the rewrite is kept and can be judged later`] }
    : validateRewrite(ectx, original, rewrite, raw, ref);
  return { event: { kind: "essay", id: meta.id, at: meta.at, session: meta.session, record: { type: "rewrite", rewrite, evaluation } }, evaluation, rewrite };
}
