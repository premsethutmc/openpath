// Workstream E1: sub-skill evidence journeys through the real components; the projection is computed afterwards from the stored events.
import test from "node:test";
import assert from "node:assert/strict";
import { subSkillProjection } from "../../../packages/learning/src/sub-skill-evidence";
import { E1_JOURNEYS, e1Trace } from "./sub-skill-journeys";
import { SliceSession } from "./session";

const T = new Map<string, ReturnType<typeof e1Trace>>();
const t = (id: string) => { let x = T.get(id); if (!x) { x = e1Trace(E1_JOURNEYS.find((j) => j.id === id)!); T.set(id, x); } return x; };
const sub = (id: string, s: string) => t(id).projection.subSkills.find((x) => x.id === s)!;
const le = (id: string) => t(id).projection.competencies.find((c) => c.competency === "MATH.algebra.linear-equations")!;
const prod = (id: string, c = "MATH.algebra.linear-equations") => t(id).production.find((p) => p.competency === c)!;
const kinds = (id: string) => le(id).leakage.map((l) => `${l.kind}:${l.missing.join("+")}`);

test("E1-01 two-step success alone: production says independent for the whole competency; the projection shows brackets and both-sides unevidenced", () => {
  assert.equal(prod("E1-01").status, "independent");
  assert.equal(sub("E1-01", "two-step").status, "shown");
  assert.deepEqual([sub("E1-01", "variables-both-sides").status, sub("E1-01", "brackets").status], ["no-evidence", "no-evidence"]);
  assert.deepEqual(kinds("E1-01"), ["competency-status-without-sub-skill-evidence:variables-both-sides+brackets"]);
});

test("E1-02 / E1-03 wrong on every both-sides and bracket question: production reaches transfer and passes its delayed check anyway", () => {
  for (const id of ["E1-02", "E1-03"]) {
    assert.equal(prod(id).status, "transfer", id);
    assert.ok(sub(id, "variables-both-sides").answers.independentRight === 0 && sub(id, "variables-both-sides").answers.independentWrong >= 1, id);
    assert.ok(sub(id, "brackets").answers.independentRight === 0 && sub(id, "brackets").answers.independentWrong >= 1, id);
    assert.deepEqual([sub(id, "variables-both-sides").status, sub(id, "brackets").status], ["exposure", "exposure"], id);
    assert.ok(kinds(id).includes("competency-status-without-sub-skill-evidence:variables-both-sides+brackets"), id);
  }
  assert.equal(prod("E1-03").retention, "passed");
  assert.ok(kinds("E1-03").includes("delayed-check-passed-without-sub-skill-check:variables-both-sides+brackets"));
});

test("E1-04 one-step success establishes nothing about linear equations (production or projection)", () => {
  assert.equal(prod("E1-04", "MATH.algebra.linear-intro").status, "independent");
  assert.equal(sub("E1-04", "one-step").status, "shown");
  assert.equal(prod("E1-04").status, "not_started");
  assert.ok(["two-step", "variables-both-sides", "brackets"].every((s) => sub("E1-04", s).status === "no-evidence"));
  assert.equal(le("E1-04").supports, "none");
});

test("E1-05 assisted performance never counts as independent", () => {
  const b = sub("E1-05", "brackets");
  assert.deepEqual([b.status, b.answers.independentRight, b.answers.assistedRight], ["assisted-only", 0, 3]);
  assert.equal(prod("E1-05").status, "guided");
});

test("E1-06 every sub-skill shown, but the delayed check only ever tests two-step and forming questions", () => {
  assert.equal(le("E1-06").supports, "shown-all-required");
  assert.equal(sub("E1-06", "two-step").retention, "passed");
  assert.deepEqual([sub("E1-06", "variables-both-sides").retention, sub("E1-06", "brackets").retention], ["never-checked", "never-checked"]);
  assert.ok(kinds("E1-06").includes("delayed-check-passed-without-sub-skill-check:variables-both-sides+brackets"));
});

test("E1-07 failed delayed check: history kept, first success kept, recovery shown; production agrees", () => {
  const two = sub("E1-07", "two-step");
  assert.deepEqual(two.history, ["failed", "pending"]);
  assert.ok(two.firstShownAt && two.status === "shown");
  assert.equal(prod("E1-07").status, "transfer");
});

test("E1-08 lapsed: earlier success is kept in the history, the current state says lapsed", () => {
  const b = sub("E1-08", "brackets");
  assert.ok(b.firstShownAt);
  assert.equal(b.status, "lapsed");
});

test("replay: a session rebuilt from the stored events gives the same projection, byte for byte", () => {
  for (const id of ["E1-03", "E1-07"]) {
    const x = t(id);
    const stored = JSON.parse(JSON.stringify(x.events)) as { kind: string; sessionId?: string }[];
    const s1 = SliceSession.fromEvents(x.learnerId, "MATH.algebra.linear-equations", stored, x.now, stored.at(-1)?.sessionId?.split(":").pop() ?? "s1");
    const again = subSkillProjection(x.learnerId, s1.events as unknown as { kind: string }[], s1.now);
    assert.equal(again.digest, x.digest, id);
    assert.equal(subSkillProjection(x.learnerId, x.events as { kind: string }[], x.now).digest, x.digest, `${id}: deterministic`);
  }
});
