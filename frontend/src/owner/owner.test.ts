/** owner-view@1: the owner's view covers every maths skill, trigonometry first, and shows what the learner is told. */
import assert from "node:assert/strict";
import { test } from "node:test";
import { modules } from "../../../packages/learning/src/content";
import { sampleOf, search, skillsOf, topics, totalsOf } from "./data";

test("every maths skill is in exactly one topic, trigonometry first", () => {
  assert.equal(topics[0], "trigonometry");
  const all = topics.flatMap((t) => skillsOf(t).map((s) => s.competency));
  assert.deepEqual([...all].sort(), modules.filter((m) => m.competency.startsWith("MATH.")).map((m) => m.competency).sort());
});

test("trigonometry shows its screens, question types and wrong-answer feedback", () => {
  const trig = skillsOf("trigonometry"), t = totalsOf(trig);
  assert.ok(t.skills >= 5 && t.screens > 20 && t.families > 5 && t.certified <= t.families);
  const ratios = trig.find((s) => s.competency === "MATH.trigonometry.ratios")!;
  assert.ok(ratios.screens.every((s) => s.text.length > 0));
  const samples = ratios.families.map(sampleOf).filter((x) => x !== null);
  assert.ok(samples.length > 0 && samples.some((s) => s!.mistakes.length > 0));
  for (const s of samples) for (const m of s!.mistakes) assert.ok(m.says.length > 10 && !/undefined|NaN/.test(m.wrong));
  assert.ok(search(trig, "compound").length > 0 && search(trig, "zzzz").length === 0);
});

test("changes@1: every change says what and links to the exact place to see it, newest first", async () => {
  const { readFileSync } = await import("node:fs");
  const c = JSON.parse(readFileSync(new URL("../../../content/owner/changes.v1.json", import.meta.url), "utf8")) as { entries: { date: string; status: string; title: string; what: string; links: { label: string; href: string }[] }[] };
  const { moduleFor } = await import("../../../packages/learning/src/content");
  assert.ok(c.entries.length > 0);
  c.entries.forEach((e, i) => {
    assert.match(e.date, /^\d{4}-\d{2}-\d{2}$/);
    if (i) assert.ok(c.entries[i - 1].date >= e.date, "newest first");
    assert.ok(e.title.trim() && e.what.trim().length > 20 && e.links.length >= 1, e.title);
    for (const l of e.links) {
      assert.ok(/^\/(year|owner)\//.test(l.href), `${e.title}: ${l.href}`);
      const m = l.href.match(/#try-skill=(.+)$/);
      if (m) assert.ok(moduleFor(decodeURIComponent(m[1])), `${e.title}: no such skill ${m[1]}`);
    }
  });
});
