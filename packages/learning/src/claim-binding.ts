/**
 * E2 U4 claim binding. A certificate is only accepted for the claim the student actually wrote:
 * the "before" and "after" expressions given to the independent kernel are re-derived from the original
 * parsed source lines (never from the adapter's working), and the adapter's own expression must agree.
 * A certificate digest alone proves nothing: the kernel re-checks canonical forms, assumptions and rules.
 */
import type { Expr } from "./calculus-core.ts";
import type { NaturalParseResult, NaturalParsedLine } from "./natural-working.ts";
import { naturalRestrictionKeys, parseNaturalWorking } from "./natural-working.ts";
import { checkSymbolicCertificate, type KernelCertificate } from "./proof-kernel.ts";
import { stableCanonicalSerialization } from "./canonical-math-ir.ts";
import type { NaturalAdapterResult } from "./natural-domain-adapters.ts";
import type { AssessmentEnvelope } from "./unified-math-engine.ts";
import type { BindingEvidence } from "./acceptance-gate.ts";
import { certify } from "./independent-checker.ts";

/** The expression a written line asserts as the value of its subject. */
export function sourceClaim(line: NaturalParsedLine): Expr | null {
  const r = line.relation;
  if (r.kind === "function") return r.result ?? null;
  if (r.kind === "equation") return r.right;
  if (r.kind === "expression") return r.expression;
  return null;
}
const same = (a: Expr, b: Expr) => stableCanonicalSerialization(a) === stableCanonicalSerialization(b);

// Independent exact evaluator over the parsed IR (deliberately separate from the adapters' evaluator).
type R = { n: bigint; d: bigint };
const gcd = (a: bigint, b: bigint): bigint => { a = a < 0n ? -a : a; b = b < 0n ? -b : b; while (b) [a, b] = [b, a % b]; return a || 1n; };
const mk = (n: bigint, d: bigint): R => { const g = gcd(n, d), s = d < 0n ? -1n : 1n; return { n: (n / g) * s, d: (d / g) * s }; };
function evalIr(x: Expr, depth = 0): R | null {
  if (depth > 24) return null;
  if (x.kind === "constant") { const [a, b = "1"] = x.value.split("/"); return BigInt(b) === 0n ? null : mk(BigInt(a), BigInt(b)); }
  if (x.kind === "add") { let r = mk(0n, 1n); for (const t of x.terms) { const v = evalIr(t, depth + 1); if (!v) return null; r = mk(r.n * v.d + v.n * r.d, r.d * v.d); } return r; }
  if (x.kind === "multiply") { let r = mk(1n, 1n); for (const t of x.factors) { const v = evalIr(t, depth + 1); if (!v) return null; r = mk(r.n * v.n, r.d * v.d); } return r; }
  if (x.kind === "power" && Number.isInteger(x.exponent) && Math.abs(x.exponent) <= 16) { const b = evalIr(x.base, depth + 1); if (!b) return null; let r = mk(1n, 1n); for (let i = 0; i < Math.abs(x.exponent); i++) r = mk(r.n * b.n, r.d * b.d); if (x.exponent < 0) { if (r.n === 0n) return null; r = mk(r.d, r.n); } return r; }
  return null;
}
function rhsFromText(source: string): Expr | null {
  const i = source.indexOf("="); if (i < 0) return null;
  const p = parseNaturalWorking({ format: "natural", text: source.slice(i + 1) });
  return p.classification === "parsed" && p.lines.length === 1 && p.lines[0].relation.kind === "expression" ? p.lines[0].relation.expression : null;
}
const text = (r: R) => (r.d === 1n ? `${r.n}` : `${r.n}/${r.d}`);

