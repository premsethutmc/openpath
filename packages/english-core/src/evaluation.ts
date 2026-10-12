/**
 * The evaluation boundary.
 *
 * OpenPath builds an EvaluationRequest; an Evaluator (any LLM provider, a
 * human, or a stand-in) returns raw JSON; `parseProposal` checks it against a
 * strict schema. A proposal can only describe what a response shows (a band,
 * criteria, quotes, misconception tags). It cannot set an estimate or a stage:
 * those are decided by the controlled updater (updater.ts).
 */
import type { Composite, CapabilityId, WritingTask } from "./types.ts";
import type { FrameworkIndex } from "./framework.ts";
import { leafView } from "./composite.ts";

export const PROMPT_VERSION = "evaluate.v1";

export interface EvaluationRequest {
  request_id: string;
  prompt_version: string;
  task: { id: string; version: number; genre: string; prompt: string; min_words: number; max_words: number; band_window: [number, number] };
  targets: {
    capability: CapabilityId;
    name: string;
    band_descriptors: Record<string, string>;
    criteria: string[];
    misconceptions: { id: string; description: string }[];
    current: { mean: number; sd: number; misconceptions: string[] };
  }[];
  anchors: { id: string; trusted: boolean; scores: Record<CapabilityId, number>; text: string }[];
  response: { text: string };
}

export interface Judgement {
  capability: CapabilityId;
  band: number;
  confidence: "high" | "medium" | "low";
  criteria?: { id: string; score: number; max: number }[];
  quotes: string[];
  misconceptions: string[];
  rationale: string;
}

export interface Proposal {
  evidence_id: string;
  item: { id: string; version: number };
  judgements: Judgement[];
  not_observable: CapabilityId[];
  flags: { off_task: boolean; too_short: boolean; possibly_copied: boolean; safeguarding: boolean };
  surprise?: { capability: CapabilityId; note: string };
}

/** Any provider, model, human panel or stand-in. Returns the raw JSON it produced. */
export interface Evaluator {
  id: string;
  model?: string;
  evaluate(request: EvaluationRequest): Promise<unknown>;
}

/** Remove things that look like contact details before text leaves the device or server. */
export function scrubIdentifiers(text: string): string {
  return text
    .replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, "[removed]")
    .replace(/https?:\/\/\S+/g, "[removed]")
    .replace(/(?:\+?\d[\d\s-]{6,}\d)/g, "[removed]")
    .replace(/@\w{2,}/g, "[removed]");
}

export function buildEvaluationRequest(
  task: WritingTask,
  evidenceId: string,
  responseText: string,
  composite: Composite,
  index: FrameworkIndex,
  now: string,
): EvaluationRequest {
  const targets = task.targets.map((cap) => {
    const c = index.leaves.get(cap)!;
    const v = leafView(composite, index, cap, now);
    return {
      capability: cap,
      name: c.name,
      band_descriptors: c.bands ?? {},
      criteria: task.rubric[cap] ?? [],
      misconceptions: c.misconceptions ?? [],
      current: { mean: Math.round(v.mean * 100) / 100, sd: Math.round(v.sd * 100) / 100, misconceptions: v.misconceptions.map((m) => m.id) },
    };
  });
  const centre = targets.reduce((s, t) => s + t.current.mean, 0) / targets.length;
  const avg = (a: { scores: Record<string, number> }) => {
    const v = Object.values(a.scores);
    return v.reduce((s, x) => s + x, 0) / v.length;
  };
  // Up to three anchors around the learner's current level, shown low to high.
  const anchors = [...task.anchors]
    .sort((a, b) => Math.abs(avg(a) - centre) - Math.abs(avg(b) - centre) || a.id.localeCompare(b.id))
    .slice(0, 3)
    .sort((a, b) => avg(a) - avg(b))
    .map((a) => ({ id: a.id, trusted: a.trusted, scores: a.scores, text: a.text }));
  return {
    request_id: `req:${evidenceId}`,
    prompt_version: PROMPT_VERSION,
    task: { id: task.id, version: task.version, genre: task.genre, prompt: task.prompt, min_words: task.min_words, max_words: task.max_words, band_window: task.band_window },
    targets,
    anchors,
    response: { text: scrubIdentifiers(responseText) },
  };
}

