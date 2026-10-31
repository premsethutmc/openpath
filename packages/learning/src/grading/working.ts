/**
 * working-assessment@1 (Workstream D1): what the trusted grader can say about a learner's submitted WORKING, beside — never inside — the
 * answer verdict. It adds no mathematics of its own: every judgement comes from the P2 derivation authority through its one interface
 * (derivation-interface.ts authorizeWorking, which replays the certificate chain) and from the authority's own working evidence
 * (derivation-authority.ts assessChain). This module only reads the task statement from the question's own definition and arranges the
 * authority's result into the five things the learner journey must keep apart:
 *
 *   answer correctness       grading-decision@1 verdict (unchanged; not decided here)
 *   method verification      methodEvidence: method-verified only for an authorized, replayed chain that shows a step (answer-vs-method@1)
 *   derivation completeness  completeness: complete / incomplete (a valid partial derivation is not a solution)
 *   unsupported working      status "unsupported": nothing is concluded about the method, either way (fail-closed)
 *   first invalid step       firstInvalid: only where the authority refutes a line with a certain counterexample
 *
 * A bare answer ("x = 5", or the answer as the only working line) is never method evidence and is never reported as an invalid step: the
 * learner's intermediate reasoning is not invented. The statement is taken from the question (family contract or `Question.statement`), never
 * from the request, so a client cannot choose what its working is judged against.
 */
import { question } from "../content.ts";
import { FAMILIES, problemOf } from "../families.ts";
import { assessChain, evalTree, substituteVars } from "../derivation-authority.ts";
import { authorizeWorking, workingEvidence, type DerivationAuthorization, type WorkingEvidence } from "../derivation-interface.ts";
import { parseTree } from "../rewrite-registry.ts";

export const WORKING_ASSESSMENT = "working-assessment@1" as const;
export type WorkingStatus = "none" | "answer-only" | "verified" | "partial" | "invalid" | "unsupported";
export interface WorkingAssessment {
  schema: typeof WORKING_ASSESSMENT;
  /** the task as the authority read it (from the question's own definition), or null when the question has none */
  statement: string | null;
  status: WorkingStatus;
  /** what the evidence layer may conclude about the method (derivation-interface workingEvidence, answer-vs-method@1) */
  methodEvidence: WorkingEvidence;
  completeness: "complete" | "incomplete" | "no-working";
  /** one entry per submitted working line: certified-* / invalid / unsupported, and the certified move */
  lines: { text: string; status: string; move: string | null }[];
  /** the earliest line the authority refutes, the line it came from, and the authority's counterexample */
  firstInvalid: { index: number; text: string; from: string; reason: string; lost: string | null; gained: string | null } | null;
  /** the final answer stated in the working, judged by the authority against the task (null when the working states none) */
  workingAnswer: { claimed: string; correct: boolean | null } | null;
  /** whether the working's final answer is the submitted answer (null when either is missing or unreadable) */
  agreesWithResponse: boolean | null;
  /** the submitted answer put back into the task (only for an incorrect answer to a one-variable equation the authority can evaluate) */
  substitution: { variable: string; value: string; left: string; right: string; leftValue: string; rightValue: string; holds: boolean } | null;
  certificates: string[];
  replayed: boolean;
  /** how many leading working lines are covered by an authorized certificate chain that was replayed from the task (for invalid working: the
   *  valid lines before the first invalid one, authorized and replayed on their own) */
  replayedLines: number;
  reason: string;
  versions: DerivationAuthorization["versions"];
}

/** The task statement the authority reads for a question: its family contract's, else the question's own `statement`, else null. */
export function taskStatement(qid: string): string | null {
  const p = problemOf(qid.replace(/:(mc|w)$/, ""));
  if (p) return FAMILIES.get(p.family)?.contract?.statement?.(p.params) ?? null;
  try { return question(qid).statement ?? null; } catch { return null; }
}

