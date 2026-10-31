/**
 * Assessment contract and authoritative submission decision.
 *
 *  contractFor(id)   builds the structured contract of a generated question and VALIDATES it with the independent exact checker before it may be used:
 *                    the generator's answer is never authoritative on its own. verified = the checker reproduces the expected answer from the statement and credits no
 *                    known wrong answer; held = it disagrees (the question must not be published); legacy = no independent kernel exists for the family (the generator's
 *                    answer is still the only authority — reported, not hidden); human = marked by an educator.
 *  assessSubmission  the one decision every grading route must use. The explicit answer (the answer field, `response`) is graded first; working is only read when the answer is
 *                    not correct. Unresolved is a state of its own: no credit decision, no mastery effect, never "incorrect".
 * No parser, solver or CAS is added here: the exact kernels in independent-checker.ts do the mathematics through assessAnswerFirst.
 */
import { assessAnswerFirst, type AnswerFirstAssessment } from "./answer-first.ts";
import { FAMILIES, problemOf } from "./families.ts";
import type { GeneratorContract, Problem } from "./family-kit.ts";
import type { AnswerType } from "./answer-types.ts";
import { judgeTyped, objectValues, shownValues, typedCapability, type TypedObject } from "./typed-contract.ts";

export const ASSESSMENT_CONTRACT = "openpath-assessment@1" as const;
export const ASSESSMENT_POLICY = "assessment@1" as const;
export type AssessmentMode = "answer-only" | "method-required" | "proof-required";
export type Verification = "verified" | "legacy" | "held" | "human";

export interface AssessmentContract {
  contract: typeof ASSESSMENT_CONTRACT;
  questionId: string;
  prompt: string;
  /** the statement handed to the exact checker (null: no independent kernel for this family) */
  problem: { domain: "algebra"; statement: string } | { domain: "typed"; object: TypedObject } | null;
  answerType: AnswerType;
  /** the expected answer as the question stores it, and in the form the student is shown */
  expected: { stored: string; display: string; values: string[] };
  variable: string | null;
  assumptions: string[];
  mode: AssessmentMode;
  capability: "exact-solution-set" | "exact-arithmetic" | "typed-kernel" | "educator" | "none";
  /** how the checker reads answers: a value, the solution of an equation, or all its solutions (null: no kernel) */
  kind?: GeneratorContract["kind"] | null;
  reference: { steps: string[]; evidence: string };
  verification: Verification;
  reason: string;
  /** candidates checked during validation (all must be judged not-correct) */
  checkedWrong: string[];
}

type Shape = { kind: GeneratorContract["kind"]; variable: string | null; assumptions: string[]; statement: string; numbers: number[] | null; typed?: TypedObject };
const sg = (n: number) => (n < 0 ? "-" : "+");
/** display glyphs a generator may use in its statement; the checker reads plain ASCII */
const ascii = (s: string) => s.replace(/[−–]/g, "-").replace(/×/g, "*").replace(/÷/g, "/");
/** the generator-owned contract of a family, applied to one set of parameters (null: the family has none, or none for this question) */
function shapeOfProblem(pr: Problem): Shape | null {
  const c = FAMILIES.get(pr.family)?.contract;
  if (!c) return null;
  if (c.kind === "typed") { const object = c.typed?.(pr.params) ?? null; return object ? { kind: "typed", variable: null, assumptions: [], statement: "", numbers: c.numbers ? c.numbers(pr.params) : null, typed: object } : null; }
  const raw = c.statement?.(pr.params);
  if (!raw) return null;
  return { kind: c.kind, variable: c.variable ?? (c.kind === "value" ? null : "x"), assumptions: c.assumptions ?? [], statement: ascii(raw), numbers: c.numbers ? c.numbers(pr.params) : null };
}
const SUPER: Record<string, string> = { "⁰": "0", "¹": "1", "²": "2", "³": "3", "⁴": "4", "⁵": "5", "⁶": "6", "⁷": "7", "⁸": "8", "⁹": "9" };
const digitsOf = (s: string) => (s.replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]/g, (c) => ` ${SUPER[c]} `).match(/\d+/g) ?? []).map(Number);