/** Typed (non-symbolic) destinations: re-derive each claim's exact value from the parsed IR and compare with the step the reasoner judged. */
const TYPED_ADAPTERS = ["linear-determinant", "statistics-mean", "complex-modulus", "probability-complement", "linear-vector", "calculus-derivative", "calculus-integral"];
const K = (v: string): Expr => ({ kind: "constant", value: v });
/** Independent exact differentiation (separate from calculus-core); null outside its scope. The result is only ever used as the `before` side of a U4 identity. */
export function differentiate(e: Expr, v: string, depth = 0): Expr | null {
  if (depth > 40) return null;
  switch (e.kind) {
    case "constant": case "pi": return K("0");
    case "variable": return K(e.name === v ? "1" : "0");
    case "add": { const t = e.terms.map((x) => differentiate(x, v, depth + 1)); return t.every((x) => x) ? { kind: "add", terms: t as Expr[] } : null; }
    case "multiply": {
      const parts: Expr[] = [];
      for (let i = 0; i < e.factors.length; i++) { const d = differentiate(e.factors[i], v, depth + 1); if (!d) return null; parts.push({ kind: "multiply", factors: e.factors.map((f, j) => (j === i ? d : f)) }); }
      return { kind: "add", terms: parts };
    }
    case "power": {
      if (!Number.isInteger(e.exponent)) return null; const d = differentiate(e.base, v, depth + 1); if (!d) return null;
      if (e.exponent === 0) return K("0");
      const factors: Expr[] = [K(String(e.exponent))]; if (e.exponent - 1 !== 0) factors.push({ kind: "power", base: e.base, exponent: e.exponent - 1 }); factors.push(d);
      return { kind: "multiply", factors };
    }
    case "sin": { const d = differentiate(e.argument, v, depth + 1); return d ? { kind: "multiply", factors: [{ kind: "cos", argument: e.argument }, d] } : null; }
    case "cos": { const d = differentiate(e.argument, v, depth + 1); return d ? { kind: "multiply", factors: [K("-1"), { kind: "sin", argument: e.argument }, d] } : null; }
    case "exp": { const d = differentiate(e.argument, v, depth + 1); return d ? { kind: "multiply", factors: [{ kind: "exp", argument: e.argument }, d] } : null; }
    case "log": { const d = differentiate(e.argument, v, depth + 1); return d ? { kind: "multiply", factors: [{ kind: "power", base: e.argument, exponent: -1 }, d] } : null; }
    default: return null;
  }
}
function bindTypedClaims(parsed: NaturalParseResult, adapted: Extract<NaturalAdapterResult, { outcome: "converted" }>, assessed: AssessmentEnvelope): { errors: string[]; evidence: BindingEvidence[] } {
  const errors: string[] = [], evidence: BindingEvidence[] = [], name = adapted.evidence.adapter;
  if (!TYPED_ADAPTERS.includes(name)) return { errors, evidence };
  if (name === "calculus-derivative" || name === "calculus-integral") return bindCalculus(parsed, adapted, assessed);
  if (name === "linear-vector") return bindVector(parsed, adapted, assessed);
  const working = adapted.working as { id: string; result: { kind: string; value?: string; radicand?: string } }[];
  const given = name === "probability-complement" ? /^\s*P\s*\([^)]*\)\s*=\s*(.+)$/i.exec(parsed.lines[0]?.source.text ?? "") : null;
  adapted.accounts.filter((a) => a.role === "claim-step").forEach((claim, k) => {
    const line = parsed.lines.find((l) => l.id === claim.lineId);
    // `mean = ...` is parsed as an opaque statistic notation without an IR, so its right-hand side is re-parsed from the source text.
    let rhs: Expr | null = null;
    if (name === "probability-complement" && line && given) rhs = rhsFromText("=" + line.source.text.slice(line.source.text.indexOf("=") + 1).replace(/\bP\s*\(\s*(?!not|¬)[^)]*\)/gi, `(${given[1]})`));
    else rhs = line ? sourceClaim(line) ?? rhsFromText(line.source.text) : null;
    if (!line || !rhs) { errors.push(`claim ${k} has no written value`); return; }
    const w = working[k];
    if (!w || w.id !== line.id) { errors.push(`line ${line.source.line}: adapter step ${k} is not bound to this source line`); return; }
    let value = evalIr(rhs), got: string | undefined;
    if (name === "complex-modulus") {
      const left = line.relation.kind === "equation" ? line.relation.left : null, squaredClaim = !!left && left.kind === "power" && left.exponent === 2;
      if (!value) { value = rhs.kind === "root" && rhs.index === 2 ? evalIr(rhs.radicand) : null; /* sqrt(k): the square is k */ } else if (!squaredClaim) value = mk(value.n * value.n, value.d * value.d);
      got = w.result.kind === "radical" ? w.result.radicand : w.result.value;
    } else got = w.result.value;
    const ok = !!value && got === text(value);
    if (!ok) errors.push(`line ${line.source.line}: typed claim ${String(got)} differs from the written claim`);
    evidence.push({ lineId: line.id, line: line.source.line, claim: line.source.text, checker: "independent-ir-evaluator", destination: String(adapted.destinationReasoner), scope: "exact rational evaluation of the written right-hand side on the parsed IR, compared with the typed step the destination reasoner verified", outcome: ok ? "verified" : "mismatch", detail: ok ? `written value ${value ? text(value) : "?"} equals the typed claim` : `typed claim ${String(got)} differs from the written value ${value ? text(value) : "?"}` });
  });
  return { errors, evidence };
}