type R = { n: bigint; d: bigint };
const showR = (r: R) => (r.d === 1n ? `${r.n}` : `${r.n}/${r.d}`);
const norm = (s: string) => s.replace(/[−–—]/g, "-").replace(/[×·]/g, "*").replace(/÷/g, "/").trim();
const valueOf = (s: string): R | null => { const t = /^-?\d+(?:\/\d+)?$/.test(norm(s)) ? parseTree(norm(s)) : null; return t ? (evalTree(t) as R | null) : null; };
const sameR = (a: R | null, b: R | null) => !!a && !!b && a.n * b.d === b.n * a.d;
const exactOf = (c: unknown): string | null => (c && typeof c === "object" && (c as { kind?: string }).kind === "exact" ? String((c as { value: unknown }).value) : null);

/** the submitted value put into both sides of a one-variable equation, evaluated exactly; null when that cannot be done exactly */
function substitute(statement: string, value: string): WorkingAssessment["substitution"] {
  const sides = norm(statement).split("=");
  if (sides.length !== 2 || !valueOf(value)) return null;
  const vars = [...new Set(norm(statement).match(/[a-z]/gi) ?? [])];
  if (vars.length !== 1) return null;
  const [l, r] = sides.map((s) => parseTree(s.trim()));
  if (!l || !r) return null;
  const v = norm(value), lv = evalTree(substituteVars(l, { [vars[0]]: v })) as R | null, rv = evalTree(substituteVars(r, { [vars[0]]: v })) as R | null;
  if (!lv || !rv) return null;
  return { variable: vars[0], value: v, left: sides[0].trim(), right: sides[1].trim(), leftValue: showR(lv), rightValue: showR(rv), holds: sameR(lv, rv) };
}

/**
 * The working assessment for one submission, or undefined when the question has no task statement AND no working was submitted (so a
 * decision for every other kind of question is exactly what it was). `verdict` and `value` are the answer decision's own (read-only).
 */
export function assessWorking(qid: string, working: readonly string[], verdict: string, value: string | null): WorkingAssessment | undefined {
  const statement = taskStatement(qid);
  const lines = working.map((l) => String(l ?? "").trim()).filter((l) => l.length > 0);
  if (!statement && !lines.length) return undefined;
  const substitution = statement && verdict === "incorrect" && value !== null ? substitute(statement, value) : null;
  const auth = statement && lines.length ? authorizeWorking(statement, lines) : null;
  const base = {
    schema: WORKING_ASSESSMENT, statement, substitution,
    versions: auth?.versions ?? authorizeWorking("", []).versions,
  } as const;
  const empty = { lines: lines.map((text) => ({ text, status: "unsupported", move: null })), firstInvalid: null, workingAnswer: null, agreesWithResponse: null, certificates: [], replayed: false, replayedLines: 0 };
  if (!lines.length) return { ...base, ...empty, status: "none", methodEvidence: "no-method-evidence", completeness: "no-working", reason: "no working submitted: a bare answer is not method evidence" };
  if (!statement || !auth) return { ...base, ...empty, status: "unsupported", methodEvidence: "no-method-evidence", completeness: "incomplete", reason: "this question has no task statement the authority can read: the working was not judged" };
  const v = assessChain(statement, lines);
  const ev = v.evidence;
  const claimed = ev.finalAnswer.present && ev.finalAnswer.claimed ? ev.finalAnswer.claimed : null;
  const claimedValue = claimed ? valueOf(claimed.split("=").at(-1) ?? "") : null;
  const common = {
    lines: lines.map((text, i) => ({ text, status: ev.transitions[i]?.status ?? "unsupported", move: ev.transitions[i]?.move ?? null })),
    workingAnswer: claimed ? { claimed, correct: ev.finalAnswer.correct } : null,
    agreesWithResponse: claimedValue && value !== null && valueOf(value) ? sameR(claimedValue, valueOf(value)) : null,
    certificates: auth.certificates, replayed: auth.replayed, replayedLines: auth.status === "authorized" && auth.replayed ? lines.length : 0,
  };
  const evidence = workingEvidence(auth);
  // the answer alone, written as the only working line: no method was shown, and nothing is said about reasoning the learner did not write
  if (lines.length === 1 && ev.completeness === "complete" && ev.finalAnswer.present && (auth.status !== "authorized" || evidence !== "method-verified"))
    return { ...base, ...common, lines: common.lines.map((l) => ({ ...l, status: "answer-only" })), firstInvalid: null, certificates: [], replayed: false, replayedLines: 0, status: "answer-only", methodEvidence: "no-method-evidence", completeness: "complete", reason: "the working is the answer alone: no method shown" };
  if (auth.status === "authorized") {
    const complete = ev.completeness === "complete";
    return { ...base, ...common, firstInvalid: null, status: complete ? (evidence === "method-verified" ? "verified" : "answer-only") : "partial", methodEvidence: evidence, completeness: complete ? "complete" : "incomplete", reason: auth.reason };
  }
  if (auth.status === "invalid" && auth.at !== null) {
    const t = ev.transitions[auth.at];
    // the lines before the first invalid one are authorized (and replayed) on their own, through the same interface: "3x = 15" stays a checked step
    const prefix = auth.at > 0 ? authorizeWorking(statement, lines.slice(0, auth.at)) : null;
    const pre = prefix?.status === "authorized" && prefix.replayed ? prefix : null;
    return {
      ...base, ...common, status: "invalid", certificates: pre?.certificates ?? [], replayed: !!pre, replayedLines: pre ? auth.at : 0, methodEvidence: evidence, completeness: ev.completeness === "complete" ? "complete" : "incomplete", reason: auth.reason,
      firstInvalid: { index: auth.at, text: lines[auth.at], from: auth.at === 0 ? statement : lines[auth.at - 1], reason: t?.reason ?? auth.reason, lost: exactOf(t?.counterexample?.lost), gained: exactOf(t?.counterexample?.gained) },
    };
  }
  // unsupported: outside what the authority can judge. Not wrong, not verified; the working's own answer is not reported either.
  return { ...base, ...common, workingAnswer: null, agreesWithResponse: null, firstInvalid: null, certificates: [], replayed: false, replayedLines: 0, status: "unsupported", methodEvidence: "no-method-evidence", completeness: ev.completeness === "complete" ? "complete" : "incomplete", reason: auth.reason };
}

