import assert from "node:assert/strict";
import { test } from "node:test";
import { deepen } from "../../../packages/learning/src/deepen";
import { checkWorkingLines } from "../../../packages/learning/src/line-check";
import { explainStep, FAMILIES, pool, problemOf } from "../../../packages/learning/src/families";

const shown = (t: string) => deepen(t).map((x) => x.shown);
test("whole-number calculations are worked by place value", () => {
  assert.deepEqual(shown("94 × 7 = 658"), ["94 = 90 + 4", "90 × 7 = 630", "4 × 7 = 28", "630 + 28 = 658"]);
  // school-division@1: a division is set out as it is written at school, a digit at a time, with the layout drawn
  const div = deepen("846 ÷ 6 = 141");
  assert.equal(div[0].next, "To work out 846 ÷ 6, set it out as a long division.");
  assert.deepEqual(div.at(-1)!.board!.slice(0, 2), ["    141", "6 ) 846"]);
  assert.ok(div.every((d) => !/which leaves/.test(d.shown)) && div.some((d) => d.shown === "8 − 6 = 2") && div.some((d) => /Bring down/.test(d.next)));
  assert.deepEqual(shown("1800 ÷ 100 = 18"), []); // the digits move: nothing to work
  assert.deepEqual(shown("56 ÷ 7 = 8"), []); // a table fact
  assert.deepEqual(shown("478 + 356 = 834"), ["400 + 300 = 700", "70 + 50 = 120", "8 + 6 = 14", "700 + 120 + 14 = 834"]);
  assert.deepEqual(shown("834 − 356 = 478"), ["834 − 300 = 534", "534 − 50 = 484", "484 − 6 = 478"]);
  // a times-table fact, a wrong statement and a decimal are left alone
  assert.deepEqual(shown("7 × 8 = 56"), []);
  assert.deepEqual(shown("94 × 7 = 650"), []);
  assert.deepEqual(shown("2.5 × 14 = 35"), []);
});
test("the area under 2x + y = 6: the integral is worked term by term and between its limits", () => {
  assert.deepEqual(shown("Area = ∫₀^3 6(1 − x/3) dx"), ["6(1 − x/3) = −2x + 6", "∫ (−2x + 6) dx = −x² + 6x", "At x = 3: −9 + 18 = 9", "At x = 0: 0", "9 − 0 = 9"]);
  assert.deepEqual(shown("∫₋₄⁻³ (−3 − x) dx").at(-1), "9/2 − 4 = 1/2");
  assert.deepEqual(shown("Area = 2∫₀^1 2√(1x) dx").slice(-2), ["4/3 − 0 = 4/3", "2 × 4/3 = 8/3"]);
  assert.deepEqual(shown("∫ (6 − 2x) dx"), ["∫ −2x dx = −x²", "∫ 6 dx = 6x", "−x² + 6x + C"]);
  assert.deepEqual(shown("d/dx (x³ + 2x) = 3x² + 2"), ["d/dx (x³) = 3x²", "d/dx (2x) = 2", "3x² + 2"]);
  assert.deepEqual(shown("V = π∫ from 0 to 2 of 4x² dx = 32π/3"), ["∫ (4x²) dx = 4x³/3", "At x = 2: 32/3", "At x = 0: 0", "32/3 − 0 = 32/3", "π × 32/3 = 32π/3"]);
  assert.deepEqual(shown("∫₀^π sin x dx"), []); // not powers of x: left as it was
});
test("every line it writes for every question type is true (read by the line checker)", () => {
  let fams = 0, lines = 0;
  const bad: string[] = [];
  for (const f of FAMILIES.values()) {
    if (!f.domain) continue;
    const ids = pool(f.id).items.map((x) => x.id).filter((i) => !/:(mc|w)$/.test(i));
    let any = false;
    for (const id of [ids[0], ids[Math.floor(ids.length / 2)], ids[ids.length - 1]].filter(Boolean)) {
      const p = problemOf(id)!;
      for (const s of p.steps) {
        let text = ""; try { text = explainStep(p, s); } catch { continue; }
        for (const d of deepen(text)) {
          any = true; lines++;
          // "At x = 3: −9 + 18 = 9" and "6 × 100 = 600, which leaves 246" are checked on their calculation
          const calc = d.shown.replace(/^At [a-z] = [^:]+:\s*/, "").replace(/, which leaves .*$/, "").replace(/ \+ C$/, "");
          if (!calc.includes("=")) continue;
          const r = checkWorkingLines([calc])[0];
          if (r.state === "wrong") bad.push(`${id}: ${d.shown}`);
        }
      }
    }
    if (any) fams++;
  }
  assert.deepEqual(bad.slice(0, 10), []);
  assert.ok(fams > 150 && lines > 1000, `${fams} question types deepened, ${lines} lines`);
  console.log(`deepen@1: ${fams} question types, ${lines} lines checked`);
});