function evidenceOf(line: NaturalParsedLine, adapted: { destinationReasoner: unknown }, checker: BindingEvidence["checker"], scope: string, ok: boolean, detail: string, digest?: string | null): BindingEvidence {
  return { lineId: line.id, line: line.source.line, claim: line.source.text, checker, destination: String(adapted.destinationReasoner), scope, outcome: ok ? "verified" : "mismatch", detail, digest: digest ?? null };
}
/** Derivative / antiderivative claims: the claim is re-derived from the SOURCE TEXT, then U4 checks it against an independent exact derivative of the typed function. */
function bindCalculus(parsed: NaturalParseResult, adapted: Extract<NaturalAdapterResult, { outcome: "converted" }>, assessed: AssessmentEnvelope): { errors: string[]; evidence: BindingEvidence[] } {
  const errors: string[] = [], evidence: BindingEvidence[] = [], line = parsed.lines[0], w = (adapted.working as { id: string; claim?: { value?: Expr } }[])[0];
  const p = adapted.problem as { task: string; expression?: Expr; integrand?: Expr; variable: string; order?: number };
  if (!line || !w || w.id !== line.id || !w.claim?.value) { errors.push("the calculus claim is not bound to its source line"); return { errors, evidence }; }
  const text = line.source.text, i = text.lastIndexOf("="); const written = i >= 0 ? rhsFromText(text) : null;
  let claim = w.claim.value;
  if (p.task === "indefinite-integral" || adapted.evidence.adapter === "calculus-integral") {
    const rhs = text.slice(text.lastIndexOf("=") + 1).replace(/(?:\+|-)\s*C\s*$/, "").trim(); const reparsed = rhsFromText("=" + rhs);
    if (!reparsed || !same(reparsed, claim)) { errors.push(`line ${line.source.line}: the typed antiderivative differs from the written one`); return { errors, evidence }; }
    const d = differentiate(claim, p.variable), f = p.integrand;
    if (!d || !f) return { errors, evidence };
    const r = certify(d, f); evidence.push(evidenceOf(line, adapted, r.via ? "independent-polynomial-identity" : "u4-kernel", "exact identity (U4, or the independent polynomial identity beyond the kernel budget): independent derivative of the written antiderivative equals the typed integrand", r.outcome === "verified", r.outcome === "verified" ? "d/dx F equals the integrand" : `U4 ${r.outcome}`, r.digest));
    if (r.outcome === "rejected" && assessed.steps[0]?.classification === "verified") errors.push(`line ${line.source.line}: U4 rejected the antiderivative`);
    return { errors, evidence: r.outcome === "verified" ? evidence : [] };
  }
  if (!written || !same(written, claim)) { errors.push(`line ${line.source.line}: the typed derivative differs from the written one`); return { errors, evidence }; }
  let d: Expr | null = p.expression ?? null; for (let k = 0; d && k < (p.order ?? 1); k++) d = differentiate(d, p.variable);
  if (!d) return { errors, evidence };
  const r = certify(d, claim); evidence.push(evidenceOf(line, adapted, r.via ? "independent-polynomial-identity" : "u4-kernel", "exact identity (U4, or the independent polynomial identity beyond the kernel budget): the written derivative equals an independent exact derivative of the typed function", r.outcome === "verified", r.outcome === "verified" ? "the written derivative equals the independent derivative" : `U4 ${r.outcome}`, r.digest));
  if (r.outcome === "rejected" && assessed.steps[0]?.classification === "verified") errors.push(`line ${line.source.line}: U4 rejected the derivative`);
  return { errors, evidence: r.outcome === "verified" ? evidence : [] };
}
/** Vector sum / difference: the expected vector is recomputed here from the typed operands and compared with every written claim and with the typed step. */
function bindVector(parsed: NaturalParseResult, adapted: Extract<NaturalAdapterResult, { outcome: "converted" }>, assessed: AssessmentEnvelope): { errors: string[]; evidence: BindingEvidence[] } {
  const errors: string[] = [], evidence: BindingEvidence[] = [], p = adapted.problem as { task: string; data: { a: unknown[]; b: unknown[] } };
  const comp = (s: unknown): R | null => { if (typeof s !== "string" && typeof s !== "number") return null; const x = rhsFromText("=" + String(s)); return x ? evalIr(x) : null; };
  const A = p.data.a.map(comp), B = p.data.b.map(comp);
  if (A.some((x) => !x) || B.some((x) => !x) || A.length !== B.length || !["add", "subtract"].includes(p.task)) return { errors, evidence };
  const expected = A.map((x, i) => (p.task === "add" ? mk(x!.n * B[i]!.d + B[i]!.n * x!.d, x!.d * B[i]!.d) : mk(x!.n * B[i]!.d - B[i]!.n * x!.d, x!.d * B[i]!.d)));
  const working = adapted.working as { id: string; result: { kind: string; value?: unknown[] } }[];
  adapted.accounts.filter((a) => a.role === "claim-step").forEach((claim, k) => {
    const line = parsed.lines.find((l) => l.id === claim.lineId), w = working[k];
    if (!line || !w || w.id !== line.id) { errors.push(`claim ${k} is not bound to its source line`); return; }
    const m = /=\s*\[([^\]]*)\]\s*$/.exec(line.source.text); const written = m ? m[1].split(",").map((c) => comp(c.trim())) : [];
    const ok = written.length === expected.length && written.every((c, i) => !!c && c.n === expected[i].n && c.d === expected[i].d) && Array.isArray(w.result.value) && w.result.value.length === expected.length && w.result.value.every((c, i) => String(c) === text(expected[i]));
    if (!ok && assessed.steps[k]?.classification === "verified") errors.push(`line ${line.source.line}: the written vector differs from the exact ${p.task} of the typed operands`);
    evidence.push(evidenceOf(line, adapted, "independent-ir-evaluator", "exact rational recomputation of the vector sum/difference from the typed operands, compared with the written and typed claim", ok, ok ? "the written vector equals the independently recomputed vector" : "mismatch"));
  });
  return { errors, evidence };
}

