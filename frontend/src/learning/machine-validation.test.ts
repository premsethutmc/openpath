/**
 * machine-validation@1 acceptance tests. With no educators, an independently certified, unchanged, grading-certified question
 * counts as validated evidence, so a learner can reach "verified" without the test-only review fixture. The route must fail
 * closed: a changed family, an excluded or quarantined question, the everyday-wording form, a family that was never certified
 * and every hand-written question stay provisional, and nothing is ever labelled educator-reviewed.
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
import { question } from "../../../packages/learning/src/content";

const reg = machineRegistry;
const entry = (fam: string) => reg.entries.find((e) => e.family === fam)!;
const firstFree = (fam: string) => pool(fam).items.find((p) => !(entry(fam).excluded ?? []).includes(p.id))!.id;

test("the registry admits only typed and multiple-choice forms of known families, and says it is not educator review", () => {
  assert.equal(reg.schema, "machine-validation@1");
  assert.ok(reg.entries.length > 900, `${reg.entries.length} families admitted`);
  assert.ok(Number.isFinite(Date.parse(reg.validatedAt)));
  for (const e of reg.entries) {
    assert.ok(FAMILIES.has(e.family), e.family);
    assert.ok(e.forms.length > 0 && e.forms.every((f) => f === "typed" || f === "mc"), `${e.family}: ${e.forms}`);
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
  const typedFam = reg.entries.find((e) => e.forms.includes("typed") && e.forms.includes("mc") && FAMILIES.get(e.family)!.word)!.family;
  const id = firstFree(typedFam);
  assert.equal(machineReleaseOf(id), reg.validatedAt);
  assert.equal(machineReleaseOf(`${id}:mc`), reg.validatedAt);
  assert.ok(problemOf(`${id}:w`), "the family has an everyday-wording form");
  assert.equal(machineReleaseOf(`${id}:w`), undefined, "wording was never certified");

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
  assert.equal(machineReleaseOf(id), reg.validatedAt);
});

test("the item is labelled machine-checked, never educator-reviewed; hand-written questions stay provisional", () => {
  assert.equal(reviewFixtureActive(), false);
  const e = reg.entries.find((x) => x.forms.includes("typed"))!;
  const it = nativeItem(question(firstFree(e.family))) as { evidence_status: string; released_at?: string; review: string };
  assert.equal(it.evidence_status, "validated");
  assert.equal(it.released_at, reg.validatedAt);
  assert.match(it.review, /^Machine-checked/);
  assert.match(it.review, /Not educator-reviewed/);
  const written = questions.filter((q) => !q.id.startsWith("gen:"));
  assert.ok(written.length > 0);
  for (const q of written) assert.equal((nativeItem(q) as { evidence_status: string }).evidence_status, "provisional", q.id);
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
