/**
 * Essay evaluators that need no network: a fixture replayer (tests) and a small pattern evaluator (demos).
 *
 * A live LLM evaluator is any object implementing EssayEvaluator; its raw output goes through the same
 * validation as these. Nothing here names a provider.
 */
import type { EssayEvaluator, ObservationOutput, ObservationRequest, ObserveProtocol, QuestionRequest, QuestionsProtocol, RewriteProtocol, RewriteRequest } from "./contract.ts";
import { essaySentences } from "./text.ts";

/**
 * Replays recorded outputs: observations keyed by essay id, rewrite judgements keyed by rewrite id. A missing
 * recording throws, so a test never passes on an empty answer by accident.
 */
export function fixtureEssayEvaluator(o: { id: string; version: string; observations?: Record<string, unknown>; rewrites?: Record<string, unknown> }): EssayEvaluator {
  return {
    id: o.id,
    version: o.version,
    model: "fixture",
    async observe(req: ObservationRequest) {
      if (!o.observations || !(req.essay.id in o.observations)) throw new Error(`no recorded analysis for essay ${req.essay.id}`);
      return structuredClone(o.observations[req.essay.id]);
    },
    async rewrite(req: RewriteRequest) {
      if (!o.rewrites || !(req.rewrite.id in o.rewrites)) throw new Error(`no recorded judgement for rewrite ${req.rewrite.id}`);
      return structuredClone(o.rewrites[req.rewrite.id]);
    },
  };
}

