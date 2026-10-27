/**
 * E2 proof-integrity layer.
 *
 * Invariant: every nonblank mathematical line of a natural-language submission receives a stable
 * identity and exactly one account. A submission can only be certified when every line is accounted
 * for by a verified claim (or by an exact match against typed problem data) and no line is
 * invalid, unresolved or incomplete. Adapters are never trusted: their line accounts are re-derived
 * from the parser output and rejected on any mismatch (forged ids, reordering, dropped lines).
 */
import { canonicalizeNaturalRelation, stableCanonicalSerialization } from "./canonical-math-ir.ts";
import type { NaturalParseResult, NaturalParsedLine, SourceLocation } from "./natural-working.ts";

export const LINE_ACCOUNT_CONTRACT = "openpath-line-account@1" as const;
export const INTEGRITY_LIMITS = { lines: 64, dependenciesPerLine: 64, certificates: 128 } as const;

export type LineStatus = "verified-valid" | "verified-invalid" | "incomplete" | "unsupported" | "ambiguous" | "malformed" | "inconclusive" | "resource-exhausted";
export type LineRole = "given-matched" | "claim-step" | "non-mathematical" | "unaccounted";
export type StepClassification = "verified" | "invalid" | "incomplete" | "missing-assumption" | "unsupported" | "contradictory" | "resource-exhausted" | "malformed" | "ambiguous";

/** Declared by an adapter: how one parsed line was consumed. */
export interface AccountEntry { lineId: string; role: "given-matched" | "claim-step"; stepIndex?: number; dependsOn?: string[] }

export interface LineRecord {
  id: string;
  line: number;
  span: { start: number; end: number };
  text: string;
  parseStatus: "parsed" | "ambiguous" | "malformed" | "unsupported" | "resource-exhausted";
  relationKind: string;
  canonical: string | null;
  stage: "natural-parse" | "adapter-claim" | "adapter-match";
  role: LineRole;
  stepIndex: number | null;
  dependencies: string[];
  status: LineStatus;
  /** true only when the line is verified-valid and every dependency is itself premise-eligible. */
  premiseEligible: boolean;
  reason: string;
}

export interface LineAccount {
  contract: typeof LINE_ACCOUNT_CONTRACT;
  mathematicalLines: number;
  formattingOnly: { line: number; text: string }[];
  consumed: string[];
  produced: string[];
  unaccounted: string[];
  orderPreserved: boolean;
  records: LineRecord[];
  statuses: Record<string, LineStatus>;
  firstVerifiedInvalidLine: number | null;
  firstInvalidLocalization: "exact" | "limited" | "none";
  limitation: string | null;
  violations: string[];
}

export const stepToLineStatus = (c: StepClassification | undefined): LineStatus =>
  c === "verified" ? "verified-valid" : c === "invalid" ? "verified-invalid" : c === "incomplete" ? "incomplete" : c === "unsupported" ? "unsupported"
  : c === "ambiguous" ? "ambiguous" : c === "malformed" ? "malformed" : c === "resource-exhausted" ? "resource-exhausted" : "inconclusive";

/** Blank and bare-numbering lines are formatting only and are the only lines a parser may omit. */
export function formattingOnlyLines(text: string): { line: number; text: string }[] {
  const rows = String(text ?? "").replace(/\r\n?/g, "\n").split("\n");
  const out: { line: number; text: string }[] = [];
  rows.forEach((row, index) => { if (!row.trim() || /^\s*(?:\d+[.)])\s*$/.test(row) || /^\s*(?:\\\[|\\\]|\$\$|\[|\]|\\begin\{[A-Za-z*]+\}|\\end\{[A-Za-z*]+\})\s*$/.test(row)) out.push({ line: index + 1, text: row }); });
  return out;
}

function canonicalOf(line: NaturalParsedLine): string | null {
  try { return stableCanonicalSerialization(canonicalizeNaturalRelation(line.relation)); } catch { return null; }
}

