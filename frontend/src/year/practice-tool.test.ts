/** practice-tool@1: every question whose picture becomes a tool in practice, proved on the question itself. */
import assert from "node:assert/strict";
import { test } from "node:test";
import { question } from "../../../packages/learning/src/content";
import { FAMILIES, pool } from "../../../packages/learning/src/families";
import { check, initial, met, readout, set, type Scene } from "../../../packages/learning/src/scene";
import { practiceScene } from "../../../packages/learning/src/scenes";

test("a practice tool is valid, is quiet, and does not hold the answer in its words or before it is touched", () => {
  const kinds = new Map<string, Set<string>>();
  let n = 0;
  for (const f of FAMILIES.keys()) {
    if (f === "aeround") continue; // its own test (nudge.test.ts): the two ends are the lesson
    const ids = pool(f).items.map((p) => p.id).filter((id) => !/:(mc|w)$/.test(id));
    for (const id of ids.filter((_, i) => i % Math.max(1, Math.floor(ids.length / 25)) === 0)) {
      const s = practiceScene(id);
      if (!s) continue;
      n++;
      (kinds.get(s.kind) ?? kinds.set(s.kind, new Set()).get(s.kind)!).add(f);
      const q = question(id), start = initial(s);
      assert.deepEqual(check(s), [], id);
      assert.equal(s.quiet, true, id);
      assert.ok(!met(s, start), id);
      const a = q.answer.replace(/^-/, "−");
      assert.ok(!new RegExp(`(^|[^\\d.,/])${a.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^\\d/]|$)`).test(`${s.prompt} ${readout(s, start)}`.replace(/,(?=\d)/g, "")), `${id}: ${s.prompt} ${readout(s, start)}`);
      if (s.kind === "numberline" && s.goal.measure === "x") {
        // carried to where the question's own arithmetic ends, the line reads the steps taken
        const end = set(s, start, "x", s.goal.equals!);
        assert.match(readout(s, end), /^Start at .* · [\d,]+ (back|forward) · now at /, id);
        assert.ok(q.answer.replace(/^-/, "−") === String(s.goal.equals).replace(/^-/, "−") || Math.abs(s.goal.equals! - s.start) === Number(q.answer), id);
      }
    }
  }
  console.log(n, [...kinds].map(([k, v]) => `${k}:${v.size} [${[...v].slice(0, 30).join(" ")}]`).join("\n"));
  assert.ok((kinds.get("numberline")?.size ?? 0) >= 4);
});
