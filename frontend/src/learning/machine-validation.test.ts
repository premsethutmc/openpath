/**
 * machine-validation@1 acceptance tests. With no educators, an independently certified, unchanged, grading-certified question
 * counts as validated evidence, so a learner can reach "verified" without the test-only review fixture. The route must fail
 * closed: a changed family, an excluded or quarantined question, the everyday-wording form, a family that was never certified
 * and a hand-written question no blind review agreed with stay provisional, and nothing is ever labelled educator-reviewed.
 * Synthetic learners: this shows what the program decides, never that anyone learned.
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { Driver, right } from "./driver";
import { boardFor } from "../../../packages/learning/src/curricula";
import { questions } from "../../../packages/learning/src/content";
import { nativeItem, reviewFixtureActive } from "../../../packages/learning/src/evidence";
import { FAMILIES, pool, problemOf } from "../../../packages/learning/src/families";
import { machineRegistry, machineReleaseOf, useMachineValidation, type MachineRegistry } from "../../../packages/learning/src/machine-validation";
import { quarantinedIds } from "../../../packages/learning/src/question-status";
import { fingerprintOf } from "../../../packages/learning/src/review";
import { ELIGIBLE_MAX } from "../../../packages/learning/src/intervention";
import { question } from "../../../packages/learning/src/content";

const reg = machineRegistry;
const entry = (fam: string) => reg.entries.find((e) => e.family === fam)!;
const firstFree = (fam: string) => pool(fam).items.find((p) => !(entry(fam).excluded ?? []).includes(p.id))!.id;

test("the registry admits only typed, multiple-choice and verified wording forms of known families, and says it is not educator review", () => {
  assert.equal(reg.schema, "machine-validation@1");
  assert.ok(reg.entries.length > 900, `${reg.entries.length} families admitted`);
  assert.ok(Number.isFinite(Date.parse(reg.validatedAt)));
  for (const e of reg.entries) {
    assert.ok(FAMILIES.has(e.family), e.family);
    assert.ok(e.forms.length > 0 && e.forms.every((f) => f === "typed" || f === "mc" || f === "w"), `${e.family}: ${e.forms}`);
    assert.ok(!e.forms.includes("w") || e.forms.includes("typed"), `${e.family}: a wording form without its typed form`);
    assert.ok(!(e.family in reg.held), `${e.family} is both admitted and held`);
  }
  assert.match((reg as unknown as { note: string }).note, /NOT educator review/);
});

test("registry entries carry the current fingerprint (a spread of families; a stale entry is inert, never wrong)", () => {
  const step = Math.ceil(reg.entries.length / 12);
  const stale = reg.entries.filter((_, i) => i % step === 0).filter((e) => e.fingerprint !== fingerprintOf(e.family)).map((e) => e.family);
  assert.deepEqual(stale, [], "rebuild with packages/learning/scripts/machine-validation.ts after certifying the changed families");
});

test("a certified typed question is validated; its everyday-wording form, an excluded question and a held family are not", () => {
  const typedFam = reg.entries.find((e) => e.forms.includes("typed") && e.forms.includes("mc") && !e.forms.includes("w") && FAMILIES.get(e.family)!.word)!.family;
  const id = firstFree(typedFam);
  assert.equal(machineReleaseOf(id), entry(typedFam).since ?? reg.validatedAt);
  assert.equal(machineReleaseOf(`${id}:mc`), entry(typedFam).since ?? reg.validatedAt);
  assert.ok(problemOf(`${id}:w`), "the family has an everyday-wording form");
  assert.equal(machineReleaseOf(`${id}:w`), undefined, "this family's wording was never verified");
  // a family whose every wording was verified from the wording alone (wordrefs.py) has its wording form admitted
  const worded = reg.entries.find((e) => e.forms.includes("w"))!;
  assert.equal(machineReleaseOf(`${firstFree(worded.family)}:w`), worded.since ?? reg.validatedAt);

  const withExcluded = reg.entries.find((e) => e.excluded?.length)!;
  assert.equal(machineReleaseOf(withExcluded.excluded![0]), undefined);
  assert.equal(machineReleaseOf(`${withExcluded.excluded![0]}:mc`), undefined);

  const typedOnly = reg.entries.find((e) => !e.forms.includes("mc") && FAMILIES.get(e.family)!.mc && e.family in reg.partial);
  if (typedOnly) assert.equal(machineReleaseOf(`${firstFree(typedOnly.family)}:mc`), undefined, "multiple choice not certified for this family");

  const heldFam = Object.keys(reg.held).find((f) => FAMILIES.has(f) && pool(f).items.length)!;
  assert.equal(machineReleaseOf(pool(heldFam).items[0].id), undefined, reg.held[heldFam]);
  assert.equal(machineReleaseOf("not-a-generated-question"), undefined);
});

test("a quarantined question is never validated", () => {
  const admitted = new Set(reg.entries.map((e) => e.family));
  const q = quarantinedIds().filter((id) => admitted.has(id.split(":")[1]));
  assert.ok(q.length > 0, "the quarantine registry holds questions of admitted families");
  for (const id of q.slice(0, 200)) assert.equal(machineReleaseOf(id), undefined, id);
});

test("a changed family switches its entry off, and the route can be switched off altogether", () => {
  const e = reg.entries.find((x) => x.forms.includes("typed"))!;
  const id = firstFree(e.family);
  try {
    const changed: MachineRegistry = { ...reg, entries: [{ ...e, fingerprint: "0000changed" }] };
    useMachineValidation(true, changed);
    assert.equal(machineReleaseOf(id), undefined, "the certification applied to another version of the family");
    useMachineValidation(false);
    assert.equal(machineReleaseOf(id), undefined);
  } finally {
    useMachineValidation(true);
  }
  assert.equal(machineReleaseOf(id), e.since ?? reg.validatedAt);
});

test("the item is labelled machine-checked, never educator-reviewed", () => {
  assert.equal(reviewFixtureActive(), false);
  const e = reg.entries.find((x) => x.forms.includes("typed"))!;
  const it = nativeItem(question(firstFree(e.family))) as { evidence_status: string; released_at?: string; review: string };
  assert.equal(it.evidence_status, "validated");
  assert.equal(it.released_at, e.since ?? reg.validatedAt);
  assert.match(it.review, /^Machine-checked/);
  assert.match(it.review, /Not educator-reviewed/);
});

test("a hand-written question is validated only if a blind review agreed with its answer and it is unchanged since", () => {
  const written = questions.filter((q) => !q.id.startsWith("gen:"));
  const listed = reg.written ?? {};
  assert.ok(Object.keys(listed).length > 150, `${Object.keys(listed).length} hand-written questions admitted`);
  for (const q of written) {
    const status = (nativeItem(q) as { evidence_status: string }).evidence_status;
    assert.equal(status, q.id in listed ? "validated" : "provisional", q.id);
    if (q.id in listed) assert.ok(["integer", "choice", "fraction"].includes(q.type), `${q.id}: ${q.type}`);
    else assert.ok(reg.writtenHeld?.[q.id], `${q.id} is held with a reason`);
  }
  // the question the first review found to have two correct options was reworded and reviewed again
  assert.equal(machineReleaseOf("wm-tri-d1"), reg.validatedAt);
  assert.ok(Object.values(reg.writtenHeld ?? {}).every((why) => /answer type set/.test(why)), "only set answers are held");
  // any change to a reviewed question ends its admission
  const id = Object.keys(listed)[0];
  try {
    useMachineValidation(true, { ...reg, written: { ...listed, [id]: "0000changed" } });
    assert.equal(machineReleaseOf(id), undefined);
  } finally {
    useMachineValidation(true);
  }
  assert.equal(machineReleaseOf(id), reg.validatedAt);
});

test("a learner reaches verified without the review fixture, and only through machine validation", () => {
  const release = boardFor("tn", 7)!;
  const skill = "MATH.algebra.algebra-simplify";
  const journey = () => {
    // the journey starts after the registry's validation time: earlier answers are before release and never count
    const d = new Driver(`mv-${skill}`, Date.parse(reg.validatedAt) + 2 * 86_400_000);
    d.enrol(7, "2026-27", release);
    d.work(skill, right, { max: 80 });
    for (let k = 0; k < 3 && d.state().evidence(skill).status !== "verified"; k++) {
      d.newSession(9);
      d.work(skill, right, { max: 80 });
    }
    return d.state().evidence(skill).status;
  };
  assert.equal(journey(), "verified");
  try {
    useMachineValidation(false);
    assert.notEqual(journey(), "verified", "without machine validation the content is provisional");
  } finally {
    useMachineValidation(true);
  }
});

test("eligible@1: a delayed check that included a question that is not validated is followed by fresh validated ones, and verifies", () => {
  const release = boardFor("tn", 7)!;
  const skill = "MATH.number.percentage";
  const d = new Driver(`mv-tn-7-${skill}`, Date.parse(reg.validatedAt) + 2 * 86_400_000);
  d.enrol(7, "2026-27", release);
  d.work(skill, right, { max: 80 });
  d.newSession(9);
  d.work(skill, right, { max: 80 });
  const attempts = d.state().records.attempts;
  const delayed = attempts.filter((a) => a.activity === "retention");
  assert.ok(delayed.some((a) => !machineReleaseOf(a.questionId)), "the delayed check included a question that is not validated");
  const after = attempts.filter((a) => a.at > delayed.at(-1)!.at);
  assert.ok(after.length >= 1 && after.length <= ELIGIBLE_MAX, `${after.length} further questions`);
  assert.ok(after.every((a) => machineReleaseOf(a.questionId)), "only validated questions are added");
  assert.equal(d.state().evidence(skill).status, "verified");
});

test("a typed-only family with verified wordings gives the two kinds of question a skill needs (inequations)", () => {
  // aeineqz has no multiple-choice form: its everyday wording is the only second kind of question. Before its wordings were
  // verified (wordrefs.py) the shared record never demonstrated the skill, whatever the learner answered.
  const skill = "MATH.algebra.inequations-intro";
  const d = new Driver(`mv-tn-7-${skill}`, Date.parse("2026-11-12T09:00:00Z"));
  d.enrol(7, "2026-27", boardFor("tn", 7)!);
  d.work(skill, right, { max: 80 });
  for (let k = 0; k < 3 && d.state().evidence(skill).status !== "verified"; k++) {
    d.newSession(9);
    d.work(skill, right, { max: 80 });
  }
  assert.equal(d.state().evidence(skill).status, "verified");
});
