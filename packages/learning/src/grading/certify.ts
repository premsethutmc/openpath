/**
 * Certification lookup (UNIFIED_GRADING_ARCHITECTURE.md §6; approved decision 1, 2026-10-29). A decision is certified only when the
 * question's family holds a certification for the presentation form and the verifier that decided it, issued from independent audit
 * evidence (tools/mathematics/grading-audit/certify.py -> content/learning/grading-certifications.v1.json). A contract's "verified" label
 * plays no part. Everything else is provisional, and is reported separately.
 */
import data from "../../../../content/learning/grading-certifications.v1.json";

type Entry = { family: string; form: string; verifier: string };
const reg = data as { schema: string; hash: string; audit: string; entries: Entry[]; refused: Record<string, unknown> };
export const CERTIFICATIONS_SCHEMA = reg.schema;
export const CERTIFICATIONS_HASH = reg.hash;
const keys = new Set(reg.entries.map((e) => `${e.family}|${e.form}|${e.verifier}`));

/** "typed" | "mc" | "word" for a generated question id; null for anything else (authored questions are not certified by this audit) */
export function presentationOf(qid: string): { family: string; form: "typed" | "mc" | "word" } | null {
  const m = /^gen:([a-z0-9]+):-?\d+(?:,-?\d+)*(?::(mc|w))?$/.exec(qid);
  return m ? { family: m[1], form: m[2] === "mc" ? "mc" : m[2] === "w" ? "word" : "typed" } : null;
}
export function certified(qid: string, verifier: string | null): boolean {
  const p = presentationOf(qid);
  return !!p && !!verifier && keys.has(`${p.family}|${p.form}|${verifier}`);
}
/** the question's family holds at least one certification for this presentation form (its contract status is then "certified") */
const forms = new Set(reg.entries.map((e) => `${e.family}|${e.form}`));
export function formCertified(qid: string): boolean { const p = presentationOf(qid); return !!p && forms.has(`${p.family}|${p.form}`); }
export const certifiedFamilies = (): string[] => [...new Set(reg.entries.map((e) => e.family))];
