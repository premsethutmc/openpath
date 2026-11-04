import { reentryEligibility, type ReentryRequest } from "./reentry-eligibility.ts";
/**
 * The trusted server-side grader. It receives ONLY a question id, the student's response and permitted working (JSON on stdin); the contract
 * (expected answer, kernel object, form rules, status) is rebuilt here from the question's own definition, never taken from the request.
 * It runs THE grading decision (grading/decision.ts grade), the same function as the app, for every known question: authored or generated,
 * kernel-verified or not. Django records its verdict; it never substitutes another comparison while this grader is available.
 *   in : {"id": "gen:det2:2,5,3,5", "response": "-5", "working": ["..."]}  (or an array of these)
 *   out: {"v":2,"id":...,"known":true,"credit":true|false|null,"verdict":"correct"|"incorrect"|"unresolved"|"pending-educator","reason":"<reason code>",
 *         "source":"kernel"|"verifier"|"parser"|"held"|"educator","expected":"<stored answer>","decision":{grading-decision@1},"ms":0.1}
 */
import { isQuestion, question } from "./content.ts";
import { grade, type GradingDecision } from "./grading/decision.ts";
import { gradeProgram, isProgramQuestion, programQuestion } from "./grading/program.ts";

import { geometryWorking, stopGeometryWorkers } from './grading/geometry-working';
import { assessWorkingAsync, type WorkingObservation } from "./grading/working.ts";

export const SERVER_GRADER_VERSION = 2 as const;
export interface GraderRequest { id: string; response: string; working?: string[] }
/** credit: the decision (true / false / null = undecided); expected: the stored answer (Django checks it equals its own); decision: the full record */
export interface GraderReply { v: typeof SERVER_GRADER_VERSION; id: string; known: boolean; credit: boolean | null; verdict: GradingDecision["verdict"] | "unknown"; reason: string; source: "kernel" | "verifier" | "parser" | "held" | "educator" | "unknown"; expected: string | null; decision: GradingDecision | null; ms: number }

const sourceOf = (d: GradingDecision): GraderReply["source"] => (d.reason === "unresolved.quarantined" || d.reason === "unresolved.contract-inconsistency" ? "held" : d.reason === "pending-educator" ? "educator" : d.reason === "unresolved.invalid-response" || d.reason === "unresolved.ambiguous" ? "parser" : d.verifier?.startsWith("kernel:") ? "kernel" : "verifier");
export function gradeRequest(r: GraderRequest): GraderReply {
  const t0 = performance.now(), ms = () => +(performance.now() - t0).toFixed(3);
  const unknown = (reason: string): GraderReply => ({ v: SERVER_GRADER_VERSION, id: String(r?.id ?? ""), known: false, credit: null, verdict: "unknown", reason, source: "unknown", expected: null, decision: null, ms: ms() });
  if (!r || typeof r.id !== "string" || typeof r.response !== "string" || r.response.length > 4000) return unknown("malformed request");
  // stage 9 (D14): program questions are decided by the same parser, verifiers and form rules (grading/program.ts)
  if (isProgramQuestion(r.id)) {
    let d;
    try { d = gradeProgram(r.id, r.response, Array.isArray(r.working) ? r.working.filter((l) => typeof l === "string").slice(0, 8) : []); } catch { return unknown("the program question's contract could not be built"); }
    return { v: SERVER_GRADER_VERSION, id: r.id, known: true, credit: d.verdict === "correct" ? true : d.verdict === "incorrect" ? false : null, verdict: d.verdict, reason: d.reason, source: sourceOf(d), expected: programQuestion(r.id)!.answer, decision: d, ms: ms() };
  }
  if (!isQuestion(r.id)) return unknown("not a known question");
  const working = Array.isArray(r.working) ? r.working.filter((l) => typeof l === "string").slice(0, 8).map((l) => l.slice(0, 80)) : [];
  let g;
  try { g = grade(r.id, r.response, working); } catch { return unknown("the question's contract could not be built"); }
  return { v: SERVER_GRADER_VERSION, id: r.id, known: true, credit: g.assessment.credit, verdict: g.decision.verdict, reason: g.decision.reason, source: sourceOf(g.decision), expected: question(r.id).answer, decision: g.decision, ms: ms() };
}

/** Async callers finish the working boundary before persisting a single immutable decision.
 * The observer is server code, never a field in GraderRequest. Sync callers stay compatible. */
export async function gradeRequestAsync(r: GraderRequest, observe?: (request: Readonly<{ questionId: string; competency: string; lines: readonly string[] }>) => Promise<WorkingObservation>): Promise<GraderReply> {
  const reply = gradeRequest(r);
  const d = reply.decision;
  if (!d?.working) return reply;
  const value = d.interpretation && "value" in d.interpretation ? d.interpretation.value : null;
  const working = await assessWorkingAsync(d.questionId, d.response.working, d.verdict, value, observe);
  return { ...reply, decision: { ...d, working } };
}

if (typeof process !== "undefined" && process.argv[1] && /grader\.(mjs|ts)$/.test(process.argv[1])) {
  let raw = "";
  process.stdin.setEncoding("utf8");
  process.stdin.on("data", (d) => { raw += d; if (raw.length > 1_000_000) process.exit(2); });
  process.stdin.on("end", async () => {
    let input: unknown;
    try { input = JSON.parse(raw); } catch { process.stdout.write(JSON.stringify({ v: SERVER_GRADER_VERSION, known: false, verdict: "unknown", credit: null, reason: "unreadable request" })); return; }
    const run = async (x: any) => {
      if (x?.operation === "reentry") return reentryEligibility(x as ReentryRequest);
      const reply=gradeRequest(x as GraderRequest), d=reply.decision;
      // Operator-selected, per owned persisted opt-in; never a field accepted from client JSON.
      if(process.env.OPENPATH_GEOMETRY_ROOT && process.env.OPENPATH_GEOMETRY_PYTHON && d?.working) {
        const working=await geometryWorking(d.questionId,d.response.working,d.response.raw,d.working,{root:process.env.OPENPATH_GEOMETRY_ROOT,python:process.env.OPENPATH_GEOMETRY_PYTHON});
        return {...reply,decision:{...d,working}};
      }
      return reply;
    };
    try { const out=Array.isArray(input)?await Promise.all(input.slice(0,500).map(run)):await run(input); process.stdout.write(JSON.stringify(out)); }
    finally { stopGeometryWorkers(); }
  });
}
