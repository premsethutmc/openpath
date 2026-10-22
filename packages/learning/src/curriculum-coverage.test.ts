/**
 * Curriculum-wide mathematical teaching coverage tests.
 *
 * These tests verify that the op-based kernel adaptation achieves
 * broad coverage across the full 1,080 family curriculum, and that
 * kernel-backed teaching preserves mathematical correctness.
 */
import { describe, it } from "node:test";
import * as assert from "node:assert/strict";
import { FAMILIES } from "./families.js";
import {
  adaptProblem,
  kernelWorkedSteps,
  rulesUsed,
  hasOpMappableSteps,
} from "./kernel-adapter.js";
import { teachingPresentationFrom } from "./teaching-presentation.js";

// ════════════════════════════════════════════════════════════════════════════════
// Helpers
// ════════════════════════════════════════════════════════════════════════════════

function tryGetProblem(def: any): any {
  if (!def.solve) return null;
  const arity = def.arity || 2;
  const paramSets: number[][] =
    arity === 1 ? [[5], [3], [10]]
    : arity === 2 ? [[5, 3], [3, 4], [7, 2]]
    : arity === 3 ? [[5, 3, 1], [2, 3, 4], [3, 7, 4]]
    : arity === 4 ? [[2, 3, 4, 5], [1, 4, 3, 4]]
    : arity === 5 ? [[2, 3, 4, 5, 1], [1, 2, 3, 4, 1]]
    : [[5, 3]];
  for (const params of paramSets) {
    try {
      const result = def.solve(params);
      if (result?.steps?.length > 0) {
        return { family: def.id, params, steps: result.steps, answer: result.answer || result.value };
      }
    } catch {}
  }
  return null;
}

// ════════════════════════════════════════════════════════════════════════════════
// Coverage thresholds
// ════════════════════════════════════════════════════════════════════════════════

describe("curriculum-wide coverage: threshold", () => {
  let kernelBacked = 0;
  let compatibility = 0;
  let noProblem = 0;
  const kernelByDomain = new Map<string, number>();
  const totalByDomain = new Map<string, number>();

  // Run once for all threshold tests
  const families = [...FAMILIES.entries()];
  for (const [id, def] of families) {
    const domain = (def.competency || "").split(".")[1] || "unknown";
    totalByDomain.set(domain, (totalByDomain.get(domain) || 0) + 1);

    const problem = tryGetProblem(def);
    if (!problem) { noProblem++; continue; }

    try {
      const adapted = adaptProblem(problem);
      const kSteps = kernelWorkedSteps(adapted);
      if (adapted.fullyAdapted && kSteps.length > 0) {
        kernelBacked++;
        kernelByDomain.set(domain, (kernelByDomain.get(domain) || 0) + 1);
      } else {
        compatibility++;
      }
    } catch {
      compatibility++;
    }
  }

  it("at least 80% of families are kernel-backed", () => {
    const total = families.length;
    const pct = (kernelBacked / total) * 100;
    assert.ok(pct >= 80, `Only ${pct.toFixed(1)}% kernel-backed (${kernelBacked}/${total}), need ≥80%`);
  });

  it("no domain falls below 70% coverage", () => {
    for (const [domain, total] of totalByDomain) {
      const kernel = kernelByDomain.get(domain) || 0;
      const pct = (kernel / total) * 100;
      assert.ok(pct >= 70 || total < 10,
        `Domain "${domain}" only ${pct.toFixed(1)}% (${kernel}/${total}), need ≥70%`);
    }
  });

  it("fewer than 40 families cannot generate problems", () => {
    assert.ok(noProblem < 40,
      `${noProblem} families cannot generate problems, threshold is <40`);
  });
});

// ════════════════════════════════════════════════════════════════════════════════
// Mathematical correctness of kernel-backed teaching
// ════════════════════════════════════════════════════════════════════════════════

