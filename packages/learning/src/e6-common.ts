/**
 * E6 shared plumbing: source-preserving rows, line judgements, the per-line builder (one typed judgement + one independent evidence record per line),
 * prose understanding (assumption statements, conclusions) and the plan shape handed to the unified engine.
 * Nothing here decides mathematics; the calculus and number-chain binders do.
 */
import type { NaturalParseResult, NaturalParsedLine, SourceLocation } from "./natural-working.ts";
import type { AccountEntry, StepClassification, StepOutcome } from "./proof-integrity.ts";
import type { BindingEvidence } from "./acceptance-gate.ts";
import { digestOf } from "./geometry-binder-e5.ts";
import { normalize, splitEquals } from "./e6-parse.ts";
import { extractLedger } from "./claim-ledger.ts";
import type { Grounding } from "./claim-grounding.ts";

export const GENERALIZATION_E6_CONTRACT = "openpath-natural-generalization-e6@1" as const;
export const LIMITS = { characters: 8192, lines: 64, members: 10 } as const;
export const E6_CHECKER = "e6-independent-exact" as const;

export type JS = "valid" | "invalid" | "unsupported" | "missing-assumption" | "incomplete" | "ambiguous" | "malformed" | "resource-exhausted";
export interface Judge { status: JS; reason: string; scope?: string; digest?: string | null; /** the line carries no mathematical claim: it earns NO verification credit and produces no evidence */ nonMath?: boolean; /** E7: provenance of the claim (task premises / derived facts it rests on) */ grounding?: Grounding }
export const ok = (reason: string, scope = "independent exact check", digest?: string | null): Judge => ({ status: "valid", reason, scope, digest: digest ?? null });
export const nonMath = (reason: string): Judge => ({ status: "valid", reason, scope: "non-mathematical", digest: null, nonMath: true });
export const bad = (reason: string): Judge => ({ status: "invalid", reason });
export const uns = (reason: string): Judge => ({ status: "unsupported", reason });
export const missing = (reason: string): Judge => ({ status: "missing-assumption", reason });
export const incomplete = (reason: string): Judge => ({ status: "incomplete", reason });
const PRI: JS[] = ["invalid", "resource-exhausted", "ambiguous", "malformed", "unsupported", "missing-assumption", "incomplete", "valid"];
export function worst(xs: Judge[]): Judge {
  for (const st of PRI) { const j = xs.find((x) => x.status === st); if (j) return st === "valid" ? { ...j, digest: digestOf(xs.map((x) => x.digest ?? j.reason)) } : j; }
  return uns("nothing to judge");
}
const toStepClass = (s: JS): StepClassification => (s === "valid" ? "verified" : s === "missing-assumption" || s === "incomplete" ? "incomplete" : s);

export interface Row { source: SourceLocation; raw: string; plain: string; index: number; /** a recognized mathematical statement that is not in relation form (found by the claim ledger) */ verbal?: boolean }
export function prepareRows(text: unknown): Row[] | { error: string; resource?: boolean } {
  if (typeof text !== "string") return { error: "natural input requires a text string" };
  if (text.length > LIMITS.characters) return { error: `input exceeds ${LIMITS.characters} characters`, resource: true };
  const out: Row[] = []; const rows = text.replace(/\r\n?/g, "\n").split("\n");
  rows.forEach((original, index) => {
    if (/^\s*(?:\$\$|\\\[|\\\]|\\begin\{[^}]*\}|\\end\{[^}]*\}|-{3,}|={3,})\s*$/.test(original)) return;
    const trimmed = original.replace(/^\s*(?:\d+[.)])\s*/, "").trim(); if (!trimmed) return;
    const start = original.indexOf(trimmed);
    out.push({ source: { line: index + 1, start, end: start + trimmed.length, text: original }, raw: trimmed, plain: "", index: out.length });
  });
  if (out.length > LIMITS.lines) return { error: `more than ${LIMITS.lines} lines`, resource: true };
  if (!out.length) return { error: "no working was submitted" };
  for (const r of out) r.plain = normalize(r.raw);
  // E7 claim ledger: a sentence that carries mathematical claims is never skipped as prose. Each claim becomes its own row with its own source span,
  // so a claim embedded in prose is judged (relations) or refused (statements that cannot be interpreted) instead of being preserved unexamined.
  { const ledger = extractLedger(text); const byLine = new Map(ledger.lines.map((l) => [l.line, l])); const expanded: Row[] = [];
    for (const r of out) {
      const ll = byLine.get(r.source.line);
      if (ll && ll.claims.length && isProse(r.plain)) for (const c of ll.claims) expanded.push({ source: { line: r.source.line, start: c.start, end: c.end, text: r.source.text }, raw: c.text, plain: normalize(c.text), index: 0, verbal: c.kind === "assertion" });
      else expanded.push(r);
    }
    if (expanded.length > LIMITS.lines) return { error: `more than ${LIMITS.lines} claims`, resource: true };
    out.length = 0; expanded.forEach((r, i) => { r.index = i; out.push(r); }); }
  // a row that begins with "=" continues the previous row's last member (the line itself stays a separate, accounted row)
  for (let i = 1; i < out.length; i++) {
    if (/^=(?!=)/.test(out[i].plain) && out[i - 1].plain.includes("=")) { const parts = splitEquals(out[i - 1].plain); const last = parts[parts.length - 1]; if (last && last.trim()) out[i].plain = `${last.trim()} ${out[i].plain}`; }
  }
  return out;
}

