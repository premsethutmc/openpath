/**
 * The trusted server-side grader. It receives ONLY a question id, the student's response and permitted working (JSON on stdin); the contract
 * (expected answer, kernel object, domain restrictions) is rebuilt here from the generator's own definition, never taken from the request.
 * It answers for questions whose contract is `verified` and says so explicitly; for everything else it reports the route (legacy / held / human)
 * and decides nothing, so the caller keeps its stored-answer comparison and labels it legacy.
 *   in : {"id": "gen:det2:2,5,3,5", "response": "-5", "working": ["..."]}  (or an array of these)
 *   out: {"v":1,"id":...,"verification":"verified"|"legacy"|"held"|"human","credit":true|false|null,"expected":"<stored answer>","capability":"typed-kernel"|...,"reason":"...","ms":0.1}
 */
import { assessSubmission, contractFor } from "./assessment.ts";

export const SERVER_GRADER_VERSION = 1 as const;
export interface GraderRequest { id: string; response: string; working?: string[] }
export interface GraderReply { v: typeof SERVER_GRADER_VERSION; id: string; verification: "verified" | "legacy" | "held" | "human" | "unknown"; credit: boolean | null; expected: string | null; capability: string; reason: string; ms: number }

export function gradeRequest(r: GraderRequest): GraderReply {
  const t0 = performance.now(), ms = () => +(performance.now() - t0).toFixed(3);
  const none = (verification: GraderReply["verification"], reason: string, expected: string | null = null, capability = "none"): GraderReply => ({ v: SERVER_GRADER_VERSION, id: String(r?.id ?? ""), verification, credit: null, expected, capability, reason, ms: ms() });
  if (!r || typeof r.id !== "string" || typeof r.response !== "string" || r.response.length > 400) return none("unknown", "malformed request");
  const working = Array.isArray(r.working) ? r.working.filter((l) => typeof l === "string").slice(0, 8).map((l) => l.slice(0, 80)) : [];
  let c;
  try { c = contractFor(r.id); } catch { return none("unknown", "the contract could not be built"); }
  if (!c) return none("unknown", "not a generated question");
  if (c.verification !== "verified") return none(c.verification, c.reason, c.expected.stored, c.capability);
  // the stored-answer comparison is NOT passed in: the verdict is the kernel's alone
  const a = assessSubmission(c, { response: r.response, working, legacyCorrect: null });
  return { v: SERVER_GRADER_VERSION, id: r.id, verification: "verified", credit: a.credit, expected: c.expected.stored, capability: c.capability, reason: a.feedback.message, ms: ms() };
}

if (typeof process !== "undefined" && process.argv[1] && /grader\.(mjs|ts)$/.test(process.argv[1])) {
  let raw = "";
  process.stdin.setEncoding("utf8");
  process.stdin.on("data", (d) => { raw += d; if (raw.length > 1_000_000) process.exit(2); });
  process.stdin.on("end", () => {
    let input: unknown;
    try { input = JSON.parse(raw); } catch { process.stdout.write(JSON.stringify({ v: SERVER_GRADER_VERSION, verification: "unknown", credit: null, reason: "unreadable request" })); return; }
    const out = Array.isArray(input) ? input.slice(0, 500).map((x) => gradeRequest(x as GraderRequest)) : gradeRequest(input as GraderRequest);
    process.stdout.write(JSON.stringify(out));
  });
}
