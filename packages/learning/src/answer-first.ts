/**
 * Answer-first assessment. Correct final answer → credit, no derivation analysis. Incorrect → the earliest demonstrably invalid WRITTEN transition, judged against the line
 * the student actually wrote before it, with the smallest exact difference. Four judgments are kept apart and never used as proof of one another:
 *   answer correctness · local transition validity · complete derivation validity (NOT claimed here) · diagnostic confidence.
 * Nothing new is solved or parsed: the independent checker's exact solution-set profile, exact arithmetic and the shared natural parser do all of it.
 */
import { answerFirstNumeric, answerFirstSolutionSet, Exhausted, Unsupported, type AfAnswer, type AfDiagnosis, type AfTransition } from "./independent-checker.ts";
import { parseNaturalWorking } from "./natural-working.ts";

export const ANSWER_FIRST_CONTRACT = "openpath-answer-first@1" as const;
export interface AnswerFirstAssessment {
  contract: typeof ANSWER_FIRST_CONTRACT;
  family: "solution-set" | "arithmetic" | "none";
  /** credit: true = answer correct; false = answer wrong or incomplete; null = could not be established (never a guessed binary) */
  answer: AfAnswer & { status: AfAnswer["status"] | "unsupported"; credit: boolean | null };
  /** answer-first never claims the written derivation was demonstrated or certified */
  derivationCertified: false;
  diagnosis: null | {
    firstError: { transition: number; from: string; to: string; kind: AfDiagnosis["kind"] | "unchecked-candidates"; location: string; evidence: string[]; explanation: string; confidence: "exact" | "set-level" } | null;
    /** other transitions that are invalid relative to the line before them (distinct observable errors) */
    laterErrors: { transition: number; from: string; to: string; kind: AfDiagnosis["kind"]; explanation: string; evidence: string[]; confidence: "exact" | "set-level" }[];
    /** transitions after the first error that are valid relative to the student's own preceding line */
    locallyValidAfterFirstError: number[];
    transitions: Pick<AfTransition, "index" | "from" | "to" | "status" | "detail" | "keepsOriginalSolutions">[];
  };
  cost: { checks: number; ms: number; analysedWork: boolean };
  /** 1-based lines that could not be read; transitions across them are not judged exactly */
  unreadableLines: number[];
}

const none = (reason: string, status: "unresolved" | "unsupported", t0: number): AnswerFirstAssessment => ({ contract: ANSWER_FIRST_CONTRACT, family: "none", answer: { status, credit: null, reason, finalText: null, finalSet: null, expectedSet: null, extraneous: [], missing: [], restrictions: [] }, derivationCertified: false, diagnosis: null, cost: { checks: 0, ms: performance.now() - t0, analysedWork: false }, unreadableLines: [] });

/**
 * @param problem  `{ domain: "algebra", statement }` (equations, inequalities, rational/radical equations, numeric expressions)
 * @param working  `{ format: "natural" | "latex", text }`; other domains are reported unsupported, not forced into solution-set comparison
 * @param opts.finalAnswer  the explicit final answer, already in statement form ("x = 4", "x = 2 or x = 3", "56"); appended as the last line. Without working, only the verdict is produced (nothing to localise).
 * @param opts.diagnose  false = answer verdict only; default true = diagnose only when the answer is not correct (a correct answer is never analysed); "always" = also report the written transitions of a correct answer (optional, never part of the credit decision)
 */