export class Builder {
  readonly records: { id: string; judge: Judge; dependsOn: string[]; evidence: BindingEvidence | null }[] = [];
  constructor(readonly parsed: NaturalParseResult, readonly destination: string) {}
  add(index: number, judge: Judge, dependsOn: number[] | "prev" = "prev"): void {
    const line = this.parsed.lines[index];
    const deps = dependsOn === "prev" ? (index ? [this.parsed.lines[index - 1].id] : []) : dependsOn.map((i) => this.parsed.lines[i].id);
    const evidence: BindingEvidence | null = judge.status === "valid" && !judge.nonMath
      ? { lineId: line.id, line: line.source.line, claim: line.source.text, checker: E6_CHECKER, destination: this.destination, scope: judge.scope ?? "independent exact check", outcome: "verified", detail: judge.reason, digest: judge.digest ?? digestOf([line.source.text, judge.reason]), ...(judge.grounding ? { grounding: judge.grounding } : {}) }
      : null;
    this.records[index] = { id: line.id, judge, dependsOn: deps, evidence };
  }
}
export function syntheticParse(rows: Row[], kind: string): NaturalParseResult {
  const lines: NaturalParsedLine[] = rows.map((r, i) => ({ id: `e6-line-${i + 1}`, source: r.source, relation: { kind: kind as never, notation: r.plain } as never }));
  return { contractVersion: "openpath-natural-math-input@1" as NaturalParseResult["contractVersion"], classification: "parsed", lines, message: "notation translated into typed claims (E6)" };
}

export interface E6Plan {
  parsed: NaturalParseResult; accounts: AccountEntry[]; outcomes: (StepOutcome | undefined)[]; evidence: BindingEvidence[];
  nativeComplete: boolean; obligations: string[]; terminal: "missing-assumption" | null;
  domain: string; family: string; destination: string; notes: string[]; restrictions: string[];
  /** typed final value the independent route reached (for the destination cross-check); null when none */
  finalValue?: { kind: "expression" | "value" | "limit" | "boolean" | "numeric"; text: string } | null;
  /** evidence about how many lines were rejected/abstained for diagnostics */
  diagnostics: { lines: number; judged: Record<string, number> };
}
export function finish(parsed: NaturalParseResult, b: Builder, args: { domain: string; family: string; nativeComplete: boolean; obligations: string[]; notes: string[]; restrictions?: string[]; finalValue?: E6Plan["finalValue"] }): E6Plan {
  const accounts: AccountEntry[] = parsed.lines.map((l, i) => (b.records[i]?.judge.nonMath ? { lineId: l.id, role: "non-mathematical" as const, dependsOn: b.records[i]?.dependsOn ?? [] } : { lineId: l.id, role: "claim-step" as const, stepIndex: i, dependsOn: b.records[i]?.dependsOn ?? [] }));
  const outcomes: (StepOutcome | undefined)[] = parsed.lines.map((_, i) => { const r = b.records[i]; return r ? { classification: toStepClass(r.judge.status), justification: r.judge.reason } : undefined; });
  const statuses = b.records.map((r) => r?.judge.status);
  const only = (s: JS) => statuses.includes(s) && !statuses.some((x) => x === "invalid" || x === "unsupported" || x === "ambiguous" || x === "malformed" || x === "resource-exhausted" || x === undefined);
  const terminal = only("missing-assumption") ? "missing-assumption" : null;
  const judged: Record<string, number> = {}; for (const s of statuses) judged[s ?? "none"] = (judged[s ?? "none"] ?? 0) + 1;
  return { parsed, accounts, outcomes, evidence: b.records.flatMap((r) => (r?.evidence ? [r.evidence] : [])), nativeComplete: args.nativeComplete, obligations: args.obligations, terminal, domain: args.domain, family: args.family, destination: b.destination, notes: args.notes, restrictions: args.restrictions ?? [], finalValue: args.finalValue ?? null, diagnostics: { lines: parsed.lines.length, judged } };
}

