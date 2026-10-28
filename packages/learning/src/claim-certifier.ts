/**
 * E7 claim certifier (Phase 2 form of the final accounting).
 *
 * Takes the raw submission, builds the claim ledger independently of every parser, accounts each claim against the line records a route
 * actually produced, and decides which claims block certification. It also decides student-introduced restrictions against the (immutable)
 * task restrictions: a demonstrable contradiction is `disproven`; anything else is carried as a student-stated premise, never as a task fact.
 *
 * It can only withdraw an acceptance (or turn a contradicted submission into `invalid`); it never grants one.
 */
import { accountForLedger, extractLedger, type ClaimLedger, type CoverageRecord, type LedgerClaim } from "./claim-ledger.ts";

// ------------------------------------------------------------------------------------------------ exact one-variable constraints
type Q = { n: bigint; d: bigint };
const gcd = (a: bigint, b: bigint): bigint => { a = a < 0n ? -a : a; b = b < 0n ? -b : b; while (b) [a, b] = [b, a % b]; return a || 1n; };
const q = (n: bigint, d = 1n): Q => { if (d < 0n) { n = -n; d = -d; } const g = gcd(n, d); return { n: n / g, d: d / g }; };
const cmp = (a: Q, b: Q) => { const l = a.n * b.d, r = b.n * a.d; return l < r ? -1 : l > r ? 1 : 0; };
export interface Constraint { v: string; op: "<" | "<=" | ">" | ">=" | "=" | "!="; bound: Q }
const NUM = String.raw`-?\d+(?:\.\d+)?(?:\s*/\s*\d+)?`;
function readNum(t: string): Q | null {
  const m = new RegExp(`^\\s*(-?)(\\d+)(?:\\.(\\d+))?(?:\\s*/\\s*(\\d+))?\\s*$`).exec(t.replace(/−/g, "-")); if (!m) return null;
  let n = BigInt(m[2] + (m[3] ?? "")), d = 10n ** BigInt((m[3] ?? "").length); if (m[4]) { if (BigInt(m[4]) === 0n) return null; d *= BigInt(m[4]); } if (m[1]) n = -n; return q(n, d);
}
const flip = (op: Constraint["op"]): Constraint["op"] => (op === "<" ? ">" : op === "<=" ? ">=" : op === ">" ? "<" : op === ">=" ? "<=" : op);
/** "x > 0", "-2 < x <= 3", "x != 2", "x≠2"; null when the text is not a one-variable numeric constraint */
export function parseConstraints(text: string): Constraint[] | null {
  const t = text.replace(/[≤]/g, "<=").replace(/[≥]/g, ">=").replace(/[≠]/g, "!=").replace(/−/g, "-").replace(/\s+/g, " ").trim().replace(/[.;,]+$/, "");
  const parts = t.split(/(<=|>=|!=|<|>|=)/).map((x) => x.trim());
  if (parts.length < 3 || parts.length % 2 === 0) return null;
  const out: Constraint[] = [];
  for (let k = 1; k < parts.length; k += 2) {
    const l = parts[k - 1], op = parts[k] as Constraint["op"], r = parts[k + 1];
    const ln = readNum(l), rn = readNum(r);
    if (/^[A-Za-z]$/.test(l) && rn) out.push({ v: l, op, bound: rn });
    else if (ln && /^[A-Za-z]$/.test(r)) out.push({ v: r, op: flip(op), bound: ln });
    else return null;
  }
  return out;
}
/** true when the conjunction has no real solution; false when it has one; null when undecidable here (never the case for one-variable numeric constraints) */
export function emptyConjunction(cs: Constraint[]): boolean {
  const vars = [...new Set(cs.map((c) => c.v))];
  for (const v of vars) {
    let lo: Q | null = null, loS = false, hi: Q | null = null, hiS = false; const ne: Q[] = []; let eq: Q | null = null;
    for (const c of cs.filter((x) => x.v === v)) {
      if (c.op === ">" || c.op === ">=") { const s = c.op === ">"; if (!lo || cmp(c.bound, lo) > 0 || (cmp(c.bound, lo) === 0 && s)) { lo = c.bound; loS = s; } }
      else if (c.op === "<" || c.op === "<=") { const s = c.op === "<"; if (!hi || cmp(c.bound, hi) < 0 || (cmp(c.bound, hi) === 0 && s)) { hi = c.bound; hiS = s; } }
      else if (c.op === "=") { if (eq && cmp(eq, c.bound) !== 0) return true; eq = c.bound; } else ne.push(c.bound);
    }
    if (eq) { if (lo && (cmp(eq, lo) < 0 || (cmp(eq, lo) === 0 && loS))) return true; if (hi && (cmp(eq, hi) > 0 || (cmp(eq, hi) === 0 && hiS))) return true; if (ne.some((x) => cmp(x, eq!) === 0)) return true; continue; }
    if (lo && hi) { const c = cmp(lo, hi); if (c > 0 || (c === 0 && (loS || hiS || ne.some((x) => cmp(x, lo!) === 0)))) return true; }
  }
  return false;
}

