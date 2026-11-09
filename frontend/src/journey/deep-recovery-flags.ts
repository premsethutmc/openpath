/**
 * deep-recovery@0 research: graph relations flagged for EDUCATOR REVIEW (nothing here changes the graph or any content).
 * Each flag is recomputed from the shipped graph and content so it can be audited:
 *   node --import tsx src/journey/deep-recovery-flags.ts > ../research/deep-recovery/review/flagged-links.json
 */
import { graph } from "../../../packages/learning/src/graph";
import { moduleFor, question } from "../../../packages/learning/src/content";
import { modulePhasePool } from "../../../packages/learning/src/library";
import { problemOf } from "../../../packages/learning/src/families";

const rel = (target: string, from: string) => graph.relationsOf(target).find((r) => r.from === from) ?? null;
const logShare = (c: string) => {
  const m = moduleFor(c);
  if (!m) return null;
  const ids = (["diagnostic", "practice", "check"] as const).flatMap((ph) => modulePhasePool(m, ph));
  const hits = ids.filter((q) => { const b = q.replace(/:(mc|w)$/, ""); const x = question(b); return /\blog\b|\bln\b/i.test(`${x.prompt} ${x.answer}`); });
  const stepsNameLog = hits.some((q) => (problemOf(q.replace(/:(mc|w)$/, ""))?.steps ?? []).some((s) => String(s.competency ?? "").includes("logarithm")));
  return { items: ids.length, mentioningLog: hits.length, families: [...new Set(hits.map((q) => q.split(":")[1]))], solutionStepsNameLogarithms: stepsNameLog };
};
const LOG = "MATH.algebra.logarithms";
const flags = [
  ...["MATH.calculus.integration-methods", "MATH.calculus.partial-fractions-integration", "MATH.calculus.indefinite-integrals"].map((t) => ({
    kind: "missing-link?", target: t, from: LOG, existing: rel(t, LOG),
    evidence: logShare(t),
    note: "Answers use ln|…|. Recovery cannot reach logarithms from here. Caution: ∫1/x dx = ln|x| is arguably part of the integration skill itself, not logarithm laws; a link is only warranted if combining or simplifying logarithms is required. Proposed relation type if accepted: support (never a gate).",
  })),
  { kind: "questionable-mandatory", target: "MATH.calculus.continuity", from: "MATH.calculus.derivatives", existing: rel("MATH.calculus.continuity", "MATH.calculus.derivatives"), note: "Continuity is normally taught before derivatives; a mandatory edge from derivatives looks reversed." },
  { kind: "questionable-mandatory", target: "MATH.algebra.polynomials", from: "MATH.algebra.inverse-proportion", existing: rel("MATH.algebra.polynomials", "MATH.algebra.inverse-proportion"), note: "Operating on polynomials does not obviously rest on inverse proportion." },
  { kind: "questionable-mandatory", target: "MATH.calculus.differential-equations", from: "MATH.calculus.area-integrals", existing: rel("MATH.calculus.differential-equations", "MATH.calculus.area-integrals"), note: "Solving differential equations needs integration, not areas by integration specifically." },
  { kind: "missing-link?", target: "MATH.calculus.derivative-rules", from: "MATH.calculus.derivatives", existing: rel("MATH.calculus.derivative-rules", "MATH.calculus.derivatives"), note: "Derivative rules reach the derivative concept only via differentiability -> continuity -> derivatives." },
  { kind: "missing-link?", target: "MATH.calculus.partial-fractions-integration", from: "MATH.algebra.partial-fractions", existing: rel("MATH.calculus.partial-fractions-integration", "MATH.algebra.partial-fractions"), note: "Integrating by partial fractions has no relation to the algebra skill of partial fractions (question steps do name it)." },
];
console.log(JSON.stringify({ status: "unreviewed research flags; not content; nothing applied", graph: graph.version, flags }, null, 1));
