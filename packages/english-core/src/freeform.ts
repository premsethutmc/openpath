/**
 * Free-form evaluation (E3): versioned protocols for extended writing and short written answers.
 *
 * Nothing here gives an evaluator authority. A request carries the task, the rubric (with criterion
 * ids), examples and the learner's response; a proposal may only describe what the response shows,
 * with quoted evidence. The controlled updater (updater.ts) checks every proposal and does all the
 * arithmetic. These functions are pure, so the same checks can run on the device and on the server.
 *
 *   evaluate.v1  E1 protocol for extended writing: kept unchanged so earlier evidence and the frozen
 *                simulation are interpreted exactly as before.
 *   evaluate.v2  E3: every judgement must score each rubric criterion on the band scale, each with a
 *                verbatim quote; the band must agree with its own criteria (check 12).
 *   short.v1     E3: short written answers, marked key point by key point with quotes; code decides
 *                right or wrong.
 */
import { leafView } from "./composite.ts";
import { guardBlocks } from "./content.ts";
import type { EvaluationRequest } from "./evaluation.ts";
import { scrubIdentifiers } from "./evaluation.ts";
import type { FrameworkIndex } from "./framework.ts";
import { fnv1a } from "./model.ts";
import type { AnchorSet, CapabilityId, Composite, ShortItem, WritingTask } from "./types.ts";

export const WRITING_V2 = "evaluate.v2";
export const SHORT_V1 = "short.v1";

/** Is this proposal answering a request made under protocol v2 or later (criteria required)? */
export const isV2 = (prompt?: string): boolean => !!prompt && /^evaluate\.v([2-9]|\d{2,})$/.test(prompt);

// ---------------------------------------------------------------- identifiers

/**
 * Stronger identifier removal for E3 requests (the gateway applies the same rules; see
 * content/english/signals/scrub-cases.json, shared by both). Removes contact details (as v1), plus
 * names in common positions: after a title (Mrs. Rao), after "my name is", and in a sign-off line.
 * Names in free running text cannot be found reliably by rule; that limit is documented.
 */
