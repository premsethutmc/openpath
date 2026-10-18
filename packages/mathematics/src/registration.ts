import { indexFramework } from "../../english-core/src/framework";
import type { Framework } from "../../english-core/src/types";
import { indexContent } from "../../english-core/src/content";
import { Ledger, type Context } from "../../english-core/src/updater";
import english from "../../../content/english/framework/en-0.2.0.json";
import { competencies } from "./curriculum";
/** Reuse host policy verbatim; no math calibration/eligibility changes. All content remains provisional. */
export function mathematicsContext(): Context {
  const strands = [...new Set(competencies.map((c) => c.strand))].map(
    (strand) => ({
      id: `MATH.${strand}`,
      name: strand,
      weight: 1,
      substrands: [
        {
          id: `MATH.${strand}.group`,
          name: strand,
          weight: 1,
          capabilities: competencies
            .filter((c) => c.strand === strand)
            .map((c) => ({
              id: c.id,
              name: c.name,
              tier: "planned" as const,
              description: c.description,
              weight: 1,
            })),
        },
      ],
    }),
  );
  const framework: Framework = {
    id: "math",
    version: "1.0.0",
    title: "Mathematics",
    status: "provisional",
    review: {
      author: "OpenPath",
      licence: english.review.licence,
      status: "provisional",
    },
    scale: { min: 1, max: 8 },
    prior: structuredClone(english.prior),
    policy: structuredClone(english.policy),
    strands,
    couplings: [],
    prerequisites: competencies.flatMap((c) =>
      c.prerequisites.map((p) => ({ capability: c.id, requires: p })),
    ),
  };
  const index = indexFramework(framework, {
    root: "MATH",
    stableCapabilityIds: true,
  });
  return {
    index,
    content: indexContent(
      { items: [], passages: [], goals: [], misspellings: {} },
      index,
    ),
  };
}
export function mathematicsLedger(learnerId: string) {
  return new Ledger(mathematicsContext(), learnerId);
}