/** Independently validates an adapter's declared accounts against the parser output. */
export function validateAccounts(parsed: NaturalParseResult, accounts: AccountEntry[] | undefined, steps: number, sourceMap: SourceLocation[] | undefined): string[] {
  const errors: string[] = [];
  if (!Array.isArray(accounts) || !accounts.length) return ["adapter returned no line accounts"];
  if (parsed.lines.length > INTEGRITY_LIMITS.lines) errors.push(`more than ${INTEGRITY_LIMITS.lines} lines`);
  const byId = new Map(parsed.lines.map((l) => [l.id, l]));
  const seen = new Set<string>();
  for (const a of accounts) {
    if (!byId.has(a.lineId)) errors.push(`account references unknown line id ${String(a.lineId)}`);
    else if (seen.has(a.lineId)) errors.push(`line ${a.lineId} is accounted for more than once`);
    seen.add(a.lineId);
    if ((a.dependsOn?.length ?? 0) > INTEGRITY_LIMITS.dependenciesPerLine) errors.push(`line ${a.lineId} exceeds dependency bound`);
    for (const d of a.dependsOn ?? []) if (!byId.has(d)) errors.push(`line ${a.lineId} depends on unknown line ${d}`);
  }
  const missing = parsed.lines.filter((l) => !seen.has(l.id)).map((l) => l.source.line);
  if (missing.length) errors.push(`adapter did not account for source line(s) ${missing.join(", ")}`);
  // accounts must follow the original line order
  const order = accounts.map((a) => parsed.lines.findIndex((l) => l.id === a.lineId));
  if (order.some((v, i) => i && v < order[i - 1])) errors.push("adapter reordered the submitted lines");
  const claims = accounts.filter((a) => a.role === "claim-step");
  if (claims.length !== steps) errors.push(`adapter produced ${steps} step(s) for ${claims.length} claim line(s)`);
  claims.forEach((a, i) => {
    if (a.stepIndex !== i) errors.push(`claim line ${a.lineId} is bound to step ${String(a.stepIndex)}, expected ${i}`);
    const line = byId.get(a.lineId), src = sourceMap?.[i];
    if (line && (!src || src.line !== line.source.line || src.start !== line.source.start || src.end !== line.source.end || src.text !== line.source.text)) errors.push(`source map for step ${i} does not match line ${a.lineId}`);
  });
  return errors;
}

export interface StepOutcome { classification: StepClassification; justification: string }

/**
 * Builds the per-line account once the destination reasoner has judged the claim steps.
 * `steps[i]` is undefined when the reasoner stopped before step i (so the line is inconclusive).
 */
export function buildLineAccount(parsed: NaturalParseResult, accounts: AccountEntry[], steps: (StepOutcome | undefined)[], rawText: string, extraViolations: string[] = [], unaccountedIndexes?: number[]): LineAccount {
  const entryById = new Map(accounts.map((a) => [a.lineId, a]));
  const records: LineRecord[] = [];
  const prior: string[] = [];
  const eligible = new Map<string, boolean>();
  let firstUnresolvedBefore: number | null = null;
  let firstInvalid: number | null = null;
  parsed.lines.forEach((line, index) => {
    const entry = entryById.get(line.id);
    let status: LineStatus, reason: string, role: LineRole, stepIndex: number | null = null;
    if (!entry) { const named = unaccountedIndexes?.includes(index); status = named ? "unsupported" : "inconclusive"; reason = named ? "no verifier accounts for this line, so it is preserved as unsupported" : "line was not certified because other lines are unverified"; role = "unaccounted"; }
    else if (entry.role === "given-matched") { status = "verified-valid"; reason = "matches the typed problem data exactly"; role = "given-matched"; }
    else {
      role = "claim-step"; stepIndex = entry.stepIndex ?? null;
      const outcome = stepIndex === null ? undefined : steps[stepIndex];
      if (!outcome) { status = "inconclusive"; reason = "verification stopped before this line was checked"; }
      else { status = stepToLineStatus(outcome.classification); reason = outcome.justification; }
    }
    const dependencies = entry?.dependsOn ?? (prior.length ? [prior[prior.length - 1]] : []);
    const premise = status === "verified-valid" && dependencies.every((d) => eligible.get(d) === true);
    eligible.set(line.id, premise);
    if (status === "verified-invalid" && firstInvalid === null) { firstInvalid = index; }
    if (status !== "verified-valid" && status !== "verified-invalid" && firstInvalid === null && firstUnresolvedBefore === null) firstUnresolvedBefore = index;
    records.push({ id: line.id, line: line.source.line, span: { start: line.source.start, end: line.source.end }, text: line.source.text, parseStatus: "parsed", relationKind: line.relation.kind,
      canonical: canonicalOf(line), stage: role === "given-matched" ? "adapter-match" : role === "claim-step" ? "adapter-claim" : "natural-parse", role, stepIndex, dependencies, status, premiseEligible: premise, reason });
    prior.push(line.id);
  });
  const unaccounted = records.filter((r) => r.role === "unaccounted").map((r) => r.id);
  let localization: LineAccount["firstInvalidLocalization"] = "none", limitation: string | null = null;
  if (firstInvalid !== null) {
    if (firstUnresolvedBefore !== null) { localization = "limited"; limitation = `line ${records[firstUnresolvedBefore].line} is ${records[firstUnresolvedBefore].status}; the earliest invalid line cannot be asserted with confidence (verified invalid: line ${records[firstInvalid].line})`; }
    else localization = "exact";
  }
  return { contract: LINE_ACCOUNT_CONTRACT, mathematicalLines: parsed.lines.length, formattingOnly: formattingOnlyLines(rawText),
    consumed: records.filter((r) => r.role !== "unaccounted").map((r) => r.id), produced: records.filter((r) => r.role === "claim-step").map((r) => r.id), unaccounted,
    orderPreserved: records.every((r, i) => !i || r.line > records[i - 1].line), records, statuses: Object.fromEntries(records.map((r) => [r.id, r.status])),
    firstVerifiedInvalidLine: firstInvalid, firstInvalidLocalization: localization, limitation, violations: extraViolations };
}