const NUM = String.raw`[+-]?(?:\d+(?:\.\d+)?|\.\d+)(?:\/\d+)?`;
const clean = (s: string) => s.replace(/[−–—]/g, "-").replace(/\s+/g, " ").trim().replace(/[.。]$/, "");
export type AnswerText = { ok: true; text: string; values: string[] } | { ok: false; why: string };
/** the final answer as a statement the checker reads ("x = 2 or x = 3", "56"); anything that is not plainly numbers is NOT guessed at */
export function answerText(kind: Shape["kind"], variable: string | null, raw: string): AnswerText {
  const s = clean(raw);
  if (!s) return { ok: false, why: "empty" };
  const one = (t: string) => { const m = t.trim().match(new RegExp(`^(?:${variable ?? "[a-z]"}\\s*=\\s*|=\\s*)?(${NUM})$`, "i")); return m ? m[1].replace(/^\+/, "").replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, "") : null; };
  if (kind === "set") {
    const parts = s.replace(/^\{|\}$/g, "").split(/\s*(?:,|;|\band\b|\bor\b)\s*/i).filter(Boolean);
    const vals = parts.map(one);
    if (!parts.length || vals.some((v) => v === null)) return { ok: false, why: "not a list of numbers" };
    const u = [...new Set(vals as string[])];
    return { ok: true, values: u, text: u.map((v) => `${variable} = ${v}`).join(" or ") };
  }
  const v = one(s);
  if (v === null) return { ok: false, why: "not a number" };
  return { ok: true, values: [v], text: kind === "var" ? `${variable} = ${v}` : v };
}
const list = (v: unknown): string[] => (Array.isArray(v) ? v.map(String) : [String(v)]);
const fmtSteps = (pr: Problem) => pr.steps.map((s) => `${s.op}(${s.inputs.join(", ")}) = ${Array.isArray(s.value) ? s.value.join(", ") : s.value}`);

const kernel = (_kind: GeneratorContract["kind"], statement: string, answer: AnswerText, working?: string[]) =>
  answer.ok ? assessAnswerFirst({ domain: "algebra", statement }, working?.length ? { format: "natural", text: working.join("\n") } : null, { finalAnswer: answer.text }) : null;

/** The expected answer's display value(s) (a choice question stores a letter: its option text is the answer) */
function expectedOf(pr: Problem): { display: string; values: string[] } | null {
  if (pr.type === "choice") { const i = pr.answer.toUpperCase().charCodeAt(0) - 65; const o = pr.options?.[i]; return o === undefined ? null : { display: o, values: [o] }; }
  return { display: pr.answer, values: pr.answer.split(/\s*,\s*/).filter(Boolean) };
}

/** candidate wrong answers: the family's own predicted mal-rule answers and, for a choice, the other options */
function wrongCandidates(pr: Problem, exp: string[]): string[] {
  const out = new Set<string>();
  const sameSet = (a: string[], b: string[]) => a.length === b.length && a.every((x) => b.includes(x));
  for (const b of pr.bugs) { if (b.predict === null) continue; const v = list(b.predict); if (!sameSet(v, exp)) out.add(v.join(", ")); }
  if (pr.type === "choice") (pr.options ?? []).forEach((o) => { if (o !== exp[0]) out.add(o); });
  if (exp.length > 1) exp.forEach((_, i) => out.add(exp.filter((__, j) => j !== i).join(", "))); // one root of two
  return [...out];
}

