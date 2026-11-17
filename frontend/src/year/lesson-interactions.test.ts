import assert from "node:assert/strict";
import { test } from "node:test";
import { allReleases } from "../../../packages/learning/src/curricula";
import { assigned } from "../../../packages/learning/src/curriculum";
import { modules } from "../../../packages/learning/src/content";
import { FAMILIES, pool, problemOf } from "../../../packages/learning/src/families";
import { mistake } from "../../../packages/learning/src/lesson-interactions";
import { askOf } from "../../../packages/learning/src/step-ask";
import { stepsHelp } from "../../../packages/learning/src/step-help";

test("each interaction has exactly one right choice, different choices, and never states the answer in its question", () => {
  const count = { types: 0, first: 0, mistake: 0, entry: 0, any: 0 };
  const byFamily = new Map<string, { first: boolean; mistake: boolean; entry: boolean }>();
  for (const f of FAMILIES.values()) {
    if (!f.domain) continue;
    const ids = pool(f.id).items.map((x) => x.id).filter((i) => !/:(mc|w)$/.test(i));
    if (!ids.length) continue;
    count.types++;
    const has = { first: false, mistake: false, entry: false };
    for (const id of [ids[0], ids[Math.floor(ids.length / 2)], ids[ids.length - 1]]) {
      const p = problemOf(id)!;
      for (const a of [mistake(id)]) {
        if (!a) continue;
        assert.equal(a.choices.filter((c) => c.right).length, 1, id);
        assert.equal(new Set(a.choices.map((c) => c.label)).size, a.choices.length, id);
        assert.ok(a.choices.length >= 2 && a.choices.every((c) => c.label && c.reply), id);
      }
      const mk = mistake(id);
      if (mk) { has.mistake = true; assert.notEqual(mk.ask, `Someone answered ${p.answer}. What went wrong?`, id); }
      if ((stepsHelp(id) ?? []).some((s) => askOf(s.shown))) has.entry = true;
    }
    byFamily.set(f.id, has);
    if (has.first) count.first++;
    if (has.mistake) count.mistake++;
    if (has.entry) count.entry++;
    if (has.first || has.mistake || has.entry) count.any++;
  }
  assert.ok(count.mistake > 400 && count.entry > 400 && count.any > 700, JSON.stringify(count));
  // ICSE Class 5: the question types its skills draw on
  const r5 = allReleases.filter((r) => r.id === "icse-cisce-mathematics-grade-5").sort((a, b) => (a.version < b.version ? 1 : -1))[0];
  const skills = new Set(assigned(r5).map((a) => a.competency));
  const fams5 = new Set<string>();
  for (const f of FAMILIES.values()) { if (!f.domain) continue; const id = pool(f.id).items[0]?.id; const p = id && problemOf(id.replace(/:(mc|w)$/, "")); if (p && skills.has(p.competency)) fams5.add(f.id); }
  const c5 = { types: fams5.size, first: 0, mistake: 0, entry: 0, any: 0 };
  for (const f of fams5) { const h = byFamily.get(f); if (!h) continue; if (h.first) c5.first++; if (h.mistake) c5.mistake++; if (h.entry) c5.entry++; if (h.first || h.mistake || h.entry) c5.any++; }
  console.log(`lesson-interactions@1 all: ${JSON.stringify(count)}`);
  console.log(`lesson-interactions@1 ICSE Class 5: ${JSON.stringify(c5)} of ${skills.size} skills; lessons with a worked example: ${modules.filter((m) => skills.has(m.competency) && m.strategies.some((s) => s.screens.some((x) => x.instance && x.math))).length}`);
});
