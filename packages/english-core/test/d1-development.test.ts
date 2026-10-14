/**
 * D1: the development plan (development.ts). Pure decisions from capability snapshots and framework
 * prerequisites; synthetic snapshots only. These test software behaviour, not educational effectiveness.
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { type CapabilitySnapshot, type EvidenceSummary, type Standing, explainPlanChange, foundHard, planDevelopment } from "../src/index.ts";

const none: EvidenceSummary = { independent: 0, independentRight: 0, assisted: 0, assistedRight: 0, unknown: 0, provisional: 0, provisionalRight: 0, practiceOnly: 0 };
let order = 0;
function cap(id: string, standing: Standing, e: Partial<EvidenceSummary> = {}, more: Partial<CapabilitySnapshot> = {}): CapabilitySnapshot {
  return { id, name: id.split(".").at(-1)!, strand: id.split(".").slice(0, 2).join("."), order: order++, standing, evidence: { ...none, ...e }, evidenceIds: e.independent ? [`${id}:e1`] : [], lastAt: null, content: { assess: 5, teach: null }, ...more };
}
const requires = new Map([
  ["EN.RDG.SUM.main_idea", ["EN.RDG.LIT.locate_detail"]],
  ["EN.RDG.SUM.summarise", ["EN.RDG.SUM.main_idea"]],
]);
const shownSpelling = () => [cap("EN.FND.SPL.inflections", "shown", { independent: 8, independentRight: 8 }), cap("EN.FND.SPL.morphological", "confirmed", { independent: 7, independentRight: 6 })];

test("D1-1 too little evidence anywhere: one initial assessment, no judgement about any capability", () => {
  order = 0;
  const plan = planDevelopment({ capabilities: [cap("EN.FND.SPL.inflections", "uncertain", { independent: 2, independentRight: 0 }), cap("EN.RDG.SUM.main_idea", "not_checked")], requires });
  assert.deepEqual(plan.today.map((r) => r.action), ["initial_assessment"]);
  assert.match(plan.today[0].why, /not a weakness/);
  assert.equal(plan.forAdults.length, 0);
});

test("D1-2 missing evidence is never weakness: a not-checked capability only ever leads to a check", () => {
  order = 0;
  const plan = planDevelopment({ capabilities: [...shownSpelling(), cap("EN.GRM.VERB.sva", "not_checked", {}, { content: { assess: 5, teach: "lesson" } })], requires });
  const sva = plan.all.filter((r) => r.capability === "EN.GRM.VERB.sva");
  assert.deepEqual(sva.map((r) => r.action), ["assess"]);
  assert.match(sva[0].why, /not a weakness/);
  assert.ok(!plan.all.some((r) => r.action === "teach" || r.action === "human_review"));
});

test("D1-3 strong spelling, uncertain comprehension: the plan asks about comprehension and does not repeat spelling", () => {
  order = 0;
  const plan = planDevelopment({ capabilities: [...shownSpelling(), cap("EN.RDG.LIT.locate_detail", "not_checked"), cap("EN.RDG.SUM.main_idea", "uncertain", { independent: 2, independentRight: 1 })], requires });
  assert.equal(plan.today[0].action, "reassess");
  assert.equal(plan.today[0].capability, "EN.RDG.SUM.main_idea");
  assert.ok(!plan.today.some((r) => r.capability?.startsWith("EN.FND.SPL")));
});

test("D1-4 a hard capability whose prerequisite is unmeasured: check the prerequisite first; if the prerequisite is hard and has no lessons, ask a person", () => {
  order = 0;
  const main = cap("EN.RDG.SUM.main_idea", "found_hard", { independent: 4, independentRight: 0 });
  const unmeasured = planDevelopment({ capabilities: [...shownSpelling(), cap("EN.RDG.LIT.locate_detail", "not_checked"), main], requires });
  assert.deepEqual([unmeasured.today[0].action, unmeasured.today[0].capability, unmeasured.today[0].because], ["check_prerequisite", "EN.RDG.LIT.locate_detail", "EN.RDG.SUM.main_idea"]);
  assert.ok(!unmeasured.all.some((r) => r.capability === "EN.RDG.SUM.main_idea"), "the dependent capability is not taught while its prerequisite is unknown");
  assert.match(unmeasured.notes["EN.RDG.SUM.main_idea"][0], /may reflect/i);
  order = 0;
  const hardBoth = planDevelopment({ capabilities: [...shownSpelling(), cap("EN.RDG.LIT.locate_detail", "found_hard", { independent: 4, independentRight: 1 }), cap("EN.RDG.SUM.main_idea", "found_hard", { independent: 4, independentRight: 0 })], requires });
  assert.ok(hardBoth.forAdults.some((r) => r.capability === "EN.RDG.LIT.locate_detail"));
  assert.ok(!hardBoth.today.some((r) => r.capability === "EN.RDG.SUM.main_idea"));
});

test("D1-5 a hard capability with shown prerequisites and a lesson: teach it; with no lesson: a person, never an invented activity", () => {
  order = 0;
  const withLesson = planDevelopment({ capabilities: [...shownSpelling(), cap("EN.GRM.VERB.sva", "found_hard", { independent: 4, independentRight: 0 }, { content: { assess: 5, teach: "Subject–verb agreement lesson" } })], requires });
  assert.deepEqual([withLesson.today[0].action, withLesson.today[0].content.available], ["teach", true]);
  order = 0;
  const noLesson = planDevelopment({ capabilities: [...shownSpelling(), cap("EN.WRT.ACC.grammar", "found_hard", { independent: 4, independentRight: 0 })], requires });
  assert.ok(!noLesson.today.some((r) => r.capability === "EN.WRT.ACC.grammar"));
  assert.equal(noLesson.forAdults[0].capability, "EN.WRT.ACC.grammar");
  assert.equal(noLesson.forAdults[0].content.available, false);
});

test("D1-6 right mostly with help is not mastery: an independent check, nothing built on it", () => {
  order = 0;
  const plan = planDevelopment({ capabilities: [...shownSpelling(), cap("EN.RDG.LIT.locate_detail", "uncertain", { independent: 2, independentRight: 1, assisted: 8, assistedRight: 8 }), cap("EN.RDG.SUM.main_idea", "not_checked")], requires });
  assert.equal(plan.today[0].action, "independent_check");
  assert.ok(!plan.all.some((r) => r.action === "next_capability"), "main_idea is not offered on the strength of help");
});

test("D1-7 retention: a failed later check comes first; a due check before new work", () => {
  order = 0;
  const plan = planDevelopment({ capabilities: [cap("EN.GRM.VERB.sva", "not_kept", { independent: 9, independentRight: 6 }, { content: { assess: 3, teach: "lesson" } }), cap("EN.GRM.NOUN.articles", "check_due", { independent: 8, independentRight: 7 }), cap("EN.RDG.SUM.main_idea", "not_checked")], requires });
  assert.deepEqual(plan.today.slice(0, 2).map((r) => r.action), ["refresh", "retention_check"]);
});

test("D1-8 content exhaustion: nothing undeliverable is offered to the learner; it goes to an adult", () => {
  order = 0;
  const plan = planDevelopment({ capabilities: [...shownSpelling(), cap("EN.RDG.SUM.main_idea", "uncertain", { independent: 2, independentRight: 1 }, { content: { assess: 0, teach: null } })], requires });
  assert.ok(plan.today.every((r) => r.content.available));
  assert.ok(plan.forAdults.some((r) => r.capability === "EN.RDG.SUM.main_idea" && /every question/.test(r.why)));
});

test("D1-9 a prerequisite shown and the next capability unchecked: offer the next step", () => {
  order = 0;
  const plan = planDevelopment({ capabilities: [...shownSpelling(), cap("EN.RDG.LIT.locate_detail", "shown", { independent: 6, independentRight: 6 }), cap("EN.RDG.SUM.main_idea", "not_checked")], requires });
  assert.deepEqual([plan.today[0].action, plan.today[0].capability], ["next_capability", "EN.RDG.SUM.main_idea"]);
});

test("D1-10 every recommendation says what, why, which evidence, what would change it, and whether it can be delivered; the plan is deterministic", () => {
  order = 0;
  const caps = [...shownSpelling(), cap("EN.RDG.LIT.locate_detail", "not_checked"), cap("EN.RDG.SUM.main_idea", "found_hard", { independent: 4, independentRight: 0 }), cap("EN.GRM.VERB.sva", "uncertain", { independent: 2, independentRight: 1 })];
  const a = planDevelopment({ capabilities: caps, requires });
  const b = planDevelopment({ capabilities: [...caps].reverse(), requires });
  assert.equal(JSON.stringify(a), JSON.stringify(b));
  for (const r of a.all) {
    assert.ok(r.what && r.why && r.changeIf && r.content.note, r.action);
    assert.ok(Array.isArray(r.evidence));
  }
  assert.ok(a.today.length <= 3 && new Set(a.today.map((r) => r.capability)).size === a.today.length);
});

test("D1-11 the change explanation names the standing that changed and the actions added and dropped", () => {
  order = 0;
  const before = [...shownSpelling(), cap("EN.RDG.LIT.locate_detail", "not_checked"), cap("EN.RDG.SUM.main_idea", "found_hard", { independent: 4, independentRight: 0 })];
  order = 0;
  const after = [...shownSpelling(), cap("EN.RDG.LIT.locate_detail", "shown", { independent: 5, independentRight: 5 }), cap("EN.RDG.SUM.main_idea", "found_hard", { independent: 4, independentRight: 0 })];
  const lines = explainPlanChange({ plan: planDevelopment({ capabilities: before, requires }), capabilities: before }, { plan: planDevelopment({ capabilities: after, requires }), capabilities: after });
  assert.match(lines[0], /locate_detail: not checked yet → shown on their own/);
  assert.ok(lines.some((l) => /No longer planned: Check locate_detail first/.test(l)));
  assert.ok(lines.some((l) => /Now planned: Ask a teacher or parent to look at main_idea/.test(l)));
});

test("D1-12 'found hard' needs enough independent answers: two wrong answers are not a difficulty", () => {
  assert.equal(foundHard({ independent: 2, independentRight: 0 }), false);
  assert.equal(foundHard({ independent: 3, independentRight: 0 }), true);
  assert.equal(foundHard({ independent: 6, independentRight: 3 }), false);
});