export interface IntegrityVerdict { classification: StepClassification; correct: boolean | null; complete: boolean; firstInvalidStep: number | null; justification: string; obligations: string[] }

/** Maps a complete line account to the only verdicts it can support. */
export function resolveVerdict(account: LineAccount, nativeComplete: boolean, adapterObligations: string[]): IntegrityVerdict {
  const rs = account.records, bad = rs.filter((r) => r.status === "verified-invalid");
  const unresolved = rs.filter((r) => !["verified-valid", "verified-invalid", "incomplete"].includes(r.status));
  const nonValid = rs.filter((r) => r.status !== "verified-valid");
  const lines = (xs: LineRecord[]) => xs.map((r) => r.line).join(", ");
  if (account.violations.length) return { classification: "unsupported", correct: null, complete: false, firstInvalidStep: null, justification: `proof-integrity violation: ${account.violations[0]}`, obligations: account.violations };
  if (bad.length) {
    const first = account.firstInvalidLocalization === "exact" ? rs.findIndex((r) => r.status === "verified-invalid") : null;
    const note = account.limitation ? `; ${account.limitation}` : "";
    return { classification: "invalid", correct: false, complete: false, firstInvalidStep: first, justification: `line ${bad[0].line} is mathematically invalid${note}`, obligations: account.limitation ? [account.limitation] : [] };
  }
  if (unresolved.length) {
    const severity = (s: LineStatus) => ({ "resource-exhausted": 5, ambiguous: 4, malformed: 3, unsupported: 2, inconclusive: 1 } as Record<string, number>)[s] ?? 0;
    const worst = [...unresolved].sort((a, b) => severity(b.status) - severity(a.status))[0];
    const cls: StepClassification = worst.status === "resource-exhausted" ? "resource-exhausted" : worst.status === "ambiguous" ? "ambiguous" : worst.status === "malformed" ? "malformed" : "unsupported";
    return { classification: cls, correct: null, complete: false, firstInvalidStep: null, justification: `line(s) ${lines(unresolved)} could not be verified (${worst.status}); the submission cannot be certified`, obligations: unresolved.map((r) => `verify line ${r.line}: ${r.reason}`) };
  }
  if (nonValid.length || adapterObligations.length || !nativeComplete) {
    const obligations = [...adapterObligations, ...nonValid.map((r) => `complete line ${r.line}: ${r.reason}`)];
    return { classification: "incomplete", correct: null, complete: false, firstInvalidStep: null, justification: obligations[0] ?? "the working does not reach a complete solution", obligations };
  }
  return { classification: "verified", correct: true, complete: true, firstInvalidStep: null, justification: `all ${rs.length} submitted line(s) are accounted for and verified`, obligations: [] };
}

/**
 * When the submission as a whole cannot be parsed, every nonblank line is still preserved with its own
 * parse status (each line is parsed in isolation, bounded) and an explicit unresolved verification status.
 */
export function unparsedLineAccount(input: { format: "natural" | "latex"; text: string }, parseLine: (x: { format: "natural" | "latex"; text: string }) => NaturalParseResult): LineAccount {
  const text = String(input?.text ?? "");
  const rows = text.replace(/\r\n?/g, "\n").split("\n").map((row, index) => ({ row, line: index + 1 })).filter((x) => x.row.trim() && !/^\s*(?:\d+[.)])\s*$/.test(x.row));
  const bounded = rows.length <= INTEGRITY_LIMITS.lines && text.length <= 8192;
  const records: LineRecord[] = (bounded ? rows : []).map(({ row, line }) => {
    const p = parseLine({ format: input.format, text: row });
    const status: LineStatus = p.classification === "parsed" ? "inconclusive" : p.classification;
    return { id: `raw-line-${line}`, line, span: { start: 0, end: row.length }, text: row, parseStatus: p.classification, relationKind: p.classification === "parsed" ? p.lines[0]?.relation.kind ?? "unknown" : "unparsed",
      canonical: null, stage: "natural-parse" as const, role: "unaccounted" as const, stepIndex: null, dependencies: [], status, premiseEligible: false,
      reason: p.classification === "parsed" ? "line parses on its own but the submission as a whole was not interpretable, so it is not verified" : p.message };
  });
  return { contract: LINE_ACCOUNT_CONTRACT, mathematicalLines: rows.length, formattingOnly: formattingOnlyLines(text), consumed: [], produced: [], unaccounted: records.map((r) => r.id), orderPreserved: true, records,
    statuses: Object.fromEntries(records.map((r) => [r.id, r.status])), firstVerifiedInvalidLine: null, firstInvalidLocalization: "none", limitation: bounded ? null : "line or character bound exceeded; per-line records omitted", violations: [] };
}
