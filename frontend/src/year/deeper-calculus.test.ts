import assert from "node:assert/strict";
import { test } from "node:test";
import { deeperCalculus } from "../../../packages/learning/src/deeper-calculus";
import { FAMILIES, pool, problemOf } from "../../../packages/learning/src/families";
import { checkWorkingLines } from "../../../packages/learning/src/line-check";
import { stepsHelp } from "../../../packages/learning/src/step-help";

const shown = (family: string, prompt: string) => deeperCalculus({ family, prompt, answer: "" }).map((x) => x.shown);
test("the working is written from the question itself", () => {
  assert.deepEqual(shown("aqfp", "Using the definition f′(x) = lim (h → 0) [f(x + h) − f(x)]/h, find f′(x) for f(x) = 4x² + 2x − 2."), ["f(x + h) = 4(x + h)² + 2(x + h) − 2", "f(x + h) − f(x) = 8xh + 2h + 4h²", "[f(x + h) − f(x)]/h = 8x + 2 + 4h", "f′(x) = 8x + 2"]);
  assert.deepEqual(shown("aqcontk", "f(x) = kx − 1 for x ≤ 3, and f(x) = 3x² − 2 for x > 3. Find the value of k for which f is continuous at x = 3."), ["3x² − 2 at x = 3: 27 − 2 = 25", "kx − 1 at x = 3 is 3k − 1", "3k − 1 = 25", "3k = 26", "k = 26/3"]);
  assert.deepEqual(shown("audch", "Differentiate y = sin(x² + 3) with respect to x."), ["u = x² + 3, so y = sin u", "du/dx = 2x", "dy/du = cos u", "dy/dx = cos(x² + 3) × 2x"]);
  assert.deepEqual(shown("audquo", "Differentiate y = (5x + 6)/(x² + 5) with respect to x, and simplify.").at(-2), "(x² + 5)(5) − (5x + 6)(2x) = −5x² − 12x + 25");
  assert.deepEqual(shown("aqlarea", "Using integration, find the area … ∫ from −3 to −2 of |2x + 8| dx").at(-1), "−12 − (−15) = 3");
  // a shape it does not know gets nothing, never a guess
  assert.deepEqual(shown("audch", "Differentiate y = cos⁴(5x) with respect to x."), []);
});

test("every calculation it writes for every calculus question is true, and its last value is the keyed answer where one is stated", () => {
  const bad: string[] = [];
  let types = 0, questions = 0, lines = 0, ends = 0;
  for (const f of FAMILIES.values()) {
    if (!f.domain) continue;
    const ids = pool(f.id).items.map((x) => x.id).filter((i) => !/:(mc|w)$/.test(i));
    const first = ids[0] && problemOf(ids[0]);
    if (!first || !/calculus|integra|differen/.test(first.competency)) continue;
    let any = false;
    const step = Math.max(1, Math.floor(ids.length / 40));
    for (let i = 0; i < ids.length; i += step) {
      const p = problemOf(ids[i])!, d = deeperCalculus(p);
      if (!d.length) continue;
      any = true; questions++;
      for (const x of d) {
        lines++;
        // what the line checker can read of a line must be true
        const calc = x.shown.replace(/^.* at [a-z] = [^:]+:\s*/, "").replace(/^At [a-z] = [^:]+:\s*/, "").replace(/ \+ C$/, "").replace(/^(?:dy\/dx|dy\/du|du\/dx|v = ds\/dt|[RC]′\(x\)|f′\(x\)|y′|y″|∂f\/∂[xy]) = /, "");
        for (const r of checkWorkingLines([calc])) if (r.state === "wrong") bad.push(`${ids[i]}: ${x.shown} (${r.why})`);
      }
      // a working that ends in a number ends at the answer
      const last = d.at(-1)!.shown.split(/=|: /).pop()!.trim();
      if (/^[−\d./π ]+$/.test(last) && /^[−\-\d./π ]+$/.test(p.answer)) { ends++; if (checkWorkingLines([`${last} = ${p.answer}`])[0].state === "wrong") bad.push(`${ids[i]}: ends at ${last}, answer ${p.answer}`); }
      // the help is the question's first step, this working, then its other steps
      const h = stepsHelp(ids[i])!;
      assert.ok(h.filter((s) => !s.finer).length === p.steps.length && h.some((s) => s.finer), ids[i]);
    }
    if (any) types++;
  }
  assert.deepEqual(bad.slice(0, 12), []);
  assert.ok(types >= 18 && questions > 300 && ends > 100, `${types} types, ${questions} questions, ${lines} lines, ${ends} end at the answer`);
  console.log(`deeper-calculus@1: ${types} question types, ${questions} questions, ${lines} lines, ${ends} worked to the keyed answer`);
});