/**
 * Replay of a RECORDED working assessment (D1 certificate compatibility). A record made under another authority version is reported as
 * historical: its recorded result stands and is not re-judged under the current rules. A current record is re-derived from the decision's own
 * question, response and working, and must reproduce the same status, the same first invalid step and the same certificate digests.
 */
export type WorkingReplay = { replay: "replayable-current" | "historical-version-not-replayable" | "failed-replay"; reason: string };
export function replayWorking(d: { questionId: string; verdict: string; interpretation: unknown; response: { raw: string; working: string[] }; working?: WorkingAssessment }): WorkingReplay {
  const w = d.working;
  if (!w) return { replay: "failed-replay", reason: "no working assessment recorded" };
  const now = authorizeWorking("", []).versions;
  if (w.versions.authority !== now.authority || w.versions.registry !== now.registry || w.versions.kernel !== now.kernel)
    return { replay: "historical-version-not-replayable", reason: `recorded under ${w.versions.authority} / ${w.versions.registry} / ${w.versions.kernel}; the recorded result stands, unverified` };
  const value = d.interpretation && typeof d.interpretation === "object" && "value" in d.interpretation ? String((d.interpretation as { value: unknown }).value) : null;
  const again = assessWorking(d.questionId, d.response.working, d.verdict, value);
  if (!again) return { replay: "failed-replay", reason: "the question no longer has a task statement" };
  const same = again.status === w.status && again.methodEvidence === w.methodEvidence && JSON.stringify(again.firstInvalid) === JSON.stringify(w.firstInvalid) && JSON.stringify(again.certificates) === JSON.stringify(w.certificates) && again.replayedLines === w.replayedLines;
  return same ? { replay: "replayable-current", reason: "re-derived: same status, first invalid step and certificate digests" } : { replay: "failed-replay", reason: `re-derived differently: ${again.status} vs recorded ${w.status}` };
}
