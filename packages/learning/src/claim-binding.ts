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
function bindTypedClaims(parsed: NaturalParseResult, adapted: Extract<NaturalAdapterResult, { outcome: "converted" }>): string[] {
  const errors: string[] = [], name = adapted.evidence.adapter;
  if (!["linear-determinant", "statistics-mean", "complex-modulus"].includes(name)) return errors;
  const working = adapted.working as { id: string; result: { kind: string; value?: string; radicand?: string } }[];
  adapted.accounts.filter((a) => a.role === "claim-step").forEach((claim, k) => {
    const line = parsed.lines.find((l) => l.id === claim.lineId);
    // `mean = ...` is parsed as an opaque statistic notation without an IR, so its right-hand side is re-parsed from the source text.
    const rhs = line ? sourceClaim(line) ?? rhsFromText(line.source.text) : null;
    if (!line || !rhs) { errors.push(`claim ${k} has no written value`); return; }
    const w = working[k];
    if (!w || w.id !== line.id) { errors.push(`line ${line.source.line}: adapter step ${k} is not bound to this source line`); return; }
    let value = evalIr(rhs);
    if (name === "complex-modulus") {
      const left = line.relation.kind === "equation" ? line.relation.left : null, squaredClaim = !!left && left.kind === "power" && left.exponent === 2;
      if (!value) { value = rhs.kind === "root" && rhs.index === 2 ? evalIr(rhs.radicand) : null; /* sqrt(k): the square is k */ } else if (!squaredClaim) value = mk(value.n * value.n, value.d * value.d);
      const got = w.result.kind === "radical" ? w.result.radicand : w.result.value;
      if (!value || got !== text(value)) errors.push(`line ${line.source.line}: typed claim ${String(got)} differs from the written claim`);
    } else if (!value || w.result.value !== text(value)) errors.push(`line ${line.source.line}: typed claim ${String(w.result.value)} differs from the written claim`);
  });
  return errors;
}

export function bindClaims(parsed: NaturalParseResult, adapted: Extract<NaturalAdapterResult, { outcome: "converted" }>, assessed: AssessmentEnvelope): string[] {
  const errors: string[] = [];
  if (!String(adapted.destinationReasoner).startsWith("symbolic")) return bindTypedClaims(parsed, adapted);
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
      }
    }
    before = after;
  });
  return errors;
}
