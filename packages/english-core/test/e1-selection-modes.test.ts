import assert from "node:assert/strict";
import { test } from "node:test";
import { type Composite, type Goal, createComposite, leafView, recommend, relativeInformation } from "../src/index.ts";
import { runDemo } from "../../../tools/english/demo.ts";
import { T, ctx } from "./helpers.ts";

/** Place a capability's estimate directly (test set-up only). */
function place(c: Composite, cap: string, mean: number, sd: number, n = 4) {
  const node = c.nodes[cap];
  node.combined = { mean, variance: sd * sd };
  node.direct = { mean, variance: sd * sd };
  node.directN = n;
  node.contexts = ["a", "b"];
  node.asOf = T(0);
  node.lastDirectAt = T(0);
}
const RUN = "EN.SEN.CMP.run_ons";
const COM = "EN.GRM.PUN.commas";
const SVA = "EN.GRM.VERB.sva";
const ART = "EN.GRM.NOUN.articles";
const input = (composite: Composite, goal: Goal, extra: Record<string, unknown> = {}) => ({ index: ctx().index, content: ctx().content, composite, goal, now: T(1), seen: new Set<string>(), recent: [], writingThisSession: 0, writingAvailable: false, ...extra });
const twoCaps = (targets?: Record<string, number>): Goal => ({ id: "t", name: "Two grammar capabilities", weights: { [SVA]: 1, [ART]: 1 }, ...(targets ? { targets } : {}) });

test("information gain is measured relative to current uncertainty", () => {
  const c = createComposite(ctx().index, "x");
  place(c, SVA, 4, 1.2);
  const item = ctx().content.items.get("grm.sva.03")!;
  const v = leafView(c, ctx().index, SVA, T(1));
  const r = relativeInformation(item, v);
  // typed item at b = 4.5, a = 1.3: I = 1.3² p(1−p) at mean 4; relative gain = 1 − var'/var
  const p = 1 / (1 + Math.exp(-1.3 * (v.mean - 4.5)));
  const I = 1.69 * p * (1 - p);
  const expected = 1 - 1 / (1 + v.sd ** 2 * I); // v.sd includes the small growth in uncertainty over the day since set-up
  assert.ok(Math.abs(r - expected) < 1e-9, `${r} vs ${expected}`);
  place(c, SVA, 4, 0.4);
  assert.ok(relativeInformation(item, leafView(c, ctx().index, SVA, T(1))) < r, "the same item removes a smaller share when the estimate is already precise");
});

test("learning mode: a target-relative need term prefers the capability furthest below the learner's target", () => {
  const c = createComposite(ctx().index, "x");
  place(c, SVA, 3.0, 0.5);
  place(c, ART, 5.2, 0.5);
  const rec = recommend(input(c, twoCaps({ "EN.GRM": 5.5 }), { mode: "learning" }));
  assert.equal(rec.mode, "learning");
  assert.equal(rec.choice!.focus, SVA);
  assert.ok(rec.choice!.parts.need > 0.99);
  assert.equal(rec.target.source, "learner");
  assert.equal(rec.target.band, 5.5);
  assert.match(rec.explanation, /your target for Grammar and usage is band 5.5/);
  // a higher learner target turns articles into a need too; the engine never edits the target itself
  const goal = twoCaps({ [ART]: 7.5 });
  const before = JSON.stringify(goal);
  recommend(input(c, goal, { mode: "learning" }));
  assert.equal(JSON.stringify(goal), before, "targets are never changed by the engine");
});

test("without a learner target the documented default applies and is named", () => {
  const c = createComposite(ctx().index, "x");
  place(c, SVA, 3.0, 0.5);
  place(c, ART, 5.2, 0.5);
  const rec = recommend(input(c, twoCaps(), { mode: "learning" }));
  assert.equal(rec.target.source, "default");
  assert.equal(rec.target.band, 5); // floor(median(3.0, 5.2) = 4.1) + 1
  assert.match(rec.explanation, /no target is set, so the default applies: band 5/);
});

