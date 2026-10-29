/**
 * Reading a learner's response for one question (grading-policy@1): the strict parser applied with the question's answer semantics,
 * and the one "not an answer" result every route returns for it. Used identically by the app (grade.ts decide) and the trusted server
 * grader (server-grader.ts gradeRequest), so both read every response the same way.
 */
import type { Assessment } from "../assessment.ts";
import { ASSESSMENT_CONTRACT, ASSESSMENT_POLICY } from "../assessment.ts";
import { parseResponse, semanticsOf, type ParseResult, type Semantics } from "./parse.ts";
import { examplesFor } from "./syntax.ts";

export type Read = { ok: true; canonical: string; value: string; semantics: Semantics; parse: Extract<ParseResult, { status: "parsed" }> } | { ok: false; semantics: Semantics; parse: Exclude<ParseResult, { status: "parsed" }> };

export function readResponse(q: { type: string; answer: string; options?: readonly string[] | null }, response: string, variable: string | null = null): Read {
  const semantics = { ...semanticsOf(q), variable };
  const parse = parseResponse(semantics, response);
  return parse.status === "parsed" ? { ok: true, canonical: parse.canonical, value: parse.value, semantics, parse } : { ok: false, semantics, parse };
}

/** the decision for a response that is not (yet) an answer: unresolved, no credit, no mastery effect, never an attempt (approved policy P1/P3) */
export function notAnAnswer(r: Extract<Read, { ok: false }>, clarifications = 0): Assessment {
  const ex = examplesFor(r.semantics);
  const amb = r.parse.status === "ambiguous";
  const message = amb
    ? `Your answer can be read two ways: ${r.parse.readings[0]} or ${r.parse.readings[1]}. Add brackets to show which one you mean. It has not been marked wrong.`
    : `Your answer could not be read (${r.parse.detail}). It has not been marked wrong.${ex.length ? ` For example: ${ex.slice(0, 3).join(", ")}.` : ""}`;
  return {
    contract: ASSESSMENT_CONTRACT,
    credit: null,
    evidence: { policy: ASSESSMENT_POLICY, answerCorrect: null, methodExamined: false, derivationVerified: false, firstError: null, clarificationRequired: true, aiFallbackUsed: false, unresolved: true, source: "parser" },
    // one clarification is asked; after it the submission stays pending (and only then may the proposal-only fallback offer a reading)
    feedback: { kind: clarifications ? "pending" : "clarify", message },
    clarification: clarifications ? null : { kind: amb ? "interpretation" : "answer-field", prompt: amb ? `Did you mean ${r.parse.readings[0]} or ${r.parse.readings[1]}?` : `Type just your final answer, for example ${ex[0] ?? "a number"}.` },
    fallbackEligible: clarifications > 0,
    unreadable: { reason: r.parse.status === "ambiguous" ? "ambiguous" : r.parse.reason, detail: r.parse.detail },
    ms: 0,
  };
}
