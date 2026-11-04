/**
 * Bounded AI fallback — INTERFACE ONLY. Nothing here opens a network connection, holds a key or names a paid provider as a dependency.
 *
 *  - The default configuration is disabled (`provider: "none"`). A real provider is an adapter that implements FallbackProvider and is supplied by the host after the design and
 *    cost have been approved; `createProvider` refuses every provider but the in-process `none` and `fixture` ones.
 *  - A submission is eligible only when it is still undecided AFTER the one student clarification (assessment.fallbackEligible) and a request budget allows it.
 *  - A provider may PROPOSE (interpretation / candidate solution / error source / explanation). It never grades: `settle` can attach a proposal as evidence
 *    (aiFallbackUsed) and can confirm an explanation of an error the kernel already confirmed, but credit is only ever what the deterministic assessment decided.
 *    A proposed reading of the student's input is only an offer: the student confirms it ("Did you mean x = 4?") and the confirmed answer is graded by the kernel.
 * The provider settings mirror the existing essay client (backend/evaluation/llm.py: OPENPATH_LLM_*) so one operator-side configuration serves both.
 */
import { answerText, assessSubmission, type Assessment, type AssessmentContract } from "./assessment.ts";

export interface FallbackConfig {
  provider: "none" | "fixture" | "anthropic" | "openai_compatible";
  model: string;
  /** hard ceilings; a request that would exceed any of them is not made */
  maxRequestsPerMonth: number;
  maxRequestsPerLearnerPerDay: number;
  maxSpendPerMonthUsd: number;
  maxInputTokens: number;
  maxOutputTokens: number;
  /** USD per million tokens, supplied by the operator from the provider's current price list (no default price is assumed to be right) */
  priceInPerMTok: number;
  priceOutPerMTok: number;
}
export const FALLBACK_DISABLED: FallbackConfig = { provider: "none", model: "", maxRequestsPerMonth: 0, maxRequestsPerLearnerPerDay: 0, maxSpendPerMonthUsd: 0, maxInputTokens: 600, maxOutputTokens: 250, priceInPerMTok: 0, priceOutPerMTok: 0 };

/** Environment-style loader (same names as backend/evaluation/llm.py plus the budget). Unset or invalid → disabled. */
export function fallbackConfigFrom(env: Record<string, string | undefined>): FallbackConfig {
  const n = (k: string, d: number) => { const v = Number(env[k]); return Number.isFinite(v) && v >= 0 ? v : d; };
  const provider = env.OPENPATH_FALLBACK_PROVIDER as FallbackConfig["provider"] | undefined;
  if (!provider || !["fixture", "anthropic", "openai_compatible"].includes(provider)) return FALLBACK_DISABLED;
  return { provider, model: env.OPENPATH_LLM_MODEL ?? "", maxRequestsPerMonth: n("OPENPATH_FALLBACK_MAX_REQUESTS_MONTH", 0), maxRequestsPerLearnerPerDay: n("OPENPATH_FALLBACK_MAX_PER_LEARNER_DAY", 2), maxSpendPerMonthUsd: n("OPENPATH_FALLBACK_MAX_USD_MONTH", 0), maxInputTokens: n("OPENPATH_FALLBACK_MAX_INPUT_TOKENS", 600), maxOutputTokens: n("OPENPATH_LLM_MAX_OUTPUT_TOKENS", 250), priceInPerMTok: n("OPENPATH_FALLBACK_PRICE_IN_PER_MTOK", 0), priceOutPerMTok: n("OPENPATH_FALLBACK_PRICE_OUT_PER_MTOK", 0) };
}

/** What would be sent: the problem and the student's own text only — no identity, no history, no other answers. */
export interface FallbackRequest { task: "interpret" | "candidate-solution" | "error-source" | "explain"; statement: string; studentAnswer: string; studentWorking: string[]; knownError?: string }
export type FallbackProposal =
  | { kind: "interpretation"; reading: string }
  | { kind: "candidate-solution"; answer: string }
  | { kind: "error-source"; line: number; text: string }
  | { kind: "explanation"; text: string };
export interface FallbackProvider { id: string; propose(req: FallbackRequest, limits: { maxOutputTokens: number }): Promise<FallbackProposal[]> }

/** Rough token count (4 characters per token, plus the fixed instruction) — an estimate for budgeting, not a billing figure. */
export const INSTRUCTION_TOKENS = 220;
export const estimateTokens = (req: FallbackRequest) => Math.ceil((req.statement.length + req.studentAnswer.length + req.studentWorking.join("\n").length + (req.knownError?.length ?? 0)) / 4) + INSTRUCTION_TOKENS;
export const costUsd = (cfg: FallbackConfig, inTok: number, outTok: number) => (inTok * cfg.priceInPerMTok + outTok * cfg.priceOutPerMTok) / 1e6;