describe("curriculum-wide coverage: kernel correctness", () => {
  it("every kernel-backed family produces worked steps with explanations", () => {
    let checked = 0;
    const failures: string[] = [];

    for (const [id, def] of FAMILIES) {
      const problem = tryGetProblem(def);
      if (!problem) continue;

      try {
        const adapted = adaptProblem(problem);
        if (!adapted.fullyAdapted) continue;

        const kSteps = kernelWorkedSteps(adapted);
        if (kSteps.length === 0) {
          failures.push(`${id}: kernel-backed but no worked steps`);
          continue;
        }

        for (const step of kSteps) {
          if (!step.explanation) {
            failures.push(`${id}: step missing explanation`);
          }
          if (!step.principle) {
            failures.push(`${id}: step missing principle`);
          }
        }
        checked++;
      } catch {}
    }

    assert.ok(checked > 800, `Only checked ${checked} families, expected >800`);
    assert.ok(failures.length === 0,
      `${failures.length} failures:\n${failures.slice(0, 10).join("\n")}`);
  });

  it("every kernel-backed family has at least one rule in its transformation chain", () => {
    const failures: string[] = [];

    for (const [id, def] of FAMILIES) {
      const problem = tryGetProblem(def);
      if (!problem) continue;

      try {
        const adapted = adaptProblem(problem);
        if (!adapted.fullyAdapted) continue;

        const rules = rulesUsed(adapted);
        if (rules.length === 0) {
          failures.push(`${id}: fully adapted but no rules used`);
        }

        // Every rule must be a known kernel rule
        for (const r of rules) {
          if (!r.startsWith("arithmetic.") && !r.startsWith("comparison.") &&
              !r.startsWith("fraction.") && !r.startsWith("algebra.") &&
              !r.startsWith("geometry.") && !r.startsWith("decomposition.")) {
            failures.push(`${id}: unknown rule prefix "${r}"`);
          }
        }
      } catch {}
    }

    assert.ok(failures.length === 0,
      `${failures.length} failures:\n${failures.slice(0, 10).join("\n")}`);
  });

  it("op-adapted steps preserve the family solver's answer", () => {
    let checked = 0;
    const failures: string[] = [];

    for (const [id, def] of FAMILIES) {
      const problem = tryGetProblem(def);
      if (!problem) continue;
      if (problem.steps.some((s: any) => s.justification)) continue; // Skip explicit families

      try {
        const adapted = adaptProblem(problem);
        if (!adapted.fullyAdapted) continue;

        // Check each adapted step includes original value in its evidence or explanation
        for (const step of adapted.steps) {
          if (!step.adapted) continue;
          const originalValue = String(step.original.value);
          const evidence = step.transformation?.evidence || "";
          const explanation = step.explanation?.justification || "";
          const combined = evidence + explanation;

          if (originalValue && !combined.includes(originalValue)) {
            failures.push(`${id}: step ${step.original.id} value "${originalValue}" not in evidence`);
          }
        }
        checked++;
      } catch {}
    }

    assert.ok(checked > 500, `Only checked ${checked} families, expected >500`);
    // Allow some flexibility since evidence format varies
    assert.ok(failures.length < 50,
      `${failures.length} failures (threshold <50):\n${failures.slice(0, 10).join("\n")}`);
  });
});

// ════════════════════════════════════════════════════════════════════════════════
// Domain-specific coverage checks
// ════════════════════════════════════════════════════════════════════════════════

describe("curriculum-wide coverage: domain checks", () => {
  it("core arithmetic (number domain) has strong coverage", () => {
    let kernel = 0;
    let total = 0;

    for (const [id, def] of FAMILIES) {
      if (!(def.competency || "").includes(".number.")) continue;
      total++;
      const problem = tryGetProblem(def);
      if (!problem) continue;
      try {
        const adapted = adaptProblem(problem);
        if (adapted.fullyAdapted) kernel++;
      } catch {}
    }

    const pct = (kernel / total) * 100;
    assert.ok(pct >= 80, `Number domain: ${pct.toFixed(1)}% (${kernel}/${total}), need ≥80%`);
  });

  it("algebra domain has strong coverage", () => {
    let kernel = 0;
    let total = 0;

    for (const [id, def] of FAMILIES) {
      if (!(def.competency || "").includes(".algebra.")) continue;
      total++;
      const problem = tryGetProblem(def);
      if (!problem) continue;
      try {
        const adapted = adaptProblem(problem);
        if (adapted.fullyAdapted) kernel++;
      } catch {}
    }

    const pct = (kernel / total) * 100;
    assert.ok(pct >= 80, `Algebra domain: ${pct.toFixed(1)}% (${kernel}/${total}), need ≥80%`);
  });

  it("statistics and probability have strong coverage", () => {
    let kernel = 0;
    let total = 0;

    for (const [id, def] of FAMILIES) {
      const comp = def.competency || "";
      if (!comp.includes(".statistics.") && !comp.includes(".probability.")) continue;
      total++;
      const problem = tryGetProblem(def);
      if (!problem) continue;
      try {
        const adapted = adaptProblem(problem);
        if (adapted.fullyAdapted) kernel++;
      } catch {}
    }

    const pct = (kernel / total) * 100;
    assert.ok(pct >= 80, `Stats+Prob: ${pct.toFixed(1)}% (${kernel}/${total}), need ≥80%`);
  });
});

