/**
 * calculus-working@1: a learner's typed calculus working (derivatives, integrals, limits), judged line by line by the exact
 * calculus checkers already in this package (unified-math-engine → E5/E6 binders: exact algebra and series, never a float
 * agreement). The task comes from the question's own wording (calculus-task.ts). Like the geometry adapter, it only runs
 * when the algebra authority could not judge the working, and it never changes how the answer counts.
 */
import { createHash } from "node:crypto";
import { question } from "../content.ts";
import { calculusTaskOf } from "../calculus-task.ts";
import { assessMathematicalWorking } from "../unified-math-engine.ts";
import type { WorkingAssessment } from "./working.ts";
import { isOdeWorking, odeWorking } from "./ode-working.ts";
import { functionWorking, isFunctionWorking } from "./function-working.ts";
import { lineWorking } from "./line-working.ts";

export const CALCULUS_WORKING = "calculus-working@1" as const;
const digest = (x: unknown) => createHash("sha256").update(JSON.stringify(x)).digest("hex");

/** Long working is allowed for calculus: up to this many lines of this many characters. */
export const CALCULUS_LINES = 100;
export const CALCULUS_LINE_CHARS = 200;
export const isCalculusWorking = (qid: string) => !!calculusTaskOf(qid) || isOdeWorking(qid) || isFunctionWorking(qid) || isLineWorking(qid);
/** a calculus question no task-specific checker reads: its lines are checked on their own truth */
export const isLineWorking = (qid: string) => { try { return /calculus|differentia|integra|limit/i.test(question(qid).competency) && !calculusTaskOf(qid) && !isOdeWorking(qid) && !isFunctionWorking(qid); } catch { return false; } };

/** The notation the app itself uses (and so a learner copies) in the checker's notation: "∫ from 0 to 3 of f dx" as
 *  "∫_0^3 f dx", "[F] from 0 to 3" as "[F]_0^3", "lim (x → 4)" as "lim_(x->4)". The learner's own text is what is shown. */
/** a limit of integration the checker reads as one token: 7/2 → (7/2) */
const bound = (b: string) => (/^-?\d+$/.test(b) || /^\(.*\)$/.test(b) ? b : `(${b})`);
export function toCheckerNotation(line: string): string {
  return line
    .replace(/∫\s*from\s+(\S+)\s+to\s+(\S+)\s+of\s+/g, (_, a, b) => `∫_${bound(a)}^${bound(b)} `)
    .replace(/\]\s*from\s+(\S+)\s+to\s+(\S+)/g, (_, a, b) => `]_${bound(a)}^${bound(b)}`)
    .replace(/lim\s*\(\s*([a-z])\s*(?:→|->)\s*([^)]+?)\s*\)\s*(?:of\s+)?/g, "lim_($1->$2) ")
    // calculus-notation@1: the way the app writes these functions, in the checker's words
    // sin⁻¹u and cos⁻¹u in the exact form the question's own sin⁻¹ is read in (every route reads tan⁻¹ and √)
    .replace(/(?:sin⁻¹|\basin|\barcsin)\s*\(([^()]*(?:\([^()]*\)[^()]*)*)\)/g, "atan(($1)/(sqrt(1-($1)^2)))").replace(/(?:sin⁻¹|\basin|\barcsin)\s*([a-z])\b/g, "atan(($1)/(sqrt(1-($1)^2)))")
    .replace(/(?:cos⁻¹|\bacos|\barccos)\s*\(([^()]*(?:\([^()]*\)[^()]*)*)\)/g, "(pi/2-atan(($1)/(sqrt(1-($1)^2))))").replace(/(?:cos⁻¹|\bacos|\barccos)\s*([a-z])\b/g, "(pi/2-atan(($1)/(sqrt(1-($1)^2))))")
    .replace(/tan⁻¹/g, "atan")
    .replace(/\bcosec\b/g, "csc")
    // cot, sec, csc as cos/sin (the same function on the same domain), so limits, which only know sin and cos, read them
    .replace(/\b(cot|sec|csc)²\s*([a-z])\b/g, "$1($2)^2").replace(/\b(cot|sec|csc)\s+([a-z])\b/g, "$1($2)")
    .replace(/\bcot\(([^()]*)\)/g, "(cos($1)/sin($1))").replace(/\bsec\(([^()]*)\)/g, "(1/cos($1))").replace(/\bcsc\(([^()]*)\)/g, "(1/sin($1))")
    .replace(/([0-9a-z)])eˣ/g, "$1*exp(x)").replace(/(?<![a-z])eˣ/g, "exp(x)")
    .replace(/(\d+)ˣ/g, "$1^x")
    .replace(/[−–]/g, "-");
}

