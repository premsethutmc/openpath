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
import { problemOf } from "./families.ts";
import { CLOSED_ARITHMETIC_FAMILIES, closedExpression } from "./closed-arithmetic.ts";
import type { Problem } from "./family-kit.ts";
import type { AnswerType } from "./answer-types.ts";

export const ASSESSMENT_CONTRACT = "openpath-assessment@1" as const;
export const ASSESSMENT_POLICY = "assessment@1" as const;
export type AssessmentMode = "answer-only" | "method-required" | "proof-required";
export type Verification = "verified" | "legacy" | "held" | "human";

export interface AssessmentContract {
  contract: typeof ASSESSMENT_CONTRACT;
  questionId: string;
  prompt: string;
  /** the statement handed to the exact checker (null: no independent kernel for this family) */
  problem: { domain: "algebra"; statement: string } | null;
  answerType: AnswerType;
  /** the expected answer as the question stores it, and in the form the student is shown */
  expected: { stored: string; display: string; values: string[] };
  variable: string | null;
  assumptions: string[];
  mode: AssessmentMode;
  capability: "exact-solution-set" | "exact-arithmetic" | "educator" | "none";
  reference: { steps: string[]; evidence: string };
  verification: Verification;
  reason: string;
  /** candidates checked during validation (all must be judged not-correct) */
  checkedWrong: string[];
}

type Shape = { kind: "value" | "var" | "set"; statement: (p: number[]) => string; variable: string | null; assumptions: string[]; numbers: (p: number[]) => number[] };
const sg = (n: number) => (n < 0 ? "-" : "+");
/** statements the independent kernel can solve, per generated family; every other family is "legacy" */
export const STATEMENTS: Record<string, Shape> = {
  mul: { kind: "value", variable: null, assumptions: ["whole-number product"], statement: ([a, b]) => `${a}*${b}`, numbers: ([a, b]) => [a, b] },
  pow: { kind: "value", variable: null, assumptions: ["whole-number power"], statement: ([a, n]) => `${a}^${n}`, numbers: ([a, n]) => [a, n] },
  linev: { kind: "value", variable: null, assumptions: ["value of y at the given x"], statement: ([m, c, t]) => `${m}*${t < 0 ? `(${t})` : t}${sg(c)}${Math.abs(c)}`, numbers: ([m, c, t]) => [m, c, t] },
  lin: { kind: "var", variable: "x", assumptions: ["x real"], statement: ([a, b, x]) => `${a}x+${b}=${a * x + b}`, numbers: ([a, b, x]) => [a, b, a * x + b] },
  quad: { kind: "set", variable: "x", assumptions: ["x real", "both roots required"], statement: ([p, q]) => `x^2${sg(p)}${Math.abs(p)}x${sg(q)}${Math.abs(q)}=0`, numbers: ([p, q]) => [p, q] },
  meet: { kind: "set", variable: "x", assumptions: ["x real (the question lists the whole-number meeting points in −4…4; the equation has no other real solutions)", "both required"], statement: ([m, c]) => `x^2=${m}x${sg(c)}${Math.abs(c)}`, numbers: ([m, c]) => [m, c] },
};
/** a numeric value whose statement is the expression the prompt shows (closed-arithmetic.ts) */
const PROMPT_VALUE: Shape = { kind: "value", variable: null, assumptions: ["value of the closed numeric expression shown"], statement: () => "", numbers: () => [] };
const shapeOf = (c: AssessmentContract): Shape | undefined => STATEMENTS[c.questionId.split(":")[1]] ?? (c.capability === "exact-arithmetic" ? PROMPT_VALUE : undefined);
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

