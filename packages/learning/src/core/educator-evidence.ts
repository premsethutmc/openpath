// Educator-evidence adapter: converts a derivation assessment into evidence an EDUCATOR reads. It never marks.
//
// Boundary kept (content.ts: needsMarking; written.ts: MARKED_RIGHT / MARKED_NOT): written work is marked by an educator. This module has
// `markingEffect: "none"` on every result, never produces MARKED_RIGHT or MARKED_NOT, never writes a record, and is not wired into any
// production path (shadow mode only: see tools/mathematics/core/symbolic-validation/shadow.ts).
//
// Five categories, never merged:
//   correct-and-complete          every step valid, no open restriction, requested form and skills shown
//   correct-but-incomplete        every step valid, nothing outstanding, but something pedagogical is missing (form, skills, narrowing)
//   valid-with-outstanding-obligations   every step valid; a restriction the problem had is still unstated
//   mathematically-invalid        a step is a provably invalid transformation (the first one is named)
//   unsupported-or-undecidable    the core did not decide; this is NEVER reported as invalid
// A valid route that differs from the reference is not a difference in category and carries no deduction.
import { assessDerivation, type DerivationInput, type DerivationResult } from "./derivation.ts";

export type EvidenceCategory = "correct-and-complete" | "correct-but-incomplete" | "valid-with-outstanding-obligations" | "mathematically-invalid" | "unsupported-or-undecidable";
export interface SkillEvidence { skillId: string; status: "demonstrated" | "not-demonstrated"; competencies: string[]; mapped: boolean }
export interface EducatorEvidence {
  category: EvidenceCategory; markingEffect: "none";
  headline: string;
  firstInvalidStep: number | null; firstUnsupportedStep: number | null; outstandingObligations: string[];
  /** candidate misconceptions for the first invalid step: possibilities for the educator to confirm, not findings */
  candidateMisconceptions: string[];
  skills: SkillEvidence[]; unmappedSkills: string[];
  routeNote: string | null;
  /** an educator may still decide a different mark: the engine's view is evidence, never the decision */
  educatorDecides: true;
}

/** Existing core skill identifiers (SYM_SKILLS and the number engine's skills) -> existing competency ids in content/learning. Skills with no competency here are listed as unmapped, not guessed. */
export const SKILL_COMPETENCIES: Record<string, string[]> = {
  "expand-brackets": ["MATH.algebra.algebra-simplify", "MATH.algebra.polynomials"],
  "collect-like-terms": ["MATH.algebra.algebra-simplify", "MATH.algebra.expressions-intro"],
  "common-factor": ["MATH.algebra.factorisation"],
  "difference-of-squares": ["MATH.algebra.factorisation", "MATH.algebra.identities"],
  "perfect-square": ["MATH.algebra.factorisation", "MATH.algebra.identities"],
  factorise: ["MATH.algebra.factorisation"],
  "cancel-common-factor": ["MATH.algebra.rational-expressions"],
  "common-denominator": ["MATH.algebra.rational-expressions"],
  // "index-laws": no existing algebra competency is dedicated to indices in coverage-matrix/competency-expansion: reported as unmapped
};

const HEAD: Record<EvidenceCategory, string> = {
  "correct-and-complete": "Every step is a valid transformation and nothing is outstanding.",
  "correct-but-incomplete": "Every step is valid; something the task asked for is not shown.",
  "valid-with-outstanding-obligations": "Every step is valid, but a restriction the problem has is not yet stated.",
  "mathematically-invalid": "A step is not a valid transformation.",
  "unsupported-or-undecidable": "The mathematics core could not decide this working. That is not a judgement that it is wrong.",
};

export function toEducatorEvidence(r: DerivationResult): EducatorEvidence {
  const category: EvidenceCategory = r.mathematics === "incorrect" ? "mathematically-invalid" : r.mathematics === "undetermined" ? "unsupported-or-undecidable"
    : r.outstandingObligations.length ? "valid-with-outstanding-obligations" : r.completeness.complete ? "correct-and-complete" : "correct-but-incomplete";
  const ids = [...r.objective.skillsDemonstrated.map((s) => [s, "demonstrated"] as const), ...r.objective.skillsMissing.map((s) => [s, "not-demonstrated"] as const)];
  const skills: SkillEvidence[] = ids.map(([skillId, status]) => ({ skillId, status, competencies: SKILL_COMPETENCIES[skillId] ?? [], mapped: skillId in SKILL_COMPETENCIES }));
  const unmapped = [...new Set(skills.filter((s) => !s.mapped).map((s) => s.skillId))];
  const alt = r.alternativeRouteSteps.length ? `Steps ${r.alternativeRouteSteps.join(", ")} take a different route from the reference; each is valid, and a different route is not a deduction.` : null;
  const head = category === "valid-with-outstanding-obligations" ? `${HEAD[category]} (${r.outstandingObligations.join(", ")})`
    : category === "mathematically-invalid" ? `${HEAD[category]} First invalid step: ${r.firstInvalidStep}.`
    : category === "correct-but-incomplete" ? `${HEAD[category]} ${r.completeness.gaps.join("; ")}.` : HEAD[category];
  return { category, markingEffect: "none", headline: head, firstInvalidStep: r.firstInvalidStep, firstUnsupportedStep: r.firstUnsupportedStep, outstandingObligations: r.outstandingObligations,
    candidateMisconceptions: category === "mathematically-invalid" ? r.causes : [], skills, unmappedSkills: unmapped, routeNote: alt, educatorDecides: true };
}

export function assessForEducator(input: DerivationInput): EducatorEvidence & { derivation: DerivationResult } {
  const derivation = assessDerivation(input);
  return { ...toEducatorEvidence(derivation), derivation };
}
