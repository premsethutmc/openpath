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
 * Hand-written questions have no certification and stay provisional.
 */
import data from "../../../content/learning/machine-validation.v1.json";
import { inPool } from "./families";
import { fingerprintOf } from "./review";

export interface MachineEntry { family: string; fingerprint: string; forms: string[]; excluded?: string[] }
export interface MachineRegistry { schema: string; validatedAt: string; entries: MachineEntry[]; partial: Record<string, string>; held: Record<string, string> }
export const machineRegistry = data as unknown as MachineRegistry;
export const MACHINE_VALIDATION_LABEL = "Machine-checked (machine-validation@1): answer key independently certified and grading certified. Not educator-reviewed.";

const G = globalThis as { __openpathMachineValidation?: { on: boolean; reg: MachineRegistry | null; index?: Map<string, MachineEntry & { out: Set<string> }> } };
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
  const m = /^gen:([a-z0-9]+):(-?\d+(?:,-?\d+)*)(?::(mc|w))?$/.exec(qid);
  if (!m || m[3] === "w") return undefined;
  const e = entryOf(m[1]);
  if (!e || !e.forms.includes(m[3] ?? "typed") || e.out.has(`gen:${m[1]}:${m[2]}`)) return undefined;
  if (e.fingerprint !== fingerprintOf(m[1]) || !inPool(qid)) return undefined;
  return (s.reg ?? machineRegistry).validatedAt;
}