// ------------------------------------------------------------------------------------------------ task restrictions
export interface TaskDomain { conjunction: Constraint[]; components: Constraint[][] | null }
export function taskDomain(problem: unknown): TaskDomain {
  const p = problem as { restrictions?: unknown; domainComponents?: unknown };
  const conj: Constraint[] = [];
  for (const s of Array.isArray(p?.restrictions) ? p.restrictions : []) if (typeof s === "string") { const c = parseConstraints(s); if (c) conj.push(...c); }
  let comps: Constraint[][] | null = null;
  if (Array.isArray(p?.domainComponents)) { comps = []; for (const s of p.domainComponents) { const c = typeof s === "string" ? parseConstraints(s) : null; if (c) comps.push(c); } if (!comps.length) comps = null; }
  return { conjunction: conj, components: comps };
}
/** A student-introduced restriction contradicts the task only when it is incompatible with EVERY component of the task domain. */
export function contradictsTask(student: Constraint[], dom: TaskDomain): boolean {
  if (!dom.conjunction.length && !dom.components) return false;
  const base = dom.components ?? [[]];
  return base.every((comp) => emptyConjunction([...dom.conjunction, ...comp, ...student]));
}

export interface LedgerVerdict { ledger: ClaimLedger; blocking: LedgerClaim[]; disproven: LedgerClaim[]; unfinished: { line: number; text: string }[]; summary: { line: number; text: string; kind: string; outcome: string; reason: string }[] }
/** Account every claim of the submission against the records a route produced. */
export function evaluateLedger(problem: unknown, text: unknown, records: CoverageRecord[]): LedgerVerdict {
  const ledger = extractLedger(text);
  // an "assumption" that is not a numeric restriction is an ordinary claim and must be checked like one
  for (const c of ledger.claims) if (c.kind === "assumption" && !c.names && !parseConstraints(c.text)) c.kind = "relation";
  const { blocking } = accountForLedger(ledger, records);
  const dom = taskDomain(problem); const disproven: LedgerClaim[] = []; const still: LedgerClaim[] = [];
  for (const c of ledger.claims) {
    if (c.kind !== "assumption") continue;
    if (c.names) { // a named modelling assumption: carried as a premise with its provenance; denying a task-supplied assumption is a contradiction
      const supplied = new Set(Array.isArray((problem as { assumptions?: unknown })?.assumptions) ? ((problem as { assumptions: string[] }).assumptions) : []);
      if ((problem as { coefficientDomain?: string })?.coefficientDomain === "real") supplied.add("real-coefficients");
      const denied = c.names.find((n) => n.negated && supplied.has(n.name));
      if (denied) { c.outcome = "disproven"; c.reason = `the working denies the task-supplied assumption "${denied.name}" (task assumptions are immutable)`; disproven.push(c); }
      else { c.outcome = "proven"; c.reason = c.names.every((n) => supplied.has(n.name) && !n.negated) ? "restates an assumption supplied by the task (provenance: task-supplied)" : "student-stated premise (provenance: student-stated, not a task fact)"; }
      continue;
    }
    const cs = parseConstraints(c.text);
    if (cs && contradictsTask(cs, dom)) { c.outcome = "disproven"; c.reason = `the assumed condition "${c.text}" contradicts the task restriction (task restrictions are immutable; a student assumption cannot replace them)`; disproven.push(c); }
    else if (cs) { c.outcome = "proven"; c.reason = "student-stated premise, compatible with the task restrictions (provenance: student-stated, not a task fact)"; }
    else { c.outcome = "unresolved"; c.reason = "a student-stated condition that is not a numeric one-variable restriction: compatibility with the task is not decided"; still.push(c); }
  }
  // the working itself declares that it is unfinished ("with the numerator still to be combined"): that statement can only withdraw an acceptance
  const UNFINISHED = /\b(?:still\s+to|to\s+be\s+(?:combined|simplified|completed|finished|done)|not\s+(?:yet\s+)?(?:simplified|finished|complete|done)|remains?\s+to|left\s+to|need(?:s)?\s+to\s+(?:simplify|finish|combine|complete)|unfinished|incomplete|to\s+do|todo|work\s+in\s+progress)\b/i;
  const unfinished = ledger.lines.flatMap((l) => l.residue.filter((r) => UNFINISHED.test(r.text)).map((r) => ({ line: l.line, text: r.text })));
  const all = [...blocking.filter((c) => c.kind !== "assumption"), ...still];
  return { ledger, blocking: all, disproven, unfinished, summary: ledger.claims.map((c) => ({ line: c.line, text: c.text, kind: c.kind, outcome: c.outcome, reason: c.reason })) };
}
