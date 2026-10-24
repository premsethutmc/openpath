/** Investigation only: preserves the exact legacy algorithm; creates no new fingerprint contract. */
import { writeFileSync } from "node:fs";
import { loadContext, FROZEN_FRAMEWORK } from "../english/load.ts";
import { runAll, fingerprint } from "../english/sim/simulate.ts";
const target = process.argv[2];
if (!target) throw Error("Provide an output path outside the repository");
const banks = [];
for (const bank of ["e1", "e2a"] as const) {
  const results = await runAll(
    loadContext({
      allowCandidateAnchors: true,
      bank,
      framework: FROZEN_FRAMEWORK,
    }),
  );
  banks.push({
    bank,
    fingerprint: fingerprint(results),
    output: results.map((r) => ({
      learner: r.learner.id,
      composite: r.ledger.composite,
      decisions: r.ledger.decisions,
      recommendations: r.recommendations,
    })),
  });
}
const output = {
  schema: "fingerprint-portability-investigation@1",
  node: process.version,
  v8: process.versions.v8,
  powerReproduction: 0.5 ** (14 / 30),
  banks,
};
writeFileSync(target, JSON.stringify(output, null, 2) + "\n");
console.log(
  JSON.stringify(
    {
      node: output.node,
      v8: output.v8,
      powerReproduction: output.powerReproduction,
      banks: banks.map(({ bank, fingerprint }) => ({ bank, fingerprint })),
    },
    null,
    2,
  ),
);
