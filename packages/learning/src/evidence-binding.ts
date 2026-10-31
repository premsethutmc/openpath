/**
 * E7 repair, invariant A: claim-bound evidence.
 *
 * Evidence verifies a claim only if it establishes THAT claim, under the premises the certifier holds. A line number, a route name, numerical agreement or a registered
 * checker label is not enough: evidence carries the identity of the claim it checked (a digest of the normalised claim text, or of the submitted typed step) and the digest
 * of the task premises it was produced under. The certifier recomputes both from the submission and the problem; anything that does not match is not evidence for the claim.
 * No mathematics is evaluated here and nothing is parsed: identity is a content address, so it cannot be fooled by a parser's reading.
 */
import { sha256Hex } from "./digest.ts";

export const EVIDENCE_BINDING_CONTRACT = "openpath-evidence-binding@1" as const;

const SYM: Record<string, string> = { "−": "-", "–": "-", "—": "-", "×": "*", "·": "*", "⋅": "*", "÷": "/", "≠": "!=", "≤": "<=", "≥": ">=", "√": "sqrt", "∠": "angle", "°": "", "π": "pi", "’": "'" };
/** the normal form used for claim identity: case, spacing, unicode operators, list numbering and trailing punctuation do not change which claim is meant */
export function normalizeClaim(text: string): string {
  let s = String(text ?? "").normalize("NFKC");
  s = s.replace(/^\s*\d+[.)]\s+/, "").replace(/[−–—×·⋅÷≠≤≥√∠°π’]/g, (c) => SYM[c] ?? c);
  return s.toLowerCase().replace(/\s+/g, "").replace(/[.;]+$/, "");
}
const sha = (x: string) => sha256Hex(x).slice(0, 16);
export const claimIdentity = (text: string): string => sha("claim:" + normalizeClaim(text));
/** identity of a submitted typed object (step, problem): canonical JSON with sorted keys; ids/labels of the step are part of what was submitted */
export function objectIdentity(x: unknown): string {
  const canon = (v: unknown): unknown => (Array.isArray(v) ? v.map(canon) : v && typeof v === "object" ? Object.fromEntries(Object.keys(v as object).sort().map((k) => [k, canon((v as Record<string, unknown>)[k])])) : typeof v === "bigint" ? v.toString() : v);
  return sha("object:" + JSON.stringify(canon(x)));
}

const spaced = (text: string): string => {
  let s = String(text ?? "").normalize("NFKC").replace(/^\s*\d+[.)]\s+/, "").replace(/[−–—×·⋅÷≠≤≥√∠°π’]/g, (c) => SYM[c] ?? c);
  return ` ${s.toLowerCase().replace(/\s*([=<>+\-*/^,;])\s*/g, "$1").replace(/\s+/g, " ").replace(/[.;]+\s*$/, "").trim()} `;
};
/** the claim occurs in the evidence's claim as a whole relation: the characters around it must be separators, so x=1 is not inside x=10 or x=1/2 and 2x=4 is not inside -2x=4 */
export function containsClaim(evidenceClaim: string, claim: string): boolean {
  const e = spaced(evidenceClaim), c = spaced(claim).trim(); if (c.length < 1 || e.trim().length < 1) return false;
  for (let i = e.indexOf(c); i >= 0; i = e.indexOf(c, i + 1)) {
    const before = e[i - 1] ?? " ", after = e[i + c.length] ?? " ";
    if (/[ ,;]/.test(before) && /[ ,;=]/.test(after)) return true;
  }
  return false;
}

export interface BoundEvidence { claim: string; claimIdentity?: string | null; premises?: string | null }
export interface Binding { ok: boolean; reason: string }
/**
 * Does this evidence establish this claim under these premises?
 *  - declared identity (typed objects) must equal the expected identity;
 *  - textual evidence must contain the claim as a whole-token run;
 *  - when the evidence records the premises it was produced under they must equal the certifier's own digest.
 */
export function evidenceBinds(ev: BoundEvidence, claimText: string, taskDigest?: string | null, expectedIdentity?: string | null): Binding {
  if (taskDigest && ev.premises && ev.premises !== taskDigest) return { ok: false, reason: "the evidence was produced under different task premises than the certifier holds" };
  if (expectedIdentity) {
    if (ev.claimIdentity && ev.claimIdentity !== expectedIdentity) return { ok: false, reason: "the evidence identifies a different submitted claim" };
    if (!ev.claimIdentity) return { ok: false, reason: "the evidence carries no claim identity" };
    return { ok: true, reason: "claim identity matches the submitted claim" };
  }
  if (ev.claimIdentity && ev.claimIdentity === claimIdentity(claimText)) return { ok: true, reason: "claim identity matches" };
  if (containsClaim(ev.claim, claimText)) return { ok: true, reason: "the evidence's own claim text contains this claim" };
  return { ok: false, reason: `the evidence establishes "${String(ev.claim).slice(0, 60)}", not this claim` };
}

/** the flat list of submitted typed steps, or null for composite typed forms (cross-domain stages, geometry+calculation) that carry no one-to-one step list */
export function submittedSteps(working: unknown): unknown[] | null {
  if (Array.isArray(working) && working.every((x) => x && typeof x === "object")) return working;
  const w = working as { steps?: unknown } | null;
  return w && typeof w === "object" && Array.isArray(w.steps) ? w.steps : null;
}
export interface TypedIdentities { /** per reasoner step: identity of the submitted step (flat forms) or of the whole submission (composite forms) */ identities: string[]; /** true: one-to-one step list; false: the reasoner reported a different number of steps than was submitted; null: composite form */ aligned: boolean | null }
export function typedIdentities(problem: unknown, working: unknown, stepCount: number): TypedIdentities {
  const sub = submittedSteps(working), p = objectIdentity(problem);
  if (sub) return sub.length === stepCount ? { identities: sub.map((s) => objectIdentity({ p, s })), aligned: true } : { identities: Array.from({ length: stepCount }, () => ""), aligned: false };
  const whole = objectIdentity({ p, w: working });
  return { identities: Array.from({ length: stepCount }, () => whole), aligned: null };
}
