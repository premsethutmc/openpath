/**
 * Competency-by-competency assessment coverage for the Grade 8 essay profile (assessment evidence and retention v1).
 *
 * For each specified competency: the live code-scored questions, their content status and difficulty bands, the
 * roles each is eligible for (allocation.ts), the reserves a new learner gets, and what is left after one
 * standard journey. Then the minimum additional reviewed content for a credible Grade 8 pilot, by a stated rule.
 *
 *   node tools/english/assessment-coverage.ts          JSON
 *   node tools/english/assessment-coverage.ts --md     Markdown tables used in the docs
 *
 * Nothing here generates or labels questions. Every existing question is "candidate" content (expert-estimated
 * difficulty, not reviewed by an educator), so all of it also needs review before a pilot.
 */
import { ABOVE_TARGET, allocateItems, type ContentStatus, ITEM_ROLES, type ItemRole, itemEligibility } from "../../packages/english-core/src/index.ts";
import { loadAppEssayContext } from "./essay-load.ts";

const ectx = loadAppEssayContext();
const p = ectx.policy;

/** The rule for a credible pilot, per competency (stated so it can be argued with). */
export const PILOT_RULE = {
  /** In [target, target + 1.5]: the retention reserve, the journey's check and the later checks, and one diagnostic question at the target. */
  independent: (followUps: number) => p.retentionItems + p.checkItems * (1 + followUps) + 1,
  /** In [target − 1, target): the rest of one diagnostic request. */
  diagnosticBelow: p.diagnosticItems - 1,
  /** Below the target band: one journey's guided practice. */
  practice: p.guidedItems,
};

export function coverage() {
  return ectx.profile.profile.competencies
    .filter((c) => c.specified && c.expectedBand !== null)
    .map((c) => {
      const t = c.expectedBand!;
      const el = itemEligibility(ectx, c.capability);
      const status: Record<ContentStatus, number> = { validated: 0, candidate: 0, provisional: 0, practice: 0 };
      for (const e of el) status[e.status]++;
      const band = {
        belowNear: el.filter((e) => e.b >= t - 1 && e.b < t).length,
        below: el.filter((e) => e.b < t - 1).length,
        target: el.filter((e) => e.b >= t && e.b <= t + ABOVE_TARGET).length,
        above: el.filter((e) => e.b > t + ABOVE_TARGET).length,
      };
      const roles = Object.fromEntries(ITEM_ROLES.map((r) => [r, el.filter((e) => e.roles.includes(r)).length])) as Record<ItemRole, number>;
      const leaked = el.filter((e) => e.leak).map((e) => ({ item: e.item, words: e.leak }));
      const fresh = allocateItems(ectx, [], c.capability);
      // what one standard journey uses: one diagnostic request, one practice step, the journey's check
      const used = new Set([...fresh.available.diagnostic.slice(0, p.diagnosticItems)]);
      const afterDiag = allocateItems(ectx, [], c.capability, { exclude: used });
      afterDiag.available.guided_practice.slice(0, p.guidedItems).forEach((i) => used.add(i));
      allocateItems(ectx, [], c.capability, { exclude: used }).available.independent_verification.slice(0, p.checkItems).forEach((i) => used.add(i));
      const after = allocateItems(ectx, [], c.capability, { exclude: used });
      // distinct families (two variants of one question never both count); retention first, then checks, from the
      // questions each role may use (with the pilot's pools the two roles have separate questions)
      const families = (role: ItemRole) => [...new Set(el.filter((e) => e.roles.includes(role) && e.b >= t && e.b <= t + ABOVE_TARGET).map((e) => e.family))];
      const retentionFams = families("delayed_retention").slice(0, p.retentionItems);
      const verificationFams = families("independent_verification").filter((f) => !retentionFams.includes(f));
      const shortBy = (checks: number) => Math.max(0, p.retentionItems - retentionFams.length) + Math.max(0, p.checkItems * (1 + checks) + 1 - verificationFams.length);
      const indepEligible = verificationFams.length;
      const needA = PILOT_RULE.independent(p.followUpChecks);
      return {
        capability: c.capability,
        name: c.name,
        target: t,
        targetStatus: c.expectedBandStatus ?? "unlabelled",
        questions: el.length,
        pooled: el.some((e) => ectx.pools?.has(e.item)),
        status,
        band,
        roles,
        independentFamilies: indepEligible,
        retentionFamilies: families("delayed_retention").length,
        leaked,
        newLearner: {
          retentionReserve: fresh.reserved.delayed_retention.length,
          verification: fresh.reserved.independent_verification.length,
          diagnosticAtTarget: fresh.available.diagnostic.some((id) => (ectx.ctx.content.items.get(id)?.b ?? 0) >= t),
          practice: fresh.available.guided_practice.length,
          shortfall: fresh.shortfall,
        },
        afterOneJourney: {
          verificationLeft: after.reserved.independent_verification.length,
          retentionLeft: after.reserved.delayed_retention.length,
          laterCheckPossible: after.reserved.independent_verification.length >= p.checkItems,
        },
        pilot: {
          requiredIndependent: needA,
          addIndependent: shortBy(p.followUpChecks),
          addIndependentForTwoLaterChecks: shortBy(2),
          addDiagnosticBelow: Math.max(0, PILOT_RULE.diagnosticBelow - band.belowNear),
          addPractice: Math.max(0, PILOT_RULE.practice - roles.guided_practice),
          reviewExisting: el.filter((e) => e.status !== "validated" && (e.roles.includes("independent_verification") || e.roles.includes("diagnostic"))).length,
        },
      };
    });
}