export const contractFor = (questionId: string): AssessmentContract | null => { const pr = problemOf(questionId); return pr ? contractOfProblem(pr, questionId) : null; };
/** validates any problem object (also a deliberately corrupted one: a generator defect must come out "held") */
export function contractOfProblem(pr: Problem, questionId: string): AssessmentContract {
  const exp = expectedOf(pr);
  const base = { contract: ASSESSMENT_CONTRACT, questionId, prompt: pr.prompt, answerType: pr.type, mode: "answer-only" as AssessmentMode, reference: { steps: fmtSteps(pr), evidence: "generator worked solution (not independent)" }, checkedWrong: [] as string[] };
  if (pr.type === "written") return { ...base, problem: null, expected: { stored: pr.answer, display: pr.answer, values: [] }, variable: null, assumptions: [], mode: "method-required", capability: "educator", verification: "human", reason: "written answers are marked by an educator" };
  if (!exp) return { ...base, problem: null, expected: { stored: pr.answer, display: pr.answer, values: [] }, variable: null, assumptions: [], capability: "none", verification: "held", reason: "the stored choice does not name an option" };
  const expected = { stored: pr.answer, ...exp };
  const shape = shapeOfProblem(pr);
  if (!shape) return { ...base, problem: null, expected, variable: null, assumptions: [], capability: "none", verification: "legacy", reason: FAMILIES.get(pr.family)?.contract ? `family ${pr.family} gives no statement for these parameters; the generator's answer is the only authority` : `no generator contract for family ${pr.family}; the generator's answer is the only authority` };
  if (shape.typed) return typedContract(pr, base, expected, exp, shape.typed, shape.numbers);
  const statement = shape.statement, problem = { domain: "algebra" as const, statement };
  const held = (reason: string, wrong: string[] = []): AssessmentContract => ({ ...base, problem, expected, variable: shape.variable, assumptions: shape.assumptions, kind: shape.kind, capability: shape.kind === "value" ? "exact-arithmetic" : "exact-solution-set", verification: "held", reason, checkedWrong: wrong });
  // the statement must be the one the student is shown: every number in it appears in the prompt (commas inside a number, as in 1,23,456, are grouping)
  const shown = digitsOf(pr.prompt.replace(/(\d),(?=\d)/g, "$1")), need = (shape.numbers ?? digitsOf(statement.replace(/\^\d+/g, "")).filter((n) => n !== 0)).map(Math.abs);
  const pool = [...shown];
  for (const n of need) { if (n === 1) continue; /* an implicit coefficient 1 is not written */ const i = pool.indexOf(n); if (i < 0) return held(`the independent statement ${statement} uses ${n}, which the prompt does not show`); pool.splice(i, 1); }
  const good = answerText(shape.kind, shape.variable, exp.display);
  // a rule never makes a question worse than before: a stored answer it cannot read as a plain number keeps the legacy comparison
  if (!good.ok) return { ...base, problem: null, expected, variable: null, assumptions: [], capability: "none", verification: "legacy", reason: `stored answer "${exp.display}" is not a plain number or list of numbers; legacy comparison kept` };
  const r = kernel(shape.kind, statement, good);
  // the checker cannot read/handle the statement: nothing is established either way, so the question keeps the legacy comparison (held is only for a genuine disagreement)
  if (!r || r.answer.credit === null) return { ...base, problem: null, expected, variable: null, assumptions: [], capability: "none", verification: "legacy", reason: `the exact checker cannot handle ${statement} (${r?.answer.reason ?? "unreadable"}); legacy comparison kept` };
  if (r.answer.credit !== true) return held(`the independent checker does not confirm the stored answer: ${r?.answer.reason ?? "unreadable"}`);
  const wrong = wrongCandidates(pr, exp.values), judged: string[] = [];
  for (const w of wrong) {
    const a = answerText(shape.kind, shape.variable, w);
    if (!a.ok) continue; // not a readable numeric answer: cannot be credited either
    const rr = kernel(shape.kind, statement, a);
    if (rr?.answer.credit === true) return held(`the independent checker also credits the known wrong answer "${w}"`, judged);
    judged.push(w);
  }
  return { ...base, problem, expected, variable: shape.variable, assumptions: shape.assumptions, kind: shape.kind, capability: shape.kind === "value" ? "exact-arithmetic" : "exact-solution-set", verification: "verified", reason: "independent exact checker reproduces the expected answer and credits no known wrong answer", reference: { steps: base.reference.steps, evidence: `exact checker: ${good.text} confirmed for ${statement}` }, checkedWrong: judged };
}
/** the typed-kernel route: the kernel computes the expected value from the generator's object, must reproduce the stored answer, and must not credit a known wrong answer */
function typedContract(pr: Problem, base: Omit<AssessmentContract, "problem" | "expected" | "variable" | "assumptions" | "capability" | "verification" | "reason">, expected: AssessmentContract["expected"], exp: { display: string; values: string[] }, object: TypedObject, numbers: number[] | null): AssessmentContract {
  const id = typedCapability(object).id, mk = (verification: Verification, reason: string, checkedWrong: string[] = []): AssessmentContract =>
    ({ ...base, problem: verification === "legacy" ? null : { domain: "typed", object }, expected, variable: null, assumptions: [], kind: verification === "legacy" ? null : "typed", capability: verification === "legacy" ? "none" : "typed-kernel", verification, reason, checkedWrong });
  // the object must be the one the student is shown: every number it carries (other than 0 and 1) appears in the prompt
  const shown = shownValues(`${pr.prompt} ${pr.figure ? JSON.stringify(pr.figure).replace(/,/g, " ") : ""}`);
  const missing = numbers ? numbers.map(Math.abs).filter((n) => n > 1).map(String).find((n) => !shown.has(n)) : objectValues(object).find((n) => !shown.has(n));
  if (missing !== undefined) return mk("held", `the typed object uses ${missing}, which the prompt does not show`);
  const v = judgeTyped(object, exp.display);
  if (v === "unread") return mk("legacy", `stored answer "${exp.display}" is not in a form the ${id} reader accepts; legacy comparison kept`);
  if (v === "unsupported") return mk("legacy", `the ${id} kernel cannot judge this object (unsupported); legacy comparison kept`);
  if (v !== "verified") return mk("held", `the ${id} kernel does not confirm the stored answer`);
  const judged: string[] = [];
  for (const w of wrongCandidates(pr, exp.values)) {
    const wv = judgeTyped(object, w);
    if (wv === "unread") continue;
    if (wv === "verified") return mk("held", `the ${id} kernel also credits the known wrong answer "${w}"`, judged);
    judged.push(w);
  }
  return { ...mk("verified", `the ${id} kernel reproduces the expected answer from the generator's object and credits no known wrong answer`, judged), reference: { steps: fmtSteps(pr), evidence: `typed ${id} kernel (independent exact computation)` } };
}
/** an authored (non-generated) question: no independent kernel, so the stored answer is the only authority (reported as legacy), or an educator marks it */
/** D1: an authored question that states its task (Question.statement, one unknown) names that unknown, so "x = 5" reads as the answer 5; no other change */
const statedVariable = (q: { statement?: string }) => { const vs = [...new Set(q.statement?.match(/[a-z]/gi) ?? [])]; return vs.length === 1 ? vs[0] : null; };
export const legacyContract = (q: { id: string; type: AnswerType; answer: string; prompt: string; statement?: string }): AssessmentContract =>
  ({ contract: ASSESSMENT_CONTRACT, questionId: q.id, prompt: q.prompt, problem: null, answerType: q.type, expected: { stored: q.answer, display: q.answer, values: [] }, variable: statedVariable(q), assumptions: [], mode: q.type === "written" ? "method-required" : "answer-only", capability: q.type === "written" ? "educator" : "none", reference: { steps: [], evidence: "authored answer (not independently verified)" }, verification: q.type === "written" ? "human" : "legacy", reason: q.type === "written" ? "marked by an educator" : "authored question without an independent kernel", checkedWrong: [] });
