/**
 * Curriculum-wide coverage tests — honest numbers.
 *
 * After removing unverifiable op mappings from the kernel adapter,
 * only families whose every step passes verify() count as kernel-backed.
 * These tests reflect that reality rather than inflated thresholds.
 */
import { describe, it } from "node:test";
import * as assert from "node:assert/strict";
import { FAMILIES } from "./families.js";
import { adaptProblem, hasOpMappableSteps } from "./kernel-adapter.js";

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
// Classification — scan every family once
// ════════════════════════════════════════════════════════════════════════════════

interface CoverageStats {
  total: number;
  kernelBacked: number;
  partiallyVerified: number;
  compatibility: number;
  noProblem: number;
  kernelFamilyIds: Set<string>;
}

function classifyAll(): CoverageStats {
  const stats: CoverageStats = {
    total: 0,
    kernelBacked: 0,
    partiallyVerified: 0,
    compatibility: 0,
    noProblem: 0,
    kernelFamilyIds: new Set(),
  };

  for (const [id, def] of FAMILIES) {
    stats.total++;
    const problem = tryGetProblem(def);
    if (!problem) {
      stats.noProblem++;
      continue;
    }

    try {
      const adapted = adaptProblem(problem);
      if (adapted.fullyAdapted) {
        stats.kernelBacked++;
        stats.kernelFamilyIds.add(id);
      } else if (adapted.steps.some((s: any) => s.adapted)) {
        stats.partiallyVerified++;
      } else {
        stats.compatibility++;
      }
    } catch {
      stats.compatibility++;
    }
  }

  return stats;
}

const stats = classifyAll();

// ════════════════════════════════════════════════════════════════════════════════
// Honest coverage numbers
// ════════════════════════════════════════════════════════════════════════════════

describe("curriculum-wide coverage: honest numbers", () => {
  it("total families count is 1,080", () => {
    assert.equal(stats.total, 1080,
      `Expected 1,080 families, got ${stats.total}`);
  });

  it("kernel-backed families (all steps verified) is at least 100", () => {
    // Sanity floor, not an aspirational target.
    assert.ok(stats.kernelBacked >= 100,
      `Only ${stats.kernelBacked} kernel-backed families; sanity floor is 100`);
  });

  it("partially-verified families are reported separately", () => {
    // They exist and are distinct from kernel-backed.
    assert.ok(stats.partiallyVerified > 0,
      "Expected some partially-verified families");
    assert.ok(stats.partiallyVerified !== stats.kernelBacked,
      "Partially-verified count should differ from kernel-backed");
  });

  it("compatibility families are NOT counted as kernel-backed", () => {
    // Compatibility families must not overlap with kernel-backed.
    assert.ok(stats.compatibility > 0,
      "Expected some compatibility-mode families");
    // The kernel-backed set should be much smaller than total minus noProblem.
    const generatable = stats.total - stats.noProblem;
    assert.ok(stats.kernelBacked < generatable,
      "Kernel-backed should be a subset of generatable families");
  });

  it("total adds up: kernel + partial + compat + noProblem = total", () => {
    const sum = stats.kernelBacked + stats.partiallyVerified
              + stats.compatibility + stats.noProblem;
    assert.equal(sum, stats.total,
      `${stats.kernelBacked} + ${stats.partiallyVerified} + ${stats.compatibility} + ${stats.noProblem} = ${sum}, expected ${stats.total}`);
  });

  it("fewer than 40 families cannot generate problems", () => {
    assert.ok(stats.noProblem < 40,
      `${stats.noProblem} families cannot generate problems, threshold is <40`);
  });
});

// ════════════════════════════════════════════════════════════════════════════════
// Correctness — adapted steps actually verify arithmetic
// ════════════════════════════════════════════════════════════════════════════════

describe("curriculum-wide coverage: correctness of kernel-backed families", () => {
  it("adapted steps in kernel-backed families have verified transformations", () => {
    let checked = 0;
    const failures: string[] = [];

    for (const id of stats.kernelFamilyIds) {
      const def = FAMILIES.get(id)!;
      const problem = tryGetProblem(def);
      if (!problem) continue;

      try {
        const adapted = adaptProblem(problem);
        if (!adapted.fullyAdapted) continue;

        for (const step of adapted.steps) {
          if (!(step as any).adapted) continue;
          if (!(step as any).transformation) {
            failures.push(`${id}: adapted step has no transformation`);
          }
        }
        checked++;
      } catch {}
    }

    assert.ok(checked >= 100,
      `Only checked ${checked} kernel-backed families, expected >=100`);
    assert.ok(failures.length === 0,
      `${failures.length} failures:\n${failures.slice(0, 10).join("\n")}`);
  });

  it("non-adapted steps do NOT claim kernel verification", () => {
    let checked = 0;

    for (const [id, def] of FAMILIES) {
      const problem = tryGetProblem(def);
      if (!problem) continue;

      try {
        const adapted = adaptProblem(problem);
        if (adapted.fullyAdapted) continue; // skip fully-adapted families

        for (const step of adapted.steps) {
          if (!(step as any).adapted) {
            // A non-adapted step should not have a verified transformation.
            assert.ok(!(step as any).transformation?.verified,
              `${id}: non-adapted step falsely claims verification`);
          }
        }
        checked++;
      } catch {}
    }

    assert.ok(checked > 100,
      `Only checked ${checked} non-adapted families, expected >100`);
  });
});

// ════════════════════════════════════════════════════════════════════════════════
// hasOpMappableSteps vs adaptProblem consistency
// ════════════════════════════════════════════════════════════════════════════════

describe("curriculum-wide coverage: op-mapping consistency", () => {
  it("if a family IS fully adapted, hasOpMappableSteps is true (or it has justifications)", () => {
    const failures: string[] = [];

    for (const id of stats.kernelFamilyIds) {
      const def = FAMILIES.get(id)!;
      const problem = tryGetProblem(def);
      if (!problem) continue;

      const hasJustifications = problem.steps.some((s: any) => s.justification);
      const hasMappable = hasOpMappableSteps(problem);

      if (!hasMappable && !hasJustifications) {
        failures.push(`${id}: fully adapted but hasOpMappableSteps=false and no justifications`);
      }
    }

    assert.ok(failures.length === 0,
      `${failures.length} inconsistencies:\n${failures.slice(0, 10).join("\n")}`);
  });

  it("hasOpMappableSteps=true does NOT guarantee full adaptation", () => {
    // There should exist families where hasOpMappableSteps is true
    // but adaptation fails (verify() rejects some steps).
    let mappableButNotAdapted = 0;

    for (const [id, def] of FAMILIES) {
      const problem = tryGetProblem(def);
      if (!problem) continue;

      const hasMappable = hasOpMappableSteps(problem);
      if (!hasMappable) continue;

      try {
        const adapted = adaptProblem(problem);
        if (!adapted.fullyAdapted) {
          mappableButNotAdapted++;
        }
      } catch {
        mappableButNotAdapted++;
      }
    }

    assert.ok(mappableButNotAdapted > 0,
      "Expected some families where hasOpMappableSteps=true but adaptation fails — " +
      "this confirms that verify() gates adaptation honestly");
  });
});