export function scrubForEvaluation(text: string): string {
  return scrubIdentifiers(text)
    .replace(/\b(Mr|Mrs|Ms|Miss|Dr|Sir|Madam)\.?\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?/g, "$1 [name]")
    .replace(/\b([Mm]y name is|I am called|I'm called|[Tt]his is)\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?/g, "$1 [name]")
    .replace(/((?:[Yy]ours (?:faithfully|sincerely|truly)|[Ll]ove|[Rr]egards|[Bb]est wishes|[Tt]hank you|[Tt]hanks|[Ff]rom|[Yy]our (?:friend|student|son|daughter)),?\s*\n\s*)[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?/g, "$1[name]")
    .replace(/\b((?:[Yy]ours (?:faithfully|sincerely|truly)|[Ll]ove|[Rr]egards|[Bb]est wishes|[Ss]ee you soon|[Yy]our (?:friend|student|son|daughter)),[ \t]*)[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?/g, "$1[name]")
    .replace(/\b(class|grade|std\.?)\s*\d{1,2}(?:[A-Za-z]\b)?/gi, "$1 [removed]");
}

// ---------------------------------------------------------------- rubric criteria

export interface Criterion {
  id: string;
  text: string;
}

/**
 * The rubric criteria for one capability of a writing task, with stable ids derived from the rubric
 * (`capability#1`, `#2`, …). A capability with no listed criteria (a secondary capability) is judged
 * on one criterion, `capability#overall`, against its band descriptors.
 */
export function criteriaFor(task: WritingTask, cap: CapabilityId): Criterion[] {
  const listed = task.rubric[cap] ?? [];
  if (!listed.length) return [{ id: `${cap}#overall`, text: "Overall, against the capability's band descriptors" }];
  return listed.map((text, k) => ({ id: `${cap}#${k + 1}`, text }));
}

// ---------------------------------------------------------------- writing, protocol v2

export interface WritingRequestV2 extends Omit<EvaluationRequest, "targets" | "prompt_version"> {
  prompt_version: typeof WRITING_V2;
  targets: {
    capability: CapabilityId;
    name: string;
    band_descriptors: Record<string, string>;
    criteria: Criterion[];
    misconceptions: { id: string; description: string }[];
    /** Present only if this evaluator passed the anchoring-bias test (see anchoringBiasTest). */
    current?: { mean: number; sd: number; misconceptions: string[] };
  }[];
}

/** Anchors an evaluator may be shown: the prompt set (legacy anchors without a set only as candidates). */
export const promptAnchor = (a: { set?: AnchorSet }) => a.set === "prompt" || a.set === undefined;

export function buildWritingRequestV2(
  task: WritingTask,
  evidenceId: string,
  responseText: string,
  composite: Composite,
  index: FrameworkIndex,
  now: string,
  opts: { anchorSet?: "trusted" | "candidates"; includeEstimates?: boolean; estimatesOverride?: Record<CapabilityId, number> } = {},
): WritingRequestV2 {
  const anchorSet = opts.anchorSet ?? "trusted";
  const caps = [...task.targets, ...task.secondary];
  const targets = caps.map((cap) => {
    const c = index.leaves.get(cap)!;
    const v = leafView(composite, index, cap, now);
    const mean = opts.estimatesOverride?.[cap] ?? v.mean;
    return {
      capability: cap,
      name: c.name,
      band_descriptors: c.bands ?? {},
      criteria: criteriaFor(task, cap),
      misconceptions: c.misconceptions ?? [],
      ...(opts.includeEstimates ? { current: { mean: Math.round(mean * 100) / 100, sd: Math.round(v.sd * 100) / 100, misconceptions: v.misconceptions.map((m) => m.id) } } : {}),
    };
  });
  const avg = (a: { scores: Record<string, number> }) => Object.values(a.scores).reduce((s, x) => s + x, 0) / Object.values(a.scores).length;
  const anchors = task.anchors
    .filter((a) => promptAnchor(a) && (a.trusted || anchorSet === "candidates"))
    .sort((a, b) => avg(a) - avg(b) || a.id.localeCompare(b.id))
    .slice(0, 6)
    .map((a) => ({ id: a.id, trusted: a.trusted, scores: a.scores, text: scrubForEvaluation(a.text) }));
  return {
    request_id: `req:${evidenceId}`,
    prompt_version: WRITING_V2,
    anchor_set: anchorSet,
    task: { id: task.id, version: task.version, genre: task.genre, prompt: task.prompt, min_words: task.min_words, max_words: task.max_words, band_window: task.band_window },
    targets,
    anchors,
    response: { text: scrubForEvaluation(responseText) },
  };
}

export interface CriterionScore {
  id: string;
  band: number;
  quote: string;
}

/** A criterion score in the v2 shape (band on the 1–8 scale plus a quote), as opposed to v1's {id, score, max}. */
export const isBandCriterion = (c: unknown): c is CriterionScore =>
  !!c && typeof c === "object" && typeof (c as CriterionScore).id === "string" && typeof (c as CriterionScore).band === "number" && typeof (c as CriterionScore).quote === "string";

export type ConsistencyVerdict = { verdict: "ok" } | { verdict: "held" | "rejected"; reason: string };

/** Agreement allowed between a band and the mean of its own criterion scores before it is held. */
export const CRITERION_AGREEMENT = 1;
/** How far a band may sit outside the range of its own criterion scores before it is rejected. */
export const CRITERION_RANGE_SLACK = 0.5;

/**
 * Check 12 (approved 12 October): does a judgement's band agree with its own criterion scores?
 *   rejected  criteria missing, unknown, repeated or off the scale (incomplete or malformed);
 *             or the band lies outside the range of its own criterion scores (a contradiction)
 *   held      the band is inside that range but more than one band from their mean (needs a second look)
 * `required` is the criterion ids the rubric lists for this capability.
 */
export function criterionConsistency(band: number, criteria: unknown, required: string[]): ConsistencyVerdict {
  if (!Array.isArray(criteria) || criteria.length === 0) return { verdict: "rejected", reason: "check 12: incomplete: no criterion scores, so the band is not backed by the rubric" };
  if (!criteria.every(isBandCriterion)) return { verdict: "rejected", reason: "check 12: criterion scores must each give an id, a band and a quote" };
  const ids = criteria.map((c) => c.id);
  const unknown = ids.filter((id) => !required.includes(id));
  if (unknown.length) return { verdict: "rejected", reason: `check 12: unknown criterion ${unknown[0]}` };
  if (new Set(ids).size !== ids.length) return { verdict: "rejected", reason: "check 12: a criterion is scored twice" };
  const missing = required.filter((id) => !ids.includes(id));
  if (missing.length) return { verdict: "rejected", reason: `check 12: incomplete: criterion ${missing.join(", ")} not scored` };
  if (criteria.some((c) => !(c.band >= 1 && c.band <= 8))) return { verdict: "rejected", reason: "check 12: a criterion score is outside the 1–8 scale" };
  const bands = criteria.map((c) => c.band);
  const lo = Math.min(...bands);
  const hi = Math.max(...bands);
  const mean = bands.reduce((s, x) => s + x, 0) / bands.length;
  if (band < lo - CRITERION_RANGE_SLACK || band > hi + CRITERION_RANGE_SLACK)
    return { verdict: "rejected", reason: `check 12: band ${band} contradicts the evaluator's own criterion scores (${bands.join(", ")})` };
  if (Math.abs(band - mean) > CRITERION_AGREEMENT)
    return { verdict: "held", reason: `check 12: band ${band} is more than ${CRITERION_AGREEMENT} band from the mean of its own criterion scores (${mean.toFixed(2)}); needs a second evaluation` };
  return { verdict: "ok" };
}

// ---------------------------------------------------------------- text addressed to the evaluator

const INSTRUCTION = [
  // conservative on purpose: each pattern names the marking itself, so ordinary writing rarely matches
  /\bignore (?:all |the |any |your |previous |above )*(?:instructions|rubric|marking scheme|prompt)\b/i,
  /\b(?:give|award|score|mark|grade) (?:me|this|it|my (?:answer|work|essay|letter|story))\b[^.\n]{0,30}\b(?:band|score|grade|marks?)\s*(?:of\s*)?\d/i,
  /\byou are (?:an? |the )(?:ai|language model|evaluator|examiner|grader|marker)\b/i,
  /\b(?:system|developer) (?:prompt|message|instructions?)\b/i,
  /^\s*(?:assistant|system)\s*:/im,
  /"(?:band|judgements|flags|criteria|key_points)"\s*:/i,
];

/**
 * Words in a response that could be read as an instruction to the marker (check 13). A match is a
 * reason for a person to look, not evidence of manipulation: a story can quote such words, and a
 * learner can write them without meaning harm. Known false positives are listed in
 * docs/english/E3A_VALIDATION_LIMITS.md.
 */
export function instructionLike(text: string): string | null {
  for (const r of INSTRUCTION) {
    const m = text.match(r);
    if (m) return m[0];
  }
  return null;
}

// ---------------------------------------------------------------- short written answers

export interface ShortRequest {
  request_id: string;
  prompt_version: typeof SHORT_V1;
  item: { id: string; version: number; format: string; prompt: string; max_words: number; passage?: { title: string; text: string } };
  target: { capability: CapabilityId; name: string; misconceptions: { id: string; description: string }[] };
  key_points: { id: string; text: string }[];
  model_answers: string[];
  anchor_set: "trusted" | "candidates";
  anchors: { id: string; trusted: boolean; marks: Record<string, boolean>; text: string }[];
  response: { text: string };
}

export function buildShortRequest(
  item: ShortItem,
  evidenceId: string,
  responseText: string,
  index: FrameworkIndex,
  opts: { anchorSet?: "trusted" | "candidates"; passage?: { title: string; text: string } } = {},
): ShortRequest {
  const anchorSet = opts.anchorSet ?? "trusted";
  const c = index.leaves.get(item.target)!;
  return {
    request_id: `req:${evidenceId}`,
    prompt_version: SHORT_V1,
    item: { id: item.id, version: item.version, format: item.format, prompt: item.prompt, max_words: item.max_words, ...(opts.passage ? { passage: opts.passage } : {}) },
    target: { capability: item.target, name: c.name, misconceptions: c.misconceptions ?? [] },
    key_points: item.key_points.map((k) => ({ id: k.id, text: k.text })),
    model_answers: item.model_answers,
    anchor_set: anchorSet,
    anchors: item.anchors.filter((a) => promptAnchor(a) && (a.trusted || anchorSet === "candidates")).map((a) => ({ id: a.id, trusted: a.trusted, marks: a.marks, text: a.text })),
    response: { text: scrubForEvaluation(responseText) },
  };
}

export interface ShortProposal {
  evidence_id: string;
  item: { id: string; version: number };
  key_points: { id: string; present: boolean; quote: string | null }[];
  misconceptions: string[];
  flags: { off_task: boolean; too_short: boolean; possibly_copied: boolean; safeguarding: boolean };
  rationale: string;
}

const SHORT_TOP = new Set(["evidence_id", "item", "key_points", "misconceptions", "flags", "rationale"]);
const FLAGS = ["off_task", "too_short", "possibly_copied", "safeguarding"] as const;

/** Strict schema for short-answer proposals: marks per key point only; never a score, a band or a verdict. */
export function parseShortProposal(body: unknown): { ok: true; proposal: ShortProposal } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  const isObj = (x: unknown): x is Record<string, unknown> => !!x && typeof x === "object" && !Array.isArray(x);
  if (!isObj(body)) return { ok: false, errors: ["proposal is not a JSON object"] };
  for (const k of Object.keys(body)) if (!SHORT_TOP.has(k)) errors.push(`unexpected field "${k}": an evaluator may only mark key points, not set scores or verdicts`);
  if (typeof body.evidence_id !== "string") errors.push("evidence_id must be a string");
  const item = body.item;
  if (!isObj(item) || typeof item.id !== "string" || typeof item.version !== "number") errors.push("item must be {id, version}");
  if (!Array.isArray(body.key_points)) errors.push("key_points must be a list");
  else
    body.key_points.forEach((k, i) => {
      if (!isObj(k)) return errors.push(`key point ${i} is not an object`);
      for (const f of Object.keys(k)) if (!["id", "present", "quote"].includes(f)) errors.push(`key point ${i}: unexpected field "${f}"`);
      if (typeof k.id !== "string") errors.push(`key point ${i}: id must be a string`);
      if (typeof k.present !== "boolean") errors.push(`key point ${i}: present must be true or false`);
      if (!(k.quote === null || typeof k.quote === "string")) errors.push(`key point ${i}: quote must be a string or null`);
    });
  if (!Array.isArray(body.misconceptions) || !body.misconceptions.every((m) => typeof m === "string")) errors.push("misconceptions must be a list of strings");
  if (typeof body.rationale !== "string") errors.push("rationale must be a string");
  const flags = body.flags;
  if (!isObj(flags)) errors.push("flags must be an object");
  else {
    for (const k of Object.keys(flags)) if (!(FLAGS as readonly string[]).includes(k)) errors.push(`flags: unexpected field "${k}"`);
    for (const f of FLAGS) if (typeof flags[f] !== "boolean") errors.push(`flags.${f} must be true or false`);
  }
  if (errors.length) return { ok: false, errors };
  return { ok: true, proposal: body as unknown as ShortProposal };
}

/** Key points a guard rules out for this response (deterministic; an evaluator cannot overrule it). */
export function blockedKeyPoints(item: ShortItem, text: string): Map<string, string> {
  const out = new Map<string, string>();
  for (const g of item.guards ?? []) if (guardBlocks(g, text)) out.set(g.key_point, `${g.id}: ${g.note}`);
  return out;
}

/** Right or wrong, decided by code from the marks: every required key point present. */
export const shortCorrect = (item: ShortItem, marks: Map<string, boolean>): boolean => item.key_points.every((k) => !k.required || marks.get(k.id) === true);

/** A stable key for a request (used by replay recordings and the gateway's records; same in Python). */
export function freeformFingerprint(req: WritingRequestV2 | ShortRequest): string {
  const item = "task" in req ? req.task : req.item;
  return `${item.id}@${item.version}:${req.prompt_version}:${fnv1a(req.response.text)}`;
}

// ---------------------------------------------------------------- prompts

/**
 * Fill an E3 prompt template (content/english/prompts/). The response appears once, between fixed
 * markers, and is removed from the JSON so that it is never presented as part of the instructions.
 * Marker text inside a response is neutralised so it cannot close the block early.
 */
export function renderFreeformPrompt(template: string, request: WritingRequestV2 | ShortRequest): string {
  const { response, ...rest } = request;
  const safe = response.text.replace(/<<<RESPONSE|RESPONSE>>>/g, "[marker removed]");
  return template.replace("{{REQUEST_JSON}}", JSON.stringify(rest, null, 2)).replace("{{RESPONSE_TEXT}}", safe);
}
