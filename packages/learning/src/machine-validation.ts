/**
 * Machine validation (machine-validation@1): the automated route by which a question's evidence can count as VALIDATED.
 *
 * OpenPath has no educators, so the educator release in review.ts cannot happen and "verified" was unreachable for every real
 * learner. This is the second route, and it is never described as educator review. A generated question is machine-validated
 * only when its family's registry entry (content/learning/machine-validation.v1.json, built by scripts/machine-validation.ts)
 *   - lists the question's presentation form: "typed" or "mc" (the everyday-wording form ":w" is never listed);
 *   - carries the family's CURRENT fingerprint, so any change to the generator, its options or its wording switches the entry
 *     off until the family is certified again;
 *   - does not exclude the question by id (questions the certification classed ambiguous, defective or notation-only);
 * and the question is in the family's release pool and not quarantined (families.ts inPool).
 * What stands behind an entry: an exhaustive, independent answer-key certification of exactly these questions, and a grading
 * certification for the form. What it does NOT establish: that the teaching is good, or that the question suits the grade.
 * A hand-written question is machine-validated only when the registry lists it with its current content hash: an independent
 * reviewer re-derived its stored answer from the prompt and options alone (the key hidden), and it has not changed since.
 */
import data from "../../../content/learning/machine-validation.v1.json";
import { question, type Question } from "./content";
import { hashOf } from "./curriculum";
import { inPool } from "./families";
import { selectable } from "./question-status";
import { fingerprintOf } from "./review";

/** since: when this family was certified, if later than the registry's validatedAt (answers before it never verify) */
export interface MachineEntry { family: string; fingerprint: string; forms: string[]; since?: string; excluded?: string[] }
export interface MachineRegistry { schema: string; validatedAt: string; entries: MachineEntry[]; partial: Record<string, string>; held: Record<string, string>; written?: Record<string, string>; writtenHeld?: Record<string, string> }
/** Hand-written questions are admitted only with these answer types (read by the exact graders; no grading audit covers them). */
export const WRITTEN_TYPES: string[] = ["integer", "choice", "fraction"];
/** What a reviewer of a hand-written question saw and what was compared: any change to it ends the admission. */
export const writtenHash = (q: Question) => hashOf({ id: q.id, type: q.type, prompt: q.prompt, options: (q as { options?: string[] }).options ?? null, answer: q.answer });
export const machineRegistry = data as unknown as MachineRegistry;
export const MACHINE_VALIDATION_LABEL = "Machine-checked (machine-validation@1): answer independently re-derived and found correct. Not educator-reviewed.";

const G = globalThis as { __openpathMachineValidation?: { on: boolean; reg: MachineRegistry | null; index?: Map<string, MachineEntry & { out: Set<string> }>; memo?: Map<string, string | undefined> } };
const state = () => (G.__openpathMachineValidation ??= { on: true, reg: null });
/** Switch the automated route off or on (on by default), or use another registry (tests). */
export function useMachineValidation(on: boolean, reg: MachineRegistry | null = null) {
  G.__openpathMachineValidation = { on, reg };
}
export const machineValidationOn = () => state().on;
function entryOf(fam: string) {
  const s = state();
  s.index ??= new Map((s.reg ?? machineRegistry).entries.map((e) => [e.family, { ...e, out: new Set(e.excluded ?? []) }]));
  return s.index.get(fam);
}

/** When this question became machine-validated content, or undefined if it is not. */
export function machineReleaseOf(qid: string): string | undefined {
  const s = state();
  if (!s.on) return undefined;
  // the registry and the content are fixed while the app runs, and this is asked for every question on every evidence
  // calculation: each answer is worked out once (useMachineValidation starts afresh)
  const memo = (s.memo ??= new Map());
  if (memo.has(qid)) return memo.get(qid);
  const at = releaseTime(qid);
  memo.set(qid, at);
  return at;
}
function releaseTime(qid: string): string | undefined {
  const s = state();
  if (!qid.startsWith("gen:")) {
    // a hand-written question: an independent reviewer re-derived its stored answer from the prompt alone, and it is unchanged since
    const h = (s.reg ?? machineRegistry).written?.[qid];
    if (!h || !selectable(qid)) return undefined;
    let q: Question;
    try { q = question(qid); } catch { return undefined; }
    return WRITTEN_TYPES.includes(q.type) && writtenHash(q) === h ? (s.reg ?? machineRegistry).validatedAt : undefined;
  }
  const m = /^gen:([a-z0-9]+):(-?\d+(?:,-?\d+)*)(?::(mc|w))?$/.exec(qid);
  if (!m || m[3] === "w") return undefined;
  const e = entryOf(m[1]);
  if (!e || !e.forms.includes(m[3] ?? "typed") || e.out.has(`gen:${m[1]}:${m[2]}`)) return undefined;
  if (e.fingerprint !== fingerprintOf(m[1]) || !inPool(qid)) return undefined;
  return e.since ?? (s.reg ?? machineRegistry).validatedAt;
}