type Step = { index: number; classification: string; justification?: string };

export async function calculusWorking(qid: string, lines: readonly string[], base: WorkingAssessment, timeoutMs = 4000): Promise<WorkingAssessment> {
  const task = calculusTaskOf(qid);
  if (!task && isOdeWorking(qid)) return odeWorking(qid, [...lines], base); // ode-working@1: differential equations
  if (!task && isFunctionWorking(qid)) return functionWorking(qid, [...lines], base); // function-working@1: maxima, minima, monotonicity
  if (!task && isLineWorking(qid)) return lineWorking(qid, [...lines], base); // line-working@1: every other calculus question
  if (!task || !lines.length || base.status !== "unsupported") return base;
  const common = {
    ...base,
    statement: question(qid).prompt,
    provenance: { schema: "working-provenance@1" as const, questionId: qid, competency: question(qid).competency, checker: "calculus-reasoner", version: CALCULUS_WORKING, reasoning: "not-established" as const },
  };
  const fallback = (reason: string): WorkingAssessment => ({ ...common, status: "unsupported", methodEvidence: "no-method-evidence", reason } as WorkingAssessment);
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const run = assessMathematicalWorking(task, { format: "natural", text: lines.map(toCheckerNotation).join("\n"), conventions: { log: "natural" } }, { conventions: { log: "natural" } }) as Promise<{ classification: string; steps?: Step[]; justification?: string }>;
    const r = await Promise.race([run, new Promise<never>((_, rej) => { timer = setTimeout(() => rej(new Error("timeout")), timeoutMs); })]);
    const steps = Array.isArray(r.steps) ? r.steps : [];
    // one verdict per submitted line (the checker numbers the lines it read from 0)
    const verdict = lines.map((_, i) => steps.find((s) => s.index === i)?.classification ?? "unsupported");
    const first = verdict.findIndex((v) => v === "invalid" || v === "contradictory");
    let lead = 0;
    while (lead < verdict.length && verdict[lead] === "verified") lead++;
    const status: WorkingAssessment["status"] = first >= 0 ? "invalid" : r.classification === "verified" ? "verified" : lead > 0 ? "partial" : "unsupported";
    return {
      ...common,
      status,
      methodEvidence: status === "verified" ? "method-verified" : status === "invalid" ? "method-false-step" : "no-method-evidence",
      completeness: status === "verified" ? "complete" : "incomplete",
      lines: lines.map((text, i) => ({ text, status: verdict[i] === "verified" && (first < 0 || i < first) ? "certified-calculus" : i === first ? "invalid" : "unsupported", move: null })),
      firstInvalid: first < 0 ? null : { index: first, text: lines[first], from: first ? lines[first - 1] : question(qid).prompt, reason: steps.find((s) => s.index === first)?.justification ?? "This line does not follow exactly from the one before.", lost: null, gained: null },
      workingAnswer: null,
      agreesWithResponse: null,
      substitution: null,
      certificates: status === "verified" ? [digest({ policy: CALCULUS_WORKING, qid, task, lines }), digest(r)] : [],
      replayed: status === "verified",
      replayedLines: first >= 0 ? Math.min(lead, first) : lead,
      reason: r.justification ?? "",
      provenance: { ...common.provenance, reasoning: status === "verified" ? "demonstrated" : status === "invalid" ? "refuted" : "not-established" },
    } as WorkingAssessment;
  } catch {
    return fallback("The calculus checker could not finish in time. Your answer is graded separately and your working is saved.");
  } finally {
    clearTimeout(timer);
  }
}
