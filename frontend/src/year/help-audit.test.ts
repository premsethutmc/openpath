/**
 * help-audit@1: every question type's step help, checked by machine for the faults a machine can see, with a ceiling on
 * each count so they can only go down. It cannot see whether the steps are the method a teacher would use: that needs a
 * person (or a reviewed writing run). The numbers are the report: lower a ceiling when a count falls.
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { question } from "../../../packages/learning/src/content";
import { FAMILIES, pool } from "../../../packages/learning/src/families";
import { stepsHelp } from "../../../packages/learning/src/step-help";

const CEILING = { answerFirst: 28, answerInCue: 0, oneStep: 153, oneWordCues: 318 };
const esc = (t: string) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

test("the step help of every question type: answers given away, single steps and one-word cues can only go down", () => {
  const count = { types: 0, answerFirst: 0, answerInCue: 0, oneStep: 0, oneWordCues: 0 };
  for (const f of FAMILIES.keys()) {
    const ids = pool(f).items.map((p) => p.id).filter((id) => !/:(mc|w)$/.test(id));
    if (!ids.length) continue;
    const pick = ids.filter((_, i) => i % Math.max(1, Math.floor(ids.length / 8)) === 0).slice(0, 8);
    let n = 0, first = 0, cue = 0, one = 0, bare = 0, steps = 0;
    for (const id of pick) {
      const q = question(id), h = stepsHelp(id);
      if (!h || q.type === "choice") continue;
      n++;
      const a = String(q.answer).replace(/^-/, "−");
      if (a.length < 2 && !/\d/.test(a)) continue;
      const has = (t: string) => new RegExp(`(^|[^\\d.,/−])${esc(a)}([^\\d/]|$)`).test(t.replace(/(\d),(?=\d)/g, "$1").replace(/-(?=\d)/g, "−"));
      const given = has(q.prompt);
      if (!given && h.length >= 2 && has(h[0].shown)) first++;
      if (!given && a.length >= 2 && h.slice(0, -1).some((s) => has(s.next))) cue++;
      // how@1: a single step with its working one tap away is not a thin help
      if (h.length === 1 && !h[0].how) one++;
      // how@1: folded lines of working count as lines of help, as they did when they were steps (the measure stays comparable)
      for (const s of h) { steps += 1 + (s.how?.lines.length ?? 0); if (/^(First|Next|Last): [a-z-]+\.$/.test(s.next)) bare++; }
    }
    if (!n) continue;
    count.types++;
    if (first / n >= 0.5) count.answerFirst++;
    if (cue / n >= 0.5) count.answerInCue++;
    if (one / n >= 0.5) count.oneStep++;
    if (steps && bare / steps >= 0.6) count.oneWordCues++;
  }
  console.log(JSON.stringify(count));
  assert.ok(count.types > 900);
  for (const k of Object.keys(CEILING) as (keyof typeof CEILING)[]) assert.ok(count[k] <= CEILING[k], `${k}: ${count[k]} is above the ceiling ${CEILING[k]}`);
});
