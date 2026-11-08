import test from "node:test";
import blueprints from "../../../content/learning/blueprints.v1.json";
import assert from "node:assert/strict";
import { moduleFor, poolFamilies, question } from "../../../packages/learning/src/content";
import { fromPool } from "../../../packages/learning/src/intervention";
import { exposureKey, FAMILIES } from "../../../packages/learning/src/families";
import { aggregate, type Tile } from "../../../packages/learning/src/tiles";
import { AFTER_HELP, afterHelpTiles, afterHelpSummary, type AfterHelp } from "../learning/deep-evidence";
import { make } from "../../../packages/learning/src/session";
import { SliceSession } from "./session";

for (const competency of ["MATH.geometry.rotational-symmetry", "MATH.calculus.limits", "MATH.algebra.inequalities", "MATH.trigonometry.equations", "MATH.algebra.geometric-sequences", "MATH.calculus.continuity", "MATH.trigonometry.functions"]) {
  test(`Grade 7 selector with expansion content: ${competency} stays fresh and replays`, () => {
    const s = new SliceSession("integration-selector", competency, Date.parse("2026-11-08T09:00:00Z"));
    const m = moduleFor(competency)!;
    s.events.push(make.teach({ learnerId: s.learnerId, sessionId: s.session, at: new Date(s.now).toISOString() }, competency, m.strategies[0].id, "diagnosis"));
    const records = s.state().records;
    const id = fromPool(m, "check", records)!;
    assert.ok(id);
    if (poolFamilies(m).length === 1 && FAMILIES.get(poolFamilies(m)[0])!.word) assert.ok(id.endsWith(":w"), "a taught one-family module offers a situation check");
    assert.equal(question(id).competency, competency);
    assert.equal(fromPool(m, "check", JSON.parse(JSON.stringify(records))), id);
    const original = JSON.stringify(records);
    s.submit(id, question(id).answer, "check");
    const next = fromPool(m, "check", s.state().records)!;
    assert.notEqual(exposureKey(next), exposureKey(id), "the situation and typed form are one exposure");
    assert.equal(JSON.stringify(records), original, "selection leaves saved records untouched");
    if (poolFamilies(m).length === 1 && id.endsWith(":w")) assert.equal(question(id).answer, question(id.slice(0, -2)).answer);
  });
}

test("after-help display separates totals, rebuilds parents and preserves underlying evidence", () => {
  const leaf = (c: string): Tile => ({ ...aggregate(c, "skill", c, []), competency: c, assessable: true, status: "verified", label: "Verified", progress: { done: 4, total: 4, verified: 1 } });
  const helped = leaf("helped"), independent = leaf("independent");
  const tree = [aggregate("year", "subject", "Maths", [helped, independent])];
  const before = JSON.stringify(tree);
  const ah = { label: AFTER_HELP } as AfterHelp;
  const projected = afterHelpTiles(tree, (c) => c === "helped" ? ah : null);
  assert.equal(projected[0].status, "active");
  assert.deepEqual(projected[0].progress, { done: 1, total: 2, verified: 1 });
  assert.equal(projected[0].children[0].label, AFTER_HELP);
  assert.deepEqual(afterHelpSummary(projected), { total: 2, verified: 1, shown: 0, developing: 0, notStarted: 0, afterHelp: 1, progress: 0.5 });
  assert.equal(JSON.stringify(tree), before);
  assert.deepEqual(afterHelpTiles(tree, () => null), tree, "unqualified evidence is unchanged");
});

test("combined blueprints have one definition per competency", () => {
  const ids = blueprints.blueprints.map((b) => b.competency);
  assert.equal(new Set(ids).size, ids.length);
});
