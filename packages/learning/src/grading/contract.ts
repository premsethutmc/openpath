/**
 * The assessment contract openpath-assessment@2 (UNIFIED_GRADING_ARCHITECTURE.md §3), built from the trusted question definition:
 * the generator's structured parameters and declared rules, never a learner's text. It wraps contract@1 (assessment.ts, the
 * independent kernel validation) and adds what a decision needs: the answer semantics, the expected value as the parser reads it,
 * the variable, the declared and stated form rules, the key authority and the question's status. contractHash identifies it exactly.
 */
import { contractFor, legacyContract, type AssessmentContract } from "../assessment.ts";
import { question } from "../content.ts";
import { problemOf } from "../families.ts";
import { sha256Hex } from "../digest.ts";
import { quarantined } from "../question-status.ts";
import { formCertified } from "./certify.ts";
import { declaredRules, FORM_INSTRUCTIONS, FORM_RULES_HASH, judgeForm, MIXED_PERMITTED, statedRules, type FormRule, type FormRuleId } from "./forms.ts";
import { parseResponse, semanticsOf, PARSER_VERSION, type ParseResult, type Semantics } from "./parse.ts";
import type { Assessment } from "../assessment.ts";

export const CONTRACT_SCHEMA = "openpath-assessment@2" as const;
export const CONTRACT_BUILDER = { id: "contract-builder", version: "2.0.0" } as const;
export type QuestionStatus = "certified" | "provisional" | "quarantined" | "educator";

export interface ContractV2 {
  schema: typeof CONTRACT_SCHEMA;
  questionId: string;
  contractHash: string;
  builder: typeof CONTRACT_BUILDER;
  parser: typeof PARSER_VERSION;
  formRulesHash: string;
  source: { kind: "generator" | "authored"; family: string | null; params: number[] | null };
  semantics: Semantics;
  expected: { stored: string; canonical: string | null; value: string | null };
  domain: { variable: string | null; assumptions: string[] };
  form: FormRule[];
  /** rules the question states that cannot be judged for this kind of answer: an otherwise correct answer is unresolved */
  undeterminable: FormRuleId[];
  mode: "answer-only" | "method-required" | "educator";
  keyAuthority: "independent-kernel" | "generator-only" | "educator";
  status: QuestionStatus;
  /** contract inconsistencies found while building (the question is quarantined by scripts/question-status.ts) */
  inconsistencies: string[];
  v1: { verification: AssessmentContract["verification"]; capability: AssessmentContract["capability"]; reason: string };
}

const cache = new Map<string, ContractV2>();
export function contractV2(qid: string): ContractV2 {
  const hit = cache.get(qid);
  if (hit) return hit;
  const q = question(qid), pr = problemOf(qid);
  const v1 = contractFor(qid) ?? legacyContract(q);
  const base = semanticsOf({ type: q.type, answer: q.answer, options: q.options });
  const mixed = base.mixed || ((base.kind === "rational" || base.kind === "exact-real") && MIXED_PERMITTED.test(q.prompt));
  const semantics: Semantics = { ...base, mixed, variable: v1.variable };
  const stated = statedRules(q.prompt, semantics.kind);
  const family = pr?.family ?? null, declared = declaredRules(family);
  const inconsistencies: string[] = [];
  const form: FormRule[] = [], undeterminable: FormRuleId[] = [];
  for (const s of stated) {
    if (!declared.includes(s.rule)) { inconsistencies.push(`the question states "${s.instruction}" but family ${family ?? "(authored)"} declares no ${s.rule} rule`); continue; }
    if (s.judgeable) form.push({ rule: s.rule, instruction: s.instruction }); else undeterminable.push(s.rule);
  }
  // form@1: the generator's own structured flag
  if (q.expanded && !form.some((f) => f.rule === "expanded")) form.push({ rule: "expanded", instruction: "expand (form@1)" });
  let canonical: string | null = null, value: string | null = null;
  if (q.type !== "written") {
    const p = parseResponse(semantics, q.answer);
    if (p.status === "parsed") {
      canonical = p.canonical; value = p.value;
      for (const f of form) if (judgeForm(f.rule, semantics.kind, p) === "violated") inconsistencies.push(`the stored answer "${q.answer}" does not satisfy its own form rule ${f.rule}`);
    } else inconsistencies.push(`the stored answer "${q.answer}" is not read by the strict parser (${p.status === "ambiguous" ? "ambiguous" : p.reason})`);
  }
  // status is the question's standing (registry facts), not part of what the contract means: it is kept out of the contract hash
  const status: QuestionStatus = quarantined(qid) ? "quarantined" : q.type === "written" ? "educator" : formCertified(qid) ? "certified" : "provisional";
  const body = {
    schema: CONTRACT_SCHEMA, questionId: qid, builder: CONTRACT_BUILDER, parser: PARSER_VERSION, formRulesHash: FORM_RULES_HASH,
    source: { kind: pr ? ("generator" as const) : ("authored" as const), family, params: pr?.params ?? null },
    semantics, expected: { stored: q.answer, canonical, value }, domain: { variable: v1.variable, assumptions: v1.assumptions },
    form, undeterminable, mode: q.type === "written" ? ("educator" as const) : ("answer-only" as const),
    keyAuthority: v1.verification === "verified" ? ("independent-kernel" as const) : q.type === "written" ? ("educator" as const) : ("generator-only" as const),
    inconsistencies, v1: { verification: v1.verification, capability: v1.capability, reason: v1.reason },
  };
  const c: ContractV2 = { ...body, status, contractHash: sha256Hex(JSON.stringify(body)) };
  cache.set(qid, c);
  return c;
}

/**
 * Required forms (approved policy P2), applied after the value has been judged equal: a violated rule makes the answer incorrect with
 * reason required-form (the feedback names the instruction); a rule that cannot be judged leaves it unresolved. An answer that is not
 * equal in value is not touched, and no rule ever turns an incorrect value into a correct one.
 */
export function applyForms(c: ContractV2, parsed: Extract<ParseResult, { status: "parsed" }>, a: Assessment): Assessment {
  if (a.credit !== true || (!c.form.length && !c.undeterminable.length)) return a;
  if (c.undeterminable.length) return { ...a, credit: null, evidence: { ...a.evidence, answerCorrect: null, unresolved: true }, feedback: { kind: "pending", message: "Your answer is saved. The form this question asks for cannot be checked automatically, so it has not been marked." }, form: { rule: c.undeterminable[0], result: "undeterminable" } };
  for (const f of c.form) {
    const r = judgeForm(f.rule, c.semantics.kind, parsed);
    if (r === "violated") return { ...a, credit: false, evidence: { ...a.evidence, answerCorrect: false }, feedback: { kind: "incorrect", message: `The value is right, but the question asks for the answer ${SAYS[f.rule]} ("${f.instruction}").` }, clarification: null, recordAs: undefined, form: { rule: f.rule, result: "violated" } };
    if (r === "undeterminable") return { ...a, credit: null, evidence: { ...a.evidence, answerCorrect: null, unresolved: true }, feedback: { kind: "pending", message: "Your answer is saved. Its form could not be checked automatically, so it has not been marked." }, form: { rule: f.rule, result: "undeterminable" } };
  }
  return { ...a, form: { rule: c.form.map((f) => f.rule).join(","), result: "satisfied" } };
}
const SAYS = Object.fromEntries(FORM_INSTRUCTIONS.map((f) => [f.rule, f.says])) as Record<FormRuleId, string>;
