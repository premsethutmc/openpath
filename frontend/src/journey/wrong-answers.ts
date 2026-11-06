/**
 * Phase 6 (worker A): shape-preserving wrong answers for simulated learners.
 *
 * learners.ts `wrong()` (unchanged; existing tests depend on it) picks the first candidate the NODE grader marks incorrect; for a
 * tuple answer such as (5, 6) that is "0", which the server in its deployed default mode (OPENPATH_GRADING=shadow, legacy shape check
 * family/legacy_grading._answer_ok) records as UNRESOLVED: not an attempt, the same question asked again. A real learner who gets a
 * pair wrong writes a wrong PAIR. This helper builds wrong answers of the right shape and keeps only those that both
 *   - read as an answer of the question's type under the shared contract (answer-types.ts `readable`), and
 *   - the trusted grader (server-grader.gradeRequest, the code bundled into the server's grader) marks incorrect.
 * deep-recovery-phase6-answers.test.ts checks a sample of every family the simulation reaches against the SERVER's own decision
 * function in both grading modes.
 */
import { question } from "../../../packages/learning/src/content";
import { readable, type AnswerType } from "../../../packages/learning/src/answer-types";
import { problemOf } from "../../../packages/learning/src/families";
import { gradeRequest } from "../../../packages/learning/src/server-grader";
import { misconception, wrong as oldWrong } from "./learners";

const base = (q: string) => q.replace(/:(mc|w)$/, "");
const MINUS = /−/g;
/** a number (integer, decimal, fraction a/b, signed with - or −), shifted by +1 / -1 / +2, written back in the same style */
function shiftNumber(tok: string, d: number): string | null {
  const t = tok.trim(), neg = /^[-−]/.test(t), uni = t.includes("−");
  const body = t.replace(/^[-−]/, "");
  const m = /^(\d+)(?:\/(\d+))?$/.exec(body) ?? /^(\d+\.\d+)$/.exec(body);
  if (!m) return null;
  const sign = neg ? -1 : 1;
  let out: string;
  if (m[2]) { const n = sign * Number(m[1]) + d * Number(m[2]); out = `${Math.abs(n)}/${m[2]}`; return (n < 0 ? (uni ? "−" : "-") : "") + out; }
  const v = sign * Number(m[1]) + d;
  out = String(Math.abs(Number(v.toFixed(6))));
  return (v < 0 ? (uni ? "−" : "-") : "") + out;
}
/** perturb one top-level component of "(a, b, …)" (or an unbracketed "a, b") */
function tupleVariants(ans: string): string[] {
  const open = ans.trim().startsWith("(") ? "(" : ans.trim().startsWith("[") ? "[" : "";
  const close = open === "(" ? ")" : open === "[" ? "]" : "";
  const inner = open ? ans.trim().slice(1, -1) : ans;
  const parts: string[] = []; let depth = 0, cur = "";
  for (const ch of inner) { if ("([{".includes(ch)) depth++; if (")]}".includes(ch)) depth--; if (ch === "," && depth === 0) { parts.push(cur); cur = ""; } else cur += ch; }
  parts.push(cur);
  if (parts.length < 2) return [];
  const out: string[] = [];
  for (const d of [1, -1, 2]) for (let i = parts.length - 1; i >= 0; i--) {
    const s = shiftNumber(parts[i], d);
    if (s === null) continue;
    const lead = parts[i].match(/^\s*/)![0];
    out.push(open + parts.map((p, j) => (j === i ? lead + s : p)).join(",") + close);
  }
  return out;
}
/** an expression answer with its first numeric coefficient changed (same shape), else simple readable expressions */
function expressionVariants(ans: string): string[] {
  const out: string[] = [];
  const m = /\d+/.exec(ans);
  if (m) out.push(ans.slice(0, m.index) + String(Number(m[0]) + 1) + ans.slice(m.index + m[0].length));
  out.push("0", "x", "1");
  return out;
}

/** answer-types.readable covers the answers@2 types only; for the older types this mirrors the server's shape check
 *  (backend/family/legacy_grading._answer_ok: NUMBER, RATIONAL, MIXED, set, polynomial). A mirror, not an authority: the phase-6
 *  answers test checks every sampled answer against the server's own decision. */
const NUMBER = /^[+-]?\d{1,9}(?:\.\d{0,9})?$/, RATIONAL = /^[+-]?\d{1,30}(?:\.\d{1,30})?(?:\/[+-]?\d{1,30})?$/, MIXED = /^([+-]?)(\d{1,30})\s+(\d{1,30})\/(\d{1,30})$/;
function shapeOk(type: AnswerType, raw: string): boolean {
  const t = raw.trim().replace(MINUS, "-");
  if (type === "integer") return NUMBER.test(t);
  if (type === "fraction") return (RATIONAL.test(t) || MIXED.test(t)) && !/\/[+-]?0+$/.test(t);
  if (type === "set") { const parts = t.replace(/^\{|\}$/g, "").split(",").map((p) => p.trim()); return parts.length > 0 && parts.length <= 30 && parts.every((p) => RATIONAL.test(p)); }
  if (type === "polynomial") return /^[0-9x+\-*^() /.²³]{1,60}$/.test(t);
  return readable(type, raw);
}
export interface ShapedWrong { answer: string; source: "shaped" | "fallback-old" }
const cache = new Map<string, ShapedWrong>();
/** a wrong answer of the question's own shape that the shared contract reads and the trusted grader marks incorrect */
export function shapedWrong(qid: string): ShapedWrong {
  const hit = cache.get(qid);
  if (hit) return hit;
  const b = base(qid), q = question(b), type = q.type as AnswerType, ans = String(q.answer);
  const cands: string[] = [];
  const options = q.options?.length || qid.endsWith(":mc");
  if (options) cands.push(...["A", "B", "C", "D"]);
  else {
    if (/,/.test(ans)) cands.push(...tupleVariants(ans));
    for (const d of [1, -1, 2]) { const s = shiftNumber(ans, d); if (s !== null) cands.push(s); }
    if (type === "expression" || type === "antiderivative" || type === "exact" || type === "polynomial") cands.push(...expressionVariants(ans));
    // any other structured answer (intervals, sets, ratios ...): one number inside it changed, the structure kept
    for (const re of [/\d+/, /\d+(?!.*\d)/]) { const m = re.exec(ans); if (m) cands.push(ans.slice(0, m.index) + String(Number(m[0]) + 1) + ans.slice(m.index + m[0].length)); }
    cands.push("0", "1", "-1", "2");
  }
  // never the answer a modelled misconception predicts (that would be evidence of the misconception, not a plain error)
  const modelled = new Set((problemOf(b)?.bugs ?? []).map((x) => misconception(qid, new Set([x.id]))).filter((x): x is string => x !== null));
  const graded = (c: string) => gradeRequest({ id: qid, response: c }).verdict === "incorrect";
  const ok = (c: string) => !modelled.has(c) && (options || shapeOk(type, c)) && graded(c);
  // a pick from options is always well-formed: when every wrong option is a modelled misconception, one of them is used
  const pick = cands.find(ok) ?? (options ? cands.find(graded) : undefined);
  const res: ShapedWrong = pick !== undefined ? { answer: pick, source: "shaped" } : { answer: oldWrong(qid), source: "fallback-old" };
  cache.set(qid, res);
  return res;
}
export const wrongShaped = (qid: string) => shapedWrong(qid).answer;