/** A few unambiguous error patterns, each with the competency and misconception it shows. */
const PATTERNS: { re: RegExp; competency: string; misconception?: string; correction: (m: RegExpMatchArray) => string; note: string }[] = [
  { re: /\b(he|she|it|my (?:friend|father|mother|teacher|school|brother|sister))\s+(go|do|have|like|want|play|say|make|come|live|need)\b/gi, competency: "EN.GRM.VERB.sva", misconception: "third_person_s", correction: (m) => `${m[1]} ${m[2] === "have" ? "has" : m[2] === "do" ? "does" : m[2] === "go" ? "goes" : `${m[2]}s`}`, note: "A singular subject needs the -s form of the verb." },
  { re: /\b(depend|depends|depended) of\b/gi, competency: "EN.GRM.PREP.dependent", correction: (m) => `${m[1]} on`, note: "'Depend' is followed by 'on'." },
  { re: /\b(discuss|discussed|discussing) about\b/gi, competency: "EN.GRM.PREP.dependent", correction: (m) => m[1], note: "'Discuss' takes no preposition." },
  { re: /\b(good|bad) in\b/gi, competency: "EN.GRM.PREP.dependent", correction: (m) => `${m[1]} at`, note: "We are good or bad 'at' something." },
  { re: /\b(on|at) (morning|evening|afternoon)\b/gi, competency: "EN.GRM.PREP.time_place", misconception: "in_on_at_confusion", correction: (m) => `in the ${m[2]}`, note: "Parts of the day take 'in the'." },
  { re: /\bin (monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/gi, competency: "EN.GRM.PREP.time_place", misconception: "in_on_at_confusion", correction: (m) => `on ${m[1]}`, note: "Days take 'on'." },
  { re: /\ba (apple|orange|hour|honest|umbrella|elephant|idea|example)\b/gi, competency: "EN.GRM.NOUN.articles", misconception: "a_an_sound", correction: (m) => `an ${m[1]}`, note: "'An' comes before a vowel sound." },
  { re: /\b(in order to|due to the fact that|at this point in time|each and every)\b/gi, competency: "EN.SEN.PRE.concision", correction: (m) => ({ "in order to": "to", "due to the fact that": "because", "at this point in time": "now", "each and every": "every" })[m[1].toLowerCase()] ?? m[1], note: "A shorter phrase says the same." },
];

const STRENGTHS: { re: RegExp; competency: string; note: string }[] = [
  { re: /\b(however|therefore|for example|as a result|in addition)\b/gi, competency: "EN.SEN.COH.connectives", note: "A connective that shows how ideas relate." },
];

/**
 * A deterministic stand-in that spots a handful of fixed patterns. It is for demonstrations and UI work
 * without an LLM: it misses most errors and is not an assessment.
 */
export function patternEssayEvaluator(version = "patterns@0"): EssayEvaluator {
  return {
    id: "openpath-patterns",
    version,
    model: "rules",
    async observe(req: ObservationRequest): Promise<ObservationOutput> {
      const allowed = new Set(req.competencies.map((c) => c.id));
      const out: ObservationOutput = { essay_id: req.essay.id, observations: [], not_observable: [] };
      for (const s of essaySentences(req.essay.text)) {
        for (const p of PATTERNS) {
          if (!allowed.has(p.competency)) continue;
          for (const m of s.matchAll(p.re))
            out.observations.push({ competency: p.competency, kind: "error", quote: m[0], correction: p.correction(m), ...(p.misconception ? { misconception: p.misconception } : {}), confidence: "high", note: p.note });
        }
        for (const p of STRENGTHS) {
          if (!allowed.has(p.competency)) continue;
          for (const m of s.matchAll(p.re)) out.observations.push({ competency: p.competency, kind: "strength", quote: m[0], confidence: "medium", note: p.note });
        }
      }
      out.observations = out.observations.slice(0, req.max_observations);
      return out;
    },
    async rewrite(req: RewriteRequest) {
      throw new Error(`the pattern evaluator cannot judge rewrites (${req.rewrite.id}); use an LLM or a person`);
    },
  };
}

/** What the server says about its essay evaluator (GET …/essays/status). */
export interface EssayGatewayInfo {
  available: boolean;
  id: string;
  version: string;
  model: string;
  rubric: string;
  /** questions: present when the server can also write diagnostic questions (essay-questions.v1). */
  protocols: { observe: ObserveProtocol; rewrite: RewriteProtocol; questions?: QuestionsProtocol };
}

/**
 * An evaluator behind OpenPath's server (backend/evaluation/essay.py), which holds the provider credentials:
 * the browser never calls a model provider. `post` sends one request to the server and returns its JSON reply
 * ({ output, evaluator }). The reply is checked against the configuration the server advertised; any mismatch
 * or failure throws, and the caller records a rejected analysis (nothing is guessed). Validation of the output
 * itself happens afterwards, in OpenPath, exactly as for any other evaluator.
 */
export type GatewayTask = "observe" | "rewrite" | "questions";

export function gatewayEssayEvaluator(o: { info: EssayGatewayInfo; post: (body: { task: GatewayTask; request: unknown; data_use: "synthetic_test" }) => Promise<unknown> }): EssayEvaluator {
  const call = async (task: GatewayTask, request: unknown) => {
    const reply = (await o.post({ task, request, data_use: "synthetic_test" })) as { output?: unknown; evaluator?: Partial<EssayGatewayInfo> & { protocol?: string } } | null;
    if (!reply || typeof reply !== "object" || !("output" in reply)) throw new Error("the essay evaluator gave no output");
    const e = reply.evaluator ?? {};
    const expected = task === "observe" ? o.info.protocols.observe : task === "rewrite" ? o.info.protocols.rewrite : o.info.protocols.questions;
    if (e.id !== o.info.id || e.version !== o.info.version || e.model !== o.info.model || e.rubric !== o.info.rubric || e.protocol !== expected)
      throw new Error("the essay evaluator answered with a different configuration than it advertised");
    return reply.output;
  };
  return {
    id: o.info.id,
    version: o.info.version,
    model: o.info.model,
    protocols: o.info.protocols,
    observe: (req: ObservationRequest) => call("observe", req),
    rewrite: (req: RewriteRequest) => call("rewrite", req),
    ...(o.info.protocols.questions ? { questions: (req: QuestionRequest) => call("questions", req) } : {}),
  };
}
