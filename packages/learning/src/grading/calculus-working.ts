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

export const CALCULUS_WORKING = "calculus-working@1" as const;
const digest = (x: unknown) => createHash("sha256").update(JSON.stringify(x)).digest("hex");

/** Long working is allowed for calculus: up to this many lines of this many characters. */
export const CALCULUS_LINES = 100;
export const CALCULUS_LINE_CHARS = 200;
export const isCalculusWorking = (qid: string) => !!calculusTaskOf(qid);

/** The notation the app itself uses (and so a learner copies) in the checker's notation: "∫ from 0 to 3 of f dx" as
 *  "∫_0^3 f dx", "[F] from 0 to 3" as "[F]_0^3", "lim (x → 4)" as "lim_(x->4)". The learner's own text is what is shown. */
export function toCheckerNotation(line: string): string {
  return line
    .replace(/∫\s*from\s+(\S+)\s+to\s+(\S+)\s+of\s+/g, "∫_$1^$2 ")
    .replace(/\]\s*from\s+(\S+)\s+to\s+(\S+)/g, "]_$1^$2")
    .replace(/lim\s*\(\s*([a-z])\s*(?:→|->)\s*([^)]+?)\s*\)\s*(?:of\s+)?/g, "lim_($1->$2) ")
    .replace(/[−–]/g, "-");
}

type Step = { index: number; classification: string; justification?: string };

export async function calculusWorking(qid: string, lines: readonly string[], base: WorkingAssessment, timeoutMs = 4000): Promise<WorkingAssessment> {
  const task = calculusTaskOf(qid);
  if (!task || !lines.length || base.status !== "unsupported") return base;
  const common = {
    ...base,
    statement: question(qid).prompt,
    provenance: { schema: "working-provenance@1" as const, questionId: qid, competency: question(qid).competency, checker: "calculus-reasoner", version: CALCULUS_WORKING, reasoning: "not-established" as const },
  };
  const fallback = (reason: string): WorkingAssessment => ({ ...common, status: "unsupported", methodEvidence: "no-method-evidence", reason } as WorkingAssessment);
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const run = assessMathematicalWorking(task, { format: "natural", text: lines.map(toCheckerNotation).join("\n"), conventions: { log: "natural" } }) as Promise<{ classification: string; steps?: Step[]; justification?: string }>;
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