export interface Usage { requestsThisMonth: number; spendThisMonthUsd: number; learnerRequestsToday: number }
export type Plan = { allowed: true; request: FallbackRequest; estimate: { inputTokens: number; outputTokens: number; usd: number } } | { allowed: false; reason: string };
export function planFallback(cfg: FallbackConfig, usage: Usage, contract: AssessmentContract, a: Assessment, sub: { response: string; working?: readonly string[] }): Plan {
  if (cfg.provider === "none") return { allowed: false, reason: "fallback disabled" };
  if (!a.fallbackEligible) return { allowed: false, reason: a.credit !== null ? "already decided deterministically" : "the student clarification has not been offered yet" };
  if (!contract.problem || contract.problem.domain === "typed") return { allowed: false, reason: "no checkable statement for this question" };
  const req: FallbackRequest = { task: a.evidence.firstError ? "explain" : "interpret", statement: contract.problem.statement, studentAnswer: sub.response.slice(0, 300), studentWorking: (sub.working ?? []).slice(0, 8).map((l) => l.slice(0, 80)) };
  const inputTokens = estimateTokens(req);
  if (inputTokens > cfg.maxInputTokens) return { allowed: false, reason: "request larger than the input ceiling" };
  const usd = costUsd(cfg, inputTokens, cfg.maxOutputTokens);
  if (usage.requestsThisMonth >= cfg.maxRequestsPerMonth) return { allowed: false, reason: "monthly request budget spent" };
  if (usage.learnerRequestsToday >= cfg.maxRequestsPerLearnerPerDay) return { allowed: false, reason: "this learner's daily fallback limit reached" };
  if (usage.spendThisMonthUsd + usd > cfg.maxSpendPerMonthUsd) return { allowed: false, reason: "monthly spend ceiling would be exceeded" };
  return { allowed: true, request: req, estimate: { inputTokens, outputTokens: cfg.maxOutputTokens, usd } };
}

/** Only an in-process provider can be created here; an adapter for a paid service is supplied by the host once approved. */
export function createProvider(cfg: FallbackConfig, fixture?: FallbackProvider): FallbackProvider | null {
  if (cfg.provider === "none") return null;
  if (cfg.provider === "fixture" && fixture) return fixture;
  throw new Error(`provider "${cfg.provider}" is not activated: no network provider is wired in this build`);
}

export interface Settled { assessment: Assessment; usable: FallbackProposal[]; discarded: { proposal: FallbackProposal; why: string }[]; confirmation: null | { prompt: string; answer: string } }
/**
 * Re-check every proposal with the deterministic assessment before it is used. The credit of the returned assessment is the deterministic one, always.
 *  interpretation / candidate-solution → never adopted directly; if it reads as a plain answer it becomes a one-line confirmation for the student
 *  error-source / explanation          → usable only if it names the first error the kernel already confirmed (otherwise discarded)
 */
export function settle(contract: AssessmentContract, a: Assessment, proposals: FallbackProposal[]): Settled {
  const usable: FallbackProposal[] = [], discarded: Settled["discarded"] = []; let confirmation: Settled["confirmation"] = null;
  for (const p of proposals) {
    if (p.kind === "interpretation" || p.kind === "candidate-solution") {
      const text = p.kind === "interpretation" ? p.reading : p.answer, r = contract.kind && contract.kind !== "typed" && contract.verification === "verified" ? answerText(contract.kind, contract.variable, text) : null;
      if (!r || !r.ok) { discarded.push({ proposal: p, why: "not a plain answer the checker can read" }); continue; }
      if (!confirmation) confirmation = { prompt: `Did you mean ${r.text.replace(/ or /g, " and ")}?`, answer: r.values.join(", ") };
      usable.push(p);
    } else if (p.kind === "error-source") {
      const fe = a.evidence.firstError;
      if (fe && p.line === fe.transition) usable.push(p); else discarded.push({ proposal: p, why: "no deterministic error confirmed at that line" });
    } else if (a.evidence.firstError) usable.push(p); else discarded.push({ proposal: p, why: "nothing verified to explain" });
  }
  return { assessment: { ...a, evidence: { ...a.evidence, aiFallbackUsed: true } }, usable, discarded, confirmation };
}
/** The student's yes: the confirmed answer is submitted again and decided by the kernel like any other (one clarification already spent). */
export function confirmedResubmission(contract: AssessmentContract, s: Settled, working?: readonly string[]): Assessment | null {
  if (!s.confirmation) return null;
  const r = assessSubmission(contract, { response: s.confirmation.answer, working, clarifications: 1 });
  return { ...r, evidence: { ...r.evidence, aiFallbackUsed: true } };
}
