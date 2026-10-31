/** Studio labels say exactly what the evidence state is: suspicion, confirmed gap, estimate and verified mastery stay apart. */
import assert from "node:assert/strict";
import { test } from "node:test";
import type { CompetencyStatus } from "../../../../../packages/english-core/src/index.ts";
import { estimateLabel, evidenceLabel, formativeLabel, lessonLabel } from "./evidence-labels.ts";

const base = (o: Partial<CompetencyStatus> = {}): CompetencyStatus =>
  ({
    competency: "EN.GRM.NOUN.plurals_countability",
    name: "Plurals and countability",
    area: "grammar",
    state: "unknown",
    gap: null,
    engine: { stage: "unassessed", verification: "not_demonstrated", currentLevel: null, target: 5, demonstrated: null, mastered: null, directN: 0, estimate: null, verifiedLevel: null, verifiedOn: null, verificationWithheld: false },
    formative: null,
    lessons: null,
    essays: { errors: 0, strengths: 0, essays: 0 },
    provenance: { tentative: [], independent: [], assisted: [], held: [], provisional: [] },
    notes: [],
    ...o,
  }) as CompetencyStatus;
const gap = (status: string) => ({ id: "h", competency: "c", status, uncertainty: "low", essays: ["e"], observations: [], misconceptions: [], basis: [], engine: "not_demonstrated", policy: "p" }) as unknown as CompetencyStatus["gap"];

test("LABELS one label per evidence state; verified mastery only as the engine and policy say; lessons kept apart", () => {
  assert.equal(evidenceLabel(base()).key, "none");
  assert.equal(evidenceLabel(base({ state: "observed" })).key, "seen");
  assert.equal(evidenceLabel(base({ state: "suspected", gap: gap("suspected") })).label, "Suspected from your essay");
  assert.equal(evidenceLabel(base({ state: "suspected", gap: gap("confirmed") })).label, "Gap confirmed");
  assert.equal(evidenceLabel(base({ state: "observed", gap: gap("weakened") })).key, "not_confirmed");
  assert.equal(evidenceLabel(base({ state: "demonstrated" })).key, "shown");
  const eng = base().engine;
  // verification@2 and the eligibility policy decide the state; the label only words it
  assert.equal(evidenceLabel(base({ state: "demonstrated", engine: { ...eng, verificationWithheld: true } })).key, "shown_unreviewed_check", "a delayed check passed on unreviewed questions is not verified mastery");
  assert.equal(evidenceLabel(base({ state: "verified", engine: { ...eng, verifiedOn: "reviewed", verifiedLevel: 5 } })).label, "Verified mastery");
  assert.match(evidenceLabel(base({ state: "verified", engine: { ...eng, verifiedOn: "unreviewed", verifiedLevel: 5 } })).label, /developer test/);
  // lessons: progress, separate from evidence
  const lessons = { competency: "c", lessons: [], completed: 5, total: 5, percent: 100, sessions: 3, fixedBy: "j1" };
  assert.match(lessonLabel(base({ state: "suspected", gap: gap("confirmed"), lessons }))!, /5 of 5 \(100%\)\. All lessons done; .* not mastery/);
  assert.equal(evidenceLabel(base({ state: "suspected", gap: gap("confirmed"), lessons })).key, "confirmed", "completing lessons changes no evidence label");
  assert.equal(lessonLabel(base()), null);
  assert.match(estimateLabel(base()), /none yet/);
  assert.match(estimateLabel(base({ engine: { ...base().engine, directN: 3, estimate: { mean: 3.21, sd: 0.8 } } })), /band 3.2 ± 0.8 from 3 counted answers \(an estimate, not mastery/);
  assert.equal(formativeLabel(base()), null);
  assert.match(formativeLabel(base({ formative: { set: "s", competency: "c", status: "secure", right: 5, answered: 5, total: 5, misconceptionMatches: 0, answers: [], reason: "" } }))!, /5 of 5 right. Formative only/);
});