function markdown(rows: ReturnType<typeof coverage>): string {
  const t1 = [
    "| Competency | Questions | b < t−1 | t−1 ≤ b < t | t ≤ b ≤ t+1.5 | b > t+1.5 | Practice-eligible | Families with t ≤ b ≤ t+1.5: for checks (after the retention reserve) / for retention | Leaked by a lesson | New learner: retention reserve / verification | After one journey: later check possible |",
    "|---|---:|---:|---:|---:|---:|---:|---:|---|---|---|",
    ...rows.map((r) => `| ${r.name} | ${r.questions} | ${r.band.below} | ${r.band.belowNear} | ${r.band.target} | ${r.band.above} | ${r.roles.guided_practice} | ${r.independentFamilies} / ${r.retentionFamilies}${r.pooled ? " (pilot pools)" : " (shared)"} | ${r.leaked.length ? r.leaked.map((l) => `${l.item} ("${l.words}")`).join(", ") : "none found"} | ${r.newLearner.retentionReserve} / ${r.newLearner.verification} | ${r.afterOneJourney.laterCheckPossible ? "yes" : "no"} (${r.afterOneJourney.verificationLeft} left) |`),
  ];
  const t2 = [
    "| Competency | Add, t ≤ b ≤ t+1.5 (current policy: 1 later check) | Add for 2 later checks | Add, t−1 ≤ b < t | Add, practice | Existing questions to review |",
    "|---|---:|---:|---:|---:|---:|",
    ...rows.map((r) => `| ${r.name} | ${r.pilot.addIndependent} | ${r.pilot.addIndependentForTwoLaterChecks} | ${r.pilot.addDiagnosticBelow} | ${r.pilot.addPractice} | ${r.pilot.reviewExisting} |`),
  ];
  const sum = (f: (r: (typeof rows)[number]) => number) => rows.reduce((s, r) => s + f(r), 0);
  return [
    `Target t = the provisional Grade 8 band (5 for every specified competency). Every question is "candidate" content: ${sum((r) => r.status.validated)} of ${sum((r) => r.questions)} are educator-validated.`,
    "",
    ...t1,
    "",
    `Pilot rule per competency: ${PILOT_RULE.independent(p.followUpChecks)} unseen reviewed questions with t ≤ b ≤ t+1.5 (retention ${p.retentionItems} + journey check ${p.checkItems} + ${p.followUpChecks} later check × ${p.checkItems} + 1 diagnostic at the target), ${PILOT_RULE.diagnosticBelow} with t−1 ≤ b < t, ${PILOT_RULE.practice} for practice below t.`,
    "",
    ...t2,
    "",
    `Totals: add ${sum((r) => r.pilot.addIndependent)} questions with t ≤ b ≤ t+1.5 (${sum((r) => r.pilot.addIndependentForTwoLaterChecks)} for two later checks), ${sum((r) => r.pilot.addDiagnosticBelow)} with t−1 ≤ b < t, ${sum((r) => r.pilot.addPractice)} practice; review ${sum((r) => r.pilot.reviewExisting)} existing questions.`,
  ].join("\n");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const rows = coverage();
  console.log(process.argv.includes("--md") ? markdown(rows) : JSON.stringify(rows, null, 1));
}