test("assessment and learning modes choose differently for the same learner, each with its own justification", () => {
  const c = createComposite(ctx().index, "x");
  place(c, SVA, 3.0, 0.45); // weak but precise
  place(c, ART, 4.5, 1.4); // uncertain
  const goal = twoCaps({ "EN.GRM": 5.5 });
  const a = recommend(input(c, goal, { mode: "assessment" }));
  const l = recommend(input(c, goal, { mode: "learning" }));
  assert.ok(a.choice!.targets.includes(ART), "assessment goes where uncertainty is");
  assert.equal(l.choice!.focus, SVA, "learning goes where the need is");
  assert.match(a.explanation, /^Assessment: .*expected to remove \d+% of that uncertainty/);
  assert.match(l.explanation, /^Learning: Subject–verb agreement .*likely below band 5.5/);
});

test("prerequisite-aware easier step: when no suitable item exists, step to a weak prerequisite the framework defines, and report the gap", () => {
  const c = createComposite(ctx().index, "x");
  place(c, RUN, 1.6, 0.4); // far below every run-on item
  place(c, COM, 3.0, 0.5); // the framework's prerequisite of run-ons, also below target
  const goal: Goal = { id: "s", name: "Sentences", weights: { [RUN]: 1 }, targets: { [RUN]: 5, [COM]: 5 } };
  const rec = recommend(input(c, goal, { mode: "learning" }));
  assert.equal(rec.path, "prerequisite_step");
  assert.equal(rec.choice!.focus, COM);
  assert.equal(rec.bankGaps[0].capability, RUN);
  assert.match(rec.explanation, /Prerequisite step: Commas/);
});

test("easier step on the same capability when its prerequisite is not weak; no prerequisite is ever invented", () => {
  const c = createComposite(ctx().index, "x");
  place(c, SVA, 1.0, 0.4); // even the easiest item is hard; SVA has no framework prerequisite
  const goal: Goal = { id: "s", name: "Agreement", weights: { [SVA]: 1 }, targets: { [SVA]: 5 } };
  const rec = recommend(input(c, goal, { mode: "learning", seen: new Set(["grm.sva.01"]) }));
  assert.ok(!ctx().index.requires.has(SVA));
  assert.notEqual(rec.path, "prerequisite_step");
  assert.equal(rec.bankGaps[0].capability, SVA);
  assert.ok(rec.bankGaps[0].unusedDifficulties.length > 0);
  // with every SVA item easier than suitable gone, it falls back to assessment rather than stalling
  assert.ok(["easier_step", "assessment_fallback"].includes(rec.path), rec.path);
  const placedHigh = createComposite(ctx().index, "y");
  place(placedHigh, SVA, 6.5, 0.4);
  // every SVA item from 5.5 up is used, so nothing suitable is left and only easier items remain
  const hard = [...ctx().content.items.values()].filter((i) => i.kind === "code" && i.target === SVA && i.b >= 5.5).map((i) => i.id);
  const easy = recommend(input(placedHigh, { ...goal, targets: { [SVA]: 8 } }, { mode: "learning", seen: new Set(hard) }));
  assert.equal(easy.path, "easier_step");
  assert.match(easy.explanation, /Easier step on the same capability/);
});

test("demonstration: Asha gets different, justified choices in assessment and learning mode", async () => {
  const demo = await runDemo({ quiet: true, dir: (await import("node:fs")).mkdtempSync((await import("node:path")).join((await import("node:os")).tmpdir(), "modes-")) });
  const { assessment, learning } = demo.modes;
  assert.notEqual(assessment.choice!.item, learning.choice!.item);
  assert.match(assessment.explanation, /^Assessment: /);
  assert.match(learning.explanation, /^Learning: /);
  assert.match(learning.explanation, /Target: /);
});