export function bindClaimsDetailed(parsed: NaturalParseResult, adapted: Extract<NaturalAdapterResult, { outcome: "converted" }>, assessed: AssessmentEnvelope): { errors: string[]; evidence: BindingEvidence[] } {
  const errors: string[] = [], evidence: BindingEvidence[] = [];
  if (!String(adapted.destinationReasoner).startsWith("symbolic")) return bindTypedClaims(parsed, adapted, assessed);
  const problem = adapted.problem as { start: Expr };
  const working = adapted.working as { id: string; expression: Expr; dependencies?: string[] }[];
  const steps = ((assessed.domainPayload as { steps?: { classification: string; evidence?: { certificate?: KernelCertificate } }[] } | null)?.steps) ?? [];
  const claims = adapted.accounts.filter((a) => a.role === "claim-step");
  let before: Expr = problem.start;
  claims.forEach((claim, k) => {
    const line = parsed.lines.find((l) => l.id === claim.lineId);
    if (!line) { errors.push(`claim ${k} references unknown line ${claim.lineId}`); return; }
    const after = sourceClaim(line);
    if (!after) { errors.push(`line ${line.source.line}: the written claim has no symbolic expression`); return; }
    const w = working[k];
    if (!w || w.id !== line.id) errors.push(`line ${line.source.line}: adapter step ${k} is not bound to this source line`);
    else if (!same(w.expression, after)) errors.push(`line ${line.source.line}: the adapter replaced the written claim`);
    if (k > 0 && w && (w.dependencies?.length !== 1 || w.dependencies[0] !== claims[k - 1].lineId)) errors.push(`line ${line.source.line}: proof dependency does not point to the preceding written claim`);
    const step = steps[k];
    if (step?.classification === "verified") {
      const cert = step.evidence?.certificate;
      if (!cert) errors.push(`line ${line.source.line}: verified step has no certificate`);
      else {
        const r = checkSymbolicCertificate(cert, before, after, [], naturalRestrictionKeys(line));
        if (r.outcome !== "verified") errors.push(`U4 rejected the certificate for line ${line.source.line}: ${r.justification}`);
        evidence.push({ lineId: line.id, line: line.source.line, claim: line.source.text, checker: "u4-kernel", destination: String(adapted.destinationReasoner), scope: "U4 replay of the certificate on the before/after expressions re-derived from the original source lines", outcome: r.outcome === "verified" ? "verified" : "mismatch", detail: r.justification, digest: cert.replayDigest });
      }
    }
    before = after;
  });
  return { errors, evidence };
}

