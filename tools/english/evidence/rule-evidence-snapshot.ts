/**
 * Snapshot of what the rule-evidence projection and the planner decide for the fixed rule profiles
 * (packages/english-core/test/rule-profiles.ts), with item and evidence ids left out so that renaming a test
 * fixture's ids does not count as a change. Used to prove that Assessment Evidence v1 leaves the production
 * policy's statuses and planner decisions unchanged.
 *
 *   node tools/english/evidence/rule-evidence-snapshot.ts > packages/english-core/test/fixtures/rule-evidence-baseline.json
 */
import { capabilityClaim, englishInflections, INFLECTION_STRATEGIES, planRule, projectRuleEvidence, ruleRecord } from "../../../packages/english-core/src/index.ts";
import { PROFILES, STAGES, engineView, runProfile } from "../../../packages/english-core/test/rule-profiles.ts";

export function snapshot() {
  const out: Record<string, unknown> = {};
  for (const name of Object.keys(PROFILES)) {
    for (const stage of STAGES) {
      const run = runProfile(name, { through: stage.name });
      const l = run.ledger;
      const p = projectRuleEvidence(l, l.ctx.content, englishInflections, engineView(l));
      const cap = Object.keys(p.capabilities)[0];
      const rules = p.capabilities[cap].rules.map((r) => ({
        rule: r.rule, status: r.status, current: [r.current.right, r.current.total], allTime: [r.allTime.right, r.allTime.total],
        contrast: r.contrast, practice: r.practice, assisted: [r.assisted.right, r.assisted.total], unknown: r.unknown, repeats: r.repeats, slips: r.slips,
        inconsistent: r.inconsistent, transferGap: r.transferGap, succeedsWithHelp: r.succeedsWithHelp, retention: r.retention.state,
        checks: r.retention.checks.map((c) => [c.applications, c.ruleErrors, c.slips, c.afterDemonstration, c.passed]),
        misconceptions: r.misconceptions.map((m) => [m.tag, m.state, m.errors.length, m.practiceErrors.length, m.recurrences]),
        statusChanges: r.history.statusChanges.map((s) => s.status), evidenceBasis: r.evidenceBasis,
      }));
      const ds = p.capabilities[cap].rules.find((r) => r.rule === "double_short")!;
      const at = l.events.at(-1)!.at;
      const plan = planRule({ rule: ds, strategies: INFLECTION_STRATEGIES.double_short, now: at, sessionStartedAt: at, session: stage.name,
        available: { apply: 3, contrast: 2, guided: 8 }, answeredThisSession: 0, guidedThisBlock: 0 });
      const claim = p.capabilities[cap].claim;
      out[`${name}/${stage.name}`] = {
        rules, plan: { action: plan.action, itemRole: plan.itemRole ?? null, strategy: plan.strategy ?? null, diagnosis: plan.diagnosis.kind, outcome: plan.outcome ?? null },
        claim: { supported: claim.supportedMasteryBand, labelSupported: claim.engineMasteryLabelSupported, through: claim.rulesVerifiedThroughBand },
        observations: ruleRecord(l.events, l.decisions, l.ctx.content, englishInflections).observations.length,
      };
    }
  }
  return out;
}

if (import.meta.url === `file://${process.argv[1]}`) process.stdout.write(JSON.stringify(snapshot(), null, 1) + "\n");