// ================================================================================================ prose understanding
const MATH_WORDS = new Set(["sin", "cos", "tan", "cot", "sec", "csc", "ln", "log", "exp", "sqrt", "abs", "pi", "lim", "int", "dx", "dy", "du", "dv", "dt", "conj", "arctan", "atan", "inf", "infty", "mod", "arg", "det", "max", "min", "gcd", "re", "im", "var", "cov", "sd", "mu", "sigma", "mean", "median", "variance", "binom", "choose", "nCr", "nPr", "Var", "E"]);
const stripEvents = (s: string) => s.replace(/\b(?:P|Pr|n|E|Var|SD|sd)\s*[(\[][^)\]]*[)\]]/g, " 0 ");
const words = (s: string): string[] => (stripEvents(s).match(/[A-Za-z]{2,}/g) ?? []).filter((w) => !MATH_WORDS.has(w) && !MATH_WORDS.has(w.toLowerCase()) && !/^d[a-zA-Z]$/.test(w));
/** A row is prose when, apart from an optional leading label, it carries sentence words rather than a mathematical relation. */
export function isProse(plain: string): boolean {
  const parts = splitEquals(plain);
  const labelOnly = (t: string) => /^[A-Za-z][A-Za-z\s_]*(?:\([^)]*\))?$/.test(t.trim()) && words(t).length <= 4 && !/\b(?:is|are|so|hence|thus|then|because|since|both|equal|equals)\b/i.test(t);
  const rest = parts.length > 1 && labelOnly(parts[0]) ? parts.slice(1) : parts;
  const ws = rest.reduce((n, t) => n + words(t).length, 0);
  if (parts.length === 1 && /^[A-Za-z][A-Za-z-]{3,}[.!]?$/.test(plain.trim()) && ws >= 1) return true; // a lone word such as "simplify"
  return ws >= 2;
}
export interface Statement { assumptions: Set<string>; negated: Set<string>; conclusion: null | { subject: "continuous" | "differentiable"; positive: boolean } | { kind: "dne" | "diverges" }; limitStatement: null | "dne" }
const NEG = /\b(?:not|isn't|aren't|never|no longer|cannot|can't|without|neither)\b|non-|dis(?=continuous)/i;
export function readStatement(plain: string): Statement {
  const t = plain.toLowerCase();
  const assumptions = new Set<string>(), negated = new Set<string>();
  const mark = (name: string, re: RegExp) => { const m = re.exec(t); if (!m) return; const before = t.slice(Math.max(0, m.index - 24), m.index); (NEG.test(before) ? negated : assumptions).add(name); };
  mark("independent", /\bindependen(?:t|ce)\b|\bindependently\b/);
  mark("mutually-exclusive", /\bmutually\s+exclusive\b|\bdisjoint\b|\bcannot\s+(?:both\s+)?occur\b/);
  mark("equiprobable", /\bequally\s+likely\b|\bequiprobable\b|\buniform(?:ly)?\b|\bfair\b/);
  mark("ordered", /\border\s+matters\b|\bordered\b|\bin\s+order\b|\barrangement\b/);
  mark("unordered", /\border\s+(?:does\s+not|doesn't|is\s+not|isn't)\s+matter\b|\bunordered\b|\bno\s+order\b|\bselection\b|\bcommittee\b/);
  mark("real-coefficients", /\b(?:real|rational|integer)\s+coefficients?\b|\bcoefficients?\s+(?:of\s+\w+\s+)?(?:are|is)\s+(?:all\s+)?real\b|\bcoefficients?\s+are\s+real\b|\bwith\s+real\b/);
  mark("population", /\bpopulation\b/);
  mark("with-replacement", /\bwith\s+replacement\b|\breplaced\b/);
  mark("without-replacement", /\bwithout\s+replacement\b|\bnot\s+replaced\b/);
  let conclusion: Statement["conclusion"] = null;
  const cont = /\bcontinu(?:ous|ity)\b|\bdiscontinu/.exec(t), diff = /\bdifferentiab/.exec(t);
  if (cont || diff) {
    const subject = diff ? "differentiable" : "continuous"; const m = diff ?? cont!;
    const window = t.slice(Math.max(0, m.index - 30), m.index + m[0].length + 6);
    conclusion = { subject, positive: !(NEG.test(window) || /discontinu/.test(t)) };
  } else if (/\bdoes\s+not\s+exist\b|\bdne\b|\bdiverg/.test(t)) conclusion = { kind: "dne" };
  return { assumptions, negated, conclusion, limitStatement: /\bdoes\s+not\s+exist\b|\bdne\b/.test(t) ? "dne" : null };
}

/** A plan in which every line is preserved as unsupported (used for problem types the exact binders do not cover). */
export function planUnsupported(rows: Row[], domain: string, family: string, reason: string): E6Plan {
  const parsed = syntheticParse(rows, domain); const b = new Builder(parsed, "no E6 binder");
  rows.forEach((_, i) => b.add(i, { status: "unsupported", reason }));
  return finish(parsed, b, { domain, family, nativeComplete: false, obligations: [reason], notes: [reason] });
}

/** The only judgement a prose row can receive. It never carries evidence: classification as prose is not proof. */
export function proseJudge(row: Row): Judge {
  if (!row.verbal) return nonMath("sentence without a mathematical claim: preserved, earns no verification credit");
  const s = readStatement(row.plain);
  if (s.conclusion || s.limitStatement) return nonMath("qualitative conclusion: credited only by a family check against the computed truth");
  return uns("a recognizable mathematical statement could not be interpreted into a checkable claim");
}
