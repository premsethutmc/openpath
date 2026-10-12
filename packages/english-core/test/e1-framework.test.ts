import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { type Framework, aggregate, applyDirect, bandUpdate, createComposite, indexFramework, isSpecified, leafView, validateFramework } from "../src/index.ts";
import { FRAMEWORK_FILE, loadFramework } from "../../../tools/english/load.ts";
import { LOCK_FILE, checkLock, fingerprint, frameworkFiles } from "../../../tools/english/lock.ts";
import { T, ctx } from "./helpers.ts";

test("E1-1 the framework is valid: 8 strands, 44 sub-strands, ≥115 capabilities, 17 fully specified with ≥6 items each", () => {
  const fw = loadFramework();
  assert.deepEqual(validateFramework(fw), []);
  const { index, content } = ctx();
  assert.equal(fw.strands.length, 8);
  assert.equal(fw.strands.reduce((s, x) => s + x.substrands.length, 0), 44);
  assert.ok(index.leafIds.length >= 115, `${index.leafIds.length} capabilities`);
  const skeleton = [...index.leaves.values()].filter((c) => c.tier === "skeleton");
  assert.equal(skeleton.length, 17);
  for (const c of skeleton) {
    assert.ok(isSpecified(c), `${c.id} specified`);
    assert.ok(Object.keys(c.bands!).length >= 3, `${c.id} band descriptors`);
    assert.ok(c.misconceptions!.length >= 1, `${c.id} misconceptions`);
    assert.ok((content.byCapability.get(c.id) ?? []).length >= 6, `${c.id} has ${(content.byCapability.get(c.id) ?? []).length} items`);
  }
  for (const k of fw.couplings) assert.ok(k.strength >= 0 && k.strength <= 0.6);
});

test("E1-1 the composite supports the full hierarchy, not only the assessed subset", () => {
  const { index } = ctx();
  const c = createComposite(index, "x");
  assert.equal(Object.keys(c.nodes).length, index.leafIds.length);
  const all = aggregate(c, index, T(0), "all");
  const nonLeaves = [...index.children.keys()];
  assert.equal(nonLeaves.length, 1 + 8 + 44);
  for (const id of nonLeaves) assert.ok(all.get(id), `aggregate for ${id}`);
  // a capability not yet specified (speaking) can still hold evidence when it arrives later
  applyDirect(c, index, { capability: "EN.SPK.PRN.intelligibility", at: T(1), session: "s", context: "speech:test", decisionId: "d", update: (e) => bandUpdate(e, 5, 0.7), misconceptions: [] });
  assert.ok(leafView(c, index, "EN.SPK.PRN.intelligibility", T(1)).sd < 1.5);
});

const base = (): Framework => JSON.parse(readFileSync(FRAMEWORK_FILE, "utf8"));
const firstLeaf = (fw: Framework) => fw.strands[0].substrands[0].capabilities[0];

test("E1-2 bad frameworks are refused with a message naming the problem", () => {
  const cases: [string, (fw: Framework) => void, RegExp][] = [
    ["duplicate id", (fw) => fw.strands[0].substrands[0].capabilities.push({ ...firstLeaf(fw) }), /duplicate id/],
    ["prerequisite loop", (fw) => fw.prerequisites.push({ capability: "EN.RDG.LIT.locate_detail", requires: "EN.RDG.SUM.main_idea" }), /prerequisite loop/],
    ["unknown link", (fw) => fw.couplings.push({ a: "EN.RDG.LIT.locate_detail", b: "EN.NOPE.X.y", strength: 0.2 }), /unknown capability EN\.NOPE/],
    ["coupling out of range", (fw) => (fw.couplings[0].strength = 0.9), /between 0 and 0.6/],
    ["missing descriptors", (fw) => delete fw.strands[0].substrands[2].capabilities[1].bands, /band descriptors/],
    ["missing metadata", (fw) => delete (fw.review as Record<string, string>).licence, /metadata/],
    ["mastery from one interaction", (fw) => (fw.policy.mastery_gap_days = 0), /at least one day/],
    ["demonstrated from one observation", (fw) => (fw.policy.demonstrated_min_direct = 1), /at least 2 direct/],
  ];
  for (const [name, breakIt, expected] of cases) {
    const fw = base();
    breakIt(fw);
    const problems = validateFramework(fw);
    assert.ok(problems.some((p) => expected.test(p)), `${name}: ${problems.join("; ") || "no problem reported"}`);
    assert.throws(() => indexFramework(fw), /Invalid framework/);
  }
});

test("E1-2 a frozen framework version cannot be edited without a new version", () => {
  const lock = JSON.parse(readFileSync(LOCK_FILE, "utf8"));
  const files = frameworkFiles();
  assert.deepEqual(checkLock(lock, files), [], "the committed framework matches its lock");
  const edited = files.map((f) => ({ ...f, text: f.text.replace("Spells inflected forms correctly", "Spells inflected forms") }));
  assert.match(checkLock(lock, edited).join(), /frozen but has changed/);
  assert.notEqual(fingerprint(edited[0].text), lock["en@0.1.0"]);
});