const kernel = (shape: Shape, statement: string, answer: AnswerText, working?: string[]) =>
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
  const prompted = !STATEMENTS[pr.family] && CLOSED_ARITHMETIC_FAMILIES.has(pr.family) ? closedExpression(pr.prompt) : null;
  const shape = STATEMENTS[pr.family] ?? (prompted ? { ...PROMPT_VALUE, statement: () => prompted } : undefined);
  const promptDerived = !STATEMENTS[pr.family] && !!shape;
  if (!shape) return { ...base, problem: null, expected, variable: null, assumptions: [], capability: "none", verification: "legacy", reason: `no independent kernel for family ${pr.family}; the generator's answer is the only authority` };
  const statement = shape.statement(pr.params), problem = { domain: "algebra" as const, statement };
  const held = (reason: string, wrong: string[] = []): AssessmentContract => ({ ...base, problem, expected, variable: shape.variable, assumptions: shape.assumptions, capability: shape.kind === "value" ? "exact-arithmetic" : "exact-solution-set", verification: "held", reason, checkedWrong: wrong });
  // the statement must be the one the student is shown: every number in it appears in the prompt
  const shown = digitsOf(pr.prompt), need = shape.numbers(pr.params).map(Math.abs);
  const pool = [...shown];
  for (const n of need) { if (n === 1) continue; /* an implicit coefficient 1 is not written */ const i = pool.indexOf(n); if (i < 0) return held(`the independent statement ${statement} uses ${n}, which the prompt does not show`); pool.splice(i, 1); }
  const good = answerText(shape.kind, shape.variable, exp.display);
  // a prompt-derived rule never makes a question worse than before: an answer it cannot read keeps the legacy comparison
  if (!good.ok && promptDerived) return { ...base, problem: null, expected, variable: null, assumptions: [], capability: "none", verification: "legacy", reason: `stored answer "${exp.display}" is not a plain number; legacy comparison kept` };
  if (!good.ok) return held(`the stored answer "${exp.display}" is not readable (${good.why})`);
  const r = kernel(shape, statement, good);
  if (!r || r.answer.credit !== true) return held(`the independent checker does not confirm the stored answer: ${r?.answer.reason ?? "unreadable"}`);
  const wrong = wrongCandidates(pr, exp.values), judged: string[] = [];
  for (const w of wrong) {
    const a = answerText(shape.kind, shape.variable, w);
    if (!a.ok) continue; // not a readable numeric answer: cannot be credited either
    const rr = kernel(shape, statement, a);
    if (rr?.answer.credit === true) return held(`the independent checker also credits the known wrong answer "${w}"`, judged);
    judged.push(w);
  }
  return { ...base, problem, expected, variable: shape.variable, assumptions: shape.assumptions, capability: shape.kind === "value" ? "exact-arithmetic" : "exact-solution-set", verification: "verified", reason: "independent exact checker reproduces the expected answer and credits no known wrong answer", reference: { steps: base.reference.steps, evidence: `exact checker: ${good.text} confirmed for ${statement}` }, checkedWrong: judged };
}
/** an authored (non-generated) question: no independent kernel, so the stored answer is the only authority (reported as legacy), or an educator marks it */
export const legacyContract = (q: { id: string; type: AnswerType; answer: string; prompt: string }): AssessmentContract =>
  ({ contract: ASSESSMENT_CONTRACT, questionId: q.id, prompt: q.prompt, problem: null, answerType: q.type, expected: { stored: q.answer, display: q.answer, values: [] }, variable: null, assumptions: [], mode: q.type === "written" ? "method-required" : "answer-only", capability: q.type === "written" ? "educator" : "none", reference: { steps: [], evidence: "authored answer (not independently verified)" }, verification: q.type === "written" ? "human" : "legacy", reason: q.type === "written" ? "marked by an educator" : "authored question without an independent kernel", checkedWrong: [] });
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
  source: "kernel" | "legacy" | "educator" | "held" | "disagreement";
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
  const shape = shapeOf(c)!;
  let response = s.response;
  if (c.answerType === "choice") { const i = response.trim().toUpperCase().charCodeAt(0) - 65; const o = response.trim().length === 1 ? (problemOf(c.questionId)?.options ?? [])[i] : undefined; if (o === undefined) return pending({}, "Choose one of the options.", asked ? null : { kind: "answer-field", prompt: "Choose one of the options." }, asked > 0); response = o; }
  const ans = answerText(shape.kind, c.variable, response);
  const readHint = c.answerType === "integer" || shape.kind === "value" ? "a number" : shape.kind === "set" ? "the solutions as numbers separated by commas" : "a number";
  if (!ans.ok && legacy !== null && shape === PROMPT_VALUE && /^[\d\s./+\-−]+$/.test(response)) return done({ credit: legacy, evidence: ev({ answerCorrect: legacy, source: "legacy" }, asked), feedback: { kind: legacy ? "correct" : "incorrect", message: legacy ? "Correct." : "Not quite." }, clarification: null });
  if (!ans.ok) return pending({}, `Your answer could not be read as ${readHint}. It has not been marked wrong.`, asked ? null : { kind: "answer-field", prompt: `Type just your final answer in the answer box, as ${readHint}.` }, asked > 0);
  const normalised = c.answerType === "choice" ? undefined : ans.values.join(", ");
  const lines = (s.working ?? []).filter((l) => l.trim());
  const r: AnswerFirstAssessment | null = kernel(shape, c.problem!.statement, ans, lines);
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