/** Fill the versioned prompt template (content/english/prompts/) with a request. */
export function renderPrompt(template: string, request: EvaluationRequest): string {
  return template.replace("{{REQUEST_JSON}}", JSON.stringify(request, null, 2));
}

// ---------------------------------------------------------------- strict proposal schema

const TOP = new Set(["evidence_id", "item", "judgements", "not_observable", "flags", "surprise"]);
const JUDGEMENT = new Set(["capability", "band", "confidence", "criteria", "quotes", "misconceptions", "rationale"]);
const FLAGS = ["off_task", "too_short", "possibly_copied", "safeguarding"] as const;

export type Parsed = { ok: true; proposal: Proposal } | { ok: false; errors: string[] };

export function parseProposal(body: unknown): Parsed {
  const errors: string[] = [];
  const isObj = (x: unknown): x is Record<string, unknown> => !!x && typeof x === "object" && !Array.isArray(x);
  if (!isObj(body)) return { ok: false, errors: ["proposal is not a JSON object"] };
  for (const k of Object.keys(body))
    if (!TOP.has(k)) errors.push(`unexpected field "${k}": an evaluator may only propose observations, not estimates or stages`);
  if (typeof body.evidence_id !== "string") errors.push("evidence_id must be a string");
  const item = body.item;
  if (!isObj(item) || typeof item.id !== "string" || typeof item.version !== "number") errors.push("item must be {id, version}");
  if (!Array.isArray(body.judgements)) errors.push("judgements must be a list");
  const judgements: Judgement[] = [];
  for (const [i, j] of (Array.isArray(body.judgements) ? body.judgements : []).entries()) {
    if (!isObj(j)) {
      errors.push(`judgement ${i} is not an object`);
      continue;
    }
    for (const k of Object.keys(j))
      if (!JUDGEMENT.has(k)) errors.push(`judgement ${i}: unexpected field "${k}": an evaluator may only propose observations, not estimates or stages`);
    if (typeof j.capability !== "string") errors.push(`judgement ${i}: capability must be a string`);
    if (typeof j.band !== "number" || !Number.isFinite(j.band)) errors.push(`judgement ${i}: band must be a number`);
    if (!["high", "medium", "low"].includes(j.confidence as string)) errors.push(`judgement ${i}: confidence must be high, medium or low`);
    if (!Array.isArray(j.quotes) || !j.quotes.every((q) => typeof q === "string")) errors.push(`judgement ${i}: quotes must be a list of strings`);
    if (!Array.isArray(j.misconceptions) || !j.misconceptions.every((q) => typeof q === "string")) errors.push(`judgement ${i}: misconceptions must be a list of strings`);
    if (typeof j.rationale !== "string") errors.push(`judgement ${i}: rationale must be a string`);
    if (j.criteria !== undefined && (!Array.isArray(j.criteria) || !j.criteria.every((c) => isObj(c) && typeof c.id === "string" && typeof c.score === "number" && typeof c.max === "number")))
      errors.push(`judgement ${i}: criteria must be a list of {id, score, max}`);
    judgements.push(j as unknown as Judgement);
  }
  if (!Array.isArray(body.not_observable) || !body.not_observable.every((x) => typeof x === "string")) errors.push("not_observable must be a list of strings");
  const flags = body.flags;
  if (!isObj(flags)) errors.push("flags must be an object");
  else {
    for (const k of Object.keys(flags)) if (!(FLAGS as readonly string[]).includes(k)) errors.push(`flags: unexpected field "${k}"`);
    for (const f of FLAGS) if (typeof flags[f] !== "boolean") errors.push(`flags.${f} must be true or false`);
  }
  if (body.surprise !== undefined && (!isObj(body.surprise) || typeof body.surprise.capability !== "string" || typeof body.surprise.note !== "string"))
    errors.push("surprise must be {capability, note}");
  if (errors.length) return { ok: false, errors };
  return { ok: true, proposal: { ...(body as unknown as Proposal), judgements } };
}