export function bindClaims(parsed: NaturalParseResult, adapted: Extract<NaturalAdapterResult, { outcome: "converted" }>, assessed: AssessmentEnvelope): string[] {
  return bindClaimsDetailed(parsed, adapted, assessed).errors;
}

/** Natural symbolic working that reaches M3 directly (no adapter): replay every verified step's certificate in U4 on the expressions of the original source lines. */
export function replaySymbolicSteps(parsed: NaturalParseResult, start: Expr, steps: { id: string; expression: Expr; carriedRestrictions?: string[] }[], assessed: AssessmentEnvelope): { errors: string[]; evidence: BindingEvidence[] } {
  const errors: string[] = [], evidence: BindingEvidence[] = [];
  const cert = ((assessed.domainPayload as { steps?: { classification: string; evidence?: { certificate?: KernelCertificate } }[] } | null)?.steps) ?? [];
  let before = start;
  steps.forEach((st, k) => {
    const line = parsed.lines[k], res = cert[k];
    if (!line || line.id !== st.id) { errors.push(`step ${k} is not bound to its source line`); return; }
    if (res?.classification === "verified") {
      const c = res.evidence?.certificate;
      if (!c) errors.push(`line ${line.source.line}: verified step has no certificate`);
      else {
        const r = checkSymbolicCertificate(c, before, st.expression, [], st.carriedRestrictions ?? []);
        if (r.outcome !== "verified") errors.push(`U4 rejected the certificate for line ${line.source.line}: ${r.justification}`);
        evidence.push({ lineId: line.id, line: line.source.line, claim: line.source.text, checker: "u4-kernel", destination: "symbolic-equivalence+U4", scope: "U4 replay of the certificate on the before/after expressions of the original source lines", outcome: r.outcome === "verified" ? "verified" : "mismatch", detail: r.justification, digest: c.replayDigest });
      }
    }
    before = st.expression;
  });
  return { errors, evidence };
}