/** a held question must never reach a student */
export const publishable = (c: AssessmentContract | null): boolean => !!c && c.verification !== "held";

/* ------------------------------------------------------------------ the decision */
export interface AssessmentEvidence {
  policy: typeof ASSESSMENT_POLICY;
  /** the final answer: true / false, or null when it could not be established (never a guess) */
  answerCorrect: boolean | null;
  /** the written working was read (only ever when the answer was not correct) */
  methodExamined: boolean;
  /** answer-first never certifies a derivation; reserved for method-required verification */
  derivationVerified: boolean;
  firstError: null | { transition: number; from: string; to: string; kind: string; explanation: string };
  clarificationRequired: boolean;
  aiFallbackUsed: boolean;
  unresolved: boolean;
  source: "kernel" | "legacy" | "educator" | "held" | "disagreement" | "parser" | "verifier" | "infrastructure";
}
export interface Clarification { kind: "answer-field" | "interpretation" | "show-step"; prompt: string }
export interface Assessment {
  contract: typeof ASSESSMENT_CONTRACT;
  /** the authoritative answer credit: null = no decision */
  credit: boolean | null;
  evidence: AssessmentEvidence;
  feedback: { kind: "correct" | "incorrect" | "incomplete" | "clarify" | "pending" | "educator"; message: string };
  /** at most one targeted clarification (required) or an offer to show a step (optional) */
  clarification: Clarification | null;
  /** unresolved after the one clarification: eligible for the bounded fallback (planFallback), otherwise stays pending */
  fallbackEligible: boolean;
  /** the answer in the plain form the stored-answer comparison reads ("2, 3", "4"), when the exact checker read the learner's text; never set for a choice */
  normalised?: string;
  /** set only when the learner's own form was mathematically right but not one the stored-answer comparison reads: the record keeps this plain form so every replay agrees */
  recordAs?: string;
  /** set when the response is not (yet) an answer: the strict parser's reason (grading/parse.ts) */
  unreadable?: { reason: string; detail: string };
  /** the required-form check (grading/contract.ts applyForms), when the question states a form */
  form?: { rule: string; result: "satisfied" | "violated" | "undeterminable" };
  ms: number;
}
export interface Submission { response: string; working?: readonly string[]; legacyCorrect?: boolean | null; clarifications?: number }