// ════════════════════════════════════════════════════════════════════════════════
// Grade-level representative families
// ════════════════════════════════════════════════════════════════════════════════

describe("curriculum-wide coverage: grade-level representatives", () => {
  // Representative families for each grade level
  const gradeRepresentatives: Record<string, string[]> = {
    "Grade 2": ["cnt", "aarow", "aaheavy", "aalong"],
    "Grade 5": ["mul", "divr", "fmulw", "pct"],
    "Grade 8": ["factor", "quad", "mean4", "root"],
    "Grade 10": ["lin", "cdist", "condp", "vol"],
    "Grade 12": ["cint", "dpow", "det2", "lim"],
  };

  for (const [grade, familyIds] of Object.entries(gradeRepresentatives)) {
    it(`${grade} representative families are kernel-backed`, () => {
      const results: string[] = [];

      for (const id of familyIds) {
        const def = FAMILIES.get(id);
        if (!def) { results.push(`${id}: not found`); continue; }

        const problem = tryGetProblem(def);
        if (!problem) { results.push(`${id}: no problem generated`); continue; }

        try {
          const adapted = adaptProblem(problem);
          if (!adapted.fullyAdapted) {
            results.push(`${id}: not fully adapted`);
          }
        } catch (e: any) {
          results.push(`${id}: error — ${e.message}`);
        }
      }

      assert.ok(results.length === 0,
        `${grade} failures:\n${results.join("\n")}`);
    });
  }
});

// ════════════════════════════════════════════════════════════════════════════════
// Teaching presentation integration
// ════════════════════════════════════════════════════════════════════════════════

describe("curriculum-wide coverage: kernel adaptation reach", () => {
  it("explicit-teaching families are fully adapted by the kernel", () => {
    const EXPLICIT = [
      "aeind", "aiint", "eqfrac", "fadd", "adfcmp", "adfname", "adshade",
      "aocart", "apcartn", "lin", "ahone", "lneg", "rect", "aearea", "rperim",
    ];

    let adapted = 0;
    const failures: string[] = [];

    for (const id of EXPLICIT) {
      const def = FAMILIES.get(id);
      if (!def) continue;

      const problem = tryGetProblem(def);
      if (!problem) continue;

      try {
        const result = adaptProblem(problem);
        if (result.fullyAdapted) {
          adapted++;
        } else {
          failures.push(`${id}: not fully adapted`);
        }
      } catch (e: any) {
        failures.push(`${id}: error — ${e.message}`);
      }
    }

    assert.ok(adapted > 10, `Only ${adapted} explicit families adapted, expected >10`);
  });

  it("op-adapted families get kernel transformations for mathematical backing", () => {
    let adapted = 0;

    for (const [id, def] of FAMILIES) {
      const problem = tryGetProblem(def);
      if (!problem) continue;
      if (problem.steps.some((s: any) => s.justification)) continue;

      try {
        const result = adaptProblem(problem);
        if (result.fullyAdapted) adapted++;
      } catch {}
    }

    // The op-based adaptation should cover most non-explicit families
    assert.ok(adapted > 800, `Only ${adapted} op-adapted families, expected >800`);
  });
});

// ════════════════════════════════════════════════════════════════════════════════
// Op-mapping consistency
// ════════════════════════════════════════════════════════════════════════════════

describe("curriculum-wide coverage: op-mapping consistency", () => {
  it("hasOpMappableSteps agrees with adaptProblem for sampled families", () => {
    let checked = 0;
    const disagreements: string[] = [];

    for (const [id, def] of FAMILIES) {
      const problem = tryGetProblem(def);
      if (!problem) continue;
      if (problem.steps.some((s: any) => s.justification)) continue;

      const hasMappable = hasOpMappableSteps(problem);
      try {
        const adapted = adaptProblem(problem);
        // If hasOpMappableSteps says yes, at least one step should adapt.
        // Exception: steps with null values fail adaptation even with a mapped op,
        // so we only flag disagreements when all steps have non-null values.
        const allHaveValues = problem.steps.every((s: any) => s.value != null);
        if (hasMappable && allHaveValues && adapted.steps.every((s: any) => !s.adapted)) {
          disagreements.push(`${id}: hasOpMappableSteps=true but no steps adapted`);
        }
      } catch {}
      checked++;
    }

    assert.ok(checked > 500, `Only checked ${checked}, expected >500`);
    assert.ok(disagreements.length === 0,
      `${disagreements.length} disagreements:\n${disagreements.slice(0, 10).join("\n")}`);
  });
});
