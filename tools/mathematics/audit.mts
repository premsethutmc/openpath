/** Deterministic engineering audit, not educator validation. Inventory remains unchanged. */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import {
  competencies,
  validateGraph,
} from "../../packages/mathematics/src/curriculum";
import { programs } from "../../packages/mathematics/src/program";
import {
  families,
  generate,
  type Family,
} from "../../packages/mathematics/src/generator";
const familyAudit = Object.keys(families).map((id) => {
  const items = Array.from({ length: 4096 }, (_, i) =>
    generate(id as Family, i + 1),
  );
  const fingerprints = new Set(items.map((i) => i.fingerprint));
  const stems = new Set(items.map((i) => i.statement));
  const answers = new Set(items.map((i) => i.answer.value));
  const duplicates = new Map<string, Set<string>>();
  for (const i of items) {
    const set = duplicates.get(i.statement) ?? new Set<string>();
    set.add(i.fingerprint);
    duplicates.set(i.statement, set);
  }
  return {
    id,
    sampledSeeds: [1, 4096],
    uniqueFingerprints: fingerprints.size,
    uniqueStatements: stems.size,
    uniqueAnswers: answers.size,
    statementsWithMultipleFingerprints: [...duplicates.values()].filter(
      (s) => s.size > 1,
    ).length,
    educationalValidation: "not-reviewed",
    examReadiness: "disabled",
  };
});
console.log(
  JSON.stringify(
    {
      inventorySHA256: createHash("sha256")
        .update(
          readFileSync(
            new URL(
              "../../content/mathematics/curriculum.v1.json",
              import.meta.url,
            ),
          ),
        )
        .digest("hex"),
      competencies: competencies.length,
      prerequisiteEdges: competencies.reduce(
        (n, c) => n + c.prerequisites.length,
        0,
      ),
      graphErrors: validateGraph(),
      executableProgramAudit: programs
        .filter((p) => p.families.length)
        .map((p) => ({
          competencyId: p.competencyId,
          families: p.families,
          instruction: "objective-restatement-only",
          workedExamples: "generated-short-procedures",
          completeInstructionalProgram: false,
          educatorReviewed: false,
          application: "same-family-template",
          transfer: "same-family-variant-not-validated",
          retention: "host-pending",
        })),
      familyAudit,
    },
    null,
    2,
  ),
);