const ev = (o: Partial<AssessmentEvidence>, asked = 0): AssessmentEvidence => ({ policy: ASSESSMENT_POLICY, answerCorrect: null, methodExamined: false, derivationVerified: false, firstError: null, clarificationRequired: asked > 0, aiFallbackUsed: false, unresolved: false, source: "kernel", ...o });

export function assessSubmission(c: AssessmentContract | null, s: Submission): Assessment {
  const t0 = performance.now(), done = (a: Omit<Assessment, "contract" | "ms" | "fallbackEligible"> & { fallbackEligible?: boolean }): Assessment => ({ contract: ASSESSMENT_CONTRACT, fallbackEligible: false, ...a, ms: performance.now() - t0 });
  const asked = s.clarifications ?? 0;
  const pending = (evidence: Partial<AssessmentEvidence>, message: string, clar: Clarification | null, eligible: boolean) => done({ credit: null, evidence: ev({ ...evidence, unresolved: true, clarificationRequired: asked > 0 || !!clar }, asked), feedback: { kind: clar ? "clarify" : "pending", message }, clarification: clar, fallbackEligible: eligible });
  if (!c || c.verification === "held") return pending({ source: "held" }, "This question is being checked. Your answer is saved and has not been marked wrong.", null, false);
  if (c.verification === "human" || c.mode !== "answer-only") return done({ credit: null, evidence: ev({ source: "educator" }, asked), feedback: { kind: "educator", message: "This answer is marked by a teacher." }, clarification: null });
  const legacy = s.legacyCorrect ?? null;
  if (c.verification === "legacy") {
    if (legacy === null) return pending({ source: "legacy" }, "This answer could not be checked automatically. It is saved and has not been marked wrong.", null, true);
    return done({ credit: legacy, evidence: ev({ answerCorrect: legacy, source: "legacy" }, asked), feedback: { kind: legacy ? "correct" : "incorrect", message: legacy ? "Correct." : "Not quite." }, clarification: null });
  }
  const kind = (c.kind ?? "value") as Exclude<GeneratorContract["kind"], "typed">;
  let response = s.response;
  if (c.answerType === "choice") { const i = response.trim().toUpperCase().charCodeAt(0) - 65; const o = response.trim().length === 1 ? (problemOf(c.questionId)?.options ?? [])[i] : undefined; if (o === undefined) return pending({}, "Choose one of the options.", asked ? null : { kind: "answer-field", prompt: "Choose one of the options." }, asked > 0); response = o; }
  if (c.problem?.domain === "typed") {
    // the typed-kernel route: the answer is read into the kernel's own kind of value (never guessed), then the kernel decides; working is not read
    const hint = "in the form shown in the question", verdict = judgeTyped(c.problem.object, response);
    if (verdict === "unread") return pending({}, `Your answer could not be read ${hint}. It has not been marked wrong.`, asked ? null : { kind: "answer-field", prompt: `Type just your final answer in the answer box, ${hint}.` }, asked > 0);
    const kc = verdict === "verified" ? true : verdict === "rejected" ? false : null;
    if (kc === null) return pending({}, "This answer could not be checked automatically. It is saved and has not been marked wrong.", null, asked > 0);
    // the record keeps the stored plain form of a correct answer, so the stored-answer comparison and every replay agree with this decision
    const normalised = kc ? c.expected.stored : undefined;
    if (legacy !== null && legacy !== kc) return { ...pending({ source: "disagreement", answerCorrect: null }, "This answer is being double-checked. It is saved and has not been marked wrong.", null, false), normalised };
    return kc
      ? done({ credit: true, evidence: ev({ answerCorrect: true }, asked), feedback: { kind: "correct", message: "Correct. (Your working was not checked.)" }, clarification: null, normalised })
      : done({ credit: false, evidence: ev({ answerCorrect: false }, asked), feedback: { kind: "incorrect", message: "Not quite." }, clarification: (s.working ?? []).some((l) => l.trim()) ? null : { kind: "show-step", prompt: "Want to find where it went wrong? Show one step of your working." } });
  }
  const ans = answerText(kind as "value" | "var" | "set", c.variable, response);
  const readHint = c.answerType === "integer" || kind === "value" ? "a number" : kind === "set" ? "the solutions as numbers separated by commas" : "a number";
  if (!ans.ok && legacy !== null && kind === "value" && /^[\d\s./+\-−]+$/.test(response)) return done({ credit: legacy, evidence: ev({ answerCorrect: legacy, source: "legacy" }, asked), feedback: { kind: legacy ? "correct" : "incorrect", message: legacy ? "Correct." : "Not quite." }, clarification: null });
  if (!ans.ok) return pending({}, `Your answer could not be read as ${readHint}. It has not been marked wrong.`, asked ? null : { kind: "answer-field", prompt: `Type just your final answer in the answer box, as ${readHint}.` }, asked > 0);
  const normalised = c.answerType === "choice" ? undefined : ans.values.join(", ");
  const lines = (s.working ?? []).filter((l) => l.trim());
  const r: AnswerFirstAssessment | null = kernel(kind, (c.problem as { statement: string }).statement, ans, lines);
  const kc = r?.answer.credit ?? null;
  if (kc === null) return pending({}, "This answer could not be checked automatically. It is saved and has not been marked wrong.", asked ? null : { kind: "interpretation", prompt: "Write one line showing how you got your answer (or the equation you solved), then check again." }, asked > 0);
  if (legacy !== null && legacy !== kc) return { ...pending({ source: "disagreement", answerCorrect: null }, "This answer is being double-checked. It is saved and has not been marked wrong.", null, false), normalised };
  if (kc) return done({ credit: true, evidence: ev({ answerCorrect: true }, asked), feedback: { kind: "correct", message: "Correct. (Your working was not checked.)" }, clarification: null, normalised });
  const fe = r!.diagnosis?.firstError ?? null, incomplete = r!.answer.status === "incomplete";
  const firstError = fe ? { transition: fe.transition, from: fe.from, to: fe.to, kind: fe.kind, explanation: fe.explanation } : null;
  const examined = lines.length > 0 && !!r!.diagnosis;
  const clar: Clarification | null = lines.length ? null : { kind: "show-step", prompt: "Want to find where it went wrong? Show one step of your working." };
  return done({
    credit: false,
    evidence: ev({ answerCorrect: false, methodExamined: examined, firstError }, asked),
    feedback: { kind: incomplete ? "incomplete" : "incorrect", message: (incomplete ? "Some of your answers are right, but not all of them." : "Not quite.") + (firstError ? ` First problem: ${firstError.explanation}` : "") },
    clarification: clar,
    normalised,
  });
}
