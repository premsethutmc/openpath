/**
 * derivation-authorization@1: the ONE explicit interface through which the P2 derivation authority is consulted by the rest of the system.
 *
 * Ownership (Integration Milestone 1): the mathematical grader owns correctness (grading-decision@1) AND supported derivation
 * authorization. This module answers only the second question, for the student's shown working, and it is read-only advice to the
 * evidence layer: it never changes a verdict, never grants credit and is not wired into the authoritative grading decision.
 *
 *   authorized   every line is a justified, certificate-backed transformation of the task AND the certificates replay independently
 *   unsupported  the route is outside what the authority can judge (or a step is true but unjustified): NOTHING is concluded
 *   invalid      a shown step is mathematically false
 *
 * Consumers must treat anything other than `authorized` as "no evidence about the method": `workingEvidence()` is that rule.
 */
import { assessChain, replayDerivationChain, AUTHORITY_VERSION, KERNEL_VERSION } from "./derivation-authority.ts";
import { REWRITE_REGISTRY_VERSION } from "./rewrite-registry.ts";

export const DERIVATION_AUTHORIZATION = "derivation-authorization@1" as const;
export type DerivationStatus = "authorized" | "unsupported" | "invalid";
export interface DerivationAuthorization {
  schema: typeof DERIVATION_AUTHORIZATION;
  status: DerivationStatus;
  /** the first line the authority did not authorize (0-based), or null */
  at: number | null;
  reason: string;
  /** certificate digests, one per authorized line; empty unless every line was authorized */
  certificates: string[];
  /** the kind of each certified move (identity, side-rewrite, solve-conclusion ...) */
  moves: string[];
  /** true only when the whole chain was replayed independently from the task and re-authorized line by line */
  replayed: boolean;
  versions: { authority: string; registry: string; kernel: string };
}

const versions = { authority: AUTHORITY_VERSION, registry: REWRITE_REGISTRY_VERSION, kernel: KERNEL_VERSION };

/** Judge the shown working lines for a task statement ("3x+5=14"). Never throws: an unreadable input is `unsupported`. */
export function authorizeWorking(statement: string, lines: readonly string[]): DerivationAuthorization {
  const base = { schema: DERIVATION_AUTHORIZATION, versions } as const;
  const clean = lines.map((l) => String(l ?? "").trim()).filter((l) => l.length > 0);
  if (!clean.length || typeof statement !== "string" || !statement.trim()) return { ...base, status: "unsupported", at: null, reason: "no working to judge", certificates: [], moves: [], replayed: false };
  // Integration M1 (disputed labels tr-002/006/021): "A = (A)" then "(A) = value" is valid but restates the task and evaluates it: it shows no
  // method beyond the answer, so it is not method evidence however it is certified. Kept unsupported (conservative), never invalid.
  if (clean.length === 2) {
    const m = /^(.+?)\s*=\s*\((.+)\)$/.exec(clean[0]);
    if (m && m[1].replace(/\s+/g, "") === m[2].replace(/\s+/g, "") && /^\(.+\)\s*=/.test(clean[1])) return { ...base, status: "unsupported", at: null, reason: "restatement-only working: restates the task and evaluates it; no method shown", certificates: [], moves: [], replayed: false };
  }
  try {
    const v = assessChain(statement, clean);
    if (v.status === "invalid") return { ...base, status: "invalid", at: v.at, reason: v.reason, certificates: [], moves: [], replayed: false };
    if (v.status !== "verified") return { ...base, status: "unsupported", at: v.at, reason: v.reason, certificates: [], moves: [], replayed: false };
    // a self-consistent digest is not enough: replay every certificate from the task and re-authorize each line
    const r = replayDerivationChain(statement, clean, v.chain);
    if (!r.ok) return { ...base, status: "unsupported", at: r.at, reason: `replay refused: ${r.reason}`, certificates: [], moves: [], replayed: false };
    return { ...base, status: "authorized", at: null, reason: v.reason, certificates: v.chain.map((c) => c.digest), moves: v.chain.map((c) => c.move.kind), replayed: true };
  } catch (e) {
    return { ...base, status: "unsupported", at: null, reason: `authority could not read the working (${(e as Error).message?.slice(0, 80) ?? "error"})`, certificates: [], moves: [], replayed: false };
  }
}

/** What the evidence/adaptive layers may conclude about the METHOD from an authorization: only `authorized` is a verified method. */
export type WorkingEvidence = "method-verified" | "method-false-step" | "no-method-evidence";
export function workingEvidence(a: DerivationAuthorization | null | undefined): WorkingEvidence {
  if (!a) return "no-method-evidence";
  // P2's `solve-conclusion` accepts a stated solution set equal to the task's (an answer alone, or a jump from the task to the roots, is
  // "authorized"); an `identity` line only restates. Neither shows a method, so method evidence needs at least one certified transformation.
  if (a.status === "authorized" && a.replayed && a.certificates.length > 0 && a.moves.some((m) => m !== "identity" && m !== "solve-conclusion")) return "method-verified";
  if (a.status === "invalid") return "method-false-step";
  return "no-method-evidence";    // unsupported is never treated as verified, and never as wrong
}
