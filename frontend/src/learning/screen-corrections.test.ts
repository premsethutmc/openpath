/** screen-review@1: every reviewed correction still matches the screen it was written for, and is applied. */
import assert from "node:assert/strict";
import { test } from "node:test";
import { authoredModules, moduleFor, synthesisedModules } from "../../../packages/learning/src/content";
import { screenCorrections, staleCorrections } from "../../../packages/learning/src/screen-corrections";

const raw = (c: { competency: string; section: string; index: number }) => {
  const m = authoredModules.find((x) => x.competency === c.competency) ?? synthesisedModules.find((x) => x.competency === c.competency);
  if (!m) return null;
  return c.section === "chapter" ? m.chapter[c.index]?.text : m.strategies.find((s) => s.id === c.section)?.screens[c.index]?.text;
};

test("no correction is stale (a changed screen must be read again, not overwritten)", () => {
  const stale = staleCorrections(raw).map((c) => `${c.competency} ${c.section} ${c.index}`);
  assert.deepEqual(stale, [], "these screens changed since they were reviewed: run the screen review again for them and update or drop the entries in content/learning/screen-corrections.v1.json");
});

test("every correction is what the learner sees", () => {
  for (const c of screenCorrections) {
    const m = moduleFor(c.competency)!;
    const s = c.section === "chapter" ? m.chapter[c.index] : m.strategies.find((x) => x.id === c.section)?.screens[c.index];
    if (!s) continue; // the strategy is hidden (quarantined questions): nothing shown
    assert.deepEqual(s.text, c.text, `${c.competency} ${c.section} ${c.index}`);
    assert.ok(c.text.every((t) => t.trim().length > 0));
  }
});

test("a correction never changes a method-aligned lesson (its alignment pins the exact text)", async () => {
  const { default: a } = await import("../../../content/learning/method-alignment.v1.json");
  const aligned = new Set((a as { lessons: { competency: string; strategy: string }[] }).lessons.map((l) => `${l.competency}|${l.strategy}`));
  assert.deepEqual(screenCorrections.filter((c) => aligned.has(`${c.competency}|${c.section}`)).map((c) => `${c.competency} ${c.section}`), []);
});