export function assessAnswerFirst(problem: unknown, working: unknown, opts: { diagnose?: boolean | "always"; finalAnswer?: string } = {}): AnswerFirstAssessment {
  const t0 = performance.now();
  const p = problem as { domain?: string; statement?: string; task?: string } | null;
  let w = working as { format?: string; text?: string } | null;
  // an explicit final answer (the answer field) is the final line; it is never inferred from the working, and a missing working is not an error
  if (typeof opts.finalAnswer === "string" && opts.finalAnswer.trim()) {
    const prior = w && typeof w.text === "string" && w.text.trim() && (w.format === "natural" || w.format === "latex") ? w : null;
    w = { format: prior?.format ?? "natural", text: prior ? `${prior.text.replace(/\s+$/, "")}\n${opts.finalAnswer.trim()}` : opts.finalAnswer.trim() };
    if (!prior) opts = { ...opts, diagnose: false };
  }
  if (!p || p.domain !== "algebra" || typeof p.statement !== "string") return none("answer-first grading is implemented for algebra statements (solution sets and numeric values); other domains keep their own invariant-based assessment", "unsupported", t0);
  if (!w || typeof w.text !== "string" || !(w.format === "natural" || w.format === "latex")) return none("natural-text working is required", "unsupported", t0);
  let parsed = parseNaturalWorking({ format: w.format, text: w.text });
  const unreadable: number[] = [];
  if (parsed.classification !== "parsed") {
    // one unreadable line must not hide the answer: read line by line; an unreadable LAST line leaves the answer unresolved, an unreadable earlier line is only reported
    const raw = w.text.replace(/\r\n?/g, "\n").split("\n"), keep: typeof parsed.lines = []; let lastNonBlank = -1;
    raw.forEach((t, k) => { if (t.trim()) lastNonBlank = k; });
    raw.forEach((t, k) => { if (!t.trim()) return; const one = parseNaturalWorking({ format: w.format as "natural" | "latex", text: t }); if (one.classification === "parsed" && one.lines.length === 1) keep.push({ ...one.lines[0], id: `line-${keep.length + 1}`, source: { ...one.lines[0].source, line: k + 1 } }); else unreadable.push(k + 1); });
    if (!keep.length || unreadable.includes(lastNonBlank + 1)) return none(`the last line of the working could not be read (${parsed.message}), so the final answer is not established`, "unresolved", t0);
    parsed = { ...parsed, classification: "parsed", lines: keep, message: "read line by line" };
  }
  if (!parsed.lines.length) return none("no working was submitted", "unresolved", t0);
  const diagnose = opts.diagnose !== false;
  let r: ReturnType<typeof answerFirstSolutionSet> | ReturnType<typeof answerFirstNumeric>;
  try {
    // the verdict first, without looking at the working's intermediate lines
    try { r = answerFirstSolutionSet(p.statement, parsed, false); } catch (e) { if (!(e instanceof Unsupported)) throw e; r = answerFirstNumeric(p.statement, parsed, false); }
    if (diagnose && (opts.diagnose === "always" || r.answer.status !== "correct")) r = r.family === "arithmetic" ? answerFirstNumeric(p.statement, parsed, true) : answerFirstSolutionSet(p.statement, parsed, true);
  } catch (e) {
    if (e instanceof Unsupported || e instanceof Exhausted) return none(`outside the exact checker's scope: ${e.message}`, "unsupported", t0);
    throw e;
  }
  const credit = r.answer.status === "correct" ? true : r.answer.status === "incorrect" || r.answer.status === "incomplete" ? false : null;
  const out: AnswerFirstAssessment = { contract: ANSWER_FIRST_CONTRACT, family: r.family, answer: { ...r.answer, credit }, derivationCertified: false, diagnosis: null, cost: { checks: r.checks, ms: 0, analysedWork: !!r.transitions }, unreadableLines: unreadable };
  if (r.transitions) {
    const first = r.firstInvalid, tr = r.transitions;
    const err = (t: AfTransition) => t.diagnosis!;
    const firstT = first !== null ? tr.find((t) => t.index === first) ?? null : null;
    let firstError: NonNullable<AnswerFirstAssessment["diagnosis"]>["firstError"] = null;
    if (firstT) { const d = firstT.diagnosis ?? { kind: "solution-set-change" as const, location: `${firstT.from} → ${firstT.to}`, evidence: [firstT.detail], explanation: firstT.detail, confidence: "set-level" as const }; firstError = { transition: firstT.index, from: firstT.from, to: firstT.to, kind: d.kind, location: d.location, evidence: d.evidence, explanation: d.explanation, confidence: d.confidence }; }
    else if (r.answer.status === "incorrect" && r.answer.extraneous.length) {
      const widened = tr.find((t) => t.status === "implied");
      const finalT = tr.find((t) => t.index === r.finalIndex) ?? tr[tr.length - 1];
      // the one-way step is permissible; the error is the answer that states unchecked candidates, so it is located at the final answer line
      firstError = { transition: finalT.index, from: finalT.from, to: finalT.to, kind: "unchecked-candidates", location: "final answer", evidence: [`${r.answer.extraneous.join(", ")} ${r.answer.extraneous.length > 1 ? "do" : "does"} not satisfy the original problem`, ...(widened ? [`line ${widened.index + 1} was a valid one-way step (${widened.detail})`] : [])], explanation: `every written step is locally valid, but the candidate${r.answer.extraneous.length > 1 ? "s" : ""} ${r.answer.extraneous.join(", ")} introduced by a one-way step ${r.answer.extraneous.length > 1 ? "were" : "was"} never checked against the original problem`, confidence: "exact" };
    }
    const gapped = (t: AfTransition) => unreadable.some((u) => u > (parsed.lines[t.index - 1]?.source.line ?? 0) && u < parsed.lines[t.index].source.line);
    if (firstError && firstT && gapped(firstT)) firstError = { ...firstError, confidence: "set-level", explanation: `${firstError.explanation} (an unreadable line lies between these two lines)` };
    const later = tr.filter((t) => t.status === "invalid" && t.index !== first && t.diagnosis).map((t) => ({ transition: t.index, from: t.from, to: t.to, kind: err(t).kind, explanation: err(t).explanation, evidence: err(t).evidence, confidence: err(t).confidence }));
    out.diagnosis = { firstError, laterErrors: later, locallyValidAfterFirstError: first === null ? [] : tr.filter((t) => t.index > first && (t.status === "equivalent" || t.status === "implied" || t.status === "narrowing" || t.status === "closed-true")).map((t) => t.index), transitions: tr.map(({ index, from, to, status, detail, keepsOriginalSolutions }) => ({ index, from, to, status, detail, keepsOriginalSolutions })) };
  }
  out.cost.ms = performance.now() - t0;
  return out;
}
